// SLIDE-PHYS-1 Stage 3 — controlled two-player experiment. The frozen PVP-0 two-character world (pvp0_plant.mjs Pvp0Plant; one Jolt world, every
// cross-character pair colliding, per-character + system ledgers, equal-and-opposite check). RECIPIENT = C3 exactly as frozen (balance2/c3 at
// d590fd46, canonical M1b body balance1 B1_BODY, PPR-3 standing entry), built by the same law hook as PVP-0 / SUPPORT-1 — nothing about the recipient
// changes. TACKLER = the Stage-1 physical tackler (SP1: same parameters, entry, controller, authority model, M1c candidate, TCF-1 on its own boots),
// parked kinematic at its entry pose until `activate` (step 408 = 1.7 s, the recipient settled), then dynamic with its entry velocities (one write
// per body) and its muscle state initialised on the true entry state (the SoloPlant fix, applied to the tackler only).
// Placement (one rule, every condition): from the tackler-alone reference at the same speed, the time t_c and position at which its tackling boot
// passes its lowest forward point in the slide; the run is rotated to travel −z (crossing from the recipient's LEFT, as PVP-0 / SUPPORT-1) and
// translated so that at t_c the boot meets the target point on the recipient's feet line (per condition: lateral offset of the line).
// usage (worktree root): node sp_stage3.mjs --u <params.json> --cond LIGHT|MODERATE|STRONG|CALIB --out <rec.json.gz> [--steps 1300]
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, bi, PL } = L;
const RUN = await import(new URL("./sp_run.mjs", import.meta.url).href), P = await import(new URL("./sp_param.mjs", import.meta.url).href), AU = await import(new URL("./sp_authority.mjs", import.meta.url).href);
const C = await import(new URL("./sp_chor.mjs", import.meta.url).href), EN = await import(new URL("./sp_entry.mjs", import.meta.url).href), MC = await import(new URL("./sp_m1c.mjs", import.meta.url).href);
const { C3Controller } = await import(L.RA + "balance2/c3/c3_ctrl.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
// Geometry (PPR-3 standing entry): the recipient faces +x, feet at z ±0.21 (foot centres x −0.034). The tackler travels −z: it comes from the
// recipient's LEFT and its slide line crosses the stance (near = left foot first, then the right). `lateral` moves the line along the foot (+x toward
// the toes, −x toward the heel / ankle). (An earlier draft gave STRONG −0.21 m, which is BEHIND the heels — a near miss; corrected before any run.)
export const CONDS = { LIGHT: { speed: 4.5, lateral: 0.12, note: "grazing: the tackling boot's centre passes 0.12 m toward the toes from the near foot's centre (catches the front of the boots)" },
  MODERATE: { speed: 5.0, lateral: 0.0, note: "square: the tackling boot's centre passes through the near foot's centre" },
  STRONG: { speed: 5.5, lateral: -0.05, note: "heavy: 5.5 m/s, the boot's centre passes 0.05 m toward the heel (under the ankles: the shin and boot sweep the base of both legs)" },
  // added after the first three runs: LIGHT still delivered 269 N·s (SUPPORT-1's recipient falls from ≈ 48–80 N·s), so a truly glancing line was added
  // as further evidence (LIGHT is kept as run). The toe tip of the recipient's boot is ≈ +0.10 m from its centre.
  GRAZE: { speed: 4.5, lateral: 0.20, note: "glancing: the tackling boot's centre passes 0.20 m toward the toes from the near foot's centre (only the boots' tips can meet)" },
  CALIB: { speed: 5.0, lateral: 0.0, away: 10, note: "the MODERATE placement moved 10 m clear: tackler-alone reference in the same two-character world" } };
// timing rule: the boot meets the target SLIDING, not stamping — t_c = the tackler-alone run's first boot touchdown (lowest point < 2 cm in 0.3–0.75 s)
// + 0.08 s (≈ 0.3 m of ground travel after touchdown); its position then is placed on the target point
export const TC_AFTER_TOUCHDOWN = 0.08;
class Stage3Plant extends L.Pvp0Plant { _activate() { super._activate(); const c = this.tackler, S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt);
  const { cmd } = this.lawT.command(c, c.st, c.up.ev, this.n); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.entryReinit = true; } }
export async function run(u, condName, steps = 1300, auName = "A5") { const cond = CONDS[condName], ACT = 408, h = 1 / 240;
  const mk = () => AU.apply(P.makeCand(P.toPhys(u), cond.speed, "SP1"), auName);
  // tackler-alone reference (solo plant) at this speed → the boot's lowest forward point in the slide
  const ref = await RUN.runCand(mk(), { steps: 300 }); let best = null;
  for (const r of ref.recs) { if (r.t < 0.3 || r.t > 0.75) continue; const f = r.S[bi("foot_R")], pel = r.S[0]; const lowY = PL.bodyLowest(B[bi("foot_R")], f).y; if (lowY < 0.02 && (!best || r.t < best.t)) best = { t: r.t, n: r.n, boot: f.com, pel: pel.pos }; }
  if (!best) { const r = ref.recs.find(x => x.t >= 0.5); best = { t: r.t, n: r.n, boot: r.S[bi("foot_R")].com, pel: r.S[0].pos }; }
  { const td = best.t, r = ref.recs.find(x => x.t >= td + TC_AFTER_TOUCHDOWN - 1e-9); best = { t: r.t, n: r.n, boot: r.S[bi("foot_R")].com, pel: r.S[0].pos, touchdown: td }; }
  // yaw 180° (travel −z); target point (x_t, z_t) = near-foot centre + lateral along x
  const FIX = L.FIX(), rp = FIX.write.runner.poses, footL = rp[10].pos, qy = [0, 1, 0, 0], rot = (p) => [-p[0], p[1], -p[2]];
  const tgt = [footL[0] + cond.lateral + (cond.away || 0), 0, footL[2]], bootR = rot(best.boot), off = [tgt[0] - bootR[0], 0, tgt[2] - bootR[2]];
  const cand = mk(), E = EN.buildEntry(cand.entry), chor = C.compile(cand.chor);
  const place = (s) => ({ pos: V.add(rot(s.pos), off), rot: Q.norm(Q.mul(qy, s.rot)) }), poseT = E.pose.map(place), velT = E.vel.map(x => ({ v: rot(x.v), w: rot(x.w) }));
  const C3P = L.C3P(), J = await L.jolt(); let tr = null, cR = null;
  const mkT = cand.makeCtrl ? cand.makeCtrl : null; const tackCand = { ...cand, tOffset: -ACT * h, frameYaw: 180 };
  const entries = { runner: FIX.write.runner, tackler: { poses: poseT, vel: poseT.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) } };
  const sim = new Stage3Plant(J, entries, { runner: FIX.flags.runner, tackler: { L: false, R: false } }, "N2", { O: FIX.O, instrument: true, maxSteps: steps,
    law: (p, c) => new L.MB.M1bBody(p, c, L.BODY, (cR = new C3Controller(C3P))),
    lawT: (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, (tr = mkT(tackCand, chor, E))); if (cand.muscle === "M1c") MC.useM1c(c.act, cand.tauCbMs); return b; }, activate: ACT, tacklerVel: velT });
  if (cand.soleRule) { const tOff = sim.tackler.bOff; L.installSoleRule(sim, [tOff + bi("foot_L") + 1, tOff + bi("foot_R") + 1], cand.soleRule); }
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 25); if (bad) { stop = { step: sim.n, who: bad[0] }; break; } }
  const out = { protocol: "SLIDE-PHYS-1 Stage 3 (C3 × SP1)", case: condName, cond, cand: "SP1", authority: auName, u, steps, activate: ACT, placement: { refT: best.t, refBoot: best.boot, target: tgt, offset: off, yawDeg: 180 },
    wallMs: performance.now() - t0, cpu: sim.cpu, stop, recs: sim.recs, ctrlLog: tr ? tr.log : null, recipientCtrl: cR ? cR.meta() : null, slips: { recipient: sim.runner.act.slips || 0, tackler: sim.tackler.act.slips || 0 } };
  out.finalHash = L.IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }
if (process.argv[1] && process.argv[1].endsWith("sp_stage3.mjs")) { const u = JSON.parse(fs.readFileSync(arg("u"))), o = await run(u, arg("cond", "MODERATE"), +arg("steps", "1300"), arg("authority", "A5"));
  L.writeGz(arg("out"), o); const first = o.recs.find(r => r.contacts.some(c => c.kind === "cross" && c.Jn > 0));
  console.log(o.case, "steps", o.recs.length, "hash", o.finalHash, "wall", (o.wallMs / 1000).toFixed(1), "s", o.stop ? "STOP " + JSON.stringify(o.stop) : "", "first contact", first ? `${((first.n - o.activate) / 240).toFixed(3)} s ` + JSON.stringify(first.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => c.a[1] + "×" + c.b[1])) : "none", "placement", JSON.stringify(o.placement.offset.map(x => +x.toFixed(3)))); }

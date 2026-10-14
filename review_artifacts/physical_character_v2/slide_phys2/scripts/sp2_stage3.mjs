// SLIDE-PHYS-2 Stage 3 (Phase 12) — sp_stage3.mjs generalised to SP2 candidates (H-structure physical parameters + controller A6); everything
// else (world, unchanged C3, recipient entry, activation, ledgers) is SLIDE-PHYS-1's Stage 3 verbatim.
// SLIDE-PHYS-1 Stage 3 — controlled two-player experiment. The frozen PVP-0 two-character world (pvp0_plant.mjs Pvp0Plant; one Jolt world, every
// cross-character pair colliding, per-character + system ledgers, equal-and-opposite check). RECIPIENT = C3 exactly as frozen (balance2/c3 at
// d590fd46, canonical M1b body balance1 B1_BODY, PPR-3 standing entry), built by the same law hook as PVP-0 / SUPPORT-1 — nothing about the recipient
// changes. TACKLER = the Stage-1 physical tackler (SP1: same parameters, entry, controller, authority model, M1c candidate, TCF-1 on its own boots),
// parked kinematic at its entry pose until `activate` (step 408 = 1.7 s, the recipient settled), then dynamic with its entry velocities (one write
// per body) and its muscle state initialised on the true entry state (the SoloPlant fix, applied to the tackler only).
// Placement (one rule, every condition): from the tackler-alone reference at the same speed, the time t_c and position at which its tackling boot
// passes its lowest forward point in the slide; the run is rotated to travel −z (crossing from the recipient's LEFT, as PVP-0 / SUPPORT-1) and
// translated so that at t_c the boot meets the target point on the recipient's feet line (per condition: lateral offset of the line).
// usage (worktree root): node sp2_stage3.mjs --params <phys.json> --cond GRAZE|LIGHT|MODERATE|STRONG|CALIB --out <rec.json.gz> [--steps 1300] [--ctrl A6]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi, PL } = L;
const RUN = await import(S1 + "sp_run.mjs"), P2 = await import(new URL("./sp2_param.mjs", import.meta.url).href), M2 = await import(new URL("./sp2_measures.mjs", import.meta.url).href);
const C = await import(S1 + "sp_chor.mjs"), EN = await import(S1 + "sp_entry.mjs"), MC = await import(S1 + "sp_m1c.mjs");
const { C3Controller } = await import(L.RA + "balance2/c3/c3_ctrl.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
// Geometry (PPR-3 standing entry): the recipient faces +x, feet at z ±0.21 (foot centres x −0.034). The tackler travels −z: it comes from the
// recipient's LEFT and its slide line crosses the stance (near = left foot first, then the right). `lateral` moves the line along the foot (+x toward
// the toes, −x toward the heel / ankle). (An earlier draft gave STRONG −0.21 m, which is BEHIND the heels — a near miss; corrected before any run.)
// SP2 conditions (geometric, interpretable): the tackler crosses from the recipient's LEFT (travelling −z); the line of its tackling boot
// relative to the near foot's centre along the foot (lateral: + toward the toes), the speed, and when along its slide it arrives.
export const CONDS = { GRAZE: { speed: 4.5, lateral: 0.24, note: "glancing: the tackling boot's line passes 0.24 m toward the toes from the near foot centre (the boots' tips at most overlap)" },
  LIGHT: { speed: 4.5, lateral: 0.15, note: "the boot's line crosses the front of the near foot (toe box) at 4.5 m/s" },
  MODERATE: { speed: 5.0, lateral: 0.05, note: "the boot's line crosses the near foot just forward of its centre at 5.0 m/s" },
  STRONG: { speed: 5.5, lateral: -0.06, note: "the boot / shin line passes under the ankles (behind the foot centre) at 5.5 m/s: the extended leg sweeps the base of both legs" },
  CALIB: { speed: 5.0, lateral: 0.05, away: 10, note: "the MODERATE placement moved 10 m clear: the recipient's unperturbed twin" } };
export const TC_AFTER_FIRSTBODY = 0.12;   // SP2: the boot meets the target 0.12 s after the first fold-side body contact (sliding, leg extended)
class Stage3Plant extends L.Pvp0Plant { _activate() { super._activate(); const c = this.tackler, S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt);
  const { cmd } = this.lawT.command(c, c.st, c.up.ev, this.n); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.entryReinit = true; } }
// X_<speed>_<lateral> = a free geometric condition (the lateral-line sweep that maps the response spectrum)
const condOf = (name) => CONDS[name] || (name.startsWith("X_") ? (([, s, l]) => ({ speed: +s, lateral: +l, note: `sweep: ${s} m/s, line ${l} m toward the toes` }))(name.split("_")) : null);
export async function run(phys, condName, steps = 1300, ctrl = "A6") { const cond = condOf(condName), ACT = 408, h = 1 / 240;
  const mk = () => P2.finalize(P2.makeCand(phys, cond.speed, "SP2"), ctrl);
  // tackler-alone reference (solo plant) → the tackling boot's position TC_AFTER_FIRSTBODY after the first fold-side body contact
  const ref = await RUN.runCand(mk(), { steps: 300 }); ref.contactRule = mk().soleRule; const mref = M2.measure(ref), tc = (mref.firstBodyT ?? 0.4) + TC_AFTER_FIRSTBODY;
  const rr = ref.recs.find(x => x.t >= tc - 1e-9) || ref.recs[ref.recs.length - 1]; const best = { t: rr.t, boot: rr.S[bi("foot_R")].com, pel: rr.S[0].pos, firstBody: mref.firstBodyT, bootLow: PL.bodyLowest(B[bi("foot_R")], rr.S[bi("foot_R")]).y };
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
  const out = { protocol: "SLIDE-PHYS-2 Stage 3 (C3 × SP2)", case: condName, cond, cand: "SP2", authority: ctrl, phys, steps, activate: ACT, placement: { refT: best.t, refBoot: best.boot, refBootLow: best.bootLow, refFirstBody: best.firstBody, target: tgt, offset: off, yawDeg: 180 },
    wallMs: performance.now() - t0, cpu: sim.cpu, stop, recs: sim.recs, ctrlLog: tr ? tr.log : null, recipientCtrl: cR ? cR.meta() : null, slips: { recipient: sim.runner.act.slips || 0, tackler: sim.tackler.act.slips || 0 } };
  out.finalHash = L.IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }
if (process.argv[1] && process.argv[1].endsWith("sp2_stage3.mjs")) { const phys = JSON.parse(fs.readFileSync(arg("params"))), o = await run(phys, arg("cond", "MODERATE"), +arg("steps", "1300"), arg("ctrl", "A6"));
  L.writeGz(arg("out"), o); const first = o.recs.find(r => r.contacts.some(c => c.kind === "cross" && c.Jn > 0));
  console.log(o.case, "steps", o.recs.length, "hash", o.finalHash, "wall", (o.wallMs / 1000).toFixed(1), "s", o.stop ? "STOP " + JSON.stringify(o.stop) : "", "first contact", first ? `${((first.n - o.activate) / 240).toFixed(3)} s ` + JSON.stringify(first.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => c.a[1] + "×" + c.b[1])) : "none", "placement", JSON.stringify(o.placement.offset.map(x => +x.toFixed(3)))); }

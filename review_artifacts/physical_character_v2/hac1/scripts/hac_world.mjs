// HAC-1 worlds: hybrid_run1's HrPlant (the frozen PVP-0 / PVP-1 two-character world) with the HAC-1 runner law in place of HYBRID-RUN-1's.
// The runner role is always a HAC-1 runner. The second role is one of:
//   "hac"      a second HAC-1 runner (shoulder tests);
//   "F2"/"F3"  the frozen SP2F2 / SP2F3 tackler, built exactly as PVP-1 builds it (tacklerCand, M1c, TCF-1, F37.5 on its bodies, own solo frame);
//   null       a parked, never-activated body (TWIN / no-contact; 60 m away unless parkAt === null, which keeps it at its entry pose like PVP-1's twin).
// One velocity write per body at step 0 (the runner's RUN-1 entry state); no pose writes after construction; the HAC-1 law adds no external force.
// cfg = { intent, opts, second: null | { kind: "hac", intent, opts } | { kind: "F2" | "F3", runinT }, steps, parkAt }
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, B, bi, IL, PL } = L, EN = await import(S1 + "sp_entry.mjs"), C = await import(S1 + "sp_chor.mjs"), MC = await import(S1 + "sp_m1c.mjs");
const PW = await import(RA + "pvp1_running/scripts/pvp1_world.mjs"), RF = await import(RA + "sp2f/scripts/sp2f_run.mjs"), HW = await import(RA + "hybrid_run1/scripts/hr_world.mjs");
const HAC = await import(new URL("./hac_runner.mjs", import.meta.url).href), HE = await import(new URL("./hac_entry.mjs", import.meta.url).href);
// HacPlant: HrPlant plus an optional PRESCRIBED PUSH (cfg.push = { t0, dur, J: N·s (world), body }): a constant force J/dur on one runner body at its
// COM for [t0, t0 + dur) — an external disturbance with a known impulse (the push-recovery protocol), returned to the plant's external ledger
class HacPlant extends HW.HrPlant { _applyPerturb() { const out = super._applyPerturb() || []; const P = this.push; if (P && this.n >= Math.round(P.t0 / this.dt) && this.n < Math.round((P.t0 + P.dur) / this.dt)) {
    const c = this.runner, k = bi(P.body), i = c.bOff + k, s = c.st[k], F = V.sc(P.J, 1 / P.dur); this.w.addForceAt(i, F, s.com); out.push({ i, F, p: s.com }); this.pushLog = (this.pushLog || []).concat([[this.n, F.map(x => +x.toFixed(1))]]); } return out; } }
const zero = (p) => p.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })), PARK_RUNIN = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/run1g_4.608.json";
export async function runHac(cfg) { const J = await L.jolt(), steps = cfg.steps || 600, I1 = cfg.intent, ent = (I) => (cfg.rawEntry ? I.entry() : HE.consistentEntry(I)), e1 = ent(I1), Law = cfg.Law || HAC.HacRunner;
  let lawT = null, poseT, velT = null, activate = Infinity, cand = null, label2 = "parked";
  if (cfg.second && cfg.second.kind === "hac") { const e2 = ent(cfg.second.intent); poseT = e2.pose; velT = e2.vel; activate = 0; label2 = "hac";
    lawT = (p, c) => { const r = new Law(cfg.second.intent, cfg.second.opts || cfg.opts || {}); r.attach(p, c); return r; }; }
  else if (cfg.second && /^F[23]$/.test(cfg.second.kind)) { const T = PW.tacklerCand(cfg.second.kind, cfg.second.runinT); cand = T.cand; const E = EN.buildEntry(cand.entry), chor = C.compile(cand.chor); poseT = E.pose; velT = E.vel; activate = 0; label2 = PW.TACKLERS[cfg.second.kind].label;
    lawT = (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, cand.makeCtrl(cand, chor, E)); if (cand.muscle === "M1c") MC.useM1c(c.act, cand.tauCbMs); return b; }; }
  else { const T = PW.tacklerCand("F3", cfg.parkRunin || PARK_RUNIN); const E = EN.buildEntry(T.cand.entry); poseT = E.pose.map(s => ({ pos: V.add(s.pos, cfg.parkAt || [60, 0, 0]), rot: s.rot })); if (cfg.parkAt === null) poseT = E.pose; }
  const entries = { runner: { poses: e1.pose, vel: zero(e1.pose) }, tackler: { poses: poseT, vel: zero(poseT) } };
  let law1 = null; const r0 = IL.SPECS.R0; IL.SPECS.R0 = () => PL.SPEC_T(); let sim;
  try { sim = new HacPlant(J, entries, { runner: { L: false, R: false }, tackler: { L: false, R: false } }, "N2", { O: [0, 0, 0], instrument: true, maxSteps: steps,
      law: (p, c) => { law1 = new Law(I1, cfg.opts || {}); law1.attach(p, c); return law1; }, lawT, activate, tacklerVel: velT, runnerVel: e1.vel }); } finally { IL.SPECS.R0 = r0; }
  sim.push = cfg.push || null; const nR = sim.runner.nb; if (cand) { if (cand.soleRule) L.installSoleRule(sim, [nR + bi("foot_L") + 1, nR + bi("foot_R") + 1], cand.soleRule); PW.installBodyFrictionScaleOff(sim, RF.TEMP_M, nR); }
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 30); if (bad) { stop = { step: sim.n, who: bad[0] }; break; } }
  const wallMs = performance.now() - t0, lawT2 = sim.lawT && label2 === "hac" ? sim.lawT : null;
  const out = { protocol: "HAC-1 · runner × " + label2, label2, steps, h: sim.dt, wallMs, cpu: { ...sim.cpu }, stop, nR, recs: sim.recs, lawR: law1 ? law1.log : null, lawRMeta: law1 ? law1.meta() : null,
    lawT: lawT2 ? lawT2.log : null, lawTMeta: lawT2 ? lawT2.meta() : null, ctrlT: sim.lawT && label2 !== "hac" && sim.lawT.ctrl && sim.lawT.ctrl.log ? sim.lawT.ctrl.log : null,
    intentR: { k0: I1.k0, kRef: I1.kRef, qR: I1.qR, offR: I1.offR, entryH: e1.H0 ? { H0: e1.H0, Hbar: e1.Hbar, H1: e1.H1, wc: e1.wc } : null }, intentT: cfg.second && cfg.second.kind === "hac" ? { k0: cfg.second.intent.k0, kRef: cfg.second.intent.kRef, qR: cfg.second.intent.qR, offR: cfg.second.intent.offR } : null };
  out.push = cfg.push || null; out.pushLog = sim.pushLog || null; out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }

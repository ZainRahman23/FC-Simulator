// HYBRID-RUN-1 worlds: the frozen PVP-0 / PVP-1 two-character world (Pvp0Plant on PvpPlant: one Jolt world, every cross-character pair collides,
// ledgers, decoded contacts). Both characters use the tacklers' V1-matched V2 body. The runner role is always a HYBRID runner (hr_runner.mjs, on
// the V2 actuator layer). The second role is one of:
//   "hybrid"   a second hybrid runner (the shoulder-to-shoulder test);
//   "F2"/"F3"  the frozen SP2F2 / SP2F3 tackler, exactly as PVP-1 builds it (pvp1_world.mjs tacklerCand: the same candidate, M1c, TCF-1, F37.5 on
//              its own bodies, its own solo frame, activated at step 0);
//   null       a parked, never-activated body far away (the TWIN / no-contact runs).
// Both characters start at step 0 in their entry state: the hybrid runner's state is RUN-1's own pose and velocity at its start frame. One velocity
// write per body; no pose is written after construction. The only forces besides contacts, gravity and the joint actuators are each hybrid
// runner's explicit gait-support wrench (hr_runner.mjs §2), applied immediately before each physics step and logged in its law record.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi, IL, PL } = L, EN = await import(S1 + "sp_entry.mjs"), C = await import(S1 + "sp_chor.mjs"), MC = await import(S1 + "sp_m1c.mjs");
const PW = await import(RA + "pvp1_running/scripts/pvp1_world.mjs"), RF = await import(RA + "sp2f/scripts/sp2f_run.mjs");
const HR = await import(new URL("./hr_runner.mjs", import.meta.url).href);
export class HrPlant extends L.Pvp0Plant {
  constructor(J, entries, flags, mode, opts = {}) { super(J, entries, flags, mode, opts); this.rVel = opts.runnerVel; this.rAct = false; }
  // the runner's initial condition at step 0: its entry velocities (one write per body), then the actuator plan re-initialised on that true state
  _activateRunner() { const c = this.runner; for (let i = 0; i < c.nb; i++) this.w.setVel(c.bOff + i, this.rVel[i].v, this.rVel[i].w);
    const S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt); this.law.log.length = 0; const { cmd } = this.law.command(c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.rAct = true; }
  _activate() { super._activate(); if (!this.lawT) return; const c = this.tackler, S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt);
    if (this.lawT.log) this.lawT.log.length = 0; const { cmd } = this.lawT.command(c, c.st, c.up.ev, this.n); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.entryReinit = true; }
  _applyPerturb() { const out = super._applyPerturb(); if (this.law && this.law.applyForces) this.law.applyForces(this); if (this.lawT && this.lawT.applyForces && this.activated) this.lawT.applyForces(this); return out; }
  tick() { if (!this.rAct) this._activateRunner(); return super.tick(); } }
const zero = (p) => p.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] }));
// cfg = { intent (hr_intent), opts (HybridRunner options), second: null | { kind: "hybrid", intent, opts } | { kind: "F2" | "F3", runinT }, steps }
export async function runHybrid(cfg) { const J = await L.jolt(), steps = cfg.steps || 600, I1 = cfg.intent, e1 = I1.entry();
  let lawT = null, poseT, velT = null, activate = Infinity, cand = null, label2 = "parked";
  if (cfg.second && cfg.second.kind === "hybrid") { const e2 = cfg.second.intent.entry(); poseT = e2.pose; velT = e2.vel; activate = 0; label2 = "hybrid";
    lawT = (p, c) => { const r = new HR.HybridRunner(cfg.second.intent, cfg.second.opts || {}); r.attach(p, c); return r; }; }
  else if (cfg.second && /^F[23]$/.test(cfg.second.kind)) { const T = PW.tacklerCand(cfg.second.kind, cfg.second.runinT); cand = T.cand; const E = EN.buildEntry(cand.entry), chor = C.compile(cand.chor); poseT = E.pose; velT = E.vel; activate = 0; label2 = PW.TACKLERS[cfg.second.kind].label;
    lawT = (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, cand.makeCtrl(cand, chor, E)); if (cand.muscle === "M1c") MC.useM1c(c.act, cand.tauCbMs); return b; }; }
  else { const T = PW.tacklerCand("F3", cfg.parkRunin || cfg.second?.runinT || "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/run1g_4.608.json"); const E = EN.buildEntry(T.cand.entry);
    poseT = E.pose.map(s => ({ pos: V.add(s.pos, cfg.parkAt || [60, 0, 0]), rot: s.rot })); if (cfg.parkAt === null) poseT = E.pose; }
  const entries = { runner: { poses: e1.pose, vel: zero(e1.pose) }, tackler: { poses: poseT, vel: zero(poseT) } };
  let law1 = null; const r0 = IL.SPECS.R0; IL.SPECS.R0 = () => PL.SPEC_T(); let sim;
  try { sim = new HrPlant(J, entries, { runner: { L: false, R: false }, tackler: { L: false, R: false } }, "N2", { O: [0, 0, 0], instrument: true, maxSteps: steps,
      law: (p, c) => { law1 = new HR.HybridRunner(I1, cfg.opts || {}); law1.attach(p, c); return law1; }, lawT, activate, tacklerVel: velT, runnerVel: e1.vel }); } finally { IL.SPECS.R0 = r0; }
  const nR = sim.runner.nb; if (cand) { if (cand.soleRule) L.installSoleRule(sim, [nR + bi("foot_L") + 1, nR + bi("foot_R") + 1], cand.soleRule); PW.installBodyFrictionScaleOff(sim, RF.TEMP_M, nR); }
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 30); if (bad) { stop = { step: sim.n, who: bad[0] }; break; } }
  const out = { protocol: "HYBRID-RUN-1 · runner × " + label2, label2, steps, h: sim.dt, wallMs: performance.now() - t0, stop, nR, recs: sim.recs, lawR: law1 ? law1.log : null, lawRMeta: law1 ? law1.meta() : null,
    lawT: sim.lawT && sim.lawT.log && label2 === "hybrid" ? sim.lawT.log : null, ctrlT: sim.lawT && label2 !== "hybrid" && sim.lawT.ctrl && sim.lawT.ctrl.log ? sim.lawT.ctrl.log : null, intentR: { k0: I1.k0, kRef: I1.kRef, qR: I1.qR, offR: I1.offR },
    intentT: cfg.second && cfg.second.kind === "hybrid" ? { k0: cfg.second.intent.k0, kRef: cfg.second.intent.kRef, qR: cfg.second.intent.qR, offR: cfg.second.intent.offR } : null };
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }

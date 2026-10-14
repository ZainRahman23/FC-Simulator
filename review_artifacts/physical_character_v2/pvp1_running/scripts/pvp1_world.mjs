// PVP-1 two-player world: a running RUN-1 recipient vs the frozen SP2F2 (PVP-F2) or SP2F3 (PVP-F3) tackler.
// The world is the frozen PVP-0 two-character world: pvp0_plant.mjs Pvp0Plant on PvpPlant, one Jolt world in which every cross-character pair
// collides, with per-character and system ledgers and decoded contacts. Both characters use the tacklers' body (V1-matched V2): the recipient's
// spec is SPEC_T for the construction, so the same controllers, kinematics and anatomy apply to both.
//
// TACKLER: exactly the solo SP2F2 / SP2F3 run (runSP2F2 / runSP2F3 → auditRun → runCand), unchanged:
//   - the same candidate, entry, choreography and controller;
//   - M1c, and TCF-1 on its own boots;
//   - F37.5 (the temporary friction diagnostic) on its own bodies, with the identical rule offset to its body indices;
//   - the same frame: its solo coordinates. It is not rotated or moved, so nothing world-framed in its controller changes.
//   It is created kinematic at its entry pose and becomes dynamic at step 0 with its entry velocities, and its muscles are re-initialised on the true
//   entry state: the SoloPlant activation.
// RECIPIENT: pvp1_recipient.mjs, placed by a yaw + translation (qR, offR). It is created at its handoff pose and receives its handoff velocities
//   at step 0 (one write per body, the same activation mechanism), and its muscles are re-initialised on the true handoff state.
// Both start at step 0. No pose is written after construction and no external force acts.
// TWIN: the same world with the tackler never activated: parked kinematic at its entry pose, inert. It is the recipient's undisturbed run.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi, IL, PL } = L;
const EN = await import(S1 + "sp_entry.mjs"), C = await import(S1 + "sp_chor.mjs"), MC = await import(S1 + "sp_m1c.mjs");
const AA = await import(RA + "sp2a/scripts/sp2a_author.mjs"), FL = await import(RA + "sp2a/scripts/sp2a_flight.mjs"), FC = await import(RA + "sp2a/fsweep/scripts/fs_contact.mjs");
const SF2 = await import(RA + "sp2f/v2/scripts/sp2f2_cand.mjs"), SF3 = await import(RA + "sp2f/v3/scripts/sp2f3_cand.mjs"), RF = await import(RA + "sp2f/scripts/sp2f_run.mjs");
const REC = await import(new URL("./pvp1_recipient.mjs", import.meta.url).href);
const GROUND = 1000, NB = B.length;
export const TACKLERS = { F2: { label: "PVP-F2", src: "SP2F2 (44a80d3c)", opts: "sp2f/v2/evidence/SP2F2_opts.json" }, F3: { label: "PVP-F3", src: "SP2F3 (39a0446b)", opts: "sp2f/v3/evidence/SP2F3_opts.json" } };
// the tackler candidate exactly as runSP2F2 / runSP2F3 build it
export function tacklerCand(kind, runin) { const X = JSON.parse(fs.readFileSync(new URL(TACKLERS[kind].opts, RA))), RI = AA.loadRunIn(runin, null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3);
  const cand = kind === "F2" ? SF2.sp2f2Cand(speed, X) : SF3.sp2f3Cand(speed, X), plan = FL.flightPlan(RI, cand); return { X, RI, speed, cand: { ...cand, entry: plan.entry }, plan }; }
// F37.5 on the tackler's bodies: fs_contact.installBodyFrictionScale's rule, statement for statement, with the tackler's Jolt user data offset by
// the recipient's body count (the solo tackler's bodies are 1…14; here they are off + 1…off + 14)
export function installBodyFrictionScaleOff(sim, m, off, sole = { studded: 1.2, upper: 0.5 }) { const J = sim.J, Lr = sim.w.listener, feet = new Set([off + bi("foot_L") + 1, off + bi("foot_R") + 1]);
  const log = sim.fsLog = { m, off, scaled: 0, boots: 0 };
  const adj = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), u1 = b1.GetUserData(), u2 = b2.GetUserData();
    const body = u1 === GROUND ? b2 : u2 === GROUND ? b1 : null; if (!body) return; const u = body.GetUserData(); if (!(u >= off + 1 && u <= off + NB)) return;
    const cs = J.wrapPointer(sp, J.ContactSettings);
    if (feet.has(u)) { const r = body.GetRotation(), k = FC.soleK([r.GetX(), r.GetY(), r.GetZ(), r.GetW()]); cs.mCombinedFriction = m * sole.upper + (sole.studded - m * sole.upper) * k; log.boots++; }
    else { cs.mCombinedFriction = m * cs.mCombinedFriction; log.scaled++; } };
  const oa = Lr.OnContactAdded, op = Lr.OnContactPersisted;
  Lr.OnContactAdded = (a, b, c, d) => { oa(a, b, c, d); adj(a, b, c, d); }; Lr.OnContactPersisted = (a, b, c, d) => { op(a, b, c, d); adj(a, b, c, d); };
  return log; }
export class Pvp1Plant extends L.Pvp0Plant {
  // opts.runnerVel: the recipient's handoff velocities; opts.activateR: its takeover step. Until then it is parked KINEMATIC at its handoff pose
  // (inert to the static turf, as the parked tackler is) and its law is not stepped (the controller's own step index is n − activateR).
  constructor(J, entries, flags, mode, opts = {}) { super(J, entries, flags, mode, opts); this.rVel = opts.runnerVel; this.actR = opts.activateR ?? 0; this.rAct = false; this.cpu.lawR = 0;
    this._parkedCmdR = this.runner.aplan; if (this.actR > 0) for (let i = 0; i < this.runner.nb; i++) this.w.setKinematic(this.runner.bOff + i); }
  // the recipient's initial condition: dynamic, its handoff velocities (one write per body), then its muscle state re-initialised on the TRUE
  // handoff state with the law's first command (controller step 0)
  _activateRunner() { const c = this.runner, J = this.J; for (let i = 0; i < c.nb; i++) { const b = c.bOff + i; if (this.actR > 0) this.w.bi.SetMotionType(this.w.bodies[b].GetID(), J.EMotionType_Dynamic, J.EActivation_Activate); this.w.setVel(b, this.rVel[i].v, this.rVel[i].w); }
    const S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt); this.rAct = true; this.rActAt = this.n; if (this.law.ctrl && this.law.ctrl.log) this.law.ctrl.log.length = 0;
    const { cmd } = this.law.command(c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); }
  toneCmd(c, st, ev, t) { if (c === this.runner && this.law) { if (!this.rAct) return { cmd: this._parkedCmdCmd || (this._parkedCmdCmd = this.law.command(c, st, ev, 0).cmd) };
      const t0 = performance.now(), out = this.law.command(c, st, ev, this.n - this.actR); this.cpu.lawR += performance.now() - t0; return out; } return super.toneCmd(c, st, ev, t); }
  // the tackler's activation: Pvp0Plant's, plus SoloPlant's entry muscle re-initialisation (as SLIDE-PHYS-2 Stage 3)
  _activate() { super._activate(); if (!this.lawT) return; const c = this.tackler, S = this.readAll(); c.st = S.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt);
    const { cmd } = this.lawT.command(c, c.st, c.up.ev, this.n); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); this.entryReinit = true; }
  tick() { if (!this.rAct && this.n >= this.actR) this._activateRunner(); const ok = super.tick(); if (ok && this.recs.length) this.recs[this.recs.length - 1].recipientActive = this.rAct; return ok; } }
export const placePose = (pose, q, off) => pose.map(s => ({ pos: V.add(Q.rot(q, s.pos), off), rot: Q.norm(Q.mul(q, s.rot)) }));
export const placeVel = (vel, q) => vel.map(x => ({ v: Q.rot(q, x.v), w: Q.rot(q, x.w) }));
// one run. R = { H (handoff), CO (continuation, built with qR), qR, offR, opts (recipient controller options) }; kind "F2" | "F3";
// twin: true keeps the tackler parked (never activated). tacklerAway: [x, y, z] moves the RECIPIENT far off (the tackler-alone check in this world).
export async function runPVP({ kind = "F3", runinT, R, steps = 840, twin = false, recipientAway = null }) { const J = await L.jolt(), h = 1 / 240;
  const T = tacklerCand(kind, runinT), cand = T.cand, E = EN.buildEntry(cand.entry), chor = C.compile(cand.chor);
  const offR = recipientAway ? V.add(R.offR, recipientAway) : R.offR, poseR = placePose(R.H.E.pose, R.qR, offR), velR = placeVel(R.H.E.vel, R.qR);
  const zero = (p) => p.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })), entries = { runner: { poses: poseR, vel: zero(poseR) }, tackler: { poses: E.pose, vel: zero(E.pose) } };
  const flags = { runner: { L: R.H.stance.L, R: R.H.stance.R }, tackler: { L: false, R: false } }, rec = REC.makeRecipient(R.H, R.CO, R.opts || {});
  let trR = null, trT = null; const r0 = IL.SPECS.R0; IL.SPECS.R0 = () => PL.SPEC_T(); let sim;
  try { sim = new Pvp1Plant(J, entries, flags, "N2", { O: [0, 0, 0], instrument: true, maxSteps: steps,
      law: (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, (trR = rec.make())); if (rec.opts.muscle === "M1c") MC.useM1c(c.act, rec.opts.tauCbMs); return b; },
      lawT: (p, c) => { const b = new L.MB.M1bBody(p, c, L.BODY, (trT = cand.makeCtrl(cand, chor, E))); if (cand.muscle === "M1c") MC.useM1c(c.act, cand.tauCbMs); return b; },
      activate: twin ? Infinity : 0, tacklerVel: E.vel, runnerVel: velR, activateR: R.actR ?? 0 }); } finally { IL.SPECS.R0 = r0; }
  const nR = sim.runner.nb; if (sim.tackler.bOff !== nR) throw new Error("body layout");
  if (cand.soleRule) L.installSoleRule(sim, [nR + bi("foot_L") + 1, nR + bi("foot_R") + 1], cand.soleRule);
  installBodyFrictionScaleOff(sim, RF.TEMP_M, nR);
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 25); if (bad) { stop = { step: sim.n, who: bad[0] }; break; } }
  const out = { protocol: "PVP-1 running recipient × " + (twin ? "parked tackler (TWIN)" : TACKLERS[kind].label), kind, label: twin ? "TWIN" : TACKLERS[kind].label, twin, steps, h, wallMs: performance.now() - t0, stop,
    recipient: { actR: R.actR ?? 0, tH: R.H.tH, kH: R.H.RI.k0, airborne: R.H.airborne, stance: R.H.stance, support: R.H.support, initGRF: R.H.initGRF, qR: R.qR, offR, entryCom: R.H.E.com, entryComVel: R.H.E.comVel, opts: rec.opts, stances: R.CO.stances },
    tackler: { src: TACKLERS[kind].src, speed: T.speed, entryCom: E.com, entryComVel: E.comVel, frictionM: RF.TEMP_M, soleRule: cand.soleRule || null, muscle: cand.muscle || "M1b", tOffset: cand.tOffset ?? 0 },
    nR, recs: sim.recs, ctrlLogR: trR ? trR.log : null, ctrlLogT: trT && !twin ? trT.log : null, ctrlR: trR ? trR.meta() : null, ctrlT: trT && !twin ? trT.meta() : null, slips: { recipient: sim.runner.act.slips || 0, tackler: sim.tackler.act.slips || 0 },
    fsLog: sim.fsLog, soleLog: sim.soleLog || null, runInR: null, runInT: T.plan.frames };
  out.finalHash = L.IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }

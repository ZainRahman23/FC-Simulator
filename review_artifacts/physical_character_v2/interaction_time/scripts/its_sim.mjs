// ITS-1 plant (ITS1_PREREG.md §3 / §4, frozen cb886b14): the G2 plant constructed exactly as REV2 PI1Sim constructs it, initialized ONCE (28 counted
// authority writes), the REV2 PostureDriver with targets frozen at the initialized configuration, read-only ankle probes, and ONE collision impulse
// through the G2 test-force path (constant force J/(dt·dur) at a body-fixed point for `dur` steps from step nImp). No B (unless opts.support, D-1),
// no carrier, no stand-in, no outcome input. Nothing in physchar2 / REV2 is modified.
import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../sandbox/visual/physchar2") + "/";
const { G2Sim, G2_SCENARIOS } = await import(P2 + "gates/v2_g2.js"), { SLP_STAND } = await import(P2 + "gates/v2_slp.js"), { SupportLayer } = await import(P2 + "ctrl/v2_supported.js");
const { AnkleProbe } = await import(P2 + "gates/v2_g1_ankle.js"), { V, Q } = await import(P2 + "core/v2_math.js");
const { PostureDriver } = await import(path.resolve(here, "../../pi1/rev2/scripts/pi1_rev2_sim.mjs"));
const now = () => performance.now();
export class ITSim extends G2Sim {
  // init: { S, vel, side } (physics frame); imp: null | { body, pLocal, J: [3], nImp, dur }; opts: { seconds, support: null | { rootAt(τ), tau0 } }
  constructor(J, spec, init, imp, opts = {}) {
    super(J, spec, { ...G2_SCENARIOS.S0short, seconds: opts.seconds || 2 }, { cfg: { diagNoGround: true }, probes: false, passiveOpts: { kneeModel: "v2k" }, stand: SLP_STAND });
    this.pel = spec.bodies.findIndex(b => b.name === "pelvis"); this.footI = [spec.bodies.findIndex(b => b.name === "foot_L"), spec.bodies.findIndex(b => b.name === "foot_R")];
    const w0 = this.ledger.authorityWrites; init.S.forEach((s, i) => { this.w.setPose(i, s.pos, s.rot); this.w.setVel(i, init.vel[i].v, init.vel[i].w); }); this.initWrites = this.ledger.authorityWrites - w0;
    this.st = this.read(); this.probes = ["L", "R"].map(s => new AnkleProbe(this, s));
    this.imp = imp; this.impSteps = 0; this.impJ = [0, 0, 0]; this.impLog = [];
    if (opts.support) { const M = spec.bodies.reduce((s, b) => s + b.mass, 0), om = 2 * Math.PI * 2, I = opts.support.Ipel || [8, 2, 8];   // REV2 PI1Sim B construction, unchanged values
      this.sup = new SupportLayer(this.w, this.pel, this.st[this.pel].com.slice(), { lin: M * om * om, dlin: 2 * M * om, rot: I.map(x => x * om * om), drot: I.map(x => 2 * x * om) }, { h: 274.95, up: 1161.2, down: 193.5, torque: 81.80 });
      this.supOpt = opts.support; this.root0 = opts.support.rootAt(opts.support.tau0); this.facing0 = this.root0.facing; }
    this.pd = new PostureDriver(this.ctrl, spec); this.up = this.P.compute(this.st, this.dt); this.pd.setTargets(this.up.ev.qs);
    this.contactFlags = [init.side === "L", init.side === "R"]; this.pd.wSt = this.contactFlags.map(f => (f ? 1 : 0));   // controller state initialized from the initialized support state (recorded)
    this.cpu3 = { pd: 0 }; this.diagCtrlOff = !!opts.diagCtrlOff; this._ctrl(true); this._measure();   // diagCtrlOff: STOP-diagnostic only (zero posture-tone commands)
  }
  _sense() { return this.probeRows ? super._sense() : { Fz: [0, 0], touch: [0, 0] }; }
  _ctrl(init) { if (!this.pd) return super._ctrl(init); const t0 = now(); let cmd = this.pd.compute(this.st, this.up.ev, this.dt, this.contactFlags || [false, false]); if (this.diagCtrlOff) cmd = cmd.map(r => (r ? r.map(x => ({ ...x, K: 0, D: 0, tau0: 0, ff: 0 })) : r)); const t1 = now(); this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); const t2 = now();
    this.cpu3.pd += t1 - t0; this.cpu2.act += t2 - t1; this.lastCmd = cmd; }
  _disturb() { const out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 };
    if (this.sup && this.supOpt) { const tn = this.supOpt.tau0 + (this.n + 1) / 4, r = this.supOpt.rootAt(tn), dp = V.sub(r.pos, this.root0.pos); dp[1] = 0; this.sup.setTargets(dp, [r.vel[0], 0, r.vel[2]], 0);
      const dyw = r.facing - this.facing0, q = [0, Math.sin(dyw / 2), 0, Math.cos(dyw / 2)]; this.sup.q.Set(q[0], q[1], q[2], q[3]); this.sup.c.SetTargetOrientationCS(this.sup.q); }   // REV2 rule, unchanged
    const I = this.imp; if (I && this.n >= I.nImp && this.n < I.nImp + I.dur) { if (this.impSteps >= I.dur) throw new Error("impulse already applied");
      const b = this.st[I.body], at = V.add(b.pos, Q.rot(b.rot, I.pLocal)), F = V.sc(I.J, 1 / (this.dt * I.dur)); this.w.addForceAt(I.body, F, at);
      this.impSteps++; this.impJ = V.add(this.impJ, V.sc(F, this.dt)); this.impLog.push({ n: this.n, F, at, stPre: { v: b.v.slice(), w: b.w.slice(), com: b.com.slice() } }); out.F = F; out.at = at; out.body = I.body; }
    return out; }
  tick() { const ok = super.tick(); if (!ok) return false; const C = this.lastContacts || [];
    this.contactFlags = this.footI.map(fi => C.some(c => ((c.a === -1 && c.b === fi) || (c.b === -1 && c.a === fi)) && c.depth > -0.0005)); return true; }
}

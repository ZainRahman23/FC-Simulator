// PVP-0 two-character plant: the frozen PVP-1A two-character world (pvp1a_sim.mjs PvpPlant: ONE V2JoltWorld, runner bodies 0…13, tackler 14…27,
// every cross-character pair collides, the post-step contact cache decoded per manifold, per-character and system momentum / energy ledgers, the
// equal-and-opposite cross-impulse check) through PPR-1 / PPR-2's law hooks (ppr1_plant.mjs, ppr2_plant.mjs — imported, unmodified), with:
//   RECIPIENT  the runner, law = the canonical M1b body + the frozen C3 controller (exactly as BALANCE-2 runs it, balance1/scripts/b1_run.mjs);
//   TACKLER    law = the canonical M1b body + the PVP-0 K tracker (pvp0_tracker.mjs) — a second law hook, the runner hook's mirror;
//   ENTRY      the tackler is created at its K start pose with zero velocity and held KINEMATIC (inert: kinematic bodies do not collide with the
//              static turf, and it is metres from the recipient) until `activate`; at that step, before the world step, its bodies become dynamic
//              and receive the K start velocities (one velocity write per body, the tackler's initial condition). No pose is ever written after
//              construction, for either character; no external force acts on either character at any time.
//   TWIN       opts.activate = Infinity keeps the tackler parked for the whole run: the same world, the recipient's undisturbed reference.
// The step body is PprPlant.tick, statement for statement, plus the tackler hooks (marked ▸).
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { IL, V, Q } = PL;
const { Ppr2Plant } = await import(new URL("../../ppr2/scripts/ppr2_plant.mjs", import.meta.url).href), TA = await import(PL.P2 + "tools/track_a_lib.mjs");
const now = () => performance.now();
export class Pvp0Plant extends Ppr2Plant {
  constructor(J, entries, flags, mode, opts = {}) { super(J, entries, flags, mode, opts);
    this.tackler = this.chars.find(c => c.role === "tackler"); this.activate = opts.activate ?? Infinity; this.tVel = opts.tacklerVel || null; this.activated = false; this.cpu.lawT = 0;
    this.lawT = opts.lawT ? opts.lawT(this, this.tackler) : null;
    if (this.lawT) { const c = this.tackler, { cmd } = this.lawT.command(c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); }
    for (let i = 0; i < this.tackler.nb; i++) this.w.setKinematic(this.tackler.bOff + i); }
  toneCmd(c, st, ev, t) { if (this.lawT && c === this.tackler) { const t0 = now(), out = this.lawT.command(c, st, ev, this.n); this.cpu.lawT += now() - t0; return out; } return super.toneCmd(c, st, ev, t); }
  _activate() { const c = this.tackler, J = this.J; for (let i = 0; i < c.nb; i++) { const b = c.bOff + i; this.w.bi.SetMotionType(this.w.bodies[b].GetID(), J.EMotionType_Dynamic, J.EActivation_Activate); this.w.setVel(b, this.tVel[i].v, this.tVel[i].w); }
    this.activated = true; this.activatedAt = this.n; }
  tick() {
    if (this.n >= this.maxSteps) return false;
    if (!this.activated && this.n >= this.activate) this._activate();                                                                   // ▸ tackler initial condition
    let t0 = now(); for (const c of this.chars) { c.P.apply(c.up); c.act.apply(c.aplan); } this.cpu.passive += now() - t0;
    const ext = this._applyPerturb();
    let pre = null; if (this.instrument) { t0 = now(); const S = this.readAll(), map = {}; S.forEach((s, i) => { map[this.idOf[i]] = { com: s.com, rot: s.rot }; }); map[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] }; pre = { S, map }; this.cpu.instrument += now() - t0; }
    t0 = now(); this.w.step(this.dt, this.coll); this.cpu.step += now() - t0;
    let mf = []; if (this.instrument) { t0 = now(); const dec = TA.decodeContacts(TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_Contacts)); mf = IL.manifoldImpulses(dec, pre.map); this.cpu.instrument += now() - t0; }
    this.n++; const S1 = this.readAll();
    t0 = now(); for (const c of this.chars) { const st0 = c.st; c.st = S1.slice(c.bOff, c.bOff + c.nb); const Dstep = c.P.dampingLoss(c.st, this.dt); c.Dstep = Dstep; c.Dcum += Dstep; c.actRes = c.act.after(st0, c.st, c.aplan); } this.cpu.act += now() - t0;
    if (this.law) { const t1 = now(); this.law.after(this.runner, this.runner.st, this.runner.actRes, this.n); this.cpu.law += now() - t1; }
    if (this.lawT) { const t1 = now(); this.lawT.after(this.tackler, this.tackler.st, this.tackler.actRes, this.n); this.cpu.lawT += now() - t1; }   // ▸ tackler law post-step
    for (const c of this.chars) { let t1 = now(); c.up = c.P.compute(c.st, this.dt); this.cpu.passive += now() - t1; t1 = now(); const { cmd } = this.toneCmd(c, c.st, c.up.ev, this.n * this.dt); this.cpu.tone += now() - t1;
      t1 = now(); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, false); this.cpu.act += now() - t1; }
    if (this.instrument) { t0 = now(); const rec = this._record(pre, S1, mf); this._extLedger(rec, pre, S1, ext, []); rec.act = this._actRows(); rec.passive = this._passiveRows(); if (this.law) rec.law = this.law.info();
      if (this.lawT) { rec.lawT = this.lawT.info(); rec.actT = (this.tackler.actRes || []).map(r => [r.k, r.i, r.tau, r.cap, r.frac, r.sat ? 1 : 0, r.req, r.a[0], r.a[1]]); }   // ▸ tackler rows
      rec.tacklerActive = this.activated; this.recs.push(rec); this.cpu.measure += now() - t0; }
    this.prev = S1; return true; }
}

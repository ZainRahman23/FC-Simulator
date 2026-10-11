// PPR-1 plant (physiological passive / pre-reflex response). The FROZEN PVP-1A two-character plant (pvp1/scripts/pvp1a_sim.mjs, class PvpPlant —
// imported, not copied into, not modified) with four hooks, all inert when unused:
//   (1) LAW: opts.law = null → the runner keeps IFM-1's SnapshotTone exactly (condition A, CURRENT V2); opts.law = (plant, runner) => law object →
//       the law supplies the runner's actuator rows every step (command), may own the runner's actuator layer, and receives the post-step state and
//       the exact actuator torque readback (after). The law never receives contacts, the tackler, labels or outcomes: its only inputs are the
//       runner's own body states and its own actuator readback — the same inputs it has with no tackler at all;
//   (2) RUN LENGTH: opts.maxSteps (the frozen tick stops at PV.steps = 260); the step body below is the frozen tick's, statement for statement;
//   (3) VALIDATION DISTURBANCES (never in the PVP runs): opts.perturb = [{ from, to, body, F (world N), pLocal (body-local point) } | { from, to,
//       pair: [parentBody, childBody], T (world N·m, +T on the child / −T on the parent) }]; opts.impactor = IFM-1's diagnostic sphere
//       ({ centre, v, r, m, I }); both are external to the character and accounted in its ledgers (rec.ext);
//   (4) MEASUREMENT: per runner actuator axis the exact constraint torque, request, capacities, activations (rec.act) and the law's own terms (rec.law).
// With law = null, no disturbance and maxSteps = 260 the physics is the frozen plant's exactly (checked bit for bit against the committed DX N2 record).
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q } = PL;
const { PvpPlant } = await import(new URL("../../pvp1/scripts/pvp1a_sim.mjs", import.meta.url).href);
const TA = await import(PL.P2 + "tools/track_a_lib.mjs");
const now = () => performance.now(), IMP_UD = 2000, L_MOVING = 1;
export class PprPlant extends PvpPlant {
  constructor(J, entries, flags, mode, opts = {}) {
    super(J, entries, flags, mode, opts);
    this.maxSteps = opts.maxSteps ?? PV.steps; this.perturb = opts.perturb || []; this.cpu.law = 0; this.extLog = [];
    this.runner = this.chars.find(c => c.role === "runner"); this.bodyIdx = (name) => this.runner.bOff + this.runner.spec.bodies.findIndex(b => b.name === name);
    if (opts.impactor) this._makeImpactor(J, opts.impactor);
    this.law = opts.law ? opts.law(this, this.runner) : null;
    if (this.law) { const c = this.runner, { cmd } = this.toneCmd(c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); }   // the entry actuator plan from the law
  }
  // IFM-1's diagnostic impactor (ifm1/scripts/ifm1_sim.mjs: dynamic sphere created last, body material, gravity factor 1), contacts read as external
  _makeImpactor(J, I) { const w = this.w, sh = new J.SphereShapeSettings(I.r, null), shape = sh.Create().Get(), c = I.centre;
    const bcs = new J.BodyCreationSettings(shape, new J.RVec3(c[0], c[1], c[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_MOVING);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided; bcs.mMassPropertiesOverride.mMass = I.m; const Im = J.Mat44.prototype.sIdentity();
    Im.SetAxisX(new J.Vec3(I.I, 0, 0)); Im.SetAxisY(new J.Vec3(0, I.I, 0)); Im.SetAxisZ(new J.Vec3(0, 0, I.I)); bcs.mMassPropertiesOverride.mInertia = Im;
    bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = w.cfg.linDamp; bcs.mAngularDamping = w.cfg.angDamp; bcs.mMaxAngularVelocity = w.cfg.maxAngVel; bcs.mAllowSleeping = w.cfg.allowSleep;
    bcs.mGravityFactor = 1; bcs.mUserData = IMP_UD; bcs.mApplyGyroscopicForce = !!w.cfg.gyroscopic;
    this.imp = w.bi.CreateBody(bcs); w.bi.AddBody(this.imp.GetID(), J.EActivation_Activate); J.destroy(bcs);
    const t = w._t; t.v.Set(I.v[0], I.v[1], I.v[2]); w.bi.SetLinearVelocity(this.imp.GetID(), t.v); this.impId = this.imp.GetID().GetIndexAndSequenceNumber();
    const base = this.whoOf; this.whoOf = (id) => (id === this.impId ? "imp" : base(id)); this.impMass = I.m; }
  readImp() { if (!this.imp) return null; const p = this.imp.GetCenterOfMassPosition(), v = this.imp.GetLinearVelocity(); return { com: [p.GetX(), p.GetY(), p.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()] }; }
  toneCmd(c, st, ev, t) { if (this.law && c === this.runner) { const t0 = now(), out = this.law.command(c, st, ev, this.n); this.cpu.law += now() - t0; return out; } return super.toneCmd(c, st, ev, t); }
  _applyPerturb() { const out = []; for (const p of this.perturb) { if (this.n < p.from || this.n >= p.to) continue;
      if (p.F) { const i = this.bodyIdx(p.body), s = this.w.read(i), pw = V.add(s.pos, Q.rot(s.rot, p.pLocal || [0, 0, 0])); this.w.addForceAt(i, p.F, pw); out.push({ i, F: p.F, p: pw }); }
      else if (p.T) { const a = this.bodyIdx(p.pair[0]), b = this.bodyIdx(p.pair[1]); this.w.addTorquePair(a, b, p.T); out.push({ pair: [a, b], T: p.T }); } }
    return out; }
  // ── one step: the frozen PvpPlant.tick, statement for statement, plus the hooks (marked ▸) ──
  tick() {
    if (this.n >= this.maxSteps) return false;                                                                                     // ▸ run length
    let t0 = now(); for (const c of this.chars) { c.P.apply(c.up); c.act.apply(c.aplan); } this.cpu.passive += now() - t0;
    const ext = this._applyPerturb();                                                                                              // ▸ validation disturbance
    let pre = null; if (this.instrument) { t0 = now(); const S = this.readAll(), map = {}; S.forEach((s, i) => { map[this.idOf[i]] = { com: s.com, rot: s.rot }; }); map[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] };
      if (this.imp) { const s = this.readImp(); map[this.impId] = { com: s.com, rot: [0, 0, 0, 1] }; pre = { S, map, imp: s }; } else pre = { S, map }; this.cpu.instrument += now() - t0; }
    t0 = now(); this.w.step(this.dt, this.coll); this.cpu.step += now() - t0;
    let mf = []; if (this.instrument) { t0 = now(); const dec = TA.decodeContacts(TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_Contacts)); mf = IL.manifoldImpulses(dec, pre.map); this.cpu.instrument += now() - t0; }
    this.n++; const S1 = this.readAll();
    t0 = now(); for (const c of this.chars) { const st0 = c.st; c.st = S1.slice(c.bOff, c.bOff + c.nb); const Dstep = c.P.dampingLoss(c.st, this.dt); c.Dstep = Dstep; c.Dcum += Dstep; c.actRes = c.act.after(st0, c.st, c.aplan); } this.cpu.act += now() - t0;
    if (this.law) { const t1 = now(); this.law.after(this.runner, this.runner.st, this.runner.actRes, this.n); this.cpu.law += now() - t1; }   // ▸ law post-step (own state + own readback only)
    for (const c of this.chars) { let t1 = now(); c.up = c.P.compute(c.st, this.dt); this.cpu.passive += now() - t1; t1 = now(); const { cmd } = this.toneCmd(c, c.st, c.up.ev, this.n * this.dt); this.cpu.tone += now() - t1;
      t1 = now(); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, false); this.cpu.act += now() - t1; }
    if (this.instrument) { t0 = now(); const impAll = mf.filter(m => this.whoOf(m.key.body1) === "imp" || this.whoOf(m.key.body2) === "imp"), rest = mf.filter(m => !impAll.includes(m)),
        impM = impAll.filter(m => typeof this.whoOf(m.key.body1) === "number" || typeof this.whoOf(m.key.body2) === "number");   // impactor ↔ runner only (impactor ↔ turf is outside the character)
      const rec = this._record(pre, S1, rest); this._extLedger(rec, pre, S1, ext, impM); rec.act = this._actRows(); rec.passive = this._passiveRows(); if (this.law) rec.law = this.law.info(); if (this.imp) rec.imp = this.readImp();
      this.recs.push(rec); this.cpu.measure += now() - t0; }
    this.prev = S1; return true;
  }
  // passive tissue torque per runner joint axis this step: the joint's own motor rows carry ONLY passive tissue (sim/v2_passive.js) — exact readback
  // (λ/dt, constraint axes); the explicit-pair remainder of −∇U (none mid-range) is not included
  _passiveRows() { const c = this.runner; return c.spec.joints.map((j, k) => this.w.lambdaMotor(c.kOff + k).map(l => +(l / this.dt).toFixed(5))); }
  _actRows() { const c = this.runner; return (c.actRes || []).map(r => [r.k, r.i, r.tau, r.cap, r.frac, r.sat ? 1 : 0, r.req, r.a[0], r.a[1]]); }
  // external impulse on the runner this step (validation disturbances only): impulse, moment about O, work (mid-step point velocity); ledger residuals corrected
  _extLedger(rec, pre, S1, ext, impM) { const h = this.dt, O = this.O, c = this.runner, e = { J: [0, 0, 0], H: [0, 0, 0], W: 0, imp: null }, vMid = (i, p) => V.sc(V.add(IL.velAt(pre.S[i], pre.S[i].com, p), IL.velAt(S1[i], S1[i].com, p)), 0.5);
    for (const x of ext) { if (x.F) { const Jx = V.sc(x.F, h); e.J = V.add(e.J, Jx); e.H = V.add(e.H, V.cross(V.sub(x.p, O), Jx)); e.W += V.dot(Jx, vMid(x.i, x.p)); }
      else { const [a, b] = x.pair, Tj = V.sc(x.T, h); e.W += V.dot(Tj, V.sub(V.sc(V.add(pre.S[b].w, S1[b].w), 0.5), V.sc(V.add(pre.S[a].w, S1[a].w), 0.5))); } }   // a pure couple pair: no net impulse / moment, work on the relative rotation
    if (impM.length) { e.imp = { J: [0, 0, 0], pts: [] }; for (const m of impM) { const w1 = this.whoOf(m.key.body1), onBody = w1 === "imp" ? this.whoOf(m.key.body2) : w1, sg = w1 === "imp" ? +1 : -1, Jb = V.sc(m.J2, sg);
        e.J = V.add(e.J, Jb); e.imp.J = V.add(e.imp.J, Jb); e.H = V.add(e.H, V.sc(m.momentAbout(O), sg)); for (const p of m.points) { e.W += sg * p.lam * V.dot(m.n, vMid(onBody, p.p)); e.imp.pts.push({ body: c.spec.bodies[onBody - c.bOff].name, p: p.p, lam: p.lam }); } }
      e.imp.state = this.readImp(); }
    const rc = rec.chars.runner; rc.ext = e; rc.linResRaw = rc.linRes; rc.angResRaw = rc.angRes; rc.energyResRaw = rc.energyRes;
    rc.linRes = V.sub(rc.linRes, e.J); rc.angRes = V.sub(rc.angRes, e.H); rc.energyRes = rc.energyRes - e.W; }
}

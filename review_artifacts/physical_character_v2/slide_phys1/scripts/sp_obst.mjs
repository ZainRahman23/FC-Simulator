// SLIDE-PHYS-1 Stage 2 plant: the solo tackler plant + simple rigid obstacles in the SAME Jolt world (never part of the character; no special
// rules). Obstacles are boxes (dynamic with a mass, or static) or static capsules; contact material "body" by the V2 listener's own rule for
// user data ≥ 2000 (obstacle|body μ 0.4, obstacle|turf 0.5). The step is Pvp0Plant.tick statement for statement, with two additions: the pre-step
// COM map includes the obstacles (so the contact-impulse reconstruction knows them), and every manifold involving an obstacle is split out of the
// character record and ledgered as an EXTERNAL impulse on the tackler (rec.obst; linear / angular momentum residuals corrected by it).
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, PL, IL } = L;
const TA = await import(PL.P2 + "tools/track_a_lib.mjs"), OBST_UD = 2000, L_MOVING = 1, L_STATIC = 0, now = () => performance.now();
export class ObstaclePlant extends L.SoloPlant {
  addObstacles(list) { const J = this.J, w = this.w; this.obst = [];
    list.forEach((o, k) => { const q = o.rot || [0, 0, 0, 1], shape = o.type === "capsule" ? new J.CapsuleShape(o.half, o.r, null) : new J.BoxShape(new J.Vec3(o.he[0], o.he[1], o.he[2]), 0.005, null);
      const dyn = o.mass > 0, bcs = new J.BodyCreationSettings(shape, new J.RVec3(o.pos[0], o.pos[1], o.pos[2]), new J.Quat(q[0], q[1], q[2], q[3]), dyn ? J.EMotionType_Dynamic : J.EMotionType_Static, dyn ? L_MOVING : L_STATIC);
      if (dyn) { bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; bcs.mMassPropertiesOverride.mMass = o.mass; }
      bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = 0; bcs.mAngularDamping = 0; bcs.mAllowSleeping = false; bcs.mUserData = OBST_UD + k; bcs.mApplyGyroscopicForce = true;
      const body = w.bi.CreateBody(bcs); w.bi.AddBody(body.GetID(), dyn ? J.EActivation_Activate : J.EActivation_DontActivate); J.destroy(bcs);
      this.obst.push({ k, o, body, id: body.GetID().GetIndexAndSequenceNumber(), dyn }); });
    this.obstIds = new Set(this.obst.map(x => x.id)); return this.obst; }
  readObst() { return (this.obst || []).map(x => { const b = x.body, p = b.GetCenterOfMassPosition(), r = b.GetRotation(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity();
    return { k: x.k, com: [p.GetX(), p.GetY(), p.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [w.GetX(), w.GetY(), w.GetZ()] }; }); }
  tick() {
    if (this.n >= this.maxSteps) return false;
    if (!this.activated && this.n >= this.activate) this._activate();
    let t0 = now(); for (const c of this.chars) { c.P.apply(c.up); c.act.apply(c.aplan); } this.cpu.passive += now() - t0;
    const ext = this._applyPerturb();
    let pre = null; if (this.instrument) { t0 = now(); const S = this.readAll(), map = {}; S.forEach((s, i) => { map[this.idOf[i]] = { com: s.com, rot: s.rot }; }); map[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] };
      const Ob = this.readObst(); (this.obst || []).forEach((x, i) => { map[x.id] = { com: Ob[i].com, rot: Ob[i].rot }; }); pre = { S, map, Ob }; this.cpu.instrument += now() - t0; }
    t0 = now(); this.w.step(this.dt, this.coll); this.cpu.step += now() - t0;
    let mf = [], om = []; if (this.instrument) { t0 = now(); const dec = TA.decodeContacts(TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_Contacts)); const all = IL.manifoldImpulses(dec, pre.map);
      for (const m of all) (this.obstIds && (this.obstIds.has(m.key.body1) || this.obstIds.has(m.key.body2)) ? om : mf).push(m); this.cpu.instrument += now() - t0; }
    this.n++; const S1 = this.readAll();
    t0 = now(); for (const c of this.chars) { const st0 = c.st; c.st = S1.slice(c.bOff, c.bOff + c.nb); const Dstep = c.P.dampingLoss(c.st, this.dt); c.Dstep = Dstep; c.Dcum += Dstep; c.actRes = c.act.after(st0, c.st, c.aplan); } this.cpu.act += now() - t0;
    if (this.law) { const t1 = now(); this.law.after(this.runner, this.runner.st, this.runner.actRes, this.n); this.cpu.law += now() - t1; }
    if (this.lawT) { const t1 = now(); this.lawT.after(this.tackler, this.tackler.st, this.tackler.actRes, this.n); this.cpu.lawT += now() - t1; }
    for (const c of this.chars) { let t1 = now(); c.up = c.P.compute(c.st, this.dt); this.cpu.passive += now() - t1; t1 = now(); const { cmd } = this.toneCmd(c, c.st, c.up.ev, this.n * this.dt); this.cpu.tone += now() - t1;
      t1 = now(); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, false); this.cpu.act += now() - t1; }
    if (this.instrument) { t0 = now(); const rec = this._record(pre, S1, mf); this._extLedger(rec, pre, S1, ext, []); rec.act = this._actRows(); rec.passive = this._passiveRows();
      if (this.lawT) { rec.lawT = this.lawT.info(); rec.actT = (this.tackler.actRes || []).map(r => [r.k, r.i, r.tau, r.cap, r.frac, r.sat ? 1 : 0, r.req, r.a[0], r.a[1]]); }
      rec.tacklerActive = this.activated;
      // obstacle manifolds: external impulses on the tackler (body2 +, body1 −), points, depth; the obstacle's own state
      const T = this.tackler, onT = (id) => { const i = this.idOf.indexOf(id); return i >= T.bOff && i < T.bOff + T.nb ? i : -1; }; let J = [0, 0, 0], H = [0, 0, 0]; const list = [];
      for (const m of om) { const i1 = onT(m.key.body1), i2 = onT(m.key.body2); if (i1 < 0 && i2 < 0) { list.push({ kind: "obst-world", Jn: m.points.reduce((s, p) => s + p.lam, 0) }); continue; }
        const sg = i2 >= 0 ? +1 : -1, bi = i2 >= 0 ? i2 : i1, Jb = V.sc(m.J2, sg); J = V.add(J, Jb); H = V.add(H, V.sc(m.momentAbout(this.O), sg));
        list.push({ kind: "obst-tackler", body: T.spec.bodies[bi - T.bOff].name, Jn: m.points.reduce((s, p) => s + p.lam, 0), J: Jb, n: m.n, points: m.points.map(p => ({ p: p.p, lam: p.lam, depth: V.dot(V.sub(p.p1, p.p2), m.n) })) }); }
      const ct = rec.chars.tackler; ct.obstJ = J; ct.linResRaw = ct.linRes; ct.angResRaw = ct.angRes; ct.linRes = V.sub(ct.linRes, J); ct.angRes = V.sub(ct.angRes, H); rec.obst = list; rec.obstState = this.readObst();
      this.recs.push(rec); this.cpu.measure += now() - t0; }
    this.prev = S1; return true; }
}

// IFM-1 plant + instrumentation (prereg §5–§9). The G2 plant constructed exactly as PI-1 REV2 / ITS-1 construct it (G2Sim, S0short, stand
// SLP_STAND, probes off, passive v2k) on the bound V2 world configuration (G2_WORLD: 240 Hz, 150 / 2, plane turf); entry = ONE pose and ONE velocity
// write per receiver body (28, counted); the experiment-only SnapshotTone adapter replaces the controller's commands (gains / statics from the bound
// PostureDriver, evaluated once); one diagnostic dynamic sphere (r 0.060 m, 10 kg, I 0.0144) created last; modes C0 / N / W / X. Nothing in
// physchar2 / REV2 / ITS-1 is modified: the contact listener's validate callback and the world's step are wrapped on THIS instance only.
import path from "path";
const L = await import(new URL("./ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, P2, RA } = L;
const { G2Sim, G2_SCENARIOS } = await import(P2 + "gates/v2_g2.js"), { SLP_STAND } = await import(P2 + "gates/v2_slp.js");
const { PostureDriver } = await import(path.join(RA, "pi1/rev2/scripts/pi1_rev2_sim.mjs"));
const TA = await import(P2 + "tools/track_a_lib.mjs"), { bootSole, hull2 } = await import(P2 + "sim/v2_geom.js");
const KEYS = ["x", "y", "z"], E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], GROUND_UD = 1000, IMP_UD = 2000, L_MOVING = 1, G = 9.81;
const now = () => performance.now();
export class IFM1Sim extends G2Sim {
  // entry: fixture entries[`${body}/${state}`]; imp: fixture fixtures[`${role}/${body}`] (placement; the C0 slot uses one role's placement); mode "C0" | "N" | "W" | "X"
  // opts: { wrench (W: per-body first-step wrench from N), O (fixed origin), instrument (default true), xFrom (X: snapshot) }
  constructor(J, spec, entry, imp, mode, opts = {}) {
    super(J, spec, { ...G2_SCENARIOS.S0short, seconds: IFM1.stepsTotal / 240 }, { probes: false, passiveOpts: { kneeModel: "v2k" }, stand: SLP_STAND });
    if (Math.abs(this.dt - IFM1.h) > 1e-15 || this.N !== IFM1.stepsTotal) throw new Error("plant timestep / horizon mismatch");
    this.mode = mode; this.entry = entry; this.impFix = imp; this.instrument = opts.instrument !== false; this.O = opts.O || entry.O; this.opts_wrench = opts.wrench || null;
    if (mode === "W" && !this.opts_wrench) throw new Error("W needs the N first-step wrench");
    this.B = spec.bodies; this.nbR = spec.bodies.length; this.bi = (n) => spec.bodies.findIndex(b => b.name === n);
    // ── the diagnostic impactor: created last (fixed creation order / ids); body-to-body material via the V2 listener (index −2 → "body") ──
    { const w = this.w, Jm = J, I = IFM1.impactor, sh = new Jm.SphereShapeSettings(I.r, null), shape = sh.Create().Get(), c = imp.centre;
      const bcs = new Jm.BodyCreationSettings(shape, new Jm.RVec3(c[0], c[1], c[2]), new Jm.Quat(0, 0, 0, 1), Jm.EMotionType_Dynamic, L_MOVING);
      bcs.mOverrideMassProperties = Jm.EOverrideMassProperties_MassAndInertiaProvided; bcs.mMassPropertiesOverride.mMass = I.m; const Im = Jm.Mat44.prototype.sIdentity();
      Im.SetAxisX(new Jm.Vec3(I.I, 0, 0)); Im.SetAxisY(new Jm.Vec3(0, I.I, 0)); Im.SetAxisZ(new Jm.Vec3(0, 0, I.I)); bcs.mMassPropertiesOverride.mInertia = Im;
      bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = w.cfg.linDamp; bcs.mAngularDamping = w.cfg.angDamp; bcs.mMaxAngularVelocity = w.cfg.maxAngVel; bcs.mAllowSleeping = w.cfg.allowSleep;
      bcs.mGravityFactor = 1; bcs.mUserData = IMP_UD; bcs.mApplyGyroscopicForce = !!w.cfg.gyroscopic;
      this.imp = w.bi.CreateBody(bcs); w.bi.AddBody(this.imp.GetID(), Jm.EActivation_Activate); Jm.destroy(bcs);
      this.impId = this.imp.GetID(); this.impWrites = 0; const t = w._t;
      w.bi.SetPositionAndRotation(this.impId, new Jm.RVec3(c[0], c[1], c[2]), new Jm.Quat(0, 0, 0, 1), Jm.EActivation_Activate); this.impWrites++;
      t.v.Set(imp.vImpactor[0], imp.vImpactor[1], imp.vImpactor[2]); w.bi.SetLinearVelocity(this.impId, t.v); t.v.Set(0, 0, 0); w.bi.SetAngularVelocity(this.impId, t.v); this.impWrites++; }
    // ── receiver–impactor pair switch through the engine's normal validate callback (C0 / W throughout; X after its restore) ──
    this.rejectPair = mode === "C0" || mode === "W"; { const w = this.w, Jm = J, self = this;
      w.listener.OnContactValidate = (b1p, b2p) => { if (!self.rejectPair) return Jm.ValidateResult_AcceptAllContactsForThisBodyPair;
        const u1 = Jm.wrapPointer(b1p, Jm.Body).GetUserData(), u2 = Jm.wrapPointer(b2p, Jm.Body).GetUserData(), isR = (u) => u >= 1 && u <= self.nbR;
        return (u1 === IMP_UD && isR(u2)) || (u2 === IMP_UD && isR(u1)) ? Jm.ValidateResult_RejectAllContactsForThisBodyPair : Jm.ValidateResult_AcceptAllContactsForThisBodyPair; }; }
    // ── body-id map for the contact-cache decode ──
    this.idOf = spec.bodies.map((_, i) => this.w.bodies[i].GetID().GetIndexAndSequenceNumber()); this.groundId = this.w.ground.GetID().GetIndexAndSequenceNumber(); this.impIdNum = this.impId.GetIndexAndSequenceNumber();
    this.whoOf = (id) => (id === this.groundId ? "turf" : id === this.impIdNum ? "impactor" : this.idOf.indexOf(id));
    // ── entry: one pose + one velocity write per receiver body (counted by G2Sim's authority wrapper) ──
    const w0 = this.ledger.authorityWrites; entry.write.poses.forEach((s, i) => { this.w.setPose(i, s.pos, s.rot); this.w.setVel(i, entry.write.vel[i].v, entry.write.vel[i].w); }); this.entryWrites = this.ledger.authorityWrites - w0;
    this.A = this._acc(); this.Dcum = 0;                                     // measurement accumulators start at entry (construction pose excluded)
    this.st = this.read(); this.up = this.P.compute(this.st, this.dt);
    // ── SnapshotTone: K / D / statics bias ONCE from the bound PostureDriver at the entry geometry with the initial support-role flags ──
    this.flags = [!!entry.flags.L, !!entry.flags.R]; this.pd = new PostureDriver(this.ctrl, spec); this.pd.setTargets(this.up.ev.qs); this.pd.wSt = this.flags.map(f => (f ? 1 : 0));
    const cmd0 = this.pd.compute(this.st, this.up.ev, this.dt, this.flags);
    this.tone = spec.joints.map((j, k) => ({ k, K: cmd0[k] ? cmd0[k].map(c => c.K) : null, D: cmd0[k] ? cmd0[k].map(c => c.D) : null, bias: cmd0[k] ? cmd0[k].map(c => c.ff) : null,
      a0: entry.snapshotTone.coords[k].a0, ad: entry.snapshotTone.coords[k].adot0, F1: j.F1, F2: j.F2, parent: j.parentIndex, child: j.childIndex }));
    this.cmdLog = []; this.cpu3 = { tone: 0, instrument: 0 };
    // ── instrumentation: wrap this instance's step (pre-step COM transforms, contact cache after the step) ──
    this.joltSteps = 0; this.recs = []; this.injected = null; const step0 = this.w.step.bind(this.w);
    this.w.step = (dt, cs) => { const t0 = now(); this._preStep(); this.cpu3.instrument += now() - t0; step0(dt, cs); this.joltSteps++; const t1 = now(); this._postStep(); this.cpu3.instrument += now() - t1; };
    this._ctrl(true); this._measure(); this.E0 = this.last.E; this.rec0 = this.instrument ? this._snapState() : null;
  }
  _sense() { return { Fz: [0, 0], touch: [0, 0] }; }                     // probes off (as ITS-1)
  // impactor contacts never reach the G1 receiver bookkeeping (G1 indexes spec bodies only); receiver–impactor contacts are kept as obstacle contacts
  _contacts(C) { this.allContacts = C; return super._contacts(C.filter(c => !((c.a === -2 && c.b === -1) || (c.a === -1 && c.b === -2)))); }
  // ── SnapshotTone (§6.4): a_ref(t) = a0 + ȧ0·t; τ0 = bias + K·err + (D + h·K)·ω_ref (ω_ref transported into the actual actuator axes) ──
  toneCmd(st, ev, t) {
    const cmd = [], log = [];
    for (const T of this.tone) { if (!T.K) { cmd[T.k] = null; continue; }
      const a = T.a0.map((x, i) => x + T.ad[i] * t), qr = L.pyr(a[0], a[1], a[2]), wb = L.mat3vec(L.pyrJac(a), T.ad);   // target rotation and body-frame target ω (exact Jacobian)
      const R1 = st[T.parent].rot, R2F2 = Q.mul(st[T.child].rot, T.F2), axW = E3.map(e => Q.rot(R2F2, e));
      const wTargetWorld = Q.rot(Q.mul(Q.mul(R1, T.F1), qr), wb), wRef = axW.map(ax => V.dot(wTargetWorld, ax));
      const q = ev.qs[T.k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      cmd[T.k] = KEYS.map((_, i) => ({ K: T.K[i], D: T.D[i], tau0: T.bias[i] + T.K[i] * err[i] + (T.D[i] + this.dt * T.K[i]) * wRef[i] }));
      if (this.instrument) log.push({ k: T.k, err, wRef, tau0: cmd[T.k].map(c => c.tau0) }); }
    return { cmd, log };
  }
  _ctrl(init) { if (!this.tone) return super._ctrl(init); const t0 = now(), { cmd, log } = this.toneCmd(this.st, this.up.ev, this.n * this.dt); this.cpu3.tone += now() - t0;
    const t1 = now(); this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); this.cpu2.act += now() - t1; this.lastCmd = cmd; if (this.instrument) this.cmdLog.push({ n: this.n, init, log }); }
  // ── W: the recorded first-step per-body wrench once, immediately before the first physics step, through impulse APIs ──
  _disturb() { const out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 };
    if (this.mode === "W" && this.n === 0 && this.opts_wrench) { const J = this.J, w = this.w, t = w._t, pre = this.read(), ke0 = this._keR(pre);
      for (const x of this.opts_wrench.bodies) { const i = x.i; t.v.Set(x.J[0], x.J[1], x.J[2]); w.bi.AddImpulse(w.bodies[i].GetID(), t.v); const ang = V.sub(x.H_O, V.cross(V.sub(pre[i].com, this.O), x.J)); t.v.Set(ang[0], ang[1], ang[2]); w.bi.AddAngularImpulse(w.bodies[i].GetID(), t.v); }
      const post = this.read(); this.injected = { bodies: this.opts_wrench.bodies, workJ: this._keR(post) - ke0, preKE: ke0, postKE: this._keR(post), J: this.opts_wrench.bodies.reduce((s, x) => V.add(s, x.J), [0, 0, 0]), H_O: this.opts_wrench.bodies.reduce((s, x) => V.add(s, x.H_O), [0, 0, 0]) }; }
    return out; }
  _keR(S) { return S.reduce((s, b, i) => { const I = L.MC.Iworld(b.rot, this.B[i].inertia); return s + 0.5 * this.B[i].mass * V.dot(b.v, b.v) + 0.5 * V.dot(b.w, L.mat3vec(I, b.w)); }, 0); }
  readImp() { const b = this.imp, p = b.GetPosition(), r = b.GetRotation(), c = b.GetCenterOfMassPosition(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity();
    return { pos: [p.GetX(), p.GetY(), p.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], com: [c.GetX(), c.GetY(), c.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [w.GetX(), w.GetY(), w.GetZ()] }; }
  _snapState() { const S = this.read(), imp = this.readImp(); return { S, imp }; }
  _preStep() { if (!this.instrument) return; const S = this.read(), imp = this.readImp(), pre = {};
    S.forEach((s, i) => { pre[this.idOf[i]] = { com: s.com, rot: s.rot }; }); pre[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] }; pre[this.impIdNum] = { com: imp.com, rot: imp.rot };
    this._pre0 = { S, imp, map: pre }; }
  _postStep() { if (!this.instrument) return; const J = this.J, bytes = TA.saveState(J, this.w.ps, J.EStateRecorderState_Contacts), dec = TA.decodeContacts(bytes);
    this._mf = L.manifoldImpulses(dec, this._pre0.map); }
  // ── per-step record (after G2Sim.tick: state, ledgers, contacts, integrity) ──
  tick() {
    const A0 = this.instrument ? { eng: this._engTicks(), oc: this._overCap() } : null, Eprev = this.last.E, Dprev = this.Dcum;
    const ok = super.tick(); if (!ok) return false; if (!this.instrument) return true;
    const pre = this._pre0, S1 = this.st, imp1 = this.readImp(), O = this.O, h = this.dt, B = this.B, rec = { n: this.n, t: this.n * h };
    // contact impulses per receiver body (+ on body2, − on body1) and on the impactor; classified ground / opponent / self
    const onR = B.map(() => ({ J: [0, 0, 0], H: [0, 0, 0] })), ground = B.map(() => ({ J: [0, 0, 0], Jn: 0, n: 0 })), opp = B.map(() => ({ J: [0, 0, 0], H: [0, 0, 0], W: 0 })), impJ = { J: [0, 0, 0], H: [0, 0, 0] }, list = [];
    let selfMaxDepth = 0;
    for (const m of this._mf) { const w1 = this.whoOf(m.key.body1), w2 = this.whoOf(m.key.body2), H2 = m.momentAbout(O), sub1 = m.key.sub1, sub2 = m.key.sub2;
      const Jtot = m.J2, Jn = m.points.reduce((s, p) => s + p.lam, 0);
      const add = (who, sign) => { if (typeof who !== "number") return; onR[who].J = V.add(onR[who].J, V.sc(Jtot, sign)); onR[who].H = V.add(onR[who].H, V.sc(H2, sign)); };
      add(w1, -1); add(w2, +1);
      const kind = (w1 === "turf" || w2 === "turf") ? ((w1 === "impactor" || w2 === "impactor") ? "impactor-turf" : "ground") : (w1 === "impactor" || w2 === "impactor") ? "opponent" : "self";
      const rB = typeof w1 === "number" && typeof w2 !== "number" ? w1 : typeof w2 === "number" && typeof w1 !== "number" ? w2 : null, sR = rB === w1 ? -1 : +1;
      if (kind === "ground" && rB != null) { ground[rB].J = V.add(ground[rB].J, V.sc(Jtot, sR)); ground[rB].Jn += Jn; ground[rB].n++; }
      if (kind === "opponent" && rB != null) { opp[rB].J = V.add(opp[rB].J, V.sc(Jtot, sR)); opp[rB].H = V.add(opp[rB].H, V.sc(H2, sR));
        // opponent work on the receiver body: impulses × mean point velocity (pre / post step) — the validated ledger's external-work form (F · v_mid · dt)
        const vm = (p) => V.sc(V.add(L.velAt(pre.S[rB], pre.S[rB].com, p), L.velAt(S1[rB], S1[rB].com, p)), 0.5), wm = V.sc(V.add(pre.S[rB].w, S1[rB].w), 0.5);
        let W = m.points.reduce((s, p) => s + sR * p.lam * V.dot(m.n, vm(p.p)), 0); if (m.frictionPoint) W += sR * V.dot(m.Jf, vm(m.frictionPoint)); W += sR * V.dot(m.couple2, wm); opp[rB].W += W;
        const iSign = w1 === "impactor" ? -1 : +1; impJ.J = V.add(impJ.J, V.sc(Jtot, iSign)); impJ.H = V.add(impJ.H, V.sc(H2, iSign)); }
      if (kind === "self") selfMaxDepth = Math.max(selfMaxDepth, ...m.points.map(p => V.dot(V.sub(p.p1, p.p2), m.n)));
      if (this.recordContacts !== false) list.push({ kind, a: w1, b: w2, sub1, sub2, n: m.n, Jn, J2: Jtot, points: m.points.map(p => ({ p: p.p, lam: p.lam, depth: V.dot(V.sub(p.p1, p.p2), m.n) })), friction: m.frictionPoint ? { at: m.frictionPoint, J: m.Jf } : null, angFriction: m.angFriction }); }
    // momentum / angular momentum about the fixed origin O; closure against gravity + measured contact impulses + declared wrench (+ position-correction term)
    const P = (S) => S.reduce((s, b, i) => V.add(s, V.sc(b.v, B[i].mass)), [0, 0, 0]), LO = (S) => S.reduce((s, b, i) => V.add(s, V.add(V.cross(V.sub(b.com, O), V.sc(b.v, B[i].mass)), L.mat3vec(L.MC.Iworld(b.rot, B[i].inertia), b.w))), [0, 0, 0]);
    const Spre = this._stPreStep || pre.S, M = B.reduce((s, b) => s + b.mass, 0), grav = [0, -G * M * h, 0], gravH = Spre.reduce((s, b, i) => V.add(s, V.cross(V.sub(b.com, O), [0, -G * B[i].mass * h, 0])), [0, 0, 0]);
    const Jc = onR.reduce((s, x) => V.add(s, x.J), [0, 0, 0]), Hc = onR.reduce((s, x) => V.add(s, x.H), [0, 0, 0]), inj = this.n === 1 && this.injected ? this.injected : null;
    const pcTerm = S1.reduce((s, b, i) => { const dx = V.sub(b.com, V.add(pre.S[i].com, V.sc(b.v, h))); return V.add(s, V.cross(dx, V.sc(b.v, B[i].mass))); }, [0, 0, 0]);
    const P0 = P(this._prevS || this.rec0.S), P1 = P(S1), L0 = LO(this._prevS || this.rec0.S), L1 = LO(S1);
    rec.P = P1; rec.L_O = L1; rec.linRes = V.sub(V.sub(P1, P0), V.add(V.add(grav, Jc), inj ? inj.J : [0, 0, 0])); rec.angRes = V.sub(V.sub(L1, L0), V.add(V.add(V.add(gravH, Hc), inj ? inj.H_O : [0, 0, 0]), pcTerm)); rec.angPosCorrTerm = pcTerm;
    // combined receiver + impactor (their mutual contact is internal)
    const Pi = (s) => V.sc(s.v, IFM1.impactor.m), Li = (s) => V.add(V.cross(V.sub(s.com, O), V.sc(s.v, IFM1.impactor.m)), V.sc(s.w, IFM1.impactor.I));
    const imp0 = this._prevImp || this.rec0.imp, gravI = [0, -G * IFM1.impactor.m * h, 0], gravIH = V.cross(V.sub(imp0.com, O), gravI);
    const JiTurf = list.filter(c => c.kind === "impactor-turf").reduce((s, c) => V.add(s, V.sc(c.J2, c.a === "impactor" ? -1 : 1)), [0, 0, 0]);
    const HiTurf = this._mf.filter(m => { const a = this.whoOf(m.key.body1), b = this.whoOf(m.key.body2); return (a === "impactor" && b === "turf") || (a === "turf" && b === "impactor"); }).reduce((s, m) => V.add(s, V.sc(m.momentAbout(O), this.whoOf(m.key.body1) === "impactor" ? -1 : 1)), [0, 0, 0]);
    const JgR = ground.reduce((s, x) => V.add(s, x.J), [0, 0, 0]), pcImp = V.cross(V.sub(imp1.com, V.add(imp0.com, V.sc(imp1.v, h))), V.sc(imp1.v, IFM1.impactor.m));
    rec.combinedLinRes = V.sub(V.sub(V.add(P1, Pi(imp1)), V.add(P0, Pi(imp0))), V.add(V.add(V.add(grav, gravI), V.add(JgR, JiTurf)), inj ? inj.J : [0, 0, 0]));
    { const Hg = this._mf.filter(m => { const a = this.whoOf(m.key.body1), b = this.whoOf(m.key.body2); return (a === "turf" && typeof b === "number") || (b === "turf" && typeof a === "number"); }).reduce((s, m) => V.add(s, V.sc(m.momentAbout(O), this.whoOf(m.key.body1) === "turf" ? 1 : -1)), [0, 0, 0]);
      rec.combinedAngRes = V.sub(V.sub(V.add(L1, Li(imp1)), V.add(L0, Li(imp0))), V.add(V.add(V.add(V.add(gravH, gravIH), Hg), HiTurf), V.add(V.add(pcTerm, pcImp), inj ? inj.H_O : [0, 0, 0]))); }
    // energy (the V2 ledger: E = KE + PE + passive U; ΔE − (W_act + W_ext − D)); W_ext = opponent work (N), injected work (W), 0 (C0)
    const Wact = (this.actRes || []).reduce((s, r) => s + r.W, 0), Dst = this.Dcum - Dprev, Wopp = opp.reduce((s, x) => s + x.W, 0), Wext = Wopp + (inj ? inj.workJ : 0);   // opponent work exists only while the pair is enabled
    rec.E = this.last.E; rec.Wact = Wact; rec.D = Dst; rec.Wext = Wext; rec.Wopp = Wopp; rec.energyRes = (this.last.E - Eprev) - (Wact + Wext - Dst);
    const Eimp = (s) => 0.5 * IFM1.impactor.m * V.dot(s.v, s.v) + 0.5 * IFM1.impactor.I * V.dot(s.w, s.w) + IFM1.impactor.m * G * s.com[1];
    rec.Eimp = Eimp(imp1); rec.combinedEnergyRes = (this.last.E + Eimp(imp1) - Eprev - Eimp(imp0)) - (Wact - Dst + (inj ? inj.workJ : 0));
    // integrity (G1 per-tick values) and actuators
    rec.integrity = { finite: S1.every(b => b.pos.concat(b.rot, b.v, b.w).every(Number.isFinite)) && imp1.pos.concat(imp1.v).every(Number.isFinite), anchorSepMm: this.last.sepMax * 1000, turfPenMm: this.last.pen * 1000, hardExcDeg: this.last.hardExc * 180 / Math.PI,
      selfPenMm: Math.max(0, selfMaxDepth) * 1000, engineStopTicks: this._engTicks() - A0.eng, posCorrMaxMm: this.A.inv ? this.A.inv.pcMaxMm : null, authorityWritesTotal: this.ledger.authorityWrites, overCap: this._overCap() - A0.oc };
    rec.act = (this.actRes || []).map(r => ({ k: r.k, i: r.i, tau: r.tau, req: r.req, cap: r.cap, frac: r.frac, sat: r.sat, a: r.a }));
    rec.ground = ground.map((g, i) => ({ body: B[i].name, J: g.J, Jn: g.Jn, manifolds: g.n })).filter(x => x.manifolds > 0);
    rec.opponent = opp.map((x, i) => ({ body: B[i].name, i, J: x.J, H_O: x.H, W: x.W })).filter(x => V.len(x.J) > 0 || x.W !== 0);
    rec.impactorImpulse = impJ; rec.contacts = list; rec.S = S1.map(b => ({ pos: b.pos, rot: b.rot, com: b.com, v: b.v, w: b.w })); rec.imp = imp1;
    rec.hashR = L.hashNums([].concat(...S1.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]), this.act.state()));   // receiver only (C0 placement-independence check)
    rec.hash = L.hashNums([].concat(...S1.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]), imp1.pos, imp1.rot, imp1.v, imp1.w, this.act.state(), ...this.cmdLog.length ? this.cmdLog[this.cmdLog.length - 1].log.flatMap(x => x.tau0) : []));
    this._prevS = S1; this._prevImp = imp1; this.recs.push(rec); return true;
  }
  _engTicks() { let s = 0; for (const ax of this.A.axis) for (const x of ax) if (x) s += x.engineTicks; return s; }
  _overCap() { let s = 0; for (const r of this.act.led) for (const x of r) if (x) s += x.overCap; return s; }   // ActuatorLayer's own capacity-integrity counter
  // full snapshot for X (Jolt state incl. contacts + plant / adapter / measurement state)
  snapshotAll() { const g = this.snapshot(); return { g, jolt: TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_All), A: structuredClone(this.A), ledger: structuredClone(this.ledger), Dcum: this.Dcum, last: structuredClone(this.last), h: this.h, recs: this.recs.length,
    prevS: structuredClone(this._prevS), prevImp: structuredClone(this._prevImp), cmdLog: this.cmdLog.length, aplan: structuredClone(this.aplan), up: this.up, lastCmd: structuredClone(this.lastCmd), actRes: structuredClone(this.actRes), cpu: null }; }
  restoreAll(s) { TA.restoreState(this.J, this.w.ps, s.jolt); this.act.setState(s.g.act); this.n = s.g.n; this.h = s.h; this.up = { ...s.g.up, applied: false }; this.aplan = structuredClone(s.aplan); this.aplan.applied = false; this.st = structuredClone(s.g.st);
    this.A = structuredClone(s.A); this.ledger = structuredClone(s.ledger); this.Dcum = s.Dcum; this.last = structuredClone(s.last); this.recs.length = s.recs; this.cmdLog.length = s.cmdLog; this._prevS = structuredClone(s.prevS); this._prevImp = structuredClone(s.prevImp);
    this.lastCmd = structuredClone(s.lastCmd); this.actRes = structuredClone(s.actRes); this.w.contacts = []; }
}
// helper: the first-step per-body receiver–impactor wrench of an N record (prereg §7 W)
export function firstStepWrench(rec) { return { bodies: rec.opponent.map(x => ({ i: x.i, body: x.body, J: x.J, H_O: x.H_O })), impactor: rec.impactorImpulse }; }

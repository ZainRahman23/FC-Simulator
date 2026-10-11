// DIAGNOSTIC COPY of scripts/pvp1a_sim.mjs (post-hoc diagnostics only; NOT used by PVP-1A-DX run 1). Added options: order 'TR' (tackler created first),
// velSteps / posSteps (solver velocity / position iterations). Everything else is byte-for-byte the frozen plant.
// PVP-1A two-character plant (prereg §3; used by PVP-1A-DX). ONE unmodified V2JoltWorld built from the combined spec (runner 0…13, tackler 14…27;
// disabled pairs within a character only; every cross-character pair collides); per character its OWN unmodified PassiveLayer (v2k), ActuatorLayer,
// StandController (SLP_STAND, model only) and PostureDriver, each driving its own joints / bodies through an index-offset view of the shared world;
// IFM-1's SnapshotTone per character (K, D, statics once at entry; flags runner (1, 1), tackler (0, 0)). Per step, G2Sim's own order: both characters
// apply their passive + actuator plans → ONE world step → read → damping loss + actuator after-step → passive compute + tone command + actuator compute
// → measurement. Instrumentation: the post-step contact cache decoded with the pre-step COM transforms (IFM-1), per-character and system ledgers.
// Nothing in physchar2 / IFM-1 / REV2 is modified; the listener's validate callback is overridden on THIS world only (C0 / X2 cross-pair rejection).
import path from "path";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC, P2, RA } = PL;
const { V2JoltWorld } = await import(P2 + "core/v2_jolt.js"), { G1_WORLD } = await import(P2 + "gates/v2_g1.js");
const { PassiveLayer } = await import(P2 + "sim/v2_passive.js"), { ActuatorLayer } = await import(P2 + "sim/v2_actuation.js");
const { StandController } = await import(P2 + "ctrl/v2_stand.js"), { solveStance, STANCE } = await import(P2 + "ctrl/v2_stance.js"), { SLP_STAND } = await import(P2 + "gates/v2_slp.js");
const { PostureDriver } = await import(path.join(RA, "pi1/rev2/scripts/pi1_rev2_sim.mjs")), TA = await import(P2 + "tools/track_a_lib.mjs");
const KEYS = ["x", "y", "z"], E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], G = 9.81, D2R = Math.PI / 180, now = () => performance.now();
const clone = (x) => structuredClone(x);
export class PvpPlant {
  // entries: { runner: { poses, vel }, tackler: { poses, vel } } (local frame); flags: { runner: {L, R}, tackler: {L, R} }; mode "C0" | "N2"
  // opts: { O (fixed origin), instrument (default true), solo: null | "runner" | "tackler" (isolation check: one character, same code) }
  constructor(J, entries, flags, mode, opts = {}) {
    this.J = J; this.mode = mode; this.instrument = opts.instrument !== false; this.dt = PV.h; this.O = opts.O; this.solo = opts.solo || null;
    const sR = PL.SPEC_R(), sT = PL.SPEC_T(), roles = this.solo ? [this.solo] : opts.order === "TR" ? ["tackler", "runner"] : ["runner", "tackler"], specOf = { runner: sR, tackler: sT };
    const comb = this.solo ? specOf[this.solo] : opts.order === "TR" ? PL.combine(sT, sR) : PL.combine(sR, sT); this.comb = comb;
    // the world exactly as G1Sim / G2Sim build it (G1_WORLD + actuators, gravity −9.81, the spec's own contact configuration)
    this.w = new V2JoltWorld(J, comb, { ...comb.contact }, { velSteps: opts.velSteps || G1_WORLD.velSteps, posSteps: opts.posSteps || G1_WORLD.posSteps, ccd: G1_WORLD.ccd, gravity: -G, recordContacts: true, actuators: true });
    this.coll = G1_WORLD.coll; if (Math.abs(1 / G1_WORLD.hz - this.dt) > 1e-15) throw new Error("timestep");
    let bOff = 0, kOff = 0; this.chars = roles.map(role => { const spec = specOf[role], c = { role, spec, bOff, kOff, nb: spec.bodies.length, M: spec.bodies.reduce((s, b) => s + b.mass, 0) };
      c.view = PL.worldView(this.w, bOff, kOff); c.P = new PassiveLayer(spec, c.view, { enabled: true, couplings: true, kneeModel: "v2k" }); c.act = new ActuatorLayer(spec, c.view, c.P, {});
      c.stance = solveStance(spec, { ...STANCE }); c.ctrl = new StandController(spec, c.P, c.stance, { probes: false, passiveOpts: { kneeModel: "v2k" }, stand: SLP_STAND });
      c.anchors = spec.joints.map(j => ({ p: V.sub(j.at, spec.bodies[j.parentIndex].origin), c: V.sub(j.at, spec.bodies[j.childIndex].origin) }));
      c.footI = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n)); bOff += c.nb; kOff += spec.joints.length; return c; });
    this.nbAll = bOff; this.roleOfBody = (i) => this.chars.find(c => i >= c.bOff && i < c.bOff + c.nb);
    // ── entry: one pose + one velocity write per body (counted) ──
    this.writes = 0; for (const c of this.chars) entries[c.role].poses.forEach((s, i) => { this.w.setPose(c.bOff + i, s.pos, s.rot); this.w.setVel(c.bOff + i, entries[c.role].vel[i].v, entries[c.role].vel[i].w); this.writes += 2; });
    // ── cross-character rejection through the listener's validate callback (C0 throughout; X2 after its restore) ──
    this.rejectCross = mode === "C0"; { const Jm = J, self = this, nR = this.chars[0].nb; this.w.listener.OnContactValidate = (b1p, b2p) => { if (!self.rejectCross || self.solo) return Jm.ValidateResult_AcceptAllContactsForThisBodyPair;
      const u1 = Jm.wrapPointer(b1p, Jm.Body).GetUserData(), u2 = Jm.wrapPointer(b2p, Jm.Body).GetUserData(), side = (u) => (u >= 1 && u <= nR ? 1 : u > nR && u <= self.nbAll ? 2 : 0), s1 = side(u1), s2 = side(u2);
      return s1 && s2 && s1 !== s2 ? Jm.ValidateResult_RejectAllContactsForThisBodyPair : Jm.ValidateResult_AcceptAllContactsForThisBodyPair; }; }
    this.idOf = []; for (let i = 0; i < this.nbAll; i++) this.idOf.push(this.w.bodies[i].GetID().GetIndexAndSequenceNumber()); this.groundId = this.w.ground.GetID().GetIndexAndSequenceNumber();
    this.whoOf = (id) => (id === this.groundId ? "turf" : this.idOf.indexOf(id));
    // ── SnapshotTone per character (IFM-1 construction): K / D / statics once from PostureDriver at the entry geometry with the support flags ──
    this.n = 0; this.recs = []; this.cpu = { step: 0, passive: 0, act: 0, tone: 0, instrument: 0, measure: 0 };
    const Sall = this.readAll(); this.S0 = Sall;
    for (const c of this.chars) { c.st = Sall.slice(c.bOff, c.bOff + c.nb); c.up = c.P.compute(c.st, this.dt); c.flags = [!!flags[c.role].L, !!flags[c.role].R];
      c.pd = new PostureDriver(c.ctrl, c.spec); c.pd.setTargets(c.up.ev.qs); c.pd.wSt = c.flags.map(f => (f ? 1 : 0)); const cmd0 = c.pd.compute(c.st, c.up.ev, this.dt, c.flags), E = entries[c.role].poses, Vv = entries[c.role].vel;
      c.tone = c.spec.joints.map((j, k) => { const wr = V.sub(Vv[j.childIndex].w, Vv[j.parentIndex].w); if (V.len(wr) > 1e-9) throw new Error("entry has relative joint rates: ȧ0 ≠ 0 is outside the frozen design");
        return { k, K: cmd0[k] ? cmd0[k].map(x => x.K) : null, D: cmd0[k] ? cmd0[k].map(x => x.D) : null, bias: cmd0[k] ? cmd0[k].map(x => x.ff) : null, a0: IL.coordsOf(IL.qcs(j, E[j.parentIndex].rot, E[j.childIndex].rot)), ad: [0, 0, 0], F1: j.F1, F2: j.F2, parent: j.parentIndex, child: j.childIndex }; });
      c.Dcum = 0; c.actRes = []; c.overCap0 = this._overCap(c); c.engCount = 0;
      const { cmd } = this.toneCmd(c, c.st, c.up.ev, 0); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, true); c.E = this._energy(c, c.st); c.E0 = c.E; }
    this.prev = Sall; this.entryMeasure = this.instrument ? this._measureChars(Sall, []) : null;
  }
  readAll() { const o = []; for (let i = 0; i < this.nbAll; i++) o.push(this.w.read(i)); return o; }
  _overCap(c) { let s = 0; for (const r of c.act.led) for (const x of r) if (x) s += x.overCap; return s; }
  // ── SnapshotTone (IFM-1 §6.4, unchanged): a_ref = a0 + ȧ0·t; τ0 = bias + K·err + (D + h·K)·ω_ref ──
  toneCmd(c, st, ev, t) { const cmd = [];
    for (const T of c.tone) { if (!T.K) { cmd[T.k] = null; continue; }
      const a = T.a0.map((x, i) => x + T.ad[i] * t), qr = IL.pyr(a[0], a[1], a[2]), wb = IL.mat3vec(IL.pyrJac(a), T.ad);
      const R1 = st[T.parent].rot, R2F2 = Q.mul(st[T.child].rot, T.F2), axW = E3.map(e => Q.rot(R2F2, e)), wTargetWorld = Q.rot(Q.mul(Q.mul(R1, T.F1), qr), wb), wRef = axW.map(ax => V.dot(wTargetWorld, ax));
      const q = ev.qs[T.k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      cmd[T.k] = KEYS.map((_, i) => ({ K: T.K[i], D: T.D[i], tau0: T.bias[i] + T.K[i] * err[i] + (T.D[i] + this.dt * T.K[i]) * wRef[i] })); }
    return { cmd }; }
  _energy(c, S) { let ke = 0, pe = 0; S.forEach((s, i) => { const b = c.spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia, Iw = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]);
    ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * V.dot(wl, Iw); pe += b.mass * G * s.com[1]; }); return ke + pe + (c.P.enabled ? c.up.U : 0); }
  // ── one step ──
  tick() {
    if (this.n >= PV.steps) return false;
    let t0 = now(); for (const c of this.chars) { c.P.apply(c.up); c.act.apply(c.aplan); } this.cpu.passive += now() - t0;
    let pre = null; if (this.instrument) { t0 = now(); const S = this.readAll(), map = {}; S.forEach((s, i) => { map[this.idOf[i]] = { com: s.com, rot: s.rot }; }); map[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] }; pre = { S, map }; this.cpu.instrument += now() - t0; }
    t0 = now(); this.w.step(this.dt, this.coll); this.cpu.step += now() - t0;
    let mf = []; if (this.instrument) { t0 = now(); const dec = TA.decodeContacts(TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_Contacts)); mf = IL.manifoldImpulses(dec, pre.map); this.cpu.instrument += now() - t0; }
    this.n++; const S1 = this.readAll();
    t0 = now(); for (const c of this.chars) { const st0 = c.st; c.st = S1.slice(c.bOff, c.bOff + c.nb); const Dstep = c.P.dampingLoss(c.st, this.dt); c.Dstep = Dstep; c.Dcum += Dstep; c.actRes = c.act.after(st0, c.st, c.aplan); } this.cpu.act += now() - t0;
    for (const c of this.chars) { let t1 = now(); c.up = c.P.compute(c.st, this.dt); this.cpu.passive += now() - t1; t1 = now(); const { cmd } = this.toneCmd(c, c.st, c.up.ev, this.n * this.dt); this.cpu.tone += now() - t1;
      t1 = now(); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, false); this.cpu.act += now() - t1; }
    if (this.instrument) { t0 = now(); this.recs.push(this._record(pre, S1, mf)); this.cpu.measure += now() - t0; }
    this.prev = S1; return true;
  }
  // per-character G1-equivalent measurement (gates/v2_g1.js _measure definitions: anchors, hard-limit excess, engine-stop contact, turf penetration)
  _measureChars(S, mf) { const out = {};
    for (const c of this.chars) { const st = S.slice(c.bOff, c.bOff + c.nb), ev = c.up.ev, spec = c.spec; let sepMax = 0, hardExc = 0, eng = 0, pen = 0, penBody = null;
      spec.joints.forEach((j, k) => { const a = c.anchors[k], pP = V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, a.p)), pC = V.add(st[j.childIndex].pos, Q.rot(st[j.childIndex].rot, a.c)); sepMax = Math.max(sepMax, V.dist(pP, pC));
        const per = ev.per[k]; for (let i = 0; i < 3; i++) { if (j.locked.includes(KEYS[i])) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : j.limits.hard.lo[i], hi = hT ? hT[1] : j.limits.hard.hi[i], m = Math.min(th - lo, hi - th);
          const El = j.limits.engine || j.limits.hard, me = Math.min(th - El.lo[i], El.hi[i] - th); if (me < PV.integrity.engineMarginDeg * D2R) eng++; if (-m > hardExc) hardExc = -m; } });
      spec.bodies.forEach((b, i) => { const l = PL.bodyLowest(b, st[i]); if (-l.y > pen) { pen = -l.y; penBody = b.name; } });
      out[c.role] = { sepMaxMm: sepMax * 1000, hardExcDeg: hardExc / D2R, engineAxes: eng, turfPenMm: pen * 1000, turfPenBody: penBody, finite: st.every(s => [...s.pos, ...s.rot, ...s.v, ...s.w].every(Number.isFinite)), maxSpeed: Math.max(...st.map(s => V.len(s.v))) }; }
    return out; }
  _record(pre, S1, mf) {
    const h = this.dt, O = this.O, rec = { n: this.n, t: this.n * h, tau: PV.tauAct + this.n / 4 }, list = [];
    const ext = {}; for (const c of this.chars) ext[c.role] = { Jturf: [0, 0, 0], Hturf: [0, 0, 0], Jcross: [0, 0, 0], Hcross: [0, 0, 0], Wcross: 0, feet: { L: 0, R: 0 }, nonFootTurf: [], selfPen: 0 };
    let crossPen = 0;
    for (const m of mf) { const w1 = this.whoOf(m.key.body1), w2 = this.whoOf(m.key.body2), H2 = m.momentAbout(O), Jn = m.points.reduce((s, p) => s + p.lam, 0), c1 = typeof w1 === "number" ? this.roleOfBody(w1) : null, c2 = typeof w2 === "number" ? this.roleOfBody(w2) : null;
      const depth = Math.max(...m.points.map(p => V.dot(V.sub(p.p1, p.p2), m.n)));
      const kind = w1 === "turf" || w2 === "turf" ? "turf-" + (c1 || c2).role : c1.role === c2.role ? "self-" + c1.role : "cross";
      const local = (w, c) => (c ? c.spec.bodies[w - c.bOff].name : "turf");
      if (kind.startsWith("turf")) { const c = c1 || c2, b = c1 ? w1 : w2, sg = c1 ? -1 : +1, e = ext[c.role]; e.Jturf = V.add(e.Jturf, V.sc(m.J2, sg)); e.Hturf = V.add(e.Hturf, V.sc(H2, sg)); const nm = local(b, c);
        if (nm === "foot_L") e.feet.L += Jn; else if (nm === "foot_R") e.feet.R += Jn; else if (Jn > 0 || depth > PV.oc.nonFootDepthMm / 1000) e.nonFootTurf.push(nm); }
      else if (kind === "cross") { crossPen = Math.max(crossPen, depth);
        for (const [w, c, sg] of [[w1, c1, -1], [w2, c2, +1]]) { const e = ext[c.role], i = w; e.Jcross = V.add(e.Jcross, V.sc(m.J2, sg)); e.Hcross = V.add(e.Hcross, V.sc(H2, sg));
          const vm = (p) => V.sc(V.add(IL.velAt(pre.S[i], pre.S[i].com, p), IL.velAt(S1[i], S1[i].com, p)), 0.5), wm = V.sc(V.add(pre.S[i].w, S1[i].w), 0.5);
          let W = m.points.reduce((s, p) => s + sg * p.lam * V.dot(m.n, vm(p.p)), 0); if (m.frictionPoint) W += sg * V.dot(m.Jf, vm(m.frictionPoint)); W += sg * V.dot(m.couple2, wm); e.Wcross += W; } }
      else { const e = ext[c1.role]; e.selfPen = Math.max(e.selfPen, depth); }
      list.push({ kind, a: typeof w1 === "number" ? [c1.role, local(w1, c1)] : "turf", b: typeof w2 === "number" ? [c2.role, local(w2, c2)] : "turf", sub1: m.key.sub1, sub2: m.key.sub2, n: m.n, Jn, J2: m.J2,
        points: m.points.map(p => ({ p: p.p, lam: p.lam, depth: V.dot(V.sub(p.p1, p.p2), m.n) })), friction: m.frictionPoint ? { at: m.frictionPoint, J: m.Jf } : null, angFriction: m.angFriction }); }
    const meas = this._measureChars(S1, mf), sys = { P0: [0, 0, 0], P1: [0, 0, 0], L0: [0, 0, 0], L1: [0, 0, 0], grav: [0, 0, 0], gravH: [0, 0, 0], Jt: [0, 0, 0], Ht: [0, 0, 0], pc: [0, 0, 0], dE: 0, Wact: 0, D: 0 };
    rec.chars = {};
    for (const c of this.chars) { const B = c.spec.bodies, Sp = this.prev.slice(c.bOff, c.bOff + c.nb), Spre = pre.S.slice(c.bOff, c.bOff + c.nb), Sn = S1.slice(c.bOff, c.bOff + c.nb), e = ext[c.role];
      const P = (S) => S.reduce((s, b, i) => V.add(s, V.sc(b.v, B[i].mass)), [0, 0, 0]), LO = (S) => S.reduce((s, b, i) => V.add(s, V.add(V.cross(V.sub(b.com, O), V.sc(b.v, B[i].mass)), IL.mat3vec(MC.Iworld(b.rot, B[i].inertia), b.w))), [0, 0, 0]);
      const grav = [0, -G * c.M * h, 0], gravH = Spre.reduce((s, b, i) => V.add(s, V.cross(V.sub(b.com, O), [0, -G * B[i].mass * h, 0])), [0, 0, 0]);
      const pc = Sn.reduce((s, b, i) => V.add(s, V.cross(V.sub(b.com, V.add(Spre[i].com, V.sc(b.v, h))), V.sc(b.v, B[i].mass))), [0, 0, 0]);
      const P0 = P(Sp), P1 = P(Sn), L0 = LO(Sp), L1 = LO(Sn), E1 = this._energy(c, Sn), Wact = (c.actRes || []).reduce((s, r) => s + r.W, 0), com = V.sc(Sn.reduce((s, b, i) => V.add(s, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / c.M);
      const linRes = V.sub(V.sub(P1, P0), V.add(V.add(grav, e.Jturf), e.Jcross)), angRes = V.sub(V.sub(L1, L0), V.add(V.add(V.add(gravH, e.Hturf), e.Hcross), pc));
      rec.chars[c.role] = { P: P1, L_O: L1, com, E: E1, U: c.up.U, Wact, D: c.Dstep, Wcross: e.Wcross, energyRes: (E1 - c.E) - (Wact + e.Wcross - c.Dstep), linRes, angRes, pcTerm: pc, Jturf: e.Jturf, Jcross: e.Jcross, Hcross: e.Hcross, feet: e.feet, nonFootTurf: e.nonFootTurf,
        integrity: { ...meas[c.role], selfPenMm: Math.max(0, e.selfPen) * 1000, crossPenMm: Math.max(0, crossPen) * 1000, overCap: this._overCap(c) - c.overCap0 }, th: c.up.ev.per.map(p => p.th.slice()), sat: (c.actRes || []).filter(r => r.sat).length };
      sys.P0 = V.add(sys.P0, P0); sys.P1 = V.add(sys.P1, P1); sys.L0 = V.add(sys.L0, L0); sys.L1 = V.add(sys.L1, L1); sys.grav = V.add(sys.grav, grav); sys.gravH = V.add(sys.gravH, gravH); sys.Jt = V.add(sys.Jt, e.Jturf); sys.Ht = V.add(sys.Ht, e.Hturf); sys.pc = V.add(sys.pc, pc);
      sys.dE += E1 - c.E; sys.Wact += Wact; sys.D += c.Dstep; c.E = E1; c.overCap0 = this._overCap(c); }
    rec.system = { P: sys.P1, L_O: sys.L1, linRes: V.sub(V.sub(sys.P1, sys.P0), V.add(sys.grav, sys.Jt)), angRes: V.sub(V.sub(sys.L1, sys.L0), V.add(V.add(sys.gravH, sys.Ht), sys.pc)), energyRes: sys.dE - (sys.Wact - sys.D) };
    rec.eqOpp = this.chars.length === 2 ? { dJ: V.len(V.add(ext.runner.Jcross, ext.tackler.Jcross)), dH: V.len(V.add(ext.runner.Hcross, ext.tackler.Hcross)) } : null;
    rec.contacts = list; rec.S = S1.map(b => ({ pos: b.pos, rot: b.rot, com: b.com, v: b.v, w: b.w }));
    rec.hash = IL.hashNums([].concat(...S1.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]), ...this.chars.map(c => c.act.state())));
    return rec; }
  // ── X2 snapshot / restore (Jolt state incl. contacts + every character's plant state + measurement state) ──
  snapshot() { return { jolt: TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_All), n: this.n, recs: this.recs.length, prev: clone(this.prev),
    chars: this.chars.map(c => ({ act: c.act.state(), up: c.up, aplan: clone(c.aplan), st: clone(c.st), Dcum: c.Dcum, actRes: clone(c.actRes), E: c.E, overCap0: c.overCap0, led: clone(c.act.led) })) }; }
  restore(s) { TA.restoreState(this.J, this.w.ps, s.jolt); this.n = s.n; this.recs.length = s.recs; this.prev = clone(s.prev);
    this.chars.forEach((c, k) => { const x = s.chars[k]; c.act.setState(x.act); c.up = { ...x.up, applied: false }; c.aplan = clone(x.aplan); c.aplan.applied = false; c.st = clone(x.st); c.Dcum = x.Dcum; c.actRes = clone(x.actRes); c.E = x.E; c.overCap0 = x.overCap0; c.act.led = clone(x.led); });
    this.w.contacts = []; }
  destroy() { this.w.destroy(); }
}

// SUPPORT-1 isolated support-release laboratory: the recipient ALONE (the PVP-0 recipient: canonical M1b body + a controller, default the frozen C3
// exactly as committed, from the PPR-3 standing entry, in the frozen PVP-1A world in its SOLO mode), struck by a PHYSICALLY EXPLICIT disturbance:
//   impactor  a dynamic rigid body (capsule or sphere) with a stated mass, inertia, size, height and velocity; parked (kinematic, inert, ≥ 0.45 m
//             away) until `onset`, then made dynamic with its launch velocity (its one initial-condition write). "float": gravity factor 0 — a moving
//             obstacle of finite momentum (a pendulum bob at the bottom of its swing); "slide": gravity factor 1, resting on the turf, decelerated
//             by its own body|turf friction (a sliding tackler's leg / body). Contact with the recipient is ordinary Jolt contact (material "body":
//             µ 0.4 against the boot and the body); its impulse on the recipient is ledgered as external (PprPlant bookkeeping, rec.chars.runner.ext).
//   pulse     a prescribed external force (world vector, N) at a body-local point of one recipient body over a step window (PprPlant perturb).
//   replay    a per-step list of such forces (e.g. the PVP-0 recorded cross-contact force on each recipient body, at the recorded point).
//   preload   a constant external force on the pelvis COM from step 0 (e.g. an opponent leaning: shifts the load between the feet).
// The recipient's law (body + controller) never receives the disturbance, contacts or outcomes (PprPlant law hook). Contact-model candidates are
// installed by replacing THIS world's contact-listener callbacks (the frozen V2JoltWorld listener logic, with a per-manifold friction rule).
// Nothing in V2 / PVP / C3 / M1b is modified.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, IL, PV } = PL;
const { Ppr2Plant } = await import(RA + "ppr2/scripts/ppr2_plant.mjs"), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
const MB = await import(RA + "balance1/scripts/b1_body.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), TA = await import(PL.P2 + "tools/track_a_lib.mjs");
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
const J0 = (p) => JSON.parse(fs.readFileSync(new URL(p, RA)));
export const FIX = J0("ppr3/fixture/PPR3_STANDING_ENTRY.json"), C3P = J0("balance2/c3/params/C3.json"), BODY = J0("balance1/params/B1_BODY.json"), SPEC = PL.SPEC_R();
const H = 1 / 240, IMP_UD = 2000, L_MOVING = 1, M = SPEC.bodies.reduce((s, b) => s + b.mass, 0), MU_BOOT = SPEC.contact.friction["boot|turf"];
export const BI = (n) => SPEC.bodies.findIndex(b => b.name === n);
// ── the plant: Ppr2Plant (PprPlant → PvpPlant, frozen) + a shaped, parked-then-launched impactor + an optional contact-model rule ──
export class S1Plant extends Ppr2Plant {
  constructor(J, entries, flags, mode, opts = {}) { super(J, entries, flags, mode, opts); this._TA = TA; this.impOnset = opts.impOnset ?? null; this.impLaunched = false;
    if (opts.contactRule) this._installContactRule(opts.contactRule); }
  _makeImpactor(J, I) { const w = this.w; let shape;
    if (I.shape === "capsule") shape = new J.CapsuleShapeSettings(I.half, I.r, null).Create().Get(); else shape = new J.SphereShapeSettings(I.r, null).Create().Get();
    const q = I.rot || [0, 0, 0, 1], c = I.centre, bcs = new J.BodyCreationSettings(shape, new J.RVec3(c[0], c[1], c[2]), new J.Quat(q[0], q[1], q[2], q[3]), J.EMotionType_Dynamic, L_MOVING);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided; bcs.mMassPropertiesOverride.mMass = I.m; const Im = J.Mat44.prototype.sIdentity(), In = I.Idiag;
    Im.SetAxisX(new J.Vec3(In[0], 0, 0)); Im.SetAxisY(new J.Vec3(0, In[1], 0)); Im.SetAxisZ(new J.Vec3(0, 0, In[2])); bcs.mMassPropertiesOverride.mInertia = Im;
    bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = 0; bcs.mAngularDamping = 0; bcs.mMaxAngularVelocity = w.cfg.maxAngVel; bcs.mAllowSleeping = false;
    bcs.mGravityFactor = I.gravity; bcs.mUserData = IMP_UD; bcs.mApplyGyroscopicForce = true;
    this.imp = w.bi.CreateBody(bcs); w.bi.AddBody(this.imp.GetID(), J.EActivation_Activate); J.destroy(bcs);
    this.impId = this.imp.GetID().GetIndexAndSequenceNumber(); const base = this.whoOf; this.whoOf = (id) => (id === this.impId ? "imp" : base(id)); this.impMass = I.m; this.impCfg = I;
    w.bi.SetMotionType(this.imp.GetID(), J.EMotionType_Kinematic, J.EActivation_Activate); }                       // parked until onset (inert)
  readImp() { if (!this.imp) return null; const p = this.imp.GetCenterOfMassPosition(), v = this.imp.GetLinearVelocity(), r = this.imp.GetRotation(), wv = this.imp.GetAngularVelocity();
    return { com: [p.GetX(), p.GetY(), p.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], w: [wv.GetX(), wv.GetY(), wv.GetZ()] }; }
  _applyPerturb() { if (this.imp && !this.impLaunched && this.impOnset != null && this.n >= this.impOnset) { const J = this.J, v = this.impCfg.v, t = this.w._t;
      this.w.bi.SetMotionType(this.imp.GetID(), J.EMotionType_Dynamic, J.EActivation_Activate); t.v.Set(v[0], v[1], v[2]); this.w.bi.SetLinearVelocity(this.imp.GetID(), t.v); t.v.Set(0, 0, 0); this.w.bi.SetAngularVelocity(this.imp.GetID(), t.v); this.impLaunched = true; }
    return super._applyPerturb(); }
  // PprPlant.tick statement for statement, with ONE correction for a rotated impactor: the contact-cache decode map gets the impactor's actual
  // rotation (PprPlant writes identity, exact only for its non-spinning sphere; Jolt stores the manifold normal / points in body space)
  tick() {
    if (this.n >= this.maxSteps) return false; const now = () => performance.now(), TA = this._TA;
    let t0 = now(); for (const c of this.chars) { c.P.apply(c.up); c.act.apply(c.aplan); } this.cpu.passive += now() - t0;
    const ext = this._applyPerturb();
    let pre = null; if (this.instrument) { t0 = now(); const S = this.readAll(), map = {}; S.forEach((s, i) => { map[this.idOf[i]] = { com: s.com, rot: s.rot }; }); map[this.groundId] = { com: [0, 0, 0], rot: [0, 0, 0, 1] };
      if (this.imp) { const s = this.readImp(); map[this.impId] = { com: s.com, rot: s.rot }; pre = { S, map, imp: s }; } else pre = { S, map }; this.cpu.instrument += now() - t0; }
    t0 = now(); this.w.step(this.dt, this.coll); this.cpu.step += now() - t0;
    let mf = []; if (this.instrument) { t0 = now(); const dec = TA.decodeContacts(TA.saveState(this.J, this.w.ps, this.J.EStateRecorderState_Contacts)); mf = IL.manifoldImpulses(dec, pre.map); this.cpu.instrument += now() - t0; }
    this.n++; const S1 = this.readAll();
    t0 = now(); for (const c of this.chars) { const st0 = c.st; c.st = S1.slice(c.bOff, c.bOff + c.nb); const Dstep = c.P.dampingLoss(c.st, this.dt); c.Dstep = Dstep; c.Dcum += Dstep; c.actRes = c.act.after(st0, c.st, c.aplan); } this.cpu.act += now() - t0;
    if (this.law) { const t1 = now(); this.law.after(this.runner, this.runner.st, this.runner.actRes, this.n); this.cpu.law += now() - t1; }
    for (const c of this.chars) { let t1 = now(); c.up = c.P.compute(c.st, this.dt); this.cpu.passive += now() - t1; t1 = now(); const { cmd } = this.toneCmd(c, c.st, c.up.ev, this.n * this.dt); this.cpu.tone += now() - t1;
      t1 = now(); c.aplan = c.act.compute(c.st, c.up.ev, cmd, this.dt, false); this.cpu.act += now() - t1; }
    if (this.instrument) { t0 = now(); const impAll = mf.filter(m => this.whoOf(m.key.body1) === "imp" || this.whoOf(m.key.body2) === "imp"), rest = mf.filter(m => !impAll.includes(m)),
        impM = impAll.filter(m => typeof this.whoOf(m.key.body1) === "number" || typeof this.whoOf(m.key.body2) === "number");
      const rec = this._record(pre, S1, rest); this._extLedger(rec, pre, S1, ext, impM); rec.act = this._actRows(); rec.passive = this._passiveRows(); if (this.law) rec.law = this.law.info(); if (this.imp) rec.imp = this.readImp();
      this.recs.push(rec); this.cpu.measure += now() - t0; const fe = rec.chars.runner.feet; this.footN = { [this.bodyIdx("foot_L")]: fe.L / this.dt, [this.bodyIdx("foot_R")]: fe.R / this.dt }; }
    this.prev = S1; return true; }
  // contact-model candidate: the frozen V2JoltWorld listener (material lookup, restitution, recorded facts) with the combined friction of each manifold
  // given by rule(ctx) — ctx: materials, body indices, the runner body state (rotation, COM, velocity, angular velocity), the manifold normal (from the
  // turf / body 1 to body 2), world contact points and penetration; returns µ (null → the frozen per-material value)
  _installContactRule(rule) { const w = this.w, J = this.J, self = w, GROUND_UD = 1000, OBST_UD = 2000, MAT_TURF = "turf";
    const on = (b1p, b2p, mp, sp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), m = J.wrapPointer(mp, J.ContactManifold), cs = J.wrapPointer(sp, J.ContactSettings);
      const idx = (u) => (u === GROUND_UD ? -1 : u >= OBST_UD ? -(2 + u - OBST_UD) : u - 1), i1 = idx(b1.GetUserData()), i2 = idx(b2.GetUserData());
      const s1 = i1 < 0 ? 0 : self._sub(i1, m.mSubShapeID1.GetValue()), s2 = i2 < 0 ? 0 : self._sub(i2, m.mSubShapeID2.GetValue());
      const mat = (i, sub) => (i === -1 ? MAT_TURF : i < -1 ? "body" : self.mats[i][sub]), m1 = mat(i1, s1), m2 = mat(i2, s2); let mu = self.frictionOf(m1, m2);
      if ((m1 === MAT_TURF && m2 === "boot") || (m2 === MAT_TURF && m1 === "boot")) { const fb = m1 === "boot" ? b1 : b2, n = m.mWorldSpaceNormal, np = m.mRelativeContactPointsOn1.size(), pts = [];
        for (let k = 0; k < np; k++) { const p = m.GetWorldSpaceContactPointOn1(k); pts.push([p.GetX(), p.GetY(), p.GetZ()]); }
        const r = fb.GetRotation(), c = fb.GetCenterOfMassPosition(), v = fb.GetLinearVelocity(), wv = fb.GetAngularVelocity(), nn = [n.GetX(), n.GetY(), n.GetZ()], sg = m1 === "boot" ? -1 : 1;
        const out = rule({ plant: this, foot: m1 === "boot" ? i1 : i2, sub: m1 === "boot" ? s1 : s2, rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], com: [c.GetX(), c.GetY(), c.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [wv.GetX(), wv.GetY(), wv.GetZ()], nUp: V.sc(nn, sg), pts, depth: m.mPenetrationDepth, mu0: mu, n: this.n });
        if (out != null) mu = out; }
      cs.mCombinedFriction = mu; cs.mCombinedRestitution = self.contactCfg.restitution; };
    w.listener.OnContactAdded = on; w.listener.OnContactPersisted = on; }
}
// impactor geometry: capsule axis horizontal and perpendicular to the motion (rotation +90° about the motion direction maps the shape's +Y onto it)
export function impactorCfg(o) { const d = V.norm([o.dir[0], 0, o.dir[2]]), r = o.r, half = o.half ?? 0.2, L = 2 * half + 2 * r, m = o.m;
  const rot = o.shape === "sphere" ? [0, 0, 0, 1] : Q.axis(d, Math.PI / 2), Idiag = o.shape === "sphere" ? [0.4 * m * r * r, 0.4 * m * r * r, 0.4 * m * r * r] : [m * (3 * r * r + L * L) / 12, 0.5 * m * r * r, m * (3 * r * r + L * L) / 12];
  const target = o.target, y = o.mode === "slide" ? r + 0.0005 : o.height, centre = [target[0] - d[0] * o.startDist, y, target[2] - d[2] * o.startDist];
  return { shape: o.shape || "capsule", r, half, m, Idiag, rot, centre, v: V.sc(d, o.speed), gravity: o.mode === "slide" ? 1 : 0, mode: o.mode, dir: d, height: y }; }
// ── one lab run ──
// cfg: { label, steps, impOnset, impactor: {…impactorCfg input} | null, pulses: [{from,to,body,F,pLocal}], replay: [...same], preload: [Fx,0,Fz] | null,
//        ctrl: "C3" | (plant) => controller, body: params, contactRule: fn | null, keep: true → keep the compact per-step record }
export async function runLab(cfg) { const steps = cfg.steps || 840; let ctrl = null;
  const perturb = [...(cfg.pulses || []), ...(cfg.replay || [])]; if (cfg.preload) perturb.push({ from: 0, to: steps + 1, body: "pelvis", F: cfg.preload, pLocal: SPEC.bodies[0].comLocal });
  const imp = cfg.impactor ? impactorCfg(cfg.impactor) : null;
  const law = (p, c) => { ctrl = !cfg.ctrl || cfg.ctrl === "C3" ? new C3Controller(C3P) : cfg.ctrl(p, c); return new MB.M1bBody(p, c, cfg.body || BODY, ctrl); };
  const sim = new S1Plant(Jolt, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, instrument: true, solo: "runner", maxSteps: steps, law, perturb, impactor: imp, impOnset: cfg.impOnset ?? 240, contactRule: cfg.contactRule || null });
  const out = { label: cfg.label, cfg: { ...cfg, ctrl: typeof cfg.ctrl === "function" ? "custom" : (cfg.ctrl || "C3"), contactRule: cfg.contactRule ? (cfg.contactRule.label || "custom") : null }, impactor: imp, recs: [] };
  const t0 = performance.now(); let stop = null;
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], c = r.chars.runner; out.recs.push(compact(r, sim, ctrl)); sim.recs.length = 0;
    if (!c.integrity.finite) { stop = { step: sim.n, reason: "non-finite" }; break; } if (c.integrity.maxSpeed > PV.integrity.speedMax) { stop = { step: sim.n, reason: "speed " + c.integrity.maxSpeed.toFixed(1) }; break; } }
  out.wallMs = performance.now() - t0; out.cpu = sim.cpu; out.stop = stop; out.slips = sim.runner.act.slips || 0; out.ctrlMeta = ctrl && ctrl.meta ? ctrl.meta() : null;
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }
// compact per-step record: body states, impactor, per-foot support (as s1_feet_audit), COM, external impulse from the impactor / pulses, key torques
const AXK = ["ankle_L", "ankle_R", "knee_L", "knee_R", "hip_L", "hip_R"].map(n => SPEC.joints.findIndex(j => j.name === n));
function footOf(r, nm, S) { const ms = r.contacts.filter(c => c.kind === "turf-runner" && Array.isArray(c.b) && c.b[1] === nm); let lam = 0, Jf = [0, 0, 0], cop = [0, 0, 0], np = 0, sat = 0, act = 0, mu = null;
  const pts = [];
  for (const m of ms) { const sl = m.points.reduce((s, p) => s + p.lam, 0); lam += sl; if (m.friction) Jf = V.add(Jf, m.friction.J); for (const p of m.points) if (p.lam > 1e-6) { cop = V.add(cop, V.sc(p.p, p.lam)); np++; pts.push([+p.p[0].toFixed(4), +p.p[2].toFixed(4)]); }
    if (sl > 1e-6) { act++; if (m.friction && V.len(m.friction.J) >= 0.98 * (m.mu ?? MU_BOOT) * sl) sat++; } }
  const out = { N: lam / H, F: [Jf[0] / H, Jf[2] / H], np, sat, act, pts }; if (lam > 1e-6) { const c = V.sc(cop, 1 / lam), vp = V.add(S.v, V.cross(S.w, V.sub(c, S.com))); out.cop = [c[0], c[2]]; out.vs = Math.hypot(vp[0], vp[2]); } return out; }
function compact(r, sim, ctrl) { const c = r.chars.runner, S = r.S, o = { n: r.n, hash: r.hash, S: S.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w })), com: c.com, P: c.P, imp: r.imp || null,
    feet: { L: footOf(r, "foot_L", S[BI("foot_L")]), R: footOf(r, "foot_R", S[BI("foot_R")]) }, ext: c.ext ? { J: c.ext.J, imp: c.ext.imp ? { J: c.ext.imp.J, bodies: [...new Set(c.ext.imp.pts.map(p => p.body))], pts: c.ext.imp.pts.filter(p => p.lam > 0).map(p => p.p.map(x => +x.toFixed(4))) } : null } : null,
    th: AXK.map(k => c.th[k]), tq: AXK.map(k => [0, 1, 2].map(i => { const a = (r.act || []).find(x => x[0] === k && x[1] === i); return +(((a ? a[2] : 0) + r.passive[k][i])).toFixed(3); })),
    nonFoot: c.nonFootTurf.length ? [...new Set(c.nonFootTurf)] : null, integ: { hard: +c.integrity.hardExcDeg.toFixed(2), self: +c.integrity.selfPenMm.toFixed(2), turf: +c.integrity.turfPenMm.toFixed(2), sep: +c.integrity.sepMaxMm.toFixed(3) } };
  if (ctrl && ctrl.supportLog) o.sup = ctrl.supportLog(); return o; }
export const MASS = M, BW = M * 9.81, H_STEP = H;

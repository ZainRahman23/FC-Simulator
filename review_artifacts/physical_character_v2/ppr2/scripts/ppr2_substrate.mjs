// PPR-2 standing substrate (investigation code; PVP-1A-DX is sealed — nothing here is run on the tackle until a frozen qualification passes).
// Builds on PPR-1's law classes (ppr1/scripts/ppr1_law.mjs, imported unchanged; PPR-1 is preserved as a failed experiment) with:
//   A · CORRECTED EXCITATION (control law, not body spec): the pre-existing drive and its excitation are computed ONCE from the pre-contact
//       (entry) state — u± = max(±τ_active, 0)/capIso±(θ_entry) + a_cc — so activation cannot change before any prescribed latency, whatever
//       happens to the body; there is NO delayed regulator (no posture spring of any kind);
//   B · OPTIONAL passive elasticity (body-spec candidate): a non-yielding, activation-independent torque per axis, τ_p = −k_p·(θ − θ_slack) about
//       the joint's anatomical slack angle (never the entry pose), applied through the same motor row (its share of the window is added on top
//       of the muscle window, so it cannot saturate); τ_active = statics bias − τ_p(entry) (the muscles supply only what tissue does not);
//   A2 · OPTIONAL rest statics (params.statics = "rest"; see restStatics below) in place of the PostureDriver bias;
//   C · OPTIONAL eccentric reserve (body-spec candidate): the eccentric plateau e of V2's capacity model overridden per direction.
// Intrinsic muscle mechanics, damping, yield and plastic slip are PPR-1's (K_i = Σ (e − 1)·a·capIso/θ_y, D_i = 2ζ√(K_i·I)).
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const L1 = await import(RA + "ppr1/scripts/ppr1_law.mjs");
const { activationStep } = await import(P2 + "spec/v2_actuators.js"), { ACT } = await import(P2 + "sim/v2_actuation.js"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const { lockedAxisFF } = await import(P2 + "ctrl/v2_stand.js"), { decompose } = await import(P2 + "spec/v2_joints.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"], D2R = Math.PI / 180, G = 9.81;
// A2 · REST STATICS (control law, not body spec): the static joint torques of the pre-contact state AT REST. V2's PostureDriver statics (frozen as
// SnapshotTone's bias) apply at each sole centroid a "leg-line" force through the COM — a linear-inverted-pendulum force whose horizontal parts do
// not cancel (a body accelerating forward), so for a body at rest they are not an equilibrium. Here, the same subtree sums with the forces a body at
// rest must receive: vertical loads split by the lever rule along the inter-foot line, both centres of pressure shifted by the COM's perpendicular
// offset (total COP under the COM), and only the self-cancelling (internal) part of the PostureDriver's inward pair kept. Per axis exactly as
// PostureDriver.compute (incl. its locked-axis option). Computed ONCE, at entry.
export function restStatics(c, st) { st = unitStates(st); const C = c.ctrl, B = c.spec.bodies, M = C.M, P = c.P, ev = c.up.ev;
  let cm = [0, 0, 0]; st.forEach((b, i) => { cm = V.add(cm, V.sc(b.com, B[i].mass)); }); cm = V.sc(cm, 1 / M);
  const cp = C.feet.map((f, n) => V.add(st[f].pos, Q.rot(st[f].rot, c.pd.sole[n]))), Lv = [cp[1][0] - cp[0][0], 0, cp[1][2] - cp[0][2]], len = V.len(Lv), u = V.sc(Lv, 1 / len);
  const r = [cm[0] - cp[0][0], 0, cm[2] - cp[0][2]], along = V.dot(r, u), s = along / len, d = V.sub(r, V.sc(u, along));
  const hPD = cp.map(p => { const hz = Math.max(0.05, cm[1] - p[1]); return V.sc([(cm[0] - p[0]) / hz, 0, (cm[2] - p[2]) / hz], M * G / 2); }), iPair = (V.dot(hPD[0], u) - V.dot(hPD[1], u)) / 2;
  const F = [V.add([0, (1 - s) * M * G, 0], V.sc(u, iPair)), V.add([0, s * M * G, 0], V.sc(u, -iPair))], A = cp.map(p => V.add(p, d));
  const out = []; for (const dj of P.jd) { const k = dj.k, pj = C.jointAt(st, k); let T = [0, 0, 0];
    for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), [0, -G * B[i].mass, 0]));
    for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f); T = V.sub(T, V.cross(V.sub(A[n], pj), F[n])); }
    const axW = E.map(e => Q.rot(Q.mul(st[dj.child].rot, dj.F2), e)), q = ev.qs[k], Lk = C.o.ffLockedAxis ? C.lockedFix[k] : null, tB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;
    out[k] = [0, 1, 2].map(i => (Lk != null && i === 3 - Lk ? tB1 : V.dot(T, axW[i]))); }
  return { tff: out, loads: [(1 - s) * M * G, s * M * G], copShift: d, internalPair: iPair, com: cm }; }
export const SUBSTRATE_DEFAULT = Object.freeze({ ...L1.PPR1_B, id: "PPR-2 substrate S0 (investigation)", support: Object.freeze([]), passive: null, eccentric: null });
// muscle side: PPR-1's compute with (i) excitation from the row's FIXED excitation (u±, computed at entry) and (ii) a non-yielding passive torque
// added to τ0 and to both window bounds (it is tissue, not muscle: it never saturates and draws no activation)
export class SubstrateActuator extends L1.PreReflexActuator {
  compute(st, ev, cmd, dt, init = false) {
    st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [], zeta = this.pp.zeta;
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const kneeDeg = this.kneeOf[k] != null ? P.anat(P.jd[this.kneeOf[k]], ev.qs[this.kneeOf[k]], "flex") : null;
      const rows = KEYS.map((key, i) => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key), isoP = this.capFull(x, 1, anat, 0, kneeDeg), isoM = this.capFull(x, -1, anat, 0, kneeDeg);
        const capP = this.capFull(x, 1, anat, w, kneeDeg), capM = this.capFull(x, -1, anat, -w, kneeDeg);
        const a = this.a[k][i]; if (init) { a[0] = c.uP; a[1] = c.uM; } else { a[0] = activationStep(a[0], c.uP, dt); a[1] = activationStep(a[1], c.uM, dt); }
        const K = c.kP * a[0] * isoP + c.kM * a[1] * isoM, Kp = c.kp || 0, Ktot = K + Kp, D = Math.max(ACT.D_MIN, 2 * zeta * Math.sqrt(Ktot * c.I) + (c.dp || 0));
        const tauP = c.tauP || 0, tauE = K * c.eAnc, tau0 = c.drive + tauE + tauP, req = tau0 - (D + dt * Ktot) * w;
        // srsHold (option): the short-range elastic force is a cross-bridge STRAIN force — it persists while the stretch is held and is not clipped by
        // the velocity-dependent isometric window; its own reserve is R± = (e± − 1)·a±·capIso± (the stretched side's), beyond which it yields (law slip)
        let hiE = 0, loE = 0, Rp = (c.ePs - 1) * a[0] * isoP, Rm = (c.eMs - 1) * a[1] * isoM;
        if (this.pp.srsHold) { hiE = Math.min(Math.max(tauE, 0), Rp); loE = Math.max(Math.min(tauE, 0), -Rm); }
        return { K: Ktot, Kmus: K, Kp, D, tau0, req, capP, capM, hi: a[0] * capP + tauP + hiE, lo: -a[1] * capM + tauP + loE, w, anat, drive: c.drive, tauP, tauE, Rp, Rm, uP: c.uP, uM: c.uM }; });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); }
}
export class SubstrateLaw extends L1.PreReflexLaw {
  constructor(plant, c, params = SUBSTRATE_DEFAULT) {
    super(plant, c, { ...params, support: [] });   // no delayed regulator, ever
    this.sp = params; const old = c.act, P = c.P, ev = c.up.ev, spec = c.spec; this.rest = params.statics === "rest" ? restStatics(c, c.st) : null;
    if (params.eccentric) for (const r of old.ax) for (const x of r) { if (!x) continue; for (const side of ["plus", "minus"]) { const e = params.eccentric[x.base + "." + x.key] ?? params.eccentric.all; if (e != null) x[side] = { ...x[side], cap: { ...x[side].cap, e } }; } }
    c.act = new SubstrateActuator(spec, c.view, P, this.params); c.act.ax = old.ax; c.overCap0 = 0;   // same axes / capacities (with C applied)
    this.fixed = this.ax.map(a => { const kneeK = old.kneeOf[a.k], kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null; const fam = a.fam;
      return [0, 1, 2].map(i => { const r = a.rows[i], x = old.ax[a.k][i]; if (!r || !x) return null; const anat = P.anat(P.jd[a.k], ev.qs[a.k], x.key);
        const pv = params.passive && (params.passive[fam + "." + x.key] || null), kp = pv ? pv.k : 0, slack = pv ? pv.slackDeg : 0, dp = pv ? pv.d || 0 : 0;
        const tauPentry = -kp * (anat - slack) * D2R * x.s;   // passive torque at entry, in the constraint-parameter sign (anatomical → parameter via s)
        const bias = this.rest ? this.rest.tff[a.k][i] : r.bias, tauAct = bias - tauPentry, isoP = old.capFull(x, 1, anat, 0, kneeDeg), isoM = old.capFull(x, -1, anat, 0, kneeDeg);
        const uP = Math.min(1, Math.max(tauAct, 0) / Math.max(1e-9, isoP) + params.aCC), uM = Math.min(1, Math.max(-tauAct, 0) / Math.max(1e-9, isoM) + params.aCC);
        const kP = (x.plus.cap.e - 1) / (params.thetaYdeg[fam] * D2R), kM = (x.minus.cap.e - 1) / (params.thetaYdeg[fam] * D2R);
        return { i, key: x.key, s: x.s, biasPD: r.bias, bias, tauAct, tauPentry, uP, uM, kp, slack, dp, kP, kM, I: r.I, ePs: x.plus.cap.e, eMs: x.minus.cap.e }; }); });
  }
  command(c, st, ev, n) { st = unitStates(st); ev = unitEv(ev); const cmd = [], info = [], P = c.P;
    for (const a of this.ax) { if (!a.qr) { cmd[a.k] = null; continue; } const eA = this._eAnc(a.k, ev.qs[a.k]);
      cmd[a.k] = a.rows.map((r, i) => { if (!r) return null; const f = this.fixed[this.ax.indexOf(a)][i]; const anat = P.anat(P.jd[a.k], ev.qs[a.k], f.key);
        const tauP = -f.kp * (anat - f.slack) * D2R * f.s;   // the passive tissue torque at the CURRENT angle (non-yielding, activation-free)
        info.push([a.k, i, f.tauAct, eA[i], tauP]); return { drive: f.tauAct, eAnc: eA[i], kP: f.kP, kM: f.kM, I: f.I, uP: f.uP, uM: f.uM, kp: f.kp, dp: f.dp, tauP, ePs: f.ePs, eMs: f.eMs }; }); }
    this.last = info; return { cmd }; }
  info() { const plan = this.c.aplan, K = plan ? Object.fromEntries(plan.joints.flatMap(p => p.rows.map((r, i) => (r && !r.off ? [p.k + "_" + i, [r.Kmus, r.D, r.Kp]] : null)).filter(Boolean))) : {};
    return (this.last || []).map(([k, i, drive, eA, tauP]) => { const kd = K[k + "_" + i] || [0, 0, 0]; return [k, i, +drive.toFixed(6), +kd[0].toFixed(4), +kd[1].toFixed(4), +(kd[0] * eA).toFixed(5), +tauP.toFixed(5)]; }); }   // [k, i, τ_active(fixed), K_muscle, D, elastic, τ_passive]
  // plastic slip: with srsHold, the elastic element yields when its strain force exceeds its own reserve R± (it then stays AT the reserve: the
  // plateau persists while stretched); otherwise PPR-1's rule (anchor follows a saturated window)
  after(c, st, actRes, n) { if (!this.sp.srsHold) return super.after(c, st, actRes, n); if (!c.aplan) return; st = unitStates(st); const P = c.P, rots = st.map(s => s.rot);
    for (const a of this.ax) { if (!a.qr) continue; const pj = c.aplan.joints.find(p => p.k === a.k); let q = null, e = null, any = false;
      a.rows.forEach((r, i) => { if (!r) return; const row = pj.rows[i]; if (!row || row.off || !(row.Kmus > 0)) return; if (!q) { q = Q.norm(P.qcs(P.jd[a.k], rots)); e = this._eAnc(a.k, q); }
        const tauE = row.Kmus * e[i]; if (tauE > row.Rp) { e[i] = row.Rp / row.Kmus; any = true; } else if (tauE < -row.Rm) { e[i] = -row.Rm / row.Kmus; any = true; } });
      if (any) { const hv = V.sc(e, 0.5), w2 = 1 - V.dot(hv, hv); this.qAnc[a.k] = Q.norm(Q.mul(q, [hv[0], hv[1], hv[2], Math.sqrt(Math.max(0, w2))])); this.nSlip++; } } }
  meta() { return { params: this.sp, slips: this.nSlip, rest: this.rest ? { loads: this.rest.loads, copShift: this.rest.copShift, internalPair: this.rest.internalPair } : null }; }
}

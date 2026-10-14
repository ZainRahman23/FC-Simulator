// SLIDE-PHYS-2 Phase 9 — REGIONAL disturbance yielding and fallback (successor of SLIDE-PHYS-1 A5, whose local yield was on in every step of a
// normal slide and whose whole-body rms trigger let one folded knee vanish inside an average).
// RegionalTracker = SlideTracker (same PD on M1b/M1c intent, feed-forward, coupling, support objectives) with a TACTILE disturbance signal:
//   a region (tackling leg, trailing leg, trunk incl. pelvis, each arm) is TOUCHED when a non-ground contact (an obstacle or another player) acts
//   on any of its bodies — sensed with a delay (25 ms, tactile / load-receptor latency) from the plant's previous contact records. Ground contacts
//   are the planned support and never count. (Rejected predecessors, preserved in the log: an error-baseline detector and a pure proprioceptive
//   "pushback" detector both flagged the explosive commit itself — whole-body inertia throws the limbs away from their targets — as a disturbance
//   in every limb by 0.1–0.2 s.)
//   • local yield: on a touched region, an axis whose tracking error exceeds e0 has its stiffness term scaled by e0/|err| (it gives instead of
//     pushing harder);
//   • regional failure: a touched region whose largest tracking error stays above Dfail for holdS (it is being overpowered) decays to a limp floor
//     (authority × floorR, τ) — the rest of the body keeps its authority;
//   • whole-body fallback: trunk failure, or ≥ 2 failed regions → every region (and the support objectives) decays to floorG (τ) — a ragdoll
//     that keeps every transform, velocity, contact and muscle state, because only torque authority changes (no state is ever written).
// Contacts always win: the controller has no collision awareness.
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), CT = await import(S1 + "sp_ctrl.mjs"), { V, Q, JN } = L;
const VF = await import(S1 + "sp_vf.mjs"), CD = await import(S1 + "sp_cand.mjs");
const C = await import(S1 + "sp_chor.mjs"), ID = await import(S1 + "sp_id.mjs");
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], D2R = Math.PI / 180;
export const REGIONS = { tackLeg: ["hip_R", "knee_R", "ankle_R"], trailLeg: ["hip_L", "knee_L", "ankle_L"], trunk: ["lumbar", "thoracic", "neck"], armL: ["shoulder_L", "elbow_L"], armR: ["shoulder_R", "elbow_R"] };
export const REGION_BODIES = { tackLeg: ["thigh_R", "shank_R", "foot_R"], trailLeg: ["thigh_L", "shank_L", "foot_L"], trunk: ["pelvis", "abdomen", "thorax", "head"], armL: ["upperArm_L", "forearm_L"], armR: ["upperArm_R", "forearm_R"] };
const bodyRegion = Object.fromEntries(Object.entries(REGION_BODIES).flatMap(([r, bs]) => bs.map(b => [b, r])));
export const DEFAULT_REG = { e0Deg: 10, delayS: 0.025, touchWinS: 0.05, touchNs: 0.5, DfailDeg: 40, holdS: 0.06, floorR: 0.3, floorG: 0.12, tauS: 0.08 };
const regionOf = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, js]) => js.map(j => [j, r])));
export class RegionalTracker extends CT.SlideTracker {
  // SP2A (opts.initChor, compiled): the entry's activation re-initialisation ("as if commanding this for a while") uses the INCOMING motion's
  // continuation (the run the body arrives with), not the commitment the lead already anticipates — the commitment then develops through the
  // muscles' own excitation / activation dynamics (inert when absent).
  // SP2C (opts.recover = { vh, minAfterS, delayS, blendS, chor (compiled; time from the trigger) }; inert when absent): a STATE-triggered follow-through
  // phase. Once the slide is ending — the body's own horizontal COM speed (sensed with delayS from the plant's records) falls below vh, at least
  // minAfterS after the first legitimate fold-side contact (contactAuth) — every target blends (smoothstep, blendS) from the tackle choreography
  // into the recovery choreography. Targets only: authority, yielding, failure and fallback are unchanged; no root, COM or propulsion objective.
  constructor(opts) { const rs = { tr: null }, R0 = opts.recover, base = opts.chor, sm = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const chor = R0 ? { ...base, anatAt: (t) => { const a = base.anatAt(t); if (rs.tr == null || t <= rs.tr) return a; const u = sm((t - rs.tr) / R0.blendS), b = R0.chor.anatAt(t - rs.tr);
      for (const [jn, o] of Object.entries(b)) for (const [k, v] of Object.entries(o)) { const x = a[jn] && a[jn][k]; (a[jn] = a[jn] || {})[k] = x == null ? v : x + (v - x) * u; } return a; } } : base;
    super(R0 ? { ...opts, chor } : opts); this._rec = R0 ? rs : null; this._post = opts.post ? { tc: null } : null; this.R = { ...DEFAULT_REG, ...(opts.regional || {}) }; this.reg = Object.fromEntries(Object.keys(REGIONS).map(r => [r, { f: 1, over: 0, failed: false, t: null }])); this.g = { f: 1, on: false, t: null }; this.base = null; }
  // tactile sensing: non-ground contact impulse (N·s) on each region over the window [now − delay − win, now − delay], from the plant's records
  _touch(R) { const out = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), recs = this.plant && this.plant.recs; if (!recs || !recs.length) return out;
    const role = this.c && this.c.role || "tackler", d = Math.round(R.delayS / this.h), w = Math.max(1, Math.round(R.touchWinS / this.h));
    for (let k = Math.max(0, recs.length - d - w); k < recs.length - d; k++) { const r = recs[k];
      for (const c of r.contacts || []) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; for (const s of [c.a, c.b]) if (Array.isArray(s) && s[0] === role && bodyRegion[s[1]]) out[bodyRegion[s[1]]] += c.Jn; }
      for (const c of r.obst || []) if (c.kind === "obst-tackler" && c.Jn > 0 && bodyRegion[c.body]) out[bodyRegion[c.body]] += c.Jn; }
    return out; }
  // SP2A contact-driven authority (opts.contactAuth = { trigger: [body names], delayS, schedule: [[dt, { region: α }], …] }): until the FIRST
  // legitimate turf contact of a trigger body (sensed with a delay from the plant's contact records) the authored intent has full authority;
  // from then on each region's authority follows the schedule (piecewise linear in time since that contact) — contacts and physics take over.
  _contactAuth(t) { const CA = this.o.contactAuth; if (!CA) return null; const recs = this.plant && this.plant.recs, role = this.c && this.c.role || "tackler";
    if (this.tc == null && recs && recs.length) { const d = Math.round((CA.delayS ?? 0.025) / this.h), r = recs[recs.length - 1 - d];
      if (r) for (const c of r.contacts || []) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const s = c.a === "turf" ? c.b : c.a; if (Array.isArray(s) && s[0] === role && CA.trigger.includes(s[1])) { this.tc = t; this.tcBody = s[1]; break; } } }
    if (this.tc == null) return null; const dt = t - this.tc, S = CA.schedule; let a = S[0][1], b = S[S.length - 1][1], u = 1;
    for (let i = 0; i < S.length - 1; i++) if (dt >= S[i][0] && dt <= S[i + 1][0]) { a = S[i][1]; b = S[i + 1][1]; u = (dt - S[i][0]) / Math.max(1e-9, S[i + 1][0] - S[i][0]); break; }
    if (dt > S[S.length - 1][0]) { a = b; u = 1; } const out = {}; for (const r of Object.keys(REGIONS)) out[r] = (a[r] ?? 1) + ((b[r] ?? 1) - (a[r] ?? 1)) * u; return out; }
  // SP2F (opts.post = { body, joints, delayS, blendS, pressN }; inert when absent): a SLIDING ARM POST. From the first sensed turf contact of the post body
  // (e.g. forearm_L, sensed delayS late from the plant records) the post joints' authored position targets and reference rates fade out over blendS,
  // leaving their damping, and the arm instead exerts a finite PRESS: the joint torques of a downward force pressN (N) at the hand (Jacobian transpose:
  // τ_axis = axis · (r_hand − r_joint) × F). The arm geometry is left free: the contact and the moving body determine the shoulder / elbow angles; the
  // press scales with the region's authority (yielding / failure / fallback unchanged); optional P.pressRampS: the press builds over that time from the
  // contact (smoothstep) instead of with the blend. Contacts win; no world-space target, no anchoring term.
  _postTrigger(t) { const P = this.o.post, s = this._post; if (!s || s.tc != null) return; const recs = this.plant && this.plant.recs, role = this.c && this.c.role || "tackler";
    const r = recs && recs[recs.length - 1 - Math.round((P.delayS ?? 0.025) / this.h)]; if (!r) return;
    for (const c of r.contacts || []) { if (!c.kind.startsWith("turf") || !(c.Jn > 0)) continue; const sd = c.a === "turf" ? c.b : c.a; if (Array.isArray(sd) && sd[0] === role && sd[1] === P.body) { s.tc = t; break; } } }
  _recoverTrigger(t) { const R0 = this.o.recover, rs = this._rec; if (!rs || rs.tr != null || this.tc == null || t < this.tc + (R0.minAfterS ?? 0.3)) return;
    const recs = this.plant && this.plant.recs, r = recs && recs[recs.length - 1 - Math.round((R0.delayS ?? 0.025) / this.h)], role = this.c && this.c.role || "tackler";
    if (!r || !r.chars || !r.chars[role]) return; const P = r.chars[role].P; if (Math.hypot(P[0], P[2]) / L.M < R0.vh) rs.tr = t + this.lead; }
  step(n, st, ev) { this._n = n; const t = n * this.h + (this.o.t0 || 0), init = n === 0 && !!this.o.initChor, tt = init ? t : t + this.lead, R = this.R, CAf = this._contactAuth(t); if (this._rec) this._recoverTrigger(t); if (this._post) this._postTrigger(t);
    const PO = this._post && this._post.tc != null ? (() => { const P = this.o.post, u = Math.min(1, (t - this._post.tc) / Math.max(1e-6, P.blendS ?? 0.1)), Kp = L.skel(st); const v = P.pressRampS ? Math.min(1, (t - this._post.tc) / P.pressRampS) : null; return { P, u: u * u * (3 - 2 * u), K: Kp, F: [0, -(P.pressN ?? 0) * (v == null ? 1 : v * v * (3 - 2 * v)), 0], set: new Set(P.joints) }; })() : null;
    // (init: the incoming motion evaluated at the PRESENT instant — position error and rate error are ≈ 0 because the entry is that motion, so
    //  the steady state is the motion's own inverse dynamics + the support objective: e.g. a stance knee's extensors are pre-activated at the
    //  touchdown, as in running, instead of its flexors pulling toward where the knee will be 70 ms later)
    const q1 = init ? C.jointTargets(this.o.initChor.anatAt(tt)) : this.o.couple ? C.jointTargets(this.coupledAnat(tt, ev)) : this.targetQ(tt), q2 = init ? C.jointTargets(this.o.initChor.anatAt(tt + this.h)) : this.o.couple ? C.jointTargets(this.coupledAnat(tt + this.h, ev)) : this.targetQ(tt + this.h);
    // SP2A (opts.rateLead): the rate reference is taken at t + rateLead instead of t + lead (inert when absent). With a 70 ms lead on a fast
    // motion, D·(ω_ref(t + lead) − ω(t)) is an acceleration feed-forward of gain D·lead (≈ 5× the axis inertia) on top of the inverse-dynamics FF.
    const rl = init ? 0 : this.o.rateLead, tq = (x) => init ? C.jointTargets(this.o.initChor.anatAt(x)) : this.o.couple ? C.jointTargets(this.coupledAnat(x, ev)) : this.targetQ(x);
    const qa = rl == null ? q1 : tq(t + rl), qb = rl == null ? q2 : tq(t + rl + this.h);
    const pd = JN.map(() => [0, 0, 0]), out = JN.map(() => [0, 0, 0]), row = { n, t, err: [] }; if (!this.base) this.base = JN.map(() => [0, 0, 0]);
    const dReg = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), e0 = R.e0Deg * D2R, touch = this._touch(R);
    for (let k = 0; k < JN.length; k++) { const j = JN[k], q = ev.qs[k], qr = q1[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const qa_ = qa[k], qn = qb[k], sn = qa_[0] * qn[0] + qa_[1] * qn[1] + qa_[2] * qn[2] + qa_[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qa_), qn.map(x => x * sn)), wRef = [2 * dr[0] / this.h, 2 * dr[1] / this.h, 2 * dr[2] / this.h];
      const R2F2 = Q.mul(st[j.childIndex].rot, j.F2), axW = E3.map(e => Q.rot(R2F2, e)), wr = V.sub(st[j.childIndex].w, st[j.parentIndex].w), w = axW.map(a => V.dot(wr, a));
      const reg = regionOf[j.name], al = (this.o.authority ? this.o.authority(t, j.name) : 1) * (reg ? this.reg[reg].f : 1) * this.g.f * (CAf && reg ? CAf[reg] : 1);
      for (let i = 0; i < 3; i++) { if (!this.gain[k][i]) continue; const g = this.gain[k][i], ae = Math.abs(err[i]), b = this.base[k][i]; let kp = g.K;
        const touched = reg && touch[reg] > R.touchNs; if (touched) dReg[reg] = Math.max(dReg[reg], ae);         // a touched region's error = how far it is overpowered
        if (touched && ae > e0) { kp *= e0 / ae; row.yieldN = (row.yieldN || 0) + 1; }                       // local yield while touched
        if (PO && PO.set.has(j.name)) { const u = PO.u, rj = V.sub(PO.K["hand_" + (PO.P.side || "L")], PO.K[j.name]), tp = V.dot(axW[i], V.cross(rj, PO.F));
          pd[k][i] = al * ((1 - u) * kp * err[i] + g.D * ((1 - u) * wRef[i] - w[i]) + u * tp); row.err.push(err[i]); continue; }
        pd[k][i] = al * (kp * err[i] + g.D * (wRef[i] - w[i])); row.err.push(err[i]); } }
    // (init: fresh chain-ID closures each call — the entry makes two calls at step 0, before and after the velocities are written, and a
    //  closure that remembered the first would read that write as a ≈ 10³ m/s² base acceleration)
    for (const f of (init ? (this.o.ff || []).map(f => ({ ...f, fn: ID.makeChainID(f.chain, this.o.initChor) })) : this.ff)) { const wgt = f.weight(t); const fv = f.fn(st, init ? t : t + (this.o.ffLead ?? this.lead)); if (!wgt) continue; for (const [k, v] of Object.entries(fv)) { const reg = regionOf[JN[k].name], al = (this.o.authority ? this.o.authority(t, JN[k].name) : 1) * (reg ? this.reg[reg].f : 1) * this.g.f * (CAf && reg ? CAf[reg] : 1); for (let i = 0; i < 3; i++) if (this.gain[k][i]) pd[k][i] += al * wgt * v[i]; } }
    this.lastIntent = pd; let vf = this.o.vf ? this.o.vf(this, t, st, ev) : null;
    for (const extra of this.o.vfs || []) { const v2 = extra(this, t, st, ev); if (!v2) continue; if (!vf) { vf = v2; continue; } for (let k = 0; k < JN.length; k++) for (let i = 0; i < 3; i++) vf[k][i] += v2[k][i]; vf.info2 = v2.info; }
    for (let k = 0; k < JN.length; k++) { const rows = this.body.ax.find(a => a.k === k).rows; for (let i = 0; i < 3; i++) { if (!rows[i]) continue; out[k][i] = pd[k][i] + (vf && vf[k] ? this.g.f * (vf[k][i] || 0) : 0) - rows[i].tauStatic; } }
    // SP2A (opts.initTau, inert when absent): the entry's activation initialisation commands the incoming motion's whole-body inverse dynamics
    //   (opts.initMix ∈ [0, 1], default 1: blend of the whole-body inverse dynamics and the partial command computed above)
    if (n === 0 && this.o.initTau) { const mx = this.o.initMix ?? 1; for (let k = 0; k < JN.length; k++) { const rows = this.body.ax.find(a => a.k === k).rows; for (let i = 0; i < 3; i++) if (rows[i]) { out[k][i] = mx * (this.o.initTau[k][i] - rows[i].tauStatic) + (1 - mx) * out[k][i]; pd[k][i] = mx * this.o.initTau[k][i] + (1 - mx) * pd[k][i]; } } }
    // regional failure and whole-body fallback (authority only; nothing is written to the bodies)
    { let nFail = 0; for (const [r, s] of Object.entries(this.reg)) { if (!s.failed) { s.over = dReg[r] > R.DfailDeg * D2R ? s.over + this.h : 0; if (s.over >= R.holdS) { s.failed = true; s.t = t; } }
        if (s.failed) { s.f = R.floorR + (s.f - R.floorR) * Math.exp(-this.h / R.tauS); nFail++; } }
      if (!this.g.on && (this.reg.trunk.failed || nFail >= 2)) { this.g.on = true; this.g.t = t; } if (this.g.on) this.g.f = R.floorG + (this.g.f - R.floorG) * Math.exp(-this.h / R.tauS); }
    row.errDeg = Math.sqrt(row.err.reduce((s, x) => s + x * x, 0) / row.err.length) * 180 / Math.PI; delete row.err; if (row.yieldN) row.yield = row.yieldN;
    row.touch = Object.fromEntries(Object.entries(touch).filter(([, x]) => x > 0).map(([r, x]) => [r, +x.toFixed(2)])); row.dist = Object.fromEntries(Object.entries(dReg).map(([r, d]) => [r, +(d / D2R).toFixed(1)])); row.regF = Object.fromEntries(Object.entries(this.reg).map(([r, s]) => [r, +s.f.toFixed(3)])); row.gF = +this.g.f.toFixed(3); if (this.g.on) row.ragdoll = true; if (CAf) { row.contactAuth = Object.fromEntries(Object.entries(CAf).map(([r, a]) => [r, +a.toFixed(3)])); row.tc = this.tc; }
    if (vf && vf.info) row.vf = { F: vf.info.F.map(x => +x.toFixed(1)), T: vf.info.T ? vf.info.T.map(x => +x.toFixed(1)) : null, w: vf.info.w };
    this.log.push(row); return out; }
  meta() { return { tracker: "SLIDE-PHYS-2 RegionalTracker", lead: this.lead, gains: this.o.gains, chor: this.o.chor.name, regional: this.R,
    failures: Object.fromEntries(Object.entries(this.reg).filter(([, s]) => s.failed).map(([r, s]) => [r, s.t])), wholeBody: this.g.on ? this.g.t : null, contactAuthFrom: this.tc ?? null, contactAuthBody: this.tcBody ?? null, ...(this._rec ? { recoverFrom: this._rec.tr } : {}), ...(this._post ? { postFrom: this._post.tc } : {}) }; }
}
// G23's controller assembly (plant VF, press, seat), with the RegionalTracker in place of the SlideTracker
export function makeCtrlRegional(cand, chor, E) { const ctrl = CD.G23.makeCtrl(cand, chor, E); return new RegionalTracker({ ...ctrl.o, regional: cand.regional || {}, contactAuth: cand.contactAuth || null, initChor: cand.initChor ? C.compile(cand.initChor) : null, initTau: cand.initTau || null, initMix: cand.initMix ?? 1, rateLead: cand.rateLead ?? null, ...(cand.recover ? { recover: { ...cand.recover, chor: C.compile(cand.recover.chor) } } : {}), ...(cand.post ? { post: cand.post } : {}) }); }

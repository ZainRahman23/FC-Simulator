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
const C = await import(S1 + "sp_chor.mjs");
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], D2R = Math.PI / 180;
export const REGIONS = { tackLeg: ["hip_R", "knee_R", "ankle_R"], trailLeg: ["hip_L", "knee_L", "ankle_L"], trunk: ["lumbar", "thoracic", "neck"], armL: ["shoulder_L", "elbow_L"], armR: ["shoulder_R", "elbow_R"] };
export const REGION_BODIES = { tackLeg: ["thigh_R", "shank_R", "foot_R"], trailLeg: ["thigh_L", "shank_L", "foot_L"], trunk: ["pelvis", "abdomen", "thorax", "head"], armL: ["upperArm_L", "forearm_L"], armR: ["upperArm_R", "forearm_R"] };
const bodyRegion = Object.fromEntries(Object.entries(REGION_BODIES).flatMap(([r, bs]) => bs.map(b => [b, r])));
export const DEFAULT_REG = { e0Deg: 10, delayS: 0.025, touchWinS: 0.05, touchNs: 0.5, DfailDeg: 40, holdS: 0.06, floorR: 0.3, floorG: 0.12, tauS: 0.08 };
const regionOf = Object.fromEntries(Object.entries(REGIONS).flatMap(([r, js]) => js.map(j => [j, r])));
export class RegionalTracker extends CT.SlideTracker {
  constructor(opts) { super(opts); this.R = { ...DEFAULT_REG, ...(opts.regional || {}) }; this.reg = Object.fromEntries(Object.keys(REGIONS).map(r => [r, { f: 1, over: 0, failed: false, t: null }])); this.g = { f: 1, on: false, t: null }; this.base = null; }
  // tactile sensing: non-ground contact impulse (N·s) on each region over the window [now − delay − win, now − delay], from the plant's records
  _touch(R) { const out = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), recs = this.plant && this.plant.recs; if (!recs || !recs.length) return out;
    const role = this.c && this.c.role || "tackler", d = Math.round(R.delayS / this.h), w = Math.max(1, Math.round(R.touchWinS / this.h));
    for (let k = Math.max(0, recs.length - d - w); k < recs.length - d; k++) { const r = recs[k];
      for (const c of r.contacts || []) { if (c.kind !== "cross" || !(c.Jn > 0)) continue; for (const s of [c.a, c.b]) if (Array.isArray(s) && s[0] === role && bodyRegion[s[1]]) out[bodyRegion[s[1]]] += c.Jn; }
      for (const c of r.obst || []) if (c.kind === "obst-tackler" && c.Jn > 0 && bodyRegion[c.body]) out[bodyRegion[c.body]] += c.Jn; }
    return out; }
  step(n, st, ev) { this._n = n; const t = n * this.h + (this.o.t0 || 0), tt = t + this.lead, R = this.R;
    const q1 = this.o.couple ? C.jointTargets(this.coupledAnat(tt, ev)) : this.targetQ(tt), q2 = this.o.couple ? C.jointTargets(this.coupledAnat(tt + this.h, ev)) : this.targetQ(tt + this.h);
    const pd = JN.map(() => [0, 0, 0]), out = JN.map(() => [0, 0, 0]), row = { n, t, err: [] }; if (!this.base) this.base = JN.map(() => [0, 0, 0]);
    const dReg = Object.fromEntries(Object.keys(REGIONS).map(r => [r, 0])), e0 = R.e0Deg * D2R, touch = this._touch(R);
    for (let k = 0; k < JN.length; k++) { const j = JN[k], q = ev.qs[k], qr = q1[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const qn = q2[k], sn = qr[0] * qn[0] + qr[1] * qn[1] + qr[2] * qn[2] + qr[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qr), qn.map(x => x * sn)), wRef = [2 * dr[0] / this.h, 2 * dr[1] / this.h, 2 * dr[2] / this.h];
      const R2F2 = Q.mul(st[j.childIndex].rot, j.F2), axW = E3.map(e => Q.rot(R2F2, e)), wr = V.sub(st[j.childIndex].w, st[j.parentIndex].w), w = axW.map(a => V.dot(wr, a));
      const reg = regionOf[j.name], al = (this.o.authority ? this.o.authority(t, j.name) : 1) * (reg ? this.reg[reg].f : 1) * this.g.f;
      for (let i = 0; i < 3; i++) { if (!this.gain[k][i]) continue; const g = this.gain[k][i], ae = Math.abs(err[i]), b = this.base[k][i]; let kp = g.K;
        const touched = reg && touch[reg] > R.touchNs; if (touched) dReg[reg] = Math.max(dReg[reg], ae);         // a touched region's error = how far it is overpowered
        if (touched && ae > e0) { kp *= e0 / ae; row.yieldN = (row.yieldN || 0) + 1; }                       // local yield while touched
        pd[k][i] = al * (kp * err[i] + g.D * (wRef[i] - w[i])); row.err.push(err[i]); } }
    for (const f of this.ff) { const wgt = f.weight(t); const fv = f.fn(st, t + (this.o.ffLead ?? this.lead)); if (!wgt) continue; for (const [k, v] of Object.entries(fv)) { const reg = regionOf[JN[k].name], al = (this.o.authority ? this.o.authority(t, JN[k].name) : 1) * (reg ? this.reg[reg].f : 1) * this.g.f; for (let i = 0; i < 3; i++) if (this.gain[k][i]) pd[k][i] += al * wgt * v[i]; } }
    this.lastIntent = pd; let vf = this.o.vf ? this.o.vf(this, t, st, ev) : null;
    for (const extra of this.o.vfs || []) { const v2 = extra(this, t, st, ev); if (!v2) continue; if (!vf) { vf = v2; continue; } for (let k = 0; k < JN.length; k++) for (let i = 0; i < 3; i++) vf[k][i] += v2[k][i]; vf.info2 = v2.info; }
    for (let k = 0; k < JN.length; k++) { const rows = this.body.ax.find(a => a.k === k).rows; for (let i = 0; i < 3; i++) { if (!rows[i]) continue; out[k][i] = pd[k][i] + (vf && vf[k] ? this.g.f * (vf[k][i] || 0) : 0) - rows[i].tauStatic; } }
    // regional failure and whole-body fallback (authority only; nothing is written to the bodies)
    { let nFail = 0; for (const [r, s] of Object.entries(this.reg)) { if (!s.failed) { s.over = dReg[r] > R.DfailDeg * D2R ? s.over + this.h : 0; if (s.over >= R.holdS) { s.failed = true; s.t = t; } }
        if (s.failed) { s.f = R.floorR + (s.f - R.floorR) * Math.exp(-this.h / R.tauS); nFail++; } }
      if (!this.g.on && (this.reg.trunk.failed || nFail >= 2)) { this.g.on = true; this.g.t = t; } if (this.g.on) this.g.f = R.floorG + (this.g.f - R.floorG) * Math.exp(-this.h / R.tauS); }
    row.errDeg = Math.sqrt(row.err.reduce((s, x) => s + x * x, 0) / row.err.length) * 180 / Math.PI; delete row.err; if (row.yieldN) row.yield = row.yieldN;
    row.touch = Object.fromEntries(Object.entries(touch).filter(([, x]) => x > 0).map(([r, x]) => [r, +x.toFixed(2)])); row.dist = Object.fromEntries(Object.entries(dReg).map(([r, d]) => [r, +(d / D2R).toFixed(1)])); row.regF = Object.fromEntries(Object.entries(this.reg).map(([r, s]) => [r, +s.f.toFixed(3)])); row.gF = +this.g.f.toFixed(3); if (this.g.on) row.ragdoll = true;
    if (vf && vf.info) row.vf = { F: vf.info.F.map(x => +x.toFixed(1)), T: vf.info.T ? vf.info.T.map(x => +x.toFixed(1)) : null, w: vf.info.w };
    this.log.push(row); return out; }
  meta() { return { tracker: "SLIDE-PHYS-2 RegionalTracker", lead: this.lead, gains: this.o.gains, chor: this.o.chor.name, regional: this.R,
    failures: Object.fromEntries(Object.entries(this.reg).filter(([, s]) => s.failed).map(([r, s]) => [r, s.t])), wholeBody: this.g.on ? this.g.t : null }; }
}
// G23's controller assembly (plant VF, press, seat), with the RegionalTracker in place of the SlideTracker
export function makeCtrlRegional(cand, chor, E) { const ctrl = CD.G23.makeCtrl(cand, chor, E); return new RegionalTracker({ ...ctrl.o, regional: cand.regional || {} }); }

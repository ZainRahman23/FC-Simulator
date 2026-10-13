// BALANCE-3 candidate B3: coordinated front-to-back ankle–hip control by EIGENMOVEMENT (modal) objectives (Alexandrov et al. 2005, Biol Cybern
// 93:309: each sagittal eigenmovement — A, whole-body rotation about the ankles; H, trunk against legs; K, knee — is controlled by its own delayed PD
// loop on its own coordinate, which in joint space is a coupled, symmetric gain pattern). It EXTENDS the frozen C3Controller (balance2/c3/c3_ctrl.mjs,
// imported, not modified): C3's COM objective is the A-mode loop (unchanged — it carries the qualified legitimate forward behaviour); BALANCE-1's
// per-leg knee objective is the K-mode analogue (unchanged). B3 adds the missing H-mode loop:
//   coordinate  ξ_H = the mean sagittal HIP angle (trunk against legs; the H eigenmovement of a rigid-trunk model). Spine bending does not change
//               it, so it does not overlap the lumbar / thoracic objectives (the overlap that broke BALANCE-2's C4: balance3/BALANCE3_BODY_AUDIT.md §4),
//               and a whole-body lean (A-mode) does not change it, so it does not overlap the COM objective
//   law         τ_H = −(K_S·G_H·Δξ_H(t − 75 ms) + K_V·G_H·ξ̇_H(t − 30 ms)), applied equally to both hips in the direction that rotates the trunk
//               about the hips; G_H = the trunk's (HAT's) gravitational stiffness about the hips, from the entry statics (body schema);
//               K_S, K_V = Alexandrov 2005 H-mode means (Table 1); no integral (no fitted human model uses one)
//   coordination  the H-mode torque carries an ANKLE companion τ_A = c·τ_H in the direction that cancels the COM shift the trunk correction causes
//               (Alexandrov 2001: the ankle eigenmovement accompanies trunk bending and compensates its centre-of-gravity shift); c is this body's
//               identified ratio (open-loop replay, balance3/evidence/B3_IDENTIFY_OPENLOOP.json), so trunk correction is COM-neutral and the COM
//               (A-mode) loop has nothing to fight
// Output only through the canonical M1b excitation interface (intent added to the same out[] array C3 returns). Causal: delayed channels only;
// G_H, the directions and c are entry / identified constants. No event detection, no outcome input, no gain search.
const RA = new URL("../../", import.meta.url).href, { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL;
const ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates } = await import(PL.P2 + "core/v2_math.js"), D2R = Math.PI / 180;
export class B3Controller extends C3Controller {
  constructor(params) { super(params); this.diag.hm = []; }
  attach(body, plant, c) { super.attach(body, plant, c); const q = this.p.b3, g = this.grp.hat, su = unitStates(c.st), ja = (k) => c.ctrl.jointAt(su, k), piv = V.sc(V.add(ja(this.J.hipL), ja(this.J.hipR)), 0.5), ang = 1e-3;
    // H-mode geometry at the entry: rotate the HAT about the fixed hip axis (+z = backward pitch); the static torque change gives, per hip, the
    // flexion axis, the trunk-forward direction (sign of the change) and the gravitational stiffness G_H (both hips, N·m/rad)
    const t0 = ST.staticsG(c, su, [0, -9.81, 0]).tff, s2 = ST.rotateBodies(su, g.bodies, piv, [0, 0, 1], ang), t2 = ST.staticsG(c, s2, [0, -9.81, 0]).tff;
    this.hm = { hips: g.joints.map(k => { const i = this.ax[k].findIndex(x => x && x.key === "flex"); return { k, i, fwd: Math.sign(t2[k][i] - t0[k][i]) }; }) };
    this.hm.GH = this.hm.hips.reduce((s, r) => s + Math.abs((t2[r.k][r.i] - t0[r.k][r.i]) / ang), 0);
    // ankle companion direction: the COM map's ankle rows push the COM BACKWARD for positive commanded force, so "legs forward" is their opposite
    this.hm.ankles = [this.J.ankL, this.J.ankR].map((k, j) => ({ k, i: this.ankI[j], fwd: -Math.sign(this.Jf[k][this.ankI[j]][0]) }));
    // the hip-flexion sign convention relative to "trunk forward": a forward trunk rotation about the hips increases the anatomical hip angle by s
    this.hm.flexSign = q.flexSign; this.hm.K = q.KS * this.hm.GH; this.hm.D = q.KV * this.hm.GH; this.hm.c = q.ankleCompanion; }
  _hipAngle(O) { return this.hm.hips.reduce((s, r) => s + O.ang[r.k][r.i], 0) / this.hm.hips.length * D2R; }
  control(vw) { const out = super.control(vw), q = this.p.b3; if (!q) return out; const h = this.h, e = this.entry, A = vw[q.channel], R = vw[q.rateChannel];
    const dxi = this.hm.flexSign * (this._hipAngle(A.s) - this._hipAngle(e)), w = this.hm.flexSign * (this._hipAngle(R.s) - this._hipAngle(R.s1)) / h;
    const tH = -(this.hm.K * dxi + this.hm.D * w), tA = this.hm.c * tH; // trunk-forward N·m (both hips); legs-forward N·m (both ankles)
    for (const r of this.hm.hips) out[r.k][r.i] += r.fwd * tH / this.hm.hips.length;
    for (const r of this.hm.ankles) out[r.k][r.i] += r.fwd * tA / this.hm.ankles.length;
    this.diag.hm.push(tH); return out; }
  meta() { return { ...super.meta(), successor: "BALANCE-3 B3", hmode: this.hm }; }
}

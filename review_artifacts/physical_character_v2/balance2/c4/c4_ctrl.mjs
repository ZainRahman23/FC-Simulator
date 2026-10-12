// BALANCE-2 successor C4 (only if adopted by the rule in c4/C4_DESIGN_LOG.md D0). It EXTENDS the frozen C3Controller (c3/c3_ctrl.mjs, imported,
// not modified) — C3's four mechanisms and every gain unchanged — with ONE repair located by the P8 diagnosis (p8/P8_DIAGNOSIS.md): BALANCE-1's
// declared HAT lean objective acts at the hips in AP. BALANCE-1 built the HAT's AP gravity-load map by TRANSLATING the HAT bodies (pelvis and hip
// joint centres included), which leaves the HAT COM's lever about the hips unchanged, so the map is ≈ 0 (3.4 / 0.9 N·m/m instead of ≈ −217 per hip)
// and nothing actively restores the HAT's AP lean (C2 design log D6). The repair:
//   (a) the HAT AP map is computed by ROTATING the HAT about the fixed hip axis — C2's existing, frozen option p.b2.hatMap = "pivot";
//   (b) the HAT objective's DECLARED proportional and derivative terms (kP 1.3, kD 0.45 s — unchanged) act through the corrected map;
//   (c) its AP INTEGRAL stays at zero, as it effectively was in C3 (the defective map multiplied it by ≈ 0): no new integrator is introduced at the
//       hips (the P8 diagnosis shows integral action on a slow posture mode makes a ≈ 9 s oscillation; earlier DEV evidence showed the full repair
//       with the integral worsens overshoot). The ML column, the ML integral and every other objective are C3's.
// Causality: the corrected map is an entry (body-schema) constant computed from the entry geometry; the loop reads the same delayed channels.
const RA = new URL("../../", import.meta.url).href, { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
export class C4Controller extends C3Controller {
  control(vw) { const out = super.control(vw), c4 = this.p.c4 || {}, q = this.p.hat, g = this.grp.hat;
    if (c4.hatApIntegral === false && q && q.kI && g.I) { // remove exactly the AP-integral contribution the base loop just added at the hips, then reset it
      g.joints.forEach((k, jI) => g.Jd[0][jI].forEach((jx, i) => { const ax = this.ax[k][i]; if (!ax || (q.axes && !q.axes.includes(ax.key))) return; out[k][i] -= q.kI * jx * g.I[0]; })); g.I[0] = 0; }
    return out; }
  meta() { return { ...super.meta(), successor: "BALANCE-2 C4", c4: this.p.c4 || null }; }
}

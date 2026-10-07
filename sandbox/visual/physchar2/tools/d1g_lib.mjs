// ═══ physchar2/tools/d1g_lib.mjs — shared D1G record analysis (e2/D1G_TD2C_PREREG.md DG-2 (iii), DG-4 (b), DG-6; U-2 (c, d)), used by tools/td2c_eval.mjs and tools/d1g_eval.mjs.
// guardMetrics(r, tauG): from a harness record's guard trace (td2c.gtr: every non-PASS tick, every tick after one, every invalid tick, each with its preceding tick) and the per-tick mode /
// weight series: the exact law c = w · src (FADE / RAMP) and c = 0 (OFF), to 1e-9 N·m; FADE holds the preceding tick's wrench; the weight law of §I.3 to 1e-12; the guard-attributable
// per-axis step |Δw| · |src| against the E1a-7 commanded bound 30 · 240 / hz; complete fades (PASS → OFF) and ramps (OFF → PASS) lasting τ_g / dt ticks. bCmd(body): 10 × the body's
// largest isometric axis capacity (spec/v2_actuators.js jointAxisCapacities).
import { e2Spec } from "../gates/v2_e2.js"; import { jointAxisCapacities } from "../spec/v2_actuators.js";
const BCMD = {}; export const bCmd = (body) => { if (BCMD[body] == null) { const sp = e2Spec(body), M = sp.bodies.reduce((s2, b) => s2 + b.mass, 0); let mxc = 0; for (const j of sp.joints) { if (!j.def || !j.def.axes) continue; let c; try { c = jointAxisCapacities(j, M); } catch (e) { continue; } for (const k of ["x", "y", "z"]) if (c[k]) mxc = Math.max(mxc, c[k].plus.Nm, c[k].minus.Nm); } BCMD[body] = 10 * mxc; } return BCMD[body]; };
export function guardMetrics(r, TAU_G) { const dt = 1 / r.hz, se = r.series, c = r.td2c, step = dt / TAU_G, rsC = 30 * 240 / r.hz;
  // guard records: exact law, bound, attributable step, fade / ramp lengths
  let lawBad = 0, lawWorst = 0, attrMax = 0, attrBad = 0, srcHoldBad = 0, dwBad = 0, lenBad = 0, nFade = 0, nRamp = 0, heldMax = 0; const G = c.gtr || [];
  for (let j = 0; j < G.length; j++) { const g = G[j];
    for (const a of g.ax) { const [k, i, d1x, d1src, d1w] = a; heldMax = Math.max(heldMax, Math.abs(d1src));
      if (g.mode === "FADE" || g.mode === "RAMP") { const e = Math.abs(d1x - g.w * d1src); lawWorst = Math.max(lawWorst, e); if (e > 1e-9 + 1e-12 * Math.abs(d1src)) lawBad++; }
      if (g.mode === "OFF" && Math.abs(d1x) > 1e-12) lawBad++; }
    const p = j > 0 && Math.abs(G[j - 1].t - g.t + dt) < 1e-6 ? G[j - 1] : null, wPrev = p ? p.w : 1, pm = p ? p.mode : "PASS";
    if (g.mode === "FADE" && (!p || !p.src || !g.src || JSON.stringify(p.src) !== JSON.stringify(g.src))) srcHoldBad++;   // FADE holds the preceding tick's wrench (its last fresh D1, or the held one)
    // the weight law (§I.3): FADE w = w_prev − dt/τ_g; RAMP w = dt/τ_g after OFF, else w_prev + dt/τ_g; OFF only after the last fade step (or with no previous D1); PASS after RAMP only at w_prev + dt/τ_g ≥ 1
    if (g.mode === "FADE" && Math.abs(g.w - (wPrev - step)) > 1e-12) dwBad++;
    if (g.mode === "RAMP" && Math.abs(g.w - (pm === "OFF" ? step : wPrev + step)) > 1e-12) dwBad++;
    if (g.mode === "OFF" && (pm === "FADE" || pm === "RAMP") && !(wPrev - step <= 1e-12)) dwBad++;
    if (g.mode === "PASS" && pm === "RAMP" && !(wPrev + step >= 1 - 1e-12 && g.w === 1)) dwBad++;
    const dw = Math.abs(g.w - wPrev);
    if (dw > 0) for (const a of g.ax) { const s2 = dw * Math.abs(a[3]); attrMax = Math.max(attrMax, s2); if (s2 > rsC + 1e-9) attrBad++; } }
  // fade / ramp lengths (DG-4 (b)) from the per-tick mode / weight series
  const N = Math.round(TAU_G / dt), gm = se.gm, gw = se.gw; for (let i = 1; i < gm.length; i++) { if (gm[i] === 1 && gm[i - 1] === 0) { let j = i; while (j < gm.length && gm[j] === 1) j++; if (j < gm.length && gm[j] === 2) { nFade++; if (j - i + 1 !== N) lenBad++; } }
    if (gm[i] === 3 && gm[i - 1] === 2) { let j = i; while (j < gm.length && gm[j] === 3) j++; if (j < gm.length && gm[j] === 0) { nRamp++; if (j - i + 1 !== N) lenBad++; } } }
  return { lawBad, lawWorst, attrMax, attrBad, attrLimit: rsC, srcHoldBad, dwBad, lenBad, nFade, nRamp, heldMax }; }

// occupy3b/tools/l3_rig.mjs — THE CALIBRATION's EVIDENCE ABOUT THE CANONICAL RIG ITSELF (no Stage 3B involved):
//   (1) THE PUSH RESPONSE — Stage 2's positional root push (shiftPlan, 1 cm lateral) applied at a tick, the next poses compared with the un-pushed
//       run: the fraction of the push each leg point (hip · mid-thigh · knee · mid-shin · ankle) has followed 1 / 4 / 12 ticks later. The legs are
//       world-anchored (their planned footholds): they lag their pushed hip, so relative to it they appear to move toward the push's opposite
//   (2) THE AUTHORED SPEEDS ALONE — the opponent parked 40 m away: each knee's velocity relative to its own hip (lateral / sagittal, body frame),
//       and the drawn pelvis's velocity relative to the root, by action — how much the animation moves a limb, and the body outside its root
//   node l3_rig.mjs
import { ENV, runO3, DT, setOf } from "./l3_common.mjs";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
const q = (A, f) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : 0; }, f2 = (v) => v.toFixed(2);
// ── (1) the push response ──
{ const tc = setOf("l3").find((x) => x.id === "side"), base = runO3(ENV, tc, "S2D", { record: true }), W0 = base.W, t0 = base.t0;
  const pt = (J, a, b, s) => [J[a].j[0] + (J[b].j[0] - J[a].j[0]) * s, J[a].j[1] + (J[b].j[1] - J[a].j[1]) * s, J[a].j[2] + (J[b].j[2] - J[a].j[2]) * s];
  const pts = { hip: (J, X) => J["thigh_" + X].j, "mid-thigh": (J, X) => pt(J, "thigh_" + X, "shin_" + X, 0.5), knee: (J, X) => J["shin_" + X].j, "mid-shin": (J, X) => pt(J, "shin_" + X, "foot_" + X, 0.5), ankle: (J, X) => J["foot_" + X].j };
  const agg = {}; let n = 0;
  for (let tt = -1.6; tt <= 0.4; tt += 0.05) { const k = Math.round((t0 + tt) / DT); n++;
    const R = runO3(ENV, tc, "S2D", { record: true, onTick: (W) => { if (W.k === k) W.shiftPlan(W.def, [0, 0.01], W.def.t, null, 0); } });
    for (const lag of [1, 4, 12]) { const F0 = W0.frames.get(k + lag), F1 = R.W.frames.get(k + lag); if (!F0 || !F1) continue;
      for (const X of ["R", "L"]) for (const [nm, f] of Object.entries(pts)) { const a = f(F0.d.J, X), b = f(F1.d.J, X); (agg[`${lag}|${nm}`] = agg[`${lag}|${nm}`] || []).push((b[1] - a[1]) / 0.01); } } }
  console.log(`(1) THE PUSH RESPONSE — the defender of 'side' (jogging), a 1 cm lateral root push (Stage 2's shiftPlan) at ${n} ticks across a gait cycle: the fraction of the push each point has followed (median [p10 … p90], both legs)`);
  for (const lag of [1, 4, 12]) console.log(`  ${String(lag).padStart(2)} tick${lag > 1 ? "s" : " "} after: ` + Object.keys(pts).map((nm) => { const v = agg[`${lag}|${nm}`]; return `${nm} ${f2(q(v, 0.5))} [${f2(q(v, 0.1))} … ${f2(q(v, 0.9))}]`; }).join(" · ")); }
// ── (2) the authored speeds, alone ──
console.log(`\n(2) THE AUTHORED SPEEDS, ALONE (the opponent parked 40 m away; Stage 2 as decided, nothing acting): m/s, median · p90 · max over t −0.5 … 2.5 s`);
for (const [id, who, label] of [["side", "a", "carry jog (ball)"], ["side", "d", "jog (no ball)"], ["side-run", "a", "carry run"], ["croq-leg", "a", "Croqueta"], ["bf-fake", "a", "Body Feint"], ["headon-walk", "a", "carry walk"], ["in-croq", "d", "Standing Tackle (lunge)"]]) {
  // (alone: the defender parked 40 m away — he runs his own script there; but a tackle needs its carrier: the tackler's window ends at the first
  // touch of their bodies instead, arms aside)
  const tc0 = setOf("l3").find((x) => x.id === id), alone = who === "a" || !tc0.tackle.length ? Object.assign({}, tc0, { def: Object.assign({}, tc0.def, { at: [-40, 30] }), tackle: [] }) : tc0;
  const R = runO3(ENV, alone, "S2D", { record: true }), W = R.W, p = who === "a" ? W.att : W.def; let prev = null, tEnd = 2.5; const KL = [], KS = [], PL = [];
  if (who === "d" && tc0.tackle.length) for (const [k, F] of W.frames) { if (k * DT - R.t0 > -0.5 && detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 }).some((x) => x.both && !/^UARM/.test(x.A) && !/^UARM/.test(x.B))) { tEnd = Math.min(tEnd, k * DT - R.t0); break; } }
  for (const [k, F] of W.frames) { const t = k * DT - R.t0, st = p.stateAt(k * DT), J = F[who].J, psi = st.psi, l = [-Math.sin(psi), Math.cos(psi)], fw = [Math.cos(psi), Math.sin(psi)], pel = [J.pelvis.j[0] - st.P[0], J.pelvis.j[1] - st.P[1]];
    if (prev && prev.k === k - 1 && t > -0.5 && t < tEnd) { for (const X of ["R", "L"]) { const r = (JJ) => [JJ["shin_" + X].j[0] - JJ["thigh_" + X].j[0], JJ["shin_" + X].j[1] - JJ["thigh_" + X].j[1]], a = r(J), b = r(prev.J), v = [(a[0] - b[0]) / DT, (a[1] - b[1]) / DT]; KL.push(Math.abs(v[0] * l[0] + v[1] * l[1])); KS.push(Math.abs(v[0] * fw[0] + v[1] * fw[1])); }
      const vp = [(pel[0] - prev.pel[0]) / DT, (pel[1] - prev.pel[1]) / DT]; PL.push(Math.abs(vp[0] * l[0] + vp[1] * l[1])); }
    prev = { k, J, pel }; }
  console.log(`  ${label.padEnd(24)} (${id} ${who === "a" || !tc0.tackle.length ? `${who === "a" ? "ATT" : "DEF"}, alone` : `DEF, to his first touch at ${tEnd.toFixed(2)} s`}): knee about its hip — lateral ${f2(q(KL, 0.5))} · ${f2(q(KL, 0.9))} · ${f2(q(KL, 1))} · sagittal ${f2(q(KS, 0.5))} · ${f2(q(KS, 0.9))} · ${f2(q(KS, 1))} │ pelvis about the root, lateral ${f2(q(PL, 0.5))} · ${f2(q(PL, 0.9))} · ${f2(q(PL, 1))}`); }

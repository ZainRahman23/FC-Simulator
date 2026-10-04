// ═══ physchar2/gates/v2_g3_checks_v32.js — G3 criteria v3.2 (g3/G3_CRITERIA_v3.2.md): the final symmetry package; J2a tolerances from the final
// controller's floor (v3's unchanged rule); J2b with G3-relevant classes A / B / C (C through the common supervisor abort) and tolerances fixed by
// the pre-registered procedure (characterisation ∪ held-out, 2 × class maximum, user's provisional values where they hold, injection meaningfulness).
// Every other row = v2 / v3. Earlier versions and their results are unchanged.
import { evaluateV3 } from "./v2_g3_checks_v3.js";
export const J2A_TOL_V32 = { lam: 2.2e-14, copMm: 2.3e-11, share: 1.2e-13, footCopMm: 2.2e-11, forceN: 1.2e-10, g3OutS: 2.2e-14, ikResM: 2.2e-14, cmdTauNm: 3.1e-10, cmdGain: 2.2e-10,
  actTauNm: 3.1e-10, actGain: 2.2e-10, actBoundNm: 8.8e-11, actCapNm: 2.2e-11, activation: 9.5e-13, holdMm: 2.2e-11, holdRad: 7e-14 };
// J2b v3.2 tolerances — FILLED by the procedure (G3_CRITERIA_v3.2.md) before the J2b gate evaluation; null = not yet fixed (evaluation refuses)
export const J2B_TOL_V32 = { A: null, B: null, C: null, abortTicks: null };
const num = (x, n = 3) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
export function evaluateV32(R, ext = {}) {
  const base = evaluateV3(R, ext, { tol: J2A_TOL_V32, label: "G3_CRITERIA_v3.2.md" }), checks = base.checks.filter(c => c.id !== "J2b"), mv = ext.mirrorV3, T = J2B_TOL_V32, tick = 1 / 240 + 1e-9;
  const i = checks.findIndex(c => c.id === "J2a") + 1, add = (c) => checks.splice(i, 0, c);
  if (!mv || T.A == null) add({ id: "J2b", name: "mirrored physical-outcome correspondence (v3.2)", pass: false, value: T.A == null ? "tolerances not fixed" : "not run", limit: "—" });
  else { const P = mv.pairs.filter(p => !p.error), bad = [], cl = { A: [], B: [], C: [] }, J = R.jobs.filter(j => !j.error);
    for (const p of P) { const b = p.j2b, lab = `${p.a}/${p.b}${p.human !== "V2-REF" ? " " + p.human : ""}`, why = [], fell = b.fallA != null || b.fallB != null;
      if (b.clsA !== b.clsB) why.push(`class ${b.clsA} / ${b.clsB}`);
      if (fell) { if (b.abortA == null || b.abortB == null) why.push("failure without a common supervisor abort"); else { if (Math.abs(b.abortA - b.abortB) > T.abortTicks * (1 / 240) + 1e-9) why.push(`abort timing ${num(b.abortA, 4)} / ${num(b.abortB, 4)}`); cl.C.push(b.posDiffToAbortMm); if (!(b.posDiffToAbortMm <= T.C)) why.push(`C Δpos through the abort ${num(b.posDiffToAbortMm, 4)} mm > ${T.C}`); } }
      else { const k = b.slidingOnsetS != null ? "B" : "A"; cl[k].push(b.posDiffAllMm); if (!(b.posDiffAllMm <= T[k])) why.push(`${k} Δpos ${num(b.posDiffAllMm, 4)} mm > ${T[k]}`);
        if (k === "B") { const ds = Math.max(Math.abs(b.slipA[0] - b.slipB[1]), Math.abs(b.slipA[1] - b.slipB[0])); if (!(ds <= T.B)) why.push(`|Δslip| ${num(ds, 3)} mm`); }
        if (b.ticksA !== b.ticksB) why.push("run lengths differ"); if (b.abortA != null || b.abortB != null) { if ((b.abortA == null) !== (b.abortB == null) || Math.abs(b.abortA - b.abortB) > T.abortTicks * (1 / 240) + 1e-9) why.push(`abort ${num(b.abortA, 4)} / ${num(b.abortB, 4)}`); } }
      if (why.length) bad.push(`${lab}: ${why.join(", ")}`); }
    const t9 = J.filter(j => j.group === "T9").map(j => Math.abs(j.res.g3.holds.R.loadMean - j.res.g3.holds.L.loadMean)), t9bad = t9.filter(d => d > 1e-3).length, mx = (a) => (a.length ? Math.max(...a) : null);
    add({ id: "J2b", name: `mirrored physical-outcome correspondence (v3.2): A ≤ ${T.A} mm, B ≤ ${T.B} mm, C ≤ ${T.C} mm through the common supervisor abort, abort timing ≤ ${T.abortTicks} ticks; same class`, pass: P.length === 81 && !bad.length && !t9bad,
      value: `${P.length - bad.length}/${mv.pairs.length} pairs (A ${cl.A.length}: max ${num(mx(cl.A), 4)} mm; B ${cl.B.length}: max ${num(mx(cl.B), 3)} mm; C ${cl.C.length}: max ${num(mx(cl.C), 3)} mm through the abort); T9 hold-mean Δ max ${t9.length ? Math.max(...t9).toExponential(1) : "—"}${bad.length ? " · FAIL: " + bad.slice(0, 8).join("; ") : ""}`, limit: `A ${T.A} / B ${T.B} / C ${T.C} mm; ${T.abortTicks} ticks` }); }
  return { criteria: "G3_CRITERIA_v3.2.md", pass: checks.every(c => c.pass), checks }; }

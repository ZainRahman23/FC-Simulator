// ═══ physchar2/gates/v2_g3_checks_v33.js — G3 criteria v3.3 (g3/G3_CRITERIA_v3.3.md; user decision 2026-10-04, Option (a)):
// J2a (controller mirror-equivariance) is the NORMATIVE left/right symmetry gate; J2b (mirrored physical-outcome correspondence of two
// independently evolved runs) is a permanent PLANT MIRROR-DIVERGENCE DIAGNOSTIC — reported by class with distributions and maxima, never gating.
// Every other row, J2a's tolerances and P2 = v3.2 unchanged. Earlier versions (v1, v2, v3, v3.1, v3.2) and their results are unchanged.
import { evaluateV32, J2B_TOL_V32 } from "./v2_g3_checks_v32.js";
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null; };
const dist = (a) => ({ n: a.length, median: q(a, 0.5), p90: q(a, 0.9), p99: q(a, 0.99), max: a.length ? Math.max(...a) : null });
const num = (x, n = 3) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
// J2b diagnostic of the 81 G3 pairs: classes as v3.2 (A no meaningful slide, B slide + recovery, C failure through the common supervisor abort;
// failures without a common abort and class mismatches are listed), per-class distributions, abort-timing distribution, the v3.2 reference values
export function j2bDiagnostic(mv) {
  const P = mv.pairs.filter(p => !p.error), cl = { A: [], B: [], C: [] }, abortTicks = [], mismatch = [], noCommonAbort = [], aboveRef = [];
  for (const p of P) { const b = p.j2b, lab = `${p.a}/${p.b}${p.human !== "V2-REF" ? " " + p.human : ""}`, fell = b.fallA != null || b.fallB != null;
    if (b.clsA !== b.clsB) mismatch.push(`${lab}: ${b.clsA} / ${b.clsB}`);
    if (fell) { if (b.abortA == null || b.abortB == null) { noCommonAbort.push(lab); continue; } cl.C.push(b.posDiffToAbortMm); abortTicks.push(Math.round(Math.abs(b.abortA - b.abortB) * 240)); if (b.posDiffToAbortMm > J2B_TOL_V32.C) aboveRef.push(`${lab} C ${num(b.posDiffToAbortMm, 4)}`); }
    else { const k = b.slidingOnsetS != null ? "B" : "A"; cl[k].push(b.posDiffAllMm); if (b.posDiffAllMm > J2B_TOL_V32[k]) aboveRef.push(`${lab} ${k} ${num(b.posDiffAllMm, 4)}`); } }
  return { pairs: P.length, classes: { A: dist(cl.A), B: dist(cl.B), C: dist(cl.C) }, abortTicks: abortTicks.reduce((o, v) => ((o[v] = (o[v] || 0) + 1), o), {}), classMismatch: mismatch, failureWithoutCommonAbort: noCommonAbort,
    referenceValues: J2B_TOL_V32, aboveReference: aboveRef };
}
export function evaluateV33(R, ext = {}) {
  const v32 = evaluateV32(R, ext), checks = v32.checks.map(c => ({ ...c })), i = checks.findIndex(c => c.id === "J2b"), mv = ext.mirrorV3;
  if (i >= 0) { const d = mv ? j2bDiagnostic(mv) : null, c = d ? d.classes : null;
    checks[i] = { id: "J2b", reportOnly: true, pass: true, diagnostic: d,
      name: "J2b — DIAGNOSTIC (not gating since v3.3): plant mirror divergence of independently evolved mirrored runs, by class",
      value: d ? `${d.pairs} pairs · A (no meaningful slide) n ${c.A.n}: median ${num(c.A.median, 4)} / p99 ${num(c.A.p99, 4)} / max ${num(c.A.max, 4)} mm · B (slide + recovery) n ${c.B.n}: median ${num(c.B.median, 3)} / max ${num(c.B.max, 3)} mm · C (failure through the common abort) n ${c.C.n}: median ${num(c.C.median, 3)} / max ${num(c.C.max, 3)} mm; abort Δ ticks ${JSON.stringify(d.abortTicks)} · class mismatches ${d.classMismatch.length}; failures without a common abort ${d.failureWithoutCommonAbort.length}; above the v3.2 reference values (A ${J2B_TOL_V32.A} / B ${J2B_TOL_V32.B} / C ${J2B_TOL_V32.C} mm, ${J2B_TOL_V32.abortTicks} ticks) ${d.aboveReference.length}` : "not run",
      limit: "reported, not gated (v3.3)" }; }
  const gating = checks.filter(c => !c.reportOnly), pass = gating.every(c => c.pass);
  return { criteria: "G3_CRITERIA_v3.3.md", pass, declared: pass, rowsPass: checks.filter(c => c.pass).length, rows: checks.length, gatingRows: gating.length, checks };
}

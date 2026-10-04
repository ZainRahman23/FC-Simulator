// ═══ physchar2/gates/v2_g3_checks_v3.js — evaluation of g3/G3_CRITERIA_v3.md: a POST-INVESTIGATION CORRECTION of v2 row J2 (pure functions) ════
// v2 row J2 conflated controller symmetry with the plant's physical mirror floor (it compared the commanded CoP of two independently evolved runs
// and banded falls after the loss of balance; g3/G3_REVALIDATION_FLAT_PLANE.md §2). User decision 2026-10-03
// (sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md) replaces it by two separate rows; every other row is v2's, unchanged:
//   J2a — controller mirror-equivariance: the controller fed the exact mirror image of a real state returns the mirror image of its output, to
//         the DETERMINISTIC NUMERICAL FLOOR (tolerances below, fixed from the floor experiment json/g3_mirror_floor.json before the gate run);
//   J2b — mirrored physical-outcome symmetry (paired runs), the D4 interpretation, failing requests compared only through the common
//         abort / failure declaration.
// v2 (and its J2) stays the historical evaluation of the same run.
import { evaluateV2 } from "./v2_g3_checks_v2.js";
const num = (x, n = 2) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n)), sci = (x) => (x == null || !Number.isFinite(x) ? "—" : (+x).toExponential(2));
// J2a tolerances = max(10 × measured floor, 100·ε × natural scale); floor: 81 pairs, 27,709 states, ≤ 4-ulp perturbations of every physical input
export const J2A_TOL = { lam: 2.2e-14, copMm: 2.2e-11, share: 7.7e-14, footCopMm: 2.4e-11, forceN: 7.2e-11, g3OutS: 2.2e-14, ikResM: 2.2e-10, sigmaErr: 2.2e-14, cmdTauNm: 2.1e-6, cmdGain: 2.2e-10,
  actTauNm: 2.1e-6, actGain: 2.2e-10, actBoundNm: 6.5e-7, actCapNm: 2.2e-11, activation: 4.2e-9, holdMm: 2.2e-11, holdRad: 7e-14 };
export const J2B = { nonSlidingMm: 0.1, slidingMm: 2.0, tick: 1 / 240 + 1e-9, t9HoldMean: 1e-3 };
export function evaluateV3(R, ext = {}, opt = {}) {   // opt (v3.1, G3_CRITERIA_v3.1_ERRATUM.md): { tol, label } — the v3 defaults are unchanged
  const TOL = opt.tol || J2A_TOL;
  const v2 = evaluateV2(R, ext), checks = [], add = (id, name, pass, value, limit, extra = {}) => checks.push({ id, name, pass: !!pass, value, limit, ...extra });
  const mv = ext.mirrorV3, J = R.jobs.filter(j => !j.error);
  for (const c of v2.checks) {
    if (c.id !== "J2") { checks.push(c); continue; }
    if (!mv) { add("J2a", "controller mirror-equivariance (mirrored-input probe)", false, "not run", "all pairs"); add("J2b", "mirrored physical-outcome symmetry (paired runs)", false, "not run", "all pairs"); continue; }
    const P = mv.pairs.filter(p => !p.error), lab = (p) => `${p.a}/${p.b}${p.human !== "V2-REF" ? " " + p.human : ""}`;
    // ── J2a ──
    { const bad = [], worst = {}; let ticks = 0, post = 0;
      for (const p of P) { const a = p.j2a, why = []; ticks += a.ticks; post += a.postTicks;
        if (!(a.ticks > 0)) why.push("no ticks probed"); if (a.selfMax !== 0) why.push(`self-check replay not bit-exact (${sci(a.selfMax)})`);
        for (const b of a.bad) why.push(`${b.self ? "self-check" : b.side + "→mirror"} t ${num(b.t, 3)}: ${b.bad.join("/")} differs`);
        for (const [k, tol] of Object.entries(TOL)) { const v = a.pre[k]; if (v == null) continue; if (!(v <= (worst[k]?.v ?? -1))) worst[k] = { v, at: lab(p) }; if (v > tol) why.push(`${k} ${sci(v)} > ${sci(tol)}`); }
        if (why.length) bad.push(`${lab(p)}: ${why.slice(0, 4).join(", ")}${why.length > 4 ? ` (+${why.length - 4})` : ""}`); }
      add("J2a", "controller mirror-equivariance: mirrored real input → mirrored output (λ, CoP, share, per-foot CoP / force, joint + actuator commands, support / hold / abort decisions) to the numerical floor", P.length === mv.pairs.length && P.length === 81 && !bad.length,
        `${P.length - bad.length}/${mv.pairs.length} pairs; ${ticks} ticks probed (both directions, up to each fall) · worst: ${Object.entries(worst).map(([k, w]) => `${k} ${sci(w.v)}`).join(", ")}${bad.length ? " · FAIL: " + bad.slice(0, 8).join("; ") + (bad.length > 8 ? ` … (+${bad.length - 8})` : "") : ""} · post-fall ticks (reported, not gated): ${post}`,
        "per-output tolerance = max(10 × floor, 100·ε·scale); discrete decisions identical; replay self-check bit-exact", { worst, bad }); }
    // ── J2b ──
    { const bad = [], cls = { nonSliding: 0, sliding: 0, failing: 0 }, wmax = { nonSliding: 0, sliding: 0, failing: 0 };
      for (const p of P) { const b = p.j2b, why = [], fellA = b.fallA != null, fellB = b.fallB != null;
        if (b.clsA !== b.clsB) why.push(`class ${b.clsA} / ${b.clsB}`);
        if ((b.abortA == null) !== (b.abortB == null) || (b.abortA != null && Math.abs(b.abortA - b.abortB) > J2B.tick)) why.push(`abort ${num(b.abortA, 4)} / ${num(b.abortB, 4)}`);
        if (fellA || fellB) { cls.failing++;   // a physically failing request: same failure, compatible timing, positions only through the common declaration
          if (fellA !== fellB || Math.abs(b.fallA - b.fallB) > J2B.tick) why.push(`failure timing ${num(b.fallA, 4)} / ${num(b.fallB, 4)}`);
          const W = b.abortCommon != null ? b.abortCommon : b.fallFirst, d = b.abortCommon != null ? b.posDiffToAbortMm : b.posDiffToFallMm, lim = b.slidingOnsetS != null && b.slidingOnsetS <= W + 1e-12 ? J2B.slidingMm : J2B.nonSlidingMm;
          wmax.failing = Math.max(wmax.failing, d); if (!(d <= lim)) why.push(`Δpos through the ${b.abortCommon != null ? "abort" : "failure"} ${num(d, 3)} mm > ${lim}`); }
        else if (b.slidingOnsetS != null) { cls.sliding++; wmax.sliding = Math.max(wmax.sliding, b.posDiffAllMm); const ds = Math.max(Math.abs(b.slipA[0] - b.slipB[1]), Math.abs(b.slipA[1] - b.slipB[0]));
          if (!(b.posDiffAllMm <= J2B.slidingMm)) why.push(`sliding Δpos ${num(b.posDiffAllMm, 3)} mm`); if (!(ds <= J2B.slidingMm)) why.push(`|Δslip| ${num(ds, 3)} mm`); if (b.ticksA !== b.ticksB) why.push("run lengths differ"); }
        else { cls.nonSliding++; wmax.nonSliding = Math.max(wmax.nonSliding, b.posDiffAllMm); if (!(b.posDiffAllMm <= J2B.nonSlidingMm)) why.push(`non-sliding Δpos ${num(b.posDiffAllMm, 4)} mm`); if (b.ticksA !== b.ticksB) why.push("run lengths differ"); }
        if (why.length) bad.push(`${lab(p)}: ${why.join(", ")}`); }
      const t9 = J.filter(j => j.group === "T9").map(j => ({ h: j.human, d: Math.abs(j.res.g3.holds.R.loadMean - j.res.g3.holds.L.loadMean) })), t9bad = t9.filter(x => x.d > J2B.t9HoldMean);
      add("J2b", "mirrored physical-outcome symmetry: non-sliding Δpos ≤ 0.1 mm; sliding with continued control: same class, Δpos and |Δslip| ≤ 2 mm; failing: same failure, timing ≤ 1 tick, Δpos only through the common abort / failure declaration", P.length === 81 && !bad.length && !t9bad.length,
        `${P.length - bad.length}/${mv.pairs.length} pairs (non-sliding ${cls.nonSliding}: max ${num(wmax.nonSliding, 4)} mm; sliding, recovered ${cls.sliding}: max ${num(wmax.sliding, 3)} mm; failing ${cls.failing}: max through the declaration ${num(wmax.failing, 3)} mm); T9 R/L hold-mean Δ max ${t9.length ? Math.max(...t9.map(x => x.d)).toExponential(1) : "—"}${bad.length ? " · FAIL: " + bad.slice(0, 8).join("; ") : ""}${t9bad.length ? " · T9: " + t9bad.map(x => x.h).join(", ") : ""}`,
        "0.1 mm / 2.0 mm (D4); abort and failure timing ≤ 1 tick; T9 hold means ≤ 1e-3", { bad, classes: cls }); }
  }
  return { criteria: opt.label || "G3_CRITERIA_v3.md (post-investigation correction of v2 row J2)", pass: checks.every(c => c.pass), checks }; }

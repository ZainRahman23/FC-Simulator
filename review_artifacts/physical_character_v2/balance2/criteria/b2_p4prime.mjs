// BALANCE-2 P4′ — the corrected continuum criterion (a TEST correction; frozen before any successor is evaluated with it; BALANCE-2
// criteria/P4_CORRECTION.md). Input: a BALANCE-1-format qualification result Q (Q.P.runs["<dir>.<level>"] with .J, .recovery.fall {t} | null,
// .recovery.comPeakMm, .comTrace [[ms, mm], ...] at 25 ms resolution from the onset). Levels are ordered by impulse.
// (a) outcome order: the falling levels are upward-closed (no fall at a smaller impulse while a larger one stands);
// (b) graded response below failure: among the NON-FALLING levels, the peak COM excursion against the twin strictly increases with impulse;
// (c) graded failure: among the FALLING levels, the time from onset to failure is non-increasing with impulse (tolerance one battery step, 1/240 s);
// (d) graded through the boundary: the |COM excursion| at a common early time t* strictly increases across ALL levels, t* = 250 ms, or 25 ms
//     before the earliest failure of that direction if any failure is earlier (so every level is still compared on a pre-failure state).
export const P4P_TEXT = "P4′ continuum (corrected): per direction, with levels ordered by impulse — (a) falls are upward-closed; (b) peak COM excursion strictly increases across the non-falling levels; (c) time to failure is non-increasing across the falling levels (± 1/240 s); (d) |COM excursion| at a common pre-failure time t* (250 ms, or 25 ms before the direction's earliest failure) strictly increases across all levels";
export function p4prime(Q, dirs = ["fwd", "back", "left", "right"], levels = ["small", "moderate", "limit", "over"]) { const res = {};
  for (const d of dirs) { const L = levels.map(m => ({ m, ...Q.P.runs[d + "." + m] })).sort((x, y) => x.J - y.J), fall = L.map(r => !!(r.recovery && r.recovery.fall));
    const a = fall.every((f, i) => !f || fall.slice(i).every(Boolean)), nf = L.filter((r, i) => !fall[i]), fl = L.filter((r, i) => fall[i]);
    const b = nf.every((r, i) => i === 0 || nf[i - 1].recovery.comPeakMm < r.recovery.comPeakMm), c = fl.every((r, i) => i === 0 || r.recovery.fall.t <= fl[i - 1].recovery.fall.t + 1 / 240 + 1e-9);
    const tFail = fl.length ? Math.min(...fl.map(r => r.recovery.fall.t)) * 1000 : Infinity, tStar = Math.min(250, Math.floor((tFail - 25) / 25) * 25);
    const ex = L.map(r => { const p = r.comTrace.reduce((best, q) => (Math.abs(q[0] - tStar) < Math.abs(best[0] - tStar) ? q : best), r.comTrace[0]); return Math.abs(p[1]); });
    const dd = tStar > 0 && ex.every((x, i) => i === 0 || ex[i - 1] < x);
    res[d] = { pass: a && b && c && dd, a, b, c, d: dd, tStarMs: tStar, excursionAtTStarMm: ex.map(x => +x.toFixed(2)), fallTimesS: L.map(r => (r.recovery.fall ? +r.recovery.fall.t.toFixed(4) : null)), peaksNonFallingMm: nf.map(r => +r.recovery.comPeakMm.toFixed(1)) }; }
  return { id: "P4′", text: P4P_TEXT, pass: Object.values(res).every(r => r.pass), perDirection: res }; }

// occupy3/tools/o3_identity.mjs — §1 / §21 THE EXACT STAGE 2 COMPARISON: STAGE 3 against STAGE 2 AS DECIDED (S2D), identical inputs, every tick —
// the two roots, the ball, the authority and both posed bodies (every joint): identical to the bit until Stage 3's first IMPACT (its onset tick),
// and identical throughout when no contact was meaningful. Also S2D against S2 (the owner's one decision: the soft wall spares a planned move's
// approach) — where the two differ at all, and from when.
//   node o3_identity.mjs --set review|search|moves|matrix [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf as setO2 } from "../../occupy2/tools/o2_metrics.mjs";
import { O3CASES, MATRIX } from "../o3_cases.js";
import { runO3 } from "../o3_run.js";
import "../o3_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), DT = 1 / 240;
export const setOf = (S) => (S === "review" ? O3CASES.slice() : S === "matrix" ? MATRIX.slice() : setO2(S));
// the per-tick record, LIVE (each tick as it is simulated — a plan shifted later in place would rewrite the past when read back after the run):
// both roots, the ball, the authority's state; and both bodies' joints (the recorded live poses)
const live = () => { const L = new Map(); return { L, onTick: (W) => { const t = W.att.t; L.set(W.k, { a: W.att.stateAt(t).P.slice(), d: W.def.stateAt(t).P.slice(), b: W.ball.p.slice(), au: W.auth.state + (W.auth.id || "") }); } }; };
function trace(R, L) { const W = R.W, T = new Map(); for (const [k, F] of W.frames) { const q = L.get(k); if (!q) continue; T.set(k, { a: q.a, d: q.d, b: q.b, au: q.au, J: [F.a.J, F.d.J] }); } return T; }
const jDiff = (A, B) => { let m = 0; for (const nm in A) for (const f of ["j", "t"]) for (let i = 0; i < 3; i++) m = Math.max(m, Math.abs(A[nm][f][i] - B[nm][f][i])); return m; };
function compare(TA, TB, kStop = Infinity) { let maxRoot = 0, maxJ = 0, first = null, n = 0; for (const [k, a] of TA) { if (k >= kStop) break; const b = TB.get(k); if (!b) continue; n++;
    const dr = Math.max(Math.hypot(a.a[0] - b.a[0], a.a[1] - b.a[1]), Math.hypot(a.d[0] - b.d[0], a.d[1] - b.d[1]), Math.hypot(a.b[0] - b.b[0], a.b[1] - b.b[1], a.b[2] - b.b[2]), a.au === b.au ? 0 : 1), dj = Math.max(jDiff(a.J[0], b.J[0]), jDiff(a.J[1], b.J[1])); maxRoot = Math.max(maxRoot, dr); maxJ = Math.max(maxJ, dj); if (first == null && (dr > 0 || dj > 0)) first = k; }
  return { maxRoot, maxJ, first, n }; }
if (process.argv[1] && process.argv[1].endsWith("o3_identity.mjs")) {
  const L = setOf(SET), rows = []; let nImp = 0, nNo = 0, bad = 0, s2dDiff = 0;
  for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
    const l2 = live(), l3 = live(), l0 = live(), R2 = runO3(ENV, tc, "S2D", { record: true, onTick: l2.onTick }), R3 = runO3(ENV, tc, "S3", { record: true, onTick: l3.onTick }), R0 = runO3(ENV, tc, "S2", { record: true, onTick: l0.onTick }), T2 = trace(R2, l2.L), T3 = trace(R3, l3.L), T0 = trace(R0, l0.L);
    const eps = R3.W.imp.episodes, kOn = eps.length ? Math.min(...eps.map((e) => e.kA)) : Infinity, pre = compare(T2, T3, kOn), all = compare(T2, T3), dec = compare(T0, T2);
    const ok = pre.maxRoot === 0 && pre.maxJ === 0 && (eps.length || (all.maxRoot === 0 && all.maxJ === 0)); if (!ok) bad++; if (eps.length) nImp++; else nNo++; if (dec.first != null) s2dDiff++;
    rows.push({ id: tc.id, impact: eps.length, onset: kOn === Infinity ? null : +(kOn * DT - R3.t0).toFixed(4), preTicks: pre.n, preRoot: pre.maxRoot, preJ: pre.maxJ, after: eps.length ? { root: +all.maxRoot.toFixed(4), J: +all.maxJ.toFixed(4) } : null, identical: ok, s2dFirst: dec.first == null ? null : +(dec.first * DT - R0.t0).toFixed(3), s2dRoot: +dec.maxRoot.toFixed(4) }); }
  console.log(`§1 / §21 THE EXACT STAGE 2 COMPARISON — set ${SET} (${rows.length} encounters): STAGE 3 vs STAGE 2 AS DECIDED, every tick (both roots, the ball, the authority, every joint of both bodies)`);
  console.log(`  identical to the bit before the first impact (or throughout, no impact): ${rows.length - bad} / ${rows.length}   (with an impact: ${nImp}; no meaningful contact: ${nNo}, all identical throughout: ${rows.filter((r) => !r.impact && r.identical).length})`);
  console.log(`  STAGE 2 AS DECIDED vs AS PRESENTED (the soft wall spares a planned move's approach): differ in ${s2dDiff} / ${rows.length}`);
  if (bad) for (const r of rows.filter((x) => !x.identical)) console.log(`  NOT IDENTICAL: ${r.id} before onset root ${r.preRoot} joints ${r.preJ}`);
  console.log(`${"case".padEnd(30)}${"impact at".padStart(10)}${"ticks before".padStart(14)}${"identical".padStart(11)}${"after: root / joints cm".padStart(26)}${"S2D≠S2 from".padStart(13)}`);
  for (const r of rows) console.log(`${r.id.slice(0, 29).padEnd(30)}${(r.onset == null ? "—" : r.onset.toFixed(3)).padStart(10)}${String(r.preTicks).padStart(14)}${(r.identical ? "yes" : "NO").padStart(11)}${(r.after ? `${(r.after.root * 100).toFixed(1)} / ${(r.after.J * 100).toFixed(1)}` : "—").padStart(26)}${(r.s2dFirst == null ? "—" : r.s2dFirst.toFixed(3)).padStart(13)}`);
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));
}

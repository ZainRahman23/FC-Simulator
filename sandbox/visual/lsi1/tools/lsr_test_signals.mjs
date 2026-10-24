// lsi1/tools/lsr_test_signals.mjs — RECORDER TESTS (node): the eight synthetic traces through the derived signals and the diagnostic events, at
// 60 Hz, 120 Hz and 60 Hz with ±4 ms frame jitter; each checked against its analytic value. Exit code 1 on any failure.
//   node lsr_test_signals.mjs [--json out.json]
import { analyzeSamples } from "../lsr_signals.js";
import { SYNTH, sampleTrace } from "../lsr_synth.js";
import fs from "node:fs";
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const maxAbs = (R, k) => R.reduce((m, r) => (r[k] != null && Math.abs(r[k]) > m ? Math.abs(r[k]) : m), 0);
// the largest change over a window W of an eased (half-cosine) turn of A degrees over T seconds: A·sin(πW / 2T) for W < T, else A
const easedWin = (A, T, W) => (W >= T ? A : A * Math.sin((Math.PI * W) / (2 * T)));
const RATES = [{ id: "60 Hz", hz: 60, j: 0 }, { id: "120 Hz", hz: 120, j: 0 }, { id: "60 Hz ±4 ms", hz: 60, j: 0.008 }];
const out = [], fails = [];
for (const T of SYNTH) for (const R of RATES) {
  const S = sampleTrace(T, R.hz, R.j, 7), { rows, events } = analyzeSamples(S), cnt = (k) => events.filter((e) => e.kind === k).length;
  const travel = rows.reduce((a, r) => a + (r.dth != null ? Math.abs(r.dth) : 0), 0), first = rows.find((r) => r.th != null);
  const m = { trace: T.id, rate: R.id, n: rows.length, travel: +travel.toFixed(2), peakOm: +maxAbs(rows, "om").toFixed(1), d50: +maxAbs(rows, "d50").toFixed(2), d100: +maxAbs(rows, "d100").toFixed(2), d150: +maxAbs(rows, "d150").toFixed(2),
    d250: +maxAbs(rows, "d250").toFixed(2), d500: +maxAbs(rows, "d500").toFixed(2), startDir: first ? +first.th.toFixed(2) : null, maxR: +Math.max(...rows.map((r) => r.r)).toFixed(3),
    ev: Object.fromEntries(["dz_enter", "dz_exit", "near_neutral", "centre_cross", "reversal", "large_turn", "mag_spike", "mag_release", "dir_hold"].map((k) => [k, cnt(k)])) };
  const chk = [], ok = (name, c, detail) => { chk.push({ name, pass: !!c, detail }); if (!c) fails.push(`${T.id} @ ${R.id}: ${name} (${detail})`); };
  const near = (v, e, tol) => Math.abs(v - e) <= tol;
  const E = m.ev, none = (...ks) => ks.every((k) => E[k] === 0);
  if (T.id === "straight_hold") { ok("no angular travel", m.travel < 0.01, m.travel); ok("no turn / reversal / crossing / deadzone events", none("reversal", "large_turn", "centre_cross", "dz_enter", "dz_exit"), JSON.stringify(E)); ok("one direction hold", E.dir_hold === 1, E.dir_hold); }
  if (T.id === "smooth_45" || T.id === "smooth_90") { const A = T.id === "smooth_45" ? 45 : 90, D = T.id === "smooth_45" ? 0.6 : 0.8;
    ok(`travel ${A}°`, near(m.travel, A, 0.05), m.travel); ok("peak ω (analytic A·π/2T)", Math.abs(m.peakOm / T.expect.peakOm - 1) < 0.03, `${m.peakOm} vs ${T.expect.peakOm.toFixed(1)}`);
    for (const W of [100, 150, 250, 500]) ok(`max Δ${W} ms (analytic A·sin(πW/2T))`, Math.abs(m["d" + W] - easedWin(A, D, W / 1000)) < Math.max(0.8, 0.04 * easedWin(A, D, W / 1000)), `${m["d" + W]} vs ${easedWin(A, D, W / 1000).toFixed(2)}`);
    ok("no reversal / crossing / deadzone events", none("reversal", "centre_cross", "dz_enter", "dz_exit"), JSON.stringify(E)); ok("no large-turn marker (|Δ250| stays below 60°)", E.large_turn === 0, E.large_turn); ok("a direction hold before and after", E.dir_hold === 2, E.dir_hold); }
  if (T.id === "rapid_90") { ok("travel 90°", near(m.travel, 90, 0.05), m.travel); ok("max Δ100 = 90°", near(m.d100, 90, 0.5), m.d100); ok("one large-turn marker", E.large_turn === 1, E.large_turn); ok("no reversal / crossing", none("reversal", "centre_cross"), JSON.stringify(E)); ok("peak ω ≥ 1500°/s", m.peakOm >= 1500, m.peakOm); }
  if (T.id === "reversal_180" || T.id === "right_left") { ok("travel 180°", near(m.travel, 180, 0.5), m.travel); ok("one centre crossing", E.centre_cross === 1, E.centre_cross); ok("one rapid reversal", E.reversal === 1, E.reversal); ok("the magnitude dips near neutral (≥ 1 near-neutral or a segment crossing)", E.near_neutral >= 1 || E.centre_cross === 1, E.near_neutral); }
  if (T.id === "neutral_dir") { ok("one deadzone exit", E.dz_exit === 1, E.dz_exit); ok("one magnitude spike", E.mag_spike === 1, E.mag_spike); ok("start direction +30°", near(m.startDir, 30, 0.01), m.startDir); ok("one direction hold", E.dir_hold === 1, E.dir_hold); ok("no crossing / reversal", none("centre_cross", "reversal"), JSON.stringify(E)); }
  if (T.id === "dir_neutral") { ok("one deadzone entry", E.dz_enter === 1, E.dz_enter); ok("one magnitude release", E.mag_release === 1, E.mag_release); ok("one near-neutral", E.near_neutral === 1, E.near_neutral); ok("no crossing / reversal", none("centre_cross", "reversal"), JSON.stringify(E)); }
  m.checks = chk; out.push(m);
}
const pad = (s, n) => String(s).padEnd(n), num = (v, n) => String(v).padStart(n);
console.log(`RECORDER TESTS — derived signals on the eight synthetic traces (lsr_synth.js) · ${out.length} runs\n`);
console.log(pad("trace", 15) + pad("rate", 13) + num("n", 4) + num("travel°", 9) + num("peak ω°/s", 11) + num("Δ50", 8) + num("Δ100", 8) + num("Δ150", 8) + num("Δ250", 8) + num("Δ500", 8) + "  events (non-zero)   checks");
for (const m of out) console.log(pad(m.trace, 15) + pad(m.rate, 13) + num(m.n, 4) + num(m.travel, 9) + num(m.peakOm, 11) + num(m.d50, 8) + num(m.d100, 8) + num(m.d150, 8) + num(m.d250, 8) + num(m.d500, 8) + "  " +
  pad(Object.entries(m.ev).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", "), 58) + ` ${m.checks.filter((c) => c.pass).length}/${m.checks.length}`);
console.log(fails.length ? `\nFAIL ${fails.length}:\n  ` + fails.join("\n  ") : `\nALL ${out.reduce((a, m) => a + m.checks.length, 0)} CHECKS PASS`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
process.exit(fails.length ? 1 : 0);

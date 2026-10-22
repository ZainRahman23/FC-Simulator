// speed99/tools/s_matrix.mjs — THE BALL-OFF PACE MATRIX (owner §12, §15): the authoritative simulation (BALL OFF, FULL stack, A99-C) under each
// pace profile, measured on the centre of mass the simulation integrates (never the animation):
//   STARTS      standing / walk / jog / run → SPRINT straight: time and speed at 5 / 10 / 20 / 30 / 40 m from the press, the peak acceleration,
//               the time to 90 / 95 % of the profile's top speed, the top speed reached
//   SLOWING     sprint → release (sprint button off: RUN) · sprint → jog · sprint → stop (stick released): time to the new speed / to rest, distance
//   CUTS        at top speed, a snap of 45 / 90 / 120 / 180° held at sprint: entry, minimum, the new line (travel within 15° of the new heading at
//               ≥ 40 % of top speed, held 0.1 s) and the speed then, the time back to 70 / 90 / 95 % of top speed, the distance gained in 2 s
//   REPEATED    sprint, 90° cut left / right every 1.5 s for 12 s: mean speed, distance, the slowest point
//   LONG        60 m straight from standing
//   CURVES      jog → sprint while the stick turns 10 / 20 / 45°/s: the speed after 1 / 2 / 4 s
//   node s_matrix.mjs [--pace CURRENT,A,B,C] [--json f]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { PACE } from "../pace.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
export const mk = (pace) => makeSim("TL", { layers: presetLayers("FULL"), ballOn: false, attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, pace });
const R = (h, mode) => ({ h, mode, keys: 64 });
export const vTop = (pace) => (PACE[pace] && PACE[pace].vmax) || 8.0;
// (run a request function f(t) for dur seconds from a prepared state; record every tick)
function drive(sim, f, dur) { const t0 = sim.t, rec = []; for (let k = 0; k < Math.round(dur / DT); k++) { const t = k * DT; sim.step(f(t)); const st = sim.stateAt(sim.t); rec.push({ t: sim.t - t0, P: st.P.slice(), s: st.s, h: st.h }); } return rec; }
export function starts(pace) { const out = {};
  for (const [name, pre, dur] of [["standing", null, 1.0], ["walk", "WALK", 3], ["jog", "JOG", 3], ["run", "RUN", 3]]) { const sim = mk(pace);
    drive(sim, () => (pre ? R(0, pre) : R(null, "RUN")), dur); const s0 = sim.stateAt(sim.t).s, P0 = sim.stateAt(sim.t).P.slice(), rec = drive(sim, () => R(0, "SPRINT"), 9), V = vTop(pace);
    const o = { entry: +s0.toFixed(2), marks: {}, peakAcc: 0, vmax: 0, t90: null, t95: null, pct: {}, vAt: {} };
    for (let i = 0; i < rec.length; i++) { const r = rec[i], d = r.P[0] - P0[0], a = i ? (r.s - rec[i - 1].s) / DT : (r.s - s0) / DT; o.peakAcc = Math.max(o.peakAcc, a); o.vmax = Math.max(o.vmax, r.s);
      for (const m of [5, 10, 20, 30, 40]) if (o.marks[m] == null && d >= m) o.marks[m] = { t: +r.t.toFixed(3), v: +r.s.toFixed(2) };
      if (o.t90 == null && r.s >= 0.9 * V) o.t90 = { t: +r.t.toFixed(2), d: +d.toFixed(1) }; if (o.t95 == null && r.s >= 0.95 * V) o.t95 = { t: +r.t.toFixed(2), d: +d.toFixed(1) };
      for (const q of [25, 50, 70, 80, 90, 95, 99]) if (o.pct[q] == null && r.s >= q / 100 * V - 1e-9) o.pct[q] = { t: +r.t.toFixed(3), d: +d.toFixed(1) }; }
    for (const q of [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]) o.vAt[q] = +rec[Math.round(q / DT) - 1].s.toFixed(2);
    // (the speed every 0.1 s over the first 1.5 s — the first steps)
    o.first = [0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.5].map((x) => +rec[Math.round(x / DT) - 1].s.toFixed(2)); o.peakAcc = +o.peakAcc.toFixed(2); o.vmax = +o.vmax.toFixed(2); out[name] = o; }
  return out; }
// (a sprint at top speed first: 6 s straight from standing)
function atTop(pace) { const sim = mk(pace); drive(sim, () => R(null, "RUN"), 0.5); drive(sim, () => R(0, "SPRINT"), 6); return sim; }
export function slowing(pace) { const out = {};
  for (const [name, f, target] of [["sprint → release (RUN)", () => R(0, "RUN"), 5.3], ["sprint → jog", () => R(0, "JOG"), 3.2], ["sprint → stop", () => R(null, "RUN"), 0]]) { const sim = atTop(pace), s0 = sim.stateAt(sim.t).s, P0 = sim.stateAt(sim.t).P.slice(), rec = drive(sim, f, 3);
    const hitAt = rec.find((r) => r.s <= target + 0.05), d = hitAt ? hyp(hitAt.P[0] - P0[0], hitAt.P[1] - P0[1]) : null; out[name] = { entry: +s0.toFixed(2), t: hitAt ? +hitAt.t.toFixed(2) : null, d: d == null ? null : +d.toFixed(2) }; }
  return out; }
export function cuts(pace) { const out = {}, V = vTop(pace);
  for (const ang of [45, 60, 90, 120, 180]) { const sim = atTop(pace), s0 = sim.stateAt(sim.t).s, P0 = sim.stateAt(sim.t).P.slice(), hN = ang * DEG, rec = drive(sim, () => R(hN, "SPRINT"), 4);
    let vmin = 99, tMin = 0, line = null, ls = null; const back = {};
    for (const r of rec) { if (r.s < vmin) { vmin = r.s; tMin = r.t; } if (line == null) { if (r.s >= 0.4 * V && Math.abs(wrap(r.h - hN)) < 15 * DEG) { if (ls == null) ls = r; if (r.t - ls.t >= 0.1 - 1e-9) line = ls; } else ls = null; }
      for (const f of [0.7, 0.9, 0.95]) if (back[f] == null && r.t > tMin + 1e-9 && line && r.s >= f * V) back[f] = +r.t.toFixed(2);
      for (const a of [7, 8]) if (back["v" + a] == null && r.t >= tMin - 1e-9 && line && r.s >= a) back["v" + a] = +r.t.toFixed(2); }
    const along = (T) => { const r = rec[Math.round(T / DT) - 1]; return +((r.P[0] - P0[0]) * Math.cos(hN) + (r.P[1] - P0[1]) * Math.sin(hN)).toFixed(2); };
    out[ang] = { entry: +s0.toFixed(2), min: +vmin.toFixed(2), tMin: +tMin.toFixed(2), line: line ? +line.t.toFixed(2) : null, vLine: line ? +line.s.toFixed(2) : null, t70: back[0.7] ?? null, t90: back[0.9] ?? null, t95: back[0.95] ?? null, tv7: back.v7 ?? null, tv8: back.v8 ?? null, gain1s: along(1), gain2s: along(2), gain3s: along(3) }; }
  return out; }
export function repeated(pace) { const sim = mk(pace); drive(sim, () => R(null, "RUN"), 0.5); const P0 = sim.stateAt(sim.t).P.slice(), rec = drive(sim, (t) => R(t < 1.5 ? 0 : (Math.floor((t - 1.5) / 1.5) % 2 ? -45 : 45) * DEG, "SPRINT"), 12);
  let path = 0, vmin = 99; for (let i = 1; i < rec.length; i++) { path += hyp(rec[i].P[0] - rec[i - 1].P[0], rec[i].P[1] - rec[i - 1].P[1]); if (rec[i].t > 2) vmin = Math.min(vmin, rec[i].s); }
  return { path: +path.toFixed(1), mean: +(path / 12).toFixed(2), net: +(rec[rec.length - 1].P[0] - P0[0]).toFixed(1), slowest: +vmin.toFixed(2) }; }
export function long(pace) { const sim = mk(pace); drive(sim, () => R(null, "RUN"), 1.0); const P0 = sim.stateAt(sim.t).P.slice(), rec = drive(sim, () => R(0, "SPRINT"), 10), m = {};
  for (const r of rec) for (const d of [50, 60]) if (m[d] == null && r.P[0] - P0[0] >= d) m[d] = +r.t.toFixed(2); return { t50: m[50] ?? null, t60: m[60] ?? null, vmax: +Math.max(...rec.map((r) => r.s)).toFixed(2) }; }
export function curves(pace) { const out = {};
  for (const rate of [10, 20, 45]) { const sim = mk(pace); drive(sim, () => R(0, "JOG"), 3); const rec = drive(sim, (t) => R(rate * DEG * t, "SPRINT"), 4); out[rate] = [1, 2, 4].map((x) => +rec[Math.round(x / DT) - 1].s.toFixed(2)); }
  return out; }
if ((process.argv[1] || "").endsWith("s_matrix.mjs")) { const paces = opt("pace", "CURRENT,C38,D38,E38").split(","), all = {};
  for (const p of paces) { const o = { starts: starts(p), slowing: slowing(p), cuts: cuts(p), repeated: repeated(p), long: long(p), curves: curves(p) }; all[p] = o;
    console.log(`■ ${p}${PACE[p] ? " — " + PACE[p].label : ""}`);
    for (const [k, v] of Object.entries(o.starts)) console.log(`  ${(k + " → sprint").padEnd(19)} entry ${v.entry.toFixed(2)} · ` + [5, 10, 20, 30, 40].map((m) => `${m} m ${v.marks[m] ? v.marks[m].t.toFixed(2) + " s @" + v.marks[m].v.toFixed(1) : "—"}`).join(" · ") + ` · peak acc ${v.peakAcc} · top ${v.vmax} (${(v.vmax * 3.6).toFixed(1)} km/h) · 90 % ${v.t90 ? v.t90.t + " s/" + v.t90.d + " m" : "—"} · 95 % ${v.t95 ? v.t95.t + " s/" + v.t95.d + " m" : "—"}`);
    console.log(`  first steps (speed at 0.1 / 0.2 / 0.3 / 0.5 / 0.75 / 1.0 / 1.5 s from standing): ${o.starts.standing.first.join(" / ")}`);
    { const st = o.starts.standing; console.log(`  THE CURVE from standing: time to 25 / 50 / 70 / 80 / 90 / 95 / 99 % of top ${[25, 50, 70, 80, 90, 95, 99].map((q) => st.pct[q] ? st.pct[q].t.toFixed(2) : "—").join(" / ")} s · speed at 0.25 / 0.5 / 0.75 / 1.0 / 1.5 / 2.0 s ${[0.25, 0.5, 0.75, 1, 1.5, 2].map((q) => st.vAt[q].toFixed(2)).join(" / ")} m/s`); }
    for (const [k, v] of Object.entries(o.slowing)) console.log(`  ${k.padEnd(23)} from ${v.entry} m/s: ${v.t ?? "—"} s, ${v.d ?? "—"} m`);
    for (const [a, v] of Object.entries(o.cuts)) console.log(`  ${(a + "° cut").padEnd(9)} entry ${v.entry} · min ${v.min} @${v.tMin} s · new line ${v.line ?? "—"} s @${v.vLine ?? "—"} · back to 70 % ${v.t70 ?? "—"} s · 90 % ${v.t90 ?? "—"} s · 95 % ${v.t95 ?? "—"} s · 7 m/s ${v.tv7 ?? "—"} s · 8 m/s ${v.tv8 ?? "—"} s · along the new line 1 / 2 / 3 s ${v.gain1s} / ${v.gain2s} / ${v.gain3s} m`);
    console.log(`  repeated 90° cuts (12 s): path ${o.repeated.path} m · mean ${o.repeated.mean} m/s · net ${o.repeated.net} m · slowest ${o.repeated.slowest} m/s · long: 50 m ${o.long.t50} s · 60 m ${o.long.t60} s · top ${o.long.vmax}`);
    console.log(`  curves (jog → sprint, the stick turning): ` + Object.entries(o.curves).map(([r, v]) => `${r}°/s ${v.join(" / ")} m/s @1/2/4 s`).join(" · ")); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(all, null, 1)); }

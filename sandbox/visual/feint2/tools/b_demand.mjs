// ballon1/tools/b_demand.mjs — BALL-ON PACE V1: THE CONTROL-DEMAND TESTS (owner's list) for BALL OFF, the three D99 carry candidates and the
// S99 build without an envelope — each scenario entered at 4 phases of a stride. In the window after the input change: the speed actually run,
// the AVAILABLE movement speed and acceleration (the envelope of the moment, CONTROLLED's ctl), the control demand and the carry types it
// passed through, the ball's separation, touches per second, the NEXT USEFUL TOUCH latency (the first touch after the change that sends the ball
// within 25° of the request), possession exits
//   node b_demand.mjs [--only <substr>] [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { CONFIGS } from "./b_pace.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, only = opt("only", null);
const DEG = Math.PI / 180, hyp = Math.hypot, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), alt = (A, per) => (t) => (Math.floor(t / per) % 2 ? -A : A) * DEG;
const S = (h) => ({ h, mode: "SPRINT" }), Rn = (h) => ({ h, mode: "RUN" });
// each: pre (the run-up: [request, seconds]…), then f(t) for `dur` seconds — the window measured
export const SCEN = {
  "straight open sprint carry": { pre: [[S(0), 4]], f: () => S(0), dur: 3 },
  "gradual 15° steering": { pre: [[S(0), 4]], f: (t) => S(15 * DEG * Math.min(1, t / 2)), dur: 3 },
  "gradual 30° steering": { pre: [[S(0), 4]], f: (t) => S(30 * DEG * Math.min(1, t / 2)), dur: 3 },
  "sustained curve 45°/s": { pre: [[S(0), 4]], f: (t) => S(45 * DEG * t), dur: 3 },
  "20° sudden correction": { pre: [[S(0), 4]], f: () => S(20 * DEG), dur: 2.5 },
  "45° cut": { pre: [[S(0), 4]], f: () => S(45 * DEG), dur: 2.5 },
  "60° cut": { pre: [[S(0), 4]], f: () => S(60 * DEG), dur: 2.5 },
  "90° cut": { pre: [[S(0), 4]], f: () => S(90 * DEG), dur: 3 },
  "repeated ±30° (0.45 s)": { pre: [[S(0), 4]], f: (t) => S(alt(30, 0.45)(t)), dur: 3 },
  "repeated ±60° (0.35 s)": { pre: [[S(0), 4]], f: (t) => S(alt(60, 0.35)(t)), dur: 3 },
  "fast circle 270°/s": { pre: [[S(0), 4]], f: (t) => S(270 * DEG * t), dur: 3 },
  "stop → start": { pre: [[S(0), 4], [S(null), 1.4]], f: () => S(0), dur: 3 },
  "sprint → tight control (±45° every 0.3 s, RUN)": { pre: [[S(0), 4]], f: (t) => Rn(alt(45, 0.3)(t)), dur: 3 },
  "tight control → sprint": { pre: [[S(0), 2], [Rn(45 * DEG), 0.3], [Rn(-45 * DEG), 0.3], [Rn(45 * DEG), 0.3], [Rn(-45 * DEG), 0.3], [Rn(45 * DEG), 0.3], [Rn(-45 * DEG), 0.3]], f: () => S(0), dur: 3 },
};
export function demandRun(name, o, phase) { const sc = SCEN[name], sim = makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, control: "CONTROLLED", pace: "D38", vocab: "EXPANDED" }, o));
  for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 });
  for (const [q, d] of sc.pre) for (let k = 0; k < Math.round((d + (q === sc.pre[0][0] ? phase : 0)) / DT); k++) sim.step({ ...q, keys: 0 });
  const t0 = sim.t, n0 = sim.contacts.length, l0 = sim.poss ? sim.poss.log.length : 0, A = { s: 0, vA: 0, mul: 0, m: 0, D: 0, sep: 0, sepMax: 0, n: 0, types: {} }; let useful = null;
  for (let k = 0; k < Math.round(sc.dur / DT); k++) { const q = sc.f(k * DT); sim.step({ ...q, keys: 0 }); const st = sim.stateAt(sim.t), b = sim.ball.p, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]); A.n++; A.s += st.s;
    if (o.ballOn !== false) { A.sep += sep; A.sepMax = Math.max(A.sepMax, sep); }
    if (sim.ctl && sim.P.ballEnv) { A.vA += sim.ctl.vA; A.mul += sim.ctl.mul; A.m += sim.ctl.m; A.D += sim.ctl.D; A.types[sim.ctl.type] = (A.types[sim.ctl.type] || 0) + 1; }
    if (useful == null && q.h != null) for (let i = n0; i < sim.contacts.length; i++) { const c = sim.contacts[i]; if (!c.missed && hyp(c.vOut[0], c.vOut[1]) > 0.5 && Math.abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - q.h)) < 25 * DEG) { useful = c.t - t0; break; } } }
  const C = sim.contacts.slice(n0).filter((c) => !c.missed), env = !!(sim.ctl && sim.P.ballEnv);
  return { s: A.s / A.n, vA: env ? A.vA / A.n : null, mul: env ? A.mul / A.n : null, m: env ? A.m / A.n : null, D: env ? A.D / A.n : null, types: Object.fromEntries(Object.entries(A.types).map(([k, v]) => [k, +(v / A.n).toFixed(2)])), sep: o.ballOn !== false ? A.sep / A.n : null, sepMax: o.ballOn !== false ? A.sepMax : null, touchesPerS: C.length / sc.dur, useful, exits: sim.poss ? sim.poss.log.slice(l0).filter((e) => e.from === "CONTROLLED").length : 0 }; }
if ((process.argv[1] || "").endsWith("b_demand.mjs")) { const out = {}, f = (x, d = 2) => (x == null ? "—" : x.toFixed(d));
  for (const name of Object.keys(SCEN)) { if (only && !name.includes(only)) continue; console.log(`■ ${name}`); out[name] = {};
    for (const [cfg, o] of CONFIGS) { const R = [0, 0.05, 0.1, 0.15].map((ph) => demandRun(name, o, ph)), m = (k) => { const v = R.map((r) => r[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
      const types = {}; for (const r of R) for (const [k, v] of Object.entries(r.types)) types[k] = (types[k] || 0) + v / R.length;
      const row = { speed: m("s"), vAvail: m("vA"), accAvail: m("m"), accNow: m("mul"), demand: m("D"), sep: m("sep"), sepMax: R.some((r) => r.sepMax != null) ? Math.max(...R.map((r) => r.sepMax || 0)) : null, touchesPerS: m("touchesPerS"), usefulTouch: m("useful"), exits: R.reduce((a, r) => a + r.exits, 0), types };
      out[name][cfg] = row;
      console.log(`   ${cfg.padEnd(28)} speed ${f(row.speed)} m/s · available ${f(row.vAvail)} m/s · push ${row.accAvail == null ? "—" : (row.accAvail * 100).toFixed(0) + " %"} (now ${row.accNow == null ? "—" : (row.accNow * 100).toFixed(0) + " %"}) · demand ${f(row.demand)} · sep ${f(row.sep)} / max ${f(row.sepMax)} m · ${f(row.touchesPerS, 1)} touches/s · useful touch +${f(row.usefulTouch)} s · exits ${row.exits}${Object.keys(types).length ? " · " + Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.split(" (")[0].toLowerCase()} ${(v * 100).toFixed(0)}%`).join(", ") : ""}`); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

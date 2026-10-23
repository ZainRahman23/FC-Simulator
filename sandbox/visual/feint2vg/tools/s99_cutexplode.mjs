// speed99/tools/s99_cutexplode.mjs — CUT → EXPLODE and SPRINT_CARRY's trade-off (S99 MISSION, Phase 2 / priority 4): from a 38 km/h sprint (and from
// a run → sprint) a cut of 20 … 180°, entered at 6 phases across a stride: per configuration — BALL OFF, BALL ON CONTROLLED with SPRINT_CARRY's
// long push (N = 3), with the shorter push only (N = 2), without SPRINT_CARRY — the first touch after the cut, the time until body AND ball run on
// the new line, the time from the cut until the body is back to 90 % of top speed on it, the largest separation, the touches, possession exits
//   node s99_cutexplode.mjs [--vocab EXPANDED] [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { PACE } from "../pace.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, vocab = opt("vocab", "CORE");
const hyp = Math.hypot, DEG = Math.PI / 180, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), SC0 = PACE.D38.sprintCarry;
function run(cfg, entry, cut, phase) { PACE.D38.sprintCarry = cfg === "noSC" ? undefined : cfg === "N2" ? Object.assign({}, SC0, { N: 2 }) : SC0;
  const sim = makeSim("TL", { layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, control: "CONTROLLED", pace: "D38", ballOn: cfg !== "off", vocab });
  for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 });
  const pre = entry === "sprint" ? [[0, "SPRINT", 4.0 + phase]] : [[0, "RUN", 2.0 + phase]];
  for (const [h, m, d] of pre) for (let k = 0; k < Math.round(d / DT); k++) sim.step({ h, mode: m, keys: 0 });
  const n0 = sim.contacts.length, l0 = sim.poss ? sim.poss.log.length : 0, t0 = sim.t, h1 = cut * DEG, vmax = sim.P.speed.SPRINT; let first = null, onLine = null, v90 = null, sepMax = 0;
  for (let k = 0; k < Math.round(4.0 / DT); k++) { sim.step({ h: h1, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t), b = sim.ball.p, bv = sim.ball.v, dt = sim.t - t0;
    if (cfg !== "off") { sepMax = Math.max(sepMax, hyp(b[0] - st.P[0], b[1] - st.P[1])); if (first == null && sim.contacts.length > n0) first = dt; }
    const bodyOn = st.s > 1 && Math.abs(wrap(st.h - h1)) < 10 * DEG, ballOn = cfg === "off" || (hyp(...bv) > 0.5 && Math.abs(wrap(Math.atan2(bv[1], bv[0]) - h1)) < 15 * DEG);
    if (onLine == null && bodyOn && ballOn) onLine = dt; if (v90 == null && bodyOn && st.s >= 0.9 * vmax) v90 = dt; }
  return { first, onLine, v90, sepMax, touches: sim.contacts.length - n0, exits: sim.poss ? sim.poss.log.slice(l0).filter((e) => e.from === "CONTROLLED").length : 0 }; }
const out = {};
for (const entry of ["sprint", "run→sprint"]) for (const cut of [20, 45, 90, 135, 180]) { const row = (out[`${entry} ${cut}`] = {}); const L = [];
  for (const cfg of ["off", "SC", "N2", "noSC"]) { const R = [0, 1, 2, 3, 4, 5].map((i) => run(cfg, entry, cut, i * 0.035)), m = (f) => { const v = R.map((r) => r[f]).filter((x) => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null; };
    row[cfg] = { first: m("first"), onLine: m("onLine"), v90: m("v90"), sepMax: m("sepMax"), touches: m("touches"), exits: R.reduce((a, r) => a + r.exits, 0) };
    L.push(`${cfg.padEnd(4)} ${cfg === "off" ? "" : `1st touch +${row[cfg].first} · `}on line +${row[cfg].onLine} · 90 % vmax +${row[cfg].v90}${cfg === "off" ? "" : ` · sep ${row[cfg].sepMax} · touches ${row[cfg].touches} · exits ${row[cfg].exits}`}`); }
  console.log(`■ ${entry} → ${cut}° (${vocab})\n   ${L.join("\n   ")}`); }
PACE.D38.sprintCarry = SC0; if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1));

// receive_kill12/tools/rk_compare_typical.mjs — the measured result of every matched-rating comparison tile (TYPICAL draw; candidate and current scales):
//   node rk_compare_typical.mjs > <evidence>/rk12_compare_typical.json
import { prepare, runEpisode } from "../rk_sim.js";
import { setScale } from "../rk_model.js";
const base = { h: 0.11, drop: 0, bear: 0, lat: 0, surface: "AUTO" };
const C = [["normal", { v: 12 }], ["hard", { v: 22 }], ["thighM", { v: 6, h: 0.95, drop: 35, surface: "THIGH" }], ["chestM", { v: 8, h: 1.32, drop: 20, surface: "CHEST" }], ["headM", { v: 6, h: 1.78, drop: 15, surface: "HEAD" }]];
const out = {};
for (const sc of ["candidate", "current"]) { setScale(sc); out[sc] = {};
  for (const [id, c] of C) { const P = prepare(Object.assign({}, base, c)); out[sc][id] = [40, 50, 60, 70, 75, 80, 90, 99].map((bc) => { const m = runEpisode(P, bc, { example: "TYPICAL" }, { every: 2 }).m; return `${bc}:${m.continuation[0]}${m.contacts} ${m.extraAdj == null ? "-" : m.extraAdj.toFixed(2)}m ${m.tStable == null ? "-" : m.tStable.toFixed(2)}s`; }); } }
console.log(JSON.stringify(out, null, 1));

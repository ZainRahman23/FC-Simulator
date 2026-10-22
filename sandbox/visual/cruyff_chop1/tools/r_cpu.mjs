// phys1/tools/r_cpu.mjs — PHYSICAL RATINGS V1: THE RATINGS' INCREMENTAL CPU — the same seeded torture input (4 programs × 60 s, BALL OFF) on the
// build without a rating set, PHYSICAL-99 and PHYSICAL-80-A / -B / -C, interleaved in one process over 3 rounds (the JIT warm for all, other load
// on the machine shared by all); per configuration the minimum over the rounds of the process CPU time per simulated second, and the worst tick
//   node r_cpu.mjs [--rounds 3] [--seeds 4]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { PHYS_PRESETS } from "../ratings.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, rounds = +opt("rounds", 3), seeds = +opt("seeds", 4), dur = 60;
const CFG = [["no ratings", undefined], ...Object.keys(PHYS_PRESETS).map((id) => [id, Object.assign({ id }, PHYS_PRESETS[id])])], best = {}, worst = {};
for (let r = 0; r < rounds; r++) for (const [name, phys] of CFG) { let w = 0; const c0 = process.cpuUsage();
  for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), ballOn: false, pace: "D38", vocab: "EXPANDED" }, phys ? { phys: JSON.parse(JSON.stringify(phys)) } : {}));
    for (let k = 0; k < Math.round(dur / DT); k++) { const a = performance.now(); sim.step(P.req(k * DT)); const d = performance.now() - a; if (d > w) w = d; } }
  const u = process.cpuUsage(c0), ms = (u.user + u.system) / 1000 / (seeds * dur); best[name] = Math.min(best[name] ?? Infinity, ms); worst[name] = Math.min(worst[name] ?? Infinity, w); }
const base = best["no ratings"];
for (const [name] of CFG) console.log(`${name.padEnd(14)} ${best[name].toFixed(1)} ms CPU per simulated second${name === "no ratings" ? "" : ` (${best[name] >= base ? "+" : ""}${(best[name] - base).toFixed(1)} ms, ${best[name] >= base ? "+" : ""}${((best[name] / base - 1) * 100).toFixed(0)} %)`} · worst tick ${worst[name].toFixed(1)} ms (the best round's)`);

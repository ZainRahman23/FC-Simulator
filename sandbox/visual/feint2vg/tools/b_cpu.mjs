// ballon1/tools/b_cpu.mjs — BALL-ON PACE V1: THE ENVELOPE'S INCREMENTAL CPU — the same seeded torture input (4 programs × 60 s, CONTROLLED,
// S99 · D38 · A99-C · EXPANDED) without an envelope and with each candidate, interleaved in one process over 3 rounds (the JIT warm for all,
// other load on the machine shared by all); per configuration the minimum over the rounds of the process CPU time per simulated second, and
// the worst single tick (wall)
//   node b_cpu.mjs [--rounds 3] [--seeds 4]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, rounds = +opt("rounds", 3), seeds = +opt("seeds", 4), dur = 60;
const CFG = [["no envelope", undefined], ["CARRY-A", "A"], ["CARRY-B", "B"], ["CARRY-C", "C"]], best = {}, worst = {};
for (let r = 0; r < rounds; r++) for (const [name, carry] of CFG) { let w = 0; const c0 = process.cpuUsage();
  for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED", pace: "D38", vocab: "EXPANDED" }, carry ? { carry } : {}));
    for (let k = 0; k < Math.round(dur / DT); k++) { const a = performance.now(); sim.step(P.req(k * DT)); const d = performance.now() - a; if (d > w) w = d; } }
  const u = process.cpuUsage(c0), ms = (u.user + u.system) / 1000 / (seeds * dur); best[name] = Math.min(best[name] ?? Infinity, ms); worst[name] = Math.min(worst[name] ?? Infinity, w); }
const base = best["no envelope"];
for (const [name] of CFG) console.log(`${name.padEnd(12)} ${best[name].toFixed(1)} ms CPU per simulated second${name === "no envelope" ? "" : ` (+${(best[name] - base).toFixed(1)} ms, +${((best[name] / base - 1) * 100).toFixed(0)} %)`} · worst tick ${worst[name].toFixed(1)} ms (the best round's)`);

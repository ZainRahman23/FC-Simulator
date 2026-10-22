// adv4/tools/v_cpu.mjs — PERFORMANCE: the ADV-4 build against the CRUYFF-CHOP-1 build it was copied from (cruyff_chop1), the same seeded torture input (4 programs × 60 s, CONTROLLED), interleaved
// over 3 rounds: CPU per simulated second (the process, best round), the resolver's re-plan cost (mean, p99, worst) and the CANDIDATES scored
// per re-plan (mean, max), the worst tick
//   node v_cpu.mjs [--rounds 3] [--seeds 4]
import { ENV } from "./u_env.mjs";
import { ControlledSim as V1, presetLayers } from "../c_sim.js";
import { ControlledSim as B1 } from "../../cruyff_chop1/c_sim.js";   // (ADV-4: against the CRUYFF-CHOP-1 build it was copied from)
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, rounds = +opt("rounds", 3), seeds = +opt("seeds", 4), dur = 60, DT = 1 / 240;
const CFG = [["cruyff_chop1 (CRUYFF-CHOP-1, presented)", B1], ["adv4 (the four advanced families)", V1]], R = {};
for (let r = 0; r < rounds; r++) for (const [name, Cls] of CFG) { let w = 0, nRe = 0, nC = 0, mC = 0; const re = []; const c0 = process.cpuUsage();
  for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = new Cls(ENV, Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED", pace: "D38", vocab: "EXPANDED", carry: "B" }));
    const orig = sim.costB4.bind(sim); let cnt = 0; sim.costB4 = (...a) => { cnt++; return orig(...a); };
    for (let k = 0; k < Math.round(dur / DT); k++) { const a = performance.now(), n0 = sim.cpu.replan.length; cnt = 0; sim.step(P.req(k * DT)); const d = performance.now() - a; if (d > w) w = d; if (sim.cpu.replan.length > n0) { nRe++; nC += cnt; mC = Math.max(mC, cnt); re.push(sim.cpu.replan[sim.cpu.replan.length - 1]); } } }
  const u = process.cpuUsage(c0), ms = (u.user + u.system) / 1000 / (seeds * dur); re.sort((a, b) => a - b); const x = { ms, worst: w, reMean: re.reduce((a, b) => a + b, 0) / re.length, reP99: re[Math.floor(0.99 * re.length)], reMax: re[re.length - 1], cand: nC / nRe, candMax: mC, replansPerS: nRe / (seeds * dur) };
  if (!R[name] || x.ms < R[name].ms) R[name] = x; }
for (const [name] of CFG) { const x = R[name]; console.log(`${name.padEnd(40)} ${x.ms.toFixed(1)} ms CPU / simulated s · re-plans ${x.replansPerS.toFixed(1)}/s, mean ${x.reMean.toFixed(2)} ms, p99 ${x.reP99.toFixed(1)} ms, worst ${x.reMax.toFixed(1)} ms · candidates scored per re-plan ${x.cand.toFixed(1)} (max ${x.candMax}) · worst tick ${x.worst.toFixed(1)} ms`); }

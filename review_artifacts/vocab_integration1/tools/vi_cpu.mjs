// vi_cpu.mjs — DRIBBLING VOCABULARY INTEGRATION: CPU with NO Body Feint / Croqueta request — the same seeded torture input (4 programs × 60 s,
// CONTROLLED · D38 · EXPANDED · CARRY-B: the stick only) through the integrated library (vocab2) and the two review builds it reproduces
// (croqlw b489e4fd, feint2ef f8a0e374), interleaved over N rounds; per build: CPU per simulated second (process time, best round and median),
// the re-plans per second and their cost, the worst tick. Run it twice: as built, and with ABL=analogfeint (vocab2 then plays exactly croqlw's
// ordinary play — any difference left is the integration's own per-tick cost).
//   node vi_cpu.mjs [--rounds 5] [--seeds 4]
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const VIS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../sandbox/visual"), U = (p) => pathToFileURL(path.join(VIS, p)).href;
const { ENV } = await import(U("vocab2/tools/u_env.mjs")); const { program, PAGE } = await import(U("vocab2/tools/c_torture.mjs"));
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, rounds = +opt("rounds", 5), seeds = +opt("seeds", 4), dur = 60, DT = 1 / 240;
// (+ vocab2 with the old analog feint switched back on through its option — o.analogFeint, the same process: the as-built difference is then
// the ordinary play it changes, not code cost)
const CFG = []; for (const [name, dir, extra] of [["vocab2 (the integrated library)", "vocab2", {}], ["vocab2 + o.analogFeint (the old analog feint on)", "vocab2", { analogFeint: true }], ["croqlw (LEG-WAVE V4 review build, b489e4fd)", "croqlw", {}], ["feint2ef (BODY FEINT review build, f8a0e374)", "feint2ef", {}]]) { const m = await import(U(dir + "/c_sim.js")); CFG.push([name, m.ControlledSim, m.presetLayers, extra]); }
const R = {};
for (let r = 0; r < rounds; r++) for (const [name, Cls, presetLayers, extra] of CFG) { let w = 0, nRe = 0, nC = 0, nI = 0; const re = [], c0 = process.cpuUsage();
  for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = new Cls(ENV, Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED", pace: "D38", vocab: "EXPANDED", carry: "B" }, extra));
    // (the work per re-plan: candidates scored (costB4) and technique instances attempted (instantiate))
    const oc = sim.costB4.bind(sim), oi = sim.instantiate.bind(sim); sim.costB4 = (...x) => { nC++; return oc(...x); }; sim.instantiate = (...x) => { nI++; return oi(...x); };
    for (let k = 0; k < Math.round(dur / DT); k++) { const a = performance.now(), n0 = sim.cpu.replan.length; sim.step(P.req(k * DT)); const d = performance.now() - a; if (d > w) w = d; if (sim.cpu.replan.length > n0) { nRe++; re.push(sim.cpu.replan[sim.cpu.replan.length - 1]); } } }
  const u = process.cpuUsage(c0), ms = (u.user + u.system) / 1000 / (seeds * dur); re.sort((a, b) => a - b);
  (R[name] = R[name] || []).push({ ms, worst: w, rps: nRe / (seeds * dur), reMean: re.reduce((a, b) => a + b, 0) / re.length, reP99: re[Math.floor(0.99 * re.length)], cand: nC / nRe, inst: nI / nRe }); }
console.log(`ABL=${process.env.ABL || "—"} · ${rounds} interleaved rounds × ${seeds} programs × ${dur} s · no Body Feint / Croqueta request`);
for (const [name] of CFG) { const L = R[name].slice().sort((a, b) => a.ms - b.ms), best = L[0], med = L[Math.floor(L.length / 2)];
  console.log(`${name.padEnd(46)} best ${best.ms.toFixed(1)} · median ${med.ms.toFixed(1)} ms CPU / simulated s · rounds ${R[name].map((x) => x.ms.toFixed(1)).join(" ")} · re-plans ${best.rps.toFixed(1)}/s, mean ${best.reMean.toFixed(2)} ms, p99 ${best.reP99.toFixed(1)} ms · per re-plan: candidates scored ${best.cand.toFixed(2)}, instances tried ${best.inst.toFixed(2)} · worst tick ${Math.max(...L.map((x) => x.worst)).toFixed(1)} ms`); }

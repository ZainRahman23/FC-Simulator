// ═══ physchar2/tools/g3_bench.mjs — G3 resolution D5: reproducible controller-cost benchmark (run ALONE: no other simulation processes) ═════
// One process; a discarded warm-up run per scenario (JIT); then N repeated trials. Per-tick samples of
//   (a) controller only  — StandController.compute (state estimation, balance, transfer, leg IK, supervisor): the G3 row-S scope;
//   (b) controller + actuator computation — the G2 row-2.5 scope ("state estimation + balance + leg IK + actuator computation").
// Statistics per trial over the steady part (t ≥ 1 s) and over all ticks: mean, median, p95, p99; across trials: median and range of the
// per-trial means. Instrumentation: the cost of one performance.now() call is calibrated, and the number of timing calls inside each timed
// region is stated, so the instrumentation share can be subtracted.
// usage: node tools/g3_bench.mjs [trials=7] → review_artifacts/physical_character_v2/g3/json/g3_bench.json
import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { G2Sim } from "../gates/v2_g2.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json/g3_bench.json");
const Jolt = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), N = +(process.argv[2] || 7), now = () => performance.now();
// calibrate one performance.now() call (ms)
let cal = 0; { const M = 2e6; let x = 0; const t0 = now(); for (let i = 0; i < M; i++) x += now(); cal = (now() - t0) / M; if (x === 42) console.log(""); }
const q = (a, p) => { const s = a.slice().sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }, mean = (a) => a.reduce((u, v) => u + v, 0) / a.length;
const stats = (a) => ({ mean: mean(a), median: q(a, 0.5), p95: q(a, 0.95), p99: q(a, 0.99), max: Math.max(...a), n: a.length });
function trial(make) { const s = make(), c = s.ctrl, orig = c.compute.bind(c), ctl = [], tAt = []; c.compute = (...a) => { const t0 = now(), r = orig(...a); ctl.push(now() - t0); tAt.push(s.n * s.dt); return r; };
  s.cpuSamples = []; while (s.tick()) {} const both = s.cpuSamples.slice(-ctl.length); s.destroy();
  const steady = (arr) => arr.filter((_, i) => tAt[i] >= 1); return { ctrl: { all: stats(ctl), steady: stats(steady(ctl)) }, ctrlAct: { all: stats(both), steady: stats(steady(both)) } }; }
const SC = { "G2 quiet stance 22 s": () => new G2Sim(Jolt, spec, { title: "q", seconds: 22 }, {}), "G3 T5": () => new G3Sim(Jolt, spec, g3Def("T5"), {}), "G3 U:R": () => new G3Sim(Jolt, spec, g3Def("U:R"), {}), "G3 T3": () => new G3Sim(Jolt, spec, g3Def("T3"), {}), "G3 T8 hold R push R 10": () => new G3Sim(Jolt, spec, g3Def("T8:hold:R:R:10"), {}) };
const out = { generated: "tools/g3_bench.mjs", date: new Date().toISOString(), node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, loadavg: os.loadavg(), trials: N, nowCallMs: cal,
  timingCallsInside: { ctrlOnly: "1 pair (bench wrapper) + 1 pair inside compute for the G3 IK timer when a transfer is requested", ctrlAct: "G2Sim._ctrl's own 3 calls + the bench wrapper pair" }, scenarios: {} };
for (const [name, mk] of Object.entries(SC)) { trial(mk); const T = []; for (let i = 0; i < N; i++) T.push(trial(mk));
  const agg = (sel) => { const means = T.map(sel); return { trialMeans: means.map(x => +x.toFixed(5)), medianOfMeans: q(means, 0.5), min: Math.min(...means), max: Math.max(...means) }; };
  out.scenarios[name] = { ctrlOnly: { steadyMean: agg(t => t.ctrl.steady.mean), steadyMedian: agg(t => t.ctrl.steady.median), steadyP95: agg(t => t.ctrl.steady.p95), steadyP99: agg(t => t.ctrl.steady.p99), allMean: agg(t => t.ctrl.all.mean), allP99: agg(t => t.ctrl.all.p99) },
    ctrlPlusActuators: { steadyMean: agg(t => t.ctrlAct.steady.mean), steadyMedian: agg(t => t.ctrlAct.steady.median), steadyP95: agg(t => t.ctrlAct.steady.p95), steadyP99: agg(t => t.ctrlAct.steady.p99), allMean: agg(t => t.ctrlAct.all.mean), allP99: agg(t => t.ctrlAct.all.p99) } };
  const o = out.scenarios[name]; console.log(`${name.padEnd(26)} ctrl mean ${o.ctrlOnly.steadyMean.medianOfMeans.toFixed(4)} (range ${o.ctrlOnly.steadyMean.min.toFixed(4)}–${o.ctrlOnly.steadyMean.max.toFixed(4)}) median ${o.ctrlOnly.steadyMedian.medianOfMeans.toFixed(4)} p95 ${o.ctrlOnly.steadyP95.medianOfMeans.toFixed(4)} p99 ${o.ctrlOnly.steadyP99.medianOfMeans.toFixed(4)} | ctrl+act mean ${o.ctrlPlusActuators.steadyMean.medianOfMeans.toFixed(4)} p99 ${o.ctrlPlusActuators.steadyP99.medianOfMeans.toFixed(4)} ms`); }
out.loadavgEnd = os.loadavg(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`now() ${(cal * 1e6).toFixed(1)} ns/call → ` + path.relative(ROOT, OUT));

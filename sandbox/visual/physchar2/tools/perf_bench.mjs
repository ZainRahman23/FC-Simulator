// ═══ physchar2/tools/perf_bench.mjs — overnight Phase D: per-component cost of one simulation tick (run ALONE on an idle machine) ══════════
// Components per tick (ms): controller (StandController.compute, includes the leg IK), leg IK alone (sum of legIK calls in the tick),
// actuators (ActuatorLayer.compute), passive law (P.compute), physics (Jolt world step), and the whole tick (G2Sim.tick: all of the above +
// measurement / instrumentation). COLD vs WARM: every scenario runs in a FRESH child process; its first run is the cold run (JIT not yet
// warmed: first-second statistics are reported separately), then N warm trials. Statistics over the steady part (t ≥ 1 s): mean, median,
// p95, p99, max; across warm trials the median and range of the per-trial means. The cost of one performance.now() call is calibrated;
// each wrapped component adds one now() pair (stated, not subtracted).
// usage: node tools/perf_bench.mjs [trials=5] → review_artifacts/physical_character_v2/perf/perf_bench.json
import fs from "fs"; import os from "os"; import path from "path"; import { fork } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/perf/perf_bench.json");
const SCEN = ["G2 quiet stance 22 s", "G3 T5", "G3 U:R", "G3 T3", "G3 T8:hold:R:FR:15"], N = +(process.argv.find(a => /^\d+$/.test(a)) || 5), now = () => performance.now();
const q = (a, p) => { const s = a.slice().sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }, mean = (a) => a.reduce((u, v) => u + v, 0) / a.length;
const stats = (a) => (a.length ? { mean: mean(a), median: q(a, 0.5), p95: q(a, 0.95), p99: q(a, 0.99), max: Math.max(...a), n: a.length } : null);
const child = process.argv.find(a => a.startsWith("--child="));
if (child) {
  const name = child.slice(8), { loadJolt } = await import("../core/v2_jolt.js"), { generateSpec } = await import("../spec/v2_spec.js"), { VARIATION_SET } = await import("../spec/v2_human.js");
  const { G3Sim, g3Def } = await import("../gates/v2_g3.js"), { G2Sim } = await import("../gates/v2_g2.js");
  const Jolt = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF"));
  const make = () => (name.startsWith("G2") ? new G2Sim(Jolt, spec, { title: "q", seconds: 22 }, {}) : new G3Sim(Jolt, spec, g3Def(name.slice(3)), {}));
  let cal = 0; { const M = 1e6; let x = 0; const t0 = now(); for (let i = 0; i < M; i++) x += now(); cal = (now() - t0) / M; if (x === 42) console.log(""); }
  const trial = () => { const s = make(), c = s.ctrl, K = ["ctrl", "ik", "act", "passive", "physics", "tick"], T = Object.fromEntries(K.map(k => [k, []])), tAt = []; let ik = 0;
    const wrap = (obj, fn, onT) => { const o = obj[fn].bind(obj); obj[fn] = (...a) => { const t0 = now(), r = o(...a); onT(now() - t0); return r; }; };
    wrap(c, "legIK", (d) => { ik += d; }); wrap(c, "compute", (d) => T.ctrl.push(d)); wrap(s.act, "compute", (d) => T.act.push(d)); wrap(s.P, "compute", (d) => T.passive.push(d)); wrap(s.w, "step", (d) => T.physics.push(d));
    for (;;) { ik = 0; const t0 = now(), more = s.tick(), d = now() - t0; if (!more) break; T.tick.push(d); T.ik.push(ik); tAt.push(s.n * s.dt); }
    s.destroy(); const n = T.tick.length, lastN = (a) => a.slice(-n);   // init-time calls (constructor) are dropped: the last n samples belong to the n ticks
    const sel = (pred) => Object.fromEntries(K.map(k => [k, stats(lastN(T[k]).filter((_, i) => pred(tAt[i])))]));
    return { steady: sel(t => t >= 1), firstSecond: sel(t => t < 1), ticks: n }; };
  const cold = trial(), warm = []; for (let i = 0; i < N; i++) warm.push(trial());
  process.send({ name, cal, cold, warm }); process.exit(0);
}
const out = { generated: "tools/perf_bench.mjs", date: new Date().toISOString(), node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, loadavgStart: os.loadavg(), trials: N, scenarios: {} };
for (const name of SCEN) { const r = await new Promise((res, rej) => { const cp = fork(fileURLToPath(import.meta.url), [`--child=${name}`, String(N)]); cp.on("message", res); cp.on("exit", (c) => { if (c) rej(new Error(`${name} exit ${c}`)); }); });
  const comp = (k) => { const m = r.warm.map(t => t.steady[k].mean); return { warmSteadyMeanMedian: q(m, 0.5), warmSteadyMeanRange: [Math.min(...m), Math.max(...m)], warmSteadyMedian: q(r.warm.map(t => t.steady[k].median), 0.5), warmSteadyP95: q(r.warm.map(t => t.steady[k].p95), 0.5), warmSteadyP99: q(r.warm.map(t => t.steady[k].p99), 0.5), warmSteadyMax: Math.max(...r.warm.map(t => t.steady[k].max)), coldFirstSecond: r.cold.firstSecond[k], coldSteady: r.cold.steady[k] }; };
  out.scenarios[name] = { nowCallMs: r.cal, ticks: r.warm[0].ticks, components: Object.fromEntries(["ctrl", "ik", "act", "passive", "physics", "tick"].map(k => [k, comp(k)])) };
  const C = out.scenarios[name].components, f = (x) => x.toFixed(4);
  console.log(`${name.padEnd(22)} warm steady mean/median/p95/p99 (ms): ` + ["ctrl", "ik", "act", "passive", "physics", "tick"].map(k => `${k} ${f(C[k].warmSteadyMeanMedian)}/${f(C[k].warmSteadyMedian)}/${f(C[k].warmSteadyP95)}/${f(C[k].warmSteadyP99)}`).join(" | ") + ` || cold first-second mean: ctrl ${f(C.ctrl.coldFirstSecond.mean)} tick ${f(C.tick.coldFirstSecond.mean)}`); }
out.loadavgEnd = os.loadavg(); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log("→ " + path.relative(ROOT, OUT) + `  (load average start ${out.loadavgStart.map(x => x.toFixed(2)).join(" ")}, end ${out.loadavgEnd.map(x => x.toFixed(2)).join(" ")})`);

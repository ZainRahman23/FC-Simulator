// ═══ physchar2/tools/touchrest_perf.mjs — ISOLATED controller-cost benchmark of the touch-rest candidate (run alone on a quiet machine; method of
// tools/lc_bench.mjs: G3Sim's per-tick controller + actuator CPU samples, median / p95 / max after a 1 s warm-up, second of two repetitions).
// Arms: adopted (ref + lifecycle), + B1 (ffLockedAxis), C = + B1 + touchRest, C2 = C + touchRestRamp. Scenarios: the E1a-like unloading with the 5 mm lift (gates/v2_unload.js,
// V2-REF L, 2.5 cm, zero share, ramp 4 s), split by phase (support / released-touching / lift-hover-replace); and G3 U:R (single-support hold).
// usage: node tools/touchrest_perf.mjs [--human=V2-REF] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), spec = unloadSpec(HUMAN), res = [];
const q = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }, st = (a) => ({ medMs: q(a, 0.5), p95Ms: q(a, 0.95), maxMs: a.length ? Math.max(...a) : null, n: a.length });
const ARMS = [["adopted", {}], ["+B1", { ffLockedAxis: true }], ["C (+B1 +touchRest)", { ffLockedAxis: true, touchRest: true }], ["C2 (+touchRestRamp)", { ffLockedAxis: true, touchRest: true, touchRestRamp: true }], ["P* (preswing)", { ffLockedAxis: true, touchRest: true, lcVff: "lin", lcTouch: { reseed: true } }]];
for (const [name, flags] of ARMS) for (let rep = 0; rep < 2; rep++) {
  const { s, nL, H } = unloadSim(J, spec, { foot: "L", drop: 0.025, r: 0, ramp: 4, flags, lift: { h: 0.005, hover: 0.5 }, end: 16 }), ph = [];
  while (s.tick()) { const f = s.ctrl.lc.feet[nL], t = s.n * s.dt; ph.push(H.tL != null && t >= H.tL ? "lift" : f.state === "SUPPORT" ? "support" : "released"); }
  const smp = s.cpuSamples || [], w = Math.round(1 / s.dt), by = (p) => smp.filter((x, i) => i >= w && ph[i] === p); s.destroy();
  if (rep === 1) { const r = { scen: "unload + 5 mm lift", name, all: st(smp.slice(w)), support: st(by("support")), released: st(by("released")), lift: st(by("lift")) }; res.push(r);
    console.log(`${r.scen} | ${name.padEnd(20)} all: median ${r.all.medMs.toFixed(4)} p95 ${r.all.p95Ms.toFixed(4)} max ${r.all.maxMs.toFixed(3)} ms | support med ${r.support.medMs?.toFixed(4)} | released med ${r.released.medMs?.toFixed(4)} p95 ${r.released.p95Ms?.toFixed(4)} | lift med ${r.lift.medMs?.toFixed(4)} p95 ${r.lift.p95Ms?.toFixed(4)}`); } }
for (const [name, flags] of ARMS) for (let rep = 0; rep < 2; rep++) {
  const s = new G3Sim(J, spec, { ...g3Def("U:R"), supervise: {} }, { stand: { ikRefTwist: true, lifecycle: true, ...flags }, passiveOpts: { kneeModel: "v2k" } }); while (s.tick());
  const smp = (s.cpuSamples || []).slice(Math.round(1 / s.dt)); s.destroy();
  if (rep === 1) { const r = { scen: "G3 U:R", name, all: st(smp) }; res.push(r); console.log(`G3 U:R | ${name.padEnd(20)} median ${r.all.medMs.toFixed(4)} p95 ${r.all.p95Ms.toFixed(4)} max ${r.all.maxMs.toFixed(3)} ms (${r.all.n} ticks)`); } }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/touchrest_perf.mjs", human: HUMAN, res }, null, 1));

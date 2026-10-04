// ═══ physchar2/tools/lc_bench.mjs — final pre-E1a stage §9: ISOLATED controller-cost benchmark (run alone on a quiet machine): the G3 controller
// per tick (controller compute only, and controller + actuators) in the validated configuration vs the proposed G4 configuration (reference
// policy + experimental lifecycle), on G3 U:R (single-support hold) and on the external-lift harness profile. Median and p95 of per-tick cost
// (ms) over the run, after a 1 s warm-up. usage: node tools/lc_bench.mjs [--human=V2-REF] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), res = [];
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
for (const [name, stand, lift] of [["validated G3", {}, 0], ["G4 proposal (ref + lifecycle)", { ikRefTwist: true, lifecycle: true }, 0], ["validated G3 + external lift", {}, 30], ["G4 proposal + external lift", { ikRefTwist: true, lifecycle: true }, 30]]) {
  for (let rep = 0; rep < 2; rep++) { const s = new G3Sim(J, spec, { ...g3Def("U:R"), supervise: {} }, { stand }), bi = spec.bodies.findIndex(b => b.name === "shank_L");
    if (lift) { const base = s._disturb.bind(s); s._disturb = function () { const out = base(), t = this.n * this.dt, f = t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0; if (f > 0) { const Fv = [0, lift * f, 0]; this.w.addForceAt(bi, Fv, this.st[bi].com); out.F = Fv; out.body = bi; out.at = this.st[bi].com; } return out; }; }
    while (s.tick()); const smp = (s.cpuSamples || []).slice(Math.round(1 / s.dt)); s.destroy();
    if (rep === 1) { res.push({ name, medMs: q(smp, 0.5), p95Ms: q(smp, 0.95), maxMs: Math.max(...smp), n: smp.length }); console.log(`${name.padEnd(34)} controller+actuators per tick: median ${q(smp, 0.5).toFixed(4)} ms, p95 ${q(smp, 0.95).toFixed(4)} ms, max ${Math.max(...smp).toFixed(3)} ms (${smp.length} ticks)`); } } }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/lc_bench.mjs", human: HUMAN, res }));

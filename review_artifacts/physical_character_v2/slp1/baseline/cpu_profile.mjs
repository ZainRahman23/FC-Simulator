// SLP-1 BASELINE (design stage, 8 Oct 2026). READ-ONLY CPU profile of an autonomous V2 run: imports the unmodified harness, keeps a reference to the G3Sim instance, reads its built-in
// cpu counters (cpu.step = Jolt, cpu.passive = passive plan + apply, cpu2.ctrl = StandController.compute, cpu2.act = ActuatorLayer, cpu2.probe, cpu.measure)
import path from "path"; import { pathToFileURL } from "url";
const T = path.join(process.cwd(), "sandbox/visual/physchar2");
const { G3Sim } = await import(pathToFileURL(path.join(T, "gates/v2_g3.js")).href);
let sim = null; const tick0 = G3Sim.prototype.tick; let wall = 0;
G3Sim.prototype.tick = function () { sim = this; const a = performance.now(); const ok = tick0.call(this); wall += performance.now() - a; return ok; };
const args = process.argv.slice(2);
process.argv = [process.argv[0], path.join(T, "tools/loco_probe.mjs"), ...args];
const w0 = performance.now(); await import(pathToFileURL(path.join(T, "tools/loco_probe.mjs")).href); const wTot = performance.now() - w0;
const n = sim.n, r = (x) => +(x / n * 1000).toFixed(1);
console.log(JSON.stringify({ args: args.join(" "), ticks: n, simSeconds: +(n * sim.dt).toFixed(3), wallTotalS: +(wTot / 1000).toFixed(2), tickWallS: +(wall / 1000).toFixed(2),
  usPerTick: { joltStep: r(sim.cpu.step), passive: r(sim.cpu.passive), standController: r(sim.cpu2.ctrl), actuators: r(sim.cpu2.act), probes: r(sim.cpu2.probe), g1g2measure: r(sim.cpu.measure), g3measure: r(sim.g3.cpu), tickTotal: r(wall) },
  harnessOutsideTickUs: r(wTot - wall) }));

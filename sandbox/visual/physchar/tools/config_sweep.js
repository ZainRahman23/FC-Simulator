// timestep / solver configuration comparison on the FINAL body (worst case over drops A–E; one process, sequential)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec } from "../pc_body.js"; import { loadJolt } from "../pc_jolt.js"; import { runDrop } from "../pc_gatea.js";
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.resolve(here, "../../../../assets/characters/outfield/gabriel");
const rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout;
const T = { Float32Array, Uint16Array, Uint32Array }, mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const CFG = [["60x1", {}, "60 Hz, Jolt defaults (hard stops)"], ["60x1", { hingeSoftHz: 20, velSteps: 30 }, "60 Hz, 30 vel it, soft stops"],
  ["120x1", { hingeSoftHz: 20, velSteps: 30 }, "120 Hz, 30 vel it, soft stops"], ["120x1", { hingeSoftHz: 20, velSteps: 30, posSteps: 4 }, "120 Hz, 30 vel / 4 pos it, soft stops"], ["180x1", { hingeSoftHz: 20, velSteps: 30 }, "180 Hz, 30 vel it, soft stops"],
  ["240x1", { hingeSoftHz: 20 }, "240 Hz, 10 vel it (default), soft stops"], ["240x1", { velSteps: 30 }, "240 Hz, 30 vel it, HARD stops"],
  ["240x1", { hingeSoftHz: 20, velSteps: 30 }, "240 Hz, 30 vel / 2 pos it, soft stops"], ["240x1", { hingeSoftHz: 20, velSteps: 30, posSteps: 8 }, "240 Hz, 30 vel / 8 pos it, soft stops"],
  ["240x1", { hingeSoftHz: 20, velSteps: 30, posSteps: 4 }, "240 Hz, 30 vel / 4 pos it, soft stops  ← Gate A"]];
const out = ["config                                        turf mm  joint mm  hard lim °  soft over °  self mm  max E+ J  E+ steps  sleep≤ s   ms/frame"];
for (const [tsc, w, label] of CFG) { const rs = ["A", "B", "C", "D", "E"].map(d => runDrop(J, spec, d, { tsc, world: w }));
  const mx = (f) => Math.max(...rs.map(f)), sum = (f) => rs.reduce((s, r) => s + f(r), 0);
  out.push(`${label.padEnd(45)} ${mx(r => r.maxGroundPenMm).toFixed(1).padStart(7)} ${mx(r => r.maxAnchorErrMm).toFixed(1).padStart(9)} ${mx(r => r.maxHardLimitViolDeg).toFixed(1).padStart(11)} ${mx(r => r.maxSoftStopOvershootDeg).toFixed(1).padStart(12)} ${mx(r => r.maxSelfPenMm).toFixed(1).padStart(8)} ${mx(r => r.energyGain.maxJ).toFixed(2).padStart(9)} ${String(sum(r => r.energyGain.stepsOver50mJ)).padStart(9)} ${mx(r => r.sleepT || 99).toFixed(2).padStart(9)} ${(sum(r => r.cpuMsPerFrame) / rs.length).toFixed(3).padStart(10)}`); }
console.log(out.join("\n")); fs.writeFileSync(path.join(here, "../results/config_sweep.txt"), out.join("\n") + "\n");

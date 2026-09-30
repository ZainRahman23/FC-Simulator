// ═══ physchar/tools/gatea_run.js — GATE A measurement run (Node, one process, sequential) ═══════════════════════════════════════════
// usage: node tools/gatea_run.js [--spec] [--drops A,B,...] [--tsc 60x1,60x2,120x1] [--seconds 6] [--mesh] [--repeat 2] [--out file.json]
//        [--world '{"jointFriction":0}']
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, setHandShape, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runDrop, initialSelfOverlaps, disabledPairs, DROPS } from "../pc_gatea.js";
import { boneBodyMap, referencedVertices } from "../pc_fit.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const PID = arg("--player", "gabriel"), dir = path.join(ROOT, "assets/characters/outfield", PID);
const rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
if (arg("--hand", null)) setHandShape(arg("--hand"));
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) });
const J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const world = arg("--world", null) ? JSON.parse(arg("--world")) : {};
const f2 = (x) => (Array.isArray(x) ? x.map(v => +v.toFixed(3)) : +x.toFixed(3));
if (arg("--spec", false)) {
  console.log(`PLAYER ${spec.player.name} — ${spec.player.heightCm} cm, ${spec.player.weightKg} kg (H ${spec.player.H} m); total physical mass ${spec.totalMass.toFixed(3)} kg`);
  console.log("body         parent       mass(kg)  COM (body-local m)        inertia Ixx/Iyy/Izz (kg m²)   shapes");
  for (const b of spec.bodies) console.log(`${b.name.padEnd(12)} ${String(b.parent).padEnd(12)} ${b.mass.toFixed(3).padStart(7)}  ${JSON.stringify(f2(b.com)).padEnd(24)}  ${JSON.stringify(f2(b.inertia)).padEnd(28)}  ${b.shapes.map(s => s.type === "box" ? `box he=${JSON.stringify(f2(s.he))} cr=${s.cr.toFixed(3)} @${JSON.stringify(f2(s.pos))}` : s.type === "sphere" ? `sphere r=${s.r.toFixed(3)} @${JSON.stringify(f2(s.pos))}` : s.type === "tapered" ? `taperedCapsule half=${s.half.toFixed(3)} rTop=${s.rTop.toFixed(3)} rBot=${s.rBot.toFixed(3)} @${JSON.stringify(f2(s.pos))}` : `capsule half=${s.half.toFixed(3)} r=${s.r.toFixed(3)} @${JSON.stringify(f2(s.pos))}`).join(" + ")}`);
  console.log("\nMESH FIT (vertices skinned mainly to each body vs its colliders): inside% / p95 outside / max outside");
  for (const b of spec.bodies) console.log(`  ${b.name.padEnd(12)} verts ${String(b.fit.verts).padStart(5)}  inside ${String(b.fit.insidePct).padStart(5)}%  p95 out ${String(b.fit.p95OutsideMm).padStart(5)} mm  max out ${b.fit.maxOutsideMm} mm`);
  console.log("\ndisabled self-collision pairs:", disabledPairs(spec).map(([a, b]) => `${spec.bodies[a].name}–${spec.bodies[b].name}`).join(", "));
  for (const d of Object.keys(DROPS)) console.log(`starting-pose self-overlaps ${d}:`, JSON.stringify(initialSelfOverlaps(J, spec, d, world)));
}
const drops = String(arg("--drops", "")).split(",").filter(Boolean), tscs = String(arg("--tsc", "60x1")).split(","), seconds = +arg("--seconds", 6), rep = +arg("--repeat", 1);
if (drops.length) {
  const filterPairs = disabledPairs(spec), withMesh = !!arg("--mesh", false);
  const meshOpts = withMesh ? { mesh, rig, refList: referencedVertices(mesh), map: boneBodyMap(rig) } : {};
  const results = [];
  for (const tsc of tscs) for (const d of drops) {
    const runs = []; for (let r = 0; r < rep; r++) runs.push(runDrop(J, spec, d, Object.assign({ tsc, seconds, world }, r === 0 ? meshOpts : {})));
    const s = runs[0]; s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === s.hash); delete s.recs; results.push(s);
    console.log(`${tsc.padEnd(6)} ${d}  lowest@start ${s.initialLowestBody.padEnd(10)} groundPen ${String(s.maxGroundPenMm).padStart(6)} mm (rest ${s.restGroundPenMm})  mesh ${String(s.maxMeshPenMm).padStart(5)} (${s.maxMeshPenPart}; rest ${s.restMeshPenMm} ${s.restMeshPenPart})  self ${String(s.maxSelfPenMm).padStart(6)}  anchor ${String(s.maxAnchorErrMm).padStart(7)} mm  limit ${String(s.maxLimitViolDeg).padStart(6)}°  pop ${String(s.maxPopMm).padStart(6)} mm  E+ ${s.energyGain.stepsOver50mJ}/${s.energyGain.maxJ}J  settle ${s.settleT}  sleep ${s.sleepT}  resid ${s.residualMaxSpeedMmS} mm/s  cpu ${s.cpuMsPerFrame} ms/frame  det ${s.deterministic} ${s.hash}`);
    if (arg("--order", false)) console.log("        first ground contacts:", s.firstGroundContactOrder.join("  "));
    if (arg("--why", false)) console.log(`        worst: anchor ${JSON.stringify(s.maxAnchorAt)}  limit ${JSON.stringify(s.maxLimitAt)}  self ${JSON.stringify(s.maxSelfPenAt)}  ground ${JSON.stringify(s.maxGroundPenAt)}  pop ${JSON.stringify(s.maxPopAt)}  energy ${JSON.stringify(s.energyGain)}`);
  }
  if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ player: spec.player, world, filterPairs: filterPairs.map(([a, b]) => [spec.bodies[a].name, spec.bodies[b].name]), results }, null, 1));
}

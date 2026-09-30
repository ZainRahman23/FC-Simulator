// per-step energy trace around the largest energy-gain step of one drop (diagnostic)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec } from "../pc_body.js"; import { loadJolt } from "../pc_jolt.js"; import { runDrop } from "../pc_gatea.js"; import { deg } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.resolve(here, "../../../../assets/characters/outfield/gabriel");
const rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout;
const T = { Float32Array, Uint16Array, Uint32Array }, mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const [drop, tsc, wjson] = process.argv.slice(2); const S = runDrop(J, spec, drop, { tsc, world: JSON.parse(wjson || "{}"), keepStates: true });
const R = S.recs, i0 = R.findIndex(r => r.n === S.worst.energy);
for (let i = Math.max(1, i0 - 3); i <= Math.min(R.length - 1, i0 + 3); i++) { const r = R[i], p = R[i - 1];
  const dk = r.keB.map((k, b) => [spec.bodies[b].name, k - p.keB[b]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  console.log(`n=${r.n} t=${r.t.toFixed(4)} E=${r.E.toFixed(2)} dE=${(r.E - p.E).toFixed(2)} dKE=${(r.ke - p.ke).toFixed(2)} dPE=${(r.pe - p.pe).toFixed(2)} contacts=${r.contacts} groundPen=${(r.groundPen*1000).toFixed(1)}mm  top dKE: ${dk.map(([n, d]) => n + " " + d.toFixed(2)).join(", ")}`);
  const fr = r.states[spec.bodies.findIndex(b => b.name === "foot_R")]; console.log(`      foot_R |v| ${Math.hypot(...fr.v).toFixed(2)} |w| ${Math.hypot(...fr.w).toFixed(1)}   knee_R ${deg(r.jstates[11].a).toFixed(1)}°  ankle_R t/y/z ${[r.jstates[12].twist, r.jstates[12].swingY, r.jstates[12].swingZ].map(x => deg(x).toFixed(1)).join("/")}`); }

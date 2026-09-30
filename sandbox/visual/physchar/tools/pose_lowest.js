// pose design helper: per-body lowest collider point (relative to the global lowest) for a candidate drop pose
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, shapeLowestY } from "../pc_body.js"; import { poseBodies } from "../pc_gatea.js"; import { Q } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.resolve(here, "../../../../assets/characters/outfield/gabriel");
const rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout;
const T = { Float32Array, Uint16Array, Uint32Array }, mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), rad = (d) => d * Math.PI / 180;
const [rotJson, jJson] = process.argv.slice(2), rs = JSON.parse(rotJson);   // rot as a list of [axis, deg] applied left→right
const rot = rs.reduce((q, [ax, d]) => Q.mul(q, Q.axis(ax === "x" ? [1, 0, 0] : ax === "y" ? [0, 1, 0] : [0, 0, 1], rad(d))), [0, 0, 0, 1]);
const S = poseBodies(spec, rot, JSON.parse(jJson)), low = spec.bodies.map((b, i) => [b.name, Math.min(...b.shapes.map(s => shapeLowestY(s, S[i].pos, S[i].rot)))]);
const m = Math.min(...low.map(x => x[1])); console.log(low.sort((a, b) => a[1] - b[1]).slice(0, 6).map(([n, y]) => `${n} +${((y - m) * 1000).toFixed(0)}mm`).join("  "));

// validation: our joint-coordinate measurement (pc_gatea jointState) vs Jolt's own constraint readouts, on drop E
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec } from "../pc_body.js"; import { loadJolt, JoltCharacterWorld } from "../pc_jolt.js";
import { DROPS, poseBodies, lowestOf, jointState, frictionPolicy, disabledPairs } from "../pc_gatea.js"; import { V, Q, deg } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.resolve(here, "../../../../assets/characters/outfield/gabriel");
const rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout;
const T = { Float32Array, Uint16Array, Uint32Array }, mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const w = new JoltCharacterWorld(J, spec, {}, frictionPolicy(spec)); for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
const D = DROPS.E; let S = poseBodies(spec, D.rot, D.j); const up = 1.5 - lowestOf(spec, S).y; S.forEach((s, i) => w.setPose(i, V.add(s.pos, [0, up, 0]), s.rot));
w.setGravity(0); w.step(1 / 600, 1);
const st = spec.bodies.map((b, i) => w.read(i));
spec.joints.forEach((j, k) => { const mine = jointState(j, st);
  if (j.type === "hinge") console.log(j.name.padEnd(11), "hinge  mine", deg(mine.a).toFixed(2), " jolt", deg(w.hingeAngle(k)).toFixed(2), " param", (D.j[j.name] || {}).a || 0);
  else { const jq = w.sixdofRot(k), js = Q.swingTwist(jq); console.log(j.name.padEnd(11), "sixdof mine t/y/z", [mine.twist, mine.swingY, mine.swingZ].map(x => deg(x).toFixed(1)).join("/"), "  jolt", [js.twist, js.swingY, js.swingZ].map(x => deg(x).toFixed(1)).join("/"), "  param", JSON.stringify(D.j[j.name] || {})); } });
w.destroy();

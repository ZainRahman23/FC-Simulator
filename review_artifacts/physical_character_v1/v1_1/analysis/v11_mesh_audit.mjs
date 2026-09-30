// V1.1 audit: the rendered mesh's landmarks vs the rig's joint centres (bind pose, metres; +x = his right, +z forward)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const nv = mesh.positions.length / 3, ref = new Uint8Array(nv); for (const i of mesh.indices) ref[i] = 1;
const V = []; for (let v = 0; v < nv; v++) { if (!ref[v]) continue; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = mesh.weights[v * 4 + k]; if (w > bw) { bw = w; bi = mesh.joints[v * 4 + k]; } } V.push({ p: [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]], bone: rig.bones[bi].name, w: bw }); }
const B = Object.fromEntries(rig.bones.map(b => [b.name, b.bindOrigin])), f3 = (a) => a.map(x => (+x).toFixed(3)).join(", ");
const slab = (y, h, pred) => V.filter(v => Math.abs(v.p[1] - y) <= h && (!pred || pred(v)));
const ext = (vs, k) => vs.length ? [Math.min(...vs.map(v => v.p[k])), Math.max(...vs.map(v => v.p[k]))] : [NaN, NaN];
const cen = (vs) => vs.length ? [0, 1, 2].map(k => vs.reduce((a, v) => a + v.p[k], 0) / vs.length) : [NaN, NaN, NaN];
console.log("stature H", rig.H, "identity", JSON.stringify(rig.identity));
console.log("\n== rig joint centres (bindOrigin) =="); for (const b of rig.bones) console.log(b.name.padEnd(12), f3(b.bindOrigin));
console.log("\n== visible width (full mesh x-extent) at heights ==");
for (const y of [1.60, 1.58, 1.55, 1.50, 1.40, 1.25, 1.15, 1.05, 1.012, 0.98, 0.95, 0.92, 0.88]) { const s = slab(y, 0.006), trunk = s.filter(v => !/Arm|hand|foreArm/.test(v.bone)); const x = ext(trunk, 0); console.log(`y ${y.toFixed(3)}  trunk+legs x ${x.map(v => v.toFixed(3))}  width ${(x[1] - x[0]).toFixed(3)}  (${[...new Set(trunk.map(v => v.bone))].join(",")})`); }
console.log("\n== crotch: lowest vertex with |x| < 0.03 carried by pelvis/thigh ==", Math.min(...V.filter(v => Math.abs(v.p[0]) < 0.03 && /pelvis|thigh|root/.test(v.bone)).map(v => v.p[1])).toFixed(3));
console.log("\n== leg column (thigh/shin vertices, right side) centroid + x-extent by height ==");
for (const y of [0.98, 0.94, 0.90, 0.85, 0.75, 0.65, 0.58, 0.53, 0.48, 0.40, 0.30, 0.20, 0.14, 0.11]) { const s = slab(y, 0.008, v => v.p[0] > 0 && /thigh_R|shin_R|foot_R/.test(v.bone)); const c = cen(s), x = ext(s, 0), z = ext(s, 2); console.log(`y ${y.toFixed(2)}  n ${String(s.length).padStart(4)}  centroid x ${c[0].toFixed(3)} z ${c[2].toFixed(3)}   x ${x.map(v => v.toFixed(3))} (w ${(x[1] - x[0]).toFixed(3)})  z ${z.map(v => v.toFixed(3))} (d ${(z[1] - z[0]).toFixed(3)})`); }
console.log("\n== arm column (right) centroid by height ==");
for (const y of [1.64, 1.62, 1.60, 1.58, 1.55, 1.50, 1.40, 1.30, 1.25, 1.20, 1.10, 1.00]) { const s = slab(y, 0.008, v => v.p[0] > 0.12 && /Arm_R|clavicle_R|hand_R|chest/.test(v.bone)); const c = cen(s), x = ext(s, 0); console.log(`y ${y.toFixed(2)}  n ${String(s.length).padStart(4)} centroid x ${c[0].toFixed(3)} z ${c[2].toFixed(3)}  x ${x.map(v => v.toFixed(3))} (${[...new Set(s.map(v => v.bone))].join(",")})`); }
const sh = V.filter(v => /upperArm_R|clavicle_R|chest/.test(v.bone) && v.p[0] > 0.15); console.log("shoulder top (max y of verts x>0.15):", Math.max(...sh.map(v => v.p[1])).toFixed(3), "outermost deltoid x:", Math.max(...V.filter(v => /upperArm_R/.test(v.bone)).map(v => v.p[0])).toFixed(3));
const neck = V.filter(v => v.bone === "neck"); console.log("neck verts y", ext(neck, 1).map(v => v.toFixed(3)), "head verts y", ext(V.filter(v => v.bone === "head"), 1).map(v => v.toFixed(3)));
console.log("\n== foot / boot (right) ==", JSON.stringify(rig.feet.R)); const fr = V.filter(v => /foot_R|toe_R/.test(v.bone)); console.log("boot x", ext(fr, 0).map(v => v.toFixed(3)), "y", ext(fr, 1).map(v => v.toFixed(3)), "z", ext(fr, 2).map(v => v.toFixed(3)));
const pel = V.filter(v => v.bone === "pelvis" || v.bone === "root"); console.log("\npelvis-bone verts: x", ext(pel, 0).map(v => v.toFixed(3)), "y", ext(pel, 1).map(v => v.toFixed(3)), "z", ext(pel, 2).map(v => v.toFixed(3)), "n", pel.length);

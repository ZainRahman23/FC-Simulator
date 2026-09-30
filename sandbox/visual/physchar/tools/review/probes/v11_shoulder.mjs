import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const nv = mesh.positions.length / 3, ref = new Uint8Array(nv); for (const i of mesh.indices) ref[i] = 1;
const V = []; for (let v = 0; v < nv; v++) { if (!ref[v]) continue; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = mesh.weights[v * 4 + k]; if (w > bw) { bw = w; bi = mesh.joints[v * 4 + k]; } } V.push({ p: [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]], bone: rig.bones[bi].name }); }
const R = V.filter(v => v.p[0] > 0.05);   // right side, all bones
// upper-arm shaft axis: centroid of upperArm_R vertices in horizontal bands
const band = (y0, y1) => { const s = R.filter(v => v.bone === "upperArm_R" && v.p[1] >= y0 && v.p[1] < y1); return s.length ? [s.reduce((a, v) => a + v.p[0], 0) / s.length, s.reduce((a, v) => a + v.p[2], 0) / s.length, s.length] : null; };
for (const [a, b] of [[1.26, 1.30], [1.30, 1.35], [1.35, 1.40], [1.40, 1.45], [1.45, 1.50], [1.50, 1.55], [1.55, 1.60]]) { const c = band(a, b); console.log(`upperArm_R band y ${a}–${b}: centroid x ${c ? c[0].toFixed(3) : "-"} z ${c ? c[1].toFixed(3) : "-"} n ${c ? c[2] : 0}`); }
// outer surface: for x columns, the top of the mesh (max y) — the shoulder profile
for (const x of [0.10, 0.14, 0.18, 0.20, 0.22, 0.24, 0.26, 0.28, 0.30, 0.32]) { const s = R.filter(v => Math.abs(v.p[0] - x) < 0.01 && Math.abs(v.p[2]) < 0.06 && v.p[1] > 1.3); console.log(`shoulder profile x ${x.toFixed(2)}: top y ${s.length ? Math.max(...s.map(v => v.p[1])).toFixed(3) : "-"} (${[...new Set(s.map(v => v.bone))].join(",")})`); }
// lateral extent of the arm/shoulder mesh at heights
for (const y of [1.60, 1.57, 1.55, 1.52, 1.50, 1.48, 1.45, 1.42]) { const s = R.filter(v => Math.abs(v.p[1] - y) < 0.012 && Math.abs(v.p[2]) < 0.07); console.log(`y ${y}: x max ${s.length ? Math.max(...s.map(v => v.p[0])).toFixed(3) : "-"} n ${s.length}`); }
// is the rig GH (0.2583, 1.5948) inside the mesh? nearest vertex distance + mesh vertices above it within a 2 cm column
const gh = rig.bones.find(b => b.name === "upperArm_R").bindOrigin; const near = Math.min(...R.map(v => Math.hypot(v.p[0] - gh[0], v.p[1] - gh[1], v.p[2] - gh[2])));
const above = R.filter(v => Math.abs(v.p[0] - gh[0]) < 0.015 && Math.abs(v.p[2] - gh[2]) < 0.03 && v.p[1] > gh[1]).length, beside = R.filter(v => Math.abs(v.p[1] - gh[1]) < 0.015 && Math.abs(v.p[2]) < 0.03 && v.p[0] > gh[0]).length;
console.log("rig GH", gh.map(v => v.toFixed(4)), "nearest mesh vertex", near.toFixed(3), "m; vertices ABOVE it in a 1.5 cm column:", above, "; vertices LATERAL of it at its height:", beside);

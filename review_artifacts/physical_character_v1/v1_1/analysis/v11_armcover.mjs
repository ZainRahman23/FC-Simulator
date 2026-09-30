// upper-arm mesh coverage: fraction of the upperArm-dominant vertices inside (upper-arm colliders) and inside (upper-arm ∪ chest ∪ foreArm colliders)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec, shapeSdf } = await import(PC + "/pc_body.js"); const { V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const ref = new Uint8Array(mesh.positions.length / 3); for (const i of mesh.indices) ref[i] = 1;
for (const cal of ["V1", "V1.1"]) { const spec = buildBodySpec(rig, mesh, { calib: cal }), bi = (n) => spec.bodies.findIndex(b => b.name === n);
  for (const side of ["R"]) { const arm = bi("upperArm_" + side), set = [arm, bi("chest"), bi("foreArm_" + side)];
    const inside = (p, bodies) => bodies.some(k => spec.bodies[k].shapes.some(s => shapeSdf(s, V.sub(p, spec.bodies[k].origin)) <= 0.005));
    let n = 0, a = 0, u = 0; for (let v = 0; v < ref.length; v++) { if (!ref[v]) continue; let bw = -1, bj = -1; for (let q = 0; q < 4; q++) if (mesh.weights[v * 4 + q] > bw) { bw = mesh.weights[v * 4 + q]; bj = mesh.joints[v * 4 + q]; }
      if (rig.bones[bj].name !== "upperArm_" + side) continue; const p = [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]]; n++; if (inside(p, [arm])) a++; if (inside(p, set)) u++; else (globalThis.U = globalThis.U || []).push(p); }
    console.log(`${cal} upperArm_${side}: ${n} dominant vertices · inside its own colliders ${(100 * a / n).toFixed(1)} % · inside upper-arm ∪ chest ∪ forearm ${(100 * u / n).toFixed(1)} % (5 mm tolerance, as the fit report)`); const U = globalThis.U || [], q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))]; }; if (U.length) console.log(`   uncovered ${U.length}: y p10/p50/p90 ${[0.1, 0.5, 0.9].map(f => q(U.map(p => p[1]), f).toFixed(3))} · x ${[0.1, 0.5, 0.9].map(f => q(U.map(p => p[0]), f).toFixed(3))} · z ${[0.1, 0.5, 0.9].map(f => q(U.map(p => p[2]), f).toFixed(3))}`); globalThis.U = []; } }

import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js");
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true });
const c = {}, env = {}; for (const q of r.recs) { if (q.t < 2.5 || q.t > 10) continue; for (const e of q.arb) { if (!Array.isArray(e.sat)) continue; const C = c[e.joint] = c[e.joint] || [0, 0, 0, 0]; C[3]++; e.sat.forEach((b, i) => { if (b) C[i]++; });
  if (e.env && e.env.hi) { const E = env[e.joint] = env[e.joint] || { lo: [1e9, 1e9, 1e9], hi: [0, 0, 0], sum: [0, 0, 0] }; e.env.hi.forEach((v, i) => { E.lo[i] = Math.min(E.lo[i], v); E.hi[i] = Math.max(E.hi[i], v); E.sum[i] += v; }); } } }
for (const j in c) if (c[j][0] + c[j][1] + c[j][2]) console.log(j.padEnd(12), "sat X/Y/Z", c[j].slice(0, 3).join("/"), "of", c[j][3], "| env hi min/mean/max X", env[j] ? [env[j].lo[0], env[j].sum[0] / c[j][3], env[j].hi[0]].map(v => v.toFixed(0)).join("/") : "", "Y", env[j] ? [env[j].lo[1], env[j].sum[1] / c[j][3], env[j].hi[1]].map(v => v.toFixed(0)).join("/") : "", "Z", env[j] ? [env[j].lo[2], env[j].sum[2] / c[j][3], env[j].hi[2]].map(v => v.toFixed(0)).join("/") : "");

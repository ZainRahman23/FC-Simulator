import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, process.argv[3], { poses, keepStates: true }); const fR = spec.bodies.findIndex(b => b.name === "foot_R"), shR = spec.bodies.findIndex(b => b.name === "shin_R");
for (let w0 = 1.0; w0 < 4.0; w0 += 0.25) { const W = r.recs.filter(q => q.t >= w0 && q.t < w0 + 0.25); const J3 = W.reduce((a, q) => a.map((v, i) => v + q.ledger.obst[i]), [0, 0, 0]); const who = new Set(); for (const q of W) for (const c of q.cts) if ((c.a < -1 || c.b < -1) && c.depth > -0.0005) who.add(spec.bodies[c.a >= 0 ? c.a : c.b].name);
  console.log(w0.toFixed(2), "avg force on character from box (N)", J3.map(v => (v / 0.25).toFixed(1)).join(","), "| bodies touching box:", [...who].join(" "), "| foot R", W[W.length - 1].fp.R.map(v => v.toFixed(3)).join(","), W[W.length - 1].feet.R.state); }

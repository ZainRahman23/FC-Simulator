import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), GAP = +(process.argv[3] || 0.85);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { V, Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
D.TESTS_D.D6_slide.A.init.leadGap = GAP; const r = D.runD(J, spec, "D6_slide", { keepStates: true }), nb = spec.bodies.length;
const fR = spec.bodies.findIndex(b => b.name === "foot_R"), fLB = nb + spec.bodies.findIndex(b => b.name === "foot_L");
const i0 = r.recs.findIndex(q => q.inter.length); for (let k = i0 - 3; k < i0 + 10; k++) { const q = r.recs[k], s = q.states[fR], box = spec.bodies[fR].shapes[0];
  // the boot's front tip velocity (COM velocity + ω × r) vs its COM velocity
  const tip = V.add(s.pos, Q.rot(s.rot, [0, box.pos[1], box.pos[2] + box.he[2]])), vTip = V.add(s.v, V.cross(s.w, V.sub(tip, s.com)));
  console.log(q.n, q.inter.map(c => `${c.a}↔${c.b} ${(c.depth * 1000).toFixed(2)}mm`).join(" ") || "-", `| A.foot_R v ${Math.hypot(...s.v).toFixed(2)} ω ${Math.hypot(...s.w).toFixed(1)} rad/s tip v ${Math.hypot(...vTip).toFixed(2)} m/s`); }

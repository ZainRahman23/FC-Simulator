import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const G2 = await import(PC + "/pc_gateg1a.js"); let loco = null;
const r = G.runG1a(J, spec, process.argv[3], { poses, keepStates: true, ...extra }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// footholds: planned vs actual (x lateral, z forward) and the swing foot's max lateral / forward deviation from its straight path
const fI = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") };
const th = { L: spec.bodies.findIndex(b => b.name === "thigh_L"), R: spec.bodies.findIndex(b => b.name === "thigh_R") };
for (const q of r.recs) { const e = q.exec; if (!e || e.kind !== "rhythmic" || e.planned.t < 1.9 || e.planned.t > 2.0 || q.n % 3) continue; const fp = q.states[fI[e.sw]].pos, tg = q.swingTgt ? q.swingTgt.pos : null, hp = q.states[th[e.sw]].pos, pel = q.states[0];
  console.log(`${f(q.t)} ${e.stage.padEnd(8)} u ${f(e.u, 2)} | tgt ${tg ? tg.map(v => f(v)).join(",") : "-"} | foot ${fp.map(v => f(v)).join(",")} | d ${tg ? [fp[0] - tg[0], fp[1] - tg[1], fp[2] - tg[2]].map(v => f(v)).join(",") : "-"} | hip ${hp.map(v => f(v)).join(",")} | pelvis pitch ${f(Math.asin(2 * (pel.rot[3] * pel.rot[0] - pel.rot[1] * pel.rot[2])) * 57.3, 1)} | load ${f(q.feet[e.sw].load, 0)} ${q.feet[e.sw].state}`); }

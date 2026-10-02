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
let cur = null, dev = null;
for (const q of r.recs) { const e = q.exec; if (e && e.kind === "rhythmic" && q.swingTgt) { const fp = q.states[fI[e.sw]].pos, tg = q.swingTgt.pos; if (!cur || cur.sw !== e.sw || cur.i !== e.planned) { if (cur) console.log(JSON.stringify(cur)); cur = { sw: e.sw, i: e.planned, maxDx: 0, maxDz: 0, endDx: 0, endDz: 0, maxDy: 0 }; }
  const dx = fp[0] - tg[0], dz = fp[2] - tg[2], dy = fp[1] - tg[1]; if (Math.abs(dx) > Math.abs(cur.maxDx)) cur.maxDx = +dx.toFixed(3); if (Math.abs(dz) > Math.abs(cur.maxDz)) cur.maxDz = +dz.toFixed(3); if (Math.abs(dy) > Math.abs(cur.maxDy)) cur.maxDy = +dy.toFixed(3); cur.endDx = +dx.toFixed(3); cur.endDz = +dz.toFixed(3); } }
if (cur) console.log(JSON.stringify(cur));

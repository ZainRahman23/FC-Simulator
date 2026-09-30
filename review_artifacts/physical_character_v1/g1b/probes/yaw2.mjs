import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const { V, Q } = await import(PC + "/pc_math.js");
const yaw = (q) => { const fz = Q.rot(q, [0, 0, 1]); return Math.atan2(fz[0], fz[2]) * 57.2958; };
for (const [nm, o] of [["default (style IDLE)", {}], ["no style", { loco: { style: false } }], ["0/0 delays", { loco: { delayFb: 0, delayPlan: 0 } }], ["no swing FF", { loco: { noSwingFF: true } }]]) {
  const r = G.runG1a(J, spec, "S4_steps10", { poses, keepStates: true, ...o }), R = r.recs.filter(q => q.t > 1.5 && q.t < 6.5), ys = R.map(q => yaw(q.states[0].rot));
  const satTw = (s, j) => R.filter(q => { const e = q.arb.find(a => a.joint === j + "_" + s); return e && Array.isArray(e.sat) && e.sat[0]; }).length;
  const twistReal = (j) => Math.max(...R.map(q => { const e = q.arb.find(a => a.joint === j); return Math.abs(e.real[0]); }));
  console.log(`${nm.padEnd(22)} ${r.outcome} · pelvis yaw ${Math.min(...ys).toFixed(1)}…${Math.max(...ys).toFixed(1)}° · twist-axis saturated steps: hip L ${satTw("L", "hip")} R ${satTw("R", "hip")} ankle L ${satTw("L", "ankle")} R ${satTw("R", "ankle")} · peak |twist τ| hip_L ${twistReal("hip_L").toFixed(0)} ankle_L ${twistReal("ankle_L").toFixed(0)} N·m`); }

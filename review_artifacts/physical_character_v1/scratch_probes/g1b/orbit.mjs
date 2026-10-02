import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const { V, Q } = await import(PC + "/pc_math.js"); const yaw = (q) => { const fz = Q.rot(q, [0, 0, 1]); return Math.atan2(fz[0], fz[2]) * 57.2958; }, f = (x, d = 3) => (+x).toFixed(d);
for (const [nm, key, o] of JSON.parse(process.argv[3])) { const r = G.runG1a(J, spec, key, { poses, keepStates: true, ...o }), R = r.recs;
  const rows = r.steps.filter(s => s.tdT != null).map(s => { const q = R.find(x => x.t >= s.tdT - 1e-9), w = R.filter(x => x.t > s.liftoffT && x.t <= s.tdT), ys = w.map(x => yaw(x.states[0].rot));
    return `${s.sw}${s.kind[0]} ξx@td ${f(q.xi[0])} ξz ${f(q.xi[1])} vx ${f(q.vcom[0], 2)} adj ${s.adjustCm ?? "-"} yaw ${f(Math.min(...ys), 1)}..${f(Math.max(...ys), 1)}`; });
  console.log(`== ${nm}: ${r.outcome}`); rows.forEach(x => console.log("   " + x)); }

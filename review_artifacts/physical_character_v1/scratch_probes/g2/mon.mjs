import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// monitor audit: verdict / state / reason / beyond around a window
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: false, seconds: +(process.env.SEC || 2.0), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const t0 = +(process.env.T0 || 1.5), t1 = +(process.env.T1 || 1.85), ev = +(process.env.EV || 3); let last = "";
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const m = q.mon, s = `${m.verdict} ${m.state} ${m.reason || ""}`;
  console.log(`${f(q.t)} ${q.rhythm ? q.rhythm.stage : ""} ${q.exec ? q.exec.kind[0] + q.exec.sw + " " + q.exec.stage : "-"} | ${s} | beyond ${JSON.stringify(m.beyond)} | xi ${q.xi.map(v => f(v)).join(",")} | xiMargin ${f(q.xiMargin)} feet ${q.feet.L.state.slice(0,5)}/${q.feet.R.state.slice(0,5)}`); }

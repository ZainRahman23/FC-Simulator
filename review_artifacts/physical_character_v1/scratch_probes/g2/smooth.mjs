import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 1) => (+x).toFixed(d); const TC = +(process.env.TC || 4.06);
let got = null; const r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, seconds: TC + 0.02, onLoco: (loco) => { const orig = loco._swingFF.bind(loco); loco._swingFF = (o, R, u) => { if (!got && o.t >= TC - 0.12) { got = { loco, o, R }; } return orig(o, R, u); }; } });
const { loco, o, R } = got, ex = loco.planner.exec; console.log("o.t", o.t, "tSw0", R.tSw0, "T", R.T);
const pts = []; for (let i = +(process.env.I0 || -40); i <= +(process.env.I1 || 40); i++) { const tt = o.t + i / 1000; const tg = ex._timedAt(R, tt, o, true); pts.push({ tt, p: tg.pos, w: (tt - R.tSw0) / R.T }); }
for (let i = 1; i < pts.length - 1; i += +(process.env.IS || 2)) { const a = pts[i - 1].p, b = pts[i].p, c = pts[i + 1].p, acc = [0, 1, 2].map(k => (c[k] - 2 * b[k] + a[k]) * 1e6), vel = [0, 1, 2].map(k => (c[k] - a[k]) * 500);
  console.log(f(pts[i].tt, 3), "w", f(pts[i].w, 3), "pos", b.map(v => f(v * 100, 2)).join(","), "vel", vel.map(v => f(v, 2)).join(","), "acc", acc.map(v => f(v, 0)).join(",")); }

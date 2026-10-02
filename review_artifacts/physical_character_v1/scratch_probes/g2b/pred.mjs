import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// PREDICTION CHECK — per rhythmic step: the swing-phase prediction of ξ at touchdown (the last adjust before touchdown, and one at mid-swing)
// vs the actual ξ at touchdown, along / across the heading (cm), and the time of the last adjust before touchdown
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {}; let LOCO = null;
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, seconds: +(process.env.SEC || 6), onLoco: (l) => { LOCO = l; }, ...OV });
const h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], pr = (a, b) => [((a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1]) * 100, ((a[0] - b[0]) * rt[0] + (a[1] - b[1]) * rt[1]) * 100];
for (const R of LOCO.planner.exec.done) { if (!R.td || !R.adjLog || !R.adjLog.length) continue; const A = R.adjLog, last = A[A.length - 1], mid = A[Math.floor(A.length / 2)], xi = R.td.xi;
  const eL = pr(last.pred, xi), eM = pr(mid.pred, xi);
  console.log(`${R.kind[0]}${R.sw} td ${R.td.t.toFixed(3)} | last adjust ${(R.td.t - last.t).toFixed(3)} s before td: pred − actual along ${eL[0].toFixed(1)} across ${eL[1].toFixed(1)} cm | mid-swing (${(R.td.t - mid.t).toFixed(2)} s before): along ${eM[0].toFixed(1)} across ${eM[1].toFixed(1)} cm | #adj ${A.length}`); }

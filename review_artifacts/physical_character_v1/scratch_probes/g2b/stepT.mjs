import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// PER-STEP TABLE — for each rhythmic step: sideways / forward ξ offset at the single-support start (from the stance point; sideways = toward
// the swing side), liftoff delay after the step start, swing fraction at touchdown, step length and width, foothold error, ξ at touchdown
// relative to the landed foot (sideways, + = outside), the following double-support duration, COM speed at touchdown, pelvis yaw at touchdown
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {}; let LOCO = null;
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 15), onLoco: (l) => { LOCO = l; }, ...OV });
const h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1], lt = (a, b) => (a[0] - b[0]) * rt[0] + (a[1] - b[1]) * rt[1];
const yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]) * 57.3; }, recAt = (t) => r.recs.reduce((b, q) => Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b, r.recs[0]);
console.log(`${r.outcome} · ${r.steps.length} steps · hash ${r.hash}`); console.log("step  t     | c0 lat fwd (cm) | lift dly | u_td | step  width | err lat fwd | b plan | ξtd lat | DS    | v_td | yaw_td");
const D = LOCO.planner.exec.done; for (let i = 0; i < D.length; i++) { const R = D[i]; if (!R.pSt || !R.xiIni) continue; const side = R.sw === "R" ? 1 : -1, c0l = lt(R.xiIni, R.pSt) * side * 100, c0f = fw(R.xiIni, R.pSt) * 100;
  const lift = R.liftoff != null ? (typeof R.liftoff === "number" ? R.liftoff : R.liftoff.t) : null, dly = lift != null ? lift - R.tSw0 : null, td = R.td, land = td ? td.center : null;
  const step = land ? fw(land, R.pSt) * 100 : null, width = land ? lt(land, R.pSt) * side * 100 : null, err = land && R.plannedTd ? lt(land, R.plannedTd.center) * side * 100 : null, errF = land && R.plannedTd ? fw(land, R.plannedTd.center) * 100 : null, A = R.adjLog && R.adjLog.length ? R.adjLog[R.adjLog.length - 1] : null, bPl = A && td ? lt(A.tc, A.pred) * side * 100 : null, xl = td ? lt(td.xi, land) * side * 100 : null;
  const nx = D[i + 1], ds = td && nx ? nx.tSw0 - td.t : null, q = td ? recAt(td.t) : null, v = q ? q.vcom[0] * hd[0] + q.vcom[2] * hd[1] : null;
  const f = (x, d = 1, w = 5) => (x == null || !Number.isFinite(x) ? "-" : x.toFixed(d)).padStart(w);
  console.log(`${(R.kind[0] + R.sw).padEnd(4)} ${R.tSw0.toFixed(2)} | ${f(c0l)} ${f(c0f)} | ${f(dly, 3, 6)} | ${f(td ? (td.t - R.tSw0) / R.T : null, 2, 4)} | ${f(step)} ${f(width)} | ${f(err)} ${f(errF)} | b_plan ${f(bPl)} | ${f(xl)} | ${f(ds, 3, 5)} | ${f(v, 2)} | ${f(q ? yaw(q.states[0].rot) : null)}`); }

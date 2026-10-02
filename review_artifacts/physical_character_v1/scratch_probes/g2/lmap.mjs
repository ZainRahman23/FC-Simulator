import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// the step-to-step LATERAL map: per rhythmic step, the capture-point offset c0 at the single-support start (inward, toward the swing side, from
// the stance point), the placed width (touchdown centre from the stance point, across the heading), ξ at touchdown relative to the landed foot,
// and the next step's c0 — plus the forward speed at touchdown
let LOCO = null; const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, seconds: +(process.env.SEC || 15), onLoco: (l) => { LOCO = l; }, ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
console.log(r.outcome, "steps", r.steps.length); const D = LOCO.planner.exec.done, h = LOCO.planner.rhythm && LOCO.planner.rhythm.wk ? LOCO.planner.rhythm.wk.h0 : 0, hd = [Math.sin(h), Math.cos(h)], rt = [hd[1], -hd[0]];
for (const q of D) { if (!q.pSt || !q.xiIni) continue; const side = q.sw === "R" ? 1 : -1, d = (a, b) => (a[0] - b[0]) * rt[0] + (a[1] - b[1]) * rt[1], fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1];
  const c0 = d(q.xiIni, q.pSt) * side, tdC = q.plannedTd && q.plannedTd.center, land = q.tdCenter || (q.td && q.td.center) || null, xiTd = q.xiTd || (q.td && q.td.xi) || null;
  console.log(`${q.kind[0]}${q.sw} t ${f(q.tSw0, 2)} c0 ${f(c0 * 100, 1)} cm | width planned ${tdC ? f(d(tdC, q.pSt) * side * 100, 1) : "-"} landed ${land ? f(d(land, q.pSt) * side * 100, 1) : "-"} | step ${land ? f(fw(land, q.pSt) * 100, 1) : "-"} | ξtd−land ${xiTd && land ? f(d(xiTd, land) * side * 100, 1) : "-"} cm | adj ${f(q.adjustCm, 1)} | T ${f(q.T, 3)}`); }

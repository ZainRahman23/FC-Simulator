import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// TOUCHDOWN DECOMPOSITION — per touchdown: the landing foot's approach (heading frame: fwd / lat-outward / vertical, m/s), its pitch / roll at
// contact, the first contact part; over [td − 0.02, td + W]: per-foot impulse (heading frame, N·s), the yaw moment of each foot's force about
// the COM (∫ (r × F)_y, N·m·s), the whole-body ΔL_y and its remainder (free moments), pelvis yaw change, landing-foot slip, landing knee
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {}, W = +(process.env.W || 0.15);
let LOCO = null; const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 8), onLoco: (l) => { LOCO = l; }, ...OV });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, ji = (n) => spec.joints.findIndex(j => j.name === n), dt = 1 / 60;
const yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]); }, pit = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[1], Math.hypot(z[0], z[2])) * 57.3; }, rol = (q) => { const x = Q.rot(q, [1, 0, 0]); return Math.asin(Math.max(-1, Math.min(1, x[1]))) * 57.3; };
const h0 = LOCO.planner.rhythm && LOCO.planner.rhythm.wk ? LOCO.planner.rhythm.wk.h0 : 0, hd = [Math.sin(h0), 0, Math.cos(h0)], lt = [hd[2], 0, -hd[0]];
const recAt = (t) => r.recs.reduce((b, q) => Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b, r.recs[0]);
console.log(r.outcome, "steps", r.steps.length, "| recs every", (r.recs[1].t - r.recs[0].t).toFixed(4), "s");
const rows = [];
for (const R of LOCO.planner.exec.done) { if (!R.td) continue; const sw = R.sw, st = sw === "R" ? "L" : "R", side = sw === "R" ? 1 : -1, t0 = R.td.t, q0 = recAt(t0), fv = q0.states[fi[sw]].v, cv = q0.vcom;
  const app = [fv[0] * hd[0] + fv[2] * hd[2], (fv[0] * lt[0] + fv[2] * lt[2]) * side, fv[1]], vc = [cv[0] * hd[0] + cv[2] * hd[2], (cv[0] * lt[0] + cv[2] * lt[2]) * side];
  const win = r.recs.filter(q => q.t >= t0 - 0.02 && q.t <= t0 + W); let Jsw = [0, 0, 0], Jst = [0, 0, 0], Msw = 0, Mst = 0, pkV = 0, pkB = 0;
  for (const q of win) { const c = q.com; for (const s of [sw, st]) { const F = q.feet[s]; if (!F || !F.shear || !(F.load > 1)) continue; const Fv = [F.shear[0], F.load, F.shear[2]], p = F.centroid && F.centroid.every(Number.isFinite) ? F.centroid : q.states[fi[s]].pos, rr = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
      const My = rr[2] * Fv[0] - rr[0] * Fv[2], Jh = [Fv[0] * hd[0] + Fv[2] * hd[2], (Fv[0] * lt[0] + Fv[2] * lt[2]) * side, Fv[1]].map(x => x * dt);
      if (s === sw) { Jsw = Jsw.map((v, i) => v + Jh[i]); Msw += My * dt; pkV = Math.max(pkV, F.load); pkB = Math.min(pkB, Jh[0] / dt); } else { Jst = Jst.map((v, i) => v + Jh[i]); Mst += My * dt; } } }
  const a = win[0], b = win[win.length - 1], dL = G2.amBudget(spec, b.states).all - G2.amBudget(spec, a.states).all, dYaw = (yaw(b.states[0].rot) - yaw(a.states[0].rot)) * 57.3;
  const slip = Math.hypot(b.states[fi[sw]].pos[0] - q0.states[fi[sw]].pos[0], b.states[fi[sw]].pos[2] - q0.states[fi[sw]].pos[2]) * 100;
  const kn = win.map(q => G2.jointAngles(spec, q.states, ji("knee_" + sw)).a), part = q0.feet[sw].heel && q0.feet[sw].toe ? "flat" : q0.feet[sw].heel ? "heel" : q0.feet[sw].toe ? "toe" : "?";
  const latOff = ((q0.states[fi[sw]].pos[0] - q0.com[0]) * lt[0] + (q0.states[fi[sw]].pos[2] - q0.com[2]) * lt[2]) * side;
  const uT = (t0 - R.tSw0) / R.T; rows.push({ t0, sw, uT, vf: app[0], vv: app[2], pkV, pkB, dYaw, slip, Jb: Jsw[0], M: dL });
  if (!process.env.QUIET) console.log(`${sw} td ${t0.toFixed(3)} u ${uT.toFixed(2)} ${part.padEnd(4)} | foot v fwd ${app[0].toFixed(2)} lat ${app[1].toFixed(2)} vert ${app[2].toFixed(2)} | pitch ${pit(q0.states[fi[sw]].rot).toFixed(0)} roll ${rol(q0.states[fi[sw]].rot).toFixed(0)} | COM v ${vc.map(x => x.toFixed(2)).join(",")} | lat off ${(latOff * 100).toFixed(0)}cm | land J ${Jsw.map(x => x.toFixed(1)).join(",")} pkV ${pkV.toFixed(0)} pkBrake ${pkB.toFixed(0)} | trail J ${Jst.map(x => x.toFixed(1)).join(",")} | yaw imp land ${Msw.toFixed(2)} trail ${Mst.toFixed(2)} ΔL ${dL.toFixed(2)} free ${(dL - Msw - Mst).toFixed(2)} | Δyaw ${dYaw.toFixed(1)}° | slip ${slip.toFixed(1)}cm | knee ${kn[0].toFixed(0)}→max ${Math.max(...kn).toFixed(0)}`); }
const mean = (k, a) => a.length ? a.reduce((x, y) => x + y[k], 0) / a.length : NaN, mx = (k, a) => a.length ? Math.max(...a.map(y => Math.abs(y[k]))) : NaN, R2 = rows.slice(1);
console.log(`SUMMARY ${process.env.NAME || ""} touchdowns ${rows.length} (excl. 1st) | foot v fwd mean ${mean("vf", R2).toFixed(2)} max ${mx("vf", R2).toFixed(2)} | vert mean ${mean("vv", R2).toFixed(2)} max ${mx("vv", R2).toFixed(2)} | pkV mean ${mean("pkV", R2).toFixed(0)} | pkBrake mean ${mean("pkB", R2).toFixed(0)} | land fwd J ${mean("Jb", R2).toFixed(1)} | |Δyaw| mean ${(R2.reduce((x, y) => x + Math.abs(y.dYaw), 0) / Math.max(1, R2.length)).toFixed(1)}° | slip mean ${mean("slip", R2).toFixed(1)}cm | u_td mean ${mean("uT", R2).toFixed(2)}`);

import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1", ...(process.env.FOOTW ? { diagFootWidth: +process.env.FOOTW } : {}) }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// MATRIX: runs every config of a JSON list (file argv[3]) once, compact metrics per line: outcome, rhythmic steps landed, corrective steps,
// mean forward COM speed over the walk, pelvis yaw peak-to-peak, COM lateral velocity range, step width mean±sd, foothold error
const yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]) * 57.3; };
const CF = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
for (const c of CF) { const t0 = Date.now(); let r; try { r = G2.runG2a(J, spec, c.key || "G2b_walk08", { poses, keepStates: true, seconds: c.sec || 15, rhythmOver: c.r, humanOver: c.h }); } catch (e) { console.log(c.name, "ERR", e.message); continue; }
  const fR = r.recs.find(q => q.com[1] < 0.75), tF = fR ? fR.t : Infinity, rh = r.steps.filter(s => s.kind === "rhythmic" && s.status === "LANDED" && s.tdT != null && s.tdT < tF).length, co = r.steps.filter(s => s.kind !== "rhythmic").length, recs = r.recs.filter(q => q.rhythm && ["SS", "DS"].includes(q.rhythm.stage) && q.t > 1.5);
  const yw = recs.map(q => yaw(q.states[0].rot)), vx = recs.map(q => q.vcom[0]), d0 = recs[0], d1 = recs[recs.length - 1], spd = d0 && d1 && d1.t > d0.t ? (d1.com[2] - d0.com[2]) / (d1.t - d0.t) : 0;
  const errs = r.steps.filter(s => s.kind === "rhythmic" && s.footholdErrCm != null).map(s => +s.footholdErrCm);
  console.log(`${(c.name || "").padEnd(28)} ${r.outcome.padEnd(8)} rh ${String(rh).padStart(2)} co ${co} | v ${f(spd, 2)} | yaw p-t-p ${yw.length ? f(Math.max(...yw) - Math.min(...yw), 1) : "-"} | vx ${vx.length ? f(Math.min(...vx), 2) + ".." + f(Math.max(...vx), 2) : "-"} | err max ${errs.length ? f(Math.max(...errs), 1) : "-"} | ${r.hash} ${Date.now() - t0}ms`); }

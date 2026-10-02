import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// SWING APPROACH: target vs actual foot (pos, vel) over the last part of each swing, heading frame; the knee; contact flags
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {};
let LOCO = null; const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 3.4), onLoco: (l) => { LOCO = l; }, ...OV });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, ji = (n) => spec.joints.findIndex(j => j.name === n);
const h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], lt = [hd[2], 0, -hd[0]], pr = (v) => [v[0] * hd[0] + v[2] * hd[2], v[0] * lt[0] + v[2] * lt[2], v[1]];
console.log("standing knee R", G2.jointAngles(spec, r.recs[0].states, ji("knee_R")).a.toFixed(1), "hip R", JSON.stringify(G2.jointAngles(spec, r.recs[0].states, ji("hip_R"))));
const t0 = +(process.env.T0 || 1.75), t1 = +(process.env.T1 || 2.05), ev = +(process.env.EV || 3);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.exec, sw = e ? e.sw : null; if (!sw) { console.log(q.t.toFixed(3), "-"); continue; } const s = q.states[fi[sw]], tg = q.swingTgt;
  console.log(`${q.t.toFixed(3)} ${sw} u ${e.u != null ? e.u.toFixed(2) : "-"} | tgt ${tg ? pr(tg.pos).map(x => x.toFixed(3)).join(",") : "-"} v ${tg && tg.vel ? pr(tg.vel).map(x => x.toFixed(2)).join(",") : "-"} | foot ${pr(s.pos).map(x => x.toFixed(3)).join(",")} v ${pr(s.v).map(x => x.toFixed(2)).join(",")} | knee ${G2.jointAngles(spec, q.states, ji("knee_" + sw)).a.toFixed(0)} | ${q.feet[sw].state.slice(0, 5)} ${q.feet[sw].load.toFixed(0)} | pel y ${q.states[0].pos[1].toFixed(3)}`); }

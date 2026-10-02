import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// FORWARD STEP MAP — per rhythmic step k (the stance after touchdown of foot k): ξ along at touchdown relative to the landed foot's stance point,
// the measured double-support duration, the DS model's prediction of ξ at the next single-support start (CoP ramp trailing forefoot → leading
// heel over the MEASURED duration), the actual value, and the COM speed — isolates the double-support model error
const OV = process.env.OVER ? JSON.parse(process.env.OVER) : {}; let LOCO = null; const marks = [];
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 8), onLoco: (l) => { LOCO = l; const p = l.planner, f0 = p._walkPlan.bind(p); p._walkPlan = (o, step, xi0) => { const out = f0(o, step, xi0); marks.push({ t: o.t, sw: step.sw, xi0: xi0.slice(), pSt: out.pSt.slice(), cN: out.walkK.cNext.slice() }); return out; }; }, ...OV });
const K = LOCO.planner.rhythm.wk, h0 = K.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1], w = K.omega, r0 = K.r;
const D = LOCO.planner.exec.done.filter(R => R.td && R.kind === "rhythmic");
for (let k = 0; k < D.length; k++) { const R = D[k], m1 = marks.find(m => m.t > R.td.t - 1e-6); if (!m1) continue; const pL = m1.pSt, pT = R.pSt, eTd = fw(R.td.xi, pL), Tds = m1.t - R.td.t, E2 = Math.exp(w * Tds), kap = (E2 - 1) / (w * Tds);
  // DS model: CoP from the trailing forefoot (pT + r) to the leading heel (pL − r), linear over Tds; along, relative to pL
  const a0 = fw(pT, pL) + r0, a1 = -r0, pred = E2 * eTd - a0 * (E2 - 1) + (a1 - a0) * (1 - kap), act = fw(m1.xi0, pL), mk = marks[marks.indexOf(m1) - 1], planned = mk ? mk.cN[0] * hd[0] + mk.cN[1] * hd[1] : NaN;
  const q = r.recs.reduce((b, x) => Math.abs(x.t - R.td.t) < Math.abs(b.t - R.td.t) ? x : b, r.recs[0]), v = q.vcom[0] * hd[0] + q.vcom[2] * hd[1];
  console.log(`${R.sw} td ${R.td.t.toFixed(3)} | ξ_td − stance ${(eTd * 100).toFixed(1)} cm | DS ${Tds.toFixed(3)} s | next start: planned ${(planned * 100).toFixed(1)} model(meas. DS) ${(pred * 100).toFixed(1)} actual ${(act * 100).toFixed(1)} cm | v_td ${v.toFixed(2)} m/s | step ${(fw(pL, pT) * 100).toFixed(1)} cm`); }

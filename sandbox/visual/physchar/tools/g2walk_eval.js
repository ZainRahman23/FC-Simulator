// ═══ physchar/tools/g2walk_eval.js — G2b WALKER evaluation (measurement only) ════════════════════════════════════════════════════════════
// Runs a walker configuration (pc_gateg2 TESTS_G2W key, or the old G2b planner) from SIX deterministic starts (first foot R / L × rhythm start
// 0.50 / 0.55 / 0.60 s) and records, FALL-AWARE (nothing after the COM drops below 0.75 m counts):
//   steps landed upright, distance, mean speed; per step: the state at the decision instant (sensor capture point relative to the stance
//   foot, forward / inward), the commanded and the achieved foothold, the single-support duration, the double support;
//   yaw: pelvis yaw range per step, the whole-body vertical angular momentum about the COM (range per stride, normalised by body mass ×
//   stature — Silverman et al. human level walking 0.014 ± 0.003 m/s); actuator saturation per step; the external-impulse ledger (residual)
//   and the propulsion audit (horizontal turf impulse vs the change of linear momentum).
// usage: node tools/g2walk_eval.js --test G2W_A [--n 30] [--diagFoot '{...}'] [--out file.json] [--starts 6]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runG2a, TESTS_G2 } from "../pc_gateg2.js";
import { bodyState } from "../pc_g2char.js";
import { V, Q } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const diagFoot = arg("--diagFoot", null) ? JSON.parse(arg("--diagFoot")) : null;
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(diagFoot || {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const key = arg("--test", "G2W_A"), n = +arg("--n", 30), outP = arg("--out", null), nStarts = +arg("--starts", 6), MH = spec.totalMass * 1.9;
const bi = (nm) => spec.bodies.findIndex(b => b.name === nm), yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
const STARTS = [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]].slice(0, nStarts);
function evalStart(first, at) {
  const base = TESTS_G2[key], rh = base.loco.rhythm, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const t0 = Date.now();
  const r = runG2a(J, spec, key, { poses, keepStates: true, seconds: 1.6 + n * 0.58, rhythmOver: { steps, at }, onLoco: (l) => { LOCO = l; } });
  const cpu = (Date.now() - t0) / 1000, R_ = r.recs, fallRec = R_.find(q => q.com[1] < 0.75), tF = fallRec ? fallRec.t : Infinity, P = LOCO.planner, h0 = P.rhythm.wk ? P.rhythm.wk.h0 : 0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]];
  const at_ = (t) => { let lo = 0, hi = R_.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R_[m].t < t) lo = m; else hi = m; } return R_[hi]; };
  const done = P.exec.done.filter(d => d.kind === "rhythmic"), up = done.filter(d => d.td && d.td.t < tF), wl = P.rhythm.walkerLog || [];
  const steps2 = done.filter(d => d.tSw0 < tF).map(d => { const q = at_(d.tSw0), sd = d.sw === "R" ? 1 : -1, ps = d.pSt, e = [q.xi[0] - ps[0], q.xi[1] - ps[1]], lg = wl.find(w => w.i === d.stepIndex);
    const ach = d.td && d.td.t < tF ? [(d.td.center[0] - ps[0]) * hd[0] + (d.td.center[1] - ps[1]) * hd[1], ((d.td.center[0] - ps[0]) * rt[0] + (d.td.center[1] - ps[1]) * rt[1]) * sd] : null;
    const tgt = d.proj && d.proj.target ? [(d.proj.target[0] - ps[0]) * hd[0] + (d.proj.target[1] - ps[1]) * hd[1], ((d.proj.target[0] - ps[0]) * rt[0] + (d.proj.target[1] - ps[1]) * rt[1]) * sd] : null;
    const W = d.liftoff && d.td ? R_.filter(q2 => q2.t >= d.liftoff.t && q2.t <= Math.min(d.td.t, tF)) : [];
    const py = W.map(q2 => { const y = yawOf(q2.states[0].rot) - h0; return Math.atan2(Math.sin(y), Math.cos(y)) * 57.2958; });
    return { k: d.stepIndex, sw: d.sw, t0: d.tSw0, x: [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * sd], u: lg ? lg.u : null, target: tgt, achieved: ach, swing: d.liftoff && d.td ? d.td.t - d.liftoff.t : null, T: d.walkK ? d.walkK.Tss : null,
      upright: !!(d.td && d.td.t < tF), pelvisYawRange: py.length ? Math.max(...py) - Math.min(...py) : null, sat: W.reduce((a, q2) => a + (q2.satN || 0), 0) / Math.max(1, W.length), adapt: lg && lg.info ? lg.info.b : null }; });
  // whole-body vertical angular momentum over the upright walking (every 4th record), its range per stride (two steps)
  const tA = up.length ? up[0].td.t : null, tB = up.length ? up[up.length - 1].td.t : null, Ly = [];
  if (tA != null) for (const q of R_) { if (q.t < tA || q.t > tB || q.n % 4) continue; Ly.push([q.t, bodyState(spec, q.states, "R").L[1]]); }
  const strides = []; for (let i = 0; i + 2 < up.length; i += 2) { const a = up[i].td.t, b = up[i + 2].td.t, seg = Ly.filter(p => p[0] >= a && p[0] <= b).map(p => p[1]); if (seg.length > 4) strides.push((Math.max(...seg) - Math.min(...seg)) / MH); }
  // ledger and propulsion over the upright walking
  const Rw = tA != null ? R_.filter(q => q.t >= tA && q.t <= tB) : [], turf = Rw.reduce((a, q) => V.add(a, q.ledger.turf), [0, 0, 0]), resMax = Rw.reduce((a, q) => Math.max(a, q.ledger.res), 0);
  const dP = Rw.length ? V.sub(Rw[Rw.length - 1].P, Rw[0].P) : [0, 0, 0];
  const dist = up.length > 1 ? Math.hypot(up[up.length - 1].td.center[0] - up[0].td.center[0], up[up.length - 1].td.center[1] - up[0].td.center[1]) : 0;
  return { first, at, hash: r.hash, outcome: r.outcome, tFall: Number.isFinite(tF) ? tF : null, upright: up.length, distance: dist, speed: up.length > 2 ? dist / (up[up.length - 1].td.t - up[0].td.t) : null, cpu,
    steps: steps2, wbamRange: strides, ledger: { resMax, turfH: [turf[0], turf[2]], dPH: [dP[0], dP[2]] }, push: r.push || null };
}
const out = { generated: "tools/g2walk_eval.js", test: key, title: TESTS_G2[key].title, n, diagFoot, starts: [] };
for (const [first, at] of STARTS) { const e = evalStart(first, at); out.starts.push(e); console.log(`${key} start ${first}@${at}: upright ${e.upright}/${n} · ${e.distance.toFixed(2)} m · ${e.speed ? e.speed.toFixed(2) : "-"} m/s · WBAM range ${e.wbamRange.length ? (e.wbamRange.reduce((a, b) => a + b, 0) / e.wbamRange.length).toFixed(4) : "-"} m/s · ledger res ${e.ledger.resMax.toExponential(1)} · cpu ${e.cpu.toFixed(1)} s`); }
const ups = out.starts.map(s => s.upright); console.log(`${key}: upright steps mean ${(ups.reduce((a, b) => a + b, 0) / ups.length).toFixed(1)} min ${Math.min(...ups)} max ${Math.max(...ups)}`);
if (outP) { fs.mkdirSync(path.dirname(outP), { recursive: true }); fs.writeFileSync(outP, JSON.stringify(out)); console.log("wrote", outP); }

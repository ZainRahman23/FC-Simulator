// one swing's profile (open loop): real-time aligned command vs actual foot, height, toe touching, the swing leg's joint saturation and torques
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const VAR = JSON.parse(process.argv[2] || "{}"), K = +(process.argv[3] || 2), first = process.argv[4] || "R", at = +(process.argv[5] || 0.5), { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n);
const n = 12, [df, dl, T] = VAR.open || [0.28, 0.26, 0.42];
const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk.char, ch = { 0: base[0] }; for (let i = 1; i < n; i++) ch[i] = { df, dl, T };
let LOCO = null; const CMD = [];
const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.58, rhythmOver: { steps, at, walk: { char: ch, ...(VAR.walk || {}) } }, ...(VAR.human ? { humanOver: VAR.human } : {}), ...(VAR.loco ? { locoOver: VAR.loco } : {}),
  onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv) CMD.push({ n: l.nStep, t, k: R.stepIndex, pos: out.pos, vel: out.vel, reach: out.reach, u: out.u, rho: out.rho }); return out; }; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], d = P.exec.done.find(d => d.stepIndex === K), fb = bi("foot_" + d.sw), sw = d.sw;
const cm = new Map(); for (const c of CMD) if (c.k === K) cm.set(c.n, c); const land = [...cm.values()].pop().reach, fw = (p) => (p[0] - land[0]) * hd[0] + (p[2] - land[2]) * hd[2];
const tb = bi("thigh_" + sw), hipJ = "hip_" + sw, kneeJ = "knee_" + sw, ankJ = "ankle_" + sw, Lg = 0.9243;
console.log(`step ${K} ${sw} tSw0 ${d.tSw0.toFixed(3)} (cmd starts real ${(d.tSw0 + LOCO.dFb).toFixed(3)}) | view liftoff ${(d.liftoff.t - d.tSw0).toFixed(3)} | td view ${(d.td.t - d.tSw0).toFixed(3)} uAt ${d.td.uAt.toFixed(2)}`);
console.log(" tReal   u   | fwd cmd  act   lag | y cmd  act | v cmd  act | toe load(N) | ext | hip sat/τ  knee sat/τ  ank sat");
for (const q of r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t + 0.06 && q.n % 4 === 0)) { const c = cm.get(q.n); if (!c) continue; const S = q.states[fb], hip = q.states[tb].pos, ext = Math.hypot(hip[0] - S.pos[0], hip[1] - S.pos[1], hip[2] - S.pos[2]) / Lg;
  const ar = (j) => { const e = q.arb && q.arb.find(x => x.joint === j); if (!e) return "  -  "; const s = Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat, rv = Array.isArray(e.real) ? e.real[1] ?? e.real[0] : e.real; return `${s ? "S" : "."}${(Array.isArray(e.real) ? Math.hypot(...e.real) : Math.abs(e.real)).toFixed(0).padStart(4)}`; };
  console.log(`${(q.t - d.tSw0 - LOCO.dFb).toFixed(3)} ${c.u.toFixed(2)} | ${(fw(c.pos) * 100).toFixed(1).padStart(6)} ${(fw(S.pos) * 100).toFixed(1).padStart(6)} ${((fw(c.pos) - fw(S.pos)) * 100).toFixed(1).padStart(5)} | ${(c.pos[1] * 100).toFixed(1).padStart(4)} ${(S.pos[1] * 100).toFixed(1).padStart(4)} | ${c.vel ? V.dot(c.vel, hd).toFixed(2).padStart(5) : "  -  "} ${V.dot(S.v, hd).toFixed(2).padStart(5)} | ${q.feet[sw].touching ? "T" : "."} ${q.feet[sw].load.toFixed(0).padStart(4)} | ${ext.toFixed(3)} | ${ar(hipJ)} ${ar(kneeJ)} ${ar(ankJ)}`); }

// one swing, tick by tick: commanded vs actual foot origin height and pitch, planned vs actual lowest point (tip), ankle/knee torque & saturation
import { J, body, G2, M, f3 } from "./lib.mjs";
const { Q, V } = M; const fm = process.argv[2] || "F2", step = +(process.argv[3] || 4), test = process.argv[4] || "G2W_A8", { spec, poses } = body(fm), bi = (n) => spec.bodies.findIndex(b => b.name === n);
const T = []; let LOCO = null;
const r = G2.runG2a(J, spec, test, { poses, keepStates: true, seconds: 9, onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv) T.push({ t, k: R.stepIndex, sw: R.sw, pos: out.pos, rho: out.rho, rot: out.rot, u: out.u }); return out; }; } });
const d = LOCO.planner.exec.done.find(d => d.kind === "rhythmic" && d.stepIndex === step); const s = d.sw, fb = bi("foot_" + s), box = spec.bodies[fb].planBox || spec.bodies[fb].shapes[0];
const jn = (n) => spec.joints.findIndex(j => j.name === n), ka = jn("ankle_" + s), kk = jn("knee_" + s), kh = jn("hip_" + s);
const low = (p, rot) => { let m = 9, who = ""; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const y = p[1] + Q.rot(rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])[1]; if (y < m) { m = y; who = sz > 0 ? "toe" : "heel"; } } return [m, who]; };
const pit = (rot) => { const fz = Q.rot(rot, [0, 0, 1]); return Math.atan2(fz[1], Math.hypot(fz[0], fz[2])) * 57.3; };
console.log(fm, "step", step, s, d.status, "lift", f3(d.liftoff?.t), "td", f3(d.td?.t), "uAt", f3(d.td?.uAt, 2));
const tEnd = d.td ? d.td.t + 0.02 : d.liftoff.t + 0.4;
for (const q of r.recs.filter(q => q.t >= d.liftoff.t - 0.03 && q.t <= tEnd && q.n % 2 === 0)) { const S = q.states, c = T.filter(e => e.k === step && e.t <= q.t + 1e-9).pop(); if (!c) continue;
  const [lc] = low(c.pos, c.rot), [la, wa] = low(S[fb].pos, S[fb].rot), led = (k) => q.arb[k], A = led(ka), K = led(kk);
  const aT = A ? (Array.isArray(A.real) ? A.real.map(v => f3(v, 0)).join("/") : f3(A.real, 0)) : "-", sat = A && A.sat ? (Array.isArray(A.sat) ? A.sat.some(Boolean) : A.sat) : false;
  console.log(`t ${f3(q.t)} u ${f3(c.u, 2)} | origin y cmd ${f3(c.pos[1] * 100, 1)} act ${f3(S[fb].pos[1] * 100, 1)} | pitch cmd ${f3(c.rho * 57.3, 1)} act ${f3(pit(S[fb].rot), 1)} | low cmd ${f3(lc * 100, 1)} act ${f3(la * 100, 1)} (${wa}) | ankle τ ${aT}${sat ? " SAT" : ""} knee ${K ? f3(K.real, 0) : "-"}${K && K.sat ? " SAT" : ""} | load ${f3(q.feet[s].load / 765, 2)}`); }

// trace the first failing swing of Controller A (F0 maps) on a foot model: toe tip / heel / MTP / contacting bodies through the swing
import { J, body, G2, M, f3 } from "./lib.mjs";
const { Q, V } = M; const fm = process.argv[2] || "F2", { spec, poses } = body(fm), bi = (n) => spec.bodies.findIndex(b => b.name === n), W = spec.totalMass * 9.81;
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 8, onLoco: (l) => { LOCO = l; } });
const D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic"); const bad = D.find(d => d.stepIndex >= 1 && (!d.liftoff || !d.td || d.td.t - d.liftoff.t < 0.2)) || D[D.length - 1];
const s = bad.sw, fb = bi("foot_" + s), tb = bi("toe_" + s), hb = spec.bodies[fb].shapes[0], tbx = tb >= 0 ? spec.bodies[tb].shapes[0] : null;
console.log(fm, "failing step", bad.stepIndex, s, "status", bad.status, "tSw0", f3(bad.tSw0), "lift", bad.liftoff && f3(bad.liftoff.t), "td", bad.td && f3(bad.td.t), "uAt", bad.td && f3(bad.td.uAt, 2));
const low = (S, b, sh, sx, sz) => V.add(S[b].pos, Q.rot(S[b].rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] + sz * sh.he[2]]))[1];
for (const q of r.recs.filter(q => q.t >= bad.tSw0 - 0.08 && q.t <= (bad.td ? bad.td.t : bad.tSw0 + 0.4) + 0.03 && q.n % 3 === 0)) { const S = q.states;
  const heel = Math.min(low(S, fb, hb, -1, -1), low(S, fb, hb, 1, -1)), ball = Math.min(low(S, fb, hb, -1, 1), low(S, fb, hb, 1, 1)), tip = tbx ? Math.min(low(S, tb, tbx, -1, 1), low(S, tb, tbx, 1, 1)) : null;
  const touching = (q.cts || []).filter(c => (c.a === -1 || c.b === -1) && c.depth > 0.0005).map(c => c.a === -1 ? c.b : c.a).filter(i => i === fb || i === tb).map(i => i === fb ? "foot" : "toe");
  console.log(`t ${f3(q.t, 3)} ${q.rhythm.stage}/${q.exec ? q.exec.stage + " u" + f3(q.exec.u, 2) : "-"} heel ${f3(heel * 100, 1)} ball ${f3(ball * 100, 1)} toeTip ${tip != null ? f3(tip * 100, 1) : "-"} cm | MTP ${q.mtp ? f3(q.mtp[s].a * 57.3, 1) + "° " + f3(q.mtp[s].tau, 1) + "N·m" : "-"} | load ${f3(q.feet[s].load / W, 2)} contacts [${[...new Set(touching)].join(",")}]`); }

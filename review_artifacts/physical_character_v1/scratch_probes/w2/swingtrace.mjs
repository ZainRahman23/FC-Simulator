// a failing swing at speed: the swing foot's lowest sole point and toe, its target, the knee and hip flexion, the stance-leg extension
import { walk, f3, W, spec, M, bi } from "./lib.mjs"; import { runB } from "./clB.mjs";
const { Q, V } = M; const box = spec.bodies[bi("foot_R")].shapes[0];
const r = runB({ gains: { f0: [0.1, 0.16], cd: [0, 0.5], cv: [0.15, 0.45] }, n: 14, keep: true });
const d = r.LOCO.planner.exec.done.find(x => x.kind === "rhythmic" && x.stepIndex === +(process.argv[2] || 3)), s = d.sw, fb = bi("foot_" + s), tb = bi("thigh_" + s), sb = bi("shin_" + s);
console.log("step", d.stepIndex, s, "tSw0", f3(d.tSw0), "lift", d.liftoff && f3(d.liftoff.t), "td", d.td && f3(d.td.t), "T", f3(d.T), "u at td", d.td && f3(d.td.uAt, 2));
const ang = (S, a, b) => { const x = Q.rot(S[a].rot, [0, -1, 0]), y = Q.rot(S[b].rot, [0, -1, 0]); return Math.acos(Math.max(-1, Math.min(1, V.dot(x, y)))) * 57.3; };
for (const q of r.recs.filter(q => q.t >= d.tSw0 - 0.02 && q.t <= (d.td ? d.td.t : d.tSw0 + 0.5) + 0.05 && Math.round(q.t * 240) % 3 === 0)) { const S = q.states, F = q.feet[s];
  const pts = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(V.add(S[fb].pos, Q.rot(S[fb].rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])));
  const low = Math.min(...pts.map(p => p[1])), toe = Math.min(pts[1][1], pts[3][1]), heel = Math.min(pts[0][1], pts[2][1]), tg = q.swingTgt;
  const hipFl = (() => { const th = Q.rot(S[tb].rot, [0, -1, 0]), fw = Q.rot(S[0].rot, [0, 0, 1]); return Math.asin(Math.max(-1, Math.min(1, V.dot(th, fw)))) * 57.3; })();
  console.log(`t ${f3(q.t, 3)} ${q.exec ? q.exec.stage : "-"} u ${q.exec && q.exec.u != null ? f3(q.exec.u, 2) : "-"} load ${f3(F.load / W, 2)} | heel ${f3(heel * 100, 1)} toe ${f3(toe * 100, 1)} cm | tgtY ${tg && tg.pos ? f3(tg.pos[1] * 100, 1) : "-"} | knee ${f3(ang(S, tb, sb), 0)}° hip fwd ${f3(hipFl, 0)}° | foot vFwd ${f3(S[fb].v[2], 2)}`); }

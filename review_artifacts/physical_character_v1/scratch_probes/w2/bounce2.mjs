import { walk, f3, W, spec, M, bi } from "./lib.mjs";
import { tdStats } from "./tdstat.mjs";
const { Q, V } = M; const COND = { df: 0.237, dl: 0.368, T: 0.45 };
const jAng = (await import(process.env.PC_G2 || "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_gateg2.js"));
const r = walk({ n: 4, seconds: 3.4, keep: true, walk: { char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45 } } }, human: { landToeH: 0.0 } });
const ts = tdStats(r); console.log(ts.map(e => `k${e.k}${e.s} bounce ${e.bounce} flat ${f3(e.flat)}`).join(" | "));
const d = r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic"), k = d.findIndex((x, i) => ts[i] && ts[i].bounce); const x = d[k >= 0 ? k : 1], s = x.sw, td = x.td.t;
const fb = bi("foot_" + s), sb = bi("shin_" + s), tb = bi("thigh_" + s);
const kneeAng = (S) => { const a = Q.rot(S[tb].rot, [0, -1, 0]), b = Q.rot(S[sb].rot, [0, -1, 0]); return Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))) * 57.3; };
console.log("step", x.stepIndex, s, "td", f3(td));
for (const q of r.recs.filter(q => q.t >= td - 0.03 && q.t < td + 0.16 && Math.round(q.t * 240) % 2 === 0)) { const F = q.feet[s], S = q.states, ank = S[fb].pos, tg = q.swingTgt;
  const ak = q.arb.find(e => e.joint === "knee_" + s);
  console.log(`t+${f3(q.t - td)} ${q.rhythm.stage}/${q.exec ? q.exec.stage : "-"} load ${f3(F.load / W, 2)} ankY ${f3(ank[1], 3)} footVy ${f3(S[fb].v[1], 2)} shinVy ${f3(S[sb].v[1], 2)} knee ${f3(kneeAng(S), 1)} kneeTq ${ak ? f3(ak.real, 0) : "-"} [${ak ? ak.terms.map(t => t.m.slice(0, 5) + ":" + (+(t.alw ?? t.req)).toFixed(0)).join(" ") : ""}] kp ${ak ? f3(ak.kp, 0) : "-"} kd ${ak ? f3(ak.kd, 0) : "-"} tgtY ${tg && tg.pos ? f3(tg.pos[1], 3) : "-"} hipY ${f3(S[tb].pos[1], 3)}`); }

// commanded vs actual swing (foot origin height, pitch, lowest front point) for selected steps of the same-maps walk R@0.5 → JSON
import fs from "fs"; import { J, body, G2, M } from "./lib.mjs";
const { Q, V } = M, out = {};
for (const [fm, step] of [["F0", 4], ["F0", 8], ["F2", 4], ["F2h", 4], ["F1", 3]]) { const { spec, poses } = body(fm), bi = (n) => spec.bodies.findIndex(b => b.name === n), T = []; let LOCO = null;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 9, onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const o2 = f(R, t, o, nv); if (!nv) T.push({ t, k: R.stepIndex, pos: o2.pos, rho: o2.rho, rot: o2.rot, u: o2.u }); return o2; }; } });
  const d = LOCO.planner.exec.done.find(d => d.kind === "rhythmic" && d.stepIndex === step), s = d.sw, fb = bi("foot_" + s), tb = bi("toe_" + s), box = spec.bodies[fb].planBox || spec.bodies[fb].shapes[0], tsh = tb >= 0 ? spec.bodies[tb].shapes[0] : null;
  const front = (p, rot, sh) => Math.min(...[-1, 1].map(sx => p[1] + Q.rot(rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] + sh.he[2]])[1]));
  const pit = (rot) => { const fz = Q.rot(rot, [0, 0, 1]); return Math.atan2(fz[1], Math.hypot(fz[0], fz[2])) * 57.2958; };
  const rows = []; for (const q of r.recs) { if (q.t < d.tSw0 - 0.05 || q.t > (d.td ? d.td.t : d.tSw0 + 0.5) + 0.02) continue; const c = T.filter(e => e.k === step && e.t <= q.t + 1e-9).pop(); if (!c) continue; const S = q.states;
    rows.push({ t: q.t - d.tSw0, u: c.u, yCmd: c.pos[1], yAct: S[fb].pos[1], pCmd: c.rho * 57.2958, pAct: pit(S[fb].rot), lowCmd: front(c.pos, c.rot, box), lowAct: tsh ? front(S[tb].pos, S[tb].rot, tsh) : front(S[fb].pos, S[fb].rot, box) }); }
  out[`${fm}_k${step}`] = { foot: fm, step, sw: s, status: d.status, lift: d.liftoff ? d.liftoff.t - d.tSw0 : null, td: d.td ? d.td.t - d.tSw0 : null, uAt: d.td ? d.td.uAt : null, rows }; console.log(fm, step, rows.length, d.td && d.td.uAt); }
fs.writeFileSync(process.argv[2], JSON.stringify(out));

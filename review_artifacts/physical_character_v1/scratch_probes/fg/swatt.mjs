// per-swing foot attitude for Controller A (F0 maps) on a foot model: liftoff pitch, min tip clearance, heel peak, ankle torque, scuff
import { J, body, G2, M, f3 } from "./lib.mjs";
const { Q, V } = M; const fm = process.argv[2] || "F2", test = process.argv[3] || "G2W_A8", { spec, poses } = body(fm), bi = (n) => spec.bodies.findIndex(b => b.name === n);
let LOCO = null; const r = G2.runG2a(J, spec, test, { poses, keepStates: true, seconds: 9, onLoco: (l) => { LOCO = l; } });
const D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic");
const pt = (S, b, sh, sx, sy, sz) => V.add(S[b].pos, Q.rot(S[b].rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] + sy * sh.he[1], sh.pos[2] + sz * sh.he[2]]));
for (const d of D) { if (!d.liftoff) { console.log("step", d.stepIndex, d.sw, "no liftoff", d.status); continue; }
  const s = d.sw, fb = bi("foot_" + s), tb = bi("toe_" + s), hb = spec.bodies[fb].shapes[0], pb = spec.bodies[fb].planBox || hb, tbx = tb >= 0 ? spec.bodies[tb].shapes[0] : null;
  const tEnd = d.td ? d.td.t : d.liftoff.t + 0.4; let minTip = 9, uMin = 0, heelMax = -9, pitchLo = null, pitchMax = -99;
  const pitch = (S) => { const a = pt(S, fb, hb, 0, -1, -1), b = pt(S, fb, hb, 0, -1, 1); return Math.atan2(a[1] - b[1], Math.hypot(b[0] - a[0], b[2] - a[2])) * 57.3; };
  for (const q of r.recs.filter(q => q.t >= d.liftoff.t - 0.001 && q.t <= tEnd)) { const S = q.states; if (!S) continue;
    const tipY = tbx ? Math.min(pt(S, tb, tbx, -1, -1, 1)[1], pt(S, tb, tbx, 1, -1, 1)[1]) : Math.min(pt(S, fb, pb, -1, -1, 1)[1], pt(S, fb, pb, 1, -1, 1)[1]);
    const heel = Math.min(pt(S, fb, hb, -1, -1, -1)[1], pt(S, fb, hb, 1, -1, -1)[1]); const pp = pitch(S); if (pitchLo == null) pitchLo = pp; pitchMax = Math.max(pitchMax, pp);
    const u = q.exec ? q.exec.u : 0; if (u > 0.08 && u < 0.85 && tipY < minTip) { minTip = tipY; uMin = u; } heelMax = Math.max(heelMax, heel); }
  console.log(`step ${d.stepIndex} ${s} ${d.status} sw ${f3(tEnd - d.liftoff.t, 3)}s | pitch@lift ${f3(pitchLo, 1)}° max ${f3(pitchMax, 1)}° | heelMax ${f3(heelMax * 100, 1)} | minTip ${f3(minTip * 100, 1)}cm @u${f3(uMin, 2)} | uAt ${d.td ? f3(d.td.uAt, 2) : "-"}`); }

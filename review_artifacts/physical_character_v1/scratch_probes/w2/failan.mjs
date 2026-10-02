// per step: swing duration, forward speed at step start, ξ at start (sensor, stance-relative), achieved foothold, trailing-leg extension at
// step start; the fall: COM direction relative to heading, trunk pitch
import { f3, fallT, spec, M, bi } from "./lib.mjs";
const { Q, V } = M;
export function failReport(r) { const P = r.LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], tF = fallT(r), done = P.exec.done.filter(d => d.kind === "rhythmic"), out = [];
  const at = (t) => r.recs.reduce((b, q) => Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b, r.recs[0]);
  for (const d of done) { const q = at(d.tSw0), sd = d.sw === "R" ? 1 : -1, st = d.sw === "R" ? "L" : "R", ps = d.pSt, e = [q.xi[0] - ps[0], q.xi[1] - ps[1]], v = [q.vcom[0], q.vcom[2]];
    const leg = (s) => { const th = q.states[bi("thigh_" + s)].pos, an = q.states[bi("foot_" + s)].pos; return Math.hypot(th[0] - an[0], th[1] - an[1], th[2] - an[2]); };
    const ach = d.td ? [ (d.td.center[0] - ps[0]) * hd[0] + (d.td.center[1] - ps[1]) * hd[1], ((d.td.center[0] - ps[0]) * rt[0] + (d.td.center[1] - ps[1]) * rt[1]) * sd] : null;
    out.push({ k: d.stepIndex, sw: d.sw, t0: d.tSw0, swing: d.td && d.liftoff ? d.td.t - d.liftoff.t : null, liftDelay: d.liftoff ? d.liftoff.t - d.tSw0 : null, vF: v[0] * hd[0] + v[1] * hd[1], vL: (v[0] * rt[0] + v[1] * rt[1]) * sd,
      xi: [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * sd], ach, trailExt: leg(d.sw) / 0.927, status: d.status, afterFall: d.td ? d.td.t > tF : null }); }
  let fall = null; if (Number.isFinite(tF)) { const q = at(tF - 0.3), q2 = at(tF), dc = [q2.com[0] - q.com[0], q2.com[2] - q.com[2]]; fall = { t: tF, dirF: dc[0] * hd[0] + dc[1] * hd[1], dirR: dc[0] * rt[0] + dc[1] * rt[1] }; }
  return { steps: out, fall }; }
export function printFail(r) { const R = failReport(r); for (const s of R.steps) console.log(`k${s.k}${s.sw} t0 ${f3(s.t0, 2)} lift +${f3(s.liftDelay, 2)} swing ${f3(s.swing, 2)} | vF ${f3(s.vF, 2)} vL(in) ${f3(s.vL, 2)} ξ ${s.xi.map(x => f3(x)).join(",")} | achieved ${s.ach ? s.ach.map(x => f3(x)).join(",") : "-"} | trailing leg ext ${f3(s.trailExt, 2)} ${s.status}${s.afterFall ? " AFTER-FALL" : ""}`);
  if (R.fall) console.log(`fall at ${f3(R.fall.t, 2)}: COM moved fwd ${f3(R.fall.dirF, 2)} right ${f3(R.fall.dirR, 2)} m in the last 0.3 s`); }

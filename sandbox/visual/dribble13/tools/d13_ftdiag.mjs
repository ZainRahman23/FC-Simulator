// dribble13/tools/d13_ftdiag.mjs — FOLLOW-THROUGH DIAGNOSIS: for every contact candidate the planner evaluates during a held cut (the cut version of
// the candidate), the slowest launch the DRIBBLE-1 follow-through can clear, and — at a soft probe launch — where and when the touching boot would
// meet the ball again: ticks after the contact, which hull, the boot relative to the ball (along the launch, lateral, vertical), the boot's and the
// ball's speed along the launch, and the swing fraction / path fraction (warp catch-up) at that moment.
// usage: node d13_ftdiag.mjs SCENARIO seeds [softSpeedFactor 1.0] → summary to stdout (+ JSON with --out=file)
import fs from "fs"; import { makeSim, DT } from "./d13_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { DribbleSim, warpAt } from "../d13_core.js";
const [id = "CUT60_RUN", seedsArg = "4", softK = "1.0"] = process.argv.slice(2), outArg = process.argv.find((a) => a.startsWith("--out="));
const P = DribbleSim.prototype, fms = P.followMinSpeed, rows = [];
P.followMinSpeed = function (c, s) {
  const r = fms.call(this, c, s);
  if (this.held && !this.held.released && c.release) {
    // probe: a soft launch along the candidate's provisional direction (the player's speed × softK along n), its follow-through traced tick by tick
    const sp = Math.max(1.5, s * +softK), L = { n: c.n, speed: sp }, prof = this.followTrace(c.pred, c.j, c.F, c, L, [c.ballK.p[0], c.ballK.p[1], -c.ballK.p[2]], c.warp, c.gs);
    rows.push({ k: this.k, kc: c.smp.k, F: c.F, reg: c.reg, hull: c.hull, wc: +c.smp.legs[c.F].w.toFixed(3), wp: +c.wp.toFixed(3), rho: +c.rho.toFixed(2), nDeg: +(Math.atan2(-c.n[2], c.n[0]) * 180 / Math.PI).toFixed(0), sMin: r == null ? null : +r.toFixed(2), probe: sp, hit: prof });
  }
  return r;
};
// the follow-through of followClear, traced: first tick (after the contact tick + 1) where a hull comes within followGap of the ball
P.followTrace = function (pred, j, F, g, L, ball, wk, gs) {
  const D1 = this.constructor.D1 || null; const fc = this.followClear(pred, j, F, g, L, ball, wk, gs); if (fc) return null;
  // re-run followClear's loop with recording (same maths)
  const self = this, wc = pred.at(j).legs[F].w, swing = pred.at(j).legs[F].swing, vL = this.launchVec(L, g), tr = this.simLaunch(ball, vL, 41);
  for (let i = j + 1; i <= Math.min(pred.length - 1, j + 40); i++) {
    const smp = pred.at(i); if (smp.legs[F].stance) break; const w = smp.legs[F].w, wq = wk ? warpAt(wk, w) : w, bones = wk ? this.pathFrames(pred, F, swing, wq, j) : smp.bones; if (!bones) continue;
    const foot = bones["foot_" + F], bp = tr[Math.min(tr.length - 1, i - j - 1)].p, n = [vL[0], 0, vL[2]], nl = Math.hypot(n[0], n[2]), nh = [n[0] / nl, 0, n[2] / nl], lat = [-nh[2], 0, nh[0]];
    const d = [foot.p[0] - bp[0], foot.p[1] - bp[1], foot.p[2] - bp[2]];
    const prev = i > j + 1 ? (wk ? this.pathFrames(pred, F, swing, warpAt(wk, pred.at(i - 1).legs[F].w), j) : pred.at(i - 1).bones) : null, fv = prev ? [(foot.p[0] - prev["foot_" + F].p[0]) / DT, 0, (foot.p[2] - prev["foot_" + F].p[2]) / DT] : null;
    const bv = tr[Math.min(tr.length - 1, i - j - 1)].v;
    if (!this.followClear(pred, j, F, g, L, ball, wk, gs, i)) return { dt: i - j, w: +w.toFixed(3), wq: +wq.toFixed(3), along: +(d[0] * nh[0] + d[2] * nh[2]).toFixed(3), lat: +(d[0] * lat[0] + d[2] * lat[2]).toFixed(3), up: +d[1].toFixed(3), footAlong: fv ? +(fv[0] * nh[0] + fv[2] * nh[2]).toFixed(2) : null, ballAlong: +(bv[0] * nh[0] + bv[2] * nh[2]).toFixed(2) };
  }
  return { dt: null };
};
for (let seed = 1; seed <= +seedsArg; seed++) { const S = makeSim(get(id), { seed, opts: { record: false } }); S.run(); }
const byReg = {}; for (const r of rows) { const b = (byReg[r.F + ":" + r.reg] = byReg[r.F + ":" + r.reg] || { n: 0, cleared: 0, sMin: [], dt: [], along: [], lat: [], fA: [], bA: [] }); b.n++; if (!r.hit) b.cleared++; else if (r.hit.dt) { b.dt.push(r.hit.dt); b.along.push(r.hit.along); b.lat.push(r.hit.lat); b.fA.push(r.hit.footAlong); b.bA.push(r.hit.ballAlong); } if (r.sMin != null) b.sMin.push(r.sMin); }
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
console.log(`${id}: ${rows.length} cut candidates (held cut, release at contact) over ${seedsArg} seeds; probe launch = max(1.5, ${softK} × player speed) along the provisional direction`);
for (const [k, b] of Object.entries(byReg)) console.log(`  ${k.padEnd(10)} n ${String(b.n).padStart(4)} · soft probe clears ${b.cleared} · min clearing launch median ${med(b.sMin)} m/s · re-contact after ${med(b.dt)} ticks · boot vs ball along ${med(b.along)} m, lateral ${med(b.lat)} m · speed along: boot ${med(b.fA)} vs ball ${med(b.bA)} m/s`);
if (outArg) fs.writeFileSync(outArg.slice(6), JSON.stringify(rows, null, 1));

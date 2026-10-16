// dribble1/tools/d1_matrix.mjs — the owner's per-scenario metrics over seeds: touches per second, separation (COM → ball centre) mean / max, the time
// the ball is physically free (free intervals between deliberate touches; no collider in contact), foot use, regions, execution error, ball speed,
// control losses, recovery touches. usage: node d1_matrix.mjs "ID,ID" seeds [prof] [arch] [out.json]
import fs from "fs"; import { makeSim, DT, PROFILES } from "./d1_env.mjs"; import { get } from "../d1_scenarios.js";
const ids = (process.argv[2] || "STRAIGHT_JOG,STRAIGHT_RUN,STRAIGHT_FAST,STRAIGHT_SPRINT").split(","), N = +(process.argv[3] || 4), prof = process.argv[4] || "HIGH", arch = process.argv[5] || "B", out = process.argv[6];
const res = {};
for (const id of ids) {
  const A = { tps: [], sepMean: [], sepMax: [], freeMean: [], freeMax: [], freeShare: [], R: 0, L: 0, pref: 0, n: 0, regions: {}, errS: [], errD: [], launch: [], ballSpeed: [], losses: [], recov: 0, ctl: [], speed: [] };
  for (let seed = 1; seed <= N; seed++) {
    const S = makeSim(get(id), { seed, arch, player: PROFILES[prof] }); S.run();
    const T = S.touches.filter(t => t.launched), k0 = T.length ? T[0].k : 0, kN = S.rec.length - 1, dur = (kN - k0) * DT;
    A.tps.push(T.length > 1 ? (T.length - 1) / ((T[T.length - 1].k - k0) * DT) : 0);
    let sm = 0, sx = 0, bs = 0, ps = 0; const rec = S.rec.slice(k0); for (const r of rec) { const d = Math.hypot(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1]); sm += d; sx = Math.max(sx, d); bs += Math.hypot(r.ball.v[0], r.ball.v[2]); ps += Math.hypot(r.V[0], r.V[1]); }
    A.sepMean.push(sm / Math.max(1, rec.length)); A.sepMax.push(sx); A.ballSpeed.push(bs / Math.max(1, rec.length)); A.speed.push(ps / Math.max(1, rec.length));
    const gaps = []; for (let i = 1; i < T.length; i++) gaps.push((T[i].k - T[i - 1].k) * DT); A.freeMean.push(gaps.length ? gaps.reduce((a, x) => a + x, 0) / gaps.length : null); A.freeMax.push(gaps.length ? Math.max(...gaps) : null);
    const contactTicks = new Set(S.contacts.map(c => c.k)); A.freeShare.push(100 * (1 - (T.length + contactTicks.size) / Math.max(1, rec.length)));
    for (const t of T) { A[t.F]++; A.n++; if (!t.weak) A.pref++; A.regions[t.reg] = (A.regions[t.reg] || 0) + 1; A.errS.push(Math.abs(t.error.sigS * t.error.eS) * 100); A.errD.push(Math.abs(t.error.sigD * t.error.eD)); A.launch.push(t.executed.speed); if (t.recovery) A.recov++; }
    A.losses.push(S.ctrl.changes.filter(c => c.to === "LOOSE" && c.k > k0).length); A.ctl.push(100 * rec.filter(r => r.ctrl === "CONTROLLED").length / Math.max(1, rec.length));
  }
  const m = (a) => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : null; }, mx = (a) => +Math.max(...a.filter(x => x != null)).toFixed(2);
  res[id] = { seeds: N, profile: PROFILES[prof].name, arch, playerSpeed: m(A.speed), touchesPerSec: m(A.tps), sepMean: m(A.sepMean), sepMax: mx(A.sepMax), freeIntervalMean: m(A.freeMean), freeIntervalMax: mx(A.freeMax), freeSharePct: m(A.freeShare),
    feet: { R: A.R, L: A.L, preferredShare: +(A.pref / Math.max(1, A.n) * 100).toFixed(0) }, regions: A.regions, touchErrSpeedPct: m(A.errS), touchErrDirDeg: m(A.errD), launchMean: m(A.launch), launchMax: mx(A.launch.length ? A.launch : [0]), ballSpeedMean: m(A.ballSpeed),
    controlLosses: m(A.losses), controlledPct: m(A.ctl), recoveryTouches: A.recov, touches: A.n };
  console.log(id.padEnd(16), JSON.stringify(res[id]));
}
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));

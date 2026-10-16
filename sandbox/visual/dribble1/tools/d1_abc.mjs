// dribble1/tools/d1_abc.mjs — the THREE-ARCHITECTURE COMPARISON on identical TURN-1.2 locomotion: straight RUN and a 60° cut (same scenarios, seeds,
// player). Per architecture: control share, deliberate touches, losses, launch repeatability (actual post-contact ball velocity vs the plan's intended
// launch), contact gap at the touch, impulses per touch (boot / toe contacts of the touching foot within 0.15 s), separation, cut response.
// usage: node d1_abc.mjs [seeds] [out.json]
import fs from "fs"; import { makeSim, DT, PROFILES } from "./d1_env.mjs"; import { get } from "../d1_scenarios.js";
const N = +(process.argv[2] || 4), out = process.argv[3], D = 180 / Math.PI, res = {};
for (const arch of ["A", "B", "C"]) for (const id of ["STRAIGHT_RUN_FAR", "CUT60_RUN_FAR"]) {
  const acc = { ctl: [], touches: [], losses: [], spdErr: [], dirErr: [], gap: [], impulses: [], sepMean: [], sepMax: [], resp: [], lift: [] };
  for (let seed = 1; seed <= N; seed++) {
    const scn = get(id), S = makeSim(scn, { seed, arch, player: PROFILES.HIGH }); S.run();
    const T = S.touches.filter(t => t.launched), k0 = T.length ? T[0].k : 0, rec = S.rec.slice(k0);
    acc.ctl.push(rec.filter(r => r.ctrl === "CONTROLLED").length / Math.max(1, rec.length) * 100); acc.touches.push(T.length);
    acc.losses.push(S.ctrl.changes.filter(c => c.to === "LOOSE" && c.k > k0).length);
    for (const t of T) {
      const post = t.post ? t.post.v : null, want = t.desired.v; if (post) { const ps = Math.hypot(post[0], post[2]), ws = Math.hypot(want[0], want[2]); acc.spdErr.push(Math.abs(ps - ws) / ws * 100); acc.dirErr.push(Math.abs(((Math.atan2(-post[2], post[0]) - Math.atan2(-want[2], want[0])) * D + 540) % 360 - 180)); acc.lift.push(post[1]); }
      acc.gap.push(t.gap * 1000);
      acc.impulses.push(S.contacts.filter(c => c.own && c.k >= t.k && c.k - t.k <= Math.round(0.15 / DT) && (c.part === "boot_" + t.F || c.part === "toe_" + t.F)).length + (arch === "A" ? 0 : 1));
    }
    let sm = 0, sx = 0; for (const r of rec) { const d = Math.hypot(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1]); sm += d; sx = Math.max(sx, d); } acc.sepMean.push(sm / Math.max(1, rec.length)); acc.sepMax.push(sx);
    if (scn.cmds.length) { const tq = scn.cmds[0].t, first = T.find(t => t.t >= tq - 1e-9 && Math.abs(Math.atan2(-t.executed.v[2], t.executed.v[0])) > 15 / D); acc.resp.push(first ? first.t - tq : null); }
  }
  const m = (a) => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : null; }, sd = (a) => { const v = a.filter(x => x != null); if (v.length < 2) return null; const mu = v.reduce((s, x) => s + x, 0) / v.length; return +Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / (v.length - 1)).toFixed(2); };
  res[arch + ":" + id] = { controlledPct: m(acc.ctl), touches: m(acc.touches), losses: m(acc.losses), launchSpeedErrPct: m(acc.spdErr), launchSpeedErrSd: sd(acc.spdErr), launchDirErrDeg: m(acc.dirErr), contactGapMm: m(acc.gap), impulsesPerTouch: m(acc.impulses), meanLiftMs: m(acc.lift), sepMean: m(acc.sepMean), sepMax: m(acc.sepMax), cutResponseS: m(acc.resp), cutResponded: acc.resp.filter(x => x != null).length + "/" + acc.resp.length };
  console.log(arch, id.padEnd(17), JSON.stringify(res[arch + ":" + id]));
}
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));

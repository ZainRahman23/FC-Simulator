// dribble1/tools/d1_scnbatch.mjs — scenario reliability: for each scenario × seed, the deliberate touches, unplanned own contacts, the share of time
// CONTROLLED after the first touch, the longest LOOSE spell, and whether the ball is under control at the end. usage: node d1_scnbatch.mjs "ID,ID" seeds [arch] [prof]
import { makeSim, DT, PROFILES } from "./d1_env.mjs"; import { get } from "../d1_scenarios.js";
const ids = (process.argv[2] || "CUT90_RUN").split(","), N = +(process.argv[3] || 4), arch = process.argv[4] || "B", prof = process.argv[5] || "HIGH";
for (const id of ids) { const rows = [];
  for (let seed = 1; seed <= N; seed++) { const S = makeSim(get(id), { seed, arch, player: PROFILES[prof], opts: { errScale: process.env.ERRK ? +process.env.ERRK : undefined } }); S.run();
    const T = S.touches.filter(t => t.launched), k0 = T.length ? T[0].k : 0, rec = S.rec.slice(k0), ctl = rec.filter(r => r.ctrl === "CONTROLLED").length / Math.max(1, rec.length);
    let loose = 0, run = 0; for (const r of rec) { if (r.ctrl === "LOOSE") { run++; loose = Math.max(loose, run); } else run = 0; }
    const own = S.contacts.filter(c => c.own && !c.striking).length, end = S.rec[S.rec.length - 1].ctrl;
    rows.push({ seed, touches: T.length, recov: S.touches.filter(t => t.launched && t.recovery).length, own, ctl: +(ctl * 100).toFixed(0), looseMax: +(loose * DT).toFixed(2), end }); }
  const m = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
  console.log(`${id.padEnd(16)} ${arch} ${prof}: controlled ${m("ctl")} % · touches ${m("touches")} · own unplanned contacts ${m("own")} · longest LOOSE ${m("looseMax")} s · end ${rows.map(r => r.end[0]).join("")}`); }

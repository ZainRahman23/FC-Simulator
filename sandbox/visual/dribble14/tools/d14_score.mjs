// dribble14/tools/d14_score.mjs — the DRIBBLE-1.3 FOOTBALL SCORECARD of one core configuration over scenarios × seeds a..b (one process; d14_score.sh
// runs it in parallel and aggregates): per run — taken with the ball / cleanly (d14_quality.mjs), the decisive touch's surface and speed, the cut
// touches (released / staged / decisive) and their speeds, launches ≥ 9 m/s through the cut, same-foot second contacts within 250 ms of any launch,
// request → first ≥ 20° redirect / ball within 20°, set-up used / taken after a set-up, end control state.
// usage: node d14_score.mjs "SCN1,SCN2" a b [ver d14] [out.json]          (D1OVR / D14CORE pass through d14_env)
import fs from "fs"; import { makeSim, PROFILES, DT } from "./d14_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d14_quality.mjs";
const [idsA, a, b, ver = "d14", outFile] = process.argv.slice(2), rows = [];
for (const id of idsA.split(",")) for (let sd = +a; sd <= +b; sd++) {
  const scn = get(id), S = makeSim(scn, { ver, seed: sd, player: PROFILES.HIGH, opts: { record: true } }); S.run();
  const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched), cmd = (scn.cmds || []).find((c) => c.turn != null && Math.abs(c.turn) >= 30), tR = cmd ? cmd.t : null;
  const after = tR == null ? [] : T.filter((t) => t.t >= tR - 1e-9), cutT = after.filter((t) => t.release || t.role === "cut" || t.role === "stage" || (q && q.decisive && Math.abs(t.t - tR - q.decisive.t) < 1e-6));
  let same = 0; for (const t of T) if (S.contacts.some((c) => c.own && c.k > t.k && c.k - t.k <= 60 && (c.part === "boot_" + t.F || c.part === "toe_" + t.F))) same++;
  rows.push({ id, sd, end: S.rec[S.rec.length - 1].ctrl, taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, toRedirectS: q ? q.toRedirectS : null, toBall20S: q ? q.toBall20S : null,
    decisive: q && q.decisive ? { reg: q.decisive.reg, speed: q.decisive.speed, F: q.decisive.F } : null, setupUsed: q ? q.setupUsed : null, cutSpeeds: cutT.map((t) => +t.executed.speed.toFixed(2)),
    over9: after.filter((t) => t.executed.speed >= 9).length, over9Roles: after.filter((t) => t.executed.speed >= 9).map((t) => t.role + (t.recovery ? '/rec' : '')), launches: T.length, sameFoot250: same, regions: T.map((t) => t.reg), fault: !!S.fault });
}
const out = JSON.stringify(rows); if (outFile) fs.writeFileSync(outFile, out); else console.log(out);

// dribble12/tools/d12_take.mjs — one cut scenario, seeds a..b: per seed taken / taken cleanly / ball within 20° (the fast comparison behind
// d12_take.sh). usage: node d12_take.mjs SCENARIO a b [ver d12]   (D1OVR / D12CORE pass through d12_env)
import { makeSim, PROFILES } from "./d12_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d12_quality.mjs";
const [id, a, b, ver = "d12"] = process.argv.slice(2), scn = get(id), out = [];
for (let sd = +a; sd <= +b; sd++) { const S = makeSim(scn, { ver, seed: sd, player: PROFILES.HIGH, opts: { record: true } }); S.run(); const q = cutQuality(S, scn), end = S.rec[S.rec.length - 1].ctrl[0];
  out.push({ id, sd, end, t: q ? +q.taken : end === "C", c: q ? +q.takenCleanly : 0, b20: q ? q.toBall20S : null }); }
console.log(JSON.stringify(out));

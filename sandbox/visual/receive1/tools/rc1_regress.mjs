// receive1/tools/rc1_regress.mjs — DRIBBLE-V1 UNCHANGED: the frozen DRIBBLE-1.5 core (dribble15/d15_core.js) runs its cut scenarios (a) in a fresh
// process before any receive, (b) after RECEIVE runs in the SAME process (the adapter overrides frozen parameters only inside its own planning
// slices — this checks nothing leaks), and both are compared tick for tick (the run fingerprint: ball and COM at every tick, every touch) and with
// the frozen evidence of record (review_artifacts/dribble15/evidence/score96_d15.json: taken / clean / decisive / cut speeds / launches per run).
// The frozen parameter object D1 is compared deeply before and after.
// usage: node rc1_regress.mjs <seeds a> <seeds b> out.json
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { makeSim, PROFILES, DT } from "../../dribble15/tools/d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "../../dribble15/tools/d15_quality.mjs";
import { makeReceive } from "./rc1_env.mjs"; import { parseCase, VISUAL } from "../rc1_cases.js";
import { D1 } from "../../dribble15/d15_core.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), [a, b, outFile] = process.argv.slice(2), SCN = ["CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN", "STRAIGHT_RUN"];
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const dribble = () => { const out = {}; for (const id of SCN) for (let sd = +a; sd <= +b; sd++) { const scn = get(id), S = makeSim(scn, { ver: "d15", seed: sd, player: PROFILES.HIGH, opts: { record: true } }); S.run();
  const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched);
  out[id + "#" + sd] = { fp: fp(S), taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, decisive: q && q.decisive ? { reg: q.decisive.reg, speed: q.decisive.speed, F: q.decisive.F } : null, launches: T.length, end: S.rec[S.rec.length - 1].ctrl }; } return out; };
const d1a = JSON.stringify(D1);
const before = dribble();
const recv = []; for (const v of VISUAL) { const cs = parseCase(v.id), S = makeReceive(cs.scenario, { seed: 1 }); S.run(); recv.push({ id: v.id, fp: fp(S), first: S.rc.first ? S.rc.first.k : null }); }
const d1b = JSON.stringify(D1);
const after = dribble();
// the frozen evidence of record
const ev0 = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/dribble15/evidence/score96_d15.json"), "utf8")), ev = ev0.rows || ev0, evBy = new Map(ev.map((r) => [r.id + "#" + r.sd, r]));
let same = 0, evMatch = 0, evN = 0; const diffs = [];
for (const k of Object.keys(before)) { const x = before[k], y = after[k]; if (JSON.stringify(x) === JSON.stringify(y)) same++; else diffs.push({ k, before: x, after: y });
  const e = evBy.get(k); if (e) { evN++; const ok = e.taken === x.taken && e.clean === x.clean && e.launches === x.launches && e.end === x.end && JSON.stringify(e.decisive) === JSON.stringify(x.decisive); if (ok) evMatch++; else diffs.push({ k, evidence: { taken: e.taken, clean: e.clean, launches: e.launches, end: e.end, decisive: e.decisive }, now: x }); } }
const res = { runs: Object.keys(before).length, beforeEqualsAfter: same, evidenceCompared: evN, evidenceMatch: evMatch, D1unchanged: d1a === d1b, receives: recv, diffs: diffs.slice(0, 20), node: process.version };
fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
console.log(`DRIBBLE-V1 runs ${res.runs}: before == after receives ${same}/${res.runs}; matches the frozen evidence ${evMatch}/${evN}; D1 unchanged ${res.D1unchanged}`);

// receive11/tools/rx_det.mjs — DETERMINISM in Node: each case run three times — animation off, animation ON (the placeholder body evaluated every
// tick), animation off again — the run fingerprints (ball + COM every tick, touches) and the receive decisions (action, contact, execution draw,
// handoff) must be identical: the presentation never changes the outcome, and a replay is exact. Plus the keyed execution draws: the same
// (seed, player, receive event) gives the same draw, different seeds give different draws.   usage: node rx_det.mjs "ID1,…" out.json [seeds]
import fs from "fs"; import { makeReceive } from "./rx_env.mjs"; import { parseCase, seedCase } from "../rx_cases.js";
const [idsA, outFile, seedsA = "1,2,3"] = process.argv.slice(2), ids = idsA.split(","), seeds = seedsA.split(",").map(Number), rows = [];
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const dec = (S) => { const a = S.rx.act, c = S.rx.contact; return JSON.stringify({ a: a ? [a.fam.id, a.F, a.sg, a.surface, a.k0, a.kc, a.kh] : null, x: c ? [c.ex.N, c.ex.keyId, c.T.launched] : null, h: S.rx.handoff ? S.rx.handoff.k : null, t: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched]) }); };
let anim = 0, replay = 0, n = 0; const draws = new Map();
for (const id of ids) for (const sd of seeds) { const cs = seedCase(parseCase(id), sd), run = (an) => { const S = makeReceive(cs, { seed: sd, anim: an }); S.run(); return S; };
  const A = run(false), B = run(true), C = run(false), fa = fp(A), fb = fp(B), fc = fp(C), da = dec(A), db = dec(B), dc = dec(C); n++;
  const animSame = fa === fb && da === db, replaySame = fa === fc && da === dc; if (animSame) anim++; if (replaySame) replay++;
  if (A.rx.contact) draws.set(`${id}#${sd}`, A.rx.contact.ex.N); rows.push({ id, seed: sd, fpOff: fa, fpOn: fb, fpReplay: fc, animSame, replaySame });
  console.log(`${id}#${sd}`.padEnd(30), animSame ? "anim on/off identical" : "ANIM CHANGES OUTCOME", "·", replaySame ? "replay identical" : "REPLAY DIFFERS"); }
// keyed draws differ across seeds for the same situation
let diff = 0, pairs = 0; for (const id of ids) for (let i = 0; i < seeds.length; i++) for (let j = i + 1; j < seeds.length; j++) { const a = draws.get(`${id}#${seeds[i]}`), b = draws.get(`${id}#${seeds[j]}`); if (a && b) { pairs++; if (a[0] !== b[0] || a[1] !== b[1]) diff++; } }
const out = { node: process.version, runs: n, animOnOffIdentical: anim, replayIdentical: replay, drawsDifferAcrossSeeds: diff, seedPairs: pairs, rows };
fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); console.log(`animation on/off identical ${anim}/${n} · replay identical ${replay}/${n} · execution draws differ across seeds ${diff}/${pairs}`);

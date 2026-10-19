// receive_moving1/tools/rm1_neutral.mjs — ANIMATION ON / OFF and REPLAY for moving receives: every review case × BC 50 / 99 × seeds 1–2 and a slice of the
// movement matrix, with the presentation bodies (RECEIVE-CONTROL-1.1's moving body, RECEIVE-CONTROL-2's bodies, TURN-1.2) posed against none: identical.
import fs from "fs"; import { makeReceiveM, DT } from "./rm1_env.mjs"; import { CASES, parseCase, seedCase, matrix } from "../rm1_cases.js";
const fpOf = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.V[0]); mix(r.V[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); mix(T.launched ? 1 : 0); for (const x of T.executed.v) mix(x); } mix(S.ctrl.changes.length); return h.toString(16); };
const runs = []; for (const c of CASES) { const base = c.id.replace(/_BC\d+$/, ""); for (const bc of [50, 99]) for (const sd of [1, 2]) runs.push(base + "_BC" + bc + "#" + sd); } for (const c of matrix().filter((_, i) => i % 7 === 0)) runs.push(c.id + "#1");
const out = { runs: runs.length, neutral: 0, deterministic: 0, poses: 0, fails: [] };
for (const r of runs) { const [id, sds] = r.split("#"), sd = +sds, cs = seedCase(parseCase(id), sd), dur = cs.scenario.dur;
  const a = makeReceiveM(cs, { seed: sd }); a.run(dur); const b = makeReceiveM(cs, { seed: sd, anim: true }); let poses = 0; while (b.k < Math.round(dur / DT) && !b.fault) { b.step(); if (b.A.skinMats) poses++; } const c = makeReceiveM(cs, { seed: sd }); c.run(dur);
  const fa = fpOf(a), fb = fpOf(b), fc = fpOf(c); out.poses += poses; if (fa === fb) out.neutral++; else if (out.fails.length < 10) out.fails.push({ id, sd, kind: "anim" }); if (fa === fc) out.deterministic++; else if (out.fails.length < 10) out.fails.push({ id, sd, kind: "replay" }); }
fs.writeFileSync(process.argv[2] || "rm1_neutral.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify({ runs: out.runs, neutral: out.neutral, deterministic: out.deterministic, poses: out.poses, fails: out.fails.slice(0, 3) }));

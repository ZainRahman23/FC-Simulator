// receive_control2/tools/rc2_neutral.mjs — ANIMATION ON / OFF IS OUTCOME-NEUTRAL on the integrated pipeline: every run with the presentation bodies
// posed every tick (RECEIVE-TURN-1.1's human body, RECEIVE-KILL's body, RECEIVE-CONTROL-1.1's body for moving receivers, TURN-1.2's own after the
// switch) against the same run with none: the ball (every tick), the receiver's root / velocity / facing (every tick), every touch and launch and the
// control state must be identical; a replay must be identical (determinism).   node rc2_neutral.mjs <out.json>
import fs from "fs"; import { makeReceive2, DT } from "./rc2_env.mjs"; import { CASES } from "../rc2_cases.js"; import { parseCase } from "../rc2_cases.js"; import { matrix, seedCase } from "../../receive11/rx_cases.js";
const fpOf = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.V[0]); mix(r.V[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); mix(T.launched ? 1 : 0); for (const x of T.executed.v) mix(x); } mix(S.ctrl.changes.length); return h.toString(16); };
const ids = []; for (const c of CASES) for (const bc of c.bc ? [null] : [50, 80, 99]) ids.push(bc == null ? c.id : c.id + "_BC" + bc);
const mtx = matrix("A").concat(matrix("B")).filter((_, i) => i % 6 === 0).map((c) => c.id); const runs = []; for (const id of ids) for (const sd of [1, 2]) runs.push([id, sd]); for (const id of mtx) runs.push([id, 1]);
const out = { runs: runs.length, neutral: 0, deterministic: 0, poses: 0, fails: [] };
for (const [id, sd] of runs) { const cs = parseCase(id), dur = cs.scenario.dur;
  const a = makeReceive2(cs, { seed: sd }); a.run(dur); const b = makeReceive2(cs, { seed: sd, anim: true }); let poses = 0; while (b.k < Math.round(dur / DT) && !b.fault) { b.step(); if (b.A.skinMats) poses++; } const c = makeReceive2(cs, { seed: sd }); c.run(dur);
  const fa = fpOf(a), fb = fpOf(b), fc = fpOf(c); out.poses += poses; if (fa === fb) out.neutral++; else if (out.fails.length < 10) out.fails.push({ id, sd, kind: "anim", fa, fb }); if (fa === fc) out.deterministic++; else if (out.fails.length < 10) out.fails.push({ id, sd, kind: "replay" }); }
fs.writeFileSync(process.argv[2] || "rc2_neutral.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify({ runs: out.runs, neutral: out.neutral, deterministic: out.deterministic, poses: out.poses, fails: out.fails.slice(0, 3) }));

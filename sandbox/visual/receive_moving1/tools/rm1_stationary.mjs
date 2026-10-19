// receive_moving1/tools/rm1_stationary.mjs — STATIONARY RECEIVES UNCHANGED: RECEIVE-CONTROL-2's integrated cases (A–M, A2, I2 × BC 50 / 99 × seeds 1–2) and
// its standing matrix rows run through ReceiveSimM must be bit-identical to ReceiveSim2 (ball, root, every touch, the control state).   node rm1_stationary.mjs <out.json>
import fs from "fs"; import { makeReceiveM } from "./rm1_env.mjs"; import { makeReceive2 } from "../../receive_control2/tools/rc2_env.mjs"; import { CASES, parseCase } from "../../receive_control2/rc2_cases.js"; import { matrix, seedCase } from "../../receive11/rx_cases.js";
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); mix(T.launched ? 1 : 0); } mix(S.ctrl.changes.length); return h.toString(16); };
const runs = []; for (const c of CASES) for (const bc of c.bc ? [null] : [50, 99]) for (const sd of [1, 2]) runs.push([bc == null ? c.id : c.id + "_BC" + bc, sd, "case"]);
for (const c of matrix("A").concat(matrix("B")).filter((x) => x.rs === "STAND")) for (const sd of [1, 2]) runs.push([c.id, sd, "matrix"]);
const out = { runs: runs.length, identical: 0, fails: [] };
for (const [id, sd, kind] of runs) { const cs = kind === "case" ? parseCase(id) : seedCase(parseCase(id), sd), a = makeReceive2(cs, { seed: sd }), b = makeReceiveM(cs, { seed: sd }); a.run(cs.scenario.dur); b.run(cs.scenario.dur);
  if (fp(a) === fp(b)) out.identical++; else if (out.fails.length < 10) out.fails.push({ id, sd }); }
fs.writeFileSync(process.argv[2] || "rm1_stationary.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));

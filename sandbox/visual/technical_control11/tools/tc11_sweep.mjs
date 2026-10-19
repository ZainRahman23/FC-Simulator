// technical_control11/tools/tc11_sweep.mjs — the feet diagnostics (tc11_diag) over the FEET review set × ratings × both bodies (TECHNICAL-CONTROL-1's,
// TECHNICAL-CONTROL-1.1's) on the same simulation; one JSON line per run (summary + every contact).   node tc11_sweep.mjs <out.jsonl> [shard/of]
import fs from "fs"; import { runDiag, analyse, bodyClass } from "./tc11_diag.mjs"; import { FEET_SET, RATINGS, caseId } from "../tc11_cases.js";
const out = process.argv[2], [sh, of] = (process.argv[3] || "0/1").split("/").map(Number), jobs = [];
for (const e of FEET_SET) for (const r of RATINGS) for (const body of ["tc1", "tc11"]) jobs.push({ e, r, body });
const fd = fs.openSync(out, "a"), B = { tc1: await bodyClass("tc1"), tc11: await bodyClass("tc11") };
for (const [j, J] of jobs.entries()) { if (j % of !== sh) continue; const id = caseId(J.e, J.r), t0 = Date.now(), run = runDiag(id, B[J.body], { seed: J.e.seed, foot: J.e.foot }), A = analyse(run);
  // the gameplay fingerprint: the ball every tick and every contact (identical for the two bodies — the body is presentation only)
  let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of run.S.rec || []) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); } for (const c of run.cons) { mix(c.k); mix(c.vOut[0]); mix(c.vOut[1]); }
  fs.writeSync(fd, JSON.stringify({ key: J.e.key, id, ratings: J.r.join("/"), body: J.body, seed: J.e.seed, foot: J.e.foot, ms: Date.now() - t0, hash: h.toString(16), fault: run.fault, flags: run.flags, sum: A.sum, contacts: A.C }) + "\n"); }

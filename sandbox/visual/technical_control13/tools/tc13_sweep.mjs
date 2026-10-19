// technical_control13/tools/tc13_sweep.mjs — the phasing diagnostics over the transition torture set × {TECHNICAL-CONTROL-1.1's body (before), TECHNICAL-CONTROL-1.3's
// (after)} on the same carry-model simulation; the gameplay fingerprint of each (identical by construction).   node tc13_sweep.mjs <out.jsonl> [ratings 99] [shard/of]
import fs from "fs"; import { runPhase, analysePhase, bodyClass } from "./tc13_phase.mjs"; import { tortureIds, specId } from "../tc13_cases.js";
const out = process.argv[2], r = +(process.argv[3] || 99), [sh, of] = (process.argv[4] || "0/1").split("/").map(Number), fd = fs.openSync(out, "a"), B = { tc11: await bodyClass("tc11"), tc13: await bodyClass("tc13") }, jobs = [];
for (const j of tortureIds()) for (const body of ["tc11", "tc13"]) jobs.push({ j, body });
for (const [n, J] of jobs.entries()) { if (n % of !== sh) continue; const s = specId(J.j.spec, [r, r, r]); let row;
  try { const run = runPhase(s.id, B[J.body], { foot: s.foot, style: s.style || undefined, flow: J.body === "tc13" }), A = analysePhase(run);
    let h = 2166136261 >>> 0; const mix = (x) => { const q = (+x).toFixed(9); for (let i = 0; i < q.length; i++) { h ^= q.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const rr of run.S.rec) { mix(rr.ball.p[0]); mix(rr.ball.p[1]); mix(rr.ball.p[2]); } for (const c of run.cons) mix(c.k);
    row = Object.assign({ group: J.j.group, spec: J.j.spec, id: s.id, foot: s.foot, style: s.style, body: J.body, ratings: r, hash: h.toString(16), contacts: run.cons.map((c) => c.F + c.surface[0] + "@" + c.t.toFixed(3)).join(" "), state: (run.S.rc2 && run.S.rc2._tc13state) || [] }, A, { contactSeq: run.cons.map((c) => ({ F: c.F, surface: c.surface, t: +c.t.toFixed(3) })), earlyFlags: run.tflags, lateFlagList: run.flags }); }
  catch (e) { row = { group: J.j.group, spec: J.j.spec, body: J.body, ratings: r, error: String(e && e.stack || e).slice(0, 400) }; }
  fs.writeSync(fd, JSON.stringify(row) + "\n"); }

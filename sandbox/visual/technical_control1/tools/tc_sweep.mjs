// technical_control1/tools/tc_sweep.mjs — one shard of a sweep: the §46 metrics of each (case × ratings × style × foot) job, written as JSON lines.
//   node tc_sweep.mjs <jobs.json> <shard> <nShards> <out.jsonl> [body]     job: { id, foot?, bridge? }  (id carries ratings / style: see anyCase)
import fs from "fs"; import { makeTech } from "./tc_env.mjs"; import { anyCase } from "../tc_course.js"; import { techMetrics, bodyMetrics } from "./tc_metrics.mjs"; import { TechBody } from "../tc_body.js";
const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), sh = +process.argv[3], nS = +process.argv[4], out = process.argv[5], body = process.argv[6] === "body"; fs.writeFileSync(out, "");
for (let j = sh; j < jobs.length; j += nS) { const jb = jobs[j], cs = anyCase(jb.id, jb.seed || 1), t0 = performance.now();
  try { const S = makeTech(cs, { seed: jb.seed || 1, style: cs.style, ratings: cs.ratings, foot: jb.foot, bridge: jb.bridge, anim: body, Body: body ? TechBody : null }); const n = Math.round(cs.scenario.dur * 240), bm = body ? bodyMetrics(S) : null;
    for (let i = 0; i < n && !S.fault; i++) { S.step(); if (bm) bm.step(); } const m = techMetrics(S, cs); if (bm) m.body = bm.result(); m.set = jb.set; m.seed = jb.seed || 1; m.foot = jb.foot || "R"; m.bridge = jb.bridge || "off"; m.ms = Math.round(performance.now() - t0); fs.appendFileSync(out, JSON.stringify(m) + "\n"); }
  catch (e) { fs.appendFileSync(out, JSON.stringify({ id: jb.id, set: jb.set, seed: jb.seed, foot: jb.foot || "R", error: String(e && e.stack || e).slice(0, 400) }) + "\n"); } }

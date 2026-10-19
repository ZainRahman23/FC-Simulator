// technical_control1/tools/tc_cpu.mjs — CPU (one process, nothing else running): per course section and receive-chain case at 99 / 99 / 99 and 50 / 50 / 50:
// ms per simulated second of the whole run, the technical-control share (its planning: decisions, selection, re-plans, chases), the worst single step;
// the receive chain also on RECEIVE-ELITE-1 and CURRENT (RECEIVE-MOVING-1) for comparison.   node tc_cpu.mjs <out.json>
import fs from "fs"; import { makeTech, makeElite, makeCurrent, DT, TC1 } from "./tc_env.mjs"; import { anyCase, COURSE, RECEIVE_CHAIN } from "../tc_course.js";
const TE = TC1.TechEpisode.prototype; let planMs = 0; for (const m of ["decide", "selectAction", "splice", "chase", "findNext", "watch"]) { const f = TE[m]; TE[m] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { planMs += performance.now() - t0; } }; }
const rows = [];
for (let rep = 0; rep < 2; rep++) for (const r of [99, 50]) for (const c of COURSE.concat(RECEIVE_CHAIN)) for (const pipe of RECEIVE_CHAIN.includes(c) ? ["NEW", "RE1", "CURRENT"] : ["NEW"]) {
  const cs = anyCase(`${c}_B${r}_D${r}_A${r}`, 1), mk = pipe === "NEW" ? makeTech : pipe === "RE1" ? makeElite : makeCurrent, S = mk(cs, { seed: 1, style: cs.style, ratings: cs.ratings }), n = Math.round(cs.scenario.dur / DT); let tot = 0, worst = 0; planMs = 0;
  while (S.k < n && !S.fault) { const t0 = performance.now(); S.step(); const dt = performance.now() - t0; tot += dt; worst = Math.max(worst, dt); }
  if (rep === 1) rows.push({ id: cs.id, pipe, ratings: r, msPerSimSec: Math.round(tot / (n * DT)), planMsPerSimSec: pipe === "NEW" ? +(planMs / (n * DT)).toFixed(1) : null, worstStep: +worst.toFixed(1) }); }
const agg = (p, f) => { const a = rows.filter((x) => x.pipe === p).map(f); return { median: a.sort((x, y) => x - y)[Math.floor(a.length / 2)], max: Math.max(...a) }; };
const sum = { NEW: { msPerSimSec: agg("NEW", (x) => x.msPerSimSec), worstStep: agg("NEW", (x) => x.worstStep), planMsPerSimSec: agg("NEW", (x) => x.planMsPerSimSec) }, RE1: { msPerSimSec: agg("RE1", (x) => x.msPerSimSec), worstStep: agg("RE1", (x) => x.worstStep) }, CURRENT: { msPerSimSec: agg("CURRENT", (x) => x.msPerSimSec), worstStep: agg("CURRENT", (x) => x.worstStep) } };
fs.writeFileSync(process.argv[2] || "tc_cpu.json", JSON.stringify({ rows, summary: sum }, null, 1)); console.log(JSON.stringify(sum));

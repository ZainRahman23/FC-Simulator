// receive_elite1/tools/re1_cpu.mjs — CPU (one process, nothing else running): per elite review case, CURRENT vs NEW at 99 / 99 / 99, the receive phase in
// ms per simulated second (until DRIBBLE-V1 takes the ball), DRIBBLE-V1 after it, the worst single step, and the moving selection's planning time.
//   node re1_cpu.mjs <out.json>
import fs from "fs"; import { makeElite, makeCurrent, DT } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js";
const rows = [];
for (let rep = 0; rep < 2; rep++) for (const id of ALL) for (const pipe of ["CURRENT", "NEW"]) { const cs = parseCase(id + "_B99_D99_A99"), S = (pipe === "NEW" ? makeElite : makeCurrent)(cs, { seed: 1 }), n = Math.round(cs.scenario.dur / DT); let rcv = 0, nr = 0, aft = 0, na = 0, worst = 0;
  while (S.k < n && !S.fault) { const ph = S.rx.phase, t0 = performance.now(); S.step(); const dt = performance.now() - t0; if (ph === "dribble") { aft += dt; na++; } else { rcv += dt; nr++; } worst = Math.max(worst, dt); }
  if (rep === 1) rows.push({ id, pipe, rxPlan: +S.rx.cpuPlan.toFixed(2), plans: S.rx.plans, cands: S.rx.cands, recvPerSimSec: Math.round(rcv / (nr * DT)), afterPerSimSec: na ? Math.round(aft / (na * DT)) : null, worstStep: +worst.toFixed(1) }); }
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; }, of = (p) => rows.filter((r) => r.pipe === p);
const out = { rows }; for (const p of ["CURRENT", "NEW"]) out[p] = { receivePerSimSec: med(of(p).map((r) => r.recvPerSimSec)), afterPerSimSec: med(of(p).filter((r) => r.afterPerSimSec).map((r) => r.afterPerSimSec)), worstStep: Math.max(...of(p).map((r) => r.worstStep)), rxPlanMedian: med(of(p).filter((r) => r.plans).map((r) => r.rxPlan)), rxPlanMax: Math.max(...of(p).map((r) => r.rxPlan)) };
out.note = "the second of two passes (the first warms the lazily built tables); receive = until DRIBBLE-V1 takes the ball (the TURN-1.2 run-out included); rxPlan = the moving selection's total planning ms per receive";
fs.writeFileSync(process.argv[2] || "re1_cpu.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify({ CURRENT: out.CURRENT, NEW: out.NEW }));

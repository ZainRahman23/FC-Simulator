// tc_responsive/tools/rs_stop.mjs — the stop after the stick is released (both engines, 4 release phases per mode): the time until the body is below
// 0.3 m/s, until the ball is below 0.2 m/s, and the final separation
//   node rs_stop.mjs
import { makeSim, DT } from "./rs_env.mjs";
for (const E of ["BASE", "RX"]) for (const mode of ["JOG", "RUN", "SPRINT"]) { const r = []; for (let off = 0; off < 4; off++) { const sim = makeSim(E), tR = 3.0 + off * 0.2; let tBody = null, tBall = null;
  for (let k = 0; k < Math.round((tR + 4) / DT); k++) { const t = k * DT; sim.step({ h: t < 0.2 || t >= tR ? null : 0, mode, keys: 0 }); if (sim.t > tR) { const st = sim.stateAt(sim.t), bs = Math.hypot(...sim.ball.v); if (tBody == null && st.s < 0.3) tBody = sim.t - tR; if (tBall == null && bs < 0.2) tBall = sim.t - tR; } }
  const st = sim.stateAt(sim.t), sep = Math.hypot(sim.ball.p[0] - st.P[0], sim.ball.p[1] - st.P[1]); r.push(`${tBody == null ? "—" : tBody.toFixed(2)}/${tBall == null ? "—" : tBall.toFixed(2)}/${sep.toFixed(2)}`); }
  console.log(`${E === "BASE" ? "88573ef0  " : "experiment"} ${mode.padEnd(6)} body<0.3 / ball<0.2 / final sep (s, s, m): ${r.join("  ")}`); }

// receive11/tools/rx_calib.mjs — BALL CONTROL CALIBRATION HARNESS: the execution-error model's constants (rx_exec.js RXE — calibration values for
// review, not locked) and what they mean on the pitch: σ of the touch direction / speed by Ball Control and difficulty, for three representative
// ideal touches (a kill, a touch into stride, a turning touch), and the resulting spread of where the ball is when the player next plays it
// (lateral = distance × tan σ_dir; along = the free roll's distance change for ±σ_speed — BALL-PHYS's own roll table).
// RXEOVR='{"sigDir": [[1, 30], …]}' tries other constants (one process).  usage: node rx_calib.mjs out.json
import fs from "fs"; import { RXE, makeReceive } from "./rx_env.mjs"; import { bcSigma } from "../rx_exec.js"; import { parseCase } from "../rx_cases.js";
const S = makeReceive(parseCase("F_0_RUN_MED"), { seed: 1 }), roll = (u, n) => S.rollDist(u, n);
const touches = [{ id: "kill", ideal: 0.9, vIn: 7.5, n: 2400, dist: 0.4 }, { id: "stride", ideal: 7.0, vIn: 9.0, n: Math.round(0.75 * 240), dist: 3.6 }, { id: "turn", ideal: 4.0, vIn: 8.5, n: Math.round(0.95 * 240), dist: 1.9 }];
const rows = []; console.log(`execution model ${RXE.id}: σ_dir(BC) deg ${JSON.stringify(RXE.sigDir)} · σ_speed(BC) × (${RXE.speedScale.out}·|v_ideal| + ${RXE.speedScale.in}·|v_in|) ${JSON.stringify(RXE.sigSpeed)}`);
console.log("BC   D    | " + touches.map((t) => `${t.id.padEnd(6)} σdir° σspd m/s  lat±m along±m`).join(" | "));
for (const bc of [99, 89, 80, 70, 60, 50, 40, 30]) for (const D of [1.0, 1.3, 1.6, 2.0]) {
  const sg = bcSigma(bc), cells = touches.map((t) => { const sd = sg.dir * D, ss = sg.speed * D * (RXE.speedScale.out * t.ideal + RXE.speedScale.in * t.vIn), d0 = roll(t.ideal, t.n).d, dp = roll(t.ideal + ss, t.n).d, dm = roll(Math.max(0, t.ideal - ss), t.n).d;
    return { touch: t.id, sigDirDeg: +sd.toFixed(2), sigSpeed: +ss.toFixed(2), lateralM: +(t.dist * Math.tan(sd * Math.PI / 180)).toFixed(2), alongM: +((dp - dm) / 2).toFixed(2) }; });
  rows.push({ bc, D, cells }); console.log(`${String(bc).padEnd(4)} ${D.toFixed(1)}  | ` + cells.map((c) => `${c.sigDirDeg.toFixed(1).padStart(12)} ${c.sigSpeed.toFixed(2).padStart(8)} ${c.lateralM.toFixed(2).padStart(7)} ${c.alongM.toFixed(2).padStart(7)}`).join(" | "));
}
fs.writeFileSync(process.argv[2], JSON.stringify({ model: RXE, touches, rows }, null, 1));

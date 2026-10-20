// tc_playtest1/tools/pt_stick_actions.mjs — a recorded browser session (PT.record()) re-simulated: every technique with the input that asked for it (the
// stick's angle from the camera forward it latched, or the keys) and the turn it asked for from the player's travel then
//   node pt_stick_actions.mjs <session.json>
import { makeSim } from "./pt_env.mjs";
import { MODES } from "../pt_sim.js";
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(process.argv[2])), sim = makeSim(R.o0), I = R.input, L = R.stick;
for (let k = 0; k < R.k; k++) { const h = I[3 * k]; sim.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
const ang = (k) => { const x = L[4 * k], y = L[4 * k + 1]; return Math.hypot(x, y) > 0.08 ? (Math.atan2(x, y) * 180 / Math.PI).toFixed(1) + "°" : "centre"; };
const trav = {}, D = 180 / Math.PI; { const sim2 = makeSim(R.o0); for (let k = 0; k < R.k; k++) { const h = I[3 * k]; sim2.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); const st = sim2.stateAt(sim2.t); trav[k] = st.s > 1 ? st.h : st.psi; } }
const wr = (x) => ((x + 540) % 360) - 180;
for (const a of sim.log.actions) { if (a.label === "CARRY") continue; const k = Math.round(a.t * 240), h = I[3 * k], src = I[3 * k + 2] & 64 ? "stick " + ang(k) : "keys " + I[3 * k + 2];
  console.log(`${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""} · ${MODES[I[3 * k + 1]]} · input ${src} · asked ${h === -99 ? "—" : (wr(h * D - trav[k - 24] * D) >= 0 ? "+" : "") + wr(h * D - trav[k - 24] * D).toFixed(0) + "° from the travel"}`); }

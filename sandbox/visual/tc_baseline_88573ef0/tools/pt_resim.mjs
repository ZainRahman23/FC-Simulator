// tc_playtest1/tools/pt_resim.mjs — re-simulates a recorded browser session (PT.record(): the start options, every tick's input, the live changes)
// in node: the same hash proves node ≡ browser; a trace window prints every re-plan's candidates (the "why") and the contacts
//   node pt_resim.mjs <session.json> [t1,t2]
import { makeSim } from "./pt_env.mjs";
import { MODES } from "../pt_sim.js";
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(process.argv[2])), tr = process.argv[3] ? process.argv[3].split(",").map(Number) : null, sim = makeSim(R.o0), I = R.input, E = R.events; let ei = 0, lastV = -1;
for (let k = 0; k < R.k; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") sim.setAttrs(e.v); else if (e.kind === "foot") sim.setFoot(e.v); }
  const h = I[3 * k]; sim.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] });
  if (tr && sim.t >= tr[0] && sim.t <= tr[1] && sim.plan.v !== lastV) { lastV = sim.plan.v; const q = sim.req; console.log(`  ${sim.t.toFixed(3)} req ${q.h == null ? "—" : (q.h * 57.3).toFixed(0) + "°"} ${q.mode} (${sim.plan.reason}) → ${sim.plan.action.label}${sim.plan.action.m ? (sim.plan.action.m > 0 ? " R" : " L") : ""} · ${(sim.plan.why || []).map((w) => w.label + " " + w.J + " [" + w.note + "]").join(" | ")}`); } }
console.log(`re-simulated ${R.k} ticks: hash ${sim.hash.toString(16)} vs browser ${R.hash.toString(16)} → ${sim.hash === R.hash ? "IDENTICAL (node ≡ browser)" : "DIFFERENT"}`);
if (tr) for (const c of sim.contacts) if (c.t >= tr[0] - 0.3 && c.t <= tr[1] + 0.3) console.log(`  contact ${c.t.toFixed(3)} ${c.F} ${c.surface} ${c.role} [${c.tech}] out ${Math.hypot(...c.vOut).toFixed(2)} @ ${(Math.atan2(c.vOut[1], c.vOut[0]) * 57.3).toFixed(0)}° req ${c.reqH == null ? "—" : (c.reqH * 57.3).toFixed(0)}`);

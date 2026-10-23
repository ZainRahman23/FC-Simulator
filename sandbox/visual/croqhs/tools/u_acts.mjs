// tc_unified1/tools/u_acts.mjs — the action sequence of one of Astra's scenarios under each configuration (what Technical Control chose, when)
//   node u_acts.mjs <scenario id> <cfg,cfg,…>
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../u_sim.js";
import { scenario, request } from "../../agility99/cases.js";
const [id, cfgs] = process.argv.slice(2), [mode, kind, ...r] = id.split("_"), spec = kind === "snap" ? scenario("snap", mode, +r[0], +r[1].slice(1), r[2] === "R" ? 1 : -1) : scenario(kind, mode, 90, +r[0].slice(1), r[1] === "R" ? 1 : -1);
for (const cfg of cfgs.split(",")) { const sim = makeSim("TL", { layers: presetLayers(cfg), ballOn: true }), n = Math.round(spec.end / DT), sp = [];
  for (let k = 0; k < n; k++) { sim.step(request(k * DT < 0.2 ? null : spec.fn(k * DT), spec.mode)); if (k % 60 === 0 && k * DT >= spec.t0 - 0.3) sp.push(sim.stateAt(sim.t).s.toFixed(1)); }
  const acts = sim.log.actions.filter((a) => a.t >= spec.t0 - 0.05).map((a) => `${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? "R" : "L") : ""}`);
  console.log(`${cfg.padEnd(5)} contacts ${sim.contacts.filter((c) => c.t >= spec.t0).length} plans ${sim.log.plans} · ${acts.join(" | ")}\n      speed/0.25 s: ${sp.join(" ")}`); }

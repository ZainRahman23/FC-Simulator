// tc_layered2/tools/tl_resim.mjs — node re-simulation of a browser session record (either engine, its layers): the same hash, contacts and actions
// = node ≡ browser.   node tl_resim.mjs <session.json>
import { makeSim, DT } from "./tl_env.mjs";
import { MODES } from "../tl_sim.js";
import fs from "node:fs";
const rec = JSON.parse(fs.readFileSync(process.argv[2])), o0 = JSON.parse(JSON.stringify(rec.o0)), sim = makeSim(rec.engine === "baseline" ? "BASE" : "TL", o0), I = rec.input, E = rec.events || []; let ei = 0;
for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") sim.setAttrs(e.v); else if (e.kind === "foot") sim.setFoot(e.v); } const h = I[3 * k]; sim.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
console.log(`${rec.engine}${rec.layers ? " [" + Object.keys(rec.layers).filter((k) => rec.layers[k]).join(",") + "]" : ""}: re-simulated ${I.length / 3} ticks: hash ${sim.hash.toString(16)} vs browser ${rec.hash.toString(16)} → ${sim.hash === rec.hash ? "IDENTICAL (node ≡ browser)" : "DIFFERENT"}`);

// tc_responsive/tools/rs_resim.mjs — node re-simulation of a browser session record (either engine): the same hash, contacts and actions = node ≡ browser
//   node rs_resim.mjs <session.json>
import { makeSim, DT } from "./rs_env.mjs";
import { MODES } from "../rs_sim.js";
import fs from "node:fs";
const rec = JSON.parse(fs.readFileSync(process.argv[2])), eng = rec.engine === "baseline" ? "BASE" : "RX", S = makeSim(eng, rec.o0), I = rec.input, E = rec.events || []; let ei = 0;
for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") S.setAttrs(e.v); else if (e.kind === "foot") S.setFoot(e.v); } const h = I[3 * k]; S.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
console.log(`${rec.engine || "?"}: re-simulated ${I.length / 3} ticks: hash ${S.hash.toString(16)} vs browser ${rec.hash.toString(16)} → ${S.hash === rec.hash ? "IDENTICAL (node ≡ browser)" : "DIFFERENT"}`);

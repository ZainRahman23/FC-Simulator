import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
const c = { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.2, intents: [] };
for (const tq of [0.40, 0.55, 0.65, 0.75, 0.85, 0.95]) {
  const enc = { c, def: { P: [41.6, 34.0], h: Math.PI }, defStick: [], tackle: [tq] };
  const W = new TackleWorld(ENV, encounterOpts(enc)); let err = null; try { runEncounter(W, enc); } catch (e) { err = e; }
  const L = W.tk.log[0], S = W.tk.summary();
  console.log(`req ${tq}: ${L.state} ${L.reason || ""} ${S ? `${S.family} ${S.foot} c ${S.c} ang ${S.angle} rng ${S.range} commit +${S.commit} ctl +${S.controlReady} hits ${S.hits.length} ${S.hits.map((h) => h.surface + " dv " + h.dv + " " + h.possBefore + "→" + h.possAfter).join(";")} → ${S.outcome ? S.outcome.kind + " (" + S.outcome.why + ")" : "?"}` : ""}${err ? " ERROR " + err.stack.split("\n").slice(0, 3).join(" | ") : ""}`);
}

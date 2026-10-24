// side-on set-ups: the defender beside the attacker's path, facing across it (the ball crosses in front of him)
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
const mode = process.argv[2] || "JOG", sp = mode === "WALK" ? 1.5 : 3.2, c = { tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.6, intents: [] }, X0 = mode === "WALK" ? 34.9 : 36.81, tally = {};
for (const side of [1, -1]) for (const off of [0.9, 1.1, 1.3]) for (const face of [90, 120, 150]) for (const dt of [-0.15, 0, 0.15]) {
  // the defender stands off = lateral metres from the path (side +1 = the attacker's right), facing `face`° from the attacker's travel (90 = across, 150 = mostly toward him)
  const xD = X0 + sp * 1.2 + 0.55, yD = 34 - side * off, hD = side * face * Math.PI / 180, tq = Math.max(0, 1.2 - 0.35 + dt);
  const enc = { c, def: { P: [xD, yD], h: hD }, defStick: [], tackle: [tq], dur: Math.min(3.6, tq + 2.6) };
  const W = new TackleWorld(ENV, encounterOpts(enc)); runEncounter(W, enc); const L = W.tk.log[0], S = W.tk.summary();
  const kind = S ? S.outcome.kind : "DECLINED"; tally[kind] = (tally[kind] || 0) + 1;
  console.log(`side ${side} off ${off} face ${face} req ${tq.toFixed(2)} → ${S ? `${S.family} ${S.foot} ang ${S.angle} rng ${S.range} hits ${S.hits.map((h) => h.surface + " " + h.dv + " out " + h.vOut.join("/")).join(",") || "—"} → ${S.outcome.kind} · ${S.outcome.why}` : L.state + " " + L.reason}`); }
console.log("\nTALLY", JSON.stringify(tally));

// tackle1/tools/t_sweep.mjs — the outcome distribution over honest set-ups (no curation): a jog / walk carry straight at a set defender,
// the defender's lateral offset × the request time. node t_sweep.mjs [--mode JOG] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const mode = arg("mode", "JOG"), sp = mode === "WALK" ? 1.5 : 3.2, c = { tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.6, intents: [] };
const X0 = mode === "WALK" ? 34.9 : 36.81;   // the attacker at t = 0 (x); y = 34
const rows = [], tally = {};
for (const lat of [-0.6, -0.3, 0, 0.3, 0.6]) for (const dA of [1.0, 1.15, 1.3, 1.45]) {
  // the defender set 4 m ahead of where the attacker is at t = 0 + 1 s, facing back; the request when the ball is ≈ dA m from him
  const Dx = X0 + sp * 1.0 + 4.0, Dy = 34 - lat, tq = Math.max(0, (Dx - dA - (X0 + 0.55)) / sp);
  const enc = { c, def: { P: [Dx, Dy], h: Math.PI }, defStick: [], tackle: [tq], dur: Math.min(3.6, tq + 2.4) };
  const W = new TackleWorld(ENV, encounterOpts(enc)); runEncounter(W, enc); const L = W.tk.log[0], S = W.tk.summary();
  const kind = S ? S.outcome.kind : "DECLINED: " + (L.reason || "").split(":")[0]; tally[kind] = (tally[kind] || 0) + 1;
  rows.push({ lat, dA, tq: +tq.toFixed(3), state: L.state, reason: L.reason, S });
  console.log(`lat ${lat.toFixed(1)} dA ${dA.toFixed(2)} req ${tq.toFixed(2)} → ${L.state}${S ? ` ${S.family} ${S.foot} c ${S.c} ang ${S.angle} commit +${S.commit} hits ${S.hits.map((h) => h.surface + " " + h.dv).join(",") || "—"} → ${S.outcome.kind} · ${S.outcome.why}` : " " + L.reason}`); }
console.log("\nTALLY", JSON.stringify(tally)); if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ mode, rows, tally }, null, 1));

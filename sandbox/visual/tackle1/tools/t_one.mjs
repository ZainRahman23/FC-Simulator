import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
const [side, off, face, tq] = (process.argv[2] || "1,0.9,90,0.70").split(",").map(Number);
const c = { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.6, intents: [] }, X0 = 36.81, sp = 3.2;
const enc = { c, def: { P: [X0 + sp * 1.2 + 0.55, 34 - side * off], h: side * face * Math.PI / 180 }, defStick: [], tackle: [tq], dur: tq + 2.6 };
const W = new TackleWorld(ENV, encounterOpts(enc)); runEncounter(W, enc); const S = W.tk.summary(), A = W.tk.act;
console.log(JSON.stringify(S, null, 0).slice(0, 900));
const k0 = Math.round(2.4 / DT), h = A.hits[0];
for (let t = h.t - 0.05; t < h.t + 1.2; t += 0.05) { const b = W.att.ballTrack(t), a = W.att.stateAt(t), d = W.def.stateAt(t); const pl = W.att.planAt(t);
  console.log(`+${(t - h.t).toFixed(2)} ball ${b.p.slice(0,2).map((x) => x.toFixed(2))} v ${Math.hypot(b.v[0], b.v[1]).toFixed(2)} | att ${a.P.map((x) => x.toFixed(2))} s ${a.s.toFixed(2)} ${pl.action.label}${pl.action.chase ? " chase" : ""} | sep ${Math.hypot(b.p[0] - a.P[0], b.p[1] - a.P[1]).toFixed(2)} | def ${d.P.map((x) => x.toFixed(2))} ${W.def.planAt(t).action.label} | poss ${W.att.poss.log.filter((e) => e.t <= t + 1e-6).slice(-1).map((e) => e.to + ":" + e.why)}`); }
console.log("att contacts after:", W.att.contacts.filter((x) => x.t > h.t - 0.01).slice(0, 6).map((x) => `${(x.t - h.t).toFixed(2)} ${x.F} ${x.surface} ${x.role} ${x.src} ${x.missed ? "MISSED" : ""} out ${Math.hypot(...x.vOut).toFixed(1)}`).join(" | "));
console.log("world log:", JSON.stringify(W.log));

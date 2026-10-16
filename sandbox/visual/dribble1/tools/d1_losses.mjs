// dribble1/tools/d1_losses.mjs — why control is lost: for each scenario × seed, every CONTROLLED/CONTESTED → LOOSE change with the ball's position
// relative to the carrier (forward / lateral, m), its speed, the carrier's speed / heading vs the requested heading, the last touch (foot, region, launch,
// aimed separation) and the planning pass's rejection profile at that moment. usage: node d1_losses.mjs "IDs" seeds [prof]
import { makeSim, DT, PROFILES } from "./d1_env.mjs"; import { get } from "../d1_scenarios.js";
const ids = (process.argv[2] || "CUT45_RUN").split(","), N = +(process.argv[3] || 4), prof = process.argv[4] || "HIGH", D = 180 / Math.PI;
for (const id of ids) for (let seed = 1; seed <= N; seed++) {
  const S = makeSim(get(id), { seed, player: PROFILES[prof] }); let rej = null; const orig = S.makePlan.bind(S);
  S.makePlan = (k) => { S.rej = {}; orig(k); rej = Object.fromEntries(Object.entries(S.rej).filter(([a, v]) => typeof v === "number" && v > 0)); };
  const n = Math.round(S.cfg.scenario.dur / DT), notes = []; let prev = S.ctrl.state;
  while (S.k < n && !S.fault) { S.step(); if (S.ctrl.state !== prev) { if (S.ctrl.state === "LOOSE") { const b = S.W.ball, A = S.A, dx = b.p[0] - A.P[0], dy = b.p[2] - A.P[1];
        const f = dx * Math.cos(A.psi) + dy * Math.sin(A.psi), l = -dx * Math.sin(A.psi) + dy * Math.cos(A.psi), T = S.touches.filter((t) => t.launched).pop();
        notes.push(`  LOOSE ${(S.k * DT).toFixed(2)}s ball fwd ${f.toFixed(2)} lat ${l.toFixed(2)} v ${Math.hypot(b.v[0], b.v[2]).toFixed(2)} | carrier ${Math.hypot(A.V[0], A.V[1]).toFixed(2)} m/s psi ${(A.psi * D).toFixed(0)}° | last touch ${T ? `${T.t.toFixed(2)}s ${T.F} ${T.reg} ${T.executed.speed.toFixed(2)} m/s dir ${(Math.atan2(-T.executed.v[2], T.executed.v[0]) * D).toFixed(0)}° want ${T.desired.want != null ? (+T.desired.want).toFixed(2) : "-"} kNext ${T.desired.kNext != null ? (T.desired.kNext * DT).toFixed(2) : "-"}` : "none"} | contacts since ${S.contacts.filter((c) => T && c.k > T.k).map((c) => c.part + "@" + c.t.toFixed(2)).join(" ") || "-"} | rej ${JSON.stringify(rej)}`); }
      prev = S.ctrl.state; } }
  const T = S.touches.filter((t) => t.launched);
  console.log(`${id}:${seed} end ${S.ctrl.state} touches ${T.map((t) => `${t.t.toFixed(2)}${t.F}${t.reg[0]}${t.recovery ? "*" : ""}`).join(" ")} cancelled ${S.touches.filter((t) => t.cancelled).length}`); notes.forEach((x) => console.log(x)); }

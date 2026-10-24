// tackle1/tools/t_envelope.mjs — THE ENVELOPE, measured: the defender STANDING / WALKING IN / JOGGING IN / RUNNING IN × the ball passing his LEFT /
// RIGHT side × beside the path at 0.8 / 1.1 m × facing ROUGHLY HEAD-ON (180°) / SLIGHTLY OFF (160°) / SIDE-BIASED (135°), against the jog carry;
// for each set-up the first request time that commits (0 … 1.4 s) — or the decline that every time met — then the action (family, foot, the
// challenge angle, the reach, the contact), the outcome, and the body inside the tackle (t_body.js). node t_envelope.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { runCase, caseReport } from "../t_run.js";
import { bodyAudit } from "../t_body.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const env = Object.assign({}, ENV, { colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) });
const carry = { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] };
const APPROACH = { STANDING: null, "WALKING IN": "WALK", "JOGGING IN": "JOG", "RUNNING IN": "RUN" }, out = [];
for (const [apName, mode] of Object.entries(APPROACH)) for (const side of ["LEFT", "RIGHT"]) for (const lat of [0.8, 1.1]) for (const face of [180, 160, 135]) {
  // (the ball on the defender's LEFT = the defender on the attacker's left of the path: lateral −; facing turned toward the path)
  const sgn = side === "LEFT" ? -1 : 1, ahead = mode ? (mode === "WALK" ? 5.2 : mode === "JOG" ? 7.0 : 9.5) : 4.4, f = 180 + sgn * (180 - face);
  const def = { at: [ahead, sgn * lat], face: f, stick: mode ? [[-0.6, 0, mode], [mode === "RUN" ? 0.6 : 0.5, null, mode]] : [] };
  let best = null, last = null;
  for (let q = 0; q <= 28 && !best; q++) { const tq = +(q * 0.05).toFixed(2), tc = { id: "env", c: carry, def, tackle: [tq] }, r = runCase(env, tc), R = caseReport(r.W, r.t0);
    if (R.action) { const B = bodyAudit(env, r.W, r.W.tk.act.t0, Math.min(r.W.t, r.W.tk.act.tCtl)); best = { tq, S: R.action, B }; } else last = R.requests[0].reason; }
  const row = { approach: apName, side, lat, face, committed: !!best, decline: best ? null : last };
  if (best) Object.assign(row, { tq: best.tq, family: best.S.family, foot: best.S.foot, angle: best.S.angle, range: best.S.range, approachSpeed: best.S.approach, c: best.S.c, contact: best.S.hits.length ? best.S.hits[0].surface : "none", outcome: best.S.outcome.kind, controlReady: best.S.controlReady, recoveryAfterContact: best.S.hits.length ? +(best.S.controlReady - best.S.hits[0].t).toFixed(3) : null, bodyEvents: Object.fromEntries(Object.entries(best.B.ev.in).filter(([k]) => k !== "PLAYER OVERLAP")), overlapCm: +(best.B.max.overlapIn * 100).toFixed(1) });
  out.push(row); console.log(`${apName.padEnd(11)} ball ${side.padEnd(5)} lat ${lat} face ${face}  →  ${best ? `${row.family} ${row.foot} ${row.angle}° ${row.range} m @${row.approachSpeed} m/s · ${row.contact} · ${row.outcome} · body ${JSON.stringify(row.bodyEvents)} · overlap ${row.overlapCm} cm` : "DECLINED: " + last}`); }
const by = (k) => { const m = {}; for (const r of out) { const g = r[k]; (m[g] || (m[g] = { n: 0, committed: 0 })).n++; if (r.committed) m[g].committed++; } return m; };
console.log("\nCOMMITTED by approach", JSON.stringify(by("approach")), "· by side", JSON.stringify(by("side")), "· by facing", JSON.stringify(by("face")));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

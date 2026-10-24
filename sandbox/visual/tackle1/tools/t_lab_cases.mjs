// tackle1/tools/t_lab_cases.mjs — every Tackling Lab case run in node: the request's fate, the action, the contact, the outcome, the bodies' distance
//   node t_lab_cases.mjs [--contact POKE|PHASE_C] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { TCASES } from "../t_cases.js";
import { runCase, caseReport } from "../t_run.js";
import fs from "node:fs";
import { bodyAudit } from "../t_body.js";
const env = Object.assign({}, ENV, { colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) });
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = [];
for (const tc of TCASES) { const r = runCase(env, tc, { contact: arg("contact") }), W = r.W, R = caseReport(W, r.t0), S = R.action;
  let dmin = 9, tmin = null; for (let t = r.t0; t <= W.t; t += DT * 4) { const a = W.att.stateAt(t).P, d = W.def.stateAt(t).P, x = Math.hypot(a[0] - d[0], a[1] - d[1]); if (x < dmin) { dmin = x; tmin = t - r.t0; } }
  const q = R.requests[0] || { t: "—", state: "NO REQUEST" }, B = bodyAudit(env, W, r.clip[0], W.t); out.push({ id: tc.id, R, dmin, tmin, body: B });
  const ev = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  console.log(`${tc.id.padEnd(15)} req ${q.t} ${q.state}${q.reason ? " (" + q.reason + ")" : ""}${S ? ` → ${S.family} ${S.foot} c ${S.c} ang ${S.angle}° rng ${S.range} commit +${S.commit} ctl +${S.controlReady} | ${S.hits.length ? S.hits.map((h) => `${h.surface} Δv ${h.dv} ${h.possBefore}→${h.possAfter}`).join("; ") : "no contact"} | ${S.outcome.kind}: ${S.outcome.why}` : ""} | root–root min ${dmin.toFixed(2)} m\n      BODY in the tackle: ${ev(B.ev.in)} · outside it: ${ev(B.ev.out)} · max foot ${B.max.footSpeed.toFixed(1)} m/s, knee ${B.max.kneeRate.toFixed(0)}°/s, plant drift ${(B.max.plantDrift * 100).toFixed(1)} cm, pelvis dev ${(B.max.pelvisDev * 1000).toFixed(1)} mm/tick, trunk ${B.max.trunkRate.toFixed(0)}°/s, player overlap ${(B.max.overlap * 100).toFixed(1)} cm (in the tackle ${(B.max.overlapIn * 100).toFixed(1)})`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

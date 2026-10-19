// technical_control1/tools/tc_course_try.mjs — course sections: the contacts, the actions, the separation   node tc_course_try.mjs <ids>
import { makeTech } from "./tc_env.mjs"; import { courseCase } from "../tc_course.js";
for (const id of process.argv[2].split(",")) { const cs = courseCase(id), S = makeTech(cs, { seed: 1, style: cs.style, ratings: cs.ratings }); S.run(cs.scenario.dur); const ep = S.rc2.ep;
  let mx = 0, sum = 0, n = 0; for (const r of S.rec) { const d = Math.hypot(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1]); mx = Math.max(mx, d); sum += d; n++; }
  const C = ep.contacts, gaps = C.slice(1).map((c, i) => +(c.t - C[i].t).toFixed(2)), feet = C.reduce((o, c) => (o[c.F] = (o[c.F] || 0) + 1, o), {}), surf = C.reduce((o, c) => (o[c.surface] = (o[c.surface] || 0) + 1, o), {});
  const last = S.rec[S.rec.length - 1], D = 180 / Math.PI;
  console.log(id.padEnd(30), "sep max", mx.toFixed(2), "mean", (sum / n).toFixed(2), "contacts", C.length, "feet", JSON.stringify(feet), "surf", JSON.stringify(surf), "failed", ep.failed, ep.notes.join(";"), "end v", Math.hypot(last.V[0], last.V[1]).toFixed(1), "hd", (Math.atan2(last.V[1], last.V[0]) * D).toFixed(0), S.fault ? "FAULT " + S.fault.message : "");
  console.log("   gaps", gaps.join(" "), "| actions", ep.techLog.filter((e) => e.ev !== "run").map((e) => e.ev === "action" ? `${e.fam}(${e.F},j${e.j},${e.t}→${e.tc})` : e.ev + "@" + e.t).join(" ")); }

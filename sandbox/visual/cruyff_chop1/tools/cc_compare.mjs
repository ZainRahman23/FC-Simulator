// cruyff_chop1/tools/cc_compare.mjs — the Lab's COMPARE pairs (v_cases.js COMPARES) run in node with the Lab's own runner and exit metrics:
// each lane's played technique, request → decisive, → useful exit, total, the speed at the contact, the lowest speed, control back, metres
// along the exit in 1 s, possession, and the posed body (v_extreme's classes) over the clip
//   node cc_compare.mjs [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { COMPARES } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize, exitMetrics } from "../v_run.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, out = [];
const lane = (c) => { const sim = makeSim("TL", Object.assign(caseOpts(c), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c), S = summarize(sim, r.t0), X = exitMetrics(sim, r.t0, c.ang * DEG, c.mode), m = measure(sim, Math.round(r.clip[0] / DT), 0);
  return { played: X ? X.label : null, skill: S.skills.map((x) => x.result).join(","), tDec: X && +X.tDec.toFixed(3), tExit: X && X.tExit != null ? +X.tExit.toFixed(3) : null, total: X && X.total != null ? +X.total.toFixed(3) : null, vC: X && +X.vC.toFixed(2), vMin: X && +X.vMin.toFixed(2), ctl: X && X.ctl != null ? +X.ctl.toFixed(3) : null, d1: X && +X.d1.toFixed(2), p25: X && +X.p25.toFixed(2), exits: S.exits.length, missed: S.missed, body: m.N, bodyEv: m.F.filter((f) => f.lvl === "normal").map((f) => `${f.kind} ${f.depth || f.deg || f.cm || f.air}`) }; };
const f2 = (x) => (x == null ? " — " : x.toFixed(2));
for (const p of COMPARES) { const a = lane(p.a), b = lane(p.b); out.push({ name: p.name, mode: p.mode, a, b });
  const L = (k, x) => `   ${k} ${String(x.played || "—").padEnd(26)} ${x.skill.padEnd(8)} dec ${f2(x.tDec)} · exit +${f2(x.tExit)} · total ${f2(x.total)} · vC ${x.vC == null ? "—" : x.vC.toFixed(1)} · vMin ${x.vMin == null ? "—" : x.vMin.toFixed(1)} · ctl +${f2(x.ctl)} · d1 ${f2(x.d1)} · p25 ${f2(x.p25)} · exits ${x.exits} · body ${x.body.normal}/${x.body.slow}${x.bodyEv.length ? " [" + x.bodyEv.join(", ") + "]" : ""}`;
  console.log(`■ ${p.name}${a.total != null && b.total != null ? ` — B ${(a.total - b.total) >= 0 ? (a.total - b.total).toFixed(2) + " s sooner" : (b.total - a.total).toFixed(2) + " s later"}` : ""}`); console.log(L("A", a)); console.log(L("B", b)); }
if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1));

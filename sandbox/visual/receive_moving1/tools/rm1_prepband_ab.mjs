// receive_moving1/tools/rm1_prepband_ab.mjs — the approach change (RM.prepBand) A/B on the owner's cases: RECEIVE-CONTROL-1.1's ±6 % keep band (step 1) vs
// the approach following the meeting's need (final), BC 99 × seeds 1–3: the speed before, the minimum, at the contact.   node rm1_prepband_ab.mjs <out.json>
import fs from "fs"; import { makeReceiveM, RM1 } from "./rm1_env.mjs"; import { CASES, parseCase, seedCase } from "../rm1_cases.js"; import { momentum } from "./rm1_metrics.mjs";
const out = { note: "step 1 = RM.prepBand null (RECEIVE-CONTROL-1.1's keep band 0.06); final = RM.prepBand 0", rows: [] }, keep = RM1.RM.prepBand;
for (const c of CASES) { if (/_BC\d+$/.test(c.id) || /STAND/.test(c.id)) continue; const row = { case: c.id, tag: c.tag };
  for (const [lab, pb] of [["step1", null], ["final", 0]]) { RM1.RM.prepBand = pb; row[lab] = [1, 2, 3].map((sd) => { const cs = seedCase(parseCase(c.id + "_BC99"), sd), S = makeReceiveM(cs, { seed: sd }); S.run(cs.scenario.dur); const m = momentum(S); return { seed: sd, vBefore: m.vBefore, vMin: m.vMin, vContact: m.vContact, keep: m.brakeRatio }; }); }
  out.rows.push(row); }
RM1.RM.prepBand = keep; fs.writeFileSync(process.argv[2] || "rm1_prepband_ab.json", JSON.stringify(out, null, 1));
for (const r of out.rows) console.log(r.case.padEnd(24), "step1", r.step1.map((x) => x.keep).join(" "), " final", r.final.map((x) => x.keep).join(" "));

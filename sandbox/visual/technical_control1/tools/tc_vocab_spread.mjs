// technical_control1/tools/tc_vocab_spread.mjs — AUTOMATIC SKILL USAGE over a spread of situations (owner §15 – §16): the uniform presets on free turns of
// 35 – 180° at 3 / 4.5 / 5.5 / 7 m/s × seeds 1 – 3 — the actions chosen, the sophisticated share (Cruyff, drag across, double touch, feint).   node tc_vocab_spread.mjs <out.json>
import fs from "fs"; import { makeTech } from "./tc_env.mjs"; import { anyCase } from "../tc_course.js";
const out = {}; for (const r of [99, 90, 80, 70, 60, 50]) { const c = {}; let n = 0;
  for (const deg of [35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 180]) for (const v of [3, 4.5, 5.5, 7]) for (const sd of [1, 2, 3]) { const cs = anyCase(`TURN${deg}_V${v}_B${r}_D${r}_A${r}`, sd), S = makeTech(cs, { seed: sd, style: cs.style, ratings: cs.ratings }); S.run(cs.scenario.dur);
    for (const a of S.rc2.ep.techLog.filter((e) => e.ev === "action")) { c[a.fam] = (c[a.fam] || 0) + 1; n++; } }
  const soph = ["CRUYFF", "DRAG_ACROSS", "DOUBLE", "FEINT_EXIT"].reduce((s, k) => s + (c[k] || 0), 0); out[r] = { n, soph: +(soph / n).toFixed(3), c }; console.log(r, n, Math.round(soph / n * 100) + "%", JSON.stringify(c)); }
fs.writeFileSync(process.argv[2] || "tc_vocab_spread.json", JSON.stringify(out, null, 1));

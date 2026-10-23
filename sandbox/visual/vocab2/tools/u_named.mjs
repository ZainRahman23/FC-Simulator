// tc_unified1/tools/u_named.mjs — THE NAMED-MOVE SCENARIOS (owner: "include situations deliberately favourable to Ronaldo Chop, Cruyff, hook,
// drag-back, outside cut — confirm that B4 has not erased them — then nearby situations where a generic action should reasonably beat them"):
// a sudden snap at a speed / angle where 88573ef0 itself chooses the technique, and a neighbouring one; 8 traces each (4 stride phases × both
// directions); the first action after the change, its first useful contact and the new line, per configuration (simulation only)
//   node u_named.mjs [--configs A,B4,B45] [--json f]
import { survey } from "./u_survey.mjs";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
import { SCEN, scenSpecs } from "../u_tests.js";
const mk = scenSpecs;
if ((process.argv[1] || "").endsWith("u_named.mjs")) { const cfgs = opt("configs", "A,B4,B45").split(","), out = [], med = (A) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; }, f2 = (x) => (x == null ? " — " : x.toFixed(2));
  for (const [tech, kind, mode, ang] of SCEN) { const specs = mk(mode, ang), row = { tech, kind, mode, ang, cfg: {} }; let line = `■ ${tech.padEnd(13)} ${kind.padEnd(10)} ${mode.toLowerCase().padEnd(6)} ${String(ang).padStart(3)}°`;
    for (const cfg of cfgs) { const R = specs.map((sp) => survey(cfg, sp)), H = {}; for (const r of R) { const k = r.first.replace(/ [RL]$/, ""); H[k] = (H[k] || 0) + 1; }
      row.cfg[cfg] = { hist: H, named: H[tech] || 0, contact: med(R.map((r) => r.contact)), line: med(R.map((r) => r.line)) };
      line += `\n     ${cfg.padEnd(4)} ${tech.split(" ")[0].toLowerCase()} ${row.cfg[cfg].named}/8 · contact ${f2(row.cfg[cfg].contact)} · line ${f2(row.cfg[cfg].line)} · ${Object.entries(H).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(", ")}`; }
    console.log(line); out.push(row); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

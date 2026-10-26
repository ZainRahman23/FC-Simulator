// occupy3b2/tools/b2_percase.mjs — per case, 3B.1 against one 3B.2 configuration: leg ticks > 5 cm, the deepest, crossed, falls — the cases it changes most
import { ENV, setOf, arg, cm, limbMeasure } from "../../occupy3b/tools/l3_common.mjs";
import { measure } from "./b2_measure.mjs";
import { runB2 } from "../b2_run.js";
const L = setOf(arg("set", "review")), CFG = JSON.parse(arg("cfg", "{}")), rows = [];
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; } const r = { id: tc.id };
  for (const [k, mode, b2] of [["a", "S3B", null], ["b", "S3B2", CFG]]) { globalThis.__b2opts = b2; const o = measure(tc, mode), lm = limbMeasure(runB2.last); globalThis.__b2opts = undefined;
    r[k] = { t5: lm.legs5, deep: lm.legs, cr: o.crossed, jump: o.discMax, slide: o.footSlide, nf: runB2.last.W.b2 ? runB2.last.W.b2.results.length : 0, falls: o.eps.reduce((a, e) => a + ["ATT", "DEF"].filter((x) => e.players[x] && e.players[x].fall).length, 0), dec: runB2.last.W.b2 ? runB2.last.W.b2.decisions.length : 0 }; }
  rows.push(r); process.stderr.write("."); }
console.log(`\nper case: >5 cm ticks · deepest · crossed · falls (3B.1 → config) · 3B.2 decisions`);
for (const r of rows.sort((x, y) => (y.b.t5 - y.a.t5) - (x.b.t5 - x.a.t5))) if (r.a.t5 !== r.b.t5 || r.a.cr !== r.b.cr || r.a.falls !== r.b.falls || Math.abs(r.a.jump - r.b.jump) > 0.05 || Math.abs(r.a.slide - r.b.slide) > 0.03) console.log(`${r.id.padEnd(24)} ${String(r.a.t5).padStart(4)} → ${String(r.b.t5).padEnd(4)} deep ${cm(r.a.deep)} → ${cm(r.b.deep).padEnd(5)} x ${r.a.cr} → ${String(r.b.cr).padEnd(4)} falls ${r.a.falls} → ${r.b.falls} (NF ${r.b.nf}) jump ${cm(r.a.jump)} → ${cm(r.b.jump)} slide ${cm(r.a.slide)} → ${cm(r.b.slide)}  dec ${r.b.dec}`);

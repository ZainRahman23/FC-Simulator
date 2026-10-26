// occupy3b2/tools/b2_percase2.mjs — per case, one 3B.2 configuration against another: legs > 5 cm ticks, crossed, falls — the cases it changes most
import { ENV, setOf, arg, cm, limbMeasure } from "../../occupy3b/tools/l3_common.mjs";
import { measure } from "./b2_measure.mjs";
import { runB2 } from "../b2_run.js";
const L = setOf(arg("set", "review")), A = JSON.parse(arg("a")), B = JSON.parse(arg("b")), rows = [];
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; } const r = { id: tc.id };
  for (const [k, cfg] of [["a", A], ["b", B]]) { globalThis.__b2opts = cfg; const o = measure(tc, "S3B2"), lm = limbMeasure(runB2.last), W = runB2.last.W; globalThis.__b2opts = undefined;
    r[k] = { t5: lm.legs5, cr: o.crossed, falls: o.eps.reduce((a, e) => a + ["ATT", "DEF"].filter((x) => e.players[x] && e.players[x].fall).length, 0), chains: W.b2.chains.length, ev: W.b2.events.filter((e) => /COMMITTED|INTERRUPT|REPLACED/.test(e.kind)).map((e) => `${(e.t - runB2.last.t0).toFixed(2)} ${e.who} ${e.kind.slice(0, 40)}`) }; }
  rows.push(r); process.stderr.write("."); }
console.log("");
for (const r of rows.sort((x, y) => (y.b.t5 - y.a.t5) - (x.b.t5 - x.a.t5)).slice(0, +arg("top", 12))) console.log(`${r.id.padEnd(22)} >5 ${r.a.t5} → ${r.b.t5}  x ${r.a.cr} → ${r.b.cr}  falls ${r.a.falls} → ${r.b.falls}  chains ${r.b.chains}  ${r.b.ev.slice(0, 4).join(" | ")}`);

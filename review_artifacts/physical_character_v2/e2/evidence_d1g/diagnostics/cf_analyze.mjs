// D1G stress counterfactual comparison (post-hoc, labelled): frozen battery record vs no D1 at all (nod1) vs no rate feed-forward on invalid D1 ticks (novff) vs both
import fs from "fs"; import zlib from "zlib"; import path from "path";
const S = process.argv[2], B = process.argv[3], load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const cases = [["V2-198-92", "L", 240, "deep"], ["V2-165-62", "L", 180, "deep"], ["V2-REF", "L", 180, "deep"], ["V2-190-85", "L", 180, "deep"], ["V2-198-92", "L", 240, "far"], ["V2-198-92", "L", 240, "diag"]];
const met = (o) => { const se = o.series, cl = se.closInc.map(Number), tLo = o.events.tLo; let best = { a: 0 }; for (const r of o.rows) { if (!r.L) continue; r.L.forEach((ax, j) => ax && ax.forEach((x, i) => { if (x && Math.abs(x.tau0) > best.a) best = { a: Math.abs(x.tau0), j, i, x }; })); }
  const seg = (a, b) => cl.reduce((s, v, k) => s + (se.t[k] >= a && se.t[k] < b ? Math.max(0, v) : 0), 0);
  return { cmd: Math.max(...se.cmdMax), dtau0: Math.max(...se.dTau0), clos: Math.max(...cl), sp: cl.reduce((s, v) => s + Math.max(0, v), 0), spHold: seg(tLo + 0.6, 99), spSwing: seg(tLo, tLo + 0.6), fell: o.td2c.fell, legMax: best.a, dom: best.x ? Object.entries({ statics: best.x.statics, d1: best.x.d1, kp: best.x.kp, vff: best.x.vffServo, B: best.x.passiveRef }).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1]))[0] : null }; };
console.log("case | variant | max |τ0| (N·m) | dominant swing-leg term | max |Δτ0| | closure max (J/tick) | Σ+ (J) [swing / hold] | fell");
for (const [b, sd, hz, c] of cases) { const fz = path.join(B, `d1g_PSTAR5CHABG_${c}_${b}_${sd}_${hz}.json.gz`), rows = [["frozen (guard on)", fz]];
  for (const v of ["nod1", "novff", "both"]) rows.push([v, path.join(S, `cf_${v}_${b}_${sd}_${hz}_${c}.json.gz`)]);
  for (const [v, f] of rows) { if (!fs.existsSync(f)) { console.log(`${b} ${sd} ${hz} ${c} | ${v} | missing`); continue; } const m = met(load(f));
    console.log(`${b} ${sd} ${hz} ${c} | ${v.padEnd(17)} | ${m.cmd.toFixed(0).padStart(5)} | ${m.dom ? m.dom[0] + " " + m.dom[1].toFixed(0) : "—"} | ${m.dtau0.toFixed(0)} | ${m.clos.toFixed(4)} | ${m.sp.toFixed(3)} [${m.spSwing.toFixed(3)} / ${m.spHold.toFixed(3)}] | ${m.fell}`); } }

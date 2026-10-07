// POST-HOC COUNTERFACTUALS (diagnostic only; nothing adopted): (1) early-terrain tolerance — the turf higher than planned by 0.5 / 1.0 / 1.5 / 2.0 mm (the frozen early condition is
// 2.80 mm, = the AB baseline); (2) the beyond condition with the escalation continued as a TD2 step (re-target to the planner's turf + h_B, settle, search) instead of E2's T_min drop.
// Per run: first touch relative to the search start, contact phase, potential-contact downward speed and E2-5 foot horizontal speed at t_nc, impact (instantaneous, 100 ms), E1a-7
// violations (whole run), rebounds. Runs from tools/td2_val.mjs (copy with --dz / --esc overrides; evidence counterfactual harness in the scratch).
import fs from "fs"; import zlib from "zlib";
const D = process.argv[2]; const rows = [];
for (const f of fs.readdirSync(D).filter(x => x.endsWith(".json.gz")).sort()) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/" + f))), R = r.rows, se = r.series, dt = 1 / r.hz, W = r.W, T = r.tr.T, tLo = r.events.tLo;
  const rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), nw = r.hz === 240 ? 2 : Math.max(2, Math.ceil(2 * r.hz / 240)), exc = new Set(); se.onset.forEach((o, i) => { if (o) for (let j = 0; j < nw; j++) exc.add(i + j); });
  let viol = 0, worst = 0; se.t.forEach((t, i) => { if (t < 0.5) return; const ra = Math.max(se.dTau0[i] / (30 * rs), se.dTau[i] / ((exc.has(i) ? 25 : 10) * rsA)); worst = Math.max(worst, ra); if (se.dTau[i] > (exc.has(i) ? 25 : 10) * rsA || se.dTau0[i] > 30 * rs) viol++; });
  const t1 = r.t1, i1 = t1 != null ? R.findIndex(x => Math.abs(x.t - t1) < 1e-7) : -1, x0 = i1 > 0 ? R[i1 - 1] : null, win = i1 >= 0 ? R.slice(i1).filter(x => x.t <= t1 + 0.1 + 1e-7) : [];
  const reb = r.trans.filter(q => q.n === r.swing && q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length, tS = tLo + T + r.td2.params.tauD;
  console.log(f.slice(3, -8).padEnd(46), `touch ${t1 != null ? ((t1 - tS) * 1000).toFixed(0) : "—"} ms (${r.td2.tdPhase}) | vN ${x0 ? (x0.pc.vN * 1000).toFixed(1) : "—"} foot-horiz ${x0 ? (Math.hypot(x0.foot.v[0], x0.foot.v[2]) * 1000).toFixed(1) : "—"} mm/s | impact ${win.length ? (100 * Math.max(...win.map(x => x.Fz)) / W).toFixed(1) : "—"} % BW | E1a-7 violations ${viol} (worst ratio ${worst.toFixed(2)}) | rebounds ${reb}`); }

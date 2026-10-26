// occupy3b2/tools/b2_pairs.mjs — one case, tick by tick: the deepest leg pair between the two bodies, both players' legs (planted / swinging →
// landing in …), Stage 3's class and step, 3B.1's events — the anatomy of an overlap episode.   node b2_pairs.mjs --id bf-into --t0 0.6 --t1 1.0
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 as runO3 } from "../b2_run.js";
import { volumesOf, detect, GROUP } from "../../occupy1/o_volumes.js";
const DT = 1 / 240, f3 = (v) => v.toFixed(3), ID = arg("id"), T0 = +arg("t0", 0), T1 = +arg("t1", 9), MODE = arg("mode", "S3B"), EVERY = +arg("every", 2);
const tc = setOf("l3").find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID) || setOf("moves").find((x) => x.id === ID); const rows = [];
const legs = (p, t) => ["R", "L"].map((X) => { const L = p.plan.stances[X], now = L.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = L.find((q) => q.t0 > t + 1e-9); const rec = (q) => (q && /recovery/.test(q.kind || "") ? "ʳ" : "");
  return now ? `${X}:PL${rec(now)}` : nx ? `${X}:→${((nx.t0 - t) * 1000).toFixed(0)}ms${rec(nx)}` : `${X}:air`; }).join(" ");
const R = runO3(ENV, tc, MODE, { record: true, onTick: (W) => { const t = W.att.t, LP = W.livePoses(); const P = detect(volumesOf(LP.a.J), volumesOf(LP.d.J), { within: 0 }).filter((x) => x.both && !(GROUP[x.A] === "TRUNK" && GROUP[x.B] === "TRUNK")).sort((a, b) => b.pen - a.pen);
  const s3 = (p) => { const s = W.ps && W.ps.get(p); return s && s.active ? `${s.cls}${s.step && !s.step.landed ? ` step ${s.step.X} ${s.step.kind} @${f3(s.step.tLand - t)}s` : ""}` : "—"; };
  rows.push({ t, pen: P.length ? P[0].pen : 0, pair: P.length ? `${P[0].A}×${P[0].B}` : "", a: legs(W.att, t), d: legs(W.def, t), ca: W.committed(W.att, t) || "", cd: W.committed(W.def, t) || "", sa: s3(W.att), sd: s3(W.def), q: W.legs ? [W.att, W.def].map((p) => ["R", "L"].map((X) => (W.legs.get(p)[X].dAnk * 100).toFixed(0)).join("/")).join(" ") : "" }); } });
const ev = (R.W.imp ? R.W.imp.events : []).concat(R.W.l3 ? R.W.l3.events : []).sort((a, b) => a.t - b.t);
console.log(`${ID} — ${MODE}, times relative to ${R.t0.toFixed(3)}`); let i = 0;
for (const r of rows) { const tr = r.t - R.t0; if (tr < T0 || tr > T1) continue; if (i++ % EVERY) continue;
  console.log(`${tr.toFixed(3)} ${(r.pen * 100).toFixed(1).padStart(5)} ${r.pair.padEnd(16)} ATT[${r.a}] ${r.ca.slice(0, 10).padEnd(10)} ${r.sa.slice(0, 48).padEnd(48)} DEF[${r.d}] ${r.cd.slice(0, 8).padEnd(8)} ${r.sd.slice(0, 48).padEnd(48)} q ${r.q}`); }
console.log("EVENTS:"); for (const e of ev) { const tr = e.t - R.t0; if (tr < T0 - 0.1 || tr > T1) continue; console.log(`  ${tr.toFixed(3)} ${e.who} ${e.kind}: ${String(e.why).slice(0, 170)}`); }

// possess1/tools/p_trace.mjs — one case, OLD beside the shared modes, as an EVENT TRACE from the tackle contact: every re-plan of each player
// (its tick, its reason, the plan adopted), every ball contact (who, what, blind or not, physically hit or missed), every perception, every
// authority transition and denied claim, the ball-on / ball-off switches.   node p_trace.mjs --case carry-jog-l [--modes OLD,MEDIUM] [--until 1.2]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { PCASES } from "../p_cases.js";
import { runMode, outcomeOf } from "../p_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const tc = PCASES.find((x) => x.id === arg("case", "carry-jog-l")), MODES = arg("modes", "OLD,MEDIUM").split(","), UNTIL = +arg("until", 1.2);
console.log(`${tc.id} — ${tc.name}`);
for (const m of MODES) { const R = []; const r = runMode(ENV, tc, m, { before: (W) => { for (const p of [W.att, W.def]) { const f = p.replan.bind(p); p.replan = (reason) => { const b = p.plan, k = p.k; const v = f(reason); if (p.plan !== b) R.push({ k, who: p === W.att ? "ATT" : "DEF", reason, act: p.plan.action.label, stale: !!(p.pc && p.pc.q.length) }); return v; }; } } });
  const W = r.W, A = W.tk.act; if (!A || !A.hits.length) { console.log(`\n${m}: no contact`); continue; } const kC = Math.round(A.hits[0].t / DT), kE = kC + Math.round(UNTIL / DT), ev = [], tt = (k) => `+${((k - kC) * DT).toFixed(3)}`;
  for (const x of R) if (x.k >= kC && x.k <= kE) ev.push([x.k, `${x.who} RE-PLAN "${x.reason}" → ${x.act}${x.stale ? " (on his belief: the contact not yet perceived)" : ""}`]);
  if (W.auth) { for (const c of W.contactLog) if (c.k >= kC && c.k <= kE) ev.push([c.k, `${c.by} ${c.kind.toUpperCase()}${c.role ? " · " + c.role : ""} — the ball ${Math.hypot(...c.vIn).toFixed(1)} → ${Math.hypot(...c.vOut).toFixed(1)} m/s`]);
    for (const p of W.players) { for (const c of p.contacts) if (c.blind && c.k >= kC && c.k <= kE) ev.push([c.k, `${p.pid} TOUCH MADE BLIND (${c.role}): ${c.phys}`]); for (const e of p.pc.log) if (e.perceived >= kC && e.perceived <= kE && e.perceived > e.k) ev.push([e.perceived, `${p.pid} PERCEIVES ${e.type === "poss" ? "the ball → " + e.to : e.by + "'s " + e.kind} (it happened at ${tt(e.k)})`]); }
    for (const e of W.auth.log) { const k = Math.round(e.t / DT); if (k >= kC && k <= kE) ev.push([k, e.to ? `AUTHORITY ${e.from} → ${e.to} — ${e.why}` : `AUTHORITY ${e.note}`]); }
    for (const d of W.auth.denied) if (d.k >= kC && d.k <= kE) ev.push([d.k, `CLAIM DENIED ${d.who}: ${d.why}`]);
    for (const e of W.log) if (e.k >= kC && e.k <= kE) ev.push([e.k, `${e.kind} — ${e.why}`]); }
  else { for (const h of A.hits) { const k = Math.round(h.t / DT); if (k <= kE) ev.push([k, `DEF TACKLE (${h.surface}) — the ball ${Math.hypot(...h.vIn).toFixed(1)} → ${Math.hypot(...h.vOut).toFixed(1)} m/s`]); }
    for (const [p, who] of [[W.att, "ATT"], [W.def, "DEF"]]) { for (const c of p.contacts) if (c.k >= kC && c.k <= kE) ev.push([c.k, `${who} TOUCH ${c.role}${c.missed ? " (MISSED)" : ""}`]); for (const e of (p.poss.log || [])) { const k = Math.round(e.t / DT); if (k >= kC && k <= kE) ev.push([k, `${who}'s OWN POSSESSION MODEL → ${e.to} (${e.why})`]); } }
    for (const e of W.log) { const k = Math.round(e.t / DT); if (k >= kC && k <= kE) ev.push([k, e.kind]); } }
  ev.sort((a, b) => a[0] - b[0]); const o = outcomeOf(W); console.log(`\n── ${m} — ${o.kind}: ${o.why}`); for (const [k, s] of ev) console.log(`  ${tt(k).padStart(7)} s  ${s}`); }

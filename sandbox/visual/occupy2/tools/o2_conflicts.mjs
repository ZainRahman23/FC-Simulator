// occupy2/tools/o2_conflicts.mjs — §4 / §16 / §17 THE COMMITTED-ACTION CONFLICT STUDY: the stress cases one by one, OLD · STAGE 1 · STAGE 2 —
// the deepest torso / leg penetration (the bodies as drawn), the support consistency error (committed stances apart), the largest root
// difference from OLD and where the world placement first differs (from the move's commitment), the move carried to its release, its touches
// denied, the ticks classified UNRESOLVED and why.   node o2_conflicts.mjs [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O2CASES } from "../o2_cases.js";
import { measure } from "./o2_metrics.mjs";
import { runO2 } from "../o2_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DT = 1 / 240, hyp = Math.hypot, cm = (v) => (v * 100).toFixed(1);
const STUDY = [["bf-into", "§16 Body Feint vs a standing defender"], ["bf-exit", "§16 Body Feint, defender on the exit side (tackling)"], ["bf-fake", "§16 Body Feint past a recovering tackle (into the fake side)"], ["in-bf", "§16 Body Feint into a committed tackle"],
  ["croq-close", "§17 Croqueta past a standing defender"], ["croq-early", "§17 Croqueta into a committed tackle (before the transfer)"], ["in-croq", "§17 Croqueta already committed when the tackle meets the ball"], ["both-committed", "§6 / §17 both committed: the tackle into a Croqueta under way (= croq-win)"]];
const out = [];
for (const [id, name] of STUDY) { const tc = O2CASES.find((x) => x.id === id), row = { id, name, modes: {} };
  const R = { OLD: runO2(ENV, tc, "OLD", { record: false }) }; for (const m of ["S1", "S2"]) R[m] = runO2(ENV, tc, m, { record: false });
  const mv = R.OLD.W.att.plans.map((P) => P.action).find((a) => a && a.tCommit != null && /BODY FEINT|CROQUETA/.test(a.label || "") && R.OLD.W.att.planAt(a.tCommit + 1e-6).action === a);
  for (const m of ["OLD", "S1", "S2"]) { const x = measure(ENV, tc, m), W = R[m].W, o = { torso: Math.max(0, ...x.pen4.TRUNK), legs: Math.max(0, ...x.pen4.LEGS), over5: x.hard4.TRUNK + x.hard4.LEGS, sce: Math.max(0, ...[x.pl.ATT, x.pl.DEF].flatMap((p) => p.sce)), sceC: Math.max(0, ...[x.pl.ATT, x.pl.DEF].flatMap((p) => p.sceC)), unresolved: x.unresolved || {} };
    if (m !== "OLD") { let dev = 0, first = null; const O = R.OLD.W, k0 = Math.round(R[m].clip[0] / DT), k1 = Math.round(Math.min(O.t, W.t) / DT);
      for (let k = k0; k <= k1; k++) { const t = k * DT; for (const [a, b] of [[O.att, W.att], [O.def, W.def]]) { const p = a.stateAt(t).P, q = b.stateAt(t).P, d = hyp(p[0] - q[0], p[1] - q[1]); dev = Math.max(dev, d); if (first == null && d > 1e-4) first = t; } }
      o.rootDev = dev; o.firstDiff = first != null && mv ? first - mv.tCommit : null; o.denied = W.occ.events.filter((e) => /BLOCKED/.test(e.kind)).map((e) => `${e.who} ${e.kind === "TACKLE BOOT BLOCKED" ? "boot" : "touch"}${e.held ? " (move held)" : ""}`);
      // (the stage's OWN move of that kind (it may commit at another tick when occupancy acted before): committed when, carried to its release)
      const own = mv && W.att.plans.map((P) => P.action).find((a) => a && a.tCommit != null && a.label === mv.label && W.att.planAt(a.tCommit + 1e-6).action === a);
      if (own) { const P = W.att.planAt(Math.min(own.tRelease, W.t) - DT); o.carried = !!(P.action && P.action.label === own.label && Math.abs((P.action.tCommit || -1) - own.tCommit) < 1e-9); o.commitShift = own.tCommit - mv.tCommit; } else if (mv) { o.carried = null; o.notCommitted = true; } }
    row.modes[m] = o; }
  out.push(row); process.stderr.write("."); }
console.log(`\nTHE COMMITTED-ACTION CONFLICT STUDY — the bodies as drawn; cm`);
console.log(`${"case".padEnd(64)}${"mode".padEnd(5)}${"torso".padStart(7)}${"legs".padStart(7)}${">5cm".padStart(6)}${"SCE ord".padStart(9)}${"SCE com".padStart(9)}${"root vs OLD".padStart(13)}${"differs from".padStart(14)}  carried · denied · unresolved`);
for (const r of out) for (const m of ["OLD", "S1", "S2"]) { const o = r.modes[m];
  console.log(`${(m === "OLD" ? r.name : "").padEnd(64)}${m.padEnd(5)}${cm(o.torso).padStart(7)}${cm(o.legs).padStart(7)}${String(o.over5).padStart(6)}${cm(o.sce).padStart(9)}${cm(o.sceC).padStart(9)}${(o.rootDev != null ? cm(o.rootDev) : "—").padStart(13)}${(o.firstDiff != null ? (o.firstDiff >= 0 ? "+" : "") + o.firstDiff.toFixed(3) + " s" : "—").padStart(14)}  ${o.notCommitted ? "the move NOT COMMITTED" : o.carried == null ? "" : (o.carried ? "carried" : "NOT carried") + (Math.abs(o.commitShift || 0) > 1e-9 ? ` (committed ${o.commitShift > 0 ? "+" : ""}${o.commitShift.toFixed(3)} s vs OLD)` : "")}${o.denied && o.denied.length ? " · " + o.denied.join(", ") : ""}${Object.keys(o.unresolved).length ? " · " + Object.entries(o.unresolved).map(([k, v]) => `${k.replace("UNRESOLVED ", "")} ${v}`).join(", ") : ""}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

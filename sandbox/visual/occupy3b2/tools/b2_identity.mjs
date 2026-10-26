// occupy3b2/tools/b2_identity.mjs — §9 EXACT BEFORE PHYSICAL CONTACT: STAGE 3B.2 against STAGE 2 AS DECIDED (S2D), identical inputs, every tick — both
// roots, the ball, the authority and both posed bodies (every joint): identical to the bit until the first GENUINE contact (3B.1's first contact, a boot
// contact, Stage 3's first impact — whichever first; occupy3b/tools/l3_common.mjs firstContact, unchanged), identical throughout when there is none. And
// STAGE 3B.2 against STAGE 3B.1 (the frozen foundation) until 3B.2 FIRST ACTS (a landing it moved / re-aimed / retimed / routed, a class it changed — no
// clear landing, NO_FEASIBLE —, a boot contact it resolved, a plant it released, a pelvis it held, an action it ended): identical to the bit before.
//   node b2_identity.mjs --set review|matrix|l3|moves|search [--json f]
import { ENV, setOf, arg, live, trace, compare, firstContact, DT } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import fs from "node:fs";
const SET = arg("set", "review"), L = setOf(SET), rows = []; let bad = 0, badB = 0;
// the first tick 3B.2 changed anything
function firstAct(W) { const B = W.b2; if (!B) return Infinity; let k = Infinity; const edit = (d) => d.result && !/^PLACED \(AS WANTED\)|^REPORTED/.test(d.result.kind);
  for (const d of B.decisions) if (edit(d)) k = Math.min(k, d.k); for (const a of W.l3.apps) if (a.boot) k = Math.min(k, a.k); for (const e of B.release) k = Math.min(k, e.k); for (const e of B.pelvis) k = Math.min(k, e.k);
  for (const e of B.events) if (/INTERRUPTED|REPLACED|PROJECT/.test(e.kind)) k = Math.min(k, e.k); for (const z of B.boot) if (z.proj) k = Math.min(k, z.k); return k; }
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const l2 = live(), lb = live(), l2b = live(), R2 = runB2(ENV, tc, "S2D", { record: true, onTick: l2.onTick }), RB = runB2(ENV, tc, "S3B", { record: true, onTick: lb.onTick }), R2B = runB2(ENV, tc, "S3B2", { record: true, onTick: l2b.onTick });
  const T2 = trace(R2, l2.L), TB = trace(RB, lb.L), T2B = trace(R2B, l2b.L), kC = Math.min(firstContact(R2B.W), firstContact(RB.W)), kA = firstAct(R2B.W);
  const pre = compare(T2, T2B, kC), all = compare(T2, T2B), preB = compare(TB, T2B, kA), allB = compare(TB, T2B);
  const ok = pre.maxRoot === 0 && pre.maxJ === 0 && (kC < Infinity || (all.maxRoot === 0 && all.maxJ === 0)), okB = preB.maxRoot === 0 && preB.maxJ === 0 && (kA < Infinity || (allB.maxRoot === 0 && allB.maxJ === 0)); if (!ok) bad++; if (!okB) badB++;
  rows.push({ id: tc.id, contact: kC === Infinity ? null : +(kC * DT - R2B.t0).toFixed(4), act: kA === Infinity ? null : +(kA * DT - R2B.t0).toFixed(4), actBeforeContact: kA < kC, preTicks: pre.n, preRoot: pre.maxRoot, preJ: pre.maxJ, identical: ok, preBTicks: preB.n, identicalB: okB, diverged: allB.first == null ? null : +(allB.first * DT - R2B.t0).toFixed(4) }); process.stderr.write("."); }
console.log(`\n§9 EXACT BEFORE PHYSICAL CONTACT — set ${SET} (${rows.length} encounters), every tick (both roots, the ball, the authority, every joint of both bodies)`);
console.log(`  3B.2 vs STAGE 2 AS DECIDED, identical to the bit up to the first genuine contact (or throughout, none): ${rows.length - bad} / ${rows.length}   (with a contact: ${rows.filter((r) => r.contact != null).length}; none: ${rows.filter((r) => r.contact == null).length})`);
console.log(`  3B.2 vs 3B.1 (the frozen foundation), identical up to 3B.2's first act (or throughout, none): ${rows.length - badB} / ${rows.length}   (3B.2 acted in ${rows.filter((r) => r.act != null).length}; before the first contact in ${rows.filter((r) => r.actBeforeContact).length})`);
for (const r of rows.filter((x) => !x.identical || !x.identicalB)) console.log(`  NOT IDENTICAL: ${r.id} (vs S2D ${r.identical ? "ok" : "differs root " + r.preRoot + " joints " + r.preJ}; vs 3B.1 ${r.identicalB ? "ok" : "differs"})`);
console.log(`${"case".padEnd(28)}${"contact".padStart(9)}${"3B.2 acts".padStart(11)}${"identical (S2D · 3B.1)".padStart(26)}${"3B.1 → 3B.2 from".padStart(18)}`);
for (const r of rows) console.log(`${r.id.slice(0, 27).padEnd(28)}${(r.contact == null ? "—" : r.contact.toFixed(3)).padStart(9)}${(r.act == null ? "—" : r.act.toFixed(3)).padStart(11)}${`${r.identical ? "yes" : "NO"} · ${r.identicalB ? "yes" : "NO"}`.padStart(26)}${(r.diverged == null ? "never" : r.diverged.toFixed(3)).padStart(18)}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));

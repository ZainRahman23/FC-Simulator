// occupy3b/tools/l3_identity.mjs — §18 BEFORE CONTACT: STAGE 3B against STAGE 2 AS DECIDED (S2D), identical inputs, every tick — both roots, the
// ball, the authority and both posed bodies (every joint): identical to the bit until the first GENUINE contact (Stage 3B's first contact
// application or Stage 3's first impact, whichever first — the pose of that tick included), and identical throughout when there is none. Also
// STAGE 3B against OLD STAGE 3 before either's first contact (the hooks change nothing until then), and OLD STAGE 3 on this branch against
// the committed Stage 3 evidence's first-impact tick (the verified base, reproduced).
//   node l3_identity.mjs --set review|matrix|moves|search|l3 [--json f]
import { ENV, runO3, setOf, arg, live, trace, compare, firstContact, DT } from "./l3_common.mjs";
import fs from "node:fs";
const SET = arg("set", "review"), L = setOf(SET), rows = []; let bad = 0, badOld = 0;
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const l2 = live(), l3 = live(), lb = live(), R2 = runO3(ENV, tc, "S2D", { record: true, onTick: l2.onTick }), R3 = runO3(ENV, tc, "S3", { record: true, onTick: l3.onTick }), RB = runO3(ENV, tc, "S3B", { record: true, onTick: lb.onTick });
  const T2 = trace(R2, l2.L), T3 = trace(R3, l3.L), TB = trace(RB, lb.L), kB = firstContact(RB.W), k3 = firstContact(R3.W);
  const pre = compare(T2, TB, kB), all = compare(T2, TB), preOld = compare(T3, TB, Math.min(kB, k3));   // (before the contact tick: that tick's passes move the roots after its pose is drawn)
  const ok = pre.maxRoot === 0 && pre.maxJ === 0 && (kB < Infinity || (all.maxRoot === 0 && all.maxJ === 0)), okOld = preOld.maxRoot === 0 && preOld.maxJ === 0; if (!ok) bad++; if (!okOld) badOld++;
  rows.push({ id: tc.id, contact: kB === Infinity ? null : +(kB * DT - RB.t0).toFixed(4), oldImpact: k3 === Infinity ? null : +(k3 * DT - R3.t0).toFixed(4), preTicks: pre.n, preRoot: pre.maxRoot, preJ: pre.maxJ, identical: ok, identicalOld: okOld,
    after: kB < Infinity ? { root: +all.maxRoot.toFixed(4), J: +all.maxJ.toFixed(4) } : null }); process.stderr.write("."); }
console.log(`\n§18 BEFORE CONTACT — set ${SET} (${rows.length} encounters): STAGE 3B vs STAGE 2 AS DECIDED, every tick (both roots, the ball, the authority, every joint of both bodies)`);
console.log(`  identical to the bit up to the first genuine contact (or throughout, none): ${rows.length - bad} / ${rows.length}   (with a contact: ${rows.filter((r) => r.contact != null).length}; none: ${rows.filter((r) => r.contact == null).length})`);
console.log(`  STAGE 3B vs OLD STAGE 3 up to the first contact of either: identical ${rows.length - badOld} / ${rows.length}`);
for (const r of rows.filter((x) => !x.identical || !x.identicalOld)) console.log(`  NOT IDENTICAL: ${r.id} root ${r.preRoot} joints ${r.preJ} (vs S2D ${r.identical ? "ok" : "differs"}, vs OLD ${r.identicalOld ? "ok" : "differs"})`);
console.log(`${"case".padEnd(30)}${"3B contact".padStart(11)}${"OLD impact".padStart(11)}${"ticks before".padStart(14)}${"identical".padStart(11)}${"after: root / joints cm".padStart(26)}`);
for (const r of rows) console.log(`${r.id.slice(0, 29).padEnd(30)}${(r.contact == null ? "—" : r.contact.toFixed(3)).padStart(11)}${(r.oldImpact == null ? "—" : r.oldImpact.toFixed(3)).padStart(11)}${String(r.preTicks).padStart(14)}${(r.identical && r.identicalOld ? "yes" : "NO").padStart(11)}${(r.after ? `${(r.after.root * 100).toFixed(1)} / ${(r.after.J * 100).toFixed(1)}` : "—").padStart(26)}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));

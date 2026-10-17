// dribble14/tools/d14_diff.mjs — WHY AN OUTCOME CHANGED, DRIBBLE-1.3 → DRIBBLE-1.4 (the owner's DRIBBLE-1.4 §24): for every run of the 384-run matrix
// whose outcome differs (taken / taken cleanly), both cores are re-run with their plan, touch and decision logs and the FIRST CHANGED DECISION is
// found — plans compared in order by content (contact tick, foot, surface, role; a plan installed at another tick but otherwise the same is not a
// change) — and classified from the two decision logs around it:
//   "setup accepted"          — DRIBBLE-1.4 installs a set-up there that DRIBBLE-1.3's envelope rule refused (its setupCheck failed near that tick);
//   "setup rejected"          — DRIBBLE-1.3 installed a set-up there that DRIBBLE-1.4's graded robustness refused;
//   "better release timing"   — a release-now / staged plan released at the earlier, re-timed tick (DRIBBLE-1.4's contact-timed release);
//   "different contact opportunity" — a release plan with another contact tick or foot (DRIBBLE-1.4 evaluates every tick of the release window);
//   "different contact surface" — the same contact tick and foot, another surface;
//   "planner-budget ordering" — another plan where none of the above applies (the search visits candidates in another order or tick: the
//                               validator's own work changes how far each tick's budget reaches);
//   "physical ball state"     — no decision changed before the touches differ (an execution / physical difference);
// and the random draws of the touches common to both runs (same tick, same foot) are compared: the execution error is keyed by (seed, player, tick,
// foot), so an unchanged touch must draw the same error (matched-seed counterfactuals, §25).
// usage: node d14_diff.mjs score13.json score14.json [out.json] [ids]
import fs from "fs"; import { runRef } from "./d14_ref.mjs";
const [fA, fB, outFile, idsA] = process.argv.slice(2), A = JSON.parse(fs.readFileSync(fA, "utf8")).rows, B = JSON.parse(fs.readFileSync(fB, "utf8")).rows;
const key = (r) => r.id + ":" + r.sd, mB = new Map(B.map((r) => [key(r), r])), only = idsA ? new Set(idsA.split(",")) : null;
const cls = (r) => (r.clean ? "clean" : r.taken ? "taken" : "lost"), same = (x, y) => x && y && x.kc === y.kc && x.F === y.F && x.reg === y.reg && x.role === y.role;
const out = [], tally = {};
for (const a of A) { if (a.taken == null) continue; const b = mB.get(key(a)); if (!b || cls(a) === cls(b)) continue; if (only && !only.has(a.id)) continue;
  const R3 = runRef("d13", a.id, a.sd), R4 = runRef("d14", a.id, a.sd), p3 = R3.ref.plans, p4 = R4.ref.plans, L3 = R3.S.decLog || [], L4 = R4.S.decLog || [];
  let i = 0; while (i < Math.max(p3.length, p4.length) && same(p3[i], p4[i])) i++;
  const x = p3[i] || null, y = p4[i] || null, t = Math.min(x ? x.k : Infinity, y ? y.k : Infinity), near = (L, ev) => L.filter((d) => d.ev === ev && d.k >= t - 40 && d.k <= t + 2);
  let why;
  if (!x && !y) why = "physical ball state";
  else if (y && y.role === "setup" && !(x && x.role === "setup") && near(L3, "setupCheck").some((d) => !d.ok)) why = "setup accepted";
  else if (x && x.role === "setup" && !(y && y.role === "setup") && near(L4, "setupCheck").some((d) => !d.ok)) why = "setup rejected";
  else if (y && /now/.test(y.role) && near(L4, "retime").some((d) => d.found && d.to != null && d.tot1 <= d.tot0)) why = "better release timing";
  else if ((x && /now/.test(x.role)) || (y && /now/.test(y.role))) why = x && y && x.kc === y.kc && x.F === y.F && x.reg !== y.reg ? "different contact surface" : "different contact opportunity";
  else if (x && y && x.kc === y.kc && x.F === y.F && x.reg !== y.reg) why = "different contact surface";
  else why = "planner-budget ordering";
  // matched randomness: touches common to both (same tick and foot) must carry the same execution-error draws
  const t3 = new Map(R3.ref.touches.map((T) => [T.k + T.F, T])); let common = 0, sameDraw = 0;
  for (const T of R4.ref.touches) { const U = t3.get(T.k + T.F); if (!U) continue; common++; if (T.err.every((v, j) => Object.is(v, U.err[j]))) sameDraw++; }
  tally[why] = tally[why] || { better: 0, worse: 0 }; const rank = { lost: 0, taken: 1, clean: 2 }, better = rank[cls(b)] > rank[cls(a)]; tally[why][better ? "better" : "worse"]++;
  out.push({ id: a.id, sd: a.sd, d13: cls(a), d14: cls(b), why, firstChange: { tick: t, d13: x, d14: y }, commonTouches: common, sameDraws: sameDraw });
  console.log(`${key(a).padEnd(16)} ${cls(a).padEnd(5)} → ${cls(b).padEnd(5)} ${why.padEnd(30)} @${t} d13 ${x ? x.role + " " + x.F + x.reg[0] + "@" + x.kc : "-"} | d14 ${y ? y.role + " " + y.F + y.reg[0] + "@" + y.kc : "-"} | draws ${sameDraw}/${common}`);
}
console.log("TALLY", JSON.stringify(tally)); if (outFile) fs.writeFileSync(outFile, JSON.stringify({ tally, rows: out }, null, 1));

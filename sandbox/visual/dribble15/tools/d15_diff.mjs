// dribble15/tools/d15_diff.mjs — DRIBBLE-1.4 → DRIBBLE-1.5 ON MATCHED SEEDS (the owner's DRIBBLE-1.5 validation): every run of two 384-run scorecards
// is BETTER (lost → taken → clean moved up), WORSE (moved down), NEUTRAL (the same class, but different play: touches, surfaces or timing differ —
// "different but equivalent") or IDENTICAL (the same touches, surfaces, speeds and timings). For better / worse runs both cores are re-run with their
// plan logs and the FIRST CHANGED DECISION (plans compared in order by contact tick, foot, surface, role) is classified:
//   "release choice: full cut instead of another stage" / "release choice: stage instead of full cut" / "release choice: other" — a release-now plan
//      differs (DRIBBLE-1.5's release search keeps evaluating after its first valid plan);
//   "set-up selection" — a set-up appears or disappears; "cut-at-contact" — a cut / stage released at a current-motion contact;
//   "contact selection" — another contact (tick / foot / surface) of the same kind; "ordering" — otherwise.
// Matched randomness: touches common to both runs (same tick, same foot) must draw identical execution errors (keyed by seed, player, tick, foot).
// usage: node d15_diff.mjs score14.json score15.json [out.json] [ids]
import fs from "fs"; import { runRef } from "./d15_ref.mjs";
const [fA, fB, outFile, idsA] = process.argv.slice(2), A = JSON.parse(fs.readFileSync(fA, "utf8")).rows, B = JSON.parse(fs.readFileSync(fB, "utf8")).rows;
const key = (r) => r.id + ":" + r.sd, mB = new Map(B.map((r) => [key(r), r])), only = idsA ? new Set(idsA.split(",")) : null, rank = { lost: 0, taken: 1, clean: 2 };
const cls = (r) => (r.clean ? "clean" : r.taken ? "taken" : "lost"), sig = (r) => JSON.stringify([r.regions, r.cutSpeeds, r.launches, r.toBall20S, r.toRedirectS, r.end]);
const same = (x, y) => x && y && x.kc === y.kc && x.F === y.F && x.reg === y.reg && x.role === y.role, isRel = (p) => p && /now/.test(p.role);
const out = { tally: { better: 0, worse: 0, neutral: 0, identical: 0 }, causes: {}, rows: [] };
for (const a of A) { if (a.taken == null) continue; if (only && !only.has(a.id)) continue; const b = mB.get(key(a)); if (!b) continue;
  const ca = cls(a), cb = cls(b), kind = rank[cb] > rank[ca] ? "better" : rank[cb] < rank[ca] ? "worse" : sig(a) === sig(b) ? "identical" : "neutral"; out.tally[kind]++;
  if (kind !== "better" && kind !== "worse") continue;
  const R4 = runRef("d14", a.id, a.sd), R5 = runRef("d15", a.id, a.sd), p4 = R4.ref.plans, p5 = R5.ref.plans; let i = 0; while (i < Math.max(p4.length, p5.length) && same(p4[i], p5[i])) i++;
  const x = p4[i] || null, y = p5[i] || null; let why;
  if (x && x.role === "staged-now" && !(y && y.role === "staged-now") && p4.slice(0, i).some((q) => q.role === "staged-now")) why = `no second stage → ${y ? (y.role === "cut-now" ? "full cut" : y.role) : "nothing yet"}`;
  else if (isRel(x) && isRel(y)) why = x.role === "staged-now" && y.role === "cut-now" ? "release choice: full cut instead of another stage" : x.role === "cut-now" && y.role === "staged-now" ? "release choice: stage instead of full cut" : "release choice: other";
  else if ((x && x.role === "setup") !== (y && y.role === "setup")) why = "set-up selection";
  else if ((x && (x.role === "cut" || x.role === "stage")) || (y && (y.role === "cut" || y.role === "stage"))) why = "cut-at-contact";
  else if (isRel(x) || isRel(y)) why = "release choice: other";
  else if (x && y) why = "contact selection"; else why = "ordering";
  const t4 = new Map(R4.ref.touches.map((T) => [T.k + T.F, T])); let common = 0, sameDraw = 0;
  for (const T of R5.ref.touches) { const U = t4.get(T.k + T.F); if (!U) continue; common++; if (T.err.every((v, j) => Object.is(v, U.err[j]))) sameDraw++; }
  const c = out.causes[why] || (out.causes[why] = { better: 0, worse: 0 }); c[kind]++;
  out.rows.push({ id: a.id, sd: a.sd, d14: ca, d15: cb, kind, why, firstChange: { tick: Math.min(x ? x.k : Infinity, y ? y.k : Infinity), d14: x, d15: y }, commonTouches: common, sameDraws: sameDraw });
  console.log(`${key(a).padEnd(16)} ${ca.padEnd(5)} → ${cb.padEnd(5)} ${why.padEnd(48)} d14 ${x ? x.role + " " + x.F + x.reg[0] + "@" + x.kc : "-"} | d15 ${y ? y.role + " " + y.F + y.reg[0] + "@" + y.kc : "-"} | draws ${sameDraw}/${common}`); }
console.log("TALLY", JSON.stringify(out.tally), "CAUSES", JSON.stringify(out.causes)); if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

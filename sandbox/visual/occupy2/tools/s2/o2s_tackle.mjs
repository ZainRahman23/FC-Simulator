// occupy2/tools/s2/ (Stage 1's occupy1/tools/, unchanged, PORTED TO STAGE 2: OCC = OccupancyWorld2) — o_tackle.mjs — §11 / §12 / §13 / §14 STANDING TACKLE V1 AND THE LOOSE-BALL RACES, OLD vs STAGE 2 (MEDIUM; the tackle, POKE,
// the reaction, the authority and the inputs untouched — only occupancy added). The sets: "search" = the exact 1500 runs (100 set-ups × 15
// request times, seed 7) whose 209 committed tackles Shared Possession + Reaction V1 reported · "moves" = Body Feint / Croqueta × the defender
// in front × requests (352 encounters).
//   · the outcome per case, both modes, and every case whose outcome changed — with the occupancy evidence (the boot blocked by the attacker's
//     body; a touch blocked; the OLD race won through a body)
//   · THE RACES (control broken, someone re-established it): each OLD race classified from the bodies as drawn between the break and the
//     establishing touch — LEGITIMATE (never deeper than the contact tolerance), AMBIGUOUS (tolerance … hard limit, or the establishing touch
//     with the leg 2 – 5 cm in the opponent), BODY-PHASED (beyond the hard limit: a player passed through the other, or reached the ball
//     through him) — and what STAGE 2 does with the same case (its own outcome is the counterfactual)
//   node o_tackle.mjs [--set search|moves] [--n 100] [--json f]
import { ENV } from "../../../occupy1/tools/o_env.mjs";
import { DT } from "../../../vocab2/c_sim.js";
import { CASES } from "../../../vocab2/v_cases.js";
import { trialCase } from "../../../tackle1/tools/t_matrix.mjs";
import { runO, outcomeO } from "./o2s_run.mjs";
import { measureRun } from "../../../occupy1/tools/o_measure.mjs";
import { OCC } from "../../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "search"), N = +arg("n", 100);
const KINDS = ["MISS", "CONTACT — ATTACKER RETAINS", "CONTACT — ATTACKER RECOVERS", "CONTACT — DEFENDER RECOVERS", "CONTACT — BALL FREE"], SH = (k) => (k || "—").replace("CONTACT — ", "");
function setOf() { const L = [];
  if (SET === "search") for (let i = 0; i < N; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) L.push(Object.assign({}, t0, { id: `#${i}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)], grp: t0.c.tech === "CARRY" ? "CARRY · " + t0.c.variant : t0.c.tech })); }
  if (SET === "moves") { const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
    for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) L.push({ id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, grp: name, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] }); }
  return L; }
// the race of a run: the break, the establishment, the deepest resolved penetration between them, the establishing touch's leg in the opponent
function race(W, rec) { const A = W.tk.act; if (!A || !A.hits.length) return null; const h = A.hits[0], L = W.auth.log.filter((e) => e.to && e.t >= h.t - 1e-9), brk = L.find((e) => e.to === "FREE"); if (!brk) return null;
  const est = L.find((e) => e.to.startsWith("CONTROLLED") && e.t >= brk.t - 1e-9), k0 = Math.round(brk.t / DT), k1 = est ? Math.round(est.t / DT) : W.k; let deep = -1, where = null;
  for (const x of rec.ticks) { if (x.k < k0 - 12 || x.k > k1 || !x.g) continue; for (const G of ["TRUNK", "LEGS"]) if (x.g[G] && x.g[G].pen > deep) { deep = x.g[G].pen; where = `${x.g[G].A}↔${x.g[G].B} at +${(x.k * DT - h.t).toFixed(2)} s`; } }
  const touch = est ? rec.contacts.find((c) => c.k === Math.round(est.t / DT) && c.by === est.owner) : null;
  const cls = deep > OCC.hard || (touch && touch.verdict === "THROUGH") ? "BODY-PHASED" : deep > OCC.tol || (touch && touch.verdict === "AMBIGUOUS") ? "AMBIGUOUS" : "LEGITIMATE";
  return { winner: est ? est.owner : null, deep, where, touch: touch ? { pen: touch.pen, verdict: touch.verdict, leg: touch.A, body: touch.B } : null, cls }; }
const L = setOf(), T = { OLD: {}, OCC: {} }, rows = [], changes = [], races = { LEGITIMATE: [], AMBIGUOUS: [], "BODY-PHASED": [] }; let committed = 0;
for (const tc of L) { const p = runO(ENV, tc, "OLD", { plain: true, record: false }); if (!p.W.tk.act) continue; committed++;
  const R = {}; for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m), rec = measureRun(ENV, r.W, r.clip), o = outcomeO(r.W); R[m] = { r, rec, o, race: race(r.W, rec) }; T[m][o.kind] = (T[m][o.kind] || 0) + 1; }
  const O = R.OCC.r.W.occ, bootBlocked = O.events.filter((e) => e.kind === "TACKLE BOOT BLOCKED"), touchBlocked = O.events.filter((e) => e.kind === "BALL ACCESS BLOCKED"), oldThrough = R.OLD.rec.contacts.filter((c) => c.verdict === "THROUGH");
  const row = { id: tc.id, grp: tc.grp, OLD: R.OLD.o.kind, OCC: R.OCC.o.kind, estOLD: R.OLD.o.est, estOCC: R.OCC.o.est, dvOLD: R.OLD.o.dv, raceOLD: R.OLD.race, raceOCC: R.OCC.race, bootBlocked: bootBlocked.length, touchBlocked: touchBlocked.map((e) => `${e.who} ${e.what}`), oldThrough: oldThrough.map((c) => `${c.by} ${c.kind} ${c.F} through ${c.B} ${(c.pen * 100).toFixed(0)} cm`), conflicts: O.conflicts, unresolved: O.unresolved || null };
  rows.push(row); if (row.OLD !== row.OCC) changes.push(row); if (R.OLD.race) races[R.OLD.race.cls].push(row);
  if (committed % 20 === 0) process.stderr.write(`${committed} `); }
console.log(`\nSTANDING TACKLE V1 — set "${SET}": ${L.length} runs, ${committed} committed tackles, OLD vs STAGE 2 (MEDIUM, POKE untuned, inputs identical)`);
console.log(`  ${"".padEnd(30)}${"OLD".padStart(12)}${"STAGE 2".padStart(16)}`); for (const k of KINDS) console.log(`  ${k.padEnd(30)}${String(T.OLD[k] || 0).padStart(12)}${String(T.OCC[k] || 0).padStart(16)}`);
console.log(`\nTHE OUTCOMES THAT CHANGED: ${changes.length}`); const why = {};
for (const c of changes) { const w = c.bootBlocked ? "the tackle's boot reached the ball only through the attacker's body (blocked)" : c.raceOLD && c.raceOLD.cls === "BODY-PHASED" ? "the OLD race was won through a body" : c.touchBlocked.length ? "a touch through the opponent's body blocked" : c.raceOLD && c.raceOLD.cls === "AMBIGUOUS" ? "the OLD race was ambiguous (2 – 5 cm)" : "the bodies kept apart changed the race (legitimate in OLD)"; (why[w] || (why[w] = [])).push(c); }
for (const [w, L2] of Object.entries(why)) { console.log(`  ${L2.length} × ${w}`); for (const c of L2.slice(0, 8)) console.log(`      ${c.id.padEnd(22)} ${SH(c.OLD).padEnd(17)} → ${SH(c.OCC).padEnd(17)} ${c.oldThrough.length ? "OLD: " + c.oldThrough[0] : ""}${c.raceOLD ? ` · OLD race ${c.raceOLD.cls} (deepest ${(c.raceOLD.deep * 100).toFixed(0)} cm ${c.raceOLD.where || ""})` : ""}${c.touchBlocked.length ? " · blocked: " + c.touchBlocked.join(", ") : ""}`); }
console.log(`\nTHE LOOSE-BALL RACES IN OLD (control broken by the tackle, then re-established): ${Object.values(races).reduce((a, b) => a + b.length, 0)}`);
for (const [cls, L2] of Object.entries(races)) { const same = L2.filter((c) => c.OLD === c.OCC).length; const by = {}; for (const c of L2) { const kk = `${SH(c.OLD)} → ${SH(c.OCC)}`; by[kk] = (by[kk] || 0) + 1; }
  console.log(`  ${cls.padEnd(12)} ${String(L2.length).padStart(4)} — STAGE 2 keeps the outcome in ${same}, changes it in ${L2.length - same}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}`); }
const occThrough = rows.filter((r) => r.raceOCC && r.raceOCC.cls === "BODY-PHASED"); console.log(`  STAGE 2's own races classified BODY-PHASED: ${occThrough.length}${occThrough.length ? " — " + occThrough.slice(0, 6).map((r) => `${r.id} (${(r.raceOCC.deep * 100).toFixed(0)} cm ${r.raceOCC.where})`).join(" · ") : ""}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, committed, T, rows }, null, 0));

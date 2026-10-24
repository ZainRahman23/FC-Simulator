// occupy2/tools/o2_bodycheck.mjs — §5 / §16 / §17 / §18 / §20 MOTION PRESERVATION, OLD vs STAGE 1 vs STAGE 2 (the bodies as drawn):
//   1. NEVER CANCELLED — every Body Feint / Croqueta committed in OLD: committed at the same tick, the same action still live at its release
//      (a touch blocked by the opponent's body included); every Standing Tackle committed in OLD: committed identically, owns the body as long,
//      the same phases
//   2. EXACT-MATCH TICKS — from the commitment until occupancy first acts on that player (or his own inputs differ): every joint relative to
//      the root and heading identical (≤ 0.1 mm)
//   3. AFTER PHYSICAL CONTACT — from there to the release (the same action live in both runs): the largest local joint difference (trunk ·
//      head and arms · legs), the world root difference, where the world placement first differs from the untouched reference
//   4. PHASE / TIMING — commitment and release ticks, the tackle's phases
//   node o2_bodycheck.mjs --set review|moves|search [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "./o2_metrics.mjs";
import { runO2 } from "../o2_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), RESO = arg("res") ? JSON.parse(arg("res")) : undefined, DT = 1 / 240, hyp = Math.hypot, z = 1e-4;
// (the HAIR joint is left out: it only shows the head's facing, and the canonical motion flips it 150° in one tick (OLD too) — a 1 – 2 tick
// timing shift of that canonical flip reads as 30 cm)
const UPPER = (k) => !/^(thigh|shin|foot|toe)_/.test(k), TRUNK = (k) => /^(root|pelvis|spine|chest)\./.test(k), SKIP = (k) => /^hair\./.test(k);
const local = (J, st) => { const c = Math.cos(st.psi), s = Math.sin(st.psi), o = {}; for (const [k, v] of Object.entries(J)) for (const e of ["j", "t"]) { if (!v || !v[e]) continue; const x = v[e][0] - st.P[0], y = v[e][1] - st.P[1]; o[k + "." + e] = [c * x + s * y, -s * x + c * y, v[e][2]]; } return o; };
// the player's own inputs at a tick: his plan (its start, its reason, its action) and, for the carrier, his ball contacts
const planOf = (p, t) => { const P = p.planAt(t); return [P.action.id, P.action.label, +P.t0.toFixed(6), P.reason].join("|"); };
const touchesOf = (p, t) => p.contacts.filter((c) => c.t <= t + 1e-9).map((c) => `${c.k}${c.missed ? "x" : ""}`).join(",");
// (the root the pose was DRAWN from: a frame is posed before that tick's own correction — the state after it, less that correction)
const preRoot = (W, p, k, key) => { const s = p.stateAt(k * DT), x = W.occOn && W.logK ? W.logK.get(k) : null, d = x ? (key === "a" ? x.dA : x.dD) : [0, 0]; return { P: [s.P[0] - d[0], s.P[1] - d[1]], psi: s.psi }; };
const diffAt = (WO, WC, key, pO, pC, k) => { const a = WO.frames.get(k), b = WC.frames.get(k); if (!a || !b) return null; const sa = preRoot(WO, pO, k, key), sb = preRoot(WC, pC, k, key), la = local(a[key].J, sa), lb = local(b[key].J, sb); let up = 0, trunk = 0, legs = 0;
  for (const j of Object.keys(la)) { if (!lb[j] || SKIP(j)) continue; const d = hyp(la[j][0] - lb[j][0], la[j][1] - lb[j][1], la[j][2] - lb[j][2]); if (TRUNK(j)) trunk = Math.max(trunk, d); if (UPPER(j)) up = Math.max(up, d); else legs = Math.max(legs, d); }
  return { up, trunk, legs, root: hyp(sa.P[0] - sb.P[0], sa.P[1] - sb.P[1]) }; };
const actedOn = (W, k, who) => { const x = W.occOn && W.logK ? W.logK.get(k) : null; if (!x) return false; const d = who === "ATT" ? x.dA : x.dD, w = who === "ATT" ? x.wA : x.wD; return hyp(d[0], d[1]) > 0 || (w || 0) > 0 || (x.foot || []).some((f) => f.who === who); };
const mvOf = (W) => { const out = []; for (const P of W.att.plans) { const a = P.action; if (a && a.tech && a.tCommit != null && /BODY FEINT|CROQUETA/.test(a.label || "") && W.att.planAt(a.tCommit + 1e-6).action === a && !out.some((x) => Math.abs(x.tc - a.tCommit) < 1e-9)) out.push({ tc: a.tCommit, tr: a.tRelease, label: a.label }); } return out; };
const liveMove = (W, t, m) => { const a = W.att.planAt(t).action; return !!(a && a.label === m.label && a.tCommit != null && Math.abs(a.tCommit - m.tc) < 1e-9); };
// one action, one occupancy mode against OLD
// (EXACT: until occupancy first acts on him or his inputs differ · AFTER: occupancy has acted, his inputs still the same — occupancy's own effect
// on the motion · DIVERGED: his inputs differ (a re-plan, a touch that happened in one run only, the ball) — reported apart, not occupancy's
// accommodation but a different action outcome)
function study(WO, WC, key, pO, pC, who, k0, k1, live, inputsDiffer) { const r = { exact: 0, exactEnd: null, exactWhy: null, after: 0, up: 0, trunk: 0, legs: 0, root: 0, rootFirst: null, endWhy: null, preUp: 0, preLegs: 0, div: 0, divWhy: null, divLegs: 0, divUp: 0 };
  let phase = "EXACT"; for (let k = k0; k <= k1; k++) { if (!live(k)) { r.endWhy = "the action no longer live in one run"; break; } const d = diffAt(WO, WC, key, pO, pC, k); if (!d) continue;
    if (r.rootFirst == null && d.root > z) r.rootFirst = k - k0;
    const w = phase === "DIVERGED" ? null : inputsDiffer(k); if (w) { phase = "DIVERGED"; r.divWhy = w; if (r.exactEnd == null) { r.exactEnd = k - k0; r.exactWhy = w; } }
    if (phase === "EXACT") { if (actedOn(WC, k, who)) { phase = "AFTER"; r.exactEnd = k - k0; r.exactWhy = "occupancy acted on him"; } else { r.exact++; r.preUp = Math.max(r.preUp, d.up); r.preLegs = Math.max(r.preLegs, d.legs); continue; } }
    if (phase === "DIVERGED") { r.div++; r.divLegs = Math.max(r.divLegs, d.legs); r.divUp = Math.max(r.divUp, d.up); continue; }
    r.after++; r.up = Math.max(r.up, d.up); r.trunk = Math.max(r.trunk, d.trunk); r.legs = Math.max(r.legs, d.legs); r.root = Math.max(r.root, d.root); r.legsX = Math.max(r.legsX || 0, d.legs - d.root); if (d.legs - d.root > 0.02) r.legsXticks = (r.legsXticks || 0) + 1; }
  return r; }
const L = setOf(SET), out = { moves: [], tackles: [] }; let runs = 0;
for (const tc of L) { if (tc.onlyCommitted) { const p = runO2(ENV, tc, "OLD", { record: false }); if (!p.W.tk.act) continue; } runs++;
  const R = { OLD: runO2(ENV, tc, "OLD"), S1: runO2(ENV, tc, "S1"), S2: runO2(ENV, tc, "S2", { res: RESO }) }, WO = R.OLD.W;
  for (const m of ["S1", "S2"]) { const W = R[m].W; W.logK = new Map(W.occ.log.map((x) => [x.k, x])); }
  // ── THE MOVES ──
  for (const a of mvOf(WO)) { const rec = { id: tc.id, label: a.label, tc: a.tc };
    for (const m of ["S1", "S2"]) { const WC = R[m].W, b = mvOf(WC).find((x) => Math.abs(x.tc - a.tc) < 1e-9 && x.label === a.label), o = (rec[m] = { committed: !!b });
      if (!b) { o.why = mvOf(WC).length ? "committed at another tick" : "not committed"; continue; }
      o.sameRelease = Math.abs(b.tr - a.tr) < 1e-9; o.carriedOLD = liveMove(WO, Math.min(a.tr, WO.t) - DT, a); o.carried = liveMove(WC, Math.min(b.tr, WC.t) - DT, b);
      o.blocked = WC.occ.events.filter((e) => e.kind === "BALL ACCESS BLOCKED" && e.who === "ATT" && e.t >= a.tc - 1e-9 && e.t < b.tr).length; o.held = WC.occ.events.filter((e) => e.kind === "BALL ACCESS BLOCKED" && e.who === "ATT" && e.held && e.t >= a.tc - 1e-9 && e.t < b.tr).length;
      { const s0 = WO.att.stateAt(a.tc), s1 = WC.att.stateAt(a.tc); o.entrySame = hyp(s0.P[0] - s1.P[0], s0.P[1] - s1.P[1]) < 1e-9 && Math.abs(s0.psi - s1.psi) < 1e-9; o.entryRoot = hyp(s0.P[0] - s1.P[0], s0.P[1] - s1.P[1]); }
      const k0 = Math.round(a.tc / DT), k1 = Math.round(Math.min(a.tr, b.tr, WO.t, WC.t) / DT) - 1;
      const differ = (k) => { const t = k * DT; if (planOf(WO.att, t) !== planOf(WC.att, t)) return "his plan differs (a re-plan)"; if (touchesOf(WO.att, t) !== touchesOf(WC.att, t)) return "his ball contacts differ"; return null; };
      Object.assign(o, study(WO, WC, "a", WO.att, WC.att, "ATT", k0, k1, (k) => liveMove(WO, k * DT, a) && liveMove(WC, k * DT, b), differ));
      o.conflicts = WC.occ.log.filter((x) => x.k >= k0 && x.k <= k1 && x.conflict).length; o.unresolved = WC.occ.log.filter((x) => x.k >= k0 && x.k <= k1 && x.unresolved).length; }
    out.moves.push(rec); }
  // ── THE TACKLE ──
  const AO = WO.tk && WO.tk.act; if (AO) { const rec = { id: tc.id, fam: AO.fam };
    for (const m of ["S1", "S2"]) { const WC = R[m].W, AC = WC.tk && WC.tk.act, o = (rec[m] = { committed: !!AC && Math.abs(AO.t0 - AC.t0) < 1e-9 && AO.fam === AC.fam });
      if (!o.committed) { o.why = AC ? `committed at ${AC.t0.toFixed(3)} (${AC.fam}) vs ${AO.t0.toFixed(3)}` : "not committed"; continue; }
      let k1 = Math.round(AO.t0 / DT); while (k1 < Math.min(WO.k, WC.k) && WO.tk.owns((k1 + 1) * DT)) k1++; let k1c = Math.round(AC.t0 / DT); while (k1c < WC.k && WC.tk.owns((k1c + 1) * DT)) k1c++;
      o.sameOwned = k1 === k1c; { const s0 = WO.def.stateAt(AO.t0), s1 = WC.def.stateAt(AO.t0); o.entryRoot = hyp(s0.P[0] - s1.P[0], s0.P[1] - s1.P[1]); o.entrySame = o.entryRoot < 1e-9 && Math.abs(s0.psi - s1.psi) < 1e-9; } o.phasesSame = JSON.stringify(AO.phases || null) === JSON.stringify(AC.phases || null); o.bootBlocked = (AC.occBlocked || []).length; const k0 = Math.round(AO.t0 / DT);
      const differ = (k) => { const t = k * DT, a = WO.trueTrack(t).p, b = WC.trueTrack(t).p, sa = WO.att.stateAt(t), sb = WC.att.stateAt(t); if (hyp(a[0] - b[0], a[1] - b[1]) > 1e-9) return "the ball differs (its boot and look are ball-anchored)"; if (hyp(sa.P[0] - sb.P[0], sa.P[1] - sb.P[1]) > 1e-9) return "the carrier's root differs (the tackle tracks him)"; return null; };
      Object.assign(o, study(WO, WC, "d", WO.def, WC.def, "DEF", k0, Math.min(k1, k1c), (k) => WO.tk.owns(k * DT) && WC.tk.owns(k * DT), differ));
      o.conflicts = WC.occ.log.filter((x) => x.k >= k0 && x.k <= Math.min(k1, k1c) && x.conflict).length; }
    out.tackles.push(rec); }
  for (const m of ["OLD", "S1", "S2"]) R[m].W.frames = null; if (runs % 20 === 0) process.stderr.write(`${runs} `); }
const cm = (v) => (v * 100).toFixed(2), mx = (A, f) => A.reduce((a, x) => Math.max(a, f(x)), 0), cnt = (A, f) => A.filter(f).length;
console.log(`\nMOTION PRESERVATION — set "${SET}", ${runs} encounters (OLD = the untouched reference; every number is STAGE vs OLD)`);
for (const m of ["S1", "S2"]) { const name = m === "S1" ? "STAGE 1" : "STAGE 2", M = out.moves.map((x) => x[m]), C = M.filter((x) => x.committed), E = C.filter((x) => x.entrySame), A = E.filter((x) => x.after > 0), T = out.tackles.map((x) => x[m]), TC = T.filter((x) => x.committed), TA = TC.filter((x) => x.after > 0);
  console.log(`\n${name}`);
  console.log(`  BODY FEINT / CROQUETA: ${M.length} committed in OLD · committed at the same tick ${C.length} · the same release tick ${cnt(C, (x) => x.sameRelease)} · carried to their release: OLD ${cnt(C, (x) => x.carriedOLD)}, ${name} ${cnt(C, (x) => x.carried)} · CANCELLED (carried in OLD, not here) ${cnt(C, (x) => x.carriedOLD && !x.carried)}`);
  console.log(`    own touch BLOCKED by the defender's body inside the move: ${cnt(C, (x) => x.blocked)} moves (${C.reduce((a, x) => a + x.blocked, 0)} touches) · the move carried on through it: ${cnt(C, (x) => x.blocked && x.carried)}`);
  console.log(`    entered from the same state ${E.length} (an earlier contact had moved him: ${C.length - E.length}, root ≤ ${cm(mx(C, (x) => x.entryRoot))} cm)`);
  console.log(`    EXACT-MATCH TICKS from the commitment: ${E.reduce((a, x) => a + x.exact, 0)} — local pose identical (≤ 0.1 mm) in ${cnt(E, (x) => x.preUp < z && x.preLegs < z)} / ${E.length} (largest ${cm(mx(E, (x) => Math.max(x.preUp, x.preLegs)))} cm) · ended by: ${Object.entries(E.filter((x) => x.exactWhy).reduce((o, x) => { o[x.exactWhy] = (o[x.exactWhy] || 0) + 1; return o; }, {})).map(([k, v]) => `${v} × ${k}`).join(" · ") || "—"}`);
  console.log(`    AFTER PHYSICAL CONTACT (${A.length} moves, ${A.reduce((a, x) => a + x.after, 0)} ticks, to the release or the action ending): TRUNK max ${cm(mx(A, (x) => x.trunk))} cm · HEAD/ARMS max ${cm(mx(A, (x) => x.up))} cm · LEGS max ${cm(mx(A, (x) => x.legs))} cm (p50 of the per-move max ${cm([...A.map((x) => x.legs)].sort((a, b) => a - b)[Math.floor(A.length / 2)] || 0)}) · WORLD ROOT max ${cm(mx(A, (x) => x.root))} cm`);
  console.log(`      LEGS beyond the body's own displacement (local leg difference − world root difference: what is not placement): max ${cm(mx(A, (x) => x.legsX || 0))} cm · ticks > 2 cm ${A.reduce((a, x) => a + (x.legsXticks || 0), 0)} of ${A.reduce((a, x) => a + x.after, 0)}
      local pose still identical after contact (≤ 0.1 mm, every joint): ${cnt(A, (x) => x.up < z && x.legs < z)} / ${A.length} · legs within 1 cm ${cnt(A, (x) => x.legs < 0.01)} · within 5 cm ${cnt(A, (x) => x.legs < 0.05)} · both-committed conflict ticks in ${cnt(A, (x) => x.conflicts)} moves`);
  { const V = E.filter((x) => x.div > 0); console.log(`    INPUTS DIVERGED (not occupancy's accommodation — a different action outcome): ${V.length} moves, ${V.reduce((a, x) => a + x.div, 0)} ticks · ${Object.entries(V.reduce((o, x) => { o[x.divWhy] = (o[x.divWhy] || 0) + 1; return o; }, {})).map(([k, v]) => `${v} × ${k}`).join(" · ") || "—"} · legs max ${cm(mx(V, (x) => x.divLegs))} cm`); }
  console.log(`    WORLD PLACEMENT first differs from OLD (ticks after the commitment): ${E.filter((x) => x.rootFirst != null).map((x) => x.rootFirst).join(", ") || "never"} — the first occupancy action at: ${E.filter((x) => x.exactWhy === "occupancy acted on him").map((x) => x.exactEnd).join(", ") || "—"}`);
  console.log(`  STANDING TACKLE: ${T.length} committed in OLD · committed identically ${TC.length} · owns the body as long ${cnt(TC, (x) => x.sameOwned)} · the same phases ${cnt(TC, (x) => x.phasesSame)} · boot through the carrier blocked in ${cnt(TC, (x) => x.bootBlocked)}`);
  console.log(`    entered from the same state ${cnt(TC, (x) => x.entrySame)} (moved before the commitment: ${cnt(TC, (x) => !x.entrySame)}, root ≤ ${cm(mx(TC, (x) => x.entryRoot))} cm — its boot and look are ball-anchored in the world, so its local pose differs by construction)
    EXACT-MATCH TICKS (same entry): ${TC.filter((x) => x.entrySame).reduce((a, x) => a + x.exact, 0)} — local pose identical in ${cnt(TC.filter((x) => x.entrySame), (x) => x.preUp < z && x.preLegs < z)} / ${cnt(TC, (x) => x.entrySame)} · ended by: ${Object.entries(TC.filter((x) => x.exactWhy).reduce((o, x) => { o[x.exactWhy] = (o[x.exactWhy] || 0) + 1; return o; }, {})).map(([k, v]) => `${v} × ${k}`).join(" · ") || "—"}`);
  console.log(`    AFTER (${TA.length} tackles, ${TA.reduce((a, x) => a + x.after, 0)} ticks): TRUNK max ${cm(mx(TA, (x) => x.trunk))} cm · HEAD/ARMS max ${cm(mx(TA, (x) => x.up))} cm · LEGS max ${cm(mx(TA, (x) => x.legs))} cm · WORLD ROOT max ${cm(mx(TA, (x) => x.root))} cm · LEGS beyond the root's displacement max ${cm(mx(TA, (x) => x.legsX || 0))} cm (ticks > 2 cm ${TA.reduce((a, x) => a + (x.legsXticks || 0), 0)}) · local pose identical ${cnt(TA, (x) => x.up < z && x.legs < z)} / ${TA.length}`);
  { const V = TC.filter((x) => x.entrySame && x.div > 0); console.log(`    INPUTS DIVERGED (the ball or the carrier moved: the tackle's boot, look and arms track them): ${V.length} tackles, ${V.reduce((a, x) => a + x.div, 0)} ticks · legs max ${cm(mx(V, (x) => x.divLegs))} cm · head/arms max ${cm(mx(V, (x) => x.divUp))} cm`); }
  for (const [x, w] of out.moves.filter((r) => r[m].committed && r[m].carriedOLD && !r[m].carried).map((r) => [r, r[m]]).slice(0, 6)) console.log(`    ✗ cancelled: ${x.id} ${x.label} (${w.endWhy || "?"})`);
  for (const [x, w] of [...out.moves, ...out.tackles].filter((r) => r[m].committed && r[m].entrySame && (r[m].preUp >= z || r[m].preLegs >= z)).map((r) => [r, r[m]]).slice(0, 6)) console.log(`    ✗ local pose differs before any occupancy action: ${x.id} ${x.label || x.fam} up ${cm(w.preUp)} legs ${cm(w.preLegs)}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, runs, ...out }, null, 0));

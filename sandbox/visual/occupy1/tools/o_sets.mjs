// occupy1/tools/o_sets.mjs — ONE PASS over a case set, OLD vs OCCUPANCY V1 (the bodies as drawn: each tick's live pose), for:
//   §28 PENETRATION STATISTICS — every tick's deepest penetration per group (TORSO/PELVIS = trunk against trunk · LEGS = any resolved pair with a
//       thigh or shin · FEET · ARMS — feet and upper arms are detected, never resolved), the positive depths kept for median / p95 / p99 / max
//   §13 / §14 THE APPROVED MOVES — every Body Feint / Croqueta COMMITTED window (commitment → release) entered at the same tick in both modes:
//       the carrier's LOCAL POSE (every joint relative to his root and heading; upper body and legs apart) and his WORLD ROOT, OLD vs OCCUPANCY;
//       the ticks in the window where occupancy acted on him, the conflicts (both committed)
//   §31 TACKLE BODY — every committed Standing Tackle entered at the same tick in both modes: the defender's LOCAL POSE and WORLD ROOT while the
//       tackle owns his body, reported apart
//   THE BALL — the first tick the ball differs, and what came first (a touch / boot blocked, a contact made at another tick, a body correction)
//   node o_sets.mjs --set review|search|moves [--json f]
import { ENV } from "./o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { CASES } from "../../vocab2/v_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { measureRun } from "./o_measure.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), hyp = Math.hypot;
function setOf() { const L = [];
  if (SET === "review") return OCASES.slice();
  if (SET === "search") for (let i = 0; i < 100; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) L.push(Object.assign({}, t0, { id: `#${i}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)], onlyCommitted: true })); }
  if (SET === "moves") { const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
    for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) L.push({ id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] }); }
  return L; }
const UPPER = (k) => !/^(thigh|shin|foot|toe)_/.test(k);
// a pose in its root's frame (x forward along psi, y left, z up)
const local = (J, st) => { const c = Math.cos(st.psi), s = Math.sin(st.psi), o = {}; for (const [k, v] of Object.entries(J)) for (const e of ["j", "t"]) { if (!v || !v[e]) continue; const x = v[e][0] - st.P[0], y = v[e][1] - st.P[1]; o[k + "." + e] = [c * x + s * y, -s * x + c * y, v[e][2]]; } return o; };
function poseDiff(FA, FB, key, pA, pB, k0, k1) { let up = 0, legs = 0, root = 0, n = 0; for (let k = k0; k <= k1; k++) { const a = FA.get(k), b = FB.get(k); if (!a || !b) continue; n++; const sa = pA.stateAt(k * DT), sb = pB.stateAt(k * DT);
    root = Math.max(root, hyp(sa.P[0] - sb.P[0], sa.P[1] - sb.P[1])); const la = local(a[key].J, sa), lb = local(b[key].J, sb); for (const j of Object.keys(la)) { if (!lb[j]) continue; const d = hyp(la[j][0] - lb[j][0], la[j][1] - lb[j][1], la[j][2] - lb[j][2]); if (UPPER(j)) up = Math.max(up, d); else legs = Math.max(legs, d); } }
  return { n, up, legs, root }; }
const L = setOf(), G = ["TRUNK", "LEGS", "FEET", "ARMS"], PEN = { OLD: {}, OCC: {} }, HARD = { OLD: {}, OCC: {} }; for (const m of ["OLD", "OCC"]) for (const g of G) { PEN[m][g] = []; HARD[m][g] = 0; }
const moves = [], tackles = [], ball = []; let runs = 0;
for (const tc of L) { if (tc.onlyCommitted) { const p = runO(ENV, tc, "OLD", { plain: true, record: false }); if (!p.W.tk.act) continue; } runs++;
  const R = {}; for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m), rec = measureRun(ENV, r.W, r.clip); R[m] = r;
    for (const x of rec.ticks) { if (!x.g) continue; for (const g of G) if (x.g[g] && x.g[g].pen > 0) { PEN[m][g].push(+x.g[g].pen.toFixed(4)); if (x.g[g].pen > 0.05) HARD[m][g]++; } } }
  const WO = R.OLD.W, WC = R.OCC.W, O = WC.occ;
  // ── the carrier's move window (the same technique, committed at the same tick in both modes)
  const mv = (W) => { const out = []; for (const P of W.att.plans) { const a = P.action; if (a && a.tech && a.tCommit != null && /BODY FEINT|CROQUETA/.test(a.label || "") && !out.some((x) => Math.abs(x.tc - a.tCommit) < 1e-9)) out.push({ tc: a.tCommit, tr: a.tRelease, label: a.label }); } return out; };
  const mO = mv(WO), mC = mv(WC);
  for (const a of mO) { const b = mC.find((x) => Math.abs(x.tc - a.tc) < 1e-9 && x.label === a.label); if (!b) { moves.push({ id: tc.id, label: a.label, same: false, why: mC.length ? "entered at another tick / another technique under occupancy" : "not entered under occupancy" }); continue; }
    const k0 = Math.round(a.tc / DT), k1 = Math.round(Math.min(a.tr, b.tr, WO.t, WC.t) / DT), d = poseDiff(WO.frames, WC.frames, "a", WO.att, WC.att, k0, k1), acts = O.log.filter((x) => x.k >= k0 && x.k <= k1 && (hyp(...x.dA) > 0 || x.wA > 0)).length, confl = O.log.filter((x) => x.k >= k0 && x.k <= k1 && x.conflict).length;
    const pre = O.log.filter((x) => x.k < k0 && x.acted).length; moves.push({ id: tc.id, label: a.label, same: true, n: d.n, up: d.up, legs: d.legs, root: d.root, actsInWindow: acts, conflicts: confl, actedBefore: pre }); }
  // ── the tackle (the same family committed at the same tick in both modes)
  const AO = WO.tk && WO.tk.act, AC = WC.tk && WC.tk.act;
  if (AO) { if (!AC || Math.abs(AO.t0 - AC.t0) > 1e-9 || AO.fam !== AC.fam) tackles.push({ id: tc.id, same: false, why: AC ? `committed at ${AC.t0.toFixed(3)} (${AC.fam}) vs ${AO.t0.toFixed(3)} (${AO.fam})` : "not committed under occupancy" });
    else { let k1 = Math.round(AO.t0 / DT); while (k1 < WO.k && WO.tk.owns((k1 + 1) * DT) && WC.tk.owns((k1 + 1) * DT)) k1++; const k0 = Math.round(AO.t0 / DT), d = poseDiff(WO.frames, WC.frames, "d", WO.def, WC.def, k0, k1);
      const acts = O.log.filter((x) => x.k >= k0 && x.k <= k1 && (hyp(...x.dD) > 0 || x.wD > 0)).length, confl = O.log.filter((x) => x.k >= k0 && x.k <= k1 && x.conflict).length, pre = O.log.filter((x) => x.k < k0 && x.acted).length;
      tackles.push({ id: tc.id, same: true, fam: AO.fam, n: d.n, up: d.up, legs: d.legs, root: d.root, actsInWindow: acts, conflicts: confl, actedBefore: pre, bootBlocked: O.events.filter((e) => e.kind === "TACKLE BOOT BLOCKED").length }); } }
  // ── the ball: the first tick it differs, and what happened first
  let kb = null; for (let k = 0; k <= Math.min(WO.k, WC.k); k++) { const a = WO.trueTrack(k * DT).p, b = WC.trueTrack(k * DT).p; if (hyp(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)) > 1e-9) { kb = k; break; } }
  if (kb != null) { const blk = O.events.find((e) => /BLOCKED/.test(e.kind)), cO = WO.contactLog.map((c) => `${c.k}${c.by}${c.kind}`), cC = WC.contactLog.map((c) => `${c.k}${c.by}${c.kind}`), cd = cO.findIndex((x, i) => x !== cC[i]), firstAct = O.log.find((x) => x.acted);
    const why = blk && blk.k <= kb ? `a ${blk.kind.toLowerCase()} (${blk.who} ${blk.what})` : cd >= 0 ? `a ball contact made differently (OLD ${cO[cd] || "—"} vs OCC ${cC[cd] || "—"}) after the bodies were kept apart` : "the ball under a carrier whose path occupancy corrected";
    ball.push({ id: tc.id, k: kb, firstAct: firstAct ? firstAct.k : null, beforeAct: firstAct ? kb < firstAct.k : true, why }); }
  WO.frames = null; WC.frames = null; if (runs % 20 === 0) process.stderr.write(`${runs} `); }
const q = (A, p) => { if (!A.length) return 0; const s = Float64Array.from(A).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stat = {}; for (const m of ["OLD", "OCC"]) { stat[m] = {}; for (const g of G) { const A = PEN[m][g]; stat[m][g] = { ticks: A.length, median: q(A, 0.5), p95: q(A, 0.95), p99: q(A, 0.99), max: A.length ? Math.max(...A) : 0, over5: HARD[m][g] }; } }
console.log(`\nSET "${SET}" — ${runs} encounters, OLD vs OCCUPANCY V1 (the bodies as drawn)`);
console.log(`PENETRATION (cm; the ticks with a positive penetration in that group)`); for (const g of G) for (const m of ["OLD", "OCC"]) { const s = stat[m][g]; console.log(`  ${g.padEnd(6)} ${m.padEnd(4)} ticks ${String(s.ticks).padStart(7)} · median ${(s.median * 100).toFixed(1).padStart(5)} · p95 ${(s.p95 * 100).toFixed(1).padStart(5)} · p99 ${(s.p99 * 100).toFixed(1).padStart(5)} · max ${(s.max * 100).toFixed(1).padStart(5)} · ticks > 5 cm ${s.over5}`); }
const mS = moves.filter((x) => x.same), tS = tackles.filter((x) => x.same), z = (x) => x.up < 1e-9 && x.legs < 1e-9, cm = (v) => (v * 100).toFixed(2);
console.log(`THE APPROVED MOVES: ${moves.length} committed windows in OLD · entered identically under occupancy ${mS.length} · LOCAL POSE identical (every joint, ≤ 1e-9 m) ${mS.filter(z).length} · WORLD ROOT identical ${mS.filter((x) => x.root < 1e-9).length}`);
console.log(`  local pose differs: ${mS.filter((x) => !z(x)).length} (upper body max ${cm(Math.max(0, ...mS.map((x) => x.up)))} cm, legs max ${cm(Math.max(0, ...mS.map((x) => x.legs)))} cm) — of them with occupancy acting on the carrier in the window ${mS.filter((x) => !z(x) && x.actsInWindow).length}, in a conflict ${mS.filter((x) => !z(x) && x.conflicts).length}, after occupancy acted before the commitment ${mS.filter((x) => !z(x) && !x.actsInWindow && x.actedBefore).length}`);
console.log(`  world root differs: ${mS.filter((x) => x.root >= 1e-9).length} (max ${cm(Math.max(0, ...mS.map((x) => x.root)))} cm) · not entered identically: ${moves.filter((x) => !x.same).map((x) => `${x.id} (${x.why})`).slice(0, 6).join(" · ") || "none"}`);
console.log(`TACKLE BODY: ${tackles.length} committed tackles in OLD · committed identically under occupancy ${tS.length} · LOCAL POSE identical ${tS.filter(z).length} · WORLD ROOT identical ${tS.filter((x) => x.root < 1e-9).length}`);
console.log(`  LOCAL POSE DIFFERENCE: ${tS.filter((x) => !z(x)).length} tackles (upper body max ${cm(Math.max(0, ...tS.map((x) => x.up)))} cm, legs max ${cm(Math.max(0, ...tS.map((x) => x.legs)))} cm) — with occupancy acting on the defender in the window ${tS.filter((x) => !z(x) && x.actsInWindow).length}, in a conflict ${tS.filter((x) => !z(x) && x.conflicts).length}, after occupancy acted before the commitment ${tS.filter((x) => !z(x) && !x.actsInWindow && x.actedBefore).length}`);
console.log(`  WORLD ROOT DIFFERENCE: ${tS.filter((x) => x.root >= 1e-9).length} tackles (max ${cm(Math.max(0, ...tS.map((x) => x.root)))} cm) · not committed identically: ${tackles.filter((x) => !x.same).length}${tackles.filter((x) => !x.same).slice(0, 4).map((x) => ` · ${x.id} (${x.why})`).join("")}`);
const bw = {}; for (const b of ball) bw[b.why.replace(/\(.*\)/, "(…)")] = (bw[b.why.replace(/\(.*\)/, "(…)")] || 0) + 1;
console.log(`THE BALL: identical for the whole run in ${runs - ball.length} / ${runs} · differs in ${ball.length} — before occupancy's first action ${ball.filter((b) => b.beforeAct).length} · first cause: ${JSON.stringify(bw)}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, runs, stat, moves, tackles, ball }, null, 0));

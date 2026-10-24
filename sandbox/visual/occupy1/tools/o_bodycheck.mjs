// occupy1/tools/o_bodycheck.mjs — §6 / §7 / §13 / §14 / §31 THE APPROVED ACTIONS UNDER OCCUPANCY, OLD vs OCCUPANCY V1 (the bodies as drawn):
//   1. NEVER CANCELLED — every Body Feint / Croqueta committed in OLD is committed at the same tick under occupancy and is still the carrier's
//      action at its release; every Standing Tackle committed in OLD is committed identically and owns the defender's body as long
//   2. THE LOCAL MOTION — each joint relative to the player's root and heading, OLD vs OCCUPANCY, from the commitment until the first tick the two
//      runs' INPUTS TO THAT ACTION differ: for a move, the carrier's own decisions (his plan, its reason, his ball contacts — a touch blocked by
//      the opponent's body is one); for a tackle, the ball and the carrier it is aimed at (its boot and its look are ball-anchored). Before that
//      tick the local motion must be identical — except the legs over a PLANTED foot when occupancy moved the root (the foot does not slide; the
//      knee takes the shift): reported apart, with the root correction made within the stance
//   3. THE WORLD ROOT — reported apart: occupancy moves it, never the joints
//   node o_bodycheck.mjs --set review|moves|search [--json f]
import { ENV } from "./o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { CASES } from "../../vocab2/v_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), hyp = Math.hypot;
function setOf() { const L = []; if (SET === "review") return OCASES.slice();
  if (SET === "search") for (let i = 0; i < 100; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) L.push(Object.assign({}, t0, { id: `#${i}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)], onlyCommitted: true })); }
  if (SET === "moves") { const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
    for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) L.push({ id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] }); }
  return L; }
const UPPER = (k) => !/^(thigh|shin|foot|toe)_/.test(k), TRUNK = (k) => /^(root|pelvis|spine|chest)\./.test(k);
const local = (J, st) => { const c = Math.cos(st.psi), s = Math.sin(st.psi), o = {}; for (const [k, v] of Object.entries(J)) for (const e of ["j", "t"]) { if (!v || !v[e]) continue; const x = v[e][0] - st.P[0], y = v[e][1] - st.P[1]; o[k + "." + e] = [c * x + s * y, -s * x + c * y, v[e][2]]; } return o; };
// the carrier's decisions at a tick (his plan, its start, its reason, his ball contacts) — and the ball
const decOf = (W, t) => { const P = W.att.planAt(t); return [P.action.id, P.action.label, +P.t0.toFixed(6), P.reason, W.att.contacts.filter((c) => c.t <= t + 1e-9).map((c) => `${c.k}${c.missed ? "x" : ""}`).join(",")].join("|"); };
const ballAt = (W, t) => W.trueTrack(t).p;
function compare(WO, WC, key, p0, p1, k0, k1, stopAt) { let up = 0, trunk = 0, legs = 0, root = 0, n = 0, kStop = null, why = null;
  for (let k = k0; k <= k1; k++) { const s = stopAt(k); if (s) { kStop = k; why = s; break; } const a = WO.frames.get(k), b = WC.frames.get(k); if (!a || !b) continue; n++; const t = k * DT, sa0 = p0.stateAt(t), sb0 = p1.stateAt(t);
    // (the root the pose was DRAWN from — a frame is posed before that tick's own correction: the state after it, less that correction)
    const pre = (W, s) => { const x = W.occ && W.occOn ? W.occLogK && W.occLogK.get(k) : null; const d = x ? (key === "a" ? x.dA : x.dD) : [0, 0]; return { P: [s.P[0] - d[0], s.P[1] - d[1]], psi: s.psi }; };
    const sa = pre(WO, sa0), sb = pre(WC, sb0);
    root = Math.max(root, hyp(sa.P[0] - sb.P[0], sa.P[1] - sb.P[1])); const la = local(a[key].J, sa), lb = local(b[key].J, sb);
    for (const j of Object.keys(la)) { if (!lb[j]) continue; const d = hyp(la[j][0] - lb[j][0], la[j][1] - lb[j][1], la[j][2] - lb[j][2]); if (TRUNK(j)) trunk = Math.max(trunk, d); if (UPPER(j)) up = Math.max(up, d); else legs = Math.max(legs, d); } }
  return { n, up, trunk, legs, root, kStop, why }; }
const L = setOf(), moves = [], tackles = []; let runs = 0;
for (const tc of L) { if (tc.onlyCommitted) { const p = runO(ENV, tc, "OLD", { plain: true, record: false }); if (!p.W.tk.act) continue; } runs++;
  const RO = runO(ENV, tc, "OLD"), RC = runO(ENV, tc, "OCC"), WO = RO.W, WC = RC.W, O = WC.occ; WC.occLogK = new Map(O.log.map((x) => [x.k, x]));
  // ── THE MOVES ──
  // (a move counts only if its plan was LIVE at its commitment — a candidate plan superseded before it began is not a move made)
  const mv = (W) => { const out = []; for (const P of W.att.plans) { const a = P.action; if (a && a.tech && a.tCommit != null && /BODY FEINT|CROQUETA/.test(a.label || "") && W.att.planAt(a.tCommit + 1e-6).action === a && !out.some((x) => Math.abs(x.tc - a.tCommit) < 1e-9)) out.push({ tc: a.tCommit, tr: a.tRelease, label: a.label, id: a.id }); } return out; };
  const carried = (W, a) => { const P = W.att.planAt(Math.min(a.tr, W.t) - DT); return !!(P.action && P.action.label === a.label && Math.abs((P.action.tCommit || -1) - a.tc) < 1e-9); };
  for (const a of mv(WO)) { const b = mv(WC).find((x) => Math.abs(x.tc - a.tc) < 1e-9 && x.label === a.label); const rec = { id: tc.id, label: a.label, committed: !!b };
    if (!b) { rec.why = mv(WC).length ? "committed at another tick" : "not committed under occupancy"; moves.push(rec); continue; }
    rec.carriedToRelease = carried(WC, b); rec.carriedOLD = carried(WO, a); rec.releaseO = a.tr; rec.releaseC = b.tr;
    { const s0 = WO.att.stateAt(a.tc), s1 = WC.att.stateAt(a.tc); rec.entrySame = hyp(s0.P[0] - s1.P[0], s0.P[1] - s1.P[1]) < 1e-9 && Math.abs(s0.psi - s1.psi) < 1e-9; }
    const k0 = Math.round(a.tc / DT), k1 = Math.round(Math.min(a.tr, b.tr, WO.t, WC.t) / DT);
    const stop = (k) => { const t = k * DT, dO = decOf(WO, t), dC = decOf(WC, t); if (dO === dC) return null; const blk = O.events.find((e) => e.kind === "BALL ACCESS BLOCKED" && e.who === "ATT" && e.k <= k); return blk ? `his touch BLOCKED by the defender's body at +${((blk.k - k0) * DT).toFixed(3)} s → a re-plan` : `his decisions differ: ${dO.split("|").slice(1, 4).join(" ")} vs ${dC.split("|").slice(1, 4).join(" ")}`; };
    Object.assign(rec, compare(WO, WC, "a", WO.att, WC.att, k0, k1, stop)); const kE = rec.kStop != null ? rec.kStop : k1;
    rec.acts = O.log.filter((x) => x.k >= k0 && x.k < kE && (hyp(...x.dA) > 0 || x.wA > 0 || (x.foot || []).some((f) => f.who === "ATT"))).length; rec.conflicts = O.log.filter((x) => x.k >= k0 && x.k < kE && x.conflict).length; rec.actedBefore = O.log.some((x) => x.k < k0 && x.acted);
    // (the root correction occupancy made on him while one foot stayed planted, within the compared span)
    let stanceMax = 0; const acc = new Map(); for (const x of O.log) { if (x.k < k0 || x.k >= kE || !(x.dA[0] || x.dA[1])) continue; const P = WC.att.planAt(x.t); for (const X of ["R", "L"]) { const s = P.stances[X].find((q) => q.t0 <= x.t + 1e-9 && q.t1 > x.t + 1e-9); if (!s) continue; const kk = X + s.id + "@" + s.t0.toFixed(4), v = acc.get(kk) || [0, 0]; v[0] += x.dA[0]; v[1] += x.dA[1]; acc.set(kk, v); stanceMax = Math.max(stanceMax, hyp(v[0], v[1])); } }
    rec.stanceCorr = stanceMax; moves.push(rec); }
  // ── THE TACKLE ──
  const AO = WO.tk && WO.tk.act, AC = WC.tk && WC.tk.act;
  if (AO) { const rec = { id: tc.id, fam: AO.fam, committed: !!AC && Math.abs(AO.t0 - AC.t0) < 1e-9 && AO.fam === AC.fam }; if (!rec.committed) { rec.why = AC ? `committed at ${AC.t0.toFixed(3)} (${AC.fam}) vs ${AO.t0.toFixed(3)} — the bodies were kept apart before` : "not committed"; tackles.push(rec); }
    else { let k1 = Math.round(AO.t0 / DT); while (k1 < Math.min(WO.k, WC.k) && WO.tk.owns((k1 + 1) * DT)) k1++; let k1c = Math.round(AC.t0 / DT); while (k1c < WC.k && WC.tk.owns((k1c + 1) * DT)) k1c++; rec.ownedO = (k1 - Math.round(AO.t0 / DT)) * DT; rec.ownedC = (k1c - Math.round(AC.t0 / DT)) * DT;
      rec.phasesSame = JSON.stringify(AO.phases || null) === JSON.stringify(AC.phases || null); const k0 = Math.round(AO.t0 / DT);
      const stop = (k) => { const t = k * DT, a = ballAt(WO, t), b = ballAt(WC, t), sa = WO.att.stateAt(t), sb = WC.att.stateAt(t); if (hyp(a[0] - b[0], a[1] - b[1]) > 1e-9) return "the ball differs (its boot and look are ball-anchored)"; if (hyp(sa.P[0] - sb.P[0], sa.P[1] - sb.P[1]) > 1e-9) return "the carrier's root differs (occupancy kept him clear)"; return null; };
      Object.assign(rec, compare(WO, WC, "d", WO.def, WC.def, k0, Math.min(k1, k1c), stop)); const kE = rec.kStop != null ? rec.kStop : Math.min(k1, k1c);
      rec.acts = O.log.filter((x) => x.k >= k0 && x.k < kE && (hyp(...x.dD) > 0 || x.wD > 0 || (x.foot || []).some((f) => f.who === "DEF"))).length; rec.conflicts = O.log.filter((x) => x.k >= k0 && x.k <= Math.min(k1, k1c) && x.conflict).length; rec.actedBefore = O.log.some((x) => x.k < k0 && x.acted); tackles.push(rec); } }
  WO.frames = null; WC.frames = null; if (runs % 20 === 0) process.stderr.write(`${runs} `); }
const cm = (v) => (v * 100).toFixed(2), z = 1e-4;   // (identical: every joint within 0.1 mm)
const mC = moves.filter((x) => x.committed), tC = tackles.filter((x) => x.committed);
console.log(`\nTHE APPROVED ACTIONS UNDER OCCUPANCY — set "${SET}", ${runs} encounters`);
const mS = mC.filter((x) => x.entrySame), mD = mC.filter((x) => !x.entrySame);
console.log(`BODY FEINT / CROQUETA (live at their commitment): ${moves.length} committed in OLD · committed at the same tick under occupancy ${mC.length} · carried to their release: OLD ${mC.filter((x) => x.carriedOLD).length}, OCCUPANCY ${mC.filter((x) => x.carriedToRelease).length}`);
console.log(`  NEVER CANCELLED BY OCCUPANCY (carried in OLD but not under occupancy): ${mC.filter((x) => x.carriedOLD && !x.carriedToRelease).length}${mC.filter((x) => x.carriedOLD && !x.carriedToRelease).map((x) => ` · ${x.id} (${x.why || "?"})`).slice(0, 4).join("")}`);
console.log(`  ENTERED FROM THE SAME STATE (occupancy had not touched the carrier before): ${mS.length} · from a state occupancy had changed (an earlier contact): ${mD.length}`);
console.log(`  compared from the commitment to the first decision that differs (or the release): ${mS.reduce((a, x) => a + x.n, 0)} ticks; ended early in ${mS.filter((x) => x.kStop != null).length} — ${Object.entries(mS.filter((x) => x.why).reduce((o, x) => { const w = x.why.replace(/ at \+[\d.]+ s/, "").replace(/: .*/, ""); o[w] = (o[w] || 0) + 1; return o; }, {})).map(([k, v]) => `${v} × ${k}`).join(" · ") || "—"}`);
console.log(`  of those: occupancy never moved him in the span ${mS.filter((x) => !x.acts).length} — LOCAL POSE identical (every joint, ≤ 0.1 mm) ${mS.filter((x) => !x.acts && x.up < z && x.legs < z).length} / ${mS.filter((x) => !x.acts).length}`);
console.log(`            occupancy moved his root in the span (${mS.filter((x) => x.acts).length}; conflicts ${mS.filter((x) => x.acts && x.conflicts).length}): TRUNK (pelvis, spine, chest) max ${cm(Math.max(0, ...mS.filter((x) => x.acts).map((x) => x.trunk)))} cm · HEAD / ARMS max ${cm(Math.max(0, ...mS.filter((x) => x.acts).map((x) => x.up)))} cm · LEGS max ${cm(Math.max(0, ...mS.filter((x) => x.acts).map((x) => x.legs)))} cm (root correction within one planted stance ≤ ${cm(Math.max(0, ...mS.map((x) => x.stanceCorr)))} cm) · WORLD ROOT max ${cm(Math.max(0, ...mS.map((x) => x.root)))} cm`);
console.log(`STANDING TACKLE: ${tackles.length} committed in OLD · committed identically under occupancy ${tC.length}${tackles.filter((x) => !x.committed).length ? " (not: " + tackles.filter((x) => !x.committed).slice(0, 3).map((x) => `${x.id} ${x.why}`).join("; ") + ")" : ""} · owns the body as long ${tC.filter((x) => Math.abs(x.ownedO - x.ownedC) < 1e-9).length} · the same phases ${tC.filter((x) => x.phasesSame).length}`);
console.log(`  compared from the commitment to the first tick the ball or the carrier differs: ${tC.reduce((a, x) => a + x.n, 0)} ticks; ended early in ${tC.filter((x) => x.kStop != null).length} (${Object.entries(tC.filter((x) => x.why).reduce((o, x) => { o[x.why] = (o[x.why] || 0) + 1; return o; }, {})).map(([k, v]) => `${v} × ${k}`).join(" · ") || "—"})`);
console.log(`  LOCAL POSE DIFFERENCE (every joint relative to the root): upper body identical (≤ 0.1 mm) in ${tC.filter((x) => x.up < z).length} / ${tC.length} (max ${cm(Math.max(0, ...tC.map((x) => x.up)))} cm) · legs identical in ${tC.filter((x) => x.legs < z).length} / ${tC.length} (max ${cm(Math.max(0, ...tC.map((x) => x.legs)))} cm; where they differ occupancy moved his root: ${tC.filter((x) => x.legs >= z && x.acts).length} of ${tC.filter((x) => x.legs >= z).length})`);
console.log(`  WORLD ROOT DIFFERENCE: identical in ${tC.filter((x) => x.root < z).length} / ${tC.length} · max ${cm(Math.max(0, ...tC.map((x) => x.root)))} cm · conflicts in ${tC.filter((x) => x.conflicts).length}`);
for (const x of [...mS, ...tC].filter((x) => !x.acts && (x.up >= z || x.legs >= z)).slice(0, 8)) console.log(`  ✗ local pose differs with no occupancy action in the span: ${x.id} ${x.label || x.fam} up ${cm(x.up)} cm, legs ${cm(x.legs)} cm`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, runs, moves, tackles }, null, 0));

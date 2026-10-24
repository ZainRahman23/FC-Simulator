// possess1/tools/p_moves_body.mjs — §21 / §15 THE APPROVED MOVES UNDER THE NEW ARCHITECTURE. Every tackle contact made while a Body Feint or a
// Croqueta is COMMITTED (the moves set: the curated cases verbatim × the defender ahead 2.4 – 4.2 m, ±0.5 / ±1.0 m × requests 0 … 1.0 s), against
// the same encounter WITHOUT the contact (the boot never presented to the ball):
//   1. THE BODY AS DRAWN LIVE (PlayBody posed at each tick as it is simulated — the game's drawing; a replay posed afterwards also draws a
//      swing with the landing a LATER re-plan revised, so after-the-fact poses mix in decisions made after the tick): identical through the
//      reaction interval, every joint
//   2. THE MOVE'S OWN MOTION (the root path and the pelvis heading — the technique's authored keys) from the contact to the move's release:
//      identical, or where it first differs (and whether that is before or after the carrier perceives the contact)
//   OLD for comparison (the carrier re-plans in the contact tick).   node p_moves_body.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { CASES } from "../../vocab2/v_cases.js";
import { PlayBody } from "../../vocab2/u_body.js";
import { runMode } from "../p_run.js";
import { MODES as RT } from "../p_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
// a run with the attacker's body posed LIVE from the tackle's commitment (pose at the tick just simulated) and his root path recorded
function live(tc, m, cf) { const J = new Map(), Rt = new Map(), Ac = new Map(); let B = null;
  const r = runMode(ENV, tc, m, { before: (W) => { B = new PlayBody(ENV, W.att); if (cf) W.tk.probes = () => {}; }, onTick: (W) => { const k = W.k; if (!W.tk.act || k > Math.round(W.tk.act.t0 / DT) + 480) return; const t = k * DT; J.set(k, B.pose(t).J); const s = W.att.stateAt(t, W.att.plan); Rt.set(k, [s.P[0], s.P[1], s.psi]); Ac.set(k, W.att.plan.action.tech || W.att.plan.action.label); } });
  return { r, J, Rt, Ac }; }
const jd = (a, b) => { let d = 0; for (const j of Object.keys(a)) for (const e of ["j", "t"]) { const u = a[j][e], v = b[j][e]; if (u && v) d = Math.max(d, Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2])); } return d; };
const S = {}, rows = [];
for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) { const tc = { id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] };
  const probe = runMode(ENV, tc, "NONE"), A = probe.W.tk.act; if (!A || !A.hits.length) continue; const kC = Math.round(A.hits[0].t / DT), act = probe.W.att.planAt(kC * DT).action; if (!act.tech || !(act.tRelease > kC * DT)) continue;
  const state = act.tCommit <= kC * DT + 1e-9 ? "COMMITTED" : "PLANNED, NOT YET COMMITTED";
  const CF = live(tc, "MEDIUM", true), kR = Math.round(act.tRelease / DT);
  for (const m of ["OLD", "SHORT", "MEDIUM", "LONG"]) { const R = live(tc, m, false), n = m === "OLD" ? 0 : Math.round(RT[m] / DT), key = `${name} (${state}) · ${m}`, X = S[key] || (S[key] = { n: 0, bodySame: 0, bodyChecked: 0, moveSame: 0, before: 0, after: 0, firstAfter: [], kept: 0 }); X.n++;
    // (did the move go on to its release, or was it given up for another action?)
    { let kept = true; for (let k = kC; k <= kR; k++) { const a = R.Ac.get(k); if (a != null && a !== act.tech) { kept = false; break; } } if (kept) X.kept++; }
    // 1. the live-drawn body through the reaction interval
    if (n > 0) { X.bodyChecked++; let w = 0; for (let k = kC; k < kC + n; k++) { const a = R.J.get(k), b = CF.J.get(k); if (a && b) w = Math.max(w, jd(a, b)); } if (w === 0) X.bodySame++; }
    // 2. the move's motion (root, pelvis) from the contact to its release
    let first = null; for (let k = kC; k <= kR; k++) { const a = R.Rt.get(k), b = CF.Rt.get(k); if (a && b && (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2])) { first = k; break; } }
    if (first == null) X.moveSame++; else if (first - kC < n) X.before++; else { X.after++; X.firstAfter.push(+((first - kC) * DT).toFixed(3)); }
    rows.push({ id: tc.id, mode: m, move: act.label, release: +((kR - kC) * DT).toFixed(3), perceive: +(n * DT).toFixed(3), moveFirstDiff: first == null ? null : +((first - kC) * DT).toFixed(3) }); } process.stderr.write("."); }
console.log(`\nTHE APPROVED MOVES — tackle contacts while a Body Feint / Croqueta is planned or committed, against the same encounter with no contact (OLD: the carrier re-plans in the contact tick)`);
for (const [k, X] of Object.entries(S)) console.log(`  ${k.padEnd(48)} ${String(X.n).padStart(3)} contacts · the live-drawn body through the reaction interval: ${X.bodyChecked ? `${X.bodySame} / ${X.bodyChecked} identical` : "— (re-plans in the contact tick)"} · the move went on to its release ${X.kept} / ${X.n} · its root and pelvis to the release: ${X.moveSame} identical to the no-contact run, ${X.after} first differ ${X.k0 ? "" : "once he perceives"}${X.after ? ` (+${Math.min(...X.firstAfter).toFixed(3)} … +${Math.max(...X.firstAfter).toFixed(3)} s)` : ""}, ${X.before} before`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ S, rows }, null, 1));

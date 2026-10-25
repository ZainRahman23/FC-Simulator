// occupy3b/tools/l3_early.mjs — §18 NO NEW INFORMATION USED BEFORE PERCEPTION with STAGE 3B ON: Stage 2's o2s_early.mjs (occupy2/tools/s2/,
// unchanged; its trials, windows and checks verbatim) with one more classification. With Stage 3B a limb contact inside the perception window is
// PHYSICS acting on the attacker — Stage 3's impulse, its recovery step, an interruption, a touch denied for geometry — and it can change his plan
// before he perceives the tackle exactly as a body blocking the ball does (o2s_early already separates that one). A differing decision (or root)
// is attributed to physics only when, in either run, an impact / limb-contact event on the attacker, or a limb-contact impulse, happens in the
// window AT OR BEFORE the tick where the two runs part; everything else stays a ✗ (would be information).
//   node --import ./two/l3_two_hook.mjs l3_early.mjs [--n 60] [--seed 3]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { trialCase, rng } from "../../tackle1/tools/t_matrix.mjs";
import { runMode } from "../../possess1/p_run.js";
import { MODES as RT } from "../../possess1/p_world.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg("n", 60), seed = +arg("seed", 3), PAT = ["single", "rapid", "stride", "invalid", "rapid", "single"], MODES = ["SHORT", "MEDIUM", "LONG"];
// (the trials exactly as p_torture.mjs makes them)
const mirrorOf = (tc) => Object.assign({}, tc, { id: tc.id + "·M", mirror: true, def: Object.assign({}, tc.def, { at: [tc.def.at[0], -tc.def.at[1]], face: -tc.def.face, pref: tc.def.pref === "L" ? "R" : "L", stick: (tc.def.stick || []).map(([t, a, m]) => [t, a == null ? null : -a, m]), after: tc.def.after != null ? -tc.def.after : tc.def.after }) });
function commitTime(tc) { for (let q = 0; q <= 28; q++) { const tq = +(q * 0.05).toFixed(2), r = runMode(ENV, Object.assign({}, tc, { tackle: [tq] }), "NONE"); if (r.W.tk.act) return tq; } return null; }
const T = []; let prev = null;
for (let i = 0, j = 0; i < N; j++) { if (j > 8 * N) break; let tc;
  if (i % 2 === 1 && prev) tc = mirrorOf(prev);
  else { const R = rng(seed * 7919 + j), base = trialCase(j, seed), pat = PAT[(i >> 1) % PAT.length], tC = pat === "invalid" ? 0 : commitTime(base); if (tC == null) continue; let tq;
    if (pat === "single") tq = [+(tC + 0.12 * R()).toFixed(4)];
    else if (pat === "rapid") { const t0 = Math.max(0, tC - 0.3 * R()), dt = 0.06 + 0.06 * R(); tq = []; for (let t = t0; t < t0 + 1.8; t += dt) tq.push(+t.toFixed(4)); }
    else if (pat === "stride") tq = [tC, +(tC + 0.31).toFixed(4), +(tC + 0.62).toFixed(4)];
    else tq = [0.0, 1.8, 2.2];
    tc = Object.assign({}, base, { id: `${base.id}:${pat}`, tackle: tq, def: Object.assign({}, base.def, { after: [0, 30, -30, 60, -60][Math.floor(R() * 5)] }) }); prev = tc; }
  i++; T.push(tc); }
const out = {}; for (const m of MODES) out[m] = { checked: 0, rootDiff: 0, decisionDiff: 0, decisionBlocked: 0, decisionPhysics: 0, notes: [], phys: [], rootDiffOccActed: 0, rootDiffNoOcc: 0, maxRoot: 0, bad: [] };
// (the physics acting on the attacker in a run, as window offsets: Stage 3 / Stage 3B events on him, and every limb-contact impulse (both players take it))
const physOf = (r, H, n) => { const W = r.W, ev = (W.imp ? W.imp.events : []).filter((e) => e.who === "ATT" && e.k > H.k && e.k <= H.k + n).map((e) => ({ q: e.k - H.k, kind: e.kind }));
  const ap = (W.l3 ? W.l3.apps : []).filter((a) => a.k > H.k && a.k <= H.k + n).map((a) => ({ q: a.k - H.k, kind: "LIMB CONTACT " + a.region })); return ev.concat(ap).sort((x, y) => x.q - y.q); };
for (const tc of T) for (const m of MODES) { const r = runMode(ENV, tc, m), H = r.W.contactLog.find((c) => c.kind === "tackle"); if (!H) continue; const X = out[m]; X.checked++; const n = Math.round(RT[m] / DT);
  const rec = (w, L) => { if (w.k > H.k && w.k <= H.k + n) { const s = w.att.stateAt(w.att.t, w.att.plan), P = w.att.plan; L.root.push([s.P[0], s.P[1], s.psi]); L.dec.push([P.action.id, P.t0, P.reason, w.att.contacts.length, w.att.skill ? w.att.skill.k : null].join("|")); const o = w.occ && w.occ.log[w.occ.log.length - 1]; if (o && o.k === w.k && (Math.hypot(...o.dA) > 0 || o.wA > 0 || (o.foot || []).some((f) => f.who === "ATT"))) L.occ++; } };
  const a = { root: [], dec: [], occ: 0 }, b = { root: [], dec: [], occ: 0 };
  const ra = runMode(ENV, tc, m, { onTick: (w) => rec(w, a) });
  const rb = runMode(ENV, tc, m, { before: (w) => { const p0 = w.tk.probes.bind(w.tk); w.tk.probes = (t) => { if (Math.round(t / DT) < H.k) p0(t); }; }, onTick: (w) => rec(w, b) });
  // (a decision that differs because a touch was BLOCKED by the opponent's body (ball access) in one of the runs is occupancy, not information)
  const blocks = [ra, rb].map((r) => (r.W.occ ? r.W.occ.events : []).filter((e) => e.kind === "BALL ACCESS BLOCKED" && e.who === "ATT" && e.k > H.k && e.k <= H.k + n).map((e) => e.k - H.k));
  let dr = 0; for (let q = 0; q < Math.min(a.root.length, b.root.length); q++) dr = Math.max(dr, Math.hypot(a.root[q][0] - b.root[q][0], a.root[q][1] - b.root[q][1]));
  const phys = [ra, rb].map((r) => physOf(r, H, n));
  const decSame = JSON.stringify(a.dec) === JSON.stringify(b.dec); if (!decSame) { const q = a.dec.findIndex((x, k) => x !== b.dec[k]), ph = phys.map((P) => P.filter((e) => e.q <= q + 1));
    if (!blocks.some((B) => B.some((kk) => kk <= q + 1)) && ph.some((P) => P.length)) { X.decisionPhysics++; X.phys.push(`${tc.id}: decision differs at +${q} ticks (${a.dec[q]} vs ${b.dec[q]}) — physics on him first: ${ph.map((P) => P.slice(0, 3).map((e) => `+${e.q} ${e.kind}`).join(", ") || "—").join(" | ")} (run | counterfactual)`); }
    else if (blocks.some((B) => B.some((kk) => kk <= q + 1))) { X.decisionBlocked++; X.notes.push(`${tc.id}: decision differs at +${q} ticks (${a.dec[q]} vs ${b.dec[q]}) — his touch was BLOCKED by the defender's body at +${blocks.map((B) => B.join("/") || "—").join(" | ")} ticks (run | counterfactual): ball access, not information`); } else { X.decisionDiff++; X.bad.push(`${tc.id}: decision differs at +${q} ticks: ${a.dec[q]} vs ${b.dec[q]}`); } }
  if (dr > 1e-9) { X.rootDiff++; X.maxRoot = Math.max(X.maxRoot, dr); if (a.occ + b.occ > 0) X.rootDiffOccActed++; else if (blocks.some((B) => B.length)) X.rootDiffBlocked = (X.rootDiffBlocked || 0) + 1; else if (phys.some((P) => P.length)) X.rootDiffPhysics = (X.rootDiffPhysics || 0) + 1; else { X.rootDiffNoOcc++; X.bad.push(`${tc.id}: root differs ${(dr * 100).toFixed(2)} cm with no occupancy action on him in either run`); } }
  process.stderr.write("."); }
console.log(`\nNO NEW INFORMATION USED BEFORE PERCEPTION — STAGE 3B ON (Stage 2 as decided + the limb layer + Stage 3), the ${T.length} trials of p_torture.mjs (seed ${seed}); the attacker vs his counterfactual between the first tackle contact and his perception of it`);
console.log(`  ${"".padEnd(64)}${MODES.map((m) => m.padStart(9)).join("")}`);
for (const [l, k] of [["counterfactual checks made", "checked"], ["the attacker's DECISIONS differ (plan, action, reason, contacts, skill)", "decisionDiff"], ["  … differ only through a touch blocked by the body (ball access)", "decisionBlocked"], ["  … differ after physics acted on him in the window (Stage 3 / 3B: impact, limb contact)", "decisionPhysics"], ["his ROOT differs", "rootDiff"], ["  … with occupancy acting on him in the window (bodies kept apart)", "rootDiffOccActed"], ["  … after his touch was BLOCKED by the body (ball access: occupancy, not information)", "rootDiffBlocked"], ["  … with Stage 3 / 3B physics acting on him in the window", "rootDiffPhysics"], ["  … with no occupancy action on him (would be information)", "rootDiffNoOcc"]]) console.log(`  ${l.padEnd(64)}${MODES.map((m) => String(out[m][k] || 0).padStart(9)).join("")}`);
console.log(`  ${"the largest root difference (cm)".padEnd(64)}${MODES.map((m) => (out[m].maxRoot * 100).toFixed(2).padStart(9)).join("")}`);
for (const m of MODES) for (const b of out[m].bad.slice(0, 10)) console.log(`  ✗ ${m} ${b}`);
for (const m of MODES) for (const b of out[m].phys) console.log(`  ◦ ${m} ${b}`);
for (const m of MODES) for (const b of out[m].notes.slice(0, 6)) console.log(`  · ${m} ${b}`);

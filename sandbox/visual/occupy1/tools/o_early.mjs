// occupy1/tools/o_early.mjs — §30 "NO NEW INFORMATION USED BEFORE PERCEPTION", with occupancy ON. Shared Possession's torture compares the
// attacker with his COUNTERFACTUAL (the same run, the tackle's boot never presented to the ball) between the first tackle contact and his
// perception of it, on his root AND his decisions together. With bodies that now occupy space, the root may differ for a reason that is not
// information: the defender's body, after a contact or without it, is not where it was in the counterfactual, and occupancy keeps the two
// bodies apart. This check separates the two, on the exact trials of possess1/tools/p_torture.mjs (seed 3, 60 trials, the same patterns):
//   DECISIONS — the attacker's plan (its action, its start, its reason), his ball contacts, his skill request: must be identical
//   ROOT — the largest root difference in the window, and whether occupancy acted on him in it (in either run)
//   node --import ./two/o_two_hook.mjs o_early.mjs [--n 60] [--seed 3]
import { ENV } from "./o_env.mjs";
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
const out = {}; for (const m of MODES) out[m] = { checked: 0, rootDiff: 0, decisionDiff: 0, decisionBlocked: 0, notes: [], rootDiffOccActed: 0, rootDiffNoOcc: 0, maxRoot: 0, bad: [] };
for (const tc of T) for (const m of MODES) { const r = runMode(ENV, tc, m), H = r.W.contactLog.find((c) => c.kind === "tackle"); if (!H) continue; const X = out[m]; X.checked++; const n = Math.round(RT[m] / DT);
  const rec = (w, L) => { if (w.k > H.k && w.k <= H.k + n) { const s = w.att.stateAt(w.att.t, w.att.plan), P = w.att.plan; L.root.push([s.P[0], s.P[1], s.psi]); L.dec.push([P.action.id, P.t0, P.reason, w.att.contacts.length, w.att.skill ? w.att.skill.k : null].join("|")); const o = w.occ && w.occ.log[w.occ.log.length - 1]; if (o && o.k === w.k && (Math.hypot(...o.dA) > 0 || o.wA > 0 || (o.foot || []).some((f) => f.who === "ATT"))) L.occ++; } };
  const a = { root: [], dec: [], occ: 0 }, b = { root: [], dec: [], occ: 0 };
  const ra = runMode(ENV, tc, m, { onTick: (w) => rec(w, a) });
  const rb = runMode(ENV, tc, m, { before: (w) => { const p0 = w.tk.probes.bind(w.tk); w.tk.probes = (t) => { if (Math.round(t / DT) < H.k) p0(t); }; }, onTick: (w) => rec(w, b) });
  // (a decision that differs because a touch was BLOCKED by the opponent's body (ball access) in one of the runs is occupancy, not information)
  const blocks = [ra, rb].map((r) => (r.W.occ ? r.W.occ.events : []).filter((e) => e.kind === "BALL ACCESS BLOCKED" && e.who === "ATT" && e.k > H.k && e.k <= H.k + n).map((e) => e.k - H.k));
  let dr = 0; for (let q = 0; q < Math.min(a.root.length, b.root.length); q++) dr = Math.max(dr, Math.hypot(a.root[q][0] - b.root[q][0], a.root[q][1] - b.root[q][1]));
  const decSame = JSON.stringify(a.dec) === JSON.stringify(b.dec); if (!decSame) { const q = a.dec.findIndex((x, k) => x !== b.dec[k]); if (blocks.some((B) => B.some((kk) => kk <= q + 1))) { X.decisionBlocked++; X.notes.push(`${tc.id}: decision differs at +${q} ticks (${a.dec[q]} vs ${b.dec[q]}) — his touch was BLOCKED by the defender's body at +${blocks.map((B) => B.join("/") || "—").join(" | ")} ticks (run | counterfactual): ball access, not information`); } else { X.decisionDiff++; X.bad.push(`${tc.id}: decision differs at +${q} ticks: ${a.dec[q]} vs ${b.dec[q]}`); } }
  if (dr > 1e-9) { X.rootDiff++; X.maxRoot = Math.max(X.maxRoot, dr); if (a.occ + b.occ > 0) X.rootDiffOccActed++; else { X.rootDiffNoOcc++; X.bad.push(`${tc.id}: root differs ${(dr * 100).toFixed(2)} cm with no occupancy action on him in either run`); } }
  process.stderr.write("."); }
console.log(`\nNO NEW INFORMATION USED BEFORE PERCEPTION — occupancy ON, the ${T.length} trials of p_torture.mjs (seed ${seed}); the attacker vs his counterfactual between the first tackle contact and his perception of it`);
console.log(`  ${"".padEnd(64)}${MODES.map((m) => m.padStart(9)).join("")}`);
for (const [l, k] of [["counterfactual checks made", "checked"], ["the attacker's DECISIONS differ (plan, action, reason, contacts, skill)", "decisionDiff"], ["  … differ only through a touch blocked by the body (ball access)", "decisionBlocked"], ["his ROOT differs", "rootDiff"], ["  … with occupancy acting on him in the window (bodies kept apart)", "rootDiffOccActed"], ["  … with no occupancy action on him (would be information)", "rootDiffNoOcc"]]) console.log(`  ${l.padEnd(64)}${MODES.map((m) => String(out[m][k]).padStart(9)).join("")}`);
console.log(`  ${"the largest root difference (cm)".padEnd(64)}${MODES.map((m) => (out[m].maxRoot * 100).toFixed(2).padStart(9)).join("")}`);
for (const m of MODES) for (const b of out[m].bad.slice(0, 10)) console.log(`  ✗ ${m} ${b}`);
for (const m of MODES) for (const b of out[m].notes.slice(0, 6)) console.log(`  · ${m} ${b}`);

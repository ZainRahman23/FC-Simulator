// possess1/tools/p_torture.mjs — §31 / §32 SHARED POSSESSION TORTURE + DETERMINISM (deterministic, seeded). Trials: t_matrix's honest set-ups
// (walk / jog carries, cuts, the left-footed twin, the Body Feint, the Croqueta; the defender set or walking in) × request patterns — one request,
// RAPID REPEATED REQUESTS (every 0.06 – 0.12 s for 1.8 s: tackle after tackle, contact after contact), requests on the defender's footfalls,
// invalid requests — and the defender's stick after his tackle aimed at random (0, ±30, ±60° from his facing: both players going for the
// loose ball); every second trial is the MIRRORED WORLD of the one before. Each trial under NONE / SHORT / MEDIUM / LONG, run TWICE, plus its
// COUNTERFACTUAL (the same, the boot never presented to the ball). Instrumented:
//   DUAL OWNERSHIP (a player whose own record says CONTROLLED while the authority gives the ball to another, once he has perceived everything)
//   UNAWARE OWNER (the authority's owner believing otherwise, everything perceived) · STALE OWNER (the owner 3 m from the real ball)
//   OWNERSHIP CHATTER (the owner changing twice within 0.25 s; A → B → A within 0.5 s) · POSSESSION WITHOUT A TOUCH (a claim granted with no
//   clean touch that tick) · CLAIMS MADE BLIND (granted with an event unperceived — must be 0; the denials are counted)
//   FREE NEVER RESOLVING (FREE episodes: their length; FREE at the replay's end with / without a candidate playing for it)
//   REACTION TIMER NEVER RESOLVING (an event still pending after its time) · AN EVENT PERCEIVED TWICE · NEW INFORMATION USED EARLY (the attacker
//   ≠ his counterfactual before he perceives the first contact) · NEAR-SIMULTANEOUS TOUCHES (two players' contacts within 0.05 s) · DETERMINISM
//   node p_torture.mjs [--n 60] [--seed 3] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { trialCase, rng } from "../../tackle1/tools/t_matrix.mjs";
import { runMode, outcomeOf } from "../p_run.js";
import { MODES as RT } from "../p_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg("n", 60), seed = +arg("seed", 3), PAT = ["single", "rapid", "stride", "invalid", "rapid", "single"], MODES = ["NONE", "SHORT", "MEDIUM", "LONG"];
const mirrorOf = (tc) => Object.assign({}, tc, { id: tc.id + "·M", mirror: true, def: Object.assign({}, tc.def, { at: [tc.def.at[0], -tc.def.at[1]], face: -tc.def.face, pref: tc.def.pref === "L" ? "R" : "L", stick: (tc.def.stick || []).map(([t, a, m]) => [t, a == null ? null : -a, m]), after: tc.def.after != null ? -tc.def.after : tc.def.after }) });
function commitTime(tc) { for (let q = 0; q <= 28; q++) { const tq = +(q * 0.05).toFixed(2), r = runMode(ENV, Object.assign({}, tc, { tackle: [tq] }), "NONE"); if (r.W.tk.act) return tq; } return null; }
const S = {}; for (const m of MODES) S[m] = { runs: 0, contacts: 0, transitions: 0, claims: 0, denied: 0, deniedBlind: 0, dual: 0, unaware: 0, staleOwner: 0, chatter: 0, aba: 0, noTouch: 0, blindClaim: 0, freeEp: [], freeEnd: 0, freeEndPlayed: 0, pendingLeft: 0, twice: 0, early: 0, earlyChecked: 0, nearSim: 0, nondet: 0, outcomes: {}, maxChanges: 0 };
const bad = []; let trials = 0, skipped = 0, prev = null;
for (let i = 0, j = 0; i < N; j++) { if (j > 8 * N) break; let tc;
  if (i % 2 === 1 && prev) tc = mirrorOf(prev);
  else { const R = rng(seed * 7919 + j), base = trialCase(j, seed), pat = PAT[(i >> 1) % PAT.length], tC = pat === "invalid" ? 0 : commitTime(base); if (tC == null) { skipped++; continue; } let tq;
    if (pat === "single") tq = [+(tC + 0.12 * R()).toFixed(4)];
    else if (pat === "rapid") { const t0 = Math.max(0, tC - 0.3 * R()), dt = 0.06 + 0.06 * R(); tq = []; for (let t = t0; t < t0 + 1.8; t += dt) tq.push(+t.toFixed(4)); }
    else if (pat === "stride") tq = [tC, +(tC + 0.31).toFixed(4), +(tC + 0.62).toFixed(4)];
    else tq = [0.0, 1.8, 2.2];
    tc = Object.assign({}, base, { id: `${base.id}:${pat}`, tackle: tq, def: Object.assign({}, base.def, { after: [0, 30, -30, 60, -60][Math.floor(R() * 5)] }) }); prev = tc; }
  i++; trials++;
  for (const m of MODES) { const X = S[m], r1 = runMode(ENV, tc, m), r2 = runMode(ENV, tc, m), W = r1.W, A = W.auth; X.runs++;
    // determinism: contacts, transitions, plans (the canonical fingerprints), the ball, the outcome
    const fp = (w) => JSON.stringify([w.att.hash, w.def.hash, w.contactLog.map((c) => [c.k, c.by, c.kind, c.vOut]), w.auth.log, w.auth.denied, w.att.plans.map((p) => [p.t0, p.reason, p.action.label]).slice(-40), w.trueTrack(w.t).p, outcomeOf(w) && outcomeOf(w).kind, w.players.map((p) => p.pc.log)]);
    if (fp(r1.W) !== fp(r2.W)) { X.nondet++; bad.push(`${tc.id} ${m}: NONDETERMINISTIC`); }
    X.contacts += W.contactLog.length; const T = A.log.filter((e) => e.to); X.transitions += T.length; X.claims += T.filter((e) => e.to.startsWith("CONTROLLED")).length; X.denied += A.denied.length; X.deniedBlind += A.denied.filter((d) => d.why.startsWith("blind")).length;
    X.dual += A.checks.dual; X.unaware += A.checks.unaware || 0; X.staleOwner += A.checks.far || 0; X.noTouch += A.checks.noTouch; X.blindClaim += A.checks.blindClaim || 0;
    // chatter: the owner changing twice within 0.25 s; A → B → A (owners) within 0.5 s
    const own = T.filter((e) => e.to.startsWith("CONTROLLED")); for (let q = 1; q < own.length; q++) { if (own[q].owner !== own[q - 1].owner && own[q].t - own[q - 1].t < 0.25) { X.chatter++; bad.push(`${tc.id} ${m}: owner ${own[q - 1].owner} → ${own[q].owner} in ${(own[q].t - own[q - 1].t).toFixed(3)} s`); } if (q >= 2 && own[q].owner === own[q - 2].owner && own[q - 1].owner !== own[q].owner && own[q].t - own[q - 2].t < 0.5) { X.aba++; bad.push(`${tc.id} ${m}: A→B→A in ${(own[q].t - own[q - 2].t).toFixed(3)} s`); } }
    X.maxChanges = Math.max(X.maxChanges, own.length);
    // FREE episodes (after the run-up's first collection)
    let f0 = null; for (const e of T) { if (e.to === "FREE") f0 = e.t; else if (f0 != null) { X.freeEp.push(e.t - f0); f0 = null; } }
    if (f0 != null) { X.freeEnd++; if (W.players.some((p) => p.o.ballOn !== false && p.firstContact(p.plan))) X.freeEndPlayed++; }
    // the perception queues: nothing left past its time; nothing perceived twice (p_react.js due() throws — caught here as a failure)
    for (const p of W.players) X.pendingLeft += p.pc.q.filter((e) => e.kAvail < W.k).length;
    // near-simultaneous touches: two players' contacts within 0.05 s
    const C = W.contactLog; for (let q = 1; q < C.length; q++) if (C[q].by !== C[q - 1].by && C[q].t - C[q - 1].t < 0.05) X.nearSim++;
    const o = outcomeOf(W); if (o) X.outcomes[o.kind] = (X.outcomes[o.kind] || 0) + 1;
    // NEW INFORMATION USED EARLY: the attacker against his counterfactual until he perceives the first contact
    const H = W.contactLog.find((c) => c.kind === "tackle"); if (H && m !== "NONE") { X.earlyChecked++; const n = Math.round(RT[m] / DT), sig = [], cf = [];
      runMode(ENV, tc, m, { onTick: (w) => { if (w.k > H.k && w.k <= H.k + n) { const s = w.att.stateAt(w.att.t, w.att.plan); sig.push([s.P[0], s.P[1], s.psi, w.att.plan.action.id, w.att.contacts.length]); } } });
      runMode(ENV, tc, m, { before: (w) => { const p0 = w.tk.probes.bind(w.tk); w.tk.probes = (t) => { if (Math.round(t / DT) < H.k) p0(t); }; }, onTick: (w) => { if (w.k > H.k && w.k <= H.k + n) { const s = w.att.stateAt(w.att.t, w.att.plan); cf.push([s.P[0], s.P[1], s.psi, w.att.plan.action.id, w.att.contacts.length]); } } });
      if (JSON.stringify(sig) !== JSON.stringify(cf)) { X.early++; bad.push(`${tc.id} ${m}: the attacker differs from his counterfactual before perceiving the contact`); } } }
  process.stderr.write("."); }
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : 0; };
console.log(`\nSHARED POSSESSION TORTURE — ${trials} trials (seed ${seed}; every second one the mirrored world of the one before) × ${MODES.length} modes, each run twice + its counterfactual`);
const rowsOut = [["runs", "runs"], ["ball contacts (all players, all kinds)", "contacts"], ["authority transitions", "transitions"], ["control established (granted claims)", "claims"], ["claims DENIED", "denied"], ["  of them: blind (an event not yet perceived)", "deniedBlind"], ["DUAL OWNERSHIP", "dual"], ["UNAWARE OWNER", "unaware"], ["STALE OWNER (3 m from the real ball)", "staleOwner"], ["OWNERSHIP CHATTER (owner changed twice < 0.25 s)", "chatter"], ["A → B → A within 0.5 s", "aba"], ["POSSESSION WITHOUT A TOUCH", "noTouch"], ["CONTROL GRANTED BLIND", "blindClaim"], ["FREE at the replay's end", "freeEnd"], ["  of them with a candidate playing for it", "freeEndPlayed"], ["REACTION TIMER NEVER RESOLVED", "pendingLeft"], ["NEW INFORMATION USED EARLY", "early"], ["  (counterfactual checks made)", "earlyChecked"], ["near-simultaneous touches (2 players < 0.05 s)", "nearSim"], ["most ownership establishments in one run", "maxChanges"], ["NONDETERMINISTIC", "nondet"]];
console.log(`  ${"".padEnd(52)}${MODES.map((m) => m.padStart(9)).join("")}`); for (const [l, k] of rowsOut) console.log(`  ${l.padEnd(52)}${MODES.map((m) => String(S[m][k]).padStart(9)).join("")}`);
console.log(`  ${"FREE episodes resolved: median / p90 / max (s)".padEnd(52)}${MODES.map((m) => `${q(S[m].freeEp, 0.5).toFixed(2)}/${q(S[m].freeEp, 0.9).toFixed(2)}/${Math.max(0, ...S[m].freeEp).toFixed(2)}`.padStart(16)).join("")}`);
for (const m of MODES) console.log(`  outcomes ${m}: ${JSON.stringify(S[m].outcomes)}`);
console.log(`  AN EVENT PERCEIVED TWICE: none (p_react.js due() throws on one — it would abort the run)`);
console.log(`  skipped set-ups (no committing request found): ${skipped}`); for (const b of bad.slice(0, 40)) console.log("  ✗ " + b);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ trials, seed, S, bad }, null, 1));

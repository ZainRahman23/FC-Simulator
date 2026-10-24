// possess1/tools/p_cpu.mjs — §33 PERFORMANCE (node, no drawing; medians over repeated runs):
//   SINGLE PLAYER: the published player (ControlledSim) vs SharedSim alone (the authority trivial) — the same input, alternated, µs per tick
//   TWO PLAYERS: the shared layer's own bookkeeping per world tick — perception (events due), the ball-on rule, the authority's tick (labels,
//   invariants), the knowledge tracks, the belief balls stepped, the launch hook (the snapshot for the beliefs, the events, the judgment) —
//   split into IDLE ticks (the ball controlled, nothing pending), REACTING ticks (an event waiting to be perceived), CONTESTED / FREE ticks
//   (the claims evaluated); and the whole world tick, OLD vs the shared modes (the same cases)
//   node p_cpu.mjs [--reps 3]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { ControlledSim, presetLayers } from "../../vocab2/c_sim.js";
import { caseOpts } from "../../vocab2/v_run.js";
import { SharedSim } from "../p_sim.js";
import { PCASES } from "../p_cases.js";
import { runMode } from "../p_run.js";
import { rng } from "../../tackle1/tools/t_matrix.mjs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REPS = +arg("reps", 3);
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : 0; }, med = (A) => q(A, 0.5), mean = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0);
const us = (x) => (x * 1000).toFixed(2) + " µs";
// ── SINGLE PLAYER ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{ const o = () => Object.assign(caseOpts({ pref: "R" }, false), { layers: presetLayers("FULL") }), T = { C: [], S: [] };
  for (let rep = 0; rep < REPS; rep++) for (let s = 1; s <= 4; s++) for (const [key, Cls] of (rep % 2 ? [["S", SharedSim], ["C", ControlledSim]] : [["C", ControlledSim], ["S", SharedSim]])) { const A = new Cls(ENV, o()), R = rng(s); let h = 0, mode = "JOG"; const c0 = performance.now();
    for (let k = 0; k < 240 * 15; k++) { if (k % 60 === 0) { h = R() < 0.15 ? null : (R() - 0.5) * 2 * Math.PI; mode = ["WALK", "JOG", "RUN", "SPRINT"][Math.floor(R() * 4)]; } A.step({ h, mode, keys: 0 }); } T[key].push((performance.now() - c0) / (240 * 15)); }
  console.log(`SINGLE PLAYER (${REPS} × 4 seeds × 15 s, alternated): the published ControlledSim ${us(med(T.C))} per tick · SharedSim alone ${us(med(T.S))} per tick → overhead ${us(med(T.S) - med(T.C))} (${(100 * (med(T.S) / med(T.C) - 1)).toFixed(1)} %; run-to-run spread ±${us((q(T.C, 0.9) - q(T.C, 0.1)) / 2)})`); }
// ── TWO PLAYERS: the shared layer's own work, per world tick ────────────────────────────────────────────────────────────────────────────────
const P = { idle: [], react: [], free: [], launch: [], world: { OLD: [], NONE: [], SHORT: [], MEDIUM: [], LONG: [] } }, cnt = { idle: 0, react: 0, free: 0 };
for (let rep = 0; rep < REPS; rep++) for (const tc of PCASES) for (const m of ["OLD", "NONE", "SHORT", "MEDIUM", "LONG"]) { let cur = 0, lt = 0; const now = () => performance.now();
  const r = runMode(ENV, tc, m, { before: (W) => { if (!W.auth) { const s0 = W.step.bind(W); W.step = (a, d) => { const c = now(); s0(a, d); P.world.OLD.push(now() - c); }; return; }
    const wrap = (obj, name) => { const f = obj[name].bind(obj); obj[name] = (...x) => { const c = now(); const v = f(...x); cur += now() - c; return v; }; };
    wrap(W, "perceive"); wrap(W, "rights"); wrap(W.auth, "tick"); wrap(W, "krecord"); for (const p of W.players) wrap(p.pc, "stepGhosts");
    const L0 = W.launch.bind(W); W.launch = (...x) => { const c = now(); const v = L0(...x); const d = now() - c; cur += d; P.launch.push(d); return v; };
    const s0 = W.step.bind(W); W.step = (a, d) => { cur = 0; const pending = W.players.some((p) => p.pc.q.length), free = W.auth.state === "FREE"; const c = now(); s0(a, d); P.world[m].push(now() - c);
      (pending ? P.react : free ? P.free : P.idle).push(cur); cnt[pending ? "react" : free ? "free" : "idle"]++; }; } }); }
console.log(`\nTWO PLAYERS — ${REPS} × ${PCASES.length} review cases × 4 shared modes: THE SHARED LAYER'S OWN WORK per world tick (perception, ball-on rule, authority tick, knowledge tracks, belief balls, the launch hook)`);
console.log(`  IDLE (the ball controlled, nothing pending)       median ${us(med(P.idle))} · p95 ${us(q(P.idle, 0.95))} · mean ${us(mean(P.idle))}   (${P.idle.length} ticks) → ${(mean(P.idle) * 240).toFixed(3)} ms per simulated s`);
console.log(`  REACTING (an event waiting: the belief balls)      median ${us(med(P.react))} · p95 ${us(q(P.react, 0.95))} · mean ${us(mean(P.react))}   (${P.react.length} ticks) → ${(mean(P.react) * 240).toFixed(3)} ms per simulated s`);
console.log(`  FREE / CONTESTED (the claims evaluated)           median ${us(med(P.free))} · p95 ${us(q(P.free, 0.95))} · mean ${us(mean(P.free))}   (${P.free.length} ticks) → ${(mean(P.free) * 240).toFixed(3)} ms per simulated s`);
console.log(`  the launch hook (snapshot for the beliefs, events, judgment), per ball change: median ${us(med(P.launch))} · max ${us(Math.max(...P.launch))} (${P.launch.length} launches)`);
console.log(`  THE WHOLE WORLD TICK (both footballers + everything), mean per simulated s: ${Object.entries(P.world).map(([m, A]) => `${m} ${(mean(A) * 240).toFixed(2)} ms`).join(" · ")}`);
console.log(`  (after the contact the modes play different football — re-plans, pursuits, two players chasing: the whole-tick means compare different replays; the shared layer's own work is the rows above)`);

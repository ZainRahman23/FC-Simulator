// tackle1/tools/t_cpu.mjs — PERFORMANCE: the tackle module's own cost per world tick — IDLE (no request: pre + probes + post), PENDING (the
// opportunity search every tick), the COMMITMENT (the action and its two plans built once), ACTIVE (the boot's spheres for the opponent law, the
// contacts read) — and, separately, what the encounter costs that is not tackling: the attacker's tick alone vs in the world, the defender's tick
// (a second canonical footballer, ball off). Node, no drawing; repeated runs, medians.    node t_cpu.mjs [--reps 5]
import { ENV, makeSim } from "../../vocab2/tools/u_env.mjs";
import { caseOpts, runCaseOn } from "../../vocab2/v_run.js";
import { presetLayers, DT } from "../../vocab2/c_sim.js";
import { TCASES } from "../t_cases.js";
import { runCase } from "../t_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REPS = +arg("reps", 5);
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : 0; }, med = (A) => q(A, 0.5), sum = (A) => A.reduce((a, b) => a + b, 0);
const mx = (A) => A.reduce((a, b) => (b > a ? b : a), 0);
const ms = (x) => (x * 1000).toFixed(1) + " µs";
const S = { idle: [], pending: [], active: [], defTick: [], attWorld: [], attSolo: [], build: [], evalTick: [], attWorldPre: [], attSoloPre: [] };
for (let rep = 0; rep < REPS; rep++) for (const tc of TCASES) {
  // the encounter with its request, timed per stage
  const r = runCase(ENV, tc, { timing: true }), W = r.W, C = W.cpu, A = W.tk.acts, nT = C.pre.length;
  for (let k = 0; k < nT; k++) { const t = k * DT, own = A.some((a) => t >= a.t0 - 1e-9 && t <= a.tW1 + 1e-9), pend = W.tk.log.some((x) => t >= x.tReq - 1e-9 && t < (x.tEnd != null ? x.tEnd : x.tCommit != null ? x.tCommit : x.tReq + 0.35) - 1e-9);
    const tkCost = C.pre[k] + C.probes[k] + C.post[k]; (own ? S.active : pend ? S.pending : S.idle).push(tkCost); S.defTick.push(C.def[k]); S.attWorld.push(C.att[k]);
    if (!W.tk.log.length || t < W.tk.log[0].tReq - 1e-9) S.attWorldPre.push(C.att[k]); }
  const kReq = W.tk.log.length ? Math.round(W.tk.log[0].tReq / DT) : Infinity;
  S.build.push(...W.tk.cpu.build); S.evalTick.push(...W.tk.cpu.eval);
  // the attacker alone (the canonical case exactly), per tick
  if (rep === 0 || rep === REPS - 1) { const solo = makeSim("TL", Object.assign(caseOpts(tc.c, false), { layers: presetLayers("FULL") })), nUp = Math.round(tc.c.runup / DT); let last = performance.now();
    const T = []; runCaseOn(solo, tc.c, false, () => { const now = performance.now(); T.push(now - last); last = now; }); S.attSolo.push(...T); S.attSoloPre.push(...T.slice(0, Math.min(T.length, kReq))); } }
console.log(`PERFORMANCE — ${REPS} × ${TCASES.length} Lab cases (node ${process.version}, no drawing); per world tick (240 Hz)`);
console.log(`  tackle module IDLE (no request pending or acting):  median ${ms(med(S.idle))} · p95 ${ms(q(S.idle, 0.95))} · max ${ms(mx(S.idle))}   (${S.idle.length} ticks)`);
console.log(`  tackle module PENDING (the opportunity search):     median ${ms(med(S.pending))} · p95 ${ms(q(S.pending, 0.95))} · max ${ms(mx(S.pending))}   (${S.pending.length} ticks)`);
console.log(`  tackle module ACTIVE (commit → contact window end): median ${ms(med(S.active))} · p95 ${ms(q(S.active, 0.95))} · max ${ms(mx(S.active))}   (${S.active.length} ticks; the commitment tick included)`);
console.log(`  the commitment (the action + its plans, once):      median ${med(S.build).toFixed(2)} ms · max ${mx(S.build).toFixed(2)} ms   (${S.build.length} commitments)`);
console.log(`  the defender's own tick (a 2nd canonical footballer, ball off): median ${ms(med(S.defTick))} · p95 ${ms(q(S.defTick, 0.95))} — not tackling: the cost of a second player`);
console.log(`  the attacker's tick IN THE WORLD: median ${ms(med(S.attWorld))} · p95 ${ms(q(S.attWorld, 0.95))} · ALONE (the canonical case): median ${ms(med(S.attSolo))} · p95 ${ms(q(S.attSolo, 0.95))}`);
console.log(`  idle tackle module per simulated second: ${(med(S.idle) * 240).toFixed(3)} ms/s (the attacker alone: ${(med(S.attSolo) * 240).toFixed(1)} ms/s)`);
const mean = (A) => (A.length ? sum(A) / A.length : 0);
console.log(`  MEANS per simulated second (re-plans included): tackle module ${(mean(S.idle.concat(S.pending, S.active)) * 240).toFixed(3)} ms/s (idle ${(mean(S.idle) * 240).toFixed(3)}) · the defender's own sim ${(mean(S.defTick) * 240).toFixed(2)} ms/s · the attacker in the world ${(mean(S.attWorld) * 240).toFixed(2)} ms/s (tackles and their aftermath included) vs alone ${(mean(S.attSolo) * 240).toFixed(2)} ms/s; BEFORE any request (like for like): in the world ${(mean(S.attWorldPre) * 240).toFixed(2)} ms/s vs alone ${(mean(S.attSoloPre) * 240).toFixed(2)} ms/s`);

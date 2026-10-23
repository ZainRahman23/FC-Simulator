// tc_controlled1/tools/c_equiv.mjs — FULL-FREE ≡ TC-UNIFIED-1's FULL: the controlled simulation with control FREE (default) against the
// untouched tc_unified1/u_sim.js UnifiedSim, FULL stack, on every required test, the torture sequences, the morning cases and seeded random torture
// programs — the gameplay hash (centre of mass + ball every 4th tick), the contacts and the actions must be identical
//   node c_equiv.mjs [--layers A|FULL]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { TESTS, MORNING, MODES, reqOf } from "../u_tests.js";
import { SEQ, MODES as TM } from "../u_torture_seq.js";
import { stickVector, stickMode, headingFrom } from "../../tc_baseline_88573ef0/pt_input.js";
import { program, PAGE } from "./c_torture.mjs";
const A = process.argv, preset = A.includes("--layers") ? A[A.indexOf("--layers") + 1] : "FULL", DEG = Math.PI / 180, runs = [];
for (const T of TESTS.concat(MORNING)) runs.push({ name: T.name, n: Math.round(T.dur / DT), req: (t) => reqOf(T.f, t, MODES[T.mode]) });
for (const [name, seq] of Object.entries(SEQ)) for (const m of ["JOG", "RUN", "SPRINT"]) { const M = TM[m]; runs.push({ name: `torture ${name} · ${m}`, n: Math.round(seq.dur / DT), req: (t) => { const a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; } }); }
for (let s = 1; s <= 6; s++) { const P = program(s, 30); runs.push({ name: `random program #${s}`, n: Math.round(30 / DT), req: (t) => P.req(t) }); }
let same = 0, diff = 0;
for (const r of runs) { const o = () => Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers(preset) }), a = makeSim("UNIFIED", o()), b = makeSim("TL", o()); for (let k = 0; k < r.n; k++) { const q = r.req(k * DT); a.step(q); b.step(q); }
  const sig = (s) => `${s.hash}|${s.contacts.length}|${s.log.actions.map((x) => x.label + x.m).join(",")}`; if (sig(a) === sig(b)) same++; else { diff++; console.log(`DIFFERENT  ${r.name}: ${a.hash} vs ${b.hash}`); } }
console.log(`${same}/${runs.length} identical: FULL-FREE (tc_controlled1, control FREE) ≡ TC-UNIFIED-1 (${preset})${diff ? ` — ${diff} DIFFERENT` : ""}`);

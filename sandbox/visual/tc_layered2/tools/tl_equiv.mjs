// tc_layered2/tools/tl_equiv.mjs — ALL OFF ≡ 88573ef0: every required test (§22) and the rapid-input torture sequences, on the LOCKED baseline
// (tc_baseline_88573ef0/pt_sim.js) and on the layered copy with the given layers (default: all off) — the gameplay hash (the centre of mass and the
// ball every 4th tick, every contact's launch), the contacts and the actions must be identical
//   node tl_equiv.mjs [--layers ack,early,…]
import { makeSim, DT } from "./tl_env.mjs";
import { TESTS, MODES, reqOf } from "./tl_tests.mjs";
import { SEQ, MODES as TM } from "../tl_torture_seq.js";
import { stickVector, stickMode, headingFrom } from "../../tc_baseline_88573ef0/pt_input.js";
const A = process.argv, i = A.indexOf("--layers"), layers = Object.fromEntries((i > 0 ? A[i + 1].split(",") : []).filter(Boolean).map((k) => [k, true]));
const DEG = Math.PI / 180, runs = [];
for (const T of TESTS) runs.push({ name: T.name, n: Math.round(T.dur / DT), req: (t) => reqOf(T.f, t, MODES[T.mode]) });
for (const [name, seq] of Object.entries(SEQ)) for (const m of ["JOG", "RUN", "SPRINT"]) { const M = TM[m]; runs.push({ name: `torture ${name} · ${m}`, n: Math.round(seq.dur / DT), req: (t) => { const a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; } }); }
let same = 0, diff = 0;
for (const r of runs) { const a = makeSim("BASE"), b = makeSim("TL", { layers }); for (let k = 0; k < r.n; k++) { const q = r.req(k * DT); a.step(q); b.step(q); }
  const sig = (s) => `${s.hash}|${s.contacts.length}|${s.log.actions.map((x) => x.label + x.m).join(",")}`; if (sig(a) === sig(b)) same++; else { diff++; console.log(`DIFFERENT  ${r.name}: ${a.hash} vs ${b.hash} (contacts ${a.contacts.length} vs ${b.contacts.length})`); } }
console.log(`${same}/${runs.length} identical to the locked 88573ef0 (layers: ${Object.keys(layers).join(", ") || "all off"})${diff ? ` — ${diff} DIFFERENT` : ""}`);

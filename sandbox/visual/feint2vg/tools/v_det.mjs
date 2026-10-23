// vocab1/tools/v_det.mjs — DETERMINISM: the seeded torture programs with random manual intents (v_intent_torture's) simulated twice → every
// tick's hash, position and ball identical; and a re-simulation from the recorded input + events (the page's replay path: intents re-issued
// from the log) identical to the original
//   node v_det.mjs [--seeds 6] [--dur 30]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { META, intentOf } from "../v_meta.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 6), dur = +opt("dur", 30);
const POOL = META.filter((m) => m.kind !== "carry" && m.kind !== "none").map((m) => m.id), MODES = ["WALK", "JOG", "RUN", "SPRINT"];
const mk = () => makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" }));
function drive(sd) { const P = program(sd, dur), sim = mk(); let rng = sd * 7919, next = 2.0; const rand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; }, H = [];
  for (let k = 0; k < Math.round(dur / DT); k++) { const t = k * DT; if (t >= next) { sim.requestSkill(intentOf(POOL[Math.floor(rand() * POOL.length)])); next = t + 1.2 + 1.4 * rand(); } sim.step(P.req(t)); const s = sim.stateAt(sim.t); H.push(sim.hash, s.P[0], s.P[1], sim.ball.p[0], sim.ball.p[1]); } return { sim, H }; }
let same = 0, resim = 0;
for (let sd = 1; sd <= seeds; sd++) { const a = drive(sd), b = drive(sd); let ok = a.H.length === b.H.length; for (let i = 0; ok && i < a.H.length; i++) if (a.H[i] !== b.H[i]) ok = false; if (ok) same++;
  // (the replay path: the recorded input with the events re-applied at their ticks)
  const S = a.sim, I = S.log.input, E = S.log.events, r = mk(); let ei = 0;
  for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; r.applyEvent(e); } r.step({ h: I[3 * k] === -99 ? null : I[3 * k], mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
  if (r.hash === S.hash && r.ball.p[0] === S.ball.p[0]) resim++; }
console.log(`DETERMINISM: ${same}/${seeds} identical when simulated twice (every tick) · ${resim}/${seeds} identical when re-simulated from the recorded input + events (the page's replay path) · ${seeds} × ${dur} s, random manual intents`);

// vocab1/tools/v_intent_torture.mjs — THE MANUAL VOCABULARY UNDER TORTURE: the seeded random joystick programs (c_torture.mjs) with a random
// MANUAL INTENT every 1.2 – 2.6 s (any technique of the library, its exit = wherever the stick is then): every request's outcome (PLAYED /
// REJECTED / CANCELLED), possession (CONTROLLED exits, missed contacts, the ball beyond 3 m), technique thrashing (action switches per s)
//   node v_intent_torture.mjs [--seeds 12] [--dur 60]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { META, intentOf } from "../v_meta.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 12), dur = +opt("dur", 60);
const POOL = META.filter((m) => m.kind !== "carry" && m.kind !== "none").map((m) => m.id);
let req = 0, played = 0, rej = 0, canc = 0, exits = 0, missed = 0, far = 0, switches = 0, secs = 0; const per = {}, exitWhy = {}; let worst = 0, cpu = 0;
for (let sd = 1; sd <= seeds; sd++) { const P = program(sd, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" }));
  let rng = sd * 7919, next = 2.0, lastAct = null; const rand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; }; const c0 = process.cpuUsage();
  for (let k = 0; k < Math.round(dur / DT); k++) { const t = k * DT; if (t >= next) { const id = POOL[Math.floor(rand() * POOL.length)], it = intentOf(id); sim.requestSkill(it); req++; next = t + 1.2 + 1.4 * rand(); }
    const a = performance.now(); sim.step(P.req(t)); worst = Math.max(worst, performance.now() - a);
    const act = sim.plan.action.id; if (lastAct != null && act !== lastAct) switches++; lastAct = act; const st = sim.stateAt(sim.t), b = sim.ball.p; if (Math.hypot(b[0] - st.P[0], b[1] - st.P[1]) > 3) far += DT; }
  const u = process.cpuUsage(c0); cpu += (u.user + u.system) / 1000; secs += dur;
  for (const x of sim.log.skill) { const r = (per[x.intent] = per[x.intent] || { PLAYED: 0, REJECTED: 0, CANCELLED: 0 }); r[x.result] = (r[x.result] || 0) + 1; if (x.result === "PLAYED") played++; else if (x.result === "REJECTED") rej++; else canc++; }
  for (const e of sim.poss.log) if (e.from === "CONTROLLED" && e.to === "FREE") { exits++; exitWhy[e.why] = (exitWhy[e.why] || 0) + 1; } missed += sim.contacts.filter((c) => c.missed).length; }
console.log(`■ ${seeds} × ${dur} s · ${req} random manual requests: PLAYED ${played} · REJECTED ${rej} · CANCELLED ${canc} · CONTROLLED exits ${exits} ${JSON.stringify(exitWhy)} · missed contacts ${missed} · ball > 3 m ${far.toFixed(1)} s · action switches ${(switches / secs).toFixed(2)} /s · CPU ${(cpu / secs).toFixed(1)} ms per simulated s · worst tick ${worst.toFixed(1)} ms`);
for (const [k, v] of Object.entries(per).sort()) console.log(`   ${k.padEnd(20)} played ${v.PLAYED || 0} · rejected ${v.REJECTED || 0} · cancelled ${v.CANCELLED || 0}`);

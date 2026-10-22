// vocab1/tools/v_try.mjs — one curated technique run (node): entry speed / exit angle / foot; the intent requested; what happened
//   node v_try.mjs ELASTICO --mode RUN --angle -45 --foot R [--at 2.0] [--dur 2.5]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { intentOf, META_BY_ID } from "../v_meta.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180;
export function tryTech(id, o = {}) { const mode = o.mode || "RUN", ang = o.angle != null ? o.angle : -45, at = o.at || 2.0, dur = o.dur || 2.6;
  const sim = makeSim("TL", { layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: o.pref || "R", style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" });
  for (let k = 0; k < Math.round(at / DT); k++) sim.step({ h: 0, mode, keys: 0 });
  const st0 = sim.stateAt(sim.t), I = intentOf(id); if (I && !o.auto) sim.requestSkill(Object.assign({}, I, { foot: o.foot || null, sprint: !!o.sprint }));
  const t0 = sim.t, c0 = sim.contacts.length, ex0 = sim.poss.log.length;
  for (let k = 0; k < Math.round(dur / DT); k++) sim.step({ h: ang * DEG, mode, keys: 0 });
  const acts = sim.log.actions.filter((a) => a.t >= t0 - 1e-9).map((a) => a.label + (a.m ? (a.m > 0 ? "(R)" : "(L)") : "")), cs = sim.contacts.slice(c0), st = sim.stateAt(sim.t), b = sim.ball.p;
  const exits = sim.poss.log.slice(ex0).filter((e) => e.from === "CONTROLLED" && e.to === "FREE").map((e) => e.why), sk = sim.log.skill.slice(-1)[0] || null;
  return { id, entry: +st0.s.toFixed(2), skill: sk ? { result: sk.result, played: sk.played, alt: sk.alt, rej: sk.rej, after: +((sk.tPlayed || t0) - t0).toFixed(2) } : (sim.skill ? { result: sim.skill.state || "PENDING", rej: sim.skill.rej } : null), acts: [...new Set(acts)], contacts: cs.map((c) => `${c.missed ? "MISS " : ""}${c.F} ${c.surface} ${c.role}`), sep: +Math.hypot(b[0] - st.P[0], b[1] - st.P[1]).toFixed(2), exits, state: sim.poss.state, travel: +(st.h / DEG).toFixed(0), speed: +st.s.toFixed(2), sim }; }
if ((process.argv[1] || "").endsWith("v_try.mjs")) { const r = tryTech(AR[2], { mode: opt("mode", "RUN"), angle: +opt("angle", -45), foot: opt("foot", null), at: +opt("at", 2.0), dur: +opt("dur", 2.6) }); delete r.sim; console.log(JSON.stringify(r, null, 1)); }

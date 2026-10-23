// tc_unified1/tools/u_carry.mjs — THE CARRY AT SPEED: a straight run / sprint (and a steady analog curve) per configuration — touches, the time
// between them, the ball's separation ahead (median / max), the touch roles; and the body's pelvis height range against 88573ef0 (A)
//   node u_carry.mjs [--configs A,AC,ACS,ACS4,FULL]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../u_sim.js";
import { MODES, reqOf } from "../u_tests.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, cfgs = opt("configs", "A,AC,ACS,ACS4,FULL").split(",");
const cases = [["straight run", "RUN", () => 0], ["straight sprint", "SPRINT", () => 0], ["curve 30°/s · run", "RUN", (t) => (t < 3 ? 0 : 30 * (t - 3))], ["curve 30°/s · sprint", "SPRINT", (t) => (t < 3 ? 0 : 30 * (t - 3))]];
for (const [name, mode, f] of cases) { console.log(`■ ${name}`);
  for (const cfg of cfgs) { const sim = makeSim("TL", Object.assign({ layers: presetLayers(cfg.replace(/-(FREE|CONTROLLED)$/, "")) }, /CONTROLLED$/.test(cfg) ? { control: "CONTROLLED" } : {})), M = MODES[mode], n = Math.round(9 / DT), seps = [];
    for (let k = 0; k < n; k++) { sim.step(reqOf(f, k * DT, M)); if (sim.t > 3) { const s = sim.stateAt(sim.t), b = sim.ball.p; seps.push(Math.hypot(b[0] - s.P[0], b[1] - s.P[1])); } }
    const C = sim.contacts.filter((c) => c.t > 3 && !c.missed), gaps = C.slice(1).map((c, i) => c.t - C[i].t), roles = {}; for (const c of C) roles[c.role] = (roles[c.role] || 0) + 1; seps.sort((a, b) => a - b);
    const sp = sim.stateAt(sim.t).s; console.log(`  ${cfg.padEnd(5)} touches ${String(C.length).padStart(2)} · every ${(gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length)).toFixed(2)} s · sep med ${seps[seps.length >> 1].toFixed(2)} max ${seps[seps.length - 1].toFixed(2)} m · speed ${sp.toFixed(1)} · missed ${sim.contacts.filter((c) => c.missed).length} · ${Object.entries(roles).map(([k, v]) => k + "×" + v).join(", ")}`); } }

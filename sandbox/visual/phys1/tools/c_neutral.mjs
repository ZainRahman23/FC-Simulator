// tc_controlled1/tools/c_neutral.mjs — PRESENTATION NEUTRALITY (owner §25): the same input (seeded torture programs, an opponent probe in some)
// run with the body posed every tick (animation ON) and never posed (OFF): the player's movement and the ball (the gameplay hash: centre of mass +
// ball every 4th tick), every contact, every opponent collision, every possession transition and its reason must be identical — the presentation
// never owns CONTROLLED_BALL. Both models.   node c_neutral.mjs [--runs 8] [--dur 20]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, runs = +opt("runs", 8), dur = +opt("dur", 20);
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
let same = 0, total = 0;
let hits = 0;
for (const control of ["FREE", "CONTROLLED"]) for (let i = 1; i <= runs; i++) { const P = program(300 + i, dur); let probe = [];
  // (half the runs: an opponent foot aimed at where the ball really is at 6 s — found by a run without it — arriving from the side at 6 m/s)
  if (i % 2) { const a = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control })); for (let k = 0; k < Math.round(6 / DT); k++) a.step(P.req(k * DT)); const b0 = a.ball.p, u = [Math.cos(1 + i), Math.sin(1 + i)];
    probe = [{ id: "n" + i, kind: "tackle", t0: 5.75, t1: 6.15, p0: [b0[0] - u[0] * (6 * 0.25 + 0.17), b0[1] - u[1] * (6 * 0.25 + 0.17)], v: [u[0] * 6, u[1] * 6], r: 0.07, z: 0.1, e: 0.55 }]; }
  const sig = (pose) => { const sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control, opponent: probe })), body = pose ? new PlayBody(env, sim) : null;
    for (let k = 0; k < Math.round(dur / DT); k++) { sim.step(P.req(k * DT)); if (body) body.pose(sim.t); }
    return JSON.stringify({ hash: sim.hash, contacts: sim.contacts.map((c) => [c.k, c.F, c.role, c.missed ? 1 : 0, c.vOut.map((x) => x.toFixed(6))]), ext: sim.extLog.map((e) => [e.t, e.vOut]), poss: sim.poss.log }); };
  const a = sig(true), b = sig(false); total++; if (JSON.parse(a).ext.length) hits++; if (a === b) same++; else console.log(`DIFFERENT ${control} run ${i}`); }
console.log(`${same}/${total} identical with the body posed every tick and never posed (FREE and CONTROLLED, ${runs} programs × ${dur} s each; ${hits} with an opponent's hit on the ball)`);

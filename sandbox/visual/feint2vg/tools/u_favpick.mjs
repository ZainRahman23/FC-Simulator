// tc_unified1/tools/u_favpick.mjs — THE FAVOURABLE EXAMPLES, picked as the page plays them: for each move, every trace (4 stride phases × both
// sides) of its snap state run with the PAGE's own options (attributes 99, right foot, the page's start spot, seed 1) through FULL; the traces
// where that move is the first action chosen, with its contact / new-line times (simulation only)
//   node u_favpick.mjs
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../u_sim.js";
import { scenSpecs, MODES, reqOf } from "../u_tests.js";
const PAGE = { attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 } };
const W = [["RONALDO CHOP", "RUN", 105], ["CRUYFF TURN", "JOG", 135], ["INSIDE HOOK", "RUN", 135], ["DRAG-BACK", "SPRINT", 180], ["OUTSIDE CUT", "JOG", 75], ["COMPACT INSIDE REDIRECT", "RUN", 75], ["COMPACT OUTSIDE REDIRECT", "RUN", 75], ["BRAKING PIVOT", "JOG", 105], ["BRAKING TOUCH", "JOG", 150], ["BRAKING TOUCH", "RUN", 165], ["URGENT REACH", "JOG", 60], ["GATHER", "JOG", 45]];
for (const [mv, mode, ang] of W) { const hits = [];
  scenSpecs(mode, ang).forEach((sp, i) => { const sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL") })), M = MODES[sp.mode], tIn = sp.changes[0];
    for (let k = 0; k < Math.round(sp.dur / DT); k++) sim.step(reqOf(sp.f, k * DT, M));
    const first = sim.log.actions.find((a) => a.t >= tIn - 1e-9 && !/^(CARRY|STANDING|STOP)$/.test(a.label)); if (first && first.label === mv) hits.push(i); });
  console.log(`${mv.padEnd(26)} ${mode} ${ang}°: traces ${hits.join(" ") || "—"}`); }

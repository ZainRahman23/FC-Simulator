// tackle1/tools/t_smoke.mjs — first checks: the world with an idle tackle is the canonical attacker exactly; one tackle against a jog carry
import { ENV, makeSim } from "../../vocab2/tools/u_env.mjs";
import { caseOpts, runCaseOn } from "../../vocab2/v_run.js";
import { presetLayers, DT, DEG } from "../../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
const c = { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, intents: [] };
// (1) identity
const solo = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })); runCaseOn(solo, c, false);
const enc0 = { c, def: { P: [60, 34.3], h: Math.PI }, defStick: [], tackle: [] };
const W0 = new TackleWorld(ENV, encounterOpts(enc0)); runEncounter(W0, enc0);
console.log("identity: solo", solo.hash, solo.k, "world", W0.att.hash, W0.att.k, solo.hash === W0.att.hash ? "IDENTICAL" : "DIFFERENT");
let maxd = 0; for (let k = 0; k <= solo.k; k++) { const a = solo.ballTrack(k * DT).p, b = W0.att.ballTrack(k * DT).p; maxd = Math.max(maxd, Math.hypot(a[0] - b[0], a[1] - b[1])); } console.log("ball track max diff", maxd);
// where is the attacker at t = 0 and over the case?
for (const t of [0, 0.5, 1.0, 1.5]) { const st = solo.stateAt(solo.t - c.dur + t), b = solo.ballTrack(solo.t - c.dur + t).p; console.log("att t", t, st.P.map((x) => x.toFixed(2)).join(","), st.s.toFixed(2), "ball", b.map((x) => x.toFixed(2)).join(",")); }

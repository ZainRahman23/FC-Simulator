// occupy3b2/tools/b2_ablate.mjs — 3B.2's components one at a time (each a RES3B2 switch), the key numbers per configuration on one set
import { ENV, setOf, arg, cm, limbMeasure } from "../../occupy3b/tools/l3_common.mjs";
import { measure } from "./b2_measure.mjs";
import { runB2 } from "../b2_run.js";
const SET = arg("set", "review"), L = setOf(SET), OFF = { recovery: false, monitor: false, manageOrdinary: false, manageCommitted: false, releasePlant: false, pelvisReach: false, boots: false };
const CFG = JSON.parse(arg("cfg", "null")) || [["3B.1", null], ["none (all off)", OFF], ["recovery", { ...OFF, recovery: true }], ["recovery+monitor", { ...OFF, recovery: true, monitor: true }], ["ordinary", { ...OFF, manageOrdinary: true }], ["committed", { ...OFF, manageCommitted: true }], ["release", { ...OFF, releasePlant: true }], ["pelvis", { ...OFF, pelvisReach: true }], ["boots", { ...OFF, boots: true }], ["ALL", {}]];
console.log(`ABLATION — set ${SET} (${L.length})\n${"config".padEnd(20)}${[">5cm", "torso>5", "deep", "deepTorso", "slide", "crossed", "jump", "jointV", "falls", "steps"].map((x) => x.padStart(10)).join("")}`);
for (const [nm, b2] of CFG) { let t5 = 0, tor = 0, deep = 0, dT = 0, slide = 0, cr = 0, jump = 0, jv = 0, falls = 0, steps = 0;
  const _measure = measure; for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
    const mode = b2 === null ? "S3B" : "S3B2"; const o = measureB2(tc, mode, b2), lm = limbMeasure(runB2.last); t5 += lm.legs5; tor += lm.t5.torso; deep = Math.max(deep, lm.legs); dT = Math.max(dT, lm.pen.torso); slide = Math.max(slide, o.footSlide); cr += o.crossed; jump = Math.max(jump, o.discMax); jv += o.jointV;
    for (const e of o.eps) for (const k of ["ATT", "DEF"]) if (e.players[k]) { falls += e.players[k].fall ? 1 : 0; steps += e.players[k].steps.length; } }
  console.log(`${nm.padEnd(20)}${[t5, tor, cm(deep), cm(dT), cm(slide), cr, cm(jump), jv, falls, steps].map((x) => String(x).padStart(10)).join("")}`); }
function measureB2(tc, mode, b2) { const r0 = runB2.bind(null); const orig = globalThis.__b2opts; globalThis.__b2opts = b2; try { return measure(tc, mode); } finally { globalThis.__b2opts = orig; } }

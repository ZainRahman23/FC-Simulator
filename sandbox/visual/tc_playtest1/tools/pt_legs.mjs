// tc_playtest1/tools/pt_legs.mjs — every structural leg crossing (posed capsules interpenetrating > 20 mm) of the torture suite characterised at its
// worst tick: which segments, each foot planted / swinging, the feet's lateral order in the pelvis frame (crossed or not) and their fore–aft
// separation, a technique stance involved, the action
//   node pt_legs.mjs [--only <substr>] [--modes …]
import { SEQ, MODES } from "./pt_torture.mjs";
import { ENV, makeSim } from "./pt_env.mjs";
import { PlayBody } from "../pt_body.js";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import fs from "node:fs";
const A = process.argv, opt = (k, d) => { const i = A.indexOf("--" + k); return i > 0 ? A[i + 1] : d; };
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))), DT = 1 / 240, DEG = Math.PI / 180, cat = {}, ex = {};
for (const [name, seq] of Object.entries(SEQ)) { if (opt("only") && !name.includes(opt("only"))) continue; for (const mode of opt("modes", "WALK,JOG,RUN,SPRINT").split(",")) { const M = MODES[mode];
  const sim = makeSim({}), body = new PlayBody(Object.assign({}, ENV, { colliders }), sim); let span = null;
  const close = () => { if (!span) return; const w = span.w, k = `${w.which} · ${w.states} · ${w.order} · ${w.tech ? "tech stance" : "gait"}`; cat[k] = (cat[k] || 0) + 1; (ex[k] = ex[k] || []).length < 1 && ex[k].push(`${name} ${mode} @${w.t.toFixed(2)} ${Math.round(w.v * 1000)} mm ${w.action}`); span = null; };
  for (let k = 0; k < Math.round(seq.dur / DT); k++) { const t = k * DT, a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r);
    sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }); const p = body.pose(sim.t), E = Object.entries(p.clr).sort((x, y) => x[1] - y[1]), mn = E[0][1];
    if (mn < -0.02) { const fR = p.feet.R, fL = p.feet.L, psi = p.psi, r = [-Math.sin(psi), Math.cos(psi)], f = [Math.cos(psi), Math.sin(psi)], d = [fR.ank[0] - fL.ank[0], fR.ank[1] - fL.ank[1]], lat = d[0] * r[0] + d[1] * r[1], lon = d[0] * f[0] + d[1] * f[1];
      const w = { t: sim.t, v: mn, which: E[0][0], states: `R ${fR.planted ? "plant" : "swing"} / L ${fL.planted ? "plant" : "swing"}`, order: lat < 0 ? (Math.abs(lon) > 0.25 ? "crossed, apart fore-aft" : "CROSSED") : "uncrossed", tech: (fR.stance && fR.stance.src === "tech") || (fL.stance && fL.stance.src === "tech") || (fR.swing && fR.swing.to.src === "tech") || (fL.swing && fL.swing.to.src === "tech"), action: sim.plan.action.label };
      if (!span) span = { w }; else if (mn < span.w.v) span.w = w; } else close(); } close(); } }
for (const [k, v] of Object.entries(cat).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k.padEnd(62), (ex[k] || []).join(" | "));

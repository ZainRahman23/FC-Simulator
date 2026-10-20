// tc_playtest1/tools/pt_jumps.mjs — every foot jump (> 0.12 m between two ticks) of the torture suite classified: the foot's state before / after
// (planted P / swing S), the same swing or stance or a changed one, a re-plan at that tick, the ball clearance active, the swing inherited
//   node pt_jumps.mjs [--only <substr>] [--modes …] [--examples n]
import { SEQ, MODES } from "./pt_torture.mjs";
import { ENV, makeSim } from "./pt_env.mjs";
import { PlayBody } from "../pt_body.js";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import fs from "node:fs";
const A = process.argv, opt = (k, d) => { const i = A.indexOf("--" + k); return i > 0 ? A[i + 1] : d; };
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))), DT = 1 / 240, DEG = Math.PI / 180, cat = {}, ex = {}, nEx = +opt("examples", 1);
for (const [name, seq] of Object.entries(SEQ)) { if (opt("only") && !name.includes(opt("only"))) continue; for (const mode of opt("modes", "WALK,JOG,RUN,SPRINT").split(",")) { const M = MODES[mode];
  const sim = makeSim({}), body = new PlayBody(Object.assign({}, ENV, { colliders }), sim); let prev = null, pv = -1;
  const sid = (f) => (f.planted ? "P" + f.stance.id : f.swing ? "S" + f.swing.from.id + ">" + f.swing.to.id : "?");
  for (let k = 0; k < Math.round(seq.dur / DT); k++) { const t = k * DT, a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r);
    sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }); const p = body.pose(sim.t), rep = sim.plan.v !== pv; pv = sim.plan.v;
    const cur = {}; for (const X of ["R", "L"]) { const f = p.feet[X]; cur[X] = { ank: f.ank.slice(), planted: f.planted, id: sid(f), cleared: f.cleared || 0, inh: !!(f.swing && f.swing.inherited), stance: f.stance }; }
    if (prev) for (const X of ["R", "L"]) { const f = cur[X], q = prev[X], d = Math.hypot(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]); if (d <= 0.12) continue;
      const kind = `${q.planted ? "P" : "S"}→${f.planted ? "P" : "S"} ${q.id === f.id ? "same" : "changed"}${rep ? " +replan" : ""}${f.cleared || q.cleared ? " +clear" : ""}`;
      cat[kind] = (cat[kind] || 0) + 1; (ex[kind] = ex[kind] || []).length < nEx && ex[kind].push(`${name} · ${mode} @${sim.t.toFixed(3)} ${X} d ${d.toFixed(2)} ${q.id}→${f.id} ${sim.plan.reason}`); }
    prev = cur; } } }
for (const [k, v] of Object.entries(cat).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k.padEnd(34), (ex[k] || []).join(" | "));

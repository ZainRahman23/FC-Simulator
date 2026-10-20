// tc_responsive/tools/rs_neutral.mjs — the authority test (the owner's report §8): the same input with the renderer OFF, ON, and ON with a different
// visual variant (no acknowledgement layer, a different ball clearance) must give the identical gameplay hash, contacts and actions — the
// presentation cannot leak into the simulation
//   node rs_neutral.mjs
import { ENV, makeSim, DT } from "./rs_env.mjs";
import { PlayBody } from "../rs_body.js";
import { SEQ, MODES } from "../pt_torture_seq.js";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import fs from "node:fs";
const env = Object.assign({}, ENV, { colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) }), DEG = Math.PI / 180;
const ackOrig = PlayBody.prototype.ack, clrOrig = PlayBody.prototype.clearOfBall;
function run(name, mode, variant) { const M = MODES[mode], seq = SEQ[name], sim = makeSim("RX"), body = variant === "off" ? null : new PlayBody(env, sim);
  PlayBody.prototype.ack = variant === "variant" ? function () { return { pelvis: 0, torso: 0, head: 0, lean: 0, side: 0, L: 0 }; } : ackOrig;
  PlayBody.prototype.clearOfBall = variant === "variant" ? function (f) { return f; } : clrOrig;
  for (let k = 0; k < Math.round(seq.dur / DT); k++) { const t = k * DT, a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }); if (body) body.pose(sim.t); }
  PlayBody.prototype.ack = ackOrig; PlayBody.prototype.clearOfBall = clrOrig;
  return { hash: sim.hash.toString(16), contacts: JSON.stringify(sim.contacts.map((c) => [c.k, c.F, c.role, c.vOut])), actions: JSON.stringify(sim.log.actions.map((a) => [a.t, a.label])) }; }
let all = true; const lines = [];
for (const name of ["0→90→0→-90 fast", "0→150→30→180 med", "circles 1 Hz cw", "flicks ±90 / 0.25 s", "random #3", "random #7"]) for (const mode of ["JOG", "SPRINT"]) {
  const a = run(name, mode, "off"), b = run(name, mode, "on"), c = run(name, mode, "variant"), same = a.hash === b.hash && b.hash === c.hash && a.contacts === b.contacts && b.contacts === c.contacts && a.actions === b.actions && b.actions === c.actions;
  all = all && same; lines.push(`${same ? "IDENTICAL" : "DIFFERENT"}  ${name} · ${mode}: renderer off ${a.hash} · on ${b.hash} · visual variant ${c.hash}`); }
console.log(lines.join("\n") + `\n${all ? "ALL IDENTICAL" : "NOT ALL IDENTICAL"} — the presentation never affects the simulation`);

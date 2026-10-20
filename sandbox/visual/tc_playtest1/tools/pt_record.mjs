// tc_playtest1/tools/pt_record.mjs — a torture run written as a session record (the page's PT.record() format: start options, every tick's
// request, the stick's raw / analog vector) — the page re-simulates it (PT.load) and its replay shows any instant
//   node pt_record.mjs "<sequence>" <MODE> <out.json>
import { SEQ, MODES } from "../pt_torture_seq.js";
import { makeSim } from "./pt_env.mjs";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import { MODES as MODE_IDS } from "../pt_sim.js";
import fs from "node:fs";
const [name, mode, out] = process.argv.slice(2), seq = SEQ[name], M = MODES[mode], DT = 1 / 240, DEG = Math.PI / 180, sim = makeSim({}), stick = [];
for (let k = 0; k < Math.round(seq.dur / DT); k++) { const t = k * DT, a = seq.f(t), raw = [Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r], v = stickVector(raw[0], raw[1]);
  sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 | (M.sprint ? 128 : 0) }); stick.push(raw[0], raw[1], v.x, v.y); }
fs.writeFileSync(out, JSON.stringify({ o0: sim.o, input: sim.log.input, events: sim.log.events, hash: sim.hash, k: sim.k, stick }));
console.log(`recorded ${name} · ${mode}: ${sim.k} ticks, hash ${sim.hash.toString(16)}`);

// technical_control12/tools/tc12_lists.mjs — the carry clips: old (TECHNICAL-CONTROL-1) beside new (TECHNICAL-CONTROL-1.2) at normal speed for every
// reference player × section, slow motion from behind (the ball's lane) on the key sections, the left-dominant reference's feet up close
//   <id>|<from s>|<to s>|<rate>|<lab query>
import fs from "fs"; import { CARRY_SECTIONS, PLAYERS, carryQuery } from "../tc12_cases.js";
const DUR = { moderate: 4.0, fast: 4.0, left: 4.1, right: 4.1, cut30: 4.0, cut30L: 4.0, cut60: 4.0, cut60L: 4.0, weave: 4.6, accel: 4.5 }, L = ["# TECHNICAL-CONTROL-1.2 carry clips (page time; 1280×720 30 fps)"];
const want = ["moderate", "fast", "left", "right", "cut30", "cut60", "weave", "accel"], P = Object.fromEntries(PLAYERS.map((p) => [p.key, p])), S = Object.fromEntries(CARRY_SECTIONS.map((s) => [s.key, s]));
for (const p of PLAYERS) for (const k of want) L.push(`${p.key}_${k}_cmp_run_1x|0.3|${DUR[k] - 0.2}|1|${carryQuery(S[k], p)}&cmp=model&single=fRun&graph=0&bare=1`);
for (const pk of ["Ldom", "two", "neutral"]) for (const [k, a, b] of [["moderate", 1.0, 2.6], ["weave", 1.2, 2.8]]) L.push(`${pk}_${k}_cmp_rear_025x|${a}|${b}|0.25|${carryQuery(S[k], P[pk])}&cmp=model&single=fRear&graph=0&bare=1`);
for (const pk of ["Ldom", "neutral"]) L.push(`${pk}_weave_cmp_top_05x|1.0|3.4|0.5|${carryQuery(S.weave, P[pk])}&cmp=model&single=fTopRun&graph=0&bare=1`);
for (const [k, a, b] of [["moderate", 1.0, 2.4], ["cut60", 1.3, 2.6], ["weave", 1.2, 2.6]]) L.push(`Ldom_${k}_quad_05x|${a}|${b}|0.5|${carryQuery(S[k], P.Ldom)}&single=quad&graph=0&bare=1`);
fs.mkdirSync(new URL("./clip_lists/", import.meta.url), { recursive: true }); fs.writeFileSync(new URL("./clip_lists/tc12_clips.txt", import.meta.url), L.join("\n") + "\n"); console.log(L.length - 1, "clips");

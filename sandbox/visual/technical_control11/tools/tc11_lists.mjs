// technical_control11/tools/tc11_lists.mjs — writes the clip and strip lists from the feet review set (tc11_cases.js)
//   clips:  <id>|<from s>|<to s>|<rate>|<lab query>        strips: <id>|<from s>|<to s>|<view>|<lab query>
import fs from "fs"; import { FEET_SET, labQuery } from "../tc11_cases.js";
const C = ["# TECHNICAL-CONTROL-1.1 feet clips (page time; 1280×720 30 fps): quad = front 3/4 · rear 3/4 · side · foot level; cmp = TC1 body | TC1.1 body (same simulation)"], St = ["# TECHNICAL-CONTROL-1.1 contact strips: every contact in the window, −83 / −42 / 0 / +42 / +83 ms"];
for (const e of FEET_SET) { const q99 = labQuery(e, [99, 99, 99]), [a, b] = e.win;
  C.push(`${e.key}_99_quad_1x|${a}|${b}|1|${q99}&single=quad&graph=0&bare=1`, `${e.key}_99_quad_025x|${a}|${b}|0.25|${q99}&single=quad&graph=0&bare=1`, `${e.key}_99_cmp_foot_05x|${a}|${b}|0.5|${q99}&cmp=body&single=fFoot&graph=0&bare=1`, `${e.key}_99_cmp_34_05x|${a}|${b}|0.5|${q99}&cmp=body&single=fF34&graph=0&bare=1`);
  for (const r of [80, 50]) C.push(`${e.key}_${r}_quad_05x|${a}|${b + 0.3}|0.5|${labQuery(e, [r, r, r])}&single=quad&graph=0&bare=1`);
  St.push(`${e.key}_99_foot|${a}|${b}|fFoot|${q99}`, `${e.key}_99_34|${a}|${b}|fF34|${q99}`, `${e.key}_99_cmp|${a}|${b}|fFoot|${q99}&cmp=body`); }
fs.mkdirSync(new URL("./clip_lists/", import.meta.url), { recursive: true }); fs.writeFileSync(new URL("./clip_lists/tc11_clips.txt", import.meta.url), C.join("\n") + "\n"); fs.writeFileSync(new URL("./clip_lists/tc11_strips.txt", import.meta.url), St.join("\n") + "\n"); console.log(C.length - 1, "clips", St.length - 1, "strips");

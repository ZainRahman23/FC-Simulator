// technical_control13/tools/tc13_lists.mjs — the review clip and strip lists for the transition torture set: before (TECHNICAL-CONTROL-1.2's legs) beside
// after (TECHNICAL-CONTROL-1.3) on the same simulation, around the receive (times from the first contact, "r" = relative).
//   node tc13_lists.mjs <clips.txt> <strips.txt>
import fs from "fs"; import { tortureIds } from "../tc13_cases.js";
const PRIORITY = ["RL_0_SPRINT_NORMAL", "L_30_RUN_NORMAL", "ST_30_V12", "L_60_RUN_NORMAL", "ST_90_V12", "ST_90L_V12", "ST_90_V12@L@DOMINANT_CLOSE", "L_60_RUN_NORMAL@L@DOMINANT_CLOSE", "ST_180_V12", "ST_180L_V12", "L_150_RUN_NORMAL", "L_90_SPRINT_NORMAL", "F_180R_SPRINT_NORMAL"];
const q = (spec, view) => { const [id, foot, style] = spec.split("@"); return `case=${id}&b=99&d=99&a=99${foot ? "&foot=" + foot : ""}${style ? "&style=" + style : ""}&cmp=flow&single=${view}&graph=0&bare=1`; };
const name = (spec) => spec.replace(/@/g, "_").replace(/DOMINANT_CLOSE/, "Ldom");
const clips = ["# TECHNICAL-CONTROL-1.3 transition clips: before | after on the same simulation (r = s from the first contact; 1280×720 30 fps)"], strips = ["# frame strips around receive → carry: id|offsets|view|query"];
for (const { spec } of tortureIds()) {
  clips.push(`${name(spec)}_cmp_run_1x|r-0.5|r1.6|1|${q(spec, "fRun")}`);
  clips.push(`${name(spec)}_cmp_quad_05x|r-0.3|r0.9|0.5|${q(spec, "quad")}`);
  strips.push(`${name(spec)}_f34|-0.10,-0.05,0,0.05,0.10,0.15,0.20,0.25,0.30,0.35,0.40,0.50|${q(spec, "fF34")}`);
  if (PRIORITY.includes(spec)) {
    clips.push(`${name(spec)}_cmp_rear_025x|r-0.15|r0.6|0.25|${q(spec, "fR34")}`);
    clips.push(`${name(spec)}_cmp_side_025x|r-0.15|r0.6|0.25|${q(spec, "fSide")}`);
    clips.push(`${name(spec)}_cmp_foot_025x|r-0.15|r0.6|0.25|${q(spec, "fFoot")}`);
    strips.push(`${name(spec)}_foot|-0.10,-0.05,0,0.05,0.10,0.15,0.20,0.25,0.30,0.35,0.40,0.50|${q(spec, "fFoot")}`);
  } }
fs.writeFileSync(process.argv[2], clips.join("\n") + "\n"); fs.writeFileSync(process.argv[3], strips.join("\n") + "\n"); console.log(clips.length - 1, "clips", strips.length - 1, "strips");

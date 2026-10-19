// technical_control14/tools/tc14_lists.mjs — the review clip and strip lists (owner §19): Dribbling 99 | 80 | 50 on the same 60 / 90 / 120 / 150° (and 180°)
// direction change at 5.5 m/s (Ball Control / Agility 99), the chop at normal speed and slowed, TECHNICAL-CONTROL-1.2 vs 1.4 at 99. Times from the
// first contact ("r"; the course starts at 0.025 s); the turn is asked at 1.2 s (+ 0.2 s per seed).   node tc14_lists.mjs <clips.txt> <strips.txt>
import fs from "fs";
const tReq = (seed) => 1.2 + 0.2 * ((seed - 1) % 3) - 0.025, q = (cas, seed, extra) => `case=${cas}&b=99&a=99&seed=${seed}${extra}&graph=0&bare=1`, clips = ["# TECHNICAL-CONTROL-1.4 clips (r = s from the first contact; 1280×720 30 fps)"], strips = ["# frame strips: id|offsets|query"];
const W = (seed, a, b) => [`r${(tReq(seed) + a).toFixed(3)}`, `r${(tReq(seed) + b).toFixed(3)}`];
for (const ang of [60, 90, 120, 150, 180]) { const [a1, b1] = W(1, -0.5, 1.6), [a2, b2] = W(1, -0.2, 1.0);
  clips.push(`dri_${ang}_run_1x|${a1}|${b1}|1|${q(`CUT${ang}`, 1, "&cmp=dri&single=fRun")}`);
  clips.push(`dri_${ang}_quad_05x|${a2}|${b2}|0.5|${q(`CUT${ang}`, 1, "&cmp=dri&single=quad")}`);
  clips.push(`eff_${ang}_run_1x|${a1}|${b1}|1|${q(`CUT${ang}`, 1, "&d=99&cmp=eff&single=fRun")}`);
  strips.push(`dri_${ang}_run|${[-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7].map((x) => (tReq(1) + x).toFixed(3)).join(",")}|${q(`CUT${ang}`, 1, "&cmp=dri&single=fRun")}`); }
for (const ang of [120, 150]) { const [a1, b1] = W(2, -0.5, 1.6); clips.push(`dri_${ang}L_run_1x|${a1}|${b1}|1|${q(`CUT${ang}_L`, 2, "&cmp=dri&single=fRun")}`); }
// THE CHOP (Dribbling 99, a 120° turn to the right, seed 1): normal speed, then slowed, from each side
{ const [a1, b1] = W(1, -0.6, 1.4), [a2, b2] = W(1, -0.15, 0.7), [a3, b3] = W(1, -0.05, 0.5);
  clips.push(`chop120_run_1x|${a1}|${b1}|1|${q("CUT120", 1, "&d=99&single=fRun")}`); clips.push(`chop120_rear_1x|${a1}|${b1}|1|${q("CUT120", 1, "&d=99&single=fRear")}`);
  clips.push(`chop120_quad_05x|${a2}|${b2}|0.5|${q("CUT120", 1, "&d=99&single=quad")}`);
  for (const v of ["fF34", "fR34", "fSide", "fFoot"]) clips.push(`chop120_${v}_025x|${a3}|${b3}|0.25|${q("CUT120", 1, `&d=99&single=${v}`)}`);
  clips.push(`chop150_run_1x|${a1}|${b1}|1|${q("CUT150", 1, "&d=99&single=fRun")}`);
  for (const v of ["fF34", "fFoot", "fRear"]) strips.push(`chop120_${v}|${[-0.05, 0.05, 0.12, 0.17, 0.2, 0.22, 0.25, 0.3, 0.35, 0.45, 0.55, 0.7].map((x) => (tReq(1) + x).toFixed(3)).join(",")}|${q("CUT120", 1, `&d=99&single=${v}`)}`); }
fs.writeFileSync(process.argv[2], clips.join("\n") + "\n"); fs.writeFileSync(process.argv[3], strips.join("\n") + "\n"); console.log(clips.length - 1, "clips", strips.length - 1, "strips");

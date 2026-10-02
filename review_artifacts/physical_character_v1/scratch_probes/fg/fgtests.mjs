// the harness Foot-gate tests reproduce the measured evaluation runs (start R@0.5) bit-identically
import fs from "fs"; import { J, body, G2 } from "./lib.mjs";
const D = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/foot_gate/json";
for (const f of ["F0", "F1", "F2", "F2h"]) for (const [tag, file] of [["same", `walkA_sameMaps_${f}.json`], ["own", `walkA_ownR2_${f}.json`]]) {
  const { spec, poses } = body(f), steps = Array.from({ length: 30 }, (_, i) => ({ sw: i % 2 === 0 ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const r = G2.runG2a(J, spec, `FG_${tag}_${f}`, { poses, keepStates: true, seconds: 1.6 + 30 * 0.58, rhythmOver: { steps, at: 0.5 } });
  const ref = JSON.parse(fs.readFileSync(`${D}/${file}`, "utf8")).starts.find(s => s.first === "R" && s.at === 0.5).hash;
  console.log(`FG_${tag}_${f}`.padEnd(12), r.hash, ref, r.hash === ref ? "IDENTICAL" : "DIFFERENT"); }

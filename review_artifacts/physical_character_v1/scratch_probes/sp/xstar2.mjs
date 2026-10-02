import fs from "fs"; import { fixedPointA } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_walker.js";
const JD = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json";
for (const pre of ["m_dds05_tau", "m_dds10_tau", "m8a_tau"]) { const M = JSON.parse(fs.readFileSync(`${JD}/${pre}0.json`, "utf8")); for (const u of [[0.22, 0.28, 0.40], [0.25, 0.28, 0.40]]) console.log(pre, "u*", u.join(","), "→ x*", fixedPointA(M, u).x.map(v => v.toFixed(3)).join(", ")); }

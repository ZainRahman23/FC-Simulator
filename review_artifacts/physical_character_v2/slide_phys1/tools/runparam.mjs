// run a parameter vector at one speed, save record
const RUN = await import("file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v2/review_artifacts/physical_character_v2/slide_phys1/scripts/sp_run.mjs");
const P = await import("file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v2/review_artifacts/physical_character_v2/slide_phys1/scripts/sp_param.mjs");
const L = await import("file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v2/review_artifacts/physical_character_v2/slide_phys1/scripts/sp_lib.mjs");
import fs from "fs";
const u = JSON.parse(fs.readFileSync(process.argv[2])), speed = +process.argv[3], out = process.argv[4], steps = +(process.argv[5] || 480);
const cand = P.makeCand(P.toPhys(u), speed, process.argv[6] || "S"), o = await RUN.runCand(cand, { steps }); const m = P.measures(o), c = P.cost(m); delete m.S;
L.writeGz(out, o); console.log(speed, o.finalHash, c.total.toFixed(3), JSON.stringify(c.parts), JSON.stringify({ entryT: m.entryT, first: m.first, knee: m.kneeAtEntry, ahead: m.footAhead, vy: m.vyEntry, vh: m.vhEntry, slide: m.slideDist, stopT: m.stopT, recl: m.reclineMean, minBelly: m.minBelly, headT: m.headT }));

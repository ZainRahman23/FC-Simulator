// turn1/tools/t1_posters.cjs — poster frames for the review videos: the plant touchdown (cuts / pivots) or request + 0.45 s (arcs), from TURN1_check.json.
// usage: node t1_posters.cjs <ffmpeg>   (reads / writes review_artifacts/turn1/review/{video,posters})
const fs = require("fs"), path = require("path"), cp = require("child_process"), SCN = require("../turn1_scenarios.js");
const RA = path.resolve(__dirname, "../../../../review_artifacts/turn1"), R = path.join(RA, "review"), C = JSON.parse(fs.readFileSync(path.join(RA, "evidence", "TURN1_check.json"), "utf8")).scenarios, FF = process.argv[2] || "ffmpeg";
fs.mkdirSync(path.join(R, "posters"), { recursive: true }); let n = 0;
for (const f of fs.readdirSync(path.join(R, "video"))) { if (!/\.mp4$/.test(f) || /_025x|_GAME1x/.test(f)) continue; const id = f.replace(".mp4", ""), c = C[id], s = SCN.get(id);
  const tc = s.cmds && s.cmds.length ? s.cmds[0].t : 1.0, tt = c && c.plantAfterS != null ? tc + c.plantAfterS + 0.08 : tc + 0.45, vt = Math.max(0.05, tt - 0.5);
  cp.execFileSync(FF, ["-loglevel", "error", "-y", "-ss", vt.toFixed(3), "-i", path.join(R, "video", f), "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "5", path.join(R, "posters", id + ".jpg")]); n++; }
console.log("posters", n);

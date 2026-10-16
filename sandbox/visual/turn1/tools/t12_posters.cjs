// turn1/tools/t12_posters.cjs — one poster per TURN-1.2 review video: the frame just after the turn plant (TURN-1.2's timing) or +0.45 s after the request
const { X, T } = require("./t1_metrics.cjs"), SCN = require("../turn1_scenarios.js"), fs = require("fs"), path = require("path"), cp = require("child_process");
const RA = path.resolve(__dirname, "../../../../review_artifacts/turn1/turn12/review"), FF = process.env.FFMPEG || "ffmpeg", plantT = {};
const tPlant = (id) => { if (plantT[id] != null) return plantT[id]; const s = SCN.get(id), A = T.t1Make(X.skel, Object.assign({}, s.init, { turn12: true })); for (let k = 0; k < s.dur * 240; k++) T.t1Step(A, T.t1Input(s, k / 240));
  const e = A.events.find(q => q[1] === "TD" && q[3] === "PLANT"), r = A.events.find(q => q[1] === "TD" && q[3] === "REORG"); return (plantT[id] = e ? e[0] - 0.02 : r ? r[0] : (s.cmds && s.cmds.length ? s.cmds[0].t + 0.45 : 1.5)); };
fs.mkdirSync(path.join(RA, "posters"), { recursive: true });
for (const f of fs.readdirSync(path.join(RA, "video")).filter(f => f.endsWith(".mp4"))) {
  const base = f.replace(".mp4", ""), m = base.match(/^(W3|W3Z|W3C|W3R|T12)_(.+)$/), slow = base.endsWith("_025x"), id = (m ? m[2] : base).replace(/_025x$/, "");
  const t0 = m ? (slow ? 0.9 : 0.6) : 0.5, rate = slow ? 0.25 : 1, ct = Math.max(0, (tPlant(id) - t0) / rate);
  cp.execFileSync(FF, ["-loglevel", "error", "-y", "-ss", ct.toFixed(3), "-i", path.join(RA, "video", f), "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", "-q:v", "4", path.join(RA, "posters", base + ".jpg")]);
}
console.log("posters", fs.readdirSync(path.join(RA, "posters")).length);

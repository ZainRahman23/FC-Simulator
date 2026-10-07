import fs from "fs"; import zlib from "zlib"; import { e2Spec } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/gates/v2_e2.js"; import { jointAxisCapacities } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/spec/v2_actuators.js";
const res = [];
for (const f of fs.readdirSync("runs").filter(x => x.startsWith("cf_d1guard") && x.endsWith(".json.gz"))) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync("runs/" + f))), body = f.split("_")[2], spec = e2Spec(body), M = spec.bodies.reduce((s, b) => s + b.mass, 0);
  const legK = o.actAxes.map(a => a.k).filter((v, i, a) => a.indexOf(v) === i); let worst = { r: 0 };
  for (const r of o.rows) { if (!r.L) continue; r.L.forEach((ax, j) => ax && ax.forEach((x, i) => { if (!x) return; const k = legK[j]; const caps = jointAxisCapacities(spec.joints[k], M), c = caps["xyz"[i]]; if (!c) return; const cap = Math.max(c.plus.Nm, c.minus.Nm);
    const rr = Math.abs(x.tau0 - (x.d1 || 0)) / cap; if (rr > worst.r) worst = { r: rr, axis: spec.joints[k].name + "." + "xyz"[i], tau: x.tau0 - (x.d1||0), cap, t: r.t }; })); }
  res.push([f.replace("cf_d1guard_", "").replace(".json.gz", ""), worst]); }
res.sort((a, b) => b[1].r - a[1].r); for (const [f, w] of res.slice(0, 8)) console.log(f, w.r.toFixed(2), w.axis, w.tau.toFixed(1), w.cap.toFixed(1), w.t);

// receive_kill12/tools/rk_bodycheck.mjs — the placeholder body at EVERY contact of an episode: distance from the ball centre to the contact segment
import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepare, runEpisode, DT, at } from "../rk_sim.js"; import { KillBody } from "../rk_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")); const X = loadTurn1();
const segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]))); return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); };
const conds = [{ v: 12 }, { v: 22 }, { v: 8, h: 0.40, drop: 25 }, { v: 6, h: 0.95, drop: 35, surface: "THIGH" }, { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 6, h: 1.78, drop: 15, surface: "HEAD" }, { v: 10, h: 2.0, drop: 20 }];
for (const c of conds) for (const bc of [99, 50, 10]) {
  const P = prepare(c), ep = runEpisode(P, bc, { example: "TYPICAL" }), B = new KillBody(X.RUN1_V13, X.M4, X.skel, P, ep), out = [];
  for (const k of ep.contacts) { const t = (P.kc + k.i) * DT, ball = at({ rec: ep.rec }, k.i).p, J = B.poseAt(t, ball).J, sd = k.sf.side === "L" ? "L" : "R";
    const segs = { FOOT: ["foot_" + sd, "toe_" + sd, "shin_" + sd], THIGH: ["thigh_" + sd], CHEST: ["chest"], HEAD: ["head"] }[k.sf.S.group]; out.push(`${k.sf.key} ${Math.min(...segs.map((n) => segD(ball, J[n].j, J[n].t))).toFixed(3)}`); }
  console.log(JSON.stringify(c).padEnd(46), "BC" + bc, out.join(" → "));
}

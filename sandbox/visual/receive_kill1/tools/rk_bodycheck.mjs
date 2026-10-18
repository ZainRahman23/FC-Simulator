// receive_kill1/tools/rk_bodycheck.mjs — the placeholder body at the CONTACT marker: distance from the ball centre to the contact segment
import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepare, DT } from "../rk_sim.js"; import { KillBody } from "../rk_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")); const X = loadTurn1();
const segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]))); return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); };
const conds = [{ v: 12 }, { v: 3, h: 0.40, drop: 25 }, { v: 8, h: 0.40, drop: 25 }, { v: 12, bear: 60 }, { v: 8, h: 0.95, drop: 35, surface: "THIGH" }, { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 8, h: 1.78, drop: 15, surface: "HEAD" }, { v: 10, h: 2.0, drop: 20 }, { v: 12, h: 0.3, drop: -12 }];
for (const c of conds) {
  const P = prepare(c), B = new KillBody(X.RUN1_V13, X.M4, X.skel, P), k = P.kc, ball = P.contact, pz = B.poseAt(k * DT, ball), J = pz.J, sd = P.plan.sf.side === "L" ? "L" : "R";
  const segs = { FOOT: ["foot_" + sd, "toe_" + sd, "shin_" + sd], THIGH: ["thigh_" + sd], CHEST: ["chest"], HEAD: ["head"] }[P.plan.sf.S.group];
  const d = segs.map((n) => [n, segD(ball, J[n].j, J[n].t)]);
  console.log(JSON.stringify(c).padEnd(48), P.plan.sf.key.padEnd(14), "ball", ball.map((x) => x.toFixed(2)).join(","), "|", d.map(([n, x]) => `${n} ${x.toFixed(3)}`).join("  "), "| pelvis", J.pelvis.j.map((x) => x.toFixed(2)).join(","), "head", J.head.t.map((x) => x.toFixed(2)).join(","));
}

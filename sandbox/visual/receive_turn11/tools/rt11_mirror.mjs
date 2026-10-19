// receive_turn11/tools/rt11_mirror.mjs — ANATOMICAL MIRRORING of the human body, no hidden right-foot bias: a RIGHT-footed receiver's +θ turn and a
// LEFT-footed receiver's −θ turn (and a two-footed receiver's +θ / −θ) must be mirror images — the same family, the opposite foot, and every posed
// joint mirrored (local [f, r, z] → [f, −r, z], _R ↔ _L) at every sampled time (to 1e-5 m: float32 FK).   node rt11_mirror.mjs <out.json>
import fs from "fs"; import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepareTurn, runTurn } from "../../receive_turn1/rt_sim.js"; import { HumanTurnBody } from "../rt11_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const swap = (n) => (n.endsWith("_R") ? n.slice(0, -2) + "_L" : n.endsWith("_L") ? n.slice(0, -2) + "_R" : n);
const R = { pairs: 0, sameFamily: 0, oppositeFoot: 0, exact: 0, maxJointDev: 0, worst: null, posesCompared: 0, kinds: {} };
for (const [kind, pa, pb] of [["R-footed +θ vs L-footed −θ", "R", "L"], ["two-footed +θ vs −θ", null, null]]) { const K = (R.kinds[kind] = { pairs: 0, exact: 0, maxJointDev: 0 });
  for (const v of [6, 12, 18]) for (const a of [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]) for (const fam of [undefined, "OUTSIDE_TURN"]) {
    if (fam && v > 6) continue; const ca = { v, theta: a, pref: pa, family: fam }, cb = { v, theta: -a, pref: pb, family: fam }; if (a === 0) continue;   // (0°: no turn side to mirror)
    const Pa = prepareTurn(ca), Pb = prepareTurn(cb); if (Pa.A.none || Pb.A.none) continue;
    for (const bc of [50, 99]) { const ea = runTurn(Pa, bc, { seed: 3 }, { every: 1 }), eb = runTurn(Pb, bc, { seed: 3 }, { every: 1 }), Ba = new HumanTurnBody(X.RUN1_V13, X.M4, X.skel, Pa, ea), Bb = new HumanTurnBody(X.RUN1_V13, X.M4, X.skel, Pb, eb);
      R.pairs++; K.pairs++; if (Pa.A.fid === Pb.A.fid) R.sameFamily++; if (Pa.A.F !== Pb.A.F) R.oppositeFoot++; let dev = 0, at = null;
      for (let t = -0.9; t <= 2.0; t += 1 / 30) { const ja = Ba.poseAt(Pa.kc / 240 + t, null).J, jb = Bb.poseAt(Pb.kc / 240 + t, null).J; R.posesCompared++;
        for (const n of Object.keys(ja)) { const p = ja[n].j, q = jb[swap(n)].j, d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] + q[1]), Math.abs(p[2] - q[2])); if (d > dev) { dev = d; at = [n, +t.toFixed(3)]; } } }
      if (dev < 1e-5) { R.exact++; K.exact++; } K.maxJointDev = Math.max(K.maxJointDev, dev); if (dev > R.maxJointDev) { R.maxJointDev = dev; R.worst = { kind, v, theta: a, bc, family: Pa.A.fid, footA: Pa.A.F, footB: Pb.A.F, joint: at }; } } } }
R.note = "exact = every posed joint mirrored within 1e-5 m (the rig's FK runs in float32 at world coordinates ~40 m: 1 ulp = 3.8e-6 m) (two-footed pairs: the simulation's mirror is exact to 1e-9 m; footed pairs: the RECEIVE-TURN-1 selection mirrors the preferred foot)";
fs.writeFileSync(process.argv[2] || "rt11_mirror.json", JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));

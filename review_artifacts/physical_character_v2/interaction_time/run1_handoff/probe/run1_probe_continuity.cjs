// RUN-1 → V2 handoff contract draft, READ-ONLY probe of RUN-1 (loaded through RUN-1's own loader; nothing in RUN-1 is written). Usage: [RUN1_WT=<locomotion-v2-run1 worktree>] node run1_probe_continuity.cjs
const path = require("path"), RUN1_WT = process.env.RUN1_WT || path.resolve(__dirname, "../../../../../../locomotion-v2-run1");
const { loadRun1 } = require(path.join(RUN1_WT, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1(), skel = X.charSkel("vinicius"), bones = skel.bones;
for (const v of [3.0, 5.5, 7.8]) {
  const A = X.r1Make(skel), G = X.r1Prepare(A, v), p = G.p; G.accLean = 0; const T = p.T;
  const P = (u) => { const pose = X.r1Pose(G, ((u % 1) + 1) % 1, null), fk = X.r1FK(G, pose, null); return { P: fk.P, legs: pose.legs }; };
  const N = 4000, du = 1 / N, e = 1e-7; const worst = [];
  for (let i = 0; i < N; i++) { const u = i * du; const a = P(u - e), b = P(u), c = P(u + e);
    // one-sided velocities just left and right of u (m/s); a jump means a C0-only point
    for (const bn of bones) { const k = bn.idx; const vl = [0, 1, 2].map(j => (b.P[k][j] - a.P[k][j]) / (e * T)), vr = [0, 1, 2].map(j => (c.P[k][j] - b.P[k][j]) / (e * T)); const d = Math.hypot(vl[0] - vr[0], vl[1] - vr[1], vl[2] - vr[2]);
      if (d > 0.02) worst.push({ u: +u.toFixed(5), bone: bn.name, jumpMs: +d.toFixed(3), legR: b.legs.R.st ? "st s=" + b.legs.R.s.toFixed(4) : "sw w=" + b.legs.R.w.toFixed(4), legL: b.legs.L.st ? "st s=" + b.legs.L.s.toFixed(4) : "sw w=" + b.legs.L.w.toFixed(4) }); } }
  worst.sort((x, y) => y.jumpMs - x.jumpMs);
  const byU = {}; for (const w of worst) { const key = w.u; if (!byU[key] || byU[key].jumpMs < w.jumpMs) byU[key] = w; }
  console.log("v", v, "D", p.D.toFixed(4), "flatS", p.flatS.toFixed(4), "heelRiseS", p.heelRiseS.toFixed(4), "points with a joint-velocity jump > 0.02 m/s:", Object.keys(byU).length);
  console.log(Object.values(byU).sort((x, y) => y.jumpMs - x.jumpMs).slice(0, 8).map(w => JSON.stringify(w)).join("\n"));
}

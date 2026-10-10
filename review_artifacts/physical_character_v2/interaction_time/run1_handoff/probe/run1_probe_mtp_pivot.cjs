// RUN-1 → V2 handoff contract draft, READ-ONLY probe of RUN-1 (loaded through RUN-1's own loader; nothing in RUN-1 is written). Usage: [RUN1_WT=<locomotion-v2-run1 worktree>] node run1_probe_mtp_pivot.cjs
const path = require("path"), RUN1_WT = process.env.RUN1_WT || path.resolve(__dirname, "../../../../../../locomotion-v2-run1");
const { loadRun1 } = require(path.join(RUN1_WT, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1(), skel = X.charSkel("vinicius"), R3 = X.R3, bi = Object.fromEntries(skel.bones.map(b => [b.name, b.idx]));
for (const v of [3.0, 5.5, 7.8]) { const A = X.r1Make(skel), G = X.r1Prepare(A, v), p = G.p; G.accLean = 0; const T = p.T, h = 1e-5;
  const st = (t) => { const u = ((t / T) % 1 + 1) % 1, pose = X.r1Pose(G, u, null), fk = X.r1FK(G, pose, null); const P = fk.P.map(x => x.slice()); for (const q of P) q[2] += v * t; return { pose, P, R: fk.R }; };
  const bins = { "mtp<2": 0, "2-20": 0, "20-40": 0, "40-52": 0 };
  for (let i = 0; i < 2000; i++) { const t = T * i / 2000, a = st(t - h), b = st(t), c = st(t + h); const lg = b.pose.legs.R; if (!lg.st || lg.s <= p.heelRiseS) continue;
    const mtp = R3.angle(b.R[bi.foot_R], b.R[bi.toe_R]) * 180 / Math.PI, vm = Math.hypot(...[0, 1, 2].map(k => (c.P[bi.toe_R][k] - a.P[bi.toe_R][k]) / (2 * h)));
    const k = mtp < 2 ? "mtp<2" : mtp < 20 ? "2-20" : mtp < 40 ? "20-40" : "40-52"; bins[k] = Math.max(bins[k], +vm.toFixed(4)); }
  console.log("v", v, "max MTP-joint world speed during heel-up stance, by MTP extension (deg):", JSON.stringify(bins)); }

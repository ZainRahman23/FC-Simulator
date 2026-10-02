// calibration data for the unified predictor: every in-swing decision (τ, x, the stance geometry it saw) + the ACTUAL forward capture point
// (relative to the stance centre) at 0.05 s steps until the touchdown
import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c; import fs from "fs";
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), out = process.argv[4];
const { spec, poses } = body("F0"), rows = [];
for (const [first, at] of [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]]) {
  const n = 16, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, U = P._uni, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = P.exec.done.filter(d => d.kind === "rhythmic");
  for (const lg of U.stepLog) { const d = D.find(e => e.stepIndex === lg.i); if (!d || !d.td || d.td.t > tF - 0.1) continue; const fw = (a) => (a[0] - d.pSt[0]) * hd[0] + (a[1] - d.pSt[1]) * hd[1];
    const traj = r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t + 1e-9 && q.n % 6 === 0).map(q => [q.t - d.tSw0, fw(q.xi)]);
    rows.push({ start: first + at, k: lg.i, liftT: d.liftoff ? d.liftoff.t - d.tSw0 : null, tdT: d.td.t - d.tSw0, xiTd: fw(d.td.xi), dec: lg.dec.map(e => ({ tau: e.tau, x: e.x[0], T: e.T, pred: e.pred, sole: e.sole })), traj }); } }
fs.writeFileSync(out, JSON.stringify(rows)); console.log("steps", rows.length);

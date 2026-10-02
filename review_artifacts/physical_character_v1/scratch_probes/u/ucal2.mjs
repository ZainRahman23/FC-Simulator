// calibration data v2: every decision's full simulation inputs + the actual forward and sideways capture point (rel. stance) over the step
import { J, body, G2, M } from "../fg/lib.mjs"; import fs from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), out = process.argv[4], starts = JSON.parse(process.argv[5] || '[["R",0.5],["R",0.55],["R",0.6],["L",0.5],["L",0.55],["L",0.6]]');
const { spec, poses } = body("F0"), rows = [];
for (const [first, at] of starts) {
  const n = 18, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl, logSim: true }) } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, U = P._uni, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = P.exec.done.filter(d => d.kind === "rhythmic");
  for (const lg of U.stepLog) { const d = D.find(e => e.stepIndex === lg.i); if (!d || !d.td || d.td.t > tF - 0.1 || !lg.sim) continue; const sd = d.sw === "R" ? 1 : -1;
    const fw = (a) => (a[0] - d.pSt[0]) * hd[0] + (a[1] - d.pSt[1]) * hd[1], lt = (a) => ((a[0] - d.pSt[0]) * rt[0] + (a[1] - d.pSt[1]) * rt[1]) * sd;
    const traj = r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t + 1e-9 && q.n % 3 === 0).map(q => [q.t - d.tSw0, fw(q.xi), lt(q.xi), q.copSmooth ? fw(q.copSmooth) : null, q.copSmooth ? lt(q.copSmooth) : null]);
    const nx = D.find(e => e.stepIndex === lg.i + 1), qn = nx && nx.tSw0 < tF ? r.recs.find(q => q.t >= nx.tSw0 - 1e-9) : null;
    const next = qn ? [(qn.xi[0] - nx.pSt[0]) * hd[0] + (qn.xi[1] - nx.pSt[1]) * hd[1], ((qn.xi[0] - nx.pSt[0]) * rt[0] + (qn.xi[1] - nx.pSt[1]) * rt[1]) * -sd] : null;
    rows.push({ start: first + at, k: lg.i, liftT: d.liftoff ? d.liftoff.t - d.tSw0 : null, tdT: d.td.t - d.tSw0, ach: [fw(d.td.center), lt(d.td.center)], next, Tds: nx ? nx.tSw0 - d.td.t : null, sim: lg.sim.filter((_, j) => j % 2 === 0), traj }); } }
fs.writeFileSync(out, JSON.stringify(rows)); console.log("steps", rows.length);

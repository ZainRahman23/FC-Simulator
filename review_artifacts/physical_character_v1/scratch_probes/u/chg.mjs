import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), humanX = process.argv[4] ? JSON.parse(process.argv[4]) : null; const CH = [];
const { spec, poses } = body("F0");
for (const [first, at] of [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]]) {
  const n = 16, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, ...(humanX ? { humanOver: humanX } : {}), onLoco: l => { LOCO = l; } });
  const U = LOCO.planner._uni, D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic"), tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)];
  for (const lg of U.stepLog) { if (!lg.dec.length) continue; const d = D.find(e => e.stepIndex === lg.i); if (!d || !d.td || d.td.t > tF) continue; const a = lg.dec[0], b = lg.dec[lg.dec.length - 1];
    const ach = (d.td.center[0] - d.pSt[0]) * hd[0] + (d.td.center[1] - d.pSt[1]) * hd[1]; let maxStep = 0; for (let j = 1; j < lg.dec.length; j++) maxStep = Math.max(maxStep, Math.abs(lg.dec[j].u - lg.dec[j - 1].u));
    CH.push({ dU: b.u - a.u, dT: b.T - a.T, maxStep, tauLast: b.tau, err: ach - b.u, errInit: ach - a.u }); } }
const st = (k, f = 100) => { const a = CH.map(c => c[k] * f); const m = a.reduce((s, x) => s + x, 0) / a.length; return `${m.toFixed(1)}±${Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length).toFixed(1)}`; };
console.log(`n ${CH.length} | final − initial decision: fwd ${st("dU")} cm, T ${st("dT", 1000)} ms | largest single update ${st("maxStep")} cm | achieved − final ${st("err")} cm | achieved − initial ${st("errInit")} cm`);

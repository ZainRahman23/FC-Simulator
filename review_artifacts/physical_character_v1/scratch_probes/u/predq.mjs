// closed-loop prediction quality: the last in-swing map prediction of the next start vs the measured next start, per axis; and the decided
// vs executed foothold
import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"); const E = { f: [], l: [], ef: [], el: [], tauLast: [] };
const { spec, poses } = body("F0");
for (const [first, at] of [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]]) {
  const n = 20, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, U = P._uni, D = P.exec.done.filter(d => d.kind === "rhythmic"), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]];
  for (let j = 0; j + 1 < U.stepLog.length; j++) { const a = U.stepLog[j], b = U.stepLog[j + 1]; if (b.i !== a.i + 1 || !a.dec.length) continue; const last = a.dec[a.dec.length - 1]; const d = D.find(e => e.stepIndex === a.i); if (!d || !d.td) continue;
    const bx = b.dec.length ? b.dec[0].x : null; if (!bx || !last.mapPred) continue; E.f.push(bx[0] - last.mapPred[0]); E.l.push(bx[1] - last.mapPred[1]); E.tauLast.push(last.tau);
    const sd = d.sw === "R" ? 1 : -1, ach = [(d.td.center[0] - d.pSt[0]) * hd[0] + (d.td.center[1] - d.pSt[1]) * hd[1], ((d.td.center[0] - d.pSt[0]) * rt[0] + (d.td.center[1] - d.pSt[1]) * rt[1]) * sd]; E.ef.push(ach[0] - last.u); E.el.push(ach[1] - last.dl); } }
const st = (a) => `${(a.reduce((s, x) => s + x, 0) / a.length * 100).toFixed(1)} ± ${(Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length - (a.reduce((s, x) => s + x, 0) / a.length) ** 2) * 100).toFixed(1)} cm`;
console.log(`n ${E.f.length} | next-start prediction error: fwd ${st(E.f)} | lat ${st(E.l)} | execution (achieved − final decision): fwd ${st(E.ef)} | lat ${st(E.el)} | last decision τ mean ${(E.tauLast.reduce((s, x) => s + x, 0) / E.tauLast.length).toFixed(2)}`);

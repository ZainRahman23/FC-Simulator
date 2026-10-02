import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), first = process.argv[4] || "L", at = +(process.argv[5] || 0.6);
const { spec, poses } = body("F0"), n = 24, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
const P = LOCO.planner, U = P._uni, D = P.exec.done.filter(d => d.kind === "rhythmic"), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
console.log("fall", tF.toFixed(2));
for (const lg of U.stepLog) { const d = D.find(e => e.stepIndex === lg.i), sd = d ? (d.sw === "R" ? 1 : -1) : 1; const ach = d && d.td ? [(d.td.center[0] - d.pSt[0]) * hd[0] + (d.td.center[1] - d.pSt[1]) * hd[1], ((d.td.center[0] - d.pSt[0]) * rt[0] + (d.td.center[1] - d.pSt[1]) * rt[1]) * sd] : null;
  const s = lg.lqr ? lg.lqr.s : null; console.log(`step ${lg.i} ${lg.sw} | ${s ? "s " + s.map(v => v.toFixed(3)).join(" ") : "maps"} | u ${lg.u0.map(v => v.toFixed(3)).join(" ")}${lg.lqr ? " raw " + lg.lqr.raw.map(v => v.toFixed(3)).join(" ") : ""} | achieved ${ach ? ach.map(v => v.toFixed(3)).join(" ") : "-"} uAt ${d && d.td ? d.td.uAt.toFixed(2) : "-"}`); }

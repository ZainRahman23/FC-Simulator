// quick walk probe: node walk.mjs '<ctrl>' '<walk>' '<human>' [starts e.g. R0.5,L0.6] [n]
import { J, body, G2 } from "../fg/lib.mjs"; import fs from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/";
const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2] || '{}'), walkX = JSON.parse(process.argv[3] || "{}"), human = JSON.parse(process.argv[4] || "{}");
const starts = (process.argv[5] || "R0.5,R0.55,R0.6,L0.5,L0.55,L0.6").split(",").map(s => [s[0], +s.slice(1)]), n = +(process.argv[6] || 40), verbose = process.env.V;
const { spec, poses } = body("F0"); const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk; const tot = [];
for (const [first, at] of starts) { const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const t0 = Date.now();
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, humanOver: human, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = P.exec.done.filter(d => d.kind === "rhythmic"), up = D.filter(d => d.td && d.td.t < tF);
  const errs = up.map(d => Math.hypot(d.td.center[0] - d.td.planned[0], d.td.center[1] - d.td.planned[1])), dts = up.map(d => d.td.t - d.td.plannedT);
  const inf = D.filter(d => d.swx && d.swx.infeasible.length).length, npl = D.map(d => d.swx ? d.swx.nPlans : 0), fails = D.filter(d => d.status === "FAILED").length;
  const m = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : NaN;
  console.log(`${first}@${at} hash ${r.hash} upright ${up.length} fall ${tF < 1e8 ? tF.toFixed(2) : "-"} | land err ${(m(errs) * 100).toFixed(1)} cm (max ${(Math.max(...errs, 0) * 100).toFixed(1)}) · td−planned ${(m(dts) * 1000).toFixed(0)} ms · plans/step ${m(npl).toFixed(1)} · infeasible steps ${inf} · failed ${fails} · cpu ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  tot.push(up.length);
  if (verbose) for (const d of D) { const w = d.swx; console.log(`  step ${d.stepIndex} ${d.sw} ${d.status} uAt ${d.td ? d.td.uAt.toFixed(2) : "-"} err ${d.td ? ((Math.hypot(d.td.center[0] - d.td.planned[0], d.td.center[1] - d.td.planned[1])) * 100).toFixed(1) : "-"} dt ${d.td ? ((d.td.t - d.td.plannedT) * 1000).toFixed(0) : "-"}${d.td && d.td.t > tF ? " (after fall)" : ""}`); if (w && verbose > 1) for (const e of w.log) console.log("     ", JSON.stringify(e)); } }
console.log("mean upright", (tot.reduce((a, b) => a + b, 0) / tot.length).toFixed(1), "(" + tot.join(",") + ")");

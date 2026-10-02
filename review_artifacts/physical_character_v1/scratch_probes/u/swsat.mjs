// swing-leg actuator use during walking swings: fraction of air time each swing joint axis is saturated, peak realised torque vs its limit
import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2] || "{}"), walkX = JSON.parse(process.argv[3] || "{}"); const S = {};
const { spec, poses } = body("F0");
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6]]) {
  const n = 12, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ...(Object.keys(ctrl).length ? { ctrl: withModels({ ...base.ctrl, ...ctrl }) } : {}) } }, onLoco: l => { LOCO = l; } });
  const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.liftoff && d.td && d.td.t < tF - 0.2);
  for (const d of D) for (const q of r.recs) { if (q.t < d.liftoff.t || q.t > d.td.t || !q.arb) continue;
    for (const jn of ["hip_" + d.sw, "knee_" + d.sw, "ankle_" + d.sw]) { const e = q.arb.find(x => x.joint === jn); if (!e) continue; const nm = jn.slice(0, -2), sat = Array.isArray(e.sat) ? e.sat : [e.sat], real = Array.isArray(e.real) ? e.real : [e.real], env = e.env;
      const A = S[nm] = S[nm] || { n: 0, sat: sat.map(() => 0), peak: real.map(() => 0), lim: real.map(() => 0) }; A.n++; sat.forEach((v, i) => { if (v) A.sat[i]++; A.peak[i] = Math.max(A.peak[i], Math.abs(real[i])); const lo = Array.isArray(env.lo) ? env.lo[i] : env.lo, hi = Array.isArray(env.hi) ? env.hi[i] : env.hi; A.lim[i] = Math.max(A.lim[i], Math.abs(lo), Math.abs(hi)); }); } } }
for (const [k, A] of Object.entries(S)) console.log(k.padEnd(6), "swing ticks", A.n, "| saturated fraction per axis", A.sat.map(v => (v / A.n * 100).toFixed(0) + "%").join(" "), "| peak |τ| per axis", A.peak.map(v => v.toFixed(0)).join(" "), "| envelope", A.lim.map(v => v.toFixed(0)).join(" "));

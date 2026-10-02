// the worst-executed swings of a configuration: final target vs achieved, with the swing's events (liftoff, re-contacts, touchdown fraction)
import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), humanX = process.argv[4] ? JSON.parse(process.argv[4]) : null; const S = [];
const { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n);
for (const [first, at] of [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]]) {
  const n = 16, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, ...(humanX ? { humanOver: humanX } : {}), onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, D = P.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  for (const d of D) { if (!d.td || d.td.t > tF) continue; const fw = (p) => (p[0] - d.pSt[0]) * hd[0] + (p[1] - d.pSt[1]) * hd[1]; const err = fw(d.td.center) - fw(d.proj.target);
    let rc = 0, prev = true; for (const q of r.recs) { if (!d.liftoff || q.t < d.liftoff.t || q.t > d.td.t - 0.005) continue; const tc = q.feet[d.sw].touching; if (tc && !prev) rc++; prev = tc; }
    S.push({ start: first + at, k: d.stepIndex, err, uAt: d.td.uAt, lift: d.liftoff ? d.liftoff.t - d.tSw0 : null, td: d.td.t - d.tSw0, T: d.walkK.Tss, adj: d.adjusted || 0, rc, target: fw(d.proj.target), ach: fw(d.td.center) }); } }
S.sort((a, b) => Math.abs(b.err) - Math.abs(a.err)); const within = S.filter(s => Math.abs(s.err) <= 0.05).length;
console.log(`n ${S.length} | within ±5 cm ${within} (${(within / S.length * 100).toFixed(0)}%) | worst:`); for (const s of S.slice(0, 10)) console.log(`  ${s.start} k${s.k} err ${(s.err * 100).toFixed(1)} cm | target ${s.target.toFixed(2)} achieved ${s.ach.toFixed(2)} | uAt ${s.uAt.toFixed(2)} lift ${s.lift != null ? s.lift.toFixed(2) : "-"} td ${s.td.toFixed(2)} T ${s.T.toFixed(2)} | retargets ${s.adj} re-contacts ${s.rc}`);

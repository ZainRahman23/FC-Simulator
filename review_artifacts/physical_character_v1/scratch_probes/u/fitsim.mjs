// offline calibration of the unified forward predictor: (wE, dE, k, inset, stanceExt) minimising the error of ξ̂ at the ACTUAL touchdown time
import fs from "fs"; const { UnifiedWalker } = await import("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_unified.js");
const rows = process.argv.slice(2).flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));
const evalP = (par) => { const U = new UnifiedWalker({ vd: 0.5, ...par }, {}); const E = { a: [], b: [], c: [] };
  for (const r of rows) { const tr = r.traj, act = (t) => { let i = tr.findIndex(p => p[0] >= t); if (i < 0) i = tr.length - 1; return tr[i][1]; }, aTd = act(r.tdT);
    for (const s of r.sim) { const geo = par.noPivot ? null : { ...s.geo, Lr: s.geo.Lr / 0.99 * (par.stanceExt ?? 0.99) };
      const f = U.simulate(s.x[0], s.tau, s.tauL, Math.max(r.tdT, s.T) + 0.02, s.orbN, s.rollR, s.w, s.sole, geo, U.C.funnel != null ? U.refFn(s.orbN, s.E0, s.tauL, s.rollR, s.w) : null);
      const e = f(r.tdT) - aTd; (s.tau < 0.1 ? E.a : s.tau < 0.2 ? E.b : E.c).push(e); } }
  const st = (a) => [a.reduce((s, x) => s + x, 0) / a.length, Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length)];
  return { a: st(E.a), b: st(E.b), c: st(E.c), all: Math.sqrt([...E.a, ...E.b, ...E.c].reduce((s, x) => s + x * x, 0) / (E.a.length + E.b.length + E.c.length)) }; };
const base = evalP({}); console.log("current (wE ω, dE 0, k 0.5, inset 0.02, ext 0.99): τ<0.1", base.a.map(v => (v * 100).toFixed(1)), "| 0.1–0.2", base.b.map(v => (v * 100).toFixed(1)), "| ≥0.2", base.c.map(v => (v * 100).toFixed(1)), "| all rms", (base.all * 100).toFixed(1));
let best = null;
for (const wE of [1.5, 2.0, 2.5, 3.06]) for (const dE of [-0.2, -0.1, 0, 0.1]) for (const k of [0.5, 1.0, 2.0]) for (const ins of [0.02, 0.05]) for (const ext of [0.97, 0.99]) {
  const r = evalP({ wE, dE, k, copInset: ins, stanceExt: ext }); if (!best || r.all < best.r.all) best = { p: { wE, dE, k, ins, ext }, r }; }
console.log("best", JSON.stringify(best.p), "τ<0.1", best.r.a.map(v => (v * 100).toFixed(1)), "| 0.1–0.2", best.r.b.map(v => (v * 100).toFixed(1)), "| ≥0.2", best.r.c.map(v => (v * 100).toFixed(1)), "| all rms", (best.r.all * 100).toFixed(1));

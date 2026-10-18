// dribble15/tools/d15_corrcheck.mjs — VALIDATION of the corridor (d12_core corridor()): for predicted swing poses of a run, random launch directions,
// regions, elevations and ball positions around the foot, the analytic corridor's verdict (margin > 0, plus the other-hull check at that ball)
// must equal contactGeom's per-ball verdict. Prints agreement counts and every disagreement beyond the margin tolerance.
// usage: node d15_corrcheck.mjs [scenario CUT60_RUN] [seed 1] [samples 20000]
import { makeSim, DT, CORES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", seedA = "1", nA = "20000"] = process.argv.slice(2);
const S = makeSim(get(id), { seed: +seedA, opts: { record: false } }); S.run(2.2);
const pred = S.viewFor(S.k, 240), regs = ["INSIDE", "OUTSIDE", "FRONT", "LACES"], elevs = [0, 10, 20, 30, 38];
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let agree = 0, dis = 0, near = 0, inside = 0, otherOnly = 0; const bad = [];
for (let s = 0; s < +nA; s++) {
  const j = Math.floor(rnd() * 200), smp = pred.at(j), F = rnd() < 0.5 ? "R" : "L"; if (smp.legs[F].stance || !smp.bones) continue;
  const gs = { bones: smp.bones, psi: smp.psi, legs: smp.legs, k: smp.k, P: smp.P }, reg = regs[Math.floor(rnd() * 4)], el = elevs[Math.floor(rnd() * 5)] * Math.PI / 180;
  const th = smp.psi + (rnd() - 0.3) * 2.4, nH = [Math.cos(th), 0, -Math.sin(th)];
  const foot = smp.bones["foot_" + F].p, ball = [foot[0] + (rnd() - 0.5) * 0.9, 0.11, foot[2] + (rnd() - 0.5) * 0.9];
  const g = S.contactGeom(gs, F, reg, nH, ball, [0, 0, 0], el), cor = S.corridor(gs, F, reg, nH, el);
  let m = null; if (!cor.why) m = S.corridorMargin(cor, ball);
  // a corridor-feasible ball that contactGeom rejects only for the OTHER hull is a position-dependent exclusion (expected); count it separately
  const gv = !!g; let gwhy = null; if (!gv && !cor.why && m > 0) { S.rej = {}; S.contactGeom(gs, F, reg, nH, ball, [0, 0, 0], el); gwhy = Object.keys(S.rej).filter((x) => x !== "samples")[0]; S.rej = null; }
  if (gv === (cor.why ? false : m > 0)) { agree++; if (gv) inside++; }
  else { if (m != null && Math.abs(m) < 1e-4) near++; else { dis++; if (gwhy === "other") otherOnly++; else if (bad.length < 12) bad.push({ j, F, reg, el: el * 180 / Math.PI, m, why: cor.why, g: gv, gwhy }); } }
}
console.log(`agree ${agree} (feasible ${inside}) · within 0.1 mm of the boundary ${near} · disagree ${dis}, of which the position-dependent other-hull exclusion ${otherOnly}`);
for (const b of bad) console.log("  ", JSON.stringify(b));

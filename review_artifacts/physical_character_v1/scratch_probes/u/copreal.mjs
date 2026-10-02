// commanded (pStar) vs realized (copSmooth) CoP along the walk, relative to the stance foot's sole centre, over the single support (by phase)
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const VAR = JSON.parse(process.argv[2] || "{}"), { spec, poses } = body("F0"); const pts = [];
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6], ["L", 0.6]]) {
  const n = 12, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, ...(VAR.walk ? { walk: VAR.walk } : {}) }, onLoco: l => { LOCO = l; } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (v, p) => (v[0] - p[0]) * hd[0] + (v[1] - p[1]) * hd[1];
  for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1)) { if (!d.liftoff || !d.td || d.td.t > tF - 0.3) continue; const ps = d.pSt;
    for (const q of R_) { if (q.t < d.liftoff.t || q.t > d.td.t || !q.ctl || !q.ctl.pStar || !q.copSmooth) continue; const u = (q.t - d.liftoff.t) / (d.td.t - d.liftoff.t);
      pts.push({ u, cmd: fw(q.ctl.pStar, ps), real: fw(q.copSmooth, ps), xi: fw(q.xi, ps), raw: q.ctl.pRaw ? fw(q.ctl.pRaw, ps) : null }); } } }
const bins = 5; for (let b = 0; b < bins; b++) { const a = pts.filter(p => p.u >= b / bins && p.u < (b + 1) / bins), m = (f) => a.reduce((s, p) => s + f(p), 0) / a.length;
  console.log(`u ${(b / bins).toFixed(1)}-${((b + 1) / bins).toFixed(1)} n ${a.length} | CoP raw ${(m(p => p.raw ?? 0) * 100).toFixed(1)} cmd ${(m(p => p.cmd) * 100).toFixed(1)} real ${(m(p => p.real) * 100).toFixed(1)} cm | real−cmd sd ${(Math.sqrt(m(p => (p.real - p.cmd) ** 2)) * 100).toFixed(1)} | ξ ${(m(p => p.xi) * 100).toFixed(1)} | real range p5..p95 ${[0.05, 0.95].map(qq => { const s = a.map(p => p.real).sort((x, y) => x - y); return (s[Math.floor(qq * (s.length - 1))] * 100).toFixed(1); }).join("..")}`); }

// per phase (single support / double support): the horizontal impulse along the heading, its inverted-pendulum part ∫F_v·(c−p)/h dt with the
// measured CoP, the remainder, the whole-body pitch angular-momentum change / h, and the mean vertical force (BW)
import { J, body, G2 } from "../fg/lib.mjs"; import { bodyState } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_g2char.js";
const first = process.argv[2] || "R", at = +(process.argv[3] || 0.6), { spec, poses } = body("F0"), M = spec.totalMass, W = M * 9.81;
const steps = Array.from({ length: 30 }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 15, rhythmOver: { steps, at }, onLoco: (l) => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], rt = [hd[2], 0, -hd[0]], R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
const D = P.exec.done.filter(d => d.kind === "rhythmic"), fw = (v) => v[0] * hd[0] + v[2] * hd[2];
const phase = (a, b) => { const W2 = R_.filter(q => q.t > a && q.t <= b); if (W2.length < 3) return null; let Ih = 0, Iip = 0, fv = 0, n = 0, nc = 0;
  for (const q of W2) { if (!q.grf) continue; const dt = 1 / 240, Fh = fw(q.grf), Fv = q.grf[1]; Ih += Fh * dt; fv += Fv; n++;
    if (q.copSmooth && Fv > 50) { const cf = fw(q.com) - (q.copSmooth[0] * hd[0] + q.copSmooth[1] * hd[2]); Iip += Fv * cf / q.com[1] * dt; nc++; } }
  const L0 = bodyState(spec, W2[0].states).L, L1 = bodyState(spec, W2[W2.length - 1].states).L, dLp = (L1[0] - L0[0]) * rt[0] + (L1[2] - L0[2]) * rt[2], hm = W2.reduce((s, q) => s + q.com[1], 0) / W2.length;
  return { dv: (fw(W2[W2.length - 1].vcom) - fw(W2[0].vcom)), Ih, Iip, rest: Ih - Iip, dLh: dLp / hm, fv: fv / n / W, cov: nc / n }; };
const f = (v, d = 1) => v == null ? "  -  " : (v >= 0 ? " " : "") + v.toFixed(d);
console.log(first, at, "hash", r.hash, "| per phase: Δv(m/s) | ∫F_h (N·s) = IP part + rest | ΔL_pitch/h (N·s) | mean F_v (BW)");
D.forEach((d, j) => { const nx = D[j + 1]; if (!d.liftoff || !d.td || d.td.t > tF) return; const ss = phase(d.liftoff.t, d.td.t), ds = nx && nx.liftoff ? phase(d.td.t, Math.min(nx.liftoff.t, tF)) : null;
  console.log(`k${String(d.stepIndex).padStart(2)} SS ${f(ss.dv, 2)} | ${f(ss.Ih)} = ${f(ss.Iip)} + ${f(ss.rest)} | ${f(ss.dLh)} | ${f(ss.fv, 2)}   ||  DS ${ds ? `${f(ds.dv, 2)} | ${f(ds.Ih)} = ${f(ds.Iip)} + ${f(ds.rest)} | ${f(ds.dLh)} | ${f(ds.fv, 2)}` : "-"}`); });

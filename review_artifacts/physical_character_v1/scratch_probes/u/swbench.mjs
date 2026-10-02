// SWING BENCH (attribution): open-loop identical requests, per swing: command vs actual foot (aligned in REAL time: the command a tick applies
// was computed from the view dFb old), physical liftoff, lag, touchdown overshoot. usage: node swbench.mjs '<variant json>' [label]
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const VAR = JSON.parse(process.argv[2] || "{}"), label = process.argv[3] || "base", { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n);
const STARTS = [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]], n = 12, [df, dl, T] = VAR.open || [0.28, 0.26, 0.42];
const rows = [];
for (const [first, at] of STARTS) {
  const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk.char, ch = { 0: base[0] }; for (let i = 1; i < n; i++) ch[i] = { df, dl, T };
  let LOCO = null; const CMD = [];
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.58, rhythmOver: { steps, at, walk: { char: ch, ...(VAR.walk || {}) } }, ...(VAR.human ? { humanOver: VAR.human } : {}), ...(VAR.loco ? { locoOver: VAR.loco } : {}),
    onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv) CMD.push({ n: l.nStep, t, k: R.stepIndex, pos: out.pos, reach: out.reach, u: out.u }); return out; }; } });
  const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, dFb = LOCO.dFb;
  for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1)) { if (!d.td || d.td.t > tF) continue; const fb = bi("foot_" + d.sw);
    // the command applied in tick n (record n) — computed by that tick's control call (CMD.n == record n)
    const cm = new Map(); for (const c of CMD) if (c.k === d.stepIndex) cm.set(c.n, c);
    const recs = r.recs.filter(q => q.t >= d.tSw0 - 0.01 && q.t <= d.td.t + 0.08);
    const lift = recs.find(q => q.t > d.tSw0 && !q.feet[d.sw].touching && q.feet[d.sw].load < 5), tdP = recs.find(q => lift && q.t > lift.t + 0.05 && q.feet[d.sw].touching);
    const land = [...cm.values()].pop().reach, fw = (p) => (p[0] - land[0]) * hd[0] + (p[2] - land[2]) * hd[2];
    let lagMax = 0, lagAt = null, vmax = 0; const prof = [];
    for (const q of recs) { const c = cm.get(q.n); if (!c) continue; const S = q.states[fb], lag = fw(c.pos) - fw(S.pos); if (tdP && q.t <= tdP.t && lag > lagMax) { lagMax = lag; lagAt = c.u; } vmax = Math.max(vmax, V.dot(S.v, hd)); prof.push([q.t, c.u, fw(c.pos), fw(S.pos)]); }
    const Sd = tdP ? tdP.states[fb] : null, cAtTd = tdP ? cm.get(tdP.n) : null;
    rows.push({ start: first + at, k: d.stepIndex, sw: d.sw, cmdStartReal: d.tSw0 + dFb, liftReal: lift ? lift.t - d.tSw0 - dFb : null, tdReal: tdP ? tdP.t - d.tSw0 - dFb : null, uAtTdReal: cAtTd ? cAtTd.u : null,
      lagMax, lagAt, vmax, ovsAnkle: Sd ? fw(Sd.pos) : null, ovsCentre: d.td ? ((d.td.center[0] - d.proj.target[0]) * hd[0] + (d.td.center[1] - d.proj.target[1]) * hd[2]) : null, uAt: d.td.uAt });
  }
}
const ok = rows.filter(r => r.ovsCentre != null), m = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length), sd = (a) => { const mu = m(a); return Math.sqrt(m(a.map(v => (v - mu) ** 2))); };
const S = (k, f = 1) => { const a = ok.map(r => r[k]).filter(v => v != null).map(v => v * f); return `${m(a).toFixed(f === 100 ? 1 : 3)}±${sd(a).toFixed(f === 100 ? 1 : 3)}`; };
console.log(`${label.padEnd(14)} swings ${ok.length} | liftoff (real, after the command starts) ${S("liftReal")} s | td ${S("tdReal")} s | peak lag ${S("lagMax", 100)} cm at u ${S("lagAt")} | vmax ${S("vmax")} m/s | overshoot centre ${S("ovsCentre", 100)} cm, ankle vs landing pose ${S("ovsAnkle", 100)} cm | uAt ${S("uAt")}`);
if (process.argv[4]) (await import("fs")).writeFileSync(process.argv[4], JSON.stringify(rows));

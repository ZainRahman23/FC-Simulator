// posture diagnostic (measurement only): per variant, over walking steps (before any fall): trailing-leg extension at the opposite touchdown,
// double-support duration, air time, swing-hip flexion torque peak / saturation fraction, stance heel-up fraction in single support
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const variants = JSON.parse(process.argv[2]); const { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n);
for (const [name, vr] of Object.entries(variants)) { const A = { trailTd: [], ds: [], air: [], hipPk: [], hipSat: [], heelUp: [], up: [], pelvH: [] };
  for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6]]) {
    const n = 8, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) })); const base0 = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk.char, ch = { 0: base0[0] }; if (vr.open) for (let i = 1; i < n; i++) ch[i] = { df: vr.open[0], dl: vr.open[1], T: vr.open[2] };
    let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...(vr.walk || {}), ...(vr.open ? { char: ch } : {}) } }, ...(vr.human ? { humanOver: vr.human } : {}), onLoco: l => { LOCO = l; } });
    const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.liftoff && d.td && d.td.t < tF - 0.05 && d.stepIndex <= (vr.maxK ?? 99));
    A.up.push(D.length);
    for (let j = 0; j < D.length; j++) { const d = D[j], nx = LOCO.planner.exec.done.find(e => e.stepIndex === d.stepIndex + 1), q = R_.find(q2 => q2.t >= d.td.t - 1e-9);
      const h = q.states[bi("thigh_" + d.st)].pos, f = q.states[bi("foot_" + d.st)].pos; A.trailTd.push(Math.hypot(h[0] - f[0], h[1] - f[1], h[2] - f[2]) / 0.9243);
      if (nx && nx.tSw0) A.ds.push(nx.tSw0 - d.td.t); A.air.push(d.td.t - d.liftoff.t); A.pelvH.push(q.states[0].pos[1]);
      let pk = 0, sat = 0, n2 = 0, hu = 0, ns = 0; for (const q2 of R_) { if (q2.t < d.liftoff.t || q2.t > d.td.t || !q2.arb) continue; const e = q2.arb.find(x => x.joint === "hip_" + d.sw); if (e) { pk = Math.max(pk, Math.abs(Array.isArray(e.real) ? e.real[1] : e.real)); if (Array.isArray(e.sat) ? e.sat[1] : e.sat) sat++; n2++; }
        ns++; if (!q2.feet[d.st].heel) hu++; }
      A.hipPk.push(pk); A.hipSat.push(sat / Math.max(1, n2)); A.heelUp.push(hu / Math.max(1, ns)); } }
  const m = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : NaN;
  console.log(`${name.padEnd(14)} upright steps ${A.up.join("/")} | trailing ext at touchdown ${m(A.trailTd).toFixed(3)} | DS ${m(A.ds).toFixed(3)} s | air ${m(A.air).toFixed(3)} s | swing-hip flexion peak ${m(A.hipPk).toFixed(0)} N·m, saturated ${(m(A.hipSat) * 100).toFixed(1)}% | stance heel up ${(m(A.heelUp) * 100).toFixed(0)}% of SS | pelvis y ${m(A.pelvH).toFixed(3)}`); }

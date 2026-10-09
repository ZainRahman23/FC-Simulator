// LC-1 design probe: the physically admissible vertical COM path closest to the law's (ADMM on the cyclic second difference: flight = −g exactly,
// stance F/BW in [0, 4]); vs the spring-mass model. One step, periodic.
const H = require("./pres_harness.cjs"), P = H.loadPres(process.argv[2], ["anim3d/of_loco_cont.js"]), g = P.g;
const skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null }), cyc = g("ofLocoCycle"), params = g("ofLocoParams"), poseC1 = g("ofContPoseC1"), FK0 = g("ofContFK0"), COM = g("ofContCOM"), stepY = g("ofContStepY"), rateOf = g("ofContRate"), Sole = g("ofContSole");
// min ½|y − t|² s.t. lo ≤ (D y)/dt² ≤ hi (cyclic second difference), ADMM with z = D'y (accelerations), residual balancing
function solveQP(t, lo, hi, dt, iters) { const N = t.length, k = 1 / (dt * dt), D = (y) => y.map((_, i) => (y[(i + 1) % N] - 2 * y[i] + y[(i - 1 + N) % N]) * k);
  let rho = 1e-9, y = t.slice(), z = D(y).map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), u = new Array(N).fill(0), inv = null, rhoInv = null;
  const factor = () => { const A = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => { const d = ((j - i) % N + N) % N, dd = Math.min(d, N - d); return (i === j ? 1 : 0) + rho * k * k * (dd === 0 ? 6 : dd === 1 ? -4 : dd === 2 ? 1 : 0); }));
    const M = A.map((r, i) => r.concat(Array.from({ length: N }, (_, j) => (i === j ? 1 : 0)))); for (let c = 0; c < N; c++) { let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; for (let q = 0; q < 2 * N; q++) M[c][q] /= d; for (let r = 0; r < N; r++) if (r !== c) { const f = M[r][c]; if (f) for (let q = 0; q < 2 * N; q++) M[r][q] -= f * M[c][q]; } }
    inv = M.map(r => r.slice(N)); rhoInv = rho; };
  for (let it = 0; it < iters; it++) { if (rho !== rhoInv) factor(); const w = z.map((zi, i) => zi - u[i]), dw = D(w), rhs = t.map((ti, i) => ti + rho * dw[i]); y = inv.map(r => r.reduce((s, a, j) => s + a * rhs[j], 0));
    const dy = D(y), zOld = z; z = dy.map((v, i) => Math.max(lo[i], Math.min(hi[i], v + u[i]))); u = u.map((ui, i) => ui + dy[i] - z[i]);
    if (it % 50 === 49) { const r = Math.hypot(...dy.map((v, i) => v - z[i])), sd = rho * Math.hypot(...D(z.map((v, i) => v - zOld[i]))); if (r > 10 * sd) { rho *= 2; u = u.map(x => x / 2); } else if (sd > 10 * r) { rho /= 2; u = u.map(x => x * 2); } } }
  return y; }
for (const v of (process.argv[3] || "3,5.5,7.5").split(",").map(Number)) { const Pp = params(v), rate = rateOf(skel, Pp, v, { gaitPhase: 0 }), opt = { lean: Pp.lean, turnRoll: 0, twist: 0 }, S = Pp.stance;
  const N = 120, Tst = 0.5 / rate, dt = Tst / N, gg = 9.81; let lb = null; for (let n = 0; n < 200; n++) { const l = cyc(skel, Pp, n / 200, Object.assign({ lastBob: lb }, opt)); if (!l._flight) lb = l._bob; }
  const t = [], com0 = [], law = [], fl = []; for (let i = 0; i < N; i++) { const u = i / N * 0.5, l = cyc(skel, Pp, u, Object.assign({ lastBob: lb }, opt)); if (!l._flight) lb = l._bob; const c1 = poseC1(skel, Pp, u, opt, rate), c0 = COM(skel, FK0(skel, c1))[1]; com0.push(c0); law.push(l._pelvis[1]); t.push(l._pelvis[1] + c0); fl.push(u >= S); }
  const lo = [], hi = []; for (let i = 0; i < N; i++) { const inFl = fl[i] && fl[(i + 1) % N] && fl[(i - 1 + N) % N]; lo.push(-gg); hi.push(inFl ? -gg : 3 * gg); }
  const y = solveQP(t, lo, hi, dt, +(process.env.IT || 3000)), Dy = y.map((_, i) => y[(i + 1) % N] - 2 * y[i] + y[(i - 1 + N) % N]), F = Dy.map(d => 1 + d / (dt * dt) / gg);
  // spring-mass for comparison (level as in D2)
  const land = poseC1(skel, Pp, 0, opt, rate), fkL = FK0(skel, land), yL = COM(skel, fkL)[1] - Sole(skel, fkL, "R");
  let devQ = 0, devS = 0, rows = []; for (let i = 0; i < N; i++) { const sm = yL + stepY(S, rate, i / N * 0.5)[0]; devQ = Math.max(devQ, Math.abs(y[i] - t[i])); devS = Math.max(devS, Math.abs(sm - t[i])); if (i % 10 === 0) rows.push(`σ ${(i / N).toFixed(2)} ${fl[i] ? "F" : "S"} law ${((t[i] - com0[i]) * 1000).toFixed(0)} qp ${((y[i] - com0[i]) * 1000).toFixed(0)} sm ${((sm - com0[i]) * 1000).toFixed(0)} F ${F[i].toFixed(2)}`); }
  console.log(`v ${v}: max |pelvis − law| qp ${(devQ * 1000).toFixed(0)} mm, spring-mass ${(devS * 1000).toFixed(0)} mm; qp F/BW [${Math.min(...F).toFixed(2)}, ${Math.max(...F).toFixed(2)}]`); rows.forEach(r => console.log("   ", r)); }

// ═══ physchar2/tools/rate_cond_preload.mjs — DIAGNOSTIC (E2 estimator correction, e2/VFF_RATE_CORRECTION.md): conditioning study of the velocity feed-forward's
// one-step IK rate (StandController.prototype.legIKRate, lcVff "lin"/"linmin"/"split") for ANY runner. Load with NODE_OPTIONS="--import=<abs path of this file>"
// and RATE_COND_OUT=<file.json.gz>. Observation only: every call returns the controller's own result unchanged (runs are bit-identical with and without it).
// Per call it records the rate problem exactly as the controller poses it — the 6×6 foot-pose Jacobian J at the current solution x, the residual difference
// Δr, the box-active coordinates, the knee flexion, the lifecycle weights — plus the EXACT neighbouring solution: the same bounded Levenberg–Marquardt
// iteration as legIKBounded (soft box, tolerance 1e-12, fallback none) on the neighbouring problem, started from x. Offline (tools/rate_cond_analyze.mjs)
// any damping schedule can then be evaluated against the exact per-tick displacement of the IK solution.
// Options: RATE_COND_TMIN / RATE_COND_TMAX (s, controller time window), RATE_COND_LEG (0 / 1 / both).
import fs from "fs"; import zlib from "zlib";
const OUT = process.env.RATE_COND_OUT, TMIN = +(process.env.RATE_COND_TMIN || 0), TMAX = +(process.env.RATE_COND_TMAX || 1e9), LEG = process.env.RATE_COND_LEG || "both";
const { StandController, IK } = await import(new URL("../ctrl/v2_stand.js", import.meta.url));
const orig = StandController.prototype.legIKRate, oc = StandController.prototype.compute, samples = [], R6 = (v) => +v.toPrecision(7);
function solve(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
  if (Math.abs(a[p][c]) < 1e-300) return null; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let q = c; q <= n; q++) a[r][q] -= f * a[c][q]; } } return a.map((r, i) => r[n] / r[i]); }
// the bounded LM of legIKBounded (same damping law, acceptance, box handling and polish-free stop), started from x
function lmFrom(fk, jac, x0, lo, hi) { const clamp = (y) => y.map((v, i) => Math.min(hi[i], Math.max(lo[i], v))), nrm = (r) => Math.hypot(...r);
  let x = clamp(x0), r = fk(x), err = nrm(r), mu = IK.mu0, it = 0;
  for (; it < IK.maxItBounded && err > IK.tol; it++) { const Jm = jac(x), g = Jm.map(col => col.reduce((s, v, i) => s + v * r[i], 0)), free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= lo[i] && g[i] > 0) || (x[i] >= hi[i] && g[i] < 0)));
    if (!free.length || Math.sqrt(free.reduce((s2, i) => s2 + g[i] * g[i], 0)) < IK.gradTol) break; const H = Jm.map(ci => Jm.map(cj => ci.reduce((s, v, k) => s + v * cj[k], 0)));
    let ok = false; for (let tr = 0; tr < 8; tr++) { const dx = solve(free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i])); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = fk(xc), en = nrm(rn); if (en < err) { x = xc; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; }
  return { x, err, it }; }
StandController.prototype.compute = function (st, ev, dt) { this.__dt = dt; return oc.call(this, st, ev, dt); };
StandController.prototype.legIKRate = function (st, ev, n, pP, qP, footPose, sol, now, mu, ...more) {
  const res = orig.call(this, st, ev, n, pP, qP, footPose, sol, now, mu, ...more);
  try { const t = this.n * this.__dt; if (t >= TMIN && t <= TMAX && (LEG === "both" || +LEG === n)) {
      const ch = this.legChain(st, ev, n, pP, qP, footPose), chN = this.legChain(st, ev, n, now.pos, now.rot, now.tgt), x = sol.x, rp = ch.fk(x), rn = chN.fk(x), r = rp.map((v, i) => v - rn[i]), Jm = ch.jac(x);
      const ks = this.legK[n], lim = ks.map(k => this.spec.joints[k].limits.soft), lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
      // the exact neighbouring solution: the residual DIFFERENCE is what the rate linearises (an unreached target's own residual cancels), so the exact counterpart
      // solves fk_nb(y) − rn(x) = 0 from x (identical to the neighbouring problem when the current one is reached)
      const ex = lmFrom((y) => ch.fk(y).map((v, i) => v - rn[i]), (y) => ch.jac(y), x, lo, hi), lc = this.lc ? this.lc.feet[n] : null;
      samples.push({ t: R6(t), n, part: pP === now.pos ? "T" : "P", mu, sr: !!more[0], a: lc ? R6(lc.a) : null, s: lc ? R6(lc.s) : null, swing: lc ? !!lc.swing : null, state: lc ? lc.state : null,
        x: x.map(R6), bnd: [0, 1, 2, 3, 4, 5].map(i => (sol.atBound && sol.atBound[i] ? 1 : 0)), J: Jm.map(c => c.map(R6)), r: r.map(R6), rn: R6(Math.hypot(...rn)), lo: lo.map(R6), hi: hi.map(R6),
        dxEx: ex.x.map((v, i) => R6(v - x[i])), errEx: R6(ex.err), itEx: ex.it, dt: this.__dt }); } } catch (e) { if (!globalThis.__rcErr) { globalThis.__rcErr = 1; console.error("rate_cond_preload:", e.message); } }
  return res; };
process.on("exit", () => { if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify({ generated: "tools/rate_cond_preload.mjs", IK: { mu0: IK.mu0, muMin: IK.muMin }, samples }))); });

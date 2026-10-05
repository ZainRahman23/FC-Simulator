// P15 capture analysis (diagnostic, not evidence): LIPM / DCM deadline for the landed foot to become effective support, from the measured state at the
// end of the 15 N·s push. ξ̇ = ω(ξ − p) with the CoP p inside the stance foot's usable region S; the two-foot hull H = conv(S ∪ A), A = the lifted foot's usable
// region (it hovers above its anchor). Deadline τ*(p) = time for ξ(t) = p + (ξe − p)e^{ω t} to reach the boundary of H (inset by a margin); the best p maximises τ*.
import fs from "fs"; import zlib from "zlib"; import path from "path";
const D = path.dirname(new URL(import.meta.url).pathname), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f))));
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function hull(pts) { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); }   // CCW
// signed distance of x to convex CCW polygon (positive inside)
function sdist(P, x) { let inside = true, dmin = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez), nx = -ez / L, nz = ex / L, d = (x[0] - a[0]) * nx + (x[1] - a[1]) * nz; if (d < 0) inside = false; dmin = Math.min(dmin, Math.abs(d)); if (d < 0) {} }
  // exact: inside → min edge distance; outside → distance to polygon
  if (inside) return dmin; let best = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((x[0] - a[0]) * ex + (x[1] - a[1]) * ez) / (ex * ex + ez * ez))); best = Math.min(best, Math.hypot(x[0] - a[0] - t * ex, x[1] - a[1] - t * ez)); } return -best; }
// distance from p along unit direction u to the boundary of convex CCW polygon P inset by m (p inside the inset polygon assumed; returns null otherwise)
function rayExit(P, p, u, m) { let tmin = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez), nx = -ez / L, nz = ex / L;   // inward normal (CCW)
    const d0 = (p[0] - a[0]) * nx + (p[1] - a[1]) * nz - m, du = u[0] * nx + u[1] * nz; if (d0 < -1e-12) return null; if (du < 0) tmin = Math.min(tmin, d0 / -du); } return tmin; }
function interior(P, n = 14) { const out = [...P]; const xs = P.map(q => q[0]), zs = P.map(q => q[1]); for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const q = [Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / n, Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * j / n]; if (sdist(P, q) >= 0) out.push(q); } return out; }
const rows = [], bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"];
console.log("body side | ω  h | ξ outside S at push end | deadline τ* after ABORT (best CoP in S): margin 0 / 1 cm | actual CoP: 0 cm | touchdown & s≥0.5 after abort: put-down / one-tick drop | ξ margin in H at s≥0.5: pd / drop | outcome pd / drop");
for (const b of bodies) for (const sd of ["L", "R"]) { const P = rd(`cap_${b}_${sd}_pd.json.gz`), Q = rd(`cap_${b}_${sd}_drop.json.gz`), m = P.stance, n = P.lifted, ab = P.events.abortT, te = P.events.pertT + 0.1;
  const r = P.rows.find(x => x.t >= te - 1e-9 && x.dg), g = r.dg, w = g.w0, xi = r.xi, S = hull(g.polys[m]), A = hull(g.polys[n]), H = hull([...S, ...A]);
  const deadline = (p, mg) => { const d = [xi[0] - p[0], xi[1] - p[1]], L0 = Math.hypot(...d); if (L0 < 1e-9) return Infinity; const u = [d[0] / L0, d[1] / L0], Lb = rayExit(H, p, u, mg); if (Lb == null) return null; if (Lb <= L0) return 0; return Math.log(Lb / L0) / w; };
  const cand = interior(S), best = (mg) => cand.reduce((bb, p) => { const t = deadline(p, mg); return t != null && t > bb ? t : bb; }, -Infinity);
  const t0b = best(0), t1b = best(0.01), tAct = deadline(g.p, 0), off = te - ab;   // relative to the push end; convert to after-abort
  const ev = (R) => { const tr = R.lcLog[n].filter(e => e.t >= ab - 1e-9), td = tr.find(e => e.to === "TOUCHDOWN"), s5 = R.rows.find(x => x.t >= ab && x.s[n] >= 0.5), mH = s5 ? (() => { const gg = R.rows.find(x => Math.abs(x.t - s5.t) < 1e-6 && x.dg); if (!gg) return null; const HH = hull([...hull(gg.dg.polys[m]), ...hull(gg.dg.polys[n])]); return sdist(HH, gg.xi); })() : null; return { td: td ? td.t - ab : null, s5: s5 ? s5.t - ab : null, mH, out: R.summary.outcome }; };
  const ep = ev(P), eq = ev(Q), f = (x, d = 3) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
  // LIPM validation: drop run, predict ξ from the push end with the ACTUAL CoP held, compare at +0.1 s (stance-only phase)
  const r2 = Q.rows.find(x => x.t >= te + 0.1 - 1e-9), pred = [g.p[0] + (xi[0] - g.p[0]) * Math.exp(w * 0.1), g.p[1] + (xi[1] - g.p[1]) * Math.exp(w * 0.1)], perr = Math.hypot(pred[0] - r2.xi[0], pred[1] - r2.xi[1]);
  rows.push({ b, sd, w, h: g.h, xiOutS: -sdist(S, xi), t0b: t0b + off, t1b: t1b + off, tAct: tAct == null ? null : tAct + off, ep, eq, lipmErr01: perr, sepHull: [sdist(H, xi)] });
  console.log(`${b} ${sd} | ${f(w, 2)} ${f(g.h, 3)} | ${f(-sdist(S, xi) * 100, 1)} cm | ${f(t0b + off)} / ${f(t1b + off)} s | ${f(tAct == null ? null : tAct + off)} | ${f(ep.td)} & ${f(ep.s5)} / ${f(eq.td)} & ${f(eq.s5)} | ${f(ep.mH == null ? null : ep.mH * 100, 1)} / ${f(eq.mH == null ? null : eq.mH * 100, 1)} cm | ${ep.out} / ${eq.out} | LIPM err @+0.1 s ${f(perr * 1000, 1)} mm`); }
fs.writeFileSync(path.join(D, "p15_capture.json"), JSON.stringify(rows, null, 1));

// ═══ physchar2/tools/rate_cond_analyze.mjs — DIAGNOSTIC analysis of tools/rate_cond_preload.mjs records (e2/VFF_RATE_CORRECTION.md). For every recorded rate problem:
// the conditioning of the free sub-problem (eigenvalues of H_F = J_Fᵀ J_F, σ_min = √λ_min, the weak eigen-direction), and the one-step rate under damping schedules,
// compared with the EXACT per-tick displacement of the IK solution (dxEx). Grouped by regime (lifecycle state / airborne weight / part P = pelvis motion, T = target motion)
// and by knee-flexion band. usage: node tools/rate_cond_analyze.mjs <rec.json.gz> [...] [--schedules=...]
import fs from "fs"; import zlib from "zlib"; import { fileURLToPath } from "url";
const files = process.argv.slice(2).filter(a => !a.startsWith("--")), D = 180 / Math.PI;
const f2 = (x, d = 3) => (x == null || !isFinite(x) ? "—" : Math.abs(x) >= 1e4 ? x.toExponential(2) : x.toFixed(d)), pct = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
function solve(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
  if (Math.abs(a[p][c]) < 1e-300) return null; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let q = c; q <= n; q++) a[r][q] -= f * a[c][q]; } } return a.map((r, i) => r[n] / r[i]); }
// cyclic Jacobi eigen-decomposition of a symmetric matrix → { val (ascending), vec (columns) }
export function eigSym(A0) { const n = A0.length, A = A0.map(r => r.slice()), Vm = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) { let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q]; if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(A[p][q]) < 1e-300) continue; const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; } for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = Vm[k][p], vkq = Vm[k][q]; Vm[k][p] = c * vkp - s * vkq; Vm[k][q] = s * vkp + c * vkq; } } }
  const idx = A.map((_, i) => i).sort((a, b) => A[a][a] - A[b][b]); return { val: idx.map(i => A[i][i]), vec: idx.map(i => Vm.map(r => r[i])) }; }
export function rateProblem(sm) { const F = [0, 1, 2, 3, 4, 5].filter(i => !sm.bnd[i]), Jm = sm.J, H = Jm.map(ci => Jm.map(cj => ci.reduce((s, v, k) => s + v * cj[k], 0))), g = Jm.map(c => c.reduce((s, v, k) => s + v * sm.r[k], 0));
  const HF = F.map(i => F.map(c => H[i][c])), e = F.length ? eigSym(HF) : { val: [], vec: [] }; return { F, H, g, HF, eig: e }; }
export function dxOf(P, mu) { const dx = [0, 0, 0, 0, 0, 0]; if (!P.F.length) return dx; const s = solve(P.F.map(i => P.F.map(c => (i === c ? P.H[i][c] + mu * (1 + P.H[i][i]) : P.H[i][c]))), P.F.map(i => -P.g[i])); if (s) P.F.forEach((i, k) => { dx[i] = s[k]; }); return dx; }
const norm = (v) => Math.hypot(...v), sub = (a, b) => a.map((x, i) => x - b[i]);
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const MU0 = 1e-2, MUMIN = 1e-12, SCHED = { "μ0 (lin)": () => MU0, "μmin": () => MUMIN };
  for (const eps of [0.02, 0.03, 0.05]) SCHED[`SR ε${eps}`] = (P) => { const s = Math.sqrt(Math.max(0, P.eig.val[0] ?? 0)); return s >= eps ? MUMIN : MUMIN + (MU0 - MUMIN) * (1 - (s / eps) ** 2); };
  for (const file of files) { const R = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), S = R.samples;
    console.log(`\n══ ${file.split("/").pop()}: ${S.length} rate problems`);
    const reg = (sm) => `${sm.state || "?"}${sm.swing ? "+sw" : ""} a${sm.a == null ? "?" : sm.a < 0.01 ? "0" : sm.a > 0.99 ? "1" : "~"} ${sm.part}`, groups = {};
    for (const sm of S) { const P = rateProblem(sm), k = reg(sm); (groups[k] = groups[k] || []).push({ sm, P }); }
    for (const [k, G] of Object.entries(groups).sort()) {
      const sig = G.map(({ P }) => Math.sqrt(Math.max(0, P.eig.val[0] ?? NaN))), knee = G.map(({ sm }) => sm.x[3] * D), exN = G.map(({ sm }) => norm(sm.dxEx) / sm.dt);
      console.log(`  ${k.padEnd(26)} n ${String(G.length).padStart(5)} | σ_min p5/p50/p95 ${f2(pct(sig, 0.05))}/${f2(pct(sig, 0.5))}/${f2(pct(sig, 0.95))} | knee ${f2(pct(knee, 0.05), 1)}–${f2(pct(knee, 0.95), 1)}° | exact |ẋ| p95 ${f2(pct(exN, 0.95), 2)} max ${f2(Math.max(...exN), 2)} rad/s | knee-bound ${G.filter(({ sm }) => sm.bnd[3]).length}`);
      for (const [name, fn] of Object.entries(SCHED)) { const rel = [], mx = []; let worstAbs = 0;
        for (const { sm, P } of G) { const dx = dxOf(P, fn(P)), e = norm(sub(dx, sm.dxEx)), en = norm(sm.dxEx); if (en > 1e-9) rel.push(e / en); mx.push(norm(dx) / sm.dt); worstAbs = Math.max(worstAbs, e / sm.dt); }
        console.log(`      ${name.padEnd(10)} rel. error vs exact p50/p95/max ${f2(pct(rel, 0.5))}/${f2(pct(rel, 0.95))}/${f2(rel.length ? Math.max(...rel) : null)} | |ẋ| max ${f2(Math.max(...mx), 2)} rad/s | worst |Δẋ| ${f2(worstAbs, 3)} rad/s`); } } } }

// ═══ physchar/tools/stepper/surrogate.mjs — the Physical Stepper's STEP-TO-STEP SURROGATE: dataset, model classes, held-out comparison ═══════
// Data: every candidate the Jolt oracle evaluated (level 1 and level 2), as transitions (z at step k's start, commanded u = [df, dl, T]) →
// (z1 at step k+1's start | a fall before it). Models (all deterministic, regularised, cheap at run time):
//   lin   — one global ridge-linear map in [z_F, u];
//   quad  — + the u², u·u and u × (ξ, v) interaction terms (the commanded step's effect depends on the state);
//   local — k-means regions in the standardised state, a ridge-linear map per region, soft-blended by distance (a state-local model).
// Feasibility: a ridge-logistic classifier P(fall before the next step start | z, u). Realised action: the achieved step (length / width) and
// the step's duration, from the same transition (−z1.swFoot = where the new swing foot was, = the achieved step).
// Validation: leave-one-start-out (no state of the held-out start is ever seen). Planning quality is measured OFFLINE as REGRET: at each
// oracle decision the surrogate ranks the candidates the oracle actually simulated; regret = the true cost of the surrogate's pick − the true
// best (no new simulation needed).
import fs from "fs"; import { featOf, designX, modelPredict, terminalValue } from "../../pc_stepper.js";
export const GROUPS = {
  cp: ["xi.0", "xi.1", "v.0", "v.1"],
  com: ["com.0", "com.1", "comY", "v.2"],
  feet: ["swFoot.0", "swFoot.1", "stYaw", "swPitch", "stPitch"],
  L: ["L.0", "L.1", "L.2"],
  pose: ["trailExt", "stExt", "pelvisYaw", "pelvisYawRate", "pelvisPitch"],
  load: ["loadSw", "loadSt", "dsDur"],
  mem: ["mem.I", "mem.vBar", "mem.wProf.0", "mem.wProf.1", "mem.wProf.2"],
};
// ── data ──
export function loadRows(files) { const rows = [];
  for (const f of files) { const D = JSON.parse(fs.readFileSync(f, "utf8")), src = f.split("/").pop();
    for (const R of D.results) for (const s of R.steps) { if (!s.z || !s.cands) continue; const dec = { src, start: R.start, k: s.k, z: s.z, uc: s.uc, cands: [], costC: R.cfg && R.cfg.cost };
      for (const c of s.cands) { const row = { src, start: R.start, k: s.k, lvl: 1, z: s.z, u: c.u, fell: !c.z1, z1: c.z1 || null, c: c.c0 ?? c.c }; rows.push(row); dec.cands.push(row); }
      (rows.decisions = rows.decisions || []).push(dec);
      for (const l of s.lvl2 || []) { const par = s.cands.find(c => JSON.stringify(c.u) === JSON.stringify(l.u)); if (!par || !par.z1) continue; const d2 = { src, start: R.start, k: s.k + 1, z: par.z1, cands: [], lvl: 2, costC: R.cfg && R.cfg.cost };
        for (const e of l.ev2) { const row = { src, start: R.start, k: s.k + 1, lvl: 2, z: par.z1, u: e.u, fell: e.c == null, z1: e.z1 || null, c: e.c }; rows.push(row); d2.cands.push(row); } rows.decisions.push(d2); } } }
  rows.decisions = rows.decisions || []; return rows; }
// ── linear algebra ──
function solve(A, b) { const n = A.length, M = A.map((r, i) => [...r, ...b[i]]), m = b[0].length;
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; if (f) for (let j = c; j < n + m; j++) M[r][j] -= f * M[c][j]; } }
  return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => M[i][n + j] / (M[i][i] || 1e-12))); }
export function ridge(X, Y, lam, w) { const n = X[0].length, m = Y[0].length, A = Array.from({ length: n }, () => new Array(n).fill(0)), B = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let r = 0; r < X.length; r++) { const x = X[r], y = Y[r], wr = w ? w[r] : 1; if (!wr) continue; for (let i = 0; i < n; i++) { const xi = x[i] * wr; if (!xi) continue; for (let j = i; j < n; j++) A[i][j] += xi * x[j]; for (let j = 0; j < m; j++) B[i][j] += xi * y[j]; } }
  for (let i = 0; i < n; i++) { for (let j = 0; j < i; j++) A[i][j] = A[j][i]; if (i > 0) A[i][i] += lam; } return solve(A, B); }   // (column 0 = the unpenalised intercept)
export function standardiser(X) { const n = X[0].length, mu = new Array(n).fill(0), sd = new Array(n).fill(0); for (const x of X) x.forEach((v, i) => { mu[i] += v / X.length; }); for (const x of X) x.forEach((v, i) => { sd[i] += (v - mu[i]) ** 2 / X.length; });
  for (let i = 0; i < n; i++) { sd[i] = Math.sqrt(sd[i]) || 1; } mu[0] = 0; sd[0] = 1; return { mu, sd, f: (x) => x.map((v, i) => (v - mu[i]) / sd[i]) }; }
const targetOf = (t, z1, z0) => t === "achF" ? -z1.swFoot[0] : t === "achW" ? z1.swFoot[1] : t === "dur" ? z1.t - z0.t : featOf(z1, t);
// fit: { kind: lin | quad | local, F, lam, K (local regions), tau (local blend) } → a SERIALISABLE model (pc_stepper.modelPredict evaluates it)
// (o.cap: the regression is fitted in the WALKING REGION only — start and next state both within the oracle cost cap — where the planner needs
//  accuracy; o.badCap: the classifier's label is "falls OR leaves the region" (next cost above badCap), so the planner rejects both)
const Jz = (z, C) => z ? ((z.xi[0] - C.tf) / 0.03) ** 2 + ((z.xi[1] - C.tl) / 0.03) ** 2 + ((z.v[0] - C.tv) / C.sv) ** 2 : Infinity, CC = { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 };
export function fit(rows, o) { const F = o.F, T = [...new Set([...F, "achF", "achW", "dur"])], kind = o.kind, dk = kind === "local" ? "quad" : kind, lam = o.lam ?? 1, cap = o.cap ?? Infinity;
  const ok = rows.filter(r => !r.fell && r.z1 && Jz(r.z, CC) < cap && Jz(r.z1, CC) < cap), isBad = (r) => r.fell || !r.z1 || Jz(r.z1, CC) > (o.badCap ?? Infinity);
  const Xr = ok.map(r => designX(F, dk, r.z, r.u)), st = standardiser(Xr), X = Xr.map(st.f), Y = ok.map(r => T.map(t => targetOf(t, r.z1, r.z)));
  const M = { kind, F, T, mu: st.mu, sd: st.sd, lam, n: ok.length, cap, badCap: o.badCap ?? null };
  if (kind !== "local") M.W = ridge(X, Y, lam);
  else { const sIdx = F.map((nm, i) => GROUPS.cp.includes(nm) ? i + 1 : -1).filter(i => i >= 0), sv = (x) => sIdx.map(i => x[i]), K = o.K ?? 6, tau = o.tau ?? 0.7;
    let C = []; const srt = X.map(x => sv(x)).sort((a, b) => a[0] - b[0]); for (let k = 0; k < K; k++) C.push(srt[Math.floor((k + 0.5) * srt.length / K)]);
    for (let it = 0; it < 30; it++) { const acc = C.map(c => ({ s: c.map(() => 0), n: 0 })); for (const x of X) { const p = sv(x); let b = 0, bd = Infinity; C.forEach((c, k) => { const d = c.reduce((a, v, i) => a + (v - p[i]) ** 2, 0); if (d < bd) { bd = d; b = k; } }); acc[b].n++; acc[b].s = acc[b].s.map((v, i) => v + p[i]); }
      C = acc.map((a, k) => a.n ? a.s.map(v => v / a.n) : C[k]); }
    const wts = (x) => { const p = sv(x), d = C.map(c => c.reduce((a, v, i) => a + (v - p[i]) ** 2, 0)), m = Math.min(...d), e = d.map(v => Math.exp(-(v - m) / (2 * tau * tau))), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
    const Wg = ridge(X, Y, lam), WX = X.map(wts), Ws = C.map((_, k) => { const w = WX.map(q => q[k]); return w.reduce((a, b) => a + b, 0) > X[0].length * 4 ? ridge(X, Y, lam * (o.localLamMul ?? 3), w) : Wg; });
    M.regions = { sIdx, C, tau, Ws }; }
  // feasibility: ridge-logistic (IRLS) on the quadratic design — P(fall before the next step start)
  const rowsC = rows.filter(r => Jz(r.z, CC) < (o.capC ?? Infinity)), XcR = rowsC.map(r => designX(F, "quad", r.z, r.u)), sc = standardiser(XcR), Xc = XcR.map(sc.f), yc = rowsC.map(r => isBad(r) ? 1 : 0), nf = yc.reduce((a, b) => a + b, 0);
  if (nf >= 3 && nf < yc.length) { const lc = o.lamC ?? 3; let w = new Array(Xc[0].length).fill(0); w[0] = Math.log((nf + 0.5) / (yc.length - nf + 0.5));
    for (let it = 0; it < 15; it++) { const n = w.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), g = new Array(n).fill(0);
      Xc.forEach((x, r) => { const p = 1 / (1 + Math.exp(-x.reduce((a, v, i) => a + v * w[i], 0))), s = Math.max(1e-6, p * (1 - p)); for (let i = 0; i < n; i++) { g[i] += (yc[r] - p) * x[i]; for (let j = i; j < n; j++) A[i][j] += s * x[i] * x[j]; } });
      for (let i = 0; i < n; i++) { for (let j = 0; j < i; j++) A[i][j] = A[j][i]; if (i) { A[i][i] += lc; g[i] -= lc * w[i]; } } const d = solve(A, g.map(v => [v])); w = w.map((v, i) => v + d[i][0]); }
    M.feas = { mu: sc.mu, sd: sc.sd, w, nFall: nf, n: yc.length }; }
  return M; }
// ── terminal value V(z1): what the depth-2 oracle found reachable from z1 (the best level-2 cost), ridge on the features + the capture-point
//    group's squares and products (a cost-to-go is quadratic around the orbit), clipped (a fall-bound z1 is just "bad") ──
export function fitTerminal(files, F, o) { o = o || {}; const rows = []; for (const f of files) { const D = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const R of D.results) if (!o.exclude || R.start !== o.exclude) for (const s of R.steps) for (const l of s.lvl2 || []) { const par = (s.cands || []).find(c => JSON.stringify(c.u) === JSON.stringify(l.u)); if (!par || !par.z1) continue; rows.push({ start: R.start, z: par.z1, y: Math.min(o.clip ?? 60, l.b1 ?? (o.clip ?? 60)) }); } }
  const cp = GROUPS.cp, feats = [...F]; for (let i = 0; i < cp.length; i++) for (let j = i; j < cp.length; j++) feats.push(cp[i] + "*" + cp[j]);
  const fx = (z, nm) => nm.includes("*") ? nm.split("*").reduce((a, q) => a * featOf(z, q), 1) : featOf(z, nm);
  const mk = (rs) => { const Xr = rs.map(r => [1, ...feats.map(nm => fx(r.z, nm))]), st = standardiser(Xr), W = ridge(Xr.map(st.f), rs.map(r => [r.y]), o.lam ?? 3); return { feats, mu: st.mu.slice(1), sd: st.sd.slice(1), w: W.slice(1).map(r => r[0]), b: W[0][0], n: rs.length }; };
  // held-out by start: rank agreement where it matters — among the beam (the same parent decision), does V order the first steps as the oracle's b1 does?
  const starts = [...new Set(rows.map(r => r.start))], err = []; for (const s0 of starts) { const V = mk(rows.filter(r => r.start !== s0)); for (const r of rows.filter(r => r.start === s0)) err.push(terminalValue(V, r.z) - r.y); }
  const V = mk(rows); V.heldOut = { rmse: Math.sqrt(err.reduce((a, v) => a + v * v, 0) / err.length), n: err.length, ySd: Math.sqrt(rows.reduce((a, r) => a + (r.y - rows.reduce((b, q) => b + q.y, 0) / rows.length) ** 2, 0) / rows.length) }; return V; }
// ── D: the information-matched FEEDBACK baseline — a ridge-linear policy u = W·z_F + b fitted to an oracle's committed decisions (the same
//    state information as the planner; no model, no search). The lateral width stays the feedback law's own (as in every oracle grid). ──
export function fitPolicy(files, F, o) { o = o || {}; const rows = []; for (const f of files) { const D = JSON.parse(fs.readFileSync(f, "utf8")); for (const R of D.results) for (const s of R.steps) if (s.u && s.z && (!o.exclude || R.start !== o.exclude)) rows.push({ z: s.z, u: s.u }); }
  const Xr = rows.map(r => [1, ...F.map(nm => featOf(r.z, nm))]), st = standardiser(Xr), W = ridge(Xr.map(st.f), rows.map(r => [r.u[0], r.u[1], r.u[2]]), o.lam ?? 3);
  // (back to raw features: y = b + Σ w_i (x_i − μ_i)/σ_i)
  const out = ["df", "dl", "T"], Wr = out.map((_, j) => F.map((_, i) => W[i + 1][j] / st.sd[i + 1])), b = out.map((_, j) => W[0][j] - F.reduce((a, _, i) => a + W[i + 1][j] * st.mu[i + 1] / st.sd[i + 1], 0));
  return { feats: F, out, W: Wr, b, lo: [-0.05, 0.15, 0.30], hi: [0.60, 0.45, 0.54], dlFromCtrl: true, n: rows.length, trainedOn: files.map(f => f.split("/").pop()), exclude: o.exclude || null }; }
// the oracle's cost on a (predicted) next state
export const J0 = (y, C) => ((y["xi.0"] - C.tf) / 0.03) ** 2 + ((y["xi.1"] - C.tl) / 0.03) ** 2 + ((y["v.0"] - C.tv) / C.sv) ** 2;
// ── held-out comparison (leave one start out) ──
export function heldOut(rows, o, costC) { const starts = [...new Set(rows.map(r => r.start))], err = {}, fs_ = { pred: 0, fellPredSafe: 0, fell: 0, safePredFell: 0, n: 0 }, reg = [];
  for (const s of starts) { const tr = rows.filter(r => r.start !== s), te = rows.filter(r => r.start === s), M = fit(tr, o), P = (z, u) => modelPredict(M, z, u);
    for (const r of te) { const p = P(r.z, r.u); fs_.n++; if (r.fell) { fs_.fell++; if (p.pFall < 0.5) fs_.fellPredSafe++; } else if (p.pFall >= 0.5) fs_.safePredFell++;
      if (!r.fell && r.z1 && Jz(r.z, CC) < (o.cap ?? Infinity) && Jz(r.z1, CC) < (o.cap ?? Infinity)) for (const t of M.T) (err[t] = err[t] || []).push(p.y[t] - targetOf(t, r.z1, r.z)); }   // (accuracy in the walking region when o.cap is set)
    for (const d of rows.decisions.filter(d => d.start === s)) { const cs = d.cands.filter(c => c.c != null || c.fell); if (cs.length < 2) continue; const tc = (c) => c.fell ? Infinity : c.c, best = Math.min(...cs.map(tc)); if (!Number.isFinite(best)) continue;
      const sc = cs.map(c => { const p = P(c.z, c.u); return J0(p.y, d.costC || costC) + (p.pFall > 0.5 ? 1e6 : 0); }), pick = cs[sc.indexOf(Math.min(...sc))]; reg.push({ start: s, k: d.k, lvl: d.lvl || 1, regret: tc(pick) - best, best, pickFell: pick.fell, n: cs.length }); } }
  const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
  const summ = Object.fromEntries(Object.entries(err).map(([t, e]) => [t, { rmse: Math.sqrt(e.reduce((a, v) => a + v * v, 0) / e.length), p95: q(e.map(Math.abs), 0.95), n: e.length }]));
  const rg = reg.map(r => r.regret).filter(Number.isFinite);
  return { err: summ, feas: fs_, regret: { n: reg.length, mean: rg.reduce((a, b) => a + b, 0) / rg.length, median: q(rg, 0.5), p90: q(rg, 0.9), pickFell: reg.filter(r => r.pickFell).length, exact: reg.filter(r => r.regret === 0).length }, perDecision: reg }; }
if (process.argv[1] && process.argv[1].endsWith("surrogate.mjs")) {
  const files = process.argv.slice(2).filter(a => a.endsWith(".json")), rows = loadRows(files), costC = { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 };
  console.log(`rows ${rows.length} (fell ${rows.filter(r => r.fell).length}) · decisions ${rows.decisions.length} · starts ${[...new Set(rows.map(r => r.start))].join(" ")}`);
  const sets = { cp: [...GROUPS.cp], "cp+com": [...GROUPS.cp, ...GROUPS.com], "cp+feet": [...GROUPS.cp, ...GROUPS.feet], "cp+com+feet": [...GROUPS.cp, ...GROUPS.com, ...GROUPS.feet],
    "+L": [...GROUPS.cp, ...GROUPS.com, ...GROUPS.feet, ...GROUPS.L], "+pose": [...GROUPS.cp, ...GROUPS.com, ...GROUPS.feet, ...GROUPS.L, ...GROUPS.pose], "+load": [...GROUPS.cp, ...GROUPS.com, ...GROUPS.feet, ...GROUPS.L, ...GROUPS.pose, ...GROUPS.load],
    "+mem": [...GROUPS.cp, ...GROUPS.com, ...GROUPS.feet, ...GROUPS.L, ...GROUPS.pose, ...GROUPS.load, ...GROUPS.mem] };
  const which = (process.env.SETS || "cp,cp+com+feet,+pose,+load,+mem").split(","), kinds = (process.env.KINDS || "lin,quad,local").split(","), out = [];
  for (const nm of (process.env.NOCV ? [] : which)) for (const kind of kinds) { const t0 = Date.now(), r = heldOut(rows, { kind, F: sets[nm], lam: +(process.env.LAM || 1), cap: process.env.CAP ? +process.env.CAP : undefined, badCap: process.env.BADCAP ? +process.env.BADCAP : undefined }, costC); out.push({ set: nm, kind, ...r, perDecision: undefined });
    console.log(`${nm.padEnd(14)} ${kind.padEnd(6)} | ` + ["xi.0", "xi.1", "v.0", "v.1", "achF", "dur"].map(t => `${t} ${(100 * r.err[t].rmse).toFixed(2)}/${(100 * r.err[t].p95).toFixed(2)}`).join(" ") + ` | regret mean ${r.regret.mean.toFixed(2)} med ${r.regret.median.toFixed(2)} p90 ${r.regret.p90.toFixed(2)} exact ${r.regret.exact}/${r.regret.n} pickFell ${r.regret.pickFell} | fell ${r.feas.fell} predSafe ${r.feas.fellPredSafe} falseAlarm ${r.feas.safePredFell} | ${((Date.now() - t0) / 1000).toFixed(1)} s`); }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  const rowsX = process.env.EXCLUDE ? Object.assign(rows.filter(r => r.start !== process.env.EXCLUDE), { decisions: rows.decisions.filter(d => d.start !== process.env.EXCLUDE) }) : rows;   // (held-out fits: one start never seen)
  if (process.env.SAVE) { const M = fit(rowsX, { kind: process.env.SAVE_KIND || "quad", F: sets[process.env.SAVE_SET || "+load"], lam: +(process.env.LAM || 1), cap: +(process.env.CAP || Infinity), badCap: process.env.BADCAP ? +process.env.BADCAP : undefined, capC: process.env.CAPC ? +process.env.CAPC : undefined }); M.trainedOn = files.map(f => f.split("/").pop()); M.exclude = process.env.EXCLUDE || null; fs.writeFileSync(process.env.SAVE, JSON.stringify(M)); console.log("saved", process.env.SAVE); }
  if (process.env.SAVE_POLICY) { const Pm = fitPolicy(files, sets[process.env.SAVE_SET || "cp+com+feet"], { exclude: process.env.EXCLUDE || null }); fs.writeFileSync(process.env.SAVE_POLICY, JSON.stringify(Pm)); console.log("policy", Pm.n, "decisions"); }
  if (process.env.SAVE_V) { const V = fitTerminal(files, sets[process.env.SAVE_SET || "+load"], { exclude: process.env.EXCLUDE || null }); fs.writeFileSync(process.env.SAVE_V, JSON.stringify(V)); console.log("terminal V", V.n, "rows; held-out rmse", V.heldOut.rmse.toFixed(2), "vs sd", V.heldOut.ySd.toFixed(2)); } }

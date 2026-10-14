// SLIDE-PHYS-2 copy of SLIDE-PHYS-1's physics-in-the-loop authoring search (same CMA-ES), on the SP2 H structure (sp2_param.mjs) with the SP2 qualification objective.
// SLIDE-PHYS-1 physics-in-the-loop authoring search (disclosed tool, not a result by itself): CMA-ES (Hansen 2016, standard (μ/μ_w, λ) with
// rank-one + rank-μ updates) over the normalised sp_param.mjs parameters; each candidate is simulated at several approach speeds (robustness:
// cost = mean + 0.5·max over speeds); evaluations run in parallel worker threads. Every evaluation is logged (preserved as evidence).
// usage (worktree root): node --max-old-space-size=8192 sp_search.mjs --out <dir> [--gens 25] [--lambda 16] [--workers 8] [--speeds 4.5,5.0,5.5] [--seed 1]
import fs from "fs"; import os from "os"; import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
if (!isMainThread) { const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, CL = await import(S1 + "sp_climits.mjs"), P = await import(new URL("./sp2_param.mjs", import.meta.url).href);
  parentPort.on("message", async (job) => { try { const p = P.toPhys(job.u), cand = P.finalize(P.makeCand(p, job.speed, job.id), job.ctrl || "A6"), out = await CL.auditRun(cand, { steps: job.steps || 420 }); out.contactRule = cand.soleRule;
    const m = P.M.measure(out), c = P.cost(m, out.climits); delete m.series; parentPort.postMessage({ ok: true, key: job.key, speed: job.speed, cost: { total: c.total, parts: c }, m, hash: out.finalHash }); } catch (e) { parentPort.postMessage({ ok: false, key: job.key, err: String(e.stack || e) }); } }); }
else {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const P = await import(new URL("./sp2_param.mjs", import.meta.url).href), n = P.PARAMS.length, gens = +arg("gens", "25"), lam = +arg("lambda", "16"), nW = +arg("workers", "8"), speeds = arg("speeds", "4.5,5.0,5.5").split(",").map(Number);
  let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const workers = Array.from({ length: nW }, () => new Worker(new URL(import.meta.url), { workerData: {} })), queue = [], pending = new Map();
  workers.forEach(w => w.on("message", (r) => { const cb = pending.get(r.key); pending.delete(r.key); cb(r); w.busy = false; pump(); }));
  const pump = () => { for (const w of workers) if (!w.busy && queue.length) { const j = queue.shift(); w.busy = true; pending.set(j.key, j.cb); w.postMessage({ key: j.key, u: j.u, speed: j.speed, id: j.id, ctrl: arg("ctrl", "A6") }); } };
  const evalU = (u, tag) => Promise.all(speeds.map((s, i) => new Promise(res => { queue.push({ key: tag + "_" + i, u, speed: s, id: tag, cb: res }); pump(); }))).then(rs => { const cs = rs.map(r => r.ok ? r.cost.total : 50);
    return { u, tag, cost: cs.reduce((a, b) => a + b, 0) / cs.length + 0.5 * Math.max(...cs), per: rs.map(r => ({ speed: r.speed, ok: r.ok, total: r.ok ? +r.cost.total.toFixed(3) : 50, parts: r.ok ? Object.fromEntries(Object.entries(r.cost.parts).map(([k, v]) => [k, +v.toFixed(3)])) : null, m: r.ok ? r.m : r.err, hash: r.hash })) }; });
  // CMA-ES state
  const mu = Math.floor(lam / 2), wRaw = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), wS = wRaw.reduce((a, b) => a + b, 0), w = wRaw.map(x => x / wS), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)), damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = (arg("start") ? JSON.parse(arg("start")) : P.toU(P.START)).slice(), sigma = +arg("sigma", "0.22"), pc = new Array(n).fill(0), ps = new Array(n).fill(0), C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const chol = (A) => { const Lm = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k]; Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j]; } return Lm; };
  const log = { tool: "sp_search.mjs (CMA-ES)", params: P.PARAMS, speeds, lambda: lam, gens, seed: +arg("seed", "1"), start: m.slice(), generations: [] }; let best = null;
  const base = await evalU(m.slice(), "g0_mean"); best = base; log.base = base; console.log("start cost", base.cost.toFixed(3), JSON.stringify(base.per.map(p => [p.speed, p.total])));
  for (let g = 1; g <= gens; g++) { const Lc = chol(C), Z = [], X = [];
    for (let k = 0; k < lam; k++) { const z = Array.from({ length: n }, gauss), y = Lc.map(r => r.reduce((s, v, j) => s + v * z[j], 0)); Z.push(y); X.push(m.map((mi, i) => Math.max(0, Math.min(1, mi + sigma * y[i])))); }
    const res = await Promise.all(X.map((x, k) => evalU(x, `g${g}_${k}`))), ord = res.map((r, k) => [r.cost, k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const old = m.slice(); m = Array.from({ length: n }, (_, i) => ord.slice(0, mu).reduce((s, k, r) => s + w[r] * X[k][i], 0)); const yw = m.map((x, i) => (x - old[i]) / sigma);
    // ps update needs C^{-1/2}·yw: use the Cholesky solve as an approximation of the whitening
    const Linv = (v) => { const out = []; for (let i = 0; i < n; i++) { let s = v[i]; for (let k = 0; k < i; k++) s -= Lc[i][k] * out[k]; out.push(s / Lc[i][i]); } return out; };
    const zw = Linv(yw); ps = ps.map((p, i) => (1 - cs) * p + Math.sqrt(cs * (2 - cs) * mueff) * zw[i]); const psn = Math.hypot(...ps), hs = psn / Math.sqrt(1 - (1 - cs) ** (2 * g)) / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    pc = pc.map((p, i) => (1 - cc) * p + hs * Math.sqrt(cc * (2 - cc) * mueff) * yw[i]);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let rmu = 0; ord.slice(0, mu).forEach((k, r) => { rmu += w[r] * ((X[k][i] - old[i]) / sigma) * ((X[k][j] - old[j]) / sigma); }); C[i][j] = (1 - c1 - cmu) * C[i][j] + c1 * (pc[i] * pc[j] + (1 - hs) * cc * (2 - cc) * C[i][j]) + cmu * rmu; }
    sigma *= Math.exp((cs / damps) * (psn / chiN - 1)); sigma = Math.min(sigma, 0.4);
    const gb = res[ord[0]]; if (gb.cost < best.cost) best = gb; log.generations.push({ g, sigma, best: gb.cost, mean: res.reduce((s, r) => s + r.cost, 0) / lam, evals: res.map(r => ({ tag: r.tag, cost: +r.cost.toFixed(4), u: r.u.map(x => +x.toFixed(4)), per: r.per })) });
    console.log(`gen ${g} best ${gb.cost.toFixed(3)} overall ${best.cost.toFixed(3)} sigma ${sigma.toFixed(3)} | ${JSON.stringify(gb.per.map(p => [p.speed, p.total]))}`);
    fs.writeFileSync(`${OUT}/search_log.json`, JSON.stringify({ ...log, best: { cost: best.cost, tag: best.tag, u: best.u, phys: P.toPhys(best.u), per: best.per } })); }
  await Promise.all(workers.map(w => w.terminate())); console.log("BEST", best.tag, best.cost.toFixed(3), JSON.stringify(P.toPhys(best.u))); }

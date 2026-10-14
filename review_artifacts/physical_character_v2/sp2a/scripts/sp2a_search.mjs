// SP2A physics-in-the-loop authoring search (disclosed tool, not a result by itself): SLIDE-PHYS-1 / -2's CMA-ES (same update rules) over the
// normalised SP2A authoring / objective parameters below; every candidate is simulated from the RUN-1 run-in at several approach speeds
// (robustness: cost = mean + 0.5·max over speeds), in worker threads. Cost = the SP2 qualification cost (sp2_param.cost: tackling boot
// first / loaded, bent-leg side first, face-down, head, torso, slide, knee glide share, knee → thigh / hip hand-over, lying, joint limits)
// + SP2A's two brief requirements: NO ankle hard-limit excess, NO sustained (≥ 0.15 s) hip hard-limit excess. Every evaluation is logged.
// usage (worktree root): node sp2a_search.mjs --out <dir> --runins run1_4.5.json,run1_5.json,run1_5.5.json [--gens 20] [--lambda 16] [--workers 8]
import fs from "fs"; import { Worker, isMainThread, parentPort } from "worker_threads";
// S7 structure (sp2a_flight.mjs): authored ballistic final flight into the committed plant state; SP2's physical tackle + A7 contact authority;
// the SP2A refinement searched = the fold leg's morph into a 3D tuck and the seat orientation after the fold side has landed.
// (S1–S6 searched physical-run-entry structures; none produced a seated slide — logs kept, SP2A_LOG.md §3.)
export const PARAMS = [["tA", 0.25, 0.55], ["dT", 0.08, 0.5], ["hipFlex", 40, 85], ["hipAbd", -27, 25], ["hipRot", -42, 0], ["knee", 105, 145], ["ankDf", -38, 0], ["ankInv", 0, 28],
  ["seatPitch", -32, 0], ["seatRoll", 8, 40], ["seatKo", 50, 400]];
export const START = { tA: 0.42, dT: 0.25, hipFlex: 59, hipAbd: 10, hipRot: -30, knee: 132, ankDf: -22, ankInv: 15, seatPitch: -20, seatRoll: 30, seatKo: 190 };
export const FIXED = { mode: "flight" };
export const toU = (p) => PARAMS.map(([k, lo, hi]) => (p[k] - lo) / (hi - lo));
export const toPhys = (u) => Object.fromEntries(PARAMS.map(([k, lo, hi], i) => [k, +(lo + Math.max(0, Math.min(1, u[i])) * (hi - lo)).toFixed(4)]));
export const toOpts = (p, id) => ({ id, ...FIXED, morph: { ...p } });
// seam: the largest departure of the physical pelvis angular velocity from RUN-1's own continuation over the first 60 ms (rad/s)
export function seamOf(o, L) { const C = o.run1Cont; if (!C) return null; const rr = (Ra, Rb, dt) => { const dq0 = L.Q.norm(L.Q.mul(Rb, L.Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); return s < 1e-12 ? [0, 0, 0] : L.V.sc([dq[0] / s, dq[1] / s, dq[2] / s], 2 * Math.atan2(s, dq[3]) / dt); };
  let mx = 0; for (let n = 1; n < C.length - 1 && n / 240 <= 0.06; n++) { const wR = rr(C[n - 1].pelvisRot, C[n + 1].pelvisRot, C[n + 1].t - C[n - 1].t), w = o.recs[n - 1].S[0].w; mx = Math.max(mx, L.V.len(L.V.sub(w, wR))); } return mx; }
export function costSP2A(P2, m, climits, o, L) { const c = P2.cost(m, climits), cl = Object.entries(climits || {}); if (o && L) { const s = seamOf(o, L); m.seamW = s; c.seam = s == null ? 0 : 1.0 * Math.max(0, s - 1.5);
    // shaping: whole-body pitch angular momentum about the COM (+ = forward) at the first non-foot turf contact — a seated landing needs ≤ 0
    const k = o.recs.findIndex(r => r.contacts.some(x => x.kind.startsWith("turf") && x.Jn > 0 && !/^foot_/.test((x.a === "turf" ? x.b : x.a)[1]))); if (k > 0) { const S = o.recs[k - 1].S.slice(0, L.B.length), cm = L.comOf(S); let Lx = 0;
      S.forEach((b, i) => { const r = L.V.sub(b.com, cm), mv = L.V.sc(b.v, L.B[i].mass), Iw = L.IL.mat3vec(L.IL.MC.Iworld(b.rot, L.B[i].inertia), b.w); Lx += (r[1] * mv[2] - r[2] * mv[1]) + Iw[0]; });
      m.landPitchL = Lx; c.landPitch = 0.08 * Math.max(0, Lx); } }
  c.ankleLimit = 2 * cl.filter(([id]) => id.startsWith("ankle_")).reduce((s, [, e]) => s + Math.max(0, e.max - 0.5), 0);
  c.hipSustained = (+process.env.SP2A_HIPW || 1) * cl.filter(([id]) => id.startsWith("hip_") && e2t(climits[id]) >= 0.15).reduce((s, [, e]) => s + e.max, 0);
  c.total = Object.entries(c).filter(([k]) => k !== "total").reduce((s, [, x]) => s + x, 0); return c; }
const e2t = (e) => e.dur ?? e.t ?? 0;
if (!isMainThread) { const B0 = new URL("../../", import.meta.url).href, R = await import(new URL("./sp2a_run.mjs", import.meta.url).href), FL = await import(new URL("./sp2a_flight.mjs", import.meta.url).href), P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), LL = await import(B0 + "slide_phys1/scripts/sp_lib.mjs");
  parentPort.on("message", async (job) => { try { const op = toOpts(toPhys(job.u), job.id), o = op.mode === "flight" ? await FL.runFlight(job.runin, op, job.steps || 420) : await R.runSP2A(job.runin, null, op, job.steps || 420), m = P2.M.measure(o), c = costSP2A(P2, m, o.climits, o, LL); delete m.series;
    parentPort.postMessage({ ok: true, key: job.key, runin: job.runin, cost: { total: c.total, parts: c }, m, hash: o.finalHash }); } catch (e) { parentPort.postMessage({ ok: false, key: job.key, err: String(e.stack || e) }); } }); }
else if (process.argv[1] && process.argv[1].endsWith("sp2a_search.mjs")) {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const n = PARAMS.length, gens = +arg("gens", "20"), lam = +arg("lambda", "16"), nW = +arg("workers", "8"), runins = arg("runins").split(",");
  let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const workers = Array.from({ length: nW }, () => new Worker(new URL(import.meta.url))), queue = [], pending = new Map();
  workers.forEach(w => w.on("message", (r) => { const cb = pending.get(r.key); pending.delete(r.key); cb(r); w.busy = false; pump(); }));
  const pump = () => { for (const w of workers) if (!w.busy && queue.length) { const j = queue.shift(); w.busy = true; pending.set(j.key, j.cb); w.postMessage({ key: j.key, u: j.u, runin: j.runin, id: j.id, steps: +arg("steps", "420") }); } };
  const evalU = (u, tag) => Promise.all(runins.map((ri, i) => new Promise(res => { queue.push({ key: tag + "_" + i, u, runin: ri, id: tag, cb: res }); pump(); }))).then(rs => { const cs = rs.map(r => r.ok ? r.cost.total : 50);
    return { u, tag, cost: cs.reduce((a, b) => a + b, 0) / cs.length + 0.5 * Math.max(...cs), per: rs.map(r => ({ runin: r.runin, ok: r.ok, total: r.ok ? +r.cost.total.toFixed(3) : 50, parts: r.ok ? Object.fromEntries(Object.entries(r.cost.parts).filter(([, v]) => v > 0.005).map(([k, v]) => [k, +v.toFixed(3)])) : null, err: r.ok ? null : r.err, hash: r.hash })) }; });
  const mu = Math.floor(lam / 2), wRaw = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), wS = wRaw.reduce((a, b) => a + b, 0), w = wRaw.map(x => x / wS), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)), damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = (arg("start") ? toU({ ...START, ...JSON.parse(fs.readFileSync(arg("start"))) }) : toU(START)).slice(), sigma = +arg("sigma", "0.2"), pc = new Array(n).fill(0), ps = new Array(n).fill(0), C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const chol = (A) => { const Lm = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k]; Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j]; } return Lm; };
  const log = { tool: "sp2a_search.mjs (CMA-ES)", params: PARAMS, runins, lambda: lam, gens, seed: +arg("seed", "1"), start: m.slice(), generations: [] }; let best = null;
  const base = await evalU(m.slice(), "g0_mean"); best = base; log.base = base; console.log("start cost", base.cost.toFixed(3), JSON.stringify(base.per.map(p => [p.total, p.parts])));
  for (let g = 1; g <= gens; g++) { const Lc = chol(C), X = [];
    for (let k = 0; k < lam; k++) { const z = Array.from({ length: n }, gauss), y = Lc.map(r => r.reduce((s, v, j) => s + v * z[j], 0)); X.push(m.map((mi, i) => Math.max(0, Math.min(1, mi + sigma * y[i])))); }
    const res = await Promise.all(X.map((x, k) => evalU(x, `g${g}_${k}`))), ord = res.map((r, k) => [r.cost, k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const old = m.slice(); m = Array.from({ length: n }, (_, i) => ord.slice(0, mu).reduce((s, k, r) => s + w[r] * X[k][i], 0)); const yw = m.map((x, i) => (x - old[i]) / sigma);
    const Linv = (v) => { const out = []; for (let i = 0; i < n; i++) { let s = v[i]; for (let k = 0; k < i; k++) s -= Lc[i][k] * out[k]; out.push(s / Lc[i][i]); } return out; };
    const zw = Linv(yw); ps = ps.map((p, i) => (1 - cs) * p + Math.sqrt(cs * (2 - cs) * mueff) * zw[i]); const psn = Math.hypot(...ps), hs = psn / Math.sqrt(1 - (1 - cs) ** (2 * g)) / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    pc = pc.map((p, i) => (1 - cc) * p + hs * Math.sqrt(cc * (2 - cc) * mueff) * yw[i]);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let rmu = 0; ord.slice(0, mu).forEach((k, r) => { rmu += w[r] * ((X[k][i] - old[i]) / sigma) * ((X[k][j] - old[j]) / sigma); }); C[i][j] = (1 - c1 - cmu) * C[i][j] + c1 * (pc[i] * pc[j] + (1 - hs) * cc * (2 - cc) * C[i][j]) + cmu * rmu; }
    sigma *= Math.exp((cs / damps) * (psn / chiN - 1)); sigma = Math.min(sigma, 0.4);
    const gb = res[ord[0]]; if (gb.cost < best.cost) best = gb; log.generations.push({ g, sigma, best: gb.cost, mean: res.reduce((s, r) => s + r.cost, 0) / lam, evals: res.map(r => ({ tag: r.tag, cost: +r.cost.toFixed(4), u: r.u.map(x => +x.toFixed(4)), per: r.per })) });
    console.log(`gen ${g} best ${gb.cost.toFixed(3)} overall ${best.cost.toFixed(3)} sigma ${sigma.toFixed(3)} | ${JSON.stringify(gb.per.map(p => [p.total, p.parts]))}`);
    fs.writeFileSync(`${OUT}/search_log.json`, JSON.stringify({ ...log, best: { cost: best.cost, tag: best.tag, u: best.u, phys: toPhys(best.u), per: best.per } })); }
  await Promise.all(workers.map(w => w.terminate())); console.log("BEST", best.tag, best.cost.toFixed(3), JSON.stringify(toPhys(best.u))); }

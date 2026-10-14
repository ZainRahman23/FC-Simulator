// SP2E timing search (CMA-ES over a SMALL set of interpretable follow-through parameters; the sp2d_search.mjs machinery). Each candidate runs on the 3 RUN-1
// run-ins (4.5 / 5.0 / 5.5 m/s), 6 s, at F37.5 (unchanged). Everything not listed stays at its SP2E default (sp2e_cand.mjs) / SP2D / SP2C value.
// Cost costSP2E (times after the first fold-side contact; the reference's measured sequence as evidence, banded, not keyframed):
//   preserved  SP2C's folded-leg terms (knee placement at contact, shin compactness, fold toe / sole / studs), SP2's tackle terms, slide ≥ 3.0 m, joint limits
//   trunk      trunk from vertical: +0.2 s 25–55°, +0.3 s 50–85°, +0.5 s 65–95° (reference 30 / 69 / 82–84°); ≤ 100° at +1 s, the stop and 6 s (not over the back)
//   roll       pelvis roll ≥ 35° at +0.3 s and ≥ 55° at +0.5 s (coordinated with the trunk)
//   established on the folded side / back by +0.35…0.45 s (sp2e_diag: trunk ≥ 60°, pelvis roll ≥ 50°, chest not down, held)
//   post       hand / forearm first touch in [+0.10, +0.35 s]; meaningful load (≥ 0.10 BW) by +0.40 s; its share of the turf normal impulse ≥ 6 %;
//              its share of the friction braking ≤ 10 %; peak posting-shoulder elevation 120–145° (reference 130–135°)
//   chestDown  any chest-down — graded by time; upright: trunk < 35° after +0.3 s; passive: regional failure / whole-body fallback
// usage (worktree root): node sp2e_search.mjs --runins a,b,c --out dir [--gens 15] [--lambda 12] [--workers 7] [--sigma 0.15] [--seed 1] [--start p.json]
import fs from "fs"; import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
export const PARAMS = [["d_t1", 0.48, 0.80], ["d_lumbarFlex", -25, 0], ["d_thoracicFlex", -15, 0], ["d_lumbarLat", -28, -5], ["d_thoracicLat", -22, 0], ["d_thoracicRot", 10, 40],
  ["p_ko", 100, 800], ["p_roll", 60, 90], ["a_reachT", 0.52, 0.78], ["a_reachAbd", 10, 60], ["a_openT", 0.75, 1.25], ["a_openAbd", 75, 130], ["u_trailLeg", 0.4, 0.92]];
export const START = { d_t1: 0.58, d_lumbarFlex: -14, d_thoracicFlex: -8, d_lumbarLat: -22, d_thoracicLat: -16, d_thoracicRot: 35, p_ko: 800, p_roll: 85, a_reachT: 0.65, a_reachAbd: 21, a_openT: 0.9, a_openAbd: 106, u_trailLeg: 0.55 };
export function toOpts(p, id) { return { id, mode: "sp2e", commit: { t0: 0.18, t1: 0.38, lumbarLat: -15, thoracicLat: -10, thoracicRot: 30 },
  descent: { t0: 0.40, t1: p.d_t1, lumbarFlex: p.d_lumbarFlex, thoracicFlex: p.d_thoracicFlex, lumbarLat: p.d_lumbarLat, thoracicLat: p.d_thoracicLat, thoracicRot: p.d_thoracicRot },
  pelvis: { t0: 0.38, t1: Math.max(0.5, p.d_t1 - 0.03), ko: p.p_ko, roll: p.p_roll }, arm: { t0: 0.45, reachT: p.a_reachT, reachAbd: p.a_reachAbd, openT: Math.max(p.a_openT, p.a_reachT + 0.15), openAbd: p.a_openAbd },
  auth: { trailLeg: p.u_trailLeg, from: 0.06, until: 0.6 }, phys: p }; }
const band = (v, lo, hi) => v == null ? 1 : Math.max(0, lo - v) + Math.max(0, v - hi);
export function costSP2E(e, dd, cC) { const c = {}, ev = e.events, mk = (x) => e.marks[`+${x.toFixed(2)}`] || {};
  for (const k of ["tuck", "compact", "foldBoot", "tackle", "limits"]) c[k] = cC[k] || 0; c.slide = 1.5 * Math.max(0, 3.0 - (e.slidePathM || 0));
  c.trunk = 0.05 * (band(mk(0.2).trunkDeg, 25, 55) + band(mk(0.3).trunkDeg, 50, 85) + band(mk(0.5).trunkDeg, 65, 95) + band(mk(1.0).trunkDeg, 0, 100) + band(dd.summary.trunkAtStop, 0, 100) + band(dd.summary.end.trunkDeg, 0, 100));
  c.roll = 0.04 * (Math.max(0, 35 - (mk(0.3).pelvisRoll ?? 0)) + Math.max(0, 55 - (mk(0.5).pelvisRoll ?? 0)));
  c.established = ev.established == null ? 4 : 4 * Math.max(0, ev.established - 0.40);
  c.post = (ev.handFirstTouch == null ? 3 : 3 * band(ev.handFirstTouch, 0.10, 0.35)) + (ev.handMeaningfulLoad == null ? 2 : 3 * Math.max(0, ev.handMeaningfulLoad - 0.40)) + 60 * Math.max(0, 0.06 - (e.loadShare.hand || 0))
    + 15 * Math.max(0, (dd.summary.handL.brakeShare || 0) - 0.10) + 0.04 * band(ev.peakShoulderL, 120, 145);
  c.chestDown = ev.chestDown != null ? 3 + 6 * Math.max(0, (5.6 - ev.chestDown) / 5.6) : 2 * Math.max(0, -0.2 - dd.summary.minBellyDown); c.upright = 2 * (ev.uprightS || 0);
  c.passive = (e.failures && Object.keys(e.failures).length ? 5 : 0) + (e.wholeBody != null ? 5 : 0);
  c.total = Object.entries(c).filter(([k]) => k !== "total").reduce((a, [, x]) => a + x, 0); return c; }
if (!isMainThread && workerData && workerData.tool === "sp2e_search") { const B0 = new URL("../../", import.meta.url).href, RE = await import(new URL("./sp2e_run.mjs", import.meta.url).href), DE = await import(new URL("./sp2e_diag.mjs", import.meta.url).href), DD = await import(B0 + "sp2d/scripts/sp2d_diag.mjs");
  const DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), SS = await import(B0 + "sp2c/scripts/sp2c_search.mjs"), P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
  parentPort.on("message", async (job) => { try { const op = toOpts(job.p, job.id), o = await RE.runE(job.runin, op, RE.TEMP_M, job.steps), d = DG.diagnose(o, RE.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), cC = SS.costSP2C(o, d, m2, c2, L, RG);
    const e = DE.diagnoseE(o, RE.TEMP_M), dd = DD.diagnoseD(o, RE.TEMP_M), c = costSP2E(e, dd, cC), ev = e.events;
    parentPort.postMessage({ ok: true, key: job.key, runin: job.runin, cost: c, hash: o.finalHash, m: { touch: ev.handFirstTouch, load: ev.handMeaningfulLoad, est: ev.established, chest: ev.chestDown, shPk: ev.peakShoulderL, handShare: e.loadShare.hand, handBrake: dd.summary.handL.brakeShare, trunk: ["0.20", "0.30", "0.50", "1.00"].map(k => e.marks["+" + k] && e.marks["+" + k].trunkDeg), roll: ["0.20", "0.30", "0.50"].map(k => e.marks["+" + k] && e.marks["+" + k].pelvisRoll), slide: e.slidePathM } }); } catch (e) { parentPort.postMessage({ ok: false, key: job.key, runin: job.runin, err: String(e.stack || e) }); } }); }
else if (process.argv[1] && process.argv[1].endsWith("sp2e_search.mjs")) {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const P0 = { ...START, ...(arg("start") ? JSON.parse(fs.readFileSync(arg("start"))) : {}) }, SUB = arg("subset") ? arg("subset").split(",") : PARAMS.map(q => q[0]), PS = PARAMS.filter(q => SUB.includes(q[0]));
  const toUs = (p) => PS.map(([k, lo, hi]) => Math.max(0, Math.min(1, (p[k] - lo) / (hi - lo)))), toPs = (u) => ({ ...P0, ...Object.fromEntries(PS.map(([k, lo, hi], i) => [k, +(lo + u[i] * (hi - lo)).toFixed(4)])) });
  const n = PS.length, gens = +arg("gens", "15"), lam = +arg("lambda", "12"), nW = +arg("workers", "7"), runins = arg("runins").split(","), steps = +arg("steps", "1440");
  let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const workers = Array.from({ length: nW }, () => new Worker(new URL(import.meta.url), { workerData: { tool: "sp2e_search" } })), queue = [], pending = new Map();
  workers.forEach(w => w.on("message", (r) => { const cb = pending.get(r.key); pending.delete(r.key); cb(r); w.busy = false; pump(); }));
  const pump = () => { for (const w of workers) if (!w.busy && queue.length) { const j = queue.shift(); w.busy = true; pending.set(j.key, j.cb); w.postMessage({ key: j.key, p: toPs(j.u), runin: j.runin, id: j.id, steps }); } };
  const evalU = (u, tag) => Promise.all(runins.map((ri, i) => new Promise(res => { queue.push({ key: tag + "_" + i, u, runin: ri, id: tag, cb: res }); pump(); }))).then(rs => { const cs = rs.map(r => r.ok ? r.cost.total : 60);
    return { u, tag, cost: cs.reduce((a, b) => a + b, 0) / cs.length + 0.5 * Math.max(...cs), per: rs.map(r => ({ runin: r.runin.split("/").pop(), ok: r.ok, hash: r.hash, total: r.ok ? +r.cost.total.toFixed(3) : 60,
      parts: r.ok ? Object.fromEntries(Object.entries(r.cost).filter(([k, v]) => k !== "total" && v > 0.005).map(([k, v]) => [k, +v.toFixed(3)])) : null, m: r.ok ? r.m : null, err: r.ok ? undefined : r.err })) }; });
  const mu = Math.floor(lam / 2), wRaw = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), wS = wRaw.reduce((a, b) => a + b, 0), w = wRaw.map(x => x / wS), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)), damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = toUs(P0).slice(), sigma = +arg("sigma", "0.15"), pc = new Array(n).fill(0), ps = new Array(n).fill(0), C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const chol = (A) => { const Lm = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k]; Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j]; } return Lm; };
  const log = { tool: "sp2e_search.mjs (CMA-ES)", friction: "F37.5 temporary (m 0.375), not recalibrated", params: PS, fixed: Object.fromEntries(Object.entries(P0).filter(([k]) => !SUB.includes(k))), runins, lambda: lam, gens, steps, seed: +arg("seed", "1"), start: toPs(m), generations: [] }; let best = null;
  const base = await evalU(m.slice(), "g0_mean"); best = base; log.base = base; console.log("start cost", base.cost.toFixed(3), JSON.stringify(base.per.map(p => [p.total, p.parts])));
  for (let g = 1; g <= gens; g++) { const Lc = chol(C), X = [];
    for (let k = 0; k < lam; k++) { const z = Array.from({ length: n }, gauss), y = Lc.map(r => r.reduce((s, v, j) => s + v * z[j], 0)); X.push(m.map((mi, i) => Math.max(0, Math.min(1, mi + sigma * y[i])))); }
    const res = await Promise.all(X.map((x, k) => evalU(x, `g${g}_${k}`))), ord = res.map((r, k) => [r.cost, k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const old = m.slice(); m = Array.from({ length: n }, (_, i) => ord.slice(0, mu).reduce((s, k, r) => s + w[r] * X[k][i], 0)); const yw = m.map((x, i) => (x - old[i]) / sigma);
    const Li = (() => { const Lm = Lc, I = Lm.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))), X2 = I.map(r => r.slice()); for (let c = 0; c < n; c++) for (let i = 0; i < n; i++) { let s = I[i][c]; for (let k = 0; k < i; k++) s -= Lm[i][k] * X2[k][c]; X2[i][c] = s / Lm[i][i]; } return X2; })();
    const zw = Li.map(r => r.reduce((s, v, j) => s + v * yw[j], 0)); ps = ps.map((p, i) => (1 - cs) * p + Math.sqrt(cs * (2 - cs) * mueff) * zw[i]);
    const psn = Math.sqrt(ps.reduce((s, x) => s + x * x, 0)), hs = psn / Math.sqrt(1 - (1 - cs) ** (2 * g)) / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    pc = pc.map((p, i) => (1 - cc) * p + hs * Math.sqrt(cc * (2 - cc) * mueff) * yw[i]); const ys = ord.slice(0, mu).map(k => X[k].map((x, i) => (x - old[i]) / sigma));
    C = C.map((r, i) => r.map((cij, j) => (1 - c1 - cmu) * cij + c1 * (pc[i] * pc[j] + (1 - hs) * cc * (2 - cc) * cij) + cmu * ys.reduce((s, y, q) => s + w[q] * y[i] * y[j], 0)));
    sigma = Math.min(0.5, sigma * Math.exp((cs / damps) * (psn / chiN - 1))); const gb = res[ord[0]]; if (gb.cost < best.cost) best = gb;
    log.generations.push({ g, sigma: +sigma.toFixed(4), best: { tag: gb.tag, cost: +gb.cost.toFixed(3), per: gb.per, p: toPs(gb.u) }, costs: ord.map(k => +res[k].cost.toFixed(3)) });
    console.log(`g${g} σ ${sigma.toFixed(3)} best ${gb.cost.toFixed(3)} (overall ${best.cost.toFixed(3)})`, JSON.stringify(gb.per.map(p => [p.total, p.parts])));
    fs.writeFileSync(OUT + "/search_log.json", JSON.stringify({ ...log, best: { tag: best.tag, cost: best.cost, per: best.per, p: toPs(best.u) } }, null, 1)); fs.writeFileSync(OUT + "/best_opts.json", JSON.stringify(toOpts(toPs(best.u), "SP2E_" + best.tag), null, 1)); }
  workers.forEach(w => w.terminate()); }

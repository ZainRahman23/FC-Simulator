// SP2D search (CMA-ES over a subset of the descent / post / arm options; worker threads). Each candidate runs on the 3 RUN-1 run-ins (4.5 / 5.0 /
// 5.5 m/s), 6 s, at the TEMPORARY friction F37.5 (not recalibrated). Cost costSP2D = SP2C's preserved terms (folded-knee placement at contact, folded-shin
// compactness, fold toe / sole / studs, SP2's tackle terms, slide ≥ 3.0 m, joint limits) + the SP2D progression (time t after the first fold-side contact):
//   trunk      trunk angle from vertical inside a descending band: +0.25 s 18–45°, +0.5 s 30–60°, +1.0 s 50–85°, +1.5 s 65–100°, end of slide and 6 s 70–100°
//              (no seated phase, lying not head-down); no slam (≤ 45° in any 0.25 s); "artificially upright" time (trunk < 35° from +0.6 s to the stop)
//   post       the fold-side hand / forearm first reaches the turf in [+0.3, +1.2 s]; it carries some of the turf normal impulse over the slide
//              (share ≥ 4 % — D-S3: ≥ 6 % at weight 80 —, ≤ 25 %: a post, not a prop) and little braking (≤ 10 %: it slides, not anchors); peak shoulder
//              elevation ≥ 120° (D-S3: in 120–150°, the reference band)
//   torso      side / back of the torso reaches the turf after +0.8 s and before the end of the slide
//   chestDown  any chest-down (thorax anterior axis below −0.5) — graded by time
//   end        6 s posture on the fold side / back: belly-down ∈ [−0.2, 1], fold side down or back down (sideDownL ≥ −0.2)
//   head       head turf impulse share > 0.5 % (D-S1: > 1 %)
//   passive    a regional failure or whole-body fallback in an undisturbed slide
// usage (worktree root): node sp2d_search.mjs --runins a,b,c --out dir [--gens 25] [--lambda 14] [--workers 7] [--sigma 0.15] [--seed 1] [--start p.json] [--subset k1,…]
import fs from "fs"; import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
export const PARAMS = [["d_t0", 0.42, 0.7], ["d_t1", 1.0, 2.2], ["d_lumbarFlex", -30, 0], ["d_thoracicFlex", -20, 5], ["d_lumbarLat", -15, 30], ["d_thoracicLat", -20, 20], ["d_lumbarRot", -5, 10], ["d_thoracicRot", -10, 40],
  ["d_neck", 0, 50], ["d_seatPitch", -60, 0], ["d_seatRoll", 10, 80], ["d_seatKo", 0, 400], ["p_t0", 0.42, 0.9], ["p_reachT", 0.6, 1.5], ["p_reachAbd", 10, 100], ["p_reachFlex", -65, 30], ["p_reachElbow", 0, 60],
  ["p_openT", 1.2, 2.6], ["p_openAbd", 90, 170], ["p_openFlex", -40, 60], ["p_openElbow", 0, 60], ["p_authArm", 0.3, 0.9], ["o_shRFlex", 0, 150], ["o_shRAbd", 20, 150], ["o_elRFlex", 10, 100]];
export const START = { d_t0: 0.5, d_t1: 1.6, d_lumbarFlex: -22, d_thoracicFlex: -12, d_lumbarLat: 5, d_thoracicLat: 0, d_lumbarRot: 6, d_thoracicRot: 28, d_neck: 30, d_seatPitch: -35, d_seatRoll: 45, d_seatKo: 150,
  p_t0: 0.45, p_reachT: 0.95, p_reachAbd: 45, p_reachFlex: -45, p_reachElbow: 10, p_openT: 1.8, p_openAbd: 135, p_openFlex: 0, p_openElbow: 15, p_authArm: 0.55, o_shRFlex: 60, o_shRAbd: 70, o_elRFlex: 60 };
export function toOpts(p, id) { const g = (pre) => Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith(pre)).map(([k, v]) => [k.slice(pre.length), v]));
  return { id, mode: "sp2d", descent: { t0: p.d_t0, t1: Math.max(p.d_t1, p.d_t0 + 0.3), ...Object.fromEntries(Object.entries(g("d_")).filter(([k]) => !["t0", "t1"].includes(k))) },
    post: { ...g("p_"), reachT: Math.max(p.p_reachT, p.p_t0 + 0.15), openT: Math.max(p.p_openT, Math.max(p.p_reachT, p.p_t0 + 0.15) + 0.2) }, other: g("o_"), phys: p }; }
const band = (v, lo, hi) => v == null ? 1 : Math.max(0, lo - v) + Math.max(0, v - hi);
export function costSP2D(o, dd, cC) { const c = {}, s = dd.summary, t0 = dd.firstFoldContactT, rows = dd.series, at = (x) => (rows.find(r => r[0] >= t0 + x) || [])[1] ?? null;
  for (const k of ["tuck", "compact", "foldBoot", "tackle", "limits", "slide"]) c[k] = cC[k] || 0; c.slide = 1.5 * Math.max(0, 3.0 - (dd.slidePathM || 0));
  // (D-S2: band weight 0.08 / °, an upper bound at the stop / end (lying, not head-down: ≤ 100°), and no slam: ≤ 45° of descent in any 0.25 s)
  let slam = 0; for (let i = 0; i < rows.length; i++) { if (rows[i][0] < t0) continue; const j = rows.findIndex(r => r[0] >= rows[i][0] + 0.25); if (j > 0) slam = Math.max(slam, rows[j][1] - rows[i][1]); }
  c.trunk = 0.08 * (band(at(0.25), 18, 45) + band(at(0.5), 30, 60) + band(at(1.0), 50, 85) + band(at(1.5), 65, 100) + band(s.trunkAtStop, 70, 100) + band(s.end.trunkDeg, 70, 100)) + 2 * (s.uprightS || 0) + 0.05 * Math.max(0, slam - 45);
  const tp = s.firstContact.handL; // (D-S3: post load weight 30 → 80 below a 6 % share; the posting-shoulder peak in the reference band 120–150° (measured ≈ 130–135°))
  c.post = (tp == null ? 4 : 3 * band(tp - t0, 0.3, 1.2)) + 80 * Math.max(0, 0.06 - s.handL.normalShare) + 10 * Math.max(0, s.handL.normalShare - 0.25) + 15 * Math.max(0, s.handL.brakeShare - 0.10) + 0.04 * band(s.peakShoulderL, 120, 150);
  const tt = s.firstContact.torso; c.torso = tt == null ? 2 : 2 * Math.max(0, t0 + 0.8 - tt) + 2 * Math.max(0, tt - dd.stopT);
  c.chestDown = s.chestDownT != null ? 3 + 6 * Math.max(0, (6 - s.chestDownT) / 6) + 2 * Math.max(0, -0.5 - s.minBellyDown) : 2 * Math.max(0, -0.2 - s.minBellyDown);
  c.end = 3 * Math.max(0, -0.2 - s.end.bellyDown) + 2 * Math.max(0, -0.2 - s.end.sideDownL);
  c.head = 60 * Math.max(0, s.head.normalShare - 0.005); c.passive = (s.failures && Object.keys(s.failures).length ? 5 : 0) + (s.wholeBody != null ? 5 : 0);
  c.total = Object.entries(c).filter(([k]) => k !== "total").reduce((a, [, x]) => a + x, 0); return c; }
// (worker branch only in this tool's own workers: other tools import this module for its cost function)
if (!isMainThread && workerData && workerData.tool === "sp2d_search") { const B0 = new URL("../../", import.meta.url).href, RD = await import(new URL("./sp2d_run.mjs", import.meta.url).href), DD = await import(new URL("./sp2d_diag.mjs", import.meta.url).href), DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs");
  const SS = await import(B0 + "sp2c/scripts/sp2c_search.mjs"), P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
  parentPort.on("message", async (job) => { try { const op = toOpts(job.p, job.id), o = await RD.runD(job.runin, op, RD.TEMP_M, job.steps), d = DG.diagnose(o, RD.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), cC = SS.costSP2C(o, d, m2, c2, L, RG), dd = DD.diagnoseD(o, RD.TEMP_M), c = costSP2D(o, dd, cC), s = dd.summary;
    parentPort.postMessage({ ok: true, key: job.key, runin: job.runin, cost: c, hash: o.finalHash, m: { post: s.firstContact.handL, postN: s.handL.normalShare, postB: s.handL.brakeShare, shL: s.peakShoulderL, torso: s.firstContact.torso, chest: s.chestDownT, trunk: s.trunkAt, end: [s.end.trunkDeg, s.end.bellyDown, s.end.sideDownL], slide: dd.slidePathM } }); } catch (e) { parentPort.postMessage({ ok: false, key: job.key, runin: job.runin, err: String(e.stack || e) }); } }); }
else if (process.argv[1] && process.argv[1].endsWith("sp2d_search.mjs")) {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  const P0 = { ...START, ...(arg("start") ? JSON.parse(fs.readFileSync(arg("start"))) : {}) }, SUB = arg("subset") ? arg("subset").split(",") : PARAMS.map(q => q[0]), PS = PARAMS.filter(q => SUB.includes(q[0]));
  const toUs = (p) => PS.map(([k, lo, hi]) => Math.max(0, Math.min(1, (p[k] - lo) / (hi - lo)))), toPs = (u) => ({ ...P0, ...Object.fromEntries(PS.map(([k, lo, hi], i) => [k, +(lo + u[i] * (hi - lo)).toFixed(4)])) });
  const n = PS.length, gens = +arg("gens", "25"), lam = +arg("lambda", "14"), nW = +arg("workers", "7"), runins = arg("runins").split(","), steps = +arg("steps", "1440");
  let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const workers = Array.from({ length: nW }, () => new Worker(new URL(import.meta.url), { workerData: { tool: "sp2d_search" } })), queue = [], pending = new Map();
  workers.forEach(w => w.on("message", (r) => { const cb = pending.get(r.key); pending.delete(r.key); cb(r); w.busy = false; pump(); }));
  const pump = () => { for (const w of workers) if (!w.busy && queue.length) { const j = queue.shift(); w.busy = true; pending.set(j.key, j.cb); w.postMessage({ key: j.key, p: toPs(j.u), runin: j.runin, id: j.id, steps }); } };
  const evalU = (u, tag) => Promise.all(runins.map((ri, i) => new Promise(res => { queue.push({ key: tag + "_" + i, u, runin: ri, id: tag, cb: res }); pump(); }))).then(rs => { const cs = rs.map(r => r.ok ? r.cost.total : 60);
    return { u, tag, cost: cs.reduce((a, b) => a + b, 0) / cs.length + 0.5 * Math.max(...cs), per: rs.map(r => ({ runin: r.runin.split("/").pop(), ok: r.ok, hash: r.hash, total: r.ok ? +r.cost.total.toFixed(3) : 60,
      parts: r.ok ? Object.fromEntries(Object.entries(r.cost).filter(([k, v]) => k !== "total" && v > 0.005).map(([k, v]) => [k, +v.toFixed(3)])) : null, m: r.ok ? r.m : null, err: r.ok ? undefined : r.err })) }; });
  const mu = Math.floor(lam / 2), wRaw = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), wS = wRaw.reduce((a, b) => a + b, 0), w = wRaw.map(x => x / wS), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)), damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = toUs(P0).slice(), sigma = +arg("sigma", "0.15"), pc = new Array(n).fill(0), ps = new Array(n).fill(0), C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const chol = (A) => { const Lm = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k]; Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j]; } return Lm; };
  const log = { tool: "sp2d_search.mjs (CMA-ES)", friction: "F37.5 temporary (m 0.375), not recalibrated", params: PS, fixed: Object.fromEntries(Object.entries(P0).filter(([k]) => !SUB.includes(k))), runins, lambda: lam, gens, steps, seed: +arg("seed", "1"), start: toPs(m), generations: [] }; let best = null;
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
    fs.writeFileSync(OUT + "/search_log.json", JSON.stringify({ ...log, best: { tag: best.tag, cost: best.cost, per: best.per, p: toPs(best.u) } }, null, 1)); fs.writeFileSync(OUT + "/best_opts.json", JSON.stringify(toOpts(toPs(best.u), "SP2D_" + best.tag), null, 1)); }
  workers.forEach(w => w.terminate()); }

// SP2C parameter search (CMA-ES, the sp2a_search.mjs pattern; worker threads). Each candidate (sp2c_cand.mjs options) is run on the 3 RUN-1 run-ins
// (4.5 / 5.0 / 5.5 m/s) for 6 s at the TEMPORARY friction F37.5 (not tuned here) and scored by costSP2C:
//   tuck       the folded knee under / inside the fold hip in pelvis-local coordinates at first fold-side contact and +100 ms (x ∈ [−0.13, −0.03] m,
//              z ≤ 0.32 m; 25 / 10 per m) — reached BEFORE contact, not during the slide
//   foldBoot   fold-boot toe / sole normal impulse share over [first fold contact − 50 ms, +500 ms] (toe not spearing, studs away) and the fold
//              boot's legitimate stud impulse over the run
//   prone      any face-down (thorax anterior axis below −0.5) after the first fold contact — the universal late roll-over (graded: earlier is worse)
//   lying      trunk reclined past ~63° (thorax up-axis y < 0.45) or the head on the turf from +0.5 s to the end — a passive lie-back is not a fix
//   ending     the 6 s posture: trunk up, head up (an active seated / recovering ending, not a heap)
//   glide      knee + shin share of the slide's friction braking ≤ 0.30; torso share of the normal load ≤ 0.08
//   slide      physical slide path ≥ 3.5 m at F37.5 (SP2A F37.5: 5.48 m) — the slide is kept, not stopped by the new organisation
//   tackle     SP2 terms: the tackling boot does not land first nor carry load, bent-leg side first, knee → thigh / hip hand-over, entry speed
//   compact    (S3) the folded knee stays folded ≥ 120° through the first second of contact; the ankle plantarflexed ≤ −15° at first contact
//   limits     joint-limit excursions (V2 stops); a sustained hip overrun (≥ 0.15 s) and any ankle overrun weighted (S3: ×1.0 / ×0.6 per °)
// usage (worktree root): node sp2c_search.mjs --runins a,b,c --out dir [--gens 30] [--lambda 16] [--workers 6] [--sigma 0.2] [--seed 1] [--start params.json] [--subset k1,k2,…]
import fs from "fs"; import { Worker, isMainThread, parentPort } from "worker_threads";
// S2 parameterisation (sp2c_cand.mjs groups on SP2A; search S1 used the abandoned sp2c_cand_v0 options — its log records them): the fold-leg tuck and
// its timing; trunk counter-lean / flexion / neck; the seat objective; arm targets; the tackling leg after the strike; the held post-contact authority
export const PARAMS = [["foldT0", 0.0, 0.1], ["tuckT", 0.16, 0.38], ["hipFlex", 30, 85], ["hipAbd", -18, 12], ["hipRot", -42, -10], ["knee", 120, 142], ["ankDf", -44, -10], ["ankInv", 0, 24],
  ["lumbarLat", 10, 30], ["thoracicLat", 0, 18], ["lumbarFlex", -20, 15], ["neck", 5, 35], ["seatKo", 0, 500], ["seatPitch", -35, 0], ["seatRoll", 5, 45],
  ["shLFlex", -80, 0], ["shLAbd", 20, 90], ["elLFlex", 0, 60], ["shRFlex", 0, 90], ["shRAbd", 10, 70], ["elRFlex", 10, 90], ["tackHip", 30, 80], ["tackKnee", 0, 40],
  ["aTack", 0.4, 1], ["aTrail", 0.35, 1], ["aTrunk", 0.5, 1], ["aArmL", 0.35, 1], ["aArmR", 0.35, 1]];
export const START = { foldT0: 0.08, tuckT: 0.3, hipFlex: 55, hipAbd: 0, hipRot: -35, knee: 138, ankDf: -35, ankInv: 15, lumbarLat: 28, thoracicLat: 14, lumbarFlex: 0, neck: 18, seatKo: 100, seatPitch: -26, seatRoll: 21,
  shLFlex: -46, shLAbd: 45, elLFlex: 8, shRFlex: 30, shRAbd: 35, elRFlex: 50, tackHip: 72, tackKnee: 10, aTack: 0.6, aTrail: 0.5, aTrunk: 0.7, aArmL: 0.6, aArmR: 0.6 };
export const toU = (p) => PARAMS.map(([k, lo, hi]) => Math.max(0, Math.min(1, (p[k] - lo) / (hi - lo)))), toPhys = (u) => Object.fromEntries(PARAMS.map(([k, lo, hi], i) => [k, +(lo + u[i] * (hi - lo)).toFixed(4)]));
export function toOpts(p, id) { const a = { tackLeg: p.aTack, trailLeg: p.aTrail, trunk: p.aTrunk, armL: p.aArmL, armR: p.aArmR }, mid = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, +(0.5 + 0.5 * v).toFixed(3)]));
  return { id, mode: "sp2c", tEnd: 6, fold: { t0: p.foldT0 ?? 0.08, tuckT: p.tuckT, hipFlex: p.hipFlex, hipAbd: p.hipAbd, hipRot: p.hipRot, knee: p.knee, ankDf: p.ankDf, ankInv: p.ankInv },
    trunk: { lumbarLat: p.lumbarLat, thoracicLat: p.thoracicLat, lumbarFlex: p.lumbarFlex, neck: p.neck }, seat: { ko: p.seatKo, pitch: p.seatPitch, roll: p.seatRoll },
    arms: { "shoulder_L.flex": p.shLFlex, "shoulder_L.abd": p.shLAbd, "elbow_L.flex": p.elLFlex, "shoulder_R.flex": p.shRFlex, "shoulder_R.abd": p.shRAbd, "elbow_R.flex": p.elRFlex },
    tack: { hip: p.tackHip, knee: p.tackKnee }, auth: [[0.06, mid], [0.3, a]], recover: RECOVER, phys: p }; }
// the designed end-of-slide recovery posture (SP2C_LOG §6: arms lowered, trunk forward, the tackling leg kept extended as the tackling-side outrigger)
export const RECOVER = { vh: 0.8, "shoulder_L.flex": -35, "shoulder_L.abd": 35, "elbow_L.flex": 10, "shoulder_R.flex": 30, "shoulder_R.abd": 20, "elbow_R.flex": 60, "lumbar.flex": 12, "thoracic.flex": 5 };
// the cost of one run (record o, its SP2C diagnosis d, SP2's measure m2 and cost c2)
export function costSP2C(o, d, m2, c2, L, RG) { const { Q, B, bi } = L, recs = o.recs, n = recs.length, c = {}, ms = d.milestones, k0 = Math.round((d.firstFoldContactT - (o.tOffset || 0)) * 240) - 1;
  if (d.firstFoldContactT == null || !ms.firstFoldContact) return { total: 60, noFoldContact: 60 };
  const hinge = (v, lo, hi) => Math.max(0, lo - v) + Math.max(0, v - hi);
  c.tuck = [ms.firstFoldContact, ms["+100ms"]].filter(Boolean).reduce((s, x) => s + 25 * hinge(x.knee_inPelvis[0], -0.13, -0.03) + 10 * Math.max(0, x.knee_inPelvis[2] - 0.32), 0) / 2;
  // compact folded shin: the knee stays folded through the first second of contact (SP2A F37.5: 81° at +0.5 s); the ankle plantarflexed at contact
  let kAcc = 0, kN = 0; for (let k = k0; k < Math.min(n, k0 + 240); k += 12) { kAcc += Math.max(0, 120 - L.anatOf(recs[k].S.slice(0, B.length)).knee_L.flex); kN++; }
  c.compact = 0.08 * (kN ? kAcc / kN : 0) + 0.06 * Math.max(0, ms.firstFoldContact.ankle_L.df + 15);
  // fold boot by region around the landing
  const fb = { toe: 0, sole: 0, all: 0 }; for (let k = Math.max(1, k0 - 12); k < Math.min(n, k0 + 120); k++) for (const x of RG.turfContacts(recs[k], recs[k - 1].S, "tackler", 0, null)) { if (!(x.Jn > 0)) continue; fb.all += x.Jn; if (x.body === "foot_L" && (x.region === "toe" || x.region === "sole")) fb[x.region] += x.Jn; }
  const foldStud = d.sweepMeasures.studs && d.sweepMeasures.studs.foldBoot ? d.sweepMeasures.studs.foldBoot.studNormalNs : 0;
  c.foldBoot = 8 * Math.max(0, (fb.toe + fb.sole) / Math.max(1e-9, fb.all) - 0.03) + 0.05 * Math.min(40, Math.max(0, foldStud - 2));
  // posture over the run: face-down, lying back, head on the turf
  let minBelly = 1, lieAcc = 0, lieN = 0, headOn = 0, headN = 0; for (let k = k0; k < n; k += 6) { const S = recs[k].S, th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0])[1], belly = Q.rot(th.rot, [0, 0, 1])[1];
    minBelly = Math.min(minBelly, belly); if (k >= k0 + 120) { lieAcc += Math.max(0, 0.45 - up); lieN++; const hy = L.PL.bodyLowest(B[bi("head")], S[bi("head")]).y; headOn += hy < 0.02 ? 1 : 0; headN++; } }
  c.prone = minBelly < -0.5 ? 3 + 6 * Math.max(0, (6 - (d.proneT ?? 6)) / 6) + 2 * (-0.5 - minBelly) : 2 * Math.max(0, -0.2 - minBelly);
  c.lying = 6 * (lieN ? lieAcc / lieN : 0) + 5 * (headN ? headOn / headN : 0) + (headOn ? 1.5 : 0);
  const SN = recs[n - 1].S, upN = Q.rot(SN[bi("thorax")].rot, [0, 1, 0])[1], headN6 = L.PL.bodyLowest(B[bi("head")], SN[bi("head")]).y, tackN = L.PL.bodyLowest(B[bi("foot_R")], SN[bi("foot_R")]).y;
  c.ending = 3 * Math.max(0, 0.5 - upN) + 3 * Math.max(0, 0.3 - headN6) + 1 * Math.max(0, tackN - 0.25);
  const lg = d.sweepMeasures.ledgerSlide && d.sweepMeasures.ledgerSlide.byRegion || {}, sh = (k, f) => (lg[k] ? lg[k][f] : 0) || 0;
  c.glide = 4 * Math.max(0, sh("knee", "brakeShare") + sh("shin/calf", "brakeShare") - 0.30) + 4 * Math.max(0, sh("torso", "normalShare") - 0.08);
  c.slide = 1.5 * Math.max(0, 3.5 - (d.sweepMeasures.slidePathM || 0));
  c.tackle = (c2.bootFirst || 0) + (c2.bootLoad || 0) + (c2.firstRegion || 0) + (c2.handOver || 0) + (c2.entrySpeed || 0);
  const cl = d.sweepMeasures.climits || []; c.limits = cl.reduce((s, e) => s + 0.25 * e.beyondDeg * (0.1 + Math.min(1, e.durS / 0.2)) + (e.id.startsWith("hip_") && e.durS >= 0.15 ? 1.0 * e.beyondDeg : 0) + (e.id.startsWith("ankle_") ? 0.6 * e.beyondDeg : 0), 0);
  c.total = Object.entries(c).filter(([k]) => k !== "total").reduce((s, [, x]) => s + x, 0);
  return { ...c, m: { knee0: ms.firstFoldContact.knee_inPelvis, foldToeSole: +((fb.toe + fb.sole) / Math.max(1e-9, fb.all)).toFixed(3), foldStud, minBelly: +minBelly.toFixed(3), upEnd: +upN.toFixed(3), headEnd: +headN6.toFixed(3), slide: d.sweepMeasures.slidePathM, proneT: d.proneT, headTurfT: d.sweepMeasures.finalState && d.sweepMeasures.finalState.headTurfT, final: d.sweepMeasures.finalState && d.sweepMeasures.finalState.class } }; }
if (!isMainThread) { const B0 = new URL("../../", import.meta.url).href, RC = await import(new URL("./sp2c_run.mjs", import.meta.url).href), DG = await import(new URL("./sp2c_diag.mjs", import.meta.url).href);
  const P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
  parentPort.on("message", async (job) => { try { const op = toOpts(job.p || toPhys(job.u), job.id), o = await RC.runC(job.runin, op, RC.TEMP_M, job.steps), d = DG.diagnose(o, RC.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), c = costSP2C(o, d, m2, c2, L, RG);
    parentPort.postMessage({ ok: true, key: job.key, runin: job.runin, cost: c, hash: o.finalHash }); } catch (e) { parentPort.postMessage({ ok: false, key: job.key, err: String(e.stack || e) }); } }); }
else if (process.argv[1] && process.argv[1].endsWith("sp2c_search.mjs")) {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
  // --subset k1,k2,…: only these parameters vary (CMA in their normalised box); every other parameter stays at the start's value
  const P0 = { ...START, ...(arg("start") ? JSON.parse(fs.readFileSync(arg("start"))) : {}) }, SUB = arg("subset") ? arg("subset").split(",") : PARAMS.map(q => q[0]), PS = PARAMS.filter(q => SUB.includes(q[0]));
  const toUs = (p) => PS.map(([k, lo, hi]) => Math.max(0, Math.min(1, (p[k] - lo) / (hi - lo)))), toPs = (u) => ({ ...P0, ...Object.fromEntries(PS.map(([k, lo, hi], i) => [k, +(lo + u[i] * (hi - lo)).toFixed(4)])) });
  const n = PS.length, gens = +arg("gens", "30"), lam = +arg("lambda", "16"), nW = +arg("workers", "6"), runins = arg("runins").split(","), steps = +arg("steps", "1440");
  let seed = +arg("seed", "1"); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const workers = Array.from({ length: nW }, () => new Worker(new URL(import.meta.url))), queue = [], pending = new Map();
  workers.forEach(w => w.on("message", (r) => { const cb = pending.get(r.key); pending.delete(r.key); cb(r); w.busy = false; pump(); }));
  const pump = () => { for (const w of workers) if (!w.busy && queue.length) { const j = queue.shift(); w.busy = true; pending.set(j.key, j.cb); w.postMessage({ key: j.key, p: toPs(j.u), runin: j.runin, id: j.id, steps }); } };
  const evalU = (u, tag) => Promise.all(runins.map((ri, i) => new Promise(res => { queue.push({ key: tag + "_" + i, u, runin: ri, id: tag, cb: res }); pump(); }))).then(rs => { const cs = rs.map(r => r.ok ? r.cost.total : 60);
    return { u, tag, cost: cs.reduce((a, b) => a + b, 0) / cs.length + 0.5 * Math.max(...cs), per: rs.map(r => ({ runin: r.runin.split("/").pop(), ok: r.ok, hash: r.hash, total: r.ok ? +r.cost.total.toFixed(3) : 60,
      parts: r.ok ? Object.fromEntries(Object.entries(r.cost).filter(([k, v]) => k !== "m" && k !== "total" && v > 0.005).map(([k, v]) => [k, +v.toFixed(3)])) : null, m: r.ok ? r.cost.m : null, err: r.ok ? undefined : r.err })) }; });
  const mu = Math.floor(lam / 2), wRaw = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1)), wS = wRaw.reduce((a, b) => a + b, 0), w = wRaw.map(x => x / wS), mueff = 1 / w.reduce((a, b) => a + b * b, 0);
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n), cs = (mueff + 2) / (n + mueff + 5), c1 = 2 / ((n + 1.3) ** 2 + mueff), cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)), damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs, chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
  let m = toUs(P0).slice(), sigma = +arg("sigma", "0.2"), pc = new Array(n).fill(0), ps = new Array(n).fill(0), C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const chol = (A) => { const Lm = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k]; Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j]; } return Lm; };
  const log = { tool: "sp2c_search.mjs (CMA-ES)", friction: "F37.5 temporary (m 0.375), not tuned", params: PS, fixed: Object.fromEntries(Object.entries(P0).filter(([k]) => !SUB.includes(k))), runins, lambda: lam, gens, steps, seed: +arg("seed", "1"), start: toPs(m), generations: [] }; let best = null;
  const base = await evalU(m.slice(), "g0_mean"); best = base; log.base = base; console.log("start cost", base.cost.toFixed(3), JSON.stringify(base.per.map(p => [p.total, p.parts])));
  for (let g = 1; g <= gens; g++) { const Lc = chol(C), X = [];
    for (let k = 0; k < lam; k++) { const z = Array.from({ length: n }, gauss), y = Lc.map(r => r.reduce((s, v, j) => s + v * z[j], 0)); X.push(m.map((mi, i) => Math.max(0, Math.min(1, mi + sigma * y[i])))); }
    const res = await Promise.all(X.map((x, k) => evalU(x, `g${g}_${k}`))), ord = res.map((r, k) => [r.cost, k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const old = m.slice(); m = Array.from({ length: n }, (_, i) => ord.slice(0, mu).reduce((s, k, r) => s + w[r] * X[k][i], 0)); const yw = m.map((x, i) => (x - old[i]) / sigma);
    // CMA update (rank-one + rank-mu; C^-1/2 approximated by the Cholesky inverse)
    const Li = (() => { const Lm = Lc, I = Lm.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))), X2 = I.map(r => r.slice()); for (let c = 0; c < n; c++) for (let i = 0; i < n; i++) { let s = I[i][c]; for (let k = 0; k < i; k++) s -= Lm[i][k] * X2[k][c]; X2[i][c] = s / Lm[i][i]; } return X2; })();
    const zw = Li.map(r => r.reduce((s, v, j) => s + v * yw[j], 0)); ps = ps.map((p, i) => (1 - cs) * p + Math.sqrt(cs * (2 - cs) * mueff) * zw[i]);
    const psn = Math.sqrt(ps.reduce((s, x) => s + x * x, 0)), hs = psn / Math.sqrt(1 - (1 - cs) ** (2 * g)) / chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    pc = pc.map((p, i) => (1 - cc) * p + hs * Math.sqrt(cc * (2 - cc) * mueff) * yw[i]);
    const ys = ord.slice(0, mu).map(k => X[k].map((x, i) => (x - old[i]) / sigma));
    C = C.map((r, i) => r.map((cij, j) => (1 - c1 - cmu) * cij + c1 * (pc[i] * pc[j] + (1 - hs) * cc * (2 - cc) * cij) + cmu * ys.reduce((s, y, q) => s + w[q] * y[i] * y[j], 0)));
    sigma = Math.min(0.5, sigma * Math.exp((cs / damps) * (psn / chiN - 1)));
    const gb = res[ord[0]]; if (gb.cost < best.cost) best = gb;
    log.generations.push({ g, sigma: +sigma.toFixed(4), best: { tag: gb.tag, cost: +gb.cost.toFixed(3), per: gb.per, p: toPs(gb.u) }, costs: ord.map(k => +res[k].cost.toFixed(3)) });
    console.log(`g${g} σ ${sigma.toFixed(3)} best ${gb.cost.toFixed(3)} (overall ${best.cost.toFixed(3)})`, JSON.stringify(gb.per.map(p => [p.total, p.parts, p.m && [p.m.final, p.m.minBelly, p.m.upEnd, p.m.slide]])));
    fs.writeFileSync(OUT + "/search_log.json", JSON.stringify({ ...log, best: { tag: best.tag, cost: best.cost, per: best.per, p: toPs(best.u) } }, null, 1));
    fs.writeFileSync(OUT + "/best_opts.json", JSON.stringify(toOpts(toPs(best.u), "SP2C_" + best.tag), null, 1)); }
  workers.forEach(w => w.terminate()); }

// ═══ physchar2/tools/ik_g4_study.mjs — overnight Phase C: G4-READINESS of the leg IK (a study, not a stepping controller).
// Question: can G4 ask the leg for a physically valid foothold and know whether the ANATOMICAL leg can reach it?
// START STATES: real validated G3 states of every body variant — swing-ready (U:R hold @ 8 s, U:L hold @ 8 s; the unloaded leg) and
// near-single-support (T5 hold @ 6 s, T6 hold @ 6 s; the lightly loaded leg). Pelvis pose = the controller's own posture target at that tick.
// TARGETS for that leg's foot (heading frame: +z anterior, lateral = away from the stance foot), at the ground and lifted (+5 / +10 cm):
// short / medium / long / very long forward, slight backward, inward (crossing), outward, diagonals, lateral widths, toe-out / toe-in yaw
// (hip rotation), and a reach sweep along the hip→target direction (s = 0.95 … 1.02 of the geometric reach L_max).
// SOLVERS: U = production legIK (unconstrained, warm start); B = bounded LM candidate (same LM, the six solved coordinates kept inside the
// ANATOMICAL hard limits by an active set + projection; warm start clamped into the box). For each target:
// PELVIS: the controller's posture target, and lowered by 5 / 10 cm (a step lowers the pelvis) — so far / long targets enter the workspace.
//   1 geometric reachability (U residual ≤ 1e-6); 2 anatomical reachability (B residual ≤ 1e-6 inside the limits); 3 number of distinct valid
//   bounded solutions (12 seeded starts inside the limits); 4 whether B's warm-start solution is the closest valid one to the start pose;
//   5 knee hyperextension / 6 hip / ankle limit violations of U's solution; 7 L/R mirror equivariance of both classifications and solutions;
//   8 iterations and µs; 9 sensitivity near the workspace boundary (reach sweep). DIAGNOSTIC (B is a candidate, not adopted).
// usage: node tools/ik_g4_study.mjs [--quick] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { IK } from "../ctrl/v2_stand.js"; import { pyr, decompose } from "../spec/v2_joints.js"; import { V, Q, dnorm, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), QUICK = process.argv.includes("--quick"), OUT = process.argv.slice(2).find(a => a.endsWith(".json"));
const D = 180 / Math.PI, m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]];
const lr = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
// ── the leg chain (production formulation) and the BOUNDED LM candidate ──
function chainFns(ctrl, n, ev, pP, qP, foot) { const P = ctrl.P, ks = ctrl.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => ctrl.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  const chain = (x) => { const Rt = Q.mul(Q.mul(Q.mul(qP, d[0].F1), pyr(x[0], x[1], x[2])), Q.conj(d[0].F2)), pt = V.add(pP, Q.rot(qP, a[0])), Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), pyr(cur[1][0], x[3], cur[1][2])), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
    const Rf = Q.mul(Q.mul(Q.mul(Rs, d[2].F1), pyr(cur[2][0], x[4], x[5])), Q.conj(d[2].F2)), pf = V.add(ps, Q.rot(Rs, a[2])); return { pt, ps, pf, Rf }; };
  const res = (x) => { const c = chain(x); let qe = Q.mul(foot.rot, Q.conj(c.Rf)); if (qe[3] < 0) qe = qe.map(v => -v); return [c.pf[0] - foot.pos[0], c.pf[1] - foot.pos[1], c.pf[2] - foot.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  const lim = ks.map(k => ctrl.spec.joints[k].limits.hard), lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
  return { chain, res, cur, lo, hi, x0: [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]], twistOk: cur[1][0] >= lim[1].lo[0] - 1e-9 && cur[1][0] <= lim[1].hi[0] + 1e-9 && cur[2][0] >= lim[2].lo[0] - 1e-9 && cur[2][0] <= lim[2].hi[0] + 1e-9 }; }
function boundedLM(F, xStart) {   // active-set projected Levenberg–Marquardt: the production LM, the step restricted to the free coordinates, projected onto the box
  const clamp = (x) => x.map((v, i) => Math.min(F.hi[i], Math.max(F.lo[i], v))), h = IK.h; let x = clamp(xStart), r = F.res(x), err = dnorm(...r), it = 0, mu = IK.mu0, lastJ = null, lastH = null, lastFree = null;
  const jac = (x) => [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(), xm = x.slice(); xp[c] += h; xm[c] -= h; const rp = F.res(xp), rm = F.res(xm); return rp.map((v, i) => (v - rm[i]) / (2 * h)); });
  for (; it < 30 && err > IK.tol; it++) { const Jm = jac(x), g = Jm.map(col => col.reduce((s, v, i) => s + v * r[i], 0));
    const free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= F.lo[i] && g[i] > 0) || (x[i] >= F.hi[i] && g[i] < 0)));   // a coordinate at a bound whose descent direction leaves the box is held
    const pg = Math.sqrt(free.reduce((s, i) => s + g[i] * g[i], 0)); if (pg < IK.gradTol || !free.length) break;   // stationary on the box: the constrained optimum
    const H = Jm.map(ci => Jm.map(cj => ci.reduce((s, v, k) => s + v * cj[k], 0))); lastJ = Jm; lastH = H; lastFree = free; let ok = false;
    for (let tries = 0; tries < 8; tries++) { const A = free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), dx = solveN(A, free.map(i => -g[i])); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = F.res(xc), en = dnorm(...rn); if (en < err) { x = xc; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; }
  if (err <= IK.tol && err > 0 && lastH) { const free = lastFree, g = lastJ.map(col => col.reduce((s, v, i) => s + v * r[i], 0)), A = free.map(i => free.map(c => (i === c ? lastH[i][c] + mu * (1 + lastH[i][i]) : lastH[i][c]))), dx = solveN(A, free.map(i => -g[i]));
    if (dx) { const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), en = dnorm(...F.res(xc)); if (en <= err) { x = xc; err = en; } } }
  return { x, err, it, atBound: x.map((v, i) => v <= F.lo[i] + 1e-9 || v >= F.hi[i] - 1e-9) }; }
// ── capture start states ──
function captureState(spec, key, T, n) { const s = new G3Sim(J, spec, g3Def(key), {}); let cap = null; const o = s.ctrl.legIK.bind(s.ctrl), want = { on: false };
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want.on && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), n: nn, pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want.on = true; s.tick(); const ctrl = s.ctrl; return { s, ctrl, cap }; }
const bodies = QUICK ? VARIATION_SET.filter(h => ["V2-REF", "V2-short-legs"].includes(h.id)) : VARIATION_SET, rows = [];
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) {
  for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
    for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam: yaw ? `${fam}, foot yaw ${yaw > 0 ? "+" : ""}${yaw}° (hip rotation)` : fam }); }
for (const h of bodies) { const spec = generateSpec(h), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
  for (const [key, T, n, state] of [["U:R", 8, 0, "swing-ready, L leg unloaded"], ["U:L", 8, 1, "swing-ready, R leg unloaded"], ["T5", 6, 0, "near-single-support, L leg light"], ["T6", 6, 1, "near-single-support, R leg light"]]) {
    const { s, ctrl, cap } = captureState(spec, key, T, n); if (!cap) { s.destroy(); continue; }
    const st = cap.st, ev = cap.ev, ft0 = cap.foot || st[ctrl.feet[n]], fwd = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fwd[0], 0, fwd[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]];   // lateral = away from the stance foot
    const hip = V.add(cap.pP, Q.rot(cap.qP, ctrl.anchor[ctrl.legK[n][0]])), Lmax = V.len(ctrl.anchor[ctrl.legK[n][1]]) + V.len(ctrl.anchor[ctrl.legK[n][2]]);
    const stM = map.map(i => st[i]).map(b => ({ pos: m3(b.pos), rot: mq(b.rot), com: m3(b.com), v: m3(b.v), w: mw(b.w) })), evM = unitEv(s.P.compute(stM, s.dt).ev);
    const all = [...TARGETS.map(t => ({ ...t, pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.mul(Q.axis([0, 1, 0], (n === 0 ? -1 : 1) * t.yaw / D), ft0.rot) }))];
    for (const sv of [0.95, 0.98, 0.99, 0.995, 1.0, 1.005, 1.02]) for (const dirFam of ["forward", "outward", "down-forward"]) { const dir = dirFam === "forward" ? V.norm(V.add(V.sc(hd, 0.6), [0, -0.8, 0])) : dirFam === "outward" ? V.norm(V.add(V.sc(latOut, 0.45), [0, -0.9, 0])) : V.norm(V.add(V.sc(hd, 0.3), [0, -0.95, 0]));
      all.push({ fam: `reach sweep ${dirFam}`, s: sv, pos: V.add(hip, V.sc(dir, sv * Lmax)), rot: ft0.rot.slice() }); }
    for (const drop of [0, 0.05, 0.10]) for (const t of all) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: t.pos, rot: Q.norm(t.rot) }, footM = { pos: m3(t.pos), rot: mq(foot.rot) };
      const t0 = process.hrtime.bigint(), U = ctrl.legIK(st, ev, n, pP, cap.qP, foot), usU = Number(process.hrtime.bigint() - t0) / 1e3, UM = ctrl.legIK(stM, evM, 1 - n, m3(pP), mq(cap.qP), footM);
      const F = chainFns(ctrl, n, ev, pP, cap.qP, foot), FM = chainFns(ctrl, 1 - n, evM, m3(pP), mq(cap.qP), footM);
      const t1 = process.hrtime.bigint(), B = boundedLM(F, F.x0), usB = Number(process.hrtime.bigint() - t1) / 1e3, BM = boundedLM(FM, FM.x0);
      // multistart inside the limits: distinct valid bounded solutions; the closest to the start pose
      const R = rng(rows.length + 17), sols = []; for (let k = 0; k < 12; k++) { const xs = F.lo.map((l, i) => l + (F.hi[i] - l) * R()), S = boundedLM(F, xs); if (S.err <= 1e-6 && !sols.some(o => Math.max(...o.x.map((v, i) => Math.abs(v - S.x[i]))) < 1e-3)) sols.push(S); }
      const dist = (x) => Math.sqrt(x.reduce((s, v, i) => s + (v - F.x0[i]) ** 2, 0)), validB = B.err <= 1e-6, closest = sols.length ? Math.min(...sols.map(o => dist(o.x))) : null;
      const viol = U.x.map((v, i) => (v < F.lo[i] - 1e-9 ? (F.lo[i] - v) * D : v > F.hi[i] + 1e-9 ? (v - F.hi[i]) * D : 0));
      const mirU = (() => { const a = F.chain(U.x), b = FM.chain(UM.x); return Math.max(V.len(V.sub(a.ps, m3(b.ps))), V.len(V.sub(a.pf, m3(b.pf)))); })(), mirB = (() => { const a = F.chain(B.x), b = FM.chain(BM.x); return Math.max(V.len(V.sub(a.ps, m3(b.ps))), V.len(V.sub(a.pf, m3(b.pf)))); })();
      rows.push({ body: h.id, state, leg: n ? "R" : "L", pelvisDropM: drop, fam: t.fam, s: t.s ?? V.len(V.sub(foot.pos, V.add(pP, Q.rot(cap.qP, ctrl.anchor[ctrl.legK[n][0]])))) / Lmax, hgt: t.hgt ?? null, geomReach: U.err <= 1e-6, anatReach: validB, errU: U.err, errB: B.err, itU: U.it, itB: B.it, usU, usB,
        nSolutions: sols.length, warmIsClosest: validB && closest != null ? dist(B.x) <= closest + 1e-6 : null, warmDist: validB ? dist(B.x) : null, closestDist: closest,
        kneeHyperextU: viol[3] > 0 && U.x[3] < F.lo[3], violU: viol.map(v => +v.toFixed(2)), violAny: viol.some(v => v > 0), boundsActiveB: B.atBound.filter(Boolean).length,
        clsMirrorU: (U.err <= 1e-6) === (UM.err <= 1e-6), clsMirrorB: validB === (BM.err <= 1e-6), mirPosU: mirU, mirPosB: mirB, twistOk: F.twistOk }); }
    s.destroy(); }
  console.error(`${h.id}: ${rows.length} rows`); }
// ── summary ──
const fam = [...new Set(rows.map(r => r.fam.replace(/, foot yaw.*$/, "")))], f = (x) => (x == null ? "—" : x.toFixed(0));
console.log("| target family | n | geometrically reachable | anatomically reachable (bounded) | U solution violates a limit | knee hyperextension (U) | ≥2 valid solutions | warm start = closest | L/R class mismatch U / B |"); console.log("|---|---|---|---|---|---|---|---|---|");
for (const k of fam) { const r = rows.filter(x => x.fam.replace(/, foot yaw.*$/, "") === k); console.log(`| ${k} | ${r.length} | ${r.filter(x => x.geomReach).length} | ${r.filter(x => x.anatReach).length} | ${r.filter(x => x.geomReach && x.violAny).length} | ${r.filter(x => x.kneeHyperextU).length} | ${r.filter(x => x.nSolutions >= 2).length} | ${r.filter(x => x.warmIsClosest === true).length}/${r.filter(x => x.warmIsClosest != null).length} | ${r.filter(x => !x.clsMirrorU).length} / ${r.filter(x => !x.clsMirrorB).length} |`); }
for (const dr of [0, 0.05, 0.10]) { const r = rows.filter(x => x.pelvisDropM === dr); console.log(`pelvis lowered ${dr * 100} cm: ${r.length} targets, geometric ${r.filter(x => x.geomReach).length}, anatomical ${r.filter(x => x.anatReach).length}, U violates a limit ${r.filter(x => x.geomReach && x.violAny).length}, knee hyperextension (U) ${r.filter(x => x.kneeHyperextU).length}, bounds active in B ${r.filter(x => x.anatReach && x.boundsActiveB).length}, ≥2 valid solutions ${r.filter(x => x.nSolutions >= 2).length}`); }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
console.log(`\nall: ${rows.length} targets; geometric ${rows.filter(x => x.geomReach).length}, anatomical ${rows.filter(x => x.anatReach).length}; geometric-but-not-anatomical ${rows.filter(x => x.geomReach && !x.anatReach).length}; anatomical-but-not-geometric ${rows.filter(x => !x.geomReach && x.anatReach).length}`);
console.log(`mirror: U class mismatches ${rows.filter(x => !x.clsMirrorU).length}, B class mismatches ${rows.filter(x => !x.clsMirrorB).length}; solution mirror Δ U max ${Math.max(...rows.filter(x => x.geomReach).map(x => x.mirPosU)).toExponential(2)} m, B max ${Math.max(...rows.filter(x => x.anatReach).map(x => x.mirPosB)).toExponential(2)} m`);
console.log(`cost: U iterations mean ${(rows.reduce((s, x) => s + x.itU, 0) / rows.length).toFixed(1)}, µs p50 ${q(rows.map(x => x.usU), 0.5).toFixed(0)}; B iterations mean ${(rows.reduce((s, x) => s + x.itB, 0) / rows.length).toFixed(1)}, µs p50 ${q(rows.map(x => x.usB), 0.5).toFixed(0)}; knee/ankle twists inside limits at the start: ${rows.every(x => x.twistOk)}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_g4_study.mjs", date: new Date().toISOString().slice(0, 10), rows }, null, 0));

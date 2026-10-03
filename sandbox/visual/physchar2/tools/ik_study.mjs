// ═══ physchar2/tools/ik_study.mjs — leg-IK method study (user decision 2026-10-04 §2 / §8): which IK formulation is mirror-equivariant, accurate,
// honest about reachability, robust near the reach boundary, insensitive to the starting configuration, and affordable? (component level)
// IK PROBLEMS (pelvis pose pP / qP, foot target, current joint state ev, leg n), captured from the controller's own calls in real runs of every body:
//   ordinary (G2 quiet stance; G3 T1 transfer), near-single-support (G3 T5 hold), swing-ready unloaded (G3 U:R hold — the held foot), plus
//   SYNTHETIC targets near the reach boundary: the ankle target placed at s · L_max from the hip joint (L_max = thigh + shank length, the fully
//   extended reach of this 6-DOF chain, which has no joint limits) along 13 directions around the current hip→ankle direction (±10 / ±20 / ±30° forward-back, ±10 / ±30° lateral, diagonals), s from 0.80 to 1.05.
// For every problem: the MIRRORED problem (exact sagittal reflection: state, pelvis pose, foot target; the other leg) and START perturbations
// (the leg's current joint coordinates rotated by 1° / 5° / 15°, seeded).
// METHODS: M0 production (one-sided FD Jacobian, Newton + backtracking, stop 1e-9, ≤ 6 iterations); M1 central-difference Newton (stop 1e-12,
// ≤ 6); M2 central-difference Levenberg–Marquardt (stop 1e-12, ≤ 12 iterations, adaptive damping, gradient stop for unreachable targets).
// METRICS: final residual; classification (reachable ⇔ residual ≤ 1e-6) vs geometric truth (s ≤ 1); mirror difference of the solved chain
// (hip-to-knee and ankle positions, thigh / foot orientations, world frame, after reflection); start sensitivity; iterations; µs per solve.
// usage: node tools/ik_study.mjs [--quick] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim } from "../gates/v2_g2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { pyr, decompose } from "../spec/v2_joints.js"; import { V, Q, dnorm } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), QUICK = process.argv.includes("--quick");
const OUT = process.argv.slice(2).find(a => a.endsWith(".json"));
// ── helpers ──
const m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], nq = (q) => { const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]); return q.map(v => v / l); };
const qang = (a, b) => { if (a.every((v, i) => v === b[i])) return 0; const r = Q.mul(Q.conj(a), b); return 2 * Math.atan2(Math.hypot(r[0], r[1], r[2]), Math.abs(r[3])); };
const lr = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
// ── the IK, parameterised by method (the chain / residual are the production formulation) ──
function ik(ctrl, prob, method) { const { st, ev, n, pP, qP, foot, startDelta } = prob, P = ctrl.P, ks = ctrl.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => ctrl.anchor[k]);
  const cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; }); if (ctrl.o.ikRefTwist) { const rf = ks.map(k => decompose(ctrl.qref[k]).tw); cur[1] = [rf[1], cur[1][1], cur[1][2]]; cur[2] = [rf[2], cur[2][1], cur[2][2]]; }
  const ft = foot || st[ctrl.feet[n]], chain = (x) => { const qh = pyr(x[0], x[1], x[2]), qk = pyr(cur[1][0], x[3], cur[1][2]), qa = pyr(cur[2][0], x[4], x[5]);
    const Rt = Q.mul(Q.mul(Q.mul(qP, d[0].F1), qh), Q.conj(d[0].F2)), pt = V.add(pP, Q.rot(qP, a[0])), Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), qk), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
    const Rf = Q.mul(Q.mul(Q.mul(Rs, d[2].F1), qa), Q.conj(d[2].F2)), pf = V.add(ps, Q.rot(Rs, a[2])); return { pt, Rt, ps, Rs, pf, Rf }; };
  const res = (x) => { const c = chain(x); let qe = Q.mul(ft.rot, Q.conj(c.Rf)); if (qe[3] < 0) qe = qe.map(v => -v); return [c.pf[0] - ft.pos[0], c.pf[1] - ft.pos[1], c.pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  let x = [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]]; if (startDelta) x = x.map((v, i) => v + startDelta[i]);
  let r = res(x), err = dnorm(...r), it = 0; const LM = method.startsWith("M2"), h = 1e-6, central = method !== "M0", tol = method === "M0" ? 1e-9 : 1e-12, cap = LM ? 12 : 6, mu0 = method.includes("d") ? 1e-2 : 1e-6, smax = method.includes("s") ? 0.25 : Infinity;
  const jac = () => [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(); xp[c] += h; const rp = res(xp); if (!central) return rp.map((v, i) => (v - r[i]) / h); const xm = x.slice(); xm[c] -= h; const rm = res(xm); return rp.map((v, i) => (v - rm[i]) / (2 * h)); });
  if (!LM) { for (; it < cap && err > tol; it++) { const Jm = jac(), A = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].map(c => Jm[c][i])), dx = solveN(A, r.map(v => -v)); if (!dx) break;
      let step = 1; for (let ls = 0; ls < 6; ls++) { const xn = x.map((v, i) => v + step * dx[i]), rn = res(xn), en = dnorm(...rn); if (en < err) { x = xn; r = rn; err = en; break; } step *= 0.5; } } }
  else { let mu = mu0; for (; it < cap && err > tol; it++) { const Jm = jac(), g = [0, 1, 2, 3, 4, 5].map(c => Jm[c].reduce((s, v, i) => s + v * r[i], 0)), H = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].map(c => Jm[i].reduce((s, v, k) => s + v * Jm[c][k], 0)));
      if (Math.sqrt(g.reduce((s, v) => s + v * v, 0)) < 1e-14) break;   // stationary: the least-squares optimum (unreachable target)
      let ok = false; for (let tries = 0; tries < 8; tries++) { const A = H.map((row, i) => row.map((v, c) => v + (i === c ? mu * (1 + H[i][i]) : 0))); let dx = solveN(A, g.map(v => -v)); if (!dx) { mu *= 10; continue; } const dm = Math.max(...dx.map(Math.abs)); if (dm > smax) dx = dx.map(v => v * smax / dm);
        const xn = x.map((v, i) => v + dx[i]), rn = res(xn), en = dnorm(...rn); if (en < err) { x = xn; r = rn; err = en; mu = Math.max(1e-12, mu / 10); ok = true; break; } mu *= 10; }
      if (!ok) break; } }
  return { err, it, x, chain: chain(x), kneeFlexDeg: P.anat(d[1], pyr(cur[1][0], x[3], cur[1][2]), "flex") }; }
// ── capture real IK problems (the controller's own legIK calls) ──
function capture(spec, key, kind, times, two) { const s = kind === "G2" ? new G2Sim(J, spec, { title: "quiet", seconds: Math.max(...times) + 0.1 }, {}) : new G3Sim(J, spec, g3Def(key), {}), out = [];
  const orig = s.ctrl.legIK.bind(s.ctrl); let want = false; s.ctrl.legIK = (st, ev, n, pP, qP, footPose) => { if (want) out.push({ st: st.map(b => ({ pos: b.pos.slice(), rot: nq(b.rot), com: b.com.slice(), v: b.v.slice(), w: b.w.slice() })), n, pP: pP.slice(), qP: qP.slice(), foot: footPose ? { pos: footPose.pos.slice(), rot: nq(footPose.rot) } : null, src: `${kind === "G2" ? "G2 quiet" : key}@${(s.n * s.dt).toFixed(2)}s leg ${n ? "R" : "L"}${footPose ? " (held foot)" : ""}` }); return orig(st, ev, n, pP, qP, footPose); };
  const T = times.slice().sort((a, b) => a - b); for (const t of T) { while (s.n * s.dt < t - 1e-9 && s.tick()); want = true; s.tick(); want = false; }
  return { s, out }; }
// ── main ──
const bodies = QUICK ? VARIATION_SET.filter(h => ["V2-REF", "V2-165-62"].includes(h.id)) : VARIATION_SET, METHODS = (process.env.IK_METHODS || "M0,M1,M2").split(","), SVALS = [0.8, 0.9, 0.95, 0.98, 0.99, 0.995, 0.999, 1.0, 1.001, 1.005, 1.01, 1.02, 1.05];
let prodDx = 0, prodN = 0; const CHECK_PROD = process.env.IK_CHECK_PROD === "1";
const rows = [], MAPG = (() => { const spec = generateSpec(VARIATION_SET[0]); return spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name))); })();
const mirrorSt = (st) => st.map((_, i) => st[MAPG[i]]).map(b => ({ pos: m3(b.pos), rot: mq(b.rot), com: m3(b.com), v: m3(b.v), w: mw(b.w) }));
for (const h of bodies) { const spec = generateSpec(h), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
  const caps = [capture(spec, null, "G2", [1.0], true), capture(spec, "T1", "G3", [4.0], true), capture(spec, "T5", "G3", [6.0], true), capture(spec, "U:R", "G3", [8.0], true)];
  const probe = caps[0].s, ctrl = probe.ctrl, Lmax = [0, 1].map(n => V.len(ctrl.anchor[ctrl.legK[n][1]]) + V.len(ctrl.anchor[ctrl.legK[n][2]]));
  const base = caps.flatMap(c => c.out);
  for (const b of base) { const ev = probe.P.compute(b.st, probe.dt).ev, stM = mirrorSt(b.st), evM = probe.P.compute(stM, probe.dt).ev, hip = V.add(b.pP, Q.rot(b.qP, ctrl.anchor[ctrl.legK[b.n][0]]));
    const ft0 = b.foot || b.st[ctrl.feet[b.n]], u0 = V.sc(V.sub(ft0.pos, hip), 1 / V.len(V.sub(ft0.pos, hip)));
    // targets: the captured one, then the boundary sweep along 9 directions (u0 and u0 tilted ±10° about the lateral and anterior axes, ±20° lateral)
    const tilts = [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10], [20, 0], [-20, 0], [10, 10], [-10, -10], [30, 0], [-30, 0], [0, 30], [0, -30]];   // [about the lateral x axis (AP swing), about the anterior z axis (lateral swing)] in degrees
    const targets = [{ s: V.len(V.sub(ft0.pos, hip)) / Lmax[b.n], dir: "captured", foot: { pos: ft0.pos.slice(), rot: ft0.rot.slice() }, captured: true }];
    for (const [ax, az] of tilts) for (const sv of SVALS) { const qa = Q.mul(Q.axis([1, 0, 0], ax * Math.PI / 180), Q.axis([0, 0, 1], az * Math.PI / 180)), u = Q.rot(qa, u0);
      targets.push({ s: sv, dir: `${ax}/${az}`, foot: { pos: V.add(hip, V.sc(u, sv * Lmax[b.n])), rot: ft0.rot.slice() } }); }
    for (const tg of targets) { const prob = { st: b.st, ev, n: b.n, pP: b.pP, qP: b.qP, foot: tg.foot }, probM = { st: stM, ev: evM, n: 1 - b.n, pP: m3(b.pP), qP: mq(b.qP), foot: { pos: m3(tg.foot.pos), rot: mq(tg.foot.rot) } };
      if (CHECK_PROD) { const Pd = ctrl.legIK(prob.st, prob.ev, prob.n, prob.pP, prob.qP, prob.foot), Md = ik(ctrl, prob, "M2d"); prodDx = Math.max(prodDx, ...Pd.x.map((v, i) => Math.abs(v - Md.x[i])), Math.abs(Pd.err - Md.err)); prodN++; }
      for (const m of METHODS) { const t0 = process.hrtime.bigint(), A = ik(ctrl, prob, m), us = Number(process.hrtime.bigint() - t0) / 1e3, B = ik(ctrl, probM, m);
        const mir = Math.max(V.len(V.sub(A.chain.ps, m3(B.chain.ps))), V.len(V.sub(A.chain.pf, m3(B.chain.pf)))), mirRot = Math.max(qang(A.chain.Rt, mq(B.chain.Rt)), qang(A.chain.Rf, mq(B.chain.Rf)));
        // start sensitivity: the leg's starting joint coordinates perturbed (seeded); max chain difference vs the unperturbed solve
        let startPos = 0, startCls = 0; const startBy = {}, kneeS = {}; for (const [k, deg] of [[1, 1], [2, 5], [3, 15]]) { const R = rng(rows.length * 7 + k), dl = [0, 1, 2, 3, 4, 5].map(() => (2 * R() - 1) * deg * Math.PI / 180), S = ik(ctrl, { ...prob, startDelta: dl }, m);
          const dp = Math.max(V.len(V.sub(S.chain.ps, A.chain.ps)), V.len(V.sub(S.chain.pf, A.chain.pf))); startBy[deg] = dp; kneeS[deg] = S.x[3]; startPos = Math.max(startPos, dp); if ((S.err <= 1e-6) !== (A.err <= 1e-6)) startCls++; }
        rows.push({ body: h.id, src: b.src, held: !!b.foot, dir: tg.dir, s: tg.s, captured: !!tg.captured, method: m, err: A.err, errM: B.err, it: A.it, us, mirPosM: mir, mirRotRad: mirRot, clsA: A.err <= 1e-6, clsB: B.err <= 1e-6, startPosM: startPos, startClsFlips: startCls, startBy, kneeX: A.x[3], kneeS, x: A.x, kneeFlexDeg: A.kneeFlexDeg, kneeFlexDegM: B.kneeFlexDeg }); } } }
  for (const c of caps) c.s.destroy(); console.error(`${h.id}: ${rows.length} rows`); }
// ── summary ──
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; }, f = (x) => (x == null || !isFinite(x) ? "—" : x.toExponential(2));
const sum = {}; for (const m of METHODS) { const R = rows.filter(r => r.method === m), reach = R.filter(r => r.s <= 0.999), unre = R.filter(r => r.s >= 1.001), near = R.filter(r => r.s >= 0.98 && r.s <= 1.02);
  sum[m] = { n: R.length, capturedErrMax: Math.max(...R.filter(r => r.captured).map(r => r.err)), reachErrP99: q(reach.map(r => r.err), 0.99), reachErrMax: Math.max(...reach.map(r => r.err)), reachMisclass: reach.filter(r => !r.clsA).length, unreachMisclass: unre.filter(r => r.clsA).length,
    clsMirrorMismatch: R.filter(r => r.clsA !== r.clsB).length, mirPosReachMax: Math.max(...reach.map(r => r.mirPosM)), mirRotReachMax: Math.max(...reach.map(r => r.mirRotRad)), mirPosNearMax: Math.max(...near.map(r => r.mirPosM)), mirPosUnreachMax: Math.max(...unre.map(r => r.mirPosM)), mirPosUnreachP50: q(unre.map(r => r.mirPosM), 0.5),
    startPosReachMax: Math.max(...reach.map(r => r.startPosM)), startPosReachP99: q(reach.map(r => r.startPosM), 0.99), startClsFlips: R.reduce((s, r) => s + r.startClsFlips, 0), itMean: R.reduce((s, r) => s + r.it, 0) / R.length, itMax: Math.max(...R.map(r => r.it)), usP50: q(R.map(r => r.us), 0.5), usP99: q(R.map(r => r.us), 0.99) };
  const S = sum[m]; console.log(`${m}: n ${S.n} | captured err max ${f(S.capturedErrMax)} | reachable err p99 ${f(S.reachErrP99)} max ${f(S.reachErrMax)}, misclassified ${S.reachMisclass} | unreachable classified reachable ${S.unreachMisclass} | L/R classification mismatch ${S.clsMirrorMismatch}`);
  console.log(`    mirror Δ reachable: pos ${f(S.mirPosReachMax)} m, rot ${f(S.mirRotReachMax)} rad | near boundary (0.98–1.02) pos ${f(S.mirPosNearMax)} | unreachable pos median ${f(S.mirPosUnreachP50)} max ${f(S.mirPosUnreachMax)} | start sensitivity reachable p99 ${f(S.startPosReachP99)} max ${f(S.startPosReachMax)} m, class flips ${S.startClsFlips} | iterations mean ${S.itMean.toFixed(2)} max ${S.itMax} | ${S.usP50.toFixed(1)} µs p50, ${S.usP99.toFixed(1)} p99`); }
if (CHECK_PROD) console.log(`production legIK vs study M2d over ${prodN} problems: max |Δx|, |Δerr| = ${prodDx}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_study.mjs", date: new Date().toISOString().slice(0, 10), svals: SVALS, summary: sum, rows }, null, 0));

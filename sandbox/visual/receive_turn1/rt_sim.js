// ═══ receive_turn1/rt_sim.js — RECEIVE-TURN-1 phase 2: the STATIONARY RECEIVE-AND-TURN episode ══════════════════════════════════════════════════
//   turn condition { v (arrival speed, m/s), theta (desiredTurnAngle, deg, + right), lat (the ball's line, m right of the receiver), pref ("R" |
//   "L" | null = two-footed), family / foot / variant (optional: force a choice) }
//     → the incoming ground pass (rk_sim.solveIncoming: the BALL-FEEL-1.3 kernel, the passer straight in front) and its free prediction
//     → selectTurn(): a small FEASIBLE ACTION SET — family × contact foot × surface × contact variant × contact tick — each with its preparation
//       (body facing at the contact, the stance shift), its standing foot, its planned rotation and run, its RECONNECTION point on the exit line and
//       the ideal first-touch vector that sends the ball there (the kernel's own rolling law); scored by difficulty, time and preference — never by
//       Ball Control
//     → Ball Control execution of the ideal touch (curve B, the bounded keyed draws: damping, weight, direction, vertical)
//     → ONE authoritative kernel schedule() at the CONTACT marker → free rigid-body ball
//     → the CONTINUATION: the receiver sees the real ball (react s after the touch), corrects his planned run (≤ vAdj) and meets it on his way out
//       where it suits him best (IMMEDIATE / ADJUSTED), or needs an extra control touch first (RECOVERY: RECEIVE-KILL's follow-up foot control, its
//       own keyed draws, simulated), or cannot control it in time (UNSTABLE)
// Everything in the authoritative chain uses + − × ÷, sqrt and the kernel's deterministic dsin / dcos / datan2 (bit-identical across engines).
// The body (rt_body.js) is presentation only: it is not in the ball's world, so animation can never change the outcome.
import { RK, R, DT, v3, surf, incoming, difficulty, relErr, setScale, VAR, bounded, surfaceIdeal, idealVel, execute as executeKill } from "./rk_model.js";
import { solveIncoming, predict, mkWorld, cloneWorld, toW, toWv, toL, toLv, rollW, predictFrom, planFollow, solveExit, now } from "./rk_sim.js";
import { KeyedRNG } from "../dribble1/d1_rng.js";
import { dsin, dcos, datan2 } from "../physchar2/core/v2_math.js";
import { FAMILIES, FAMILY_ORDER, SURF, MOVE, TDIFF, SELECT, DEG, clamp, s5, wrapA, dir, toL2, other, sgnF, surfaceFits, turnTime, runDist, runTime, runSpeed } from "./rt_actions.js";
export { FAMILIES, FAMILY_ORDER, MOVE, SELECT, DEG };
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
const hyp = (a, b, c = 0) => sqrt(a * a + b * b + c * c), hdg = (v) => datan2(v[1], v[0]);
setScale("B");

// ── the turn touch's execution model: the kill model's error budget, split into four physical dimensions ────────────────────────────────────────
// σ_a = k_a · vRef · D · E(BC, D) (rk_model curve B). The incoming axis n (toward the passer) carries the DAMPING error (+ over-stiff: the ball
// rebounds toward where it came from; − under-cushioned: it runs on through, × run); the touch direction d̂ carries the WEIGHT error (too firm / too
// soft); the horizontal perpendicular of d̂ (toward the turn side = +) the DIRECTION error; up the VERTICAL error (a foot on the turf can only lift
// it). For a straight kill-and-push (n ∥ d̂) the along-axis budget √(0.8² + 0.6²) = 1.0 and the lateral 0.6 / vertical 0.25 equal the kill's
// inside-of-the-foot shape, so the turn touches inherit Alternative B's calibration. Physical caps as the kill: the ball cannot leave along n faster
// than an uncushioned rebound (restitution e of the incoming speed), nor run through faster than runCap of it.
export const TEXEC = { k: { damping: 0.8, weight: 0.6, direction: 0.6, vertical: 0.25 }, run: 0.5, e: 0.48, runCap: 0.9, id: "receive-control-v2", event: "T1" };
export const TEX_EXAMPLES = { TYPICAL: { damping: 0.674, weight: 0.674, direction: 0.674, vertical: 0.674, label: "typical — every dimension at its median magnitude (stiff, firm, toward the turn side, up)" },
  HEAVY: { damping: 1.15, weight: 1.15, direction: 1.15, vertical: 0.674, label: "heavy — damping, weight and direction at their 75th-percentile magnitude (a below-average touch)" },
  PERFECT: { damping: 0, weight: 0, direction: 0, vertical: 0, label: "zero error (the ideal)" } };
export function turnDraws(spec, contact = 0) {
  if (spec.example) { const e = TEX_EXAMPLES[spec.example] || TEX_EXAMPLES.TYPICAL; return { damping: e.damping, weight: e.weight, direction: e.direction, vertical: e.vertical, raw: null, source: "example " + spec.example }; }
  const seed = spec.seed == null ? 1 : spec.seed, rng = new KeyedRNG(seed), key = ["RECEIVE", spec.receiver || "CAL-R", spec.receiveEvent || TEXEC.event, "c" + contact, TEXEC.id], out = { raw: {}, keyIds: {} };
  for (const d of ["damping", "weight", "direction", "vertical"]) { const n = rng.normal(...key, d, 0); out.raw[d] = n; out[d] = bounded(n); out.keyIds[d] = rng.keyId(...key, d, 0); }
  out.source = "seed " + seed; out.key = key.join("|"); return out;
}
export function executeTurn(A, bc, N) {
  const D = A.D, E = relErr(bc, D), s = RK.diff.vRef * D * E, K = TEXEC.k, vI = A.vIdeal, n = A.nIn, dh = A.dHat, lat = [-dh[1] * A.sig, dh[0] * A.sig];
  const eD = K.damping * s * (N.damping >= 0 ? N.damping : TEXEC.run * N.damping), eW = K.weight * s * N.weight, eL = K.direction * s * N.direction, eV = K.vertical * s * abs(N.vertical);
  let v = [vI[0] + n[0] * eD + dh[0] * eW + lat[0] * eL, vI[1] + n[1] * eD + dh[1] * eW + lat[1] * eL, vI[2] + eV];
  const vn = v[0] * n[0] + v[1] * n[1], vIn = vI[0] * n[0] + vI[1] * n[1], hi = max(vIn, TEXEC.e * A.vInS), lo = min(vIn, -TEXEC.runCap * A.vInS); let capped = null;
  if (vn > hi) { v = [v[0] + n[0] * (hi - vn), v[1] + n[1] * (hi - vn), v[2]]; capped = "rebound"; } else if (vn < lo) { v = [v[0] + n[0] * (lo - vn), v[1] + n[1] * (lo - vn), v[2]]; capped = "run-through"; }
  return { v, err: v3.sub(v, vI), E, sigma: { damping: K.damping * s, weight: K.weight * s, direction: K.direction * s, vertical: K.vertical * s }, eAxes: { damping: eD, weight: eW, direction: eL, vertical: eV }, capped, N, bc, D };
}

// ── the kernel's rolling law over time: distance after t s for an initial rolling speed s (lazy table), and its inverse in s ───────────────────────
export const ROLLT = { ds: 0.1, sMax: 10, T: 3.0, D: null, ms: 0 };
function rollT() {
  if (ROLLT.D) return ROLLT.D; const t0 = now(), n = Math.round(ROLLT.sMax / ROLLT.ds), K = Math.round(ROLLT.T / DT), D = [];
  for (let i = 0; i <= n; i++) { const s = i * ROLLT.ds, W = mkWorld([0, R, 0], [s, 0, 0], [0, 0, -s / R]), col = new Float64Array(K + 1); for (let k = 0; k <= K; k++) { col[k] = W.ball.p[0]; W.step(); } D.push(col); }
  ROLLT.D = D; ROLLT.ms = now() - t0; return D;
}
export function rollSpeedFor(d, t) { const D = rollT(), k = min(D[0].length - 1, max(1, Math.round(t / DT))); if (d <= 0) return 0; for (let i = 1; i < D.length; i++) if (D[i][k] >= d) { const a = D[i - 1][k], b = D[i][k]; return ROLLT.ds * (i - 1 + (d - a) / max(1e-12, b - a)); } return ROLLT.sMax; }

// ── the condition → incoming pass + prediction (independent of the turn and of Ball Control; cached) ──────────────────────────────────────────────
const inCache = new Map();
export function incomingFor(cond) {
  const key = JSON.stringify([cond.v, cond.lat || 0]); if (inCache.has(key)) return inCache.get(key);
  const sol = solveIncoming({ v: cond.v, lat: cond.lat || 0 }), pred = predict(sol); const o = { sol, pred }; inCache.set(key, o); return o;
}

// ── the planned post-contact body path of one candidate (authored; Ball Control never enters): pivot on the standing foot from ψc to the exit
// heading, start running goShare into the rotation, accelerate along the exit line. Times are relative to the contact. ───────────────────────────
export function plannedPath(A) {
  const dPsi = A.dPsi, Trot = turnTime(dPsi / DEG), tGo = MOVE.goShare * Trot, th = A.theta, St = A.stand, sl = A.standOff, dirFam = A.fam.id === "DIRECTIONAL";
  const endRoot = dirFam ? A.S.slice() : toL2(St, th, -sl[0], -sl[1]), u = dir(th);
  return { Trot, tGo, u, endRoot, pivot: dirFam ? A.S : St,
    psiAt(t) { return t <= 0 ? A.psiC : A.psiC + dPsi * s5(t / Trot); },
    rootAt(t) { if (t <= 0) return A.S.slice(); const w = s5(min(1, t / Trot)), b = [A.S[0] + (endRoot[0] - A.S[0]) * w, A.S[1] + (endRoot[1] - A.S[1]) * w], d = runDist(t - tGo); return [b[0] + u[0] * d, b[1] + u[1] * d]; },
    speedAt(t) { return runSpeed(t - tGo); } };
}

// ── SELECTION: the feasible action set and the best action ───────────────────────────────────────────────────────────────────────────────────────
export function selectTurn(inc, cond) {
  const P = inc.pred.P, thDeg = cond.theta || 0, th = thDeg * DEG, sig = thDeg < 0 ? -1 : 1, aTh = abs(thDeg), pref = cond.pref === undefined ? SELECT.prefFoot : cond.pref, nIn = [1, 0];
  const fams = cond.family ? [cond.family] : FAMILY_ORDER, rej = {}, best = {}; let top = null, nEval = 0, nFeasible = 0;
  const near = sig > 0 ? "R" : "L", far = other(near);
  for (const fid of fams) { const F0 = FAMILIES[fid], feetList = F0.feet === "near" ? [near] : F0.feet === "far" ? [far] : [near, far];
    const open = clamp(F0.prep.k * aTh, 0, F0.prep.max), openLim = cond.prep != null ? max(0, MOVE.omegaPrep * (cond.prep - SELECT.openBase)) : Infinity, psiC = sig * min(open, openLim) * DEG, dPsi = th - psiC, out = aTh < F0.theta[0] ? F0.theta[0] - aTh : aTh > F0.theta[1] ? aTh - F0.theta[1] : 0, cP = dcos(psiC), sP = dsin(psiC);
    for (const F of feetList) { if (cond.foot && F !== cond.foot) continue;
      for (const [vid, V] of Object.entries(F0.variants)) { if (cond.variant && vid !== cond.variant) continue;
        // lateral of the variant: "near" / "far" families are authored on the turn side's convention (× σ); "either" on the contact foot's side
        const cl = F0.feet === "either" ? sgnF(F) * V.c[1] : sig * V.c[1], sl = F0.feet === "either" ? -sgnF(F) * abs(V.stand[1]) : sig * V.stand[1];
        for (let k = SELECT.every; k < P.length; k += SELECT.every) {
          const st = P[k]; if (st.p[0] > 1.6 || st.p[0] < -1.2) continue; if (k * DT + SELECT.read < MOVE.prepMin + abs(psiC) / (MOVE.omegaPrep * DEG)) { rej.time = (rej.time || 0) + 1; continue; }
          nEval++; const vIn = [st.v[0], st.v[1]], vInS = hyp(vIn[0], vIn[1]); if (vInS < 0.05) continue;
          const S = [st.p[0] - (V.c[0] * cP - cl * sP), st.p[1] - (V.c[0] * sP + cl * cP)], shift = hyp(S[0], S[1]);
          if (shift > SELECT.shiftMax) { rej.reach = (rej.reach || 0) + 1; continue; }
          const A = { fam: F0, fid, F, vid, sig, theta: th, thetaDeg: thDeg, psiC, dPsi, S, k, stand: toL2(S, psiC, V.stand[0], sl), standOff: [V.stand[0], sl], contactOff: [V.c[0], cl], C: [st.p[0], st.p[1]], vInS, nIn };
          const path = plannedPath(A), tRec = path.tGo + runTime(F0.run), r = path.rootAt(tRec), Prec = [r[0] + path.u[0] * MOVE.reach, r[1] + path.u[1] * MOVE.reach];
          const d = [Prec[0] - A.C[0], Prec[1] - A.C[1]], dl = hyp(d[0], d[1]), dHat = dl > 1e-9 ? [d[0] / dl, d[1] / dl] : path.u, s0 = rollSpeedFor(dl, tRec);
          if (s0 >= ROLLT.sMax - 0.1) { rej.touch = (rej.touch || 0) + 1; continue; }
          const vOut = [dHat[0] * s0, dHat[1] * s0], dv = [vOut[0] - vIn[0], vOut[1] - vIn[1]], dvM = hyp(dv[0], dv[1]), alpha = wrapA(hdg(dv) - psiC) / DEG;
          let fit = null, sBest = null; for (const s of F0.surfaces) { const f = surfaceFits(s, F, alpha, dvM); if (f.ok && (!fit || f.glance + SURF[s].pref * 100 < fit.glance + SURF[sBest].pref * 100)) { fit = f; sBest = s; } }
          if (!fit) { rej.surface = (rej.surface || 0) + 1; continue; }
          // the planned ball path must clear the standing foot (it passes beside / through the stance, never through the planted foot)
          const Sf = A.stand, wv = [Sf[0] - A.C[0], Sf[1] - A.C[1]], along = clamp(wv[0] * dHat[0] + wv[1] * dHat[1], 0, min(dl, 0.8)), cx = A.C[0] + dHat[0] * along - Sf[0], cy = A.C[1] + dHat[1] * along - Sf[1], clear = hyp(cx, cy) - R - 0.05;
          if (clear < 0) { rej.blocked = (rej.blocked || 0) + 1; continue; }
          nFeasible++;
          const Dk = difficulty(surf("FOOT_INSIDE", F), st, incoming(st), shift).D, rotIn = F0.rotIn * abs(dPsi) / Math.PI;
          const D = Dk * F0.m * (1 + TDIFF.rot * rotIn + TDIFF.glance * fit.glance + TDIFF.surface[sBest] + TDIFF.out * s0 / RK.diff.vRef);
          const J = D + SELECT.wRange * out / 10 + SELECT.wShift * shift + SELECT.wTime * tRec + SURF[sBest].pref + F0.pref + (pref && F !== pref ? SELECT.otherFoot : 0) + (clear < SELECT.clear ? SELECT.wPath * (SELECT.clear - clear) : 0) + SELECT.wOpen * abs(psiC) / (Math.PI / 2);
          Object.assign(A, { surface: sBest, glance: fit.glance, alpha, dv, dvM, tRec, Prec, dHat, s0, vOut, D, Dk, rotIn, clear, J, outOfRange: out, path, st, pref });
          if (!best[fid] || J < best[fid].J) best[fid] = A;
          if (!top || J < top.J) top = A; } } } }
  const cands = Object.values(best).map((A) => ({ fid: A.fid, F: A.F, vid: A.vid, surface: A.surface, J: +A.J.toFixed(4), D: +A.D.toFixed(4), tRec: +A.tRec.toFixed(3), t: +(A.k * DT).toFixed(3), psiC: +(A.psiC / DEG).toFixed(1), shift: +hyp(A.S[0], A.S[1]).toFixed(3), glance: +A.glance.toFixed(1), s0: +A.s0.toFixed(2) })).sort((a, b) => a.J - b.J);
  return top ? Object.assign(top, { cands, rej, nEval, nFeasible }) : { none: true, cands, rej, nEval, nFeasible };
}

// ── one turn condition: incoming + selection + the pre-contact world at the CONTACT marker (all independent of Ball Control) ─────────────────────
export function prepareTurn(cond) {
  const t0 = now(), inc = incomingFor(cond), t1 = now(), A = selectTurn(inc, cond), t2 = now(), prep = { cond, inc, A, cpu: { incoming: t1 - t0, select: t2 - t1 } };
  if (A.none) return prep;
  const W = mkWorld(inc.sol.launch.p, inc.sol.launch.v, inc.sol.launch.w); for (let i = 0; i < A.k; i++) W.step(); prep.Wc = W; prep.kc = A.k;
  const vb = toLv(W.ball.v); A.vInS = hyp(vb[0], vb[1]); A.vIdeal = [A.vOut[0], A.vOut[1], 0]; A.C3 = toL(W.ball.p);
  prep.cpu.total = now() - t0; return prep;
}

// ── the CONTINUATION ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   meet: the receiver plays the ball again on his way out where it suits him best: at a tick ≥ tMin after the contact with the ball on / near
//   the turf, within vRelMax of his run velocity, and his root at Q = ball − reach · u (behind the ball, along the exit) no further from his planned
//   run than vAdj · (t − react); among those, the least  dev + late · (t − tRec)₊ + early · (tRec − t)₊  (the ideal touch meets exactly at tRec)
//   classes: IMMEDIATE dev ≤ imm.adj, lateness ≤ imm.t, ball within imm.off of the exit line · ADJUSTED dev ≤ adjMax, lateness ≤ tMax ·
//   RECOVERY an extra control touch was needed (or the meet needed more) · UNSTABLE neither in the window
export const CONT = { tMin: 0.22, horizon: 2.6, zMax: 0.24, vRelMax: 3.2, every: 2, late: 1.0, early: 0.3, imm: { adj: 0.25, t: 0.25, off: 0.35 }, adjMax: 1.0, tMax: 0.75, tEnd: 3.0, carry: 1.1 };
export function findMeet(A, P) {
  const path = A.path, n = min(P.length - 1, Math.round(CONT.horizon / DT)); let best = null;
  for (let i = Math.round(CONT.tMin / DT); i <= n; i += CONT.every) {
    const t = i * DT, b = P[i]; if (b.p[2] > CONT.zMax) continue;
    const Q = [b.p[0] - path.u[0] * MOVE.reach, b.p[1] - path.u[1] * MOVE.reach], RI = path.rootAt(t), dev = hyp(Q[0] - RI[0], Q[1] - RI[1]);
    if (dev > MOVE.vAdj * max(0, t - MOVE.react) + 0.02) continue;
    const vp = path.speedAt(t), vr = hyp(b.v[0] - path.u[0] * vp, b.v[1] - path.u[1] * vp); if (vr > CONT.vRelMax) continue;
    const J = dev + CONT.late * max(0, t - A.tRec) + CONT.early * max(0, A.tRec - t);
    if (!best || J < best.J) best = { i, t, Q, RI, dev, vr, J, ball: b.p.slice(), vBall: b.v.slice() };
  }
  return best;
}
// stable control after an extra touch, orientation-free (the receiver has turned): RECEIVE-KILL's thresholds — on the turf, slow, within its radius
const stableNear = (st, S) => { const T = RK.stable, vh = hyp(st.v[0], st.v[1]); return st.p[2] <= T.zMax && abs(st.v[2]) <= T.vzMax && vh <= T.vRel && hyp(st.p[0] - S[0], st.p[1] - S[1]) <= T.radius; };
const offLineOf = (A, p) => { const R0 = A.path.endRoot, u = A.path.u, d = [p[0] - R0[0], p[1] - R0[1]]; return -d[0] * u[1] + d[1] * u[0]; };
// the extra control touch's draws: the kill model's dimensions on this receive event's contact n (v2 keys); lateral × the turn side
function drawsKill(spec, n, sig = 1) {
  if (spec.example) { const x = spec.example === "PERFECT" ? 0 : 0.674; return { reb: x, lat: x, third: x }; }
  const rng = new KeyedRNG(spec.seed == null ? 1 : spec.seed), key = ["RECEIVE", spec.receiver || "CAL-R", spec.receiveEvent || TEXEC.event, "c" + n, VAR.id], o = {};
  for (const [a, nm] of [["reb", "damping"], ["lat", "direction"], ["third", "vertical"]]) o[a] = bounded(rng.normal(...key, nm, 0));
  o.lat *= sig; return o;   // the direction draw is turn-side relative (+ = toward the turn side), as the turn touch's: a left turn mirrors a right turn
}

// ── ONE RECEIVE-TURN EPISODE for one Ball Control and one draw spec ({ seed } | { example }) ───────────────────────────────────────────────────────
export function runTurn(prep, bc, spec, o = {}) {
  const t0 = now(), A = prep.A, W = cloneWorld(prep.Wc), kc = prep.kc, cpu = { exec: 0, predict: 0, cont: 0, sim: 0 }, every = o.every || 2, rec = [], notes = [];
  let tA = now(); const N = turnDraws(spec, 0), ex = executeTurn(A, bc, N); cpu.exec = now() - tA;
  W.schedule({ id: "turn1", tick: kc, position: W.ball.p.slice(), velocity: toWv(ex.v), spin: rollW(toWv(ex.v)), maxContactError: 0.06, preparedAt: 0, metadata: { action: "RECEIVE-TURN", family: A.fid, surface: A.surface } });
  let i = 0; const stepRec = () => { if (i % every === 0) rec.push({ i, p: toL(W.ball.p), v: toLv(W.ball.v) }); tA = now(); W.step(); cpu.sim += now() - tA; i++; };
  stepRec(); const launched = [W.events.find((e) => e.id === "turn1" && (e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED"))];
  tA = now(); const P = [{ p: rec[0].p, v: ex.v.slice(), pw: toW(rec[0].p) }].concat(predictFrom(W, 3.4).map((x) => ({ p: x.p, v: x.v, pw: x.pw }))); cpu.predict = now() - tA;   // index = ticks after the contact
  tA = now(); const meet = findMeet(A, P); let cls = null, tCont = null, contacts = 1, extraAdj = null, extraT = null, offLine = null, follow = null, carry = null;
  if (meet) { extraAdj = meet.dev; extraT = meet.t - A.tRec; offLine = offLineOf(A, meet.ball); tCont = meet.t;
    cls = extraAdj <= CONT.imm.adj && extraT <= CONT.imm.t && abs(offLine) <= CONT.imm.off ? "IMMEDIATE" : extraAdj <= CONT.adjMax && extraT <= CONT.tMax ? "ADJUSTED" : null; }
  if (!cls) {
    // an extra CONTROL touch: RECEIVE-KILL's follow-up foot control on the real ball (receive event T1, contact 1), from where his planned run has
    // taken him when he is free (he has seen the touch and the rotation is mostly done); then the turn onto the exit from the settled ball
    // (the follow-up planner's foot preference is the receiver's: none for a two-footed receiver, so his left turn mirrors his right turn)
    const path = A.path, iFree = Math.round(max(MOVE.react + 0.10, path.Trot * 0.8) / DT), Sp = path.rootAt(iFree * DT), keepPref = RK.plan.prefFoot; RK.plan.prefFoot = A.pref; const c = planFollow(P, { S: Sp, iFree }); RK.plan.prefFoot = keepPref;
    if (!c.none) {
      const id2 = surfaceIdeal(c.sf, c.st, c.inc, c.shift); id2.base = solveExit({ ideal: id2, contact: c.st.p }); id2.v = idealVel(id2, id2.base.s); const N2 = drawsKill(spec, 1, A.sig), ex2 = executeKill(c.sf, id2, c.inc, bc, c.dif.D, N2);
      W.schedule({ id: "turn1.f1", tick: kc + c.i, position: P[c.i].pw, velocity: toWv(ex2.v), spin: rollW(toWv(ex2.v)), maxContactError: 0.06, preparedAt: W.time, metadata: { action: "CONTROL", surface: c.sf.key } });
      follow = { i: c.i, t: c.i * DT, sf: c.sf.key, F: c.sf.side, stance: c.shift.slice(), from: Sp, adjust: c.dS, D: c.dif.D, ex: ex2, contact: c.st.p.slice(), N: N2 };
      contacts = 2; cls = "RECOVERY"; extraAdj = c.dS; notes.push(`extra control touch at +${follow.t.toFixed(2)} s (${c.sf.key})`);
    } else if (meet) { cls = "RECOVERY"; notes.push("met only with a large correction / late"); }
    else { cls = "UNSTABLE"; notes.push("no meeting and no control touch within the window"); }
  }
  // the continuation touch (DRIBBLE-V1's next touch in integration — here an ideal push along the exit line, shown so the clips continue): after a
  // clean meet only; it never feeds the measures above
  if (meet && cls !== "RECOVERY" && cls !== "UNSTABLE" && o.carry !== false) { const vp = A.path.speedAt(meet.t), sp = vp + CONT.carry, u = A.path.u; carry = { i: meet.i, t: meet.t, v: [u[0] * sp, u[1] * sp, 0] };
    W.schedule({ id: "turn1.carry", tick: kc + meet.i, position: P[meet.i].pw, velocity: toWv(carry.v), spin: rollW(toWv(carry.v)), maxContactError: 0.06, preparedAt: W.time, metadata: { action: "CONTINUE" } }); }
  cpu.cont = now() - tA;
  const n = Math.round((o.tEnd || CONT.tEnd) / DT); while (i <= n) stepRec();
  for (const id of ["turn1.f1", "turn1.carry"]) { const e = W.events.find((x) => x.id === id && (x.kind === "AUTHORITATIVE_LAUNCH" || x.kind === "LAUNCH_CANCELLED")); if (e) launched.push(e); }
  // after an extra control: stable control (RECEIVE-KILL's measure) at the control's stance, then the turn back onto the exit line
  if (follow) { const H = Math.round(RK.stable.hold / DT), recAt = (j) => rec.find((x) => x.i >= j) || rec[rec.length - 1]; let run = 0, iSt = -1;
    for (const r of rec) { if (r.i < follow.i + Math.round(0.12 / DT)) continue; if (stableNear(r, follow.stance)) { run += every; if (run > H) { iSt = r.i - H; break; } } else run = 0; }
    if (iSt >= 0) { const dirNow = hdg([follow.contact[0] - follow.from[0], follow.contact[1] - follow.from[1]]), back = abs(wrapA(A.theta - dirNow)) / DEG; tCont = iSt * DT + turnTime(back) * 0.6; extraT = tCont - A.tRec; follow.tStable = iSt * DT; recAt(iSt); }
    else { cls = "UNSTABLE"; notes.push("the extra control did not settle the ball"); tCont = null; extraT = null; } }
  // first-touch quality against the ideal touch's own kernel path (computed once per condition)
  if (!prep.idealP) { const Wi = cloneWorld(prep.Wc); Wi.schedule({ id: "turn1", tick: kc, position: Wi.ball.p.slice(), velocity: toWv(A.vIdeal), spin: rollW(toWv(A.vIdeal)), maxContactError: 0.06, preparedAt: 0, metadata: {} }); Wi.step(); prep.idealP = [{ p: toL(prep.Wc.ball.p), v: A.vIdeal.slice() }].concat(predictFrom(Wi, 3.4)); }
  const iR = Math.round(A.tRec / DT), aR = P[min(P.length - 1, iR)].p, bR = prep.idealP[min(prep.idealP.length - 1, iR)].p, place = hyp(aR[0] - bR[0], aR[1] - bR[1]);
  const vh = hyp(ex.v[0], ex.v[1]), dirErr = wrapA(hdg(ex.v) - hdg(A.vIdeal)) * A.sig / DEG;
  const m = { cls, continuation: cls, contacts, tCont, extraAdj, extraT, offLine, place, resid: hyp(ex.v[0], ex.v[1], ex.v[2]), residIdeal: hyp(A.vIdeal[0], A.vIdeal[1]), touchSpeedErr: vh - A.s0, dirErrDeg: dirErr, lift: ex.v[2], capped: ex.capped,
    meet: meet ? { t: meet.t, i: meet.i, dev: meet.dev, vr: meet.vr, ball: meet.ball, Q: meet.Q } : null, follow: follow ? { t: follow.t, surface: follow.sf, adjust: follow.adjust, tStable: follow.tStable } : null, notes };
  cpu.total = now() - t0;
  return { bc, N, ex, P, rec, meet, follow, carry, m, launched: launched.map((e) => (e ? e.kind : null)), cpu };
}

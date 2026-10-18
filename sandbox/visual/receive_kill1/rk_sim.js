// ═══ receive_kill1/rk_sim.js — RECEIVE-KILL-1: the incoming ball, the authored KILL action and its ONE authoritative contact, the free ball ═══════
//   incoming condition (speed, descent angle, arrival height, bearing, lateral offset at the receiver's reach plane)
//     → solveIncoming(): the rigid-body pass that produces exactly that arrival (BALL-FEEL-1.3 kernel, untouched; ground passes by a secant on the
//       launch speed, aerial passes by the kernel's own exact inverse air step, bounces by Newton on the forward kernel)
//     → predict(): the free-ball prediction (the same kernel, no colliders)
//     → planKill(): the KILL action — surface (AUTO or forced) × side × contact tick, scored by the difficulty it expects (never by Ball Control)
//     → the ideal post-contact state (rk_model.surfaceIdeal) → Ball Control execution (rk_model.execute, keyed standardised draws)
//     → ONE kernel schedule() at the CONTACT marker (6 cm contact window; the kernel cancels the launch if the ball is not there) → free physics
// The receiver is a stationary player in clean conditions (no opponent, no pressure, no fatigue, no weak-foot term — the owner's isolation). The
// placeholder body (rk_body.js) is presentation only: it is not in the ball's world, so animation can never change the outcome.
import { BallWorld } from "../ballfeel13/world.js";            // = DRIBBLE-V1's BALL_DEFAULT (dribble15/d15_core.js): BALL-FEEL-1.3 world, GLOBAL turf
import { GLOBAL } from "../ballfeel13/config.js";
import { KeyedRNG } from "../dribble1/d1_rng.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
import { RK, R, G, DT, DEG, clamp, v3, surfaceList, incoming, envelope, difficulty, surfaceIdeal, idealVel, baseVel, execute, stateOf, sigmas, relErr, qBC, cD, SURFACES } from "./rk_model.js";
export { RK, DT, R };
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
export const BALL = { id: "BALL-FEEL-1.3 world (75866e99) · default laws · GLOBAL turf (= DRIBBLE-V1 BALL_DEFAULT)", World: BallWorld, parameters: GLOBAL };
export const SIM = { stance: [40, 34], contactWindow: 0.06, tGround: 1.0, tAirMax: 2.6, xRef: 0.35, post: 3.0, postStats: 2.2, showIn: 1.3, every: 2 };
export const now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();

// ── frames: the receiver's original stance S0 at pitch (40, 34) facing +x; local [f, r, z] (r = the receiver's RIGHT = pitch +y, Touchline's
// rgt(0)) ↔ kernel world [x, height, z = −pitch y] ───────────────────────────────────────────────────────────────────────────────────────────────
const S0 = SIM.stance;
export const toW = (p) => [S0[0] + p[0], p[2], -(S0[1] + p[1])], toWv = (v) => [v[0], v[2], -v[1]];
export const toL = (p) => [p[0] - S0[0], -p[2] - S0[1], p[1]], toLv = (v) => [v[0], -v[2], v[1]];
export const rollW = (vW) => [vW[2] / R, 0, -vW[0] / R];          // rolling spin for a world velocity (DRIBBLE-V1's convention)
export function mkWorld(pW, vW, wW) { return new BALL.World({ p: pW, v: vW, w: wW || [0, 0, 0], dt: DT, substeps: 1, parameters: BALL.parameters, colliders: [] }); }
// a copy of a world's state (the free-ball predictor's snapshot technique, DRIBBLE-V1 Wp): the post-contact runs all start from the SAME pre-contact state
export function cloneWorld(W) { const C = mkWorld([0, R, 0], [0, 0, 0]); C.ball = structuredClone(W.ball); C.tick = W.tick; C.time = W.time; C.restTime = W.restTime; C.events = []; C.actions = []; C.guards = []; C.actionIds = new Set(); C.stats = Object.assign({}, W.stats); return C; }

// ── the turf's rolling law, from the kernel itself: rest distance of a rolling ball, and its inverse ──────────────────────────────────────────────
let ROLL = null;
export function rollTable() {
  if (ROLL) return ROLL; const S = [], D = [];
  for (let i = 0; i <= 160; i++) { const s = i * 0.025; let d = 0; if (s > 0) { const W = mkWorld([0, R, 0], [s, 0, 0], [0, 0, -s / R]); let k = 0; while (!W.ball.sleeping && k < 240 * 12) { W.step(); k++; } d = W.ball.p[0]; } S.push(s); D.push(d); }
  return (ROLL = { S, D });
}
export function rollSpeed(d) { const T = rollTable(); if (d <= 0) return 0; for (let i = 1; i < T.D.length; i++) if (T.D[i] >= d) { const a = T.D[i - 1], b = T.D[i]; return T.S[i - 1] + (T.S[i] - T.S[i - 1]) * (d - a) / (b - a); } return T.S[T.S.length - 1]; }
export function rollDist(s) { const T = rollTable(); if (s <= 0) return 0; for (let i = 1; i < T.S.length; i++) if (T.S[i] >= s) { const u = (s - T.S[i - 1]) / (T.S[i] - T.S[i - 1]); return T.D[i - 1] + (T.D[i] - T.D[i - 1]) * u; } return T.D[T.D.length - 1]; }

// ── the incoming ball ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// cond: { v (m/s, total speed at the reach plane), drop (deg, + = descending, − = rising), h (ball-centre height, m), bear (deg, + = from the right),
//         lat (m, + = right of the stance centre), surface ("AUTO" | "FOOT" | "THIGH" | "CHEST" | "HEAD" | a surface id) }
// the arrival point A = (xRef, lat, h) is on the ball's line at the receiver's reach plane; the arrival velocity = speed along the bearing + vz
export function arrivalOf(cond) {
  const b = (cond.bear || 0) * DEG, u = [-dcos(b), -dsin(b)], dr = (cond.drop || 0) * DEG, v = cond.v, vh = v * dcos(dr), vz = -v * dsin(dr);
  const xR = cond.xRef != null ? cond.xRef : SIM.xRef, A = [xR + (cond.lat || 0) * 0 , cond.lat || 0, cond.h != null ? cond.h : R];
  return { A, vA: [vh * u[0], vh * u[1], vz], u, vh, vz, ground: (cond.h == null || cond.h <= R + 1e-9) && abs(cond.drop || 0) < 1e-9 };
}
// the kernel's air step without spin, inverted exactly: (p, v) after a tick → before it
function invAir(p, v, c) {
  const k = 0.5 * c.airDensity * Math.PI * c.radius * c.radius / c.mass * c.dragCoefficient, h = DT, s2 = sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const p0 = [p[0] - v[0] * h, p[1] - v[1] * h, p[2] - v[2] * h], s1 = s2 / (1 - k * h * s2), f = s2 > 1e-12 ? s1 / s2 : 1;
  return { p: p0, v: [v[0] * f, v[1] * f + c.gravity * h, v[2] * f] };
}
function simTo(launch, K) { const W = mkWorld(launch.p, launch.v, launch.w); for (let i = 0; i < K; i++) W.step(); return W.ball; }
function solve6(J, F) { const n = 6, M = J.map((r, i) => r.concat([-F[i]])); for (let c = 0; c < n; c++) { let pv = c; for (let r = c + 1; r < n; r++) if (abs(M[r][c]) > abs(M[pv][c])) pv = r; [M[c], M[pv]] = [M[pv], M[c]]; const d = M[c][c]; if (abs(d) < 1e-14) return null; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / r[i]); }
const solCache = new Map();
export function solveIncoming(cond) {
  const key = JSON.stringify([cond.v, cond.drop || 0, cond.h == null ? R : cond.h, cond.bear || 0, cond.lat || 0, cond.xRef || SIM.xRef]); if (solCache.has(key)) return solCache.get(key);
  const t0 = now(), arr = arrivalOf(cond), c = mkWorld([0, R, 0], [0, 0, 0]).cfg, AW = toW(arr.A), vAW = toWv(arr.vA); let out;
  if (arr.ground) {
    // a rolling pass: launch speed s from (A − d·u) such that its speed after tGround is exactly v (secant; the kernel is the authority)
    const K = Math.round(SIM.tGround / DT), run = (s) => { const W = mkWorld([0, R, 0], [s, 0, 0], [0, 0, -s / R]); for (let i = 0; i < K; i++) W.step(); return { v: sqrt(W.ball.v[0] * W.ball.v[0] + W.ball.v[2] * W.ball.v[2]), d: W.ball.p[0] }; };
    let a = arr.vh + 0.8, b = arr.vh + 3.0, fa = run(a).v - arr.vh, fb = run(b).v - arr.vh;
    for (let i = 0; i < 40 && abs(fb) > 1e-11; i++) { const m = b - fb * (b - a) / (fb - fa); a = b; fa = fb; b = m; fb = run(b).v - arr.vh; }
    const r = run(b), u = [arr.u[0], arr.u[1], 0], pL = [arr.A[0] - r.d * u[0], arr.A[1] - r.d * u[1], R], vL = [b * u[0], b * u[1], 0], vW = toWv(vL);
    out = { kind: "ground", K, launch: { p: toW(pL), v: vW, w: rollW(vW) }, launchSpeed: b, iterations: 0 };
  } else {
    // aerial: back along the kernel's own air step from the arrival (exact inverse) until the turf or tAirMax: the pass's launch
    // a ground crossing on the way back is a BOUNCE when the condition has one (cond.bounce; default: a ball rising at the reach plane has just
    // come off the turf), otherwise the pass's launch from the turf
    let p = AW.slice(), v = vAW.slice(), j = 0, bounce = null; const Kmax = Math.round(SIM.tAirMax / DT), nB = cond.bounce != null ? cond.bounce : (arr.vz > 0 ? 1 : 0);
    for (; j < Kmax; j++) { const q = invAir(p, v, c);
      if (q.p[1] < R) { if (!bounce && nB > 0) { const e = c.turfRestitution, vzPre = -v[1] / e, vh = sqrt(v[0] * v[0] + v[2] * v[2]), g = vh > 1e-9 ? (vh + c.turfFriction * (1 + e) * -vzPre) / vh : 1; bounce = { j, vz: v[1] }; v = [v[0] * g, vzPre, v[2] * g]; p = [q.p[0], max(R + 0.005, 2 * R - q.p[1]), q.p[2]]; continue; } break; }
      p = q.p; v = q.v; if (bounce && j - bounce.j > 0.7 / DT) break; }
    // polish by Newton on the forward kernel (needed after a bounce; ~exact otherwise). A bounce that lands on a tick boundary can stall it
    // (the kernel treats a ball within 2 µm of the turf as supported): then the launch is shifted by a tick or two and solved again
    const nrm = (f) => sqrt(f.reduce((s, x) => s + x * x, 0));
    const newton = (L, K) => {
      const F = (L) => { const b = simTo(L, K); return [b.p[0] - AW[0], b.p[1] - AW[1], b.p[2] - AW[2], b.v[0] - vAW[0], b.v[1] - vAW[1], b.v[2] - vAW[2]]; };
      let f = F(L), res = nrm(f), it = 0;
      for (it = 0; it < 16 && res > 1e-9; it++) {
        const x = L.p.concat(L.v), J = [[], [], [], [], [], []], hh = 1e-5;
        for (let i = 0; i < 6; i++) { const y = x.slice(); y[i] += hh; const Ly = { p: y.slice(0, 3), v: y.slice(3), w: [0, 0, 0] }; if (Ly.p[1] < R) Ly.p[1] = R; const fy = F(Ly); for (let r = 0; r < 6; r++) J[r][i] = (fy[r] - f[r]) / hh; }
        const dx = solve6(J, f); if (!dx) break; let lam = 1, ok = false;
        for (let tries = 0; tries < 8; tries++) { const y = x.map((xi, i) => xi + lam * dx[i]); if (y[1] < R) y[1] = R; const Ly = { p: y.slice(0, 3), v: y.slice(3), w: [0, 0, 0] }, fy = F(Ly), ry = nrm(fy); if (ry < res) { L = Ly; f = fy; res = ry; ok = true; break; } lam /= 2; }
        if (!ok) break;
      }
      return { L, K, res, it };
    };
    let best = newton({ p, v, w: [0, 0, 0] }, j);
    if (best.res > 1e-6) for (const d of [1, -1, 2, -2, 3, -3]) {
      let L0 = { p: best.L.p.slice(), v: best.L.v.slice(), w: [0, 0, 0] };
      if (d > 0) { for (let i = 0; i < d; i++) { const q = invAir(L0.p, L0.v, c); L0 = { p: q.p, v: q.v, w: [0, 0, 0] }; } } else { const W = mkWorld(L0.p, L0.v, L0.w); for (let i = 0; i < -d; i++) W.step(); L0 = { p: W.ball.p.slice(), v: W.ball.v.slice(), w: [0, 0, 0] }; }
      if (L0.p[1] < R) continue; const r = newton(L0, j + d); if (r.res < best.res) best = r; if (best.res <= 1e-6) break;
    }
    const L = best.L, K = best.K, it = best.it;
    out = { kind: bounce ? "bounce" : "air", K, launch: L, iterations: it, bounceBack: bounce ? { tBefore: bounce.j * DT } : null };
  }
  const b = simTo(out.launch, out.K); out.arrival = { p: toL(b.p), v: toLv(b.v) }; out.residual = { p: v3.len(v3.sub(out.arrival.p, arr.A)), v: v3.len(v3.sub(out.arrival.v, arr.vA)) }; out.solveMs = now() - t0; out.arr = arr;
  solCache.set(key, out); return out;
}

// ── the free-ball prediction (the planner's only view of the future): local states after k steps, k = 0 … ───────────────────────────────────────
export function predict(sol) {
  const W = mkWorld(sol.launch.p, sol.launch.v, sol.launch.w), P = [{ p: toL(W.ball.p), v: toLv(W.ball.v) }], Kend = sol.K + Math.round(1.6 / DT); let bounces = [];
  for (let k = 1; k <= Kend; k++) { const vy = W.ball.v[1]; W.step(); const st = { p: toL(W.ball.p), v: toLv(W.ball.v) }; if (vy < -0.05 && W.ball.v[1] > 0.05) bounces.push(k); P.push(st); if (k > sol.K && st.p[0] < -2.5) break; }
  return { P, bounces };
}

// ── the KILL action: which surface, which side, which tick (the CONTACT marker) — AUTO compares a small set of feasible authored solutions ────────
export function planKill(pred, cond) {
  const P = RK.plan, list = surfaceList(cond.surface || "AUTO"), rej = {}, best = {}; let top = null, nEval = 0;
  for (let k = P.every; k < pred.P.length; k += P.every) {
    const st = pred.P[k], inc = incoming(st); if (inc.vh < 0.05 && abs(inc.vz) < 0.05) continue;
    for (const sf of list) {
      nEval++; const why = envelope(sf, st, inc); if (why) { rej[sf.key] = rej[sf.key] || {}; rej[sf.key][why] = (rej[sf.key][why] || 0) + 1; continue; }
      const S = sf.S, sh = [st.p[0] - S.c[0], st.p[1] - sf.sg * S.c[1]], dS = sqrt(sh[0] * sh[0] + sh[1] * sh[1]);
      if (dS > P.shiftMax) { rej[sf.key] = rej[sf.key] || {}; rej[sf.key].reach = (rej[sf.key].reach || 0) + 1; continue; }
      if (k * DT + P.read < S.prep + dS / P.vShuffle + 0.1) { rej[sf.key] = rej[sf.key] || {}; rej[sf.key].time = (rej[sf.key].time || 0) + 1; continue; }
      const dif = difficulty(sf, st, inc, dS), J = dif.D + P.wShift * dS + S.pref + (sf.side !== "C" && sf.side !== P.prefFoot ? P.otherFoot : 0);
      const c = { sf, k, st, inc, shift: sh, dS, dif, J };
      if (!best[sf.key] || J < best[sf.key].J) best[sf.key] = c;
      if (!top || J < top.J) top = c;
    }
  }
  const alts = Object.values(best).sort((a, b) => a.J - b.J).map((c) => ({ key: c.sf.key, J: +c.J.toFixed(4), D: +c.dif.D.toFixed(4), t: +(c.k * DT).toFixed(3), z: +c.st.p[2].toFixed(3), dS: +c.dS.toFixed(3) }));
  return top ? Object.assign(top, { alts, rej, nEval }) : { none: true, alts, rej, nEval };
}

// ── the standardised execution draws: keyed (seed | RECEIVE | receiver | receive event | receive-kill-v1 | dimension | draw index) or a named example ──
// The key never contains Ball Control: BC 10 … 99 get the SAME draws (matched counterfactuals).
export const EXAMPLES = {
  TYPICAL: { reb: 0.674, lat: 0.674, third: 0.674, label: "typical — every axis at its median magnitude (rebound, right, up)" },
  BAD: { reb: 1.645, lat: 1.0, third: 1.0, label: "bad — the rebound at its 90th percentile" },
  WIDE: { reb: 0.3, lat: 1.645, third: 0.5, label: "wide — the lateral error at its 90th percentile" },
  RUNTHROUGH: { reb: -1.645, lat: 0.674, third: 0.674, label: "run-through — under-cushioned at the 90th percentile" },
  PERFECT: { reb: 0, lat: 0, third: 0, label: "zero error (the ideal)" },
};
export function drawsFor(cond) {
  if (cond.example && EXAMPLES[cond.example]) { const e = EXAMPLES[cond.example]; return { reb: e.reb, lat: e.lat, third: e.third, source: "example " + cond.example, keyIds: null }; }
  const rng = new KeyedRNG(cond.seed == null ? 1 : cond.seed), key = ["RECEIVE", cond.receiver || "CAL-R", cond.event || "kill1", RK.id];
  return { reb: rng.normal(...key, "reb", 0), lat: rng.normal(...key, "lat", 0), third: rng.normal(...key, "third", 0), source: "seed " + (cond.seed == null ? 1 : cond.seed), keyIds: { reb: rng.keyId(...key, "reb", 0), lat: rng.keyId(...key, "lat", 0), third: rng.keyId(...key, "third", 0) }, key: key.join("|") };
}

// ── one condition: incoming + prediction + plan + the ideal (all independent of Ball Control) ────────────────────────────────────────────────────
export function prepare(cond) {
  const t0 = now(), sol = solveIncoming(cond), t1 = now(), pred = predict(sol), t2 = now(), plan = planKill(pred, cond), t3 = now();
  const prep = { cond, sol, pred, plan, cpu: { solve: t1 - t0, predict: t2 - t1, plan: t3 - t2 } };
  if (plan.none) return prep;
  const stance = plan.shift, ideal = surfaceIdeal(plan.sf, plan.st, plan.inc, stance);
  prep.stance = stance; prep.ideal = ideal; prep.contact = plan.st.p.slice(); prep.kc = plan.k;
  // the pre-contact world at the CONTACT marker (every executed / ideal post-contact run starts from this one state)
  const W = mkWorld(sol.launch.p, sol.launch.v, sol.launch.w); for (let i = 0; i < plan.k; i++) W.step(); prep.Wc = W;
  // the ideal exit speed toward the settle point, solved through the kernel (the ideal ball is AT the settle point 2 s after the contact)
  const t4 = now(); ideal.base = solveExit(prep); ideal.v = idealVel(ideal, ideal.base.s); prep.cpu.ideal = now() - t4;
  prep.idealRun = postRun(prep, ideal.v, { tag: "ideal", post: SIM.post });
  prep.cpu.total = now() - t0;
  return prep;
}

// ── the executed contact for one Ball Control and one draw set, then the free rigid-body ball ───────────────────────────────────────────────────
// the ideal exit speed toward the settle point: a TABLE built from the kernel — for an exit with vertical velocity vz from contact height h (spin 0;
// rolling spin for a ball on the turf), the distance travelled along the exit direction 2.0 s later, for exit speeds 0 … 2.5 m/s. Columns are built
// lazily per (vz, h on a 5 cm grid) and interpolated (h linearly, s monotone) — a lookup at runtime instead of a kernel search
export const EXIT_TABLE = { ds: 0.05, sMax: 2.5, dh: 0.05, horizon: 2.0, cols: new Map(), built: 0, buildMs: 0 };
function exitColumn(vz, h, rolling) {
  const key = (rolling ? "R" : vz.toFixed(3)) + "|" + h.toFixed(3); let c = EXIT_TABLE.cols.get(key); if (c) return c;
  const t0 = now(), T = EXIT_TABLE, n = Math.round(T.sMax / T.ds), K = Math.round(T.horizon / DT), D = [];
  for (let i = 0; i <= n; i++) { const sp = i * T.ds, W = mkWorld([0, h, 0], [sp, rolling ? 0 : vz, 0], rolling ? [0, 0, -sp / R] : [0, 0, 0]); for (let k = 0; k <= K; k++) W.step(); D.push(W.ball.p[0]); }
  for (let i = 1; i < D.length; i++) if (D[i] < D[i - 1]) D[i] = D[i - 1];   // monotone
  c = { D }; EXIT_TABLE.cols.set(key, c); T.built++; T.buildMs += now() - t0; return c;
}
function speedFor(col, d) { const D = col.D, T = EXIT_TABLE; if (d <= D[0]) return 0; for (let i = 1; i < D.length; i++) if (D[i] >= d) return T.ds * (i - 1 + (d - D[i - 1]) / Math.max(1e-12, D[i] - D[i - 1])); return T.sMax; }
export function solveExit(prep) {
  const id = prep.ideal; if (id.dist < 1e-6 && id.kind === "rest") return { s: 0, table: true };
  if (id.kind === "rest") return { s: speedFor(exitColumn(0, R, true), id.dist), table: true };
  const h = prep.contact[2], T = EXIT_TABLE, h0 = Math.max(R, Math.floor(h / T.dh) * T.dh), h1 = h0 + T.dh, u = (h - h0) / T.dh;
  const s0 = speedFor(exitColumn(id.vz, h0, false), id.dist), s1 = speedFor(exitColumn(id.vz, h1, false), id.dist);
  return { s: s0 + (s1 - s0) * u, table: true };
}
export function contactSpin(prep, vL) { return prep.ideal.rolling ? rollW(toWv(vL)) : [0, 0, 0]; }
export function postRun(prep, vL, o = {}) {
  const W = cloneWorld(prep.Wc), kc = prep.kc, posW = W.ball.p.slice(), id = o.tag || "kill1";
  W.schedule({ id, tick: kc, position: posW, velocity: toWv(vL), spin: contactSpin(prep, vL), maxContactError: SIM.contactWindow, preparedAt: 0, metadata: { action: "KILL", surface: prep.plan.sf.key } });
  const n = Math.round((o.post || SIM.post) / DT), rec = [], every = o.every || SIM.every; let launched = null, sleptAt = null;
  for (let i = 0; i <= n; i++) {
    if (i % every === 0 || i === n) rec.push({ i, p: toL(W.ball.p), v: toLv(W.ball.v) });
    if (W.ball.sleeping) { if (sleptAt == null) sleptAt = i; if (o.stopAtRest) break; }
    W.step(); if (i === 0) launched = W.events.find((e) => e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED");
  }
  return { rec, launched: launched ? launched.kind : null, final: { p: toL(W.ball.p), v: toLv(W.ball.v), sleeping: W.ball.sleeping }, sleptAt };
}
export function at(run, i) { const r = run.rec; let lo = 0, hi = r.length - 1; if (i <= r[0].i) return r[0]; if (i >= r[hi].i) return r[hi]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r[m].i <= i) lo = m; else hi = m; } const a = r[lo], b = r[hi], u = (i - a.i) / (b.i - a.i); return { i, p: v3.add(a.p, v3.sc(v3.sub(b.p, a.p), u)), v: v3.add(a.v, v3.sc(v3.sub(b.v, a.v), u)) }; }

// ── execute + measure (one Ball Control, one draw set) ────────────────────────────────────────────────────────────────────────────────────────────
export function runBC(prep, bc, N, o = {}) {
  const t0 = now(), plan = prep.plan, ex = execute(plan.sf, prep.ideal, plan.inc, bc, plan.dif.D, N), t1 = now();
  const run = postRun(prep, ex.v, { post: o.post || SIM.post, every: o.every, stopAtRest: o.stopAtRest }), t2 = now();
  return { bc, ex, run, m: measure(prep, run, ex), cpu: { exec: t1 - t0, post: t2 - t1 } };
}
export function measure(prep, run, ex) {
  const I = prep.idealRun, tgt = prep.ideal.target, fr = prep.ideal.frame, lat = [fr.l[0], fr.l[1]], ll = sqrt(lat[0] * lat[0] + lat[1] * lat[1]) || 1;
  const dT = (p) => sqrt((p[0] - tgt[0]) * (p[0] - tgt[0]) + (p[1] - tgt[1]) * (p[1] - tgt[1]));
  const out = { resid: v3.len(ex.v), residIdeal: v3.len(prep.ideal.v), residH: sqrt(ex.v[0] * ex.v[0] + ex.v[1] * ex.v[1]), vzOut: ex.v[2], vzIdeal: prep.ideal.v[2], dErr: v3.len(ex.err) };
  for (const t of [0.25, 0.5, 1.0, 2.0]) { const i = Math.round(t / DT), a = at(run, i), b = at(I, i); out["d" + t] = dT(a.p); out["dIdeal" + t] = v3.len(v3.sub(a.p, b.p)); out["lat" + t] = ((a.p[0] - b.p[0]) * lat[0] + (a.p[1] - b.p[1]) * lat[1]) / ll; out["v" + t] = v3.len(a.v); }
  let peakA = 0, peakI = 0; for (const r of run.rec) if (r.i * DT <= 1.0) peakA = max(peakA, r.p[2]); for (const r of I.rec) if (r.i * DT <= 1.0) peakI = max(peakI, r.p[2]);
  // where the touch put the ball: its distance from the intended (settle) point 2.0 s after the contact — where the ideal ball is, by construction
  out.peak = peakA; out.peakIdeal = peakI; out.vertErr = peakA - peakI; out.dStar = out["d2"]; out.state = stateOf(out.dStar);
  out.final = run.final.p; out.dFinal = dT(run.final.p); out.behind = run.final.p[0] < prep.stance[0] - 0.6; out.launched = run.launched;
  return out;
}

// ── the whole matched comparison: one condition, the ten Ball Control steps, the SAME draws ─────────────────────────────────────────────────────
export function matched(cond, bcs, o = {}) { const prep = prepare(cond), N = drawsFor(cond); if (prep.plan.none) return { prep, N, rows: [] }; return { prep, N, rows: bcs.map((bc) => runBC(prep, bc, N, o)) }; }
export { sigmas, relErr, qBC, cD, SURFACES };

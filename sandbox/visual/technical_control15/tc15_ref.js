// ═══ technical_control15/tc15_ref.js — TECHNICAL-CONTROL-1.5: THE AUTHORED TECHNIQUE REFERENCES (owner: "TECHNICAL CONTROL RESET — research real
// protected / fast dribbling techniques, then rebuild the actions"; "build each action as an authored football action"; "stop after the five
// elite reference turns") ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// TECHNICAL-CONTROL-1 … 1.4 produced every action from a generic procedural step: a contact point on the gait, a swing ending in a touch, a leg
// target searched afterwards — and labelled the result ("chop", "Cruyff"). The owner's review: the TC1.4 "Ronaldo chop" was not a Ronaldo chop
// (the ball stayed exposed outside the body). This module does the opposite: a technique is AUTHORED, from the research
// (review_artifacts/technical_control15/TECHNIQUE_RESEARCH_AND_SPEC.md), as four phases — ENTRY (approach, set touch, braking, hop), CONTACT
// (the authoritative ball contacts: foot, surface, time, the ball's launch), PROTECTION (where the support leg and the body stand relative to the
// ball and the pressure side while it moves), EXIT (the new line, the body's acceleration, the exit touch) — and the engine only executes it:
//   · BODY — the centre of mass: authored speed and travel-heading keys (C¹ monotone cubics, integrated at 240 Hz); the pelvis heading, the trunk's
//     turn against the pelvis, the forward lean, the side lean, the crouch, the arms' balance: authored keys
//   · FEET — every stance authored (foot, touchdown, lift-off, where, the foot's heading, a pivot on the ball of the foot, the heel's rise); every
//     swing between two stances of a foot: RUN-1's own swing path (the frozen running gait) unless the technique authors it — waypoints relative to
//     the ball / the other foot (the chop's foot passing behind the standing heel) and the CONTACT
//   · BALL — the frozen ball kernel (BALL-FEEL-1.3 world, DRIBBLE-V1's): free between contacts; each authoritative contact is one schedule()
//     launch; its velocity is the technique's (a direction and a speed) or solved on the kernel itself so that the ball arrives where the
//     technique's next contact is authored (the set touch → the chop's contact point; the chop → the exit touch). Ball Control 99: the ideal
//     launch is executed (the precision layer comes back with the ratings, after the references are approved — owner)
//   · CONTACT POSE — the labelled surface of DRIBBLE-1's boot collider placed ON the ball's real position (gap 0, LegBody.placeBoot's search),
//     the foot's heading from the surface and the impulse, the pitch and roll authored ("ankle locked, toe up")
//   · LEGS — TECHNICAL-CONTROL-1.1's chain (tc11_leg.js): the hip's swivel turns the leg toward the foot, two-bone IK with a soft knee limit, the
//     tibia and the ankle take the rest inside their ranges; a planted foot stays flat (its heel rises about the ball of the foot in the push-off
//     and as soon as the ankle would dorsiflex past its range); the pelvis moves toward a planted / touching leg out of reach (never a foot)
// Everything is deterministic and recorded per 240 Hz tick with the diagnostics (leg clearances, the ball against both boots, the exposure to the
// five pressure directions, the joint ranges, the reach adaptation).
// FRAMES: pitch (x, y); heading θ with dir(θ) = (cos θ, sin θ) and the player's RIGHT = (−sin θ, cos θ) (+ heading = a right turn: the codebase's
// convention, checked on the posed skeleton); the technique's LOCAL frame [a, l] = [ahead, + right] from the entry heading about the origin O (the
// centre of mass at the decisive contact); the ball kernel [x, h, y]; anim3d world [x, h, −y].
import { Q, legIK, swivelFor, footOut, ankleFor, legAngles, overROM, bootHull, ballGap, surfaceDir, pchip, pchipAt } from "../technical_control11/tc11_leg.js";
import { HB } from "../receive_turn11/rt11_body.js";
import { BALL_DEFAULT } from "../dribble15/d15_core.js";
export const DT = 1 / 240, R = 0.11, DEG = Math.PI / 180;
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, SIDES = ["R", "L"];
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
export const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
export const dir = (h) => [Math.cos(h), Math.sin(h)], rgt = (h) => [-Math.sin(h), Math.cos(h)], hdg = (v) => Math.atan2(v[1], v[0]);
export const sgnF = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => s5((x - a) / max(1e-6, b - a));
// ── the engine's constants (presentation geometry; the techniques' own numbers live in tc15_tech.js) ───────────────────────────────────────────────
export const RF = {
  O: [40, 34], th0: 0,                  // the origin (the centre of mass at the decisive contact) and the entry heading on the pitch
  kMin: 7 * DEG, dfRise: 20,            // the knee never straighter than kMin; a planted heel rises once the ankle would dorsiflex past dfRise (deg)
  reach: 0.985,                          // the hip – ankle distance a planted / touching leg may use (share of the leg's length) before the pelvis moves
  clear: 0.006,                          // the boot's lowest point above the turf at a ground-level contact (m)
  lift: [0.03, 0.024, 0.05, 0.19],      // the heel's lift at a toe-off: 0.03 + 0.024 v, within [0.05, 0.19] m
  comPull: 0.24, bob: [0.012, 0.0055, 0.045], twist: [3, 1.1, 10], armSwing: [8, 7, 50],
};
// ── C¹ monotone cubics through authored keys ([t, value] pairs; Fritsch – Carlson: never overshoots a key) ──────────────────────────────────────────
export class Curve { constructor(keys) { this.K = keys.slice().sort((a, b) => a[0] - b[0]); this.P = pchip(this.K.map(([t, v]) => ({ t, v: [v] })), 1); }
  at(t) { return this.K.length === 1 ? this.K[0][1] : pchipAt(this.P, t, 1)[0]; } }
const curveOf = (k, dflt) => new Curve(k && k.length ? k : [[0, dflt]]);
// a 3-vector cubic Hermite between keys { t, p, v }
function herm3(a, b, t) { const T = b.t - a.t, u = clamp((t - a.t) / T, 0, 1), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map((i) => h00 * a.p[i] + h10 * T * a.v[i] + h01 * b.p[i] + h11 * T * b.v[i]); }
// ── the ball kernel (DRIBBLE-V1's world, unchanged): a world, its clone, a launch ──────────────────────────────────────────────────────────────────
const B = BALL_DEFAULT;
export const rollK = (vk) => [vk[2] / R, 0, -vk[0] / R];
function mkWorld(p, v) { return new B.World(Object.assign({}, B.options, { p, v, w: rollK(v), dt: DT, substeps: 1, parameters: B.parameters, colliders: [] })); }
function cloneW(W) { const C = mkWorld([0, R, 0], [0, 0, 0]); C.ball = structuredClone(W.ball); C.tick = W.tick; C.time = W.time; C.restTime = W.restTime; C.events = []; C.actions = []; C.guards = []; C.actionIds = new Set(); C.stats = Object.assign({}, W.stats); return C; }
function launch(W, id, v2, meta) { const vk = [v2[0], 0, v2[1]]; W.schedule({ id, tick: W.tick, position: W.ball.p.slice(), velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: W.time, colliderId: null, metadata: meta || {} }); }
// the launch (pitch velocity) that puts the free ball at target T (pitch) after n ticks, solved on the kernel (Newton, a numerical Jacobian)
function solveLaunch(W, T, n) { const B0 = [W.ball.p[0], W.ball.p[2]], at = (v) => { const C = cloneW(W); launch(C, "solve", v); for (let i = 0; i < n; i++) C.step(); return [C.ball.p[0], C.ball.p[2]]; };
  const tS = n * DT; let v = [(T[0] - B0[0]) / tS * 1.15, (T[1] - B0[1]) / tS * 1.15];
  for (let it = 0; it < 10; it++) { const p = at(v), e = [T[0] - p[0], T[1] - p[1]]; if (hyp(e[0], e[1]) < 2e-4) break; const h = 0.02, px = at([v[0] + h, v[1]]), py = at([v[0], v[1] + h]);
    const J = [(px[0] - p[0]) / h, (py[0] - p[0]) / h, (px[1] - p[1]) / h, (py[1] - p[1]) / h], det = J[0] * J[3] - J[1] * J[2]; if (abs(det) < 1e-9) break;
    v = [v[0] + (J[3] * e[0] - J[1] * e[1]) / det, v[1] + (-J[2] * e[0] + J[0] * e[1]) / det]; }
  return v; }

// ── THE BALL-EXPOSURE DIAGNOSTIC (owner: "a provisional geometric protection diagnostic … NOT gameplay / tackle probability") ─────────────────────
// A defender's REACHING LEG from each pressure direction — front · left · right · rear-left · rear-right, fixed from the ENTRY heading (a defender
// does not turn with the player): a straight line from his hip (0.9 m out from the ball, 0.85 m high) to the ball. It is BLOCKED when it passes
// through the player — a leg capsule (thigh / shin / boot, TECHNICAL-CONTROL-1.3's radii), the hips (hip to hip) or the trunk (pelvis → chest),
// with the reaching leg's own 6 cm; else the defender has a DIRECT LINE to the ball. Also the open sector all round the ball (36 directions).
// (A ball under the player's body is shielded by the body; a ball out beside his feet is not.) J: posed joints [x, y, h]; ball [x, y, h].
export const DIRS = { front: 0, left: -90, right: 90, rearLeft: -135, rearRight: 135 };   // deg from the entry heading (+ = the player's right)
export const PX = { out: 0.9, hipH: 0.85, foot: 0.06, rad: { thigh: 0.075, shin: 0.052, boot: 0.048, hips: 0.10, trunk: 0.15 } };
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function segDist(p1, q1, p2, q2) { const d1 = vsub(q1, p1), d2 = vsub(q2, p2), r = vsub(p1, p2), a = vdot(d1, d1), e = vdot(d2, d2), f = vdot(d2, r); let s, t; const cl = (x) => clamp(x, 0, 1);
  if (a <= 1e-12 && e <= 1e-12) return hyp(...r); if (a <= 1e-12) { s = 0; t = cl(f / e); } else { const c = vdot(d1, r); if (e <= 1e-12) { t = 0; s = cl(-c / a); } else { const b = vdot(d1, d2), den = a * e - b * b; s = den !== 0 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } } }
  return hyp(...vsub([p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t])); }
export function bodyCaps(J) { const c = []; for (const X of SIDES) { const hip = J["thigh_" + X].j, knee = J["shin_" + X].j, ank = J["foot_" + X].j, toe = J["toe_" + X].t; c.push([hip, knee, PX.rad.thigh, X], [knee, ank, PX.rad.shin, X], [ank, toe, PX.rad.boot, X]); }
  c.push([J.thigh_R.j, J.thigh_L.j, PX.rad.hips, "B"], [J.pelvis.j, J.chest.t, PX.rad.trunk, "B"]); return c; }
export function exposureAt(J, ball, h0) {
  const caps = bodyCaps(J), Bc = [ball[0], ball[1], max(R, ball[2])], from = (ang) => { const O = [Bc[0] + Math.cos(ang) * PX.out, Bc[1] + Math.sin(ang) * PX.out, PX.hipH], who = []; for (const [a, b, r, X] of caps) if (segDist(O, Bc, a, b) < r + PX.foot) who.push(X); return [...new Set(who)].sort().join(""); };
  const named = {}; for (const [k, d] of Object.entries(DIRS)) named[k] = from(h0 + d * DEG); const sector = []; let open = 0; for (let i = 0; i < 36; i++) { const w = from(h0 + i * 10 * DEG); sector.push(w ? 1 : 0); if (!w) open++; }
  return { named, sector, openDeg: open * 10 }; }
// the leg clearances of a posed frame (TECHNICAL-CONTROL-1.3's capsules: negative = the limbs intersect)
export const RAD = { thigh: 0.075, shin: 0.052, boot: 0.048, knee: 0.06 };
export function clearancesOf(J) { const L = {}; for (const X of SIDES) L[X] = { hip: J["thigh_" + X].j, knee: J["shin_" + X].j, ankle: J["foot_" + X].j, toe: J["toe_" + X].t }; const A = L.R, Bq = L.L;
  return { foot: segDist(A.ankle, A.toe, Bq.ankle, Bq.toe) - 2 * RAD.boot, shin: segDist(A.knee, A.ankle, Bq.knee, Bq.ankle) - 2 * RAD.shin, thigh: segDist(A.hip, A.knee, Bq.hip, Bq.knee) - 2 * RAD.thigh,
    footCalf: min(segDist(A.ankle, A.toe, Bq.knee, Bq.ankle), segDist(Bq.ankle, Bq.toe, A.knee, A.ankle)) - RAD.boot - RAD.shin, footKnee: min(segDist(A.ankle, A.toe, Bq.knee, Bq.knee), segDist(Bq.ankle, Bq.toe, A.knee, A.knee)) - RAD.boot - RAD.knee }; }

// ═══ THE REFERENCE: build (the authored action → the body path, the stances, the contacts and the ball) and run (pose + record each tick) ════════
export class RefSim {
  // env: { E (RUN-1.3), M4, skel, colliders } · T: a technique definition (tc15_tech.js) · o: { O, th0 }
  constructor(env, T, o = {}) {
    this.env = env; this.E = env.E; this.M4 = env.M4; this.T = T; this.O = o.O || RF.O; this.th0 = o.th0 != null ? o.th0 : RF.th0; this.dur = T.dur; this.n = Math.round(T.dur / DT);
    const skel = env.skel; this.b = skel._kbody || (skel._kbody = this.E.r1Body(skel)); this.mtpY = abs(this.b.mtp[1]); this.mtpZ = this.b.mtp[2];
    const C = env.colliders; this.hull = C && C.sides ? (C._tc15 || (C._tc15 = { R: bootHull(C.sides.R.boot.points), L: bootHull(C.sides.L.boot.points), P: { R: C.sides.R.boot.points, L: C.sides.L.boot.points } })) : null;
    this.buildCom(); this.buildBall(); this.buildFeet(); this.rec = []; this.fk = null;
  }
  // ── frames ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  L2P(q) { const c = Math.cos(this.th0), s = Math.sin(this.th0); return [this.O[0] + q[0] * c - q[1] * s, this.O[1] + q[0] * s + q[1] * c]; }
  P2L(p) { const c = Math.cos(this.th0), s = Math.sin(this.th0), dx = p[0] - this.O[0], dy = p[1] - this.O[1]; return [dx * c + dy * s, -dx * s + dy * c]; }
  H(deg) { return this.th0 + deg * DEG; }                                           // a local heading (deg, + right) → the pitch heading (rad)
  toM(q, P, psi) { const c = Math.cos(psi), s = Math.sin(psi), dx = q[0] - P[0], dy = q[1] - P[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; }
  fromM(m, P, psi) { const c = Math.cos(psi), s = Math.sin(psi); return [P[0] + m[2] * c - m[0] * s, P[1] + m[2] * s + m[0] * c, m[1]]; }
  // ── THE BODY PATH: the centre of mass from the authored speed and travel heading, the pelvis heading, the posture channels ────────────────────────
  buildCom() {
    const T = this.T, vC = curveOf(T.com.v, 0), hC = curveOf(T.com.h, 0), n = this.n, P = new Float64Array(2 * (n + 1)), V = new Float64Array(2 * (n + 1));
    let p = [0, 0]; for (let k = 0; k <= n; k++) { const t = k * DT, v = [vC.at(t) * Math.cos(this.H(hC.at(t))), vC.at(t) * Math.sin(this.H(hC.at(t)))]; V[2 * k] = v[0]; V[2 * k + 1] = v[1];
      if (k > 0) p = [p[0] + 0.5 * (V[2 * k - 2] + v[0]) * DT, p[1] + 0.5 * (V[2 * k - 1] + v[1]) * DT]; P[2 * k] = p[0]; P[2 * k + 1] = p[1]; }
    const kC = Math.round(T.tC / DT), sh = [this.O[0] - P[2 * kC], this.O[1] - P[2 * kC + 1]]; for (let k = 0; k <= n; k++) { P[2 * k] += sh[0]; P[2 * k + 1] += sh[1]; }
    this.Pc = P; this.Vc = V; this.ch = { face: curveOf(T.face, 0), trunk: curveOf(T.trunk, 0), lean: curveOf(T.lean, 6), side: curveOf(T.side, 0), crouch: curveOf(T.crouch, 0.02), arms: curveOf(T.arms, 0.2), look: curveOf(T.look, 1) };
  }
  com(t) { if (t < 0) { const P0 = this.com(0), V0 = this.vel(0); return [P0[0] + V0[0] * t, P0[1] + V0[1] * t]; } const x = clamp(t / DT, 0, this.n), i = Math.min(this.n - 1, Math.floor(x)), u = x - i, P = this.Pc; return [P[2 * i] + (P[2 * i + 2] - P[2 * i]) * u, P[2 * i + 1] + (P[2 * i + 3] - P[2 * i + 1]) * u]; }
  vel(t) { const x = clamp(t / DT, 0, this.n), i = Math.min(this.n - 1, Math.floor(x)), u = x - i, V = this.Vc; return [V[2 * i] + (V[2 * i + 2] - V[2 * i]) * u, V[2 * i + 1] + (V[2 * i + 3] - V[2 * i + 1]) * u]; }
  psi(t) { return this.H(this.ch.face.at(t)); }
  comL(t) { return this.P2L(this.com(t)); }
  // ── THE BALL: the kernel from the authored start, one launch per authoritative contact (authored or solved to the next contact's ball point) ─────
  buildBall() {
    const T = this.T, b0 = T.ball0(this); let W;
    if (b0.arrive) { const A = b0.arrive, n = Math.round(A.t / DT), Tp = this.L2P(A.at), h = this.H(b0.h || 0), u = [Math.cos(h), Math.sin(h)], run = (v0) => { const C = mkWorld([0, R, 0], [v0, 0, 0]); for (let i = 0; i < n; i++) C.step(); return { d: C.ball.p[0], v: hyp(C.ball.v[0], C.ball.v[2]) }; };
      let lo = A.v, hi = A.v + 12; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (run(m).v < A.v) lo = m; else hi = m; } const v0 = (lo + hi) / 2, d = run(v0).d;
      W = mkWorld([Tp[0] - u[0] * d, R, Tp[1] - u[1] * d], [v0 * u[0], 0, v0 * u[1]]); this.ball0 = { v0, d }; }
    else { const p0 = this.L2P(b0.at); W = mkWorld([p0[0], R, p0[1]], [b0.v * Math.cos(this.H(b0.h)), 0, b0.v * Math.sin(this.H(b0.h))]); }
    this.contacts = T.contacts(this).map((c, i) => Object.assign({ i }, c)).sort((a, b) => a.t - b.t); this.contacts.forEach((c, i) => { c.i = i; c.k = Math.round(c.t / DT); c.t = c.k * DT; });
    const Bp = new Float64Array(3 * (this.n + 1)), Bv = new Float64Array(3 * (this.n + 1)), Bq = new Float64Array(4 * (this.n + 1)); let ci = 0;
    for (let k = 0; k <= this.n; k++) {
      while (ci < this.contacts.length && this.contacts[ci].k === k) { const c = this.contacts[ci], vIn = [W.ball.v[0], W.ball.v[2]]; c.ball = [W.ball.p[0], W.ball.p[2], W.ball.p[1]]; c.vIn = vIn;
        let v; if (c.aim.v != null) v = [c.aim.v * Math.cos(this.H(c.aim.h)), c.aim.v * Math.sin(this.H(c.aim.h))];
        else { const nx = this.contacts[ci + 1], tT = c.aim.t != null ? c.aim.t : nx.t, Tp = this.L2P(typeof c.aim.at === "function" ? c.aim.at(this, c) : c.aim.at); v = solveLaunch(W, Tp, Math.round(tT / DT) - k); c.target = Tp; }
        c.vOut = v; launch(W, "c" + c.i, v, { tech: T.id, contact: c.i, surface: c.surface, foot: c.F }); ci++; }
      Bp.set(W.ball.p, 3 * k); Bv.set(W.ball.v, 3 * k); Bq.set(W.ball.q || [0, 0, 0, 1], 4 * k); if (k < this.n) W.step(); }
    this.Bp = Bp; this.Bv = Bv; this.Bq = Bq;
    for (const c of this.contacts) { const dv = [c.vOut[0] - c.vIn[0], c.vOut[1] - c.vIn[1]]; c.n = hyp(dv[0], dv[1]) > 1e-6 ? [dv[0] / hyp(dv[0], dv[1]), dv[1] / hyp(dv[0], dv[1])] : dir(this.psi(c.t)); c.dv = hyp(dv[0], dv[1]);
      c.outDeg = wrapA(hdg(c.vOut) - this.th0) / DEG; c.speedOut = hyp(c.vOut[0], c.vOut[1]); }
  }
  ballAt(t) { const k = clamp(Math.round(t / DT), 0, this.n); return [this.Bp[3 * k], this.Bp[3 * k + 2], this.Bp[3 * k + 1]]; }   // pitch x, y, h
  ballL(t) { return this.P2L(this.ballAt(t)); }
  // ── THE FEET: the authored stances (pitch positions resolved), the swings between them (keys) ─────────────────────────────────────────────────
  buildFeet() {
    const st = this.T.stances(this).map((s) => { const at = typeof s.at === "function" ? s.at(this) : s.at, pos = this.L2P(at); const yd = typeof s.yaw === "function" ? s.yaw(this) : s.yaw; return Object.assign({}, s, { pos, at, yawD: yd || 0, yaw: this.H(yd || 0), pivot: s.pivot ? new Curve(s.pivot.map(([t, d]) => [t, d * DEG])) : null }); });
    this.st = { R: st.filter((s) => s.F === "R").sort((a, b) => a.t0 - b.t0), L: st.filter((s) => s.F === "L").sort((a, b) => a.t0 - b.t0) };
    this.sw = { R: [], L: [] };
    for (const X of SIDES) { const S = this.st[X]; for (let j = 0; j + 1 < S.length; j++) { const a = S[j], b = S[j + 1], con = this.contacts.find((c) => c.F === X && c.t > a.t1 - 1e-6 && c.t < b.t0 + 1e-6) || null, spec = (con && con.swing) || b.swingIn || null;
      const s = { F: X, j, t0: a.t1, t1: b.t0, from: a, to: b, con, spec }; s.keys = this.swingKeys(X, s); this.sw[X].push(s); } }
    for (const c of this.contacts) { const s = this.sw[c.F].find((q) => q.con === c); c.pose = s ? s.cpose : null; }
  }
  stanceYaw(s, t) { return s.yaw + (s.pivot ? s.pivot.at(t) : 0); }
  // the heel's rise of a stance at t: the toe-off (over the stance's second half, as TECHNICAL-CONTROL-1.1), an authored rise (pivots, lean-overs)
  heelOf(s, t) { const Ts = max(0.05, s.t1 - s.t0), wR = max(0.06, 0.55 * Ts), v = hyp(...this.vel(s.t1)), lift = clamp(RF.lift[0] + RF.lift[1] * v, RF.lift[2], RF.lift[3]) * (s.liftK != null ? s.liftK : 1);
    const pTO = Math.asin(clamp(lift / hyp(this.mtpY, this.mtpZ), 0, 0.9)); let p = pTO * s5((t - (s.t1 - wR)) / wR); if (s.heel) p = max(p, s.heel(t, this) * DEG); return p; }
  stanceFoot(s, t) { const my = this.mtpY, mz = this.mtpZ, y0 = s.yaw, ball = [s.pos[0] + Math.cos(y0) * mz, s.pos[1] + Math.sin(y0) * mz], yaw = this.stanceYaw(s, t), p = this.heelOf(s, t);
    const back = mz * Math.cos(p) - my * Math.sin(p), up = my * Math.cos(p) + mz * Math.sin(p);
    return { ank: [ball[0] - Math.cos(yaw) * back, ball[1] - Math.sin(yaw) * back, HB.ankleH - my + up], yaw, pitch: -p, roll: 0, toe: p, planted: true, ballPt: ball, stance: s }; }
  // ── THE CONTACT POSE: the boot's labelled surface on the ball (LegBody.placeBoot's search on DRIBBLE-1's boot hull, here in the contact frame) ──────
  contactPose(X, c, spec) {
    const sx = sgnF(X), s = c.surface, hn = hdg(c.n), yawOff = (spec && spec.yawOff || 0) * DEG, pitch = (spec && spec.pitch != null ? spec.pitch : { INSIDE: 9, OUTSIDE: -14, LACES: -45, SOLE: 18 }[s]) * DEG, roll = (spec && spec.roll || 0) * DEG;
    const yaw = (s === "INSIDE" ? hn + sx * 90 * DEG : s === "OUTSIDE" ? hn - sx * 65 * DEG : s === "SOLE" ? hn + Math.PI : hn) + sx * yawOff;
    const ball = [c.ball[0], c.ball[1], max(R, c.ball[2])], psi = yaw, Rf = Q.mul3(Q.y(0), Q.x(-pitch), Q.z(roll)), bM = [0, ball[2], 0], H = this.hull;
    if (!H) { const n = c.n, f = dir(yaw); return { ank: [ball[0] - n[0] * 0.155 - f[0] * 0.05, ball[1] - n[1] * 0.155 - f[1] * 0.05, 0.10], yaw, pitch, roll }; }
    const pts = H.P[X], faces = H[X], lowest = Math.min(...pts.map((p) => Q.v(Rf, p)[1]));
    let A; if (s === "SOLE") { const fz = Q.v(Rf, [0, 0, 0.075]); A = [bM[0] - fz[0], 0, bM[2] - fz[2]]; let lo = bM[1] - 0.2, hi = bM[1] + 0.5; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; A[1] = m; if (ballGap(faces, X, Rf, A, bM, R).gap < 0) lo = m; else hi = m; } A[1] = hi; }
    else { const wd = Q.v(Rf, surfaceDir(s, X)), hl = hyp(wd[0], wd[2]) || 1, a = [wd[0] / hl, 0, wd[2] / hl], y0 = RF.clear - lowest + (spec && spec.up || 0); let best = null;
      for (const dy of [0, 0.02, 0.04, 0.07]) { const yA = y0 + dy, at = (l) => [bM[0] - a[0] * l, yA, bM[2] - a[2] * l]; let lo = 0, hi = 0.6; if (ballGap(faces, X, Rf, at(hi), bM, R).gap < 0) continue;
        for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (ballGap(faces, X, Rf, at(m), bM, R).gap < 0) lo = m; else hi = m; } const g = ballGap(faces, X, Rf, at(hi), bM, R), ok = g.face === s || (s === "LACES" && g.face === "TOE");
        if (!best || (ok && !best.ok)) best = { A: at(hi), ok, face: g.face }; if (ok) break; } A = best.A; }
    const ank = this.fromM(A, [ball[0], ball[1]], psi); return { ank, yaw, pitch, roll };
  }
  // ── THE SWING KEYS: toe-off → (RUN-1's swing path | the authored waypoints → the contact → the follow-through) → the landing ────────────────────
  toeOff(s) { const f = this.stanceFoot(s, s.t1); return { p: f.ank, yaw: f.yaw, pitch: f.pitch }; }
  runTemplate(v) { const key = Math.round(clamp(v, 3, 9.5) * 4) / 4, cache = RefSim._tmpl || (RefSim._tmpl = new Map()); if (cache.has(key)) return cache.get(key);
    const E = this.E, b = this.b, G = E.r1GaitAt(b, E.RUN1.ref, key), rootM = E.r1RootMatrix(0, 0, 0, 0), ix = b.idx.foot_R, out = [];
    for (let i = 0; i <= 20; i++) { const w = i / 20, u = G.D + w * (1 - G.D), pz = E.r1Pose({ body: b, p: G }, u, null), fk = E.r1FK({ body: b, p: G }, pz, rootM, null), j = fk.joint[ix], m = fk.world[ix]; out.push({ f: j[0], up: j[1], lat: -j[2], pitch: Math.atan2(m[9], hyp(m[8], m[10])) }); }
    cache.set(key, out); return out; }
  // a key's position from an authored waypoint: { t, rel: "ball" | "com" | "stance" (the other foot's ankle) | "O", at: [a, l, h], yaw (deg, local), pitch, roll }
  wayKey(X, w, sw) { let base, hb = 0; const t = w.t;
    if (w.rel === "ball") { const c = sw.con, bp = c ? c.ball : this.ballAt(t); base = this.P2L(bp); }
    else if (w.rel === "ballNow") base = this.P2L(this.ballAt(t));                      // (the ball where it is at the waypoint's time)
    else if (w.rel === "com") base = this.comL(t);
    else if (w.rel === "pelvis") { const c = this.comL(t), f = this.ch.face.at(t) * DEG, q = [c[0] + w.at[0] * Math.cos(f) - w.at[1] * Math.sin(f), c[1] + w.at[0] * Math.sin(f) + w.at[1] * Math.cos(f)], p = this.L2P(q);   // [forward, right, h] in the pelvis frame
      return { t, p: [p[0], p[1], w.at[2] != null ? w.at[2] : HB.ankleH + 0.05], v: null, yaw: w.yaw != null ? this.H(w.yaw) : null, pitch: w.pitch != null ? w.pitch * DEG : null, roll: w.roll != null ? w.roll * DEG : null }; }
    else if (w.rel === "stance") { const o = this.st[other(X)].find((q) => q.t0 <= t + 1e-6 && q.t1 >= t - 1e-6) || this.st[other(X)].find((q) => q.t0 >= t); base = this.P2L(this.stanceFoot(o, clamp(t, o.t0, o.t1)).ank); }
    else base = [0, 0];
    const p = this.L2P([base[0] + w.at[0], base[1] + w.at[1]]); return { t, p: [p[0], p[1], w.at[2] != null ? w.at[2] : HB.ankleH + 0.05], v: w.v ? [...this.vL2P(w.v.slice(0, 2)), w.v[2] || 0] : null, yaw: w.yaw != null ? this.H(w.yaw) : null, pitch: w.pitch != null ? w.pitch * DEG : null, roll: w.roll != null ? w.roll * DEG : null }; }
  vL2P(v) { const c = Math.cos(this.th0), s = Math.sin(this.th0); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }
  swingKeys(X, sw) {
    const T = sw.t1 - sw.t0, a0 = this.toeOff(sw.from), to = sw.to, toF = this.stanceFoot(to, to.t0), vMid = hyp(...this.vel(sw.t0 + T / 2)), spec = sw.spec || {};
    const keys = [{ t: sw.t0, p: a0.p, v: [0, 0, 0.3], yaw: a0.yaw, pitch: a0.pitch, roll: 0 }];
    const land = { t: sw.t1, p: toF.ank.slice(), v: null, yaw: toF.yaw, pitch: 0, roll: 0 };
    const c = sw.con; let mids = [];
    if (c) { const P = this.contactPose(X, c, spec.contact), vb = this.vel(c.t), vRel = spec.footSpeed != null ? spec.footSpeed : clamp(0.55 * c.dv + 0.6, 0.8, 6.0), n = spec.sweep ? dir(this.H(spec.sweep)) : c.n;
      sw.cpose = P; const kc = { t: c.t, p: P.ank.slice(), v: [vb[0] + n[0] * vRel, vb[1] + n[1] * vRel, spec.vzC != null ? spec.vzC : 0.05], yaw: P.yaw, pitch: P.pitch, roll: P.roll, contact: true };
      const way = (spec.via || []).map((w) => Object.assign(this.wayKey(X, Object.assign({}, w, { t: w.dt != null ? c.t + w.dt : w.t }), sw), { way: true }));
      // (no authored approach: the preparation behind the contact along the impulse, moving with the body — TECHNICAL-CONTROL-1's)
      if (!way.some((w) => w.t < c.t)) { const tP = max(sw.t0 + 0.4 * (c.t - sw.t0), c.t - 0.075), dP = min(0.16, vRel * (c.t - tP) * 0.8); way.unshift({ t: tP, p: [P.ank[0] - n[0] * dP - vb[0] * (c.t - tP), P.ank[1] - n[1] * dP - vb[1] * (c.t - tP), P.ank[2] + 0.015], v: null, yaw: P.yaw, pitch: P.pitch * 0.7, roll: P.roll }); }
      if (!way.some((w) => w.t > c.t) && sw.t1 - c.t > 0.06) way.push({ t: c.t + 0.45 * (sw.t1 - c.t), p: [lerp(P.ank[0], toF.ank[0], 0.55), lerp(P.ank[1], toF.ank[1], 0.55), lerp(P.ank[2], HB.ankleH, 0.5) + 0.02], v: null, yaw: P.yaw + wrapA(toF.yaw - P.yaw) * 0.6, pitch: P.pitch * 0.3, roll: 0 });
      mids = way.concat([kc]).sort((a, b) => a.t - b.t);
      // a long swing into the first waypoint: RUN-1's stride path up to it
      const k1 = mids[0]; if (k1.t - sw.t0 > 0.12 && vMid >= 2.6) mids = this.runPath(X, sw, a0.p, k1, vMid).concat(mids); }
    else if (spec.via && spec.via.length) { mids = spec.via.map((w) => this.wayKey(X, w, sw)).sort((a, b) => a.t - b.t); const k1 = mids[0]; if (k1.t - sw.t0 > 0.12 && vMid >= 2.6) mids = this.runPath(X, sw, a0.p, k1, vMid).concat(mids); }
    else if (vMid >= 2.6) mids = this.runPath(X, sw, a0.p, land, vMid);
    else { const m = [0.5 * (a0.p[0] + land.p[0]), 0.5 * (a0.p[1] + land.p[1])], lift = clamp(0.07 + 0.016 * vMid, 0.05, 0.16) * (spec.liftK || 1); mids = [{ t: sw.t0 + 0.5 * T, p: [m[0], m[1], HB.ankleH + lift], v: null, yaw: null, pitch: 8 * DEG, roll: 0 }]; }
    const all = keys.concat(mids, [land]);
    // velocities: authored where given, else the neighbours' finite difference (Catmull – Rom); the landing comes down onto the turf
    for (let i = 1; i < all.length; i++) { const k = all[i]; if (k.v) continue; if (i === all.length - 1) { const a = all[i - 1], dt = max(0.02, k.t - a.t); k.v = [(k.p[0] - a.p[0]) / dt * 0.6, (k.p[1] - a.p[1]) / dt * 0.6, -0.45]; continue; }
      const a = all[i - 1], b = all[i + 1], dt = b.t - a.t; k.v = [(b.p[0] - a.p[0]) / dt, (b.p[1] - a.p[1]) / dt, (b.p[2] - a.p[2]) / dt]; }
    all[0].v = [all[1].p[0] - all[0].p[0], all[1].p[1] - all[0].p[1], 0].map((x) => x / max(0.02, all[1].t - all[0].t) * 0.5); all[0].v[2] = 0.3;
    // orientation keys: missing yaw / pitch / roll interpolated between the authored ones (a C¹ monotone cubic per channel over the keys that have it)
    for (const ch of ["yaw", "pitch", "roll"]) { const have = all.filter((k) => k[ch] != null); if (ch === "yaw") { for (let i = 1; i < have.length; i++) have[i].yaw = have[i - 1].yaw + wrapA(have[i].yaw - have[i - 1].yaw); }
      const cv = new Curve(have.map((k) => [k.t, k[ch]])); for (const k of all) if (k[ch] == null) k[ch] = cv.at(k.t); }
    for (let i = 1; i < all.length; i++) all[i].yaw = all[i - 1].yaw + wrapA(all[i].yaw - all[i - 1].yaw);
    sw.ori = { yaw: new Curve(all.map((k) => [k.t, k.yaw])), pitch: new Curve(all.map((k) => [k.t, k.pitch])), roll: new Curve(all.map((k) => [k.t, k.roll])) };
    return all;
  }
  // RUN-1's swing path (root-relative: heel recovery, knee drive, reach) from the toe-off to the key kE, its ends corrected onto them
  runPath(X, sw, a0, kE, v) { const T = sw.t1 - sw.t0, wE = (kE.t - sw.t0) / T, tm = this.runTemplate(v), ws = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].filter((w) => w < wE - 0.03 / T); if (!ws.length) return [];
    const at = (w) => { const t = sw.t0 + w * T, P = this.com(t), psi = hdg(this.vel(t)), q = tm[Math.round(clamp(w, 0, 1) * 20)], l = sgnF(X) * abs(q.lat); return [P[0] + q.f * Math.cos(psi) - l * Math.sin(psi), P[1] + q.f * Math.sin(psi) + l * Math.cos(psi), q.up]; };
    const A0 = at(0), AE = at(wE), e0 = [a0[0] - A0[0], a0[1] - A0[1], a0[2] - A0[2]], e1 = [kE.p[0] - AE[0], kE.p[1] - AE[1], kE.p[2] - AE[2]];
    return ws.map((w) => { const A = at(w), k = s5(w / wE); return { t: sw.t0 + w * T, p: [A[0] + e0[0] * (1 - k) + e1[0] * k, A[1] + e0[1] * (1 - k) + e1[1] * k, max(HB.ankleH, A[2] + e0[2] * (1 - k) + e1[2] * k)], v: null, yaw: null, pitch: tm[Math.round(clamp(w, 0, 1) * 20)].pitch, roll: null }; }); }
  // ── a foot at time t ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  footAt(X, t) {
    const S = this.st[X]; let s = S.find((q) => t >= q.t0 - 1e-9 && t <= q.t1 + 1e-9); if (s) return this.stanceFoot(s, t);
    const w = this.sw[X].find((q) => t > q.t0 && t < q.t1);
    if (!w) { s = t < S[0].t0 ? S[0] : S[S.length - 1]; return this.stanceFoot(s, clamp(t, s.t0, s.t1)); }
    const K = w.keys; let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const p = herm3(K[i], K[i + 1], t), toe = this.heelOf(w.from, w.from.t1) * (1 - sstep(w.t0, w.t0 + 0.12, t));
    return { ank: [p[0], p[1], max(HB.ankleH - 0.012, p[2])], yaw: w.ori.yaw.at(t), pitch: w.ori.pitch.at(t), roll: w.ori.roll.at(t), toe, planted: false, swing: w, contact: !!(w.con && abs(t - w.con.t) < DT * 0.6) };
  }
  loadOf(X, t) { const S = this.st[X], s = S.find((q) => t >= q.t0 && t <= q.t1); if (!s) return 0; return clamp((t - s.t0) / HB.load, 0, 1) * clamp((s.t1 - t) / HB.unload, 0, 1); }
  cycle(t) { let lastTD = -9, nextTD = 9, sw = "R"; for (const X of SIDES) for (const s of this.st[X]) { if (s.t0 <= t && s.t0 > lastTD) lastTD = s.t0; if (s.t0 > t && s.t0 < nextTD) { nextTD = s.t0; sw = X; } }
    return { u: lastTD > -9 && nextTD < 9 ? clamp((t - lastTD) / max(0.05, nextTD - lastTD), 0, 1) : 0.5, sw }; }
  phaseAt(t) { const ph = this.T.phases || []; let o = ph.length ? ph[0][0] : ""; for (const [nm, t0] of ph) if (t >= t0 - 1e-9) o = nm; return o; }
  // ── THE POSE at t ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  poseAt(t) {
    const E = this.E, R3 = E.R3, b = this.b, ch = this.ch, rot = {}, feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, S = this.com(t), psi = this.psi(t), V = this.vel(t), sp = hyp(V[0], V[1]), run = clamp(sp / 6, 0, 1), cy = this.cycle(t);
    const lR = this.loadOf("R", t), lL = this.loadOf("L", t), ld = clamp(lR + lL, 0, 1), wR = lR + lL > 1e-6 ? lR / (lR + lL) : 0.5, Fw = [wR * feet.R.ank[0] + (1 - wR) * feet.L.ank[0], wR * feet.R.ank[1] + (1 - wR) * feet.L.ank[1]];
    const hc = Math.cos(psi), hs = Math.sin(psi), dF = [Fw[0] - S[0], Fw[1] - S[1]], lt = -dF[0] * hs + dF[1] * hc, kL = RF.comPull * (1 - 0.6 * run) * ld * (this.T.sway != null ? this.T.sway : 1); let P = [S[0] - lt * kL * hs, S[1] + lt * kL * hc];
    // the running cycle (pelvis bob, the twist with the swinging leg, the arms' counter-swing) fades out through the action (authored "gait" share)
    const g = this.T.gait ? clamp(new Curve(this.T.gait).at(t), 0, 1) : 1, bob = -clamp(RF.bob[0] + RF.bob[1] * sp, 0, RF.bob[2]) * Math.cos(2 * Math.PI * (cy.u - 0.35)) * g, gTw = sgnF(cy.sw) * clamp(RF.twist[0] + RF.twist[1] * sp, 0, RF.twist[2]) * DEG * Math.sin(Math.PI * cy.u) * g;
    const lean = ch.lean.at(t) * DEG, side = ch.side.at(t) * DEG, trunk = ch.trunk.at(t) * DEG, crouch = ch.crouch.at(t), arms = ch.arms.at(t);
    let pelvis = [0, b.pelvisY - 0.02 - crouch + bob + 0.012 * run, 0.02 * run], Rp = R3.mul3(R3.y(gTw), R3.x(lean * 0.35), R3.z(-side * 0.45));
    rot.pelvis = Rp; rot.spine = R3.mul3(R3.y(trunk * 0.45 - gTw * 0.6), R3.x(lean * 0.3), R3.z(-side * 0.3)); rot.chest = R3.mul3(R3.y(trunk * 0.55 - gTw * 0.5), R3.x(lean * 0.35), R3.z(-side * 0.25));
    const swing = clamp(RF.armSwing[0] + RF.armSwing[1] * sp, 0, RF.armSwing[2]) * DEG * Math.sin(Math.PI * cy.u) * sgnF(cy.sw) * g, armSide = this.T.armSide ? new Curve(this.T.armSide).at(t) : 0;
    for (const X of SIDES) { const sx = sgnF(X), abd = 10 + 38 * arms * (1 + 0.5 * sx * armSide), arm = sx * swing;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-arm - 4 * DEG - 10 * DEG * arms), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(35 + 45 * run * g + 20 * arms) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    // the head: the ball while it is close and the action is on, ahead along the run otherwise (authored "look": 1 = the ball)
    const ball = this.ballAt(t), Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05], lk = clamp(ch.look.at(t), 0, 1), dB = hyp(ball[0] - S[0], ball[1] - S[1]);
    { const wB = lk * (1 - sstep(1.2, 2.2, dB)), tgt = [lerp(S[0] + Math.cos(hdg(V)) * 6, ball[0], wB), lerp(S[1] + Math.sin(hdg(V)) * 6, ball[1], wB), lerp(0.7, ball[2], wB)], q = this.toM(tgt, S, psi), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]];
      const yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -45 * DEG, 55 * DEG), want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm);
      rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    // reach: a planted (or touching) leg beyond its length moves the pelvis toward it and lowers it a little — never the foot, never the ball
    let reachM = 0; const c = Math.cos(psi), s = Math.sin(psi);
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wC = fX.planted ? 1 : fX.contact ? 1 : 0; if (wC <= 0) continue; const sx = sgnF(X), hipM = [pelvis[0] + sx * b.hipX, pelvis[1], pelvis[2]], an = this.toM(fX.ank, P, psi), d = hyp(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = RF.reach * b.legLen;
        if (d > lim) { const ex = d - lim, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = hyp(hx, hz) || 1, dr = min(0.05, ex * 0.5), ex2 = max(0, ex - dr), mx = hx / hl * ex2, mz = hz / hl * ex2; dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; reachM += hyp(dP[0], dP[1]) + drop; }
    // THE LEGS (TECHNICAL-CONTROL-1.1's chain)
    const legRot = {}, legs = {};
    for (const X of SIDES) { const ft = feet[X], sx = sgnF(X), hip = Q.v(Rp, [sx * b.hipX, 0, 0]).map((x, i) => x + pelvis[i]);
      const solve = (f) => { const an = this.toM(f.ank, P, psi), Rf = Q.mul3(Q.y(wrapA(f.yaw - psi)), Q.x(-(f.pitch || 0)), Q.z(f.roll || 0)), psiK = swivelFor(footOut(Rp, Rf, X), X) + (f.kneeOut || 0), ik = legIK(b, Rp, psiK, hip, an, RF.kMin), Rsh0 = Q.mul3(Rp, ik.Rthigh, Q.x(ik.k)), A = ankleFor(Rsh0, Rf, X, ik.k); return { an, Rf, ik, A, Rsh0 }; };
      let f = ft, L = solve(f);
      // a planted heel rises (about the ball of the foot) as soon as the ankle would dorsiflex past its range (the leg accepts the weight over it)
      if (f.planted) for (let it = 0; it < 3; it++) { const df = -L.A.fp / DEG + (L.A.err > 0.5 ? -L.A.res[1] / DEG : 0); if (df <= RF.dfRise) break; const p0 = -f.pitch, p1 = p0 + (df - RF.dfRise + 1) * DEG, my = this.mtpY, mz = this.mtpZ;
        const back = mz * Math.cos(p1) - my * Math.sin(p1), up = my * Math.cos(p1) + mz * Math.sin(p1); f = Object.assign({}, f, { ank: [f.ballPt[0] - Math.cos(f.yaw) * back, f.ballPt[1] - Math.sin(f.yaw) * back, HB.ankleH - my + up], pitch: -p1, toe: p1 }); L = solve(f); }
      feet[X] = f; legRot["thigh_" + X] = L.ik.Rthigh; legRot["shin_" + X] = Q.mul(Q.x(L.ik.k), Q.y(L.A.tau)); legRot["foot_" + X] = Q.yxz(L.A.fy, L.A.fp, L.A.fr); legRot["toe_" + X] = Q.x(-(f.toe || 0));
      legs[X] = { short: L.ik.short, err: L.A.err, Rfoot: Q.mul(L.Rsh0, Q.mul(Q.y(L.A.tau), Q.yxz(L.A.fy, L.A.fp, L.A.fr))), an: L.an }; }
    const pose = { rot: Object.assign(rot, legRot), pelvisPos: pelvis }, rootM = E.r1RootMatrix(P[0], P[1], psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0], -w[2], w[1]], t: [tp[0], -tp[2], tp[1]] }; }   // pitch x, y, height
    // the ball against each boot (the hull, in the root frame): gap < 0 = the ball inside the boot
    const bM = this.toM(ball, P, psi), gap = {}; if (this.hull) for (const X of SIDES) { const g = ballGap(this.hull[X], X, legs[X].Rfoot, this.toM(J["foot_" + X].j, P, psi), bM, R); gap[X] = { gap: +g.gap.toFixed(4), face: g.face }; }
    return { t, skin, J, pose, P, psi, V, feet, legs, gap, reach: reachM, ball };
  }
  // ── RUN: pose and record every tick ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  run(o = {}) {
    this.rec = []; const anim = o.anim !== false;
    for (let k = 0; k <= this.n; k++) { const t = k * DT, bp = [this.Bp[3 * k], this.Bp[3 * k + 1], this.Bp[3 * k + 2]], r = { k, t, P: this.com(t), V: this.vel(t), psi: this.psi(t), ball: { p: bp, v: [this.Bv[3 * k], this.Bv[3 * k + 1], this.Bv[3 * k + 2]], q: Array.from(this.Bq.subarray(4 * k, 4 * k + 4)) }, phase: this.phaseAt(t) };
      const con = this.contacts.find((c) => c.k === k); if (con) r.contact = { i: con.i, F: con.F, surface: con.surface, role: con.role };
      if (anim) { const p = this.poseAt(t); r.skin = p.skin; r.J = p.J; r.Ppel = p.P; r.feet = {}; r.planted = {}; r.gap = p.gap; r.reach = p.reach; r.legA = {};
        r.exp = exposureAt(p.J, [bp[0], bp[2], bp[1]], this.th0); r.clr = clearancesOf(p.J);
        for (const X of SIDES) { const a = p.feet[X].ank; r.feet[X] = [a[0], a[2], -a[1]]; r.planted[X] = !!p.feet[X].planted; const A = legAngles(p.pose.rot, X); r.legA[X] = { hipFlex: A.hipFlex, hipAbd: A.hipAbd, hipRot: A.hipRot, knee: A.knee, df: A.df, inv: A.inv, tib: A.tib, abd: A.abd, err: p.legs[X].err, over: overROM(A, "hard") }; } }
      this.rec.push(r); }
    return this;
  }
}

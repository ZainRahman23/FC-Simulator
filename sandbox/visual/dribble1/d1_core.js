// ═══ dribble1/d1_core.js — DRIBBLE-1: physics-based dribbling on the frozen TURN-1.2 locomotion and the BALL-PHYS / BALL-FEEL physical ball ═══
// AUTHORITY (Touchline's contract — simulation decides, presentation explains):
//   • GAMEPLAY / SIMULATION owns intent: desired direction, desired speed, dribble context (the scenario input + the carrier rule in intent()).
//   • TURN-1.2 (turn1_loco.js, frozen 2129ca04) resolves the locomotion: stride phase, stance, plants, foot trajectories, cuts / reversals. It is
//     never edited and never steered by the ball; its dynamics never read the swing adjustment below.
//   • the DRIBBLE RESOLVER (this file) decides whether / when a deliberate touch occurs, which foot and boot region make it, the intended launch.
//   • BALL-PHYS (ballphys1 + ballfeel11/12/13, source 75866e99, byte-identical) owns the ball: after the single authoritative launch the ball is a
//     free rigid body — it rolls, skips, slows, collides with every collider (the dribbler's own legs included) and can be intercepted.
// NO TETHER: nothing here writes the ball's position or velocity except BallWorld.schedule() (one resolved launch at a verified boot contact,
// cancelled by the kernel if the ball is not there). No attraction, no lerp, no socket, no per-frame correction, no possession snap-back.
// TOUCH = a bounded FREE-LEG SWING ADJUSTMENT: the swing foot's path gets an offset / region rotation that is zero at toe-off and at touchdown (plants,
// lift-off and landing unchanged) and peaks at the contact; the adjusted leg is re-solved with RUN-1.3's own leg IK. If the ball is not reachable
// within the bounds there is no touch (no fake contact): the player needs another step, or loses the ball.
// FRAMES: pitch (x, y), heading θ (+ = right turn); anim3d world [x, h, −y] (TURN-1, the resolver's geometry); ball kernel [x, h, y] (BallWorld).
// TIME: one fixed 1/240 s grid shared by TURN-1.2 and the ball (BallWorld dt = 1/240, 1 substep: the identical 240 Hz BALL-PHYS integrator).
import { BallWorld as BF13World } from "../ballfeel13/world.js";
import { GLOBAL as BF13_GLOBAL } from "../ballfeel13/config.js";
import { fromTurn1Frame } from "../ballphys1/adapter.js";
import { collider as compileCollider, distance as hullDistance } from "../ballphys1/geometry.js";
import { KeyedRNG } from "./d1_rng.js";
import { norm as attrNorm } from "./d1_attrs.js";

export const BALL_DEFAULT = Object.freeze({ id: "BALL-FEEL-1.3 world (75866e99) · default laws · GLOBAL turf", World: BF13World, parameters: BF13_GLOBAL, options: {} });
export const DT = 1 / 240;
const R = 0.11, DEG = Math.PI / 180, SIDES = ["R", "L"], PARTS = ["boot", "toe", "shin", "thigh"];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t, wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
// ── vectors (3) and row-major 3×3 rotations (the R3 convention of RUN-1.3) ──────────────────────────────────────────────────────────────────────
const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]), norm: (a) => { const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); return l > 1e-14 ? [a[0] / l, a[1] / l, a[2] / l] : [1, 0, 0]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] };
const M = { I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mul: (A, B) => [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
    A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
    A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]],
  tr: (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]],
  v: (A, p) => [A[0] * p[0] + A[1] * p[1] + A[2] * p[2], A[3] * p[0] + A[4] * p[1] + A[5] * p[2], A[6] * p[0] + A[7] * p[1] + A[8] * p[2]],
  y: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  exp: (r) => { const a = V.len(r); if (a < 1e-12) return M.I(); const x = r[0] / a, y = r[1] / a, z = r[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
    return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; },
  log: (Rm) => { const c = clamp((Rm[0] + Rm[4] + Rm[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0]; if (Math.PI - a < 1e-6) { const x = Math.sqrt(Math.max(0, (Rm[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (Rm[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (Rm[8] + 1) / 2)); return [x * a, (Rm[1] >= 0 ? 1 : -1) * y * a, (Rm[2] >= 0 ? 1 : -1) * z * a]; }
    const k = a / (2 * Math.sin(a)); return [(Rm[7] - Rm[5]) * k, (Rm[2] - Rm[6]) * k, (Rm[3] - Rm[1]) * k]; },
  quat: (m) => { const t = m[0] + m[4] + m[8]; let x, y, z, w;
    if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m[7] - m[5]) / s; y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s; }
    else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; w = (m[7] - m[5]) / s; x = s / 4; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s; }
    else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = s / 4; z = (m[5] + m[7]) / s; }
    else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = s / 4; }
    const l = Math.hypot(x, y, z, w); return [x / l, y / l, z / l, w / l]; } };
// anim3d world ↔ ball kernel: the reflection z → −z (positions, velocities); axial vectors (spin) transform with det(S)·S; quaternions as the adapter
const K = (a) => [a[0], a[1], -a[2]], KW = (w) => [-w[0], -w[1], w[2]], KQ = (q) => [-q[0], -q[1], q[2], q[3]];
const rootR = (psi) => M.y(psi + Math.PI / 2);                                       // RUN-1.3 r1RootMatrix rotation (root x = right, z = forward)
const pitch2w = (x, y, h) => [x, h || 0, -y], fwdW = (th) => [Math.cos(th), 0, -Math.sin(th)], rgtW = (th) => [-Math.sin(th), 0, -Math.cos(th)];
const headingOf = (vw) => Math.atan2(-vw[2], vw[0]);                               // pitch heading of an anim3d horizontal vector

// ── parameters (development values; every number is reported in the evidence) ────────────────────────────────────────────────────────────────
export const D1 = {
  id: "DRIBBLE-1 V1",
  // the boot-contact vocabulary: outward direction of the region in the FOOT's local frame (anim3d: x = right, y = up, z = toe), R foot; L mirrors x
  regions: {
    LACES:   { hull: "toe", d: [0, 0.88, 0.47], yawMax: 30, pitchMax: 78, err: 1.00 },   // instep: the toe box's dorsum, toes pointed (a rolling ball's drive contact)
    INSIDE:  { hull: "boot", d: [-0.94, 0.05, 0.34], yawMax: 62, pitchMax: 25, err: 0.85 },
    OUTSIDE: { hull: "boot", d: [0.62, 0.22, 0.75], yawMax: 45, pitchMax: 50, err: 1.30 },
    FRONT:   { hull: "toe", d: [0, 0.22, 0.975], yawMax: 25, pitchMax: 35, err: 1.15 },
  },
  hipRot: [-45, 45],                    // deg: swing-leg hip rotation range for a deliberate technique (R1_LIMITS hipRot is [−45, 40])
  reach: { back: 0.32, ahead: 0.12, lat: 0.15, up: 0.05, down: 0.24, ik: 0.985 },   // swing adjustment bounds (m) at the contact (agility scales them ±25 %):
                                        // BACK = a shorter, lower dribbling swing (the foot stays under the knee instead of reaching out); AHEAD = reaching
  rotRate: 16.0, offRate: 3.0,          // rad/s, m/s: adjustments unwind to TURN-1.2's touchdown no faster than this
  hold: { max: 0.08, from: 0.88, span: 0.09 },   // follow-through hold: ≤ 8 cm behind the path, released over swing fraction 0.88 → 0.97                         // rad/s: the region rotation must unwind by touchdown (|rotation| ≤ rotRate · remaining swing time + 0.12 rad)
  wLo: 0.50, wHi: 0.96,
  wTarget: [0.70, 0.94], targetRegions: ["FRONT", "INSIDE"],   // next-touch targets: swing-fraction range; the target = the centre of the feasible envelope
  closeWant: 1.1,                       // m/s: the planned closing speed of the next boot on the ball at that contact (robust, still a touch)                 // swing-fraction window searched for contacts (late swing)
  gap0: 0.003,                          // m (a 1.5 mm gap inside the kernel's 2 mm guard band was tried: near-contact with a spinning boot stalls the kernel's
                                        // conservative-advancement CCD, which fails closed — not acceptable; the follow-through planning prevents re-contact instead)
  clear: { margin: 0.025, lat: 0.13, back: 0.22, up: 0.08, wcMax: 0.86, minSpan: 0.08 },   // non-touching swings: keep ≥ margin from the free ball (avoidance bounds, m)
  elevs: [0, 10, 20, 30, 38], elevsPhys: [0, 10, 20, 30],           // deg: contact-normal elevations searched (the boot meets the ball below its equator → a small, consistent pop)
  liftK: 0.30, liftMax: 1.1,            // resolved vertical launch = speed · sin(elevation) · liftK (≤ liftMax m/s)
  floor: 0.004,                         // m: lowest boot-hull point (sole; studs excluded) above the turf plane for an adjusted swing foot                          // m: boot ↔ ball surface gap at the contact tick (the kernel's eligibility window is ≤ 0.025)
  closeMin: 0.35,                       // m/s: the boot must be closing on the ball along the contact normal
  sepMin: 0.8, followGap: 0.008,                          // m/s: the launched ball must leave the boot at least this fast (the kernel guards ≤ 2 substeps)
  // speed-dependent dribble character: desired MAX separation COM → ball between touches (m) and the minimum interval (s) between deliberate touches
  sepWant: [[2.5, 0.7], [3.0, 0.8], [5.5, 1.2], [7.8, 2.0], [9.5, 2.8]],
  minInterval: [[2.5, 0.42], [5.5, 0.55], [9.5, 0.70]],
  maxInterval: [[2.5, 1.4], [5.5, 2.1], [9.5, 2.9]],
  launchExtra: [[2.5, 2.6], [5.5, 3.6], [9.5, 5.0]],   // m/s: the largest dribble launch above the player's speed (beyond it a touch is a kick / pass)
  horizon: 3.2,
  planTries: 24, planStep: 2, refineTries: 4, liftCarry: 0.22, validKeep: 3, sepCostK: 0.6, followExtra: 2.0,   // a recovery touch may be up to followExtra m/s firmer than launchMax to clear the follow-through             // contact ticks searched every planStep (240 Hz grid); the commit is still at the exact tick
  warp: { rhoMaxPhys: 1.8, maxBack: 36, step: 4, rhoMin: 0.30, lead: 0.30, catchUp: 2.0, costLag: 0.8, costSlow: 0.25 },   // swing time-warp: path phase up to 36 ticks behind,
                                        // foot speed at contact ≥ 30 % of its path speed, ≤ 3.2× catch-up after, warp starts ≤ 0.30 before the meeting phase                         // ranked contact candidates tried (launch solve + refined checks) per planning pass                         // s: locomotion / free-ball lookahead
  recover: { dth: 12, slow: 1.0, fast: 0.6, gain: 1.0, lag: 0.25, latDead: 0.05, fwdDead: 0.06, paceDead: 0.45 },   // carrier recovery: bend (deg) / pace (m/s) bounds, response model
  pursuitEvery: 60,                     // ticks: while no touch is planned the carrier re-aims his run at the free ball this often
  cutGate: 8, cutMinInterval: 0.28, cutWinTol: 30, cutSepK: 0.7,   // a cut touch: next window on the new heading (±30°), ≥ 0.28 s later, 70 % separation                          // deg: a requested direction change above this is held until a touch can take the ball through it
  gateMax: 1.2,                        // s: … at most this long (then the turn is released without the ball)
  // touch error σ for a neutral (g = 0) player on the preferred foot, LACES, at 5.5 m/s
  errSpeed: 0.022, errDir: 1.5, errLift: 0.20, errSkill: 0.9,   // σ = base × (1 − errSkill · q), q = 0.5 g(Dribbling) + 0.3 g(Ball Control) + 0.2 g(Agility)
  hybrid: { speed: 0.20, dir: 9 },      // C: the physical estimate may move the launch within ±20 % speed and ±9° direction of the resolved launch
};
// SWING TIME-WARP: a monotone C1 map of the swing fraction, knots [w, w', slope]; the touching foot follows TURN-1.2's own swing path at w' (slower
// through the push, catching up after it); pinned at the swing's end (1, 1, 1) so landing time and plant are TURN-1.2's
function hermite(x0, y0, m0, x1, y1, m1, x) { const h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1; }
function hermiteD(x0, y0, m0, x1, y1, m1, x) { const h = x1 - x0, t = (x - x0) / h, t2 = t * t; return ((6 * t2 - 6 * t) * y0 + (3 * t2 - 4 * t + 1) * h * m0 + (-6 * t2 + 6 * t) * y1 + (3 * t2 - 2 * t) * h * m1) / h; }
export function warpAt(K, w) { if (!K || w <= K[0][0]) return w; for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1]; if (w <= b[0]) return clamp(hermite(a[0], a[1], a[2], b[0], b[1], b[2], w), 0, 1); } return w; }
export function warpSlope(K, w) { if (!K || w <= K[0][0]) return 1; for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1]; if (w <= b[0]) return hermiteD(a[0], a[1], a[2], b[0], b[1], b[2], w); } return 1; }
const warpOk = (K) => { for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], d = (b[1] - a[1]) / (b[0] - a[0]); if (!(b[0] > a[0]) || !(d > 0)) return false; const al = a[2] / d, be = b[2] / d; if (al < 0 || be < 0 || al * al + be * be > 9) return false; } return true; };
// continue a warp from its current state (w, w', slope) back to the identity at the swing's end — always monotone (slopes limited, Fritsch–Carlson)
export function warpHome(K, w) { if (!K) return null; const y = warpAt(K, w); if (w >= 0.999 || Math.abs(y - w) < 1e-7) return null; const d = (1 - y) / (1 - w), s0 = Math.min(warpSlope(K, w), 2 * d), s1 = Math.min(1, 2 * d); return [[w, y, Math.max(0, s0)], [1, 1, s1]]; }
const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; };

// ── colliders: the real boot mesh hulls (d1_colliders.json) + leg capsules, per player, through the BALL-PHYS adapter (fromTurn1Frame) ────────────────
function partShapes(J, S, part) { const P = J.sides[S][part]; return P.points ? [{ type: "hull", points: P.points }] : [{ type: "capsule", r: P.r, half: P.half, pos: P.pos }]; }
function partBone(J, S, part) { return J.sides[S][part].bone; }
export function playerColliders(J, pid) {
  const out = []; for (const S of SIDES) for (const part of PARTS) out.push(fromTurn1Frame({ id: `${pid}:${part}_${S}`, time: 0, position: [0, -50, 0], rotation: [0, 0, 0, 1], linearVelocity: [0, 0, 0], angularVelocity: [0, 0, 0],
    shapes: partShapes(J, S, part), material: part === "boot" || part === "toe" ? "boot" : "body" }));
  return out;
}
// the resolver's own copies of the hulls (anim3d frame) for exact geometric queries with the kernel's distance function
function localHulls(J) { const H = {}; for (const S of SIDES) for (const part of ["boot", "toe"]) H[part + "_" + S] = { c: compileCollider({ id: "q:" + part + S, shapes: partShapes(J, S, part) }), pts: J.sides[S][part].points }; return H; }
const hullAt = (h, p, Rm) => { const c = h.c; c.p = p.slice(); c.q = M.quat(Rm); c.v = [0, 0, 0]; c.w = [0, 0, 0]; c.epoch = 0; return c; };
const gapTo = (h, p, Rm, ball) => hullDistance(hullAt(h, p, Rm), ball, 0).d - R;
// fast clearance test: the largest face-plane distance is a LOWER bound of the distance to a convex hull; only when that bound is within the
// threshold is the exact (closest-feature) query run. Returns a value > thr when clear, else the exact gap.
const gapAtLeast = (h, p, Rm, ball, thr) => {
  const F = h.faces || (h.faces = h.c.shapes[0].faces.map((f) => [f.n[0], f.n[1], f.n[2], f.d])), dx = ball[0] - p[0], dy = ball[1] - p[1], dz = ball[2] - p[2];
  const qx = Rm[0] * dx + Rm[3] * dy + Rm[6] * dz, qy = Rm[1] * dx + Rm[4] * dy + Rm[7] * dz, qz = Rm[2] * dx + Rm[5] * dy + Rm[8] * dz; let m = -Infinity;
  for (let i = 0; i < F.length; i++) { const f = F[i], v = f[0] * qx + f[1] * qy + f[2] * qz - f[3]; if (v > m) m = v; }
  return m - R > thr ? m - R : gapTo(h, p, Rm, ball);
};
// world frames of the leg bones from a pose (fk.R / fk.P are RUN-1's root-frame values; world = root rotation · R, root rotation · P + root position)
function boneFrames(A, fk) {
  const Rr = rootR(A.psi), T = [A.P[0], 0, -A.P[1]], ix = A.body.idx, out = {};
  for (const S of SIDES) for (const b of ["thigh", "shin", "foot", "toe"]) { const i = ix[b + "_" + S]; out[b + "_" + S] = { R: M.mul(Rr, fk.R[i]), p: V.add(M.v(Rr, fk.P[i]), T) }; }
  return out;
}

// ── opponent fixtures: PRESCRIBED kinematic legs (no AI) — another physical body the ball can meet between touches; kernel frame [x, h, y] ─────────
// SWEEP: a defender's leg (shin capsule + boot box) sweeps across the dribble line at ground level. SLIDE: a sliding-tackle leg (a horizontal capsule
// along the turf + boot) arrives from the side. Both are ordinary BallWorld colliders: the ball's physics alone decides what happens.
const smoothPath = (t, t0, t1, a, b) => { const u = s5((t - t0) / (t1 - t0)); return a + (b - a) * u; };
export function makeFixture(def) {
  const id = def.id || def.type.toLowerCase();
  if (def.type === "SWEEP") {
    const { x, y0, y1, t0, t1 } = def, ys = (t) => smoothPath(t, t0, t1, y0, y1);
    return { id, def, colliders: [{ id: id + ":shin", p: [x, 0.30, y0], material: "body", shapes: [{ type: "capsule", r: 0.055, half: 0.17 }] }, { id: id + ":boot", p: [x, 0.06, y0], material: "boot", shapes: [{ type: "box", he: [0.13, 0.045, 0.05] }] }],
      pose: (cid, t) => ({ p: cid.endsWith("shin") ? [x, 0.30, ys(t)] : [x, 0.06, ys(t)], q: [0, 0, 0, 1] }),
      near: (t, b) => Math.hypot(b[0] - x, b[1] - ys(t)), viz: (t) => [{ p: [x, 0.30, ys(t)], r: 0.07 }, { p: [x, 0.18, ys(t)], r: 0.06 }, { p: [x, 0.06, ys(t)], r: 0.06 }, { p: [x + 0.08, 0.06, ys(t)], r: 0.05 }] };
  }
  if (def.type === "SLIDE") {
    const { x, y0, y1, t0, t1 } = def, ys = (t) => smoothPath(t, t0, t1, y0, y1), qy = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];   // capsule axis (local y) along pitch y (kernel z)
    return { id, def, colliders: [{ id: id + ":leg", p: [x, 0.09, y0], q: qy, material: "body", shapes: [{ type: "capsule", r: 0.075, half: 0.32 }] }, { id: id + ":boot", p: [x, 0.08, y0 + 0.45], material: "boot", shapes: [{ type: "box", he: [0.05, 0.05, 0.13] }] }],
      pose: (cid, t) => ({ p: cid.endsWith("leg") ? [x, 0.09, ys(t)] : [x, 0.08, ys(t) + 0.45], q: cid.endsWith("leg") ? qy : [0, 0, 0, 1] }),
      near: (t, b) => Math.hypot(b[0] - x, b[1] - (ys(t) + 0.2)), viz: (t) => [-0.3, -0.1, 0.1, 0.3, 0.45].map((d) => ({ p: [x, 0.09, ys(t) + d], r: 0.075 })) };
  }
  throw Error("unknown fixture " + def.type);
}
// ── the simulation ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export class DribbleSim {
  // cfg: { T1 (TURN1), E (RUN1_V13), M4, TURN11, skel, colliders (d1_colliders.json), ball (BALL_DEFAULT), arch ("B" | "A" | "C"), seed, player profile,
  //        scenario { init {v, heading, pos, foot}, cmds [{t, turn, v}], dur, ball {ahead, lateral, speed}, fixtures [...] }, opts {record, gate} }
  constructor(cfg) {
    this.cfg = cfg; const { T1, TURN11, skel } = cfg, scn = cfg.scenario;
    this.T1 = T1; this.E = cfg.E; this.arch = cfg.arch || "B"; this.pid = (cfg.player && cfg.player.player_id) || "p";
    this.prof = cfg.player; this.g = attrNorm(cfg.player); this.rng = new KeyedRNG(cfg.seed == null ? 20261016 : cfg.seed, true);
    this.pref = (cfg.player.preferred_foot || "R").toUpperCase()[0]; this.wf = cfg.player.weak_foot || 3;
    const init = Object.assign({}, scn.init, { turn12: true }); this.A = T1.t1Make(skel, init); if (TURN11) TURN11.attach(this.A, { mode: "t12" });
    this.J = cfg.colliders; this.hulls = localHulls(this.J);
    const B = cfg.ball || BALL_DEFAULT; this.ballCfg = B;
    // the ball starts ahead of the player (scenario): rolling-consistent spin for its speed
    const h0 = scn.init.heading || 0, f = [Math.cos(h0), Math.sin(h0)], r = [-Math.sin(h0), Math.cos(h0)], bs = scn.ball || {}, ah = bs.ahead != null ? bs.ahead : 1.0, lt = bs.lateral || 0, sp = bs.speed != null ? bs.speed : 0;
    const bx = scn.init.pos[0] + f[0] * ah + r[0] * lt, by = scn.init.pos[1] + f[1] * ah + r[1] * lt, bvk = [f[0] * sp, 0, f[1] * sp];
    this.fixtures = (scn.fixtures || []).map((fx) => makeFixture(fx));
    const cols = playerColliders(this.J, this.pid); for (const fx of this.fixtures) for (const c of fx.colliders) cols.push(c);
    this.W = new B.World(Object.assign({}, B.options, { p: [bx, R, by], v: bvk, w: [bvk[2] / R, 0, -bvk[0] / R], dt: DT, substeps: 1, parameters: B.parameters, colliders: cols }));
    this.Wp = new B.World(Object.assign({}, B.options, { p: [bx, R, by], v: [0, 0, 0], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] }));   // free-ball predictor (no colliders)
    this.k = 0; this.evIdx = 0; this.adjs = { R: {}, L: {} }; this.plan = null; this.lastTouch = null; this.touches = []; this.contacts = []; this.cancels = []; this.notes = [];
    this.locoCache = null; this.ballCache = null; this.held = null; this.ctrl = { state: "CONTROLLED", since: 0, changes: [] }; this.replanAt = 0; this.perceiveAt = 0; this.cpu = { loco: 0, ball: 0, plan: 0, predict: 0, solve: 0, commit: 0, n: 0 };
    this.rollTab = this.buildRollTable();
    this.input = this.intent(0); this.A.input = this.input;
    this.evalPose(this.A); this.framesPrev = boneFrames(this.A, this.A.fk); this.rec = cfg.opts && cfg.opts.record ? [] : null; this.record();
  }
  // ── gameplay intent: the scenario's raw input; a large direction change is held until a touch can take the ball through it (carrier rule) ────
  rawInput(t) { const scn = this.cfg.scenario; let dir = scn.init.heading || 0, v = scn.init.v; for (const c of scn.cmds || []) if (t >= c.t - 1e-12) { if (c.turn != null) dir = (scn.init.heading || 0) + clamp(c.turn, -179.5, 179.5) * DEG; if (c.v != null) v = c.v; } return { dir, v }; }
  intent(k) {
    const t = k * DT, raw0 = this.rawInput(t), A = this.A, opt = this.cfg.opts || {}, cr = this.carry;
    // CARRIER RECOVERY (gameplay): after an imperfect touch the player bends his run / changes pace toward where the free ball will actually be
    const raw = cr && k < cr.until && opt.recover !== false && Math.abs(wrapA(cr.raw - raw0.dir)) < 1e-6 ? { dir: raw0.dir + clamp(wrapA(cr.dir - raw0.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG), v: clamp(cr.v, raw0.v - D1.recover.slow, raw0.v + D1.recover.fast) } : raw0;
    if (opt.gate === false || !this.input) return raw;
    const cur = this.input, dA = Math.abs(wrapA(raw.dir - cur.dir));
    if (this.held && Math.abs(wrapA(this.held.raw.dir - raw.dir)) > 1e-9) this.held = null;   // the request changed again: re-evaluate
    if (dA * 180 / Math.PI <= D1.cutGate) { this.held = null; return raw; }
    if (!this.held) this.held = { raw, since: t, released: false };
    if (this.held.released || t - this.held.since >= D1.gateMax || this.ctrl.state !== "CONTROLLED") { this.held.released = true; return raw; }
    return { dir: cur.dir, v: raw.v, holding: raw };                                     // keep running on the line with the ball until the cut touch
  }
  // ── the pose: TURN-1.2's own pose, then (only while a touch adjustment acts on a swing foot) that leg re-solved with RUN-1.3's leg IK ──────────
  evalPose(A) {
    const T1 = this.T1, E = this.E, act = SIDES.filter((F) => this.adjActive(A, F));
    if (!act.length) { T1.t1Evaluate(A); A.d1adj = null; return; }                     // bit-identical to TURN-1.2 when no touch acts
    const saved = {}; for (const F of act) { const a = this.curAdj(A, F); if (a.warp) { saved[F] = A.legs[F].w; A.legs[F].w = warpAt(a.warp, clamp(A.legs[F].w || 0, 0, 1)); } }
    let pose; try { pose = T1.t1Pose(A); } finally { for (const F of Object.keys(saved)) A.legs[F].w = saved[F]; }   // TURN-1.2's own swing at w' (state untouched)
    const G = { body: A.body, p: pose.p }, fk0 = E.r1FK(G, pose, null, A.d1buf0); A.d1buf0 = fk0;
    A.d1adj = {};
    for (const F of act) A.d1adj[F] = this.applySwing(A, pose, fk0, F);
    const rootM = E.r1RootMatrix(A.P[0], A.P[1], A.psi, 0), fk = E.r1FK(G, pose, rootM, A.fkBuf); A.fkBuf = fk; A.pose = pose; A.fk = fk;
    const sk = A.body.skel; A.skinMats = A.skinMats || new Float32Array(16 * sk.bones.length); const M4 = this.cfg.M4; for (let i = 0; i < fk.world.length; i++) A.skinMats.set(M4.mul(fk.world[i], sk.invBind[i]), i * 16);
  }
  adjActive(A, F) { return !!this.curAdj(A, F); }
  // swing adjustments are kept PER SWING (a touch planned for a foot's next swing never replaces the one acting on its current swing)
  curAdj(A, F) { const L = A.legs[F]; return L.stance ? null : this.adjs[F][Math.round(L.tTO * 240)] || null; }
  getAdj(F, swing) { return this.adjs[F][swing] || null; }
  setAdj(F, a) { const m = this.adjs[F], L = this.A.legs[F], cur = L.stance ? null : Math.round(L.tTO * 240); m[a.swing] = a;
    for (const key of Object.keys(m)) if (+key !== a.swing && +key !== cur && +key < a.swing) delete m[key];
    (this.adjLog = this.adjLog || []).push({ k: this.k, F, swing: a.swing, kind: a.avoid ? "avoid" : a.dropped ? "drop" : "touch", ws: a.ws, warp: !!a.warp }); }
  adjAt(a, w) {                                                                        // the applied offset / rotation vector at swing fraction w
    if (w <= a.wc) { const u = a.wc > a.ws + 1e-6 ? s5((w - a.ws) / (a.wc - a.ws)) : 1; return { o: V.lerp(a.oBase, a.o, u), r: V.lerp(a.rBase, a.r, u), yaw: lerp(a.yawBase, a.yaw, u), u }; }
    const u = s5((1 - w) / Math.max(1e-6, 1 - a.wc)); return { o: V.sc(a.o, u), r: V.sc(a.r, u), yaw: a.yaw * u, u };
  }
  applySwing(A, pose, fk0, F) {
    const E = this.E, R3 = E.R3, b = A.body, a = this.curAdj(A, F), L = A.legs[F], w = clamp(L.w || 0, 0, 1), sg = F === "R" ? 1 : -1, ix = b.idx;
    const q = this.adjAt(a, w), Rr = rootR(A.psi), RrT = M.tr(Rr);
    let oW = q.o.slice(); const Rw = M.exp(q.r);
    // FOLLOW-THROUGH HOLD: after the touch the boot does not run ahead of its contact posture (relative to the body) — it rejoins its own path as
    // TURN-1.2's retraction brings it back; released over the last 5 % of the swing so the touchdown (plant) is TURN-1.2's
    if (a.hold != null && w > a.wc) { const fz = M.v(RrT, oW)[2] + fk0.P[ix["foot_" + F]][2], lim = a.hold, rel = 1 - s5((w - D1.hold.from) / D1.hold.span);
      if (fz > lim && rel > 0) oW = V.sub(oW, V.sc(M.v(Rr, [0, 0, 1]), Math.min(fz - lim, D1.hold.max) * rel)); }
    const Rp = pose.rot.pelvis, hip = V.add(pose.pelvisPos, R3.v(Rp, [sg * b.hipX, 0, 0]));
    const ank0 = fk0.P[ix["foot_" + F]], Rf0 = fk0.R[ix["foot_" + F]], RwL = M.mul(RrT, M.mul(Rw, Rr)), Rf = M.mul(RwL, Rf0);
    // ground: the adjusted boot's lowest hull point (world) never below the stud plane (soft floor; never active at a validated contact)
    const pts = this.J.sides[F].boot.points, toePts = this.J.sides[F].toe.points, ankW0 = V.add(M.v(Rr, ank0), [A.P[0], 0, -A.P[1]]), RfW = M.mul(Rr, Rf);
    let low = Infinity; for (const p of pts) low = Math.min(low, M.v(RfW, p)[1]);
    const toeRoot = M.mul(Rf, M.tr(Rf0)), toeRw = M.mul(Rr, M.mul(toeRoot, fk0.R[ix["toe_" + F]])), toeP = V.add(M.v(Rr, V.add(ank0, M.v(toeRoot, V.sub(fk0.P[ix["toe_" + F]], ank0)))), [A.P[0], 0, -A.P[1]]);
    for (const p of toePts) low = Math.min(low, V.add(toeP, M.v(toeRw, p))[1] - ankW0[1]);
    const floor = D1.floor - (ankW0[1] + oW[1] + low); if (floor > 0) oW[1] += floor;
    let ank = V.add(ank0, M.v(RrT, oW));
    // the leg's reach: never asked beyond RUN-1.3's IK reach (a validated contact is inside it); elsewhere the offset is scaled back
    const tl = b.thigh + b.shank, dv = V.sub(ank, hip), dl = V.len(dv), lim = D1.reach.ik * tl;
    if (dl > lim) ank = V.add(hip, V.sc(dv, lim / dl));
    let psi = pose.legs[F].psi * DEG + q.yaw; psi = sg > 0 ? clamp(psi, D1.hipRot[0] * DEG, D1.hipRot[1] * DEG) : clamp(psi, -D1.hipRot[1] * DEG, -D1.hipRot[0] * DEG);   // the region's yaw is carried by the hip
    const ik = E.r1LegIK(b, Rp, psi, hip, ank), Rshin = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rshin), Rf));
    pose.rot["thigh_" + F] = ik.Rthigh; pose.rot["shin_" + F] = ik.Rshin; pose.rot["foot_" + F] = R3.yxz(fl[0], fl[1], fl[2]);
    return { w, u: q.u, o: oW, r: q.r, floor: Math.max(0, floor), reach: ik.reach };
  }
  // ── the fixed 240 Hz step ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step() {
    const k = this.k, A = this.A, T1 = this.T1, c0 = now();
    this.input = this.intent(k);
    const c1 = now(); this.resolve(k); const c2 = now();
    T1.t1Step(A, this.input); this.evalPose(A);
    const fr = boneFrames(A, A.fk); this.setColliders(this.framesPrev, fr, k); this.framesPrev = fr;
    for (const fx of this.fixtures) this.fixtureFrames(fx, k);
    const c3 = now(); this.W.step(); const c4 = now();
    this.post(k);
    this.k++; this.cpu.loco += (c3 - c2) + (c1 - c0); this.cpu.ball += c4 - c3; this.cpu.plan += c2 - c1; this.cpu.n++;
    this.record();
  }
  run(until) { const n = Math.round((until != null ? until : this.cfg.scenario.dur) / DT); while (this.k < n) this.step(); return this; }
  setColliders(f0, f1, k) {
    for (const S of SIDES) for (const part of PARTS) {
      const bn = part === "boot" ? "foot" : part, a = f0[bn + "_" + S], b = f1[bn + "_" + S], k0 = k === 0 ? 0 : 1, v = V.sc(V.sub(b.p, a.p), k0 / DT), w = V.sc(M.log(M.mul(b.R, M.tr(a.R))), k0 / DT);   // tick 0: TURN-1.2 initialises its swing
      const id = part + "_" + S, pv = (this.prevColV = this.prevColV || {})[id]; this.prevColV[id] = v;   // diagnostic: a pose discontinuity = an implausible velocity STEP
      if (k > 1 && pv && (part === "boot" || part === "toe") && V.len(V.sub(v, pv)) > 10) (this.jumps = this.jumps || []).push({ k, part: id, v: +V.len(v).toFixed(1), dv: +V.len(V.sub(v, pv)).toFixed(1), w: +V.len(w).toFixed(1) });
      this.W.setColliderFrame(`${this.pid}:${part}_${S}`, { p: K(a.p), q: KQ(M.quat(a.R)), v: K(v), w: KW(w) });
    }
  }
  fixtureFrames(fx, k) { const t = k * DT, t1 = (k + 1) * DT; for (const c of fx.colliders) { const a = fx.pose(c.id, t), b = fx.pose(c.id, t1); this.W.setColliderFrame(c.id, { p: a.p, q: a.q, v: V.sc(V.sub(b.p, a.p), 1 / DT), w: a.w || [0, 0, 0] }); } }
  ballA() { const b = this.W.ball; return { p: K(b.p), v: K(b.v), w: KW(b.w), mode: b.mode }; }   // the ball in the anim3d frame (read-only view)
  // ── events after the ball step: launches, cancellations, physical contacts (classification only — nothing is corrected) ───────────────────────
  post(k) {
    const ev = this.W.events;
    for (; this.evIdx < ev.length; this.evIdx++) {
      const e = ev[this.evIdx];
      if (e.kind === "AUTHORITATIVE_LAUNCH") { const T = this.touches.find((x) => x.id === e.id); if (T) { T.launched = true; T.post = { v: K(e.velocity), w: KW(e.spin) }; T.speed = Math.hypot(e.velocity[0], e.velocity[2]); } this.lastTouch = T || this.lastTouch; this.ballCache = null; this.replanAt = k + 1; this.recoverAt = k + 1; this.clearDirty = true; }
      else if (e.kind === "LAUNCH_CANCELLED") { this.cancels.push({ k, t: k * DT, id: e.id, reason: e.reason, collider: e.collider || null }); const T = this.touches.find((x) => x.id === e.id); if (T) T.cancelled = e.reason; this.plan = null; this.replanAt = k + 1; }
      else if (e.kind === "PHYSICAL_CONTACT" && e.collider !== "turf") {
        const own = e.collider.startsWith(this.pid + ":"), part = e.collider.split(":")[1];
        const last = this.lastTouch, sinceLaunch = last && last.launched ? (k - last.k) * DT : 1e9;
        const c = { k, t: k * DT, collider: e.collider, own, part, impulse: Math.hypot(...e.impulse), vel: K(e.velocity), sinceLaunch, striking: !!(last && own && last.collider.endsWith(part)) };
        this.contacts.push(c); this.ballCache = null;
        if (last && own && this.arch === "A" && !last.post && k - last.k <= 3) { last.post = { v: c.vel, w: KW(e.spin) }; last.speed = Math.hypot(c.vel[0], c.vel[2]); }
        if (!own) { this.ctrl.contestedUntil = k + Math.round(0.3 / DT); this.plan = null; }
        this.perceiveAt = k + Math.round(this.reactTime() / DT); this.replanAt = Math.max(this.replanAt, this.perceiveAt);
      }
    }
    const T = this.lastTouch; if (T && T.launched && k - T.k <= 36 && k >= T.k) { const fr = this.framesPrev, b = this.ballA().p, F = T.F;
      const gb = gapTo(this.hulls["boot_" + F], fr["foot_" + F].p, fr["foot_" + F].R, b), gt = gapTo(this.hulls["toe_" + F], fr["toe_" + F].p, fr["toe_" + F].R, b);
      (T.follow = T.follow || []).push([k - T.k, +(gb * 1000).toFixed(1), +(gt * 1000).toFixed(1)]); }
    this.classify(k);
  }
  enRoute(k) { const T = this.lastTouch; if (!T || !T.launched || !T.expect || !T.expect.k || k > T.expect.k + 60) return false; return !this.contacts.some((c) => c.k > T.k + 2 && !c.striking); }
  reactTime() { return clamp(0.12 - 0.05 * this.g.reactions, 0.05, 0.2); }
  // ── control state: a gameplay CLASSIFICATION of the free ball (never a constraint) ───────────────────────────────────────────────────────────
  classify(k) {
    const A = this.A, b = this.ballA(), P = pitch2w(A.P[0], A.P[1], 0), d = Math.hypot(b.p[0] - P[0], b.p[2] - P[2]), s = Math.hypot(A.V[0], A.V[1]);
    const env = tab(D1.sepWant, s) + 1.6, opp = this.fixtures.some((fx) => fx.near && fx.near(k * DT, [b.p[0], -b.p[2]]) < 1.3);
    let st;
    if ((this.ctrl.contestedUntil && k < this.ctrl.contestedUntil) || opp) st = "CONTESTED";
    // CONTROLLED: a touch is planned, or the ball is on its way to the window its last touch aimed at (no contact since), or it is close and reachable
    else if (this.plan || this.enRoute(k) || (d < env && this.reachable)) st = "CONTROLLED";
    else st = "LOOSE";
    if (st !== this.ctrl.state) { this.ctrl.changes.push({ k, t: k * DT, from: this.ctrl.state, to: st, dist: d }); this.ctrl.state = st; this.ctrl.since = k; }
    this.ctrl.dist = d;
  }
  // ── the dribble resolver: plan / retarget / commit ───────────────────────────────────────────────────────────────────────────────────────────
  resolve(k) {
    if (this.recoverAt === k) { this.recovery(k); this.lastPursuit = k; }
    else if (!this.plan && this.lastTouch && this.lastTouch.launched && k - (this.lastPursuit || 0) >= D1.pursuitEvery && this.ctrl.dist < 8) { this.recovery(k); this.lastPursuit = k; }   // no plan: keep chasing
    this.resolveTouch(k);
    if (k % 4 === 0 || this.clearDirty) { this.clearDirty = false; this.clearance(k); }
  }
  resolveTouch(k) {
    const P = this.plan;
    if (P && P.kc === k) { this.commit(k, P); return; }
    if (P && P.kc < k) this.plan = null;
    // re-plan when due: no plan, a contact changed the ball (after the reaction time), or the input changed (locomotion prediction invalid)
    // a plan stays valid while its inputs are unchanged (same intent, same free ball); only an input change or a contact invalidates it
    const inputKey = this.inputKey(), stale = !this.locoCache || this.locoCache.key !== inputKey || (!P && this.locoCache.k0 + this.locoCache.n - (this.locoCache.need || 260) < k);
    if (k < this.perceiveAt) return;
    if (P && !stale && !this.ballChanged(P)) return;
    if (!P && k < this.replanAt) return;
    if (!P && this.lastTouch && this.lastTouch.launched && (k - this.lastTouch.k) * DT < 0.12) return;
    this.makePlan(k);
    this.replanAt = this.plan ? k : k + 6;                                              // no feasible touch: look again in 25 ms
  }
  // ── carrier recovery: compare the free ball's predicted path with the launch's target at the aimed window; the error becomes a small run bend and
  // pace change for the gameplay intent (the ball is never touched by this — the player adapts, then the next touch takes the ball where it is)
  recovery(k) {
    const T = this.lastTouch, prev = this.carry; this.carry = null; if (!T || !T.launched) return;
    // PURSUIT: where must the body be at the aimed window for that foot to meet the ball where it will ACTUALLY be (its free path, error included)?
    // Without an aimed window (a recovery touch, a deflection): the earliest point where the player, at his pace, catches the free ball.
    let kT = T.expect && T.expect.k > k + 24 ? T.expect.k : null;
    if (kT == null) { const pm = this.predictBall(k, 480), P0 = pitch2w(this.A.P[0], this.A.P[1], 0), vr = Math.max(2.0, this.rawInput(k * DT).v);
      for (let j = 36; j <= 480; j += 6) { const b = pm.get(k + j); if (!b) break; const bp = K(b.p); bp[1] = 0; if (V.len(V.sub(bp, P0)) - 0.6 <= vr * j * DT) { kT = k + j; break; } }
      if (kT == null) return; }
    const nT = kT - k, map = this.predictBall(k, nT + 2), bk = map.get(kT); if (!bk) return;
    const B = K(bk.p), vb = K(bk.v), hb = Math.hypot(vb[0], vb[2]) > 0.3 ? headingOf(vb) : this.A.psi, dc = clamp(T.contactAhead || 0.6, 0.35, 0.9);
    const goal = V.sub(B, V.sc(fwdW(hb), dc)), P = pitch2w(this.A.P[0], this.A.P[1], 0), d = V.sub(goal, P); d[1] = 0;
    const raw = this.rawInput(k * DT), dist = V.len(d), Tt = nT * DT, g = this.g, adapt = 0.75 + 0.25 * clamp(0.5 * g.reactions + 0.5 * g.agility, -1, 1);
    // straight to the goal point (TURN-1.2 resolves the bend as an arc); pace to arrive on time — scaled by how fully this player adapts
    const dir = raw.dir + adapt * clamp(wrapA(headingOf(d) - raw.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG), dvn = dist / Math.max(0.3, Tt) - raw.v, v = raw.v + adapt * clamp(Math.sign(dvn) * Math.max(0, Math.abs(dvn) - D1.recover.paceDead), -D1.recover.slow, D1.recover.fast);
    const q = (x, st) => Math.round(x / st) * st;
    this.carry = { raw: raw.dir, dir: q(dir, 0.5 * DEG), v: q(v, 0.1), until: kT + 120, k, goal, dist, Tt };
    (this.carryLog = this.carryLog || []).push({ k, dth: this.carry.dir - raw.dir, dv: this.carry.v - raw.v, ef: dist - raw.v * Tt, el: 0 });
  }
  // ── clearance: a swing that is NOT making a deliberate touch must not sweep through the free ball. Its predicted path (TURN-1.2 + its current
  // adjustment) is checked against the predicted free ball; if it would hit it, a bounded avoidance offset (zero at both swing ends: sideways away
  // from the ball, shorter, slightly higher) is applied. If even that cannot clear it, nothing is faked: the contact stays physical.
  clearance(k) {
    const LC = this.locoCache; if (!LC || LC.key !== this.inputKey()) return; const off = k - LC.k0, pred = LC.pred; if (off < 0 || off >= pred.length - 2) return;
    if (!this.ballCache || this.ballChangedCache()) { if (!this.ballCache || this.ballCache.k0 !== k) this.ballCache = { k0: k, n: Math.round(D1.horizon / DT), map: this.predictBall(k, Math.round(D1.horizon / DT)) }; }
    for (const F of SIDES) {
      const L = this.A.legs[F]; if (L.stance) continue; const swing = Math.round(L.tTO * 240), w0 = clamp(L.w || 0, 0, 1);
      if (this.plan && this.plan.F === F && this.plan.swing === swing) continue;          // this swing is the touch
      const a = this.getAdj(F, swing);
      if (a && a.kc >= k && !a.dropped && !a.avoid) continue;                             // a touch still to come is never overridden (after the touch: the boot withdraws if needed)
      // closest approach over the rest of this swing, with the adjustment currently in force
      let worst = null;
      for (let j = off + 1; j < pred.length - 1; j++) { const smp = pred[j], Lp = smp.legs[F]; if (Lp.stance || Lp.swing !== swing) break; if (!smp.bones) continue; const bk = this.ballCache.map.get(smp.k); if (!bk) break;
        const b = K(bk.p), foot = smp.bones["foot_" + F]; if (Math.hypot(b[0] - foot.p[0], b[2] - foot.p[2]) > 0.55) continue;
        const q = a ? this.adjAt(a, Lp.w) : { o: [0, 0, 0], r: [0, 0, 0] }, Rw = M.exp(q.r), ank = V.add(foot.p, q.o), toe = smp.bones["toe_" + F], toeP = V.add(ank, M.v(Rw, V.sub(toe.p, foot.p)));
        const gb = gapAtLeast(this.hulls["boot_" + F], ank, M.mul(Rw, foot.R), b, D1.clear.margin), gt = gapAtLeast(this.hulls["toe_" + F], toeP, M.mul(Rw, toe.R), b, D1.clear.margin), gmin = Math.min(gb, gt);
        if (!worst || gmin < worst.g) worst = { g: gmin, j, w: Lp.w, b, ank, smp }; }
      if (!worst || worst.g > D1.clear.margin) continue;
      if (a && a.avoid && worst.g > 0.004) continue;                                      // already avoiding and clear enough
      // away from the ball, in the player's heading frame: sideways to the foot's own side, back (a shorter step), a little up
      const th = worst.smp.psi, f = fwdW(th), r = rgtW(th), sg = F === "R" ? 1 : -1, d = V.sub(worst.ank, worst.b), dl = V.dot(d, r), need = D1.clear.margin + 0.012 - worst.g;
      const side = clamp(sg * Math.max(0.0, need * 1.2) * (Math.sign(dl) === sg || Math.abs(dl) < 0.02 ? 1 : 0.4), -D1.clear.lat, D1.clear.lat), back = -clamp(need * 0.9, 0, D1.clear.back), up = clamp(need * 0.5, 0, D1.clear.up);
      const prevO = a ? a.o : [0, 0, 0], o = V.add(prevO, V.add(V.add(V.sc(r, side), V.sc(f, back)), [0, up, 0]));
      const lim = (v, m) => clamp(v, -m, m), of = clamp(V.dot(o, f), -D1.clear.back, 0.02), ol = lim(V.dot(o, r), D1.clear.lat), ov = clamp(o[1], 0, D1.clear.up);
      const wcA = Math.min(0.97, Math.max(w0 + D1.clear.minSpan, Math.min(D1.clear.wcMax, worst.w))), tRemA = Math.max(0.0, (L.tTDf != null ? L.tTDf - this.A.t : 0.1)) * (1 - wcA) / Math.max(1e-3, 1 - w0);
      let o2 = V.add(V.add(V.sc(f, of), V.sc(r, ol)), [0, ov, 0]); const omax = D1.offRate * tRemA + 0.02; if (V.len(o2) > omax) o2 = V.sc(o2, omax / V.len(o2));
      const cur = a ? this.adjAt(a, w0) : { o: [0, 0, 0], r: [0, 0, 0], yaw: 0 };
      // the current rotation is kept (it then decays to touchdown with the offset): a withdrawal never snaps the foot's orientation
      this.setAdj(F, { swing, ws: w0, wc: wcA, o: o2, r: cur.r.slice(), yaw: cur.yaw || 0, oBase: cur.o, rBase: cur.r, yawBase: cur.yaw || 0, kc: -1, avoid: true, gap: worst.g, warp: a ? warpHome(a.warp, w0) : null });
      this.avoids = (this.avoids || 0) + 1; this.avoidLog = this.avoidLog || []; if (this.avoidLog.length < 400) this.avoidLog.push({ k, F, gap: worst.g, o: o2 });
    }
  }
  inputKey() { const i = this.input, h = this.held; return `${i.dir.toFixed(6)}|${i.v.toFixed(4)}|${h && !h.released ? h.raw.dir.toFixed(6) : "-"}`; }
  ballChanged(P) { const b = this.W.ball, q = P.ballAtK && P.ballAtK.get(this.k); return !q || Math.abs(q[0] - b.p[0]) + Math.abs(q[1] - b.p[1]) + Math.abs(q[2] - b.p[2]) > 1e-9; }
  // locomotion lookahead on a TURN-1.2 clone (input schedule: `inp` until tick kSwitch, then `inp2`); per tick COM / legs, per late-swing tick the boot
  predictLoco(k, inp, n, inp2, kSwitch) {
    const c0 = now(), T1 = this.T1, C = T1.t1Clone(this.A), out = []; C.input = inp;
    for (let j = 1; j <= n; j++) {
      const ki = k + j, ii = inp2 && ki - 1 >= kSwitch ? inp2 : inp; T1.t1Step(C, ii);
      const smp = { k: ki, P: C.P.slice(), V: C.V.slice(), psi: C.psi, legs: {} };
      for (const F of SIDES) { const L = C.legs[F]; smp.legs[F] = L.stance ? { stance: true, tTD: L.tTD, plant: L.plant.pos.slice() } : { stance: false, w: clamp(L.w || 0, 0, 1), swing: Math.round(L.tTO * 240), tTDf: L.tTDf, tgt: L.tgt ? L.tgt.slice() : null }; }
      const need = SIDES.some((F) => !C.legs[F].stance && (C.legs[F].w || 0) >= D1.wLo - 0.08 && (C.legs[F].w || 0) <= 0.995);
      if (need) { const ev = T1.t1Evaluate(C); smp.bones = boneFrames(C, ev.fk); smp.pose = { pelvisPos: ev.pose.pelvisPos.slice(), Rp: ev.pose.rot.pelvis.slice(), psiR: ev.pose.legs.R.psi, psiL: ev.pose.legs.L.psi }; }
      smp.man = C.man ? C.man.kind : null; out.push(smp);
    }
    this.cpu.predict += now() - c0; return out;
  }
  predictBall(k, n) {                                                                  // the free ball (no colliders) from the actual state: exact while untouched
    const W = this.W, Wp = this.Wp; Wp.ball = structuredClone(W.ball); Wp.tick = W.tick; Wp.time = W.time; Wp.restTime = W.restTime; Wp.events = []; Wp.actions = []; Wp.guards = []; Wp.actionIds = new Set();
    const out = new Map(); out.set(k, { p: W.ball.p.slice(), v: W.ball.v.slice() });
    for (let j = 1; j <= n; j++) { Wp.step(); out.set(k + j, { p: Wp.ball.p.slice(), v: Wp.ball.v.slice(), mode: Wp.ball.mode }); }
    return out;
  }
  // the exact free ball after a launch (BallWorld, no colliders): anim3d position / velocity at each of the next n ticks
  simLaunch(p0, v0, n) {
    const B = this.ballCfg, vk = K(v0), Wq = this.Wq || (this.Wq = new B.World(Object.assign({}, B.options, { p: [0, R, 0], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] })));
    Wq.ball = { p: K(p0), v: vk, w: [vk[2] / R, 0, -vk[0] / R], q: [0, 0, 0, 1], mode: "AIRBORNE", slip: 0, sleeping: false }; Wq.tick = 0; Wq.time = 0; Wq.restTime = 0; Wq.events = []; Wq.actions = []; Wq.guards = []; Wq.actionIds = new Set();
    const out = []; for (let i = 0; i < n; i++) { Wq.step(); out.push({ p: K(Wq.ball.p), v: K(Wq.ball.v) }); } return out;
  }
  // free-roll reference (rolling launch, no lift): distance / speed per tick from 30 m/s down to rest — the launch solver's initial guess
  buildRollTable() {
    const B = this.ballCfg, W = new B.World(Object.assign({}, B.options, { p: [0, R, 0], v: [30, 0, 0], w: [0, 0, -30 / R], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] })), X = [0], S = [30];
    for (let i = 0; i < 240 * 20; i++) { W.step(); X.push(W.ball.p[0]); S.push(Math.hypot(W.ball.v[0], W.ball.v[2])); if (W.ball.sleeping) break; }
    return { X, S };
  }
  rollDist(s0, n) {                                                                    // ≈ distance a rolling launch at s0 covers in n ticks (+ speed then)
    const { X, S } = this.rollTab; let lo = 0, hi = S.length - 1; if (s0 >= S[0]) lo = hi = 0; else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] > s0) lo = m; else hi = m; } }
    const f = S[lo] > S[hi] ? (S[lo] - s0) / (S[lo] - S[hi]) : 0, i0 = lo + f, at = (x) => { const i = Math.floor(x), u = x - i; if (i >= X.length - 1) return [X[X.length - 1], 0]; return [X[i] + (X[i + 1] - X[i]) * u, S[i] + (S[i + 1] - S[i]) * u]; };
    const a = at(i0), b = at(i0 + n); return { d: b[0] - a[0], v: b[1] };
  }
  wantSep(s) { return tab(D1.sepWant, s) * (1 - 0.12 * clamp(0.5 * this.g.dribbling + 0.5 * this.g.ball_control, -1, 1)); }
  // the region rotation and support point alone (no reach / ground checks): used to aim the next touch
  regionPose(smp, F, regName, nL, elev) {
    const ce = Math.cos(elev), se = Math.sin(elev), n = [nL[0] * ce, se, nL[2] * ce], reg = D1.regions[regName], sgx = F === "R" ? 1 : -1, foot = smp.bones["foot_" + F], toe = smp.bones["toe_" + F];
    const dLoc = [reg.d[0] * sgx, reg.d[1], reg.d[2]], R0 = reg.hull === "toe" ? toe.R : foot.R, a = M.v(R0, dLoc), yaw = wrapA(Math.atan2(n[0], n[2]) - Math.atan2(a[0], a[2])), Ry = M.y(yaw), a1 = M.v(Ry, a);
    const pitch = Math.atan2(n[1], Math.hypot(n[0], n[2])) - Math.atan2(a1[1], Math.hypot(a1[0], a1[2])), ax = V.norm(V.cross([n[0], 0, n[2]], [0, 1, 0])), Rw = M.mul(M.exp(V.sc(ax, pitch)), Ry);
    const ank = foot.p, Rh = M.mul(Rw, reg.hull === "toe" ? toe.R : foot.R), oh = reg.hull === "toe" ? V.add(ank, M.v(Rw, V.sub(toe.p, ank))) : ank, pts = this.J.sides[F][reg.hull].points;
    let best = -Infinity, cl = null; for (const p of pts) { const q = M.v(Rh, p), s = V.dot(q, n); if (s > best) { best = s; cl = q; } }
    return { n, yaw, pitch, Rw, cW: V.add(oh, cl) };
  }
  // ── candidate contact geometry: region rotation (yaw + pitch), support point, offset, bounds, ground, reach, closing, toe clearance ─────────────
  contactGeom(smp, F, regName, nL, ball, vBall, elev = 0) {
    const ce = Math.cos(elev), se = Math.sin(elev), n = [nL[0] * ce, se, nL[2] * ce];   // the contact normal: the launch direction tilted up (contact below the equator)
    const reg = D1.regions[regName], sgx = F === "R" ? 1 : -1, bn = smp.bones, foot = bn["foot_" + F], toe = bn["toe_" + F];
    const dLoc = [reg.d[0] * sgx, reg.d[1], reg.d[2]], hullName = reg.hull, HB = this.hulls["boot_" + F], HT = this.hulls["toe_" + F];
    // region direction now (world), required yaw (about up) and pitch (about the horizontal axis ⟂ n) to face n
    const R0 = hullName === "toe" ? toe.R : foot.R, a = M.v(R0, dLoc), hA = Math.atan2(a[0], a[2]), hN = Math.atan2(n[0], n[2]);
    let yaw = wrapA(hN - hA); const ya = this.reachK();
    const rj = this.rej; if (Math.abs(yaw) > reg.yawMax * DEG * (0.9 + 0.1 * ya)) { if (rj) rj.yaw = (rj.yaw || 0) + 1; return null; }
    const Ry = M.y(yaw), a1 = M.v(Ry, a), elA = Math.atan2(a1[1], Math.hypot(a1[0], a1[2])), elN = Math.atan2(n[1], Math.hypot(n[0], n[2])), pitch = elN - elA;
    if (Math.abs(pitch) > reg.pitchMax * DEG) { if (rj) rj.pitch = (rj.pitch || 0) + 1; return null; }
    const ax = V.norm(V.cross([n[0], 0, n[2]], [0, 1, 0])), Rw = M.mul(M.exp(V.sc(ax, pitch)), Ry), rv = M.log(Rw);   // + pitch raises the region toward + elevation
    // rotated hull about the ankle (the toe follows the foot rigidly), support point in direction n
    const ank = foot.p, RF = M.mul(Rw, foot.R), toeP = V.add(ank, M.v(Rw, V.sub(toe.p, ank))), RT = M.mul(Rw, toe.R);
    const pts = hullName === "toe" ? this.J.sides[F].toe.points : this.J.sides[F].boot.points, Rh = hullName === "toe" ? RT : RF, oh = hullName === "toe" ? toeP : ank;
    let best = -Infinity, cl = null; for (const p of pts) { const q = M.v(Rh, p), s = V.dot(q, n); if (s > best) { best = s; cl = q; } }
    const cW = V.add(oh, cl), target = V.sub(ball, V.sc(n, R + D1.gap0)), o = V.sub(target, cW);
    // bounds in the player's heading frame
    const th = smp.psi, f = fwdW(th), r = rgtW(th), of = V.dot(o, f), ol = V.dot(o, r), ov = o[1], rk = this.reachK();
    if (rj) { rj.samples = rj.samples || []; if (rj.samples.length < 400) rj.samples.push([smp.k, F, regName, +of.toFixed(3), +ol.toFixed(3), +ov.toFixed(3)]); }
    if (of > D1.reach.ahead * rk || of < -D1.reach.back * rk) { if (rj) rj.fwd = (rj.fwd || 0) + 1; return null; }
    const tRem = smp.legs[F].tTDf != null ? Math.max(0, smp.legs[F].tTDf - smp.k * DT) : 0.05; if (V.len(rv) > D1.rotRate * tRem + 0.12) { if (rj) rj.unwind = (rj.unwind || 0) + 1; return null; }
    if (V.len(o) > D1.offRate * tRem + 0.04) { if (rj) rj.unwindO = (rj.unwindO || 0) + 1; return null; }   // the offset must unwind to the plant at a plausible foot speed
    if (Math.abs(ol) > D1.reach.lat * rk) { if (rj) rj.lat = (rj.lat || 0) + 1; return null; }
    if (ov > D1.reach.up || ov < -D1.reach.down) { if (rj) rj.vert = (rj.vert || 0) + 1; return null; }
    // ground: the moved hulls above the studs' plane
    let low = Infinity; for (const p of this.J.sides[F].boot.points) low = Math.min(low, ank[1] + o[1] + M.v(RF, p)[1]); for (const p of this.J.sides[F].toe.points) low = Math.min(low, toeP[1] + o[1] + M.v(RT, p)[1]);
    if (low < D1.floor) { if (rj) rj.ground = (rj.ground || 0) + 1; return null; }
    // reach of the leg to the moved ankle
    const hip = bn["thigh_" + F].p, tl = this.A.body.thigh + this.A.body.shank, reach = V.len(V.sub(V.add(ank, o), hip)) / tl; if (reach > D1.reach.ik) { if (rj) rj.ik = (rj.ik || 0) + 1; return null; }
    // the other hull of the same boot must not touch the ball (the kernel would call the launch contested)
    const other = hullName === "toe" ? gapAtLeast(HB, V.add(ank, o), RF, ball, 0.002) : gapAtLeast(HT, V.add(toeP, o), RT, ball, 0.002);
    if (other < 0.002) { if (rj) rj.other = (rj.other || 0) + 1; return null; }
    const gap = D1.gap0;                                                                // by construction (support point + normal); the commit measures it exactly
    return { F, reg: regName, hull: hullName, o, of, ol, ov, yaw, pitch, rv, Rw, cW: V.add(cW, o), gap, other, reach, low, ank, nc: n, elev };
  }
  elevs() { return this.arch !== "A" ? D1.elevs : D1.elevsPhys; }   // a physical push (A / C) lifts the ball along the contact normal: meet it near the equator
  reachK() { return 1 + 0.25 * clamp(this.g.agility, -1, 1); }
  bootVel(pred, j, F, cLocal) {                                                        // world velocity of a boot-fixed point between samples j and j+1
    const a = pred[j].bones, b = pred[j + 1] && pred[j + 1].bones; if (!a || !b) return null;
    const fa = a["foot_" + F], fb = b["foot_" + F], la = M.v(M.tr(fa.R), V.sub(cLocal, fa.p)), pb = V.add(fb.p, M.v(fb.R, la)); return V.sc(V.sub(pb, cLocal), 1 / DT);
  }
  // the next-window target: where the ball centre should be when a future swing reaches its contact phase (the centre of that window's envelope)
  // Every future swing offers a RANGE of contact phases: the forward extension (the push, the boot faster than the body) through the retraction
  // (slow). Each phase is a candidate target: the ball centre just ahead of the toe tip at that tick, with that phase's boot speed.
  windowTargets(pred, jFrom, jTo, s) {
    const out = [];
    const rj = this.rej; this.rej = null;                                               // the envelope probes are not planning rejections
    for (let j = jFrom; j < Math.min(jTo, pred.length - 1); j += 3) for (const F of SIDES) {
      const L = pred[j].legs[F]; if (L.stance || L.w < D1.wTarget[0] || L.w > D1.wTarget[1]) continue;
      const th = headingOf([pred[j].V[0], 0, -pred[j].V[1]]), dir = fwdW(Math.hypot(pred[j].V[0], pred[j].V[1]) > 0.3 ? th : pred[j].psi), rgt = rgtW(th);
      // the foot may meet the ball at this tick on an EARLIER phase of its own path (the time-warp): each candidate path phase gives a target — the
      // CENTRE of that pose's feasible envelope (probed with the real contact check) — and the boot speed available there (the warp only slows it)
      for (let d = 0; d <= D1.warp.maxBack; d += 12) {
        const jp = j - d, sp = pred[jp]; if (!sp || !sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) break;
        const gs = { bones: sp.bones, psi: pred[j].psi, legs: pred[j].legs, k: pred[j].k, P: pred[j].P };
        const foot = sp.bones["foot_" + F], com = pitch2w(pred[j].P[0], pred[j].P[1], R), lat = V.dot(V.sub(foot.p, com), rgt) * 0.8, base = V.add(com, V.sc(rgt, lat));
        let lo = null, hi = null, cW = null;
        for (let fx = 0.2; fx <= 1.0; fx += 0.05) { const ball = V.add(base, V.sc(dir, fx)); let ok = null;
          for (const reg of D1.targetRegions) { for (const e of [10, 20, 30]) { ok = this.contactGeom(gs, F, reg, dir, ball, [0, 0, 0], e * DEG); if (ok) break; } if (ok) break; }
          if (ok) { if (lo == null) lo = fx; hi = fx; if (!cW || Math.abs(fx - (lo + hi) / 2) < 0.03) cW = ok.cW; } }
        if (lo == null) continue;
        const mid = (lo + hi) / 2, q = V.add(base, V.sc(dir, mid)); q[1] = R;
        out.push({ j, k: pred[j].k, F, swing: L.swing, w: L.w, wp: sp.legs[F].w, q, span: hi - lo, vBoot: this.bootVel(pred, jp, F, cW), com: pitch2w(pred[j].P[0], pred[j].P[1], 0), dir, warped: d > 0 });
      }
    }
    this.rej = rj; return out;
  }
  // ── make a plan: the best feasible contact in the predicted locomotion for the actual (free) ball, then its launch ─────────────────────────────
  makePlan(k) {
    const c0 = now(), A = this.A, s = Math.hypot(A.V[0], A.V[1]), held = this.held && !this.held.released ? this.held.raw : null;
    // lookahead: the contact search (1.6 s) + the longest interval to the next touch at this speed + margin; refreshed before the tail is needed
    const H = Math.round((1.6 + tab(D1.maxInterval, Math.max(s, A.input.v)) + 0.5) / DT), need = Math.round((1.0 + tab(D1.maxInterval, Math.max(s, A.input.v))) / DT);
    const key = this.inputKey();
    if (!this.locoCache || this.locoCache.key !== key || this.locoCache.k0 + this.locoCache.n - need < k) this.locoCache = { key, k0: k, n: H, need, pred: this.predictLoco(k, this.input, H), alt: null };   // (release-NOW was tried and rejected: re-planned swings run into the placed ball)
    const LC = this.locoCache, off = k - LC.k0;
    if (!this.ballCache || this.ballChangedCache() || this.ballCache.k0 + this.ballCache.n - need < k) this.ballCache = { k0: k, n: H, map: this.predictBall(k, H) };
    // candidate contacts: the current motion; while a cut is held, also the motion with the cut released NOW (take the ball through the turn)
    const opts = [{ pred: LC.pred, off, release: false }]; if (LC.alt) opts.push({ pred: LC.alt, off, release: true });
    const cands = [], rj = (key) => { if (this.rej) this.rej[key] = (this.rej[key] || 0) + 1; };
    for (const O of opts) {
      const pred = O.pred, minJ = Math.max(O.off, 0), horizonJ = Math.min(pred.length - 2, O.off + Math.round(1.6 / DT));
      for (let j = minJ; j < horizonJ; j += D1.planStep) {
        const smp = pred[j]; const bk = this.ballCache.map.get(smp.k); if (!bk) continue; const ball = K(bk.p), vBall = K(bk.v);
        for (const F of SIDES) {
          const L = smp.legs[F]; if (L.stance || L.w < D1.wLo || L.w > D1.wHi) continue;
          if (this.lastTouch && this.lastTouch.launched && this.lastTouch.F === F && this.lastTouch.swing === L.swing) continue;   // one deliberate touch per swing
          if (this.lastTouch && this.lastTouch.launched && (smp.k - this.lastTouch.k) * DT < this.minInterval(s)) continue;   // no rapid fire
          const n = this.aimDir(O.pred, j, ball, s, O.release);
          // the foot meets the ball where its OWN swing path passes it: path phase jp ≤ j (the time-warp holds the foot back and sets its speed)
          for (let d = 0; d <= D1.warp.maxBack; d += D1.warp.step) {
            const jp = j - d; if (jp < O.off) break; const sp = pred[jp]; if (!sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) break;
            const wp = sp.legs[F].w, foot = sp.bones["foot_" + F], toe = sp.bones["toe_" + F]; if (Math.hypot(ball[0] - foot.p[0], ball[2] - foot.p[2]) > 0.6) { rj("far"); continue; }
            if (Math.hypot(ball[0] - toe.p[0], ball[1] - toe.p[1], ball[2] - toe.p[2]) > 0.5) { rj("far2"); continue; }   // the boot can reach at most ~0.5 m with the bounds
            const gs = { bones: sp.bones, psi: smp.psi, legs: smp.legs, k: smp.k, P: smp.P };
            for (const reg of Object.keys(D1.regions)) for (const e of this.elevs()) {
              const g = this.contactGeom(gs, F, reg, n, ball, vBall, e * DEG); if (!g) continue;
              const vPath = this.bootVel(pred, jp, F, g.cW); if (!vPath) continue;
              const pn = V.dot(vPath, g.nc), bn = V.dot(vBall, g.nc), rho = pn > 0.2 ? clamp((bn + D1.closeWant) / pn, D1.warp.rhoMin, 1) : 1, vb = V.sc(vPath, rho);
              const close = V.dot(V.sub(vb, vBall), g.nc); if (close < D1.closeMin) { rj("close"); continue; }
              if (V.dot(vb, g.nc) > this.launchMax(s) * Math.cos(g.elev) - D1.sepMin) { rj("bootFast"); continue; }   // still a kick: the ball could not leave this boot
              const wk = d === 0 && rho > 0.999 ? (this.warpNow(F, L.swing) && this.getAdj(F, L.swing) && this.getAdj(F, L.swing).warp ? this.warpFor(F, L.swing, L.w, wp, rho) : null) : this.warpFor(F, L.swing, L.w, wp, rho);
              if (wk === undefined) { rj("warp"); continue; }
              if (!this.approachClear(pred, j, F, g, O.off, wk)) { rj("early"); continue; }
              rj("ok");
              const cost = this.cost(g, F, reg, smp, close, s, n, O.release) + D1.warp.costLag * (L.w - wp) + D1.warp.costSlow * (1 - rho);
              cands.push({ ...g, j, jp, smp, gs, n, vb, close, cost, ballK: bk, pred, release: O.release, off: O.off, warp: wk, rho, wp });
            }
          }
        }
      }
    }
    this.reachable = cands.length > 0;
    const fail = () => { if (this.plan) this.dropAdj(this.plan.F, this.plan.swing); this.plan = null; this.cpu.plan += now() - c0; };
    if (!cands.length) { fail(); return; }
    // the ranked candidates: the first whose launch solves and whose refined contact passes every check becomes the plan
    cands.sort((a, b) => a.cost - b.cost);
    let best = null, L = null, g2 = null, vb2 = null, closeN = 0, recov = null, nValid = 0; const tried = new Set(), deadF = new Set();
    for (const c0c of cands) {
      const tk = c0c.F + c0c.smp.k + ":" + c0c.jp; if (tried.has(tk)) continue; const fk = c0c.F + c0c.smp.legs[c0c.F].swing + c0c.reg + Math.round(c0c.wp * 20);
      if (deadF.has(fk)) continue; tried.add(tk); if (tried.size > D1.planTries) break;
      // a HELD cut: a touch in the current motion releases the cut at its contact tick — its follow-through and launch are judged in that motion
      const c = held && !c0c.release ? this.switchCand(c0c, k, held) : c0c; if (!c) { rj("cutGeom"); continue; }
      // (A has no authoritative launch: whatever the boot does after the first contact is just more physics — no follow-through floor)
      const sF = this.arch === "A" ? 0 : this.followMinSpeed(c, s); if (sF == null) { rj("followMin"); deadF.add(fk); continue; }
      if (sF > this.launchMax(s) * Math.cos(c.elev)) { rj("followHigh"); if (!recov) recov = { c, sF }; continue; }   // only a too-firm touch would clear the follow-through
      // A / C: the launch can only be what a boot moving at most at its path speed delivers ((1 + e) v_boot − e v_ball along the normal)
      const vPathC = this.bootVel(c.pred, c.jp, c.F, c.cW), sMaxP = this.arch !== "A" ? Infinity : (1.48 * D1.warp.rhoMaxPhys * Math.max(0, V.dot(vPathC, c.nc)) - 0.48 * V.dot(K(c.ballK.v), c.nc)) / Math.max(0.5, Math.cos(c.elev));
      if (sMaxP < sF) { rj("physMax"); continue; }
      const Lc = this.solveLaunch(c, s, sF, sMaxP); if (this.dbgCut && c.release) console.log(`  cand ${c.F} k${c.smp.k} ${c.reg} e${(c.elev / DEG).toFixed(0)} n ${(headingOf(c.n) / DEG).toFixed(0)}° sF ${sF.toFixed(2)} -> ${Lc ? "speed " + Lc.speed.toFixed(2) + " next " + Lc.F2 + "@" + (Lc.kNext * DT).toFixed(2) : "null " + JSON.stringify(this._lastSolve || null)}`);
      if (!Lc) { rj("solve"); if (!recov) recov = { c, sF }; continue; }
      let g = this.contactGeom(c.gs, c.F, c.reg, Lc.n, K(c.ballK.p), K(c.ballK.v), c.elev);
      if (!g) { for (const reg of Object.keys(D1.regions)) for (const e of this.elevs()) { const q = this.contactGeom(c.gs, c.F, reg, Lc.n, K(c.ballK.p), K(c.ballK.v), e * DEG); if (q) { q.cost = this.cost(q, c.F, reg, c.smp, c.close, s, Lc.n, c.release); if (!g || q.cost < g.cost) g = q; } } }
      if (!g) { rj("refine"); continue; }
      let vb = V.sc(this.bootVel(c.pred, c.jp, c.F, g.cW), c.rho), cl = V.dot(V.sub(vb, K(c.ballK.v)), g.nc), vL = this.launchVec(Lc, g);
      if (this.arch === "A") {
        // PURE PHYSICAL: no launch is scheduled — the kernel's own boot impulse (kinematic boot, e = boot material) decides. The planner may only shape
        // the swing: the warp slope sets the boot's normal speed so that (1 + e) v_boot − e v_ball ≈ the wanted normal speed of the ball
        const e = 0.48, vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), pn = V.dot(vPath, g.nc), bn = V.dot(K(c.ballK.v), g.nc), want = V.dot(vL, g.nc), need = (want + e * bn) / (1 + e), rhoA = pn > 0.2 ? need / pn : 9;
        if (rhoA < D1.warp.rhoMin || rhoA > D1.warp.rhoMaxPhys) { rj("physSpeed"); continue; }   // A may also speed the foot up into the push
        const wkA = this.warpFor(c.F, c.smp.legs[c.F].swing, c.smp.legs[c.F].w, c.wp, rhoA); if (!wkA) { rj("physWarp"); continue; }
        c.warp = wkA; c.rho = rhoA; vb = V.sc(vPath, rhoA); cl = V.dot(V.sub(vb, K(c.ballK.v)), g.nc);
        if (cl < D1.closeMin) { rj("physClose"); continue; }
      } else if (cl < D1.closeMin || V.dot(V.sub(vL, vb), g.nc) < D1.sepMin) { rj("sep"); continue; }
      if (this.arch !== "A" && !this.followClear(c.pred, c.j, c.F, g, Lc, K(c.ballK.p), c.warp, c.gs)) { rj("follow"); continue; }
      if (!this.approachClear(c.pred, c.j, c.F, g, c.off, c.warp)) { rj("early2"); continue; }
      // a valid plan: keep the best few by contact cost + how far its launch strays from the speed's dribble character (no needlessly firm touch)
      const tot = c.cost + D1.sepCostK * Math.pow((Lc.maxSep - Lc.want) / Math.max(0.3, Lc.want), 2);
      if (!best || tot < best.tot) { best = c; best.tot = tot; best.sF = sF; L = Lc; g2 = g; vb2 = vb; closeN = cl; }
      if (++nValid >= D1.validKeep) break;
    }
    // RECOVERY TOUCH: the ball is coming into a foot and no touch with a guaranteed next window exists — rather than let the swing kick it, the player
    // makes a deliberate settling push along his line, just firm enough to clear his own follow-through (no next window is promised)
    if (!best && recov && this.recoverNeeded(recov.c)) {
      const c = recov.c, sp = Math.min(this.launchMax(s) + D1.followExtra, recov.sF * 1.04), n = c.n, g = this.contactGeom(c.gs, c.F, c.reg, n, K(c.ballK.p), K(c.ballK.v), c.elev);
      const Lr = { n, speed: sp, target: null, kNext: null, F2: null, swing2: null, maxSep: null, want: this.wantSep(s), nT: null, endV: null, recovery: true, elev: c.elev };
      let okA = true; if (g && this.arch === "A") { const e = 0.48, vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), pn = V.dot(vPath, g.nc), bn = V.dot(K(c.ballK.v), g.nc), need = (V.dot(this.launchVec(Lr, g), g.nc) + e * bn) / (1 + e), rhoA = pn > 0.2 ? need / pn : 9;
        const wkA = rhoA >= D1.warp.rhoMin && rhoA <= D1.warp.rhoMaxPhys ? this.warpFor(c.F, c.smp.legs[c.F].swing, c.smp.legs[c.F].w, c.wp, rhoA) : null; if (wkA) { c.warp = wkA; c.rho = rhoA; } else okA = false; }
      if (g && okA && this.followClear(c.pred, c.j, c.F, g, Lr, K(c.ballK.p), c.warp, c.gs) && this.approachClear(c.pred, c.j, c.F, g, c.off, c.warp)) {
        const vb = V.sc(this.bootVel(c.pred, c.jp, c.F, g.cW), c.rho); best = c; L = Lr; g2 = g; vb2 = vb; closeN = V.dot(V.sub(vb, K(c.ballK.v)), g.nc); rj("recovery"); }
    }
    if (!best) { fail(); return; }
    const kc = best.smp.k, prevA = this.getAdj(best.F, best.smp.legs[best.F].swing), wNow = !this.A.legs[best.F].stance && Math.round(this.A.legs[best.F].tTO * 240) === best.smp.legs[best.F].swing ? clamp(this.A.legs[best.F].w || 0, 0, 1) : 0;
    const cur = prevA && prevA.swing === best.smp.legs[best.F].swing ? this.adjAt(prevA, wNow) : { o: [0, 0, 0], r: [0, 0, 0], yaw: 0 };
    if (this.plan && (this.plan.F !== best.F || this.plan.swing !== best.smp.legs[best.F].swing)) this.dropAdj(this.plan.F, this.plan.swing);
    this.setAdj(best.F, { swing: best.smp.legs[best.F].swing, ws: wNow, wc: best.smp.legs[best.F].w, o: g2.o, r: g2.rv, yaw: g2.yaw, oBase: cur.o, rBase: cur.r, yawBase: cur.yaw, kc, hold: this.holdOf(best.gs, best.F, g2.o), warp: best.warp || null });
    const ballAtK = new Map(); for (const [kk, v] of this.ballCache.map) if (kk <= kc) ballAtK.set(kk, v.p);
    this.plan = { id: `${this.pid}:T${kc}`, kc, F: best.F, reg: g2.reg, hull: g2.hull, swing: best.smp.legs[best.F].swing, wc: best.smp.legs[best.F].w, wp: best.wp, rho: best.rho, n: L.n, launch: L, geom: g2, vBoot: vb2, close: closeN, release: best.release, ballAtK, made: k, input: this.input, cost: g2.cost != null ? g2.cost : best.cost, sF: best.sF || 0 };
    if (best.release === true && this.held) { this.held.released = true; this.held.releasedAt = k; }   // the cut is taken WITH the ball: release the turn now
    if (this.cfg.opts && this.cfg.opts.recViewer) {                                       // diagnostic: the planned (warped) toe path to the contact and the contact point
      const toe = []; for (let i = Math.max(best.off, 0); i <= Math.min(best.pred.length - 1, best.j + 30); i += 3) { const smp = best.pred[i], Lp = smp.legs[best.F]; if (Lp.stance || Lp.swing !== this.plan.swing) continue;
        const bn = best.warp ? this.pathFrames(best.pred, best.F, this.plan.swing, warpAt(best.warp, Lp.w)) : smp.bones; if (bn) toe.push(V.add(bn["toe_" + best.F].p, M.v(bn["toe_" + best.F].R, [0, -0.02, 0.085]))); }
      this.plan.viz = { toe, contact: g2.cW, ball: K(best.ballK.p), target: L.target || null }; }
    this.cpu.plan += now() - c0;
  }
  // the swing's foot frames at path fraction w' (interpolated between the predicted samples of that swing): the warped foot's pose
  pathFrames(pred, F, swing, wq) {
    const idx = pred._sw || (pred._sw = {}), key = F + swing; let arr = idx[key];
    if (!arr) { arr = idx[key] = []; for (const smp of pred) { const L = smp.legs[F]; if (!L.stance && L.swing === swing && smp.bones) arr.push(smp); } }
    let lo = 0, hi = arr.length - 1, a = null, b = null; if (!arr.length) return null;
    if (arr[0].legs[F].w > wq) b = arr[0]; else if (arr[hi].legs[F].w <= wq) a = arr[hi]; else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m].legs[F].w <= wq) lo = m; else hi = m; } a = arr[lo]; b = arr[hi]; }
    if (!a) return b ? b.bones : null; if (!b) return a.bones; const t = (wq - a.legs[F].w) / Math.max(1e-6, b.legs[F].w - a.legs[F].w), out = {};
    for (const key of ["foot_" + F, "toe_" + F]) out[key] = { R: (t < 0.5 ? a : b).bones[key].R, p: V.lerp(a.bones[key].p, b.bones[key].p, t) }; out["thigh_" + F] = a.bones["thigh_" + F]; return out;
  }
  holdOf(smp, F, o) { const f = fwdW(smp.psi), com = pitch2w(smp.P[0], smp.P[1], 0); return V.dot(V.sub(V.add(smp.bones["foot_" + F].p, o), com), f); }   // root-frame forward of the contact ankle
  dropAdj(F, swing) {                                                                 // a plan was abandoned before its contact: the foot eases back onto its path
    const a = this.getAdj(F, swing), L = this.A.legs[F]; if (!a || L.stance || Math.round(L.tTO * 240) !== swing || a.kc <= this.k) { if (a && a.kc > this.k) delete this.adjs[F][swing]; return; }
    const w = clamp(L.w || 0, 0, 1), cur = this.adjAt(a, w);
    this.setAdj(F, { swing, ws: w, wc: Math.min(0.999, w + 0.18), o: [0, 0, 0], r: [0, 0, 0], yaw: 0, oBase: cur.o, rBase: cur.r, yawBase: cur.yaw, kc: -1, dropped: true, warp: warpHome(a.warp, w) });
  }
  warpNow(F, swing) { const a = this.getAdj(F, swing), L = this.A.legs[F]; if (!L.stance && Math.round(L.tTO * 240) === swing) { const w = clamp(L.w || 0, 0, 1); return a && a.swing === swing && a.warp ? [w, warpAt(a.warp, w), warpSlope(a.warp, w)] : [w, w, 1]; } return null; }
  // the warp knots for a contact at actual fraction wc meeting the ball at path fraction wp with slope rho (null if not a valid monotone map)
  warpFor(F, swing, wc, wp, rho) {
    if (Math.abs(wp - wc) < 1e-6 && Math.abs(rho - 1) < 1e-6) { const st = this.warpNow(F, swing); return st && Math.abs(st[1] - st[0]) > 1e-6 ? this.warpFor2(st, wc, wp, rho) : null; }
    const st = this.warpNow(F, swing) || [Math.max(0, wp - D1.warp.lead), Math.max(0, wp - D1.warp.lead), 1]; return this.warpFor2(st, wc, wp, rho);
  }
  warpFor2(st, wc, wp, rho) { if (st[0] >= wc - 1e-4) return undefined; const K = [st, [wc, wp, rho], [1, 1, 1]]; return warpOk(K) && (1 - wp) / (1 - wc) <= D1.warp.catchUp ? K : undefined; }
  ballChangedCache() { const q = this.ballCache.map.get(this.k), b = this.W.ball; return !q || Math.abs(q.p[0] - b.p[0]) + Math.abs(q.p[1] - b.p[1]) + Math.abs(q.p[2] - b.p[2]) > 1e-9; }
  minInterval(s) { return tab(D1.minInterval, s); }
  // the planned launch (before execution error): B resolves a small pop; A / C leave the ball along the contact normal (a physical push's lift)
  launchVec(L, g) { const vz = this.arch !== "A" ? clamp(L.speed * Math.sin(g.elev) * D1.liftK, 0, D1.liftMax) : clamp(L.speed * Math.tan(g.elev), 0, 3.0); return [L.n[0] * L.speed, vz, L.n[2] * L.speed]; }
  launchMax(s) { return s + tab(D1.launchExtra, s); }
  // the motion if a held cut is released at this candidate's contact (input held until the touch, the cut from the next tick); cached per contact tick
  switchCand(c, k, held) {
    const kc = c.smp.k, key = this.inputKey() + "@" + kc + "@" + k; this._swc = this._swc && this._swc.k === k ? this._swc : { k, m: new Map() };
    let ps = this._swc.m.get(key); if (!ps) { ps = this.predictLoco(k, this.input, Math.round((1.6 + tab(D1.maxInterval, Math.hypot(this.A.V[0], this.A.V[1])) + 0.5) / DT), held, kc + 1); this._swc.m.set(key, ps); }
    const ix = (kk) => kk - k - 1, j = ix(kc); if (j < 0 || j >= ps.length) return c;
    // re-aim into the post-cut motion and redo the contact geometry for that direction (any region / elevation)
    const ball = K(c.ballK.p), vBall = K(c.ballK.v), n = this.aimDir(ps, j, ball, Math.hypot(this.A.V[0], this.A.V[1]), true);
    let g = null; for (const reg of [c.reg, ...Object.keys(D1.regions).filter((r) => r !== c.reg)]) { for (const e of this.elevs()) { g = this.contactGeom(c.gs, c.F, reg, n, ball, vBall, e * DEG); if (g) break; } if (g) break; }
    if (!g) return null;
    const vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), vb = V.sc(vPath, c.rho);
    return Object.assign({}, c, g, { pred: ps, j, smp: ps[j], jp: ix(c.pred[c.jp].k), off: 0, release: "contact", n, vb, gs: c.gs });
  }
  // a recovery touch only when the ball is actually coming into this foot's swing soon (otherwise keep looking for a proper touch)
  recoverNeeded(c) { return (c.smp.k - this.k) * DT < 0.45; }
  // provisional launch direction for scoring: toward the predicted COM path ~0.6 s after the contact, a nominal contact distance ahead of it
  aimDir(pred, j, ball, s, release) {
    const j2 = Math.min(pred.length - 1, j + Math.round(0.6 / DT)), p2 = pred[j2], v2 = [p2.V[0], 0, -p2.V[1]], th = Math.hypot(v2[0], v2[2]) > 0.3 ? headingOf(v2) : p2.psi;
    const tgt = V.add(pitch2w(p2.P[0], p2.P[1], R), V.sc(fwdW(th), 0.7)), d = V.sub(tgt, ball); d[1] = 0; return V.norm(d);
  }
  cost(g, F, reg, smp, close, s, n, release) {
    const rk = this.reachK();
    let c = (g.of > 0 ? g.of / (D1.reach.ahead * rk) : -g.of / (D1.reach.back * rk) * 0.6) + Math.abs(g.ol) / (D1.reach.lat * rk) + Math.max(0, -g.ov) / D1.reach.down * 0.8 + Math.abs(g.yaw) / (60 * DEG) * 0.6 + Math.abs(g.pitch) / (40 * DEG) * 0.3;
    const weak = F !== this.pref; if (weak) c += 0.25 * (5 - this.wf) / 4 + 0.05;
    c += { LACES: 0, INSIDE: s < 4.5 ? -0.05 : 0.12, OUTSIDE: 0.22, FRONT: 0.10 }[reg] + 0.25 * (g.elev || 0) / (35 * DEG);
    c += 0.002 * Math.max(0, smp.k - this.k) / 24;                                      // earlier is slightly better (the next feasible opportunity)
    if (this.lastTouch && this.lastTouch.expect && this.lastTouch.expect.F === F && this.lastTouch.expect.swing === smp.legs[F].swing) c -= 0.15;   // the window the last launch aimed at
    return c;
  }
  // the adjusted (and time-warped) boot must not reach the ball earlier in the swing (no early physical touch): replay the adjustment exactly as the
  // pose will apply it (offset rise from the current swing fraction, the foot at its warped path fraction), both hulls, every predicted tick before
  approachClear(pred, j, F, g, off, wk) {
    const swing = pred[j].legs[F].swing, wc = pred[j].legs[F].w, L0 = this.A.legs[F], cur = !L0.stance && Math.round(L0.tTO * 240) === swing ? clamp(L0.w || 0, 0, 1) : 0;
    const a0 = this.getAdj(F, swing) && cur > 0 ? this.adjAt(this.getAdj(F, swing), cur) : { o: [0, 0, 0], r: [0, 0, 0] }, ad = { ws: cur, wc, o: g.o, r: g.rv, oBase: a0.o, rBase: a0.r, yaw: 0, yawBase: 0 };
    for (let i = Math.max(off, 0); i < j; i++) { const smp = pred[i]; const L = smp.legs[F]; if (L.stance || L.swing !== swing) continue; const bk = this.ballCache.map.get(smp.k); if (!bk) continue;
      const bones = wk ? this.pathFrames(pred, F, swing, warpAt(wk, L.w)) : smp.bones; if (!bones) continue;
      const q = this.adjAt(ad, L.w), foot = bones["foot_" + F], toe = bones["toe_" + F], Rw = M.exp(q.r), ank = V.add(foot.p, q.o), b = K(bk.p);
      if (Math.hypot(b[0] - ank[0], b[2] - ank[2]) > 0.6) continue;
      if (gapAtLeast(this.hulls["boot_" + F], ank, M.mul(Rw, foot.R), b, 0.0015) < 0.0015) return false;
      if (gapAtLeast(this.hulls["toe_" + F], V.add(ank, M.v(Rw, V.sub(toe.p, foot.p))), M.mul(Rw, toe.R), b, 0.0015) < 0.0015) return false; }
    return true;
  }
  // after the launch the boot and toe follow through on the adjusted path (warp catching up, offset falling to zero by touchdown, the follow-through
  // hold); the ball leaves along the launch (rolled forward by the roll table). Neither hull may come back into the ball: no second, uncontrolled
  // impulse on top of the authoritative one.
  followClear(pred, j, F, g, L, ball, wk, gs) {
    const wc = pred[j].legs[F].w, swing = pred[j].legs[F].swing, hold = this.holdOf(gs || pred[j], F, g.o);
    const vL = this.launchVec(L, g), tr = this.simLaunch(ball, vL, 41);                   // the exact free ball (lift included) at this launch
    for (let i = j + 1; i <= Math.min(pred.length - 1, j + 40); i++) {
      const smp = pred[i]; if (smp.legs[F].stance) break; const w = smp.legs[F].w, u = s5((1 - w) / Math.max(1e-6, 1 - wc));
      const bones = wk ? this.pathFrames(pred, F, swing, warpAt(wk, w)) : smp.bones; if (!bones) continue;
      const foot = bones["foot_" + F], toe = bones["toe_" + F], f = fwdW(smp.psi), com = pitch2w(smp.P[0], smp.P[1], 0); let o = V.sc(g.o, u);
      const fz = V.dot(V.sub(V.add(foot.p, o), com), f), rel = 1 - s5((w - D1.hold.from) / D1.hold.span); if (fz > hold && rel > 0) o = V.sub(o, V.sc(f, Math.min(fz - hold, D1.hold.max) * rel));
      const Rw = M.exp(V.sc(g.rv, u)), ank = V.add(foot.p, o), RF = M.mul(Rw, foot.R), toeP = V.add(ank, M.v(Rw, V.sub(toe.p, foot.p))), RT = M.mul(Rw, toe.R);
      const bp = tr[Math.min(tr.length - 1, i - j - 1)].p, thr = D1.followGap;
      const gt = gapAtLeast(this.hulls["toe_" + F], toeP, RT, bp, thr), gb = gapAtLeast(this.hulls["boot_" + F], ank, RF, bp, thr);
      const strike = g.hull === "toe" ? gt : gb, other = g.hull === "toe" ? gb : gt;
      if (other < thr) return false;
      if (i - j > 1 && strike < thr) return false;
    }
    return true;
  }
  // ── the launch: aim the free ball at the window whose separation profile best matches the speed's dribble character; physics makes the path ──
  // the slowest launch along the provisional direction that the follow-through (warp catch-up to TURN-1.2's plant) can never re-contact, with a margin
  // for this player's execution error — the touch must be at least this firm (bisection on the real follow-through check)
  followMinSpeed(c, s) {
    const ball = K(c.ballK.p), base = clamp(0.5 * this.g.dribbling + 0.3 * this.g.ball_control + 0.2 * this.g.agility, -1, 1), sig = D1.errSpeed * (1 - D1.errSkill * base) * (c.F !== this.pref ? 1 + 0.30 * (5 - this.wf) : 1), mk = 1 / (1 - 3 * sig);
    const ok = (sp) => this.followClear(c.pred, c.j, c.F, c, { n: c.n, speed: sp / mk }, ball, c.warp, c.gs);
    let lo = Math.max(1, V.dot(c.vb, c.nc) + D1.sepMin), hi = this.launchMax(s) + D1.followExtra; if (!ok(hi)) return null; if (ok(lo)) return lo;
    for (let i = 0; i < 7; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } return hi;
  }
  solveLaunch(best, s, sFollow = 0, sMaxP = Infinity) {
    const elev = best.elev || 0;
    const c0 = now(), held = this.held && !this.held.released ? this.held.raw : null;
    // the motion that follows the contact: if this contact releases a held cut, the cut prediction; otherwise the current one
    const cut = best.release && this.held ? this.held.raw.dir : null;                     // this touch takes the ball through a requested cut
    const pred = best.pred, j0 = best.j, ball = K(best.ballK.p), vb = best.vb, minI = cut != null ? D1.cutMinInterval : this.minInterval(s), maxI = tab(D1.maxInterval, s);
    // through a cut: the ball is placed for the first outgoing steps (the body already on the new heading), close
    const wins = this.windowTargets(pred, j0 + Math.round(minI / DT), j0 + Math.round(maxI / DT), s).filter((w) => !(w.F === best.F && w.swing === best.smp.legs[best.F].swing)
      && (cut == null || (Math.abs(wrapA(headingOf([pred[w.j].V[0], 0, -pred[w.j].V[1]]) - cut)) < D1.cutWinTol * DEG && Math.hypot(pred[w.j].V[0], pred[w.j].V[1]) > 1.0)));
    const want = this.wantSep(s) * (cut != null ? D1.cutSepK : 1); const picks = []; if (this.rej) this.rej.nwin = (this.rej.nwin || 0) + wins.length;
    for (const w of wins) {
      const d = V.sub(w.q, ball); d[1] = 0; const L = V.len(d), n = V.norm(d), nT = w.k - best.smp.k, sMin = Math.max(V.dot(vb, n) + D1.sepMin, sFollow);
      // speed for distance L in nT ticks (monotone): bisection on the roll table
      let lo = 0.2, hi = 30; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (this.rollDist(m, nT).d < L) lo = m; else hi = m; }
      const sp = (lo + hi) / 2, end = this.rollDist(sp, nT), rj = this.rej && (this.rej.win = this.rej.win || []);
      if (rj && rj.length < 12) rj.push({ F: w.F, dt: +(nT * DT).toFixed(3), L: +L.toFixed(2), sp: +sp.toFixed(2), sMin: +sMin.toFixed(2), endV: +end.v.toFixed(2), vBootN: w.vBoot ? +V.dot(w.vBoot, n).toFixed(2) : null });
      const lr = this.arch !== "A" ? D1.liftK * Math.sin(elev) : Math.tan(elev);          // planned vertical / horizontal launch ratio
      if (sp * (1 - 0.75 * lr) < sMin || sp * (1 - 0.75 * lr) > sMaxP) continue;          // a lifted touch carries further than the rolling estimate (refined below)
      const closeN = w.vBoot ? V.dot(V.sub(w.vBoot, V.sc(n, end.v)), n) : 0;
      if (closeN < D1.closeMin + 0.25) continue;                                         // the next boot must be able to catch it (the warp can slow it, not speed it)
      if (!w.warped && closeN > 3.5) continue;                                           // un-warped, that would be a kick
      // separation profile (COM → ball, along the travel) between the touches
      let mx = 0; for (let t = 0; t <= nT; t += 6) { const jj = Math.min(pred.length - 1, j0 + t), p = pred[jj], bpos = V.add(ball, V.sc(n, this.rollDist(sp, t).d)); mx = Math.max(mx, Math.hypot(bpos[0] - p.P[0], bpos[2] + p.P[1])); }
      const c = Math.pow((mx - want) / (0.25 * want + 0.2), 2) + (w.warped ? 0.15 + 0.4 * (w.w - w.wp) : Math.pow((closeN - D1.closeWant) / 0.6, 2) * 0.6) + (w.F !== this.pref ? 0.15 * (5 - this.wf) / 4 : 0) + 0.8 * Math.max(0, 0.25 - (w.span || 0)) / 0.25;
      picks.push({ w, n, speed: sp, nT, maxSep: mx, c, endV: end.v, closeN });
    }
    if (!picks.length) { this.cpu.solve += now() - c0; this._lastSolve = { why: "noPick", nwin: wins.length }; return null; }
    // exact refinement: the launch WITH its resolved lift through the real ball integrator (airborne hops, landing, rolling), secant on the speed so
    // the free ball reaches the window's target at the window's tick. This is a launch solve, not a path: nothing acts on the ball after the touch.
    // The ranked windows are refined in turn (the lift carries the ball further than the rolling estimate: a window can fall below the floors).
    picks.sort((a, b) => a.c - b.c); const vzOf = (sp) => this.arch !== "A" ? clamp(sp * Math.sin(elev) * D1.liftK, 0, D1.liftMax) : clamp(sp * Math.tan(elev), 0, 3.0);
    for (const pick of picks.slice(0, D1.refineTries)) {
      const d0 = V.sub(pick.w.q, ball); d0[1] = 0; const Ld = V.len(d0), nn = pick.n;
      const along = (sp) => { const tr = this.simLaunch(ball, [nn[0] * sp, vzOf(sp), nn[2] * sp], pick.nT); const e = tr[tr.length - 1]; return { d: V.dot(V.sub(e.p, ball), nn), tr }; };
      let s0 = pick.speed, f0 = along(s0).d - Ld, s1 = s0 * (1 - 0.04), f1 = along(s1).d - Ld, it = 0;
      while (Math.abs(f1) > 0.004 && it++ < 6 && Math.abs(f1 - f0) > 1e-9) { const s2 = clamp(s1 - f1 * (s1 - s0) / (f1 - f0), 0.3, 30); s0 = s1; f0 = f1; s1 = s2; f1 = along(s1).d - Ld; }
      const fin = along(s1), endV = Math.hypot(fin.tr[fin.tr.length - 1].v[0], fin.tr[fin.tr.length - 1].v[2]);
      this._lastSolve = { why: "refine", s1: +s1.toFixed(2), sF: +sFollow.toFixed(2), pickSp: +pick.speed.toFixed(2), endV: +endV.toFixed(2), dt: +(pick.nT * DT).toFixed(2) };
      if (s1 > sMaxP * 1.02 || s1 < (this.arch !== "A" ? Math.max(V.dot(vb, nn) + D1.sepMin, sFollow * 0.98) : sFollow * 0.98) || (pick.w.vBoot && V.dot(V.sub(pick.w.vBoot, V.sc(nn, endV)), nn) < D1.closeMin + 0.1)) { if (this.rej) this.rej.refineFail = (this.rej.refineFail || 0) + 1; continue; }
      let mx = 0; for (let t = 0; t < pick.nT; t += 4) { const p = pred[Math.min(pred.length - 1, j0 + t + 1)], b = fin.tr[t].p; mx = Math.max(mx, Math.hypot(b[0] - p.P[0], b[2] + p.P[1])); }
      this.cpu.solve += now() - c0;
      return { n: nn, speed: s1, target: pick.w.q, kNext: pick.w.k, F2: pick.w.F, swing2: pick.w.swing, maxSep: mx, want, nT: pick.nT, endV, solveErr: f1, elev };
    }
    this.cpu.solve += now() - c0; return null;
  }
  // ── commit at the contact tick: final checks on the ACTUAL state, the touch error (keyed RNG), one authoritative launch (B / C) or none (A) ─────
  commit(k, P) {
    const c0 = now(); this.plan = null;
    if (P.release === "contact" && this.held && !this.held.released) { this.held.released = true; this.held.releasedAt = k; this.held.byTouch = P.id; }   // the cut goes WITH this touch
    const A = this.A, F = P.F, fr = this.framesPrev, ball = this.ballA(), foot = fr["foot_" + F], toe = fr["toe_" + F];
    const H = P.hull === "toe" ? this.hulls["toe_" + F] : this.hulls["boot_" + F], Rh = P.hull === "toe" ? toe.R : foot.R, ph = P.hull === "toe" ? toe.p : foot.p;
    const dq = hullDistance(hullAt(H, ph, Rh), ball.p, 0), gap = dq.d - R;
    const other = P.hull === "toe" ? gapTo(this.hulls["boot_" + F], foot.p, foot.R, ball.p) : gapTo(this.hulls["toe_" + F], toe.p, toe.R, ball.p);
    const s = Math.hypot(A.V[0], A.V[1]), reg = D1.regions[P.reg], weak = F !== this.pref;
    // execution error σ: attributes (dribbling, ball control, agility; balance in turns), foot, region, speed, urgency; keyed per touch
    const g = this.g, q = clamp(0.5 * g.dribbling + 0.3 * g.ball_control + 0.2 * g.agility, -1, 1), turnK = P.release || Math.abs(wrapA(P.n && headingOf(P.n) - A.psi)) > 25 * DEG ? 1 + 0.6 * (1 - 0.6 * g.balance) : 1;
    const footK = weak ? 1 + 0.30 * (5 - this.wf) : 1, speedK = 1 + 0.07 * Math.max(0, s - 5.5), base = (1 - D1.errSkill * q) * footK * reg.err * speedK * turnK;
    const key = ["DRIBBLE_TOUCH", this.pid, k, F], eS = this.rng.normal(...key, "speed"), eD = this.rng.normal(...key, "dir"), eL = this.rng.normal(...key, "lift");
    const ek = this.cfg.opts && this.cfg.opts.noError ? 0 : (this.cfg.opts && this.cfg.opts.errScale != null ? this.cfg.opts.errScale : 1), sigS = D1.errSpeed * base * ek, sigD = D1.errDir * base * ek, sigL = D1.errLift * base * ek;
    const vPlan = this.launchVec(P.launch, P.geom); let sp = P.launch.speed * (1 + sigS * eS), th = headingOf(P.launch.n) + sigD * eD * DEG, vz = clamp(vPlan[1] + sigL * eL * Math.min(1, s / 6), 0, D1.liftMax + 0.4);
    const vRes = [Math.cos(th) * sp, vz, -Math.sin(th) * sp];
    const vB = P.vBoot;
    let vOut = vRes, phys = null;
    if (this.arch !== "B") {                                                          // the physical estimate (the kernel's impulse law, kinematic boot)
      const n = dq.n, u = V.sub(ball.v, vB), vn = V.dot(u, n), e = 0.48, mu = 0.45, I = 2 / 3 * 0.43 * R * R;
      if (vn < 0) { const jn = -(1 + e) * vn * 0.43, tang = V.sub(u, V.sc(n, vn)), st = V.len(tang), jt = st > 1e-9 ? V.sc(tang, -Math.min(st / (1 / 0.43 + R * R / I), mu * jn) / st) : [0, 0, 0];
        phys = V.add(ball.v, V.sc(V.add(V.sc(n, jn), jt), 1 / 0.43)); }
    }
    if (this.arch === "C" && phys) {
      // HYBRID: the physical estimate at the real contact moves the resolved launch within the envelope — never below the follow-through floor
      const ps = Math.hypot(phys[0], phys[2]), pth = headingOf(phys), lo = Math.max(sp * (1 - D1.hybrid.speed), (P.sF || 0) * 1.02), cs = clamp(ps, Math.min(lo, sp), sp * (1 + D1.hybrid.speed)), cth = th + clamp(wrapA(pth - th), -D1.hybrid.dir * DEG, D1.hybrid.dir * DEG);
      vOut = [Math.cos(cth) * cs, clamp(phys[1], 0, 1.2), -Math.sin(cth) * cs];
    }
    const T = { id: P.id, k, t: k * DT, F, reg: P.reg, hull: P.hull, collider: `${this.pid}:${P.hull}_${F}`, swing: P.swing, w: clamp(A.legs[F].w || 0, 0, 1), weak, arch: this.arch,
      ball: ball.p.slice(), pre: { v: ball.v.slice(), w: ball.w.slice() }, gap, otherGap: other, nPhys: dq.n.slice(), bootVel: vB, desired: { v: [Math.cos(headingOf(P.launch.n)) * P.launch.speed, 0, -Math.sin(headingOf(P.launch.n)) * P.launch.speed], speed: P.launch.speed, maxSep: P.launch.maxSep, want: P.launch.want, kNext: P.launch.kNext, F2: P.launch.F2, target: P.launch.target },
      executed: { v: vOut.slice(), speed: Math.hypot(vOut[0], vOut[2]) }, error: { sigS, sigD, sigL, eS, eD, eL, keyId: this.rng.keyId(...key, "speed") }, phys, offset: P.geom.o, yaw: P.geom.yaw / DEG, pitch: P.geom.pitch / DEG,
      expect: { F: P.launch.F2, swing: P.launch.swing2, k: P.launch.kNext }, release: P.release, contactAhead: V.dot(V.sub(ball.p, pitch2w(A.P[0], A.P[1], 0)), fwdW(A.psi)), com: [A.P[0], A.P[1]], speedPlayer: s, ctrl: this.ctrl.state, launched: false };
    this.touches.push(T);
    if (this.arch === "A") { T.launched = true; T.physical = true; this.lastTouch = T; this.cpu.commit += now() - c0; return; }   // pure physical: the boot alone
    const pre = this.contacts.find((c) => c.own && k - c.k <= 3 && (c.part === "boot_" + F || c.part === "toe_" + F));
    if (pre) { T.cancelled = `preempted by a physical ${pre.part} contact ${k - pre.k} tick(s) earlier`; this.cpu.commit += now() - c0; return; }
    if (gap > 0.022 || gap < -0.004 || other < 0) { T.cancelled = `local check: gap ${(gap * 1000).toFixed(1)} mm, other ${(other * 1000).toFixed(1)} mm`; this.cpu.commit += now() - c0; return; }
    const vk = K(vOut), wk = [vk[2] / R, 0, -vk[0] / R];                                // rolling-consistent spin for the horizontal launch
    this.W.schedule({ id: P.id, tick: k, position: this.W.ball.p.slice(), maxContactError: 0.005, velocity: vk, spin: wk, colliderId: T.collider, preparedAt: this.W.time,
      metadata: { family: "DRIBBLE_TOUCH", technique: P.reg, selectedFoot: F, preferredFoot: this.pref, seed: this.rng.seed, executionQuality: 1 - base, arch: this.arch } });
    this.cpu.commit += now() - c0;
  }
  // ── recording (for the lab viewer, metrics and determinism hashes) ────────────────────────────────────────────────────────────────────────────
  record() {
    if (!this.rec) return; const A = this.A, b = this.W.ball;
    const fr = this.framesPrev, bones = fr && this.cfg.opts.recBones ? { fR: fr.foot_R, tR: fr.toe_R, fL: fr.foot_L, tL: fr.toe_L, wR: this.A.legs.R.stance ? -1 : this.A.legs.R.w, wL: this.A.legs.L.stance ? -1 : this.A.legs.L.w } : null;
    const vw = this.cfg.opts.recViewer, fb = vw && fr ? { R: fr.foot_R.p, L: fr.foot_L.p, tR: V.add(fr.toe_R.p, M.v(fr.toe_R.R, [0, -0.02, 0.085])), tL: V.add(fr.toe_L.p, M.v(fr.toe_L.R, [0, -0.02, 0.085])) } : null;
    this.rec.push({ k: this.k, t: this.k * DT, P: A.P.slice(), V: A.V.slice(), psi: A.psi, dir: this.input.dir, raw: this.rawInput(this.k * DT).dir, held: !!(this.held && !this.held.released), ball: { p: b.p.slice(), q: b.q.slice(), v: b.v.slice(), mode: b.mode }, ctrl: this.ctrl.state, adj: A.d1adj ? JSON.parse(JSON.stringify(A.d1adj)) : null,
      plan: this.plan ? { id: this.plan.id, F: this.plan.F, reg: this.plan.reg, kc: this.plan.kc, viz: vw ? this.plan.viz : null } : null, bones, feet: fb, skin: vw ? Float32Array.from(A.skinMats) : null, fx: vw ? this.fixtures.map((f) => f.viz ? f.viz(this.k * DT) : null) : null,
      env: tab(D1.sepWant, Math.hypot(A.V[0], A.V[1])) * 0.0 + this.wantSep(Math.hypot(A.V[0], A.V[1])) });
  }
}
const now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();

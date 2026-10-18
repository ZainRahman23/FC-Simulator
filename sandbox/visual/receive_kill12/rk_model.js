// ═══ receive_kill12/rk_model.js — RECEIVE-KILL-1.2: the RECEIVE-KILL-1.1 model with a RECALIBRATED Ball Control rating curve (a candidate) ═══════════
// Owner: 1.1 overcorrected — "CURRENT BC50 QUALITY ≈ NEW BC75 QUALITY", "CURRENT BC40 QUALITY ≈ NEW BC50 QUALITY", BC 99 ≈ current BC 99, smooth.
// Every 1.2 scale keeps 1.1's curve s(x) = x·(0.68 + 0.32·x²) and remaps the rating axis: a new rating BC executes exactly like the current rating
// g(BC), g a monotone cubic (PCHIP) through five knots:
//     E_new(BC, D) = E_current(g(BC), D),   s_new(BC) = s(u′),   u′ = (100 − g(BC)) / 90
//   A  (1, −8.5) (10, 0.7) (50, 40)   (75, 50)   (99, 98.5) — the two anchors met exactly; it flattened BC 50–75 (presented 19 Oct, not chosen)
//   B  (1, −8.5) (10, 0.7) (50, 35.4) (75, 54.5) (99, 98.5) — the anchors met within 10 % of execution error, BC 50–75 spread over 19 current
//      points instead of 10. Owner, 19 Oct: "Use Alternative B. Do not preserve the two anchors exactly." — B is the CANDIDATE (the default).
// All scales live here for the comparison (setScale): "original" (RECEIVE-KILL-1's curve and chest / head shapes), "current" (RECEIVE-KILL-1.1),
// "A", "B"; "candidate" names B. Nothing else differs between them. (RECEIVE-KILL-1.1 header follows.)
// ═══ receive_kill11/rk_model.js — RECEIVE-KILL-1.1: the KILL / DEADEN first-touch model, COMPRESSED Ball Control, + FOLLOW-UP CONTROL constants ═══
// RECEIVE-KILL-1.1 changes vs RECEIVE-KILL-1 (receive_kill1/, kept for comparison): the Ball Control curve (owner: "a major compression") —
//   old  E = 0.0068 + 0.40 · u^1.1 · c(D)                      u = (100 − BC) / 90
//   new  E = eFloor + eSkill · u · (λ + (1 − λ) · u²) · c(D)    eSkill 0.25, λ 0.68: ~45 % of the old skill amplitude, mildly convex (the professional
//        middle tighter, the low end expanding) — plus the FOLLOW-UP / STABLE-CONTROL constants used by rk_sim.js's control episode.
//   and the airborne surfaces' error shapes (k) of CHEST [1.0, 0.6, 0.6] → [0.85, 0.5, 0.5] and HEAD [1.0, 0.9, 0.6] → [0.85, 0.7, 0.5]: their first
//   contacts are judged at the contact and in the immediate post-contact phase (owner), and the follow-up turns their error into recovery work.
// (RECEIVE-KILL-1 header follows.)══════════════════════════════════════════════════════════════
// One receiving action, isolated: the player intends to KILL the incoming ball — take its energy out and leave it close and playable. The model
// keeps RECEIVE-CONTROL-1.1's architecture (an authored action, ONE authoritative contact at its CONTACT marker, an ideal post-contact ball state,
// Ball Control execution error, then the free rigid-body ball) and makes three things explicit, per control surface:
//
//   1. WHAT THE PLAYER WANTS (the ideal) — surfaceIdeal(): the surface's intended result (the ball dead at the foot; dropped in front from the thigh;
//      cushioned down from the chest; popped up from the head) and the surface's PHYSICAL LIMIT (capability): above vAbs of incoming speed into the
//      surface even a perfect cushion leaves κ · (vIn − vAbs) of rebound. Ball Control never changes the ideal.
//   2. HOW DEMANDING THE BALL IS — difficulty(): one continuous number D from the incoming kinetic state (horizontal and vertical speed, weighted per
//      surface), the contact height relative to the surface's natural height, the arrival direction and the repositioning before the contact.
//   3. HOW WELL THE PLAYER DOES IT — execute(): a velocity error around the ideal, in the surface's own frame (rebound / lateral / third axis), of size
//         σ = k_axis · vRef · D · E(BC, D),      E(BC, D) = eFloor + eSkill · q(BC) · c(D),      q(BC) = ((100 − BC) / 90)^γ,      c(D) = D / (D + Dc)
//      times STANDARDISED keyed draws N ~ N(0, 1) that do not depend on Ball Control (matched counterfactuals: changing the rating rescales the
//      same mistake, it never re-rolls it). Easy balls (small D) compress the ratings twice: the error is proportional to D, and Ball Control's share
//      of it, c(D), shrinks toward 0. Difficult balls expose the ratings.
//
// Everything in the authoritative chain uses + − × ÷, sqrt and the kernel's deterministic dsin / dcos / dexp / dlog / datan2 (bit-identical across
// JavaScript engines). The constants are CALIBRATION VALUES presented for review — not locked (owner: "Do not lock the Ball Control constants").
import { dsin, dcos, dexp, datan2 } from "../physchar2/core/v2_math.js";
import { dlog } from "../dribble1/d1_rng.js";
export const R = 0.11, G = 9.81, DT = 1 / 240;
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const DEG = Math.PI / 180;

// ── the receiver: the character's own skeleton (vinicius rig, 1.76 m) — hip joint 0.92 m, knee 0.49, ankle 0.088, thigh 0.435, shank 0.399,
// chest bone 1.24–1.50, neck 1.50, head 1.59–1.76. Ball-centre heights below follow from it (ball radius 0.11; a raised thigh's top is ABOVE
// the hip joint — the thigh band is 0.70–1.15 m; the sternum ball contact ~1.32 m; the forehead ~1.74 m standing) ───────────────────────────────────────
export const BODY_GEOM = { H: 1.76, hip: 0.92, knee: 0.487, ankle: 0.088, thigh: 0.435, shank: 0.399, hipX: 0.152, chestBase: 1.244, neck: 1.495, headBase: 1.587, top: 1.76 };

// ── CONTROL SURFACES (right side; the left is the mirror). Stance frame: f forward (the facing), r right, z up; positions are the BALL CENTRE ────────
// env    the envelope: ball-centre height band [z0, z1] (m), max incoming speed (m/s), arrival bearing range [b0, b1] (deg, + = the ball comes from
//        the surface's own side), descent slope range [s0, s1] (−vz / vh: + = dropping; 1 = 45°), and whether the ball must be on the turf
// c      the nominal CONTACT point (f, r) relative to the stance: the receiver repositions (a shuffle, ≤ shiftMax) so the contact sits there
// zNom, zHalf   the surface's natural contact height and half-width — the height-awkwardness term of D
// ideal  the intended result: kind "rest" (the ball rolls to rest at `set`), "drop" (leaves with vertical velocity vz and lands at `set`)
// cap    capability: incoming speed into the surface the cushion can fully absorb (vAbs) and the residual fraction above it (kappa); e = the
//        restitution of an uncushioned rebound off this surface (the kernel's boot 0.48 / body 0.35 materials; the head 0.45)
// w      difficulty weights of the horizontal and vertical incoming speed (vEff); m: the surface's intrinsic difficulty multiplier
// k      error shape: the rebound / lateral / third-axis share of the execution error; run: the scale of an under-cushioned (run-through) error
//        relative to an over-stiff (rebound) one; pop: the third axis can only lift the ball (it is on the turf)
// prep   the authored preparation time before the contact (s) — a fixed property of the action, NOT of Ball Control (Dribbling / Agility later)
// pref   a small selection preference (AUTO tie-breaks toward the natural surface; never a quality term)
export const SURFACES = {
  FOOT_INSIDE:  { group: "FOOT", label: "inside of the foot", side: true, env: { z: [0.10, 0.62], vMax: 34, bear: [-100, 40], slope: [-0.6, 1.2] }, c: [0.46, 0.08], zNom: R, zHalf: 0.38,
                  ideal: { kind: "rest", set: [0.40, 0.09], vz: -0.3 }, cap: { vAbs: 20, kappa: 0.04, e: 0.48 }, w: [1.0, 1.6], m: 1.0, k: [1.0, 0.6, 0.25], run: 0.5, pop: true, prep: 0.32, pref: 0 },
  FOOT_SOLE:    { group: "FOOT", label: "sole", side: true, env: { z: [0.10, 0.24], vMax: 14, bear: [-90, 90], slope: [-0.3, 99] }, c: [0.40, 0.12], zNom: R, zHalf: 0.12,
                  ideal: { kind: "rest", set: [0.40, 0.12], vz: 0 }, cap: { vAbs: 9, kappa: 0.06, e: 0.48 }, w: [1.0, 1.0], m: 1.1, k: [0.7, 0.5, 0.35], run: 1.3, pop: true, prep: 0.30, pref: 0.06 },
  FOOT_INSTEP:  { group: "FOOT", label: "instep (laces) cushion", side: true, env: { z: [0.14, 0.62], vMax: 26, bear: [-50, 50], slope: [0.36, 99] }, c: [0.44, 0.12], zNom: 0.30, zHalf: 0.28,
                  ideal: { kind: "drop", set: [0.40, 0.12], vz: -0.4 }, cap: { vAbs: 10, kappa: 0.06, e: 0.48 }, w: [1.0, 0.9], m: 1.25, k: [1.0, 0.6, 0.5], run: 0.6, pop: false, prep: 0.34, pref: 0.10 },
  FOOT_OUTSIDE: { group: "FOOT", label: "outside of the foot", side: true, env: { z: [0.10, 0.35], vMax: 24, bear: [20, 110], slope: [-0.4, 1.0] }, c: [0.22, 0.34], zNom: R, zHalf: 0.25,
                  ideal: { kind: "rest", set: [0.30, 0.28], vz: -0.3 }, cap: { vAbs: 12, kappa: 0.06, e: 0.48 }, w: [1.0, 1.6], m: 1.3, k: [1.0, 0.9, 0.3], run: 0.5, pop: true, prep: 0.32, pref: 0.25 },
  THIGH:        { group: "THIGH", label: "thigh", side: true, env: { z: [0.70, 1.15], vMax: 24, bear: [-60, 70], slope: [-0.2, 9] }, c: [0.32, 0.13], zNom: 0.95, zHalf: 0.25,
                  ideal: { kind: "drop", set: [0.55, 0.12], vz: 0.5 }, cap: { vAbs: 10, kappa: 0.07, e: 0.35 }, w: [1.15, 0.8], m: 1.15, k: [0.9, 0.5, 0.35], run: 0.4, pop: false, prep: 0.40, pref: 0.05 },
  CHEST:        { group: "CHEST", label: "chest", side: false, env: { z: [1.05, 1.58], vMax: 28, bear: [-70, 70], slope: [-0.3, 2.2] }, c: [0.24, 0.0], zNom: 1.32, zHalf: 0.26,
                  ideal: { kind: "drop", set: [0.60, 0.0], vz: -0.4 }, cap: { vAbs: 12, kappa: 0.07, e: 0.35 }, w: [1.0, 1.15], m: 1.25, k: [0.85, 0.5, 0.5], run: 0.3, pop: false, prep: 0.45, pref: 0.10 },
  HEAD:         { group: "HEAD", label: "head (cushioned header)", side: false, env: { z: [1.58, 2.25], vMax: 22, bear: [-60, 60], slope: [-0.3, 1.6] }, c: [0.20, 0.0], zNom: 1.74, zHalf: 0.30, jumpFrom: 1.92,
                  ideal: { kind: "drop", set: [1.00, 0.0], vz: 1.4 }, cap: { vAbs: 6, kappa: 0.12, e: 0.45 }, w: [1.1, 1.3], m: 1.6, k: [0.85, 0.7, 0.5], run: 0.3, pop: false, prep: 0.40, pref: 0.20 },
};
export const SURFACE_ORDER = ["FOOT_INSIDE", "FOOT_SOLE", "FOOT_INSTEP", "FOOT_OUTSIDE", "THIGH", "CHEST", "HEAD"];
export const GROUPS = { FOOT: ["FOOT_INSIDE", "FOOT_SOLE", "FOOT_INSTEP", "FOOT_OUTSIDE"], THIGH: ["THIGH"], CHEST: ["CHEST"], HEAD: ["HEAD"] };

// the 1.2 remap knots (new rating → current-equivalent rating) and the candidate scale of record
export const KNOTS = { A: [[1, -8.5], [10, 0.7], [50, 40], [75, 50], [99, 98.5]], B: [[1, -8.5], [10, 0.7], [50, 35.4], [75, 54.5], [99, 98.5]] };
export const CANDIDATE = "B";
// ── the model's constants (calibration values for review) ─────────────────────────────────────────────────────────────────────────────────────────
export const RK = {
  id: "receive-kill-v1",
  version: "RECEIVE-KILL-1.2 candidate B",
  diff: { vRef: 10, aH: 0.6, aJump: 0.8, aBear: 0.5, aShift: 0.10 },
  // RECEIVE-KILL-1 was { eFloor: 0.0068, eSkill: 0.40, gamma: 1.1 (s = u^γ), Dc: 1.0 } — see receive_kill1/rk_model.js
  exec: { eFloor: 0.0068, eSkill: 0.25, lambda: 0.68, p: 2, Dc: 1.0, runCap: 0.9, curve: "remap", knots: KNOTS[CANDIDATE], gamma: 1.1 },
  // FOLLOW-UP CONTROL (the control episode): after a first contact the receiver re-predicts the real ball and may schedule a follow-up FOOT control
  //   free      s after a contact before the follow-up foot action's preparation may start — it OVERLAPS the first action's unwinding (the leg
  //             prepares while the chest / head cushions; the thigh's own leg needs longer; a header with a jump adds `jump` for the landing)
  //   recov     extra s before the follow-up's preparation (0: overlapping); prep: the follow-up foot action's preparation (s)
  //   vMove     m/s of the recovery step / shuffle; react s before it starts; reach m: the largest adjustment considered
  //   wShift, wTime: planner cost per metre of adjustment and per second until the ball is expected to be settled (the wait for the contact +
  //   the expected settling after it: 0 for a ball killed on the turf, the bounce train of a ball put down from height); vBear: below this horizontal speed the ball has no
  //   meaningful arrival bearing (a dropping / slow ball can be taken from any side)
  //   maxFollow: follow-up contacts at most (3 contacts per episode); horizon s of each follow-up prediction
  follow: { free: { FOOT: 0.15, THIGH: 0.20, CHEST: 0.12, HEAD: 0.20 }, jump: 0.15, recov: 0.0, prep: 0.22, vMove: 3.0, react: 0.12, reach: 4.0, wShift: 0.8, wTime: 1.0, vBear: 2.0, maxFollow: 2, horizon: 3.0, aloneWindow: 1.0, otherFoot: 0.04 },
  // STABLE CONTROL — a diagnostic for measurement, never a possession switch: the ball on / at the turf (centre ≤ zMax, |vz| ≤ vzMax: hops ≤ ~3 cm),
  // slow relative to the receiver (≤ vRel), inside his usable zone (forward fMin … fMax, |side| ≤ rMax of his stance, ≤ radius), the receiver
  // settled (no action or adjustment in progress), all held for `hold` s
  stable: { zMax: 0.21, vzMax: 0.8, vRel: 0.8, fMin: -0.20, fMax: 0.70, rMax: 0.55, radius: 0.72, hold: 0.10, settle: 0.06 },
  // CONTINUATION — what the episode leaves the player able to do next (from the measured episode, never drawn), against the IDEAL episode (the
  // same ball executed perfectly: its own natural adjustment — a header's drop is meant to be stepped to — and its own time to stable control):
  //   IMMEDIATE  stable with the surface's natural number of contacts (foot 1, aerial 2), EXTRA adjustment ≤ adjImm m, ≤ tImm s later than the ideal
  //   ADJUSTED   stable with the natural contacts, extra adjustment ≤ adjMax m (a step, a later continuation)
  //   RECOVERY   stable only after an extra touch, or with extra adjustment > adjMax
  //   UNSTABLE   no stable control within the episode
  continuation: { adjImm: 0.25, tImm: 0.25, adjMax: 1.0 },
  plan: { shiftMax: 1.2, vShuffle: 2.5, wShift: 1.0, every: 2, prefFoot: "R", otherFoot: 0.04, read: 0.5 },   // read: the receiver reads the pass this long before it is struck (clean conditions)
  // the lean of a chest cushion (tan of the trunk's backward lean): steeper balls → more lean, so the chest faces the ball
  chestLean: { base: 0.18, k: 0.55, max: 1.0 },
  // control-state radii (m, from the intended point at contact + 1.0 s): the consequence of the rigid-body state, never a probability
  states: [["SET", 0.5], ["CONTROLLED", 1.2], ["LOOSE", 2.5], ["CONTESTABLE", 4.5], ["LOST", Infinity]],
};
export const BC_STEPS = [10, 20, 30, 40, 50, 60, 70, 75, 80, 90, 99];

// ── small vector helpers (local frame: [f, r, z]) ─────────────────────────────────────────────────────────────────────────────────────────────────
export const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]), cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
const unit = (a) => { const l = v3.len(a); return l > 1e-12 ? v3.sc(a, 1 / l) : [0, 0, 0]; };
const powD = (x, p) => (x <= 0 ? 0 : dexp(p * dlog(x)));   // deterministic x^p

// the surface record for a side (L mirrors r and the bearing)
export function surf(id, side) { const S = SURFACES[id], sg = S.side ? (side === "L" ? -1 : 1) : 1; return { id, side: S.side ? side : "C", sg, S, key: S.side ? id + "_" + side : id }; }
export function surfaceList(forced) {
  const ids = !forced || forced === "AUTO" ? SURFACE_ORDER : GROUPS[forced] || [forced];
  const out = []; for (const id of ids) { if (!SURFACES[id]) continue; if (SURFACES[id].side) { out.push(surf(id, "R")); out.push(surf(id, "L")); } else out.push(surf(id, "C")); } return out;
}

// ── the incoming ball at a tick, in the receiver's terms ──────────────────────────────────────────────────────────────────────────────────────────
// st: local state { p: [f, r, z], v: [vf, vr, vz] }. Bearing: where the ball comes FROM (deg, 0 = straight ahead, + = from the right). Slope:
// −vz / vh (+ = dropping; 1 = 45°). These are DECISION inputs: computed with the deterministic datan2.
export function incoming(st) {
  const vh = sqrt(st.v[0] * st.v[0] + st.v[1] * st.v[1]), from = vh > 1e-9 ? [-st.v[0] / vh, -st.v[1] / vh] : [1, 0];
  const bear = datan2(from[1], from[0]) / DEG, slope = -st.v[2] / max(vh, 0.3), speed = sqrt(vh * vh + st.v[2] * st.v[2]);
  return { vh, vz: st.v[2], speed, from, bear, slope, descentDeg: datan2(-st.v[2], vh) / DEG };
}

// ── the envelope test: is this surface a feasible authored action for the ball at this point? (reason when not) ───────────────────────────────
export function envelope(sf, st, inc) {
  const E = sf.S.env, z = st.p[2], b = sf.sg * inc.bear;
  if (z < E.z[0] || z > E.z[1]) return "height";
  if (inc.speed > E.vMax) return "speed";
  if (b < E.bear[0] || b > E.bear[1]) return "bearing";
  if (inc.slope < E.slope[0] || inc.slope > E.slope[1]) return "descent";
  return null;
}

// ── 2. DIFFICULTY: one continuous, explainable number ─────────────────────────────────────────────────────────────────────────────────────────────
//   vEff = sqrt((w_h · vh)² + (w_z · vz)²)                      the incoming speed the surface must manage: the square root of the incoming kinetic
//                                                               energy per unit mass, with its horizontal and vertical parts weighted per surface
//   D    = m · (vEff / vRef) · (1 + aH · H² + aJump · J + aBear · B + aShift · shift)
//   H    = (z − zNom) / zHalf (clamped ±1.5)                    awkward height for this surface (a raised inside foot, a low chest, …)
//   J    = (z − jumpFrom) / 0.3 above jumpFrom (head only)      the header needs a jump
//   B    = (1 − cos bearing) / 2                                the ball arrives from the side / behind relative to the facing
//   shift = the repositioning (m) the receiver makes before the contact
export function difficulty(sf, st, inc, shift) {
  const S = sf.S, d = RK.diff, vEff = sqrt((S.w[0] * inc.vh) * (S.w[0] * inc.vh) + (S.w[1] * inc.vz) * (S.w[1] * inc.vz));
  const H = clamp((st.p[2] - S.zNom) / S.zHalf, -1.5, 1.5), J = S.jumpFrom != null && st.p[2] > S.jumpFrom ? (st.p[2] - S.jumpFrom) / 0.3 : 0, B = (1 - inc.from[0]) / 2;
  const parts = { speed: vEff / d.vRef, height: d.aH * H * H, jump: d.aJump * J, bearing: d.aBear * B, shift: d.aShift * (shift || 0) };
  const D = S.m * parts.speed * (1 + parts.height + parts.jump + parts.bearing + parts.shift);
  return { D, vEff, m: S.m, parts, H, J, B };
}

// ── 3. BALL CONTROL: the relative execution error and its compression ─────────────────────────────────────────────────────────────────────────────
// the rating curve: u = (100 − BC)/90 (1 at BC 10, 0.011 at BC 99); s(u) = u·(λ + (1 − λ)·u^p) — 1 at BC 10, 0.0075 at BC 99
// the monotone cubic (PCHIP, Fritsch–Carlson) through the knots — arithmetic only (deterministic in every engine)
export function pchip(K, x) {
  const n = K.length, xs = K.map((k) => k[0]), ys = K.map((k) => k[1]), h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  let i = 0; while (i < n - 2 && x > xs[i + 1]) i++; const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
}
// the current-equivalent rating of a rating (the 1.2 remap; identity for the other scales)
export const gBC = (bc) => (RK.exec.curve === "remap" ? pchip(RK.exec.knots, clamp(bc, 1, 99)) : clamp(bc, 1, 99));
// the rating curve s (1 at BC 10 on the current scale): original u^1.1 · (0.40 / 0.25 to keep eSkill); current u·(0.68 + 0.32 u²); A / B = current(g)
export const qBC = (bc) => { const X = RK.exec, b = gBC(bc), u = (100 - b) / 90; if (X.curve === "power") return u <= 0 ? 0 : powD(u, X.gamma); return u * (X.lambda + (1 - X.lambda) * powD(Math.abs(u), X.p)); };
// ── THE SCALES (for the comparison; the machinery is identical) ──────────────────────────────────────────────────────────────────────────────
// tag: the short name on comparison tiles
export const SCALES = {
  original: { label: "ORIGINAL — RECEIVE-KILL-1", tag: "original", exec: { eSkill: 0.40, curve: "power", gamma: 1.1 }, k: { CHEST: [1.0, 0.6, 0.6], HEAD: [1.0, 0.9, 0.6] } },
  current: { label: "CURRENT — RECEIVE-KILL-1.1", tag: "current", exec: { eSkill: 0.25, curve: "cubic" }, k: { CHEST: [0.85, 0.5, 0.5], HEAD: [0.85, 0.7, 0.5] } },
  A: { label: "1.2 A — exact anchors (not chosen)", tag: "A", exec: { eSkill: 0.25, curve: "remap", knots: KNOTS.A }, k: { CHEST: [0.85, 0.5, 0.5], HEAD: [0.85, 0.7, 0.5] } },
  B: { label: "CANDIDATE — RECEIVE-KILL-1.2 B", tag: "B", exec: { eSkill: 0.25, curve: "remap", knots: KNOTS.B }, k: { CHEST: [0.85, 0.5, 0.5], HEAD: [0.85, 0.7, 0.5] } },
};
// "candidate" → the candidate scale of record (B)
export const scaleKey = (name) => (name === "candidate" ? CANDIDATE : name);
export let SCALE = CANDIDATE;
export function setScale(name) { const key = scaleKey(name), S = SCALES[key]; if (!S) throw new Error("unknown scale " + name); Object.assign(RK.exec, S.exec); for (const [id, k] of Object.entries(S.k)) SURFACES[id].k = k.slice(); SCALE = key; return key; }
export const cD = (D) => D / (D + RK.exec.Dc);                                   // Ball Control's share of the error: → 0 for easy balls, → 1 for hard ones
export const relErr = (bc, D) => RK.exec.eFloor + RK.exec.eSkill * qBC(bc) * cD(D);
export function sigmas(sf, bc, D) { const E = relErr(bc, D), s = RK.diff.vRef * D * E, k = sf.S.k; return { E, scale: s, reb: k[0] * s, lat: k[1] * s, third: k[2] * s }; }

// ── the surface's error frame and rebound axis (local) ───────────────────────────────────────────────────────────────────────────────────────────
// n: the rebound axis (the way an over-stiff surface returns the ball), l: lateral (horizontal, to the receiver's right when the ball comes
// straight), t: the third axis (up for a foot on the turf; the surface's tangent otherwise)
export function frameFor(sf, inc) {
  const S = sf.S, fr = [inc.from[0], inc.from[1], 0], up = [0, 0, 1]; let n;
  if (sf.id === "FOOT_INSTEP") n = unit([0.45 * fr[0], 0.45 * fr[1], 1]);
  else if (sf.id === "THIGH") n = unit([0.35 * fr[0], 0.35 * fr[1], 1]);
  else if (sf.id === "CHEST") { const L = RK.chestLean, tl = clamp(L.base + L.k * inc.slope, L.base, L.max); n = unit([fr[0], fr[1], tl]); }
  else if (sf.id === "HEAD") n = unit([0.8 * fr[0], 0.8 * fr[1], 1]);
  else n = fr;
  const l = unit(v3.cross(n, up).map((x) => -x)), lh = abs(l[0]) + abs(l[1]) > 1e-9 ? l : [0, 1, 0];
  const t = S.pop ? up : unit(v3.cross(lh, n));
  return { n, l: lh, t };
}

// ── 1. THE IDEAL: what a perfect execution of this surface's kill does with this ball ──────────────────────────────────────────────────────────
// The intended result is the SETTLE POINT (stance frame `ideal.set`): where the ball should end up, close and playable — at the foot for a foot
// kill, dropped just in front for thigh / chest, further in front for a cushioned header. The exit leaves the surface toward it with the surface's
// vertical exit velocity (`ideal.vz`: put down, popped up, cushioned down); rk_sim.js solves the exit speed THROUGH THE KERNEL so the ideal ball
// (bounces and roll included) is at the settle point 2 s after the contact. Then the surface's PHYSICAL LIMIT: incoming speed INTO the surface
// beyond vAbs cannot be fully absorbed — even the perfect cushion returns κ · (vIn − vAbs) along the rebound axis n. Ball Control never enters.
export function surfaceIdeal(sf, st, inc, stance) {
  const S = sf.S, I = S.ideal, set = [stance[0] + I.set[0], stance[1] + sf.sg * I.set[1], R], c = st.p, fr = frameFor(sf, inc);
  let kind = I.kind; if (kind === "rest" && c[2] > R + 0.03) kind = "drop";   // a raised foot contact (a bouncing ball): the ball is put down
  const vz = kind === "rest" ? 0 : I.kind === "drop" ? I.vz : I.vz, d = [set[0] - c[0], set[1] - c[1]], dl = sqrt(d[0] * d[0] + d[1] * d[1]), dir = dl > 1e-9 ? [d[0] / dl, d[1] / dl] : [1, 0];
  const hz = c[2] - R, tl = kind === "rest" ? 1 : (vz + sqrt(vz * vz + 2 * G * hz)) / G, guess = kind === "rest" ? 0.4 * sqrt(dl) : dl / tl * 0.5;
  const vIn = [-inc.from[0] * inc.vh, -inc.from[1] * inc.vh, inc.vz], vN = -v3.dot(vIn, fr.n), extra = S.cap.kappa * max(0, vN - S.cap.vAbs);
  return { kind, target: set, dist: dl, dir, vz, guess, frame: fr, vN, capExtra: extra, rolling: kind === "rest" };
}
// the ideal exit for a base exit speed s (before the capability residual) and with it
export const idealVel = (id, s) => v3.add([id.dir[0] * s, id.dir[1] * s, id.vz], v3.sc(id.frame.n, id.capExtra));
export const baseVel = (id, s) => [id.dir[0] * s, id.dir[1] * s, id.vz];

// the expected time for a ball put down from height h (exit vz) to stop bouncing (turf restitution e; bounces below vzMax count as settled) —
// the follow-up planner's estimate of how soon a contact leaves a stable ball (closed form, no kernel)
export function settleEst(kind, h, vz, e = 0.6) { if (kind === "rest" || h <= R + 0.03) return 0; let v = sqrt(vz * vz + 2 * G * (h - R)), t = (v + vz) / G; for (let k = 0; k < 8 && e * v > RK.stable.vzMax; k++) { v *= e; t += 2 * v / G; } return t; }

// ── the executed contact: the ideal + the Ball Control error, in the surface frame. N: the standardised draws {reb, lat, third} ──────────────────
export function execute(sf, ideal, inc, bc, D, N) {
  const S = sf.S, sg = sigmas(sf, bc, D), f = ideal.frame;
  const eReb = sg.reb * (N.reb >= 0 ? N.reb : S.run * N.reb), eLat = sg.lat * N.lat, eT = sg.third * (S.pop ? abs(N.third) : N.third);
  let v = v3.add(ideal.v, v3.add(v3.sc(f.n, eReb), v3.add(v3.sc(f.l, eLat), v3.sc(f.t, eT))));
  // physical caps: a mis-cushioned ball cannot leave faster along the rebound axis than an uncushioned bounce off this surface (restitution e),
  // nor run through faster than it came
  const vn = v3.dot(v, f.n), vIdN = v3.dot(ideal.v, f.n), hi = max(vIdN, S.cap.e * ideal.vN), lo = min(vIdN, -RK.exec.runCap * ideal.vN); let capped = null;
  if (vn > hi) { v = v3.add(v, v3.sc(f.n, hi - vn)); capped = "rebound"; } else if (vn < lo) { v = v3.add(v, v3.sc(f.n, lo - vn)); capped = "run-through"; }
  return { v, err: v3.sub(v, ideal.v), eAxes: { reb: eReb, lat: eLat, third: eT }, sig: sg, capped, N };
}

// the control state of the rigid-body result (distance from the intended point at contact + 1.0 s): a consequence, never a draw
export function stateOf(d) { for (const [k, r] of RK.states) if (d <= r) return k; return "LOST"; }

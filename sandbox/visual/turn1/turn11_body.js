// ═══ turn1/turn11_body.js — TURN-1.1: authored football change-of-direction body language layered over TURN-1 (presentation only, no ball) ═══
// TURN-1 decides WHERE and HOW the player changes direction (stance-limited ΔV, fixed world plants, the curve / cut / pivot resolver, braking steps,
// pelvis facing, continuous input). This layer decides what the athlete's BODY visibly does around those facts. It never writes TURN-1 state: it reads
// the maneuver plan, the clock and the legs, keeps its own state (A.l11s) and reshapes only the pose (t1Pose hooks). Plants, COM path, timing and
// events are therefore bit-identical with and without it (t11_check.cjs proves it per scenario).
// THE LIBRARY (authored once, for a RIGHT turn; a left turn is the exact mirror):
//   3 PLANT BASES — SIDESTEP (outside-foot cut, ≈45–135°) · XOVER (inside-foot crossover, ≤70°) · PIVOT (≥135° reversal)
//   2 STEP MODIFIERS — BRAKE (each braking stance, scaled by its deceleration) · EXIT (exit / acceleration steps, scaled by the speed still to gain)
//   + REACT — the visible reaction between the command and the first braking contact (head, shoulders, arms organise; no fake plant)
// A base is a set of key poses on the PLANT TIMELINE τ: −1 = T_PRE s before the plant touchdown, 0 = touchdown, 1 = plant toe-off, 1 → 3 = the
// 2·T_POST s after it (flight, first step, acceleration). Channels (deg / m, right turn): pelvis height / shift / roll / pitch / yaw, trunk roll /
// pitch / yaw (shoulders relative to the hips), head pitch / levelling, both arms (flexion, abduction, elbow; O = the arm on the OUTSIDE of the turn,
// I = inside) with a blend weight against RUN-1's arm cycle, and the free leg's swing-path offsets (tuck, knee lift, forward, crossover). Keys are
// interpolated by a monotone cubic (no overshoot); intensity scales continuously with the turn angle and the approach speed (no per-angle or
// per-speed variants); every channel passes a critically damped follower (C1: retargets, flips and cancels blend, never pop).
"use strict";
// eslint-disable-next-line no-var
var TURN11 = (function () {
const T = TURN1, E = RUN1_V13, R3 = E.R3, IN = T._in, DEG = Math.PI / 180, TAU = 2 * Math.PI;
const { clamp, sstep, tab, v2, lerpN, rSlerp, t1Tab, Fp } = IN, wrapA = T.wrapA, fwd = T.fwd, rgt = T.rgt, T1 = T.T1;

// ── parameters ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const P11 = {
  id: "TURN-1.1 V1",
  T_PRE: 0.30, T_POST: 0.25, lead: 0.05,      // s: the plant timeline before / after the plant; key poses are reached `lead` s early (follower lag)
  fTau: 0.03, fTauPelvis: 0.04, fTauArm: 0.022,   // s: channel followers (critically damped); arms faster (their keys sit ~80 ms apart in a plant)
  pelvisLat: 0.45, pelvisFwd: 0.40,           // share of TURN-1's lean the pelvis takes while the layer acts (TURN-1: 0.8 / 0.55) — the trunk bends the rest
  reachPlan: 0.948,                           // the reach the anticipated pelvis drop plans to (TURN-1: 0.955, with its crouch as extra margin; the pose enforces 0.985)
  antWin: [0.22, 0.06],
  kneeClear: 0.34,                            // m: a swinging knee's floor while a maneuver acts (TURN-1: 0.24) — a trailing knee lifts, it never kneels                       // s before the next touchdown: its reach drop is ramped in over this window (TURN-1: 0.32 → 0.12)
  dropWn: 2 * Math.PI * 7.0,
};
// ── THE AUTHORED LIBRARY (right turn) ───────────────────────────────────────────────────────────────────────────────────────────
// [τ, value] keys per channel. Angles in degrees, distances in metres. Missing channels are zero.
const LIB = {
  SIDESTEP: {
    note: "outside-foot side-step: brace → plant wide → load over / inside the support → hips redirect → drive off the planted leg",
    pY:     [[-1, 0], [-0.5, -0.015], [0, -0.03], [0.35, -0.06], [0.7, -0.045], [1, -0.015], [1.4, -0.02], [2, 0], [3, 0]],
    pX:     [[-1, 0], [0, -0.02], [0.35, -0.045], [0.75, -0.03], [1.05, 0], [3, 0]],
    pZ:     [[-1, 0], [-0.4, 0.02], [0, 0.06], [0.3, 0.04], [0.6, 0], [3, 0]],
    pYaw:   [[-1, 0], [0, -3], [0.4, -2], [0.8, 4], [1.2, 2], [2, 0], [3, 0]],
    tRoll:  [[-1, 0], [-0.5, 4], [0, 12], [0.35, 22], [0.7, 21], [1, 13], [1.4, 5], [2, 1], [3, 0]],
    tPitch: [[-1, 0], [-0.5, -6], [0, -10], [0.3, 0], [0.7, 14], [1, 18], [1.4, 9], [2, 3], [3, 0]],
    tYaw:   [[-1, 0], [-0.5, 7], [0, 13], [0.35, 20], [0.7, 16], [1, 8], [1.4, 0], [2, -3], [3, 0]],
    hPitch: [[-1, 0], [0, -4], [1, -6], [2, -3], [3, 0]],
    hLev:   [[-1, 0], [-0.5, 0.5], [0, 0.7], [1.5, 0.6], [3, 0]],
    aW:     [[-1, 0], [-0.5, 0.5], [0, 0.8], [0.35, 1], [0.75, 1], [1, 0.85], [1.4, 0.5], [2, 0.15], [2.6, 0], [3, 0]],
    // arms as directions in the pelvis-heading frame: az 0 = forward, +90 = out to that arm's side, 180 = back; el = degrees below horizontal
    oAz:    [[-1, 30], [-0.5, 50], [0, 88], [0.35, 92], [0.65, 50], [1, -20], [1.4, 0], [2, 10], [3, 10]],
    oEl:    [[-1, 60], [-0.5, 40], [0, 22], [0.35, 18], [0.65, 38], [1, 45], [1.4, 55], [2, 65], [3, 65]],
    oElb:   [[-1, 60], [-0.5, 40], [0, 25], [0.35, 20], [0.65, 65], [1, 95], [1.4, 90], [2, 85], [3, 85]],
    iAz:    [[-1, 150], [-0.5, 60], [0, 120], [0.35, 145], [0.65, 160], [1, 170], [1.4, 170], [2, 160], [3, 160]],
    iEl:    [[-1, 60], [-0.5, 55], [0, 55], [0.35, 55], [0.65, 55], [1, 50], [1.4, 60], [2, 65], [3, 65]],
    iElb:   [[-1, 70], [-0.5, 60], [0, 75], [0.35, 85], [0.65, 90], [1, 90], [1.4, 90], [2, 85], [3, 85]],
    fTuck:  [[-1, 0], [0, 0.6], [0.6, 0.6], [1, 0.3], [1.3, 0], [3, 0]],
    fAdv:   [[-1, 0], [-0.3, 0.4], [0, 0.75], [0.5, 0.8], [1, 0.6], [1.25, 0], [3, 0]],
    fKnee:  [[-1, 0], [-0.2, 0.04], [0.1, 0.11], [0.6, 0.12], [1, 0.06], [1.25, 0], [3, 0]],
    fLift:  [[-1, 0], [0, 0], [0.5, 0.02], [0.85, 0.06], [1.2, 0.03], [1.5, 0], [3, 0]],
    fFwd:   [[-1, 0], [0, 0], [0.3, 0.06], [0.7, 0.08], [1.1, 0], [3, 0]],
  },
  XOVER: {
    note: "inside-foot crossover: hips open early, the free leg crosses in front of the plant, tall and efficient (no wide plant, little load)",
    pY:     [[-1, 0], [0, -0.015], [0.4, -0.03], [1, -0.01], [2, 0], [3, 0]],
    pX:     [[-1, 0], [-0.3, -0.01], [0, -0.035], [0.4, -0.045], [1, -0.01], [1.5, 0], [3, 0]],   // toward the plant (it lands across, under the body)
    pRoll:  [[-1, 0], [-0.4, 2], [0, 6], [0.5, 8], [1, 4], [1.6, 0], [3, 0]],                   // the inside (plant) hip drops: reach for the crossed plant
    pYaw:   [[-1, 0], [-0.3, 3], [0, 8], [0.4, 14], [0.8, 10], [1.2, 4], [2, 0], [3, 0]],
    tRoll:  [[-1, 0], [0, 4], [0.4, 7], [1, 5], [1.6, 2], [3, 0]],
    tPitch: [[-1, 0], [0, 2], [0.4, 8], [1, 12], [1.6, 6], [3, 0]],
    tYaw:   [[-1, 0], [-0.4, 6], [0, 12], [0.4, 14], [1, 6], [1.6, 0], [3, 0]],
    hPitch: [[-1, 0], [0, -3], [2, 0], [3, 0]],
    hLev:   [[-1, 0], [0, 0.6], [2, 0.5], [3, 0]],
    aW:     [[-1, 0], [-0.4, 0.4], [0, 0.75], [0.5, 0.9], [1, 0.7], [1.6, 0.2], [2.2, 0], [3, 0]],
    oAz:    [[-1, 30], [-0.4, 30], [0, -10], [0.5, -15], [1, 0], [1.6, 10], [3, 10]],
    oEl:    [[-1, 60], [-0.4, 50], [0, 45], [0.5, 45], [1, 50], [1.6, 60], [3, 65]],
    oElb:   [[-1, 70], [-0.4, 70], [0, 90], [0.5, 95], [1, 90], [3, 85]],
    iAz:    [[-1, 150], [-0.4, 80], [0, 150], [0.5, 165], [1, 165], [1.6, 160], [3, 160]],
    iEl:    [[-1, 60], [-0.4, 50], [0, 55], [0.5, 55], [1, 60], [3, 65]],
    iElb:   [[-1, 70], [-0.4, 60], [0, 85], [0.5, 90], [1, 90], [3, 85]],
    fCross: [[-1, 0], [0, 0], [0.2, 0.08], [0.6, 0.12], [1, 0.06], [1.3, 0], [3, 0]],
    fLift:  [[-1, 0], [0, 0], [0.6, 0.03], [1, 0.03], [1.3, 0], [3, 0]],
    fTuck:  [[-1, 0], [0, 0.3], [1, 0.2], [1.3, 0], [3, 0]],
    fAdv:   [[-1, 0], [0, 0.4], [0.6, 0.5], [1, 0.3], [1.25, 0], [3, 0]],
    fKnee:  [[-1, 0], [0, 0.04], [0.4, 0.08], [1, 0.04], [1.25, 0], [3, 0]],
  },
  PIVOT: {
    note: "reversal: brace and decelerate → plant ahead, sink briefly → shoulders and the outside arm lead the rotation → drive out low and forward",
    pY:     [[-1, 0], [-0.5, -0.02], [0, -0.04], [0.3, -0.07], [0.6, -0.06], [0.9, -0.02], [1.2, -0.02], [2, 0], [3, 0]],
    pZ:     [[-1, 0], [-0.4, 0.02], [0, 0.05], [0.3, 0.04], [0.6, 0], [3, 0]],
    pYaw:   [[-1, 0], [-0.6, 10], [-0.3, 25], [0, 35], [0.3, 24], [0.6, 8], [0.9, 0], [3, 0]],   // side-on into the plant (505 technique): the hips turn before the foot lands
    tRoll:  [[-1, 0], [0, 4], [0.4, 10], [0.7, 12], [1, 8], [1.5, 3], [3, 0]],
    tPitch: [[-1, 0], [-0.5, -6], [0, -8], [0.3, -2], [0.6, 8], [1, 18], [1.5, 10], [2.2, 3], [3, 0]],
    tYaw:   [[-1, 0], [-0.5, 5], [0, 10], [0.3, 20], [0.6, 22], [0.9, 13], [1.2, 0], [1.8, -4], [3, 0]],
    hPitch: [[-1, 0], [0, -5], [1, -8], [2, -4], [3, 0]],
    hLev:   [[-1, 0], [-0.5, 0.6], [0, 0.7], [2, 0.6], [3, 0]],
    aW:     [[-1, 0], [-0.5, 0.6], [0, 0.9], [0.4, 1], [0.8, 1], [1.1, 0.7], [1.6, 0.3], [2.2, 0], [3, 0]],
    oAz:    [[-1, 35], [-0.5, 35], [0, 50], [0.3, -15], [0.7, -25], [1, -5], [1.6, 10], [3, 10]],
    oEl:    [[-1, 45], [-0.5, 42], [0, 45], [0.3, 50], [0.7, 52], [1, 55], [1.6, 60], [3, 65]],
    oElb:   [[-1, 65], [-0.5, 65], [0, 70], [0.3, 95], [0.7, 100], [1, 95], [3, 85]],
    iAz:    [[-1, 35], [-0.5, 35], [0, 60], [0.3, 140], [0.7, 165], [1, 170], [1.6, 160], [3, 160]],
    iEl:    [[-1, 45], [-0.5, 42], [0, 48], [0.3, 52], [0.7, 55], [1, 55], [3, 65]],
    iElb:   [[-1, 65], [-0.5, 65], [0, 75], [0.3, 90], [0.7, 95], [1, 92], [3, 85]],
    fTuck:  [[-1, 0], [0, 0.5], [0.8, 0.4], [1.2, 0], [3, 0]],
    fLift:  [[-1, 0], [0.3, 0], [0.8, 0.05], [1.2, 0.03], [1.5, 0], [3, 0]],
    fFwd:   [[-1, 0], [0, 0], [0.5, 0.05], [1, 0], [3, 0]],
    fAdv:   [[-1, 0], [-0.3, 0.5], [0, 0.85], [0.6, 0.8], [1, 0.4], [1.25, 0], [3, 0]],
    fKnee:  [[-1, 0], [0, 0.06], [0.4, 0.10], [1, 0.05], [1.25, 0], [3, 0]],
  },
};
// TURN-1.2 (mode "t12"): the turn plant of the BRAKE → REORGANISE → TURN → ACCELERATE family. The engine already opens the hips with the reorganisation
// steps and turns them on the plant; the base adds the upper body: shoulders leading, the outside arm sweeping across, the drive out. No cut lean.
LIB.REVERSAL = {
  note: "TURN-1.2 turn plant: compact base → shoulders and the outside arm lead the turn → drive out low and forward",
  pY:     [[-1, 0], [-0.5, -0.015], [0, -0.025], [0.4, -0.035], [0.8, -0.02], [1.2, -0.015], [2, 0], [3, 0]],
  tRoll:  [[-1, 0], [0, 3], [0.5, 6], [1, 4], [1.6, 0], [3, 0]],
  tPitch: [[-1, 0], [-0.5, -3], [0, -2], [0.5, 7], [1, 14], [1.5, 9], [2.2, 3], [3, 0]],
  tYaw:   [[-1, 0], [-0.6, 5], [0, 10], [0.4, 15], [0.8, 10], [1.2, 0], [1.8, -3], [3, 0]],
  hPitch: [[-1, 0], [0, -4], [1, -6], [2, -3], [3, 0]],
  hLev:   [[-1, 0], [-0.5, 0.5], [0, 0.6], [2, 0.5], [3, 0]],
  aW:     [[-1, 0], [-0.6, 0.5], [0, 0.75], [0.4, 0.85], [0.9, 0.75], [1.4, 0.35], [2, 0.1], [2.5, 0], [3, 0]],
  oAz:    [[-1, 45], [0, 55], [0.4, -5], [0.8, -15], [1.2, -5], [1.8, 10], [3, 10]],
  oEl:    [[-1, 50], [0, 48], [0.4, 50], [0.8, 52], [1.2, 55], [1.8, 60], [3, 65]],
  oElb:   [[-1, 65], [0, 70], [0.4, 90], [0.8, 95], [1.2, 90], [3, 85]],
  iAz:    [[-1, 45], [0, 60], [0.4, 135], [0.8, 160], [1.2, 168], [1.8, 160], [3, 160]],
  iEl:    [[-1, 50], [0, 50], [0.4, 52], [0.8, 55], [1.2, 58], [3, 65]],
  iElb:   [[-1, 65], [0, 75], [0.4, 88], [0.8, 92], [1.2, 90], [3, 85]],
  fAdv:   [[-1, 0], [0, 0.6], [0.6, 0.7], [1, 0.4], [1.25, 0], [3, 0]],
  fKnee:  [[-1, 0], [0, 0.05], [0.5, 0.08], [1, 0.04], [1.25, 0], [3, 0]],
};
// step modifiers and the reaction (constant poses × their drive, right turn where sided)
const MOD = {
  BRAKE: { pY: -0.025, pZ: 0.035, tPitch: -13, hPitch: -6, hLev: 0.5, aW: 0.85, oAz: 35, oEl: 32, oElb: 60, iAz: 35, iEl: 32, iElb: 60, swTuck: 0.25 },
  EXIT:  { pY: -0.04, hPitch: -8, armAmp: 0.5, armElb: 12, swLift: 0.05 },   // pY: the acceleration posture stays low and rises as the speed comes back
  REACT: { tYaw: 12, tPitch: -4, pY: -0.02, hLev: 0.4, aW: 0.5, oAz: 35, oEl: 50, oElb: 70, iAz: 35, iEl: 50, iElb: 70 },   // between the command and the first braking contact
  // TURN-1.2: the quick braking (calmer than TURN-1.1's cut braking) and the reorganisation stance (compact, balanced, arms out, feet active)
  BRAKE12: { pY: -0.02, pZ: 0.03, tPitch: -10, hPitch: -5, hLev: 0.5, aW: 0.55, oAz: 48, oEl: 55, oElb: 85, iAz: 48, iEl: 55, iElb: 85, swTuck: 0.2 },   // arms forward-out, elbows bent: counterbalance, not reach
  REORG:   { pY: -0.02, tPitch: -4, hLev: 0.5, aW: 0.55, oAz: 55, oEl: 50, oElb: 75, iAz: 55, iEl: 50, iElb: 75, swTuck: 0.3 },
};
const CH = ["pY", "pX", "pZ", "pRoll", "pPitch", "pYaw", "tRoll", "tPitch", "tYaw", "hPitch", "hLev", "aW", "oAz", "oEl", "oElb", "iAz", "iEl", "iElb", "armAmp", "armElb"];
const ANG = new Set(["pRoll", "pPitch", "pYaw", "tRoll", "tPitch", "tYaw", "hPitch", "oAz", "oEl", "oElb", "iAz", "iEl", "iElb", "armElb"]);
const SIDED = new Set(["pX", "pRoll", "pYaw", "tRoll", "tYaw"]);   // lateral / about-vertical channels flip sign for a left turn
const ARMS = ["oAz", "oEl", "oElb", "iAz", "iEl", "iElb"];

// monotone cubic Hermite (Fritsch–Carlson) through [τ, v] keys, prepared once per channel
function prep(K) {
  const n = K.length, x = K.map(k => k[0]), y = K.map(k => k[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (d[i - 1] + d[i])) / ((2 * d[i] + d[i - 1]) / d[i - 1] + (d[i] + 2 * d[i - 1]) / d[i]);
  return { x, y, m };
}
function evalK(C, t) {
  const { x, y, m } = C, n = x.length; if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
  let i = 0; while (i < n - 2 && t > x[i + 1]) i++;
  const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
}
const LIBP = {}; for (const f in LIB) { LIBP[f] = {}; for (const c in LIB[f]) if (Array.isArray(LIB[f][c])) LIBP[f][c] = prep(LIB[f][c]); }
const FAMS = ["SIDESTEP", "XOVER", "PIVOT", "REVERSAL"];
// intensity: continuous in the turn angle (a 60° and a 110° side-step are the same family at different strength) and the approach speed
const angI = (fam, ad) => fam === "XOVER" ? 0.55 + 0.45 * sstep(20, 70, ad) : fam === "PIVOT" ? 0.85 + 0.15 * sstep(135, 180, ad) : fam === "REVERSAL" ? 0.75 + 0.25 * sstep(110, 180, ad) : 0.45 + 0.55 * sstep(30, 115, ad);
const spdI = (v) => 0.8 + 0.3 * sstep(4.5, 9.5, v);

// ── state ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function init(A) {
  const S = { t: A.t, c: {}, v: {}, clip: null, fam: { SIDESTEP: 0, XOVER: 0, PIVOT: 0, REVERSAL: 0 }, famV: { SIDESTEP: 0, XOVER: 0, PIVOT: 0, REVERSAL: 0 }, b: 0, bV: 0, e: 0, eV: 0, r: 0, rV: 0, wc: 0, wcV: 0,
    sw: { R: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 }, L: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 } }, swV: { R: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 }, L: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 } },
    drop: 0, dropV: 0, W: 0, on: false, tau: null, phase: "—", lastPlantTO: null, g: 0, gV: 0, mode12: A.l11mode === "t12" };
  for (const k of CH) { S.c[k] = 0; S.v[k] = 0; }
  return S;
}
const follow = (x, v, tgt, tau, dt) => { const wn = 1 / tau; v += (wn * wn * (tgt - x) - 2 * wn * v) * dt; return [x + v * dt, v]; };
const rest = (x, v, tgt) => Math.abs(x - tgt) < 1e-7 && Math.abs(v) < 1e-6;

// the plant timeline τ at time t for a clip (null before the plant foot's final swing)
function tauAt(A, clip, t) {
  if (clip.tTO != null) return 1 + (t - clip.tTO) / P11.T_POST;
  if (clip.tTD != null) { const x = (t - clip.tTD) / clip.tc; return x <= 1 ? x : 1 + (t - clip.tTD - clip.tc) / P11.T_POST; }
  const L = A.legs[clip.plantFoot];
  if (!L.stance && L.tgtRole === "PLANT" && L.tTDf != null) { const tc = L.fcPlan ? L.fcPlan.tc : 0.24; return t < L.tTDf ? -(L.tTDf - t) / P11.T_PRE : (t - L.tTDf) / tc; }
  return null;
}
function brakeOf(dV) { return 0.5 + 0.5 * sstep(0.4, 1.8, v2.len(dV)); }

// ── the per-step update (after TURN-1's own step; reads TURN-1, writes only A.l11s) ─────────────────────────────────────────────────
function step(A, dt) {
  let S = A.l11s; if (!S || S.t > A.t + 1e-9) S = A.l11s = init(A);
  S.t = A.t;
  // mode "t12" (TURN-1.2): the layer sees only the BRAKE → REORGANISE → TURN → ACCELERATE family; TURN-1's own curves, cuts and pivots keep TURN-1's body
  const man = S.mode12 ? (A.man && A.man.kind === "REVERSAL" ? A.man : null) : A.man, s = v2.len(A.V), c = S.c, tgt = {};
  for (const k of CH) tgt[k] = 0;
  // 1. the clip (one per maneuver; it outlives TURN-1's maneuver record until the exit / acceleration keys are done)
  if (man) {
    if (!S.clip || S.clip.done || S.clip.cancelT != null) S.clip = { tDecide: man.tDecide, sApp: s, tTD: null, tTO: null, cancelT: null };
    const C = S.clip; C.tech = S.mode12 ? "REVERSAL" : man.tech; C.kind = man.kind; C.sg = man.sg; C.ad = Math.abs(man.delta) / DEG; C.plantFoot = man.plantFoot;
    if (man.phase !== "PRE" && C.tTD == null) { C.tTD = man.tPlant; C.tc = A.st.tc; }
    if (man.phase === "POST" && C.tTO == null) { let te = null; for (let i = A.events.length - 1; i >= 0; i--) if (A.events[i][1] === "plantTO") { te = A.events[i][0]; break; } C.tTO = te != null ? te : C.tTD + C.tc; }
  } else if (S.clip && S.clip.tTD == null && S.clip.cancelT == null) S.clip.cancelT = A.t;   // abandoned before the plant: fades out
  const C = S.clip;
  let tau = null, wcT = 0;
  if (C) {
    tau = C.cancelT != null ? C.tauC : tauAt(A, C, A.t + P11.lead);
    if (C.cancelT == null) C.tauC = tau;
    if (tau != null) { tau = clamp(tau, -1, 3); wcT = sstep(-1, -0.6, tau) * (1 - sstep(2.5, 3, tau)); if (tau >= 3) C.done = true; }
    if (C.cancelT != null) { wcT *= 1 - sstep(0, 0.2, A.t - C.cancelT); if (A.t - C.cancelT > 0.25) C.done = true; }
    if (C.done) S.clip = null;
  }
  S.tau = tau;
  // family weights follow the clip's technique (a re-plan before the plant blends between bases)
  for (const f of FAMS) { const on = C && C.tech === f ? 1 : 0; [S.fam[f], S.famV[f]] = follow(S.fam[f], S.famV[f], on, 0.06, dt); }
  [S.wc, S.wcV] = follow(S.wc, S.wcV, wcT, 0.04, dt);
  // 2. drives
  const role = A.st.role ? A.st.role.kind : "RUN", inFlight = A.clk.seg === 1 || A.clk.seg === 3;
  const wPre = tau == null ? 0 : sstep(-0.7, -0.1, tau);
  const BR = S.mode12 ? "BRAKEQ" : "BRAKE";                                          // which braking stances this mode dresses
  let bT = role === BR ? brakeOf(A.st.dV) : 0, gT = S.mode12 && role === "REORG" ? 1 : 0;
  if (inFlight) { const Fn = A.clk.seg === 1 ? "L" : "R", Ln = A.legs[Fn], nk = Ln.fcPlan && Ln.fcPlan.role && Ln.fcPlan.role.kind, wf = sstep(0.3, 1, A.clk.x);
    bT = lerpN(bT, nk === BR ? brakeOf(Ln.fcPlan.dV) : 0, wf); if (S.mode12) gT = lerpN(gT, nk === "REORG" ? 1 : 0, wf); }
  bT *= 1 - wPre; gT *= 1 - sstep(-0.35, 0, tau == null ? -1 : tau);
  const Fnext = A.clk.seg === 1 ? "L" : "R", accRole = role === "EXIT" || role === "ACCEL" || (inFlight && (A.legs[Fnext].tgtRole === "EXIT" || A.legs[Fnext].tgtRole === "ACCEL"));   // in a flight: the foot about to land
  const eT = accRole && (!S.mode12 || C) ? clamp((A.input.v - s) / 3, 0, 1) * (tau != null && tau > 0.8 ? 1 : 0.7) : 0;   // TURN-1.2: only out of its reversals
  const rT = man && man.phase === "PRE" ? 1 - wPre : 0;
  [S.b, S.bV] = follow(S.b, S.bV, bT, 0.06, dt); [S.e, S.eV] = follow(S.e, S.eV, eT, 0.08, dt); [S.r, S.rV] = follow(S.r, S.rV, rT, 0.05, dt); [S.g, S.gV] = follow(S.g, S.gV, gT, 0.05, dt);
  // 3. channel targets: Σ base(τ) · family weight · intensity + modifiers · drive; arm poses blend by their weights
  const sg = C ? C.sg : (S.sgLast || 1); S.sgLast = sg;
  const armAcc = { w: 0 }; for (const k of ARMS) armAcc[k] = 0;
  const addArm = (w, src, get) => { if (w <= 1e-9) return; armAcc.w += w; for (const k of ARMS) armAcc[k] += w * get(src, k); };
  const swT = { R: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 }, L: { tuck: 0, lift: 0, fwd: 0, cross: 0, adv: 0, knee: 0 } };
  if (C && tau != null) {
    const sApp = C.sApp || s;
    for (const f of FAMS) {
      const wf = S.fam[f] * S.wc; if (wf < 1e-6) continue;
      const K = LIBP[f], I = angI(f, C.ad) * spdI(sApp), ev = (k) => K[k] ? evalK(K[k], tau) : 0;
      for (const k of ["pY", "pX", "pZ", "pRoll", "pPitch", "pYaw", "tRoll", "tPitch", "tYaw", "hPitch"]) tgt[k] += wf * I * ev(k);
      tgt.hLev += wf * ev("hLev");
      addArm(wf * Math.min(1, I * 1.1) * ev("aW"), K, (KK, k) => evalK(KK[k], tau));
      // the free leg: the swing that ends in the EXIT step (it spans the plant stance)
      for (const F of ["R", "L"]) { const L = A.legs[F]; if (L.stance || L.tgtRole !== "EXIT") continue;
        swT[F].tuck += wf * I * ev("fTuck"); swT[F].lift += wf * I * ev("fLift"); swT[F].fwd += wf * I * ev("fFwd"); swT[F].adv += wf * Math.min(1, I) * ev("fAdv"); swT[F].knee += wf * I * ev("fKnee"); swT[F].cross += wf * I * ev("fCross") * (F === (C.sg > 0 ? "L" : "R") ? C.sg : 0); }   // the outside leg crosses toward the new direction (+ right of its step)
    }
  }
  const M = S.mode12 ? MOD.BRAKE12 : MOD.BRAKE; if (S.b > 1e-6) { for (const k of ["pY", "pZ", "tPitch", "hPitch"]) tgt[k] += S.b * M[k]; tgt.hLev += S.b * M.hLev; addArm(S.b * M.aW, M, (m, k) => m[k]);
    for (const F of ["R", "L"]) { const L = A.legs[F]; if (!L.stance && L.tgtRole === BR) swT[F].tuck += S.b * M.swTuck; } }
  const G = MOD.REORG; if (S.g > 1e-6) { tgt.pY += S.g * G.pY; tgt.tPitch += S.g * G.tPitch; tgt.hLev += S.g * G.hLev; addArm(S.g * G.aW, G, (m, k) => m[k]);
    for (const F of ["R", "L"]) { const L = A.legs[F]; if (!L.stance && L.tgtRole === "REORG") swT[F].tuck += S.g * G.swTuck; } }
  const X = MOD.EXIT; if (S.e > 1e-6) { tgt.pY += S.e * X.pY; tgt.hPitch += S.e * X.hPitch; tgt.armAmp += S.e * X.armAmp; tgt.armElb += S.e * X.armElb;
    for (const F of ["R", "L"]) { const L = A.legs[F]; if (!L.stance && (L.tgtRole === "ACCEL" || L.tgtRole === "EXIT")) swT[F].lift += S.e * X.swLift; } }
  const Rr = MOD.REACT; if (S.r > 1e-6) { const Ia = C ? angI(C.tech || "SIDESTEP", C.ad) : 0.6; tgt.tYaw += S.r * Ia * Rr.tYaw; tgt.tPitch += S.r * Ia * Rr.tPitch; tgt.pY += S.r * Rr.pY; tgt.hLev += S.r * Rr.hLev; addArm(S.r * Rr.aW, Rr, (m, k) => m[k]); }
  tgt.aW = clamp(armAcc.w, 0, 1); for (const k of ARMS) tgt[k] = armAcc.w > 1e-9 ? armAcc[k] / armAcc.w : 0;
  tgt.hLev = clamp(tgt.hLev, 0, 0.9);
  // mirror: lateral and about-vertical channels flip for a left turn (the arm / leg sides are mapped where they are applied)
  for (const k of SIDED) tgt[k] *= sg;
  // HIPS OVER THE PUSHING FOOT: late in a plant / exit stance the pelvis is carried toward the stance foot (root frame, ≤ 7 cm) — the push leg works
  // under the hips instead of trailing at full reach (less reach-driven depth, no skate)
  { const F0 = A.clk.seg === 0 ? "R" : A.clk.seg === 2 ? "L" : null, rk = A.st.role ? A.st.role.kind : "RUN";
    if (F0 && C && (rk === "PLANT" || rk === "EXIT") && A.legs[F0].plant) { const pl = A.legs[F0].plant.pos, d = v2.sub(pl, A.P), r = rgt(A.psi), f = fwd(A.psi), dl = [v2.dot(d, r), v2.dot(d, f)], m = Math.hypot(dl[0], dl[1]);
      const k = (rk === "PLANT" ? 1 : 0.6) * sstep(0.35, 0.8, A.clk.x) * Math.min(1, S.wc * 1.2) * 0.07; if (m > 1e-6) { tgt.pX += dl[0] / m * k; tgt.pZ += dl[1] / m * k; } } }
  S.sideO = sg > 0 ? "L" : "R";                                                      // the arm on the OUTSIDE of the turn
  // 4. followers (radians for angles); arm pose values follow only while they carry weight (a held value is harmless at weight 0)
  let busy = false;
  for (const k of CH) { const g = ANG.has(k) ? tgt[k] * DEG : tgt[k], tf = ARMS.includes(k) || k === "aW" ? P11.fTauArm : k[0] === "p" && !ANG.has(k) ? P11.fTauPelvis : P11.fTau;
    [c[k], S.v[k]] = follow(c[k], S.v[k], g, tf, dt); if (!ARMS.includes(k)) { if (rest(c[k], S.v[k], g) && g === 0) { c[k] = 0; S.v[k] = 0; } else busy = true; } }
  if (c.aW === 0 && !busy) for (const k of ARMS) { c[k] = 0; S.v[k] = 0; }
  for (const F of ["R", "L"]) for (const k of ["tuck", "lift", "fwd", "cross", "adv", "knee"]) { [S.sw[F][k], S.swV[F][k]] = follow(S.sw[F][k], S.swV[F][k], swT[F][k], 0.04, dt);
    if (rest(S.sw[F][k], S.swV[F][k], swT[F][k]) && swT[F][k] === 0) { S.sw[F][k] = 0; S.swV[F][k] = 0; } else busy = true; }
  // 5. activity weight: 1 while anything authored acts; exactly 0 (→ TURN-1's pose, bit for bit) once everything has settled
  const Wt = Math.max(S.wc, S.b, S.e, S.r, S.g, clamp(c.aW, 0, 1));
  S.Wt = clamp(Math.max(Wt * 3, 0), 0, 1); [S.W, S.WV] = follow(S.W, S.WV || 0, S.Wt > 1e-4 ? 1 : 0, 0.06, dt);
  if (rest(S.W, S.WV, 0) && S.Wt <= 1e-4) { S.W = 0; S.WV = 0; } else busy = true;
  S.on = busy || S.W > 0;
  // 6. the anticipated reach drop with THIS layer's pelvis (height, shift, roll share) — TURN-1's model, re-evaluated
  if (S.on) { const need = predDrop(A, S); const wd = P11.dropWn; S.dropV += (wd * wd * (need - S.drop) - 2 * wd * S.dropV) * dt; S.drop += S.dropV * dt; S.need = need; }
  else { S.drop = A.drop || 0; S.dropV = A.dropD || 0; }
  S.phase = phaseName(S);
}
function phaseName(S) {
  const tau = S.tau, f = S.clip ? S.clip.tech : null;
  if (S.mode12 && S.clip && tau != null && S.wc > 0.05) return "REVERSAL · " + (tau < -0.05 ? (S.b > 0.25 ? "BRAKE" : S.g > 0.25 ? "REORGANISE" : "PREP") : tau < 1 ? "TURN" : tau < 2 ? "FIRST STEP" : "ACCELERATE OUT");
  if (S.mode12 && S.b > 0.25) return "REVERSAL · BRAKE";
  if (S.mode12 && S.g > 0.25) return "REVERSAL · REORGANISE";
  if (S.clip && tau != null && S.wc > 0.05) { const ph = tau < -0.05 ? (S.b > 0.25 ? "BRAKE → PREP" : "PREP") : tau < 0.12 ? "PLANT" : tau < 0.5 ? "LOAD" : tau < 0.8 ? "REDIRECT" : tau < 1.0 ? "PUSH" : tau < 1.2 ? "PUSH → FIRST STEP" : tau < 2 ? "FIRST STEP" : "ACCELERATE OUT"; return f + " · " + ph; }
  if (S.b > 0.25) return "BRAKE";
  if (S.r > 0.25) return "REACT";
  if (S.e > 0.2) return "ACCELERATE";
  return S.on ? "settle" : "—";
}
// TURN-1's anticipated-drop model with this layer's pelvis (height offset, shift, roll / pitch shares, yaw); current channel values
function predDrop(A, S) {
  const c = S.c, W = S.W, b = A.body, s = v2.len(A.V), R = (b.thigh + b.shank) * P11.reachPlan, y0 = T.t1G(A, s).y0 - A.crouch * (1 - W) + c.pY;
  const pLat = lerpN(T1.pelvisLat, P11.pelvisLat, W), pFwd = lerpN(T1.pelvisFwd, P11.pelvisFwd, W);
  const RlOf = (lean) => R3.mul(R3.mul(R3.z(-lean[0] * pLat - c.pRoll), R3.x(lean[1] * pFwd + c.pPitch)), R3.y(c.pYaw));
  const leanOf = (dV, Ts) => { const a = v2.sc(dV, 1 / Math.max(0.12, Ts)); return [clamp(Math.atan(v2.dot(a, rgt(A.psi)) / 9.81) * T1.leanK, -T1.leanMax, T1.leanMax), clamp(Math.atan(v2.dot(a, fwd(A.psi)) / 9.81) * T1.leanFwdK, -T1.leanBack, T1.leanFwdMax)]; };
  // the reach drop's cap is TURN-1's, plus the crouch TURN-1 would have had now (this layer replaces that crouch, so its depth stays available for reach)
  const xc = A.crouch * W;
  let Rl = RlOf(A.lean), need = 0;
  const needAt = (F, pl, Pc, psi, sx, role) => { const sg = F === "R" ? 1 : -1, ho = R3.v(Rl, [sg * b.hipX, 0, 0]), hx = ho[0] + c.pX, hz = ho[2] + c.pZ, hip = v2.add(Pc, v2.add(v2.sc(rgt(psi), hx), v2.sc(fwd(psi), hz))), yH = y0 + ho[1];
    let bt = t1Tab(A, F, s, "beta", sx); const hs = role && T1.heelStrike[role]; if (hs && sx < 0.28) { const k = 1 - sstep(0, 0.28, sx); bt = Math.max(bt, hs * DEG * k * k); }
    const an = T.t1AnkleW(A, pl, bt, sx), dxz = Math.hypot(an[0] - hip[0], an[2] - hip[1]), dy = yH - an[1];
    return Math.min((T1.dropMaxRole[role] || T1.dropMax) + xc, Math.max(0, dy - Math.sqrt(Math.max(0, R * R - dxz * dxz))) * (1 - sstep(0.5, 0.8, sx))); };
  const St = A.st, F0 = A.clk.seg === 0 ? "R" : A.clk.seg === 2 ? "L" : null;
  if (F0) for (let sx = A.clk.x; sx <= 0.62; sx += 0.08) { const tau = sx * St.tc, Pc = v2.add(St.P0, v2.add(v2.sc(St.V0, tau), v2.sc(St.dV, St.tc * Fp(sx)))); need = Math.max(need, needAt(F0, A.legs[F0].plant, Pc, A.psi, sx, St.role && St.role.kind)); }
  // LATE-STANCE REACH GUARD (this layer only): the pushing foot must stay reachable with at most a 72° heel rise until toe-off (TURN-1 lets the late
  // stance rely on an unbounded heel rise; with this layer's higher, livelier pelvis a pivot push would otherwise out-reach the leg and skate)
  if (F0) { const Rl0 = Rl, R2 = (b.thigh + b.shank) * 0.975, cap = (T1.dropMaxRole[St.role && St.role.kind] || T1.dropMax) + xc;
    for (let sx = Math.max(A.clk.x, 0.45); sx <= 1.0001; sx += 0.0775) { const tau = sx * St.tc, Pc = v2.add(St.P0, v2.add(v2.sc(St.V0, tau), v2.sc(St.dV, St.tc * Fp(sx)))), sg = F0 === "R" ? 1 : -1, ho = R3.v(Rl0, [sg * b.hipX, 0, 0]);
      const hip = v2.add(Pc, v2.add(v2.sc(rgt(A.psi), ho[0] + c.pX), v2.sc(fwd(A.psi), ho[2] + c.pZ))), yH = y0 + ho[1], an = T.t1AnkleW(A, A.legs[F0].plant, -72 * DEG, sx);
      const dxz = Math.hypot(an[0] - hip[0], an[2] - hip[1]), dy = yH - an[1]; need = Math.max(need, Math.min(cap, Math.max(0, dy - Math.sqrt(Math.max(0, R2 * R2 - dxz * dxz))))); } }
  for (const F of ["R", "L"]) { const L = A.legs[F]; if (L.stance || !L.fcPlant || !L.fcP) continue; const wAnt = sstep(P11.antWin[0], P11.antWin[1], L.tTDf - A.t); if (wAnt <= 0) continue;
    const fp = L.fcPlan; Rl = RlOf(leanOf(fp.dV, fp.tc + (fp.tf || 0.05)));
    for (let sx = 0; sx <= 0.5; sx += 0.1) { const tau = sx * fp.tc, Pc = v2.add(L.fcP, v2.add(v2.sc(L.fcV, tau), v2.sc(fp.dV, fp.tc * Fp(sx)))); need = Math.max(need, wAnt * needAt(F, L.tgt ? { pos: [L.tgt[0], L.tgt[1]], yaw: L.tgt[2], pivot: L.fcPlant.pivot } : L.fcPlant, Pc, A.psi, sx, fp.role && fp.role.kind)); } }
  return Math.min(0.20 + xc, need);
}

// ── pose hooks (called from t1Pose while active) ───────────────────────────────────────────────────────────────────────────────
function active(A) { return !!(A.l11s && A.l11s.on); }
function pelvis(A, pel, latL, fwdL) {
  const S = A.l11s, c = S.c, W = S.W, pLat = lerpN(T1.pelvisLat, P11.pelvisLat, W), pFwd = lerpN(T1.pelvisFwd, P11.pelvisFwd, W);
  const R = R3.mul(R3.mul(R3.z(-latL * pLat - c.pRoll), R3.x(fwdL * pFwd + c.pPitch)), R3.mul(R3.y(c.pYaw), pel.R));
  const y = pel.pos[1] - A.crouch * (1 - W) + c.pY;
  S._pLat = pLat; S._pFwd = pFwd; S._Rp = R;
  return { R, y, pos: [pel.pos[0] + c.pX, y, c.pZ], yaw: c.pYaw };
}
function kneeClear(A) { const S = A.l11s; return lerpN(T1.kneeClear, P11.kneeClear, clamp(Math.max(S.wc, S.b, S.g || 0), 0, 1) * S.W); }
function dropA(A) { const S = A.l11s; return (A.drop || 0) + S.W * (S.drop - (A.drop || 0)); }
function trunk(A, rot, latL, fwdL) {
  const S = A.l11s, c = S.c, pLat = S._pLat, pFwd = S._pFwd;
  const extraRoll = -latL * (1 - pLat) * 1.3 - c.tRoll, extraPitch = fwdL * (1 - pFwd) * 1.2 + c.tPitch, tw = A.chest + c.tYaw;
  rot.spine = R3.mul(R3.mul(R3.z(extraRoll * 0.4), R3.x(extraPitch * 0.45)), R3.mul(R3.y(tw * 0.3), rot.spine));
  rot.chest = R3.mul(R3.mul(R3.z(extraRoll * 0.6), R3.x(extraPitch * 0.55)), R3.mul(R3.y(tw * 0.7), rot.chest));
}
function headWant(A, gzRel, p, latL) {
  const S = A.l11s, c = S.c, W = S.W, pLat = S._pLat;
  const trunkRoll = latL * pLat + latL * (1 - pLat) * 1.3 + c.tRoll + c.pRoll;        // the chest's absolute roll toward the lean (+ right)
  const roll = lerpN(latL * 0.35, -trunkRoll * (1 - c.hLev), W);                     // TURN-1: R3.z(latL · 0.35); authored: the head keeps (1 − hLev) of the trunk's roll
  return R3.mul3(R3.y(gzRel), R3.x(p.gazeDown * DEG + c.hPitch), R3.z(roll));
}
function arms(A, rot, latL, p, u) {
  const S = A.l11s, c = S.c, W = S.W, D = DEG;
  for (const sd of ["R", "L"]) {
    const side = sd === "R" ? 1 : -1;
    // RUN-1's own arm cycle (the r1Pose formula) with the acceleration drive (larger range, tighter elbow) — as parameters (flexion, abduction, elbow)
    const ua = u - (sd === "R" ? 0.5 : 0) - p.armPh, cA = Math.cos(TAU * ua), mid = (p.armFwd - p.armBack) / 2, amp = (p.armFwd + p.armBack) / 2 * (sd === "R" ? 1 + p.asymArm : 1) * (1 + c.armAmp);
    let flex = (mid + amp * cA) * D, elbow = (p.elbow - (sd === "L" ? p.asymElbow : 0) + p.elbowAmp * Math.cos(TAU * (ua - p.elbowPh))) * D + c.armElb, abd = (p.armAbd - p.armAbdAmp * Math.cos(TAU * (ua - p.armAbdPh))) * D;
    // TURN-1's balance abduction (R3.z(side·ab) before the arm = more abduction; the forearm opens by 0.35 ab), faded out while this layer acts
    if (A.arm > 0.3 && W < 1) { const outside = 0.55 + 0.45 * sstep(-10 * DEG, 10 * DEG, -side * latL), ab = A.arm * outside * DEG * (1 - W); abd += ab; elbow -= ab * 0.35; }
    let up = R3.mul3(R3.z(side * abd), R3.x(-flex), R3.y(-side * p.armRot * D));
    // the authored arm (O = outside of the turn, I = inside): a DIRECTION in the pelvis-heading frame (gravity up), taken into the shoulder's parent
    // (chest · clavicle) frame; the cycle arm is turned toward it by the MINIMAL rotation (fraction w of the angle between them) — continuous everywhere,
    // no gimbal singularity (a flexion / abduction split is undefined for an arm along the chest's forward axis), the cycle's own twist carried along
    const w = clamp(c.aW, 0, 1);
    if (w > 1e-6) {
      const pre = sd === S.sideO ? "o" : "i", az = c[pre + "Az"], el = c[pre + "El"], elb = c[pre + "Elb"];
      const d = [side * Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)], Rsh = R3.mul(R3.mul3(S._Rp, rot.spine, rot.chest), rot["clavicle_" + sd] || R3.I());
      const da = R3.v(R3.tr(Rsh), d), dc = R3.v(up, [0, -1, 0]), ax = [dc[1] * da[2] - dc[2] * da[1], dc[2] * da[0] - dc[0] * da[2], dc[0] * da[1] - dc[1] * da[0]], sn = Math.hypot(ax[0], ax[1], ax[2]);
      if (sn > 1e-9) { const a = Math.atan2(sn, dc[0] * da[0] + dc[1] * da[1] + dc[2] * da[2]) * w; up = R3.mul(IN.rExp([ax[0] / sn * a, ax[1] / sn * a, ax[2] / sn * a]), up); }
      elbow = lerpN(elbow, elb, w);
    }
    rot["upperArm_" + sd] = up; rot["foreArm_" + sd] = R3.x(-elbow);
  }
}
// the free leg's swing cycle runs ahead (w' = lerp(w, 1 − (1 − w)^2.2, k): monotone, same end points, rate ≥ 1 − k at touchdown): the knee comes through under the body and the
// foot waits in front for the first outgoing step instead of trailing behind the plant
function swingW(A, F, w) { const k = clamp(A.l11s.sw[F].adv, 0, 0.85); return k ? lerpN(w, 1 - Math.pow(1 - w, 2.2), k) : w; }   // ease-out: fast through the tuck, the foot then waits in front
function swing(A, F, w, aw, eA, rA) {
  const q = A.l11s.sw[F]; if (!q || (q.tuck === 0 && q.lift === 0 && q.fwd === 0 && q.cross === 0 && q.knee === 0)) return aw;
  const win = Math.sin(Math.PI * clamp(w, 0, 1)), w2 = win * win;
  const dv = -q.tuck * 0.10 * win * (1 - sstep(0.35, 0.75, w)) + q.lift * w2 * sstep(0.25, 0.65, w) + q.knee * w2, dal = q.fwd * w2, dla = q.cross * win;   // knee: a mid-swing lift (the free knee comes up in front)
  return [aw[0] + eA[0] * dal + rA[0] * dla, aw[1] + dv, aw[2] + eA[1] * dal + rA[1] * dla];
}
function diag(A) {
  const S = A.l11s, c = S.c, D = 180 / Math.PI;
  return { phase: S.phase, tau: S.tau, W: S.W, wc: S.wc, brake: S.b, exit: S.e, react: S.r, fam: S.clip ? S.clip.tech : null,
    ch: { pY: c.pY, pX: c.pX, pZ: c.pZ, pYaw: c.pYaw * D, tRoll: c.tRoll * D, tPitch: c.tPitch * D, tYaw: c.tYaw * D, aW: c.aW }, drop: S.drop, need: S.need };
}
const LAYER = { step, active, pelvis, dropA, kneeClear, trunk, headWant, arms, swing, swingW, diag };
function attach(A, opts) { A.L11 = LAYER; A.l11mode = opts && opts.mode === "t12" ? "t12" : "t11"; A.l11s = init(A); return A; }   // mode "t12": TURN-1.2's reversal family only
return { P11, LIB, MOD, attach, LAYER, evalK, prep, angI, spdI };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TURN11;

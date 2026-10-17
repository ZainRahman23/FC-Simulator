// ═══ dribble11/d11_core.js — DRIBBLE-1.1: DRIBBLE-1 (frozen at 7fe57fd3, dribble1/d1_core.js) + a shared, lazily extended locomotion prediction and
// cached planning (the optimisation twin), then the contact-aware free-leg follow-through (soft redirecting touches) ═══
// Everything below the DRIBBLE-1 authority contract is unchanged in kind: the simulation owns intent, TURN-1.2 (frozen 2129ca04) resolves locomotion,
// the dribble resolver decides when / which foot / which boot region / the launch, BALL-PHYS owns the ball after the single authoritative launch.
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
import { KeyedRNG } from "../dribble1/d1_rng.js";
import { norm as attrNorm } from "../dribble1/d1_attrs.js";

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
  // DRIBBLE-1.1: the same regions with a wider foot yaw for redirecting touches (laces 40°, outside 55°, front 35°; DRIBBLE-1: 30 / 45 / 25)
  regions11: {
    LACES:   { hull: "toe", d: [0, 0.88, 0.47], yawMax: 40, pitchMax: 78, err: 1.00 },
    INSIDE:  { hull: "boot", d: [-0.94, 0.05, 0.34], yawMax: 62, pitchMax: 25, err: 0.85 },
    OUTSIDE: { hull: "boot", d: [0.62, 0.22, 0.75], yawMax: 55, pitchMax: 50, err: 1.30 },
    FRONT:   { hull: "toe", d: [0, 0.22, 0.975], yawMax: 35, pitchMax: 35, err: 1.15 },
  },
  // DRIBBLE-1.2: the SIDE surfaces are the side of the forefoot, which the collider splits between the boot hull (rear / midfoot) and the toe hull
  // (the toe box): an inside or outside contact strikes with whichever of the two meets the ball first along the contact normal ("side"); the
  // other hull must still be clear of the ball (the kernel's contested-contact rule). DRIBBLE-1 / 1.1 tied INSIDE / OUTSIDE to the boot hull alone,
  // so a ball beside the forefoot was rejected because the toe box touched it first.
  regions12: {
    LACES:   { hull: "toe", d: [0, 0.88, 0.47], yawMax: 40, pitchMax: 78, err: 1.00 },
    INSIDE:  { hull: "side", d: [-0.94, 0.05, 0.34], yawMax: 62, pitchMax: 35, err: 0.85, side: true },
    OUTSIDE: { hull: "side", d: [0.62, 0.22, 0.75], yawMax: 55, pitchMax: 50, err: 1.30, side: true },
    FRONT:   { hull: "toe", d: [0, 0.22, 0.975], yawMax: 35, pitchMax: 35, err: 1.15 },
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
  clear: { lateW: 0.90, margin: 0.025, margin12: 0.008, lat: 0.13, back: 0.22, up: 0.08, wcMax: 0.86, minSpan: 0.08 },   // non-touching swings: keep ≥ margin from the free ball (avoidance bounds, m)
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
  switchCache: 24, cloneStride: 12,                      // held cut: distinct post-cut predictions (switch ticks) kept per input
  planTries: 24, planStep: 2, refineTries: 4, liftCarry: 0.22, validKeep: 3, sepCostK: 0.6, followExtra: 2.0,   // a recovery touch may be up to followExtra m/s firmer than launchMax to clear the follow-through             // contact ticks searched every planStep (240 Hz grid); the commit is still at the exact tick
  warp: { rhoMaxPhys: 1.8, maxBack: 36, step: 4, rhoMin: 0.30, lead: 0.30, catchUp: 2.0, costLag: 0.8, costSlow: 0.25 },   // swing time-warp: path phase up to 36 ticks behind,
                                        // foot speed at contact ≥ 30 % of its path speed, ≤ 3.2× catch-up after, warp starts ≤ 0.30 before the meeting phase                         // ranked contact candidates tried (launch solve + refined checks) per planning pass                         // s: locomotion / free-ball lookahead
  recover: { dth: 12, slow: 1.0, fast: 0.6, gain: 1.0, lag: 0.25, latDead: 0.05, fwdDead: 0.06, paceDead: 0.45 },   // carrier recovery: bend (deg) / pace (m/s) bounds, response model
  pursuitEvery: 60, pursuitDead: { dir: 1.0, v: 0.15 }, pursuitHyst: { dir: 0, v: 0 },   // (re-aim hysteresis: tried at 2.5° / 0.3 m/s — it cost FAST straight dribbling 16 % control; off)   // DRIBBLE-1.1: pursuit corrections below 1° / 0.15 m/s are not made (the input — and the shared prediction — stay unchanged)
                      // ticks: while no touch is planned the carrier re-aims his run at the free ball this often
  // CONTACT-AWARE FOLLOW-THROUGH (DRIBBLE-1.1): after the authoritative contact the touching leg YIELDS on its own path (the post-contact time-warp
  // keeps the foot slower than its swing for a while — a knot at lam of the remaining swing, the path phase there pulled back toward yieldK × the
  // contact rate) and ARCS away from the ball's new line (a sin² bump, zero with zero velocity at the contact and at touchdown: lateral away from the
  // launch line, lift, a little shorter), then rejoins TURN-1.2's unchanged swing and lands on its unchanged plant at its unchanged time. One
  // intensity ι ∈ [0, 1] scales both; the smallest ι that clears the ACTUAL launch is used. The adjusted foot never moves faster than speedCap ×
  // the natural peak speed of that swing, stays inside the leg's reach, and (after touchdown) the planted foot must not meet the ball either.
  // DRIBBLE-1.1 PLANNING COST (o2): decision-level savings (each changes which candidates are examined, not how a touch is resolved): the provisional
  // aim from the contact sample's own motion; window targets every 6 ticks with a coarse-to-fine envelope; contact search every 3 ticks and every
  // 6 ticks of path phase; a 5-rung follow-through ladder; unreachable polls every 12 ticks; the best of 2 valid plans
  o2: true, o2horizon: 1.0, o2near: 360, o2planStep: 3, o2warpStep: 6, o2winStep: 6, o2validKeep: 2, o2pollFar: 12,
  caft: { capAbs: 1.30, lam: 0.55, yieldK: 0.45, lat: 0.09, back: 0.03, up: 0.05, speedCap: 1.10, reachK: 0.975, plantCheck: 0.40,
          ladder: [[0, 0], [0, 1 / 3], [0, 2 / 3], [0, 1], [1 / 3, 1], [2 / 3, 1], [1, 1]], ladderO2: [[0, 0], [0, 0.5], [0, 1], [0.5, 1], [1, 1]] },
  floorMargin: 0.03,
  floorMax: 1.25,                                                                     // the executed launch may be firmed up by at most 25 % to clear the follow-through
  otherGap: 0.005,                                                                    // m: a launched ball must clear a planted foot / the leg capsules by this
  blockDepth: -0.02,                                                                  // a swing whose unadjusted path runs ≥ 2 cm into the free ball blocks later plans
  stageLead: 20, stageLeadK: 0.6, stageLeadMax: 45, stageFinal: 25,   // deg: the body leads the ball's new direction by 20° + 0.6 × the touch's redirect (≤ 45°); ≤ 25° left → full release
  holdGrace: 0.35, holdNear: 2.5,      // DRIBBLE-1.1: a held cut is released for a not-controlled ball only after 0.35 s, or once the ball is not within 2.5 m and ahead
                                                                       // deg: a staged cut turns the body this far beyond the ball's new direction
  cutAimFrac: [1, 0.75, 0.55, 0.4],                                                   // a cut touch's aim: the post-cut direction, or this fraction of the way to it
  cutAlignK: 0.6, cutWinAfterSwitch: 0.25,   // DRIBBLE-1.1: cut-window alignment cost per (angle / 25°)²; a cut / stage touch's next window ≥ 0.25 s after the switch (touchdown)
  cutGenFrac: 0.55,                    // DRIBBLE-1.1: held cut — contacts are also generated for a push this fraction of the way into the cut
  // DRIBBLE-1.2 CUT PLANNING: a held cut is judged by how much of the requested turn the ball takes with each touch and how soon — total cost +=
  // remK·(remaining / requested)² + timeK·(seconds until the touch that takes it) (+ setupK for a set-up touch, whose turn is expected at its
  // corridor window); a SET-UP touch aims the ball at the max-margin point of a decisive-contact corridor of a later swing (surfaces regs, contact
  // elevations elevs, launch decFrac of the way into the cut); up to validKeep valid plans (both the cut and the line version of a candidate) are
  // compared while a cut is held
  // DRIBBLE-1.2 IMPULSE NORMAL: the boot pushes the ball along the CHANGE of its velocity (out − in) — the contact normal of a launch at speed s along
  // the horizontal unit u for a ball arriving with velocity vIn is the horizontal direction of s·u − vIn. A redirect of a moving ball is a sideways
  // push by the side of the boot, not a face turned to the new direction; a push along the ball's own travel is unchanged. DRIBBLE-1 / 1.1 used u.
  impulseNormal: true,
  prefK: 1, prefWinK: 1,                // (a stronger preference — touch ×1.5, next window ×6 — raised the preferred foot's share in straight RUN from 47 to 62 % but,
                                        // by changing where the ball sits when a cut is asked for, cut 41 / 64 → 30 / 64 cuts taken: kept at DRIBBLE-1.1's strength)                           // DRIBBLE-1.2: × DRIBBLE-1's weak-foot cost in the contact and next-window rankings (similar options → the preferred foot)
  pathClearMax: 0,                      // (DRIBBLE-1.2: the swing-path clearance until the next touch, tried at 0.9 s: fewer stray contacts but more passes
                                        // without any plan — 31 / 64 cuts taken vs 38 / 64 — off)
  // DRIBBLE-1.2 TIME-SLICED PLANNING: work units per tick (a generated contact tick = uGen, a plan version = uVer), a pass whose earliest contact is
  // within urgent ticks runs at once, a sliced release-now switches relDelay ticks after its pass began
  slice: { on: false, budget: 6, uGen: 1, uVer: 3, urgent: 10, relDelay: 10 },
  safePursuit: 0.45,                    // s: DRIBBLE-1.2 — a pursuit correction must not put a leg into the free ball's path over this horizon
  winLatK: 0.3,
  // DRIBBLE-1.2 SIDE-FOOT SWEEP: an inside / outside push is made by the free leg sweeping ACROSS into the ball (hip ad- / abduction), not by a foot
  // that only travels forward: the swing adjustment gets a wind-up away from the ball and a sweep through the contact along the impulse normal
  // (zero at the adjustment's start and at touchdown, the plant unchanged), at the speed that gives the planned closing speed (≤ vMax), its
  // wind-up ≤ windMax
  sweep: { on: true, vMax: 2.2, windMax: 0.045 },
  cut12: { stagedMin: 75, stageFrac: 0.5, nowFullMaxRem: 60, decWin: 9, decPull: 2, nowHorizon: 0.7, cutMaxI: 1.3, minCut: 35, holdReplan: 24, robustK: 0, floorAng: 15, shifts: [-0.12, -0.06, 0.06, 0.12], shiftMinMargin: 0.03, refineSetup: 16, releaseNow: true, setupSwitch: true, stageMinRedirect: 20, refineTries12: 8, nestTries: 8, decFrac: 0.85, regs: ["OUTSIDE", "INSIDE", "LACES", "FRONT"], elevs: [0, 10, 20], remK: 1.2, timeK: 0.8, setupK: 0.15, validKeep: 5, marginWant: 0.06 },
  cutGate: 8, cutMinInterval: 0.28, cutWinTol: 30, cutSepK: 0.7,   // a cut touch: next window on the new heading (±30°), ≥ 0.28 s later, 70 % separation                          // deg: a requested direction change above this is held until a touch can take the ball through it
  gateExtra: 0.3,                      // s: … at most the speed's longest touch interval + this (the player must reach the ball first; then the turn goes without it)
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
// the follow-through profiles over the rest of the swing u ∈ [0, 1] (each 0 with zero slope at the contact and at touchdown): the YIELD (back along
// the launch) acts at once — sin²(πu'), peak half-way; the lateral ARC and the LIFT come later — sin²(πu'²), peak at u ≈ 0.67 — so the boot never
// lifts or swings sideways into the ball it has just struck from below and behind
const caftU = (wc, w) => clamp((w - wc) / Math.max(1e-6, 1 - wc), 0, 1);
// both complete by 95 % of the remaining swing (exactly zero, with zero velocity, over the last ticks before touchdown: the foot lands on TURN-1.2's
// own path, no residual to snap off at the plant)
const caftBump = (wc, w) => { const x = Math.sin(Math.PI * Math.min(1, caftU(wc, w) / 0.95)); return x * x; };
const caftLate = (wc, w) => { const u = Math.min(1, caftU(wc, w) / 0.95), x = Math.sin(Math.PI * u * u); return x * x; };
// DRIBBLE-1.2 sweep: offset per unit sweep-velocity-in-swing-fraction (sweepW = sweep velocity × swing duration): a wind-up h·t²(t − 1) from the
// adjustment's start to the contact (zero, zero slope at the start; zero, unit slope at the contact), then h·t(1 − t)² to touchdown (unit slope at
// the contact; zero, zero slope at touchdown)
const sweepP = (ws, wc, w) => { if (w <= wc) { const h = wc - ws; if (h <= 1e-6 || w <= ws) return 0; const t = (w - ws) / h; return h * t * t * (t - 1); } const h = 1 - wc; if (h <= 1e-6) return 0; const t = Math.min(1, (w - wc) / h); return h * t * (1 - t) * (1 - t); };
const caftOff = (cf, wc, w) => { const b = caftBump(wc, w), l = caftLate(wc, w); return [cf.Db[0] * b + cf.Dl[0] * l, cf.Db[1] * b + cf.Dl[1] * l, cf.Db[2] * b + cf.Dl[2] * l]; };
const rjX = (S, key) => { if (S.rej) S.rej[key] = (S.rej[key] || 0) + 1; };
// DRIBBLE-1.2: two samples of one swing in STEADY motion (same heading within 0.5°, speed within 0.1 m/s, the same aimed plant): a swing phase is the
// same pose at either tick, so a time-warped foot may be interpolated from the samples; otherwise it is evaluated exactly
const steadyF = (a, b, F) => { const la = a.legs[F], lb = b.legs[F]; return Math.abs(wrapA(a.psi - b.psi)) < 0.5 * DEG && Math.abs(Math.hypot(a.V[0], a.V[1]) - Math.hypot(b.V[0], b.V[1])) < 0.1
  && (!la.tgt || !lb.tgt || (Math.abs(la.tgt[0] - lb.tgt[0]) < 1e-3 && Math.abs(la.tgt[1] - lb.tgt[1]) < 1e-3)); };
// DRIBBLE-1.2 corridor geometry: the margin of a point (u, v) inside box [u0, u1, v0, v1] ∩ disk(0, ρ1) ∩ disk(c2, ρ2) (the smallest distance to
// any boundary; negative outside), and the point of largest margin (a small convex problem: bisection on the margin, alternating projections onto
// the shrunk sets — deterministic, ~1e-4 m)
const marginAt = (b, r1, c2, r2, u, v) => Math.min(u - b[0], b[1] - u, v - b[2], b[3] - v, r1 - Math.hypot(u, v), r2 - Math.hypot(u - c2[0], v - c2[1]));
function feasibleAt(b, r1, c2, r2, m) {
  const B = [b[0] + m, b[1] - m, b[2] + m, b[3] - m], q1 = r1 - m, q2 = r2 - m; if (B[0] > B[1] || B[2] > B[3] || q1 <= 0 || q2 <= 0) return null;
  let u = (B[0] + B[1]) / 2, v = (B[2] + B[3]) / 2;
  for (let it = 0; it < 60; it++) {
    u = clamp(u, B[0], B[1]); v = clamp(v, B[2], B[3]);
    let d = Math.hypot(u, v); if (d > q1) { u *= q1 / d; v *= q1 / d; }
    const du = u - c2[0], dv = v - c2[1]; d = Math.hypot(du, dv); if (d > q2) { u = c2[0] + du * q2 / d; v = c2[1] + dv * q2 / d; }
    if (u >= B[0] - 1e-6 && u <= B[1] + 1e-6 && v >= B[2] - 1e-6 && v <= B[3] + 1e-6 && Math.hypot(u, v) <= q1 + 1e-6) return { u, v };
  }
  return null;
}
function maxMargin(b, r1, c2, r2) {
  let p = feasibleAt(b, r1, c2, r2, 0); if (!p) return null; let lo = 0, hi = Math.min((b[1] - b[0]) / 2, (b[3] - b[2]) / 2, r1, r2), pl = p;
  for (let i = 0; i < 12; i++) { const mm = (lo + hi) / 2, q = feasibleAt(b, r1, c2, r2, mm); if (q) { lo = mm; pl = q; } else hi = mm; }
  return { u: pl.u, v: pl.v, m: Math.max(0, marginAt(b, r1, c2, r2, pl.u, pl.v)) };
}
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
// ball-surface gap to a leg capsule (the kernel's capsule: along the bone's local y, centred at pos)
const capGap = (c, bone, ball) => { const o = V.add(bone.p, M.v(bone.R, c.pos)), d = V.sub(ball, o), q = [bone.R[0] * d[0] + bone.R[3] * d[1] + bone.R[6] * d[2], bone.R[1] * d[0] + bone.R[4] * d[1] + bone.R[7] * d[2], bone.R[2] * d[0] + bone.R[5] * d[1] + bone.R[8] * d[2]];
  const y = clamp(q[1], -c.half, c.half); return Math.hypot(q[0], q[1] - y, q[2]) - c.r - R; };
// world frames of the leg bones from a pose (fk.R / fk.P are RUN-1's root-frame values; world = root rotation · R, root rotation · P + root position)
function boneFrames(A, fk) {
  const Rr = rootR(A.psi), T = [A.P[0], 0, -A.P[1]], ix = A.body.idx, out = {};
  for (const S of SIDES) for (const b of ["thigh", "shin", "foot", "toe"]) { const i = ix[b + "_" + S]; out[b + "_" + S] = { R: M.mul(Rr, fk.R[i]), p: V.add(M.v(Rr, fk.P[i]), T) }; }
  return out;
}
// ── LOCOMOTION TRACKS: one shared, lazily extended TURN-1.2 prediction per input ─────────────────────────────────────────────────────────────────
// A track is a TURN-1.2 copy advanced from the player's exact state at its base tick under a fixed input (a cut branch: that input until a switch
// tick, then the released one). TURN-1.2 is deterministic and its dynamics never read the pose, so while the player's actual input stays
// bit-identical to the track's, the track IS his future: every resolver part (contact search, launch solve, clearance, cut branches) reads the same
// samples, a sample is produced only when first read, and a refreshed planning window over the same input re-uses the track instead of predicting
// again. A branch shares its parent's samples up to its base tick.
class LocoTrack {
  constructor(sim, kb, from, inp, inp2, kSwitch, parent) {
    this.sim = sim; this.kb = kb; this.inp = { dir: inp.dir, v: inp.v }; this.inp2 = inp2 ? { dir: inp2.dir, v: inp2.v } : null; this.kSwitch = kSwitch; this.parent = parent || null;
    this.C = sim.T1.t1Clone(from); this.C.input = inp; this.s = []; this.cps = new Map(); this.ok = true; this.memo = new Map(); this.id = ++sim.trackSeq; sim.cpu.tracks++;
    this.lazy = !!sim.o2; if (this.lazy) this.cps.set(kb, sim.T1.t1Clone(from));       // (o2: the base state, for filling far samples' bones on demand)
  }
  // the sample of state tick kk (the state after stepping tick kk − 1)
  at(kk) { if (kk <= this.kb) return this.parent ? this.parent.at(kk) : undefined; const i = kk - this.kb - 1; while (this.s.length <= i) this.extend(); return this.s[i]; }
  extend() {
    const sim = this.sim, T1 = sim.T1, C = this.C, ki = this.kb + this.s.length + 1, ii = this.inp2 && ki - 1 >= this.kSwitch ? this.inp2 : this.inp, c0 = now();
    T1.t1Step(C, ii);
    if ((!this.inp2 || this.lazy) && (ki - this.kb) % D1.cloneStride === 0) this.cps.set(ki, T1.t1Clone(C));   // sparse states: cut branches start from here
    const smp = { k: ki, P: C.P.slice(), V: C.V.slice(), psi: C.psi, legs: {} };
    for (const F of SIDES) { const L = C.legs[F]; smp.legs[F] = L.stance ? { stance: true, tTD: L.tTD, plant: L.plant.pos.slice() } : { stance: false, w: clamp(L.w || 0, 0, 1), swing: Math.round(L.tTO * 240), tTDf: L.tTDf, tgt: L.tgt ? L.tgt.slice() : null }; }
    const need = SIDES.some((F) => !C.legs[F].stance && (C.legs[F].w || 0) >= D1.wLo - 0.08 && (C.legs[F].w || 0) <= 0.995);
    // o2: the pose / bone frames are evaluated now only near the planning tick (contact search, follow-through, clearance) or on the window-probe
    // ticks (absolute multiples of 6 and the tick after); any other sample gets them on first read, bit-identical (re-stepped from a stored state)
    if (need) { if (!this.lazy || ki <= sim.k + D1.o2near || ki % 6 <= 1) this.evalInto(smp, C); else { const tr = this;
      Object.defineProperty(smp, "bones", { get() { tr.fill(ki); return smp.bones; }, configurable: true, enumerable: true }); Object.defineProperty(smp, "pose", { get() { tr.fill(ki); return smp.pose; }, configurable: true, enumerable: true }); } }
    smp.man = C.man ? C.man.kind : null; this.s.push(smp);
    if (C.log.length > 64) C.log.splice(0, C.log.length - 1);                         // TURN-1.2 reads only its last log row
    sim.cpu.predict += now() - c0; sim.cpu.predTicks++;
  }
  evalInto(smp, C) { const ev = this.sim.evalLite(C), bones = boneFrames(C, ev.fk), pose = { pelvisPos: ev.pose.pelvisPos.slice(), Rp: ev.pose.rot.pelvis.slice(), psiR: ev.pose.legs.R.psi, psiL: ev.pose.legs.L.psi };
    Object.defineProperty(smp, "bones", { value: bones, writable: true, configurable: true, enumerable: true }); Object.defineProperty(smp, "pose", { value: pose, writable: true, configurable: true, enumerable: true }); }
  // a far sample's bone frames on demand: the whole block from the stored state at or before it is re-stepped (TURN-1.2 is deterministic: the frames are
  // exactly those an eager evaluation would have produced)
  fill(ki) {
    const sim = this.sim, T1 = sim.T1, c0 = now(); let kc = null; for (const k of this.cps.keys()) if (k <= ki && (kc == null || k > kc)) kc = k;
    const C = T1.t1Clone(this.cps.get(kc)), end = Math.min(this.kb + this.s.length, kc + D1.cloneStride);
    if (kc > this.kb) { const s0 = this.s[kc - this.kb - 1], d0 = Object.getOwnPropertyDescriptor(s0, "bones"); if (d0 && d0.get) this.evalInto(s0, C); }   // the stored state's own tick
    for (let kk = kc + 1; kk <= end; kk++) { T1.t1Step(C, this.inp2 && kk - 1 >= this.kSwitch ? this.inp2 : this.inp); if (C.log.length > 64) C.log.splice(0, C.log.length - 1);
      const smp = this.s[kk - this.kb - 1], d = Object.getOwnPropertyDescriptor(smp, "bones"); if (d && d.get) this.evalInto(smp, C); }
    sim.cpu.predict += now() - c0; sim.cpu.lazyFills = (sim.cpu.lazyFills || 0) + 1;
  }
  // DRIBBLE-1.2: the EXACT state of tick kk (re-stepped from the stored state at or before it — a forward cursor keeps consecutive requests cheap)
  // and the exact pose of that state with foot F's swing at path phase wq: TURN-1.2's swing path depends on the body's speed, heading and pelvis
  // drop and on the aimed plant at the tick it is evaluated, so a time-warped foot in a turning / braking motion is NOT the unwarped sample that once
  // had phase wq (the interpolation pathFrames uses, exact in steady running only)
  stateAt(kk) {
    if (kk <= this.kb) return this.parent ? this.parent.stateAt(kk) : (kk === this.kb && this.cps.has(kk) ? this.cps.get(kk) : null);
    // (DRIBBLE-1.2 CPU: every state re-stepped once is kept — exact poses ask for many ticks in no particular order; a re-step from the checkpoint
    // per request cost ~0.5 ms each)
    const sc = this.stCache || (this.stCache = new Map()); let C = sc.get(kk); if (C) return C;
    this.at(kk); const T1 = this.sim.T1, c0 = now(); let kc = null, base = null;
    for (const k of this.cps.keys()) if (k <= kk && (kc == null || k > kc)) kc = k;
    for (let q = kk - 1; q > (kc == null ? -Infinity : kc) && q >= kk - D1.cloneStride; q--) if (sc.has(q)) { kc = q; base = sc.get(q); break; }
    if (kc == null) return null; C = T1.t1Clone(base || this.cps.get(kc));
    for (let q = kc; q < kk; q++) { T1.t1Step(C, this.inp2 && q >= this.kSwitch ? this.inp2 : this.inp); if (C.log.length > 64) C.log.splice(0, C.log.length - 1); if (q + 1 < kk && !sc.has(q + 1)) sc.set(q + 1, T1.t1Clone(C)); }
    sc.set(kk, C); this.sim.cpu.predict += now() - c0; return C;
  }
  warpedBones(kk, F, wq) {
    const m = this.wbMemo || (this.wbMemo = new Map()), key = kk + F + wq.toFixed(9); let b = m.get(key); if (b !== undefined) return b;
    const C = this.stateAt(kk); if (!C || C.legs[F].stance) { m.set(key, null); return null; }
    const w0 = C.legs[F].w, c0 = now(); C.legs[F].w = wq; let ev; try { ev = this.sim.evalLite(C); } finally { C.legs[F].w = w0; }
    b = boneFrames(C, ev.fk); this.sim.cpu.predict += now() - c0; this.sim.cpu.wbExact = (this.sim.cpu.wbExact || 0) + 1; if (m.size > 6000) m.clear(); m.set(key, b); return b;
  }
  // the latest stored state at or before tick kk and after tick kMin (for a cut branch)
  checkpoint(kMin, kk) { this.at(kk); let kb = null; for (const k of this.cps.keys()) if (k <= kk && k > kMin && (kb == null || k > kb)) kb = k; return kb == null ? null : { k: kb, C: this.cps.get(kb) }; }
}
// a planning window over a track: index j ↔ state tick k0 + 1 + j, j < length (the DRIBBLE-1 prediction array's indexing, produced on demand)
class PredView {
  constructor(track, k0, n) { this.track = track; this.k0 = k0; this.length = n; this._sw = null; }
  at(j) { return j >= 0 && j < this.length ? this.track.at(this.k0 + 1 + j) : undefined; }
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
    // DRIBBLE-1.2 CPU: the planner's private predictor worlds do not build the per-step snapshot (a deep copy of the ball that step() returns and the
    // planner never reads — 20 % of all CPU in a cut): an instance override of snapshot(), the kernel's code and physics untouched (step() only
    // returns it; no substep callback is set on these worlds)
    if (!this.twin) this.Wp.snapshot = noSnap;
    this.k = 0; this.evIdx = 0; this.adjs = { R: {}, L: {} }; this.plan = null; this.lastTouch = null; this.touches = []; this.contacts = []; this.cancels = []; this.notes = [];
    this.locoCache = null; this.ballCache = null; this.held = null; this.turnLog = []; this.stageDir = null; this.ctrl = { state: "CONTROLLED", since: 0, changes: [] }; this.replanAt = 0; this.perceiveAt = 0; this.cpu = { loco: 0, ball: 0, plan: 0, predict: 0, solve: 0, commit: 0, n: 0, predTicks: 0, tracks: 0, plans: 0, viewNew: 0, viewReuse: 0, winHit: 0, winMiss: 0, ftHit: 0, ftMiss: 0, launchHit: 0, launchMiss: 0 }; this.trackSeq = 0; this.track = null;
    this.twin = !!(cfg.opts && cfg.opts.twin); this.regs = this.twin ? D1.regions : D1.regions12; this.imp = !this.twin && D1.impulseNormal; this.sweepOn = !this.twin && D1.sweep.on; this.sliceOn = !this.twin && D1.slice.on && !(cfg.opts && cfg.opts.slice === false); this.job = null; this.o2 = !this.twin && D1.o2 && !(cfg.opts && cfg.opts.o2 === false);                                          // the optimisation twin: DRIBBLE-1's football exactly (no DRIBBLE-1.1 behaviour)
    this.rollTab = this.buildRollTable();
    this.input = this.intent(0); this.A.input = this.input;
    this.evalPose(this.A); this.framesPrev = boneFrames(this.A, this.A.fk); this.rec = cfg.opts && cfg.opts.record ? [] : null; this.record();
  }
  // ── gameplay intent: the scenario's raw input; a large direction change is held until a touch can take the ball through it (carrier rule) ────
  rawInput(t) { const scn = this.cfg.scenario; let dir = scn.init.heading || 0, v = scn.init.v; for (const c of scn.cmds || []) if (t >= c.t - 1e-12) { if (c.turn != null) dir = (scn.init.heading || 0) + clamp(c.turn, -179.5, 179.5) * DEG; if (c.v != null) v = c.v; } return { dir, v }; }
  intent(k) { return this.twin ? this.intent1(k) : this.intent11(k); }
  // ── DRIBBLE-1.1 intent ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // • the touching swing is committed (no input change from the contact to that foot's touchdown);
  // • a held cut is the USER's direction — never bent by the pursuit;
  // • the carrier's pursuit after a planned touch is RELATIVE TO THE PLAN: it sets the running line itself (the planned line + a bend / pace change
  //   for the ball's actual miss), also during a staged cut (the line being run then is the stage heading); DRIBBLE-1's pursuit (bending the
  //   request toward a catch point) remains for touches without a planned window (recovery touches, deflections)
  intent11(k) {
    // DRIBBLE-1.2: a sliced release-now plan releases the held cut exactly at the tick its motion was planned with
    if (this.plan && this.plan.relAt != null && k >= this.plan.relAt) { if (this.held && !this.held.released) { this.held.released = true; this.held.releasedAt = k; this.userDir = this.held.user; this.carry = null; this.turnLog.push({ k, t: k * DT, kind: "release", by: "touch-now", id: this.plan.id }); } this.plan.relAt = null; }
    if (this.ftHold) { const L = this.A.legs[this.ftHold.F]; if (!L.stance && Math.round(L.tTO * 240) === this.ftHold.swing) return this.input; this.ftHold = null; }
    const t = k * DT, raw0 = this.rawInput(t), A = this.A, opt = this.cfg.opts || {}, cr = this.carry, same = (a, b) => Math.abs(wrapA(a - b)) < 1e-9;
    const crOk = cr && k < cr.until && opt.recover !== false && Math.abs(wrapA(cr.raw - raw0.dir)) < 1e-6;
    const bent = crOk && !cr.rel ? { dir: raw0.dir + clamp(wrapA(cr.dir - raw0.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG), v: clamp(cr.v, raw0.v - D1.recover.slow, raw0.v + D1.recover.fast) } : raw0;
    const line = crOk && cr.rel ? { dir: cr.dir, v: cr.v } : null, heldOpen = this.held && !this.held.released;
    const free = line && (heldOpen || Math.abs(wrapA(line.dir - raw0.dir)) <= D1.recover.dth * DEG + 1e-9) ? line : bent;
    if (opt.gate === false || !this.input) { this.userDir = raw0.dir; return free; }
    if (this.userDir != null && same(raw0.dir, this.userDir) && !heldOpen) { this.held = null; return free; }
    let cur = this.input; if (this.stageDir != null) { cur = { dir: this.stageDir, v: this.input.v }; if (this.held) this.held.line = this.stageDir; this.stageDir = null; }   // a staged cut: run on to the stage heading
    // the hold compares the request with the LINE of the cut so far (the line held at the request, then each stage heading) — never with the line as
    // bent by the pursuit (a bend toward the ball must not release the rest of the cut)
    // (DRIBBLE-1.2: the held cut's input is the RAW request — exactly what the intent returns once it is released (the pursuit is cleared at a
    // release), so every switch branch predicts the real post-cut motion)
    const rawCut = { dir: raw0.dir, v: this.twin ? free.v : raw0.v }, lineNow = heldOpen && this.held.line != null ? this.held.line : cur.dir, dA = Math.abs(wrapA(rawCut.dir - lineNow));
    if (this.held && !same(this.held.raw.dir, rawCut.dir)) { if (!this.held.released && same(this.held.user, raw0.dir)) this.held.raw = rawCut; else this.held = null; }
    if (dA * 180 / Math.PI <= D1.cutGate) { if (this.held && this.held.stages && !this.held.released) this.turnLog.push({ k, t, kind: "release", by: "touch-staged" }); this.held = null; this.userDir = raw0.dir; return free; }
    if (!this.held) this.held = { raw: rawCut, user: raw0.dir, since: t, released: false, line: cur.dir };
    // DRIBBLE-1.1: a momentary loss of a feasible touch (a planning gap in the turn) does not release the cut — only a ball not controlled for
    // holdGrace, or one no longer near and ahead (turning away from a ball that is still at the feet would lose it for certain)
    const nc = this.ctrl.state !== "CONTROLLED", ncLong = nc && (k - this.ctrl.since) * DT >= D1.holdGrace, b = this.ballA().p, Pw = pitch2w(A.P[0], A.P[1], 0), rel = V.sub(b, Pw), ahead = V.dot(rel, fwdW(A.psi)) > -0.2 && Math.hypot(rel[0], rel[2]) < D1.holdNear;
    if (!this.held.released && (t - this.held.since >= tab(D1.maxInterval, Math.hypot(A.V[0], A.V[1])) + D1.gateExtra || (nc && (ncLong || !ahead)))) { this.held.released = true; this.turnLog.push({ k, t, kind: "release", by: nc ? "not-controlled" : "timeout" }); }
    if (this.held.released) { this.userDir = raw0.dir; return free; }
    return { dir: line ? line.dir : cur.dir, v: free.v, holding: rawCut };                // keep running on the (pursuit-corrected) line with the ball until the cut touch
  }
  // ── DRIBBLE-1 intent (the optimisation twin) ─────────────────────────────────────────────────────────────────────────────────────────────────
  intent1(k) {
    const t = k * DT, raw0 = this.rawInput(t), A = this.A, opt = this.cfg.opts || {}, cr = this.carry;
    // CARRIER RECOVERY (gameplay): after an imperfect touch the player bends his run / changes pace toward where the free ball will actually be
    const raw = cr && k < cr.until && opt.recover !== false && Math.abs(wrapA(cr.raw - raw0.dir)) < 1e-6 ? { dir: raw0.dir + clamp(wrapA(cr.dir - raw0.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG), v: clamp(cr.v, raw0.v - D1.recover.slow, raw0.v + D1.recover.fast) } : raw0;
    if (opt.gate === false || !this.input) { this.userDir = raw0.dir; return raw; }
    // the gate holds the USER's direction changes only: the carrier's own pursuit bends (toward where the ball will be) are never held
    if (this.userDir != null && Math.abs(wrapA(raw0.dir - this.userDir)) < 1e-9 && !(this.held && !this.held.released)) { this.held = null; return raw; }
    let cur = this.input; if (this.stageDir != null) { cur = { dir: this.stageDir, v: this.input.v }; this.stageDir = null; }   // a staged cut: run on to the stage heading
    const rawCut = raw, dA = Math.abs(wrapA(rawCut.dir - cur.dir));
    if (this.held && Math.abs(wrapA(this.held.raw.dir - rawCut.dir)) > 1e-9) {            // the request changed again: re-evaluate — unless only the pursuit bend moved
      if (!this.held.released && Math.abs(wrapA(this.held.user - raw0.dir)) < 1e-9) this.held.raw = rawCut; else this.held = null; }
    if (dA * 180 / Math.PI <= D1.cutGate) { if (this.held && this.held.stages && !this.held.released) this.turnLog.push({ k, t, kind: "release", by: "touch-staged" }); this.held = null; this.userDir = raw0.dir; return raw; }
    if (!this.held) this.held = { raw: rawCut, user: raw0.dir, since: t, released: false };
    if (!this.held.released && (t - this.held.since >= tab(D1.maxInterval, Math.hypot(A.V[0], A.V[1])) + D1.gateExtra || this.ctrl.state !== "CONTROLLED")) { this.held.released = true; this.turnLog.push({ k, t, kind: "release", by: this.ctrl.state !== "CONTROLLED" ? "not-controlled" : "timeout" }); }
    if (this.held.released) { this.userDir = raw0.dir; return raw; }
    return { dir: cur.dir, v: raw.v, holding: raw };                                     // keep running on the line with the ball until the cut touch
  }
  // ── the pose: TURN-1.2's own pose, then (only while a touch adjustment acts on a swing foot) that leg re-solved with RUN-1.3's leg IK ──────────
  evalPose(A) {
    const T1 = this.T1, E = this.E, act = SIDES.filter((F) => this.adjActive(A, F));
    if (!act.length) { T1.t1Evaluate(A); A.d1adj = null; A.d11orig = null; return; }    // bit-identical to TURN-1.2 when no touch acts
    if (this.cfg.opts && this.cfg.opts.recViewer) {                                     // diagnostics only: TURN-1.2's own (unadjusted, unwarped) foot this tick
      const pO = T1.t1Pose(A), fO = E.r1FK({ body: A.body, p: pO.p }, pO, E.r1RootMatrix(A.P[0], A.P[1], A.psi, 0), this.origBuf); this.origBuf = fO; const bf = boneFrames(A, fO);
      A.d11orig = {}; for (const F of act) A.d11orig[F] = { ank: bf["foot_" + F].p, toe: V.add(bf["toe_" + F].p, M.v(bf["toe_" + F].R, [0, -0.02, 0.085])) }; }
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
    if (w <= a.wc) { const u = a.wc > a.ws + 1e-6 ? s5((w - a.ws) / (a.wc - a.ws)) : 1, o = V.lerp(a.oBase, a.o, u); if (a.sweepW) { const p = sweepP(a.ws, a.wc, w); o[0] += a.sweepW[0] * p; o[1] += a.sweepW[1] * p; o[2] += a.sweepW[2] * p; }
      return { o, r: V.lerp(a.rBase, a.r, u), yaw: lerp(a.yawBase, a.yaw, u), u }; }
    const u = s5((1 - w) / Math.max(1e-6, 1 - a.wc)), o = V.sc(a.o, u);
    if (a.caft) { const d = caftOff(a.caft, a.wc, w); o[0] += d[0]; o[1] += d[1]; o[2] += d[2]; }   // the contact-aware follow-through (yield + arc)
    if (a.sweepW) { const p = sweepP(a.ws, a.wc, w); o[0] += a.sweepW[0] * p; o[1] += a.sweepW[1] * p; o[2] += a.sweepW[2] * p; }   // DRIBBLE-1.2: the sweep's follow-on
    return { o, r: V.sc(a.r, u), yaw: a.yaw * u, u };
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
    const tr = this.track; if (tr && tr.ok && (this.input.dir !== tr.inp.dir || this.input.v !== tr.inp.v)) tr.ok = false;   // the shared track is the future only while the input is unchanged
    const c1 = now(); this.resolve(k); const c2 = now();
    T1.t1Step(A, this.input); this.evalPose(A);
    const fr = boneFrames(A, A.fk); this.setColliders(this.framesPrev, fr, k); this.framesPrev = fr;
    for (const fx of this.fixtures) this.fixtureFrames(fx, k);
    const c3 = now();
    // the ball kernel fails CLOSED (it throws rather than return an unphysical state). DRIBBLE-1: the run ends, recorded as a kernel fault.
    // DRIBBLE-1.1: the kernel is never patched — the step is re-run from its exact prior state with the wedging LEG yielding (see kernelStep)
    if (this.twin) { try { this.W.step(); } catch (e) { this.fault = { k, t: k * DT, message: String(e && e.message || e) }; this.cpu.ball += now() - c3; return; } }
    else if (!this.kernelStep(k)) { this.cpu.ball += now() - c3; return; }
    const c4 = now();
    this.post(k);
    this.k++; this.cpu.loco += (c3 - c2) + (c1 - c0); this.cpu.ball += c4 - c3; this.cpu.plan += c2 - c1; this.cpu.n++;
    this.record();
  }
  // ── DRIBBLE-1.1 PINCHED BALL: the kernel throws when a leg wedges the ball against the turf / another leg segment (its contact or CCD iteration
  // budget is exhausted) or a deliberate contact cannot separate. The world is restored to its exact state before the step (nothing of the throw
  // remains) and the step is re-run with this player's colliders that touch the ball HELD STILL for this one tick — the kinematic leg yields to the
  // ball instead of crushing it; if even that fails, those colliders are set just clear of the ball along the separating normal. The ball's own
  // state is never written. Every recovery is recorded (yields); a third failure is a fault, as before.
  kernelStep(k) {
    const W = this.W, s = { ball: structuredClone(W.ball), tick: W.tick, time: W.time, restTime: W.restTime, ev: W.events.length, actions: W.actions.slice(), ids: new Set(W.actionIds), guards: W.guards.map((g) => Object.assign({}, g)), stats: Object.assign({}, W.stats) };
    const restore = () => { W.ball = structuredClone(s.ball); W.tick = s.tick; W.time = s.time; W.restTime = s.restTime; W.events.length = s.ev; W.actions = s.actions.slice(); W.actionIds = new Set(s.ids); W.guards = s.guards.map((g) => Object.assign({}, g)); W.stats = Object.assign({}, s.stats); };
    let e1; try { W.step(); return true; } catch (e) { e1 = e; }
    const mine = W.colliders.filter((c) => c.id.startsWith(this.pid + ":") && hullDistance(c, s.ball.p, s.time).d < R + 0.06), ids = mine.map((c) => c.id);
    restore(); for (const c of mine) W.setColliderFrame(c.id, { p: c.p, q: c.q, v: [0, 0, 0], w: [0, 0, 0] });
    try { W.step(); (this.yields = this.yields || []).push({ k, t: k * DT, how: "hold", error: String(e1.message), colliders: ids }); return true; } catch (e2) {
      restore(); for (const c of mine) { const d = hullDistance(c, s.ball.p, s.time); if (d.d < R + 0.004) { const n = d.n, push = R + 0.004 - d.d; W.setColliderFrame(c.id, { p: [c.p[0] - n[0] * push, c.p[1] - n[1] * push, c.p[2] - n[2] * push], q: c.q, v: [0, 0, 0], w: [0, 0, 0] }); } }
      try { W.step(); (this.yields = this.yields || []).push({ k, t: k * DT, how: "clear", error: String(e2.message), colliders: ids }); return true; }
      catch (e3) { this.fault = { k, t: k * DT, message: String(e3 && e3.message || e3), after: [String(e1.message), String(e2.message)] }; return false; } }
  }
  run(until) { const n = Math.round((until != null ? until : this.cfg.scenario.dur) / DT); while (this.k < n && !this.fault) this.step(); return this; }
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
      if (e.kind === "AUTHORITATIVE_LAUNCH" || (e.kind === "PHYSICAL_CONTACT" && e.collider !== "turf")) this.ballEpoch = (this.ballEpoch || 0) + 1;   // DRIBBLE-1.2: the free ball changed
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
    const T = this.lastTouch; if (T && T.launched && k - T.k <= (this.twin ? 36 : 60) && k >= T.k) { const fr = this.framesPrev, b = this.ballA().p, F = T.F;
      const gb = gapTo(this.hulls["boot_" + F], fr["foot_" + F].p, fr["foot_" + F].R, b), gt = gapTo(this.hulls["toe_" + F], fr["toe_" + F].p, fr["toe_" + F].R, b);
      (T.follow = T.follow || []).push([k - T.k, +(gb * 1000).toFixed(1), +(gt * 1000).toFixed(1)]); if (k - T.k >= 1) T.minClear = Math.min(T.minClear == null ? Infinity : T.minClear, gb, gt); }
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
    else if (!this.plan && this.lastTouch && this.lastTouch.launched && k - (this.lastPursuit || 0) >= D1.pursuitEvery && this.ctrl.dist < 8) { this.recovery(k, true); this.lastPursuit = k; }   // no plan: keep chasing
    this.resolveTouch(k);
    if (k % 4 === 0 || this.clearDirty) { this.clearDirty = false; this.clearance(k); }
  }
  resolveTouch(k) { this.resolveTouch0(k); if (this.sliceOn && this.job) { const J = this.job;
      // a running pass is abandoned when what it plans on changed: the input (its prediction) or the ball (a launch / contact cleared the ball cache)
      if (J.bc && (this.ballCache !== J.bc || this.inputKey() !== J.key)) this.job = null; else { this.runJob(); if (this.job && !this.job.bc) this.job.bc = this.ballCache; } } }
  resolveTouch0(k) {
    const P = this.plan;
    if (P && P.kc === k) { this.commit(k, P); return; }
    if (P && P.kc < k) this.plan = null;
    // re-plan when due: no plan, a contact changed the ball (after the reaction time), or the input changed (locomotion prediction invalid)
    // a plan stays valid while its inputs are unchanged (same intent, same free ball); only an input change or a contact invalidates it
    const inputKey = this.inputKey(), stale = !this.locoCache || this.locoCache.key !== inputKey || (!P && this.locoCache.k0 + this.locoCache.n - (this.locoCache.need || 260) < k);
    if (k < this.perceiveAt) return;
    // DRIBBLE-1.2: while a cut is held, the plan is reconsidered every holdReplan ticks even if nothing changed — the moment the ball's ACTUAL place
    // allows a decisive contact in the turning motion (release now) can come at any tick of the run-up
    // (not a STAGED release-now plan: it was made in the staged motion itself — a re-plan from the stage would only re-stage it)
    const heldRe = this.c12Of(this.held && !this.held.released ? this.held.raw : null) && D1.cut12.holdReplan && !this.ftHold && P && k - P.made >= D1.cut12.holdReplan && P.kc - k > 6 && !(P.relInp && P.stage != null);
    // DRIBBLE-1.2: a RELEASE-NOW plan was made in the released motion itself — once the input is that released input it is still exact (the input
    // change at the release does not invalidate it; re-planning without the cut context would lose it)
    const relOk = P && P.relInp && this.input.dir === P.relInp.dir && this.input.v === P.relInp.v && !this.ftHold;
    if (P && (!stale || relOk) && !this.ballChanged(P) && !heldRe) return;
    // a held re-plan that finds no touch keeps the plan it reconsidered (still valid: same input, same free ball) — only a better plan replaces it
    const keepP = heldRe && (!stale || relOk) && !this.ballChanged(P) ? P : null, keepA = keepP ? this.adjs[P.F][P.swing] : null;
    if (!P && k < this.replanAt) return;
    if (!P && this.lastTouch && this.lastTouch.launched && (k - this.lastTouch.k) * DT < 0.12) return;
    if (this.sliceOn) { if (!this.job) this.job = { g: this.makePlanG(k, true), k0: k, key: this.inputKey(), bc: null, urgent: false }; return; }
    this.makePlan(k);
    if (keepP && !this.plan) { this.plan = keepP; if (keepA) this.adjs[keepP.F][keepP.swing] = keepA; this.cpu.heldKeep = (this.cpu.heldKeep || 0) + 1; }
    this.replanAt = this.plan ? k : k + (this.o2 && !this.reachable ? D1.o2pollFar : 6);   // no feasible touch: look again in 25 ms (o2: 50 ms when no foot can reach the ball)
  }
  // ── carrier recovery: compare the free ball's predicted path with the launch's target at the aimed window; the error becomes a small run bend and
  // pace change for the gameplay intent (the ball is never touched by this — the player adapts, then the next touch takes the ball where it is)
  recovery(k, periodic = false) {
    const T = this.lastTouch, prev = this.carry; this.carry = null; if (!T || !T.launched) return;
    // DRIBBLE-1.2: after a set-up with the switch the motion IS the planned turn: a miss is answered by the decisive touch (re-planned on the actual
    // ball), never by bending the turning run (a bend leaves the motion every decisive corridor was planned in)
    if (!this.twin && T.setupSw) return;

    // DRIBBLE-1.1: a periodic re-aim (no plan yet) keeps the correction in force unless the new one differs by more than pursuitHyst (hysteresis —
    // a fresh input means a fresh locomotion prediction)
    const keep = (nc) => { if (!this.twin && periodic && prev && nc && prev.raw === nc.raw && Math.abs(wrapA(prev.dir - nc.dir)) < D1.pursuitHyst.dir * DEG && Math.abs(prev.v - nc.v) < D1.pursuitHyst.v) { this.carry = prev; return true; } return false; };
    // PURSUIT: where must the body be at the aimed window for that foot to meet the ball where it will ACTUALLY be (its free path, error included)?
    // Without an aimed window (a recovery touch, a deflection): the earliest point where the player, at his pace, catches the free ball.
    let kT = T.expect && T.expect.k > k + 24 ? T.expect.k : null;
    if (kT == null) { const pm = this.predictBall(k, 480), P0 = pitch2w(this.A.P[0], this.A.P[1], 0), vr = Math.max(2.0, this.rawInput(k * DT).v);
      for (let j = 36; j <= 480; j += 6) { const b = pm.get(k + j); if (!b) break; const bp = K(b.p); bp[1] = 0; if (V.len(V.sub(bp, P0)) - 0.6 <= vr * j * DT) { kT = k + j; break; } }
      if (kT == null) return; }
    const nT = kT - k, map = this.predictBall(k, nT + 2), bk = map.get(kT); if (!bk) return;
    const E = T.expect, raw0 = this.rawInput(k * DT);
    // (only through a cut — a held / staged cut, or the touch that released one — where the planned motion is a turn; ordinary dribbling keeps
    // DRIBBLE-1's pursuit relative to the request, so corrections never accumulate away from the user's line or pace)
    const inCut = (this.held && !this.held.released) || !!T.release || (!this.twin && !!T.setupSw) || Math.abs(wrapA((E && E.inp ? E.inp.dir : raw0.dir) - raw0.dir)) > D1.cutGate * DEG;
    if (!this.twin && inCut && E && E.k === kT && E.com && E.target && E.inp) {
      // DRIBBLE-1.1 — PURSUIT RELATIVE TO THE PLAN: the windows were planned on a predicted motion (a cut's turn included); the player corrects that
      // motion only by the ball's actual miss of its target (execution error), not by running straight at the ball. No miss → no correction (the
      // input — and the shared prediction — stay exactly as planned)
      const Bm = K(bk.p), miss = [Bm[0] - E.target[0], 0, Bm[2] - E.target[2]], P = pitch2w(this.A.P[0], this.A.P[1], 0), dA = V.sub(E.com, P), dG = V.add(dA, miss); dA[1] = 0; dG[1] = 0;
      const Tt = nT * DT, g = this.g, adapt = 0.75 + 0.25 * clamp(0.5 * g.reactions + 0.5 * g.agility, -1, 1), q = (x, st) => Math.round(x / st) * st, pd = D1.pursuitDead;
      const bend = V.len(dA) > 0.5 ? q(adapt * clamp(wrapA(headingOf(dG) - headingOf(dA)), -D1.recover.dth * DEG, D1.recover.dth * DEG), 0.5 * DEG) : 0;
      const dv = q(adapt * clamp((V.len(dG) - V.len(dA)) / Math.max(0.3, Tt), -D1.recover.slow, D1.recover.fast), 0.1);
      const nc = { raw: raw0.dir, dir: Math.abs(bend) < pd.dir * DEG ? E.inp.dir : E.inp.dir + bend, v: Math.abs(dv) < pd.v ? E.inp.v : E.inp.v + dv, until: kT + 120, k, goal: V.add(E.com, miss), dist: V.len(dG), Tt, rel: true };
      if (prev && prev.rel && keep(nc)) return; this.carry = this.safeCarry(nc, k, T);
      if (this.carry) (this.carryLog = this.carryLog || []).push({ k, dth: this.carry.dir - E.inp.dir, dv: this.carry.v - E.inp.v, ef: V.len(miss), el: 0, rel: true }); return;
    }
    const B = K(bk.p), vb = K(bk.v), hb = Math.hypot(vb[0], vb[2]) > 0.3 ? headingOf(vb) : this.A.psi, dc = clamp(T.contactAhead || 0.6, 0.35, 0.9);
    const goal = V.sub(B, V.sc(fwdW(hb), dc)), P = pitch2w(this.A.P[0], this.A.P[1], 0), d = V.sub(goal, P); d[1] = 0;
    const raw = this.rawInput(k * DT), dist = V.len(d), Tt = nT * DT, g = this.g, adapt = 0.75 + 0.25 * clamp(0.5 * g.reactions + 0.5 * g.agility, -1, 1);
    // straight to the goal point (TURN-1.2 resolves the bend as an arc); pace to arrive on time — scaled by how fully this player adapts
    const behind = !this.twin && V.dot(d, fwdW(this.A.psi)) < 0;                       // DRIBBLE-1.1: a goal behind the player is no reason to bend
    const dir = raw.dir + (behind ? 0 : adapt * clamp(wrapA(headingOf(d) - raw.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG)), dvn = dist / Math.max(0.3, Tt) - raw.v, v = raw.v + adapt * clamp(Math.sign(dvn) * Math.max(0, Math.abs(dvn) - D1.recover.paceDead), -D1.recover.slow, D1.recover.fast);
    const q = (x, st) => Math.round(x / st) * st;
    if (this.twin) this.carry = { raw: raw.dir, dir: q(dir, 0.5 * DEG), v: q(v, 0.1), until: kT + 120, k, goal, dist, Tt };
    else {
      // DRIBBLE-1.1: the bend and the pace change are quantised RELATIVE to the request, with dead bands — a correction too small to matter for the
      // next touch (the swing adjustment absorbs it) leaves the input bit-identical, so the shared locomotion track stays valid (no new prediction)
      const pd = D1.pursuitDead, bend = q(dir - raw.dir, 0.5 * DEG), dv = q(v - raw.v, 0.1);
      const nc = { raw: raw.dir, dir: Math.abs(bend) < pd.dir * DEG ? raw.dir : raw.dir + bend, v: Math.abs(dv) < pd.v ? raw.v : raw.v + dv, until: kT + 120, k, goal, dist, Tt };
      if (prev && !prev.rel && keep(nc)) return; this.carry = this.safeCarry(nc, k, T);
    }
    if (this.carry) (this.carryLog = this.carryLog || []).push({ k, dth: this.carry.dir - raw.dir, dv: this.carry.v - raw.v, ef: dist - raw.v * Tt, el: 0 });
  }
  // DRIBBLE-1.2 SAFE PURSUIT: a pursuit bend / pace change re-plans the whole run — before it is applied, the bent motion (from the next tick) is
  // predicted for safeK seconds and both legs (boot, toe, shin, thigh; the touching foot once it has landed) are checked against the free ball:
  // a correction that would put a leg into the ball's path is halved, then dropped (DRIBBLE-1.1 applied it blind: after a cut touch a 10° bend
  // toward the ball put the other thigh into its path)
  safeCarry(nc, k, T) {
    if (this.twin || !nc || !D1.safePursuit) return nc;
    const raw = this.rawInput(k * DT), inpOf = (c) => c.rel ? { dir: c.dir, v: c.v } : { dir: raw.dir + clamp(wrapA(c.dir - raw.dir), -D1.recover.dth * DEG, D1.recover.dth * DEG), v: clamp(c.v, raw.v - D1.recover.slow, raw.v + D1.recover.fast) };
    const base = this.input, n = Math.round(D1.safePursuit / DT), bm = this.predictBall(k, n), c0 = now();
    const hits = (inp) => { if (inp.dir === base.dir && inp.v === base.v) return false; const tr = new LocoTrack(this, k, this.A, base, inp, k + 1, null);
      for (let i = 3; i <= n; i += 3) { const smp = tr.at(k + i), bk = bm.get(k + i); if (!bk || !smp.bones) continue; const b = K(bk.p);
        for (const F of SIDES) { if (T && T.F === F && !smp.legs[F].stance && smp.legs[F].swing === T.swing) continue;   // the touching swing: its follow-through is solved
          const foot = smp.bones["foot_" + F], toe = smp.bones["toe_" + F], dF = Math.hypot(b[0] - foot.p[0], b[2] - foot.p[2]); if (dF > 0.9) continue;
          if (dF < 0.4 && (gapAtLeast(this.hulls["boot_" + F], foot.p, foot.R, b, 0) < 0 || gapAtLeast(this.hulls["toe_" + F], toe.p, toe.R, b, 0) < 0)) return true;
          const C = this.cfg.colliders.sides[F]; for (const part of ["shin", "thigh"]) if (capGap(C[part], smp.bones[part + "_" + F], b) < 0) return true; } }
      return false; };
    let out = nc;
    if (hits(inpOf(nc))) { const half = Object.assign({}, nc, { dir: base.dir + 0.5 * wrapA(nc.dir - base.dir), v: base.v + 0.5 * (nc.v - base.v) }); out = hits(inpOf(half)) ? null : half; (this.pursuitLog = this.pursuitLog || []).push({ k, cut: out ? "half" : "dropped" }); }
    this.cpu.safe = (this.cpu.safe || 0) + (now() - c0); return out;
  }
  // ── clearance: a swing that is NOT making a deliberate touch must not sweep through the free ball. Its predicted path (TURN-1.2 + its current
  // adjustment) is checked against the predicted free ball; if it would hit it, a bounded avoidance offset (zero at both swing ends: sideways away
  // from the ball, shorter, slightly higher) is applied. If even that cannot clear it, nothing is faked: the contact stays physical.
  clearance(k) {
    let LC = this.locoCache; const ik = this.inputKey();
    if (!LC || LC.key !== ik) {
      // the main prediction is stale (the intent just changed — a pursuit re-aim or a released cut, often right after a launch): with a swing foot near
      // the ball, a short fresh prediction for clearance only (cached per input), so the follow-through withdrawal never lapses
      const b = this.ballA().p, fr = this.framesPrev, near = SIDES.some((F) => !this.A.legs[F].stance && fr && Math.hypot(b[0] - fr["foot_" + F].p[0], b[2] - fr["foot_" + F].p[2]) < 0.8);
      if (!near) return;
      if (!this.clrCache || this.clrCache.key !== ik || this.clrCache.k0 + this.clrCache.pred.length - 8 < k) this.clrCache = { key: ik, k0: k, pred: this.viewFor(k, Math.round(0.3 / DT)) };
      LC = this.clrCache;
    }
    const off = k - LC.k0, pred = LC.pred; if (off < 0 || off >= pred.length - 2) return;
    if (!this.ballCache || this.ballChangedCache()) { if (!this.ballCache || this.ballCache.k0 !== k) this.ballCache = { k0: k, n: Math.round(D1.horizon / DT), map: this.predictBall(k, Math.round(D1.horizon / DT)) }; }
    for (const F of SIDES) {
      const L = this.A.legs[F]; if (L.stance) continue; const swing = Math.round(L.tTO * 240), w0 = clamp(L.w || 0, 0, 1);
      if (this.plan && this.plan.F === F && this.plan.swing === swing) continue;          // this swing is the touch
      const a = this.getAdj(F, swing);
      if (a && a.kc >= k && !a.dropped && !a.avoid) continue;                             // a touch still to come is never overridden (after the touch: the boot withdraws if needed)
      // (DRIBBLE-1.2: with the exact foot model the avoidance margin is clear.margin12 — an avoidance for a near-miss moves the whole leg, and its
      // shin / thigh are not part of this check: a 24 mm "near-miss" avoided put the other thigh into the ball)
      const cm = this.twin ? D1.clear.margin : D1.clear.margin12, solved = !this.twin && a && a.ftSolved && a.kc < k && !a.avoid, thrC = solved ? D1.followGap * 0.5 : cm;
      if (!this.twin && w0 > D1.clear.lateW) continue;                                   // DRIBBLE-1.1: no new avoidance in the swing's last part (it could only snap the landing)   // (DRIBBLE-1.1: the solved follow-through is trusted unless it would still hit)
      // closest approach over the rest of this swing, with the adjustment currently in force
      let worst = null;
      for (let j = off + 1; j < pred.length - 1; j++) { const smp = pred.at(j), Lp = smp.legs[F]; if (Lp.stance || Lp.swing !== swing) break; if (!smp.bones) continue; const bk = this.ballCache.map.get(smp.k); if (!bk) break;
        const b = K(bk.p), foot = smp.bones["foot_" + F]; if (Math.hypot(b[0] - foot.p[0], b[2] - foot.p[2]) > 0.55) continue;
        const wb = !this.twin && a && a.warp ? this.pathFrames(pred, F, swing, warpAt(a.warp, Lp.w), j, smp) : null, fo = wb ? wb["foot_" + F] : foot, to = wb ? wb["toe_" + F] : smp.bones["toe_" + F];   // DRIBBLE-1.1: the foot where its warp puts it
        const q = a ? this.adjAt(a, Lp.w) : { o: [0, 0, 0], r: [0, 0, 0] }, Rw = M.exp(q.r), toe = to; let ank = V.add(fo.p, q.o);
        // DRIBBLE-1.2: the follow-through HOLD exactly as the pose applies it (DRIBBLE-1.1 left it out here: a touching swing held back from running
        // ahead of its contact posture looked as if it ran into the ball, and the false alarm's avoidance — the warp sent home — drove it into the ball)
        if (!this.twin && a && a.hold != null && Lp.w > a.wc) { const f = fwdW(smp.psi), com = pitch2w(smp.P[0], smp.P[1], 0), fz = V.dot(V.sub(ank, com), f), rel = 1 - s5((Lp.w - D1.hold.from) / D1.hold.span);
          if (fz > a.hold && rel > 0) ank = V.sub(ank, V.sc(f, Math.min(fz - a.hold, D1.hold.max) * rel)); }
        const toeP = V.add(ank, M.v(Rw, V.sub(toe.p, fo.p)));
        const gb = gapAtLeast(this.hulls["boot_" + F], ank, M.mul(Rw, fo.R), b, D1.clear.margin), gt = gapAtLeast(this.hulls["toe_" + F], toeP, M.mul(Rw, toe.R), b, D1.clear.margin), gmin = Math.min(gb, gt);
        if (!worst || gmin < worst.g) worst = { g: gmin, j, w: Lp.w, b, ank, smp, toeP, gb, gt }; }
      if (this.dbgClr && a && a.ftSolved && worst) this.dbgClr.push({ k, F, swing, worstK: worst.smp.k, g: worst.g, gb: worst.gb, gt: worst.gt, ank: worst.ank, toeP: worst.toeP, b: worst.b, w: worst.w, src: LC === this.clrCache ? "clr" : "main" });
      if (!worst || worst.g > thrC) continue;
      if (a && a.avoid && worst.g > 0.004) continue;                                      // already avoiding and clear enough
      // away from the ball, in the player's heading frame: sideways to the foot's own side, back (a shorter step), a little up
      const th = worst.smp.psi, f = fwdW(th), r = rgtW(th), sg = F === "R" ? 1 : -1, d = V.sub(worst.ank, worst.b), dl = V.dot(d, r), need = cm + 0.012 - worst.g;
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
  // the planning window (n ticks from tick k) over the player's own input: the shared track, re-used while the input has stayed bit-identical
  viewFor(k, n) {
    const tr = this.track, inp = this.input;
    if (!(tr && tr.ok && tr.inp.dir === inp.dir && tr.inp.v === inp.v && tr.kb <= k)) { this.track = new LocoTrack(this, k, this.A, inp); this.cpu.viewNew++; } else this.cpu.viewReuse++;
    return new PredView(this.track, k, n);
  }
  // TURN-1.2's pose and forward kinematics of a prediction copy (t1Evaluate without the skinning matrices: the resolver reads bone frames only)
  evalLite(C) { const pose = this.T1.t1Pose(C), rootM = this.E.r1RootMatrix(C.P[0], C.P[1], C.psi, 0), fk = this.E.r1FK({ body: C.body, p: pose.p }, pose, rootM, C.fkBuf); C.fkBuf = fk; C.pose = pose; C.fk = fk; return { pose, fk }; }
  predictBall(k, n) {                                                                  // the free ball (no colliders) from the actual state: exact while untouched
    const W = this.W, Wp = this.Wp; Wp.ball = structuredClone(W.ball); Wp.tick = W.tick; Wp.time = W.time; Wp.restTime = W.restTime; Wp.events = []; Wp.actions = []; Wp.guards = []; Wp.actionIds = new Set();
    const out = new Map(); out.set(k, { p: W.ball.p.slice(), v: W.ball.v.slice() });
    for (let j = 1; j <= n; j++) { Wp.step(); out.set(k + j, { p: Wp.ball.p.slice(), v: Wp.ball.v.slice(), mode: Wp.ball.mode }); }
    return out;
  }
  // the exact free ball after a launch (BallWorld, no colliders): anim3d position / velocity at each of the next n ticks
  simLaunch(p0, v0, n) {
    const key = p0[0] + "," + p0[1] + "," + p0[2] + "|" + v0[0] + "," + v0[1] + "," + v0[2], mc = this.launchMemo || (this.launchMemo = new Map()), hit = mc.get(key);
    if (hit && hit.length >= n) { this.cpu.launchHit++; return hit.length === n ? hit : hit.slice(0, n); } this.cpu.launchMiss++;
    const tr = this.simLaunch0(p0, v0, n); if (mc.size > 256) mc.clear(); mc.set(key, tr); return tr;
  }
  simLaunch0(p0, v0, n) {
    const B = this.ballCfg, vk = K(v0), Wq = this.Wq || (this.Wq = new B.World(Object.assign({}, B.options, { p: [0, R, 0], dt: DT, substeps: 1, parameters: B.parameters, colliders: [] }))); if (!this.twin && Wq.snapshot !== noSnap) Wq.snapshot = noSnap;
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
  // the striking hull of a rotated foot (Rw about the ankle; the toe follows the foot rigidly) and its support point in direction n: a toe surface
  // (FRONT / LACES) the toe hull, a boot surface the boot hull, a SIDE surface (DRIBBLE-1.2 INSIDE / OUTSIDE) whichever reaches further along n
  strikeHull(F, rg, Rw, foot, toe, n) {
    const ank = foot.p, RF = M.mul(Rw, foot.R), toeP = V.add(ank, M.v(Rw, V.sub(toe.p, ank))), RT = M.mul(Rw, toe.R);
    const sup = (pts, Rh, oh) => { let best = -Infinity, cl = null; for (const p of pts) { const q = M.v(Rh, p), s = V.dot(q, n); if (s > best) { best = s; cl = q; } } return { s: best + V.dot(oh, n), cl }; };
    if (rg.hull === "toe") { const t = sup(this.J.sides[F].toe.points, RT, toeP); return { hull: "toe", cW: V.add(toeP, t.cl), RF, RT, toeP }; }
    const b = sup(this.J.sides[F].boot.points, RF, ank); if (rg.hull === "boot") return { hull: "boot", cW: V.add(ank, b.cl), RF, RT, toeP };
    const t = sup(this.J.sides[F].toe.points, RT, toeP); return t.s > b.s ? { hull: "toe", cW: V.add(toeP, t.cl), RF, RT, toeP } : { hull: "boot", cW: V.add(ank, b.cl), RF, RT, toeP };
  }
  // the region rotation and support point alone (no reach / ground checks): used to aim the next touch
  regionPose(smp, F, regName, nL, elev) {
    const ce = Math.cos(elev), se = Math.sin(elev), n = [nL[0] * ce, se, nL[2] * ce], reg = this.regs[regName], sgx = F === "R" ? 1 : -1, foot = smp.bones["foot_" + F], toe = smp.bones["toe_" + F];
    const dLoc = [reg.d[0] * sgx, reg.d[1], reg.d[2]], R0 = reg.hull === "toe" ? toe.R : foot.R, a = M.v(R0, dLoc), yaw = wrapA(Math.atan2(n[0], n[2]) - Math.atan2(a[0], a[2])), Ry = M.y(yaw), a1 = M.v(Ry, a);
    const pitch = Math.atan2(n[1], Math.hypot(n[0], n[2])) - Math.atan2(a1[1], Math.hypot(a1[0], a1[2])), ax = V.norm(V.cross([n[0], 0, n[2]], [0, 1, 0])), Rw = M.mul(M.exp(V.sc(ax, pitch)), Ry);
    const st = this.strikeHull(F, reg, Rw, foot, toe, n);
    return { n, yaw, pitch, Rw, cW: st.cW, hull: st.hull };
  }
  // the region's yaw requirement depends on the normal's horizontal direction only (every contact elevation shares it to ~1e-16 rad): one test
  // rejects all elevations of a region (with a 1e-9 rad margin, so no decision near the limit changes)
  yawOut(smp, F, regName, nL) {
    const reg = this.regs[regName], sgx = F === "R" ? 1 : -1, bn = smp.bones, R0 = reg.hull === "toe" ? bn["toe_" + F].R : bn["foot_" + F].R, a = M.v(R0, [reg.d[0] * sgx, reg.d[1], reg.d[2]]);
    return Math.abs(wrapA(Math.atan2(nL[0], nL[2]) - Math.atan2(a[0], a[2]))) > reg.yawMax * DEG * (0.9 + 0.1 * this.reachK()) + 1e-9;
  }
  // ── candidate contact geometry: region rotation (yaw + pitch), support point, offset, bounds, ground, reach, closing, toe clearance ─────────────
  contactGeom(smp, F, regName, nL, ball, vBall, elev = 0) {
    const ce = Math.cos(elev), se = Math.sin(elev), n = [nL[0] * ce, se, nL[2] * ce];   // the contact normal: the launch direction tilted up (contact below the equator)
    const reg = this.regs[regName], sgx = F === "R" ? 1 : -1, bn = smp.bones, foot = bn["foot_" + F], toe = bn["toe_" + F];
    const dLoc = [reg.d[0] * sgx, reg.d[1], reg.d[2]], HB = this.hulls["boot_" + F], HT = this.hulls["toe_" + F];
    // region direction now (world), required yaw (about up) and pitch (about the horizontal axis ⟂ n) to face n
    const R0 = reg.hull === "toe" ? toe.R : foot.R, a = M.v(R0, dLoc), hA = Math.atan2(a[0], a[2]), hN = Math.atan2(n[0], n[2]);
    let yaw = wrapA(hN - hA); const ya = this.reachK();
    const rj = this.rej; if (Math.abs(yaw) > reg.yawMax * DEG * (0.9 + 0.1 * ya)) { if (rj) rj.yaw = (rj.yaw || 0) + 1; return null; }
    const Ry = M.y(yaw), a1 = M.v(Ry, a), elA = Math.atan2(a1[1], Math.hypot(a1[0], a1[2])), elN = Math.atan2(n[1], Math.hypot(n[0], n[2])), pitch = elN - elA;
    if (Math.abs(pitch) > reg.pitchMax * DEG) { if (rj) rj.pitch = (rj.pitch || 0) + 1; return null; }
    const ax = V.norm(V.cross([n[0], 0, n[2]], [0, 1, 0])), Rw = M.mul(M.exp(V.sc(ax, pitch)), Ry), rv = M.log(Rw);   // + pitch raises the region toward + elevation
    // rotated hull about the ankle (the toe follows the foot rigidly), support point in direction n (a side surface: the hull that reaches furthest)
    const ank = foot.p, st = this.strikeHull(F, reg, Rw, foot, toe, n), RF = st.RF, toeP = st.toeP, RT = st.RT, hullName = st.hull;
    const cW = st.cW, target = V.sub(ball, V.sc(n, R + D1.gap0)), o = V.sub(target, cW);
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
  // ── DRIBBLE-1.2 FUTURE CONTACT CORRIDOR ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // For one predicted swing pose (path phase gs), foot F, boot surface reg, launch direction nH (horizontal unit) and contact elevation elev, the
  // contact check above depends on the BALL only through the offset o = ball − n(R + gap) − cW: the region's rotation and its support point cW do not
  // depend on where the ball is. For a ball on the turf the vertical offset is fixed, so every check but one is a bound on the horizontal offset:
  // along-heading [−back, ahead], sideways ±lat (agility-scaled), the unwind disk |o| ≤ offRate·tRem + 0.04 and the leg's reach sphere (a disk in
  // the plane of o). The CORRIDOR is that convex set of ball-centre positions (pitch plane): where the physical ball must be at this tick for this
  // surface to meet it with this launch. Returned: why (the first check that no ball position can satisfy) or the set (box in the heading frame +
  // two disks) with its max-margin point (the robust target) and margin. The other hull's clearance is checked at the target (it depends on the
  // position).
  corridor(gs, F, reg, nH, elev) {
    const ce = Math.cos(elev), se = Math.sin(elev), n = [nH[0] * ce, se, nH[2] * ce], rg = this.regs[reg], sgx = F === "R" ? 1 : -1, bn = gs.bones, foot = bn["foot_" + F], toe = bn["toe_" + F];
    const R0 = rg.hull === "toe" ? toe.R : foot.R, a = M.v(R0, [rg.d[0] * sgx, rg.d[1], rg.d[2]]), ya = this.reachK();
    const yaw = wrapA(Math.atan2(n[0], n[2]) - Math.atan2(a[0], a[2])); if (Math.abs(yaw) > rg.yawMax * DEG * (0.9 + 0.1 * ya)) return { why: "yaw", yaw };
    const Ry = M.y(yaw), a1 = M.v(Ry, a), pitch = Math.atan2(n[1], Math.hypot(n[0], n[2])) - Math.atan2(a1[1], Math.hypot(a1[0], a1[2])); if (Math.abs(pitch) > rg.pitchMax * DEG) return { why: "pitch", yaw, pitch };
    const ax = V.norm(V.cross([n[0], 0, n[2]], [0, 1, 0])), Rw = M.mul(M.exp(V.sc(ax, pitch)), Ry), rv = M.log(Rw), ank = foot.p, st = this.strikeHull(F, rg, Rw, foot, toe, n), RF = st.RF, toeP = st.toeP, RT = st.RT, hull = st.hull;
    const cW = st.cW, ov = R - n[1] * (R + D1.gap0) - cW[1], rk = this.reachK();
    if (ov > D1.reach.up || ov < -D1.reach.down) return { why: "vert", ov };
    const tRem = gs.legs[F].tTDf != null ? Math.max(0, gs.legs[F].tTDf - gs.k * DT) : 0.05; if (V.len(rv) > D1.rotRate * tRem + 0.12) return { why: "unwind", rot: V.len(rv) };
    let low = Infinity; for (const p of this.J.sides[F].boot.points) low = Math.min(low, ank[1] + ov + M.v(RF, p)[1]); for (const p of this.J.sides[F].toe.points) low = Math.min(low, toeP[1] + ov + M.v(RT, p)[1]);
    if (low < D1.floor) return { why: "ground", low };
    const rU = D1.offRate * tRem + 0.04; if (Math.abs(ov) >= rU) return { why: "unwindO", ov, rU };
    const hip = bn["thigh_" + F].p, tl = this.A.body.thigh + this.A.body.shank, dy = ank[1] + ov - hip[1], rI2 = Math.pow(D1.reach.ik * tl, 2) - dy * dy; if (rI2 <= 0) return { why: "ik" };
    // the horizontal-offset set in the heading frame (u = along f, v = along r): box ∩ disk(0, ρ1) ∩ disk(c2, ρ2)
    const f = fwdW(gs.psi), r = rgtW(gs.psi), box = [-D1.reach.back * rk, D1.reach.ahead * rk, -D1.reach.lat * rk, D1.reach.lat * rk], rho1 = Math.sqrt(rU * rU - ov * ov), rho2 = Math.sqrt(rI2);
    const hv = [hip[0] - ank[0], 0, hip[2] - ank[2]], c2 = [V.dot(hv, f), V.dot(hv, r)];
    const m = maxMargin(box, rho1, c2, rho2); if (!m) return { why: "empty", box, rho1, c2, rho2 };
    const base = V.add(cW, V.sc(n, R + D1.gap0)), ballAt = (u, v) => { const p = V.add(base, V.add(V.sc(f, u), V.sc(r, v))); p[1] = R; return p; };
    return { why: null, reg, F, hull, n, elev, yaw, pitch, rv, Rw, cW, ov, base, f, r, box, rho1, c2, rho2, center: ballAt(m.u, m.v), margin: m.m, uv: [m.u, m.v], ballAt, low };
  }
  // is a ball centre (pitch plane, on the turf) inside a corridor? (the signed margin: > 0 inside)
  corridorMargin(cor, ball) { const d = V.sub(ball, cor.base), u = V.dot(d, cor.f), v = V.dot(d, cor.r); return marginAt(cor.box, cor.rho1, cor.c2, cor.rho2, u, v); }
  elevs() { return this.arch !== "A" ? D1.elevs : D1.elevsPhys; }   // a physical push (A / C) lifts the ball along the contact normal: meet it near the equator
  reachK() { return 1 + 0.25 * clamp(this.g.agility, -1, 1); }
  bootVel(pred, j, F, cLocal) {                                                        // world velocity of a boot-fixed point between samples j and j+1
    const sa = pred.at(j), a = sa && sa.bones, b = pred.at(j + 1) && pred.at(j + 1).bones; if (!a || !b) return null;
    const fa = a["foot_" + F], fb = b["foot_" + F], la = M.v(M.tr(fa.R), V.sub(cLocal, fa.p)), pb = V.add(fb.p, M.v(fb.R, la)); return V.sc(V.sub(pb, cLocal), 1 / DT);
  }
  // the next-window target: where the ball centre should be when a future swing reaches its contact phase (the centre of that window's envelope)
  // Every future swing offers a RANGE of contact phases: the forward extension (the push, the boot faster than the body) through the retraction
  // (slow). Each phase is a candidate target: the ball centre just ahead of the toe tip at that tick, with that phase's boot speed.
  windowTargets(pred, jFrom, jTo, s, cutDir = null) {
    const out = [], memo = pred.track.memo, k1 = pred.k0 + 1, cm = cutDir == null ? 0 : 1;
    const rj = this.rej; this.rej = null;                                               // the envelope probes are not planning rejections
    const j0w = this.o2 ? jFrom + ((6 - ((k1 + jFrom) % 6)) % 6) : jFrom;              // (o2: probes on absolute multiples of 6 ticks)
    for (let j = j0w; j < Math.min(jTo, pred.length - 1); j += this.o2 ? D1.o2winStep : 3) for (const F of SIDES) {
      const L = pred.at(j).legs[F]; if (L.stance || L.w < D1.wTarget[0] || L.w > D1.wTarget[1]) continue;
      // the foot may meet the ball at this tick on an EARLIER phase of its own path (the time-warp): each candidate path phase gives a target — the
      // CENTRE of that pose's feasible envelope (probed with the real contact check) — and the boot speed available there (the warp only slows it).
      // A window depends on the track's samples only: kept per track by absolute tick
      for (let d = 0; d <= D1.warp.maxBack; d += 12) {
        const jp = j - d; if (jp < 0) break;
        const key = cm ? "c" + cutDir.toFixed(6) + ":" + ((k1 + j) * 8 + (F === "R" ? 0 : 4) + d / 12) : (k1 + j) * 8 + (F === "R" ? 0 : 4) + d / 12; let e = memo.get(key);
        if (e === undefined) { e = this.windowAt(pred, j, jp, F, L, d, cutDir); memo.set(key, e); this.cpu.winMiss++; } else this.cpu.winHit++;
        if (e === "break") break; if (e === null) continue;
        if (Array.isArray(e)) { for (const x of e) out.push({ j, k: x.k, F, swing: x.swing, w: x.w, wp: x.wp, q: x.q, span: x.span, vBoot: x.vBoot, com: x.com, dir: x.dir, warped: x.warped, corr: x.corr || null }); continue; }
        out.push({ j, k: e.k, F, swing: e.swing, w: e.w, wp: e.wp, q: e.q, span: e.span, vBoot: e.vBoot, com: e.com, dir: e.dir, warped: e.warped, corr: e.corr || null });
      }
    }
    this.rej = rj; return out;
  }
  windowAt(pred, j, jp, F, L, d, cutDir = null) {
    if (cutDir != null && !this.twin) return this.corridorWindow(pred, j, jp, F, L, d, cutDir);
    // DRIBBLE-1.1: a CUT window (for a set-up touch under a held cut): the envelope where this swing can push the ball part of the way into the cut
    // (inside / outside / laces / front) — the set-up touch places the ball there, so the next touch can take it across
    const smj = pred.at(j), th = headingOf([smj.V[0], 0, -smj.V[1]]), h0 = Math.hypot(smj.V[0], smj.V[1]) > 0.3 ? th : smj.psi, dir = cutDir == null ? fwdW(h0) : fwdW(h0 + D1.cutGenFrac * wrapA(cutDir - h0)), rgt = rgtW(th);
    const regs = cutDir == null ? D1.targetRegions : ["INSIDE", "OUTSIDE", "LACES", "FRONT"];
    const sp = pred.at(jp); if (!sp || !sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) return "break";
    const gs = { bones: sp.bones, psi: smj.psi, legs: smj.legs, k: smj.k, P: smj.P };
    // (DRIBBLE-1.2: the dribble LANE — the ball is placed winLatK of the way from the body's line to the next foot's line; DRIBBLE-1 / 1.1 used 0.8,
    // a ball square in front of one foot, from which only that foot's toe can move it)
    const foot = sp.bones["foot_" + F], com = pitch2w(smj.P[0], smj.P[1], R), lat = V.dot(V.sub(foot.p, com), rgt) * (this.twin ? 0.8 : D1.winLatK), base = V.add(com, V.sc(rgt, lat));
    let lo = null, hi = null, cW = null;
    const probe = (fx) => { const ball = V.add(base, V.sc(dir, fx)); let ok = null;
      for (const reg of regs) { if (this.yawOut(gs, F, reg, dir)) continue; for (const e of [10, 20, 30]) { ok = this.contactGeom(gs, F, reg, dir, ball, [0, 0, 0], e * DEG); if (ok) break; } if (ok) break; } return ok; };
    if (!this.o2) { for (let fx = 0.2; fx <= 1.0; fx += 0.05) { const ok = probe(fx); if (ok) { if (lo == null) lo = fx; hi = fx; if (!cW || Math.abs(fx - (lo + hi) / 2) < 0.03) cW = ok.cW; } } }
    else {   // o2: the envelope at 0.1 m, its ends refined to 0.05 m, the boot point from the probe nearest its middle
      const hits = []; for (let i = 0; i <= 8; i++) { const fx = 0.2 + 0.1 * i, ok = probe(fx); if (ok) hits.push([fx, ok]); }
      if (hits.length) { lo = hits[0][0]; hi = hits[hits.length - 1][0]; if (lo > 0.2 + 1e-9 && probe(lo - 0.05)) lo -= 0.05; if (hi < 1.0 - 1e-9 && probe(hi + 0.05)) hi += 0.05;
        const mid = (lo + hi) / 2; let bst = hits[0]; for (const h of hits) if (Math.abs(h[0] - mid) < Math.abs(bst[0] - mid)) bst = h; cW = bst[1].cW; } }
    if (lo == null) return null;
    const mid = (lo + hi) / 2, q = V.add(base, V.sc(dir, mid)); q[1] = R;
    return { k: smj.k, swing: L.swing, w: L.w, wp: sp.legs[F].w, q, span: hi - lo, vBoot: this.bootVel(pred, jp, F, cW), com: pitch2w(smj.P[0], smj.P[1], 0), dir, warped: d > 0 };
  }
  // DRIBBLE-1.2 SET-UP WINDOW: under a held cut, a later swing's DECISIVE-CONTACT CORRIDOR — the ball-centre positions where one of its surfaces
  // (inside / outside / laces / front) would meet the ball with a launch decFrac of the way into the cut — and its max-margin point, the set-up
  // touch's target (the other hull's clearance is checked there). The widest corridor over the surfaces and elevations is kept.
  corridorWindow(pred, j, jp, F, L, d, cutDir) {
    const C = D1.cut12, smj = pred.at(j), th = headingOf([smj.V[0], 0, -smj.V[1]]), h0 = Math.hypot(smj.V[0], smj.V[1]) > 0.3 ? th : smj.psi, hDec = h0 + C.decFrac * wrapA(cutDir - h0), uDec = fwdW(hDec);
    // (the decisive contact's impulse normal: the ball arriving along the body's line at about two thirds of its speed, the decisive launch provisional)
    const sv = Math.hypot(smj.V[0], smj.V[1]), vEst = V.sc(fwdW(h0), 0.65 * sv), nDec = this.impN(uDec, this.provS(sv, vEst, uDec), vEst);
    const sp = pred.at(jp); if (!sp || !sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) return "break";
    const gs = { bones: sp.bones, psi: smj.psi, legs: smj.legs, k: smj.k, P: smj.P }; const bestBy = {};
    for (const reg of C.regs) { if (this.yawOut(gs, F, reg, nDec)) continue;
      for (const e of C.elevs) { const c = this.corridor(gs, F, reg, nDec, e * DEG); if (c.why || (bestBy[reg] && c.margin <= bestBy[reg].margin)) continue;
        const g = this.contactGeom(gs, F, reg, nDec, c.center, [0, 0, 0], e * DEG); if (!g) continue;    // the other hull at the target
        bestBy[reg] = Object.assign(c, { g }); } }
    const ranked = Object.values(bestBy).sort((a, b) => b.margin - a.margin); if (!ranked.length) return null;
    // the corridor is a REGION: besides its max-margin point, targets shifted sideways across it (the set-up may then send the ball a little off its
    // own foot's landing line — a soft straight push mid-swing would put the ball where that foot plants), and the next-best surface's centre
    const out = [], mk = (cr, q, m) => ({ k: smj.k, swing: L.swing, w: L.w, wp: sp.legs[F].w, q, span: 2 * m, vBoot: this.bootVel(pred, jp, F, cr.g.cW), com: pitch2w(smj.P[0], smj.P[1], 0), dir: nDec, warped: d > 0,
      corr: { reg: cr.reg, hull: cr.hull, n: nDec, u: uDec, hDec, margin: m, elev: cr.elev, k: smj.k, F } });
    const b0 = ranked[0]; out.push(mk(b0, b0.center, b0.margin));
    for (const dv of C.shifts) { const u = b0.uv[0], v = b0.uv[1] + dv, m = marginAt(b0.box, b0.rho1, b0.c2, b0.rho2, u, v); if (m < C.shiftMinMargin) continue;
      const q = b0.ballAt(u, v); if (!this.contactGeom(gs, F, b0.reg, nDec, q, [0, 0, 0], b0.elev)) continue; out.push(mk(b0, q, m)); }
    if (ranked[1] && ranked[1].margin >= C.shiftMinMargin) out.push(mk(ranked[1], ranked[1].center, ranked[1].margin));
    return out;
  }
  // ── make a plan: the best feasible contact in the predicted locomotion for the actual (free) ball, then its launch ─────────────────────────────
  makePlan(k) { const g = this.makePlanG(k, false); while (!g.next().done); }
  // DRIBBLE-1.2 TIME-SLICED PLANNING: the planning pass is a generator — it yields after every contact tick of the candidate generation and before
  // every plan version it evaluates; the resolver advances it by a fixed budget of work units per 240 Hz tick (deterministic: a count, never the
  // clock), so no single tick carries a whole pass. sliced = false runs it to the end at once (the twin, the tools, urgent passes).
  *makePlanG(k, sliced) {
    // (DRIBBLE-1.1: decisions read the speed to 0.01 m/s and compare costs to 1e-9 — a last-bit difference between engines' maths libraries cannot
    // flip a choice)
    this.cpu.plans++; const c0 = now(), A = this.A, s = this.twin ? Math.hypot(A.V[0], A.V[1]) : Math.round(Math.hypot(A.V[0], A.V[1]) * 100) / 100, held = this.held && !this.held.released ? this.held.raw : null;
    // lookahead: the contact search (1.6 s) + the longest interval to the next touch at this speed + margin; refreshed before the tail is needed
    const H = Math.round((1.6 + tab(D1.maxInterval, Math.max(s, A.input.v)) + 0.5) / DT), need = Math.round((1.0 + tab(D1.maxInterval, Math.max(s, A.input.v))) / DT);
    const key = this.inputKey();
    if (!this.locoCache || this.locoCache.key !== key || this.locoCache.k0 + this.locoCache.n - need < k) this.locoCache = { key, k0: k, n: H, need, pred: this.viewFor(k, H), alt: null };   // (release-NOW was tried and rejected: re-planned swings run into the placed ball)
    const LC = this.locoCache, off = k - LC.k0;
    if (!this.ballCache || this.ballChangedCache() || this.ballCache.k0 + this.ballCache.n - need < k) { if (this.ballCache && this.ballChangedCache()) this.ballEpoch = (this.ballEpoch || 0) + 1; this.ballCache = { k0: k, n: H, map: this.predictBall(k, H) }; }
    // candidate contacts: the current motion; while a cut is held, also the motion with the cut released NOW (take the ball through the turn)
    const opts = [{ pred: LC.pred, off, release: false }]; if (LC.alt) opts.push({ pred: LC.alt, off, release: true });
    // DRIBBLE-1.2 RELEASE NOW: while a cut is held (and no touching swing is committed), the motion with the cut released from the next tick — TURN-1.2
    // brakes and plants at once, and a decisive contact on the plant / exit swing takes the ball with the turn (body and ball turn together)
    this.c12 = this.c12Of(held);                                                       // DRIBBLE-1.2: the cut machinery for meaningful cuts only
    // (a sliced pass releases at a fixed tick a few ticks ahead — the pass is certain to have finished by then: the plan releases the input exactly
    // there, the motion it was planned in)
    if (this.c12 && D1.cut12.releaseNow && !this.ftHold) { const relInp = { dir: held.dir, v: this.rawInput(k * DT).v }, kS = sliced ? k + D1.slice.relDelay : k + 1;
      // DRIBBLE-1.2 STAGED RELEASE-NOW (big cuts): the body turns only part of the way now (stageFrac of the requested change) — it goes where the first
      // touch can take the ball, and the rest of the cut stays held for the next touch (a full 90° turn after a 20–35° first touch left the ball)
      const V0 = this.A.V, h0 = Math.hypot(V0[0], V0[1]) > 0.3 ? Math.atan2(V0[1], V0[0]) : this.A.psi, dA = wrapA(held.dir - h0), big = Math.abs(dA) >= D1.cut12.stagedMin * DEG;
      opts.push({ pred: new PredView(new LocoTrack(this, k, this.A, this.input, relInp, kS, null), k, H), off: 0, release: true, now: relInp, kS, bigNow: big });
      if (big) { const stInp = { dir: h0 + D1.cut12.stageFrac * dA, v: relInp.v };
        opts.push({ pred: new PredView(new LocoTrack(this, k, this.A, this.input, stInp, kS, null), k, H), off: 0, release: true, now: stInp, kS, staged: stInp.dir }); } }
    const cands = [], rj = (key) => { if (this.rej) this.rej[key] = (this.rej[key] || 0) + 1; if (this._dbgT && !this._dbgT.why) this._dbgT.why = key; };   // (diagnostics: the first failure of the version being tried)
    // DRIBBLE-1.2 CPU — CACHED FOOT OPPORTUNITIES: candidates generated over a motion (track) for a free ball (ball epoch), a held cut and a last
    // touch are kept; a later pass over the same ones re-uses them (with their approach checks and version results) and generates only the contact
    // ticks beyond those already covered. Any change — an input (a new track), a launch or contact (a new ball epoch), the last touch — is a miss.
    const gm = this.genMemo || (this.genMemo = new Map());
    for (const O of opts) {
      const key = this.twin ? null : [O.pred.track.id, O.release ? "R" + O.kS : "M", held ? held.dir + ":" + held.v : "-", this.c12 ? 1 : 0, this.ballEpoch || 0, this.lastTouch ? this.lastTouch.id + (this.lastTouch.launched ? "L" : "") : "-"].join("|");
      let ent = key ? gm.get(key) : null; const fresh = [];
      if (ent) { this.cpu.genHit = (this.cpu.genHit || 0) + 1; for (const c of ent.cands) if (c.smp.k > k + 1) cands.push(c); } else this.cpu.genMiss = (this.cpu.genMiss || 0) + 1;
      // (DRIBBLE-1.2 CPU: a release-NOW motion's contacts are searched only nowHorizon s ahead — the body turns now, so a touch later than that is a
      // turn that waits for the ball; each release-now motion is a fresh TURN-1.2 prediction per pass, the dominant planning cost of a held cut)
      const kEnd = yield* this.genCandsG(O, held, s, fresh, rj, O.now && !this.twin ? O.off + Math.round(D1.cut12.nowHorizon / DT) : Infinity, sliced, ent ? ent.kEnd + 1 : -Infinity);
      for (const c of fresh) cands.push(c);
      if (key) { if (!ent) { ent = { cands: [], kEnd: -Infinity }; gm.set(key, ent); if (gm.size > 12) gm.delete(gm.keys().next().value); } for (const c of fresh) ent.cands.push(c); ent.kEnd = Math.max(ent.kEnd, kEnd); }
    }
    yield* this.finishPlanG(k, s, held, LC, off, cands, rj, c0, sliced);
  }
  // the candidate contacts of one motion option O ({ pred, off, release, now }) for the ball in this.ballCache (DRIBBLE-1.2: a function of its own —
  // the nested decisive-touch search uses it with a hypothetical ball); jEnd limits the contact ticks
  genCands(O, held, s, cands, rj, jEnd = Infinity) { const g = this.genCandsG(O, held, s, cands, rj, jEnd, false); while (!g.next().done); }
  *genCandsG(O, held, s, cands, rj, jEnd = Infinity, sliced = false, kFrom = -Infinity) {
      const pred = O.pred, minJ = Math.max(O.off, 0), horizonJ = Math.min(pred.length - 2, O.off + Math.round((this.o2 ? D1.o2horizon : 1.6) / DT), jEnd), st = this.o2 ? D1.o2planStep : D1.planStep;
      let j0 = minJ; if (kFrom > -Infinity) { const jf = kFrom - pred.k0 - 1; while (j0 < jf) j0 += st; }   // (the memo covers the earlier contact ticks)
      for (let j = j0; j < horizonJ; j += st) {
        const smp = pred.at(j); const bk = this.ballCache.map.get(smp.k); if (!bk) continue; const ball = K(bk.p), vBall = K(bk.v);
        for (const F of SIDES) {
          const L = smp.legs[F]; if (L.stance || L.w < D1.wLo || L.w > D1.wHi) continue;
          if (this.lastTouch && this.lastTouch.launched && this.lastTouch.F === F && this.lastTouch.swing === L.swing) continue;   // one deliberate touch per swing
          if (this.lastTouch && this.lastTouch.launched && smp.k - this.lastTouch.k < Math.round((this.lastTouch.minNext != null ? this.lastTouch.minNext : this.minInterval(s)) / DT)) continue;   // no rapid fire (the interval the last launch planned its next window with)
          const n0 = this.o2 && !O.release ? this.aimFast(smp, ball) : (O.now ? this.aimFast(smp, ball) : this.aimDir(O.pred, j, ball, s, O.release));
          // DRIBBLE-1.1: while a cut is held, contacts are ALSO generated for a push toward the cut (part of the way: cutGenFrac of the requested
          // change) — an inside / outside contact that can take the ball across happens where the foot passes BESIDE the ball, a tick at which no
          // straight push exists (DRIBBLE-1 only generated straight pushes and re-aimed them, so the far-foot inside never appeared). The cut
          // version (switchCand) then re-aims each exactly into the post-cut motion.
          const hv = Math.hypot(smp.V[0], smp.V[1]) > 0.3 ? Math.atan2(smp.V[1], smp.V[0]) : smp.psi, nCut = held && !O.release && !this.twin ? fwdW(hv + D1.cutGenFrac * wrapA(held.dir - hv)) : null;
          // DRIBBLE-1.2: and for the decisive push (decFrac of the way): the inside / outside contact that takes most of the turn at once
          const nDec = nCut && this.c12 ? fwdW(hv + D1.cut12.decFrac * wrapA(held.dir - hv)) : null;
          for (const u of nCut ? (nDec ? [n0, nCut, nDec] : [n0, nCut]) : [n0]) { const n = this.impN(u, this.provS(s, vBall, u), vBall);
          // the foot meets the ball where its OWN swing path passes it: path phase jp ≤ j (the time-warp holds the foot back and sets its speed)
          for (let d = 0; d <= D1.warp.maxBack; d += this.o2 ? D1.o2warpStep : D1.warp.step) {
            const jp = j - d; if (jp < O.off) break; const sp = pred.at(jp); if (!sp.bones || sp.legs[F].stance || sp.legs[F].swing !== L.swing) break;
            const wp = sp.legs[F].w, foot = sp.bones["foot_" + F], toe = sp.bones["toe_" + F]; if (Math.hypot(ball[0] - foot.p[0], ball[2] - foot.p[2]) > 0.6) { rj("far"); continue; }
            if (Math.hypot(ball[0] - toe.p[0], ball[1] - toe.p[1], ball[2] - toe.p[2]) > 0.5) { rj("far2"); continue; }   // the boot can reach at most ~0.5 m with the bounds
            const gs = { bones: sp.bones, psi: smp.psi, legs: smp.legs, k: smp.k, P: smp.P };
            // DRIBBLE-1.2: a held-back foot (path phase of an earlier tick) in a non-steady motion: its exact pose at the contact tick
            if (!this.twin && d > 0 && !steadyF(sp, smp, F)) { const xb = pred.track.warpedBones(smp.k, F, wp); if (!xb) continue; gs.bones = xb; }
            for (const reg of Object.keys(D1.regions)) { if (this.yawOut(gs, F, reg, n)) continue; for (const e of this.elevs()) {
              const g = this.contactGeom(gs, F, reg, n, ball, vBall, e * DEG); if (!g) continue;
              const vPath = this.bootVel(pred, jp, F, g.cW); if (!vPath) continue;
              const pn = V.dot(vPath, g.nc), bn = V.dot(vBall, g.nc), rho = pn > 0.2 ? clamp((bn + D1.closeWant) / pn, D1.warp.rhoMin, 1) : 1; let vb = V.sc(vPath, rho); const vbPath = vb;
              const sw = this.sweepFor(F, L, g, vb, vBall); if (sw) { vb = V.add(vb, sw.v); g.sweepW = sw.W; }   // DRIBBLE-1.2: a side push sweeps across into the ball
              const close = V.dot(V.sub(vb, vBall), g.nc); if (close < D1.closeMin) { rj("close"); continue; }
              if (V.dot(vb, g.nc) > this.launchMax(s) * Math.cos(g.elev) - D1.sepMin) { rj("bootFast"); continue; }   // still a kick: the ball could not leave this boot
              const wk = d === 0 && rho > 0.999 ? (this.warpNow(F, L.swing) && this.getAdj(F, L.swing) && this.getAdj(F, L.swing).warp ? this.warpFor(F, L.swing, L.w, wp, rho) : null) : this.warpFor(F, L.swing, L.w, wp, rho);
              if (wk === undefined) { rj("warp"); continue; }
              rj("ok");
              const cost = this.cost(g, F, reg, smp, close, s, n, O.release) + D1.warp.costLag * (L.w - wp) + D1.warp.costSlow * (1 - rho);
              // DRIBBLE-1.2: under a held cut the ranking also estimates how much of the turn this contact's direction could take (half weight: the
              // cut version re-aims it into the post-cut motion)
              const remE = (u !== n0 || O.now) && held ? D1.cut12.remK * 0.5 * Math.pow(Math.abs(wrapA(held.dir - headingOf(u))) / Math.max(10 * DEG, Math.abs(wrapA(held.dir - (O.now ? Math.atan2(this.A.V[1], this.A.V[0]) : hv)))), 2) : held && !this.twin ? D1.cut12.remK * 0.5 : 0;
              cands.push({ ...g, j, jp, smp, gs, n, u, vb, vbPath, close, cost: cost + remE, ballK: bk, pred, release: O.release, off: O.off, warp: wk, rho, wp, ac: null, cutGen: u === nCut || u === nDec, now: O.now || null, kS: O.kS != null ? O.kS : null, staged: O.staged != null ? O.staged : null, ...(O.staged != null ? { stage: O.staged } : {}), bigNow: !!O.bigNow });
            } }
          }
          }
        }
        if (sliced) yield D1.slice.uGen;
      }
      return pred.k0 + horizonJ;
  }
  // the ranked candidates → the plan (or none)
  *finishPlanG(k, s, held, LC, off, cands, rj, c0, sliced = false) {
    // the approach check (the adjusted boot must not reach the ball earlier in its own swing) runs lazily in rank order: a candidate failing it is
    // simply not a candidate (identical to filtering before the ranking — the sort is stable)
    if (!this.twin) for (const c of cands) c.cost = Math.round(c.cost * 1e9) / 1e9;
    // DRIBBLE-1.2: after a SET-UP touch, the decisive contact it was made for (its foot, its window, its surface) is tried first — the set-up exists
    // for that touch; ranked among the others by the generic cost it could fall past the tries and leave the set-up ball unplayed
    const dq = !this.twin && this.lastTouch && this.lastTouch.launched && this.lastTouch.dec && (this.lastTouch.role === "setup" || this.lastTouch.setupSw) ? this.lastTouch.dec : null;
    const pull = (c) => dq && c.F === dq.F && Math.abs(c.smp.k - dq.kc) <= D1.cut12.decWin ? D1.cut12.decPull + (c.reg === dq.reg ? 0.5 * D1.cut12.decPull : 0) : 0;
    if (dq) cands.sort((a, b) => (a.cost - pull(a)) - (b.cost - pull(b))); else cands.sort((a, b) => a.cost - b.cost);
    const acOk = (c) => { if (c.ac == null) { c.ac = this.approachClear(c.pred, c.j, c.F, c, c.off, c.warp); if (!c.ac) rj("early"); } return c.ac; };
    // (a sliced pass whose earliest candidate contact is near finishes at once — waiting would lose it)
    if (sliced && cands.length) { let kMin = Infinity; for (const c of cands) if (c.smp.k < kMin) kMin = c.smp.k; if (kMin - this.k <= D1.slice.urgent) yield "URGENT"; }
    let nAc = 0; this.reachable = false; for (const c of cands) { if (acOk(c)) { this.reachable = true; break; } if (sliced && ++nAc % 24 === 0) yield 1; }
    const fail = () => { if (this.plan) this.dropAdj(this.plan.F, this.plan.swing); this.plan = null; this.cpu.plan += now() - c0; };

    if (!this.reachable) { fail(); this.jobDone(false); return; }
    // the ranked candidates: the first whose launch solves and whose refined contact passes every check becomes the plan
    let best = null, L = null, g2 = null, vb2 = null, closeN = 0, recov = null, nValid = 0; const tried = new Set(), deadF = new Set(), grp = {};
    // BLOCKERS: swings whose own path runs deep into the free ball (the ball is in that foot's way: steering it clear is not reliable). No plan may
    // wait past such a swing with another foot — the swing that meets the ball first makes the touch
    // (DRIBBLE-1.2: per motion — a release-now candidate is judged against the swings of the released motion, not of the held line)
    const hitsM = new Map(), hitsOf = (c) => { const pr = this.twin || !c.now ? LC.pred : c.pred; let h = hitsM.get(pr); if (!h) { h = this.blockers(pr, pr === LC.pred ? off : 0); hitsM.set(pr, h); } return h; };
    const isBlocker = (c) => hitsOf(c).some((h) => h.F === c.F && h.swing === c.smp.legs[c.F].swing);
    const blocked = (c) => hitsOf(c).some((h) => h.k < c.smp.k - 1 && !(h.F === c.F && h.swing === c.smp.legs[c.F].swing));
    for (const c0c of cands) {
      if (!acOk(c0c)) { if (this.dbgTry) this.dbgTry.push({ k, kc: c0c.smp.k, F: c0c.F, reg: c0c.reg, ver: c0c.now ? "now" : "cand", why: "early" }); continue; }
      const tk = c0c.F + c0c.smp.k + ":" + c0c.jp; if (tried.has(tk)) continue; const fk = c0c.F + c0c.smp.legs[c0c.F].swing + c0c.reg + Math.round(c0c.wp * 20);
      // DRIBBLE-1.2: a held cut compares surfaces — at most two tries per foot / swing / surface (adjacent ticks of one contact are near-duplicates)
      if (this.c12) { const gk = (c0c.now ? "now" : "") + c0c.F + c0c.smp.legs[c0c.F].swing + c0c.reg; if ((grp[gk] = (grp[gk] || 0) + 1) > 2) continue; }
      if (deadF.has(fk)) continue;
      if (!this.twin && blocked(c0c)) { rj("blocked"); if (this.dbgTry) this.dbgTry.push({ k, kc: c0c.smp.k, F: c0c.F, reg: c0c.reg, ver: c0c.now ? "now" : "cand", why: "blocked" }); continue; }                        // DRIBBLE-1.1: a blocked candidate is not a try
      tried.add(tk); if (tried.size > D1.planTries) break;
      if (blocked(c0c)) { rj("blocked"); continue; }
      // a HELD cut: a touch in the current motion releases the cut at its contact tick — its follow-through and launch are judged in that motion;
      // a blocking swing that cannot take the ball into the cut still touches it on the current line (the cut stays held for a later touch)
      const vers = held && !c0c.release ? [this.twin || c0c._swc === undefined ? (c0c._swc = this.switchCand(c0c, k, held)) : c0c._swc, this.c12 && D1.cut12.setupSwitch ? (this.twin || c0c._ssc === undefined ? (c0c._ssc = this.setupSwCand(c0c, k, held)) : c0c._ssc) : undefined, !c0c.cutGen && (isBlocker(c0c) || !this.twin) ? c0c : undefined] : [c0c];
      for (const c of vers) { if (c === undefined) continue; if (!c) { rj("cutGeom"); continue; }
        if (sliced) yield D1.slice.uVer;
        // DRIBBLE-1.2 CPU: a candidate's version results are kept on the candidate — re-used by later passes over the same motion, free ball, held cut
        // and last touch (the generation memo hands the same candidates back); the twin evaluates afresh (DRIBBLE-1 exactly)
        const vkey = c === c0c ? "line" : c.setupSw ? "sw" : "cut"; let Rv = this.twin || !c0c._vr ? undefined : c0c._vr[vkey];
        if (Rv === undefined) { Rv = this.evalVersion(c, s, held, k, rj, fk, deadF); if (!this.twin) (c0c._vr = c0c._vr || {})[vkey] = Rv; } else this.cpu.verHit = (this.cpu.verHit || 0) + 1;
        if (!Rv.ok) { if (Rv.recov && !recov) recov = Rv.recov; continue; }
        const { sF, Lc, g, vb, cl, cf } = Rv;
        let tot0 = c.cost + D1.sepCostK * Math.pow((Lc.maxSep - Lc.want) / Math.max(0.3, Lc.want), 2);
        if (this.c12) { const q = this.cutValue(c, Lc, held, k); tot0 += q.cost; c.cutQ = q; }   // DRIBBLE-1.2: how much of the cut, how soon
        const tot = this.twin ? tot0 : Math.round(tot0 * 1e9) / 1e9;
        if (this._dbgT) { this._dbgT.why = "valid"; this._dbgT = null; }
        if (this.dbgPlans) this.dbgPlans.push({ k, kc: c.smp.k, F: c.F, reg: g.reg, kind: c.cutQ ? c.cutQ.kind : "-", sw: !!c.setupSw, now: !!c.now, rem: c.cutQ ? +c.cutQ.rem.toFixed(0) : null, dir: +(headingOf(Lc.n) / DEG).toFixed(0), sp: +Lc.speed.toFixed(2), next: Lc.kNext, corr: Lc.corr ? Lc.corr.F + ":" + Lc.corr.reg + "@" + Lc.corr.k : null, cost: +c.cost.toFixed(3), tot: +tot.toFixed(3) });
        if (!best || tot < best.tot) { best = c; best.tot = tot; best.sF = sF; best.caft = cf; L = Lc; g2 = g; vb2 = vb; closeN = cl; }
        ++nValid; if (!this.c12) break;                                      // (a held cut: the cut and the line version of a candidate are both judged)
      }
      if (nValid >= (this.c12 ? D1.cut12.validKeep : this.o2 ? D1.o2validKeep : D1.validKeep)) break;
    }
    // RECOVERY TOUCH: the ball is coming into a foot and no touch with a guaranteed next window exists — rather than let the swing kick it, the player
    // makes a deliberate settling push along his line, just firm enough to clear his own follow-through (no next window is promised)
    if (!best && recov && this.recoverNeeded(recov.c)) {
      if (recov.sF == null) recov.sF = this.followMinSpeed(recov.c, s);
      const c = recov.c, sp = recov.sF == null ? 0 : Math.min(this.launchMax(s) + D1.followExtra, recov.sF * 1.04), n = c.u || c.n, g = this.contactGeom(c.gs, c.F, c.reg, this.impN(n, sp, K(c.ballK.v)), K(c.ballK.p), K(c.ballK.v), c.elev);
      const Lr = { n, speed: sp, target: null, kNext: null, F2: null, swing2: null, maxSep: null, want: this.wantSep(s), nT: null, endV: null, recovery: true, elev: c.elev };
      let okA = true; if (g && this.arch === "A") { const e = 0.48, vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), pn = V.dot(vPath, g.nc), bn = V.dot(K(c.ballK.v), g.nc), need = (V.dot(this.launchVec(Lr, g), g.nc) + e * bn) / (1 + e), rhoA = pn > 0.2 ? need / pn : 9;
        const wkA = rhoA >= D1.warp.rhoMin && rhoA <= D1.warp.rhoMaxPhys ? this.warpFor(c.F, c.smp.legs[c.F].swing, c.smp.legs[c.F].w, c.wp, rhoA) : null; if (wkA) { c.warp = wkA; c.rho = rhoA; } else okA = false; }
      const cfR = g && okA && !this.twin && this.arch !== "A" ? this.caftFor(c.pred, c.j, c.F, g, Lr, K(c.ballK.p), c.warp, c.gs) : null;
      if (g && sp > 0 && okA && (this.twin || this.arch === "A" ? this.followClear(c.pred, c.j, c.F, g, Lr, K(c.ballK.p), c.warp, c.gs) : !!cfR) && (this.arch === "A" || this.otherClear(c.pred, c.j, c.F, g, Lr, K(c.ballK.p))) && this.approachClear(c.pred, c.j, c.F, g, c.off, c.warp)) {
        const vb = V.sc(this.bootVel(c.pred, c.jp, c.F, g.cW), c.rho); best = c; best.caft = cfR; L = Lr; g2 = g; vb2 = vb; closeN = V.dot(V.sub(vb, K(c.ballK.v)), g.nc); rj("recovery"); }
    }
    if (!best) { fail(); if (!sliced) this.cpu.planMax = Math.max(this.cpu.planMax || 0, now() - c0); this.jobDone(false); return; }
    // (sliced: installed at the tick the pass ends — its contact must still be ahead, a release-now plan's release tick not yet passed)
    if (sliced && (best.smp.k <= this.k + 1 || (best.release === true && best.now && best.kS != null && this.k >= best.kS))) { if (this.rej) this.rej.lateJob = (this.rej.lateJob || 0) + 1; this.jobDone(false, true); return; }
    const kc = best.smp.k, prevA = this.getAdj(best.F, best.smp.legs[best.F].swing), wNow = !this.A.legs[best.F].stance && Math.round(this.A.legs[best.F].tTO * 240) === best.smp.legs[best.F].swing ? clamp(this.A.legs[best.F].w || 0, 0, 1) : 0;
    const cur = prevA && prevA.swing === best.smp.legs[best.F].swing ? this.adjAt(prevA, wNow) : { o: [0, 0, 0], r: [0, 0, 0], yaw: 0 };
    if (this.plan && (this.plan.F !== best.F || this.plan.swing !== best.smp.legs[best.F].swing)) this.dropAdj(this.plan.F, this.plan.swing);
    this.setAdj(best.F, { swing: best.smp.legs[best.F].swing, ws: wNow, wc: best.smp.legs[best.F].w, o: g2.o, r: g2.rv, yaw: g2.yaw, oBase: cur.o, rBase: cur.r, yawBase: cur.yaw, kc, hold: this.holdOf(best.gs, best.F, g2.o), warp: best.warp || null, sweepW: g2.sweepW || null });
    const ballAtK = new Map(); for (const [kk, v] of this.ballCache.map) if (kk <= kc) ballAtK.set(kk, v.p);
    this.plan = { id: `${this.pid}:T${kc}`, kc, F: best.F, reg: g2.reg, hull: g2.hull, swing: best.smp.legs[best.F].swing, wc: best.smp.legs[best.F].w, wp: best.wp, rho: best.rho, n: L.n, launch: L, geom: g2, vBoot: vb2, close: closeN, release: best.release, stage: best.stage != null ? best.stage : null, ballAtK, made: k, input: this.input, cost: g2.cost != null ? g2.cost : best.cost, sF: best.sF || 0, pred: best.pred, j: best.j, warp: best.warp || null, gs: best.gs, ballP: K(best.ballK.p), caft: best.caft || null, cutQ: best.cutQ || null, heldDir: held ? held.dir : null, setupSw: !!best.setupSw, dec: best.dec || null, relNow: best.release === true && !!best.now, relInp: best.release === true && best.now ? best.now : null,
      inpAfter: (best.release || best.setupSw) && held ? { dir: best.stage != null ? best.stage : held.dir, v: held.v } : { dir: this.input.dir, v: this.input.v } };   // the input the windows were planned on
    if (best.release === true && this.held && best.staged != null) {   // DRIBBLE-1.2: a staged release-now — the body turns to the stage now, the rest stays held
      this.stageDir = best.staged; this.held.since = this.k * DT; this.held.stages = (this.held.stages || 0) + 1; this.carry = null; this.turnLog.push({ k: this.k, t: this.k * DT, kind: "stage", dir: best.staged, target: this.held.raw.dir, by: this.plan.id + ":now" });
      this.plan.relInp = best.now; }
    else if (best.release === true && this.held) {   // the cut is taken WITH the ball: release the turn now (sliced: at the release tick the pass planned it for)
      if (sliced && best.now && best.kS != null && best.kS > this.k + 1) { this.plan.relAt = best.kS; this.plan.made = this.k; }
      else { this.held.released = true; this.held.releasedAt = this.k; this.userDir = this.held.user; if (!this.twin) { this.carry = null; this.turnLog.push({ k: this.k, t: this.k * DT, kind: "release", by: "touch-now", id: this.plan.id }); } } }
    if (sliced) this.plan.made = this.k;
    if (this.cfg.opts && this.cfg.opts.recViewer) {                                       // diagnostic: the planned (warped) toe path to the contact and the contact point
      const toe = []; for (let i = Math.max(best.off, 0); i <= Math.min(best.pred.length - 1, best.j + 30); i += 3) { const smp = best.pred.at(i), Lp = smp.legs[best.F]; if (Lp.stance || Lp.swing !== this.plan.swing) continue;
        const bn = best.warp ? this.pathFrames(best.pred, best.F, this.plan.swing, warpAt(best.warp, Lp.w), best.j) : smp.bones; if (bn) toe.push(V.add(bn["toe_" + best.F].p, M.v(bn["toe_" + best.F].R, [0, -0.02, 0.085]))); }
      this.plan.viz = { toe, contact: g2.cW, ball: K(best.ballK.p), target: L.target || null }; }
    if (!sliced) { this.cpu.plan += now() - c0; this.cpu.planMax = Math.max(this.cpu.planMax || 0, now() - c0); }
    this.jobDone(true);
  }
  // the end of a pass: the next pass is due (no plan: soon; a plan: when something changes); a discarded late result asks for a new pass at once
  jobDone(found, late = false) { this.replanAt = found ? this.k : late ? this.k : this.k + (this.o2 && !this.reachable ? D1.o2pollFar : 6); }
  // advance the running pass by this tick's budget (deterministic units; an urgent pass runs to the end); the per-tick planning time is measured
  runJob() {
    const J = this.job, c0 = now(); let u = 0;
    while (J.urgent || u < D1.slice.budget) { const r = J.g.next(); if (r.done) { this.job = null; break; } if (r.value === "URGENT") { J.urgent = true; continue; } u += r.value || 1; }
    const dt = now() - c0; this.cpu.plan += dt; this.cpu.tickMax = Math.max(this.cpu.tickMax || 0, dt); this.cpu.jobTicks = (this.cpu.jobTicks || 0) + 1; this.cpu.planMax = Math.max(this.cpu.planMax || 0, dt);
  }
  // the swing's foot frames at path fraction w' (interpolated between the predicted samples of that swing): the warped foot's pose
  pathFrames(pred, F, swing, wq, jh, smpE = null) {
    const idx = pred._sw || (pred._sw = {}), key = F + swing; let arr = idx[key];
    if (!arr) { arr = idx[key] = []; const inSw = (i) => { const sm = pred.at(i); return !!sm && !sm.legs[F].stance && sm.legs[F].swing === swing; };   // a swing is one contiguous run of ticks
      if (inSw(jh)) { let a = jh, b = jh; while (inSw(a - 1)) a--; while (inSw(b + 1)) b++; for (let i = a; i <= b; i++) { const smp = pred.at(i); if (smp.bones) arr.push(smp); } }
      else for (let i = 0; i < pred.length; i++) { const smp = pred.at(i); if (!smp.legs[F].stance && smp.legs[F].swing === swing && smp.bones) arr.push(smp); } }
    let lo = 0, hi = arr.length - 1, a = null, b = null; if (!arr.length) return null;
    if (arr[0].legs[F].w > wq) b = arr[0]; else if (arr[hi].legs[F].w <= wq) a = arr[hi]; else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m].legs[F].w <= wq) lo = m; else hi = m; } a = arr[lo]; b = arr[hi]; }
    // DRIBBLE-1.2: evaluated at another tick (smpE) of a non-steady motion: the exact pose
    // (and always when the phase is not bracketed by this prediction's samples: a foot held back to a phase from before the prediction began —
    // DRIBBLE-1.1 then took the earliest sample, a foot up to ~17 cm AHEAD of the held-back one: the clearance pass saw a false collision for a solved
    // follow-through, and its avoidance — the warp sent home — drove the touching toe into the ball 8–46 ms after the launch)
    if (smpE && !this.twin && pred.track && pred.track.warpedBones) { const ref = a || b, outside = !(a && b);
      if (outside || (ref && ref.k !== smpE.k && !steadyF(ref, smpE, F))) { const xb = pred.track.warpedBones(smpE.k, F, wq); if (xb) return xb; } }
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
  launchVec(L, g) { if (L.v) return L.v.slice(); const vz = this.arch !== "A" ? clamp(L.speed * Math.sin(g.elev) * D1.liftK, 0, D1.liftMax) : clamp(L.speed * Math.tan(g.elev), 0, 3.0); return [L.n[0] * L.speed, vz, L.n[2] * L.speed]; }
  launchMax(s) { return s + tab(D1.launchExtra, s); }
  // DRIBBLE-1.2: is this held request a MEANINGFUL cut (≥ cut12.minCut from the current line)? Gentle steering keeps DRIBBLE-1.1's handling
  c12Of(held) { if (!held || this.twin) return false; const V0 = this.A.V, h0 = Math.hypot(V0[0], V0[1]) > 0.3 ? Math.atan2(V0[1], V0[0]) : this.A.psi; return Math.abs(wrapA(held.dir - h0)) >= D1.cut12.minCut * DEG; }
  // DRIBBLE-1.2: the side-foot sweep of a side contact g of foot F (swing sample L) whose path velocity (warped) vb closes on the ball too slowly:
  // the sweep velocity along the impulse normal that brings the closing speed to closeWant (≤ vMax, its wind-up ≤ windMax over the time left from
  // the adjustment's start — the current phase of this swing, or its toe-off), and that velocity in swing-fraction units (× the swing's duration)
  sweepFor(F, L, g, vb, vBall) {
    if (!this.sweepOn || !this.regs[g.reg].side) return null; const c0 = V.dot(V.sub(vb, vBall), g.nc); if (c0 >= D1.closeWant) return null;
    const nh = V.norm([g.nc[0], 0, g.nc[2]]), Tsw = Math.max(0.1, (L.tTDf != null ? L.tTDf : L.swing * DT + 0.3) - L.swing * DT), L0 = this.A.legs[F], wsE = !L0.stance && Math.round(L0.tTO * 240) === L.swing ? clamp(L0.w || 0, 0, 1) : 0;
    const vsW = D1.sweep.windMax / Math.max(1e-4, 0.148 * Math.max(0.02, L.w - wsE) * Tsw), vs = Math.min(D1.sweep.vMax, vsW, (D1.closeWant - c0) / Math.max(0.3, Math.hypot(g.nc[0], g.nc[2])));
    if (!(vs > 0.05)) return null; const v = V.sc(nh, vs); return { v, W: V.sc(v, Tsw), vs };
  }
  // DRIBBLE-1.2: a contact pose that can meet the ball along normal n with some surface / elevation (the candidate's own first)
  geomAny(gs, F, reg0, n, ball, vIn, e0) {
    if (!this.yawOut(gs, F, reg0, n) && this.contactGeom(gs, F, reg0, n, ball, vIn, e0)) return true;
    for (const reg of Object.keys(D1.regions)) { if (this.yawOut(gs, F, reg, n)) continue; for (const e of this.elevs()) if (this.contactGeom(gs, F, reg, n, ball, vIn, e * DEG)) return true; }
    return false;
  }
  // DRIBBLE-1.2: the impulse normal (horizontal unit) of a launch s·u for a ball arriving with vIn (u itself when the change is negligible or with the
  // impulse normal off), and the provisional launch speed used to generate a candidate's geometry before its launch is solved
  impN(u, sp, vIn) { if (!this.imp) return u; const d = [u[0] * sp - vIn[0], 0, u[2] * sp - vIn[2]], l = Math.hypot(d[0], d[2]); return l > 0.25 ? [d[0] / l, 0, d[2] / l] : u; }
  provS(s, vIn, u) { return clamp(0.5 * (s + Math.max(0, V.dot(vIn, u))) + 1.5, 2.5, this.launchMax(s)); }
  // DRIBBLE-1.2: the boot velocity a candidate contact would have along a given impulse normal: its (warped) path velocity, plus — a side contact —
  // the sweep that normal would get (as sweepFor sizes it, capped at vMax); used to filter a launch's windows before the exact pick check
  vbFor(c, vIn, nI3) {
    const vbP = c.vbPath || c.vb; if (!this.sweepOn || !this.regs[c.reg] || !this.regs[c.reg].side) return vbP;
    const c0 = V.dot(V.sub(vbP, vIn), nI3); if (c0 >= D1.closeWant) return vbP; const nh = V.norm([nI3[0], 0, nI3[2]]), vs = Math.min(D1.sweep.vMax, (D1.closeWant - c0) / Math.max(0.3, Math.hypot(nI3[0], nI3[2])));
    return V.add(vbP, V.sc(nh, vs));
  }
  // the slowest launch along u whose impulse-normal separation (out − boot)·n ≥ sepMin holds for a boot velocity vb at contact normal nc (3D)
  sepFloor(vb, nc, u) { const nh = Math.hypot(nc[0], nc[2]), un = (u[0] * nc[0] + u[2] * nc[2]); return (V.dot(vb, nc) + D1.sepMin) / Math.max(0.15, un * (nh > 1e-9 ? 1 : 0) || 0.15); }
  // the motion if a held cut is released at this candidate's contact (input held until the touch, the cut from the next tick); cached per contact tick
  switchCand(c, k, held) {
    const kc = c.smp.k, spd = Math.hypot(this.A.V[0], this.A.V[1]); let e = this.swPred(k, kc, held, "full", c.F); if (!e) return null;
    const ix = (kk) => kk - e.k0 - 1, j = ix(kc); if (j < 0 || j >= e.ps.length) return c;
    // re-aim into the post-cut motion and redo the contact geometry for that direction (any region / elevation)
    const ball = K(c.ballK.p), vBall = K(c.ballK.v), nFull = this.aimDir(e.ps, j, ball, spd, true);
    // the full post-cut aim first; if no boot region can push that far across, a partial one (the next touch completes the turn)
    let g = null, n = nFull, u = nFull, fUsed = 1; const u0 = c.u || c.n;
    for (const f of D1.cutAimFrac) { u = f === 1 ? nFull : V.norm(V.add(V.sc(u0, 1 - f), V.sc(nFull, f))); n = this.impN(u, this.provS(spd, vBall, u), vBall);
      for (const reg of [c.reg, ...Object.keys(D1.regions).filter((r) => r !== c.reg)]) { if (this.yawOut(c.gs, c.F, reg, n)) continue; for (const el of this.elevs()) { g = this.contactGeom(c.gs, c.F, reg, n, ball, vBall, el * DEG); if (g) break; } if (g) break; }
      if (g) { fUsed = f; break; } }
    if (!g) return null;
    // STAGED CUT: a touch that takes the ball only part of the way turns the body only as far as the ball goes (+ a lead); the rest of the requested
    // change stays held for the next touch — the player never turns away from his own ball
    let stage = null;
    // DRIBBLE-1.1: the body never turns further than the ball's new direction + the lead — whether or not the aim is "full" (a full aim into an early
    // phase of the turn is often only 10–20°; turning the body the whole way would leave the ball behind): the rest of the change stays held
    if (fUsed < 1 || !this.twin) { const hN = headingOf(u), d = wrapA(held.dir - hN), sv = c.smp.V, h0 = Math.hypot(sv[0], sv[1]) > 0.3 ? Math.atan2(sv[1], sv[0]) : c.smp.psi;
      // DRIBBLE-1.1: the body leads the ball by more when the touch takes the ball further into the turn (stageLead + stageLeadK × the touch's
      // redirect, ≤ stageLeadMax); when what would remain after the stage is small (≤ stageFinal) the whole cut is released with this touch
      const lead = this.twin ? D1.stageLead * DEG : clamp(D1.stageLead * DEG + D1.stageLeadK * Math.abs(wrapA(hN - h0)), 0, D1.stageLeadMax * DEG), fin = this.twin ? 0 : D1.stageFinal * DEG;
      // DRIBBLE-1.1: the whole cut goes with this touch only if the BALL goes within stageFinal of the request; otherwise a stage (never past it)
      // DRIBBLE-1.2: a stage only for a meaningful redirect of the ball (≥ stageMinRedirect); a smaller one is a set-up / line touch (the body must
      // not turn away from a ball that barely changed direction)
      if (this.c12 && D1.cut12.stageMinRedirect && Math.abs(d) > fin && Math.abs(wrapA(hN - h0)) < D1.cut12.stageMinRedirect * DEG) return null;
      if (this.twin ? Math.abs(d) > lead : Math.abs(d) > fin) { stage = hN + Math.sign(d) * (this.twin ? lead : Math.min(lead, Math.abs(d) - DEG)); const st = this.swPred(k, kc, { dir: stage, v: held.v }, "stage" + stage.toFixed(4), c.F); if (!st) return null; e = st; } }
    const vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), vb = V.sc(vPath, c.rho);
    // DRIBBLE-1.1 fix: the indices are taken in the branch actually used (a staged cut swaps in the stage branch, which may have been created at
    // another tick — DRIBBLE-1 kept the full branch's index, i.e. the wrong tick of the stage motion)
    const jF = this.twin ? j : ix(kc); if (!this.twin && (jF < 0 || jF >= e.ps.length || !e.ps.at(jF) || e.ps.at(jF).legs[c.F].stance)) return null;
    return Object.assign({}, c, g, { pred: e.ps, j: jF, smp: e.ps.at(jF), jp: ix(c.pred.at(c.jp).k), off: Math.max(0, ix(k + 1)), release: "contact", stage, n, u, vb, gs: c.gs });
  }
  // DRIBBLE-1.2 TWO-TOUCH VALIDATION: after a set-up's launch the free ball (exactly simulated, no colliders) must meet a DECISIVE touch in the motion
  // that follows (the switch branch, the cut released): any surface, its own launch toward a next window, follow-through, other foot, approach —
  // the full single-touch pipeline on that hypothetical ball. Returns the decisive touch (tick, foot, surface, ball direction, speed) or null.
  // … for the set-up's nominal launch AND its long / short executions (± errK σ of this player's speed and lift error for this touch): a set-up is
  // only worth committing the turn to if the decisive touch exists whichever way the touch's execution error falls
  robustDecisive(c, Lc, s) {
    const dec = this.nestedDecisive(c, Lc, s); if (!dec || !D1.cut12.robustK) return dec;
    const g = Lc.g || c, sg = this.touchSigma(c, s), vL = this.launchVec(Lc, g), K2 = D1.cut12.robustK;
    for (const sgn of [1, -1]) { const v = [vL[0] * (1 + sgn * K2 * sg.sigS), clamp(vL[1] + sgn * K2 * sg.sigL, 0, D1.liftMax + 0.4), vL[2] * (1 + sgn * K2 * sg.sigS)];
      if (!this.nestedDecisive(c, Object.assign({}, Lc, { v }), s)) return null; }
    return dec;
  }
  // the execution error σ (speed fraction, direction deg, lift m/s) a touch by candidate c would have — as commit() draws it
  touchSigma(c, s) {
    const g = this.g, q = clamp(0.5 * g.dribbling + 0.3 * g.ball_control + 0.2 * g.agility, -1, 1), weak = c.F !== this.pref, reg = this.regs[c.reg] || this.regs.FRONT;
    const turnK = c.release || c.setupSw ? 1 + 0.6 * (1 - 0.6 * g.balance) : 1, footK = weak ? 1 + 0.30 * (5 - this.wf) : 1, speedK = 1 + 0.07 * Math.max(0, s - 5.5), base = (1 - D1.errSkill * q) * footK * reg.err * speedK * turnK;
    return { sigS: D1.errSpeed * base, sigD: D1.errDir * base, sigL: D1.errLift * base };
  }
  nestedDecisive(c, Lc, s) {
    const pred = c.pred, kc = c.smp.k, g = Lc.g || c, nT = Math.round(1.3 / DT), tr = this.simLaunch(K(c.ballK.p), this.launchVec(Lc, g), nT), map = new Map();
    for (let i = 0; i < tr.length; i++) map.set(kc + 1 + i, { p: K(tr[i].p), v: K(tr[i].v) });
    const ix = (kk) => kk - pred.k0 - 1, minI = Math.max(D1.cutMinInterval, Lc.minI || 0), jFrom = ix(kc + Math.round(minI / DT)), jEnd = ix(kc + nT - 2);
    if (jFrom < 0 || jFrom >= pred.length - 2) return null;
    const sv = { ballCache: this.ballCache, held: this.held, lastTouch: this.lastTouch, rej: this.rej, dbgT: this._dbgT, dbgPlans: this.dbgPlans }, c0 = now();
    try {
      this.ballCache = { k0: kc, n: nT, map }; this.held = Object.assign({}, this.held, { released: true }); this.rej = null; this._dbgT = null; this.dbgPlans = null;
      this.lastTouch = { launched: true, F: c.F, swing: c.smp.legs[c.F].swing, k: kc, minNext: minI, expect: { F: Lc.F2, swing: Lc.swing2, k: Lc.kNext } };
      const cands = []; this.genCands({ pred, off: jFrom, release: false }, null, s, cands, () => {}, jEnd);
      for (const d of cands) d.cost = Math.round(d.cost * 1e9) / 1e9; cands.sort((a, b) => a.cost - b.cost);
      let tries = 0; const seen = new Set();
      for (const d of cands) { const gk = d.F + d.smp.legs[d.F].swing + d.reg; if (seen.has(gk + d.smp.k)) continue; seen.add(gk + d.smp.k); if (tries++ >= D1.cut12.nestTries) break;
        if (!this.approachClear(d.pred, d.j, d.F, d, d.off, d.warp)) continue;
        const L2 = this.solveLaunch(d, s, 0, Infinity); if (!L2 || !L2.g) continue;
        return { kc: d.smp.k, F: d.F, reg: L2.g.reg, dir: headingOf(L2.n), speed: L2.speed }; }
      return null;
    } finally { this.ballCache = sv.ballCache; this.held = sv.held; this.lastTouch = sv.lastTouch; this.rej = sv.rej; this._dbgT = sv.dbgT; this.dbgPlans = sv.dbgPlans; this.cpu.nested = (this.cpu.nested || 0) + (now() - c0); }
  }
  // DRIBBLE-1.2 SET-UP WITH THE SWITCH: the same contact on the line, in the motion where the cut is released at this foot's touchdown (the switch
  // branch of switchCand — identical motion until then); its launch is solved toward a decisive corridor of a turning swing in that motion
  setupSwCand(c, k, held) {
    const kc = c.smp.k, e = this.swPred(k, kc, held, "full", c.F); if (!e) return undefined;
    const ix = (kk) => kk - e.k0 - 1, j = ix(kc); if (j < 0 || j >= e.ps.length || !e.ps.at(j) || e.ps.at(j).legs[c.F].stance) return undefined;
    return Object.assign({}, c, { pred: e.ps, j, smp: e.ps.at(j), jp: ix(c.pred.at(c.jp).k), off: Math.max(0, ix(k + 1)), setupSw: true });
  }
  // the motion if the held change (or a stage of it) is released at contact tick kc: TURN-1.2 is deterministic, so a switched prediction made at an
  // earlier tick (same input, same switch tick, same released heading) stays valid — cached across ticks; it branches from the main prediction's
  // nearest stored state at or before the contact (identical motion until the switch)
  swPred(k, kc, inp2, tag, F) {
    const ik = this.inputKey(), LC = this.locoCache; if (!this._swc || this._swc.ik !== ik) this._swc = { ik, m: new Map() };
    // DRIBBLE-1.1: the switch is at the touching foot's touchdown (the committed swing), found on the main prediction — every contact of that swing
    // shares it, so the branch is cached per switch tick (one branch per swing and released heading, not one per contact tick)
    let kSw = kc + 1;
    if (!this.twin && LC && LC.key === ik) { for (let i = kc - LC.k0 - 1; i < LC.pred.length; i++) { const sm = LC.pred.at(i); if (sm && sm.legs[F].stance) { kSw = sm.k; break; } } }
    const key = this.twin ? ik + "@" + kc + F + ":" + tag : ik + "@sw" + kSw + F + ":" + tag;
    let e = this._swc.m.get(key);
    if (!e) { if (this._swc.m.size >= D1.switchCache) { rjX(this, "switchCap"); return null; }
      // the branch starts from the main track's latest stored state in (k, switch] (identical motion until the switch), else from the player now
      const cp = LC && LC.key === ik ? LC.pred.track.checkpoint(k, this.twin ? kc : kSw) : null, kb = cp ? cp.k : k;
      const nH = Math.round((1.6 + tab(D1.maxInterval, Math.hypot(this.A.V[0], this.A.V[1])) + 0.5) / DT) - (kb - k);
      const br = new LocoTrack(this, kb, cp ? cp.C : this.A, this.input, inp2, kSw, cp ? LC.pred.track : null);
      e = { k0: k, ps: new PredView(br, k, (kb - k) + Math.max(60, nH)) }; this._swc.m.set(key, e); }
    return e;
  }
  // a recovery touch only when the ball is actually coming into this foot's swing soon (otherwise keep looking for a proper touch)
  blockers(pred, off) {
    const out = [], seen = new Set(), lt = this.lastTouch && this.lastTouch.launched ? this.lastTouch : null, n = Math.min(pred.length - 1, Math.max(off, 0) + Math.round((this.o2 ? D1.o2horizon : 1.6) / DT));
    for (let j = Math.max(off, 0) + 1; j < n; j++) { const smp = pred.at(j); if (!smp.bones) continue; const bk = this.ballCache.map.get(smp.k); if (!bk) break; const b = K(bk.p);
      for (const F of SIDES) { const Lg = smp.legs[F]; if (Lg.stance || seen.has(F + Lg.swing) || (lt && lt.F === F && lt.swing === Lg.swing)) continue;   // the touching swing's follow-through is planned
        const foot = smp.bones["foot_" + F], toe = smp.bones["toe_" + F]; if (Math.hypot(b[0] - foot.p[0], b[2] - foot.p[2]) > 0.45) continue;
        const g = Math.min(gapAtLeast(this.hulls["boot_" + F], foot.p, foot.R, b, D1.blockDepth), gapAtLeast(this.hulls["toe_" + F], toe.p, toe.R, b, D1.blockDepth));
        if (g < D1.blockDepth) { seen.add(F + Lg.swing); out.push({ k: smp.k, F, swing: Lg.swing, g }); } } }
    return out;
  }
  recoverNeeded(c) { return (c.smp.k - this.k) * DT < 0.45; }
  // provisional launch direction for scoring: toward the predicted COM path ~0.6 s after the contact, a nominal contact distance ahead of it
  // o2: the same aim with the COM 0.6 s on extrapolated from the contact sample's own velocity (no lookahead beyond the candidate tick)
  aimFast(smp, ball) { const v = [smp.V[0], 0, -smp.V[1]], th = Math.hypot(v[0], v[2]) > 0.3 ? headingOf(v) : smp.psi, p2 = pitch2w(smp.P[0] + smp.V[0] * 0.6, smp.P[1] + smp.V[1] * 0.6, R);
    const tgt = V.add(p2, V.sc(fwdW(th), 0.7)), d = V.sub(tgt, ball); d[1] = 0; return V.norm(d); }
  aimDir(pred, j, ball, s, release) {
    const j2 = Math.min(pred.length - 1, j + Math.round(0.6 / DT)), p2 = pred.at(j2), v2 = [p2.V[0], 0, -p2.V[1]], th = Math.hypot(v2[0], v2[2]) > 0.3 ? headingOf(v2) : p2.psi;
    const tgt = V.add(pitch2w(p2.P[0], p2.P[1], R), V.sc(fwdW(th), 0.7)), d = V.sub(tgt, ball); d[1] = 0; return V.norm(d);
  }
  // DRIBBLE-1.2: one plan version's evaluation (its launch, the refined contact, closing / separation, follow-through, other foot, approach, and — a
  // set-up with the switch — its validated decisive touch): { ok, sF, Lc, g, vb, cl, cf } or { ok: false, recov }
  evalVersion(c, s, held, k, rj, fk, deadF) {
        const dbgT = this.dbgTry ? { k, kc: c.smp.k, F: c.F, reg: c.reg, ver: c.now ? "now" : c.setupSw ? "sw" : c.release ? (c.stage != null ? "stage" : "cut") : "line", why: null } : null; if (dbgT) { this.dbgTry.push(dbgT); this._dbgT = dbgT; }
        // (A has no authoritative launch: whatever the boot does after the first contact is just more physics — no follow-through floor)
        // DRIBBLE-1.2 (impulse normal): the follow-through floor depends on the launch's direction, so each window's own launch is checked in the solve
        // (solveLaunch, solvedPick) — no single floor along a provisional direction gates the candidate
        const pick12 = this.imp && this.arch !== "A";
        const sF = this.arch === "A" || pick12 ? 0 : this.followMinSpeed(c, s); if (sF == null) { rj("followMin"); deadF.add(fk); return { ok: false }; }
        if (sF > this.launchMax(s) * Math.cos(c.elev)) { rj("followHigh"); return { ok: false, recov: !c.now && !c.setupSw ? { c, sF } : null }; }   // only a too-firm touch would clear the follow-through (DRIBBLE-1.2: a recovery touch never releases a cut)
        // A / C: the launch can only be what a boot moving at most at its path speed delivers ((1 + e) v_boot − e v_ball along the normal)
        const vPathC = this.arch === "A" ? this.bootVel(c.pred, c.jp, c.F, c.cW) : null, sMaxP = this.arch !== "A" ? Infinity : (1.48 * D1.warp.rhoMaxPhys * Math.max(0, V.dot(vPathC, c.nc)) - 0.48 * V.dot(K(c.ballK.v), c.nc)) / Math.max(0.5, Math.cos(c.elev));
        if (sMaxP < sF) { rj("physMax"); return { ok: false }; }
        const Lc = this.solveLaunch(c, s, sF, sMaxP); if (this.dbgCut && c.release) console.log(`  cand ${c.F} k${c.smp.k} ${c.reg} e${(c.elev / DEG).toFixed(0)} n ${(headingOf(c.n) / DEG).toFixed(0)}° sF ${sF.toFixed(2)} -> ${Lc ? "speed " + Lc.speed.toFixed(2) + " next " + Lc.F2 + "@" + (Lc.kNext * DT).toFixed(2) : "null " + JSON.stringify(this._lastSolve || null)}`);
        if (!Lc) { rj("solve"); return { ok: false, recov: !c.now && !c.setupSw ? { c, sF: pick12 ? null : sF } : null }; }
        if (!this.twin && c.release === "contact" && c.stage == null && held && Math.abs(wrapA(held.dir - headingOf(Lc.n))) > (D1.stageFinal + 10) * DEG) { rj("cutDir"); return { ok: false }; }   // DRIBBLE-1.1: a full release whose ball would not go toward the cut
        // DRIBBLE-1.2: a FULL release-now of a big cut takes a real part of the turn with this touch (a softer first touch is the staged release's job)
        if (c.bigNow && held && Math.abs(wrapA(held.dir - headingOf(Lc.n))) > D1.cut12.nowFullMaxRem * DEG) { rj("nowRem"); return { ok: false }; }
        const nR = this.impN(Lc.n, Lc.speed, K(c.ballK.v));                                // (DRIBBLE-1.2: the solved launch's impulse normal)
        let g = Lc.g || this.contactGeom(c.gs, c.F, c.reg, nR, K(c.ballK.p), K(c.ballK.v), c.elev);
        if (!g) { for (const reg of Object.keys(D1.regions)) { if (this.yawOut(c.gs, c.F, reg, nR)) continue; for (const e of this.elevs()) { const q = this.contactGeom(c.gs, c.F, reg, nR, K(c.ballK.p), K(c.ballK.v), e * DEG); if (q) { q.cost = this.cost(q, c.F, reg, c.smp, c.close, s, nR, c.release); if (!g || q.cost < g.cost) g = q; } } } }
        if (!g) { rj("refine"); return { ok: false }; }
        let vb = V.sc(this.bootVel(c.pred, c.jp, c.F, g.cW), c.rho), cl = V.dot(V.sub(vb, K(c.ballK.v)), g.nc), vL = this.launchVec(Lc, g);
        if (this.arch === "A") {
          // PURE PHYSICAL: no launch is scheduled — the kernel's own boot impulse (kinematic boot, e = boot material) decides. The planner may only shape
          // the swing: the warp slope sets the boot's normal speed so that (1 + e) v_boot − e v_ball ≈ the wanted normal speed of the ball
          const e = 0.48, vPath = this.bootVel(c.pred, c.jp, c.F, g.cW), pn = V.dot(vPath, g.nc), bn = V.dot(K(c.ballK.v), g.nc), want = V.dot(vL, g.nc), need = (want + e * bn) / (1 + e), rhoA = pn > 0.2 ? need / pn : 9;
          if (rhoA < D1.warp.rhoMin || rhoA > D1.warp.rhoMaxPhys) { rj("physSpeed"); return { ok: false }; }   // A may also speed the foot up into the push
          const wkA = this.warpFor(c.F, c.smp.legs[c.F].swing, c.smp.legs[c.F].w, c.wp, rhoA); if (!wkA) { rj("physWarp"); return { ok: false }; }
          c.warp = wkA; c.rho = rhoA; vb = V.sc(vPath, rhoA); cl = V.dot(V.sub(vb, K(c.ballK.v)), g.nc);
          if (cl < D1.closeMin) { rj("physClose"); return { ok: false }; }
        } else if (cl < D1.closeMin || V.dot(V.sub(vL, vb), g.nc) < D1.sepMin) { rj("sep"); return { ok: false }; }
        let cf = null;
        if (Lc.cf) cf = Lc.cf;                                                             // (DRIBBLE-1.2: solved with the pick)
        else if (this.arch !== "A" && !this.twin) { cf = this.caftFor(c.pred, c.j, c.F, g, Lc, K(c.ballK.p), c.warp, c.gs); if (!cf) { rj("follow"); return { ok: false }; } }
        else if (this.arch !== "A" && !this.followClear(c.pred, c.j, c.F, g, Lc, K(c.ballK.p), c.warp, c.gs)) { rj("follow"); return { ok: false }; }
        if (!Lc.cf && this.arch !== "A" && !this.otherClear(c.pred, c.j, c.F, g, Lc, K(c.ballK.p))) { rj("otherFoot"); return { ok: false }; }
        if (!Lc.cf && !this.approachClear(c.pred, c.j, c.F, g, c.off, c.warp)) { rj("early2"); return { ok: false }; }
        // a valid plan: keep the best few by contact cost + how far its launch strays from the speed's dribble character (no needlessly firm touch)
        // DRIBBLE-1.2: a set-up WITH the switch commits the turn — it is a plan only if the decisive touch that must follow it is one (validated now)
        if (this.c12 && c.setupSw) { const dec = this.robustDecisive(c, Lc, s); if (!dec) { rj("noDecisive"); return { ok: false }; } c.dec = dec; }
        return { ok: true, sF, Lc, g, vb, cl, cf };
  }
  // DRIBBLE-1.2: a held cut's value of a valid plan — the share of the requested turn still left after the touch that takes the ball (this touch
  // when it releases the cut or a stage of it; for a set-up touch the decisive touch expected at its corridor window), and how soon that touch is
  cutValue(c, Lc, held, k) {
    const C = D1.cut12, sv = this.A.V, h0 = Math.hypot(sv[0], sv[1]) > 0.3 ? Math.atan2(sv[1], sv[0]) : this.A.psi, cutA = Math.max(Math.abs(wrapA(held.dir - h0)), 10 * DEG);
    let rem, kT, kind;
    if (c.release) { rem = Math.abs(wrapA(held.dir - headingOf(Lc.n))); kT = c.smp.k; kind = c.stage != null ? "stage" : "cut"; }
    else if (c.setupSw && c.dec) { rem = Math.abs(wrapA(held.dir - c.dec.dir)); kT = c.dec.kc; kind = "setup"; }   // the validated decisive touch
    else if (Lc.corr && !c.setupSw) { rem = cutA; kT = c.smp.k; kind = "line"; }    // a line touch keeps the cut held: no credit for a corridor not validated
    else { rem = cutA; kT = c.smp.k; kind = "line"; }
    const r = Math.min(1, rem / cutA); return { kind, rem: rem / DEG, cost: C.remK * r * r + C.timeK * Math.max(0, kT - k) * DT + (kind === "setup" ? C.setupK : 0) };
  }
  cost(g, F, reg, smp, close, s, n, release) {
    const rk = this.reachK();
    let c = (g.of > 0 ? g.of / (D1.reach.ahead * rk) : -g.of / (D1.reach.back * rk) * 0.6) + Math.abs(g.ol) / (D1.reach.lat * rk) + Math.max(0, -g.ov) / D1.reach.down * 0.8 + Math.abs(g.yaw) / (60 * DEG) * 0.6 + Math.abs(g.pitch) / (40 * DEG) * 0.3;
    const weak = F !== this.pref; if (weak) c += (0.25 * (5 - this.wf) / 4 + 0.05) * (this.twin || this.c12 ? 1 : D1.prefK);   // (not in a meaningful cut: there the geometry picks the foot)   // DRIBBLE-1.2: a modest preferred-foot utility (prefK)
    c += { LACES: 0, INSIDE: s < 4.5 ? -0.05 : 0.12, OUTSIDE: 0.22, FRONT: 0.10 }[reg] + 0.25 * (g.elev || 0) / (35 * DEG);
    c += 0.002 * Math.max(0, smp.k - this.k) / 24;                                      // earlier is slightly better (the next feasible opportunity)
    if (this.lastTouch && this.lastTouch.expect && this.lastTouch.expect.F === F && this.lastTouch.expect.swing === smp.legs[F].swing) c -= 0.15;   // the window the last launch aimed at
    return c;
  }
  // the adjusted (and time-warped) boot must not reach the ball earlier in the swing (no early physical touch): replay the adjustment exactly as the
  // pose will apply it (offset rise from the current swing fraction, the foot at its warped path fraction), both hulls, every predicted tick before
  approachClear(pred, j, F, g, off, wk) {
    const swing = pred.at(j).legs[F].swing, wc = pred.at(j).legs[F].w, L0 = this.A.legs[F], cur = !L0.stance && Math.round(L0.tTO * 240) === swing ? clamp(L0.w || 0, 0, 1) : 0;
    const a0 = this.getAdj(F, swing) && cur > 0 ? this.adjAt(this.getAdj(F, swing), cur) : { o: [0, 0, 0], r: [0, 0, 0] }, ad = { ws: cur, wc, o: g.o, r: g.rv, oBase: a0.o, rBase: a0.r, yaw: 0, yawBase: 0, sweepW: g.sweepW || null };
    for (let i = Math.max(off, 0); i < j; i++) { const smp = pred.at(i); const L = smp.legs[F]; if (L.stance || L.swing !== swing) continue; const bk = this.ballCache.map.get(smp.k); if (!bk) continue;
      // (DRIBBLE-1.2 CPU: the unwarped foot first — a warped foot is within a swing's lag of it; far from the ball no exact pose is needed)
      if (!this.twin && wk && smp.bones) { const bb = K(bk.p), fu = smp.bones["foot_" + F].p; if (Math.hypot(bb[0] - fu[0], bb[2] - fu[2]) > 1.1) continue; }
      const bones = wk ? this.pathFrames(pred, F, swing, warpAt(wk, L.w), j, smp) : smp.bones; if (!bones) continue;
      const q = this.adjAt(ad, L.w), foot = bones["foot_" + F], toe = bones["toe_" + F], Rw = M.exp(q.r), ank = V.add(foot.p, q.o), b = K(bk.p);
      if (Math.hypot(b[0] - ank[0], b[2] - ank[2]) > 0.6) continue;
      if (gapAtLeast(this.hulls["boot_" + F], ank, M.mul(Rw, foot.R), b, 0.0015) < 0.0015) return false;
      if (gapAtLeast(this.hulls["toe_" + F], V.add(ank, M.v(Rw, V.sub(toe.p, foot.p))), M.mul(Rw, toe.R), b, 0.0015) < 0.0015) return false; }
    return true;
  }
  // after the launch the boot and toe follow through on the adjusted path (warp catching up, offset falling to zero by touchdown, the follow-through
  // hold); the ball leaves along the launch (rolled forward by the roll table). Neither hull may come back into the ball: no second, uncontrolled
  // impulse on top of the authoritative one.
  followClear(pred, j, F, g, L, ball, wk, gs, iMax = Infinity, caft = null) {
    if (caft) return this.ftClear(this.ftPath(pred, j, F, g, gs, caft), g, this.launchVec(L, g), ball, iMax);   // DRIBBLE-1.1: the solved follow-through path
    const wc = pred.at(j).legs[F].w, swing = pred.at(j).legs[F].swing, hold = this.holdOf(gs || pred.at(j), F, g.o);
    const vL = this.launchVec(L, g), tr = this.simLaunch(ball, vL, 41);                   // the exact free ball (lift included) at this launch
    for (let i = j + 1; i <= Math.min(pred.length - 1, j + 40, iMax); i++) {
      const smp = pred.at(i); if (smp.legs[F].stance) break; const w = smp.legs[F].w, u = s5((1 - w) / Math.max(1e-6, 1 - wc));
      const bones = wk ? this.pathFrames(pred, F, swing, warpAt(wk, w), j) : smp.bones; if (!bones) continue;
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
  // ── DRIBBLE-1.1 CONTACT-AWARE FOLLOW-THROUGH ──────────────────────────────────────────────────────────────────────────────────────────────────
  // the touching foot after the contact, tick by tick, for a follow-through cf (its warp with the yield knot + its arc): the adjusted boot / toe frames
  // exactly as the pose will apply them (path at the warped phase, decaying contact offset + arc, follow-through hold), then — after touchdown — the
  // planted foot on TURN-1.2's plant. Independent of the launch speed: built once per candidate and follow-through, then checked against any launch.
  // ok = false when the foot would move faster than the swing allows (speedCap × its natural peak, or DRIBBLE-1's own catch-up if that is faster)
  // or leave the leg's reach.
  ftPath(pred, j, F, g, gs, cf) {
    const smj = pred.at(j), hold = this.holdOf(gs || smj, F, g.o), memo = pred.ftMemo || (pred.ftMemo = new Map()), key = j + "|" + F + "|" + g.o.join(",") + "|" + g.rv.join(",") + "|" + hold + "|" + cf.key + (g.sweepW ? "|s" + g.sweepW.join(",") : "");
    let P = memo.get(key); if (P) { this.cpu.ftHit++; return P; } this.cpu.ftMiss++;
    const wc = smj.legs[F].w, swing = smj.legs[F].swing, wk = cf.wk, tl = this.A.body.thigh + this.A.body.shank;
    const rows = [], nPost = Math.round(D1.caft.plantCheck / DT); let prevAnk = null, vMax = 0, reach = 0, planted = false;
    for (let i = j + 1; i <= Math.min(pred.length - 1, j + nPost); i++) {
      const smp = pred.at(i), Lg = smp.legs[F];
      if (Lg.stance || planted) { if (!Lg.stance) break; planted = true; if (smp.bones) rows.push({ i, plant: true, foot: smp.bones["foot_" + F], toe: smp.bones["toe_" + F] }); continue; }   // until the foot lifts again
      const w = Lg.w, u = s5((1 - w) / Math.max(1e-6, 1 - wc));
      const bones = wk ? this.pathFrames(pred, F, swing, warpAt(wk, w), j, smp) : smp.bones; if (!bones) continue;
      const foot = bones["foot_" + F], toe = bones["toe_" + F], f = fwdW(smp.psi), com = pitch2w(smp.P[0], smp.P[1], 0); let o = V.sc(g.o, u);
      if (cf.Db) o = V.add(o, caftOff(cf, wc, w));
      if (g.sweepW) o = V.add(o, V.sc(g.sweepW, sweepP(0, wc, w)));                     // DRIBBLE-1.2: the sweep's follow-on (after the contact; ws does not matter)
      const fz = V.dot(V.sub(V.add(foot.p, o), com), f), rel = 1 - s5((w - D1.hold.from) / D1.hold.span); if (fz > hold && rel > 0) o = V.sub(o, V.sc(f, Math.min(fz - hold, D1.hold.max) * rel));
      const Rw = M.exp(V.sc(g.rv, u)), ank = V.add(foot.p, o);
      if (prevAnk && smp.k === prevAnk.k + 1) vMax = Math.max(vMax, V.len(V.sub(ank, prevAnk.p)) / DT); prevAnk = { p: ank, k: smp.k };
      if (smp.bones) reach = Math.max(reach, V.len(V.sub(ank, smp.bones["thigh_" + F].p)) / tl);
      rows.push({ i, ank, RF: M.mul(Rw, foot.R), toeP: V.add(ank, M.v(Rw, V.sub(toe.p, foot.p))), RT: M.mul(Rw, toe.R) });
    }
    P = { F, rows, vMax, reach, ok: true }; memo.set(key, P); return P;
  }
  // the ball launched at vL must clear that path: neither hull within followGap (the striking one from the second tick), the planted foot by otherGap
  ftClear(P, g, vL, ball, iMax = Infinity) {
    if (!P.ok) return false; const j0 = P.rows.length ? P.rows[0].i - 1 : 0, n = P.rows.length ? P.rows[P.rows.length - 1].i - j0 : 1, tr = this.simLaunch(ball, vL, n + 1), thr = D1.followGap;
    for (const r of P.rows) { const dt = r.i - j0; if (dt > iMax - j0) break; const bp = tr[Math.min(tr.length - 1, dt - 1)].p;
      if (r.plant) { if (Math.hypot(bp[0] - r.foot.p[0], bp[2] - r.foot.p[2]) > 0.75) continue;
        if (Math.min(gapAtLeast(this.hulls["boot_" + P.F], r.foot.p, r.foot.R, bp, D1.otherGap), gapAtLeast(this.hulls["toe_" + P.F], r.toe.p, r.toe.R, bp, D1.otherGap)) < D1.otherGap) { if (this.fcWhy) this.fcWhy("plant", dt); return false; } continue; }
      const gt = gapAtLeast(this.hulls["toe_" + P.F], r.toeP, r.RT, bp, thr), gb = gapAtLeast(this.hulls["boot_" + P.F], r.ank, r.RF, bp, thr);
      const strike = g.hull === "toe" ? gt : gb, other = g.hull === "toe" ? gb : gt;
      if (other < thr) { if (this.fcWhy) this.fcWhy("otherHull", dt); return false; }
      if (dt > 1 && strike < thr) { if (this.fcWhy) this.fcWhy("strikeHull", dt); return false; } }
    return true;
  }
  // the natural (TURN-1.2) peak foot speed of a swing, from its predicted path
  swingPeak(pred, F, swing, jh) {
    this.pathFrames(pred, F, swing, 0.5, jh); const arr = pred._sw[F + swing]; if (arr.peak != null) return arr.peak;
    let pk = 0; for (let i = 1; i < arr.length; i++) if (arr[i].k === arr[i - 1].k + 1) pk = Math.max(pk, V.len(V.sub(arr[i].bones["foot_" + F].p, arr[i - 1].bones["foot_" + F].p)) / DT);
    return (arr.peak = pk);
  }
  // one follow-through: yield intensity iy (the warp's yield knot) and arc intensity ia (lateral away from the launch line, lift, a little shorter)
  makeCaft(pred, j, F, g, L, wk, ball, gs, iy, ia) {
    if (this.twin) return null;
    const C = D1.caft, wc = pred.at(j).legs[F].w; let K = wk;
    if (iy > 0) { const wpC = wk ? warpAt(wk, wc) : wc, rhoC = wk ? warpSlope(wk, wc) : 1, wy = wc + C.lam * (1 - wc), base = wk ? warpAt(wk, wy) : wy, sBase = wk ? warpSlope(wk, wy) : 1, yMin = wpC + (wy - wc) * rhoC * C.yieldK;
      const wpy = base - iy * Math.max(0, base - yMin), d1 = (wpy - wpC) / (wy - wc), d2 = (1 - wpy) / (1 - wy), sy = lerp(sBase, Math.min(d2, 2.2 * d1), iy);
      const K2 = [...(wk ? wk.filter((kn) => kn[0] < wc - 1e-9) : []), [wc, wpC, rhoC], [wy, wpy, sy], [1, 1, 1]]; if (warpOk(K2)) K = K2; }
    const v = this.launchVec(L, g), nh = V.norm([v[0], 0, v[2]]), perp = [nh[2], 0, -nh[0]], ank = V.add(gs.bones["foot_" + F].p, g.o), dl = V.dot(V.sub(ank, ball), perp);
    const side = Math.abs(dl) > 0.03 ? Math.sign(dl) : Math.sign(V.dot(rgtW(pred.at(j).psi), perp) * (F === "R" ? 1 : -1) || 1);   // the side of the ball's line the foot is on (else its own side)
    const Db = ia > 0 ? V.sc(nh, -C.back * ia) : null, Dl = ia > 0 ? V.add(V.sc(perp, side * C.lat * ia), [0, C.up * ia, 0]) : null;
    return { wk: K, Db, Dl, iy, ia, side, key: iy.toFixed(3) + "/" + ia.toFixed(3) + "/" + (Db ? Db.concat(Dl).map((x) => x.toFixed(6)).join(",") : "-") + "/" + (K ? K.map((kn) => kn.join(":")).join(";") : "-") };
  }
  // the follow-through ladder, gentlest first: none, the arc alone (⅓, ⅔, full), then the arc with a growing yield. A rung is FEASIBLE when its foot
  // path keeps the speed / reach limits (relative to DRIBBLE-1's own follow-through for that contact, which is always feasible)
  ftLadder(pred, j, F, g, L, wk, ball, gs) {
    const out = [], R0 = this.makeCaft(pred, j, F, g, L, wk, ball, gs, 0, 0), P0 = this.ftPath(pred, j, F, g, gs, R0), swing = pred.at(j).legs[F].swing;
    // (DRIBBLE-1.2: an ABSOLUTE cap — capAbs × the swing's natural peak — also on DRIBBLE-1's own follow-through: a contact held far back on its path
    // whose catch-up to the unchanged plant needs a foot at 2× its peak speed (seen: 23 m/s for a 9.6 m/s swing) is not a feasible touch)
    const pk = this.swingPeak(pred, F, swing, j), vCap = this.twin ? Math.max(D1.caft.speedCap * pk, P0.vMax + 1e-9) : Math.max(D1.caft.speedCap * pk, Math.min(P0.vMax + 1e-9, D1.caft.capAbs * pk)), rCap = Math.max(D1.caft.reachK, P0.reach + 1e-9);
    for (const [iy, ia] of this.o2 ? D1.caft.ladderO2 : D1.caft.ladder) { const cf = iy === 0 && ia === 0 ? R0 : this.makeCaft(pred, j, F, g, L, wk, ball, gs, iy, ia), P = this.ftPath(pred, j, F, g, gs, cf);
      if (P.vMax <= vCap && P.reach <= rCap) out.push({ cf, P }); else if (this.fcWhy) this.fcWhy(P.vMax > vCap ? "speed" : "reach", 0); }
    return out;
  }
  // the gentlest feasible follow-through that clears this launch (null: none does)
  caftFor(pred, j, F, g, L, ball, wk, gs) {
    const vL = this.launchVec(L, g); for (const r of this.ftLadder(pred, j, F, g, L, wk, ball, gs)) if (this.ftClear(r.P, g, vL, ball)) return r.cf;
    return null;
  }
  // the strongest feasible follow-through (the one that lets the softest launch clear)
  caftMax(pred, j, F, g, L, wk, ball, gs) { const l = this.ftLadder(pred, j, F, g, L, wk, ball, gs); return l.length ? l[l.length - 1].cf : null; }
  // the launched ball must not run into the OTHER foot's swing (its own unadjusted path) before the next planned window: a deep intrusion there
  // cannot be steered clear reliably and would be a second, unplanned kick
  // (a planted foot and the leg's shin / thigh cannot be steered clear at all: the launched ball must not touch them)
  otherClear(pred, j, F, g, L, ball) {
    const O = F === "R" ? "L" : "R", kEnd = L.kNext != null && L.F2 === O ? L.kNext - 6 : Infinity, n = Math.round(0.4 / DT), tr = this.simLaunch(ball, this.launchVec(L, g), n + 1), C = this.cfg.colliders.sides[O];
    for (let i = j + 1; i <= Math.min(pred.length - 1, j + n); i++) {
      const smp = pred.at(i); if (smp.k >= kEnd) break; if (!smp.bones) continue;
      const bp = tr[Math.min(tr.length - 1, i - j - 1)].p, foot = smp.bones["foot_" + O], toe = smp.bones["toe_" + O]; if (Math.hypot(bp[0] - foot.p[0], bp[2] - foot.p[2]) > 0.75) continue;
      const st = smp.legs[O].stance, thr = st ? D1.otherGap : D1.blockDepth;
      if (Math.min(gapAtLeast(this.hulls["boot_" + O], foot.p, foot.R, bp, thr), gapAtLeast(this.hulls["toe_" + O], toe.p, toe.R, bp, thr)) < thr) return false;
      for (const part of ["shin", "thigh"]) if (capGap(C[part], smp.bones[part + "_" + O], bp) < D1.otherGap) return false;
    }
    return this.twin || !D1.pathClearMax || this.pathClear(pred, j, F, L, g, ball);
  }
  // DRIBBLE-1.2: until the planned next touch (≤ pathClearMax), no swing of EITHER foot — the touching foot's next swing included — may run deeper into
  // the launched ball than the avoidance can steer clear (blockDepth); the touching swing (its follow-through is checked on its own) and the swing
  // that makes the planned next touch are exempt. DRIBBLE-1 / 1.1 checked the other foot for 0.4 s only: a setup's ball then met the next swing
  // 0.4–1.1 s later, 3–14 cm deep, and the avoidance could not clear it
  pathClear(pred, j, F, L, g, ball) {
    const sw0 = pred.at(j).legs[F].swing, kMax = Math.min(L.kNext != null ? L.kNext - 3 : Infinity, pred.at(j).k + Math.round(D1.pathClearMax / DT)), n = Math.max(1, kMax - pred.at(j).k), tr = this.simLaunch(ball, this.launchVec(L, g), n + 1);
    for (let i = j + 4; i <= Math.min(pred.length - 1, j + n); i += 2) { const smp = pred.at(i); if (!smp || !smp.bones) continue; const bp = tr[Math.min(tr.length - 1, i - j - 1)].p;
      for (const Fx of SIDES) { const Lg = smp.legs[Fx]; if (Lg.stance) continue; if (Fx === F && Lg.swing === sw0) continue; if (L.F2 === Fx && L.swing2 === Lg.swing) continue;
        const foot = smp.bones["foot_" + Fx]; if (Math.hypot(bp[0] - foot.p[0], bp[2] - foot.p[2]) > 0.45) continue; const toe = smp.bones["toe_" + Fx];
        if (Math.min(gapAtLeast(this.hulls["boot_" + Fx], foot.p, foot.R, bp, D1.blockDepth), gapAtLeast(this.hulls["toe_" + Fx], toe.p, toe.R, bp, D1.blockDepth)) < D1.blockDepth) { if (this.rej) this.rej.pathBlock = (this.rej.pathBlock || 0) + 1; return false; } } }
    return true;
  }
  // ── the launch: aim the free ball at the window whose separation profile best matches the speed's dribble character; physics makes the path ──
  // the slowest launch along the provisional direction that the follow-through (warp catch-up to TURN-1.2's plant) can never re-contact, with a margin
  // for this player's execution error — the touch must be at least this firm (bisection on the real follow-through check)
  followMinSpeed(c, s) {
    const ball = K(c.ballK.p), base = clamp(0.5 * this.g.dribbling + 0.3 * this.g.ball_control + 0.2 * this.g.agility, -1, 1), sig = D1.errSpeed * (1 - D1.errSkill * base) * (c.F !== this.pref ? 1 + 0.30 * (5 - this.wf) : 1), mk = 1 / (1 - 3 * sig);
    // DRIBBLE-1.1: the floor is the slowest launch that ANY feasible follow-through on the ladder clears
    const u = this.imp && c.u ? c.u : c.n, lad = this.twin ? null : this.ftLadder(c.pred, c.j, c.F, c, { n: u, speed: 1 }, c.warp, ball, c.gs);
    const ok = lad ? (sp) => { const vL = this.launchVec({ n: u, speed: sp / mk }, c); return lad.some((r) => this.ftClear(r.P, c, vL, ball)); } : (sp) => this.followClear(c.pred, c.j, c.F, c, { n: c.n, speed: sp / mk }, ball, c.warp, c.gs);
    let lo = Math.max(1, this.imp ? this.sepFloor(c.vb, c.nc, u) : V.dot(c.vb, c.nc) + D1.sepMin), hi = this.launchMax(s) + D1.followExtra; if (lo > hi) return null; if (!ok(hi)) return null; if (ok(lo)) return lo;
    for (let i = 0; i < (this.o2 ? 6 : 7); i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } return hi;
  }
  // DRIBBLE-1.2: the checks of one launch pick for a candidate contact (impulse-normal geometry → closing / separation → follow-through ladder at the
  // softest executed speed (3σ error) → other foot → approach); returns the refined geometry and its follow-through, or null
  solvedPick(c, Lp, s) {
    const ball = K(c.ballK.p), vIn = K(c.ballK.v), nR = this.impN(Lp.n, Lp.speed, vIn);
    let g = !this.yawOut(c.gs, c.F, c.reg, nR) ? this.contactGeom(c.gs, c.F, c.reg, nR, ball, vIn, c.elev) : null;
    if (!g) { for (const reg of Object.keys(D1.regions)) { if (this.yawOut(c.gs, c.F, reg, nR)) continue; for (const e of this.elevs()) { const q = this.contactGeom(c.gs, c.F, reg, nR, ball, vIn, e * DEG); if (q) { q.cost = this.cost(q, c.F, reg, c.smp, c.close, s, nR, c.release); if (!g || q.cost < g.cost) g = q; } } } }
    const why = (k) => { if (this.rej) this.rej["pick:" + k] = (this.rej["pick:" + k] || 0) + 1; return null; };
    if (!g) return why("geom");
    let vbR = V.sc(this.bootVel(c.pred, c.jp, c.F, g.cW), c.rho); const sw = this.sweepFor(c.F, c.smp.legs[c.F], g, vbR, vIn); if (sw) { vbR = V.add(vbR, sw.v); g.sweepW = sw.W; }
    const cl = V.dot(V.sub(vbR, vIn), g.nc), vL = this.launchVec(Lp, g);
    if (cl < D1.closeMin) return why("close"); if (V.dot(V.sub(vL, vbR), g.nc) < D1.sepMin) return why("sep");
    const base = clamp(0.5 * this.g.dribbling + 0.3 * this.g.ball_control + 0.2 * this.g.agility, -1, 1), sig = D1.errSpeed * (1 - D1.errSkill * base) * (c.F !== this.pref ? 1 + 0.30 * (5 - this.wf) : 1);
    const Lsoft = Object.assign({}, Lp, { speed: Lp.speed * (1 - 3 * sig) }), cf = this.caftFor(c.pred, c.j, c.F, g, Lsoft, ball, c.warp, c.gs); if (!cf) return why("follow");
    if (!this.otherClear(c.pred, c.j, c.F, g, Lp, ball)) return why("other");
    // (DRIBBLE-1.2: and for a high execution — the lift error +2σ: a ball hopping higher meets the other leg's shin / thigh that a rolling one passes)
    { const sgm = this.touchSigma(c, s), v0 = this.launchVec(Lp, g), vH = [v0[0], clamp(v0[1] + 2 * sgm.sigL, 0, D1.liftMax + 0.4), v0[2]];
      if (vH[1] > v0[1] + 1e-9 && !this.otherClear(c.pred, c.j, c.F, g, Object.assign({}, Lp, { v: vH }), ball)) return why("otherHigh");
      // (and for the direction error ±2σ: a ball launched a few degrees closer to the other leg)
      for (const sgn of [1, -1]) { const a = sgn * 2 * sgm.sigD * DEG, ca = Math.cos(a), sa = Math.sin(a), vD = [v0[0] * ca + v0[2] * sa, v0[1], -v0[0] * sa + v0[2] * ca];
        if (!this.otherClear(c.pred, c.j, c.F, g, Object.assign({}, Lp, { v: vD }), ball)) return why("otherDir"); } }
    if (!this.approachClear(c.pred, c.j, c.F, g, c.off, c.warp)) return why("approach");
    return { g, cf, vbR, cl };
  }
  solveLaunch(best, s, sFollow = 0, sMaxP = Infinity) {
    const elev = best.elev || 0;
    const c0 = now(), held = this.held && !this.held.released ? this.held.raw : null;
    // the motion that follows the contact: if this contact releases a held cut, the cut prediction; otherwise the current one
    const cut = best.release && this.held ? (best.stage != null ? best.stage : this.held.raw.dir) : null;   // this touch takes the ball through a requested cut (or a stage of it)
    // a SET-UP touch: a cut is held but this touch cannot take the ball into it — it places the ball close for a quick next touch, inside what
    // remains of the hold (otherwise the player would have to turn away from his own ball)
    const setup = cut == null && !!(this.held && !this.held.released), holdLeft = setup ? this.held.since + tab(D1.maxInterval, s) + D1.gateExtra - best.smp.k * DT - 0.1 : Infinity;
    // DRIBBLE-1.1: through a cut the next window comes after the switch (the touching foot's touchdown) + cutWinAfterSwitch — on the turning path, not
    // on the old line the body is still running when the ball leaves
    const kSw = !this.twin && cut != null && best.pred.track && best.pred.track.kSwitch != null ? best.pred.track.kSwitch : null;
    const pred = best.pred, j0 = best.j, ball = K(best.ballK.p), vb = best.vb, minI = Math.max(cut != null || setup ? D1.cutMinInterval : this.minInterval(s), kSw != null ? (kSw - best.smp.k) * DT + D1.cutWinAfterSwitch : 0), maxI = Math.max(minI + 0.2, Math.min(tab(D1.maxInterval, s), holdLeft, this.c12 && (cut != null || setup) ? D1.cut12.cutMaxI : Infinity));   // (DRIBBLE-1.2: through a cut the next touch comes within cutMaxI)
    // through a cut: the ball is placed for the first outgoing steps (the body already on the new heading), close
    const wins = this.windowTargets(pred, j0 + Math.round(minI / DT), j0 + Math.round(maxI / DT), s, setup && this.c12 ? held.dir : null).filter((w) => !(w.F === best.F && w.swing === best.smp.legs[best.F].swing)
      && (cut == null || (Math.abs(wrapA(headingOf([pred.at(w.j).V[0], 0, -pred.at(w.j).V[1]]) - cut)) < D1.cutWinTol * DEG && Math.hypot(pred.at(w.j).V[0], pred.at(w.j).V[1]) > 1.0)));
    const want = this.wantSep(s) * (cut != null || setup ? D1.cutSepK : 1); const picks = []; if (this.rej) this.rej.nwin = (this.rej.nwin || 0) + wins.length;
    const dbgS = this.dbgSolve && (setup || best.now) ? [] : null; if (dbgS) this.dbgSolve.push({ k: this.k, kc: best.smp.k, F: best.F, minI, maxI, nWin: wins.length, nCorr: wins.filter((w) => w.corr).length, rows: dbgS });
    for (const w of wins) {
      const d = V.sub(w.q, ball); d[1] = 0; const L = V.len(d), n = V.norm(d), nT = w.k - best.smp.k;
      // speed for distance L in nT ticks (monotone): bisection on the roll table
      let lo = 0.2, hi = 30; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (this.rollDist(m, nT).d < L) lo = m; else hi = m; }
      const sp = (lo + hi) / 2, end = this.rollDist(sp, nT), rj = this.rej && (this.rej.win = this.rej.win || []);
      // DRIBBLE-1.2: the separation floor along this launch's own impulse normal (the boot must also close on the ball along it)
      let sMin; if (this.imp) { const vIn = K(best.ballK.v), nI = this.impN(n, sp, vIn), ce = Math.cos(elev), nI3 = [nI[0] * ce, Math.sin(elev), nI[2] * ce], vbW = this.vbFor(best, vIn, nI3);
        if (V.dot(V.sub(vbW, vIn), nI3) < D1.closeMin) { if (dbgS) dbgS.push({ wk: w.k, F: w.F, why: "close" }); continue; } sMin = Math.max(this.sepFloor(vbW, nI3, n), sFollow);
        // (the window's own impulse normal must be one this contact pose can meet — any surface / elevation — or the refined geometry would fail)
        if (best.gs && !this.geomAny(best.gs, best.F, best.reg, nI, ball, vIn, elev)) { if (dbgS) dbgS.push({ wk: w.k, F: w.F, why: "geom" }); continue; } } else sMin = Math.max(V.dot(vb, n) + D1.sepMin, sFollow);
      if (rj && rj.length < 12) rj.push({ F: w.F, dt: +(nT * DT).toFixed(3), L: +L.toFixed(2), sp: +sp.toFixed(2), sMin: +sMin.toFixed(2), endV: +end.v.toFixed(2), vBootN: w.vBoot ? +V.dot(w.vBoot, n).toFixed(2) : null });
      const lr = this.arch !== "A" ? D1.liftK * Math.sin(elev) : Math.tan(elev);          // planned vertical / horizontal launch ratio
      if (dbgS) dbgS.push({ wk: w.k, F: w.F, corr: w.corr ? w.corr.reg + " m" + (w.corr.margin * 100).toFixed(1) : null, sp: +sp.toFixed(2), sMin: +sMin.toFixed(2), L: +L.toFixed(2), closeN: w.vBoot ? +V.dot(V.sub(w.vBoot, V.sc(n, end.v)), w.corr ? w.corr.n : n).toFixed(2) : null });
      if (sp * (1 - 0.75 * lr) < sMin || sp * (1 - 0.75 * lr) > sMaxP) continue;          // a lifted touch carries further than the rolling estimate (refined below)
      // (DRIBBLE-1.2: a set-up corridor window is met along its decisive direction; the decisive touch's own warp sets the boot speed there)
      const nC = w.corr ? (this.imp ? this.impN(w.corr.u, this.provS(s, V.sc(n, end.v), w.corr.u), V.sc(n, end.v)) : w.corr.n) : n, closeN = w.vBoot ? V.dot(V.sub(w.vBoot, V.sc(n, end.v)), nC) : 0;
      // (DRIBBLE-1.2: a decisive side contact closes with its sweep as well — up to sweep.vMax along its normal)
      const sweepCap = w.corr && this.sweepOn && this.regs[w.corr.reg] && this.regs[w.corr.reg].side ? D1.sweep.vMax : 0;
      if (closeN + sweepCap < D1.closeMin + 0.25) { if (dbgS) dbgS.push({ wk: w.k, F: w.F, why: "closeN" }); continue; }   // the next boot must be able to catch it (the warp can slow it, not speed it)
      if (!w.warped && !w.corr && closeN > 3.5) continue;                                // un-warped, that would be a kick
      // separation profile (COM → ball, along the travel) between the touches
      let mx = 0; for (let t = 0; t <= nT; t += 6) { const jj = Math.min(pred.length - 1, j0 + t), p = pred.at(jj), bpos = V.add(ball, V.sc(n, this.rollDist(sp, t).d)); mx = Math.max(mx, Math.hypot(bpos[0] - p.P[0], bpos[2] + p.P[1])); }
      const c = Math.pow((mx - want) / (0.25 * want + 0.2), 2) + (w.corr ? 0.8 * Math.max(0, D1.cut12.marginWant - w.corr.margin) / D1.cut12.marginWant + 0.1 * (w.w - w.wp) : (w.warped ? 0.15 + 0.4 * (w.w - w.wp) : Math.pow((closeN - D1.closeWant) / 0.6, 2) * 0.6) + 0.8 * Math.max(0, 0.25 - (w.span || 0)) / 0.25) + (w.F !== this.pref ? 0.15 * (5 - this.wf) / 4 * (this.twin || this.c12 ? 1 : D1.prefWinK) : 0)
        + (!this.twin && cut != null ? D1.cutAlignK * Math.pow(Math.abs(wrapA(headingOf(n) - headingOf([pred.at(w.j).V[0], 0, -pred.at(w.j).V[1]]))) / (25 * DEG), 2) : 0);   // DRIBBLE-1.1: through a cut, prefer the ball arriving along the body's heading at that window (a ball crossing the new line is a fragile touch)
      picks.push({ w, n, speed: sp, nT, maxSep: mx, c, endV: end.v, closeN });
    }
    if (!picks.length) { this.cpu.solve += now() - c0; this._lastSolve = { why: "noPick", nwin: wins.length }; return null; }
    // exact refinement: the launch WITH its resolved lift through the real ball integrator (airborne hops, landing, rolling), secant on the speed so
    // the free ball reaches the window's target at the window's tick. This is a launch solve, not a path: nothing acts on the ball after the touch.
    // The ranked windows are refined in turn (the lift carries the ball further than the rolling estimate: a window can fall below the floors).
    if (!this.twin) for (const p of picks) p.c = Math.round(p.c * 1e9) / 1e9;
    picks.sort((a, b) => a.c - b.c); const vzOf = (sp) => this.arch !== "A" ? clamp(sp * Math.sin(elev) * D1.liftK, 0, D1.liftMax) : clamp(sp * Math.tan(elev), 0, 3.0);
    const pick12 = this.imp && this.arch !== "A" && !!best.gs;
    // DRIBBLE-1.2: the follow-through floor along the candidate's own direction (DRIBBLE-1.1's bisection) prunes picks near that direction that are
    // softer — they cannot clear; picks well off it (a sideways push leaves the foot's path) are kept for the exact per-pick check
    let picksT = picks; if (pick12) { const u0 = best.u || best.n, fU = this.followMinSpeed(best, s);
      picksT = picks.filter((p) => { const ang = Math.acos(clamp(p.n[0] * u0[0] + p.n[2] * u0[2], -1, 1)); return ang > D1.cut12.floorAng * DEG || (fU != null && p.speed >= 0.95 * fU); }); }
    for (const pick of picksT.slice(0, pick12 ? (setup ? D1.cut12.refineSetup : D1.cut12.refineTries12) : D1.refineTries)) {
      const d0 = V.sub(pick.w.q, ball); d0[1] = 0; const Ld = V.len(d0), nn = pick.n;
      // DRIBBLE-1.2 CPU: the pick's own checks on its rolling-estimate launch first — only a pick that passes them is refined through the exact ball
      // integrator (most picks fail the follow-through; DRIBBLE-1.1 refined every one) and then checked again exactly
      if (pick12 && !this.solvedPick(best, { n: nn, speed: pick.speed, elev, minI }, s)) { if (this.rej) this.rej.preFail = (this.rej.preFail || 0) + 1; continue; }
      const along = (sp) => { const tr = this.simLaunch(ball, [nn[0] * sp, vzOf(sp), nn[2] * sp], pick.nT); const e = tr[tr.length - 1]; return { d: V.dot(V.sub(e.p, ball), nn), tr }; };
      let s0 = pick.speed, f0 = along(s0).d - Ld, s1 = s0 * (1 - 0.04), f1 = along(s1).d - Ld, it = 0;
      while (Math.abs(f1) > 0.004 && it++ < 6 && Math.abs(f1 - f0) > 1e-9) { const s2 = clamp(s1 - f1 * (s1 - s0) / (f1 - f0), 0.3, 30); s0 = s1; f0 = f1; s1 = s2; f1 = along(s1).d - Ld; }
      const fin = along(s1), endV = Math.hypot(fin.tr[fin.tr.length - 1].v[0], fin.tr[fin.tr.length - 1].v[2]);
      this._lastSolve = { why: "refine", s1: +s1.toFixed(2), sF: +sFollow.toFixed(2), pickSp: +pick.speed.toFixed(2), endV: +endV.toFixed(2), dt: +(pick.nT * DT).toFixed(2) };
      const sepS = this.imp ? (() => { const vIn = K(best.ballK.v), nI = this.impN(nn, s1, vIn), ce = Math.cos(elev), nI3 = [nI[0] * ce, Math.sin(elev), nI[2] * ce]; return this.sepFloor(this.vbFor(best, vIn, nI3), nI3, nn); })() : V.dot(vb, nn) + D1.sepMin;
      if (s1 > sMaxP * 1.02 || s1 < (this.arch !== "A" ? Math.max(sepS, sFollow * 0.98) : sFollow * 0.98) || (pick.w.vBoot && V.dot(V.sub(pick.w.vBoot, V.sc(nn, endV)), nn) < D1.closeMin + 0.1)) { if (this.rej) this.rej.refineFail = (this.rej.refineFail || 0) + 1; continue; }
      let mx = 0; for (let t = 0; t < pick.nT; t += 4) { const p = pred.at(Math.min(pred.length - 1, j0 + t + 1)), b = fin.tr[t].p; mx = Math.max(mx, Math.hypot(b[0] - p.P[0], b[2] + p.P[1])); }
      const Lout = { n: nn, speed: s1, target: pick.w.q, kNext: pick.w.k, F2: pick.w.F, swing2: pick.w.swing, maxSep: mx, want, nT: pick.nT, endV, solveErr: f1, elev, minI, comNext: pick.w.com, corr: pick.w.corr || null };
      // DRIBBLE-1.2: this pick's own contact geometry (its impulse normal), boot closing / separation, follow-through (with the execution-error margin),
      // the other foot and the approach — the first pick that passes is the launch
      if (pick12) { const sv = this.solvedPick(best, Lout, s); if (!sv) { if (this.rej) this.rej.pickFail = (this.rej.pickFail || 0) + 1; continue; } Object.assign(Lout, sv); }
      this.cpu.solve += now() - c0;
      return Lout;
    }
    this.cpu.solve += now() - c0; return null;
  }
  // ── commit at the contact tick: final checks on the ACTUAL state, the touch error (keyed RNG), one authoritative launch (B / C) or none (A) ─────
  commit(k, P) {
    const c0 = now(); this.plan = null;
    // DRIBBLE-1.2: a set-up touch WITH the switch commits the turn — the input changes at this foot's touchdown (the touching swing is committed until
    // then), and the decisive contact follows in the turning motion
    if (P.setupSw && this.held && !this.held.released) { this.held.released = true; this.held.releasedAt = k; this.held.byTouch = P.id; this.userDir = this.held.user; this.carry = null; this.turnLog.push({ k, t: k * DT, kind: "release", by: "touch-setup", id: P.id }); }
    if (P.release === "contact" && this.held && !this.held.released) {
      if (P.stage != null) { this.stageDir = P.stage; this.held.since = k * DT; this.held.stages = (this.held.stages || 0) + 1; this.turnLog.push({ k, t: k * DT, kind: "stage", dir: P.stage, target: this.held.raw.dir, by: P.id }); }   // a stage: the rest stays held
      else { this.held.released = true; this.held.releasedAt = k; this.held.byTouch = P.id; this.userDir = this.held.user; this.turnLog.push({ k, t: k * DT, kind: "release", by: "touch", id: P.id }); } }   // the cut goes WITH this touch
    const A = this.A, F = P.F, fr = this.framesPrev, ball = this.ballA(), foot = fr["foot_" + F], toe = fr["toe_" + F];
    const H = P.hull === "toe" ? this.hulls["toe_" + F] : this.hulls["boot_" + F], Rh = P.hull === "toe" ? toe.R : foot.R, ph = P.hull === "toe" ? toe.p : foot.p;
    const dq = hullDistance(hullAt(H, ph, Rh), ball.p, 0), gap = dq.d - R;
    const other = P.hull === "toe" ? gapTo(this.hulls["boot_" + F], foot.p, foot.R, ball.p) : gapTo(this.hulls["toe_" + F], toe.p, toe.R, ball.p);
    const s = Math.hypot(A.V[0], A.V[1]), reg = this.regs[P.reg], weak = F !== this.pref;
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
    // the EXECUTED launch (error included) must still leave the follow-through behind: a touch can never be softer than the foot that keeps moving
    // (otherwise the same boot re-contacts — a double impulse). The floor is the smallest speed-up of the executed launch that clears it.
    let floorK = 1, cf = null;
    // (the follow-through model is approximate — re-IK, the post-touch intent — so the executed launch must clear it with D1.floorMargin to spare)
    const at = (f) => [vOut[0] * f, vOut[1], vOut[2] * f], ok = (f) => this.followClear(P.pred, P.j, F, P.geom, Object.assign({}, P.launch, { v: at(f * (1 - D1.floorMargin)) }), P.ballP, P.warp, P.gs);
    if (this.arch !== "A" && P.pred && !this.twin) {
      // DRIBBLE-1.1: the follow-through is solved for the EXECUTED launch (error included): the smallest yield-and-arc that clears it; only if not even
      // the full one does is the launch firmed up (as DRIBBLE-1)
      const Lx = (f) => Object.assign({}, P.launch, { v: at(f * (1 - D1.floorMargin)) }), lad = this.ftLadder(P.pred, P.j, F, P.geom, Lx(1), P.warp, P.ballP, P.gs), cmax = lad.length ? lad[lad.length - 1].cf : null, full = (f) => { const vL = this.launchVec(Lx(f), P.geom); return lad.some((r) => this.ftClear(r.P, P.geom, vL, P.ballP)); };
      if (!full(1)) { if (full(D1.floorMax)) { let lo = 1, hi = D1.floorMax; for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; if (full(m)) hi = m; else lo = m; } floorK = hi; vOut = at(hi); } else floorK = -1; }
      cf = this.caftFor(P.pred, P.j, F, P.geom, Lx(floorK > 0 ? floorK : 1), P.ballP, P.warp, P.gs) || cmax;
      if (this.cfg.opts && this.cfg.opts.diagFT && cf) { const Pm = this.ftPath(P.pred, P.j, F, P.geom, P.gs, cf); this._ftDiag = { rows: Pm.rows.map((r) => ({ k: P.pred.at(r.i).k, plant: !!r.plant, ank: r.ank || r.foot.p, toeP: r.toeP || r.toe.p, RF: r.RF || r.foot.R, RT: r.RT || r.toe.R })), vL: this.launchVec(Lx(floorK > 0 ? floorK : 1), P.geom), ball: P.ballP, hull: P.hull, F }; }
    } else if (this.arch !== "A" && P.pred && !ok(1)) {
      if (ok(D1.floorMax)) { let lo = 1, hi = D1.floorMax; for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } floorK = hi; vOut = at(hi); } else floorK = -1;
    }
    const T = { id: P.id, k, t: k * DT, F, reg: P.reg, hull: P.hull, floorK, collider: `${this.pid}:${P.hull}_${F}`, swing: P.swing, w: clamp(A.legs[F].w || 0, 0, 1), weak, arch: this.arch,
      ball: ball.p.slice(), pre: { v: ball.v.slice(), w: ball.w.slice() }, gap, otherGap: other, nPhys: dq.n.slice(), bootVel: vB, desired: { v: [Math.cos(headingOf(P.launch.n)) * P.launch.speed, 0, -Math.sin(headingOf(P.launch.n)) * P.launch.speed], speed: P.launch.speed, maxSep: P.launch.maxSep, want: P.launch.want, kNext: P.launch.kNext, F2: P.launch.F2, target: P.launch.target },
      executed: { v: vOut.slice(), speed: Math.hypot(vOut[0], vOut[2]) }, error: { sigS, sigD, sigL, eS, eD, eL, keyId: this.rng.keyId(...key, "speed") }, phys, offset: P.geom.o, yaw: P.geom.yaw / DEG, pitch: P.geom.pitch / DEG,
      expect: { F: P.launch.F2, swing: P.launch.swing2, k: P.launch.kNext, com: P.launch.comNext || null, target: P.launch.target || null, inp: P.inpAfter || null, corr: P.launch.corr || null }, minNext: P.launch.minI, release: P.release, recovery: !!P.launch.recovery,
      // DRIBBLE-1.2: the touch's role in a requested cut — a SET-UP (the ball placed in a later swing's decisive corridor), a STAGE / the CUT (this
      // touch takes the ball part / all of the way), a LINE touch while the cut is held (no corridor), RECOVERY; DRIBBLE otherwise
      role: P.launch.recovery ? "recovery" : P.cutQ ? P.cutQ.kind : "dribble", heldDir: P.heldDir, setupSw: !!P.setupSw, dec: P.dec || null, cutRemDeg: P.cutQ ? +P.cutQ.rem.toFixed(1) : null, contactAhead: V.dot(V.sub(ball.p, pitch2w(A.P[0], A.P[1], 0)), fwdW(A.psi)), com: [A.P[0], A.P[1]], speedPlayer: s, ctrl: this.ctrl.state, launched: false };
    this.touches.push(T); if (this._ftDiag) { T.ftDiag = this._ftDiag; this._ftDiag = null; }
    if (this.arch === "A") { T.launched = true; T.physical = true; this.lastTouch = T; this.cpu.commit += now() - c0; return; }   // pure physical: the boot alone
    const pre = this.contacts.find((c) => c.own && k - c.k <= 3 && (c.part === "boot_" + F || c.part === "toe_" + F));
    if (pre) { T.cancelled = `preempted by a physical ${pre.part} contact ${k - pre.k} tick(s) earlier`; this.cpu.commit += now() - c0; return; }
    if (gap > 0.022 || gap < -0.004 || other < 0) { T.cancelled = `local check: gap ${(gap * 1000).toFixed(1)} mm, other ${(other * 1000).toFixed(1)} mm`; this.cpu.commit += now() - c0; return; }
    // the touching swing's follow-through from here on is the one solved for this launch (yield knot in its warp + the arc)
    if (!this.twin) { const a = this.getAdj(F, P.swing); if (a) a.ftSolved = true; }      // DRIBBLE-1.1: this swing's follow-through is planned (trusted by the clearance)
    if (cf) { const a = this.getAdj(F, P.swing); if (a) { a.caft = cf.Db ? { Db: cf.Db, Dl: cf.Dl, iy: cf.iy, ia: cf.ia, side: cf.side } : null; if (cf.wk) a.warp = cf.wk; } T.caft = { iy: +cf.iy.toFixed(3), ia: +cf.ia.toFixed(3), Db: cf.Db ? cf.Db.map((x) => +x.toFixed(4)) : null, Dl: cf.Dl ? cf.Dl.map((x) => +x.toFixed(4)) : null, side: cf.side }; }
    if (!this.twin) this.ftHold = { F, swing: P.swing, k };                            // the touching swing is committed until its touchdown
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
      env: tab(D1.sepWant, Math.hypot(A.V[0], A.V[1])) * 0.0 + this.wantSep(Math.hypot(A.V[0], A.V[1])),
      // DRIBBLE-1.1 diagnostics (viewer only): TURN-1.2's own foot under an adjusted swing, the swings' authoritative landings, the follow-through in force
      d11: vw ? { orig: A.d11orig ? JSON.parse(JSON.stringify(A.d11orig)) : null, tgt: Object.fromEntries(SIDES.map((F) => [F, A.legs[F].stance ? null : (A.legs[F].tgt ? A.legs[F].tgt.slice() : null)])),
        ft: Object.fromEntries(SIDES.map((F) => { const a = this.curAdj(A, F); return [F, a && a.caft ? { iy: a.caft.iy, ia: a.caft.ia } : a && a.ftSolved ? { iy: 0, ia: 0 } : null]; })) } : null });
  }
}
const noSnap = () => null;
const now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();

// ═══ run1/run1_gait_v13.js — FROZEN: LOCOMOTION V2 STRAIGHT-LINE BASELINE = RUN-1.3 (commit bdab1f5f, 10 Oct 2026), frozen 10 Oct 2026 ═══
// Do not edit. Everything between the BEGIN / END markers is run1_gait.js at bdab1f5f, byte for byte (check: tools/run1_frozen_check.cjs) — the exact
// implementation that rendered the approved archival captures (review_artifacts/locomotion_v2_run1/video/, run1_gait.js blob 010212622e05).
// The user (10 Oct): freeze the four-regime straight-line system as the Locomotion V2 straight-line baseline — LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5 m/s,
// with the continuous speed-conditioned blending between them. STRAIGHT-LINE ONLY: acceleration / deceleration, curved running, turning / cutting,
// per-player speed characteristics and ball-carry locomotion are NOT part of this freeze (review_artifacts/locomotion_v2_run1/LOCOMOTION_V2_STRAIGHT_BASELINE.md).
// The locomotion-side state interface for Physical Character V2 is run1/lv2_state.js (contract: LOCOMOTION_V2_STATE_CONTRACT.md); it reads this file.
// Wrapped in a function scope so it loads beside the evolving run1_gait.js and the older frozen copies; API: the global RUN1_V13 (the export list below
// is outside the verbatim block). Callers give it its own shallow copy of the skeleton: every version caches its body / speed grid on skel._r1body.
// eslint-disable-next-line no-var
var RUN1_V13 = (function () {
// ── BEGIN VERBATIM run1_gait.js @ bdab1f5f ──
// ═══ run1/run1_gait.js — LOCOMOTION V2 / RUN-1.3: straight-line football running on the real character rig (presentation only) ═══
// Lineage (each frozen beside this file for comparison): RUN-1.0 the original (run1_gait_orig.js) · RUN-1.1 the effort pass (run1_gait_v11.js,
// RUN1_1_EFFORT.md) · RUN-1.2 the speed regimes (run1_gait_v12.js, RUN1_2_REGIMES.md) · RUN-1.3 = RUN-1.2 + an ALL-OUT top-speed regime above it
// (RUN1_3_ALLOUT.md). See review_artifacts/locomotion_v2_run1/.
// A fresh production-locomotion track. It does not modify, call into or replace Outfield Locomotion V1 (anim3d/of_loco.js and the
// shared law the simulation consumes); it only reads the character's own bind (anim3d/of_character.js ofCharSkeleton output).
//
// AUTHORITY. The simulation owns root translation (position, speed, heading). RUN-1 owns the visible skeleton. Nothing here writes
// simulation state, nothing is random, nothing reads the wall clock: the pose is a pure function of (rig, parameters, gait phase).
//
// MOTION CONSTRUCTION (one periodic cycle, RIGHT touchdown at phase 0, LEFT at 0.5):
//   • PELVIS — the vertical of a body under its own stance force and TRUE gravity: a smooth stance force peaking before mid-stance
//     (the measured landing / take-off asymmetry: the body sinks early and leaves the ground higher than it landed) and a ballistic
//     flight at g, in closed form, so height, vertical velocity AND acceleration are continuous (the force is zero at touchdown and
//     toe-off); small lateral sway
//     toward the stance foot; tilt / obliquity / axial rotation as smooth periodic curves.
//   • STANCE (foot space) — the plant is a fixed point on the pitch; in the root frame it travels back at exactly the root speed, so
//     the planted foot cannot skate by construction. The foot ROLLS: touchdown on the rear sole with the toes slightly up, rotation
//     about the heel contact to flat, flat, then heel rise about the MTP (toe) joint with the toe segment staying flat on the turf.
//     Hip / knee come from an analytic two-bone leg IK on the spring-mass pelvis; the ankle from the prescribed foot orientation.
//   • SWING (joint space) — every leg channel (leg yaw, hip adduction, hip flexion in the leg plane, knee, ankle yaw/pitch/roll,
//     toe) is a piecewise cubic Hermite curve through a few authored key values (peak knee recovery, peak hip drive, late-swing knee
//     extension, swing dorsiflexion), whose END POINTS AND END SLOPES ARE THE STANCE SOLUTION'S at toe-off and at the next
//     touchdown. Every channel is therefore C1 through both contact events: no plant snap, no knee jump, no foot-state switch.
//   • TRUNK / ARMS / HEAD — lean, thorax counter-rotation, shoulder-driven arm swing with elbow modulation and slight cross-body
//     drive, head stabilised toward the direction of travel.
// Channel velocities are available in continuous time (symmetric difference of this closed-form pose function, not of frames).
//
// Frames: character-local (root) frame +x = the player's right, +y = up, +z = the direction of travel (the rig's bind frame).
// 3D world = gkRootMatrix(pitch x, pitch y, heading) × local (anim3d convention).
"use strict";

// ── small rotation kit: 3×3 row-major ────────────────────────────────────────────────────────────────────────────────────────────
const R3 = {
  I() { return [1, 0, 0, 0, 1, 0, 0, 0, 1]; },
  x(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },
  y(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  z(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
  mul(A, B) {
    return [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
            A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
            A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
  },
  mul3(A, B, C) { return R3.mul(R3.mul(A, B), C); },
  tr(A) { return [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]]; },
  v(A, p) { return [A[0] * p[0] + A[1] * p[1] + A[2] * p[2], A[3] * p[0] + A[4] * p[1] + A[5] * p[2], A[6] * p[0] + A[7] * p[1] + A[8] * p[2]]; },
  // R = Ry(y)·Rx(x)·Rz(z) (the anim3d euler order) and its inverse decomposition
  yxz(y, x, z) { return R3.mul3(R3.y(y), R3.x(x), R3.z(z)); },
  toYXZ(R) {                                       // returns [y, x, z]
    const sx = Math.max(-1, Math.min(1, -R[5]));   // R[5] = row1,col2 = -sin x
    const x = Math.asin(sx), cx = Math.cos(x);
    if (Math.abs(cx) < 1e-9) return [Math.atan2(-R[6], R[0]), x, 0];
    return [Math.atan2(R[2], R[8]), x, Math.atan2(R[3], R[4])];
  },
  angle(A, B) { const T = R3.mul(R3.tr(A), B); const c = Math.max(-1, Math.min(1, (T[0] + T[4] + T[8] - 1) / 2)); return Math.acos(c); },
};
const RV = {
  add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }, sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
  sc(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }, len(a) { return Math.hypot(a[0], a[1], a[2]); },
  dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
};
const R1_DEG = Math.PI / 180, R1_TAU = Math.PI * 2;
const r1wrap = (u) => ((u % 1) + 1) % 1;
// character root → 3D world: identical to anim3d gk_graph.js gkRootMatrix (copied so RUN-1 does not load the goalkeeper graph)
function r1RootMatrix(px, py, facing, dz) {
  const f = facing, m = M4.ident(), right = [-Math.sin(f), 0, -Math.cos(f)], fwd = [Math.cos(f), 0, -Math.sin(f)];
  m[0] = right[0]; m[1] = right[1]; m[2] = right[2]; m[5] = 1; m[8] = fwd[0]; m[9] = fwd[1]; m[10] = fwd[2];
  m[12] = px; m[13] = dz || 0; m[14] = -py; return m;
}

// ── cubic Hermite through knots [{w, v, m}] (slopes per unit w); C1 by construction; slopes limited so a segment never overshoots
// its end value by more than the Fritsch–Carlson bound (no authored key is ever exceeded by an interpolation bulge) ──────────────
function r1Herm(K, w) {
  let i = 0; while (i < K.length - 2 && w > K[i + 1].w) i++;
  const a = K[i], b = K[i + 1], h = b.w - a.w, t = (w - a.w) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * a.v + (t3 - 2 * t2 + t) * h * a.mo + (-2 * t3 + 3 * t2) * b.v + (t3 - t2) * h * b.mi;
}
function r1HermD(K, w) {                                // d/dw of r1Herm (exact)
  let i = 0; while (i < K.length - 2 && w > K[i + 1].w) i++;
  const a = K[i], b = K[i + 1], h = b.w - a.w, t = (w - a.w) / h, t2 = t * t;
  return ((6 * t2 - 6 * t) * a.v + (3 * t2 - 4 * t + 1) * h * a.mo + (-6 * t2 + 6 * t) * b.v + (3 * t2 - 2 * t) * h * b.mi) / h;
}
function r1HermPrep(K) {                                // per-knot outgoing / incoming slopes with a monotone limiter on each segment
  for (const k of K) { k.mo = k.m; k.mi = k.m; }
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i], b = K[i + 1], d = (b.v - a.v) / (b.w - a.w);
    if (Math.abs(d) < 1e-12) { if (!a.fixed) a.mo = 0; if (!b.fixed) b.mi = 0; continue; }
    const lim = 3 * Math.abs(d);
    if (a.mo * d < 0 && !a.fixed) a.mo = 0; if (b.mi * d < 0 && !b.fixed) b.mi = 0;
    if (Math.abs(a.mo) > lim && !a.fixed) a.mo = Math.sign(a.mo) * lim; if (Math.abs(b.mi) > lim && !b.fixed) b.mi = Math.sign(b.mi) * lim;
  }
  return K;
}

// ── body: the character's own bind (translation-only, metres) → the dimensions RUN-1 drives ────────────────────────────────────
// V2 constraints (physical-character-v2 sandbox/visual/physchar2/spec/v2_joints.js @ 15b0d5c6, hard − 5° = the usable planning box):
// hip flex −20…135 (−15…120 active), abd −30…45, rot −45…40; knee 0…150; ankle DF −55 (PF)…40, inversion ±25; lumbar axial ±10,
// thoracic axial ±40. The PI-1 V2 runner body (v2_pi1_runner.js) is generated from this very rig (vinicius rig.json): 1.76 m, thigh
// 0.43493 m, shank 0.39869 m, MTP 0.1805 m ahead / 0.031 m up, heel 0.0808 m behind, tip 0.2752 m ahead of the ankle joint.
const R1_LIMITS = { hipFlex: [-20, 135], hipAbd: [-30, 45], hipRot: [-45, 40], knee: [0, 150], ankleDF: [-55, 40], ankleInv: [-25, 25], mtpDF: [-30, 65], lumbarAxial: [-10, 10], thoracicAxial: [-40, 40], elbow: [0, 145], shoulderFlex: [-60, 175] };
function r1Body(skel) {
  const B = skel.byName, o = (n) => B[n].off;
  const feet = skel.feet && skel.feet.R ? skel.feet.R : null;
  const body = {
    skel, H: skel.H,
    pelvisY: o("pelvis")[1], hipX: Math.abs(o("thigh_R")[0]), thigh: Math.abs(o("shin_R")[1]), shank: Math.abs(o("foot_R")[1]),
    ankleH: skel.ankleH, mtp: [0, o("toe_R")[1], o("toe_R")[2]],                         // MTP joint relative to the ankle (bind = foot frame)
    heelZ: feet ? feet.footwearMin[2] : -0.08, tipZ: feet ? feet.footwearMax[2] : 0.27,
    shoulderX: Math.abs(o("clavicle_R")[0] + o("upperArm_R")[0]),
    upperArm: Math.abs(o("foreArm_R")[1]), foreArm: Math.abs(o("hand_R")[1]),
    idx: {},
  };
  for (const b of skel.bones) body.idx[b.name] = b.idx;
  body.legLen = body.thigh + body.shank;
  // segment mass fractions for the COM marker (V2 generator fractions, v2_body.js via PHYSICAL_CHARACTER_V2_SPEC §11)
  body.massFrac = { pelvis: 0.1116, spine: 0.1614, chest: 0.1603, head: 0.0686, upperArm_R: 0.0268, upperArm_L: 0.0268, foreArm_R: 0.0220, foreArm_L: 0.0220, thigh_R: 0.1403, thigh_L: 0.1403, shin_R: 0.0438, shin_L: 0.0438, foot_R: 0.0161, foot_L: 0.0161 };
  return body;
}

// ── the RUN-1 parameter set at the reference speed (5.5 m/s). Units: deg, s, m. Provenance per item in RUN1_RESEARCH.md ─────────
const RUN1 = {
  id: "RUN-1.3",
  ref: {
    v: 5.5,
    // timing: a footballer at 5.5 m/s — higher step rate, shorter steps and longer contact than a distance runner
    // (Hamner & Delp 2013; Takai 2025; Clark 2025; toe-off at ~29 % of the stride, between 37.5 % at 5 m/s treadmill and ~24 % sprinting)
    cadence: 3.20,            // steps / s (192 spm) for the 0.834 m reference leg; scaled by sqrt(Lref / L) for other legs
    tc: 0.175,                // contact time (s): flight 0.138 s, swing 0.450 s
    vSkew: 1.3,               // stance-force skew c (vertical below): the force peaks at 37 % of stance, the low point at 41 %, take-off 1.5 cm above touchdown.
                              // Fitted to 9 real strides (CMU, 3.4–4.1 m/s: low at 43 %, take-off +2.0 cm, apex +1.8 cm, range 9.0 cm; the model gives 41 % /
                              // +2.0 / +1.6 / 9.2 at their timing). RUN-1.0 scaled a symmetric spring-mass by 0.6, so its flight fell at 0.6 g
    kneeTD: 28, kneeTO: 19,   // touchdown knee (solved for by the plant distance); toe-off knee (prescribed late-stance curve). Real strides: 28.7° at touchdown
                              // (footballers ~31° near top speed, Romero 2022; Sundström 2021 21.6° at 4.4 m/s) — the foot lands under a bent knee, not ahead
                              // of a straight one; 14.7° at toe-off: the knee extends right through the push
    footW: 0.032,             // foot centre-line offset from the line of travel (narrow running base: Arellano 2015, 4.1 → 1.5 cm with speed)
    toeOut: 7,                // foot progression angle (deg, outward)
    strikeToeUp: -7,          // foot pitch at touchdown (+ toes up): a MID-FOOT landing, heel 7° up, which then lowers onto the turf — the ankle takes the
                              // first part of the load, so the knee flexes into the stance at a controlled rate (real strides: heel 3.7° up at touchdown, knee
                              // flexion ≤ 445 °/s after it; team-sport athletes land flatter with speed, Clark 2025). RUN-1.0: 8° toes up, a heel strike,
                              // knee 840 °/s at contact
    flatS: 0.12,              // stance fraction at which the foot is flat
    heelRiseS: 0.24,          // stance fraction from which the stance is knee-driven and the heel may rise: the real heel comes up progressively from
                              // early stance while the shank rolls over (RUN-1.0: 0.46 — the foot stayed flat past mid-stance, then peeled)
    kneePkExtra: 2, kneePkDelay: 0.05,   // the loading peak of the knee curve: 3° above the flat-foot knee's own peak, 5 % of stance later, so the
                              // heel is already lifting while the knee still loads (the foot rolls instead of collapsing the ankle)
    heelRiseTO: 74,           // foot pitch at toe-off (heel up), solved for by the pelvis height: shank ~53° + ~24° plantar-flexion (Miyashiro 2019)
    kneeMinS: 0.96,           // late stance: the knee extends practically to toe-off (real minimum at 100–108 % of stance; RUN-1.0: 86 %, then a locked
    kneeTOrate: 90,           // knee while the foot peeled up) and leaves the ground just turning into flexion (deg/s; RUN-1.0 320): triple extension, then
                              // the recovery — the small flexion keeps the toe clear of the turf while the hip is still extending
    // swing keys (w = swing fraction 0 at toe-off … 1 at touchdown); scissor timing: the rear thigh's peak extension and the front
    // thigh's peak flexion both fall ~0.03–0.04 s after the other foot's toe-off (Clark 2025)
    // E4: the recovery is a sequence — heel recovery (knee peak at 62 % of the stride, real 64.6 %), knee drive (the thigh peaks at 78 %, real 77 %,
    // RUN-1.0 83 %), then the lower leg unfolds and the foot comes DOWN onto the turf, settling back ~20° (real 15°) instead of reaching far ahead
    // low and pawing back 29° (RUN-1.0). The knee stays a little flexed into the contact (21° before re-flexing to the touchdown 26°).
    kneeMax: 115, kneeMaxW: 0.46, kneeHold: 100, kneeHoldW: 0.62, kneeExt: 21, kneeExtW: 0.92,
    hipMax: 58, hipMaxW: 0.70, hipExtMinW: 0.055, hipOpp: 0, hipOppK: 0,   // hipOpp*: the optional opposite-touchdown thigh key (off)
    anklePFMaxW: 0.07, anklePFExtra: 6, ankleDFSwing: -6, ankleDFW: 0.60,
    swingAbd: 8.0,            // extra abduction at mid swing (deg): the recovering leg passes outside the stance leg
    psiSwing: 8, psiSwingW: 0.48,   // mid-swing hip internal rotation (deg) — the recovering heel passes lateral of the stance calf
    toeRelaxW: 0.22,
    // pelvis (deg): tilt peaks near each toe-off; the swing-side hip drops in early stance; axial rotation follows the thigh scissor
    tilt: 8.5, tiltAmp: 2.2, tiltPh: 0.29,   // anterior tilt, peaking at each toe-off (Ota 2024: 6.6 → 9.2° touchdown → toe-off in sprinting): the push-off thigh
                                              // sweeps back with the pelvis tilting over it, not by hyper-extending the hip (RUN-1.0: 6°)
    // E5 — real strides (3 subjects, 9 strides): the pelvis turns WITH the thorax (right hip furthest back at the right touchdown, 4 % of the
    // stride; shoulders at 98 %) — the arms and shoulders counter the LEGS, not the pelvis; the swing-side drop builds through the stance and
    // peaks around toe-off (31 %). RUN-1.0 counter-rotated pelvis and thorax (39 % vs 86 %: a ±19° spine wring) and dropped the swing side just
    // after touchdown (9 %). Amplitudes stay below the skin-marker values (obliquity overstated up to 4×, MacWilliams 2014)
    obliq: 4.0, obliqPh: 0.30,
    pelvisYaw: 6, pelvisYawPh: 0.04,
    sway: 0.012, swayPh: 0.12,
    // trunk (deg): constant-speed lean 5–8° (Preece 2016b), thorax counter-rotates the pelvis (Preece 2016a; Pontzer 2009: ~24° shoulder range at 3 m/s)
    lean: 12.5, leanAmp: 3.0, leanPh: 0.16, // the trunk DIPS INTO EVERY STANCE: real strides lean 12.6° (pelvis → neck, relative to standing) and pitch 6.2° per
                                            // step, most forward at ~60 % of stance, most upright in flight (RUN-1.0: 8° ± 1°, a rigid, upright trunk)
    thoraxYaw: 10.5, thoraxYawPh: 0.03,
    // arms (deg): contralateral to the legs. The work is the ELBOW DRIVING BACK: real strides swing the upper arm from ~42° behind the trunk
    // to about level with it (+1.5°, range −10…+16 at 3.6 m/s) with the elbow flexed 94–124°, so the hand comes forward only to the front of
    // the trunk (≈ 20 cm ahead of the hips). RUN-1.0 swung it 33° in FRONT with a 72–96° elbow: the hand reached ~50 cm ahead, a pendulum.
    // Each arm is most forward just before its own leg's toe-off (real 26 % of the stride, RUN-1.0 36 %), so it drives back through the other
    // leg's push; the elbow closes a little after the forward extreme (real lag 9 % of the stride) and opens in the drive back.
    armFwd: 5, armBack: 50, armPh: -0.25,
    elbow: 102, elbowAmp: 18, elbowPh: 0.08,
    armAbd: 8, armAbdAmp: 3, armAbdPh: 0.12, armRot: 6,       // elbows close to the trunk (RUN-1.0 12°); the wrist stays lateral of the sternal notch (Hild 2005)
    clavProt: 5,
    asymArm: 0.06, asymElbow: 3,   // a deterministic dominant-side asymmetry: the right arm swings 6 % wider, the left elbow sits 3° more open
    gazeDown: 6, headNod: 1.2, headYawFollow: 0.22, headRollFollow: 0.15,
  },
};

// ── speed anchors: one parameter set per anchor speed, blended piecewise-linearly by the AUTHORITATIVE speed (clamped outside) ──
// JOG 3.0 m/s and SPRINT 7.8 m/s are footballer variants of the same construction (provenance: RUN1_RESEARCH.md §speed scaling):
// contact time halves while swing time barely changes (Weyand 2000; Hamner & Delp 2013); rear-foot strike at the jog, flat at the sprint
// (Siegel 2023; Clark 2025); more knee recovery, hip drive, arm range and trunk lean with speed (Fukuchi 2017; Miyashiro 2019; Romero 2022).
// RUN-1.2 REGIMES. RUN-1.1 is one gait stretched across speed: its 5.5 m/s limb waveforms are those of real 3.6–4.1 m/s joggers (review_artifacts/
// locomotion_v2_run1/RUN1_2_REGIMES.md). RUN-1.2 keeps RUN-1.1 EXACTLY up to 4.0 m/s (the JOG regime: the 3.0 anchor below is RUN-1.1's, the 4.0
// anchor is RUN-1.1's own blend at 4.0, so the linear blend between them reproduces RUN-1.1), then blends into regimes fitted at their own speeds:
// RUN at 5.5 m/s and SPRINT at 7.8 m/s (RUN1.regimes). Every speed is still one continuous construction (one solve per speed-grid cell).
RUN1.jog11 = { v: 3.0, id: "JOG", cadence: 2.75, tc: 0.25, kneeTD: 24, kneeTO: 16, kneeTOrate: 140, footW: 0.04, strikeToeUp: -2, flatS: 0.14, heelRiseTO: 60, heelRiseS: 0.30,
  kneeMax: 100, kneeMaxW: 0.48, kneeHold: 92, kneeHoldW: 0.65, kneeExt: 16, kneeExtW: 0.92, hipMax: 47, hipMaxW: 0.72, ankleDFSwing: -12,
  tilt: 7.5, lean: 9, leanAmp: 2.4, thoraxYaw: 10, pelvisYaw: 6, sway: 0.016, armFwd: 0, armBack: 40, elbow: 106, elbowAmp: 14, armAbd: 8 };
RUN1.regimes = { SPRINT: null };                                                   // overrides on RUN1.ref (the RUN-1.1 5.5 m/s set); SPRINT set below
// RUN — a 5.5 m/s football run (RUN1_2_REGIMES.md §2). RUN-1.1's timing already matches the overground data (DSP12 / CL20); what changes is
// the body: R1 a stiffer stance on a clear fore-foot landing and an earlier unfolding of the lower leg, so the foot is swept under the body
// instead of being placed at the last instant.
RUN1.regimes.RUN = { v: 5.5, id: "RUN",
  kneeTD: 24, kneePkExtra: 0, kneeTO: 16,       // stance knee 24 → ~46 → 16 (real ≈45° peak at 4.5–5 m/s; RUN-1.1: 28 → 54, deeper than its own jog)
  strikeToeUp: -10, flatS: 0.14, heelRiseTO: 78,   // fore-foot landing (7 of 9 runners at 5.2 m/s, DSP12), heel lowering over 14 % of stance; higher on the toes at toe-off
  kneeExt: 21, kneeExtW: 0.85,                  // the lower leg finishes unfolding by 85 % of the swing (RUN-1.1: 92 %), then the leg sweeps back into the contact
  // R2 the recovery is front-loaded: the heel snaps up earlier and higher and stays folded while the knee drives (peak swing knee 125° at 59 % of
  // the stride, real ≈116° at 4.5 / ≈128° at 5.0 m/s; RUN-1.1 115° at 61 %), the thigh peaks ≈51° at the opposite toe-off (CL20 ≈46–49°)
  kneeMax: 125, kneeMaxW: 0.43, kneeHold: 110, kneeHoldW: 0.60, hipMax: 61,
  // R3 the arms drive: arm action grows continuously with speed (HD13: arm angular momentum doubles 2 → 5 m/s; 200 m sprinters' shoulder range
  // 118–135°). Upper arm ≈56° behind → ≈22° in front of the trunk (RUN-1.1: 50 / 5 — the 3.6 m/s jog carriage), the elbow opening to ≈70° in the
  // drive back and closing to ≈122° in front, so the hand comes up to chest–chin height instead of staying at the waist
  armFwd: 20, armBack: 56, elbow: 96, elbowAmp: 26, armAbdAmp: 4,
  // R4 the pelvis drives, the shoulders counter: marker-based pelvis data (Fukuchi 2017, CC BY; tools/ref/fuk_pelvis.py) put "right hip back" at
  // ≈20 % of the stride (mid-stance), lagging the shoulder line by ≈75°, and the pelvis range grows with speed (≈15° → 21° from 3.3 to 5 m/s,
  // thorax-on-pelvis up to ≈33°). RUN-1.1 turned pelvis and thorax together (E5, from CMU skeleton fits): ±6° and a ±4.5° spine twist — one
  // block. Trunk lean is NOT increased (steady-speed lean does not grow with speed); its stance dip is kept, a little firmer
  pelvisYaw: 10, pelvisYawPh: 0.20, thoraxYaw: 12, obliq: 5, tiltAmp: 3.0, lean: 11.5, leanAmp: 2.5,
};
RUN1.anchors11 = [                                                                   // RUN-1.1's anchors, verbatim (the jog source)
  { v: 3.0, id: "JOG", cadence: 2.75, tc: 0.25, kneeTD: 24, kneeTO: 16, kneeTOrate: 140, footW: 0.04, strikeToeUp: -2, flatS: 0.14, heelRiseTO: 60, heelRiseS: 0.30,
    kneeMax: 100, kneeMaxW: 0.48, kneeHold: 92, kneeHoldW: 0.65, kneeExt: 16, kneeExtW: 0.92, hipMax: 47, hipMaxW: 0.72, ankleDFSwing: -12,
    tilt: 7.5, lean: 9, leanAmp: 2.4, thoraxYaw: 10, pelvisYaw: 6, sway: 0.016, armFwd: 0, armBack: 40, elbow: 106, elbowAmp: 14, armAbd: 8 },
  { v: 5.5, id: "RUN" },
  { v: 7.8, id: "SPRINT", cadence: 4.15, tc: 0.12, kneeTD: 30, kneeTO: 22, kneeTOrate: 120, footW: 0.02, strikeToeUp: -5, flatS: 0.14, heelRiseTO: 80, heelRiseS: 0.16,   // the heel leaves early at a sprint
    kneeMax: 132, kneeMaxW: 0.44, kneeHold: 116, kneeHoldW: 0.60, kneeExt: 24, kneeExtW: 0.90, hipMax: 70, hipMaxW: 0.68,
    tilt: 10.5, lean: 15, leanAmp: 2.8, thoraxYaw: 15, pelvisYaw: 7, sway: 0.008, armFwd: 25, armBack: 56, elbow: 96, elbowAmp: 22, armAbd: 8 },
];
// SPRINT — a footballer near top speed, 7.8 m/s (RUN1_2_REGIMES.md §3): RUN-1.1's sprint anchor + the structural sprint changes. Cadence carries
// the speed (step ≈1.95 m, the plateau above ~7 m/s), the stance force is front-loaded (Clark & Weyand 2014), the swing leg LEADS the cycle (heel
// tucked by the opposite touchdown with the thigh near vertical, then driven violently to ≈65° at the opposite toe-off — team-sport athletes, CL25),
// the thighs are split ≈92° at toe-off and nearly together at touchdown, the arms become a drive (hands to face height), the trunk is NOT more
// inclined than at the run (steady top speed ≈5–14°, NAG14; steep lean belongs to acceleration), the pelvis turns ≈±6–7° (OTA24)
RUN1.regimes.SPRINT = Object.assign({}, RUN1.anchors11[2], {
  cadence: 4.05, vSkew: 1.4,
  kneeMax: 135, kneeMaxW: 0.44, kneeHold: 120, kneeHoldW: 0.58, kneeExt: 24, kneeExtW: 0.84,
  hipMax: 77, hipOpp: 8, hipOppK: 1,
  armFwd: 42, armBack: 56, elbow: 95, elbowAmp: 30, armAbdAmp: 4,
  lean: 12, leanAmp: 2.0, pelvisYaw: 7, pelvisYawPh: 0.20, thoraxYaw: 14, obliq: 5, tiltAmp: 3,
});
// RUN-1.3 — ALL-OUT. The user (10 Oct, after watching RUN-1.2): keep the three RUN-1.2 regimes exactly; they read one category slower than their
// names (LOW / JOG / FAST RUN, RUN1.ladder), and the missing category is a footballer running as fast as he physically can. ALL-OUT is fitted at
// its own speed (RUN1_3_ALLOUT.md). RUN-1.3 ≡ RUN-1.2 at every speed ≤ 8.0 m/s: the SPRINT parameters hold from 7.8 to 8.0 m/s (RUN-1.2 already
// held them above 7.8), and the blend into ALL-OUT starts at the 8.0 m/s speed-grid cell, so every cell ≤ 8.0 is RUN-1.2's own solve.
// ALL-OUT — a footballer at his maximum speed, 9.5 m/s (≈34 km/h: a fast professional winger; LaLiga season-best match peaks, forwards 9.2 ± 0.4 m/s,
// 15 % of players above 9.44, fastest 9.78 — Del Coso 2020). Fitted to top-speed data (RUN1_3_ALLOUT.md §2): footballer values where they exist
// (Clark 2025 "fast team-sport" athletes at 9.3 m/s; Kadlec 2024), otherwise sprinters at 9.5–9.9 m/s (Clark 2020; Miyashiro 2019). From FAST RUN:
RUN1.regimes.ALLOUT = Object.assign({}, RUN1.regimes.SPRINT, { v: 9.5, id: "ALLOUT",
  // speed from turnover: 4.55 steps/s × 2.09 m (9.50 m/s males 4.58 × 2.07, contact 105 ms, flight 114 ms — Clark 2020); same subjects 7 → 9 m/s:
  // stride frequency +25 %, stride length +3 % (Dorn 2012). The force skew stays at FAST RUN's 1.4: even sprinters' first-half / second-half vertical
  // force (2.65 / 1.71 BW, Clark & Weyand 2014) is less front-loaded than that; the impact peak (~27 % of contact) is a two-mass feature
  cadence: 4.55, tc: 0.102,                     // (0.102 s → 104 ms measured on frames)
  // a stiff, tall stance: knee 27° at touchdown (152–153° included, Miyashiro 2019 / Haugen 2018), yields ≈14° (13.6 ± 3.6°), extends to 21° at toe-off
  // (Paradisis 2019 161 ± 7°); the foot lands nearly flat (team-sport athletes 0.2 ± 6.5° at top speed, Clark 2025 — FAST RUN's strike is kept)
  kneeTD: 27, kneeTO: 21, kneePkExtra: 0, heelRiseTO: 78, footW: 0.018, sway: 0.006,
  // swing: heel recovery to 142° (sprinters 148°), peaking later than a sprinter's so the knee is ≈127° when the other foot lands (team sport 118°,
  // track 131°, Clark 2025); thigh drive ≈66° (team sport 65 ± 7°, sprinters 70°); the swing thigh ≈ vertical at the other touchdown (team sport −7°,
  // sprinters +4°); swing ankle dorsiflexed (design)
  kneeMax: 142, kneeMaxW: 0.46, kneeHold: 118, kneeHoldW: 0.55, kneeExt: 26, kneeExtW: 0.82,
  hipMax: 81, hipMaxW: 0.66, hipOpp: 10, hipOppK: 1, ankleDFSwing: -14, ankleDFW: 0.55,
  // arms: a full drive within V2's shoulder box (extension −60°): range ≈113° (200 m sprinters 118–135°, Mann via Macadam 2018), the elbow opening to
  // ≈50° behind and closing to ≈130° in front (one sprinter at top speed 44–142°, Haralabidis 2021, CC BY); hand to cheek height
  armFwd: 50, armBack: 56, elbow: 90, elbowAmp: 40, armAbdAmp: 4,
  // trunk nearly upright at top speed (6–9° from vertical at contact: Haugen 2018, Paradisis 2019) — a little MORE upright than FAST RUN, never more
  // inclined; the pelvis turns more (range ≈17°: rotation plateaus ≈16° in acceleration, Nagahara 2018; one sprinter ≈24°) with the thorax countering;
  // the head steadier (design: no head data at top speed)
  lean: 10, leanAmp: 1.6, tilt: 12, tiltAmp: 3.2, pelvisYaw: 9.5, thoraxYaw: 17, obliq: 5, headNod: 0.8, headYawFollow: 0.15,
});
RUN1.allOutFrom = 8.0;                                                             // the last RUN-1.2 grid cell; the ALL-OUT blend starts here
// what the user calls each regime (presentation labels; the parameter keys keep their fitting history)
RUN1.ladder = { JOG: "LOW", RUN: "JOG", SPRINT: "FAST RUN", ALLOUT: "ALL-OUT" };
function r1Anchors(ref) {                                       // the anchor list: JOG 3.0 · JOG 4.0 (= RUN-1.1 at 4.0) · RUN · SPRINT 7.8 · SPRINT 8.0 · ALL-OUT
  const J = Object.assign({}, ref, RUN1.jog11), R11 = Object.assign({}, ref, RUN1.anchors11[1]), t = (4.0 - 3.0) / (5.5 - 3.0), J4 = { v: 4.0, id: "JOG" };
  for (const k in ref) if (typeof ref[k] === "number") J4[k] = J[k] + (R11[k] - J[k]) * t;
  const S = Object.assign({}, ref, RUN1.regimes.SPRINT);
  return [J, Object.assign({}, ref, J4, { v: 4.0, id: "JOG" }), Object.assign({}, ref, RUN1.regimes.RUN), S, Object.assign({}, S, { v: RUN1.allOutFrom }), Object.assign({}, ref, RUN1.regimes.ALLOUT)];
}
function r1ParamsAt(v, base) {
  const ref = base || RUN1.ref, A = r1Anchors(ref);
  let i = 0; while (i < A.length - 2 && v > A[i + 1].v) i++;
  const a = A[i], b = A[i + 1], t = Math.max(0, Math.min(1, (v - a.v) / (b.v - a.v))), P = {};
  for (const k in ref) P[k] = typeof ref[k] === "number" ? a[k] + (b[k] - a[k]) * t : ref[k];
  P.v = v; P.anchor = t < 0.5 ? a.id : b.id; P.blend = i + t; return P;
}

// The vertical over one STEP (tau from the touchdown, contact tc, step Ts), relative to the touchdown height. Stance: a = A·f(s) − g with
// f(s) = s(1 − s)(1 + c(½ − s)), s = tau / tc — a smooth force, zero at both contact events, peaking before mid-stance for c > 0; its
// impulse balances the body weight over the step (A = 6 g Ts / tc, since ∫f = 1/6 for every c). Flight: ballistic at g. Periodicity
// fixes the take-off height above the touchdown, dTO = g tc tf c / 20, and vTD = −g tf / 2 − dTO / tf. c = 0 is the symmetric
// (parabolic-force) spring-mass. Closed form: height, velocity and acceleration are continuous through both events.
function r1Vertical(tau, tc, Ts, g, c) {
  const tf = Ts - tc, A = 6 * g * Ts / tc, b1 = 1 + c / 2, b2 = 1 + 1.5 * c, b3 = c;
  const dTO = g * tc * tf * c / 20, vTD = -g * tf / 2 - dTO / tf, vTO = vTD + g * tf;
  if (tau < tc) { const s = tau / tc, s2 = s * s, s3 = s2 * s;
    return { y: vTD * tau + A * tc * tc * (b1 * s3 / 6 - b2 * s3 * s / 12 + b3 * s3 * s2 / 20) - g * tau * tau / 2, v: vTD + A * tc * (b1 * s2 / 2 - b2 * s3 / 3 + b3 * s3 * s / 4) - g * tau, a: A * (b1 * s - b2 * s2 + b3 * s3) - g }; }
  const t = tau - tc; return { y: dTO + vTO * t - g * t * t / 2, v: vTO - g * t, a: -g };
}

// ── derived per-speed gait (timing + the solved plant / pelvis height). Deterministic; cached on the body per parameter object ──
function r1Gait(body, prm, v) {
  const p = Object.assign({}, prm);
  const Lref = 0.834, kL = Math.sqrt(Lref / body.legLen);
  p.v = v; p.cadence = prm.cadence * kL; p.Ts = 1 / p.cadence; p.T = 2 * p.Ts;
  p.tc = prm.tc / kL; p.D = p.tc / p.T; p.stepLen = v * p.Ts;                            // a longer leg: lower cadence, longer contact
  p.y0 = body.pelvisY - 0.08; p.zTD = 0.30;
  // solve (zTD, y0) so the stance knee equals kneeTD at touchdown and kneeTO at toe-off. Both relations are monotone (a higher pelvis
  // straightens both knees; a plant further ahead straightens the touchdown knee), so nested bisection is robust and deterministic.
  const G = { body, p };
  const kneeAt = (s) => r1StanceLeg(G, "R", s).ch.k / R1_DEG, heelAt = () => -r1StanceLeg(G, "R", 1).beta / R1_DEG;
  // 34 halvings each: 0.35 m / 2^34 ≈ 2e-11 m (RUN-1.0: 48) — the solve is per speed-grid cell, at first use; the knee-driven stance rebuilds its
  // knee curve for every trial pelvis height, so the halving count is most of the cost
  const solveY = () => { let lo = body.pelvisY - 0.30, hi = body.pelvisY + 0.05; for (let i = 0; i < 34; i++) { p.y0 = (lo + hi) / 2; G.late = null; if (heelAt() < p.heelRiseTO) lo = p.y0; else hi = p.y0; } };
  { let lo = -0.10, hi = 0.70; for (let i = 0; i < 34; i++) { p.zTD = (lo + hi) / 2; solveY(); if (kneeAt(0) > p.kneeTD) lo = p.zTD; else hi = p.zTD; } }
  G.late = null;
  p.solveErr = r1StanceErr(G); p.late = G.late;
  // swing boundary conditions (stance channels + slopes at toe-off and touchdown), both legs are mirror images
  p.swing = { R: r1SwingKnots(G, "R"), L: r1SwingKnots(G, "L") };
  return p;
}
function r1StanceErr(G) {
  const a = r1StanceLeg(G, "R", 0), b = r1StanceLeg(G, "R", 1);
  return [a.ch.k / R1_DEG - G.p.kneeTD, -b.beta / R1_DEG - G.p.heelRiseTO, b.ch.k / R1_DEG - G.p.kneeTO];
}

// ── pelvis at global phase u (root frame) ──────────────────────────────────────────────────────────────────────────────────────
function r1Pelvis(G, u) {
  const p = G.p, g = 9.81, ustep = r1wrap(u * 2), tau = ustep * p.Ts;
  const sm = r1Vertical(tau, p.tc, p.Ts, g, p.vSkew);
  const y = p.y0 + sm.y;                                                                    // y0 = the pelvis height at touchdown
  const x = p.sway * Math.cos(R1_TAU * (u - p.swayPh));                                   // toward the RIGHT foot during the right stance
  const tilt = (p.tilt + p.tiltAmp * Math.cos(2 * R1_TAU * (u - p.tiltPh))) * R1_DEG;      // anterior tilt (forward), twice per stride
  const roll = p.obliq * Math.cos(R1_TAU * (u - p.obliqPh)) * R1_DEG;                    // + = right hip up (left side drops in the right stance)
  const yaw = p.pelvisYaw * Math.cos(R1_TAU * (u - p.pelvisYawPh)) * R1_DEG;              // + = turned right (left hip forward)
  const R = R3.mul3(R3.y(yaw), R3.x(tilt), R3.z(roll));
  return { pos: [x, y, 0], R, tilt, roll, yaw, sm };
}

// ── stance leg at stance fraction s (0 touchdown … 1 toe-off; analytic continuation outside) ──────────────────────────────────
// early stance foot pitch beta (deg, + = toes up): the rear-foot contact rolls flat (slope 0 at flat), then the foot is flat
function r1FootPitch(p, s) {
  if (s <= p.flatS) { const t = s / p.flatS; return p.strikeToeUp * (1 - t) * (1 - t) * (1 + 0.6 * t); }   // the heel lowers at once: it takes the
  return 0;                                                                                                   // first of the landing (mid-foot strike)
}
// the stance geometry shared by both phases: pelvis, hip, the plant (flat-foot ankle point), foot yaw, leg-plane yaw
function r1StanceBase(G, sd, s, pl) {
  const { body, p } = G, side = sd === "R" ? 1 : -1;
  const u = r1wrap((sd === "R" ? 0 : 0.5) + s * p.D);                                       // global phase
  const pel = r1Pelvis(G, u);
  const psiF = side * p.toeOut * R1_DEG, Ry = R3.y(psiF);
  // the plant (flat-foot ankle point) in the root frame: fixed on the pitch, so it travels back at exactly the root speed
  const flat = pl ? [side * pl.footW, body.ankleH, pl.zTD - pl.travel] : [side * p.footW, body.ankleH, p.zTD - p.v * s * p.tc];   // runtime: the plant made at THIS touchdown, back by the root's own travel
  const hip = RV.add(pel.pos, R3.v(pel.R, [side * body.hipX, 0, 0]));
  return { u, pel, psiF, Ry, flat, hip, psi: psiF - pel.yaw };
}
// MTP extension cap for the push-off: the toes stay flat on the turf until the MTP joint reaches ~52° of dorsiflexion (smooth, C1); beyond
// that the toe segment itself pitches and the foot rolls onto the toe pad (front studs) — V2 F1 MTP range: DF 60° active / 70° hard
const R1_MTP = { cap: 52 * Math.PI / 180, w: 8 * Math.PI / 180, padAhead: 0.08 };   // pad 8 cm ahead of the MTP joint: the boot tip (toe spring) never swings below the turf
function r1MtpDF(up) { const c = R1_MTP.cap, w = R1_MTP.w; if (up <= c - w) return up; if (up >= c + w) return c; const x = up - (c - w); return up - x * x / (4 * w); }
function r1AnkleAt(body, B, beta) {                     // foot rolled by beta about the heel contact (beta > 0), or heel-up about the MTP joint / toe pad (beta < 0)
  const Rf = R3.mul(B.Ry, R3.x(-beta));
  if (beta > 0) { const hz = body.heelZ + 0.012, heel = RV.add(B.flat, R3.v(B.Ry, [0, -body.ankleH, hz])); return { Rf, ankle: RV.add(heel, R3.v(Rf, [0, body.ankleH, -hz])), mtpDF: 0 }; }
  const up = -beta, tau = r1MtpDF(up), toeUp = up - tau;                               // toe-segment pitch (heel-up sense) once the MTP extension is capped
  const flatPad = RV.add(B.flat, R3.v(B.Ry, [0, -body.ankleH, body.mtp[2] + R1_MTP.padAhead]));   // toe-pad contact on the stud plane, fixed on the pitch
  const Rt = R3.mul(B.Ry, R3.x(toeUp));                                               // toe segment world rotation (heel-up by toeUp)
  const mtpW = RV.add(flatPad, R3.v(Rt, [0, body.ankleH + body.mtp[1], -R1_MTP.padAhead]));   // MTP joint from the fixed toe pad
  return { Rf, ankle: RV.add(mtpW, R3.v(Rf, RV.sc(body.mtp, -1))), mtpDF: tau };
}
// knee-driven stance curve from the heel-rise onset: C1 from the flat-foot IK knee there → the loading peak (a little above and after the
// flat-foot knee's own peak, so the heel lifts while the knee still loads) → [extension minimum] → toe-off. The heel rise is solved from it.
function r1LateKnots(G, sd) {
  const { body, p } = G, key = p.zTD + "|" + p.y0;
  if (G.late && G.late.key === key) return G.late;
  const kFlat = (s) => { const B = r1StanceBase(G, sd, s), A = r1AnkleAt(body, B, 0); return r1LegIK(body, B.pel.R, B.psi, B.hip, A.ankle).k; };
  const s0 = p.heelRiseS, h = 1e-4, k0 = kFlat(s0), m0 = (kFlat(s0) - kFlat(s0 - h)) / h;
  const kTO = p.kneeTO * R1_DEG, mTO = p.kneeTOrate * R1_DEG * p.tc, K = [{ w: s0, v: k0, m: m0, fixed: true }];
  if (m0 > 0 && p.kneePkExtra != null) {                                 // the flat-foot knee is still loading at the onset: place the loading peak
    let sF = s0, kF = k0; for (let i = 1; i <= 60; i++) { const ss = s0 + (1 - s0) * i / 60, kk = kFlat(ss); if (kk > kF) { kF = kk; sF = ss; } else break; }
    K.push({ w: Math.min(0.9, sF + p.kneePkDelay), v: kF + p.kneePkExtra * R1_DEG, m: 0 });
  }
  if (p.kneeMinS < 0.995) K.push({ w: p.kneeMinS, v: Math.min(kTO - 0.6 * p.kneeTOrate * R1_DEG * (1 - p.kneeMinS) * p.tc, k0 - 1 * R1_DEG), m: 0 });   // the dip matches the toe-off rate
  K.push({ w: 1, v: kTO, m: mTO, fixed: true });
  G.late = { key, K: r1HermPrep(K) };
  return G.late;
}
function r1StanceLeg(G, sd, s, pl) {
  const { body, p } = G, B = r1StanceBase(G, sd, s, pl);
  let beta = 0, kWant = null;
  if (s <= p.heelRiseS) beta = r1FootPitch(p, s) * R1_DEG;
  else {                                                                                   // knee-driven heel rise: the toe joint stays on the turf
    kWant = r1Herm(r1LateKnots(G, sd).K, Math.min(s, 1.02));
    const t = body.thigh, sh = body.shank, dWant = Math.sqrt(t * t + sh * sh + 2 * t * sh * Math.cos(kWant));
    const dAt = (b) => RV.len(RV.sub(r1AnkleAt(body, B, b).ankle, B.hip));
    if (dAt(0) > dWant) { let lo = -88 * R1_DEG, hi = 0; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (dAt(m) > dWant) hi = m; else lo = m; } beta = (lo + hi) / 2; }
  }
  const A = r1AnkleAt(body, B, beta);
  const ik = r1LegIK(body, B.pel.R, B.psi, B.hip, A.ankle);
  const Rshin = R3.mul(B.pel.R, R3.mul(ik.Rthigh, ik.Rshin));
  const footLocal = R3.toYXZ(R3.mul(R3.tr(Rshin), A.Rf));
  const ch = { psi: B.psi, a: ik.a, h: ik.h, k: ik.k, fy: footLocal[0], fp: footLocal[1], fr: footLocal[2], toe: beta < 0 ? -A.mtpDF : 0 };
  return { ch, ankle: A.ankle, hip: B.hip, Rf: A.Rf, beta, pel: B.pel, reach: ik.reach, u: B.u, kWant };
}
// analytic two-bone leg IK in the leg frame F = Rpelvis·Ry(psi): adduction a about F's forward axis, then the planar chain
function r1LegIK(body, Rp, psi, hip, ankle) {
  const F = R3.mul(Rp, R3.y(psi)), D = R3.v(R3.tr(F), RV.sub(ankle, hip));
  const a = Math.atan2(D[0], -D[1]), r = Math.hypot(D[0], D[1]), t = body.thigh, s = body.shank;
  let d = Math.hypot(r, D[2]); const dMax = t + s - 1e-6, reach = d / (t + s); if (d > dMax) d = dMax;
  const cosK = (t * t + s * s - d * d) / (2 * t * s), k = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK)));
  const alpha = Math.acos(Math.max(-1, Math.min(1, (t * t + d * d - s * s) / (2 * t * d))));
  const h = Math.atan2(D[2], r) + alpha;
  return { a, h, k, reach, Rthigh: R3.mul3(R3.y(psi), R3.z(a), R3.x(-h)), Rshin: R3.x(k) };
}

// ── swing knots for one leg from the stance boundary conditions ─────────────────────────────────────────────────────────────────
const R1_CH = ["psi", "a", "h", "k", "fy", "fp", "fr", "toe"];
function r1StanceSlopes(G, sd, s, hs) {                // d(channel)/d(swing fraction w), from the stance solution (one-sided, 2nd order)
  const p = G.p, c0 = r1StanceLeg(G, sd, s).ch, c1 = r1StanceLeg(G, sd, s + hs).ch, c2 = r1StanceLeg(G, sd, s + 2 * hs).ch, out = {};
  const kw = (1 - p.D) / p.D;                          // dc/dw = dc/ds · (ds/dφ)/(dw/dφ) = dc/ds · (1/D)/(1/(1−D))
  for (const k of R1_CH) out[k] = ((-3 * c0[k] + 4 * c1[k] - c2[k]) / (2 * hs)) * kw;
  return { c: c0, m: out };
}
function r1SwingKnots(G, sd) {
  const p = G.p, side = sd === "R" ? 1 : -1, TO = r1StanceSlopes(G, sd, 1, -1e-4), TD = r1StanceSlopes(G, sd, 0, 1e-4);
  const K = {};
  const knot = (w, v, m, fixed) => ({ w, v, m: m == null ? 0 : m, fixed: !!fixed });
  const D = R1_DEG;
  for (const c of R1_CH) K[c] = [knot(0, TO.c[c], TO.m[c], true), knot(1, TD.c[c], TD.m[c], true)];
  // knee: rapid recovery flexion → late-swing extension → the touchdown value (already flexing into the stance)
  const kExt = Math.min(p.kneeExt * D, TD.c.k - 1.5 * D);
  K.k = [K.k[0], knot(p.kneeMaxW, p.kneeMax * D), knot(p.kneeHoldW, p.kneeHold * D, -2.2 * (p.kneeMax - p.kneeHold) * D / (p.kneeHoldW - p.kneeMaxW)), knot(p.kneeExtW, kExt), K.k[1]];
  // hip flexion in the leg plane: the extension carries on briefly after toe-off, drive to peak flexion, retraction to touchdown
  const hExtMin = TO.c.h + Math.min(0, TO.m.h) * p.hipExtMinW * 0.5;
  K.h = [K.h[0], knot(p.hipExtMinW, hExtMin), knot(p.hipMaxW, p.hipMax * D), K.h[1]];
  // optional key: the swing thigh at the OPPOSITE touchdown (sprint mechanics: near vertical while the heel is tucked, then driven violently to
  // its peak at the opposite toe-off — CL25 team-sport athletes ≈7° behind vertical, track ≈11° in front). Blended in by weight hipOppK: the key
  // first takes the existing curve's own value and slope there (a cubic Hermite split at its own point is the same curve), so hipOppK = 0 is
  // exactly RUN-1.1's swing, and the value moves toward hipOpp (deg, relative to the pelvis) as the weight rises
  // ALWAYS present (the speed grid blends knot lists index by index, so every speed must carry the same knots); at weight 0 it is an exact copy
  { r1HermPrep(K.h); const wO = Math.max(p.hipExtMinW + 0.02, Math.min(p.hipMaxW - 0.02, (0.5 - p.D) / (1 - p.D))), v0 = r1Herm(K.h, wO), m0 = r1HermD(K.h, wO);
    K.h.splice(2, 0, knot(wO, v0 + (p.hipOpp * D - v0) * (p.hipOppK || 0), m0, true)); }
  // ankle pitch (+ = plantar-flexion): the push-off carries on briefly, then dorsiflexion for clearance, then the strike angle
  const pfMax = TO.c.fp + Math.min(p.anklePFExtra * D, Math.max(0, TO.m.fp) * p.anklePFMaxW * 0.5);   // the push-off plantar-flexion carries on a few degrees
  // pre-contact: a mid-foot landing dorsiflexes the ankle fast from the first instant (the heel lowers, the shank rolls over). Real ankles reverse
  // at the impact; C1 places that reversal in the last ~12 ms of the swing instead, through a key just above the touchdown value with zero slope —
  // otherwise the Hermite would bulge into a 30° plantar-flexion (toes into the turf) a few frames before contact
  const pcW = Math.min(0.06, 0.012 / ((1 - p.D) * p.T)), pcV = TD.c.fp - TD.m.fp * pcW / 3;
  K.fp = [K.fp[0], knot(p.anklePFMaxW, pfMax), knot(p.ankleDFW, p.ankleDFSwing * D), knot(1 - pcW, Math.max(pcV, TD.c.fp)), K.fp[1]];
  // hip adduction: a little abduction at mid swing (the swing knee passes outside the stance knee)
  K.a = [K.a[0], knot(0.45, (TO.c.a + TD.c.a) / 2 + side * p.swingAbd * D), K.a[1]];   // + side = abduction (Rz(a) moves the leg toward +x: lateral for R, medial for L)
  // leg yaw: the stance toe-out (hip external rotation) would carry the tucked heel MEDIALLY across the stance leg; through mid-swing the
  // hip rotates slightly internally instead, so the recovering foot passes lateral of the stance calf
  K.psi = [K.psi[0], knot(p.psiSwingW, -side * p.psiSwing * D), K.psi[1]];
  // toe: the MTP extension relaxes early in the swing
  K.toe = [K.toe[0], knot(p.toeRelaxW, 2 * D), K.toe[1]];
  for (const c of R1_CH) r1HermPrep(K[c]);
  return { K, TO, TD };
}

// ── the full pose at global phase u: per-bone LOCAL rotations (bind = identity) + pelvis translation, root frame ───────────────
function r1Pose(G, u, plants) {
  const { body, p } = G, D = R1_DEG, pel = r1Pelvis(G, u), rot = {}, legs = {};
  rot.pelvis = pel.R;
  for (const sd of ["R", "L"]) {
    const side = sd === "R" ? 1 : -1, ul = r1wrap(u - (sd === "R" ? 0 : 0.5));
    let ch, st, s = null, w = null;
    if (ul < p.D) { s = ul / p.D; const S = r1StanceLeg(G, sd, s, plants && plants[sd]); ch = S.ch; st = true; }
    else { w = (ul - p.D) / (1 - p.D); const K = p.swing[sd].K; ch = {}; for (const c of R1_CH) ch[c] = r1Herm(K[c], w); st = false; }
    rot["thigh_" + sd] = R3.mul3(R3.y(ch.psi), R3.z(ch.a), R3.x(-ch.h));
    rot["shin_" + sd] = R3.x(ch.k);
    rot["foot_" + sd] = R3.yxz(ch.fy, ch.fp, ch.fr);
    rot["toe_" + sd] = R3.x(ch.toe);
    legs[sd] = { st, s, w, ul, ch };
  }
  // trunk: global lean target split over pelvis tilt / lumbar / thorax; thorax counter-rotation mostly in the thoracic spine
  const lean = (p.lean + (G.accLean || 0) + p.leanAmp * Math.cos(2 * R1_TAU * (u - p.leanPh))) * D;   // + the (filtered) acceleration lean
  const thYaw = p.thoraxYaw * Math.cos(R1_TAU * (u - p.thoraxYawPh)) * D;                  // + = turned right: the LEFT shoulder leads at the RIGHT touchdown
  const twist = thYaw - pel.yaw, bend = lean - pel.tilt;              // chest global pitch = lean
  rot.spine = R3.yxz(twist * 0.22, bend * 0.45, -pel.roll * 0.55);
  rot.chest = R3.yxz(twist * 0.78, bend * 0.55, -pel.roll * 0.30);
  // head: stabilised toward the direction of travel (neck takes 40 % of the correction, the head the rest)
  const Rch = R3.mul3(pel.R, rot.spine, rot.chest);
  // not a gyroscope: a residual yaw with the thorax (≈ 6° range, Pontzer 2009), a small pitch nod that counters the vertical bob (nose down at
  // the top of the flight; Pozzo 1990) and a slight roll with the trunk
  const nod = p.headNod * Math.cos(2 * R1_TAU * (u - p.D - (0.5 - p.D) / 2)) * D;
  const want = R3.mul3(R3.y(thYaw * p.headYawFollow), R3.x(p.gazeDown * D + nod), R3.z(-pel.roll * p.headRollFollow)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q);
  rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4);
  rot.head = R3.mul(R3.tr(rot.neck), Q);
  // arms: shoulder-driven swing, contralateral to the legs (the RIGHT arm is forward when the LEFT leg is), elbow closes forward
  for (const sd of ["R", "L"]) {
    const side = sd === "R" ? 1 : -1, ua = u - (sd === "R" ? 0.5 : 0) - p.armPh;             // ua = 0 at this arm's forward peak
    const cA = Math.cos(R1_TAU * ua), mid = (p.armFwd - p.armBack) / 2, amp = (p.armFwd + p.armBack) / 2 * (sd === "R" ? 1 + p.asymArm : 1);   // subtle, constant L/R asymmetry
    const flex = (mid + amp * cA) * D;
    const ce = Math.cos(R1_TAU * (ua - p.elbowPh));
    const elbow = (p.elbow - (sd === "L" ? p.asymElbow : 0) + p.elbowAmp * ce) * D;
    const abd = (p.armAbd - p.armAbdAmp * Math.cos(R1_TAU * (ua - p.armAbdPh))) * D;          // comes across the body in the forward swing (lagging: the hand path opens into an ellipse)
    rot["clavicle_" + sd] = R3.y(-side * p.clavProt * cA * D);
    rot["upperArm_" + sd] = R3.mul3(R3.z(side * abd), R3.x(-flex), R3.y(-side * p.armRot * D));
    rot["foreArm_" + sd] = R3.x(-elbow);
    rot["hand_" + sd] = R3.mul(R3.x(-8 * D), R3.z(-side * 6 * D));
  }
  return { rot, pelvisPos: pel.pos, pel, legs, u };
}

// ── FK: local rotations + pelvis translation → world matrices (column-major Float32Array 16, the renderer's format) ────────────
function r1FK(G, pose, rootM, out) {
  const skel = G.body.skel, n = skel.bones.length;
  out = out || { world: new Array(n), joint: new Array(n), tip: new Array(n), R: new Array(n), P: new Array(n) };
  // root-frame rotations / positions first (R3 + vec), then one multiply by the root matrix per bone
  for (const b of skel.bones) {
    const Rl = pose.rot[b.name] || R3.I();
    let off = b.off; if (b.name === "pelvis") off = [off[0] + pose.pelvisPos[0], pose.pelvisPos[1], off[2] + pose.pelvisPos[2]];
    let R, P;
    if (!b.parent) { R = Rl; P = off.slice(); }
    else { const Rp = out.R[b.parent.idx]; R = R3.mul(Rp, Rl); P = RV.add(out.P[b.parent.idx], R3.v(Rp, off)); }
    out.R[b.idx] = R; out.P[b.idx] = P;
    const m = new Float32Array(16);
    m[0] = R[0]; m[1] = R[3]; m[2] = R[6]; m[4] = R[1]; m[5] = R[4]; m[6] = R[7]; m[8] = R[2]; m[9] = R[5]; m[10] = R[8]; m[12] = P[0]; m[13] = P[1]; m[14] = P[2]; m[15] = 1;
    out.world[b.idx] = rootM ? M4.mul(rootM, m) : m;
    out.joint[b.idx] = M4.origin(out.world[b.idx]);
    out.tip[b.idx] = M4.transformPoint(out.world[b.idx], RV.sc(b.dir, b.len));
  }
  return out;
}

// ── the runtime entry: one actor, authoritative {x, y (pitch), heading, speed} + a gait phase it owns (presentation) ───────────
// Speed grid: the solved gait (plant distance, pelvis height, swing boundary curves) is computed once per grid speed and interpolated —
// every quantity is continuous in the speed, so the blend is smooth and a speed change costs a few hundred multiply-adds, not a solve.
const R1_GRID = { v0: 2.5, dv: 0.25, n: 31, keys: 0 };           // 2.5 … 10.0 m/s (RUN-1.2: 2.5 … 9.0; the cells it had are unchanged)
function r1GridGait(body, prm, i) {
  const key = prm === RUN1.ref ? "ref" : (prm.__key || (prm.__key = "p" + (++R1_GRID.keys)));   // identity tag of a parameter object (deterministic counter)
  const C = body._r1grid || (body._r1grid = {}), row = C[key] || (C[key] = []);
  if (!row[i]) { const v = R1_GRID.v0 + i * R1_GRID.dv; row[i] = r1Gait(body, r1ParamsAt(v, prm), v); }
  return row[i];
}
function r1LerpKnots(A, B, t) { return A.map((k, i) => ({ w: k.w + (B[i].w - k.w) * t, v: k.v + (B[i].v - k.v) * t, m: k.m + (B[i].m - k.m) * t, mo: k.mo + (B[i].mo - k.mo) * t, mi: k.mi + (B[i].mi - k.mi) * t, fixed: k.fixed })); }
function r1WarmGrid(body, prm) { for (let i = 0; i < R1_GRID.n; i++) r1GridGait(body, prm || RUN1.ref, i); }   // solve every cell now (viewer / load)
function r1GaitAt(body, prm, v) {
  const x = Math.max(0, Math.min(R1_GRID.n - 1 - 1e-9, (v - R1_GRID.v0) / R1_GRID.dv)), i = Math.floor(x), t = x - i;
  const a = r1GridGait(body, prm, i), b = r1GridGait(body, prm, i + 1), p = {};
  for (const k in a) p[k] = typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * t : a[k];
  p.v = v; p.swing = {};
  for (const sd of ["R", "L"]) { const K = {}; for (const c of R1_CH) K[c] = r1LerpKnots(a.swing[sd].K[c], b.swing[sd].K[c], t); p.swing[sd] = { K }; }
  return p;
}
// ── the runtime: one actor. Authoritative input per evaluation: {x, y (pitch), heading, v}. The actor owns only presentation state:
// the gait clock, each leg's plant (made at its touchdown, fixed on the pitch) and the root's travel since that touchdown, and a filtered
// acceleration lean. Advanced on a FIXED 1/240 s grid from t = 0, so the state at any time is a pure function of the input history. ──
const R1_STEP = 1 / 240;
function r1Make(skel, prm) {
  const A = { body: skel._r1body || (skel._r1body = r1Body(skel)), prm: prm || RUN1.ref,   // the body (and its speed-grid cache) is shared per skeleton
              phase: 0, t: 0, v: null, legs: { R: { pl: null }, L: { pl: null } }, accLean: 0, aF: 0, fk: null };
  return A;
}
function r1Prepare(A, v) {                                       // the gait in use at speed v (cached for the last speed)
  if (!A.G || A.gv !== v) { A.G = { body: A.body, p: r1GaitAt(A.body, A.prm, v), late: null }; A.gv = v; }
  return A.G;
}
// advance the presentation by dt at authoritative speed v (and acceleration aIn, optional): phase by THIS body's cadence, plants by travel
function r1Advance(A, v, dt, aIn) {
  const G = r1Prepare(A, v), p = G.p, dphi = dt / p.T;
  if (A.v == null) {                                              // first call: already running — the right foot has just landed
    A.v = v; A.legs.R.pl = { zTD: p.zTD, footW: p.footW, travel: 0 }; A.legs.L.pl = null;
  }
  for (const sd of ["R", "L"]) {
    const L = A.legs[sd], ul0 = r1wrap(A.phase - (sd === "R" ? 0 : 0.5)), ul1 = ul0 + dphi;
    if (ul1 >= 1) { const f = (1 - ul0) / dphi; L.pl = { zTD: p.zTD, footW: p.footW, travel: v * dt * (1 - f) }; }   // touchdown inside this step
    else if (L.pl && ul1 < p.D) L.pl.travel += v * dt;
    else if (ul1 >= p.D) L.pl = null;                                                                            // toe-off
  }
  A.phase = r1wrap(A.phase + dphi); A.t += dt;
  const a = aIn != null ? aIn : (dt > 0 ? (v - A.v) / dt : 0); A.v = v;
  const k = 1 - Math.exp(-dt / 0.15); A.aF += (a - A.aF) * k;                                                    // deterministic first-order filter
  A.accLean = Math.max(-6, Math.min(12, A.aF * 1.6));                                                            // deg per m/s² (forward when accelerating)
  return A.phase;
}
function r1Plants(A) { const o = {}; for (const sd of ["R", "L"]) if (A.legs[sd].pl) o[sd] = A.legs[sd].pl; return o; }
function r1Evaluate(A, sim) {
  const G = r1Prepare(A, sim.v); G.accLean = A.accLean;
  const pose = r1Pose(G, A.phase, A.closedForm ? null : r1Plants(A));
  const rootM = r1RootMatrix(sim.x, sim.y, sim.heading, 0);
  const fk = r1FK(G, pose, rootM, A.fkBuf);
  A.fkBuf = fk; A.pose = pose; A.fk = fk;
  A.skinMats = A.skinMats || new Float32Array(16 * A.body.skel.bones.length);
  const inv = A.body.skel.invBind;
  for (let i = 0; i < fk.world.length; i++) A.skinMats.set(M4.mul(fk.world[i], inv[i]), i * 16);
  return { pose, fk, skinMats: A.skinMats };
}
// a deterministic replay from t = 0 on the fixed grid (viewer / capture): the state at time t is a pure function of the speed profile
function r1Replay(A, vOf, aOf, t) {
  if (A._replayT == null || t < A._replayT - 1e-12) { const fresh = r1Make(A.body.skel, A.prm); Object.assign(A, fresh, { body: A.body }); A._replayT = 0; A._snap = null; }
  while (A._replayT + R1_STEP <= t + 1e-12) { const tm = A._replayT + R1_STEP / 2; r1Advance(A, vOf(tm), R1_STEP, aOf ? aOf(tm) : null); A._replayT += R1_STEP; }
  const rest = t - A._replayT;                                       // the partial step is evaluated on a copy: the grid state stays path-independent
  const snap = { phase: A.phase, t: A.t, v: A.v, aF: A.aF, accLean: A.accLean, legs: JSON.parse(JSON.stringify(A.legs)) };
  if (rest > 1e-12) r1Advance(A, vOf(A._replayT + rest / 2), rest, aOf ? aOf(A._replayT + rest / 2) : null);
  return () => { Object.assign(A, { phase: snap.phase, t: snap.t, v: snap.v, aF: snap.aF, accLean: snap.accLean, legs: snap.legs }); };
}

// ── explicit continuous state (interaction initialisation / diagnostics): at time t under the authoritative profile (simAt(t) → {x, y,
// heading, v}, vOf(t) → v), the gait phase, root reference, per-foot contact state and plant, joint world transforms, joint angular velocities
// (world, rad/s) and segment linear velocities (world, m/s). Velocities are the symmetric difference of the closed-form, deterministic replay
// at t ± h (h = 0.5 ms) — a derivative of the continuous pose function, never of rendered frames.
function r1Kinematics(A, vOf, simAt, t, h) {
  h = h || 5e-4;
  const at = (tt) => { const restore = r1Replay(A, vOf, null, tt), ev = r1Evaluate(A, simAt(tt));
    const out = { R: ev.fk.world.map(m => Float32Array.from(m)), legs: JSON.parse(JSON.stringify({ R: A.pose.legs.R, L: A.pose.legs.L })), phase: A.phase, plants: JSON.parse(JSON.stringify(r1Plants(A))) }; restore(); return out; };
  const a = at(t - h), c = at(t + h), b = at(t), bones = A.body.skel.bones, joints = [];
  for (const bn of bones) {
    const i = bn.idx, Ma = a.R[i], Mc = c.R[i], Mb = b.R[i];
    const v = [(Mc[12] - Ma[12]) / (2 * h), (Mc[13] - Ma[13]) / (2 * h), (Mc[14] - Ma[14]) / (2 * h)];
    // angular velocity from dR/dt · Rᵀ (skew part), column-major 3×3 blocks
    const dR = (r, c2) => (Mc[c2 * 4 + r] - Ma[c2 * 4 + r]) / (2 * h), Rm = (r, c2) => Mb[c2 * 4 + r];
    const W = (r, k) => dR(r, 0) * Rm(k, 0) + dR(r, 1) * Rm(k, 1) + dR(r, 2) * Rm(k, 2);
    const w = [(W(2, 1) - W(1, 2)) / 2, (W(0, 2) - W(2, 0)) / 2, (W(1, 0) - W(0, 1)) / 2];
    joints.push({ name: bn.name, world: Array.from(Mb), vel: v, angVel: w });
  }
  const sim = simAt(t);
  return { t, phase: b.phase, root: { x: sim.x, y: sim.y, heading: sim.heading, v: sim.v }, contact: { R: { stance: b.legs.R.st, s: b.legs.R.s, w: b.legs.R.w, plant: b.plants.R || null }, L: { stance: b.legs.L.st, s: b.legs.L.s, w: b.legs.L.w, plant: b.plants.L || null } }, joints, frame: "3D world (anim3d: x = pitch x, y = up, z = -pitch y)" };
}

if (typeof module !== "undefined" && module.exports) module.exports = { RUN1, R3, RV, r1Herm, r1HermPrep, r1Body, r1Gait, r1Pelvis, r1StanceLeg, r1LegIK, r1SwingKnots, r1Pose, r1FK, r1Make, r1Prepare, r1Advance, r1Evaluate, r1Vertical, r1FootPitch, R1_LIMITS, R1_CH, r1RootMatrix, r1ParamsAt, r1GaitAt, r1Replay, r1Plants, R1_STEP, r1Kinematics, r1WarmGrid };
// ── END VERBATIM ──
return { RUN1, R3, RV, r1Body, r1Gait, r1Pelvis, r1StanceLeg, r1StanceBase, r1AnkleAt, r1MtpDF, R1_MTP, r1FootPitch, r1LegIK, r1Pose, r1FK, r1Make, r1Prepare, r1Advance, r1Evaluate,
  r1Replay, r1Plants, r1Kinematics, r1GaitAt, r1ParamsAt, r1Anchors, r1Vertical, r1Herm, r1HermD, r1WarmGrid, r1RootMatrix, R1_CH, R1_STEP, R1_GRID, R1_LIMITS,
  version: "RUN-1.3 @ bdab1f5f", baseline: "LOCOMOTION V2 STRAIGHT-LINE BASELINE" };
})();

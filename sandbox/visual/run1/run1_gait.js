// ═══ run1/run1_gait.js — LOCOMOTION V2 / RUN-1: straight-line football running on the real character rig (presentation only) ═══
// A fresh production-locomotion track. It does not modify, call into or replace Outfield Locomotion V1 (anim3d/of_loco.js and the
// shared law the simulation consumes); it only reads the character's own bind (anim3d/of_character.js ofCharSkeleton output).
//
// AUTHORITY. The simulation owns root translation (position, speed, heading). RUN-1 owns the visible skeleton. Nothing here writes
// simulation state, nothing is random, nothing reads the wall clock: the pose is a pure function of (rig, parameters, gait phase).
//
// MOTION CONSTRUCTION (one periodic cycle, RIGHT touchdown at phase 0, LEFT at 0.5):
//   • PELVIS — a spring-mass vertical (half-sine stance force, ballistic flight; Morin 2005 / Cavagna) evaluated in closed form, so
//     height, vertical velocity AND acceleration are continuous (the force is zero at touchdown and toe-off); small lateral sway
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
  id: "RUN-1",
  ref: {
    v: 5.5,
    // timing: a footballer at 5.5 m/s — higher step rate, shorter steps and longer contact than a distance runner
    // (Hamner & Delp 2013; Takai 2025; Clark 2025; toe-off at ~29 % of the stride, between 37.5 % at 5 m/s treadmill and ~24 % sprinting)
    cadence: 3.20,            // steps / s (192 spm) for the 0.834 m reference leg; scaled by sqrt(Lref / L) for other legs
    tc: 0.175,                // contact time (s): flight 0.138 s, swing 0.450 s
    kv: 0.60,                 // pelvis vertical / spring-mass COM vertical (design: a grounded footballer, ~4 cm pelvis bounce, not a bouncy jogger)
    kneeTD: 22, kneeTO: 23,   // touchdown knee (solved for by the plant distance); toe-off knee (prescribed late-stance curve) (Sundström 2021; Miyashiro 2019)
    footW: 0.032,             // foot centre-line offset from the line of travel (narrow running base: Arellano 2015, 4.1 → 1.5 cm with speed)
    toeOut: 7,                // foot progression angle (deg, outward)
    strikeToeUp: 8,           // foot pitch at touchdown (toes up): rear-/mid-foot border (Altman & Davis 2012); team-sport athletes land flatter
    flatS: 0.16,              // stance fraction at which the foot is flat
    heelRiseS: 0.46,          // stance fraction at which the heel starts to rise (late stance becomes knee-driven from here)
    heelRiseTO: 74,           // foot pitch at toe-off (heel up), solved for by the pelvis height: shank ~53° + ~24° plantar-flexion (Miyashiro 2019)
    kneeMinS: 0.86,           // late stance: the knee reaches its extension minimum here …
    kneeTOrate: 320,          // … and is already flexing at toe-off (deg/s): the swing recovery begins inside the stance
    // swing keys (w = swing fraction 0 at toe-off … 1 at touchdown); scissor timing: the rear thigh's peak extension and the front
    // thigh's peak flexion both fall ~0.03–0.04 s after the other foot's toe-off (Clark 2025)
    kneeMax: 115, kneeMaxW: 0.42, kneeHold: 104, kneeHoldW: 0.58, kneeExt: 16, kneeExtW: 0.92,
    hipMax: 62, hipMaxW: 0.76, hipExtMinW: 0.055,
    anklePFMaxW: 0.07, anklePFExtra: 6, ankleDFSwing: -6, ankleDFW: 0.60,
    swingAbd: 8.0,            // extra abduction at mid swing (deg): the recovering leg passes outside the stance leg
    psiSwing: 8, psiSwingW: 0.48,   // mid-swing hip internal rotation (deg) — the recovering heel passes lateral of the stance calf
    toeRelaxW: 0.22,
    // pelvis (deg): tilt peaks near each toe-off; the swing-side hip drops in early stance; axial rotation follows the thigh scissor
    tilt: 6, tiltAmp: 2.2, tiltPh: 0.29,
    obliq: 3.5, obliqPh: 0.09,
    pelvisYaw: 6, pelvisYawPh: 0.38,
    sway: 0.012, swayPh: 0.12,
    // trunk (deg): constant-speed lean 5–8° (Preece 2016b), thorax counter-rotates the pelvis (Preece 2016a; Pontzer 2009: ~24° shoulder range at 3 m/s)
    lean: 8, leanAmp: 1.0, leanPh: 0.15,
    thoraxYaw: 13, thoraxYawPh: 0.86,
    // arms (deg): contralateral to the legs, each arm most forward near its own leg's toe-off; elbow closes in the forward swing
    armFwd: 33, armBack: 45, armPh: -0.14,
    elbow: 84, elbowAmp: 12, elbowPh: 0.05,
    armAbd: 12, armAbdAmp: 3, armRot: 6,      // the wrist stays ~11 cm lateral of the sternal notch at its closest (Hild 2005): slight inward swing only
    clavProt: 5,
    asymArm: 0.06, asymElbow: 3,   // a deterministic dominant-side asymmetry: the right arm swings 6 % wider, the left elbow sits 3° more open
    gazeDown: 6, headNod: 1.2, headYawFollow: 0.22, headRollFollow: 0.15,
  },
};

// ── speed anchors: one parameter set per anchor speed, blended piecewise-linearly by the AUTHORITATIVE speed (clamped outside) ──
// JOG 3.0 m/s and SPRINT 7.8 m/s are footballer variants of the same construction (provenance: RUN1_RESEARCH.md §speed scaling):
// contact time halves while swing time barely changes (Weyand 2000; Hamner & Delp 2013); rear-foot strike at the jog, flat at the sprint
// (Siegel 2023; Clark 2025); more knee recovery, hip drive, arm range and trunk lean with speed (Fukuchi 2017; Miyashiro 2019; Romero 2022).
RUN1.anchors = [
  { v: 3.0, id: "JOG", cadence: 2.75, tc: 0.27, kv: 0.75, kneeTD: 17, kneeTO: 18, footW: 0.04, strikeToeUp: 13, heelRiseTO: 60, kneeTOrate: 260,
    kneeMax: 100, kneeMaxW: 0.45, kneeHold: 90, kneeHoldW: 0.60, kneeExt: 10, kneeExtW: 0.92, hipMax: 50, hipMaxW: 0.78,
    tilt: 5, lean: 5, leanAmp: 0.8, thoraxYaw: 10, pelvisYaw: 6, sway: 0.016, armFwd: 24, armBack: 32, elbow: 90, elbowAmp: 8, armAbd: 12 },
  { v: 5.5, id: "RUN" },
  { v: 7.8, id: "SPRINT", cadence: 4.15, tc: 0.12, kv: 0.6, kneeTD: 28, kneeTO: 26, footW: 0.02, strikeToeUp: 2, heelRiseTO: 80, kneeTOrate: 420,
    kneeMax: 132, kneeMaxW: 0.40, kneeHold: 120, kneeHoldW: 0.55, kneeExt: 22, kneeExtW: 0.90, hipMax: 74, hipMaxW: 0.74,
    tilt: 8, lean: 13, leanAmp: 1.5, thoraxYaw: 15, pelvisYaw: 7, sway: 0.008, armFwd: 45, armBack: 55, elbow: 88, elbowAmp: 18, armAbd: 11 },
];
function r1ParamsAt(v, base) {
  const ref = base || RUN1.ref, A = RUN1.anchors.map(a => Object.assign({}, ref, a));
  let i = 0; while (i < A.length - 2 && v > A[i + 1].v) i++;
  const a = A[i], b = A[i + 1], t = Math.max(0, Math.min(1, (v - a.v) / (b.v - a.v))), P = {};
  for (const k in ref) P[k] = typeof ref[k] === "number" ? a[k] + (b[k] - a[k]) * t : ref[k];
  P.v = v; P.anchor = t < 0.5 ? a.id : b.id; P.blend = i + t; return P;
}

// Spring-mass vertical COM over one STEP: tau from the touchdown, contact tc, step Ts. Returns {y, v, a} relative to the mid-stance low.
function r1SpringMass(tau, tc, Ts, g) {
  const tf = Ts - tc, K = Math.PI * Ts / (2 * tc), w = Math.PI / tc, vTD = -g * tf / 2;
  const yS = (t) => vTD * t + g * ((K / w) * (t - Math.sin(w * t) / w) - t * t / 2);
  const yLow = yS(tc / 2);
  if (tau < tc) return { y: yS(tau) - yLow, v: vTD + g * ((K / w) * (1 - Math.cos(w * tau)) - tau), a: g * (K * Math.sin(w * tau) - 1) };
  const t = tau - tc, yTO = yS(tc) - yLow, vTO = -vTD;
  return { y: yTO + vTO * t - g * t * t / 2, v: vTO - g * t, a: -g };
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
  const solveY = () => { let lo = body.pelvisY - 0.30, hi = body.pelvisY + 0.05; for (let i = 0; i < 48; i++) { p.y0 = (lo + hi) / 2; G.late = null; if (heelAt() < p.heelRiseTO) lo = p.y0; else hi = p.y0; } };
  { let lo = -0.10, hi = 0.70; for (let i = 0; i < 48; i++) { p.zTD = (lo + hi) / 2; solveY(); if (kneeAt(0) > p.kneeTD) lo = p.zTD; else hi = p.zTD; } }
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
  const sm = r1SpringMass(tau, p.tc, p.Ts, g);
  const y = p.y0 + p.kv * sm.y;
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
  if (s <= p.flatS) { const t = s / p.flatS; return p.strikeToeUp * (1 - t) * (1 - t) * (1 + 0.6 * t); }
  return 0;
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
const R1_MTP = { cap: 52 * Math.PI / 180, w: 8 * Math.PI / 180, padAhead: 0.07 };
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
// late-stance knee curve (C1 from the flat-foot IK knee at the heel-rise onset → extension minimum → toe-off, already flexing)
function r1LateKnots(G, sd) {
  const { body, p } = G, key = p.zTD + "|" + p.y0;
  if (G.late && G.late.key === key) return G.late;
  const kFlat = (s) => { const B = r1StanceBase(G, sd, s), A = r1AnkleAt(body, B, 0); return r1LegIK(body, B.pel.R, B.psi, B.hip, A.ankle).k; };
  const s0 = p.heelRiseS, h = 1e-4, k0 = kFlat(s0), m0 = (kFlat(s0) - kFlat(s0 - h)) / h;
  const kTO = p.kneeTO * R1_DEG, kMin = Math.min(kTO - 2.5 * R1_DEG, k0 - 1 * R1_DEG), mTO = p.kneeTOrate * R1_DEG * p.tc;
  G.late = { key, K: r1HermPrep([{ w: s0, v: k0, m: m0, fixed: true }, { w: p.kneeMinS, v: kMin, m: 0 }, { w: 1, v: kTO, m: mTO, fixed: true }]) };
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
  // ankle pitch (+ = plantar-flexion): the push-off carries on briefly, then dorsiflexion for clearance, then the strike angle
  const pfMax = TO.c.fp + Math.min(p.anklePFExtra * D, Math.max(0, TO.m.fp) * p.anklePFMaxW * 0.5);   // the push-off plantar-flexion carries on a few degrees
  K.fp = [K.fp[0], knot(p.anklePFMaxW, pfMax), knot(p.ankleDFW, p.ankleDFSwing * D), K.fp[1]];
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
    const abd = (p.armAbd - p.armAbdAmp * cA) * D;                                         // comes across the body in the forward swing
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
const R1_GRID = { v0: 2.5, dv: 0.25, n: 27, keys: 0 };           // 2.5 … 9.0 m/s
function r1GridGait(body, prm, i) {
  const key = prm === RUN1.ref ? "ref" : (prm.__key || (prm.__key = "p" + (++R1_GRID.keys)));   // identity tag of a parameter object (deterministic counter)
  const C = body._r1grid || (body._r1grid = {}), row = C[key] || (C[key] = []);
  if (!row[i]) { const v = R1_GRID.v0 + i * R1_GRID.dv; row[i] = r1Gait(body, r1ParamsAt(v, prm), v); }
  return row[i];
}
function r1LerpKnots(A, B, t) { return A.map((k, i) => ({ w: k.w + (B[i].w - k.w) * t, v: k.v + (B[i].v - k.v) * t, m: k.m + (B[i].m - k.m) * t, mo: k.mo + (B[i].mo - k.mo) * t, mi: k.mi + (B[i].mi - k.mi) * t, fixed: k.fixed })); }
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

if (typeof module !== "undefined" && module.exports) module.exports = { RUN1, R3, RV, r1Herm, r1HermPrep, r1Body, r1Gait, r1Pelvis, r1StanceLeg, r1LegIK, r1SwingKnots, r1Pose, r1FK, r1Make, r1Prepare, r1Advance, r1Evaluate, r1SpringMass, r1FootPitch, R1_LIMITS, R1_CH, r1RootMatrix, r1ParamsAt, r1GaitAt, r1Replay, r1Plants, R1_STEP, r1Kinematics };

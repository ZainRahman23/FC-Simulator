// ═══ turn1/turn1_loco.js — TURN-1: turning + cutting locomotion on the real character rig (presentation only, no ball) ═══
// Built ON the frozen Locomotion V2 straight-line baseline RUN-1.3 (run1/run1_gait_v13.js, global RUN1_V13) and never edits it. RUN-1.3 stays the
// athletic source of the cyclic motion (pelvis bob / tilt / obliquity, trunk, arms, the stance foot roll and the swing shape at the current speed).
// TURN-1 adds what a change of direction needs:
//   • STANCE-IMPULSE DYNAMICS — the COM's horizontal velocity changes ONLY while a foot is on the turf: every stance carries a velocity change ΔV
//     with a half-sine force profile (zero at touchdown and toe-off); flights are ballistic. Turning, braking and acceleration are therefore
//     literally produced by the plants. Each ΔV is bounded by what that stance can physically deliver.
//   • FOOTSTEP PLACEMENT — every plant is a fixed world point chosen at its touchdown: RUN-1's own placement relative to the body PLUS the
//     inverted-pendulum offset of that stance's mean acceleration (the foot is placed against the acceleration: outside the curve, ahead of a
//     brake, wide of a cut). The stance foot is world-locked (roll heel → flat → toe pad, RUN-1's profile), the leg reaches it by analytic IK.
//   • SWING WARP — the swing foot follows RUN-1's own swing path at the current speed, warped (rotation along / lateral keep / vertical keep) from
//     its actual toe-off point to its planned touchdown point, so a step into a new direction keeps RUN-1's swing character.
//   • BODY ORGANISATION — pelvis heading is a state separate from the velocity direction (body facing ≠ velocity); thorax and gaze lead it; whole-
//     body lean follows the mean acceleration (bank in arcs, cut lean, braking / acceleration pitch); crouch and arm balance follow the step role.
//   • RESOLVER — per touchdown a step ROLE: RUN (with ARC steering), BRAKE, PLANT (cut / pivot), EXIT, ACCEL. A heading request is resolved from
//     incoming velocity + requested change + stride phase / foot availability into ARC, CUT (side-step or crossover) or PIVOT.
// AUTHORITY: the inputs (desired direction, desired speed) are what a simulation would supply; nothing here is random or reads the wall clock;
// the state at time t is a pure function of the input history on a fixed 1/240 s grid (deterministic replay).
// Frames: pitch plane (x, y), heading θ: forward = (cos θ, sin θ), the player's RIGHT = (−sin θ, cos θ) — a positive Δθ is a RIGHT turn.
// Character root frame = RUN-1's (x right, y up, z forward); 3D world = r1RootMatrix(x, y, heading) × local (anim3d convention).
"use strict";
// eslint-disable-next-line no-var
var TURN1 = (function () {
const E = RUN1_V13, R3 = E.R3, RV = E.RV, DEG = Math.PI / 180, G = 9.81;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };   // C2 smootherstep
const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const fwd = (th) => [Math.cos(th), Math.sin(th)], rgt = (th) => [-Math.sin(th), Math.cos(th)];
const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], sc: (a, s) => [a[0] * s, a[1] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1], len: (a) => Math.hypot(a[0], a[1]) };
const lerpN = (a, b, t) => a + (b - a) * t, ang2 = (v) => Math.atan2(v[1], v[0]);
// rotation log / exp (3×3 row-major ↔ axis·angle) and slerp between rotation matrices
function rLog(R) { const c = clamp((R[0] + R[4] + R[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0]; const k = a / (2 * Math.sin(a)); if (Math.PI - a < 1e-6) { const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2)); return [x * a, (R[1] >= 0 ? 1 : -1) * y * a, (R[2] >= 0 ? 1 : -1) * z * a]; } return [(R[7] - R[5]) * k, (R[2] - R[6]) * k, (R[3] - R[1]) * k]; }
function rExp(v) { const a = Math.hypot(v[0], v[1], v[2]); if (a < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1]; const x = v[0] / a, y = v[1] / a, z = v[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
function rSlerp(Ra, Rb, t) { const d = rLog(R3.mul(R3.tr(Ra), Rb)); return R3.mul(Ra, rExp([d[0] * t, d[1] * t, d[2] * t])); }
// half-sine stance force: velocity fraction F(x) = (1 − cos πx)/2, displacement fraction Φ(x) = ∫F = x/2 − sin(πx)/(2π)
const Fv = (x) => (1 - Math.cos(Math.PI * x)) / 2, Fp = (x) => x / 2 - Math.sin(Math.PI * x) / (2 * Math.PI), Fa = (x) => Math.PI / 2 * Math.sin(Math.PI * x);

// ── parameters (V1; every number is a development value, provenance in review_artifacts/turn1/TURN1_RESEARCH.md) ───────────────────────────
const T1 = {
  id: "TURN-1 V1",
  step: 1 / 240,
  vMin: 2.5, vMax: 9.5,                       // RUN-1.3's speed grid (below 2.5 the 2.5 m/s gait is used, timed by TURN-1)
  // arc steering (continuous turn): lateral acceleration available while running (curved-sprint limit), per speed
  aLat: [[3.0, 5.2], [5.5, 4.6], [7.8, 3.8], [9.5, 3.2]],
  arcRamp: 0.6,                                // the first arc step uses this share of the lateral capacity (the lean builds over one step)
  arcInside: 0.65, arcOutside: 1.35,           // share of the turn per step: the outside leg's stance turns more (inside: little crossover)
  arcLimit: [[3.0, 50], [5.5, 40], [7.8, 30], [9.5, 25]],   // deg: a heading change above this (at this speed) is resolved as a maneuver, not an arc
  arcSpeedLoss: 0.12,                          // speed lost per (lateral m/s²·s) of arc above 6 m/s (curved running is slower)
  aAcc0: 7.5, vTop: 10.2,                      // acceleration capacity a(v) = aAcc0 (1 − v / vTop) (football acceleration–speed profile)
  aDec: 5.0,                                   // ordinary deceleration (speed request lowered)
  // maneuvers
  pivotFrom: 135,                              // deg: ≥ this is a PIVOT (reversal), below it a CUT
  xoverMax: 70,                                // deg: a crossover cut is allowed up to this angle (side-step beyond)
  sEntry: [[45, 7.2], [60, 6.0], [90, 4.3], [120, 3.4], [135, 3.0], [180, 2.4]],   // max COM speed at the plant (angle–velocity trade-off)
  aBrake: 9.0,                                 // m/s² mean over a braking step (penultimate / antepenultimate contacts; dramatised for responsiveness)
  plantTc: [[45, 0.17], [90, 0.24], [135, 0.28], [180, 0.34]],   // plant contact time (Falch 2020 + readability)
  plantTf: 0.045,                              // flight after the plant push-off
  plantFrac: [[45, 0.85], [90, 0.70], [135, 0.62], [180, 0.55]],   // fraction of the heading change the plant itself delivers (rest: exit step)
  exitSpeed: [[45, 0.92], [90, 0.72], [135, 0.55], [180, 0.40]],   // COM speed at plant toe-off / entry speed
  aStanceMax: 17.5,                            // m/s² mean horizontal acceleration a single stance can deliver (≈ 1.6 BW peak, dramatised)
  accelTc: 0.19, accelTf: 0.055,               // acceleration steps out of a cut (short flight, long contact)
  braketcK: 1.15, braketfK: 0.65,              // braking steps: longer contact, shorter flight than RUN-1 at that speed
  reactS: 0.09,                                // s: a touchdown closer than this to the decision cannot be the plant (it becomes the brake step)
  prefGainS: 0.2,                              // s: a non-preferred plant foot is taken if it is at least this much sooner
  crouch: { BRAKE: 0.035, PLANT: [[45, 0.08], [90, 0.13], [135, 0.15], [180, 0.15]], EXIT: 0.06, ACCEL: 0.03 },
  travelMax: { RUN: 1.0, BRAKE: 0.78, PLANT: 0.80, EXIT: 0.85, ACCEL: 0.9 },   // m of COM travel a single stance can span (two leg reaches)
  heelStrike: { BRAKE: 14, PLANT: 10 },        // deg toes-up at touchdown: braking and plant steps land on the heel / rear foot
  dropMax: 0.14, dropMaxRole: { BRAKE: 0.12, PLANT: 0.20, EXIT: 0.20 },   // a deep planted stance belongs to plants; braking steps stay athletic (no lunge)
  reachWin: { lat: 0.35, td: 0.45, to: 0.80 },   // m: the plant relative to the COM: lateral; along-track ahead at touchdown, behind at toe-off (RUN / ARC)
  reachWinMan: { lat: 0.45, td: 0.36, to: 0.62, latInside: 0.25 },
  reachWinPivot: { lat: 0.18, td: 0.45, to: 0.45 },   // a reversal plant: ahead of the body, close to its line (the COM stops before it and comes back)   // latInside: the inside foot of an exit / arc step (no crossover)
  kneeClear: 0.24,
  swingAbd: [-25, 40],                         // deg: swing-hip adduction / abduction kept inside the rig's range (ankle target pulled toward the hip's plane)                             // m: a swinging knee stays at least this high (no kneeling look on low, braking bodies)   // the same for maneuver steps (brake / plant / exit / accel: crouched, heel-strike landings)                               // m: the stance leg may lower the pelvis this much to keep its plant (knee flexion), never slide it
  // body
  hCom: 0.93,                                  // m: COM height for the inverted-pendulum placement
  offMax: 0.60,                                // m: largest acceleration offset of a plant from the COM path (leg reach)
  yawWn: 2 * Math.PI * 2.6, yawWnCut: 2 * Math.PI * 3.6,   // pelvis heading follower (critically damped)
  gazeTau: 0.07, chestLead: 0.40, chestMax: 28 * DEG, headMax: 60 * DEG,
  leanTau: 0.05, leanK: 0.9, leanFwdK: 1.0, leanMax: 28 * DEG, leanFwdMax: 30 * DEG, leanBack: 16 * DEG, pelvisLat: 0.8, pelvisFwd: 0.55,
  crouchTau: 0.06, armBal: { PLANT: 32, BRAKE: 14, EXIT: 18 }, armTau: 0.08,
  toeOut: 7 * DEG,
};
const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; };
const aAccAt = (s) => Math.max(0.4, T1.aAcc0 * (1 - s / T1.vTop));

// ── actor ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function t1Make(skel, init) {
  // the frozen engine caches its body / speed grid on its own skeleton copy; one copy (and one solved grid) per rig, shared by every TURN-1 actor
  if (!skel._t1sk) { const c = Object.assign({}, skel); delete c._r1body; c._r1body = E.r1Body(c); skel._t1sk = c; }
  const sk = skel._t1sk, body = sk._r1body;
  const o = init || {}, s0 = o.v != null ? o.v : 5.5, th0 = o.heading || 0, P0 = o.pos ? o.pos.slice() : [20, 34];
  const A = { body, skel: sk, tabHost: skel, t: 0, n: 0, P: P0, V: v2.sc(fwd(th0), s0), psi: th0, psiD: 0, gaze: th0, chest: 0,
    lean: [0, 0], aF: [0, 0], crouch: 0, crouchD: 0, arm: 0, tdCount: 0, man: null, log: [], events: [], input: { dir: th0, v: s0 } };
  const p = t1G(A, s0);
  // clock: seg 0 R stance · 1 flight → L · 2 L stance · 3 flight → R; the right foot has just landed (as RUN-1's first call)
  // init.foot: which foot has just landed ("R" default; "L" = the mirrored stride phase, for exact mirror tests)
  const Fs = o.foot === "L" ? "L" : "R", Fo = Fs === "R" ? "L" : "R";
  A.clk = { seg: Fs === "R" ? 0 : 2, x: 0, T: p.tc, t0: 0 };
  A.st = { P0: P0.slice(), V0: A.V.slice(), dV: [0, 0], tc: p.tc, tf: p.Ts - p.tc, role: { kind: "RUN" } };
  const plantS = t1PlaceDefault(A, Fs, P0, A.V, [0, 0], p.tc, p.Ts, p);
  A.legs = {}; A.legs[Fs] = { stance: true, plant: plantS, tTD: 0, role: { kind: "RUN" } }; A.legs[Fo] = { stance: false, plant: null };
  // the other foot lifted off one flight ago, from RUN-1's own plant (straight running)
  const tfL = p.Ts - p.tc, Pto = v2.sub(P0, v2.sc(A.V, tfL)), Vh = A.V;
  const plantOprev = t1PlaceDefault(A, Fo, v2.sub(Pto, v2.sc(Vh, p.tc / 2)), Vh, [0, 0], p.tc, p.Ts, p);
  const Lo = A.legs[Fo]; Lo.prevPlant = plantOprev; Lo.tTO = -tfL; Lo.w = tfL / (p.Ts * 2 - p.tc); Lo.A0 = t1AnkleW(A, plantOprev, -p.heelRiseTO * DEG, 1); Lo.yaw0 = plantOprev.yaw;
  Lo.err = [0, 0, 0]; Lo.errYaw = 0;
  return A;
}
function t1G(A, s) {                          // RUN-1.3's gait (timing, plant distance, pelvis height, swing knots) at speed s (clamped to its grid)
  const sv = clamp(s, T1.vMin, T1.vMax), k = Math.round(sv * 400) / 400;   // quantised so the speed-grid blend is reused within a frame
  if (A._gk === k) return A._gp;
  A._gk = k; A._gp = E.r1GaitAt(A.body, E.RUN1.ref, k); return A._gp;
}

// ── step roles and stance plans ───────────────────────────────────────────────────────────────────────────────────────────────
// The stance plan at a touchdown of foot F: {role, tc, tf, dV, plant}. Pure function of (state at the touchdown, input, maneuver plan).
function t1StancePlan(A, F, P, V, idx) {
  const s = v2.len(V), th = s > 0.2 ? ang2(V) : A.psi, p = t1G(A, s), inp = A.input, man = A.man;
  let role = (man && man.roles[idx]) || null;
  const sd = inp.v, dDes = wrapA(inp.dir - th);
  let tc = p.tc, tf = p.Ts - p.tc, V1;
  if (!role) {                                                                     // RUN: arc steering + speed regulation
    const accel = sd - s > 0.6 && s < 7.0;
    if (accel) { tc = Math.max(p.tc, lerpN(T1.accelTc, p.tc, sstep(3, 7, s))); tf = lerpN(T1.accelTf, p.Ts - p.tc, sstep(3, 7.5, s)); }
    const ramp = A.lastRole === "ARC" || (man && man.exitBoost && idx <= man.exitUntil) ? 1 : T1.arcRamp;
    const Ts = tc + tf, aL = tab(T1.aLat, s) * ramp, om = aL / Math.max(s, 1.5) * Ts * (man && man.exitBoost && idx <= man.exitUntil ? 1.8 : 1);
    const inside = (dDes > 0) === (F === "R"), dth = clamp(dDes, -om, om) * (Math.abs(dDes) > om ? (inside ? T1.arcInside : T1.arcOutside) : 1), aLat = Math.abs(dth) * s / Ts;
    let s1 = s + clamp(sd - s, -T1.aDec * Ts, aAccAt(s) * Ts);
    if (s > 6) s1 -= T1.arcSpeedLoss * aLat * Ts * sstep(6, 9, s);
    V1 = v2.sc(fwd(th + dth), Math.max(0, s1));
    role = { kind: accel ? "ACCEL" : (Math.abs(dth) > 0.2 * DEG ? "ARC" : "RUN") };
  } else if (role.kind === "BRAKE") {
    tc = p.tc * T1.braketcK; tf = (p.Ts - p.tc) * T1.braketfK;
    const Ts = tc + tf, s1 = Math.max(role.sTarget, s - T1.aBrake * Ts);
    V1 = v2.sc(fwd(th + role.preTurn), s1);
  } else if (role.kind === "PLANT") {
    tc = role.tc; tf = T1.plantTf;
    V1 = v2.sc(fwd(role.thIn + role.frac * role.delta), role.sExit);
  } else if (role.kind === "EXIT") {
    tc = T1.accelTc; tf = T1.accelTf;
    const thO = role.thIn + role.delta, s1 = Math.min(sd, s + aAccAt(s) * (tc + tf) * 0.8);
    V1 = v2.sc(fwd(thO), Math.max(s1, 1.0));
  }
  // a stance spans at most travelMax of COM travel (otherwise no leg can stay on its plant)
  { const sm = Math.max(0.5, (s + v2.len(V1)) / 2), tm = (T1.travelMax[role.kind] || T1.travelMax.RUN) / sm; if (tc > tm) tc = Math.max(0.08, tm); }
  // what one stance can deliver: |ΔV| ≤ aStanceMax · tc (the remainder is left to the next stance)
  let dV = v2.sub(V1, V); const dm = v2.len(dV), cap = T1.aStanceMax * tc * (role.kind === "PLANT" || role.kind === "EXIT" ? 1 : role.kind === "BRAKE" ? 0.85 : 0.7);
  if (dm > cap) dV = v2.sc(dV, cap / dm);
  return { role, tc, tf, dV, p };
}
// default placement (and the general rule): RUN-1's plant relative to the body at mid-stance + the inverted-pendulum acceleration offset
function t1PlaceDefault(A, F, P, V, dV, tc, Ts, p, role) {
  const sg = F === "R" ? 1 : -1, Vm = v2.add(V, v2.sc(dV, 0.5)), thm = v2.len(Vm) > 0.2 ? ang2(Vm) : A.psi;
  const Pm = v2.add(P, v2.add(v2.sc(V, tc / 2), v2.sc(dV, tc * Fp(0.5))));        // COM at mid-stance
  const s = v2.len(V), zMid = p.zTD - clamp(s, T1.vMin, T1.vMax) * p.tc / 2;        // RUN-1's flat-ankle point vs root at mid-stance (straight running)
  const kv = clamp(Ts / tc, 1.15, 2.4), aBar = v2.sc(dV, 1 / tc);                   // mean vertical force (BW) over the stance, mean horizontal acceleration
  let off = v2.sc(aBar, -T1.hCom / (G * kv)); const om = v2.len(off); if (om > T1.offMax) off = v2.sc(off, T1.offMax / om);
  let lat = sg * p.footW, yaw = thm + sg * T1.toeOut;
  if (role && role.kind === "PLANT") { lat += sg * role.widen; yaw = role.thIn + role.footTurn * role.delta + sg * T1.toeOut; }
  // the leg's reachable window: lateral ≤ reachWin.lat; along-track ≤ reachWin.td ahead of the COM at touchdown and ≥ reachWin.to behind it at toe-off
  // (RUN-1's straight geometry lies inside it; a brake or cut asking for more is clamped: the plant cannot be further than a leg can reach)
  const d = clamp(v2.len(Vm) * tc, 0, 2), W = role && role.kind === "PLANT" && role.pivot ? T1.reachWinPivot : role && role.kind !== "RUN" && role.kind !== "ARC" ? T1.reachWinMan : T1.reachWin;
  let la = lat + v2.dot(off, rgt(thm)), al = zMid + v2.dot(off, fwd(thm));
  let wl = W.lat;
  if (role && role.kind === "EXIT" && W.latInside) { const turnR = wrapA(role.thIn + role.delta - thm) > 0 || role.delta > 0; if ((F === "R") === turnR) wl = W.latInside; }   // the inside foot of the exit step
  la = clamp(la, -wl, wl); al = Math.min(al, W.td - d / 2); al = Math.max(al, -W.to + d / 2);
  const pos = v2.add(Pm, v2.add(v2.sc(rgt(thm), la), v2.sc(fwd(thm), al)));
  const pl = { pos, yaw, F, off, clampLat: la, clampAl: al };
  if (role && role.kind === "PLANT" && role.pivot) { pl.pivot = role.pivot; }
  return pl;
}
// ankle world point of a plant at foot pitch beta (+ toes up: rolled about the heel; − heel up: about the toe pad), pivot progress s
function t1AnkleW(A, pl, beta, s) {
  const b = A.body, yaw = pl.pivot ? pl.yaw + pl.pivot * s5(s) : pl.yaw;
  const Ry = R3.y(0), flat = [0, b.ankleH, 0];
  // in a frame whose z = the foot's forward: reuse RUN-1's roll geometry
  const loc = E.r1AnkleAt(b, { flat, Ry }, beta).ankle;                             // [x, y, z] relative to the flat-ankle point, foot frame
  let base = pl.pos;
  if (pl.pivot) {                                                                   // a pivot turns the foot about its toe pad: the flat point moves on a circle
    const pad = b.mtp[2] + E.R1_MTP.padAhead, padW = v2.add(pl.pos, v2.sc(fwd(pl.yaw), pad));
    base = v2.sub(padW, v2.sc(fwd(yaw), pad));
  }
  const f = fwd(yaw), r = rgt(yaw);
  return [base[0] + r[0] * loc[0] + f[0] * loc[2], loc[1], base[1] + r[1] * loc[0] + f[1] * loc[2], yaw];   // pitch x, height, pitch y, yaw
}

// ── resolver: a heading request → ARC / CUT (side-step | crossover) / PIVOT, with the plant chosen by stride phase ──────────────────────
function t1Resolve(A) {
  const inp = A.input, s = v2.len(A.V), th = s > 0.2 ? ang2(A.V) : A.psi, d = wrapA(inp.dir - th), ad = Math.abs(d) / DEG;
  const man = A.man;
  if (man) {
    if (man.phase === "PRE") {                                                       // before the plant: the maneuver may still change or be abandoned
      const dm = wrapA(inp.dir - man.thIn), adm = Math.abs(dm) / DEG;
      if (adm <= tab(T1.arcLimit, s) * 0.8) { A.events.push([A.t, "cancel", +adm.toFixed(1)]); A.man = null; return; }
      const kindNow = adm >= T1.pivotFrom ? "PIVOT" : "CUT";
      if (kindNow !== man.kind || Math.sign(dm) !== Math.sign(man.delta)) { A.man = null; t1Resolve(A); return; }   // re-plan from scratch (stride phase permitting)
      if (Math.abs(dm - man.delta) > 0.5 * DEG) { man.delta = dm; t1Retarget(A, man); }
    } else if (man.phase === "PLANT") {                                              // committed: the exit direction may still move ±20°
      const dm = wrapA(inp.dir - man.thIn), lim = 20 * DEG, want = clamp(dm, man.delta0 - lim, man.delta0 + lim);
      if (Math.abs(want - man.delta) > 0.5 * DEG && Math.sign(want) === Math.sign(man.delta0)) { man.delta = want; for (const k in man.roles) man.roles[k].delta = want; }
    }
    return;
  }
  if (s < 1.0 || ad <= tab(T1.arcLimit, s)) return;                                 // ARC (handled per stance)
  t1PlanManeuver(A, d, s, th);
}
// upcoming touchdowns from the current clock: [{foot, t}] (predicted with the stance / flight durations the plan will use)
function t1Upcoming(A, nMax) {
  const out = [], c = A.clk, rem = (1 - c.x) * c.T; let t = A.t + rem, seg = c.seg;
  const p = t1G(A, v2.len(A.V)), tfN = p.Ts - p.tc;
  // current segment end; if it is a stance, add its flight
  if (seg === 0 || seg === 2) { t += A.st.tf; seg = (seg + 2) % 4; } else seg = (seg + 1) % 4;   // seg now = the stance that starts at time t
  for (let i = 0; i < nMax; i++) { out.push({ foot: seg === 0 ? "R" : "L", t, idx: A.tdCount + i + 1 }); t += p.tc + tfN; seg = (seg + 2) % 4; }
  return out;
}
function t1PlanManeuver(A, d, s, th) {
  const ad = Math.abs(d) / DEG, kind = ad >= T1.pivotFrom ? "PIVOT" : "CUT", sg = Math.sign(d);   // + right turn
  const outside = sg > 0 ? "L" : "R";                                               // a side-step cut to the right plants the LEFT foot
  const sE = Math.min(s, tab(T1.sEntry, ad));
  const up = t1Upcoming(A, 8), p = t1G(A, s);
  // braking stances needed to reach the plant entry speed (each brake stance removes ≈ aBrake · Ts)
  // braking stances needed: each removes what one braking stance can actually deliver at this speed (short, travel-capped contacts at a sprint)
  const tcB = Math.min(p.tc * T1.braketcK, T1.travelMax.BRAKE / Math.max(1, s)), TsB = tcB + (p.Ts - p.tc) * T1.braketfK, perStep = Math.min(T1.aBrake * TsB, T1.aStanceMax * 0.85 * tcB);
  const nBrake = Math.ceil(Math.max(0, s - sE) / Math.max(0.3, perStep) - 0.15), nCap = kind === "PIVOT" ? 5 : 4;
  // candidates: every upcoming touchdown with enough braking before it; the PREFERRED technique (outside foot: side-step / outside pivot) wins
  // unless another valid one is ≥ prefGainS earlier (responsiveness: never wait a whole stride for the textbook foot)
  const cands = [];
  for (let i = 0; i < up.length; i++) {
    const u = up[i]; if (u.t - A.t < T1.reactS) continue;
    const nB = i - (up[0].t - A.t < T1.reactS ? 1 : 0);
    if (nB < Math.min(nBrake, nCap) && !(ad < 100 && nB >= nBrake - 1)) continue;   // cuts under 100° may plant one braking step early (responsiveness)
    const out = u.foot === outside;
    const tech = kind === "PIVOT" ? "PIVOT" : (out ? "SIDESTEP" : (ad <= T1.xoverMax ? "XOVER" : ad >= 110 ? "PIVOT" : null));   // a sharp cut may pivot on the inside foot if that is sooner
    if (!tech) continue;
    cands.push({ u, tech, i, pref: out, inside: !out });
  }
  let pick = cands.find(c => c.pref) || null; const alt = cands[0] || null;
  if (alt && (!pick || alt.u.t < pick.u.t - T1.prefGainS)) pick = alt;
  if (!pick) { const u = up.slice().reverse().find(q => q.foot === outside) || up[up.length - 1]; pick = { u, tech: kind === "PIVOT" ? "PIVOT" : (u.foot === outside ? "SIDESTEP" : "XOVER"), i: up.indexOf(u), inside: u.foot !== outside }; }
  const man = { kind, tech: pick.tech, inside: !!pick.inside, delta: d, delta0: d, thIn: th, sg, plantFoot: pick.u.foot, plantIdx: pick.u.idx, tDecide: A.t, phase: "PRE", sEntry: sE, roles: {}, exitBoost: true };
  A.man = man; t1Retarget(A, man);
  A.events.push([+A.t.toFixed(4), "maneuver", man.kind, man.tech, +(d / DEG).toFixed(1), man.plantFoot, +(pick.u.t - A.t).toFixed(3)]);
}
function t1Retarget(A, man) {                                                       // (re)build the role list from the current delta
  const ad = Math.abs(man.delta) / DEG, piv = man.tech === "PIVOT", xo = man.tech === "XOVER";
  man.sEntry = Math.min(man.sEntry, tab(T1.sEntry, ad));
  const roles = {};
  const up0 = t1Upcoming(A, 1)[0], kFirst = up0 && up0.t - A.t < T1.reactS ? up0.idx + 1 : A.tdCount + 1;   // a touchdown too close to the decision lands as it was going to
  for (let k = kFirst; k < man.plantIdx; k++) roles[k] = { kind: "BRAKE", sTarget: man.sEntry, preTurn: man.sg * Math.min(6 * DEG, 0.06 * Math.abs(man.delta)) * (k === man.plantIdx - 1 ? 1 : 0.3) };
  const sExit = Math.max(1.2, man.sEntry * tab(T1.exitSpeed, ad));
  roles[man.plantIdx] = { kind: "PLANT", tech: man.tech, thIn: man.thIn, delta: man.delta, frac: piv ? 1 : tab(T1.plantFrac, ad) * (xo ? 1.08 : 1), tc: tab(T1.plantTc, ad), sExit: piv ? Math.max(0.6, man.sEntry * 0.35) : sExit,
    widen: xo ? -0.06 : (piv ? 0.04 : 0.06 + 0.10 * sstep(30, 90, ad)), footTurn: piv ? 0.10 : (xo ? 0.30 : 0.18), pivot: piv ? man.sg * Math.min(85, ad * 0.5) * DEG : 0 };
  roles[man.plantIdx + 1] = { kind: "EXIT", thIn: man.thIn, delta: man.delta };
  man.roles = roles; man.exitUntil = man.plantIdx + 3;
}

// ── the fixed-step update: input → resolver → clock events → COM dynamics → body organisation ─────────────────────────────────────
function t1Step(A, input) {
  const dt = T1.step; A.input = { dir: input.dir, v: input.v };
  t1Resolve(A);
  // clock: advance through any events inside this step (exact event times; the dynamics are closed form within a segment)
  let tLeft = dt;
  while (tLeft > 1e-12) {
    const c = A.clk, rem = (1 - c.x) * c.T;
    if (rem > tLeft + 1e-12) { c.x += tLeft / c.T; A.t += tLeft; tLeft = 0; break; }
    A.t += rem; tLeft -= rem; c.x = 1; t1Event(A);
  }
  // BASE PHASE: RUN-1's cyclic pelvis / trunk / arm motion runs on a phase that follows the event clock with a SMOOTHED rate (the event clock's
  // rate is piecewise constant: stance and flight segments of maneuver steps run at different rates, which would jerk the arms at every event)
  { const p = t1G(A, v2.len(A.V)), c = A.clk, ln = [p.D, 0.5 - p.D, p.D, 0.5 - p.D], r = ln[c.seg] / Math.max(1e-3, c.T), u = t1Phase(A, p);
    if (A.phi == null) { A.phi = u; A.phiR = r; }
    A.phiR += (r - A.phiR) * (1 - Math.exp(-dt / 0.045)); const e = ((u - A.phi + 1.5) % 1) - 0.5;
    A.phi = ((A.phi + dt * (A.phiR + 9 * e)) % 1 + 1) % 1; }
  // COM state from the closed-form segment
  t1COMAt(A);
  // body organisation (filters)
  t1Body(A, dt);
  if (A.L11) A.L11.step(A, dt);                                                    // TURN-1.1 authored body layer (presentation state only; never read by the dynamics)
  A.n++;
  if (A.logOn !== false) A.log.push(t1Row(A));
}
function t1COMAt(A) {                                                               // P, V at A.t from the current segment's closed form
  const c = A.clk, S = A.st;
  if (c.seg === 0 || c.seg === 2) { const x = c.x; A.V = v2.add(S.V0, v2.sc(S.dV, Fv(x))); A.P = v2.add(S.P0, v2.add(v2.sc(S.V0, x * S.tc), v2.sc(S.dV, S.tc * Fp(x)))); A.acc = v2.sc(S.dV, Fa(c.x) / S.tc); }
  else { const tau = c.x * c.T; A.V = S.V1.slice(); A.P = v2.add(S.P1, v2.sc(S.V1, tau)); A.acc = [0, 0]; }
}
function t1Event(A) {
  const c = A.clk;
  if (c.seg === 0 || c.seg === 2) {                                                 // TOE-OFF of the stance foot
    const F = c.seg === 0 ? "R" : "L", S = A.st, L = A.legs[F];
    S.P1 = v2.add(S.P0, v2.add(v2.sc(S.V0, S.tc), v2.sc(S.dV, S.tc * Fp(1)))); S.V1 = v2.add(S.V0, S.dV);
    L.prevPlant = L.plant;
    { const ev = t1Evaluate(A), j = ev.fk.joint[A.body.idx["foot_" + F]], yw = t1AnkleW(A, L.prevPlant, 0, 1)[3]; L.A0 = [j[0], j[1], -j[2], yw]; L.yaw0 = yw; L.R0w = ev.pose.diag.feet[F].Rw; L.toe0 = ev.pose.diag.feet[F].toe || 0; }   // the swing starts where the stance foot actually is
    L.stance = false; L.plant = null; L.tTO = A.t; L.w = 0; L.err = [0, 0, 0]; L.errYaw = 0; L.bStrike = null;
    if (A.man && A.man.phase === "PLANT" && L.role && L.role.kind === "PLANT") { A.man.phase = "POST"; A.events.push([+A.t.toFixed(4), "plantTO", F]); }
    c.seg = (c.seg + 1) % 4; c.x = 0; c.T = Math.max(0.015, S.tf); c.t0 = A.t;
    A.events.push([+A.t.toFixed(4), "TO", F]);
  } else {                                                                          // TOUCHDOWN of the swing foot
    const F = c.seg === 1 ? "L" : "R", L = A.legs[F], S = A.st, Vtd = S.V1.slice(), Ptd = v2.add(S.P1, v2.sc(S.V1, c.T));
    A.tdCount++;
    const plan = t1StancePlan(A, F, Ptd, Vtd, A.tdCount);
    const plant = t1PlaceDefault(A, F, Ptd, Vtd, plan.dV, plan.tc, plan.tc + plan.tf, plan.p, plan.role);
    if (L.tgt) {                                                                    // the swing was aimed at the forecast plant: land where the foot actually is
      plant.pos = [L.tgt[0], L.tgt[1]]; plant.yaw = L.tgt[2];
    }
    L.stance = true; L.plant = plant; L.tTD = A.t; L.role = plan.role; L.tgt = null; A.lastRole = plan.role.kind; L.bLand = L.bStrike;
    A.st = { P0: Ptd, V0: Vtd, dV: plan.dV, tc: plan.tc, tf: plan.tf, role: plan.role, F };
    if (A.man && plan.role.kind === "PLANT") { A.man.phase = "PLANT"; A.man.tPlant = A.t; }
    if (A.man && A.man.phase === "POST" && A.tdCount > A.man.exitUntil) { A.events.push([+A.t.toFixed(4), "maneuverEnd"]); A.man = null; }
    c.seg = (c.seg + 1) % 4; c.x = 0; c.T = plan.tc; c.t0 = A.t;
    A.events.push([+A.t.toFixed(4), "TD", F, plan.role.kind, +v2.len(plan.dV).toFixed(2)]);
  }
}
// forecast of the next touchdown of a swinging foot F: time and plant, from the current state, the input and the maneuver plan (closed form)
function t1Forecast(A, F) {
  const c = A.clk; let seg = c.seg, x = c.x, T = c.T, t = A.t, S = A.st, P, V, idx = A.tdCount;
  for (let guard = 0; guard < 6; guard++) {
    const rem = (1 - x) * T; t += rem;
    if (seg === 0 || seg === 2) { P = v2.add(S.P0, v2.add(v2.sc(S.V0, S.tc), v2.sc(S.dV, S.tc * Fp(1)))); V = v2.add(S.V0, S.dV); seg = (seg + 1) % 4; x = 0; T = Math.max(0.015, S.tf); S = { P1: P, V1: V }; continue; }
    // flight end = a touchdown of foot seg 1 → L, seg 3 → R
    P = v2.add(S.P1, v2.sc(S.V1, T)); V = S.V1.slice(); idx++;                       // the whole flight from its toe-off point
    const Fn = seg === 1 ? "L" : "R", plan = t1StancePlan(A, Fn, P, V, idx);
    if (Fn === F) { const pl = t1PlaceDefault(A, Fn, P, V, plan.dV, plan.tc, plan.tc + plan.tf, plan.p, plan.role); return { t, plant: pl, plan, P: P.slice(), V: V.slice() }; }
    S = { P0: P, V0: V, dV: plan.dV, tc: plan.tc, tf: plan.tf }; seg = (seg + 1) % 4; x = 0; T = plan.tc;
  }
  return null;
}

// ── body organisation: pelvis heading (≠ velocity), gaze, chest lead, lean from the mean acceleration, crouch, arm balance, swing aim ─────
function t1Body(A, dt) {
  const s = v2.len(A.V), thv = s > 0.3 ? ang2(A.V) : A.psi, man = A.man;
  // pelvis heading target
  let tgt = thv, wn = T1.yawWn;
  if (man) {
    wn = T1.yawWnCut;
    if (man.phase === "PRE") tgt = man.thIn + man.sg * Math.min(Math.abs(man.delta) * 0.10, 12 * DEG);
    else if (man.phase === "PLANT") { const pr = clamp((A.t - man.tPlant) / A.st.tc, 0, 1); tgt = man.thIn + man.delta * lerpN(0.15, man.tech === "PIVOT" ? 0.72 : 0.82, s5(pr)); }
    else tgt = man.thIn + man.delta;
  } else { const L = A.log.length ? A.log[A.log.length - 1] : null; if (L) { const om = wrapA(thv - L.thv) / dt; tgt = thv + clamp(om * 0.12, -20 * DEG, 20 * DEG); } }
  const e = wrapA(tgt - A.psi); A.psiD += (wn * wn * e - 2 * wn * A.psiD) * dt; A.psi = wrapA(A.psi + A.psiD * dt);
  // gaze leads toward the requested direction (head first), the chest follows part of the way
  { if (A.gazeT == null) A.gazeT = A.gaze; const r = 720 * DEG * dt; A.gazeT = wrapA(A.gazeT + clamp(wrapA(A.input.dir - A.gazeT), -r, r));   // the head's target slews (≤ 720°/s) …
    const wn = 1 / T1.gazeTau; A.gazeV = (A.gazeV || 0) + (wn * wn * wrapA(A.gazeT - A.gaze) - 2 * wn * (A.gazeV || 0)) * dt; A.gaze = wrapA(A.gaze + A.gazeV * dt); }   // … and the head follows it (C1)
  const cTgt = clamp(T1.chestLead * wrapA(A.gaze - A.psi), -T1.chestMax, T1.chestMax); { const wn = 1 / 0.06; A.chestV = (A.chestV || 0) + (wn * wn * (cTgt - A.chest) - 2 * wn * (A.chestV || 0)) * dt; A.chest += A.chestV * dt; }
  // mean horizontal acceleration (filtered over ≈ a step) → lean
  // the planned MEAN acceleration of the current step (ΔV over stance + flight); late in a flight the next stance's (anticipation)
  let aPlan = v2.sc(A.st.dV, 1 / Math.max(0.12, A.st.tc + A.st.tf));
  if (A.clk.seg === 1 || A.clk.seg === 3) { const Fn = A.clk.seg === 1 ? "L" : "R", fc = t1Forecast(A, Fn), wb = sstep(0.15, 0.85, A.clk.x);   // blend toward the next stance through the flight
    if (fc && wb > 0) aPlan = v2.add(v2.sc(aPlan, 1 - wb), v2.sc(fc.plan.dV, wb / Math.max(0.12, fc.plan.tc + fc.plan.tf))); }
  // critically damped (C1) follower: the lean's rate never jumps when its target does
  { const wn = 1 / T1.leanTau; A.aFv = A.aFv || [0, 0]; A.aFv = v2.add(A.aFv, v2.sc(v2.sub(v2.sc(v2.sub(aPlan, A.aF), wn * wn), v2.sc(A.aFv, 2 * wn)), dt)); A.aF = v2.add(A.aF, v2.sc(A.aFv, dt)); }
  const latA = v2.dot(A.aF, rgt(A.psi)), fwdA = v2.dot(A.aF, fwd(A.psi));
  const latL = clamp(Math.atan(latA / G) * T1.leanK, -T1.leanMax, T1.leanMax), fwdL = clamp(Math.atan(fwdA / G) * T1.leanFwdK, -T1.leanBack, T1.leanFwdMax);
  A.lean = [latL, fwdL];
  // crouch (role of the current stance, smoothed critically damped) and arm balance
  const role = A.st.role ? A.st.role.kind : "RUN", ad = man ? Math.abs(man.delta) / DEG : 0;
  let cT = role === "PLANT" ? tab(T1.crouch.PLANT, ad) : role === "BRAKE" ? T1.crouch.BRAKE * (0.6 + 0.4 * sstep(45, 135, ad)) : role === "EXIT" ? T1.crouch.EXIT : role === "ACCEL" ? T1.crouch.ACCEL : 0;
  if (man && man.phase === "PRE" && role !== "BRAKE") cT = Math.max(cT, 0.045);
  const wc = 1 / T1.crouchTau; A.crouchD += (wc * wc * (cT - A.crouch) - 2 * wc * A.crouchD) * dt; A.crouch += A.crouchD * dt;
  // ANTICIPATED PELVIS DROP: the lowering the current and the next stance will need to keep their plants (reach), predicted from the closed-form COM
  // path and the plants, followed by a critically damped filter — so the pelvis is already down when the foot lands (no drop at the touchdown itself)
  { let need = 0; const b = A.body, R = (b.thigh + b.shank) * 0.955, y0 = t1G(A, s).y0 - A.crouch;   // planned to a shorter reach than the pose enforces (0.985): margin
    const RlOf = (lean) => R3.mul(R3.z(-lean[0] * T1.pelvisLat), R3.x(lean[1] * T1.pelvisFwd));   // the pelvis lean moves the hips (the outside hip rides higher)
    const leanOf = (dV, Ts) => { const a = v2.sc(dV, 1 / Math.max(0.12, Ts)); return [clamp(Math.atan(v2.dot(a, rgt(A.psi)) / G) * T1.leanK, -T1.leanMax, T1.leanMax), clamp(Math.atan(v2.dot(a, fwd(A.psi)) / G) * T1.leanFwdK, -T1.leanBack, T1.leanFwdMax)]; };
    let Rl = RlOf(A.lean);
    const needAt = (F, pl, Pc, psi, sx, role) => { const sg = F === "R" ? 1 : -1, ho = R3.v(Rl, [sg * b.hipX, 0, 0]), hip = v2.add(Pc, v2.add(v2.sc(rgt(psi), ho[0]), v2.sc(fwd(psi), ho[2]))), yH = y0 + ho[1]; let bt = t1Tab(A, F, s, "beta", sx); const hs = role && T1.heelStrike[role]; if (hs && sx < 0.28) { const k = 1 - sstep(0, 0.28, sx); bt = Math.max(bt, hs * DEG * k * k); }
      const an = t1AnkleW(A, pl, bt, sx), dxz = Math.hypot(an[0] - hip[0], an[2] - hip[1]), dy = yH - an[1]; return Math.min(T1.dropMaxRole[role] || T1.dropMax, Math.max(0, dy - Math.sqrt(Math.max(0, R * R - dxz * dxz))) * (1 - sstep(0.5, 0.8, sx))); };
    const S = A.st, F0 = A.clk.seg === 0 ? "R" : A.clk.seg === 2 ? "L" : null;
    if (F0) for (let sx = A.clk.x; sx <= 0.62; sx += 0.08) { const tau = sx * S.tc, Pc = v2.add(S.P0, v2.add(v2.sc(S.V0, tau), v2.sc(S.dV, S.tc * Fp(sx)))); need = Math.max(need, needAt(F0, A.legs[F0].plant, Pc, A.psi, sx, S.role && S.role.kind)); }
    for (const F of ["R", "L"]) { const L = A.legs[F]; if (L.stance || !L.fcPlant || !L.fcP) continue; const wAnt = sstep(0.32, 0.12, L.tTDf - A.t); if (wAnt <= 0) continue;   // the next stance, ramped in over the 0.3 s before it lands
      const fp = L.fcPlan; Rl = RlOf(leanOf(fp.dV, fp.tc + (fp.tf || 0.05)));   // the lean that stance will have
      for (let sx = 0; sx <= 0.5; sx += 0.1) { const tau = sx * fp.tc, Pc = v2.add(L.fcP, v2.add(v2.sc(L.fcV, tau), v2.sc(fp.dV, fp.tc * Fp(sx)))); need = Math.max(need, wAnt * needAt(F, L.tgt ? { pos: [L.tgt[0], L.tgt[1]], yaw: L.tgt[2], pivot: L.fcPlant.pivot } : L.fcPlant, Pc, A.psi, sx, fp.role && fp.role.kind)); } }
    need = Math.min(0.20, need); const wd = 2 * Math.PI * 6.5; A.dropD = (A.dropD || 0) + (wd * wd * (need - (A.drop || 0)) - 2 * wd * (A.dropD || 0)) * dt; A.drop = (A.drop || 0) + A.dropD * dt;
    A.dropNeed = need; }
  const aT = (T1.armBal[role] || 0) * (role === "PLANT" ? 0.6 + 0.4 * sstep(45, 120, ad) : 1); { const wn = 1 / T1.armTau; A.armV = (A.armV || 0) + (wn * wn * (aT - A.arm) - 2 * wn * (A.armV || 0)) * dt; A.arm += A.armV * dt; }
  // swing aim: each swinging foot tracks the forecast of its plant; a forecast change is absorbed smoothly before the touchdown
  for (const F of ["R", "L"]) {
    const L = A.legs[F]; if (L.stance) continue;
    const fc = t1Forecast(A, F); if (!fc) continue;
    const tTD = fc.t, w1 = L.w == null || A.t - L.tTO < 1e-9 ? clamp((A.t - L.tTO) / Math.max(1e-3, tTD - L.tTO), 0, 1) : clamp(L.w + dt * (1 - L.w) / Math.max(dt, tTD - A.t + dt), 0, 1);   // the remaining fraction over the remaining time: continuous when the forecast changes
    const want = L.tgt && L.w > 0.8 ? L.tgt.slice() : [fc.plant.pos[0], fc.plant.pos[1], fc.plant.yaw];   // a landing foot (w > 0.8) keeps its plant
    if (!L.tgt) L.tgt = want.slice();
    else {
      const jump = [want[0] - L.tgt[0] - L.err[0], want[1] - L.tgt[1] - L.err[1], wrapA(want[2] - L.tgt[2] - L.errYaw)];
      // the error absorbs the jump, then decays to zero by the touchdown (C0 aim, lands exactly on the forecast)
      L.err = [L.err[0] + jump[0], L.err[1] + jump[1]]; L.errYaw += jump[2];
      const kk = w1 >= 1 ? 0 : Math.pow(Math.max(0, (1 - w1) / Math.max(1e-6, 1 - L.w)), 1.6);
      L.err = v2.sc(L.err, kk); L.errYaw *= kk;
      L.tgt = [want[0] - L.err[0], want[1] - L.err[1], want[2] - L.errYaw];
    }
    { const p0 = t1G(A, s), rk = fc.plan.role ? fc.plan.role.kind : "RUN", hsK = T1.heelStrike[rk], bT = hsK ? Math.max(hsK * DEG, E.r1FootPitch(p0, 0) * DEG) : E.r1FootPitch(p0, 0) * DEG;   // the strike pitch the foot lands with
      if (L.bStrike == null || L.w === 0 && w1 < 0.05) { L.bStrike = bT; L.bStrikeV = 0; } else { const wn = 2 * Math.PI * 5; L.bStrikeV += (wn * wn * (bT - L.bStrike) - 2 * wn * L.bStrikeV) * dt; L.bStrike += L.bStrikeV * dt; } }
    L.w = w1; L.tTDf = tTD; L.fcPlant = fc.plant; L.tgtRole = fc.plan.role ? fc.plan.role.kind : "RUN"; L.fcP = fc.P; L.fcV = fc.V; L.fcPlan = { tc: fc.plan.tc, tf: fc.plan.tf, dV: fc.plan.dV, role: fc.plan.role };
  }
}
function t1Row(A) {
  const s = v2.len(A.V);
  return { t: +A.t.toFixed(5), x: A.P[0], y: A.P[1], vx: A.V[0], vy: A.V[1], s, thv: s > 0.2 ? ang2(A.V) : A.psi, psi: A.psi, gaze: A.gaze, ax: A.acc[0], ay: A.acc[1], lean: A.lean.slice(), crouch: A.crouch,
    seg: A.clk.seg, x01: A.clk.x, role: A.st.role ? A.st.role.kind : "RUN", man: A.man ? A.man.kind + "/" + A.man.tech + "/" + A.man.phase : null, dir: A.input.dir, vDes: A.input.v,
    plantR: A.legs.R.plant ? A.legs.R.plant.pos.slice() : null, plantL: A.legs.L.plant ? A.legs.L.plant.pos.slice() : null };
}

// ── RUN-1.3 reference tables per speed-grid cell (pure functions of speed, foot and phase; built lazily, shared per body) ─────────────────
// stance: the foot pitch β(s) RUN-1 uses (its knee-driven heel rise); swing: the ankle path (root frame + root travel), foot yaw / pitch / roll, toe.
const T1_TAB_N = 32, T1_GRID = { v0: 2.5, dv: 0.25, n: 29 };   // 2.5 … 9.5 m/s
function t1Cell(A, i, F) {
  const H = A.tabHost || A.body, C = H._t1tab || (H._t1tab = {}), key = i + F; if (C[key]) return C[key];   // shared by every actor on this rig
  const v = T1_GRID.v0 + i * T1_GRID.dv, b = A.body, Gg = { body: b, p: E.r1GaitAt(b, E.RUN1.ref, v), late: null, accLean: 0 }, p = Gg.p, D = p.D, off = F === "R" ? 0 : 0.5;
  const beta = [], sw = [];
  for (let j = 0; j <= T1_TAB_N; j++) {
    const x = j / T1_TAB_N; beta.push(E.r1StanceLeg(Gg, F, x).beta);
    const uu = (off + D + x * (1 - D)) % 1, ps = E.r1Pose(Gg, uu, null), fk = E.r1FK(Gg, ps, null), jt = fk.joint[b.idx["foot_" + F]], Rm = fk.R[b.idx["foot_" + F]], tr = ps.rot["toe_" + F];
    sw.push([jt[0], jt[1], jt[2] + v * x * (1 - D) * p.T, ...Rm, Math.atan2(tr[7], tr[4])]);   // foot rotation as a matrix (a pitched-up foot has no stable Euler yaw)
  }
  return (C[key] = { beta, sw });
}
function t1Tab(A, F, s, kind, x) {                                                 // bilinear in (speed cell, phase)
  const g = clamp((clamp(s, T1.vMin, T1.vMax) - T1_GRID.v0) / T1_GRID.dv, 0, T1_GRID.n - 1 - 1e-9), i = Math.floor(g), ti = g - i, xx = clamp(x, 0, 1) * T1_TAB_N, j = Math.min(T1_TAB_N - 1, Math.floor(xx)), tj = xx - j;
  const a = t1Cell(A, i, F)[kind], c = t1Cell(A, i + 1, F)[kind];
  if (kind === "beta") { const p0 = a[j] + (a[j + 1] - a[j]) * tj, p1 = c[j] + (c[j + 1] - c[j]) * tj; return p0 + (p1 - p0) * ti; }
  const out = []; for (let k = 0; k < a[j].length; k++) { const p0 = a[j][k] + (a[j + 1][k] - a[j][k]) * tj, p1 = c[j][k] + (c[j + 1][k] - c[j][k]) * tj; out.push(p0 + (p1 - p0) * ti); } return out;
}
// ── pose: RUN-1.3's base pose at the clock phase, the stance leg on its world plant, the swing leg on the warped path, the body organisation ──
function t1Phase(A, p) {                                                            // RUN-1 global phase u from the clock (segment progress)
  const c = A.clk, D = p.D, st = [0, D, 0.5, 0.5 + D], ln = [D, 0.5 - D, D, 0.5 - D];
  return (st[c.seg] + c.x * ln[c.seg]) % 1;
}
const t1Loc = (A, w) => { const d = v2.sub([w[0], w[2]], A.P), f = fwd(A.psi), r = rgt(A.psi); return [v2.dot(d, r), w[1], v2.dot(d, f)]; };   // pitch (x, h, y) → root local
function t1Pose(A) {
  const s = v2.len(A.V), p = t1G(A, s), Gg = { body: A.body, p, late: null, accLean: 0 }, u = A.phi != null ? A.phi : t1Phase(A, p), b = A.body;
  const base = E.r1Pose(Gg, u, null), rot = base.rot, pel = base.pel;
  // pelvis: RUN-1's local oscillation, the body lean (about the root axes), crouch and lean lowering
  const [latL, fwdL] = A.lean, tilt = Math.hypot(latL, fwdL);
  // TURN-1.1 (A.L11): the authored body layer replaces the pelvis lean split / crouch and adds its pelvis offsets; without it this is TURN-1 exactly
  const H = A.L11 && A.L11.active(A) ? A.L11 : null, HP = H ? H.pelvis(A, pel, latL, fwdL) : null;
  const Rlean = H ? null : R3.mul(R3.z(-latL * T1.pelvisLat), R3.x(fwdL * T1.pelvisFwd));      // the pelvis takes part of the lean, the trunk the rest
  const Rp = H ? HP.R : R3.mul(Rlean, pel.R);
  const yP = H ? HP.y : pel.pos[1] - A.crouch;                                       // (no lean lowering: a stance leg that needs it lowers the pelvis by reach, below)
  const pelvisPos = H ? HP.pos : [pel.pos[0], yP, 0];
  rot.pelvis = Rp;
  const legs = {}, diag = { feet: {} };
  // REACH-DRIVEN PELVIS DROP: in early / mid stance a plant beyond the leg's reach lowers the pelvis (more knee flexion) instead of sliding the foot;
  // late stance keeps RUN-1's heel rise (about the toe pad). Bounded by dropMax; continuous within the stance, ≈ 0 at both contact events.
  let drop = 0;
  for (const F of ["R", "L"]) {
    const L = A.legs[F]; if (!L.stance) continue;
    const sg = F === "R" ? 1 : -1, sx = A.clk.seg === (F === "R" ? 0 : 2) ? A.clk.x : 1, hip = RV.add(pelvisPos, R3.v(Rp, [sg * b.hipX, 0, 0]));
    let bt = t1Tab(A, F, s, "beta", sx); const hs = L.role && T1.heelStrike[L.role.kind]; if (hs && sx < 0.28) { const k = 1 - sstep(0, 0.28, sx); bt = Math.max(bt, hs * DEG * k * k); }
    const an = t1Loc(A, t1AnkleW(A, L.plant, bt, sx)), dx = an[0] - hip[0], dz = an[2] - hip[2], R = (b.thigh + b.shank) * 0.985, dy = hip[1] - an[1];
    const dyMax = Math.sqrt(Math.max(0, R * R - dx * dx - dz * dz)), need = Math.max(0, dy - dyMax) * (1 - sstep(0.5, 0.8, sx));
    drop = Math.max(drop, Math.min(T1.dropMaxRole[L.role && L.role.kind] || T1.dropMax, need));
  }
  const dropA = H ? H.dropA(A) : (A.drop || 0); pelvisPos[1] -= Math.max(dropA, drop); diag.drop = Math.max(dropA, drop); diag.dropLate = Math.max(0, drop - dropA);
  for (const F of ["R", "L"]) {
    const sg = F === "R" ? 1 : -1, L = A.legs[F], hip = RV.add(pelvisPos, R3.v(Rp, [sg * b.hipX, 0, 0]));
    let ankleL, Rf, beta = 0, wStance = null, mtp = 0;
    if (L.stance) {
      const sx = A.clk.seg === (F === "R" ? 0 : 2) ? A.clk.x : 1;
      beta = t1Tab(A, F, s, "beta", sx);                                          // RUN-1's own foot roll profile at this stance fraction
      const hs = L.role && T1.heelStrike[L.role.kind];                               // braking / plant steps land on the heel and roll forward
      if (hs && sx < 0.28) { const k = 1 - sstep(0, 0.28, sx); beta = Math.max(beta, hs * DEG * k * k); }   // early stance only (the late heel rise is RUN-1's)
      if (L.bLand != null) { let b0 = t1Tab(A, F, s, "beta", 0); if (hs) b0 = Math.max(b0, hs * DEG); beta += (L.bLand - b0) * (1 - s5(sx * A.st.tc / 0.04)); }   // continuous with the landing pitch
      let aw = t1AnkleW(A, L.plant, beta, sx); ankleL = t1Loc(A, aw);
      const yawL = wrapA(aw[3] - A.psi);
      // REACH: two continuous corrections of the foot roll, blended by stance phase — early, the foot rolls further onto its heel (toes up, about
      // the heel: monotone shortening), eased in after the touchdown; late, the heel rises further (about the toe pad: RUN-1's own mechanism)
      const reach = b.thigh + b.shank - 0.004, distAt = (bb) => RV.len(RV.sub(t1Loc(A, t1AnkleW(A, L.plant, bb, sx)), hip)), bProf = beta;
      const wEarly = 1 - sstep(0.30, 0.50, sx);
      let bUp = bProf, bDn = bProf;
      if (wEarly > 0) { const d0 = distAt(bProf); if (d0 > reach) { let lo = bProf, hi = Math.max(bProf, 30 * DEG); const dH = distAt(hi);
        if (dH <= reach) { for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (distAt(m) > reach) lo = m; else hi = m; } bUp = hi; }
        else if (dH < d0) bUp = bProf + (hi - bProf) * clamp((d0 - reach) / (d0 - dH), 0, 1);   // only as much as helps, continuous at the threshold
      } }
      if (wEarly < 1 && distAt(Math.min(bProf, 0)) > reach) { let lo = -88 * DEG, hi = Math.min(bProf, 0); for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (distAt(m) > reach) hi = m; else lo = m; } bDn = lo; }
      beta = bProf + wEarly * (bUp - bProf) * s5(sx * A.st.tc / 0.035) + (1 - wEarly) * (bDn - bProf);   // eased in over 35 ms after the touchdown
      aw = t1AnkleW(A, L.plant, beta, sx); ankleL = t1Loc(A, aw);
      Rf = R3.mul(R3.y(yawL), R3.x(-beta)); wStance = sx;
      const up = -beta; mtp = up > 0 ? E.r1MtpDF(up) : 0;
      diag.feet[F] = { stance: true, s: sx, plant: L.plant.pos.slice(), plantYaw: L.plant.yaw, beta, role: L.role ? L.role.kind : "RUN", Rw: R3.mul(R3.y(A.psi + Math.PI / 2), Rf) };
    } else {
      // swing: RUN-1's own swing path at this speed (root travel + FK ankle), warped from the actual toe-off point to the aimed plant
      const w = H ? H.swingW(A, F, clamp(L.w || 0, 0, 1)) : clamp(L.w || 0, 0, 1), D = p.D, off = F === "R" ? 0 : 0.5, T = p.T, sv = clamp(s, T1.vMin, T1.vMax);   // TURN-1.1 may run the free leg's swing ahead in its own cycle (same end points)
      const ortho = (m) => { const x = RV.sc([m[0], m[3], m[6]], 1 / Math.hypot(m[0], m[3], m[6])); let y = [m[1], m[4], m[7]]; y = RV.sub(y, RV.sc(x, RV.dot(x, y))); y = RV.sc(y, 1 / RV.len(y)); const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]; return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; };
      const refAt = (ww) => { const q = t1Tab(A, F, s, "sw", ww); return { a: [q[0], q[1], q[2]], R: ortho(q.slice(3, 12)), toe: q[12] }; };
      const r0 = refAt(0), r1 = refAt(1), rw = refAt(w);
      const A0 = L.A0, tg = L.tgt || [L.fcPlant ? L.fcPlant.pos[0] : A0[0], L.fcPlant ? L.fcPlant.pos[1] : A0[2], L.yaw0];
      const bTD = L.bStrike != null ? L.bStrike : E.r1FootPitch(p, 0) * DEG;
      const pl1 = { pos: [tg[0], tg[1]], yaw: tg[2] }, A1 = t1AnkleW(A, pl1, bTD, 0);   // the touchdown ankle (that step's strike pitch, filtered)
      // reference displacement (local x, z) and actual displacement (pitch) → rotation + along-scale; lateral and vertical shape kept
      const dR = [r1.a[0] - r0.a[0], r1.a[2] - r0.a[2]], lR = Math.hypot(dR[0], dR[1]) || 1e-6, eR = [dR[0] / lR, dR[1] / lR];
      const dA = [A1[0] - A0[0], A1[2] - A0[2]], lA = Math.hypot(dA[0], dA[1]);
      const rel = [rw.a[0] - r0.a[0], rw.a[2] - r0.a[2]], along = (rel[0] * eR[0] + rel[1] * eR[1]) / lR;
      const eA = lA > 1e-4 ? [dA[0] / lA, dA[1] / lA] : fwd(A.psi);
      // lateral: the reference's offset to the RIGHT of its own step direction (local x right, z forward: right of e = (e.z, −e.x)) …
      const latRight = rel[0] * eR[1] - rel[1] * eR[0];
      // … kept, in metres, to the right of the actual step direction (pitch: right of e = (−e.y, e.x))
      const rA = rgtOf(eA), wpos = [A0[0] + eA[0] * along * lA + rA[0] * latRight, A0[2] + eA[1] * along * lA + rA[1] * latRight];
      const lower = Math.max(0, pel.pos[1] - pelvisPos[1]);                         // how far the pelvis sits below RUN-1's (crouch, lean, drop)
      const vy = rw.a[1] - lerpN(r0.a[1], r1.a[1], along) + lerpN(A0[1], A1[1], along) - lower * Math.min(1, 4 * along * (1 - along)) * 0.6;
      let aw = [wpos[0], vy, wpos[1]]; if (H) aw = H.swing(A, F, w, aw, eA, rA); ankleL = t1Loc(A, aw);   // TURN-1.1: the free leg's authored path offset (zero at both ends)
      // foot orientation: the reference's (root frame) pitch / roll with a yaw blended from the toe-off yaw to the plant yaw
      // foot heading: from the toe-off heading, turned with the pelvis early in the swing, aimed at the plant's heading late; the foot's own pitch /
      // roll are RUN-1's (its rotation, yawed by the difference to RUN-1's straight-run heading = the toe-out)
      const sgF = F === "R" ? 1 : -1, yMid = A.psi + sgF * T1.toeOut, yA = L.yaw0 + wrapA(yMid - L.yaw0) * s5(w / 0.35), yawW = yA + wrapA(tg[2] - yA) * s5((w - 0.45) / 0.55);
      Rf = R3.mul(R3.y(wrapA(yawW - A.psi) - sgF * T1.toeOut), rw.R); L._yawW = yawW;
      if (L.R0w && w < 0.3) Rf = rSlerp(R3.mul(R3.tr(R3.y(A.psi + Math.PI / 2)), L.R0w), Rf, s5(w / 0.3));   // from the stance foot's actual toe-off rotation
      if (w > 0.7) { const btd = bTD, Rtd = R3.mul(R3.y(wrapA(tg[2] - A.psi)), R3.x(-btd));
        Rf = rSlerp(Rf, Rtd, s5((w - 0.7) / 0.3)); }                                 // … into the strike orientation the stance begins with
      wStance = null; diag.feet[F] = { stance: false, w, aim: [tg[0], tg[1]], aimYaw: tg[2], tTD: L.tTDf };
      rot["toe_" + F] = R3.x(w < 0.3 && L.toe0 != null ? lerpN(L.toe0, rw.toe, s5(w / 0.3)) : rw.toe);   // from the stance's toe angle
    }
    // leg IK: knee plane = the foot's yaw in the pelvis frame (hip rotation range), then foot orientation relative to the shank
    // (yaw only, as RUN-1: the foot's heading minus the pelvis's — a pitched-up foot's 3D forward vector is ill-conditioned)
    const footYawW = L.stance ? t1AnkleW(A, L.plant, 0, wStance)[3] : L._yawW;
    let psi = wrapA(footYawW - A.psi) - pel.yaw - (H ? HP.yaw : 0);
    psi = sg > 0 ? clamp(psi, -40 * DEG, 35 * DEG) : clamp(psi, -35 * DEG, 40 * DEG);   // hip rotation range (internal / external)
    if (!L.stance) {                                                               // swing hip range: the ankle target is pulled toward the hip's plane
      const Fm = R3.mul(Rp, R3.y(psi)), Dl = R3.v(R3.tr(Fm), RV.sub(ankleL, hip)), lim = T1.swingAbd, amx = (sg > 0 ? lim[1] : -lim[0]) * DEG, amn = (sg > 0 ? lim[0] : -lim[1]) * DEG;
      const wg = sstep(0.0, 0.18, L.w || 0) * (1 - sstep(0.80, 0.97, L.w || 0));    // faded out at both contact events (continuity with the stance)
      const a0 = Math.atan2(Dl[0], -Dl[1]); if (wg > 0 && (a0 > amx || a0 < amn)) { const ac = a0 + (clamp(a0, amn, amx) - a0) * wg, r = Math.hypot(Dl[0], Dl[1]); ankleL = RV.add(hip, R3.v(Fm, [r * Math.sin(ac), -r * Math.cos(ac), Dl[2]])); }
    }
    let ik = E.r1LegIK(b, Rp, psi, hip, ankleL);
    if (!L.stance) {                                                               // swing: knee clearance and toe clearance, ONE smooth correction (no toggling)
      const kneeP = RV.add(hip, R3.v(R3.mul(Rp, ik.Rthigh), [0, -b.thigh, 0])), kDef = (H ? H.kneeClear(A) : T1.kneeClear) - kneeP[1], w = L.w || 0;   // TURN-1.1 may raise the floor (no kneeling look)
      const fl = b.ankleH + 0.05 * Math.sin(Math.PI * clamp(w, 0, 1)), aDef = fl - ankleL[1];
      const sp = (x, k) => k * Math.log1p(Math.exp(x / k));                          // softplus: smooth max(0, x)
      const lift = Math.max(sp(kDef, 0.02) * 1.3, sp(aDef, 0.01)) * sstep(0.02, 0.15, w) * (1 - sstep(0.85, 0.98, w));
      if (lift > 1e-4) { ankleL = [ankleL[0], ankleL[1] + lift, ankleL[2]]; ik = E.r1LegIK(b, Rp, psi, hip, ankleL); }
    }
    const Rshin = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin));
    const fl = R3.toYXZ(R3.mul(R3.tr(Rshin), Rf));
    rot["thigh_" + F] = ik.Rthigh; rot["shin_" + F] = ik.Rshin; rot["foot_" + F] = R3.yxz(fl[0], fl[1], fl[2]);
    if (L.stance) { rot["toe_" + F] = R3.x(mtp > 0 ? -mtp : 0); diag.feet[F].toe = mtp > 0 ? -mtp : 0; }
    legs[F] = { reach: ik.reach, knee: ik.k / DEG, hipFlex: ik.h / DEG, hipAbd: ik.a / DEG, psi: psi / DEG, stance: L.stance, s: wStance };
  }
  // trunk: the rest of the lean in the spine / chest, the chest's lead toward the gaze; head toward the gaze, levelled part of the lean
  if (H) H.trunk(A, rot, latL, fwdL);
  else {
  const extraRoll = -latL * (1 - T1.pelvisLat) * 1.3, extraPitch = fwdL * (1 - T1.pelvisFwd) * 1.2;
  rot.spine = R3.mul(R3.mul(R3.z(extraRoll * 0.4), R3.x(extraPitch * 0.45)), R3.mul(R3.y(A.chest * 0.3), rot.spine));
  rot.chest = R3.mul(R3.mul(R3.z(extraRoll * 0.6), R3.x(extraPitch * 0.55)), R3.mul(R3.y(A.chest * 0.7), rot.chest));
  }
  const Rch = R3.mul3(Rp, rot.spine, rot.chest), gzRel = clamp(wrapA(A.gaze - A.psi), -T1.headMax - T1.chestMax, T1.headMax + T1.chestMax);
  const want = H ? H.headWant(A, gzRel, p, latL) : R3.mul3(R3.y(gzRel), R3.x(p.gazeDown * DEG), R3.z(latL * 0.35)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q);
  rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Q);
  // arms: balance abduction (both, more on the outside of the lean), elbows open a little
  if (H) H.arms(A, rot, latL, p, u);
  else if (A.arm > 0.3) for (const F of ["R", "L"]) {
    const sg = F === "R" ? 1 : -1, outside = 0.55 + 0.45 * sstep(-10 * DEG, 10 * DEG, -sg * latL), ab = A.arm * outside * DEG;   // continuous in the lean
    rot["upperArm_" + F] = R3.mul(R3.z(sg * ab), rot["upperArm_" + F]);
    rot["foreArm_" + F] = R3.mul(R3.x(ab * 0.35), rot["foreArm_" + F]);
  }
  if (H) diag.l11 = H.diag(A);
  return { rot, pelvisPos, legs, diag, u, p };
}
function rgtOf(e) { return [-e[1], e[0]]; }
function t1Evaluate(A) {
  const pose = t1Pose(A), rootM = E.r1RootMatrix(A.P[0], A.P[1], A.psi, 0);
  const Gg = { body: A.body, p: pose.p };
  const fk = E.r1FK(Gg, pose, rootM, A.fkBuf); A.fkBuf = fk; A.pose = pose; A.fk = fk;
  A.skinMats = A.skinMats || new Float32Array(16 * A.body.skel.bones.length);
  const inv = A.body.skel.invBind; for (let i = 0; i < fk.world.length; i++) A.skinMats.set(M4.mul(fk.world[i], inv[i]), i * 16);
  return { pose, fk, skinMats: A.skinMats };
}
// ── scenario input: a straight run, then (at tCmd) a requested heading change of dDeg (+ right), optionally changed again later ─────────────
function t1Input(scn, t) {
  let dir = scn.heading || 0, v = scn.v;
  // an exact reversal (|turn| = 180°) is ambiguous; the request keeps its side (the input device's last lateral component) by 0.5°
  for (const c of scn.cmds || []) if (t >= c.t - 1e-12) { if (c.turn != null) dir = (scn.heading || 0) + clamp(c.turn, -179.5, 179.5) * DEG; if (c.v != null) v = c.v; }
  return { dir, v };
}
// deterministic replay to time t (fixed grid from 0; the partial step is not simulated: the pose is evaluated at the last grid step ≤ t)
function t1Replay(A, scn, t) {
  if (A._rt == null || t < A._rt - 1e-9) { const fresh = t1Make(A.tabHost, scn.init); Object.assign(A, fresh); A._rt = 0; A.fkBuf = null; A.skinMats = null; }
  while (A._rt + T1.step <= t + 1e-9) { t1Step(A, t1Input(scn, A._rt)); A._rt += T1.step; }
  return A;
}
// ── DRIBBLE-1 interface: the locomotion facts a physical ball system consumes (all world frame: anim3d x = pitch x, y = up, z = −pitch y) ────────
// t1Clone: an independent copy of the presentation state (deterministic: advancing it with the same input reproduces the original exactly).
function t1Clone(A) {
  const C = Object.assign({}, A), J = (x) => x == null ? x : JSON.parse(JSON.stringify(x));
  for (const k of ["P", "V", "clk", "st", "legs", "man", "lean", "aF", "aFv", "input", "acc", "l11s"]) C[k] = J(A[k]);   // l11s: the TURN-1.1 body layer state (absent in TURN-1)
  C.log = A.log.length ? [Object.assign({}, A.log[A.log.length - 1])] : []; C.events = []; C.fkBuf = null; C.skinMats = null; C.pose = null; C.fk = null; C.logOn = true;
  return C;
}
const t1FootPts = (A, fk, F) => { const b = A.body, i = b.idx["foot_" + F], t = b.idx["toe_" + F], W = fk.world[i];
  return { ankle: fk.joint[i].slice(), toeTip: fk.tip[t].slice(), heel: M4.transformPoint(W, [0, -b.ankleH, b.heelZ + 0.012]), ball: M4.transformPoint(fk.world[t], [0, -(b.ankleH + b.mtp[1]), 0.0]), world: Array.from(W) }; };
// t1State: the facts at the current step: per foot transforms, linear / angular velocity (forward difference over one 240 Hz step of a clone advanced
// with the same input), support state, stance / swing progress, the plant and the aimed next touchdown; pelvis and COM motion; desired vs actual
// direction, body facing, gaze; the turn state (mode, technique, phase, requested change, plant foot).
function t1State(A) {
  const e0 = t1Evaluate(A), C = t1Clone(A); t1Step(C, A.input); const e1 = t1Evaluate(C), h = T1.step, b = A.body, out = { t: A.t, frame: "anim3d world (x = pitch x, y up, z = −pitch y)" };
  const vel = (p0, p1) => [(p1[0] - p0[0]) / h, (p1[1] - p0[1]) / h, (p1[2] - p0[2]) / h];
  const angVel = (W0, W1) => { const R = (W, r, c) => W[c * 4 + r], d = (r, c) => (R(W1, r, c) - R(W0, r, c)) / h, w = (r, k) => d(r, 0) * R(W0, k, 0) + d(r, 1) * R(W0, k, 1) + d(r, 2) * R(W0, k, 2); return [(w(2, 1) - w(1, 2)) / 2, (w(0, 2) - w(2, 0)) / 2, (w(1, 0) - w(0, 1)) / 2]; };
  out.feet = {};
  for (const F of ["R", "L"]) { const f0 = t1FootPts(A, e0.fk, F), f1 = t1FootPts(C, e1.fk, F), L = A.legs[F], d = e0.pose.diag.feet[F];
    out.feet[F] = Object.assign(f0, { vel: { ankle: vel(f0.ankle, f1.ankle), toeTip: vel(f0.toeTip, f1.toeTip), ball: vel(f0.ball, f1.ball) }, angVel: angVel(f0.world, f1.world),
      stance: !!L.stance, stanceFrac: L.stance ? d.s : null, swingFrac: L.stance ? null : d.w, role: L.stance ? (L.role ? L.role.kind : "RUN") : null,
      plant: L.stance ? { pitch: L.plant.pos.slice(), yaw: L.plant.yaw, since: A.t - L.tTD } : null,
      nextTouchdown: L.stance ? null : { t: L.tTDf, inS: L.tTDf - A.t, pitch: L.tgt ? [L.tgt[0], L.tgt[1]] : null, yaw: L.tgt ? L.tgt[2] : null, role: L.tgtRole || null } }); }
  const pi = b.idx.pelvis, p0 = e0.fk.joint[pi], p1 = e1.fk.joint[pi];
  out.pelvis = { pos: p0.slice(), vel: vel(p0, p1), yaw: A.psi, yawRate: wrapA(C.psi - A.psi) / h };
  out.com = { pitch: A.P.slice(), vel: A.V.slice(), speed: v2.len(A.V), acc: A.acc.slice() };
  out.direction = { desired: A.input.dir, desiredSpeed: A.input.v, actual: v2.len(A.V) > 0.2 ? ang2(A.V) : A.psi, facing: A.psi, gaze: A.gaze };
  out.support = A.legs.R.stance ? "R" : A.legs.L.stance ? "L" : "flight";
  out.stride = { seg: A.clk.seg, segFrac: A.clk.x, phase: e0.pose.u, touchdowns: A.tdCount };
  out.turn = A.man ? { mode: A.man.kind, technique: A.man.tech, phase: A.man.phase, requested: A.man.delta, plantFoot: A.man.plantFoot, sinceDecision: A.t - A.man.tDecide } : { mode: A.st.role ? A.st.role.kind : "RUN" };
  return out;
}
// t1Predict: where each foot WILL be over the next horizon seconds if the input does not change (a deterministic lookahead on a clone):
// samples every `every` steps of the ankle, toe tip and ball of each foot with its support state — what DRIBBLE-1 needs to plan a touch.
function t1Predict(A, horizon, every) {
  const C = t1Clone(A), n = Math.round((horizon || 0.4) / T1.step), k = every || 4, out = [];
  for (let i = 1; i <= n; i++) { t1Step(C, C.input); if (i % k) continue; const e = t1Evaluate(C); const o = { t: C.t, support: C.legs.R.stance ? "R" : C.legs.L.stance ? "L" : "flight", com: C.P.slice() };
    for (const F of ["R", "L"]) { const f = t1FootPts(C, e.fk, F); o[F] = { ankle: f.ankle, toeTip: f.toeTip, ball: f.ball, stance: !!C.legs[F].stance }; } out.push(o); }
  return out;
}
return { T1, t1Make, t1Step, t1State, t1Predict, t1Clone, t1Evaluate, t1Pose, t1Replay, t1Input, t1Forecast, t1StancePlan, t1PlaceDefault, t1AnkleW, t1G, wrapA, fwd, rgt, DEG,
  _in: { t1Tab, t1Loc, rSlerp, rLog, rExp, Fp, Fv, tab, sstep, s5, clamp, lerpN, v2, ang2 } };   // internals the TURN-1.1 body layer reuses (read-only)
})();
if (typeof module !== "undefined" && module.exports) module.exports = TURN1;

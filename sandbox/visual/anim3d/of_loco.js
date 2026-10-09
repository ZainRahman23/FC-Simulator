// ═══ anim3d/of_loco.js — OUTFIELD LOCOMOTION V1: IDLE / WALK / JOG / RUN / SPRINT as ONE continuous system (presentation only) ═══
// The simulation decides the player's root, velocity and facing (match.js `t.p`: the ported world.py locomotion law). This layer
// consumes them and explains them: the gait family and its blend come from the AUTHORITATIVE speed, the cycle phase advances by the
// cadence the authoritative speed dictates for THIS body's stride, the lean comes from the authoritative acceleration, the lower body
// plays along the movement direction and the trunk twists toward the facing. Nothing here writes simulation state, nothing is random.
//   • the locomotion cycle is authored ONCE as biomechanical curves (hip / knee / ankle / toe per leg, pelvis bob-roll-yaw, spine and
//     chest counter-rotation, arm swing and elbow, lean) driven by a PARAMETER SET; WALK / JOG / RUN / SPRINT are four parameter sets
//     (contact phase, stride, flight, knee recovery, hip drive, arm drive, lean …) and the set in use is the speed blend of its two
//     neighbours — so every gait shares one phase convention (RIGHT heel strike at u = 0, LEFT at u = 0.5) and a transition never
//     restarts or swaps legs; it simply moves the parameter set;
//   • stride per step = the set's stride factor × THIS body's leg length; cadence = speed / step. A tall body takes longer strides at a
//     lower cadence for the same simulation speed — the stride is his, the displacement is the simulation's; residual mismatch is
//     absorbed by the plant / leg-IK contact solve (of_motion.js ofSolve: ankle lock at the heel strike, TOE pivot in the late stance,
//     reach cap) and REPORTED as slide, never hidden by moving the root;
//   • stop / start: the phase never freezes mid-swing — below the idle speed it settles (at a minimum cadence) to the nearest
//     double-support phase, the pose blends to the idle stance and the feet STEP to their stance points (one at a time); standing turns
//     re-plant the feet the same way when the authoritative facing turns them out of stance;
//   • acceleration / deceleration lean and the turn roll come from the authoritative velocity change (a deterministic first-order
//     filter over the fixed step), bounded; they never touch the acceleration law.
const OF_LOCO = {
  // gait parameter sets (angles deg; step in LEG LENGTHS; stance = fraction of the cycle the foot is on the ground; bob in metres @ the reference leg)
  gaits: [
    { id: "IDLE", kneeTO: 0.15,   v: 0.0, step: 0.30, stance: 0.80, hipFlex: 6,  hipExt: 2,  retract: 0.10, kneeSwing: 18,  kneeLoad: 4,  kneeStance: 4,  ankleHS: 2,  ankleTO: 4,  toeOff: 6,  bob: 0.000, bobOff: 0.00, roll: 1, pYaw: 1, sYaw: 1, lean: 1, arm: 4,  elbow: 22, abd: 8,  fwdKnee: 0 },
    { id: "WALK", kneeTO: 0.26,   v: 1.45, step: 0.80, stance: 0.62, hipFlex: 28, hipExt: 14, retract: 0.12, kneeSwing: 60,  kneeLoad: 14, kneeStance: 4,  ankleHS: 8,  ankleTO: 22, toeOff: 24, bob: 0.000, bobOff: 0.00, roll: 4, pYaw: 6, sYaw: 5, lean: 2, arm: 22, elbow: 28, abd: 9,  fwdKnee: 0 },
    { id: "JOG", kneeTO: 0.17,    v: 3.0,  step: 1.08, stance: 0.42, hipFlex: 36, hipExt: 17, retract: 0.22, kneeSwing: 92,  kneeLoad: 22, kneeStance: 10, ankleHS: 0,  ankleTO: 26, toeOff: 18, bob: 0.030, bobOff: 0.16, roll: 5, pYaw: 6, sYaw: 6, lean: 5, arm: 32, elbow: 76, abd: 10, fwdKnee: 6 },
    { id: "RUN", kneeTO: 0.11,    v: 5.5,  step: 1.38, stance: 0.36, hipFlex: 46, hipExt: 23, retract: 0.30, kneeSwing: 112, kneeLoad: 26, kneeStance: 14, ankleHS: -6, ankleTO: 30, toeOff: 14, bob: 0.045, bobOff: 0.18, roll: 6, pYaw: 8, sYaw: 8, lean: 9, arm: 46, elbow: 86, abd: 12, fwdKnee: 12 },
    { id: "SPRINT", kneeTO: 0.09, v: 8.2,  step: 1.66, stance: 0.30, hipFlex: 56, hipExt: 30, retract: 0.34, kneeSwing: 128, kneeLoad: 28, kneeStance: 16, ankleHS: -10, ankleTO: 34, toeOff: 10, bob: 0.055, bobOff: 0.15, roll: 6, pYaw: 10, sYaw: 10, lean: 14, arm: 62, elbow: 92, abd: 14, fwdKnee: 18 },
  ],
  idleV: 0.18,            // below: IDLE (settle + stance)
  idleBlendV: 0.65,       // the gait pose is fully in at this speed (from the idle stance below it)
  settleCadence: 1.6,     // steps / s used to walk the phase to the nearest double-support phase when stopping
  restPhase: [0.08, 0.58], // double-support phases (just after each heel strike) the cycle settles to
  leanAccel: 1.15,        // deg per m/s² of authoritative acceleration along the velocity (forward when accelerating, back when braking)
  leanMax: 16, leanMin: -12, rollLat: 1.0, rollMax: 10, leanTau: 0.12,   // bounds and the filter time constant (s)
  twistMax: 55,           // deg: how far the trunk may yaw toward the facing away from the movement direction before the legs follow the facing instead
  backpedalDeg: 110, backpedalOut: 88, legYawRate: 9.0,      // movement more than this from the facing: play the cycle in reverse (back-pedal) along the facing
  takeoverS: 0.12, stanceW: 1.15, stanceZ: -0.02, stepT: 0.26, stepLift: 0.06, replantM: 0.12, replantDeg: 28,   // idle stance (× hip width; metres × leg), the step (s, lift × leg length), replant thresholds
};
// ── parameter blend: the set in use for an authoritative speed (piecewise-linear between neighbouring gaits on their anchor speeds) ──
function ofLocoParams(v) {
  const G = OF_LOCO.gaits, s = Math.max(0, v); let i = 0; while (i < G.length - 2 && s > G[i + 1].v) i++;
  const a = G[i], b = G[i + 1], t = clamp01((s - a.v) / Math.max(1e-6, b.v - a.v)), P = { idx: i + t, lo: a.id, hi: b.id, t, v: s };
  for (const k in a) if (typeof a[k] === "number") P[k] = a[k] + (b[k] - a[k]) * t;
  if (s > G[G.length - 1].v) { const e = clamp01((s - G[G.length - 1].v) / 3); P.step *= 1 + 0.10 * e; P.lean += 3 * e; }   // beyond the sprint anchor: a little longer stride, a little more lean (bounded)
  P.gait = t < 0.5 ? a.id : b.id; return P;
}
// ── the locomotion cycle: rotation-only pose from the parameter set at cycle phase u (RIGHT heel strike at u = 0, LEFT at u = 0.5) ──
// conventions (shared rig): thigh x < 0 = hip flexion (leg forward); shin x > 0 = knee flexion; foot x > 0 = plantar-flexion (toes down);
// upperArm x < 0 = arm forward; foreArm x < 0 = elbow flexion; pelvis / spine x > 0 = lean forward; yaw about +y.
function ofLocoCycle(skel, P, u, opt) {
  const o = opt || {}, dir = o.reverse ? -1 : 1, tw = Math.PI * 2, pose = { name: P.gait }, S = P.stance, kLeg = skel.legLen / OF_REF_LEG;
  const leg = (sd, ph) => {
    ph = ((ph % 1) + 1) % 1; const st = ph < S, s = st ? ph / S : 1, w = st ? 0 : (ph - S) / (1 - S);
    // hip: forward (flexed) at the heel strike, extends through the stance to the toe-off, swings forward again (peak flexion just before the contact)
    const hipC = -P.hipFlex * (1 - P.retract);                                                        // contact angle: the swing leg RETRACTS from its peak flexion before it lands (the foot comes back under the body — no reaching)
    let hip = st ? lerp(hipC, P.hipExt, s) : (w < 0.72 ? lerp(P.hipExt, -P.hipFlex, Math.sin(Math.PI / 2 * w / 0.72)) : lerp(-P.hipFlex, hipC, smooth01((w - 0.72) / 0.28)));
    // knee: loading response in the early stance, extension mid-stance, flexion starting in the late stance into the swing recovery, extension for the landing
    const load = st ? P.kneeStance + P.kneeLoad * Math.sin(Math.PI * Math.min(1, s / 0.7)) * (s < 0.7 ? 1 : 0) : 0;
    const w2 = st ? Math.max(0, (s - 0.72) / 0.28) * P.kneeTO : P.kneeTO + w * (1 - P.kneeTO);         // the swing curve starts in the last 28 % of the stance: kneeTO = how far into its recovery the knee is at the toe-off (a walk ~40° of knee at toe-off, a run ~25°)
    const swing = P.kneeSwing * Math.pow(Math.sin(Math.PI * Math.min(1, w2)), 1.25);
    let knee = Math.max(load, swing, st ? P.kneeStance : P.kneeStance + 4 * (1 - w));
    // ankle: heel strike dorsiflexed (toes up) → flat → the shin travels over the foot → heel rise / toe-off plantar-flexed → dorsiflexed for clearance
    let ank; if (st) { ank = s < 0.22 ? lerp(-P.ankleHS, 0, s / 0.22) : s < 0.62 ? lerp(0, -8, (s - 0.22) / 0.40) : lerp(-8, P.ankleTO, smooth01((s - 0.62) / 0.38)); }
    else ank = w < 0.45 ? lerp(P.ankleTO, -6, smooth01(w / 0.45)) : lerp(-6, -P.ankleHS, smooth01((w - 0.45) / 0.55));
    const toe = st && s > 0.66 ? -P.toeOff * smooth01((s - 0.66) / 0.34) : (!st && w < 0.3 ? -P.toeOff * (1 - smooth01(w / 0.3)) : 0);   // toes extend (up relative to the foot) as the heel rises
    if (dir < 0) { hip = -hip * 0.75; knee = Math.max(P.kneeStance, knee * 0.7); ank *= 0.6; }
    pose["thigh_" + sd] = [hip, 0, (sd === "R" ? 1 : -1) * (2 + P.fwdKnee * 0.15)]; pose["shin_" + sd] = [knee, 0, 0]; pose["foot_" + sd] = [ank, 0, 0]; pose["toe_" + sd] = [toe, 0, 0];
    return { st, s, w };
  };
  const R = leg("R", u), L = leg("L", u + 0.5);
  // pelvis HEIGHT from the stance leg's own geometry: the hip sits where the authored thigh / shin angles put the sole ON the pitch (the lower
  // requirement of the two stance legs governs; the other leg's knee takes up the difference in the solve) — a walk is highest at mid-stance and
  // lowest at the double support, a run is lowest at the loading and rises through the flight (bob = the flight lift), by construction
  const flight = !(R.st || L.st); let bob = 0;                                                            // stance: set below by FK (the lowest point of the stance foot on the pitch); flight: from the take-off height to the LANDING height (the contact geometry of the landing leg) plus the gait's flight lift
  if (flight) { const f = clamp01(Math.min(R.w, L.w) * (1 - S) / Math.max(1e-3, 0.5 - S)); const th = skel.byName.thigh_R.len, sh = skel.byName.shin_R.len; const hC = -P.hipFlex * (1 - P.retract) * DEG, kC = (P.kneeStance + 4) * DEG;
    const landing = th * Math.cos(hC) + sh * Math.cos(hC + kC) + skel.ankleH - skel.hipY; bob = lerp(o.lastBob != null ? o.lastBob : landing, landing, smooth01(f)) + P.bob * kLeg * Math.sin(Math.PI * f); }
  const roll = P.roll * Math.sin(tw * u), pYaw = -P.pYaw * Math.cos(tw * u) * dir;
  const lean = (o.lean || 0) + P.lean, turnRoll = o.turnRoll || 0;
  pose.pelvis = [lean * 0.45, pYaw + (o.twist || 0) * 0.3, roll + turnRoll * 0.4]; pose.spine = [lean * 0.35, P.sYaw * Math.cos(tw * u) * dir * 0.5 + (o.twist || 0) * 0.4, -roll * 0.5 + turnRoll * 0.35]; pose.chest = [lean * 0.2, P.sYaw * Math.cos(tw * u) * dir * 0.5 + (o.twist || 0) * 0.3, -roll * 0.3 + turnRoll * 0.25];
  pose.neck = [-lean * 0.45, 0, -turnRoll * 0.3]; pose.head = [-lean * 0.35, 0, -turnRoll * 0.3];
  // arms counter-swing the legs (RIGHT arm back when the RIGHT leg is forward); the elbow closes a little more as the arm comes forward
  const aR = P.arm * Math.cos(tw * u) * dir, aL = -aR;
  pose.upperArm_R = [aR, 0, P.abd]; pose.upperArm_L = [aL, 0, -P.abd];
  pose.foreArm_R = [-P.elbow - 14 * clamp01(-aR / Math.max(1, P.arm)), 0, 0]; pose.foreArm_L = [-P.elbow - 14 * clamp01(-aL / Math.max(1, P.arm)), 0, 0];
  pose.hand_R = [-6, 0, 0]; pose.hand_L = [-6, 0, 0]; pose.clavicle_R = [0, 0, -2 * clamp01(-aR / Math.max(1, P.arm))]; pose.clavicle_L = [0, 0, 2 * clamp01(-aL / Math.max(1, P.arm))];
  pose._pelvis = [0, bob, 0];
  pose._legs = { R, L }; pose._flight = flight; pose._bob = bob;
  if (!flight) ofLocoGroundPelvis(skel, pose, R, L);                                                     // the stance foot's lowest point (heel / toe, the authored foot angle included) sits ON the pitch: pelvis height from the leg's own geometry
  return pose;
}
// FK of the pose in a canonical root; the pelvis is lowered / raised so the lowest sole point of the stance legs is at ground level (the other stance leg's knee takes the difference in the solve)
function ofLocoGroundPelvis(skel, pose, R, L) {
  const pel = skel.byName.pelvis, saved = pel.off.slice(); pel.off = [saved[0], saved[1] + (pose._pelvis ? pose._pelvis[1] : 0), saved[2]];
  const fk = skelFK(skel, pose, M4.ident()); pel.off = saved; const dem = [];
  for (const sd of ["R", "L"]) { const lg = sd === "R" ? R : L; if (!lg.st) continue; const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd]; const heel = fk.joint[fb.idx][1] - skel.ankleH, toe = fk.tip[tb.idx][1] - 0.005; const m = lg.s < 0.62 ? Math.min(heel, toe) : toe; dem.push({ m, w: clamp01(lg.s / OF_LOCO.takeoverS) }); }   // late stance: the toe is the contact (the heel is off); double support: the pelvis goes where the leg that needs it LOWEST puts it (the other leg's knee bends more in the solve)
  let low = null, est = null, wIn = 1;                                                                 // HAND-OVER: a leg that has only just entered stance takes the pelvis over gradually — a hard max steps the pelvis (and both knees) in a single tick at heel strike
  for (const d of dem) { low = low == null ? d.m : Math.max(low, d.m); if (d.w >= 1) est = est == null ? d.m : Math.max(est, d.m); wIn = Math.min(wIn, d.w); }
  if (est != null && wIn < 1) low = lerp(est, low, smooth01(wIn));
  if (low != null) { pose._pelvis = [0, (pose._pelvis ? pose._pelvis[1] : 0) - low, 0]; pose._bob = pose._pelvis[1]; }
  if (pose._pelvis[1] < -0.30 * skel.legLen) pose._pelvis[1] = -0.30 * skel.legLen;
}
function ofPoseLerp(a, b, t) { const p = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of keys) { if (k[0] === "_" || k === "name") continue; const x = a[k] || [0, 0, 0], y = b[k] || [0, 0, 0]; p[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]; } p._pelvis = V3.lerp(a._pelvis || [0, 0, 0], b._pelvis || [0, 0, 0], t); return p; }
const OF_IDLE = { name: "IDLE", pelvis: [3, 0, 0], spine: [2, 0, 0], chest: [1, 0, 0], neck: [-3, 0, 0], head: [-3, 0, 0], thigh_R: [-4, 0, 4], shin_R: [7, 0, 0], foot_R: [-3, 0, 0], thigh_L: [-4, 0, -4], shin_L: [7, 0, 0], foot_L: [-3, 0, 0], upperArm_R: [-4, 0, 9], upperArm_L: [-4, 0, -9], foreArm_R: [-24, 0, 0], foreArm_L: [-24, 0, 0], hand_R: [-6, 0, 0], hand_L: [-6, 0, 0], _pelvis: [0, -0.02, 0] };
// ══ SHARED BOOT PLAN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Where each boot is on the ground for a given stride phase, as a pure function of (phase, stance fraction, leg length). This is the ONE
// place that answers it, so the SIMULATION can decide which foot may touch the ball and when, and the PRESENTATION renders the same feet.
// Fitted to the rendered locomotion: inside the contact window (the boot near its own plant) it predicts the rendered ankle to a mean of
// 3.3 cm, p95 7.0 cm. The longitudinal offset is leg-limited, not stride-limited — hip flexion/extension caps it at the same multiple of
// leg length in every gait. RIGHT plants at phase 0, LEFT at 0.5.
const OF_BOOT = {
  fwd: 0.33,            // x legLen: the boot's forward offset from the root at its own plant (furthest ahead)
  rear: -0.52,          // x legLen: its offset at toe-off (furthest behind)
  lat: 0.198,           // x legLen: half the stance width, R positive to the player's right
  reach: 0.30,          // x legLen: how far from the ankle a boot can plausibly meet a ball (boot length + a small stretch)
  winBack: 0.14,        // contact window, in cycles BEFORE the plant (late swing: the boot is coming forward and down)
  winFwd: 0.03,         // and after it (early stance). Kept short: past its plant the boot is bearing weight and cannot be moved.
};
function ofBootAhead(u, p0, stance) {                                                             // longitudinal offset in LEG LENGTHS
  const up = (((u - p0) % 1) + 1) % 1, B = OF_BOOT;
  if (up < stance) return B.fwd + (B.rear - B.fwd) * (up / stance);                               // stance: the boot is fixed, the root runs past it
  return B.rear + (B.fwd - B.rear) * smooth01((up - stance) / (1 - stance));                      // swing: forward again to the next plant
}
// Both boots in PITCH coordinates for a root at (x, y) travelling along dir (unit). `planted` mirrors the gait's own stance test.
function ofBootPlan(phase, stance, legLen, x, y, dirX, dirY) {
  const lx = -dirY, ly = dirX, out = {};                                                          // the player's LEFT in the pitch plane
  for (const sd of ["R", "L"]) {
    const p0 = sd === "R" ? 0 : 0.5, ah = ofBootAhead(phase, p0, stance) * legLen;
    const side = (sd === "R" ? -1 : 1) * OF_BOOT.lat * legLen;                                    // R is to the player's right = -left
    const up = (((phase - p0) % 1) + 1) % 1;
    out[sd] = { x: x + dirX * ah + lx * side, y: y + dirY * ah + ly * side, ahead: ah, u: up, planted: up < stance };
  }
  return out;
}
// Is this boot inside its contact window (late swing through early stance), and how central is it in that window (1 at the plant)?
function ofBootWindow(phase, p0) {
  const up = (((phase - p0) % 1) + 1) % 1, B = OF_BOOT;
  const d = up > 0.5 ? up - 1 : up;                                                               // signed cycles from the plant
  if (d < -B.winBack || d > B.winFwd) return 0;
  return 1 - Math.abs(d) / (d < 0 ? B.winBack : B.winFwd);
}
// ── per-actor locomotion state + one tick: authoritative { x, y, vx, vy, facing } (pitch frame) → pose, root matrix, plant requests, diagnostics ──
function ofLocoMake() { return { phase: 0.08, lean: 0, roll: 0, prevV: null, prevT: null, settled: true, idleW: 1, moveDir: null, twist: 0, P: null, feet: {}, diag: {} }; }
function ofLocoTick(skel, L, sim, dt, now) {
  const v = Math.hypot(sim.vx, sim.vy), G = OF_LOCO;
  // authoritative acceleration (finite difference over the fixed step) → lean / turn roll, first-order filtered (deterministic in the fixed step)
  let aPar = 0, aLat = 0;
  if (L.prevV && L.prevT != null && now - L.prevT > 1e-6) { const dvx = (sim.vx - L.prevV[0]) / (now - L.prevT), dvy = (sim.vy - L.prevV[1]) / (now - L.prevT); const m = Math.max(v, 1e-6), ux = sim.vx / m, uy = sim.vy / m; aPar = v > 0.2 ? dvx * ux + dvy * uy : Math.hypot(dvx, dvy) * (v > 0.05 ? 1 : 0); aLat = v > 0.2 ? -(dvx * uy - dvy * ux) : 0; }
  L.prevV = [sim.vx, sim.vy]; L.prevT = now;
  const kF = 1 - Math.exp(-dt / G.leanTau);
  L.lean += (Math.max(G.leanMin, Math.min(G.leanMax, aPar * G.leanAccel)) - L.lean) * kF;
  L.roll += (Math.max(-G.rollMax, Math.min(G.rollMax, aLat * G.rollLat)) - L.roll) * kF;
  // movement direction vs facing: the legs play along the movement (or the facing when nearly still); the trunk twists toward the facing, bounded
  const P = ofLocoParams(v); L.P = P;
  const mDir = v > 0.3 ? Math.atan2(sim.vy, sim.vx) : (L.moveDir != null ? L.moveDir : sim.facing);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); let d = wrap(sim.facing - mDir);
  // the back-pedal switch has HYSTERESIS (it would otherwise chatter on the threshold) and the leg basis SLEWS to its target instead of
  // snapping: at the threshold the two candidate bases differ by backpedalDeg, and a hard switch moves the authored feet ~0.9 m in one tick
  let reverse = !!L.reverse, legYaw = mDir;
  if (v > 0.3) { const ad = Math.abs(d); reverse = reverse ? ad > G.backpedalOut * DEG : ad > G.backpedalDeg * DEG; } else reverse = false;
  L.reverse = reverse;
  if (v > 0.3 && reverse) { legYaw = sim.facing; d = 0; }                                                               // running backward relative to the facing: back-pedal along the facing
  else if (v > 0.3 && Math.abs(d) > G.twistMax * DEG) { legYaw = wrap(sim.facing - Math.sign(d) * G.twistMax * DEG); d = Math.sign(d) * G.twistMax * DEG; }   // a diagonal / lateral run: the legs lead the trunk by at most twistMax
  else if (v <= 0.3) { legYaw = sim.facing; d = 0; }                                                                    // standing: the whole body faces the facing (steps re-plant the feet)
  if (L.moveDir == null) L.moveDir = legYaw;                                                                            // presentation-only slew: the authoritative facing and velocity are untouched
  else { const dy = wrap(legYaw - L.moveDir), lim = G.legYawRate * dt; L.moveDir = wrap(L.moveDir + (Math.abs(dy) <= lim ? dy : Math.sign(dy) * lim)); }
  legYaw = L.moveDir; L.twist += (d / DEG - L.twist) * (1 - Math.exp(-dt / 0.10));
  // phase: advances by the cadence of THIS body's stride at the authoritative speed; below the idle speed it settles to a double-support phase
  const step = P.step * skel.legLen, cadence = step > 1e-6 ? v / step : 0;
  const moving = v > G.idleV;
  // THE SIMULATION OWNS THE STRIDE CLOCK when it publishes one (ptGaitStep): the boots the dribble law reasons about and the boots drawn
  // here are then the same boots by construction, and animation ON / OFF cannot diverge. Standalone scenes keep the local accumulator.
  if (sim.gaitPhase != null) { L.phase = sim.gaitPhase; L.settled = !!sim.gaitSettled; }
  else if (moving) { L.phase = (L.phase + dt * cadence / 2) % 1; L.settled = false; }
  else if (!L.settled) { const r0 = G.restPhase, cand = r0.map(r => ((r - L.phase) % 1 + 1) % 1), k = cand[0] < cand[1] ? 0 : 1, ahead = cand[k]; const adv = dt * G.settleCadence / 2; if (ahead <= adv) { L.phase = r0[k]; L.settled = true; } else L.phase = (L.phase + adv) % 1; }
  const wGait = smooth01(clamp01((v - G.idleV * 0.5) / (G.idleBlendV - G.idleV * 0.5)));                                 // idle stance ↔ gait pose
  L.idleW = 1 - wGait;
  const cyc = ofLocoCycle(skel, P, L.phase, { lean: L.lean, turnRoll: L.roll, twist: L.twist, reverse, lastBob: L.lastBob }); if (!cyc._flight) L.lastBob = cyc._bob;
  const idle = Object.assign({}, OF_IDLE, { _pelvis: V3.scale(OF_IDLE._pelvis, skel.legLen / OF_REF_LEG), pelvis: [OF_IDLE.pelvis[0] + L.lean * 0.45, L.twist * 0.3, L.roll * 0.4], spine: [OF_IDLE.spine[0] + L.lean * 0.35, L.twist * 0.4, 0], chest: [OF_IDLE.chest[0] + L.lean * 0.2, L.twist * 0.3, 0] });
  // LC-1 (anim3d/of_loco_cont.js, presentation only): the C1 gait with the physical pelvis / COM path replaces the law's pose here; the law itself
  // (cyc, which the simulation's runner legs also use) is untouched. Off: exactly the V1.3 line below.
  const contOn = typeof ofContOn === "function" && ofContOn(), gp = contOn ? ofContCycle(skel, L, P, v, sim, dt, { lean: L.lean, turnRoll: L.roll, twist: L.twist, reverse }, wGait, idle) : cyc;
  let pose = wGait >= 1 ? gp : wGait <= 0 ? idle : ofPoseLerp(idle, gp, wGait); pose._legs = cyc._legs; pose.name = wGait > 0.5 ? P.gait : "IDLE"; if (contOn) { pose._flight = cyc._flight; pose._bob = cyc._bob; }
  // plant requests: from the cycle's contact phases while moving; the idle stance points while standing (the solve steps the feet to them)
  const plants = {};
  for (const sd of ["R", "L"]) {
    const lg = cyc._legs[sd]; const inStance = lg.st && (wGait > 0 || L.settled);
    if (wGait > 0.02 && !L.settled) plants[sd] = { want: inStance, mode: inStance && lg.s > 0.64 ? "toe" : "ankle", s: inStance ? lg.s : null }, contOn && (plants[sd].loco = true);
    else plants[sd] = { want: true, mode: "ankle", s: 0.3, stance: [(sd === "R" ? 1 : -1) * G.stanceW * skel.byName.thigh_R.off[0], G.stanceZ * skel.legLen] };   // idle: a stance point in the leg frame; a foot turned out of it by the facing (or left behind by the stop) steps to it
  }
  L.diag = { v: +v.toFixed(3), gait: P.gait, gaitIdx: +P.idx.toFixed(2), lo: P.lo, hi: P.hi, t: +P.t.toFixed(2), phase: +L.phase.toFixed(3), cadence: +cadence.toFixed(2), step: +step.toFixed(3), lean: +L.lean.toFixed(1), roll: +L.roll.toFixed(1), twist: +L.twist.toFixed(1), aPar: +aPar.toFixed(2), aLat: +aLat.toFixed(2), wGait: +wGait.toFixed(2), settled: L.settled, reverse, legYaw: +(legYaw / DEG).toFixed(1), facing: +(sim.facing / DEG).toFixed(1) };
  return { pose, plants, legYaw, P, wGait };
}

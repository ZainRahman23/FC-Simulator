// ═══ physchar2/gates/v2_g1.js — V2-G1: PASSIVE physics. No controller, no balance, no support, no posture effort. ══════════════════════
// After release only gravity, inertia, the articulation (rigid joints + engine hard stops), the specified passive joint tissue (end-range
// elastic law + viscous damping, sim/v2_passive.js) and contact (turf + self) move the body. An initial condition is a pose (anatomical
// joint angles, spec/v2_pose.js), a rigid placement and a velocity field; everything after it is the solver. Shared by the Node runner
// (tools/g1_run.js) and the review page (viewer/g1.html): the same code path produces the same per-tick hash in both.
import { V, Q, hashNums, rad } from "../core/v2_math.js";
import { V2JoltWorld } from "../core/v2_jolt.js";
import { POSES, posedBodies } from "../spec/v2_pose.js";
import { decompose } from "../spec/v2_joints.js";
import { PassiveLayer } from "../sim/v2_passive.js";
import { bodyLowest, lowestOf, bootSole, hull2, insideDist, shapePenetration } from "../sim/v2_geom.js";

// ── world configuration (spec §19 / §15.4; solver iterations are chosen by the 1.5 study) ─────────────────────────────────────────────
// G1 decision C1 (2026-10-03): 60 velocity iterations is the validated V2 baseline (removes the warm-start impact injection measured at
// 10–30; ≈ +12 % solver cost). Not necessarily the production optimum.
// D2a (decided 2026-10-03): 150 velocity iterations is the G1 VALIDATION baseline — it removes the measured false hard-landing rebound
// (warm-started impulses not converged at 60: dropA 0.72 J). A validated CORRECTNESS configuration, not yet the accepted production-performance
// configuration (debt: obtain equivalent correctness more cheaply — solver / substep / contact / constraint configuration or the native path).
// History: C1 60 iterations (superseded by D2a), spec §22 1.5 set 10/15/20/30.
export const G1_WORLD = { hz: 240, coll: 1, velSteps: 150, posSteps: 2, ccd: "discrete" };
export const ITERATION_SET = [10, 15, 20, 30, 60, 150];         // spec §22 1.5 set + C1 (60) + D2a baseline (150): informational study
export const RATE_SET = [180, 240, 360, 720];                    // brief §8: bounded sensitivity around 240 Hz (720 Hz = converged reference)
export const G = 9.81;

const Rx = (d) => Q.axis([1, 0, 0], rad(d)), Ry = (d) => Q.axis([0, 1, 0], rad(d)), Rz = (d) => Q.axis([0, 0, 1], rad(d));
const mul = (...qs) => qs.reduce((a, b) => Q.norm(Q.mul(a, b)));
const both = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { r[k + "_L"] = { ...v }; r[k + "_R"] = { ...v }; } return r; };
const QS = POSES.quietStance.angles, NEUTRAL = POSES.neutral.angles;

// ── the scenarios (curated; each tests something the others do not) ───────────────────────────────────────────────────────────────────
// pose: anatomical degrees (v2_joints conventions; shoulder from the arm-hanging zero); rot: rigid rotation of the posed body about
// `pivot` ("ankles" = mid-ankle-joint point, "com"); lift: lowest collider point above the turf (m); v / w: rigid velocity field about the
// total COM (m/s, rad/s) unless vfield is given; gravity 0 + lift 2 m = isolated (no turf contact possible).
export const SCENARIOS = {
  upright: { group: "release", title: "Quiet upright release", note: "Quiet stance (knees 10°, hips 5°, ankles 5° DF, arms 6° abducted) with both boots on the turf, released from rest. Passive: the legs must buckle and the body collapse under gravity alone.",
    pose: QS, lift: 0.0005, seconds: 10 },
  leanF: { group: "release", title: "Forward lean 5°", note: "Quiet stance tilted 5° forward about the ankle line, boots on the turf, released from rest.", pose: QS, rot: Rx(5), pivot: "ankles", lift: 0.0005, seconds: 10 },
  leanB: { group: "release", title: "Backward lean 5°", note: "Quiet stance tilted 5° backward about the ankle line.", pose: QS, rot: Rx(-5), pivot: "ankles", lift: 0.0005, seconds: 10 },
  leanL: { group: "release", title: "Lateral lean 5° left", note: "Quiet stance tilted 5° to the character's LEFT about the AP axis through the mid-ankle point. Mirror of leanR.", pose: QS, rot: Rz(5), pivot: "ankles", lift: 0.0005, seconds: 10, mirrorOf: "leanR" },
  leanR: { group: "release", title: "Lateral lean 5° right", note: "Quiet stance tilted 5° to the character's RIGHT. Mirror of leanL.", pose: QS, rot: Rz(-5), pivot: "ankles", lift: 0.0005, seconds: 10, mirrorOf: "leanL" },
  perturb: { group: "release", title: "Angular perturbation", note: "Quiet stance on the turf with a modest whole-body angular velocity (0.6, 0.4, −0.5) rad/s about the COM.", pose: QS, lift: 0.0005, w: [0.6, 0.4, -0.5], seconds: 10 },
  singleLeg: { group: "release", title: "Single-support release", note: "Single-leg stance (left boot on the turf, right hip 30° / knee 60° flexed), released from rest.", pose: POSES.singleLeg.angles, lift: 0.0005, seconds: 10 },
  dropA: { group: "V1 Gate A", v1: "A", title: "Relaxed upright drop 3 cm (V1 Gate A · A)", note: "V1 A re-authored in V2 anatomical angles: standing, joints slightly relaxed (knees 4°, elbows 12°, shoulders 8° abducted, hips 4° flexed), 3 cm above the turf, released from rest.",
    pose: { ...both({ knee: { flex: 4 }, elbow: { flex: 12 }, shoulder: { abd: 8 }, hip: { flex: 4 } }) }, lift: 0.03, seconds: 10 },
  sideFirst: { group: "V1 Gate A", v1: "B", title: "Hip / side-first fall (V1 Gate A · B)", note: "V1 B re-authored: rolled 92° onto the right side, trunk bent up away from the turf, right arm 170° abducted (10° inside its limit), legs lightly flexed; 20 cm up, 0.5 m/s down.",
    pose: { lumbar: { lat: -20 }, thoracic: { lat: -15 }, hip_R: { flex: 25, abd: 10 }, knee_R: { flex: 35 }, hip_L: { flex: 60, abd: 15 }, knee_L: { flex: 70 },
      shoulder_R: { abd: 170 }, elbow_R: { flex: 70 }, shoulder_L: { flex: 40, abd: 20 }, elbow_L: { flex: 40 } }, rot: Rz(-92), pivot: "com", lift: 0.20, v: [0, -0.5, 0], seconds: 10 },
  shoulderFirst: { group: "V1 Gate A", v1: "C", title: "Shoulder / upper-body-first fall (V1 Gate A · C)", note: "V1 C re-authored: pitched 70° forward and rolled 35° right with a bend at the hips so the right shoulder / arm meets the turf first; right arm forward, left arm back; 30 cm up, (0, −0.3, 0.4) m/s.",
    pose: { hip_L: { flex: 30 }, hip_R: { flex: 20 }, knee_L: { flex: 15 }, knee_R: { flex: 30 }, shoulder_R: { flex: 60, abd: 10 }, elbow_R: { flex: 20 }, shoulder_L: { flex: -35, abd: 15 }, elbow_L: { flex: 60 },
      lumbar: { flex: 10 }, neck: { flex: -15 } }, rot: mul(Rz(-35), Rx(70)), pivot: "com", lift: 0.30, v: [0, -0.3, 0.4], seconds: 10 },
  rotating: { group: "V1 Gate A", v1: "D", title: "Rotating fall (V1 Gate A · D)", note: "V1 D re-authored: nearly upright (15° back), boots 2 cm above the turf, initial tumble + yaw ω = (1.5, 2.0, −2.5) rad/s and a drift of (1.2, 0, 0.6) m/s.",
    pose: { knee_L: { flex: 10 }, knee_R: { flex: 25 }, elbow_L: { flex: 30 }, elbow_R: { flex: 15 }, shoulder_R: { abd: 25 }, shoulder_L: { abd: 10, flex: 20 } }, rot: Rx(-15), pivot: "com", lift: 0.02, v: [1.2, 0, 0.6], w: [1.5, 2.0, -2.5], seconds: 10 },
  awkward: { group: "V1 Gate A", v1: "E", title: "Awkward asymmetric fall (V1 Gate A · E)", note: "V1 E re-authored: root turned 30° / pitched 25° / rolled −35°; right leg flexed-abducted-rotated, left extended; arms in opposite configurations; spine twisted and bent; 40 cm up with a small tumble.",
    pose: { hip_R: { flex: 70, abd: 20, rot: 15 }, hip_L: { flex: -15, abd: 10, rot: -20 }, knee_R: { flex: 90 }, knee_L: { flex: 20 }, ankle_R: { df: 15 }, ankle_L: { df: -10 },
      lumbar: { rot: 5, lat: -10, flex: 15 }, thoracic: { rot: 15 }, neck: { rot: 30, flex: 10 }, shoulder_R: { flex: 110, abd: 20, rot: 30 }, shoulder_L: { flex: -20, abd: 60, rot: -20 }, elbow_R: { flex: 80 }, elbow_L: { flex: 30 } },
    rot: mul(Ry(30), Rx(25), Rz(-35)), pivot: "com", lift: 0.40, v: [0.3, -0.5, 0.2], w: [0.5, -0.8, 0.3], seconds: 10 },
  flatSupine: { group: "impact", title: "Flat supine drop 0.5 m with roll", note: "Lying supine (face up), arms 6° abducted, horizontal, 0.5 m above the turf, rolling 2 rad/s about the long axis: flat back impact, then a supine roll.",
    pose: NEUTRAL, rot: Rx(-90), pivot: "com", lift: 0.5, w: [0, 0, 2], seconds: 10 },
  drop1m: { group: "impact", title: "Feet-first drop 1.0 m", note: "Quiet stance released with the boots 1.0 m above the turf (touchdown at 4.4 m/s): knees, ankles and hips are driven into their end range under impact.", pose: QS, lift: 1.0, seconds: 10 },
  impact15: { group: "impact", extreme: true, title: "15 m/s body into the turf (EXTREME penetration test; C7)", note: "Prone (face down), horizontal, 10 cm above the turf, every body moving at 15 m/s downward: tunnelling / first-touch test (spec 1.4).", pose: NEUTRAL, rot: Rx(90), pivot: "com", lift: 0.10, v: [0, -15, 0], seconds: 10 },
  isoMomentum: { group: "isolated", title: "Isolated: end-range release + tumble (no gravity, no contact)", note: "Gravity off, 2 m above the turf. Many joints start beyond their soft limits (knees / elbows −3° hyperextended, hips 45° abducted, shoulders 175° abducted, ankles 55° PF, lumbar 28° extended, neck 65° extended, thoracic 38° rotated) with a whole-body tumble: internal passive motion only. Momentum and energy accounting (spec 1.1).",
    pose: { ...both({ knee: { flex: -3 }, elbow: { flex: -3 }, hip: { abd: 45 }, shoulder: { abd: 175 }, ankle: { df: -55 } }), lumbar: { flex: -28 }, neck: { flex: -65 }, thoracic: { rot: 38 } },
    lift: 2.0, gravity: 0, v: [0.3, 0, -0.2], w: [0.8, -0.5, 0.6], seconds: 2 },
  isoSelfCol: { group: "isolated", title: "Isolated: self-collision at football speed (no gravity)", note: "Gravity off, 2 m up. The right leg swings across into the left leg at 15 rad/s about the right hip (boot ≈ 13 m/s) and the right arm swings into the trunk at 8 rad/s about the shoulder: non-adjacent self-contacts must occur, stop the limbs and conserve momentum.",
    pose: NEUTRAL, lift: 2.0, gravity: 0, seconds: 2, trackLegs: true,
    vfield: (spec, S, at) => { const leg = ["thigh_R", "shank_R", "foot_R"], arm = ["upperArm_R", "forearm_R"];
      const pH = at("hip_R"), pS = at("shoulder_R"), wl = [0, 0, -15], wa = [0, 0, -8];
      return spec.bodies.map((b, i) => { const c = V.add(S[i].pos, Q.rot(S[i].rot, b.comLocal));
        if (leg.includes(b.name)) return { v: V.cross(wl, V.sub(c, pH)), w: wl.slice() }; if (arm.includes(b.name)) return { v: V.cross(wa, V.sub(c, pS)), w: wa.slice() }; return { v: [0, 0, 0], w: [0, 0, 0] }; }); } },
};
// ── C7 (2026-10-03): the credible football-player HIGH-SPEED ENVELOPE (separate from the gate's extreme impact15). Speeds from football
// motion (recalled literature): match sprint peaks ≈ 9–10 m/s; instep-kick foot speed ≈ 18–24 m/s at ball contact (shank ≈ 40 rad/s);
// falls: vertical trunk / head impact ≤ ≈ 6 m/s (free fall from standing height 5.6 m/s), sliding / diving at sprint speed ≈ 9 m/s
// horizontal; jump landings ≤ ≈ 5.4 m/s (1.5 m). Requirement per test: no tunnelling, no missed collision, no catastrophic constraint failure;
// penetration is REPORTED, not banded. The ball is a separate future contact path (CCD), not tested here.
const legSwing = (w, extra = {}) => (spec, S, at) => { const leg = ["thigh_R", "shank_R", "foot_R"], pH = at("hip_R");
  return spec.bodies.map((b, i) => { const c = V.add(S[i].pos, Q.rot(S[i].rot, b.comLocal)); return leg.includes(b.name) ? { v: V.cross(w, V.sub(c, pH)), w: w.slice() } : { v: [0, 0, 0], w: [0, 0, 0] }; }); };
const footAt = (spec, S, name) => { const i = spec.bodies.findIndex(b => b.name === name); return V.add(S[i].pos, Q.rot(S[i].rot, spec.bodies[i].comLocal)); };
Object.assign(SCENARIOS, {
  hsDive: { group: "envelope", title: "Envelope: diving fall at sprint speed (9 m/s forward, 2 m/s down)", note: "Prone, arms forward, 0.35 m up, (0, −2, 9) m/s: chest / arms slide onto the turf at sprint speed.",
    pose: { ...both({ shoulder: { flex: 150 } }) }, rot: Rx(90), pivot: "com", lift: 0.35, v: [0, -2, 9], seconds: 3 },
  hsSide: { group: "envelope", title: "Envelope: sideways fall at 8 m/s (3 m/s down)", note: "Lying on the right side 0.5 m up, (8, −3, 0) m/s.", pose: NEUTRAL, rot: Rz(-90), pivot: "com", lift: 0.5, v: [8, -3, 0], seconds: 3 },
  hsHeadFirst: { group: "envelope", title: "Envelope: head-first fall (7 m/s forward, 4 m/s down)", note: "Pitched 60° forward, 0.2 m up, (0, −4, 7) m/s: head / arms / trunk hit first.", pose: QS, rot: Rx(60), pivot: "com", lift: 0.2, v: [0, -4, 7], seconds: 3 },
  hsDrop15: { group: "envelope", title: "Envelope: feet-first landing from 1.5 m (5.4 m/s)", note: "Quiet stance released with the boots 1.5 m above the turf.", pose: QS, lift: 1.5, seconds: 3 },
  hsKickTurf: { group: "envelope", title: "Envelope: kicking leg into the turf (boot ≈ 20 m/s)", note: "Left boot on the turf; the straight right leg 20° behind the hip swings forward at 22 rad/s about the right hip, so the boot strikes the turf at about 20 m/s (a scuffed kick).",
    pose: { ...both({ shoulder: { abd: 6 } }), hip_R: { flex: -20 } }, lift: 0.0005, vfield: legSwing([-22, 0, 0]), seconds: 2 },
  hsKickShin: { knownIssue: "D1a-shin", group: "envelope", title: "Envelope: kicking boot into an opponent's shin (static shin proxy, ≈ 20 m/s, no gravity)", note: "Isolated (gravity off, 2 m up) so only the limb–limb contact is tested: the straight right leg 20° behind the hip swings forward at 22 rad/s (boot ≈ 20 m/s) into a static shin-size capsule (r 5 cm, 40 cm long, vertical) in the boot's path.",
    pose: { ...both({ shoulder: { abd: 6 } }), hip_R: { flex: -20 } }, lift: 2.0, gravity: 0, vfield: legSwing([-22, 0, 0]), seconds: 1,
    obstacles: [(spec, S) => { const f = footAt(spec, S, "foot_R"); return { r: 0.05, half: 0.15, pos: [f[0], f[1] - 0.05, f[2] + 0.40], rot: [0, 0, 0, 1], what: "opponent shin proxy" }; }] },
  hsPost: { group: "envelope", title: "Envelope: sprint into a goalpost (9 m/s)", note: "Quiet stance, boots 2 cm up, (0, 0, 9) m/s into a static post (r 6 cm) 0.35 m ahead of the chest.", pose: QS, lift: 0.02, v: [0, 0, 9], seconds: 2,
    obstacles: [(spec, S) => { const t = footAt(spec, S, "thorax"); return { r: 0.06, half: 1.1, pos: [0.06, 1.2, t[2] + 0.35], rot: [0, 0, 0, 1], what: "goalpost" }; }] },
  hsSelfCol20: { group: "envelope", title: "Envelope: leg into leg at ≈ 20 m/s (no gravity)", note: "isoSelfCol with the right leg at 22 rad/s about the right hip (boot ≈ 20 m/s).", pose: NEUTRAL, lift: 2.0, gravity: 0, seconds: 1.5, trackLegs: true,
    vfield: (spec, S, at) => legSwing([0, 0, -22])(spec, S, at) },
});
export const HS_ORDER = Object.keys(SCENARIOS).filter(k => SCENARIOS[k].group === "envelope");
export const SCENARIO_ORDER = Object.keys(SCENARIOS).filter(k => SCENARIOS[k].group !== "envelope");
export const CURATED = ["upright", "leanF", "leanL", "singleLeg", "drop1m", "sideFirst", "awkward", "flatSupine", "impact15", "isoSelfCol"];
export const ESSENTIAL = ["upright", "leanF", "leanL", "singleLeg", "drop1m", "sideFirst", "awkward", "flatSupine", "isoMomentum", "isoSelfCol"];   // run on every body variant
// D4a (decided 2026-10-03) — timestep study: chaotic passive falls are compared as DISTRIBUTIONS, not single end poses. Each rate scenario runs at
// every rate as an ENSEMBLE: the nominal start + the initial lift perturbed by ±1 µm and ±10 µm (same-rate chaos spread). Key "base@eps".
export const RATE_KEYS = ["upright", "leanF", "leanB", "flatSupine", "drop1m", "sideFirst", "awkward", "isoMomentum"];
export const RATE_EPS = [0, 1e-6, -1e-6, 1e-5, -1e-5];
export const ensembleKey = (key, eps) => (eps ? `${key}@${eps}` : key);
export function ensureScenario(key) { if (SCENARIOS[key]) return SCENARIOS[key]; const m = /^(.+)@(-?[0-9.e+-]+)$/.exec(key); if (!m || !SCENARIOS[m[1]]) throw new Error("unknown scenario " + key);
  const b = SCENARIOS[m[1]], e = +m[2]; return (SCENARIOS[key] = { ...b, lift: (b.lift || 0) + e, base: m[1], eps: e, title: `${b.title} [lift ${e > 0 ? "+" : ""}${e} m]` }); }

// ── initial condition ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const comW = (spec, S, i) => V.add(S[i].pos, Q.rot(S[i].rot, spec.bodies[i].comLocal));
export function comOf(spec, S) { let m = 0, c = [0, 0, 0]; spec.bodies.forEach((b, i) => { c = V.add(c, V.sc(comW(spec, S, i), b.mass)); m += b.mass; }); return V.sc(c, 1 / m); }
const jointAt = (spec, S, name) => { const j = spec.joints.find(x => x.name === name), pb = spec.bodies[j.parentIndex]; return V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, pb.origin))); };
export function initialState(spec, sc) {
  let S = posedBodies(spec, sc.pose || {});
  if (sc.rot) { const piv = sc.pivot === "ankles" ? V.sc(V.add(jointAt(spec, S, "ankle_L"), jointAt(spec, S, "ankle_R")), 0.5) : comOf(spec, S);
    S = S.map(s => ({ pos: V.add(piv, Q.rot(sc.rot, V.sub(s.pos, piv))), rot: Q.norm(Q.mul(sc.rot, s.rot)) })); }
  const lo = lowestOf(spec, S); S = S.map(s => ({ pos: V.add(s.pos, [0, sc.lift - lo.y, 0]), rot: s.rot }));
  const com = comOf(spec, S), v0 = sc.v || [0, 0, 0], w0 = sc.w || [0, 0, 0];
  const vel = sc.vfield ? sc.vfield(spec, S, (n) => jointAt(spec, S, n)) : S.map((s, i) => ({ v: V.add(v0, V.cross(w0, V.sub(comW(spec, S, i), com))), w: w0.slice() }));
  return { S, vel, gravity: sc.gravity ?? -G, lowestBody: lo.body };
}

// ── the simulation (one scenario, one body, one configuration) ─────────────────────────────────────────────────────────────────────────
const KEYS = ["x", "y", "z"], D = 180 / Math.PI;
// PHYSICS-INTEGRITY tolerances. Investigation B introduced the rows; the flat-plane decision (2026-10-03) made 1.4m / 1.4n GATE and kept 1.2e / 1.4k
// as permanent report-only diagnostics, with every tolerance RE-ESTABLISHED from healthy flat-plane runs (k = 0, 150 iterations, non-extreme; 1,181
// development runs incl. the 600-run perturbation class — never from a failure; box-era values retained only where still comfortably valid):
//   passivityStepJ 0.05 J — healthy-plane one-step rise max 0.0011 J at 240 Hz (490 runs), 0.0067 (360), 0.0001 (480); 720 Hz flags 5 V1-matched
//     awkward ensemble members (≤ 0.21 J: an upper-arm ↔ abdomen self-contact + shoulder point-constraint convergence residual, not the turf);
//   posCorrMm 5 mm — healthy-plane teleport max 1.60 mm (all rates ≤ 1.60 mm); envelope tests report larger (hsKickShin 17.3 mm, known D1a issue);
//   turfNormalMinY 0.999 — the plane gives n_y = 1 exactly (97.6 M manifolds); 0.999 = 2.6° tilt allowance;
//   turfFaceMm 0.1 mm — healthy-plane turf-side contact points within 0.0009 mm of y = 0;
//   turfDepthMm 10 mm — the validated transient turf-penetration envelope (1.4a); healthy-plane manifold depth max 7.13 mm;
//   turfCorrMm 5 mm — healthy-plane position-solver move of a turf-touching body max 0.92 mm at 240 Hz, 1.43 mm at any rate.
export const INV_TOL = { passivityStepJ: 0.05, posCorrMm: 5, turfNormalMinY: 0.999, turfFaceMm: 0.1, turfDepthMm: 10, turfCorrMm: 5 };
export class G1Sim {
  constructor(J, spec, key, opts = {}) {
    this.J = J; this.spec = spec; this.key = key; this.sc = opts.scenario || ensureScenario(key); this.opts = opts;   // G2: a gate may pass its own scenario object
    this.cfg = Object.assign({}, G1_WORLD, opts.cfg || {}); this.dt = 1 / this.cfg.hz; this.N = Math.round((opts.seconds || this.sc.seconds) * this.cfg.hz);
    const init = initialState(spec, this.sc); this.init = init;
    const contact = { ...spec.contact, ...(this.cfg.slop != null ? { slop: this.cfg.slop } : {}), ...(this.cfg.speculative != null ? { speculative: this.cfg.speculative } : {}) };
    this.w = new V2JoltWorld(J, spec, contact, { velSteps: this.cfg.velSteps, posSteps: this.cfg.posSteps, ccd: this.cfg.ccd, warmStart: this.cfg.warmStart, pairCache: this.cfg.pairCache, manifoldReduction: this.cfg.manifoldReduction, turf: this.cfg.turf, enhancedEdge: this.cfg.enhancedEdge, contactWarmStart: this.cfg.contactWarmStart, jointOrder: this.cfg.jointOrder, jointWarmStart: this.cfg.jointWarmStart, mirrorOrder: this.cfg.mirrorOrder, gravity: init.gravity, recordContacts: true, actuators: this.cfg.actuators });
    init.S.forEach((s, i) => { this.w.setPose(i, s.pos, s.rot); this.w.setVel(i, init.vel[i].v, init.vel[i].w); });
    this.obsShape = []; this.obsState = [];
    for (const o0 of this.sc.obstacles || []) { const o = typeof o0 === "function" ? o0(spec, init.S) : o0; this.w.addStaticCapsule(o); this.obsShape.push({ type: "capsule", r: o.r, half: o.half, pos: [0, 0, 0], rot: [0, 0, 0, 1] }); this.obsState.push({ pos: o.pos, rot: o.rot || [0, 0, 0, 1] }); }
    // tracked pairs for the geometric missed-collision detector: every body vs each obstacle; the legs against each other in self-collision tests
    const bi = (n) => spec.bodies.findIndex(b => b.name === n); this.track = [];
    this.obsShape.forEach((o, k) => spec.bodies.forEach((b, i) => this.track.push([-2 - k, i, "obstacle" + k, b.name])));
    if (this.sc.trackLegs) for (const a of ["thigh_R", "shank_R", "foot_R"]) for (const b of ["thigh_L", "shank_L", "foot_L"]) this.track.push([bi(a), bi(b), a, b]);
    if (!this.track.length) this.track = null;
    this.P = new PassiveLayer(spec, this.w, { enabled: opts.passive !== false, couplings: opts.couplings !== false, ...(opts.passiveOpts || {}) });
    this.nb = spec.bodies.length; this.M = spec.bodies.reduce((s, b) => s + b.mass, 0); this.g = -init.gravity;
    this.disabled = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
    this.anchors = spec.joints.map(j => ({ p: V.sub(j.at, spec.bodies[j.parentIndex].origin), c: V.sub(j.at, spec.bodies[j.childIndex].origin) }));
    this.sole = ["foot_L", "foot_R"].map(n => { const i = spec.bodies.findIndex(b => b.name === n), s = bootSole(spec.bodies[i]); return { i, y0: s.y0, poly: hull2(s.pts) }; });
    this.n = 0; this.h = 2166136261; this.hashAt = {}; this.cpu = { step: 0, passive: 0, measure: 0 };
    this.series = opts.series ? { t: [], E: [], KE: [], PE: [], U: [], D: [], comY: [], turfPen: [], selfPen: [], sep: [], hardExc: [], P: [], L: [] } : null;
    this.A = this._acc(); this.prevQ = null; this.prevAt = null; this.Dcum = 0;
    this.footI = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n)); this.minDxFeet = Infinity;
    this.st = this.read(); this._pre();
  }
  read() { const o = []; for (let i = 0; i < this.nb; i++) o.push(this.w.read(i)); return o; }
  _acc() {
    const nj = this.spec.joints.length;
    return { finite: true, firstNaN: null, maxSpeed: 0, maxW: 0, E: [], Dstep: [], turfContactStep: [], anyContactStep: [],
      axis: this.spec.joints.map(j => [0, 1, 2].map(i => (j.locked.includes(KEYS[i]) ? null : { thMin: Infinity, thMax: -Infinity, anMin: Infinity, anMax: -Infinity, marginMin: Infinity, softExcMax: 0,
        hardSteps: 0, toggles: [], at: false, restMarginMin: Infinity, overLo: 0, overHi: 0, engineTicks: 0, engAt: false, engToggles: 0 }))),
      sepMax: 0, sepMaxAt: null, sepRest: 0, frameJumpMax: 0, frameJumpAt: null, hardExcMax: 0, hardExcAt: null, hardExcRest: 0,
      turfPenMax: 0, turfPenAt: null, turfPenRest: 0, turfManifoldMax: -1, selfPenMax: 0, selfPenAt: null, selfPenRest: 0,
      ground: {}, pairs: {}, disabledHits: 0, seq: [], restKEmax: 0, restJitter: 0, restW: [],
      soleCheck: null, P: [], L: [], com: [], Ulist: [], pAbsMax: 0, lAbsMax: 0, obst: {}, missedTurf: 0, missedTurfMax: 0, initSelfOverlap: [], track: {},
      inv: { turfInvalid: 0, turfInvalidTicks: 0, turfFirst: null, envViol: 0, envTicks: 0, envFirst: null, depthMaxMm: -Infinity, depthMaxAt: null, corrTurfMaxMm: 0, corrTurfAt: null, corrTurfBody: null, pcMaxMm: 0, pcAt: null, pcBody: null, pcOver: 0, passMax: -Infinity, passAt: null, passOver: 0, passFirst: null } };
  }
  // passive drives for the next step + measurement of the current state
  _pre() {
    let t0 = now(); this.up = this.P.compute(this.st, this.dt); this.cpu.passive += now() - t0;
    t0 = now(); this._measure(); this.cpu.measure += now() - t0;
  }
  tick() {
    if (this.n >= this.N) return false;
    let t0 = now(); this.P.apply(this.up); this.cpu.passive += now() - t0;
    t0 = now(); this.w.step(this.dt, this.cfg.coll); this.cpu.step += now() - t0;
    t0 = now(); this._contacts(this.w.contacts); this.cpu.measure += now() - t0;
    this.n++; const st0 = this.st; this.st = this.read(); this._posCorr(st0);
    const Dstep = this.P.enabled ? this.P.dampingLoss(this.st, this.dt) : 0; this.A.Dstep.push(Dstep); this.Dcum += Dstep;
    this._pre(); this._passivity(); return true;
  }
  // ── INVESTIGATION B permanent invariants (user decision 2026-10-03; observation only — never change the simulation) ──
  // (1) POSITION-SOLVER TELEPORT: Jolt integrates COM += v₁·dt and then its position solver moves bodies WITHOUT changing velocities. The
  //     displacement of each body beyond its velocity integration is that correction; a contact / joint position correction of centimetres in
  //     one step is a teleport (the one-step energy blow-up was a 76–80 mm push of a boot into the turf, at zero velocity change).
  _posCorr(st0) { const iv = this.A.inv, S = this.st, touch = this._turfTouch || new Set(); let mx = 0, who = -1, envBad = 0;
    for (let i = 0; i < S.length; i++) { const c = V.dist(S[i].com, V.add(st0[i].com, V.sc(S[i].v, this.dt))); if (c > mx) { mx = c; who = i; }
      if (touch.has(i)) { const cm = c * 1000; if (cm > iv.corrTurfMaxMm) { iv.corrTurfMaxMm = cm; iv.corrTurfAt = this.n * this.dt; iv.corrTurfBody = this.spec.bodies[i].name; }
        if (cm > INV_TOL.turfCorrMm) { envBad++; iv.envViol++; if (!iv.envFirst) iv.envFirst = { t: this.n * this.dt, kind: "position correction of a turf-touching body", body: this.spec.bodies[i].name, corrMm: +cm.toFixed(3) }; } } }
    if (envBad) iv.envTicks++;
    const mm = mx * 1000; if (mm > iv.pcMaxMm) { iv.pcMaxMm = mm; iv.pcAt = this.n * this.dt; iv.pcBody = this.spec.bodies[who].name; } if (mm > INV_TOL.posCorrMm) iv.pcOver++; }
  // (2) PASSIVITY: a passive G1 body (gravity, passive tissue, viscous damping, non-propulsive contact) may not gain mechanical energy E = KE +
  //     PE + U in any step beyond the numerical floor (INV_TOL.passivityStepJ, derived from the measured floor — not from any failure).
  _passivity() { const E = this.A.E, n = E.length - 1; if (n < 1) return; const r = E[n] - E[n - 1], iv = this.A.inv; if (r > iv.passMax) { iv.passMax = r; iv.passAt = this.n * this.dt; }
    if (r > INV_TOL.passivityStepJ) { iv.passOver++; if (!iv.passFirst) iv.passFirst = { t: this.n * this.dt, dJ: r }; } }
  run() { while (this.tick()); return this.summary(); }
  // ── per-state measurement ──
  _measure() {
    const S = this.st, spec = this.spec, A = this.A, n = this.n, t = n * this.dt, rest = n >= this.N - Math.round(0.5 * this.cfg.hz);
    const flat = []; for (const s of S) flat.push(...s.pos, ...s.rot, ...s.v, ...s.w);
    if (A.finite && !flat.every(Number.isFinite)) { A.finite = false; A.firstNaN = t; }
    this.h = hashNums(flat, this.h); if (n % 60 === 0 || n === this.N) this.hashAt[n] = this.h.toString(16).padStart(8, "0");
    // energy, momentum
    let ke = 0, pe = 0, Pm = [0, 0, 0], com = [0, 0, 0];
    S.forEach((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia, Iw = [I[0][0] * wl[0] + I[0][1] * wl[1] + I[0][2] * wl[2], I[1][0] * wl[0] + I[1][1] * wl[1] + I[1][2] * wl[2], I[2][0] * wl[0] + I[2][1] * wl[1] + I[2][2] * wl[2]];
      ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * V.dot(wl, Iw); pe += b.mass * this.g * s.com[1]; Pm = V.add(Pm, V.sc(s.v, b.mass)); com = V.add(com, V.sc(s.com, b.mass));
      A.maxSpeed = Math.max(A.maxSpeed, V.len(s.v)); A.maxW = Math.max(A.maxW, V.len(s.w)); if (n === 0) A.initMaxSpeed = Math.max(A.initMaxSpeed || 0, V.len(s.v)); });
    com = V.sc(com, 1 / this.M);
    let L = [0, 0, 0], pAbs = 0, lAbs = 0; S.forEach((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia, Il = [I[0][0] * wl[0] + I[0][1] * wl[1] + I[0][2] * wl[2], I[1][0] * wl[0] + I[1][1] * wl[1] + I[1][2] * wl[2], I[2][0] * wl[0] + I[2][1] * wl[1] + I[2][2] * wl[2]];
      const Li = V.add(V.cross(V.sub(s.com, com), V.sc(s.v, b.mass)), Q.rot(s.rot, Il)); L = V.add(L, Li); pAbs += b.mass * V.len(s.v); lAbs += V.len(Li); });
    A.pAbsMax = Math.max(A.pAbsMax, pAbs); A.lAbsMax = Math.max(A.lAbsMax, lAbs);
    const U = this.P.enabled ? this.up.U : 0, E = ke + pe + U; A.E.push(E); A.P.push(Pm); A.L.push(L); A.com.push(com); A.Ulist.push(U);
    // joints: angles, limits, separation, frame continuity
    const ev = this.up.ev; let sepMax = 0, hardExc = 0, hardWho = null, jump = 0;
    spec.joints.forEach((j, k) => {
      const a = this.anchors[k], pP = V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, a.p)), pC = V.add(S[j.childIndex].pos, Q.rot(S[j.childIndex].rot, a.c)), sep = V.dist(pP, pC);
      if (sep > sepMax) sepMax = sep; if (sep > A.sepMax) { A.sepMax = sep; A.sepMaxAt = { t, joint: j.name }; }
      const per = ev.per[k], q = per.q; if (this.prevQ) { const r = Q.mul(Q.conj(this.prevQ[k]), q), ang = 2 * Math.atan2(Math.hypot(r[0], r[1], r[2]), Math.abs(r[3])); if (ang > jump) jump = ang; if (ang > A.frameJumpMax) { A.frameJumpMax = ang; A.frameJumpAt = { t, joint: j.name }; } }
      const an = decompose(Q.norm(Q.mul(j.Cm, q))), anv = [an.tw, an.sy, an.sz];
      // hT: the passive layer's anatomical hard limits when they are pose-dependent (DIAGNOSTIC knee envelope only; absent by default)
      for (let i = 0; i < 3; i++) { const X = A.axis[k][i]; if (!X) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : j.limits.hard.lo[i], hi = hT ? hT[1] : j.limits.hard.hi[i], m = Math.min(th - lo, hi - th), soft = per.T[i] ? per.T[i].soft : [j.limits.soft.lo[i], j.limits.soft.hi[i]];
        X.thMin = Math.min(X.thMin, th); X.thMax = Math.max(X.thMax, th); const anat = anv[i] * j.def.axes[KEYS[i]].s * D; X.anMin = Math.min(X.anMin, anat); X.anMax = Math.max(X.anMax, anat);
        if (m < X.marginMin) { X.marginMin = m; X.marginAt = t; } X.softExcMax = Math.max(X.softExcMax, th - soft[1], soft[0] - th, 0);
        X.overLo = Math.max(X.overLo, lo - th); X.overHi = Math.max(X.overHi, th - hi);              // overshoot beyond the ANATOMICAL hard limit, per end
        const E = j.limits.engine || j.limits.hard, me = Math.min(th - E.lo[i], E.hi[i] - th), atEng = me < rad(0.25);   // C2: contact with the Jolt emergency stop
        if (atEng) X.engineTicks++; if (atEng !== X.engAt) { X.engToggles++; X.engAt = atEng; }
        const atHard = (j.limits.engine ? me : m) < rad(0.25); if (atHard) X.hardSteps++; if (atHard !== X.at) { X.toggles.push(n); X.at = atHard; }
        if (-m > hardExc) { hardExc = -m; hardWho = j.name + "." + j.def.axes[KEYS[i]].key; } if (rest) X.restMarginMin = Math.min(X.restMarginMin, m); }
    });
    this.prevQ = ev.per.map(p => p.q);
    if (hardExc > A.hardExcMax) { A.hardExcMax = hardExc; A.hardExcAt = t; A.hardExcWho = hardWho; }
    // turf penetration from the exact collider geometry (post-solve state)
    let pen = 0, penBody = -1; for (let i = 0; i < this.nb; i++) { const l = bodyLowest(spec.bodies[i], S[i]); if (-l.y > pen) { pen = -l.y; penBody = i; } }
    if (pen > A.turfPenMax) { A.turfPenMax = pen; A.turfPenAt = { t, body: spec.bodies[penBody].name }; }
    if (rest) { A.sepRest = Math.max(A.sepRest, sepMax); if (hardExc > A.hardExcRest) { A.hardExcRest = hardExc; A.hardExcRestWho = hardWho; } if (pen > A.turfPenRest) { A.turfPenRest = pen; A.turfPenRestBody = spec.bodies[penBody].name; }
      A.restKEmax = Math.max(A.restKEmax, ke); let wsq = 0, cnt = 0; spec.joints.forEach(j => { const wr = V.sub(S[j.childIndex].w, S[j.parentIndex].w); wsq += V.dot(wr, wr); cnt++; }); A.restW.push(Math.sqrt(wsq / cnt)); }
    if (this.key === "isoSelfCol") this.minDxFeet = Math.min(this.minDxFeet, S[this.footI[1]].com[0] - S[this.footI[0]].com[0]);
    if (this.series) { const s = this.series; s.t.push(t); s.E.push(E); s.KE.push(ke); s.PE.push(pe); s.U.push(U); s.D.push(this.Dcum); s.comY.push(com[1]); s.turfPen.push(pen); s.sep.push(sepMax); s.hardExc.push(hardExc); s.P.push(Pm); s.L.push(L); }
    this.last = { t, ke, pe, U, E, com, P: Pm, L, pen, sepMax, hardExc, jump };
  }
  // contacts reported during the step that leaves state n (pre-solve manifolds computed from state n's positions)
  _contacts(C) {
    const A = this.A, n = this.n, t = n * this.dt, rest = n >= this.N - Math.round(0.5 * this.cfg.hz), spec = this.spec; let turf = false, any = C.length > 0, selfPen = 0;
    this.lastContacts = C;
    for (const c0 of C) { let c = c0; if (c.a >= 0 && c.b < 0) c = { ...c0, a: c0.b, b: c0.a, sa: c0.sb, sb: c0.sa, ma: c0.mb, mb: c0.ma, normal: V.sc(c0.normal, -1), pts: c0.pts2, pts2: c0.pts };
      if (c.a < -1) { const b = spec.bodies[c.b].name, o = A.obst[b] || (A.obst[b] = { first: null, firstDepth: null, maxDepth: -1, steps: 0 }); o.maxDepth = Math.max(o.maxDepth, c.depth);
        if (c.depth > -0.0005) { o.steps++; if (o.first == null) { o.first = t; o.firstDepth = c.depth; } } any = true; continue; }
      if (c.a < 0) { turf = true; const b = spec.bodies[c.b].name, g = A.ground[b] || (A.ground[b] = { first: null, firstDepth: null, maxDepth: -1, steps: 0, materials: new Set() });
        g.maxDepth = Math.max(g.maxDepth, c.depth); A.turfManifoldMax = Math.max(A.turfManifoldMax, c.depth); if (c.depth > -0.0005) { g.steps++; g.materials.add(c.mb); if (g.first == null) { g.first = t; g.firstDepth = c.depth; A.seq.push({ t, who: b }); } }
        if (n === 0 && this.sc.lift < 0.002) this._sole(c); continue; }
      const a = Math.min(c.a, c.b), b = Math.max(c.a, c.b), key = a + "-" + b, nm = spec.bodies[a].name + " ↔ " + spec.bodies[b].name;
      if (this.disabled.has(key)) { A.disabledHits++; continue; }
      const p = A.pairs[nm] || (A.pairs[nm] = { first: null, firstDepth: null, maxDepth: -1, steps: 0 }); p.maxDepth = Math.max(p.maxDepth, c.depth);
      if (c.depth > -0.0005) { p.steps++; if (p.first == null) { p.first = t; p.firstDepth = c.depth; } }
      if (c.depth > selfPen) selfPen = c.depth; }
    if (selfPen > A.selfPenMax) { A.selfPenMax = selfPen; A.selfPenAt = t; } if (rest) A.selfPenRest = Math.max(A.selfPenRest, selfPen);
    A.turfContactStep.push(turf); A.anyContactStep.push(any); if (this.series) this.series.selfPen.push(selfPen);
    // (3) TURF-MANIFOLD VALIDITY (investigation B): the turf is a flat top surface, so every turf manifold's normal must point up out of it and
    //     its turf-side contact points must lie on it. A manifold built on another face of the turf box (Jolt narrow-phase failure: GJK relative
    //     termination → EPA on a 100 m-scale polytope → reversed / tilted penetration axis) is counted; zero tolerance (geometric impossibility).
    // FLAT-PLANE DECISION (2026-10-03): rows 1.4m (geometric validity: the turf-side contact points lie ON the playable surface — |y| ≤ turfFaceMm
    // and |x|, |z| ≤ the turf's half-extent — and the normal points out of it, n_y ≥ turfNormalMinY; anything else is an underside / side-face /
    // off-surface contact) and 1.4n (penetration / correction envelope: manifold depth ≤ turfDepthMm, position-solver move of a turf-touching body
    // ≤ turfCorrMm, checked in _posCorr). Violations are RECORDED with tick, body, piece and contact; no contact is ever modified or deleted.
    { const iv = A.inv, he = (this.w.turf && this.w.turf.halfExtent) || Infinity; let bad = 0, envBad = 0; this._turfTouch = new Set();
      for (const c0 of C) { if ((c0.a === -1) === (c0.b === -1) || c0.a < -1 || c0.b < -1) continue; const tf = c0.a === -1, bi = tf ? c0.b : c0.a, ny = tf ? c0.normal[1] : -c0.normal[1], pT = tf ? c0.pts : c0.pts2;
        const off = pT.some(p => Math.abs(p[1]) > INV_TOL.turfFaceMm / 1000 || Math.abs(p[0]) > he || Math.abs(p[2]) > he), dmm = c0.depth * 1000;
        if (ny < INV_TOL.turfNormalMinY || off) { bad++; if (!iv.turfFirst) iv.turfFirst = { t, body: spec.bodies[bi].name, piece: tf ? c0.sb : c0.sa, normal: (tf ? c0.normal : V.sc(c0.normal, -1)).map(x => +x.toFixed(4)), turfPointsMm: pT.map(p => p.map(x => +(x * 1000).toFixed(2))), depthMm: +dmm.toFixed(3), state: ny < INV_TOL.turfNormalMinY ? (ny < 0 ? "normal into the turf (underside / reversed)" : "normal tilted") : "contact point off the playable surface" }; }
        if (dmm > iv.depthMaxMm) { iv.depthMaxMm = dmm; iv.depthMaxAt = t; } if (dmm > INV_TOL.turfDepthMm) { envBad++; if (!iv.envFirst) iv.envFirst = { t, kind: "manifold depth", body: spec.bodies[bi].name, piece: tf ? c0.sb : c0.sa, depthMm: +dmm.toFixed(3) }; }
        if (c0.depth > -0.0005) this._turfTouch.add(bi); }
      iv.turfInvalid += bad; if (bad) iv.turfInvalidTicks++; iv.envViol += envBad; if (envBad) iv.envTicks++; }
    // C7 missed collision vs obstacles / between the legs: exact geometric overlap > slop + 2 mm on a step with no manifold for that pair
    if (this.track) { const seenPair = new Set(C.map(c => Math.min(c.a, c.b) + "|" + Math.max(c.a, c.b)));
      for (const [ka, kb, la, lb] of this.track) { const sa = ka < 0 ? [this.obsShape[-2 - ka]] : spec.bodies[ka].shapes, sb = spec.bodies[kb].shapes, stA = ka < 0 ? this.obsState[-2 - ka] : this.st[ka], stB = this.st[kb];
        let dmax = -Infinity; for (const x of sa) for (const y of sb) dmax = Math.max(dmax, shapePenetration(x, stA, y, stB));
        const key = la + " ↔ " + lb, T = A.track[key] || (A.track[key] = { maxOverlapMm: -1e9, missedSteps: 0, missedMaxMm: 0 }); T.maxOverlapMm = Math.max(T.maxOverlapMm, dmax * 1000);
        if (dmax > spec.contact.slop + 0.002 && !seenPair.has(Math.min(ka, kb) + "|" + Math.max(ka, kb))) { T.missedSteps++; T.missedMaxMm = Math.max(T.missedMaxMm, dmax * 1000); } } }
    // C7 "missed collision": a body whose exact collider geometry is below the turf by more than the slop on a step where Jolt produced NO
    // turf manifold for it (the contact was never seen) — the no-tunnelling invariant of articulated player bodies
    const seen = new Set(C.filter(c => c.a === -1 || c.b === -1).map(c => (c.a === -1 ? c.b : c.a)));
    for (let i = 0; i < this.nb; i++) { const l = bodyLowest(spec.bodies[i], this.st[i]); if (-l.y > spec.contact.slop && !seen.has(i)) { A.missedTurf++; A.missedTurfMax = Math.max(A.missedTurfMax, -l.y); } }
    if (n === 0) for (const c of C) if (c.a >= 0 && c.b >= 0 && c.depth > 0.001 && !this.disabled.has(Math.min(c.a, c.b) + "-" + Math.max(c.a, c.b))) A.initSelfOverlap.push(`${spec.bodies[c.a].name}–${spec.bodies[c.b].name} ${(c.depth * 1000).toFixed(1)} mm`);
  }
  // t = 0: every turf contact of a standing release must be a boot sole contact inside the plantar outline, normal +Y. Only TOUCHING points
  // count (separation along the normal ≤ SOLE_TOUCH): a speculative point (Jolt reports points up to 20 mm apart) is not a touch — with a
  // multi-piece boot the raised toe pieces carry speculative points 11 mm above the turf at t = 0 (G1 clarification 6).
  _sole(c) {
    const SOLE_TOUCH = 0.001, sep = (k) => V.dot(V.sub(c.pts2[k], c.pts[k]), c.normal) * (c.a < 0 ? 1 : -1), touch = c.pts2.map((_, k) => k).filter(k => sep(k) <= SOLE_TOUCH);
    if (!touch.length) return;
    const S = this.st, f = this.sole.find(s => s.i === c.b), A = this.A; A.soleCheck = A.soleCheck || { contacts: 0, nonBoot: [], maxOutsideMm: 0, maxAboveSoleMm: 0, normalDevDeg: 0 };
    const sc = A.soleCheck; sc.contacts++; if (!f) { sc.nonBoot.push(this.spec.bodies[c.b].name); return; }
    sc.normalDevDeg = Math.max(sc.normalDevDeg, Math.acos(Math.min(1, Math.abs(c.normal[1]))) * D);
    for (const p of touch.map(k => c.pts2[k])) { const l = Q.rot(Q.conj(S[f.i].rot), V.sub(p, S[f.i].pos)), d = insideDist(f.poly, l[0], l[2]); sc.maxOutsideMm = Math.max(sc.maxOutsideMm, -d * 1000); sc.maxAboveSoleMm = Math.max(sc.maxAboveSoleMm, (l[1] - f.y0) * 1000); }
  }
  // ── run summary ──
  summary() {
    const A = this.A, dt = this.dt, E = A.E, N = E.length - 1, spec = this.spec, hz = this.cfg.hz;
    let maxRise = 0, maxRiseAt = null, unexplained = 0; for (let n = 0; n < N; n++) { const r = E[n + 1] - E[n]; if (r > maxRise) { maxRise = r; maxRiseAt = (n + 1) * dt; } const res = r + A.Dstep[n]; if (res > 0) unexplained += res; }
    const tc = A.turfContactStep.findIndex(Boolean), nc = tc < 0 ? N + 1 : tc;
    let mono = 0, minE = Infinity, monoAt = null; for (let n = Math.max(0, nc); n <= N; n++) { minE = Math.min(minE, E[n]); if (E[n] - minE > mono) { mono = E[n] - minE; monoAt = n * dt; } }
    // airborne (no turf manifold on the step) energy closure and free-fall acceleration: ΔE + damping = 0 and ΔP = M·g·dt when nothing but gravity acts externally
    let airClose = 0, airGain = 0, airLoss = 0, ffDev = 0, ffSteps = 0; for (let n = 0; n < N; n++) { if (!A.anyContactStep[n]) { const res = E[n + 1] - E[n] + A.Dstep[n]; airClose = Math.max(airClose, Math.abs(res)); airGain = Math.max(airGain, res); if (res < 0) airLoss += res; }
      if (A.turfContactStep[n]) continue;
      const dP = V.sub(A.P[n + 1], A.P[n]), a = V.sc(dP, 1 / (this.M * dt)); ffDev = Math.max(ffDev, V.len(V.sub(a, [0, -this.g, 0]))); ffSteps++; }
    // momentum drift (isolated): relative to the characteristic momentum Σ m_i |v_i| (max over the run) / Σ |L_i| scale
    const P0 = A.P[0], L0 = A.L[0]; let dPm = 0, dLm = 0; for (let n = 0; n <= N; n++) { dPm = Math.max(dPm, V.len(V.sub(A.P[n], P0))); dLm = Math.max(dLm, V.len(V.sub(A.L[n], L0))); }
    const axes = [];
    spec.joints.forEach((j, k) => A.axis[k].forEach((X, i) => { if (!X) return; const W = Math.round(0.5 * hz); let chat = 0; for (let a = 0, b = 0; b < X.toggles.length; b++) { while (X.toggles[b] - X.toggles[a] > W) a++; chat = Math.max(chat, b - a + 1); }
      axes.push({ joint: j.name, axis: KEYS[i], motion: `${j.def.axes[KEYS[i]].pos} / ${j.def.axes[KEYS[i]].neg}`, anMin: X.anMin, anMax: X.anMax, thMin: X.thMin * D, thMax: X.thMax * D, hardLo: j.limits.hard.lo[i] * D, hardHi: j.limits.hard.hi[i] * D,
        softLo: j.limits.soft.lo[i] * D, softHi: j.limits.soft.hi[i] * D, marginMinDeg: X.marginMin * D, marginAt: X.marginAt, softExcMaxDeg: X.softExcMax * D, hardSteps: X.hardSteps, chatterPer05s: chat, restMarginMinDeg: X.restMarginMin * D,
        overLoDeg: X.overLo * D, overHiDeg: X.overHi * D, engineTicks: X.engineTicks, engineLo: (j.limits.engine || j.limits.hard).lo[i] * D, engineHi: (j.limits.engine || j.limits.hard).hi[i] * D, sign: j.def.axes[KEYS[i]].s, key: j.def.axes[KEYS[i]].key }); }));
    const thorax = this.st[spec.bodies.findIndex(b => b.name === "thorax")], ant = Q.rot(thorax.rot, [0, 0, 1]), posture = ant[1] > 0.5 ? "supine" : ant[1] < -0.5 ? "prone" : (Q.rot(thorax.rot, [1, 0, 0])[1] > 0 ? "on left side" : "on right side");
    const firstNonFoot = A.seq.find(s => !/^foot_/.test(s.who)) || null;
    const restJitter = A.restW.length ? Math.max(...A.restW) : 0;
    return { key: this.key, human: spec.human.id, cfg: this.cfg, seconds: N * dt, ticks: N, hash: this.h.toString(16).padStart(8, "0"), hashAt: this.hashAt,
      finite: A.finite, firstNaN: A.firstNaN, maxSpeed: A.maxSpeed, maxW: A.maxW, initMaxSpeed: A.initMaxSpeed || 0, initComY: A.com[0][1],
      energy: { E0: E[0], Eend: E[N], maxRiseJ: maxRise, maxRiseAt, unexplainedJ: unexplained, firstContactT: tc < 0 ? null : tc * dt, monoViolJ: mono, monoAt, airborneClosureJ: airClose, airGainMaxJ: airGain, airLossSumJ: airLoss, dampingJ: this.Dcum, Uend: A.Ulist[N] },
      freeFall: { steps: ffSteps, maxAccDev: ffDev }, momentum: { dP: dPm, dL: dLm, P0, L0, pScale: A.pAbsMax, lScale: A.lAbsMax, dPrel: dPm / Math.max(1e-12, A.pAbsMax), dLrel: dLm / Math.max(1e-12, A.lAbsMax) },
      engine: { ticks: axes.reduce((s, a) => s + a.engineTicks, 0), axes: axes.filter(a => a.engineTicks > 0).map(a => `${a.joint}.${a.key}:${a.engineTicks}`) },
      joints: { sepMaxMm: A.sepMax * 1000, sepMaxAt: A.sepMaxAt, sepRestMm: A.sepRest * 1000, hardExcMaxDeg: A.hardExcMax * D, hardExcAt: A.hardExcAt, hardExcWho: A.hardExcWho || null, hardExcRestDeg: A.hardExcRest * D, hardExcRestWho: A.hardExcRestWho || null,
        frameJumpMaxDeg: A.frameJumpMax * D, frameJumpAt: A.frameJumpAt, chatterMax: Math.max(0, ...axes.map(a => a.chatterPer05s)), axes },
      contacts: { turfPenMaxMm: A.turfPenMax * 1000, turfPenAt: A.turfPenAt, turfPenRestMm: A.turfPenRest * 1000, turfPenRestBody: A.turfPenRestBody || null, turfManifoldMaxMm: A.turfManifoldMax * 1000,
        selfPenMaxMm: A.selfPenMax * 1000, selfPenAt: A.selfPenAt, selfPenRestMm: A.selfPenRest * 1000, disabledHits: A.disabledHits,
        ground: Object.fromEntries(Object.entries(A.ground).map(([k, g]) => [k, { first: g.first, firstDepthMm: g.firstDepth == null ? null : g.firstDepth * 1000, maxDepthMm: g.maxDepth * 1000, steps: g.steps, materials: [...g.materials] }])),
        pairs: Object.fromEntries(Object.entries(A.pairs).map(([k, p]) => [k, { first: p.first, firstDepthMm: p.firstDepth == null ? null : p.firstDepth * 1000, maxDepthMm: p.maxDepth * 1000, steps: p.steps }])),
        sequence: A.seq.slice(0, 14), soleCheck: A.soleCheck, missedTurfSteps: A.missedTurf, missedTurfMaxMm: A.missedTurfMax * 1000, initSelfOverlap: A.initSelfOverlap,
        tracked: A.track, obstacle: Object.fromEntries(Object.entries(A.obst).map(([k, o]) => [k, { first: o.first, firstDepthMm: o.firstDepth == null ? null : o.firstDepth * 1000, maxDepthMm: o.maxDepth * 1000, steps: o.steps }])) },
      rest: { KEmax: A.restKEmax, jitterRadS: restJitter },
      invariants: { tol: INV_TOL, turf: this.w.turf || null, turfInvalidManifolds: A.inv.turfInvalid, turfInvalidTicks: A.inv.turfInvalidTicks, turfInvalidFirst: A.inv.turfFirst,
        turfEnvViolations: A.inv.envViol, turfEnvTicks: A.inv.envTicks, turfEnvFirst: A.inv.envFirst, turfDepthMaxMm: A.inv.depthMaxMm, turfDepthMaxAt: A.inv.depthMaxAt, turfCorrMaxMm: A.inv.corrTurfMaxMm, turfCorrAt: A.inv.corrTurfAt, turfCorrBody: A.inv.corrTurfBody, posCorrMaxMm: A.inv.pcMaxMm, posCorrAt: A.inv.pcAt, posCorrBody: A.inv.pcBody, posCorrTicksOver: A.inv.pcOver,
        passivityMaxStepJ: A.inv.passMax, passivityMaxAt: A.inv.passAt, passivityViolations: A.inv.passOver, passivityFirst: A.inv.passFirst },
      selfCol: this.key === "isoSelfCol" || this.key === "hsSelfCol20" ? (() => { const legContact = Object.keys(A.pairs).some(k => /(thigh|shank|foot)_[LR] ↔ (thigh|shank|foot)_[LR]/.test(k) && A.pairs[k].steps > 0);
        const missed = Object.values(A.track || {}).reduce((s, t) => s + t.missedSteps, 0);   // geometric missed-collision detector (C7)
        return { minDxFeetM: this.minDxFeet, legContact, missedSteps: missed, passedThrough: !legContact || missed > 0 }; })() : null, outcome: { posture, comEnd: A.com[N], firstNonFootT: firstNonFoot ? firstNonFoot.t : null, firstNonFoot: firstNonFoot ? firstNonFoot.who : null },
      cpu: { stepMs: this.cpu.step / N, passiveMs: this.cpu.passive / (N + 1), measureMs: this.cpu.measure / (N + 1) } };
  }
  destroy() { this.w.destroy(); }
}
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
export function runScenario(J, spec, key, opts = {}) { const s = new G1Sim(J, spec, key, opts); const r = s.run(); if (opts.keepSeries) r.series = s.series; s.destroy(); return r; }

// ═══ physchar2/spec/v2_joints.js — the 13 physical joints: anatomical frames, ROM-centred constraint frames, limits, passive law ═══════
// Spec §13 (approved). Every core joint is a Jolt SixDOFConstraint: translation fixed; rotation = twist about the constraint X axis (the
// child segment's long axis) + a PYRAMID swing about Y / Z (Jolt pyramid = tan-half-angle components: θy = 2·atan2(qs.y, qs.w)).
//
// Definitions (all at the canonical pose, parent and child bodies with identity rotation):
//   A   = anatomical joint frame (columns X_a = twist axis, Y_a = positive-FLEXION axis, Z_a = X_a × Y_a), at the anatomical zero
//   Rz  = child rotation canonical → anatomical zero (identity except the shoulder: T-pose arm → arm hanging, palm medial)
//   P(a)= the V2 anatomical parameterisation in frame A: q_swing(θy, θz) · q_twist(θx) with tan-half-angle swing — this IS the V2
//         definition of anatomical joint angles (exact Euler-free for single-axis motions); frame params = signs ⊙ anatomical angles
//   Cm  = P(centre) — the ROM centre. Parent constraint frame F1 = A·Cm (fixed in the parent); child frame F2 = Rzᵀ·A (fixed in the child)
//   ⇒ constraint-space rotation q_rel = F1⁻¹·F2 = Cm⁻¹·P(a): identity at the ROM centre, Cm⁻¹ at the canonical pose (for Rz = I).
// Engine hard limits (per constraint axis) = the tight hull of every anatomical HARD extreme (single-axis extremes from the anatomical
// zero, plus listed combined extremes) mapped through q_rel — so the engine stop never undercuts an anatomical extreme (spec §13.1.4).
// Soft limits (passive-torque onset) = the same hull of the ACTIVE extremes.
import { V, Q, dsin, dcos, datan, datan2, dexp, rad, deg } from "../core/v2_math.js";

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1], NX = [-1, 0, 0], NY = [0, -1, 0], NZ = [0, 0, -1];
const SPINE_FRAME = { X: Y, Y: X };                 // twist +Y (up); flexion axis +X  (Z_a = −Z): +twist = right rotation, +Z = right bend
const LIMB_DOWN_FRAME = { X: NY, Y: NX };            // hip / shoulder (at anatomical zero) / ankle: twist −Y; flexion (or DF) axis −X (Z_a = −Z)

// motion names per frame axis [twist X, swing Y, swing Z] with the anatomical sign s (frame param = s · anatomical angle)
// rom: anatomical degrees { active: [lo, hi], hard: [lo, hi] } per axis key; centre: anatomical degrees per axis key
export const JOINT_DEFS = [
  { name: "lumbar", parent: "pelvis", child: "abdomen", anat: "L3–L5 lumbar spine (lumped)", frame: SPINE_FRAME,
    axes: { x: { key: "rot", pos: "right axial rotation", neg: "left axial rotation", s: 1 }, y: { key: "flex", pos: "flexion", neg: "extension", s: 1 }, z: { key: "lat", pos: "right lateral bend", neg: "left lateral bend", s: 1 } },
    rom: { flex: { active: [-25, 60], hard: [-30, 70] }, lat: { active: [-25, 25], hard: [-30, 30] }, rot: { active: [-7, 7], hard: [-10, 10] } },
    centre: { flex: 17.5 }, damping: 1.0, cap: "trunk", evidence: "Troke 2005 young flex 73 / ext 29 / lateral 28 / rotation 7 [H]; split of the thoracolumbar total [ENG]" },
  { name: "thoracic", parent: "abdomen", child: "thorax", anat: "T9–T12 thoracolumbar + thoracic (lumped)", frame: SPINE_FRAME,
    axes: { x: { key: "rot", pos: "right axial rotation", neg: "left axial rotation", s: 1 }, y: { key: "flex", pos: "flexion", neg: "extension", s: 1 }, z: { key: "lat", pos: "right lateral bend", neg: "left lateral bend", s: 1 } },
    rom: { flex: { active: [-15, 30], hard: [-20, 40] }, lat: { active: [-20, 20], hard: [-25, 25] }, rot: { active: [-35, 35], hard: [-40, 40] } },
    centre: { flex: 7.5 }, damping: 1.0, cap: "trunk", evidence: "AAOS thoracolumbar totals 80 / 25 / 35 / 45 (recalled) minus lumbar [ENG]" },
  { name: "neck", parent: "thorax", child: "head", anat: "C0–C7 cervical spine lumped at C7/T1", frame: SPINE_FRAME,
    axes: { x: { key: "rot", pos: "right axial rotation", neg: "left axial rotation", s: 1 }, y: { key: "flex", pos: "flexion", neg: "extension", s: 1 }, z: { key: "lat", pos: "right lateral bend", neg: "left lateral bend", s: 1 } },
    rom: { flex: { active: [-60, 50], hard: [-70, 60] }, lat: { active: [-40, 40], hard: [-45, 45] }, rot: { active: [-70, 70], hard: [-80, 80] } },
    centre: { flex: -5 }, damping: 0.3, cap: "neck", evidence: "AAOS / Youdas (recalled); 73 % of axial rotation at C1–C2 (Zhou 2020) [H]" },
  ...["L", "R"].map(s => ({ name: "shoulder_" + s, side: s, parent: "thorax", child: "upperArm_" + s, anat: "glenohumeral + girdle (lumped; centre fixed in the thorax)", frame: LIMB_DOWN_FRAME,
    zeroFromCanonical: { axis: Z, deg: s === "R" ? -90 : 90 },     // T-pose arm → arm hanging, palm medial (the anatomical zero)
    axes: { x: { key: "rot", pos: "internal rotation", neg: "external rotation", s: s === "R" ? 1 : -1 }, y: { key: "flex", pos: "flexion", neg: "extension", s: 1 },
            z: { key: "abd", pos: "abduction", neg: "adduction", s: s === "R" ? -1 : 1 } },
    rom: { flex: { active: [-55, 170], hard: [-65, 180] }, abd: { active: [0, 170], hard: [0, 180] }, rot: { active: [-90, 70], hard: [-100, 80] } },
    combined: { active: [{ elev: 90, hAdd: 130 }], hard: [{ elev: 90, hAdd: 140 }] },   // horizontal adduction (at 90° elevation) — §13.2 row
    centre: { scapularElevation: 60, planeAnteriorOfCoronal: 30 }, damping: 0.3, cap: "shoulder",
    evidence: "Soucie 2011 flexion 168.8 [H]; AAOS ext 50–60 / abd 180 / IR 70 / ER 90 (recalled); horizontal adduction (recalled); scapulohumeral rhythm 1.25–1.7 : 1 [H]" })),
  ...["L", "R"].map(s => ({ name: "elbow_" + s, side: s, parent: "upperArm_" + s, child: "forearm_" + s, anat: "humeroulnar flexion + radioulnar pronation/supination",
    frame: s === "R" ? { X: X, Y: NY } : { X: NX, Y: Y },
    axes: { x: { key: "pron", pos: "pronation", neg: "supination", s: s === "R" ? 1 : -1 }, y: { key: "flex", pos: "flexion", neg: "hyperextension", s: 1 }, z: { key: "carry", locked: true } },
    rom: { flex: { active: [0, 145], hard: [-5, 150] }, pron: { active: [-85, 77], hard: [-90, 85] } },
    centre: { flex: 70 }, damping: 0.15, cap: "elbow", evidence: "Soucie 2011 flexion 144.6 / hyperextension 0.8; pronation 76.9 / supination 85.0 [H]" })),
  ...["L", "R"].map(s => ({ name: "hip_" + s, side: s, parent: "pelvis", child: "thigh_" + s, anat: "hip (femoral head)", frame: LIMB_DOWN_FRAME,
    axes: { x: { key: "rot", pos: "internal rotation", neg: "external rotation", s: s === "R" ? 1 : -1 }, y: { key: "flex", pos: "flexion", neg: "extension", s: 1 },
            z: { key: "abd", pos: "abduction", neg: "adduction", s: s === "R" ? -1 : 1 } },
    rom: { flex: { active: [-15, 120], hard: [-25, 140] }, abd: { active: [-25, 40], hard: [-35, 50] }, rot: { active: [-40, 30], hard: [-50, 45] } },
    centre: { flex: 52.5, abd: 7.5, rot: -5 }, damping: 0.5, cap: "hip",
    evidence: "Soucie 2011 flex 130.4 (p95 142) / ext 17.4; Roaas 1982 abd 38.8 / add 30.5; pro soccer IR 28.9, total arc 65.6 (Tak 2016) [H]" })),
  ...["L", "R"].map(s => ({ name: "knee_" + s, side: s, parent: "thigh_" + s, child: "shank_" + s, anat: "tibiofemoral flexion + tibial axial rotation",
    frame: { X: NY, Y: X },                                       // twist −Y; flexion axis +X (flexion moves the foot backward); Z_a = +Z
    axes: { x: { key: "rot", pos: "tibial internal rotation", neg: "tibial external rotation", s: s === "R" ? 1 : -1 }, y: { key: "flex", pos: "flexion", neg: "hyperextension", s: 1 }, z: { key: "varus", locked: true } },
    rom: { flex: { active: [0, 140], hard: [-5, 155] }, rot: { active: [-30, 20], hard: [-40, 30] } },
    centre: { flex: 70 }, damping: 0.3, cap: "knee",
    evidence: "Soucie 2011 flexion 137.7, hyperextension 1.2 ± 2.1 (p95 6); loaded squat 157 (Hemmerich 2006) [H]; axial rotation (recalled)" })),
  ...["L", "R"].map(s => ({ name: "ankle_" + s, side: s, parent: "shank_" + s, child: "foot_" + s, anat: "talocrural + subtalar (orthogonal approximation)", frame: LIMB_DOWN_FRAME,
    axes: { x: { key: "fabd", pos: "foot adduction (toes medial)", neg: "foot abduction", s: s === "R" ? 1 : -1, passiveOnly: true }, y: { key: "df", pos: "dorsiflexion", neg: "plantarflexion", s: 1 },
            z: { key: "inv", pos: "inversion", neg: "eversion", s: s === "R" ? 1 : -1 } },
    rom: { df: { active: [-50, 20], hard: [-60, 45] }, inv: { active: [-20, 25], hard: [-30, 35] }, fabd: { active: [-10, 10], hard: [-15, 15] } },
    centre: { df: -12.5, inv: 2.5 }, damping: 0.2, cap: "ankle",
    evidence: "Soucie 2011 DF 12.7 (NWB, knee ext) / PF 54.6; Cho 2016 DF 22.3 straight / 40.5 bent; WB lunge 38.8–43.2 [H]; Roaas inv/ev 27.7 / 27.6 [H]" })),
];
// pose-dependent passive limits (spec §13.2 "pose-dependent" column): the SOFT limit of one axis depends on an adjacent joint angle.
// The engine hard limits stay fixed at the outer envelope. Parameters marked [R]/[ENG] are fitted at G1.
export const COUPLINGS = [
  { joint: "ankle", axis: "df", by: "knee.flex", law: "soft DF limit = 20° + 15°·clamp(kneeFlex/90°, 0, 1)", evidence: "[H] Cho 2016 DF 22.3° knee straight vs 40.5° knee 90°" },
  { joint: "hip", axis: "flex", by: "knee.flex", law: "soft hip-flexion limit = 80° + 40°·clamp(kneeFlex/90°, 0, 1)", evidence: "[R] straight-leg raise ≈ 70–90° (hamstrings)" },
  { joint: "knee", axis: "rot", by: "knee.flex", law: "soft axial range × clamp(kneeFlex/60°, 0.1, 1) (screw-home)", evidence: "[ENG] ≈0 at extension (recalled)" },
  { joint: "hip", axis: "rot", by: "hip.flex", law: "soft ER limit −45° (hip extended) → −40° (hip flexed 90°)", evidence: "[H] Han 2015 / Simoneau 1998 direction" },
];
export const PASSIVE = { endRangeFracOfOpposingCapacity: 0.25, B: 6.0, coulomb: 0, passiveOnlyTauAtHard: 10,
  // G3 resolution D2 (user decision 2026-10-03, DECISIONS G3-R7): NEUTRAL-ZONE stiffness of the passive-only ankle foot ab/adduction (whole-complex
  // internal / external rotation of the foot about the tibial axis). Linear inside the approved soft range (±10°), saturating beyond it
  // (constant k·θs), so the approved end-range law keeps its shape and stiffness; convex, conservative, mirror-symmetric. Historical accepted
  // baseline (G1 / G2 accepted): 0. Diagnostic override (Node only): env V2_ANKLE_NEUTRAL_K (N·m/°; 0 reproduces the historical plant).
  // STATUS (G3-R8, 2026-10-03): the evidence-preregistered k = 0.10 N·m/° was implemented and validated and caused material regressions
  // (G1 row 1.S′ and row 8 — a 720 Hz leanF member reaching a 450 J solver blow-up; G1 passive-fall postures changed in 7/74 runs; G3 rows D and I2;
  // pelvis yaw in near-single-support up ×3). Per the user's instruction it is NOT adopted: the default is the accepted historical plant (0) pending the
  // user's decision. The law stays implemented; V2_ANKLE_NEUTRAL_K selects it for diagnostics.
  ankleAxialNeutralKPerDeg: 0,   // N·m at the hard limit for the passive-only foot ab/adduction axis [ENG]
  // G1 decision C2 (2026-10-03): the ANATOMICAL END-STOP. Beyond the anatomical hard limit a stiff linear spring is added to the passive
  // potential; with it the total passive torque reaches 100 % of the opposing isometric capacity endStopDeg beyond the anatomical limit
  // [ENG: capsule / ligament / bone-contact end feel resists a maximal opposing contraction within a few degrees]. The anatomical ROM is
  // unchanged; the Jolt hard constraint becomes an emergency numerical stop at anatomical hard ± ENGINE_MARGIN (derived from overshoot tests).
  endStopDeg: 3, endStopTorqueFrac: 1.0,
  note: "τ = A·(e^{B·(θ−θ_soft)} − 1) beyond each soft limit, A chosen so τ(θ_hard) = 0.25·T_iso(opposing direction); folded into the implicit motor drive at run time (spec §13.1.5); [ENG] form after Riener & Edrich 1999 / Yoon & Mansour 1982 (recalled), parameters fitted at G1" };

// ── frame maths ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const KEYS = ["x", "y", "z"];
export function pyr(tw, sy, sz) {                                   // frame-local parameterisation (radians), V1 pc_control convention
  const qt = Q.axis(X, tw), qs = Q.norm([0, Math.abs(sy) < 1e-15 ? 0 : tanHalf(sy), Math.abs(sz) < 1e-15 ? 0 : tanHalf(sz), 1]);
  return Q.norm(Q.mul(qs, qt));
}
function tanHalf(a) { return dsin(a / 2) / dcos(a / 2); }
export function decompose(q) {                                      // Jolt swing–twist split, pyramid components (deterministic atan2)
  let [x, y, z, w] = q; if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const tl = Math.sqrt(x * x + w * w), qt = tl > 1e-15 ? [x / tl, 0, 0, w / tl] : [0, 0, 0, 1], qs = Q.mul([x, y, z, w], Q.conj(qt));
  return { tw: 2 * datan2(qt[0], qt[3]), sy: 2 * datan2(qs[1], qs[3]), sz: 2 * datan2(qs[2], qs[3]), swing: 2 * datan2(Math.sqrt(qs[1] * qs[1] + qs[2] * qs[2]), Math.abs(qs[3])) };
}
const frameQ = (fx, fy) => Q.fromAxes(fx, fy, V.cross(fx, fy));
const axisAngleDeg = (ax, d) => Q.axis(ax, rad(d));
// anatomical angles {key: deg} → frame-local rotation (the V2 anatomical parameterisation)
export function anatToFrameQ(def, a) {
  const g = (k) => { const ax = def.axes[k]; return ax && !ax.locked && a[ax.key] ? ax.s * rad(a[ax.key]) : 0; };
  return pyr(g("x"), g("y"), g("z"));
}
function centreAnat(def) {
  const c = Object.assign({}, def.centre);
  if (c.scapularElevation != null) {                                // elevation α in a plane φ anterior of coronal → flexion / abduction components
    const t = tanHalf(rad(c.scapularElevation)); c.flex = deg(2 * datan(dsin(rad(c.planeAnteriorOfCoronal)) * t)); c.abd = deg(2 * datan(dcos(rad(c.planeAnteriorOfCoronal)) * t));
    delete c.scapularElevation; delete c.planeAnteriorOfCoronal;
  }
  return c;
}
// the anatomical extreme poses that bound the engine box: single-axis extremes (axis-angle from the anatomical zero) + combined extremes
function extremePoses(def, which) {
  const poses = [];
  for (const k of KEYS) { const ax = def.axes[k]; if (!ax || ax.locked) continue; const r = def.rom[ax.key][which];
    for (const v of r) poses.push({ label: `${ax.key} ${v}`, q: axisAngleDeg(frameAxis(k), ax.s * v), single: { key: ax.key, v } }); }
  for (const c of (def.combined && def.combined[which]) || []) {     // horizontal adduction at 90° elevation: swing from the hanging arm
    const d = horizAddDir(def, c);                                     // target humerus direction in the anatomical frame
    const q = swingTo([1, 0, 0], d); poses.push({ label: `elev ${c.elev} + horizontal adduction ${c.hAdd}`, q, combined: c });
  }
  return poses;
}
const frameAxis = (k) => (k === "x" ? X : k === "y" ? Y : Z);
// humerus direction (anatomical frame: X_a = down along the arm, Y_a = flexion axis, Z_a = X_a × Y_a) after elevating to `elev` in the
// sagittal plane and then horizontally adducting by `hAdd` from the coronal (T) position toward the midline
function horizAddDir(def, c) {
  // in world terms (right side; mirrored by the signs): from the T direction (+lateral) rotate about vertical toward forward by hAdd.
  // Anatomical frame A = [X_a = down, Y_a = −X world (flexion axis), Z_a = −Z world]; express world directions in A.
  const s = def.side === "R" ? 1 : -1, h = rad(c.hAdd);
  const dw = [s * dcos(h), 0, dsin(h)];                               // horizontal plane: lateral (cos) → forward (sin) → across the body
  const A = [LIMB_DOWN_FRAME.X, LIMB_DOWN_FRAME.Y, V.cross(LIMB_DOWN_FRAME.X, LIMB_DOWN_FRAME.Y)];
  return V.norm([V.dot(dw, A[0]), V.dot(dw, A[1]), V.dot(dw, A[2])]);
}
function swingTo(from, to) { const ax = V.cross(from, to), s = V.len(ax), c = V.dot(from, to); return s < 1e-12 ? Q.id() : Q.axis(V.sc(ax, 1 / s), datan2(s, c)); }

// build the joint table for a body set (positions from the child body's origin)
export function buildJoints(bodies, margin = ENGINE_MARGIN) {
  const J = buildJointsAnatomical(bodies); if (margin) for (const j of J) j.limits.engine = engineLimits(j, margin); return J;
}
function buildJointsAnatomical(bodies) {
  const byName = Object.fromEntries(bodies.map(b => [b.name, b]));
  return JOINT_DEFS.map((def, k) => {
    const child = byName[def.child], parent = byName[def.parent];
    const A = frameQ(def.frame.X, def.frame.Y), Rz = def.zeroFromCanonical ? axisAngleDeg(def.zeroFromCanonical.axis, def.zeroFromCanonical.deg) : Q.id();
    const cA = centreAnat(def), Cm = anatToFrameQ(def, cA);
    const F1 = Q.norm(Q.mul(A, Cm)), F2 = Q.norm(Q.mul(Q.conj(Rz), A));            // world axes at the canonical pose
    const qCanon = Q.norm(Q.mul(Q.conj(F1), F2));                                   // constraint-space rotation at the canonical pose
    const relOf = (qFrame) => Q.norm(Q.mul(Q.conj(Cm), qFrame));                     // frame-local anatomical rotation → constraint space
    const hull = (which) => { const lo = { x: 0, y: 0, z: 0 }, hi = { x: 0, y: 0, z: 0 }, rows = [];
      for (const p of extremePoses(def, which)) { const d = decompose(relOf(p.q)); rows.push({ label: p.label, tw: deg(d.tw), sy: deg(d.sy), sz: deg(d.sz), swing: deg(d.swing) });
        lo.x = Math.min(lo.x, d.tw); hi.x = Math.max(hi.x, d.tw); lo.y = Math.min(lo.y, d.sy); hi.y = Math.max(hi.y, d.sy); lo.z = Math.min(lo.z, d.sz); hi.z = Math.max(hi.z, d.sz); }
      return { lo, hi, rows }; };
    const hard = hull("hard"), soft = hull("active");
    const locked = KEYS.filter(k2 => def.axes[k2] && def.axes[k2].locked), passiveOnly = KEYS.filter(k2 => def.axes[k2] && def.axes[k2].passiveOnly);
    for (const k2 of locked) { hard.lo[k2] = hard.hi[k2] = 0; soft.lo[k2] = soft.hi[k2] = 0; }
    const toV = (q, fx) => Q.rot(q, fx);
    return { index: k, name: def.name, side: def.side || null, parent: def.parent, child: def.child, parentIndex: parent.index, childIndex: child.index,
      anat: def.anat, at: child.origin.slice(), def, A, Rz, centreAnat: cA, Cm, F1, F2, qCanon,
      F1axes: { x: toV(F1, X), y: toV(F1, Y), z: toV(F1, Z) }, F2axes: { x: toV(F2, X), y: toV(F2, Y), z: toV(F2, Z) },
      anatAxes: { x: def.frame.X, y: def.frame.Y, z: V.cross(def.frame.X, def.frame.Y) },
      limits: { hard: { lo: [hard.lo.x, hard.lo.y, hard.lo.z], hi: [hard.hi.x, hard.hi.y, hard.hi.z] }, soft: { lo: [soft.lo.x, soft.lo.y, soft.lo.z], hi: [soft.hi.x, soft.hi.y, soft.hi.z] } },
      extremes: { hard: hard.rows, active: soft.rows }, locked, passiveOnly, damping: def.damping, cap: def.cap, evidence: def.evidence,
      motorAxes: KEYS.filter(k2 => def.axes[k2] && !def.axes[k2].locked && !def.axes[k2].passiveOnly) };
  });
}
// anatomical angles of a child relative to its parent from body world rotations (inverse of the parameterisation; for reporting)
export function anatomicalAngles(j, qParent, qChild) {
  const qFrame = Q.norm(Q.mul(Q.mul(Q.conj(j.A), Q.mul(Q.conj(qParent), Q.mul(qChild, Q.conj(j.Rz)))), j.A));
  const d = decompose(qFrame), out = {}, v = { x: d.tw, y: d.sy, z: d.sz };
  for (const k of KEYS) { const ax = j.def.axes[k]; if (ax && !ax.locked) out[ax.key] = deg(v[k]) * ax.s; }
  return out;
}
// child world rotation for anatomical angles (parent rotation qParent): forward kinematics through the V2 parameterisation
export function childRotation(j, qParent, a) {
  const qFrame = anatToFrameQ(j.def, a);
  return Q.norm(Q.mul(qParent, Q.mul(Q.mul(j.A, Q.mul(qFrame, Q.conj(j.A))), j.Rz)));
}
// constraint-space parameters (rad) of an anatomical pose
export const constraintParams = (j, a) => decompose(Q.norm(Q.mul(Q.conj(j.Cm), anatToFrameQ(j.def, a))));

// ── passive end-range law (per constraint axis) ─────────────────────────────────────────────────────────────────────────────────────
// capOpp(k, dir): isometric capacity (N·m) resisting an excursion past the soft limit on axis k in direction dir (+1 / −1)
const ENV_K = typeof process !== "undefined" && process.env && process.env.V2_ANKLE_NEUTRAL_K != null && process.env.V2_ANKLE_NEUTRAL_K !== "" ? +process.env.V2_ANKLE_NEUTRAL_K : null;
export const ankleNeutralKPerDeg = () => (ENV_K != null ? ENV_K : PASSIVE.ankleAxialNeutralKPerDeg);
// DIAGNOSTIC knee axial envelope (final pre-E1a §3; NOT adopted — the spec knee limits are unchanged): a literature-shaped flexion-dependent envelope
// (final_pre_e1a/literature/lit2_knee_axial.md): zero c = flex/6 (internal), width scale w = 0.55 + 0.45·clamp(flex/40°, 0, 1), soft [c − 9w, c + 4w],
// hard [c − 25w, c + 15w] (anatomical deg, + = tibial internal rotation). Selected by PassiveLayer opts.kneeEnvelope or env V2_KNEE_ENVELOPE=lit1 (Node only).
export const KNEE_ENVELOPE_LIT1 = (f) => { const c = f / 6, w = 0.55 + 0.45 * Math.min(1, Math.max(0, f / 40)); return { soft: [c - 9 * w, c + 4 * w], hard: [c - 25 * w, c + 15 * w] }; };
export const kneeEnvelopeEnv = () => (typeof process !== "undefined" && process.env && process.env.V2_KNEE_ENVELOPE === "lit1" ? KNEE_ENVELOPE_LIT1 : null);
export function passiveParams(j, capOpp) {
  return [0, 1, 2].map(i => {
    const lo = j.limits.soft.lo[i], hi = j.limits.soft.hi[i], hlo = j.limits.hard.lo[i], hhi = j.limits.hard.hi[i];
    if (j.locked.includes(KEYS[i])) return null;
    const ex = (soft, hard) => Math.max(1e-4, Math.abs(hard - soft));
    const tHi = PASSIVE.endRangeFracOfOpposingCapacity * capOpp(KEYS[i], +1), tLo = PASSIVE.endRangeFracOfOpposingCapacity * capOpp(KEYS[i], -1);
    const B = PASSIVE.B, A_hi = tHi / (dexp(B * ex(hi, hhi)) - 1), A_lo = tLo / (dexp(B * ex(lo, hlo)) - 1);
    // C2 end-stop stiffness per end: law(θh + δ) + k·δ = endStopTorqueFrac · T_opp, with T_opp = tauAtHard / endRangeFracOfOpposingCapacity
    const d = PASSIVE.endStopDeg * Math.PI / 180, f = PASSIVE.endStopTorqueFrac / PASSIVE.endRangeFracOfOpposingCapacity;
    const kStop = (t, A, softEx) => Math.max(0, (f * t - A * (dexp(B * (softEx + d)) - 1)) / d);
    const neutral = /^ankle_/.test(j.name) && j.def.axes[KEYS[i]] && j.def.axes[KEYS[i]].key === "fabd" && ankleNeutralKPerDeg() > 0 ? { kN: ankleNeutralKPerDeg() * 180 / Math.PI, c0: (lo + hi) / 2, zN: (hi - lo) / 2 } : {};
    return { soft: [lo, hi], hard: [hlo, hhi], A: [A_lo, A_hi], B, tauAtHard: [tLo, tHi], kStop: [kStop(tLo, A_lo, ex(lo, hlo)), kStop(tHi, A_hi, ex(hi, hhi))], ...neutral };
  });
}
// neutral-zone term (G3-R7): U = ½·kN·x² for |x| ≤ zN, ½·kN·zN² + kN·zN·(|x| − zN) beyond (x = θ − c0) — the same function the passive layer uses
export function neutralTerm(kN, c0, zN, th) { if (!kN) return { U: 0, tau: 0, k: 0 }; const x = th - c0, ax = Math.abs(x);
  return ax <= zN ? { U: 0.5 * kN * x * x, tau: -kN * x, k: kN } : { U: 0.5 * kN * zN * zN + kN * zN * (ax - zN), tau: -kN * zN * Math.sign(x), k: 0 }; }
export function passiveTorque(pp, theta) {          // τ (N·m) on one axis at constraint angle theta (rad); opposes the excursion
  if (!pp) return 0;
  if (pp.kN) { const { kN, c0, zN } = pp; return passiveTorque({ ...pp, kN: 0 }, theta) + neutralTerm(kN, c0, zN, theta).tau; }
  const ks = pp.kStop || [0, 0];
  if (theta > pp.soft[1]) return -pp.A[1] * (dexp(pp.B * (theta - pp.soft[1])) - 1) - (theta > pp.hard[1] ? ks[1] * (theta - pp.hard[1]) : 0);
  if (theta < pp.soft[0]) return pp.A[0] * (dexp(pp.B * (pp.soft[0] - theta)) - 1) + (theta < pp.hard[0] ? ks[0] * (pp.hard[0] - theta) : 0);
  return 0;
}
// G1 decisions C2 + D3a: emergency engine-stop margins (degrees beyond the ANATOMICAL hard limit), per joint class / anatomical axis / direction
// of motion (pos = the positive anatomical motion, neg = the negative). Measured by tools/g1_margins.js from controlled overshoot tests: margin =
// max(2°, ceil(1.5 × the largest overshoot beyond the anatomical hard limit + 1°)), observed with the C2 3° end-stop ON and the engine stop moved
// 40° out of the way, over the WHOLE G1 validation set (D3a: V2-REF + V1-matched all scenarios but the impact15 diagnostic, the four variants'
// essential scenarios, the D4a timestep ensembles at 180/240/360/720 Hz, the C7 envelope; 240 runs) at the D1a + D2a baseline (10-piece boot,
// 150 iterations). The anatomical ROM is unchanged; these are numerical emergency stops, separate from the 1.5° settled compliance tolerance.
// History: first measured on V2-REF only (three times, after each passive-drive fix); D3a widened the measured set. Raw rows: g1/json/g1_margins.json.
export const ENGINE_MARGIN = {"ankle":{"df":{"neg":17,"pos":12},"fabd":{"neg":15,"pos":26},"inv":{"neg":19,"pos":16}},"elbow":{"flex":{"neg":10,"pos":11},"pron":{"neg":12,"pos":6}},"hip":{"abd":{"neg":10,"pos":14},"flex":{"neg":9,"pos":7},"rot":{"neg":9,"pos":11}},"knee":{"flex":{"neg":9,"pos":15},"rot":{"neg":20,"pos":36}},"lumbar":{"flex":{"neg":2,"pos":12},"lat":{"neg":9,"pos":14},"rot":{"neg":8,"pos":17}},"neck":{"flex":{"neg":24,"pos":38},"lat":{"neg":10,"pos":21},"rot":{"neg":7,"pos":14}},"shoulder":{"abd":{"neg":15,"pos":2},"flex":{"neg":11,"pos":6},"rot":{"neg":2,"pos":13}},"thoracic":{"flex":{"neg":6,"pos":11},"lat":{"neg":8,"pos":6},"rot":{"neg":6,"pos":16}}};
export function engineLimits(j, margin) {
  const lo = j.limits.hard.lo.slice(), hi = j.limits.hard.hi.slice(); if (!margin) return { lo, hi };
  const cls = j.name.replace(/_[LR]$/, ""), M = margin[cls] || {};
  ["x", "y", "z"].forEach((k, i) => { const ax = j.def.axes[k]; if (!ax || ax.locked || !M[ax.key]) return; const m = M[ax.key], toHi = ax.s > 0 ? m.pos : m.neg, toLo = ax.s > 0 ? m.neg : m.pos;
    hi[i] = Math.min(hi[i] + toHi * Math.PI / 180, i === 0 ? 179 * Math.PI / 180 : 160 * Math.PI / 180); lo[i] = Math.max(lo[i] - toLo * Math.PI / 180, i === 0 ? -179 * Math.PI / 180 : -160 * Math.PI / 180); });
  return { lo, hi };
}

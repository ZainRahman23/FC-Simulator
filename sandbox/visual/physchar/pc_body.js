// ═══ physchar/pc_body.js — the PHYSICAL BODY SPEC of one player, built from that player's own rig + mesh (engine-agnostic data) ═══
// Nothing here is hard-coded body geometry: segment lengths and joint positions come from rig.json; collider sizes are FITTED to the
// player's own skinned mesh (the vertices each body actually carries); masses / COMs / inertias come from de Leva (1996) scaled to the
// player's recorded weight and stature. The spec is plain data — pc_jolt.js turns it into Jolt bodies and constraints.
//
// Body frames: every body's ORIGIN is its proximal joint (the rig bone's origin) and at bind its axes are world-aligned (+x = his right,
// +y = up, +z = forward) — exactly the rig's bone frames, so a solved body transform IS the bone's world transform (render fit = identity).
// The centre of mass is offset inside the body (Jolt OffsetCenterOfMassShape), not at the origin.
import { V, Q, pct, rad } from "./pc_math.js";

// the 14 bodies, in the order Gate A specifies (index = collision sub-group id)
export const BODY_DEFS = [
  { name: "pelvis",     bone: "pelvis",     parent: null,         bones: ["root", "pelvis"],                 seg: "lowerTrunk", kind: "box" },
  { name: "abdomen",    bone: "spine",      parent: "pelvis",     bones: ["spine"],                          seg: "midTrunk",   kind: "box" },
  { name: "chest",      bone: "chest",      parent: "abdomen",    bones: ["chest", "clavicle_R", "clavicle_L"], seg: "upperTrunk", kind: "box" },
  { name: "head",       bone: "neck",       parent: "chest",      bones: ["neck", "head", "hair"],           seg: "head",       kind: "head" },
  { name: "upperArm_L", bone: "upperArm_L", parent: "chest",      bones: ["upperArm_L"],                     seg: "upperArm",   kind: "limb", distal: "foreArm_L" },
  { name: "foreArm_L",  bone: "foreArm_L",  parent: "upperArm_L", bones: ["foreArm_L", "hand_L"],            seg: "forearmHand", kind: "forearm", distal: "hand_L" },
  { name: "upperArm_R", bone: "upperArm_R", parent: "chest",      bones: ["upperArm_R"],                     seg: "upperArm",   kind: "limb", distal: "foreArm_R" },
  { name: "foreArm_R",  bone: "foreArm_R",  parent: "upperArm_R", bones: ["foreArm_R", "hand_R"],            seg: "forearmHand", kind: "forearm", distal: "hand_R" },
  { name: "thigh_L",    bone: "thigh_L",    parent: "pelvis",     bones: ["thigh_L"],                        seg: "thigh",      kind: "limb", distal: "shin_L" },
  { name: "shin_L",     bone: "shin_L",     parent: "thigh_L",    bones: ["shin_L"],                         seg: "shank",      kind: "limb", distal: "foot_L" },
  { name: "foot_L",     bone: "foot_L",     parent: "shin_L",     bones: ["foot_L", "toe_L"],                seg: "foot",       kind: "foot", side: "L" },
  { name: "thigh_R",    bone: "thigh_R",    parent: "pelvis",     bones: ["thigh_R"],                        seg: "thigh",      kind: "limb", distal: "shin_R" },
  { name: "shin_R",     bone: "shin_R",     parent: "thigh_R",    bones: ["shin_R"],                         seg: "shank",      kind: "limb", distal: "foot_R" },
  { name: "foot_R",     bone: "foot_R",     parent: "shin_R",     bones: ["foot_R", "toe_R"],                seg: "foot",       kind: "foot", side: "R" },
];
// de Leva P. (1996) "Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters", J Biomech 29(9):1223–1230, MALE columns.
// m = mass % of body mass; L = mean segment length (mm, subjects 1.741 m / 73.0 kg); cm = CM location, % of L from the listed origin
// endpoint; r = radii of gyration, % of L, about the [sagittal (antero-posterior), transverse (medio-lateral), longitudinal] axes.
export const DE_LEVA = {
  head:       { m: 6.94,  L: 242.9, cm: 50.02, r: [30.3, 31.5, 26.1], from: "vertex → cervicale (C7)" },
  upperTrunk: { m: 15.96, L: 170.7, cm: 29.99, r: [71.6, 45.4, 65.9], from: "suprasternale → xiphoid" },
  midTrunk:   { m: 16.33, L: 215.5, cm: 45.02, r: [48.2, 38.3, 46.8], from: "xiphoid → omphalion" },
  lowerTrunk: { m: 11.17, L: 145.7, cm: 61.15, r: [61.5, 55.1, 58.7], from: "omphalion → mid-hip joint centre" },
  upperArm:   { m: 2.71,  L: 281.7, cm: 57.72, r: [28.5, 26.9, 15.8], from: "shoulder JC → elbow JC" },
  forearm:    { m: 1.62,  L: 268.9, cm: 45.74, r: [27.6, 26.5, 12.1], from: "elbow JC → wrist JC" },
  hand:       { m: 0.61,  L: 86.2,  cm: 79.00, r: [62.8, 51.3, 40.1], from: "wrist JC → 3rd metacarpale" },
  thigh:      { m: 14.16, L: 422.2, cm: 40.95, r: [32.9, 32.9, 14.9], from: "hip JC → knee JC" },
  shank:      { m: 4.33,  L: 434.0, cm: 44.59, r: [25.5, 24.9, 10.3], from: "knee JC → lateral malleolus" },
  foot:       { m: 1.37,  L: 258.1, cm: 44.15, r: [25.7, 24.5, 12.4], from: "heel → toe tip" },
};
const DE_LEVA_STATURE = 1.741;
export let HAND_SHAPE = "capsule"; export const setHandShape = (k) => { HAND_SHAPE = k; };
// ANATOMICAL JOINTS → Jolt constraints (degrees). Frames (world axes at bind): X = twist axis, Y = the first swing axis, Z = X × Y.
// Hinge: axis + the zero reference ("normal"). Signs derived for this rig (see review_artifacts/physical_character_v1/gate_a/GATE_A_REPORT.md §10): hinge angle > 0 = flexion; SixDOF swingY > 0 =
// flexion for trunk / neck (X up) but EXTENSION for hips / shoulders / ankles-plantarflexion (X down); swingZ > 0 moves a down-pointing
// segment toward +x (the player's right) — i.e. abduction for right limbs, adduction for left ones (so the left limits are mirrored).
export const JOINT_DEFS = [
  { name: "lumbar",     parent: "pelvis",     child: "abdomen",    type: "sixdof", X: [0, 1, 0], Y: [1, 0, 0], twist: [-12, 12], swingY: [-20, 45], swingZ: [-20, 20], fr: 2.0 },
  { name: "thoracic",   parent: "abdomen",    child: "chest",      type: "sixdof", X: [0, 1, 0], Y: [1, 0, 0], twist: [-30, 30], swingY: [-10, 35], swingZ: [-15, 15], fr: 2.0 },
  { name: "neck",       parent: "chest",      child: "head",       type: "sixdof", X: [0, 1, 0], Y: [1, 0, 0], twist: [-60, 60], swingY: [-45, 45], swingZ: [-40, 40], fr: 0.5 },
  { name: "shoulder_L", parent: "chest",      child: "upperArm_L", type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-70, 90], swingY: [-150, 50], swingZ: [-150, 30], fr: 0.5 },
  { name: "elbow_L",    parent: "upperArm_L", child: "foreArm_L",  type: "hinge", axis: [-1, 0, 0], normal: [0, -1, 0], range: [-2, 145], fr: 0.3 },
  { name: "shoulder_R", parent: "chest",      child: "upperArm_R", type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-90, 70], swingY: [-150, 50], swingZ: [-30, 150], fr: 0.5 },
  { name: "elbow_R",    parent: "upperArm_R", child: "foreArm_R",  type: "hinge", axis: [-1, 0, 0], normal: [0, -1, 0], range: [-2, 145], fr: 0.3 },
  { name: "hip_L",      parent: "pelvis",     child: "thigh_L",    type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-45, 45], swingY: [-120, 30], swingZ: [-45, 30], fr: 2.0 },
  { name: "knee_L",     parent: "thigh_L",    child: "shin_L",     type: "hinge", axis: [1, 0, 0], normal: [0, -1, 0], range: [-3, 140], fr: 1.0 },
  { name: "ankle_L",    parent: "shin_L",     child: "foot_L",     type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-10, 10], swingY: [-20, 50], swingZ: [-15, 35], fr: 0.5 },
  { name: "hip_R",      parent: "pelvis",     child: "thigh_R",    type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-45, 45], swingY: [-120, 30], swingZ: [-30, 45], fr: 2.0 },
  { name: "knee_R",     parent: "thigh_R",    child: "shin_R",     type: "hinge", axis: [1, 0, 0], normal: [0, -1, 0], range: [-3, 140], fr: 1.0 },
  { name: "ankle_R",    parent: "shin_R",     child: "foot_R",     type: "sixdof", X: [0, -1, 0], Y: [1, 0, 0], twist: [-10, 10], swingY: [-20, 50], swingZ: [-35, 15], fr: 0.5 },
];
// ── PHYSICAL-CHARACTER CALIBRATIONS ─────────────────────────────────────────────────────────────────────────────────────────────────
// V1   = the Gate A–C2 baseline: joint centres = the rig's bone origins, the JOINT_DEFS ROM above. Unchanged and reproducible (default).
// V1.1 = the anatomy / ROM calibration of 2026-09-30 (review_artifacts/physical_character_v1/v1_1/). Only evidence-supported changes:
//   • HIP joint centres: the Astra template hangs each leg from x = ±0.1805 (× girdle width, − hipJointNarrowingM), i.e. at 81 % of the
//     visible hip half-width → 32.3 cm apart. Adult male femoral-head centres are 90.6 mm from the pelvic midline (Bardakos & Freeman
//     2012); Hara et al. 2016 (CT, n = 157): ML = 8 + 0.086 × leg length ≈ 92 mm here; Harrington et al. 2007 ≈ 90 mm → ±0.092 m
//     (18.4 cm apart). Height and depth unchanged (0.533·H ≈ Drillis & Contini greater-trochanter height). Knees / ankles stay at the
//     mesh's ANKLE centres; the KNEE joint centre is put on the hip→ankle mechanical line (human hip–knee–ankle alignment ≈ 180 ± 3°): the
//     mesh's straight-column legs are 32 cm apart down to the feet, so keeping the mesh knee at ±0.1615 made an 8.2° varus leg whose
//     two-bone IK fought the knee hinge (quiet stance saturated ankle roll). The knee point moves 3.4 cm ALONG its flexion axis (no visual
//     effect on the hinge); the knee axis is set perpendicular to the (now straight, 4.3°-splayed) bind leg.
//   • SHOULDER joint centres: the rig's (±0.258, 1.595) lies OUTSIDE the mesh (8 cm above the deltoid cap). The humeral head of this
//     mesh: the upper-arm shaft axis (x ≈ 0.246 at y 1.40–1.45), ≈ 4.5–5 cm inside the lateral deltoid, ≈ 3–4 cm below the cap, and
//     ≈ 5–7 cm below the acromion height (0.818·H = 1.554 m) → (±0.245, 1.485).
//   • ROM: hip extension 30 → 20° (CDC / Soucie 2011 adult males 17.4°); hip ab/adduction 45 / 30° kept ANATOMICAL (the limits are
//     re-expressed about the tilted bind femur); ankle dorsiflexion 20 → 30° (a weight-bearing, knee-flexed joint: the non-weight-bearing
//     knee-extended norm is 12.7° (CDC) but the weight-bearing lunge norm is > 40°; 30° stays well inside it).
// the WORKING calibration (promoted 2026-09-30 after the V1.1 integration checkpoint: V1.1 passes representative A/B/C1/C2 with its working
// controller and valid fixtures — review_artifacts/physical_character_v1/v1_1/PROMOTION.md). V1 stays reproducible with calib "V1".
export const WORKING_CALIB = "V1.1";
export const CALIBS = {
  V1: { name: "V1" },
  "V1.1": { name: "V1.1", centres: { thigh: { x: 0.092 }, shin: { legLine: true }, upperArm: { x: 0.245, y: 1.485 } },
    rom: { hipExt: 20, hipAbd: 45, hipAdd: 30, ankleDorsi: 30 } },
};
// friction class per body (Touchline's per-pair friction policy, applied through the contact listener)
export const MATERIALS = { pairs: { "boot|turf": 0.9, "hand|turf": 0.6, "body|turf": 0.5, "body|body": 0.4, "boot|body": 0.4, "hand|body": 0.4 }, restitution: 0 };
const materialOf = (name) => /^foot_/.test(name) ? "boot" : /^foreArm_/.test(name) ? "hand" : "body";

// ── helpers: signed distance of a point to a collider (body frame), for the mesh-fit report ────────────────────────────────────────
function segClosestT(p, a, b) { const ab = V.sub(b, a), d = V.dot(ab, ab); return d < 1e-12 ? 0 : Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / d)); }
export function shapeSdf(s, p) {                                               // p in body-local coordinates
  const lp = Q.rot(Q.conj(s.rot), V.sub(p, s.pos));                              // → shape-local (shape axis = local y)
  if (s.type === "sphere") return V.len(lp) - s.r;
  if (s.type === "capsule" || s.type === "tapered") { const a = [0, s.half, 0], b = [0, -s.half, 0], t = segClosestT(lp, a, b), c = V.lerp(a, b, t);
    const r = s.type === "capsule" ? s.r : s.rTop + (s.rBot - s.rTop) * t; return V.dist(lp, c) - r; }
  if (s.type === "box") { const h = s.he, cr = s.cr, q = [Math.abs(lp[0]) - (h[0] - cr), Math.abs(lp[1]) - (h[1] - cr), Math.abs(lp[2]) - (h[2] - cr)];
    return V.len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) + Math.min(Math.max(q[0], q[1], q[2]), 0) - cr; }
  return 1e9;
}
// lowest point (world y) of a shape given the body transform — used for ground penetration
export function shapeLowestY(s, bodyPos, bodyRot) {
  const wr = Q.mul(bodyRot, s.rot), wc = V.add(bodyPos, Q.rot(bodyRot, s.pos));
  if (s.type === "sphere") return wc[1] - s.r;
  if (s.type === "capsule" || s.type === "tapered") { const ax = Q.rot(wr, [0, 1, 0]);
    const yTop = wc[1] + ax[1] * s.half, yBot = wc[1] - ax[1] * s.half; const rT = s.type === "capsule" ? s.r : s.rTop, rB = s.type === "capsule" ? s.r : s.rBot;
    return Math.min(yTop - rT, yBot - rB); }
  if (s.type === "box") { const h = V.sub(s.he, [s.cr, s.cr, s.cr]); let m = 1e9;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const c = V.add(wc, Q.rot(wr, [sx * h[0], sy * h[1], sz * h[2]])); m = Math.min(m, c[1]); }
    return m - s.cr; }
  return 1e9;
}

// ── the builder ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// rig: parsed rig.json; mesh: { positions: Float32Array, joints: Uint16Array (4/vertex), weights: Float32Array, indices: Uint32Array }
export function buildBodySpec(rig, mesh, opts) {
  const CAL = CALIBS[(opts && opts.calib) || "V1"]; if (!CAL) throw new Error("unknown calibration " + (opts && opts.calib));
  const B = {}; for (const b of rig.bones) B[b.name] = b;
  // joint centres: the rig's bone origins, except where the calibration relocates a joint centre (mirrored by side)
  const bindO = (n) => { const o = B[n].bindOrigin.slice(), m = CAL.centres && /^(thigh|shin|upperArm)_/.test(n) ? CAL.centres[n.split("_")[0]] : null;
    if (m && m.legLine) { const sd = n.slice(-2), h = bindO("thigh" + sd), a = B["foot" + sd].bindOrigin, t = (h[1] - o[1]) / (h[1] - a[1]); return [h[0] + (a[0] - h[0]) * t, o[1], h[2] + (a[2] - h[2]) * t]; }
    if (m) { const sg = n.endsWith("_R") ? 1 : -1; if (m.x != null) o[0] = sg * m.x; if (m.y != null) o[1] = m.y; if (m.z != null) o[2] = m.z; } return o; };
  const H = rig.H, W = rig.identity.weightKg, sH = H / DE_LEVA_STATURE;
  // referenced vertices, each assigned to the BODY of its dominant bone
  const boneToBody = {}; BODY_DEFS.forEach((d, i) => d.bones.forEach((bn) => { boneToBody[bn] = i; }));
  const ref = new Uint8Array(mesh.positions.length / 3); for (let i = 0; i < mesh.indices.length; i++) ref[mesh.indices[i]] = 1;
  const vertsOf = BODY_DEFS.map(() => []), boneVerts = {};
  for (let v = 0; v < ref.length; v++) { if (!ref[v]) continue; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = mesh.weights[v * 4 + k]; if (w > bw) { bw = w; bi = mesh.joints[v * 4 + k]; } }
    const bone = rig.bones[bi].name, body = boneToBody[bone]; const p = [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]];
    if (body != null) vertsOf[body].push(p); (boneVerts[bone] = boneVerts[bone] || []).push(p); }
  const bodies = BODY_DEFS.map((d, i) => {
    const o = bindO(d.bone), local = (p) => V.sub(p, o), vs = vertsOf[i].map(local);
    const DL = DE_LEVA[d.seg === "forearmHand" ? "forearm" : d.seg];
    // ── mass (de Leva fraction × the player's recorded weight) ──
    const frac = d.seg === "forearmHand" ? (DE_LEVA.forearm.m + DE_LEVA.hand.m) / 100 : DL.m / 100, mass = frac * W;
    // ── COM (body-local) and inertia about it (de Leva absolute radii × stature ratio) ──
    const k = (seg, j) => DE_LEVA[seg].r[j] / 100 * DE_LEVA[seg].L / 1000 * sH;   // radius of gyration (m)
    const vertI = (seg, m) => [m * k(seg, 1) ** 2, m * k(seg, 2) ** 2, m * k(seg, 0) ** 2];   // vertical segment: Ix = transverse (ML), Iy = longitudinal, Iz = sagittal (AP)
    let com, I, cmNote;
    // V1.1: a relocated joint centre makes the segment line (proximal → distal joint centre) non-vertical (thigh / shank 4.3°, upper arm 3°):
    // the de Leva COM lies ON that line (V1 kept it below the proximal centre — identical while the line was vertical). The inertia is left
    // diagonal in the body (world-bind) axes — the tilt adds an off-diagonal term ≈ 6 % of the transverse moment, inside the inter-subject
    // spread of de Leva's radii of gyration, and every measurement (KE, sensed angular momentum) assumes the diagonal form
    if (d.kind === "limb") { const L = V.dist(bindO(d.distal), o); com = CAL.centres ? V.sc(V.sub(bindO(d.distal), o), DL.cm / 100) : [0, -DL.cm / 100 * L, 0]; I = vertI(d.seg, mass);
      cmNote = `${DL.cm}% of the ${CAL.centres ? "joint-centre line" : "rig segment"} (${L.toFixed(3)} m) from the proximal joint`; }
    else if (d.kind === "forearm") { const lf = V.dist(bindO(d.distal), o), mf = DE_LEVA.forearm.m / 100 * W, mh = DE_LEVA.hand.m / 100 * W;
      const cf = -DE_LEVA.forearm.cm / 100 * lf, ch = -(lf + DE_LEVA.hand.cm / 100 * DE_LEVA.hand.L / 1000 * sH), c = (mf * cf + mh * ch) / (mf + mh);
      const If = vertI("forearm", mf), Ih = vertI("hand", mh), dyf = cf - c, dyh = ch - c;           // parallel axis about the composite COM (offsets along y)
      com = [0, c, 0]; I = [If[0] + mf * dyf * dyf + Ih[0] + mh * dyh * dyh, If[1] + Ih[1], If[2] + mf * dyf * dyf + Ih[2] + mh * dyh * dyh];
      cmNote = `forearm ${DE_LEVA.forearm.cm}% + hand ${DE_LEVA.hand.cm}% (de Leva hand length × stature ratio), mass-weighted`; }
    else if (d.kind === "foot") { const f = rig.feet[d.side], z0 = f.footwearMin[2], z1 = f.footwearMax[2];
      com = [0, 0.045 - f.ankle[1], z0 + DE_LEVA.foot.cm / 100 * (z1 - z0)];
      I = [mass * k("foot", 1) ** 2, mass * k("foot", 0) ** 2, mass * k("foot", 2) ** 2];               // foot lies along z: Iz = longitudinal
      cmNote = `${DE_LEVA.foot.cm}% heel→toe of the rendered boot (${(z1 - z0).toFixed(3)} m), 4.5 cm above the stud plane`; }
    else if (d.kind === "head") { const top = H - o[1]; com = [0, top * (1 - DE_LEVA.head.cm / 100), 0]; I = vertI("head", mass); cmNote = `${DE_LEVA.head.cm}% from the vertex (stature ${H} m) toward C7 (the neck joint)`; }
    else { const up = d.name === "pelvis" ? bindO("spine") : d.name === "abdomen" ? bindO("chest") : bindO("neck"), L = up[1] - o[1];
      com = [0, L * (1 - DL.cm / 100), 0]; I = vertI(d.seg, mass); cmNote = `${DL.cm}% of the rig segment (${L.toFixed(3)} m) down from its upper landmark`; }
    // ── colliders, FITTED to this body's own skinned vertices ──
    const shapes = []; let fitSet = null;
    if (d.kind === "box") {
      // trunk boxes: a HEIGHT SLICE of all torso-bone vertices (few vertices are skinned mainly to "spine"), stacked joint to joint; the
      // chest slice is kept medial of the shoulder joints (the shoulder / deltoid volume belongs to the upper-arm capsule)
      const up = d.name === "pelvis" ? bindO("spine") : d.name === "abdomen" ? bindO("chest") : bindO("neck");
      const torso = ["root", "pelvis", "spine", "chest", "clavicle_R", "clavicle_L"].flatMap(bn => boneVerts[bn] || []);
      const yLo = d.name === "pelvis" ? pct((boneVerts.pelvis || []).map(p => p[1]), 3) : o[1], yHi = up[1];
      const shX = Math.abs(B.upperArm_R.bindOrigin[0]) - 0.03;   // the VISIBLE shoulder (rig), not the V1.1 joint centre
      const sl = torso.filter(p => p[1] >= yLo && p[1] <= yHi && (d.name !== "chest" || Math.abs(p[0]) <= shX)).map(local);
      const xs = sl.map(p => p[0]), zs = sl.map(p => p[2]);
      const x0 = pct(xs, 4), x1 = pct(xs, 96), z0 = pct(zs, 4), z1 = pct(zs, 96), y0 = yLo - o[1], y1 = yHi - o[1];
      const he = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2], cr = Math.min(0.04, 0.4 * Math.min(...he));
      shapes.push({ type: "box", pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], rot: Q.id(), he, cr }); fitSet = sl;
    } else if (d.kind === "limb" || d.kind === "forearm") {
      // limbs: a tapered capsule whose axis runs through the CROSS-SECTION CENTROIDS of the limb's own vertices (upper and lower windows of
      // the segment), not the bone line — the calf sits behind the tibia, so a bone-line capsule left the calf mesh 2–3 cm below the turf;
      // radii = the 80th-percentile distance to that axis (joint bulges, loose shorts / sleeve hems and the shoulder cap excluded by the windows)
      // V1.1: a limb whose joint centre was relocated (thigh, shank, upper arm) keeps its V1 collider exactly — fitted along the RIG segment
      // (the visible limb) and only re-expressed about the new joint centre. Colliders describe the visible body; only joint centres, COMs
      // and ROM are anatomical. (Fitting along the new centre line slid the fit windows: the 11 cm shorter shoulder→elbow line gave a
      // thinner, shorter capsule covering 65 % of the arm's vertices instead of 79 %.)
      const rigFit = !!(CAL.centres && /^(thigh|shin|upperArm)_/.test(d.bone)), oF = rigFit ? B[d.bone].bindOrigin : o, dF = V.sub(oF, o);
      const e = rigFit ? B[d.distal].bindOrigin : bindO(d.distal), ax = V.norm(V.sub(e, oF)), L = V.dist(e, oF);
      const segVs = rigFit ? vs.map(p => V.sub(p, dF)) : (d.kind === "forearm" ? (boneVerts[d.bone] || []).map(local) : vs);
      const pv = segVs.map(p => { const t = V.dot(p, ax) / L; return { t, off: V.sub(p, V.sc(ax, t * L)) }; });
      const winT = pv.filter(v => v.t > 0.2 && v.t < 0.45), winB = pv.filter(v => v.t > 0.55 && v.t < 0.85);
      const cen = (w) => w.length ? V.sc(w.reduce((acc, v) => V.add(acc, v.off), [0, 0, 0]), 1 / w.length) : [0, 0, 0];
      const cT = cen(winT), cB = cen(winB), offAt = (t) => V.lerp(cT, cB, Math.max(0, Math.min(1, (t - 0.325) / 0.375)));
      const rTop = pct(winT.map(v => V.dist(v.off, offAt(v.t))), 80), rBot = pct(winB.map(v => V.dist(v.off, offAt(v.t))), 80);
      const t0 = Math.max(0, pct(pv.map(v => v.t), 1)) * L + rTop, t1 = Math.min(1.02, pct(pv.map(v => v.t), 99)) * L - rBot;
      const a = Math.min(t0, t1), b = Math.max(t0, t1);
      const pTop = V.add(V.sc(ax, a), offAt(a / L)), pBot = V.add(V.sc(ax, b), offAt(b / L)), yl = V.norm(V.sub(pTop, pBot));   // shape local +y: distal → proximal
      const xl = V.norm(V.cross(yl, [0, 0, 1])), rot = Q.fromAxes(xl, yl, V.cross(xl, yl));
      shapes.push({ type: "tapered", pos: V.add(V.sc(V.add(pTop, pBot), 0.5), dF), rot, half: Math.max(0.01, V.dist(pTop, pBot) / 2), rTop, rBot });
      if (d.kind === "forearm") {                                                   // + the hand: a flat BOX fitted to the hand's own vertices (a capsule on
        const hv = (boneVerts[d.distal] || []).map(local);                          //   the bone line left a flat hand 30–35 mm below the turf at rest)
        const lo = [0, 1, 2].map(k => pct(hv.map(p => p[k]), 3)), hi = [0, 1, 2].map(k => pct(hv.map(p => p[k]), 97));
        const he = V.sc(V.sub(hi, lo), 0.5), c = V.sc(V.add(lo, hi), 0.5);
        if (HAND_SHAPE === "box") shapes.push({ type: "box", pos: c, rot: Q.id(), he, cr: Math.min(0.012, 0.4 * Math.min(...he)) });
        else { const r = Math.min(he[0], he[2]) * 1.15, half = Math.max(0.01, he[1] - r * 0.5); shapes.push({ type: "capsule", pos: c, rot: Q.id(), half, r }); }   // capsule on the hand's own centre line (offset from the bone)
      }
    } else if (d.kind === "head") {
      // head: the skull (head-bone vertices, not the dense hair shell) — sphere at its bounds centre, radius = 85th-percentile distance
      const hv = (boneVerts.head || []).map(local), nv = (boneVerts.neck || []).map(local);
      const lo = [0, 1, 2].map(j => pct(hv.map(p => p[j]), 3)), hi = [0, 1, 2].map(j => pct(hv.map(p => p[j]), 97));
      const c = V.sc(V.add(lo, hi), 0.5), r = pct(hv.map(p => V.dist(p, c)), 85);
      shapes.push({ type: "sphere", pos: c, rot: Q.id(), r });
      const hj = V.sub(bindO("head"), o), nr = pct(nv.map(p => Math.sqrt(p[0] * p[0] + p[2] * p[2])), 60);
      shapes.push({ type: "capsule", pos: V.sc(hj, 0.5), rot: Q.id(), half: Math.max(0.01, hj[1] / 2), r: nr });
    } else if (d.kind === "foot") {
      const f = rig.feet[d.side], mn = V.sub(f.footwearMin, o), mx = V.sub(f.footwearMax, o);
      const heF = V.sc(V.sub(mx, mn), 0.5); if (opts && opts.diagFootWidth) heF[0] = opts.diagFootWidth / 2;   // (DIAGNOSTIC ONLY, never a calibration: a narrower boot collider)
      // ((G2b walker) DIAGNOSTIC ONLY, never a calibration: opts.diagFootToe — the boot collider's toe edge at that distance ahead of the ankle
      // (heel unchanged): a human foot's forefoot lever (MTP ≈ 0.15–0.18 m, toe tip ≈ 0.20 m) instead of the boot mesh's 0.277 m)
      let posF = V.sc(V.add(mn, mx), 0.5); if (opts && opts.diagFootToe) { const z0 = mn[2], z1 = Math.min(mx[2], opts.diagFootToe); posF = [posF[0], posF[1], (z0 + z1) / 2]; heF[2] = (z1 - z0) / 2; }
      shapes.push({ type: "box", pos: posF, rot: Q.id(), he: heF, cr: 0.01 });
    }
    // ── fit report: how well the colliders occupy the space of the mesh this body carries ──
    const fitVs = fitSet || (d.kind === "head" ? [...(boneVerts.head || []), ...(boneVerts.neck || [])].map(local) : vs);   // trunk: its height slice; head: no hair shell
    const sd = fitVs.map(p => Math.min(...shapes.map(s => shapeSdf(s, p))));
    const out = sd.filter(x => x > 0.005);
    const fit = { verts: fitVs.length, insidePct: +(100 * (1 - out.length / Math.max(1, fitVs.length))).toFixed(1), p95OutsideMm: +(1000 * pct(out.length ? out : [0], 95)).toFixed(1), maxOutsideMm: +(1000 * (out.length ? Math.max(...out) : 0)).toFixed(1) };
    return { index: i, name: d.name, bone: d.bone, parent: d.parent, parentIndex: d.parent ? BODY_DEFS.findIndex(x => x.name === d.parent) : -1, origin: o,
             mass, com, inertia: I, cmNote, seg: d.seg, shapes, fit, material: materialOf(d.name) };
  });
  // joints (engine-agnostic): world axes at bind, limits in radians; position = the child's origin
  const joints = JOINT_DEFS.map((j0) => { const j = romOf(j0, CAL, bodies), pi = bodies.findIndex(b => b.name === j.parent), ci = bodies.findIndex(b => b.name === j.child), at = bodies[ci].origin.slice();
    if (j.type === "hinge") return { ...j, parentIndex: pi, childIndex: ci, at, lo: rad(j.range[0]), hi: rad(j.range[1]) };
    const Z = V.cross(j.X, j.Y); return { ...j, Z, parentIndex: pi, childIndex: ci, at, limits: { twist: j.twist.map(rad), swingY: j.swingY.map(rad), swingZ: j.swingZ.map(rad) } }; });
  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  return { player: { id: rig.playerId, name: rig.identity.name, heightCm: rig.identity.heightCm, weightKg: W, H }, bodies, joints, totalMass, calib: CAL.name === "V1" ? undefined : { ...CAL },
           sources: { mass: "de Leva 1996 (male), fractions × identity.weightKg", inertia: "de Leva radii of gyration × de Leva mean segment length × (H / 1.741 m)", colliders: "fitted to the player's skinned mesh (dominant-bone vertices, percentiles)", rom: "AAOS / Norkin & White norms, CDC (Soucie 2011) cross-check; spine split by us" } };
}

// V1.1 ROM: a joint's limits (degrees) under a calibration. Hip ab/adduction is ANATOMICAL (about the femur's mechanical axis vertical);
// the Jolt limits are about the BIND pose, so they are shifted by the bind femur's abduction (0 in V1, 8.2° in V1.1). swingZ > 0 moves a
// down-pointing segment toward +x: abduction for the right hip, adduction for the left. Ankle swingY < 0 = dorsiflexion.
// V1.1: the bind leg is straight but splayed (feet 32 cm apart, hips 18.4 cm), so the bind is NOT anatomical neutral in the frontal plane:
// the femur is abducted by β and, with the foot flat under a shank whose top leans MEDIALLY, the ankle is INVERTED by the same splay
// (measured: the opposite lean — a stance shank whose top moves laterally over a flat foot — reads as eversion in both V1 and V1.1).
// Anatomical ab/adduction (hip) and inversion / eversion (ankle) limits are re-expressed about the bind. The knee hinge axis is
// perpendicular to the bind leg (in its frontal plane).
function romOf(j, CAL, bodies) { const r = CAL.rom; if (!r) return j; const out = { ...j };
  const splay = (side) => { const th = bodies.find(b => b.name === "thigh_" + side), ft = bodies.find(b => b.name === "foot_" + side); return Math.atan2(Math.abs(ft.origin[0]) - Math.abs(th.origin[0]), th.origin[1] - ft.origin[1]) * 180 / Math.PI; };
  if (/^hip_/.test(j.name)) { const R = j.name.endsWith("_R"), beta = splay(R ? "R" : "L");
    out.swingY = [j.swingY[0], r.hipExt]; out.swingZ = R ? [-(r.hipAdd + beta), r.hipAbd - beta] : [-(r.hipAbd - beta), r.hipAdd + beta]; out.bindAbductionDeg = +beta.toFixed(2); }
  if (/^ankle_/.test(j.name)) { const R = j.name.endsWith("_R"), g = splay(R ? "R" : "L");   // R: swingZ + = eversion; L: + = inversion
    out.swingY = [-r.ankleDorsi, j.swingY[1]]; out.swingZ = R ? [j.swingZ[0] + g, j.swingZ[1] + g] : [j.swingZ[0] - g, j.swingZ[1] - g]; out.bindInversionDeg = +g.toFixed(2); }
  if (/^knee_/.test(j.name) && CAL.centres && CAL.centres.shin) { const side = j.name.slice(-1), k = bodies.find(b => b.name === "shin_" + side), a = bodies.find(b => b.name === "foot_" + side);
    const n = V.norm(V.sub(a.origin, k.origin)); out.normal = n; out.axis = V.norm([-n[1], n[0], 0]); }        // axis = ẑ × leg (= +x in V1)
  return out; }

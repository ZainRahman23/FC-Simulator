// ═══ physchar2/spec/v2_body.js — the 14 physical rigid bodies: mass, COM, inertia (V2-G0) ═══════════════════════════════════════════
// Port of the approved calculation (calc/v2_anthro.py build_v2, pose "T"). Deterministic arithmetic only.
// Body frame: origin = the body's proximal joint centre (pelvis: mid-HJC); axes = CCS at the canonical T-pose. Inertia: de Leva radii of
// gyration × the generated segment length, principal axes on the segment (long / AP / ML); composites by the parallel-axis theorem;
// equipment as boxes or point masses. Mass properties are given to Jolt explicitly — colliders never contribute mass.
import { DE_LEVA } from "./v2_human.js";

export const BODY_ORDER = ["pelvis", "abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R",
  "thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"];   // index = Jolt collision sub-group
export const BODY_BONES = {          // semantic bones each body drives (spec §11, §9)
  pelvis: ["hips", "root(derived)"], abdomen: ["spine_01"], thorax: ["spine_02(aim)", "spine_03", "clavicle"], head: ["neck(aim)", "head"],
  upperArm: ["upperArm", "upperArm_twist"], forearm: ["lowerArm", "forearm_twist", "hand"], thigh: ["upperLeg", "thigh_twist"],
  shank: ["lowerLeg", "calf_twist"], foot: ["foot", "toe(proc)"] };

const diag = (a, b, c) => [[a, 0, 0], [0, b, 0], [0, 0, c]];
const madd = (...ms) => ms.reduce((s, m) => s.map((r, i) => r.map((x, j) => x + m[i][j])));
export const parAxis = (m, d) => { const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  return [[m * (dd - d[0] * d[0]), -m * d[0] * d[1], -m * d[0] * d[2]], [-m * d[1] * d[0], m * (dd - d[1] * d[1]), -m * d[1] * d[2]], [-m * d[2] * d[0], -m * d[2] * d[1], m * (dd - d[2] * d[2])]]; };
const boxI = (m, a, b, c) => diag(m / 12 * (b * b + c * c), m / 12 * (a * a + c * c), m / 12 * (a * a + b * b));
// segment inertia about its own COM; r = radii % of L about [AP, ML, long]; axis = the segment's long axis in the canonical pose
export function segInertia(m, L, r, axis) {
  const kAP = r[0] / 100 * L, kML = r[1] / 100 * L, kL = r[2] / 100 * L;
  if (axis === "y") return diag(m * kML * kML, m * kL * kL, m * kAP * kAP);   // vertical segment: X = ML, Y = long, Z = AP
  if (axis === "x") return diag(m * kL * kL, m * kML * kML, m * kAP * kAP);   // T-pose arm: X = long, Y = former ML, Z = AP
  if (axis === "z") return diag(m * kML * kML, m * kAP * kAP, m * kL * kL);   // foot: X = ML, Y = vertical (sagittal r), Z = long
  throw new Error("axis " + axis);
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

export function buildBodies(Lm) {
  const { H, M, P, E, sole, Ls, yA, yK, yH, yOMPH, yXYPH, ySUPR, yVERT, yCERV, ySJC, hx, sx, fl, ap } = Lm;
  const mf = (seg) => DE_LEVA[seg].m / 100 * M, cm = (seg) => DE_LEVA[seg].cm / 100, R = (seg) => DE_LEVA[seg].r;
  const B = {};
  const add = (name, o) => { B[name] = Object.assign({ name }, o); };
  // ── trunk + head ── (kit modelled as point masses at the segment COM: mass changes, COM and inertia do not)
  add("pelvis", { side: null, parent: null, joint: null, seg: "LPT", length: Ls.LPT, origin: [0, yH, 0], massBody: mf("LPT"), massEquip: E.kitLower * 0.6,
    com: [0, yOMPH - cm("LPT") * Ls.LPT, 0], inertia: segInertia(mf("LPT"), Ls.LPT, R("LPT"), "y"), equip: "shorts/socks 60 % (point mass at COM)" });
  add("abdomen", { side: null, parent: "pelvis", joint: "lumbar", seg: "MPT", length: Ls.MPT, origin: [0, yOMPH, ap.lumbar], massBody: mf("MPT"), massEquip: 0,
    com: [0, yXYPH - cm("MPT") * Ls.MPT, 0], inertia: segInertia(mf("MPT"), Ls.MPT, R("MPT"), "y") });
  add("thorax", { side: null, parent: "abdomen", joint: "thoracic", seg: "UPT", length: yCERV - yXYPH, lengthDeLeva: Ls.UPT, origin: [0, yXYPH, ap.thoracic], massBody: mf("UPT"), massEquip: E.kitUpper,
    com: [0, ySUPR - cm("UPT") * Ls.UPT, 0], inertia: segInertia(mf("UPT"), Ls.UPT, R("UPT"), "y"), equip: "shirt (point mass at COM)" });
  add("head", { side: null, parent: "thorax", joint: "neck", seg: "head", length: Ls.head, origin: [0, yCERV, ap.cervical], massBody: mf("head"), massEquip: 0,
    com: [0, yVERT - cm("head") * Ls.head, 0], inertia: segInertia(mf("head"), Ls.head, R("head"), "y") });
  // ── arms (T-pose: along ±X) ──
  for (const [side, g] of [["L", -1], ["R", 1]]) {
    const u = [g, 0, 0], sj = [g * sx, ySJC, 0], ej = add3(sj, sc3(u, Ls.upperArm)), wj = add3(ej, sc3(u, Ls.forearm));
    add("upperArm_" + side, { side, parent: "thorax", joint: "shoulder_" + side, seg: "upperArm", length: Ls.upperArm, origin: sj, distal: ej, massBody: mf("upperArm"), massEquip: 0,
      com: add3(sj, sc3(u, cm("upperArm") * Ls.upperArm)), inertia: segInertia(mf("upperArm"), Ls.upperArm, R("upperArm"), "x") });
    const mF = mf("forearm"), mH = mf("hand"), cF = add3(ej, sc3(u, cm("forearm") * Ls.forearm)), cH = add3(wj, sc3(u, cm("hand") * Ls.hand));
    const c = sc3(add3(sc3(cF, mF), sc3(cH, mH)), 1 / (mF + mH));
    const I = madd(segInertia(mF, Ls.forearm, R("forearm"), "x"), segInertia(mH, Ls.hand, R("hand"), "x"), parAxis(mF, sub3(cF, c)), parAxis(mH, sub3(cH, c)));
    add("forearm_" + side, { side, parent: "upperArm_" + side, joint: "elbow_" + side, seg: "forearm+hand", length: Ls.forearm, handLength: Ls.hand, origin: ej, distal: wj,
      massBody: mF + mH, massEquip: 0, com: c, inertia: I, handCom: cH, parts: { forearm: mF, hand: mH } });
  }
  // ── legs (vertical, parallel, no splay) ──
  for (const [side, g] of [["L", -1], ["R", 1]]) {
    const hj = [g * hx, yH, 0], kj = [g * hx, yK, 0], aj = [g * hx, yA, 0];
    add("thigh_" + side, { side, parent: "pelvis", joint: "hip_" + side, seg: "thigh", length: Ls.thigh, origin: hj, distal: kj, massBody: mf("thigh"), massEquip: E.kitLower * 0.2,
      com: [hj[0], yH - cm("thigh") * Ls.thigh, 0], inertia: segInertia(mf("thigh"), Ls.thigh, R("thigh"), "y"), equip: "shorts 20 % (point mass at COM)" });
    const mS = mf("shank"), mP = E.shinPad, cS = [kj[0], yK - cm("shank") * Ls.shank, 0], cP = [kj[0], yK - 0.55 * Ls.shank, 0.04 * H / 1.8];
    const cs = sc3(add3(sc3(cS, mS), sc3(cP, mP)), 1 / (mS + mP));
    const Is = madd(segInertia(mS, Ls.shank, R("shank"), "y"), parAxis(mS, sub3(cS, cs)), parAxis(mP, sub3(cP, cs)), boxI(mP, 0.12, 0.17, 0.01));
    add("shank_" + side, { side, parent: "thigh_" + side, joint: "knee_" + side, seg: "shank", length: Ls.shank, origin: kj, distal: aj, massBody: mS, massEquip: mP, com: cs, inertia: Is,
      comBody: cS, inertiaBody: segInertia(mS, Ls.shank, R("shank"), "y"),
      equip: "shin guard 0.12 × 0.17 × 0.01 m box on the anterior tibia" });
    const mFt = mf("foot"), mB = E.boot, aHeel = P.ankleFromHeel * fl, heelZ = -aHeel, toeZ = fl - aHeel;
    const cF = [aj[0], yA - (P.ankleH * H) * 0.60, heelZ + cm("foot") * fl];
    const bl = fl + E.bootToe + E.bootHeel, bw = P.footBreadth * H + E.bootWidthAdd;
    const cB = [aj[0], yA - (P.ankleH * H) - sole * 0.55, heelZ + 0.47 * bl - E.bootHeel];
    const cf = sc3(add3(sc3(cF, mFt), sc3(cB, mB)), 1 / (mFt + mB));
    const If = madd(segInertia(mFt, fl, R("foot"), "z"), parAxis(mFt, sub3(cF, cf)), boxI(mB, bw, 0.03, bl), parAxis(mB, sub3(cB, cf)));
    add("foot_" + side, { side, parent: "shank_" + side, joint: "ankle_" + side, seg: "foot+boot", length: fl, origin: aj, massBody: mFt, massEquip: mB, com: cf, inertia: If,
      comBody: cF, inertiaBody: segInertia(mFt, fl, R("foot"), "z"),
      equip: "boot 0.20 kg (box in the soleplate)",
      boot: { length: bl, ballWidth: bw, heelWidth: P.heelBreadth * H + E.bootWidthAdd, heelBehindAJC: aHeel + E.bootHeel, tipAheadAJC: toeZ + E.bootToe,
        mtp1AheadAJC: (P.mtp1FromHeel - P.ankleFromHeel) * fl, mtp5AheadAJC: (P.mtp5FromHeel - P.ankleFromHeel) * fl, toeSpring: E.toeSpring, soleY: 0,
        footLength: fl, footHeelBehindAJC: aHeel, footTipAheadAJC: toeZ } });
  }
  return BODY_ORDER.map((n, i) => { const b = B[n]; b.index = i; b.parentIndex = b.parent ? BODY_ORDER.indexOf(b.parent) : -1;
    b.mass = b.massBody + b.massEquip; b.comLocal = sub3(b.com, b.origin);
    if (!b.comBody) { b.comBody = b.com.slice(); b.inertiaBody = b.inertia.map(r => r.slice()); }   // kit = point mass at the COM: body-only COM / inertia unchanged
    b.comBodyLocal = sub3(b.comBody, b.origin);
    const kind = n.replace(/_[LR]$/, ""); b.bones = (BODY_BONES[kind] || []).map(x => /\(/.test(x) || !b.side ? x : x + "_" + b.side);
    b.material = kind === "foot" ? "boot" : "body"; return b; });
}
// whole-body mass / COM / inertia about the COM. states (optional): posed body transforms {pos, rot}; bodyOnly: exclude equipment.
export function wholeBody(bodies, states = null, bodyOnly = false) {
  const rotM = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
  const mul = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])), tr = (A) => [0, 1, 2].map(i => [0, 1, 2].map(j => A[j][i]));
  const items = bodies.map((b, i) => { const m = bodyOnly ? b.massBody : b.mass, cl = bodyOnly ? b.comBodyLocal : b.comLocal, I0 = bodyOnly ? b.inertiaBody : b.inertia;
    if (!states) return { m, c: add3(b.origin, cl), I: I0 };
    const R = rotM(states[i].rot), rc = [0, 1, 2].map(k => R[k][0] * cl[0] + R[k][1] * cl[1] + R[k][2] * cl[2]);
    return { m, c: add3(states[i].pos, rc), I: mul(mul(R, I0), tr(R)) }; });
  const M = items.reduce((s, it) => s + it.m, 0); let c = [0, 0, 0]; for (const it of items) c = add3(c, sc3(it.c, it.m)); c = sc3(c, 1 / M);
  let I = diag(0, 0, 0); for (const it of items) I = madd(I, it.I, parAxis(it.m, sub3(it.c, c)));
  return { M, com: c, I };
}

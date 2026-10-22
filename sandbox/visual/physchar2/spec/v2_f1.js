// ═══ physchar2/spec/v2_f1.js — V2-F1 TOE BODY (foot + forefoot, MTP hinge): the spec §12.3 leaf extension, DEFAULT OFF ════════════════════
// Frozen design: review_artifacts/physical_character_v2/pi1/CORRECTION_DESIGN_FROZEN.md §2 (7c090de). Used only when a human specification
// carries `f1` (the PI-1 runner D-1F1); without it nothing here runs and every existing spec / hash is unchanged.
//   • boot outline: the record's heel / tip, the MTP break made TRANSVERSE at the record's toe joint (the V2 boot width / height profile, sole
//     stack and toe spring unchanged); split at the hinge plane: rear → foot body (D1a grid AP 20/40/60/80 % × ML 2), front → toe body (AP 50 % × ML 2)
//   • mass: foot + boot totals unchanged (colliders never contribute mass); the toe takes forefootMassFrac (spec §12.3: 15 – 18 %), COM = front-hull
//     vertex centroid, inertia = solid box of the front hull's extents; the foot keeps the remainder (combined COM and inertia preserved)
//   • joint mtp_X: one DOF (flexion about foot-local X; +anatomical = toes UP), passive only (no actuator), neutral spring about 0°, critically
//     damped against the toe's inertia about the hinge, V2's standard end-range law at the soft / hard limits
import { V } from "../core/v2_math.js";
import { bootHull, splitHullGrid, BOOT_GRID } from "./v2_colliders.js";
import { parAxis } from "./v2_body.js";

const NX = [-1, 0, 0], Z = [0, 0, 1];
const madd = (...ms) => ms.reduce((s, m) => s.map((r, i) => r.map((x, j) => x + m[i][j]))), msub = (A, B) => A.map((r, i) => r.map((x, j) => x - B[i][j]));
const boxI = (m, a, b, c) => [[m / 12 * (b * b + c * c), 0, 0], [0, m / 12 * (a * a + c * c), 0], [0, 0, m / 12 * (a * a + b * b)]];
const spd = (I) => I[0][0] > 0 && I[0][0] * I[1][1] - I[0][1] * I[1][0] > 0 && (I[0][0] * (I[1][1] * I[2][2] - I[1][2] * I[2][1]) - I[0][1] * (I[1][0] * I[2][2] - I[1][2] * I[2][0]) + I[0][2] * (I[1][0] * I[2][1] - I[1][1] * I[2][0])) > 0;
// the F1 boot hull split at the hinge (foot-local, origin = AJC): { rear, front, hingeLocal }
export function f1BootParts(Lm, foot, lat, f1) {
  const P = bootHull(Lm, foot, lat), zs = P.map(p => p[2]), z0 = Math.min(...zs), z1 = Math.max(...zs), frac = (f1.mtpAheadAJC - z0) / (z1 - z0);
  const [rear, front] = splitHullGrid(P, [frac], []); return { rear, front, hingeLocal: [0, f1.mtpAboveStud - Lm.yA, f1.mtpAheadAJC] };
}
// bodies: set the F1 boot outline on both feet, append toe_L / toe_R (indices after the 14 core bodies), split mass properties
export function f1Bodies(Lm, bodies, f1) {
  const out = bodies.slice();
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const foot = out.find(b => b.name === "foot_" + sd);
    Object.assign(foot.boot, { heelBehindAJC: f1.heelBehindAJC, tipAheadAJC: f1.tipAheadAJC, mtp1AheadAJC: f1.mtpAheadAJC, mtp5AheadAJC: f1.mtpAheadAJC, length: f1.heelBehindAJC + f1.tipAheadAJC, f1: true });
    const { front, hingeLocal } = f1BootParts(Lm, foot, g, f1), hinge = V.add(foot.origin, hingeLocal);
    const ctr = V.sc(front.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / front.length), ext = [0, 1, 2].map(k => Math.max(...front.map(p => p[k])) - Math.min(...front.map(p => p[k])));
    const m = foot.mass, c = foot.com, mT = f1.forefootMassFrac * m, cT = V.add(foot.origin, ctr), IT = boxI(mT, ext[0], ext[1], ext[2]), mF = m - mT;
    const cF = V.sc(V.sub(V.sc(c, m), V.sc(cT, mT)), 1 / mF), IF = msub(msub(msub(foot.inertia, IT), parAxis(mT, V.sub(cT, c))), parAxis(mF, V.sub(cF, c)));
    if (!spd(IF)) throw new Error("F1 split leaves a non-positive-definite foot inertia (frozen stop condition)");
    // body-only properties split with the same fraction and geometry (equipment stays proportional)
    const kB = foot.massBody / m, toe = { name: "toe_" + sd, side: sd, parent: "foot_" + sd, joint: "mtp_" + sd, seg: "forefoot+toe box", length: ext[2], origin: hinge,
      massBody: mT * kB, massEquip: mT * (1 - kB), com: cT, inertia: IT, comBody: cT, inertiaBody: IT, equip: "toe box (share of the boot, proportional)", f1: { forefootMassFrac: f1.forefootMassFrac, ext } };
    Object.assign(foot, { massBody: mF * kB, massEquip: mF * (1 - kB), com: cF, inertia: IF, comBody: cF, inertiaBody: IF, f1Split: { toeMass: mT, footMass: mF } });
    foot.mass = foot.massBody + foot.massEquip; foot.comLocal = V.sub(foot.com, foot.origin); foot.comBodyLocal = V.sub(foot.comBody, foot.origin);
    toe.index = out.length; toe.parentIndex = out.indexOf(foot); toe.mass = toe.massBody + toe.massEquip; toe.comLocal = V.sub(toe.com, toe.origin); toe.comBodyLocal = toe.comLocal.slice();
    toe.bones = ["toe_" + sd]; toe.material = "boot"; out.push(toe);
  }
  return out;
}
// joint definitions for the MTP hinges (appended to JOINT_DEFS by buildJoints' extra list); damping = critical against the toe's hinge inertia
export function f1JointDefs(bodies, f1) {
  return ["L", "R"].map(sd => { const t = bodies.find(b => b.name === "toe_" + sd), r = V.sub(t.com, t.origin), Ihinge = t.inertia[0][0] + t.mass * (r[1] * r[1] + r[2] * r[2]), K = f1.neutralKPerDeg * 180 / Math.PI;
    return { name: "mtp_" + sd, side: sd, parent: "foot_" + sd, child: "toe_" + sd, anat: "metatarsophalangeal hinge (lumped toes; V2-F1)", frame: { X: Z, Y: NX },
      axes: { x: { key: "twist", locked: true }, y: { key: "df", pos: "toe dorsiflexion (toes up)", neg: "toe plantarflexion", s: 1, passiveOnly: true }, z: { key: "abd", locked: true } },
      rom: { df: { active: f1.dfActive, hard: f1.dfHard } }, centre: { df: f1.centreDeg }, damping: 2 * Math.sqrt(K * Ihinge), cap: "toe", neutralKPerDeg: f1.neutralKPerDeg,
      evidence: "V2 spec §12.3: DF 0–60° (gait 42°, heel rise 58°, ≈65° needed; Nawoczenski 1999, Hopson 1995), PF 0–30°; barefoot MTP stiffness 0.5–1.0 N·m/deg (midpoint); critical damping 2·√(K·I_hinge)" }; });
}
// colliders: replace each foot's boot pieces by the rear part (D1a grid) and give each toe the front part (AP 50 % × ML 2), toe-local
export function f1Colliders(Lm, bodies, colliders, f1) {
  const out = Object.assign({}, colliders);
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const foot = bodies.find(b => b.name === "foot_" + sd), { rear, front, hingeLocal } = f1BootParts(Lm, foot, g, f1);
    const piece = (pts, k, all, what) => ({ type: "hull", material: "boot", cr: 0.005, hullTol: 1e-5, pos: [0, 0, 0], rot: [0, 0, 0, 1], points: pts, note: `V2-F1 ${what} piece ${k + 1}/${all.length}` });
    out["foot_" + sd] = splitHullGrid(rear, BOOT_GRID.ap, BOOT_GRID.ml).map((pts, k, all) => piece(pts, k, all, "rear boot (foot)"));
    out["toe_" + sd] = splitHullGrid(front.map(p => V.sub(p, hingeLocal)), [0.5], [0.5]).map((pts, k, all) => piece(pts, k, all, "toe box (toe)"));
  }
  return out;
}

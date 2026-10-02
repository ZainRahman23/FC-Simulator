// ═══ physchar2/spec/v2_colliders.js — physics-first colliders, self-collision matrix, contact policy (V2-G0) ═════════════════════════
// Spec §15 / §12.2 (approved). Generated from anthropometry — never fitted to a display mesh and never used for mass.
// Shapes are in BODY-LOCAL coordinates (origin = proximal joint centre, axes = CCS at canonical). Jolt shape conventions: capsule and
// tapered capsule axis = local +Y of the shape (tapered: TOP radius at +Y); box = half extents + convex radius; hull = point cloud.
// Engineering offsets authored at V2-REF scale with H (Lm.s = H / 1.82); boot construction constants (sole stack, toe spring, toe
// allowance) are absolute.
import { V, Q, datan2 } from "../core/v2_math.js";
import { DE_LEVA } from "./v2_human.js";

const INSET = 0.003;                                     // collider ~3 mm inside the skin [ENG]
const RHO = { upperArm: 1070, forearm: 1130, shank: 1090 };   // Dempster / Winter segment densities [H]
const TAPER = { upperArm: 1.15, forearm: 1.45, shank: 1.45 };  // proximal / distal radius ratio [ENG]
export function frustumRadii(m, L, rho, k) { const Vv = m / rho, r2 = Math.sqrt(3 * Vv / (Math.PI * L * (k * k + k + 1))); return [k * r2 - INSET, r2 - INSET]; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function alignY(d) {                                     // rotation taking shape +Y onto direction d (deterministic)
  const n = V.norm(d), ax = V.cross([0, 1, 0], n), s = V.len(ax), c = n[1];
  if (s < 1e-12) return c > 0 ? [0, 0, 0, 1] : [1, 0, 0, 0];
  return Q.axis(V.sc(ax, 1 / s), datan2(s, c));
}
// segment between two cap centres (body-local) → capsule / tapered capsule placement
function between(top, bot) { const d = sub(top, bot), mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2]; return { pos: mid, rot: alignY(d), half: V.len(d) / 2 }; }

export function buildColliders(Lm, bodies) {
  const { H, M, P, E, sole, Ls, yA, yK, yH, yOMPH, yXYPH, ySUPR, yCERV, ySJC, hx, sx, s } = Lm;
  const by = Object.fromEntries(bodies.map(b => [b.name, b])), out = {};
  const loc = (b, w) => sub(w, by[b].origin);
  const mf = (seg) => DE_LEVA[seg].m / 100 * M;
  // ── trunk ──
  out.pelvis = [{ type: "box", material: "body", he: [P.hipBreadth * H / 2, (yOMPH - (yH - 0.07 * s)) / 2, P.pelvisDepth * H / 2], cr: 0.03,
    pos: loc("pelvis", [0, (yOMPH + yH - 0.07 * s) / 2, -0.010 * s]), rot: [0, 0, 0, 1], note: "hip breadth × pelvis depth; 7 cm below the HJC (gluteal)" }];
  out.abdomen = [{ type: "box", material: "body", he: [P.abdomenBreadth * H / 2, (yXYPH - yOMPH) / 2, P.waistDepth * H / 2], cr: 0.03,
    pos: loc("abdomen", [0, (yXYPH + yOMPH) / 2, 0]), rot: [0, 0, 0, 1], note: "waist depth (ANSUR subset); breadth for arm clearance" }];
  const gird = between(loc("thorax", [0.0715 * H, ySJC + 0.028 * s, -0.02 * s]), loc("thorax", [-0.0715 * H, ySJC + 0.028 * s, -0.02 * s]));
  out.thorax = [{ type: "box", material: "body", he: [P.chestBreadth * H / 2, (ySUPR - yXYPH) / 2, P.chestDepth * H / 2], cr: 0.03,
      pos: loc("thorax", [0, (ySUPR + yXYPH) / 2, 0]), rot: [0, 0, 0, 1], note: "chest box xiphion → suprasternale" },
    { type: "capsule", material: "body", r: 0.033 * H, half: gird.half, pos: gird.pos, rot: gird.rot, note: "shoulder-girdle capsule (trapezius / clavicle contact)" }];
  const headPt = [0, P.headJointH * H + sole, P.headJointAP * H], nk = between(loc("head", headPt), loc("head", by.head.origin));
  // C1 (approved 2026-10-02): front-to-back (AP) capsule — r = head breadth / 2 = 0.044 H, cylinder half-length = (head length − head breadth) / 2
  // = 0.013 H, so the AP extent = head length and the lateral extent = head breadth (a sphere cannot satisfy both within the §15.1 tolerance).
  // Placement rule unchanged from the approved sphere: top of the skull collider 0.005 H below the vertex, AP centre +0.0055 H.
  const hr = P.headBreadth * H / 2, hh = (P.headLength - P.headBreadth) * H / 2;
  out.head = [{ type: "capsule", material: "body", r: hr, half: hh, pos: loc("head", [0, H + sole - 0.005 * H - hr, 0.0055 * H]), rot: alignY([0, 0, 1]),
      note: "skull: AP capsule (length 0.114 H, breadth 0.088 H; C1)" },
    { type: "capsule", material: "body", r: 0.030 * H, half: nk.half, pos: nk.pos, rot: nk.rot, note: "neck capsule C7 → skull base" }];
  // ── arms ──
  const ua = frustumRadii(mf("upperArm"), Ls.upperArm, RHO.upperArm, TAPER.upperArm), fa = frustumRadii(mf("forearm"), Ls.forearm, RHO.forearm, TAPER.forearm);
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const U = by["upperArm_" + sd], F = by["forearm_" + sd], u = [g, 0, 0];
    const t = between(loc(U.name, V.add(U.origin, V.sc(u, 0.04 * s))), loc(U.name, V.sub(U.distal, V.sc(u, 0.01 * s))));
    out[U.name] = [{ type: "sphere", material: "body", r: 0.030 * H, pos: loc(U.name, V.add(U.origin, V.sc(u, 0.0066 * H))), rot: [0, 0, 0, 1], note: "deltoid sphere (bideltoid 0.291 H)" },
      { type: "tapered", material: "body", rTop: ua[0], rBot: ua[1], half: t.half, pos: t.pos, rot: t.rot, note: "volume-matched frustum (density 1070)" }];
    const f = between(loc(F.name, F.origin), loc(F.name, F.distal)), hl = Ls.hand + 0.02 * s, hr = 0.0135 * H;
    const h = between(loc(F.name, V.add(F.distal, V.sc(u, hr))), loc(F.name, V.add(F.distal, V.sc(u, hl - hr))));
    out[F.name] = [{ type: "tapered", material: "body", rTop: fa[0], rBot: fa[1], half: f.half, pos: f.pos, rot: f.rot, note: "volume-matched frustum (density 1130)" },
      { type: "capsule", material: "hand", r: hr, half: h.half, pos: h.pos, rot: h.rot, note: `hand capsule, extent ${hl.toFixed(3)} m from the wrist (palm to knuckles)` }];
  }
  // ── legs ──
  const sh = frustumRadii(mf("shank"), Ls.shank, RHO.shank, TAPER.shank);
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const T = by["thigh_" + sd], S = by["shank_" + sd], Ft = by["foot_" + sd];
    const t = between(loc(T.name, [g * (hx + 0.02 * s), yH - 0.05 * s, 0]), loc(T.name, [g * hx, yK + 0.02 * s, 0]));
    out[T.name] = [{ type: "tapered", material: "body", rTop: 0.048 * H, rBot: 0.034 * H, half: t.half, pos: t.pos, rot: t.rot, note: "girth-based (proximal 0.048 H, lateral axis offset)" }];
    const k = between(loc(S.name, [g * hx, yK - 0.03 * s, -0.01 * s]), loc(S.name, [g * hx, yA + 0.06 * s, -0.01 * s]));
    out[S.name] = [{ type: "tapered", material: "body", rTop: sh[0], rBot: sh[1], half: k.half, pos: k.pos, rot: k.rot, note: "volume-matched frustum (density 1090), calf 1 cm posterior" }];
    out[Ft.name] = [{ type: "hull", material: "boot", cr: 0.005, pos: [0, 0, 0], rot: [0, 0, 0, 1], points: bootHull(Lm, Ft, g), note: "rigid boot hull: anatomical outline, oblique MTP break, 12 mm toe spring" }];
  }
  return out;
}
// boot hull points, foot-local (origin = AJC). lat = +1 right foot (lateral = +x), −1 left foot.
export function bootHull(Lm, foot, lat) {
  const { s, yA } = Lm, b = foot.boot, ys = -yA, z0 = -b.heelBehindAJC, z1 = b.tipAheadAJC, hw = b.heelWidth / 2, bw = b.ballWidth / 2, m1 = b.mtp1AheadAJC, m5 = b.mtp5AheadAJC, ts = b.toeSpring;
  const mtpZ = (x) => { const t = (lat * x + bw) / (2 * bw); return m1 + (m5 - m1) * Math.max(0, Math.min(1, t)); };   // oblique break: medial m1 → lateral m5
  const soleY = (x, z) => { const zm = mtpZ(x); return z <= zm ? ys : ys + ts * Math.min(1, (z - zm) / (z1 - zm)); };
  const P = [], add = (x, y, z) => P.push([x, y, z]), sp = (x, z) => add(x, soleY(x, z), z);
  // plantar outline
  sp(0, z0); sp(lat * 0.80 * hw, z0 + 0.012 * s); sp(-lat * 0.80 * hw, z0 + 0.012 * s); sp(lat * hw, z0 + 0.040 * s); sp(-lat * hw, z0 + 0.040 * s);
  sp(lat * 0.5 * (hw + bw), 0.5 * (z0 + m5)); sp(-lat * 0.485 * (hw + bw), 0.5 * (z0 + m1)); sp(lat * bw, m5); sp(-lat * bw, m1);
  sp(lat * 0.80 * bw, m5 + 0.45 * (z1 - m5)); sp(lat * 0.35 * bw, z1 - 0.010 * s); sp(-lat * 0.25 * bw, z1); sp(-lat * 0.80 * bw, m1 + 0.55 * (z1 - m1));
  // upper silhouette (heel counter, collar, instep, toe box)
  add(0, ys + 0.065 * s, z0 + 0.004 * s); add(lat * 0.75 * hw, ys + 0.060 * s, z0 + 0.015 * s); add(-lat * 0.75 * hw, ys + 0.060 * s, z0 + 0.015 * s);
  add(lat * 0.035 * s, ys + 0.070 * s, 0); add(-lat * 0.035 * s, ys + 0.070 * s, 0);
  add(0, ys + 0.075 * s, 0.035 * s); add(lat * 0.6 * bw, ys + 0.060 * s, 0.07 * s); add(-lat * 0.6 * bw, ys + 0.060 * s, 0.07 * s);
  add(0, ys + 0.055 * s, 0.11 * s); add(lat * 0.75 * bw, ys + 0.040 * s, m5); add(-lat * 0.75 * bw, ys + 0.040 * s, m1);
  add(-lat * 0.2 * bw, ys + 0.045 * s, 0.19 * s); add(-lat * 0.25 * bw, ys + ts + 0.030 * s, z1 - 0.008 * s); add(lat * 0.5 * bw, ys + 0.6 * ts + 0.028 * s, 0.20 * s);
  return P;
}
// self-collision: one group per character, sub-group = body index; disabled pairs (spec §15.3): 13 parent–child + 3
export function disabledPairs(bodies) {
  const idx = (n) => bodies.findIndex(b => b.name === n), out = [];
  for (const b of bodies) if (b.parentIndex >= 0) out.push([b.parentIndex, b.index, "parent–child"]);
  out.push([idx("pelvis"), idx("thorax"), "pelvis–thorax (extreme flexion governed by joint limits)"]);
  out.push([idx("abdomen"), idx("thigh_L"), "abdomen–thigh (deep hip flexion governed by ROM + passive torque)"]);
  out.push([idx("abdomen"), idx("thigh_R"), "abdomen–thigh (deep hip flexion governed by ROM + passive torque)"]);
  return out;
}
// contact policy (spec §15.4) — friction per material pair; restitution 0 for bodies (the ball is handled separately, later)
export const CONTACT = { speculative: 0.02, slop: 0.005, baumgarte: 0.2, restitution: 0,
  friction: { "boot|turf": 1.2, "hand|turf": 0.7, "body|turf": 0.5, "body|body": 0.4, "boot|body": 0.4, "hand|body": 0.4, "boot|boot": 0.4, "hand|hand": 0.4, "boot|hand": 0.4 },
  frictionNote: "boot–turf 1.2 [ENG] default pending the turf gate (range 1.0–1.6); others [V1] values kept as [ENG]" };
export const frictionOf = (ma, mb) => { const k1 = ma + "|" + mb, k2 = mb + "|" + ma; return CONTACT.friction[k1] ?? CONTACT.friction[k2] ?? 0.4; };

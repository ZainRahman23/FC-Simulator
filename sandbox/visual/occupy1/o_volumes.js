// ═══ occupy1/o_volumes.js — PLAYER OCCUPANCY V1: the body's occupancy volumes, built every tick from the REAL ANIMATED BODY (PlayBody's posed
// joints), and the contact DETECTION between two bodies ══════════════════════════════════════════════════════════════════════════════════════
// The geometry is measured from the characters' skinned meshes (tools/o_geometry.mjs: every vertex by its dominant bone, its distance from the
// bone's segment in the bind pose; the trunk by its silhouette per height band — vinicius, the rig every fixture uses; the five other characters
// within ±10 %). Each volume is a capsule (a segment swept by a radius) attached to the posed bones:
//   PELVIS   across the hips: the hip joints' axis, centre 4.5 cm below them and 1.7 cm back, half-length 0.07, r 0.12 → ±0.19 wide, ±0.12 deep,
//            0.76 – 1.0 m high (the mesh: hips ±0.18 – 0.20, −0.14 … +0.105, 0.78 – 0.975)
//   WAIST    along the spine bone, r 0.10 (the mesh at 1.0 – 1.1 m: ±0.13 wide, ±0.09 deep)
//   CHEST    across the shoulders (the upper arms' axis), centre 38 % up the chest bone, half-length 0.085, r 0.115 → ±0.20 wide, ±0.115 deep,
//            ±0.115 high (the mesh at 1.2 – 1.45 m: ±0.16 – 0.21, ±0.11 – 0.12)
//   THIGH    hip → knee, r 0.115 · SHIN knee → ankle, r 0.07 (the 75th percentile of each bone's flesh: the solid core; the outer quarter is
//            the soft tissue the contact tolerance allows to meet)
//   FOOT     ankle → ball of the foot, r 0.07 · UPPER ARM shoulder → elbow, r 0.07 — DETECTED and reported only: a foot meets a foot at the
//            ball (a legitimate boot clash, Stage 3's business) and swinging arms pass each other; resolving them would build a force field
// THE THRESHOLDS (the same measurement): CONTACT TOLERANCE 2 cm — the outer flesh between the 75th and 90th percentiles of two limbs (≈ 1.2 cm
// each) may meet and compress; HARD PENETRATION LIMIT 5 cm — beyond it more than half of the two cross-sections overlap (75th → 50th
// percentile, ≈ 2.6 cm each): anatomically impossible.
export const OCC = { tol: 0.02, hard: 0.05, broad: 1.9 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; }, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const REGIONS = [
  // id, group (TRUNK · LEG · FOOT · ARM), resolved by occupancy?
  ["PELVIS", "TRUNK", true], ["WAIST", "TRUNK", true], ["CHEST", "TRUNK", true], ["THIGH_R", "LEG", true], ["THIGH_L", "LEG", true], ["SHIN_R", "LEG", true], ["SHIN_L", "LEG", true],
  ["FOOT_R", "FOOT", false], ["FOOT_L", "FOOT", false], ["UARM_R", "ARM", false], ["UARM_L", "ARM", false]];
export const GROUP = Object.fromEntries(REGIONS.map(([id, g]) => [id, g])), RESOLVED = new Set(REGIONS.filter((r) => r[2]).map((r) => r[0]));
// the volumes of one posed body (J: PlayBody's joints, each { j: joint, t: tip } in pitch metres, z up)
export function volumesOf(J) { const hipR = J.thigh_R.j, hipL = J.thigh_L.j, lat = norm(sub(hipR, hipL)), up = norm(sub(J.spine.t, J.pelvis.j)), fw = norm([lat[1] * up[2] - lat[2] * up[1], lat[2] * up[0] - lat[0] * up[2], lat[0] * up[1] - lat[1] * up[0]]);   // (forward = lateral × up: the pitch's right is +y when facing +x)
  const pc = add(add(mul(add(hipR, hipL), 0.5), mul(up, -0.045)), mul(fw, -0.017)), sh = norm(sub(J.upperArm_R.j, J.upperArm_L.j)), cc = add(J.chest.j, mul(sub(J.neck.j, J.chest.j), 0.38));
  return [
    { id: "PELVIS", a: add(pc, mul(lat, -0.07)), b: add(pc, mul(lat, 0.07)), r: 0.12 },
    { id: "WAIST", a: J.spine.j, b: J.chest.j, r: 0.10 },
    { id: "CHEST", a: add(cc, mul(sh, -0.085)), b: add(cc, mul(sh, 0.085)), r: 0.115 },
    { id: "THIGH_R", a: J.thigh_R.j, b: J.thigh_R.t, r: 0.115 }, { id: "THIGH_L", a: J.thigh_L.j, b: J.thigh_L.t, r: 0.115 },
    { id: "SHIN_R", a: J.shin_R.j, b: J.shin_R.t, r: 0.07 }, { id: "SHIN_L", a: J.shin_L.j, b: J.shin_L.t, r: 0.07 },
    { id: "FOOT_R", a: J.foot_R.j, b: J.foot_R.t, r: 0.07 }, { id: "FOOT_L", a: J.foot_L.j, b: J.foot_L.t, r: 0.07 },
    { id: "UARM_R", a: J.upperArm_R.j, b: J.upperArm_R.t, r: 0.07 }, { id: "UARM_L", a: J.upperArm_L.j, b: J.upperArm_L.t, r: 0.07 }]; }
// the closest points of two segments (Ericson): { d, pa, pb }
export function segClosest(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = 0; t = 0; } else if (a <= 1e-12) { s = 0; t = clamp(f / e, 0, 1); } else { const c = dot(d1, r); if (e <= 1e-12) { t = 0; s = clamp(-c / a, 0, 1); } else { const b = dot(d1, d2), den = a * e - b * b; s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } } }
  const pa = add(p1, mul(d1, s)), pb = add(p2, mul(d2, t)); return { d: Math.hypot(...sub(pa, pb)), pa, pb, s, t }; }
// ═══ CONTACT DETECTION: every pair of volumes of body A and body B — the gap (negative = penetration), the separating direction (from B to A,
// 3-D and its horizontal part), the contact point. Detection only: nothing here moves anything (o_resolve.js decides corrections) ═════════════
export function detect(VA, VB, o = {}) { const out = []; const only = o.only || null;
  for (const a of VA) for (const b of VB) { if (only && !(only(a.id, b.id))) continue; const c = segClosest(a.a, a.b, b.a, b.b), gap = c.d - a.r - b.r; if (gap > (o.within != null ? o.within : 0)) continue;
    let n = c.d > 1e-9 ? norm(sub(c.pa, c.pb)) : [0, 0, 1]; const h = Math.hypot(n[0], n[1]), nh = h > 1e-6 ? [n[0] / h, n[1] / h] : null;
    out.push({ A: a.id, B: b.id, gap, pen: -gap, n, nh, hFrac: h, at: mul(add(c.pa, c.pb), 0.5), uA: c.s, uB: c.t, both: RESOLVED.has(a.id) && RESOLVED.has(b.id) }); }
  return out.sort((x, y) => x.gap - y.gap); }
// ═══ BALL ACCESS: a player's leg playing the ball must not be inside the opponent's body. The touching leg (its FOOT, SHIN, THIGH) against the
// opponent's resolved volumes (PELVIS, WAIST, CHEST, THIGHS, SHINS) — the opponent's FEET excluded (boots meet at the ball: a clash, not an
// impossible reach). Returns the deepest penetration and where ─────────────────────────────────────────────────────────────────────────────
const LEG = { R: ["FOOT_R", "SHIN_R", "THIGH_R"], L: ["FOOT_L", "SHIN_L", "THIGH_L"] };
export function legThrough(VT, VO, F) { const mine = VT.filter((v) => LEG[F].includes(v.id)), theirs = VO.filter((v) => RESOLVED.has(v.id)); let best = { pen: -Infinity, A: null, B: null };
  for (const a of mine) for (const b of theirs) { const c = segClosest(a.a, a.b, b.a, b.b), pen = a.r + b.r - c.d; if (pen > best.pen) best = { pen, A: a.id, B: b.id, at: mul(add(c.pa, c.pb), 0.5) }; } return best; }

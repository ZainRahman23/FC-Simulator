// ═══ occupy3b2/b2_geom.js — STAGE 3B.2: THE LANDING LEG'S GEOMETRY (pure, no world) ═══════════════════════════════════════════════════════════
// A predicted leg — where a foot WILL be, at a time the canonical body has not drawn yet — built the way the canonical leg is: the hip (from the
// root and the drawn hip's offset), the ankle (the stance's place at the ankle's height, or a point of the swing), the knee by the two-bone
// solution in the plane of the hip–ankle line and the body's forward direction (the knee forward), the rig's own thigh / shank lengths. Its
// volumes are Stage 1's mesh-measured capsules (occupy1/o_volumes.js: THIGH r 0.115 · SHIN r 0.07 · FOOT ankle → ball of the foot r 0.07) — the
// same volumes every contact of every stage is measured with — plus, for boot ↔ boot only, the BOOT: heel → toe tip along the sole, r 0.045 (the
// boot's half-width, DRIBBLE-1's hull ≈ 9.5 cm across the forefoot), the boot's actual surface where two boots meet.
import { segClosest } from "../occupy1/o_volumes.js";
const hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a, d = [1, 0, 0]) => { const m = hyp(a[0], a[1], a[2]); return m > 1e-12 ? [a[0] / m, a[1] / m, a[2] / m] : d; };
export const RIG = { thigh: 0.4349, shank: 0.3987, legLen: 0.8336, ankleH: 0.088, mtpZ: 0.1805, tipZ: 0.2752, heelZ: -0.0808, reach: 0.985, drop: 0.075 };
export const R_THIGH = 0.115, R_SHIN = 0.07, R_FOOT = 0.07, R_BOOT = 0.045;
// the knee of a leg from hip H to ankle A, bending toward the forward direction fw (2-D): { K, d (hip–ankle), short (beyond the leg's length), knee
// (the knee's flexion, deg: 0 straight) }
export function kneeOf(H, A, fw) { const t = RIG.thigh, s = RIG.shank, D = sub(A, H), dW = hyp(D[0], D[1], D[2]), dMax = t + s - 0.004, d = Math.min(dW, dMax), u = unit(D, [0, 0, -1]);
  // (the bending plane: the hip–ankle line and the forward direction's part perpendicular to it — the knee goes forward)
  const f3 = [fw[0], fw[1], 0], fp = unit(sub(f3, mul(u, dot(f3, u))), unit(cross(u, [-fw[1], fw[0], 0]), [1, 0, 0]));
  const ca = clamp((t * t + d * d - s * s) / (2 * t * d), -1, 1), sa = Math.sqrt(1 - ca * ca), K = add(H, add(mul(u, t * ca), mul(fp, t * sa)));
  const kc = clamp((t * t + s * s - d * d) / (2 * t * s), -1, 1); return { K, A: dW > dMax ? add(H, mul(u, d)) : A, d: dW, short: Math.max(0, dW - dMax), knee: 180 - Math.acos(kc) * 180 / Math.PI }; }
// the hip's flexion / abduction (deg) of a thigh H → K in the frame of a body facing psi (up = z): flexion forward +, abduction outward + (side X)
export function hipAng(H, K, psi, X) { const f = [Math.cos(psi), Math.sin(psi)], r = [-f[1], f[0]], th = sub(K, H), a = th[0] * f[0] + th[1] * f[1], l = (th[0] * r[0] + th[1] * r[1]) * (X === "R" ? 1 : -1);
  return { flex: Math.atan2(a, -th[2]) * 180 / Math.PI, abd: Math.atan2(l, hyp(a, th[2])) * 180 / Math.PI }; }
export const ROM = { flex: [-30, 125], abd: [-30, 45], knee: [0, 150] };
// the volumes of a predicted leg: THIGH (the whole, and its lower half apart: the hip's upper half is the body), SHIN, FOOT, BOOT
export function legCaps(H, K, A, yaw, X, pitch = 0) { const fw = [Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)], ball = add(A, add(mul(fw, RIG.mtpZ), [0, 0, -0.057])), mid = add(H, mul(sub(K, H), 0.5));
  const heel = add(A, add(mul(fw, RIG.heelZ), [0, 0, -0.045])), tip = add(A, add(mul(fw, RIG.tipZ), [0, 0, -0.075]));
  return [{ id: "THIGH_" + X, a: H, b: K, r: R_THIGH, lower: mid }, { id: "SHIN_" + X, a: K, b: A, r: R_SHIN }, { id: "FOOT_" + X, a: A, b: ball, r: R_FOOT }, { id: "BOOT_" + X, a: heel, b: tip, r: R_BOOT, boot: true }]; }
// the drawn leg's volumes from a pose's joints (J: PlayBody's), BOOT included (heel → toe tip along the drawn foot)
export function legCapsJ(J, X) { const A = J["foot_" + X].j, B = J["toe_" + X].j, T = J["toe_" + X].t, fw = unit(sub(B, A)), heel = add(A, add(mul(fw, RIG.heelZ), [0, 0, -0.045]));
  return [{ id: "THIGH_" + X, a: J["thigh_" + X].j, b: J["thigh_" + X].t, r: R_THIGH, lower: add(J["thigh_" + X].j, mul(sub(J["thigh_" + X].t, J["thigh_" + X].j), 0.5)) }, { id: "SHIN_" + X, a: J["shin_" + X].j, b: J["shin_" + X].t, r: R_SHIN },
    { id: "FOOT_" + X, a: A, b: B, r: R_FOOT }, { id: "BOOT_" + X, a: heel, b: [T[0], T[1], Math.max(0.012, T[2] - 0.02)], r: R_BOOT, boot: true }]; }
// the deepest penetration between two sets of capsules (boots meet only boots; a thigh's upper half optional) → { pen, A, B, at, n (from B to A, 2-D) }
export function capsPen(CA, CB, o = {}) { let best = { pen: -Infinity, A: null, B: null };
  for (const a of CA) for (const b of CB) { if (!!a.boot !== !!b.boot) continue; if (a.boot && !o.boots) continue; const aa = o.lowerA && a.lower ? a.lower : a.a, bb = o.lowerB && b.lower ? b.lower : b.a;
    const c = segClosest(aa, a.b, bb, b.b), pen = a.r + b.r - c.d; if (pen > best.pen) { const n = [c.pa[0] - c.pb[0], c.pa[1] - c.pb[1]], m = hyp(n[0], n[1]); best = { pen, A: a.id, B: b.id, at: mul(add(c.pa, c.pb), 0.5), n: m > 1e-9 ? [n[0] / m, n[1] / m] : null }; } }
  return best; }
// the deepest penetration between two sets of capsules, every pair (no boot gating: a boot against a shin, a boot against a boot) → as capsPen
export function anyPen(CA, CB) { let best = { pen: -Infinity, A: null, B: null };
  for (const a of CA) for (const b of CB) { const c = segClosest(a.a, a.b, b.a, b.b), pen = a.r + b.r - c.d; if (pen > best.pen) { const n = [c.pa[0] - c.pb[0], c.pa[1] - c.pb[1]], m = hyp(n[0], n[1]); best = { pen, A: a.id, B: b.id, at: mul(add(c.pa, c.pb), 0.5), n: m > 1e-9 ? [n[0] / m, n[1] / m] : null }; } }
  return best; }
// a swing corridor: the foot from P0 (time t0) to P1 (time t1) through optional via points { p, t } — the ankle's path (a lift arc over each leg of
// the route: ≥ the ankle's height, peak lift h at its middle), sampled n times (the end excluded: the landing is checked apart)
export function corridor(P0, t0, P1, t1, via = [], n = 7, lift = 0.10) { const pts = [{ p: P0, t: t0 }, ...via, { p: P1, t: t1 }], out = [];
  for (let i = 1; i <= n; i++) { const t = t0 + (t1 - t0) * i / (n + 1); let j = 0; while (j < pts.length - 2 && t > pts[j + 1].t) j++; const a = pts[j], b = pts[j + 1], u = clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1), w = (t - t0) / Math.max(1e-6, t1 - t0);
    const z = Math.max(RIG.ankleH, a.p[2] + (b.p[2] - a.p[2]) * u) + lift * Math.sin(Math.PI * w) * (1 - Math.max(0, (w - 0.85) / 0.15));
    out.push({ t, p: [a.p[0] + (b.p[0] - a.p[0]) * u, a.p[1] + (b.p[1] - a.p[1]) * u, z] }); }
  return out; }

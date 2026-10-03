// ═══ physchar/pc_math.js — Float64 vector / quaternion helpers for the physical character (Node + browser, no dependencies) ═══════
// Quaternions are [x, y, z, w]. World frame = the renderer's GL frame: x = pitch x, y = HEIGHT (up), z = −pitch y; the character's own
// frame at bind is world-aligned: +x = his RIGHT, +y = up, +z = forward (rig.json "character-local Y-up, +Z forward, _R on +X").
// ── DETERMINISTIC trigonometry for anything that feeds the physical state. JavaScript does not require Math.sin / cos / tan to be
// bit-identical across engines or versions (measured: Node and Chrome gave different bits for one drop's initial pose → a chaotic
// divergence). These use only + − × ÷ (IEEE-exact everywhere): Cody–Waite reduction by π/2 with a split constant, then Taylor
// polynomials on [−π/4, π/4] (error < 1e-16). Math.* stays allowed for measurement / display only.
const PIO2_HI = 1.5707963267341256, PIO2_LO = 6.077100506506192e-11;
const sinP = (r) => { const z = r * r; return r + r * z * (-1 / 6 + z * (1 / 120 + z * (-1 / 5040 + z * (1 / 362880 + z * (-1 / 39916800 + z * (1 / 6227020800 + z * (-1 / 1307674368000))))))); };
const cosP = (r) => { const z = r * r; return 1 + z * (-1 / 2 + z * (1 / 24 + z * (-1 / 720 + z * (1 / 40320 + z * (-1 / 3628800 + z * (1 / 479001600 + z * (-1 / 87178291200))))))); };
function dsincos(x) { const k = Math.round(x / PIO2_HI), r = (x - k * PIO2_HI) - k * PIO2_LO, s = sinP(r), c = cosP(r), q = ((k % 4) + 4) % 4;
  return q === 0 ? [s, c] : q === 1 ? [c, -s] : q === 2 ? [-s, -c] : [-c, s]; }
export const dsin = (x) => dsincos(x)[0], dcos = (x) => dsincos(x)[1], dtan = (x) => { const [s, c] = dsincos(x); return s / c; };
export const dlen = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);          // sqrt is correctly rounded (IEEE) — Math.hypot is not specified to be
// deterministic atan / atan2 / acos / exp (Gate C1: the stance IK and the balance classifier feed physics targets). Only + − × ÷ √:
// atan by two half-angle reductions (atan x = 2·atan(x / (1 + √(1 + x²)))) to |x| ≤ tan(π/16), then the alternating series (error < 1e-17).
export function datan(x) { let sg = 1; if (x < 0) { x = -x; sg = -1; } let inv = false; if (x > 1) { x = 1 / x; inv = true; }
  x = x / (1 + Math.sqrt(1 + x * x)); x = x / (1 + Math.sqrt(1 + x * x));
  const z = x * x; let s = 0, p = x; for (let n = 0; n < 14; n++) { s += (n & 1 ? -p : p) / (2 * n + 1); p *= z; }
  const r = 4 * s; return sg * (inv ? Math.PI / 2 - r : r); }
export function datan2(y, x) { if (x > 0) return datan(y / x); if (x < 0) return y >= 0 ? datan(y / x) + Math.PI : datan(y / x) - Math.PI; return y > 0 ? Math.PI / 2 : y < 0 ? -Math.PI / 2 : 0; }
export const dacos = (c) => { const x = Math.max(-1, Math.min(1, c)); return datan2(Math.sqrt(Math.max(0, 1 - x * x)), x); };
export const dasin = (c) => { const x = Math.max(-1, Math.min(1, c)); return datan2(x, Math.sqrt(Math.max(0, 1 - x * x))); };
// deterministic Euclidean norm of any number of components (√ of the in-order sum of squares; Math.hypot is not specified to be bit-identical
// across engines — G3 resolution D1: the standing controller's leg IK used it and diverged browser vs Node on one push scenario)
export const dnorm = (...a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s); };
// exp by x = k·ln2 + r (|r| ≤ ln2/2), Taylor on r, then exact scaling by powers of two
export function dexp(x) { const LN2 = 0.6931471805599453, k = Math.round(x / LN2), r = x - k * LN2; let s = 1, t = 1; for (let n = 1; n < 22; n++) { t *= r / n; s += t; }
  let p = 1; const b = k < 0 ? 0.5 : 2; for (let i = 0; i < Math.abs(k); i++) p *= b; return s * p; }
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]), dist: (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); },
  norm: (a) => { const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1e-12; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
export const Q = {
  id: () => [0, 0, 0, 1],
  mul: (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
                  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  conj: (a) => [-a[0], -a[1], -a[2], a[3]],
  norm: (a) => { const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]) || 1e-12; return [a[0] / l, a[1] / l, a[2] / l, a[3] / l]; },
  axis: (ax, ang) => { const n = V.norm(ax), [s, c] = dsincos(ang / 2); return [n[0] * s, n[1] * s, n[2] * s, c]; },
  rot: (q, v) => { const u = [q[0], q[1], q[2]], s = q[3], t = V.sc(V.cross(u, v), 2); return V.add(V.add(v, V.sc(t, s)), V.cross(u, t)); },
  // quaternion of the rotation whose matrix columns are the (orthonormal) axes ex, ey, ez
  fromAxes: (ex, ey, ez) => { const m00 = ex[0], m10 = ex[1], m20 = ex[2], m01 = ey[0], m11 = ey[1], m21 = ey[2], m02 = ez[0], m12 = ez[1], m22 = ez[2], tr = m00 + m11 + m22;
    let q; if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
    return Q.norm(q); },
  angle: (q) => 2 * Math.atan2(Math.hypot(q[0], q[1], q[2]), Math.abs(q[3])),
  // Jolt's swing–twist split for a constraint-space rotation (twist about X): q = q_swing · q_twist.
  // Returns angles in radians: twist about X; swing "pyramid" components about Y and Z = 2·atan2(q_swing.y|z, q_swing.w) — the exact
  // quantities Jolt's SixDOF pyramid limits clamp (SwingTwistConstraintPart.h).
  swingTwist: (q) => { let [x, y, z, w] = q; if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
    const tl = Math.sqrt(x * x + w * w); const qt = tl > 1e-12 ? [x / tl, 0, 0, w / tl] : [0, 0, 0, 1];
    const qs = Q.mul([x, y, z, w], Q.conj(qt));
    return { twist: 2 * Math.atan2(qt[0], qt[3]), swingY: 2 * Math.atan2(qs[1], qs[3]), swingZ: 2 * Math.atan2(qs[2], qs[3]) }; },
};
// column-major 4×4 (Float32Array) for the renderer from a rigid transform
export const toMat4 = (p, q) => { const [x, y, z, w] = q, m = new Float32Array(16);
  m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y + z * w); m[2] = 2 * (x * z - y * w);
  m[4] = 2 * (x * y - z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z + x * w);
  m[8] = 2 * (x * z + y * w); m[9] = 2 * (y * z - x * w); m[10] = 1 - 2 * (x * x + y * y);
  m[12] = p[0]; m[13] = p[1]; m[14] = p[2]; m[15] = 1; return m; };
export const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;
export const pct = (arr, p) => { if (!arr.length) return 0; const s = Float64Array.from(arr).sort(); const i = Math.min(s.length - 1, Math.max(0, Math.round(p / 100 * (s.length - 1)))); return s[i]; };
// FNV-1a over the exact IEEE-754 bits of a list of numbers (bit-level repeatability, not a rounded print)
export const hashNums = (nums, h = 2166136261) => { const f = new Float64Array(1), b = new Uint8Array(f.buffer);
  for (const x of nums) { f[0] = x; for (let i = 0; i < 8; i++) { h ^= b[i]; h = Math.imul(h, 16777619) >>> 0; } } return h >>> 0; };

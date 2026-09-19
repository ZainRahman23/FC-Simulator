// ═══ anim3d/m4.js — minimal column-major mat4 / vec3 helpers for the skeletal prototype (no dependency) ═══
// Conventions: Float32Array(16) column-major (WebGL). World frame for the 3D layer = the renderer's fproj3 frame:
// x = pitch x (metres, east), y = HEIGHT (up), z = pitch y (metres, south). Angles in radians.
const M4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  copy(a) { return new Float32Array(a); },
  mul(a, b, out) {                       // out = a * b
    out = out || new Float32Array(16);
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + rr] * b[c * 4 + k]; r[c * 4 + rr] = s;
    }
    out.set(r); return out;
  },
  translate(x, y, z) { const m = M4.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
  scale(x, y, z) { const m = M4.ident(); m[0] = x; m[5] = y; m[10] = z; return m; },
  rotX(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotY(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rotZ(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  // euler in the order Y (yaw) · X (pitch) · Z (roll), applied as R = Ry * Rx * Rz
  euler(x, y, z) { return M4.mul(M4.mul(M4.rotY(y), M4.rotX(x)), M4.rotZ(z)); },
  // rotation that maps unit vector `from` onto unit vector `to` (Rodrigues)
  fromTo(f, t) {
    const c = V3.dot(f, t), ax = V3.cross(f, t), s = V3.len(ax);
    if (s < 1e-9) { if (c > 0) return M4.ident(); const p = Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; const a = V3.norm(V3.cross(f, p)); return M4.axisAngle(a, Math.PI); }
    return M4.axisAngle(V3.scale(ax, 1 / s), Math.atan2(s, c));
  },
  axisAngle(a, t) {
    const m = M4.ident(), c = Math.cos(t), s = Math.sin(t), k = 1 - c, x = a[0], y = a[1], z = a[2];
    m[0] = c + x * x * k; m[1] = y * x * k + z * s; m[2] = z * x * k - y * s;
    m[4] = x * y * k - z * s; m[5] = c + y * y * k; m[6] = z * y * k + x * s;
    m[8] = x * z * k + y * s; m[9] = y * z * k - x * s; m[10] = c + z * z * k; return m;
  },
  transformPoint(m, p) { const x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  transformDir(m, p) { const x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]; },
  origin(m) { return [m[12], m[13], m[14]]; },
  invertRigid(m) {                       // inverse of a rotation+translation matrix
    const r = M4.ident();
    r[0] = m[0]; r[1] = m[4]; r[2] = m[8]; r[4] = m[1]; r[5] = m[5]; r[6] = m[9]; r[8] = m[2]; r[9] = m[6]; r[10] = m[10];
    const t = M4.transformDir(r, [m[12], m[13], m[14]]); r[12] = -t[0]; r[13] = -t[1]; r[14] = -t[2]; return r;
  },
  normalMat3(m) { return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]; },   // rigid: rotation part is its own inverse-transpose
};
const V3 = {
  add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }, sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
  scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }, dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
  cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
  len(a) { return Math.hypot(a[0], a[1], a[2]); }, norm(a) { const l = V3.len(a) || 1e-9; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; },
  dist(a, b) { return V3.len(V3.sub(a, b)); },
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

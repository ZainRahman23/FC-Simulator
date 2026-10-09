// Track A (DIAGNOSTIC ONLY) — shared helpers: Jolt state save / restore through StateRecorderJS, the v5.6.0 contact-cache (ManifoldCache) codec,
// energy of a state exactly as G1 measures it, per-contact work attribution. Nothing here is used by any production / gate path.
// Layout source: Jolt v5.6.0 ContactConstraintManager.cpp (ManifoldCache::SaveState / CachedBodyPair / CachedManifold / CachedContactPoint::SaveState).
import { Q, V } from "../core/v2_math.js";

export function saveState(J, ps, flags) {
  const chunks = [], rec = new J.StateRecorderJS();
  rec.WriteBytes = (ptr, n) => { chunks.push(J.HEAPU8.slice(ptr, ptr + n)); };
  rec.ReadBytes = () => { throw new Error("read on a write recorder"); }; rec.IsEOF = () => false; rec.IsFailed = () => false;
  ps.SaveState(rec, flags); J.destroy(rec);
  const n = chunks.reduce((s, c) => s + c.length, 0), out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
}
export function restoreState(J, ps, bytes) {
  let off = 0; const rec = new J.StateRecorderJS();
  rec.ReadBytes = (ptr, n) => { if (off + n > bytes.length) throw new Error("state underrun"); J.HEAPU8.set(bytes.subarray(off, off + n), ptr); off += n; };
  rec.WriteBytes = () => { throw new Error("write on a read recorder"); }; rec.IsEOF = () => off >= bytes.length; rec.IsFailed = () => false;
  const ok = ps.RestoreState(rec); J.destroy(rec); if (!ok) throw new Error("RestoreState failed"); if (off !== bytes.length) throw new Error(`state not fully consumed ${off}/${bytes.length}`); return ok;
}

// ── contact cache codec (stream saved with EStateRecorderState_Contacts only: 1 flag byte + ManifoldCache) ──
export function decodeContacts(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let o = 0;
  const u8 = () => dv.getUint8(o++), u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; }, u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; }, f3 = () => [f32(), f32(), f32()];
  const flag = u8(), nbp = u32(), pairs = [];
  for (let i = 0; i < nbp; i++) { const bodyA = u32(), bodyB = u32(), dPos = f3(), dRot = f3(), nm = u32(), manifolds = [];
    for (let j = 0; j < nm; j++) { const key = { body1: u32(), sub1: u32(), body2: u32(), sub2: u32() }, np = u16(), normalOffset = o, normal = f3(), fricOffset = o, friction = [f32(), f32()], angFriction = f32(), points = [];
      for (let k = 0; k < np; k++) { const p1 = f3(), p2 = f3(), lamOffset = o, lambda = f32(); points.push({ p1, p2, lambda, lamOffset }); }
      manifolds.push({ key, normal, normalOffset, friction, angFriction, fricOffset, points }); }
    pairs.push({ bodyA, bodyB, dPos, dRot, manifolds }); }
  const nccd = u32(), ccd = []; for (let j = 0; j < nccd; j++) ccd.push({ body1: u32(), sub1: u32(), body2: u32(), sub2: u32() });
  if (o !== bytes.length) throw new Error(`contact cache decode: ${o} of ${bytes.length} bytes`);
  return { flag, pairs, ccd };
}
// a copy of the stream with selected cached lambdas zeroed: sel(pair, manifold, pointIndex|null) → { normal: bool, friction: bool }
export function editContacts(bytes, dec, sel) {
  const out = bytes.slice(), dv = new DataView(out.buffer); let edits = 0;
  for (const p of dec.pairs) for (const m of p.manifolds) {
    const sm = sel(p, m, null) || {}; if (sm.friction) { for (let k = 0; k < 3; k++) dv.setFloat32(m.fricOffset + 4 * k, 0, true); edits++; }
    m.points.forEach((pt, k) => { const s = sel(p, m, k) || {}; if (s.normal) { dv.setFloat32(pt.lamOffset, 0, true); edits++; } }); }
  return { bytes: out, edits };
}

// energy of a state exactly as G1 _measure does (KE + PE + passive U from the same PassiveLayer evaluation)
export function energyOf(spec, P, S, g) {
  let ke = 0, pe = 0; const per = [];
  S.forEach((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia, Iw = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]);
    const k = 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * V.dot(wl, Iw), p = b.mass * g * s.com[1]; ke += k; pe += p; per.push({ ke: k, pe: p }); });
  const U = P.enabled ? P.evaluate(S.map(s => s.rot)).U : 0; return { E: ke + pe + U, ke, pe, U, per };
}
// world inverse inertia of body i in state s (spec inertia is in the body frame)
export function invInertiaW(spec, i, s) { const I = spec.bodies[i].inertia, inv = inv3(I), R = q2m(s.rot); return mul3(mul3(R, inv), tr3(R)); }
export function effMassAgainstStatic(spec, i, s, p, n) { const r = V.sub(p, s.com), rn = V.cross(r, n), Iw = invInertiaW(spec, i, s), a = mv3(Iw, rn); return 1 / (1 / spec.bodies[i].mass + V.dot(rn, a)); }
export const velAt = (s, p) => V.add(s.v, V.cross(s.w, V.sub(p, s.com)));
function q2m(q) { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; }
const tr3 = (A) => [0, 1, 2].map(i => [0, 1, 2].map(j => A[j][i])), mul3 = (A, B) => [0, 1, 2].map(i => [0, 1, 2].map(j => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j])), mv3 = (A, v) => [0, 1, 2].map(i => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]);
function inv3(m) { const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, k] = m[2], A = e * k - f * h, B = -(d * k - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A / det, -(b * k - c * h) / det, (b * f - c * e) / det], [B / det, (a * k - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]]; }
// world → centre-of-mass local frame of a body state
export const toLocal = (s, p) => Q.rot(Q.conj(s.rot), V.sub(p, s.com));

// ═══ dribble1/d1_rng.js — the simulator's KeyedRNG (simulator/fc_simulator/rng.py) in JavaScript: deterministic semantic child streams ═══
// Every draw is a pure function of "seed|part|part|…" (BLAKE2b, 8-byte digest, big-endian u64), exactly as rng.py — no mutable cursor, so an unrelated
// draw can never shift later results. uniform() is bit-identical to Python's KeyedRNG.uniform for the same seed and key parts. normal() uses rng.py's
// Box–Muller construction (private "n1" / "n2" component keys) with engine-independent log / cos (dlog below, v2_math dcos): it agrees with Python to
// ~1e-15 and is bit-identical across JavaScript engines. An audit log (key, key id, value) is kept when enabled.
import { dcos } from "../physchar2/core/v2_math.js";
const M64 = (1n << 64n) - 1n, IV = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n];
const SIGMA = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3], [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4], [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13], [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9], [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11], [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5], [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]];
const rotr = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
function compress(h, block, t, last) {
  const m = []; for (let i = 0; i < 16; i++) { let w = 0n; for (let b = 7; b >= 0; b--) w = (w << 8n) | BigInt(block[i * 8 + b]); m.push(w); }
  const v = h.concat(IV); v[12] ^= t & M64; v[13] ^= (t >> 64n) & M64; if (last) v[14] ^= M64;
  const G = (a, b, c, d, x, y) => { v[a] = (v[a] + v[b] + x) & M64; v[d] = rotr(v[d] ^ v[a], 32); v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 24);
    v[a] = (v[a] + v[b] + y) & M64; v[d] = rotr(v[d] ^ v[a], 16); v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 63); };
  for (let r = 0; r < 12; r++) { const s = SIGMA[r % 10];
    G(0, 4, 8, 12, m[s[0]], m[s[1]]); G(1, 5, 9, 13, m[s[2]], m[s[3]]); G(2, 6, 10, 14, m[s[4]], m[s[5]]); G(3, 7, 11, 15, m[s[6]], m[s[7]]);
    G(0, 5, 10, 15, m[s[8]], m[s[9]]); G(1, 6, 11, 12, m[s[10]], m[s[11]]); G(2, 7, 8, 13, m[s[12]], m[s[13]]); G(3, 4, 9, 14, m[s[14]], m[s[15]]); }
  for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
}
// BLAKE2b, unkeyed, digest length `outLen` bytes (rng.py: digest_size = 8) → Uint8Array
export function blake2b(bytes, outLen = 8) {
  const h = IV.slice(); h[0] ^= 0x01010000n ^ BigInt(outLen);
  let t = 0n; const n = bytes.length, block = new Uint8Array(128); let off = 0;
  if (n === 0) { compress(h, block, 0n, true); }
  while (off < n) { const take = Math.min(128, n - off); block.fill(0); block.set(bytes.subarray(off, off + take)); off += take; t += BigInt(take); compress(h, block, t, off >= n); }
  const out = new Uint8Array(outLen); for (let i = 0; i < outLen; i++) out[i] = Number((h[i >> 3] >> BigInt(8 * (i & 7))) & 0xffn); return out;
}
const enc = new TextEncoder(), hex = (u) => Array.from(u, b => b.toString(16).padStart(2, "0")).join("");
// deterministic natural log (argument reduction by powers of two, atanh series) — Math.log is not specified to be bit-identical across engines
export function dlog(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN; let e = 0; while (x >= 2) { x /= 2; e++; } while (x < 1) { x *= 2; e--; }
  if (x > Math.SQRT2) { x /= 2; e++; } const z = (x - 1) / (x + 1), z2 = z * z; let s = 0, p = z; for (let k = 1; k < 60; k += 2) { const t = p / k; s += t; if (Math.abs(t) < 1e-18) break; p *= z2; }
  return 2 * s + e * 0.6931471805599453;
}
export class KeyedRNG {
  constructor(seed, audit = false) { this.seed = Math.trunc(Number(seed)); this.audit = !!audit; this.log = []; }
  keyText(...parts) { return [String(this.seed), ...parts.map(String)].join("|"); }
  keyId(...parts) { return hex(blake2b(enc.encode(this.keyText(...parts)), 8)); }
  u64(...parts) { const d = blake2b(enc.encode(this.keyText(...parts)), 8); let v = 0n; for (const b of d) v = (v << 8n) | BigInt(b); return v; }
  base(...parts) { return (Number(this.u64(...parts)) + 0.5) / 18446744073709551616; }
  rec(dist, value, parts) { if (this.audit) this.log.push({ distribution: dist, key_id: this.keyId(...parts), key: parts.map(String), value }); return value; }
  uniform(...parts) { return this.rec("uniform", this.base(...parts), parts); }
  normal(...parts) { const u1 = Math.max(1e-12, this.base(...parts, "n1")), u2 = this.base(...parts, "n2"); return this.rec("normal", Math.sqrt(-2 * dlog(u1)) * dcos(2 * Math.PI * u2), parts); }
}

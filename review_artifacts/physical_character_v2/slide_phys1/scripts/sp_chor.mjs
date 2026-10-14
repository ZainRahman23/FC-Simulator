// SLIDE-PHYS-1 choreography tools: keyed anatomical joint tracks (deg) on the action clock t (s, t = 0 at the committed-entry touchdown),
// shape-preserving monotone cubic interpolation (Fritsch–Carlson PCHIP: no overshoot between keys, C¹), per-key timing so that different
// segments peak at different times (overlap is authored, not added as noise). A choreography = { name, tracks: { "joint.key": [[t, deg], …] },
// root: optional authored pelvis world path for analysis / COM objectives }.
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, JN } = L;
export function pchip(keys) { const n = keys.length, x = keys.map(k => k[0]), y = keys.map(k => k[1]);
  if (n === 1) return { f: () => y[0], d: () => 0 };
  const h = [], dl = []; for (let i = 0; i < n - 1; i++) { h[i] = x[i + 1] - x[i]; dl[i] = (y[i + 1] - y[i]) / h[i]; }
  const m = new Array(n).fill(0); m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (let i = 1; i < n - 1; i++) { if (dl[i - 1] * dl[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]); } }
  // end slopes: one-sided, limited (Fritsch–Carlson end condition)
  const endSlope = (d0, d1, h0, h1) => { let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(s) !== Math.sign(d0)) s = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > Math.abs(3 * d0)) s = 3 * d0; return s; };
  if (n > 2) { m[0] = endSlope(dl[0], dl[1], h[0], h[1]); m[n - 1] = endSlope(dl[n - 2], dl[n - 3], h[n - 2], h[n - 3]); }
  const seg = (t) => { if (t <= x[0]) return -1; if (t >= x[n - 1]) return n - 1; let i = 0; while (t > x[i + 1]) i++; return i; };
  const f = (t) => { const i = seg(t); if (i < 0) return y[0]; if (i >= n - 1) return y[n - 1]; const s = (t - x[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h[i] * m[i + 1]; };
  const d = (t) => { const i = seg(t); if (i < 0 || i >= n - 1) return 0; const s = (t - x[i]) / h[i], s2 = s * s;
    return ((6 * s2 - 6 * s) * y[i] + (3 * s2 - 4 * s + 1) * h[i] * m[i] + (-6 * s2 + 6 * s) * y[i + 1] + (3 * s2 - 2 * s) * h[i] * m[i + 1]) / h[i]; };
  return { f, d }; }
export function compile(ch) { const T = {}; for (const [k, keys] of Object.entries(ch.tracks)) T[k] = pchip(keys);
  const anatAt = (t) => { const o = {}; for (const [k, P] of Object.entries(T)) { const [jn, key] = k.split("."); (o[jn] = o[jn] || {})[key] = P.f(t); } return o; };
  const rateAt = (t) => { const o = {}; for (const [k, P] of Object.entries(T)) { const [jn, key] = k.split("."); (o[jn] = o[jn] || {})[key] = P.d(t); } return o; };
  return { ...ch, T, anatAt, rateAt }; }
// constraint-space joint target quaternions for anatomical angles (identity parent → child rotation → the plant's own qcs convention)
export const jointTargets = (anat) => JN.map(j => L.IL.qcs(j, [0, 0, 0, 1], L.childRotation(j, [0, 0, 0, 1], anat[j.name] || {})));
// limit audit (anatomical active / hard ROM of the V2 spec) of an anatomical pose
export function romAudit(anat) { const out = []; for (const j of JN) { const a = anat[j.name] || {}; for (const [key, r] of Object.entries(j.def.rom || {})) { const v = a[key] ?? 0, ex = Math.max(r.hard[0] - v, v - r.hard[1], 0), ea = Math.max(r.active[0] - v, v - r.active[1], 0);
  if (ea > 0) out.push({ joint: j.name, key, deg: +v.toFixed(1), active: r.active, hard: r.hard, beyondActive: +ea.toFixed(1), beyondHard: +ex.toFixed(1) }); } } return out; }

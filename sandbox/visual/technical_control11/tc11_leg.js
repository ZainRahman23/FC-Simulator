// ═══ technical_control11/tc11_leg.js — TECHNICAL-CONTROL-1.1 (feet / ankles / lower-leg IK): THE ANATOMICAL LEG ══════════════════════════════════
// The leg as one coordinated chain — pelvis → hip → thigh → knee → shin → ankle → foot → contact surface — with anatomical ranges of motion and
// the order in which the joints take a foot's orientation: the hip's rotation turns the whole leg (the knee follows the foot), the tibia adds a
// little axial rotation once the knee is bent, the ankle (talocrural pitch, subtalar roll, a few degrees of forefoot abduction) is the last, small
// correction. Nothing here is read by the simulation.
// Frames: the rig's root frame (+x the player's right, +y up, +z forward); bind = identity. Local rotations:
//   thigh = Ry(ψ)·Rz(a)·Rx(−h)   (RUN-1.3: ψ the leg plane's yaw = the knee's direction, a adduction, h flexion)
//   shin  = Rx(k)·Ry(τ)          (the knee's flexion k, then the tibia's axial rotation τ about the shin's own long axis)
//   foot  = Ry(fy)·Rx(fp)·Rz(fr) (forefoot abduction about the shin's axis, talocrural plantarflexion, subtalar roll)
// Anatomical signs (sx = +1 right leg, −1 left): hip external rotation = sx·twist(femur) (swing–twist about the femur's axis), knee flexion = k,
// tibial external rotation = sx·τ, ankle dorsiflexion = −fp, inversion = −sx·fr, toe-out abduction = sx·fy.
export const DEG = Math.PI / 180;
const hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), abs = Math.abs;
// ── rotations (row-major 3×3, as RUN-1.3's R3) ─────────────────────────────────────────────────────────────────────────────────────────────────
export const Q = {
  I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  x(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },
  y(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  z(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
  mul(A, B) { return [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8], A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8], A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]]; },
  mul3(A, B, C) { return Q.mul(Q.mul(A, B), C); },
  tr: (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]],
  v: (A, p) => [A[0] * p[0] + A[1] * p[1] + A[2] * p[2], A[3] * p[0] + A[4] * p[1] + A[5] * p[2], A[6] * p[0] + A[7] * p[1] + A[8] * p[2]],
  yxz: (y, x, z) => Q.mul3(Q.y(y), Q.x(x), Q.z(z)),
  toYXZ(R) { const x = Math.asin(clamp(-R[5], -1, 1)), cx = Math.cos(x); if (abs(cx) < 1e-9) return [Math.atan2(-R[6], R[0]), x, 0]; return [Math.atan2(R[2], R[8]), x, Math.atan2(R[3], R[4])]; },
  log(R) { const c = clamp((R[0] + R[4] + R[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0];
    if (Math.PI - a < 1e-6) { const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2)); return [x * a, y * a, z * a]; }
    const s = 2 * Math.sin(a); return [(R[7] - R[5]) / s * a, (R[2] - R[6]) / s * a, (R[3] - R[1]) / s * a]; },
  exp(r) { const a = hyp(r[0], r[1], r[2]); if (a < 1e-12) return Q.I(); const x = r[0] / a, y = r[1] / a, z = r[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
    return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; },
  angle(A, B) { const T = Q.mul(Q.tr(A), B); return Math.acos(clamp((T[0] + T[4] + T[8] - 1) / 2, -1, 1)); },
  slerp(A, B, t) { if (t <= 0) return A; if (t >= 1) return B; const d = Q.log(Q.mul(Q.tr(A), B)); return Q.mul(A, Q.exp([d[0] * t, d[1] * t, d[2] * t])); },
  // the rotation taking unit a onto unit b by the shortest arc
  arc(a, b) { const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], ax = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s = hyp(ax[0], ax[1], ax[2]);
    if (s < 1e-9) return c > 0 ? Q.I() : Q.exp([Math.PI, 0, 0]); const ang = Math.atan2(s, c); return Q.exp([ax[0] / s * ang, ax[1] / s * ang, ax[2] / s * ang]); },
};
// ── RANGES OF MOTION (degrees, anatomical signs). HARD: never exceeded (the solver saturates there, smoothly); COMFORT: where a football action
// normally lives (the planner aims inside it). Tibial rotation grows with knee flexion (locked when the knee is straight — the screw-home).
// Sources: the project's V2 planning box (RUN-1.3 R1_LIMITS: hip rot −45…40, knee 0…150, ankle DF −55…40, inversion ±25) narrowed to a
// footballer's active ranges: ankle DF 30 / PF 50, inversion 22 / eversion 18, forefoot abduction ±10, hip IR 38 / ER 45, knee ≥ 4° (never locked
// straight or hyperextended), tibial ER 5 → 32 / IR 3 → 20 between a straight and a 90°-bent knee. (The approved running gait, RUN-1, reaches
// DF 31° in late stance and everts 18°: the hard box contains it; the comfort box is a footballer's working range.)
export const ROM = {
  hard: { hip: [-38, 45], knee: [4, 148], df: [-50, 30], inv: [-18, 22], abd: [-10, 10] },
  comfort: { hip: [-26, 36], knee: [6, 140], df: [-42, 20], inv: [-11, 15], abd: [-6, 6] },
  tib(kDeg, comfort) { const s = clamp(kDeg / 90, 0, 1); return comfort ? [-(2 + 12 * s), 3 + 20 * s] : [-(3 + 17 * s), 5 + 27 * s]; },
};
// a smooth saturation of x into [lo, hi]: identity well inside, C¹ into the bound over the last `soft` degrees (never a kink, never past the bound)
export function soft(x, lo, hi, w) { w = Math.min(w == null ? 4 : w, (hi - lo) / 3); const a = lo + w, b = hi - w;
  if (x > b) { const u = (x - b) / w; return b + w * (1 - Math.exp(-u)); } if (x < a) { const u = (a - x) / w; return a - w * (1 - Math.exp(-u)); } return x; }
// ── the angles of a posed leg (local rotations) ────────────────────────────────────────────────────────────────────────────────────────────────
export function femurTwist(Rt) { const d = Q.v(Rt, [0, -1, 0]), S = Q.arc([0, -1, 0], d), T = Q.mul(Q.tr(S), Rt); return Math.atan2(T[2], T[0]); }
export function legAngles(rot, X) {
  const sx = X === "R" ? 1 : -1, Rt = rot["thigh_" + X], Rs = rot["shin_" + X], Rf = rot["foot_" + X], d = Q.v(Rt, [0, -1, 0]);
  const k = Math.atan2(Rs[7], Rs[4]), M = Q.mul(Q.x(-k), Rs), tau = Math.atan2(M[2], M[0]), f = Q.toYXZ(Rf);
  const o = { hipFlex: Math.atan2(d[2], -d[1]) / DEG, hipAbd: sx * Math.atan2(d[0], hyp(d[1], d[2])) / DEG, hipRot: sx * femurTwist(Rt) / DEG, knee: k / DEG, tib: sx * tau / DEG,
    df: -f[1] / DEG, inv: -sx * f[2] / DEG, abd: sx * f[0] / DEG };
  o.footYawShin = o.tib + o.abd; return o;
}
// the exceedance of each angle over a range set (degrees beyond; 0 inside)
export function overROM(a, set) { const R = set === "comfort" ? ROM.comfort : ROM.hard, tb = ROM.tib(a.knee, set === "comfort"), ex = (x, r) => (x < r[0] ? r[0] - x : x > r[1] ? x - r[1] : 0);
  return { hip: ex(a.hipRot, R.hip), knee: ex(a.knee, R.knee), tib: ex(a.tib, tb), df: ex(a.df, R.df), inv: ex(a.inv, R.inv), abd: ex(a.abd, R.abd) }; }
// ── THE BOOT (DRIBBLE-1's boot collider: the inner hull of the boot's vertices, foot-bone frame, origin the ankle joint) and its surfaces ─────────
// face planes (n·p ≤ d) built once from the hull points; the gap between the ball and the boot = the largest face distance of the ball's centre
// minus the radius (exact over a face, a slight underestimate at an edge); the face nearest the ball names the surface that actually meets it
export function bootHull(points) {
  const P = points, F = [], seen = new Set();
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) for (let k = j + 1; k < P.length; k++) {
    const a = P[i], b = P[j], c = P[k], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = hyp(n[0], n[1], n[2]); if (l < 1e-7) continue; n = n.map((x) => x / l);
    let d = n[0] * a[0] + n[1] * a[1] + n[2] * a[2], pos = 0, neg = 0; for (const p of P) { const s = n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - d; if (s > 1e-6) pos++; else if (s < -1e-6) neg++; }
    if (pos && neg) continue; if (pos) { n = n.map((x) => -x); d = -d; } const key = n.map((x) => x.toFixed(3)).join() + "|" + d.toFixed(4); if (seen.has(key)) continue; seen.add(key); F.push({ n, d }); }
  return F;
}
// the surface a boot face belongs to, by its outward normal in the foot frame (x lateral for the right foot)
export function faceSurface(n, X) { const sx = X === "R" ? 1 : -1, lat = n[0] * sx; if (n[1] < -0.6) return "SOLE"; if (lat < -0.55) return "INSIDE"; if (lat > 0.55) return "OUTSIDE"; if (n[2] > 0.6 && n[1] < 0.5) return "TOE"; if (n[2] < -0.6) return "HEEL"; return "LACES"; }
export function ballGap(faces, X, Rfoot, ankle, ball, R) {
  const d = [ball[0] - ankle[0], ball[1] - ankle[1], ball[2] - ankle[2]], q = Q.v(Q.tr(Rfoot), d);   // the ball's centre in the boot's frame (each side's own hull)
  let best = -1e9, bf = null; for (const f of faces) { const s = f.n[0] * q[0] + f.n[1] * q[1] + f.n[2] * q[2] - f.d; if (s > best) { best = s; bf = f; } }
  return { gap: best - R, face: faceSurface(bf.n, X), n: bf.n };
}
// the contact surface's working direction in the foot frame: the way that surface pushes the ball (its outward normal; the laces push along the
// pointing foot; the sole presses down)
export function surfaceDir(surface, X) { const sx = X === "R" ? 1 : -1;
  if (surface === "INSIDE") return [-sx, 0, 0]; if (surface === "OUTSIDE") { const l = hyp(0.9, 0.42); return [sx * 0.9 / l, 0, 0.42 / l]; } if (surface === "SOLE") return [0, -1, 0]; return [0, 0.35, 0.94]; }
// ── THE CHAIN SOLVE ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// two-bone IK in the leg frame Rp·Ry(ψ) (RUN-1.3's r1LegIK) with a SOFT knee-extension limit: the hip – ankle distance saturates smoothly at the
// length of a knee bent kMin, so the leg never locks straight (the ankle then falls short of its target along the hip – ankle line; the body's
// pelvis adaptation keeps that rare and small)
export function legIK(b, Rp, psi, hip, ankle, kMin) {
  const F = Q.mul(Rp, Q.y(psi)), D = Q.v(Q.tr(F), [ankle[0] - hip[0], ankle[1] - hip[1], ankle[2] - hip[2]]), t = b.thigh, s = b.shank;
  const a = Math.atan2(D[0], -D[1]), r = hyp(D[0], D[1]), dW = hyp(r, D[2]), dMax = Math.sqrt(t * t + s * s + 2 * t * s * Math.cos(kMin)), w = 0.025, d = dW > dMax - w ? dMax - w * Math.exp(-(dW - (dMax - w)) / w) : dW;
  const k = Math.acos(clamp((d * d - t * t - s * s) / (2 * t * s), -1, 1)), alpha = Math.acos(clamp((t * t + d * d - s * s) / (2 * t * d), -1, 1)), h = Math.atan2(D[2], r) + alpha;
  return { a, h, k, d, dW, short: dW - d, Rthigh: Q.mul3(Q.y(psi), Q.z(a), Q.x(-h)) };
}
// the foot's yaw relative to the pelvis (toe-out positive for either leg), from a root-frame foot orientation
export function footOut(Rp, Rf, X) { const f = Q.v(Q.tr(Rp), Q.v(Rf, [0, 0, 1])), sx = X === "R" ? 1 : -1; return sx * Math.atan2(f[0], f[2]); }
// THE YAW HIERARCHY: of a foot's toe-out relative to the pelvis, the hip's rotation takes all but the tibia's and the forefoot's small shares;
// the hip saturates (softly) in its range — what it cannot take stays for the tibia (knee bent) and the forefoot, then is an orientation error
export const SPLIT = { tib: 0.14, abd: 0.06 };
export function swivelFor(out, X) { return (X === "L" ? -1 : 1) * soft(out / DEG * (1 - SPLIT.tib - SPLIT.abd), ROM.hard.hip[0] + 2, ROM.hard.hip[1] - 2, 6) * DEG; }
// the ankle for a foot orientation Rf (root frame) on a shin Rsh0 (root frame, before the tibia's axial rotation): the axial remainder is split
// between the tibia (in its knee-dependent range) and the forefoot's abduction; plantarflexion and the subtalar roll are each saturated softly in
// their ranges. Returns the joint values and the orientation error (deg) the ranges left.
export function ankleFor(Rsh0, Rf, X, kRad, tauWant) {
  const sx = X === "R" ? 1 : -1, M = Q.mul(Q.tr(Rsh0), Rf), e = Q.toYXZ(M), kD = kRad / DEG, tb = ROM.tib(kD, false);
  const tau = tauWant != null ? tauWant : sx * soft(sx * e[0] / DEG * (SPLIT.tib / (SPLIT.tib + SPLIT.abd)), tb[0], tb[1], 3) * DEG;
  const Mr = Q.mul(Q.y(-tau), M), f = Q.toYXZ(Mr), H = ROM.hard;
  const fy = sx * soft(sx * f[0] / DEG, H.abd[0], H.abd[1], 3) * DEG, fp = -soft(-f[1] / DEG, H.df[0], H.df[1], 5) * DEG, fr = -sx * soft(-sx * f[2] / DEG, H.inv[0], H.inv[1], 4) * DEG;
  const Rfoot = Q.yxz(fy, fp, fr), err = Q.angle(Mr, Rfoot) / DEG; return { tau, fy, fp, fr, Rfoot, err, res: [f[0] - fy, f[1] - fp, f[2] - fr] };
}
// joint-space keys → a C¹ monotone cubic per channel (Fritsch – Carlson: no overshoot between keys, so a key inside a range keeps the curve in it)
export function pchip(keys, n) {
  const m = keys.length, out = { keys, d: [] }; if (m < 2) return out; const h = [], dl = [];
  for (let i = 0; i < m - 1; i++) { h[i] = Math.max(1e-6, keys[i + 1].t - keys[i].t); dl[i] = []; for (let c = 0; c < n; c++) dl[i][c] = (keys[i + 1].v[c] - keys[i].v[c]) / h[i]; }
  for (let i = 0; i < m; i++) { out.d[i] = []; for (let c = 0; c < n; c++) {
    if (keys[i].s && keys[i].s[c] != null) { out.d[i][c] = keys[i].s[c]; continue; }
    if (i === 0) { out.d[i][c] = dl[0][c]; continue; } if (i === m - 1) { out.d[i][c] = dl[m - 2][c]; continue; }
    const a = dl[i - 1][c], b = dl[i][c]; if (a * b <= 0) { out.d[i][c] = 0; continue; } const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; out.d[i][c] = (w1 + w2) / (w1 / a + w2 / b); } }
  return out;
}
export function pchipAt(P, t, n) {
  const K = P.keys, m = K.length; if (m === 1 || t <= K[0].t) return K[0].v.slice(); if (t >= K[m - 1].t) return K[m - 1].v.slice(); let i = 0; while (i < m - 2 && t > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], H = b.t - a.t, u = (t - a.t) / H, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2, o = [];
  for (let c = 0; c < n; c++) o[c] = h00 * a.v[c] + h10 * H * P.d[i][c] + h01 * b.v[c] + h11 * H * P.d[i + 1][c]; return o;
}

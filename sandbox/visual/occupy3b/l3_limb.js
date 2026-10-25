// ═══ occupy3b/l3_limb.js — PLAYER OCCUPANCY STAGE 3B.1: THE LIMB (pure mechanics, no world) ════════════════════════════════════════════════
// What physically happens to a SWINGING leg that meets the opponent. The leg as drawn is the authored leg (the canonical footballer's) plus a
// small PERTURBATION q with its own velocity q̇ — never a second animation:
//   q[0]  ab/adduction at the hip — the whole leg rotated about the body's FORWARD axis through the hip joint
//   q[1]  flexion/extension at the hip — about the body's LATERAL axis through the hip joint
//   q[2]  the knee's SWIVEL — the thigh and shin rotated about the hip→ankle line (the knee moves, the ankle does not)
// composed G = R(f, q0) · R(l, q1) · R(u, q2) about the hip H: a thigh / shin point x is drawn at H + G (x − H); the FOOT keeps its authored
// orientation and moves with the ankle (the ankle joint takes up the difference). The knee's flexion is never changed (rigid hip rotations and
// the swivel keep the hip–ankle distance): no knee angle is introduced that the authored pose did not have.
// THE INERTIA: the generalized mass matrix of the three DOFs from the leg's own segments (thigh and shin as uniform rods — Simpson's rule is
// exact for them — the foot moving with the ankle), the rig's mass fractions of the equal 73 kg body. A contact point x along a normal n has the
// effective inverse mass w = jᵀ M⁻¹ j, j_i = n · (e_i × (x − H)) — the leg rotating about its hip, the body behind the hip held for the instant.
// THE CONTACT (velocity level, inelastic, frictionless — the tangential motion is never touched: a leg slides along another): the contact points'
// relative normal velocity (physical: the body's velocity + the authored limb's articulated velocity + the perturbation's) removed by one impulse
// λ ≥ 0 per pair and Gauss–Seidel pass, λ = −v_n / (w_A + w_B) — never more than that closing permits (the BOUND). The limb is light against its
// body: the contact point's momentum change λ (its normal speed changed by w λ) is what the limb lost, and its hip passes that whole impulse to
// its own body (THROUGH THE HIP); a body side (a planted leg, the trunk) takes it at the contact point; a limb at its range is part of its body
// for that contact (the body's effective mass at the point). Equal and opposite, every time: the only momentum a limb contact creates anywhere.
// The limb's own deflection (Δq̇ = M⁻¹ j λ) is its YIELD, drawn: kinematic, it carries no second momentum (the canonical limb's motion is not
// a momentum ledger either) — so neither its return to the authored path nor its range stop can push a body.
// YIELD of a held contact: the authored limb's own acceleration into a contact already resolved is not executed (the reference moved, the limb
// did not: no impulse — a swing does not press by animation); the reconcile never pushes into a held contact unless the landing must happen.
// RECONCILE: q → 0 by a critically damped drive (ω_n), faster before a landing (the foot must land where its stance is — a planted foot never
// moves) and before a ball touch (still yielding: a touch the limb cannot reach in time is denied, never forced).
// POSITION: overlap beyond the tolerance is projected out of the limb (no drawn leg joint moving more than posCap a tick, never the body, never a planted leg) — positional only,
// recorded apart from every impulse.
export const RES3B = {
  tol: 0.02,          // m: the contact tolerance (Stage 1's measurement, Stage 2's, Stage 3's penMin): a limb responds beyond it
  hyst: 0.08,         // m: a held pair (per limb and per SWING: a leg that struck an opponent's leg does not strike it again in the same swing) is
                      // released only once the two are clearly apart (pen < tol − hyst: a 6 cm gap) — until then the limb yields to it: its own authored
                      // motion and the reconcile never drive it back in (a limb pushed off a leg does not press again)
  artTicks: 3,        // the authored articulated velocity over 3 ticks (Stage 3's measure: a re-plan blend moves a drawn leg a few mm in one tick)
  artCap: { THIGH: 3.0, SHIN: 4.5, FOOT: 6.0 },   // m/s: a knee / shin / boot's speed relative to its own body — beyond it a blend, not momentum
  lim: [12, 20, 20],  // deg: the perturbation's range about the authored pose — hip ab/adduction, flexion/extension, the knee's swivel
  qdMax: 12,          // rad/s: the perturbation's speed (a leg pushed aside; the reconcile) — qdLand inside the landing window (the swing arriving)
  qdLand: 25,
  wn: 18,             // rad/s: the reconcile drive (critically damped: ≈ 0.25 s to settle)
  landWin: 0.25, landK: 5,   // a landing (or a touch) within landWin s: ω_n ≥ landK / τ — the foot arrives in time
  landForce: 0.06,    // s: inside this the swing must arrive (landing priority): the yield is lifted, an obstruction reported (Stage 3B.2 / 3B.3)
  posCap: 0.010,      // m per tick: the positional projection, at the contact point and at every drawn joint of the leg (≈ 2.4 m/s — no snap)
  iters: 4,           // Gauss–Seidel passes over the tick's contacts
  faceLo: 0.15, faceHi: 0.30,   // |sin Δψ|: the FACE RULE (near-parallel bodies: the stable side-on normal), blended out between these
  touchTol: 0.02,     // m: a touch (or the tackle's boot) whose foot the limb contact displaced further than this is denied (Stage 3's geometry rule)
};
const DEG = Math.PI / 180;
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]), unit = (a, d = [1, 0, 0]) => { const m = len(a); return m > 1e-12 ? [a[0] / m, a[1] / m, a[2] / m] : d; };
// Rodrigues: rotation by th about the unit axis u (row-major 3×3)
export function rot(u, th) { const c = Math.cos(th), s = Math.sin(th), C = 1 - c, [x, y, z] = u;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
export const mv = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
export const mm = (A, B) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]));
// the body's frame at a pose: f forward, l lateral (the pose's own right: the canonical body's model x axis), from the drawn facing ψ
export const frameOf = (psi) => ({ f: [Math.cos(psi), Math.sin(psi), 0], l: [-Math.sin(psi), Math.cos(psi), 0] });
// the perturbation's rotation and DOF axes (world) for an authored leg {H, K, A, B, T} (hip, knee, ankle, ball of the foot, toe tip)
export function legPose(auth, q, fr) { const u = unit(sub(auth.A, auth.H), [0, 0, -1]), Ra = rot(fr.f, q[0]), Rb = rot(fr.l, q[1]), G = mm(mm(Ra, Rb), rot(u, q[2]));
  const H = auth.H, K = add(H, mv(G, sub(auth.K, H))), A = add(H, mv(G, sub(auth.A, H))), d = sub(A, auth.A);
  return { G, u, H, K, A, B: add(auth.B, d), T: add(auth.T, d), d, e: [fr.f, mv(Ra, fr.l), mv(mm(Ra, Rb), u)] }; }
// the authored leg from the drawn one (the exact inverse: thigh / shin rotated back about the hip, the foot translated back with the ankle)
export function legAuthored(drawn, q, fr) { // (G depends on the authored ankle's direction: G = Ra Rb Ru(u), and the drawn ankle = H + Ra Rb (A − H) — u from it)
  const Ra = rot(fr.f, q[0]), Rb = rot(fr.l, q[1]), RabT = transpose(mm(Ra, Rb)), H = drawn.H, A = add(H, mv(RabT, sub(drawn.A, H))), u = unit(sub(A, H), [0, 0, -1]);
  const GT = transpose(mm(mm(Ra, Rb), rot(u, q[2]))), K = add(H, mv(GT, sub(drawn.K, H))), d = sub(drawn.A, A);
  return { H, K, A, B: sub(drawn.B, d), T: sub(drawn.T, d) }; }
export const transpose = (R) => [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
// the point of a drawn leg volume: seg THIGH (H→K), SHIN (K→A), FOOT (A→B) at parameter s; its Jacobian columns e_i × (x − H) (the foot moves
// with the ankle: its columns are the ankle's)
export function pointOf(P, seg, s) { const [a, b] = seg === "THIGH" ? [P.H, P.K] : seg === "SHIN" ? [P.K, P.A] : [P.A, P.B]; return add(a, mul(sub(b, a), s)); }
export function jacOf(P, seg, x) { const r = sub(seg === "FOOT" ? P.A : x, P.H); return P.e.map((e) => cross(e, r)); }
// THE GENERALIZED MASS MATRIX (3×3, symmetric) and the linear-momentum map L (P_limb = L q̇) of a drawn leg; masses {thigh, shin, foot} (kg)
export function massOf(P, m) { const M = new Array(9).fill(0), L = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const acc = (x, w) => { const c = P.e.map((e) => cross(e, sub(x, P.H))); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[3 * i + j] += w * dot(c[i], c[j]); };
  for (const [a, b, mass] of [[P.H, P.K, m.thigh], [P.K, P.A, m.shin]]) { acc(a, mass / 6); acc(add(a, mul(sub(b, a), 0.5)), mass * 4 / 6); acc(b, mass / 6);
    const c = add(a, mul(sub(b, a), 0.5)); for (let i = 0; i < 3; i++) { const v = cross(P.e[i], sub(c, P.H)); L[i] = add(L[i], mul(v, mass)); } }
  acc(P.A, m.foot); for (let i = 0; i < 3; i++) L[i] = add(L[i], mul(cross(P.e[i], sub(P.A, P.H)), m.foot));
  return { M, L }; }
// M⁻¹ on the free DOFs (locked rows / columns zero)
export function invFree(M, free) { const idx = [0, 1, 2].filter((i) => free[i]), n = idx.length, out = new Array(9).fill(0); if (!n) return out;
  const S = idx.map((i) => idx.map((j) => M[3 * i + j]));
  let inv; if (n === 1) inv = [[1 / S[0][0]]]; else if (n === 2) { const d = S[0][0] * S[1][1] - S[0][1] * S[1][0]; inv = [[S[1][1] / d, -S[0][1] / d], [-S[1][0] / d, S[0][0] / d]]; }
  else { const [a, b, c] = S[0], [d, e, f] = S[1], [g, h, k] = S[2], A = e * k - f * h, B = -(d * k - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
    inv = [[A / det, -(b * k - c * h) / det, (b * f - c * e) / det], [B / det, (a * k - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]]; }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[3 * idx[r] + idx[c]] = inv[r][c]; return out; }
export const mv3 = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
export const lin = (L, qd) => add(add(mul(L[0], qd[0]), mul(L[1], qd[1])), mul(L[2], qd[2]));   // the limb's perturbation linear momentum
export const vOf = (cols, qd) => add(add(mul(cols[0], qd[0]), mul(cols[1], qd[1])), mul(cols[2], qd[2]));
// which DOFs may move in the direction an impulse drives them (a DOF at its range is locked against going further)
export function freeFor(q, dq, lim) { return [0, 1, 2].map((i) => !(Math.abs(q[i]) >= lim[i] - 1e-9 && Math.sign(dq[i]) === Math.sign(q[i]) && Math.abs(dq[i]) > 1e-12)); }
// ── A LIMB SIDE of a contact: its inverse effective mass along n (n points the way the impulse pushes this side) and the Δq̇ per unit impulse ──
export function limbResp(leg, seg, x, n, X, lock = null) { const cols = jacOf(leg.P, seg, x), j = cols.map((c) => dot(c, n)); let free = lock ? lock.map((v) => !v) : [true, true, true], Mi, g, w;
  for (let pass = 0; pass < 3; pass++) { Mi = invFree(leg.MM.M, free); g = mv3(Mi, j); w = dot(j, g); const nf = freeFor(leg.q, g, X.limRad); if (nf.every((v, i) => v === free[i] || !free[i])) { if (nf.some((v, i) => !v && free[i])) { free = free.map((v, i) => v && nf[i]); continue; } break; } free = free.map((v, i) => v && nf[i]); }
  return { cols, j, g, w: Math.max(0, w), free }; }
// ── THE CONTACT SOLVE (one tick): contacts [{ key, n (from B to A, horizontal unit), pen, A: side, B: side }], a side = { kind: "LIMB", leg, seg,
// x, vBase, wBody, who } | { kind: "BODY", w, vBase, who, x } (vBase: the physical point velocity without the limb's perturbation). Mutates the
// legs' q̇ (the yield, drawn); returns every application (for the bound / energy / pairing checks) and the body impulses { who, J, at, src } ──
export function solveContacts(C, X) { const out = { apps: [], body: [] };
  const vPt = (s) => add(s.kind === "LIMB" ? add(s.vBase, vOf(jacOf(s.leg.P, s.seg, s.x), s.leg.qd)) : s.vBase, s.dv || [0, 0, 0]);
  for (const c of C) c.lam = c.lam || 0;
  for (let it = 0; it < X.iters; it++) for (const c of C) { const n = c.n, vA = vPt(c.A), vB = vPt(c.B), vn = dot(sub(vA, vB), n); if (vn >= -1e-9) continue;   // (a closing below 1e-9 m/s is none: the residual of an exact inelastic application)
    // (a limb YIELDS only while it is lighter than its body at that point (its inverse effective mass above the body's): nearly at its range it is
    // part of its body for this contact; and only within its speed (qdMax): a DOF the yield would drive past it is locked for this contact, so the
    // limb's response — and with it the impulse — is exactly what the limb can give)
    let lockA = [false, false, false], lockB = [false, false, false], rA, rB, yA, yB, wA, wB, W;
    for (let pass = 0; pass < 4; pass++) { rA = c.A.kind === "LIMB" ? limbResp(c.A.leg, c.A.seg, c.A.x, n, X, lockA) : null; rB = c.B.kind === "LIMB" ? limbResp(c.B.leg, c.B.seg, c.B.x, mul(n, -1), X, lockB) : null;
      yA = !!(rA && rA.w > c.A.wBody); yB = !!(rB && rB.w > c.B.wBody); wA = rA ? (yA ? rA.w : c.A.wBody) : c.A.w; wB = rB ? (yB ? rB.w : c.B.wBody) : c.B.w; W = wA + wB; if (!(W > 0)) break;
      const lam0 = (c.held || c.placeholder) && (yA || yB) ? -vn / ((yA ? rA.w : 0) + (yB ? rB.w : 0)) : -vn / W; let changed = false;
      for (const [s, r, y, lk] of [[c.A, rA, yA, lockA], [c.B, rB, yB, lockB]]) if (y) for (let i = 0; i < 3; i++) if (!lk[i] && Math.abs(s.leg.qd[i] + r.g[i] * lam0) > X.qdMax + 1e-9 && Math.abs(r.g[i]) > 1e-12) { lk[i] = true; changed = true; }
      if (!changed) break; }
    if (!(W > 0)) continue;
    // (a HELD contact on a limb that can still yield: all of its closing — its own authored motion, the bodies' approach — is yielded: the limb gives
    // way further, no impulse. A limb's motion sends momentum only when it STRIKES (a contact's first resolution); bodies pressing through a limb
    // reach each other only once it is at its range (then the body route, with the bodies' effective masses))
    if ((c.held || c.placeholder) && (yA || yB)) { const Wy = (yA ? rA.w : 0) + (yB ? rB.w : 0); for (const [s, r, y] of [[c.A, rA, yA], [c.B, rB, yB]]) if (y) { s.leg.qd = add(s.leg.qd, mul(r.g, -vn / Wy)); capSpeed(s.leg, X); } c.yielded = (c.yielded || 0) - vn; continue; }
    // (a contact marked PLACEHOLDER (a player under Stage 3's non-physical fall placeholder): positional only — yielded where the limb can, never an
    // impulse)
    if (c.placeholder) continue;
    // (a limb AT ITS RANGE is obstructed: it is part of its body for this contact, so only the BODIES' approach passes through it (with the bodies'
    // effective masses) — its authored swing beyond its range is not momentum (an obstructed swing: Stage 3B.3's input, recorded)
    let lam = -vn / W; if ((rA && !yA) || (rB && !yB)) { const vnB = dot(sub(add(c.A.vBody, c.A.dv || [0, 0, 0]), add(c.B.vBody, c.B.dv || [0, 0, 0])), n); lam = Math.min(lam, Math.max(0, -vnB) / W); c.obstructed = (c.obstructed || 0) + (-vn - lam * W); if (!(lam > 0)) continue; }
    c.lam += lam;
    const app = { key: c.key, it, vn, wA, wB, lam, src: -vn / W, held: !!c.held, obstructed: (rA && !yA) || (rB && !yB), keBefore: 0.5 * vn * vn / W, n: n.slice(), routeA: rA ? (yA ? "LIMB YIELDS" : "LIMB AT RANGE") : "BODY", routeB: rB ? (yB ? "LIMB YIELDS" : "LIMB AT RANGE") : "BODY" };
    for (const [s, r, y, sign, key] of [[c.A, rA, yA, 1, "A"], [c.B, rB, yB, -1, "B"]]) { const J = mul(n, lam * sign); app["J" + key] = J;
      if (y) { s.leg.qd = add(s.leg.qd, mul(r.g, lam)); capSpeed(s.leg, X); app["dvn" + key] = r.w * lam; out.body.push({ who: s.who, J, at: s.leg.P.H, src: "LIMB CONTACT — THROUGH THE HIP", key: c.key, seg: s.seg, X: s.leg.X }); }
      else { s.dv = add(s.dv || [0, 0, 0], mul(n, lam * sign * (r ? s.wBody : s.w))); app["dvn" + key] = (r ? s.wBody : s.w) * lam; out.body.push({ who: s.who, J, at: s.x, src: r ? "LIMB AT ITS RANGE — THE BODY TAKES IT" : "CONTACT (body side)", key: c.key, seg: s.seg, X: r ? s.leg.X : null, range: !!r }); } }
    const vn2 = dot(sub(vPt(c.A), vPt(c.B)), n); app.vnAfter = vn2; app.keAfter = vn2 < 0 ? 0.5 * vn2 * vn2 / W : 0; out.apps.push(app); }
  // (a held contact the solve only yielded leaves no application: its closing went into the limbs' yield, recorded on the contact)
  return out; }
// (the perturbation's speed bounded (qdMax per DOF): the yield is a limb giving way, never a limb thrown)
export function capSpeed(leg, X) { for (let i = 0; i < 3; i++) if (Math.abs(leg.qd[i]) > X.qdMax) leg.qd[i] = Math.sign(leg.qd[i]) * X.qdMax; }
// ── THE YIELD of a held contact: the authored limb's own acceleration into it (δ < 0 along the side's normal) is not executed — the perturbation
// cancels it at the contact point (no impulse, no reaction: the reference moved, the limb did not) ──
export function yieldInto(leg, seg, x, nSide, delta, X) { if (!(delta < 0)) return 0; const r = limbResp(leg, seg, x, nSide, X); if (!(r.w > 1e-9)) return 0;
  leg.qd = add(leg.qd, mul(r.g, -delta / r.w)); capSpeed(leg, X); return -delta; }
// ── THE RECONCILE DRIVE: q → 0, critically damped at ω; never into a held contact unless the landing must happen; the speed bounded ──
export function drive(leg, w, held, X, force) { const DT = 1 / 240; let dq = [0, 1, 2].map((i) => (-w * w * leg.q[i] - 2 * w * leg.qd[i]) * DT);
  if (!force) for (const h of held) { const r = limbResp(leg, h.seg, h.x, h.nSide, X); if (!(r.w > 1e-9)) continue; const dv = dot(r.j, dq); if (dv < 0) dq = sub(dq, mul(r.g, dv / r.w)); }
  const cap = force ? X.qdLand : X.qdMax; for (let i = 0; i < 3; i++) { const v = leg.qd[i] + dq[i]; if (Math.abs(v) > cap) dq[i] = Math.sign(v) * cap - leg.qd[i]; }
  leg.qd = add(leg.qd, dq); return dq; }
// ── THE RANGE after integration: a DOF beyond its range is held at it; its outward speed stops (the joint's end) ──
export function clampRange(leg, X) { let hit = false; for (let i = 0; i < 3; i++) { const L = X.limRad[i]; if (Math.abs(leg.q[i]) > L) { leg.q[i] = Math.sign(leg.q[i]) * L; hit = true; if (Math.sign(leg.qd[i]) === Math.sign(leg.q[i])) leg.qd[i] = 0; } } return hit; }
// ── THE POSITIONAL PROJECTION of a limb out of an overlap beyond the tolerance: Δ along the side's normal at the contact point, the kinetic-
// energy-weighted least displacement of the free DOFs; positions only. Bounded so that NO drawn joint of the leg (knee, ankle, ball of the foot,
// toe) moves more than posCap in the tick — a contact near the hip must not swing the foot (a short lever makes a large rotation); returns the
// distance actually corrected at the contact point (the rest stays for the next ticks) ──
export function project(leg, seg, x, nSide, dist, X) { const r = limbResp(leg, seg, x, nSide, X); if (!(r.w > 1e-9) || !(dist > 0)) return 0; const dq = mul(r.g, dist / r.w);
  const P0 = legPose(leg.auth, leg.q, leg.fr), P1 = legPose(leg.auth, add(leg.q, dq), leg.fr), m = Math.max(...["K", "A", "B", "T"].map((k) => len(sub(P1[k], P0[k])))), s = m > X.posCap ? X.posCap / m : 1;
  leg.q = add(leg.q, mul(dq, s)); return dist * s; }
// ── THE TURF AND THE HIP's RANGE: a perturbed leg whose drawn ankle / ball / toe goes below the turf (lower than the authored one and below its
// floor), or whose hip leaves the anatomical range (flexion −30 … 125°, abduction −30 … 45°) where the authored one did not, is brought back toward
// its previous perturbation (bisection) — positional, the speed of that DOF stopped ──
export const FLOOR = { A: 0.075, B: 0.012, T: 0.004 };
export function hipAngles(H, K, hipR, hipL, up, X) { const lat = sub(hipR, hipL), fw = cross(lat, up), th = sub(K, H), nf = len(fw) || 1, nl = len(lat) || 1, nu = len(up) || 1;
  const d = [dot(th, fw) / nf, dot(th, lat) / nl * (X === "R" ? 1 : -1), dot(th, up) / nu]; return { flex: Math.atan2(d[0], -d[2]) * 180 / Math.PI, abd: Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180 / Math.PI }; }
// (the VIOLATION of a perturbation: how far the drawn foot is below its floor (where the authored one is not), how far the hip is outside its range
// (where the authored one is not) — 0 when admissible; a move that does not make it worse is always allowed, so a leg can always come back)
export function violation(leg, q, frame) { const P = legPose(leg.auth, q, leg.fr), A = leg.auth; let v = 0;
  for (const k of ["A", "B", "T"]) v = Math.max(v, Math.min(A[k][2], FLOOR[k]) - P[k][2]);
  if (frame) { const g = hipAngles(P.H, P.K, frame.hipR, frame.hipL, frame.up, leg.X), ga = hipAngles(A.H, A.K, frame.hipR, frame.hipL, frame.up, leg.X), ex = (x) => Math.max(-30 - x.flex, x.flex - 125, -30 - x.abd, x.abd - 45, 0);
    v = Math.max(v, (Math.max(0, ex(g) - ex(ga))) * 0.01); }   // (degrees beyond the range, the authored pose's own excess allowed; 1° ≙ 1 cm)
  return Math.max(0, v); }
export function keepAdmissible(leg, q0, frame) { const v0 = violation(leg, q0, frame), v1 = violation(leg, leg.q, frame); if (v1 <= Math.max(v0, 0) + 1e-9) return false;
  // (a move straight back toward the authored pose (every DOF nearer 0, none past it) is always allowed: the authored pose is the admissible one)
  if (leg.q.every((v, i) => Math.abs(v) <= Math.abs(q0[i]) + 1e-12 && v * q0[i] >= -1e-15)) return false;
  let lo = 0, hi = 1; const at = (u) => q0.map((v, i) => v + (leg.q[i] - v) * u); for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (violation(leg, at(m), frame) <= v0 + 1e-9) lo = m; else hi = m; }
  leg.q = at(lo); leg.qd = mul(leg.qd, lo); return true; }

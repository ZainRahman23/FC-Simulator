// ═══ phys1/ratings.js — PLAYER PHYSICAL RATINGS V1 (owner, 22 Oct): SPRINT SPEED · ACCELERATION · AGILITY as attributes ═════════════════════
// The 99 anchors are the owner's decisions, kept EXACT: Sprint Speed 99 = 38.0 km/h · Acceleration 99 = D38 · Agility 99 = A99-C (a 99 / 99 /
// 99 player is bit-identical to the S99 build — tools/r_equiv.mjs). Ball off; Dribbling / Ball Control are not calibrated here.
//
// SPRINT SPEED (owner-approved, exact): the ball-off sustainable top speed. Piecewise linear, continuous at 39 / 40 and 89 / 90:
//   90–99  35.3 + 0.3 · (r − 90) km/h   ·   40–89  25.3 + 0.2 · (r − 40)   ·   1–39  21.4 + 0.1 · (r − 1)     (the rating clamped to 1–99)
//   computed in integer tenths of a km/h — 99 is exactly 38.0 km/h (= the S99 build's 38 / 3.6 m/s), 80 exactly 33.3 km/h = 9.25 m/s
//
// ACCELERATION (provisional): how quickly the speed approaches the speed available now — never the top speed. A CAPABILITY c per rating, the
// owner's three bands (90–99 1.5 points per rating · 40–89 1.0 · 1–39 0.5; 99 = 100 %, 80 = 76.5 %, 50 = 46.5 %, 1 = 17 %), and c MEANS a
// measurable thing: the mean, over the 25 / 50 / 70 / 80 / 90 / 95 % milestones of the available vmax, of (Acc99's time ÷ this rating's time),
// at the same top speed — the rating's normalised velocity-acquisition rate. The curve is D38's family a(v) = a0 · max(1 − (v / vmax)^p, e)
// with its SHAPE changing, not D38 × c:
//   p     = 1 + 1.2 · c^1.5     the persistence through the middle speeds falls first (D38 2.2 → Acc80 1.80 → Acc50 1.38 → Acc20 1.16)
//   aEnd  = 0.7 · c             the late taper's floor (vmax is still reached)
//   a0    = D38's launch × L    L solved (bisection) so that the measured capability is exactly c — the launch keeps more of D38 than the build
// ACCELERATION 99 = the D38 profile object itself.
//
// AGILITY (three provisional scales): how quickly and efficiently the movement can be REDIRECTED — never the top speed, the acceleration after a
// turn, input latency or ball skill. A CAPABILITY g per rating and scale (A compressed · B balanced · C pronounced; 99 = 1 on all three), driving
// A99-C's own redirection envelope through the REDIRECTION DEMAND of each new heading request (s_movement.js envelope()):
//   demand  Dm = clamp( (min(s / 10.56, 1.2) · sin(θ / 2))^1.5 + 0.6 · clamp(s · |ω| / 12), 0, 1 )
//                the velocity change the request asks for (|Δv| = 2 s sin(θ/2), normalised by the 99 player's top speed) — a 15° adjustment at
//                20 km/h is 0.02, a 90° cut at 38 km/h 0.59, a 180° at top speed 1 — plus the travel's own turning (a request while already
//                turning hard, s|ω| m/s², is more demanding: repeated steering, circles)
//   reorientation duration × (1 + KT · (1 − g) · Dm)                      KT = 2.0  (more time, more braking / support steps)
//   retention   A99-C's retention ^ (1 + KL · (1 − g) · Dm)              KL = 4.5  (more speed sacrifice, smoothly at every angle: the exponent
//                ≥ 1, so never above A99-C's ceiling; a 180° keeps 0 % at any rating; a gentle retarget, A99-C's 1.0, stays 1.0 — nothing granted)
//   a HELD CURVE (a request that keeps turning while the travel already turns: the motion's entry turn rate ω0) is run at no more than the
//                sustainable lateral acceleration  AL / (1 − g)  m/s², AL = 11 (D38's steering friction circle): s · |ω0| above it, the speed is
//                given up at the braking rate, never the line; a cut from a straight (ω0 = 0) is the envelope's alone (A90-B 81 · A80-B 47 · A50-B 20.6 · A1-B 13.3 m/s²; a 10°/s curve
//                at 38 km/h asks 1.8, a 270°/s circle 50) — the per-tick micro-retargets of a held curve cost no speed of their own
//   stop (stick released) duration × (1 + KT · (1 − g) · min(s / 10.56, 1)^1.5) · facing time constant × (1 + 0.6 · (1 − g))
// Low demand stays human: the penalty is proportional to the demand, so gentle steering is nearly identical at every rating and the ratings
// separate as the demand grows. AGILITY 99 = the A99-C profile object itself (g = 1: no adjustment).
import { PACE } from "./pace.js";
const clampR = (r) => Math.max(1, Math.min(99, +r));
// ── SPRINT SPEED ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function sprintKmh(rating) { const r = clampR(rating), tenths = r >= 90 ? 353 + 3 * (r - 90) : r >= 40 ? 253 + 2 * (r - 40) : 214 + (r - 1); return tenths / 10; }
export const sprintMs = (rating) => { const r = clampR(rating); return r === 99 ? 38 / 3.6 : Math.round(sprintKmh(r) * 10) / 36; };   // (tenths ÷ 36: 80 → 333 / 36 = 9.25 m/s exactly; 99: the S99 build's own 38 / 3.6, bit for bit)
// ── ACCELERATION ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function accCapability(rating) { const r = clampR(rating), m = r >= 90 ? 865 + 15 * (r - 90) : r >= 40 ? 365 + 10 * (r - 40) : 170 + 5 * (r - 1); return m / 1000; }
const D38 = PACE.D38, A0_99 = D38.a0, VREF = 38 / 3.6, DT = 1 / 240, MILESTONES = [0.25, 0.50, 0.70, 0.80, 0.90, 0.95];
// the straight-line velocity acquisition of a curve, integrated exactly as the movement integrates it (advance(): s += a(s) · DT per tick)
export function curveOf(a0, p, aEnd, vmax) { return (s) => { if (s >= vmax) return 0; return Math.max(a0 * (1 - Math.pow(Math.max(0, s / vmax), p)), aEnd); }; }
export function milestoneTimes(acc, vmax, fr = MILESTONES) { const out = []; let s = 0, t = 0, i = 0; while (i < fr.length && t < 30) { s = Math.min(vmax, s + acc(s) * DT); t += DT; while (i < fr.length && s >= fr[i] * vmax - 1e-9) { out.push(t); i++; } } return out; }
const T99 = milestoneTimes(curveOf(A0_99, D38.p, D38.aEnd, VREF), VREF);
export function measuredCapability(a0, p, aEnd) { const T = milestoneTimes(curveOf(a0, p, aEnd, VREF), VREF); return T.reduce((s, x, i) => s + T99[i] / x, 0) / T.length; }
const ACC_CACHE = new Map();
// the profile for a rating: { a0, p, aEnd, c, L } (99: D38's own numbers)
export function accProfile(rating) { const r = clampR(rating); if (ACC_CACHE.has(r)) return ACC_CACHE.get(r);
  let out; if (r === 99) out = { a0: D38.a0, p: D38.p, aEnd: D38.aEnd, c: 1, L: 1, measured: 1 };
  else { const c = accCapability(r), p = 1 + 1.2 * Math.pow(c, 1.5), aEnd = 0.7 * c; let lo = 0.05, hi = 1.5;
    for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (measuredCapability(A0_99 * mid, p, aEnd) < c) lo = mid; else hi = mid; }
    const L = (lo + hi) / 2; out = { a0: A0_99 * L, p, aEnd, c, L, measured: measuredCapability(A0_99 * L, p, aEnd) }; }
  ACC_CACHE.set(r, out); return out; }
// ── AGILITY ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const AGI_SCALES = {
  A: { id: "A", label: "AGILITY SCALE A · compressed", bands: [[90, 910, 10], [40, 610, 6], [1, 493, 3]] },   // 90 → 91 % · 80 → 85 · 50 → 67 · 1 → 49.3
  B: { id: "B", label: "AGILITY SCALE B · balanced", bands: [[90, 865, 15], [40, 365, 10], [1, 170, 5]] },     // 90 → 86.5 % · 80 → 76.5 · 50 → 46.5 · 1 → 17
  C: { id: "C", label: "AGILITY SCALE C · pronounced", bands: [[90, 820, 20], [40, 220, 12], [1, 64, 4]] },   // 90 → 82 % · 80 → 70 · 50 → 34 · 1 → 6.4
};
export function agiCapability(rating, scale) { const r = clampR(rating), S = AGI_SCALES[scale] || AGI_SCALES.B; for (const [r0, m0, k] of S.bands) if (r >= r0) return (m0 + k * (r - r0)) / 1000; return S.bands[2][1] / 1000; }
export const AGI_K = { KT: 2.0, KL: 4.5, VREF, omegaA: 12, omegaW: 0.6, faceK: 0.6, AL: 11 };   // (s_movement.js holds the same numbers)
export function redirectionDemand(angleDeg, speed, turnRate) { const x = Math.min(speed / VREF, 1.2) * Math.sin(Math.abs(angleDeg) * Math.PI / 360); return Math.max(0, Math.min(1, Math.pow(x, 1.5) + AGI_K.omegaW * Math.min(1, speed * Math.abs(turnRate || 0) / AGI_K.omegaA))); }
export const curveCapacity = (g) => (g == null || g >= 1 ? Infinity : AGI_K.AL / (1 - g));   // m/s²
// the rated A99-C profile (the envelope reads p.g); 99 → A99-C itself
export function agilityProfile(C, rating, scale) { const r = clampR(rating); if (r === 99) return C; const g = agiCapability(r, scale);
  return Object.assign({}, C, { id: `A${r}-${scale}`, label: `Agility ${r} (scale ${scale})`, g, faceTau: C.faceTau * (1 + AGI_K.faceK * (1 - g)) }); }
// ── the physical player: { sprint, accel, agility, agiScale } ─────────────────────────────────────────────────────────────────────────────
export const PHYS_PRESETS = {
  "PHYSICAL-99": { sprint: 99, accel: 99, agility: 99, agiScale: "B" },
  "PHYSICAL-80-A": { sprint: 80, accel: 80, agility: 80, agiScale: "A" },
  "PHYSICAL-80-B": { sprint: 80, accel: 80, agility: 80, agiScale: "B" },
  "PHYSICAL-80-C": { sprint: 80, accel: 80, agility: 80, agiScale: "C" },
};
export const PHYS_IDS = Object.keys(PHYS_PRESETS);

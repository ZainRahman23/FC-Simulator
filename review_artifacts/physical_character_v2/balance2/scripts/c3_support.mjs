// BALANCE-2 C3 — legitimate-support measurement (owner decision 2026-10-12 22:12: rigid boot-tip support is not legitimate toe support).
// Reads only the physics records (contact manifolds + body poses); never the controller. The rigid F0 boot (10 convex pieces, AP 5 × ML 2) has a
// FLAT sole from the heel (−64.2 mm) to the oblique MTP break (MTP1 +140.3 / MTP5 +110.4 mm from the ankle) and a raised toe spring / tip ahead of
// it (rising ≥ 3 mm at the first hull vertices beyond the break, 12 mm at the tip; pieces 8–9 are entirely ≥ 3.4 mm above the sole plane).
// A loaded contact point (λ > 0) is classified in the foot's own frame (local +Z forward, +Y up; sole plane y = −0.088 m = the ankle height):
//   flat sole   height above the sole plane ≤ 1 mm                    → legitimate support (incl. heel-edge and MTP-edge pivots)
//   boot tip    height > 1 mm and ahead of the forefoot boundary (z > 0.1063 m, pieces 6–9) → rigid boot-tip support (NOT legitimate)
// Measured on every step: tip load share = Σλ(tip) / Σλ(all feet); heel lift = each foot's pitch relative to the undisturbed twin (deg).
// Tool check (preserved BALANCE-2 review records): quiet standing and the C2 12 N·s / small / backward runs → 0; C2 / B 14 N·s and C2 21.5 N·s → 1.0.
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R();
const FOOT = Object.fromEntries(["foot_L", "foot_R"].map(n => [n, SPEC.bodies.findIndex(b => b.name === n)])), SOLE_Y = SPEC.bodies[FOOT.foot_L].boot.soleY - SPEC.landmarks.yA;
export const TIP = Object.freeze({ heightTolM: 0.001, forefootZ: 0.1063, shareTol: 0.02 });
const conj = (q) => [-q[0], -q[1], -q[2], q[3]], R2D = 180 / Math.PI;
const pitch = (r, b) => { const f = Q.rot(r.S[b].rot, [0, 0, 1]); return Math.asin(Math.max(-1, Math.min(1, f[1]))) * R2D; };
// per-step tip load share for one record
export function tipShare(r) { let tip = 0, tot = 0;
  for (const m of r.contacts || []) { if (m.kind !== "turf-runner") continue; const b = FOOT[m.b[1]]; if (b == null) continue; const Sb = r.S[b];
    for (const p of m.points) { if (!(p.lam > 0)) continue; const l = Q.rot(conj(Sb.rot), V.sub(p.p, Sb.pos)); tot += p.lam; if (l[1] - SOLE_Y > TIP.heightTolM && l[2] > TIP.forefootZ) tip += p.lam; } }
  return tot > 0 ? tip / tot : 0; }
// summary over [from, to) of a disturbed run against its twin (twin optional: heel lift is then absolute pitch change from step `from`)
export function support(o, base, from, to) { const P = o.recs, A = base ? base.recs : null, n = Math.min(P.length, to ?? P.length, A ? A.length : Infinity); let peak = 0, tPeak = null, steps = 0, lift = 0, liftSteps = 0, first = null;
  const p0 = Object.values(FOOT).map(b => pitch(P[Math.max(0, from - 1)], b));
  for (let q = from; q < n; q++) { const s = tipShare(P[q]); if (s > peak) { peak = s; tPeak = (q - from) / 240; } if (s > TIP.shareTol) { steps++; if (first == null) first = (q - from) / 240; }
    const hl = Math.max(...Object.values(FOOT).map((b, j) => Math.abs(pitch(P[q], b) - (A ? pitch(A[q], b) : p0[j])))); lift = Math.max(lift, hl); if (hl > 1) liftSteps++; }
  return { tipSharePeak: +peak.toFixed(4), tipPeakAtS: tPeak, tipLoadedS: +(steps / 240).toFixed(3), tipFirstS: first, heelLiftPeakDeg: +lift.toFixed(2), heelLiftOver1degS: +(liftSteps / 240).toFixed(3), legitimate: peak <= TIP.shareTol }; }

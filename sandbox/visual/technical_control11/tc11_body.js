// ═══ technical_control11/tc11_body.js — TECHNICAL-CONTROL-1.1: the feet, ankles and lower legs of fast technical control (presentation only) ══════
// Owner (feet pass): the feet and ankles looked robotic at speed — the contact positions were right, the leg's pose was not. TECHNICAL-CONTROL-1's
// body keyed each foot's ORIENTATION in the world (a yaw and a pitch per keyframe) and let the ankle absorb whatever the IK'd shin left: the ankle
// folded to ~90° in the swing's heel recovery, the foot twisted 70°+ under a forward-facing shin to show its inside, the toe swung onto the ball in
// the last 50 ms and off it in the next 50 (2 000 – 4 700 °/s at the ankle), the knee locked straight in reaches, the boot passed into the ball.
// This body keeps every authoritative contact (time, foot, surface, ball, impulse — and so every TECHNICAL-CONTROL-1 result) and TECHNICAL-CONTROL-1's
// foot paths, and rebuilds how the leg reaches them, as a chain (tc11_leg.js):
//   1 PELVIS — the root path (TECHNICAL-CONTROL-1), turned a few degrees toward the touching leg around a contact (open for the inside, closed for
//     the outside), one smooth curve through a cluster of contacts; it lowers into the touch and moves toward a leg out of reach
//   2 HIP — the swivel turns the WHOLE LEG toward the foot's orientation (the knee follows the foot); it saturates softly at the hip's rotation range
//   3 KNEE — two-bone IK with a soft extension limit (never locked straight)
//   4 TIBIA / ANKLE — only the remainder: a little axial tibial rotation (once the knee is bent), then talocrural pitch, subtalar roll and a few
//     degrees of forefoot abduction, each softly inside its range (tc11_leg.js ROM)
//   5 CONTACT SURFACE — searched per contact: a foot orientation (yaw · pitch · roll) and the boot's placement such that the labelled surface of
//     DRIBBLE-1's boot collider meets the ball (gap 0, that face nearest), its working direction within a cone of the impulse, the leg inside its
//     comfort ranges, the rotation affordable in the time the swing gives
// Orientation is planned in JOINT space, not in the world: a swing's ankle follows RUN-1's own swing channels (the approved running gait: the
// foot hangs after toe-off, dorsiflexes through the swing), then winds up — hip, tibia, ankle together, as early as the swing allows — into the
// contact's orientation, holds the surface through the ball, follows through, and settles flat for the landing. Only three short windows lock the
// foot's orientation in the world: the toe-off (continuous with the stance), the contact (the surface on the ball) and the landing (flat).
// The support leg: a planted foot stays flat, the knee follows the foot, the heel rises (about the ball of the foot, no slip) as soon as the
// ankle would dorsiflex past its range — the leg accepts the weight and the pelvis moves over it.
// Nothing here is read by the simulation (animation ON / OFF and TC1-body / TC1.1-body give identical ball, contacts and results).
import { TechBody, TB } from "../technical_control1/tc_body.js";
import { HB } from "../receive_turn11/rt11_body.js";
import { DEG, clamp, s5, wrapA, dir, sgnF } from "../receive_turn1/rt_actions.js";
import { Q, ROM, soft, legAngles, bootHull, ballGap, surfaceDir, legIK, footOut, swivelFor, ankleFor, pchip, pchipAt } from "./tc11_leg.js";
const DT = 1 / 240, R = 0.11, SIDES = ["R", "L"], hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a)), hdg = (v) => Math.atan2(v[1], v[0]), other = (F) => (F === "R" ? "L" : "R");
const NCH = 6;   // joint channels: ψ (the hip's swivel), τ (tibial axial), fy, fp, fr (ankle), toe
export const LB = {
  kMin: 7 * DEG,                       // the knee never straighter than this (a soft limit)
  hold: [0.018, 0.008],                // the contact surface is world-locked this long before / after the contact (s, at most); ramps 0.02 s each side
  windMin: 0.075,                      // a wind-up into the contact takes at least this long when the swing allows it
  offWin: 0.035, landWin: 0.04,        // the toe-off / landing windows (world-locked orientation, blended into the joint plan)
  clear: 0.006,                        // the boot's lowest point above the turf at a ground-level contact (m)
  tol: { INSIDE: 36, OUTSIDE: 34, LACES: 28, SOLE: 40 },              // the surface's working direction within this cone of the impulse (deg)
  open: { INSIDE: 9, OUTSIDE: -6, LACES: 2, SOLE: 0 },                // the pelvis turns this far toward (+) the touching leg at a contact (deg)
  dfRise: 20,                          // a planted foot's heel rises (about the ball of the foot) once the ankle would dorsiflex past this (deg)
  reachStance: 0.955,                  // … and once the hip – ankle distance of a planted leg passes this share of the leg's length (the push-off)
  pushMax: 55 * DEG,                   // the push-off's heel lift at most (a foot left further behind lifts earlier: earlyLifts)
  holdRes: 12,                         // deg: a planted foot whose leg leaves more than this to an orientation error lifts (earlyLifts)
  landKeep: 0.4, landOut: [-12, 28],   // a touching foot lands keeping this share of the contact's toe-out (deg range), not snapping back
  rate: 520,                           // °/s: the foot's orientation change into a contact above which the search pays a cost
};
// per surface: the candidate foot pitch (toe up +, deg) and inversion (sole facing in +, deg) at the contact; the yaw comes from the impulse
const CAND = { INSIDE: { pitch: [-2, 6, 14], inv: [-6, 0, 7] }, OUTSIDE: { pitch: [-34, -22, -10], inv: [4, 11, 18] }, LACES: { pitch: [-62, -50, -38], inv: [-5, 2, 9] }, SOLE: { pitch: [6, 16, 26], inv: [-6, 0, 6] } };
const CACHE = new Map();   // (a simulation may carry its own: sim._tc11cache — then two runs in one process pose identically; TECHNICAL-CONTROL-1.3's FlowSim does)
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const blendPose = (A, B, t) => { if (!A || t <= 0) return A || B; if (t >= 1) return B; const rot = {}; for (const k of Object.keys(B.rot)) rot[k] = A.rot[k] ? Q.slerp(A.rot[k], B.rot[k], t) : B.rot[k]; return { rot, pelvisPos: lerp3(A.pelvisPos, B.pelvisPos, t) }; };
const yawOf = (Rw) => { const f = Q.v(Rw, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
export class LegBody extends TechBody {
  constructor(sim, ep, F) { super(sim, ep, F); this.kind = "tc11";
    // pass 2: the contacts re-searched on the REAL pelvis at each contact (pass 1 had only an estimate: no weight shift, no reach adaptation)
    this._hipTrue = new Map(); for (const c of this.contactsKnown) { const pf = this.pelvisFull(c.t + this.tc); this._hipTrue.set(c.ball, { P: pf.P, psi: pf.psi, Rp: pf.Rp, pel: pf.pelvis }); }
    this._pf = null; this.buildFeet(); this._pf = null; this.earlyLifts(); this._pf = null; this.planJoints(); }
  // STRIDE ADJUSTMENT (presentation): a planted foot the body has left behind — even with the heel fully up (the push-off) the leg would have to
  // pass 97 % of its length — leaves the turf then, a little before the gait's lift (the touching foot's contacts are untouched: only a support
  // foot's toe-off moves earlier, never past its own stance's first 60 ms)
  // … and a planted foot the leg can no longer hold anatomically (what the hip, tibia, ankle, the pivot and the edge roll leave exceeds 12°: a body
  // turning far over a planted foot) leaves the turf then too
  earlyLifts() { const b = this.b, my = this.mtpY, mz = this.mtpZ, dL = 0.97 * b.legLen, tNow = (this.sim.k - this.sim.rc2.kc) * DT, pMax = LB.pushMax;
    for (const X of SIDES) { const L = this.seg[X]; for (let j = 1; j < L.length; j++) { const s = L[j], ts = L[j - 1].t1; if (s.t0 <= tNow + 0.02 || s.inherited != null) continue; let tr = null;
        for (let t = ts + 0.06; t < s.t0; t += 0.01) { const pf = this.pelvisFull(t + this.tc), ft = pf.feet[X]; if (!ft.planted) break; const ball = ft.ballPt, back = mz * Math.cos(pMax) - my * Math.sin(pMax), up = my * Math.cos(pMax) + mz * Math.sin(pMax);
          const ank = [ball[0] - dir(ft.yaw)[0] * back, ball[1] - dir(ft.yaw)[1] * back, HB.ankleH - my + up], an = this.toM(ank, pf.P, pf.psi), hip = this.hipAt(pf, X); if (hyp(an[0] - hip[0], an[1] - hip[1], an[2] - hip[2]) > dL) { tr = t; break; }
          const st = this.stanceLeg(X, ft, pf), rs = hyp(...st.A.res) / DEG; if (rs > LB.holdRes) { tr = t; break; } }
        if (tr != null && tr - 0.01 < s.t0) { s.t0 = max(ts + 0.06, tr - 0.01); s.early = true; s.keys = this.swingKeys(X, s); this._pf = null; } } } }
  static hull(sim) { const C = sim.cfg.colliders; if (!C || !C.sides) return null; return C._tc11 || (C._tc11 = { R: bootHull(C.sides.R.boot.points), L: bootHull(C.sides.L.boot.points), P: { R: C.sides.R.boot.points, L: C.sides.L.boot.points } }); }
  knownContacts(sim) { const out = super.knownContacts(sim); this._cBy = new Map(out.map((c) => [c.ball, c])); return out; }
  // ── frames: the root frame at time t (x right, y up, z forward; the mirrored 2D local frame turns positive to the right, as RUN-1's root) ──
  toM(q, P, psi) { const c = Math.cos(psi), s = Math.sin(psi), dx = q[0] - P[0], dy = q[1] - P[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; }
  fromM(m, P, psi) { const c = Math.cos(psi), s = Math.sin(psi); return [P[0] + m[2] * c - m[0] * s, P[1] + m[2] * s + m[0] * c, m[1]]; }
  // the pelvis's turn toward the touching leg: one smooth curve through the contacts' offsets (a cluster blends, never returns to zero between)
  // (each contact's own turn: the one its contact search chose — the hierarchy's first step — else the surface's default)
  pyOf(c) { const cp = this._cpBy && this._cpBy.get(c.ball); return cp && cp.py != null ? cp.py : (LB.open[c.surface] || 0) * sgnF(c.F) * DEG; }
  contactYaw(t) { let y = 0; for (const c of this.contactsKnown) { const o = this.pyOf(c); if (!o) continue; const d = t - c.t; if (d < -0.16 || d > 0.2) continue;
      y += o * (d < 0 ? s5((d + 0.16) / 0.13) : 1 - s5((d - 0.04) / 0.16)); } return clamp(y, -26 * DEG, 26 * DEG); }
  // ── THE CONTACT POSE: a searched foot orientation + the boot placed on the ball ──────────────────────────────────────────────────────────────
  // (TECHNICAL-CONTROL-1's swing paths, landings and preparation read ank / yaw / pitch from here; the leg plan reads RW, the world orientation)
  contactPose(X, s, ball, n) {
    const H = LegBody.hull(this.sim); if (!H) return super.contactPose(X, s, ball, n); const c = this._cBy && this._cBy.get(ball), tc = c ? c.t : 0, ep = this.ep;
    // a contact keeps the pose it was prepared with across the episode's re-plans (the executed contact differs from its prediction by millimetres;
    // re-searching would pick a neighbouring candidate and the leg would jump to it): the remembered pose, moved with the ball
    const mem = this.sim.rc2 && (this.sim.rc2._tc11cp || (this.sim.rc2._tc11cp = new Map())), mk = c ? `${c.i}|${X}|${s}` : null, m0 = mk && mem.get(mk);
    if (m0 && hyp(ball[0] - m0.ball[0], ball[1] - m0.ball[1]) < 0.06 && abs(tc - m0.tc) < 0.03 && (this._hipTrue || !m0.final)) { const d = [ball[0] - m0.ball[0], ball[1] - m0.ball[1], max(R, ball[2]) - max(R, m0.ball[2])];
      if (!this._hipTrue || m0.final) { const r0 = Object.assign({}, m0.cp, { ank: [m0.cp.ank[0] + d[0], m0.cp.ank[1] + d[1], m0.cp.ank[2] + d[2]] }); (this._cpBy || (this._cpBy = new Map())).set(ball, r0); return r0; } }
    const Ht = this._hipTrue && this._hipTrue.get(ball), key = [X, s, ball.map((x) => x.toFixed(3)).join(), n.map((x) => x.toFixed(3)).join(), tc.toFixed(3), ep.psiAt(tc).toFixed(3), hyp(...ep.velAt(tc)).toFixed(2), Ht ? Ht.pel.concat(Ht.P).map((x) => x.toFixed(3)).join() + Ht.Rp.map((x) => x.toFixed(3)).join() : "est"].join("|"); const CC = this.sim._tc11cache || CACHE; if (CC.has(key)) { const r0 = CC.get(key); (this._cpBy || (this._cpBy = new Map())).set(ball, r0); return r0; }
    const r = this.searchContact(X, s, ball, n, tc, H); if (CC.size > 4000) CC.clear(); CC.set(key, r); (this._cpBy || (this._cpBy = new Map())).set(ball, r);
    if (mk && this._hipTrue) mem.set(mk, { ball: ball.slice(), tc, cp: r, final: true }); return r;
  }
  // the boot placed against the ball for a root-frame orientation Rf: approached against the surface's working direction (the sole from above),
  // its lowest point at the turf clearance (or higher when the ball is), slid until the hull's nearest face just touches the ball (gap 0)
  placeBoot(X, s, Rf, bM, H) {
    const pts = H.P[X], faces = H[X], lowest = Math.min(...pts.map((p) => Q.v(Rf, p)[1]));
    if (s === "SOLE") { const fz = Q.v(Rf, [0, 0, 0.075]), A = [bM[0] - fz[0], 0, bM[2] - fz[2]]; let lo = bM[1] - 0.2, hi = bM[1] + 0.5;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; A[1] = m; if (ballGap(faces, X, Rf, A, bM, R).gap < 0) lo = m; else hi = m; } A[1] = hi; return { A, g: ballGap(faces, X, Rf, A, bM, R) }; }
    const wd = Q.v(Rf, surfaceDir(s, X)), hl = hyp(wd[0], wd[2]) || 1, a = [wd[0] / hl, 0, wd[2] / hl], y0 = LB.clear - lowest;
    let best = null; for (const dy of [0, 0.02, 0.04, 0.07]) { const yA = y0 + dy; let lo = 0.0, hi = 0.6;    // λ: the ankle's distance back from the ball's centre along the approach
      const at = (l) => [bM[0] - a[0] * l, yA, bM[2] - a[2] * l]; if (ballGap(faces, X, Rf, at(hi), bM, R).gap < 0) continue;
      for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (ballGap(faces, X, Rf, at(m), bM, R).gap < 0) lo = m; else hi = m; }
      const A = at(hi), g = ballGap(faces, X, Rf, A, bM, R), ok = g.face === s || (s === "LACES" && g.face === "TOE"); if (!best || (ok && !best.ok)) best = { A, g, ok }; if (ok) break; }
    return best;
  }
  // the pelvis and hip at a contact, before the feet are final (the search's estimate; the pose itself re-solves the leg on the real pelvis)
  hipEst(X, tc, ball) { const H = this._hipTrue && this._hipTrue.get(ball); if (H) return { P: H.P, psi: H.psi, Rp: H.Rp, pel: H.pel, hip: Q.v(H.Rp, [sgnF(X) * this.b.hipX, 0, 0]).map((x, i) => x + H.pel[i]) };
    const ep = this.ep, P = ep.rootAt(tc), psi = ep.psiAt(tc), V = ep.velAt(tc), run = clamp(hyp(V[0], V[1]) / 6, 0, 1), b = this.b;
    const Rp = Q.mul(Q.y(this.contactYaw(tc)), Q.x((3 + 5 * run) * DEG * 0.35)), pel = [0, b.pelvisY - 0.02 - 0.046 + 0.012 * run, 0.02 * run]; return { P, psi, Rp, pel, hip: Q.v(Rp, [sgnF(X) * b.hipX, 0, 0]).map((x, i) => x + pel[i]) }; }
  searchContact(X, s, ball, n, tc, H) {
    const ep = this.ep, sx = sgnF(X), est = this.hipEst(X, tc, ball), { P, psi } = est, cK = this._cBy && this._cBy.get(ball), py0 = cK ? this.pyOf(cK) : 0, pyDef = (LB.open[s] || 0) * sx * DEG;
    let Rp = est.Rp, hip = est.hip, py = py0; const setPy = (q) => { py = q; Rp = Q.mul(Q.y(q - py0), est.Rp); hip = Q.v(Rp, [sx * this.b.hipX, 0, 0]).map((x, i) => x + est.pel[i]); };
    const bM = this.toM([ball[0], ball[1], max(R, ball[2])], P, psi), nM = [-n[0] * Math.sin(psi) + n[1] * Math.cos(psi), 0, n[0] * Math.cos(psi) + n[1] * Math.sin(psi)];
    const sw = ep.swings.find((q) => q.F === X && q.t0 < tc + 1e-6 && q.t1 >= tc - 1e-6), tAvail = max(0.05, (sw ? tc - sw.t0 : 0.12) + 0.04), tPost = max(0.04, sw ? sw.t1 - tc : 0.1), C = CAND[s] || CAND.INSIDE, wd0 = surfaceDir(s, X);
    const yawN = Math.atan2(nM[0], nM[2]), yaw0 = s === "SOLE" ? 0 : yawN - Math.atan2(wd0[0], wd0[2]), legLen = this.b.legLen, b = this.b;
    const evalAt = (yaw, pitch, inv) => {
      const Rf = Q.mul3(Q.y(yaw), Q.x(-pitch * DEG), Q.z(-sx * inv * DEG)), pl = this.placeBoot(X, s, Rf, bM, H); if (!pl) return null;
      const out = footOut(Rp, Rf, X), psiK = swivelFor(out, X), ik = legIK(b, Rp, psiK, hip, pl.A, LB.kMin), Rsh0 = Q.mul3(Rp, ik.Rthigh, Q.x(ik.k)), A = ankleFor(Rsh0, Rf, X, ik.k);
      const rot = { thigh_X: ik.Rthigh, shin_X: Q.mul(Q.x(ik.k), Q.y(A.tau)), foot_X: A.Rfoot }, ang = legAngles({ ["thigh_" + X]: rot.thigh_X, ["shin_" + X]: rot.shin_X, ["foot_" + X]: rot.foot_X }, X);
      const wd = Q.v(Rf, wd0), e = s === "SOLE" ? Math.acos(clamp(-wd[1], -1, 1)) / DEG : abs(wrapA(Math.atan2(wd[0], wd[2]) - yawN)) / DEG, tol = LB.tol[s] || 35;
      const exC = (x, r) => (x < r[0] ? r[0] - x : x > r[1] ? x - r[1] : 0), Cm = ROM.comfort, tb = ROM.tib(ang.knee, true);
      let J = max(0, e - 10) ** 2 * 0.6 + max(0, e - tol) ** 2 * 25 + A.err ** 2 * 4;
      J += 2 * (exC(ang.hipRot, Cm.hip) ** 2 + exC(ang.df, Cm.df) ** 2 + exC(ang.inv, Cm.inv) ** 2 + exC(ang.abd, Cm.abd) ** 2 + exC(ang.tib, tb) ** 2 + exC(ang.knee, Cm.knee) ** 2);
      const reach = ik.dW / legLen; J += max(0, reach - 0.93) ** 2 * 4e4 + ik.short * ik.short * 4e5;
      const rot0 = Q.angle(Q.y(sx * 6 * DEG), Rf) / DEG, rate = rot0 / tAvail; J += max(0, rate - LB.rate) ** 2 * 0.004 + 0.01 * (yaw / DEG - sx * 6) ** 2 * 0.1;
      // … and back to a landing (flat, keeping part of the toe-out) in the time to the touchdown
      const outY = clamp(sx * (yaw / DEG) * LB.landKeep, LB.landOut[0], LB.landOut[1]), rot1 = Q.angle(Q.y(sx * max(6, outY) * DEG), Rf) / DEG, rate1 = rot1 / tPost; J += max(0, rate1 - LB.rate) ** 2 * 0.004;
      J += 0.025 * ((py - pyDef) / DEG) ** 2;                                   // the pelvis's turn away from the surface's default costs a little
      if (!pl.ok) J += 6000; return { J, yaw, pitch, inv, Rf, A: pl.A, gap: pl.g.gap, face: pl.g.face, ok: pl.ok, e, reach, ang, err: A.err, psiK, py };
    };
    let best = null; const tryC = (y, p, i) => { const r = evalAt(y, p, i); if (r && (!best || r.J < best.J)) best = r; };
    const yaws = s === "SOLE" ? [-30, -15, 0, 15, 30].map((d) => (d + sx * 8) * DEG) : [-40, -30, -20, -10, 0, 10, 20, 30, 40].map((d) => yaw0 + d * DEG);
    setPy(pyDef); for (const y of yaws) for (const p of C.pitch) for (const i of C.inv) tryC(y, p, i);
    // HIERARCHY 1 — the pelvis: when the leg is pressed (a cost from its ranges, reach or the surface's direction), the pelvis turns toward the
    // contact (≤ 24°, the trunk counter-rotating) before the hip, tibia and ankle are asked for more
    if (best && best.J > 25) { for (const dq of [-24, -12, 12, 24]) { const q = clamp(pyDef / DEG + dq, -24, 24) * DEG; if (abs(q - pyDef) < 1e-6) continue; setPy(q); for (const y of yaws) for (const p of C.pitch) for (const i of C.inv) tryC(y, p, i); } }
    if (best) { setPy(best.py); const b0 = best; for (const dy of [-5, 0, 5]) for (const dp of [-4, 0, 4]) for (const di of [-3, 0, 3]) if (dy || dp || di) tryC(b0.yaw + dy * DEG, b0.pitch + dp, b0.inv + di); }
    if (!best) return Object.assign(super.contactPose(X, s, ball, n), { flag: ["no placement"] });
    const RW = Q.mul(Q.y(psi), best.Rf), ank = this.fromM(best.A, P, psi), flag = [];
    if (best.e > (LB.tol[s] || 35)) flag.push(`surface ${best.e.toFixed(0)}° off the impulse`); if (!best.ok) flag.push(`nearest boot face ${best.face}`); if (best.reach > 0.965) flag.push(`reach ${best.reach.toFixed(3)}`);
    for (const [k, v] of Object.entries(this.overHard(best.ang))) if (v > 1) flag.push(`${k} +${v.toFixed(0)}°`);
    return { ank, yaw: yawOf(RW), pitch: best.pitch * DEG, roll: -sx * best.inv * DEG, RW, sole: s === "SOLE", e: best.e, J: best.J, flag, ang: best.ang, py: best.py };
  }
  overHard(a) { const H = ROM.hard, tb = ROM.tib(a.knee, false), ex = (x, r) => (x < r[0] ? r[0] - x : x > r[1] ? x - r[1] : 0); return { hip: ex(a.hipRot, H.hip), knee: ex(a.knee, H.knee), tib: ex(a.tib, tb), df: ex(a.df, H.df), inv: ex(a.inv, H.inv), abd: ex(a.abd, H.abd) }; }
  // a plant's yaw serves the whole stance it starts: within the hip's comfortable rotation of the body's facing from the touchdown to the next lift
  // (a cut turns the body over the planted foot — the foot is planted toward the turn, not where the run pointed at the touchdown)
  plantYaw(X, t1, yawWant) { const ep = this.ep, sx = sgnF(X), nx = ep.swings.find((q) => q.F === X && q.t0 > t1 + 1e-4), t2 = nx ? nx.t0 : t1 + 0.2; let lo = -1e9, hi = 1e9;
    for (let i = 0; i <= 8; i++) { const ps = ep.psiAt(t1 + (t2 - t1) * i / 8), a = ps + wrapA(yawWant - ps), r0 = sx > 0 ? ps - 22 * DEG : ps - 34 * DEG, r1 = sx > 0 ? ps + 34 * DEG : ps + 22 * DEG; lo = max(lo, r0 + (a - yawWant)); hi = min(hi, r1 + (a - yawWant)); }
    return lo <= hi ? clamp(yawWant, lo, hi) : 0.5 * (lo + hi); }
  landAt(X, t) { const L = super.landAt(X, t); L.yaw = this.plantYaw(X, t, L.yaw); L.pos = this.plantClear(X, L.pos, L.yaw, t); return L; }
  // the ball's path as the body knows it: between known contacts it rolls on from the last one (a planning estimate — the pose itself sees the real ball)
  ballAt(t) { const C = this.contactsKnown; if (!C.length) return null; let i = C.length - 1; while (i > 0 && C[i].t > t) i--; const c = C[i];
    if (t < c.t) { const d = c.t - t; return [c.ball[0] - c.vIn[0] * d, c.ball[1] - c.vIn[1] * d, R]; } const d = t - c.t, k = max(0.5, 1 - 0.07 * d); return [c.ball[0] + c.vOut[0] * d * k, c.ball[1] + c.vOut[1] * d * k, R]; }
  // a plant clear of the ball for its whole stance (the SUPPORT-FOOT ADJUSTMENT): the planted boot (flat) at least 1.5 cm from the ball's path
  // from the touchdown to the next lift; when it would not be, the smallest move that clears it among the directions a support foot can take —
  // its own side, back, back-diagonal, forward-diagonal on its own side (never across the body's line) — up to 0.28 m
  plantClear(X, pos, yaw, t1) { const H = LegBody.hull(this.sim); if (!H || !this.contactsKnown.length) return pos; const ep = this.ep, nx = ep.swings.find((q) => q.F === X && q.t0 > t1 + 1e-4), t2 = nx ? nx.t0 : t1 + 0.18;
    const ts = [0, 0.2, 0.4, 0.6, 0.8, 1].map((w) => t1 + (t2 - t1) * w), Bs = ts.map((t) => this.ballAt(t)).filter(Boolean), Rf = Q.y(yaw);
    const gapAt = (p) => { let g = 9; for (const B of Bs) { const r = ballGap(H[X], X, Rf, [0, HB.ankleH, 0], this.toM(B, p, 0), R).gap; if (r < g) g = r; } return g; };
    if (gapAt(pos) >= 0.015) return pos; const psi = ep.psiAt(t1), sx = sgnF(X), side = [-Math.sin(psi) * sx, Math.cos(psi) * sx], fw = [Math.cos(psi), Math.sin(psi)];
    const dirs = [[0, 1, 0], [-0.7, 0.7, 0.05], [-1, 0, 0.12], [0.6, 0.8, 0.08], [-0.9, -0.3, 0.3]].map(([f, l, pen]) => ({ u: [f * fw[0] + l * side[0], f * fw[1] + l * side[1]], pen }));
    let best = null; for (const D of dirs) for (let d = 0.03; d <= 0.281; d += 0.025) { const p = [pos[0] + D.u[0] * d, pos[1] + D.u[1] * d]; if (gapAt(p) >= 0.015) { const c = d + D.pen; if (!best || c < best.c) best = { p, c }; break; } }
    return best ? best.p : [pos[0] + side[0] * 0.28, pos[1] + side[1] * 0.28]; }
  // a touching foot lands keeping part of the contact's toe-out (the leg rotates back over the next stance, not in the last 50 ms of the swing)
  landAfterTouch(X, c, s) { const L = super.landAfterTouch(X, c, s), P = this.contactPose(X, c.surface, c.ball, this.impulseDir(c)); if (!P.RW) return L;
    const mv = L.yaw - sgnF(X) * 6 * DEG, outC = sgnF(X) * wrapA(P.yaw - mv) / DEG, keep = clamp(outC * LB.landKeep, LB.landOut[0], LB.landOut[1]), out = keep < 0 ? keep : max(6, keep);
    L.yaw = this.plantYaw(X, s.t1, mv + sgnF(X) * out * DEG); L.pos = this.plantClear(X, L.pos, L.yaw, s.t1); return L; }
  // ── THE PELVIS (everything above the legs) at tAbs — TECHNICAL-CONTROL-1's, plus the turn toward the touching leg ────────────────────────────
  pelvisFull(tAbs, ballLocal) {
    if (this._pf && this._pf.tAbs === tAbs && this._pf.ball === ballLocal) return this._pf.v;
    const E = this.E, R3 = E.R3, b = this.b, ep = this.ep, t = tAbs - this.tc, rot = {};
    const feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, w = this.weights(t), cy = this.cycle(t);
    const S = ep.rootAt(t), Fw = [w.R * feet.R.ank[0] + w.L * feet.L.ank[0], w.R * feet.R.ank[1] + w.L * feet.L.ank[1]], psi = ep.psiAt(t), V = ep.velAt(t), sp = hyp(V[0], V[1]), run = clamp(sp / 6, 0, 1);
    const ld = clamp(this.loadOf("R", t) + this.loadOf("L", t), 0, 1), dF = [Fw[0] - S[0], Fw[1] - S[1]], hc = Math.cos(psi), hs = Math.sin(psi), fw = dF[0] * hc + dF[1] * hs, lt = -dF[0] * hs + dF[1] * hc;
    const kF = TB.comPull * (1 - run) * (1 - run) * ld, kL = TB.comPull * (1 - 0.5 * run) * ld; let P = [S[0] + fw * kF * hc - lt * kL * hs, S[1] + fw * kF * hs + lt * kL * hc];
    const V0 = ep.velAt(t - 0.06), V1 = ep.velAt(t + 0.06), acc = [(V1[0] - V0[0]) / 0.12, (V1[1] - V0[1]) / 0.12];
    const aF = acc[0] * Math.cos(psi) + acc[1] * Math.sin(psi), aL = -acc[0] * Math.sin(psi) + acc[1] * Math.cos(psi), act = this.actW(t), fam = act ? act.a.fam : null, aw = act ? act.w : 0, asg = act ? act.a.sg : 0;
    let touchW = 0; for (const X of SIDES) for (const s of this.seg[X]) if (s.con) { const d = abs(t - s.con.t); if (d < 0.1) touchW = max(touchW, 1 - s5(d / 0.1)); }
    const bobA = clamp(TB.bob[0] + TB.bob[1] * sp, 0, TB.bob[2]) * (fam === "DRAG_BACK" || fam === "STOP" ? 0.4 : 1), bob = -bobA * Math.cos(2 * Math.PI * (cy.u - 0.35));
    const twA = clamp(TB.twist[0] + TB.twist[1] * sp, 0, TB.twist[2]) * DEG, gTw = sgnF(cy.sw) * twA * Math.sin(Math.PI * cy.u), cYaw = this.contactYaw(t);
    const crouch = 0.022 + TB.crouchAct * aw * (fam === "CARRY" ? 0.3 : 1) + TB.crouchTouch * touchW + 0.008 * clamp(-aF, 0, 8);
    let lean = clamp(3 + 5 * run + TB.leanAcc * aF, -9, 20) * DEG, roll = clamp(-aL * TB.rollLat, -22, 22) * DEG, tw = -gTw * 1.3;
    if (fam === "IN_CUT" || fam === "OUT_TOUCH") { tw += asg * 14 * DEG * aw; roll += asg * (fam === "IN_CUT" ? 7 : -5) * DEG * aw; }
    if (fam === "DRAG_BACK" || fam === "STOP") { lean -= 7 * DEG * aw; }
    if (fam === "CRUYFF") tw += -asg * 16 * DEG * Math.sin(Math.PI * clamp(aw, 0, 1));
    if (fam === "FEINT_EXIT") { const dip = act && t < act.a.tc ? sstep(act.a.t0, act.a.tc - 0.1, t) * (1 - sstep(act.a.tc - 0.12, act.a.tc, t)) : 0; roll += -asg * 14 * DEG * dip; tw += -asg * 18 * DEG * dip; }
    if (fam === "DOUBLE" || fam === "DRAG_ACROSS") roll += asg * 5 * DEG * aw;
    let pelvis = [0, b.pelvisY - 0.02 - crouch + bob + 0.012 * run, 0.02 * run], Rp = R3.mul3(R3.y(gTw + tw * 0.2 + cYaw), R3.x(lean * 0.35), R3.z(-roll * 0.5));
    // (the shoulders do not follow the pelvis's turn toward the touching leg: the trunk counter-rotates it away)
    rot.pelvis = Rp; rot.spine = R3.mul(R3.y(tw * 0.45 - gTw * 0.3 - cYaw * 0.5), R3.x(lean * 0.3)); rot.chest = R3.mul3(R3.y(tw * 0.5 - gTw * 0.4 - cYaw * 0.4), R3.x(lean * 0.35), R3.z(-roll * 0.3));
    const swing = clamp(TB.armSwing[0] + TB.armSwing[1] * sp, 0, TB.armSwing[2]) * DEG * Math.sin(Math.PI * cy.u) * sgnF(cy.sw), bal = 10 + 22 * aw + 8 * touchW;
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, outside = act && sx === -asg ? 1 : 0, abd = 10 + bal * (0.6 + 0.4 * outside), arm = sx * swing;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-arm * 1.0 - 4 * DEG), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(35 + 45 * run + 12 * aw) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05]; let look = ballLocal ? ballLocal.slice() : null;
    const c = Math.cos(psi), s = Math.sin(psi), toM = (q, Pr) => { const dx = q[0] - Pr[0], dy = q[1] - Pr[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
    if (look) { const dB = hyp(look[0] - P[0], look[1] - P[1]), up = sstep(0.9, 1.6, dB) * (1 - aw); look = [lerp(look[0], P[0] + dir(psi)[0] * 5, up * 0.7), lerp(look[1], P[1] + dir(psi)[1] * 5, up * 0.7), lerp(look[2], 0.6, up * 0.7)];
      const q = toM(look, P), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -45 * DEG, 55 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    let pose = { rot, pelvisPos: pelvis };
    if (this.init.pose && tAbs < TB.blendIn) pose = blendPose(this.init.pose, pose, s5(tAbs / TB.blendIn));
    if (this.end && t > this.end.t - TB.blendOut) pose = blendPose(pose, this.end.pose, s5((t - (this.end.t - TB.blendOut)) / TB.blendOut));
    Rp = pose.rot.pelvis; pelvis = pose.pelvisPos.slice();
    // reach: a planted or touching leg out of reach moves the pelvis (never the foot, never the ball), lowering it a little (TECHNICAL-CONTROL-1)
    const touchOf = (X) => { let wt = 0; for (const s2 of this.seg[X]) if (s2.con) { const d = abs(t - s2.con.t); if (d < 0.07) wt = max(wt, 1 - s5(d / 0.07)); } return wt; };
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wC = this.reachWeight ? this.reachWeight(X, fX, t, touchOf(X)) : max(fX.planted ? 1 : fX.since != null ? max(1 - s5(fX.since / 0.05), s5(1 - fX.until / 0.05)) : 0, touchOf(X)); if (wC <= 0) continue;   // (reachWeight: a subclass's hook)
        const sx = X === "R" ? 1 : -1, hipM = [pelvis[0] + sx * b.hipX, pelvis[1], pelvis[2]], an = toM(fX.ank, P), d = hyp(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = HB.reach * b.legLen;
        if (d > lim) { const ex = (d - lim) * wC, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = hyp(hx, hz) || 1, dr = min(0.05, ex * 0.5), ex2 = max(0, ex - dr), mx = hx / hl * ex2, mz = hz / hl * ex2;
          dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; }
    const v = { t, feet, w, P, psi, pose, Rp, pelvis, fam }; this._pf = { tAbs, ball: ballLocal, v }; return v;
  }
  hipAt(pf, X) { return Q.v(pf.Rp, [sgnF(X) * this.b.hipX, 0, 0]).map((x, i) => x + pf.pelvis[i]); }
  segAt(X, t) { for (const s of this.seg[X]) { if (t < s.t0) return null; if (t < s.t1) return s; } return null; }
  // ── THE STANCE LEG: the planted foot flat (heel rising about the ball of the foot: TECHNICAL-CONTROL-1's toe-off, and as soon as the ankle would
  // dorsiflex past LB.dfRise), the knee following the foot, the ankle taking the rest ─────────────────────────────────────────────────────────────
  stanceLeg(X, ft, pf) {
    const b = this.b, sx = sgnF(X), hip = this.hipAt(pf, X), psi = pf.psi, P = pf.P, my = this.mtpY, mz = this.mtpZ;
    const ball = ft.ballPt || [ft.ank[0] + dir(ft.yaw)[0] * mz, ft.ank[1] + dir(ft.yaw)[1] * mz];
    // the planted foot's pose: its yaw turned by dy about the ball of the foot, the heel raised by pp about it (the toes stay flat), rolled by rho
    // onto one sole edge (the edge stays on the turf) — then the knee follows the foot and the ankle takes the rest
    const solve = (pp, dy, rho) => { const yw = ft.yaw + dy, back = mz * Math.cos(pp) - my * Math.sin(pp), up = my * Math.cos(pp) + mz * Math.sin(pp), moved = pp > 1e-6 || abs(dy) > 1e-6;
      const ank = moved ? [ball[0] - dir(yw)[0] * back, ball[1] - dir(yw)[1] * back, HB.ankleH - my + up] : ft.ank; let Rf = Q.mul(Q.y(wrapA(yw - psi)), Q.x(pp)), an = this.toM(ank, P, psi);
      // (the roll's axis: the foot's long axis through the edge of the forefoot level with the ball of the foot — on the heel's pivot axis, so the
      // edge stays put whether the heel is down or rising; the support point is that edge, else the ball of the foot)
      let sup = Q.v(Rf, [0, -my, mz]).map((x, i) => x + an[i]);
      if (abs(rho) > 1e-6) { const xE = -Math.sign(rho) * 0.072, E = Q.v(Rf, [xE, -my, mz]).map((x, i) => x + an[i]), Rr = Q.mul3(Rf, Q.z(rho), Q.tr(Rf)), d = an.map((x, i) => x - E[i]), dr = Q.v(Rr, d); an = E.map((x, i) => x + dr[i]); Rf = Q.mul(Rf, Q.z(rho)); if (abs(rho) > 0.3 * DEG) sup = E; }
      // (pivotOnEdge — a subclass's option: a foot turning while it stands on its edge turns about that edge, which stays put; none here)
      if (this.pivotOnEdge && abs(rho) > 0.3 * DEG && abs(dy) > 1e-6) { const xE = -Math.sign(rho) * 0.072, b0 = mz * Math.cos(pp) - my * Math.sin(pp), a0 = [ball[0] - dir(ft.yaw)[0] * b0, ball[1] - dir(ft.yaw)[1] * b0, ank[2]], R0 = Q.mul(Q.y(wrapA(ft.yaw - psi)), Q.x(pp)),
          E0 = Q.v(R0, [xE, -my, mz]).map((x, i) => x + this.toM(a0, P, psi)[i]), sh = E0.map((x, i) => x - sup[i]); an = an.map((x, i) => x + sh[i]); sup = E0; }
      const psiK = swivelFor(footOut(pf.Rp, Rf, X), X), ik = legIK(b, pf.Rp, psiK, hip, an, LB.kMin), Rsh0 = Q.mul3(pf.Rp, ik.Rthigh, Q.x(ik.k)), A = ankleFor(Rsh0, Rf, X, ik.k);
      return { pp, dy, rho, an, ank: this.fromM(an, P, psi), sup: this.fromM(sup, P, psi), edge: abs(rho) > 0.3 * DEG ? Math.sign(rho) : 0, Rf, psiK, ik, A, df: -Q.toYXZ(Q.mul(Q.y(-A.tau), Q.mul(Q.tr(Rsh0), Rf)))[1] / DEG }; };
    // the heel's schedule: TECHNICAL-CONTROL-1 lifted it to the toe-off angle in the stance's last 60 ms (≈1 000 °/s at speed); here it rises over
    // the stance's second half (RUN-1 lifts it from early stance), and every other rule joins it through a smooth maximum — never a kink
    const t = pf.t, nx = this.seg[X].find((q) => q.t0 > t - 1e-9), pv = this.seg[X].filter((q) => q.t1 <= t + 1e-9).pop(), tL = pv ? pv.t1 : t - 0.2, tO = nx ? nx.t0 : t + 0.2, Ts = max(0.05, tO - tL);
    const pTO = Math.asin(clamp(this.toeOffLift(nx ? hyp(...this.ep.velAt(nx.t0)) : 0) / hyp(my, mz), 0, 0.9)), wR = max(0.06, 0.55 * Ts), sched = pTO * s5((t - (tO - wR)) / wR);
    const smax = (a, c) => 0.5 * (a + c + Math.sqrt((a - c) * (a - c) + (1.5 * DEG) ** 2));
    let pp = this.heelStart ? this.heelStart(X, t, sched) : sched, dy = 0, rho = 0, out = solve(pp, dy, rho);   // (heelStart: a subclass's hand-off hook; none here)
    for (let it = 0; it < 4; it++) {
      // the heel: up as soon as the ankle would dorsiflex past its range (LB.dfRise), and in the push-off once the leg nears its length
      const ex = out.df - LB.dfRise, addDF = ex > -6 ? 3 * Math.log(1 + Math.exp(ex / 3)) * DEG * 0.9 : 0;
      // the yaw the hip, tibia and forefoot could not take: the foot turns about the ball of the foot (the heel a little up); the roll the
      // subtalar joint could not take: the foot rolls onto its edge
      const rY = out.A.res[0], rR = out.A.res[2], rMax = 15 * DEG * (1 - s5(pp / (25 * DEG))), ndy = dy - rY, nrho = clamp(rho + 0.85 * rR, -rMax, rMax), pYaw = min(12 * DEG, abs(ndy) * 0.6);
      const npp = min(70 * DEG, smax(sched, max(out.pp - sched > 0 ? out.pp : sched, 0) + addDF > sched ? max(out.pp, sched) + addDF : sched)); const npp2 = smax(npp, pYaw);
      if (abs(npp2 - pp) < 0.02 * DEG && abs(ndy - dy) < 0.02 * DEG && abs(nrho - rho) < 0.02 * DEG) break;
      pp = npp2; dy = ndy; rho = nrho; out = solve(pp, dy, rho); }
    const dLim = LB.reachStance * b.legLen; if (out.ik.dW > dLim && out.pp < LB.pushMax) { let lo = out.pp, hi = min(LB.pushMax, out.pp + 45 * DEG); if (solve(hi, dy, rho).ik.dW > dLim) out = solve(hi, dy, rho); else { for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (solve(m, dy, rho).ik.dW > dLim) lo = m; else hi = m; } out = solve(hi, dy, rho); } }
    if (this.heelFinal) { const q = this.heelFinal(X, t, out); if (q) out = solve(q.pp, q.dy, q.rho); }                // (a subclass's hand-off hook; none here)
    return { v: [out.psiK, out.A.tau, out.A.fy, out.A.fp, out.A.fr, -out.pp], ik: out.ik, an: out.an, ank: out.ank, Rf: out.Rf, A: out.A, Rw: Q.mul(Q.y(psi), out.Rf), planted: true, roll: out.rho, turn: out.dy, sup: out.sup, edge: out.edge };
  }
  // ── THE SWING LEG: the joint plan (C¹ monotone cubic through the keys) and the world-locked windows (toe-off · contact · landing) ───────────────
  winW(Wd, t) { if (t < Wd.a || t > Wd.d) return 0; if (t < Wd.b) return s5((t - Wd.a) / max(1e-6, Wd.b - Wd.a)); if (t <= Wd.c) return 1; return 1 - s5((t - Wd.c) / max(1e-6, Wd.d - Wd.c)); }
  swingLeg(X, s, ft, pf, t) {
    const b = this.b, hip = this.hipAt(pf, X), psi = pf.psi, an = this.toM(ft.ank, pf.P, psi); if (!s.J) this.planSwing(X, s);
    const v = pchipAt(s.J, t, NCH), ik = legIK(b, pf.Rp, v[0], hip, an, LB.kMin), Rsh0 = Q.mul3(pf.Rp, ik.Rthigh, Q.x(ik.k)); let wSum = 0, acc = [0, 0, 0, 0];
    for (const Wd of s.W) { const w = this.winW(Wd, t); if (w <= 0) continue; const Rf = Q.mul(Q.y(-psi), Wd.Rw), A = ankleFor(Rsh0, Rf, X, ik.k); acc = [acc[0] + w * A.tau, acc[1] + w * A.fy, acc[2] + w * A.fp, acc[3] + w * A.fr]; wSum += w; }
    let j = [v[1], v[2], v[3], v[4]]; if (wSum > 0) { const k = min(1, wSum), m = acc.map((x) => x / wSum); j = j.map((x, i) => lerp(x, m[i], k)); }
    const sx = sgnF(X), tb = ROM.tib(ik.k / DEG, false), H = ROM.hard, tau = sx * soft(sx * j[0] / DEG, tb[0], tb[1], 3) * DEG, fy = sx * soft(sx * j[1] / DEG, H.abd[0], H.abd[1], 3) * DEG, fp = -soft(-j[2] / DEG, H.df[0], H.df[1], 5) * DEG, fr = -sx * soft(-sx * j[3] / DEG, H.inv[0], H.inv[1], 4) * DEG;
    return { v: [v[0], tau, fy, fp, fr, v[5]], ik, an, planted: false };
  }
  // a swinging boot goes round (or over) the ball, never through it: on the real ball of this frame, the ankle target is moved out along the
  // ball → ankle direction (lifted a little) until the boot clears the ball by the margin (0 for the touching foot at its contact, which must
  // meet the ball, 1.2 cm otherwise); the leg is then re-solved on its own plan — continuous, since the depth grows from zero
  avoidBall(X, s, ft, pf, t, L, ballLocal) { const H = LegBody.hull(this.sim); if (!H || !ballLocal) return L;
    const c = s.con, dC = c ? abs(t - c.t) : 9, margin = c ? 0.012 * clamp((dC - 0.02) / 0.04, 0, 1) : 0.012, bM = this.toM([ballLocal[0], ballLocal[1], max(R, ballLocal[2])], pf.P, pf.psi);
    const Rfoot = (L2) => Q.mul3(pf.Rp, L2.ik.Rthigh, Q.mul3(Q.x(L2.ik.k), Q.y(L2.v[1]), Q.yxz(L2.v[2], L2.v[3], L2.v[4]))), g0 = ballGap(H[X], X, Rfoot(L), L.an, bM, R).gap; if (g0 >= margin) return L;
    const d = [L.an[0] - bM[0], L.an[1] - bM[1] + 0.06, L.an[2] - bM[2]], dl = hyp(d[0], d[1], d[2]) || 1, u = [d[0] / dl, d[1] / dl, d[2] / dl], Rf0 = Rfoot(L);
    let lo = 0, hi = 0.3; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2, a = [L.an[0] + u[0] * m, L.an[1] + u[1] * m, L.an[2] + u[2] * m]; if (ballGap(H[X], X, Rf0, a, bM, R).gap < margin) lo = m; else hi = m; }
    const aM = [L.an[0] + u[0] * hi, max(HB.ankleH - 0.012, L.an[1] + u[1] * hi), L.an[2] + u[2] * hi], ft2 = Object.assign({}, ft, { ank: this.fromM(aM, pf.P, pf.psi) }), L2 = this.swingLeg(X, s, ft2, pf, t); L2.pushed = hi; return L2; }
  // the joint values a world orientation gives at time t on this foot's path (a key's value; the window re-solves it per frame)
  worldKey(X, t, Rw, toe) { const pf = this.pelvisFull(t + this.tc), ft = this.footAt(X, t), hip = this.hipAt(pf, X), an = this.toM(ft.ank, pf.P, pf.psi), Rf = Q.mul(Q.y(-pf.psi), Rw);
    const psiK = swivelFor(footOut(pf.Rp, Rf, X), X), ik = legIK(this.b, pf.Rp, psiK, hip, an, LB.kMin), A = ankleFor(Q.mul3(pf.Rp, ik.Rthigh, Q.x(ik.k)), Rf, X, ik.k); return { t, v: [psiK, A.tau, A.fy, A.fp, A.fr, toe || 0], world: true }; }
  // RUN-1's swing channels at speed v (the approved running gait's own hip swivel, ankle and toe through the swing; the right leg's, mirrored)
  runChannels(v) { const key = Math.round(clamp(v, 3, 9.5) * 4) / 4, cache = LegBody._ch || (LegBody._ch = new Map()); if (cache.has(key)) return cache.get(key);
    const E = this.E, b = this.b, G = E.r1GaitAt(b, E.RUN1.ref, key), out = [];
    for (let i = 0; i <= 20; i++) { const w = i / 20, u = G.D + w * (1 - G.D), pz = E.r1Pose({ body: b, p: G }, u, null), rt = pz.rot || pz.pose.rot, Th = rt.thigh_R, f = Q.toYXZ(rt.foot_R), Tt = rt.toe_R;
      out.push({ psi: Math.atan2(-Th[6], Th[0]), fy: f[0], fp: f[1], fr: f[2], toe: Math.atan2(Tt[7], Tt[4]) }); }
    cache.set(key, out); return out; }
  planJoints() { for (const X of SIDES) for (const s of this.seg[X]) this.planSwing(X, s); }
  planSwing(X, s, from) {
    const ep = this.ep, sx = sgnF(X), T = s.t1 - s.t0, keys = [], W = [], c = s.con, tc = c ? c.t : null;
    // the toe-off: the stance's last state (continuous with it), or — after a re-plan mid-swing — the previous body's state now
    let k0; if (from) k0 = from; else { const tq = s.t0 - 1e-6, st = this.legStateAt(X, tq), st1 = this.legStateAt(X, tq - DT); k0 = { t: s.t0, v: st.v, s: st.v.map((x, i) => (x - st1.v[i]) / DT) };
      // (no world lock at the toe-off: the plan starts at the stance's own joint values and rates — C¹ — and the foot leaves the turf with them)
      if (st.planted) {
        if (s.keys && s.keys.length && st.ank) { s.keys[0].p = st.ank.slice(); const a1 = st1.ank || st.ank; s.keys[0].v = [(st.ank[0] - a1[0]) / DT, (st.ank[1] - a1[1]) / DT, max(0.25, (st.ank[2] - a1[2]) / DT)]; } } }
    keys.push(k0); const tS = k0.t;
    const cp = c ? this.contactPose(X, c.surface, c.ball, this.impulseDir(c)) : null, h1 = c ? clamp(0.3 * (tc - tS), 0.01, LB.hold[0]) : 0, h2 = c ? clamp(0.35 * (s.t1 - tc), 0.01, LB.hold[1]) : 0;
    const tEnd = c ? tc - h1 - LB.windMin : s.t1 - 0.06, v = hyp(...ep.velAt(s.t0 + T / 2));
    // RUN-1's channels from 30 % of the swing on (this body's toe-off is TECHNICAL-CONTROL-1's heel rise, not RUN-1's push-off: the first 30 % carries
    // the stance's own values into RUN-1's swing instead of forcing RUN-1's early-swing plantarflexion in 40 ms)
    if (v >= 2.6) { const ch = this.runChannels(v); for (const w of [0.3, 0.45, 0.6, 0.75]) { const t = s.t0 + w * T; if (t < tS + 0.05 || t > tEnd) continue; const q = ch[Math.round(w * 20)];
        keys.push({ t, v: [sx * q.psi, 0, sx * q.fy, q.fp, sx * q.fr, q.toe] }); } }
    else if (!c && s.t1 - tS > 0.12) keys.push({ t: tS + 0.5 * (s.t1 - tS), v: [swivelFor(0, X), 0, 0, 8 * DEG, 0, 0] });   // a low step: the toe lifted a little, the ankle near neutral
    // (a re-plan just after this swing's contact — the episode re-plans at every contact — never re-imposes the contact's surface: the contact has
    // happened, the plan carries on from the leg's state now)
    if (c && cp.RW && !(from && tc <= from.t + 0.6 * DT)) { for (const tk of [tc - h1, tc]) if (tk > tS + 0.004) keys.push(this.worldKey(X, tk, cp.RW, 0)); W.push({ a: tc - h1 - 0.02, b: tc - h1, c: tc + h2, d: tc + h2 + 0.02, Rw: cp.RW, kind: "contact", flag: cp.flag });
      s.cp = cp; }
    // the landing: the stance's own first state (flat — or on the forefoot when the ankle would dorsiflex past its range: the heel then comes down
    // as the leg allows), so the touchdown is continuous with the stance; the swing's last position key lands the ankle exactly there
    const sl = this.legStateAt(X, s.t1 + 1e-6), Rl = sl.planted ? sl.Rw : Q.y(s.to.yaw), kl = this.worldKey(X, s.t1, Rl, sl.planted ? sl.v[5] : 0);
    if (sl.planted && s.keys && s.keys.length && sl.ank) { const kk = s.keys[s.keys.length - 1]; if (abs(kk.t - s.t1) < 1e-6) kk.p = sl.ank.slice(); }
    keys.push(kl); W.push({ a: s.t1 - LB.landWin, b: s.t1, c: s.t1, d: s.t1 + 1e-4, Rw: Rl, kind: "land" });
    keys.sort((a, b2) => a.t - b2.t); for (let i = keys.length - 1; i > 0; i--) if (keys[i].t - keys[i - 1].t < 0.008) keys.splice(keys[i].world && !keys[i - 1].world ? i - 1 : i === keys.length - 1 ? i - 1 : i, 1);
    if (keys[0] !== k0 && k0.t <= keys[0].t) keys.unshift(k0);
    s.J = pchip(keys, NCH); s.W = W;
  }
  // a leg's full state at t (its final joint values): for the toe-off key and a re-plan's hand-over
  legStateAt(X, t) { const pf = this.pelvisFull(t + this.tc), ft = pf.feet[X]; if (ft.planted) return this.stanceLeg(X, ft, pf); const s = this.segAt(X, t); if (s && s.J) return this.swingLeg(X, s, ft, pf, t);
    if (s) { const tmp = this.legFallback(X, ft, pf); return tmp; } return this.legFallback(X, ft, pf); }
  legFallback(X, ft, pf) { const Rf = Q.mul3(Q.y(wrapA(ft.yaw - pf.psi)), Q.x(-(ft.pitch || 0)), Q.I()), hip = this.hipAt(pf, X), an = this.toM(ft.ank, pf.P, pf.psi), psiK = swivelFor(footOut(pf.Rp, Rf, X), X), ik = legIK(this.b, pf.Rp, psiK, hip, an, LB.kMin), A = ankleFor(Q.mul3(pf.Rp, ik.Rthigh, Q.x(ik.k)), Rf, X, ik.k);
    return { v: [psiK, A.tau, A.fy, A.fp, A.fr, 0], ik, an, planted: false, ank: ft.ank }; }
  // ── CONTINUITY ACROSS RE-PLANS: TECHNICAL-CONTROL-1's C¹ hand-over of the foot paths, then each swing in progress re-plans its joints from the
  // previous body's state now (value and rate) ────────────────────────────────────────────────────────────────────────────────────────────────
  inherit(prev, tNow) { super.inherit(prev, tNow); if (!prev || !prev.legStateAt) return;
    // A LATE DECISION: the contact just executed differs from what the previous plan prepared (the episode decides an action or a redirect at the
    // contact itself — the intent changed after the last re-plan): the leg could not prepare for it. Flagged: the contact as scheduled is visually
    // infeasible (the foot met the ball prepared for the planned touch); the follow-through carries on from there, without a snap.
    const fl = this.sim.rc2 && (this.sim.rc2._tc11flags || (this.sim.rc2._tc11flags = []));
    for (const c of this.contactsKnown) { if (c.planned || abs(c.t - tNow) > 0.02) continue; const p0 = prev.contactsKnown.find((q) => q.i === c.i); if (!p0 || !p0.planned) continue;
      const a0 = hdg(prev.impulseDir(p0)), a1 = hdg(this.impulseDir(c)), dA = abs(wrapA(a1 - a0)) / DEG; if (p0.surface !== c.surface || dA > 25 || p0.F !== c.F) { if (fl && !fl.some((f) => f.i === c.i)) fl.push({ i: c.i, t: +c.t.toFixed(3), F: c.F, planned: p0.surface, executed: c.surface, dImpulse: +dA.toFixed(0), kind: "late decision" }); } }
    for (const X of SIDES) { const s = this.seg[X].find((q) => q.t0 <= tNow && q.t1 > tNow); if (!s) continue; const a = prev.legStateAt(X, tNow), a1 = prev.legStateAt(X, tNow - DT);
      this.planSwing(X, s, { t: tNow, v: a.v, s: a.v.map((x, i) => (x - a1.v[i]) / DT) }); }
    this._pf = null; }
  // ── the pose at tAbs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  poseAt(tAbs, ballLocal) {
    const pf = this.pelvisFull(tAbs, ballLocal), t = pf.t, legRot = {}, legs = {};
    for (const X of SIDES) { const ft = pf.feet[X], s = ft.planted ? null : this.segAt(X, t); let L = ft.planted ? this.stanceLeg(X, ft, pf) : s ? this.swingLeg(X, s, ft, pf, t) : this.legFallback(X, ft, pf);
      if (s && !ft.planted) L = this.avoidBall(X, s, ft, pf, t, L, ballLocal); const v = L.v;
      legRot["thigh_" + X] = L.ik.Rthigh; legRot["shin_" + X] = Q.mul(Q.x(L.ik.k), Q.y(v[1])); legRot["foot_" + X] = Q.yxz(v[2], v[3], v[4]); legRot["toe_" + X] = Q.x(v[5]);
      legs[X] = { v, short: L.ik.short, planted: !!ft.planted, roll: L.roll || 0, turn: L.turn || 0, sup: L.sup || null, edge: L.edge || 0 }; }
    const pose = { rot: Object.assign({}, pf.pose.rot, legRot), pelvisPos: pf.pelvis }, out = this.finish(pf.P, pf.psi, pose);
    out.S = pf.P; out.psi = pf.psi; out.feet = pf.feet; out.w = pf.w; out.t = t; out.fam = pf.fam; out.legs = legs; return out;
  }
}

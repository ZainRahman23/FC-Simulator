// ═══ physchar/pc_support.js — GATE C2: DELIBERATE SUPPORT TRANSITIONS (weight transfer, liftoff, swing, touchdown, load acceptance) ═══════
// The action layer may REQUEST: "shift weight", "lift this foot and hold", "place this foot about here". This layer decides whether and how
// the physical body can do it, and it never declares that anything physically happened: every phase change is gated by SENSED contact,
// load and motion (pc_sense.js). It only moves two things the C1 balance controller already understands:
//   • the capture-point reference ξ_ref (where the body should balance: that is how weight moves between the feet), and
//   • a world-space target for a foot under SWING control (the balance controller turns it into leg joint targets by IK).
// It never touches a body, a collision mask or a contact, and it does not use C1's STEP_NEEDED signal (no corrective stepping in C2).
import { V, Q, rad, deg, datan2, dsin, dcos } from "./pc_math.js";
import { minjerk } from "./pc_control.js";
import { polyDist } from "./pc_sense.js";

export const SUP = {
  // weight transfer + liftoff gate (all measured)
  shiftT: 0.9,             // s: ξ_ref moves onto the stance foot (min-jerk)
  liftLoadFrac: 0.05,      // swing-foot load must fall below 5 % of body weight …
  liftMargin: 0.02,        // … ξ must be ≥ 2 cm inside the STANCE foot's sole region …
  liftVmax: 0.08,          // … |v_COM| ≤ 8 cm/s, the stance foot loaded and not sliding …
  readySteps: 12,          // … all held for 50 ms
  liftTorqueUse: 0.8,      // V1.1 controller (unloadPlan): … and holding ξ over the stance foot alone needs ≤ 80 % of its ankle's finite torque
                           // on every axis (inversion/eversion, dorsi-, plantarflexion) — a 20 % reserve for balance corrections in single support
  readyTimeout: 1.2,       // s after the shift ends → REJECTED (weight transfer not achieved)
  liftTimeout: 0.4,        // s: the foot must physically leave the ground after the lift is commanded
  // swing
  clearance: 0.08,         // m: mid-swing rise of the ankle above the straight line (sole clearance ≈ this)
  toeClear: 0.025, clearanceMax: 0.16,   // m: toe clearance kept at the end of the progression; the clearance is raised for it up to 16 cm
  hStart: 0.12, hEnd: 0.75, // swing phases (fraction of T): rise only → horizontal progression → near-vertical approach
  armRise: 0.005,          // m: touchdown detection arms once the sole has risen this far above its liftoff height
  liftH: 0.08, liftShinDeg: 8,   // lift-and-hold: ankle 8 cm up, shin within 8° of vertical (boot level inside the ankle's range)
  swingShinDeg: 18,        // placement swing: shin ≤ 18° back at mid-swing (ankle at its 15° usable dorsiflexion + ≈ 3° boot pitch; toe drop ≈ 1.5 cm)
  toeUpDeg: 8,             // mid-swing dorsiflexion for toe clearance
  swingTmin: 0.5, swingTmax: 1.2, swingTperM: 0.8,   // s: swing duration from the path length (forward bias included)
  touchDepth: -0.005,      // m: the planned touchdown height is 5 mm below flat, so the foot presses into contact
  approachH: 0.015,        // m: the swing ends this far above flat; ALIGN holds there, then DESCEND presses down at descendV
  alignTol: 0.012, alignV: 0.05, alignSteps: 12, alignMax: 1.0,
  descendV: 0.08, descendMax: 0.03, noContactTimeout: 0.8,
  blockLag: 0.06, blockV: 0.05, blockSteps: 36,   // swing foot ≥ 6 cm behind its trajectory and < 5 cm/s toward it for 150 ms → BLOCKED
  // load acceptance
  // acceptT: moving the COM off the old stance foot has only that foot's ankle to push with (its far edge, ≈ 4.6 cm of CoP at 35 N·m roll)
  // — a 0.6 s min-jerk ξ path needed the CoP ≈ 10.7 cm beyond it and the landed foot floated off; 1.2 s needs ≈ 3.8 cm (finding 2026-09-29)
  // (2.0 s: a forward-diagonal placement moves ξ ≈ 15 cm sideways AND 12 cm forward; at 1.2 s its feed-forward CoP saturated the rear
  // ankle's roll share and he fell in acceptance — peak offset ∝ Δ/T: ≈ 0.2·Δ at 1.2 s, ≈ 0.07·Δ at 2.0 s)
  acceptT: 2.0, acceptTperM: 12, acceptLoadFrac: 0.35, acceptBand: 0.08, acceptSteps: 24,   // T = max(2 s, 12 s/m × transfer distance)
  fwdBalFrac: 0, fwdBalMax: 0.06,     // forward placement: stance balance point moved forward by a fraction of the forward reach — TRIED at 0.3 (≤ 6 cm): fell forward in single support; off
  acceptPreload: 0.06,     // the landed foot is commanded to carry ≥ 6 % BW from touchdown (it stays planted; it is not held weightless)
  // single-support hip load (finding 2026-09-29: this body's hip joint centres are 32.4 cm apart, ≈ 1.8× human, so standing on one leg
  // needs ≈ 124 N·m of stance-hip abduction statically = 89 % of the candidate 140 N·m; the pelvis dropped on the swing side (Trendelenburg)
  // and the stance hip saturated). Compensation, as a person with overloaded abductors does it: a lateral trunk lean over the stance leg,
  // SIZED FROM THE BODY'S OWN STATICS so the stance-hip demand is ≈ hipLoad × capacity (not tuned per test).
  hipLoad: 0.7, leanMaxDeg: 20,
  // feasibility
  footClear: 0.03,         // m: minimum clearance between the swing footprint and the ACTUAL stance footprint
  pathClear: 0.01,         // m: horizontal clearance of the swing path past the stance footprint
  latMin: 0.10,            // m: no crossover — the swing foot centre stays ≥ 10 cm to its own side of the stance foot centre
  reachExt: 0.995,         // legs at most 99.5 % extended (knee ≥ ≈ 11°; extension = cos(knee/2) — 0.96 meant a 32° knee, stricter than standing) …
  maxPelvisDrop: 0.08,     // … reachable with at most this much pelvis lowering — an upper cap; the binding limit is what keeps the stance ankle ≥ 5° off its dorsiflexion stop (≈ 2.5–3.7 cm)
  hipFlex: 70, hipExt: 25, hipAbd: 35, hipAdd: 15,   // deg: resulting-stance hip angles (inside the joint ROM, with margin)
  yawMax: 25,              // deg: swing-foot yaw relative to the stance foot
  minMove: 0.03,           // m: a projected target closer than this to the current foot = nothing feasible → REJECTED
};
const W_BW = (spec) => spec.totalMass * 9.81;
// ── 2-D convex polygon helpers (x, z) ──
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
function segDist(p, a, b) { const e = sub2(b, a), w = sub2(p, a), t = Math.max(0, Math.min(1, dot2(w, e) / Math.max(1e-12, dot2(e, e)))), d = [w[0] - t * e[0], w[1] - t * e[1]]; return Math.sqrt(dot2(d, d)); }
function inside(poly, p) { for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = sub2(b, a), w = sub2(p, a); if (e[0] * w[1] - e[1] * w[0] < 0) return false; } return true; }
// signed distance between two convex polygons (< 0 = overlapping)
export function polyPolyDist(A, B) { if (A.some(p => inside(B, p)) || B.some(p => inside(A, p))) return -1; let d = 1e9;
  for (const p of A) for (let i = 0; i < B.length; i++) d = Math.min(d, segDist(p, B[i], B[(i + 1) % B.length]));
  for (const p of B) for (let i = 0; i < A.length; i++) d = Math.min(d, segDist(p, A[i], A[(i + 1) % A.length]));
  // edges crossing without a vertex inside (thin rectangles) → overlap
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) if (segX(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length])) return -1;
  return d; }
function segX(a, b, c, d) { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; }
// a foot's sole footprint (counter-clockwise quad, x/z) for a given centre + yaw
export function footprint(box, center, yaw) { const c = dcos(yaw), s = dsin(yaw), hx = box.he[0], hz = box.he[2], out = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lx = sx * hx, lz = sz * hz; out.push([center[0] + c * lx + s * lz, center[1] - s * lx + c * lz]); }
  return ccw(out); }
// counter-clockwise in (x, z) = positive shoelace area — the orientation polyDist / inside() treat as "left of every edge = inside"
function hull(P) { const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
function ccw(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? P : P.slice().reverse(); }
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return datan2(f[0], f[2]); };

export class SupportSequencer {
  constructor(spec, poses, ctrl, requests) {
    this.spec = spec; this.ctrl = ctrl; this.queue = (requests || []).map((r, i) => ({ ...r, id: i })); this.cur = null; this.log = []; this.reports = [];
    const bi = (n) => spec.bodies.findIndex(b => b.name === n); this.foot = { L: bi("foot_L"), R: bi("foot_R") }; this.box = spec.bodies[this.foot.L].planBox || spec.bodies[this.foot.L].shapes[0];   // (F2: the whole foot's outline, main foot + toe at neutral)
    const N = poses.N; this.yFlat = N.feet.L[1]; this.W = W_BW(spec);
    this.phase = "DOUBLE_SUPPORT"; this.role = { L: "LOADED", R: "LOADED" }; this.hist = [];
    // single-support statics (bind pose, both legs vertical under their hips, pelvis level): stance-hip abduction moment
    //   τ(θ) = g·[m_up·(d − h_up·sin θ) + m_pelvis·d + m_swingLeg·2d]      d = hip half-width, m_up / h_up = the trunk above the lumbar joint
    const g = 9.81, B = spec.bodies, S = poses.N.S, sub = ctrl.subtree, ji = (n) => spec.joints.findIndex(j => j.name === n), lum = ji("lumbar"), hipR = ji("hip_R");
    const d = Math.abs(ctrl.legs.L.hipOff[0]), mUp = sub[lum].reduce((a, i) => a + B[i].mass, 0), yUp = sub[lum].reduce((a, i) => a + B[i].mass * V.add(S[i].pos, Q.rot(S[i].rot, B[i].com))[1], 0) / mUp;
    const hUp = yUp - S[spec.joints[lum].childIndex].pos[1], mPel = B[0].mass, mLeg = sub[hipR].reduce((a, i) => a + B[i].mass, 0), cap = ctrl.limits.hip.Z[1] * ctrl.mult;
    // e = the free leg's COM lateral offset from its own hip joint in the neutral pose (0 when the leg hangs straight below the hip, as in V1;
    // V1.1's bind femur is tilted, so the hanging leg's mass sits lateral of its hip)
    const hipX = S[spec.joints[hipR].childIndex].pos[0], eRaw = sub[hipR].reduce((a, i) => a + B[i].mass * V.add(S[i].pos, Q.rot(S[i].rot, B[i].com))[0], 0) / mLeg - hipX, e = Math.abs(eRaw) < 1e-6 ? 0 : eRaw;
    const tau0 = g * (mUp * d + mPel * d + mLeg * (2 * d + e)), sinT = Math.max(0, Math.min(dsin(rad(SUP.leanMaxDeg)), (tau0 - SUP.hipLoad * cap) / (g * mUp * hUp)));
    this.leanInfo = { hipHalfWidth: d, legComOffset: e, mUp, hUp, mPelvis: mPel, mLeg, tau0, cap, target: SUP.hipLoad * cap, leanDeg: deg(Math.asin(sinT)), tauAtLean: tau0 - g * mUp * hUp * sinT };
    this.leanRad = Math.asin(sinT);
    // where the pelvis sits in single support, relative to the COM over the stance foot (toward the swing side), from the same statics:
    //   δ = (m_up·h_up·sin θ − m_leg·d + m_leg·d/2) / (m_pelvis + m_up + m_leg + m_leg/2)      (stance-leg COM ≈ half-way hip→ankle)
    this.ssPelvisOffset = (mUp * hUp * sinT - mLeg * (d + e) + mLeg * d / 2) / (mPel + mUp + mLeg + mLeg / 2); this.leanInfo.ssPelvisOffset = this.ssPelvisOffset;
  }
  // ── geometry from the SENSED state ──
  _center(o, s) { const st = o.states[this.foot[s]], b = this.box; const c = V.add(st.pos, Q.rot(st.rot, b.pos)); return [c[0], c[2]]; }
  _sole(o, s) { return hull(o.feet[s].sole.map(p => [p[0], p[2]])); }     // the sensor lists the 4 sole corners unordered → convex hull (CCW)
  _weightPoint(o, s, extra) { const st = o.states[this.foot[s]], hd = this._heading(o, s), f = this.ctrl.comFwd + (extra || 0); return [st.pos[0] + hd[0] * f, st.pos[2] + hd[1] * f]; }
  _soleLow(o, s) { return Math.min(...o.feet[s].sole.map(p => p[1])); }
  _heading(o, s) { const f = Q.rot(o.states[this.foot[s]].rot, [0, 0, 1]), n = Math.sqrt(f[0] * f[0] + f[2] * f[2]); return [f[0] / n, f[2] / n]; }
  _ankleFromCenter(center, yaw) { const b = this.box, c = dcos(yaw), s = dsin(yaw); return [center[0] - (c * b.pos[0] + s * b.pos[2]), center[1] - (-s * b.pos[0] + c * b.pos[2])]; }
  // ── FEASIBILITY: may foot `sw` be placed with its sole centre at `tc` (x, z) and yaw `yaw`, given the stance foot `st` where it actually is? ──
  feasibility(o, sw, tc, yaw, startCenter) {
    const st = sw === "L" ? "R" : "L", reasons = [], stC = this._center(o, st), hd = this._heading(o, st), side = sw === "R" ? 1 : -1, lat = [hd[1] * side, -hd[0] * side]; // lat: toward the swing foot's side
    const stYaw = yawOf(o.states[this.foot[st]].rot), rel = sub2(tc, stC), latOff = dot2(rel, lat), fwdOff = dot2(rel, hd);
    let dy = yaw - stYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; if (Math.abs(dy) > rad(SUP.yawMax)) reasons.push(`yaw ${deg(dy).toFixed(0)}° beyond ±${SUP.yawMax}° of the stance foot`);
    if (latOff < SUP.latMin) reasons.push(`crossover: ${(latOff * 100).toFixed(0)} cm to its own side of the stance foot (min ${SUP.latMin * 100} cm)`);
    const fp = footprint(this.box, tc, yaw), stSole = this._sole(o, st), clr = polyPolyDist(fp, stSole);
    if (clr < SUP.footClear) reasons.push(clr < 0 ? "footprint overlaps the stance foot" : `only ${(clr * 100).toFixed(1)} cm from the stance foot (min ${SUP.footClear * 100} cm)`);
    if (startCenter) { for (let k = 1; k < 10; k++) { const t = k / 10, pc = [startCenter[0] + (tc[0] - startCenter[0]) * t, startCenter[1] + (tc[1] - startCenter[1]) * t];
      if (polyPolyDist(footprint(this.box, pc, yaw), stSole) < SUP.pathClear) { reasons.push("swing path passes through the stance foot"); break; } } }
    // reach + hip ROM in the RESULTING double stance (pelvis over the mid-point, height lowered as needed within maxPelvisDrop)
    const stAnk = o.states[this.foot[st]].pos, swAnk2 = this._ankleFromCenter(tc, yaw), yA = stAnk[1];
    const mid = [(stAnk[0] + swAnk2[0]) / 2, (stAnk[2] + swAnk2[1]) / 2], pyaw = (stYaw + yaw) / 2, legs = this.ctrl.legs, Lmax = SUP.reachExt * (legs.L.L1 + legs.L.L2);
    const Rp = Q.axis([0, 1, 0], pyaw), hNom = yA + this.ctrl.hPelvis; let hMax = hNom;
    const hipOf = (s) => Q.rot(Rp, legs[s].hipOff), ankOf = (s) => s === st ? [stAnk[0], stAnk[2]] : swAnk2;
    for (const s of ["L", "R"]) { const ho = hipOf(s), a = ankOf(s), hx = mid[0] + ho[0] - a[0], hz = mid[1] + ho[2] - a[1], horiz2 = hx * hx + hz * hz;
      hMax = Math.min(hMax, horiz2 >= Lmax * Lmax ? -1 : yA + Math.sqrt(Lmax * Lmax - horiz2) - ho[1]); }
    // the allowed lowering is what keeps the stance ankle ≥ 5° off its dorsiflexion stop (not a fixed number): single support, pelvis over the stance foot
    const stF = o.states[this.foot[st]], wpA = this._weightPoint(o, st), dlA = this.ssPelvisOffset, pSS = [wpA[0] + lat[0] * dlA, wpA[1] + lat[1] * dlA];
    const yMinAnk = this.ctrl.minPelvisY(st, pSS, Q.axis([0, 1, 0], stYaw), stF.pos, stF.rot, hNom, rad(5)), dropAllowed = Math.min(SUP.maxPelvisDrop, hNom - yMinAnk);
    const drop = hNom - hMax; if (drop > dropAllowed) reasons.push(drop > 1 ? "beyond leg reach" : `needs ${(drop * 100).toFixed(0)} cm of pelvis drop (the stance ankle allows ${(dropAllowed * 100).toFixed(1)} cm)`);
    const hPel = Math.min(hNom, hMax), fwdW = [dsin(pyaw), dcos(pyaw)], latW = [dcos(pyaw), -dsin(pyaw)];
    // V1.1 controller (ankleReach): the RESULTING double stance must also keep BOTH ankles ≥ dorsiMarginDeg off their dorsiflexion stops at the
    // pelvis height its reach needs — with the pelvis over the mid-point the REAR shank tilts forward and dorsiflexes; the single-support check
    // above (pelvis over the stance foot) cannot see it. Without it, 21–26 cm forward placements were planned whose load acceptance had to
    // raise the pelvis for the rear ankle, straightened the front leg to 100 % and lifted the landed foot off the turf for up to 1 s
    // (finding 2026-09-30; V1's 20° range limited the planned drop and hid the gap)
    if (this.ctrl.opts.ankleReach && drop <= dropAllowed) { const swRot = Q.axis([0, 1, 0], yaw), foot = (s) => s === st ? { pos: stF.pos, rot: stF.rot } : { pos: [swAnk2[0], yA, swAnk2[1]], rot: swRot };
      let yNeed = -1e9, which = null; for (const s of ["L", "R"]) { const f = foot(s), y = this.ctrl.minPelvisY(s, mid, Rp, f.pos, f.rot, hNom, rad(5)); if (y > yNeed) { yNeed = y; which = s; } }
      if (hPel < yNeed - 1e-4) reasons.push(`resulting stance: the ${which === st ? "stance" : "placed"} ankle would be within 5° of its dorsiflexion stop at the ${((hNom - hPel) * 100).toFixed(1)} cm pelvis drop the reach needs`); }
    for (const s of ["L", "R"]) { const ho = hipOf(s), a = ankOf(s), d = [a[0] - (mid[0] + ho[0]), a[1] - (mid[1] + ho[2])], down = hPel + ho[1] - yA, f = dot2(d, fwdW), l = dot2(d, latW) * (s === "R" ? 1 : -1);
      const flex = deg(datan2(f, down)), abd = deg(datan2(l, down));
      if (flex > SUP.hipFlex) reasons.push(`${s} hip flexion ${flex.toFixed(0)}° > ${SUP.hipFlex}°`); if (-flex > SUP.hipExt) reasons.push(`${s} hip extension ${(-flex).toFixed(0)}° > ${SUP.hipExt}°`);
      if (abd > SUP.hipAbd) reasons.push(`${s} hip abduction ${abd.toFixed(0)}° > ${SUP.hipAbd}°`); if (-abd > SUP.hipAdd) reasons.push(`${s} hip adduction ${(-abd).toFixed(0)}° > ${SUP.hipAdd}°`); }
    // SINGLE-SUPPORT reach: during the swing the pelvis is over the stance foot (no stepping — the body does not travel), so the swing hip
    // must reach the touchdown point from there, with at most maxPelvisDrop of stance-knee lowering, inside the hip's range of motion
    { const wp0 = this._weightPoint(o, st), dl = this.ssPelvisOffset, wp = [wp0[0] + lat[0] * dl, wp0[1] + lat[1] * dl], Rs = Q.axis([0, 1, 0], stYaw), ho = Q.rot(Rs, legs[sw].hipOff), hip = [wp[0] + ho[0], wp[1] + ho[2]], d2 = [swAnk2[0] - hip[0], swAnk2[1] - hip[1]], hz2 = d2[0] * d2[0] + d2[1] * d2[1];
      const yAnk = yA + SUP.touchDepth, hMaxSS = hz2 >= Lmax * Lmax ? -1 : yAnk + Math.sqrt(Lmax * Lmax - hz2) - ho[1], dropSS = hNom - hMaxSS;
      if (dropSS > dropAllowed) reasons.push(dropSS > 1 ? "beyond single-support reach" : `single support: needs ${(dropSS * 100).toFixed(1)} cm of pelvis drop to reach (the stance ankle allows ${(dropAllowed * 100).toFixed(1)} cm)`);
      const hP = Math.min(hNom, hMaxSS), down = hP + ho[1] - yAnk, fw = [dsin(stYaw), dcos(stYaw)], lw = [dcos(stYaw), -dsin(stYaw)], f = dot2(d2, fw), l = dot2(d2, lw) * (sw === "R" ? 1 : -1);
      const flex = deg(datan2(f, down)), abd = deg(datan2(l, down));
      if (flex > SUP.hipFlex) reasons.push(`single support: ${sw} hip flexion ${flex.toFixed(0)}° > ${SUP.hipFlex}°`); if (-flex > SUP.hipExt) reasons.push(`single support: ${sw} hip extension ${(-flex).toFixed(0)}° > ${SUP.hipExt}°`);
      if (abd > SUP.hipAbd) reasons.push(`single support: ${sw} hip abduction ${abd.toFixed(0)}° > ${SUP.hipAbd}°`); if (-abd > SUP.hipAdd) reasons.push(`single support: ${sw} hip adduction ${(-abd).toFixed(0)}° > ${SUP.hipAdd}°`); }
    return { ok: reasons.length === 0, reasons, clearance: clr, latOff, fwdOff, pelvisDrop: Math.max(0, drop), footprint: fp };
  }
  // requested → feasible: the request as given if feasible; otherwise the farthest feasible point on the segment from the foot's current
  // centre toward the request (bisection). Nothing feasible toward it → REJECTED. Every correction and its reasons are reported.
  project(o, sw, req) {
    const cur = this._center(o, sw), st = sw === "L" ? "R" : "L", hd = this._heading(o, st), side = sw === "R" ? 1 : -1, lat = [hd[1] * side, -hd[0] * side];
    const tc = [cur[0] + hd[0] * (req.forward || 0) + lat[0] * (req.outward || 0), cur[1] + hd[1] * (req.forward || 0) + lat[1] * (req.outward || 0)];
    const yaw = yawOf(o.states[this.foot[st]].rot) + rad(req.yawDeg || 0), f0 = this.feasibility(o, sw, tc, yaw, cur);
    const rep = { request: req, foot: sw, requested: tc, current: cur, reasons: f0.reasons, feasibleAtRequest: f0.ok };
    if (f0.ok) return { ...rep, target: tc, yaw, corrected: false, correction: 0, footprint: f0.footprint, clearance: f0.clearance };
    let lo = 0, hi = 1; for (let it = 0; it < 28; it++) { const m = (lo + hi) / 2, p = [cur[0] + (tc[0] - cur[0]) * m, cur[1] + (tc[1] - cur[1]) * m]; if (this.feasibility(o, sw, p, yaw, cur).ok) lo = m; else hi = m; }
    const pt = [cur[0] + (tc[0] - cur[0]) * lo, cur[1] + (tc[1] - cur[1]) * lo], mv = Math.sqrt(dot2(sub2(pt, cur), sub2(pt, cur)));
    if (!this.feasibility(o, sw, pt, yaw, cur).ok || mv < SUP.minMove) return { ...rep, rejected: true, target: null, yaw, corrected: true, correction: null, why: "no feasible placement toward the request" };
    const f1 = this.feasibility(o, sw, pt, yaw, cur);
    return { ...rep, target: pt, yaw, corrected: true, correction: Math.sqrt(dot2(sub2(pt, tc), sub2(pt, tc))), footprint: f1.footprint, clearance: f1.clearance };
  }
  // the reachability boundary for display: along 36 rays from the swing foot's current centre, the farthest feasible sole centre (≤ 1.2 m)
  reachBoundary(o, sw, yaw) { const cur = this._center(o, sw), out = [];
    for (let k = 0; k < 36; k++) { const a = k / 36 * 2 * Math.PI, d = [dsin(a), dcos(a)]; let lo = 0, hi = 1.2;
      if (!this.feasibility(o, sw, cur, yaw, null).ok) { out.push(cur); continue; }
      for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2, p = [cur[0] + d[0] * m, cur[1] + d[1] * m]; if (this.feasibility(o, sw, p, yaw, cur).ok) lo = m; else hi = m; }
      out.push([cur[0] + d[0] * lo, cur[1] + d[1] * lo]); }
    return out; }
  // ── per-step update (from the same observation the balance controller sees) → the plan the controller follows ──
  update(o) {
    const t = o.t, W = this.W, ctrl = this.ctrl; this.lastT = t;
    const mid = () => { const a = this._weightPoint(o, "L"), b = this._weightPoint(o, "R"); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const out = (plan) => { plan.phase = this.phase; this.lastPlan = plan; return plan; };
    if (this.cur && this.cur.done && !this.cur.keep) this.cur = null;
    const q0 = this.queue[0], due = q0 && (q0.at != null ? t >= q0.at : t >= (this.lastEnd ?? 0) + (q0.pause ?? 0.5));
    if (!this.cur && due) { this.cur = { ...this.queue.shift(), t0: t, stage: "START" }; this.event("request", `${this.cur.type} ${this.cur.foot || ""} ${this.cur.label || ""}`); }
    const R = this.cur, plan = { xiRef: this.restRef || null, swing: {}, request: R || null };
    if (!R || R.done && !R.keep) { this.phase = this._restPhase(o); this._roles(o, null); return out(plan); }
    const sw = R.foot, st = sw === "L" ? "R" : "L", F = o.feet;
    const lost = () => ["STEP_NEEDED", "UNRECOVERABLE", "FALLING", "GROUNDED"].includes(ctrl.cls.state);
    // ─ START: validate / project the request against the SENSED stance ─
    if (R.stage === "START") {
      if (R.type === "shift") { R.from = this.restRef || mid(); R.stage = "SHIFT"; }
      else {
        const pr = R.type === "lift" ? { ...this.project(o, sw, { forward: 0, outward: 0 }), target: this._center(o, sw), requested: this._center(o, sw), corrected: false, correction: 0, rejected: false } : this.project(o, sw, R);
        R.proj = pr; R.reach = this.reachBoundary(o, sw, pr.yaw); R.excl = this._sole(o, st); this.report(R, { projection: pr });
        if (pr.rejected) { this.finish(R, "REJECTED", `${pr.why}: ${pr.reasons.join("; ")}`); this.phase = this._restPhase(o); this._roles(o, null); return out(plan); }
        if (lost()) { this.finish(R, "REJECTED", "balance state " + ctrl.cls.state); this.phase = this._restPhase(o); return out(plan); }
        R.from = this.restRef || mid(); R.stage = "TRANSFER"; R.tS = t; R.ready = 0; R.pel0 = o.states[0].pos.slice();
        // FORWARD placements: balance toward the front of the stance foot (plenty of room: toes 27 cm ahead of the ankle, 150 N·m of
        // plantarflexion) so that at touchdown the heel side still offers CoP margin to push the COM onto the new foot (finding
        // 2026-09-29, tests D/H: the forward swing's reaction left ξ 4 cm behind and moving back at touchdown; the dorsiflexion-limited
        // heel could not bring it forward and he fell backward during acceptance)
        R.fwdBal = R.type === "place" && pr.target ? Math.max(0, Math.min(SUP.fwdBalMax, SUP.fwdBalFrac * dot2(sub2(pr.target, pr.current), this._heading(o, st)))) : 0;
      }
    }
    if (R.stage === "SHIFT") { const T = R.T || SUP.shiftT, to = this._lerp(this._weightPoint(o, "L"), this._weightPoint(o, "R"), R.w);
      const u = this._transfer(plan, o, R.id + ":shift", R.from, to, R.t0, T); if (u >= 1) this.restRef = plan.xiRef;
      if (t - R.t0 >= T + (R.hold || 0)) this.finish(R, "DONE", `weight ${Math.round(R.w * 100)} % toward R`);
      this.phase = "DOUBLE_SUPPORT"; this._roles(o, null); return out(plan); }
    if (["TRANSFER", "LIFTOFF", "SWING", "HOVER", "LOWER", "ALIGN", "DESCEND", "BLOCKED", "ACCEPT"].includes(R.stage) && lost() && !R.lostReported) {
      R.lostReported = true; if (!R.done) this.finish(R, "FAILED", `balance lost during ${R.stage} (${ctrl.cls.state}) — C2 does not step to recover`, true); R.stage = "LOST"; }
    if (R.stage === "LOST") { plan.xiRef = null; this.phase = "BALANCE LOST"; this._roles(o, R); return out(plan); }
    // ─ TRANSFER: ξ_ref onto the stance foot; lift only after the swing foot has PHYSICALLY unloaded and the stance can carry the body ─
    if (R.stage === "TRANSFER") { const uT = this._transfer(plan, o, R.id + ":transfer", R.from, this._weightPoint(o, st, R.fwdBal), R.tS, SUP.shiftT); plan.lean = { side: st, rad: this.leanRad * minjerk(uT) }; plan.unload = sw;
      // V1.1 controller: the PLANNED UNLOADING — an upper bound on the unloading foot's commanded share of the body weight, from its measured
      // share when the transfer begins to 0 when it ends (min-jerk). The balance controller never commands less than the physical minimum
      // that realises its CoP demand (pc_balance split2u), so the bound only bites once the COM/ξ state lets the stance foot carry it all.
      if (R.share0 == null) R.share0 = Math.max(0, Math.min(1, F[sw].load / W));
      if (ctrl.opts.unloadPlan) plan.unloading = { foot: sw, maxShare: R.share0 * (1 - minjerk(uT)) };
      const stSole = this._sole(o, st), mStance = polyDist(stSole, o.xi), vc = Math.sqrt(o.vcom[0] ** 2 + o.vcom[2] ** 2), tq = ctrl.opts.unloadPlan ? this._ankleUse(o, st, o.xi) : null;
      const ok = F[sw].load < SUP.liftLoadFrac * W && mStance >= SUP.liftMargin && vc <= SUP.liftVmax && F[st].loaded && !F[st].slipping && !F[sw].slipping && (!tq || tq.use <= SUP.liftTorqueUse);
      R.ready = ok ? R.ready + 1 : 0; R.readyState = { swingLoad: F[sw].load, stanceMargin: mStance, vcom: vc, ankleUse: tq };
      if (R.ready >= SUP.readySteps) { R.liftoff = { t, swingLoadN: F[sw].load, swingLoadFrac: F[sw].load / W, stanceMarginXi: mStance, comMarginStance: polyDist(stSole, [o.com[0], o.com[2]]), vcom: vc, transferS: t - R.tS, stanceAnkleUse: tq };
        R.stage = "LIFTOFF"; R.tL = t; R.soleY0 = this._soleLow(o, sw); R.p0 = o.states[this.foot[sw]].pos.slice(); R.q0 = o.states[this.foot[sw]].rot.slice(); this._planSwing(R, o); this.event("liftoff commanded", sw); }
      else if (t - R.tS > SUP.shiftT + SUP.readyTimeout) { this.finish(R, "REJECTED", `weight transfer not achieved: swing load ${F[sw].load.toFixed(0)} N, ξ margin on the stance foot ${(mStance * 100).toFixed(1)} cm, |v| ${vc.toFixed(2)} m/s${tq ? `, stance ankle ${(tq.use * 100).toFixed(0)} % of its torque (${tq.axis})` : ""}`); plan.xiRef = R.from; }
      this.phase = this._phaseOf(R); this._roles(o, R); return out(plan); }
    // ─ single support: the swing foot follows its trajectory under finite motors; touchdown / blockage decided by SENSING ─
    if (["LIFTOFF", "SWING", "HOVER", "LOWER", "ALIGN", "DESCEND"].includes(R.stage)) {
      plan.xiRef = this._weightPoint(o, st, R.fwdBal); plan.lean = { side: st, rad: this.leanRad }; const tgt = this._swingAt(R, t); plan.swing[sw] = tgt; R.lastTgt = tgt;
      // LIFTOFF = physically off the ground: no touching contact point and no load (< 25 N) for 3 steps (a speculative manifold within
      // Jolt's 2 cm contact distance is not contact)
      if (R.stage === "LIFTOFF") { if (!F[sw].touching && F[sw].load < 25) { R.airCnt = (R.airCnt || 0) + 1; if (R.airCnt >= 3) { R.stage = R.type === "lift" ? "HOVER" : "SWING"; R.tAir = t; R.liftoff.physicalT = t; R.armed = false; this.event("liftoff", sw); } } else R.airCnt = 0;
        if (R.stage === "LIFTOFF" && t - R.tL > SUP.liftTimeout) { this.finish(R, "FAILED", `foot did not leave the ground within ${SUP.liftTimeout} s (load ${F[sw].load.toFixed(0)} N, ${F[sw].points.length} contact points)`, true);
          R.stage = "ABORT"; R.tA = t; R.abFrom = plan.xiRef; delete plan.swing[sw]; } }
      // touchdown detection ARMS once the foot has measurably left the ground: not touching and its lowest sole point ≥ 5 mm above where it
      // was at liftoff (without arming, the first contact after a slow liftoff read as a touchdown 4 ms later)
      else if (R.stage !== "HOVER" && !R.armed && !F[sw].touching && this._soleLow(o, sw) - R.soleY0 >= SUP.armRise) { R.armed = true; R.armedT = t; }
      else if (R.stage !== "HOVER" && R.armed && F[sw].touching) {
        // TOUCHDOWN: the sensed contact is truth — wherever and whenever it happens. Swing control ends; the stance is rebuilt from here.
        const stt = o.states[this.foot[sw]]; R.td = { t, pos: stt.pos.slice(), rot: stt.rot.slice(), center: this._center(o, sw), v: stt.v.slice(), planned: R.proj.target, plannedAnkle: R.pT.slice(), uAt: R.u, early: R.u < 0.95 };
        R.stage = "ACCEPT"; R.tT = t; R.accFrom = plan.xiRef; delete plan.swing[sw]; this.event("touchdown", sw); }
      else {
        // BLOCKED = STALLED: the foot is ≥ blockLag behind its trajectory AND not making progress toward it (< blockV along the lag direction)
        // for blockSteps — a slow free swing is still moving toward its target; an obstructed one is not
        const fp = o.states[this.foot[sw]].pos, fv = o.states[this.foot[sw]].v, lv = V.sub(tgt.pos, fp), lag = V.dist(fp, tgt.pos), prog = lag > 1e-6 ? V.dot(fv, lv) / lag : 0;
        R.maxLag = Math.max(R.maxLag || 0, lag); R.lagCnt = lag > SUP.blockLag && prog < SUP.blockV ? (R.lagCnt || 0) + 1 : 0;
        if (R.lagCnt >= SUP.blockSteps) { R.blocked = { t, lag, footPos: o.states[this.foot[sw]].pos.slice() }; R.hold = { pos: o.states[this.foot[sw]].pos.slice(), rot: o.states[this.foot[sw]].rot.slice() }; R.stage = "BLOCKED";
          this.finish(R, "FAILED_BLOCKED", `swing foot ${(lag * 100).toFixed(0)} cm behind its trajectory for ${(SUP.blockSteps / 240 * 1000).toFixed(0)} ms — obstructed, not driven through; holding it where it is`, true); }
        else if (R.stage === "HOVER" && t - R.tAir >= (R.holdS || 1.0) + R.T1) { R.stage = "LOWER"; R.p0 = o.states[this.foot[sw]].pos.slice(); R.q0 = o.states[this.foot[sw]].rot.slice(); this._planSwing(R, o, true); }
        // ALIGN: the foot waits just above its landing point until the stance balance has re-converged (the swing's reaction leaves ξ off
        // its reference — landing while the body is still drifting made forward placements fall in acceptance, finding 2026-09-29)
        else if ((R.stage === "SWING" || R.stage === "LOWER") && R.u >= 1) { R.stage = "ALIGN"; R.tAl = t; R.alCnt = 0; }
        else if (R.stage === "ALIGN") { const e = Math.hypot(o.xi[0] - plan.xiRef[0], o.xi[1] - plan.xiRef[1]), vc = Math.hypot(o.vcom[0], o.vcom[2]);
          R.alCnt = e < SUP.alignTol && vc < SUP.alignV ? R.alCnt + 1 : 0; if (R.alCnt >= SUP.alignSteps || t - R.tAl > SUP.alignMax) { R.align = { s: t - R.tAl, xiErr: e, vcom: vc, settled: R.alCnt >= SUP.alignSteps }; R.stage = "DESCEND"; R.tD = t; } }
        else if (R.stage === "DESCEND" && !R.armed) { this.finish(R, "FAILED", "the swing foot never cleared the ground (it was dragged, not stepped)", true); R.stage = "ABORT"; R.tA = t; R.abFrom = plan.xiRef; delete plan.swing[sw]; }
        else if (R.stage === "DESCEND" && t - R.tD > SUP.noContactTimeout) this.finish(R, "FAILED", `no ground contact ${SUP.noContactTimeout} s after the planned touchdown`, true); }
      this.phase = this._phaseOf(R); this._roles(o, R); return out(plan); }
    // ─ ABORT (liftoff failed — the foot never left the ground): swing control released, weight back to the middle of the ACTUAL feet ─
    if (R.stage === "ABORT") { if (!R.abTo) R.abTo = mid(); const u = this._transfer(plan, o, R.id + ":abort", R.abFrom || this._weightPoint(o, st), R.abTo, R.tA, SUP.acceptT);
      if (u >= 1) { this.restRef = R.abTo; R.keep = false; } this.phase = this._restPhase(o); this._roles(o, null); return out(plan); }
    if (R.stage === "BLOCKED") { plan.xiRef = this._weightPoint(o, st, R.fwdBal); plan.lean = { side: st, rad: this.leanRad }; plan.swing[sw] = { pos: R.hold.pos, rot: R.hold.rot, vel: [0, 0, 0], u: 1 }; this.phase = this._phaseOf(R); this._roles(o, R); return out(plan); }
    // ─ ACCEPT: ξ_ref back to the new double-support reference; accepted once the landed foot carries a stable share of the weight ─
    // (the double-support reference is computed ONCE, from where the foot actually landed; if the landed foot loses contact while it is
    // being loaded it is reached back down onto its TOUCHDOWN pose — never onto its pre-lift anchor and never onto the planned marker)
    if (R.stage === "ACCEPT") { if (!R.accTo) { const wp = this._weightPoint(o, st), hd = this._heading(o, sw), a = [R.td.pos[0] + hd[0] * ctrl.comFwd, R.td.pos[2] + hd[1] * ctrl.comFwd]; R.accTo = [(wp[0] + a[0]) / 2, (wp[1] + a[1]) / 2]; }
      // LOAD first (ξ held over the stance foot, the landed foot's commanded share ramped up) until the SENSOR says the landed foot is
      // loaded; only then SHIFT the weight toward the middle (finding 2026-09-29, test D: moving ξ toward a foot that was touching but not
      // yet loaded put ξ outside the sensed support — STEP_NEEDED → FALLING)
      // the weight transfer onto the landed foot starts AT touchdown: a foot placed beside the body cannot be loaded before the COM moves
      // toward it (commanding load onto it first pushes the COM away and lifts it — tried, finding 2026-09-29). It stays planted with a
      // small commanded preload, counts as support while on the turf (sensor supportTouching), and its ankle is compliant (heel rocker).
      plan.anchor = { foot: sw, pos: R.td.pos, rot: R.td.rot }; plan.settle = { foot: sw };
      const from = R.accFrom || this._weightPoint(o, st), to = R.accTo; if (!R.accT) R.accT = Math.max(SUP.acceptT, SUP.acceptTperM * Math.hypot(to[0] - from[0], to[1] - from[1]));
      const u = this._transfer(plan, o, R.id + ":accept", from, to, R.tT, R.accT); plan.lean = { side: st, rad: this.leanRad * (1 - minjerk(u)) };
      // V1.1 controller: the landed foot keeps the preload floor while ξ travels to the double-support reference (a foot cannot be loaded
      // before the COM moves toward it — C2 finding); once ξ_ref has ARRIVED, a final redistribution raises the floor to the even split the
      // reference (mid-point of the two weight points) implies, over 0.5 s, never above what physics can realise (split2u). The least-effort
      // split alone left a forward-inward diagonal placement balanced and flat on 34 % BW — just under the unchanged 35 % acceptance
      // criterion (finding 2026-09-30, boundary sweep 330°; ramping the floor WITH the transfer pushed the CoPs to the sole edges instead).
      // (during the transfer itself the approved preload floor + least-effort split is kept unchanged)
      if (ctrl.opts.unloadPlan && u >= 1) { if (R.tU1 == null) R.tU1 = t; plan.loading = { foot: sw, minShare: SUP.acceptPreload + (0.5 - SUP.acceptPreload) * minjerk(Math.min(1, (t - R.tU1) / 0.5)) }; }
      else plan.preload = { foot: sw, share: SUP.acceptPreload };
      if (!R.loadedAt && F[sw].loaded && F[sw].touching) { R.loadedAt = t; this.event("landed foot loaded", `${sw} ${F[sw].load.toFixed(0)} N`); }
      R.loadHist = R.loadHist || []; R.loadHist.push(F[sw].load); if (R.loadHist.length > SUP.acceptSteps) R.loadHist.shift();
      const band = R.loadHist.length >= SUP.acceptSteps ? Math.max(...R.loadHist) - Math.min(...R.loadHist) : 1e9;
      const settled = F[sw].state === "FLAT" || (F[sw].heel && F[sw].toe);   // the sole is down (heel AND toe in contact), not rocking on an edge
      if (u >= 1 && F[sw].loaded && !F[sw].slipping && settled && F[sw].load >= SUP.acceptLoadFrac * W && band <= SUP.acceptBand * W) {
        const stt = o.states[this.foot[sw]]; R.accepted = { t, dtFromTouchdown: t - R.tT, load: F[sw].load, center: this._center(o, sw), pos: stt.pos.slice(), rot: stt.rot.slice() };
        this.restRef = to; plan.xiRef = to; plan.xiDot = null; plan.vRef = null; this.finish(R, "DONE", "placed, loaded and accepted"); }
      else if (t - R.tT > R.accT + 2.0) this.finish(R, "FAILED", `load not accepted: ${F[sw].load.toFixed(0)} N (${F[sw].state}${settled ? "" : ", sole not settled"})`);
      this.phase = R.done ? "DOUBLE_SUPPORT" : this._phaseOf(R); this._roles(o, R.done ? null : R); return out(plan); }
    this.phase = this._restPhase(o); this._roles(o, null); return out(plan);
  }
  // the share of the stance ankle's FINITE torque needed to hold a CoP at p (x, z) with the whole body weight on that foot: pitch about the
  // ankle (plantarflexion for a CoP ahead of the ankle, dorsiflexion behind) and roll (inversion/eversion), each against its directional cap
  _ankleUse(o, s, p) { const a = o.states[this.foot[s]].pos, hd = this._heading(o, s), rt = [hd[1], -hd[0]], d = [p[0] - a[0], p[1] - a[2]], W = this.W, L = this.ctrl.limits.ankle, m = this.ctrl.mult;
    const fwd = dot2(d, hd), lat = dot2(d, rt), pitch = fwd >= 0 ? W * fwd / (L.Y[1] * m) : W * -fwd / (-L.Y[0] * m), roll = W * Math.abs(lat) / (L.Z[1] * m);
    return { use: Math.max(pitch, roll), axis: pitch >= roll ? (fwd >= 0 ? "plantarflexion" : "dorsiflexion") : "inversion/eversion", pitch, roll }; }
  _lerp(a, b, s) { return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]; }
  // a planned weight transfer is planned in CAPTURE-POINT space: ξ_d moves monotonically (min-jerk) from → to over T. Its LIPM feed-forward
  // CoP, ξ_d − ξ̇_d/ω0, then always lies on the unloading side of ξ_d (never beyond the target, never past the stance foot's outer edge —
  // a min-jerk COM path would need its braking CoP ≈ 12 cm outside the stance sole for a 0.9 s shift, finding 2026-09-29). The planned COM
  // follows its own LIPM dynamics ċ_d = ω0(ξ_d − c_d), integrated here; v_d = ċ_d is the stance legs' velocity feed-forward.
  _transfer(plan, o, key, from, to, t0, T) { const u = Math.max(0, Math.min(1, (o.t - t0) / T)), s = minjerk(u), w0 = o.omega0 || Math.sqrt(9.81 / Math.max(0.5, o.com[1]));
    if (!this.tr || this.tr.key !== key) this.tr = { key, c: [o.com[0], o.com[2]], tPrev: o.t };
    const sd = u < 1 ? 30 * u * u * (1 - u) * (1 - u) / T : 0, d = sub2(to, from), xi = this._lerp(from, to, s), tr = this.tr, dt = o.t - tr.tPrev;
    tr.c = [tr.c[0] + w0 * (xi[0] - tr.c[0]) * dt, tr.c[1] + w0 * (xi[1] - tr.c[1]) * dt]; tr.tPrev = o.t;
    plan.xiRef = xi; plan.xiDot = [d[0] * sd, d[1] * sd]; plan.vRef = [w0 * (xi[0] - tr.c[0]), w0 * (xi[1] - tr.c[1])]; plan.comRef = tr.c.slice(); plan.comGoal = to.slice(); return u; }
  // swing trajectory in world space for the FOOT ORIGIN (ankle) + foot rotation. Horizontal min-jerk, a clearance bell, toe-up mid-swing,
  // ending 5 mm below flat so the foot presses into contact; then a slow descent until the ground is sensed.
  _planSwing(R, o, lowering) {
    const sw = R.foot, p0 = R.p0, yaw = R.proj.yaw;
    // lift-and-hold: the foot rises liftH, carried with the pelvis's measured shift since the transfer began (so it hangs under its own hip —
    // held over its old footprint the leg hung abducted and added ≈ 11 N·m to the stance hip), and moved FORWARD by the amount that lets the
    // shin stay within liftShinDeg of vertical: this body's ankle has 20° of dorsiflexion and a 36 cm boot, so a knee-bend lift (shin tilted
    // back ≈ 34°) left the boot pitched toe-down on its range-of-motion stop with the toe still on the turf. Thigh flexion φ from
    // L1(1 − cos φ) + L2(1 − cos ψ) = liftH, forward = L1·sin φ − L2·sin ψ.
    let tc = R.proj.target; if (R.type === "lift" && !lowering) { const ps = [o.states[0].pos[0] - R.pel0[0], o.states[0].pos[2] - R.pel0[2]], Lg = this.ctrl.legs[sw], psi = rad(SUP.liftShinDeg);
      const cphi = 1 - (SUP.liftH - Lg.L2 * (1 - dcos(psi))) / Lg.L1, fwd = Lg.L1 * Math.sqrt(Math.max(0, 1 - cphi * cphi)) - Lg.L2 * dsin(psi), hd = this._heading(o, sw);
      R.liftFwd = fwd; R.T1 = 0.45; R.pT = [p0[0] + ps[0] + hd[0] * fwd, this.yFlat + SUP.touchDepth + SUP.liftH, p0[2] + ps[1] + hd[1] * fwd]; R.qT = R.q0; R.T = R.T1; R.clear = 0; }
    else { const a = this._ankleFromCenter(tc, yaw); R.pT = [a[0], this.yFlat + SUP.approachH, a[1]]; R.qT = Q.axis([0, 1, 0], yaw);
      const dist = Math.sqrt((R.pT[0] - p0[0]) ** 2 + (R.pT[2] - p0[2]) ** 2); R.T = Math.max(SUP.swingTmin, Math.min(SUP.swingTmax, SUP.swingTmin + SUP.swingTperM * dist)); R.clear = lowering ? 0.02 : SUP.clearance;
      // KNEE-FORWARD swing: at mid-swing the ankle must be far enough in front of the hip that the shin is within liftShinDeg of vertical —
      // with 20° of dorsiflexion and a 36 cm boot, a knee-bend swing (shin tilted back 23–28°) pitched the boot toe-down onto its stop and
      // the toe skimmed 0–1.3 cm above the turf (finding 2026-09-29, test C). Forward bias = what the straight path lacks at mid-swing.
      R.fwdBias = 0; R.fwdDir = this._heading(o, sw === "L" ? "R" : "L"); if (!lowering) { const Lg = this.ctrl.legs[sw], hip = o.states[Lg.thigh].pos, psi = rad(SUP.swingShinDeg);
        const mid = [(p0[0] + R.pT[0]) / 2, Math.max(p0[1], R.pT[1]) + R.clear, (p0[2] + R.pT[2]) / 2], v = hip[1] - 0.02 - mid[1], cphi = Math.max(-1, Math.min(1, (v - Lg.L2 * dcos(psi)) / Lg.L1));
        const need = Lg.L1 * Math.sqrt(Math.max(0, 1 - cphi * cphi)) - Lg.L2 * dsin(psi), have = (mid[0] - hip[0]) * R.fwdDir[0] + (mid[2] - hip[2]) * R.fwdDir[1];
        // (not for a BACKWARD placement: out-forward-then-back snapped the foot back at ≈ 1 m/s onto its toe; a backward swing relies on the
        // toe-drop-aware clearance below instead)
        const back = (R.pT[0] - p0[0]) * R.fwdDir[0] + (R.pT[2] - p0[2]) * R.fwdDir[1] < -0.02; R.fwdBias = back ? 0 : Math.max(0, need - have); }
      // TOE clearance: where the shin tilts back beyond the ankle's usable dorsiflexion the boot pitches toe-down (range-of-motion clamp);
      // at the end of the progression (u = hEnd, ankle at approachH + clear·sin²(π·hEnd)) the toe must still clear by toeClear — raise the
      // clearance by the predicted toe drop (leg IK from the current hip; backward swings landed early on the toe, finding 2026-09-29)
      if (!lowering) { const Lg = this.ctrl.legs[sw], hip = o.states[Lg.thigh].pos, box = this.box, toeLen = box.pos[2] + box.he[2], jA = this.spec.joints[Lg.ankle], dMax = -jA.limits.swingY[0] - rad(5);
        for (let it = 0; it < 3; it++) { const sb2 = dsin(Math.PI * SUP.hEnd) ** 2, y = R.pT[1] + R.clear * sb2, ik = this.ctrl._legIK(Lg, hip, [R.pT[0], y, R.pT[2]], [R.fwdDir[0], 0, R.fwdDir[1]]), sd = Q.rot(ik.Rs, Lg.b0);
          const tilt = Math.asin(Math.max(-1, Math.min(1, -(sd[0] * R.fwdDir[0] + sd[2] * R.fwdDir[1])))), pitch = Math.max(0, tilt - dMax), toeY = y - this.yFlat - toeLen * Math.sin(pitch);
          if (toeY >= SUP.toeClear) break; R.clear += SUP.toeClear - toeY; } R.clear = Math.min(R.clear, SUP.clearanceMax); }
      const path = dist + 2 * R.fwdBias; R.T = Math.max(SUP.swingTmin, Math.min(SUP.swingTmax, SUP.swingTmin + SUP.swingTperM * path)); }
    R.tSw = o.t; R.u = 0; }
  // the swing: the foot RISES first (u 0 → hStart), PROGRESSES horizontally (min-jerk over hStart → hEnd) under a sin² clearance bell, and
  // APPROACHES the ground near-vertically in the last quarter with zero velocity at u = 1 (then DESCEND presses slowly until contact is
  // sensed). A swing that is still travelling horizontally when it lands overshot by ≈ 8 cm (the leg's momentum, no inertial feed-forward).
  _swingAt(R, t) {
    const u = Math.min(1, (t - R.tSw) / R.T); R.u = u; const p0 = R.p0, pT = R.pT, T = R.T, h0 = R.h0 ?? SUP.hStart, h1 = SUP.hEnd;   // R.h0: a reactive (C3) swing may start its progression with the lift
    const uh = Math.max(0, Math.min(1, (u - h0) / (h1 - h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((h1 - h0) * T) : 0;
    const sv = minjerk(u), dsv = u < 1 ? 30 * u * u * (1 - u) * (1 - u) / T : 0, sn = dsin(Math.PI * u), cs = dcos(Math.PI * u), bell = sn * sn, dbell = 2 * sn * cs * Math.PI / T;
    let y = p0[1] + (pT[1] - p0[1]) * sv + R.clear * bell; if (R.stage === "DESCEND") y = pT[1] - Math.min(SUP.approachH + SUP.descendMax, SUP.descendV * (t - R.tD));
    // the forward bias rises and returns WITHIN the progression window, so the approach (u > hEnd) is vertical
    const fb = R.fwdBias || 0, fd = R.fwdDir || [0, 1], ub = Math.min(1, u / h1), sb = dsin(Math.PI * ub), cb = dcos(Math.PI * ub), fbell = sb * sb, dfbell = u < h1 ? 2 * sb * cb * Math.PI / (h1 * T) : 0;
    const pos = [p0[0] + (pT[0] - p0[0]) * sh + fd[0] * fb * fbell, y, p0[2] + (pT[2] - p0[2]) * sh + fd[1] * fb * fbell];
    let q = nlerp(R.q0, R.qT, sh); if (R.clear > 0.03) { const fwd = Q.rot(q, [1, 0, 0]); q = Q.norm(Q.mul(Q.axis(fwd, -rad(SUP.toeUpDeg) * sb), q)); }   // toe up (about the foot's lateral axis) only during progression: the boot arrives level
    const vel = u < 1 ? [(pT[0] - p0[0]) * dsh + fd[0] * fb * dfbell, (pT[1] - p0[1]) * dsv + R.clear * dbell, (pT[2] - p0[2]) * dsh + fd[1] * fb * dfbell] : [0, R.stage === "DESCEND" ? -SUP.descendV : 0, 0];
    // V1.1 RECALIBRATION R2 (opt-in, off for V1): the pelvis-lowering reach target of a swing that ends on the ground is the TOUCHDOWN depth the
    // feasibility check assumed (flat + touchDepth), not the approach point 1.5 cm above it — with V1.1's anatomical hips the single-support
    // reach back to the old footprint needs ≈ 100 % extension, and a pelvis lowered only for the approach point left the straight leg
    // hanging ≈ 9 mm above the turf (finding 2026-09-30); V1's wider hips left ≈ 2 % slack that hid the inconsistency
    const reach = this.ctrl.opts.reachToGround && R.stage !== "HOVER" && R.stage !== "LIFTOFF" && pT[1] < this.yFlat + SUP.approachH + 1e-6 ? [pT[0], this.yFlat + SUP.touchDepth, pT[2]] : pT;
    return { pos, rot: q, vel, u, reach }; }
  _phaseOf(R) { const sw = R.foot, st = sw === "L" ? "R" : "L";
    return { TRANSFER: `TRANSFER → ${st}`, LIFTOFF: `LIFTOFF ${sw}`, SWING: `SINGLE SUPPORT ${st} · ${sw} SWING`, ALIGN: `SINGLE SUPPORT ${st} · ${sw} ALIGNING`, HOVER: `SINGLE SUPPORT ${st} · ${sw} HELD UP`, LOWER: `SINGLE SUPPORT ${st} · ${sw} LOWERING`,
      DESCEND: `SINGLE SUPPORT ${st} · ${sw} SEEKING GROUND`, ACCEPT: `LOAD ACCEPTANCE ${sw}`, BLOCKED: `SINGLE SUPPORT ${st} · ${sw} BLOCKED`, DONE: "DOUBLE SUPPORT" }[R.stage] || R.stage; }
  _restPhase(o) { const a = o.feet.L.touching, b = o.feet.R.touching; return a && b ? "DOUBLE_SUPPORT" : a ? "SINGLE SUPPORT L" : b ? "SINGLE SUPPORT R" : "NO SUPPORT"; }
  _roles(o, R) { for (const s of ["L", "R"]) { const f = o.feet[s]; let r;
      if (R && R.foot === s && !R.done) r = { TRANSFER: "UNLOADING", LIFTOFF: "LIFTOFF", SWING: "SWING", ALIGN: "SWING", HOVER: "SWING", LOWER: "SWING", DESCEND: "SWING", ACCEPT: "ACCEPTING", BLOCKED: "SWING (BLOCKED)" }[R.stage] || "LOADED";
      else r = f.slipping ? "SLIPPING" : f.loaded ? "LOADED" : f.touching ? "UNLOADED" : "AIR";
      if (f.slipping) r += " · SLIPPING"; this.role[s] = r; } }
  event(kind, what) { this.log.push({ t: this.lastT ?? null, kind, what }); }
  report(R, x) { R.report = { ...(R.report || {}), ...x }; }
  finish(R, status, why, keep) { if (R.done) return; R.status = status; R.why = why; R.done = true; R.keep = !!keep; R.tEnd = this.lastT; this.lastEnd = this.lastT; this.reports.push(R); this.event(status, why); }
}
const nlerp = (a, b, s) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = d < 0 ? b.map(x => -x) : b; return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * s)); };

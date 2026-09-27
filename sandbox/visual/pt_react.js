// ═══ pt_react.js — TACKLED-PLAYER CONTACT, BALANCE & FALL V1 (SIMULATION) ══════════════════════════════════════════════════════════
// Active only in defending drills (Q.spec.defending). Decides, from the actual geometry and motion of a challenge, what happens to the
// player who is hit: nothing, a corrected step, a stumble of several steps, or a fall — with the fall's direction, timing, ground slide
// and recovery all following from the event. The presentation (anim3d/of_react.js) solves the skeleton around these facts.
//
// THE CHAIN (all deterministic, event-driven: a player costs nothing unless a challenge is in progress within reach of him)
//   1. BODY — the attacker's legs are rebuilt from the AUTHORITATIVE stride clock (p.gaitPhase, the gait's stance fraction, the boot plan's
//      longitudinal law ofBootAhead) with rig-correct sides: per leg a foot, shin and thigh capsule, plus pelvis and torso; which foot is
//      planted (weight-bearing) and which is swinging, the swing foot's height, every segment's velocity.
//   2. CONTACT — the tackler's primitives (a slide's extended leg and the sliding body on the pitch; a standing tackle's sweeping foot) are
//      swept against those segments within the tick (sub-steps). The first contact is recorded: segments, point, normal, penetration,
//      relative velocity (normal / tangential), support state, stride phase, ball-first / simultaneous / man-first / no-ball.
//   3. IMPULSE — an inelastic contact between the tackler (his mass) and the struck segment's EFFECTIVE mass (segment inertia for a swing
//      leg; the body through the stance column for a weight-bearing leg). The impulse is then routed: (a) into the struck leg — a planted
//      foot is displaced only by what exceeds its friction capacity (μ · weight on it · contact time); a swing foot's landing is pushed off
//      course or blocked; (b) into the centre of mass, by how much of it the segment transmits; (c) into spin about the vertical from its
//      lever arm; and the equal and opposite impulse slows the tackler.
//   4. BALANCE — the linear inverted pendulum / extrapolated centre of mass (Hof; the "capture point"): the error the event creates in the
//      capture point at the moment the next support can be established (support lost → the time until the other foot lands; landing
//      delayed or displaced; velocity changed), compared step by step with how far a step can correct it (anisotropic: forward reach is
//      long, a crossover step short). Corrected in one step → CORRECTION; in several → STUMBLE; the error outgrows the steps → FALL.
//   5. FALL — the direction is where the capture point escapes the support (momentum + impulse + support loss), the timing is the
//      pendulum's own topple from the actual offset and velocity, the root carries the momentum, lands, slides with ground friction and
//      stops; the tackler's body on the pitch is an obstacle the faller goes over, not through. Then a recovery whose family follows the
//      terminal orientation (face down / on a side / on the back).
//   Possession: a fall releases the ball (it runs on under its own physics); a stumble suspends the carry touches until he is balanced.
// Masses are the players' RECORDED weights (spec.massKg from the character identity), 75 kg when absent. Nothing here reads attributes
// except through the neutral hooks (factor 1 at the reference profile).
const PT_REACT = {
  g: 9.81, massRef: 75,
  // segment geometry (× leg length) and radii (m) — deliberately coarse; each exists because it changes a reaction
  hipH: 1.08, comH: 1.13, hipW: 0.10, lat: 0.198, ankleH: 0.08, footLen: 0.20, thighK: 0.51,
  rad: { foot: 0.05, shin: 0.06, thigh: 0.08, pelvis: 0.15, torso: 0.17 },
  liftWalk: 0.10, liftSprint: 0.34,                            // swing-foot peak height (m) from walk to sprint
  // mass fractions of one leg's segments (Dempster / Winter) and what a blow there transmits to the centre of mass
  mFrac: { foot: 0.0145, shin: 0.061, thigh: 0.161, pelvis: 1, torso: 1 }, xmit: { foot: 0.12, shin: 0.25, thigh: 0.55, pelvis: 1.0, torso: 1.0 },
  mu: 0.65, contactT: 0.05,                                    // stud-grass friction; contact duration (s) for the friction capacity of a planted foot
  Iz: 0.10,                                                    // m²: radius of gyration² about the vertical (spin)
  Ip: 0.16, tipMax: 7,                                         // m²: radius of gyration² about a horizontal axis (tip); cap on the tip rate (rad/s)
  step: { fwd: 0.42, back: 0.20, out: 0.30, cross: 0.12, tMin: 0.16, tMax: 0.32 },   // × leg: how far one step can move the support relative to plan, by direction
  sweepLost: 0.18, obstacleH: 0.30, dropCap: 0.14,                            // m: a planted foot displaced this far has lost its support; a body this low on the pitch is stepped over or tripped on
  neg: 0.03, maxSteps: 4,
  fallTheta: 1.25, groundMu: 0.9, restT: 0.35,                 // rad at which the body meets the pitch; sliding friction on the pitch; lie still after stopping
  recoverT: { FRONT: 1.15, SIDE: 1.05, BACK: 1.30 }, stumbleBrake: 0.72,
  ref: { balance: 60, strength: 60, agility: 60, reactions: 60 },
};
const PT_RX_PERF = { detect: 0, detectN: 0, resolve: 0, resolveN: 0, occ: 0, ticks: 0, pairs: 0 };   // cost accounting (timing only; never read by the simulation)
const ptRxNow = () => (typeof performance !== "undefined" ? performance.now() : 0);
const ptRxAttrs = (c) => Object.assign({}, PT_REACT.ref, c.attrs || {});
const ptRxK = (c, attr, k) => 1 + k * (Math.max(0, Math.min(1, ptRxAttrs(c)[attr] / 100)) - 0.6);   // attribute hook, exactly 1 at the reference
const ptRxMass = (c) => c.massKg || PT_REACT.massRef;
// ── 1. BODY: the attacker's segments at time offset dt (s) from now (stride clock + root advanced at constant velocity) ─────────────
function ptRxBody(c, dt) {
  const R = PT_REACT, p = c.p, leg = p.legLen || PT.LEG_REF, v = Math.hypot(p.vx, p.vy);
  const G = typeof ofLocoParams === "function" ? ofLocoParams(v) : { step: 1, stance: 0.45 }, step = G.step * leg, cad = step > 1e-6 ? v / step : 0;
  const phase = ((((p.gaitPhase != null ? p.gaitPhase : 0.08) + (v > PT.IDLE_V ? dt * cad / 2 : 0)) % 1) + 1) % 1;
  const dir = v > 0.3 ? Math.atan2(p.vy, p.vx) : p.facing, fx = Math.cos(dir), fy = Math.sin(dir), rx = -fy, ry = fx;   // rig-correct RIGHT = (−dirY, dirX)
  const x = p.x + p.vx * dt, y = p.y + p.vy * dt, lift = R.liftWalk + (R.liftSprint - R.liftWalk) * Math.max(0, Math.min(1, (v - 1.5) / 6.5));
  const hipH = R.hipH * leg, thighL = R.thighK * leg, shinL = leg - thighL, out = { x, y, dir, fx, fy, v, phase, stance: G.stance, cad, leg, legs: {} };
  for (const sd of ["R", "L"]) {
    const p0 = sd === "R" ? 0 : 0.5, up = (((phase - p0) % 1) + 1) % 1, planted = up < G.stance || v <= PT.IDLE_V, sg = sd === "R" ? 1 : -1;
    const ah = (typeof ofBootAhead === "function" ? ofBootAhead(phase, p0, G.stance) : 0) * leg * (v <= PT.IDLE_V ? 0.2 : 1);
    const sw = planted ? 0 : (up - G.stance) / (1 - G.stance), aH = R.ankleH + (planted ? 0 : lift * Math.sin(Math.PI * sw));
    const A = [x + fx * ah + rx * sg * R.lat * leg, y + fy * ah + ry * sg * R.lat * leg, aH];
    const H = [x + rx * sg * R.hipW * leg, y + ry * sg * R.hipW * leg, hipH];
    // knee: two-link in the plane of hip→ankle and the travel direction, bending forward
    const d = [A[0] - H[0], A[1] - H[1], A[2] - H[2]], L = Math.max(1e-6, Math.hypot(d[0], d[1], d[2])), Lc = Math.min(L, thighL + shinL - 1e-4);
    const a = (thighL * thighL - shinL * shinL + Lc * Lc) / (2 * Lc), hK = Math.sqrt(Math.max(0, thighL * thighL - a * a)), u = [d[0] / L, d[1] / L, d[2] / L];
    let w = [fx - u[0] * (fx * u[0] + fy * u[1]), fy - u[1] * (fx * u[0] + fy * u[1]), -u[2] * (fx * u[0] + fy * u[1])], wm = Math.hypot(w[0], w[1], w[2]); if (wm < 1e-6) { w = [0, 0, 1]; wm = 1; }
    const K = [H[0] + u[0] * a + w[0] / wm * hK, H[1] + u[1] * a + w[1] / wm * hK, H[2] + u[2] * a + w[2] / wm * hK];
    const T = [A[0] + fx * R.footLen, A[1] + fy * R.footLen, Math.max(0.03, aH - 0.04)];
    out.legs[sd] = { planted, up, sw, ankle: A, knee: K, hip: H, toe: T };
  }
  out.pelvis = [x, y, hipH]; out.com = [x, y, R.comH * leg]; out.neck = [x, y, hipH + 0.55 * leg];
  return out;
}
function ptRxSegments(B) {
  const R = PT_REACT.rad, s = [];
  for (const sd of ["R", "L"]) { const L = B.legs[sd]; s.push({ name: "foot_" + sd, seg: "foot", sd, a: L.ankle, b: L.toe, r: R.foot, planted: L.planted }, { name: "shin_" + sd, seg: "shin", sd, a: L.knee, b: L.ankle, r: R.shin, planted: L.planted }, { name: "thigh_" + sd, seg: "thigh", sd, a: L.hip, b: L.knee, r: R.thigh, planted: L.planted }); }
  s.push({ name: "pelvis", seg: "pelvis", a: B.pelvis, b: [B.pelvis[0], B.pelvis[1], B.pelvis[2] + 0.1], r: R.pelvis }, { name: "torso", seg: "torso", a: [B.pelvis[0], B.pelvis[1], B.pelvis[2] + 0.1], b: B.neck, r: R.torso });
  return s;
}
// closest points between two 3D segments (Ericson) → { d, s, t, P, Q }
function ptRxSegSeg3(p1, q1, p2, q2) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), cl = (x) => Math.max(0, Math.min(1, x));
  let s, t; if (a <= 1e-12 && e <= 1e-12) { s = t = 0; } else if (a <= 1e-12) { s = 0; t = cl(f / e); } else { const c = dot(d1, r); if (e <= 1e-12) { t = 0; s = cl(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } } }
  const P = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], Qp = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return { d: Math.hypot(P[0] - Qp[0], P[1] - Qp[1], P[2] - Qp[2]), s, t, P, Q: Qp };
}
// ── 2. the tackler's contact primitives at time offset dt within this tick (a slide's leg + sliding body; a standing tackle's foot) ────
function ptRxTacklerPrims(c, dt, standSweep) {
  const d = c.def, p = c.p, leg = p.legLen || PT.LEG_REF, out = [];
  if (d && d.kind === "SLIDE") {
    const S = PT_DEF.slide, fx = Math.cos(d.dir), fy = Math.sin(d.dir), sg = d.foot === "R" ? 1 : -1, lo = S.legLat * leg, lx = -fy * sg * lo, ly = fx * sg * lo;
    const x = p.x + p.vx * dt, y = p.y + p.vy * dt, ext = Math.max(0, Math.min(1, (d.launchT != null ? d.launchT : 0) / S.extT)), k1 = (S.legFrom + (S.reachAhead - S.legFrom) * ext) * leg;
    out.push({ prim: "LEG", a: [x + fx * S.legFrom * leg + lx, y + fy * S.legFrom * leg + ly, 0.12], b: [x + fx * k1 + lx, y + fy * k1 + ly, 0.12], r: 0.07, v: [p.vx, p.vy] });
    out.push({ prim: "BODY", a: [x - fx * 0.35, y - fy * 0.35, 0.18], b: [x + fx * S.legFrom * leg, y + fy * S.legFrom * leg, 0.16], r: 0.16, v: [p.vx, p.vy] });
  }
  if (standSweep) out.push({ prim: "FOOT", a: [standSweep.hip[0], standSweep.hip[1], 0.12], b: [standSweep.tip[0], standSweep.tip[1], 0.10], r: 0.06, v: standSweep.v });
  return out;
}
// ── the contact test for one tackler against one attacker over this tick (sub-steps); returns the first contact or null ─────────────
function ptRxDetect(t, ci, ai, standSweep) {
  const Q = t.squad, c = Q.ctx[ci], a = Q.ctx[ai], SUB = 4;
  if (Math.hypot(c.p.x - a.p.x, c.p.y - a.p.y) > 2.6) return null;
  for (let n = 1; n <= SUB; n++) {
    const dt = -PT_DT * (1 - n / SUB);                                                             // state at sub-step n (the tick's end is dt = 0)
    const B = ptRxBody(a, dt), segs = ptRxSegments(B), prims = ptRxTacklerPrims(c, dt, standSweep); B.dtSub = dt;
    let best = null;
    for (const pr of prims) for (const sg of segs) { const cc = ptRxSegSeg3(pr.a, pr.b, sg.a, sg.b); const pen = pr.r + sg.r - cc.d; if (pen > 0 && (!best || pen > best.pen)) best = { pr, sg, cc, pen }; }
    if (best) return { sub: n, B, ...best };
  }
  return null;
}
// ── 3 + 4. IMPULSE and BALANCE: turn a contact into the attacker's authoritative reaction ─────────────────────────────────────────────
function ptRxResolve(t, ci, ai, hit, ballOrder) {
  const R = PT_REACT, Q = t.squad, c = Q.ctx[ci], a = Q.ctx[ai], now = t.now, B = hit.B, leg = B.leg, g = R.g;
  const mA = ptRxMass(a), mT = ptRxMass(c), sg = hit.sg, pr = hit.pr, legSt = sg.sd ? B.legs[sg.sd] : null;
  // contact normal: horizontal, from the tackler's primitive to the struck segment (the tackler's travel direction if degenerate)
  let nx = hit.cc.Q[0] - hit.cc.P[0], ny = hit.cc.Q[1] - hit.cc.P[1], nm = Math.hypot(nx, ny);
  if (nm < 1e-4) { const vm = Math.hypot(pr.v[0], pr.v[1]) || 1; nx = pr.v[0] / vm; ny = pr.v[1] / vm; } else { nx /= nm; ny /= nm; }
  // segment velocity: root velocity + the swing foot's own motion (finite difference of the stride law)
  // segment velocity from the stride law itself (backward difference over 20 ms): a foot in mid-stance is still, a foot arriving at its
  // heel strike carries its swing velocity (a foot put down ON the sliding leg is a real contact), a swing foot moves at ~2× the body
  let svx = a.p.vx, svy = a.p.vy;
  if (sg.sd) { const B0 = ptRxBody(a, hit.B.dtSub - 0.02), L0 = B0.legs[sg.sd]; const P0 = sg.seg === "thigh" ? L0.knee : L0.ankle, P1 = sg.seg === "thigh" ? legSt.knee : legSt.ankle; svx = (P1[0] - P0[0]) / 0.02; svy = (P1[1] - P0[1]) / 0.02; }
  const rvx = pr.v[0] - svx, rvy = pr.v[1] - svy, vn = Math.max(0, rvx * nx + rvy * ny), vt = -rvx * ny + rvy * nx;
  // effective mass of what was struck: a swing leg's segment on its own; a weight-bearing leg couples to the body through the stance
  const mSeg = sg.sd ? (legSt.planted ? 0.5 * mA : R.mFrac[sg.seg] * mA) : mA, mRed = mT * mSeg / (mT + mSeg);
  const J = mRed * vn * ptRxK(a, "strength", -0.4);                                                 // N·s along n (inelastic), attribute hook neutral
  // (a) the struck leg: a planted foot moves only by what exceeds its friction capacity; a swing foot is pushed / blocked
  const bothPlanted = B.legs.R.planted && B.legs.L.planted, wShare = sg.sd && legSt.planted ? (bothPlanted ? 0.5 : 1) : 0;
  const Jfric = R.mu * wShare * mA * g * R.contactT * ptRxK(a, "balance", 0.5), footM = (R.mFrac.shin + R.mFrac.foot) * mA;
  let sweep = 0, blockedT = 0, landShift = [0, 0], supportLost = false;
  if (sg.sd && legSt.planted) { const excess = Math.max(0, J * (sg.seg === "thigh" ? 0.4 : 1) - Jfric); sweep = Math.min(0.8, excess / footM * 0.08); supportLost = sweep >= R.sweepLost; }
  else if (sg.sd) { const vFoot = J / (R.mFrac[sg.seg] * mA); const tRem = Math.max(0.02, (1 - legSt.sw) * (1 - B.stance) / Math.max(0.5, B.cad) * 2);   // the rest of this swing (s)
    landShift = [nx * Math.min(0.7, vFoot * tRem * 0.35), ny * Math.min(0.7, vFoot * tRem * 0.35)]; blockedT = pr.prim === "BODY" || pr.prim === "LEG" ? Math.min(0.25, 0.04 + vn * 0.02) : 0; }
  // (b) centre of mass: the share the struck segment transmits; (c) spin about the vertical from the lever arm (tangential component)
  const dvCom = J * R.xmit[sg.seg] / mA, dvx = nx * dvCom, dvy = ny * dvCom;
  const lx = hit.cc.Q[0] - B.com[0], ly = hit.cc.Q[1] - B.com[1], Lz = (lx * ny - ly * nx) * J * R.xmit[sg.seg], spin = Math.max(-6, Math.min(6, Lz / (mA * R.Iz)));
  // (d) TIP: an impulse below the centre of mass rotates the body about a horizontal axis — the struck part goes with the blow, the head and
  // trunk go the other way. Angular impulse = lever (COM height − contact height) × the impulse the body takes, over its pitch / roll inertia.
  const lever = Math.max(0, B.com[2] - hit.cc.Q[2]), Jbody = J * (sg.sd && legSt.planted ? 1 : R.xmit[sg.seg]);
  const tip = Math.min(R.tipMax, lever * Jbody / (mA * R.Ip));                                        // rad/s, head toward −n
  // the tackler: the equal and opposite impulse slows his slide (a leg is not a wall: he may go on underneath)
  const dvT = J / mT;
  // ── 4. BALANCE: the capture-point error at the moment the next support can be established ──────────────────────────────────
  const w0 = Math.sqrt(g / (R.comH * leg)), cad = Math.max(0.6, B.cad), Tstep = Math.max(R.step.tMin, Math.min(R.step.tMax, 1 / cad));   // a step's time: the gait's own, never slower than a reactive step
  const other = sg.sd ? (sg.sd === "R" ? "L" : "R") : null;
  // time until a new support can take weight: support kept → now; support lost → the other foot's remaining swing (+ a block)
  let tSup = 0; const nextSwing = (sd) => { const L = B.legs[sd]; return L.planted ? 0 : Math.max(0.03, (1 - L.sw) * (1 - B.stance) / cad * 2); };
  const plantedAny = B.legs.R.planted || B.legs.L.planted;
  if (!plantedAny) tSup = Math.min(nextSwing("R"), nextSwing("L")) + (sg.sd && !legSt.planted ? blockedT : 0);   // airborne: the next landing
  else if (supportLost) tSup = other && !B.legs[other].planted ? nextSwing(other) : 0.06;             // the swept foot's partner must land (or re-take the weight)
  else if (sg.sd && !legSt.planted) tSup = blockedT;                                                   // a clipped swing: its landing is late
  // capture-point error at the first new support (the LIP): the velocity change amplified over the unsupported time, the support
  // moved under him (a planted foot pushed without being lost), the landing displaced by the clip, the drift while a landing is late
  const grow = Math.exp(w0 * tSup), coshT = Math.cosh(w0 * tSup);
  let ex = dvx / w0 * grow - (supportLost ? 0 : nx * sweep) * coshT - landShift[0] + a.p.vx * blockedT * 0.5;
  let ey = dvy / w0 * grow - (supportLost ? 0 : ny * sweep) * coshT - landShift[1] + a.p.vy * blockedT * 0.5;
  // a swept foot whose partner is still on the pitch: the weight goes onto that foot, but the centre of mass is not over it — the offset
  // (and the velocity) must be caught by a step
  const partnerDown = supportLost && other && B.legs[other].planted;
  if (partnerDown) { const Pf = B.legs[other].ankle; ex += (B.com[0] - Pf[0]) * coshT; ey += (B.com[1] - Pf[1]) * coshT; }
  // a body on the pitch where the next foot would land: the step must clear it (the extra distance is part of the error)
  let obstacle = 0; const tk = Q.ctx[ci];
  if (tk.def && tk.def.kind === "SLIDE") { const Tl = Math.max(tSup, R.step.tMin), land = [B.x + a.p.vx * Tl, B.y + a.p.vy * Tl], P = tk.p, fx2 = Math.cos(tk.def.dir), fy2 = Math.sin(tk.def.dir);
    const dd = ptSegDist(land[0], land[1], P.x - fx2 * 0.4, P.y - fy2 * 0.4, P.x + fx2 * 1.0 * leg, P.y + fy2 * 1.0 * leg); if (dd < 0.32) obstacle = 0.32 - dd; }
  const eH = Math.hypot(ex, ey) + obstacle, ez = eH > 1e-6 && Math.hypot(ex, ey) > 1e-6 ? [ex / Math.hypot(ex, ey), ey / Math.hypot(ex, ey)] : [B.fx, B.fy];
  // how far one step can move the support in the error's direction (anisotropic in the body frame: forward reach long, crossover short)
  const f = [B.fx, B.fy], rgt = [-B.fy, B.fx], ef = ez[0] * f[0] + ez[1] * f[1], er = ez[0] * rgt[0] + ez[1] * rgt[1];
  const stepSide = other || (er > 0 ? "R" : "L"), outward = (stepSide === "R" ? er : -er) > 0;
  const rc = leg * ptRxK(a, "agility", 0.5) * Math.hypot(ef > 0 ? ef * R.step.fwd : ef * R.step.back, er * (outward ? R.step.out : R.step.cross));
  // stepping: what a step cannot absorb grows by e^{ω·T} until the next one (running already steps onto its capture point; this is the residual)
  const gStep = Math.exp(w0 * Tstep);
  let e = eH, steps = 0; const trace = [+e.toFixed(3)];
  while (e > 1e-3 && steps < R.maxSteps) { steps++; if (e <= rc) { e = 0; trace.push(0); break; } e = (e - rc) * gStep; trace.push(+e.toFixed(3)); }
  let fell = e > 1e-3;
  // vertical: a swept stance leg's remaining push-off is lost — the body drops until the next foot takes the weight; beyond what a landing
  // leg can absorb it collapses whatever the horizontal error
  const stRem = sg.sd && legSt.planted ? Math.max(0, 1 - legSt.up / Math.max(0.05, B.stance)) : 0;
  const drop = supportLost && !partnerDown ? 0.5 * g * tSup * tSup + g * Tstep * 0.5 * stRem * tSup : 0, dropCap = R.dropCap * leg * ptRxK(a, "balance", 0.5);
  const collapse = drop > dropCap; if (collapse) fell = true;
  const e0 = eH;
  const cls = e0 <= R.neg && !collapse ? "NEGLIGIBLE" : fell ? "FALL" : steps <= 1 ? "CORRECTION" : "STUMBLE";
  const rec = { tick: Q.tick, sub: hit.sub, tackler: ci, attacker: ai, type: tk.def ? tk.def.kind : "STAND", prim: pr.prim, seg: sg.name, segKind: sg.seg, segPlanted: sg.sd ? legSt.planted : null,
    point: hit.cc.Q.map(v => +v.toFixed(3)), normal: [+nx.toFixed(3), +ny.toFixed(3)], pen: +hit.pen.toFixed(3), vn: +vn.toFixed(3), vt: +vt.toFixed(3),
    phase: +B.phase.toFixed(3), support: { R: B.legs.R.planted, L: B.legs.L.planted }, stride: !plantedAny ? "AIRBORNE" : bothPlanted ? "DOUBLE" : B.legs.R.planted ? "SINGLE_R" : "SINGLE_L",
    vA: [+a.p.vx.toFixed(3), +a.p.vy.toFixed(3)], vT: [+pr.v[0].toFixed(3), +pr.v[1].toFixed(3)], massA: mA, massT: mT, J: +J.toFixed(2), Jfric: +Jfric.toFixed(2), sweep: +sweep.toFixed(3), supportLost,
    blockedT: +blockedT.toFixed(3), landShift: landShift.map(v => +v.toFixed(3)), dvCom: +dvCom.toFixed(3), spin: +spin.toFixed(3), dvTackler: +dvT.toFixed(3), tSup: +tSup.toFixed(3),
    e0: +e0.toFixed(3), rc: +rc.toFixed(3), steps, obstacle: +obstacle.toFixed(3), drop: +drop.toFixed(3), dropCap: +dropCap.toFixed(3), collapse, gStep: +gStep.toFixed(3), errTrace: trace, cls, order: ballOrder };
  rec.tip = +tip.toFixed(3);
  return { rec, dvx, dvy, dvT, nx, ny, ex, ey, spin, supportLost, steps, cls, Tstep, w0, tip };
}
// ── 5. the reaction STATE (authoritative root motion, possession, recovery) ────────────────────────────────────────────────────────
function ptRxStart(t, ai, R0) {
  const R = PT_REACT, Q = t.squad, a = Q.ctx[ai], p = a.p, now = t.now, b = t.b, leg = p.legLen || PT.LEG_REF, rec = R0.rec;
  if (R0.cls === "NEGLIGIBLE") { ptSquadEvent(t, Object.assign({ kind: "PLAYER_CONTACT" }, rec)); return; }
  const v0x = p.vx + R0.dvx, v0y = p.vy + R0.dvy;
  if (R0.cls === "CORRECTION" || R0.cls === "STUMBLE") {
    // corrective steps: each step brakes and redirects toward the error; input returns when the last step is down
    const dur = R0.steps * R0.Tstep + (R0.cls === "STUMBLE" ? 0.10 : 0);
    a.react = { kind: R0.cls, t0: now, until: now + dur, v0: [v0x, v0y], steps: R0.steps, Tstep: R0.Tstep, err: [R0.ex, R0.ey], spin: R0.spin, rec };
    if (R0.cls === "STUMBLE" && b.owner === ai) a.react.carryHold = true;
    ptSquadEvent(t, Object.assign({ kind: "PLAYER_CONTACT", react: R0.cls, until: +(now + dur).toFixed(3) }, rec));
    return;
  }
  // FALL: direction = where the capture point escapes the support (the momentum plus the event); timing = the pendulum's own topple
  const ex = R0.ex + v0x * 0.12, ey = R0.ey + v0y * 0.12, em = Math.hypot(ex, ey) || 1, az = Math.atan2(ey / em, ex / em);
  const h = R.comH * leg, w2 = R.g / h;
  let th = Math.max(0.05, Math.min(0.6, Math.atan2(Math.hypot(R0.ex, R0.ey), h))), thd = Math.max(0.3, Math.hypot(v0x, v0y) * 0.15 / h + Math.hypot(R0.ex, R0.ey) * 1.2), tt = 0;
  const thd0 = thd;
  while (th < R.fallTheta && tt < 1.2) { thd += w2 * Math.sin(th) * PT_DT; th += thd * PT_DT; tt += PT_DT; }   // inverted pendulum topple (numerical, fixed step)
  // a COLLAPSE (the stance leg is gone and the body drops faster than a landing leg can hold): the legs give way — the time to the pitch is
  // the drop itself (ballistic from centre-of-mass height to kneeling / hands height), not a slow topple about a support that is not there
  if (rec.collapse) tt = Math.min(tt, Math.sqrt(2 * 0.62 * h / R.g));
  const tStep = rec.supportLost ? 0 : Math.min(R0.steps, 2) * R0.Tstep * 0.6;                          // steps that were still taken before it failed
  const tGround = now + tStep + tt;
  // horizontal: the momentum carries on; at the pitch the body slides and stops (ground friction)
  const vh = Math.hypot(v0x, v0y), vx = v0x * 0.85 + Math.cos(az) * h * thd * 0.25, vy = v0y * 0.85 + Math.sin(az) * h * thd * 0.25;
  const vg = Math.hypot(vx, vy), tSlide = vg / (R.groundMu * R.g);
  // which way the BODY rotates: the topple (toward where the capture point escapes, at its own rate) against the tip the blow gave him
  // (head toward −n). A sprinter's topple dominates; a standing player's feet swept from behind tip him onto his back.
  const hx = Math.cos(az) * thd0 + (-R0.nx) * R0.tip * 0.6, hy = Math.sin(az) * thd0 + (-R0.ny) * R0.tip * 0.6, azHead = Math.atan2(hy, hx);
  const facingG = p.facing + R0.spin * (tGround - now) * 0.5, rel = Math.atan2(Math.sin(azHead - facingG), Math.cos(azHead - facingG));
  const family = Math.abs(rel) < 0.9 ? "FRONT" : Math.abs(rel) > 2.2 ? "BACK" : "SIDE";
  const tStop = tGround + tSlide, tRec = tStop + R.restT, tUp = tRec + R.recoverT[family];
  a.react = { kind: "FALL", t0: now, tFall: now + tStep, tGround, tStop, tRec, tUp, az, azHead, v: [vx, vy], vg, spin: R0.spin, family, rel, facing0: p.facing, rec, th0: +th.toFixed(3) };
  a.stunT = Math.max(a.stunT || 0, tUp);                                                              // no reception while down
  if (b.owner === ai) { b.owner = null; ptSquadEvent(t, { kind: "LOOSE", pid: ai, note: "fell (tackled)" }); }
  ptSquadEvent(t, Object.assign({ kind: "PLAYER_CONTACT", react: "FALL", az: +az.toFixed(3), azHead: +azHead.toFixed(3), family, tGround: +tGround.toFixed(3), tUp: +tUp.toFixed(3), slide: +(vg * tSlide / 2).toFixed(3) }, rec));
}
// movement override for a reacting player (called from ptDefMotion): null when there is nothing to do
function ptRxMotion(t, c) {
  const r = c.react; if (!r) return null; const now = t.now, R = PT_REACT;
  if (r.kind === "CORRECTION" || r.kind === "STUMBLE") {
    if (now >= r.until) { c.react = null; return null; }
    const k = Math.floor((now - r.t0) / r.Tstep), br = Math.pow(R.stumbleBrake, r.kind === "STUMBLE" ? k + 1 : 0.3);   // each corrective step brakes
    const em = Math.hypot(r.err[0], r.err[1]) || 1, pull = Math.min(1.5, em * 3);
    const vx = r.v0[0] * br + r.err[0] / em * pull * (1 - br), vy = r.v0[1] * br + r.err[1] / em * pull * (1 - br);
    return { lock: true, v: [vx, vy], facing: Math.atan2(vy, vx), react: true };
  }
  if (r.kind === "FALL") {
    if (now >= r.tUp) { c.react = null; return { vmax: 1.5 }; }
    if (now < r.tGround) return { lock: true, v: r.v, facing: r.facing0 + r.spin * (now - r.t0) * 0.5, react: true };
    if (now < r.tStop) { const k = Math.max(0, 1 - (now - r.tGround) / Math.max(1e-3, r.tStop - r.tGround)); return { lock: true, v: [r.v[0] * k, r.v[1] * k], facing: null, react: true }; }
    return { lock: true, v: [0, 0], facing: null, react: true };
  }
  return null;
}
// the per-tick hook (defending drills): every in-progress challenge against every opponent within reach; the first contact of a
// challenge with a given player resolves once (a tackle is one event per victim)
function ptRxStep(t) {
  const Q = t.squad; if (!Q.spec.defending || Q.over) return;
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], d = c.def; if (!d) continue;
    let sweep = null;
    if (d.kind === "SLIDE") { if (t.now < d.launchAt || d.vNow <= 0 && d.stopAt !== t.now) continue; d.launchT = t.now - d.launchAt; }
    else if (d.kind === "STAND") { if (!(d.resolved && d.result && d.result.contactTick === Q.tick)) continue;
      const leg = c.p.legLen || PT.LEG_REF, hip = d.result.hip, dh = d.result.dh, reach = d.result.reach, bp = d.result.point, ux = (bp[0] - hip[0]) / (dh || 1), uy = (bp[1] - hip[1]) / (dh || 1), L = Math.min(dh, reach + 0.11);
      sweep = { hip, tip: [hip[0] + ux * L, hip[1] + uy * L], v: [c.p.vx + ux * 3.0, c.p.vy + uy * 3.0] }; }
    else continue;
    d.hitSet = d.hitSet || {};
    for (let j = 0; j < Q.ctx.length; j++) {
      if (j === i || Q.ctx[j].team === c.team || d.hitSet[j] || (Q.ctx[j].react && Q.ctx[j].react.kind === "FALL")) continue;
      const tD = ptRxNow(), hit = ptRxDetect(t, i, j, sweep); PT_RX_PERF.detect += ptRxNow() - tD; PT_RX_PERF.detectN++; if (!hit) continue;
      d.hitSet[j] = Q.tick;
      // ball / man order (the ball contact of THIS challenge, sub-step resolution)
      const bt = d.kind === "SLIDE" ? (d.contact && d.contact.contactTick != null ? d.contact.contactTick * 4 + (d.contact.sub ? Math.round(d.contact.sub * 4) : 4) : null)
        : (d.result && d.result.ballFirst ? d.result.contactTick * 4 + 4 : null), mt = Q.tick * 4 + hit.sub;
      const order = bt == null ? "NO_BALL" : Math.abs(bt - mt) <= 4 ? "SIMULTANEOUS" : bt < mt ? "BALL_FIRST" : "MAN_FIRST";
      const tR = ptRxNow(), R0 = ptRxResolve(t, i, j, hit, order); PT_RX_PERF.resolve += ptRxNow() - tR; PT_RX_PERF.resolveN++;
      if (d.kind === "SLIDE") { d.vNow = Math.max(0, d.vNow - R0.dvT); if (d.vNow === 0) d.stopAt = t.now; if (d.oppContact == null) d.oppContact = Q.tick; }   // the tackler pays the impulse
      ptSquadEvent(t, { kind: "TACKLE_BODY_CONTACT", pid: i, type: d.kind, on: j, order, ballFirst: order === "BALL_FIRST", seg: R0.rec.seg, prim: R0.rec.prim, tick: Q.tick,
        behind: typeof ptDefBehind === "function" ? ptDefBehind(c, Q.ctx[j]) : null, relV: +Math.hypot(c.p.vx - Q.ctx[j].p.vx, c.p.vy - Q.ctx[j].p.vy).toFixed(3), attacker: [+Q.ctx[j].p.x.toFixed(3), +Q.ctx[j].p.y.toFixed(3)] });   // the foul facts (V1 contract)
      ptRxStart(t, j, R0);
      if (Q.ctx[j].react) Q.ctx[j].react.byTackler = i;
    }
  }
}
// OCCUPANCY for bodies on the pitch: a slider / a fallen player is a capsule along his body, not a disc; a standing player is kept out of it
function ptRxLying(c) {
  const d = c.def, r = c.react, p = c.p, leg = p.legLen || PT.LEG_REF;
  if (d && d.kind === "SLIDE" && d.launchAt != null && t_now_cache >= d.launchAt && d.vNow <= 0) {   /* a slide still moving is handled by the contact model, not pushed aside */ const fx = Math.cos(d.dir), fy = Math.sin(d.dir); return [p.x - fx * 0.35, p.y - fy * 0.35, p.x + fx * 0.9 * leg, p.y + fy * 0.9 * leg]; }
  if (r && r.kind === "FALL" && t_now_cache >= r.tGround) { const fx = Math.cos(r.az), fy = Math.sin(r.az); return [p.x - fx * 0.55, p.y - fy * 0.55, p.x + fx * 0.85, p.y + fy * 0.85]; }
  return null;
}
let t_now_cache = 0;
function ptRxOccupancy(t) {
  const Q = t.squad; if (!Q.spec.defending) return; t_now_cache = t.now; const tO = ptRxNow(); PT_RX_PERF.ticks++;
  const R2 = PT_DEF.bodyR + 0.14;
  for (const L of Q.ctx) { const seg = ptRxLying(L); if (!seg) continue;
    for (const o of Q.ctx) { if (o === L || ptRxLying(o)) continue;
      if (o.react && o.react.kind === "FALL" && t.now < o.react.tGround) continue;                  // a faller in the air goes OVER the body on the pitch
      if (L.react && L.react.byTackler != null && Q.ctx[L.react.byTackler] === o) continue;
      const p = o.p, dx = seg[2] - seg[0], dy = seg[3] - seg[1], LL = dx * dx + dy * dy, s = LL > 1e-9 ? Math.max(0, Math.min(1, ((p.x - seg[0]) * dx + (p.y - seg[1]) * dy) / LL)) : 0;
      const qx = seg[0] + dx * s, qy = seg[1] + dy * s, ex = p.x - qx, ey = p.y - qy, d = Math.hypot(ex, ey); if (d >= R2 || d < 1e-6) continue;
      const nx = ex / d, ny = ey / d, pen = R2 - d; p.x += nx * pen; p.y += ny * pen; const vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; } } }
  PT_RX_PERF.occ += ptRxNow() - tO;
}
if (typeof module !== "undefined" && module.exports) module.exports = { PT_REACT };

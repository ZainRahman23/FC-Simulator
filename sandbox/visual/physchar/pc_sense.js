// ═══ physchar/pc_sense.js — GATE C1 PHYSICAL SENSING: what the body is actually doing, measured from the solved Jolt state ════════════
// Nothing here is an animation expectation: a foot is "planted" only when the solver's contacts + the foot's measured load say so.
// Inputs per step: the 14 body states (after the step), the turf / self contacts Jolt reported during the step, the two ankle joints'
// translational constraint impulses, and any KNOWN external impulse (a test's push) so it can be separated from ground reaction.
//
// Estimators (verified in the SV tests, see GATE_C1_REPORT §5):
//   total ground force   F_g = M·(v_com(n) − v_com(n−1))/dt − M·g − J_ext/dt                  (whole-body linear momentum)
//   net CoP              from dL/dt = (p − c) × F_g about the COM, with p on the turf (y = 0)       (whole-body angular momentum)
//   per-foot force       F_f = m_f·(v_f(n) − v_f(n−1))/dt − m_f·g − λ_ankle/dt                    (Newton on the foot body; λ_ankle
//                        is the force the shin exerts on the foot, Jolt's accumulated point-constraint impulse)
// They are ESTIMATES built from Jolt's integrated velocities, not the contact solver's impulses (JoltPhysics.js does not expose those).
import { V, Q, dacos } from "./pc_math.js";

export const SENSE = {
  touchDepth: -0.0005,        // a manifold point counts as touching when its penetration depth > −0.5 mm (speculative contacts excluded)
  loadOn: 40, loadOff: 25,    // N: a touching foot is LOADED above loadOn, UNLOADED below loadOff (hysteresis)
  slipOn: 0.03, slipOff: 0.012, slipOnSteps: 2, slipOffSteps: 6,   // m/s: windowed sliding speed of the sole while loaded
  slipWindow: 10,             // steps (42 ms) for the sliding-displacement window
  touchdownSteps: 7,          // ≈ 30 ms in TOUCHDOWN after first contact
  copAlpha: 0.35,             // EMA on the displayed net CoP (the controller never uses the measured CoP)
};
const hull2 = (P) => { const p = P.map(q => [q[0], q[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); };
// signed distance of a ground point x = [x, z] to a convex polygon (counter-clockwise): > 0 inside; −1e3 if the polygon is degenerate
export function polyDist(poly, x) { if (!poly || poly.length < 3) return -1e3; let inside = true, dmin = 1e9, near = null;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], w = [x[0] - a[0], x[1] - a[1]];
    const t = Math.max(0, Math.min(1, (w[0] * e[0] + w[1] * e[1]) / (e[0] * e[0] + e[1] * e[1]))), dx = w[0] - t * e[0], dy = w[1] - t * e[1], d = Math.sqrt(dx * dx + dy * dy);
    if (d < dmin) { dmin = d; near = [a[0] + t * e[0], a[1] + t * e[1]]; } if (e[0] * w[1] - e[1] * w[0] < 0) inside = false; }
  return inside ? dmin : -dmin; }
export function polyNearest(poly, x) { let dmin = 1e9, near = null;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], w = [x[0] - a[0], x[1] - a[1]];
    const t = Math.max(0, Math.min(1, (w[0] * e[0] + w[1] * e[1]) / (e[0] * e[0] + e[1] * e[1]))), p = [a[0] + t * e[0], a[1] + t * e[1]], d = (x[0] - p[0]) ** 2 + (x[1] - p[1]) ** 2;
    if (d < dmin) { dmin = d; near = p; } } return near; }
// clamp a ground point into a convex polygon shrunk by `inset` (iterative projection; the polygon is small and convex)
export function polyClamp(poly, x, inset) { if (!poly || poly.length < 3) return x.slice(); if (polyDist(poly, x) >= inset) return x.slice();
  let c = [0, 0]; for (const p of poly) { c[0] += p[0] / poly.length; c[1] += p[1] / poly.length; }
  let lo = 0, hi = 1; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2, q = [c[0] + (x[0] - c[0]) * m, c[1] + (x[1] - c[1]) * m]; if (polyDist(poly, q) >= inset) lo = m; else hi = m; }
  return [c[0] + (x[0] - c[0]) * lo, c[1] + (x[1] - c[1]) * lo]; }

export class Sensor {
  constructor(spec, opts) {
    this.spec = spec; this.M = spec.totalMass; this.g = 9.81; this.prev = null;
    // GATE C2 option: a foot that is ON the turf and not sliding counts as support even while it carries < loadOn (it can take load the
    // moment the CoP moves onto it). C1 keeps its loaded-feet-only region (option off → identical behaviour).
    this.supportTouching = !!(opts && opts.supportTouching);
    const bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
    this.feet = {}; for (const s of ["L", "R"]) { const i = bi("foot_" + s), sh = spec.bodies[i].shapes[0];
      this.feet[s] = { side: s, body: i, ankle: ji("ankle_" + s), box: sh, state: "AIR", slipCnt: 0, stickCnt: 0, tdCnt: 0, loaded: false, anchor: null, slipping: false }; }
    this.chest = bi("chest"); this.cop = null;
  }
  // states: w.read(i) for all bodies; contacts: w.contacts; ankleLam: { L: [3], R: [3] } N·s; ext: { J: [3], at: [3] } or null (N·s this step)
  update(n, dt, states, contacts, ankleLam, ext) {
    const spec = this.spec, M = this.M, g = this.g, nb = states.length;
    let c = [0, 0, 0], v = [0, 0, 0]; for (let i = 0; i < nb; i++) { const m = spec.bodies[i].mass; c = V.add(c, V.sc(states[i].com, m)); v = V.add(v, V.sc(states[i].v, m)); }
    c = V.sc(c, 1 / M); v = V.sc(v, 1 / M);
    let L = [0, 0, 0]; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s = states[i], wl = Q.rot(Q.conj(s.rot), s.w);
      L = V.add(L, V.add(Q.rot(s.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(s.com, c), s.v), b.mass))); }
    const h = Math.max(0.2, c[1]), omega0 = Math.sqrt(g / h), xi = [c[0] + v[0] / omega0, c[2] + v[2] / omega0];
    // net ground force + CoP from whole-body momentum (known external impulse removed)
    let grf = null, cop = null; const J = ext ? ext.J : [0, 0, 0];
    if (this.prev) { const a = V.sc(V.sub(v, this.prev.v), 1 / dt); grf = V.sub(V.sub(V.sc(a, M), [0, -g * M, 0]), V.sc(J, 1 / dt));
      let dL = V.sc(V.sub(L, this.prev.L), 1 / dt); if (ext) dL = V.sub(dL, V.cross(V.sub(ext.at, c), V.sc(J, 1 / dt)));
      if (grf[1] > 50) { const rz = (-c[1] * grf[2] - dL[0]) / grf[1], rx = (dL[2] - c[1] * grf[0]) / grf[1]; cop = [c[0] + rx, c[2] + rz];
        this.cop = this.cop ? [this.cop[0] + SENSE.copAlpha * (cop[0] - this.cop[0]), this.cop[1] + SENSE.copAlpha * (cop[1] - this.cop[1])] : cop; } else this.cop = null; }
    // per-foot contact state
    const feet = {}; let nonFootGround = false, footSelf = false;
    const turfPts = { L: [], R: [] }, turfMu = { L: [], R: [] }, manifold = { L: false, R: false };
    for (const k of contacts) { const oth = k.a === -1 ? k.b : k.b === -1 ? k.a : null;
      if (oth == null) { if ((k.a === this.feet.L.body || k.b === this.feet.L.body || k.a === this.feet.R.body || k.b === this.feet.R.body) && k.a >= 0 && k.b >= 0 && k.depth > SENSE.touchDepth) footSelf = true; continue; }
      if (oth < 0) continue; const side = oth === this.feet.L.body ? "L" : oth === this.feet.R.body ? "R" : null;
      if (side) { manifold[side] = true; turfMu[side].push(k.mu); }       // any manifold, speculative included: the solver may act on it this step
      if (k.depth <= SENSE.touchDepth) continue;
      if (side) turfPts[side].push(...k.pts); else nonFootGround = true; }
    for (const s of ["L", "R"]) { const F = this.feet[s], st = states[F.body], m = spec.bodies[F.body].mass, box = F.box;
      let force = [0, 0, 0]; if (this.prev) { const a = V.sc(V.sub(st.v, this.prev.states[F.body].v), 1 / dt); force = V.sub(V.sub(V.sc(a, m), [0, -g * m, 0]), V.sc(ankleLam[s], 1 / dt)); }
      // in contact = touching points, OR a (speculative) manifold through which the solver is already pushing (measured load > loadOn):
      // Jolt acts on contacts up to 2 cm apart, so the load can arrive one step before the 0.5 mm geometric test says "touching"
      const load = force[1], pts = turfPts[s], touching = pts.length > 0 || (manifold[s] && load > SENSE.loadOn), shear = [force[0], 0, force[2]], shearMag = Math.sqrt(force[0] * force[0] + force[2] * force[2]);
      // SLIDING = the sole's horizontal displacement over a 10-step (42 ms) window, the MINIMUM over the four sole corners. A foot rolling
      // about its toe or heel keeps a stationary pivot corner; impact jitter does not accumulate displacement; a real slide moves every
      // corner. (Gate C1 findings: a centroid velocity, and then an instantaneous per-point velocity, both flagged the heel-strike after a
      // toe stand as "slip" on both feet — the foot rotates about an axis above the sole during the impact — and caused a false release.)
      const corners = []; { const b = F.box; for (const sx of [-1, 1]) for (const sz of [-1, 1]) corners.push(V.add(st.pos, Q.rot(st.rot, [b.pos[0] + sx * b.he[0], b.pos[1] - b.he[1], b.pos[2] + sz * b.he[2]]))); }
      // the window only holds samples taken while this foot was LOADED and in contact (C1 finding PR30: a window spanning the pre-touchdown
      // travel of a foot being put back down read as a 13–18 cm/s "slide" the instant it loaded; the loaded slide was 0.06 mm)
      F.hist = F.hist || []; if (!(touching && load > SENSE.loadOff)) F.hist.length = 0; else { F.hist.push(corners); if (F.hist.length > SENSE.slipWindow + 1) F.hist.shift(); }
      let slipSpeed = 0, step1 = 0; const centroid = touching ? V.sc(pts.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / pts.length) : null;
      if (F.hist.length > SENSE.slipWindow) { const old = F.hist[0], prev1 = F.hist[F.hist.length - 2]; slipSpeed = 1e9; step1 = 1e9;
        for (let q = 0; q < 4; q++) { slipSpeed = Math.min(slipSpeed, Math.sqrt((corners[q][0] - old[q][0]) ** 2 + (corners[q][2] - old[q][2]) ** 2) / (SENSE.slipWindow * dt));
          step1 = Math.min(step1, Math.sqrt((corners[q][0] - prev1[q][0]) ** 2 + (corners[q][2] - prev1[q][2]) ** 2)); } }
      if (F.loaded && touching) F.slid = (F.slid || 0) + step1;
      // which part of the boot touches (heel / toe / medial / lateral), in the foot's own frame
      let heel = false, toe = false, lat = false, med = false; const zc = box.pos[2], hz = box.he[2], xc = box.pos[0];
      for (const p of pts) { const lp = Q.rot(Q.conj(st.rot), V.sub(p, st.pos)); if (lp[2] < zc - 0.35 * hz) heel = true; if (lp[2] > zc + 0.35 * hz) toe = true;
        const outward = s === "L" ? -(lp[0] - xc) : (lp[0] - xc); if (outward > 0.35 * box.he[0]) lat = true; if (outward < -0.35 * box.he[0]) med = true; }
      // hysteresis: loaded / unloaded, slip / stick (integer step counters → deterministic)
      if (!F.loaded && touching && load > SENSE.loadOn) F.loaded = true; else if (F.loaded && (!touching || load < SENSE.loadOff)) F.loaded = false;
      if (F.loaded && slipSpeed > SENSE.slipOn) { F.slipCnt++; F.stickCnt = 0; } else if (slipSpeed < SENSE.slipOff) { F.stickCnt++; F.slipCnt = 0; } else { F.slipCnt = 0; F.stickCnt = 0; }
      if (!F.slipping && F.slipCnt >= SENSE.slipOnSteps) F.slipping = true; else if (F.slipping && (F.stickCnt >= SENSE.slipOffSteps || !F.loaded)) F.slipping = false;
      const prevState = F.state; let state;
      if (!touching) state = F.loaded ? "LIFTOFF" : "AIR";
      else if (prevState === "AIR" || (prevState === "TOUCHDOWN" && F.tdCnt < SENSE.touchdownSteps)) { state = "TOUCHDOWN"; F.tdCnt = prevState === "TOUCHDOWN" ? F.tdCnt + 1 : 1; }
      else if (!F.loaded) state = "LIFTOFF";
      else if (F.slipping) state = "SLIPPING";
      else if (heel && toe && (lat && med || pts.length >= 3)) state = "FLAT";
      else if (heel && !toe) state = "HEEL"; else if (toe && !heel) state = "TOE"; else state = "EDGE";
      if ((state === "FLAT" || state === "HEEL" || state === "TOE" || state === "EDGE") && (F.anchor == null || prevState === "TOUCHDOWN" || prevState === "AIR")) F.anchor = { pos: st.pos.slice(), rot: st.rot.slice(), n };
      if (F.anchor == null && touching) F.anchor = { pos: st.pos.slice(), rot: st.rot.slice(), n };
      F.state = state;
      const muAvail = turfMu[s].length ? turfMu[s].reduce((a, b) => a + b, 0) / turfMu[s].length : null;
      feet[s] = { side: s, state, touching, manifold: manifold[s], loaded: F.loaded, slipping: F.slipping, points: pts, centroid, heel, toe, lat, med, load, shear, shearMag, slipSpeed,
        muUsed: load > 1 ? shearMag / load : null, muAvail, friction: F.slipping ? "SLIP" : (muAvail != null && load > 1 && shearMag / load > 0.8 * muAvail ? "NEAR_LIMIT" : "STICK"),
        anchor: F.anchor, slipDist: F.slid || 0, fromAnchor: F.anchor ? Math.sqrt((st.pos[0] - F.anchor.pos[0]) ** 2 + (st.pos[2] - F.anchor.pos[2]) ** 2) : 0, pose: { pos: st.pos, rot: st.rot } }; }
    // Two different regions (Gate C1 finding, test PF60): the CONTACT polygon = hull of the points actually touching now — where the
    // CoP can be commanded this instant (a foot up on its toes offers only the toe edge); the SUPPORT REGION = hull of the whole sole
    // footprints of the loaded, non-slipping feet — the region the body can still be captured over, because a rolled foot can roll
    // back flat. Capture-point margins (the classifier) use the support region; the CoP command uses the contact polygon.
    const ST = this.supportTouching, relFeet = ["L", "R"].filter(s => (feet[s].loaded || ST) && !feet[s].slipping && feet[s].touching);
    const loadFeet = ["L", "R"].filter(s => (feet[s].loaded || (ST && !feet[s].slipping)) && feet[s].touching);
    const raw = hull2([...(feet.L.touching ? feet.L.points : []), ...(feet.R.touching ? feet.R.points : [])]);
    const reliable = hull2(relFeet.flatMap(s => feet[s].points));
    const sole = (s) => { const F = this.feet[s], st = states[F.body], b = F.box, out = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(V.add(st.pos, Q.rot(st.rot, [b.pos[0] + sx * b.he[0], b.pos[1] - b.he[1], b.pos[2] + sz * b.he[2]]))); return out; };
    for (const s of ["L", "R"]) feet[s].sole = sole(s);
    // A SLIDING foot still carries vertical load, so it stays in the support region; what it cannot supply is friction. Support is then
    // flagged DEGRADED and the controller limits its CoP demand to what the feet's friction can deliver (Gate C1 finding, H3: excluding
    // the slipping foot from the region made the classifier give up at startup).
    const regionRaw = hull2(loadFeet.flatMap(s => feet[s].sole)), region = regionRaw, degraded = loadFeet.some(s => feet[s].slipping);
    const comG = [c[0], c[2]], xiMargin = polyDist(region, xi), comMargin = polyDist(region, comG), xiMarginRaw = polyDist(regionRaw, xi), xiMarginContact = polyDist(reliable, xi);
    // body lean: chest and pelvis "up" vs gravity, spine bend between them, heading from the feet
    const up = (q) => Q.rot(q, [0, 1, 0]), tilt = (u) => dacos(u[1]) * 180 / Math.PI;
    const pu = up(states[0].rot), cu = up(states[this.chest].rot), spineBend = dacos(V.dot(pu, cu)) * 180 / Math.PI;
    const obs = { n, t: n * dt, states, contacts, com: c, vcom: v, L, h, omega0, xi, grf, cop, copSmooth: this.cop, feet, polyRaw: raw, polyReliable: reliable.length >= 3 ? reliable : raw, region, regionRaw, reliableFeet: relFeet, supportDegraded: degraded || ["L", "R"].some(s => feet[s].slipping),
      comMargin, xiMargin, xiMarginRaw, xiMarginContact, nonFootGround, footSelfContact: footSelf, trunkTiltDeg: tilt(cu), pelvisTiltDeg: tilt(pu), spineBendDeg: spineBend, gravity: [0, -1, 0] };
    this.prev = { v, L, states }; return obs;
  }
}

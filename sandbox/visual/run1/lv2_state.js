// ═══ run1/lv2_state.js — LOCOMOTION V2 STRAIGHT-LINE BASELINE: the locomotion-side STATE CONTRACT for Physical Character V2 (LV2-STATE-1) ═══
// Frozen with the baseline (10 Oct 2026). Specification: review_artifacts/locomotion_v2_run1/LOCOMOTION_V2_STATE_CONTRACT.md. It answers the
// RUN-1-side rows R-0…R-8 of the Physical Character V2 draft (physical-character-v2 @ 14b5cbaa, RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT.md §2.1).
//
// READ-ONLY over the frozen baseline: every function takes the baseline API object E (RUN1_V13 = run1_gait_v13.js) and an actor A made by E.r1Make,
// and NEVER modifies A, E or the simulation (a query works on its own gait object / clone; the only shared write is the baseline's own speed-grid
// cache on the body, filled deterministically on first use, exactly as rendering does). No RNG, no clock, no frame data.
//
// NUMERICS. float64 throughout, ROOT-RELATIVE (character root frame: +x = the runner's right, +y = up, +z = the direction of travel), with the root
// transform given separately and world values composed in float64 (anim3d world: x = pitch x, y = up, z = −pitch y). Velocities, in order of preference:
//   • ANALYTIC where the construction is closed form: gait clock rate, spring-mass pelvis vertical (y, ẏ, ÿ, the model's vertical force), pelvis
//     sway / tilt / obliquity / yaw rates, swing-phase joint-channel rates (exact Hermite derivative), the root (authoritative input).
//   • otherwise a DECLARED central difference of the CONTINUOUS POSE FUNCTION at h = 0.25 ms (the same closed-form pose the renderer evaluates,
//     advanced in phase, plant travel and — if the input carries an acceleration — speed), one-sided (second order) when a DECLARED EVENT lies
//     inside the stencil. Never rendered frames, never float32 matrices. Declared events (velocity is not continuous across them, or the curve is
//     only C0 between grid speeds): each leg's touchdown and toe-off, and each stance's heel-rise onset (the foot leaves flat at a finite pitch rate).
// The authority split is the draft's: the SIMULATION owns the root (position, velocity, facing, its rate), the contact decision and all mass /
// momentum; RUN-1 owns the presentation pose and its own gait clock. The segment COM here is a DIAGNOSTIC (V2's mass model replaces it).
"use strict";
// eslint-disable-next-line no-var
var LV2_STATE = (function () {
  const CONTRACT = "LV2-STATE-1", D2R = Math.PI / 180, TAU = Math.PI * 2, G = 9.81, H = 1e-4, FLAT = 1e-9;   // FLAT: |foot pitch| below this is flat (the heel-rise bisection resolves ~1e-12 rad)
  const wrap = (u) => ((u % 1) + 1) % 1;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const mv = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
  const mm = (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // FNV-1a 32 over a string / over float64 bit patterns (identity stamps, not security)
  const fnvStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 255; h = Math.imul(h, 16777619) >>> 0; h ^= s.charCodeAt(i) >>> 8; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
  const bits = (x) => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x); return b.getBigUint64 ? b.getBigUint64(0).toString(16).padStart(16, "0") : String(x); };
  const keyed = (o) => JSON.stringify(o, (k, v) => (k === "__key" || k === "late" || k === "swing" ? undefined : v));

  // ── R-0 provenance ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const provCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;   // per body (rig) × parameter object: the stamp is a pure function of both
  function provenance(E, A) {
    const per = provCache && (provCache.get(A.body) || (provCache.set(A.body, new Map()), provCache.get(A.body)));
    if (per && per.has(A.prm)) return per.get(A.prm);
    const R = E.RUN1, sk = A.body.skel;
    const params = keyed({ ref: R.ref, jog11: R.jog11, anchors11: R.anchors11, regimes: R.regimes, allOutFrom: R.allOutFrom, ladder: R.ladder, grid: { v0: E.R1_GRID.v0, dv: E.R1_GRID.dv, n: E.R1_GRID.n }, step: E.R1_STEP });
    const bind = JSON.stringify(sk.bones.map(b => [b.name, b.parent ? b.parent.name : null, b.off, b.dir, b.len])) + "|" + sk.H + "|" + sk.ankleH + "|" + sk.legLen;
    const out = { contract: CONTRACT, implementation: E.version, runId: R.id, baseline: E.baseline || null, paramHash: fnvStr(params), paramBytes: params.length,
      rigId: typeof sk.character === "string" ? sk.character : null, bindHash: fnvStr(bind), bones: sk.bones.length,
      ladder: R.ladder, anchorSpeeds: E.r1Anchors(R.ref).map(a => ({ id: a.id, name: R.ladder[a.id], v: a.v })), grid: { v0: E.R1_GRID.v0, dv: E.R1_GRID.dv, n: E.R1_GRID.n }, gridStep: E.R1_STEP };
    if (per) per.set(A.prm, out); return out;
  }

  // ── actor clone + the replay rule (R-1: the same integration path that was rendered, advanced on a COPY) ───────────────────────────────
  function clone(A) {
    const L = (l) => ({ pl: l.pl ? Object.assign({}, l.pl) : null });
    return { body: A.body, prm: A.prm, phase: A.phase, t: A.t, v: A.v, aF: A.aF, accLean: A.accLean, legs: { R: L(A.legs.R), L: L(A.legs.L) }, _replayT: A._replayT, fk: null, closedForm: A.closedForm };
  }
  // the actor's state at authoritative time tau, by the rendering path's own arithmetic: replay actors (r1Replay: fixed 1/240 s grid from t = 0,
  // speed sampled at mid-step, the partial step last) advance a clone from their committed grid time; incremental actors (r1Advance per frame)
  // advance a clone by tau − A.t in one call. A query before the committed time re-runs the replay from t = 0 on a fresh actor (declared, O(t)).
  function advanceTo(E, A, tau, vOf, aOf) {
    const step = E.R1_STEP;
    if (A._replayT != null) {
      let C = clone(A), path = "replay grid, from the committed grid time";
      if (tau < C._replayT - 1e-12 || C.v == null) { C = Object.assign(E.r1Make(A.body.skel, A.prm), { body: A.body, _replayT: 0 }); path = "replay grid, re-run from t = 0 (query time before the actor's committed time)"; }
      while (C._replayT + step <= tau + 1e-12) { const tm = C._replayT + step / 2; E.r1Advance(C, vOf(tm), step, aOf ? aOf(tm) : null); C._replayT += step; }
      const rest = tau - C._replayT; if (rest > 1e-12) E.r1Advance(C, vOf(C._replayT + rest / 2), rest, aOf ? aOf(C._replayT + rest / 2) : null);
      C._queryT = tau; return { C, path };
    }
    const C = clone(A); if (tau > C.t + 1e-12) E.r1Advance(C, vOf((C.t + tau) / 2), tau - C.t, aOf ? aOf((C.t + tau) / 2) : null);
    C._queryT = tau; return { C, path: tau >= A.t - 1e-12 ? "incremental (one r1Advance on a clone)" : "incremental — query before the actor's time is not reconstructable; state is the actor's own" };
  }

  // ── regime / blend state ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function regime(E, A, v) {
    const R = E.RUN1, anchors = E.r1Anchors(R.ref), P = E.r1ParamsAt(v, A.prm === R.ref ? undefined : A.prm), i = Math.min(anchors.length - 2, Math.floor(P.blend)), t = P.blend - i;
    const w = {}; for (const a of anchors) w[R.ladder[a.id]] = 0; w[R.ladder[anchors[i].id]] += 1 - t; w[R.ladder[anchors[i + 1].id]] += t;
    let dom = null; for (const k in w) if (dom == null || w[k] > w[dom]) dom = k;
    const g = E.R1_GRID, x = Math.max(0, Math.min(g.n - 1 - 1e-9, (v - g.v0) / g.dv)), ci = Math.floor(x);
    return { weights: w, dominant: dom, allOut: w[R.ladder.ALLOUT] || 0, anchorSegment: { from: anchors[i].v, to: anchors[i + 1].v, t },
      gridCells: { vLo: g.v0 + ci * g.dv, vHi: g.v0 + (ci + 1) * g.dv, frac: x - ci }, range: v < anchors[0].v ? "below LOW (LOW parameters held)" : v > anchors[anchors.length - 1].v ? "above ALL-OUT (ALL-OUT parameters held; step length grows)" : "inside the ladder" };
  }

  // ── the continuous pose function around the actor's present state ─────────────────────────────────────────────────────────────────────
  // the acceleration lean drifts with its filter (r1Advance: a_f += (a − a_f)(1 − e^(−dt/0.15)), lean = clamp(1.6 a_f, −6, 12) deg): its exact rate
  // 1.6 (a − a_f) / 0.15 deg/s (0 while clamped), with a = the authoritative acceleration (0 if the input carries none)
  function poseFn(E, A, v, aIn) {
    const la0 = A.accLean || 0, aF = A.aF || 0, raw = 1.6 * aF, laRate = raw > -6 && raw < 12 ? 1.6 * ((aIn || 0) - aF) / 0.15 : 0;
    const p0 = E.r1GaitAt(A.body, A.prm, v), base = { body: A.body, p: p0, late: null, accLean: la0 }, gaits = new Map([[0, base]]);
    const plants0 = E.r1Plants(A), T0 = base.p.T, bones = A.body.skel.bones;
    return function at(dt) {
      let Gd = base;
      if (dt !== 0) { if (!gaits.has(dt)) gaits.set(dt, { body: A.body, p: aIn ? E.r1GaitAt(A.body, A.prm, v + aIn * dt) : p0, late: null, accLean: Math.max(-6, Math.min(12, la0 + laRate * dt)) }); Gd = gaits.get(dt); }
      const Tm = aIn ? E.r1GaitAt(A.body, A.prm, v + aIn * dt / 2).T : T0, u = A.phase + dt / Tm, pl = {};
      for (const sd in plants0) pl[sd] = { zTD: plants0[sd].zTD, footW: plants0[sd].footW, travel: plants0[sd].travel + (v * dt + 0.5 * (aIn || 0) * dt * dt) };
      const pose = E.r1Pose(Gd, u, pl), fk = E.r1FK(Gd, pose, null);
      const tip = bones.map(b => add(fk.P[b.idx], mv(fk.R[b.idx], sc(b.dir, b.len))));
      // event signature per leg: swing "S", stance flat "F", stance with the foot pitched "P" (touchdown / toe-off / heel-rise onset change it)
      const ev = ["R", "L"].map(sd => { const lg = pose.legs[sd]; if (!lg.st) return "S"; return Math.abs(E.r1StanceLeg(Gd, sd, lg.s, pl[sd]).beta) < FLAT ? "F" : "P"; }).join("");
      return { G: Gd, u, pose, R: fk.R.map(r => r.slice()), P: fk.P.map(p => p.slice()), tip, st: ev };
    };
  }
  // derivative stencil: central unless a contact event lies inside it, then one-sided second order on the side without the event
  function stencil(at) {
    const f0 = at(0), fp = at(H), fm = at(-H);
    const lin = (fs, ws) => (g) => { const a = fs.map(g); return a[0].map((_, i) => { let s = 0; for (let k = 0; k < a.length; k++) s += ws[k] * a[k][i]; return s / (2 * H); }); };
    if (fm.st === f0.st && fp.st === f0.st) return { f0, method: "central, h = 0.1 ms", d: lin([fp, fm], [1, -1]) };
    if (fp.st === f0.st) { const fpp = at(2 * H); return { f0, method: "one-sided forward (a declared event in the past 0.1 ms), h = 0.1 ms", d: lin([f0, fp, fpp], [-3, 4, -1]) }; }
    const fmm = at(-2 * H); return { f0, method: "one-sided backward (a declared event in the next 0.1 ms), h = 0.1 ms", d: lin([f0, fm, fmm], [3, -4, 1]) };
  }
  const angVel = (R0, dR) => { const W = mm(dR, [R0[0], R0[3], R0[6], R0[1], R0[4], R0[7], R0[2], R0[5], R0[8]]); return [(W[7] - W[5]) / 2, (W[2] - W[6]) / 2, (W[3] - W[1]) / 2]; };   // skew(Ṙ Rᵀ)

  // ── R-1 … R-7: the state of actor A (as it is now) under the authoritative input `sim` at the same time ──────────────────────────────────
  // sim = { x, y (pitch metres), heading (rad), v (m/s), a? (m/s², the authoritative acceleration), yawRate? (rad/s), vx?, vy? (pitch m/s) }
  function query(E, A, sim, opts) {
    opts = opts || {};
    const v = sim.v, aIn = sim.a != null ? sim.a : 0, at = poseFn(E, A, v, aIn), S = stencil(at), f0 = S.f0, G0 = f0.G, p = G0.p, body = A.body, sk = body.skel, B = sk.byName;
    const uRate = 1 / p.T;
    // root (authoritative; RUN-1 owns none of it)
    const hd = sim.heading, Rr = [-Math.sin(hd), 0, Math.cos(hd), 0, 1, 0, -Math.cos(hd), 0, -Math.sin(hd)];   // columns: right, up, forward (anim3d world)
    const O = [sim.x, 0, -sim.y], vxP = sim.vx != null ? sim.vx : v * Math.cos(hd), vyP = sim.vy != null ? sim.vy : v * Math.sin(hd), vRoot = [vxP, 0, -vyP];
    const yawRate = sim.yawRate != null ? sim.yawRate : 0, wRoot = [0, yawRate, 0];
    const toW = (pL) => add(O, mv(Rr, pL)), velW = (pL, vL) => add(add(vRoot, cross(wRoot, mv(Rr, pL))), mv(Rr, vL));
    // joints (R-2, R-3)
    const nB = sk.bones.length, dP = S.d((f) => [].concat(...f.P)), dR = S.d((f) => [].concat(...f.R)), dTip = S.d((f) => [].concat(...f.tip));
    const joints = sk.bones.map((b, i) => {
      const P = f0.P[i], R = f0.R[i], vL = dP.slice(i * 3, i * 3 + 3), wL = angVel(R, dR.slice(i * 9, i * 9 + 9)), tipL = f0.tip[i], vTipL = dTip.slice(i * 3, i * 3 + 3);
      return { name: b.name, parent: b.parent ? b.parent.name : null, localRotation: (f0.pose.rot[b.name] || I3).slice(), root: { position: P, rotation: R, linearVelocity: vL, angularVelocity: wL, tip: tipL, tipVelocity: vTipL },
        world: { position: toW(P), rotation: mm(Rr, R), linearVelocity: velW(P, vL), angularVelocity: add(wRoot, mv(Rr, wL)), tip: toW(tipL), tipVelocity: velW(tipL, vTipL) } };
    });
    const J = (n) => joints[B[n].idx];
    // pelvis spring-mass state (R-4), analytic at the current gait parameters
    const pel = E.r1Pelvis(G0, f0.u), sm = pel.sm, ph = (x) => TAU * (f0.u - x);
    const dYaw = -p.pelvisYaw * TAU * Math.sin(ph(p.pelvisYawPh)) * uRate * D2R, dTilt = -p.tiltAmp * 2 * TAU * Math.sin(2 * TAU * (f0.u - p.tiltPh)) * uRate * D2R, dRoll = -p.obliq * TAU * Math.sin(ph(p.obliqPh)) * uRate * D2R;
    const Ry = E.R3.y(pel.yaw), wPelL = add(add([0, dYaw, 0], sc(mv(Ry, [1, 0, 0]), dTilt)), sc(mv(E.R3.mul(Ry, E.R3.x(pel.tilt)), [0, 0, 1]), dRoll));
    const vPelL = [-p.sway * TAU * Math.sin(ph(p.swayPh)) * uRate, sm.v, 0];
    const pelvis = { root: { position: pel.pos.slice(), rotation: pel.R.slice(), yaw: pel.yaw, tilt: pel.tilt, roll: pel.roll, linearVelocity: vPelL, angularVelocity: wPelL, yawRate: dYaw, tiltRate: dTilt, rollRate: dRoll },
      world: { position: toW(pel.pos), rotation: mm(Rr, pel.R), linearVelocity: velW(pel.pos, vPelL), angularVelocity: add(wRoot, mv(Rr, wPelL)) },
      springMass: { height: pel.pos[1], verticalVelocity: sm.v, verticalAcceleration: sm.a, verticalForceBW: (sm.a + G) / G, model: "true-gravity stance force a = A·s(1−s)(1+c(½−s)) − g, ballistic flight (r1Vertical); y measured at the pelvis joint", forceSkew: p.vSkew },
      method: "analytic (closed-form pelvis curves at the current gait parameters; under a speed change the parameter drift is in the pose-function velocity of joint 'pelvis', not here)" };
    // gait clock (R-5)
    const legs = {}, planted = [];
    for (const sd of ["R", "L"]) {
      const side = sd === "R" ? 1 : -1, lg = f0.pose.legs[sd], ul = lg.ul, ch = lg.ch, out = { stance: lg.st, ul, s: lg.s, w: lg.w, channels: Object.assign({}, ch) };
      out.sinceTouchdown = ul * p.T; if (lg.st) out.toToeOff = (p.D - ul) * p.T; out.toTouchdown = (1 - ul) * p.T;
      // joint-channel rates: exact Hermite derivative in swing; continuous-pose central difference in stance
      if (!lg.st) { const K = p.swing[sd].K, dwdt = 1 / ((1 - p.D) * p.T); out.channelRates = {}; for (const c of E.R1_CH) out.channelRates[c] = E.r1HermD(K[c], lg.w) * dwdt; out.channelRateMethod = "exact (Hermite derivative of the swing curve × dw/dt)"; }
      else { const ds = 1e-5, sp = E.r1StanceLeg(G0, sd, Math.min(1, lg.s + ds), A.legs[sd].pl ? Object.assign({}, A.legs[sd].pl, { travel: A.legs[sd].pl.travel + v * ds * p.tc }) : undefined).ch, sm2 = E.r1StanceLeg(G0, sd, Math.max(0, lg.s - ds), A.legs[sd].pl ? Object.assign({}, A.legs[sd].pl, { travel: A.legs[sd].pl.travel - v * ds * p.tc }) : undefined).ch;
        out.channelRates = {}; for (const c of E.R1_CH) out.channelRates[c] = (sp[c] - sm2[c]) / (2 * ds * p.tc); out.channelRateMethod = "central difference of the stance solution in stance fraction (ds = 1e-5), / contact time"; }
      // contact detail (R-6)
      const foot = J("foot_" + sd), toe = J("toe_" + sd);
      out.foot = { ankle: foot.world.position, rotation: foot.world.rotation, linearVelocity: foot.world.linearVelocity, angularVelocity: foot.world.angularVelocity, root: foot.root };
      out.toe = { mtp: toe.world.position, rotation: toe.world.rotation, tip: toe.world.tip, linearVelocity: toe.world.linearVelocity, angularVelocity: toe.world.angularVelocity, root: toe.root };
      out.mtpExtension = -ch.toe;                                   // MTP dorsiflexion (rad): the toe segment relative to the foot
      if (lg.st) {
        planted.push(sd);
        const plant = A.legs[sd].pl, stl = E.r1StanceLeg(G0, sd, lg.s, plant), beta = stl.beta, Bs = E.r1StanceBase(G0, sd, lg.s, plant);
        const up = -beta, capped = beta < 0 ? up - E.r1MtpDF(up) : 0;
        const sub = beta > FLAT ? (lg.s <= p.flatS ? "heel landing (rolling about the heel)" : "heel roll") : beta > -FLAT ? "flat" : (lg.s <= p.heelRiseS ? "forefoot landing (heel lowering about the MTP joint)" : capped > 1e-9 ? "toe pad (toe segment rolling about the pad)" : "heel-up (rolling about the MTP joint, toe segment flat)");
        const kind = beta > FLAT ? "heel" : beta > -FLAT ? "sole" : capped > 1e-9 ? "toe pad" : "MTP joint";
        // the pivot (root frame) and the material velocity of the foot / toe at it (≈ 0 while planted: HT-3). Heel: the heel contact line on the
        // turf; MTP joint: the joint centre (≈ 3 cm above the turf) about which the foot rotates while the toe segment lies flat and fixed; toe pad:
        // the pad's contact on the turf, about which the toe segment rolls. Flat: the whole sole is fixed (no single pivot)
        const heelG = add(Bs.flat, mv(Bs.Ry, [0, -body.ankleH, body.heelZ + 0.012])), mtpG = add(Bs.flat, mv(Bs.Ry, [0, -body.ankleH, body.mtp[2]])), padG = add(Bs.flat, mv(Bs.Ry, [0, -body.ankleH, body.mtp[2] + E.R1_MTP.padAhead]));
        const mtpJ = add(Bs.flat, mv(Bs.Ry, [0, body.mtp[1], body.mtp[2]]));
        const piv = kind === "heel" ? heelG : kind === "toe pad" ? padG : kind === "MTP joint" ? mtpJ : null, seg = kind === "toe pad" ? toe : foot;
        const matVel = (q) => { const r = sub3(q, seg.root.position); return velW(q, add(seg.root.linearVelocity, cross(seg.root.angularVelocity, r))); };
        out.contact = { subPhase: sub, pivot: kind, pivotPoint: piv ? toW(piv) : null, pivotPitch: piv ? { x: toW(piv)[0], y: -toW(piv)[2] } : null, pivotMaterialVelocity: piv ? matVel(piv) : null,
          soleGround: { heel: toW(heelG), underMtp: toW(mtpG), toePad: toW(padG) }, mtpJoint: toW(mtpJ), footPitch: beta, mtpExtension: beta < 0 ? E.r1MtpDF(up) : 0, toeSegmentPitch: capped,
          events: { touchdownAgo: ul * p.T, toeOffIn: (p.D - ul) * p.T, heelRiseOnsetFrom: p.heelRiseS, note: "the heel-rise onset is a declared event: the foot leaves flat at a finite pitch rate (no single onset fraction is stored: it is where the prescribed knee curve first needs more leg than the flat foot gives)" },
          plant: { flatFootAnklePoint: toW(Bs.flat), pitch: { x: toW(Bs.flat)[0], y: -toW(Bs.flat)[2] }, yaw: hd + side * p.toeOut * D2R, record: plant ? Object.assign({}, plant) : null, form: plant ? "runtime plant (made at this leg's touchdown, fixed on the pitch)" : "closed form (no runtime plant: a closed-form actor)" } };
      } else out.contact = { subPhase: "swing", clearance: Math.min(foot.world.position[1] - body.ankleH, toe.world.tip[1]) };
      legs[sd] = out;
    }
    // diagnostic segment COM (V2 generator fractions; the same marker as the viewer) — NOT the V2 mass model
    let m = 0, cP = [0, 0, 0], cV = [0, 0, 0];
    for (const k in body.massFrac) { const j = J(k), w = body.massFrac[k]; m += w; cP = add(cP, sc(sc(add(j.root.position, j.root.tip), 0.5), w)); cV = add(cV, sc(sc(add(j.root.linearVelocity, j.root.tipVelocity), 0.5), w)); }
    cP = sc(cP, 1 / m); cV = sc(cV, 1 / m);
    const gait = { phase: f0.u, phaseRate: uRate, source: "RUN-1's own cadence (not simulation-locked)", strideTime: p.T, stepTime: p.Ts, cadence: 1 / p.Ts, contactTime: p.tc, flightTime: p.Ts - p.tc, duty: p.D, stepLength: v * p.Ts,
      support: planted.length === 2 ? "double" : planted.length === 1 ? "stance-" + planted[0] : "flight", plantedFeet: planted.slice(), predictedAt: "the current speed (event times change if the speed changes)" };
    return {
      contract: CONTRACT, provenance: opts.provenance === false ? undefined : provenance(E, A),
      input: { echo: Object.assign({}, sim), bits: Object.fromEntries(Object.entries(sim).filter(([, x]) => typeof x === "number").map(([k, x]) => [k, bits(x)])) },
      time: A._queryT != null ? A._queryT : A.t, method: { velocities: S.method, numerics: "float64, root-relative + world composed in float64", h: H },
      regime: regime(E, A, v), gait,
      root: { position: O, pitch: { x: sim.x, y: sim.y }, heading: hd, rotation: Rr, linearVelocity: vRoot, speed: v, yawRate, yawRateSource: sim.yawRate != null ? "authoritative input" : "assumed 0 (straight-line baseline: RUN-1 does not model turning)" },
      speed: { commanded: v, authoritativeAcceleration: sim.a != null ? sim.a : null, lastAdvanced: A.v, filteredAcceleration: A.aF, accelerationLeanDeg: A.accLean, accelerationLeanRateDegS: (() => { const raw = 1.6 * (A.aF || 0); return raw > -6 && raw < 12 ? 1.6 * ((sim.a || 0) - (A.aF || 0)) / 0.15 : 0; })(), leanModel: "first-order filter τ = 0.15 s on the speed change; lean = clamp(1.6 °/(m/s²) · a_f, −6°, +12°)", accelerationRegime: "none (straight-line baseline)" },
      pelvis, joints, legs, com: { diagnosticOnly: true, massModel: "V2 generator segment fractions (v2_body.js), segment centre = joint→tip midpoint", root: { position: cP, linearVelocity: cV }, world: { position: toW(cP), linearVelocity: velW(cP, cV) } },
    };
  }
  const sub3 = sub;
  // sub-tick query at authoritative time tau (R-1): the state the rendering path holds at tau, from a clone; A is untouched
  function queryAt(E, A, simAt, tau, vOf, aOf, opts) { const r = advanceTo(E, A, tau, vOf, aOf), q = query(E, r.C, simAt(tau), opts); q.time = tau; q.method.path = r.path; return q; }
  // R-8 diagnostic: the unperturbed continuation at later times (never a physics input)
  function continuation(E, A, simAt, taus, vOf, aOf) { return taus.map(t => queryAt(E, A, simAt, t, vOf, aOf, { provenance: false })); }
  return { CONTRACT, provenance, query, queryAt, continuation, clone, advanceTo, regime };
})();
if (typeof module !== "undefined" && module.exports) module.exports = { LV2_STATE };

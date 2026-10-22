// ═══ receive_turn11/rt11_body.js — RECEIVE-TURN-1.1: the HUMAN BODY MOTION of a stationary receive-and-turn (presentation only) ═══════════════════
// The football action is RECEIVE-TURN-1's and is authoritative (receive_turn1/rt_sim.js, imported unchanged): technique, contact foot and surface,
// contact tick and position, the ideal and the executed first touch, the ball, the continuation. This body only explains it — it is not in the
// ball's world, so animation on / off cannot change anything (verified: tools/rt11_neutral.mjs).
// Architecture (owner: "authored/reference body motion → parameterize for the actual turn → procedural root → foot/contact IK → grounding"):
//   1. REFERENCE MOTION per technique (REF below): a timeline of phases with authored timing and amplitudes, parameterized by the turn angle a = |θ|
//      — anticipation (head check, shoulders opening), the support-foot step, weight onto it, the contact leg's swing, the contact, hips / torso
//      rotating through it, the pivot on the standing foot, the step-through, the acceleration steps.
//   2. FOOTSTEPS: every foot is either PLANTED (locked: a fixed position and yaw; or PIVOTING about its forefoot — heel up, the ball of the foot
//      fixed on the turf) or SWINGING (from one plant to the next). The contact leg's swing passes through the authoritative contact pose at the
//      contact time exactly; the exit steps follow the simulation's own planned run (+ the correction to the real ball).
//   3. SUPPORT and WEIGHT from the footsteps: a foot loads after touchdown and unloads before lift-off; the centre of mass (≈ the pelvis) is the
//      simulation's root path pulled toward the loaded foot — so it is always readable which leg carries the body.
//   4. SEQUENCED ROTATION: separate yaw channels for the gaze, the shoulders (chest), the hips (pelvis = the root heading) and each foot, with the
//      technique's lead / lag (shoulders open first, hips catch up; through-stance: the hips whip through the contact while the torso
//      counter-rotates); knee / hip flexion lowers the pelvis with the turn's demand; lean into the turn and forward into the acceleration.
//   5. IK on RUN-1.3's rig (r1LegIK, r1FK); if a planted foot would be out of reach the PELVIS moves (never the foot, never the ball).
import { DT, R } from "../receive_turn1/rk_model.js";
import { MOVE, DEG, clamp, s5, wrapA, dir, toL2, sgnF } from "../receive_turn1/rt_actions.js";
const SIDES = ["R", "L"], lerp = (a, b, t) => a + (b - a) * t, lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hat = (u, um) => (u <= um ? s5(u / Math.max(1e-6, um)) : s5((1 - u) / Math.max(1e-6, 1 - um)));       // 0 at both ends, 1 at um
const hdg = (v) => Math.atan2(v[1], v[0]), len2 = (v) => Math.hypot(v[0], v[1]), sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a));
export const HB = { ready: { width: 0.14, stagger: 0.02, toeOut: 8 }, ankleH: 0.088, mtp: 0.18, stepLift: 0.06, swingLift: 0.10, give: 0.09, runW: 0.10, cadence: [0.30, 0.22],
  load: 0.08, unload: 0.09, comPull: 0.38, reach: 0.965, heelLift: 0.045 };
// ── THE REFERENCE MOTIONS (authored; a = |θ| in degrees). Times are relative to the CONTACT (s). ─────────────────────────────────────────────────
//   lead       preparation begins this long before the contact (the head check, then the shoulders open)
//   plant      the support foot is planted (its step ends) at this time; swing: the contact leg leaves the turf
//   supToe     the support foot's toe points this much further toward the turn than the hips at the contact (it "establishes the turn")
//   shoulder   how far the shoulders lead the hips toward the exit before the contact; counter: the torso's counter-rotation at the contact
//              (the hips whip through, the shoulders hold), then the shoulders lead out of the turn by exitLead
//   hipPre     the hips' extra turn in the last 0.15 s before the contact (they begin turning before the ball arrives)
//   crouch     the pelvis lowering (knee / hip flexion) at its deepest; lean: the roll into the turn; land: the contact foot's touchdown as the
//              first exit step, as a share of the planned rotation (+ base); pivotMax: the support foot's pivot on its forefoot after the contact
export const REF = {
  DIRECTIONAL: (a) => ({ lead: 0.55, plant: -0.26, swing: -0.22, supToe: 6 + 0.12 * a, shoulder: 5 + 0.15 * a, counter: 0, exitLead: 0.10 * a, hipPre: 0.05 * a, crouch: 0.035 + 0.00015 * a, lean: 3 + 0.06 * a, landBase: 0.20, landShare: 0.2, pivotMax: 25 + 0.3 * a }),
  HALF_TURN: (a) => ({ lead: 0.62 + 0.0012 * a, plant: -0.30 - 0.0006 * a, swing: -0.22, supToe: 10 + 0.16 * a, shoulder: clamp(8 + 0.12 * a, 8, 26), counter: a > 105 ? 0.08 * (a - 105) : 0, exitLead: 6 + 0.06 * a, hipPre: 0.04 * a, crouch: 0.04 + 0.00022 * a, lean: 4 + 0.07 * a, landBase: 0.20, landShare: 0.30, pivotMax: 40 + 0.35 * a }),
  OUTSIDE_TURN: (a) => ({ lead: 0.62, plant: -0.28, swing: -0.21, supToe: 4 + 0.08 * a, shoulder: 10 + 0.08 * a, counter: 4, exitLead: 8 + 0.05 * a, hipPre: 0.05 * a, crouch: 0.045 + 0.0002 * a, lean: 6 + 0.06 * a, landBase: 0.22, landShare: 0.35, pivotMax: 50 + 0.3 * a }),
  THROUGH_TURN: (a) => ({ lead: 0.80, plant: -0.32, swing: -0.26, supToe: 25 + 0.12 * a, shoulder: 18 + 0.06 * a, counter: 10 + 0.06 * a, exitLead: 12 + 0.05 * a, hipPre: 6 + 0.03 * a, crouch: 0.06 + 0.00022 * a, lean: 7 + 0.06 * a, landBase: 0.14, landShare: 0.55, pivotMax: 70 + 0.25 * a }),
};
export class HumanTurnBody {
  // E: RUN1_V13; M4; skel; prep: rt_sim.prepareTurn(); ep: rt_sim.runTurn()
  constructor(E, M4, skel, prep, ep) {
    this.E = E; this.M4 = M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.prep = prep; this.ep = ep; this.fk = null;
    const A = prep.A; this.A = A; this.tc = prep.kc * DT; this.F = A.F; this.Fs = A.F === "R" ? "L" : "R"; this.sig = A.sig; this.a = Math.abs(A.thetaDeg);
    this.ref = REF[A.fid](this.a); this.path = A.path; this.theta = A.theta; this.psiC = A.psiC;
    this.meet = ep && ep.meet && ep.m.cls !== "RECOVERY" && ep.m.cls !== "UNSTABLE" ? ep.meet : null; this.follow = ep && ep.follow ? ep.follow : null;
    const dv = A.dv, nI = len2(dv) > 1e-6 ? [dv[0] / len2(dv), dv[1] / len2(dv)] : dir(A.psiC); this.nImp = nI;
    this.ballC = A.C3 ? A.C3.slice() : [A.C[0], A.C[1], R];                                   // the ball AT the contact tick (authoritative)
    this.mtpY = Math.abs(this.b.mtp[1]); this.mtpZ = this.b.mtp[2];                          // the rig's MTP joint below / ahead of the ankle
    this.cPose = this.contactFoot(A.F, A.surface, this.ballC, nI);
    this.vOut = ep ? [ep.ex.v[0], ep.ex.v[1]] : A.vOut;
    this.ev = {}; this.buildYaw(); this.buildSteps(); this.buildEvents();
  }
  // ── the contact foot's pose for surface s: the surface's normal faces the impulse, the boot meets the ball's surface at the contact ───────────
  contactFoot(F, s, c, n) {
    const sg = sgnF(F); let h = Math.max(0.10, c[2] - 0.03), phi, ank, pitch = 4 * DEG;
    if (s === "INSIDE") { phi = hdg(n) + sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.045) - f[0] * 0.05, c[1] - n[1] * (R + 0.045) - f[1] * 0.05]; }
    else if (s === "OUTSIDE") { phi = hdg(n) - sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.04) - f[0] * 0.06, c[1] - n[1] * (R + 0.04) - f[1] * 0.06]; pitch = -6 * DEG; }
    else if (s === "SOLE") { phi = hdg(n) + Math.PI; ank = [c[0] - 0.02 * n[0], c[1] - 0.02 * n[1]]; pitch = 18 * DEG; return { ank: [ank[0], ank[1], c[2] + R + 0.06], yaw: phi, pitch }; }
    else { phi = hdg(n); ank = [c[0] - n[0] * (R + 0.06), c[1] - n[1] * (R + 0.06)]; pitch = -35 * DEG; }
    // ground clearance: the boot's toe tip (0.24 m ahead of the ankle, at the MTP's height when flat) stays ≥ 8 mm above the planted sole level
    // for the pitch of this surface — a toe-down (outside) contact must not sweep the forefoot through the turf
    const tipZ = (hh) => hh - (this.mtpY || 0.057) * Math.cos(pitch) + 0.24 * Math.sin(pitch), floor = HB.ankleH - (this.mtpY || 0.057) + 0.008; if (tipZ(h) < floor) h += floor - tipZ(h);
    return { ank: [ank[0], ank[1], h], yaw: phi, pitch };
  }
  // ── the rotation channels (t relative to the contact) ────────────────────────────────────────────────────────────────────────────────────────
  buildYaw() {
    const r = this.ref, sg = this.sig, psiC = this.psiC, th = this.theta, Trot = this.path.Trot, t0 = -r.lead;
    this.hipPre = sg * r.hipPre * DEG; this.yawC = psiC + this.hipPre;                      // the hips at the contact: the plan's facing + their early turn
    this.tAlign = Trot + 0.06;                                                              // hips aligned with the exit (≈ the plan's rotation)
    this.T0 = t0;
  }
  pelvisYaw(t) {
    const r = this.ref, t0 = this.T0, psiC = this.psiC, Trot = this.path.Trot;
    if (t <= 0) { const open = psiC * sstep(t0 + 0.12, -0.04, t), pre = this.hipPre * sstep(-0.16, 0, t); return open + pre; }
    if (this.follow) { const f = this.follow; const y1 = this.yawC + wrapA(this.path.psiAt(Math.min(t, f.t)) - this.yawC); if (t <= f.t) return y1;
      const face = hdg([f.contact[0] - this.rootAt(f.t)[0], f.contact[1] - this.rootAt(f.t)[1]]), yb = this.path.psiAt(f.t), tb = (f.tStable != null ? f.tStable : f.t + 0.5);
      const toFace = yb + wrapA(face - yb) * sstep(f.t - 0.05, f.t + 0.25, t); return t <= tb ? toFace : toFace + wrapA(this.theta - toFace) * sstep(tb, tb + 0.45, t); }
    // through the contact the hips keep their momentum: from the contact facing to the exit, the plan's smootherstep, started from where they are
    const u = clamp(t / Trot, 0, 1), y0 = this.yawC, y1 = this.theta; return y0 + wrapA(y1 - y0) * (0.12 * u + 0.88 * s5(u));
  }
  twist(t) {                                                                                // shoulders − hips (+ = toward the turn side)
    const r = this.ref, sg = this.sig, Trot = this.path.Trot, t0 = this.T0;
    const pre = r.shoulder * sstep(t0 + 0.05, -0.12, t), counter = -r.counter * Math.exp(-Math.pow((t - 0.03) / 0.09, 2)), lead = r.exitLead * Math.exp(-Math.pow((t - 0.55 * Trot) / (0.35 * Trot + 0.05), 2));
    const fade = t > 0 ? 1 - sstep(0.02, 0.22, t) : 1; return sg * DEG * (pre * fade + counter + (t > 0 ? lead : 0));
  }
  // ── the centre of mass path: the plan's stance during the preparation, then the simulation's run (+ the correction to the real ball) ──────────
  rootSim(t) {
    const A = this.A, path = this.path;
    if (t <= 0) return lerp2([0, 0], A.S, sstep(this.T0 + 0.05, 0, t));
    if (this.follow) { const f = this.follow, tA = Math.max(MOVE.react + 0.10, path.Trot * 0.8); if (t <= tA) return path.rootAt(t); const PA = path.rootAt(tA), c = f.contact, d = [c[0] - PA[0], c[1] - PA[1]], l = len2(d) || 1, at = [c[0] - d[0] / l * 0.40, c[1] - d[1] / l * 0.40]; return lerp2(PA, at, sstep(tA, f.t, t)); }
    const P = path.rootAt(t); if (!this.meet) return P;
    const m = this.meet, Rm = path.rootAt(m.t), corr = [m.Q[0] - Rm[0], m.Q[1] - Rm[1]], u = t <= m.t ? s5((t - MOVE.react) / Math.max(0.05, m.t - MOVE.react)) : 1; return [P[0] + corr[0] * u, P[1] + corr[1] * u];
  }
  rootAt(t) { return this.rootSim(t); }
  speedAt(t) { if (this.follow) { const f = this.follow; if (t > MOVE.react && t < (f.tStable != null ? f.tStable : f.t + 0.5) + 0.3) return 0.8; } return this.path.speedAt(t); }
  // ── the footsteps ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  buildSteps() {
    const A = this.A, r = this.ref, F = this.F, Fs = this.Fs, sg = this.sig, rd = HB.ready, T0 = this.T0;
    const readyOf = (X) => ({ pos: [(sgnF(X) === sg ? -1 : 1) * rd.stagger, sgnF(X) * rd.width], yaw: sgnF(X) * rd.toeOut * DEG });   // ready: half-open, the turn-side foot 2 cm back (mirrors with the turn)
    const seg = { R: [], L: [] }; this.seg = seg; this.readyPl = { R: readyOf("R"), L: readyOf("L") };
    // 1. the support foot's step — plants where the action needs it, its toe already pointing into the turn
    const supYaw = this.psiC + sg * r.supToe * DEG + (sgnF(Fs) * 4 * DEG), sFrom = this.readyPl[Fs], stepLen = len2([A.stand[0] - sFrom.pos[0], A.stand[1] - sFrom.pos[1]]);
    const tLiftS = Math.min(r.plant - 0.20, T0 + 0.14); this.ev.supportLift = tLiftS; this.ev.supportPlant = r.plant;
    // (a pivot's end pose is where the rotation about the forefoot puts the ankle: every later segment starts from it — no snap)
    const sPlant = stepLen > 0.03 ? { pos: A.stand.slice(), yaw: supYaw } : this.pivotTo(sFrom, supYaw); this.standDev = len2([sPlant.pos[0] - A.stand[0], sPlant.pos[1] - A.stand[1]]);
    if (stepLen > 0.03) seg[Fs].push({ kind: "swing", t0: tLiftS, t1: r.plant, from: sFrom, to: sPlant, lift: HB.stepLift });
    else seg[Fs].push({ kind: "pivot", t0: tLiftS, t1: r.plant, at: sFrom, to: sPlant });
    // 2. the contact foot opens on its forefoot during the preparation (no slide), then swings through the CONTACT pose
    const cFrom = this.readyPl[F], cOpen = this.pivotTo(cFrom, cFrom.yaw + 0.7 * this.psiC);
    if (A.fid !== "THROUGH_TURN") seg[F].push({ kind: "pivot", t0: T0 + 0.12, t1: r.swing - 0.02, at: cFrom, to: cOpen });
    const cStart = A.fid !== "THROUGH_TURN" ? cOpen : cFrom;
    // touchdown of the contact foot = the first exit step (the step-through for the through-stance turn)
    const tLand = r.landBase + r.landShare * this.path.Trot, Pl = this.rootAt(tLand), pl = this.pelvisYaw(tLand) + 0.25 * wrapA(this.theta - this.pelvisYaw(tLand));
    const land = { pos: toL2(Pl, pl, 0.16, sgnF(F) * HB.runW), yaw: pl + sgnF(F) * 4 * DEG }; this.ev.contactLand = tLand; this.cLand = land;
    const via = A.fid === "THROUGH_TURN" ? this.crossVia(cStart, sPlant) : null;
    seg[F].push({ kind: "contact", t0: r.swing, t1: tLand, from: cStart, to: land, via });
    // 3. the support foot pivots on its forefoot through the rotation, then lifts and steps through
    const remain = wrapA(this.theta - supYaw), pivYaw = supYaw + Math.sign(remain || sg) * Math.min(Math.abs(remain) - 10 * DEG > 0 ? Math.abs(remain) - 10 * DEG : 0, r.pivotMax * DEG);
    const tLiftS2 = tLand + 0.07, sPiv = this.pivotTo(sPlant, pivYaw); seg[Fs].push({ kind: "pivot", t0: 0.01, t1: tLiftS2 - 0.01, at: sPlant, to: sPiv, heel: true });
    this.ev.pivotEnd = tLiftS2;
    // 4. the run: alternate steps on the simulation's path; the swing that spans the meeting plays the ball on; an extra control is reached
    let tPrev = tLiftS2, side = Fs, last = { [F]: land, [Fs]: sPiv }, n = 0;
    const meetT = this.meet ? this.meet.t : null; let meetDone = false, ctrlDone = false;
    while (tPrev < 3.0 && n < 14) {
      const v = this.speedAt(tPrev + 0.1); let dT = n === 0 ? clamp(0.22 + 0.10 * (1 - v / 6), 0.20, 0.30) : clamp(lerp(HB.cadence[0], HB.cadence[1], v / 6), HB.cadence[1], HB.cadence[0]);
      if (meetT != null && !meetDone && meetT > tPrev) { const dN = clamp(lerp(HB.cadence[0], HB.cadence[1], this.speedAt(tPrev + dT) / 6), HB.cadence[1], HB.cadence[0]), uIn = (meetT - tPrev) / dT;
        if (uIn <= 1.0 && uIn < 0.45) { const dS = meetT - tPrev + 0.04 - 0.6 * dN; if (dS >= 0.16) dT = dS; else dT = clamp((meetT - tPrev) / 0.45, dT, 0.40); }   // shorten: the next step takes it at 60 % — else lengthen this one
        else if (uIn <= 1.0 && uIn > 0.85) dT = clamp((meetT - tPrev) / 0.62, dT, 0.40);
        else if (uIn > 1.0 && (meetT - (tPrev + dT - 0.04)) / dN < 0.45) { const dS = meetT - tPrev + 0.04 - 0.6 * dN; if (dS >= 0.16 && dS <= 0.40) dT = dS; } }
      const t1 = tPrev + dT, P = this.rootAt(t1), ps = this.pelvisYaw(t1);
      const lead = 0.10 + 0.055 * Math.min(6, this.speedAt(t1)), to = { pos: toL2(P, ps, lead, sgnF(side) * HB.runW), yaw: ps + sgnF(side) * 3 * DEG }, s = { kind: "swing", t0: tPrev, t1, from: last[side], to, lift: HB.swingLift * (n === 0 ? 0.8 : 1) };
      // toe-off: the heel rises about the ball of the foot over the end of the stance (more at speed) — the trailing leg stays within reach
      { const prevEnd = seg[side].length ? seg[side][seg[side].length - 1].t1 : -9, stand = tPrev - prevEnd; if (stand >= 0.08) { s.rise = clamp(0.02 + 0.011 * this.speedAt(tPrev), 0.02, 0.08); s.tw = Math.min(0.10, 0.6 * stand); } }
      if (meetT != null && !meetDone && t1 >= meetT - 0.03 && s.t0 <= meetT) { s.touch = { t: meetT, at: this.meet.ball }; meetDone = true; }
      if (this.follow && !ctrlDone && s.t0 <= this.follow.t && t1 >= this.follow.t - 0.02) { s.ctrl = this.follow; ctrlDone = true; }
      seg[side].push(s); last[side] = to; tPrev = t1 - 0.04; side = side === "R" ? "L" : "R"; n++;
      if (n === 1) this.ev.exitPlant = t1;
    }
    if (meetT != null && meetT < tLand - 0.02) meetDone = true;   // (played by the contact foot's follow-through: contactSwing)
    if (meetT != null && !meetDone) { // the meeting falls inside the first steps: give it to the swinging foot at that time
      const L2 = seg[this.F].concat(seg[this.Fs]).find((q) => q.kind === "swing" && q.t0 <= meetT && q.t1 >= meetT); if (L2) L2.touch = { t: meetT, at: this.meet.ball }; }
  }
  // the through-stance contact leg crosses: route its swing in front of (across) or behind the standing foot, clear of it
  crossVia(from, sPlant) {
    const A = this.A, c = this.cPose.ank, sp = sPlant.pos, fwd = dir(this.psiC), off = A.vid === "behind" ? -0.16 : 0.18;
    return [0.5 * (from.pos[0] + c[0]) + fwd[0] * off * 0.6, 0.5 * (from.pos[1] + c[1]) + fwd[1] * off * 0.6];
  }
  buildEvents() {
    const e = this.ev, T = this.path.Trot; e.prepStart = this.T0; e.swingStart = this.ref.swing; e.contact = 0;
    // the hips' fastest rotation, the weight transfer onto the exit foot, the hips aligned, the rejoin
    let best = 0, tb = 0; for (let t = -0.2; t < T + 0.3; t += 0.005) { const w = Math.abs(wrapA(this.pelvisYaw(t + 0.005) - this.pelvisYaw(t))) / 0.005; if (w > best) { best = w; tb = t; } } e.maxHipRotation = tb; e.maxHipRate = best / DEG;
    for (let t = 0; t < 2.5; t += 0.005) { const w = this.weights(t); if (w[this.F] > 0.5 && t > 0.05) { e.weightTransfer = t; break; } }
    for (let t = 0; t < 3; t += 0.005) if (Math.abs(wrapA(this.pelvisYaw(t) - this.theta)) < 10 * DEG) { e.aligned = t; break; }
    e.rejoin = this.meet ? this.meet.t : this.follow ? this.follow.t : null;
  }
  // ── a foot at time t: { ank [f, r, z], yaw, pitch, toe, planted, ballPt } ───────────────────────────────────────────────────────────────────
  footAt(X, t) {
    const L = this.seg[X]; let pl = this.readyPl[X], next = null;
    for (const s of L) {
      if (t < s.t0) { next = s; break; }
      if (t >= s.t1) { pl = s.to; continue; }
      const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
      if (s.kind === "pivot") return this.pivotFoot(s.at, s.to.yaw, sstep(s.t0, s.t1, t), s.heel ? HB.heelLift * Math.sin(Math.PI * clamp(u * 1.1, 0, 1)) : 0.01 * Math.sin(Math.PI * u));
      const out = s.kind === "contact" ? this.contactSwing(s, t) : this.swingFoot(s, t, u); out.since = t - s.t0; out.until = s.t1 - t; return out;
    }
    if (next && next.rise && t > next.t0 - next.tw) return this.pivotFoot(pl, pl.yaw, 1, next.rise * s5((t - (next.t0 - next.tw)) / next.tw));
    return { ank: [pl.pos[0], pl.pos[1], HB.ankleH], yaw: pl.yaw, pitch: 0, toe: 0, planted: true, ballPt: [pl.pos[0] + dir(pl.yaw)[0] * this.mtpZ, pl.pos[1] + dir(pl.yaw)[1] * this.mtpZ] };
  }
  // a swing: from the toe-off pose (heel risen, if the stance had a toe-off) to the next plant, lifted; a touch / extra control inside it is
  // passed through exactly (a hat offset from the plain swing)
  swingBase(s, u) {
    const TO = s.rise ? this.pivotFoot(s.from, s.from.yaw, 1, s.rise) : null, a0 = TO ? TO.ank : [s.from.pos[0], s.from.pos[1], HB.ankleH], pp = TO ? -TO.pitch : 0, e = s5(u);
    return { p: [a0[0] + (s.to.pos[0] - a0[0]) * e, a0[1] + (s.to.pos[1] - a0[1]) * e], h: a0[2] + (HB.ankleH - a0[2]) * e + (s.lift || HB.swingLift) * Math.sin(Math.PI * u), yaw: s.from.yaw + wrapA(s.to.yaw - s.from.yaw) * e,
      pitch: -pp * (1 - e) + 8 * DEG * Math.sin(Math.PI * u), toe: pp * (1 - s5(Math.min(1, u * 2.5))) };
  }
  swingFoot(s, t, u) {
    const B0 = this.swingBase(s, u); let p = B0.p, yaw = B0.yaw, h = B0.h; const pitch = B0.pitch;
      // a touch inside the swing (the authoritative rejoin / extra control): the foot passes EXACTLY through its pose at the touch's time; the
      // offset from the plain swing is a hat — zero, with zero slope, at lift-off and touchdown (no snap), one at the touch
      if (s.touch) { const um = (s.touch.t - s.t0) / (s.t1 - s.t0), Bm = this.swingBase(s, um), yT = Bm.yaw, pm = Bm.p, hm = Bm.h, w = hat(u, um);
        const Tp = [s.touch.at[0] - dir(yT)[0] * 0.17, s.touch.at[1] - dir(yT)[1] * 0.17]; p = [p[0] + (Tp[0] - pm[0]) * w, p[1] + (Tp[1] - pm[1]) * w]; h += (HB.ankleH + 0.035 - hm) * w; }
      if (s.ctrl) { const c = s.ctrl, cf = this.cFol || (this.cFol = this.contactFoot(c.surface && c.surface.indexOf("_L") > 0 ? "L" : "R", "INSIDE", c.contact, (() => { const R0 = this.rootAt(c.t), d = [c.contact[0] - R0[0], c.contact[1] - R0[1]], l = len2(d) || 1; return [-d[0] / l, -d[1] / l]; })()));
        const um = (c.t - s.t0) / (s.t1 - s.t0), Bm = this.swingBase(s, um), pm = Bm.p, hm = Bm.h, ym = Bm.yaw, w = hat(u, um);
        p = [p[0] + (cf.ank[0] - pm[0]) * w, p[1] + (cf.ank[1] - pm[1]) * w]; h += (cf.ank[2] - hm) * w; yaw += wrapA(cf.yaw - ym) * w; }
      return { ank: [p[0], p[1], h], yaw, pitch, toe: B0.toe, planted: false };
  }
  // a foot rotating about its forefoot: the MTP joint (the ball of the foot) stays fixed on the turf while the yaw changes and the heel lifts by
  // `lift` (the foot pitches toes-down about the MTP, the toes stay flat) — exact for the rig's MTP offset (foot frame [0, −mtpY, mtpZ])
  pivotTo(at, yaw1) { const q = this.pivotFoot(at, yaw1, 1, 0); return { pos: [q.ank[0], q.ank[1]], yaw: q.yaw }; }   // a completed pivot's flat pose
  pivotFoot(at, yaw1, w, lift) {
    const y0 = at.yaw, yaw = y0 + wrapA(yaw1 - y0) * w, my = this.mtpY, mz = this.mtpZ, ball = [at.pos[0] + dir(y0)[0] * mz, at.pos[1] + dir(y0)[1] * mz];
    const p = Math.asin(clamp(lift / Math.hypot(my, mz), 0, 0.5)), back = mz * Math.cos(p) - my * Math.sin(p), up = my * Math.cos(p) + mz * Math.sin(p);
    return { ank: [ball[0] - dir(yaw)[0] * back, ball[1] - dir(yaw)[1] * back, HB.ankleH - my + up], yaw, pitch: -p, toe: p, planted: true, pivot: true, ballPt: ball };
  }
  // the contact leg: lift, (cross the stance), meet the ball a little ahead of the contact pose, draw back with it at the CONTACT, follow
  // through with the ball's new direction, land as the first exit step
  contactSwing(s, t) {
    const C = this.cPose, n = this.nImp, vo = this.vOut, vl = len2(vo) || 1, vh = [vo[0] / vl, vo[1] / vl];
    const gv = this.A.fid === "THROUGH_TURN" ? 0.045 : HB.give, meetP = [C.ank[0] + n[0] * 0.06, C.ank[1] + n[1] * 0.06], give = [C.ank[0] + vh[0] * gv, C.ank[1] + vh[1] * gv], tM = -0.06;
    if (t <= tM) { const u = clamp((t - s.t0) / (tM - s.t0), 0, 1), su = s5(u); let p;
      if (s.via) { const a = lerp2(s.from.pos, s.via, s5(Math.min(1, u * 1.6))), b2 = lerp2(s.via, meetP, s5(Math.max(0, u * 1.6 - 0.6))); p = u < 0.375 ? a : lerp2(a, b2, s5((u - 0.375) / 0.625)); } else p = lerp2(s.from.pos, meetP, su);
      return { ank: [p[0], p[1], HB.ankleH + 0.07 * Math.sin(Math.PI * u) + (C.ank[2] - HB.ankleH) * su], yaw: s.from.yaw + wrapA(C.yaw - s.from.yaw) * s5(Math.min(1, u * 1.3)), pitch: C.pitch * su, toe: 0, planted: false }; }
    if (t <= 0) { const u = s5((t - tM) / -tM), p = lerp2(meetP, C.ank, u); return { ank: [p[0], p[1], C.ank[2]], yaw: C.yaw, pitch: C.pitch, toe: 0, planted: false, contact: true }; }
    const thr = this.A.fid === "THROUGH_TURN", gT = thr ? 0.06 : 0.08;
    if (t <= gT) { const u = s5(t / gT), p = lerp2(C.ank, give, u); return { ank: [p[0], p[1], C.ank[2] + 0.01 * u], yaw: C.yaw, pitch: C.pitch * (1 - u), toe: 0, planted: false }; }
    // an early rejoin (the ball stayed close): the contact foot itself plays it on during its follow-through
    const mt = this.meet && this.meet.t < s.t1 - 0.02 ? this.meet : null;
    const u = clamp((t - gT) / (s.t1 - gT), 0, 1); let p = lerp2(give, s.to.pos, s5(u)), h = HB.ankleH + (thr ? 0.12 : 0.08) * Math.sin(Math.PI * u) + (C.ank[2] + 0.01 - HB.ankleH) * (1 - s5(u));   // (continues from the give's end height)
    if (mt) { const um = clamp((mt.t - gT) / (s.t1 - gT), 0.05, 0.95), wv = hat(u, um), y = C.yaw + wrapA(s.to.yaw - C.yaw) * s5(um), pm = lerp2(give, s.to.pos, s5(um)), hm = HB.ankleH + (thr ? 0.12 : 0.08) * Math.sin(Math.PI * um) + (C.ank[2] + 0.01 - HB.ankleH) * (1 - s5(um));
      p = [p[0] + (mt.ball[0] - dir(y)[0] * 0.17 - pm[0]) * wv, p[1] + (mt.ball[1] - dir(y)[1] * 0.17 - pm[1]) * wv]; h += (HB.ankleH + 0.035 - hm) * wv; }
    return { ank: [p[0], p[1], h], yaw: C.yaw + wrapA(s.to.yaw - C.yaw) * s5(u), pitch: 0, toe: 0, planted: false };
  }
  // ── weight: a planted foot loads after touchdown and unloads before lift-off; the shares sum to 1 ───────────────────────────────────────────
  loadOf(X, t) {
    const L = this.seg[X]; let lastTD = -9, nextLift = 9;
    for (const s of L) { if (s.kind === "pivot") continue; if (s.t1 <= t) lastTD = s.t1; if (s.t0 > t) { nextLift = Math.min(nextLift, s.t0); } if (s.t0 <= t && t < s.t1) return 0; }
    return clamp((t - lastTD) / HB.load, 0, 1) * clamp((nextLift - t) / HB.unload, 0, 1);
  }
  weights(t) { const r = this.loadOf("R", t), l = this.loadOf("L", t), s = r + l; if (s >= 1e-6) return { R: r / s, L: l / s };
    // a flight phase (neither foot loaded, running): the share passes smoothly from the foot that unloaded last to the next one to load
    const h = 1 / 480; let ta = null, tb = null, fa = null, fb = null;
    for (let x = t - h, k = 0; k < 120; k++, x -= h) { const rr = this.loadOf("R", x), ll = this.loadOf("L", x); if (rr + ll >= 1e-6) { ta = x; fa = rr >= ll ? "R" : "L"; break; } }
    for (let x = t + h, k = 0; k < 120; k++, x += h) { const rr = this.loadOf("R", x), ll = this.loadOf("L", x); if (rr + ll >= 1e-6) { tb = x; fb = rr >= ll ? "R" : "L"; break; } }
    if (ta == null || tb == null) return { R: 0.5, L: 0.5 }; const wR0 = fa === "R" ? 1 : 0, wR1 = fb === "R" ? 1 : 0, wR = lerp(wR0, wR1, sstep(ta, tb, t)); return { R: wR, L: 1 - wR }; }
  // ── the pose at absolute time tAbs ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  poseAt(tAbs, ballLocal) {
    const E = this.E, R3 = E.R3, b = this.b, t = tAbs - this.tc, r = this.ref, rot = {};
    const feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, w = this.weights(t);
    // the centre of mass: the simulation's path pulled toward the loaded foot
    const S = this.rootSim(t), F = [w.R * feet.R.ank[0] + w.L * feet.L.ank[0], w.R * feet.R.ank[1] + w.L * feet.L.ank[1]], k = HB.comPull;
    let P = [S[0] + (F[0] - S[0]) * k, S[1] + (F[1] - S[1]) * k];
    const psi = this.pelvisYaw(t), tw = this.twist(t), sp = t > 0 ? this.speedAt(t) : 0, run = clamp(sp / 5.5, 0, 1), sg = this.sig;
    // flexion: deepest around the contact and through the rotation; lean: forward with the acceleration, roll into the turn
    const deep = sstep(this.T0 + 0.1, r.plant + 0.05, t) * (1 - sstep(this.path.Trot * 0.7, this.path.Trot + 0.35, t)), crouch = 0.025 + r.crouch * deep;
    const rotU = clamp(t / Math.max(0.1, this.path.Trot), 0, 1), roll = t > 0 ? sg * r.lean * DEG * Math.sin(Math.PI * rotU) : sg * 0.4 * r.lean * DEG * sstep(this.T0, 0, t);
    const lean = (4 + 7 * deep + 9 * run) * DEG;
    let pelvis = [0, b.pelvisY - 0.02 - crouch + 0.015 * run, 0.02 * run];
    // keep planted feet planted: move the pelvis (never the foot) when a planted leg would be out of reach, lower it a little if both are
    const c = Math.cos(psi), s = Math.sin(psi), toM = (q, Pr) => { const dx = q[0] - Pr[0], dy = q[1] - Pr[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
    // (both feet's corrections are computed from the same state and applied together: no left / right order — the mirror stays exact)
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wC = fX.planted ? 1 : fX.since != null ? Math.max(1 - s5(fX.since / 0.06), s5(1 - fX.until / 0.06)) : 0; if (wC <= 0) continue;
        const sx = X === "R" ? 1 : -1, hipM = [pelvis[0] + sx * b.hipX * Math.cos(tw * 0.3), pelvis[1], pelvis[2]], an = toM(fX.ank, P), d = Math.hypot(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = HB.reach * b.legLen;
        if (d > lim) { const ex = (d - lim) * wC, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = Math.hypot(hx, hz) || 1, dr = Math.min(0.05, ex * 0.5), ex2 = Math.max(0, ex - dr);
          const mx = hx / hl * ex2, mz = hz / hl * ex2; dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = Math.max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; }
    const Rp = R3.mul3(R3.y(tw * 0.25), R3.x(lean * 0.35), R3.z(-roll * 0.5)); rot.pelvis = Rp; rot.spine = R3.mul(R3.y(tw * 0.35), R3.x(lean * 0.3)); rot.chest = R3.mul3(R3.y(tw * 0.40), R3.x(lean * 0.35), R3.z(-roll * 0.3));
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [sx * b.hipX, 0, 0])), an = toM(ft.ank, P), yaw = wrapA(ft.yaw - psi), Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0)));
      let ps = yaw - tw * 0.25; ps = sx > 0 ? clamp(ps, -55 * DEG, 85 * DEG) : clamp(ps, -85 * DEG, 55 * DEG);
      const ik = E.r1LegIK(b, Rp, ps, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      rot["thigh_" + X] = ik.Rthigh; rot["shin_" + X] = ik.Rshin; rot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); rot["toe_" + X] = R3.x(-(ft.toe || 0)); }
    // arms: out for balance around the contact and the pivot (the arm on the outside of the turn swings across), counter-swing on the run
    const act = clamp(1 - Math.abs(t - 0.05) / 0.6, 0, 1), sw = (X) => { if (run < 0.05) return 0; const f = feet[X === "R" ? "L" : "R"]; return clamp(toM(f.ank, P)[2] * 1.4, -0.9, 0.9) * run; };
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, outside = sx === -sg ? 1 : 0, abd = 12 + 14 * act + 8 * act * outside, flex = -2 + 16 * act * outside * (t > 0 ? 1 : 0.4);
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-flex * DEG - sw(X) * 42 * DEG), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(30 + 50 * run + 10 * act) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    // head: a check toward the exit during the preparation, then the ball until the meeting, then ahead
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05], scan = Math.exp(-Math.pow((t - (this.T0 + 0.18)) / 0.10, 2));
    let look = ballLocal ? ballLocal.slice() : null; const exitPt = [this.path.endRoot[0] + dir(this.theta)[0] * 4, this.path.endRoot[1] + dir(this.theta)[1] * 4, 0.6];
    if (look && scan > 0.02) look = [lerp(look[0], exitPt[0], scan), lerp(look[1], exitPt[1], scan), lerp(look[2], exitPt[2], scan)];
    const tR = this.ev.rejoin != null ? this.ev.rejoin : 0.9; if (look && t > tR + 0.1) { const v = sstep(tR + 0.1, tR + 0.4, t); look = [lerp(look[0], P[0] + dir(psi)[0] * 4, v), lerp(look[1], P[1] + dir(psi)[1] * 4, v), lerp(look[2], 0.4, v)]; }
    if (look) { const q = toM(look, P), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -80 * DEG, 80 * DEG), pt = clamp(Math.atan2(-d[1], Math.hypot(d[0], d[2])), -55 * DEG, 60 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    const out = this.finish(P, psi, { rot, pelvisPos: pelvis }); out.S = P; out.psi = psi; out.feet = feet; out.w = w; out.twist = tw; out.crouch = crouch; return out;
  }
  finish(P, psi, pose) {
    const E = this.E, b = this.b, S0 = [40, 34], rootM = E.r1RootMatrix(S0[0] + P[0], S0[1] + P[1], psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0] - S0[0], -w[2] - S0[1], w[1]], t: [tp[0] - S0[0], -tp[2] - S0[1], tp[1]] }; }
    return { skin, J, pose };
  }
  // ── diagnostics (the human-motion metrics) ───────────────────────────────────────────────────────────────────────────────────────────────────
  diagnostics(ballAt) {
    const e = this.ev, res = { events: Object.assign({}, e), slip: { R: 0, L: 0, pivotR: 0, pivotL: 0 }, contactErr: null, reach: {} };
    // plant-foot slip from the POSED skeleton: a flat plant's ankle, a pivot's forefoot (MTP joint) must stay where they were
    const ref = { R: null, L: null }, dt = 1 / 120; let maxOver = 0;
    for (let t = this.T0 - 0.1; t <= 2.6; t += dt) { const po = this.poseAt(this.tc + t, ballAt ? ballAt(t) : null);
      for (const X of SIDES) { const f = po.feet[X]; if (!f.planted) { ref[X] = null; continue; } const key = f.pivot ? "pivot" + X : X, pt = f.pivot ? po.J["toe_" + X].j : po.J["foot_" + X].j;
        const id = f.pivot ? "p" + f.ballPt[0].toFixed(4) + f.ballPt[1].toFixed(4) : "f" + f.ank[0].toFixed(4) + f.ank[1].toFixed(4);
        if (!ref[X] || ref[X].id !== id) { ref[X] = { id, p: pt.slice() }; continue; } const d = Math.hypot(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1]); res.slip[key] = Math.max(res.slip[key], d); }
      // reach margin of planted legs (the IK target vs the leg length)
      for (const X of SIDES) { const f = po.feet[X]; if (!f.planted) continue; const th = po.J["thigh_" + X].j, an = po.J["foot_" + X].j, d = Math.hypot(an[0] - th[0], an[1] - th[1], an[2] - th[2]); maxOver = Math.max(maxOver, d / this.b.legLen); } }
    res.maxLegExtension = maxOver;
    // the rejoin (the authoritative carry launch at the meeting): the touching foot's POSED ankle vs its planned touch pose at that tick
    if (this.meet) { const tm = this.meet.t, X = SIDES.find((q) => this.seg[q].some((sg) => sg.touch && sg.t0 <= tm && sg.t1 >= tm)) || (this.meet.t < (this.ev.contactLand || 0) ? this.F : null);
      if (X) { const po = this.poseAt(this.tc + tm, ballAt ? ballAt(tm) : null), want = this.footAt(X, tm).ank, got = po.J["foot_" + X].j; res.rejoinFoot = X; res.rejoinPoseErr = Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]);
        res.rejoinReach = Math.hypot(want[0] - this.meet.ball[0], want[1] - this.meet.ball[1]); } }
    // the contact foot at the authoritative contact: the posed ankle vs the contact pose's ankle (which puts the surface on the ball)
    const pc = this.poseAt(this.tc, this.ballC), an = pc.J["foot_" + this.F].j; res.contactErr = Math.hypot(an[0] - this.cPose.ank[0], an[1] - this.cPose.ank[1], an[2] - this.cPose.ank[2]);
    // contact reach: the ball's distance from the centre of mass (horizontal) and the contact leg's extension (hip → ankle / leg length) at the contact tick
    { const th = pc.J["thigh_" + this.F].j; res.contactReach = { comToBall: Math.hypot(this.ballC[0] - pc.S[0], this.ballC[1] - pc.S[1]), legExtension: Math.hypot(an[0] - th[0], an[1] - th[1], an[2] - th[2]) / this.b.legLen }; }
    // rotation channels
    const yaw0 = this.pelvisYaw(this.T0), yawC = this.pelvisYaw(0), yawA = this.pelvisYaw(e.aligned != null ? e.aligned : this.path.Trot), deg = (x) => x / DEG;
    let maxSep = 0, shoulderPreMax = 0; for (let t = this.T0; t < this.path.Trot + 0.4; t += 0.01) { const tw = this.twist(t) * this.sig; maxSep = Math.max(maxSep, Math.abs(tw)); if (t < 0) shoulderPreMax = Math.max(shoulderPreMax, tw); }
    res.rotation = { total: deg(wrapA(this.theta - yaw0)), beforeContact: deg(yawC - yaw0), afterContact: deg(wrapA(this.theta - yawC)), shoulderBeforeContact: deg(yawC - yaw0 + this.twist(-0.01)), maxHipShoulderSeparation: deg(maxSep), maxHipRate: e.maxHipRate };
    // the centre of mass travel
    const p0 = this.poseAt(this.tc + this.T0, null).S, pC = this.poseAt(this.tc, null).S, pR = this.poseAt(this.tc + (e.rejoin != null ? e.rejoin : 0.8), null).S;
    res.com = { prep: Math.hypot(pC[0] - p0[0], pC[1] - p0[1]), toRejoin: Math.hypot(pR[0] - pC[0], pR[1] - pC[1]), minHeightDrop: this.ref.crouch + 0.025 };
    res.timing = { prepToContact: -this.T0, contactToAligned: e.aligned, contactToRejoin: e.rejoin, supportPlantBeforeContact: -e.supportPlant, contactLand: e.contactLand };
    return res;
  }
}

// ═══ receive_turn1/rt_body.js — RECEIVE-TURN-1: the PLACEHOLDER BODY of a receive-and-turn episode (presentation only) ════════════════════════════
// Shows what the simulation decided — never decides anything (the body is not in the ball's world: animation on / off cannot change the outcome).
// The authored action's timeline, from rt_sim's plan and episode:
//   READY        square to the passer, knees soft (the stationary start)
//   PREPARATION  during the ball's travel: the standing foot steps to its plant (the preparatory step that opens the "exit route"), the hips open
//                to the contact facing ψc, the shoulders lead a little further toward the exit, the head watches the ball
//   CONTACT      the contact foot swings in, meets the ball with the selected surface facing the impulse, draws back with it (the cushion)
//   ROTATION     the body pivots on the standing foot (its heel lifts, the foot turns with the body) toward the exit while the contact foot lands as
//                the first step on the new line
//   EXIT         steps along the actual run (the planned run + the correction he makes once he sees the real ball); the swing that reaches the
//                ball at the meeting plays it on (the continuation touch) — or, after a bad touch, the extra control touch and the turn out
// Built on RUN-1.3's skeleton tools (r1Body, r1LegIK, r1FK, r1RootMatrix) like RECEIVE-KILL's body; the root heading varies with time.
import { DT, R } from "./rk_model.js";
import { MOVE, DEG, clamp, s5, wrapA, dir, perp, toL2, runDist, sgnF } from "./rt_actions.js";
const SIDES = ["R", "L"], lerp = (a, b, t) => a + (b - a) * t, lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hdg = (v) => Math.atan2(v[1], v[0]), len2 = (v) => Math.hypot(v[0], v[1]);
export const TBODY = { ready: { width: 0.14, stagger: 0.02, toeOut: 8, crouch: 0.04 }, prepT: 0.55, stepLift: 0.07, swingLift: 0.09, give: 0.10, land: 0.20, ankleH: 0.088, runW: 0.09, cadence: [0.30, 0.22] };
export class TurnBody {
  // E: RUN1_V13; M4; skel; prep: rt_sim.prepareTurn(); ep: rt_sim.runTurn()
  constructor(E, M4, skel, prep, ep) {
    this.E = E; this.M4 = M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.prep = prep; this.ep = ep; this.fk = null;
    const A = prep.A; this.A = A; this.tc = prep.kc * DT; this.F = A.F; this.Fs = A.F === "R" ? "L" : "R";
    this.Tprep = Math.max(TBODY.prepT, 0.30 + Math.abs(A.psiC) / (MOVE.omegaPrep * DEG) + len2(A.S) / 2.2);
    // the impulse direction (the surface normal at the contact) and the contact pose
    const dv = A.dv, nI = len2(dv) > 1e-6 ? [dv[0] / len2(dv), dv[1] / len2(dv)] : dir(A.psiC); this.nImp = nI;
    this.cPose = this.contactFoot(A.F, A.surface, [A.C[0], A.C[1], R], nI);
    this.vOut = ep ? [ep.ex.v[0], ep.ex.v[1]] : A.vOut;
    this.buildRoot(); this.buildSteps();
  }
  // ── the contact foot's pose for surface s (local, absolute): ankle, yaw, pitch ───────────────────────────────────────────────────────────
  contactFoot(F, s, c, n) {
    const sg = sgnF(F), h = Math.max(0.10, c[2] - 0.03); let phi, ank, pitch = 4 * DEG;
    if (s === "INSIDE") { phi = hdg(n) + sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.045) - f[0] * 0.05, c[1] - n[1] * (R + 0.045) - f[1] * 0.05]; }
    else if (s === "OUTSIDE") { phi = hdg(n) - sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.04) - f[0] * 0.06, c[1] - n[1] * (R + 0.04) - f[1] * 0.06]; pitch = -6 * DEG; }
    else if (s === "SOLE") { phi = hdg(n) + Math.PI; ank = [c[0] - 0.02 * n[0], c[1] - 0.02 * n[1]]; pitch = 18 * DEG; return { ank: [ank[0], ank[1], c[2] + R + 0.06], yaw: phi, pitch }; }
    else { phi = hdg(n); ank = [c[0] - n[0] * (R + 0.06), c[1] - n[1] * (R + 0.06)]; pitch = -35 * DEG; }
    return { ank: [ank[0], ank[1], h], yaw: phi, pitch };
  }
  // ── the actual root path and heading (t relative to the contact) ─────────────────────────────────────────────────────────────────────────
  buildRoot() {
    const A = this.A, ep = this.ep, path = A.path; this.path = path;
    this.meet = ep && ep.meet && ep.m.cls !== "RECOVERY" && ep.m.cls !== "UNSTABLE" ? ep.meet : null; this.follow = ep && ep.follow ? ep.follow : null;
    if (this.follow) { const f = this.follow, tA = Math.max(MOVE.react + 0.10, path.Trot * 0.8); f.tA = tA; f.PA = path.rootAt(tA); f.psiA = path.psiAt(tA);
      const c = f.contact, d = [c[0] - f.stance[0], c[1] - f.stance[1]]; f.psiF = hdg([c[0] - f.PA[0], c[1] - f.PA[1]]); f.at = [c[0] - dir(f.psiF)[0] * 0.40, c[1] - dir(f.psiF)[1] * 0.40]; void d; }
  }
  rootAt(t) {
    const A = this.A, path = this.path;
    if (t <= 0) { const u = s5((t + this.Tprep) / (this.Tprep - 0.06)); return lerp2([0, 0], A.S, u); }
    if (this.follow) { const f = this.follow; if (t <= f.tA) return path.rootAt(t); const u = s5((t - f.tA) / Math.max(0.05, f.t - f.tA)); return lerp2(f.PA, f.at, u); }
    let P = path.rootAt(t);
    if (this.meet) { const m = this.meet, Rm = path.rootAt(m.t), corr = [m.Q[0] - Rm[0], m.Q[1] - Rm[1]];
      if (t <= m.t) { const u = s5((t - MOVE.react) / Math.max(0.05, m.t - MOVE.react)); return [P[0] + corr[0] * u, P[1] + corr[1] * u]; }
      return [P[0] + corr[0], P[1] + corr[1]]; }
    return P;
  }
  psiAt(t) {
    const A = this.A, path = this.path;
    if (t <= 0) { const u = s5((t + this.Tprep * 0.85) / (this.Tprep * 0.8)); return A.psiC * u; }
    if (this.follow) { const f = this.follow; if (t <= f.tA) return path.psiAt(t); const tb = f.tStable != null ? f.tStable : f.t + 0.5;
      const a = f.psiA + wrapA(f.psiF - f.psiA) * s5((t - f.tA) / Math.max(0.05, f.t - f.tA)); if (t <= tb) return a; return a + wrapA(A.theta - a) * s5((t - tb) / 0.45); }
    return path.psiAt(t);
  }
  speedAt(t) { if (this.follow) { const f = this.follow; if (t > f.tA && t < (f.tStable != null ? f.tStable : f.t + 0.5) + 0.3) return 0.8; } return this.path.speedAt(t); }
  // ── the footfalls: the standing foot's preparation step and pivot, the contact foot's landing, then alternating steps along the run ──────────
  buildSteps() {
    const A = this.A, F = this.F, Fs = this.Fs, rd = TBODY.ready, T = -this.Tprep, wR = (Fx) => sgnF(Fx) * rd.width;
    const plant = (Fx, P, psi, w) => { const p = toL2(P, psi, Fx === "R" ? rd.stagger : -rd.stagger, w != null ? w : wR(Fx)); return { pos: p, yaw: psi + sgnF(Fx) * rd.toeOut * DEG }; };
    const ev = { R: [], L: [] };   // per foot: a list of { t0, t1, from, to, yaw0, yaw1, kind } segments (t1 = landing); between segments the foot is planted
    const ready = { R: plant("R", [0, 0], 0), L: plant("L", [0, 0], 0) };
    // the standing foot's preparation step: lift at T + 0.05, plant at −0.22 (well before the contact: the support is set)
    const sPlant = { pos: A.stand.slice(), yaw: A.psiC + sgnF(Fs) * rd.toeOut * DEG };
    ev[Fs].push({ t0: T + 0.05, t1: Math.min(-0.22, T + 0.05 + 0.32), from: ready[Fs], to: sPlant, kind: "prep" });
    // the contact foot: from its ready plant (it may shuffle with the root first) through the CONTACT pose at 0, then the follow-through and landing
    const land = TBODY.land, landT = land, Pl = this.rootAt(landT), psl = this.psiAt(landT);
    const lPos = toL2(Pl, psl, 0.18, sgnF(F) * TBODY.runW); this.cLand = { pos: lPos, yaw: psl + sgnF(F) * 4 * DEG };
    ev[F].push({ t0: -0.30, t1: landT, from: ready[F], to: this.cLand, kind: "contact" });
    // the pivot: the standing foot stays planted, turning with the body until it lifts for its first running step
    this.pivot = { F: Fs, until: landT + 0.06 };
    // the run: alternate steps from the contact foot's landing (plants along the actual root path)
    let tPrev = landT, side = Fs, last = { [F]: this.cLand, [Fs]: sPlant }, tEnd = 3.2;
    const meetT = this.meet ? this.meet.t : null; let meetDone = false;
    while (tPrev < tEnd) {
      const v = this.speedAt(tPrev + 0.1), dT = clamp(lerp(TBODY.cadence[0], TBODY.cadence[1], v / 6), TBODY.cadence[1], TBODY.cadence[0]), t1 = tPrev + dT, P = this.rootAt(t1), ps = this.psiAt(t1);
      const lead = 0.10 + 0.05 * Math.min(6, this.speedAt(t1)), to = { pos: toL2(P, ps, lead, sgnF(side) * TBODY.runW), yaw: ps + sgnF(side) * 3 * DEG }, seg = { t0: tPrev - 0.04, t1, from: last[side], to, kind: "run" };
      if (meetT != null && !meetDone && t1 >= meetT - 0.02) { seg.touch = { t: meetT, at: this.meet.ball }; meetDone = true; }
      if (this.follow && !seg.ctrl && seg.t0 <= this.follow.t && t1 >= this.follow.t) seg.ctrl = this.follow;
      ev[side].push(seg); last[side] = to; tPrev = t1; side = side === "R" ? "L" : "R";
    }
    this.ev = ev; this.ready = ready;
  }
  footAt(Fx, t) {
    const L = this.ev[Fx]; let planted = this.ready[Fx], lift = 0;
    for (const s of L) {
      if (t < s.t0) break;
      if (t >= s.t1) { planted = s.to; continue; }
      const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
      if (s.kind === "contact") return this.contactSwing(s, t);
      let p = lerp2(s.from.pos, s.to.pos, s5(u)), yaw = s.from.yaw + wrapA(s.to.yaw - s.from.yaw) * s5(u), h = TBODY.ankleH + (s.kind === "prep" ? TBODY.stepLift : TBODY.swingLift) * Math.sin(Math.PI * u), pitch = 0;
      if (s.touch) { const w = Math.exp(-Math.pow((t - s.touch.t) / 0.07, 2)); p = lerp2(p, [s.touch.at[0] - dir(yaw)[0] * 0.16, s.touch.at[1] - dir(yaw)[1] * 0.16], w * 0.85); h = lerp(h, TBODY.ankleH + 0.03, w); }
      if (s.ctrl) { const c = this.cPoseFollow || (this.cPoseFollow = this.contactFoot(s.ctrl.surface && s.ctrl.surface.indexOf("_L") > 0 ? "L" : "R", "INSIDE", s.ctrl.contact, (() => { const d = [s.ctrl.contact[0] - s.ctrl.at[0], s.ctrl.contact[1] - s.ctrl.at[1]], l = len2(d) || 1; return [-d[0] / l, -d[1] / l]; })()));
        const w = Math.exp(-Math.pow((t - s.ctrl.t) / 0.10, 2)); p = lerp2(p, [c.ank[0], c.ank[1]], w); h = lerp(h, c.ank[2], w); yaw = yaw + wrapA(c.yaw - yaw) * w; }
      return { ank: [p[0], p[1], h], yaw, pitch };
    }
    // planted (the standing foot pivots with the body until it lifts: heel up, the foot turning about its ball)
    if (Fx === this.pivot.F && t > -0.22 && t < this.pivot.until + 0.3) { const L2 = this.ev[Fx], next = L2.find((s) => s.kind === "run"); if (!next || t < next.t0) {
      const psi = this.psiAt(t), w = clamp(t / 0.25, 0, 1), yaw = planted.yaw + wrapA(psi + sgnF(Fx) * 6 * DEG - planted.yaw) * (t > 0 ? s5(clamp(t / Math.max(0.1, this.path.Trot), 0, 1)) : 0);
      return { ank: [planted.pos[0], planted.pos[1], TBODY.ankleH + 0.035 * w * (t > 0 ? 1 : 0)], yaw, pitch: 0, toe: 0.35 * w * (t > 0 ? 1 : 0) }; } }
    return { ank: [planted.pos[0], planted.pos[1], TBODY.ankleH], yaw: planted.yaw, pitch: 0 };
  }
  // the contact foot: lift from the ready plant, swing to meet the ball (a little ahead of the contact pose), draw back with it at the CONTACT,
  // follow through with the ball's new direction, land as the first step of the exit
  contactSwing(s, t) {
    const C = this.cPose, n = this.nImp, vo = this.vOut, vl = len2(vo) || 1, vh = [vo[0] / vl, vo[1] / vl];
    const meetP = [C.ank[0] + n[0] * 0.07, C.ank[1] + n[1] * 0.07], give = [C.ank[0] + vh[0] * TBODY.give, C.ank[1] + vh[1] * TBODY.give];
    if (t <= -0.07) { const u = s5((t - s.t0) / (-0.07 - s.t0)), p = lerp2(s.from.pos, meetP, u); return { ank: [p[0], p[1], TBODY.ankleH + 0.06 * Math.sin(Math.PI * u) + (C.ank[2] - TBODY.ankleH) * u], yaw: s.from.yaw + wrapA(C.yaw - s.from.yaw) * u, pitch: C.pitch * u }; }
    if (t <= 0) { const u = s5((t + 0.07) / 0.07), p = lerp2(meetP, C.ank, u); return { ank: [p[0], p[1], C.ank[2]], yaw: C.yaw, pitch: C.pitch }; }
    if (t <= 0.08) { const u = s5(t / 0.08), p = lerp2(C.ank, give, u); return { ank: [p[0], p[1], C.ank[2] + 0.01 * u], yaw: C.yaw, pitch: C.pitch * (1 - u) }; }
    const u = s5((t - 0.08) / (s.t1 - 0.08)), p = lerp2(give, s.to.pos, u); return { ank: [p[0], p[1], TBODY.ankleH + 0.07 * Math.sin(Math.PI * u) + (C.ank[2] - TBODY.ankleH) * (1 - u)], yaw: C.yaw + wrapA(s.to.yaw - C.yaw) * u, pitch: 0 };
  }
  // ── the pose at absolute time tAbs (s): root, feet by IK, pelvis / trunk / arms / head ────────────────────────────────────────────────────────
  poseAt(tAbs, ballLocal) {
    const E = this.E, R3 = E.R3, b = this.b, t = tAbs - this.tc, P = this.rootAt(t), psi = this.psiAt(t), A = this.A, rot = {}, rd = TBODY.ready;
    const sp = t > 0 ? this.speedAt(t) : 0, run = clamp(sp / 5.5, 0, 1), active = clamp(1 - Math.abs(t) / 0.5, 0, 1);
    let pelvis = [0, b.pelvisY - 0.03 - rd.crouch - 0.035 * active + 0.02 * run, 0.03 * run], lean = (4 + 10 * run) * DEG, arms = { abd: 14 + 22 * active, flex: -4, elbow: 36 + 30 * run };
    // shoulders lead toward the exit during the preparation, the hips follow after the contact
    const lead = t < 0.25 ? clamp(wrapA(A.theta - psi) * 0.22, -35 * DEG, 35 * DEG) * clamp((t + this.Tprep) / this.Tprep, 0, 1) : 0, twist = lead;
    const feet = { R: this.footAt("R", t), L: this.footAt("L", t) };
    const c = Math.cos(psi), s = Math.sin(psi), rl = (q) => { const dx = q[0] - P[0], dy = q[1] - P[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
    const Rp = R3.mul(R3.y(twist * 0.3), R3.x(lean * 0.35)); rot.pelvis = Rp; rot.spine = R3.mul(R3.y(twist * 0.35), R3.x(lean * 0.3)); rot.chest = R3.mul(R3.y(twist * 0.35), R3.x(lean * 0.35));
    for (const X of SIDES) { const sg = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [sg * b.hipX, 0, 0])), an = rl(ft.ank), yaw = wrapA(ft.yaw - psi), Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0) - (ft.toe || 0)));
      let ps = yaw - twist * 0.3; ps = sg > 0 ? clamp(ps, -50 * DEG, 80 * DEG) : clamp(ps, -80 * DEG, 50 * DEG);
      const ik = E.r1LegIK(b, Rp, ps, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      rot["thigh_" + X] = ik.Rthigh; rot["shin_" + X] = ik.Rshin; rot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); rot["toe_" + X] = R3.x(-(ft.toe || 0) * 0.8); }
    // arms: abducted for balance around the contact and the pivot; a counter-swing to the legs on the run
    const swing = (X) => { if (run < 0.05) return 0; const f = feet[X === "R" ? "L" : "R"]; const d = rl(f.ank)[2]; return clamp(d * 1.4, -0.9, 0.9) * run; };
    for (const X of SIDES) { const sg = X === "R" ? 1 : -1; rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sg * arms.abd * DEG), R3.x(-arms.flex * DEG - swing(X) * 40 * DEG), R3.y(-sg * 6 * DEG)); rot["foreArm_" + X] = R3.x(-arms.elbow * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sg * 6 * DEG)); }
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05];
    const look = ballLocal && t < 0.9 ? ballLocal : ballLocal ? [P[0] + dir(psi)[0] * 3, P[1] + dir(psi)[1] * 3, 0.3] : null;
    if (look) { const q = rl(look), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], Math.hypot(d[0], d[2])), -55 * DEG, 60 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Q); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    const out = this.finish(P, psi, { rot, pelvisPos: pelvis }); out.S = P; out.psi = psi; out.feet = feet; return out;
  }
  finish(P, psi, pose) {
    const E = this.E, b = this.b, S0 = [40, 34], rootM = E.r1RootMatrix(S0[0] + P[0], S0[1] + P[1], psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0] - S0[0], -w[2] - S0[1], w[1]], t: [tp[0] - S0[0], -tp[2] - S0[1], tp[1]] }; }
    return { skin, J, pose };
  }
}

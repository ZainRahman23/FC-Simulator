// ═══ receive11/rx_body.js — RECEIVE-CONTROL-1.1: the PLACEHOLDER BODY of an authored receive action (presentation only) ════════════════════════
// Shows what the simulation decided — never decides anything. Inputs are the action's authoritative data: the root path (position, facing), the
// footwork (touchdowns, the standing foot's plant and pivot, the contact foot's swing through the CONTACT marker with the selected surface presented
// to the ball), the handoff state. Built from RUN-1.3's own pieces: its upper-body motion (r1Pose at the gait's phase, damped toward a ready
// stance when slow), its leg IK (r1LegIK) and FK (r1FK) — the skeleton conventions of TURN-1.2's t1Pose. It blends in from TURN-1.2's pose at the
// action start and out into TURN-1.2's pose at the handoff (the actor DRIBBLE-V1 continues with). Production animation replaces this file; the
// contract it fulfils is review_artifacts/receive11/RECEIVE11_ANIMATION_CONTRACT.md.
import { wrapA, clamp, s5, fwd, rgt, toPitch, toLocal, sideOf, other, DEG } from "./rx_actions.js";
import { boneFramesOf } from "./rx_core.js";
const DT = 1 / 240, R = 0.11, SIDES = ["R", "L"];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// rotations (row-major 3×3, RUN-1.3's R3 convention): log / exp / slerp
const mm = (A, B) => [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8], A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8], A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
const tr = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
function rlog(Rm) { const c = clamp((Rm[0] + Rm[4] + Rm[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0]; if (Math.PI - a < 1e-6) { const x = Math.sqrt(Math.max(0, (Rm[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (Rm[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (Rm[8] + 1) / 2)); return [x * a, (Rm[1] >= 0 ? 1 : -1) * y * a, (Rm[2] >= 0 ? 1 : -1) * z * a]; } const k = a / (2 * Math.sin(a)); return [(Rm[7] - Rm[5]) * k, (Rm[2] - Rm[6]) * k, (Rm[3] - Rm[1]) * k]; }
function rexp(r) { const a = Math.hypot(r[0], r[1], r[2]); if (a < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1]; const x = r[0] / a, y = r[1] / a, z = r[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c; return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
const slerp = (A, B, t) => { if (t <= 0) return A; if (t >= 1) return B; const d = rlog(mm(tr(A), B)); return mm(A, rexp([d[0] * t, d[1] * t, d[2] * t])); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const blendPose = (A, B, t) => { if (t <= 0) return A; if (t >= 1) return B; const rot = {}; for (const k of Object.keys(B.rot)) rot[k] = A.rot[k] ? slerp(A.rot[k], B.rot[k], t) : B.rot[k]; return { rot, pelvisPos: lerp3(A.pelvisPos, B.pelvisPos, t) }; };
// cubic Hermite in 2D (positions, endpoint velocities) on [0, 1] with duration T
const hermP = (p0, v0, p1, v1, T, u) => { const u2 = u * u, u3 = u2 * u, a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, d = u3 - u2; return [a * p0[0] + b * T * v0[0] + c * p1[0] + d * T * v1[0], a * p0[1] + b * T * v0[1] + c * p1[1] + d * T * v1[1]]; };
export const BODY = { ankleH: 0.088, swingLift: [0.07, 0.12], width: [0.15, 0.07], toeOut: 7, pivotK: 0.85, crouchIn: 0.25, blendIn: 0.1, blendOut: 0.14, ready: { width: 0.17, stagger: 0.06, drop: 0.05 }, contactLift: 0.015, follow: 1.2 };
export class RxBody {
  constructor(sim) { this.sim = sim; this.E = sim.E; this.T1 = sim.T1; this.M4 = sim.cfg.M4; this.body = sim.A.body; this.fkBuf = null; }
  // ── the ready stance (a standing receiver before his action): both feet planted, knees soft, arms relaxed ─────────────────────────────────────
  readyFeet(P, psi) { const rd = BODY.ready; return { R: { pos: toPitch(P, psi, rd.stagger, rd.width), yaw: psi + BODY.toeOut * DEG }, L: { pos: toPitch(P, psi, -rd.stagger * 0.3, -rd.width), yaw: psi - BODY.toeOut * DEG } }; }
  ready(rd, k) { const feet = this.readyFeet(rd.P, rd.psi), f = (F) => ({ ank: [feet[F].pos[0], BODY.ankleH, feet[F].pos[1]], yaw: feet[F].yaw, pitch: 0, toe: 0 });
    return this.compose({ P: rd.P, V: [0, 0], psi: rd.psi, acc: [0, 0] }, { R: f("R"), L: f("L") }, { u: 0, run: 0, crouch: BODY.ready.drop, gaze: null }); }
  // ── the action's footwork in the world: every stance (plant, yaw, pivot) and swing (from lift-off to the next plant, through the CONTACT marker) ─
  begin(act) {
    const sim = this.sim, A = sim.A, st = act.steps.steps, m = act.steps.m, h = act.steps.h, root = (t) => sim.rootAt(act, act.k0 + Math.round(t / DT));
    act.poseStart = A.pose && !act.stand ? { rot: Object.assign({}, A.pose.rot), pelvisPos: A.pose.pelvisPos.slice() } : null;
    // initial conditions of both feet
    const init = {};
    if (act.stand) { const rf = this.readyFeet(act.P0, act.psi0); for (const F of SIDES) init[F] = { plant: rf[F], since: -1 }; }
    else for (const F of SIDES) { const L = A.legs[F];
      if (L.stance) init[F] = { plant: { pos: L.plant.pos.slice(), yaw: L.plant.yaw }, since: L.tTD - A.t };
      else { const fr = sim.framesPrev["foot_" + F]; init[F] = { air: [fr.p[0], fr.p[1], -fr.p[2]], yaw: L._yawW != null ? L._yawW : A.psi }; } }
    // the stances (touchdown index i: foot, start, end, plant, yaw, pivot)
    const S = [], wid = (sp) => BODY.width[0] + (BODY.width[1] - BODY.width[0]) * sstep(1.5, 4.5, sp);
    for (let i = 0; i < st.length; i++) { const s = st[i], tm = s.t + Math.min(s.d, 0.4) / 2, q = root(Math.max(0, tm)), sp = Math.hypot(q.V[0], q.V[1]), hd = sp > 1.2 ? Math.atan2(q.V[1], q.V[0]) : q.psi, sg = sideOf(s.F);
      let pos, yaw;
      if (i === 0 && !act.stand && init[s.F].plant) { pos = init[s.F].plant.pos; yaw = init[s.F].plant.yaw; }
      else if (i === m) { pos = act.Spl.slice(); yaw = act.ySpl; }
      else if (h != null && i === h && act.A1) { pos = act.A1.legs[s.F].plant.pos.slice(); yaw = act.A1.legs[s.F].plant.yaw; }
      else if (h != null && i === h - 1 && act.A1) { pos = act.A1.legs[s.F].prevPlant.pos.slice(); yaw = act.A1.legs[s.F].prevPlant.yaw; }
      else { pos = toPitch(q.P, hd, 0, sg * wid(sp)); yaw = q.psi + sg * BODY.toeOut * DEG; }
      S.push({ i, F: s.F, t0: s.t, t1: s.t + s.d, pos, yaw, pivot: i === m || (act.fam.kind === "turning" && i === m + 1) });
    }
    // a standing receiver's feet stay planted (ready stance) until their first step
    if (act.stand) for (const F of SIDES) { const first = S.find((x) => x.F === F); if (!first || first.i !== 0) S.unshift({ i: -1, F, t0: -10, t1: first ? Math.max(act.tS + 0.02, first.t0 - 0.3) : 99, pos: init[F].plant.pos, yaw: init[F].plant.yaw, pivot: false }); else first.pos = init[F].plant.pos, first.yaw = init[F].plant.yaw, first.t0 = -10; }
    if (act.hold) { const last = {}; for (const s of S) last[s.F] = s; for (const F of SIDES) if (last[F]) last[F].t1 = 99; }
    act.body = { S, init, contact: this.contactPose(act) };
    act.poseEnd = act.A1 ? this.handoffPose(act) : null;
  }
  retarget(act) { if (act.body) { const S = act.body.S, h = act.steps.h; for (const s of S) { if (s.i === h) { s.pos = act.A1.legs[s.F].plant.pos.slice(); s.yaw = act.A1.legs[s.F].plant.yaw; } if (s.i === h - 1) { s.pos = act.A1.legs[s.F].prevPlant.pos.slice(); s.yaw = act.A1.legs[s.F].prevPlant.yaw; } } act.poseEnd = this.handoffPose(act); } }
  end() {}
  // TURN-1.2's pose of the handoff actor (its local rotations) — the pose the action blends into
  handoffPose(act) { const A1 = act.A1, p = this.T1.t1Pose(A1); return { rot: p.rot, pelvisPos: p.pelvisPos.slice() }; }
  // the contact foot at the CONTACT marker: the selected surface on the ball (ankle position, yaw, pitch), its follow-through direction
  contactPose(act) {
    const sg = sideOf(act.F), y = act.yawF, c = act.c, f = fwd(y), side = rgt(y);
    let ank, pitch = 0;
    if (act.surface === "INSIDE") { const n = [-sg * side[0], -sg * side[1]]; ank = [c[0] - n[0] * (R + 0.045) - f[0] * 0.05, c[1] - n[1] * (R + 0.045) - f[1] * 0.05]; pitch = 6 * DEG; }   // the medial side faces the ball
    else if (act.surface === "OUTSIDE") { const n = [sg * side[0], sg * side[1]]; ank = [c[0] - n[0] * (R + 0.04) - f[0] * 0.06, c[1] - n[1] * (R + 0.04) - f[1] * 0.06]; pitch = -8 * DEG; }
    else if (act.surface === "LACES") { ank = [c[0] - f[0] * (R + 0.05), c[1] - f[1] * (R + 0.05)]; pitch = -38 * DEG; }
    else { ank = [c[0] - f[0] * 0.07, c[1] - f[1] * 0.07]; pitch = 22 * DEG; }   // SOLE: the sole on the ball
    const hgt = act.surface === "LACES" ? 0.15 : act.surface === "SOLE" ? R * 2 + 0.03 : BODY.ankleH + BODY.contactLift;
    const n = Math.hypot(act.ideal.vOut[0] - act.vin[0], act.ideal.vOut[1] - act.vin[1]) > 0.3 ? [(act.ideal.vOut[0] - act.vin[0]), (act.ideal.vOut[1] - act.vin[1])] : act.ideal.vOut, nl = Math.hypot(n[0], n[1]) || 1;
    const vF = act.fam.id === "CUSHION" ? [act.vin[0] * 0.18, act.vin[1] * 0.18] : [n[0] / nl * BODY.follow, n[1] / nl * BODY.follow];   // the foot gives with a cushion, follows through the impulse otherwise
    return { ank, h: hgt, yaw: y, pitch, vF };
  }
  // ── the pose at tick k of the action ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  poseAt(act, k) {
    const sim = this.sim, t = (k - act.k0) * DT, q = sim.rootAt(act, k), qa = sim.rootAt(act, k - 14), qb = sim.rootAt(act, k + 14), acc = [(qb.V[0] - qa.V[0]) / (28 * DT), (qb.V[1] - qa.V[1]) / (28 * DT)];
    const feet = {}; for (const F of SIDES) feet[F] = this.footAt(act, F, t, q);
    const sp = Math.hypot(q.V[0], q.V[1]), tc = act.Tp, crouch = (act.fam.crouch || 0.04) * sstep(tc - 0.45, tc - 0.1, t) * (1 - sstep(tc + 0.15, tc + 0.45, t)) + (act.stand ? BODY.ready.drop * (1 - sstep(act.tS, act.tS + 0.3, t)) : 0);
    const gaze = t < tc + 0.05 ? (() => { const b = sim.W.ball; return Math.atan2(b.p[2] - q.P[1], b.p[0] - q.P[0]); })() : act.thX;
    let pose = this.compose(q, feet, { u: this.phaseAt(act, t), run: sstep(1.0, 3.5, sp), crouch, gaze, acc, twist: this.twistAt(act, t) }, true);
    // blends: in from TURN-1.2's pose at the start, out into the handoff actor's pose
    if (act.poseStart && t < BODY.blendIn) pose = blendPose(act.poseStart, pose, s5(t / BODY.blendIn));
    if (act.poseEnd && act.kh != null) { const tH = (act.kh - act.k0) * DT; if (t > tH - BODY.blendOut) pose = blendPose(pose, act.poseEnd, s5((t - (tH - BODY.blendOut)) / BODY.blendOut)); }
    return this.finish(q, pose);
  }
  // the gait phase for the upper body (RUN-1: u = 0 at the right touchdown, 0.5 at the left), from the footwork
  phaseAt(act, t) { const S = act.body.S.filter((s) => s.i >= 0); let a = null, b = null; for (const s of S) { if (s.t0 <= t) a = s; else { b = s; break; } }
    if (!a) return 0; const ua = a.F === "R" ? 0 : 0.5; if (!b) return ua; return ua + 0.5 * clamp((t - a.t0) / Math.max(0.05, b.t0 - a.t0), 0, 1); }
  // the pelvis turns toward the contact foot while it is presented (hip opens for an inside / outside contact)
  twistAt(act, t) { const yRel = wrapA(act.yawF - act.psiC), w = sstep(act.Tp - 0.25, act.Tp - 0.05, t) * (1 - sstep(act.Tp + 0.05, act.Tp + 0.3, t)); return clamp(0.35 * yRel, -30 * DEG, 30 * DEG) * w; }
  // ── a foot at time t: planted (fixed or pivoting on the forefoot) or swinging (lift-off → next plant, through the contact for the contact foot) ──
  footAt(act, F, t, q) {
    const B = act.body, S = B.S.filter((s) => s.F === F), aH = BODY.ankleH;
    for (const s of S) if (t >= s.t0 && t <= s.t1) return this.stanceFoot(act, s, t);
    // swinging: the previous stance (or the initial air state) → the next stance
    let prev = null, next = null; for (const s of S) { if (s.t1 < t) prev = s; else if (s.t0 > t) { next = s; break; } }
    const from = prev ? Object.assign(this.stanceFoot(act, prev, prev.t1), { t: prev.t1 }) : B.init[F] && B.init[F].air ? { ank: B.init[F].air, yaw: B.init[F].yaw, pitch: -20 * DEG, t: 0 } : { ank: [q.P[0], aH, q.P[1]], yaw: q.psi, pitch: 0, t: 0 };
    const to = next ? Object.assign(this.stanceFoot(act, next, next.t0), { t: next.t0 }) : { ank: [q.P[0], aH, q.P[1]], yaw: q.psi, pitch: 0, t: t + 0.1 };
    const C = B.contact, isC = F === act.F && from.t <= act.Tp + 1e-9 && to.t >= act.Tp - 1e-9;
    const sp = Math.hypot(q.V[0], q.V[1]), lift = BODY.swingLift[0] + (BODY.swingLift[1] - BODY.swingLift[0]) * sstep(1.5, 5, sp);
    if (!isC) { const w = clamp((t - from.t) / Math.max(1e-3, to.t - from.t), 0, 1), u = s5(w), p = [from.ank[0] + (to.ank[0] - from.ank[0]) * u, from.ank[2] + (to.ank[2] - from.ank[2]) * u];
      const hy = from.ank[1] + (to.ank[1] - from.ank[1]) * u + lift * Math.pow(Math.sin(Math.PI * w), 0.8);
      return { ank: [p[0], hy, p[1]], yaw: from.yaw + wrapA(to.yaw - from.yaw) * s5((w - 0.15) / 0.7), pitch: (1 - w) * (1 - w) * -28 * DEG + w * w * 8 * DEG, toe: (1 - w) * 20 * DEG }; }
    // the contact swing: lift-off → CONTACT (the surface on the ball at the marker, moving through the impulse) → its landing
    const tc = act.Tp, cA = [C.ank[0], C.ank[1]];
    if (t <= tc) { const T = Math.max(0.05, tc - from.t), w = clamp((t - from.t) / T, 0, 1), p = hermP([from.ank[0], from.ank[2]], [0, 0], cA, C.vF, T, w);
      const hy = from.ank[1] + (C.h - from.ank[1]) * s5(w) + lift * 0.8 * Math.pow(Math.sin(Math.PI * w), 1.2), yw = from.yaw + wrapA(C.yaw - from.yaw) * s5(w / 0.75), pt = from.pitch + (C.pitch - from.pitch) * s5(w / 0.8);
      return { ank: [p[0], hy, p[1]], yaw: yw, pitch: pt, toe: 0 }; }
    const T = Math.max(0.05, to.t - tc), w = clamp((t - tc) / T, 0, 1), p = hermP(cA, C.vF, [to.ank[0], to.ank[2]], [0, 0], T, w);
    const hy = C.h + (to.ank[1] - C.h) * s5(w) + lift * 0.6 * Math.pow(Math.sin(Math.PI * w), 1.2);
    return { ank: [p[0], hy, p[1]], yaw: C.yaw + wrapA(to.yaw - C.yaw) * s5(w), pitch: C.pitch + (to.pitch - C.pitch) * s5(w), toe: 0 };
  }
  stanceFoot(act, s, t) {
    const aH = BODY.ankleH; let yaw = s.yaw, ank = [s.pos[0], aH, s.pos[1]], pitch = 0;
    if (s.pivot && s.t1 - s.t0 > 0.08) { const q = this.sim.rootAt(act, act.k0 + Math.round(Math.min(t, s.t1) / DT)), want = q.psi + sideOf(s.F) * BODY.toeOut * DEG, dy = wrapA(want - s.yaw) * BODY.pivotK, u = s5((t - s.t0) / (s.t1 - s.t0));
      yaw = s.yaw + dy * u; const fp = fwd(s.yaw), pv = [s.pos[0] + fp[0] * 0.13, s.pos[1] + fp[1] * 0.13], fy = fwd(yaw); ank = [pv[0] - fy[0] * 0.13, aH + 0.02 * Math.sin(Math.PI * u), pv[1] - fy[1] * 0.13]; pitch = -10 * DEG * Math.sin(Math.PI * u); }
    else { const w = (t - s.t0) / Math.max(0.05, s.t1 - s.t0); if (s.t1 - s.t0 < 2 && w > 0.6) pitch = -22 * DEG * sstep(0.6, 1, w); }   // heel rise before the lift-off
    return { ank, yaw, pitch, toe: pitch < 0 ? -pitch * 0.6 : 0 };
  }
  // ── the skeleton pose from the root, both feet and the upper-body state (t1Pose's conventions: root-local x right, y up, z forward) ────────────
  compose(q, feet, o, raw) {
    const E = this.E, R3 = E.R3, b = this.body, sp = Math.hypot(q.V[0], q.V[1]), p = E.r1GaitAt(b, E.RUN1.ref, clamp(Math.max(sp, 2.5), 2.5, 9.5)), u = o.u || 0;
    const base = E.r1Pose({ body: b, p, accLean: 0 }, u, null), rot = base.rot, run = o.run;
    // upper body: RUN-1's motion × run, toward a ready stance when slow
    const ready = this.readyUpper(R3);
    for (const k of ["spine", "chest", "neck", "head", "clavicle_R", "clavicle_L", "upperArm_R", "upperArm_L", "foreArm_R", "foreArm_L", "hand_R", "hand_L"]) rot[k] = slerp(ready[k], rot[k], run);
    // pelvis: RUN-1's oscillation × run, the lean from the root's acceleration (forward / lateral), the twist toward the contact, the crouch
    const f = fwd(q.psi), r = rgt(q.psi), acc = o.acc || [0, 0], aF = acc[0] * f[0] + acc[1] * f[1], aL = acc[0] * r[0] + acc[1] * r[1];
    const leanF = clamp(Math.atan2(aF, 9.81) * 0.6, -14 * DEG, 18 * DEG), leanL = clamp(Math.atan2(aL, 9.81) * 0.7, -22 * DEG, 22 * DEG);
    const Rp = R3.mul3(R3.y(o.twist || 0), R3.mul(R3.z(-leanL * 0.6), R3.x(leanF * 0.5 + 4 * DEG * (1 - run))), slerp(R3.x(6 * DEG), base.pel.R, run));
    rot.pelvis = Rp; rot.spine = R3.mul(R3.x(leanF * 0.3), rot.spine); rot.chest = R3.mul(R3.mul(R3.z(-leanL * 0.4), R3.x(leanF * 0.3)), rot.chest);
    const yRun = base.pel.pos[1], yStand = b.pelvisY - 0.03; let pelvisPos = [base.pel.pos[0] * run, yStand + (yRun - yStand) * run - (o.crouch || 0), 0];
    // legs: IK to the feet (root-local); a planted foot beyond the leg's reach lowers the pelvis (bounded), never slides
    const loc = (w) => { const d = [w[0] - q.P[0], w[2] - q.P[1]]; return [d[0] * r[0] + d[1] * r[1], w[1], d[0] * f[0] + d[1] * f[1]]; };
    let drop = 0; for (const F of SIDES) { const sg = sideOf(F), hip = E.RV.add(pelvisPos, R3.v(Rp, [sg * b.hipX, 0, 0])), an = loc(feet[F].ank), d = E.RV.len(E.RV.sub(an, hip)), lim = (b.thigh + b.shank) * 0.985; if (d > lim) { const dx = an[0] - hip[0], dz = an[2] - hip[2], dyMax = Math.sqrt(Math.max(0, lim * lim - dx * dx - dz * dz)); drop = Math.max(drop, Math.min(0.12, (hip[1] - an[1]) - dyMax)); } }
    pelvisPos[1] -= drop;
    for (const F of SIDES) { const sg = sideOf(F), ft = feet[F], hip = E.RV.add(pelvisPos, R3.v(Rp, [sg * b.hipX, 0, 0])), an = loc(ft.ank), yawL = wrapA(ft.yaw - q.psi);
      const Rf = R3.mul(R3.y(yawL), R3.x(-ft.pitch)); let psi = yawL - (base.pel.yaw || 0) * run - (o.twist || 0); psi = sg > 0 ? clamp(psi, -45 * DEG, 60 * DEG) : clamp(psi, -60 * DEG, 45 * DEG);
      const ik = E.r1LegIK(b, Rp, psi, hip, an), Rshin = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rshin), Rf));
      rot["thigh_" + F] = ik.Rthigh; rot["shin_" + F] = ik.Rshin; rot["foot_" + F] = R3.yxz(fl[0], fl[1], fl[2]); rot["toe_" + F] = R3.x(ft.toe || 0); }
    // head: toward the gaze (the ball before the contact, the exit after), the neck taking 40 %
    if (o.gaze != null) { const Rch = R3.mul3(Rp, rot.spine, rot.chest), gz = clamp(wrapA(o.gaze - q.psi), -70 * DEG, 70 * DEG), want = R3.mul(R3.y(gz), R3.x(12 * DEG)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Q); }
    const pose = { rot, pelvisPos, p, u };
    return raw ? pose : this.finish(q, pose);
  }
  readyUpper(R3) { if (this._ready) return this._ready; const D = DEG, o = { spine: R3.x(4 * D), chest: R3.x(5 * D), neck: R3.x(4 * D), head: R3.x(6 * D), clavicle_R: R3.I(), clavicle_L: R3.I(), hand_R: R3.mul(R3.x(-8 * D), R3.z(-6 * D)), hand_L: R3.mul(R3.x(-8 * D), R3.z(6 * D)) };
    for (const sd of SIDES) { const s = sideOf(sd); o["upperArm_" + sd] = R3.mul3(R3.z(s * 13 * D), R3.x(-6 * D), R3.y(-s * 6 * D)); o["foreArm_" + sd] = R3.x(-38 * D); } return (this._ready = o); }
  finish(q, pose) {
    const E = this.E, b = this.body, rootM = E.r1RootMatrix(q.P[0], q.P[1], q.psi, 0), fk = E.r1FK({ body: b, p: pose.p || E.r1GaitAt(b, E.RUN1.ref, 2.5) }, pose, rootM, this.fkBuf); this.fkBuf = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    return { skin, frames: boneFramesOf({ P: q.P, psi: q.psi, body: b }, fk), pose };
  }
}

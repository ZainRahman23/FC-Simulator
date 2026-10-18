// ═══ receive_kill1/rk_body.js — RECEIVE-KILL-1: the PLACEHOLDER BODY of the KILL actions (presentation only) ══════════════════════════════════════
// Shows what the simulation decided — never decides anything (the body is not in the ball's world; with animation off the outcome is identical).
// Built on RUN-1.3's own skeleton tools (r1LegIK, r1FK, r1RootMatrix — the character's rig): a stationary receiver in a ready stance, a small
// shuffle to the action's stance, then the authored surface presented to the ball AT the CONTACT marker, the cushion (the surface gives with the
// ball for ~0.15 s) and the recovery. Production animation replaces this file; RECEIVE_KILL1_ANIMATION_CONTRACT.md is the contract it fulfils.
//   FOOT_INSIDE / OUTSIDE   the foot turned so its medial / lateral side faces the ball, withdrawn along the ball's path at the contact
//   FOOT_SOLE               the sole on the ball (toe up), pressing it dead
//   FOOT_INSTEP             the foot raised under a dropping ball, toe pointed, dropping with it
//   THIGH                   the hip flexed so the thigh's top meets the ball's underside (solved), lowered with the ball
//   CHEST                   the trunk leaning back (the model's chest lean), arms open, the chest withdrawn at the contact
//   HEAD                    neck extended toward the ball, on the toes (a jump above 1.92 m), the head giving at the contact
import { DT, R } from "./rk_model.js";
const SIDES = ["R", "L"], DEG = Math.PI / 180, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const s5 = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const BODY = { ready: { width: 0.14, stagger: 0.03, toeOut: 8, crouch: 0.035 }, cushion: 0.16, recover: 0.55, shuffle: 0.22 };
export class KillBody {
  // E: RUN1_V13 (R3, RV, r1Body, r1LegIK, r1FK, r1RootMatrix); M4; skel: the character skeleton; prep: rk_sim.prepare()'s result
  constructor(E, M4, skel, prep) {
    this.E = E; this.M4 = M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.prep = prep; this.fk = null;
    const P = prep.plan; this.sf = P.sf; this.side = P.sf.side === "L" ? "L" : "R"; this.sg = this.side === "R" ? 1 : -1; this.tc = P.k * DT; this.T = P.sf.S.prep;
    this.c = prep.contact; this.st = prep.stance; this.from = P.inc.from; this.frame = prep.ideal.frame;
  }
  // ── the root (stance centre) and both foot plants over time (local [f, r]) ─────────────────────────────────────────────────────────────────────
  stanceAt(t) { const tS = this.tc - this.T - BODY.shuffle - 0.1, u = s5((t - tS) / BODY.shuffle); return [this.st[0] * u, this.st[1] * u]; }
  plant(F, S) { const rd = BODY.ready, sg = F === "R" ? 1 : -1; return [S[0] + (F === "R" ? rd.stagger : -rd.stagger), S[1] + sg * rd.width]; }
  // a foot's ready plant over the shuffle (the leading foot first), with a small lift while it moves
  readyFoot(F, t) {
    const tS = this.tc - this.T - BODY.shuffle - 0.1, lead = this.st[1] >= 0 ? "R" : "L", t0 = tS + (F === lead ? 0 : BODY.shuffle * 0.45), d = BODY.shuffle * 0.55, u = s5((t - t0) / d);
    const a = this.plant(F, [0, 0]), b = this.plant(F, this.st), p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], moving = Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.01;
    return { ank: [p[0], p[1], 0.088 + (moving ? 0.05 * Math.sin(Math.PI * u) : 0)], yaw: (F === "R" ? 1 : -1) * BODY.ready.toeOut * DEG, pitch: 0 };
  }
  // ── the contact pose of the surface at the CONTACT marker (root-relative to the action stance) ───────────────────────────────────────────────
  contactFoot() {
    const id = this.sf.id, c = this.c, sg = this.sg, fr = [this.from[0], this.from[1]];
    const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    // local yaw convention: heading of the foot in the (f, r) plane: atan2(r, f); rotating "to the right" adds +
    let fwd, ank, pitch = 0, h = 0.088;
    if (id === "FOOT_INSIDE") { fwd = rot(fr, sg * 70 * DEG); const med = rot(fwd, -sg * 90 * DEG); ank = [c[0] - med[0] * (R + 0.045) - fwd[0] * 0.05, c[1] - med[1] * (R + 0.045) - fwd[1] * 0.05]; h = Math.max(0.088 + 0.012, c[2] - 0.03); pitch = 4 * DEG; }
    else if (id === "FOOT_OUTSIDE") { fwd = rot(fr, -sg * 75 * DEG); const lat = rot(fwd, sg * 90 * DEG); ank = [c[0] - lat[0] * (R + 0.04) - fwd[0] * 0.06, c[1] - lat[1] * (R + 0.04) - fwd[1] * 0.06]; h = Math.max(0.1, c[2] - 0.03); pitch = -6 * DEG; }
    else if (id === "FOOT_SOLE") { fwd = [1, 0]; ank = [c[0] - 0.08, c[1]]; h = c[2] + R - 0.02; pitch = 24 * DEG; }
    else { fwd = [1, 0]; ank = [c[0] - (R + 0.06), c[1]]; h = Math.max(0.1, c[2] - R - 0.02); pitch = -40 * DEG; }   // INSTEP: under the ball, toe pointed
    return { ank: [ank[0] - this.st[0], ank[1] - this.st[1], h], yaw: Math.atan2(fwd[1], fwd[0]), pitch, give: [-fr[0] * 0.09, -fr[1] * 0.09, id === "FOOT_INSTEP" ? -0.08 : 0] };
  }
  // the thigh: hip flexion θ so the thigh's top (radius 0.094) touches the ball's underside: ball = hip + s·u(θ) + d·n(θ), u = (sinθ, −cosθ),
  // n = (cosθ, sinθ) in the leg's sagittal plane; A cosθ + B sinθ = d → θ = atan2(B, A) + acos(d / |(A, B)|)
  thighSolve(hip) { const c = this.c, A = c[0] - this.st[0] - hip[2], B = c[2] - hip[1], d = 0.094 + R, L = Math.hypot(A, B), th = Math.atan2(B, A) + Math.acos(clamp(d / Math.max(L, d + 1e-6), -1, 1)); return clamp(th, 25 * DEG, 100 * DEG); }
  // ── the pose at time t (s, absolute) ────────────────────────────────────────────────────────────────────────────────────────────────────────
  poseAt(t, ballLocal) {
    const g = this.sf.S.group; if (g !== "CHEST" && g !== "HEAD") return this.compose(t, ballLocal, null);
    // two passes: the surface point (sternum / forehead) is brought onto the ball's contact point at the marker by moving the pelvis (rise on the
    // toes, a jump, knees, hips forward); the correction is solved once at the contact and blended in with the action
    if (!this._adj) { const p0 = this.compose(this.tc, this.c, [0, 0, 0]), sp = this.surfPoint(p0), n = this.frame.n, want = [this.c[0] - n[0] * R, this.c[1] - n[1] * R, this.c[2] - n[2] * R];
      this._adj = [clamp(want[0] - sp[0], -0.25, 0.25), clamp(want[1] - sp[1], -0.15, 0.15), clamp(want[2] - sp[2], -0.25, 0.45)]; }
    return this.compose(t, ballLocal, this._adj);
  }
  // the body's contact point (local [f, r, z]): the sternum front for the chest, the forehead for the head
  surfPoint(pz) { const fk = this.fk, b = this.b, g = this.sf.S.group, i = b.idx[g === "CHEST" ? "chest" : "head"], off = g === "CHEST" ? [0, 0.13, 0.115] : [0, 0.075, 0.095], Rm = fk.R[i], P = fk.P[i], q = this.E.R3.v(Rm, off), S = pz.S; return [P[2] + q[2] + S[0], P[0] + q[0] + S[1], P[1] + q[1]]; }
  compose(t, ballLocal, adj) {
    const E = this.E, R3 = E.R3, b = this.b, id = this.sf.id, grp = this.sf.S.group, tc = this.tc, T = this.T, sg = this.sg, F = this.side, O = F === "R" ? "L" : "R";
    const wIn = s5((t - (tc - T)) / (T * 0.9)), wC = s5((t - tc) / BODY.cushion), wOut = s5((t - (tc + BODY.cushion + 0.05)) / BODY.recover), act = wIn * (1 - wOut);
    const S = this.stanceAt(t), rot = {}, rd = BODY.ready;
    let pelvis = [0, b.pelvisY - 0.03 - rd.crouch, 0], lean = 4 * DEG, roll = 0, twist = 0, arms = { abd: 14, flex: -4, elbow: 36 }, toes = { R: 0, L: 0 };
    const feet = { R: this.readyFoot("R", t), L: this.readyFoot("L", t) };
    // feet are given in local [f, r, h] relative to the CURRENT stance S → root-local [x = r, y = h, z = f]
    const rl = (p) => [p[1] - S[1], p[2], p[0] - S[0]];
    for (const X of SIDES) feet[X].ank = [feet[X].ank[0], feet[X].ank[1], feet[X].ank[2]];
    if (grp === "FOOT") {
      const C = this.contactFoot(), base = feet[F], give = lerp3([0, 0, 0], C.give, wC), cA = [C.ank[0] + this.st[0] + give[0], C.ank[1] + this.st[1] + give[1], C.ank[2] + give[2]];
      const lift = 0.07 * Math.sin(Math.PI * clamp((t - (tc - T)) / T, 0, 1)) * (1 - wC);
      feet[F] = { ank: [lerp(base.ank[0], cA[0], act), lerp(base.ank[1], cA[1], act), lerp(base.ank[2], cA[2], act) + lift * (1 - wOut)], yaw: lerp(base.yaw, C.yaw, act), pitch: lerp(0, C.pitch, act) };
      pelvis[1] -= 0.035 * act; twist = 0.3 * C.yaw * act; arms = { abd: 14 + 20 * act, flex: -4, elbow: 36 + 10 * act }; lean = (4 + 6 * act) * DEG;
    } else if (grp === "THIGH") {
      pelvis[1] -= 0.05 * act; const hip = [sg * b.hipX, pelvis[1], 0], th0 = this.thighSolve(hip), th = th0 - 12 * DEG * wC, s = 0.3, kn = [hip[0], hip[1] - b.thigh * Math.cos(th), hip[2] + b.thigh * Math.sin(th)];
      const an = [kn[0], kn[1] - b.shank * Math.cos(8 * DEG), kn[2] - b.shank * Math.sin(8 * DEG)], base = feet[F], tgt = [an[2] + S[0], an[0] + S[1], an[1]];
      feet[F] = { ank: [lerp(base.ank[0], tgt[0], act), lerp(base.ank[1], tgt[1], act), lerp(base.ank[2], tgt[2], act)], yaw: lerp(base.yaw, 0, act), pitch: lerp(0, -25 * DEG, act) };
      arms = { abd: 14 + 30 * act, flex: -4 + 10 * act, elbow: 36 + 20 * act }; lean = (4 - 6 * act) * DEG;
    } else if (grp === "CHEST") {
      const tl = this.frame.n[2] / Math.max(1e-6, Math.hypot(this.frame.n[0], this.frame.n[1])), phi = Math.atan(tl) * 0.85 + 8 * DEG * wC;
      lean = lerp(4 * DEG, -phi, act); const st = [0.12 * Math.cos(phi) - 0.42 * Math.sin(phi) + 0.11 * Math.cos(phi), 0.42 * Math.cos(phi) + 0.12 * Math.sin(phi) + 0.11 * Math.sin(phi)];
      const wantF = this.c[0] - this.st[0] - st[0] - 0.05 * wC, wantY = this.c[2] - st[1] - 0.115;
      pelvis = [0, lerp(pelvis[1], clamp(wantY, 0.78, 0.99), act), lerp(0, clamp(wantF, -0.05, 0.2), act)];
      arms = { abd: 14 + 52 * act, flex: -4 + 18 * act, elbow: 36 + 30 * act };
    } else if (grp === "HEAD") {
      const z = this.c[2], rise = z > 1.92 ? z - 1.84 : clamp(z - 1.76, -0.08, 0.07);
      pelvis[1] += rise * act - 0.04 * wC * (1 - wOut); for (const X of SIDES) { if (rise > 0.07) feet[X].ank[2] += (rise - 0.07) * act; toes[X] = clamp(rise * 3, 0, 0.35) * act; }
      pelvis[2] = lerp(0, clamp(this.c[0] - this.st[0] - 0.17, -0.1, 0.15), act); arms = { abd: 14 + 40 * act, flex: -4 + 30 * act, elbow: 36 + 30 * act }; lean = (4 + 4 * act) * DEG;
    }
    if (adj) { const k = act; pelvis = [pelvis[0] + adj[1] * k, pelvis[1] + adj[2] * k, pelvis[2] + adj[0] * k]; const up = pelvis[1] - (b.pelvisY - 0.005); if (up > 0) for (const X of SIDES) feet[X].ank[2] += up; }
    // ── assemble: pelvis + spine (lean), legs by IK, arms, head toward the ball ────────────────────────────────────────────────────────────────
    const Rp = R3.mul3(R3.y(twist), R3.z(roll), R3.x(lean * 0.35)); rot.pelvis = Rp; rot.spine = R3.x(lean * 0.3); rot.chest = R3.x(lean * 0.35);
    for (const X of SIDES) { const s = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [s * b.hipX, 0, 0])), an = rl(ft.ank);
      const yaw = ft.yaw, Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0) - (toes[X] || 0)));
      let psi = yaw - twist; psi = s > 0 ? clamp(psi, -50 * DEG, 75 * DEG) : clamp(psi, -75 * DEG, 50 * DEG);
      const ik = E.r1LegIK(b, Rp, psi, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      rot["thigh_" + X] = ik.Rthigh; rot["shin_" + X] = ik.Rshin; rot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); rot["toe_" + X] = R3.x(-(toes[X] || 0) * 0.8); }
    for (const X of SIDES) { const s = X === "R" ? 1 : -1; rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(s * arms.abd * DEG), R3.x(-arms.flex * DEG), R3.y(-s * 6 * DEG)); rot["foreArm_" + X] = R3.x(-arms.elbow * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-s * 6 * DEG)); }
    // head: the gaze toward the ball (the neck takes 40 %); a header's extension follows from looking up at it
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05];
    if (ballLocal) { const d = [ballLocal[1] - S[1] - headW[0], ballLocal[2] - headW[1], ballLocal[0] - S[0] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -70 * DEG, 70 * DEG), pt = clamp(Math.atan2(-d[1], Math.hypot(d[0], d[2])), -55 * DEG, 60 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Q); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    const out = this.finish(S, { rot, pelvisPos: pelvis }); out.S = S; return out;
  }
  finish(S, pose) {
    const E = this.E, b = this.b, S0 = [40, 34], rootM = E.r1RootMatrix(S0[0] + S[0], S0[1] + S[1], 0, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    // joints in local [f, r, z] (for the 2D side / top views)
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0] - S0[0], -w[2] - S0[1], w[1]], t: [tp[0] - S0[0], -tp[2] - S0[1], tp[1]] }; }
    return { skin, J, pose };
  }
}

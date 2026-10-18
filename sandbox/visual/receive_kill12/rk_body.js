// ═══ receive_kill11/rk_body.js — RECEIVE-KILL-1.1: the PLACEHOLDER BODY of a whole CONTROL EPISODE (presentation only) ═════════════════════════════
// Shows what the simulation decided — never decides anything (the body is not in the ball's world; animation on / off cannot change the outcome).
// RECEIVE-KILL-1's body (one action) generalised to the episode's ACTION SEQUENCE: the first control (foot / thigh / chest / head) and its
// follow-up foot controls, with the receiver's adjustment steps between them (rk_sim.js episode.moves). Each action contributes its own part of
// the pose with its own weight (in → CONTACT → cushion → unwind); a follow-up's preparation overlaps the previous action's unwinding (the leg
// prepares while the chest cushions), and when two actions use the same foot the later one takes it over. Built on RUN-1.3's skeleton tools.
import { DT, R } from "./rk_model.js";
const SIDES = ["R", "L"], DEG = Math.PI / 180, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const s5 = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const BODY = { ready: { width: 0.14, stagger: 0.03, toeOut: 8, crouch: 0.035 }, cushion: 0.16, recover: 0.55, shuffle: 0.22, stepLift: 0.06 };
export class KillBody {
  // E: RUN1_V13; M4; skel; prep: rk_sim.prepare(); ep: rk_sim.runEpisode() (optional — without it, the first action alone, as RECEIVE-KILL-1)
  constructor(E, M4, skel, prep, ep) {
    this.E = E; this.M4 = M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.prep = prep; this.fk = null; const kc = prep.kc;
    const list = ep ? ep.contacts : [{ i: 0, sf: prep.plan.sf, stance: prep.stance, contact: prep.contact, inc: prep.plan.inc, ideal: prep.ideal, prep: prep.plan.sf.S.prep }];
    this.acts = list.map((c) => ({ sf: c.sf, group: c.sf.S.group, side: c.sf.side === "L" ? "L" : "R", sg: c.sf.side === "L" ? -1 : 1, tc: (kc + c.i) * DT, T: c.prep, c: c.contact, st: c.stance, from: c.inc.from, frame: c.ideal.frame }));
    for (let a = 0; a < this.acts.length; a++) { const A = this.acts[a], N = this.acts[a + 1]; A.tEnd = A.tc + BODY.cushion + 0.02; A.rec = N ? Math.max(0.12, N.tc - N.T * 0.5 - A.tEnd) : BODY.recover; }
    this.moves = ep ? ep.moves.map((m) => ({ tA: (kc + m.iA) * DT, tB: (kc + m.iB) * DT, from: m.from, to: m.to })) : [];
    this.S1 = this.acts[0].st;
  }
  // ── the stance (local [f, r]): the shuffle to the first action's stance, then the adjustment moves between contacts ──────────────────────────
  stanceAt(t) { const A = this.acts[0], tS = A.tc - A.T - BODY.shuffle - 0.1, u = s5((t - tS) / BODY.shuffle); let S = [this.S1[0] * u, this.S1[1] * u];
    for (const m of this.moves) { if (t <= m.tA) break; const w = s5((t - m.tA) / Math.max(1e-3, m.tB - m.tA)); S = [m.from[0] + (m.to[0] - m.from[0]) * w, m.from[1] + (m.to[1] - m.from[1]) * w]; } return S; }
  plant(F, S) { const rd = BODY.ready, sg = F === "R" ? 1 : -1; return [S[0] + (F === "R" ? rd.stagger : -rd.stagger), S[1] + sg * rd.width]; }
  // a foot's planted position: it follows the stance in steps (the leading foot first, a lift while it moves)
  readyFoot(F, t) {
    const segs = [{ tA: this.acts[0].tc - this.acts[0].T - BODY.shuffle - 0.1, tB: this.acts[0].tc - this.acts[0].T - 0.1, from: [0, 0], to: this.S1 }].concat(this.moves);
    let p = this.plant(F, [0, 0]), lift = 0;
    for (const m of segs) { if (t <= m.tA) break; const lead = (m.to[1] - m.from[1]) >= 0 ? "R" : "L", d = m.tB - m.tA, t0 = m.tA + (F === lead ? 0 : d * 0.45), u = s5((t - t0) / (d * 0.55)), a = this.plant(F, m.from), b = this.plant(F, m.to);
      p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; if (u > 0 && u < 1 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.01) lift = BODY.stepLift * Math.sin(Math.PI * u); }
    return { ank: [p[0], p[1], 0.088 + lift], yaw: (F === "R" ? 1 : -1) * BODY.ready.toeOut * DEG, pitch: 0 };
  }
  // ── a foot action's contact pose (local, absolute) ──────────────────────────────────────────────────────────────────────────────────────────
  contactFoot(A) {
    const id = A.sf.id, c = A.c, sg = A.sg, fr = [A.from[0], A.from[1]], rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    let fwd, ank, pitch = 0, h = 0.088;
    if (id === "FOOT_INSIDE") { fwd = rot(fr, sg * 70 * DEG); const med = rot(fwd, -sg * 90 * DEG); ank = [c[0] - med[0] * (R + 0.045) - fwd[0] * 0.05, c[1] - med[1] * (R + 0.045) - fwd[1] * 0.05]; h = Math.max(0.1, c[2] - 0.03); pitch = 4 * DEG; }
    else if (id === "FOOT_OUTSIDE") { fwd = rot(fr, -sg * 75 * DEG); const lat = rot(fwd, sg * 90 * DEG); ank = [c[0] - lat[0] * (R + 0.04) - fwd[0] * 0.06, c[1] - lat[1] * (R + 0.04) - fwd[1] * 0.06]; h = Math.max(0.1, c[2] - 0.03); pitch = -6 * DEG; }
    else if (id === "FOOT_SOLE") { fwd = [1, 0]; ank = [c[0] - 0.10, c[1]]; h = Math.max(0.15, c[2] + R + 0.06); pitch = 18 * DEG; }   // the sole on the ball's top (the ankle ~7 cm above the sole)
    else { fwd = [1, 0]; ank = [c[0] - (R + 0.06), c[1]]; h = Math.max(0.1, c[2] - R - 0.02); pitch = -40 * DEG; }
    return { ank: [ank[0], ank[1], h], yaw: Math.atan2(fwd[1], fwd[0]), pitch, give: [-fr[0] * 0.09, -fr[1] * 0.09, id === "FOOT_INSTEP" ? -0.08 : 0] };
  }
  thighSolve(A, hip, S) { const c = A.c, Af = c[0] - S[0] - hip[2], B = c[2] - hip[1], d = 0.094 + R, L = Math.hypot(Af, B), th = Math.atan2(B, Af) + Math.acos(clamp(d / Math.max(L, d + 1e-6), -1, 1)); return clamp(th, 25 * DEG, 100 * DEG); }
  weights(A, t) { const wIn = s5((t - (A.tc - A.T)) / (A.T * 0.9)), wC = s5((t - A.tc) / BODY.cushion), wOut = s5((t - A.tEnd) / A.rec); return { wIn, wC, wOut, act: wIn * (1 - wOut) }; }
  // the chest / head contact point is brought onto the ball at the marker by moving the pelvis (solved once per action, two passes)
  surfAdj(A, a) { if (A.adj) return A.adj; A.adj = [0, 0, 0]; const p0 = this.compose(A.tc, A.c, a), sp = this.surfPoint(p0, A), n = A.frame.n, want = [A.c[0] - n[0] * R, A.c[1] - n[1] * R, A.c[2] - n[2] * R];
    A.adj = [clamp(want[0] - sp[0], -0.25, 0.25), clamp(want[1] - sp[1], -0.15, 0.15), clamp(want[2] - sp[2], -0.25, 0.45)]; return A.adj; }
  surfPoint(pz, A) { const fk = this.fk, b = this.b, i = b.idx[A.group === "CHEST" ? "chest" : "head"], off = A.group === "CHEST" ? [0, 0.13, 0.115] : [0, 0.075, 0.095], q = this.E.R3.v(fk.R[i], off), P = fk.P[i], S = pz.S; return [P[2] + q[2] + S[0], P[0] + q[0] + S[1], P[1] + q[1]]; }
  poseAt(t, ballLocal) { for (let a = 0; a < this.acts.length; a++) { const A = this.acts[a]; if ((A.group === "CHEST" || A.group === "HEAD") && !A.adj) this.surfAdj(A, a); } return this.compose(t, ballLocal); }
  // ── the pose at time t: the ready stance + every action's contribution × its weight ──────────────────────────────────────────────────────────
  compose(t, ballLocal, onlyAct) {
    const E = this.E, R3 = E.R3, b = this.b, rd = BODY.ready, S = this.stanceAt(t), rot = {};
    let pelvis = [0, b.pelvisY - 0.03 - rd.crouch, 0], lean = 4 * DEG, twist = 0, arms = { abd: 14, flex: -4, elbow: 36 }; const toes = { R: 0, L: 0 };
    const feet = { R: this.readyFoot("R", t), L: this.readyFoot("L", t) };
    for (let a = 0; a < this.acts.length; a++) {
      if (onlyAct != null && a !== onlyAct) continue; const A = this.acts[a], w = this.weights(A, t), act = w.act; if (act <= 0) continue; const F = A.side, sg = A.sg;
      if (A.group === "FOOT") { const C = this.contactFoot(A), base = feet[F], give = lerp3([0, 0, 0], C.give, w.wC), cA = [C.ank[0] + give[0], C.ank[1] + give[1], C.ank[2] + give[2]], lift = 0.07 * Math.sin(Math.PI * clamp((t - (A.tc - A.T)) / A.T, 0, 1)) * (1 - w.wC);
        feet[F] = { ank: [lerp(base.ank[0], cA[0], act), lerp(base.ank[1], cA[1], act), lerp(base.ank[2], cA[2], act) + lift * (1 - w.wOut)], yaw: lerp(base.yaw, C.yaw, act), pitch: lerp(base.pitch || 0, C.pitch, act) };
        pelvis[1] -= 0.035 * act; twist += 0.3 * C.yaw * act; arms.abd += 20 * act; arms.elbow += 10 * act; lean += 6 * DEG * act; }
      else if (A.group === "THIGH") { const hip0 = [sg * b.hipX, pelvis[1] - 0.05, 0], th = this.thighSolve(A, hip0, A.st) - 12 * DEG * w.wC, kn = [hip0[0], hip0[1] - b.thigh * Math.cos(th), hip0[2] + b.thigh * Math.sin(th)];
        const an = [kn[0], kn[1] - b.shank * Math.cos(8 * DEG), kn[2] - b.shank * Math.sin(8 * DEG)], base = feet[F], tgt = [an[2] + S[0], an[0] + S[1], an[1]];
        feet[F] = { ank: [lerp(base.ank[0], tgt[0], act), lerp(base.ank[1], tgt[1], act), lerp(base.ank[2], tgt[2], act)], yaw: lerp(base.yaw, 0, act), pitch: lerp(base.pitch || 0, -25 * DEG, act) };
        pelvis[1] -= 0.05 * act; arms.abd += 30 * act; arms.flex += 10 * act; arms.elbow += 20 * act; lean -= 6 * DEG * act; }
      else if (A.group === "CHEST") { const tl = A.frame.n[2] / Math.max(1e-6, Math.hypot(A.frame.n[0], A.frame.n[1])), phi = Math.atan(tl) * 0.85 + 8 * DEG * w.wC;
        lean = lerp(lean, -phi, act); const st = [0.23 * Math.cos(phi) - 0.42 * Math.sin(phi), 0.42 * Math.cos(phi) + 0.23 * Math.sin(phi)], wantF = A.c[0] - A.st[0] - st[0] - 0.05 * w.wC, wantY = A.c[2] - st[1] - 0.115;
        pelvis = [pelvis[0], lerp(pelvis[1], clamp(wantY, 0.78, 0.99), act), lerp(pelvis[2], clamp(wantF, -0.05, 0.2), act)]; arms.abd += 52 * act; arms.flex += 18 * act; arms.elbow += 30 * act; }
      else if (A.group === "HEAD") { const z = A.c[2], rise = z > 1.92 ? z - 1.84 : clamp(z - 1.76, -0.08, 0.07);
        pelvis[1] += rise * act - 0.04 * w.wC * (1 - w.wOut); for (const X of SIDES) { if (rise > 0.07) feet[X].ank[2] += (rise - 0.07) * act; toes[X] = clamp(rise * 3, 0, 0.35) * act; }
        pelvis[2] = lerp(pelvis[2], clamp(A.c[0] - A.st[0] - 0.17, -0.1, 0.15), act); arms.abd += 40 * act; arms.flex += 30 * act; arms.elbow += 30 * act; lean += 4 * DEG * act; }
      if (A.adj && onlyAct == null) { pelvis = [pelvis[0] + A.adj[1] * act, pelvis[1] + A.adj[2] * act, pelvis[2] + A.adj[0] * act]; const up = pelvis[1] - (b.pelvisY - 0.005); if (up > 0) for (const X of SIDES) feet[X].ank[2] += up * act; }
    }
    // ── assemble: pelvis + spine (lean), legs by IK, arms, head toward the ball ────────────────────────────────────────────────────────────────
    const rl = (p) => [p[1] - S[1], p[2], p[0] - S[0]];
    const Rp = R3.mul(R3.y(twist), R3.x(lean * 0.35)); rot.pelvis = Rp; rot.spine = R3.x(lean * 0.3); rot.chest = R3.x(lean * 0.35);
    for (const X of SIDES) { const s = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [s * b.hipX, 0, 0])), an = rl(ft.ank), yaw = ft.yaw, Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0) - (toes[X] || 0)));
      let psi = yaw - twist; psi = s > 0 ? clamp(psi, -50 * DEG, 75 * DEG) : clamp(psi, -75 * DEG, 50 * DEG);
      const ik = E.r1LegIK(b, Rp, psi, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      rot["thigh_" + X] = ik.Rthigh; rot["shin_" + X] = ik.Rshin; rot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); rot["toe_" + X] = R3.x(-(toes[X] || 0) * 0.8); }
    for (const X of SIDES) { const s = X === "R" ? 1 : -1; rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(s * arms.abd * DEG), R3.x(-arms.flex * DEG), R3.y(-s * 6 * DEG)); rot["foreArm_" + X] = R3.x(-arms.elbow * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-s * 6 * DEG)); }
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05];
    if (ballLocal) { const d = [ballLocal[1] - S[1] - headW[0], ballLocal[2] - headW[1], ballLocal[0] - S[0] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -70 * DEG, 70 * DEG), pt = clamp(Math.atan2(-d[1], Math.hypot(d[0], d[2])), -55 * DEG, 60 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Q = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Q); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Q); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    const out = this.finish(S, { rot, pelvisPos: pelvis }); out.S = S; return out;
  }
  finish(S, pose) {
    const E = this.E, b = this.b, S0 = [40, 34], rootM = E.r1RootMatrix(S0[0] + S[0], S0[1] + S[1], 0, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0] - S0[0], -w[2] - S0[1], w[1]], t: [tp[0] - S0[0], -tp[2] - S0[1], tp[1]] }; }
    return { skin, J, pose };
  }
}

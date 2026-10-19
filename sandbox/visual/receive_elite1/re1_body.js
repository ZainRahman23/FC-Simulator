// ═══ receive_elite1/re1_body.js — RECEIVE-ELITE-1: the HUMAN BODY of the elite tight-control sequence (presentation only) ══════════════════════════
// RECEIVE-TURN-1.1's human body (receive_turn11/rt11_body.js: footsteps → support and weight → sequenced rotation → IK on RUN-1.3's rig, planted feet
// never slide, the pelvis moves when a planted leg would be out of reach) generalised to what the elite sequence authors:
//   · SEVERAL CONTACTS — every authoritative contact is a touch inside a swing of the foot that plays it: the swing passes EXACTLY through that
//     foot's contact pose (the contact surface on the ball, facing the impulse) at the contact tick, then lands as a step
//   · RAPID FEET — the swings are the simulation's own footstep plan (Agility's support-step period through the turn, the running cadence on the exit)
//   · A MOVING ENTRY — the run in: TURN-1.2's feet at the action start, RECEIVE-CONTROL-1.1's touchdowns into the plant, blended in from TURN-1.2's
//     own pose; blended out into the pose of the TURN-1.2 actor that takes the body at the switch
//   · AGILITY made visible — the hips follow the authored facing, the shoulders lead it into the turn, the pelvis drops into the plant, the trunk
//     leans against the braking and into the acceleration, rolls into the turn; the arms balance
// Inputs are the episode's authoritative data only (root path, facing, footstep plan, contacts — the executed ones and the next planned one, whose
// ball position is the kernel's exact prediction). Nothing here is read by the simulation (tools/re1_neutral.mjs: animation ON / OFF identical).
import { HB, REF } from "../receive_turn11/rt11_body.js";
import { DEG, clamp, s5, wrapA, dir, toL2, sgnF } from "../receive_turn1/rt_actions.js";
import { predictK } from "../receive_control2/rc2_episode.js";
const DT = 1 / 240, R = 0.11, SIDES = ["R", "L"], hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
const lerp = (a, b, t) => a + (b - a) * t, lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hat = (u, um, w) => { const a = um - w, b = um + w; if (u <= a || u >= b) return 0; return u <= um ? s5((u - a) / Math.max(1e-6, um - a)) : s5((b - u) / Math.max(1e-6, b - um)); };
const hdg = (v) => Math.atan2(v[1], v[0]), len2 = (v) => hyp(v[0], v[1]), sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a)), other = (F) => (F === "R" ? "L" : "R");
// rotations (row-major 3×3, RUN-1.3's R3): slerp for the blends (RECEIVE-CONTROL-1.1's placeholder body's helpers)
const mm = (A, B) => [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8], A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8], A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
const tr = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
function rlog(Rm) { const c = clamp((Rm[0] + Rm[4] + Rm[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0]; if (Math.PI - a < 1e-6) { const x = Math.sqrt(max(0, (Rm[0] + 1) / 2)), y = Math.sqrt(max(0, (Rm[4] + 1) / 2)), z = Math.sqrt(max(0, (Rm[8] + 1) / 2)); return [x * a, y * a, z * a]; } const s = 2 * Math.sin(a); return [(Rm[7] - Rm[5]) / s * a, (Rm[2] - Rm[6]) / s * a, (Rm[3] - Rm[1]) / s * a]; }
function rexp(r) { const a = hyp(r[0], r[1], r[2]); if (a < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1]; const x = r[0] / a, y = r[1] / a, z = r[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c; return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
const slerp = (A, B, t) => { if (t <= 0) return A; if (t >= 1) return B; const d = rlog(mm(tr(A), B)); return mm(A, rexp([d[0] * t, d[1] * t, d[2] * t])); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const blendPose = (A, B, t) => { if (!A || t <= 0) return A || B; if (t >= 1) return B; const rot = {}; for (const k of Object.keys(B.rot)) rot[k] = A.rot[k] ? slerp(A.rot[k], B.rot[k], t) : B.rot[k]; return { rot, pelvisPos: lerp3(A.pelvisPos, B.pelvisPos, t) }; };
export const EB = { blendIn: 0.14, blendOut: 0.12, touchW: 0.32, lead: [0.10, 0.055], width: 0.10, standWidth: 0.12, give: 0.05, pivotMax: 70, shoulderLead: 0.35, crouchTurn: 0.075, crouchBrake: 0.012 };
export class EliteBody {
  constructor(sim, ep, F) {
    const E = sim.cfg.E, skel = sim.cfg.skel, c2 = sim.rc2; this.sim = sim; this.E = E; this.M4 = sim.cfg.M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.ep = ep; this.F = F; this.fk = null;
    this.mtpY = abs(this.b.mtp[1]); this.mtpZ = this.b.mtp[2]; this.T = ep.tech; this.sig = ep.tech.sig || 1; this.th = ep.path.th; this.moving = ep.mode === "moving";
    this.tc = (c2.kc - c2.k0) * DT;                                                         // the first contact, relative to the episode start
    // the first build keeps what the body started from (TURN-1.2's feet and pose for a moving receiver; the ready stance for a standing one)
    if (!c2.eliteInit) c2.eliteInit = this.startState(sim, c2);
    this.init = c2.eliteInit; this.T0 = this.moving ? -this.tc : -min(this.tc, (REF[this.T.fid] ? REF[this.T.fid](abs(this.T.theta / DEG)).lead : 0.6));
    this.contactsKnown = this.knownContacts(sim);
    this.buildEnd(sim, c2); this.buildFeet();
  }
  // ── where the body starts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  startState(sim, c2) {
    const A = sim.A, F = this.F, st = { pose: null, feet: {} };
    if (this.moving) { st.pose = A.pose ? { rot: Object.assign({}, A.pose.rot), pelvisPos: A.pose.pelvisPos.slice() } : null;
      for (const X of SIDES) { const L = A.legs[X]; if (L.stance && L.plant) { const p = F.loc([L.plant.pos[0], 0, L.plant.pos[1]]); st.feet[X] = { plant: { pos: [p[0], p[1]], yaw: L.plant.yaw - F.h } }; }
        else { const fr = sim.framesPrev && sim.framesPrev["foot_" + X]; const p = fr ? F.loc([fr.p[0], fr.p[1], -fr.p[2]]) : F.loc([A.P[0], 0.1, A.P[1]]); st.feet[X] = { air: [p[0], p[1], max(HB.ankleH, p[2])], yaw: (L._yawW != null ? L._yawW : A.psi) - F.h }; } } }
    else { const psi0 = (c2.psiInit != null ? c2.psiInit : F.h) - F.h, rd = HB.ready, sg = this.sig;
      for (const X of SIDES) { const p = [(sgnF(X) === sg ? -1 : 1) * rd.stagger, sgnF(X) * rd.width], c = Math.cos(psi0), s = Math.sin(psi0); st.feet[X] = { plant: { pos: [p[0] * c - p[1] * s, p[0] * s + p[1] * c], yaw: psi0 + sgnF(X) * rd.toeOut * DEG } }; } }
    return st;
  }
  // ── the contacts the body plays: the executed ones (their exact ball and impulse) and the next planned one (the kernel's exact prediction of the
  // ball at its tick; its impulse from the episode's own ideal toward the contact after it) ──────────────────────────────────────────────────────
  knownContacts(sim) {
    const ep = this.ep, out = ep.contacts.map((c) => ({ i: c.i, t: c.t, F: c.F, surface: c.surface, ball: [c.B[0], c.B[1], max(R, c.B[2])], vIn: c.vIn.slice(0, 2), vOut: c.vExec.slice(0, 2), exit: c.exit }));
    const nx = ep.next || ep.pending; if (nx && !ep.done && !ep.failed && nx.k > sim.W.tick - 1) { const n = nx.k - sim.W.tick; if (n >= 0 && n < 720) { const P = predictK(sim.W, (n + 1) * DT, this.F), b = P[n];
      if (b) { const pv = ep.preview ? ep.preview(nx, b) : null; out.push({ i: nx.i, t: nx.t, F: nx.F, surface: pv ? pv.surface : "INSIDE", ball: [b.p[0], b.p[1], max(R, b.p[2])], vIn: [b.v[0], b.v[1]], vOut: pv ? pv.v : [b.v[0], b.v[1]], planned: true }); } } }
    return out;
  }
  // the contact foot's pose for surface s (RECEIVE-TURN-1.1's contactFoot): the surface faces the impulse, the boot meets the ball's surface
  contactPose(F, s, c, n) {
    const sg = sgnF(F); let h = Math.max(0.10, c[2] - 0.03), phi, ank, pitch = 4 * DEG;
    if (s === "INSIDE") { phi = hdg(n) + sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.045) - f[0] * 0.05, c[1] - n[1] * (R + 0.045) - f[1] * 0.05]; }
    else if (s === "OUTSIDE") { phi = hdg(n) - sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.04) - f[0] * 0.06, c[1] - n[1] * (R + 0.04) - f[1] * 0.06]; pitch = -6 * DEG; }
    else if (s === "SOLE") { phi = hdg(n) + Math.PI; ank = [c[0] - 0.02 * n[0], c[1] - 0.02 * n[1]]; pitch = 18 * DEG; return { ank: [ank[0], ank[1], c[2] + R + 0.06], yaw: phi, pitch }; }
    else { phi = hdg(n); ank = [c[0] - n[0] * (R + 0.06), c[1] - n[1] * (R + 0.06)]; pitch = -35 * DEG; }
    const tipZ = (hh) => hh - (this.mtpY || 0.057) * Math.cos(pitch) + 0.24 * Math.sin(pitch), floor = HB.ankleH - (this.mtpY || 0.057) + 0.008; if (tipZ(h) < floor) h += floor - tipZ(h);
    return { ank: [ank[0], ank[1], h], yaw: phi, pitch };
  }
  impulseDir(c) { const dv = [c.vOut[0] - c.vIn[0], c.vOut[1] - c.vIn[1]], l = len2(dv); return l > 1e-6 ? [dv[0] / l, dv[1] / l] : dir(this.ep.psiAt(c.t)); }
  // a landing on the run: ahead of the centre of mass by the speed's stride lead, on the foot's side
  landAt(X, t) { const P = this.ep.rootAt(t), V = this.ep.velAt(t), v = len2(V), psi = this.ep.psiAt(t), h = v > 1.5 ? hdg(V) : psi, lead = EB.lead[0] + EB.lead[1] * min(6, v);
    const side = [-Math.sin(psi) * sgnF(X) * EB.width, Math.cos(psi) * sgnF(X) * EB.width];
    return { pos: [P[0] + dir(h)[0] * lead + side[0], P[1] + dir(h)[1] * lead + side[1]], yaw: psi + sgnF(X) * 4 * DEG }; }
  // ── THE FOOTSTEPS: plants, pivots, swings (with the contacts inside them) ────────────────────────────────────────────────────────────────────
  buildFeet() {
    const ep = this.ep, T = this.T, F0 = T.F0, Fs = other(F0), seg = { R: [], L: [] }, last = {}; this.seg = seg;
    for (const X of SIDES) { const f = this.init.feet[X]; last[X] = f.plant ? { pos: f.plant.pos.slice(), yaw: f.plant.yaw } : null; }
    const cons = this.contactsKnown, cAt = (s) => cons.filter((c) => c.F === s.F && c.t > s.t0 + 0.01 && c.t < s.t1 - 0.005);
    // the run in (moving): RECEIVE-CONTROL-1.1's touchdowns into the plant
    const act = this.sim.rc2.act, t0E = -this.tc;
    if (this.moving && act) { const st = act.steps.steps, m = act.steps.m, Tp = this.tc;
      for (const X of SIDES) if (!last[X]) { const a = this.init.feet[X].air; last[X] = { pos: [a[0], a[1]], yaw: this.init.feet[X].yaw, air: a }; }
      for (let i = 1; i <= m; i++) { const s = st[i], prev = st.slice(0, i).reverse().find((q) => q.F === s.F), tLift = prev ? prev.t + prev.d - Tp : t0E, tTD = s.t - Tp, X = s.F;
        const to = i === m ? { pos: T.stand.slice(), yaw: ep.psiAt(0) - sgnF(X) * 6 * DEG } : this.landAt(X, tTD);
        seg[X].push({ kind: "swing", t0: max(t0E, tLift), t1: tTD, from: last[X], to, lift: HB.swingLift, touches: [] }); last[X] = to; } }
    else if (!this.moving) { // RECEIVE-TURN-1.1's preparation: the support foot steps to the stance (its toe into the turn); the contact foot opens on its forefoot
      const r = REF[T.fid](abs(T.theta / DEG)), supYaw = ep.psiAt(0) + this.sig * r.supToe * DEG + sgnF(Fs) * 4 * DEG, sFrom = last[Fs], sPlant = { pos: T.stand.slice(), yaw: supYaw };
      seg[Fs].push({ kind: "swing", t0: max(this.T0, min(r.plant - 0.20, this.T0 + 0.14)), t1: r.plant, from: sFrom, to: sPlant, lift: HB.stepLift, touches: [] }); last[Fs] = sPlant;
      if (T.fid !== "THROUGH_TURN") { const cOpen = this.pivotTo(last[F0], last[F0].yaw + 0.7 * ep.psiAt(0)); seg[F0].push({ kind: "pivot", t0: this.T0 + 0.12, t1: T.lift0 - 0.02, at: last[F0], to: cOpen }); last[F0] = cOpen; } }
    // the standing foot pivots on its forefoot through the rotation until it lifts for its first step out
    const s1 = ep.swings.find((s) => !s.first && s.F === Fs), tLiftS = s1 ? s1.t0 : 1.0, remain = wrapA(this.th - last[Fs].yaw), pivYaw = last[Fs].yaw + Math.sign(remain || this.sig) * min(max(0, abs(remain) - 10 * DEG), EB.pivotMax * DEG);
    const sPiv = this.pivotTo(last[Fs], pivYaw); seg[Fs].push({ kind: "pivot", t0: 0.01, t1: tLiftS - 0.01, at: last[Fs], to: sPiv, heel: true }); last[Fs] = sPiv;
    // the swings of the plan (the first is the first contact's: through the contact, landing as the first step out)
    // (the last steps land where TURN-1.2's actor has its feet when it takes the body: the switch foot's plant, the other foot's previous plant)
    const E = this.end, lastOther = E ? ep.swings.filter((q) => q.F !== E.foot && q.t1 < E.t - 1e-6).pop() : null;
    for (const s of ep.swings) { if (s.t0 > 3.2) break; const X = s.F, to = E && X === E.foot && abs(s.t1 - E.t) < 1e-6 ? E.plant : E && E.prev && s === lastOther ? E.prev : this.landAt(X, s.t1), from = last[X] || to, touches = cAt(s).map((c) => ({ t: c.t, pose: this.contactPose(X, c.surface, c.ball, this.impulseDir(c)), c }));
      if (s.first) { const c0 = cons.find((c) => c.i === 0); if (c0 && !touches.length) touches.push({ t: 0, pose: this.contactPose(X, c0.surface, c0.ball, this.impulseDir(c0)), c: c0 }); }
      if (s.first && !touches.length && T.fid) { // (the first contact before it is executed: the planned contact at the ball's predicted position)
        const pc = this.ep.c0Preview; if (pc) touches.push({ t: 0, pose: this.contactPose(X, pc.surface, pc.ball, pc.n), c: pc }); }
      seg[X].push({ kind: "swing", t0: s.t0, t1: s.t1, from, to, lift: s.first ? 0.09 : HB.swingLift, touches, first: !!s.first, via: s.first && T.fid === "THROUGH_TURN" ? this.crossVia(from, touches[0], last[Fs]) : null }); last[X] = to; }
    for (const X of SIDES) seg[X].sort((a, b) => a.t0 - b.t0);
  }
  crossVia(from, touch, plant) { if (!touch || !plant) return null; const c = touch.pose.ank, fwd = dir(this.ep.psiAt(0)), back = this.T.variant === "behind"; return [0.5 * (from.pos[0] + c[0]) + fwd[0] * (back ? -0.10 : 0.11), 0.5 * (from.pos[1] + c[1]) + fwd[1] * (back ? -0.10 : 0.11)]; }
  // the end of the sequence: TURN-1.2's actor at the switch (its pose is what the body blends into)
  buildEnd(sim, c2) {
    this.end = null; const x = this.ep.exit; if (!x || !sim.T1) return;
    const P = this.F.pitch(this.ep.rootAt(x.tSw)), V = this.ep.velAt(x.tSw), v = max(2.5, len2(V));
    try { const A1 = sim.T1.t1Make(sim.cfg.skel, { v, heading: sim.rx.exitDir, pos: P, foot: x.foot, turn12: true }), p = sim.T1.t1Pose(A1), F = this.F, Lf = (pl) => { const q = F.loc([pl.pos[0], 0, pl.pos[1]]); return { pos: [q[0], q[1]], yaw: pl.yaw - F.h }; };
      const o = A1.legs[x.foot === "R" ? "L" : "R"]; this.end = { t: x.tSw, foot: x.foot, pose: { rot: p.rot, pelvisPos: p.pelvisPos.slice() }, plant: Lf(A1.legs[x.foot].plant), prev: o && o.prevPlant ? Lf(o.prevPlant) : null }; } catch (e) { this.end = null; }
  }
  // ── a foot at time t (relative to the first contact) ────────────────────────────────────────────────────────────────────────────────────────
  footAt(X, t) {
    const L = this.seg[X]; let pl = this.init.feet[X].plant ? { pos: this.init.feet[X].plant.pos, yaw: this.init.feet[X].plant.yaw } : null, air = this.init.feet[X].air || null, next = null;
    for (const s of L) {
      if (t < s.t0) { next = s; break; }
      if (t >= s.t1) { pl = s.to; air = null; continue; }
      const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
      if (s.kind === "pivot") return this.pivotFoot(s.at, s.to.yaw, sstep(s.t0, s.t1, t), s.heel ? HB.heelLift * Math.sin(Math.PI * clamp(u * 1.1, 0, 1)) : 0.01 * Math.sin(Math.PI * u));
      const o = this.swingFoot(s, t, u); o.since = t - s.t0; o.until = s.t1 - t; return o;
    }
    if (!pl && air) return { ank: air.slice(), yaw: this.init.feet[X].yaw, pitch: 0, toe: 0, planted: false };
    return { ank: [pl.pos[0], pl.pos[1], HB.ankleH], yaw: pl.yaw, pitch: 0, toe: 0, planted: true, ballPt: [pl.pos[0] + dir(pl.yaw)[0] * this.mtpZ, pl.pos[1] + dir(pl.yaw)[1] * this.mtpZ] };
  }
  // a swing from its lift-off to its plant (lifted); the contacts inside it are passed through EXACTLY (a hat offset from the plain swing — zero,
  // with zero slope, at lift-off and touchdown); the foot meets the ball moving along the impulse and gives with it after the contact
  swingFoot(s, t, u) {
    const a0 = s.from.air ? s.from.air : [s.from.pos[0], s.from.pos[1], HB.ankleH], e = s5(u), base = (uu) => { const ee = s5(uu); return { p: [a0[0] + (s.to.pos[0] - a0[0]) * ee, a0[1] + (s.to.pos[1] - a0[1]) * ee], h: a0[2] + (HB.ankleH - a0[2]) * ee + (s.lift || HB.swingLift) * Math.sin(Math.PI * uu), yaw: s.from.yaw + wrapA(s.to.yaw - s.from.yaw) * ee }; };
    let B0 = base(u), p = B0.p, h = B0.h, yaw = B0.yaw, pitch = 8 * DEG * Math.sin(Math.PI * u), contact = false;
    if (s.via && u < 0.5) { const w = hat(u, 0.3, 0.3), vp = lerp2(p, s.via, 1); p = [p[0] + (vp[0] - p[0]) * w, p[1] + (vp[1] - p[1]) * w]; }
    for (const tc of s.touches) { const um = clamp((tc.t - s.t0) / (s.t1 - s.t0), 0.05, 0.95), Bm = base(um), w = hat(u, um, min(EB.touchW, um, 1 - um)), P = tc.pose, n = this.impulseDir(tc.c), dtc = t - tc.t;
      // around the contact: arrive from behind the impulse, give with the ball after it (the touch is a movement, not a stamp)
      const g = dtc < 0 ? -EB.give * s5(clamp(-dtc / 0.06, 0, 1)) : EB.give * s5(clamp(dtc / 0.06, 0, 1)), tgt = [P.ank[0] + n[0] * g, P.ank[1] + n[1] * g];
      p = [p[0] + (tgt[0] - Bm.p[0]) * w, p[1] + (tgt[1] - Bm.p[1]) * w]; h += (P.ank[2] - Bm.h) * w; yaw += wrapA(P.yaw - Bm.yaw) * w; pitch = lerp(pitch, P.pitch, w); if (abs(dtc) < DT) contact = true; }
    return { ank: [p[0], p[1], h], yaw, pitch, toe: 0, planted: false, contact };
  }
  // how much a foot is "at the ball" now (1 at a contact, fading over ±0.07 s): its leg must reach the contact pose
  touchW(X, t) { let w = 0; for (const s of this.seg[X]) if (s.kind === "swing" && s.touches) for (const tc of s.touches) { const d = abs(t - tc.t); if (d < 0.07) w = max(w, 1 - s5(d / 0.07)); } return w; }
  pivotTo(at, yaw1) { const q = this.pivotFoot(at, yaw1, 1, 0); return { pos: [q.ank[0], q.ank[1]], yaw: q.yaw }; }
  pivotFoot(at, yaw1, w, lift) {
    const y0 = at.yaw, yaw = y0 + wrapA(yaw1 - y0) * w, my = this.mtpY, mz = this.mtpZ, ball = [at.pos[0] + dir(y0)[0] * mz, at.pos[1] + dir(y0)[1] * mz];
    const p = Math.asin(clamp(lift / Math.hypot(my, mz), 0, 0.5)), back = mz * Math.cos(p) - my * Math.sin(p), up = my * Math.cos(p) + mz * Math.sin(p);
    return { ank: [ball[0] - dir(yaw)[0] * back, ball[1] - dir(yaw)[1] * back, HB.ankleH - my + up], yaw, pitch: -p, toe: p, planted: true, pivot: true, ballPt: ball };
  }
  // ── weight (RECEIVE-TURN-1.1's): a planted foot loads after touchdown and unloads before lift-off ─────────────────────────────────────────────
  loadOf(X, t) { const L = this.seg[X]; let lastTD = this.init.feet[X].plant ? -9 : null, nextLift = 9;
    for (const s of L) { if (s.kind === "pivot") continue; if (s.t1 <= t) lastTD = s.t1; if (s.t0 > t) nextLift = min(nextLift, s.t0); if (s.t0 <= t && t < s.t1) return 0; }
    if (lastTD == null) return 0; return clamp((t - lastTD) / HB.load, 0, 1) * clamp((nextLift - t) / HB.unload, 0, 1); }
  weights(t) { const r = this.loadOf("R", t), l = this.loadOf("L", t), s = r + l; if (s >= 1e-6) return { R: r / s, L: l / s };
    const h = 1 / 480; let ta = null, tb = null, fa = null, fb = null;
    for (let x = t - h, k = 0; k < 120; k++, x -= h) { const rr = this.loadOf("R", x), ll = this.loadOf("L", x); if (rr + ll >= 1e-6) { ta = x; fa = rr >= ll ? "R" : "L"; break; } }
    for (let x = t + h, k = 0; k < 120; k++, x += h) { const rr = this.loadOf("R", x), ll = this.loadOf("L", x); if (rr + ll >= 1e-6) { tb = x; fb = rr >= ll ? "R" : "L"; break; } }
    if (ta == null || tb == null) return { R: 0.5, L: 0.5 }; const wR = lerp(fa === "R" ? 1 : 0, fb === "R" ? 1 : 0, sstep(ta, tb, t)); return { R: wR, L: 1 - wR }; }
  // ── the pose at tAbs (relative to the episode start) ──────────────────────────────────────────────────────────────────────────────────────
  poseAt(tAbs, ballLocal) {
    const E = this.E, R3 = E.R3, b = this.b, ep = this.ep, t = tAbs - this.tc, rot = {};
    const feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, w = this.weights(t);
    const S = ep.rootAt(t), Fw = [w.R * feet.R.ank[0] + w.L * feet.L.ank[0], w.R * feet.R.ank[1] + w.L * feet.L.ank[1]];
    let P = [S[0] + (Fw[0] - S[0]) * HB.comPull, S[1] + (Fw[1] - S[1]) * HB.comPull];
    const psi = ep.psiAt(t), V = ep.velAt(t), sp = len2(V), run = clamp(sp / 5.5, 0, 1), sg = this.sig;
    // the body's acceleration in its own frame (braking / driving, turning) — the lean and the roll follow it
    const V0 = ep.velAt(t - 0.05), V1 = ep.velAt(t + 0.05), acc = [(V1[0] - V0[0]) / 0.1, (V1[1] - V0[1]) / 0.1], aF = acc[0] * Math.cos(psi) + acc[1] * Math.sin(psi), aL = -acc[0] * Math.sin(psi) + acc[1] * Math.cos(psi);
    // shoulders lead the hips into the turn (what remains of it), counter-rotate through a through-stance contact, then lead out
    const remain = wrapA(this.th - psi), tw = clamp(EB.shoulderLead * remain, -35 * DEG, 35 * DEG) * (t > -0.6 ? 1 : 0.3) - (this.T.fid === "THROUGH_TURN" ? sg * 12 * DEG * Math.exp(-Math.pow((t - 0.02) / 0.08, 2)) : 0);
    // flexion: deep around the plant / the contact and through the rotation, with the braking; lean forward into the drive, back against the brake
    const turnDemand = clamp(abs(wrapA(this.th - ep.psiAt(-0.3))) / Math.PI, 0, 1), deep = Math.exp(-Math.pow(t / 0.35, 2)), crouch = 0.025 + EB.crouchTurn * turnDemand * deep + EB.crouchBrake * clamp(-aF, 0, 8) * 0.5;
    const lean = clamp(4 + 6 * run + 1.6 * aF, -10, 22) * DEG, roll = clamp(-aL * 2.2, -24, 24) * DEG;
    const tDip = max(this.touchW("R", t), this.touchW("L", t));
    let pelvis = [0, b.pelvisY - 0.02 - crouch - 0.03 * tDip + 0.015 * run, 0.02 * run];
    const c = Math.cos(psi), s = Math.sin(psi), toM = (q, Pr) => { const dx = q[0] - Pr[0], dy = q[1] - Pr[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
    let Rp = R3.mul3(R3.y(tw * 0.25), R3.x(lean * 0.35), R3.z(-roll * 0.5)); rot.pelvis = Rp; rot.spine = R3.mul(R3.y(tw * 0.35), R3.x(lean * 0.3)); rot.chest = R3.mul3(R3.y(tw * 0.40), R3.x(lean * 0.35), R3.z(-roll * 0.3));
    // arms: balance around the contacts and the plant (the arm on the outside of the turn swings across), counter-swing on the run
    const act = clamp(1 - abs(t - 0.05) / 0.7, 0, 1), sw = (X) => { if (run < 0.05) return 0; const f = feet[X === "R" ? "L" : "R"]; return clamp(toM(f.ank, P)[2] * 1.4, -0.9, 0.9) * run; };
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, outside = sx === -sg ? 1 : 0, abd = 12 + 16 * act + 10 * act * outside, flex = -2 + 18 * act * outside;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-flex * DEG - sw(X) * 42 * DEG), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(30 + 50 * run + 10 * act) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    // head: the ball through the sequence, then ahead along the exit
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05], tEnd = ep.exit ? ep.exit.t : 9;
    let look = ballLocal ? ballLocal.slice() : null; if (look && t > tEnd + 0.05) { const v = sstep(tEnd + 0.05, tEnd + 0.35, t); look = [lerp(look[0], P[0] + dir(psi)[0] * 4, v), lerp(look[1], P[1] + dir(psi)[1] * 4, v), lerp(look[2], 0.4, v)]; }
    if (look) { const q = toM(look, P), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -80 * DEG, 80 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -55 * DEG, 60 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    // blends of the pelvis and the upper body: in from TURN-1.2's pose at the start of a moving action, out into the pose of the TURN-1.2 actor
    // that takes the body; the LEGS are never blended — they always reach this plan's feet (the plants are TURN-1.2's own plants at both ends)
    let pose = { rot, pelvisPos: pelvis };
    if (this.moving && this.init.pose && tAbs < EB.blendIn) pose = blendPose(this.init.pose, pose, s5(tAbs / EB.blendIn));
    if (this.end && t > this.end.t - EB.blendOut) pose = blendPose(pose, this.end.pose, s5((t - (this.end.t - EB.blendOut)) / EB.blendOut));
    Rp = pose.rot.pelvis; pelvis = pose.pelvisPos.slice();
    // keep planted (and touching) feet within reach: move the pelvis (never the foot, never the ball), lower it a little if needed — after the blends
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wT = this.touchW(X, t), wC = max(fX.planted ? 1 : fX.since != null ? max(1 - s5(fX.since / 0.06), s5(1 - fX.until / 0.06)) : 0, wT); if (wC <= 0) continue;
        const sx = X === "R" ? 1 : -1, hipM = [pelvis[0] + sx * b.hipX * Math.cos(tw * 0.3), pelvis[1], pelvis[2]], an = toM(fX.ank, P), d = hyp(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = HB.reach * b.legLen;
        if (d > lim) { const ex = (d - lim) * wC, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = hyp(hx, hz) || 1, dr = min(0.05, ex * 0.5), ex2 = max(0, ex - dr), mx = hx / hl * ex2, mz = hz / hl * ex2;
          dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; }
    const legRot = {};
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [sx * b.hipX, 0, 0])), an = toM(ft.ank, P), yaw = wrapA(ft.yaw - psi), Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0)));
      let ps = yaw - tw * 0.25; ps = sx > 0 ? clamp(ps, -55 * DEG, 85 * DEG) : clamp(ps, -85 * DEG, 55 * DEG);
      const ik = E.r1LegIK(b, Rp, ps, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      legRot["thigh_" + X] = ik.Rthigh; legRot["shin_" + X] = ik.Rshin; legRot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); legRot["toe_" + X] = R3.x(-(ft.toe || 0)); }
    pose = { rot: Object.assign({}, pose.rot, legRot), pelvisPos: pelvis };
    const out = this.finish(P, psi, pose); out.S = P; out.psi = psi; out.feet = feet; out.w = w; out.twist = tw; out.crouch = crouch; out.t = t; return out;
  }
  finish(P, psi, pose) {
    const E = this.E, b = this.b, F = this.F, Fp = F.pitch(P), rootM = E.r1RootMatrix(Fp[0], Fp[1], F.h + psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: F.loc([w[0], w[1], -w[2]]), t: F.loc([tp[0], tp[1], -tp[2]]) }; }
    return { skin, J, pose };
  }
}

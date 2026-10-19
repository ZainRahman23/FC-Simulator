// ═══ technical_control1/tc_body.js — TECHNICAL-CONTROL-1: the HUMAN BODY of fast technical control (presentation only) ═════════════════════════════
// Why RECEIVE-ELITE-1's body looked robotic at a high cadence (owner §3, PHASE 3): each touch was a "hat" offset bolted onto a generic swing — the
// foot left its swing path, met the ball and went back to the same pre-computed landing (spot accelerations of 100+ m/s² at 0.15 – 0.25 s
// cadence: snapping); the touching foot then landed where the run would have put it, not where the touch left it; the pelvis neither bobbed nor
// twisted with the steps, the arms barely moved, and the upper body did not react to the touches.
// This body reads the authoritative contract only — the gait (each foot's lift / land times), the contacts (time, foot, surface, role, the ball's
// exact or predicted position, the impulse), the actions, the root path and the facing — and builds:
//   · FEET — a planted foot is locked (heel rising about the ball of the foot before toe-off; a pivot about it in a turn); a swing is ONE C¹ curve
//     (cubic Hermite through keyframes): toe-off → [a plain swing: mid-swing under the hip | a touch: the preparation behind the ball, the CONTACT
//     moving along the impulse (the foot plays through the ball), the follow-through] → the landing. A touching foot lands just past the ball's
//     contact point, beside the ball's new path — the stride and the touch are one movement (stride → preparation → contact → recovery into stride)
//   · PELVIS — the root path, pulled toward the loaded foot; a vertical bob over the step cycle (lowest at mid-stance), a yaw oscillation with the
//     swinging leg, a drop into plants, cuts and touches
//   · TRUNK / SHOULDERS — counter-rotation against the pelvis (the arms swing), the lean from the body's acceleration (back while braking, forward
//     into the drive), the roll into the turn; per action: the shoulders lead a cut, a drag stays upright over the ball, a feint drops the
//     shoulder to the false side, a Cruyff turns the shoulders through
//   · ARMS — counter-swing with the legs at speed, balance out in the actions; HEAD — the ball while it is close, ahead in a stride carry
//   · LEGS — IK (RUN-1.3's rig) to the feet; the pelvis moves (never a planted foot, never the ball) when a planted or touching leg would be out of reach
// Nothing here is read by the simulation (tools/tc_neutral.mjs: animation ON / OFF identical).
import { HB } from "../receive_turn11/rt11_body.js";
import { DEG, clamp, s5, wrapA, dir, sgnF } from "../receive_turn1/rt_actions.js";
import { predictK } from "../receive_control2/rc2_episode.js";
import { TC } from "./tc_core.js";
const DT = 1 / 240, R = 0.11, SIDES = ["R", "L"], hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a)), hdg = (v) => Math.atan2(v[1], v[0]), other = (F) => (F === "R" ? "L" : "R");
// rotations (row-major 3×3, RUN-1.3's R3): slerp for the blends with TURN-1.2's poses
const mm = (A, B) => [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8], A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8], A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
const tr = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
function rlog(Rm) { const c = clamp((Rm[0] + Rm[4] + Rm[8] - 1) / 2, -1, 1), a = Math.acos(c); if (a < 1e-9) return [0, 0, 0]; if (Math.PI - a < 1e-6) { const x = Math.sqrt(max(0, (Rm[0] + 1) / 2)), y = Math.sqrt(max(0, (Rm[4] + 1) / 2)), z = Math.sqrt(max(0, (Rm[8] + 1) / 2)); return [x * a, y * a, z * a]; } const s = 2 * Math.sin(a); return [(Rm[7] - Rm[5]) / s * a, (Rm[2] - Rm[6]) / s * a, (Rm[3] - Rm[1]) / s * a]; }
function rexp(r) { const a = hyp(r[0], r[1], r[2]); if (a < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1]; const x = r[0] / a, y = r[1] / a, z = r[2] / a, c = Math.cos(a), s = Math.sin(a), C = 1 - c; return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]; }
const slerp = (A, B, t) => { if (t <= 0) return A; if (t >= 1) return B; const d = rlog(mm(tr(A), B)); return mm(A, rexp([d[0] * t, d[1] * t, d[2] * t])); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const blendPose = (A, B, t) => { if (!A || t <= 0) return A || B; if (t >= 1) return B; const rot = {}; for (const k of Object.keys(B.rot)) rot[k] = A.rot[k] ? slerp(A.rot[k], B.rot[k], t) : B.rot[k]; return { rot, pelvisPos: lerp3(A.pelvisPos, B.pelvisPos, t) }; };
// cubic Hermite of a 3-vector between keyframes (position, velocity) over [ta, tb]
function herm3(a, b, t) { const T = b.t - a.t, u = clamp((t - a.t) / T, 0, 1), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map((i) => h00 * a.p[i] + h10 * T * a.v[i] + h01 * b.p[i] + h11 * T * b.v[i]); }
export const TB = { blendIn: 0.14, blendOut: 0.12, lead: [0.08, 0.042], leadMax: 0.27, plantReach: 0.34, width: 0.095, widthPlant: 0.15, lift: [0.07, 0.016, 0.16], prep: 0.075, follow: 0.05, footSpeedK: 0.55, landBeside: 0.11, heelTO: 0.06,
  bob: [0.012, 0.0055, 0.045], twist: [3, 1.1, 10], armSwing: [8, 7, 50], comPull: 0.32, crouchAct: 0.045, crouchTouch: 0.022, leanAcc: 1.5, rollLat: 2.0 };
export class TechBody {
  constructor(sim, ep, F) {
    const E = sim.cfg.E, skel = sim.cfg.skel, c2 = sim.rc2; this.sim = sim; this.E = E; this.M4 = sim.cfg.M4; this.b = skel._kbody || (skel._kbody = E.r1Body(skel)); this.ep = ep; this.F = F; this.fk = null;
    this.mtpY = abs(this.b.mtp[1]); this.mtpZ = this.b.mtp[2]; this.mode = ep.mode || (c2.eliteFrom === "DRIBBLE" ? "dribble" : "receive"); this.tc = (c2.kc - c2.k0) * DT;
    if (!c2.techInit) c2.techInit = this.startState(sim, c2); this.init = c2.techInit;
    this.contactsKnown = this.knownContacts(sim); this.buildEnd(sim); this.buildFeet(); this.buildActions();
  }
  // ── CONTINUITY ACROSS RE-PLANS: the episode re-plans after each contact (the body is rebuilt); a foot that has already landed keeps its foothold,
  // a swing in progress continues from where the previous body had the foot NOW, at its velocity (a C¹ hand-over — never a pop)
  inherit(prev, tNow) {
    if (!prev || !prev.seg) return; const eps = 1e-6;
    for (const X of SIDES) { const S = this.seg[X], O = prev.seg[X];
      for (const s of S) { if (s.t1 > tNow + eps) continue; const o = O.find((q) => abs(q.t1 - s.t1) < 1e-4); if (o) { s.to = { pos: o.to.pos.slice(), yaw: o.to.yaw }; } }
      for (let i = 1; i < S.length; i++) if (S[i - 1].t1 <= tNow + eps) { S[i].from = S[i - 1].to; }
      const s = S.find((q) => q.t0 <= tNow && q.t1 > tNow); if (!s) continue; const o = O.find((q) => q.t0 <= tNow && q.t1 > tNow && abs(q.t1 - s.t1) < 0.08);
      s.keys = this.swingKeys(X, s);
      if (o) { const f0 = prev.footAt(X, tNow - DT), f1 = prev.footAt(X, tNow + DT), f = prev.footAt(X, tNow), v = [0, 1, 2].map((k) => (f1.ank[k] - f0.ank[k]) / (2 * DT));
        const rest = s.keys.filter((k) => k.t > tNow + 0.025), now = { t: tNow, p: f.ank.slice(), v, yaw: f.yaw, pitch: f.pitch || 0 }; s.keys = [{ t: s.t0, p: f.ank.slice(), v, yaw: f.yaw, pitch: f.pitch || 0 }, now].concat(rest);
        if (s.keys.length < 3) s.keys.push({ t: s.t1, p: [s.to.pos[0], s.to.pos[1], HB.ankleH], v: [0, 0, -0.4], yaw: s.to.yaw, pitch: 0 }); s.inherited = tNow; }
      else { // the re-plan lifts a foot the previous body still had down: the swing starts NOW, from where the foot is, at its velocity
        const f0 = prev.footAt(X, tNow - DT), f1 = prev.footAt(X, tNow + DT), f = prev.footAt(X, tNow), v = [0, 1, 2].map((k) => (f1.ank[k] - f0.ank[k]) / (2 * DT));
        s.t0 = tNow; s.from = { pos: [f.ank[0], f.ank[1]], yaw: f.yaw }; s.keys = this.swingKeys(X, s); const rest = s.keys.filter((k) => k.t > tNow + 0.03);
        s.keys = [{ t: tNow, p: f.ank.slice(), v, yaw: f.yaw, pitch: f.pitch || 0 }].concat(rest);
        if (s.keys.length < 2) s.keys.push({ t: s.t1, p: [s.to.pos[0], s.to.pos[1], HB.ankleH], v: [0, 0, -0.4], yaw: s.to.yaw, pitch: 0 }); s.inherited = tNow; } }
  }
  // ── where the body starts: TURN-1.2's feet and pose (a moving receive), the ready stance (standing), the dribble start (the gait's first plants)
  startState(sim, c2) {
    const A = sim.A, F = this.F, st = { pose: null, feet: {} }, moving = c2.eliteFrom === "MOVING";
    if (moving) { st.pose = A.pose ? { rot: Object.assign({}, A.pose.rot), pelvisPos: A.pose.pelvisPos.slice() } : null;
      for (const X of SIDES) { const L = A.legs[X]; if (L.stance && L.plant) { const p = F.loc([L.plant.pos[0], 0, L.plant.pos[1]]); st.feet[X] = { pos: [p[0], p[1]], yaw: L.plant.yaw - F.h }; }
        else { const fr = sim.framesPrev && sim.framesPrev["foot_" + X], p = fr ? F.loc([fr.p[0], fr.p[1], -fr.p[2]]) : F.loc([A.P[0], 0.1, A.P[1]]); st.feet[X] = { pos: [p[0], p[1]], yaw: (L._yawW != null ? L._yawW : A.psi) - F.h, air: max(HB.ankleH, p[2]) }; } } }
    else { const ep = this.ep, t0 = -this.tc - 0.2, P = ep.rootAt(t0), psi = ep.psiAt(t0), c = Math.cos(psi), s = Math.sin(psi), dribble = c2.eliteFrom === "DRIBBLE";
      for (const X of SIDES) { const o = dribble ? [X === ep.tech.F0 ? -0.18 : 0.10, sgnF(X) * TB.width] : [(sgnF(X) === (ep.tech.sig || 1) ? -1 : 1) * HB.ready.stagger, sgnF(X) * HB.ready.width]; st.feet[X] = { pos: [P[0] + o[0] * c - o[1] * s, P[1] + o[0] * s + o[1] * c], yaw: psi + sgnF(X) * 6 * DEG }; } }
    return st;
  }
  // the contacts the body plays: executed (exact ball, executed impulse) and the next one planned (the kernel's exact prediction; the episode's preview)
  knownContacts(sim) {
    const ep = this.ep, out = ep.contacts.map((c) => ({ i: c.i, t: c.t, F: c.F, surface: c.surface, role: c.role || (c.ideal && c.ideal.kind === "EXIT" ? "exit" : "carry"), ball: [c.B[0], c.B[1], max(R, c.B[2])], vIn: c.vIn.slice(0, 2), vOut: c.vExec.slice(0, 2) }));
    const nx = ep.next || ep.pending; if (nx && !ep.done && !ep.failed) { const n = nx.k - sim.W.tick; if (n >= 0 && n < 720) { const P = predictK(sim.W, (n + 1) * DT, this.F), b = P[n];
      if (b) { const pv = ep.preview ? ep.preview(nx, b) : null; out.push({ i: nx.i, t: nx.t, F: nx.F, surface: pv ? pv.surface : "INSIDE", role: nx.role || "carry", ball: [b.p[0], b.p[1], max(R, b.p[2])], vIn: [b.v[0], b.v[1]], vOut: pv ? pv.v : [b.v[0], b.v[1]], planned: true }); } } }
    if (!out.some((c) => c.i === 0) && ep.c0Preview) out.unshift(Object.assign({ role: "receive" }, ep.c0Preview));
    return out;
  }
  // the TURN-1.2 actor that takes the body at the bridge's switch (its pose is what the body blends into; its plants are where the feet go)
  buildEnd(sim) { this.end = null; const x = this.ep.exit; if (!x || !sim.T1) return;
    const P = this.F.pitch(this.ep.rootAt(x.tSw)), V = this.ep.velAt(x.tSw), v = max(2.5, hyp(V[0], V[1]));
    try { const A1 = sim.T1.t1Make(sim.cfg.skel, { v, heading: sim.rx.exitDir, pos: P, foot: x.foot, turn12: true }), p = sim.T1.t1Pose(A1), F = this.F, Lf = (pl) => { const q = F.loc([pl.pos[0], 0, pl.pos[1]]); return { pos: [q[0], q[1]], yaw: pl.yaw - F.h }; };
      const o = A1.legs[other(x.foot)]; this.end = { t: x.tSw, foot: x.foot, pose: { rot: p.rot, pelvisPos: p.pelvisPos.slice() }, plant: Lf(A1.legs[x.foot].plant), prev: o && o.prevPlant ? Lf(o.prevPlant) : null }; } catch (e) { this.end = null; } }
  impulseDir(c) { const dv = [c.vOut[0] - c.vIn[0], c.vOut[1] - c.vIn[1]], l = hyp(dv[0], dv[1]); return l > 1e-6 ? [dv[0] / l, dv[1] / l] : dir(this.ep.psiAt(c.t)); }
  // the contact foot's pose for a surface (RECEIVE-TURN-1.1's contactFoot): the surface faces the impulse, the boot meets the ball's surface
  contactPose(F, s, c, n) {
    const sg = sgnF(F); let h = Math.max(0.10, c[2] - 0.03), phi, ank, pitch = 4 * DEG;
    if (s === "INSIDE") { phi = hdg(n) + sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.045) - f[0] * 0.05, c[1] - n[1] * (R + 0.045) - f[1] * 0.05]; }
    else if (s === "OUTSIDE") { phi = hdg(n) - sg * 90 * DEG; const f = dir(phi); ank = [c[0] - n[0] * (R + 0.04) - f[0] * 0.06, c[1] - n[1] * (R + 0.04) - f[1] * 0.06]; pitch = -6 * DEG; }
    else if (s === "SOLE") { const fw = this.ep.psiAt(0); phi = hdg(n) + Math.PI; ank = [c[0] - 0.03 * n[0], c[1] - 0.03 * n[1]]; pitch = 20 * DEG; return { ank: [ank[0], ank[1], c[2] + R + 0.055], yaw: phi, pitch, sole: true }; }
    else { phi = hdg(n); ank = [c[0] - n[0] * (R + 0.06), c[1] - n[1] * (R + 0.06)]; pitch = -30 * DEG; }
    const tipZ = (hh) => hh - (this.mtpY || 0.057) * Math.cos(pitch) + 0.24 * Math.sin(pitch), floor = HB.ankleH - (this.mtpY || 0.057) + 0.008; if (tipZ(h) < floor) h += floor - tipZ(h);
    return { ank: [ank[0], ank[1], h], yaw: phi, pitch };
  }
  // ── THE FEET: plants (locked) between the authoritative swings; a swing = keyframes through its contact, one C¹ curve ────────────────────────
  buildFeet() {
    const ep = this.ep, seg = { R: [], L: [] }, last = {}; this.seg = seg;
    for (const X of SIDES) { const f = this.init.feet[X]; last[X] = { pos: f.pos.slice(), yaw: f.yaw, air: f.air || null }; }
    const cons = this.contactsKnown, E = this.end, lastOther = E ? ep.swings.filter((q) => q.F !== E.foot && q.t1 < E.t - 1e-6).pop() : null, tStart = -this.tc - 0.05, tNow = (this.sim.k - this.sim.rc2.kc) * DT;
    // a moving receive's RUN-IN: RECEIVE-CONTROL-1.1's touchdowns from the action start into the plant (the standing foot at the contact)
    const act = this.sim.rc2.act, first = ep.swings.find((q) => q.first);
    if (act && act.steps && this.sim.rc2.eliteFrom === "MOVING") { const st = act.steps.steps, m = act.steps.m, Tp = this.tc;
      // (the run-in is presentation: its steps keep the leg's reach — a stance lifts once the body has passed over it, the plant lands when the body
      // is within reach of the standing spot, never parked ahead of it)
      const lastTD = { R: tStart, L: tStart }, vAt = (t) => max(0.5, hyp(...ep.velAt(t))), fwdOf = (pos, t) => { const R0 = ep.rootAt(t), V = ep.velAt(t), v = hyp(V[0], V[1]), h = v > 1 ? [V[0] / v, V[1] / v] : dir(ep.psiAt(t)); return (pos[0] - R0[0]) * h[0] + (pos[1] - R0[1]) * h[1]; };
      for (let i = 1; i <= m; i++) { const q = st[i], prev = st.slice(0, i).reverse().find((x) => x.F === q.F), X = q.F; let tLift = prev ? prev.t + prev.d - Tp : tStart, tTD = q.t - Tp; if (first && X === first.F && tTD > first.t0 - 0.02) continue;
        tLift = min(tLift, lastTD[X] + TC.gait.stanceLen / vAt(lastTD[X] + 0.05)); const plant = i === m && ep.tech.stand;
        if (plant) { const lim = -0.05; while (tTD < lim && fwdOf(ep.tech.stand, tTD) > TB.plantReach) tTD = min(lim, tTD + DT); }
        const to = plant ? { pos: ep.tech.stand.slice(), yaw: ep.psiAt(0) - sgnF(X) * 6 * DEG } : this.landAt(X, tTD), sw = { kind: "swing", t0: max(tStart, min(tLift, tTD - 0.16)), t1: tTD, from: last[X], to, con: null, runIn: true };
        sw.keys = this.swingKeys(X, sw); seg[X].push(sw); last[X] = { pos: to.pos.slice(), yaw: to.yaw }; lastTD[X] = tTD; } }
    for (const s of ep.swings) { if (s.t1 < tStart) continue; if (s.t0 > tNow + 3.0) break; const X = s.F, from = last[X]; if (seg[X].length && s.t1 <= seg[X][seg[X].length - 1].t1 + 1e-6) continue;
      const cs = cons.filter((c) => c.F === X && c.t > s.t0 + 0.005 && c.t <= s.t1 + 0.002 && !(s.first && c.i !== 0)), con = cs[cs.length - 1] || (s.first ? cons.find((c) => c.i === 0) : null);
      let to; if (E && X === E.foot && abs(s.t1 - E.t) < 1e-6) to = E.plant; else if (E && E.prev && s === lastOther) to = E.prev; else to = con ? this.landAfterTouch(X, con, s) : this.landAt(X, s.t1);
      const sw = { kind: "swing", t0: max(s.t0, tStart), t1: s.t1, from, to, con, keys: null }; sw.keys = this.swingKeys(X, sw); seg[X].push(sw); last[X] = { pos: to.pos.slice(), yaw: to.yaw }; }
  }
  // a plain landing: ahead of the centre of mass by the speed's stride lead, on the foot's side (wider through a plant / a turn)
  landAt(X, t) { const ep = this.ep, P = ep.rootAt(t), V = ep.velAt(t), v = hyp(V[0], V[1]), psi = ep.psiAt(t), h = v > 1.5 ? hdg(V) : psi, turning = abs(wrapA(psi - h)) > 15 * DEG || ep.braking && ep.braking(t),
      lead = min(TB.leadMax, TB.lead[0] + TB.lead[1] * v), w = turning ? TB.widthPlant : TB.width, side = [-Math.sin(psi) * sgnF(X) * w, Math.cos(psi) * sgnF(X) * w];
    return { pos: [P[0] + Math.cos(h) * lead + side[0], P[1] + Math.sin(h) * lead + side[1]], yaw: psi + sgnF(X) * 5 * DEG }; }
  // a touching foot lands just past where it played the ball, beside the ball's new path (it does not cross it), facing the movement
  // a touching foot plants where its own motion takes it after the touch (it carries on along the push for the landing interval), clear of the
  // ball's new path (on the side it played from)
  landAfterTouch(X, c, s) {
    const n = this.impulseDir(c), P = this.contactPose(X, c.surface, c.ball, n), ep = this.ep, psi = ep.psiAt(s.t1), V = ep.velAt(s.t1), v = hyp(V[0], V[1]), mv = v > 1.0 ? [V[0] / v, V[1] / v] : dir(psi);
    const vf = this.footSpeed(c), dl = s.t1 - c.t, d = clamp(vf * dl * 0.75, 0.05, 0.32), mix = [n[0] * 0.5 + mv[0] * 0.5, n[1] * 0.5 + mv[1] * 0.5], ml = hyp(mix[0], mix[1]) || 1;
    let pos = [P.ank[0] + mix[0] / ml * d, P.ank[1] + mix[1] / ml * d]; const R1 = ep.rootAt(s.t1), fR = (pos[0] - R1[0]) * mv[0] + (pos[1] - R1[1]) * mv[1];
    if (fR > TB.leadMax) pos = [pos[0] - mv[0] * (fR - TB.leadMax), pos[1] - mv[1] * (fR - TB.leadMax)]; // within the leg's reach ahead of the body (RUN-1 lands ≈ 0.23 – 0.25 m ahead)
    const ball = c.ball, ul = hyp(c.vOut[0], c.vOut[1]), un = ul > 0.2 ? [c.vOut[0] / ul, c.vOut[1] / ul] : mv;
    const latOf = (q) => -(q[0] - ball[0]) * un[1] + (q[1] - ball[1]) * un[0], sideP = Math.sign(latOf(P.ank)) || sgnF(X), lat = latOf(pos); if (lat * sideP < 0.09) { const k = sideP * 0.09 - lat; pos = [pos[0] - un[1] * k, pos[1] + un[0] * k]; }
    return { pos, yaw: (v > 1.0 ? hdg(mv) : psi) + sgnF(X) * 6 * DEG };
  }
  footSpeed(c) { return clamp(TB.footSpeedK * hyp(c.vOut[0], c.vOut[1]) + 0.6 * hyp(...this.ep.velAt(c.t)), 0.6, 6.5); }
  // the KEYFRAMES of a swing: toe-off (the heel risen about the ball of the foot) → [mid-swing | preparation → CONTACT → follow-through] → landing
  swingKeys(X, sw) {
    const ep = this.ep, T = sw.t1 - sw.t0, v = hyp(...ep.velAt(sw.t0 + T / 2)), lift = clamp(TB.lift[0] + TB.lift[1] * v, 0.05, TB.lift[2]), from = sw.from, to = sw.to;
    const a0 = from.air != null ? [from.pos[0], from.pos[1], from.air] : this.toeOffAnkle(from, hyp(...ep.velAt(sw.t0))), keys = [{ t: sw.t0, p: a0, v: [0, 0, 0.25], yaw: from.yaw, pitch: from.air != null ? 0 : -18 * DEG }];
    const c = sw.con; if (c) { const n = this.impulseDir(c), P = this.contactPose(X, c.surface, c.ball, n), vf = this.footSpeed(c);
      // the preparation: the foot's backswing RELATIVE TO THE BODY (≤ 0.16 m against the impulse) plus the body's own travel to the contact — at a
      // sprint the foot is still well behind the contact point 75 ms before it, under the hip, never parked ahead of the body
      const tPrep = max(sw.t0 + 0.4 * (c.t - sw.t0), c.t - TB.prep), dtP = c.t - tPrep, vB = ep.velAt(c.t), soleK = P.sole ? 0.5 : 1, vRel = max(0.4, vf - max(0, n[0] * vB[0] + n[1] * vB[1])) * soleK, dPrep = min(0.16, vRel * dtP * 0.8);
      const Pk = [P.ank[0] - n[0] * dPrep - vB[0] * dtP, P.ank[1] - n[1] * dPrep - vB[1] * dtP], dIn = hyp(Pk[0] - a0[0], Pk[1] - a0[1]) / max(1e-3, tPrep - sw.t0);
      if (tPrep > sw.t0 + 0.04 && dIn < 3.0 * hyp(...ep.velAt(tPrep)) + 3.0) keys.push({ t: tPrep, p: [Pk[0], Pk[1], P.ank[2] + 0.015 + (P.sole ? 0.03 : 0)], v: [vB[0] + n[0] * vRel, vB[1] + n[1] * vRel, -0.1], yaw: P.yaw, pitch: P.pitch * 0.7 });
      keys.push({ t: c.t, p: P.ank.slice(), v: [vB[0] + n[0] * vRel * 0.7, vB[1] + n[1] * vRel * 0.7, 0.05], yaw: P.yaw, pitch: P.pitch, contact: true });
      if (keys[1].t - sw.t0 > 0.09) keys.splice(1, 0, ...this.pathKeys(X, sw, a0, keys[1], v, lift)); // a long swing into the touch: the stride's own path up to the preparation
      if (sw.t1 - c.t > 0.06) keys.push({ t: c.t + 0.45 * (sw.t1 - c.t), p: [lerp(P.ank[0], to.pos[0], 0.55), lerp(P.ank[1], to.pos[1], 0.55), lerp(P.ank[2], HB.ankleH, 0.5) + 0.01], v: [(to.pos[0] - P.ank[0]) / (sw.t1 - c.t) * 0.8, (to.pos[1] - P.ank[1]) / (sw.t1 - c.t) * 0.8, -0.2], yaw: lerp(P.yaw, P.yaw + wrapA(to.yaw - P.yaw), 0.6), pitch: P.pitch * 0.3 }); }
    else if (v >= 2.6) { // RUN-1's swing (heel recovery, knee drive, reach), root-relative, the ends corrected onto this plan's toe-off and landing
      const tm = this.runTemplate(v), at = (w) => { const t = sw.t0 + w * T, P = ep.rootAt(t), psi = ep.psiAt(t), q = tm[Math.round(w * 20)], l = sgnF(X) * abs(q.lat); return { p: [P[0] + q.f * Math.cos(psi) - l * Math.sin(psi), P[1] + q.f * Math.sin(psi) + l * Math.cos(psi), q.up], t }; };
      const A0 = at(0), A1 = at(1), e0 = [a0[0] - A0.p[0], a0[1] - A0.p[1], a0[2] - A0.p[2]], e1 = [to.pos[0] - A1.p[0], to.pos[1] - A1.p[1], HB.ankleH - A1.p[2]], ws = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9], pts = [];
      for (const w of ws) { const A = at(w), k = s5(w); pts.push({ t: A.t, p: [A.p[0] + e0[0] * (1 - k) + e1[0] * k, A.p[1] + e0[1] * (1 - k) + e1[1] * k, max(HB.ankleH, A.p[2] + e0[2] * (1 - k) + e1[2] * k)] }); }
      const all = [{ t: sw.t0, p: a0 }].concat(pts, [{ t: sw.t1, p: [to.pos[0], to.pos[1], HB.ankleH] }]);
      for (let i = 1; i < all.length - 1; i++) { const a = all[i - 1], b = all[i + 1], dt = b.t - a.t, w = (all[i].t - sw.t0) / T; keys.push({ t: all[i].t, p: all[i].p, v: [(b.p[0] - a.p[0]) / dt, (b.p[1] - a.p[1]) / dt, (b.p[2] - a.p[2]) / dt], yaw: from.yaw + wrapA(to.yaw - from.yaw) * s5(w), pitch: (w < 0.3 ? -25 * (1 - w / 0.3) : 8 * Math.sin(Math.PI * w)) * DEG }); } }
    else { const m = [0.5 * (a0[0] + to.pos[0]), 0.5 * (a0[1] + to.pos[1])], d = [(to.pos[0] - a0[0]) / T, (to.pos[1] - a0[1]) / T]; keys.push({ t: sw.t0 + 0.5 * T, p: [m[0], m[1], HB.ankleH + lift], v: [d[0] * 1.5, d[1] * 1.5, 0], yaw: from.yaw + wrapA(to.yaw - from.yaw) * 0.5, pitch: 6 * DEG }); }
    keys.push({ t: sw.t1, p: [to.pos[0], to.pos[1], HB.ankleH], v: [(to.pos[0] - keys[keys.length - 1].p[0]) * 0.8, (to.pos[1] - keys[keys.length - 1].p[1]) * 0.8, -0.45], yaw: to.yaw, pitch: 0 });
    keys.sort((x, y) => x.t - y.t); for (let i = keys.length - 1; i > 0; i--) if (keys[i].t - keys[i - 1].t < 0.012) keys.splice(keys[i].contact ? i - 1 : i, 1);
    return keys;
  }
  // the swing path from the toe-off to a later key kE (the preparation of a touch): RUN-1's swing at a running speed (its ends corrected onto the toe-off
  // and kE), a lifted arc below it — keyed at the stride's fractions that fall before kE
  pathKeys(X, sw, a0, kE, v, lift) {
    const ep = this.ep, T = sw.t1 - sw.t0, wE = (kE.t - sw.t0) / T, ws = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].filter((w) => w < wE - 0.035 / T); if (!ws.length) return [];
    let at; if (v >= 2.6) { const tm = this.runTemplate(v); at = (w) => { const t = sw.t0 + w * T, P = ep.rootAt(t), psi = ep.psiAt(t), q = tm[Math.round(clamp(w, 0, 1) * 20)], l = sgnF(X) * abs(q.lat); return [P[0] + q.f * Math.cos(psi) - l * Math.sin(psi), P[1] + q.f * Math.sin(psi) + l * Math.cos(psi), q.up]; }; }
    else at = (w) => { const u = w / wE, k = s5(u); return [lerp(a0[0], kE.p[0], k), lerp(a0[1], kE.p[1], k), lerp(a0[2], kE.p[2], u) + lift * Math.sin(Math.PI * u)]; };
    const A0 = at(0), AE = at(wE), e0 = [a0[0] - A0[0], a0[1] - A0[1], a0[2] - A0[2]], e1 = [kE.p[0] - AE[0], kE.p[1] - AE[1], kE.p[2] - AE[2]];
    const all = [{ t: sw.t0, p: a0 }].concat(ws.map((w) => { const A = at(w), k = s5(w / wE); return { t: sw.t0 + w * T, w, p: [A[0] + e0[0] * (1 - k) + e1[0] * k, A[1] + e0[1] * (1 - k) + e1[1] * k, max(HB.ankleH, A[2] + e0[2] * (1 - k) + e1[2] * k)] }; }), [{ t: kE.t, p: kE.p }]), out = [];
    for (let i = 1; i < all.length - 1; i++) { const a = all[i - 1], b = all[i + 1], dt = b.t - a.t, w = all[i].w; out.push({ t: all[i].t, p: all[i].p, v: [(b.p[0] - a.p[0]) / dt, (b.p[1] - a.p[1]) / dt, (b.p[2] - a.p[2]) / dt], yaw: sw.from.yaw + wrapA(kE.yaw - sw.from.yaw) * s5(w / wE), pitch: (w < 0.3 ? -25 * (1 - w / 0.3) : 8 * Math.sin(Math.PI * w)) * DEG }); }
    return out;
  }
  toeOffLift(v) { return clamp(0.03 + 0.024 * v, 0.05, 0.19); }
  toeOffAnkle(pl, v) { const q = this.pivotFoot(pl, pl.yaw, 1, this.toeOffLift(v || 0)); return q.ank; }
  // RUN-1's swing foot path at speed v (the frozen running gait's own swing, sampled once per 0.25 m/s): the ankle relative to the root, forward /
  // up / outward, over the swing fraction w — the dribbling stride is RUN-1's stride
  runTemplate(v) { const key = Math.round(clamp(v, 3, 9.5) * 4) / 4, cache = TechBody._tmpl || (TechBody._tmpl = new Map()); if (cache.has(key)) return cache.get(key);
    const E = this.E, b = this.b, G = E.r1GaitAt(b, E.RUN1.ref, key), rootM = E.r1RootMatrix(0, 0, 0, 0), ix = b.idx.foot_R, out = [];
    for (let i = 0; i <= 20; i++) { const w = i / 20, u = G.D + w * (1 - G.D), pz = E.r1Pose({ body: b, p: G }, u, null), fk = E.r1FK({ body: b, p: G }, pz, rootM, null), j = fk.joint[ix]; out.push({ f: j[0], up: j[1], lat: -j[2] }); }
    cache.set(key, out); return out; }
  pivotFoot(at, yaw1, w, lift) {
    const y0 = at.yaw, yaw = y0 + wrapA(yaw1 - y0) * w, my = this.mtpY, mz = this.mtpZ, ball = [at.pos[0] + dir(y0)[0] * mz, at.pos[1] + dir(y0)[1] * mz];
    const p = Math.asin(clamp(lift / Math.hypot(my, mz), 0, 0.9)), back = mz * Math.cos(p) - my * Math.sin(p), up = my * Math.cos(p) + mz * Math.sin(p);
    return { ank: [ball[0] - dir(yaw)[0] * back, ball[1] - dir(yaw)[1] * back, HB.ankleH - my + up], yaw, pitch: -p, toe: p, planted: true, pivot: true, ballPt: ball };
  }
  // ── THE ACTIONS' choreography windows (from the episode's decisions) ─────────────────────────────────────────────────────────────────────────
  buildActions() { const ep = this.ep; this.acts = (ep.techLog || []).filter((e) => e.ev === "action").map((e) => ({ fam: e.fam, sg: e.sg, t0: e.t, tc: e.tc })); if (ep.act) this.acts.push({ fam: ep.act.fam, sg: ep.act.sg, t0: ep.act.t0, tc: ep.act.contacts[0].tc });
    this.acts = this.acts.filter((a, i, A) => A.findIndex((b) => b.fam === a.fam && abs(b.tc - a.tc) < 1e-6) === i); }
  actW(t) { let best = null; for (const a of this.acts) { const w = t < a.tc ? sstep(a.t0, a.tc, t) : 1 - sstep(a.tc + 0.05, a.tc + 0.4, t); if (w > 0.01 && (!best || w > best.w)) best = { a, w }; } return best; }
  // ── a foot at time t (relative to the first contact) ────────────────────────────────────────────────────────────────────────────────────────
  footAt(X, t) {
    const L = this.seg[X]; let pl = { pos: this.init.feet[X].pos, yaw: this.init.feet[X].yaw }, air = this.init.feet[X].air, next = null, prevEnd = -9;
    for (const s of L) { if (t < s.t0) { next = s; break; } if (t >= s.t1) { pl = s.to; air = null; prevEnd = s.t1; continue; }
      const K = s.keys; let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const a = K[i], b = K[i + 1], p = herm3(a, b, t), u = sstep(a.t, b.t, t);
      return { ank: [p[0], p[1], max(HB.ankleH - 0.012, p[2])], yaw: a.yaw + wrapA(b.yaw - a.yaw) * u, pitch: lerp(a.pitch, b.pitch, u), toe: 0, planted: false, since: t - s.t0, until: s.t1 - t, contact: !!(b.contact && abs(t - b.t) < DT) }; }
    if (air != null && !L.some((s) => s.t1 <= t)) return { ank: [pl.pos[0], pl.pos[1], air], yaw: pl.yaw, pitch: 0, toe: 0, planted: false };
    // planted: flat, the heel rising about the ball of the foot over the last heelTO s before the next lift-off (a toe-off)
    if (next && t > next.t0 - TB.heelTO) { const w = sstep(next.t0 - TB.heelTO, next.t0, t); return this.pivotFoot(pl, pl.yaw, 1, this.toeOffLift(hyp(...this.ep.velAt(next.t0))) * w); }
    return { ank: [pl.pos[0], pl.pos[1], HB.ankleH], yaw: pl.yaw, pitch: 0, toe: 0, planted: true, ballPt: [pl.pos[0] + dir(pl.yaw)[0] * this.mtpZ, pl.pos[1] + dir(pl.yaw)[1] * this.mtpZ], landed: prevEnd };
  }
  // ── weight and the step cycle ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  loadOf(X, t) { const L = this.seg[X]; let lastTD = L.length && L[0].t0 > t ? -9 : -9, nextLift = 9;
    for (const s of L) { if (s.t1 <= t) lastTD = s.t1; if (s.t0 > t) nextLift = min(nextLift, s.t0); if (s.t0 <= t && t < s.t1) return 0; }
    return clamp((t - lastTD) / HB.load, 0, 1) * clamp((nextLift - t) / HB.unload, 0, 1); }
  weights(t) { const r = this.loadOf("R", t), l = this.loadOf("L", t), s = r + l; if (s >= 1e-6) return { R: r / s, L: l / s }; const wR = this.cycle(t).sw === "L" ? 1 : 0; return { R: wR, L: 1 - wR }; }
  // the step cycle at t: the foot swinging (or the next to lift), the phase from the last touchdown to the next (0 … 1)
  cycle(t) { let lastTD = -9, nextTD = 9, sw = null; for (const X of SIDES) for (const s of this.seg[X]) { if (s.t1 <= t && s.t1 > lastTD) lastTD = s.t1; if (s.t1 > t && s.t1 < nextTD) { nextTD = s.t1; sw = X; } }
    return { u: lastTD > -9 && nextTD < 9 ? clamp((t - lastTD) / max(0.05, nextTD - lastTD), 0, 1) : 0.5, sw: sw || "R" }; }
  // ── the pose at tAbs (relative to the episode start) ──────────────────────────────────────────────────────────────────────────────────────
  poseAt(tAbs, ballLocal) {
    const E = this.E, R3 = E.R3, b = this.b, ep = this.ep, t = tAbs - this.tc, rot = {};
    const feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, w = this.weights(t), cy = this.cycle(t);
    const S = ep.rootAt(t), Fw = [w.R * feet.R.ank[0] + w.L * feet.L.ank[0], w.R * feet.R.ank[1] + w.L * feet.L.ank[1]], psi = ep.psiAt(t), V = ep.velAt(t), sp = hyp(V[0], V[1]), run = clamp(sp / 6, 0, 1);
    // the pelvis shifts toward the LOADED foot (a weight shift — none in a flight): sideways at every speed (the sway), along the run only slowly
    // (running keeps the pelvis on the body's path: RUN-1's pelvis is its root)
    const ld = clamp(this.loadOf("R", t) + this.loadOf("L", t), 0, 1), dF = [Fw[0] - S[0], Fw[1] - S[1]], hc = Math.cos(psi), hs = Math.sin(psi), fw = dF[0] * hc + dF[1] * hs, lt = -dF[0] * hs + dF[1] * hc;
    const kF = TB.comPull * (1 - run) * (1 - run) * ld, kL = TB.comPull * (1 - 0.5 * run) * ld; let P = [S[0] + fw * kF * hc - lt * kL * hs, S[1] + fw * kF * hs + lt * kL * hc];
    const V0 = ep.velAt(t - 0.06), V1 = ep.velAt(t + 0.06), acc = [(V1[0] - V0[0]) / 0.12, (V1[1] - V0[1]) / 0.12];
    const aF = acc[0] * Math.cos(psi) + acc[1] * Math.sin(psi), aL = -acc[0] * Math.sin(psi) + acc[1] * Math.cos(psi), act = this.actW(t), fam = act ? act.a.fam : null, aw = act ? act.w : 0, asg = act ? act.a.sg : 0;
    // the touch nearest in time (the body dips into it)
    let touchW = 0; for (const X of SIDES) for (const s of this.seg[X]) if (s.con) { const d = abs(t - s.con.t); if (d < 0.1) touchW = max(touchW, 1 - s5(d / 0.1)); }
    // PELVIS: the bob over the step cycle (lowest at mid-stance), the yaw with the swinging leg, the drop into actions and touches
    const bobA = clamp(TB.bob[0] + TB.bob[1] * sp, 0, TB.bob[2]) * (fam === "DRAG_BACK" || fam === "STOP" ? 0.4 : 1), bob = -bobA * Math.cos(2 * Math.PI * (cy.u - 0.35));
    const twA = clamp(TB.twist[0] + TB.twist[1] * sp, 0, TB.twist[2]) * DEG, gTw = sgnF(cy.sw) * twA * Math.sin(Math.PI * cy.u);
    const crouch = 0.022 + TB.crouchAct * aw * (fam === "CARRY" ? 0.3 : 1) + TB.crouchTouch * touchW + 0.008 * clamp(-aF, 0, 8);
    // TRUNK: lean from the acceleration (back while braking, forward into the drive), roll into the turn, the action's own posture
    let lean = clamp(3 + 5 * run + TB.leanAcc * aF, -9, 20) * DEG, roll = clamp(-aL * TB.rollLat, -22, 22) * DEG, tw = -gTw * 1.3;
    if (fam === "IN_CUT" || fam === "OUT_TOUCH") { tw += asg * 14 * DEG * aw; roll += asg * (fam === "IN_CUT" ? 7 : -5) * DEG * aw; }
    if (fam === "DRAG_BACK" || fam === "STOP") { lean -= 7 * DEG * aw; }
    if (fam === "CRUYFF") tw += -asg * 16 * DEG * Math.sin(Math.PI * clamp(aw, 0, 1));
    if (fam === "FEINT_EXIT") { const dip = act && t < act.a.tc ? sstep(act.a.t0, act.a.tc - 0.1, t) * (1 - sstep(act.a.tc - 0.12, act.a.tc, t)) : 0; roll += -asg * 14 * DEG * dip; tw += -asg * 18 * DEG * dip; }
    if (fam === "DOUBLE" || fam === "DRAG_ACROSS") roll += asg * 5 * DEG * aw;
    let pelvis = [0, b.pelvisY - 0.02 - crouch + bob + 0.012 * run, 0.02 * run], Rp = R3.mul3(R3.y(gTw + tw * 0.2), R3.x(lean * 0.35), R3.z(-roll * 0.5));
    rot.pelvis = Rp; rot.spine = R3.mul(R3.y(tw * 0.45 - gTw * 0.3), R3.x(lean * 0.3)); rot.chest = R3.mul3(R3.y(tw * 0.5 - gTw * 0.4), R3.x(lean * 0.35), R3.z(-roll * 0.3));
    // ARMS: counter-swing with the legs at speed (the arm opposite the swinging leg forward), balance out in the actions
    const swing = clamp(TB.armSwing[0] + TB.armSwing[1] * sp, 0, TB.armSwing[2]) * DEG * Math.sin(Math.PI * cy.u) * sgnF(cy.sw), bal = 10 + 22 * aw + 8 * touchW;
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, outside = act && sx === -asg ? 1 : 0, abd = 10 + bal * (0.6 + 0.4 * outside), arm = sx * swing;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-arm * 1.0 - 4 * DEG), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(35 + 45 * run + 12 * aw) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    // HEAD: the ball while it is close (a technical sequence), ahead in a stride carry
    const Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05]; let look = ballLocal ? ballLocal.slice() : null;
    const c = Math.cos(psi), s = Math.sin(psi), toM = (q, Pr) => { const dx = q[0] - Pr[0], dy = q[1] - Pr[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
    if (look) { const dB = hyp(look[0] - P[0], look[1] - P[1]), up = sstep(0.9, 1.6, dB) * (1 - aw); look = [lerp(look[0], P[0] + dir(psi)[0] * 5, up * 0.7), lerp(look[1], P[1] + dir(psi)[1] * 5, up * 0.7), lerp(look[2], 0.6, up * 0.7)];
      const q = toM(look, P), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]], yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -45 * DEG, 55 * DEG);
      const want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm); rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    else { rot.neck = R3.x(4 * DEG); rot.head = R3.x(6 * DEG); }
    // blends of the pelvis and upper body with TURN-1.2's poses (a moving receive's start, the bridge's switch); the legs always reach this plan's feet
    let pose = { rot, pelvisPos: pelvis };
    if (this.init.pose && tAbs < TB.blendIn) pose = blendPose(this.init.pose, pose, s5(tAbs / TB.blendIn));
    if (this.end && t > this.end.t - TB.blendOut) pose = blendPose(pose, this.end.pose, s5((t - (this.end.t - TB.blendOut)) / TB.blendOut));
    Rp = pose.rot.pelvis; pelvis = pose.pelvisPos.slice();
    // reach: a planted or touching leg out of reach moves the pelvis (never the foot, never the ball), lowering it a little
    const touchOf = (X) => { let wt = 0; for (const s of this.seg[X]) if (s.con) { const d = abs(t - s.con.t); if (d < 0.07) wt = max(wt, 1 - s5(d / 0.07)); } return wt; };
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wC = max(fX.planted ? 1 : fX.since != null ? max(1 - s5(fX.since / 0.05), s5(1 - fX.until / 0.05)) : 0, touchOf(X)); if (wC <= 0) continue;
        const sx = X === "R" ? 1 : -1, hipM = [pelvis[0] + sx * b.hipX, pelvis[1], pelvis[2]], an = toM(fX.ank, P), d = hyp(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = HB.reach * b.legLen;
        if (d > lim) { const ex = (d - lim) * wC, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = hyp(hx, hz) || 1, dr = min(0.05, ex * 0.5), ex2 = max(0, ex - dr), mx = hx / hl * ex2, mz = hz / hl * ex2;
          dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; }
    const legRot = {};
    for (const X of SIDES) { const sx = X === "R" ? 1 : -1, ft = feet[X], hip = E.RV.add(pelvis, R3.v(Rp, [sx * b.hipX, 0, 0])), an = toM(ft.ank, P), yaw = wrapA(ft.yaw - psi), Rf = R3.mul(R3.y(yaw), R3.x(-(ft.pitch || 0)));
      let ps = yaw - gTw * 0.5; ps = sx > 0 ? clamp(ps, -55 * DEG, 85 * DEG) : clamp(ps, -85 * DEG, 55 * DEG);
      const ik = E.r1LegIK(b, Rp, ps, hip, an), Rsh = R3.mul(Rp, R3.mul(ik.Rthigh, ik.Rshin)), fl = R3.toYXZ(R3.mul(R3.tr(Rsh), Rf));
      legRot["thigh_" + X] = ik.Rthigh; legRot["shin_" + X] = ik.Rshin; legRot["foot_" + X] = R3.yxz(fl[0], fl[1], fl[2]); legRot["toe_" + X] = R3.x(-(ft.toe || 0)); }
    pose = { rot: Object.assign({}, pose.rot, legRot), pelvisPos: pelvis };
    const out = this.finish(P, psi, pose); out.S = P; out.psi = psi; out.feet = feet; out.w = w; out.t = t; out.fam = fam; return out;
  }
  finish(P, psi, pose) {
    const E = this.E, b = this.b, F = this.F, Fp = F.pitch(P), rootM = E.r1RootMatrix(Fp[0], Fp[1], F.h + psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: F.loc([w[0], w[1], -w[2]]), t: F.loc([tp[0], tp[1], -tp[2]]) }; }
    return { skin, J, pose };
  }
}

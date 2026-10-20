// ═══ tc_responsive/rs_body.js — RESPONSIVENESS EXPERIMENT: THE PRESENTATION (the posed human body from the authoritative simulation) ═════════════
// The baseline's presentation (88573ef0's pt_body.js: TECHNICAL-CONTROL-1.5's pose code on an adapter fed by the simulation's history; a re-planned
// swing blends from the previous plan's foot) with the experiment's additions — presentation only, never read by the simulation:
//   · THE ACKNOWLEDGEMENT LAYER: from the first tick of a new stick intent the pelvis (≤ 12°), the torso (≤ 25° more) and the head turn toward it,
//     the body leans back with the root's authoritative braking and into the turn with its lateral acceleration — the visible answer to the stick
//     while the simulation's root brakes / re-orients and the next legal contact is prepared. A pure function of the recorded history (the input
//     each tick, the plans): live and replay draw the same body
//   · planned contacts read from the ball as their plan saw it (plan.ball0); a stance's pivot is part of its identity in the cache
//   · SWING CONTINUITY: the experiment re-plans at every stick change — a re-planned swing goes on from the foot exactly as it was displayed
//     (position, velocity, orientation — C¹) into the new swing's keys, instead of the baseline's 0.12 s blend (which gave up beyond 0.6 m and
//     let the foot jump); a plan's swings are built from that plan's own body and ball (plan-pure: live and replay draw the same)
// The rendered footstep choreography is this module's; the simulation's foot proxies only bind it at a contact (the contact pose at the ball).
import { RefSim, exposureAt, clearancesOf, DIRS, Curve as RCurve, RF, wrapA } from "../technical_control15/tc15_ref.js";
import { Q, legIK, swivelFor, footOut, ankleFor, ballGap } from "../technical_control11/tc11_leg.js";
import { HB } from "../receive_turn11/rt11_body.js";
import { bootHull } from "../technical_control11/tc11_leg.js";
import { predict, speedFor, R } from "./pt_ball.js";
const DEG = Math.PI / 180, DT = 1 / 240, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, SIDES = ["R", "L"];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const dir = (h) => [Math.cos(h), Math.sin(h)], hdg = (v) => Math.atan2(v[1], v[0]), sgnF = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => s5((x - a) / max(1e-6, b - a));
function herm3(a, b, t) { const T = b.t - a.t, u = clamp((t - a.t) / T, 0, 1), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map((i) => h00 * a.p[i] + h10 * T * a.v[i] + h01 * b.p[i] + h11 * T * b.v[i]); }
const BLEND = 0.12;
// the RefSim methods used as they are (they read this.com / vel / psi / ch / T / ballAt / stanceFoot / wayKey — the adapter's)
const BORROW = ["stanceYaw", "stanceFoot", "contactPose", "toeOff", "runTemplate", "vL2P", "swingKeys", "runPath", "poseAt", "toM", "fromM"];
export class PlayBody {
  // env: { E (RUN-1.3), M4, skel, colliders (dribble1/d1_colliders.json) } · sim: a PlaySim
  constructor(env, sim) {
    this.E = env.E; this.M4 = env.M4; this.sim = sim; const skel = env.skel; this.b = skel._kbody || (skel._kbody = this.E.r1Body(skel)); this.mtpY = abs(this.b.mtp[1]); this.mtpZ = this.b.mtp[2];
    // DRIBBLE-1's boot hull per side (the same object RefSim builds and caches on the colliders)
    const C = env.colliders; this.hull = C && C.sides ? (C._tc15 || (C._tc15 = { R: bootHull(C.sides.R.boot.points), L: bootHull(C.sides.L.boot.points), P: { R: C.sides.R.boot.points, L: C.sides.L.boot.points } })) : null;
    // RUN-1's swing paths per 0.25 m/s, baked (pt_baked.json): RefSim's runTemplate cache seeded — no 50 – 100 ms solve in a frame
    if (env.baked && env.baked.run) { const cache = RefSim._tmpl || (RefSim._tmpl = new Map()); for (const [k, v] of Object.entries(env.baked.run)) if (!cache.has(+k)) cache.set(+k, v); }
    this.O = [0, 0]; this.th0 = 0; this.T = { gait: null, sway: 1, armSide: null }; this.fk = null; this.cache = new Map(); this.ctxs = new Map(); this.ctx = null; this.inSwing = false;
  }
  // ── the frames: the adapter's "local" frame IS the pitch (th0 = 0, O = 0); the technique frames are resolved in wayKey ──────────────────────────
  H(deg) { return deg * DEG; } L2P(q) { return [q[0], q[1]]; } P2L(p) { return [p[0], p[1]]; }
  // (plan-pure: inside a plan's context, its own body from its start on; its swings see its own ball, predicted from what it saw)
  stAt(t) { const c = this.ctx, P = c && t >= c.plan.t0 - 1e-9 ? c.plan : this.sim.planAt(t); return this.sim.stateAt(t, P); }
  com(t) { return this.stAt(t).P; } vel(t) { return this.stAt(t).V; } psi(t) { return this.stAt(t).psi; } comL(t) { return this.com(t); }
  ballAt(t) { const S = this.sim, c = this.ctx;
    if (this.inSwing && c && t > c.plan.t0 && c.plan.ball0) { const B = c.plan.ball0, f = predict(B.p, B.v, t - c.plan.t0); return [f.p[0], f.p[1], R]; }
    if (t <= S.t + 1e-9) return S.ballTrack(t).p; const B = S.ballTrack(S.t), f = predict(B.p, B.v, t - S.t); return [f.p[0], f.p[1], R]; }
  // ── the context at t: the plan active then, its stances / contacts resolved for the presentation (cached per plan version) ─────────────────────
  ctxOf(plan) {
    let c = this.ctxs.get(plan); if (c) return c;
    const st = { R: [], L: [] }; for (const X of SIDES) for (const s of plan.stances[X]) st[X].push(this.stanceOf(s));
    for (const X of SIDES) st[X].sort((a, b) => a.t0 - b.t0);
    c = { plan, st, sw: new Map() }; this.ctxs.set(plan, c);
    if (this.ctxs.size > 900) { const live = new Set(this.sim.plans); for (const k of this.ctxs.keys()) if (!live.has(k)) this.ctxs.delete(k); }
    if (this.cache.size > 6000) { let n = 0; for (const k of this.cache.keys()) { this.cache.delete(k); if (++n > 3000) break; } } return c;
  }
  stanceOf(s) { const k = "s" + s.id + "|" + s.t0.toFixed(5) + "|" + s.t1 + "|" + s.pos[0].toFixed(4) + "|" + s.pos[1].toFixed(4) + (s.pivot ? "|p" + s.pivot.map((x) => x[0].toFixed(3) + ":" + x[1].toFixed(3)).join(",") : ""); let o = this.cache.get(k); if (o) return o;
    o = Object.assign({}, s, { pivot: s.pivot && s.pivot.length > 1 ? new RCurve(s.pivot) : null, heel: s.heel ? ((h0, d) => (t) => (t > h0 ? d * min(1, (t - h0) / 0.06) : 0))(s.heel[0], s.heel[1]) : null });
    this.cache.set(k, o); return o; }
  // the contact of the swing a → b of foot X under plan P: the plan's (or the record of one already made), resolved to { t, F, surface, ball, n, dv, swing }
  contactIn(X, a, b, P) {
    const S = this.sim, t0 = a.t1 - 1e-6, t1 = b.t0 + 1e-6; let c = P.contacts.find((q) => q.F === X && q.t > t0 && q.t < t1), rec = null;
    if (c) rec = S.contacts.find((r) => r.cid === c.id && !r.missed) || null; else { rec = S.contacts.find((r) => r.F === X && r.t > t0 && r.t < t1 && !r.missed && r.t <= P.t0 + 1e-9) || null; if (!rec) return null; }
    if (c && S.contacts.some((r) => r.cid === c.id && r.missed)) return null;
    const key = "c" + (rec ? "r" + rec.n : "p" + c.id + "@" + P.v); let o = this.cache.get(key); if (o) return o;
    let ball, vIn, vOut, src = rec || c;
    if (rec) { ball = rec.ball; vIn = rec.vIn; vOut = rec.vOut; }
    else { const B = P.ball0 || S.ballTrack(P.t0), f = predict(B.p, B.v, c.t - P.t0); ball = [f.p[0], f.p[1], R]; vIn = f.v;
      if (c.aim.kind === "target") { const d = [c.aim.P[0] - ball[0], c.aim.P[1] - ball[1]], D = hyp(d[0], d[1]), sp = min(13.5, speedFor(D, max(0.05, c.aim.T - c.t)) || 13.5); vOut = D > 1e-4 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0]; }
      else vOut = [c.aim.speed * Math.cos(c.aim.h), c.aim.speed * Math.sin(c.aim.h)]; }
    const dv = [vOut[0] - vIn[0], vOut[1] - vIn[1]], m = hyp(dv[0], dv[1]);
    o = { t: src.t, k: Math.round(src.t / DT), F: X, surface: src.surface, role: src.role, ball: [ball[0], ball[1], max(R, ball[2] || R)], vIn, vOut, dv: m, n: m > 1e-6 ? [dv[0] / m, dv[1] / m] : dir(this.psi(src.t)), swing: this.resolveSpec(src.swing, src.frame, src.t), frame: src.frame || null, done: !!rec };
    this.cache.set(key, o); return o;
  }
  // a technique's swing spec in absolute time (dt from the contact / tau from the decisive contact) with its frame; the sweep heading on the pitch
  resolveSpec(spec, frame, tc) { if (!spec) return null; const fr = frame || spec.frame; const o = Object.assign({}, spec, { frame: fr });
    if (spec.via) o.via = spec.via.map((w) => Object.assign({}, w, { t: w.dt != null ? tc + w.dt : fr ? fr.tC + w.tau : w.t, dt: undefined }));
    if (spec.sweep != null && fr) o.sweep = (fr.h0 + fr.m * spec.sweep * DEG) / DEG; return o; }
  // the swing of X from stance a to stance b under plan P (keys cached per plan)
  swingOf(X, a, b, ctx) {
    const key = X + a.id + ">" + b.id; let w = ctx.sw.get(key); if (w) return w;
    const P = ctx.plan, con = this.contactIn(X, a, b, P); let spec = con && con.swing ? con.swing : null;
    if (!spec && b.swingIn) spec = this.resolveSpec(b.swingIn, b.swingIn.frame, 0);
    // a carry touch (no authored swing): the foot meets the ball slower than the ball leaves (a push: the ball ≈ 1.25 × the foot) and follows
    // through BEHIND it along the impulse, the toe kept down — it never runs into the ball it has just sent
    // (the foot's velocity at the touch: 80 % of the ball's out-velocity — whatever the touch's angle, the ball always leaves the foot)
    if (con && !con.swing) { const vb = this.vel(con.t), out = hyp(con.vOut[0], con.vOut[1]), sole = con.surface === "SOLE", tF = con.t + min(0.045, 0.55 * (b.t0 - con.t));
      if (sole || out < 0.5) spec = { footSpeed: 0.3, via: [] };
      else { const dv = [0.8 * con.vOut[0] - vb[0], 0.8 * con.vOut[1] - vb[1]], m = hyp(dv[0], dv[1]);
        spec = { footSpeed: clamp(m, 0.3, 6.0), sweep: m > 0.05 ? hdg(dv) / DEG : null, via: b.t0 - con.t > 0.03 ? [{ t: tF, rel: "behind", along: "out", d: 0.30, h: 0.13, pitch: con.surface === "LACES" ? -26 : -6 }] : [] };
        if (spec.sweep == null) delete spec.sweep; } }
    w = { F: X, t0: a.t1, t1: b.t0, from: a, to: b, con, spec }; const prevCtx = this.ctx, prevIn = this.inSwing; this.ctx = ctx; this.inSwing = true;
    try { w.keys = this.swingKeys(X, w); } finally { this.ctx = prevCtx; this.inSwing = prevIn; }
    // CONTINUITY: a swing that began under an earlier plan goes on from the foot as it was displayed at this plan's start (its position, velocity,
    // orientation), through what is left of this plan's keys
    const t0 = P.t0; if (t0 > w.t0 + 1e-6 && t0 < w.t1 - 0.012) { const i = this.sim.plans.indexOf(P);
      if (i > 0) { const cp = this.ctxOf(this.sim.plans[i - 1]), f0 = this.displayFoot(X, t0, cp), f1 = this.displayFoot(X, t0 - DT, cp);
        // (the inherited velocity bounded by an elite foot's top speed; a displayed foot implausibly far from the new swing is not inherited — the
        // new swing is taken as it is rather than letting an error grow through the plans)
        const raw0 = (() => { let i0 = 0; const K0 = w.keys; while (i0 < K0.length - 2 && t0 > K0[i0 + 1].t) i0++; return herm3(K0[i0], K0[i0 + 1], t0); })(), far = hyp(f0.ank[0] - raw0[0], f0.ank[1] - raw0[1], f0.ank[2] - raw0[2]) > 1.2;
        let v0 = [(f0.ank[0] - f1.ank[0]) / DT, (f0.ank[1] - f1.ank[1]) / DT, (f0.ank[2] - f1.ank[2]) / DT]; const vm0 = hyp(v0[0], v0[1], v0[2]); if (vm0 > 24) v0 = v0.map((x) => x * 24 / vm0);
        if (!f0.planted && !f1.planted && !far) { const rest = w.keys.filter((k) => k.t > t0 + 0.03), k0 = { t: t0, p: f0.ank.slice(), v: v0, yaw: f0.yaw, pitch: f0.pitch, roll: f0.roll || 0 };
          if (!rest.length) rest.push(w.keys[w.keys.length - 1]); const K = [k0].concat(rest); for (let j = 1; j < K.length; j++) K[j].yaw = K[j - 1].yaw + wrap(K[j].yaw - K[j - 1].yaw);
          w.keys = K; w.ori = { yaw: new RCurve(K.map((k) => [k.t, k.yaw])), pitch: new RCurve(K.map((k) => [k.t, k.pitch])), roll: new RCurve(K.map((k) => [k.t, k.roll || 0])) }; w.inherited = true; } } }
    { const pi = this.inSwing, pc = this.ctx; this.inSwing = true; this.ctx = ctx; try { this.detour(X, w); } finally { this.inSwing = pi; this.ctx = pc; } }
    ctx.sw.set(key, w); return w;
  }
  // a swing whose path would pass through the ball outside its own touch: a key over / round the ball (the plan's predicted ball) at the deepest
  // moment — the foot goes round the ball, never through it, and the clearance push has nothing to do
  detour(X, w) {
    for (let it = 0; it < 3; it++) { const K = w.keys; let worst = null;
      for (let t = K[0].t + 0.01; t < w.t1 - 0.015; t += 0.01) { if (w.con && abs(t - w.con.t) < 0.04) continue;
        let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const p = herm3(K[i], K[i + 1], t), B = this.ballAt(t), dx = p[0] - B[0], dy = p[1] - B[1], dh = hyp(dx, dy), pen = R + 0.15 - hyp(dh, max(0, p[2] - 0.06 - R));
        if (pen > 0.01 && (!worst || pen > worst.pen)) worst = { t, p, B, pen, dx, dy, dh, i }; }
      if (!worst) return; const { t, p, B, dx, dy, dh } = worst, ux = dh > 1e-3 ? dx / dh : 0, uy = dh > 1e-3 ? dy / dh : 0;
      const r = R + 0.17, q = [B[0] + ux * r, B[1] + uy * r, max(p[2], dh < R + 0.05 ? 2 * R + 0.07 : p[2] + 0.04)];
      const a = K[worst.i], b = K[worst.i + 1]; if (t - a.t < 0.012 || b.t - t < 0.012) return;
      const key = { t, p: q, v: [(b.p[0] - a.p[0]) / (b.t - a.t), (b.p[1] - a.p[1]) / (b.t - a.t), 0], yaw: w.ori.yaw.at(t), pitch: w.ori.pitch.at(t), roll: 0, detour: true }; K.splice(worst.i + 1, 0, key);
      w.ori = { yaw: new RCurve(K.map((k) => [k.t, k.yaw != null ? k.yaw : w.ori.yaw.at(k.t)])), pitch: new RCurve(K.map((k) => [k.t, k.pitch != null ? k.pitch : w.ori.pitch.at(k.t)])), roll: new RCurve(K.map((k) => [k.t, k.roll || 0])) }; }
  }
  // ── a waypoint (TECHNICAL-CONTROL-1.5's, in the technique's frame: [ahead, right] from h0, mirrored by m, rotated by its exit weight) ──────────────
  wayKey(X, w, sw) {
    if (w.rel === "behind") { const t = w.t, B = this.ballAt(t), vo = sw.con && w.along === "out" ? sw.con.vOut : null, so = vo ? hyp(vo[0], vo[1]) : 0, n = so > 0.5 ? [vo[0] / so, vo[1] / so] : sw.con ? sw.con.n : dir(this.psi(t)); return { t, p: [B[0] - n[0] * w.d, B[1] - n[1] * w.d, w.h], v: null, yaw: null, pitch: w.pitch != null ? w.pitch * DEG : null, roll: null }; }
    const t = w.t, fr = sw.spec && sw.spec.frame, m = fr ? fr.m : 1, h0 = fr ? fr.h0 : this.psi(t), rw = fr ? fr.rot * (w.w || 0) : 0, c = Math.cos(rw), s = Math.sin(rw);
    // (exitAt: [ahead, right] in the EXIT frame — the technique's exit heading — at height h; wYawExit: the yaw from the exit heading)
    const eH = fr && fr.exitH != null ? fr.exitH : h0, ex = w.exitAt, at = ex ? [0, 0, w.h] : w.at, a = at[0] * c - at[1] * s, l = m * (at[0] * s + at[1] * c);
    const yawOf = () => (w.yaw == null ? null : w.wYawExit ? eH + m * w.yaw * DEG : h0 + m * (w.yaw * DEG + rw)); let base;
    if (w.rel === "ball") base = sw.con ? sw.con.ball : this.ballAt(t);
    else if (w.rel === "ballNow") base = this.ballAt(t);
    else if (w.rel === "O") base = fr ? fr.O : this.com(t);
    else if (w.rel === "B") base = fr ? fr.B : this.ballAt(t);
    else if (w.rel === "com") base = this.com(t);
    else if (w.rel === "pelvis") { const P = this.com(t), f = this.psi(t), fw = w.at[0], rt = m * w.at[1]; const p = [P[0] + fw * Math.cos(f) - rt * Math.sin(f), P[1] + fw * Math.sin(f) + rt * Math.cos(f)];
      return { t, p: [p[0], p[1], at[2] != null ? at[2] : HB.ankleH + 0.05], v: null, yaw: yawOf(), pitch: w.pitch != null ? w.pitch * DEG : null, roll: w.roll != null ? m * w.roll * DEG : null }; }
    else if (w.rel === "stance") { const L = (this.ctx || this.ctxAt(t)).st[other(X)], o = L.find((q) => q.t0 <= t + 1e-6 && q.t1 >= t - 1e-6) || L.find((q) => q.t0 >= t) || L[L.length - 1]; base = this.stanceFoot(o, clamp(t, o.t0, o.t1)).ank; }
    else base = this.com(t);
    let p = [base[0] + a * Math.cos(h0) - l * Math.sin(h0), base[1] + a * Math.sin(h0) + l * Math.cos(h0)];
    if (ex) p = [base[0] + ex[0] * Math.cos(eH) - m * ex[1] * Math.sin(eH), base[1] + ex[0] * Math.sin(eH) + m * ex[1] * Math.cos(eH)];
    return { t, p: [p[0], p[1], at[2] != null ? at[2] : HB.ankleH + 0.05], v: null, yaw: yawOf(), pitch: w.pitch != null ? w.pitch * DEG : null, roll: w.roll != null ? m * w.roll * DEG : null };
  }
  ctxAt(t) { return this.ctxOf(this.sim.planAt(t)); }
  // ── a foot at t under plan P (raw), and with the inheritance blend from the plans before it ─────────────────────────────────────────────────────
  footRaw(X, t, ctx) {
    const S = ctx.st[X]; let s = S.find((q) => t >= q.t0 - 1e-9 && t <= q.t1 + 1e-9); if (s) return this.stanceFoot(s, t);
    let a = null, b = null; for (const q of S) { if (q.t1 < t) a = q; else if (q.t0 > t && !b) b = q; }
    if (!a || !b) { const q = a || b || S[0]; return this.stanceFoot(q, clamp(t, q.t0, q.t1 === Infinity ? t : q.t1)); }
    const prev = this.ctx; this.ctx = ctx; let w; try { w = this.swingOf(X, a, b, ctx); } finally { this.ctx = prev; }
    const K = w.keys; let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const p = herm3(K[i], K[i + 1], t), toe = this.heelOf(w.from, w.from.t1) * (1 - s5((t - w.t0) / 0.12));
    return { ank: [p[0], p[1], max(HB.ankleH - 0.012, p[2])], yaw: w.ori.yaw.at(t), pitch: w.ori.pitch.at(t), roll: w.ori.roll.at(t), toe, planted: false, swing: w, contact: !!(w.con && abs(t - w.con.t) < DT * 0.6) };
  }
  // a swinging boot never passes through the ball (the authoritative ball moves on its own after a touch): the boot as a heel – toe capsule; a
  // boot inside the ball outside its own contact moment is moved clear, away from the ball's centre (horizontally, lifted a little) — planted feet
  // are placed off the ball's path by the simulation's gait
  clearOfBall(f, X, t) {
    // (smooth: the push slides along the swing's own direction instead of opposing it, and fades in / out across the contact window — never a
    // switch from fully pushed to not pushed between two ticks)
    if (f.planted) return f; const con = f.swing && f.swing.con, dc = con ? abs(t - con.t) : 9; if (con && con.surface === "SOLE" && dc < 0.10) return f; const wC = con ? s5((dc - 0.0125) / 0.035) : 1; if (wC <= 0) return f;
    const B = this.ballAt(t), b = [B[0], B[1], max(R, B[2] || R)], cp = Math.cos(f.pitch || 0), fw = [Math.cos(f.yaw) * cp, Math.sin(f.yaw) * cp, Math.sin(f.pitch || 0)], a = f.ank;
    const heel = [a[0] - fw[0] * 0.07, a[1] - fw[1] * 0.07, a[2] - 0.045], toe = [a[0] + fw[0] * 0.21, a[1] + fw[1] * 0.21, a[2] + fw[2] * 0.21 - 0.035];
    const d = [toe[0] - heel[0], toe[1] - heel[1], toe[2] - heel[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], u = clamp(((b[0] - heel[0]) * d[0] + (b[1] - heel[1]) * d[1] + (b[2] - heel[2]) * d[2]) / L2, 0, 1);
    const c = [heel[0] + d[0] * u, heel[1] + d[1] * u, heel[2] + d[2] * u], e = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], dist = hyp(e[0], e[1], e[2]), pen = R + 0.062 - dist;
    if (pen <= 0) return f; let n = [e[0], e[1], max(0, e[2]) + 0.25 * hyp(e[0], e[1])];
    if (f.swing && f.swing.keys) { const K = f.swing.keys; let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const v = [K[i + 1].p[0] - K[i].p[0], K[i + 1].p[1] - K[i].p[1]], vl = hyp(v[0], v[1]);
      if (vl > 1e-3) { const uu = [v[0] / vl, v[1] / vl], al = n[0] * uu[0] + n[1] * uu[1]; if (al < 0) n = [n[0] - al * uu[0], n[1] - al * uu[1], n[2] + 0.5 * abs(al)]; } }
    const m = hyp(n[0], n[1], n[2]) || 1; n = [n[0] / m, n[1] / m, n[2] / m]; const k = (pen + 0.008) * wC;
    return Object.assign({}, f, { ank: [a[0] + n[0] * k, a[1] + n[1] * k, a[2] + n[2] * k], cleared: k });
  }
  footAt(X, t) { return this.displayFoot(X, t, this.ctxOf(this.sim.planAt(t))); }
  // the foot as displayed under a plan: its raw foot, clear of the ball
  displayFoot(X, t, ctx) { const prev = this.ctx; this.ctx = ctx; try { return this.clearOfBall(this.footRaw(X, t, ctx), X, t); } finally { this.ctx = prev; } }
  // the heel's rise (RefSim's; a standing stance never lifts: only its authored rise)
  heelOf(s, t) { if (s.t1 === Infinity) return s.heel ? s.heel(t) * DEG : 0; return RefSim.prototype.heelOf.call(this, s, t); }
  loadOf(X, t) { const S = this.ctxAt(t).st[X], s = S.find((q) => t >= q.t0 && t <= q.t1); if (!s) return 0; return clamp((t - s.t0) / HB.load, 0, 1) * clamp((s.t1 === Infinity ? 9 : s.t1 - t) / HB.unload, 0, 1); }
  cycle(t) { const st = this.ctxAt(t).st; let lastTD = -9, nextTD = 9, sw = "R"; for (const X of SIDES) for (const s of st[X]) { if (s.t0 <= t && s.t0 > lastTD) lastTD = s.t0; if (s.t0 > t && s.t0 < nextTD) { nextTD = s.t0; sw = X; } }
    return { u: lastTD > -9 && nextTD < 9 ? clamp((t - lastTD) / max(0.05, nextTD - lastTD), 0, 1) : 0.5, sw }; }
  // ── THE POSE at t (tick-aligned): RefSim.poseAt on this adapter, the diagnostics (protection, leg clearances, the ball against the boots) ───────
  // ── THE ACKNOWLEDGEMENT at t: the lead toward the intent (the stick's newest heading against the simulation's facing, bounded, averaged over the
  // last 25 ms — it rises within a frame or two and dies away as the facing turns), the braking / turning leans from the root's own acceleration ─
  ack(t) { const S = this.sim, k = Math.round(t / DT) - 1, I = S.log.input; let L = 0, n = 0;
    for (let j = 0; j < 6; j++) { const kk = k - j; if (kk < 0 || 3 * kk >= I.length) continue; const h = I[3 * kk]; n++; if (h === -99) continue; const psi = S.stateAt(kk * DT + DT).psi, e = wrap(h - psi); if (abs(e) > 4 * DEG) L += clamp(e, -40 * DEG, 40 * DEG); }
    L = n ? L / n : 0; const s0 = S.stateAt(t - DT), s1 = S.stateAt(t + DT), V = [(s0.V[0] + s1.V[0]) / 2, (s0.V[1] + s1.V[1]) / 2], A = [(s1.V[0] - s0.V[0]) / (2 * DT), (s1.V[1] - s0.V[1]) / (2 * DT)], sp = hyp(V[0], V[1]);
    const aL = sp > 0.5 ? (A[0] * V[0] + A[1] * V[1]) / sp : 0, aN = sp > 0.5 ? (V[0] * A[1] - V[1] * A[0]) / sp : 0;
    return { pelvis: clamp(0.30 * L, -12 * DEG, 12 * DEG), torso: clamp(0.62 * L, -25 * DEG, 25 * DEG) / DEG, head: 0.9 * L, lean: clamp(aL * 0.9, -11, 3), side: clamp(aN * 0.8, -12, 12), L }; }
  pose(t) {
    const P = this.sim.planAt(t), ctx = this.ctxOf(P); this.ctx = ctx; const ch = P.ch, ak = this.ack(t); this.ak = ak;
    this.ch = { lean: { at: (x) => ch.lean.at(x) + (x === t ? ak.lean : 0) }, side: { at: (x) => ch.side.at(x) + (x === t ? ak.side : 0) }, trunk: { at: (x) => ch.trunk.at(x) + (x === t ? ak.torso : 0) }, crouch: ch.crouch, arms: ch.arms, look: ch.look, face: { at: (x) => this.psi(x) / DEG } };
    this.T = { gait: ch.gait ? ch.gait.K : null, sway: 1, armSide: null };
    let p; try { p = this.poseAtRX(t, ak); } finally { this.ctx = null; }
    const a = P.action, st = this.sim.stateAt(t, P), h0 = a.tech && t < a.tRelease + 0.3 ? a.h0 : (st.s > 1.0 ? st.h : st.psi);
    p.exp = exposureAt(p.J, [p.ball[0], p.ball[1], p.ball[2]], h0); p.h0 = h0; p.clr = clearancesOf(p.J); p.plan = P; return p;
  }
  // RefSim.poseAt (TECHNICAL-CONTROL-1.5, unchanged there) with the acknowledgement: the pelvis's yaw leads the simulation's facing, the head looks
  // along the intent while the ball is not what it watches
  poseAtRX(t, ak) {
    const E = this.E, R3 = E.R3, b = this.b, ch = this.ch, rot = {}, feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, S = this.com(t), psi = this.psi(t) + ak.pelvis, V = this.vel(t), sp = hyp(V[0], V[1]), run = clamp(sp / 6, 0, 1), cy = this.cycle(t);
    const lR = this.loadOf("R", t), lL = this.loadOf("L", t), ld = clamp(lR + lL, 0, 1), wR = lR + lL > 1e-6 ? lR / (lR + lL) : 0.5, Fw = [wR * feet.R.ank[0] + (1 - wR) * feet.L.ank[0], wR * feet.R.ank[1] + (1 - wR) * feet.L.ank[1]];
    const hc = Math.cos(psi), hs = Math.sin(psi), dF = [Fw[0] - S[0], Fw[1] - S[1]], lt = -dF[0] * hs + dF[1] * hc, kL = RF.comPull * (1 - 0.6 * run) * ld * (this.T.sway != null ? this.T.sway : 1); let P = [S[0] - lt * kL * hs, S[1] + lt * kL * hc];
    const g = this.T.gait ? clamp(new RCurve(this.T.gait).at(t), 0, 1) : 1, bob = -clamp(RF.bob[0] + RF.bob[1] * sp, 0, RF.bob[2]) * Math.cos(2 * Math.PI * (cy.u - 0.35)) * g, gTw = sgnF(cy.sw) * clamp(RF.twist[0] + RF.twist[1] * sp, 0, RF.twist[2]) * DEG * Math.sin(Math.PI * cy.u) * g;
    const lean = ch.lean.at(t) * DEG, side = ch.side.at(t) * DEG, trunk = ch.trunk.at(t) * DEG, crouch = ch.crouch.at(t), arms = ch.arms.at(t);
    let pelvis = [0, b.pelvisY - 0.02 - crouch + bob + 0.012 * run, 0.02 * run], Rp = R3.mul3(R3.y(gTw), R3.x(lean * 0.35), R3.z(-side * 0.45));
    rot.pelvis = Rp; rot.spine = R3.mul3(R3.y(trunk * 0.45 - gTw * 0.6), R3.x(lean * 0.3), R3.z(-side * 0.3)); rot.chest = R3.mul3(R3.y(trunk * 0.55 - gTw * 0.5), R3.x(lean * 0.35), R3.z(-side * 0.25));
    const swing = clamp(RF.armSwing[0] + RF.armSwing[1] * sp, 0, RF.armSwing[2]) * DEG * Math.sin(Math.PI * cy.u) * sgnF(cy.sw) * g, armSide = this.T.armSide ? new RCurve(this.T.armSide).at(t) : 0;
    for (const X of SIDES) { const sx = sgnF(X), abd = 10 + 38 * arms * (1 + 0.5 * sx * armSide), arm = sx * swing;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-arm - 4 * DEG - 10 * DEG * arms), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(35 + 45 * run * g + 20 * arms) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    // the head: the ball while it is close and the action is on, else along the travel — turned toward the intent by the acknowledgement
    const ball = this.ballAt(t), Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05], lk = clamp(ch.look.at(t), 0, 1), dB = hyp(ball[0] - S[0], ball[1] - S[1]);
    { const wB = lk * (1 - sstep(1.2, 2.2, dB)) * (1 - min(1, abs(ak.L) / (30 * DEG)) * 0.6), hLook = (sp > 0.5 ? hdg(V) : this.psi(t)) + ak.head, tgt = [lerp(S[0] + Math.cos(hLook) * 6, ball[0], wB), lerp(S[1] + Math.sin(hLook) * 6, ball[1], wB), lerp(0.7, ball[2], wB)], q = this.toM(tgt, S, psi), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]];
      const yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -45 * DEG, 55 * DEG), want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm);
      rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    let reachM = 0; const c = Math.cos(psi), s = Math.sin(psi);
    for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
      for (const X of SIDES) { const fX = feet[X], wC = fX.planted ? 1 : fX.contact ? 1 : 0; if (wC <= 0) continue; const sx = sgnF(X), hipM = [pelvis[0] + sx * b.hipX, pelvis[1], pelvis[2]], an = this.toM(fX.ank, P, psi), d = hyp(an[0] - hipM[0], an[1] - hipM[1], an[2] - hipM[2]), lim = RF.reach * b.legLen;
        if (d > lim) { const ex = d - lim, hx = an[0] - hipM[0], hz = an[2] - hipM[2], hl = hyp(hx, hz) || 1, dr = min(0.05, ex * 0.5), ex2 = max(0, ex - dr), mx = hx / hl * ex2, mz = hz / hl * ex2; dP = [dP[0] + mz * c - mx * s, dP[1] + mz * s + mx * c]; drop = max(drop, dr); moved = true; } }
      if (!moved) break; P = [P[0] + dP[0], P[1] + dP[1]]; pelvis[1] -= drop; reachM += hyp(dP[0], dP[1]) + drop; }
    const legRot = {}, legs = {};
    for (const X of SIDES) { const ft = feet[X], sx = sgnF(X), hip = Q.v(Rp, [sx * b.hipX, 0, 0]).map((x, i) => x + pelvis[i]);
      const solve = (f) => { const an = this.toM(f.ank, P, psi), Rf = Q.mul3(Q.y(wrapA(f.yaw - psi)), Q.x(-(f.pitch || 0)), Q.z(f.roll || 0)), psiK = swivelFor(footOut(Rp, Rf, X), X) + (f.kneeOut || 0), ik = legIK(b, Rp, psiK, hip, an, RF.kMin), Rsh0 = Q.mul3(Rp, ik.Rthigh, Q.x(ik.k)), A = ankleFor(Rsh0, Rf, X, ik.k); return { an, Rf, ik, A, Rsh0 }; };
      let f = ft, L = solve(f);
      if (f.planted) for (let it = 0; it < 3; it++) { const df = -L.A.fp / DEG + (L.A.err > 0.5 ? -L.A.res[1] / DEG : 0); if (df <= RF.dfRise) break; const p0 = -f.pitch, p1 = p0 + (df - RF.dfRise + 1) * DEG, my = this.mtpY, mz = this.mtpZ;
        const back = mz * Math.cos(p1) - my * Math.sin(p1), up = my * Math.cos(p1) + mz * Math.sin(p1); f = Object.assign({}, f, { ank: [f.ballPt[0] - Math.cos(f.yaw) * back, f.ballPt[1] - Math.sin(f.yaw) * back, HB.ankleH - my + up], pitch: -p1, toe: p1 }); L = solve(f); }
      feet[X] = f; legRot["thigh_" + X] = L.ik.Rthigh; legRot["shin_" + X] = Q.mul(Q.x(L.ik.k), Q.y(L.A.tau)); legRot["foot_" + X] = Q.yxz(L.A.fy, L.A.fp, L.A.fr); legRot["toe_" + X] = Q.x(-(f.toe || 0));
      legs[X] = { short: L.ik.short, err: L.A.err, Rfoot: Q.mul(L.Rsh0, Q.mul(Q.y(L.A.tau), Q.yxz(L.A.fy, L.A.fp, L.A.fr))), an: L.an }; }
    const pose = { rot: Object.assign(rot, legRot), pelvisPos: pelvis }, rootM = E.r1RootMatrix(P[0], P[1], psi, 0), fk = E.r1FK({ body: b }, pose, rootM, this.fk); this.fk = fk;
    const sk = b.skel, skin = new Float32Array(16 * sk.bones.length); for (let i = 0; i < fk.world.length; i++) skin.set(this.M4.mul(fk.world[i], sk.invBind[i]), i * 16);
    const J = {}; for (const bn of sk.bones) { const w = fk.joint[bn.idx], tp = fk.tip[bn.idx]; J[bn.name] = { j: [w[0], -w[2], w[1]], t: [tp[0], -tp[2], tp[1]] }; }
    const bM = this.toM(ball, P, psi), gap = {}; if (this.hull) for (const X of SIDES) { const g2 = ballGap(this.hull[X], X, legs[X].Rfoot, this.toM(J["foot_" + X].j, P, psi), bM, R); gap[X] = { gap: +g2.gap.toFixed(4), face: g2.face }; }
    return { t, skin, J, pose, P, psi, V, feet, legs, gap, reach: reachM, ball, ack: ak };
  }
}
for (const k of BORROW) PlayBody.prototype[k] = RefSim.prototype[k];
// (the pose's footAt / loadOf / cycle are the adapter's — RefSim.poseAt calls this.footAt(X, t))
export { DIRS };

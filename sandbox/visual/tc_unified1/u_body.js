// ═══ tc_unified1/u_body.js — TC-LAYERED-1: BASELINE-88573ef0's presentation (tc_baseline_88573ef0/pt_body.js, copied) + layer B1 (§1–2):
// THE IMMEDIATE ACKNOWLEDGEMENT — with sim.o.layers.ack off this file draws exactly 88573ef0's body (the borrowed RefSim.poseAt, unchanged); on,
// the newest stick intent is shown within a frame or two as ONE CONNECTED BODY beginning the turn, bounded so the upper body never detaches:
//   head toward the new line (≤ 60°) · pelvis opening (≤ 9°) · torso over it (≤ 13° more: shoulders ≤ 22° from the hips' heading) · lean into the
//   turn and back with the root's own acceleration, a little anticipation · knees flexing for the coming brake (≤ 2 cm) · the next support foot
//   turned toward the new line (≤ 14°, about the ball of the foot, in its swing — then planted so) — the authoritative root is never moved:
//   the simulation is identical with the layer on (its hash is the same); a technique's own authored body keeps most of its say (× 0.3 inside it)
// ── (88573ef0's header, unchanged) ── tc_playtest1/pt_body.js — TECHNICAL-CONTROL PLAYTEST-1: THE PRESENTATION (the posed human body from the authoritative simulation) ═══════════
// The body is drawn FROM the simulation and never feeds back into it (animation ON / OFF cannot change a decision, a contact or the ball — the
// neutrality test runs the simulation both ways). It reuses TECHNICAL-CONTROL-1.5's pose code unchanged (technical_control15/tc15_ref.js — the
// contact pose on DRIBBLE-1's boot hull, RUN-1's swing path, the authored waypoints, TECHNICAL-CONTROL-1.1's leg chain, the heel / pivot rules) on an
// adapter that feeds it the PLAYTEST's state instead of one authored reference:
//   · the centre of mass, its velocity, the pelvis heading and the posture channels: the plan active at the time (pt_sim's history, 12 s)
//   · the stances: that plan's (committed + planned); a swing = the foot's last stance before t → its next one; its contact = the plan's contact
//     in that swing (executed: the authoritative record — the ball where it really was, vIn → vOut; planned: the ball predicted from the plan's
//     start) — a technique's contact carries its authored swing (waypoints in the technique's frame: entry heading h0, mirror m, exit rotation)
//   · STATELESS: a pose at t is a function of the recorded history at t (live and replay draw the same body); a re-plan that moves a swing in flight
//     (its landing / its touch) blends from the previous plan's foot over 0.12 s (the "swing-key inheritance": no pop)
import { RefSim, exposureAt, clearancesOf, DIRS, Curve as RCurve, RF, wrapA } from "../technical_control15/tc15_ref.js";
import { HB } from "../receive_turn11/rt11_body.js";
import { bootHull, Q, legIK, swivelFor, footOut, ankleFor, ballGap } from "../technical_control11/tc11_leg.js";
import { predict, speedFor, R } from "../tc_baseline_88573ef0/pt_ball.js";
import { TEMPLATES } from "../tc_baseline_88573ef0/pt_tech.js";
const DEG = Math.PI / 180, PI2 = Math.PI / 2, DT = 1 / 240, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, SIDES = ["R", "L"];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const dir = (h) => [Math.cos(h), Math.sin(h)], hdg = (v) => Math.atan2(v[1], v[0]), sgnF = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
function herm3(a, b, t) { const T = b.t - a.t, u = clamp((t - a.t) / T, 0, 1), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [0, 1, 2].map((i) => h00 * a.p[i] + h10 * T * a.v[i] + h01 * b.p[i] + h11 * T * b.v[i]); }
const BLEND = 0.12;
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => s5((x - a) / max(1e-6, b - a));
// the acknowledgement's bounds (B1)
const ZERO_ACK = { L: 0, inTech: 1, pelvis: 0, torso: 0, head: 0, lean: 0, side: 0, crouch: 0 };
export const ACK = { dead: 4, pelvis: [0.22, 9], torso: [0.30, 13], head: [0.85, 60], foot: [0.35, 14], crouch: 0.02 };
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
    this.O = [0, 0]; this.th0 = 0; this.T = { gait: null, sway: 1, armSide: null }; this.fk = null; this.cache = new Map(); this.ctx = null;
  }
  // ── the frames: the adapter's "local" frame IS the pitch (th0 = 0, O = 0); the technique frames are resolved in wayKey ──────────────────────────
  H(deg) { return deg * DEG; } L2P(q) { return [q[0], q[1]]; } P2L(p) { return [p[0], p[1]]; }
  com(t) { return this.sim.stateAt(t).P; } vel(t) { return this.sim.stateAt(t).V; } psi(t) { return this.sim.stateAt(t).psi; } comL(t) { return this.com(t); }
  // the ball at t: the recorded track (the past, the present), predicted from the present beyond it
  ballAt(t) { const S = this.sim; if (t <= S.t + 1e-9) return S.ballTrack(t).p; const B = S.ballTrack(S.t), f = predict(B.p, B.v, t - S.t); return [f.p[0], f.p[1], R]; }
  // ── the context at t: the plan active then, its stances / contacts resolved for the presentation (cached per plan version) ─────────────────────
  ctxOf(plan) {
    let c = this.cache.get(plan); if (c) return c;
    const st = { R: [], L: [] }; for (const X of SIDES) for (const s of plan.stances[X]) st[X].push(this.stanceOf(s));
    for (const X of SIDES) st[X].sort((a, b) => a.t0 - b.t0);
    c = { plan, st, sw: new Map() }; this.cache.set(plan, c); if (this.cache.size > 400) { const k = this.cache.keys().next().value; this.cache.delete(k); } return c;
  }
  stanceOf(s) { const k = "s" + s.id + "|" + s.t0.toFixed(5) + "|" + s.t1 + "|" + s.pos[0].toFixed(4) + "|" + s.pos[1].toFixed(4); let o = this.cache.get(k); if (o) return o;
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
    // (SUPPORT: the ball as the simulation saw it when it made this plan — after that tick's contact, if one was made then: the record at the
    // plan's tick is the state BEFORE that tick's kick (88573ef0's body predicted the next touch from the pre-kick ball, up to 0.85 m off))
    else { const t0 = S.L && S.L.support ? P.t0 + DT : P.t0, B = S.ballTrack(t0), f = predict(B.p, B.v, c.t - t0); ball = [f.p[0], f.p[1], R]; vIn = f.v;
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
    w = { F: X, t0: a.t1, t1: b.t0, from: a, to: b, con, spec }; const prevCtx = this.ctx; this.ctx = ctx; try { w.keys = this.swingKeys(X, w); } finally { this.ctx = prevCtx; }
    ctx.sw.set(key, w); return w;
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
  footRaw(X, t, ctx) { const f = this.footRaw0(X, t, ctx); return this.sim.L && this.sim.L.ack ? this.prepFoot(f, X, t) : f; }
  footRaw0(X, t, ctx) {
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
    if (f.planted) return f; const con = f.swing && f.swing.con; if (con && (abs(t - con.t) < 0.0125 || (con.surface === "SOLE" && abs(t - con.t) < 0.10))) return f;
    const B = this.ballAt(t), b = [B[0], B[1], max(R, B[2] || R)], cp = Math.cos(f.pitch || 0), fw = [Math.cos(f.yaw) * cp, Math.sin(f.yaw) * cp, Math.sin(f.pitch || 0)], a = f.ank;
    const heel = [a[0] - fw[0] * 0.07, a[1] - fw[1] * 0.07, a[2] - 0.045], toe = [a[0] + fw[0] * 0.21, a[1] + fw[1] * 0.21, a[2] + fw[2] * 0.21 - 0.035];
    const d = [toe[0] - heel[0], toe[1] - heel[1], toe[2] - heel[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], u = clamp(((b[0] - heel[0]) * d[0] + (b[1] - heel[1]) * d[1] + (b[2] - heel[2]) * d[2]) / L2, 0, 1);
    const c = [heel[0] + d[0] * u, heel[1] + d[1] * u, heel[2] + d[2] * u], e = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], dist = hyp(e[0], e[1], e[2]), pen = R + 0.062 - dist;
    if (pen <= 0) return f; let n = [e[0], e[1], max(0, e[2]) + 0.25 * hyp(e[0], e[1])]; const m = hyp(n[0], n[1], n[2]) || 1; n = [n[0] / m, n[1] / m, n[2] / m]; const k = pen + 0.008;
    return Object.assign({}, f, { ank: [a[0] + n[0] * k, a[1] + n[1] * k, a[2] + n[2] * k], cleared: k });
  }
  footAt(X, t, depth = 0) { if (!depth && this.sim.L && this.sim.L.support) return this.feetAt(t)[X]; const f = this.footAtRaw(X, t, depth); return depth ? f : this.clearOfBall(f, X, t); }
  // ═══ SUPPORT: THE CONTINUOUS FOOT TIMELINE (Astra's lesson in the presentation: a foot has one continuous history) ══════════════════════════════
  // Sequential at 240 Hz, cached (live and replay read the same frames). Each foot DISPLAYED = its raw foot (88573ef0's: the plan's stances, its
  // swing keys, its contact poses — the shared plan) + an OFFSET that absorbs every plan switch (the raw foot under the new plan minus under the
  // old, at the same tick) and decays as a critically damped spring (≈ 0.12 s) — position and velocity continuous, never a lag behind a smooth
  // raw foot. The spring tightens so the offset is gone by the foot's next authoritative CONTACT (the boot that plays the ball is drawn there)
  // and by its next TOUCHDOWN (a residual decays in stance as a bounded slide). Ball clearance pushes are rate-limited (≤ 2.5 cm / tick).
  // The plan read at a tick is planAt(t − DT/2): never one adopted only after that tick's step (Astra's convention — live = replay)
  rawAt(X, t, P) { const ctx = this.ctxOf(P), prev = this.ctx; this.ctx = ctx; try { return this.footRaw(X, t, ctx); } finally { this.ctx = prev; } }
  nextEvent(X, t, P) { let tc = null; for (const c of P.contacts) if (c.F === X && !c.done && c.t > t - 1e-9 && c.t < t + 0.5) { tc = c.t; break; } const L = P.stances[X], s = L.find((q) => q.t0 > t + 1e-9); return { tc, td: s ? s.t0 : null }; }
  feetAt(t) { const T = this.tl || (this.tl = { k: -1, frames: new Map(), st: null }), k = Math.round(t / DT); if (T.frames.has(k)) return T.frames.get(k);
    if (k < T.k || k - T.k > 2400) { T.k = k - 1; T.st = null; }   // (a jump far back / ahead: restart there — the audit and the page pose sequentially)
    while (T.k < k) { T.k++; T.frames.set(T.k, this.tlTick(T.k * DT, T)); if (T.frames.size > 240 * 16) T.frames.delete(T.frames.keys().next().value); }
    return T.frames.get(k); }
  tlTick(t, T) { const P = this.sim.planAt(Math.max(0, t - DT / 2)), out = {};
    if (!T.st) T.st = { P, R: { o: [0, 0, 0], ov: [0, 0, 0], oy: 0, oyv: 0, push: 0 }, L: { o: [0, 0, 0], ov: [0, 0, 0], oy: 0, oyv: 0, push: 0 } };
    const switched = T.st.P !== P, pre = {};
    for (const X of SIDES) { const S = T.st[X], raw = this.rawAt(X, t, P);
      if (switched) { const old = this.rawAt(X, t, T.st.P); for (let i = 0; i < 3; i++) S.o[i] += old.ank[i] - raw.ank[i]; S.oy += wrap(old.yaw - raw.yaw); }
      // (the spring: ω so that it settles before the next contact / touchdown of this foot — 4 / ω ≈ the time left; at least 0.12 s's spring)
      const ev = this.nextEvent(X, t, P), left = Math.min(ev.tc != null ? ev.tc - t : 9, !raw.planted && ev.td != null ? ev.td - t : 9), w = Math.max(4 / 0.12, 4 / Math.max(0.012, left)), wy = Math.max(4 / 0.10, 4 / Math.max(0.012, left));
      for (let i = 0; i < 3; i++) { const a = -w * w * S.o[i] - 2 * w * S.ov[i]; S.ov[i] += a * DT; S.o[i] += S.ov[i] * DT; if (Math.abs(w * DT) > 0.9) { S.o[i] = 0; S.ov[i] = 0; } }
      { const a = -wy * wy * S.oy - 2 * wy * S.oyv; S.oyv += a * DT; S.oy += S.oyv * DT; if (Math.abs(wy * DT) > 0.9) { S.oy = 0; S.oyv = 0; } }
      { S.op = S.op || 0; S.opv = S.opv || 0; const a = -wy * wy * S.op - 2 * wy * S.opv; S.opv += a * DT; S.op += S.opv * DT; if (Math.abs(wy * DT) > 0.9) { S.op = 0; S.opv = 0; } }
      // (a FOOT SPEED LIMIT: the drawn ankle never moves more than 9 cm in a tick (≈ 22 m/s, a kicking foot's speed) — the excess goes into the
      // offset and is caught up by the spring; the spring itself is capped at 5 m/s relative — no plan switch, no fast authored swing teleports a foot)
      // (the cap rises toward a coming contact just enough for the offset to be gone there: ≤ 14 m/s, the drawn foot still ≤ 9 cm / tick)
      { const m = hyp(S.ov[0], S.ov[1], S.ov[2]), om = hyp(S.o[0], S.o[1], S.o[2]), cap = ev.tc != null && ev.tc - t < 0.2 ? clamp(1.3 * om / Math.max(0.015, ev.tc - t - 0.01), 5, 14) : 5; if (m > cap) for (let i = 0; i < 3; i++) S.ov[i] *= cap / m; }
      let f = Object.assign({}, raw, { ank: [raw.ank[0] + S.o[0], raw.ank[1] + S.o[1], Math.max(HB.ankleH - 0.012, raw.ank[2] + S.o[2])], yaw: raw.yaw + S.oy, pitch: (raw.pitch || 0) + (S.op || 0), tlOff: hyp(S.o[0], S.o[1], S.o[2]) });
      if (f.ballPt) f.ballPt = [f.ballPt[0] + S.o[0], f.ballPt[1] + S.o[1]];
      pre[X] = { f, ev }; }
    // THE SWING CORRIDOR (Astra's: a swing foot passes the support leg on its own side): in the body's heading frame a swinging foot alongside
    // the other foot (fore–aft within 0.35 m) keeps ≥ 0.14 m of lateral separation from it on its own side, and its yaw within ±22° of the
    // heading (opening to ±45° late in the swing) — weighted off near its own contact (the boot that plays the ball is drawn exactly there) and
    // rate-limited (≤ 2 cm / tick: a route, not a jump). Presentation only; the plan's stances and contacts are untouched
    const st = this.sim.stateAt(t, P), ps = st.psi, fw = [Math.cos(ps), Math.sin(ps)], rt = [-Math.sin(ps), Math.cos(ps)];
    for (const X of SIDES) { const S = T.st[X], { f, ev } = pre[X], o = pre[other(X)].f; let g = f;
      let want = 0, wy = 0;
      if (!f.planted) { const dc = ev.tc != null ? ev.tc - t : 9, con = f.swing && f.swing.con, dp = con ? abs(t - con.t) : 9, ex = sstep(0.03, 0.12, min(abs(dc), dp));
        const d = [f.ank[0] - o.ank[0], f.ank[1] - o.ank[1]], a = d[0] * fw[0] + d[1] * fw[1], l = (d[0] * rt[0] + d[1] * rt[1]) * sgnF(X), near = 1 - sstep(0.22, 0.35, abs(a));
        want = ex * near * max(0, 0.14 - l);
        const w = f.swing, u = w ? clamp((t - w.t0) / max(1e-3, w.t1 - w.t0), 0, 1) : 0, lim = (22 + 23 * sstep(0.65, 0.95, u)) * DEG, e = wrap(f.yaw - ps);
        wy = ex * (abs(e) > lim ? (abs(e) - lim) * Math.sign(e) : 0); }
      S.sep = clamp(want, (S.sep || 0) - 0.02, (S.sep || 0) + 0.02); S.syaw = clamp(wy, (S.syaw || 0) - 3 * DEG, (S.syaw || 0) + 3 * DEG);
      if (S.sep > 1e-6 || abs(S.syaw) > 1e-6) { const k = S.sep * sgnF(X); g = Object.assign({}, f, { ank: [f.ank[0] + rt[0] * k, f.ank[1] + rt[1] * k, f.ank[2]], yaw: f.yaw - S.syaw, corridor: S.sep }); }
      // (clearance: the baseline's push, rate-limited — the boot leaves the ball smoothly instead of jumping clear)
      const c = this.clearOfBall(g, X, t), cw = c.cleared || 0; S.push = clamp(cw, S.push - 0.025, S.push + 0.025);
      if (cw > 1e-6 && S.push > 0) { const k2 = S.push / cw; g = Object.assign({}, g, { ank: g.ank.map((x, i) => x + (c.ank[i] - x) * k2), cleared: S.push }); }
      // (the speed limit on the foot as drawn — after the corridor and the clearance: the excess becomes offset, caught up by the spring)
      if (S.last) { const q = [g.ank[0] - S.last[0], g.ank[1] - S.last[1], g.ank[2] - S.last[2]], m = hyp(q[0], q[1], q[2]);
        if (m > 0.09) { const e = 1 - 0.09 / m, d = q.map((x) => x * e); for (let i = 0; i < 3; i++) S.o[i] -= d[i]; g = Object.assign({}, g, { ank: g.ank.map((x, i) => x - d[i]), limited: m }); } }
      // (and on its turning: yaw ≤ 5°, pitch ≤ 4° per tick — a swing key's orientation step becomes a fast turn, never a flip)
      if (S.lastYaw != null) { const dy = wrap(g.yaw - S.lastYaw), dp = (g.pitch || 0) - S.lastPitch, ey = abs(dy) > 5 * DEG ? dy - Math.sign(dy) * 5 * DEG : 0, ep = abs(dp) > 4 * DEG ? dp - Math.sign(dp) * 4 * DEG : 0;
        if (ey || ep) { S.oy -= ey; S.op -= ep; g = Object.assign({}, g, { yaw: g.yaw - ey, pitch: (g.pitch || 0) - ep }); } }
      S.last = g.ank.slice(); S.lastYaw = g.yaw; S.lastPitch = g.pitch || 0; out[X] = g; }
    T.st.P = P; return out; }
  // (B2 early on: a swing re-timed toward a touch finishes its blend BEFORE that touch — the foot that plays the ball is the foot drawn there)
  // (also for B4 / B5: a generic touch or a quick step into a technique re-times the touching foot's swing in the same way)
  blendOf(f, tr) { const con = f.swing && f.swing.con, L = this.sim.L; if (!(L && (L.early || L.generic || L.windups)) || !con || con.t <= tr) return BLEND; return clamp(0.8 * (con.t - tr), 0.03, BLEND); }
  footAtRaw(X, t, depth = 0) {
    const P = this.sim.planAt(t), ctx = this.ctxOf(P), f = this.footRaw(X, t, ctx);
    if (depth >= 3 || f.planted || t - P.t0 >= BLEND) return f;
    const i = this.sim.plans.indexOf(P); if (i <= 0) return f; const Pp = this.sim.plans[i - 1], tr = P.t0, BL = this.blendOf(f, tr); if (t - tr >= BL) return f;
    // the previous plan's foot at the re-plan (itself blended), against this plan's there: the difference decays
    const fp = this.footBlendAt(X, tr, Pp, depth + 1), fn = this.footRaw(X, tr, ctx); if (!fp || fp.planted !== fn.planted) return f;
    const k = 1 - s5((t - tr) / BL), d = [fp.ank[0] - fn.ank[0], fp.ank[1] - fn.ank[1], fp.ank[2] - fn.ank[2]];
    if (hyp(d[0], d[1], d[2]) > 0.6) return f;
    return Object.assign({}, f, { ank: [f.ank[0] + d[0] * k, f.ank[1] + d[1] * k, max(HB.ankleH - 0.012, f.ank[2] + d[2] * k)], yaw: f.yaw + wrap(fp.yaw - fn.yaw) * k, pitch: f.pitch + (fp.pitch - fn.pitch) * k, roll: f.roll + ((fp.roll || 0) - (fn.roll || 0)) * k });
  }
  footBlendAt(X, t, P, depth) { const ctx = this.ctxOf(P), f = this.footRaw(X, t, ctx); if (depth >= 3 || f.planted || t - P.t0 >= BLEND) return f;
    const i = this.sim.plans.indexOf(P); if (i <= 0) return f; const Pp = this.sim.plans[i - 1], tr = P.t0, fp = this.footBlendAt(X, tr, Pp, depth + 1), fn = this.footRaw(X, tr, ctx); if (!fp || fp.planted !== fn.planted) return f;
    const k = 1 - s5((t - tr) / BLEND), d = [fp.ank[0] - fn.ank[0], fp.ank[1] - fn.ank[1], fp.ank[2] - fn.ank[2]]; if (hyp(d[0], d[1], d[2]) > 0.6) return f;
    return Object.assign({}, f, { ank: [f.ank[0] + d[0] * k, f.ank[1] + d[1] * k, f.ank[2] + d[2] * k], yaw: f.yaw + wrap(fp.yaw - fn.yaw) * k, pitch: f.pitch + (fp.pitch - fn.pitch) * k }); }
  // the heel's rise (RefSim's; a standing stance never lifts: only its authored rise)
  heelOf(s, t) { if (s.t1 === Infinity) return s.heel ? s.heel(t) * DEG : 0; return RefSim.prototype.heelOf.call(this, s, t); }
  loadOf(X, t) { const S = this.ctxAt(t).st[X], s = S.find((q) => t >= q.t0 && t <= q.t1); if (!s) return 0; return clamp((t - s.t0) / HB.load, 0, 1) * clamp((s.t1 === Infinity ? 9 : s.t1 - t) / HB.unload, 0, 1); }
  cycle(t) { const st = this.ctxAt(t).st; let lastTD = -9, nextTD = 9, sw = "R"; for (const X of SIDES) for (const s of st[X]) { if (s.t0 <= t && s.t0 > lastTD) lastTD = s.t0; if (s.t0 > t && s.t0 < nextTD) { nextTD = s.t0; sw = X; } }
    return { u: lastTD > -9 && nextTD < 9 ? clamp((t - lastTD) / max(0.05, nextTD - lastTD), 0, 1) : 0.5, sw }; }
  // ── THE POSE at t (tick-aligned): RefSim.poseAt on this adapter, the diagnostics (protection, leg clearances, the ball against the boots) ───────
  // ── B1: THE ACKNOWLEDGEMENT at t — stateless: from the recorded input up to t (live and replay draw the same body) ─────────────────────────────
  // the lead L: the newest intent against the body's heading (its travel; its facing when slow), averaged over the last 25 ms (it rises within a
  // frame or two and dies away as the body turns onto the line); every part a bounded share of it
  leadAt(t) { const S = this.sim, k = Math.round(t / DT) - 1, I = S.log.input; let L = 0, n = 0;
    for (let j = 0; j < 6; j++) { const kk = k - j; if (kk < 0 || 3 * kk + 2 >= I.length) continue; n++; const h = I[3 * kk]; if (h === -99) continue; const st = S.stateAt(kk * DT + DT), ref = st.s > 1.0 ? st.h : st.psi, e = wrap(h - ref);
      if (abs(e) > ACK.dead * DEG) L += clamp(e, -170 * DEG, 170 * DEG); }
    return n ? L / n : 0; }
  // (a reversal the technique makes the long way round — a drag-back to the right for a request 170° to the left: the lead goes the technique's
  // way, never the other — the body must not begin a turn its technique then undoes)
  ack(t) { const S = this.sim, a = this.sim.planAt(t).action; let L = this.leadAt(t);
    if (a.tech && t < a.tRelease && abs(L) > 90 * DEG) { const w = a.m * TEMPLATES[a.tech].turn; if (w * L < 0) L = clamp(L - Math.sign(L) * 2 * Math.PI, -170 * DEG, 170 * DEG); }
    const b = (k) => clamp(ACK[k][0] * L, -ACK[k][1] * DEG, ACK[k][1] * DEG), inTech = 1;
    const s0 = S.stateAt(t - DT), s1 = S.stateAt(t + DT), V = [(s0.V[0] + s1.V[0]) / 2, (s0.V[1] + s1.V[1]) / 2], A = [(s1.V[0] - s0.V[0]) / (2 * DT), (s1.V[1] - s0.V[1]) / (2 * DT)], sp = hyp(V[0], V[1]);
    const aL = sp > 0.5 ? (A[0] * V[0] + A[1] * V[1]) / sp : 0, aN = sp > 0.5 ? (V[0] * A[1] - V[1] * A[0]) / sp : 0, run = clamp(sp / 4, 0, 1);
    return { L, inTech, pelvis: b("pelvis") * inTech, torso: b("torso") * inTech / DEG, head: b("head") * inTech,
      lean: clamp(0.6 * aL, -8, 2), side: clamp(0.7 * aN + 4 * Math.sin(clamp(L, -PI2, PI2)) * run * inTech, -10, 10), crouch: ACK.crouch * clamp((abs(L) / DEG - 30) / 60, 0, 1) * run * inTech }; }
  // the support foot's preparation: a gait stance turned toward the new line about the ball of its foot (its lead at its touchdown; in the swing
  // toward it, the lead as it is now) — authored (technique) stances and pivots keep their own yaw
  prepOf(s, t) { if (!s || (s.src !== "gait" && s.src !== "stand") || s.pivot) return 0; const L = this.leadAt(Math.min(t, s.t0)); return clamp(ACK.foot[0] * L, -ACK.foot[1] * DEG, ACK.foot[1] * DEG); }
  rotShift(f, d) { if (!d || !f.ballPt) return [0, 0]; const bk = hyp(f.ank[0] - f.ballPt[0], f.ank[1] - f.ballPt[1]), y = f.yaw; return [-Math.cos(y + d) * bk + Math.cos(y) * bk, -Math.sin(y + d) * bk + Math.sin(y) * bk]; }
  prepFoot(f, X, t) {
    if (f.planted) { const d = this.prepOf(f.stance, t); if (!d) return f; const sh = this.rotShift(f, d); return Object.assign({}, f, { ank: [f.ank[0] + sh[0], f.ank[1] + sh[1], f.ank[2]], yaw: f.yaw + d, prep: d }); }
    const w = f.swing; if (!w) return f; const u = s5((t - w.t0) / max(1e-3, w.t1 - w.t0)), da = this.prepOf(w.from, w.from.t0), db = this.prepOf(w.to, t); if (!da && !db) return f;
    const fa = this.stanceFoot(w.from, w.from.t1), fb = this.stanceFoot(w.to, w.to.t0), sa = this.rotShift(fa, da), sb = this.rotShift(fb, db), d = lerp(da, db, u);
    return Object.assign({}, f, { ank: [f.ank[0] + lerp(sa[0], sb[0], u), f.ank[1] + lerp(sa[1], sb[1], u), f.ank[2]], yaw: f.yaw + d, prep: d }); }
  pose(t) {
    const P = this.sim.planAt(t), ctx = this.ctxOf(P); this.ctx = ctx; const ch = P.ch, ACKON = !!(this.sim.L && this.sim.L.ack);
    if (!ACKON) { this.ch = { lean: ch.lean, side: ch.side, trunk: ch.trunk, crouch: ch.crouch, arms: ch.arms, look: ch.look, face: { at: (x) => this.psi(x) / DEG } }; this.ak = null; }
    else { const ak = this.ack(t); this.ak = ak; const add = (C, v) => ({ at: (x) => C.at(x) + (x === t ? v : 0) });
      this.ch = { lean: add(ch.lean, ak.lean), side: add(ch.side, ak.side), trunk: add(ch.trunk, ak.torso), crouch: add(ch.crouch, ak.crouch), arms: ch.arms, look: ch.look, face: { at: (x) => this.psi(x) / DEG } }; }
    this.T = { gait: ch.gait ? ch.gait.K : null, sway: 1, armSide: null };
    const SUP = !!(this.sim.L && this.sim.L.support);
    let p; try { p = ACKON || SUP ? this.poseAtAck(t, this.ak || ZERO_ACK, SUP) : this.poseAt(t); } finally { this.ctx = null; }
    const a = P.action, st = this.sim.stateAt(t, P), h0 = a.tech && t < a.tRelease + 0.3 ? a.h0 : (st.s > 1.0 ? st.h : st.psi);
    p.exp = exposureAt(p.J, [p.ball[0], p.ball[1], p.ball[2]], h0); p.h0 = h0; p.clr = clearancesOf(p.J); p.plan = P; return p;
  }
  // RefSim.poseAt (TECHNICAL-CONTROL-1.5's, copied unchanged) with B1: the pelvis's heading leads the simulation's facing by ak.pelvis, the head
  // looks along the intent (ak.head) — weighted off the ball while the lead is large — the rest through the channels (trunk, leans, crouch)
  poseAtAck(t, ak, support = false) {
    const E = this.E, R3 = E.R3, b = this.b, ch = this.ch, rot = {}, feet = { R: this.footAt("R", t), L: this.footAt("L", t) }, S = this.com(t), psi = this.psi(t) + ak.pelvis, V = this.vel(t), sp = hyp(V[0], V[1]), run = clamp(sp / 6, 0, 1), cy = this.cycle(t);
    const lR = this.loadOf("R", t), lL = this.loadOf("L", t), ld = clamp(lR + lL, 0, 1), wR = lR + lL > 1e-6 ? lR / (lR + lL) : 0.5, Fw = [wR * feet.R.ank[0] + (1 - wR) * feet.L.ank[0], wR * feet.R.ank[1] + (1 - wR) * feet.L.ank[1]];
    const hc = Math.cos(psi), hs = Math.sin(psi), dF = [Fw[0] - S[0], Fw[1] - S[1]], lt = -dF[0] * hs + dF[1] * hc, kL = RF.comPull * (1 - 0.6 * run) * ld * (this.T.sway != null ? this.T.sway : 1), sw = support ? clamp(lt * kL, -0.04, 0.04) : lt * kL; let P = [S[0] - sw * hs, S[1] + sw * hc];   // (SUPPORT: 88573ef0's sway over the stance foot, ≤ 4 cm)
    const g = this.T.gait ? clamp(new RCurve(this.T.gait).at(t), 0, 1) : 1, bob = -clamp(RF.bob[0] + RF.bob[1] * sp, 0, RF.bob[2]) * Math.cos(2 * Math.PI * (cy.u - 0.35)) * g, gTw = sgnF(cy.sw) * clamp(RF.twist[0] + RF.twist[1] * sp, 0, RF.twist[2]) * DEG * Math.sin(Math.PI * cy.u) * g;
    const lean = ch.lean.at(t) * DEG, side = ch.side.at(t) * DEG, trunk = ch.trunk.at(t) * DEG, crouch = ch.crouch.at(t), arms = ch.arms.at(t);
    let pelvis = [0, b.pelvisY - 0.02 - crouch + bob + 0.012 * run, 0.02 * run], Rp = R3.mul3(R3.y(gTw), R3.x(lean * 0.35), R3.z(-side * 0.45));
    rot.pelvis = Rp; rot.spine = R3.mul3(R3.y(trunk * 0.45 - gTw * 0.6), R3.x(lean * 0.3), R3.z(-side * 0.3)); rot.chest = R3.mul3(R3.y(trunk * 0.55 - gTw * 0.5), R3.x(lean * 0.35), R3.z(-side * 0.25));
    const swing = clamp(RF.armSwing[0] + RF.armSwing[1] * sp, 0, RF.armSwing[2]) * DEG * Math.sin(Math.PI * cy.u) * sgnF(cy.sw) * g, armSide = this.T.armSide ? new RCurve(this.T.armSide).at(t) : 0;
    for (const X of SIDES) { const sx = sgnF(X), abd = 10 + 38 * arms * (1 + 0.5 * sx * armSide), arm = sx * swing;
      rot["clavicle_" + X] = R3.I(); rot["upperArm_" + X] = R3.mul3(R3.z(sx * abd * DEG), R3.x(-arm - 4 * DEG - 10 * DEG * arms), R3.y(-sx * 8 * DEG)); rot["foreArm_" + X] = R3.x(-(35 + 45 * run * g + 20 * arms) * DEG); rot["hand_" + X] = R3.mul(R3.x(-8 * DEG), R3.z(-sx * 6 * DEG)); }
    const ball = this.ballAt(t), Rch = R3.mul3(Rp, rot.spine, rot.chest), headW = [pelvis[0], pelvis[1] + 0.68, pelvis[2] + 0.05], lk = clamp(ch.look.at(t), 0, 1), dB = hyp(ball[0] - S[0], ball[1] - S[1]);
    { const wB = lk * (1 - sstep(1.2, 2.2, dB)) * (1 - 0.6 * min(1, abs(ak.L) / (30 * DEG)) * ak.inTech), hL = (sp > 0.5 ? hdg(V) : this.psi(t)) + ak.head, tgt = [lerp(S[0] + Math.cos(hL) * 6, ball[0], wB), lerp(S[1] + Math.sin(hL) * 6, ball[1], wB), lerp(0.7, ball[2], wB)], q = this.toM(tgt, S, psi), d = [q[0] - headW[0], q[1] - headW[1], q[2] - headW[2]];
      const yw = clamp(Math.atan2(d[0], d[2]), -75 * DEG, 75 * DEG), pt = clamp(Math.atan2(-d[1], hyp(d[0], d[2])), -45 * DEG, 55 * DEG), want = R3.mul(R3.y(yw), R3.x(pt)), Qm = R3.mul(R3.tr(Rch), want), qa = R3.toYXZ(Qm);
      rot.neck = R3.yxz(qa[0] * 0.4, qa[1] * 0.4, qa[2] * 0.4); rot.head = R3.mul(R3.tr(rot.neck), Qm); }
    let reachM = 0; const c = Math.cos(psi), s = Math.sin(psi);
    if (support) { // (SUPPORT: the rendered root is the authoritative root, exactly — no horizontal reach pull; a planted / contacting / swinging leg
      // that cannot reach lowers the whole body a little instead (Astra's vertical compression, ≤ 7.5 cm), continuously)
      const nominalY = pelvis[1]; for (const X of SIDES) { const sx = sgnF(X), a = this.toM(feet[X].ank, P, psi), hip = Q.v(Rp, [sx * b.hipX, 0, 0]), dx = a[0] - hip[0], dz = a[2] - pelvis[2] - hip[2], vertical = Math.sqrt(Math.max(0.1, (b.legLen * 0.985) ** 2 - dx * dx - dz * dz));
        pelvis[1] = Math.min(pelvis[1], Math.max(nominalY - 0.075, a[1] + vertical - hip[1])); } reachM = nominalY - pelvis[1]; }
    else     for (let it = 0; it < 3; it++) { let moved = false, dP = [0, 0], drop = 0;
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

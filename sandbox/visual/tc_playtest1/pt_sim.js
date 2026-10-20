// ═══ tc_playtest1/pt_sim.js — TECHNICAL-CONTROL PLAYTEST-1: THE AUTHORITATIVE PLAYABLE SIMULATION ═══════════════════════════════════════════════════
// One player and the frozen ball kernel, 240 Hz, driven only by a movement REQUEST (a direction or none, and a speed mode) — no skill input. The
// footballer decides how to achieve it:
//   · A PLAN is the near future (1.5 s): the centre of mass's path (speed / travel heading, integrated tick by tick), the pelvis heading, the
//     posture channels, every footfall (foot, touchdown, lift-off, where, the foot's heading) and every planned ball contact (foot, surface, tick,
//     what the touch must do). The simulation only EXECUTES the current plan: the body moves along it, a contact at its tick is one kernel launch
//     computed from where the ball really is.
//   · THE RESOLVER re-plans from the present when the request changes, after every contact (closed loop: the ball where it really went), at every
//     footfall and at least every 0.3 s. Candidates: the CARRY (TECHNICAL-CONTROL-1.2's carry: the lane, the lane foot's touches every one or more
//     strides by speed, forward pushes with the laces / outer instep, corrections with the inside or outside, the body bending at Agility's limits)
//     and every feasible instance of the five TECHNICAL-CONTROL-1.5 techniques (pt_tech.js) — either foot, either side, any angle inside a technique's
//     hard range, the decisive contact anchored on the stride (the technique's first stance must be the right foot at the right time, so WHEN the
//     request comes decides which techniques are possible). Each is scored (time to the decisive contact, time to the new line, contacts, protection,
//     the angle's fit, the speed's fit, the preferred foot, the ball's separation) and the best is executed — no angle buckets.
//   · COMMITMENT (Dribbling): a footfall or a contact closer than `react` cannot change; a technique is committed `commit` before its decisive contact
//     and stays until its plant is released — while committed, a new request only re-targets its exit (within its range).
// Everything here is deterministic (fixed tick, no clock, no randomness at Ball Control 99; below 99 the provisional execution error is keyed on the
// seed and the contact). Nothing here reads the posed body (pt_body.js is presentation).
// FRAMES: pitch (x, y) metres; heading h with dir(h) = (cos h, sin h); the player's right = (−sin h, cos h); + heading change = a right turn.
import { DT, R, Ball, predict, speedFor, rollFrom } from "./pt_ball.js";
import { params, gaitTable, lead, WIDTH, DEG, MODES } from "./pt_params.js";
import { TEMPLATES, TECH_IDS, LABEL } from "./pt_tech.js";
import { pchip, pchipAt } from "../technical_control11/tc11_leg.js";
export { DT, R, DEG, MODES, TEMPLATES, LABEL };
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, PI = Math.PI;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const wrap = (a) => { a = (a + PI) % (2 * PI); if (a < 0) a += 2 * PI; return a - PI; };
export const dir = (h) => [Math.cos(h), Math.sin(h)], rgt = (h) => [-Math.sin(h), Math.cos(h)], hdg = (v) => Math.atan2(v[1], v[0]);
const sgn = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
const lerp = (a, b, t) => a + (b - a) * t;
export const toLocal = (q, P, h) => { const dx = q[0] - P[0], dy = q[1] - P[1], c = Math.cos(h), s = Math.sin(h); return [dx * c + dy * s, -dx * s + dy * c]; };
export const fromLocal = (P, h, a, l) => { const c = Math.cos(h), s = Math.sin(h); return [P[0] + a * c - l * s, P[1] + a * s + l * c]; };
export class Curve { constructor(keys) { this.K = keys.slice().sort((a, b) => a[0] - b[0]); for (let i = this.K.length - 1; i > 0; i--) if (this.K[i][0] - this.K[i - 1][0] < 1e-6) this.K.splice(i - 1, 1); this.P = this.K.length > 1 ? pchip(this.K.map(([t, v]) => ({ t, v: [v] })), 1) : null; }
  at(t) { return this.P ? pchipAt(this.P, t, 1)[0] : this.K[0][1]; } }
// the carry's constants (TECHNICAL-CONTROL-1.2's carry, re-stated)
export const CARRY = {
  touchBefore: 0.075,                            // a touch at the end of the touching foot's swing, this long before it lands (TECHNICAL-CONTROL-1)
  ahead: (v) => min(0.50, 0.30 + 0.03 * v),      // the next touch point: ahead of the centre of mass …
  lane: (mode) => (mode === "WALK" ? 0.10 : mode === "SPRINT" ? 0.12 : 0.13), // … and to the touching foot's side
  rhythm: (mode, v) => ((mode === "SPRINT" && v > 5.6) || v > 6.2 ? 2 : 1), // swings of the touching foot between two touches (sprint at speed: touch → strides → touch; accelerating: every swing)
  reach: { a: [0.06, 0.78], l: [-0.14, 0.44], slow: { a: [-0.16, 0.62], l: 0.46 } },   // where a swinging foot can play the ball (centre-of-mass frame)
  redirect: 48,                                  // ° a running touch can redirect the ball at most (any amount below 1.6 m/s)
  vCap: 13.5,
};
const SURF_FWD = 18;                             // ° within which a touch is a forward push (the laces at speed, the outer instep otherwise)
// ═══ THE SIMULATION ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export class PlaySim {
  // env: { E (RUN-1.3), body (r1Body) } · o: { attrs {bc, dri, agi}, foot "R" | "L" | "B", style, seed, start: { P, h } }
  // (env.baked: pt_baked.json — RUN-1's gait table baked once; without it the table is solved here, ≈ 2 s)
  constructor(env, o = {}) { this.E = env.E; this.body = env.body; this.gait = gaitTable(this.E, this.body, env.baked); this.reset(o); }
  reset(o = {}) {
    this.o = Object.assign({ attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 } }, this.o || {}, o);
    this.P = params(this.o.attrs); this.k = 0; this.t = 0; this.ver = 0; this.sid = 0; this.cid = 0; this.aid = 0;
    const S = this.o.start, h = S.h, lane = this.o.foot === "L" ? -0.10 : this.o.foot === "R" ? 0.10 : 0, bp = fromLocal(S.P, h, 0.36, lane);
    this.ball = new Ball(bp, [0, 0]); this.contacts = []; this.log = { input: [], actions: [], replans: 0, plans: 0, events: [] }; this.hash = 2166136261 >>> 0; this.cpu = { replan: [], step: [] };
    // standing: both feet planted (an "infinite" stance), facing h
    const st = (F) => ({ id: ++this.sid, F, t0: -1, t1: Infinity, pos: fromLocal(S.P, h, F === "R" ? -0.02 : 0.04, sgn(F) * WIDTH.stand), yaw: h + sgn(F) * 6 * DEG, kind: "standing", src: "stand" });
    this.plan = this.mkPlan({ t0: 0, st: { P: S.P.slice(), s: 0, h, psi: h, w: 0 }, stances: { R: [st("R")], L: [st("L")] }, contacts: [], action: { kind: "CARRY", label: "STANDING", id: ++this.aid }, req: null, ch0: null, prog: { kind: "carry" } });
    this.plans = [this.plan]; this.req = null; this.lastReq = null; this.flags = { replan: "start" };
    this.track = { N: 240 * 12, buf: new Float64Array(240 * 12 * 9) }; this.record();
    return this;
  }
  // (live changes are part of the record: the tick they apply at — a re-simulation from the record applies them at the same tick)
  setAttrs(attrs) { this.o.attrs = Object.assign({}, this.o.attrs, attrs); this.P = params(this.o.attrs); this.flags.replan = "attributes"; this.log.events.push({ k: this.k, kind: "attrs", v: Object.assign({}, this.o.attrs) }); }
  setFoot(foot) { this.o.foot = foot; this.flags.replan = "foot"; this.log.events.push({ k: this.k, kind: "foot", v: foot }); }
  // ── the present (from the current plan) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  stateAt(t, plan = this.planAt(t)) { const i = clamp((t - plan.t0) / DT, 0, plan.n), j = min(plan.n - 1, Math.floor(i)), u = i - j, P = plan.P, V = plan.V;
    const p = [P[2 * j] + (P[2 * j + 2] - P[2 * j]) * u, P[2 * j + 1] + (P[2 * j + 3] - P[2 * j + 1]) * u], v = [V[2 * j] + (V[2 * j + 2] - V[2 * j]) * u, V[2 * j + 1] + (V[2 * j + 3] - V[2 * j + 1]) * u];
    const psi = plan.psi[j] + wrap(plan.psi[j + 1] - plan.psi[j]) * u; if (i >= plan.n) { const d = t - plan.t0 - plan.n * DT; p[0] += v[0] * d; p[1] += v[1] * d; } return { P: p, V: v, psi, s: hyp(v[0], v[1]), h: hyp(v[0], v[1]) > 0.05 ? hdg(v) : plan.psi[j] }; }
  planAt(t) { const L = this.plans; for (let i = L.length - 1; i >= 0; i--) if (L[i].t0 <= t + 1e-9) return L[i]; return L[0]; }
  // ── one tick: the request, execute the contacts due, step the ball, re-plan when needed ──────────────────────────────────────────────────────
  // req: { h: heading (rad) | null, mode: "WALK" | "JOG" | "RUN" | "SPRINT", keys: bitmask (for the record only) }
  step(req) {
    // (the heading is quantised to 1e-6 rad BEFORE use: the record holds exactly what the simulation used — a re-simulation is bit-identical)
    const t = this.t; this.req = req && req.h != null ? { h: Math.round(req.h * 1e6) / 1e6, mode: req.mode || "RUN", keys: req.keys | 0 } : { h: null, mode: (req && req.mode) || "RUN", keys: req ? req.keys | 0 : 0 };
    this.log.input.push(this.req.h == null ? -99 : this.req.h, MODES.indexOf(this.req.mode), this.req.keys);
    // the request changed? (direction > 4°, the mode, start / stop)
    const L = this.lastReq, q = this.req; if (!L || (L.h == null) !== (q.h == null) || L.mode !== q.mode || (q.h != null && abs(wrap(q.h - L.h)) > 4 * DEG)) { this.flags.replan = this.flags.replan || "request"; this.lastReq = q; }
    // the contacts due now: one kernel launch each, from the ball's actual state
    for (const c of this.plan.contacts) if (!c.done && c.k === this.k) this.execute(c);
    // footfalls now (the gait progresses: a re-plan keeps the plan fresh)
    for (const X of ["R", "L"]) for (const s of this.plan.stances[X]) if (abs(s.t0 - t) < DT / 2 && s.t0 > 0) this.flags.replan = this.flags.replan || "footfall";
    if (t - this.plan.t0 > 0.30) this.flags.replan = this.flags.replan || "refresh";
    if (this.flags.replan) { const c0 = performance.now(); this.replan(this.flags.replan); this.cpu.replan.push(performance.now() - c0); this.flags.replan = null; }
    this.ball.step(); this.k++; this.t = this.k * DT; this.record();
    // the authoritative record's fingerprint (the centre of mass, the ball, every 4th tick)
    if (this.k % 4 === 0) { const s = this.stateAt(this.t, this.plan), b = this.ball.p; this.mix(s.P[0]); this.mix(s.P[1]); this.mix(b[0]); this.mix(b[1]); }
  }
  // the ball's track (the tick's kernel state after its step) and its read-back at any recent time
  record() { const b = this.ball.p, v = this.ball.v, q = this.ball.q, o = (this.k % this.track.N) * 9, B = this.track.buf; B[o] = b[0]; B[o + 1] = b[1]; B[o + 2] = b[2]; B[o + 3] = v[0]; B[o + 4] = v[1]; B[o + 5] = q[0]; B[o + 6] = q[1]; B[o + 7] = q[2]; B[o + 8] = q[3]; }
  ballTrack(t) { const k = clamp(Math.round(t / DT), max(0, this.k - this.track.N + 1), this.k), o = (k % this.track.N) * 9, B = this.track.buf; return { p: [B[o], B[o + 1], B[o + 2]], v: [B[o + 3], B[o + 4]], q: [B[o + 5], B[o + 6], B[o + 7], B[o + 8]], k }; }
  mix(x) { const s = x.toFixed(6); let h = this.hash; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } this.hash = h; }
  // ── a contact: the launch from where the ball really is (the plan's intent: a target point at a time, or a velocity) ─────────────────────────
  execute(c) {
    c.done = true; const b = this.ball.p, bv = this.ball.v, me = this.stateAt(this.t, this.plan), rel = toLocal(b, me.P, me.s > 0.5 ? me.h : me.psi);
    // (the ball must be where the foot can play it — never a contact at a distance: a miss re-plans)
    if (hyp(rel[0], rel[1]) > 1.05 || b[2] > 0.5) { c.missed = true; this.flags.replan = "missed contact"; this.contacts.push(Object.assign(this.contactRec(c, bv, bv, null), { missed: true })); return; }
    let v; if (c.aim.kind === "target") { const d = [c.aim.P[0] - b[0], c.aim.P[1] - b[1]], D = hyp(d[0], d[1]), T = max(0.05, c.aim.T - this.t); let sp = D > 1e-3 ? speedFor(D, T) : 0; if (sp == null) sp = CARRY.vCap; sp = min(sp, CARRY.vCap); v = D > 1e-3 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0]; }
    else v = [c.aim.speed * Math.cos(c.aim.h), c.aim.speed * Math.sin(c.aim.h)];
    const intended = v.slice();
    if (this.P.errDir > 0 && hyp(v[0], v[1]) > 0.2) { const r1 = this.rand(c.id, 1), r2 = this.rand(c.id, 2), e = r1 * this.P.errDir * DEG, f = 1 + r2 * this.P.errSpeed, ca = Math.cos(e), sa = Math.sin(e); v = [(v[0] * ca - v[1] * sa) * f, (v[0] * sa + v[1] * ca) * f]; }
    this.ball.launch(v, { foot: c.F, surface: c.surface, role: c.role }); this.contacts.push(this.contactRec(c, bv, v, intended)); this.mix(v[0]); this.mix(v[1]); this.flags.replan = "contact";
  }
  contactRec(c, vIn, vOut, intended) { const a = this.plan.action; return { n: this.contacts.length + 1, k: this.k, t: this.t, F: c.F, surface: c.surface, role: c.role, tech: c.tech || a.kind, action: a.label, actionId: a.id,
    vIn: [vIn[0], vIn[1]], vOut: [vOut[0], vOut[1]], intendedH: intended && hyp(intended[0], intended[1]) > 0.05 ? hdg(intended) : null, actualH: hyp(vOut[0], vOut[1]) > 0.05 ? hdg(vOut) : null, ball: this.ball.p.slice(), reqH: this.req.h, cid: c.id, swing: c.swing || null, frame: c.frame || null, src: c.src, decisive: !!c.decisive }; }
  // a keyed, deterministic standard-normal-ish draw (the provisional Ball Control error below 99)
  rand(id, j) { let h = (2166136261 ^ this.o.seed) >>> 0; for (const x of [id, j, 977]) { h ^= x; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } let s = 0; for (let i = 0; i < 4; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; s += (h / 4294967296); } return (s - 2) * 1.732; }
  // ═══ THE RESOLVER ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  replan(reason) {
    const t = this.t, cur = this.plan, st = this.stateAt(t, cur), q = this.req, P = this.P;
    // what cannot change any more: the footfalls already made (and the swinging foot's coming one within `react`), the contacts within `react`
    const keep = this.committed(cur, t), act = cur.action;
    const setDone = act.tech && cur.contacts.some((c) => c.role === "set touch" && c.done && c.tech === act.tech) && t < act.tC;
    const committedTech = act.tech && ((t >= act.tCommit - 1e-9 && t < act.tRelease) || (setDone && q.h != null && abs(wrap(q.h - act.exitH)) < 35 * DEG));
    // a technique's EXIT (after its plant is released, until its exit touch is made): it runs on — re-targeted — unless the request turns away
    // from its exit by more than 25° (then everything is a candidate again, the continuation among them)
    const exitTouch = act.tech ? cur.contacts.find((c) => c.tech === act.tech && !c.done && !c.decisive && c.role !== "set touch") : null;
    const inExit = act.tech && t >= act.tRelease && exitTouch && t < exitTouch.t + 0.02;
    const cands = [];
    if (committedTech || (inExit && q.h != null && abs(wrap(q.h - act.exitH)) < 25 * DEG)) { const re = this.instantiate(act.tech, act.m, q, st, keep, { pinned: act }); if (!re) return; cands.push(re); }   // (committed: only its exit re-targets; else it runs on as planned)
    else {
      if (inExit) { const re = this.instantiate(act.tech, act.m, q, st, keep, { pinned: act }); if (re) cands.push(re); }
      cands.push(this.carryPlan(st, keep, q, reason));
      const turn = this.turnOf(st, q);
      if (q.h != null && abs(turn) > 16 * DEG && !inExit) for (const id of TECH_IDS) for (const m of [1, -1]) { const p = this.instantiate(id, m, q, st, keep, { pinned: act.tech === id && act.m === m && t < act.tC ? act : null }); if (p) { cands.push(p); if (p.alt) cands.push(p.alt); } }
    }
    for (const c of cands) c.cost = this.cost(c, st, q, cur);
    cands.sort((a, b) => a.cost.J - b.cost.J); const best = cands[0];
    best.why = cands.slice(0, 5).map((c) => ({ label: c.action.label + (c.action.m ? (c.action.m > 0 ? " (R)" : " (L)") : ""), J: +c.cost.J.toFixed(2), note: c.cost.note }));
    best.reason = reason; this.adopt(best);
    if (!this.decision || q.h == null || this.decision.reqH == null || abs(wrap(q.h - this.decision.reqH)) >= 12 * DEG || best.action.kind !== this.decision.kind) this.decision = { reqH: q.h, kind: best.action.kind, t };
  }
  adopt(plan) { plan.v = ++this.ver; this.plan = plan; this.plans.push(plan); this.log.plans++;
    if (plan.action.id !== (this.plans[this.plans.length - 2] || {}).action?.id) this.log.actions.push({ t: this.t, kind: plan.action.kind, label: plan.action.label, m: plan.action.m || 0, why: plan.why });
    // (the history the replay / the presentation needs: 12 s)
    while (this.plans.length > 2 && this.plans[1].t0 < this.t - 12) this.plans.shift(); while (this.contacts.length > 400) this.contacts.shift(); }
  // the signed turn the request asks for, from the body's current travel (its facing when slow)
  turnOf(st, q) { if (q.h == null) return 0; const h = st.s > 1.0 ? st.h : st.psi; return wrap(q.h - h); }
  committed(cur, t) {
    const R = this.P.react, out = { stances: { R: [], L: [] }, contacts: [], lastT: { R: -9, L: -9 } };
    for (const X of ["R", "L"]) { const L = cur.stances[X], nPast = L.filter((s) => s.t0 <= t + 1e-9).length; let i = 0;
      for (const s of L) { const past = s.t0 <= t + 1e-9; if (past) i++; if ((past && (s.t1 > t - 1.0 || i > nPast - 2)) || (s.t0 - t < R && s.t0 > t)) out.stances[X].push(s); } }
    for (const c of cur.contacts) if (!c.done && c.t > t - 1e-9 && c.t - t < R) out.contacts.push(c);
    // a touch committed or just made: its foot's landing after it (the swing the touch belongs to) is committed too
    for (const c of cur.contacts) if ((c.done && c.t > t - 0.2) || out.contacts.includes(c)) { const X = c.F, L = out.stances[X];
      const s = cur.stances[X].find((x) => x.t0 > c.t - 1e-6 && x.t0 <= c.t + 0.25); if (s && !L.includes(s)) { L.push(s); L.sort((a, b) => a.t0 - b.t0); } }
    return out;
  }
  // ── THE COST of a candidate plan: time to the decisive contact, time on the new line, contacts, protection, the angle's and the speed's fit, the
  // preferred foot, the ball's separation; a small hysteresis for the plan already running (no flip-flop) ──────────────────────────────────────
  cost(c, st, q, cur) {
    const t = this.t, a = c.action, notes = [];
    if (c.cost0) return c.cost0;
    let J = 0; const tLine = c.tLine != null ? c.tLine - t : 3.0; J += 2.0 * min(3.0, tLine); notes.push(c.tLine != null ? `line +${tLine.toFixed(2)}s` : "never on the line");
    if (a.tech) { J += 0.8 * (a.tC - t); notes.push(`contact +${(a.tC - t).toFixed(2)}s`); }
    J += 0.22 * (c.nContacts || 0);
    if (c.sepPen) { J += c.sepPen; notes.push(`ball ${c.sepMax.toFixed(1)}m away`); }
    if (a.tech) { const T = TEMPLATES[a.tech], d = abs(a.turnDeg), ex = d < T.comfort[0] ? T.comfort[0] - d : d > T.comfort[1] ? d - T.comfort[1] : 0; if (ex > 0) { J += 0.5 * (ex / 20) * (ex / 20); notes.push(`${d.toFixed(0)}° outside ${T.comfort[0]}–${T.comfort[1]}`); }
      J -= 0.35 * T.protect * clamp((d - 30) / 60, 0, 1);
      const pref = this.o.foot; if (pref !== "B" && a.F !== pref) { J += 0.18; notes.push("weak foot"); }
      if (a.speedFit) { J += a.speedFit; notes.push("speed"); }
      if (a.setTouch) notes.push("set touch"); if (a.setPen > 0.02) { J += a.setPen; notes.push("set off-line"); }
      if (cur.action.tech === a.tech && cur.action.m === a.m) J -= 0.40; }
    else if (cur.action.kind === "CARRY") J -= 0.05;
    const D = this.decision; if (D && q.h != null && D.reqH != null && abs(wrap(q.h - D.reqH)) < 12 * DEG && (a.kind !== cur.action.kind || (a.m || 0) !== (cur.action.m || 0))) { J += 0.5; notes.push("(switch)"); }
    return { J, note: notes.join(" · "), tLine };
  }
  // ═══ BUILDING A PLAN ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // integrate the centre of mass over the horizon from the present: `prog` decides per tick (the carry tracker toward the request, an approach
  // speed profile, a technique's keys); the pelvis heading follows the travel (a second-order follower inside Agility's yaw rate) or the keys
  mkPlan(o) {
    const H = 1.5, n = Math.round(H / DT), Pt = new Float64Array(2 * (n + 1)), Vt = new Float64Array(2 * (n + 1)), psiT = new Float64Array(n + 1), st = o.st, P = this.P;
    let p = st.P.slice(), s = st.s, h = st.h, psi = st.psi, w = st.w || 0; const prog = o.prog, q = o.req;
    for (let i = 0; i <= n; i++) { const t = o.t0 + i * DT; Pt[2 * i] = p[0]; Pt[2 * i + 1] = p[1]; Vt[2 * i] = s * Math.cos(h); Vt[2 * i + 1] = s * Math.sin(h); psiT[i] = psi; if (i === n) break;
      const d = this.progAt(prog, t + DT, s, h, q, p);
      if (d.keyed) { s = d.s; h = d.h; } else { // the carry tracker (Agility): bend toward the request at the lateral limit, accelerate / brake
        const ts = d.speed, th = d.h; if (th != null) { const dh = wrap(th - h); if (s < 0.6) h += clamp(dh, -P.yawRate * DT, P.yawRate * DT); else { const om = min(P.aLat / max(s, 1.2), P.yawRate * 0.8); h += clamp(dh, -om * DT, om * DT); } }
        const want = th != null ? ts * (abs(wrap(th - h)) > 50 * DEG ? max(0.35, Math.cos(wrap(th - h))) : 1) : 0, acc = P.aAcc * clamp(1 - s / 11, 0.35, 1);
        s = s < want ? min(want, s + acc * DT) : max(want, s - P.aBrake * (d.stop ? 0.7 : 1) * DT); }
      const v = [s * Math.cos(h), s * Math.sin(h)]; p = [p[0] + v[0] * DT, p[1] + v[1] * DT];
      // the pelvis heading: keyed in a technique, else following the travel (or the request when slow)
      if (d.psi != null) { w = wrap(d.psi - psi) / DT; psi = d.psi; }
      else { const tgt = s > 1.0 ? h : th0(q, psi), err = wrap(tgt - psi), al = clamp(3600 * err * 0.1 - 38 * w, -9000 * DEG, 9000 * DEG); w = clamp(w + al * DT, -P.yawRate, P.yawRate); psi += w * DT; } }
    function th0(q, psi) { return q && q.h != null ? q.h : psi; }
    const plan = { t0: o.t0, k0: Math.round(o.t0 / DT), n, P: Pt, V: Vt, psi: psiT, stances: o.stances, contacts: o.contacts, action: o.action, req: o.req, prog };
    plan.ch = this.channels(o, plan); return plan;
  }
  progAt(prog, t, s, h, q, p) {
    // paced: no faster than keeps the body ≈ 0.42 m behind the free ball (along the request) until the touch that plays it
    if (prog.kind === "carry" && prog.pace && t < prog.pace.until && q && q.h != null) { const f = predict(prog.pace.b0, prog.pace.bv, t - prog.pace.t0), u = dir(q.h), gap = (f.p[0] - p[0]) * u[0] + (f.p[1] - p[1]) * u[1], va = f.v[0] * u[0] + f.v[1] * u[1];
      return { speed: clamp(va + 2.5 * (gap - 0.42), 0.6, this.P.speed[q.mode]), h: q.h }; }
    if (prog.kind === "carry") { if (prog.hold && t < prog.hold.until && q && q.h != null) return { speed: this.P.speed[q.mode], h: prog.hold.h }; return { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null, stop: !q || q.h == null }; }
    if (prog.kind === "chase") return t < prog.until ? { speed: prog.speed, h: prog.h } : { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null, stop: !q || q.h == null };
    // a technique: the approach (a speed ramp along the entry heading), its keys, then the carry
    if (t < prog.tA) { const v = t < prog.tb ? prog.v0 : lerp(prog.v0, prog.vA, clamp((t - prog.tb) / max(1e-6, prog.tA - prog.tb), 0, 1)); return { keyed: true, s: v, h: prog.h0 + prog.drift * clamp((t - prog.t0) / max(1e-6, prog.tA - prog.t0), 0, 1) }; }
    if (t <= prog.tEnd) return { keyed: true, s: prog.sC.at(t), h: prog.hC.at(t), psi: prog.fC.at(t) };
    return { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null };
  }
  // the posture channels (presentation keys, recorded with the plan): continuous from the previous plan's values now
  channels(o, plan) {
    const t0 = o.t0, prev = this.plan, cv = (k, d) => (prev && prev.ch && prev.ch[k] ? prev.ch[k].at(t0) : d), out = {};
    const keys = o.chKeys || {}; for (const [k, d] of Object.entries({ lean: 8, side: 0, trunk: 0, crouch: 0.022, arms: 0.15, gait: 1, look: 0.8 })) { const K = keys[k] ? keys[k].filter((x) => x[0] > t0 + 0.02) : [[t0 + 0.25, d]]; out[k] = new Curve([[t0, cv(k, d)]].concat(K)); }
    return out;
  }
  // ── THE GAIT: footfalls after the committed ones, alternating, at the running cadence (RUN-1) / walking; anchored stances (a technique's) placed
  // exactly, the steps before them spread to land the anchor's foot on time; positions by the stride rule (lead ahead of the centre of mass, the
  // foot's side) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  gaitFrom(plan, keep, anchors, tTo) {
    const S = { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, lastOf = (X) => S[X][S[X].length - 1], t = this.t;
    // a footfall: the lead ahead of the centre of mass on the foot's side — kept on its own side of the other foot (no crossing outside an
    // authored crossover) and off the free ball's path while it stands (the ball is authoritative: the presentation never has it roll through a
    // planted boot). Positions only: no decision reads them
    const bp0 = this.ball.p, bv0 = this.ball.v;
    const place = (X, tt, t1) => { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = v > 2.4 ? WIDTH.run : WIDTH.walk, ld = v < 0.3 ? 0 : lead(v);
      let p = fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); const r = rgt(s0.psi), sx = sgn(X);
      const o = lastOf(other(X)); if (o && o.pos) { const l = ((p[0] - o.pos[0]) * r[0] + (p[1] - o.pos[1]) * r[1]) * sx; if (l < 0.13) { p = [p[0] + r[0] * sx * (0.13 - l), p[1] + r[1] * sx * (0.13 - l)]; } }
      const tEnd = min(t1 != null ? t1 : tt + 0.25, tt + 0.6); let need = 0, side = sx;
      for (let x = max(t, tt - 0.04); x <= tEnd; x += 0.02) { const b = predict(bp0, bv0, x - t).p, d = [b[0] - p[0], b[1] - p[1]], a = d[0] * Math.cos(s0.psi) + d[1] * Math.sin(s0.psi), l = d[0] * r[0] + d[1] * r[1];
        if (a > -0.22 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
      if (need > 0) { const k = min(0.18, need); p = [p[0] + r[0] * side * k, p[1] + r[1] * side * k]; }
      return p; };
    const yawOf = (X, tt) => { const s0 = this.stateAt(tt, plan); return (s0.s > 0.6 ? s0.h : s0.psi) + sgn(X) * 5 * DEG; };
    const cad = (tt) => { const v = this.stateAt(tt, plan).s, G = this.gait(max(v, 0.01)), v2 = this.stateAt(tt + 0.3, plan).s;
      return v2 > v + 0.6 && v2 > 1.8 ? { Ts: min(G.Ts, 0.245 + 0.008 * v), D: max(G.D, 0.36) } : G; }; // accelerating: quick short steps
    const stanceD = (tt) => { const G = cad(tt); return G.D * 2 * G.Ts; };
    const step = (X, td) => { const st = { id: ++this.sid, F: X, t0: td, t1: td + stanceD(td), pos: place(X, td, td + stanceD(td)), yaw: yawOf(X, td), kind: this.stateAt(td, plan).s < 2.4 ? "walk" : "stride", src: "gait" }; S[X].push(st); return st; };
    // a planted foot that must step lifts in time (a standing foot: now)
    const lift = (X, tdNext) => { const l = lastOf(X); if (l.t1 === Infinity || l.t1 > tdNext - 0.14) l.t1 = max(l.t0 + 0.06, min(tdNext - 0.14, l.t1 === Infinity ? t + 0.02 : l.t1), t + 0.02); };
    const lastTD = () => { const r = lastOf("R"), l = lastOf("L"); return r.t0 >= l.t0 ? r : l; };
    const moving = plan.req && plan.req.h != null;
    // standing and asked to move: the rear foot (relative to the request) steps first, quickly
    if (lastOf("R").t1 === Infinity && lastOf("L").t1 === Infinity) {
      if (!moving && !anchors.length) return S;
      const hq = plan.req.h, rr = toLocal(lastOf("R").pos, this.stateAt(t, plan).P, hq)[0], ll = toLocal(lastOf("L").pos, this.stateAt(t, plan).P, hq)[0];
      let X = rr < ll - 0.02 ? "R" : ll < rr - 0.02 ? "L" : (this.o.foot === "L" ? "R" : "L"); if (anchors.length) { const A0 = anchors[0]; X = A0.t0 - t < 0.3 ? A0.F : other(A0.F); }
      const td = t + 0.03 + 0.17; lastOf(X).t1 = t + 0.03; if (!(anchors.length && anchors[0].F === X && anchors[0].t0 < td + 0.1)) step(X, td); lastOf(other(X)).t1 = Infinity; }
    // the anchors (a technique's own stances): the steps before each spread evenly to land it on its foot at its time
    for (const A of anchors.slice().sort((x, y) => x.t0 - y.t0)) { if (A.t0 <= t + this.P.react) continue;
      const L0 = lastTD(), N = other(L0.F), gap = A.t0 - L0.t0, Ts = this.gait(max(this.stateAt(L0.t0, plan).s, 0.5)).Ts;
      let best = null; for (let j = (A.F === N ? 0 : 1); j <= 7; j += 2) { const per = gap / (j + 1); if (per < 0.13) break; const e = abs(per - Ts); if (!best || e < best.e) best = { j, per, e }; }
      if (!best) best = { j: A.F === N ? 0 : 1, per: gap / ((A.F === N ? 0 : 1) + 1) };
      for (let i = 1; i <= best.j; i++) { const X = i % 2 === 1 ? N : other(N), td = L0.t0 + i * best.per; lift(X, td); step(X, td); }
      if (!A.pos) { A.pos = place(A.F, A.t0); A.yaw = yawOf(A.F, A.t0); }
      lift(A.F, A.t0); const prev = lastOf(other(A.F)); if (prev.t1 === Infinity) prev.t1 = A.t0 + 0.08; S[A.F].push(A); }
    // free running / walking after: the cadence at the speed then; stopping: the last step beside the other foot, both planted
    for (let guard = 0; guard < 30; guard++) {
      const L0 = lastTD(), X = other(L0.F), s0 = this.stateAt(max(t, L0.t0), plan), v = s0.s, G = cad(max(t, L0.t0));
      const tEnd = this.stateAt(min(tTo, max(t, L0.t0) + 0.4), plan).s;
      if (!moving && v < 0.45 && tEnd < 0.3) { // settle
        const lx = lastOf(X); if (lx.t1 === Infinity && L0.t1 === Infinity) break;
        const td = max(L0.t0 + 0.14, lx.t1 === Infinity ? t + 0.16 : lx.t1 + 0.16, t + 0.05); if (td > tTo) break; lift(X, td); const s1 = this.stateAt(td, plan);
        S[X].push({ id: ++this.sid, F: X, t0: td, t1: Infinity, pos: fromLocal(s1.P, s1.psi, X === "R" ? -0.02 : 0.04, sgn(X) * WIDTH.stand), yaw: s1.psi + sgn(X) * 6 * DEG, kind: "settle", src: "gait" }); L0.t1 = Infinity; break; }
      let td = L0.t0 + G.Ts; const lx = lastOf(X); if (lx.t1 !== Infinity) td = max(td, lx.t1 + 0.16); td = max(td, t + 0.02); if (td > tTo) break;
      lift(X, td); step(X, td); if (L0.t1 === Infinity) L0.t1 = td + 0.6 * stanceD(td); }
    // a stance ends before its foot's next one begins (the swing ≥ 0.14 s), never before it began
    for (const X of ["R", "L"]) { const L = S[X]; for (let i = 0; i + 1 < L.length; i++) if (L[i].t1 > L[i + 1].t0 - 0.14 && L[i].t1 > t) L[i].t1 = max(L[i].t0 + 0.05, L[i + 1].t0 - 0.14, t + 0.005); }
    return S;
  }
  // ── THE CARRY CANDIDATE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  carryPlan(st, keep, q, reason) {
    const t = this.t, b0 = this.ball.p, bv = this.ball.v;
    let plan = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: q.h == null ? (st.s > 0.4 ? "STOP" : "STANDING") : "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid }, req: q, prog: { kind: "carry" }, chKeys: this.carryChannels(st, q, t) });
    plan.stances = this.gaitFrom(plan, keep, [], t + 1.5);
    let touches = this.carryTouches(plan, keep, q);
    // the body would overrun the ball (it runs faster than the ball rolls): pace it behind the ball until the touch that plays it
    if (!touches.ok && q.h != null) { const pace = { b0: b0.slice(), bv: bv.slice(), t0: t, until: t + 1.5 }, mk = (pc) => { const p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", pace: pc }, chKeys: this.carryChannels(st, q, t) }); p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); return p2; };
      let p2 = mk(pace), tc2 = this.carryTouches(p2, keep, q);
      if (tc2.ok && tc2.list.length) { const p3 = mk(Object.assign({}, pace, { until: tc2.list[0].t + 0.02 })), tc3 = this.carryTouches(p3, keep, q); if (tc3.ok && tc3.list.length) { p2 = p3; tc2 = tc3; } }
      if (tc2.ok && tc2.list.length) { plan = p2; touches = tc2; } }
    // a turn asked while the ball is ahead: hold the line until the touch that can be made, turn with it (the touch redirects the ball)
    if (!touches.ok && q.h != null) { const hold0 = { h: st.s > 0.6 ? st.h : st.psi, until: t + 1.5 }; let p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", hold: hold0 }, chKeys: this.carryChannels(st, q, t) });
      p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); let tc2 = this.carryTouches(p2, keep, q);
      if (tc2.ok && tc2.list.length) { const until = tc2.list[0].t + 0.02; p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", hold: { h: hold0.h, until } }, chKeys: this.carryChannels(st, q, t) }); p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); tc2 = this.carryTouches(p2, keep, q); if (tc2.ok) { plan = p2; touches = tc2; } } }
    // the ball beyond the feet's reach on this path: chase it (re-plan the run toward where it will be — never released into space)
    if (!touches.ok && hyp(bv[0], bv[1]) + 0.1 > 0) { const ch = this.chasePlan(st, keep, q); if (ch) { plan = ch.plan; touches = ch.touches; } }
    plan.contacts = keep.contacts.concat(touches.list.filter((c) => !keep.contacts.some((k) => abs(k.t - c.t) < 0.03 && k.F === c.F)));
    plan.nContacts = touches.list.length; plan.tLine = this.lineTime(plan, q); if (plan.tLine != null && touches.tAligned != null) plan.tLine = max(plan.tLine, touches.tAligned); plan.sepMax = touches.sepMax; plan.sepPen = touches.sepPen; plan.action.carry = touches.info;
    return plan;
  }
  carryChannels(st, q, t) { const run = clamp(st.s / 6, 0, 1); return { lean: [[t + 0.3, 6 + 6 * run]], side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]], crouch: [[t + 0.3, 0.022]], arms: [[t + 0.3, 0.15]], gait: [[t + 0.25, 1]], look: [[t + 0.3, 0.85]] }; }
  // the run bent toward the ball (it rolls away / was left behind): the request's speed (at least the ball's + 1), toward its interception
  chasePlan(st, keep, q) {
    // run to a point just behind the ball relative to where it must go next (the request, else its own line) — round it if need be — so the touch
    // that follows sends it on; the earliest such point the body can reach
    const b = this.ball.p, bv = this.ball.v; let best = null;
    for (let T = 0.2; T <= 1.4 + 1e-9; T += 0.05) { const f = predict(b, bv, T), u = q.h != null ? dir(q.h) : (f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : dir(st.psi));
      const tgt = [f.p[0] - u[0] * 0.38, f.p[1] - u[1] * 0.38], d = [tgt[0] - st.P[0], tgt[1] - st.P[1]], D = hyp(d[0], d[1]), need = D / T;
      if (need <= this.P.speed.SPRINT * 0.92) { best = { T, h: D > 0.05 ? hdg(d) : (q.h != null ? q.h : st.psi), sp: clamp(max(need * 1.05, 1.2), 1.2, this.P.speed.SPRINT) }; break; } }
    if (!best) return null; const plan = this.mkPlan({ t0: this.t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid, chase: true }, req: q, prog: { kind: "chase", speed: best.sp, h: best.h, until: this.t + best.T + 0.1 }, chKeys: this.carryChannels(st, q, this.t) });
    plan.stances = this.gaitFrom(plan, keep, [], this.t + 1.5); const touches = this.carryTouches(plan, keep, q, true); touches.sepPen = (touches.sepPen || 0) + 0.3; return { plan, touches };
  }
  // the carry's touches: the first swing end (either foot — the lane foot first) where the ball is in that foot's reach; the touch sends the ball to
  // the touching foot's later swing end (the rhythm: every swing at a jog / run, every other at a sprint) ahead in the lane on the planned path
  carryTouches(plan, keep, q, recover = false, skip = null) {
    const t = this.t, R = this.P.react, b0 = this.ball.p, bv = this.ball.v, out = { list: [], ok: false, sepMax: 0, sepPen: 0, info: "" };
    // a committed touch stays (re-aimed below to the new path)
    const kept = keep.contacts.find((c) => c.src === "carry");
    const ends = []; for (const X of ["R", "L"]) for (const s of plan.stances[X]) if (s.t0 > t + R && s.t0 < t + 1.45) ends.push({ F: X, tT: s.t0 - CARRY.touchBefore, st: s });
    ends.sort((a, b) => a.tT - b.tT);
    const ballAt = (T) => predict(b0, bv, T - t);
    // the ball's separation from the body over the next 1.2 s without a touch (the penalty if it would run away)
    for (let T = t; T <= t + 1.2; T += 0.1) { const s = this.stateAt(T, plan), bp = ballAt(T).p; out.sepMax = max(out.sepMax, hyp(bp[0] - s.P[0], bp[1] - s.P[1])); }
    const mode = q.mode, sAt = (T) => this.stateAt(T, plan);
    if (q.h == null && hyp(bv[0], bv[1]) < 0.05) { const me = sAt(t), d = hyp(b0[0] - me.P[0], b0[1] - me.P[1]); if (d < 0.75) { out.ok = true; out.info = "the ball at rest at the feet"; return out; } }
    let first = null, alt = null;
    const lastBy = { R: -9, L: -9 }; for (const c of this.contacts) lastBy[c.F] = max(lastBy[c.F], c.t); // (a foot never plays the ball twice in one swing)
    for (const e of ends) { if (e.tT < t + R - 1e-9 || e.tT < lastBy[e.F] + 0.2 || (skip && skip.has(e.F + e.tT.toFixed(4)))) continue; const s = sAt(e.tT), th = s.psi, bp = ballAt(e.tT).p, rel = toLocal(bp, s.P, th), slow = s.s < 1.6;
      const wide = slow || recover, okA = wide ? rel[0] >= CARRY.reach.slow.a[0] && rel[0] <= CARRY.reach.slow.a[1] + (recover ? 0.12 : 0) : rel[0] >= CARRY.reach.a[0] && rel[0] <= CARRY.reach.a[1];
      const okL = wide ? abs(rel[1]) <= CARRY.reach.slow.l && rel[1] * sgn(e.F) >= -0.12 : rel[1] * sgn(e.F) >= CARRY.reach.l[0] && rel[1] * sgn(e.F) <= CARRY.reach.l[1];
      if (!okA || !okL) continue;
      // the lane foot (the ball's side) first; the other foot plays it (across, with the inside) when the lane foot's chance is > 0.35 s later
      const laneOk = wide || abs(rel[1]) <= 0.06 || sgn(e.F) === Math.sign(rel[1]); if (!first && laneOk) { first = { e, s, th, bp, rel }; break; }
      if (!alt) alt = { e, s, th, bp, rel }; }
    if (alt && (!first || first.e.tT - alt.e.tT > 0.35)) first = alt;
    // a committed touch (inside the reaction time) IS this plan's touch: it stays, re-aimed below for this path
    if (kept) { const s = sAt(kept.t); first = { e: { F: kept.F, tT: kept.t }, s, th: s.psi, bp: ballAt(kept.t).p, rel: toLocal(ballAt(kept.t).p, s.P, s.psi) }; }
    if (!first) { if (out.sepMax > 1.6) out.sepPen = 0.8 + 0.4 * (out.sepMax - 1.6); out.info = "the ball out of reach"; out.ok = q.h == null && out.sepMax < 0.8; return out; }
    out.ok = true; const { e, s } = first, F = e.F, pref = this.o.foot === "B" ? F : this.o.foot;
    // where the ball goes: STOP — to rest where the body stops; else ahead on the planned path, at the touching foot's next touch of the rhythm
    let aim, role = "carry", N = CARRY.rhythm(mode, s.s);
    if (q.h == null) { const se = sAt(t + 1.4), stopAt = fromLocal(se.P, se.psi, 0.36, sgn(pref) * 0.08); aim = { kind: "rest", P: stopAt }; role = "stop"; }
    else { const laneFoot = this.o.foot === "B" ? F : pref, fe = ends.filter((x) => x.F === laneFoot && x.tT > e.tT + 0.15); let nx = fe[(laneFoot === F ? N : 1) - 1] || fe[fe.length - 1];
      if (!nx) { const Ts = this.gait(max(s.s, 1)).Ts; nx = { tT: e.tT + 2 * Ts * N }; }
      const sN = sAt(nx.tT), thN = q.h != null ? q.h : (sN.s > 0.6 ? sN.h : sN.psi), laneF = laneFoot, lane = sgn(laneF) * CARRY.lane(mode);
      aim = { kind: "target", P: fromLocal(sN.P, thN, CARRY.ahead(sN.s), lane), T: nx.tT }; }
    // the touch: the ball arrives at e.tT; what the touch must do (its surface from the impulse it gives)
    const bArr = ballAt(e.tT), vIn = bArr.v; let vOut;
    if (aim.kind === "rest") { // the stop: under the sole when the body is slow; else a cushion that keeps the ball with the braking body
      const vb = s.s, inS0 = hyp(vIn[0], vIn[1]); if (vb < 2.4 || inS0 < 0.3) { vOut = [0, 0]; aim = { kind: "vel", speed: 0, h: s.psi }; }
      else { const sp = min(inS0, vb * 0.55), hh = inS0 > 0.3 ? hdg(vIn) : s.psi; vOut = [Math.cos(hh) * sp, Math.sin(hh) * sp]; aim = { kind: "vel", speed: sp, h: hh }; } }
    else { const d = [aim.P[0] - bArr.p[0], aim.P[1] - bArr.p[1]], D = hyp(d[0], d[1]), sp = min(CARRY.vCap, speedFor(D, max(0.1, aim.T - e.tT)) || CARRY.vCap); vOut = [d[0] / max(D, 1e-6) * sp, d[1] / max(D, 1e-6) * sp]; }
    // a touch that would change nothing is not made ("quick feet, not busy feet"): the ball reaches the aim on its own — the next swing end decides
    if (!kept && aim.kind === "target" && hyp(vOut[0] - vIn[0], vOut[1] - vIn[1]) < 0.35 && (!skip || skip.size < 4)) return this.carryTouches(plan, keep, q, recover, new Set([...(skip || []), e.F + e.tT.toFixed(4)]));
    // a running touch redirects the ball within CARRY.redirect° (beyond it: the ball keeps more of its line — the next touch / a technique finishes it)
    const inS = hyp(vIn[0], vIn[1]); if (inS > 1.0 && s.s > 1.6 && !(recover && s.s < 3.0)) { const dA = wrap(hdg(vOut) - hdg(vIn)); if (abs(dA) > CARRY.redirect * DEG) { const hh = hdg(vIn) + Math.sign(dA) * CARRY.redirect * DEG, sp = hyp(vOut[0], vOut[1]); vOut = [Math.cos(hh) * sp, Math.sin(hh) * sp]; aim = { kind: "vel", speed: sp, h: hh }; out.sepPen += 0.25; } }
    const surface = this.surfaceFor(F, vIn, vOut, s, role);
    const c = { id: ++this.cid, t: Math.round(e.tT / DT) * DT, k: Math.round(e.tT / DT), F, surface, role: role === "stop" ? (hyp(vOut[0], vOut[1]) < 0.05 ? "stop (sole)" : "stop (cushion)") : this.carryRole(F, vIn, vOut, s), aim, src: "carry", tech: "CARRY", bPred: bArr.p, vInPred: vIn, vOutPred: vOut };
    if (kept && abs(kept.t - c.t) < 0.03 && kept.F === c.F) { kept.aim = c.aim; out.list.push(kept); } else out.list.push(c);
    { const lim = q.h == null ? 1.2 : mode === "SPRINT" ? 3.0 : mode === "RUN" ? 2.0 : mode === "JOG" ? 1.5 : 1.0; let sa = 0; for (let x = 0; x <= 1.2; x += 0.1) { const T2 = c.t + x, s2 = sAt(T2), b2 = predict(bArr.p, vOut, x).p; sa = max(sa, hyp(b2[0] - s2.P[0], b2[1] - s2.P[1])); }
      out.sepMax = sa; out.sepPen = (out.sepPen || 0) + (sa > lim ? 0.6 * (sa - lim) : 0); if (q.h != null && hyp(vOut[0], vOut[1]) > 0.5 && abs(wrap(hdg(vOut) - q.h)) > 30 * DEG) out.sepPen += 0.4; }
    // when the ball, too, runs along the request: this touch if it sends it within 25° of it, else the next touch of the rhythm (a capped correction
    // needs a second one)
    if (q.h != null) { const sp = hyp(vOut[0], vOut[1]); out.tAligned = sp < 0.5 || abs(wrap(hdg(vOut) - q.h)) < 25 * DEG ? c.t : c.t + 2 * this.gait(max(s.s, 1)).Ts * N; }
    out.info = `${c.role} ${F} ${surface.toLowerCase()} in ${(c.t - t).toFixed(2)} s`;
    return out;
  }
  carryRole(F, vIn, vOut, s) { const a = abs(wrap(hdg(vOut) - (s.s > 0.6 ? s.h : s.psi))) / DEG; return a < 12 ? "carry" : a < 50 ? "carry correction" : "carry turn"; }
  // the contact surface from the impulse relative to the body and the touching foot (TECHNICAL-CONTROL-1.2: the laces / outer instep forward, the
  // inside across the body, the outside away from it, the sole to stop / pull back)
  surfaceFor(F, vIn, vOut, s, role) {
    const dv = [vOut[0] - vIn[0], vOut[1] - vIn[1]], m = hyp(dv[0], dv[1]), th = s.s > 0.6 ? s.h : s.psi; if (role === "stop") return hyp(vOut[0], vOut[1]) < 0.05 ? "SOLE" : "INSIDE";
    if (m < 0.4) return "LACES"; const a = wrap(hdg(dv) - th) / DEG, side = a * sgn(F);
    if (abs(a) > 125) return "SOLE"; if (abs(a) <= SURF_FWD) return "LACES"; if (side > 0) return "OUTSIDE"; return "INSIDE";
  }
  // when the body runs on the request's line: heading within 15°, speed ≥ min(2.5, 60 % of the mode's)
  lineTime(plan, q) { if (q.h == null) return null; const vMin = min(2.5, 0.6 * this.P.speed[q.mode]);
    for (let i = 0; i <= plan.n; i += 6) { const t = plan.t0 + i * DT, s = this.stateAt(t, plan); if (s.s >= vMin && abs(wrap(s.h - q.h)) < 15 * DEG) return t; } return null; }
  // ═══ A TECHNIQUE INSTANCE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // id, mirror m (+1: the right foot strikes as authored, −1: the left), the request, the present, the commitments. Returns a full plan or null.
  instantiate(id, m, q, st, keep, o = {}) {
    const T = TEMPLATES[id], t = this.t, P = this.P;
    if (this.o.attrs.dri < P.techMin[id] || q.h == null) return null;
    const F = m > 0 ? "R" : "L", S = other(F);
    // the entry: the travel heading now (the pinned instance keeps its own); the turn in the reference frame (Δr: + right for the right foot)
    const pin = o.pinned, h0 = pin ? pin.h0 : (st.s > 1.0 ? st.h : st.psi), turnW = wrap(q.h - h0);
    let dr = m * turnW / DEG; const refS = T.turn * T.ref;
    // (a reversal can be done the long way round: a drag-back to the right for a request 170° to the left)
    if (Math.sign(dr) !== T.turn && abs(dr) > 140) dr = dr + T.turn * 360;
    if (Math.sign(dr) !== T.turn || abs(dr) < T.hard[0] || abs(dr) > T.hard[1]) return null;
    const v0 = st.s; if (!pin && v0 < T.vRange[0] - 0.4) return null;
    const k = dr / refS, rot = (dr - refS) * DEG;           // the post-contact scaling, the exit frame's rotation (reference frame)
    // ── the anchor: the template's first stance (its foot, at tA) on the stride ─────────────────────────────────────────────────────────────
    const firstF = T.firstFoot === "F" ? F : S;
    if (!pin && !o.tA) { // every anchor the stride offers, earliest first: the first one that works
      for (const ta of this.anchorTimes(firstF, keep, st)) { const tc = ta - T.start; if (ta < t + P.react + 0.02 || tc < t + P.commit + 0.04 || tc > t + 1.25) continue;
        const r = this.instantiate(id, m, q, st, keep, Object.assign({}, o, { tA: ta })); if (r) { if (r.action.setTouch) { const r2 = this.instantiate(id, m, q, st, keep, Object.assign({}, o, { tA: ta, noSet: true })); if (r2) { r2.alt = r; return r2; } } return r; } }
      return null; }
    let tA, tC; if (pin) { tC = pin.tC; tA = tC + T.start; } else { tA = o.tA; tC = tA - T.start; }
    // ── THE SPEEDS: the approach v0 → vA at tA (constant until tb, then a ramp at Agility's braking / acceleration), the template's own pre-contact
    // braking re-mapped from vA down to the contact speed vC (inside Agility's braking), its post-contact speeds scaled by vC / its own ───────────
    const vRef0 = T.com.v[0][1], vRefC = new Curve(T.com.v).at(0), aB = P.aBrake * 0.9, aU = P.aAcc;
    const vAfor = (tb) => (v0 >= vRef0 ? max(vRef0, v0 - aB * max(0, tA - tb)) : min(vRef0, v0 + aU * max(0, tA - tb)));
    const vCfor = (vA) => (vA <= vRef0 ? max(0.05, vRefC * vA / max(0.1, vRef0)) : min(vA, max(vRefC, vA - aB * (tC - tA))));
    const tau = (x) => tC + x;
    const hKeys = T.com.h.map(([x, d]) => [tau(x), h0 + m * ((x >= 0 || T.com.scaleAll ? d * k : d)) * DEG]);
    const keysFor = (vA) => { const vC = vCfor(vA), sp = clamp(vC / max(0.05, vRefC), 0.5, 1.45); return { vC, sp, K: T.com.v.map(([x, v]) => [tau(x), x < 0 ? vC + (v - vRefC) * (vA - vC) / (abs(vRef0 - vRefC) > 1e-3 ? vRef0 - vRefC : 1) : v * sp]) }; };
    const dispT = (K) => { const sc = new Curve(K), hc = new Curve(hKeys); let d = [0, 0]; for (let x = tA; x < tC - 1e-9; x += DT) { const s = sc.at(x), h = hc.at(x); d = [d[0] + s * Math.cos(h) * DT, d[1] + s * Math.sin(h) * DT]; } return toLocal(d, [0, 0], h0); };
    const pos = (x, tb, vA) => { if (x <= tb) return v0 * (x - t); const u = min(x, tA) - tb, vx = v0 + (vA - v0) * u / max(1e-6, tA - tb); return v0 * (tb - t) + u * (v0 + vx) / 2 + (x > tA ? vA * (x - tA) : 0); };
    const tbLo = t, tbHi = tA, Bref = [T.B[0], m * T.B[1]];
    let tb, vA, set = null, drift = 0;
    if (pin) { tb = max(t, pin.tb); vA = pin.vA; }
    // the ball: with a set touch (the striking foot's swing end before tA, the ball in its reach then — catch it at speed, set it, brake) or rolling
    // to the technique's point by itself (the braking start solved along the track; the lateral offset within tolerance: a small drift)
    const prevSet = pin ? this.plan.contacts.find((c) => c.role === "set touch" && !c.done && c.tech === id) : null;
    if (prevSet) set = { t: prevSet.t, td: pin.setTd, kept: true };
    else if ((!pin || pin.setTouch) && !o.noSet) { const TsA = this.gait(max(v0, 0.5)).Ts, b0 = this.ball.p, bv = this.ball.v, R = P.react;
      const tds = []; for (let j = 0; j < 4; j++) tds.push((T.firstFoot === "F" ? tA : tA - TsA) - j * 2 * TsA);
      search: for (const td of tds.sort((x, y) => x - y)) { const tT = td - CARRY.touchBefore; if (tT < t + R || tT > tA - 0.02) continue;
        for (const tbx of [tA, max(tT, tbLo), (tbLo + tA) / 2, tbLo]) { const vAx = vAfor(tbx), cp = fromLocal(st.P, h0, pos(tT, tbx, vAx), 0), bp = predict(b0, bv, tT - t).p, rel = toLocal(bp, cp, h0);
          if (rel[0] >= CARRY.reach.a[0] && rel[0] <= CARRY.reach.a[1] && rel[1] * sgn(F) >= CARRY.reach.l[0] && rel[1] * sgn(F) <= CARRY.reach.l[1]) { set = { t: Math.round(tT / DT) * DT, td }; tb = tbx; vA = vAx; break search; } } } }
    if (!set && !(pin && pin.setTouch)) { if (!pin) { // rolling there
        const bp = predict(this.ball.p, this.ball.v, tC - t).p, rel = toLocal(bp, st.P, h0), f = (tbx) => { const vAx = vAfor(tbx), dT = dispT(keysFor(vAx).K); return pos(tA, tbx, vAx) + dT[0] - (rel[0] - Bref[0]); };
        const fLo = f(tbLo), fHi = f(tbHi); if (Math.sign(fLo) === Math.sign(fHi) && min(abs(fLo), abs(fHi)) > 0.05) return null;
        let lo = tbLo, hi = tbHi; for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (Math.sign(f(mid)) === Math.sign(fLo)) lo = mid; else hi = mid; } tb = (lo + hi) / 2; vA = vAfor(tb);
        const dT = dispT(keysFor(vA).K), needL = rel[1] - dT[1] - Bref[1]; if (abs(needL) > 0.16) return null; drift = needL; } }
    if (tb == null) { tb = tA; vA = vAfor(tA); }
    if (vA < T.vFloor - 1e-6 && T.vFloor > 0) return null;
    const KS = keysFor(vA), sKeys = KS.K, sig = KS.sp, vC = KS.vC;
    const speedFit = (abs(sig - 1) > 0.2 ? (abs(sig - 1) - 0.2) * 1.2 : 0) + (v0 > T.vRange[1] - 1.0 ? 0.15 : 0);
    // (a re-planned instance inside its window starts its keys from the present)
    if (pin && t > tA) { const cut = (K, v) => [[t, v]].concat(K.filter((x) => x[0] > t + 0.04)); const hNow = st.s > 0.3 ? h0 + wrap(st.h - h0) : hKeys.find((x) => x[0] >= t)?.[1] ?? h0;
      sKeys.splice(0, sKeys.length, ...cut(sKeys, st.s)); hKeys.splice(0, hKeys.length, ...cut(hKeys, hNow)); }
    const sC = new Curve(sKeys), hC = new Curve(hKeys);
    // ── the plan: the centre of mass (approach + keys + carry), the pelvis, the channels ───────────────────────────────────────────────────────
    let fKeys = T.face.map(([x, dd]) => [tau(x), h0 + m * (x > 0 ? dd * k : dd) * DEG]); if (t > tA) fKeys = [[t, h0 + wrap(st.psi - h0)]].concat(fKeys.filter((x) => x[0] > t + 0.04));
    const prog = { kind: "tech", t0: t, tb: max(t, tb), tA, v0, vA, h0, drift: 0, tEnd: tau(T.end), sC, hC, fC: new Curve(fKeys) };
    if (drift) prog.drift = Math.atan2(drift, max(0.3, pos(tA, tb, vA)));
    const chKeys = {}; for (const kk of ["lean", "side", "trunk", "crouch", "arms", "gait", "look"]) chKeys[kk] = T[kk].map(([x, val]) => [tau(x), (kk === "side" || kk === "trunk") ? m * val : val]);
    const action = { kind: id, tech: id, label: T.label, id: pin ? pin.id : ++this.aid, m, F, S, h0, tC, tA, vA, vC, sig, turnDeg: dr, k, rot, tb, setTd: set ? set.td : null, tCommit: tC - P.commit, tRelease: tau(max(0.12, ...T.stances.filter((x) => x.F === "S" && x.t0 <= 0.02).map((x) => x.t1))), setTouch: !!set, speedFit, exitH: q.h };
    const plan = this.mkPlan({ t0: t, st, stances: null, contacts: [], action, req: q, prog, chKeys });
    const O = this.stateAt(tC, plan).P, Bw = set ? fromLocal(O, h0, Bref[0], Bref[1]) : predict(this.ball.p, this.ball.v, tC - t).p;
    action.O = O; action.B = Bw;
    // a set touch sends the ball along the entry line to the technique's point — one that would throw it off that line (> 60°) is no set touch
    if (set && !set.kept) { const bp = predict(this.ball.p, this.ball.v, set.t - t).p, dev = abs(wrap(hdg([Bw[0] - bp[0], Bw[1] - bp[1]]) - h0)) / DEG;
      if (dev > 60 && hyp(Bw[0] - bp[0], Bw[1] - bp[1]) > 0.25) return null; action.setPen = dev > 25 ? 0.5 * ((dev - 25) / 35) ** 2 : 0; }
    // the stances: the template's (world), the approach's steps fitted before them, the carry gait after
    const map = (p, w) => { const a = p[0], l = p[1] * 1; if (!w) return [a, m * l]; const c = Math.cos(rot * w), s2 = Math.sin(rot * w); return [a * c - l * s2, m * (a * s2 + l * c)]; };
    const anchors = T.stances.map((ts) => { const X = ts.F === "F" ? F : S, t0 = tau(ts.t0), t1 = tau(ts.t1); let pos;
      if (ts.at.rel === "com") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "travel") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, s0.h, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "O") { const p = map(ts.at.p, ts.w || 0); pos = fromLocal(O, h0, p[0], p[1]); }
      else if (ts.at.rel === "B") { pos = fromLocal(Bw, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "ballAt") { const bAt = this.ballAfterDecisive(Bw, h0, m, T, tC, tau(ts.at.t), k, sig); const exitH = h0 + m * (refS * k) * DEG; pos = fromLocal(bAt, exitH, ts.at.exitAt[0], m * ts.at.exitAt[1]); }
      const yaw = ts.yaw === "travel" ? this.stateAt(t0, plan).h + sgn(X) * 5 * DEG : h0 + m * (ts.yaw + (ts.w || ts.wYaw ? (dr - refS) * (ts.w || ts.wYaw) : 0)) * DEG;
      const pivot = ts.pivot ? ts.pivot.map(([x, dd]) => [tau(x), m * dd * k * DEG]) : null;
      return { id: ++this.sid, F: X, t0, t1, pos, yaw, kind: ts.kind, src: "tech", pivot, heel: ts.heel ? [tau(ts.heel[0]), ts.heel[1]] : null, swingIn: ts.swingIn ? this.mapSpec(ts.swingIn, { tC, h0, m, rot, O, B: Bw, k }) : null }; });
    if (set && set.td != null && set.td < tA - 0.05) anchors.push({ id: ++this.sid, F, t0: set.td, t1: set.td + 0.16, pos: null, yaw: null, kind: "after the set touch", src: "tech" });
    plan.stances = this.gaitFrom(plan, keep, anchors, t + 1.5);
    // the contacts: the set touch, the decisive, the template's exit touch; then the carry picks the ball up
    const frame = { tC, h0, m, rot, O, B: Bw, k, F, S, exitH: h0 + m * refS * k * DEG };
    const cs = []; if (set) cs.push({ id: ++this.cid, t: set.t, k: Math.round(set.t / DT), F, surface: "LACES", role: "set touch", aim: { kind: "target", P: Bw, T: tC }, src: "tech", tech: id, frame });
    for (const tc of T.contacts) { const X = tc.F === "F" ? F : S, tt = tau(tc.tau), launchDeg = tc.aim.launch === "exit" ? refS * k : tc.aim.launch * k, h = h0 + m * launchDeg * DEG;
      cs.push({ id: ++this.cid, t: Math.round(tt / DT) * DT, k: Math.round(tt / DT), F: X, surface: tc.surface, role: tc.role, decisive: !!tc.decisive, aim: { kind: "vel", speed: tc.aim.v * this.launchScale(T, sig), h }, src: "tech", tech: id, swing: this.mapSpec(tc.swing, frame), frame }); }
    plan.contacts = keep.contacts.concat(cs.filter((c) => c.t > t + 1e-9 && !keep.contacts.some((kc) => abs(kc.t - c.t) < 0.03)));
    // (the carry after the technique: its touches are planned when the re-plans reach that time)
    plan.nContacts = cs.length; plan.tLine = tC + T.tLine * (0.8 + 0.2 * abs(k)); plan.sepMax = 0.6;
    return plan;
  }
  // where the decisive contact's ball is at time x (its launch from B at tC: the template's aim)
  // (the technique's launches scale with its body speeds: σ, the reference's ball / body ratio kept — a reversal restarts the body from almost
  // nothing whatever the approach, so its launches barely scale)
  launchScale(T, sig) { return abs(T.turn * T.ref) >= 120 ? clamp(sig, 0.8, 1.1) : clamp(sig, 0.7, 1.5); }
  ballAfterDecisive(Bw, h0, m, T, tC, x, k, sig = 1) { const dc = T.contacts.find((c) => c.decisive), refS = T.turn * T.ref, h = h0 + m * (dc.aim.launch === "exit" ? refS * k : dc.aim.launch * k) * DEG, v = dc.aim.v * this.launchScale(T, sig); return predict(Bw, [v * Math.cos(h), v * Math.sin(h)], max(0, x - tC)).p; }
  // a swing spec in the technique's frame (kept relative: the presentation resolves it on the posed body and the real ball)
  mapSpec(spec, frame) { return spec ? Object.assign({}, spec, { frame }) : null; }
  // the times the given foot can land its next stances (the template's first stance): the stride as it runs, ±25 % per step
  anchorTimes(X, keep, st) {
    const t = this.t, S = keep.stances, lastR = S.R[S.R.length - 1], lastL = S.L[S.L.length - 1], G = this.gait(max(st.s, 0.5)), Ts = G.Ts, out = [];
    // the foot to land next and when (committed landing, or its natural one)
    let tNext, Fnext; if (lastR.t0 > lastL.t0) { Fnext = "L"; tNext = max(lastR.t0 + Ts, lastL.t1 + 0.18, t + 0.03); } else { Fnext = "R"; tNext = max(lastL.t0 + Ts, lastR.t1 + 0.18, t + 0.03); }
    if (lastR.t1 === Infinity && lastL.t1 === Infinity) { tNext = t + 0.22; Fnext = X === "R" ? "L" : "R"; }
    for (let i = 0; i < 6; i++) { const f = i % 2 === 0 ? Fnext : other(Fnext), tt = tNext + i * Ts; if (f === X) { out.push(tt); out.push(tt + 0.25 * Ts); out.push(tt - 0.2 * Ts); } }
    return out.filter((x) => x > t + 0.04).sort((a, b) => a - b);
  }
  // ── the HUD's summary of the present ─────────────────────────────────────────────────────────────────────────────────────────────────────
  hud() { const st = this.stateAt(this.t, this.plan), b = this.ball.p, bv = this.ball.v, a = this.plan.action; const last = this.contacts[this.contacts.length - 1];
    let cps = 0; for (let i = this.contacts.length - 1; i >= 0 && this.contacts[i].t > this.t - 3; i--) if (!this.contacts[i].missed) cps++;
    return { t: this.t, action: a.label, actionKind: a.kind, m: a.m || 0, foot: last ? last.F : "—", surface: last ? last.surface : "—", speed: st.s, ballSpeed: hyp(bv[0], bv[1]), reqH: this.req ? this.req.h : null, mode: this.req ? this.req.mode : "RUN", reqSpeed: this.req && this.req.h != null ? this.P.speed[this.req.mode] : 0,
      facing: st.psi, travel: st.h, turn: this.req && this.req.h != null ? wrap(this.req.h - (st.s > 1 ? st.h : st.psi)) : 0, sep: hyp(b[0] - st.P[0], b[1] - st.P[1]), cps: cps / 3, why: this.plan.why, provisional: this.P.provisional, phase: this.phaseOf(a) }; }
  phaseOf(a) { if (!a.tech) return a.label; const t = this.t; if (t < a.tA) return "ENTRY · approach"; if (t < a.tC - 0.01) return "ENTRY"; if (t < a.tC + 0.03) return "CONTACT"; if (t < a.tRelease) return "PROTECTION"; return "EXIT"; }
}

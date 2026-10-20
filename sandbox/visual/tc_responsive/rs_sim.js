// ═══ tc_responsive/rs_sim.js — RESPONSIVENESS EXPERIMENT (TC-RESPONSIVE-1): THE AUTHORITATIVE SIMULATION ══════════════════════════════════════════
// Built beside the locked BASELINE-88573ef0 (never on it): its frozen ball, its gait table, its technique templates and its plan / history format
// (so the presentation and the replay read it the same way) — with a new decision core, per the owner-approved architecture
// (review_artifacts/tc_responsive/ARCHITECTURE_PROPOSAL.md):
//   · INPUT RESPONSE ≠ BALL CONTACT ≠ TURN COMPLETION. The newest stick intent is accepted on its tick (no deferral) and the plan is rebuilt from
//     the present at once: the ROOT brakes / re-orients from that tick (velocity-vector steering — the old velocity component is braked, the new one
//     built — never a vehicle's heading rate, never "hold the old line until the touch"); the next legal ball contact comes when a free foot proxy
//     can actually reach the physical ball; the new movement line may take longer.
//   · TWO FOOT / CONTACT PROXIES (simulation-owned, finite reach and speed): a contact is executed only if its proxy actually reaches the actual
//     ball (the physical witness); a foot carrying the weight (in a stance of the coarse support schedule) never plays the ball; one foot never
//     plays twice within its recovery. The rendered footstep choreography is presentation (rs_body.js): only near a contact must the rendered foot
//     witness the proxy's touch.
//   · GENERIC TECHNICAL CONTACTS for ordinary analog control — carry push, inside / outside redirect, across-body gather, urgent reach (the effort
//     touch), braking pivot, stop — each a parametric approach (a cubic root path from the present state to a staging state at the contact, so the
//     root answers on the first tick), a legal contact, an exit; named techniques are ordinary candidates in the same cost (no angle bucket, no
//     timing penalty of their own).
//   · COMMITMENT IS CAUSAL: a planned contact is protected only once its proxy is in the final approach where changing it would need impossible
//     foot motion — the time left is below √(2·d / a): a foot with lateral authority a can no longer divert by d (the ball's radius). Before that
//     it is revised freely by every new intent; after it only that contact (that proxy) is protected — not the root, the torso, the other foot or
//     the next intent. Durations are logged per family / context.
//   · TOUCH CADENCE IS CONTEXTUAL: each touch is aimed so the ball arrives where the body will be at the next opportunity (the rhythm by speed);
//     a drastic request asks the resolver for an earlier reachable contact, which REPLACES the planned one (never an extra stale impulse).
// Deterministic: fixed 240 Hz tick, the deterministic trig (physchar2/core/v2_math.js — node ≡ browser), no clock, no randomness at 99.
// FRAMES: pitch (x, y) m; heading h, dir(h) = (cos h, sin h); the player's right = (−sin h, cos h); + heading change = a right turn.
import { dsin, dcos, datan2, dnorm } from "../physchar2/core/v2_math.js";
import { DT, R, Ball, predict, speedFor, rollFrom } from "./pt_ball.js";
import { params, gaitTable, lead, WIDTH, DEG, MODES } from "./pt_params.js";
import { TEMPLATES, TECH_IDS, LABEL } from "./pt_tech.js";
import { pchip, pchipAt } from "../technical_control11/tc11_leg.js";
export { DT, R, DEG, MODES, TEMPLATES, LABEL };
const hyp = dnorm, abs = Math.abs, max = Math.max, min = Math.min, PI = Math.PI;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const wrap = (a) => { a = (a + PI) % (2 * PI); if (a < 0) a += 2 * PI; return a - PI; };
export const dir = (h) => [dcos(h), dsin(h)], rgt = (h) => [-dsin(h), dcos(h)], hdg = (v) => datan2(v[1], v[0]);
const sgn = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
const lerp = (a, b, t) => a + (b - a) * t;
export const toLocal = (q, P, h) => { const dx = q[0] - P[0], dy = q[1] - P[1], c = dcos(h), s = dsin(h); return [dx * c + dy * s, -dx * s + dy * c]; };
export const fromLocal = (P, h, a, l) => { const c = dcos(h), s = dsin(h); return [P[0] + a * c - l * s, P[1] + a * s + l * c]; };
export class Curve { constructor(keys) { this.K = keys.slice().sort((a, b) => a[0] - b[0]); for (let i = this.K.length - 1; i > 0; i--) if (this.K[i][0] - this.K[i - 1][0] < 1e-6) this.K.splice(i - 1, 1); this.P = this.K.length > 1 ? pchip(this.K.map(([t, v]) => ({ t, v: [v] })), 1) : null; }
  at(t) { return this.P ? pchipAt(this.P, t, 1)[0] : this.K[0][1]; } }
// cubic Hermite (position p0 → p1, velocity v0 → v1 over T): position, velocity at u ∈ [0, 1]
function herm(p0, v0, p1, v1, T, u) { const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const d00 = (6 * u2 - 6 * u) / T, d10 = 3 * u2 - 4 * u + 1, d01 = (-6 * u2 + 6 * u) / T, d11 = 3 * u2 - 2 * u, out = { p: [], v: [] };
  for (let i = 0; i < p0.length; i++) { out.p.push(h00 * p0[i] + h10 * T * v0[i] + h01 * p1[i] + h11 * T * v1[i]); out.v.push(d00 * p0[i] + d10 * v0[i] + d01 * p1[i] + d11 * v1[i]); } return out; }
// its acceleration is linear in time: the largest is at an end
function hermAcc(p0, v0, p1, v1, T) { let a0 = 0, a1 = 0; for (let i = 0; i < 2; i++) { const d = p1[i] - p0[i], A0 = 6 * d / (T * T) - (4 * v0[i] + 2 * v1[i]) / T, A1 = -6 * d / (T * T) + (2 * v0[i] + 4 * v1[i]) / T; a0 += A0 * A0; a1 += A1 * A1; } return max(Math.sqrt(a0), Math.sqrt(a1)); }
// ── the experiment's constants (99 / 99 / 99 — provisional, to be calibrated after the owner's playtest) ─────────────────────────────────────
export const RX = {
  hys: 4 * DEG,                 // a new intent: the stick's direction changed by more than this (or start / stop / mode)
  dMin: R,                      // commitment: the divert a revisable contact must still allow (the ball's radius)
  approachMin: 0.06,            // a proxy needs at least this long between leaving the ground and a contact
  supportMin: 0.07,             // a foot carries the weight at least this long before it can lift again (abbreviated support transfer)
  footRecover: 0.16,            // one foot never plays the ball twice within this
  touchGap: 0.10,               // two contacts (either feet) never closer than this
  vFoot: (v) => 2.2 * max(2.5, v) + 4.0,   // the proxy's top speed over the ground at body speed v (an elite sprinter's swing ≈ 2.2 × the body + 4 m/s)
  hitR: R + 0.04,               // the proxy meets the ball's surface: its centre this far from the ball's centre, behind the impulse
  witness: 0.06,                // execution: the proxy within hitR + this of the actual ball, or the contact is missed
  horizon: 1.1,                 // the resolver looks this far ahead for the next contact
  ahead: (v) => min(0.50, 0.30 + 0.03 * v), lane: (mode) => (mode === "WALK" ? 0.10 : mode === "SPRINT" ? 0.12 : 0.13),
  rhythm: (mode, v) => ((mode === "SPRINT" && v > 5.6) || v > 6.2 ? 2 : 1),
  vCap: 13.5,
};
// ── THE GENERIC CONTACT FAMILIES (simulation data). box: where the ball's centre may be at the contact in the root frame then (facing ψc):
// a = ahead, l = lateral toward the contacting foot's side (+). side: which foot for a turn σ (+ right): "inside" — the foot whose inside faces the
// turn (s = −σ), "outside" — the foot on the turn's side (s = σ), "any". kV / kPsi: the share of the turn the travel / the facing has made by the
// contact. vF(θ): the contact speed as a share of the requested. aLim: the root's largest acceleration on its approach (m/s²). brake / lat: the
// exit's braking / lateral authority (× Agility's). aProxy: the proxy's lateral authority (commitment). maxRedir: the largest change of the ball's
// direction a touch of the family makes. plant: the other foot planted at the contact. follow: the contacting foot lands this long after it.
export const FAM = {
  CARRY:   { label: "CARRY", box: { a: [0.20, 0.80], l: [-0.08, 0.44] }, nom: [0.45, 0.12], side: "any", kV: 0.6, kPsi: 0.6, vF: () => 1, aLim: 4.5, brake: 1.0, lat: 1.0, aProxy: 150, maxRedir: 40, plant: false, follow: 0.10 },
  INSIDE:  { label: "INSIDE REDIRECT", box: { a: [0.06, 0.66], l: [-0.16, 0.32] }, nom: [0.34, 0.08], side: "inside", kV: 0.35, kPsi: 0.45, vF: (th) => clamp(1 - 0.58 * th / 90, 0.30, 1), aLim: 12.5, brake: 1.15, lat: 1.1, aProxy: 180, maxRedir: 125, minTurn: 14, plant: true, follow: 0.12 },
  OUTSIDE: { label: "OUTSIDE REDIRECT", box: { a: [0.06, 0.62], l: [-0.02, 0.42] }, nom: [0.32, 0.16], side: "outside", kV: 0.35, kPsi: 0.40, vF: (th) => clamp(1 - 0.55 * th / 90, 0.35, 1), aLim: 12.5, brake: 1.15, lat: 1.1, aProxy: 180, maxRedir: 95, minTurn: 14, maxTurn: 110, plant: true, follow: 0.12 },
  GATHER:  { label: "ACROSS-BODY GATHER", box: { a: [-0.04, 0.52], l: [-0.38, -0.04] }, nom: [0.22, -0.16], side: "inside", kV: 0.30, kPsi: 0.35, vF: (th) => clamp(0.8 - 0.5 * th / 90, 0.25, 0.8), vMax: 4.8, aLim: 11.0, brake: 1.15, lat: 1.1, aProxy: 160, maxRedir: 115, minTurn: 20, plant: true, follow: 0.13 },
  URGENT:  { label: "URGENT REACH", box: { a: [0.14, 0.96], l: [-0.22, 0.52] }, nom: [0.55, 0.14], side: "any", kV: 0.30, kPsi: 0.35, vF: (th) => clamp(1 - 0.68 * th / 90, 0.22, 1), aLim: 15.5, brake: 1.40, lat: 1.30, aProxy: 220, maxRedir: 130, minTurn: 28, plant: false, follow: 0.12, effort: 0.35 },
  CHECK:   { label: "CHECK TOUCH", box: { a: [0.10, 0.92], l: [-0.20, 0.46] }, nom: [0.45, 0.10], side: "any", kV: 0.0, kPsi: 0.2, vF: () => 0.30, aLim: 15.5, brake: 1.40, lat: 1.30, aProxy: 150, maxRedir: 50, minTurn: 100, plant: true, follow: 0.12, check: true },
  PIVOT:   { label: "BRAKING PIVOT", box: { a: [-0.18, 0.50], l: [-0.20, 0.38] }, nom: [0.16, 0.10], side: "any", kV: 0.0, kPsi: 0.15, vC: 2.0, aLim: 15.5, brake: 1.40, lat: 1.30, aProxy: 120, maxRedir: 180, minTurn: 95, plant: true, follow: 0.14 },
  STOP:    { label: "STOP", box: { a: [-0.04, 0.48], l: [-0.16, 0.32] }, nom: [0.24, 0.08], side: "any", kV: 0, kPsi: 0, vC: 0.7, aLim: 12.5, brake: 1.2, lat: 1.2, aProxy: 120, maxRedir: 180, plant: true, follow: 0.12 },
};
const TURN_FAMS = ["CARRY", "INSIDE", "OUTSIDE", "GATHER", "URGENT", "CHECK", "PIVOT"];
// the proxy's commitment window for a family: below √(2·dMin / a) the foot can no longer divert by dMin (s)
export const tauCommit = (fam) => Math.sqrt(2 * RX.dMin / (FAM[fam] ? FAM[fam].aProxy : 170));
const SURF_FWD = 18;
// the largest redirect of an arriving ball a family's touch makes: its own at speed, up to any direction when the ball is slow (≤ 1.5 m/s)
const redirMax = (f, bs) => (f.maxRedir + (180 - f.maxRedir) * clamp((4.5 - bs) / 3, 0, 1)) * DEG;
const sC_s = (sim, t, plan) => sim.stateAt(t, plan).s;
// ═══ THE SIMULATION ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export class PlaySim {
  // env: { E (RUN-1.3), body (r1Body), baked } · o: { attrs {bc, dri, agi}, foot "R" | "L" | "B", style, seed, start: { P, h }, interceptor? }
  constructor(env, o = {}) { this.E = env.E; this.body = env.body; this.gait = gaitTable(this.E, this.body, env.baked); this.reset(o); }
  reset(o = {}) {
    this.o = Object.assign({ attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 } }, this.o || {}, o);
    this.P = params(this.o.attrs); this.k = 0; this.t = 0; this.ver = 0; this.sid = 0; this.cid = 0; this.aid = 0;
    const S = this.o.start, h = S.h, lane = this.o.foot === "L" ? -0.10 : this.o.foot === "R" ? 0.10 : 0, bp = fromLocal(S.P, h, 0.36, lane);
    this.ball = new Ball(bp, [0, 0]); this.contacts = []; this.log = { input: [], actions: [], replans: 0, plans: 0, events: [], commit: [], intent: [] }; this.hash = 2166136261 >>> 0; this.cpu = { replan: [], step: [] };
    const rear = this.o.foot === "L" ? "L" : "R", st = (F) => ({ id: ++this.sid, F, t0: -1, t1: Infinity, pos: fromLocal(S.P, h, F === rear ? -0.02 : 0.04, sgn(F) * WIDTH.stand), yaw: h + sgn(F) * 6 * DEG, kind: "standing", src: "stand" });
    this.plan = this.trackPlan({ t0: 0, st: { P: S.P.slice(), V: [0, 0], s: 0, h, psi: h, w: 0 }, seg: null, q: null, fam: null });
    Object.assign(this.plan, { stances: { R: [st("R")], L: [st("L")] }, contacts: [], action: { kind: "STANDING", label: "STANDING", id: ++this.aid }, req: null, proxy0: null });
    this.plan.ch = this.channels(this.plan, null); this.plans = [this.plan]; this.req = null; this.lastReq = null; this.flags = { replan: "start" };
    this.track = { N: 240 * 12, buf: new Float64Array(240 * 12 * 9) }; this.record(); this.icHit = null;
    return this;
  }
  setAttrs(attrs) { this.o.attrs = Object.assign({}, this.o.attrs, attrs); this.P = params(this.o.attrs); this.flags.replan = "attributes"; this.log.events.push({ k: this.k, kind: "attrs", v: Object.assign({}, this.o.attrs) }); }
  setFoot(foot) { this.o.foot = foot; this.flags.replan = "foot"; this.log.events.push({ k: this.k, kind: "foot", v: foot }); }
  // ── the present (from a plan) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  stateAt(t, plan = this.planAt(t)) { const i = clamp((t - plan.t0) / DT, 0, plan.n), j = min(plan.n - 1, Math.floor(i)), u = i - j, P = plan.P, V = plan.V;
    const p = [P[2 * j] + (P[2 * j + 2] - P[2 * j]) * u, P[2 * j + 1] + (P[2 * j + 3] - P[2 * j + 1]) * u], v = [V[2 * j] + (V[2 * j + 2] - V[2 * j]) * u, V[2 * j + 1] + (V[2 * j + 3] - V[2 * j + 1]) * u];
    const psi = plan.psi[j] + wrap(plan.psi[j + 1] - plan.psi[j]) * u; if (i >= plan.n) { const d = t - plan.t0 - plan.n * DT; p[0] += v[0] * d; p[1] += v[1] * d; } const s = hyp(v[0], v[1]);
    return { P: p, V: v, psi, s, h: s > 0.05 ? hdg(v) : plan.psi[j], w: plan.w ? plan.w[j] : 0 }; }
  planAt(t) { const L = this.plans; for (let i = L.length - 1; i >= 0; i--) if (L[i].t0 <= t + 1e-9) return L[i]; return L[0]; }
  // ── one tick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // req: { h: heading (rad) | null, mode: "WALK" | "JOG" | "RUN" | "SPRINT", keys: bitmask (record only) }
  step(req) {
    const t = this.t; this.ballPlayedThisTick = false; this.req = req && req.h != null ? { h: Math.round(req.h * 1e6) / 1e6, mode: req.mode || "RUN", keys: req.keys | 0 } : { h: null, mode: (req && req.mode) || "RUN", keys: req ? req.keys | 0 : 0 };
    this.log.input.push(this.req.h == null ? -99 : this.req.h, MODES.indexOf(this.req.mode), this.req.keys);
    // THE LATEST INTENT: any change re-plans on this tick (no deferral — a superseded intent simply never gets a plan)
    const L = this.lastReq, q = this.req; if (!L || (L.h == null) !== (q.h == null) || L.mode !== q.mode || (q.h != null && abs(wrap(q.h - L.h)) > RX.hys)) { this.flags.replan = this.flags.replan || "intent"; this.lastReq = q; this.log.intent.push({ t, h: q.h, mode: q.mode }); }
    // the interceptor probe (test only): an obstacle that reaches the ball first plays it first (time order within the tick)
    if (this.o.interceptor && !this.icHit) this.interceptAt(t);
    // the contacts due now — one kernel launch each, from the ball's actual state, witnessed by their proxy
    for (const c of this.plan.contacts) if (!c.done && c.k === this.k) this.execute(c);
    // commitment bookkeeping (each tick: the contact whose proxy entered its final approach)
    for (const c of this.plan.contacts) if (!c.done && c.commitT == null && c.t - t <= c.tauC + 1e-9 && this.proxyFree(this.plan, c.F, t)) c.commitT = t;
    if (t - this.plan.t0 > (this.plan.action.chase ? 0.12 : 0.25)) this.flags.replan = this.flags.replan || "refresh";
    if (this.flags.replan) { const c0 = performance.now(); this.replan(this.flags.replan); this.cpu.replan.push(performance.now() - c0); this.flags.replan = null; }
    this.ball.step(); this.k++; this.t = this.k * DT; this.record();
    if (this.k % 4 === 0) { const s = this.stateAt(this.t, this.plan), b = this.ball.p; this.mix(s.P[0]); this.mix(s.P[1]); this.mix(b[0]); this.mix(b[1]); }
  }
  record() { const b = this.ball.p, v = this.ball.v, q = this.ball.q, o = (this.k % this.track.N) * 9, B = this.track.buf; B[o] = b[0]; B[o + 1] = b[1]; B[o + 2] = b[2]; B[o + 3] = v[0]; B[o + 4] = v[1]; B[o + 5] = q[0]; B[o + 6] = q[1]; B[o + 7] = q[2]; B[o + 8] = q[3]; }
  ballTrack(t) { const k = clamp(Math.round(t / DT), max(0, this.k - this.track.N + 1), this.k), o = (k % this.track.N) * 9, B = this.track.buf; return { p: [B[o], B[o + 1], B[o + 2]], v: [B[o + 3], B[o + 4]], q: [B[o + 5], B[o + 6], B[o + 7], B[o + 8]], k }; }
  mix(x) { const s = x.toFixed(6); let h = this.hash; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } this.hash = h; }
  // ── a contact: its proxy must actually be at the actual ball (the physical witness); the launch from the ball's actual state ──────────────────
  execute(c) {
    c.done = true; const b = this.ball.p, bv = this.ball.v, px = this.proxyAt(this.plan, c.F, this.t), d = hyp(b[0] - px.p[0], b[1] - px.p[1]);
    if (this.ballPlayedThisTick || d > RX.hitR + RX.witness || b[2] > 0.5) { c.missed = true; this.flags.replan = "missed contact"; this.contacts.push(Object.assign(this.contactRec(c, bv, bv, null), { missed: true, why: this.ballPlayedThisTick ? "ball already played" : `proxy ${d.toFixed(2)} m from the ball` })); return; }
    // (the ball DISTURBED since the touch was planned — another player / obstacle played it first: the foot still meets it, but the outcome is the
    // physical one — the ball's own motion and the foot's — never the old plan's aim: a contact is no reservation of the ball)
    if (c.bPred && (hyp(b[0] - c.bPred[0], b[1] - c.bPred[1]) > 0.08 || hyp(bv[0] - c.vInPred[0], bv[1] - c.vInPred[1]) > 1.5)) { const vh = c.vHit || [0, 0];
      const vD = [0.5 * (bv[0] + vh[0]), 0.5 * (bv[1] + vh[1])]; this.ball.launch(vD, { foot: c.F, surface: c.surface, role: "deflected touch" }); this.ballPlayedThisTick = true;
      this.contacts.push(Object.assign(this.contactRec(c, bv, vD, null), { role: "deflected touch", disturbed: true })); this.mix(vD[0]); this.mix(vD[1]); this.flags.replan = "contact"; this.nextOpp = null; return; }
    let v; if (c.aim.kind === "target") { const dd = [c.aim.P[0] - b[0], c.aim.P[1] - b[1]], D = hyp(dd[0], dd[1]), T = max(0.05, c.aim.T - this.t); let sp = D > 1e-3 ? speedFor(D, T) : 0; if (sp == null) sp = RX.vCap; sp = min(sp, RX.vCap); v = D > 1e-3 ? [dd[0] / D * sp, dd[1] / D * sp] : [0, 0]; }
    else v = [c.aim.speed * dcos(c.aim.h), c.aim.speed * dsin(c.aim.h)];
    const intended = v.slice();
    if (this.P.errDir > 0 && hyp(v[0], v[1]) > 0.2) { const r1 = this.rand(c.id, 1), r2 = this.rand(c.id, 2), e = r1 * this.P.errDir * DEG, f = 1 + r2 * this.P.errSpeed, ca = dcos(e), sa = dsin(e); v = [(v[0] * ca - v[1] * sa) * f, (v[0] * sa + v[1] * ca) * f]; }
    this.ball.launch(v, { foot: c.F, surface: c.surface, role: c.role }); this.ballPlayedThisTick = true; this.nextOpp = c.aim.kind === "target" ? c.aim.T : null;
    this.contacts.push(this.contactRec(c, bv, v, intended)); this.mix(v[0]); this.mix(v[1]); this.flags.replan = "contact";
    this.log.commit.push({ t: this.t, fam: c.fam, F: c.F, dur: c.commitT != null ? c.t - c.commitT : 0, planned: c.t - c.plannedAt, speed: this.stateAt(this.t, this.plan).s, turn: c.turnDeg || 0 });
  }
  contactRec(c, vIn, vOut, intended) { const a = this.plan.action; return { n: this.contacts.length + 1, k: this.k, t: this.t, F: c.F, surface: c.surface, role: c.role, tech: c.tech || a.kind, fam: c.fam, action: a.label, actionId: a.id,
    vIn: [vIn[0], vIn[1]], vOut: [vOut[0], vOut[1]], intendedH: intended && hyp(intended[0], intended[1]) > 0.05 ? hdg(intended) : null, actualH: hyp(vOut[0], vOut[1]) > 0.05 ? hdg(vOut) : null, ball: this.ball.p.slice(), reqH: this.req.h, planH: c.planH, cid: c.id, swing: c.swing || null, frame: c.frame || null, src: c.src, decisive: !!c.decisive, commitT: c.commitT, plannedAt: c.plannedAt }; }
  rand(id, j) { let h = (2166136261 ^ this.o.seed) >>> 0; for (const x of [id, j, 977]) { h ^= x; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } let s = 0; for (let i = 0; i < 4; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; s += (h / 4294967296); } return (s - 2) * 1.732; }
  // ── the interceptor probe: a sphere moving on keyed points (test only — a real defender comes later). It touches the ball when they overlap;
  // ordered in time before the dribble contacts of the tick (it got there first); the ball takes its velocity plus a push out of it ─────────────
  interceptAt(t) { const I = this.o.interceptor, p = I.at(t); if (!p) return; const b = this.ball.p, d = [b[0] - p.p[0], b[1] - p.p[1]], D = hyp(d[0], d[1]);
    if (D > I.r + R) return; const n = D > 1e-6 ? [d[0] / D, d[1] / D] : [1, 0], v = [p.v[0] + n[0] * 2.0, p.v[1] + n[1] * 2.0];
    this.ball.launch(v, { foot: "X", surface: "BODY", role: "interceptor" }); this.ballPlayedThisTick = true; this.icHit = { t, p: b.slice() };
    this.contacts.push({ n: this.contacts.length + 1, k: this.k, t, F: "X", surface: "BODY", role: "INTERCEPTOR", tech: "INTERCEPTOR", vIn: this.ball.v.slice(), vOut: v, ball: b.slice(), reqH: this.req.h, interceptor: true });
    this.mix(v[0]); this.mix(v[1]); this.flags.replan = "interceptor"; }
  // ═══ THE PROXIES (simulation-owned feet: where each is and how it moves, from a plan's stances and contacts) ══════════════════════════════════
  // a stance: the proxy rests at the stance's place; a swing: from where it left (or, for the swing in the air when the plan began, from the
  // proxy's state then) to the contact point at the contact (the approach), then on to the landing (the follow-through)
  proxyFree(plan, F, t) { return !plan.stances[F].some((s) => t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9); }
  proxyAt(plan, F, t) {
    const L = plan.stances[F]; let cur = null; for (const s of L) if (t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9) cur = s; if (cur) return { p: [cur.pos[0], cur.pos[1], 0], v: [0, 0, 0], planted: true, stance: cur };
    let a = null, b = null; for (const s of L) { if (s.t1 < t) a = s; else if (s.t0 > t && !b) b = s; }
    let t0, p0, v0; const P0 = plan.proxy0 && plan.proxy0[F];
    if (P0 && !P0.planted && (!a || a.t1 < plan.t0 + 1e-9) && t >= plan.t0 - 1e-9) { t0 = plan.t0; p0 = P0.p; v0 = P0.v; } else if (a) { t0 = a.t1; p0 = [a.pos[0], a.pos[1], 0]; v0 = [0, 0, 0]; } else if (P0) { t0 = plan.t0; p0 = P0.p; v0 = P0.v; } else return { p: b ? [b.pos[0], b.pos[1], 0] : [0, 0, 0], v: [0, 0, 0], planted: false };
    const c = plan.contacts.find((x) => x.F === F && !x.missed && x.t > t0 - 1e-9 && (!b || x.t < b.t0 + 1e-9) && x.C);
    const end = b ? [b.pos[0], b.pos[1], 0] : p0, tEnd = b ? b.t0 : t0 + 0.3;
    if (c && t <= c.t + 1e-9) { const T = max(0.02, c.t - t0), u = clamp((t - t0) / T, 0, 1), H = herm(p0, v0, c.C, c.vHit, T, u); return { p: H.p, v: H.v, planted: false, to: c }; }
    if (c) { const T = max(0.02, tEnd - c.t), u = clamp((t - c.t) / T, 0, 1), H = herm(c.C, c.vHit, end, [0, 0, 0], T, u); return { p: H.p, v: H.v, planted: false }; }
    const T = max(0.02, tEnd - t0), u = clamp((t - t0) / T, 0, 1), H = herm(p0, v0, end, [0, 0, 0], T, u); return { p: H.p, v: H.v, planted: false };
  }
  // what a foot can do from now: planted (it can lift after supportMin, the other foot taking the weight) or in the air (it can be re-aimed);
  // its recovery after its last contact; the earliest contact time it allows
  footState(cur, F, t) { const P = this.proxyAt(cur, F, t), L = cur.stances[F], st = P.planted ? P.stance : null;
    const last = this.contacts.filter((c) => c.F === F && !c.missed).reduce((m, c) => max(m, c.t), -9), lastAny = this.contacts.filter((c) => !c.missed).reduce((m, c) => max(m, c.t), -9);
    const out = { F, p: P.p, v: P.v, planted: P.planted, stance: st, last, tMin: max(t + RX.approachMin, last + RX.footRecover, lastAny + RX.touchGap) };
    if (st) { out.tLift = max(t + 0.02, st.t0 + RX.supportMin); out.tMin = max(out.tMin, out.tLift + RX.approachMin); }
    else { const nx = L.find((s) => s.t0 > t); out.tLand = nx ? nx.t0 : null; out.lifted = (L.filter((s) => s.t1 < t).pop() || { t1: t }).t1; }
    return out; }
  // ═══ THE RESOLVER ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  replan(reason) {
    const t = this.t, cur = this.plan, st = this.stateAt(t, cur), q = this.req;
    const keep = this.kept(cur, t), cands = [];
    if (q.h == null) { const p = this.stopPlan(st, keep, q, reason); if (p) cands.push(p); }
    else {
      const gen = this.generic(st, keep, q); for (const p of gen) cands.push(p);
      const turn = this.turnOf(st, q), bestRel = gen.reduce((m, p) => min(m, p.tRel != null ? p.tRel : 9), 9);
      if (abs(turn) > 16 * DEG) for (const id of TECH_IDS) { const T = TEMPLATES[id]; if (t + 0.10 - T.start > bestRel + 0.25) continue; for (const m of [1, -1]) { const p = this.instantiate(id, m, q, st, keep); if (p) cands.push(p); } }
      if (!cands.length) cands.push(this.pursuitPlan(st, keep, q));
    }
    if (!cands.length) cands.push(this.pursuitPlan(st, keep, q));
    for (const c of cands) c.cost = c.cost || this.cost(c, st, q, cur);
    cands.sort((a, b) => a.cost.J - b.cost.J); const best = cands[0];
    best.why = cands.slice(0, 5).map((c) => ({ label: c.action.label + (c.action.F ? ` (${c.action.F})` : ""), J: +c.cost.J.toFixed(2), note: c.cost.note }));
    best.reason = reason; this.adopt(best, st);
    if (!this.decision || q.h == null || this.decision.reqH == null || abs(wrap(q.h - this.decision.reqH)) >= 12 * DEG || best.action.kind !== this.decision.kind) this.decision = { reqH: q.h, kind: best.action.kind, F: best.action.F, t };
  }
  adopt(plan, st) { plan.v = ++this.ver; plan.ball0 = { p: this.ball.p.slice(), v: this.ball.v.slice() }; this.plan = plan; this.plans.push(plan); this.log.plans++;
    const prev = this.plans[this.plans.length - 2], a = plan.action, pa = prev && prev.action; if (!pa || a.id !== pa.id) this.log.actions.push({ t: this.t, kind: a.kind, label: a.label, m: a.m || (a.F ? sgn(a.F) : 0), F: a.F, why: plan.why });
    while (this.plans.length > 2 && this.plans[1].t0 < this.t - 12) this.plans.shift(); while (this.contacts.length > 400) this.contacts.shift(); }
  turnOf(st, q) { if (q.h == null) return 0; const h = st.s > 1.0 ? st.h : st.psi; return wrap(q.h - h); }
  // ── what stays: the stances already made (and each planted foot's current one, its end revisable), the contacts whose proxy is in its final
  // approach (causal commitment) with their foot's swing through them and its landing after; the proxies' present state ──────────────────────
  kept(cur, t) { const out = { stances: { R: [], L: [] }, contacts: [], proxy0: {}, feet: {} };
    for (const c of cur.contacts) if (!c.done && c.t > t - 1e-9 && (c.t - t <= c.tauC + 1e-9 && this.proxyFree(cur, c.F, t))) { out.contacts.push(c); if (c.commitT == null) c.commitT = t; }
    for (const X of ["R", "L"]) { const L = cur.stances[X], nPast = L.filter((s) => s.t0 <= t + 1e-9).length; let i = 0;
      // (and a landing less than 50 ms away: the foot is all but down — its place and time stay; the same scale as a contact's commitment)
      for (const s of L) { const past = s.t0 <= t + 1e-9; if (past) i++; if ((past && (s.t1 > t - 1.0 || i > nPast - 2)) || (!past && s.t0 - t < 0.05)) out.stances[X].push(Object.assign({}, s)); }
      const P = this.proxyAt(cur, X, t); out.proxy0[X] = { p: P.p, v: P.v, planted: P.planted };
      const cc = out.contacts.find((c) => c.F === X); if (cc) { const land = L.find((s) => s.t0 > cc.t - 1e-6 && s.t0 <= cc.t + 0.3); if (land && !out.stances[X].some((s) => s.id === land.id)) out.stances[X].push(Object.assign({}, land)); } }
    for (const X of ["R", "L"]) out.feet[X] = this.footState(cur, X, t);
    return out; }
  // ═══ THE ROOT TRACK of a plan: the approach (cubic, from the present state to the staging state at the contact — the root answers on the first
  // tick) then the exit (velocity-vector steering toward the intent at Agility's limits); the facing (gameplay) follows its own target ══════════
  trackPlan(o) {
    const H = 1.5, n = Math.round(H / DT), Pt = new Float64Array(2 * (n + 1)), Vt = new Float64Array(2 * (n + 1)), psiT = new Float64Array(n + 1), wT = new Float32Array(n + 1), A = this.P, st = o.st, q = o.q, seg = o.seg;
    let p = st.P.slice(), v = st.V ? st.V.slice() : [st.s * dcos(st.h), st.s * dsin(st.h)], psi = st.psi, w = st.w || 0; const fam = o.fam ? FAM[o.fam] : null;
    const vm = q && q.h != null ? this.P.speed[q.mode] : 0, hq = q && q.h != null ? q.h : null;
    for (let i = 0; i <= n; i++) { const t = o.t0 + i * DT; Pt[2 * i] = p[0]; Pt[2 * i + 1] = p[1]; Vt[2 * i] = v[0]; Vt[2 * i + 1] = v[1]; psiT[i] = psi; wT[i] = w; if (i === n) break;
      const tn = t + DT; let psiT0 = null;
      if (seg && tn <= seg.t1 + 1e-9) { const T = seg.t1 - seg.t0, u = clamp((tn - seg.t0) / T, 0, 1), Hh = herm(seg.p0, seg.v0, seg.p1, seg.v1, T, u); p = Hh.p; v = Hh.v; psiT0 = seg.psi0 + wrap(seg.psi1 - seg.psi0) * clamp(u * 1.6, 0, 1); }
      else if (o.keyed && tn <= o.keyed.tEnd) { const K = o.keyed, s = K.sC.at(tn), h = K.hC.at(tn); v = [s * dcos(h), s * dsin(h)]; p = [p[0] + v[0] * DT, p[1] + v[1] * DT]; psiT0 = K.fC.at(tn); }
      else if (o.chase && tn < o.chase.until) { const C = o.chase, f = predict(C.b0, C.bv, tn - C.t0), ui = hq != null ? dir(hq) : f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : dir(psi), g = [f.p[0] - ui[0] * 0.38, f.p[1] - ui[1] * 0.38], d = [g[0] - p[0], g[1] - p[1]], D = hyp(d[0], d[1]), u = D > 1e-3 ? [d[0] / D, d[1] / D] : dir(psi), va = f.v[0] * u[0] + f.v[1] * u[1], sp = clamp(va + 3.0 * D, 0, C.vMax);
        v = this.steer(v, [u[0] * sp, u[1] * sp], 1.3, 1.3); p = [p[0] + v[0] * DT, p[1] + v[1] * DT]; const sv = hyp(v[0], v[1]), db = [f.p[0] - p[0], f.p[1] - p[1]]; psiT0 = sv > 1.5 ? hdg(v) : hyp(db[0], db[1]) > 0.15 ? hdg(db) : psi; }
      else { const vd = o.rest ? [0, 0] : hq != null ? (o.follow && tn >= o.follow.t0 ? this.followBall(o.follow, tn, p, hq, vm) : [vm * dcos(hq), vm * dsin(hq)]) : [0, 0]; v = this.steer(v, vd, fam ? fam.brake : 1, fam ? fam.lat : 1); p = [p[0] + v[0] * DT, p[1] + v[1] * DT]; }
      // the facing: a second-order follower of its target (inside Agility's yaw rate): the plan's, else the travel (or the intent when slow)
      const s = hyp(v[0], v[1]), tgt = psiT0 != null ? psiT0 : s > 1.0 ? hdg(v) : hq != null ? hq : psi, err = wrap(tgt - psi), al = clamp(3600 * err * 0.1 - 38 * w, -9000 * DEG, 9000 * DEG); w = clamp(w + al * DT, -A.yawRate, A.yawRate); psi = wrap(psi + w * DT); }
    return { t0: o.t0, k0: Math.round(o.t0 / DT), n, P: Pt, V: Vt, psi: psiT, w: wT, req: q };
  }
  // the carry's desired velocity: the intent's, converging laterally onto the ball's line and never overrunning the ball (the body goes where the
  // physical ball is — the touch after next is the ball's, not the stick's)
  followBall(F, tn, p, hq, vm) { const f = predict(F.p, F.v, tn - F.t0), u = dir(hq), n = [-u[1], u[0]], dx = [f.p[0] - p[0], f.p[1] - p[1]], e = dx[0] * n[0] + dx[1] * n[1], g = dx[0] * u[0] + dx[1] * u[1], fa = f.v[0] * u[0] + f.v[1] * u[1];
    const vA = clamp(min(vm, fa + 2.5 * (g - 0.45)), 0, vm), vL = clamp(2.2 * e, -0.7 * max(vm, 2), 0.7 * max(vm, 2)); return [u[0] * vA + n[0] * vL, u[1] * vA + n[1] * vL]; }
  // velocity-vector steering toward vd: the component along vd's direction accelerated (Agility's acceleration, falling with speed) or braked, the
  // component across it braked at the lateral limit — the old velocity is braked away, the new one built (no heading-rate vehicle)
  steer(v, vd, kB = 1, kL = 1) { const A = this.P, sd = hyp(vd[0], vd[1]), s = hyp(v[0], v[1]);
    const u = sd > 0.05 ? [vd[0] / sd, vd[1] / sd] : s > 0.05 ? [v[0] / s, v[1] / s] : [1, 0], n = [-u[1], u[0]], va = v[0] * u[0] + v[1] * u[1], vn = v[0] * n[0] + v[1] * n[1];
    const acc = A.aAcc * clamp(1 - max(0, va) / 11, 0.35, 1), dA = clamp((sd - va) * 14, -A.aBrake * kB, acc), dN = clamp(-vn * 14, -A.aLat * kL, A.aLat * kL);
    let na = va + dA * DT, nn = vn + dN * DT; if (sd <= 0.05) { na = va + clamp(-va * 14, -A.aBrake * kB, A.aBrake * kB) * DT; }
    return [u[0] * na + n[0] * nn, u[1] * na + n[1] * nn]; }
  // the posture channels (presentation keys, recorded with the plan): continuous from the previous plan's values now
  channels(plan, keys) { const t0 = plan.t0, prev = this.plan, cv = (k, d) => (prev && prev !== plan && prev.ch && prev.ch[k] ? prev.ch[k].at(t0) : d), out = {};
    for (const [k, d] of Object.entries({ lean: 8, side: 0, trunk: 0, crouch: 0.022, arms: 0.15, gait: 1, look: 0.8 })) { const K = keys && keys[k] ? keys[k].filter((x) => x[0] > t0 + 0.02) : [[t0 + 0.25, d]]; out[k] = new Curve([[t0, cv(k, d)]].concat(K)); } return out; }
  famChannels(fam, t, tc, s) { const run = clamp(s / 6, 0, 1), c = (a) => [[tc - 0.12, a[0]], [tc, a[1]], [tc + 0.25, a[2]], [tc + 0.6, a[3]]];
    switch (fam) {
      case "INSIDE": case "OUTSIDE": case "GATHER": return { lean: c([6, 4, 8, 6 + 6 * run]), crouch: c([0.03, 0.05, 0.035, 0.022]), arms: c([0.3, 0.45, 0.3, 0.15]), gait: c([0.7, 0.45, 0.8, 1]), look: c([1, 1, 0.9, 0.85]), side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]] };
      case "URGENT": return { lean: c([2, -2, 6, 6 + 6 * run]), crouch: c([0.05, 0.07, 0.04, 0.022]), arms: c([0.55, 0.7, 0.4, 0.15]), gait: c([0.5, 0.3, 0.7, 1]), look: c([1, 1, 0.9, 0.85]), side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]] };
      case "PIVOT": return { lean: c([0, -4, 4, 6 + 6 * run]), crouch: c([0.05, 0.075, 0.05, 0.022]), arms: c([0.5, 0.6, 0.4, 0.15]), gait: c([0.4, 0.2, 0.6, 1]), look: c([1, 1, 0.9, 0.85]), side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]] };
      case "STOP": return { lean: [[t + 0.25, 3]], crouch: [[t + 0.3, 0.035]], arms: [[t + 0.3, 0.2]], gait: [[t + 0.25, 0.6], [t + 0.8, 0.2]], look: [[t + 0.3, 1]], side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]] };
      default: return { lean: [[t + 0.3, 6 + 6 * run]], side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]], crouch: [[t + 0.3, 0.022]], arms: [[t + 0.3, 0.15]], gait: [[t + 0.25, 1]], look: [[t + 0.3, 0.85]] }; } }
  // ═══ THE GENERIC CANDIDATES: every family × foot × contact time in the next RX.horizon, screened cheaply (the cubic's peak acceleration is at an
  // end — exact in O(1); the proxy's reach in time; the ball's redirect), the best few built in full ════════════════════════════════════════════
  generic(st, keep, q) {
    const t = this.t, b0 = this.ball.p, bv = this.ball.v, vm = this.P.speed[q.mode], th0 = st.s > 1.0 ? st.h : st.psi, turn = wrap(q.h - th0), sig = turn >= 0 ? 1 : -1;
    // (the families a turn calls for are decided by what the BALL needs: a ball already rolling within 25° of the intent needs only carrying)
    const bsp = hyp(bv[0], bv[1]), ballTurn = bsp > 1.0 ? wrap(q.h - hdg(bv)) : turn, aT = bsp > 1.0 && abs(ballTurn) < 35 * DEG ? 0 : abs(turn) / DEG;
    const V0 = st.V.slice(), p0 = st.P, quick = [], dtS = 4 * DT;
    // the NATURAL path: the body steering freely toward the intent at Agility's limits (the old velocity braked away, the new one built) — the
    // carry touches the ball where it meets this path; its effort is only what it departs from it
    { const n = Math.round((RX.horizon + 0.05) / DT); let p = p0.slice(), v = V0.slice(); this._nat = { P: new Float64Array(2 * (n + 1)), V: new Float64Array(2 * (n + 1)), n };
      const FB = { p: b0, v: bv, t0: t }; for (let i = 0; i <= n; i++) { this._nat.P[2 * i] = p[0]; this._nat.P[2 * i + 1] = p[1]; this._nat.V[2 * i] = v[0]; this._nat.V[2 * i + 1] = v[1]; v = this.steer(v, this.followBall(FB, t + i * DT, p, q.h, vm)); p = [p[0] + v[0] * DT, p[1] + v[1] * DT]; } }
    const committed = keep.contacts.length ? keep.contacts[keep.contacts.length - 1].t : -9;
    const aB = abs(turn) / DEG, ballOnLine = bsp > 1.0 && abs(ballTurn) < 35 * DEG;
    for (const fam of TURN_FAMS) { if (ballOnLine && fam !== "CARRY") continue; const f = FAM[fam]; if (f.minTurn && aB < f.minTurn) continue; if (f.maxTurn && aB > f.maxTurn) continue;
      for (const X of ["R", "L"]) { const s = sgn(X); if (f.side === "inside" && s !== -sig) continue; if (f.side === "outside" && s !== sig) continue;
        const ft = keep.feet[X]; if (keep.contacts.some((c) => c.F === X)) continue;
        const t0c = max(ft.tMin, committed + RX.touchGap);
        // (the contact times: every 3 ticks near, every 6 further out; once a family / foot has a good contact, 0.3 s more of later ones is enough
        // for a turn — later ones only lose)
        let firstOK = null;
        for (let tc = Math.ceil(t0c / DT) * DT; tc <= t + RX.horizon + 1e-9; tc += tc - t < 0.35 ? 3 * DT : 6 * DT) { if (firstOK != null && aT >= 12 && tc > firstOK + 0.30) break;
          const r = this.screen(fam, X, tc, st, q, ft, turn, vm, th0, V0, p0, b0, bv, aT); if (r) { quick.push(r); if (firstOK == null) firstOK = tc; } } } }
    // (the running plan's own pending contact, re-screened at exactly its time: the continuation is always a built candidate)
    // (whatever the intent has done since: a continuously turning stick must not keep postponing a touch whose proxy is already on its way — the
    // re-screen re-aims it at the latest intent, at its own time, and it competes on cost like every other candidate)
    let cont = null; { const pc = this.plan.contacts.find((c) => !c.done && c.src === "rx" && c.t > t + 0.03 && FAM[c.fam] && !keep.contacts.includes(c));
      if (pc && !keep.contacts.some((c) => c.F === pc.F)) cont = this.screen(pc.fam, pc.F, pc.t, st, q, keep.feet[pc.F], turn, vm, th0, V0, p0, b0, bv, aT, true); }
    // the best few per family (cheap estimate), built in full
    quick.sort((a, b) => a.J0 - b.J0); const per = {}, sel = cont ? [cont] : [];
    for (const r of quick) { const key = r.fam + r.X; per[key] = (per[key] || 0) + 1; if (per[key] <= 1 && sel.length < 6) sel.push(r); }
    const out = []; for (const r of sel) { const p = this.buildGeneric(r, st, keep, q); if (p) out.push(p); } return out;
  }
  // the cheap screen of one (family, foot, contact time): the staging state (the ballistic end of a constant-acceleration approach, shifted so the
  // ball sits inside the family's box), its peak acceleration, the proxy's reach in time, the redirect the touch must make
  screen(fam, X, tc, st, q, ft, turn, vm, th0, V0, p0, b0, bv, aNeed, cont) {
    const f = FAM[fam], t = this.t, T = tc - t; if (T < 0.03) return null; const s = sgn(X), aT = abs(turn) / DEG, urgent = aNeed >= 12, B = predict(b0, bv, T);
    const vcap = f.vMax != null ? min(vm, f.vMax) : vm, vAcc = st.s + 0.8 * min(this.P.aAcc, f.aLim) * T;
    // the contact speed: the family's (as a share of the requested), bounded by what the body can reach in the time; variants a little slower, and
    // for the carry one paced on the ball (the body just catching it) — the cheapest feasible variant is kept
    // (the carry's NATURAL speed: the requested one as Agility reaches it — accelerating, or braking down to it; its effort is only what departs from it)
    const vNat = st.s <= vm ? min(vm, st.s + 0.9 * this.P.aAcc * T) : max(vm, st.s - 0.9 * this.P.aBrake * T);
    const tn = clamp(turn, -40 * DEG, 40 * DEG), onLine = st.s >= 0.4 * vm && abs(wrap(st.h - q.h)) < 15 * DEG, vTopS = this.P.speed.SPRINT;
    // the staging state at the contact: what the body can reach by then — TIME-LIMITED (the effort touch): it brakes toward the family's contact
    // speed and turns its travel toward the family's share of the turn as far as the family's acceleration allows in the time left (braking share
    // kb of the budget, the rest turning); the rest of the braking / turning comes after the touch. The carry: its natural speed (or paced)
    const vs = [];
    let natP = null, natV = null;
    if (fam === "CARRY") { const i = min(this._nat.n, Math.round(T / DT)); natP = [this._nat.P[2 * i], this._nat.P[2 * i + 1]]; natV = [this._nat.V[2 * i], this._nat.V[2 * i + 1]];
      const sN = hyp(natV[0], natV[1]), hc = sN > 0.3 ? hdg(natV) : th0, u = dir(hc), along = B.v[0] * u[0] + B.v[1] * u[1]; for (const vc of [sN, sN * 0.8, clamp(along + 0.6, 0.3, max(sN, 0.3)), clamp(along + 0.2, 0.2, max(sN, 0.2))]) vs.push({ vc, hc }); }
    else { const vT = f.vC != null ? min(f.vC, st.s) : min(vcap * f.vF(aT), vAcc), aB = f.aLim;
      // (kb < 0: the ball is fleeing — keep running at it, faster if need be, and do the braking after the touch)
      for (const kb of fam === "PIVOT" || f.check ? [0.95, 0.75] : [0.95, 0.6, 0.35, 0, -0.4]) { const dS = kb < 0 ? -min(max(0, vTopS - st.s), -kb * this.P.aAcc * T) : st.s > vT ? min(st.s - vT, kb * aB * T) : -min(vT - st.s, kb * this.P.aAcc * T), vc = max(0.2, st.s - dS), lat = Math.sqrt(max(0, aB * aB - (dS / T) * (dS / T))) * T * 0.85;
        const dh = min(f.kV * abs(turn), lat / max(vc, 1.0)); vs.push({ vc, hc: th0 + Math.sign(turn) * dh }); } }
    // (the facing at the contact: the family's share of the turn, or less — a quick contact comes before the hips have opened)
    const psiCs = fam === "CARRY" ? [vs.length && vs[0].vc > 1.0 ? vs[0].hc : th0 + f.kPsi * tn] : [th0 + f.kPsi * turn, th0 + 0.4 * f.kPsi * turn], vTop = this.P.speed.SPRINT * 1.04, vF = RX.vFoot(max(st.s, 2));
    // the ball's line after the touch: the intent (the carry: within its redirect of the ball's own line, or of the body's when the ball is slow)
    const bs = hyp(B.v[0], B.v[1]), hRef = (fam === "CARRY" || f.check) && bs > 1.0 ? hdg(B.v) : th0, hOut = fam === "CARRY" ? hRef + clamp(wrap(q.h - hRef), -f.maxRedir * DEG, f.maxRedir * DEG) : f.check ? hRef : q.h;
    if (bs > 1.0 && abs(wrap(hOut - hdg(B.v))) > redirMax(f, bs)) return null;
    // (a fresh approach needs RX.approachMin; the continuation's proxy is already on its way — its own speed limit, checked below, is the test)
    const aMin = cont && !ft.planted ? 0.03 : RX.approachMin; if (tc - (ft.planted ? ft.tLift : t) < aMin - 1e-9) return null;
    let best = null;
    for (const psiC of psiCs) for (const { vc, hc } of vs) { const slow = vc < 1.6, box = slow && (fam === "CARRY" || fam === "STOP") ? { a: [-0.12, 0.62], l: [-0.46, 0.46] } : f.box, u = dir(hc);
      const Vc = [vc * u[0], vc * u[1]], Pb = natP ? [natP[0] + (Vc[0] - natV[0]) * T / 2, natP[1] + (Vc[1] - natV[1]) * T / 2] : [p0[0] + (V0[0] + Vc[0]) / 2 * T, p0[1] + (V0[1] + Vc[1]) / 2 * T];
      const rel = toLocal(B.p, Pb, psiC), rl = [rel[0], rel[1] * s], cl = [clamp(rl[0], box.a[0], box.a[1]), clamp(rl[1], box.l[0], box.l[1])], dl = [rl[0] - cl[0], (rl[1] - cl[1]) * s];
      const Pc = fromLocal(Pb, psiC, dl[0], dl[1]), shift = hyp(dl[0], dl[1]), aPk = hyp(Vc[0] - V0[0], Vc[1] - V0[1]) / T + 6 * shift / (T * T);
      // (the carry: the natural acceleration is free — the limit applies to what it adds: the change of speed off the natural one, the shift)
      const aX = fam === "CARRY" ? hyp(Vc[0] - natV[0], Vc[1] - natV[1]) / T + 6 * shift / (T * T) : aPk;
      if (aX > f.aLim) continue;
      // never faster than the body's top speed on the way (a cubic can overshoot between its ends)
      { let over = false; for (const uu of [0.25, 0.5, 0.75]) { const H = herm(p0, V0, Pc, Vc, T, uu); if (hyp(H.v[0], H.v[1]) > max(vTop, st.s + 0.05)) { over = true; break; } } if (over) continue; }
      // the proxy: from where its foot can leave to the contact point, in time
      const oS = f.check ? max(0.5, vc * 0.6) : max(vc + 1.0, 1.5), outV = [dcos(hOut) * oS, dsin(hOut) * oS], dv = [outV[0] - B.v[0], outV[1] - B.v[1]], dm = hyp(dv[0], dv[1]), nI = dm > 0.2 ? [dv[0] / dm, dv[1] / dm] : dir(hOut);
      const C = [B.p[0] - nI[0] * RX.hitR, B.p[1] - nI[1] * RX.hitR, 0], dist = hyp(C[0] - ft.p[0], C[1] - ft.p[1]);
      // (the proxy's own path, as the full build will make it: from the foot's present state — or from its stance, lifted in time — to the contact
      // point, sampled against its top speed)
      const tA = ft.planted ? max(ft.tLift, tc - max(RX.approachMin, dist / (0.6 * vF))) : t, p0x = ft.planted ? [ft.p[0], ft.p[1], 0] : ft.p, v0x = ft.planted ? [0, 0, 0] : ft.v;
      if (tc - tA < aMin - 1e-9) continue; const vHit = [Vc[0] * 0.5 + nI[0] * 3, Vc[1] * 0.5 + nI[1] * 3, 0]; let fast = false;
      for (const uu of [0.2, 0.4, 0.6, 0.8]) { const H = herm(p0x, v0x, C, vHit, tc - tA, uu); if (hyp(H.v[0], H.v[1]) > vF * 1.08) { fast = true; break; } } if (fast) continue;
      // the cheap cost: the contact's time (when the turn needs it), the time to the new line after it, the effort; straight on: the touch nearest
      // the family's natural placement
      const vLine = 0.4 * vm, along = vc * dcos(wrap(hc - q.h)), tLineE = tc + max(0, vLine - along) / this.P.aAcc + abs(wrap(q.h - hc)) * max(vc, 1) / (this.P.aLat * f.lat) * 0.6 + 0.1;
      const J0 = (urgent ? 1.6 * T + 2.0 * (tLineE - t) : 0.5 * abs(cl[0] - f.nom[0]) + 0.5 * abs(cl[1] - f.nom[1]) + 0.6 * shift + (onLine ? 0 : 2.0 * (tLineE - t)) + 1.5 * max(0, vNat - vc) / max(vm, 1))
        + 2.5 * (aX / f.aLim) ** 2 * (fam === "CARRY" ? 1.5 : 0.35) + (f.effort || 0) + (this.o.foot !== "B" && X !== this.o.foot ? 0.15 : 0);
      // (a carry touch before the ball has started to come back to the body — it still rolls as fast as the body runs, ahead in reach — is
      // premature: it would change nothing; quick feet, not busy feet)
      const premature = fam === "CARRY" && !urgent && (B.v[0] * u[0] + B.v[1] * u[1]) > vc - 0.25 && rl[0] > 0.30;
      // (THE TOUCH INTERVAL: straight on, the carry's touch comes at the opportunity the last touch aimed the ball for)
      const sched = fam === "CARRY" && !urgent && this.nextOpp != null && this.nextOpp > t ? 1.5 * abs(tc - this.nextOpp) : 0, Jp = J0 + (premature ? 1.0 : 0) + sched;
      if (!best || Jp < best.J0) best = { fam, X, tc, T, B, Vc, Pc, psiC, hc, vc, aPk: aX, shift, hOut, C: [C[0], C[1]], nI, J0: Jp, turnDeg: turn / DEG, vNat, place: abs(cl[0] - f.nom[0]) + abs(cl[1] - f.nom[1]), premature, sched }; }
    return best;
  }
  // the full plan of a screened candidate: the root track (approach + exit), the touch (aimed so the ball meets the body at the next opportunity),
  // the support schedule fitted around it (the contacting foot in the air through its approach, the other foot planted when the family plants), the
  // proxy's path, the line time, the ball's separation
  buildGeneric(r, st, keep, q) {
    const t = this.t, f = FAM[r.fam], X = r.X, O = other(X), vm = this.P.speed[q.mode];
    const seg = { t0: t, t1: r.tc, p0: st.P, v0: st.V, p1: r.Pc, v1: r.Vc, psi0: st.psi, psi1: r.psiC }; let plan = this.trackPlan({ t0: t, st, q, fam: r.fam, seg });
    // the touch: the ball to where the body will be at the next opportunity (the rhythm of the carry / one stride after a redirect), ahead on the
    // intent's line in the lane — the control envelope: aimed at the body's next reach, never at a point the body is not going to
    // (the open sprint's long touches — two strides of the touching foot — only when the session asks for them: o.sprintLong; the 99 reference
    // keeps the ball one stride ahead even at full sprint, so a sudden request always finds a reachable ball and the root can brake at once)
    const held = this.log.intent.length ? t - this.log.intent[this.log.intent.length - 1].t : 9, openSprint = !!this.o.sprintLong && q.mode === "SPRINT" && held >= 1.5 && sC_s(this, r.tc, plan) >= 7.6;
    // (a redirect places the ball for a NEARER next opportunity than the carry's stride — the ball leaves slower and stays controllable if the
    // stick changes again; the carry keeps its rhythm)
    const sC = this.stateAt(r.tc, plan), Ts = this.gait(max(sC.s, 1)).Ts, N = r.fam === "CARRY" ? (openSprint ? 2 : 1) : 1, gap = r.fam === "CARRY" ? clamp(2 * Ts * N, 0.30, 1.1) : clamp(1.4 * Ts, 0.28, 0.45);
    const sN = this.stateAt(r.tc + gap, plan), laneF = this.o.foot === "B" ? X : this.o.foot, hAim = r.fam === "CARRY" || f.check ? r.hOut : q.h;
    // (the CONTROL ENVELOPE: every touch leads the ball to where the body will be at its next opportunity, ahead on the intent's line in the lane —
    // a redirect at speed therefore sends the ball where the braking body can follow, the next carry touch finishing the line)
    const B = r.B, target = fromLocal(sN.P, hAim, RX.ahead(sN.s), sgn(laneF) * RX.lane(q.mode) * (r.fam === "CARRY" ? 1 : 0.5));
    let d = [target[0] - B.p[0], target[1] - B.p[1]], D = hyp(d[0], d[1]); let sp = min(RX.vCap, speedFor(D, gap) || RX.vCap), vOut = D > 1e-4 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0];
    // (a check touch: the ball to REST just ahead of where the braking body stops — its rolling distance solved on the kernel's own law)
    if (f.check) { let tStop = r.tc; for (let x = r.tc; x <= t + 1.5; x += 0.02) { tStop = x; if (this.stateAt(x, plan).s < FAM.PIVOT.vC + 0.2) break; } const sS = this.stateAt(tStop, plan), uB = dir(r.hOut);
      const rest = [sS.P[0] + uB[0] * 0.45, sS.P[1] + uB[1] * 0.45], dr = [rest[0] - B.p[0], rest[1] - B.p[1]], Dr = max(0, dr[0] * uB[0] + dr[1] * uB[1]);
      let lo = 0, hi = 8; for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (rollFrom(mid, 3.0).d < Dr) lo = mid; else hi = mid; } sp = (lo + hi) / 2; vOut = [uB[0] * sp, uB[1] * sp]; }
    const bs = hyp(B.v[0], B.v[1]); if (bs > 1.0 && hyp(vOut[0], vOut[1]) > 0.3 && abs(wrap(hdg(vOut) - hdg(B.v))) > redirMax(f, bs) + 1e-6) return this.rej("redirect");
    plan = this.trackPlan({ t0: t, st, q, fam: r.fam, seg, follow: { p: B.p, v: vOut, t0: r.tc } });
    const dv = [vOut[0] - B.v[0], vOut[1] - B.v[1]], dm = hyp(dv[0], dv[1]), nI = dm > 0.2 ? [dv[0] / dm, dv[1] / dm] : dir(hAim), C = [B.p[0] - nI[0] * RX.hitR, B.p[1] - nI[1] * RX.hitR, 0.0];
    const surface = this.surfaceFor(X, B.v, vOut, sC, "touch"), role = r.fam === "CARRY" ? this.carryRole(vOut, sC) : f.label.toLowerCase();
    const vHit = [sC.V[0] * 0.5 + nI[0] * clamp(dm * 0.8, 0.5, 6), sC.V[1] * 0.5 + nI[1] * clamp(dm * 0.8, 0.5, 6), 0];
    // (the contacting foot leaves the ground in time for its proxy to travel to the ball at a reasonable share of its top speed)
    const ftX = keep.feet[X], dGo = hyp(C[0] - ftX.p[0], C[1] - ftX.p[1]), liftBy = ftX.planted ? max(ftX.tLift, r.tc - max(RX.approachMin, dGo / (0.6 * RX.vFoot(max(st.s, r.vc))))) : null;
    const c = { id: ++this.cid, t: Math.round(r.tc / DT) * DT, k: Math.round(r.tc / DT), F: X, surface, role, fam: r.fam, tech: r.fam, aim: f.check ? { kind: "vel", speed: hyp(vOut[0], vOut[1]), h: hyp(vOut[0], vOut[1]) > 0.05 ? hdg(vOut) : r.hOut } : { kind: "target", P: target, T: r.tc + gap }, src: "rx", decisive: r.fam !== "CARRY", C, vHit, tauC: tauCommit(r.fam), plannedAt: t, planH: q.h, turnDeg: r.turnDeg, bPred: B.p, vInPred: B.v, vOutPred: vOut, liftBy };
    // the support schedule: the contacting foot in the air from before its approach to after its follow-through; the other foot planted at the
    // contact when the family plants (its landing brought forward if it is in the air); the gait around them (stride timing re-fitted)
    const anchors = [{ id: ++this.sid, F: X, t0: c.t + f.follow, t1: null, pos: null, yaw: null, kind: "after the touch", src: "rx", contact: true }];
    const oNow = keep.feet[O], oPlantedAt = (tt) => keep.stances[O].some((s) => tt >= s.t0 && tt <= s.t1);
    if (f.plant && !(oNow.planted && oPlantedAt(c.t + 0.03))) { const tp = c.t - 0.05; if (tp > t + 0.03 && (oNow.planted || tp - (oNow.lifted || t) >= RX.supportMin)) anchors.unshift({ id: ++this.sid, F: O, t0: tp, t1: null, pos: null, yaw: null, kind: "plant", src: "rx", plant: true }); }
    plan.contacts = keep.contacts.concat([c]); plan.action = { kind: r.fam, label: f.label, F: X, m: sgn(X), id: this.sameAction(r.fam, X, q) ? this.plan.action.id : ++this.aid, fam: r.fam, tc: c.t, tauC: c.tauC };
    plan.stances = this.gaitFrom(plan, keep, anchors, t + 1.5); if (!this.freeAt(plan, X, c.t)) return this.rej("support");
    plan.proxy0 = keep.proxy0; if (!this.proxyOK(plan, c, st)) return this.rej("proxy speed");
    plan.ch = this.channels(plan, this.famChannels(r.fam, t, c.t, st.s)); this.pivotPlant(plan, c, q);
    plan.tLine = this.lineTime(plan, q); plan.tRel = c.t; plan.aPk = r.aPk; plan.fam = r.fam;
    // the ball's separation after the touch (the envelope's check over the next 1.2 s)
    let sa = 0; for (let x = 0; x <= 1.2; x += 0.1) { const s2 = this.stateAt(c.t + x, plan), b2 = predict(B.p, vOut, x).p; sa = max(sa, hyp(b2[0] - s2.P[0], b2[1] - s2.P[1])); }
    const lim = q.mode === "SPRINT" ? 3.0 : q.mode === "RUN" ? 2.0 : q.mode === "JOG" ? 1.5 : 1.0; plan.sepMax = sa; plan.sepPen = sa > lim ? 0.6 * (sa - lim) : 0;
    plan.r = r; return plan;
  }
  rej(why) { (this._rej = this._rej || {})[why] = (this._rej[why] || 0) + 1; return null; }
  sameAction(fam, X, q) { const a = this.plan.action, D = this.decision; return a && a.kind === fam && a.F === X && D && q.h != null && D.reqH != null && abs(wrap(q.h - D.reqH)) < 12 * DEG && !this.contacts.some((c) => c.actionId === a.id && !c.missed); }
  freeAt(plan, F, tc) { return !plan.stances[F].some((s) => s.t0 < tc + 0.02 && s.t1 > tc - RX.approachMin * 0.5); }
  // the proxy's approach must stay within its top speed (sampled) and start from a lawful place: the contacting foot off the ground in time
  proxyOK(plan, c, st) { const vMax = RX.vFoot(max(st.s, 2)) * 1.10; for (let x = 0; x <= 6; x++) { const tt = this.t + (c.t - this.t) * x / 6, P = this.proxyAt(plan, c.F, tt); if (hyp(P.v[0], P.v[1]) > vMax) return false; } return true; }
  // a planted foot through a redirect turns on its ball of the foot toward the exit (presentation: the stance's pivot)
  pivotPlant(plan, c, q) { const O = other(c.F); const s = plan.stances[O].find((x) => x.t0 <= c.t && x.t1 >= c.t); if (!s || s.t1 === Infinity || s.src === "stand" || q.h == null) return;
    // (from now on only: a plant already standing never has its yaw changed in the past)
    const turn = wrap(q.h - s.yaw), k = clamp(abs(turn) / (90 * DEG), 0, 1) * 0.55; if (abs(turn) < 20 * DEG || s.pivot) return; const p0 = max(s.t0, c.t - 0.03, this.t + DT), p1 = min(s.t1, c.t + 0.14); if (p1 < p0 + 0.04) return; s.pivot = [[p0, 0], [p1, turn * k]]; }
  // ── stopping: the ball at rest at the feet → no touch, the body stops behind it; else a stop touch (sole when slow, cushion when quicker) ────────
  stopPlan(st, keep, q, reason) {
    const t = this.t, b0 = this.ball.p, bv = this.ball.v, bs = hyp(bv[0], bv[1]);
    if (bs < 0.05) { const d = hyp(b0[0] - st.P[0], b0[1] - st.P[1]);
      if (d < 0.85) { const Tst = max(0.30, st.s / (this.P.aBrake * 0.8)), hb = d > 0.05 ? hdg([b0[0] - st.P[0], b0[1] - st.P[1]]) : st.psi, Pr = [b0[0] - dcos(hb) * 0.36, b0[1] - dsin(hb) * 0.36];
        const plan = st.s < 0.05 && d < 0.6 ? this.trackPlan({ t0: t, st, q, rest: true }) : this.trackPlan({ t0: t, st, q, rest: true, seg: { t0: t, t1: t + Tst, p0: st.P, v0: st.V, p1: Pr, v1: [0, 0], psi0: st.psi, psi1: hb } });
        plan.contacts = keep.contacts.slice(); plan.action = { kind: "STANDING", label: st.s > 0.4 ? "STOP" : "STANDING", id: this.plan.action.kind === "STANDING" ? this.plan.action.id : ++this.aid };
        plan.stances = this.gaitFrom(plan, keep, [], t + 1.5); plan.proxy0 = keep.proxy0; plan.ch = this.channels(plan, this.famChannels("STOP", t, t + 0.3, st.s)); plan.tLine = null; plan.sepMax = d; plan.sepPen = 0; plan.cost = { J: 0, note: "the ball at rest at the feet" }; return plan; } }
    // a stop touch: the earliest feasible
    let best = null; for (const X of ["R", "L"]) { const ft = keep.feet[X]; if (keep.contacts.some((c) => c.F === X)) continue;
      for (let tc = Math.ceil(ft.tMin / DT) * DT; tc <= t + RX.horizon; tc += 4 * DT) { const r = this.screenStop(X, tc, st, ft, b0, bv); if (r && (!best || r.J0 < best.J0)) { best = r; break; } } }
    if (!best) return this.pursuitPlan(st, keep, q);
    const f = FAM.STOP, X = best.X, plan = this.trackPlan({ t0: t, st, q, fam: "STOP", rest: true, seg: { t0: t, t1: best.tc, p0: st.P, v0: st.V, p1: best.Pc, v1: best.Vc, psi0: st.psi, psi1: best.psiC } });
    const sC = this.stateAt(best.tc, plan), B = best.B, inS = hyp(B.v[0], B.v[1]), slow = sC.s < 2.4 || inS < 0.3, spd = slow ? 0 : min(inS, sC.s * 0.55), hh = inS > 0.3 ? hdg(B.v) : sC.psi;
    const vOut = [dcos(hh) * spd, dsin(hh) * spd], dv = [vOut[0] - B.v[0], vOut[1] - B.v[1]], dm = hyp(dv[0], dv[1]), nI = dm > 0.2 ? [dv[0] / dm, dv[1] / dm] : dir(sC.psi), C = [B.p[0] - nI[0] * RX.hitR, B.p[1] - nI[1] * RX.hitR, 0];
    const c = { id: ++this.cid, t: Math.round(best.tc / DT) * DT, k: Math.round(best.tc / DT), F: X, surface: slow ? "SOLE" : "INSIDE", role: slow ? "stop (sole)" : "stop (cushion)", fam: "STOP", tech: "STOP", aim: { kind: "vel", speed: spd, h: hh }, src: "rx", decisive: false, C, vHit: [sC.V[0] * 0.5, sC.V[1] * 0.5, 0], tauC: tauCommit("STOP"), plannedAt: t, planH: null, turnDeg: 0, bPred: B.p, vInPred: B.v, vOutPred: vOut };
    plan.contacts = keep.contacts.concat([c]); plan.action = { kind: "STOP", label: "STOP", F: X, m: sgn(X), id: this.plan.action.kind === "STOP" ? this.plan.action.id : ++this.aid, fam: "STOP", tc: c.t, tauC: c.tauC };
    plan.stances = this.gaitFrom(plan, keep, [{ id: ++this.sid, F: X, t0: c.t + f.follow, t1: null, pos: null, yaw: null, kind: "after the stop", src: "rx", contact: true }], t + 1.5); if (!this.freeAt(plan, X, c.t)) return this.pursuitPlan(st, keep, q);
    plan.proxy0 = keep.proxy0; plan.ch = this.channels(plan, this.famChannels("STOP", t, c.t, st.s)); plan.tLine = null; plan.sepMax = 0.6; plan.sepPen = 0; plan.cost = { J: 0.2 + (best.tc - t), note: `stop ${X} in ${(best.tc - t).toFixed(2)} s` }; return plan;
  }
  screenStop(X, tc, st, ft, b0, bv) { const f = FAM.STOP, t = this.t, T = tc - t; if (T < 0.03) return null; const s = sgn(X), B = predict(b0, bv, T), vc = min(st.s, f.vC), hc = st.s > 0.6 ? st.h : st.psi, psiC = st.psi;
    const Vc = [vc * dcos(hc), vc * dsin(hc)], Pb = [st.P[0] + (st.V[0] + Vc[0]) / 2 * T, st.P[1] + (st.V[1] + Vc[1]) / 2 * T], rel = toLocal(B.p, Pb, psiC), rl = [rel[0], rel[1] * s];
    const cl = [clamp(rl[0], f.box.a[0], f.box.a[1]), clamp(rl[1], f.box.l[0], f.box.l[1])], dl = [rl[0] - cl[0], (rl[1] - cl[1]) * s], Pc = fromLocal(Pb, psiC, dl[0], dl[1]), shift = hyp(dl[0], dl[1]);
    const aPk = hyp(Vc[0] - st.V[0], Vc[1] - st.V[1]) / T + 6 * shift / (T * T); if (aPk > f.aLim) return null;
    const tA = ft.planted ? ft.tLift : t, dist = hyp(B.p[0] - ft.p[0], B.p[1] - ft.p[1]); if (tc - tA < RX.approachMin || max(0, dist - 0.2) > (tc - tA) * RX.vFoot(st.s) * 0.85) return null;
    return { X, tc, B, Vc, Pc, psiC, aPk, J0: T + 0.3 * aPk / f.aLim }; }
  // ── the pursuit (no contact feasible within the horizon: the ball beyond reach): run at the ball itself, re-aimed every step, re-planned often ──
  pursuitPlan(st, keep, q) { const t = this.t, b = this.ball.p, bv = this.ball.v, vMax = min(this.P.speed.SPRINT, max(this.P.speed[q.mode] * 1.3, hyp(bv[0], bv[1]) + 1.5, 3.0));
    const plan = this.trackPlan({ t0: t, st, q, chase: { b0: b.slice(), bv: bv.slice(), t0: t, vMax, until: t + 1.6 } });
    plan.contacts = keep.contacts.slice(); plan.action = { kind: "PURSUIT", label: "PURSUIT", id: this.plan.action.kind === "PURSUIT" ? this.plan.action.id : ++this.aid, chase: true };
    plan.stances = this.gaitFrom(plan, keep, [], t + 1.5); plan.proxy0 = keep.proxy0; plan.ch = this.channels(plan, this.famChannels("CARRY", t, t + 0.3, st.s));
    const dist = (x) => { const s0 = this.stateAt(t + x, plan), f = predict(b, bv, x).p; return hyp(f[0] - s0.P[0], f[1] - s0.P[1]); }; plan.action.closing = dist(1.2) < max(0.9, dist(0) - 0.4);
    plan.tLine = this.lineTime(plan, q); plan.sepMax = dist(0); plan.sepPen = 1.5; plan.cost = { J: 9 + dist(1.2), note: "no contact reachable — pursuit" }; return plan; }
  // ── THE COST (one scale for every candidate, generic and named): the first relevant contact, the new line, effort, the ball's separation, the
  // preferred foot; a small hysteresis against flip-flop while the intent is unchanged ─────────────────────────────────────────────────────────
  cost(c, st, q, cur) {
    const t = this.t, a = c.action, notes = [], turn = this.turnOf(st, q), bv = this.ball.v, bsp = hyp(bv[0], bv[1]), ballTurn = bsp > 1.0 ? wrap(q.h - hdg(bv)) : turn, aT = bsp > 1.0 && abs(ballTurn) < 35 * DEG ? 0 : abs(turn) / DEG, aBody = abs(turn) / DEG; let J = 0;
    { const pc = cur.contacts.find((x) => !x.done && x.t > t), nc = c.contacts && c.contacts.find((x) => !x.done && x.t > t && !(cur.contacts.includes(x))); if (pc && nc && pc.F === nc.F && pc.fam === nc.fam && abs(pc.t - nc.t) < 0.05) { J -= 0.60; notes.push("(continues)"); } }
    const tLine = c.tLine != null ? c.tLine - t : 2.5; if (aBody >= 12) { J += 2.0 * min(2.5, tLine); notes.push(c.tLine != null ? `line +${tLine.toFixed(2)}s` : "never on the line"); }
    const tRel = c.tRel != null ? c.tRel - t : a.tC != null ? a.tC - t : 1.5; if (aT >= 12) { J += 1.6 * tRel; notes.push(`contact +${tRel.toFixed(2)}s`); }
    else if (c.r) { const onLine = aBody >= 12 || (st.s >= 0.4 * this.P.speed[q.mode] && abs(wrap(st.h - q.h)) < 15 * DEG); J += 0.6 * c.r.shift + (c.r.fam === "CARRY" ? 0 : 0.4) + (onLine ? 0 : 2.0 * min(2.5, tLine)) + 1.5 * max(0, (c.r.vNat || 0) - c.r.vc) / max(this.P.speed[q.mode], 1); notes.push(`touch +${tRel.toFixed(2)}s`); }
    if (c.aPk != null && c.fam) { const f = FAM[c.fam], e = c.aPk / f.aLim; J += (c.fam === "CARRY" ? 3.0 : 0.9) * e * e + (f.effort || 0); if (e > 0.6) notes.push(`effort ${c.aPk.toFixed(1)} m/s²`); }
    // INPUT RESPONSE (the first clock — one term for every candidate, generic or named): how far the root's own velocity has moved toward the
    // requested one within 0.15 s, against what Agility's braking could do in that time; a plan that holds or worsens the old motion pays
    if (aBody >= 20 && c.P) { const vm = this.P.speed[q.mode], Vd = [vm * dcos(q.h), vm * dsin(q.h)], dV = [Vd[0] - st.V[0], Vd[1] - st.V[1]], m = hyp(dV[0], dV[1]);
      if (m > 0.5) { const s1 = this.stateAt(t + 0.15, c), prog = ((s1.V[0] - st.V[0]) * dV[0] + (s1.V[1] - st.V[1]) * dV[1]) / m, rMax = min(m, this.P.aBrake * 0.15), need = abs(wrap(q.h - st.psi)), fp = need > 5 * DEG ? (need - abs(wrap(q.h - s1.psi))) / min(need, 45 * DEG) : 0;
        const def = clamp(1 - max(prog / rMax, st.s < 2.5 ? fp : 0), 0, 1.5);
        J += 1.4 * def; if (def > 0.3) notes.push(`late response ${(def * 100).toFixed(0)}%`); } }
    if (c.sepPen) { J += c.sepPen; notes.push(`ball ${c.sepMax.toFixed(1)}m away`); }
    if (aT < 12 && c.tRel != null) { const last = this.contacts.filter((x) => !x.missed && !x.interceptor).reduce((m, x) => max(m, x.t), -9), gap = c.tRel - last, Ts = this.gait(max(st.s, 1)).Ts, gN = clamp(2 * Ts, 0.30, 0.9) * 0.85;
      if (gap < gN) { J += 1.2 * (gN - gap) / gN; notes.push("busy"); } if (c.r && c.r.place != null) J += 0.5 * c.r.place; if (c.r && c.r.premature) { J += 1.0; notes.push("premature"); } if (c.r && c.r.sched) J += c.r.sched; }
    const F = a.F; if (F && this.o.foot !== "B" && F !== this.o.foot) { J += 0.15; notes.push("weak foot"); }
    if (a.tech) { const T = TEMPLATES[a.tech]; if (a.speedFit) { J += a.speedFit; notes.push("speed"); } if (cur.action.tech === a.tech && cur.action.m === a.m) J -= 0.25; }
    const D = this.decision; if (D && q.h != null && D.reqH != null && abs(wrap(q.h - D.reqH)) < 12 * DEG && (a.kind !== cur.action.kind || (a.kind !== "CARRY" && (a.F || "") !== (cur.action.F || "")))) { J += 0.35; notes.push("(switch)"); }
    return { J, note: notes.join(" · "), tLine };
  }
  // ═══ THE SUPPORT SCHEDULE (the coarse gait the proxies rest on; its exact rendered choreography is the presentation's): footfalls after the kept
  // ones, alternating at the running cadence (RUN-1) / walking, anchors (a contact's foot landing after its touch, the plant) placed exactly, the
  // steps before them re-timed to fit — abbreviated where the response needs it (support ≥ RX.supportMin, swing ≥ 0.10 s) ──────────────────────
  gaitFrom(plan, keep, anchors, tTo) {
    const S = { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, lastOf = (X) => S[X][S[X].length - 1], t = this.t, SW = 0.10;
    const bp0 = this.ball.p, bv0 = this.ball.v;
    const place = (X, tt, t1) => { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = v > 2.4 ? WIDTH.run : WIDTH.walk, ld = v < 0.3 ? 0 : lead(v);
      let p = fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); const r = rgt(s0.psi), sx = sgn(X);
      const o = lastOf(other(X)); if (o && o.pos) { const l = ((p[0] - o.pos[0]) * r[0] + (p[1] - o.pos[1]) * r[1]) * sx; if (l < 0.13) { p = [p[0] + r[0] * sx * (0.13 - l), p[1] + r[1] * sx * (0.13 - l)]; } }
      return offBall(p, s0.psi, X, tt, min(t1 != null ? t1 : tt + 0.25, tt + 0.6)); };
    const offBall = (p, psi, X, tt, tEnd) => { const r = rgt(psi); let need = 0, side = sgn(X);
      for (let x = max(t, tt - 0.04); x <= tEnd + 1e-9; x += x > tt + 0.6 ? 0.2 : 0.02) { const b = predict(bp0, bv0, x - t).p, d = [b[0] - p[0], b[1] - p[1]], a = d[0] * dcos(psi) + d[1] * dsin(psi), l = d[0] * r[0] + d[1] * r[1];
        if (a > -0.24 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
      return need > 0 ? [p[0] + r[0] * side * min(0.20, need), p[1] + r[1] * side * min(0.20, need)] : p; };
    const yawOf = (X, tt) => { const s0 = this.stateAt(tt, plan); return (s0.s > 0.6 ? s0.h : s0.psi) + sgn(X) * 5 * DEG; };
    const cad = (tt) => { const v = this.stateAt(tt, plan).s, G = this.gait(max(v, 0.01)), v2 = this.stateAt(tt + 0.3, plan).s;
      return v2 > v + 0.6 && v2 > 1.8 ? { Ts: min(G.Ts, 0.245 + 0.008 * v), D: max(G.D, 0.36) } : G; };
    const stanceD = (tt) => { const G = cad(tt); return G.D * 2 * G.Ts; };
    const step = (X, td) => { const st = { id: ++this.sid, F: X, t0: td, t1: td + stanceD(td), pos: place(X, td, td + stanceD(td)), yaw: yawOf(X, td), kind: this.stateAt(td, plan).s < 2.4 ? "walk" : "stride", src: "gait" }; S[X].push(st); return st; };
    const lift = (X, tdNext) => { const l = lastOf(X); if (l.t1 === Infinity || l.t1 > tdNext - SW) l.t1 = max(l.t0 + RX.supportMin, min(tdNext - SW, l.t1 === Infinity ? t + 0.02 : l.t1), t + 0.02); };
    const lastTD = () => { const r = lastOf("R"), l = lastOf("L"); if (abs(r.t0 - l.t0) < 1e-9) return r.src !== "gait" ? r : l.src !== "gait" ? l : r; return r.t0 > l.t0 ? r : l; };
    const moving = plan.req && plan.req.h != null;
    if (lastOf("R").t1 === Infinity && lastOf("L").t1 === Infinity) {
      if (!moving && !anchors.length) return S;
      const hq = plan.req && plan.req.h != null ? plan.req.h : this.stateAt(t, plan).psi, rr = toLocal(lastOf("R").pos, this.stateAt(t, plan).P, hq)[0], ll = toLocal(lastOf("L").pos, this.stateAt(t, plan).P, hq)[0];
      let X = rr < ll - 0.02 ? "R" : ll < rr - 0.02 ? "L" : (this.o.foot === "L" ? "R" : "L"); if (anchors.length) { const A0 = anchors[0]; X = A0.t0 - t < 0.3 ? A0.F : other(A0.F); }
      const td = t + 0.03 + 0.17; lastOf(X).t1 = t + 0.03; if (!(anchors.length && anchors[0].F === X && anchors[0].t0 < td + 0.1)) step(X, td); lastOf(other(X)).t1 = Infinity; }
    for (const A of anchors.slice().sort((x, y) => x.t0 - y.t0)) { if (A.t0 <= t + 0.02 || (A.plant && A.t0 < t + 0.06 && lastOf(A.F).t1 < t)) continue;
      const L0 = lastTD(), N = other(L0.F), gap = A.t0 - L0.t0, Ts = this.gait(max(this.stateAt(L0.t0, plan).s, 0.5)).Ts;
      // (a contact's anchor — its foot landing after its touch: that foot stays in the air through its approach, so no step of it is fitted in
      // before; at most one of the other foot)
      let best = null; for (let j = (A.F === N ? 0 : 1); j <= (A.contact ? 1 : 7); j += 2) { const per = gap / (j + 1); if (per < 0.12) break; const e = abs(per - Ts); if (!best || e < best.e) best = { j, per, e }; }
      if (!best) best = { j: A.F === N ? 0 : 1, per: gap / ((A.F === N ? 0 : 1) + 1) };
      // (never a step in the past or too soon for a foot in the air: re-fitted from the present; a step that would come too close to the next is dropped)
      let tPrev = L0.t0; for (let i = 1; i <= best.j; i++) { const X = i % 2 === 1 ? N : other(N), lx = lastOf(X), td = max(L0.t0 + i * best.per, t + (lx.t1 < t ? 0.06 : 0.02), tPrev + 0.12);
        if (td > A.t0 - 0.12) break; lift(X, td); step(X, td); tPrev = td; }
      if (A.t1 == null) A.t1 = A.t0 + stanceD(A.t0); if (!A.pos) { A.pos = place(A.F, A.t0, A.t1); A.yaw = yawOf(A.F, A.t0); }
      lift(A.F, A.t0); const prev = lastOf(other(A.F)); if (prev.t1 === Infinity) prev.t1 = A.t0 + 0.08; S[A.F].push(A); }
    for (let guard = 0; guard < 30; guard++) {
      const L0 = lastTD(), X = other(L0.F), s0 = this.stateAt(max(t, L0.t0), plan), v = s0.s, G = cad(max(t, L0.t0)), tEnd = this.stateAt(min(tTo, max(t, L0.t0) + 0.4), plan).s;
      if (!moving && v < 0.45 && tEnd < 0.3) { const lx = lastOf(X); if (lx.t1 === Infinity && L0.t1 === Infinity) break;
        const td = max(L0.t0 + 0.14, lx.t1 === Infinity ? t + 0.16 : lx.t1 + 0.16, t + 0.05); if (td > tTo) break; lift(X, td); const s1 = this.stateAt(td, plan);
        S[X].push({ id: ++this.sid, F: X, t0: td, t1: Infinity, pos: offBall(fromLocal(s1.P, s1.psi, X === (this.o.foot === "L" ? "L" : "R") ? -0.02 : 0.04, sgn(X) * WIDTH.stand), s1.psi, X, td, td + 3.0), yaw: s1.psi + sgn(X) * 6 * DEG, kind: "settle", src: "gait" }); L0.t1 = Infinity; break; }
      // (a foot in the air now is not brought down sooner than 60 ms from now — its displayed swing must be able to get there)
      let td = L0.t0 + G.Ts; const lx = lastOf(X); if (lx.t1 !== Infinity) td = max(td, lx.t1 + 0.16); td = max(td, t + (lx.t1 < t ? 0.06 : 0.02)); if (td > tTo) break;
      lift(X, td); step(X, td); if (L0.t1 === Infinity) L0.t1 = td + 0.6 * stanceD(td); }
    for (const X of ["R", "L"]) { const L = S[X]; for (let i = 0; i + 1 < L.length; i++) if (L[i].t1 > L[i + 1].t0 - SW && L[i].t1 > t) L[i].t1 = max(L[i].t0 + 0.05, L[i + 1].t0 - SW, t + 0.005); }
    // a contact's foot off the ground through its approach: its stance before the contact ends early enough (abbreviated, ≥ supportMin)
    for (const c of plan.contacts) { if (c.done) continue; const L = S[c.F], by = c.liftBy != null ? min(c.liftBy, c.t - RX.approachMin) : c.t - RX.approachMin;
      for (const s of L) if (s.t0 < c.t - RX.approachMin && s.t1 > by && s.t0 <= by && s.t1 !== Infinity) s.t1 = max(s.t0 + RX.supportMin, by, t + 0.005);
      for (const s of L) if (s.t1 === Infinity && s.t0 < c.t && s.src !== "rx") s.t1 = max(s.t0 + RX.supportMin, min(by, t + 0.02), t + 0.005); }
    return S;
  }
  // ═══ A NAMED TECHNIQUE (TECHNICAL-CONTROL-1.5's templates, pt_tech.js) as an ordinary candidate: the approach is the generic cubic (the root
  // answers at once) to the template's first stance, then its keyed body; no set touch (a ball beyond the template's point is a generic problem);
  // its decisive contact witnessed by its proxy like any other — no angle bucket beyond the template's own range, no penalty of its own ══════════
  instantiate(id, m, q, st, keep) {
    const T = TEMPLATES[id], t = this.t, P = this.P; if (this.o.attrs.dri < P.techMin[id] || q.h == null) return null;
    const F = m > 0 ? "R" : "L", S = other(F), h0 = st.s > 1.0 ? st.h : st.psi, turnW = wrap(q.h - h0); let dr = m * turnW / DEG; const refS = T.turn * T.ref;
    if (Math.sign(dr) !== T.turn && abs(dr) > 140) dr = dr + T.turn * 360;
    if (Math.sign(dr) !== T.turn || abs(dr) < T.hard[0] || abs(dr) > T.hard[1]) return null; if (st.s < T.vRange[0] - 0.4) return null;
    if (keep.contacts.some((c) => c.F === F)) return null;
    const k = dr / refS, rot = (dr - refS) * DEG, vRef0 = T.com.v[0][1], vRefC = new Curve(T.com.v).at(0), Bref = [T.B[0], m * T.B[1]], ft = keep.feet[F];
    const hKeysFor = (tC) => T.com.h.map(([x, d]) => [tC + x, h0 + m * ((x >= 0 || T.com.scaleAll ? d * k : d)) * DEG]);
    // (the template's own displacement from its first stance to its contact depends only on the entry speed: once per speed, in template time)
    const VA_ = [min(st.s, vRef0 * 1.15), min(st.s, vRef0), vRef0 * 0.85].filter((vA) => !(vA < T.vFloor - 1e-6 && T.vFloor > 0)).map((vA) => {
      const vC = vA <= vRef0 ? max(0.05, vRefC * vA / max(0.1, vRef0)) : vRefC, sp = clamp(vC / max(0.05, vRefC), 0.5, 1.45), K0 = T.com.v.map(([x, v]) => [x, x < 0 ? vC + (v - vRefC) * (vA - vC) / (abs(vRef0 - vRefC) > 1e-3 ? vRef0 - vRefC : 1) : v * sp]);
      const sc = new Curve(K0), hc = new Curve(hKeysFor(0)); let dd = [0, 0]; for (let x = T.start; x < -1e-9; x += DT) { const s = sc.at(x), h = hc.at(x); dd = [dd[0] + s * dcos(h) * DT, dd[1] + s * dsin(h) * DT]; } return { vA, vC, sp, K0, dd }; });
    let best = null;
    for (let tA = Math.ceil((t + 0.10) / DT) * DT; tA <= t + 0.9 && !best; tA += 6 * DT) { const tC = tA - T.start; if (tC < ft.tMin) continue; const Bc = predict(this.ball.p, this.ball.v, tC - t).p;
      for (const E of VA_) { const PA = [Bc[0] - (dcos(h0) * Bref[0] - dsin(h0) * Bref[1]) - E.dd[0], Bc[1] - (dsin(h0) * Bref[0] + dcos(h0) * Bref[1]) - E.dd[1]], VA = [E.vA * dcos(h0), E.vA * dsin(h0)];
        const aPk = hermAcc(st.P, st.V, PA, VA, tA - t); if (aPk > 13.5) continue;
        let over = false; for (const uu of [0.25, 0.5, 0.75]) { const H = herm(st.P, st.V, PA, VA, tA - t, uu); if (hyp(H.v[0], H.v[1]) > max(this.P.speed.SPRINT * 1.04, st.s + 0.05)) { over = true; break; } } if (over) continue;
        best = { tA, tC, vA: E.vA, vC: E.vC, sp: E.sp, K: E.K0.map(([x, v]) => [tC + x, v]), aPk, PA, VA }; break; } }
    if (!best) return null;
    const { tA, tC, vA, vC, sp, K, aPk } = best, tau = (x) => tC + x, sC = new Curve(K), hC = new Curve(hKeysFor(tC));
    const fKeys = T.face.map(([x, dd]) => [tau(x), h0 + m * (x > 0 ? dd * k : dd) * DEG]);
    const plan = this.trackPlan({ t0: t, st, q, fam: "INSIDE", seg: { t0: t, t1: tA, p0: st.P, v0: st.V, p1: best.PA, v1: best.VA, psi0: st.psi, psi1: h0 }, keyed: { tEnd: tau(T.end), sC, hC, fC: new Curve(fKeys) } });
    const O = this.stateAt(tC, plan).P, Bw = predict(this.ball.p, this.ball.v, tC - t).p;
    const map = (p, w) => { const a = p[0], l = p[1]; if (!w) return [a, m * l]; const c = dcos(rot * w), s2 = dsin(rot * w); return [a * c - l * s2, m * (a * s2 + l * c)]; };
    const anchors = T.stances.map((ts) => { const X = ts.F === "F" ? F : S, t0 = tau(ts.t0), t1 = tau(ts.t1); let pos;
      if (ts.at.rel === "com") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "travel") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, s0.h, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "O") { const p = map(ts.at.p, ts.w || 0); pos = fromLocal(O, h0, p[0], p[1]); }
      else if (ts.at.rel === "B") { pos = fromLocal(Bw, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "ballAt") { const bAt = this.ballAfterDecisive(Bw, h0, m, T, tC, tau(ts.at.t), k, sp); const exitH = h0 + m * (refS * k) * DEG; pos = fromLocal(bAt, exitH, ts.at.exitAt[0], m * ts.at.exitAt[1]); }
      const yaw = ts.yaw === "travel" ? this.stateAt(t0, plan).h + sgn(X) * 5 * DEG : h0 + m * (ts.yaw + (ts.w || ts.wYaw ? (dr - refS) * (ts.w || ts.wYaw) : 0)) * DEG;
      const pivot = ts.pivot ? ts.pivot.map(([x, dd]) => [tau(x), m * dd * k * DEG]) : null;
      return { id: ++this.sid, F: X, t0, t1, pos, yaw, kind: ts.kind, src: "tech", pivot, heel: ts.heel ? [tau(ts.heel[0]), ts.heel[1]] : null, swingIn: ts.swingIn ? Object.assign({}, ts.swingIn, { frame: { tC, h0, m, rot, O, B: Bw, k } }) : null }; });
    const frame = { tC, h0, m, rot, O, B: Bw, k, F, S, exitH: h0 + m * refS * k * DEG }, cs = [];
    for (const tc of T.contacts) { const X = tc.F === "F" ? F : S, tt = tau(tc.tau), launchDeg = tc.aim.launch === "exit" ? refS * k : tc.aim.launch * k, h = h0 + m * launchDeg * DEG, spd = tc.aim.v * this.launchScale(T, sp), Bt = predict(this.ball.p, this.ball.v, tt - t);
      const vOut = [spd * dcos(h), spd * dsin(h)], dv = [vOut[0] - Bt.v[0], vOut[1] - Bt.v[1]], dm = hyp(dv[0], dv[1]), nI = dm > 0.2 ? [dv[0] / dm, dv[1] / dm] : dir(h), C = [Bt.p[0] - nI[0] * RX.hitR, Bt.p[1] - nI[1] * RX.hitR, 0];
      if (!tc.decisive) continue;   // (the exit touch is the generic resolver's — the template's choreography is honoured up to and through its decisive contact)
      cs.push({ id: ++this.cid, t: Math.round(tt / DT) * DT, k: Math.round(tt / DT), F: X, surface: tc.surface, role: tc.role, decisive: true, fam: "TECH", tech: id, aim: { kind: "vel", speed: spd, h }, src: "tech", swing: tc.swing ? Object.assign({}, tc.swing, { frame }) : null, frame, C, vHit: [nI[0] * 3, nI[1] * 3, 0], tauC: tauCommit("TECH"), plannedAt: t, planH: q.h, turnDeg: dr }); }
    plan.contacts = keep.contacts.concat(cs); plan.action = { kind: id, tech: id, label: T.label, id: this.plan.action.tech === id && this.plan.action.m === m && !this.contacts.some((c) => c.actionId === this.plan.action.id) ? this.plan.action.id : ++this.aid, m, F, S, h0, tC, tA, vA, vC, sig: sp, turnDeg: dr, k, rot, exitH: q.h, tCommit: tC - cs[0].tauC, tRelease: tC + 0.1, tauC: cs[0].tauC };
    plan.stances = this.gaitFrom(plan, keep, anchors, t + 1.5); if (!this.freeAt(plan, F, tC)) return null; plan.proxy0 = keep.proxy0; if (!this.proxyOK(plan, cs[0], st)) return null;
    const chKeys = {}; for (const kk of ["lean", "side", "trunk", "crouch", "arms", "gait", "look"]) chKeys[kk] = T[kk].map(([x, val]) => [tau(x), (kk === "side" || kk === "trunk") ? m * val : val]); plan.ch = this.channels(plan, chKeys);
    plan.tLine = tC + T.tLine * (0.8 + 0.2 * abs(k)); plan.tRel = tC; plan.aPk = aPk; plan.fam = "INSIDE"; plan.sepMax = 0.6; plan.sepPen = 0; return plan;
  }
  launchScale(T, sig) { return abs(T.turn * T.ref) >= 120 ? clamp(sig, 0.8, 1.1) : clamp(sig, 0.7, 1.5); }
  ballAfterDecisive(Bw, h0, m, T, tC, x, k, sig = 1) { const dc = T.contacts.find((c) => c.decisive), refS = T.turn * T.ref, h = h0 + m * (dc.aim.launch === "exit" ? refS * k : dc.aim.launch * k) * DEG, v = dc.aim.v * this.launchScale(T, sig); return predict(Bw, [v * dcos(h), v * dsin(h)], max(0, x - tC)).p; }
  carryRole(vOut, s) { const a = abs(wrap(hdg(vOut) - (s.s > 0.6 ? s.h : s.psi))) / DEG; return a < 12 ? "carry" : a < 50 ? "carry correction" : "carry turn"; }
  surfaceFor(F, vIn, vOut, s, role) { const dv = [vOut[0] - vIn[0], vOut[1] - vIn[1]], m = hyp(dv[0], dv[1]), th = s.s > 0.6 ? s.h : s.psi; if (role === "stop") return hyp(vOut[0], vOut[1]) < 0.05 ? "SOLE" : "INSIDE";
    if (m < 0.4) return "LACES"; const a = wrap(hdg(dv) - th) / DEG, side = a * sgn(F); if (abs(a) > 125) return "SOLE"; if (abs(a) <= SURF_FWD) return "LACES"; if (side > 0) return "OUTSIDE"; return "INSIDE"; }
  // the new movement line (the report's preregistered definition): heading within 15° of the intent, speed ≥ 40 % of the requested, held 0.1 s
  lineTime(plan, q) { if (q.h == null) return null; const vMin = 0.4 * this.P.speed[q.mode]; let since = null;
    for (let i = 0; i <= plan.n; i += 3) { const t = plan.t0 + i * DT, s = this.stateAt(t, plan); if (s.s >= vMin && abs(wrap(s.h - q.h)) < 15 * DEG) { if (since == null) since = t; if (t - since >= 0.1 - 1e-9) return since; } else since = null; } return null; }
  // ── the HUD's summary of the present (the baseline's fields + the experiment's: the family, the contact's status, the proxies) ────────────────
  hud() { const st = this.stateAt(this.t, this.plan), b = this.ball.p, bv = this.ball.v, a = this.plan.action; const last = this.contacts.filter((c) => !c.interceptor).pop();
    let cps = 0; for (let i = this.contacts.length - 1; i >= 0 && this.contacts[i].t > this.t - 3; i--) if (!this.contacts[i].missed) cps++;
    const nx = this.plan.contacts.find((c) => !c.done && c.t > this.t - 1e-9), feet = {}; for (const X of ["R", "L"]) { const P = this.proxyAt(this.plan, X, this.t); feet[X] = P.planted ? "SUPPORT" : nx && nx.F === X ? (nx.commitT != null ? "COMMITTED" : "APPROACH") : this.contacts.some((c) => c.F === X && !c.missed && c.t > this.t - RX.footRecover) ? "RECOVER" : "FREE"; }
    return { t: this.t, action: a.label, actionKind: a.kind, m: a.m || 0, foot: last ? last.F : "—", surface: last ? last.surface : "—", speed: st.s, ballSpeed: hyp(bv[0], bv[1]), reqH: this.req ? this.req.h : null, mode: this.req ? this.req.mode : "RUN", reqSpeed: this.req && this.req.h != null ? this.P.speed[this.req.mode] : 0,
      facing: st.psi, travel: st.h, turn: this.req && this.req.h != null ? wrap(this.req.h - (st.s > 1 ? st.h : st.psi)) : 0, sep: hyp(b[0] - st.P[0], b[1] - st.P[1]), cps: cps / 3, why: this.plan.why, provisional: this.P.provisional, phase: this.phaseOf(a),
      next: nx ? { F: nx.F, fam: nx.fam, role: nx.role, in: nx.t - this.t, status: nx.commitT != null ? "COMMITTED" : "PROVISIONAL", tauC: nx.tauC } : null, feet, rx: true }; }
  phaseOf(a) { const nx = this.plan.contacts.find((c) => !c.done && c.t > this.t - 1e-9); if (a.kind === "PURSUIT") return "PURSUIT (the ball beyond reach)"; if (!nx) return a.label === "STANDING" ? "STANDING" : "EXIT / CARRY";
    return nx.commitT != null ? "COMMITTED (the proxy's final approach)" : "APPROACH (revisable)"; }
}

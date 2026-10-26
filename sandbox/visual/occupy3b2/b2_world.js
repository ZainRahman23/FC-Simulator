// ═══ occupy3b2/b2_world.js — PLAYER OCCUPANCY STAGE 3B.2: RECOVERY-STEP AND LANDING GEOMETRY ════════════════════════════════════════════════
// canonical footballer → Stage 2 occupancy (unchanged) → STAGE 3B.1 limb contact (FROZEN: the calibrated F+M formulation, tag
// occupancy-3b1-calibrated-fm-1, unchanged) → Stage 3 balance classification (unchanged) → STAGE 3B.2: FEASIBLE PLACEMENT (here) → the ball
// authority (unchanged). 3B.2 decides WHETHER and WHERE a foot can land. It never rewrites an impulse: the contact that caused a recovery, its
// momentum and its ledger are 3B.1's / Stage 3's, exactly.
// ── THE LANDING-FEASIBILITY MODEL. Before a foot commits to the ground, candidate landings around the one wanted are evaluated, nearest first:
//    · the player's own support leg — the landing on its own side of the support foot (Stage 3's no-crossover rule), a foot apart, the two legs
//      not inside each other at the landing; · the opponent's legs (thigh, shin, boot of both) — his PREDICTED legs over the landing's interval
//      (the canonical body posed ahead on his present plan, Stage 1's volumes; the live drawn body now); · the leg's reach (the hip within
//      0.985 × the leg's length of the ankle, the pelvis lowered ≤ 7.5 cm — the canonical support rule) and Stage 3's own reach rules; · the hip's
//      range (flexion −30 … 125°, abduction −30 … 45°) and the knee's (0 … 150°) of the landing leg solved from the hip at the landing; · the
//      foot's yaw (within 50° of the facing); · the ground (the ankle at its height); · the CAPTURE requirement (Stage 3's: the capture point at
//      the landing — a candidate's residual is what it leaves uncaught).
//    The chosen landing is the NEAREST feasible one that still does the recovery's job (residual ≤ 3 cm, Stage 3's own bound) — never one
//    further away for more clearance; if none does the whole job, the feasible one leaving the least (Stage 3's stagger / fall rule then classes
//    it); if no landing is feasible at all: NO_FEASIBLE_RECOVERY — no step is manufactured, the state is preserved (a TRIP_CANDIDATE when the
//    opponent's legs close every way out, else a FALL_CANDIDATE), Stage 3's fall placeholder takes it as before (3B.3 / 3B.4 input).
// ── THE CORRIDOR. A landing is valid only if the foot can travel there: the shin, knee and boot swept from the airborne foot (or its lift-off)
//    to the landing (a lift arc, the knee solved at each sample from the hip then) through neither player's legs. A corridor blocked where its
//    end is clear is first ROUTED: one waypoint beside the obstruction (6 / 10 / 14 cm across the path, away from it) — the swing yields
//    around it instead of through it (the canonical swing's own waypoint mechanism: the landing stance's swingIn).
// ── IN FLIGHT. Each tick every managed landing is re-checked against the newest prediction; obstructed (beyond 3 cm): a route around it, then a
//    shorter / wider / narrower landing within the leg's limits, then a modest retiming (± 30 / 60 ms), then another candidate — never a snap
//    (every change is a new plan version: the canonical body blends the foot there), never the opponent moved, never a foot left hovering (a
//    landing always remains: the least obstructed one, reported).
// ── ORDINARY AND COMMITTED LANDINGS. The same check guards every landing within reach of the opponent: an ordinary gait landing obstructed is
//    moved to its nearest feasible place; a committed action's (Body Feint, Croqueta, Standing Tackle) keeps its authored landing unless that
//    landing is physically obstructed — then the least deviation (≤ 15 cm), recorded AUTHORED TARGET → OBSTRUCTION → ALTERNATIVE PATH →
//    LANDING → RETURN / HANDOFF. A decisive touch already made stays made; the ball is never touched here.
// ── PLANTED FEET ARE ANCHORS. A planted foot is never moved. The body answers through its leg: Stage 3's drawn pelvis kept within the planted
//    legs' reach (the rest is Stage 3's own OVERFLOW — its step or its fall candidate), and a plant the body is about to outrun is RELEASED (its
//    stance ends: the foot lifts off and the gait steps again) instead of being dragged — the planted ball of the foot never slides.
// ── BOOT ↔ BOOT. Two boots (Stage 1's FOOT capsule is ankle → ball; the boot's actual sole is heel → toe tip, 9.5 cm across) meeting in a swing
//    are a limb contact of 3B.1's own kind — the same solve, the same source velocity, the same ledger (frictionless: the moving boot slides /
//    deflects round the other), positional projection apart. At the ball (a contest within 0.30 m of it, a touch or the tackle's window) it is
//    the tackle's contest: reported, not resolved. Two PLANTED boots, or planted legs inside each other: an anchored conflict — reported with
//    its consequence (neither anchor moves; the stance that ends first releases it; held beyond the hard limit it is a 3B.3 input).
import { LimbWorld } from "../occupy3b/l3_world.js";
import { RES3 } from "../occupy3/o3_world.js";
import { PlayBody } from "../vocab2/u_body.js";
import { OCC } from "../occupy1/o_volumes.js";
import * as LM from "../occupy3b/l3_limb.js";
import * as G from "./b2_geom.js";
import { predict as predictBall, R as BALL_R } from "../tc_baseline_88573ef0/pt_ball.js";
const DT = 1 / 240, hyp = Math.hypot, clamp = (x, a, b) => (x < a ? a : x > b ? b : x), SIDES = ["R", "L"], DEG = Math.PI / 180;
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]], mul2 = (a, k) => [a[0] * k, a[1] * k], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1], len2 = (a) => hyp(a[0], a[1]);
const unit2 = (a, d = [1, 0]) => { const m = hyp(a[0], a[1]); return m > 1e-12 ? [a[0] / m, a[1] / m] : d; }, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), r3 = (v) => +v.toFixed(3);
export const RES3B2 = {
  tol: 0.02,              // m: a landing / corridor point deeper than this into a leg is obstructed (Stage 1's contact tolerance)
  hyst: 0.01,             // m: an in-flight landing is re-planned only when obstructed beyond tol + hyst
  sdt: 1 / 48,            // s: the forecast's samples (absolute times, cached per plan version)
  landWin: [-0.04, 0.12], // s: a landing must be clear over this interval about its touchdown (the last approach and the early stance)
  thighWin: 0.02,         // s: … the leg above the foot only to this after the touchdown (then it moves with the body: the bodies' approach is Stage 2 / 3's)
  maxEval: 96, maxEvalRetime: 24,   // the search's bounds (candidates evaluated at the landing's time / per retiming)
  nfGrace: 0.08,          // s: no clear landing for this long before it is NO_FEASIBLE_RECOVERY (a leg caught at a strike's instant comes free in a few ticks)
  every: 3, everyKept: 12, hold: 8,   // ticks: a guarded landing re-checked every 3; one with no feasible alternative re-searched every 12; a re-aimed step held ≥ 8
  corrN: 7, lift: 0.10,   // the corridor's samples; the swing's lift arc (m)
  minWidth: RES3.minWidth, footSep: 0.16,                       // Stage 3's: on its own side by ≥ 8 cm, a foot apart (16 cm)
  shorten: [0.85, 0.7, 0.55, 0.4, 0.25, 0.1, 0], rings: [0.03, 0.06, 0.09, 0.12, 0.16, 0.20, 0.25, 0.30],   // the candidates: the adjustment shortened; rings (m) about the wanted landing
                          // (16 directions to 9 cm, 8 beyond: 96 candidates)
  routeFirst: 12,         // a blocked corridor is routed for the nearest candidates only (a route costs six more corridors)
  route: [0.06, 0.10, 0.14],                                     // m: a route's waypoint across the path
  retime: [0.03, -0.03, 0.06, -0.06],                            // s: a late retiming
  yawMax: 50,             // deg: the landing foot within this of the facing
  ordDev: 0.12, comDev: 0.15,   // m: the largest deviation of an ORDINARY / a COMMITTED landing from where it was planned (beyond: obstructed, reported — a gait
                                // landing moved further is a different stride, not a placement)
  look: 0.40,             // s: landings this soon are guarded
  release: 0.03,          // s: a plant the hip will outrun within this is released now
  twistMax: Infinity,     // deg: … or the body turned this far from the planted foot (a COMPARISON, off by default: measured, it did not remove the twist it was
                          // meant for and moved other cases — that twist is the presentation's own yaw relaxation in stance, reported)
  recovery: true, monitor: true, releasePlant: true, pelvisReach: true, boots: true,   // THE 3B.2 DEFAULT (measured: the configuration that improves on 3B.1)
  // (COMPARISONS, off by default — each measured to make the whole worse (L32_REPORT.md §2): moving an ORDINARY gait landing clear of the opponent (the feet
  // stop meeting first, the bodies then close further and the PLANTED thighs overlap), moving a COMMITTED action's landing (one plant of an authored
  // action moved breaks the rest of it: its later sweeps and touches meet the defender's legs). Both are DETECTED and REPORTED — report*)
  manageOrdinary: false, manageCommitted: false, reportOrdinary: true, reportCommitted: true,
  guardSelf: false,       // (a COMPARISON: the gait's next landing after a recovery step kept on its own side of the recovery foot absolutely — measured: more
                          // crossed legs, not fewer; off)
  interruptBlocked: true, // a committed landing the opponent's leg blocks beyond the hard limit ends the action by Stage 3's rule (after its decisive event): its foot is
                          // then a recovery step, placed by 3B.2 — never driven into the leg, never a reshaped action (measured: legs > 5 cm −55 %, falls −42 %)
  interrupt: false,       // (with manageCommitted, a comparison) a committed action whose landing the opponent's leg blocks (beyond the hard limit, no alternative it can keep) ends by Stage 3's rule
  ordObs: OCC.hard,       // m: an ORDINARY landing is moved clear only beyond this obstruction (its boot / lower shin into his boot / shin)
};
// the canonical body posed AHEAD on a plan (stateless feet: the plan's own, without the presentation timeline's offsets) — the prediction
// (a function of the PLAN alone — so a prediction may be kept while the plan is unchanged: the ball predicted from the plan's own start (not from this tick's
// ball), no input lead (the acknowledgement layer reads the live stick) — the legs as the plan will draw them)
class ForecastBody extends PlayBody { footAt(X, t, depth = 0) { const f = this.footAtRaw(X, t, depth); return depth ? f : this.clearOfBall(f, X, t); }
  ballAt(t) { const S = this.sim, P = S.planAt(t), t0 = Math.min(P.t0, S.t), B = S.ballTrack(t0); if (t <= t0 + 1e-9) return B.p; const f = predictBall(B.p, B.v, t - t0); return [f.p[0], f.p[1], BALL_R]; }
  leadAt() { return 0; } }
export class PlacementWorld extends LimbWorld {
  // o.b2: RES3B2 overrides · o.b2 === false: 3B.2 off (then the world is the calibrated 3B.1, exactly)
  constructor(env, o = {}) { super(env, o); this.B2 = Object.assign({}, RES3B2, o.b2 || {}); this.b2On = this.limbOn && o.b2 !== false;
    this.b2 = { decisions: [], events: [], results: [], dirs: new Map(this.players.map((p) => [p, []])), seenV: new Map(), fc: new Map(), cpu: [], boot: [], bootHeld: new Map(), release: [], pelvis: [], chains: [], nEval: 0, anchors: [] };
    if (!this.b2On) return;
    this.fcB = new Map(this.players.map((p) => [p, new ForecastBody(env, p)]));
    // (after each player's simulation step — Stage 3's recovery step already applied to whatever plan was adopted — the 3B.2 directives: a fresh
    // plan version gets them before any pose of it, so the body's own blend carries the foot to its new landing)
    for (const p of this.players) { const st = p.step.bind(p); p.step = (req) => { const r = st(req); this.applyDirectives(p); return r; }; }
  }
  b2event(p, kind, why, o = {}) { this.b2.events.push(Object.assign({ k: this.k, t: +(this.k * DT).toFixed(4), who: p ? p.pid : "—", kind, why }, o)); }
  step(reqA, reqD) { super.step(reqA, reqD); if (this.b2On) { const c0 = performance.now(); this.placementPass(); this.b2.cpu.push(performance.now() - c0); } }
  limbPass() { super.limbPass(); if (this.b2On && this.B2.boots) this.bootPass(); }
  // ═══ THE PREDICTION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // (THE PLACEMENT'S PARTS: what a foot's placement decides — the boot and the shin's lower half (the knee goes where the body goes: two players'
  // knees and thighs together is the bodies' and the limbs' contact, Stage 2 / 3B.1's) — against the opponent's boots and shins)
  // (the boot is its SOLE — heel → toe tip, 9.5 cm across (the actual boot): Stage 1's FOOT capsule (ankle → ball, 14 cm across) is the foot's
  // occupancy envelope — two players' feet side by side are inside each other's envelopes long before their boots touch)
  lowCaps(caps, withShin) { const out = []; for (const c of caps) { if (c.boot) out.push(c); else if (withShin && /^SHIN_/.test(c.id)) out.push({ id: c.id, a: [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2, (c.a[2] + c.b[2]) / 2], b: c.b, r: c.r }); } return out; }
  oppLow(q, tau) { return this.legsAt(q, tau).filter((z) => z.boot || /^SHIN_/.test(z.id)); }
  oppPenLow(q, T, capsAt) { let best = { pen: -Infinity }; for (const tau of T) { const b = G.anyPen(capsAt(tau), this.oppLow(q, tau)); if (b.pen > best.pen) best = Object.assign(b, { tau }); } return best; }
  // (for the Lab: the opponent's PREDICTED legs at a decision's landing time — thighs, shins, boots — compact)
  fcRec(q, tau) { return this.legsAt(q, tau).map((c) => ({ id: c.id, a: c.a.map(r3), b: c.b.map(r3), r: c.r })); }
  // the opponent's leg volumes at time tau: the live drawn body now; ahead, the canonical body posed on his present plan (cached per plan version)
  legsAt(q, tau) { const t = this.att.t; if (tau <= t + 0.5 * DT || this.B2.fcLive) { const LP = this.livePoses(), J = q === this.att ? LP.a.J : LP.d.J; return [...G.legCapsJ(J, "R"), ...G.legCapsJ(J, "L")]; }
    // (the prediction is rebuilt whenever the plan changed: Stage 2 edits a plan IN PLACE (its root's path, its footholds) — a cache kept by the plan object alone
    // served stale legs, and whichever evaluation came first decided what the later ones saw; the forecast body's own resolved swings dropped with it)
    // (kept while the plan is the same object AND unedited: every Stage 2 / Stage 3 / 3B.2 edit replaces its stance lists (a new object) and every root shift
    // adds to the player's occShift — either invalidates it)
    const cs = q.contacts.length + "/" + q.plan.contacts.reduce((a, c) => a + (c.done ? 1 : 0), 0);   // (and his ball contacts: an executed one replaces the planned one in his swing)
    let C = this.b2.fc.get(q); if (!C || C.plan !== q.plan || C.st !== q.plan.stances || C.sh !== (q.occShift || 0) || C.cs !== cs || (this.B2.fcPerTick && C.k !== this.k)) { this.b2.fc.set(q, (C = { plan: q.plan, st: q.plan.stances, sh: q.occShift || 0, cs, k: this.k, m: new Map() })); this.fcB.get(q).cache.clear(); } const g = Math.round(tau / this.B2.sdt), hit = C.m.get(g); if (hit) return hit;
    const J = this.fcB.get(q).pose(g * this.B2.sdt).J, caps = [...G.legCapsJ(J, "R"), ...G.legCapsJ(J, "L")]; C.m.set(g, caps); if (C.m.size > 120) C.m.delete(C.m.keys().next().value); return caps; }
  // the deepest the capsules C(tau) go into the opponent's legs over the times T
  oppPen(q, T, capsAt, o = {}) { let best = { pen: -Infinity }; for (const tau of T) { const b = G.capsPen(capsAt(tau), this.legsAt(q, tau), o); if (b.pen > best.pen) best = Object.assign(b, { tau }); } return best; }
  // a player's hip X at tau: the drawn hip now, carried with the root (its turn included)
  hipAt(p, X, tau) { const t = this.att.t, LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J, h = J["thigh_" + X].j, s0 = p.stateAt(t), s1 = p.stateAt(Math.max(t, tau)), d = wrap(s1.psi - s0.psi), rel = [h[0] - s0.P[0], h[1] - s0.P[1]], c = Math.cos(d), s = Math.sin(d);
    return [s1.P[0] + rel[0] * c - rel[1] * s, s1.P[1] + rel[0] * s + rel[1] * c, h[2]]; }
  fwdAt(p, tau) { const s = p.stateAt(Math.max(this.att.t, tau)); return [Math.cos(s.psi), Math.sin(s.psi)]; }
  // the predicted leg of p, foot X with its ankle at A (3-D) at tau (the hip lowered for reach as the canonical support rule allows)
  legAt(p, X, A, tau, yaw = null) { const H0 = this.hipAt(p, X, tau), fw = this.fwdAt(p, tau), Lr = G.RIG.reach * G.RIG.legLen, dh = hyp(H0[0] - A[0], H0[1] - A[1]), zMax = A[2] + Math.sqrt(Math.max(0, Lr * Lr - dh * dh)), H = [H0[0], H0[1], Math.max(H0[2] - G.RIG.drop, Math.min(H0[2], zMax))];
    const k = G.kneeOf(H, A, fw), y = yaw == null ? Math.atan2(fw[1], fw[0]) : yaw; return { H, K: k.K, A: k.A, short: k.short, knee: k.knee, caps: G.legCaps(H, k.K, k.A, y, X), fw, dh, drop: H0[2] - H[2] }; }
  // the OTHER foot (Y) at tau: planted — its stance's place; in the air (running's flight, a swing) — between the stance it left and the one it lands
  // on (the swing's line, a lift arc); { p (3-D), planted, yaw }
  otherFootAt(p, X, tau) { const Y = X === "R" ? "L" : "R", L = p.plan.stances[Y], q = L.find((s) => s.t0 <= tau + 1e-9 && s.t1 > tau + 1e-9 && s.pos); if (q) return { p: [q.pos[0], q.pos[1], G.RIG.ankleH], planted: true, yaw: q.yaw, st: q };
    let a = null, b = null; for (const s of L) { if (!s.pos) continue; if (s.t1 <= tau + 1e-9) a = s; else if (s.t0 > tau + 1e-9 && !b) b = s; }
    // (in the air: where it last stood — the place it pushed off from; its route to the next is the canonical swing's own (the presentation's swing
    // corridor keeps it on its own side): a straight line between its stances is not where that leg will be)
    const c = a || b; return c ? { p: [c.pos[0], c.pos[1], G.RIG.ankleH], planted: false, yaw: c.yaw, st: c } : null; }
  // the player's own SUPPORT leg (the other leg) at tau, where its foot is then
  // (only a PLANTED support leg is a body the landing leg can be inside of — a leg in the air at that moment is on its own canonical route)
  supportAt(p, X, tau) { const o = this.otherFootAt(p, X, tau); if (!o || !o.planted) return null; return { st: o.st || null, planted: true, leg: this.legAt(p, X === "R" ? "L" : "R", o.p, tau, o.yaw) }; }
  // a point's side of the body: its lateral offset from the root's path at tau toward foot X's own side (+ = its own side)
  sideOf2(p, X, pos, tau) { const s = p.stateAt(Math.max(this.att.t, tau)), r = [-Math.sin(s.psi), Math.cos(s.psi)]; return dot2(sub2(pos, s.P), r) * (X === "R" ? 1 : -1); }
  // ═══ ONE LANDING, EVALUATED ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // o: { p, X, pos, yaw, tL, start: { p (3-D), t } (the airborne foot now, or its lift-off), base (where the gait would have landed), need (the
  // capture requirement, or null), os (the support foot's place at the landing), rL (the root at the landing), rHip / hipS (Stage 3's reach),
  // job ("RECOVERY" | "ORDINARY" | "COMMITTED") } → { ok, why, pen (landing), cpen (corridor), via, resid, … }
  evalLanding(o, cand) { const B = this.B2, p = o.p, q = this.opp(p), X = o.X, sx = X === "R" ? 1 : -1, tL = cand.tL != null ? cand.tL : o.tL, pos = cand.pos, A = [pos[0], pos[1], G.RIG.ankleH], f = this.fwdAt(p, tL), r = [-f[1], f[0]]; this.b2.nEval++;
    const out = { pos: pos.slice(), tL, ok: false, why: null, pen: null, cpen: null, via: null, resid: o.need ? len2(sub2(o.need, sub2(pos, o.base))) : len2(sub2(pos, o.want || pos)) };
    const fail = (why, extra = {}) => Object.assign(out, { ok: false, why }, extra);
    // (1) the own support leg: its side, a foot apart (Stage 3's rules: the landing no further across than the gait's own, no onto its partner) —
    // the other foot where it is at the landing (planted, or in its swing); and the body's midline: no further across it than the gait's own landing
    // (the other foot: where it stands NOW (if down) and where it will be at the landing (if down then) — its plan can change in between: a landing
    // judged only against the other foot's future place landed across a foot that never left)
    if (!o.osAll) { const Lo = [], Y = X === "R" ? "L" : "R", now = p.plan.stances[Y].find((q) => q.t0 <= this.att.t + 1e-9 && q.t1 > this.att.t + 1e-9 && q.pos), of = this.otherFootAt(p, X, tL);
      if (now) Lo.push(now.pos.slice()); if (o.os) Lo.push(o.os.slice()); if (of && of.planted) Lo.push([of.p[0], of.p[1]]); o.osAll = Lo.filter((q, j) => Lo.findIndex((z) => len2(sub2(z, q)) < 1e-4) === j); }
    { const mB = this.sideOf2(p, X, o.base, tL), mQ = this.sideOf2(p, X, pos, tL); if (mQ < Math.min(mB, 0.02) - 1e-6) return fail("ACROSS THE BODY'S MIDLINE (a crossover)", { mid: r3(mQ), self: true }); }
    // (STRICT — a landing right after a recovery step, or while Stage 3 acts: the gait re-planned from a disturbed support can place its next foot
    // across the recovery foot; the own-side rules then hold absolutely, not merely "no worse than the gait's own")
    for (const os of o.osAll) { const latB = dot2(sub2(o.base, os), r) * sx, latQ = dot2(sub2(pos, os), r) * sx; if (latQ < (o.strictSelf ? B.minWidth : Math.min(latB, B.minWidth)) - 1e-6) return fail("WRONG SIDE OF THE SUPPORT FOOT (a crossover)", { lat: r3(latQ), self: true });
      if (len2(sub2(pos, os)) < B.footSep && (o.strictSelf || len2(sub2(o.base, os)) >= B.footSep)) return fail("ONTO THE SUPPORT FOOT", { sep: r3(len2(sub2(pos, os))), self: true }); }
    // (2) the reach: Stage 3's (from the root at the landing, from the hip), then the leg itself — the hip within reach, the hip's and knee's range
    if (o.rL) { const dB = len2(sub2(o.base, o.rL)), dQ = len2(sub2(pos, o.rL)); if (dQ > Math.max(RES3.reachLand, dB) + 1e-6) return fail("BEYOND THE BODY'S REACH (Stage 3)"); }
    if (o.hipS) { const hB = len2(sub2(o.base, o.hipS)), hQ = len2(sub2(pos, o.hipS)); if (hQ > Math.max(o.rHip, hB) + 1e-6) return fail("BEYOND THE HIP'S REACH (Stage 3)"); }
    // (the leg's own limits — each judged against the gait's / the author's own landing at the same time: a candidate may not be WORSE than it
    // (Stage 3's principle: every limit only shrinks an adjustment); an authored crossover or a wide authored landing is the author's)
    const ref = o.ref || (o.ref = this.anatomy(p, X, [o.base[0], o.base[1], G.RIG.ankleH], tL, o.yaw, f)), an = this.anatomy(p, X, A, tL, cand.yaw != null ? cand.yaw : o.yaw, f), leg = an.leg; out.leg = { H: leg.H, K: leg.K, A: leg.A };
    out.hip = { flex: +an.flex.toFixed(1), abd: +an.abd.toFixed(1), knee: +leg.knee.toFixed(1) };
    if (an.short > Math.max(0.005, ref.short + 0.005)) return fail("THE LEG CANNOT REACH (hip–ankle beyond the leg)", { short: r3(leg.short) });
    if (an.flexEx > ref.flexEx + 1) return fail("HIP FLEXION OUT OF RANGE"); if (an.abdEx > ref.abdEx + 1) return fail("HIP AB/ADDUCTION OUT OF RANGE"); if (an.kneeEx > ref.kneeEx + 1) return fail("KNEE OUT OF RANGE");
    { const yaw = cand.yaw != null ? cand.yaw : o.yaw; if (yaw != null && Math.abs(wrap(yaw - Math.atan2(f[1], f[0]))) > B.yawMax * DEG && !(o.yaw != null && Math.abs(wrap(yaw - o.yaw)) < 1e-6)) return fail("FOOT YAW (beyond the hip's rotation)"); }
    // (3) the opponent's legs over the landing's interval (his predicted legs; the leg's hip carried with the body)
    // (the planted foot over the whole interval; the leg above it — thigh, shin, knee — only about the touchdown itself: after it they go where the
    // BODY goes, and the bodies' approach is Stage 2's occupancy and Stage 3's impact, not a landing's place)
    const T = []; for (let x = tL + B.landWin[0]; x <= tL + B.landWin[1] + 1e-9; x += B.sdt) T.push(x);
    // (what a PLACEMENT controls: the boot, and the shin about the touchdown — against the opponent's legs below his hips (the knee half of the
    // thigh, the shin, the boot). The thighs' upper halves are the BODIES: two players pressed together hip to hip is occupancy, not a landing)
    const LD = this.oppPenLow(q, T, (tau) => this.lowCaps(this.legAt(p, X, tau < tL ? [A[0], A[1], A[2] + 0.03] : A, tau, cand.yaw != null ? cand.yaw : o.yaw).caps, tau <= tL + B.thighWin)); out.pen = r3(LD.pen); out.penOn = LD.B;
    if (LD.pen > B.tol) return fail(`LANDS IN THE OPPONENT'S ${LD.B} (${(LD.pen * 100).toFixed(1)} cm at +${((LD.tau - tL) * 1000).toFixed(0)} ms)`, { opp: true });
    // (4) the own support leg at the landing (the two legs not inside each other — no worse than the gait's own landing)
    const sup = this.supportAt(p, X, tL); if (sup) { const sp = G.capsPen(leg.caps.filter((c) => !c.boot), sup.leg.caps.filter((c) => !c.boot), { lowerA: true, lowerB: true }), sp0 = ref.self != null ? ref.self : (ref.self = G.capsPen(ref.leg.caps.filter((c) => !c.boot), sup.leg.caps.filter((c) => !c.boot), { lowerA: true, lowerB: true }).pen);
      if (sp.pen > (o.strictSelf ? B.tol : Math.max(B.tol, sp0 + 0.005))) return fail(`INSIDE ITS OWN SUPPORT LEG (${(sp.pen * 100).toFixed(1)} cm)`, { self: true }); }
    // (5) THE CORRIDOR: from the airborne foot (or its lift-off) to the landing — through neither player's legs; routed around an obstruction
    const st0 = o.start; if (st0 && tL - st0.t > 0.02) { const pathOf = (via) => G.corridor(st0.p, st0.t, A, tL, via, B.corrN, B.lift);
      const check = (via) => { let worst = { pen: -Infinity }, self = -Infinity; for (const s of pathOf(via)) { const lg = this.legAt(p, X, s.p, s.t), b = G.anyPen(this.lowCaps(lg.caps, true), this.oppLow(q, s.t)); if (b.pen > worst.pen) worst = Object.assign(b, { s });
          const su = this.supportAt(p, X, s.t); if (su) { const sp = G.capsPen(lg.caps.filter((c) => !c.boot && c.id !== "THIGH_" + X), su.leg.caps.filter((c) => !c.boot && c.id !== "THIGH_" + (X === "R" ? "L" : "R"))); self = Math.max(self, sp.pen); } } return { worst, self }; };
      let c = check([]); out.cpen = r3(c.worst.pen); out.path = pathOf([]).map((s) => s.p.map(r3));
      if (c.self > B.tol + 0.02) return fail(`THE SWING CROSSES ITS OWN SUPPORT LEG (${(c.self * 100).toFixed(1)} cm)`, { self: true });
      if (c.worst.pen > B.tol && cand.idx != null && cand.idx >= B.routeFirst) return fail(`THE SWING PASSES THROUGH THE OPPONENT'S ${c.worst.B} (${(c.worst.pen * 100).toFixed(1)} cm) (not routed: far candidate)`, { opp: true, corridor: true });
      if (c.worst.pen > B.tol) { const s = c.worst.s, dir = unit2(sub2(A, st0.p)), m = [-dir[1], dir[0]], away = c.worst.n ? Math.sign(dot2(c.worst.n, m)) || 1 : 1; let routed = null;
        const m0 = this.sideOf2(p, X, s.p, s.t);
        for (const d of B.route) { for (const sg of [away, -away]) { const vp = [s.p[0] + m[0] * d * sg, s.p[1] + m[1] * d * sg]; if (this.sideOf2(p, X, vp, s.t) < Math.min(m0, 0.02) - 1e-6) continue;   // (never routed across its own midline)
            const v = [{ p: [vp[0], vp[1], G.RIG.ankleH + 0.04], t: s.t }], c2 = check(v); if (c2.worst.pen <= B.tol && c2.self <= B.tol + 0.02) { routed = { via: v, pen: c2.worst.pen, d: d * sg }; break; } } if (routed) break; }
        if (!routed) return fail(`THE SWING PASSES THROUGH THE OPPONENT'S ${c.worst.B} (${(c.worst.pen * 100).toFixed(1)} cm), no route round it`, { opp: true, corridor: true });
        out.via = routed.via; out.routed = +routed.d.toFixed(2); out.path = pathOf(routed.via).map((s2) => s2.p.map(r3)); } }
    out.ok = true; return out; }
  // the landing leg's anatomy at A: its shortfall, how far beyond the hip's / knee's range (deg, 0 within)
  anatomy(p, X, A, tL, yaw, f) { const leg = this.legAt(p, X, A, tL, yaw), ha = G.hipAng(leg.H, leg.K, Math.atan2(f[1], f[0]), X), ex = (v, [lo, hi]) => Math.max(0, lo - v, v - hi);
    return { leg, short: leg.short, flex: ha.flex, abd: ha.abd, flexEx: ex(ha.flex, G.ROM.flex), abdEx: ex(ha.abd, G.ROM.abd), kneeEx: ex(leg.knee, G.ROM.knee) }; }
  // the candidates around a wanted landing W (base: the gait's own; adj: W − base) for foot X — nearest to W first
  // (the wanted one; the line back toward the gait's own landing (a shorter adjustment); rings about the wanted one, 16 directions out to 30 cm —
  // shorter, longer, wider, narrower, ahead, behind; nearest first)
  candidates(o, W) { const B = this.B2, f = this.fwdAt(o.p, o.tL), r = [-f[1], f[0]], a = sub2(W, o.base), C = [], seen = new Set(), push = (pos, tag) => { const key = Math.round(pos[0] * 200) + "," + Math.round(pos[1] * 200); if (seen.has(key)) return; seen.add(key); C.push({ pos, tag, d: len2(sub2(pos, W)) }); };
    push(W, "WANTED"); for (const s of B.shorten) push(add2(o.base, mul2(a, s)), "SHORTER " + Math.round((1 - s) * 100) + "%");
    for (const rad of B.rings) { const nd = rad < 0.12 ? 16 : 8; for (let i = 0; i < nd; i++) { const th = i * 2 * Math.PI / nd, af = Math.cos(th) * rad, ar = Math.sin(th) * rad, pos = add2(W, add2(mul2(f, af), mul2(r, ar)));
      push(pos, `${(rad * 100).toFixed(0)} cm ${Math.abs(af) > 0.005 ? (af > 0 ? "AHEAD" : "BEHIND") : ""}${Math.abs(af) > 0.005 && Math.abs(ar) > 0.005 ? "-" : ""}${Math.abs(ar) > 0.005 ? (ar > 0 ? "RIGHT" : "LEFT") : ""}`); } }
    return C.sort((x, y) => x.d - y.d); }
  // the nearest feasible landing that does the job (residual ≤ jobTol), else the feasible one leaving the least; null if none
  // (BOUNDED: nearest first, at most B.maxEval at the landing's own time and B.maxEvalRetime per retiming — the far candidates are the ones the "nearest
  // feasible" rule would take last; measured: an unbounded search in flight reached 818 evaluations in one tick)
  place(o, W, jobTol = 0.03, maxDev = Infinity, retime = false) { const C = this.candidates(o, W), tried = []; let done = null, least = null;
    const T = retime ? [null, ...this.B2.retime.map((d) => o.tL + d)] : [null];
    for (const tl of T) { let n = 0; const cap = tl == null ? this.B2.maxEval : this.B2.maxEvalRetime; for (const c of C) { if (c.d > maxDev + 1e-9) continue; if (++n > cap) break; if (tl != null && tl - this.att.t < this.X.lock) continue; const e = this.evalLanding(o, { pos: c.pos, tL: tl, idx: n - 1 }); e.tag = c.tag + (tl != null ? ` · RETIMED ${tl > o.tL ? "+" : ""}${((tl - o.tL) * 1000).toFixed(0)} ms` : ""); e.dev = r3(len2(sub2(c.pos, W))); tried.push(e);
        if (!e.ok) continue; if (e.resid <= jobTol) { done = e; break; } if (!least || e.resid < least.resid - 1e-6) least = e; }
      if (done) break; }
    return { best: done || least, done: !!done, tried }; }
  // ═══ THE RECOVERY STEP: Stage 3's classification, 3B.2's placement ══════════════════════════════════════════════════════════════════════════
  capture(p, s, t, xi, d, w, held, planted, J3, st, f, r) { const bal = super.capture(p, s, t, xi, d, w, held, planted, J3, st, f, r);
    if (!this.b2On || !this.B2.recovery || held || !(bal.cls === "RECOVERY STEP" || bal.cls === "STAGGER CANDIDATE" || bal.cls === "FALL CANDIDATE") || !bal.step) { if (!bal.pending) s.b2nfSince = null; return bal; }
    // (only when Stage 3 would plan a step now: none pending — the one in flight is the monitor's)
    if (s.step && !(s.step.landed && t - s.step.tLanded > 0.05)) return bal;
    // (a NO_FEASIBLE result stands for 3 ticks before it is searched again — its classification is Stage 3's fall counter's input each tick)
    if (s.b2nfBal && this.k - s.b2nfBal.k < 3) return Object.assign({}, bal, { cls: s.b2nfBal.cls, step: null, why: s.b2nfBal.why, pending: s.b2nfBal.pending, b2: s.b2nfBal.cons });
    // (Stage 3 asks again each tick while it hesitates (an adjustment below its 5 cm step threshold, a class changing): the same wanted landing for the
    // same foot within 1 cm — the last placement stands for 4 ticks (re-classed on Stage 3's numbers now), not a new search each tick)
    const PC = s.b2cap; if (PC && this.k - PC.k < 4 && PC.X === bal.step.X && len2(sub2(PC.want, bal.step.pos)) < 0.01 && PC.best) return this.classOf(PC.best, xi, d, w);
    const c0 = performance.now(), opts = this.footOptions(p, s, t, xi, d, w, held, planted, J3, st, f, r), res = []; let anyOpp = false;
    for (const o of opts) { const pl = this.place(o, o.pos); if (pl.best) res.push({ o, pl }); else anyOpp = anyOpp || pl.tried.some((e) => e.opp); o.tried = pl.tried; }
    const rec = { k: this.k, t, who: p.pid, kind: "RECOVERY", s3: { cls: bal.cls, X: bal.step.X, pos: bal.step.pos.slice(), resid: r3(bal.step.resid) }, opts: opts.map((o) => ({ X: o.X, kind: o.kind, base: o.base.map(r3), want: o.pos.map(r3), need: o.need.map(r3), tL: r3(o.tL), start: o.start ? o.start.p.map(r3) : null, cands: o.tried.slice(0, 48).map((e) => ({ p: e.pos.map(r3), ok: e.ok, why: e.why, tag: e.tag, resid: r3(e.resid), via: e.via ? e.via.map((v) => v.p.map(r3)) : null, path: e.ok ? e.path : null })), n: o.tried.length })), us: 0 };
    let out = bal;
    if (!res.length && opts.locked) { // ── no clear landing for a free foot NOW, but a swinging foot lands within the canonical blend: it is the next
      // support (Stage 3's own rule for a locked swing) — the step after it is judged then; nothing manufactured meanwhile ──
      const why = `3B.2: no clear landing for the free foot now (${opts.map((o) => o.X + ": " + [...new Set(o.tried.map((e) => (e.why || "").replace(/ \(.*$/, "")))].slice(0, 2).join("; ")).join(" · ")}); the foot landing within the blend is the next support`;
      out = Object.assign({}, bal, { cls: "RECOVERY STEP", step: null, pending: true, why }); rec.result = { kind: "WAIT FOR THE LANDING FOOT", why }; s.b2nfBal = { k: this.k, cls: out.cls, why, pending: true, cons: null }; }
    else if (!res.length && (s.b2nfSince == null || t - s.b2nfSince < this.B2.nfGrace)) { // ── no clear landing NOW: the leg may still come free (a
      // limb caught at the instant of a strike yields within a few ticks) — the support holds meanwhile (Stage 3's rule when no foot can step yet);
      // nothing manufactured, nothing declared until the grace has passed ──
      if (s.b2nfSince == null) s.b2nfSince = t; const why = `3B.2: no clear landing yet (${opts.map((o) => o.X + ": " + [...new Set(o.tried.map((e) => (e.why || "").replace(/ \(.*$/, "")))].slice(0, 2).join("; ")).join(" · ")}) — the support holds while the leg may come free (${((t - s.b2nfSince) * 1000).toFixed(0)} of ${(this.B2.nfGrace * 1000).toFixed(0)} ms)`;
      out = Object.assign({}, bal, { cls: "RECOVERY STEP", step: null, pending: true, why }); rec.result = { kind: "NO CLEAR LANDING YET (GRACE)", why }; s.b2nfBal = { k: this.k, cls: out.cls, why, pending: true, cons: null }; }
    else if (!res.length) { // ── NO FEASIBLE RECOVERY: nothing manufactured; the state preserved ──
      const why = `NO_FEASIBLE_RECOVERY: no reachable clear landing for either foot (${opts.map((o) => `${o.X}: ${o.tried.length} candidates — ${[...new Set(o.tried.map((e) => (e.why || "").replace(/ \(.*$/, "")))].slice(0, 3).join("; ")}`).join(" · ")})`;
      const cons = anyOpp ? "TRIP_CANDIDATE" : "FALL_CANDIDATE"; out = Object.assign({}, bal, { cls: "FALL CANDIDATE", step: null, why, b2: cons }); rec.result = { kind: "NO_FEASIBLE_RECOVERY", cons, why };
      if (!s.b2nf || t - s.b2nf > 0.05) this.noFeasible(p, s, t, cons, why, bal, opts); s.b2nf = t; s.b2nfBal = { k: this.k, cls: "FALL CANDIDATE", why, pending: false, cons }; }
    else { // ── the best feasible option (Stage 3's own preference order on the placed options), Stage 3's classes on its residual ──
      const placed = res.map(({ o, pl }) => Object.assign({}, o, { pos: pl.best.pos, adj: sub2(pl.best.pos, o.base), resid: pl.best.resid, useful: len2(sub2(pl.best.pos, o.base)) >= RES3.stepMin, via: pl.best.via, tLand: pl.best.tL, ev: pl.best, done: pl.done, b2: true }));
      placed.sort((a, b) => (b.useful - a.useful) || (Math.abs(a.resid - b.resid) < 0.03 ? a.newer - b.newer : 0) || a.resid - b.resid || len2(a.adj) - len2(b.adj)); const best = placed[0], X3 = this.X, xm = len2(xi), slackNew = 0.065 * X3.slackMove + X3.hipOrd;
      const moved = len2(sub2(best.pos, bal.step.pos)) > 0.005 || best.X !== bal.step.X || !!best.via;
      out = this.classOf(best, xi, d, w); s.b2cap = { k: this.k, X: bal.step.X, want: bal.step.pos.slice(), best };
      s.b2nfBal = null; s.b2nfSince = null; rec.result = { kind: moved ? "PLACED (MOVED)" : "PLACED (AS WANTED)", X: best.X, pos: best.pos.map(r3), tL: r3(best.tLand), resid: r3(best.resid), via: best.via ? best.via.map((v) => v.p.map(r3)) : null, cls: out.cls, from: bal.step.pos.map(r3), fromX: bal.step.X, fromCls: bal.cls }; }
    { const ch = res.length ? res.map(({ o, pl }) => ({ o, pl })).find((z) => out.step && z.o.X === out.step.X) : null, tF = ch ? ch.pl.best.tL : opts.length ? opts[0].tL : null; if (tF != null) { rec.fc = this.fcRec(this.opp(p), tF); rec.fcT = r3(tF); } }
    rec.us = (performance.now() - c0) * 1000; this.b2.decisions.push(rec); return out; }
  // Stage 3's classes on a placed step's residual (its own rule: captured ≤ 3 cm; a second step within reach — stagger; else fall candidate)
  classOf(best, xi, d, w) { const X3 = this.X, xm = len2(xi), slackNew = 0.065 * X3.slackMove + X3.hipOrd;
    if (best.resid <= 0.03) return len2(best.adj) < X3.stepMin ? { cls: "CORRECT", demand: xm / d, d, w, why: `the next landing captures it (its adjustment < ${(X3.stepMin * 100).toFixed(0)} cm)` } : { cls: "RECOVERY STEP", demand: xm / d, d, w, step: best };
    const r2 = best.resid * Math.exp(w * 0.25); return r2 <= X3.stepOut + slackNew ? { cls: "STAGGER CANDIDATE", demand: xm / d, d, w, step: best, why: `one feasible step leaves ${(best.resid * 100).toFixed(0)} cm uncaught (${best.X})` } : { cls: "FALL CANDIDATE", demand: xm / d, d, w, step: best, why: `the capture point runs away: the nearest feasible step leaves ${(best.resid * 100).toFixed(0)} cm` }; }
  // (Stage 3's per-foot options, computed exactly as capture() does — both feet, their base, landing time, the capture need, its reach limits and
  // the wanted place — so 3B.2 can place either foot; the order and the classes stay Stage 3's)
  footOptions(p, s, t, xi, d, w, held, planted, J3, st, f, r) { const X = this.X, xh = unit2(xi, f), opts = [], slackNew = 0.065 * X.slackMove + X.hipOrd;
    const e0 = sub2(xi, mul2(s.u, 1 / w)), q = mul2(xh, d), sup = planted.length ? Math.min(...planted.map(([, qq]) => qq.t1)) : t;
    const lip = (eA, qA, tau) => { if (tau <= 0) return s.u; const sh = Math.sinh(w * tau), chh = Math.cosh(w * tau); return add2(mul2(sub2(eA, qA), w * sh), mul2(s.u, chh)); };
    const uAt = (tL) => (!planted.length ? s.u : lip(e0, q, Math.min(tL, Math.max(t, sup)) - t));
    const pivot = (oth) => { const pq = planted.find(([Y]) => Y === oth); if (!pq) return null; const S = this.stanceLedger(p, oth, pq[1]), eo = add2(add2(sub2(add2(S.push, this.impOnly(S, held)), s.landAdj.get(pq[1].id) || [0, 0]), s.P), s.O), xo = add2(eo, mul2(s.u, 1 / w)), xoh = unit2(xo, xh);
      const fp = this.footPolyOf(J3, oth), a = J3["foot_" + oth].j, tip = J3["toe_" + oth].t, c = [(a[0] + tip[0]) / 2, (a[1] + tip[1]) / 2], so = this.polyReachOf(fp, c, xoh) * X.slackMove + X.hipOrd; return { eo, qo: mul2(xoh, Math.min(len2(xo), so)), pq }; };
    for (const Xf of SIDES) { const oth = Xf === "R" ? "L" : "R", Ls = p.plan.stances[Xf], cur = Ls.find((qq) => qq.t0 <= t + 1e-9 && qq.t1 > t + 1e-9), nx = Ls.find((qq) => qq.t0 > t + 1e-9 && qq.pos), othPl = planted.some(([Y]) => Y === oth);
      let tLand, base, kind, newer = false, start = null;
      if (!cur && nx) { tLand = nx.t0; if (tLand - t < X.lock) { opts.locked = (opts.locked || 0) + 1; continue; } base = nx.pos; kind = "swing re-aimed"; const LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J; start = { p: J["foot_" + Xf].j.slice(), t }; }
      else if (!cur && !nx) { if (!this.mayLift(p, s, t, st)) continue; const a = J3["foot_" + Xf].j; base = add2([a[0], a[1]], mul2(s.u, X.tSwing0)); kind = "free foot placed"; tLand = null; start = { p: a.slice(), t }; }
      else if (cur && othPl) { const oq = planted.find(([Y]) => Y === oth)[1]; if (!this.mayLift(p, s, t, st)) continue; newer = cur.t0 > oq.t0 + 1e-9;
        const S = this.stanceLedger(p, Xf, cur); base = add2(cur.pos, add2(S.push, this.impOnly(S, held))); kind = newer ? "loaded foot lifted (unloads first)" : "planted foot lifted"; tLand = null; }
      else continue;
      const tU = X.tUnload * (newer ? 2 : 1); let tl = tLand != null ? tLand : t + tU + X.tSwing0, need = null; const pv = /foot lifted/.test(kind) ? pivot(oth) : null;
      if (tLand == null) { const r0 = p.stateAt(t).P, r1 = p.stateAt(t + tU + X.tSwing0 + 0.05).P; base = add2(base, sub2(r1, r0)); }
      for (let it = 0; it < 2; it++) { const dz = add2(add2(s.P, s.O), mul2(pv ? lip(pv.eo, pv.qo, tl - t) : uAt(tl), 1 / w)); need = sub2(dz, mul2(unit2(dz, xh), Math.min(len2(dz), slackNew))); if (tLand == null) tl = t + tU + X.tSwing0 + X.tSwing1 * len2(need); }
      if (/foot lifted/.test(kind)) start = { p: [cur.pos[0], cur.pos[1], G.RIG.ankleH], t: t + tU };
      const sx = Xf === "R" ? 1 : -1, oSt = pv ? pv.pq[1] : p.plan.stances[oth].find((qq) => qq.t0 <= tl + 1e-9 && qq.t1 > tl + 1e-9) || (planted.find(([Y]) => Y === oth) || [])[1], os = oSt && oSt.pos ? oSt.pos : null, rL = p.stateAt(tl).P;
      const Hj = J3["thigh_" + Xf].j, hip = add2(rL, [Hj[0] - st.P[0], Hj[1] - st.P[1]]), vH = Math.max(0, Hj[2] - 0.09 - this.R.drop), Lr = this.R.reach * this.legLen, rHip = Math.sqrt(Math.max(0, Lr * Lr - vH * vH));
      let adj = len2(need) > X.stepOut ? mul2(unit2(need), X.stepOut) : need.slice(); const at = (lam) => add2(base, mul2(adj, lam));
      const ok = (qp) => { if (os) { const latB = dot2(sub2(base, os), r) * sx, latQ = dot2(sub2(qp, os), r) * sx; if (latQ < Math.min(latB, X.minWidth) - 1e-6) return false; if (len2(sub2(qp, os)) < 0.16 && len2(sub2(base, os)) >= 0.16) return false; }
        const dB = len2(sub2(base, rL)), dQ = len2(sub2(qp, rL)); if (dQ > Math.max(X.reachLand, dB) + 1e-6) return false; const hB = len2(sub2(base, hip)), hQ = len2(sub2(qp, hip)); if (hQ > Math.max(rHip, hB) + 1e-6) return false; return true; };
      if (!ok(at(1))) { let lo = 0, hi = 1; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (ok(at(m))) lo = m; else hi = m; } adj = mul2(adj, lo); }
      const pos = add2(base, adj), nR = dot2(adj, r) * sx;
      opts.push({ p, X: Xf, tL: tl, tLand: tl, tLift: tLand == null ? (kind === "free foot placed" ? t : t + tU) : null, base, pos, want: pos, need, resid: len2(sub2(need, adj)), kind, newer, yaw: Math.atan2(f[1], f[0]) + sx * 0.12 * (nR > 0 ? 1 : 0), os, rL, hipS: hip, rHip, start, job: "RECOVERY" }); }
    return opts; }
  footPolyOf(J, X) { const a = J["foot_" + X].j, tip = J["toe_" + X] ? J["toe_" + X].t : J["foot_" + X].t, dd = [tip[0] - a[0], tip[1] - a[1]], L = hyp(dd[0], dd[1]) || 1, fw = [dd[0] / L, dd[1] / L], l = [-fw[1], fw[0]], w = 0.0475, heel = [a[0] + fw[0] * -0.0808, a[1] + fw[1] * -0.0808];
    return [[heel[0] - l[0] * w, heel[1] - l[1] * w], [tip[0] - l[0] * w, tip[1] - l[1] * w], [tip[0] + l[0] * w, tip[1] + l[1] * w], [heel[0] + l[0] * w, heel[1] + l[1] * w]]; }
  polyReachOf(poly, p, u) { let best = Infinity, inside = true; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]]; if (e[0] * (p[1] - a[1]) - e[1] * (p[0] - a[0]) < 0) inside = false; } if (!inside) return 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], den = u[0] * e[1] - u[1] * e[0]; if (Math.abs(den) < 1e-12) continue; const w = [a[0] - p[0], a[1] - p[1]], s = (w[0] * e[1] - w[1] * e[0]) / den, rr = (w[0] * u[1] - w[1] * u[0]) / den; if (s >= -1e-12 && rr >= -1e-9 && rr <= 1 + 1e-9) best = Math.min(best, s); }
    return best === Infinity ? 0 : best; }
  // (a step Stage 3 plans itself — the trailing foot's following step — is checked too; infeasible and nothing near feasible: not taken)
  planStep(p, s, t, o, cls) { if (!this.b2On || o.b2 || !this.B2.recovery) { super.planStep(p, s, t, o, cls); if (o.b2 && s.step) { s.step.b2 = { via: o.via || null, ev: o.ev ? { pen: o.ev.pen, cpen: o.ev.cpen } : null, need: o.need, base: o.base.slice(), job: "RECOVERY", os: o.os, rL: o.rL, hipS: o.hipS, rHip: o.rHip, yaw: o.yaw, kind: o.kind }; if (o.via) s.step.plan = null; } return; }
    const oth = o.X === "R" ? "L" : "R", os = (p.plan.stances[oth].find((q) => q.t0 <= o.tLand + 1e-9 && q.t1 > o.tLand + 1e-9) || {}).pos || null, LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J;
    const oo = { p, X: o.X, tL: o.tLand, base: o.base, pos: o.pos, want: o.pos, need: null, os, yaw: o.yaw, start: o.tLift != null ? { p: [o.base[0], o.base[1], G.RIG.ankleH], t: o.tLift } : { p: J["foot_" + o.X].j.slice(), t }, job: "RECOVERY" };
    const pl = this.place(oo, o.pos, 0.0, 0.25); this.b2.decisions.push({ k: this.k, t, who: p.pid, kind: "FOLLOWING STEP", s3: { X: o.X, pos: o.pos.slice() }, opts: [{ X: o.X, kind: o.kind, base: o.base.map(r3), want: o.pos.map(r3), cands: pl.tried.slice(0, 40).map((e) => ({ p: e.pos.map(r3), ok: e.ok, why: e.why, tag: e.tag, via: e.via ? e.via.map((v) => v.p.map(r3)) : null })) }], result: pl.best ? { kind: "PLACED", pos: pl.best.pos.map(r3) } : { kind: "NOT TAKEN (no feasible landing)" } });
    if (!pl.best) { this.b2event(p, "FOLLOWING STEP NOT TAKEN (3B.2)", `the ${o.X} following step has no clear landing within 25 cm (${[...new Set(pl.tried.map((e) => (e.why || "").replace(/ \(.*$/, "")))].slice(0, 3).join("; ")})`); return; }
    super.planStep(p, s, t, Object.assign({}, o, { pos: pl.best.pos, adj: sub2(pl.best.pos, o.base) }), cls); if (s.step) { s.step.b2 = { via: pl.best.via || null, base: o.base.slice(), job: "RECOVERY", os, yaw: o.yaw, kind: o.kind }; if (pl.best.via) s.step.plan = null; } }
  // ── NO_FEASIBLE_RECOVERY: the complete physical state, kept (3B.3 / 3B.4's input) ──
  noFeasible(p, s, t, cons, why, bal, opts) { const q = this.opp(p), LP = this.livePoses(), sp = p.stateAt(t), sq = q.stateAt(t), L = this.legs.get(p), Lq = this.legs.get(q), Jr = (J) => Object.fromEntries(Object.entries(J).filter(([k]) => /thigh|shin|foot|toe|pelvis|spine|chest/.test(k)).map(([k, v]) => [k, { j: v.j.map(r3), t: v.t.map(r3) }]));
    const st = (pl) => ({ R: pl.stances.R.filter((x) => x.t1 > t - 0.3 && x.t0 < t + 0.6).map((x) => ({ id: x.id, t0: r3(x.t0), t1: x.t1 === Infinity ? null : r3(x.t1), pos: x.pos.map(r3), kind: x.kind || "" })), L: pl.stances.L.filter((x) => x.t1 > t - 0.3 && x.t0 < t + 0.6).map((x) => ({ id: x.id, t0: r3(x.t0), t1: x.t1 === Infinity ? null : r3(x.t1), pos: x.pos.map(r3), kind: x.kind || "" })) });
    const snap = { kind: "NO_FEASIBLE_RECOVERY", consequence: cons, why, t: r3(t), k: this.k, who: p.pid,
      player: { root: sp.P.map(r3), V: sp.V.map(r3), psi: r3(sp.psi), u: s.u.map(r3), P: s.P.map(r3), O: s.O.map(r3), cls: bal.cls, demand: r3(bal.demand || 0), osc: Object.fromEntries(Object.entries(s.osc).map(([k, v]) => [k, { x: r3(v.x), v: r3(v.v) }])), committed: this.committed(p, t), stances: st(p.plan), limb: { R: { q: L.R.q.map((v) => +(v / DEG).toFixed(2)), qd: L.R.qd.map(r3) }, L: { q: L.L.q.map((v) => +(v / DEG).toFixed(2)), qd: L.L.qd.map(r3) } }, J: Jr(p === this.att ? LP.a.J : LP.d.J) },
      opponent: { pid: q.pid, root: sq.P.map(r3), V: sq.V.map(r3), psi: r3(sq.psi), committed: this.committed(q, t), stances: st(q.plan), limb: { R: { q: Lq.R.q.map((v) => +(v / DEG).toFixed(2)) }, L: { q: Lq.L.q.map((v) => +(v / DEG).toFixed(2)) } }, J: Jr(q === this.att ? LP.a.J : LP.d.J) },
      options: opts.map((o) => ({ X: o.X, kind: o.kind, base: o.base.map(r3), want: o.pos.map(r3), tL: r3(o.tL), rejected: Object.entries(o.tried.reduce((m, e) => { const k = (e.why || "?").replace(/ \(.*$/, ""); m[k] = (m[k] || 0) + 1; return m; }, {})).map(([k, v]) => `${k} ×${v}`) })) };
    this.b2.results.push(snap); this.b2event(p, cons === "TRIP_CANDIDATE" ? "NO_FEASIBLE_RECOVERY → TRIP_CANDIDATE" : "NO_FEASIBLE_RECOVERY → FALL_CANDIDATE", why); }
  // ═══ THE PLACEMENT PASS (after Stage 3): in-flight landings, guarded landings, the anchors ══════════════════════════════════════════════════
  placementPass() { const t = this.att.t, A = this.att, D = this.def, dist = len2(sub2(A.stateAt(t).P, D.stateAt(t).P)), near = dist <= OCC.broad + 0.4;
    if (this.B2.forkTest) { if (near && this.k % 20 === 0) for (const p of this.players) this.forkPlan(p); return; }   // (a TOOL's check: a fork that changes nothing must change nothing)
    for (const p of this.players) { const s = this.ps.get(p);
      if (near && this.B2.monitor && s.active && s.step && !s.step.landed && !s.step.cancelled) this.monitorStep(p, s, t);
      if (near) this.guardLandings(p, s, t);
      if (this.B2.pelvisReach && s.active && s.fadeFrom == null) this.pelvisWithinReach(p, s, t);
      if (this.B2.releasePlant && (near || s.active)) this.releaseOutrun(p, s, t); }
    // (a directive whose landing has passed is done)
    for (const p of this.players) { const L = this.b2.dirs.get(p); for (let i = L.length - 1; i >= 0; i--) if (L[i].tL < t - 0.05) L.splice(i, 1); } }
  // ── a recovery step in flight: its corridor and landing re-checked against the newest prediction ──
  // (Stage 3's fall placeholder too: a pending step's landing still moves with the root — it is kept clear and on its own side)
  // (never within Stage 3's own lock (0.13 s) of the landing: the canonical body blends a foot to a new landing over 0.12 s — an edit later than that lands
  // unblended, its position / yaw offset relaxing in the stance: the planted foot screwed round, sliding. Measured: the late re-aims did exactly that)
  monitorStep(p, s, t) { const S = s.step, B = this.B2; if (S.tLand - t < this.X.lock) return; const info = S.b2 || {}; if (info.lastCheck != null && this.k - info.lastCheck < 2) return; info.lastCheck = this.k; S.b2 = info;
    // (a step just re-aimed holds its new landing a few ticks — a re-plan per tick would be a flicker, not a decision — unless clearly obstructed)
    const recent = info.reK != null && this.k - info.reK < B.hold;
    const LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J, lifted = S.tLift == null || S.tLift <= t + 1e-9, oth = S.X === "R" ? "L" : "R", os = info.os || (p.plan.stances[oth].find((q) => q.t0 <= S.tLand + 1e-9 && q.t1 > S.tLand + 1e-9) || {}).pos || null;
    const o = { p, X: S.X, tL: S.tLand, base: S.base, pos: S.pos, want: S.pos, need: info.need ? add2(sub2(S.pos, S.base), [0, 0]) : null, os, yaw: S.yaw, start: lifted ? { p: J["foot_" + S.X].j.slice(), t } : { p: [S.base[0], S.base[1], G.RIG.ankleH], t: S.tLift }, job: "RECOVERY" };
    // (the job in flight: the adjustment already chosen — a re-plan keeps as much of it as it can)
    o.need = sub2(S.pos, S.base);
    const cur = this.evalLanding(o, { pos: S.pos, tL: S.tLand });
    // (still clear: the route it needs now (none, or one round the obstruction) — a change only when the route itself changes side or appears)
    if (cur.ok) { const a = cur.via ? Math.sign(cur.routed || 0) : 0, b = info.via ? Math.sign(info.routedSide || 0) : 0; if (a !== b) { info.via = cur.via || null; info.routedSide = cur.routed || 0; this.reaimStep(p, S); this.b2event(p, "RECOVERY STEP ROUTED IN FLIGHT (3B.2)", cur.via ? `${S.X}: round the opponent's leg (${(Math.abs(cur.routed) * 100).toFixed(0)} cm ${cur.routed > 0 ? "right" : "left"})` : `${S.X}: the straight path is clear again`); } return; }
    // (a marginal obstruction — within the hysteresis — keeps the landing: no flicker)
    if ((cur.pen == null || cur.pen <= B.tol + B.hyst) && (cur.cpen == null || cur.cpen <= B.tol + B.hyst) && cur.opp) return;
    if (recent && !(cur.opp && Math.max(cur.pen || 0, cur.cpen || 0) > B.tol + 0.03)) return;
    if (info.keptK != null && this.k - info.keptK < B.everyKept) return;
    const pl = this.place(o, S.pos, 0.03, 0.35, true), rec = { k: this.k, t, who: p.pid, kind: "IN FLIGHT", obstruction: cur.why, X: S.X, from: S.pos.map(r3), tL0: r3(S.tLand), fc: this.fcRec(this.opp(p), S.tLand), fcT: r3(S.tLand), opts: [{ X: S.X, kind: S.kind, base: S.base.map(r3), want: S.pos.map(r3), start: o.start.p.map(r3), cands: pl.tried.slice(0, 40).map((e) => ({ p: e.pos.map(r3), ok: e.ok, why: e.why, tag: e.tag, via: e.via ? e.via.map((v) => v.p.map(r3)) : null, path: e.ok ? e.path : null })) }] };
    if (!pl.best) { info.keptK = this.k; rec.result = { kind: "KEPT (no feasible alternative)" }; if (!info.nf) { this.b2.decisions.push(rec); info.nf = t; this.b2event(p, "LANDING OBSTRUCTED IN FLIGHT — NO FEASIBLE ALTERNATIVE (3B.2)", `${S.X}: ${cur.why}; the landing kept (least obstructed), reported`); } return; }
    info.reK = this.k; info.keptK = null;
    const e = pl.best; rec.result = { kind: e.tL !== S.tLand ? "RETIMED" : e.via && len2(sub2(e.pos, S.pos)) < 0.005 ? "ROUTED" : "RE-AIMED", pos: e.pos.map(r3), tL: r3(e.tL), via: e.via ? e.via.map((v) => v.p.map(r3)) : null }; this.b2.decisions.push(rec);
    S.pos = e.pos.slice(); S.adj = sub2(S.pos, S.base); S.tLand = e.tL; info.via = e.via || null; info.routedSide = e.routed || 0; info.retimed = e.tL !== rec.tL0; this.reaimStep(p, S);
    this.b2event(p, "RECOVERY STEP " + rec.result.kind + " IN FLIGHT (3B.2)", `${S.X}: ${cur.why} → ${e.tag}${e.via ? ` (routed ${e.routed > 0 ? "right" : "left"} ${Math.abs(e.routed * 100).toFixed(0)} cm)` : ""}`); }
  // (a recovery step in flight re-aimed: a fork of the plan with its landing stance at the new place / time and its route — the step's own record
  // updated as Stage 3's applyStep keeps it (its stance id; applied to this plan), the swings not concerned carried)
  reaimStep(p, S) { const F = this.forkPlan(p), Ls = F.stances[S.X], t = p.t, i = Ls.findIndex((q) => (S.id != null && q.id === S.id) || (q.t0 > t + 1e-9 && Math.abs(q.t0 - S.tLand) < 0.08));
    if (i < 0) { S.plan = null; this.applyStep(p, S); return; }   // (its stance not found: Stage 3's own application)
    const via = S.b2 && S.b2.via ? S.b2.via.map((v) => this.viaKey(p, v)) : null, q = Ls[i], L2 = Ls.slice(), ids = [q.id]; L2[i] = Object.assign({}, q, { pos: S.pos.slice(), t0: Math.max(t + DT, S.tLand), swingIn: via ? { via } : q.swingIn, b2via: via });
    if (i > 0 && L2[i - 1].t1 > L2[i].t0) { L2[i - 1] = Object.assign({}, L2[i - 1], { t1: L2[i].t0 }); ids.push(L2[i - 1].id); } S.id = q.id; this.editStances(p, F, S.X, L2, ids); S.plan = F; }
  // ── every other landing within reach of the opponent: the gait's (ordinary) and a committed action's ──
  guardLandings(p, s, t) { const B = this.B2, held = !!(this.committed(p, t) || this.preCommit(p, t)), tq = this.techOf(p), comOn = B.manageCommitted || B.reportCommitted, ordOn = B.manageOrdinary || B.guardSelf || B.reportOrdinary;
    if (!comOn && !ordOn) return; if (s.active && s.fadeFrom != null) return;
    const LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J;
    for (const X of SIDES) { if (s.active && s.step && !s.step.landed && s.step.X === X) continue; const L = p.plan.stances[X], cur = L.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = L.find((q) => q.t0 > t + 1e-9 && q.pos); if (!nx || nx.t0 - t > B.look || nx.t0 - t < 3 * DT) continue;
      if (/recovery step/.test(nx.kind || "")) continue; const dir = this.b2.dirs.get(p).find((d) => d.X === X && Math.abs(d.tL - nx.t0) < 0.08); if (dir && dir.checkedK === this.k) continue;
      // (a landing is guarded once its swing has begun — the foot in the air toward it, or lifting within 50 ms: where a footballer can still place
      // that foot; never earlier — a landing still a stride away is not yet a decision)
      if (cur && cur.t1 > t + 0.05) continue;
      // (each landing re-checked every few ticks; one with no feasible alternative re-searched less often — its record kept once)
      // (the committed and the ordinary checks keep separate schedules: one stance is an ordinary landing before a move commits and a committed one after —
      // a shared schedule let ordinary reporting decide when the committed check ran)
      const gk = (held || (tq && nx.t0 >= tq.tCommit - 0.25 && nx.t0 < tq.tRelease) ? "C" : "O") + X + nx.id, G0 = (s.b2g || (s.b2g = new Map())).get(gk); if (G0 && this.k - G0.k < (G0.kept ? B.everyKept : B.every)) continue;
      const own = held || (tq && nx.t0 >= tq.tCommit - 0.25 && nx.t0 < tq.tRelease); if (own ? !comOn : !ordOn) continue; const oth = X === "R" ? "L" : "R", os = (p.plan.stances[oth].find((q) => q.t0 <= nx.t0 + 1e-9 && q.t1 > nx.t0 + 1e-9) || {}).pos || null;
      const start = cur ? { p: [cur.pos[0], cur.pos[1], G.RIG.ankleH], t: Math.max(t, cur.t1) } : { p: J["foot_" + X].j.slice(), t }, base = dir ? dir.orig : nx.pos.slice();
      const othL = p.plan.stances[oth], othLast = [...othL].reverse().find((q) => q.t0 <= nx.t0 + 1e-9), strictSelf = !own && (s.active || !!(othLast && /recovery step/.test(othLast.kind || "")));
      const o = { p, X, tL: nx.t0, base, pos: nx.pos, want: base, need: null, os, yaw: nx.yaw, start, job: own ? "COMMITTED" : "ORDINARY", strictSelf };
      const cur0 = this.evalLanding(o, { pos: nx.pos }); if (dir) dir.checkedK = this.k; s.b2g.set(gk, { k: this.k, kept: false }); if (s.b2g.size > 64) s.b2g.delete(s.b2g.keys().next().value);
      // (the opponent's legs make 3B.2 move a landing the gait / the author placed; and, right after a recovery step, the player's own legs)
      if (cur0.ok) continue;
      // (REPORT ONLY — the default for a committed action's and an ordinary gait landing: the obstruction recorded, the landing kept; the collision itself is
      // the deviation — 3B.1's limb contact yields the swing, the landing priority lands the foot on its stance, Stage 3's rules take the action)
      if ((own && !B.manageCommitted) || (!own && !B.manageOrdinary && !(B.guardSelf && strictSelf && cur0.self))) { if (cur0.opp && Math.max(cur0.pen || 0, cur0.cpen || 0) > B.tol + B.hyst) this.reportLanding(p, s, t, X, nx, cur0, own, tq, base);
        // (a committed landing the opponent's leg genuinely blocks — beyond the hard limit: the action cannot land as authored. With interruptBlocked, Stage 3's
        // own rule ends it once its decisive event is made (or the landing is imminent and comes first): that foot is then the body's to place — a recovery step,
        // through 3B.2's placement — never driven into the leg, never a reshaped action)
        if (own && B.interruptBlocked && cur0.opp && Math.max(cur0.pen || 0, cur0.cpen || 0) > OCC.hard) this.interruptForLanding(p, s, t, X, nx, cur0.why, gk);
        continue; }
      const oppAct = cur0.opp && (own || B.manageOrdinary), selfAct = strictSelf && cur0.self && B.guardSelf; if (!oppAct && !selfAct && !(dir && dir.applied)) continue;
      const hy = dir && dir.applied ? 0.02 : B.hyst; if (!cur0.ok && cur0.opp && (cur0.pen == null || cur0.pen <= B.tol + hy) && (cur0.cpen == null || cur0.cpen <= B.tol + hy)) continue;
      // (an ORDINARY landing is moved only for an obstruction beyond B.ordObs — the hard limit by default: the boot ON his boot / shin, not beside it)
      if (!own && cur0.opp && !(cur0.self && strictSelf) && Math.max(cur0.pen || 0, cur0.cpen || 0) <= B.ordObs) continue;
      if (dir && (dir.n || 0) >= 2) { if (!dir.capped) { dir.capped = true; this.b2event(p, "LANDING KEPT (3B.2: changed twice already)", `${X}: ${cur0.why}`); } continue; }
      const pl = this.place(o, base, Infinity, own ? B.comDev : B.ordDev, false), e = pl.best && pl.best.ok ? pl.best : null;   // (the nearest feasible: no capture job — the landing's job is the gait's / the author's own)
      if (!e) s.b2g.set(gk, { k: this.k, kept: true });
      const rec = { k: this.k, t, who: p.pid, kind: own ? "COMMITTED LANDING" : "ORDINARY LANDING", obstruction: cur0.why, X, from: nx.pos.map(r3), authored: base.map(r3), tL0: r3(nx.t0), fc: this.fcRec(this.opp(p), nx.t0), fcT: r3(nx.t0), opts: [{ X, kind: nx.kind || "", base: base.map(r3), want: base.map(r3), start: start.p.map(r3), cands: pl.tried.slice(0, 40).map((x) => ({ p: x.pos.map(r3), ok: x.ok, why: x.why, tag: x.tag, via: x.via ? x.via.map((v) => v.p.map(r3)) : null, path: x.ok ? x.path : null })) }] };
      if (!e) { rec.result = { kind: "KEPT (no feasible alternative within " + ((own ? B.comDev : B.ordDev) * 100).toFixed(0) + " cm)" }; const key = "nf" + X + nx.id; if (!s[key]) { s[key] = 1; this.b2.decisions.push(rec); this.b2event(p, (own ? "COMMITTED" : "ORDINARY") + " LANDING OBSTRUCTED — NO FEASIBLE ALTERNATIVE (3B.2)", `${X}: ${cur0.why}`); }
        // (a COMMITTED landing the opponent's leg genuinely blocks — beyond the hard limit, no alternative the action can keep: the action cannot go on
        // as authored. Once its decisive event is made (or the landing comes first and is imminent), Stage 3's own interruption rule ends it: the
        // landing is then the body's to place (an ordinary one, the wider search) — never a foot driven into a leg to keep an animation)
        if (own && B.interrupt && cur0.opp && Math.max(cur0.pen || 0, cur0.cpen || 0) > OCC.hard) this.interruptForLanding(p, s, t, X, nx, cur0.why, gk);
        continue; }
      if (len2(sub2(e.pos, nx.pos)) < 0.005 && JSON.stringify(e.via || null) === JSON.stringify(dir ? dir.via : null)) continue;
      rec.result = { kind: e.via && len2(sub2(e.pos, nx.pos)) < 0.005 ? "ROUTED" : "MOVED", pos: e.pos.map(r3), via: e.via ? e.via.map((v) => v.p.map(r3)) : null, dev: r3(len2(sub2(e.pos, base))) }; this.b2.decisions.push(rec);
      const d = dir || { X, tL: nx.t0, orig: base.slice(), id: nx.id, kind: own ? "COMMITTED" : "ORDINARY", first: t, n: 0 }; d.pos = e.pos.slice(); d.via = e.via || null; d.applied = null; d.why = cur0.why; d.n = (d.n || 0) + 1; if (!dir) this.b2.dirs.get(p).push(d);
      this.forkPlan(p); this.applyDirectives(p, true);
      if (own) this.b2.chains.push({ who: p.pid, t: r3(t), X, action: this.committed(p, t) || (tq ? tq.label : "PLANNED MOVE"), authored: base.map(r3), obstruction: cur0.why, path: e.via ? "ROUTED round it" : "the authored swing", landing: e.pos.map(r3), dev: r3(len2(sub2(e.pos, base))), handoff: "the action continues from the moved landing (its later stances and touches unchanged)" });
      this.b2event(p, (own ? "COMMITTED" : "ORDINARY") + " LANDING MOVED CLEAR (3B.2)", `${X}: ${cur0.why} → ${e.tag} (${(len2(sub2(e.pos, base)) * 100).toFixed(0)} cm from ${own ? "the authored" : "the gait's"} landing)`); } }
  // (REPORT: an obstructed landing kept as authored / as the gait placed it — once per landing; a committed one's chain: AUTHORED TARGET → OBSTRUCTION →
  // the path the collision allows (3B.1's yield) → LANDING (its stance: the landing priority) → RETURN / HANDOFF (the action continues; Stage 3's rules))
  reportLanding(p, s, t, X, nx, cur0, own, tq, base) { const key = "rep" + X + nx.id; if (s[key]) return; s[key] = 1;
    this.b2.decisions.push({ k: this.k, t, who: p.pid, kind: own ? "COMMITTED LANDING" : "ORDINARY LANDING", obstruction: cur0.why, X, from: nx.pos.map(r3), authored: base.map(r3), tL0: r3(nx.t0), fc: this.fcRec(this.opp(p), nx.t0), fcT: r3(nx.t0), opts: [], result: { kind: "REPORTED (kept: " + (own ? "the authored landing" : "the gait's landing") + ")" } });
    this.b2event(p, (own ? "COMMITTED" : "ORDINARY") + " LANDING OBSTRUCTED — KEPT (3B.2 report)", `${X}: ${cur0.why}`);
    if (own) this.b2.chains.push({ who: p.pid, t: r3(t), X, action: this.committed(p, t) || (tq ? tq.label : "PLANNED MOVE"), authored: base.map(r3), obstruction: cur0.why, path: "the authored swing, yielding where it meets the leg (3B.1)", landing: "its authored stance (3B.1's landing priority)", dev: null, handoff: "the action continues as authored; the contact is 3B.1's and Stage 3's" }); }
  // ── a committed action whose landing is blocked: ended through Stage 3's own rule (its kind by its decisive event), the landing re-placed ──
  interruptForLanding(p, s, t, X, nx, why, gk) { if (!s.active || (s.outcome && s.outcome.final)) return false; const cm = this.committed(p, t), pre = !cm && this.preCommit(p, t), mv = this.moveCommitted(p, t), tk = p.tk && p.tk.owns(t) ? p.tk.act : null;
    const made = mv ? !!p.contacts.find((c) => c.actionId === mv.id && c.decisive && !c.missed) : tk ? tk.hits.length > 0 || t >= tk.tW1 - 1e-9 : false, tE = mv ? mv.tC : tk ? tk.t0 + tk.M.tc : null;
    // (the decisive event still ahead of the landing: it is made first — the landing is decided after it)
    if (!made && tE != null && tE < nx.t0 - 1e-9 && nx.t0 - t > 0.08) return false;
    const kind = made ? "TECHNICAL EVENT COMPLETES, RECOVERY REPLACED" : "INTERRUPTED BEFORE TECHNICAL EVENT", wh = `the ${X === "R" ? "right" : "left"} foot's authored landing is blocked by the opponent's leg (3B.2: ${why}) and no landing the action can keep is clear`;
    this.release(p, s, t, mv, tk, pre, kind, wh); s.b2g && s.b2g.delete(gk); this.b2event(p, kind + " — LANDING OBSTRUCTED (3B.2)", wh);
    this.b2.chains.push({ who: p.pid, t: r3(t), X, action: cm || "PLANNED MOVE", authored: nx.pos.map(r3), obstruction: why, path: "—", landing: "re-placed by the body (an ordinary landing, the wider search)", dev: null, handoff: kind + (made ? " (its decisive " + (tk ? "contact" : "touch") + " made)" : "") });
    return true; }
  // ── the directives, on a plan the canonical planner has just adopted (before any pose of it) ──
  applyDirectives(p, forced = false) { if (!this.b2On) return; const P = p.plan, fresh = forced || this.b2.seenV.get(p) !== P.v; this.b2.seenV.set(p, P.v); const t = p.t, L = this.b2.dirs.get(p), s = this.ps.get(p);
    // (the recovery step's route: on the landing stance Stage 3's applyStep just placed)
    if (s && s.step && !s.step.landed && s.step.b2 && s.step.plan === P) { const S = s.step, Ls = P.stances[S.X], i = Ls.findIndex((q) => (S.id != null && q.id === S.id) || (q.t0 > t + 1e-9 && Math.abs(q.t0 - S.tLand) < 0.02));
      if (i >= 0) { const via = S.b2.via ? S.b2.via.map((v) => this.viaKey(p, v)) : null, cur = Ls[i];
        if (JSON.stringify(cur.b2via || null) !== JSON.stringify(via) || Math.abs(cur.t0 - S.tLand) > 1e-6) { const L2 = Ls.slice(), ids = [cur.id]; L2[i] = Object.assign({}, cur, { t0: Math.max(t + DT, S.tLand), swingIn: via ? { via } : cur.swingIn, b2via: via }); if (i > 0 && L2[i - 1].t1 > L2[i].t0) { L2[i - 1] = Object.assign({}, L2[i - 1], { t1: L2[i].t0 }); ids.push(L2[i - 1].id); } this.editStances(p, P, S.X, L2, ids); } } }
    if (!L.length) return;
    for (const d of L) { if (d.applied === P) continue; if (!fresh && d.applied !== undefined && d.waitK != null && this.k - d.waitK < 2) continue;
      const Ls = P.stances[d.X], i = Ls.findIndex((q) => q.t0 > t + 1e-9 && q.pos && Math.abs(q.t0 - d.tL) < 0.08); if (i < 0) { d.applied = P; continue; }
      if (!fresh) { d.waitK = d.waitK == null ? this.k : d.waitK; if (this.k - d.waitK < 2) continue; }   // (no fresh plan within 2 ticks: applied in place — the foot's speed limit carries it)
      const q = Ls[i], via = d.via ? d.via.map((v) => this.viaKey(p, v)) : null; if (len2(sub2(q.pos, d.pos)) < 1e-4 && JSON.stringify(q.b2via || null) === JSON.stringify(via)) { d.applied = P; continue; }
      const L2 = Ls.slice(); L2[i] = Object.assign({}, q, { pos: d.pos.slice(), swingIn: via ? { via } : q.swingIn, b2via: via, kind: (q.kind || "").replace(/ · 3B\.2.*$/, "") + " · 3B.2 " + (d.kind === "COMMITTED" ? "moved clear" : "landing moved") }); this.editStances(p, P, d.X, L2, [q.id]); d.applied = P; d.inPlace = !fresh; d.waitK = null; } }
  // THE PLAN FORK: 3B.2's edit as a NEW VERSION of the plan the player is running — the same action, path, touches and channels (shared), its stances
  // copied — adopted as the canonical planner adopts its own: the presentation sees a new plan version and blends the foot there (no snap), and
  // nothing the canonical planner decided is re-decided (a re-plan would re-choose the whole action for a landing's few centimetres)
  forkPlan(p) { const P = p.plan, C = Object.assign(Object.create(Object.getPrototypeOf(P)), P); C.stances = { R: P.stances.R.slice(), L: P.stances.L.slice() }; C.fork = (P.fork || 0) + 1; C.forkOf = P.v;
    // (the base PlaySim.adopt — the deepest in the chain; CONTROLLED's own defers only inside its re-plan)
    let base = null; for (let o = Object.getPrototypeOf(p); o; o = Object.getPrototypeOf(o)) if (Object.prototype.hasOwnProperty.call(o, "adopt")) base = o;
    base.adopt.call(p, C); this.b2.seenV.set(p, C.v); this.b2.forks = (this.b2.forks || 0) + 1;
    // (THE SWINGS CARRIED — every body's resolved context of the plan (its stances, its swings, built once from what was known then) handed to the
    // fork: rebuilt, a swing in flight reads the present and is another path (Stage 2's lesson: the swing in flight is carried, never rebuilt))
    for (const B of this.bodiesOf(p)) { const ctx = B.cache.get(P); if (!ctx) continue; B.cache.set(C, { plan: C, st: { R: ctx.st.R.slice(), L: ctx.st.L.slice() }, sw: new Map(ctx.sw) }); }
    // (Stage 3's recovery step already applied to the plan forked is applied to the fork: the same stances — Stage 3 would re-apply it, its own
    // application dropping every swing)
    const s = this.ps.get(p); if (s && s.step && s.step.plan === P) s.step.plan = C;
    return C; }
  bodiesOf(p) { const out = []; for (const M of [this.bodies, this.gateB, this.ahead, this.refB, this.fcB]) { const B = M && M.get(p); if (B && B.cache) out.push(B); } return out; }
  // a plan's stance list of foot X replaced: every body's context of that plan updated in place — its stances re-resolved, only the swings into or out
  // of a changed stance dropped (rebuilt to the new place); the others carried
  editStances(p, P, X, list, changedIds) { P.stances = Object.assign({}, P.stances, { [X]: list }); const ch = new Set(changedIds);
    for (const B of this.bodiesOf(p)) { const ctx = B.cache.get(P); if (!ctx) continue; ctx.st[X] = list.map((q) => B.stanceOf(q)).sort((a, b) => a.t0 - b.t0); for (const [k, w] of [...ctx.sw]) if (ch.has(w.from.id) || ch.has(w.to.id)) ctx.sw.delete(k); } }
  // a route's waypoint as the canonical swing's own (in the pelvis frame at its time: [ahead, right, height])
  viaKey(p, v) { const s = p.stateAt(v.t), f = [Math.cos(s.psi), Math.sin(s.psi)], r = [-f[1], f[0]], d = sub2(v.p, s.P); return { t: +v.t.toFixed(5), rel: "pelvis", at: [+dot2(d, f).toFixed(4), +dot2(d, r).toFixed(4), +v.p[2].toFixed(4)] }; }
  // ── PLANTED ANCHORS: Stage 3's drawn pelvis within the planted legs' reach (the rest its overflow) ──
  pelvisWithinReach(p, s, t) { const planted = this.plantedStances(p, t); if (!planted.length || !(s.P[0] || s.P[1])) return; const LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J, drawn = s.pose && s.pose.pelvis ? s.pose.pelvis : [0, 0];
    const r0 = p.stateAt(t).P, r1 = p.stateAt(t + DT).P, Lr = G.RIG.reach * G.RIG.legLen; let lam = 1;
    for (const [X, q] of planted) { const h = J["thigh_" + X].j, canon = [h[0] - drawn[0] - r0[0], h[1] - drawn[1] - r0[1]], an = [q.pos[0], q.pos[1]], vz = Math.max(0, h[2] - G.RIG.drop - G.RIG.ankleH), rH = Math.sqrt(Math.max(0, Lr * Lr - vz * vz));
      const base = add2(r1, canon), at = (k) => len2(sub2(add2(base, mul2(s.P, k)), an)); if (at(1) <= Math.max(rH, at(0)) + 1e-6) continue; let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (at(m) <= Math.max(rH, at(0)) + 1e-6) lo = m; else hi = m; } lam = Math.min(lam, lo); }
    if (lam >= 1 - 1e-9) return; const over = mul2(s.P, 1 - lam); s.P = mul2(s.P, lam); s.O = add2(s.O, over); if (s.pose) s.pose.pelvis = s.P.slice(); this.b2.pelvis.push({ k: this.k, who: p.pid, d: r3(len2(over)) });
    if (len2(over) > 0.005) this.b2event(p, "PELVIS HELD WITHIN THE PLANTED LEG'S REACH (3B.2)", `${(len2(over) * 100).toFixed(1)} cm of Stage 3's pelvis displacement is beyond the planted leg: Stage 3's overflow (its step / fall candidate) instead`); }
  // ── PLANTED ANCHORS: a plant the hip is about to outrun is released (its stance ends now: toe-off), never dragged ──
  releaseOutrun(p, s, t) { if (this.committed(p, t) || this.preCommit(p, t)) return; const B = this.B2, LP = this.livePoses(), J = p === this.att ? LP.a.J : LP.d.J, Lr = G.RIG.reach * G.RIG.legLen, P = p.plan;
    const pose = p === this.att ? LP.a : LP.d;
    for (const X of SIDES) { const Ls = P.stances[X], i = Ls.findIndex((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9); if (i < 0) continue; const q = Ls[i]; if (q.t1 <= t + B.release + 1e-9 || t - q.t0 < 0.04) continue;
      // (only where the interaction made the plan: Stage 3 acting on him, a recovery step's stance, a landing 3B.2 moved — the canonical gait's own
      // stances, and their own toe-offs, are the canonical body's)
      if (!(s.active || /recovery step|3B\.2/.test(q.kind || ""))) continue;
      // (the leg's reach to its drawn target ankle — the heel's rise included: a toe-off reaches further than a flat foot)
      const h = J["thigh_" + X].j, tg = pose.feet && pose.feet[X] ? pose.feet[X].ank : [q.pos[0], q.pos[1], G.RIG.ankleH], hip = this.hipAt(p, X, t + B.release), Lt = (G.RIG.thigh + G.RIG.shank) * G.RIG.reach;
      const d = hyp(hip[0] - tg[0], hip[1] - tg[1], Math.max(0, hip[2] - G.RIG.drop - tg[2])), d0 = hyp(h[0] - tg[0], h[1] - tg[1], Math.max(0, h[2] - G.RIG.drop - tg[2])), rH = Lt;
      // (… or TWISTED: the body turning over the planted foot beyond the leg's rotation (65° between the facing and the foot) — held, the foot would
      // be screwed round its ball and its drawn boot swing about the ankle; a footballer unloads and re-places it)
      const tw = Math.abs(wrap(p.stateAt(t + B.release).psi - (q.yaw != null ? q.yaw : p.stateAt(q.t0).psi))), twist = tw > B.twistMax * DEG && tw > Math.abs(wrap(p.stateAt(t).psi - (q.yaw != null ? q.yaw : 0))) - 1e-9;
      if (!twist) { if (d <= rH || d <= d0) continue;   // (within reach — or the hip coming back over the foot)
        // (… and only a real drag: where the stance would end (≤ 80 ms ahead) the hip beyond the leg by more than 1.5 cm — a stance ending at its reach is the
        // gait's own toe-off)
        const te = Math.min(q.t1, t + 0.08), he = this.hipAt(p, X, te), de = hyp(he[0] - tg[0], he[1] - tg[1], Math.max(0, he[2] - G.RIG.drop - tg[2])); if (de <= rH + 0.015) continue; }
      // (the other foot must be able to take the body: it is down, or lands within 0.12 s)
      const Y = X === "R" ? "L" : "R", oy = P.stances[Y], ok = oy.some((z) => z.t0 <= t + 0.12 + 1e-9 && z.t1 > t + 1e-9); if (!ok) { const key = "noRel" + X + q.id; if (!s[key]) { s[key] = 1; this.b2event(p, "PLANT OUTRUN, NO SUPPORT TO RELEASE TO (3B.3 input)", `${X}: the hip leaves the planted foot's reach in ${(B.release * 1000).toFixed(0)} ms and the other foot is not down`); } continue; }
      const hasNext = Ls.some((z) => z.t0 > t + 1e-9 && z.pos), F = this.forkPlan(p), L2 = F.stances[X].slice(); L2[i] = Object.assign({}, q, { t1: t + 2 * DT, released: t, kind: (q.kind || "") + " · released (3B.2)" }); this.editStances(p, F, X, L2, [q.id]);
      if (!hasNext) p.flags.replan = p.flags.replan || "3B.2: plant released (its next landing)";
      this.b2.release.push({ k: this.k, t: r3(t), who: p.pid, X, id: q.id, pos: q.pos.map(r3), was: q.t1 === Infinity ? null : r3(q.t1), d: r3(d), rH: r3(rH), twist: +(tw / DEG).toFixed(0), why: twist ? "TWIST" : "REACH" });
      this.b2event(p, "PLANT RELEASED (3B.2)", twist ? `${X}: the body has turned ${(tw / DEG).toFixed(0)}° from the planted foot (beyond the leg's ${B.twistMax}°) before its stance ends (${q.t1 === Infinity ? "∞" : "+" + ((q.t1 - t) * 1000).toFixed(0) + " ms"}): it lifts off now, not screwed round` : `${X}: the hip would leave the planted foot's reach (${(d * 100).toFixed(0)} cm > ${(rH * 100).toFixed(0)} cm) before its stance ends (${q.t1 === Infinity ? "∞" : "+" + ((q.t1 - t) * 1000).toFixed(0) + " ms"}): it lifts off now, not dragged`); } }
  // ═══ BOOT ↔ BOOT ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  bootPass() { const t = this.att.t, k = this.k, A = this.att, D = this.def, sa = A.stateAt(t), sd = D.stateAt(t); if (len2(sub2(sa.P, sd.P)) > OCC.broad) return;
    const LP = this.livePoses(), LA = this.legs.get(A), LD = this.legs.get(D), X3 = this.L3, ball = this.ball.p, C = [];
    for (const XA of SIDES) for (const XB of SIDES) { const ca = G.legCapsJ(LP.a.J, XA).find((c) => c.boot), cb = G.legCapsJ(LP.d.J, XB).find((c) => c.boot), b = G.capsPen([ca], [cb], { boots: true }), hk = "BOOT_" + XA + "|BOOT_" + XB, held = this.b2.bootHeld.get(hk);
      if (!(b.pen > X3.tol) && !(held && b.pen > X3.tol - X3.hyst)) { if (held) this.b2.bootHeld.delete(hk); continue; }
      const plA = LA[XA].planted, plB = LD[XB].planted, dBall = hyp(b.at[0] - ball[0], b.at[1] - ball[1]), contest = dBall < 0.30 && (this.touchNear(A, XA, t) || this.touchNear(D, XB, t) || (this.tk && this.tk.act && t >= this.tk.act.tW0 - 0.05 && t <= this.tk.act.tW1 + 0.05));
      // (a boot inside its landing window lands where its stance is — 3B.1's landing priority: 3B.2's placement has already chosen that landing;
      // the contact is recorded as an obstructed landing, not resolved — resolving it would leave a perturbation for the landing to snap)
      const landing = (!plA && LA[XA].tLand - t < X3.landForce) || (!plB && LD[XB].tLand - t < X3.landForce);
      const kind = contest ? "BALL CONTEST" : plA && plB ? "PLANTED ↔ PLANTED" : landing ? "LANDING" : "SWING"; this.b2.boot.push({ k, t: r3(t), pair: hk, pen: r3(b.pen), kind, plA, plB, dBall: r3(dBall) });
      if (kind !== "SWING") continue;
      const n2 = b.n || unit2(sub2(sa.P, sd.P)), n = [n2[0], n2[1], 0], uA = 0.5, uB = 0.5;   // (the boot's contact point moves with its ankle: 3B.1's FOOT segment)
      const sA = this.sideOf(A, LA, "FOOT_" + XA, uA, b.at, n, LP.a.J, sa), sB = this.sideOf(D, LD, "FOOT_" + XB, uB, b.at, LM.mul(n, -1), LP.d.J, sd); if (!sA || !sB) continue;
      C.push({ key: hk, hkey: hk, n, pen: b.pen, A: sA, B: sB, x: { at: b.at }, held: !!held, uA, uB, region: "BOOT / BOOT" }); this.b2.bootHeld.set(hk, { k }); }
    if (!C.length) return;
    // (3B.1's own solve, ledger and checks — the frozen formulation, a wider contact set)
    const sol = LM.solveContacts(C, X3), T3 = this.tk3, EXT = this.ext || { k, A: [], D: [], any: false, why: null };
    for (const bI of sol.body) { const J2 = [bI.J[0], bI.J[1]]; if (!(hyp(J2[0], J2[1]) > 1e-15)) continue; (bI.who === "ATT" ? EXT.A : EXT.D).push({ J: J2, at: bI.at.slice(), src: bI.src + " (BOOT)" }); EXT.any = true; T3[bI.who].EXT3B = add2(T3[bI.who].EXT3B, J2); }
    for (const ap of sol.apps) { this.l3.check.n++; this.l3.check.bound = Math.max(this.l3.check.bound, ap.lam - ap.src); this.l3.check.energy = Math.max(this.l3.check.energy, ap.keAfter - ap.keBefore); this.l3.check.pair = Math.max(this.l3.check.pair, LM.len(LM.add(ap.JA, ap.JB)));
      const c = C.find((z) => z.key === ap.key); this.l3.apps.push({ k, key: ap.key, region: "BOOT / BOOT", vn: ap.vn, lam: ap.lam, src: ap.src, wA: ap.wA, wB: ap.wB, routeA: ap.routeA, routeB: ap.routeB, n: ap.n, at: c.x.at, keB: ap.keBefore, keA: ap.keAfter, dvnA: ap.dvnA, dvnB: ap.dvnB, vnAfter: ap.vnAfter, vA: c.A.vBase, vB: c.B.vBase, kindA: c.A.kind, kindB: c.B.kind, held: c.held, idA: c.A.id, idB: c.B.id, uA: c.uA, uB: c.uB, JA: ap.JA, JB: ap.JB, boot: true });
      if (!EXT.why && ap.lam > 0) { EXT.why = `BOOT CONTACT (3B.2) closing ${(-ap.vn).toFixed(2)} m/s: ${ap.lam.toFixed(2)} N·s`; this.l3.contacts++; } }
    this.ext = EXT.any ? EXT : this.ext;
    // (the swinging boot projected out of the other beyond the tolerance: positions only, its leg's own limits)
    for (const c of C) { const over = c.pen - X3.tol; if (!(over > 0)) continue; for (const [sd2, sg] of [[c.A, 1], [c.B, -1]]) { if (sd2.kind !== "LIMB" || sd2.leg.planted) continue; const dist = LM.project(sd2.leg, sd2.seg, sd2.x, LM.mul(c.n, sg), Math.min(over, X3.posCap), X3); LM.clampRange(sd2.leg, X3); this.b2.boot[this.b2.boot.length - 1].proj = r3(dist); } } }
  touchNear(p, X, t) { return p.plan.contacts.some((c) => c.F === X && Math.abs(c.t - t) < 0.12) || p.contacts.some((c) => c.F === X && Math.abs(c.t - t) < 0.12); }
}

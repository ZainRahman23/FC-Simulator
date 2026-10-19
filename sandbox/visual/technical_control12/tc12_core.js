// ═══ technical_control12/tc12_core.js — TECHNICAL-CONTROL-1.2: THE CARRY MODEL (owner's correction: no more left-right inside-foot ping-pong) ═══════
// Why TECHNICAL-CONTROL-1 looked like a player kicking the ball from one boot to the other: (1) each carry touch aimed the ball at a point on the
// NEXT touching foot's side (±0.10 m), (2) the rhythm took nearly every footfall and the feet alternated, so every touch had to send the ball
// across the body's centre line, (3) an inward impulse is the inside's, and the inside was the cheapest surface. Normal dribbling is not that.
// THE CARRY MODEL (owner §1 – §20):
//   · a BALL LANE relative to the body: a dominant-foot carrier keeps the ball slightly ahead and on the preferred side (0.15 m off the centre
//     line, outside the preferred foot's own line); a two-footed player keeps it on whichever side it is, each foot its own lane (0.10 m)
//   · FOOT CHOICE FOLLOWS THE LANE: the foot whose lane the ball is in is the natural next foot — the same foot repeatedly (L → L → L) is normal;
//     a touch that takes the ball across the centre line costs, unless the intent asks for that side (the inside across the body)
//   · RUNNING STEPS BETWEEN TOUCHES: the steps between two touches are contextual (speed, space, turn, Dribbling's cadence, style): tight / turning
//     → a touch every one or two footfalls, a moderate carry → one or three running steps between touches with the same foot, an open sprint →
//     fewer, longer touches. High Dribbling CAN touch rapidly; it does not have to
//   · SURFACES BY FUNCTION: outside / outer instep — the forward carry, slight outward redirection, accelerating, the preferred foot's repeated
//     touches, small direction changes; inside — inward correction, across the body, larger lateral redirection, setting up the other side;
//     instep (laces) — a straighter, larger push at speed; sole — stop, drag, pull (the actions)
//   · SMALL CONTACTS: a carry touch rolls the ball to the next contact point in its lane at about the body's speed — a push, not a pass
// Everything else is TECHNICAL-CONTROL-1's: the receive, the gait, the actions (the vocabulary, its selection), Ball Control's precision, the
// closed loop, the chase. Attribute responsibilities unchanged: Ball Control → precision, Dribbling → cadence / coordination / vocabulary,
// Agility → the body's reorientation. Every touch: the selected action → the authoritative contact → the authoritative ball → the body explains it.
import { TechSim, TechEpisode, TC, DT } from "../technical_control1/tc_core.js";
import { STYLES, styleOf } from "../technical_control1/tc_attrs.js";
import { RX } from "../receive_elite1/re1_core.js";
import { SURF as SURF11, wrapA, clamp, tab, hdg, sideOf, other } from "../receive11/rx_actions.js";
import { VOCAB, FAMILY_ORDER, SEL, footFor, bodyFor } from "../technical_control1/tc_actions.js";
import { entrySpeed } from "../technical_control1/tc_motion.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
import { rollK } from "../receive_control2/rc2_episode.js";
export { DT };
const R = 0.11, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, DEG = Math.PI / 180, lerp = (a, b, t) => a + (b - a) * t, r3 = (x) => Math.round(x * 1000) / 1000;
// the dominant-foot close-control carrier (owner §4): the preferred foot repeatedly, the ball on its side, outside / outer-instep contacts, small
// frequent touches — added to TECHNICAL-CONTROL-1's style profiles (a choice layer, never an attribute modifier)
if (!STYLES.DOMINANT_CLOSE) STYLES.DOMINANT_CLOSE = { label: "dominant-foot close-control carrier", foot: 0.95, surface: { inside: 0.9, outside: 1.45, sole: 1.1 }, rhythm: 0.8, technical: 0.55, feint: 0.3, direct: 0.45 };
export const CM = {
  version: "TECHNICAL-CONTROL-1.2",
  lane: { dom: 0.15, weak: 0.10, two: 0.10 },             // m: the ball's lane off the body's centre line (the preferred foot's side for a dominant-foot carrier)
  domFoot: 0.7,                                            // a style leaning on its foot at least this much is a dominant-foot carrier
  // footfalls from one touch to the next (1: every step, alternating feet; 2: the same foot with one running step between; 3: the other foot after
  // two; 4: the same foot after three — the running-step sequences between touches), by speed: close control … a stride carry
  want: { close: [[0, 1], [2.5, 2], [5.5, 2], [7, 2.5], [8.5, 3]], stride: [[0, 2], [2.5, 2], [4.5, 3], [5.5, 4], [7, 4.5], [8.5, 6]] },
  wStep: 0.7,                                              // the cost of each footfall away from the wanted rhythm
  cross: { dom: 1.5, pref: 1.1, two: 0.9 },               // the cost of a touch that takes the ball across the centre line (the intent toward that side lowers it):
                                                           // a dominant-foot carrier · a player with a preferred foot · a two-footed player
  weak: 2.2,                                               // × the style's foot bias: a weak-foot touch for a dominant-foot carrier
  turnSteps: 1,                                            // footfalls fewer when the intent turns (≥ 10°) or the space is contested
  // THE ACTIONS on the lane (fundamentals first, owner §15 – §17): an action whose first foot is not the ball's lane foot pays for it (the ball
  // is not there); the sophisticated families pay a little more simplicity than in TECHNICAL-CONTROL-1, and the double touch is no longer the
  // tight sequence's default (TECHNICAL-CONTROL-1's −0.7 for an opposite turn just before)
  sel: { laneFoot: 0.8, simple: 1.2, doubleSeq: 0 },
};
export class CarryEpisode extends TechEpisode {
  // the dominant foot (null: two-footed, or a style that does not lean on it)
  domFoot() { return this.pref && this.style.foot >= CM.domFoot ? this.pref : null; }
  // THE LANE of a touch by foot F: its lateral offset (+ = the right side, as sideOf)
  laneLat(F) { const D = this.domFoot(); if (D) return F === D ? sideOf(D) * CM.lane.dom : sideOf(F) * CM.lane.weak; return sideOf(F) * (this.pref ? CM.lane.weak : CM.lane.two); }
  contactPoint(t, F, role) { const P = this.rootAt(t), V = this.velAt(t), v = hyp(V[0], V[1]), psi = this.psiAt(t), a = this.el.dri.spacing * min(TC.ahead[2], TC.ahead[0] + TC.ahead[1] * v), l = this.laneLat(F);
    return [P[0] + a * dcos(psi) - l * dsin(psi), P[1] + a * dsin(psi) + l * dcos(psi)]; }
  // the ball's lateral offset from the body's centre line at time t (+ = right)
  latOf(B, t) { const P = this.rootAt(t), psi = this.psiAt(t); return -(B[0] - P[0]) * dsin(psi) + (B[1] - P[1]) * dcos(psi); }
  // (the ball at the contact being planned: the lane it is in now)
  plan(c, B, vB, commit) { this._B = B; return super.plan(c, B, vB, commit); }
  // THE NEXT CARRY CONTACT: the foot of the ball's lane, the rhythm the context wants, the preferred foot for a dominant-foot carrier
  carryNext(c, ac) {
    const t = c.t, v = this.speedBase(t), st = this.style, I = this.wantNow(t), V = this.velAt(t), hB = hyp(V[0], V[1]) > 0.8 ? hdg(V) : this.psiAt(t), dS = wrapA(I.theta - hB);
    const open = (I.contest || 0) < 0.3 && abs(dS) < 12 * DEG && this.carryFrom != null && t - this.carryFrom > 0.4, turning = abs(dS) >= 10 * DEG || (I.contest || 0) >= 0.3;
    const r = clamp(st.rhythm - (open ? 0.35 * st.direct : -0.15), 0, 1), want = max(1, Math.round(lerp(tab(CM.want.stride, v), tab(CM.want.close, v), r)) - (turning ? CM.turnSteps : 0));
    const lat0 = this.latOf(this._B || c.B || c.Q || this.contactPoint(t, c.F), t), side0 = abs(lat0) < 0.03 ? 0 : Math.sign(lat0), D = this.domFoot();
    // the intent's side: a bend toward a side makes the ball's way there the natural one (the inside across the body, the outside away)
    const bendSide = abs(dS) >= 6 * DEG ? Math.sign(dS) * (1) : 0, bendK = clamp((abs(dS) / DEG - 6) / 18, 0, 1);
    const sw = this.swings.filter((s) => !s.first && this.contactTimeOf(s) > t + 0.02 && (!ac || this.contactTimeOf(s) < ac.contacts[0].tc - 0.1)); let best = null;
    for (let j = 0; j < min(sw.length, 8); j++) { const s = sw[j], tt = this.contactTimeOf(s), gap = s.F === c.F ? this.el.dri.sameFoot : this.el.dri.cadence; if (tt - t < gap - 1e-9) continue;
      const nSteps = j + 1, side = Math.sign(this.laneLat(s.F)), cross = side0 !== 0 && side !== side0, toward = bendSide !== 0 && side === sideOf(bendSide > 0 ? "R" : "L");
      // (turning: a lane change is part of the turn, and a long gap loosens the ball — the crossing costs half, an over-long gap twice)
      const xC = (D ? CM.cross.dom : this.pref ? CM.cross.pref : CM.cross.two) * (turning ? 0.5 : 1), dN = nSteps - want, cost = (ac ? nSteps : abs(dN) * (turning && dN > 0 ? 2 : 1)) * CM.wStep + (D && s.F !== D ? st.foot * CM.weak : 0) + (cross ? xC * (1 - (toward ? bendK : 0)) : 0) + (this.pref && !D && s.F !== this.pref ? st.foot * 0.6 : 0)
        - (open && v >= 6.5 ? 0.05 * nSteps : 0);                                                        // (an open sprint breaks a tie toward the longer stride carry)
      if (!best || cost < best.cost - 1e-9) best = { s, j, t: tt, cost, nSteps, cross, want }; }
    if (best) this.carryLog = (this.carryLog || []).concat([{ t: r3(t), F: best.s.F, n: best.nSteps, want, cross: best.cross, lat0: r3(lat0) }]).slice(-64);
    return best;
  }
  // SURFACES BY FUNCTION for a carry touch (an action's contacts keep TECHNICAL-CONTROL-1's ordered surfaces): a = the impulse's direction relative
  // to the run, + outward for the touching foot
  fitStyled(F, alphaDeg, dvM, allowed, ordered, vBody) {
    if (ordered) return super.fitStyled(F, alphaDeg, dvM, allowed, ordered, vBody);
    const a = sideOf(F) * alphaDeg, tol = tab(SURF11.tol, dvM), st = this.style, v = vBody || 0, D = this.domFoot(), pr = this.pref, strong = D ? F === D : pr ? F === pr : true;
    const win = { OUTSIDE: [-15, 165], LACES: [-28, 28], INSIDE: [-165, 12], SOLE: [150, 210] }; let best = null;
    for (const s of allowed) { const [lo, hi] = win[s] || SURF11[s].R, x = ((a - lo) % 360 + 360) % 360, w = hi - lo, off = dvM < SURF11.gentle || x <= w || (s === "SOLE" && dvM <= TC.soleDv) ? 0 : min(x - w, 360 - x), ok = off <= tol;
      let base;
      if (s === "OUTSIDE") base = a <= 50 ? (strong ? 0 : 7) : 4;                                          // the forward carry / slight outward; beyond 50° the outside cut
      else if (s === "LACES") base = 9 - 11 * clamp((v - 5) / 3, 0, 1) - 8 * clamp((dvM - 2) / 2, 0, 1) + 0.35 * abs(a);   // the straighter, larger push at speed
      else if (s === "INSIDE") base = a < -15 ? 2 : 22;                                                     // inward / across the body; not the forward carry
      else base = 30;                                                                                       // the sole: the actions' (stop, drag, pull)
      const sp = st.surface[s.toLowerCase()] || (s === "LACES" ? (st.surface.inside + st.surface.outside) / 2 : 1), cost = off * 1.5 + base - 25 * Math.log(max(0.2, sp));
      if (!best || (ok && !best.ok) || (ok === best.ok && cost < best.cost)) best = { surface: s, off, ok, cost }; }
    return { surface: best.surface, glance: best.off, ok: best.ok };
  }
  // THE ACTION SELECTION (TECHNICAL-CONTROL-1's, copied) with the lane: the outside cut toward the ball's side and the inside across the body away
  // from it, both with the lane foot, are the plain answers; a fancier family must be worth its sophistication
  selectAction(c, dS, I, v, tNow) {
    const sg = dS >= 0 ? 1 : -1, deg = abs(dS) / DEG, el = this.el, st = this.style, soph = el.dri.soph, contest = I.contest || 0, out = [], t0 = tNow != null ? tNow : c.t, r2 = (x) => Math.round(x * 100) / 100;
    const sw = this.swings.filter((q) => !q.first && this.contactTimeOf(q) > t0 + 0.06).slice(0, SEL.maxSwings), recent = this.techLog.filter((e) => e.ev === "action" && c.t - e.t < 1.4);
    const Bn = this._B || c.B || null, lat = Bn ? this.latOf(Bn, c.t) : 0, laneF = abs(lat) < 0.03 ? null : lat > 0 ? "R" : "L";
    for (const fam of FAMILY_ORDER) { const f = VOCAB[fam]; if (fam === "CARRY") continue;
      if (f.contest && contest < 0.5) continue; if (f.stop !== true && I.v < 0.4) continue; if (f.stop === true && I.v >= 0.4) continue;
      const lo = f.range[0], hi = f.range[1], outR = deg < lo ? lo - deg : deg > hi ? deg - hi : 0; if (outR > 15) continue;
      const body = bodyFor(fam, deg, v, el.agi, entrySpeed);
      for (let j = 0; j < sw.length; j++) { const s = sw[j], F1 = footFor(f.first.foot, sg) || s.F; if (s.F !== F1 && j > 0) continue;
        const tc = this.contactTimeOf(s), dtc = tc - t0, gap = F1 === c.F ? el.dri.sameFoot : el.dri.cadence; if (tc - c.t < gap - 0.02) continue;
        if (body.kind !== "RUN" && body.vEntry < v && (v - body.vEntry) / max(0.05, dtc) > el.agi.aBrake * 1.05) continue;
        let cost = SEL.wFit * outR / 10 + SEL.wTime * dtc + SEL.wSpeedLoss * (body.vEntry != null ? max(0, v - body.vEntry) / max(v, 1) : 0) + (s.F !== F1 ? 0.35 : 0);
        cost += f.soph * (SEL.wSoph * (1 - soph) + SEL.wSimple + CM.sel.simple) - SEL.wTech * st.technical * soph * f.soph;
        cost += (this.pref && F1 !== this.pref ? st.foot * SEL.wFoot : 0) - SEL.wSurface * Math.log(max(0.2, st.surface[(f.first.surfaces || ["INSIDE"])[0].toLowerCase()] || 1));
        if (laneF && F1 !== laneF && f.first.role !== "sole") cost += CM.sel.laneFoot;                          // the ball is in the other foot's lane
        if (fam === "DRAG_ACROSS") cost -= sw[0] && sw[0].F === footFor("turn", sg) && deg >= 35 && v < 4.5 ? SEL.wrongSide : 0;
        if (fam === "DOUBLE") cost -= recent.some((e) => e.sg === -sg) ? CM.sel.doubleSeq : 0;
        if (fam === "IN_CUT" && deg >= 40 && deg <= 105) cost -= SEL.natural; if (fam === "OUT_TOUCH" && deg <= 50) cost -= SEL.natural;
        if (f.contest) cost -= SEL.wFeint * st.feint * soph; else cost += SEL.wContest * contest;
        if (f.second) { const F2 = other(F1); cost += (this.pref && F2 !== this.pref ? st.foot * SEL.wFoot * 0.6 : 0); }
        out.push({ fam, j, s, F1, tc, body, cost }); } }
    out.sort((x, y) => x.cost - y.cost); const a = out[0] || null; if (a) a.cands = out.slice(0, 6).map((x) => [x.fam, x.j, x.F1, r2(x.cost)]); return a;
  }
  // the closed loop's next contact on the real ball (TECHNICAL-CONTROL-1's findNext) — a carry contact moving to the other foot also pays the
  // dominant foot's bias (TECHNICAL-CONTROL-1: 0.3 for any foot change, which let the loop undo the lane)
  findNext(last, nx, ballAt, tick) { const D = this.domFoot(), res = TC_FN.findNext.call(this, last, nx, ballAt, tick);
    if (!D || !res || (nx.role || "carry") !== "carry" || res.F === D) return res;
    const alt = this.findOn(last, nx, ballAt, tick, D); return alt && alt.cost < res.cost + this.style.foot * 1.5 ? alt : res; }
  // the base search restricted to one foot's swings (the dominant foot's alternative)
  findOn(last, nx, ballAt, tick, F) { const sw0 = this.swings; this.swings = sw0.filter((s) => s.first || s.F === F); try { return TC_FN.findNext.call(this, last, Object.assign({}, nx, { F }), ballAt, tick); } finally { this.swings = sw0; } }
}
const TC_FN = { findNext: TechEpisode.prototype.findNext };
// ═══ THE SIMULATION: TECHNICAL-CONTROL-1's, its episodes made carry-model episodes ══════════════════════════════════════════════════════════════
export class CarrySim extends TechSim {
  constructor(cfg) { super(cfg); this.carryModel = CM.version; }
  promote(c2) { super.promote(c2); Object.setPrototypeOf(c2.ep, CarryEpisode.prototype); c2.ep.pref = this.prefFoot(); }
  startDribble(d) { super.startDribble(d); const c2 = this.rc2, ep = c2.ep; Object.setPrototypeOf(ep, CarryEpisode.prototype);
    // (TECHNICAL-CONTROL-1 gave a two-footed player "R" here — a duplicated key; the carry model has no preferred foot for him)
    ep.pref = this.prefFoot();
    // the ball starts in the first touching foot's lane, rolling with the player (TECHNICAL-CONTROL-1 placed it on that foot's own line)
    const F = c2.frame, kc0 = c2.kc, F0 = (d && d.foot) || ep.domFoot() || this.prefFoot() || "R", h = d.heading || 0, v = d.v || 0, V = [Math.cos(h) * v, Math.sin(h) * v], a = ep.contactPoint(0, F0), b = this.W.ball;
    b.p = F.ker([a[0] - V[0] * kc0 * DT, a[1] - V[1] * kc0 * DT, R]); const bV = F.kerV([V[0], V[1], 0]); b.v = bV; b.w = rollK(bV); ep.tech.F0 = F0;
    if (this.rec) { this.rec.length = 0; this.record(); } }
}

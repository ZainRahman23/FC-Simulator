// ═══ technical_control14/tc14_core.js — TECHNICAL-CONTROL-1.4: DRIBBLING 99 = THE FASTEST TECHNIQUE, NOT THE MOST TOUCHES (owner's correction) ═══
// What TECHNICAL-CONTROL-1 / 1.2 did at a direction change (measured, Dribbling 99, 5.5 m/s): the turn was decided at the NEXT contact, not when it was
// asked (a fixed 0.12 s window); a carry touch was put before the action whenever one fitted (a setup touch); after the cut the carry rhythm touched
// at every footfall while the body was still turning (recovery touches); the vocabulary had no fast through-stance cut. A 90° cut took 3 contacts,
// a 120° 4, a 150° 4 — and Dribbling 99 was no more efficient than 50.
// THE CORRECTION (owner §1 – §17): Dribbling decides how quickly and efficiently the technical action is executed —
//   · ADAPT: a contact already on its way can become the action's contact when the decision comes at least adapt(D) before it (99: 0.05 s,
//     50: 0.16 s) — the turn is decided when it is asked, not a touch later
//   · PREPARATION: a technical action's first contact needs prep(D) × its sophistication of lead time after the decision
//   · EXECUTION CAPABILITY eff(D) against the action's DIFFICULTY (its own, + the angle beyond its comfortable range, + the speed): beyond it the
//     direct solution costs (smoothly), and a SETUP touch (control → reposition → the action) makes it easier — the lower-rated player's answer
//   · THE NUMBER OF BALL CONTACTS a solution needs is a cost (setup + the action's contacts); the time to the decisive contact and the time until
//     the body runs on the new line (the body program integrated per candidate) are costs — so a difficult one-touch solution beats an easier
//     four-touch one at 99, and not at 50
//   · THE CHOP (Ronaldo chop / through-stance cut): the foot away from the turn plays the ball with its INSIDE behind / across the standing leg along
//     the new line while the body plants on the other foot and turns — one contact for 85 – 165°
//   · THE EXIT: after an action's last contact the next touch is planned once the body runs on the new line (no recovery touches while it turns);
//     a carry touch is never added to hide low Agility (owner §12)
//   · the outside cut reaches further at high Dribbling (the explosive outside cut: up to 70 + 25 × eff°)
// UNCHANGED (owner §6, §11, §12): TECHNICAL-CONTROL-1.2's carry model (the lane, outside / instep, the same foot, the running steps), Ball Control's
// precision (the execution draws — a harder touch is executed less precisely at a lower Ball Control), Agility's body (entry speed, braking,
// redirection, yaw rate). The body animation is TECHNICAL-CONTROL-1.3's (presentation only).
import { TC, DT } from "../technical_control1/tc_core.js";
import { VOCAB, FAMILY_ORDER, ROLE_AT, SEL, footFor, bodyFor } from "../technical_control1/tc_actions.js";
import { MotionPlan, entrySpeed } from "../technical_control1/tc_motion.js";
import { CarryEpisode, CM } from "../technical_control12/tc12_core.js";
import { FlowSim } from "../technical_control13/tc13_body.js";
import { wrapA, clamp, tab, hdg, sideOf, other } from "../receive11/rx_actions.js";
export { DT };
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, DEG = Math.PI / 180, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
// THE CHOP (added to TECHNICAL-CONTROL-1's vocabulary object, not to its selection order: TECHNICAL-CONTROL-1 / 1.2 never choose it). Its contact:
// the ball beside / just behind the standing foot, on the standing foot's side of the chopping foot — [ahead, lateral toward the contact foot's side]
if (!VOCAB.CHOP) VOCAB.CHOP = { label: "chop / through-stance cut (Ronaldo chop)", soph: 0.6, range: [85, 165], body: "CHOP", first: { foot: "away", role: "chop", surfaces: ["INSIDE"] } };
if (!ROLE_AT.chop) ROLE_AT.chop = [0.0, -0.06];   // (under the body, just inside / behind the standing foot in its mid-stance)
export const EFF = {
  version: "TECHNICAL-CONTROL-1.4",
  adapt: [[1, 0.20], [50, 0.16], [70, 0.12], [80, 0.10], [90, 0.075], [99, 0.05]],     // s: a contact on its way can still become the action's
  prep: [[1, 0.30], [50, 0.22], [70, 0.14], [80, 0.10], [90, 0.06], [99, 0.03]],       // s per unit of sophistication: the action's lead after the decision
  eff: [[1, 0.0], [50, 0.30], [70, 0.50], [80, 0.62], [90, 0.80], [99, 1.0]],          // execution capability (smooth)
  // each family: its own difficulty, the angle it is comfortable to (beyond: + 0.25 per 60°), the number of contacts it takes
  fam: { OUT_TOUCH: { diff: 0.15, comfort: 40 }, IN_CUT: { diff: 0.32, comfort: 70 }, CHOP: { diff: 0.72, comfort: 125 }, CRUYFF: { diff: 0.55, comfort: 150 },
         DRAG_BACK: { diff: 0.40, comfort: 160 }, DRAG_ACROSS: { diff: 0.50, comfort: 70 }, DOUBLE: { diff: 0.52, comfort: 60 }, FEINT_EXIT: { diff: 0.6, comfort: 60 }, STOP: { diff: 0.2, comfort: 180 } },
  diffAngle: 0.40, diffSpeed: 0.05,                     // + per 60° beyond comfort; + per m/s above 4 m/s
  setupRelief: 0.30,                                    // a touch before the action, planned for it, makes it this much easier (the ball set, the body repositioned)
  w: { fit: 0.6, dec: 1.0, line: 1.6, contact: 0.5, diff: 10.0, simple: 0.5, speedLoss: 0.4 },
  outReach: 25,                                         // ° the outside cut reaches beyond TECHNICAL-CONTROL-1's 70° at eff = 1
  chop: { entry: 1.08, out: 0.85, redirect: 1.15 },     // the chop's plant: × TURN-1's entry speed (× Agility's entryK), the exit speed, × Agility's redirection
  stand: { u: 0.5, recent: 0.14, settle: 0.02, after: 0.07, lead: 0.03, near: 0.25, quick: [[1, 0.22], [50, 0.18], [80, 0.14], [99, 0.11]], fams: ["CHOP", "CRUYFF"] },
                                                        // (lead / quick: on the contact already on its way, a QUICK PLANT STEP — the standing foot lands
                                                        // 0.03 s before the contact after a swing as short as Dribbling's foot speed allows)
                                                        // the actions played behind the standing leg: the contact at 50 % of the touching foot's swing,
                                                        // the standing foot landed 0.02 – 0.14 s before it and down until 0.07 s after
  directMax: 0.75,                                      // s: beyond this the ball cannot be sent straight to the action's contact (a touch between)
  line: { tol: 15, vMin: 2.5, hold: 0.2 },              // the body on the new line: within 15° of the intent, ≥ 2.5 m/s (or 60 % of it), held 0.2 s
  exit: { lead: 0.0, maxGap: 1.1, sep: 1.2 },           // the exit touch: the first footfall once on the new line (≤ 1.1 s after the action's contact), earlier
                                                        // when the ball would be more than 1.2 m from the body before it
  // THE STYLE'S PREFERRED TECHNIQUES (owner §16: same capability, different preferred technique) — a cost offset per family, × Dribbling's
  // sophistication weight for the technical ones (a choice layer, never an attribute)
  styleFam: { CLOSE_CONTROL: { DRAG_BACK: -0.7, DOUBLE: -0.7, DRAG_ACROSS: -0.6, CHOP: 0.2 }, TWO_FOOT: { DOUBLE: -0.6, IN_CUT: -0.25, DRAG_ACROSS: -0.2 },
              DIRECT_RUNNER: { OUT_TOUCH: -0.4, IN_CUT: -0.3, CHOP: -0.2, DRAG_BACK: 0.5, CRUYFF: 0.5, DOUBLE: 0.4 }, FEINT_HEAVY: { FEINT_EXIT: -0.3 } },
  FAMILIES: ["OUT_TOUCH", "IN_CUT", "CHOP", "STOP", "DRAG_BACK", "CRUYFF", "DRAG_ACROSS", "DOUBLE", "FEINT_EXIT"],
};
export function effParams(dri) { return { adapt: tab(EFF.adapt, dri), prep: tab(EFF.prep, dri), eff: tab(EFF.eff, dri), dri }; }
// the time the body runs on the new line (heading θ) in a motion plan, from t0 (null: not within its horizon)
export function lineTime(m, theta, t0, vI) { const L = EFF.line, vMin = min(L.vMin, 0.6 * vI), ok = (t) => { const s = m.at(t), v = hyp(s.V[0], s.V[1]); return v >= vMin && abs(wrapA(hdg(s.V) - theta)) < L.tol * DEG; };
  for (let t = t0; t < t0 + 2.5; t += 0.01) if (ok(t)) { let held = true; for (let u = t; u < t + L.hold; u += 0.02) if (!ok(u)) { held = false; break; } if (held) return t; } return null; }
export class EffEpisode extends CarryEpisode {
  get E() { return this.eff || effParams(99); }
  // the family's difficulty at this angle and speed
  diffOf(fam, deg, v) { const f = EFF.fam[fam] || { diff: 0.3, comfort: 90 }; return f.diff + EFF.diffAngle * max(0, deg - f.comfort) / 60 + EFF.diffSpeed * max(0, v - 4); }
  rangeOf(fam) { const r = VOCAB[fam].range; return fam === "OUT_TOUCH" ? [r[0], r[1] + EFF.outReach * this.E.eff] : r; }
  bodyOf(fam, deg, v) { const ag = this.el.agi, eS = entrySpeed(deg, ag);
    if (fam === "CHOP") return { kind: "PLANT", vEntry: min(v, eS * EFF.chop.entry), vOut: min(v, eS * EFF.chop.out), aTurnK: EFF.chop.redirect * max(ag.aTurn, ag.aBrake) / ag.aTurn };
    return bodyFor(fam, deg, v, ag, entrySpeed); }
  // a plan's body program may carry a stronger redirection (the chop's hard plant): the motion plan integrates with that Agility
  splice(t, prog) { if (!prog.aTurnK) return super.splice(t, prog); const ag0 = this.el.agi; this.el.agi = Object.assign({}, ag0, { aTurn: ag0.aTurn * prog.aTurnK }); try { return super.splice(t, prog); } finally { this.el.agi = ag0; } }
  // the body program a candidate would splice (as applyAction does), integrated: when it runs on the new line
  candLine(fam, body, tc, I, t0) { const prog = Object.assign({ kind: body.kind, theta: I.theta, v: I.v }, body.kind === "RUN" ? {} : { tPlant: tc, vEntry: body.vEntry, vOut: body.vOut, holdFace: body.kind === "STOP" });
    if (body.kind === "STOP" && VOCAB[fam].stop) prog.v = 0; const ag0 = this.el.agi, ag = body.aTurnK ? Object.assign({}, ag0, { aTurn: ag0.aTurn * body.aTurnK }) : ag0;
    const P = this.rootAt(t0), V = this.velAt(t0), psi = this.psiAt(t0), w = wrapA(this.psiAt(t0 + DT) - psi) / DT, m = new MotionPlan({ t: t0, P, V, psi, w }, ag, 2.6).build(prog); return lineTime(m, I.theta, t0, I.v); }
  // ── THE SELECTION: family × the next swings (the contact on its way included when Dribbling can still adapt it), prepared or not ─────────────
  selectAction(c, dS, I, v, tNow) {
    const sg = dS >= 0 ? 1 : -1, deg = abs(dS) / DEG, el = this.el, st = this.style, E = this.E, W = EFF.w, contest = I.contest || 0, out = [], t0 = tNow != null ? tNow : c.t, watching = tNow != null && tNow > c.t + 1e-6;
    const lead = watching ? E.adapt : 0.06, sw = this.swings.filter((q) => !q.first && this.contactTimeOf(q) > t0 + lead).slice(0, SEL.maxSwings), pend = watching ? this.next : null;
    const Bn = this._B || c.B || null, lat = Bn ? this.latOf(Bn, c.t) : 0, laneF = abs(lat) < 0.03 ? null : lat > 0 ? "R" : "L", soph = el.dri.soph;
    for (const fam of EFF.FAMILIES) { const f = VOCAB[fam];
      if (f.contest && contest < 0.5) continue; if (f.stop !== true && I.v < 0.4) continue; if (f.stop === true && I.v >= 0.4) continue;
      const [lo, hi] = this.rangeOf(fam), outR = deg < lo ? lo - deg : deg > hi ? deg - hi : 0; if (outR > 15) continue;
      const body0 = this.bodyOf(fam, deg, v), diff = this.diffOf(fam, deg, v), nAct = f.second ? 2 : 1, prepLead = E.prep * f.soph * 2;
      const standing = EFF.stand.fams.includes(fam);
      for (let j = 0; j < sw.length; j++) { const s = sw[j], F1 = footFor(f.first.foot, sg) || s.F; if (s.F !== F1 && (j > 0 || standing)) continue;
        const pendSw = !!(pend && s.F === pend.F && abs(this.contactTimeOf(s) - pend.t) < 0.08);
        // (behind the standing leg: mid-swing — or the contact on its way, at its own time)
        const tc = standing ? (pendSw ? pend.t : s.t0 + EFF.stand.u * (s.t1 - s.t0)) : this.contactTimeOf(s), dtc = tc - t0, gap = F1 === c.F ? el.dri.sameFoot : el.dri.cadence; if (tc - c.t < gap - 0.02) continue;
        // (on the contact on its way only when the ball is already where the standing leg can be beside it — at stride-carry distance it is not)
        if (standing && pendSw && pend.Q) { const Rq = this.rolePoint(tc, F1, f.first.role); if (hyp(pend.Q[0] - Rq[0], pend.Q[1] - Rq[1]) > EFF.stand.near) continue; }
        const stand = standing ? (pendSw ? this.quickPlant(other(F1), tc, t0) : this.standingAt(other(F1), tc, t0)) : null; if (standing && !stand) continue;
        const sch = standing ? { mid: !pendSw, end: s.t1, quick: pendSw ? stand : null } : null;
        const bodyC = standing && pendSw && body0.vEntry != null ? Object.assign({}, body0, { vEntry: v }) : body0;     // (the chop on the contact on its way: the plant brakes from the contact)
        if (dtc < prepLead - 1e-9 || dtc < lead) continue;                                                    // Dribbling's preparation
        const body = bodyC; if (body.kind !== "RUN" && body.vEntry < v && (v - body.vEntry) / max(0.05, dtc) > el.agi.aBrake * 1.05) continue;
        const isPend = !!(pend && s.F === pend.F && abs(tc - pend.t) < 0.08), absorbed = isPend && F1 === pend.F;
        if (isPend && !absorbed) continue;                                   // (the ball is arriving at that foot: it cannot be re-footed)
        // (the ball is on its way to the contact already planned: the action plays it there, or after it — never before, where the ball is not yet)
        if (pend && !absorbed && tc < pend.t + 0.02) continue;
        const tLine = this.candLine(fam, body, tc, I, t0), lineS = tLine != null ? tLine - t0 : 2.6;
        // the contacts between now and the action's first one: the one on its way (unless it IS the action's), the carry touches the time needs
        const between = (pend && !absorbed ? 1 : 0) + (dtc > EFF.directMax ? Math.ceil((dtc - EFF.directMax) / EFF.directMax) : 0);
        // PREPARED: a touch planned knowing the action comes before it (the contact being played now, or the one on its way) — it sets the ball and
        // the body; an action played on the contact already on its way is executed unprepared (the hard one-touch solution)
        { const setup = !absorbed, nC = between + nAct, gapD = max(0, diff - (setup ? EFF.setupRelief : 0) - E.eff);
          let cost = W.fit * outR / 10 + W.dec * dtc + W.line * lineS + W.contact * nC + W.diff * gapD * gapD / 0.1 + W.simple * f.soph * (1 - 0.5 * soph)
            + W.speedLoss * (body.vEntry != null ? max(0, v - body.vEntry) / max(v, 1) : 0) + (s.F !== F1 ? 0.35 : 0);
          // the style (owner §16): its technical tendency, its preferred foot, its surfaces; the ball's lane (TECHNICAL-CONTROL-1.2)
          cost += -SEL.wTech * st.technical * soph * f.soph * 0.5 + (this.pref && F1 !== this.pref ? st.foot * SEL.wFoot : 0) - SEL.wSurface * Math.log(max(0.2, st.surface[(f.first.surfaces || ["INSIDE"])[0].toLowerCase()] || 1));
          if (laneF && F1 !== laneF && f.first.role !== "sole" && !absorbed) cost += CM.sel.laneFoot * 0.6;
          if (fam === "DRAG_ACROSS") cost -= sw[0] && sw[0].F === footFor("turn", sg) && deg >= 35 && v < 4.5 ? SEL.wrongSide : 0;
          if (f.contest) cost -= SEL.wFeint * st.feint * soph; else cost += SEL.wContest * contest;
          if (f.second) { const F2 = other(F1); cost += (this.pref && F2 !== this.pref ? st.foot * SEL.wFoot * 0.6 : 0); }
          const sf = this.styleKey && EFF.styleFam[this.styleKey]; if (sf && sf[fam] != null) cost += sf[fam] * (sf[fam] < 0 && f.soph >= 0.3 ? max(0.4, soph) : 1);
          out.push({ fam, j, s, F1, tc, body, cost, setup, absorbed, sched: sch, nC, lineS: r3(lineS), diff: r2(diff), dtc: r3(dtc) }); } } }
    out.sort((x, y) => x.cost - y.cost); const a = out[0] || null; if (a) a.cands = out.slice(0, 8).map((x) => [x.fam + (x.absorbed ? "@now" : ""), x.j, x.F1, r2(x.cost), x.nC, x.lineS]); return a;
  }
  applyAction(c, a, I, tNow) { super.applyAction(c, a, I, tNow); const ac = this.act; ac.mid = a.sched ? { end: a.sched.end, quick: a.sched.quick } : null; if (a.sched) this.rebuildSwings(tNow != null ? tNow : c.t);   // (TECHNICAL-CONTROL-1 rebuilt the gait before the action was set: again, with its standing leg) ac.prepared = !!a.setup; ac.absorbed = !!a.absorbed; ac.nC = a.nC; const L = this.techLog[this.techLog.length - 1]; if (L && L.ev === "action") Object.assign(L, { prepared: ac.prepared, absorbed: ac.absorbed, nC: a.nC, lineS: a.lineS, diff: a.diff, eff: r2(this.E.eff) });
    // the body's predicted time on the new line (for the exit touch)
    const pl = this.planAt(ac.contacts[0].tc); ac.tLine = pl ? lineTime(pl.m, I.theta, ac.contacts[0].tc, I.v) : null; }
  // ── THE STANDING LEG of the actions played behind / across it (the chop, the Cruyff): the contact is made at MID-SWING of the touching foot —
  // the foot sweeping across behind the standing leg as it passes under the body — while the other foot is in its stance, landed within the
  // last 0.14 s (beside the body: the ball just behind / inside it). That is where running puts the feet anyway (one foot's mid-swing is the
  // other's stance); the swing keeps its natural timing. On the contact already on its way the standing foot must be down then (its lift may
  // wait until 0.07 s after the contact when it landed recently). None of these: the candidate is not playable off a standing leg.
  // the quick plant step for the contact on its way: the standing foot lifts after its stance (≥ 0.07 s) and lands 0.03 s before the contact
  quickPlant(Y, tc, t0) { const P = EFF.stand, sw = this.swings.filter((q) => !q.first && q.F === Y), air = sw.find((q) => q.t0 < t0 - 1e-9 && q.t1 > t0), last = sw.filter((q) => q.t1 <= t0 + 1e-9).pop(), qMin = tab(P.quick, this.E.dri), tY = tc - P.lead;
    if (air) { if (air.t1 > tY + 1e-9) return tY - air.t0 >= qMin ? { yLift: null, tY, early: air } : null;            // in the air past the plant: it lands early
      if (air.t1 >= tc - P.recent) return { yLift: null, tY: air.t1, keep: air };                                          // it lands just before: that is the plant
      const yLift = max(t0 + 0.02, air.t1 + 0.07); return tY - yLift >= qMin ? { yLift, tY } : null; }                      // it lands, stands, then the quick plant step
    const yLift = max(t0 + 0.02, (last ? last.t1 : t0 - 0.3) + 0.07); return tY - yLift >= qMin ? { yLift, tY } : null; }
  standingAt(Y, tc, t0) { const sw = this.swings.filter((q) => !q.first && q.F === Y), air = sw.find((q) => q.t0 < tc - 1e-9 && q.t1 > tc + 1e-9), last = sw.filter((q) => q.t1 <= tc + 1e-9).pop();
    if (!last || tc - last.t1 > EFF.stand.recent || tc - last.t1 < EFF.stand.settle) return null;
    if (!air) return { hold: null }; return air.t0 >= t0 + 0.01 ? { hold: air } : null; }
  rebuildSwings(t) {
    const A = this.act, q = A && A.mid ? A.contacts[0] : null, f0 = this.forced;
    // (the forced contact of a mid-swing action ends its swing where the gait ends it — the contact is set inside the swing afterwards)
    if (q && q.tc > t + 0.02) this.forced = (f0 || []).map((f) => (f.F === q.F && abs(f.tc - q.tc) < 1e-6 ? { F: f.F, tc: A.mid.end - TC.landAfter } : f));
    try { super.rebuildSwings(t); } finally { this.forced = f0; }
    if (!q || q.tc <= t + 0.02) return; const s = this.swings.find((x) => x.F === q.F && x.t0 < q.tc && x.t1 > q.tc - 1e-9); if (s) s.tc = q.tc;
    const Q = A.mid.quick, Yq = other(q.F); if (Q) { const ys = this.swings.filter((x) => x.F === Yq && !x.first);
      if (Q.early) { const e = ys.find((x) => abs(x.t0 - Q.early.t0) < 1e-6); if (e) { e.t1 = Q.tY; e.quickPlant = true; } }
      else if (Q.yLift != null && Q.yLift >= t - 1e-9) { const span = ys.find((x) => x.t0 < Q.tY + 0.01 && x.t1 > Q.yLift - 0.01 && x.t0 >= t - 1e-9); if (span) { span.t0 = Q.yLift; span.t1 = Q.tY; span.quickPlant = true; } else this.swings.push({ F: Yq, t0: Q.yLift, t1: Q.tY, quickPlant: true }); } }
    // the standing foot down through the contact
    const Y = other(q.F), lift = this.swings.find((x) => x.F === Y && x.t0 < q.tc + EFF.stand.after && x.t1 > q.tc - 1e-9 && x.t0 >= t - 1e-9);
    if (lift) { const dt = q.tc + EFF.stand.after - lift.t0; for (const x of this.swings) if (x.F === Y && x.t0 >= lift.t0 - 1e-9) { x.t0 += dt; x.t1 += dt; if (x.tc != null) x.tc += dt; } }
    this.swings.sort((x, y) => x.t1 - y.t1); }
  // ── THE INTENT, WATCHED BETWEEN CONTACTS: TECHNICAL-CONTROL-1's, the window Dribbling's (it was a fixed 0.12 s) ──────────────────────────────────
  watch(W) {
    if (this.done || this.failed || !this.next || this.carryFrom == null || W.tick % 6 !== 0) return; const tNow = (W.tick - this.kc0) * DT, nx = this.next; if (nx.t - tNow < this.E.adapt || this.act) return;
    const I = this.wantNow(tNow), L = this.lastDecision; if (L && abs(wrapA(I.theta - L.theta)) < 20 * DEG && abs(I.v - L.v) < 1.2 && (I.contest || 0) < 0.5) return;
    const last = this.contacts[this.contacts.length - 1]; if (!last) return;
    this.decide(last, tNow); this.lastDecision = { t: tNow, theta: I.theta, v: I.v };
    if (this.act) { const q = this.act.contacts[0], sameSwing = q.F === nx.F && abs(q.tc - nx.t) < 0.08;
      if (sameSwing) { const k = this.kc0 + Math.round(q.tc / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT, role: q.role, allowed: q.surfaces, act: this.act.fam, actIdx: 0, Q: this.rolePoint((k - this.kc0) * DT, q.F, q.role) }); }
      else { const sw = this.swings.find((s) => !s.first && s.F === nx.F && abs(this.contactTimeOf(s) - nx.t) < 0.2); if (sw) { const k = this.kc0 + Math.round(this.contactTimeOf(sw) / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT, role: "carry", Q: this.contactPoint((k - this.kc0) * DT, nx.F) }); } } }
    else { const sw = this.swings.find((s) => !s.first && s.F === nx.F && abs(this.contactTimeOf(s) - nx.t) < 0.2); if (sw) { const k = this.kc0 + Math.round(this.contactTimeOf(sw) / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT }); } }
    this.ver++;
  }
  // ── THE PLAN of a contact: TECHNICAL-CONTROL-1's — a carry touch before an action only when the time needs one (TECHNICAL-CONTROL-1: whenever one fitted)
  plan(c, B, vB, commit) {
    this._B = B;
    if (c.i === 0 && this.tech.dir0 != null && !this.tech.firstExit) return Object.getPrototypeOf(CarryEpisode.prototype).plan.call(this, c, B, vB, commit);
    if (!this.inCarry(c) || (this.inCarry(c) && this.isExit(c))) return Object.getPrototypeOf(CarryEpisode.prototype).plan.call(this, c, B, vB, commit);
    if (commit) this.decide(c);
    let nx = null; const ac = this.act;
    if (ac) { const q = ac.contacts.find((x) => x.tc > c.t + 0.02); if (q) { const first = ac.contacts.indexOf(q) === 0, gapT = q.tc - c.t;
        const before = first && gapT > EFF.directMax ? this.carryNext(c, ac) : null;
        if (!before) { const k = this.kc0 + Math.round(q.tc / DT); nx = { i: c.i + 1, t: (k - this.kc0) * DT, k, F: q.F, role: q.role, allowed: q.surfaces, act: ac.fam, actIdx: ac.contacts.indexOf(q) }; } } }
    if (!nx) { const f = this.carryNext(c, ac && ac.contacts[0].tc > c.t + 0.02 ? ac : null); if (!f) return null; nx = { i: c.i + 1, t: f.t, k: this.kc0 + Math.round(f.t / DT), F: f.s.F, swing: f.s, role: "carry", nSteps: f.nSteps, allowed: ["INSIDE", "OUTSIDE", "LACES"], exit: !!f.exit }; nx.t = (nx.k - this.kc0) * DT; }
    nx.Q = this.rolePoint(nx.t, nx.F, nx.role);
    const ideal = this.towardIdeal(c, B, nx, commit), vb = hyp(...this.velAt(nx.t)), cap = max(TC.idealCap[0], vb + TC.idealCap[1]);
    if (ideal.speed > cap) { const k = cap / ideal.speed; ideal.v = [ideal.v[0] * k, ideal.v[1] * k]; ideal.speed = cap; ideal.capped = true; }
    return this.finishPlan(c, B, vB, { exit: false, ideal, nx, allowed: c.allowed });
  }
  // ── THE EXIT: after an action's last contact, the next touch once the body runs on the new line (not at every footfall while it turns) ──────────
  carryNext(c, ac) {
    const A = this.act, last = A && A.contacts[A.contacts.length - 1];
    if (!ac && A && last && abs(c.t - last.tc) < 0.03) { const I = this.wantNow(c.t), pl = this.planAt(c.t), tL = pl ? lineTime(pl.m, I.theta, c.t, I.v) : null, B0 = this._B || c.B;
      // (the ball's worst distance from the body until a contact at tt: the ball rolling straight from here to that contact's point, the body on its plan)
      const sepTo = (s, tt) => { if (!B0) return 0; const Q = this.contactPoint(tt, s.F); let m = 0; for (let u = c.t; u <= tt; u += 0.04) { const w = (u - c.t) / max(1e-6, tt - c.t), b = [B0[0] + (Q[0] - B0[0]) * w, B0[1] + (Q[1] - B0[1]) * w], P = this.rootAt(u); m = max(m, hyp(b[0] - P[0], b[1] - P[1])); } return m; };
      if (tL != null) { const all = this.swings.filter((s) => !s.first && this.contactTimeOf(s) > c.t + 0.02 && this.contactTimeOf(s) <= c.t + EFF.exit.maxGap), onLine = all.filter((s) => this.contactTimeOf(s) >= tL + EFF.exit.lead);
        // the first footfall on the new line — or the latest before it that keeps the ball within reach of the body
        let sw = onLine.filter((s) => sepTo(s, this.contactTimeOf(s)) <= EFF.exit.sep); if (!sw.length) { const pre = all.filter((s) => this.contactTimeOf(s) < tL + EFF.exit.lead && sepTo(s, this.contactTimeOf(s)) <= EFF.exit.sep); sw = pre.length ? [pre[pre.length - 1]] : onLine; }
        let best = null;
        for (const [j, s] of sw.slice(0, 4).entries()) { const tt = this.contactTimeOf(s), gap = s.F === c.F ? this.el.dri.sameFoot : this.el.dri.cadence; if (tt - c.t < gap - 1e-9) continue;
          const D = this.domFoot(), cost = j * 0.5 + (D && s.F !== D ? this.style.foot * CM.weak : 0) + (this.pref && !D && s.F !== this.pref ? this.style.foot * 0.6 : 0);
          if (!best || cost < best.cost) best = { s, j, t: tt, cost, nSteps: this.swings.filter((q) => !q.first && this.contactTimeOf(q) > c.t + 0.02 && this.contactTimeOf(q) <= tt).length, exit: true }; }
        if (best) { this.carryLog = (this.carryLog || []).concat([{ t: r3(c.t), F: best.s.F, n: best.nSteps, exit: true, tLine: r3(tL) }]).slice(-64); return best; } } }
    return super.carryNext(c, ac);
  }
}
// ═══ THE SIMULATION: TECHNICAL-CONTROL-1.2's carry model with the efficiency layer; TECHNICAL-CONTROL-1.3's presentation data (FlowSim) ═══════════
export class EffSim extends FlowSim {
  constructor(cfg) { super(cfg); this.effModel = EFF.version; }
  // (TECHNICAL-CONTROL-1 starts a dribble inside its constructor: the parameters are read when first needed)
  effOf() { return this._effP || (this._effP = effParams(this.ratings && this.ratings.dri != null ? this.ratings.dri : 99)); }
  promote(c2) { super.promote(c2); Object.setPrototypeOf(c2.ep, EffEpisode.prototype); c2.ep.eff = this.effOf(); c2.ep.styleKey = typeof this.cfg.style === "string" ? this.cfg.style : null; }
  startDribble(d) { super.startDribble(d); const ep = this.rc2.ep; Object.setPrototypeOf(ep, EffEpisode.prototype); ep.eff = this.effOf(); ep.styleKey = typeof this.cfg.style === "string" ? this.cfg.style : null; }
  // THE INTENT WATCHED BETWEEN CONTACTS (TECHNICAL-CONTROL-1's watch(), written but never called: every turn was decided at a contact): after each
  // tick's post, the episode re-decides when the intent has moved — the turn is decided when it is asked
  afterPost() { super.afterPost(); const c2 = this.rc2; if (c2 && c2.kind === "ELITE" && c2.phase === "action" && c2.ep instanceof EffEpisode) this.capture(() => c2.ep.watch(this.W)); }
}

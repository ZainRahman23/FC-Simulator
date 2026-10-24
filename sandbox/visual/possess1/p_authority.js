// ═══ possess1/p_authority.js — SHARED POSSESSION V1: ONE BALL, ONE AUTHORITATIVE POSSESSION STATE ════════════════════════════════════════════════
// The world owns it; no player decides possession for himself any more. Two states:
//   CONTROLLED(id)  one player has ESTABLISHED football control — the canonical COLLECTED rule (c_sim.js afterReplan): his own clean touch just
//                   made AND a controlled continuation after it (his next touch within 1.2 s, the free ball inside his control envelope until
//                   then, in reach at that touch) — never "touched it last", never "it is near him". A tackle's boot never establishes control.
//   FREE            nobody has established control. FREE · CONTESTED is the authority's REPORTED name for a FREE ball two or more players have a
//                   credible immediate claim on (a planned touch in reach of the real ball within 1.2 s) — a label, read by no rule: FREE plus
//                   the candidates' own control evaluation is all the transitions need, so no player can "own" a contest.
// TRANSITIONS (each logged with its reason and cause):
//   FREE → CONTROLLED(X)   X's canonical COLLECTED, granted only if the ball is FREE and X's knowledge is CURRENT (no world event he has not yet
//                          perceived — a blind touch can move the ball, it cannot establish control: the minimum establishment semantics; it also
//                          makes A → B → A ownership chatter within one reaction time impossible)
//   CONTROLLED(X) → FREE   X's own canonical exits (a release touch; CONTROLLER_FAILURE: a planned contact missed, no contact planned for 0.3 s,
//                          the ball 3 m away) · ANOTHER PLAYER'S CONTACT (a tackle, a touch): control survives only a minor deflection — the
//                          canonical rule, Δv < 2 m/s and X's next touch within 0.6 s with a controlled continuation, judged on the plan X HAS at
//                          that moment against the real ball (X cannot re-plan from a contact he has not perceived) · X's touch made blind
//                          (before he perceived an opponent's contact) missing the real ball
//   No direct CONTROLLED(X) → CONTROLLED(Y): control is broken first; the ball is the ball — no tackler priority, no previous-owner priority.
// CANDIDATES for a FREE ball (who may plan touches on it: the world's ball-on rule, p_world.js rights): its last owner, any player whose contact
// touched it since it became FREE, any available player it comes within the control envelope of — never a player whose body a committed tackle
// owns, never a player who knows another controls it.
import { predict, R as BR } from "../tc_baseline_88573ef0/pt_ball.js";
import { POSS } from "../vocab2/c_sim.js";
const hyp = Math.hypot, abs = Math.abs;
export const SHARED = {
  minorDv: 2.0, minorNext: 0.6,   // the canonical minor-deflection rule (c_sim.js afterReplan)
  // a touch planned on a ball that has since been moved by a contact the player has not perceived: the boot sweeps through where he believes
  // the ball is; it meets the real ball only if the real ball's centre is within the ball's radius + the boot's contact radius of that point
  // (the boot sphere of Standing Tackle V1, r 0.045 m) — the canonical touch reaches any ball within 1.05 m of the body because the player plans
  // it knowing where the ball is
  blindTol: BR + 0.045,
  claimH: POSS.H                  // the credible-claim horizon of the CONTESTED label (the canonical continuation horizon, 1.2 s)
};
export class BallAuthority {
  constructor(W) { this.W = W; this.state = "FREE"; this.owner = null; this.since = 0; this.why = "start: the ball at the carrier's feet, not yet played"; this.log = []; this.engaged = new Set(); this.contested = null; this.denied = []; this.contacts = []; this.label = "FREE"; this.labels = []; this.checks = { dual: 0, chatter: 0, noTouch: 0 }; }
  get id() { return this.owner ? this.owner.pid : null; }
  // ── a transition; broadcast to every player as a possession event (perceived after his reaction time; the player who made it knows at once) ──
  set(to, owner, why, cause, k, by = null) { const from = this.state, fromId = this.id;
    if (to === from && owner === this.owner) return; const t = k * this.W.DT;
    const rec = { k, t, from: from + (fromId ? "(" + fromId + ")" : ""), to: to + (owner ? "(" + owner.pid + ")" : ""), owner: owner ? owner.pid : null, why, cause, by: by ? by.pid : null };
    this.state = to; this.owner = owner; this.since = t; this.why = why; this.log.push(rec); if (owner && owner.pc && owner.pc.stale) this.checks.blindClaim = (this.checks.blindClaim || 0) + 1;
    if (to === "FREE") { this.engaged = new Set(); if (fromId) this.engaged.add(this.W.byId(fromId)); const lc = this.contacts[this.contacts.length - 1]; if (lc && lc.k === k && lc.by !== fromId) this.engaged.add(this.W.byId(lc.by)); }
    else this.engaged = new Set();
    this.W.possEvent(rec, cause); }
  // ── X's canonical COLLECTED: granted only on a FREE ball and only with current knowledge ───────────────────────────────────────────────────
  claim(p, how, k) { const t = k * this.W.DT;
    if (this.owner === p) return true;
    if (p.pc && p.pc.stale) { const last = p.contacts[p.contacts.length - 1], ph = last && last.k === k && last.blind ? ` — the touch was made blind: ${last.phys}` : "";
      this.denied.push({ k, t, who: p.pid, why: `blind: ${p.pc.q.length} world event(s) not yet perceived (the next in ${((p.pc.q[0].kAvail - k) * this.W.DT).toFixed(3)} s)${ph}${this.state === "CONTROLLED" ? `; and the ball is under ${this.owner.pid}'s control` : ""}`, how }); return false; }
    if (this.state === "CONTROLLED") { this.denied.push({ k, t, who: p.pid, why: `the ball is under ${this.owner.pid}'s control`, how }); return false; }
    // (instrumented: a claim must come from a touch made this tick — "possession without touch" is impossible)
    const last = p.contacts[p.contacts.length - 1]; if (!last || last.k !== k || last.missed) this.checks.noTouch++;
    this.set("CONTROLLED", p, "COLLECTED: " + how, p.pid, k); return true; }
  // ── X's own canonical exit ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  release(p, cls, detail, k) { if (this.owner !== p) { this.log.push({ k, t: k * this.W.DT, note: `${p.pid}'s own exit ${cls} — the ball was not his any more (${this.state}${this.id ? "(" + this.id + ")" : ""})` }); return false; }
    this.set("FREE", null, cls + ": " + detail, p.pid, k); return true; }
  // ── a physical contact with the ball (after its launch): by = the player whose foot (or tackle) made it ───────────────────────────────────────
  contact(by, rec) { this.contacts.push(rec); if (this.state === "FREE") { this.engaged.add(by); return; }
    const X = this.owner; if (X === by) return;
    // (the owner's judgment: with no reaction delay his own re-plan this tick makes it — c_sim.js afterReplan, unchanged; otherwise he has not
    // perceived the contact, so the world judges it on the plan he has now)
    if (X.pc && X.pc.n > 0) this.judge(X, rec); }
  judge(X, rec) { const k = rec.k, t = k * this.W.DT, dv = hyp(rec.vOut[0] - rec.vIn[0], rec.vOut[1] - rec.vIn[1]), why = [];
    const nc = X.plan.contacts.filter((c) => !c.done && c.k >= k).sort((a, b) => a.k - b.k)[0], cont = X.contOf(X.plan);
    let meet = true; if (nc) { const T = nc.k * this.W.DT - t, real = predict(rec.at, rec.vOut, T).p, bel = predict(rec.at, rec.vIn, T).p, d = hyp(real[0] - bel[0], real[1] - bel[1]); meet = d <= SHARED.blindTol; if (!meet) why.push(`his next touch (+${T.toFixed(2)} s) would sweep ${(d * 100).toFixed(0)} cm from the real ball`); }
    if (dv >= SHARED.minorDv) why.push(`Δv ${dv.toFixed(1)} m/s ≥ ${SHARED.minorDv}`); if (nc && nc.k * this.W.DT - t >= SHARED.minorNext) why.push(`no touch within ${SHARED.minorNext} s`); if (!cont.ok) why.push("no controlled continuation: " + cont.why);
    const survive = dv < SHARED.minorDv && cont.ok && (!nc || (nc.k * this.W.DT - t < SHARED.minorNext && meet));
    this.log.push({ k, t, note: `judged ${X.pid}'s control after ${rec.by}'s ${rec.kind}: ${survive ? "SURVIVES (a minor deflection)" : "BROKEN — " + why.join("; ")}` });
    if (!survive) this.set("FREE", null, `${rec.kind === "tackle" ? "OPPONENT_TACKLE" : "OPPONENT_INTERCEPTION"}: ${rec.by}'s ${rec.kind} (${why.join("; ")})`, null, k, this.W.byId(rec.by)); }
  // a touch the owner made blind missing the real ball
  blindMiss(p, rec) { if (this.owner === p) this.set("FREE", null, `CONTROLLER_FAILURE: ${p.pid}'s touch made blind missed the real ball (after an opponent's contact he had not perceived)`, null, rec.k); }
  // ── per world tick: the CONTESTED label (diagnostic), the invariants ───────────────────────────────────────────────────────────────────────
  tick(k) { const W = this.W; let lab = this.state === "CONTROLLED" ? "CONTROLLED(" + this.id + ")" : "FREE", claims = [];
    if (this.state === "FREE") { for (const p of W.players) { if (p.o.ballOn === false) continue; const c = p.firstContact(p.plan); if (!c || c.k * W.DT - k * W.DT > SHARED.claimH) continue; const B = W.ball, f = predict(B.p, B.v, c.k * W.DT - k * W.DT).p, s = p.stateAt(c.k * W.DT, p.plan);
        if (hyp(f[0] - s.P[0], f[1] - s.P[1]) <= POSS.reach) claims.push({ who: p.pid, in: +((c.k - k) * W.DT).toFixed(3) }); }
      if (claims.length >= 2) lab = "FREE · CONTESTED"; }
    this.contested = claims.length >= 2 ? claims : null; this.claims = claims;
    if (lab !== this.label) { this.labels.push({ k, t: k * W.DT, label: lab, claims }); this.label = lab; }
    // (dual ownership is impossible by construction — one owner field; what is checked is that no player's own possession record claims a ball
    // the authority gives to someone else after he has perceived it)
    for (const p of W.players) if (p.poss && p.poss.state === "CONTROLLED" && this.owner !== p && !(p.pc && p.pc.stale)) this.checks.dual++;
    // (the owner believing otherwise once he has perceived everything; the owner 3 m from the real ball — the canonical "far" exit not made)
    const O = this.owner; if (O) { if (O.poss.state !== "CONTROLLED" && !(O.pc && O.pc.stale)) this.checks.unaware = (this.checks.unaware || 0) + 1;
      const s = O.stateAt(O.t, O.plan), b = W.ball.p; if (hyp(b[0] - s.P[0], b[1] - s.P[1]) > 3.0) this.checks.far = (this.checks.far || 0) + 1; } }
}

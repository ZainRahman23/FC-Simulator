// ═══ possess1/p_sim.js — THE FOOTBALLER IN A SHARED WORLD: vocab2's ControlledSim (unchanged) + the shared authority + Reaction V1 ════════════
// One class for every player — the attacker, the defender, and the single player of the published game (alone in his world it is the
// canonical ControlledSim exactly: tools/p_solo_* run the milestone's complete regression through it). What it adds, all of it a no-op alone:
//   · POSSESSION THROUGH THE AUTHORITY: the canonical possession logic still decides when THIS player has collected the ball or lost it
//     (enterControl / exitControl, c_sim.js) — but it asks the world's BallAuthority, which alone grants control. poss.state is the player's
//     KNOWN state: his own claims and exits at once, other players' doings when he perceives them
//   · KNOWLEDGE vs PHYSICS: `ball` is the physical ball for every physical step (his contacts, the opponent law, the kernel step, the record) and
//     his BELIEF for every planning read (the resolver, the control-demand tick, his own possession monitor) while a world event waits to be
//     perceived (p_react.js)
//   · A TOUCH MADE BLIND (planned on the belief): he plays it as he believes (his record, his plan, his belief ball); physically the boot meets
//     the real ball only if it is still where he believed, within SHARED.blindTol — else it sweeps through where the ball would have been
//   · BALL-ON / BALL-OFF by the world's rights (p_world.js): a player who knows another controls the ball does not plan touches on it
//   · the defender's tackle owning his body holds his ordinary re-planning (Standing Tackle V1, as tackle1/t_world.js DefenderSim)
import { ControlledSim } from "../vocab2/c_sim.js";
import { SHARED } from "./p_authority.js";
const hyp = Math.hypot;
export class SharedSim extends ControlledSim {
  // (the physical ball and the planning view of it; reset() assigns this.ball → the setter)
  get ball() { return this._k > 0 && this.pc && this.pc.q.length ? this.pc.belief || this._ball : this._ball; }
  set ball(b) { this._ball = b; }
  get stale() { return !!(this.pc && this.pc.q.length); }
  // ── planning contexts read the belief ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // (after the re-plan, the possession change he perceived with the contact that made it: p_world.js perceive)
  replan(reason) { if (this.tk && this.tk.owns(this.t)) { this.held = (this.held || 0) + 1; if (this.world) this.world.applyDeferred(this); return; }
    this._k = (this._k || 0) + 1; try { return super.replan(reason); } finally { this._k--; if (this.world) this.world.applyDeferred(this); } }
  ctlTick() { this._k = (this._k || 0) + 1; try { return super.ctlTick(); } finally { this._k--; } }
  possStep() { this._k = (this._k || 0) + 1; try { return super.possStep(); } finally { this._k--; } }
  // ── possession through the authority ──────────────────────────────────────────────────────────────────────────────────────────────────────
  enterControl(how) { const W = this.world; if (W && !W.auth.claim(this, how, this.k)) return; super.enterControl(how); if (W) this.know = { state: "CONTROLLED", owner: this.pid }; }
  exitControl(cls, detail) { const W = this.world; if (W) { W.auth.release(this, cls, detail, this.k); this.know = { state: "FREE", owner: null }; } super.exitControl(cls, detail); }
  // ── the opponent law (the tackle's boot): physics at once; with a reaction delay the canonical same-tick re-plan is not made — the contact is
  // queued in this player's perception by the world (and the authority judges his control on the plan he has) ──────────────────────────────
  opponentStep() { const W = this.world; if (!W || !(this.pc && this.pc.n > 0)) return super.opponentStep();
    const fr = this.flags.replan, ex = this.poss.ext; super.opponentStep(); this.flags.replan = fr; this.poss.ext = ex; }
  // ── a contact: a touch made blind is played as believed and physically meets the real ball only where he believed it ──────────────────────
  execute(c) { const W = this.world;
    if (W && this.o.ballOn === false) { c.done = true; c.dropped = true; return; }   // (ball off: a touch of the previous plan due this tick is not made)
    const G = W && this.pc && this.pc.q.length ? this.pc.belief : null; if (!G) return super.execute(c);
    const real = this._ball, rp = real.p, gp = G.p, d = hyp(rp[0] - gp[0], rp[1] - gp[1]), n = this.contacts.length;
    this._k++; try { super.execute(c); } finally { this._k--; }   // (as he believes: the record, the plan's state, the belief ball launched)
    const rec = this.contacts[n]; if (!rec) return; rec.blind = true; rec.dBlind = +d.toFixed(3);
    if (rec.missed) { rec.phys = "MISS (out of reach of the believed ball)"; return; }
    this.pc.ownLaunch(rec.vOut, { foot: c.F, surface: c.surface, role: c.role }, G);
    const st = this.stateAt(this.t, this.plan), body = hyp(rp[0] - st.P[0], rp[1] - st.P[1]);
    if (d <= SHARED.blindTol && body <= 1.05 && rp[2] <= 0.5) { rec.phys = "HIT"; real.launch(rec.vOut, { foot: c.F, surface: c.surface, role: c.role, blind: true }); }
    else { rec.phys = `MISS: the boot swept ${(d * 100).toFixed(0)} cm from the real ball`; W.blindMiss(this, rec); } }
  // ── the BALL-ON rule's switches (the world decides; p_world.js rights) ─────────────────────────────────────────────────────────────────────
  playOn(t, why) { if (this.o.ballOn !== false) return false; if (this !== this.world.stepper) { this.own = this.own || this._ball; this._ball = this.world.proxyOf(this); } this.o.ballOn = true; this.flags.replan = "loose ball: playable"; this.world.note(t, this.pid + " BALL-ON", why); return true; }
  playOff(t, why) { if (this.o.ballOn === false) return false; if (this !== this.world.stepper) this._ball = this.own || this._ball; this.o.ballOn = false; this.flags.replan = "the opponent controls the ball"; this.world.note(t, this.pid + " BALL-OFF", why); return true; }
  // ── the ball as this player's body sees it (head, the foot of a touch): his knowledge while he plays the ball, the real ball otherwise ──────
  ballTrack(t) { const W = this.world; return W ? W.kTrack(this, t) : super.ballTrack(t); }
}

// ═══ possess1/p_react.js — REACTION / PERCEPTION V1: a world event happens at once; a player may RE-PLAN from it only after his reaction time ═══
// Physical truth is never delayed: the ball moves, contacts resolve and the page draws reality at once. What is delayed is the player's
// ACTION-PLANNING KNOWLEDGE of things he did not do himself — an opponent's contact with the ball (a tackle, a touch, a blind touch), and the
// possession changes the world decides (control broken, the ball FREE, an opponent's control). His own input, his own committed action and his
// own touches are his own knowledge: they continue immediately (no input lag).
// THE BELIEF: until an event is perceived, the player plans on the ball as it would be WITHOUT it — the kernel ball restored from the snapshot
// taken just before that event's launch and stepped on by the same kernel (his own touches meanwhile applied to it). That is exactly the ball he
// was already playing: his running plan, his re-plans for his own stick input and his touches continue as if nothing had happened, and they are
// bit-identical to the same encounter without the event (tools/p_input.mjs). Several events pending: the belief is the ball just before the
// earliest one he has not perceived (each event keeps its own snapshot ball, so a later one already contains the earlier ones).
// No ratings (no awareness / reactions / composure): one interval per comparison candidate, the same for every player.
import { Ball } from "../tc_baseline_88573ef0/pt_ball.js";
export const DT = 1 / 240;
// THE CANDIDATES (s; exact tick multiples). Rationale in the report (§ REACTION CANDIDATES): human online corrections of a movement already
// under way begin ≈ 0.10 – 0.15 s after a visual change; simple visual reaction ≈ 0.18 – 0.25 s; an unexpected change that needs a new choice
// ≈ 0.30 s and more. The game's own cadence: a jog step ≈ 0.30 – 0.35 s, a carry touch every 0.25 – 0.7 s, D99's commitment horizon 0.045 s.
export const REACTION = { NONE: 0, SHORT: 0.125, MEDIUM: 0.200, LONG: 0.300 };
export class Perception {
  constructor(p, rt) { this.p = p; this.rt = rt; this.n = Math.round(rt / DT); this.q = []; this.log = []; this.nEv = 0; this.seen = new Set(); }
  // knowledge is CURRENT when nothing is waiting to be perceived (a claim of control needs it: tools/p_torture.mjs checks it is never violated)
  get stale() { return this.q.length > 0; }
  // the ball the planner uses: the snapshot ball of the earliest pending ball event (null = the real ball)
  get belief() { for (const e of this.q) if (e.ghost) return e.ghost; return null; }
  // a world event this player did not cause — snap: the kernel ball just before it (a ball event), or null (a possession change only)
  push(ev, snap) { const e = Object.assign({}, ev, { id: ++this.nEv, kAvail: ev.k + this.n, ghost: null });
    if (snap && this.n > 0) { e.ghost = new Ball([0, 0], [0, 0]); e.ghost.restore(snap); } this.q.push(e); return e; }
  // the player's own touch while he plans on a belief: every pending snapshot ball receives it as he believes he made it
  ownLaunch(v, meta, except = null) { for (const e of this.q) if (e.ghost && e.ghost !== except) e.ghost.launch(v, meta); }
  stepGhosts() { for (const e of this.q) if (e.ghost) e.ghost.step(); }
  // the events whose reaction time has come by tick k (each perceived exactly once: tools/p_torture.mjs)
  due(k) { const out = []; while (this.q.length && this.q[0].kAvail <= k) { const e = this.q.shift(); if (this.seen.has(e.id)) throw new Error("event perceived twice"); this.seen.add(e.id); out.push(e); } return out; }
}

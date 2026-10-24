// ═══ possess1/p_world.js — SHARED POSSESSION + REACTION V1: two canonical footballers, ONE ball, ONE possession authority ═══════════════════════
// Standing Tackle V1's encounter (tackle1/, kept unchanged as the diagnostic fixture "OLD") rebuilt on one architecture:
//   · ONE BALL: the authoritative kernel ball. Every change of it passes through the world's launch (the attacker's touches, the defender's
//     touches through his proxy, the tackle's boot through the canonical opponent law) — logged, judged by the authority, delivered to every
//     player who did not make it as a world event
//   · ONE POSSESSION AUTHORITY (p_authority.js) — no player decides possession for himself
//   · PERCEPTION (p_react.js): each player's planning knowledge lags the events he did not make by the world's reaction interval (one value
//     per comparison candidate: NONE 0 · SHORT · MEDIUM · LONG); his input, committed actions and own touches are never delayed
//   · THE BALL-ON RULE (rights): a player plans touches on the ball only if he knows he controls it, or he knows it is FREE and he is a candidate
//     for it (its last owner, his contact touched it since it became FREE, or it comes into his control envelope) and no committed tackle owns
//     his body. A player who knows the opponent controls the ball does not plan touches on it (a ball under control is challenged only by an
//     explicit defensive action — V1: Standing Tackle)
// ONE WORLD TICK (deterministic): perception (the events whose reaction time has come) → the tackle's pending request / control return → the
// ball-on rule → the defender's tick → the tackle's boot for the opponent law → the attacker's tick (the opponent law first, then his tick; the
// kernel ball is stepped here) → the tackle reads its contacts → the belief balls stepped → the knowledge tracks → the authority's labels.
// Until the first world event between them (a contact, a possession change the other has to perceive), the attacker and the defender are
// exactly OLD's (tools/p_identity.mjs). NO PLAYER–PLAYER COLLISION (Milestone 3): the bodies can still overlap — measured, never resolved.
import { SharedSim } from "./p_sim.js";
import { BallAuthority } from "./p_authority.js";
import { Perception, REACTION, DT } from "./p_react.js";
import { StandingTackle } from "../tackle1/t_tackle.js";
import { playerOpts } from "../tackle1/t_world.js";
import { ControlledSim } from "../vocab2/c_sim.js";
const hyp = Math.hypot, N = 240 * 12, physTrack = ControlledSim.prototype.ballTrack;
export const MODES = { NONE: REACTION.NONE, SHORT: REACTION.SHORT, MEDIUM: REACTION.MEDIUM, LONG: REACTION.LONG };
export class SharedWorld {
  // o: { att, def: player options (playerOpts), mode: "NONE" | "SHORT" | "MEDIUM" | "LONG" (or rt: seconds), noTackle, timing }
  constructor(env, o = {}) {
    this.DT = DT; this.mode = o.mode || "MEDIUM"; this.rt = o.rt != null ? o.rt : MODES[this.mode]; this.k = 0; this.log = []; this.contactLog = []; this.timing = !!o.timing; this.cpu = { pre: [], def: [], probes: [], att: [], post: [], world: [] };
    this.att = new SharedSim(env, o.att || playerOpts()); this.att.pid = "ATT";
    this.def = new SharedSim(env, Object.assign({}, o.def || playerOpts("R", { start: { P: [40, 34], h: Math.PI } }), { ballOn: false })); this.def.pid = "DEF";
    this.players = [this.att, this.def]; this.stepper = this.att; this.ball = this.att._ball; this.proxies = new Map();
    for (const p of this.players) { p.world = this; p.pc = new Perception(p, this.rt); p.know = { state: "FREE", owner: null }; p._kdefer = []; p.kbuf = new Float64Array(N * 9); }
    this.auth = new BallAuthority(this);
    // (the tackle reads the REAL ball — its opportunity, its contacts — whatever the attacker believes: its timing is the user's request and the
    // same under every reaction candidate)
    this.tk = o.noTackle ? null : new StandingTackle(this.def, Object.create(this.att, { ballTrack: { value: (t) => this.trueTrack(t) } })); this.def.tk = this.tk;
    const B = this.ball, L0 = B.launch.bind(B); B.launch = (v, meta) => this.launch(L0, v, meta);
    for (const p of this.players) this.krecord(p, 0);
  }
  get t() { return this.att.t; }
  byId(id) { return id === "ATT" ? this.att : id === "DEF" ? this.def : null; }
  note(t, kind, why) { this.log.push({ k: Math.round(t / DT), t, kind, why }); }
  // a player's own view of the shared ball (ball on, not the stepper): reads the real ball; his launches are the real ball's
  proxyOf(p) { let q = this.proxies.get(p); if (q) return q; const W = this;
    q = { get p() { return W.ball.p; }, get v() { return W.ball.v; }, get q() { return W.ball.q; }, step() {}, launch(v, meta) { W.actor = p; W.ball.launch(v, meta); } }; this.proxies.set(p, q); return q; }
  // ── EVERY CHANGE OF THE BALL: the snapshot for the others' beliefs (the ball just before it), the launch, the event, the authority ──────────
  launch(L0, v, meta) { const ext = !!(meta && meta.external), by = ext ? this.def : this.actor || this.att, kind = ext ? "tackle" : meta && meta.blind ? "blind touch" : "touch";
    const b = this.ball, k = this.k, at = [b.p[0], b.p[1]], vIn = [b.v[0], b.v[1]];
    // (who learns of it as a world event: everyone but the player who made it — and, for a tackle, the tackler too: the ball's answer to his
    // boot was not his plan)
    const to = this.players.filter((p) => p !== by || kind === "tackle"), snap = this.rt > 0 && to.length ? b.snapshot() : null;
    L0(v, meta);
    const rec = { k, t: k * DT, by: by.pid, kind, at, vIn, vOut: [v[0], v[1]], surface: meta && meta.surface, role: meta && meta.role };
    this.contactLog.push(rec); for (const p of to) this.deliver(p, Object.assign({ type: "contact" }, rec), snap);
    this.auth.contact(by, rec); }
  blindMiss(p, rec) { this.note(this.k * DT, p.pid + " BLIND MISS", rec.phys); this.auth.blindMiss(p, rec); }
  // a possession transition: the player who made it knows at once; everyone else perceives it
  possEvent(rec, cause) { for (const p of this.players) if (p.pid !== cause) this.deliver(p, Object.assign({ type: "poss" }, rec), null); }
  deliver(p, ev, snap) {
    if (p.pc.n === 0) { // NONE: the canonical same-tick handling (c_sim.js opponentStep's), for any opponent's contact
      if (ev.type === "contact") { if (p.o.ballOn !== false && ev.by !== p.pid && !(p.poss.ext && Math.abs(p.poss.ext.t - p.t) < 1e-9)) { p.poss.ext = { t: p.t, kind: ev.kind === "tackle" ? "tackle" : "intercept", at: ev.at, vIn: ev.vIn, vOut: ev.vOut, id: ev.by + ":" + ev.kind, by: ev.by }; p.flags.replan = p.flags.replan || "opponent"; } }
      else this.applyKnow(p, ev);
      p.pc.log.push({ k: ev.k, perceived: ev.k, type: ev.type, by: ev.by, kind: ev.kind, to: ev.to }); return; }
    p.pc.push(ev, ev.type === "contact" ? snap : null); }
  // ── PERCEPTION: the events whose reaction time has come ───────────────────────────────────────────────────────────────────────────────────
  perceive(k) { for (const p of this.players) { const due = p.pc.due(k); if (!due.length) continue; let rp = false;
      for (const e of due) { p.pc.log.push({ k: e.k, perceived: k, type: e.type, by: e.by, kind: e.kind, to: e.to });
        if (e.type === "contact") { if (p.o.ballOn !== false && (e.by !== p.pid || e.kind === "tackle")) rp = true; }
        // (the player re-plans from the contact as the canonical player does in the contact tick — as the owner he believed he still was — and
        // then learns the world's judgment: the possession change after that re-plan)
        else if (rp && p.poss.state === "CONTROLLED" && e.owner !== p.pid) p._kdefer.push(e); else this.applyKnow(p, e); }
      if (rp) { p.flags.replan = p.flags.replan || "opponent"; p.reacted = (p.reacted || 0) + 1; } } }
  applyDeferred(p) { while (p._kdefer.length) this.applyKnow(p, p._kdefer.shift()); }
  applyKnow(p, e) { p.know = { state: e.owner ? "CONTROLLED" : "FREE", owner: e.owner };
    if (p.poss.state === "CONTROLLED" && e.owner !== p.pid) { const P = p.poss, cls = (e.why || "").split(":")[0] || "OPPONENT";
      P.log.push({ t: +p.t.toFixed(4), from: "CONTROLLED", to: "FREE", why: cls, detail: "perceived: " + e.why, perceived: true, eventT: e.t }); P.exits[cls] = (P.exits[cls] || 0) + 1; P.state = "FREE"; P.since = p.t; P.why = cls + " (perceived)"; } }
  // ── THE BALL-ON RULE ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  rights(k) { const t = k * DT;
    for (const p of this.players) { if (p.tk && p.tk.owns(t)) continue; const kn = p.know, mine = kn.owner === p.pid, other = kn.owner && kn.owner !== p.pid;
      const want = mine || (!other && (p.o.ballOn !== false || this.auth.engaged.has(p) || this.inEnvelope(p)));
      if (want && p.o.ballOn === false) p.playOn(t, other ? "" : this.auth.engaged.has(p) ? "a FREE ball his contact touched" : "a FREE ball inside his control envelope");
      else if (!want && p.o.ballOn !== false) p.playOff(t, `he knows ${kn.owner} controls the ball`); } }
  inEnvelope(p) { const b = p.pc.belief || this.ball, st = p.stateAt(p.t, p.plan); return hyp(b.p[0] - st.P[0], b.p[1] - st.P[1]) <= p.envOf(st.s); }
  // ── ONE WORLD TICK ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step(reqA, reqD) { const k = this.k, t = k * DT, tk = this.tk, T = this.timing, now = () => (T ? performance.now() : 0); let c = now(), w = 0;
    this.perceive(k); if (tk) tk.pre(t); this.rights(k); if (T) { w += now() - c; c = now(); }
    this.actor = this.def; this.def.step(reqD); if (T) { this.cpu.def.push(now() - c); c = now(); }
    if (tk) tk.probes(t); if (T) { this.cpu.probes.push(now() - c); c = now(); }
    this.actor = this.att; this.att.step(reqA); if (T) { this.cpu.att.push(now() - c); c = now(); }
    if (tk) tk.post(t); for (const p of this.players) { this.applyDeferred(p); p.pc.stepGhosts(); }
    this.k++; for (const p of this.players) this.krecord(p, this.k); this.auth.tick(this.k); if (T) this.cpu.world.push(w + now() - c); }
  request(src) { return this.tk ? this.tk.request(this.t, src) : null; }
  // ── the tracks: the physical ball (the stepper's canonical record) and each player's knowledge of it while he plays it ─────────────────────
  trueTrack(t) { return physTrack.call(this.att, t); }
  krecord(p, k) { const G = p.o.ballOn !== false ? p.pc.belief : null, b = G || this.ball, P = b.p, V = b.v, Q = b.q, o = (k % N) * 9, B = p.kbuf; B[o] = P[0]; B[o + 1] = P[1]; B[o + 2] = P[2]; B[o + 3] = V[0]; B[o + 4] = V[1]; B[o + 5] = Q[0]; B[o + 6] = Q[1]; B[o + 7] = Q[2]; B[o + 8] = Q[3]; }
  kTrack(p, t) { const k = Math.min(this.k, Math.max(Math.max(0, this.k - N + 1), Math.round(t / DT))), o = (k % N) * 9, B = p.kbuf; return { p: [B[o], B[o + 1], B[o + 2]], v: [B[o + 3], B[o + 4]], q: [B[o + 5], B[o + 6], B[o + 7], B[o + 8]], k }; }
}

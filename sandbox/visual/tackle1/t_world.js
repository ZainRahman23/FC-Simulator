// ═══ tackle1/t_world.js — TACKLING INTEGRATION V1: TWO CANONICAL FOOTBALLERS AND ONE AUTHORITATIVE BALL ═══════════════════════════════════════
// The attacker is the current gameplay player, UNCHANGED: vocab2's ControlledSim (S99 · D38 · A99-C · D99 · BC99 · CARRY-B · CONTROLLED ·
// EXPANDED · FULL), the authoritative kernel ball its own. The defender is the same footballer — the same class, the same locomotion (A99-C +
// the shared support plan, the ball-off branch u_sim.js keeps for exactly this: a body moving without the ball), the same PlayBody — with two
// additions only (DefenderSim): it SEES the authoritative ball (its ballTrack is the attacker's, so its head, its boot clearance and its tackle
// read where the ball really is), and while a committed tackle owns its body its ordinary re-planning is held off.
// ONE WORLD TICK, always in this order (deterministic): the tackle's pending request / control return (before the defender's step) → the
// defender's step → the tackle's boot presented to the attacker's canonical opponent law (c_sim.js opponentStep: the spheres of this tick) →
// the attacker's step (the opponent's foot against the real ball first, then the carrier's own tick and its possession monitor) → the tackle
// reads the contacts the law made and the possession record.
// NO DEFENDER AI: the defender moves only by its scripted stick (a deterministic fixture) and tackles only on an explicit request.
// NO PLAYER–PLAYER COLLISION: the current engine has none (the bodies can overlap; measured, never resolved here — a future system).
import { ControlledSim, presetLayers, DT, DEG } from "../vocab2/c_sim.js";
import { caseOpts } from "../vocab2/v_run.js";
import { intentOf } from "../vocab2/v_meta.js";
import { stickAt } from "../vocab2/v_cases.js";
import { StandingTackle } from "./t_tackle.js";
const hyp = Math.hypot;
export class DefenderSim extends ControlledSim {
  ballTrack(t) { return this.world ? this.world.att.ballTrack(t) : super.ballTrack(t); }
  replan(reason) { if (this.tk && this.tk.owns(this.t)) { this.held = (this.held || 0) + 1; return; } return super.replan(reason); }
  // (A LOOSE BALL IS PLAYABLE — the world's one rule for the defender's possession: once its tackle has touched the ball and returned control,
  // and while the carrier does not control it, the defender is the canonical ball-on footballer on the SHARED ball: its own resolver, its own
  // touches (each a kernel launch from where the ball is), its own possession model (FREE → COLLECTED → CONTROLLED). Back to the ball-off
  // body when the carrier controls the ball again before the defender does)
  playOn(t, why) { if (this.o.ballOn !== false) return false; this.own = this.own || this.ball; this.ball = this.world.proxy; this.o.ballOn = true; this.flags.replan = "loose ball: playable"; this.world.log.push({ t, kind: "DEFENDER BALL-ON", why }); return true; }
  playOff(t, why) { if (this.o.ballOn === false) return false; this.ball = this.own; this.o.ballOn = false; this.flags.replan = "the carrier controls the ball"; this.world.log.push({ t, kind: "DEFENDER BALL-OFF", why }); return true; }
}
// the canonical player's options (the sandbox's: v_run.js caseOpts + FULL), for the attacker and — ball off — the defender
export const playerOpts = (pref = "R", extra = {}) => Object.assign(caseOpts({ pref }, false), { layers: presetLayers("FULL") }, extra);
export class TackleWorld {
  // o: { att: options for the attacker (playerOpts), def: options for the defender (ball off is forced), noTackle: true = no tackle module }
  constructor(env, o = {}) {
    this.att = new ControlledSim(env, o.att || playerOpts());
    this.def = new DefenderSim(env, Object.assign({}, o.def || playerOpts("R", { start: { P: [40, 34], h: Math.PI } }), { ballOn: false })); this.def.world = this;
    this.tk = o.noTackle ? null : new StandingTackle(this.def, this.att); this.def.tk = this.tk; this.k = 0; this.cpu = { pre: [], def: [], probes: [], att: [], post: [] }; this.timing = !!o.timing; this.log = [];
    // the shared ball as the defender sees it once it plays: the authoritative kernel ball (stepped by the attacker's tick only); a defender's
    // touch is, for the carrier, an opponent's contact — recorded exactly as the canonical opponent law records one (c_sim.js opponentStep)
    const W = this, B = () => W.att.ball, ab = this.att.ball, L0 = ab.launch.bind(ab);
    this.proxy = { get p() { return B().p; }, get v() { return B().v; }, get q() { return B().q; }, step() {},
      launch(v, meta) { const b = B().p, bv = B().v; L0(v, meta); const rec = { t: W.att.t, kind: "intercept", at: [b[0], b[1]], vIn: [bv[0], bv[1]], vOut: [v[0], v[1]], foot: null, id: "def:touch", by: "defender" };
        W.att.extLog.push(rec); W.att.poss.ext = rec; W.att.flags.replan = W.att.flags.replan || "opponent"; W.log.push({ t: rec.t, kind: "DEFENDER TOUCH", surface: meta && meta.surface, foot: meta && meta.foot }); } };
    // (the carrier's own touches are, for a ball-on defender, an opponent's: observed on the carrier's ball — its launch unchanged)
    ab.launch = (v, meta) => { L0(v, meta); if (W.def.o.ballOn !== false && !(meta && meta.external)) { const rec = { t: W.att.t, kind: "intercept", at: ab.p.slice(0, 2), vIn: null, vOut: [v[0], v[1]], id: "att:touch", by: "attacker" }; W.def.extLog.push(rec); W.def.poss.ext = Object.assign({ vIn: [0, 0] }, rec); } };
  }
  get t() { return this.att.t; }
  // the world's possession rule for the defender (see DefenderSim.playOn): before the defender's tick
  possRule(t) { const D = this.def, A = this.tk && this.tk.act, aC = this.att.poss.state === "CONTROLLED";
    if (D.o.ballOn === false) { if (A && A.hits.length && A.released && !aC) D.playOn(t, "the tackle touched the ball; control returned; the ball is loose"); }
    else if (aC && D.poss.state !== "CONTROLLED") D.playOff(t, "the carrier has the ball under control again"); }
  step(reqA, reqD) { const t = this.att.t, tk = this.tk, T = this.timing, now = () => (T ? performance.now() : 0); let c = now();
    if (tk) { tk.pre(t); this.possRule(t); } if (T) { this.cpu.pre.push(now() - c); c = now(); }
    this.def.step(reqD); if (T) { this.cpu.def.push(now() - c); c = now(); }
    if (tk) tk.probes(t); if (T) { this.cpu.probes.push(now() - c); c = now(); }
    this.att.step(reqA); if (T) { this.cpu.att.push(now() - c); c = now(); }
    if (tk) tk.post(t); if (T) this.cpu.post.push(now() - c); this.k++; }
  request(src) { return this.tk ? this.tk.request(this.t, src) : null; }
}
// ═══ AN ENCOUNTER (a deterministic fixture): the attacker's curated case exactly as the Dribbling Lab runs it (v_run.js runCaseOn: the run-up,
// the stick timeline, the manual intents at their ticks), the defender's scripted stick, the tackle requests at their times ════════════════════
// enc: { c: the attacker's case (v_cases.js), mirror, def: { P, h, pref }, defStick: [[t, heading° | null, mode]], tackle: [t, …] (from t = 0) }
// times are from the attacker's t = 0 (the end of its run-up); the defender stands still during the run-up unless defStick starts earlier
export function encounterOpts(enc) { const c = enc.c; return { att: Object.assign(caseOpts(c, !!enc.mirror), { layers: presetLayers("FULL") }), def: playerOpts(enc.def.pref || "R", { start: { P: enc.def.P.slice(), h: enc.def.h } }) }; }
// (the defender's stick: its timeline; once a tackle has returned control and the timeline is neutral, the fixture's AFTER input — the user
// pushing the stick `after`° from the defender's facing at commitment, at a jog (default 0: on, the way he faces) — a scripted input, not AI)
export function defReqAt(enc, t, W = null) { const S = enc.defStick || []; let s = null; for (const x of S) if (t >= x[0] - 1e-9) s = x;
  const A = W && W.tk && W.tk.act, after = enc.after === undefined ? 0 : enc.after;
  if ((!s || s[1] == null) && A && A.released && after != null) return { h: Math.round((A.entry.psi + after * DEG) * 1e6) / 1e6, mode: "JOG", keys: 0 };
  if (!s) return { h: null, mode: "WALK", keys: 0 }; return { h: s[1] == null ? null : Math.round(s[1] * DEG * 1e6) / 1e6, mode: s[2] || "WALK", keys: 0 }; }
export function runEncounter(W, enc, onTick = null) {
  const c = enc.c, s = enc.mirror ? -1 : 1, R = (h, mode) => ({ h, mode, keys: 0 }), A = W.att, nUp = Math.round(c.runup / DT);
  if (c.noElite) for (const id of ["CRUYFF", "CHOP"]) A.P.techMin[id] = 101; if (c.noFam) A.o.noFam = new Set(c.noFam);
  const tReq = (enc.tackle || []).map((x) => Math.round(x / DT)), I = (c.intents || []).map((x) => ({ k: Math.round(x.t / DT), x })), n = Math.round((enc.dur || c.dur) / DT);
  for (let k = -nUp; k < n; k++) { const t = k * DT;
    if (k >= 0) for (const q of I) if (q.k === k) { const it = intentOf(q.x.id); if (it) { const foot = q.x.foot ? (enc.mirror ? (q.x.foot === "R" ? "L" : "R") : q.x.foot) : null; A.requestSkill(Object.assign({}, it, { foot, sprint: !!q.x.sprint })); } }
    if (tReq.includes(k)) W.request("fixture");
    const ra = k < 0 ? R(k + nUp < 24 ? null : 0, c.mode) : (() => { const st = stickAt(c, t); return R(st.ang == null ? null : s * st.ang * DEG, st.mode); })();
    W.step(ra, defReqAt(enc, t, W)); if (onTick) onTick(W, t); }
  // (a committed tackle is judged on the race after it: the replay runs on — the same inputs held — until 3 s after control returned)
  for (let k = n; W.tk && W.tk.act && W.t < W.tk.act.tCtl + 3.0 - 1e-9; k++) { const t = k * DT, st = stickAt(c, t); W.step(R(st.ang == null ? null : s * st.ang * DEG, st.mode), defReqAt(enc, t, W)); if (onTick) onTick(W, t); }
  if (W.tk) W.tk.finalize(W.t); return { t0: nUp * DT, k0: nUp };
}

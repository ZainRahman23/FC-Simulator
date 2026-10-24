// ═══ possess1/p_run.js — one encounter under one architecture, the same code in the REVIEW LAB (browser) and in node (tools/) ══════════════════
// MODES: "OLD" = Standing Tackle V1's world exactly (tackle1/, two independent one-player possession models, the carrier re-planning in the
// contact tick) · "NONE" = SHARED POSSESSION with no reaction delay (the authority alone) · "SHORT" / "MEDIUM" / "LONG" = SHARED POSSESSION +
// REACTION V1 at that candidate. Everything else identical: the same case, the same inputs, the same tackle request, the same tackle (POKE).
import { DT } from "../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../tackle1/t_world.js";
import { buildEncounter, caseReport } from "../tackle1/t_run.js";
import { SharedWorld } from "./p_world.js";
const hyp = Math.hypot;
export const MODE_LIST = ["OLD", "NONE", "SHORT", "MEDIUM", "LONG"];
export const MODE_LABEL = { OLD: "OLD (V1 fixture)", NONE: "SHARED · NO REACTION", SHORT: "SHARED + SHORT 0.125 s", MEDIUM: "SHARED + MEDIUM 0.200 s", LONG: "SHARED + LONG 0.300 s" };
export function runMode(env, tc, mode, o = {}) { const enc = o.enc || buildEncounter(env, tc, o);
  const W = mode === "OLD" ? new TackleWorld(env, Object.assign(encounterOpts(enc), { timing: !!o.timing })) : new SharedWorld(env, Object.assign(encounterOpts(enc), { mode, rt: o.rt, timing: !!o.timing, noTackle: !!o.noTackle }));
  if (o.contact && W.tk) W.tk.o.contact = o.contact; if (o.before) o.before(W, enc);
  const r = runEncounter(W, enc, o.onTick || null); W.mode = mode; return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
// ═══ THE OUTCOME (emergent — read from the authority's record, never decided by the tackle): after the first boot contact ══════════════════════
//   MISS · CONTACT — ATTACKER RETAINS (his control survived: a minor deflection) · CONTACT — ATTACKER RECOVERS / DEFENDER RECOVERS (the ball
//   FREE, then the first player to establish control) · CONTACT — BALL FREE (nobody established control by the replay's end)
export function outcomeShared(W, A = W.tk && W.tk.act) { if (!A) return null; const h = A.hits[0]; if (!h) return { kind: "MISS", why: W.tk.missWhy(A) };
  const L = W.auth.log.filter((e) => e.to && e.t >= h.t - 1e-9), brk = L.find((e) => e.to === "FREE"), dv = h.dv;
  if (!brk || brk.t > h.t + 1.0 + 1e-9) return { kind: "CONTACT — ATTACKER RETAINS", why: `a minor deflection (Δv ${dv.toFixed(1)} m/s): his control survived`, dv };
  const est = L.find((e) => e.to.startsWith("CONTROLLED") && e.t >= brk.t - 1e-9);
  if (!est) { const B = W.trueTrack(W.t).p, Pa = W.att.stateAt(W.t).P, Pd = W.def.stateAt(W.t).P; return { kind: "CONTACT — BALL FREE", why: `control broken at +${(brk.t - h.t).toFixed(3)} s (${brk.why}); nobody established control in the ${(W.t - brk.t).toFixed(1)} s after (the ball ${hyp(B[0] - Pa[0], B[1] - Pa[1]).toFixed(1)} m from the carrier, ${hyp(B[0] - Pd[0], B[1] - Pd[1]).toFixed(1)} m from the defender)`, dv, broken: brk.t - h.t }; }
  const who = est.owner, later = L.filter((e) => e.t > est.t + 1e-9 && e.to === "FREE")[0];
  return { kind: who === "ATT" ? "CONTACT — ATTACKER RECOVERS" : "CONTACT — DEFENDER RECOVERS", why: `control broken at +${(brk.t - h.t).toFixed(3)} s; ${who === "ATT" ? "the carrier" : "the defender"} established control at +${(est.t - h.t).toFixed(3)} s${later ? ` (lost again at +${(later.t - h.t).toFixed(2)} s: ${later.why})` : " and kept it to the replay's end"}`, dv, broken: brk.t - h.t, est: est.t - h.t, kept: !later }; }
// OLD in the same categories, by the same rule — who ESTABLISHED control first after the carrier's control was broken. OLD has two possession
// truths: its "first" is the first of the two models to say CONTROLLED (both may say it at once: the dual truth, flagged). Tackling V1's own label
// (v1: it counted the carrier's next TOUCH within 0.6 s as a recovery, control or not) is kept beside it
export function outcomeOld(W) { const A = W.tk && W.tk.act; if (!A) return null; const o = A.outcome || W.tk.classify(W.t, A), h = A.hits[0]; if (!h) return Object.assign({}, o, { kind: "MISS", v1: o.kind });
  const PA = W.att.poss.log, PD = W.def.poss.log || [], dv = h.dv, brk = PA.find((e) => e.from === "CONTROLLED" && e.to === "FREE" && e.t >= h.t - 1e-3);   // (the canonical log's times are rounded to 0.1 ms)
  if (!brk || brk.t > h.t + 1.0 + 1e-9) return { kind: "CONTACT — ATTACKER RETAINS", why: `a minor deflection (Δv ${dv.toFixed(1)} m/s): the carrier's model stayed CONTROLLED`, v1: o.kind, dv };
  const ea = PA.find((e) => e.to === "CONTROLLED" && e.t >= brk.t - 1e-3), ed = PD.find((e) => e.to === "CONTROLLED" && e.t >= brk.t - 1e-3);
  if (!ea && !ed) return { kind: "CONTACT — BALL FREE", why: "neither model said CONTROLLED again in the replay", v1: o.kind, dv, broken: brk.t - h.t };
  const att = ea && (!ed || ea.t <= ed.t), e = att ? ea : ed, oth = att ? ed : ea, PF = att ? PA : PD, dual = !!(oth && !PF.some((x) => x.to === "FREE" && x.t > e.t && x.t <= oth.t + 1e-3)), other = dual ? oth : null;
  return { kind: att ? "CONTACT — ATTACKER RECOVERS" : "CONTACT — DEFENDER RECOVERS", why: `the ${att ? "carrier's" : "defender's"} model said CONTROLLED at +${(e.t - h.t).toFixed(3)} s${other ? ` — and the ${att ? "defender's" : "carrier's"} model ALSO said CONTROLLED at +${(other.t - h.t).toFixed(3)} s: two possession truths at once` : ""}`, v1: o.kind, dv, broken: brk.t - h.t, est: e.t - h.t, dual }; }
export function outcomeOf(W) { return W.auth ? outcomeShared(W) : outcomeOld(W); }
// the review record (times from the attacker's t = 0)
export function modeReport(W, t0) { const R = caseReport(W, t0), out = outcomeOf(W), r = (x) => +(x - t0).toFixed(3);
  if (!W.auth) return Object.assign(R, { outcome: out });
  return Object.assign(R, { outcome: out, authority: W.auth.log.map((e) => Object.assign({}, e, { t: r(e.t) })), labels: W.auth.labels.map((e) => Object.assign({}, e, { t: r(e.t) })), denied: W.auth.denied.map((e) => Object.assign({}, e, { t: r(e.t) })),
    contacts: W.contactLog.map((e) => Object.assign({}, e, { t: r(e.t) })), perceived: Object.fromEntries(W.players.map((p) => [p.pid, p.pc.log.map((e) => ({ t: r(e.k * DT), at: r(e.perceived * DT), type: e.type, by: e.by, kind: e.kind, to: e.to }))])), checks: W.auth.checks }); }

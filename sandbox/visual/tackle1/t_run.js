// ═══ tackle1/t_run.js — one review case, the same code in the TACKLING LAB (browser) and in node (tools/) ══════════════════════════════════════
import { ControlledSim, DT, DEG, fromLocal } from "../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "./t_world.js";
// the defender placed from the attacker's own deterministic path: its state at t = 0 from the canonical case run alone (the defender cannot
// change the attacker before a contact — the world adds nothing to the attacker's tick until then: tools/t_identity.mjs)
export function buildEncounter(env, tc, o = {}) {
  const enc0 = { c: tc.c, mirror: !!tc.mirror, def: { P: [0, 0], h: 0 } }, A = new ControlledSim(env, encounterOpts(enc0).att), nUp = Math.round(tc.c.runup / DT);
  for (let k = 0; k < nUp; k++) A.step({ h: k < 24 ? null : 0, mode: tc.c.mode, keys: 0 });
  const st = A.stateAt(A.t), h = st.s > 0.5 ? st.h : st.psi, P = fromLocal(st.P, h, tc.def.at[0], tc.def.at[1]), hD = h + tc.def.face * DEG;
  const defStick = (tc.def.stick || []).map(([t, rel, mode]) => [t, rel == null ? null : (hD + rel * DEG) / DEG, mode]);
  const tackle = o.tackle != null ? o.tackle : tc.tackle || [];
  return { c: tc.c, mirror: !!tc.mirror, def: { P, h: hD, pref: tc.def.pref || "R" }, defStick, after: tc.def.after, tackle, dur: tc.dur || tc.c.dur, att0: { P: st.P, h } };
}
export function runCase(env, tc, o = {}) { const enc = buildEncounter(env, tc, o), W = new TackleWorld(env, Object.assign(encounterOpts(enc), { timing: !!o.timing }));
  if (o.contact) W.tk.o.contact = o.contact; const r = runEncounter(W, enc, o.onTick || null); return { W, enc, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }
// the request's record and the action's, for the review panel (times from the attacker's t = 0)
export function caseReport(W, t0) { const tk = W.tk, rq = tk.log.map((r) => ({ n: r.n, t: +(r.tReq - t0).toFixed(3), state: r.state, reason: r.reason || null, tCommit: r.tCommit != null ? +(r.tCommit - t0).toFixed(3) : null, why: r.why }));
  const S = tk.summary(); return { requests: rq, action: S, world: W.log.map((e) => Object.assign({}, e, { t: +(e.t - t0).toFixed(3) })), possA: W.att.poss.log.filter((e) => e.t >= t0 - 0.05).map((e) => ({ t: +(e.t - t0).toFixed(3), to: e.to, why: e.why })), possD: (W.def.poss.log || []).map((e) => ({ t: +(e.t - t0).toFixed(3), to: e.to, why: e.why })) }; }

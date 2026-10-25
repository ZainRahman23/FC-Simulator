// ═══ occupy3b/l3_rot.js — A ROTATED ENCOUNTER (the calibration's rotation test): the same §10 case with the whole world turned by θ° about the
// vertical — the carrier starts facing θ, his run-up and every stick angle offset by θ; the defender placed and steered relative to the carrier
// exactly as tackle1/t_run.js buildEncounter does. A copy of buildEncounter / runEncounter's stepping (tackle1/, unchanged) with that one offset:
// the canonical runner hard-codes the run-up heading 0. Mirrors are not combined with a rotation here.
import { ControlledSim, DT, DEG, fromLocal } from "../vocab2/c_sim.js";
import { encounterOpts, defReqAt } from "../tackle1/t_world.js";
import { intentOf } from "../vocab2/v_meta.js";
import { stickAt } from "../vocab2/v_cases.js";
import { makeWorld3 } from "../occupy3/o3_run.js";
const rotC = (c, th) => Object.assign({}, c, { simOpts: Object.assign({}, c.simOpts || {}, { start: { P: [30, 34], h: th * DEG } }) });
export function buildRotated(env, tc, th, o = {}) { const c = rotC(tc.c, th), enc0 = { c, mirror: false, def: { P: [0, 0], h: 0 } }, A = new ControlledSim(env, encounterOpts(enc0).att), nUp = Math.round(c.runup / DT);
  for (let k = 0; k < nUp; k++) A.step({ h: k < 24 ? null : th * DEG, mode: c.mode, keys: 0 });
  const st = A.stateAt(A.t), h = st.s > 0.5 ? st.h : st.psi, P = fromLocal(st.P, h, tc.def.at[0], tc.def.at[1]), hD = h + tc.def.face * DEG;
  const defStick = (tc.def.stick || []).map(([t, rel, mode]) => [t, rel == null ? null : (hD + rel * DEG) / DEG, mode]);
  return { c, mirror: false, def: { P, h: hD, pref: tc.def.pref || "R" }, defStick, after: tc.def.after, tackle: o.tackle != null ? o.tackle : tc.tackle || [], dur: tc.dur || c.dur, att0: { P: st.P, h }, rot: th }; }
export function runEncounterRotated(W, enc, onTick = null) { const c = enc.c, th = enc.rot * DEG, R = (h, mode) => ({ h, mode, keys: 0 }), A = W.att, nUp = Math.round(c.runup / DT);
  if (c.noElite) for (const id of ["CRUYFF", "CHOP"]) A.P.techMin[id] = 101; if (c.noFam) A.o.noFam = new Set(c.noFam);
  const tReq = (enc.tackle || []).map((x) => Math.round(x / DT)), I = (c.intents || []).map((x) => ({ k: Math.round(x.t / DT), x })), n = Math.round((enc.dur || c.dur) / DT);
  for (let k = -nUp; k < n; k++) { const t = k * DT;
    if (k === 0 && c.threat && c.def) { const st = A.stateAt(A.t), a = c.def[0], l = c.def[1]; A.setThreat({ P: [st.P[0] + a * Math.cos(st.h) - l * Math.sin(st.h), st.P[1] + a * Math.sin(st.h) + l * Math.cos(st.h)] }); }
    if (k >= 0) for (const q of I) if (q.k === k) { const it = intentOf(q.x.id); if (it) A.requestSkill(Object.assign({}, it, { foot: q.x.foot || null, sprint: !!q.x.sprint })); }
    if (tReq.includes(k)) W.request("fixture");
    const ra = k < 0 ? R(k + nUp < 24 ? null : th, c.mode) : (() => { const st = stickAt(c, t); return R(st.ang == null ? null : st.ang * DEG + th, st.mode); })();
    W.step(ra, defReqAt(enc, t, W)); if (onTick) onTick(W, t); }
  for (let k = n; W.tk && W.tk.act && W.t < W.tk.act.tCtl + 3.0 - 1e-9; k++) { const t = k * DT, st = stickAt(c, t); W.step(R(st.ang == null ? null : st.ang * DEG + th, st.mode), defReqAt(enc, t, W)); if (onTick) onTick(W, t); }
  if (W.tk) W.tk.finalize(W.t); return { t0: nUp * DT, k0: nUp }; }
// runO3's counterpart for a rotated encounter (the same world construction: makeWorld3)
export function runRotated(env, tc, mode, th, o = {}) { const enc = buildRotated(env, tc, th, o), opts = Object.assign(encounterOpts(enc), { mode: "MEDIUM", timing: !!o.timing, record: o.record !== false });
  const W = makeWorld3(env, opts, mode, { res: o.res, imp: o.imp, l3: o.l3 }); if (o.before) o.before(W, enc); const r = runEncounterRotated(W, enc, o.onTick || null); if (W.finish) W.finish(); W.omode = mode;
  return { W, enc, mode, t0: r.t0, clip: [Math.max(0, r.t0 - (tc.c.pre || 1.0)), W.t] }; }

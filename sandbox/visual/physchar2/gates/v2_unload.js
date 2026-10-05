// ═══ physchar2/gates/v2_unload.js — the UNLOADING CHARACTERIZATION scenario family (unload_fix/UNLOAD_FIX_PREREG.md §3.1), shared by the Node
// runner (tools/unload_char.mjs) and the browser check (viewer/unload.html) so both build the identical simulation. NOT a gate and NOT E1a.
// Adopted pre-E1a configuration (v2k central knee, ankle k 0.13, G3 stand + ikRefTwist + lifecycle) + the run's flags (ffLockedAxis / shareCap).
// Timeline: settle 0–1 s; planned pelvis drop d (min-jerk, 1–3 s); the stance foot's requested share σ 0.5 → σ_end = 1 − r (min-jerk 3–7 s),
// supervised (G3 supervisor defaults); hold to the end. Optional 100 ms lateral thorax push toward / away from the unloading foot. Commands only
// through existing controller mechanisms (transfer request, pelvisDrop); no pose writes, no forces other than the scheduled push.
import { G3Sim, g3Def } from "./v2_g3.js";
import { setAnkleNeutralKOverride } from "../spec/v2_joints.js";
import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
export const UNLOAD_CFG = { kneeModel: "v2k", ankleK: 0.13 };
// the body spec of the adopted configuration: the ankle neutral-zone stiffness is BAKED INTO the spec at generation (spec/v2_joints.js), so the override
// is set FIRST (a spec generated before it would carry k = 0 — the harness bug the A7 reproduction check exposed in the development smoke run)
export function unloadSpec(body) { setAnkleNeutralKOverride(UNLOAD_CFG.ankleK); return generateSpec(VARIATION_SET.find(h => h.id === body)); }
const ankleKOf = (spec) => { const j = spec.joints.find(x => x.name === "ankle_L"), p = j.passive.find(q => q && q.kN); return p ? p.kN * Math.PI / 180 : 0; };
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
// run: { foot: "L" | "R" (the UNLOADING foot), drop (m), r (final requested share of the unloading foot), flags: { ffLockedAxis?, shareCap? }, suppressRelease?, push?: { dir: "toward" | "away", J (N·s), t (s), dur (s) }, end (s) }
export function unloadSim(J, spec, run) {
  setAnkleNeutralKOverride(UNLOAD_CFG.ankleK);
  const nS = run.foot === "L" ? 1 : 0, sEnd = 1 - run.r;   // stance foot index; its final requested share
  const RAMP = run.ramp || 4, sig = (t) => (t <= 3 ? [0.5, 0, 0] : seg(t, 3, RAMP, 0.5, sEnd));   // run.ramp: transfer (unloading) duration, default 4 s
  const lam = (t) => lam.d(t)[0]; lam.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };   // λ_R
  const base = g3Def(nS === 1 ? "U:R" : "U:L"), pd = { t0: 1, dur: 2, dz: run.drop };
  let push = null; if (run.push) { const toward = run.foot === "L" ? -1 : 1, sx = run.push.dir === "toward" ? toward : -toward; push = { t0: run.push.t, dur: run.push.dur || 0.1, J: [sx * run.push.J, 0, 0], body: "thorax" }; }   // +x = the character's right (spec §7.2)
  const def = { ...base, key: `UNLOAD:${run.foot}`, title: `unloading characterization (${run.foot} unloads to ${(run.r * 100).toFixed(1)} %)`, lam, supervise: {}, holds: [], seconds: run.end + 1e-9, push, torque: null };
  const stand = { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...(run.flags || {}) };
  const s = new G3Sim(J, spec, def, { stand, passiveOpts: { kneeModel: UNLOAD_CFG.kneeModel }, ...(run.hz && run.hz !== 240 ? { cfg: { hz: run.hz } } : {}) });   // run.hz: physics-rate checks (default 240 Hz)
  if (!s.P.kneeIsV2K || !s.ctrl.lc || Math.abs(ankleKOf(spec) - UNLOAD_CFG.ankleK) > 1e-12) throw new Error("unload configuration (knee " + s.P.kneeIsV2K + ", ankle k " + ankleKOf(spec) + ")");
  // residual MEASUREMENT mode (set R; never a candidate): the support → release transitions (SUPPORT → UNLOADING / LIFTOFF) are blocked by a diagnostic
  // hook, so the support-state residual stays measurable; loadOff is NOT changed (B3 reads it) — prereg erratum E-1 (unload_fix/UNLOAD_FIX_PREREG.md)
  if (run.suppressRelease) { const lc = s.ctrl.lc, oe = lc._enter.bind(lc); lc._enter = (n, st, fp) => { if (lc.feet[n].state === "SUPPORT" && (st === "UNLOADING" || st === "LIFTOFF")) return; oe(n, st, fp); }; }
  return { s, nL: 1 - nS, nS, lam, pd };   // pd: the posture pelvisDrop target object (diagnostic harnesses may move it: a planned pelvis-height change)
}

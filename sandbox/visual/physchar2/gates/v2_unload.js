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
  // optional PROTOCOL (touch-rest validation; commands only through existing mechanisms): run.bump = { dz (m, + = pelvis RISES), t (s) } a planned pelvis-height
  // change (posture pelvisDrop target, min-jerk 1 s); run.lift = { h (m), hover (s) } the E1a SEQUENCE after release — when foot n has been TOUCHING ≥ 0.5 s and
  // t ≥ ramp end: swing target from the contact anchor to anchor + h (min-jerk 0.4 s), hover, replace (0.4 s), held at the anchor until a contact state (grace 0.3 s),
  // cleared; then the request returns to 0.5 over 4 s from replace + 0.2 s (load acceptance); the supervisor's abort keeps precedence. Event times in H.
  const H = { tL: null, tR: null, cleared: null, touchT0: null, anchor: null }, mjf = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }, C = s.ctrl, nL = 1 - nS;
  if (run.lift) { const orig = C.o.transfer; C.o.transfer = (t, c) => { const r = orig(t, c); if ((c.g3 && c.g3.aborted != null) || H.tR == null || t < H.tR + 0.2) return r;
      const u = Math.min(1, (t - H.tR - 0.2) / 4), sg = 1.0 - 0.5 * mjf(u), dsg = t < H.tR + 4.2 ? -0.5 * 30 * u * u * (1 - u) * (1 - u) / 4 : 0; return nS === 1 ? { lam: sg, dl: dsg, ddl: 0 } : { lam: 1 - sg, dl: -dsg, ddl: 0 }; }; }
  if (run.bump || run.lift) { const oc = C.compute.bind(C), RAMPE = 3 + (run.ramp || 4), LH = run.lift ? run.lift.h : 0, HOV = run.lift ? run.lift.hover : 0;
    C.compute = (st, ev, dt) => { const tc = C.n * dt;
      if (run.bump && tc >= run.bump.t) pd.dz = run.drop - run.bump.dz * mjf((tc - run.bump.t) / 1);
      if (run.lift && !(C.g3 && C.g3.aborted != null)) { const lf = C.lc.feet[nL];
        if (H.tL == null) { if (lf.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null; if (tc >= RAMPE && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tL = tc; const a = C.lc.target(nL); H.anchor = { pos: a.pos.slice(), rot: a.rot.slice() }; } }
        if (H.tL != null && H.cleared == null) { const u = tc - H.tL, A = H.anchor; if (u >= 0.8 + HOV - 1e-9 && H.tR == null) H.tR = H.tL + 0.8 + HOV;
          if (u >= 0.8 + HOV - 1e-9 && (["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"].includes(lf.state) || u >= 1.1 + HOV - 1e-9)) { C.lc.setSwingTarget(nL, null); H.cleared = tc; }
          else { const h = u < 0.4 ? LH * mjf(u / 0.4) : u < 0.4 + HOV ? LH : u < 0.8 + HOV ? LH * (1 - mjf((u - 0.4 - HOV) / 0.4)) : 0; C.lc.setSwingTarget(nL, { pos: [A.pos[0], A.pos[1] + h, A.pos[2]], rot: A.rot }); } } }
      return oc(st, ev, dt); }; }
  return { s, nL, nS, lam, pd, H };   // pd: the posture pelvisDrop target object; H: protocol event times
}

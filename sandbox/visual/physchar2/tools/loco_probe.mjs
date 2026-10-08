// ═══ physchar2/tools/loco_probe.mjs — DIAGNOSTIC ONLY: downstream locomotion viability probe (user instruction 2026-10-08, e2/loco_probe/). NOT a qualification, NOT E2.
// Composes EXISTING primitives into repeated alternating steps on one continuing simulation — nothing is reset between steps, nothing is added to the controller:
//   per step k (swing foot alternates): E1b weight transfer (stance share 0.5 → 1, min-jerk over --Ttr, the request through the existing λ channel)
//   → release (the swing foot TOUCHING ≥ --rel s, the E2 protocol's rule) → the E2 commanded step (a FRESH ctrl/v2_step.js StepSequencer per step: decision by the one planner,
//   B1 lift from the measured state, swing, measured-contact acceptance, hand-back, the DCM double-support plan back to the quiet-stance reference) → DONE (λ 0.5) → next step.
// The sequencer is a one-shot scheduler whose per-step fields (airborne seen, accepted, contact times) persist after DONE, so each step gets a new instance; the controller,
// lifecycle and physics continue untouched (the controller never reads the sequencer, only its request fields). Configuration: the most advanced adopted one, PSTAR5CHABV
// (A + B + DVG; e2/DVG2_RESULTS.md). TD2C did not validate, so its touchdown coordinator is NOT used. The tracked-clearance certificate has no validated allowance (SV-2R
// was not entered): it is computed and logged, not enforced (the declared diagnostic `diagNoClearance`, with the smoke placeholder allowance 0/0/0), exactly as the E2 smokes.
// Timing knobs (cadence probe only): --Ttr transfer duration, --rel release dwell, --Tds the commanded double-support plan duration (FS.TdsCmd, design value 4 s), --Tsw swing T.
// The run stops at the first substantive failure: fall (the sim's own definition), supervisor abort, sequencer NO_CERTIFIED / NO_LIFT / ABORTED, foot relocation > 20 mm
// (G2's "relocated"), unload time-out, step time-out, non-finite state.
// ── CF-1 (--cf=1; COUNTERFACTUAL, user approval 2026-10-08, diagnostics/loco_cf1_2026-10-08/): the missing between-steps gait-transfer layer, supplied in this harness
// only (default off; never adopted; no controller / planner / lifecycle / production code touched). Every between-steps transfer (including step 1's) becomes:
//   • DCM path: the existing reference layer's Hermite (ctrl/v2_dcm.js cmdPlan / dcmTick) from the MEASURED DCM and its LIPM rate ω(ξ − p) (the sequencer's own
//     initialisation rule: no CoP step) to the NEW STANCE FOOT's region centroid (centroid2 of the controller's own region polygon, 2-D: staggered or wide stance alike),
//     over the unchanged validated transfer time --Ttr; handed to the unchanged balance law through the existing request fields xiRef / xiRefDot;
//   • load schedule: the existing lamFromVrp rule — the stance share follows the plan's VRP along the line between the feet's region centroids (floor 0), so the
//     load reaches full stance exactly as the DCM plan arrives (coordinated, not timed separately);
//   • planned single support: the supervisor's stance-only abort is suspended while the planned transfer is MOVING (the existing precedent: the E2 sequencer
//     suspends it during its planned DS transfer, holdSupervisor()); it is active again in the release hold and in the step. A shadow copy of the same test records
//     whether the suspension was ever needed ("would-abort").
// After the plan ends the request holds (ξ_ref = the stance centroid, full stance) until the step command; the E2 step itself is unchanged.
// ── CF-2 (--cf=2 = CF-1 + CF-2; COUNTERFACTUAL, user approval 2026-10-08, forward stepping only, diagnostics/loco_cf2_2026-10-08/): the trailing-leg swing. Diagnosis
// (CF-1 refused decisions): the single-step planner's path certificate and the swing servo solve the leg IK in the bounded solver's STATIC soft box, whose ankle DF bound is
// the knee-STRAIGHT 20° (spec rom.df.active). The body model's own passive law — applied in the physics (sim/v2_passive.js COUPLING_LAWS; spec COUPLINGS, Cho 2016) —
// gives the soft DF limit 20° + 15°·clamp(kneeFlex/90°, 0, 1). The trailing leg's mid-swing needs 20.1–25.3° DF at 25–41° knee flexion: inside the body's coupled
// limit (24.2–26.8°), far inside the hard 45°. CF-2 makes the IK's soft box consistent with that existing law, and nothing else: when a SOFT bounded leg-IK solve
// fails the static box (err > 1e-6), it is retried with the ankle DF bound = the coupling law at the solution's knee flexion (fixed point, ≤ 2 refinements; accepted
// only if the solution's DF ≤ the law at its own knee flexion). Every solve the static box already reached is untouched. No new parameter, no foot pitch rule, no
// hard limit / capacity / clearance / gain change, no body-specific setting. It acts wherever the controller or the planner solve that leg IK (planner path / reach
// certificates and the swing servo alike). Foot pitch and a pelvis-aware path check were evaluated diagnostically and are not needed (see the results).
// ── CF-3 (--cf=3 = CF-1 + CF-2 + CF-3; COUNTERFACTUAL, user approval 2026-10-08, forward only, diagnostics/loco_cf3_2026-10-08/): the walking frame. The single-step planner
// defines "forward" as the STANCE foot's heading (toed out ~7.1°), so step-to footholds drift inward ~12.4 mm per step (CF-2's 9-step ceiling). CF-3 changes only the
// COMMANDED nominal: a walking frame fixed at t = 1 s from the initial stance — direction = the bisector of the two feet's initial headings, origin = the initial feet
// midpoint, nominal stance width W0 = the initial feet separation (each body's own) — and each step's target = the swing foot advanced DX along that direction at ±W0/2
// from the walking line, expressed in the planner's stance-foot frame as the nominal { dx, dy }. The planner still chooses among its own certified corridor nodes
// (nearest to the nominal; 1-cm grid) — no planner, controller, contact, actuator, limit, touchdown or servo change.
// Cadence knobs (Stage 2, same as before): --Ttr (transfer), --rel (release dwell), --Tds (the commanded double-support plan, FS.TdsCmd), swing T unchanged.
// ── CF-4 (--cf=4 = CF-1's supervisor precedent + CF-2 + CF-3's walking frame / stance width + CF-4; COUNTERFACTUAL, user approval 2026-10-08, forward only, final diagnostic,
// diagnostics/loco_cf4_2026-10-08/): momentum-carrying continuous gait. CF-3 found that the isolated-step lifecycle makes every swing start from rest: the DS plan returns ξ to the
// midpoint and stops it, and the trailing foot is released only after the DCM tracking error has decayed (p*'s projection then gives it < 1 % BW). CF-4 supplies only:
//   1. DIRECT STANCE-TO-STANCE TRANSFER: at the accepted touchdown (and once from quiet stance for step 1) the sequencer's DS-to-midpoint plan is replaced, in the request
//      only, by the existing layer's Hermite (ctrl/v2_dcm.js hermite) from the MEASURED DCM and its LIPM rate ω(ξ − p) (no CoP step) to the next stance's capture state:
//      ξ_E = c + δ·ŵ, ξ̇_E = v·ŵ (c = the new stance foot's region centroid, ŵ = CF-3's walking direction, v = the gait's mean progression speed = step length S / the nominal
//      step period (--Tst + FS.liftDelayPlan + swing T), δ = v/ω): the plan's VRP ξ_E − ξ̇_E/ω arrives exactly at c while the DCM still leads it — the transfer never brings the body to rest (the E2 swing-phase plan, unchanged, is a stop-step: it brakes ξ to rest by the planned touchdown).
//      Over --Tst (the schedule). λ follows the plan's VRP (lamFromVrp, floor 0: the trailing foot's PLANNED share reaches 0 as the plan arrives). The supervisor's stance-
//      only abort is held while the plan moves (CF-1's / the sequencer's own precedent), with the shadow test recorded.
//   2. PLANNED TRAILING-FOOT UNLOADING: from the plan's end until the lifecycle releases the trailing foot, the request places the commanded CoP at the new stance centroid
//      — ξ_ref = the measured ξ, ξ̇_ref = ω(ξ − c), so p* = c (one tick of measurement lag): the single-support DCM law with its VRP at c, re-initialised from the measured
//      state (PyPnC's rule) every tick, instead of waiting for the tracking error to decay. The trailing foot's commanded load is then 0; it is released only by the
//      UNCHANGED lifecycle (measured Fz < 1 % BW ∧ request < 5 %, its debounce and 0.1 s ramp) and the step is commanded at that measured release (TOUCHING) — no settle
//      dwell (the isolated-step protocol's --rel is not used).
// Gait pattern (commanded nominal only, as CF-3): step-through — the swing foot's target is S ahead of the STANCE foot along ŵ at CF-3's ±W0/2 (each body's own initial
// width); the planner still picks its own nearest certified corridor node. The E2 step itself (decision, B1 lift, swing, swing-phase DCM plan, touchdown, acceptance,
// hand-back) is unchanged; the step completes at the landed foot's measured SUPPORT. The final step keeps the sequencer's own DS plan (a stop: the run ends at rest).
// Knobs: --Tst (transfer duration), --S (step length, default 0.06 m: the steady swing displacement 2S = 0.12 m stays one 1-cm grid cell inside the corridor's 0.13 m).
// ── CF-5 (--cf=5 = CF-4 + one walking swing / foothold plan; COUNTERFACTUAL, user approval 2026-10-08, final bounded viability diagnostic, forward only,
// diagnostics/loco_cf5_2026-10-08/): continuous forward walk. CF-4's remaining artificial limit: the E2 swing-phase DCM plan is a stop-step (ξ → (r_s, 0) at the planned
// touchdown), so forward momentum is braked to ≈ 0 before every touchdown. CF-5 adds ONE walking-specific plan — everything else is CF-4 (walking frame / width, direct
// transfer, planned unloading, coupled ankle law, lifecycle, E2 decision / lift / swing-foot trajectory / servo / touchdown / acceptance, planner and its corridor):
//   • periodic DCM offsets (closed form, the LIPM with the VRP at the stance centroid in single support): σ = the DCM's offset from the stance centroid at the start of
//     single support (forward σx, lateral σy toward the next swing foot), E = e^{ω·Ts} its single-support growth (Ts = the lifecycle's release time debounce + ramp +
//     the planning liftoff delay + swing T; exponentials as the simulation's own explicit-Euler products (1 + ω·dt)^N, no transcendental function), and a double support
//     of duration Tst whose DCM displacement equals the mean of its boundary rates × Tst (the Hermite then has no over- / undershoot):
//       σx = S / ((E − 1) + Tst·ω·(E + 1)/2),  σy = W0 / ((E + 1) + Tst·ω·(E − 1)/2);  at touchdown the DCM is d_TD = S − σx·E behind the new foot and σy·E toward it;
//   • DS end state (supplied to CF-4's UNCHANGED transfer instead of its v/ω lead, which a non-braking swing would amplify ~12×): ξ_E = c + σx·ŵ + σy·û, ξ̇_E = ω(ξ_E − c);
//   • SWING TERMINAL STATE (ankle first, at the swing decision; replaces the stop-step Hermite in the request — the sequencer keeps running its swing foot, checks and
//     re-plans): the periodic touchdown DCM state relative to the stance centroid, ξ_T = c + σx·E·ŵ + σy·E·û, reached by the existing layer's single-support law
//     ξ̇ = ω(ξ − r) with ONE constant VRP r = (ξ_T − E_τ·ξ0)/(1 − E_τ) from the MEASURED DCM ξ0 (τ = planning liftoff delay + swing T), r clamped into the stance region
//     (inset by the planner's copSS margin); the reference continues with the same r until the accepted touchdown hands over to CF-4's transfer;
//   • FOOTHOLD FROM THE CURRENT FORWARD MOTION: the touchdown DCM that the clamped r actually achieves, ξ_T' = r + (ξ0 − r)·E_τ, sets the forward step: S + (ξ_T' − ξ_T)·ŵ,
//     i.e. the planned DCM-to-new-foot relation is kept by stepping whenever the stance ankle cannot steer the DCM; lateral stays CF-3's ± W0/2. The planner still chooses
//     its own nearest certified corridor node (1-cm grid, dx 0.07 – 0.13 m from the anchor).
//     (A first form tied ξ_T to the chosen foothold; the 2-step development smoke showed that it follows a lagging DCM backward when the corridor cannot step back —
//     replaced before any staged run.)
// Continuous-walking criteria (fixed after that smoke, before any staged run): v̄ = mean forward progression speed (walking-frame landing advance / touchdown interval over
// the run); C_min = max(10 mm/s, 0.25·v̄). Step k ≥ 2 is a genuine continuous step iff it is physical; forward COM velocity ≥ C_min at its swing decision, liftoff,
// 0.1 s before touchdown, touchdown and after load acceptance (landed SUPPORT), and at the next decision and next liftoff; and forward COM velocity > 0 at every tick
// from its decision to the next decision. Touchdown forward COM < C_min on ≥ 2 steps → NOT CONTINUOUS WALKING.
// Run end: after step N lands, the transfer / unloading / decision / lift of step N + 1 run, and the run stops at its measured liftoff (the "next liftoff" of step N);
// the tail is not counted as a step. The criteria above are evaluated post hoc from the per-step records (diagnostics/loco_cf5_2026-10-08/CF5_RESULTS.md §2).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/loco_probe.mjs --human=V2-REF --first=L --steps=2 [--hz=240] [--dx=0.10] [--Ttr=4] [--rel=0.5] [--Tds=4]
//        [--Tsw=0.6] [--apex=0.030] [--kind=forward|lateral] [--dy=0.08] --out=<file.json.gz>
// kind lateral: the E2 preregistered lateral commanded step (0.08 m outward from the anchor), alternating legs — the feet stay side by side, so the existing (lateral) transfer applies
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { StepSequencer } from "../ctrl/v2_step.js"; import { stepFrame, swingFrame, candPose, liftRef, trajectory as fsTrajectory, FS as FS2 } from "../ctrl/v2_footstep.js"; import { stepSegment, stepAt } from "../ctrl/v2_swing.js"; import { cmdPlan, dcmTick, lamFromVrp, centroid2, hermite } from "../ctrl/v2_dcm.js"; import { FS } from "../ctrl/v2_footstep.js"; import { polyDist } from "../ctrl/v2_stand.js";
import { V, Q } from "../core/v2_math.js"; import { decompose } from "../spec/v2_joints.js"; import { kneeEnvelopeV2K } from "../spec/v2_knee.js";
import { PLAN_MARGINS } from "../ctrl/v2_footstep.js"; import { clampPoly } from "../ctrl/v2_stand.js"; import { inset, hull } from "../ctrl/v2_dcm.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), FIRST = arg("first", "L"), STEPS = +arg("steps", 2), HZ = +arg("hz", 240), CONFIG = arg("cfg", "PSTAR5CHABV"), DX = +arg("dx", 0.10), TTR = +arg("Ttr", 4), REL = +arg("rel", 0.5),
  TDS = +arg("Tds", 4.0), TSW = +arg("Tsw", 0.6), APEX = +arg("apex", 0.030), OUT = arg("out", ""), TRACE = +arg("trace", 4), KIND = arg("kind", "forward"), DY = +arg("dy", 0.08), CF = +arg("cf", 0), RELMAX = +arg("relMax", 3), TST = +arg("Tst", 1.0), SLEN = +arg("S", 0.06);   // RELMAX: the harness's release give-up window (s; default 3 = every earlier study)
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
if (![0, 1, 2, 3, 4, 5].includes(CF) || (CF >= 2 && arg("kind", "forward") !== "forward") || !["forward", "lateral"].includes(KIND) || !["L", "R"].includes(FIRST) || !CFG[CONFIG] || CONFIG !== "PSTAR5CHABV" || !(STEPS >= 1)) throw new Error("args");
// DIAGNOSTIC settings (logged in the output): certificate logged-not-enforced with the smoke placeholder allowance; the commanded DS duration knob
FS.clearAllow = { rise: 0, apex: 0, descent: 0 }; const TDS0 = FS.TdsCmd; FS.TdsCmd = TDS;
const D = 180 / Math.PI, mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"], swingOf = (k) => (FIRST === "L" ? k % 2 : 1 - (k % 2));   // step k (0-based): 0 = left foot swings
// ── state machine of the composed gait (the commanding layer only) ──
const G = { k: 0, ph: "SETTLE", tPh: 0, seq: null, touchT0: null, fail: null, steps: [], cur: null, stopAt: null };
// λ_R request: σ = the STANCE foot's share; λ_R = σ for a right stance
const lamR = (t) => { const n = swingOf(G.k), stR = n === 0;   // left swing ⇒ right stance
  let v = [0.5, 0, 0]; if (G.ph === "TRANSFER") v = seg(t, G.tPh, TTR, 0.5, 1.0); else if (G.ph === "RELEASE" || G.ph === "STEP") v = [1, 0, 0]; else if (G.ph === "FAILED" && G.lastSig) v = G.lastSig;
  return stR ? v : [1 - v[0], -v[1], -v[2]]; };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = lamR;
lamFn.e2 = (t, ctrl) => { const q = G.seq; const sq = q && q.active() && !q.rec ? q.request(t) : null;
  if (CF === 5 && sq && sq.xiRef && !q.accepted && G.ss && G.ss.q === q) { const w5 = ssRef(t, ctrl); return { ...sq, xiRef: w5.xiRef, xiRefDot: w5.xiRefDot }; }   // CF-5: the walking single-support reference replaces the stop-step one (request only)
  if (CF >= 4 && sq && q.accepted && (CF === 5 || G.k + 1 < STEPS)) { if (!G.cf4acc) { G.cf4acc = true; G.cf4 = cf4Plan(t, q.n); } return cf4Request(t, ctrl, sq.acceptDur || null); }   // CF-4: the direct transfer replaces the DS plan (the sequencer still runs its lifecycle bookkeeping)
  if (sq) return sq; if (CF >= 4 && G.cf4 && (G.ph === "TRANSFER" || G.ph === "UNLOAD")) return cf4Request(t, ctrl); if (CF && G.cf && (G.ph === "TRANSFER" || G.ph === "RELEASE")) return cfRequest(t, ctrl); const [lam, dl, ddl] = lamR(t); return { lam, dl, ddl }; };
// CF-1 request (counterfactual; see header): the plan's DCM reference and the VRP-coordinated stance share
function cfRequest(t, ctrl) { const I = ctrl.info, F = G.cf, r = dcmTick(F.plan, t, { w: I.w0 }), f = lamFromVrp(I.polys, F.m, r.vrp, 0); F.last = { t, xi: r.xi, xid: r.xid, vrp: r.vrp, f };
  return { lam: F.m === 1 ? f : 1 - f, dl: 0, ddl: 0, xiRef: r.xi, xiRefDot: r.xid }; }
// CF-1: the supervisor hook object during the transfer (planned single support permitted only while the plan moves)
const cfHold = { holdSupervisor: () => G.ph === "TRANSFER", active: () => false, rec: false, request: () => null, recover: () => ({ verdict: "NO_CERTIFIED_ONE_STEP" }) };
// CF-4 (counterfactual; see header): the gait's mean progression speed v = S / (Tst + planning liftoff delay + swing T); the transfer plan to the next stance n_S from the measured state
const W4 = { v: SLEN / (TST + FS.liftDelayPlan + TSW) };
function cf4Plan(t, nS) { const I = C.info, c = centroid2(I.polys[nS]), w = I.w0, d = W4.v / w, f = WF.w;
  if (CF === 5) { const K = wkInit(), u = Math.sign(wcf(centroid2(I.polys[1 - nS]))[1] - wcf(c)[1]), xiE = [c[0] + K.sx * f[0] + K.sy * u * WF.r[0], c[1] + K.sx * f[1] + K.sy * u * WF.r[1]];   // CF-5: the periodic DS end state
    return { t0: t, nS, c, T: TST, w0: w, xi0: I.xi.slice(), xid0: [w * (I.xi[0] - I.p[0]), w * (I.xi[1] - I.p[1])], xiE, xidE: [w * (xiE[0] - c[0]), w * (xiE[1] - c[1])], lead: K.sx, latIn: K.sy, last: null }; }
  return { t0: t, nS, c, T: TST, w0: w, xi0: I.xi.slice(), xid0: [w * (I.xi[0] - I.p[0]), w * (I.xi[1] - I.p[1])], xiE: [c[0] + d * f[0], c[1] + d * f[1]], xidE: [W4.v * f[0], W4.v * f[1]], lead: d, last: null }; }
// CF-4 request: while the plan moves, its Hermite reference and the VRP-coordinated share (floor 0); afterwards the planned unloading — the commanded CoP at the stance centroid
function cf4Request(t, ctrl, acceptDur = null) { const I = ctrl.info, P = G.cf4, w = I.w0; let xi, xid, mode;
  if (t < P.t0 + P.T - 1e-9) { const H = hermite(P.xi0, P.xid0, P.xiE, P.xidE, P.T, t - P.t0); xi = H.x; xid = H.v; mode = "transfer"; }
  else { xi = I.xi.slice(); xid = [w * (I.xi[0] - P.c[0]), w * (I.xi[1] - P.c[1])]; mode = "unload"; }
  const vrp = [xi[0] - xid[0] / w, xi[1] - xid[1] / w], f = lamFromVrp(I.polys, P.nS, vrp, 0); P.last = { t, mode, xi, xid, vrp, f };
  return { lam: P.nS === 1 ? f : 1 - f, dl: 0, ddl: 0, xiRef: xi, xiRefDot: xid, ...(acceptDur ? { acceptDur } : {}) }; }
const cf4Hold = { holdSupervisor: () => G.ph === "TRANSFER", active: () => false, rec: false, request: () => null, recover: () => ({ verdict: "NO_CERTIFIED_ONE_STEP" }) };
// CF-4: the gait state at swing initiation (the user's six quantities), walking-frame components [forward, right]
function gaitState(t, n) { const st = s.st, I = C.info, m = 1 - n, wf = (v) => [+(v[0] * WF.w[0] + v[1] * WF.w[1]).toFixed(4), +(v[0] * WF.r[0] + v[1] * WF.r[1]).toFixed(4)], cS = centroid2(I.polys[m]), BW = C.M * 9.81, pv = st[PEL].v;
  return { t: r4(t), comV: wf([I.v[0], I.v[2]]), comSpeed: +Math.hypot(I.v[0], I.v[2]).toFixed(4), xiRelStance: wf([I.xi[0] - cS[0], I.xi[1] - cS[1]]), xiDot: wf([I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1])]), pelvisV: wf([pv[0], pv[2]]),
    trailFzBW: +(C.sense.Fz[n] / BW).toFixed(4), stanceFzBW: +(C.sense.Fz[m] / BW).toFixed(4), sincePrevTouchdownS: G.prevTD != null ? r4(t - G.prevTD) : null,
    ...(CF === 5 ? { xiBothFeetHullMarginMm: +(polyDist(hull(I.polys[0].concat(I.polys[1])), I.xi) * 1000).toFixed(2), xiStanceRegionMarginMm: +(polyDist(I.polys[m], I.xi) * 1000).toFixed(2) } : {}) }; }
// ── CF-5 (counterfactual; see header): the walking plan. wcf: walking-frame [forward, right] coordinates of an [x, z] point; eN: the explicit-Euler growth (1 + ω·dt)^round(T/dt)
const wcf = (p) => [(p[0] - WF.m0[0]) * WF.w[0] + (p[1] - WF.m0[1]) * WF.w[1], (p[0] - WF.m0[0]) * WF.r[0] + (p[1] - WF.m0[1]) * WF.r[1]], ofWcf = (f, l) => [WF.m0[0] + f * WF.w[0] + l * WF.r[0], WF.m0[1] + f * WF.w[1] + l * WF.r[1]];
let WK = null;
function wkInit() { if (WK) return WK; const w = C.info.w0, eN = (T) => { let e = 1; const N = Math.round(T / dt); for (let i = 0; i < N; i++) e *= 1 + w * dt; return e; };
  const Ts = C.lc.o.debounce + C.lc.o.release + FS.liftDelayPlan + TSW, Es = eN(Ts), sx = SLEN / ((Es - 1) + TST * w * (Es + 1) / 2), sy = WF.W0 / ((Es + 1) + TST * w * (Es - 1) / 2);
  WK = { w, Ts, Td: TST, Es, sx, sy, dTD: SLEN - sx * Es, latTD: sy * Es, eTau: eN(FS.liftDelayPlan + TSW) }; return WK; }
// the swing-phase plan at the decision (ANKLE FIRST): the periodic touchdown DCM state relative to the stance centroid, ξ_T = c + σx·E·ŵ + σy·E·û, reached with ONE constant
// VRP r = (ξ_T − E_τ·ξ0)/(1 − E_τ) from the measured DCM, clamped into the stance region; the touchdown DCM that r actually achieves, ξ_T' = r + (ξ0 − r)·E_τ, sets the
// forward foothold: the planned step S plus whatever the clamp left (ξ_T' − ξ_T along ŵ), so the planned DCM-to-new-foot relation is kept when the ankle cannot steer
function ssDecide(t, n) { const K = wkInit(), I = C.info, m = 1 - n, cS = centroid2(I.polys[m]), region = inset(I.polys[m], PLAN_MARGINS.copSS), cF = wcf(cS), u = Math.sign(wcf(centroid2(I.polys[n]))[1] - cF[1]);
  const xiT = ofWcf(cF[0] + K.sx * K.Es, cF[1] + u * K.latTD), xi0 = I.xi.slice(), E = K.eTau, rr = [(xiT[0] - E * xi0[0]) / (1 - E), (xiT[1] - E * xi0[1]) / (1 - E)], r = clampPoly(region, rr), cl = Math.hypot(r[0] - rr[0], r[1] - rr[1]);
  const xiA = [r[0] + (xi0[0] - r[0]) * E, r[1] + (xi0[1] - r[1]) * E], adj = wcf(xiA)[0] - wcf(xiT)[0], rel = (p) => wcf(p).map((v, i) => +((v - cF[i]) * 1000).toFixed(2));
  return { t0: t, n, c: cS, xi: xi0, r, tLast: t, step: SLEN + adj, rec: { leadAtDecisionMm: rel(xi0)[0], latAtDecisionMm: rel(xi0)[1], xiTRelStanceMm: rel(xiT), rRelStanceMm: rel(r), rClampedMm: +(cl * 1000).toFixed(2), xiTAchievedRelStanceMm: rel(xiA), stepNominalM: +(SLEN + adj).toFixed(4) } }; }
// once per controller tick: advance the reference (explicit Euler with the constant VRP, the simulation's own integrator)
function ssRef(t, ctrl) { const P = G.ss, w = ctrl.info.w0; if (P.memo && P.memo.t === t) return P.memo.r;
  if (t > P.tLast + 1e-9) { const k = Math.round((t - P.tLast) / dt); for (let i = 0; i < k; i++) P.xi = [P.xi[0] + dt * w * (P.xi[0] - P.r[0]), P.xi[1] + dt * w * (P.xi[1] - P.r[1])]; P.tLast = t; }
  const r = { xiRef: P.xi.slice(), xiRefDot: [w * (P.xi[0] - P.r[0]), w * (P.xi[1] - P.r[1])] }; P.memo = { t, r }; return r; }
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, n0 = swingOf(0);
const def = { ...g3Def(n0 === 0 ? "U:R" : "U:L"), key: "LOCO", title: "DIAGNOSTIC locomotion viability probe", lam: lamFn, supervise: { e2: { pushEnd: () => null } }, holds: [], seconds: CF === 5 ? 7 + (STEPS + 1) * (TST + 6) + 12 : CF === 4 ? 7 + STEPS * (TST + 6) + TDS + 12 : 7 + STEPS * (TTR + REL + TDS + 4) + 12, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG] }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt; const CF2 = { solves: 0, used: 0, refused: 0, planner: 0, dfMax: -Infinity, marginMin: Infinity, perStep: null };
if (CF >= 2) { const orig = C.legIKBounded.bind(C), D0 = 180 / Math.PI;
  // convention-free form of the law in the solver's coordinates: the static soft DF bound IS the law at knee flexion 0 (20°, anatomical; checked to 0.05°), so the coupled
  // bound = static bound + 15°·clamp(kneeFlex/90°, 0, 1), with kneeFlex = knee coordinate − its soft lower bound (anatomical 0°) — both read from each body's own spec
  for (const n of [0, 1]) { const ks = C.legK[n], ja = C.spec.joints[ks[2]], jk = C.spec.joints[ks[1]];
    if (C.spec !== spec || Math.abs(ja.limits.soft.hi[1] * D0 - 32.5) > 0.05 || Math.abs(jk.limits.soft.lo[1] * D0 + 70) > 0.05) throw new Error("CF-2: joint convention " + JSON.stringify([ja.limits.soft.hi[1] * D0, jk.limits.soft.lo[1] * D0])); }
  C.legIKBounded = (st, ev, n, pP, qP, footPose = null, bo = null) => { const r = orig(st, ev, n, pP, qP, footPose, bo); if (!(bo && bo.limits === "soft") || r.err <= 1e-6) return r;
    CF2.solves++; const rh = orig(st, ev, n, pP, qP, footPose, { ...bo, limits: "hard" }); if (rh.err > 1e-6) { CF2.refused++; return r; }
    const ks = C.legK[n], ja = C.spec.joints[ks[2]], hi0 = ja.limits.soft.hi[1], kLo = C.spec.joints[ks[1]].limits.soft.lo[1];
    const extra = (x3) => (15 * Math.min(1, Math.max(0, (x3 - kLo) * D0 / 90))) / D0;   // the law's increment over the static bound at the knee coordinate x3 (rad)
    let kx = rh.x[3], out = null;
    try { for (let it = 0; it < 3 && !out; it++) { ja.limits.soft.hi[1] = hi0 + extra(kx); const r2 = orig(st, ev, n, pP, qP, footPose, bo), lim = hi0 + extra(r2.x[3]);
        if (r2.err <= 1e-6 && r2.x[4] <= lim + 1e-12) out = { r2, df: (r2.x[4] - hi0) * D0 + 20, lim: (lim - hi0) * D0 + 20 }; else kx = r2.x[3]; } }
    finally { ja.limits.soft.hi[1] = hi0; }
    if (!out) { CF2.refused++; return r; }
    CF2.used++; if (C._e2plan) CF2.planner++; CF2.dfMax = Math.max(CF2.dfMax, out.df); CF2.marginMin = Math.min(CF2.marginMin, out.lim - out.df);
    if (CF2.perStep && !C._e2plan) { const q = CF2.perStep; q.used++; q.dfMax = Math.max(q.dfMax, out.df); q.marginMin = Math.min(q.marginMin, out.lim - out.df); }
    return out.r2; }; }
if (C.o.d1Guard !== 2 || !C.o.vffPelvisAir || !C.o.vffPassiveRef || C.o.e2 !== 2 || !C.o.swingAccFF || C.o.e2td) throw new Error("configuration");
const B = spec.bodies, bi = (nm) => B.findIndex(b => b.name === nm), FT = ["foot_L", "foot_R"].map(bi), PEL = bi("pelvis"), JI = (nm) => spec.joints.findIndex(j => j.name === nm);
const LEG = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"].map(JI);
const solePts = FT.map(f => B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const tilt = (q) => { const u = Q.rot(q, [0, 1, 0]); return Math.acos(Math.min(1, u[1])) * D; };
const clearMm = (n, st) => Math.min(...solePts[n].map(p => V.add(st[FT[n]].pos, Q.rot(st[FT[n]].rot, p))[1])) * 1000;
const qsOf = (st) => s.P.jd.map(d => s.P.qcs(d, st.map(b => b.rot))), anat = (k, qs, key) => s.P.anat(s.P.jd[k], qs[k], key);
const hardMargin = (k, qs) => { const d = s.P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz]; let m = Infinity;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(anat(k, qs, "flex")), r = anat(k, qs, "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); }
    else { const h = s.P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * D; } if (x < m) m = x; }); return m; };
const r4 = (x) => (x == null ? null : Array.isArray(x) ? x.map(r4) : typeof x === "number" ? +x.toFixed(4) : x);
const xz = (p) => [p[0], p[2]], d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let lastCmd = null; const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { protocol(C.n * dtt, st); const c = oc(st, ev, dtt); lastCmd = c; return c; };
// fail(): record the first substantive failure, hold the current request (σ, zero rates) and stop 0.25 s later
// the load-split geometry at the failure (read-only): region centroids, ξ / ξ_ref / p*, and p*'s projection on the centroid line (the controller's share rule, G3)
const cen = (P) => { let a = 0, x = 0, y = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], c = x0 * y1 - x1 * y0; a += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return a ? [x / (3 * a), y / (3 * a)] : P[0]; };
function splitGeom() { const I = C.info; if (!I || !I.polys) return null; const cL = cen(I.polys[0]), cR = cen(I.polys[1]), ab = [cL[0] - cR[0], cL[1] - cR[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1], tP = ((I.pRaw[0] - cR[0]) * ab[0] + (I.pRaw[1] - cR[1]) * ab[1]) / L2, tX = ((I.xiRef[0] - cR[0]) * ab[0] + (I.xiRef[1] - cR[1]) * ab[1]) / L2;
  return { centroidL: r4(cL), centroidR: r4(cR), xi: r4(I.xi), xiRef: r4(I.xiRef), pStar: r4(I.pRaw), projLeftShare_pStar: r4(tP), projLeftShare_xiRef: r4(tX), cmdShare: I.share ? r4(I.share) : null, FzBW: r4(C.sense.Fz.map(x => x / (C.M * 9.81))) }; }
function fail(t, why, cls = null) { if (!G.fail) { G.fail = { t, why, step: G.k + 1, phase: G.ph, cls, split: splitGeom() }; G.lastSig = (() => { const v = lamR(t)[0]; return [swingOf(G.k) === 0 ? v : 1 - v, 0, 0]; })(); G.ph = "FAILED"; G.stopAt = t + 0.25; } }
// ── the composed protocol (causal, at each controller tick) ──
function protocol(t, st) { const lc = C.lc; if (G.fail) return; const n = swingOf(G.k), f = lc.feet[n], g = C.g3;
  if (g && g.aborted != null) { fail(t, `supervisor abort (stance-only CoP test) in ${G.ph}`); return; }
  if (G.ph === "SETTLE") { if (t >= 3 - 1e-9) { G.ph = "TRANSFER"; G.tPh = t; newStep(t); } return; }
  if (G.ph === "END") { if (CF === 4 && G.stopAt == null && (G.seq.ph === "DONE" || t > G.tPh + TDS + 5)) G.stopAt = t + 1.0; return; }   // CF-4: the final (stop) step ends at rest
  if (G.ph === "TRANSFER" && CF >= 4) { if (t >= G.cf4.t0 + G.cf4.T - 1e-9) { G.ph = "UNLOAD"; G.tPh = t; G.cur.transfer.tPlanEnd = r4(t); } return; }
  if (G.ph === "UNLOAD") { if (f.state === "TOUCHING" && C.e2st) { G.ph = "STEP"; G.tPh = t; command(t); return; }   // CF-4: the step at the lifecycle's measured release
    if (t > G.tPh + RELMAX) fail(t, `unload time-out: the trailing foot not released (TOUCHING) within ${RELMAX} s of the transfer plan's end (state ${f.state}, Fz ${(C.sense.Fz[n] / (C.M * 9.81) * 100).toFixed(2)} % BW)`); return; }
  if (G.ph === "TRANSFER") { if (t >= G.tPh + TTR - 1e-9) { G.ph = "RELEASE"; G.tPh = t; G.touchT0 = null; } return; }
  if (G.ph === "RELEASE") { if (f.state === "TOUCHING") { if (G.touchT0 == null) G.touchT0 = t; } else G.touchT0 = null;
    if (G.touchT0 != null && t - G.touchT0 >= REL - 1e-9 && C.e2st) { G.ph = "STEP"; G.tPh = t; command(t); return; }
    if (t > G.tPh + RELMAX) fail(t, `unload time-out: the swing foot never TOUCHING ≥ ${REL} s within ${RELMAX} s (state ${f.state}, share ${(lc.feet[n].s ?? 0).toFixed(3)})`); return; }
  if (G.ph === "STEP") { const q = G.seq;
    if (q.ph === "DONE" || (CF >= 4 && q.ph === "DS")) { G.cur.doneT = CF >= 4 ? t : q.doneT; finishStep(t); if (G.k + 1 >= STEPS && CF !== 5) { G.ph = "END"; G.tPh = t; G.stopAt = CF === 4 ? null : t + 1.0; return; } G.k++; if (CF >= 4) G.seq = null; G.ph = "TRANSFER"; G.tPh = t; newStep(t); return; }
    if (["NOCERT", "NOLIFT", "ABORTED"].includes(q.ph)) { if (q.ph === "NOCERT") { G.cur.pathDiag = pathDiag(q); G.cur.predDiag = predDiag(q, t); } finishStep(t); fail(t, `sequencer ${q.ph}: ${(q.events[q.events.length - 1] || {}).what || ""}`); return; }
    if (t > G.tPh + 15) { finishStep(t); fail(t, `step time-out (sequencer phase ${q.ph})`); } } }
// read-only diagnosis of a refused commanded decision (run ends at the failure): the planner's nominal swing posed exactly as the B1 decision poses it, and the bounded
// leg IK residual at each of its path samples with the planner's SOFT bounds and with the HARD limits (which constraint refuses the path, and where in the swing)
// which bounds of the planner's SOFT box the HARD-limit IK solution exceeds: the bounded IK's six solved coordinates (hip twist / flexion / abduction, knee flexion,
// ankle DF / inversion; ctrl/v2_stand.js legIKBounded) against spec joints[k].limits.soft — degrees beyond the soft bound (read-only)
function softViol(r, n) { const ks = C.legK[n], L = ks.map(k => spec.joints[k].limits.soft), lo = [L[0].lo[0], L[0].lo[1], L[0].lo[2], L[1].lo[1], L[2].lo[1], L[2].lo[2]], hi = [L[0].hi[0], L[0].hi[1], L[0].hi[2], L[1].hi[1], L[2].hi[1], L[2].hi[2]];
  const nm = ["hip.twist", "hip.flex", "hip.abd", "knee.flex", "ankle.df", "ankle.inv"], out = {}; r.x.forEach((v, i) => { const e = v < lo[i] ? v - lo[i] : v > hi[i] ? v - hi[i] : 0; if (Math.abs(e) > 1e-9) out[nm[i]] = +(e * D).toFixed(2); }); return out; }
// read-only: the body model's own pose-dependent soft DF limit (sim/v2_passive.js COUPLING_LAWS: 20° + 15°·clamp(kneeFlex/90°, 0, 1), anatomical) at the hard solution's
// knee flexion vs. the DF that solution needs; and, for comparison only, the smallest toe-down foot pitch that makes the flat-sole pose feasible in the static soft box
function couplingDiag(rh, n, st, ev, pel, pose) { const ks = C.legK[n], jk = spec.joints[ks[1]], ja = spec.joints[ks[2]], kneeC = 70, dfC = -12.5, kf = rh.x[3] * D + kneeC, df = rh.x[4] * D + dfC, lim = 20 + 15 * Math.min(1, Math.max(0, kf / 90));
  const side = Q.rot(pose.rot, [1, 0, 0]), pitched = (deg) => ({ pos: pose.pos, rot: Q.mul(Q.axis(side, deg / D), pose.rot) });
  let ptc = null; for (const sg of [1, -1]) { let lo = 0, hi = 30; if (C.legIKBounded(st, ev, n, pel.pos, pel.rot, pitched(sg * hi), { limits: "soft", fallback: "none" }).err > 1e-6) continue;
    for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (C.legIKBounded(st, ev, n, pel.pos, pel.rot, pitched(sg * m), { limits: "soft", fallback: "none" }).err > 1e-6) lo = m; else hi = m; }
    const toeDrop = (() => { const P = solePts[n], R0 = pose.rot, R1 = pitched(sg * hi).rot, low = (R) => Math.min(...P.map(p => V.add(pose.pos, Q.rot(R, p))[1])); return +((low(R0) - low(R1)) * 1000).toFixed(2); })();
    if (!ptc || hi < Math.abs(ptc.deg)) ptc = { deg: +(sg * hi).toFixed(2), lowestPointDropMm: toeDrop }; }
  return { kneeFlexDeg: +kf.toFixed(2), dfNeededDeg: +df.toFixed(2), staticSoftDfDeg: 20, coupledSoftDfDeg: +lim.toFixed(2), withinCoupled: df <= lim + 1e-9, pitchAlternative: ptc }; }
// read-only diagnosis of a refused decision's capture prediction (the planner's own exported trajectory()): the nominal foothold with the swing seed T and the longest ramp,
// under the run's DS-plan duration and, for comparison, under other DS durations (FS.TdsCmd restored afterwards; the run ends at this failure)
function predDiag(q, t) { const n = q.n, A = q.A, fr = stepFrame(C, C.e2st, n), pose = candPose(A, fr, (q.cmd.nominal || {}).dx ?? DX, (q.cmd.nominal || {}).dy ?? 0, 0), T0 = FS2.TdsCmd, out = {};
  const X = q.ctx(t, "commanded", { nominal: q.cmd.nominal, Tseed: TSW, apex: APEX, apexZ: q.apexZ, knotT: 0.5 * TSW, liftDelay: FS2.liftDelayPlan, corridor: KIND });
  try { for (const Tds of [T0, 0.5976, 1.0682, 4.0]) { FS2.TdsCmd = Tds; const r = fsTrajectory(X, pose, TSW, FS2.TrGrid[0]); out["Tds=" + Tds.toFixed(4)] = { recovers: !!r.recovers, vrpOk: r.vrpOk ?? null, why: r.why || null, vrpWorstMm: r.vrpWorst != null ? +(r.vrpWorst * 1000).toFixed(2) : null, vrpOutS: r.vrpOut != null ? +r.vrpOut.toFixed(4) : null }; } }
  finally { FS2.TdsCmd = T0; }
  return out; }
function pathDiag(q) { const n = q.n, st = C.e2st, ev = C.e2ev, A = q.A, fr = stepFrame(C, st, n), goal = candPose(A, fr, KIND === "lateral" ? 0 : DX, KIND === "lateral" ? DY : 0, 0), L = liftRef(A, FS.liftDelayPlan), pel = swingFrame(C, st, n);
  const sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, goal, TSW, { z: q.apexZ, tk: 0.5 * TSW }), ks = C.legK[n], hip = V.add(pel.pos, Q.rot(pel.rot, C.anchor[ks[0]])), out = [];
  C._e2plan = (C._e2plan || 0) + 1; try { for (let i = 0; i < 11; i++) { const e = stepAt(sg, sg.T * i / 10), pose = { pos: e.pos, rot: e.rot }, rs = C.legIKBounded(st, ev, n, pel.pos, pel.rot, pose, { limits: "soft", fallback: "none" }), rh = C.legIKBounded(st, ev, n, pel.pos, pel.rot, pose, { limits: "hard", fallback: "none" });
    const cpl = rs.err > 1e-6 ? couplingDiag(rh, n, st, ev, pel, pose) : null;
    out.push({ i, phi: i / 10, softErr: +rs.err.toExponential(2), hardErr: +rh.err.toExponential(2), softViolHard: rs.err > 1e-6 ? softViol(rh, n) : null, coupling: cpl, hipToFootM: +V.dist(hip, e.pos).toFixed(4), footRelStance: r4([e.pos[0] - st[C.feet[1 - n]].pos[0], e.pos[1], e.pos[2] - st[C.feet[1 - n]].pos[2]]) }); } } finally { C._e2plan--; }
  return { goalRelStance: r4([goal.pos[0] - st[C.feet[1 - n]].pos[0], goal.pos[2] - st[C.feet[1 - n]].pos[2]]), legLen: +(V.len(C.anchor[ks[1]]) + V.len(C.anchor[ks[2]])).toFixed(4), samples: out }; }
function newStep(t) { const n = swingOf(G.k); G.cur = { k: G.k + 1, swing: "LR"[n], stance: "LR"[1 - n], tTransfer: t, transfer: { xiMarginMin: Infinity, slipMax: [0, 0], xiErrMax: 0, pStanceMinHi: Infinity, wouldAbort: null, shadowOut: 0, trailFzEnd: null }, m: null }; G.steps.push(G.cur);
  G.cur.transfer.start = { comV: +Math.hypot(C.info.v[0], C.info.v[2]).toFixed(4), xiDot: +Math.hypot(C.info.w0 * (C.info.xi[0] - C.info.p[0]), C.info.w0 * (C.info.xi[1] - C.info.p[1])).toFixed(4) };
  if (CF >= 1 && CF <= 3) { const I = C.info, m = 1 - n, rs = centroid2(I.polys[m]); G.cf = { m, rs, plan: cmdPlan({ t0: t, xi0: I.xi, xid0: [I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1])], rs, tTD: t + TTR }), last: null };
    C.e2seq = cfHold; G.cur.transfer.cf = { rs: r4(rs), xi0: r4(I.xi), dist: +(Math.hypot(rs[0] - I.xi[0], rs[1] - I.xi[1])).toFixed(4) }; }
  if (CF >= 4) { const m = 1 - n; if (!G.cf4 || G.cf4.nS !== m) G.cf4 = cf4Plan(t, m); const P = G.cf4; C.e2seq = cf4Hold; Object.assign(G.cur.transfer, { ...(CF === 5 ? { vFwdMin: Infinity } : {}), sat: 0, satWho: {}, dTau0Max: 0, dTau0Who: null, eClosPos: 0, pOutMax: 0, copOutMax: 0, hardMin: Infinity, hardWho: null, pelTiltMax: 0, foot0: FT.map(b => s.st[b].pos.slice()), footSlip: [0, 0] });
    G.cur.transfer.cf4 = { t0: r4(P.t0), fromAcceptedTouchdown: P.t0 < t - 1e-9, T: P.T, stanceCentroid: r4(P.c), xi0: r4(P.xi0), xid0: r4(P.xid0), xiE: r4(P.xiE), xidE: r4(P.xidE), leadM: +P.lead.toFixed(4), vMs: +W4.v.toFixed(4), w0: +P.w0.toFixed(4), distM: +Math.hypot(P.xiE[0] - P.xi0[0], P.xiE[1] - P.xi0[1]).toFixed(4) }; } }
function command(t) { const n = swingOf(G.k), q = (G.seq = C.e2seq = new StepSequencer(C)), st = s.st, I = C.info, m = 1 - n;
  let nominal = KIND === "lateral" ? { dx: 0, dy: DY, dz: 0 } : { dx: DX, dy: 0, dz: 0 }, walk = null;
  const w5 = CF === 5 ? ssDecide(t, n) : null;   // CF-5: the swing terminal state and the foothold from the current motion (ankle first)
  if (CF === 3 || CF >= 4) { const A = C.lc.target(n).pos, fr = stepFrame(C, C.e2st, n), W = WF, aW = [A[0] - W.m0[0], A[2] - W.m0[1]], Ps = st[FT[m]].pos, fwd = CF >= 4 ? (Ps[0] - W.m0[0]) * W.w[0] + (Ps[2] - W.m0[1]) * W.w[1] + (CF === 5 ? w5.step : SLEN) : aW[0] * W.w[0] + aW[1] * W.w[1] + DX, lat = (n === 1 ? 1 : -1) * W.W0 / 2;   // CF-4: step-through (S ahead of the stance foot)
    const T = [W.m0[0] + fwd * W.w[0] + lat * W.r[0], W.m0[1] + fwd * W.w[1] + lat * W.r[1]], d = [T[0] - A[0], T[1] - A[2]];
    nominal = { dx: d[0] * fr.f[0] + d[1] * fr.f[2], dy: d[0] * fr.o[0] + d[1] * fr.o[2], dz: 0 }; walk = { targetFwd: +fwd.toFixed(4), targetLat: +lat.toFixed(4), nominalDx: +nominal.dx.toFixed(4), nominalDy: +nominal.dy.toFixed(4) }; }
  const gs0 = CF >= 4 ? gaitState(t, n) : null; if (CF >= 4) G.cf4acc = false;
  const R = q.command(t, { n, kind: KIND, nominal, T: TSW, apex: APEX, diagNoClearance: true }), c0 = q.calls[0];
  const fwd = Q.rot(st[FT[m]].rot, [0, 0, 1]), fl = Math.hypot(fwd[0], fwd[2]), f = [fwd[0] / fl, fwd[2] / fl], lat = [f[1], -f[0]], rel = (p) => { const d = [p[0] - st[FT[m]].pos[0], p[2] - st[FT[m]].pos[2]]; return [d[0] * f[0] + d[1] * f[1], d[0] * lat[0] + d[1] * lat[1]]; };
  G.cur.cmd = { t: r4(t), walk, verdict: R.verdict, why: R.why || null, dx: c0 ? c0.dx : null, dy: c0 ? c0.dy : null, T: c0 ? c0.T : null, Tr: c0 ? c0.Tr : null, slack: c0 ? c0.slack : null, clearanceCert: c0 && c0.log ? c0.log.clearance || null : null, decisionLog: c0 && R.verdict !== "CERTIFIED_ONE_STEP" ? { log: c0.log || null, top: c0.top || null, cert: c0.cert || null } : null,
    // the state handed to this step (did the previous step leave a viable initial state?): stance-frame geometry, DCM inside the stance region, pelvis, COM velocity
    init: { swingRelStance: r4(rel(st[FT[n]].pos)), xiRelStance: r4(rel([I.xi[0], 0, I.xi[1]])), xiStanceMarginMm: +(polyDist(I.polys[m], I.xi) * 1000).toFixed(2), comV: r4(Math.hypot(I.v[0], I.v[2])),
      pelvisYawRelStance: +wrap(heading(st[PEL].rot) - heading(st[FT[m]].rot)).toFixed(3), feetYawDiff: +wrap(heading(st[FT[n]].rot) - heading(st[FT[m]].rot)).toFixed(3), pelvisTilt: +tilt(st[PEL].rot).toFixed(3),
      pelvisH: +st[PEL].pos[1].toFixed(4), stanceShare: I.share ? +I.share[m].toFixed(4) : null, swingState: C.lc.feet[n].state,
      pelvisYawDrift: pel0.yaw == null ? null : +wrap(heading(st[PEL].rot) - pel0.yaw).toFixed(3), footYawDrift: FT.map((b, j) => +wrap(heading(st[b].rot) - foot0[j].yaw).toFixed(3)),
      pelvisLatFromFeetMid: (() => { const mid = [(st[FT[0]].pos[0] + st[FT[1]].pos[0]) / 2, (st[FT[0]].pos[2] + st[FT[1]].pos[2]) / 2], d = [st[PEL].pos[0] - mid[0], st[PEL].pos[2] - mid[1]]; return +((d[0] * lat[0] + d[1] * lat[1]) * 1000).toFixed(2); })(),
      progress: r4(xz(st[PEL].pos).map((v, j) => v - xz(pel0.pos)[j])), feetSepInitialLatM: +(st[FT[1]].pos[0] - st[FT[0]].pos[0]).toFixed(4), walkFrame: WF ? (() => { const wc = (p) => { const d = [p[0] - WF.m0[0], p[2] - WF.m0[1]]; return [+(d[0] * WF.w[0] + d[1] * WF.w[1]).toFixed(4), +(d[0] * WF.r[0] + d[1] * WF.r[1]).toFixed(4)]; };
        return { footL: wc(st[FT[0]].pos), footR: wc(st[FT[1]].pos), widthM: +(wc(st[FT[1]].pos)[1] - wc(st[FT[0]].pos)[1]).toFixed(4), pelvis: wc(st[PEL].pos), xi: wc([I.xi[0], 0, I.xi[1]]), comV: [+(I.v[0] * WF.w[0] + I.v[2] * WF.w[1]).toFixed(4), +(I.v[0] * WF.r[0] + I.v[2] * WF.r[1]).toFixed(4)] }; })() : null,
      xiDot: +(Math.hypot(I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1]))).toFixed(4), feetSepInitialFwdM: +(st[FT[1]].pos[2] - st[FT[0]].pos[2]).toFixed(4), xiErrNow: I.xiRef ? +(d2(I.xi, I.xiRef) * 1000).toFixed(2) : null, comH: +I.c[1].toFixed(4), trailFz: +(C.sense.Fz[n] / (C.M * 9.81)).toFixed(4),
      transfer: G.cur.transfer ? { xiErrMaxMm: +(G.cur.transfer.xiErrMax * 1000).toFixed(2), xiSupMarginMinMm: +(G.cur.transfer.xiMarginMin * 1000).toFixed(2), pStarStanceMarginMinAtHighShareMm: Number.isFinite(G.cur.transfer.pStanceMinHi) ? +(G.cur.transfer.pStanceMinHi * 1000).toFixed(2) : null, wouldAbort: G.cur.transfer.wouldAbort, releaseAfterS: G.cur.transfer.tTouch != null && G.cur.transfer.tRel0 != null ? r4(G.cur.transfer.tTouch - G.cur.transfer.tRel0) : null, cf: G.cur.transfer.cf || null } : null } };
  if (CF === 5) { G.ss = R.verdict === "CERTIFIED_ONE_STEP" ? Object.assign(w5, { q }) : null; G.cur.cmd.walk5 = { ...w5.rec, ...(G.ss ? { chosenStepM: +((wcf([q.F.pos[0], q.F.pos[2]])[0] - wcf([st[FT[m]].pos[0], st[FT[m]].pos[2]])[0])).toFixed(4) } : {}) }; G.ring = []; }
  if (CF >= 4) { const x = G.cur.transfer; G.cur.cmd.swingInit = { ...gs0, sinceTransferStartS: r4(t - G.cf4.t0), planEndToReleaseS: x.tTouch != null && x.tPlanEnd != null ? r4(x.tTouch - x.tPlanEnd) : null, planEndToCommandS: x.tPlanEnd != null ? r4(t - x.tPlanEnd) : null,
    releasedBeforePlanEnd: x.tTouch != null && x.tPlanEnd != null && x.tTouch < x.tPlanEnd - 1e-9, cmdLeadM: G.cf4.lead }; }
  CF2.perStep = { used: 0, dfMax: -Infinity, marginMin: Infinity }; G.cur.m = { comVMax: 0, comVTD: null, pelRollMax: 0, pelPitchMax: 0, swTiltMax: 0, ankDfMax: -Infinity, dfMarginMin: Infinity, kneeFlexMax: -Infinity, stanceFoot0: { pos: st[FT[m]].pos.slice(), yaw: heading(st[FT[m]].rot) }, swingFoot0: st[FT[n]].pos.slice(), clrMin: Infinity, clrMinWin: Infinity, hMax: -Infinity, trkMax: 0, xiSupMin: Infinity, xiStanceMinSS: Infinity, pOutMax: 0, copOutMax: 0,
    xiErrMax: 0, pelTiltMax: 0, pelHMin: Infinity, hardMin: Infinity, hardWho: null, sat: 0, satWho: {}, dTau0Max: 0, dTau0Who: null, eClosPos: 0, eClosMax: 0, stanceSlip: 0, stanceTilt: 0, stanceYaw: 0, vTD: null, tdPos: null, liftShareMin: 1, vFwdMin: Infinity }; }
function finishStep(t) { const q = G.seq, c = G.cur, m = c.m, S = q.summary(), st = s.st, n = swingOf(G.k);
  const F = S.Fcmd || S.F; c.seq = { ph: q.ph, tAir: S.tAir, tTDm: S.tTDm, tAcc0: S.tAcc0, handBackT: S.handBackT, doneT: S.doneT, early: S.early, late: S.late, failedTD: S.failedTD, nocertSwing: S.nocertSwing, replans: S.calls.filter(x => /re-plan/.test(x.kind)).length,
    liftoffRecert: (S.calls.find(x => x.kind === "liftoff re-certification") || {}).verdict || null, liftoffRecertWhy: (S.calls.find(x => x.kind === "liftoff re-certification") || {}).why || null, events: S.events.map(e => [r4(e.t), e.what]) };
  const land = st[FT[n]].pos; c.result = { liftoff: S.tAir != null, liftDelay: S.tAir != null ? r4(S.tAir - c.cmd.t) : null, contact: S.tTDm != null, accepted: S.tAcc0 != null, done: q.ph === "DONE",
    phiContact: S.tTDm != null && S.tLo != null ? r4((S.tTDm - S.tLo) / S.T) : null, clearanceMinMm: Number.isFinite(m.clrMin) ? +m.clrMin.toFixed(2) : null, clearanceMinWinMm: Number.isFinite(m.clrMinWin) ? +m.clrMinWin.toFixed(2) : null, apexMm: Number.isFinite(m.hMax) ? +m.hMax.toFixed(2) : null,
    swingTrackMaxMm: +m.trkMax.toFixed(2), tdVel: m.vTD, tdPosErrMm: F && m.tdPos ? +(d2(xz(m.tdPos), xz(F.pos)) * 1000).toFixed(2) : null, finalPosErrMm: F ? +(d2(xz(land), xz(F.pos)) * 1000).toFixed(2) : null,
    stepLenMm: +(d2(xz(land), xz(m.swingFoot0)) * 1000).toFixed(1), stanceSlipMm: +(m.stanceSlip * 1000).toFixed(2), stanceTiltMaxDeg: +m.stanceTilt.toFixed(2), stanceYawDeg: +m.stanceYaw.toFixed(2),
    xiSupportMarginMinMm: +(m.xiSupMin * 1000).toFixed(2), xiStanceMarginMinSSmm: Number.isFinite(m.xiStanceMinSS) ? +(m.xiStanceMinSS * 1000).toFixed(2) : null, pStarOutsideMaxMm: +(m.pOutMax * 1000).toFixed(2), copOutsideMaxMm: +(m.copOutMax * 1000).toFixed(2),
    xiErrMaxMm: +(m.xiErrMax * 1000).toFixed(2), pelvisTiltMaxDeg: +m.pelTiltMax.toFixed(2), pelvisHminM: +m.pelHMin.toFixed(4), legHardMarginMinDeg: +m.hardMin.toFixed(2), legHardWho: m.hardWho, satAxisTicks: m.sat, satWho: m.satWho, dTau0MaxNm: +m.dTau0Max.toFixed(2), dTau0Who: m.dTau0Who,
    energyClosurePosJ: +m.eClosPos.toFixed(4), energyClosureMaxTickJ: +m.eClosMax.toFixed(4), liftShareMin: +m.liftShareMin.toFixed(4),
    swingFootTiltMaxDeg: +m.swTiltMax.toFixed(2), swingAnkleDfMaxDeg: Number.isFinite(m.ankDfMax) ? +m.ankDfMax.toFixed(2) : null, swingKneeFlexMaxDeg: Number.isFinite(m.kneeFlexMax) ? +m.kneeFlexMax.toFixed(2) : null,
    swingDfMarginToCoupledMinDeg: Number.isFinite(m.dfMarginMin) ? +m.dfMarginMin.toFixed(2) : null, swingDfOverStatic20Deg: Number.isFinite(m.ankDfMax) ? +(m.ankDfMax - 20).toFixed(2) : null,
    cf2: CF >= 2 && CF2.perStep ? { servoCoupledSolves: CF2.perStep.used, dfMaxDeg: Number.isFinite(CF2.perStep.dfMax) ? +CF2.perStep.dfMax.toFixed(2) : null, marginMinDeg: Number.isFinite(CF2.perStep.marginMin) ? +CF2.perStep.marginMin.toFixed(2) : null } : null,
    landedSupport: S.events.some(e => /landed foot SUPPORT/.test(e.what)), comVMax: +m.comVMax.toFixed(4), comVAtTouchdown: m.comVTD, pelvisRollMaxDeg: +m.pelRollMax.toFixed(2), pelvisPitchMaxDeg: +m.pelPitchMax.toFixed(2),
    touchdownToSupportS: (() => { const e = S.events.find(x => /landed foot SUPPORT/.test(x.what)); return e && S.tTDm != null ? r4(e.t - S.tTDm) : null; })(), commandToLiftoffS: S.tAir != null ? r4(S.tAir - c.cmd.t) : null,
    walkLanding: WF && (q.ph === "DONE" || (CF >= 4 && q.ph === "DS")) ? (() => { const d = [land[0] - WF.m0[0], land[2] - WF.m0[1]], fw = d[0] * WF.w[0] + d[1] * WF.w[1], la = d[0] * WF.r[0] + d[1] * WF.r[1], W = c.cmd && c.cmd.walk; return { fwd: +fw.toFixed(4), lat: +la.toFixed(4), latErrMm: W ? +((la - W.targetLat) * 1000).toFixed(2) : null, fwdErrMm: W ? +((fw - W.targetFwd) * 1000).toFixed(2) : null }; })() : null,
    tAcceptToSupport: null, doneXiErrMm: q.ph === "DONE" && C.info.qsRef ? +(d2(C.info.xi, C.info.qsRef) * 1000).toFixed(2) : null, doneComV: q.ph === "DONE" ? r4(Math.hypot(C.info.v[0], C.info.v[2])) : null, durStep: r4(t - c.tTransfer) };
  if (CF >= 4) { c.result.done = c.result.landedSupport; c.result.cf4 = { atLift: m.atLift || null, atTouchdown: m.atTD || null, ...(CF === 5 ? { preTouchdown: m.preTD || null, afterAcceptance: q.ph === "DS" ? gaitState(t, n === 0 ? 1 : 0) : null, vFwdMinStepMmS: Number.isFinite(m.vFwdMin) ? +(m.vFwdMin * 1000).toFixed(2) : null, ssPlan: G.ss && G.ss.q === q ? G.ss.rec : null } : {}), stepPeriodS: S.tTDm != null && G.prevTD != null ? r4(S.tTDm - G.prevTD) : null, stopStep: G.k + 1 >= STEPS, transferOverrideFromAcceptS: G.cf4acc && G.cf4 ? r4(G.cf4.t0 - (S.tAcc0 ?? G.cf4.t0)) : null }; if (S.tTDm != null) G.prevTD = S.tTDm; }
  const R0 = c.result; // the complete physical lifecycle. Clearance = no swing-foot contact between the measured liftoff and the accepted touchdown (the sequencer records any earlier contact) with a
  // positive swing-window (φ 0.2–0.8) clearance; corrected 8 Oct (CF-3): the first form read the overall airborne minimum rounded to 0.01 mm, which includes the touchdown tick itself
  // (0.00 at the contact instant) — a measurement boundary artifact, never a contact during the swing (no earlier study had a step affected)
  R0.physical = !!(c.cmd && c.cmd.init.swingState === "TOUCHING" && R0.liftoff && R0.clearanceMinWinMm != null && R0.clearanceMinWinMm > 0 && !c.seq.early && R0.contact && R0.accepted && R0.landedSupport && R0.done);
  G.cur.m = null; }
// ── run ──
let foot0 = null, WF = null; const trace = [], pel0 = { yaw: null, pos: null }; let prevE = null, prevW = null, prevCmd = null, hashes = {}, footPrev = null;
const t0w = Date.now();
while (true) { if (!s.tick()) break; const t = s.n * dt, st = s.st, I = C.info, lcF = C.lc.feet; if (!I) continue;
  if (pel0.yaw == null && t >= 1) { pel0.yaw = heading(st[PEL].rot); pel0.pos = st[PEL].pos.slice(); foot0 = FT.map(b => ({ yaw: heading(st[b].rot), pos: st[b].pos.slice() }));
    const yb = (foot0[0].yaw + foot0[1].yaw) / 2 / D, w = [Math.sin(yb), Math.cos(yb)], r = [w[1], -w[0]], m0 = [(foot0[0].pos[0] + foot0[1].pos[0]) / 2, (foot0[0].pos[2] + foot0[1].pos[2]) / 2];
    WF = { yawDeg: +(yb * D).toFixed(4), w, r, m0, W0: (foot0[1].pos[0] - foot0[0].pos[0]) * r[0] + (foot0[1].pos[2] - foot0[0].pos[2]) * r[1] }; }
  const fin = st.every(b => b.pos.every(Number.isFinite) && b.rot.every(Number.isFinite)); if (!fin) fail(t, "non-finite body state");
  if (s.g2acc && s.g2acc.fallT != null && !G.fallSeen) { G.fallSeen = s.g2acc.fallT; fail(t, `FELL (sim definition: ${s.g2acc.firstOther ? "non-boot contact " + s.g2acc.firstOther : "COM < 70 % of start height"})`); }
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dClos = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W;
  let dC = 0, cWho = null; if (prevCmd && lastCmd) lastCmd.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p && Math.abs(r.tau0 - p.tau0) > dC) { dC = Math.abs(r.tau0 - p.tau0); cWho = spec.joints[k].name + "." + "xyz"[i]; } })); prevCmd = lastCmd;
  const n = swingOf(G.k), mS = 1 - n, pr = s.probeRows, Jy = pr.map(r => (r ? r.JyN : 0)), JT = Jy[0] + Jy[1];
  const copAll = JT > 1e-6 ? [0, 1].reduce((a, k) => (pr[k] && pr[k].cop ? [a[0] + Jy[k] * pr[k].cop[0] / JT, a[1] + Jy[k] * pr[k].cop[2] / JT] : a), [0, 0]) : null;
  // per-step measurement while a step is active
  if (G.cur && G.cur.m && G.ph === "STEP") { const m = G.cur.m, q = G.seq, sw = lcF[n].state, airborne = q.tAir != null && q.tTDm == null;
    if (q.tAir == null) m.liftShareMin = Math.min(m.liftShareMin, lcF[n].s ?? 1);
    if (airborne) { const qsA = qsOf(st), kA = JI(n === 0 ? "ankle_L" : "ankle_R"), kK = JI(n === 0 ? "knee_L" : "knee_R"), dfA = anat(kA, qsA, "df"), kfA = anat(kK, qsA, "flex");
      m.swTiltMax = Math.max(m.swTiltMax, tilt(st[FT[n]].rot)); m.ankDfMax = Math.max(m.ankDfMax, dfA); m.kneeFlexMax = Math.max(m.kneeFlexMax, kfA); m.dfMarginMin = Math.min(m.dfMarginMin, 20 + 15 * Math.min(1, Math.max(0, kfA / 90)) - dfA); }
    if (airborne) { const c = clearMm(n, st); m.clrMin = Math.min(m.clrMin, c); m.hMax = Math.max(m.hMax, c); const phi = (t - q.tLo) / q.T; if (phi >= 0.2 && phi <= 0.8) m.clrMinWin = Math.min(m.clrMinWin, c);
      const tg = lcF[n].swing; if (tg) m.trkMax = Math.max(m.trkMax, V.len(V.sub(st[FT[n]].pos, tg.pos)) * 1000); }
    { const vh = Math.hypot(I.v[0], I.v[2]); m.comVMax = Math.max(m.comVMax, vh); const u = Q.rot(st[PEL].rot, [0, 1, 0]), rr = WF ? WF.r : [1, 0], ww = WF ? WF.w : [0, 1]; m.pelRollMax = Math.max(m.pelRollMax, Math.abs(Math.asin(Math.max(-1, Math.min(1, u[0] * rr[0] + u[2] * rr[1]))) * D)); m.pelPitchMax = Math.max(m.pelPitchMax, Math.abs(Math.asin(Math.max(-1, Math.min(1, u[0] * ww[0] + u[2] * ww[1]))) * D)); if (q.tTDm != null && m.comVTD == null) m.comVTD = +vh.toFixed(4); }
    if (CF >= 4 && q.tAir != null && !m.atLift) m.atLift = gaitState(t, n); if (CF >= 4 && q.tTDm != null && !m.atTD) m.atTD = gaitState(t, n);
    if (CF === 5) { const vf = [I.v[0] * WF.w[0] + I.v[2] * WF.w[1], I.v[0] * WF.r[0] + I.v[2] * WF.r[1]], pv = st[PEL].v; m.vFwdMin = Math.min(m.vFwdMin, vf[0]);
      if (q.tTDm == null) { G.ring.push({ t: r4(t), comV: vf.map(v => +v.toFixed(4)), pelvisV: [+(pv[0] * WF.w[0] + pv[2] * WF.w[1]).toFixed(4), +(pv[0] * WF.r[0] + pv[2] * WF.r[1]).toFixed(4)] }); if (G.ring.length > 40) G.ring.shift(); }
      else if (!m.preTD) { const tg = q.tTDm - 0.1; m.preTD = G.ring.reduce((a, b) => (Math.abs(b.t - tg) < Math.abs(a.t - tg) ? b : a), G.ring[0] || { t: null }); }
      if (G.k + 1 > STEPS && q.tAir != null && G.stopAt == null) { G.cur.tail = true; G.ph = "END"; G.stopAt = t; } }   // the run tail: stop at step N + 1's measured liftoff
    if (q.tTDm != null && m.vTD == null) { const v = st[FT[n]].v; m.vTD = { down: +(-v[1]).toFixed(4), horiz: +Math.hypot(v[0], v[2]).toFixed(4) }; m.tdPos = st[FT[n]].pos.slice(); }
    const sf = st[FT[mS]]; m.stanceSlip = Math.max(m.stanceSlip, d2(xz(sf.pos), xz(m.stanceFoot0.pos))); m.stanceTilt = Math.max(m.stanceTilt, tilt(sf.rot)); m.stanceYaw = Math.max(m.stanceYaw, Math.abs(wrap(heading(sf.rot) - m.stanceFoot0.yaw)));
    m.xiSupMin = Math.min(m.xiSupMin, polyDist(I.support, I.xi)); if (airborne) m.xiStanceMinSS = Math.min(m.xiStanceMinSS, polyDist(I.polys[mS], I.xi));
    m.pOutMax = Math.max(m.pOutMax, -polyDist(I.support, I.pRaw)); if (copAll) m.copOutMax = Math.max(m.copOutMax, -polyDist(I.support, copAll));
    if (I.xiRef) m.xiErrMax = Math.max(m.xiErrMax, d2(I.xi, I.xiRef)); m.pelTiltMax = Math.max(m.pelTiltMax, tilt(st[PEL].rot)); m.pelHMin = Math.min(m.pelHMin, st[PEL].pos[1]);
    const qs = qsOf(st); for (const k of LEG) { const h = hardMargin(k, qs); if (h < m.hardMin) { m.hardMin = h; m.hardWho = spec.joints[k].name; } }
    for (const r of s.actRes || []) if (r.sat) { m.sat++; const nm = spec.joints[r.k].name + "." + "xyz"[r.i]; m.satWho[nm] = (m.satWho[nm] || 0) + 1; }
    if (dC > m.dTau0Max) { m.dTau0Max = dC; m.dTau0Who = cWho; } if (dClos > 0) m.eClosPos += dClos; m.eClosMax = Math.max(m.eClosMax, dClos);
    if (m.stanceSlip > 0.02) fail(t, `stance foot relocated ${(m.stanceSlip * 1000).toFixed(1)} mm (> 20 mm, G2 "relocated")`); }
  if (G.cur && (G.ph === "TRANSFER" || G.ph === "RELEASE" || G.ph === "UNLOAD")) { const x = G.cur.transfer, mS2 = 1 - swingOf(G.k); x.xiMarginMin = Math.min(x.xiMarginMin, polyDist(I.support, I.xi)); if (I.xiRef) x.xiErrMax = Math.max(x.xiErrMax, d2(I.xi, I.xiRef));
    // shadow of the supervisor's stance-only test (gates/v2_g3.js supervised: share ≥ 0.85, p* > 10 mm outside the stance region for 20 ms) — records whether the CF suspension mattered
    // (CF-4: tested on the supervisor's own stance choice, the higher-share foot — a CF-4 transfer starts loaded on the OLD stance)
    const hi = I.lam != null && Math.max(I.lam, 1 - I.lam) >= 0.85, pm = polyDist(I.polys[CF >= 4 ? (I.lam > 0.5 ? 1 : 0) : mS2], I.pRaw); if (hi) { x.pStanceMinHi = Math.min(x.pStanceMinHi, pm); x.shadowOut = pm < -0.01 ? x.shadowOut + dt : 0; if (x.shadowOut >= 0.02 - 1e-9 && !x.wouldAbort) x.wouldAbort = { t: r4(t), phase: G.ph, pStarOutMm: +(-pm * 1000).toFixed(2) }; } else x.shadowOut = 0;
    if (CF >= 4) { if (CF === 5) x.vFwdMin = Math.min(x.vFwdMin, I.v[0] * WF.w[0] + I.v[2] * WF.w[1]); for (const r of s.actRes || []) if (r.sat) { x.sat++; const nm = spec.joints[r.k].name + "." + "xyz"[r.i]; x.satWho[nm] = (x.satWho[nm] || 0) + 1; } if (dC > x.dTau0Max) { x.dTau0Max = dC; x.dTau0Who = cWho; } if (dClos > 0) x.eClosPos += dClos;
      x.pOutMax = Math.max(x.pOutMax, -polyDist(I.support, I.pRaw)); if (copAll) x.copOutMax = Math.max(x.copOutMax, -polyDist(I.support, copAll)); x.pelTiltMax = Math.max(x.pelTiltMax, tilt(st[PEL].rot));
      const qs = qsOf(st); for (const k of LEG) { const h = hardMargin(k, qs); if (h < x.hardMin) { x.hardMin = h; x.hardWho = spec.joints[k].name; } } for (const j of [0, 1]) x.footSlip[j] = Math.max(x.footSlip[j], d2(xz(st[FT[j]].pos), xz(x.foot0[j])));
      if (x.footSlip[mS2] > 0.02) fail(t, `stance foot relocated ${(x.footSlip[mS2] * 1000).toFixed(1)} mm during the transfer (> 20 mm, G2 "relocated")`); }
    if ((G.ph === "RELEASE" || G.ph === "UNLOAD") && x.tRel0 == null) x.tRel0 = t; if (lcF[swingOf(G.k)].state === "TOUCHING" && x.tTouch == null) x.tTouch = t; x.trailFzEnd = +(C.sense.Fz[swingOf(G.k)] / (C.M * 9.81)).toFixed(4); }
  if (TRACE > 0 && s.n % TRACE === 0) trace.push([r4(t), G.k + 1, G.ph, G.seq ? G.seq.ph : null, lcF.map(f => f.state), r4(lcF.map(f => f.s)), r4(I.lam), r4(I.xi), r4(I.xiRef), r4(I.pRaw), r4(copAll), r4(I.c), r4(I.v),
    r4(st[PEL].pos), +(pel0.yaw == null ? 0 : wrap(heading(st[PEL].rot) - pel0.yaw)).toFixed(3), +tilt(st[PEL].rot).toFixed(3), r4(st[FT[0]].pos), r4(st[FT[1]].pos), +clearMm(0, st).toFixed(2), +clearMm(1, st).toFixed(2), +(polyDist(I.support, I.xi) * 1000).toFixed(2), +dC.toFixed(2), +dClos.toFixed(5), r4(C.sense.Fz.map(x => x / (C.M * 9.81))), I.share ? r4(I.share) : null, C.sense.touch.slice(), +(polyDist(I.polys[0], I.xi) * 1000).toFixed(2), +(polyDist(I.polys[1], I.xi) * 1000).toFixed(2), +(polyDist(I.polys[0], I.pRaw) * 1000).toFixed(2), +(polyDist(I.polys[1], I.pRaw) * 1000).toFixed(2), I.xiRefDot ? r4(I.xiRefDot) : null]);
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (G.stopAt != null && t >= G.stopAt - 1e-9) break; }
if (G.cur && G.cur.m && G.seq) finishStep(s.n * dt);
let physical = 0; for (const x of G.steps) { if (x.result && x.result.physical) physical++; else break; }
const done = G.steps.filter(x => x.result && x.result.done).length, out = { walkingFrame: WF ? { yawDeg: WF.yawDeg, w: r4(WF.w), r: r4(WF.r), m0: r4(WF.m0), W0: +WF.W0.toFixed(4) } : null, physicalSteps: physical, cf2Totals: CF >= 2 ? { coupledSolves: CF2.used, plannerSolves: CF2.planner, refused: CF2.refused, dfMaxDeg: Number.isFinite(CF2.dfMax) ? +CF2.dfMax.toFixed(2) : null, marginMinDeg: Number.isFinite(CF2.marginMin) ? +CF2.marginMin.toFixed(2) : null } : null, generated: "tools/loco_probe.mjs", diagnostic: true, note: "DIAGNOSTIC locomotion viability probe — not a qualification; no criterion, mechanism or verdict of E2 is affected",
  run: { human: HUMAN, first: FIRST, steps: STEPS, kind: KIND, relMax: RELMAX, cf: CF === 5 ? "CF-5 on CF-4 (one walking swing / foothold plan: periodic DCM offsets, foothold from the predicted touchdown DCM, constant-VRP single-support reference; diagnostic only)" : CF === 4 ? "CF-4 on CF-2 + CF-3 (direct stance-to-stance transfer + planned trailing-foot unloading, step-through on the walking frame; diagnostic only)" : CF === 3 ? "CF-1 + CF-2 + CF-3 (counterfactual transfer + coupled soft-limit trailing-leg IK + walking frame; diagnostic only)" : CF === 2 ? "CF-1 + CF-2 (counterfactual transfer + coupled soft-limit trailing-leg IK; diagnostic only)" : CF ? "CF-1 (counterfactual between-steps transfer; diagnostic only)" : null, dy: KIND === "lateral" ? DY : 0, hz: HZ, config: CONFIG, dx: DX, Ttr: TTR, rel: REL, Tds: TDS, TdsDesign: TDS0, Tsw: TSW, apex: APEX, ...(CF === 4 ? { cf4: { Tst: TST, S: SLEN, vMs: +W4.v.toFixed(5), stepPeriodNominalS: +(TST + FS.liftDelayPlan + TSW).toFixed(4), release: "step commanded at the lifecycle's measured release (TOUCHING); --rel unused", finalStep: "sequencer's own DS plan (stop)" } } : {}),
    ...(CF === 5 ? { cf5: { Tst: TST, S: SLEN, walkPlan: WK ? { w: +WK.w.toFixed(4), Ts: +WK.Ts.toFixed(4), Es: +WK.Es.toFixed(4), eTau: +WK.eTau.toFixed(4), sigmaFwdMm: +(WK.sx * 1000).toFixed(3), sigmaLatMm: +(WK.sy * 1000).toFixed(3), dTouchdownBehindNewFootMm: +(WK.dTD * 1000).toFixed(2), latTouchdownTowardNewFootMm: +(WK.latTD * 1000).toFixed(2) } : null, release: "step commanded at the lifecycle's measured release (TOUCHING)", runEnd: "stops at step N + 1's measured liftoff (tail, not a step)" } } : {}), clearance: "computed and logged, not enforced (diagNoClearance; placeholder allowance 0/0/0)" },
  completed: done, fail: G.fail, steps: G.steps, endT: r4(s.n * dt), hashEnd: (s.h >>> 0).toString(16).padStart(8, "0"), hashes, wallS: (Date.now() - t0w) / 1000, mass: C.M,
  traceCols: ["t", "step", "ph", "seq", "states", "shares", "lamR", "xi", "xiRef", "pStar", "cop", "com", "comV", "pelvis", "pelvisYawDrift", "pelvisTilt", "footL", "footR", "clrL", "clrR", "xiSupMarginMm", "dTau0", "dClos", "FzBW", "cmdShare", "touchPieces", "xiMarginL_mm", "xiMarginR_mm", "pStarMarginL_mm", "pStarMarginR_mm", "xiRefDot"], trace };
s.destroy(); if (OUT) fs.writeFileSync(OUT, OUT.endsWith(".gz") ? zlib.gzipSync(JSON.stringify(out)) : JSON.stringify(out));
console.log(`LOCO${CF === 5 ? " CF-5" : CF === 4 ? " CF-4" : CF === 3 ? " CF-3" : CF === 2 ? " CF-2" : CF ? " CF-1" : ""} ${HUMAN} ${KIND} first ${FIRST} [${CF === 5 ? `Tst ${TST} S ${SLEN} walk-plan` : CF === 4 ? `Tst ${TST} S ${SLEN} v ${W4.v.toFixed(4)}` : `Ttr ${TTR} rel ${REL} Tds ${TDS}`} Tsw ${TSW}]: ${done}/${STEPS} steps DONE (${physical} consecutive physical); ${G.fail ? `FAIL step ${G.fail.step} @ ${G.fail.t.toFixed(3)} s (${G.fail.phase}): ${G.fail.why}` : "no failure"}; end ${out.endT} s; wall ${out.wallS.toFixed(0)} s; hash ${out.hashEnd}`);

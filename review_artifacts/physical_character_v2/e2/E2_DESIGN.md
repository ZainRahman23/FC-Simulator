# E2: first single step and capture-aware recovery step — architecture (for review; not implemented)

**Authority:** user decision 2026-10-05 (`../sources/2026-10-05_user_decision_p15_split_close_e1b_e2_prep.md`).

**Minimum target:** stable support → weight transfer → physical liftoff → capture-aware foot placement → smooth swing → measured touchdown → load acceptance → stable support. One step, no continuous walking. The P15 STEP_REQUIRED cases are recovery-step tests alongside short forward and lateral steps.

**Base configuration:** the E1b-closing configuration **PSTAR4** (PSTAR + footYaw + lcPutDown + abortCapture 2; `../e1b_close/`). Every E2 mechanism is a new default-off option; with them off the code is bit-identical (KV0, PSTAR4 runs hash-identical).

**Research used:**
- `research/E2_REUSE_STUDY.md` (PyPnC / IHMC / BLF / walking-controllers, DCM first step);
- `research/FOOT_PLACEMENT_SPEC.md` (IHMC capture region + step adjustment, Khadiv, Griffin, walking-controllers step adaptation);
- `../e1b_fix/research/SWING_PUTDOWN_STUDY.md` (BLF SwingFootPlanner, IHMC soft touchdown);
- `../p15_capture/` and `../e1b_ta/` (capture-time model, acceptance pipeline, T-A).

## 1. Reuse map: external mechanism → problem → Touchline equivalent → adaptation → invariant / regression risk

| external mechanism | problem it solves | Touchline equivalent | adaptation | invariant / risk |
|---|---|---|---|---|
| IHMC TransferState gate; PyPnC contact transition | do not start single support while the DCM is not over the stance foot | E1b transfer (λ min-jerk 4 s) + release (UNLOADING → TOUCHING ≥ 0.5 s) | **reuse unchanged** (validated in E1a / E1b) | release only on measured load; never time-triggered |
| BLF `PlannedContact` vs `EstimatedContact` | plan and estimate kept separate | step sequencer intents vs the lifecycle | the sequencer only **requests**; state changes come from the lifecycle (Jolt contact / load) | liftoff, touchdown and support are never inferred from the plan |
| walking-controllers d-parameter DCM plan with d = 0 (quasi-static); IHMC flamingo | DCM reference for a slow first step | ξ_ref at the stance foot during swing (as the E1b hover) | **reuse** the E1b single-support reference; a dynamic DCM plan (d > 0) is deferred beyond E2 | ξ inside the stance region during swing (E1a-5) |
| BLF `SwingFootPlanner` (min-jerk; planar quintic + z spline through an apex; landing velocity) | smooth, C2 swing from the current reference state | `ctrl/v2_swing.js` (quintic segment, validated in the put-down) | add the **via-apex z spline** (BLF's C2 interior-knot solve; apex time α = 0.5; landing velocity 0); xy quintic to the foothold, ending at rest | C2 reference; target never steps; contact-consistent velocity feed-forward (lcVff) unchanged |
| IHMC `OneStepCaptureRegionCalculator` + safety heuristics + reachability octagon + `ErrorBasedStepAdjustmentController` (Koolen 2012) | where to put the foot so the DCM is capturable at touchdown | new `ctrl/v2_footstep.js` (pure geometry, deterministic) | **port unchanged in substance:** CoP shrink 0.02 / 0.05 / 0.01 / 0.03 m; SH d_all 0.02, d_in 0.05, d_x 0.05; R_k = 1.5·L; deadband 0.02 m; freeze when t_rem < 0.02 s; infeasible → Π_R(Π_C(p)) + flag. **Touchline adaptation:** T = remaining swing + `acceptDebounce` + T_r/2, the time until the CoP clamp includes the new foot. IHMC loads at touchdown; Touchline accepts after the debounce and ramp (`FOOT_PLACEMENT_SPEC.md` §5) | adjustment stops at measured contact; re-plan of the swing from the current reference state |
| IHMC reachability (L, w_min, w_max, w_in) | do not command unreachable footholds | the leg IK certificate (`tools/ik_cert_core.mjs`, R6) | octagon from **Valkyrie-SCS values scaled by stance width** (0.19 / 0.25): L 0.456, w_min 0.114, w_max 0.304, w_in 0.19 m. **Each body's octagon vertices are checked with the IK certificate before the first run**; infeasible vertices are pulled in to the certified boundary (procedure preregistered, values recorded) | no anatomically invalid foothold |
| T-A acceptance (this project) + IHMC "support on the measured switch" + PyPnC 0.225 s ramp | load the landed foot promptly but smoothly, physics-authoritative | lifecycle intent + per-foot ramp + abort-transition floor rule (PSTAR4) | **reuse** for the recovery step. For planned steps the final transfer's λ request drives acceptance, as in the validated E1b replace | no load before sustained measured contact (TA-1) |
| IHMC touchdown re-plan from the measured sole | the plan follows the real foothold | lifecycle `landed()` re-captures the anchor at TOUCHDOWN | reuse | — |
| PyPnC / IHMC final transfer (cubic from the measured DCM) | weight back to the new double support | E1b λ return (min-jerk 4 s, analytic dcmFF) | **Touchline adaptation A1 (`xiRef2D`):** the λ-weighted reference point in 2-D (lateral **and** AP) with the analytic rate along the full separation vector. The current controller shifts ξ_ref by λ only laterally; its AP part follows the s-weighted ankle midpoint, which would step by half the step length within the acceptance ramp after a forward step | continuous ξ_ref; must be identical in effect for side-by-side feet (E1a / E1b regression) |
| IHMC FlamingoStanceState / P15 split | a beyond-envelope push in single support | supervisor abort (T-A); class B = STEP_REQUIRED | **Touchline adaptation A5 (`recoveryStep`):** when T-A's verdict at the end of the disturbance is "step required", the abort commands a **capture-aware step** (foothold from the IHMC region; swing from the current reference state) instead of the in-place put-down. Class A (in place) is unchanged | no change to E1b class-A behaviour |

## 2. Step sequencer (`ctrl/v2_step.js`; option `step`)

A deterministic intent machine. Every transition except the commanded swing start is a **measured lifecycle event**. Timeouts abort to double support.

| state | entry | what the sequencer requests | exit (measured) | timeout → action |
|---|---|---|---|---|
| DS_SETTLE | start | λ = 0.5 | both SUPPORT for 1 s | — |
| TRANSFER | — | λ: 0.5 → stance 1.0 (min-jerk 4 s, as E1b) | λ ramp done | — |
| PRE_SWING | — | stance request 1.0 | swing foot TOUCHING ≥ 0.5 s and ξ inside the stance region by ≥ 1 cm | 2 s → abort to DS |
| SWING | foothold planned (nominal ± capture adjustment) | swing target = BLF trajectory (lift via apex to the foothold) | **AIRBORNE** observed (physical liftoff) and then **TOUCHDOWN** after ≥ 60 % of the swing (IHMC minimum swing fraction) | no AIRBORNE within 0.3 s of the swing start → abort (lifted foot back to its anchor); no TOUCHDOWN by swing end + 0.3 s → hold the target (no contact declared) and flag |
| LOAD_ACCEPT | TOUCHDOWN | planned step: λ return to 0.5 (min-jerk 4 s, `xiRef2D`); recovery step: T-A intent + capture-timed ramp | landed foot SUPPORT | — |
| DS | both SUPPORT | λ = 0.5 | end of run | — |

- The capture-aware placement (IHMC error-based adjustment) runs every SWING tick while the swing foot is unloaded. For an undisturbed planned step ξ stays inside the stance region, so the region is the whole reachable set and the nominal foothold is kept.
- Recovery step (class B): entered from the abort (T-A verdict "step required" at the end of the disturbance) with the foot already airborne.
  - The foothold comes from the region with T as in §1.
  - The swing duration is the T-A descent bound (0.20–0.302 s) under the same equal-fraction rule; the capture model's landing region is translated to the planned foothold.
  - Acceptance is T-A's.

## 3. Parameters (fixed in the preregistration)

| parameter | value | basis |
|---|---|---|
| planned step lengths | forward 0.10 m; lateral outward 0.08 m (stance width 0.19 → 0.27 m) | "short step" in the reuse studies (step 0.10–0.20 m) |
| swing duration (planned) | 0.60 s | IHMC Zulu / Atlas-sim default 0.6 s; earlier study range 0.6–0.8 s; bandwidth check ≈ 2.5 mm tracking for 0.10 m |
| apex height / time | 0.025 m at α = 0.5 | IHMC / Valkyrie minimum 0.025, walking-controllers 0.025 (short steps); BLF apex 0.5; E1b hover 20 mm validated |
| landing velocity | 0 | BLF default; the validated put-down (§2.2 of `E1B_FIX_DESIGN.md`) |
| minimum swing fraction for touchdown acceptance | 0.6 | IHMC `SingleSupportState` |
| capture adjustment constants | IHMC defaults as in §1 | `FOOT_PLACEMENT_SPEC.md` |
| reach octagon | scaled Valkyrie-SCS, certified per body | §1 |
| recovery swing | T-A bounds and rule (0.20–0.302 s, ramp 0.10–0.225 s, margin 0.04 s before contact) | `../e1b_ta/`, `../e1b_close/` |

## 4. What E2 must not do

- No continuous walking; no dynamic DCM plan beyond one step.
- No contact, support or liftoff inferred from the plan.
- No timeout-declared contact.
- No change to anatomy, passive tissue, capacities, the lifecycle constants or E1b class-A behaviour.
- No new foot-placement algorithm (IHMC's is ported).
- No tuning on E2 outcomes.

## 5. Known risks (declared before implementation)

1. `xiRef2D` changes the AP reference behaviour. Expected to be inert for side-by-side feet, to be verified by the E1a / E1b and G0–G3 regressions.
2. A 0.10 m forward step changes the support geometry the posture / IK references were built for. The support legs use "foot where it is", but the posture reference (comAhead along the heading from the support midpoint) has not been exercised with a staggered stance.
3. Recovery-step reach for V2-165-62: IHMC-style placement predicts a few cm outward shift (`FOOT_PLACEMENT_SPEC.md` §4), well inside the scaled reach. Swing time from a 20 mm hover is bounded below at 0.20 s.
4. Swing-foot toe stub at a 25 mm apex on a 0.10 m forward step: clearance is monitored (criterion E2-3).

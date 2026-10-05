# IHMC single-support emergency handling (delegated study, 2026-10-05; recorded in substance)

**Sources:**
- `ihmc-open-robotics-software` develop@1dfb74b (sparse clone; only Zulu is present);
- Atlas / Valkyrie parameters from tag `quickster-stable-oct-2023` (raw files in `$S/ext/ihmc_remote/`); Nadia is not public;
- `C/` = `ihmc-common-walking-control-modules/src/main/java/us/ihmc/commonWalkingControlModules/`.

Line references were verified by the reviewer. The license is Apache-2.0: ideas and equations only, no code copied.

## 1. Walking single support (WalkingSingleSupportState)

### a. Swing speed-up (exists)

- **Trigger:** |ICP − ICP_des| > `icpErrorThresholdToSpeedUpSwing` [C/capturePoint/BalanceManager.java:534-538], evaluated only while the swing foot is not load-bearing.
- **Amount:** Δt = ln(|CMP − ICP_proj| / |CMP − ICP_des|)/ω0, with the ICP projected onto the desired → end-of-swing ICP segment [C/capturePoint/TimeAdjustmentCalculator.java:14-44].
  - The result is NaN, and so 0, for a stationary plan.
  - So **a purely lateral error, or a standing / hover plan, gives roughly no speed-up.**
- **Application:**
  - a time warp t += factor·dt, with velocity × factor and acceleration × factor² [C/controlModules/foot/SwingState.java:445-497];
  - the factor only increases and is clamped to swingTime / minSwingTime [:555-566, 735].
- **Per robot:**
  - Zulu: 0.05 m threshold, minimum swing 0.45 s real / 0.35 s sim;
  - Atlas: 0.05 m, minimum 0.6 / 0.3 s;
  - Valkyrie: 0.05 m, minimum 0.70 / 0.30 s.

### b. Step location adjustment (exists; geometric)

`ErrorBasedStepAdjustmentController`:
- **One-step capture region:** predicted touchdown ICP = CoP + (ICP − CoP)e^{ωT}, with T = max(t_remaining, 0.05), over the shrunk stance-foot CoP area (front 0.02 / back 0.05 / inside 0.01 / outside 0.03 m) [C/captureRegion/OneStepCaptureRegionCalculator.java:199-263; StepAdjustmentParameters.java:55-82].
- **Projection:** the nominal step is projected into reachable ∩ capture region [ErrorBasedStepAdjustmentController.java:509-530].
- **Late adjustment:** Atlas / Zulu keep adjusting until 0.2 s past the nominal swing end.
- **No crossover.** The swing target is rate-limited to 10 m/s.
- The old ICPOptimization QP has been removed. No Griffin-2017 joint timing / location optimiser is present in this code.

### c. Before measured touchdown: plan only

- The CoP / DCM plan starts the transfer at the **planned** touchdown time.
- A late touchdown freezes the plan clock.
- The swing ends with downward velocity and keeps descending ("soft touchdown": Atlas sim −0.3 m/s, −2 m/s²; Zulu −0.15 m/s).
- **No pre-loading:** in SWING all contact points are false, so the QP cannot load the foot.
- `TouchDownState`, which has rho ramping, is **dead code** (not registered).

### d. Load acceptance

- **Trigger:** filtered foot switch AND swing fraction > 0.6 → `triggerTouchdown()` → the foot is FULL.
- **Full normal force immediately; there is no ramp-in.** Support polygons are updated in the same tick [WalkingSingleSupportState.java:399-451; FeetManager.java:435-445; SupportState.java:262-267].
- Only the trailing foot is ramped off. There is no emergency-shortened acceptance path.

### e. Too large

- **Fall:** ICP > 0.15 m from the feet polygon and from the desired ICP → falling state.
- `PushRecoveryControlModule` is unwired.
- **Operator AbortWalking:** the mid-swing exit sets the swing foot FULL **without measurement**. This contradicts Touchline's contact rule and is not adopted.

## 2. FlamingoStanceState: standing on one foot with the other lifted (Touchline's E1b / P15 situation)

[C/…/states/FlamingoStanceState.java:86-128, 161-206]

- **Condition:** ICP error > 0.05 m, AND the ICP outside the stance polygon by > 2 cm, AND inside the two-foot hull (lifted foot at its current XY).
- **Action:** `requestMoveStraightTouchdownForDisturbanceRecovery`.
  - A **straight-down** quadratic from the last commanded ankle position, starting at touchdown velocity / acceleration (SoftTouchdownPositionTrajectoryGenerator).
  - **The foothold is kept: there is no step adjustment in flamingo.**
  - The reviewer's estimate for a 20 mm hover: about 0.056 s (Atlas-sim values), 0.085 s (Zulu), 0.124 s (Valkyrie-real) to ground.
- **Then:**
  - the ICP plan is re-initialised to hold the CoM in double support (load timings 1.2 / 0.8 s);
  - the foot becomes support on the **measured** foot switch, or after a 1.2 s timeout (the timeout declares contact without measurement and is not adopted).
- **Otherwise:** if the ICP is > 0.15 m outside the stance polygon, the controller reports falling.
- Touchdown acceptance requires time in state > 0.6 · default swing time.

## 3. Contact semantics (IHMC)

| notion | IHMC |
|---|---|
| commanding toward contact | the swing / soft-touchdown plan: ends moving down, keeps descending |
| anticipating contact | plan only: the CoP / DCM transfer starts at the planned touchdown; step adjustment uses the remaining time. **Not in the QP contact set** |
| measured contact | `WrenchBasedFootSwitch`: (Fz > low [glitch 2] ∧ CoP inside by a margin [glitch 3]) ∨ Fz > high, then a final glitch filter of 2, i.e. about 1–3 ticks. Thresholds: Atlas 5 (SCS) / 80 N low, 180 / 220 N high; Zulu 50 / 75 N |
| accepting load | measurement-gated (switch ∧ fraction > 0.6); **full force immediately** |
| declaring support | the same event. **The new foot enters the CMP / ICP feedback polygon on the same tick the filtered switch turns true** |

Exceptions where contact is declared without measurement: abort mid-swing; the flamingo 1.2 s timeout. Both are rejected for Touchline.

**Literature verified in code comments:** Koolen et al. 2012 Part 2 (capture region). Griffin 2017, Koolen 2016, Englsberger 2015 and Pratt 2006 are not cited in this code.

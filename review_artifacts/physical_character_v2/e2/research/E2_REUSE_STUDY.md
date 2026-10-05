# E2 first-step study: PyPnC, IHMC, BLF / walking-controllers, DCM (delegated; recorded unchanged in substance)

**What this is:** a study by a research subagent, 2026-10-05, made from shallow clones read directly (not run).

| repository | commit | licence |
|---|---|---|
| PyPnC | 6ac1ebd | MIT |
| IHMC open robotics software | develop@1dfb74b | Apache-2.0 (README) |
| BLF | bae8264 | BSD-3 |
| walking-controllers | 1588924 | BSD-3 |
| unicycle-footstep-planner | dbfb496 | BSD-3 |

All five are permissive. Porting equations needs nothing; copying code means keeping the notices (and IHMC's Apache NOTICE and a change statement).

## Key mechanisms

### PyPnC (Atlas)

**State machine:** STAND → BALANCE → CONTACT_TRANS_START → CONTACT_TRANS_END → SWING.
- Transitions are **time-based**.
- Swing ends early if contact is seen after ≥ 50 % of T_ss.
- In simulation, "contact" is kinematic: sole height ≤ 1 cm.

**Timing:** T_ds 0.45 s, α 0.5, T_ss 0.75 s, swing height 5 cm.

**`ReactionForceManager`:** linear ramps on the QP normal-force ceiling.
- The swing foot ramps to 0.001 N over (1 − α)T_ds and back over αT_ds.
- The swing foot stays in the contact list.

**`TaskHierarchyManager`:** foot-task weight 60 → 40 on the same schedule.

**`DCMPlanner`** (Englsberger 2015), with b = 1/ω:
- ξ̇ = (ξ − r_vrp)/b;
- backward recursion ξ_ini,i = r_vrp,i + e^{−T_i/b}(ξ_eos,i − r_vrp,i);
- double support uses cubic Hermite segments;
- **the first segment starts at the measured DCM and its rate**;
- the COM is integrated from ξ_ref, and tracked by a COM task with no DCM feedback.

**`FootTrajectoryManager`:** two cubic Hermite segments through a 5 cm apex.
- **Defect: its velocity feed-forward is not scaled by 2/T. Do not copy it.**

### IHMC

**`WrenchBasedFootSwitch`:** touchdown = (fz > low threshold AND CoP ≥ margin inside the foot, glitch-filtered over 2–3 ticks) OR fz > high threshold. Load % is alpha-filtered.

**`SupportState`, barely loaded** (default threshold 0, i.e. opt-in): x, y and yaw are held by PD. **Vertical z is never position-held.** The QP's ρ_min sets a normal-force floor.

**`TransferState` unloading:**
- p = min((t/T − 0.5)/0.5, 1 − clamp(e_norm − 1, 0, 1)), where e_norm is an ellipse of the ICP error (Zulu radii: 3.5 cm forward, 1.5 cm inward).
- Transfer ends when the plan is done AND e_norm < 1, or when the ICP is more than 3 cm outside support.

**`WalkingCoPTrajectoryGenerator`:**
- first transfer: CoP to midfoot within ≤ 0.2 s, then to the stance entry CoP;
- swing: entry → ball → exit, with toe exit only for steps longer than 0.2 m;
- CoP kept ≥ 1 cm inside the foot.

**`SwingState`:**
- touchdown accepted only after > 60 % of swing AND the foot switch fires;
- terminal v_z = v_td / min(T_ss, 1) (Zulu v_td −0.15 m/s);
- "seek ground" past T_ss;
- the ICP plan is rebuilt from the measured sole pose at touchdown.

**`HeuristicICPController` (no QP):** CMP = ξ + (1 − α_ff)(CMP_perf − ξ_d) + K(ξ − ξ_d).

**Step adjustment** projects into the one-step capture region. **Fall** = ICP more than 0.15 m from both the polygon and the desired ICP.

**Timing:** initial transfer 1.0 s. Zulu: transfer 0.25 s, swing 0.6 s.

### BLF and walking-controllers

- **BLF `PlannedContact`** (pose + activation / deactivation times) is kept separate from **`EstimatedContact`**.
- **`TimeVaryingDCMPlanner` and `CentroidalMPC`** are IPOPT programs; not runtime-cheap.
- **`SchmittTrigger`:** on / off thresholds with dwell times.
- **`SwingFootPlanner`:** step height, apex time, landing / take-off velocity and acceleration, min-acceleration or min-jerk splines.
- **walking-controllers:** position-controlled IK, **plan-driven contacts**.
  - ergoCub settings: 1.3 s per step, DS : SS 0.3, step height 3.5 cm, landing −0.15 m/s.
  - First double support: a cubic DCM from the current DCM.
  - Last single support: ξ_end = (1 − d)·r_stance + d·r_landing, with d = 0.25.

### Theory

- **Englsberger tracking law:** ė = −k·e.
- **Koolen capture point:** r_ic = x + ẋ/ω; 0-step capturable if inside the support polygon; the one-step capture region.
- **Kajita preview control:** not used by the studied repositories.

## Mapping table

| external mechanism | problem solved | Touchline equivalent | adaptation | invariant / regression risk |
|---|---|---|---|---|
| PyPnC `ReactionForceManager` | no force discontinuity at contact transitions | λ request; UNLOADING / LOAD_ACCEPT | a time-ramped ceiling on the lever-rule share, starting from the measured share | Σλ = 1; gate on DCM error |
| IHMC unloading gate p | never unload faster than balance allows | λ ramp gate | scalar port | a time-only ramp unloads a foot that is still needed |
| PyPnC weights / walking-controllers PID schedule | a stiff hold fighting the unload | per-leg gain schedule | ramp with λ; swing gains at LIFTOFF | gains running ahead of unload let the foot slide |
| IHMC barely-loaded hold, z never position-held, ρ_min floor | keeps a light foot planted | TOUCHING hold | (in Touchline: the surface-anchored vertical + seat, plus contact-consistent velocity feed-forward, PS-2) | — |
| IHMC foot switch | robust touchdown | load hysteresis + TOUCHDOWN | CoP-inside margin + 2–3 tick dwell | 1 % BW is far below Zulu's 50 / 75 N: flicker risk |
| IHMC minimum swing fraction 0.6 | ignore scuffs | intent-gated acceptance | TOUCHDOWN acceptance only at s ≥ 0.6 | — |
| IHMC transfer exit | no single support while off balance | pre-swing gate | plan done AND e_norm < 1, plus swing load < 1 % BW, plus ξ inside the stance polygon | a time-triggered liftoff |
| PyPnC / Englsberger DCM recursion; unicycle first double support | consistent DCM reference from the measured state | DCM balance law inputs | closed form for one step; feed ξ_ref, ξ̇_ref and CoP_ff | the reference must start at the measured ξ |
| IHMC CoP plan | feasible CoP feed-forward | lever-rule CoP | CoP fixed at the stance anchor during swing in E2 | ankle saturation |
| IHMC / BLF / ergoCub swing | gentle, contact-seeking landing | swing servo + feed-forward | min-jerk x/y; z through an apex, terminal v_z −0.10 to −0.15 m/s, ≤ 0.25 s of seeking | impact spikes; pushing the body up |
| IHMC touchdown replan | use the real foothold | TOUCHDOWN → LOAD_ACCEPT | replan from the measured foot; ramp λ up over 0.2–0.3 s | a plan still referenced to the planned foothold |
| BLF planned vs estimated contact | plan / estimate separation | sequencer intents vs lifecycle | lifecycle events retime the plan; the plan never sets contact state | plan-driven contact |
| step adjustment / MPC | recovery | none in E2 | defer | scope creep |

## Recommended smallest E2 architecture

**Keep:** the lifecycle, the lever-rule CoP, λ, the DCM law (the analogue of IHMC's heuristic ICP controller), the swing servo, and inverse statics.

**Add:**
1. a step sequencer: DS_SETTLE → TRANSFER → PRE_SWING → SWING → LOAD_ACCEPT → FINAL_TRANSFER → DS, advanced by lifecycle events, with timeouts that abort to DS;
2. a single-step DCM generator;
3. a swing reference with terminal descent;
4. a touchdown replan.

**First-step plan** (ω ≈ 3.1–3.3; r_s = stance anchor; r_L = landing anchor; d = 0.25):
- **DCM targets:** ξ_TD = r_s + d(r_L − r_s) at touchdown; ξ_LO = r_s + e^{−ωT_ss}(ξ_TD − r_s) at liftoff.
- **1. Transfer** (T_tr = 1.0 s): cubic Hermite from (ξ_meas, 0) to (ξ_LO, ω(ξ_LO − r_s)).
- **2. Pre-swing** (last ≈ 0.25 s): ramp the λ ceiling. LIFTOFF intent only when the plan is done, e_norm < 1, the swing load is < 1 % BW for ≥ 3 ticks, and ξ is inside the shrunk stance polygon.
- **3. Swing** (T_ss = 0.6–0.75 s): ξ_ref(t) = r_s + e^{ω(t − T_ss)}(ξ_TD − r_s). Step 10–20 cm, apex 3.5–5 cm, terminal descent, seeking ≤ 0.25 s.
- **4. Touchdown:** s ≥ 0.6 AND physics contact AND load ≥ 3 % BW for 2–3 ticks AND CoP inside the foot. Record the placement error and replan.
- **5. Load accept** (0.2–0.3 s): ramp λ and the gains. Never latched.
- **6. Final transfer** (0.8–1.2 s): cubic to mid-feet.

**How established projects judge a step:**
- elliptic ICP error at pre-swing;
- placement error reported at touchdown;
- DCM / CoP tracking logs;
- viability (ICP more than 3 cm outside support forces a step; more than 0.15 m means fall).

**There is no impact criterion in any repository.** Proposed thresholds are the reviewer's suggestions, not established.

## Evidence gaps

- **No external stack is a finite-torque joint-PD body.** They are QP / WBC or position-controlled IK; all adaptations are reasoned.
- **None senses liftoff physically.** Even IHMC's liftoff is planned.
- Some theory equations are from memory and cross-checked against code.

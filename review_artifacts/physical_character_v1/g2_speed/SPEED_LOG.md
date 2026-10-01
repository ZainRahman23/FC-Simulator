# G2b forward-speed regulation + swing execution — working log (2026-10-01 late →)

User decisions (after the foot gate):
- Keep F0; F2h stays an opt-in variant.
- Fix the upstream mechanisms (speed regulation, swing execution) foot-agnostically.
- Classify failures; replace the fixed reach ceiling with reachability.
- Test progressively; then rerun F2h.

Every entry: question → measurement → finding. Everything is measured on the APPROVED body (F0), opt-in options only.
Promoted gates are re-checked by `tools/review/regress.sh`.

## 1. Instrumentation (`tools/g2walk_diag.js`)

Per step, the diagnostic records:
- **Decision:** the view's capture point vs the target x*; the start decision and every in-swing re-decision, with clamps.
- **Truth:** COM velocity and offset.
- **Execution:** final target vs achieved foothold; liftoff delay, air time, touchdown fraction; the following double support.
- **Dynamics:** the forward velocity at liftoff, touchdown and the next liftoff; per-foot braking and propulsive turf impulse per phase; plan tracking per phase.
- **Body:** trailing-leg extension at the swing start; saturation by joint.
- **Model:** the map's prediction error with the decided inputs and with the achieved inputs.
- **Swing quality:** mid-swing toe clearance, re-contacts, foot velocity at touchdown, peak load, stance slip (the sensor's increment per stance).
- **Geometry:** for the reachability check.

The diagnostic reproduces every run hash (5780483c … b373d22e for G2W_A8).

## 2. Where the forward speed is gained

Six starts of G2W_A8, the steady phase before the first early touchdown.

**The controller's state does not see the gait it is in:**
- At 8 → 4 steps before failure, the speed at the decision is 0.46–0.53 m/s while x_f − x* = −0.02 … −0.05. The controller reads the body as slow.
- Its step-start decisions ask for the minimum step: df at the 0.10 bound in 31 % of steady decisions, T at its 0.36 lower bound in 33 %.
- The in-swing re-decisions (T fixed) then lengthen the foothold to about 0.23–0.30 m. Execution adds 4–11 cm, so achieved steps are 0.28–0.34 m.
- Speed at the decision ≈ 0.25 + 1.58·(x_f − x*) + 1.01·(previous achieved step) (rms 0.05 m/s). The regulated state reflects speed only together with the step length, and the step length is set by the in-swing re-decisions and the execution overshoot, not by the target.

**x* is the nominal step's fixed point:**
- It belongs to the map's nominal step: 0.22 m, giving x* 0.067 (≈ 0.37 m/s).
- Matching nominals were tried: 0.26 / 0.30 / 0.33 m give x* 0.089 / 0.104 / 0.119.
- They walk 8.0 / 7.2 / 6.8 upright steps (baseline 11.2), and run away faster. The target is not the root cause; the loop's authority is.

**Forces:**
- The horizontal turf impulse per phase is the inverted-pendulum part F_v·(c − p)/h with the measured CoP, within ±5 N·s. The remainder mirrors −ΔL_pitch/h.
- There is no hidden force. The speed is set by where the CoP is relative to the COM over the stride.
- In single support the CoP follows the plan's feed-forward heel→toe roll (kXi along = −1): no ground-reaction feedback on speed. Placement is the only speed actuator.
- The stance legs' velocity reference: in double support, vRef − v ≈ 0, so it does not push. In single support, vRef < v by 0.13–0.42 m/s (braking damping), and the body still ends 8–20 cm of ξ ahead of the LIPM plan.

**Speed gained per phase (steady steps):**

| phase | Δv (m/s) | dependence |
|---|---|---|
| pre-swing (step start → liftoff, 0.10 s) | +0.024 | |
| single support | +0.075 | grows with speed (+0.17 per m/s) and step length |
| double support | ≈ 0 | |

## 3. Swing execution (B)

**The existing swing is clocked from the planned step start, not from the actual liftoff:**
- The foot lifts 0.07–0.15 s later.
- At mid-swing it lags its command by up to 20 cm, catches up at 4.1 m/s (commanded 3 m/s) and lands 4–11 cm past its target.
- The touchdown command is already at the landing pose (0–1 cm); the overshoot is the leg's momentum.
- The landing overshoot is +7.0 ± 0.7 cm on identical open-loop requests.
- Delay compensation (`swingPredict`) was already on.

**The swing inverse-dynamics feed-forward was spiky:**
- ±550 N·m in the existing swing; ±1150 N·m in my first generic swing.
- It differentiates the generator path twice, and kinks become torque spikes: a hard min, a clamp on re-plan ticks, the lowest corner switching between toe and heel.

**Generic swing (`pc_swing.js`, opt-in `human.over.swingGen = "v2"`):**
- **Pre-swing pivot:** the foot rolls about its forward-most ACTUAL contact point (sensor), heel rising toward the toe-off attitude. Holding a loaded foot still left it at 0.2–0.4 BW for 0.5 s.
- **Air phase:** anchored at the executor's measured liftoff.
  - Horizontal: a quintic from the ACTUAL position and velocity at liftoff to the landing pose, arriving at rest; re-planned C² from the planned state when the planner moves the foothold.
  - Height: lift profile plus a clearance guard on the lowest corner of the foot's own collider outline, in the planned orientation or the actual one if it hangs lower.
  - Pitch: from the actual liftoff pitch toward level, then the contact attitude, within the ankle range the IK shank allows.
- **Descent:** gated on the ACTUAL foot being within 6 cm of its landing point.
- **Feasibility:** the travel's peak acceleration 5.77·D/T² against the leg's capacity; the air time is lengthened by the minimum needed, and reported.
- **Smoothness:** every element is C² (smooth minima, log-sum-exp over the corners, softplus 1 cm, a quintic extended backward). Feed-forward peaks dropped from ±550–1150 to ±210–250 N·m (the real inertial demand of a 0.27 s air phase).
- Swing joints already run at full stiffness, so gains are not the lever. The feed-forward matters: without it 90 % of swings fail.

## 4. Failure classification (C) — `analysis/classify.py`

Labels per step:
- **PLANNER-INFEASIBLE:** the final foothold is beyond the swing leg's reach at the planned touchdown, or the air time left is shorter than the minimum for the travel at the leg's acceleration capacity.
- **SWING-EXECUTION:** feasible, but the swing did not get there: no liftoff, touchdown < 80 % of the planned swing, a re-contact, or > 8 cm off.
- **CONTACT/TOUCHDOWN:** a stance slip > 6 cm or a peak load > 2.5 BW.
- **OK.**

A fall is attributed to its terminal event: the first step whose swing or contact actually failed. It is POST-TOUCHDOWN STABILITY if none did.

Results:
- **Baseline G2W_A8:** all six falls are PLANNER-INFEASIBLE terminal events.
- **Validity:** steps flagged "time" fail their swing 72 % of the time, against 38 % for steps judged feasible. "Reach" is not yet predictive (19 %); its geometry needs calibration.
- **Stance slip:** the stance foot slides or twists a median 2.0 cm per stance (p90 5.8 cm), the yaw moment at the foot.

## 5. Ankle as a speed actuator (first test)

`ctrl.ankle2 = { k, max, min }`: every tick in single support, the stance CoP demand moves k × (the measured map's prediction of the next start state − the step's target), bounded.

- Identified WITH the term (600 runs, seed 72, same procedure as F0 round 2), then evaluated: 8.3 (k 1) and 8.5 (k 2) upright steps, against 9.5 for F0 round 2 and 11.2 for M8A.
- The term is realised: shift 3–6 cm, the sole clamp removes < 1 cm, the CoP tracks within about 1 cm.
- Single-support Δv drops (+0.075 → +0.033), but the other phases compensate, and the identified open-loop forward eigenvalue is unchanged (2.5 vs 2.7).
- Not a fix as built.

## 6. Swing bench at matched states, and the delay compensation

Bench: identification runs (600 per variant, seed 72, M8A maps); swing failure in matched (previous step × speed) cells.

**Generic swing (`pc_swing.js`):**
- Final versions:
  - pre-swing pivot plus a pre-lift (the executor confirms liftoff ≈ 60 ms late, and a pivot held on the turf pushed the airborne foot back down);
  - descent gated on the delay-predicted foot position;
  - trajectory time led by the feedback delay.
- **Worse than the existing swing at matched states:** 47–50 % vs 1 % (previous step 0.20–0.28 m, 0.2–0.45 m/s); 54–82 % vs 24–26 % (0.28–0.36 m).
- **Without the delay lead:** at zero feedback delay the same swing lands 1.7 cm from target, against 10.9 cm with the delay. Every target and feed-forward torque arrived 50 ms late.
- **With the lead:** the foot leaves the turf at rest and lags early.
- **Kept opt-in, not adopted.**

**The existing swing (`walk.swingLead`):**
- Its geometry is already foot-agnostic (actual start pose and pitch, clearance on the collider outline, an ROM-based pitch limit, outline-based landing pivot).
- Its defects are temporal: it runs 50 ms behind real time, and it starts travelling before the foot has unloaded.
- **A full lead** (trajectory time = view time + delay): overshoot +7.0 → +3.6 cm (open loop), but long steps fail 71–85 % on the bench. The plan moves 50 ms earlier in real time, the start drags the still-loaded foot, and every swing loses 50 ms of air time.
- **A late lead** (ramped from 30 % to 70 % of the swing): overshoot +3.2 cm, start unchanged. On the bench long steps still fail more (79–92 % after ≥ 0.32 m), because every touchdown is 50 ms earlier in real time, i.e. 50 ms less swing.
- The existing +7 cm overshoot is CONSISTENT (± 0.7 cm), and Controller A's maps have learned it. It is not a noise source.

**Leg capacity (calibration, existing swing):** swing failure rises gradually with the required peak foot acceleration 5.77·D/T_air²:

| required acceleration (m/s²) | < 20 | 20–25 | 25–30 | 30–40 | 40–60 | > 60 |
|---|---|---|---|---|---|---|
| swing failure | 6–7 % | 11 % | 17 % | 15 % | 21 % | 45 % |

## 7. The feasible envelope

**Trailing leg:**
- At 98–100 % extension at nearly EVERY swing start, successful or not.
- The walking pelvis carries the hip 0.88–0.91 m above the ankle on a 0.924 m leg, giving ≈ 0.25 m of horizontal reach at full extension.
- The pelvis cannot drop further in double support without the LEADING ankle reaching its dorsiflexion limit (the support layer's height band).
- The leading leg reaches 0.92–0.97 extension at good touchdowns.

**Envelope:**
- Steps above ≈ 0.30–0.32 m fail their swing 27–36 % (vs 5–15 % below 0.26 m).
- Single support below ≈ 0.36 s makes the swing time-infeasible.
- Speed ceiling ≈ 0.30 / (0.36 + 0.20) ≈ 0.55 m/s. The walks collapse just past it (0.6–0.8 m/s at failure).
- **0.6 m/s is at or beyond the reliable edge for this body at this pelvis height.**

**Open loop** (fixed steps, six starts): every fixed gait falls within ≈ 4 steps; the step map is unstable. Longer single support accelerates, longer steps decelerate.

## 8. Ground-reaction speed regulation (`walk.vReg`)

**Law:**
- In single support the stance CoP demand shifts by k·(v̄ − vd), with v̄ the forward COM velocity low-passed over 0.5 s, bounded −4 / +5 cm.
- The CoP follows (measured).
- It engages from the second step: gait initiation is the measured first step's job. A constant vd from standing propelled the first step by its full bound and launched the body to 0.8 m/s by step 2.

**Results** (maps identified WITH the regulator, k 0.15 / 0.3, vd 0.45):

| configuration | upright steps | speed (m/s) | how it ends |
|---|---|---|---|
| Controller A's own nominal (0.22 m, ≈ 0.37 m/s gait) | 7.5 / 6.5 | 0.31 / 0.25 | stalls: the two actuators target different gaits |
| nominal matched to vd: 0.25 m | 11.2 (10–13) | — | |
| nominal 0.27 m | 9.3 | — | |
| nominal 0.29 m | 9.8 | — | still creeping eventually |

Not yet a material improvement.

Checkpoint: all approved gates bit-identical (`regress.sh` 12/12); G2W_A8 / FG hashes unchanged. Every new mechanism is opt-in.

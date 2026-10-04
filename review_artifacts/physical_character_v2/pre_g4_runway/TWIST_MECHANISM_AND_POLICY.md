# Posture-IK twist mechanism and the current-vs-reference policy (pre-G4 runway, item 1)

**Source:** `../sources/2026-10-04_user_instruction_pre_g4_research_runway.md`.

**Status:** diagnostic only. **No policy adopted.**
- The diagnostic options added (`ikTwistBlend`, `ikTwistTau`, `yawCmd`) are default-off.
- The default path is verified bit-identical: 4 G3 runs, state hashes and IK checksums.

**Tools:**
- `tools/twist_energy.mjs`: per-joint power flow, torque-component work split, phase, rate and activation switches;
- `tools/twist_mode.mjs` (`--stand`);
- `tools/turn_test.mjs`: commanded turns and static yaw stiffness;
- `tools/ank_reftwist_eval.mjs`.

## 1. What the validated controller commands

Per joint axis: τ = feed-forward (inverse statics) + K·e − (D + dt·K)·ω_end. Here e is the angle error to the posture-IK target, applied as an implicit PD.

**The posture IK** solves, for each leg: hip rotation / flexion / abduction, knee flexion, and ankle DF / inversion, so that the chain from the **target** pelvis pose reaches the foot's **current** pose.
- The target pelvis yaw is the heading of the two feet.
- **The redundant twist DOFs** (knee axial rotation; the passive-only ankle ab/adduction) are taken at their **current** values.

**Consequences:**
- **Knee axial rotation** gets target = current, so e ≈ 0 and there is **no restoring stiffness**, only feed-forward and damping.
- **Ankle ab/adduction** is passive only: 0 N·m inside ±10° at k = 0.
- **The hip-rotation target compensates the twist.** The measured regression slope of the hip-rotation target on the leg twist (knee axial + ankle ab/adduction) is **−0.975** under "current", against **0.002–0.005** under "reference".
- **So the leg's axial twist is a neutral (zero-stiffness) direction** of the posture controller: any accumulated twist is accepted.

## 2. Where the oscillation's energy comes from (k = 0, V2-REF, roll 8 N·m·s, steady window 12–20 s)

**The oscillation:** ankle ab/adduction ±11.7°, pelvis yaw ±6.45°, **0.563 Hz**. The leg twist **leads the pelvis yaw by 57°**.

**Actuator work over 8 s:**
- **hip_L.x +1.78 J, hip_R.x +1.78 J** (the hip rotators inject the energy);
- the spine rotators absorb 0.66 J;
- passive tissue does ≈ 0 (the ankle neutral zone is free at k = 0).

**The hip-rotation torque split by component** (per hip, 8 s):

| component | work |
|---|---|
| **stiffness K·e** | **+19.25 J** |
| damping | −17.44 J |
| feed-forward | −0.04 J |

**The stiffness term itself pumps energy.**

**Falsified alternatives:**
- **Discretisation / explicit target timing:** 240 / 480 / 720 Hz give the identical cycle (11.7–11.8°, 0.563 Hz, +1.8–1.9 J per hip); K·dt = 0.40 ≪ D = 15.9.
- **Actuator activation lag:** instantaneous activation gives the identical cycle.
- **A moving heading reference:** foot yaw amplitude is 0.00°.

**At k = 0.13** the same split holds: K·e +23 to +32 J, damping −20 to −28 J, twist leading by 47–50°, 0.69–0.75 Hz (V2-REF roll 8 / yaw 8, V2-198-92 roll 4).

**Morphology:** the lightest body (V2-165-62, hip K 68.9 N·m/rad) decays even under "current". V2-REF (K 95.7) and V2-198-92 (K 122.9) sustain it.

## 3. Why: a non-collocated, non-passive loop

**With the target following the twist,** the hip command reduces to τ = K·(ψ_ref − ψ) − D·(ψ̇ − φ̇), where ψ is the pelvis yaw and φ the leg twist.

**This is a spring that holds the pelvis toward a world (feet-heading) angle,** but **its reaction acts on legs whose axial rotation is unanchored** (free ankle zone, zero-stiffness knee axial).
- Its work on the pelvis, ∮K(ψ_ref − ψ)ψ̇, is conservative.
- Its work through the leg, **∮K(ψ − ψ_ref)·φ̇ dt, is not.** It is positive whenever the leg twist and the pelvis yaw are out of phase, as measured (47–57°).
- **The ankle ab/adduction end range (±10° soft) bounds the amplitude,** which is why the cycle sits at ≈ 10–12°.

**Under "reference"** the hip target is fixed relative to the reference twist, so τ = K·((ψ_ref − ψ) + (φ − φ_ref)) − D·(…). That is **a spring between pelvis and leg (collocated)**, and it is passive.

**What "yaw stiffness" really is.** A constant 2 N·m pelvis torque (G3 Y:0.5:2), 10–13 s mean:

| policy | foot free moments | shear-force couple | passive ankle ab/adduction torque per ankle |
|---|---|---|---|
| current, k = 0 | −1.98 N·m | −0.02 N·m | **≈ −0.99 N·m** (in the end range: inside ±10° it would be 0) |
| reference, k = 0 | −1.64 N·m | −0.37 N·m | −0.78 / −0.87 N·m |

- **The validated "2.8 N·m/°" yaw stiffness** is the hip spring holding the pelvis while **the legs twist the passive ankles into their end range.**
- **The static ankle twist needed to carry an external yaw torque is the same under every policy** (T / k_ankle). The policies only decide whether the pelvis rotates with it.
- **The shear-force couple between the two feet** (an anchor humans can use) carries almost nothing under the validated controller.

## 4. Policy comparison (diagnostic; `policy/`)

**Policies:**
- current (validated);
- **reference** (`ikRefTwist`);
- **blend α** (twist target = (1 − α)·current + α·reference; α = 0.5, 0.25);
- **drifting reference** τ (the reference is the first-order filtered current twist; τ = 2 s, 0.5 s): a state-dependent reference.

**Twist-mode stability** (3 bodies × roll 4 / 8, yaw 4 / 8, push R 15; 20 s):

| policy | k = 0 | k = 0.13 |
|---|---|---|
| current | **8 / 15 sustained** (≤ 12.4°) | **9 sustained + 1 growing** (≤ 11.0°) |
| reference | 15 decaying (≤ 0.09°) | 15 decaying / quiet (≤ 0.01°) |
| blend 0.5 | 15 decaying | 15 decaying |
| blend 0.25 | 15 decaying | 15 decaying (V2-198-92 yaw 8: 2.3° left at 20 s) |
| drift τ 2 s | 15 decaying | 15 decaying / quiet |
| drift τ 0.5 s | 15 decaying | **5 sustained** (6.5°) |

**Commanded pelvis turns** (yawCmd 10 / 20 / 30° over 2 s, feet planted; `turn_*`): **the falsification test of "reference".**

| | reference, k = 0.13 | current, k = 0.13 | current, k = 0 |
|---|---|---|---|
| achieved | 10.0 / 19.8 / 29.7° | 10.7 / 21.7 / 32.4° (overshoot) | 9.8 / 17.0 / 31.0° |
| hip rotation | **−10/+10, −20/+20, −30/+30** | −33/+35 at 30° | −27/+28 at 20° |
| knee axial / ankle | 0.0° / ≤ 0.5° | ≤ 0.2° / ≤ 2.0° | 20° turn: ankle ±10.5° |
| residual yaw oscillation | 0.04–0.12° | 1.3–4.0° | **5.9°** at 20° |
| hip saturation | none | none | none |

**Static yaw stiffness** (2 N·m, λ 0.5; N·m/°):

| | current | reference | blend 0.5 | drift τ 2 s |
|---|---|---|---|---|
| k = 0 | 2.81 | 0.18 | 0.33 | 1.69 |
| k = 0.13 | (phase-contaminated: 9.66) | 0.26 | 0.47 | 1.46 |

## 5. Is reference-following the correct semantics? (evidence for and against)

**For:**
- It is the **passive, collocated** form: the hip PD acts on the pelvis–leg relative angle.
- **No limit cycle** at any k, body or disturbance tested.
- **Legitimate turning goes through the hips with the passive twist near zero.** This is the anatomically expected allocation: axial rotation of the body over planted feet happens mostly at the hips, and the knee axial range is small near extension.
- All 20 twist probes re-centre at k = 0.13 / 0.15 (earlier diagnostic).
- G2 / G3 rows pass at k = 0.13 / 0.15 (earlier diagnostic).

**Against / costs:**
- **Low resistance to an external yaw torque.** Only the passive ankle stiffness anchors pelvis yaw: about 2k N·m/°, 0.18–0.35.
- The validated controller's 2.8 N·m/° is not a genuine anchor (it is the ankle end range plus leg twist). Still, a human also uses active ankle-foot musculature and the two-foot force couple, and reference alone does neither.
- **A fixed reference cannot accept a legitimately rotated foot.** For example, after a foot lands toed-out, a fixed reference keeps pulling the leg twist back toward reference. The **state-dependent reference** (drift τ ≈ 2 s) accepts such an offset slowly, and is still stable at τ = 2 s. At τ = 0.5 s it is not stable (k = 0.13).
- **Not falsified on legitimate turning:** commanded turns of up to 30° are achieved accurately with no saturation. No over-constraint was found.

**Architecture suggested by the evidence (for decision; not adopted):**
1. The posture twist target should be **reference-like on short time scales** (α ≥ 0.5, or drift τ ≥ 2 s). That removes the non-passive loop.
2. **Yaw anchoring must be designed explicitly.** It should come from (a) the passive ankle's axial stiffness, which is plausibly load-dependent (`ANKLE_KNEE_AND_RATE.md`), and/or (b) an explicit yaw-balance term using the two-foot shear-force couple. It should not come from a hip spring reacting against free legs.
3. **The drift time constant**, or blend α, is a design parameter with a measured stability boundary: τ = 0.5 s unstable at k = 0.13, τ = 2 s stable; α = 0.25 marginal at k = 0.13, α = 0.5 stable.

**Gate-level results for blend 0.5 and drift τ = 2 s:** see §6.

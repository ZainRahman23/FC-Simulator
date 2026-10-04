# E1a / E1b preregistration v2: configuration addendum (completes §2 of `E1_PREREGISTRATION_V2.md`)

**Status:**
- **PREREGISTERED. NOT RUN.** No E1 execution of any kind has happened.
- This dated addendum fixes the configuration that `E1_PREREGISTRATION_V2.md` §2 left open. Its §1 / §3 criteria are unchanged and stay frozen.
- **E1a may run only when both hold:**
  1. the qualification (`QUALIFICATION_V2_PREREG.md`) closes;
  2. you explicitly approve it.

**Date:** 2026-10-04.

**Sources:**
- `../sources/2026-10-04_user_instruction_close_decisions_before_e1a.md`;
- `DECISION_CLOSURE.md` §2–§5.

## 1. Configuration under test

| element | value | decided in |
|---|---|---|
| controller | the validated G3 stand controller | accepted (G3 v3.3) |
| support / contact lifecycle | `lifecycle: true` | `DECISION_CLOSURE.md` §5: row K was an obsolete premise; K′ discriminates |
| twist policy | reference (`ikRefTwist: true`). Twist DOFs target their anatomical neutral, the knee's θ0(φ). Voluntary heading / turning only through the active heading command | §4 (C1′ / C7′; voluntary turn held, C4) |
| ankle law | k = 0.13 N·m/°, the passive unloaded tissue value. It is not a yaw-stability device: the reduced ankle has no active yaw path, and E1b-17 is where that may show | §3 |
| knee | `v2k`, central parameters, frozen 097dcb7 | `KNEE_PARAMETERIZATION.md`; your provisional acceptance of the architecture |
| deep flexion (> 120°) | provisional uncertainty family; central member in use; **not certified, and not needed by E1a** (bit-identical across the family in the E1a pelvis drop; knees ≤ 29.7°) | §2.3–2.4 |
| planned pelvis drop | −2.5 cm (min-jerk), as v1 | v1 |
| physics | 240 Hz; approved anatomy, mass / inertia, limits, capacities, feet, skeleton contract unchanged | — |

## 2. How to select it (flags)

- `V2_KNEE_MODEL=v2k`, or PassiveLayer opt `kneeModel: "v2k"`.
- `V2_ANKLE_NEUTRAL_K=0.13`, or `setAnkleNeutralKOverride(0.13)` in a browser.
- Stand options `{ "ikRefTwist": true, "lifecycle": true }`, plus E1a's own protocol commands (v1 §2).
- **Every default is unchanged.** Flag-off identity: KV0.

## 3. Envelope statement

- **E1a-16** keeps every E1a run inside the certified knee envelope (0–40° flexion). A run that leaves it is reported as outside the envelope, not as a pass.
- E1a makes no claim about deep-flexion knee behaviour.

# E2 assumptions: recheck (final pre-E1a stage, §8; E2 is NOT implemented)

**Tool:** `tools/e2_target_check.mjs --fine`. Static IK; G3 U:R swing-ready state of each body; the unloaded leg; ground targets with foot yaw 0. **Evidence:** `evidence/e2_fine.json`.

## 1. The finding, refined

| target | smallest pelvis drop that makes it anatomically valid | margin once valid |
|---|---|---|
| 10 cm lateral (E2b) | **2.0 cm in all 8 bodies** (out of reach at 0–1.5 cm) | ≥ 14.5° |
| 5 cm lateral | 1.0 cm in all 8 bodies | ≥ 15.9° |
| 10 cm forward (E2a) | 0 cm in 7 bodies (margin 5.9–8.6°, knee near hyperextension); 0.5 cm for V2-165-62 | ≥ 17.3° from 0.5 cm |
| 5 cm forward | 0 cm (margin 13.1–13.6°) | — |

**Unchanged:**
- At standing pelvis height, lateral footholds are out of reach in every body.
- A drop of ≥ 2–2.5 cm makes the proposed E2 targets valid with healthy margin.
- The twist definition does not change these numbers (≤ 0.5°).

**Further evidence from the boundary work:** at standing height, a touching foot placed even 1 cm off its spot cannot be held flat without driving the knee into passive hyperextension (measured −2.8°, 18–20 N·m of tissue torque, with the unconstrained IK). The standing posture (knees at 4°) has essentially no reach reserve.

## 2. Should pelvis lowering be emergent or planned?

**Planned, then physically executed.** It is not an arbitrary scripted constant, and it is not left to emerge.
- **Nothing in a stance controller can make it emerge.** The stance controller knows only the current support. It cannot anticipate a foothold it has not been told about. By the time the swing foot needs the reach, it is too late to start lowering.
- **In human stepping, the stance knee flexes as part of step preparation** (an anticipatory postural adjustment) before toe-off.
- **So the pelvis height is a variable of the foothold feasibility problem.** The contract searches drops {0, 2.5, 5, 7.5, 10} cm and prefers the smallest feasible drop with margin (`REACHABILITY_CONTRACT_FINAL.md` §2). The chosen drop is executed **before liftoff** through the existing posture pelvis-height target, so the stance leg's finite actuators lower the body. No pose is written.
- **Implemented as an experimental option:** `pelvisDrop: { t0, dur, dz }`, min-jerk, default off. E1a uses a fixed 2.5 cm, justified by the reach-margin measurement above, not by E1 results.

## 3. What E2 still needs (future work; not designed further here)

- **The planner:** foothold → contract query → pelvis-height choice → drop timing → swing trajectory.
- **Dynamic executability:** swing time vs actuator capacity, and stance-foot balance during the drop and the swing.
- **The single-support yaw-anchor decision** (`SINGLE_SUPPORT_YAW.md`), because a real step loads the stance ankle in yaw.

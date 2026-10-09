# PI-1: simulation ↔ physical-contact compatibility gate and promotion tolerances (FIXED before any V1.2 candidate is exported or gated)

**Source:** `../sources/2026-10-09_user_decision_d1c_replace_cases_compat_gate.md`.

**Status:** this document fixes the thresholds before any slide-contact V1.2 record exists. They become part of PI-1 amendment 1 only if every gate passes. Otherwise PI-1 stops for review.

**Purpose:** a gameplay collision may be simplified, but it must represent the same meaningful physical interaction as the exact promoted D-1 body. The two geometries are recorded side by side; the gate does not require numerical identity.

## 1. Data and alignment

**Baseline:** slide-contact V1.2 as merged at **e2c98ec**.
- Simulation files (`pt_react.js`, `pt_defend.js`, `pt_squad.js`) are byte-identical to d539e7a.
- The merge adds presentation only (stadium / rain / pitch art) and tracks `corner-flags.js`.
- It is used through a detached scratch worktree. No simulation code change.

**AIR** (as in PI-1 §3), extended for V1.2. Per tick and per contact sub-step:
- the simulation's tackler primitives (`ptRxTacklerPrims`: LEG, THIGH, TUCK, TUCKSHIN, BODY, TRUNK);
- the simulation's runner segments (`ptRxBody` with the V1.2 foot length when applicable, `ptRxSegments`);
- the slide's contact history (`def.manifold`);
- the presentation pose (FULL, LOCO).

**Time:** AIR row k is the state after squad tick k + 1. Sample (k, n) is squad time k + n/4. All gate times are in squad ticks.

**The D-1 body** (`spec/v2_pi1_runner.js`, unchanged) is posed from the **LOCO** stream, the unperturbed state PI-1 promotes from and tracks until the physical hit. It uses the §4 retarget rules if, and only if, they meet §3. FULL is recorded too.

**Decisive contact:** the first PLAYER_CONTACT whose reaction equals the case's authoritative class. Every other contact in the V1.2 contact history is recorded and reported.

## 2. Gate criteria (each candidate contact case; all must hold)

| | criterion | threshold |
|---|---|---|
| CG-1 | contacted player and segment agree | D-1's first contact with the same tackler primitive is on the mapped body: foot_X → foot_X (boot); shin_X → shank_X; thigh_X → thigh_X; pelvis → pelvis; torso → abdomen / thorax. The adjacent body is accepted only if the D-1 contact point is ≤ 30 mm from the shared joint. |
| CG-2 | support state agrees | for **both** legs at the decisive sub-step: simulation `planted` = presentation (LOCO) `contact` at a bracketing tick = D-1 boot state. The D-1 boot counts as planted at ≤ 5 mm lowest-point height and airborne at ≥ 15 mm; in between it is "transitional", which does **not** agree. |
| CG-3 | timing | \|t_D-1 first overlap − t_sim\| ≤ 1 tick |
| CG-4 | location | horizontal distance between the simulation contact point and the D-1 first-contact point ≤ 0.10 m, **and** the same region along the segment (normalised position along the segment axis within ± 0.25) |
| CG-5 | overlap of the same physical order | over [t_sim, t_sim + 0.10 s], max D-1 penetration ÷ max simulation overlap (same primitive) ∈ [1/3, 3]. This excludes deep gameplay hits that the promoted body only grazes or misses. |
| CG-6 | approach direction | horizontal contact normals within 45°; relative-velocity directions (primitive minus struck point) within 45° |
| CG-7 | no pose discontinuity needed | the D-1 pose meets the §3 promotion tolerances at every tick from the predictor trigger to the contact; the tackler primitives move continuously (no sub-step jump beyond their velocity·dt + 10 mm) |
| CG-8 | self-collision | D-1 self-penetration ≤ 10 mm from the trigger to contact + 0.10 s (the PI-1 criterion; the isoSelfCol exception concerns the artificial G1 stress case only) |
| NM | near miss | no contact in either representation; the simulation's predictor fires; minimum D-1 distance to every slide primitive > 0 |

**Recorded for every case:** both geometries at every sample (primitive capsules; simulation segments; D-1 collider poses and witness points), and every criterion's value, pass or fail.

## 3. Promotion tolerances (no perceptible pop; no artificial contact energy)

| quantity | tolerance | basis |
|---|---|---|
| pelvis / root position | ≤ 10 mm | about 1 px or less at the gameplay camera; a 1 cm root step is the smallest visible pop |
| pelvis orientation | ≤ 2° | trunk lean / yaw visibility |
| trunk / head orientation | ≤ 3° | — |
| knee centre | ≤ 10 mm | — |
| ankle centre | ≤ 10 mm | — |
| foot in contact (presentation) | V2 boot lowest point within [−5, +2] mm of the pitch (V2 slop 5 mm) | a floating stance foot makes the body drop onto it; a buried one makes a contact impulse. Both are artificial energy. |
| foot orientation (any foot) | ≤ 5° | — |
| rendered boot penetration into the pitch | ≤ 10 mm | — |
| thigh / shank long-axis direction | ≤ 2° | — |
| twist about a limb's long axis | ≤ 10° | near-cylindrical segments; low visibility |
| elbows / wrists (rendered) | ≤ 15 mm | — |
| per-body velocity vs the presentation's backward difference | ≤ 0.25 m/s | — |
| whole-body COM velocity | ≤ 0.05 m/s | — |
| angular momentum | ≤ 10 % | — |

## 4. Retarget rules evaluated for the two known discrepancies

Deterministic. They change neither V2 nor the animation.

- **R-K, knee (position-preserving leg retarget).**
  - The thigh direction is the rig hip → knee.
  - The V2 knee flexion axis is the normal of the rig's hip – knee – ankle plane, with its sign from the rig thigh's flexion axis.
  - The shank direction is the rig knee → ankle.
  - Below 10° of knee bend the plane is ill-conditioned, so the twist blends toward the rig thigh's own twist.
  - The foot takes the rig foot rotation; the 3-DOF ankle absorbs the difference.
  - Residuals: thigh / shank twist vs the rig, and V2 knee axial rotation within its range.
- **R-B, boot (contact-preserving foot retarget).** For a foot the presentation holds in **toe** contact: the minimal extra pitch about the V2 foot's mediolateral axis, at the ankle, that brings the V2 boot's lowest point to the pitch. No change if it is already ≤ +2 mm. Residuals: the pitch change, and the rendered rig boot's resulting penetration.

**Classification:**
- **A:** the original mapping already meets §3.
- **B:** R-K / R-B bring every evaluated frame within §3.
- **C:** otherwise, a genuine incompatibility. **C stops PI-1 for review.** Neither V2 nor the presentation asset is changed.

## 5. Candidate cases and selection (no manufacturing)

**Candidates:** the V1.2 baseline's own existing fixture definitions, unchanged (`tools/anim3d/of_react_scenarios.js` rx_*, the no-ball family the PI-1 design used). The rx_miss rule is the frozen PI-1 §2 rule applied on V1.2.

**Selection rule, decided now:**
- Use **rx_miss / rx_free_leg / rx_planted_leg** if each yields its category: no contact; a swing-foot contact → CORRECTION or STUMBLE; a planted-leg contact → FALL. They must also pass the gate.
- Otherwise, for a failing category, take the first fixture in the file's order whose simulation outcome falls in that category and which passes the gate.
- **Report every fixture tried**, with its outcome and gate result. Nothing is moved, offset or tuned to obtain an outcome.
- If a category has no gate-passing fixture, **stop**.

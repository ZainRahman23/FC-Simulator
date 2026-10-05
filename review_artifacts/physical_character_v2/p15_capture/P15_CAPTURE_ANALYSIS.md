# P15: capture-point / DCM analysis of the 15 N·s abort (diagnostic; no criterion or code changed)

**Authority:** user instruction 2026-10-05 (`../sources/2026-10-05_user_instruction_p15_capture_evidence_reuse.md`): "Use capture-point/DCM analysis … rather than selecting a put-down duration from the observed pass/fail boundary."

**Data:**
- 32 diagnostic runs with a copy of the E1b harness instrumented with the controller's own state (`tools/e1b_run_cap.mjs`): ξ, ω, both feet's usable regions, support region, commanded CoP, ξ_ref.
- Sets: 8 bodies × L / R × {smooth put-down (PSTAR2), instantaneous drop (PSTAR + footYaw)}.
- Up to the abort the two modes are identical, so every quantity below that depends only on the push is a property of **body + push**, not of the put-down design.

**Tools:**
- `tools/p15_capture.mjs`: 2-D LIPM deadlines.
- `tools/p15_model.mjs`, `tools/p15_model2.mjs`: lateral LIPM with the controller's constraints, validation, envelopes.

## 1. The push makes P15 a one-step capture problem for every body

At the end of the 15 N·s push, the DCM ξ = c + ċ/ω is already **outside the stance foot's usable region**:

| body | ω (s⁻¹) | ξ outside the stance region at push end |
|---|---|---|
| V2-REF | 3.12 | 2.5 cm |
| V2-165-62 | 3.29 | **4.4 cm** |
| V2-198-92 | 2.99 | 1.2 cm |
| V2-175-70 | 3.19 | 3.3 cm |
| V2-190-85 | 3.06 | 1.8 cm |
| V2-short-legs | 3.15 | 2.5 cm |
| V2-long-legs | 3.09 | 2.5 cm |
| V1-matched | 3.06 | 2.4 cm |

The left and right sides are the same within 0.1 cm.

- **No-step (0-step) recovery on the stance foot is impossible** for every body (Koolen et al. 2012: 0-step capturable iff ξ lies in the CoP-feasible region). Ankle and CoP effort alone cannot save it.
- **Recovery needs a new contact.** Putting the lifted foot down at its original foothold is, in capturability terms, a **one-step capture at a prescribed location**. A "recovery step" is a one-step capture at an adjusted location.
- **So the question is not "no step versus step".** It is whether **the original foothold lies inside the one-step capture region for the touchdown and support times the controller can achieve.**

## 2. A lateral LIPM with the controller's own constraints predicts every outcome

**Model** (`tools/p15_model.mjs`). From the measured state at push end, ξ̇ = ω(ξ − p) laterally, with:

- **Before acceptance:** p in the stance region (the controller saturates at its inner edge; measured CoP 0.0478 m against the 0.0477 m command).
- **Acceptance timing:** at the first contact the λ return starts (H9; min-jerk over 0.6 s). LOAD_ACCEPT follows once the landed foot's requested share is ≥ `wantShare` (5 %) for `acceptDebounce` (0.05 s). The landed foot's region then grows from its centroid with s (smoothstep over `accept` = 0.1 s).
- **Allocation:** the landed foot's load share is ≤ min(s, 1 − floor), with **floor = min(`minShare`, λ_stance) = 10 %**: the G2 "each foot ≥ 10 % BW" floor, which relaxes only to the requested share.
- **Balance law:** p* = ξ + kξ(ξ − ξ_ref) + rate term, with ξ_ref the λ-weighted centroid, clamped to the achievable CoP.

**Validation against the 32 simulations:**
- **32 / 32 outcomes predicted** (fell / recovered).
- LOAD_ACCEPT time within 1 ms in 24 runs and within 0.04 s in the rest.
- The LIPM's 0.1 s position error from push end is 3.4–4.5 mm.

## 3. Why the smooth put-down fails: support arrives about 0.5 s after the abort, and is capped

V2-REF:

| | touchdown | LOAD_ACCEPT | s ≥ 0.5 | outcome |
|---|---|---|---|---|
| instantaneous drop | +0.09 s | +0.29 s | +0.33 s | recovered |
| 0.302 s put-down | +0.31 s | +0.51 s | +0.55 s | fell |

The 0.2 s from touchdown to acceptance has two parts:
- about 0.15 s while the λ return's min-jerk reaches the 5 % `wantShare`;
- the 0.05 s debounce.

Then **the 10 % stance floor caps the landed foot at 90 % of the load.** The reachable CoP is the 90 / 10 lever point (about −0.119 m), not the landed foot's outer edge (about −0.137 m). V2-REF's DCM (−0.123 m) sat just beyond it and diverged ("step required → fell"). The landed foot itself did not move: it touched down 2 mm *outside* its anchor.

## 4. In-place envelope: the latest touchdown (after the abort) that still recovers

From the validated model. The capture time comes from the model, not from the observed pass / fail boundary.

| body (L; R within 0.013 s) | current pipeline | λ return at abort | intent decoupled (accept at contact + debounce) | decoupled + floor 0 | decoupled + floor 0 + 0.05 s ramp | **physical best case** (support at contact, no floor, CoP at the limit) | smooth put-down touchdown |
|---|---|---|---|---|---|---|---|
| V2-REF | 0.291 | 0.446 | 0.398 | 0.464 | 0.490 | **0.658** | 0.308 |
| **V2-165-62** | **0.094** | 0.300 | 0.212 | 0.270 | 0.298 | **0.437** | 0.292 |
| V2-198-92 | 0.582 | 0.505 | 0.684 | 0.754 | 0.779 | **0.958** | 0.317 |
| V2-175-70 | 0.186 | 0.402 | 0.295 | 0.360 | 0.386 | **0.546** | 0.300 |
| V2-190-85 | 0.421 | 0.480 | 0.525 | 0.594 | 0.619 | **0.791** | 0.312 |
| V2-short-legs | 0.292 | 0.446 | 0.400 | 0.465 | 0.491 | **0.657** | 0.304 |
| V2-long-legs | 0.296 | 0.448 | 0.401 | 0.468 | 0.494 | **0.662** | 0.308 |
| V1-matched | 0.330 | 0.458 | 0.434 | 0.503 | 0.528 | **0.703** | 0.304 |

**Capture-step comparison:** with the current pipeline and touchdown at the smooth put-down's time, the outward foot-placement shift needed to recover:

| body | shift |
|---|---|
| V2-198-92, V2-190-85, V1-matched | 0 |
| V2-REF | 1.1 cm |
| V2-short-legs | 0.2–0.8 cm |
| V2-long-legs | 0.8–1.4 cm |
| V2-175-70 | 8.6–9.3 cm |
| V2-165-62 | **17.7 cm** |

**What it shows:**
1. **P15's in-place premise is physically valid for all 8 bodies.** The original foothold is inside the one-step capture region for touchdown up to 0.44 s (V2-165-62) to 0.96 s (V2-198-92), if the landed foot becomes effective support at contact. The smooth 0.30 s put-down touches down at 0.29–0.32 s. **P15 is not beyond the in-place envelope, so P5 has no physical basis.**
2. **The failure is in the controller's acceptance pipeline, not in the put-down trajectory or the physics.** The current pipeline shrinks the envelope to 0.09 s (V2-165-62). Only the instantaneous drop (0.083 s) gets inside it, which is why the old one-tick drop "worked".
3. **The acceptance latency comes from the request, not from physics.** About 0.15 s of the 0.2 s is the λ return's min-jerk reaching `wantShare`, because the acceptance intent is coupled to the magnitude of the balance request. Contact itself is detected in one tick.
4. **The naive P2 (start the λ return at the abort) is not uniformly helpful.** It moves ξ_ref toward the landed side while the body is still on one foot, and **shrinks** V2-198-92's envelope (0.58 → 0.51 s). Decoupling the acceptance intent from the balance reference has no such cost.
5. **V2-165-62 sets the difficulty.** Even with decoupled intent, floor 0 and a faster ramp, its latest touchdown (0.27–0.30 s) is at the smooth put-down's 0.29 s. The remaining gap to its physical best case (0.44 s) is the debounce, the acceptance ramp and the balance law's own dynamics. An in-place solution for this body needs **both** prompt support at contact **and** an earlier touchdown, or a step.

## 5. What this does not establish

- The model is lateral 1-D LIPM. It ignores AP motion, angular-momentum (hip-strategy) margin, ankle torque limits on the landed foot under load, and the acceptance-time torque ramp (§2.3 of `../e1b_fix/E1B_FIX_RESULTS.md`), which is a torque-level effect.
- It predicts the 32 observed outcomes. Its counterfactual envelopes are predictions, not simulations.
- The establishment comparison (IHMC / BLF / PyPnC / literature) is in `P15_EVIDENCE_COMPARISON.md`.

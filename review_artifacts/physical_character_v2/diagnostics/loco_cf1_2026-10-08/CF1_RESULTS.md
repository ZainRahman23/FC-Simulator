# COUNTERFACTUAL DIAGNOSTIC CF-1 — the missing between-steps transfer, supplied: it works for the staggered forward stance, then the existing single-step planner refuses the trailing-leg swing (A). On the wide stance the transfer itself falls short (B). No case reaches a physical step 2. Verdict YELLOW (strengthened)

> **Counterfactual diagnostic only** (the user's approval, 8 Oct 2026, in this session).
> - CF-1 is not adopted V2 functionality. It does not qualify walking or alter any E2 / TD2C verdict.
> - It lives only in the diagnostic harness: `tools/loco_probe.mjs --cf=1`, default off.
> - No controller, planner, lifecycle, touchdown, body, contact, actuator, capacity, swing-servo, physics or production code changed.
> - With `--cf=0` the harness reproduces the original probe's 16 end hashes (16 / 16).
> - Previous study: `../loco_probe_2026-10-08/LOCO_PROBE_RESULTS.md`.

**Runs:** 16, at 240 Hz, about 10 s wall time each.
- 4 bodies (V2-REF, V2-165-62, V2-198-92, V2-long-legs) × L / R first × forward / lateral.
- Each run requested 20 steps and stopped at the first substantive failure. Runs are deterministic, so the 2- / 4- / 6- / 10-step outcomes are prefixes of these runs.
- The stop rule ended the study at step 2: every case fails at one of two new mechanisms.
- Every final run was executed twice with identical end hashes. The refused-decision diagnosis is computed only after the failure, as the run ends.

**Files:**
- Tables: `CF1_TABLES.md` (`tools/loco_probe_report.mjs`).
- Evidence: `evidence/`.
- Reproduction: `scripts/run_cf1.sh`.

## 1. CF-1 (minimum mechanism, as approved)

Each between-steps transfer, including step 1's, is replaced by the following.

**DCM path:**
- The existing reference layer's Hermite (`ctrl/v2_dcm.js` `cmdPlan` / `dcmTick`).
- From the measured DCM and its LIPM rate ω(ξ − p): the sequencer's own initialisation rule, so there is no CoP step.
- To the new stance foot's region centroid (`centroid2` of the controller's own region polygon), in 2-D. Staggered and wide stances are handled alike.
- Over the unchanged validated transfer time, 4 s.
- Handed to the unchanged balance law through the existing request fields `xiRef` / `xiRefDot`.

**Load schedule:**
- The existing `lamFromVrp` rule: the stance share follows the plan's VRP along the line between the region centroids.
- It reaches full stance exactly as the DCM plan arrives.

**Planned single support:**
- The supervisor's stance-only abort is suspended while the transfer plan moves. This is the E2 sequencer's own precedent for its planned DS transfer.
- It is active again in the release hold and in the step.
- A shadow of the same test records whether the suspension was actually needed.

**Unchanged:** the E2 step itself and every timing. Nothing is tuned per body: the target is pure support geometry.

## 2. Results

| Body | Step 1 | Step 2 | 4 | 6 | 10 | 20 | first failure |
|---|---|---|---|---|---|---|---|
| V2-REF | ✓ | ✗ | — | — | — | — | forward: transfer ✓, trailing foot released; step-2 decision NO_CERTIFIED (path: ankle soft bound, A). Lateral: trailing foot not released (1.6 % BW, B) |
| V2-165-62 | ✓ | ✗ | — | — | — | — | same (ankle 5.25° beyond soft; lateral 1.6 % BW) |
| V2-198-92 | ✓ | ✗ | — | — | — | — | same (2.65°; 1.6 % BW) |
| V2-long-legs | ✓ | ✗ | — | — | — | — | same (3.19°; 1.2 % BW) |

Left / right are mirror-identical. Each cell covers both, and both step kinds.

- Completion: 100 % completed 1 step, 0 % completed 2.
- Median and maximum consecutive steps: 1.
- Nothing grew, diverged, fell or slipped. Only one step was completed per run, so step-to-step error accumulation could not be measured.

## 3. What the transfer did (the user's distinction 1 vs. 2)

**Forward, staggered stance (8 / 8): the transfer succeeds.** This is distinction 2.

| step-2 transfer | value |
|---|---|
| DCM travel | 0.095 – 0.113 m (2-D, onto the leading stance foot) |
| ξ tracking error, max during the transfer | 7.5 – 9.5 mm |
| ξ tracking error at the decision | 0.31 – 0.49 mm |
| ξ margin to the support | ≥ 38 mm |
| p* inside the stance region while share ≥ 0.85 | by 2.2 – 5.7 mm |
| shadow supervisor | never fires (the suspension was not needed) |
| trailing foot | 0.17 – 0.18 % BW, released 1.85 – 2.27 s after the plan ends (step 1's transfer: 0.97 – 1.32 s) |
| stance foot | in single support, COM speed ≤ 2 mm/s |

The sequencer's decision then runs the existing one planner. The result is **NO_CERTIFIED_ONE_STEP: 59 reach nodes, 35 reach-certified, 35 / 35 fail the path certificate.**

| what refuses | detail |
|---|---|
| samples | the trailing leg's mid-swing, φ 0.2 – 0.6 (0.1 – 0.6 for V2-165-62) |
| constraint | the planner's soft joint box, posed with the pelvis frame frozen at the decision |
| binding coordinate | ankle dorsiflexion only, beyond its soft bound by 2.65° (heavy / tall), 3.19° (long-legs), 3.82° (REF), 5.25° (light / short), at φ 0.4 |
| hard-limit IK | reaches every sample (residual ≤ 1e-15) |
| reach | hip → foot ≤ 0.98 × leg length |
| cause | the existing swing reference holds the sole flat (a single step from a side-by-side stance). From a trailing start (the foot 0.10 m behind the stance foot, the pelvis over the stance foot), keeping the sole flat while lifting it behind the body needs extra ankle angle |

**Lateral, wide stance (8 / 8): the transfer falls short.** This is distinction 1.

*Planned single support is required here:*
- the shadow test fires mid-transfer (p* 20.5 – 26.7 mm outside the stance region; ξ error up to 24 mm, DCM travel 0.134 – 0.153 m);
- the suspension let the transfer complete.

*The trailing foot then never releases:*
- it keeps **1.21 – 1.63 % BW**, commanded = measured, against the lifecycle's 1 % release threshold;
- ξ settles 2.6 – 3.6 mm short of the centroid.

*Why it settles there — a fixed point of the controller's own allocation:*
- the trailing foot's residual load shifts the net CoP toward it;
- ξ settles at that net CoP;
- p*'s projection on the 0.26 m centroid line then commands the same residual share;
- CF-1's λ schedule cannot break it, because λ only moves the floors.

On the staggered forward stance the same fixed point gives 0.17 % (released). The outward-only lateral corridor is in any case not a path to sustained walking: the stance widens 8 cm per step.

## 4. Classification of the first failures

**Forward: A, missing gait functionality, exposed by a successful transfer.** The single-step planner has two built-in single-step assumptions:
- a flat-sole swing;
- the pelvis frozen at the decision, for path certification.

Its foothold corridor is relative to the swing foot's anchor. A trailing-leg swing (foot pitch or toe-off, pelvis-aware swing planning, stance-relative footholds) is walking functionality that does not exist yet. The refusal is by 2.7 – 5.3° of a soft bound with the hard limits satisfied: a certification-design limit, not a body limit.

**Lateral: B, a local transfer / allocation deficiency.** Release on a wide stance needs explicit trailing-foot unloading. The controller's p*-projection allocation has a residual-load fixed point that a λ request cannot override.

**Not observed:**
- **Distinction 3** (intrinsic instability under repeated use): no evidence. Every state was quiet and bounded, but only one step was executed.
- **Distinction 4** (repeated stepping viable): not demonstrated. No second step was physically executed.

## 5. The explicit question

> **"If we implemented a proper version of this missing gait-transfer layer, does the evidence now suggest V2 could support sustained walking?"**

**The transfer layer alone: physically feasible, but not sufficient.**
- Supplied in its minimal form, the 2-D between-steps transfer works on the existing body and controller for the stance walking actually produces (staggered): 0.4 mm DCM error, trailing foot to 0.17 % BW and released, no supervisor intervention needed, no slip.
- On a wide stance it also needs an explicit trailing-foot unload rule.
- It is not sufficient: the next missing walking element appears immediately. The existing single-step planner and swing cannot launch the trailing leg.

**Sustained walking: still undemonstrated.**
- No second step was physically executed, so step-to-step behaviour (error growth, drift, cadence) is untested.
- Nothing measured so far points against it: no C finding in two studies.
- Each blocker found is a missing or single-step-scoped commanding layer, refused by narrow margins (a few degrees of a soft ankle bound; 0.2 – 0.6 % BW over a release threshold) with the physics comfortably inside its hard limits.

**Answer:** consistent with "yes, once the gait-level layers exist (transfer and trailing-leg swing planning, at least)", but not yet shown.

## 6. Verdict: YELLOW (strengthened, not upgraded)

- **Stronger than before:** the one previously missing layer was supplied and works physically.
- **Not GREEN:** repeated physical stepping is still not shown.
- **Not RED:** no structural limitation appeared.

**The minimum for sustained walking is now known to include at least:**
1. the between-steps 2-D transfer (CF-1's job), with explicit trailing-foot unloading;
2. trailing-leg swing planning: foot pitch / toe-off and pelvis-aware path certification. The flat-sole, frozen-pelvis single-step certificate refuses it;
3. stance-relative continuous foothold planning;
4. later: overlapping phases (cadence), recovery-step touchdown, running mechanisms.

**Possible next counterfactual: not run, needs the user's approval.** CF-2 would supply item 2 minimally.
- **Form:** a swing whose sole pitch follows the leg within the soft box, or path certification with the predicted pelvis motion.
- **Purpose:** finally test a physical step 2 and chaining.

## 7. Harness notes

- The `--cf=0` path is bit-identical to the original probe (16 / 16).
- CF-1 code: `cfRequest` and `cfHold` in `tools/loco_probe.mjs`, under the CF-1 header.
- `pathDiag` / `softViol` are read-only and run only after a refused decision. The soft box checked is the bounded IK's own (`legIKBounded`, `spec joints.limits.soft` on its six solved coordinates). A first check against the anatomical soft decomposition was the wrong reference; it was replaced before any reported result.
- Every final run's end hash matched its earlier execution.

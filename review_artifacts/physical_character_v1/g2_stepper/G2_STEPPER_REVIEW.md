# Physical Stepper consolidation — review (2026-10-02)

**Status: STOPPED for your decision.**
- Local commits only (`157ba0b` plus the final one). **Nothing pushed.**
- The Physical Stepper is built, opt-in (`walk.ctrl.stepper`). It is **not** adopted: it walks worse than the frozen controller.
- Every approved gate is hash-identical.

**Read with:**
- the viewer `g2_stepper/viewer/index.html` (http://127.0.0.1:8171/review_artifacts/physical_character_v1/g2_stepper/viewer/index.html);
- the trail `STEPPER_LOG.md`;
- the decisions `DECISION_RECORD.md`;
- the render contract `RENDER_SKELETON_CONTRACT.md`.

---

## Executive summary — the ten questions

### 1. What architecture was implemented?

**At run time (opt-in, `pc_stepper.js` plus a hook in `pc_plan.js`):**
- **Contact-event schema and lifecycle.** PROPOSED → ACCEPTED → EXECUTING → ACHIEVED / MISSED / INTERRUPTED / CANCELLED.
  - Illegal transitions throw.
  - A revision is a new version.
  - Classification uses only the executor's sensed touchdown.
  - Football events are schema only.
- **Nominal gait generator:** a walk-ratio law scaled by speed and leg length.
- **Step-to-step surrogate** that predicts:
  - its own next-state features (so it chains);
  - the realised step;
  - P(fall or leave the walking region).
- **Continuation-aware planner** in three modes: horizon 1; horizon 1 plus a learned terminal value; horizon 2 with a beam (two transitions, only the first executed).

**Offline:**
- **An exact, resumable simulation session.** Jolt `SaveState`/`RestoreState` plus an identity-preserving controller clone. It is validated bit-identical to from-scratch replays.
- **A snapshot oracle.** It is 5–20× faster than replay and reproduces it bit for bit.
- **Instrumentation and analysis:**
  - one instrumentation for every configuration;
  - surrogate fitting with leave-one-start-out validation;
  - offline regret;
  - the Part-19 cost benchmark;
  - a smoothness probe;
  - the review viewer.

### 2. What did the oracle teach?

The Jolt oracle is the deterministic simulator used as a perfect model.

1. **It reproduces exactly, and it is fragile.**
   - Yesterday's depth-2 beam oracle is reproduced **bit for bit** at HEAD (32 / 34 / 28 upright), but only when its 4-decimal commit rounding is emulated.
   - With exact commits, the same search gives **26 / 13 / 20**.
   - A 0.1 mm command difference decides between 13 and 34 steps. The long oracle walks are fragile paths, not a robust strategy.
2. **Speed creep is the failure mode, and how fast it creeps depends on the action space.**
   - Searches around the controller's own decision creep at +0.035 to +0.040 m/s per stride and end in a forward collapse or a dead end, where every candidate falls.
   - The best oracles drift at +0.007 to +0.016 m/s per stride.
   - **Long horizon (§6.4):** the best oracle (Gu, two steps, nominal ∪ feedback candidates) held **all 40 searched steps on R@0.5 (45 upright)**. Its speed stayed at 0.40–0.57 m/s, including a recovery from a 0.69 m/s excursion. On L@0.6 it crept from step 25 and collapsed after 29. Not robust, but close on one start.
3. **Braking lives in LONG steps, not near the controller's decision.**
   - Within ±12 cm × ±60 ms of the controller's own decision, one step changes the stride-level speed by only ±0.7 cm/s (1 SD). Above ≈ 0.55 m/s, on average none of those candidates slows the walk.
   - The union grid (nominal long steps ∪ feedback) and the absolute 0.10–0.52 m grid contain braking steps in 72–80 % of states. At 0.55–0.8 m/s they give −0.03 to −0.07 m/s per step, and −0.01 to −0.06 among steps that keep the next state acceptable. Gu's choices brake at 0.65–0.8 m/s.
   - **The good gait:** a long step with a long braking double support. DS ≈ 0.30 s, the COM ≈ 25–28 cm behind the landing foot at touchdown, ξ at the step start ≈ 0 ± 3 cm.
   - **The controller's gait:** short and quick. DS 0.21–0.22 s, the COM ≈ 19 cm behind, ξ +2 to +5 cm ahead.

### 3. Is the benefit the nominal gait, continuation, or both?

**Both, and neither alone is enough.**
- **A fixed steady-state nominal alone fails at gait initiation.** E and G fall within 5 steps on 4–5 of 6 starts. The start transient needs short, state-dependent steps; the oracle's first step is 0.10 m.
- **Foresight around the controller's decision adds ≈ 5.6 steps:** C 20.8 vs B 15.2.
- **Nominal ∪ feedback candidates with foresight (Gu) is the best oracle.**
  - All 20 searched steps were committed on 6 of 6 starts; mean 26.7 upright including the controller's steps after the horizon.
  - The long-horizon result is §6.4.
- **The continuation benefit is case-specific, not a state variable.**
  - At identical states the two-step pick differs from the one-step pick in 52 % of decisions.
  - It accepts a slightly worse first step (cost 20.7 vs 18.4) for a far better best second step (50 vs 98).
  - The commands and the next states differ by ≈ 0 on average (SD 2–3 cm).
  - A learned terminal value does not capture it: F 15.7 ≈ B 15.2. A linear policy fitted to the oracle cannot imitate it: D 6.5.

### 4. Robust walking?

**No.**
- No implementable configuration walks robustly.
- The perfect-model best oracle held 40 searched steps on one of two long-horizon starts and collapsed by creep on the other.
- The live Physical Stepper walks 8.7–10.0 upright steps (held-out mean). The frozen controller walks 14.7.

### 5. Held-out success?

**No.**
- The live planner was tested with surrogates trained on the other five starts. It walks 9.0 (horizon 1), 8.7 (horizon 1, nominal ∪ feedback) and 10.0 (horizon 2) steps.
- **The quality gates fail:**
  - **Capture-point prediction:** held-out RMSE 4.5 cm, p95 8.5 cm. The gate asks for p95 below ⅓ of a 3 cm margin.
  - **False-safe rate:** 27 %.
  - **Baseline:** the planner beats the fitted-policy baseline D (6.5) but not the controller (14.7).
- Stages B–D were not run (precondition not met).

### 6. Stable speed range?

**None.** Every configuration drifts in speed; §6.

### 7. Start / stop?

**Not attempted** (precondition: a robust walk).

### 8. Are stance changes justified?

**Not by the evidence. Stepping can brake when its action space contains long steps (Q2.3).**
- The stance × oracle cells were nevertheless run with two physical, feedback-only candidates, while the evidence still looked that way.
  - more integral speed-loop authority: still creeps;
  - a proportional orbit shift on the stride-level speed (`speedP`): 17.8 vs 18.2 without it.
- The single-support CoP regulator (`vReg`) had already failed (g2_speed). During creep the CoP is already on the forefoot.
- None is adopted. The planner × stance cells were not run, because no stance candidate helped the oracle.

### 9. What does the planner cost?

- Per decision: horizon 1 is 0.47 ms mean (p99 0.8); horizon 2 with beam 3 is 1.4 ms (p99 2.4).
- 22 players at 1.8 decisions per second each cost 18 ms (horizon 1) or 55 ms (horizon 2) of CPU per game second.
- If all 22 decide in the same frame, the worst case is 53 ms. Decisions are asynchronous, so they can be staggered.
- The physics plus controller costs ≈ 0.25 s of CPU per simulated second per character on an idle machine (2.1–3.1 ms per 240 Hz tick under today's load). The planner is ~1–5 % of that; it is not the bottleneck.

### 10. What remains before jogging?

**A planner that can actually choose the long-step, long-double-support gait the best oracle walks, from the measured state, and a step-to-step response predictable enough to choose it.** Today neither holds:
- The surrogate's held-out error (4.5 cm) is 3× the smooth-model floor.
- That floor is itself doubled by the event-terminated double support. At the next step start it is 1.80 cm on ξ, 2.90 cm/s on v and 25 ms on timing; at touchdown it is 1.24 cm, 1.36 cm/s and 10 ms (§9.3).
- The double support is also where the good gait differs: 0.30 vs 0.22 s, the COM 25–28 vs 19 cm behind the landing foot. It is the phase with the largest CoP authority.

Only then do the planner, held-out stages, speed envelope, start/stop, yaw, F2h and jogging follow.

---

## The decision needed (yours)

| option | what | evidence for | risk |
|---|---|---|---|
| **A. Transition-planned walking (recommended)** | Make the double support a planned contact phase: its duration (and stride-level impulse) become decisions of the contact-event planner, made at the touchdown event. The existing DS CoP solver executes them with a planned duration instead of an event-terminated one. Re-run the oracle on that action space, then the surrogate anchored at touchdowns. | The good oracle gait differs mainly in DS (§6.3). The DS end doubles the response's non-smoothness (§9.3). The DS has the largest CoP authority. Braking needs the long-step / long-DS gait (§6.2). | It changes the inner loop's DS termination. That is a controller change, not a body change, but it is beyond "planner only", so it needs your approval. |
| B. Better planner on today's action space (nominal ∪ feedback) | DAgger on planner-visited states, local / nonlinear models, touchdown-anchored prediction. Keep the inner loop. | The best oracle on this action space held 40 searched steps on one of two long starts. The held-out error (4.5 cm) is well above the in-sample floor (1.3–1.8 cm). | The ceiling is the oracle itself: it crept and collapsed on the other long start. The DS non-smoothness stays. |
| C. Stance-mechanics redesign (ankle / push-off) | — | Weak: stepping can brake given long steps. | Two physical candidates already failed under the oracle (§10). |

Nothing in this phase needs a body change, a traction model or an authority violation.

---

## 1. Architecture

```
requested locomotion (vd, heading)
  │
  ▼
nominal gait generator — walk-ratio law ℓ = √(WR·v), WR 0.20 m·s @ L 0.924 m (∝ L^1.5), commanded/achieved 1.13
  │  proposals: df offsets {−12, −6, 0, +6, +12} cm × T {0.34, 0.40, 0.46} s × width {−3, 0, +3} cm (∪ the feedback law's decision ± offsets)
  ▼
continuation-aware planner (StepPlanner)
  │  surrogate: z (step-start state) × u → z' (own features) + realised step + P(bad)
  │  horizon 2: the best `beam` first steps, each followed by its best predicted second step
  │  (or horizon 1 + terminal value V(z'))
  │  cost: stride-level (capture point in the new stance, phase-matched step-start velocity)
  ▼
committed SUPPORT contact event
  │  target region = the PREDICTED realised foothold ± (8, 6) cm, time window, command, prediction
  │  ACCEPTED → EXECUTING at the step start
  ▼
existing execution, unchanged
  │  unified inner loop (funnel stance, closed-loop DS, speed loop) + inherited swing
  │  commanded step, no in-swing re-decision (as the oracle executes)
  ▼
Jolt contact → classifySupport (sensed touchdown only) → ACHIEVED / MISSED / INTERRUPTED; replan from the measured state
```

Enable with `walk.ctrl.stepper = { model, horizon, beam, center: "nominal" | "ctrl" | "both", pMax, V?, tol? }`. Off by default; every gate is hash-identical.

## 2. Contact-event schema (`pc_stepper.js §1`)

**Fields:**
- `effector`, `type`, `target` (center in world x/z, halfExtent forward/lateral), `orientation`, `window` (earliest / nominal / latest);
- `relVel` (for ball events), `prereq`, `continuation`, `priority`, `fallback`;
- `command` (df, dl, T), `source`, `predicted`;
- `version`, `history`, `outcome`.

**Rules:**
- **Lifecycle table:** illegal transitions throw.
- **Revision:** `revise()` creates version n+1 and CANCELs the old one. The log is never edited.
- **Classification:** `classifySupport()` decides only from the executor's `done` record (sensed touchdown). Outside the region or window means MISSED; obstruction means INTERRUPTED. A fall during the swing leaves the event EXECUTING; nothing is invented.
- **Football types** (`ball_touch`, `strike`, `interception`, `release`, `recovery`) are schema only.

**Live counts (held-out runs, 3 × 6):**
- 116 ACHIEVED;
- 10 MISSED — the landed sole centre was outside the ±8 / 6 cm region around the predicted one;
- 18 EXECUTING at the fall (never resolved; history is not repaired).

Landed vs predicted sole centre: forward 2.3 cm median (p90 4.7), lateral 1.2 cm (p90 4.2).

(A first pass reported 50 MISSED. That was a frame-convention bug in the event's target: the realised step was measured from the old stance foot's body origin and the target was placed from its sole centre, a ≈ 7 cm forward offset. It was fixed in `pc_plan.js` and the runs were repeated. The upright counts were unchanged, because the event never feeds back into control.)

## 3. State record (`pc_stepfeat.js`, shared by oracle, data and planner)

**Frame:** the step-start view (the instant the controller decides), forward along the intended heading, lateral mirrored toward the swing side.

**Fields:**
- **Capture point and COM:** ξ, COM and its height, velocity (3), centroidal angular momentum (3).
- **Feet:** swing-foot position, height, velocity and pitch; stance yaw and pitch.
- **Legs and pelvis:** leg extensions; pelvis yaw, yaw rate and pitch.
- **Loads:** both loads, the foot states, the preceding DS duration.
- **Controller memory (`mem`):** the speed integrator I, v̄, vd, Tds, and the learned swing pelvis-rate profile (mean).

**Ablation (held-out, walking region):**
- capture point only: ξ_f 5.4 cm RMSE;
- + COM and feet: 5.1;
- + pose: 4.6;
- + loads and memory: 4.5.

Each group helps a little. None closes the gap (§9).

## 4. Surrogate model

- **Classes compared** (leave-one-start-out, 22 074 transitions from all oracle runs, accuracy in the walking region, cost < 50):
  - global linear;
  - quadratic (u², u·u, u × ξ / v);
  - local: k-means regions in the capture-point state, soft-blended per-region ridge maps.
- **Best:** local plus the full state. ξ_f 4.46 / 8.55 cm (RMSE / p95), ξ_l 4.40 / 8.77, v 5.5 / 11.0 cm/s, achieved step 3.5 / 5.5 cm.
- **Offline regret** (the surrogate ranks the oracle's own simulated candidates): median 2.5 cost units. The pick is exact in 28 % of decisions.
- **Feasibility classifier** (ridge-logistic, label "falls or leaves the region"): 383 of 1398 falls predicted safe (27 %), and 2703 false alarms.

## 5. Objective

**The cost at the next step start (the same instant every step; never the within-step velocity):**
```
((ξ_f − 0)/0.03)² + ((ξ_l − 0.10)/0.03)² + ((v_f − 0.45)/0.06)²
```
- v_f is a **phase-matched** velocity.
- The change of phase-matched velocity between equivalent events is the stride-level horizontal impulse (Part 2). The impulse ledger is §11.
- An optional step-average speed term is available (achieved length / duration).

**Horizon-2 total:** 0.5·c₁ + min c₂.

**Finding (§9.2):** the step-start velocity is the least predictable quantity. Its across-candidate variation is set by when the event-terminated DS ends. The stride-level speed v̄ is smooth, but the step barely moves it (±0.7 cm/s).

## 6. The oracle (Part 3)

### 6.1 Reproduction at HEAD

**Infrastructure:**
- `session.mjs` is validated 16/16:
  - a straight run equals `runG2a` (hash 4089b1c8);
  - branches from snapshots equal from-scratch replays bit for bit (K = 6, 12, 9);
  - no leakage (A, then B, then A again gives A).
- The snapshot engine equals the replay engine on every candidate cost (R@0.5, k2–k8).

**Results:**

| oracle | R@0.5 | L@0.5 | L@0.6 | R@0.55 | R@0.6 | L@0.55 | mean |
|---|---|---|---|---|---|---|---|
| myopic (legacy1) | 21 | 16 | 15 | 16 | 23 | 18 | **18.2** (yesterday 17.0) |
| depth-2 beam, exact commits | 20 | 26 | 13 | 24 | 26 | 26 | **22.5** |
| depth-2 beam, commits rounded to 0.1 mm (yesterday's engine) | **28** | **32** | **34** | — | — | — | identical to yesterday |

- **The rounded run reproduces yesterday's.** Its decisions are identical to yesterday's log to three decimals; it reproduces 28 / 32 / 34 exactly.
- **The exact run diverges** from k4 by ≈ 3 mm, and the outcome differs by up to 21 steps.
- **Myopic, 17.0 → 18.2:** the same rounding explains it. Replaying yesterday's committed sequence at HEAD reproduces its state bitwise.

### 6.2 What the two-step oracle preserves that the controller consumes

**Matched states (266 depth-2 decisions):**
- The two-step pick differs from the one-step pick at the same state in 138.
- **Commands:** df +0.5 ± 2.5 cm, T −2 ± 18 ms.
- **Costs:**
  - first step 20.7 vs 18.4;
  - best second step **50 vs 98**;
  - viable second steps 98 % vs 93 %.
- **Next state:** every feature differs by ≈ 0 on average (SD 2–3 cm).
- What it preserves is **continuation options, case by case.** It is not a state variable.

**Braking authority:** the effect of one step on the stride-level speed v̄ (EMA, τ 0.6 s): the most-braking candidate per state, averaged per speed bin.

| v̄ (m/s) | around the controller's decision (B / C / G; ±12 cm, ±60 ms) | union grid (Gu; nominal long steps ∪ feedback) | union, keeping the next state acceptable (cost < 25) | absolute 0.10–0.52 m grid (legacy2) | Gu's pick |
|---|---|---|---|---|---|
| < 0.45 | −0.032 | −0.031 | +0.021 | −0.023 | +0.039 |
| 0.45–0.55 | −0.005 | −0.038 | −0.008 | −0.026 | +0.020 |
| 0.55–0.65 | **+0.002** | −0.028 | −0.012 | −0.048 | +0.008 |
| 0.65–0.80 | **+0.005** | −0.068 | −0.056 | −0.020 | **−0.021** |

Share of states where some candidate brakes: 72–80 % with the union or absolute grid, 36–50 % around the controller's decision.

**Reading:**
- The braking steps are the long ones the controller never proposes.
- The first analysis (controller-centred grids only) concluded "stepping cannot brake". That conclusion was too strong and is corrected here.

### 6.3 The gait the good oracles keep

Pre-collapse steps (k ≥ 3, ≥ 3 steps before any fall), identical instrumentation:

| configuration | achieved step (cmd) | DS | ξ₀ fwd | COM behind foot at touchdown | landing pitch | speed drift per stride | motor work per stride |
|---|---|---|---|---|---|---|---|
| B (1-step around ctrl) | 0.290 (0.294) | 0.221 s | +0.023 ± 0.046 | 0.199 | 9.0° | **+0.040** | 40 J |
| C (2-step around ctrl) | 0.320 (0.347) | 0.218 | +0.055 ± 0.078 | 0.186 | 5.0° | **+0.035** | 52 J |
| F (1-step + V) | 0.235 (0.263) | 0.199 | +0.013 ± 0.050 | 0.185 | 5.8° | +0.010 | 35 J |
| legacy2 exact | 0.325 (0.349) | 0.307 | −0.004 ± 0.024 | 0.255 | 6.2° | +0.014 | 35 J |
| **Gu** | 0.329 (0.354) | **0.299** | −0.003 ± 0.028 | **0.251** | 5.5° | **+0.016** | 38 J |
| **beam, rounded (yesterday)** | 0.362 (0.406) | **0.320** | −0.010 ± 0.026 | **0.278** | 4.9° | **+0.007** | 37 J |
| E / G (fixed nominal; the surviving starts) | 0.36 (0.39) | 0.33 | −0.02 / −0.01 | 0.27 / 0.28 | 5–6° | −0.12 / +0.01 | 11–13 J |

### 6.4 Long-horizon test of the best oracle (Gu, 40 searched steps)

Gu, the same search, run to 40 committed decisions (k2–k41). The step-start speed per decision (m/s):

**R@0.5: all 40 searched steps committed; 45 upright** (the fall comes after the search horizon, once the controller takes over).
- k2–8: 0.40–0.47.
- k9–12: an excursion 0.51 → **0.69**, recovered to 0.55 / 0.54 / 0.52 / **0.48** within four steps.
- k13–41: inside 0.40–0.57. Costs 1–8.

**L@0.6: 29 committed; 31 upright.**
- k2–24: 0.40–0.58. Costs mostly < 7.
- From k25 the cost climbs: 25 → 49 → 79 → 170. The speed reaches 0.66 → 0.76 → **0.93**, and the walk collapses at k28–30. No candidate held it.

**Verdict:** with long steps in its action space, a perfect-model two-step planner can hold the walk for 40 steps and recover from an excursion. It is still not robust (1 of 2 long runs).

### 6.5 Where the creep comes from (impulse audit)

- **Steady walking** (controller, L@0.6): the double support propels (+8–10 N·s per stride) and the single support brakes (−6 to −8). The net ≈ +2 balances −2 N·s of Jolt linear damping.
- **Every creeping run:** the single support turns propulsive (+10 to +46 N·s per stride).
- **The stance CoP:**
  - steady: heel to mid-foot (−0.08 → −0.01 m relative to the ankle at 25 / 50 / 75 % of single support);
  - creep: already on the forefoot (+0.15 to +0.19 m at 75 %), and the COM still passes beyond it.
- **The double support** stays propulsive in creep (+5 to +15 N·s). Its target is the orbit shifted by the speed integrator, which is saturated at −0.08 m.

## 7. Matrix A–G (Part 4)

Upright steps from six deterministic starts. Searches commit up to 20 steps (k2–k21); then the controller continues. "Committed" is in brackets where the search hit a dead end, i.e. every candidate falls.

| | R@0.5 | L@0.5 | L@0.6 | R@0.55 | R@0.6 | L@0.55 | mean |
|---|---|---|---|---|---|---|---|
| **A** controller | 9 | 6 | 40 | 11 | 11 | 11 | 14.7 |
| **B** 1-step around the controller's decision (±12 cm, ±60 ms, width ±3/6 cm) | 16 | 15 | 17 | 15 | 15 | 13 | 15.2 |
| **C** 2-step, same grid | 19 (17) | 17 (15) | 26 | 19 (17) | 26 | 18 (16) | 20.8 |
| **D** linear feedback policy fitted to C (held out by start), simple feedback | 6 | 6 | 6 | 6 | 8 | 7 | 6.5 |
| **E** 1-step around the oracle nominal (0.39 m / 0.40 s) | 9 | 5 | 5 | 6 | 25 | 5 | 9.2 |
| **F** 1-step + learned terminal value (V from C's level-2 data, held out) | 20 | 18 | 10 | 16 | 14 | 16 | 15.7 |
| **G** 2-step around the oracle nominal | 22 | 5 | 5 | 5 | 26 | 5 | 11.3 |
| **Gu** 2-step around nominal (speed-scaled) ∪ the controller's decision | 29 | 26 | 26 | 26 | 28 | 25 | **26.7** |

**Reading:**
- **Foresight helps:** C vs B +5.6; G vs E when it survives the start.
- **The nominal alone fails at initiation:** E, G.
- **The union with foresight is best:** Gu.
- **The benefit is not transferable to cheap layers:**
  - one step + learned V gives F ≈ B;
  - a fitted policy (D) is worse than A.

## 8. Nominal-gait experiment (Part 7)

- **Law:** ℓ = √(WR·v), with WR = 0.20 m·s fitted to the beam oracle's gait (0.34 m achieved at 1.73 steps/s), scaled as L^1.5, commanded/achieved 1.13. It gives 0.32 / 0.34 / 0.36 m at 0.3 / 0.4 / 0.5 m/s. It is not hard-coded at 0.40.
- **As a sole candidate centre** (fixed: E / G; speed-scaled: Ew / Gw were stopped after E / G showed the initiation failure), it cannot start a walk. The oracle needs 0.10–0.22 m commands for the first 2–3 steps.
- **As candidates alongside the feedback decision (Gu),** it gives the best oracle.

## 9. Prediction and feasibility calibration

### 9.1 Held-out accuracy and the quality gates

- **Prediction error:**
  - offline: §4;
  - live, along the planner's own walks: ξ_f median 3.5–4.6 cm, p95 8.9–14 cm; achieved step 1.0–1.4 / 2.9–8.4 cm.
- **Gate 1** (p95 < ⅓ of the margin): fails.
- **Gate 2** (false-safe rare): fails (27 %).
- **Gate 3** (beat the strongest information-matched feedback baseline): fails against A.

### 9.2 Shared vs per-candidate error

At a matched state, decomposed by target:

| target | shared error | per-candidate error | true spread across candidates | share of the variation explained |
|---|---|---|---|---|
| ξ_f | 3.0 cm | 2.4 cm | 5.8 cm | ≈ 80 % |
| v | 3.4 cm/s | 3.3 cm/s | 3.3 cm/s | ≈ 0 |
| v̄ (stride-level) | 1.5 cm/s | 0.6 cm/s | **0.7 cm/s** | small (barely moved by the step) |

### 9.3 The floor for any smooth model, and where it comes from

Per state, a quadratic in the command fitted to that state's own candidates (in-sample, so an optimistic bound) leaves:

| quantity | at TOUCHDOWN (physical contact event) | at the NEXT STEP START (after the event-terminated DS) |
|---|---|---|
| ξ_f | 1.24 cm | 1.80 cm |
| v_f | 1.36 cm/s | 2.90 cm/s |
| timing | 10 ms | 25 ms |
| (achieved foothold) | 0.71 cm | — |

- The double support's event termination roughly doubles the non-smooth part.
- The held-out models (4.5 cm) sit well above this floor. That gap is generalisation, and it is reducible.

## 10. Stance 2×2 (Part 15)

| | oracle (legacy1 grid) | planner |
|---|---|---|
| current stance | 18.2 | 9.0 (h1) |
| `speedI.max` 0.25 (more integral authority) | still creeps (v 0.57 → 0.74 by k10–11; stopped) | not run |
| `speedP` k 0.3 (proportional orbit shift on v̄, opt-in `pc_unified.js`) | **17.8** (10 / 20 / 23 / 20 / 19 / 15) | not run |
| `vReg` single-support CoP regulator (g2_speed, earlier) | did not improve walks | — |

On the plain controller `speedP` is worse (8.5 / 8.2 vs 14.7), because its maps were identified under the original orbit. No stance candidate is adopted.

## 11. Impulse and energy accounting (Part 16)

**Per stride** (same-foot touchdowns):
- **Impulse:** feet impulse by leg and phase (DS / SS); the Jolt linear-damping impulse (−0.05·P·dt, ≈ −2 to −3.5 N·s per stride); ΔP and the residual.
  - **Integrity:** ledger residual 0.2–1.1 %; the feet impulse matches the turf ledger within 0.1 N·s.
- **Energy:** motor work Σ τ·(ω_child − ω_parent) against ΔKE + ΔPE.
  - Steady controller walk: W ≈ 18.7 J per stride ≈ dissipation 19.0.
  - Oracle walks: 35–38 J per stride.

## 12. Speed envelope, start / stop, yaw, F2h

Not earned; not attempted (Parts 22–25 preconditions not met). F0 stays the default; F2h stays opt-in, untouched.

## 13. Regression (after the last code change)

- `regress.sh`: **12/12** identical (A / B / C1 / C2 on V1 and V1.1, C3 29/29, D 7/7, G1 26/26, G2a 10/10).
- G2W_A8: **6/6** hashes identical (5780483c / 17d27b5d / 5082d76a / 47427dbb / 1f5445fd / b373d22e).
- Foot gate: **F0 slow 42/42**, **F2h slow 42/42** identical.
- Determinism:
  - snapshot branches equal from-scratch replays bit for bit;
  - the rounded oracle reproduces yesterday's runs exactly.

Every runtime change is opt-in:
- `walk.ctrl.stepper`;
- `ctrl.speedP`;
- `runG1a` `opts.stopWhen`.

## 14. Performance (Part 19)

| planner | model evaluations per decision | mean | p99 | 22 players, per game second | 22 players, same frame |
|---|---|---|---|---|---|
| h1 | 45 | 0.47 ms | 0.82 ms | 18 ms | 18 ms |
| h1 + V | 45 | 0.75 ms | 1.44 ms | 30 ms | 32 ms |
| h2, beam 3 | 180 | 1.38 ms | 2.41 ms | 55 ms | 53 ms |
| h2, beam 3, nominal ∪ feedback | 225 | 1.79 ms | 2.87 ms | 71 ms | 63 ms |

- The machine was partly loaded during the measurement.
- The physics plus controller costs ≈ 0.25 s CPU per simulated second per character, idle (2.1–3.1 ms per 240 Hz tick measured under load).
- 22-player cost is feasible for the planner.

## 15. Experiments run and not adopted

| experiment | result |
|---|---|
| **G / E** (two steps / one step around a fixed nominal) | Fail at initiation. |
| **Gw / Ew** (speed-scaled nominal only) | Stopped once E / G showed why. |
| **D** (fitted policy) | 6.5 |
| **F** (one step + V) | 15.7 |
| **Live Physical Stepper** (h1 / h1 nominal ∪ feedback / h2) | 9.0 / 8.7 / 10.0 |
| **`speedI.max` 0.25 and `speedP`** (plain controller and oracle) | No improvement. |

The code stays, opt-in, for the record.

## 16. Commits and artifacts

**Commits** (local, `prototype/physical-character-v1`): `157ba0b` (checkpoint), then the final commit with this review.

**Code:**
- `sandbox/visual/physchar/pc_stepper.js`, `pc_stepfeat.js`;
- the `pc_plan.js` hook, `pc_unified.js` `speedP`, `pc_gateg1a.js` `stopWhen`;
- `tools/stepper/`:
  - session tooling: `session.mjs`, `session_check.mjs`;
  - oracle engines: `oracle.mjs`, `oracle_fast.mjs`, `sim_worker.mjs`;
  - analysis: `gait_metrics.mjs`, `surrogate.mjs`, `matrix_report.mjs`, `smooth_td.mjs`;
  - live runs, benchmark and recording: `stepper_run.mjs`, `bench22.mjs`, `rec_review.mjs`.

**Evidence** (`g2_stepper/json/`):
- every run: `matrix/*.json.gz` (B / C / D / E / F / G / Gu / legacy2) with every candidate's next state;
- stance and reproduction runs: `stance/`, `repro/`;
- held-out live runs and models: `live/`, `models/` (surrogates, terminal values, policies);
- reports: `matrix_report.json`, `surrogate_heldout.json`, `smooth_td.json`, `bench22.json`, `session_check.json`, `metrics_ctrl_oracles.json`;
- logs: `logs/`.

## 17. Smallest visual review set (`viewer/index.html`)

1. **The oracle's fragility.** The same depth-2 search with exact vs 0.1 mm-rounded commits: 13 vs 34 steps, L@0.6.
2. **What the good oracle preserves.** The controller's short, creeping gait vs Gu's long-step, long braking double support, R@0.5: 9 vs 45 (all 40 searched steps held, including a recovery from 0.69 m/s).
3. **The Physical Stepper live** (held out). Controller vs planner on R@0.6, 11 vs 13, with contact-event outcomes.

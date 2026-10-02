# G2b overnight runway — morning review (2026-10-02)

**STOPPED with a decision report.** No robust walk.

The overnight diagnostics locate why. This body gains speed over every single support and brakes only at touchdown, so it can be held only by foot placement that looks two steps ahead with an accurate model:
- an oracle doing exactly that, with the simulator as its model, walks all 28 searched steps on the hardest starts;
- our linear-map controllers cannot predict well enough.

The choice between fixing the stance mechanics and building that predictive layer is yours.

All work is opt-in, all approved gates are bit-identical, local commits only, nothing pushed.

## The eight questions

1. **How far did you get?**
   - **Phases 1–3 done:**
     - built a new generic swing executor (`pc_swingx.js`);
     - measured it against the inherited swing at matched states (≈ 1,700 bench cases);
     - re-identified the step maps under it.
   - **Phase 4 not achieved.** No configuration walks robustly across starts.
     - I tested about twenty controller / inner-loop variants (eight new closed-loop identifications, 600 runs each, for those that changed the inner loop or the gait).
     - Then I ran oracle diagnostics (the simulator as a perfect model) to locate the limit.
   - **Phase 5 measured:** there is no stable range.
   - **Phases 6–9 not started.** Their preconditions (a robust F0 walker) were not met.
   - **Phase 10:** gates re-verified.
2. **Can the character now walk robustly?** **No.**
   - Every variant walks a typical 6–11 steps per start.
   - The "best" configuration's 14.7-step mean is one lucky 40-step start; its other five starts walk 6–11.
3. **What speed range is stable?** None.
   - 0.40 and 0.50 m/s each have isolated long runs (36, 40 steps), but outcomes change chaotically with the requested speed (0.45 m/s: 4–5 steps on every start).
4. **Can it start and stop?** Not attempted. The brief makes start/stop conditional on a robust steady walk.
5. **Is yaw materially improved?** Not attempted for the same reason. Yaw was not found to be the limiting mechanism.
6. **What does it look like?** See the viewer. Same gait as yesterday's review: a short-step, quick-cadence march (≈ 0.26 m steps, ≈ 113 steps/min).
7. **F2h?** Not rerun. The brief's condition (F0 robust) was not met.
8. **What remains before jogging/running?** A walking foundation that holds a basin. That needs your decision on one of the two paths at the end (stance mechanics, or a predictive lookahead layer), not more placement tuning.

## The findings that matter

### A. The swing executor was not the binding limit (this corrects yesterday's review)

I built the approved executor as `pc_swingx.js` (opt-in `human.over.swingGen = "x"`). It has:
- plans in physical time from the actual foot state;
- heading-frame quintics;
- an exact, asymmetric reachable set;
- clamp-and-report infeasibility;
- arrival-gated descent on the collider's lowest point.

It was then measured against the inherited swing at identical states.

| at matched states | inherited swing | swing X |
|---|---|---|
| fixed requests (24 cases): swing OK | 24/24 | 23/24 |
| landing error, forward | +2.8 ± 3.0 cm | +1.1 ± 4.8 cm |
| min toe clearance | 3.1 cm | 1.0 cm |
| late foothold change d: executed share | **0.65 / 0.57 / 0.50 at τ 0.15 / 0.20 / 0.25, both directions, sd 0.3–0.5 cm** | 0.7–0.9, sd 1.5–3.8 cm |
| late touchdown-time change | **executed fully** (±60 → ±55 ms, sd ≈ 10 ms) | ≈ ⅓, ± 33 ms |
| step-map prediction error after identification | 3.6–4.3 cm | **7.6–8.2 cm** |

**Yesterday's premise was wrong.** I wrote that the inherited swing cannot execute late corrections. Once the pelvis-rate internal model is on (yesterday's fix), it executes them partially but very predictably, and executes timing changes fully. (Yesterday's 75 / 55 / 30 % figures were measured before that fix, and confounded by each start's landing bias.)

**Swing X** is less predictable, and predictability is what step-to-step regulation needs:
- slower, more variable liftoff;
- more variable air time and double support.

I tried a hybrid (X horizontal + inherited vertical) and several vertical profiles; none matched the inherited precision. **X stays opt-in and is not adopted.** Its bench evidence and reach-set code remain for future use.

**Using the measured execution model** (one late correction requested as Δ/g, bounded by what the swing delivers) did not help in walks: 6.8–8.3 steps vs 14.7.

### B. Why the walks fail: the stance cannot brake early

All six starts, per-step state at the step start, at liftoff and at touchdown (`analysis/brake.mjs`):
- **The steady orbit** (L@0.6, steps 6–19) is consistent step to step:
  - at the step start ξ is 3 cm behind the stance sole centre and the COM is 18 cm behind it;
  - speed 0.45 → 0.55 → 0.51 m/s.
- **Every fall is preceded by a step that starts with the capture point ahead of the sole centre.** From there:
  - ξ grows 0.3–0.5 m within the single support;
  - speed escalates from 0.45 to 0.85–1.2 m/s over 3–5 steps;
  - the steps needed exceed what the swing can reach.

**The mechanism** (per-tick stance-ankle torques, `analysis/ank.mjs`):
- The swing lands heel-first: toe 7 cm up, ≈ 11°.
- With 0.27 m steps and a 0.36 m boot, the COM at touchdown is only 0.10–0.20 m behind the new sole centre.
- The CoP stays at the heel, BEHIND the COM, for the first 0.2–0.3 s of stance, so the body accelerates. The parts:
  - the landed ankle's damping (its velocity target assumes a flat foot) fights the forefoot lowering, up to −174 N·m;
  - the stance reference (the funnel) starts at the measured state, so it asks for no braking early;
  - the DCM gain is weak.
- When the CoP finally reaches the toe (plantar-flexion saturated at 127–146 N·m), ξ is already beyond it.

**Summary statistic, all six starts** (the controller's walks and the oracle's alike): the body GAINS speed over every single support, from the step start to touchdown.

| steps starting | speed at the step start → touchdown | CoP − COM at liftoff |
|---|---|---|
| on the orbit (ξ0 ≤ +0.03 m), n = 36 | 0.47 → 0.53 m/s | +1.6 cm |
| ahead of the orbit (ξ0 > +0.05 m), n = 17 | 0.71 → 0.91 m/s | −2.8 cm |

- The stance phase never brakes net, so all net braking falls on the touchdown and the double support.
- Once a step starts ahead of the orbit, the stance adds +0.2 m/s and the next foothold needed is beyond reach.

**What I tried at this level, re-identified where the inner loop changed:**

| variant | result |
|---|---|
| heel-rocker compliance into single support | 8.5 |
| stance DCM gain 1.0 / 2.0 | 8.2 (re-identified) / 7.8 |
| faster funnel | 7.3–7.8 |
| flatter landing | identification worse, prediction 5.4 vs 4.7 cm |
| timing restricted to the maps' data / maps re-identified over a wide timing range | 9.8 / 10.0 |
| two-step preview placement | 9.3 |
| terminal-stance heel rise (identification survival) | 2267 vs 2860 upright steps (worse) |

None moves the typical walk beyond 8–10 steps.

### C. The oracle bounds (diagnostics, not controllers)

**The question:** is the ceiling in the decision layer (prediction, models) or in the plant (inner loop, swing, body)?

**The method** (`analysis/oracle.mjs`):
- The deterministic simulator itself is used as a perfect model.
- At every step, a grid of commands (foothold 0.10–0.46 m × single support 0.34 / 0.40 / 0.46 s, then width ±6 cm) is tried from the identical state.
- The one whose next step starts closest to the orbit is kept, and the search moves on.
- This bounds what better step-start placement could achieve with today's inner loop, swing and body.

| start | R@0.5 | R@0.55 | R@0.6 | L@0.5 | L@0.55 | L@0.6 | mean |
|---|---|---|---|---|---|---|---|
| controller (best configuration), upright steps | 9 | 11 | 11 | 6 | 11 | 40 | 14.7 |
| **oracle placement**, upright steps | 17 | 19 | 18 | 13 | 18 | 17 | **17.0** |

**What this shows:**
- Better placement is worth ≈ 7–10 extra steps on a typical start. The controller's step-start decisions are short: the oracle chooses longer steps and longer single supports.
- But every oracle run ends the same way:
  - forward speed creeps up 0.45 → 0.65–1.0 m/s while the oracle sits at its longest step (0.46 m);
  - then sideways divergence;
  - then a state from which no command survives the next step.
- Weighting speed 6× more and allowing 0.52 m steps did not change it (13 steps). A state that looked good by capture point and speed, reached after a long step, had no viable continuation.

**Placement WITH lookahead (depth-2 beam).** Each step is chosen by its best two-step outcome: the 3 best first choices are each followed by a search of the next step.

| start | controller | myopic oracle | **depth-2 beam oracle** |
|---|---|---|---|
| L@0.5 | 6 | 13 | **all 28 searched steps** (32 upright in the replay) |
| L@0.6 | 40 | 17 | **all 28 searched steps** (34 upright) |
| R@0.5 | 9 | 17 | **26** (no viable command at step 28; 28 upright) |

(After the search horizon the replay continues under the controller, which falls within a few steps.)

- **Its gait:** commanded steps 0.40 ± 0.11 m (the controller's ≈ 0.26 m), single support 0.40 s, speed 0.52 ± 0.06 m/s at the step starts (mean COM speed ≈ 0.64 m/s: faster than the requested 0.5), double supports alternating 0.04–0.26 s (the controller's: a steady 0.10 s).
- **So the plant as it is today** (inner loop, swing, body) CAN be held by step-start placement for at least 26–28 steps, if each step looks two steps ahead with an accurate model and uses longer steps.
- **The controllers fail on prediction.** Steering the linear-map controller toward that gait (a reference step `ctrl.Lref`, then re-identifying its own closed loop: survival 2999, the night's best) reached at most 10.8 mean upright steps (14, 14, 15, 10, 6, 6). Its maps' forward error grew to 5.3–6.4 cm in the long-step regime.

The viewer shows the controller, the myopic oracle and the beam oracle side by side from the same starts.

## Decision needed

**What the evidence says, in one line:** this body gains speed over every single support and brakes only at touchdown and in the double support.
- It can be held by foot placement that looks two steps ahead with an accurate model (the beam oracle: 26–28 steps).
- Our step-to-step controllers on linear models cannot predict well enough (4–6 cm per step; more data makes the linear maps worse).

**Two materially different ways forward. Your call; my recommendation is A.**

**A. Gait mechanics — give the stance phase braking authority and the push-off a speed-dependent magnitude** (how human gait regulates speed: heel / ankle / forefoot rockers and push-off). One coordinated stance controller, not the piecemeal trials of tonight (each of which failed alone):
1. **Loading response:** the landed foot flattens without the ankle damping fighting it (measured up to −174 N·m), with a slight stance-knee flexion.
2. **Early-stance CoP control from touchdown**, against the orbit rather than a funnel that starts at zero error, so the CoP moves forward as soon as the capture point is ahead.
3. **A modulated push-off** in pre-swing / double support. Today an unregulated ≈ +0.1 m/s push comes at every swing start.
4. **Longer, slower steps** (heel-off) once the stance can use them.

What carries over: it changes the inner loop, so every change needs re-identification; the placement layer, the swing, the maps machinery and the bench are reused. It is also the foundation jogging / running will need: push-off and stance-phase speed control matter more there.

**B. A lookahead decision layer on the current inner loop.** Choose each step by its consequences two or more steps ahead. The depth-2 beam oracle proves this can hold today's plant for 26–28 steps with a perfect model. It needs a predictive model accurate in a nonlinear regime (long steps, alternating double supports):
- linear step maps get WORSE with more data (mU1 14.7 → mU7 8.5 → mU8 4.5);
- B therefore means a learned / local nonlinear dynamics model, or a calibrated reduced physical model, plus a multi-step search;
- it is a modelling project with an uncertain payoff: the oracle's model was perfect, ours have 4–6 cm errors, and the oracle needed both lookahead and accuracy.

**Not proposed now:** a shorter foot. The F0 boot is 36 cm; a human foot in a shoe is ≈ 27–29 cm. It would shorten the heel lever and the CoP travel, but it is a body change (your decision) and not clearly the main factor.

**Why A over B:**
- The measured root cause is in the stance: no net braking in single support, braking only at touchdown. That is WHY placement needs two-step lookahead with near-perfect prediction to hold this body.
- B works around the cause with a prediction accuracy we have not got.
- A attacks the cause, which makes the step-to-step problem easier for any decision layer, including the one we already have. It is also what jogging and running will need.

**What tonight hands to either path:**
- **The target gait:** ≈ 0.40 m steps, 0.40 s single support, longer double supports, ≈ 0.5 m/s. The beam oracle walks it, so A should aim its stance and push-off design at it.
- **The oracle tools:** they bound any new inner loop quickly (myopic: ≈ 15 min; beam: ≈ 2 h for 28 steps). If a new stance controller makes the myopic oracle walk indefinitely, the existing placement layer should be close behind.

## Evidence index

- Viewer: [`viewer/index.html`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_overnight/viewer/index.html), or <http://127.0.0.1:8171/review_artifacts/physical_character_v1/g2_overnight/viewer/index.html>.
- Working log, every experiment including the dead ends: [`OVERNIGHT_LOG.md`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_overnight/OVERNIGHT_LOG.md).
- Bench data (compressed, per case): `json/bench_*.json.gz`.
- Maps: `g2_walker/json/mX1`, `mU6`, `mU7`, `mU8`, `mF2`, `mK1`, `mL40`, `mL40b`.
- Oracle runs: `json/oracle/` (myopic, wide grid), `json/oracle_narrow/`, `json/oracle2/` (depth-2 beam).
- Figure: [`stance_mechanism.png`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_overnight/stance_mechanism.png) (capture point, COM and CoP through a steady step and a runaway step).
- Scripts: `analysis/` (`walk.mjs`, `multi.sh`, `tq.mjs`, `brake.mjs`, `brake_or.mjs`, `ank.mjs`, `cop.mjs`, `copdump.mjs`, `late.mjs`, `oracle.mjs`, `oracle2.mjs`, `rec.mjs`, `build_viewer.py`, `run.sh`, `summ.py`, `anaf.py`; `lib.mjs` loads the body).

**Opt-in options added tonight** (all default off; gates bit-identical):

| option | what it does |
|---|---|
| `human.over.swingGen "x"` + `swingX {…}` | swing executor X; `vertical: "inherited"` = the hybrid |
| `walk.ctrl.late {tau, g, dMax, T}` | one late correction through the measured inverse execution model |
| `walk.ctrl.preview {T, q1, q2, r}` | two-step preview placement |
| `walk.rocker {kdF, until}` | heel-rocker compliance continued into single support |
| `walk.ctrl.Lref` | the reference step of the joint maps solve (the gait it settles on) |
| `g2_stepbench` `retarget.dT` | timing changes |
| `g2_stepbench` executor-X log | records X's plans and reach checks |
| `uident.py --dither` | identification dither control |

**Regression (re-run after the last code change, before the final commit):**
- `regress.sh` 12/12 identical;
- G2W_A8 hashes 5780483c / 17d27b5d / 5082d76a / 47427dbb / 1f5445fd / b373d22e;
- foot gate F0 42/42 and F2h 42/42 identical;
- determinism: repeated walks reproduce their hashes;
- Node CPU ≈ 0.25 s per simulated second (12-step walk ≈ 2 s).

# G2b unified walking controller — review

**2026-10-02 — STOPPED for your review. A sustained walk across all starts is NOT achieved.**

- One start (L@0.6) walks all 40 steps of its test, steady at ≈ 0.5 m/s:
  - speed at the step start 0.45 ± 0.02 m/s;
  - steps 0.255 ± 0.038 m, width 0.295 ± 0.040 m;
  - foothold error −0.4 ± 1.2 cm.
- The other five starts end after 6–11 steps. The best configuration averages 14.7 upright steps over six starts (old walker: 11.2).

I am stopping because the evidence now points to one component as the binding limit: the inherited swing executor. Replacing it is an architectural step you should see first. Everything below is opt-in; all approved gates are bit-identical. Local commits only; nothing pushed.

- **Side-by-side review:** [`viewer/index.html`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_unified/viewer/index.html), or <http://127.0.0.1:8171/review_artifacts/physical_character_v1/g2_unified/viewer/index.html>.
  1. the sustained walk vs the old walker, same start;
  2. a typical start that still fails;
  3. the swing-delay fix at an identical state;
  4. a late foothold change at an identical state.
- **Working log:** `UNIFIED_LOG.md`, every experiment including the ones that did not help.

## In plain English

### 1. The 50 ms lag: located and fixed realistically (your item 5)

The swing landed ≈ 7 cm long. The cause is not the swing's path; it is its **velocity target**:
- The hip joint's target speed = (the thigh's intended speed in the world) − (the pelvis's rotation rate).
- The controller used the pelvis rate from 50 ms ago.
- The pelvis pitches in reaction to the swing hip's OWN torque within milliseconds, so the stale rate pushed the leg forward.

**Shown by a diagnostic** that let parts of the swing read the true current state (never a controller option):

| swing reads the true… | landing error |
|---|---|
| nothing (the inherited swing) | +6.7 ± 1.9 cm |
| velocity terms only | −1.5 ± 1.1 cm |
| pitch rate alone | most of that difference |
| path, feed-forward or pose | no change |

**The fix keeps the 50 ms sensing latency.** The controller predicts the pelvis rate at the moment its command acts, from an internal forward model of its own swing program, learned online from the delayed measurements.

| at identical states, Controller A's own steps | landing error | swings succeeding |
|---|---|---|
| inherited swing | +6.7 ± 1.9 cm | 63 % |
| internal-model swing | **+1.0 ± 2.1 cm** | **87 %** |

Anything unexpected in the last 50 ms is still unseen.

### 2. One hierarchy (your items 1, 2, 4)

Built as `walk.ctrl.kind "U"` (`pc_unified.js`):
- **Target:** the requested velocity defines one reference gait (orbit).
- **Stance (ground reaction):** the stance ankle tracks that orbit, forward and now also sideways. The reference starts at the measured state and converges onto the orbit by touchdown (a "funnel").
- **Double support:** aims at the orbit's next start.
- **Foothold and timing:** the remaining predicted error goes to them. The model is a step map measured under this same inner loop.
- **Reachability:** a physical estimate from the actual state: the leg's reach and hip range from where the pelvis will be, and the swing foot's travel within the leg's acceleration capacity.
- **Speed loop:** a slow integral on the measured walking speed shifts the whole orbit, so the ground reaction and the placement never fight over speed.

Things found and fixed on the way:
- **A silent fallback:** the stance reference fell back to the old plan, re-anchored at each step start. From a slow start that plan diverges backward, and the stance legs' velocity reference went from +0.41 to −0.37 m/s, braking the body.
- **A jumping reference:** a reference that jumps at liftoff injects a 0.37 → 0.71 m/s velocity step. The funnel removes both problems.

### 3. Why the walk still does not last: decisions must be late, and late corrections cannot be executed

**The plant is strongly unstable step to step:**
- Open-loop gain ≈ 2 forward and ≈ −3 sideways per step.
- From the step-start state, the next step's start is predictable only to ≈ 4–5 cm across the walk (2.5 cm near the steady orbit).
- That missing information is not yaw (tested: adding pelvis yaw does not help). It is the previous step's geometry, the COM and nonlinear effects.
- Late in single support the body's own state carries the missing information.

**A linear closed-loop test** with the measured models, their measured errors and the real input bounds (60-step survival):

| decision made at | survival |
|---|---|
| step start | 0 % |
| 0.1 s | 0 % |
| 0.2 s | 56 % |
| 0.25 s (≈ 0.15 s before touchdown) | **99 %** |

Robust walking therefore needs foothold corrections late in the swing.

**The inherited swing cannot execute late corrections:**
- Its feed-forward asks for 0.3–1.8 kN·m at the swing hip in the first 20 ms of every swing. The actuator limit is 230 N·m.
- The causes are in its lift path: x^1.2 has unbounded acceleration at liftoff, the lift height is 20 cm, and a late change is blended over as little as 60 ms (≈ 60 m/s² for 5 cm).
- The hip saturates, and the foot trails its own path by 5–9 cm.
- In the walk, the in-swing decisions lengthen the step by +12 cm on average, but the landing lands where the START decision was (+1 cm). Only 57 % of landings come within ±5 cm of the final target.
- **Arrival-gated descent:** I built a descent that waits for the foot to arrive (holds 5 cm until the foot is within 4 cm of its landing point). Late LENGTHENING is then executed (+8 cm at 0.2 s → +0.8 cm). Late shortening is still only ≈ 40 % executed: the moving foot cannot stop short.

**Double support has no authority:** the trailing leg is already at 99–100 % extension at touchdown, so double support lasts 0.07–0.13 s. A lower walking pelvis is not the answer: re-identified and tested, it is worse (4.5 steps, more unstable sideways).

### What I recommend (the decision I need)

**Approve a redesign of the swing executor as the next step**, within your item 6 (generic, foot-agnostic, executes a reachable world foothold and touchdown time from the actual state). It should:
- Plan the foot's path from its actual state (position, velocity), C² everywhere, with accelerations inside the hip's actual torque capacity. That means no singular lift at liftoff, and a lift height set by clearance of the real collider rather than a fixed 20 cm.
- Re-plan the same way when the foothold changes in mid-swing, and descend only once the foot has arrived.
- Report the set of footholds it can still reach. That set is asymmetric: a moving foot can extend late, but not shorten.

Then the placement layer makes its corrections late (≈ 0.15 s before touchdown, where the linear test gives 99 %) within that set, and the maps are re-identified under the new swing.

Alternatives, not recommended now:
- (b) Keep step-start decisions and extend the data-driven regulator (LQR) to richer state. Near the steady orbit it works in the linear test (97 %), but its model failed 10 cm on states outside the identified region.
- (c) Revisit gait geometry (terminal-stance heel rise / push-off). My tests were inconclusive; heel rise without push-off stalls the walk.

## The metrics you asked for (best configuration vs the old walker, six starts)

| | old walker (G2W_A8) | unified (best) |
|---|---|---|
| upright steps | 11.2 (9–13) | 14.7 (6–**40**) |
| forward speed (after the first quarter of each walk) | 0.65 ± 0.25 m/s, creeping up | 0.51 ± 0.15 m/s |
| sustained start L@0.6, steps 4–38: speed at the step start | — | 0.45 ± 0.02 m/s |
| step length | 0.27 ± 0.13 m | 0.27 ± 0.17 m (sustained run: 0.255 ± 0.038) |
| cadence | 119 steps/min | 113 steps/min |
| single support (air) / double support | 0.30 / 0.20 s | 0.31 / 0.21 s |
| foothold, final target vs achieved (forward) | +1.6 ± 13.7 cm | −5.7 ± 15.8 cm (sustained run: −0.4 ± 1.2) |
| early or failed swings | 33 % | 16 % |
| minimum toe clearance (median / p10) | 3.3 / 0.0 cm | 5.1 / 1.0 cm |
| foot speed at touchdown (vertical) | −0.44 m/s | −0.23 m/s |
| stance slip (median / p90) | 2.0 / 5.8 cm | 1.6 / 3.6 cm |
| trailing-leg extension at swing start | 0.994 | 0.982 |
| saturated actuator axes (mean) | 4.0 | 3.1 |
| falls | 6 / 6 | 5 / 6, plus the sustained start, which falls only after the test's last step (stopping is not controlled yet — G2c) |

- **Fall classes:** the old classifier labels every fall PLANNER-INFEASIBLE. Its "reach" criterion is still uncalibrated: it flags step 2 even in the 40-step walk, so it over-reports.
- **What the failing walks actually show:** a stall-then-runaway around steps 3–9, and late corrections the swing could not execute.
- **Yaw:** measured, not changed. The pelvis is yawed a steady 15–20° at every step start and swings ±15–20° within the step (≈ 4× human). Adding yaw to the step model does not improve it, so yaw is not what limits this stage.

## Technical summary

| experiment | finding |
|---|---|
| E1, swing attribution at matched states | the 50 ms-old pelvis pitch rate in the swing hip's velocity target causes the overshoot; the internal forward model fixes it (above) |
| E2, reachable set at matched states (18 states × 40 requests) | with the internal-model swing, footholds 0.05–0.45 m at single support 0.38–0.50 s succeed 94–100 %; reach is not the binding limit at moderate speeds |
| matched-state step maps under the unified inner loop | sideways response at a fixed state is precise (≈ 1 cm); across states the error is 2.5–5 cm |
| orbit identification with pushes | local four-state model with 2.5 / 2.8 / 3.1 cm error; LQR on it survives 97 % in the linear test, but fails on initiation states |
| E4 / E9, late foothold changes | inherited swing executes 75 / 55 / 30 % of a change at τ 0.1 / 0.2 / 0.3; the arrival-gated descent executes lengthening fully, shortening ≈ 40 % |
| swing-hip torque | feed-forward peaks 0.3–1.8 kN·m in the first 20 ms of every swing (x^1.2 lift); a min-jerk lift halves the peak but changes landing timing |
| posture diagnostics | lower pelvis (re-identified) is worse; terminal-stance heel rise without push-off stalls |

**Opt-in options** (all default off, gates bit-identical):

| option | what it does |
|---|---|
| `walk.ctrl.kind "U"` | the unified controller, with its options: `place` "maps" \| default predictor; `latFunnel`, `mapBlend`, `tgtSmooth`, `lateExtend`, `lqr`, `dsState`, `identFixed` / `identStart` / `dither` |
| `walk.swingBase` | the pelvis-rate internal model |
| `walk.ssHeelRise` | terminal-stance heel rise |
| `human.descentGate` | arrival-gated descent |
| `human.liftShape` | smooth lift profile |
| `human.blendACap` | capacity-limited blend of foothold changes |
| `loco.oracleSwing` | diagnostic only |

**Verification:**
- `regress.sh` 12/12 identical;
- G2W_A8 hashes unchanged (5780483c … b373d22e);
- foot gate F0 42/42 identical.

## Sources

- Englsberger, Ott & Albu-Schäffer (2015). Three-dimensional bipedal walking control based on divergent component of motion. *IEEE T-RO*. (DCM tracking.)
- Khadiv, Herzog, Moosavian & Righetti (2020). Walking control based on step timing adaptation. *IEEE T-RO*. (Step location and timing within the reachable set, re-optimised during the swing.)
- Wolpert, Ghahramani & Jordan (1995). An internal model for sensorimotor integration. *Science* 269. (Forward models predicting the state over sensory delay.)
- Winter (1992). Foot trajectory in human gait. *J. Biomech.* (Swing clearance, foot speed at heel contact.)

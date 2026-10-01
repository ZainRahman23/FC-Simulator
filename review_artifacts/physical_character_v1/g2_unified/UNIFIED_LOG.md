# G2b unified walking controller — working log (2026-10-01 night →)

These are the user's decisions after the speed/swing review.
- Ground-reaction regulation becomes part of the speed mechanism.
- One hierarchy: velocity → ground reaction → remaining error → foothold + timing → reachability → swing.
- Work at 0.45–0.50 m/s first.
- Reachability is a hard constraint.
- The 50 ms lag gets a predicted-execution-state fix that keeps realistic latency.
- Swing execution is generic.
- F0 is the default; F2h is not rerun yet.
- Yaw is measured, not hidden.

All new mechanisms are opt-in. The approved gates are re-checked at every checkpoint (`regress.sh` 12/12; G2W_A8 hashes; foot gate F0 42/42).

## Tools

- `tools/g2_stepbench.js` — the MATCHED-STATE STEP BENCH.
  - A deterministic walk replays unchanged to step K, then exactly one thing changes for step K: a commanded request (`req`), an option variant (`var`), or a mid-swing foothold change (`retarget`).
  - Per case it records:
    - the state at the decision, from the view and from truth;
    - the swing aligned in real time: liftoff, peak lag behind the command, lead, peak speed, touchdown time and fraction;
    - the landing error, re-contacts and trips (a brief light toe tap during the pivot is not a failure);
    - the next start state, and continuation.
- `analysis/bench.py` (parallel shards), `e1_oracle.py`, `e2_reachgrid.py`, `e3_ugrid.py`, `e4_retarget.py`, `uident.py` (the unified controller's closed-loop dithered identification).
- `pc_unified.js` — the unified controller (orbit, funnel stance reference, forward predictor, reach range, lateral options, regularised solve). It is wired into `pc_plan.js` through `walk.ctrl.kind = "U"`.

## E1. The 50 ms lag is in the swing's velocity target, not its path

Matched-state bench: 6 starts × steps 2–6, Controller A's own requests. For attribution only, a diagnostic oracle (`loco.oracleSwing`, never a controller option) let parts of the swing read the true current state instead of the 50 ms-old view.

| variant | landing error, forward (cm) | swing OK |
|---|---|---|
| base | +6.7 ± 1.9 | 63 % |
| whole swing reads truth | −2.6 ± 4.6 | 77 % |
| IK only | −1.7 ± 3.6 | 70 % |
| feed-forward only / path only | +6.6 / +6.4 | — |
| IK: pelvis rotation / hip position | +6.0 / +6.2 | — |
| **IK: the velocity target's base motion** | **−1.5 ± 1.1** | **90 %** |
| of that, the pelvis rotation rate | +1.8 ± 1.2 | 87 % |
| … pitch axis alone | +2.6 ± 1.2 | 90 % |

**Mechanism:** the swing hip's velocity target is (thigh's world rate) − (pelvis rate). The pelvis pitches in reaction to the swing hip's own torque within milliseconds, so a 50 ms-old pelvis rate injects kd·(the rate's change over the delay) into the hip. The foot then runs ≈ 0.9 m/s past its command in mid-swing.

| pelvis rate in the velocity target | landing error, forward (cm) | swing OK |
|---|---|---|
| zero (translating base) | +6.4 | — |
| delayed (the view) | +6.7 | — |
| low-passed | +10.6 | — |
| **expected rate from the swing phase (internal forward model)** | **−1.1 ± 2.5** | **80 %** |
| same model, learned online from zero using only the delayed measurements | **+1.0 ± 2.1** | **87 %** |

**Fix (opt-in `walk.swingBase = { w: "model", learn, pure: [0] }`):** the pelvis pitch rate the swing assumes is the forward model's expectation at the command's own phase. Yaw and roll use the delayed measurement plus the model's change over the delay. Latency stays realistic: anything unexpected in the last 50 ms is still unseen.

- The pelvis rate over a swing is strongly stereotyped: pitch +1.0 → −1.0 rad/s, yaw down to −3 rad/s. The swing phase explains 45–55 % of its variance.

## E2. Reachable set at matched states (18 states × 40 requests)

- With the internal-model swing, swings succeed 94–100 % for footholds of 0.05–0.45 m at single support 0.38–0.50 s.
- At 0.32 s the swing fails beyond about 0.35 m.
- The local step response at a fixed state: x′ ≈ a(state) − 1.0·df + 0.5…0.8·T, rms 2–5 cm.
- The intercept follows the state: x′ ≈ −0.19 + 3.0·ξ − 1.0·COM.

## Capture-point (LIPM) fidelity

**With the measured CoP:**

| horizon | error (cm) |
|---|---|
| liftoff → touchdown | −2.4 mean, 4.6 rms |
| mid-swing → touchdown | 3.5 rms |

- With the PLANNED roll, the LIPM is biased −11 cm.
- The real CoP leads the command late in single support. When the stance leg nears full extension the boot pivots on its tip (the CoP sits at the toe).

**Double support in the closed loop** (both controllers):
- It lasts only 0.07–0.10 s.
- The trailing leg is at 99 % extension at touchdown.
- x′ ≈ e + 0.06, where e = ξ_td − u.

## The stance reference drives the stance legs' velocity reference

The stance legs track vRef = ω(ξ_ref − c).
- **The bug:** under the unified controller the stance reference silently fell back to the old plan, re-anchored at the measured step start. `_xiD` only consulted `_dcmRef` when `walk.dcmRef` was set.
- **Effect:** from a slow start the old plan diverges backward, vRef goes +0.41 → −0.37 m/s, and the stance damping brakes the body.
- **Fixed.**

**A jumping reference also injects force:** a reference that steps at liftoff makes vRef jump 0.37 → 0.71 m/s.

**Funnel reference:** the stance reference starts at the measured state and converges min-jerk onto the vd orbit by touchdown (`funnel` 0.5). It is continuous; at the step start vRef equals the body's own velocity.

## The forward state does not pin the speed

In the maps placement mode the forward capture-point offset at the step start is regulated (closed-loop gain 0.63–0.84), but the walking speed is NEUTRAL (v′ ≈ 1.0·v).
- At a fixed offset, speed rises with step length: a family of gaits share x.
- With the timing range narrowed to [0.38, 0.44], the sideways closed loop goes unstable (−2.0); with the full range it is −0.7. Timing is a sideways input too.

## Swing execution of in-swing changes

**In the closed loop:**
- In-swing re-decisions lengthen the step +12 ± 9 cm over the step-start decision.
- The achieved landing equals the START decision (+1 cm). Achieved − final = −11 ± 17 cm.
- The τ-indexed maps disagree with each other, so the target jumps ±5–9 cm tick to tick when the active map switches.

**Bench (`e4_retarget.py`):** the swing follows a mid-swing change only partly.

| change made at | share of the change executed |
|---|---|
| τ 0.1 | ≈ 75 % |
| τ 0.2 | 55 % |
| τ 0.3 | 30 % |

Profile:
- The actual foot trails its command by 5–9 cm in mid-swing, even with the true pelvis rate.
- The descent runs on schedule, so after a late forward change the foot reaches the turf before it arrives.

**Swing hip actuator during walking swings:**
- Flexion peaks at 224–229 N·m against its 230 N·m envelope (saturated 2–8 % of swing time).
- Twist is saturated 5–12 %.
- The swing works at the hip's capacity.

**Arrival-gated descent** (opt-in human `descentGate = { d, wOpen, h }`; the floor held 5 cm until the foot is within d):
- Late forward changes are then executed (+10 cm at τ 0.2 → −0.5 ± 3.6 cm).
- Shortening changes overshoot (+5 cm).
- In walks it shifts timing and was not better with maps that don't know it.

## Prediction-error floor

At τ = 0.2 the map's cross-validated error is 4.3 / 3.6 cm (forward / sideways) → 3.8 / 3.1 cm with all extra state features (COM, velocity, angular momentum, yaw, pelvis velocity).
- Most of it arises after the decision: landing scatter (≈ 2 cm) plus double-support duration (±0.03 s ⇒ ±2.4 cm).
- A double support that ends on the state (`dsState`) cannot help: the trailing leg is already at 99–100 % extension when the double support begins.

## Walks (six starts, F0, vd 0.5 unless stated)

| configuration | upright steps | speed (m/s) |
|---|---|---|
| G2W_A8 baseline | 11.2 (9–13) | 0.65 ± 0.25 |
| unified, forward predictor + fixed timing + capture-point sideways law | 5–6 | **0.39 ± 0.02**, steady; ends sideways |
| unified, maps placement (identified under this inner loop), nominal step reference | **13.0 (6–30)** / 14.7 (6–40) | 0.51–0.52 ± 0.15 |
| same, minimum width 0.20, timing [0.38, 0.44] | 13.3 (9–29) | 0.55 ± 0.19 |

In the maps placement mode one start (L@0.6) walks 30–40 steps at a steady 0.45 m/s with 0.25–0.28 m steps. The others end in a forward runaway after a short/long step pair around steps 3–6.

Not better than these:
- partial/regularised solves;
- re-identified maps (mU2);
- lower requested speeds;
- timing used for the sideways residual;
- early commit;
- stiff step length;
- state-ended double support;
- terminal-stance heel rise (`ssHeelRise`: air time 0.30 → 0.34–0.40 s, but without push-off the walk stalls).

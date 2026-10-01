# G2 — the physical plant, measured, and a stepping-controller design from it

**2026-10-01 · measurement and design only — no new walker built (as instructed). G2b not promoted; G2c–e not started.**

- **Interactive:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2` — buttons C1–C8 in the side panel; the magenta ghost is the comparison run.
- **Figures:** `fig/1_control_response.png`, `fig/2_state_sensitivity.png`, `fig/3_stability_vs_gain.png`, `fig/4_yaw_segments.png`.
- **Data / model:** `json/` (`model.json` = the fitted maps and every number below).
- **Reproduce:** `node tools/g2char_run.js --phase all --inner natural`, then `python3 analyse_char.py`.

---

## In plain English

1. **I stopped steering and measured.** I made the character take one step exactly where I told it, from a repeatable state, hundreds of times. I changed one thing at a time: where the foot goes, how long the step lasts, or a small push or twist at the start. I recorded where the body ended up one step later.
2. **Forward control is easy; sideways control is hard.**
   - Moving the foot further forward does almost exactly what you'd expect.
   - A sideways error grows about **10–12×** by the next step and **flips side**. Changing the step width corrects it weakly: about 1.1–1.5 cm per cm of width.
   - Widths narrower than about 17 cm are impossible with these boots.
   - So a 1 cm sideways mistake needs a 7–10 cm width change next step, and there is barely enough room for that.
3. **Why every previous controller oscillated.**
   - Its sideways gain was about half what this body needs.
   - Forward and sideways are tangled together: a forward push changes the next sideways position. Controlling the two separately works in only about **1 %** of possible gain settings.
   - That is the alternating, growing step-width wobble you saw.
4. **The double-support phase is longer and less predictable than every model assumed.**
   - It lasts 0.22–0.38 s, sometimes 0.5 s, instead of 0.15 s.
   - The usual cause is that the heel-strike foot sometimes doesn't roll flat, so the controller waits.
   - That unpredictability is about a third of the room available to correct with.
5. **Stepping a little faster helps a lot.** With a 0.40 s instead of 0.45 s single support, the sideways growth halves (≈ 5.6× instead of ≈ 10×) and the forward one drops.
6. **The remaining twist (yaw) comes mostly from double support, not single support.**
   - With the feet 25–37 cm apart, the back foot pushes forward while the front foot brakes, and that couple twists the whole body.
   - The trunk then turns *with* the legs instead of against them, and the arms only cancel about 40 % (a human cancels about 64 %).
   - My earlier "5× the arms" figure was wrong; it's about 1.7×.
7. **Recommendation.**
   - First make the plant predictable: a fixed, reliable double support, a slightly faster cadence, a narrower gait.
   - Then let the stepping controller pick foot position **and** step timing together, using this body's measured step response, scheduled by the timing it actually executes and updated as it walks.
   - A plain SIMBICON-style controller, which handles each direction separately with fixed gains, is a useful baseline, but this data predicts it will be hard to tune on this body.

---

## 1. The characterisation harness (opt-in, measurement only)

**Setup.**
- **Open-loop steps** (`rhythm.walk.char`): each step's foothold (forward df and width dl from the stance foot's sole centre) and single-support duration T are commanded. There is no in-swing correction.
- **Fixed minimal inner loop:**
  - single support: the stance CoP follows a fixed heel → toe roll (capture-point feedback gain −1, i.e. none);
  - double support: the CoP ramps from the trailing to the leading foot;
  - plus the validated landing work: controlled descent, 1 cm retraction, delay-compensated swing.
  - commanded walking speed 0.6 m/s; the reference **style** clip (arm swing, joint preferences) is of_loco's 0.8 m/s walk — as measured; it shapes no foothold or timing.
- **Only the measured step is controlled.** Every step after it is the same uncorrected open-loop step, so most runs fall about 1 s later. That is expected: each run measures one step's response, not a walk. (Step counts in these runs are not walking results.)
- **Perturbations at the measured step's start** (`pushChar`): forward / sideways pushes at the pelvis, and a pure yaw couple (two equal and opposite impulses, no net linear impulse). All are booked in the external-impulse ledger.
- **State** at each single-support start (liftoff) and touchdown, relative to the stance foot:
  - COM position and velocity;
  - capture point ξ;
  - pelvis position and velocity;
  - whole-body linear and angular momentum, and vertical angular momentum by segment;
  - pelvis yaw and yaw rate;
  - support state, achieved foothold, swing and double-support durations;
  - human measures: mid-swing clearance, knee at touchdown, pelvis yaw peak, saturation.

**Conventions.**
- Sideways is **mirrored** (+ = inward, toward the other foot), so a periodic gait maps onto itself.
- **Fall-aware:** a sample counts only if the body is upright (COM > 0.75 m) at the next liftoff. Classes: upright / fallen / swing-failed (re-contact < 0.25 s after liftoff).
- Both bugs found earlier are excluded: retraction is `swingRetract` explicitly; the actual-pitch clearance is off.

**References** (all from the same deterministic standing start):
- **A:** the measured step is step 2 (left swing), after a shot first step. 135 / 152 upright.
- **C:** as A with T 0.40 s. 134 / 152 upright.
- **B:** the measured step is step 3, after a moderate 0.36 m step 2. Only 21 / 152 upright — see §3.4.

**Sweeps.**
- One input at a time: foothold forward 0.18–0.50 m, width 0.10–0.42 m, T 0.33–0.57 s, forward push ±16 N·s, sideways push ±12 N·s, yaw ±4 kg·m²/s.
- Four 2-D grids (forward × width, width × sideways push, forward × forward push, T × sideways push).
- 456 simulations; all deterministic (identical hashes on re-run).
- Inner-loop variants measured too: neutral, ankle feedback, and double-support tracking sideways or both axes.

## 2. The measured step-to-step map

A local linear fit (upright samples near nominal; residual ≈ 3 cm rms per axis):

**x′ = c + A·x + B·u**, with x = [ξ forward, ξ inward] at single-support start and u = [Δdf, Δdl, ΔT].

| | ref A (T 0.45 s) | ref C (T 0.40 s) |
|---|---|---|
| A (state → next state) | [[+4.09, −2.44], [+3.20, −9.94]] | [[+2.48, −1.60], [+1.12, −5.60]] |
| eigenvalues of A | +3.5, −9.4 | +2.25, −5.4 |
| B: forward foothold → (fwd, in) | −1.21, −0.65 | −1.20, −0.75 |
| B: width → (fwd, in) | −0.20, +1.45 | −0.20, +1.42 |
| B: single-support duration → (fwd, in), per s | +1.67, −1.51 | +2.47, −1.27 |

One-at-a-time slopes at A agree: next forward / forward foothold −1.02; next inward / width +1.14; next forward / forward state +4.4; next inward / inward state −12.2; next inward / forward state +2.7 (the coupling). See `fig/1`, `fig/2`.

**Other plant facts:**
- **Width saturates.** Commanded widths below ≈ 0.17 m are not achieved (0.10 → 0.16, 0.14 → 0.18).
- **The forward foothold is achieved within ≈ 1–3 cm** over 0.18–0.50 m (the delay compensation works).
- **Double support is 0.22–0.38 s** (median 0.29), never the planned 0.15 s. Measured gating (§3.3):
  - the contact gates clear at ≈ 0.16 s, plus ≈ 0.05 s for the trailing foot to actually leave;
  - when the heel-strike foot fails to roll flat, the gate holds the double support to its 0.45–0.5 s timeout.
- **Yaw barely moves the next capture point:** ≤ 0.04 cm per kg·m²/s.

## 3. Sources of instability

### 3.1 Sideways — the dominant one

- **Amplification.** With a fixed foothold, a 1 cm inward error at liftoff becomes ≈ 10–12 cm of the opposite sign at the next liftoff. That is a sign-flipping amplification of −10 to −12 per step; the linear pendulum model predicted ≈ 6.5. The measured double support is twice as long as modelled, and the step period sets the exponent.
- **Narrow correction band.** Sideways placement alone (δdl = K·δξ_in) needs **K ∈ [6.2, 7.5]** at T 0.45 s and **[3.2, 4.6]** at 0.40 s for the error to decay.
  - Below the band: amplifying oscillation.
  - Above it: amplifying overshoot.
- **Too little room for the noise.** The ≈ 3 cm unexplained per-step variation is a third of the ≈ 9 cm narrow-side width room.
- **Why every earlier controller failed sideways.** Their implicit sideways gain was ≈ 6.5 at the *model's* map. On the real map that is either below the band or on its edge. The predicted result is an alternating, growing width oscillation, which is exactly what was observed (widths 23 ↔ 47 cm).

### 3.2 Forward

- **Amplification ×3.3–6.6 per step,** growing with step length. At the reference state the body accelerates (0.39 → ≈ 0.7 m/s) unless the step is ≈ 0.46–0.50 m.
- **The foothold is a clean lever,** and the stable forward-gain band is wide (**K ∈ [2.6, 4.2]** at 0.45 s, [1.2, 2.9] at 0.40 s).
- **The danger is speed.** Once too fast, the trailing leg reaches full extension (hip–ankle 0.90–0.92 m of a 0.927 m leg) with its rigid boot flat, so the next swing cannot complete. In ref B (button C8) the step after the 0.38 m step re-contacts 0.14 s after liftoff, 12 cm *behind* the stance foot. Long steps are bounded by that geometry. Speed must be regulated before it gets there.

### 3.3 Coupling, and why separate per-axis laws fail

- A forward error changes the next sideways offset (+3.2), and a sideways error the next forward one (−2.4).
- With independent forward / sideways gains, the **coupled** map is stable in only **≈ 1.1 % (A) / 1.4 % (C)** of the gain plane (`fig/3`, right) — two small islands.
- Every previous design used independent axes.

### 3.4 The unpredictable parts

- **Double-support duration:** the gates, the heel rocker, the liftoff delay.
- **The ≈ 3 cm residual per step.** It shrinks only if the plant is made more deterministic.

### 3.5 Inner-loop options (measured, ref A, one-at-a-time set)

| inner loop | upright | next fwd / fwd state | next in / in state | double support (median) |
|---|---|---|---|---|
| natural (no single-support feedback) | 49/52 | +4.4 | −12.2 | 0.27 s |
| neutral (gain 0) | 18/52 | +4.3 | −12.8 | 0.33 s |
| ankle feedback (gain 0.5) | 26/52 | +5.7 | −14.4 | 0.37 s |
| double-support sideways tracking | 28/52 | +4.1 | −7.6 | 0.34 s |
| double-support tracking, both axes | 8/52 | — | −9.8 | 0.36 s |

- **Single-support capture-point feedback makes this body worse,** not better: more falls and longer double support.
- **Double-support sideways tracking halves the sideways amplification,** but at the cost of longer double supports and fewer upright samples in its current form. Worth keeping as a design option only with a fixed-duration double support.

## 4. The single-support yaw problem (separately)

**Per-segment vertical angular momentum** (`fig/4`; peak in the representative left-swing single support):

| segment | kg·m²/s |
|---|---|
| swing leg | +2.25 |
| stance leg | +0.79 |
| pelvis | +0.25 |
| trunk | +0.87 |
| left arm | −1.02 |
| right arm | +0.45 |
| **whole body** | **+3.38** |

**Correction:** the swing leg carries ≈ **1.7×** what the arms cancel, not 5×. The arms' net is −1.33, and one arm is wrong-signed.

**Where it is injected:**

| phase | change of whole-body vertical angular momentum |
|---|---|
| double support | **+2.8 and −6.8** kg·m²/s (external moment spikes ±25–75 N·m) |
| single support | −0.9 and +1.4 |

The double support's horizontal force couple dominates: the trailing foot pushes, the leading foot brakes, 0.25–0.37 m apart sideways. The single support carries what was injected, so the pelvis keeps turning (±10–18°).

**Human reference:**
- Normalised whole-body angular momentum < 0.03 (by mass × COM height × speed; Herr & Popovic 2008).
- About the vertical axis the two thighs, in phase, are the main term; the arms cancel it out of phase (coefficient ≈ 0.64 with arm swing, 0.20 arms folded); thorax and pelvis are small.
- The external moment from the ground-reaction forces is the main regulator; the free moment is minor (PMC10192365).
- **Ours ≈ 0.075:** 2.5× the human bound.

**Primary missing mechanisms** (a combination, ranked):
1. **The gait's geometry and timing make the double-support couple large:**
   - wide steps (0.18–0.37 m vs a human ≈ 0.1);
   - a long double support (0.22–0.38 s);
   - large fore-aft force differences in the transfer.
2. **The trunk co-rotates with the legs.** It should counter-rotate relative to the pelvis, as in human thorax–pelvis counter-rotation.
3. **Arm counter-swing amplitude / timing:** 40 % cancellation vs 64 %.

The stance foot's free moment and the swing-leg path are secondary. **Not** the solution: pinning the pelvis heading (turning must stay possible).

## 5. Human compatibility of the measured region

Upright samples, refs A + C (5th / 50th / 95th percentile):

| measure | ours | note |
|---|---|---|
| step width | 0.18 / 0.24 / 0.37 m | human ≈ 0.08–0.13 m; the boot limit is ≈ 0.17 |
| step length | 0.25 / 0.36 / 0.46 m | |
| mid-swing clearance | 0.7 / 1.2 / 1.5 cm | human minimum toe clearance ≈ 1–2 cm |
| double support | 0.22 / 0.29 / 0.38 s | human ≈ 0.12–0.2 s at these speeds |
| pelvis yaw peak | 10 / 13 / 18° | human ≈ 4–6° |
| knee at touchdown | 23 / 37 / 45° raw (the standing knee reads 14°) | bent; human heel strike ≈ 5° |

**The stable, human-compatible target region:**
- width 0.18–0.26 m (as narrow as the boots allow);
- step length 0.30–0.42 m;
- single support 0.37–0.42 s (cadence ≈ 105–115 steps/min at 0.6–0.8 m/s);
- a short, fixed double support (≈ 0.12–0.16 s).

It is also where the measured amplification is smallest.

## 6. Controller families, evaluated on the measured map

### A — measured-response foot placement + step timing (recommended)

- **Controls:** the next foothold (forward, width) **and** the single-support duration, re-solved every tick during the swing (late adjustment already exists).
- **State:** the predicted capture point at touchdown (forward, inward) from the delay-compensated state, plus the executed timing.
- **Model:** this body's measured step map, **scheduled by T** and step length.
  - A single fixed model is fragile: a deadbeat design for T 0.45 s applied at 0.40 s has a step-to-step factor ρ ≈ 4.1. A ±20 % error in B alone gives 1.07–1.87.
  - So the model must be scheduled and refined online: recursive least squares on every executed step.
- **Design:** a small constrained problem (3 inputs, 2 states), solved for **partial** correction (target ρ ≈ 0.3–0.5, not deadbeat), with:
  - width ∈ [0.17, 0.32];
  - length ≤ the trailing-leg extension limit;
  - T ∈ [0.36, 0.48];
  - a preference for the human nominal step.
- **Uses timing** to relieve the width saturation.
- **Architecture fit:** it is the planner's foothold / timing decision only. The executor, swing, landing, support layer and actuator arbiter are unchanged; it requests reachable footholds and never moves the body.
- **Assumptions:**
  - a deterministic, predictable inner loop (§7.1);
  - a good state estimate at the decision time (delay compensation);
  - the map stays smooth within the operating region.

### B — SIMBICON-style state feedback (baseline)

*Yin, Loken & van de Panne, SIGGRAPH 2007 — read from the primary source.*

- **The original design:**
  - a pose state machine (4 states for walking; timed lift, then until foot contact);
  - the torso and the swing hip servoed in the **world** frame; stance-hip torque = −(torso + swing-hip torques), so everything stays internal;
  - balance: the swing-hip target angle θ_d = θ_d0 + c_d·d + c_v·v in the sagittal and coronal planes (d = stance ankle → COM, v = COM velocity; optional stance-ankle feedback for slow gaits);
  - turning by modulating the facing direction through the stance hip.
- **Mapped to us:** foothold = COM-relative linear law with fixed per-axis gains, fixed timing, no model; torso posture in the world frame (our balance controller already servoes the trunk).
- **On the measured map:** independent per-axis gains are stable in **≈ 1 %** of the gain plane. The paper reports "a fairly broad range of values" working on its own model; on this body the coupling makes the basin small.
- **Value:** a model-free baseline to run first in the next phase; it takes very little code.
- **Assumptions:** the gait's natural dynamics have a broad basin; actuator bandwidth.

### Also well-supported: DCM / capture-point MPC with step-timing adaptation (robotics)

- E.g. Khadiv et al.; Griffin et al.
- **A is the data-driven form of this family:** the same decision variables (foothold + timing), but the step map comes from this body's measurements rather than from the linear pendulum. Our measurements show the pendulum model is wrong by about 2× here.

## 7. Proposed architecture for the replacement (for your review — not built)

1. **Make the plant predictable first** (inner loop):
   - a fixed, short double support (planned ≈ 0.12–0.16 s);
   - load acceptance that reliably rolls the heel-strike foot flat, with the trailing foot's release synchronised (the gate failures are the main variance);
   - natural single-support CoP (no single-support capture-point feedback);
   - a slightly faster cadence (single support ≈ 0.38–0.42 s);
   - nominal width at the boot limit (≈ 0.20–0.22 m), which also shrinks the double-support yaw couple.
2. **Step controller A** (§6): foothold + timing, timing-scheduled measured map with online refinement, partial-correction constrained solve, human-nominal preference, hard reachability / clearance limits.
   - SIMBICON-style B is implemented alongside as the baseline.
3. **Angular momentum:**
   - reduce the double-support couple (narrower, shorter double support, smoother transfer);
   - thorax counter-rotation relative to the pelvis and leg-driven arm counter-swing with its velocity target (style layer, physical, budgeted);
   - measured by normalised whole-body angular momentum. The heading intent stays, so turning remains possible.
4. **Unchanged:** Jolt state, contact truth, finite motors, the single actuator arbiter, no root force / velocity writes / teleports / hidden support; the reference animation stays style only.

## 8. Concrete G2b pass tests (proposed)

| # | test | pass |
|---|---|---|
| P1 | **Steady walk.** 30 steps at 0.6 and 0.8 m/s from 6 starts (first foot × start time) | all upright to the end (fall-aware), no corrective steps |
| P2 | **Bounded gait.** After step 6 | length within ±15 % of its mean; width ∈ [0.17, 0.30] m with sd ≤ 2.5 cm; speed within ±10 % of the request |
| P3 | **Step-to-step convergence.** A 1 cm inward / 2 cm forward capture-point offset injected by a push at a step start | decays to < 30 % within 3 steps, no sign-alternating growth (measured effective step factor ≤ 0.6) |
| P4 | **Yaw** | pelvis yaw peak ≤ 8°; normalised whole-body angular momentum ≤ 0.05 (human < 0.03), not growing over the run |
| P5 | **Touchdown** (preserve the landing work) | foot forward velocity at contact ≤ 0.3 m/s, vertical ≤ 0.5 m/s, peak vertical force ≤ 1.3 BW, braking ≤ 0.2 BW |
| P6 | **Physical integrity** | ledger ≤ 0.05 N·s; no root force / velocity writes; stance slip ≤ 1 cm per step; plausible saturation; determinism ×3; A / B / C1–C3 / D / G1 / G2a bit-identical |
| P7 | **Human form** | cadence 100–120 steps/min; total double support 20–30 % of the cycle; mid-swing clearance ≥ 1 cm; knee at heel strike ≤ 15° (relative to straight); pelvis / trunk counter-rotation present |
| P8 | **Propulsion audit** | forward momentum fully explained by the turf impulse (no hidden source) |
| P9 | **Perturbation set** | ±8 N·s sideways, ±12 N·s forward, ±2 kg·m²/s yaw pushes at mid-swing — recovered within 4 steps without a fall; the larger ones classified honestly |

## 9. Decisions for you

1. **Approve the plan.** Inner-loop predictability first (fixed short double support, reliable flat-foot load acceptance, faster cadence, narrow nominal width), then controller A with SIMBICON-style B as the baseline?
2. **Cadence.** Is a slightly faster cadence (≈ 105–115 steps/min at 0.6–0.8 m/s) acceptable as the default? It is human-normal, and it halves the sideways instability.
3. **Narrow nominal width.** Is ≈ 0.20–0.22 m at the boot limit acceptable? The boot collider is 16.4 cm wide; a narrower boot is a body change, not proposed.

**Sources:**
- Yin, Loken & van de Panne 2007, [SIMBICON: Simple Biped Locomotion Control](https://www.cs.ubc.ca/~van/papers/2007-siggraph-simbicon.pdf) (primary source, read directly);
- Herr & Popovic 2008, "Angular momentum in human walking", J Exp Biol 211;
- [Regulation of whole-body angular momentum during human walking](https://pmc.ncbi.nlm.nih.gov/articles/PMC10192365/);
- Winter 1992, [Foot trajectory in human gait](https://pubmed.ncbi.nlm.nih.gov/1728048/); Lockhart et al., [heel contact velocity](https://pmc.ncbi.nlm.nih.gov/articles/PMC2895264/) (touchdown work).

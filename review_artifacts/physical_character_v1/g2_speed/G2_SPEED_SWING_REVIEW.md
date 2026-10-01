# G2b forward-speed regulation and swing execution — review

**2026-10-01 night. STOPPED for your review. The goal — a materially improved, stable forward walk — is NOT achieved.**

What this pass produced:
- a causal account of the speed creep;
- a working speed-regulation mechanism (it holds the speed, but does not yet make the walk last longer);
- a failure classifier, a reachability analysis, and swing-execution findings.

Nothing is adopted. Every new mechanism is opt-in. All approved gates are bit-identical (`regress.sh` 12/12), and the G2W_A8 and foot-gate hashes are unchanged. Not started: G2c–e, running, the F2h rerun (that needs a stable F0 walk first). Local commits only; nothing pushed.

- **Side-by-side review:** [`viewer/index.html`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_speed/viewer/index.html), or <http://127.0.0.1:8171/review_artifacts/physical_character_v1/g2_speed/viewer/index.html>. Tabs: full walks with a speed trace (baseline vs speed-regulated), the terminal failure, and the swing on identical requests.
- **Working log:** `SPEED_LOG.md`, every experiment including the ones that failed.
- **Tools:** `sandbox/visual/physchar/tools/g2walk_diag.js`; `analysis/` (`classify.py`, `iterate.py`, `swing_fail.py`, `dsum.py`, `build_viewer.py`).

## In plain English

1. **Why the walk speeds up — found.** The forward forces are ordinary pendulum mechanics: the turf impulse equals the CoP–COM geometry within ±5 N·s; there is no hidden force. In single support the stance foot's CoP just plays a fixed heel→toe roll, so the only thing regulating speed was where the next foot lands (Controller A).
   - **The key finding:** Controller A was regulating toward the WRONG speed. Its target is its measured map's fixed point for its nominal 0.22 m step. Measured on the body, that capture-point state belongs to a ≈ 0.63 m/s walk, not the ≈ 0.37 m/s the nominal step implies. The real steps come out longer than nominal (the swing lands ≈ 7 cm past its target, and the in-swing re-decisions lengthen the step ≈ 8 cm). So the walker steadily steered itself up toward ≈ 0.6 m/s.
2. **Why it then collapses.** Near 0.55–0.6 m/s this body runs out of room. The trailing leg is already at 98–100 % extension at almost every swing start (the walking pelvis carries the hip 0.88–0.91 m above the ankle on a 0.924 m leg). Steps longer than ≈ 0.30 m fail their swing 27–36 % of the time. Braking needs a longer step or a quicker one, and both push the swing past what the leg can do: swing failure rises from 6 % below 20 m/s² of required foot acceleration to 45 % above 60 m/s². The classifier attributes every baseline fall to a swing that was already infeasible when it was planned: too much travel for the air time left.
3. **What holds the speed: the ground reaction.** Capture-point (DCM) tracking:
   - in single support from the measured liftoff, and in double support (where the CoP can go anywhere from the trailing toe to the leading toe);
   - toward the capture point of the DESIRED gait, derived from the desired speed through relations measured on this body.

   It holds the walking speed near the target: 0.44 ± 0.07 m/s against a 0.45 target, versus 0.65 ± 0.25 and climbing before. This is the first mechanism that regulates speed causally through the ground reaction.
4. **But it does not yet make the walk last longer.** The step-to-step speed loop is still unstable (measured gain ≈ 1.6). The ground reaction saturates (the sole clamps the CoP demand in 22 % of single support), and placement still plays its own game. Walks end after 6–15 steps either way: a slow stall when below the target, or the old toe catch when above it. Best mean: 10.2 (7–15) upright steps, against 11.2 (9–13) for the baseline.
5. **The swing.** The existing swing is already foot-agnostic in its geometry: it starts from the actual pose and pitch, keeps the clearance on the collider outline, and uses a pitch limit from the ankle's range. What is wrong with it is TIME: it runs 50 ms behind real time (the view is 50 ms old), so it lags, then lands ≈ 7 cm long (very consistently, ± 0.7 cm, and Controller A's maps have learned that). Correcting the delay halves the overshoot, but every swing then gets 50 ms less real air time, and long steps fail more. My from-scratch generic swing (anchored at the measured liftoff, C²) is worse at matched states and is not adopted. Three lessons from it:
   - the feed-forward must see a C² path (kinks became ±550–1150 N·m spikes);
   - a pivot held on the turf pushes an already airborne foot back down (liftoff is confirmed ≈ 60 ms late);
   - the timing of the whole plan matters more than its shape.

## The decisions I need from you

1. **Speed regulation through the ground reaction** (capture-point tracking in single + double support toward the desired speed's gait). Adopt it as the architecture's speed mechanism and continue from it? It is the only mechanism that held the speed. The next step would be making placement serve the same target instead of its own.
2. **Controller A's target.** Its map fixed point is not a valid speed target (it is a ≈ 0.6 m/s state). Approve replacing it with a target derived from the desired speed? That changes what Controller A means.
3. **The speed for G2b.** ≈ 0.6 m/s sits at the edge of what this body does reliably today. I recommend making the walk stable at 0.45–0.5 m/s first and then extending it. That is not Option C: the steps are 0.26–0.28 m at ≈ 100–110 steps/min.
4. **The envelope.** Lowering the walking pelvis 3 cm (diagnostic only) made swing failures WORSE (23 % → 36 %), so the pelvis height alone is not the lever. The binding limits are the swing at long steps and the leg's swing acceleration capacity.

---

## Technical

### A. Where the positive feedback begins

Measurement: G2W_A8, six starts (`tools/g2walk_diag.js`, every hash reproduced).

| link | measurement |
|---|---|
| forces | the horizontal turf impulse per phase = F_v·(c − p)/h with the measured CoP, ± 5 N·s; the rest mirrors −ΔL_pitch/h |
| speed actuators | single support: a feed-forward CoP roll (kXi along = −1); double support: a feed-forward CoP ramp; foot placement (Controller A) is the only feedback |
| the regulated state | the capture point ahead of the stance foot at the step start, x; speed ≈ 0.25 + 1.58·(x − x*) + 1.01·(previous achieved step), rms 0.05 m/s |
| the target | x* = the map's fixed point for the nominal step (0.067 for 0.22 m). Measured x_S ≈ −0.147 + 0.341·v, so x* ≙ 0.63 m/s |
| decisions in the steady phase | the start decision reads "slow": df at its 0.10 bound in 31 %, T at its 0.36 bound in 33 % |
| | in-swing re-decisions lengthen the foothold +7.8 ± 4.9 cm |
| | the swing adds +7.0 ± 2.1 cm |
| | executed steps 0.28–0.34 m |
| speed per phase | pre-swing +0.024, single support +0.075, double support ≈ 0 m/s per step (steady phase) |
| the end | speed error +0.03 → +0.15 → +0.3–0.5 m/s over 2–3 steps; request at the 0.30 bound; trailing leg at 1.00; touchdown at 40–76 % of the swing |

Rejected along the way, measured:
- vRef plan-tracking pushing in double support: vRef − v ≈ 0 there;
- an incomplete state: adding the COM offset to the map changes its CV error 8.05 → 8.02 cm;
- the nominal step as the cause: nominals of 0.26 / 0.30 / 0.33 m run away faster;
- the double-support load gate: liftoff still comes 0.096 s after the step start, which is mostly the 50 ms view latency.

### B. Failure classification (`analysis/classify.py`)

**Labels:**
- **PLANNER-INFEASIBLE:** the final foothold is beyond the swing leg's reach at the planned touchdown, or the air time left is under √(5.77·D / 18 m/s²).
- **SWING-EXECUTION:** feasible, but no liftoff, an early touchdown (< 80 %), a re-contact, or > 8 cm off target.
- **CONTACT/TOUCHDOWN:** stance slip > 6 cm or peak load > 2.5 BW.
- **POST-TOUCHDOWN:** a fall with every step OK.

A fall is attributed to its terminal event: the first step whose swing or contact failed.

**Results:**
- **Baseline:** all six falls are PLANNER-INFEASIBLE terminal steps.
- **Validity:** steps flagged "time" fail their swing 72 % of the time, against 38 % for feasible ones. "Reach" is not yet predictive (its geometry needs calibration).
- **Stance slip:** the stance foot slides or twists a median 2.0 cm per stance (p90 5.8 cm), the yaw moment at the foot. Yaw is untouched, as you asked.

### C. Reachability (D)

**Measured:**
- The trailing leg is at 0.98–1.00 extension at nearly every swing start; the leading leg is at 0.92–0.97 at good touchdowns.
- The support layer cannot lower the pelvis in double support without the LEADING ankle reaching its dorsiflexion limit.
- Swing failure vs required foot acceleration 5.77·D/T_air²: 6–7 % below 20 m/s², 11–17 % at 20–40, 21 % at 40–60, 45 % above 60.
- Implied speed ceiling ≈ 0.30 m / (0.36 + 0.20 s) ≈ 0.55 m/s.

**Built (opt-in):**
- `ctrl.reach`: the forward foothold is capped at the swing leg's reach at the chosen touchdown time, from the hip's measured position and velocity, the leg length and the hip height.
- `ctrl.inSwingT`: the in-swing re-decision may move the timing, with a continuous phase time-warp in the swing.

Without maps identified for them, both made the walk worse (5–7 steps). They are kept for the next step.

### D. Speed regulation through the ground reaction (`walk.dcmRef`, `walk.vReg`)

**Single support** (from the measured liftoff):
- ξ_ref = the stance centre + x_L(vd) (measured: x_L ≈ −0.114 + 0.393·v), propagated under the planned heel→toe roll;
- p = p_ref + (1 + k)(ξ − ξ_ref) along the walk.

**Double support** (`ds`): the existing closed-loop CoP solver (ramping onto the leading heel), aimed at x_S(vd). It never ran under the base `latDS: "lipm"`, which returned before reaching it; the forward tracking now runs first.

| configuration | upright steps | speed (m/s) |
|---|---|---|
| baseline (Controller A, M8A) | 11.2 (9–13) | 0.65 ± 0.25 |
| tracking (single + double support), M8A maps | 5.5 | 0.44 ± 0.07 |
| tracking + maps re-identified (target conflict) | 7.0 | 0.57–0.65 |
| tracking + speed-derived target x* (0.5 m/s) + matched nominal, maps of vd 0.45 | **10.2 (7–15)** | 0.45 ± 0.08 |
| the same, two consistent identification rounds (c50b) | 8.0 (6–11) | 0.45 ± 0.13 |
| c50b, timing pinned 0.40 s | 9.0 (7–13) | 0.46 ± 0.10 |
| planner's own DCM placement (no Controller A) + tracking | 8.0 (7–12) | 0.49 |

- Closed-loop speed map (c50b): (v′ − vd) ≈ 0.003 + **1.60**·(v − vd). Unbiased, but still unstable.
- Earlier variants: `vReg` (low-passed speed → CoP shift) and `ankle2` (the map's prediction → CoP shift) were realised physically, but did not improve walks.

### E. Swing execution (B)

**The existing swing:**
- Its geometry is generic.
- It is clocked from the step start in view time. The foot lifts ≈ 0.1 s later, lags up to 20 cm, reaches 4.1 m/s and lands 4–11 cm long.
- With zero feedback delay, the same swing lands 1.7 cm off.
- Delay compensation (`walk.swingLead`):
  - full: overshoot +3.6 cm, but long steps fail 71–85 % (the start drags, and 50 ms less real air time);
  - late-ramped: +3.2 cm, start unchanged, long steps still fail more.

**The generic swing (`pc_swing.js`):** a pre-swing pivot plus lift about the actual front contact; an air phase anchored at the measured liftoff (quintic from the actual state, re-planned C² on foothold or timing changes); a clearance guard on the collider outline's lowest corner (actual pitch if lower); a distance-gated descent; feasibility by required acceleration; delay-led time. At matched states it fails far more often than the existing swing (47–50 % vs 1 %; 54–82 % vs 24–26 %). Not adopted.

### F. What was not done

- **F2h rerun (F):** waits for a stable F0 walk with the same foot-agnostic controller.
- **Nearby speeds (E):** waits for a stable operating point.
- **Yaw:** measured only.

## Sources

- Englsberger, Ott & Albu-Schäffer (2015). Three-dimensional bipedal walking control based on divergent component of motion. *IEEE T-RO*. (DCM tracking with CoP feedback.)
- Khadiv, Herzog, Moosavian & Righetti (2020). Walking control based on step timing adaptation. *IEEE T-RO*. (Step location AND timing when the regulating step is outside the reachable set.)
- Hof (2008). The extrapolated center of mass concept suggests a simple control of balance in walking. *Human Movement Science*. (CoP within the foot plus foot placement.)
- Begg, Best, Dell'Oro & Taylor (2007). Minimum foot clearance during walking. *Gait Posture* (PMID 16678418).

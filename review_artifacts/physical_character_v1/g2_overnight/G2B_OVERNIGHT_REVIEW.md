# G2b overnight runway — morning review (2026-10-02)

**STOPPED with a decision report.** The evidence now points to limitations below the placement layer. All work is opt-in, all approved gates are bit-identical, local commits only, nothing pushed.

## The eight questions

1. **How far did you get?**
   - **Phases 1–3 done:**
     - built a new generic swing executor (`pc_swingx.js`);
     - measured it against the inherited swing at matched states (≈ 1,100 bench cases);
     - re-identified the step maps under it.
   - **Phase 4 not achieved.** No configuration walks robustly across starts. I tested eleven controller / inner-loop variants with fair re-identification where the inner loop changed, then ran an oracle diagnostic to locate the limit.
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
8. **What remains before jogging/running?** A walking foundation that holds a basin. The evidence below says that needs a decision from you on one of the paths at the end, not more placement tuning.

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

**What I tried at this level, re-identified where the inner loop changed:**

| variant | result |
|---|---|
| heel-rocker compliance into single support | 8.5 |
| stance DCM gain 1.0 / 2.0 | 8.2 (re-identified) / 7.8 |
| faster funnel | 7.3–7.8 |
| flatter landing | identification worse, prediction 5.4 vs 4.7 cm |
| timing restricted to the maps' data / maps re-identified over a wide timing range | 9.8 / 10.0 |
| two-step preview placement | 9.3 |

None moves the typical walk beyond 8–10 steps.

### C. The oracle bound (diagnostic, not a controller)

ORACLE_PLACEHOLDER

## Decision needed

DECISION_PLACEHOLDER

## Evidence index

- Viewer: [`viewer/index.html`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_overnight/viewer/index.html), or <http://127.0.0.1:8171/review_artifacts/physical_character_v1/g2_overnight/viewer/index.html>.
- Working log, every experiment including the dead ends: [`OVERNIGHT_LOG.md`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_overnight/OVERNIGHT_LOG.md).
- Bench data (compressed, per case): `json/bench_*.json.gz`.
- Maps: `g2_walker/json/mX1`, `mU6`, `mU7`, `mF2`, `mK1`.
- Scripts: `analysis/` (`walk.mjs`, `multi.sh`, `tq.mjs`, `brake.mjs`, `ank.mjs`, `cop.mjs`, `late.mjs`, `oracle.mjs`, `rec.mjs`, `run.sh`, `summ.py`, `anaf.py`).

**Opt-in options added tonight** (all default off; gates bit-identical):

| option | what it does |
|---|---|
| `human.over.swingGen "x"` + `swingX {…}` | swing executor X; `vertical: "inherited"` = the hybrid |
| `walk.ctrl.late {tau, g, dMax, T}` | one late correction through the measured inverse execution model |
| `walk.ctrl.preview {T, q1, q2, r}` | two-step preview placement |
| `walk.rocker {kdF, until}` | heel-rocker compliance continued into single support |
| `g2_stepbench` `retarget.dT` | timing changes |
| `g2_stepbench` executor-X log | records X's plans and reach checks |
| `uident.py --dither` | identification dither control |

**Regression (03:55, re-run before the final commit):**
- `regress.sh` 12/12 identical;
- G2W_A8 hashes 5780483c / 17d27b5d / 5082d76a / 47427dbb / 1f5445fd / b373d22e;
- foot gate F0 42/42 and F2h 42/42 identical;
- determinism: repeated walks reproduce their hashes;
- Node CPU ≈ 0.25 s per simulated second (12-step walk ≈ 2 s).

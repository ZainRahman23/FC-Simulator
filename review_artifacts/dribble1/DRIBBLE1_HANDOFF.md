# DRIBBLE-1 — handoff

Branch `prototype/dribble-1` (worktree `~/Downloads/FC Simulator worktrees/dribble-1`, sparse checkout). The branch descends from the frozen TURN-1.2 tag `locomotion-turn12-baseline-1` (2129ca04) and only **adds** files.

The owner instruction is saved verbatim at `review_artifacts/dribble1/sources/2026-10-16_user_instruction_dribble1_physics_based_dribbling_v1.md`.

## What it is

A player runs on the frozen TURN-1.2 locomotion. The genuinely free BALL-FEEL-1.3 ball is moved only by physics and by one authoritative launch per deliberate touch.

### Authority

| Layer | Owns |
|---|---|
| Simulation | Intent: direction and speed requests, the cut gate, the carrier's pursuit bends. |
| TURN-1.2 | Locomotion. Its plants are never changed. |
| Dribble resolver | When to touch, which foot, which boot region, which contact tick, and the launch. |
| BallWorld | The ball, from the contact tick onwards. Every later contact (body, opponent, turf) is ordinary physics. |

### The touch

The touch is a bounded adjustment of the free leg's swing. It is applied after TURN-1.2's pose and pinned to zero at touchdown.

- **Swing time-warp.** TURN-1.2's swing is evaluated at a remapped phase, so the boot meets the ball at an earlier point of its own path, at a controlled speed.
- **Spatial offset.** Bounded per axis and by the unwind rate.
- **Boot-region rotation.** Yaw is carried by the hip.
- **Follow-through hold.** Up to 8 cm.
- **Constraints.** Ground floor and the IK reach clamp.

When no touch acts, the pose is TURN-1.2's own `t1Evaluate`, bit-identical. When a touch acts, the stance foot is compared with the plain pose: maximum deviation 0 mm over 26,076 adjusted ticks.

### Architecture B (RESOLVED) is the selected foundation

At the contact tick, the resolver schedules one launch through the kernel's validated `schedule()`. The kernel fails closed if the ball has left the contact region, another contact intervened, or the boot is absent.

The authoritative boot is guarded for the launch, so there is no double impulse at the handoff.

## Files

### `sandbox/visual/dribble1/`

| File | Contents |
|---|---|
| `d1_core.js` | `DribbleSim`: intent, cut gate, staged cuts, pursuit, resolver (prediction caches, candidates, launch solve, commit), swing adjustment, clearance, control classification, fixtures, recording. Parameters are in `D1`. |
| `d1_scenarios.js` | The lab scenarios. |
| `d1_attrs.js` | Real players.json attributes and the profiles HIGH / AVERAGE / POOR / WEAKFOOT / LEFT_HIGH. |
| `d1_rng.js` | `KeyedRNG` (BLAKE2b, parity with rng.py). Execution error is keyed `["DRIBBLE_TOUCH", pid, tick, foot]`. |
| `d1_colliders.json` | Boot and toe hulls built from the character mesh; shin and thigh capsules. |
| `d1_viewer.js` + `../dribble1.html` | The DRIBBLE-1 lab. |

The lab page:

- **Serving:** run `python3 -m http.server 8361` from the worktree root, then open `sandbox/visual/dribble1.html`.
- **URL parameters:** `scn`, `seed`, `prof`, `arch`, `diag`, `single`, `rate`, `t`, `paused`.

### Ball code

These folders are byte-identical imports from the Codex lab `prototype/ball-feel-1-3` @ 75866e99:

- `ballphys1/`
- `ballfeel1/`
- `ballfeel11/`
- `ballfeel12/`
- `ballfeel13/`
- `physchar2/core/v2_math.js`

`review_artifacts/dribble1/BALL_SOURCE_MANIFEST.tsv` lists all 23 files; each was checked against the manifest's sha256 and against `git show 75866e99:<path>`. The ball is never tuned. `BALL_DEFAULT` can be swapped.

### Tools (`sandbox/visual/dribble1/tools/`)

**Environment and single runs**

| Tool | Use |
|---|---|
| `d1_env.mjs` | Node environment (`makeSim`). Experiment overrides `D1OVR` / `D1OPTS` exist; they are never used for evidence. |
| `d1_run.mjs` | One run, with its touch list. |

**Evidence**

| Tool | Use |
|---|---|
| `d1_evidence.mjs` | Reliability with the turn metric; free-ball audit; per-touch log; CPU. |
| `d1_matrix.mjs` | Speed, direction and attribute matrices. |
| `d1_abc.mjs` | The three-architecture comparison. |
| `d1_plantcheck.mjs` | Stance feet against TURN-1.2. |
| `d1_determinism.mjs` | Node replay. |
| `d1_chrome_fp.cjs` | Lab page in Chrome against Node. |

**Diagnosis**

| Tool | Use |
|---|---|
| `d1_losses.mjs` | Why control was lost. |
| `d1_batch.mjs` | Straight-line loss classifier. |

**Review package**

| Tool | Use |
|---|---|
| `d1_capture.cjs` | Video capture from the lab page. |
| `d1_render_all.sh` + `d1_videos.txt` | The review videos. |
| `d1_review_build.mjs` | Builds the review page from `DRIBBLE1_STATUS.json` and the evidence. |

### Review package (`review_artifacts/dribble1/`)

| Path | Contents |
|---|---|
| `DRIBBLE1_REPORT.md` | The final report. |
| `DRIBBLE1_STATUS.json` | Status data used by the page builder. |
| `review/DRIBBLE1_REVIEW.html` | The review page. Local only: it shows real player names. |
| `videos/`, `posters/` | Review clips and their posters. |
| `evidence/*.json`, `touch_log.csv` | The evidence files. |

## How the resolver decides (short)

1. **Predict.** Locomotion is predicted with TURN-1.2 clones over a speed-dependent horizon. The free ball is predicted with a collider-free BallWorld.
2. **Candidates.** A candidate is a contact tick × path phase (warp) × boot region (FRONT, INSIDE, OUTSIDE, LACES) × contact elevation. Each passes:
   - contact geometry and reach;
   - closing speed;
   - the approach check (both hulls, warped path);
   - the follow-through minimum speed (3σ execution-error margin);
   - the launch solve: next-window targets come from the feasible envelope; the roll table gives the first guess, refined with the real BallWorld;
   - refined geometry;
   - `followClear`;
   - `otherClear`: the other foot's swing, the planted foot, and the shin and thigh capsules;
   - `approachClear`.
3. **Blockers.** A swing whose unadjusted path runs at least 2 cm into the free ball blocks every plan that would wait past it.
4. **Commit, at the contact tick:**
   - a local gap check;
   - the keyed execution error;
   - the executed launch must still clear the follow-through, with a 3% margin, or it is firmed up by at most 25%;
   - one `schedule()`.
5. **Cuts.**
   - The cut gate holds a user direction change of more than 8° until a touch can take the ball into it. Pursuit bends are never held.
   - The hold lasts at most the speed's longest touch interval plus 0.3 s.
   - Staged cuts: a touch that takes the ball only part of the way turns the body that far, plus 20°.
   - Set-up touches: under a held cut, a non-releasing touch places the ball close.
6. **Pursuit.** After a launch, the carrier bends the run and changes pace toward where the free ball will be. The ball itself is never corrected.
7. **Clearance.** Swings that are not touching are steered around the ball; after a touch, the boot withdraws. When the main prediction is stale, clearance builds a short fresh prediction.

## Known limits (see the report)

- **Cuts are only partially reliable.** Taken with the ball, out of 8 elite-profile seeds:
  - 45° 5/8, 60° 5/8, 60° left 3/8;
  - 90° 1/8, 90° left 2/8, 90° at jog 2/8;
  - 135° 0/8, 180° 0/8.
- **The structural cause.** A contact early in the swing has a fast follow-through: the warp must catch up to TURN-1.2's unchanged plant. Only a firm launch clears it, so the soft redirecting touches a cut needs are often infeasible, and the fallback is a firm recovery touch (9–10 m/s).
- **The ball kernel fails closed** on a leg–ball–turf pinch ("Contact iteration budget exhausted"). The run then ends as a recorded kernel fault. There were 0 in the final 160 reliability runs, but faults were seen during development.
- **Cross-engine bit-exactness:** Node 22 against Chrome 155 is 18/20. Each run diverges first in its last bits: REV180_SPRINT in the ball's state (~6e-15), CURVE_JOG in the heading ψ (4.4e-16). Same-engine replay is 20/20.
- **CPU:** see the report. Predictions (TURN-1.2 clones) dominate.

## Never modify

Do not modify any of these:

- TURN-1.2 (`prototype/turn-1`, tag `locomotion-turn12-baseline-1`) — the freeze manifest's six files match;
- RUN-1 (`run1_gait_v13.js`);
- the BALL-PHYS / BALL-FEEL milestones (Codex);
- the tackle line (Codex).

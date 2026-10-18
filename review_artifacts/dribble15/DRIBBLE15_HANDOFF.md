# DRIBBLE-1.5 handoff — DRIBBLE-V1 foundation frozen

## State

On 18 Oct 2026 at about 04:00 EEST (still the 17 Oct chronicle day), the generic dribbling foundation was frozen as DRIBBLE-V1.
- **Branch:** `prototype/dribble-1`.
- **Tag:** `dribble-v1-foundation-1`, local.
- **Publishing:** the commits and the tag are pushed with the daily publication after 06:00 on 18 Oct. The tag needs an explicit `git push <remote> dribble-v1-foundation-1`.

DRIBBLE-1 through 1.4 (`dribble1/` … `dribble14/`) are frozen references. TURN-1.2, RUN-1, BALL-PHYS, BALL-FEEL and tackle files are untouched.

## The frozen foundation

| What | Path |
|---|---|
| Core | `sandbox/visual/dribble15/d15_core.js` |
| Lab | `sandbox/visual/dribble15.html` |
| Tools | `sandbox/visual/dribble15/tools/`. The environment loads `d15` (default) and the frozen `d14` / `d13` / `d12` / `d11` / `d1` cores. |
| Review page (local only) | `review_artifacts/dribble15/review/DRIBBLE15_REVIEW.html` |
| Evidence | `review_artifacts/dribble15/evidence/` |

Parameters that define it:

| Area | Parameters |
|---|---|
| Incremental planner | `plan13`: budget 2000, budgetHi **12000**, lead 24, rFirst, rStop1, maxSetups 3, c12CutAtContact off, prefetch, legOnlyPose, fitted `wuW` |
| Release timing (1.4) | `plan14`: retime, rStep 1, speedRobust |
| Set-up validation (1.4) | `setup14`: graded, covFull 4, minR 0.25 |
| Stage line (1.5) | `plan15.stageLine: true` |

Execution error is the attribute interface:
- `exec13.sigma` gives σ per touch, from `touchSigma`, which already reads the dribbling, ball_control and agility attributes.
- `exec13.envelope` gives the validator's execution variants.
- Randomness is keyed by (seed, player, tick, foot).

## How to re-measure

| What | Command / tool | Notes |
|---|---|---|
| 384-run matrix | `zsh d15_score.sh "CUT60_RUN CUT60L_RUN CUT90_RUN CUT90L_RUN" 48 d15 5 out.json`, twice | Use `SEED0=0` and `SEED0=48`. About 12 minutes. σ ≈ 9 on totals. |
| CPU | `zsh d15_cpu.sh all 4 out.json d14,d15` | Run on an idle machine. |
| Matched seeds | `node d15_diff.mjs score14.json score15.json out.json` | |
| Chrome / Node | `d15_chrome.cjs` | |
| TURN-1.2 checks | `d15_legcheck.mjs all 1 out pose` and `d15_plantcheck.mjs` | |
| Videos and page | `d15_render.sh` with `d15_videos.txt`, then `d15_review_build.mjs` | |

## Next

The attribute layer:
1. Dribbling, Ball Control and Agility, through `exec13` and turn-sharpness limits.
2. Preferred / weak foot.
3. Pressure / context.

# DRIBBLE-1.4 handoff

## State

Stopped for owner review in the night of 17–18 Oct 2026 (the 17 Oct chronicle day), on branch `prototype/dribble-1`. The work stays local until the daily publication after 06:00 on 18 Oct.

DRIBBLE-1.3 (`dribble13/`, core 54ff810d) is frozen as the reference, and DRIBBLE-1 / 1.1 / 1.2 are untouched. No TURN-1.2, RUN-1, BALL-PHYS, BALL-FEEL or tackle file was changed.

## Where things are

| What | Path |
|---|---|
| Core | `sandbox/visual/dribble14/d14_core.js`, copied from `dribble13/d13_core.js`. New parameters: `D1.plan14` and `D1.setup14`. |
| Lab | `sandbox/visual/dribble14.html`. Diagnostic override for counterfactuals: `&ovr={"plan13":{"setupCheck":false}}` (URL-encoded). The HUD shows the staged / released turn tick. |
| Review page (local only) | `review_artifacts/dribble14/review/DRIBBLE14_REVIEW.html` |
| Report and status | `DRIBBLE14_REPORT.md`, `DRIBBLE14_STATUS.json` |
| Evidence | `review_artifacts/dribble14/evidence/`. The D1.2 / D1.3 384-run scorecards live in `review_artifacts/dribble13/evidence/`. |

## Parameters

- **`plan14.rStep: 1`** — the release search evaluates every tick of its contact window.
  - `0` restores DRIBBLE-1.3's 3-tick grid anchored at the release tick.
  - `rRefine: n` gives ±n-tick refinement around coarse optima. It was tried and is not used.
- **`plan14.retime: true`** — contact-timed re-evaluation of a found release at the earliest evaluable tick.
  - `retimeGain` is the minimum gain, in ticks, worth re-evaluating for.
- **`plan14.speedRobust: true`** — the launch clearance check also covers the ±2σ speed error.
- **`plan14.relPath`** — a release-touch path check up to `relPathMax`. Off: it rejected even good stage plans.
- **`setup14: { graded: true, covFull: 4, minR: 0.25 }`** — graded set-up robustness.
  - Coverage per variant is min(1, slots / covFull).
  - R is the mean over the six variants; a set-up is accepted when R ≥ minR.
  - `graded: false` restores DRIBBLE-1.3's ≥ 5 of 6 rule.
- **`plan13.rSync`** — diagnostic only: the release search runs unbudgeted.

## Tools (`sandbox/visual/dribble14/tools/`)

| Tool | What it does |
|---|---|
| `d14_leadsweep.mjs ID seed out` | The release-lead sweep of one case. |
| `d14_setupaudit.mjs "CUTS" a b d14 out` | Run with `D1OVR='{"plan13":{"setupCheck":false}}'`. Grades every executed set-up against the envelope, in a replay stopped at its commit, and records the real outcome. |
| `d14_diff.mjs score13.json score14.json out [ids]` | First changed decision of every outcome change, classified, plus the matched-draw check. |
| `d14_score.sh`, `d14_cpu.sh`, `d14_chrome.cjs`, `d14_legcheck.mjs … pose`, `d14_plantcheck.mjs`, `d14_render.sh` + `d14_videos.txt`, `d14_review_build.mjs` | As in DRIBBLE-1.3. |

## Experiments of record

Each is 384 runs: 4 cuts × seeds 1–96.

| Configuration | Taken | Clean |
|---|---|---|
| D1.3 | 256 | 114 |
| Instant release | 255 | 107 |
| Set-up check off | 264 | 127 |
| Graded 0.5 + release grid 1 tick | 259 | 111 |
| Graded 0.5 only | 256 | 117 |
| Release grid 1 tick only | 262 | 106 |
| Graded 0.25 + retime + speed | 265 | 123 |
| … + ±1 refinement | 263 | 118 |
| **… + every tick (FINAL)** | **273** | **121** |
| FINAL, unbudgeted | 277 | 132 |
| FINAL with `rFirst` off | 269 | 109 |

σ ≈ 9 on the totals.

## Next

DRIBBLE-1.5: clean 90° cuts (see the report). Try `maxSetups` (3 → DRIBBLE-1.2's unlimited), `rStop1` and `c12CutAtContact` one at a time on the 384 matrix.

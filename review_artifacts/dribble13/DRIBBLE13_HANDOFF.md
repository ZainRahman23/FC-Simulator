# DRIBBLE-1.3 handoff

## State

Stopped for owner review on 17 Oct 2026, on branch `prototype/dribble-1`. The core is commit `54ff810d`. The work stays local until the next daily publication (after 06:00 on 18 Oct).

DRIBBLE-1 (7fe57fd3), DRIBBLE-1.1 (7d8c8524) and DRIBBLE-1.2 (a2f0505b) are preserved, with their files untouched. TURN-1.2, RUN-1, BALL-PHYS, BALL-FEEL and tackle files are untouched.

## Where things are

| What | Path |
|---|---|
| Core | `sandbox/visual/dribble13/d13_core.js` (from `dribble12/d12_core.js`) |
| Viewer | `d13_viewer.js` and `sandbox/visual/dribble13.html`. Planner HUD; set-up envelope overlay with `diag=1` |
| Lab | `http://127.0.0.1:8361/sandbox/visual/dribble13.html?scn=CUT60_RUN&seed=13&diag=1` (server: `python3 -m http.server 8361 --bind 127.0.0.1` from the worktree root) |
| Review page (local only: real player names) | `review_artifacts/dribble13/review/DRIBBLE13_REVIEW.html` |
| Report | `DRIBBLE13_REPORT.md` |
| Machine-readable status | `DRIBBLE13_STATUS.json` |
| Evidence | `review_artifacts/dribble13/evidence/`; logs in `evidence/logs/` |
| Instruction (verbatim) | `review_artifacts/dribble13/sources/` |

## Parameters (`D1.plan13`)

- `on: true` — the incremental planner.
  - `opts.plan13: false` gives DRIBBLE-1.2's synchronous pass on the exact infrastructure, bit-identical to DRIBBLE-1.2.
- `budget: 2000`, `budgetHi: 8000` — work units per tick; the decision budget applies while no plan is in force or a meaningful cut is held.
- `lead: 24` — release-now / staged options are evaluated for a release 100 ms ahead.
- `wuW` — weights per counted primitive, ≈ µs, NNLS-fitted per tick.
  - Refit (scratch `x_wufit`) if a primitive's cost changes.
  - Changing the weights changes decisions.
- `legOnlyPose: true` — exact. Verify with `node tools/d13_legcheck.mjs all 2 out.json pose`.
- `setupCheck: true` with `setup13` (`envK 1.5`, `minInside 5`) — the BALL-PHYS envelope check.
  - `exec13.sigma` / `exec13.envelope` is the attribute interface.
- `prefetch: true`, `pfHorizon 1.5`.

## Tools (`sandbox/visual/dribble13/tools/`)

| Tool | Purpose |
|---|---|
| `d13_refcmp.sh ref.json d13 P [opts] out` | Twin suite against `evidence/ref_d12.json`. With `'{"plan13":false}'` it must give IDENTICAL 200 / 200. Without options it classifies the first changed decision of each run. |
| `d13_score.sh "CUTS" N d13 P out` | 4-seed chunks, parallel. `SEED0` offsets the seeds; `D1OVR` sets parameters; `D13CORE` loads a snapshot core. |
| `d13_cpu.sh all 4 out` | Each core in its own process — the fair CPU benchmark; run it on an idle machine. |
| `d13_ticks.mjs` | Spike timeline and per-step distribution. |
| `d13_prof.mjs` | Self time by subsystem and primitive counts. |
| `d13_cache.mjs` | Cache metrics. |
| `d13_activeset.mjs` | 22 players in lockstep. |
| `d13_setupviz.mjs` | Set-up target vs BALL-PHYS prediction vs actual ball. |
| `d13_chrome.cjs` | Chrome vs Node; needs `PUPPETEER_NODE_MODULES`. |
| `d13_render.sh` + `d13_videos.txt` | Videos. |
| `d13_review_build.mjs` | Review page. |

## What I learned

- **Running several cores in one process slows all of them.** TURN-1.2's call sites see every core's object shapes. DRIBBLE-1.2 measured 253 ms / s that way; it is 208 ms / s in its own process.
- **The football depends on how much planning a decision tick gets.**
  - 2 ms flat lost about a third of the cuts.
  - 6 ms lost about 5 %.
  - Reserving the clearance check's cost inside the 8 ms tick lost 7 %.
  - Keep `budgetHi` at 8000 unless you re-measure on 96 seeds.
- **Seeds 1–8 cannot rank configurations.** The noise is ±3–5 runs per 8-seed block. Use 96 seeds × 4 cuts (two `d13_score.sh` runs of 48), about 15 minutes on this machine.
- **Spikes.** The remaining 20–40 ms steps did not recur on the same ticks between identical runs. GC pauses are at most 3.5 ms (`--trace-gc`).

## Open owner decisions

1. **The football bar.** DRIBBLE-1.3 equals DRIBBLE-1.2 (256 vs 258 of 384) but misses the 60° right / 60° left / 90° left X/8 targets. DRIBBLE-1.2 misses them too over 96 seeds.
2. **Integration.** If DRIBBLE-1.2's football is the bar, DRIBBLE-1.3 is the integration candidate. Ship it behind the active-set gate, with budget 2 / 8 ms.

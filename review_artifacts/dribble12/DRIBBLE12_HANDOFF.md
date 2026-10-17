# DRIBBLE-1.2 handoff

## State

Stopped for owner review on 17 Oct 2026, on branch `prototype/dribble-1`, local until the next daily publication.

DRIBBLE-1 (7fe57fd3) and DRIBBLE-1.1 (7d8c8524) are preserved as milestones, with their files untouched.

## Where things are

| What | Path |
|---|---|
| Core | `sandbox/visual/dribble12/d12_core.js` (from `dribble11/d11_core.js`) |
| Viewer | `d12_viewer.js` and `sandbox/visual/dribble12.html` |
| Lab | `http://127.0.0.1:8361/sandbox/visual/dribble12.html?scn=CUT60_RUN&seed=3&diag=1` (server: `python3 -m http.server 8361 --bind 127.0.0.1` from the worktree root) |
| Review page (local only: real player names) | `review_artifacts/dribble12/review/DRIBBLE12_REVIEW.html` |
| Report | `DRIBBLE12_REPORT.md` |
| Machine-readable status | `DRIBBLE12_STATUS.json` |
| Evidence | `review_artifacts/dribble12/evidence/` |
| Instruction (verbatim) | `review_artifacts/dribble12/sources/` |

Lab URL parameters:
- `diag=1` turns on the diagnostics overlay.
- `geo=0` hides the geometry layer: surfaces, the selected contact and its impulse normal, the target corridor / set-up target region, and the decisive contact.
- `zoom=2.6` zooms the gameplay camera.
- `single=nearC` / `single=low` selects a close view; `rate=0.25` plays at quarter speed.

## Main parameters (`D1` in `d12_core.js`)

- `regions12` holds the side surfaces (`hull: "side"`): strike with whichever forefoot hull reaches first.
- `impulseNormal: true`.
- `sweep` is the side-foot sweep.
- `safePursuit: 0.45`.
- `cut12` holds the cut machinery:
  - `stagedMin 75`, `stageFrac 0.5`: staged release-now for big cuts.
  - `nowFullMaxRem 60`: a full release-now must take ≥ 30° of a 90° turn.
  - `decWin 9`, `decPull 2`: after a set-up, its decisive contact is tried first.
  - `nowHorizon 0.7`: release-now contacts are searched at most 0.7 s ahead.
  - `keepHeld`: a failed hold re-plan keeps the still-valid plan.
  - `holdReplan 24`, `cutMaxI 1.3`, `minCut 35`, `remK` / `timeK` / `setupK`, `robustK 0` (nominal set-up validation).
- `slice.on: false`: time-sliced planning exists but is off, because it cut cuts taken from 49 to 21 of 64.
- `opts.twin`: every DRIBBLE-1.1 / 1.2 behaviour off. The result is bit-identical to DRIBBLE-1 (`tools/d12_twin.mjs`).

## Tools (`sandbox/visual/dribble12/tools/`)

**Environment.** `d12_env.mjs` provides the cores `d1` / `d11` / `d12`.
- `D1OVR='{"cut12":{...}}'` overrides parameters, merged one level deep.
- `D12CORE=<file in dribble12/>` loads another core file, for bisection only.

**Evidence.**
- `d12_evidence.mjs` — reliability / free-ball audit / CPU / touches, with cut quality from `d12_quality.mjs`.
- `d12_cpu.mjs` — d1 / d11 / d12 in one process, with step spikes and percentiles.
- `d12_chrome.cjs` + `d12_chrome_node.mjs` — Chrome vs Node determinism.
- `d12_setupstats.mjs` — set-up statistics.
- `d12_plantcheck.mjs`, `d12_pinch.mjs`, `d12_twin.mjs`.

**Diagnostics.**
- `d12_cutstory.mjs` — one line per run: every touch after the request.
- `d12_failclass.mjs` — the first adverse event in each run.
- `d12_recontact.mjs` — same-foot re-contacts.
- `d12_funnel.mjs` — the planning funnel during held cuts.
- `d12_corrdiag.mjs` / `d12_corrcheck.mjs` — corridor diagnostics / corridor validation.
- `d12_geomdiag.mjs`, `d12_cutclock.mjs`.
- `d12_matrix.sh` — quick 8-seed matrix.
- `d12_take.sh` + `d12_take.mjs` — 16-seed cut comparison (taken / cleanly per seed).

**Video.**
- `d12_capture.cjs` — deterministic frame capture.
- `d12_render.sh` + `d12_videos.txt` — `SBS3` lines compose DRIBBLE-1 | 1.1 | 1.2. Use `LIST` / `PTAG` for parallel batches; ffmpeg needs `-nostdin` inside the read loop.
- `d12_strip.mjs` — still strips.
- `d12_review_build.mjs` — builds the review page.

## Known issues (first things for DRIBBLE-1.3)

1. **CPU.** 253 ms per simulated second (DRIBBLE-1.1: 168); the worst pass is 604 ms at a cut request. The cost centres:
   - exact time-warped poses: `LocoTrack.warpedBones` and `stateAt`, called from `approachClear` / `pathFrames`;
   - release-now and staged tracks, one fresh TURN-1.2 prediction each per pass;
   - `windowTargets` extending tracks;
   - the set-up's nested decisive search.

   Measured but not usable:
   - Interpolated poses differ from exact ones by up to 0.69 m in turns, so they cannot serve as a broad phase.
   - The existing 1.1 m unwarped-foot gate in `approachClear` is only provably safe for phase lags ≤ ~0.04.
2. **Set-ups are validated on the nominal ball.**
   - ±1σ validation (`robustK 1`) was tested and was net worse (44 vs 47 of 64).
   - 10 of 24 set-ups lose the ball.
3. **CUT60_RUN_FAR regression:** 9/16 (1.1: 13/16).
   - Cause: recovery pushes at 8.6–9.8 m/s while still chasing the ball.
   - Bisect: f141d948 12/16 → e9de0676 10/16 → 4c354362 9/16.
   - `holdReplan 12` restores 12/16 but loses 60° right on seeds 1–8 (5/8).
4. **REV180_SPRINT** holds 0/16 (1.1: 5/16); out of scope.
5. **Preferred-foot bias is absent** (about 50 %). A stronger preference cost cuts.
6. **One residual same-foot re-contact** (CUT90L s1): a ~2σ execution error in direction toward the swinging toe.
7. **Cut outcomes respond chaotically to planner parameters.** Compare configurations on 16 seeds (`tools/d12_take.sh`) rather than 8.

## Daily publication

The 17 Oct day (DRIBBLE-1.1 follow-ups and all DRIBBLE-1.2 commits) is published after 06:00 on 18 Oct:
- chronicle entry on `touchline-current`;
- `git -c http.postBuffer=1048576000 push` to fc-simulator, then verify by fetch.

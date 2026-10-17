# DRIBBLE-1.1 — handoff

Branch `prototype/dribble-1`. Worktree `~/Downloads/FC Simulator worktrees/dribble-1`. Results are in `DRIBBLE11_REPORT.md`; the review page is `review/DRIBBLE11_REVIEW.html` (local only, it shows real player names).

## What is frozen and must stay untouched

| What | Where | Frozen at |
|---|---|---|
| DRIBBLE-1 | `sandbox/visual/dribble1/` and `dribble1.html` | 7fe57fd3 |
| TURN-1.2 | `sandbox/visual/turn1/`; tag `locomotion-turn12-baseline-1` | 2129ca04 |
| RUN-1 | `run1_gait_v13.js` | — |
| BALL-FEEL-1.3 kernel | `sandbox/visual/ballphys1/` | BallWorld 75866e99 |

DRIBBLE-1.1 also reuses these DRIBBLE-1 files read-only:
- `d1_scenarios.js` — scenarios;
- `d1_attrs.js` — player profiles;
- `d1_colliders.json` — boot / toe hulls and shin capsules.

## Code map — `sandbox/visual/dribble11/d11_core.js`

### Configuration: `D1` (line 60)

All DRIBBLE-1 parameters plus the DRIBBLE-1.1 additions. Each group is commented in place.

| Group | Keys |
|---|---|
| Follow-through | `caft` |
| Planning savings | `o2*` |
| Pursuit | `pursuitDead`, `pursuitHyst` (hysteresis tried, now 0) |
| Cut staging | `stageLead`, `stageLeadK`, `stageLeadMax`, `stageFinal` |
| Hold | `holdGrace`, `holdNear` |
| Cut windows | `cutAlignK`, `cutWinAfterSwitch`, `cutGenFrac` |
| Touch regions | `regions11` (DRIBBLE-1.1); `regions` (DRIBBLE-1, used by the twin) |

### Follow-through profiles (lines 141–150)

- `warpHome` — the swing time-warp.
- `caftBump` / `caftLate` — the arc profiles. Both are zero, with zero velocity, at the contact, and finished by 95 % of the remaining swing.

### Shared locomotion prediction

- **`LocoTrack` (189)** — the shared TURN-1.2 prediction for one input.
  - Extended lazily, with checkpoints every 12 ticks.
  - Far ticks are evaluated on demand by `fill()`. This is bit-identical: it re-steps from the checkpoint and evaluates the checkpoint's own sample too.
- **`PredView` (228)** — a window onto a track from the current tick.

### `DribbleSim` (254)

**Input**
- `intent()` dispatches to `intent1()` (DRIBBLE-1, used by the twin) or `intent11()`. `intent11` holds the cut line and keeps the touching swing committed: it returns the frozen input until that foot lands.

**Stepping**
- `step()`: the sim's per-tick update.
- `kernelStep()`: the pinch recovery. It snapshots and restores the world, holds the player's touching colliders still, then falls back to clearing them; the ball's state is never written.

**Touch outcome and recovery**
- `post()` / `classify()` / `resolve*()` — as in DRIBBLE-1.
- `recovery()` — pursuit, plan-relative inside cuts.
- `clearance()`.

**Planning**
- `viewFor()` — track reuse.
- `windowTargets()` / `windowAt()` — next-touch windows; memoised, and coarse-to-fine under o2.
- `makePlan()` — the contact search.
- `pathFrames()`.
- `switchCand()` / `swPred()` — the cut branch that switches at the touchdown; cached by its switch tick.
- `blockers()`.
- `cost()`.
- `approachClear()`.

**Follow-through**
- `followClear()` — DRIBBLE-1's own model, kept for the twin.
- `ftPath()` / `ftClear()` — the follow-through path and its clearance, memoised.
- `swingPeak()`, `makeCaft()`, `ftLadder()`, `caftFor()`, `caftMax()`.
- `otherClear()`.
- `followMinSpeed()`.
- `solveLaunch()`.
- `commit()` — at the contact it re-solves the follow-through for the executed launch and installs `a.caft`, `a.warp` and `a.ftSolved`.

**Recording**
- `record()` — the `rec` rows that the viewer and evidence use: `d11 {orig, tgt, ft}`, `T.minClear`, `T.follow`.
- `sim.cpu` — timings plus the cache counters: `viewNew` / `viewReuse`, `winHit` / `winMiss`, `ftHit` / `ftMiss`, `launchHit` / `launchMiss`, `planMax`, `predTicks`, `tracks`, `plans`.

### Options

| Option | Effect |
|---|---|
| `opts.twin` | DRIBBLE-1's behaviour on the new machinery. It must stay bit-identical to `dribble1/d1_core.js`; run the twin check after any change to shared machinery. |
| `D1.o2 = false` | The full DRIBBLE-1 search density with the DRIBBLE-1.1 behaviour. |

### Lab and viewer

- **Lab page:** `sandbox/visual/dribble11.html` with `dribble11/d11_viewer.js` (global `D1V`). Query string: `scn`, `prof`, `seed`, `arch`, `diag=1`. `ft=0` hides the follow-through overlays, which are:
  - TURN-1.2's own toe path (white dashed) and the adjusted path;
  - +50 / +100 / +200 ms markers, the landing ring and the launch arrow;
  - the clearance label and the leg-yield HUD.
- **Server:** serve the worktree root on :8361, e.g. `python3 -m http.server 8361`.

## Tools — `sandbox/visual/dribble11/tools/`

Each file's header documents its usage. `d11_env.mjs` loads TURN-1.2 exactly as the page does. `makeSim(scn, {ver: "d11"|"d1", arch, player, seed, opts})` runs either core. The `D1OVR='{"k":v}'` environment variable overrides DRIBBLE-1.1 parameters for experiments; it is never used for the evidence of record.

```
node d11_run.mjs CUT60_RUN B HIGH 16 d11              # one run: touches, contacts, control, timeline
node d11_trace.mjs CUT60_RUN 16 d11 2 5               # chronological story of plans / commits / contacts
node d11_twin.mjs all 2 B HIGH out.json               # optimisation twin vs frozen DRIBBLE-1 (must be 40/40 identical)
node d11_evidence.mjs reliability all 16 d11 B HIGH out.json    # seeds 1..16 (the evidence ran them in 6 groups)
node d11_evidence.mjs free all 2 d11 out.json         # free-ball audit
node d11_cpu.mjs all 2 out.json                       # DRIBBLE-1 vs DRIBBLE-1.1 CPU, back to back
node d11_plantcheck.mjs all 2 out.json d11           # TURN-1.2 unchanged under the follow-through
node d11_pinch.mjs 3000 out.json                      # pinched-ball stress
PUPPETEER_NODE_MODULES=… node d11_chrome.cjs all out.json [--page dribble1.html]   # Chrome vs Node
node d11_pick.mjs                                     # review examples from the reliability evidence
S=<scratch> OUT=<videos> zsh d11_render.sh            # videos listed in d11_videos.txt
S=<scratch> OUT=<stills> node d11_strip.mjs CUT60_RUN 16 3.617 strip_cut60_s16_followthrough
node d11_review_build.mjs                             # review page from DRIBBLE11_STATUS.json + evidence
```

### Tool gotchas

- The scratch directory `S` needs `ffmpeg` and `node_r/node_modules` (puppeteer).
- `d11_render.sh` sometimes failed to parse the side-by-side lines. When that happens, compose `A*` / `B*` with ffmpeg `hstack` from the `*_half` / `*_zoom` clips.
- The worktree path contains spaces: quote it, and use `fileURLToPath` rather than URL paths.

## Lessons from this mission

1. **TURN-1.2 retargets a swing on every input change.** Any model of the touching foot after contact is wrong unless the input is frozen until that foot lands. This was the main source of DRIBBLE-1's re-contacts after a cut release.
2. **The follow-through is not what limits cuts.** The yield and arc clear the leg for soft touches. The firm floor is now set by the boot's own speed along the launch at contact (launch ≥ boot speed + 0.8 m/s).
3. **Cuts toward the preferred-foot side have no feasible soft contact.** For the right-footed player that is the right cut. The outside contacts fail on:
   - the boot below the turf after the rotation needed to face the ball;
   - the leg's reach;
   - the toe touching first;
   - lateral reach.
4. **A left-footed profile takes the right 60° cut 8/8, on the inside of its preferred foot.** That is the geometry DRIBBLE-1.2 needs to reproduce for the outside.
5. **Verify every edit applied.** A silent `.replace` miss left `D1.cutAlignK` undefined, which made every cut window cost NaN. That batch is kept in `evidence/old_bb3efc73/`. Scan all `D1.*` keys used against those defined after any config edit.
6. **Re-aim hysteresis made the shared prediction last longer but cost FAST straight dribbling 16 % control.** It is off.
7. **In o2, a swing predicted to run into the ball can have no feasible touch of its own.** It then blocks every plan and kicks the ball. This is the straight RUN regression (seed 6).

## Open items (DRIBBLE-1.2 candidates)

1. **Outside-of-the-foot cut contact.** Make it feasible: a low contact on the outer edge, the foot turned out, and a set-up touch that places the ball on the cutting foot's line.
2. **The blocking-swing kick.** Fix it so straight RUN gets back to ~97 %.
3. **Same-foot toe re-contacts.** Find the cause of the 1.1 % 8–46 ms re-contacts. The follow-through model matches the pose within 0.5 mm, so it is not a model error. Suspects:
   - toe hull vs boot hull ordering in `ftClear`;
   - the executed-launch error direction.
4. **CPU.**
   - Spread a heavy planning pass over several ticks (363 ms worst pass).
   - Keep opportunities while the track and ball are unchanged.
   - Track reuse is only 23 %.

# HANDOFF — TOUCHLINE — PLAYER OCCUPANCY STAGE 3: PHYSICAL IMPACT + BALANCE RESPONSE (25 Oct 2026)

**Status: Stage 3 V1 prototype, stopped for the owner's visual review.** Not integrated, not frozen, not merged, not published.

Read `O3_REPORT.md` first. The owner's instruction is in `sources/` (verbatim).

## Source of truth

| what | value |
|---|---|
| branch | `prototype/player-occupancy-stage3` (local) — see `STATUS.json` for the head |
| cut from | `817e0f25` (Player Occupancy Stage 2) ← `fb35347d` Stage 1 ← `89ab31c6` Shared Possession + Reaction V1 ← `8c0149ba` Standing Tackle V1 ← `f775daac` `milestone/feint-croqueta-vocab-v1` |
| worktree | `~/Downloads/FC Simulator worktrees/player-occupancy-v1` (sparse: `/review_artifacts/player_occupancy3/` added) |
| canonical files changed | **none**. New files only: `sandbox/visual/occupy3/`, `sandbox/visual/occupy3_lab.html`, this folder. Stage 2 (`occupy2/`) is unchanged and runs *as decided* (`wallSparesMove: true`) |
| the comparison | STAGE 2 = `OccupancyWorld2` with `S2D = { wallSparesMove: true }` · STAGE 3 = `ImpactWorld` (the same + the impact pass), identical inputs |

## The architecture in one paragraph

`occupy3/o3_world.js` `ImpactWorld` extends Stage 2's `OccupancyWorld2`. After Stage 2's occupancy pass, **one impact pass per tick**:

1. **Contact**: Stage 2's capsules, live poses. An episode opens at the first touching tick.
2. **Meaningful?** The episode is an IMPACT only if a pair is deeper than Stage 2's 2 cm tolerance (`penMin`) and one of:
   - a body contact closing > 0.30 m/s;
   - a limb strike > 1.0 m/s (articulated, capped thigh 3.0 / shin 4.5);
   - a Stage 2 unresolved tick.
   
   Otherwise the run is Stage 2's, bit for bit.
3. **Impulse**:
   - body contact: a velocity constraint (τ 0.03 s) with effective masses at the contact point from the posed body's inertias (equal 73 kg bodies);
   - limb strike: once per leg pair, with the swinging leg's effective mass;
   - strut: a planted leg aligned against the impulse passes its share to the ground (friction-capped).
4. **Per player**:
   - *u* += J/m; the moment goes to the trunk (lean, side, chest) and the pelvis yaw; the knees flex;
   - the LIP balance about the authored motion: ξ = e + u/ω, the slack from the grounded footprints, the capture-point controller;
   - the outcome A–E;
   - the recovery step: the LIP prediction, the placement (no crossing, within the stepping leg's reach), written into the canonical plan; cancelled (never forced) once it no longer applies.
5. **Realisation**:
   - the root moves only as far as the support allows (committed: Stage 2's 2 / 8 / 12 cm ledger; ordinary: the planted legs' reach);
   - beyond that, the drawn pelvis moves (≤ 6 / 10 cm, legs re-solved to the same feet);
   - beyond that, overflow (a step is needed).
6. **Posture**: damped oscillators added to the plan's own channels (`o3_body.js` `ImpactBody`, the canonical `PlayBody` + a perturbation).
7. **Committed actions**: explicit rules (`decideAction` / `release`), touches denied only for geometry. Nothing touches the ball or the authority.

## Entry points

```js
import { ImpactWorld, RES3 } from "./occupy3/o3_world.js";        // new ImpactWorld(env, { att, def, mode: "MEDIUM", record, res: { …Stage 2 overrides }, imp: { …RES3 overrides }, impact: false ⇒ Stage 2 exactly })
import { runO3, makeWorld3, S2D, O3_MODES } from "./occupy3/o3_run.js";   // runO3(env, tc, "S2" | "S2D" | "S3", { imp, res, record, before, onTick })
import { O3CASES, MATRIX } from "./occupy3/o3_cases.js";          // Stage 2's cases + the §16 matrix (+ mirrors)
W.imp.log       // per tick while an episode is active: pairs, the impulse (body / limb strike), per player: support, committed, feet, polygon, CoP, CoM, u, e, ξ, slack, demand, σ, class, band, P, O, root shift, step, posture, outcome
W.imp.events    // IMPACT · LIMB STRIKE · RECOVERY STEP · STEP LANDED · TOUCH DENIED · TACKLE BOOT DENIED · PERTURBED BUT CONTINUES · TECHNICAL EVENT COMPLETES, RECOVERY REPLACED · INTERRUPTED BEFORE TECHNICAL EVENT · SWINGING LEG BLOCKED (trip risk) · UNRESOLVED FALL CANDIDATE · FALL CANDIDATE — PLACEHOLDER ENDS · BALANCE REGAINED
W.imp.episodes  // per episode: why, onset facts, pairs, strikes, per player summary (severity, σ realised / predicted, class, steps, outcome, why, peaks, regained), referee facts
```

## Serve and open (LOCAL ONLY: real players' models)

```sh
cd ~/"Downloads/FC Simulator worktrees/player-occupancy-v1" && python3 -m http.server 8365 --bind 127.0.0.1
open http://127.0.0.1:8365/sandbox/visual/occupy3_lab.html
```

**Keys:**
- Space: play / pause;
- `,` `.`: step 4 ticks (Shift: 1);
- 1 / 2 / 3: STAGE 2 / STAGE 3 / both synchronized;
- s: SKIN → SKELETON → SKIN + SKELETON;
- o: ball; v: contact volumes; f: support; b: centre of mass · balance; n: contact normal; i: impact vector; r: recovery step; t: trails; g: Stage 2 ghost; h: frame data; d: diagnostics.

**URL parameters:**
- `case`, `layout` (`2` | `S2D` | `S3`), `mode`, `cam`, `show`;
- `t` (seconds from the carrier's t = 0), `play=0`;
- `vol` / `sup` / `bal` / `nrm` / `imp` / `stp` / `trl` / `ghost` / `hud` / `ball` / `diag` = 0 | 1.

## Tools (`sandbox/visual/occupy3/tools/`, run from that folder)

| tool | what |
|---|---|
| `o3_study.mjs --set review\|search\|moves` | §2 the Stage 2 conflict study (onset facts, families) → `evidence/study/` |
| `o3_identity.mjs --set …` | §1 / §21 S3 ≡ S2D every tick (roots, ball, authority, every joint) before the first impact → `evidence/identity_*` |
| `o3_solo.mjs` | §21 one footballer: every curated case of the canonical build, S3 ≡ S2D every tick → `evidence/solo.txt` |
| `o3_nearmiss.mjs` (IMP=json) | §1 two players passing (Stage 2's near-miss sweep): no impact ⇒ identical → `evidence/nearmiss*.txt` |
| `o3_metrics.mjs --set …` | §17 / §18 the measurements (penetration, planted-foot error, per player per episode, quality checks) → `evidence/metrics_*` |
| `o3_continuity.mjs --set matrix\|review` | §18 kinematics at 60 Hz around each transition, against Stage 2's same window → `evidence/continuity_*` |
| `o3_ball.mjs --set …` | §10 / §14 ball and possession proof, the touches denied, the actions ended, the outcomes changed, the referee facts → `evidence/ball_*` |
| `o3_torture.mjs [--only 2m,13] [--trace 2m [--motion]]` | §21 16 seeds × mirror × 40 s, S3 twice (determinism, NaN, stuck, ownership, chatter, loops, oscillation, the canonical long tackles) → `evidence/torture.{txt,json}` |
| `o3_variants.mjs` (V=json) | the choices: RES3 overrides compared on one set → `evidence/variants_*.txt` |
| `o3_perf.mjs` | §19 idle / near / active / worst 60 Hz frame → `evidence/performance.txt` |
| `o3_smoke.mjs [ids]` | the review cases, S2D · S3, one block each |
| `o3_lab_cases.mjs` + `o3_browser.cjs` | the Lab in Chrome ≡ node → `evidence/lab_cases.json`, `evidence/browser.json` |
| `two/o3_two_hook.mjs` | runs possess1's own two-player tools with Stage 3: `node --import ./two/o3_two_hook.mjs ../../possess1/tools/p_torture.mjs` (and `../../occupy2/tools/s2/o2s_early.mjs`) |

## Rules kept

- Nothing published; Labs on 127.0.0.1 only; screenshots in the scratchpad only.
- `bl_lock_check.sh` passes.
- main untouched; no history rewritten.
- No canned animations; no falls / stumbles / get-ups (Stage 3B); no fouls; no strength ratings; no outcome or balance tuning; no slide tackle.
- Body Feint / Croqueta LEG-WAVE V4 / Standing Tackle motions untouched; Stage 2's decisions kept; reaction MEDIUM 0.200 s.

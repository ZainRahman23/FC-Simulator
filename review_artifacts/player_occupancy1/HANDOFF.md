# HANDOFF — TOUCHLINE — PLAYER OCCUPANCY V1 (24 Oct 2026)

**Status: Stage 1 prototype, awaiting the owner's review** of the bodies in contact, the conflicts and the feel. Not integrated, not frozen, not pushed.

Read `O_REPORT.md` first. The owner's instruction is in `sources/` (verbatim).

## Source of truth

| what | value |
|---|---|
| branch | `prototype/player-occupancy-v1` (local) — see `STATUS.json` for the head |
| cut from | `89ab31c6` (Shared Possession + Reaction V1, `prototype/shared-possession-reaction-v1`), itself on `8c0149ba` (Standing Tackle V1) on `f775daac` (`milestone/feint-croqueta-vocab-v1`) |
| worktree | `~/Downloads/FC Simulator worktrees/player-occupancy-v1` (sparse: `/review_artifacts/player_occupancy1/` added) |
| canonical files changed | **none** — new files only: `sandbox/visual/occupy1/`, `sandbox/visual/occupy1_lab.html`, this folder |
| the comparison | OLD = Shared Possession + Reaction V1 at MEDIUM 0.200 s (`possess1/`, unchanged), from identical inputs |

## The architecture in one paragraph

- **Volumes** (`o_volumes.js`). Eleven capsules per body, built every tick from the real posed joints (PlayBody): pelvis, waist, chest, thighs, shins (resolved); feet and upper arms (detected only). The radii are measured from the characters' meshes (`tools/o_geometry.mjs`).
- **One pass per tick** (`o_world.js` `OccupancyWorld`, extending possess1's `SharedWorld`). It runs only while the two roots are within 1.9 m.
  - It poses both bodies live, detects all 121 pairs, then solves one 2-D minimum-norm ROOT correction over every penetrating pair.
  - The split is kinematic, never strength: the one moving into the other and on fewer planted feet takes more; a still player none; a committed action none.
  - Corrections are applied to the root path and the future footholds; joints are never edited.
  - The **soft wall** decelerates head-on plans on the two players' *relative* paths against a virtual disk. It is never a force field and never gives momentum.
  - The **support budget** lets the root move at most 18 cm over a planted stance.
  - The **ball-access gates** block any touch or boot whose leg is more than 5 cm inside the opponent's body.
  - Anything still beyond 5 cm is **UNRESOLVED** with its reason.

## Entry points

```js
import { OccupancyWorld, RES } from "./occupy1/o_world.js";   // new OccupancyWorld(env, { att, def, mode: "MEDIUM", occupancy: true|false, record: true|false })
import { runO, outcomeO } from "./occupy1/o_run.js";            // one encounter (tackle1 case format): runO(env, tc, "OLD" | "OCC", { record, onTick, before })
import { volumesOf, detect, legThrough, OCC } from "./occupy1/o_volumes.js";
W.occ.log          // per near tick: pairs, maxPen / maxRes, planted feet, actions, committed, share, dA / dD (root corrections), wA / wD (wall cut), foot fixes, conflict, unresolved
W.occ.events       // BALL ACCESS BLOCKED · TACKLE BOOT BLOCKED · CONFLICT: BOTH COMMITTED
W.frames           // (record) every tick's live pose of both bodies — what the solver saw, what the Lab draws
```

## Serve and open (LOCAL ONLY: real players' models)

```sh
cd ~/"Downloads/FC Simulator worktrees/player-occupancy-v1" && python3 -m http.server 8365 --bind 127.0.0.1
open http://127.0.0.1:8365/sandbox/visual/occupy1_lab.html
```

**Keys:**
- Space: play / pause;
- `,` `.`: step 4 ticks (Shift: 1);
- 1 / 2 / 3: OLD / OCCUPANCY / side by side;
- s: SKIN → SKELETON → SKIN + SKELETON;
- v: volumes; n: contact normals; a: ball access; d: diagnostics.

**URL parameters:** `case`, `layout` (`2` | `OLD` | `OCC`), `cam`, `show`, `t` (seconds from the carrier's t = 0), `play=0`, `vol` / `nrm` / `acc` / `ball` / `diag` = 0 | 1.

## Tools (`sandbox/visual/occupy1/tools/`, run from that folder)

Every tool runs on `o_env.mjs`: vocab2's node environment **plus the colliders the pages load**, so PlayBody poses the feet with DRIBBLE-1's boot hull exactly as the Lab does. Occupancy reads the posed body, and without them node and the page diverged.

| tool | what |
|---|---|
| `o_env.mjs` | the node environment (vocab2's + `dribble1/d1_colliders.json`) |
| `o_geometry.mjs` | the volumes measured from the meshes → `evidence/geometry.*` |
| `o_old.mjs` | §1 the old failure → `evidence/old_cases.*` |
| `o_smoke.mjs` | the review cases OLD vs OCC → `evidence/review_cases.txt` |
| `o_identity.mjs --search 20` | OLD ≡ Shared V1; OCC ≡ OLD until its first action → `evidence/identity.txt` |
| `o_tackle.mjs --set search` / `--set moves` | the 209 committed tackles and the move set: outcomes, changes with reasons, the loose-ball races classified → `evidence/tackle_*.{txt,json}` |
| `o_sets.mjs --set review / search / moves` | penetration statistics per region (median / p95 / p99 / max), the ball's first divergence → `evidence/sets_*.{txt,json}` |
| `o_bodycheck.mjs --set review / search / moves` | the approved actions: never cancelled; local pose vs world root, apart → `evidence/body_*.{txt,json}` |
| `o_continuity.mjs` | snaps, pelvis / foot / knee jumps, plant slides, crossed legs, ping-pong → `evidence/continuity.*` |
| `o_deadlock.mjs` | §21 every contact interval of the stress cases → `evidence/deadlock.txt` |
| `o_nearmiss.mjs` | §10 passes swept across lateral offsets: what occupancy does when the bodies would not have overlapped → `evidence/nearmiss.*` |
| `o_snap.mjs` / `o_support.mjs` | where the root snaps come from; the root correction within one planted stance → `evidence/snaps.txt`, `evidence/support.txt` |
| `o_tradeoff.mjs` (V=json) | the schedule / support / look-ahead trade-off → `evidence/schedule_tradeoff.txt` |
| `o_torture.mjs` | §32 long seeded two-player runs → `evidence/torture.*` |
| `o_early.mjs` (with `two/o_two_hook.mjs`) | §30 decisions vs root against the counterfactual → `evidence/two_player_early_info.txt` |
| `two/o_two_hook.mjs` | runs possess1's own two-player tools with OccupancyWorld and `o_env.mjs` (e.g. `p_torture.mjs`) → `evidence/two_player_possession.*` |
| `o_solo.mjs` | §29 one footballer (the other parked 40 m away), every curated case, ON vs OFF → `evidence/solo.txt` |
| `o_perf.mjs` | §33 costs → `evidence/performance.txt` |
| `o_lab_cases.mjs` + `o_browser.cjs` | the Lab in Chrome ≡ node → `evidence/lab_cases.json`, `evidence/browser.json` |
| `o_deep.mjs <case>` | every tick of one case deeper than 4.5 cm, with the solver's state |

## Rules kept

- Nothing published.
- `bl_lock_check.sh` passes.
- main untouched.
- No Contact Response, no Slide Tackle, no POKE tuning, no Standing Tackle tuning.
- Body Feint / Croqueta LEG-WAVE V4 / Standing Tackle motion untouched.
- Reaction MEDIUM 0.200 s.
- Screenshots: scratchpad only.

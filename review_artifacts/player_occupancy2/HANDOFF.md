# HANDOFF — TOUCHLINE — PLAYER OCCUPANCY STAGE 2 (24 Oct 2026)

**Status: Stage 2 prototype, stopped for the owner's visual review.** Not integrated, not frozen, not published.

Read `O2_REPORT.md` first. The owner's instruction is in `sources/` (verbatim).

## Source of truth

| what | value |
|---|---|
| branch | `prototype/player-occupancy-stage2` (local) — see `STATUS.json` for the head |
| cut from | `fb35347d` (Player Occupancy V1, Stage 1, `prototype/player-occupancy-v1`) ← `89ab31c6` Shared Possession + Reaction V1 ← `8c0149ba` Standing Tackle V1 ← `f775daac` `milestone/feint-croqueta-vocab-v1` |
| worktree | `~/Downloads/FC Simulator worktrees/player-occupancy-v1` (sparse: `/review_artifacts/player_occupancy2/` added) |
| canonical files changed | **none**. New files only: `sandbox/visual/occupy2/`, `sandbox/visual/occupy2_lab.html`, this folder. `occupy1/` (Stage 1) is unchanged and is the comparison |
| the comparison | OLD = Shared Possession + Reaction V1 at MEDIUM 0.200 s · STAGE 1 = `occupy1/` · STAGE 2 = `occupy2/`, identical inputs |

## The architecture in one paragraph

`occupy2/o2_world.js` `OccupancyWorld2` extends possess1's `SharedWorld` (as Stage 1 does) and reuses Stage 1's volumes (`occupy1/o_volumes.js`). One pass per tick, within 1.9 m:

1. **Support state** per player: COMMITTED PLANT · AIRBORNE · FREE LOCOMOTION · SINGLE · DOUBLE SUPPORT.
2. **Detection**: 121 capsule pairs, each classed by region and tier (CORE · FAST LIMB · detected only). A FAST LIMB pair is reported apart and resolved at the leg rate.
3. **Normal-only correction**: one minimum-norm relative correction along the contact normals; the tangent is untouched. Per-region rates: torso 3 cm/tick, legs 1.5 cm/tick.
4. **Kinematic split, then each share fitted to support (λ)**:
   - committed: 2 cm per plant · 8 cm per flight · 12 cm per commitment;
   - ordinary planted: 12 cm lean budget, inside the planted leg's reach;
   - airborne ordinary: free.
5. **What support cannot take** goes to the other player; whatever is still left is **not applied**. It stays as overlap and is classified UNRESOLVED (COMMITTED CONFLICT · PLANTED SUPPORT · PLANTED LEGS · FAST LIMB · COMMITTED ACTION'S LIMB · AUTHORED / BALL-ANCHORED LIMB PATH).
6. **Stance ledgers** give the SUPPORT CONSISTENCY ERROR.
7. **Soft wall**: Stage 1's relative-path wall; committed players take no share. A planned (not yet committed) Body Feint / Croqueta's approach is slowed unless `R.wallSparesMove` (off — an owner decision).
8. **Placement**: the plan is shifted. Planted stances never move; a swinging leg is carried with the body (cached swings carried, never rebuilt mid-flight).
9. **Ball access**: the 0.1 s window **plus** a gate at the contact's own tick (both bodies posed then). The tackle's boot is gated on every tick of its sweep (Stage 1 gated only a few — a bug). A blocked touch inside a committed Body Feint / Croqueta holds the move's self-caused re-plans until its release.

## Entry points

```js
import { OccupancyWorld2, RES2, REGION_CLASSES } from "./occupy2/o2_world.js";   // new OccupancyWorld2(env, { att, def, mode: "MEDIUM", record, res: { …RES2 overrides } })
import { runO2, outcomeO2, O2_MODES } from "./occupy2/o2_run.js";              // runO2(env, tc, "OLD" | "S1" | "S2", { res, record, before, onTick })
import { O2CASES } from "./occupy2/o2_cases.js";                                // Stage 1's review cases + ordinary locomotion (overtake, turn-into, glance, near miss) + mirrors
W.occ.log     // per near tick: pairs (region class, tier, closing speed), state[], committed[], share, dA/dD pushed, eA/eD executed, wA/wD wall, normal / vn / vt,
              // supportLimited + left (not applied), sce (stance ledgers), conflict, unresolved (class)
W.occ.events  // BALL ACCESS BLOCKED (through.now = caught at the contact's own tick; held = the committed move held) · TACKLE BOOT BLOCKED · CONFLICT: BOTH COMMITTED
W.frames      // (record) every tick's live pose of both bodies
```

## Serve and open (LOCAL ONLY: real players' models)

```sh
cd ~/"Downloads/FC Simulator worktrees/player-occupancy-v1" && python3 -m http.server 8365 --bind 127.0.0.1
open http://127.0.0.1:8365/sandbox/visual/occupy2_lab.html
```

**Keys:**
- Space: play / pause;
- `,` `.`: step 4 ticks (Shift: 1);
- 1 / 2 / 3: OLD / STAGE 1 / STAGE 2; 4: all three synchronized;
- s: SKIN → SKELETON → SKIN + SKELETON;
- v: capsules; n: contact normals; f: support anchors; c: root correction; a: ball access; h: frame data; d: diagnostics.

**URL parameters:**
- `case`, `layout` (`3` | `12` | `OLD` | `S1` | `S2`), `mode`, `cam`, `show`;
- `t` (seconds from the carrier's t = 0), `play=0`;
- `vol` / `nrm` / `anc` / `cor` / `acc` / `hud` / `ball` / `diag` = 0 | 1.

## Tools (`sandbox/visual/occupy2/tools/`, run from that folder)

Every tool runs on `occupy1/tools/o_env.mjs` (vocab2's node environment + the pages' colliders), so node ≡ page.

| tool | what |
|---|---|
| `o2_diag52.mjs [CROQUETA 2.4 -0.5 0.3 S1\|S2]` | §2 the Stage 1 diagnosis: the 52 cm foot discrepancy tick by tick, and the same case under Stage 2 → `evidence/diag52.txt` |
| `o2_metrics.mjs --set review\|search\|moves` | §20 / §21 OLD · S1 · S2: penetration per group and region class (ordinary vs committed), continuity, support (SUPPORT CONSISTENCY ERROR), unresolved classes → `evidence/sets_*.{txt,json}` |
| `o2_bodycheck.mjs --set …` | §5 / §16–18 / §20 motion preservation: never cancelled, exact-match ticks, after contact, inputs diverged, where world placement first differs → `evidence/body_*.{txt,json}` |
| `o2_conflicts.mjs` | §4 the stress cases one by one: penetration, support error, where the world placement first differs, carried, denied, unresolved → `evidence/conflicts.{txt,json}` |
| `o2_variants.mjs` (V=json) | §9 look-ahead, §22 tolerance, §23 lean, smoothing, the levers → `evidence/variants/*.txt` |
| `o2_access.mjs --set …` | §14 / §15 / §18 ball access: contacts made CLEAR / AMBIGUOUS / THROUGH, the latency check, denials (window / at the contact's tick), held moves, the tackle boot around vs through → `evidence/access_*.{txt,json}` |
| `o2_smoke.mjs [ids]` | the review cases, OLD · S1 · S2, one line each |
| `o2_jolts.mjs` | where the root jolts come from |
| `o2_lab_cases.mjs` + `o2_browser.cjs` | the Lab in Chrome ≡ node → `evidence/lab_cases.json`, `evidence/browser.json` |
| `s2/o2s_*.mjs` | Stage 1's tools (`occupy1/tools/`, unchanged) ported to Stage 2 (OCC = OccupancyWorld2): tackle outcomes and races, near miss, deadlock, identity, solo, torture, early information, performance |
| `s2/two/o2_two_hook.mjs` | runs possess1's own two-player tools with OccupancyWorld2: `node --import ./two/o2_two_hook.mjs ../../../possess1/tools/p_torture.mjs` |

## Rules kept

- Nothing published.
- `bl_lock_check.sh` passes.
- main untouched.
- No impact physics; no strength; no tackle-outcome tuning; no slide tackle.
- Body Feint / Croqueta LEG-WAVE V4 / Standing Tackle motions untouched.
- Reaction MEDIUM 0.200 s.
- Screenshots: scratchpad only.

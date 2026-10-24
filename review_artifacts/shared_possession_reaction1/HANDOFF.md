# HANDOFF — TOUCHLINE — SHARED POSSESSION + REACTION V1 (24 Oct 2026)

**Status: an architecture candidate, awaiting the owner's review** of the possession transitions, the reaction timing and the interaction feel. Not integrated, not frozen, not pushed.

Read `SPR_REPORT.md` first. The owner's instruction is in `sources/` (verbatim).

## Source of truth

| what | value |
|---|---|
| branch | `prototype/shared-possession-reaction-v1` (local) — see `STATUS.json` for the head |
| cut from | `8c0149ba` (Standing Tackle V1, `prototype/tackling-integration-v1`), itself on `f775daac` (`milestone/feint-croqueta-vocab-v1`) |
| worktree | `~/Downloads/FC Simulator worktrees/shared-possession-reaction-v1` (sparse: `/review_artifacts/shared_possession_reaction1/` added) |
| canonical files changed | **none** — new files only: `sandbox/visual/possess1/`, `sandbox/visual/possess1_lab.html`, this folder |
| the diagnostic fixture | Standing Tackle V1's world (`tackle1/`, unchanged) = mode **OLD** |

## The architecture in one paragraph

- **One authority.** One `BallAuthority` (`p_authority.js`) per ball, owned by the world, holds CONTROLLED(id) / FREE (FREE · CONTESTED is a reported label).
- **Players request, the authority grants.** Each player is a `SharedSim` (`p_sim.js`): the canonical `ControlledSim`, unchanged, whose possession logic now only requests:
  - its COLLECTED is a **claim**, granted only on a FREE ball and with current knowledge;
  - its exits are **releases**;
  - another player's contact is **judged by the canonical minor-deflection rule** on the plan the owner has at that moment.
- **One launch hook.** Every ball change passes through the world's launch hook (`p_world.js`), and every player who did not make it gets a world event. **Perception** (`p_react.js`) delays only re-planning from those events, by the reaction interval. Until then the player plans on a **belief**: the kernel ball restored from the snapshot taken just before the event.
  - His input, his committed action and his own touches are never delayed.
  - A touch made on the belief meets the real ball only within 15.5 cm of where he believed it.
- **The ball-on rule.** It decides who plans touches: the owner, or any candidate for a FREE ball. Never a player who knows the opponent controls it.

## Entry points

```js
import { SharedWorld } from "./possess1/p_world.js";            // a two-player world: { att, def } options as tackle1 (playerOpts), mode: "NONE" | "SHORT" | "MEDIUM" | "LONG" (or rt: s)
import { runMode, outcomeOf, MODE_LIST } from "./possess1/p_run.js";   // one encounter (tackle1 case format) under "OLD" | "NONE" | "SHORT" | "MEDIUM" | "LONG"
W.auth.state / W.auth.owner / W.auth.log / W.auth.denied / W.auth.labels  // the authority and its record
W.contactLog                                                       // every ball change: { k, t, by, kind: touch | blind touch | tackle, at, vIn, vOut }
p.pc.q / p.pc.log / p.pc.belief                                    // a player's pending events, perceived events, belief ball
W.trueTrack(t) / p.ballTrack(t)                                    // the real ball / the ball as that player's body sees it
```

## Serve and open (LOCAL ONLY: real players' models)

```sh
cd ~/"Downloads/FC Simulator worktrees/shared-possession-reaction-v1" && python3 -m http.server 8364 --bind 127.0.0.1
open http://127.0.0.1:8364/sandbox/visual/possess1_lab.html
```

**Keys:**
- Space: play / pause;
- `,` `.`: step 4 ticks (Shift: 1);
- 1–5: mode;
- T: tackle at the playhead;
- B: ball;
- D: diagnostics.

**URL parameters:** `case`, `mode`, `layout` (1 | 2 | 5), `cam`, `t`, `ball`, `body`, `skel`, `diag`, `beliefs`.

## Tests (regenerate from `sandbox/visual/possess1/tools/`; outputs in `evidence/`)

```sh
node p_old_failure.mjs --case carry-jog-l        # §1: the old failure, frame by frame (also --search 100)
node p_trace.mjs --case race --modes OLD,NONE,SHORT,MEDIUM,LONG --until 2.5   # the event trace per mode
node p_identity.mjs --search 20                  # both players ≡ OLD before any event; the tackle body ≡ OLD
node p_input.mjs                                 # §14: input / committed moves continue; no input lag; no early use
node p_moves_body.mjs                            # §21: Body Feint / Croqueta under contact vs no contact
node p_outcomes.mjs --set search|moves|envelope  # §20: the emergent outcomes (all modes)
node p_torture.mjs --n 60 --seed 3               # §31 / §32 (≈ 15 min)
node p_cpu.mjs --reps 3                          # §33
node p_overlap.mjs                               # §23: the bodies' interpenetration
node p_blind.mjs                                 # touches made blind: hit / missed
node p_lab_cases.mjs --json <f>                  # every review case × mode (the page is compared with it)
PUPPETEER_NODE_MODULES=<dir> node p_browser.cjs --out <dir> --shots <scratch dir> --node <lab_cases.json>   # the Lab in Chrome (server on :8364)
# §29 — the milestone's complete single-player regression THROUGH SharedSim (≈ 8 min):
NODE_OPTIONS="--import=file://<worktree, spaces as %20>/sandbox/visual/possess1/tools/solo/p_solo_hook.mjs" node review_artifacts/tackling_integration1/tools/milestone_regress.mjs --out <dir>
```

## Decisions for the owner

1. **The reaction interval.** SHORT 0.125 / MEDIUM 0.200 / LONG 0.300 s. My provisional recommendation is MEDIUM.
2. **The ball-on rule's consequence.** A player who knows the opponent controls the ball plans no ordinary touches on it: a controlled ball is challenged only by an explicit action (the tackle). Keep it, or add an automatic challenge later?
3. **Integration path.** Make `SharedSim` the published player: the regression is identical, and the solo cost is +4 %. Decide whether Reaction V1 should also apply to the single-player opponent probe.
4. **The canonical refresh inefficiency.** A kept recovery plan re-plans every tick (§14): fix it in the canonical planner (a behaviour change, review it), or leave it.
5. **Next, by the owner's plan:**
   - Player Occupancy V1 (collision), which the race results depend on (§15);
   - Standing Tackle's contact calibration (POKE);
   - the tackle's recovery cost (Tackling V1 decision 4), the main reason the carrier still recovers most balls.

## Not done (by instruction)

- Player Occupancy V1 / collision, shielding, shoulder challenges, trips, fouls, ragdolls (measured only).
- The slide tackle.
- POKE tuning.
- Any change to Body Feint, Croqueta, carry, gait, Technical Control, Agility or the tackle body.
- Integration, freezing, pushing.

# TOUCHLINE — SHARED POSSESSION + REACTION V1 — REPORT

**Status: an architecture candidate.** Built and tested; not integrated, not frozen, not pushed. Date: 24 Oct 2026.

- **Instruction:** the owner's, saved verbatim in `sources/2026-10-24_user_instruction_shared_possession_reaction_v1.md`.
- **Branch:** `prototype/shared-possession-reaction-v1`, cut from Standing Tackle V1's last commit `8c0149ba`.
- **Worktree:** `~/Downloads/FC Simulator worktrees/shared-possession-reaction-v1`.
- **Code:** all new, in `sandbox/visual/possess1/` and `sandbox/visual/possess1_lab.html`.
- **Canonical files changed: none.** The published footballer, Body Feint, Croqueta, carry, gait, Technical Control, Agility, the ball kernel and Standing Tackle V1 (`tackle1/`) are all untouched. Standing Tackle V1's world is kept as the diagnostic fixture **OLD**.

## 0. Verified base

| | ref | SHA |
|---|---|---|
| base gameplay milestone | `milestone/feint-croqueta-vocab-v1` = tag `checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24` | `f775daac` (on the remote too) |
| Body Feint (video-guided + exit foot) | integrated in the milestone (`vocab2/`); review builds `7853a88f` / `f8a0e374` | in `f775daac` |
| Croqueta LEG-WAVE V4 | integrated in the milestone; review build `b489e4fd` | in `f775daac` |
| Standing Tackle V1 | `prototype/tackling-integration-v1` (local) | `8c0149ba` |
| left-stick research | `prototype/left-stick-intent-v1` (also on the remote) | `6ccd9f9a`, not touched |
| main | `main` (also on the remote) | `ff3a89fe`, not touched |

`bl_lock_check.sh` passes.

## 1. The old failure

**Tool:** `possess1/tools/p_old_failure.mjs`. It probes Standing Tackle V1's world without changing it. It records every re-plan of both players (its tick, its reason, the plan adopted, where each planned touch was first created), both possession records, and the ball, frame by frame. Evidence: `evidence/old_trace_*.txt`, `evidence/old_search.txt`.

### Mechanism 1: the carrier re-plans in the contact tick, from the deflected ball

Case `carry-jog-l`, ticks around the tackle contact (tC = tick 795):

| tick | t − tC | ball | \|v\| | carrier's possession | defender's possession | carrier's next planned touch | event |
|---|---|---|---|---|---|---|---|
| 794 | −0.004 | (40.37, 34.13) | 3.27 | CONTROLLED | ball off | carry R +0.383 | — |
| **795** | **0.000** | (40.37, 34.15) | **4.04** | **FREE** | ball off | **carry correction R +0.321** | **TACKLE CONTACT · carrier RE-PLAN "opponent" in the same tick** · his model → FREE (OPPONENT_TACKLE) |
| 817 | +0.092 | (40.33, 34.50) | 3.69 | FREE | ball off | compact inside redirect +0.163 | carrier re-plan "footfall" |
| 856 | +0.254 | (40.29, 35.03) | 4.76 | **CONTROLLED** | ball off | carry +0.683 | carrier's touch → his model COLLECTED → CONTROLLED |

The tackle changes the ball, and **in that same tick** the carrier's planner reads the *new* ball. It plans a touch that reaches it (in 0.321 s), then re-collects at +0.254 s. No human could have reacted to the deflection by then.

### Mechanism 2: a touch planned before the contact plays the moved ball

The kernel's touch plays any ball within **1.05 m of the body**: the canonical player plans each touch knowing where the ball is. So a touch planned *before* the tackle still connects with a ball the tackle has moved. Of OLD's 124 quick recoveries, 24 were touches already planned before the contact.

### Mechanism 3: two independent possession truths

Each player runs his own one-player possession model on the one ball. In the race case, the defender collects at +1.962 s:

| tick | t − tC | carrier's model | defender's model | event |
|---|---|---|---|---|
| 1244 | +1.962 | FREE | **CONTROLLED** | the defender's touch: his model COLLECTED · **the carrier re-plans "opponent" in the same tick** → DRAG-BACK, touch in 0.096 s |
| 1267 | +2.058 | **CONTROLLED** | **CONTROLLED** | **the carrier's DRAG-BACK on the defender's ball: both models CONTROLLED** |
| 1300 | +2.196 | FREE | CONTROLLED | the defender's touch takes it back; the carrier re-plans in the same tick again (SECURE · RECOVERY) |

After this, the carrier keeps planning touches on the ball the defender controls, re-planning in the tick of every defender touch.

### Aggregate (Tackling V1's search set: 100 set-ups × 15 request times = 1,500 runs, 209 committed tackles, 162 contacts)

- **The carrier's first re-plan after the contact:** in the contact tick itself in **162 of 162** (latency 0 ticks).
- **His first plan with a touch in reach of the deflected ball:** made in the contact tick in **148 of 162**.
- **OLD's 124 "ATTACKER RECOVERS":** the recovering touch was created in the contact-tick re-plan in 66, was planned before the contact (mechanism 2) in 24, and came from a later re-plan in 34.
- **Dual truth** (both models CONTROLLED at once): 5 runs, 444 ticks.

## 2. The shared possession authority

**One ball, one possession state, owned by the world** (`p_authority.js`, `BallAuthority`). No player decides possession for himself any more.

The canonical possession logic still runs in each player (`c_sim.js`, unchanged), but only *requests*:
- `enterControl` (his COLLECTED) becomes **a claim** to the authority, which alone grants it;
- `exitControl` (his own exits) becomes **a release**.

There is one owner field, so two owners cannot exist.

**Every change of the ball passes through one place**, the world's launch (`p_world.js`): the attacker's touches, the defender's touches (through his proxy) and the tackle's boot (through the canonical opponent law). Each one is logged, judged by the authority and delivered to every other player as a world event.

**The single-player world uses the same code trivially.** `SharedSim` alone (one candidate, the authority never consulted) **is** the published player:
- the milestone's complete regression runs through it unchanged (§11);
- it is not a second possession system.

## 3. States

| state | exact meaning |
|---|---|
| **CONTROLLED(id)** | That player has **established** control by the canonical COLLECTED rule: his own clean touch just made **and** a controlled continuation after it. "Clean" means not missed and not a release. "Continuation" means his next planned touch within 1.2 s, the free ball inside his control envelope until then, and in reach (≤ 1.0 m) at that touch. It never means "touched it last" or "it is near him". **A tackle's boot never establishes control.** |
| **FREE** | Nobody has established control. |
| **FREE · CONTESTED** | A **reported label**, not a state: the authority's name for a FREE ball on which two or more players have a credible immediate claim (a planned touch in reach of the real ball within 1.2 s). No rule reads it. FREE plus each candidate's own control evaluation is all the transitions need, so nobody can "own" a contest. It is drawn on the Lab's timeline and named in the diagnostics. |

No direct CONTROLLED(A) → CONTROLLED(B): control is broken first. **There is no tackler priority and no previous-owner priority.**

## 4. Control acquisition

The audit of the canonical rule (`c_sim.js` `afterReplan`, `contOf`, `possCost`, the kernel's contact):

| considered? | how |
|---|---|
| ball distance | ✓ at the next planned touch: ≤ 1.0 m from the body (`POSS.reach`); throughout, inside the control envelope 1.5 m + 0.12 m per m/s of body speed |
| touch geometry | ✓ the kernel's contact: the ball ≤ 1.05 m from the body and ≤ 0.5 m high, else the touch misses |
| relative velocity / ball speed | ✓ indirectly: the free ball predicted forward (the kernel's own rolling law) must stay in the envelope until the next touch; a ball coming to rest at the feet counts (speed < 0.3 m/s, within 0.9 m) |
| planned next touch | ✓ within 1.2 s (`POSS.H`; the sprint carry its own horizon) |
| technical foot | ✓ the continuation is invalid if the drawn foot could not make the touch (its swing would jump: `swingCont`, `footReach`) |

**The shared authority adds two conditions:**
1. **The ball must be FREE.** A claim on a ball another player controls is denied and logged.
2. **The claimant's knowledge must be current**: no world event waiting to be perceived. A touch made blind can move the ball, but it cannot establish control. This is the minimum "establishment semantics" (§19): it makes A → B → A ownership chatter within one reaction time impossible, without any possession lock. A FREE ball is available the moment it is FREE.

**Who may play a FREE ball (the ball-on rule)** — the players whose planner plans touches on it:
- its last owner;
- any player whose contact touched it since it became FREE;
- any available player it comes within the control envelope of.

Never a player whose body a committed tackle owns. A player who **knows** the opponent controls the ball goes **ball-off**: he plans no touches on it. A ball under control is challenged only by an explicit defensive action (V1: Standing Tackle). There is still no defender AI: the defender plays a loose ball through the same canonical planner the carrier uses, with his scripted stick.

## 5. Control loss

| cause | rule |
|---|---|
| the owner's own exits (canonical, unchanged) | a release touch; CONTROLLER_FAILURE (a planned contact missed, no contact planned for 0.3 s, the ball 3 m away) |
| **another player's contact** (a tackle, a touch, a blind touch) | the canonical rule: control survives only a **minor deflection**, Δv < 2 m/s and the owner's next touch within 0.6 s with a controlled continuation. It is judged **on the plan the owner has at that moment, against the real ball**, including whether his next touch would still physically meet the ball. He cannot re-plan from a contact he has not perceived. With no reaction delay, his own same-tick re-plan makes the judgment, exactly as before. |
| the owner's blind touch misses the real ball | → FREE |

## 6. The reaction model (`p_react.js`)

**Physical truth is never delayed.** The ball moves, contacts resolve, the authority decides and the page draws reality at once.

**What is delayed** is a player's *action-planning knowledge* of anything he did not do himself:
- an opponent's contact with the ball (a tackle, a touch, a blind touch);
- the possession changes the world decides (control broken, the ball FREE, an opponent's control);
- for the tackler too: **his own tackle's result**, because where the ball goes off his boot was not his plan.

| immediate (his own) | delayed by the reaction interval (new information) |
|---|---|
| his stick input (re-planned in its own tick) | an opponent changing the ball's trajectory |
| his committed action (a Body Feint, a Croqueta, the tackle) | possession broken / the ball FREE |
| his own touches and their results | an opponent establishing control |
| the ball's trajectory as he already knew it | an unexpected deflection or contact |

**The belief.** Until he perceives an event, the player plans on the ball **as it would be without that event**. This is the kernel ball restored from a snapshot taken just before that event's launch, stepped by the same kernel, with his own touches applied to it. That is exactly the ball he was already playing. So for the whole reaction interval:
- his running plan continues;
- his re-plans (for his own stick, his footfalls, the refresh) run as before;
- his touches are made as planned.

All of this is **bit-identical to the same encounter without the event** (§8). With several events pending, the belief is the ball just before the earliest one he has not perceived.

**Touches made blind.** A touch he planned on his belief sweeps through where he believes the ball is.
- It meets the real ball only if the real ball's centre is within **15.5 cm** of that point: the ball's radius plus the boot's contact radius (Standing Tackle V1's boot sphere, 0.045 m).
- The canonical 1.05 m reach exists because the canonical player plans each touch knowing where the ball is. Applied to a ball moved by a contact he has not seen, it was mechanism 2.
- A blind touch that hits moves the real ball. It cannot establish control.
- **Over the search set** (`tools/p_blind.mjs`, `evidence/blind.txt`):

  | | blind touches | hit the real ball | swept through where it would have been | median distance believed → real |
  |---|---|---|---|---|
  | SHORT | 65 | 27 | 38 | 22 cm |
  | MEDIUM | 112 | 28 | 84 | 35 cm |
  | LONG | 177 | 21 | 156 | 64 cm |

**When he perceives,** he re-plans exactly as the canonical player re-planned in the contact tick: as the owner he believed he still was (so the canonical possession-preserving fallback is available). Then he learns the world's possession judgment. One event is perceived exactly once.

**No cognitive AI, no ratings, no input lag.** The model is one interval per candidate, the same for both players. In single-player play it is not active. The opponent probe (a test fixture, not a player) keeps its canonical same-tick path; whether the probe should also get the reaction delay is a decision for integration.

## 7. Reaction candidates

| candidate | interval | ticks | rationale |
|---|---|---|---|
| **SHORT** | **0.125 s** | 30 | Human **online correction** of a movement already under way: a reaching hand is diverted ≈ 0.10–0.11 s after its target jumps (Brenner & Smeets 1997; Smeets, Oostwoud Wijdenes & Brenner 2016: an adjustment of a movement under way at ≈ 0.1 s is about half the time needed to start a new movement). This is the dribbler adjusting a touch already in motion, rounded up to a tick multiple. |
| **MEDIUM** | **0.200 s** | 48 | **Simple visual reaction** in young adults, ≈ 0.19–0.25 s (Galton's < 0.19 s; modern laboratory means longer and varying by apparatus; Woods et al. 2015 review). This is the lower part of the range, for trained athletes. |
| **LONG** | **0.300 s** | 72 | An **unexpected** change that needs a new choice rather than a correction. Choice reaction is longer than simple reaction (Hick–Hyman). |

**External research vs game tuning.** The literature gives the ranges above. Fitting them to the game is a separate step:

| game cadence | value |
|---|---|
| a jog step | ≈ 0.30–0.35 s |
| a carry touch | every 0.25–0.7 s |
| D99's commitment horizon (a touch or landing closer than this cannot change) | 0.045 s |
| the canonical refresh and "no contact planned" windows | 0.3 s |
| Standing Tackle V1's contact → control return | 0.32–0.83 s |

All three candidates sit inside one step and one carry touch, and below the tackle's recovery. None was chosen from the tackle statistics; they were fixed before any outcome was run.

**My provisional recommendation: MEDIUM (0.200 s)** as the default to review. A tackle's deflection is new, unplanned information, closer to a simple visual reaction than to the online correction of a movement already aimed at the target.

## 8. Pre-existing input (`tools/p_input.mjs`, `evidence/input.txt`)

**The test.** Each encounter runs under each candidate, and again as a **counterfactual**: the same encounter, inputs and tackle (commitment, body, boot path), but the boot never presented to the ball. Each tick, the attacker's signature is compared: root, pelvis, the plan's action and contacts, his contact record and his request.

| already under way at the contact | SHORT | MEDIUM | LONG | OLD |
|---|---|---|---|---|
| **steering left** (stick 30° left, held) | identical to the counterfactual through the interval; first difference +31 ticks (perception) | +49 | +73 | differs at +1 tick |
| **sharp cut** (60° left begun 0.27 s before the contact) | +31 | +50 | +73 | +1 |
| **Body Feint, committed** | +31 | +49 | +73 | +1 |
| **Croqueta, committed** | +31 | +133 | +73 | +1 |

**Nothing is paused and nothing is re-planned from the contact before perception.** During the interval the carrier still re-plans for his own footfalls, contacts and refreshes, on his belief, and the result equals the counterfactual's.

**No input lag.** The stick was turned 70° left *inside* the reaction interval:
- **The re-plan:** "request" in the input's own tick (+0) under all three candidates. The body is identical to the counterfactual (the same input, no contact).
- **The body's path:** it leaves the no-turn path after 16 / 25 / 25 ticks. The player **alone** (no defender) does the same: alone, his path leaves after 46 / 37 / 25 ticks with that input. Under LONG that is matched exactly (25 = 25). Under SHORT and MEDIUM, perception (15 / 24 ticks after the input) comes first.

**15 / 15 checks pass.**

**Sharp cut (§22).** The Lab's cut case is still a **MISS** in every mode: the cut moved the ball 7 cm from the defender's prediction and the boot missed by 5 cm. The cut begun before the contact in the race case (above) runs on untouched. Reaction V1 delays reaction to new information. It does not suppress a cut.

## 9. Tackling results (Standing Tackle V1, POKE, untuned — `tools/p_outcomes.mjs`)

**The rule.** One rule for every mode (OLD included): after the first boot contact, who **established control** first.
- In OLD, that is the first of its two models to say CONTROLLED.
- Tackling V1's own labels, which counted the carrier's next *touch*, are kept beside it in the JSON.

### The search set (1,500 runs, 209 committed)

| | OLD | SHARED · 0 | SHORT | MEDIUM | LONG |
|---|---|---|---|---|---|
| MISS | 47 (22.5 %) | 47 | 47 | 47 | 47 |
| CONTACT — ATTACKER RETAINS | 3 (1.4 %) | 3 | 3 | 3 | 3 |
| CONTACT — ATTACKER RECOVERS | 153 (73.2 %) | 153 | 148 (70.8 %) | 141 (67.5 %) | 127 (60.8 %) |
| CONTACT — DEFENDER RECOVERS | 6 (2.9 %) | 6 | 11 (5.3 %) | 18 (8.6 %) | 32 (15.3 %) |
| CONTACT — BALL FREE | 0 | 0 | 0 | 0 | 0 |
| carrier's re-establishment after the contact, median / p90 | — | 0.18 / 1.40 s | 0.79 / 1.60 | 1.01 / 1.69 | 1.25 / 1.77 |
| the defender kept it to the replay's end | — | 6 / 6 | 10 / 11 | 18 / 18 | 32 / 32 |

- **Weak vs clean contact.** The 3 weak contacts (Δv 1.64 m/s < 2) are kept by the carrier in every mode; that is the minor-deflection rule. All 159 clean contacts break control.
- **MISS is the same in every mode.** A miss is decided before any reaction.
- **SHARED · 0 equals OLD on every outcome here.** The authority alone changes possession only where the two truths collided (5 runs).

**By group:**

| group | OLD → LONG |
|---|---|
| jog carry | DEFENDER RECOVERS 0 → 4 of 23 |
| walk carry | 0 → 4 of 7 |
| cut right | 1 → 7 of 53 |
| cut left | 5 → 13 of 41 |
| Croqueta | 0 → 4 of 26 |
| Body Feint | 0 → 0 of 30 |
| left-footed carry | 0 → 0 of 29 |

### The envelope set (288 encounters, 122 committed)

| defender | outcome by mode |
|---|---|
| standing | ATTACKER RECOVERS in every mode (27 + 27 mirror) |
| walking in | DEFENDER RECOVERS 2 of 18 under MEDIUM and LONG |
| jogging in, mirror | LONG: DEFENDER RECOVERS 3, BALL FREE 2 of 15 |

**BALL FREE** (2–4 runs) means a poke sent the ball at up to 15 m/s far from both players (e.g. 30 m from the carrier, 17 m from the defender). Neither canonical planner pursues a ball that far, because there is no AI.

### The move set (§10)

Body Feint and Croqueta are in §10.

### What it means

- **The defender now wins loose balls in proportion to how long the carrier takes to react.** That is the emergent effect of removing the zero-latency re-plan.
- **The carrier still recovers most balls, even with LONG.** The defender's body is owned by his own tackle until control returns, 0.32–0.83 s after the contact. That is longer than every candidate.
- **The tackle was not changed** (§12).
- **The remaining imbalance is the tackle's own recovery cost** (Tackling V1 decision 4) and the absence of collision (§15). Neither is a possession rule.

## 10. Body Feint / Croqueta

### Outcomes against a standing defender in front (`evidence/outcomes_moves.txt`)

The curated cases verbatim × ahead 2.4–4.2 m × ±0.5 / ±1.0 m × requests 0–1.0 s.

| | OLD | SHARED · 0 | SHORT | MEDIUM | LONG |
|---|---|---|---|---|---|
| Body Feint (99 committed) | MISS 14 · ATT 82 · DEF 3 | same | ATT 81 · DEF 4 | ATT 79 · DEF 6 | ATT 74 · DEF 11 |
| Croqueta (82 committed) | MISS 29 · RETAINS 1 · ATT 51 · DEF 1 | same | ATT 48 · DEF 4 | ATT 37 · DEF 15 | ATT 32 · DEF 20 |

### Their motion is unchanged

1. **The single-player regression** (§11) runs the approved motions' reproduction suites through `SharedSim`: every joint and the ball, every tick, ≡ the approved review builds (Croqueta LEG-WAVE V4 + Body Feint).
2. **In the encounter** (`tools/p_moves_body.mjs`, every contact made while a move is planned or committed), against the same encounter with no contact:
   - **The body as drawn live is identical through the whole reaction interval** in every case, every joint: Body Feint 52 / 52, Croqueta 27 / 27, under all three candidates.
   - **Committed moves go on to their release:**

     | | OLD | SHORT | MEDIUM | LONG |
     |---|---|---|---|---|
     | Body Feint | 15 / 17 | 15 / 17 | 16 / 17 | 17 / 17 |
     | Croqueta | 11 / 12 | 11 / 12 | 12 / 12 | 12 / 12 |

     Under LONG the root path and pelvis are identical to the no-contact run all the way to the release, because the move releases before he perceives.
   - **Where the path differs before the release,** it differs **only from the tick he perceives the contact**, never before. That is the canonical move logic's own re-plan with the real ball (a committed move re-targets only its exit), exactly what OLD did in the contact tick itself.

   **Reaction V1 never cancels or rewrites a move.** It delays the canonical response.
3. **Why the live body, not the after-the-fact replay.** After the fact, a swing is drawn with the landing a *later* re-plan revised: the body differs from 7 ticks *before* the contact while the simulations are bit-identical. The live body (what the game draws) is the fair comparison.

## 11. Single-player regression (§29)

`tools/solo/p_solo_hook.mjs` is a Node loader hook. For every single-player tool, the canonical `ControlledSim` *is* possess1's `SharedSim`, alone in its world. No file is modified.

The milestone's own runner (`review_artifacts/tackling_integration1/tools/milestone_regress.mjs`) compares each suite's output, line by line, with the evidence committed at `f775daac`.

| suite | footballers built through SharedSim | result |
|---|---|---|
| reproduction_vs_croqlw (Croqueta LEG-WAVE V4 + Body Feint ≡ review builds) | 10 | **SAME** |
| reproduction_vs_feint2ef (Body Feint ≡ feint2ef) | 7 | **SAME** |
| lab_cases | 34 | **SAME** |
| chains (7 × mirror, twice) | 28 | **SAME** |
| bf_sweep_right_footed | 718 | **SAME** |
| croq_sweep | 302 | **SAME** |
| regression/cases (122 curated cases) | 122 | **SAME** |
| regression/battery | 72 | **SAME** |
| regression/determinism (18 seeds × 30 s ×2 + re-simulated) | 54 | **SAME** |
| regression/torture_page_40 (40 seeds × 60 s) | 40 | **SAME** |

**ALL 10 SUITES IDENTICAL.** Plus `p_solo_check.mjs`: 6 × 20 s of random stick, canonical vs `SharedSim` alone, every tick identical (position, ball, fingerprint, contacts, possession).

**Nothing differs, so nothing needed explaining.**

## 12. Standing Tackle V1's body (§30) and the world before any event (`tools/p_identity.mjs`, `evidence/identity.txt`)

Over the 21 Lab cases plus the first 20 search set-ups × 15 request times (321 encounters × 4 shared modes) against OLD:

- **Before the first tackle contact:** both players and the ball **bit-identical every tick, 200 / 200**. The world adds nothing before an event.
- **Runs with no contact** (declined, missed, no request): **identical for the whole run, 1,084 / 1,084.**
- **The tackle body,** commitment → control return (52,296 posed ticks): **256 / 256 identical**. The root path and every joint match exactly, posed against the same ball.
  - The window ends 2 ticks before control return. The body's velocity is a central difference, so a pose already reads the next decision, which may legitimately differ.
  - **As drawn,** the head and neck *look at the real ball*, which moves differently after the contact because the carrier reacts differently. They differ by up to 25 cm; the trunk and arms, which follow the look, by up to 1.4 cm.
- **The tackle is identical under every candidate.** Its request, opportunity and commitment read the real ball; its timing is the user's.

## 13. Torture and determinism (`tools/p_torture.mjs`, `evidence/torture.txt`)

**The trials.** 60 trials: honest set-ups × request patterns (single, rapid repeated requests every 0.06–0.12 s for 1.8 s, requests on the defender's footfalls, invalid). The defender's stick after his tackle is aimed at 0, ±30 or ±60°, so both players go for the loose ball. **Every second trial is the mirrored world** of the one before. Each trial runs under the 4 shared modes, **twice**, plus its counterfactual.

| check | SHARED · 0 | SHORT | MEDIUM | LONG |
|---|---|---|---|---|
| ball contacts / transitions / control established | 700 / 136 / 98 | 672 / 148 / 104 | 672 / 140 / 100 | 670 / 148 / 104 |
| claims denied (all blind) | 0 | 2 | 6 | 16 |
| **dual ownership** | **0** | **0** | **0** | **0** |
| unaware owner · stale owner (3 m from the ball) | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| **ownership chatter** (owner changed twice < 0.25 s) · A → B → A < 0.5 s | **0 · 0** | 0 · 0 | 0 · 0 | 0 · 0 |
| possession without a touch · control granted blind | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| FREE never resolved (FREE at the replay's end) | 0 | 0 | 0 | 0 |
| reaction timer never resolved · an event perceived twice | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 |
| **new information used early** (≠ the counterfactual before perception) | — | **0 / 38** | **0 / 38** | **0 / 38** |
| near-simultaneous touches (2 players < 0.05 s) | 10 | 8 | 12 | 12 |
| most ownership establishments in one run | 3 | 3 | 3 | 3 |
| FREE episodes resolved: median / p90 / max | 0.23 / 1.57 / 2.69 s | 0.92 / 1.55 / 2.75 | 1.08 / 1.63 / 2.75 | 1.28 / 1.63 / 2.69 |
| **nondeterministic** | **0** | **0** | **0** | **0** |

"An event perceived twice" cannot pass silently: `Perception.due()` throws on one. **Determinism** is each trial run twice, comparing contacts, authority transitions and denials, the plans (both players' canonical fingerprints and the last 40 plans), the ball, the perceptions and the outcome. All are identical.

## 14. Performance (`tools/p_cpu.mjs`, `evidence/cpu.txt`; node, no drawing)

| | |
|---|---|
| **single player:** the published `ControlledSim` vs `SharedSim` alone | 100.6 vs 105.0 µs per tick: +4.4 µs (4.4 %), inside the run-to-run spread (±16 µs) |
| **two players, the shared layer's own work** per world tick, **idle** (the ball controlled, nothing pending) | median 0.50 µs, p95 0.79 → **0.21 ms per simulated second** |
| **reacting** (an event waiting: the belief balls stepped) | median 4.6 µs, p95 9.0 → **1.33 ms per simulated s** |
| **FREE / CONTESTED** (the claims evaluated) | median 0.88 µs, p95 3.2 → **0.37 ms per simulated s** |
| the launch hook (the snapshot for the beliefs, the events, the judgment), per ball change | median 29 µs, max 0.7 ms |
| the whole world tick, mean over the review cases | OLD 9.3 · SHARED · 0 8.6 · SHORT 16.4 · MEDIUM 15.2 · LONG 26.0 ms per simulated s |

**The shared layer is lightweight.** The whole-tick difference is the football played after the contact, not the layer.

**Finding: a canonical planner inefficiency, not fixed.** With a reaction delay, the carrier chases a loose ball for longer. The canonical controlled-ball planner, when it keeps its running recovery plan ("kept the recovery"), does not restart its 0.3 s refresh clock, so it re-plans **every tick** once the kept plan is 0.3 s old, at ≈ 4 ms per re-plan. In `in-bf` under LONG, 110 of 111 such re-plans adopted nothing.

This exists in the published game too. It only shows when a FREE chase lasts. A fix is a change to the canonical planner (one of those re-plans *did* adopt a new plan), so it is out of scope here. It is listed for integration.

## 15. Collision limitations (§23; `tools/p_overlap.mjs`, `evidence/overlap.txt`)

**No player–player collision exists.** It was measured, never resolved (Milestone 3). The two posed bodies' capsules are those of Tackling V1. Over the 25 review cases, every tick:

| | OLD | SHARED · 0 | SHORT | MEDIUM | LONG |
|---|---|---|---|---|---|
| deepest interpenetration | 29.8 cm | 29.8 | 29.8 | 30.0 | 30.0 |
| ticks deeper than 3 cm (after a tackle contact) | 1,253 (1,149) | 1,214 (1,110) | 1,240 (1,136) | 1,389 (1,285) | **2,030 (1,926)** |
| ball contacts made **through** overlapping bodies | 9 | 9 | 4 | 4 | 7 |

**Where it affects results:**

- **Longer reactions mean longer races.** Both players chase the same loose ball and their bodies pass through each other (LONG: 2,030 ticks).
- **Balls are won through a body.** For example:
  - LONG `in-steer`: the defender's touch through 18 cm of overlap;
  - LONG `steer`: the carrier's touch through 24 cm, and the defender's blind touch through 20 cm;
  - `croq-early`: the tackle through 19 cm.

  With occupancy, one of the two would have been blocked, shielded or fouled.
- **No shielding:** the carrier cannot put his body between the ball and the defender.
- **No shoulder-to-shoulder:** neither player can be pushed off the line to the ball.

So every DEFENDER / ATTACKER RECOVERS above is "who reaches it first through the other", not "who wins the duel".

The Lab shows the overlap live: "BODIES OVERLAP x cm" on the viewport and in the diagnostics.

## 16. Other limitations and open points

- **The opponent probe.** In single-player play, the probe keeps its canonical same-tick handling; Reaction V1 is not applied to it (identity). Whether it should be is an integration decision.
- **A ball-off player's knowledge** of the opponent's ordinary touches is delayed too, but nothing he plans reads it. The tackle's opportunity search reads the real ball: its timing is the user's request, and it must be identical under every candidate.
- **The head look of a reacting carrier** follows his belief (presentation). Rendering of the ball itself is always the real ball.
- **One interval for every event and both players.** No context dependence (a ball in peripheral vision vs straight ahead) and no attributes, by instruction.
- **Several events pending.** A belief re-seeded from a later event's snapshot does not replay the player's own touches made between the two events. This is a documented approximation (rare: two opponent contacts within one reaction time while he is playing the ball).
- **The defender plays a loose ball only through the ball-on rule.** He has no AI, and no action to challenge a ball the carrier controls other than the tackle request.
- **POKE's contact speed is still Tackling V1's provisional guess** (not tuned, by instruction).
- **The canonical refresh inefficiency** (§14).

## 17. Playable

**TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW**, at `http://127.0.0.1:8364/sandbox/visual/possess1_lab.html`. It is **local only**, because the characters are real players' models.

**Cases (25):**

| group | cases |
|---|---|
| the core scenario | the clean contact, the race, the Croqueta win, the walking carry |
| input already given | steering, committed Body Feint, committed Croqueta, a new stick input inside the reaction interval |
| from Standing Tackle V1 | all 21 cases |

Each case is simulated under **all five modes** from identical inputs, and the case list shows each mode's outcome.

**Views:**
- **SINGLE**, **OLD | MODE** (side by side) and **ALL FIVE**;
- 8 cameras; 1× / 0.5× / 0.25×; frame step; loop;
- TACKLE AT PLAYHEAD re-runs every mode.

**Gameplay views:** BALL off, DIAGNOSTICS off (no clutter), BODY ONLY, SKELETON.

**Diagnostics (the selected mode, at the playhead):**
- the ball's authority state, its owner and the reason, and the credible claims (CONTESTED);
- the last world event;
- for each player: ball on or off, knowledge (current, or REACTING with each pending event and when it is perceived), what he believes the ball's possession to be, his plan, his next planned touch, his actual next touch, his continuation;
- the body overlap;
- the full record: transitions, denied claims, contacts, blind touches, perceptions.

**BELIEFS** draws, where a player is still reacting, the ball he still plans (a dashed ring).

**Timeline:** one lane per mode shown:
- the authority over time (carrier, defender, FREE, CONTESTED; dual truth in OLD);
- the tackle contacts and touches;
- the blind touches (○; × for a miss);
- the moments each player perceives (▲).

**Browser check** (`tools/p_browser.cjs`, `evidence/browser/`): **13 / 13** in Chrome. The page equals node in all 25 cases × 5 modes, with 0 console or HTTP errors.

## 18. Files

| file | what |
|---|---|
| `possess1/p_authority.js` | **BallAuthority**: the states, claims, releases, the contact judgment, the labels, the invariants |
| `possess1/p_react.js` | **Perception**: the candidates, the event queue, the belief (snapshot) balls |
| `possess1/p_sim.js` | **SharedSim** (extends the canonical ControlledSim): possession through the authority; knowledge vs physics; blind touches; ball-on / ball-off |
| `possess1/p_world.js` | **SharedWorld**: one ball, the launch hook, perception, the ball-on rule, the tick order, the tracks |
| `possess1/p_run.js` | one encounter under a mode (OLD / NONE / SHORT / MEDIUM / LONG); the emergent outcome classifier |
| `possess1/p_cases.js` · `p_lab.js` · `p_overlap.js` · `../possess1_lab.html` | the review Lab |
| `possess1/tools/` | `p_old_failure`, `p_trace`, `p_identity`, `p_input`, `p_moves_body`, `p_outcomes`, `p_torture`, `p_cpu`, `p_overlap`, `p_blind`, `p_lab_cases`, `p_smoke`, `p_solo_check`, `p_browser.cjs`, `solo/` (the single-player hook) |
| `evidence/` | every output quoted here |

**Not started, by instruction:** Player Occupancy V1, the slide tackle, POKE tuning, any change to the approved attacking moves.

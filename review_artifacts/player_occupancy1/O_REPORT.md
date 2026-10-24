# TOUCHLINE — PLAYER OCCUPANCY V1 — REPORT

**Status: Stage 1 prototype.** Built and tested; not integrated, not frozen, not pushed. Date: 24 Oct 2026.

- **Instruction:** the owner's, saved verbatim in `sources/2026-10-24_user_instruction_player_occupancy_v1.md`.
- **Branch:** `prototype/player-occupancy-v1`, cut from Shared Possession + Reaction V1's last commit `89ab31c6`.
- **Worktree:** `~/Downloads/FC Simulator worktrees/player-occupancy-v1`.
- **Code:** all new, in `sandbox/visual/occupy1/` and `sandbox/visual/occupy1_lab.html`.
- **Canonical files changed: none.** These are all untouched:
  - the published footballer, Body Feint, Croqueta LEG-WAVE V4, carry, gait, Technical Control, Agility and the ball kernel;
  - Standing Tackle V1 (`tackle1/`, POKE untuned);
  - Shared Possession + Reaction V1 (`possess1/`, Reaction MEDIUM 0.200 s).
- **Not done, as instructed:** no Contact Response, no Slide Tackle, no tackle tuning.

## 0. Verified base

| | ref | SHA |
|---|---|---|
| base gameplay milestone | `milestone/feint-croqueta-vocab-v1` | `f775daac` |
| Standing Tackle V1 | `prototype/tackling-integration-v1` (local) | `8c0149ba` |
| Shared Possession + Reaction V1 | `prototype/shared-possession-reaction-v1` (local) | `89ab31c6` |
| left-stick research | `prototype/left-stick-intent-v1` | `6ccd9f9a`, not touched |
| main | `main` | `ff3a89fe`, not touched |

`bl_lock_check.sh` passes.

## The answer, in one paragraph

**Mostly yes, with the conflicts reported rather than hidden.**

- **Ordinary contact.** Two footballers walking, jogging, standing, side by side or crossing no longer pass through each other. OLD's 21.5–23.9 cm becomes 2–6 cm (head-on jog: 13.5 cm, from a swinging thigh).
  - Torso against torso stays under 10 cm in every set (median 1.8 cm), against OLD's 23.9 cm.
- **The ball is no longer won through a body.**
  - The touches and tackle boots that reached it through the opponent are blocked.
  - The loose-ball races OLD won through a body now end on a clear touch: 0 of 159 in the 209 committed tackles, 0 of 139 in the move set, against 11 and 7 in OLD.
- **The approved animations are not corrupted where occupancy only keeps bodies apart.**
  - Standing Tackle's joints are identical (≤ 0.1 mm) in 206 of 206 tackles until the ball or the carrier first differs.
  - A Body Feint or Croqueta entered from the same state is identical in 188 of 194 windows that occupancy did not touch. The other 6 differ by ≤ 1.3 mm in one foot.
  - No move or tackle is cancelled by a body correction.
- **What does not work yet: two committed actions colliding** (a Croqueta or Body Feint into a committed tackle).
  - Moving the roots apart there splays the legs over planted feet. V1 limits that (18 cm per planted stance) and reports the rest: up to 23 cm in the worst case (bf-fake).
  - That case, fast limb swings and the root jolts are what Stage 2's contact response has to own.

## 1. The old failure (§1)

**Tool:** `tools/o_old.mjs`, `evidence/old_cases.*`.

- **What it measures.** Shared Possession + Reaction V1 (MEDIUM), on the occupancy volumes of the bodies as drawn, live at every tick (the review cases).
- **Every case where the bodies meet passes them through each other: 21.5–23.9 cm**, the full depth of a pelvis or thigh.
  - The only exception is the sharp cut: a clean miss, where the bodies never meet.

| case | deepest (OLD) | where | ticks > 5 cm | ball contacts through the opponent's body |
|---|---|---|---|---|
| static blocker (walk) | 22.1 cm | pelvis ↔ pelvis | 135 | carrier's touch through the thigh, 7 cm |
| head-on walk | 23.9 cm | pelvis ↔ pelvis | 78 | — |
| head-on jog | 22.9 cm | thigh ↔ thigh | 40 | — |
| face to face | 22.8 cm | pelvis ↔ pelvis | 92 | carrier's touch through the thigh, 10 cm |
| side by side | 23.5 cm | pelvis ↔ thigh | 787 | three touches: through the thigh 9 cm, the pelvis 17 cm, the thigh 18 cm |
| crossing paths | 23.5 cm | thigh ↔ pelvis | 47 | carrier's touch through the thigh, 18 cm |
| the race | 23.5 cm | pelvis ↔ thigh | 165 | defender's touch through the thigh, 8 cm |
| steering into the tackle | 23.3 cm | pelvis ↔ thigh | 232 | defender's touch through the pelvis, 15 cm |
| Body Feint, the fake | 22.9 cm | chest ↔ chest | 80 | — |
| Croqueta as the tackle starts | 22.7 cm | thigh ↔ thigh | 79 | — |

- **The 209 committed Standing Tackles** (Shared V1's search set):
  - 42 ball contacts were made with the leg more than 5 cm inside the opponent's body (in 32 runs).
  - Of the 159 loose-ball races (control broken by the tackle, then re-established), 141 had the bodies more than 5 cm inside each other between the break and the re-establishment.
  - **11 were won by a touch through a body**, 5 more were ambiguous (2–5 cm), and only 16 races were clean.
- **The Body Feint / Croqueta set** (352 encounters):
  - 52 contacts through a body;
  - 127 of 137 races body-phased, 7 won through a body.

## 2. Occupancy representation (§2)

**Code:** `occupy1/o_volumes.js`. **Measurement:** `tools/o_geometry.mjs`, `evidence/geometry.txt`.

Each body is eleven **capsules** (a segment swept by a radius), rebuilt every tick from the real posed joints, so the volumes are the animated body and not a cylinder.

| volume | built from | radius | size it gives | the mesh (vinicius) |
|---|---|---|---|---|
| PELVIS | across the hip joints; centre 4.5 cm below them and 1.7 cm back; half-length 7 cm | 0.12 | ±0.19 wide, ±0.12 deep, 0.76–1.0 m high | hips ±0.18–0.20, −0.14…+0.105 deep, 0.78–0.975 m |
| WAIST | the spine bone | 0.10 | | ±0.13 wide, ±0.09 deep at 1.0–1.1 m |
| CHEST | across the shoulders (the upper arms' axis), 38 % up the chest bone; half-length 8.5 cm | 0.115 | ±0.20 wide, ±0.115 deep | ±0.16–0.21, ±0.11–0.12 at 1.2–1.45 m |
| THIGH ×2 | hip → knee | 0.115 | | 75th percentile of the thigh's flesh |
| SHIN ×2 | knee → ankle | 0.07 | | 75th percentile |
| FOOT ×2 | ankle → ball of foot | 0.07 | **detected only** | |
| UPPER ARM ×2 | shoulder → elbow | 0.07 | **detected only** | |

- **Why the 75th percentile.** It is the solid core of each limb. The outer quarter is soft tissue that the contact tolerance lets two bodies press into.
- **Six characters measured.** The other five (cucurella, gabriel, osimhen, szoboszlai, james) are within ±10 % of vinicius, the rig every fixture uses.
- **Why feet and upper arms are only detected.**
  - A boot meets a boot at the ball: a legitimate clash, and Stage 3's business.
  - Swinging arms pass each other.
  - Resolving either would push bodies apart that are not touching, which is a force field.
- **Head and forearms are not modelled.** They do not decide whether two bodies pass through each other.
- **Thresholds, from the same measurement:**
  - **CONTACT TOLERANCE 2 cm.** The outer flesh of two limbs (75th → 90th percentile, about 1.2 cm each) may meet and compress.
  - **HARD LIMIT 5 cm.** Beyond it, more than half of the two cross-sections overlap (75th → 50th percentile, about 2.6 cm each). That is anatomically impossible.

## 3. Contact detection (§3, §4, §18, §22)

- **Broad phase.** The two roots' distance. Under 1.9 m the pass runs; above it nothing is evaluated (one distance test).
- **Narrow phase.**
  - Both bodies are posed live at the tick just simulated (PlayBody, the drawn body).
  - All 11 × 11 = 121 capsule pairs are tested: the closest points of the two segments (Ericson), then gap = distance − r₁ − r₂.
- **The manifold, for every pair within reach:**
  - the gap (negative = penetration);
  - the separating direction, 3-D and its horizontal part (from the defender's volume toward the carrier's);
  - the contact point;
  - both segment parameters;
  - the regions;
  - whether both volumes are resolved.
- **Detection moves nothing.** It is the manifold Stage 2's contact response will read.
- **Groups reported:** TORSO/PELVIS (trunk against trunk), LEGS (any resolved pair with a thigh or shin), FEET, ARMS.
- **Every tick's live poses are recorded** (`W.frames`). The statistics are measured on them, and the Lab draws them.

## 4. Penetration resolution (§3, §5, §19, §20)

**Code:** `o_world.js` `occupancy()`.

1. **The constraints.**
   - Every resolved pair closer than 8 cm asks for its gap to stay above −2 cm.
   - A closing gap is approached smoothly: each tick it may close at most 15 % of what is left to the tolerance.
   - A pair already deeper is pushed out at 0.6 cm per tick.
   - A pair with a leg (limbs swing far faster than a body may be pushed) is corrected gently within the 5 cm hard limit and firmly beyond it.
2. **Effectiveness.** A root shift moves the trunk fully, a planted knee half and a planted ankle not at all; a swinging foot follows its moved foothold.
   - A pair the roots can reach only partly pushes gently (≤ 1.2 cm per tick).
   - A pair the roots cannot reach at all (planted lower leg against planted lower leg) is a **LEG CONFLICT**: reported, never pushed.
3. **The minimum correction.** One 2-D minimum-norm problem over all the pairs at once: the smallest relative root correction satisfying every constraint (single projections and pairwise vertices; a least-squares compromise when contacts oppose). It is capped at 3 cm per tick. The manifold is deterministic, with no alternating between pairs.
4. **The split** (§19 — kinematics, never strength or mass):
   - share ∝ (approach speed into the other + 0.25 m/s) / (1 + planted feet);
   - a **still** player (both feet planted, under 0.15 m/s) takes none while the other can give way;
   - a **committed** action takes none, and the other gives way;
   - **both committed** is a **CONFLICT**: split by the kinematics, root only, counted and reported.
5. **Application** (`shiftPlan`). The correction moves the root path from this tick on, and with it the future footholds, their swings' technique frames and the contact aims.
   - A planted foot never moves.
   - Joint animation is never edited: the drawn body follows its root. Shifting a live plan by 10 cm moves the pelvis, chest and head exactly 10 cm, while the planted toes stay and the knees take it.
6. **The soft wall** (`softWall`). This replaces the earlier half-plane wall, which was a force field (see §10).
   - Within 30 cm, the two players' *planned* root paths are read relative to each other.
   - **First, the free relative path.** If it never comes closer than the closest pair's two radii (they would not touch), the wall does nothing at all.
   - **Otherwise** the path is walked against a virtual disk fitted to the closest pair (its two radii plus the gap), which shrinks to the tolerance exponentially (τ = 0.06 s).
   - A head-on path decelerates into the contact; a passing, near-missing or side-by-side path is untouched.
   - The wall only ever **removes** a player's own velocity toward the other. It never gives velocity: no momentum (see §5).
   - A plan that holds a **Body Feint or Croqueta still ahead** is cut only before the move's commitment. From the commitment on, the correction is held: the move is *placed*, never reshaped.
7. **Footholds** (ordinary gait only; a committed action's footholds — and a planned Body Feint's or Croqueta's, from the step that sets it up — are its own):
   - a landing that would come down within 12 cm of the opponent's planted ankle is moved clear;
   - a swing whose path would cross the opponent's legs is shortened (never below 10 cm).
8. **Unresolved.** A tick still beyond 5 cm is classified with the reason root placement cannot fix it: BOTH COMMITTED · PLANTED LEGS · PLANTED SUPPORT · COMMITTED ACTION'S LIMB · AUTHORED / BALL-ANCHORED LIMB PATH.

## 5. Support / commitment (§7, §8)

- **Planted feet.** A planted stance is never moved, so there is no plant slide by construction.
- **The support budget.** Over one stance the root may move at most **18 cm** from where that stance found it: the body leans over its support and never splays its legs.
  - What one player's support cannot take goes to the other, if he may be moved and his own support allows.
  - What neither can take stays as overlap, reported **UNRESOLVED · PLANTED SUPPORT**.
  - Without the budget, a both-committed conflict pushed a Croqueta's root 74 cm in 0.2 s over a planted foot, and the leg was 36 cm off its authored place.
- **Commitment.**
  - A Standing Tackle while it owns the body, or a Body Feint / Croqueta between its commitment and its release, is never moved, never cancelled, and its footholds are never touched.
  - A Body Feint / Croqueta already planned but not yet committed is protected too: corrections before its commitment move it as a whole, its steps are never moved.
  - Found by the body check: a 4.4 cm wall cut just before a Croqueta's commitment had bent its later steps by 24 cm.
  - The other player gives way.
  - When both are committed it is a conflict: both roots move within their support budgets, it is counted, and the residue is reported.
- **Still players.** A standing blocker is not displaced by someone walking into him; displacement is Stage 2. The walker is stopped.
- **No momentum.** Occupancy never writes a velocity into a plan.
  - It did once: a standing player slid aside by a committed Croqueta had the slide written into his plan's velocity.
  - His next re-plan carried on with that velocity and turned him 130° to face it, feet planted and legs crossed.
  - Fixed: the wall now only removes a player's own approach.

## 6. Ball access (§9, §23)

- **The record.** Every near tick, each player's playing legs (foot, shin, thigh) are tested against the opponent's resolved body (pelvis, waist, chest, thighs, shins), and the deepest reach is kept for 0.1 s.
- **The gates.**
  - A **touch** whose leg was more than 5 cm inside the opponent at the contact, or in the 0.1 s before it, is **BLOCKED**: the canonical miss (no impulse; the player re-plans as after any miss).
  - The **tackle's boot** in the same state gives **no impulse** (`TACKLE BOOT BLOCKED`).
- **What stays allowed.**
  - Reaching *around* a body.
  - Boots meeting at the ball: the opponent's feet are excluded.
  - A leg 2–5 cm in, within the tolerance.
- **The ball is never a player collision body** (§23). It interacts only through the canonical touches and the tackle's contact spheres, exactly as before.

## 7. Standing Tackle results (§12) — the same 209 committed tackles, no tackle tuning

**Tool:** `tools/o_tackle.mjs --set search`, `evidence/tackle_search.*`. It runs Shared V1's exact 1500 runs (100 set-ups × 15 request times, seed 7) at MEDIUM, with identical inputs and POKE untuned.

| outcome | OLD | OCCUPANCY V1 |
|---|---|---|
| MISS | 47 | 45 |
| CONTACT — ATTACKER RETAINS | 3 | 5 |
| CONTACT — ATTACKER RECOVERS | 141 | 150 |
| CONTACT — DEFENDER RECOVERS | 18 | 9 |
| CONTACT — BALL FREE | 0 | 0 |

**23 outcomes changed, every one with a body reason:**
- **20 × the OLD race was won through a body** (bodies 20–24 cm inside each other between the break and the re-establishment).
  - 15 DEFENDER RECOVERS → ATTACKER RECOVERS: the defender reached the ball by passing through the carrier.
  - 5 the other way.
- **2 × a touch through the opponent's body was blocked** (MISS → ATTACKER RETAINS): the carrier's touch had gone through the defender's thigh, 7 cm.
- **1 × the tackle's boot reached the ball only through the carrier's body** and was given no impulse.

Across the 209 runs:
- 47 touches and 12 boots were blocked by the access gates.
- **0 ball contacts were made through a body**, against OLD's 42.

**The tackle body (§31)** (`tools/o_bodycheck.mjs --set search`, `evidence/body_search.txt`):
- **Committed identically: 206 of 209.**
  - The other 3 are one set-up (#47 @ 0.8 / 0.9 / 1.0): the bodies had been kept apart before the request, so the tackle committed 0.008 s later. It is still a STANDING_LUNGE.
  - It owns the body as long in 205 of 206, with the same phases in 206.
- **LOCAL POSE DIFFERENCE** (every joint relative to the defender's root, from the commitment until the ball or the carrier first differs, 18,132 ticks): **identical (≤ 0.1 mm) in 206 of 206.**
- **WORLD ROOT DIFFERENCE** over the same span: **identical in 206 of 206.**
- After that tick the tackle legitimately differs, because its boot and its look are anchored to the ball and the carrier, which occupancy kept clear.
- **The move set's 181 committed tackles** (`evidence/body_moves.txt`):
  - 180 committed identically; same phases 180; owning the body as long 178.
  - Local pose identical in 175 of 180. In the other 5 the largest difference is 0.30 cm (upper body) and 1.62 cm (legs), where occupancy moved the defender's root in a both-committed conflict, plus 0.02 cm in two at a conflict tick.
  - World root identical in 175 of 180, max 1.62 cm.
- **Review cases:** 16 of 16 identical, local and world.

## 8. Loose-ball results (§11)

Each race is classified from the bodies as drawn between the tackle's break and the re-establishing touch:
- **LEGITIMATE** — never deeper than 2 cm;
- **AMBIGUOUS** — 2–5 cm, or the establishing touch with the leg 2–5 cm in;
- **BODY-PHASED** — more than 5 cm, or the ball reached through him.

| set | races (OLD) | legitimate / ambiguous / body-phased | establishing touch THROUGH a body | under OCCUPANCY V1 |
|---|---|---|---|---|
| 209 committed tackles | 159 | 16 / 2 / 141 | **11** (+5 ambiguous) | 159 races: establishing touch **through a body 0**, all clear |
| Body Feint / Croqueta set | 137 | 8 / 2 / 127 | **7** (+1 ambiguous) | 139 races: **through a body 0** (1 ambiguous) |

- **Which OLD recoveries were caused by phasing.**
  - Of the 141 body-phased OLD races in the search set, occupancy changes the outcome of **21**: 15 DEFENDER → ATTACKER, 6 ATTACKER → DEFENDER.
  - It keeps all 18 legitimate or ambiguous ones.
  - In the move set it changes 10 of 127 body-phased races and keeps all 10 legitimate or ambiguous ones.
  - The other body-phased races were won by the same player either way. The bodies overlapped, but the ball went to whoever was nearer.
- **Occupancy's own races still show depth.** 65 (search) and 56 (moves) have more than 5 cm somewhere between the break and the establishment: median 4.2 cm, p90 14.6 cm.
  - This is mostly the committed tackle's extended leg inside the carrier's legs (the tackle cannot be moved: COMMITTED ACTION'S LIMB, 551 ticks), and the conflicts.
  - **None of them ended with a touch through a body.**

## 9. Body Feint (§13)

**Tools:** `o_bodycheck.mjs`, `o_tackle.mjs --set moves`; `evidence/body_*.txt`, `tackle_moves.txt`. The move set is the curated FAKE LEFT → RIGHT and Croqueta REF · JOG R → L × the defender ahead 2.4–4.2 m at ±0.5 / ±1.0 m × requests 0–1.0 s: 352 encounters, 181 committed tackles.

- **Never cancelled by occupancy.**
  - Every Body Feint committed in OLD is committed at the same tick under occupancy.
  - Of those carried to their release in OLD, one is not under occupancy (FAKE 3.6 / 0.5 @ 0.8): when the tackle contact is perceived, its re-plan takes the canonical fallback (CARRY) instead of continuing, because the bodies had been kept apart.
- **The approved local motion is unchanged.**
  - Moves entered from the same state, with no occupancy action on the carrier in the window: the local pose is identical (every joint ≤ 0.1 mm) in 188 of 194 windows, Body Feint and Croqueta together. The 6 others are Croquetas, ≤ 1.3 mm in one foot.
  - All 36 windows in the search set are identical.
  - The approved motions themselves are byte-identical to their review builds: the milestone regression (`reproduction_vs_feint2ef`, `reproduction_vs_croqlw`) is **SAME**.
- **Where occupancy moves him (68 windows, every one a conflict).**
  - This happens only when the tackle is committed as well.
  - The root moves (world root up to 69.7 cm over a window; at most 18 cm within any planted stance).
  - The pose relative to that root changes up to 7.5 cm (trunk), 22.8 cm (head / arms) and 51.6 cm (feet): the legs reconcile a moved root with planted feet.
  - **This is the conflict cost, reported** (§16, owner decision 1).
- **Interaction.**
  - Body Feint into a standing player (bf-into): 23.4 → 3.5 cm.
  - The feint past the tackle (in-bf): 22.6 → 3.8 cm, attacker recovers either way.
  - Its exit against the tackle (bf-exit): 21.8 → 7.0 cm.
  - The fake into the tackle's recovery (bf-fake): **23.0 cm**, both committed. Neither may move beyond its support budget, so this is reported UNRESOLVED (§16).

## 10. Croqueta (§14)

- **LEG-WAVE V4 is unchanged.**
  - The same local-pose proof as §9: 188 of 194 identical, the rest ≤ 1.3 mm in one foot.
  - `reproduction_vs_croqlw` (Croqueta LEG-WAVE V4 ≡ its review build, every joint and the ball, every tick) is **SAME**.
  - A Croqueta still ahead in a plan is never reshaped. The body check found a 4.4 cm wall cut just before a Croqueta's commitment bending its later steps by 24 cm; fixed.
- **Never cancelled by a correction.** 6 Croquetas carried in OLD end early under occupancy:
  - **3 (CROQUETA 2.4 / −1 @ 0.3–0.5): its own touch went through the defender's body and was BLOCKED.** That is ball access (§9) against commitment (§7). V1 lets ball access win: the touch is the canonical miss, and the canonical re-plan ends the move. Reported; owner decision 4.
  - 3 (CROQUETA 3 / −0.5 @ 0.0–0.2): the re-plan at the tackle contact takes the canonical fallback, because the bodies had been kept apart.
- **Interaction.**
  - Croqueta past a standing player (croq-close): 22.2 → 10.4 cm.
  - The miss (croq): 21.5 → 2.6 cm.
  - Into a committed tackle (croq-win, in-croq, croq-early): 12.7 / 18.6 / 14.2 cm, BOTH COMMITTED (§16).

## 11. Penetration statistics (§28)

**Tool:** `tools/o_sets.mjs`, `evidence/sets_*.txt`. Every tick of every run is measured on the bodies as drawn; the statistics count the ticks in which that group penetrates at all. Values in cm.

| set | group | OLD median | p95 | p99 | max | OLD ticks > 5 cm | **V1 median** | **p95** | **p99** | **max** | **V1 ticks > 5 cm** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| review cases (30) | TORSO / PELVIS | 15.7 | 21.6 | 22.7 | 23.9 | 1804 | **1.9** | **8.0** | **9.1** | **9.8** | **13** |
| | LEGS | 13.2 | 23.0 | 23.4 | 23.5 | 3793 | **2.2** | **13.5** | **20.9** | **23.0** | **404** |
| | FEET (detected only) | 5.7 | 13.4 | 14.0 | 14.0 | 1295 | 4.1 | 12.3 | 13.7 | 14.0 | 631 |
| | ARMS (detected only) | 10.0 | 17.3 | 18.1 | 18.5 | 3702 | 6.9 | 12.2 | 13.3 | 17.2 | 1934 |
| 209 committed tackles | TORSO / PELVIS | 8.7 | 20.5 | 22.6 | 23.9 | 3354 | **1.8** | **6.0** | **8.5** | **10.3** | **10** |
| | LEGS | 11.3 | 21.8 | 22.8 | 23.5 | 10508 | **2.2** | **12.2** | **17.4** | **23.0** | **1324** |
| | FEET | 6.3 | 13.2 | 13.9 | 16.3 | 4729 | 5.4 | 12.7 | 13.8 | 18.0 | 3737 |
| | ARMS | 8.0 | 16.2 | 17.8 | 18.5 | 7739 | 5.8 | 13.2 | 16.2 | 18.4 | 3023 |
| move set (352) | TORSO / PELVIS | 8.9 | 21.6 | 23.2 | 23.9 | 3535 | **1.8** | **8.0** | **9.1** | **9.8** | **41** |
| | LEGS | 10.5 | 21.3 | 22.7 | 23.5 | 12763 | **2.3** | **12.8** | **20.0** | **23.0** | **1927** |
| | FEET | 5.8 | 13.1 | 13.8 | 17.2 | 5865 | 5.6 | 13.1 | 13.8 | 14.0 | 5048 |
| | ARMS | 8.0 | 16.2 | 17.9 | 18.5 | 8784 | 5.5 | 12.9 | 14.1 | 18.3 | 3688 |
| torture (10.7 min / mode) | resolved (trunk + legs) | | | | 23.5 | 2491 (59.4 per 1000 near ticks) | | | | 23.0 | **431 (7.4 per 1000)** |

- **What occupancy resolves (torso, pelvis, legs):**
  - the median falls to about 2 cm (within the tolerance);
  - ticks beyond 5 cm fall by 85–99 %;
  - **in the three case sets, torso against torso never exceeds 10.3 cm** (OLD 23.9).
- **The LEGS maximum stays 23 cm** in a handful of ticks. These are the both-committed conflicts and the fast limb swings (§16).
- **Feet and arms are detected only**, so their numbers barely move. A boot against a boot at the ball and swinging arms are not occupancy's to separate (§2).

## 12. Continuity (§8, §10, §20, §21, §22)

**Tools:** `o_continuity.mjs`, `o_snap.mjs`, `o_support.mjs`, `o_deadlock.mjs`, `o_nearmiss.mjs`, `o_tradeoff.mjs`; `evidence/continuity.txt`, `snaps.txt`, `support.txt`, `deadlock.txt`, `nearmiss.txt`, `schedule_tradeoff.txt`.

**The bodies as drawn, the 30 review cases** (Tackling V1's thresholds):

| | OLD carrier | V1 carrier | OLD defender | V1 defender |
|---|---|---|---|---|
| root snaps (acceleration > 100 m/s² in one tick) | 1 | **662** | 0 | **446** |
| pelvis jumps (> 2 cm / tick) | 873 | 923 | 952 | 757 |
| foot jumps (> 5 cm / tick) | 924 | 1086 | 332 | 576 |
| knee pops (> 6° / tick) | 1533 | 1553 | 703 | 822 |
| **plant slides** (a planted ball of foot > 3 cm in one stance) | 307 | **308** | 189 | **186** |
| legs crossed (ticks) | 401 | 261 | 0 | **74** |

- **No new plant slides.** A planted stance is never moved.
  - Torture: 15.4 → 13.9 slides per 1000 near ticks.
  - The largest root correction within one planted stance is **18.0 cm**, the support budget, by construction.
- **No ping-pong.**
  - The manifold is solved at once (one minimum-norm problem), so there is no alternating between pairs (§22).
  - 6 correction reversals on consecutive ticks in 30 cases; 5 in 10.7 minutes of torture.
- **Root jolts are the visible cost** (§28 "no visible solver jitter").
  - Corrections are applied at once, at up to 3 cm per tick.
  - Frames whose root second difference exceeds 1 cm per 1/60 s: OLD 40 → V1 323 in 14 cases (227 from position corrections, 39 from the soft wall, 35 canonical).
  - The largest jolt is 12–15 cm per frame², a visible jolt.
  - They are not jitter (no oscillation). They are each contact's push, delivered in a few ticks.
- **The schedule trade-off, measured and not adopted** (`schedule_tradeoff.txt`, 16 cases; ticks > 5 cm vs smoothness):

| setting | ticks > 5 cm | 2nd-difference p99 / max (mm per frame²) | frames > 1 cm |
|---|---|---|---|
| **V1 (adopted)** | **286** | **35.7 / 116** | **370** |
| look-ahead 2 ticks | 226 | 37.0 / 116 | 401 |
| look-ahead 4 ticks | 241 | 39.3 / 115 | 361 |
| jerk limit 0.4 cm / tick² | 514 | 50.3 / 98 | 523 |
| jerk limit 0.2 cm / tick² | 552 | 32.0 / 112 | 529 |
| leg cap 1.5 cm / tick | 329 | 37.9 / 113 | 394 |
| leg tier always at 0.6 cm / tick | 845 | **19.6** / 126 | 297 |
| rMax 2 + leg 1 + jerk 0.2 | 627 | 29.3 / **79** | 462 |
| no support budget | **121** | 32.4 / 100 | 358 |
| support budget 12 cm | 338 | 36.4 / 114 | 377 |
| support budget 25 cm | 179 | 35.5 / 99 | 347 |
| soft wall ungated | 310 | 36.5 / 112 | 356 |
| soft wall gate +3 cm | 313 | 37.9 / 112 | 358 |

  - Every smoothing schedule deepens penetration more than it smooths.
  - "No support budget" is the deepest-free setting, but it splays legs across planted feet (§5).
  - Look-ahead is a small win in depth at a continuity cost; it is not adopted in V1.

**No invisible force field (§10).** 64 passes swept across lateral offsets (`nearmiss.txt`): past a standing player, head-on passes (walk, jog), crossing behind.

| OLD's closest approach (resolved volumes) | passes | identical to OLD every tick | largest root deviation |
|---|---|---|---|
| apart (> 30 cm) | 5 | **5** | 0 |
| near miss 5–30 cm | 22 | **22** | 0 |
| near miss 0–5 cm | 6 | 4 | 10.5 cm |
| touching (within 2 cm) | 3 | 1 | 7.3 cm |
| overlapping in OLD | 28 | 0 (occupancy needed) | — |

- **Why the earlier wall was a force field.** It was a half-plane over the whole future path.
  - It deflected a carrier 26 cm at a 0.6 m side-by-side start.
  - It also slowed players running side by side, because it read the absolute paths.
  - The relative virtual-disk wall that replaced it acts only when the free relative paths would touch.
- **What remains.**
  - Two passes within 5 cm and two touching ones are moved (up to 10.5 cm).
  - The position constraint's rate limit acts on a limb closing faster than 15 % of its gap per tick within 8 cm.

**Stand-alone checks:**
- **Side by side (§15):** 23.5 cm and 787 ticks > 5 cm in OLD (three touches through the defender) → 3.5 cm, 0 ticks.
- **Head-on (§16):** walk 23.9 → 3.4 cm; jog 22.9 → 13.5 cm (a swinging thigh, unresolved: §16).
- **Static blocker (§17):** walk 22.1 → 3.2 cm, jog 22.8 → 5.8 cm. The still blocker is never displaced.

**No deadlock (§21)** (`deadlock.txt`, contact intervals within the tolerance):

| stress case | OLD in contact | V1 in contact | contact after the inputs diverge |
|---|---|---|---|
| head-on walk | 0.43 s | 0.33 s | — |
| head-on jog | 0.19 s | 0.15 s | — |
| side by side | 3.59 s (one 3.48 s overlap) | 1.38 s in 8 short touches (≤ 0.35 s) | — |
| crossing paths | 0.23 s | 0.34 s | — |
| one turning away at 1.6 s | 0.41 s | 0.44 s | **0.171 s** |
| both turning away at 1.6 s | 0.40 s | 0.30 s | **0.029 s** |
| one committed (Body Feint into a standing player) | 0.34 s | 0.45 s | — |
| both committed (Croqueta into a committed tackle) | 0.42 s | 0.38 s | — |

- Every pair is apart again at the end.
- Torture: 0 cases of a carrier stuck in contact more than 1.5 s while steering away (the longest 0.35 s).

## 13. Regression (§29, §30)

**Single player (§29)** — occupancy does nothing:
- **`tools/o_solo.mjs`:** every curated canonical case (105, 127,092 ticks) in the occupancy world, the other player parked 40 m away, occupancy ON vs OFF.
  - **Identical every tick in 105 of 105** (root, heading, plan fingerprint, contacts, ball, authority).
  - The occupancy pass never evaluated a pair.
- **The milestone's own runner** (`review_artifacts/tackling_integration1/tools/milestone_regress.mjs`, through possess1's solo hook, compared line by line with the evidence at `f775daac`) — `evidence/milestone_regress.txt`:

| suite | result |
|---|---|
| reproduction_vs_croqlw (Croqueta LEG-WAVE V4 + Body Feint ≡ review builds) | **SAME** |
| reproduction_vs_feint2ef (Body Feint ≡ feint2ef) | **SAME** |
| lab_cases | **SAME** |
| chains (7 × mirror, twice) | **SAME** |
| bf_sweep_right_footed | **SAME** |
| croq_sweep | **SAME** |
| regression/cases (122 curated) | **SAME** |
| regression/battery | **SAME** |
| regression/determinism (18 seeds × 30 s ×2 + re-simulated) | **SAME** |
| regression/torture_page_40 (40 seeds × 60 s) | **SAME** |

**ALL 10 SUITES IDENTICAL.**

**Identity** (`o_identity.mjs`, `evidence/identity.txt`, the review cases plus 20 set-ups × 15 requests):
- OLD with the bodies recorded ≡ Shared Possession + Reaction V1, the whole run: **330 of 330**.
- V1 ≡ OLD until occupancy's first action: **84 of 84**.
- Runs where it never acts: identical for the whole run, **246 of 246**.

**Two players (§30)**:
- **Shared V1's own possession torture**, run unchanged through `two/o_two_hook.mjs` with OccupancyWorld (60 trials × 4 reaction modes × 2 runs + counterfactual), `evidence/two_player_possession.txt`. All of these are **0** in every mode:
  - dual ownership;
  - unaware owner;
  - stale owner;
  - ownership chatter;
  - A → B → A;
  - possession without a touch;
  - control granted blind;
  - reaction timer never resolved;
  - an event perceived twice;
  - nondeterministic.
- **"New information used early."** That check compares the attacker's root *and* decisions with his counterfactual, and flags 26 / 30 / 30 runs. **`tools/o_early.mjs`** (`evidence/two_player_early_info.txt`) splits it:
  - **his decisions never differ** (plan, action, reason, contacts, skill): 0 / 0 / 0;
  - apart from 3 + 3 where his touch was **BLOCKED by the defender's body** (ball access, not information);
  - **his root differs only while occupancy is keeping the bodies apart** (26 / 30 / 30, with occupancy acting on him in the window); **0** without it.

## 14. Torture / determinism (§32)

**Tool:** `tools/o_torture.mjs`, `evidence/torture.*`. 16 seeded runs × 40 s = **10.7 simulated minutes per mode**.
- **The carrier** turns at random, makes rapid turns of 120–180°, and plays Body Feints and Croquetas (59 entered).
- **The scripted defender** chases, crosses, runs side by side, comes head-on, turns away (separating and meeting again), races for the free ball, and asks for Standing Tackles (41 tackle contacts).
- **Every occupancy run is made twice.**

| | OLD | V1 |
|---|---|---|
| ticks with the roots within 1.9 m | 41,942 | 58,186 |
| ticks > 5 cm / > 10 cm | 2,491 / 1,928 | **431 / 204** |
| per 1000 near ticks > 5 cm | 59.4 | **7.4** |
| the deepest | 23.5 cm | 23.0 cm |
| **ball contacts through a body** | **19** | **1** |
| ownership errors (dual, unaware, stale, without a touch, blind, chatter) | 0 | **0** |
| stuck (contact > 1.5 s while steering away) | 0 | **0** |
| root drift (a correction with nothing within 8 cm) | 0 | **0** |
| plant slides per 1000 near ticks | 15.4 | 13.9 |
| legs crossed per 1000 near ticks | 14.5 | **16.5** |
| jitter: frames with a root 2nd difference > 1 cm | 600 | **1,211** |
| explosive: ticks with a root acceleration > 100 m/s² | 7 | **956** (the largest correction 3 cm in a tick) |
| correction reversals on consecutive ticks | 0 | 5 |
| **NON-DETERMINISTIC runs** | | **0 of 16** |

- **Unresolved ticks under occupancy, by reason:** COMMITTED ACTION'S LIMB 162 · PLANTED SUPPORT 110 · AUTHORED / BALL-ANCHORED LIMB PATH 63 · BOTH COMMITTED 59 · PLANTED LEGS 37. There were 97 conflict ticks; 14 touches or boots were blocked.
- **The one contact through a body:** the leg entered more than 5 cm in the very tick of the touch. The gate reads the legs' record up to the previous tick (§16).

## 15. Performance (§33)

**Tool:** `tools/o_perf.mjs`, `evidence/performance.txt`. 30 review cases × 3 repetitions, node 22, one core, run alone.

| | mean | p99 |
|---|---|---|
| the world's step, OLD | 45.8 µs | 368 µs |
| the world's step, V1 | 111.9 µs | 635 µs |
| occupancy IDLE (roots beyond 1.9 m) | one distance test | (the whole step: 27 µs) |
| occupancy NEAR (posed, detected, nothing to resolve) | **151 µs** | 433 µs |
| occupancy ACTIVE (a correction applied) | **215 µs** | 534 µs |
| — of a near / active pass: posing both bodies live | 125 µs | |
| — the soft wall's relative path | 10.7 µs | |
| — shifting the plans | 7.6 µs | |
| — footholds + swing paths | 2.8 µs | |
| — volumes of two bodies | 0.9 µs | |
| ball-access record (4 legs tested per near tick) | 7.4 µs | |
| ball-access gate at a contact | < 0.1 µs | |

- **Per simulated second** in these cases (35 % of ticks near): occupancy ≈ **14.4 ms**, of which posing is ≈ 10.5 ms. A game poses the bodies for rendering anyway.
- **Per 60 Hz frame**, at worst (both players near every tick): **0.7 ms** mean, 2.0 ms p99.
- **Correctness came first.** The posing (83 % of the cost) is the place to save: reuse the render pose, and pose at the sim rate only the players in a near pair.

### Scaling to 22 players (discussed, not built)

- **Broad phase.** V1 has one pair: the roots' distance.
  - 22 players make 231 pairs. Even all-to-all, the root distance tests cost about 231 × 10 ns per tick, which is negligible.
  - The cost is in the narrow phase, and it must run only for pairs within 1.9 m.
  - The right broad phase is a **uniform grid** over the pitch (2 m cells, 22 roots inserted per tick, test the 3 × 3 neighbourhood) or **sort-and-sweep** on x. Both are O(N) with a few near pairs: about 0–6 in open play, up to about 30 at a corner.
- **Posing.**
  - V1 poses both bodies at 240 Hz for occupancy whenever they are near.
  - In a game every player is posed for rendering anyway, but at 60 Hz.
  - Integration should pose at the sim rate **only the players in a near pair**, reuse the render pose otherwise, and never pose a player twice in a tick.
- **The narrow phase per near pair:** 11 + 11 volumes from the pose, 121 capsule tests, and the 2-D minimum-norm solve.
- **Clusters.**
  - With three or more players in contact (a challenge with a second defender, a crowded box), the pairwise solve must become a **contact island**: each player's root correction solved jointly over all his pairs.
  - The method: projected Gauss-Seidel over the pair constraints, with the same kinematic shares, support budgets and commitment rules, in a deterministic order (by player id).
  - V1's single pair is the island of size two.
- **Ball access** is per player and per contact, so it scales with the touches, not the players.

## 16. Known limitations — and what Stage 2 must own (§34)

1. **Two committed actions colliding.**
   - The cases: a Body Feint into a tackle's recovery (bf-fake, **23.0 cm**), a Croqueta into a committed tackle (in-croq 18.6 cm, its mirror 22.4 cm, croq-early 14.2, croq-win 12.7).
   - Neither authored action may be bent, and each root may move only 18 cm over a planted stance. The rest is reported **UNRESOLVED · BOTH COMMITTED / PLANTED SUPPORT**.
   - *Stage 2 must decide who yields* (a stumble, a shoulder contest, a loss of balance). Root placement cannot.
2. **Fast limb swings.**
   - A swinging thigh or shin can close 5–8 m/s on the other's leg.
   - A root may not be pushed that fast without visible jolts (V1's cap is 3 cm per tick), so a limb can be 5–15 cm into the other's leg for 0.02–0.06 s. Head-on jog: 13.5 cm, 13 ticks.
   - *Stage 2 needs limb-level contact response* (the swing stopped or deflected by the leg it meets).
3. **Pose discontinuities in the canonical animation.**
   - In-steer: the defender's thigh jumps 7.8 cm in one tick while he is airborne, and lands 16.9 cm inside the carrier's thigh.
   - No root correction can follow a one-tick pose jump.
4. **A carrier walking into a committed tackle** (carry-walk, 13.3 cm).
   - The tackle is not moved, and the carrier's support budget is spent within his stance.
5. **Root jolts.**
   - The corrections are position pushes of up to 3 cm per tick: 323 frames over 1 cm per frame² in 14 cases, against OLD's 40.
   - Smoothing them costs depth (§12).
   - *Stage 2 (momentum, braking) should replace position pushes with velocity changes.* That is where the jolt goes away.
6. **Crossed legs.**
   - 14.5 → 16.5 per 1000 near ticks in the torture.
   - Partly the corrections (a root moved while a foot is planted), partly the canonical stepping that follows them.
   - The defender's crossed legs in the review cases came from a velocity the soft wall had written into a standing player's plan. That is fixed (§5); 74 ticks remain.
7. **Feet and arms are detected, not resolved.** Feet overlap up to 14–18 cm and arms up to 17–18 cm in the statistics, by design (§2).
8. **The ball-access gate has a one-tick latency.**
   - It reads the legs' record up to the previous tick, so a leg that enters more than 5 cm in the very tick of a touch is not blocked.
   - That is the one contact through a body in 10.7 torture minutes.
9. **Near misses within 5 cm.** 2 of 6 such passes are moved (≤ 10.5 cm) by the position constraint's rate limit on a fast-closing limb.
10. **Ball access against commitment.** 3 committed Croquetas whose own touch went through the defender's body end when that touch is blocked. Owner decision 4.
11. **Two players only.** The broad phase for 22 is discussed, not built (§15). The head and forearms are not modelled.
12. **Node and the page must pose the same body.**
    - The node tools used vocab2's environment, which has no colliders, so PlayBody's boot hull was missing.
    - Occupancy feeds the body back into the simulation, so node and the Lab diverged case by case.
    - Every occupancy tool now uses `tools/o_env.mjs` (the colliders the pages load). Page ≡ node in 30 of 30.

**Requirements discovered for the next stages (documented, not implemented):**
- limb-level contact response (swinging legs);
- conflict resolution between committed actions (who yields: a stumble, a shoulder contest);
- velocity-based separation instead of position pushes (momentum, braking);
- a committed move's failure state when its own touch is blocked by a body;
- contact islands for three or more players.

Not touched, as instructed: momentum, mass, strength, shoulder challenges, shielding, stumbles, falls, trips, fouls, cards, advantage, ragdolls, tackle-force tuning, POKE calibration, slide tackle.

## 17. Owner decisions

1. **Both-committed conflicts.**
   - V1 moves both roots within their support budgets and reports the residue. In 68 move windows this changes the move's pose relative to its root (the legs over planted feet) by up to 52 cm at the feet.
   - The alternative is not to move either root in a conflict: deeper overlap, but the moves are untouched.
2. **The support budget (18 cm per planted stance).**
   - Without it: 121 ticks > 5 cm in the trade-off set (V1: 286), but legs splay up to 36 cm off their place.
   - At 25 cm: 179 ticks.
3. **Depth against smoothness.** The corrections are immediate (§12), and a jerk-limited schedule is a one-line change if the jolts feel worse than the overlap. Feel decides, in the Lab.
4. **Ball access against commitment.** Should a committed Croqueta's own touch through the defender's body be blocked (V1: yes, and the move ends) or allowed?
5. **Look-ahead (2 ticks):** 226 ticks > 5 cm against 286, at a small continuity cost. Not adopted.

## 18. Playable

# TOUCHLINE — PLAYER OCCUPANCY V1 REVIEW

**http://127.0.0.1:8365/sandbox/visual/occupy1_lab.html** (local only: real players' models)

- **Cases (§25):**
  - the static blocker (walk, jog);
  - head-on walk and jog;
  - face to face;
  - side by side;
  - crossing paths;
  - head-on with one or both turning away;
  - a Body Feint into a standing player;
  - the loose-ball race;
  - the Standing Tackle cases and the misses (sharp cut, Croqueta);
  - the Body Feint and Croqueta encounters;
  - both committed;
  - mirrors.
- **Each case is OLD and OCCUPANCY V1 from identical inputs**, side by side or alone.
- **Controls (§26):**
  - PLAY / REPLAY, 1× / 0.5× / 0.25×, frame step (`,` `.`; Shift = one tick), LOOP;
  - SKIN / SKELETON / SKIN + SKELETON;
  - the volumes, contact normals, ball-access path and diagnostics each toggle;
  - eight cameras: GAMEPLAY, FRONT, REAR, SIDE LEFT, SIDE RIGHT, 3/4 FRONT, 3/4 REAR, OVERHEAD.
- **The overlap (§27):**
  - each volume coloured normal / contact / penetrating / deep;
  - live: the deepest penetration now and the regions, the deepest in this replay so far and in the whole run;
  - the timeline: one lane per mode with the penetration per tick, the contacts, the blocked touches and the conflicts.
- **Diagnostics.** Both modes' records, the pairs at the playhead, and the occupancy's state at that tick (planted feet, commitment, shares, corrections, wall, footholds, unresolved), plus the events.
- **Browser check** (`o_browser.cjs`): **17 of 17**. The page's numbers equal node's in 30 of 30 cases, both modes; 0 console or HTTP errors. Screenshots stayed in the session scratchpad.

## Evidence index (`evidence/`)

- **Instruction and geometry:** `geometry.*` (the volumes from the meshes) · `old_cases.*` (§1).
- **The cases:** `review_cases.txt` (the review cases OLD vs V1) · `identity.txt`.
- **Tackles and moves:** `tackle_search.*` / `tackle_moves.*` (§7, §8) · `sets_*.{txt,json}` (§11; the ball's first divergence) · `body_*.{txt,json}` (§7, §9, §10, §31).
- **Continuity:** `continuity.*` · `snaps.txt` · `support.txt` · `schedule_tradeoff.txt` · `nearmiss.*` · `deadlock.txt` (§12).
- **Regression:** `solo.txt` · `milestone_regress.txt` · `two_player_possession.*` · `two_player_early_info.txt` (§13).
- **Torture, performance, Lab:** `torture.*` (§14) · `performance.txt` (§15) · `lab_cases.json`, `browser.{txt,json}` (§18).

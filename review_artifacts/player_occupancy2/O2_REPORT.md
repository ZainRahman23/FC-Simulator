# TOUCHLINE — PLAYER OCCUPANCY STAGE 2: COMMITTED-ACTION CONTACT RESOLUTION

**24 Oct 2026. Prototype, stopped for the owner's visual review.** Not integrated, not frozen, not published.

- **Branch:** `prototype/player-occupancy-stage2` (local), cut from Stage 1 (`fb35347d`).
- **What changed:** new files only — `sandbox/visual/occupy2/`, `sandbox/visual/occupy2_lab.html`, this folder. Stage 1 (`occupy1/`), Shared Possession + Reaction V1 (`possess1/`), Standing Tackle V1 (`tackle1/`) and the canonical footballer (`vocab2/`) are unchanged.
- **Comparison:** OLD = Shared Possession + Reaction V1 at MEDIUM 0.200 s · STAGE 1 = Player Occupancy V1 · STAGE 2. Always the same inputs.
- **Lab (LOCAL ONLY, real players' models):** http://127.0.0.1:8365/sandbox/visual/occupy2_lab.html
- **The owner's instruction:** `sources/2026-10-24_user_instruction_player_occupancy_stage2.md` (verbatim).

Not started, as instructed: shoulder barges, balance loss, stumbling, knockback, tackle force, strength, fouls, falls, tackle-outcome tuning, slide tackle.

---

## 1. Stage 1 diagnosis — where the 52 cm came from

Traced tick by tick on the case that produced it: La Croqueta, defender 2.4 m ahead and 0.5 m to the side, tackle requested at 0.3 s. Both actions are committed. Tool `tools/o2_diag52.mjs`; full trace in `evidence/diag52.txt`.

Stage 1 moved the carrier's root **69.7 cm** away from OLD during one committed Croqueta. It got there in three steps:

1. **While the left foot was planted:** 18 cm. That is the Stage 1 support budget, 18 cm per planted stance. The planted foot stayed where it was, so the leg had to cover the 18 cm (local foot 19.8 cm off).
2. **In the air, both feet swinging:** about 33 cm more. Stage 1 had no limit for a body with no foot down: 2.8 cm per tick, every tick.
3. **On the next stances:** the rest, 18 cm again on the right foot.

The next left-foot touch is anchored to the ball, so the foot went to where the ball really was (21 cm from OLD in the world). The root, however, was 69.7 cm away. The foot therefore ended up **50.2 cm from its authored place relative to the body**. That is the "52 cm".

So the 52 cm was not a leg reaching. It was **a committed body moved as if it were a free root**, and then reconciled through its ball-anchored feet. Three things made it possible:

- the per-stance budget let a committed plant take 18 cm;
- flight had no budget at all;
- the budget was never charged to the commitment as a whole.

**The same case under Stage 2:**
- root ≤ 12.9 cm from OLD during the move (Stage 1: 69.7);
- the planted stance's own correction 2.1 cm (Stage 1: 18.0).

The left foot still differs from OLD after +0.725 s. That is a different outcome, not a reconciliation (see §4):
- In OLD the Croqueta's first touch (right foot, +0.567 s) was made with the leg **11.2 cm inside the defender's left thigh**.
- Stage 2 denies it (the leg 7.9 cm inside him at that tick). The move then plays on without the ball, held to its release; its left-foot cushion is denied too.

Two further Stage 1 defects were found on the way. Both are fixed in Stage 2:

- **A stale swing after a shift.** Stage 1 dropped the live body's per-plan cache after every correction. The canonical swing, rebuilt mid-flight, reads the present ball and body, and a Croqueta's airborne foot re-planned its whole path: one jump was 93 cm, leg differences up to 41 cm. Stage 2 keeps each swing and carries only its keys after the ball contact with the shift.
- **Stale access-gate bodies.** The extra bodies used to pose the access gate were never told about a shift. Stage 2 updates every body of the player.

---

## 2. Stage 2 architecture

`sandbox/visual/occupy2/o2_world.js` — `OccupancyWorld2` extends possess1's `SharedWorld`, exactly as Stage 1 does. Stage 1's volumes are reused unchanged (`occupy1/o_volumes.js`, 11 capsules from the posed joints). One pass per tick, only while the roots are within 1.9 m.

**Order of operations in one tick:**

1. **Support state, per player, from the plan live at that tick:**
   - COMMITTED PLANT — a committed Body Feint / Croqueta / Standing Tackle with a foot down;
   - AIRBORNE — no foot down;
   - FREE LOCOMOTION — an ordinary gait in motion;
   - SINGLE / DOUBLE SUPPORT — an ordinary player standing on one or two feet.
2. **Detection and classes.** Both bodies are posed live and all 121 capsule pairs are tested. Each pair gets:
   - a **region** — TORSO/PELVIS ↔ TORSO/PELVIS, TORSO ↔ LEG, LEG ↔ LEG, FOOT ↔ BODY, ARM ↔ BODY (feet and upper arms are detection only, as in Stage 1);
   - a **tier** — a leg pair whose contact points close faster than 2.5 m/s *beyond the roots' own closing* is a **FAST LIMB** contact (§13). Every other resolved pair is **CORE**.
3. **Normal / tangent (§10, §11).** One 2-D minimum-norm relative correction is solved over every violated pair, **along the contact normals only**. The tangential relative motion is never touched. Each tick logs:
   - the aggregate normal;
   - the closing speed on it;
   - the sliding speed along the tangent.
4. **Per-region rates.** Instead of Stage 1's single cap:
   - torso / pelvis may be corrected up to 3 cm per tick;
   - legs 1.5 cm per tick (2 cm when deeper than the hard limit);
   - a FAST LIMB pair is classified and reported apart, and resolved at the leg rate (≤ 1.5 cm per tick). A shin flicking through a shin never throws the whole footballer. (Tolerating fast limbs to the 5 cm hard limit first, then 0.8 cm per tick, was the first form; on the evidence it left more than twice the leg overlap for no fewer jolts, §7.)
5. **The split** (kinematics, never strength, §7). The player moving *into* the other and standing on fewer feet takes more. A still player takes none; a committed action takes none unless both are committed.
6. **Fitted to support — the core change (§3, §4, §6).** Each player's share is scaled by a factor λ ≤ 1 so it stays inside his support:

   | the player | what his support can take |
   |---|---|
   | **committed** (Body Feint, Croqueta, Standing Tackle) | ≤ 2 cm over one planted stance · ≤ 8 cm over one flight · ≤ 12 cm over the whole commitment. The approved action is **placed**, never pushed around. A stance that a *planned* Body Feint / Croqueta will commit on counts as committed from its landing |
   | **ordinary, a foot planted** | ≤ 12 cm lean over that stance, **and** only inside the planted leg's reach (the drawn hip within 0.985 × the leg's length of the planted ankle, the pelvis lowered ≤ 2 cm). Never dragged off its feet |
   | **ordinary, airborne** | free (the per-region rate only) |

   - What one player's support cannot take is offered to the other, if *his* support allows.
   - What neither can take is **not applied**. The overlap stays and the tick is classified UNRESOLVED, with its reason:
     - UNRESOLVED COMMITTED CONFLICT — both committed, or a committed action's support limit;
     - PLANTED SUPPORT;
     - PLANTED LEGS;
     - FAST LIMB CONTACT;
     - COMMITTED ACTION'S LIMB;
     - AUTHORED / BALL-ANCHORED LIMB PATH.

   No hidden reconciliation in the legs.
7. **Ledgers.** Each planted stance records the root displacement occupancy *executed* while that foot stayed down (position push + the soft wall's path change). That is the **SUPPORT CONSISTENCY ERROR**: the distance between the authored support foot and where the moved body implies it should be. Each commitment has its own ledger, and so does each flight.
8. **The soft wall** — Stage 1's. It works on the two planned paths relative to each other against a virtual disk, and acts only when the free paths would touch. A committed action, or a stance a planned move will commit on, takes no share. A Body Feint / Croqueta planned but not yet committed is placed whole (never reshaped), but its *approach* can be slowed; sparing it too is `R.wallSparesMove`, measured and left off (an owner decision, §11).
9. **Placement (§5).** The plan itself is shifted: the root, the future stances, the contacts' frames.
   - A **planted stance never moves** (no new plant slides).
   - A **swinging leg is carried with the body**: its lift-off key, and its cached swing after the ball contact. Nothing is rebuilt mid-flight, so the foot still meets the real ball, then lands on the moved stance.
   - **Joints are never edited.** The hip / knee / ankle accommodation to a planted foot is the canonical leg IK reaching it.
10. **Ball access (§14, §15, §18).** A touch, or the tackle's boot, is denied when its playing leg is more than 5 cm inside the opponent:
    - in the 0.1 s before (Stage 1's window), **or**
    - **at the contact's own tick**, both bodies posed then on their present plans. No future information, and no one-tick lag.

    The tackle's boot is gated on **every tick of its sweep**, at both ends of the tick, since the contact itself is resolved over the tick. The gate inherited from Stage 1 ran only when the tackle's probe list changed length. The tackle drops the last tick's probes as it adds this tick's, so the count rarely changed: most of the sweep went ungated, and 3 boots (Stage 1) / 8 (early Stage 2) reached the ball through the carrier in the moves set.

    A denied touch inside a committed Body Feint / Croqueta **does not cancel the move**: its own re-plans (the missed contact, footfalls, refreshes, later touches) are held until the move's release. The animation completes; the ball goes where it actually went; possession's canonical exit (a planned contact missed) is unchanged; the canonical planner resumes at the release from what actually happened.

**What Stage 2 does not do (from §4's order of preference):**
- no **pelvis yaw** about the support (step 2 of the list);
- no **torso lean / compliance** (step 4).

The body's local pose is never edited. Only the root's placement and the canonical leg IK accommodate. These two are listed in §11.

**Considered and not adopted, on the evidence (§6, §7 below):**
- the look-ahead (1 / 2 / 4 ticks);
- a minimum-jerk schedule of the corrections (smoothing);
- Stage 1's single 1.5 cm cap;
- fast limbs tolerated to the hard limit;
- the soft wall sparing a planned move.

---

## 3. OLD vs STAGE 1 vs STAGE 2 — the measurements

The bodies are measured **as drawn**, every tick, with every pair of occupancy volumes. Penetration is in cm. All three modes run identical inputs. Tool: `tools/o2_metrics.mjs`; full tables are in `evidence/sets_*.txt`.

"Ordinary" = no committed action at that tick. "Committed" = a Body Feint / Croqueta / Standing Tackle committed at that tick.

### The review set (37 deterministic encounters: Stage 1's 30 + overtaking, turning into each other, glancing head-on, near miss, and mirrors)

| | OLD | STAGE 1 | STAGE 2 |
|---|---|---|---|
| **Torso / pelvis** — median / p95 / p99 / max | 15.7 / 21.6 / 22.7 / 23.9 | 1.9 / 8.0 / 9.1 / 9.8 | 3.4 / 21.4 / 22.7 / 22.9 |
| … ticks > 5 cm | 1804 | 13 | 64 |
| … **ordinary contact** — max · ticks > 5 cm | 23.9 · 1436 | 9.8 · 6 | **1.3 · 0** |
| … **a committed action involved** — max · ticks > 5 cm | 22.9 · 367 | 8.9 · 7 | 22.9 · 64 |
| **Legs** — median / p95 / p99 / max | 12.8 / 23.0 / 23.4 / 23.5 | 2.2 / 13.3 / 20.9 / 23.0 | 1.8 / 17.3 / 21.6 / 22.7 |
| … ordinary — p95 / max · ticks > 5 cm | 23.1 / 23.5 · 2756 | 9.5 / 22.7 · 165 | **7.6 / 22.7 · 115** |
| … committed — p95 / max · ticks > 5 cm | 21.9 / 23.5 · 1149 | 17.8 / 23.0 · 253 | 20.3 / 22.7 · 483 |
| **Feet** (detected only) — median / p95 / p99 / max | 5.5 / 13.4 / 14.0 / 14.0 | 3.9 / 12.3 / 13.7 / 14.0 | 3.9 / 12.3 / 13.4 / 14.0 |
| **Arms** (detected only) — median / p95 / p99 / max | 10.0 / 17.3 / 18.1 / 18.5 | 6.9 / 12.3 / 13.4 / 17.2 | 7.6 / 13.9 / 16.0 / 18.5 |
| **Root displacement per frame** (occupancy's) — p99 / max | — | 10.9 / 12.0 | 6.9 / 10.6 |
| **Root acceleration** — frames > 1 / 2 / 4 cm per frame² | 123 / 0 / 0 | 677 / 331 / 131 | **622 / 229 / 58** |
| … the largest (cm per frame²) | 1.8 | 11.6 | 10.4 |
| **Root jerk** — frames > 1 cm per frame³ · the largest | 20 · 1.5 | 714 · 18.3 | 680 · 19.9 |
| **Drawn pelvis acceleration** — frames > 2 cm per frame² · the largest | 497 · 8.0 | 918 · 11.0 | 790 · 14.0 |
| **The largest correction in one tick** — executed / pushed | — | 4.1 / 3.0 | 3.4 / 3.0 |
| **Correction reversals** on consecutive ticks | 0 | 6 | 8 |
| **SUPPORT CONSISTENCY ERROR, committed stances** — p99 / max | 0 | 18.8 / 18.8 | **2.2 / 2.2** |
| **SUPPORT CONSISTENCY ERROR, ordinary stances** — p99 / max (of it pushed) | 0 | 18.2 / 24.6 (18.0) | 13.3 / 17.0 (12.1) |
| **Support-chain stretch** — ticks > 1 cm · the largest | 1420 · 1.1 | 1757 · 1.1 | 1487 · 1.1 |
| **Planted-foot drift** — stances drifting > 3 cm ("forced releases") | 633 | 625 | 612 |
| **Ball contacts through a body** | 12 | 0 | **0** |

### The search set (the 209 committed Standing Tackles of Shared Possession + Reaction V1's 1500 runs) and the moves set (352 Body Feint / Croqueta encounters)

| | OLD | STAGE 1 | STAGE 2 |
|---|---|---|---|
| **search** — torso ticks > 5 cm (ordinary max · committed max) | 3354 (23.5 · 23.9) | 10 (10.3 · 6.2) | 53 (**1.5** · 13.1) |
| search — legs ticks > 5 cm (ordinary · committed) | 10508 (3040 · 7460) | 1324 (265 · 1058) | 1296 (319 · 973) |
| search — root acceleration frames > 1 / 2 / 4 cm · the largest | 1561 / 0 / 0 · 1.9 | 3435 / 1011 / 486 · 15.9 | 3501 / **867 / 263 · 10.3** |
| search — SUPPORT CONSISTENCY ERROR committed · ordinary (max) | 0 · 0 | 19.0 · 22.7 | **2.6** · 17.6 |
| search — ball contacts through a body | 42 | 0 | 0 |
| **moves** — torso ticks > 5 cm (ordinary max · committed max) | 3535 (23.9 · 23.8) | 41 (9.8 · 8.9) | 551 (**3.9** · 22.9) |
| moves — legs ticks > 5 cm (ordinary · committed) | 12763 (4067 · 8693) | 1927 (524 · 1403) | 3867 (**324** · 3543) |
| moves — root acceleration frames > 1 / 2 / 4 cm · the largest | 1202 / 0 / 0 · 1.8 | 4041 / 1622 / 708 · 12.2 | 3702 / **1166 / 348 · 10.4** |
| moves — SUPPORT CONSISTENCY ERROR committed · ordinary (max) | 0 · 0 | 19.8 · 28.9 | **2.6** · 22.0 |
| moves — ball contacts through a body | 60 | 3 | **0** |

### Torture — 16 seeded two-player runs × 40 s, 10.7 simulated minutes per mode (`evidence/torture.txt`; Stage 1's from its own evidence)

| | OLD | STAGE 1 | STAGE 2 |
|---|---|---|---|
| ticks > 5 cm · > 10 cm · the deepest | 2491 · 1928 · 23.5 | 431 · 204 · 23.0 | **225 · 70 · 14.0** |
| root jitter (2nd difference > 1 cm per frame) · the largest (mm) | 600 · 19.2 | 1211 · 153.3 | 1142 · 95.9 |
| root acceleration > 100 m/s² (ticks) | 7 | 956 | 933 |
| support-foot sliding (planted > 3 cm, near ticks) | 647 | 810 | 672 |
| legs crossed (near ticks) | 610 | 962 | 1125 |
| ball contacts through a body | 19 | 1 | **0** |
| stuck · root drift · ownership errors · nondeterministic runs | 0 · 0 · 0 · — | 0 · 0 · 0 · 0/16 | 0 · 0 · 0 · **0/16** |

**What these say:**
- **Ordinary contact is solved.** Torso/pelvis never goes deeper than 1.3–3.9 cm in any set; Stage 1 reached 9.8–10.3 cm. Ordinary leg overlap is at or below Stage 1's.
- **Committed support is solved.** The support consistency error on committed stances is ≤ 2.6 cm everywhere; in Stage 1 it was 18.8–19.8 cm.
- **Fewer large jolts.** Frames with root acceleration over 2 cm and over 4 cm are down by 30–60 % against Stage 1, and the peak is lower. Mild jolts (> 1 cm) are about the same.
- **The cost is honest unresolved overlap when a committed action meets a body (§4).** Stage 2 no longer drags committed bodies through the world to hide it. In the moves set, committed-torso ticks over 5 cm go from 21 (Stage 1) to 551 (Stage 2). Every one is classified (§4), none is hidden in a leg.

---

## 4. The committed-action conflict study (§6, §16, §17, §18)

One row per stress case, OLD · STAGE 1 · STAGE 2. Tool `tools/o2_conflicts.mjs`; full table `evidence/conflicts.txt`.

- **"differs from"** is where the world placement first differs from the untouched reference (OLD), counted from the move's commitment.
- **SCE** is the support consistency error: ordinary stances / committed stances.

| case | mode | torso | legs | ticks > 5 cm | SCE ord / com | root vs OLD | differs from | the move · access · unresolved |
|---|---|---|---|---|---|---|---|---|
| **§16 Body Feint vs a standing defender** | OLD | 22.9 | 23.4 | 107 | — | — | — | through his body |
| | S1 | 0.0 | 3.5 | 0 | 11.4 / 0 | 108.9 | −0.508 s | **not committed** |
| | S2 | 0.0 | 2.5 | 0 | 12.5 / 0 | 83.4 | −0.508 s | **not committed** (see below) |
| **§16 Body Feint past a recovering tackle** (into the fake side) | OLD | 22.9 | 22.8 | 123 | — | — | — | |
| | S1 | 9.8 | 23.0 | 153 | 19.6 / **18.8** | 307.9 | −0.341 s | carried · both committed 59 |
| | S2 | **22.9** | 22.6 | 126 | 0.2 / **2.0** | 157.5 | −0.341 s | carried · his touch denied (move held), the boot denied · **UNRESOLVED COMMITTED CONFLICT 68** |
| **§16 Body Feint into a committed tackle** | OLD | 7.9 | 22.6 | 174 | — | — | — | |
| | S1 | 2.1 | 3.8 | 0 | 18.2 / 0 | 177.6 | (before) | |
| | S2 | 0.0 | 3.2 | 0 | 12.1 / 0 | 160.4 | (before) | |
| §16 Body Feint, defender on the exit side, tackling | OLD | 21.2 | 21.8 | 126 | — | — | — | |
| | S1 | 0.0 | 7.0 | 2 | 0.8 / 0 | 133.7 | +0.263 s | carried |
| | S2 | 0.0 | 6.1 | 4 | 2.1 / 0.4 | 131.4 | +0.259 s | carried · the boot denied |
| **§17 Croqueta past a standing defender** | OLD | 0.0 | 22.2 | 73 | — | — | — | |
| | S1 | 0.0 | 10.4 | 6 | 8.7 / 0 | 32.9 | +0.112 s | carried |
| | S2 | 0.0 | **2.0** | **0** | 13.3 / 0 | 35.0 | +0.112 s | **carried, around his body** |
| **§17 Croqueta into a committed tackle** (before the transfer) | OLD | 22.7 | 23.3 | 214 | — | — | — | (not carried in OLD either) |
| | S1 | 0.0 | 14.2 | 17 | 18.4 / 5.2 | 123.5 | −0.080 s | |
| | S2 | 11.5 | 22.7 | 95 | 12.0 / 2.1 | 93.7 | +0.075 s | the boot denied · COMMITTED CONFLICT 49 |
| §17 Croqueta already committed when the tackle meets the ball | OLD | 5.6 | 22.6 | 99 | — | — | — | |
| | S1 | 2.1 | 18.6 | 39 | 17.6 / **18.0** | 244.6 | +0.037 s | carried |
| | S2 | 3.4 | 22.7 | 82 | 12.0 / **2.2** | 131.7 | +0.037 s | carried · 2 touches denied (move held) · COMMITTED CONFLICT 61 |
| **§6 both committed: the tackle into a Croqueta under way** | OLD | 0.3 | 22.7 | 78 | — | — | — | |
| | S1 | 0.0 | 12.8 | 30 | 1.3 / **18.0** | **256.0** | +0.070 s | carried |
| | S2 | 0.0 | 22.7 | 82 | 0.6 / **2.2** | **26.5** | +0.066 s | carried · his touch denied (move held) · COMMITTED CONFLICT 63 |

**What this shows:**
- **No more 52 cm.** Every committed stance stays within 2.2 cm of its authored support. Stage 1 reached 18.0–18.8 cm on the same stances and dragged the bodies 245–308 cm away from OLD over a whole case.
- **The approved action is placed, not reshaped.**
  - Body Feint / Croqueta committed at the same tick as OLD: 308 / 309 in the moves set, 46 / 46 in the search set, 9 / 10 in the review set (the tenth is the §16 standing-defender case below). Released at the same tick in all of these.
  - Carried to their release: 297 in Stage 2 vs 291 in OLD (moves set). Cancelled by Stage 2: 1 (Stage 1: 7).
  - Local pose identical (every joint, ≤ 0.1 mm) from the commitment until occupancy first acts: **267 / 267** moves set, 43 / 43 search set, 8 / 8 review set. Stage 1: 250 / 262 (12 differed by up to 1.3 mm).
  - After contact, the trunk differs by ≤ 1.5 cm. The legs differ by about the placement (median 2.7 cm per move; ≤ 11 cm, the commitment's budget).
  - Leg differences **beyond** the placement exceed 2 cm in 102 of 2019 post-contact ticks (5 %). That is the canonical swing corridor switching a few ticks earlier (§11.5).
- **The tackle is unchanged.**
  - Committed identically 180 / 181 (moves set) and 203 / 209 (search set; Stage 1: 206 — 6 tackles commit at another tick because the bodies were kept apart before).
  - Owns the body as long, and the same phases, in all of these.
  - Its local pose is identical until the ball or the carrier differs in 137 / 176 (moves) and 199 / 202 (search). The others differ by ≤ 2.4 mm before any occupancy action on the tackler, an untraced sub-centimetre effect.
- **Where it cannot be resolved without violating support, it is not resolved.** Body Feint into a recovering tackle: chest into chest 22.9 cm, both actions committed and planted. Stage 2 leaves it and classifies 68 ticks as **UNRESOLVED COMMITTED CONFLICT**. Stage 1 hid it by moving the Body Feint 18.8 cm off its planted foot and 3 m from OLD over the case. It is the case Stage 3 (impact) exists for.

**How much committed placement buys (moves set; `evidence/variants/v5_moves.txt`):**

| committed compliance per plant / flight / commitment | committed torso ticks > 5 cm | SCE committed max | ordinary torso max · ticks > 5 cm | root frames > 4 cm |
|---|---|---|---|---|
| 0 / 0 / 0 (never moved) | 669 | 0.9 | 4.8 · 0 | 328 |
| **2 / 8 / 12 cm (chosen)** | **551** | **2.6** | **3.9 · 0** | **348** |
| 5 / 12 / 20 cm | 458 | 5.4 | 7.8 · 7 | 455 |
| 10 / 18 / 30 cm | 374 | 10.3 | 14.9 · 53 | 547 |

More placement removes committed overlap only slowly. Even 10 cm per plant leaves 374 ticks, and the moved committed bodies start pushing into third positions: ordinary torso phasing comes back (53 ticks) and jolts rise. **Two committed bodies meeting chest to chest cannot be separated within their support.** That is an impact, Stage 3's.

**§16 Body Feint vs a standing defender (`bf-into`): the move is not played, in Stage 1 or Stage 2.**
- The Body Feint is planned from t = 0 and commits at +0.941 s.
- At +0.38 s, 1 m apart, the soft wall predicts the collision and slows the carrier's approach.
- The re-plans that follow never commit the move. OLD played it straight through the defender (22.9 cm torso).

`R.wallSparesMove` lets the wall leave a planned move's approach alone. Measured:
- **with it:** the Body Feint is played and carried, then overlaps the standing defender — 21.9 cm, 148 ticks > 5 cm, classified;
- **across the review set:** ordinary leg ticks > 5 cm 115 → 200, committed torso ticks 64 → 118;
- **moves set:** ordinary legs 324 → 518.

It is left off and listed as an owner decision (§12).

---

## 5. The support-consistency study (§2, §3, §4, §21)

**The metric (§21).** For every planted stance: the root displacement occupancy *executed* while that foot stayed down. That is the distance between where the authored support foot is (it never moves) and where the moved body implies it should be. It is measured on the plan itself around every correction, with the same instrument for both stages (`o2_metrics.mjs`). In the Lab each support anchor is drawn as a ring, and any error as a dashed line with its length.

| SUPPORT CONSISTENCY ERROR (cm) | OLD | STAGE 1 | STAGE 2 |
|---|---|---|---|
| committed stances — review · search · moves (max) | 0 · 0 · 0 | 18.8 · 19.0 · 19.8 | **2.2 · 2.6 · 2.6** |
| committed stances — p99 | 0 | 18.8 · 6.6 · 18.0 | **2.2 · 2.0 · 2.3** |
| ordinary stances — max (of it pushed) | 0 | 24.6 · 22.7 · 28.9 (18.0) | 17.0 · 17.6 · 22.0 (12.4) |
| ordinary stances — p99 | 0 | 18.2 · 18.3 · 18.2 | 13.3 · 12.6 · 13.0 |
| support-chain stretch (the drawn hip beyond the planted leg's reach) — the largest | 1.1 | 1.1 | 1.1 |
| the "52 cm" case — the root from OLD · the committed stance's error | — | 69.7 · 18.0 | **≤ 12.9 · 2.1** |

**Reading it:**
- **A committed plant stays put.** The committed budget is 2 cm per plant; the measured maximum is 2.2–2.6 cm. A flight may place a committed body up to 8 cm, and a whole commitment 12 cm. While the move is still identical to OLD's, its root stays within 11 cm of OLD (the motion check, §4). The airborne legs travel with it, so they don't reconcile anything.
- **An ordinary planted foot lets the body lean, not slide.** The position push is capped at 12 cm per stance (measured 12.1–12.4). The rest of the ordinary error (to 17–22 cm) is the soft wall's path change, held by the leg-reach limit: the drawn hip never goes beyond the planted leg's reach (stretch 1.1 cm, the canonical OLD value). The foot stays planted; the body leans over it.
- **Planted-foot drift and "forced releases" are the canonical body's** (OLD 633 · Stage 1 625 · Stage 2 612 in the review set). The drawn toe turns about the ball of the foot as the heel lifts. Stage 2 adds none: planted stances are never moved.
- **No hidden reconciliation.** What support cannot take is left as classified overlap (UNRESOLVED …, §4). It is never moved into the legs.

---

## 6. The look-ahead comparison (§9)

Both bodies are posed *n* ticks ahead on their present plans, and a CORE pair that will be beyond tolerance asks for 1/*n* of that depth now. No gameplay prediction is used. Review set (`evidence/variants/v1_look.txt`); search set (`v6_look_search.txt`):

| | ordinary legs ticks > 5 cm | ordinary torso max | frames > 1 / 2 / 4 cm | the largest jolt (cm/frame²) | jerk frames > 1 cm | pelvis frames > 2 cm | SCE committed |
|---|---|---|---|---|---|---|---|
| **reactive (chosen)** | 115 | 1.3 | 622 / 229 / **58** | **10.4** | 680 | 790 | **2.2** |
| 1 tick | 81 | 3.5 | 594 / 230 / 82 | 13.0 | 643 | 793 | 2.5 |
| 2 ticks | 87 | 2.2 | 611 / 231 / 73 | 13.3 | 641 | 776 | 2.6 |
| 4 ticks | 88 | 2.7 | 576 / 223 / 75 | 12.7 | 605 | 779 | 2.6 |
| search set: reactive · 2 ticks | 319 · 312 | 1.5 · 1.5 | 3501/867/**263** · 3448/888/264 | **10.3** · 12.4 | 2673 · 2656 | 5039 · 5084 | 2.6 · 2.6 |

**The evidence on the look-ahead:**
- **Gains:** 25–30 % less ordinary leg overlap on the review set (7 tick-instances fewer of 319 on the search set — no clear gain there), and slightly fewer mild jolts.
- **Costs:** 26–41 % more of the large jolts (frames > 4 cm), and the largest jolt rises from 10.4 to 12.7–13.3 cm/frame².
- **Action distortion:** a slightly larger committed support error (2.2 → 2.5–2.6 cm).

A correction started early still has to be finished. When the predicted contact arrives as predicted, both pushes add up; that is where the large jolts come from. **Not adopted:** reactive is kept, because the large jolts are what the owner named as visible. A 2-tick look-ahead is an owner decision (§12).

---

## 7. Tolerance, lean and the other levers (§8, §13, §22, §23)

Review set; `evidence/variants/`. Penetration columns: max · ticks > 5 cm (cm).

| variant | ordinary torso | ordinary legs | committed torso | frames > 1 / 2 / 4 cm · largest | SCE ord / com |
|---|---|---|---|---|---|
| **STAGE 2 (chosen: tolerance 2 cm / hard 5 cm, lean 12 cm)** | **1.3 · 0** | **22.7 · 115** | 22.9 · 64 | **622 / 229 / 58 · 10.4** | **17.0 / 2.2** |
| tolerance 1 / hard 4 cm | 1.0 · 0 | 22.9 · 88 | 22.9 · 65 | 626 / 231 / 65 · 9.9 | 16.9 / 2.2 |
| tolerance 1 / hard 5 cm | 1.0 · 0 | 22.7 · 92 | 22.9 · 65 | 624 / 225 / 60 · 9.9 | 16.9 / 2.2 |
| tolerance 3 / hard 6 cm | 3.2 · 0 | 23.0 · 162 | 22.9 · 69 | 677 / 246 / 70 · 9.6 | 17.3 / 2.2 |
| lean LOW 6 cm | 4.7 · 0 | 22.7 · 309 | 22.9 · 78 | 606 / 228 / 66 · 9.7 | **10.7** / 2.2 |
| lean CURRENT (Stage 1's 18 cm) | 5.1 · 1 | 23.0 · 159 | 22.9 · 66 | 654 / 253 / 78 · 10.4 | 23.3 / 2.2 |
| lean HIGH 25 cm | 1.3 · 0 | 22.6 · 180 | 22.9 · 64 | 649 / 255 / 74 · 10.4 | 25.5 / 2.2 |
| smoothed (minimum-jerk ramp, 8 ticks) | **11.7 · 33** | 22.2 · **951** | 22.9 · 66 | 583 / 118 / **20 · 5.3** | 16.4 / 2.2 |
| Stage 1's single cap (1.5 cm/tick, legs 3) | 2.5 · 0 | 22.9 · 191 | 22.9 · 65 | 624 / 227 / 46 · 7.4 | 17.0 / 2.2 |
| fast limbs tolerated to 5 cm, then 0.8 cm/tick | 3.0 · 0 | 22.8 · 269 | 22.9 · 65 | 611 / 265 / 61 · 9.3 | 16.9 / 2.2 |
| no swing carry (Stage 1's cache drop) | 4.8 · 0 | 22.9 · 238 | 22.9 · 69 | 622 / 254 / 65 · 11.9 | 17.4 / 2.5 |
| committed never moved | 0.9 · 0 | 15.7 · 149 | 22.9 · 99 | 546 / 201 / 62 · 12.5 | 17.0 / 0.0 |
| the wall spares a planned move | 5.5 · 1 | 22.7 · 200 | 22.9 · 118 | 661 / 259 / 66 · 10.4 | 17.0 / 2.2 |

**Tolerance:**
- **1 cm** is marginally better on leg overlap (115 → 88–92 ticks) for the same jolts.
- **3 cm** is worse on everything.
- **The hard limit** is also the ball-access threshold: 4 cm denies more contacts.

2 cm / 5 cm is kept (Stage 1's measurement, comparisons stay clean). 1 cm is the obvious candidate if the owner wants tighter visuals (§12).

**Lean:**
- **6 cm** keeps ordinary bodies closest to their feet (ordinary support error 10.7 cm), but nearly triples ordinary leg overlap (309 ticks) and lets torsos touch (4.7 cm).
- **Stage 1's 18 cm** lets the body lean 23 cm off its foot and brings back ordinary torso overlap (5.1 cm) — its pushes arrive later and deeper.
- **25 cm** is better on legs, at a 25.5 cm lean.
- **12 cm** is the balance: lowest torso and near-lowest leg overlap, the fewest large jolts, a lean the leg can reach.

**The levers' evidence:**
- **Smoothing** halves the large jolts, but brings torso phasing back (11.7 cm) and multiplies leg overlap ×8. Stage 1 found the same — so it is not used (§8 of the instruction).
- **Fast limbs.** Classified (FAST LIMB) but resolved at the leg rate. Tolerating them to the hard limit first left 2.3 × the leg overlap for no fewer jolts.
- **The swing carry** is needed: without it, ordinary leg overlap doubles and jolts rise.

---

## 8. The ball-access audit (§14, §15, §18)

Every contact made, the playing leg against the opponent's body at the contact's own tick. The **latency** row is the leg through the body one tick before or after a contact that was made. Tool `tools/o2_access.mjs`; `evidence/access_*.txt`.

| | review: OLD · S1 · S2 | search: OLD · S1 · S2 | moves: OLD · S1 · S2 |
|---|---|---|---|
| contacts made | 284 · 264 · 271 | 1967 · 1972 · 1984 | 2984 · 2975 · 3000 |
| **THROUGH the opponent's body** (> 5 cm) | 12 · 0 · **0** | 42 · 0 · **0** | 60 · 3 · **0** |
| ambiguous (2–5 cm) | 2 · 1 · 1 | 12 · 17 · 5 | 10 · 23 · 5 |
| **latency** (body blocks on N, contact on N ± 1) | 0 · 0 · **0** | 6 · 3 · **0** | 1 · 4 · **0** |
| denied by the 0.1 s window | — · 17 · 22 | — · 59 · 115 | — · 109 · 156 |
| denied **at the contact's own tick** (what the one-tick lag let through) | — · — · 2 | — · — · 16 | — · — · 7 |
| a committed move's touch denied, the move held to its release | — · — · 7 | — · — · 3 | — · — · 46 |
| Standing Tackle boot: AROUND the carrier · ambiguous · THROUGH | 13 · 0 · 0 / 13 · 0 · 0 / 13 · 0 · 0 | 154 · 5 · 8 / 168 · 1 · 0 / 177 · 1 · **0** | 117 · 4 · 27 / 181 · 13 · **3** / 181 · 5 · **0** |
| boot sweeps denied | — · 5 · 13 | — · 12 · 79 | — · 31 · 90 |

**The audit's findings:**
- **The one-tick lag is gone.** Gating at the contact's own tick catches what the window missed: 25 contacts across the sets. Latency cases: 0.
- **The tackle's boot was gated on only a few ticks of its sweep in Stage 1** (the probe-count bug, §2.10). That is how 3 boots in the moves set reached the ball through the carrier. With the boot gated on every tick of the sweep: **0 through a body anywhere**; around the carrier it still wins the ball (177 / 181).
- **A committed move whose touch is denied is not cancelled.** 46 such moves in the moves set were all carried to their release, the ball where it actually went. In a held window the move's own re-plans are suppressed. Possession's canonical "planned contact missed" exit still runs (the sim's own controller sees the missed contact). At the release the canonical planner re-plans from what actually happened.

**Tackle outcomes** (MEDIUM, POKE untuned — **not tuned**, only occupancy added; `evidence/tackle_*.txt`):

| | search: OLD · S1 · S2 | moves: OLD · S1 · S2 |
|---|---|---|
| MISS | 47 · 45 · 45 | 43 · 42 · 50 |
| ATTACKER RETAINS | 3 · 5 · 8 | 1 · 0 · 1 |
| ATTACKER RECOVERS | 141 · 150 · 148 | 116 · 122 · 113 |
| DEFENDER RECOVERS | 18 · 9 · 8 | 21 · 17 · 17 |
| changed from OLD | — · 23 · 20 | — · 15 · 18 |
| OLD's races that were BODY-PHASED, changed by the stage | — · 21 · 18 (of 141) | — · 13 · 16 (of 127) |
| the stage's own races BODY-PHASED (any pair > 5 cm between break and re-establishment) | — · 65 · 59 | — · 56 · 68 |

Every changed outcome is a race OLD won through a body, a boot that reached the ball only through the carrier, or a touch through the opponent. Races that were LEGITIMATE in OLD are never changed (16 / 16, 8 / 8).

The stage's own "body-phased" races are races decided while some pair was deeper than 5 cm, mostly committed legs (§11.2–3). That is not a ball won through a body: contacts through a body are 0.

---

## 9. Performance

37 review cases × 3 repetitions, node 22, one core (`evidence/performance.txt`).

| | Stage 1 | Stage 2 |
|---|---|---|
| the world's step, mean (OLD 47.7 µs) | 111.9 µs | 117.9 µs (p99 776 µs) |
| the occupancy pass: near, nothing to resolve · active | 151 · 215 µs | 173 · 233 µs (p99 528 · 600) |
| of a near / active pass | posing 125 µs | posing 131 µs · the ball-access gates 37 µs · the soft wall 12 µs · shifting the plans 11 µs · footholds 3 µs · the support fit 0.4 µs |
| per simulated second in these cases (30 % of ticks near) | ≈ 14 ms | ≈ 13.5 ms (posing ≈ 9.4 ms of it — shared with rendering in a game) |
| per 60 Hz frame, both players near every tick | 0.7 ms | 0.8 ms mean · 2.2 ms p99 |

Stage 2 costs about 15 % more per near pass than Stage 1. Almost all of it is the gate at the contact's own tick, which poses both bodies once more on the ticks that hold a contact.

---

## 10. Regression

| check | result |
|---|---|
| **single player** (`s2/o2s_solo.mjs`: 105 curated canonical cases, 127,092 ticks, the other player parked 40 m away, occupancy ON vs OFF) | **identical every tick 105 / 105**; the occupancy pass never evaluated a pair |
| **the milestone's own regression** (`tackling_integration1/tools/milestone_regress.mjs` through possess1's solo hook, compared line by line with the evidence at `f775daac`) | **ALL 10 SUITES SAME** — including Croqueta LEG-WAVE V4 + Body Feint ≡ their review builds, every joint and the ball, every tick |
| **identity** (`s2/o2s_identity.mjs --search 20`, 337 encounters) | OLD with the bodies recorded ≡ Shared Possession + Reaction V1: **337 / 337**; Stage 2 ≡ OLD until its first action: **90 / 90**; runs where it never acts identical throughout: **247 / 247** |
| **two-player possession** (possess1's own `p_torture.mjs` run on OccupancyWorld2: 60 trials × 4 reaction modes) | dual 0 · unaware 0 · stale 0 · chatter 0 · without a touch 0 · granted blind 0 · timer unresolved 0 · nondeterministic 0 · FREE at the end 0 |
| **no new information before perception** (`s2/o2s_early.mjs`, the attacker vs his counterfactual) | his **decisions never differ** before perception (0 · 0 · 0), except through a touch the body denied (2 · 4 · 4). His root differs in 26 · 30 · 30 checks: 24 · 28 · 28 with occupancy acting on him; 2 · 2 · 2 after his touch was denied by the body; **0 unexplained** |
| **determinism** | torture 0 / 16 nondeterministic; possession torture 0 |
| **no force field** (`s2/o2s_nearmiss.mjs`, 64 passes swept across lateral offsets) | near misses 5–30 cm: **22 / 22 identical to OLD**; > 30 cm 5 / 5; 0–5 cm 4 / 6 (≤ 10.3 cm moved) — the same as Stage 1 |
| **no deadlock** (`s2/o2s_deadlock.mjs`) | every stress case apart at the end; longest contact 0.47 s (side by side, 3.7 cm deep; OLD 3.48 s at 23.5 cm) |
| **the Lab in Chrome** (`o2_browser.cjs`) | **20 / 20**; the page's numbers ≡ node's on 37 / 37 cases × 3 modes (deepest, ticks > 5 cm, outcome, through, blocked, support consistency error); 0 console / HTTP errors |
| lock check (`bl_lock_check.sh`) | PASS |
| canonical files changed | **0** (`occupy1/`, `possess1/`, `tackle1/`, `vocab2/` unchanged) |

During an intermediate run, the torture showed one *stale owner* tick. It was traced (`evidence/stale_owner_trace.txt`) to a one-tick ordering of the possession layer's own "ball 3 m away" exit; occupancy was not acting. The final run shows 0.

---

## 11. Remaining limitations

1. **Committed against committed is not solved — by design.**
   - A Body Feint into a recovering tackle meets chest to chest (22.9 cm), both actions planted. Across the moves set, 551 committed-torso ticks are over 5 cm, all classified UNRESOLVED COMMITTED CONFLICT.
   - Separating them would drag at least one committed body ~20 cm off its planted foot — the 52 cm problem again.
   - Even 10 cm of committed compliance per plant leaves 374 ticks (§4). This is the hand-off to impact physics (Stage 3).
2. **A committed tackle into the carrier.** The tackle takes no share. When the carrier's support can't take it either, the overlap stays: committed torso ≤ 13.1 cm in the search set.
3. **Ball-anchored and authored limbs.** A touching leg goes to the real ball, and a committed move's legs follow their authored path. These can stay inside the opponent's legs: committed legs to 22.7 cm, classified COMMITTED ACTION'S LIMB / AUTHORED / BALL-ANCHORED LIMB PATH.
   - The touch itself is denied if the leg is > 5 cm inside the body, so no ball is won that way.
   - In `face` (the carrier walks up and stops against him) this reaches 14 cm, where Stage 1 dragged the body away instead (4.2 cm).
4. **A planned move against the predictive wall** (§4, `bf-into`). The Body Feint into a standing player is not played: the wall slows the approach 0.5 s before the commitment. Owner decision (§12).
5. **The canonical swing corridor.** It keeps a swinging foot ≥ 14 cm beside the planted one, and it is a threshold. A 2 cm placement change can switch it on a few ticks earlier: the swing foot then travels up to 22 cm off its path for a few ticks and may land 3–4 cm off its stance, held through that stance.
   - This is 5 % of the post-contact ticks of committed moves in the moves set.
   - It lives in the approved motion's body code (`vocab2/u_body.js`), which Stage 2 must not edit.
6. **The canonical head flip.** The head turns ~150° in one tick in the canonical motion (OLD too). A 1–2 tick shift of it reads as 30 cm at the head tip in the motion comparison. It is not an occupancy deformation.
7. **Root jolts are reduced, not gone.**
   - Review set, frames > 1 / 2 / 4 cm: OLD 123 / 0 / 0 · Stage 1 677 / 331 / 131 · Stage 2 622 / 229 / 58. The largest is 10.4 cm/frame².
   - Root accelerations over 100 m/s² in the torture: 933 ticks (Stage 1: 956). These are position pushes of ≤ 3 cm in one tick.
   - Only a schedule hides them (smoothing), and it brings the penetration back (§7).
8. **Two items from §4's order of preference are not implemented:** pelvis yaw about the support, and torso lean / compliance. The local pose is never edited, so a planted body's accommodation is root placement plus the canonical leg IK.
9. **Ordinary bodies lean up to 17–22 cm over a planted foot** (12 cm of position push plus the wall's path change, always within the leg's reach). Lean 6 cm would keep them closer, at three times the leg overlap.
10. **Crossed legs near the opponent rise** (torture: OLD 610 · Stage 1 962 · Stage 2 1125 near ticks). Bodies held apart at the torso stand closer at the legs. Not addressed.
11. **Tackle outcomes moved** (search: DEFENDER RECOVERS 18 → 8, ATTACKER RETAINS 3 → 8), every change for a body reason. **Not tuned**, as instructed.
12. **Two small untraced differences:**
    - ≤ 2.4 mm in the tackle's local pose before occupancy acts on the tackler (39 of 176 in the moves set);
    - an early-information root difference after a denied touch (now explained, §10).

---

## 12. Owner decisions

1. **Committed against committed** (§4). Choose between:
   - **(A, Stage 2)** keep support (≤ 2.6 cm) and leave the overlap classified for Stage 3; or
   - **(B)** more committed compliance — 5 / 12 / 20 cm: committed-torso ticks −17 %, support error 5.4 cm; 10 / 18 / 30 cm: −32 %, 10.3 cm, and ordinary torso phasing returns.
2. **A planned move against the predictive wall** (`R.wallSparesMove`, §4). Choose between:
   - **off (Stage 2)** — the Body Feint into a standing player is not played, no phasing; or
   - **on** — it is played, then overlaps the defender (21.9 cm, classified); ordinary leg overlap +74 % on the review set.
3. **Look-ahead** (§6). Choose between:
   - **reactive (Stage 2)**; or
   - **2 ticks** — −25 % ordinary leg overlap on the review set (−2 % on the search set), +26 % large jolts, the largest +28 %.
4. **Tolerance** (§7). Choose between:
   - **2 cm (Stage 2)**; or
   - **1 cm** — −20 % leg overlap, the same jolts. The hard limit (5 cm) is also the ball-access threshold.
5. **Lean** (§7). Choose between:
   - **12 cm (Stage 2)**;
   - **6 cm** — closer to the feet, 3× the leg overlap; or
   - Stage 1's **18 cm**.

---

## Evidence (all in `evidence/`)

| file | what |
|---|---|
| `diag52.txt` | §1 the 52 cm case, Stage 1 and Stage 2, tick by tick |
| `sets_review/search/moves.{txt,json}` | §3 the measurements |
| `body_review/search/moves.{txt,json}` | §4 motion preservation |
| `conflicts.{txt,json}` | §4 the stress cases |
| `variants/v0_base … v7_*.txt` | §4, §6, §7 the studies |
| `access_*.{txt,json}` | §8 ball access |
| `tackle_search/moves.{txt,json}` | §8 outcomes and races |
| `performance.txt` | §9 |
| `solo.txt`, `milestone_regress.txt`, `identity.txt`, `two_player_possession.*`, `two_player_early_info.txt`, `nearmiss.txt`, `deadlock.txt`, `torture.*`, `browser.json`, `lab_cases.json`, `review_cases.txt`, `stale_owner_trace.txt` | §10 |

The ported Stage 1 tools (`tools/s2/`) print "OCC" / "OCCUPANCY" for Stage 2.

# TOUCHLINE — PLAYER OCCUPANCY STAGE 3B.2: RECOVERY-STEP AND LANDING GEOMETRY

**Status: STOPPED for the owner's visual review.** Local only: not pushed, merged, frozen or published. **3B.3 (trips, multi-step stagger), falls, ground contact, get-up and the shoulder duel are not started.**

- **The 3B.1 contact / momentum formulation (calibrated F+M) is frozen and unchanged.** Local tag `occupancy-3b1-calibrated-fm-1` → `731813f1`. Every tracked code file is identical to the tag; 3B.2 is new files only (`sandbox/visual/occupy3b2/`). Of the tracked documents, only HANDOFF.md and STATUS.json gained 3B.2 sections.
- **Branch:** `prototype/player-occupancy-stage3b2` (from `731813f1`). Worktree `~/Downloads/FC Simulator worktrees/player-occupancy-3b2`.
- **Commits:** `12a914ca` (WIP) · `e9d0524f` (the measured default) · the report commit (the branch HEAD): the released-plant lift-off, the evidence, this report.
- **Lab:** **http://127.0.0.1:8367/sandbox/visual/occupy3b2_lab.html** (local only). Left 3B.1 (calibrated F+M) | right 3B.2; either can show OLD STAGE 3.
- **Instruction (verbatim):** `sources/2026-10-26_user_instruction_stage3b2.md`. **Evidence:** `evidence3b2/`.

**The sets used throughout:**
- **review (37):** the 3B.1 review cases;
- **matrix (52):** the §10 matrix with mirrors;
- **114:** the matrix plus your §8 stress cases, the crossing sweep, mirrors and rotated worlds (`l3`);
- **moves (352)** and **search (235):** the wide sweeps.

## THE ANSWERS

**1. Why the 22.4 cm overlap occurred.**
It is one case, `croq-win` (and its twin `both-committed`): the Croqueta's carrier against a Standing Tackle, about 0.6 s in.
- **Two committed landings were aimed into each other** (the Croqueta's right foot, the tackle's left), both landing within 60 ms.
- **3B.2's prediction sees both conflicts long before:** the Croqueta's landing 9 cm into the defender's boot at 0.27 s, and the tackle's 13 cm into the carrier's shin at 0.45 s.
- **Nothing may change them before the first physical contact.** That is your exact-before-contact rule, and §7: the authored motion holds until the interaction requires a deviation.
- **Stage 2 cannot separate them.** Two committed actions in each other's space is its UNRESOLVED COMMITTED CONFLICT.
- **3B.1's landing priority then lands each foot on its authored stance through the other leg**, and the two thighs end up in the same space: thigh × thigh 22.4 cm, 40 ticks > 5 cm.

It was not a recovery landing. It was two authored landings that nothing was allowed to move.

**Under 3B.2: 22.4 → 17.3 cm, 40 → 24 ticks > 5 cm.** The first contact comes at 0.592 s. Within 8 ms both actions are ended by Stage 3's own rule, both after their decisive touches (`TECHNICAL EVENT COMPLETES, RECOVERY REPLACED`):
- the Croqueta, whose swing passes 11 cm through the defender's shin with no route;
- the tackle, whose landing is 9 cm into the carrier's boot.

Both feet are then 40–70 ms from touchdown. That is inside the 0.13 s in which a landing can no longer move without a visible snap. So the two landing legs still swing through each other's thighs: 17.3 cm at worst, at 0.617 s. **This is one of the mutually impossible pairs (§10).**

**2. How 3B.2 chooses a recovery landing.**
Stage 3 still decides *whether* a player must step, and how much the step must catch (its capture requirement). 3B.2 decides *where the foot can actually go*:
- It takes **Stage 3's own options for both feet**.
- It generates candidates around Stage 3's wanted landing, **nearest first**.
- It rejects every candidate that is:
  - on the wrong side of the own support foot (where it stands now *and* where it will be);
  - out of reach, or outside the hip / knee / foot ranges;
  - into the opponent's **predicted** boots and shins over −40…+120 ms about the touchdown;
  - into the own planted leg;
  - reachable only **through either player's legs along the swing corridor** (the boot, lower shin and knee from the airborne foot to the landing). A route waypoint is tried first.
- It keeps the **nearest feasible landing that still does the job** (≤ 3 cm left uncaught). Clearance is a pass / fail check, never a score.
- **In flight,** every 2 ticks it re-checks the landing and corridor. In order: a route, a shorter / wider / narrower step, a retiming of ±30 / 60 ms, another candidate. Never within the last 0.13 s.
- **No feasible landing** after an 80 ms grace gives **NO_FEASIBLE_RECOVERY**, a TRIP or FALL candidate with the state preserved. No step is manufactured.

§2 has the full table.

**3. Recovery landings into the opponent** (`land_*.txt`):

| | 3B.1 | 3B.2 |
|---|---|---|
| recovery landings, boot / shin into the opponent's legs > 2 cm: matrix · 114 | 1 of 42 (6.1 cm) · 5 of 104 (3 > 5 cm, deepest 7.4) | **0 of 52** · **3 of 119** (2 > 5 cm, deepest 8.2) |
| recovery swings passing > 5 cm through the opponent's legs: matrix · 114 | 11 · 23 | **2** · **20** |
| committed landings into the opponent > 2 cm: matrix · 114 | 4 of 56 · 6 of 64 | **0 of 42** · **0 of 46** |
| ordinary landings into the opponent > 5 cm: matrix · 114 (reported, not moved, §12) | 10 · 12 | 8 · 11 |

**What remains, and why:**
- **The placement is clear when made.** Every remaining case traced was clear of the opponent's *predicted* legs at the decision.
- **The opponent's legs then leave the prediction.** The prediction is the opponent's plan, and the opponent is being moved too: shoved by Stage 3, or swinging an ordinary gait step that 3B.2 does not move.
  - `croq-recover2` ±m: the attacker's step is placed at 0.52 s, clear. The defender's tackle ends at 0.517 s, and the defender's ordinary swing then passes through the attacker's landing at 0.67 s (8.2 cm).
  - `x30-jog`: the step is routed round the defender's leg, then reported clear again. The defender's plant cannot be released, and Stage 3 moves the defender into the swing inside the last 0.13 s (18 cm).
- **The last 0.13 s cannot be changed without a snap.**

So "no landing through an opponent" and "no recovery trajectory through an opponent" are **met on the matrix for landings (0 of 52), not fully on the 114 set**: 3 recovery landings of 119, and 20 swings (23 under 3B.1). The swings that remain are the opponent moving into the corridor after the decision.

**4. Planted-foot drift** (114 set; the drawn ball of the foot of each planted stance, against its first grounded tick; `land_l3.txt`):

| | Stage 2 alone | 3B.1 | 3B.2 |
|---|---|---|---|
| stances moving > 2 cm DURING the stance | 178 | 187 | 186 |
| … > 5 cm | 23 | 24 | 25 |
| … largest | 12.6 cm | 15.9 cm | 14.3 cm |
| the leg SHORT of its foothold (the body outran the foot) > 5 cm | 0 | 9 (largest 10.4) | **1 (largest 8.1)** |
| a one-tick JUMP of the ball at the LIFT-OFF > 5 cm | 0 | 2 | **17 (largest 8.4)** |

**What 3B.2 fixed.** The body outrunning the foot was the slide 3B.1 added, and 3B.2's job: 9 → 1 stances. It now keeps the pelvis within reach, or releases the plant.

**The worst case** is in moves, `CROQUETA 3/0.5@0.2` (3B.1: 13.3 cm): **48.7 cm**.
- The attacker's planted left foot is held with the other foot in the air (no support to release to) while the body turns 50° over it in 80 ms and outruns it by up to 27 cm.
- The drawn foot is screwed round and dragged below the turf.
- It is the two binds of §10 (3) together: a twist release was rejected (§12), and with no support a plant cannot be released. Search's worst rose 15.5 → 20.8 cm (`#87@0.5`).

**What it did not:**
- **In-stance drift is the canonical feet timeline's own,** the same count as Stage 2 alone: the heel's roll, pivots, the yaw offset relaxing in stance (§13). "Effectively zero" would need the canonical presentation changed. That is outside 3B.2 and frozen.
- **3B.2 added a defect: the release pop.** A plant released mid-stance jumps 5–8 cm in one tick when its heel rise is cut short (17 stances). Lifting the released foot flat removes it (17 → 2) but is worse on balance. It is the Lab's **3B.2 · FLAT RELEASE**; §12 and decision 2.

**5. Leg overlap > 5 cm** (ticks with any leg pair of the two bodies > 5 cm into each other):

| | review (37) | matrix (52) | 114 | moves (352) | search (235) |
|---|---|---|---|---|---|
| Stage 2 · OLD · **3B.1 → 3B.2** | 849 · 597 · **227 → 153** | 1401 · 862 · **335 → 123** | 2547 · 1540 · **567 → 290** | 5633 · 4546 · **2105 → 1866** | 3193 · 2995 · **1845 → 1394** |
| deepest (cm) | **22.4 → 17.3** | **22.4 → 17.3** | **22.4 → 18.0** | **23.0 → 22.8** | **21.0 → 22.9** |

- **The reduction** is substantial on every set: −33 % / −63 % / −49 % / −11 % / −24 %.
- **The deepest is not reduced on the wide sweeps.** 3B.2 makes some families worse, by two mechanisms of its own:
  1. **An action ended late.** A committed landing found blocked only 40–70 ms before touchdown ends its action, but the two landing legs still pass through each other (`croq-win`; search `#81@0.6`: 0 → 28 ticks, 22.9 cm).
  2. **In-flight retiming that delays a landing while the bodies close.** In moves `BODY_FEINT 2.4/−0.5@*` (6 phases), the defender's recovery step is re-aimed or retimed 7 times (+30 ms twice). It stays in the air, and the thighs, above the corridor's check, meet: **7 → 88 ticks, 12.7 → 22.7 cm, both players now fall candidates**. Search `#27@0.4` is the same: 11 → 87 ticks.

  These are the first things to fix (answer 11).
- **The torso** shows 2 ticks of 5.2 cm (`headon-jog` ±m), against 0 under 3B.1.

**6. Crossed legs, classified** (ticks (events); erroneous ✗; `cross_*.txt`):

| 114 set | Stage 2 | 3B.1 | 3B.2 |
|---|---|---|---|
| ✗ impossible self-intersection | 685 (40) | 1129 (49) | **916 (45)** |
| ✗ recovery on the wrong side | 0 | 2 (2) | **24 (2)** |
| ✗ limb pushed across | 0 | 3 (1) | **2 (2)** |
| legitimate: transient passage | 37 (9) | 18 (4) | 101 (15) |
| legitimate: authored crossover | 68 (6) | 153 (8) | 187 (10) |
| **erroneous** | 685 (40) | **1134 (52)** | **942 (49)** |

Erroneous crossings: 114 −17 % (1134 → 942) · matrix −6 % (407 → 384) · **review +25 % (293 → 367)**.

**Why they rose under 3B.1, and what 3B.2 changes:**
- **Almost all erroneous crossings are the canonical body's own self-intersections.** The gait turns over planted feet, and the next swing passes through the planted leg. They are already in Stage 2.
  - Under 3B.1 they rose because contacts started more episodes and re-plans.
  - **While Stage 3 acts** on a player, 3B.2 lowers them (114: 1080 → 814 ticks).
  - **After an episode**, where 3B.2 has ended an action and the gait re-plans from there, they rise. On the review set this is net worse: 293 → 367 erroneous.
- **Recovery on the wrong side, caused by placement: 2 events remain,** `croq-between` ±m, 12 ticks, 13 cm.
  - The step was placed on its own side and re-aimed once in flight for a crossover.
  - The **facing was then re-planned inside the 0.13 s lock**: the body turned 40° (−29° → +11°) while the step was in the air, so the planted feet ended crossed under the new facing.
  - Under 3B.1 this case had none. Its 2 wrong-side events (`x60-jog` ±m, 1 tick) are gone.
- **"No increase in unexplained crossed-leg events" is met on the matrix and the 114 set, not on the review set.** None of them is cosmetic-ruled away.

**7. Boot ↔ boot** (`boots_*.txt`; boot pairs deeper than 2 cm, the bodies as drawn):

| 114 set | 3B.1 | 3B.2 |
|---|---|---|
| SWING boot against a boot (ticks (episodes)) | 557 (79) | 571 (100) |
| LANDING | 348 (55) | 325 (62) |
| PLANTED ↔ PLANTED | 765 (27) | 760 (29) |
| BALL CONTEST | 287 (39) | 256 (37) |
| planted legs > 5 cm into each other | 66 ticks (8) · 9.2 cm | **10 ticks (4) · 6.1 cm** |

- **Swinging boots are now contacts.** They go through 3B.1's own solve, in the ledger: 83 applications on the 114 set. Episodes are more numerous and shorter.
- **They still reach 9 cm.** A thin, fast boot passes another within 1–2 ticks; only continuous (swept) collision would catch that, and 3B.1 does not have it.
- **Planted ↔ planted is never moved.** It is reported with each player's support. The deepest planted *legs* fell 9.2 → 6.1 cm (the anchors, the pelvis within reach).
- **The ball contest is reported only.**

**8. NO_FEASIBLE_RECOVERY / TRIP_CANDIDATE / FALL_CANDIDATE.**
- **NO_FEASIBLE_RECOVERY fired 0 times on review, matrix and 114, and twice in the wide sweeps.** Both are FALL candidates, not trips:
  - **moves `BODY_FEINT 4.2/0.5@0.9`, the defender, at 1.68 s:** no reachable clear landing for either foot. All 89 candidates cross the player's own support leg, lie beyond the hip's reach, or are on the wrong side of the support foot.
  - **search `#15@1.4`, the attacker, at 2.97 s:** all 96 candidates cross the player's own support leg, lie on the wrong side, or are across the midline.

  In both, the body has turned over its support so far that the free foot cannot get past it. It is the player's own geometry, not the opponent's: a fall, not a trip. During development NO_FEASIBLE also fired at strikes' instants, where the legs are entangled for a few ticks; that was a false trip, removed by the 80 ms grace.
- **The fall candidates are Stage 3's own classes,** placed by 3B.2: **114 set 26 → 16** (review 6 → 8, matrix 14 → 8).
  - **15 went away:** 3B.2's steps catch them.
  - **5 are new.** `in-croq` ±m, both players: the legs no longer pass through each other, so they collide (107 N·s instead of 30.6). And `croq-recover2-m`'s defender. §7 has the details.
  - **The wide sweeps:** moves 28 → **39** (15 gone, 26 new, 16 of them the `BODY_FEINT 2.4/−0.5` family of answer 5 and 10 Croquetas at 2.4 m/s); search 46 → **37**.
  - **2 TRIP candidates** (`headon-jog` ±m, the attacker): the stepping foot is blocked by the defender's thigh (5.1 cm), by Stage 3's own blocked-leg rule. Under 3B.1 the 2 trips were `croq-recover2` ±m. Under 3B.2 that step is placed elsewhere and lands; the case is a capture runaway instead.
  - **14 capture-runaway fall candidates:** the nearest feasible step leaves 23–78 cm uncaught (§7 lists each with its numbers). They are the strong collisions: `in-croq` ±m both players, `croq-before` ±m, the crossing sweep at 90 / 120 / 150°, `croq-recover2` ±m.
  - **Each is preserved** as Stage 3's placeholder takes it: both roots, velocities, the capture state, both players' stances, the legs, every option and why it was rejected (3B.2's own snapshot in `W.b2.results`; Stage 3's `fall` record).
- **`PLANT OUTRUN, NO SUPPORT TO RELEASE TO` (183 on the 114 set)** is the other 3B.3 input. The hip leaves a planted foot's reach while the other foot is not down, so neither releasing nor holding is right. It is reported, not faked.

**9. Body Feint / Croqueta / Standing Tackle.**
- **Unobstructed: unchanged.**
  - One footballer, 105 canonical cases (13 Croquetas, 11 Body Feints, the whole vocabulary): **identical every tick** to Stage 2.
  - The milestone's regression: **all 10 suites identical** to its committed evidence (Croqueta LEG-WAVE V4 and the Body Feint ≡ their review builds, chains, Lab cards, sweeps, determinism, possession torture).
  - Every encounter is identical to Stage 2 up to the first physical contact: **review 37/37 · matrix 52/52 · 114 114/114 · moves 352/352 · search 235/235**.
- **Obstructed: chains recorded.** On the 114 set 3B.2 recorded **104** chains: AUTHORED TARGET → OBSTRUCTION → PATH → LANDING → HANDOFF.
  - **78** committed landings found obstructed were **kept**: ≤ 5 cm, or the yielding swing kept the action.
  - **26** actions were **ended by Stage 3's rule**, 18 after their decisive event and 8 before it:
    - **16 Standing Tackles:** `in-croq`, `croq-early`, `croq-recover`, `croq-recover2`, `carry-walk`, `carry-jog-l`, `bf-fake`, `both-committed`, each ±m;
    - **4 Croquetas:** `both-committed`, `croq-recover`, each ±m;
    - **2 Body Feints:** `bf-shoulder` ±m;
    - **4 planned moves:** `bf-fake`, `croq-before`, each ±m.
- **Decisive touches: 42 made under 3B.1 · 42 under 3B.2** (tackles 16 · 16). A touch already made stays made. 3B.2 never touches the ball or its authority.
- **Outcomes:** 107 of 114 end the same (possession, decisive touches, outcome). **7 end differently, all toward the attacker keeping the ball:**
  - `both-committed` ±m and `croq-recover2` ±m: CONTACT — DEFENDER RECOVERS becomes CONTACT — ATTACKER RECOVERS. The tackle still makes its touch. Its blocked landing then ends it at that event by Stage 3's rule (under 3B.1 the foot landed through the carrier's leg), so the defender's follow-through becomes a recovery, and the carrier establishes control first.
  - `x60-jog` ±m and `x120-jog`: the ball ends with the attacker, not the defender. No decisive touch is involved; the bodies come apart differently after the crossing.

  **This is a gameplay consequence of 3B.2's physics, not a ball rule.** It deserves your eye in the Lab (decision 4).

**10. Momentum, energy, invariants.**
- **3B.1 untouched:** its unit invariants rerun on this branch (energy, bound, pairing, rotation, mirror, determinism, tangential): **all 0**.
- **The ledger, every run:** Stage 3 took exactly its impulses (≤ 1.4e-14 N·s), pairing 0, bound 0, **energy gained 0 J**. That includes the 83 boot applications, which go through the same solve.
- **No new forward energy.** 3B.2 adds no impulse of its own. Its only body-level act, holding the pelvis within reach, removes displacement.
- **Determinism:** 114/114 run twice, identical (every joint, every decision).
- **Rotation (37°):** 6/6 with the same 3B.2 decisions, releases, steps and classes.
- **Mirrors:** 42 of 57 pairs with the same decisions. **The mirror rows are not exact mirrors in the world:** the canonical motion is not mirror-symmetric, and a mirrored joint differs by up to 26 cm before any contact (3B.1's finding). The limb layer's own mirror invariant is exact (0 / 2000).
- **Identity against the frozen 3B.1** up to 3B.2's first act: review, matrix and 114 all identical. On moves it is 347/352. In 5 cases, a step 3B.2 placed "as wanted" (same place, yaw and time as Stage 3's) is drawn up to 4 mm differently one tick before the next recorded act. All of them are after the first contact.

**11. Is 3B.2 strong enough to be the foundation for 3B.3 (trips, multi-step stagger)?**
**Not yet. The layer is the right one, but three of its own behaviours must be settled first.**

**What is already right:**
- **It answers 3B.3's question.** "Where can this foot go", with every rejection's reason.
- **It names the cases where nothing is reachable** instead of faking a step: NO_FEASIBLE with the state preserved, plants outrun with no support.
- **It sits correctly in the order.** It touches no impulse and nothing before contact, and every invariant holds.
- **It cuts the overlap substantially on every set.**
- **Its two failure inputs are exactly 3B.3's subject:** a foot blocked by the opponent's leg (trip), and a body outrunning its support (stagger).

**What must be settled before 3B.3 builds on it:**
1. **In-flight retiming must not keep a landing in the air while the bodies close** (answer 5's second mechanism: `BODY_FEINT 2.4/−0.5`, 22.7 cm).
   - 3B.3's multi-step staggers would multiply this.
   - **The likely fix:** forbid a later retime when the opponent's predicted body closes on the swing, and add the thigh to the corridor. It needs a measured pass.
2. **The release pop** (decision 2). A stagger layer releases and re-plants constantly.
3. **3B.1's reconcile drive** (decision 1, one line). Multi-step staggers postpone landings, which is exactly when the explicit step diverges (the 9.9 cm snap).

**And for 3B.3 itself:** predict a player whom Stage 3 is moving (decision 5). Today a defender being shoved is predicted where the plan would have taken them.

**What 3B.2 does not settle, and 3B.3 must not assume:**
- in-stance drift (the canonical presentation);
- the committed-vs-committed conflict before contact (answer 1);
- crossed legs after an episode (the canonical gait's re-plan).

## 1. THE FOUR STAGES, MEASURED (`metrics_*.txt`; the bodies as drawn)

Stage 2 as decided · OLD Stage 3 · **3B.1 (calibrated F+M) → 3B.2**:

| | review (37) | matrix (52) | 114 | moves (352) | search (235) |
|---|---|---|---|---|---|
| ticks with a leg pair > 5 cm | 849 · 597 · **227 → 153** | 1401 · 862 · **335 → 123** | 2547 · 1540 · **567 → 290** | 5633 · 4546 · **2105 → 1866** | 3193 · 2995 · **1845 → 1394** |
| deepest leg (cm) | 22.7 · 22.7 · **22.4 → 17.3** | 22.7 · 22.7 · **22.4 → 17.3** | 23.0 · 22.7 · **22.4 → 18.0** | 23.3 · 22.9 · **23.0 → 22.8** | 22.9 · 23.0 · **21.0 → 22.9** |
| crossed-leg ticks (Stage 3's instrument) | 379 · 487 · **388 → 519** | 285 · 436 · **498 → 512** | 790 · 1031 · **1305 → 1230** | 2070 · 3431 · **4256 → 3348** | 4165 · 4744 · **5128 → 4312** |
| fall candidates (OLD · 3B.1 → 3B.2) | 7 · **6 → 8** | 14 · **14 → 8** | 24 · **26 → 16** | 40 · **28 → 39** | 54 · **46 → 37** |
| planted-foot slide, largest (cm) | 11.8 · 11.0 · **13.1 → 11.6** | 11.8 · 11.0 · **13.1 → 11.6** | 12.6 · 11.0 · **15.9 → 14.3** | 24.2 · 24.7 · **24.1 → 48.7** | 15.0 · 14.8 · **15.5 → 20.8** |
| joints > 15 m/s | 1781 · 1547 · **1509 → 1404** | 1996 · 1861 · **1770 → 1781** | 4385 · 4283 · **4334 → 4025** | 19582 · 21202 · **21112 → 20590** | 18144 · 18590 · **18726 → 19386** |
| 3B.1 landing snaps (largest, cm) | **4 (0.8) → 3 (9.9)** | **5 (1.8) → 10 (9.9)** | **11 (1.8) → 10 (9.9)** | — | **40 (10.1) → 29 (8.1)** |
| stuck seconds | 0 · 0 · **0 → 0** | 0 · 0.1 · **0.1 → 0** | 0.2 · 0.5 · **0.1 → 0** | | |

**By leg region (review, ticks > 5 cm, 3B.1 → 3B.2):**
- thigh–thigh 203 → 129;
- thigh–shin 90 → 52;
- shin–shin 46 → 19;
- foot–leg 40 → 34;
- torso 0 → 2 (5.2 cm, `headon-jog` ±m).

**The landing snap of 9.9 cm** is 3B.1's reconcile drive (§13, decision 1). It appears once 3B.2 postpones a landing by a few ms.

## 2. HOW 3B.2 CHOOSES A RECOVERY LANDING (§1 – §3)

The order of the layers is the one you set: **Stage 2 occupancy → the frozen 3B.1 contact physics → Stage 3's balance classification → 3B.2's feasible placement.** 3B.2 never touches an impulse. Stage 3 still decides *whether* a player must step and how much the step has to catch. 3B.2 decides *where the foot can actually go*.

**When.** Only when Stage 3 is about to plan a recovery step, with none in flight. Every tick Stage 3 hesitates in between reuses the last placement for 4 ticks instead of searching again.

**The options.** Stage 3's own per-foot options, computed exactly as Stage 3 computes them, for *both* feet:
- the base: where the gait would have landed;
- the landing time;
- the capture requirement at that time;
- Stage 3's reach limits;
- the place Stage 3 wants.

3B.2 can therefore place either foot. The choice between feet stays Stage 3's own preference order, applied to the placed options.

**The candidates**, nearest to the wanted landing first:
- the wanted landing;
- the line back toward the gait's own landing (a shorter adjustment);
- rings around it: 3, 6 and 9 cm in 16 directions, and 12, 16, 20, 25 and 30 cm in 8 (shorter, longer, wider, narrower, ahead, behind). That is 96 candidates, evaluated nearest first and bounded at 96 evaluations, 24 per retiming.

**Each candidate is checked against** (the rejection reason is recorded and shown in the Lab):

| check | rule |
|---|---|
| the own support foot | on its own side by ≥ 8 cm and a foot apart (16 cm), measured both against where the other foot stands **now** and where it will be at the landing; never across the body's midline further than the gait's own landing |
| reach | Stage 3's reach rules (from the root and the hip at the landing), then the leg itself: the hip at the landing, lowered ≤ 7.5 cm (the canonical support rule), within 0.985 × the leg |
| hip / knee range | the landing leg solved from the hip: flexion −30 … 125°, abduction −30 … 45°, knee 0 … 150° — never worse than the gait's own landing at that moment |
| foot yaw | within 50° of the facing |
| ground | the ankle at its height |
| the opponent's legs over the landing | his legs **predicted** over −40 … +120 ms about the touchdown (the canonical body posed ahead on his present plan, Stage 1's volumes; the live drawn body now). What a placement controls is checked: the boot (its sole, 9.5 cm across) over the whole interval, the shin's lower half about the touchdown, against his boots and shins. The knees and thighs go where the bodies go: that is occupancy and limb contact (Stage 2 / 3B.1) |
| the own legs | the landing leg not inside its own planted support leg |
| the corridor | the boot and the lower shin (and the knee's half of the thigh) swept from the airborne foot (or its lift-off) to the landing, on a lift arc, the knee solved at 7 samples from the hip at that moment, through neither player's legs (his predicted, the own planted one) |
| the route | a corridor blocked where its end is clear is first routed: one waypoint 6 / 10 / 14 cm across the path, away from the obstruction, never across the own midline. It becomes the canonical swing's own waypoint (the landing stance's `swingIn`) |
| the job | the capture residual: what the landing leaves uncaught, by Stage 3's definition |

**The choice.** The nearest feasible landing that still does the job (a residual ≤ 3 cm, Stage 3's own bound). It is never a landing further away chosen for more clearance: clearance is a pass/fail check, not a score. If no feasible landing does the whole job, 3B.2 takes the feasible one that leaves the least uncaught, and Stage 3's own stagger / fall rule classes it.

**No feasible landing at all:**
- Within the first 80 ms, the support holds (`NO CLEAR LANDING YET`, Stage 3's rule when no foot can step). A leg caught at a strike's instant comes free within a few ticks.
- Likewise while the other foot lands within the blend window: that foot is the next support.
- After that, **NO_FEASIBLE_RECOVERY**. No step is manufactured. It is a **TRIP_CANDIDATE** when the opponent's legs close every way out, else a **FALL_CANDIDATE**. The whole physical state is preserved (both roots, velocities, Stage 3's u / pelvis / overflow / posture, both players' stances, the 3B.1 leg perturbations, both bodies' joints, every option and why it was rejected), and Stage 3's labelled fall placeholder takes it as before.

**In flight (§3).** Every 2 ticks the step's remaining corridor and landing are checked against the newest prediction. If obstructed beyond 3 cm:
1. a route round the obstruction;
2. a shorter / wider / narrower landing within the leg's limits;
3. a modest retiming (± 30 / 60 ms);
4. another candidate.

A re-aimed step holds for 8 ticks unless it is clearly obstructed. Nothing changes within Stage 3's own 0.13 s lock before the landing: the canonical body blends a foot to a new landing over 0.12 s, and a later edit lands unblended, its offset then relaxing in the stance as a twisted, sliding planted foot (measured).

A landing always remains: if no alternative exists, the least obstructed is kept and reported. No foot is snapped, teleported or left hovering, and the opponent is never moved.

**How a change is applied: a plan fork.** The change becomes a new version of the plan the player is running. The action, path, touches and channels are shared, the stances copied, and it is adopted as the canonical planner adopts its own. Every body's already-resolved swings are carried over; only the swing into or out of the changed stance is rebuilt.

A fork that changes nothing was measured to change nothing (identical to 3B.1 on every measure). The first version re-planned instead, and a re-plan re-decides the whole action: it was not transparent (+33 % legs > 5 cm from forks that changed nothing). The swings in flight must be carried, exactly as Stage 2 learned.

## 3. PLANTED FEET AS ANCHORS (§4)

**What already held.** Stage 2 never moves a planted stance: an occupancy push moves the root path and the *future* footholds only. Neither Stage 3 nor 3B.1 moves a planted foot's place.

**What made a planted foot slide in 3B.1** (measured on the drawn ball of the foot, against its first grounded tick):
- **the body outrunning the foot.** Stage 3 moved the pelvis further than the planted leg reaches. The leg was then drawn short of its foothold: the "slide" was the leg's shortfall. Largest 10.4 cm (`croq-win`, the defender's recovery stance);
- **the canonical feet timeline itself.** The heel's roll, pivots, and the yaw offset relaxing in stance (§13). It is present in Stage 2 alone: on the 114 set, 178 stances move > 2 cm during the stance and 23 > 5 cm, largest 12.6 cm.

**What 3B.2 adds:**
1. **The pelvis is kept within the planted leg's reach.** Stage 3's pelvis displacement is cut where it would take the hip beyond the planted leg (`PELVIS HELD WITHIN THE PLANTED LEG'S REACH`). The remainder goes to Stage 3's overflow: its step or its fall candidate.
2. **A plant the hip is about to outrun is RELEASED, not dragged.** Its stance ends now (toe-off) and the foot becomes the next step. The rules:
   - only where the interaction made the plan: Stage 3 acting, a recovery stance, or a landing 3B.2 placed;
   - only a real drag: beyond the leg by > 1.5 cm where the stance would end;
   - only if the other foot can take the body (down, or landing within 0.12 s). Otherwise the plant is held and reported as `PLANT OUTRUN, NO SUPPORT TO RELEASE TO (3B.3 input)`.
3. **A known defect of the release:** it ends the stance at once. The canonical heel rise spans the last 55 % of a stance, so a stance cut short mid-stance pops its heel, and the drawn ball of the foot, 5–8 cm in one tick. The measured alternative (lift the released foot flat) removes the pop, but it is worse on balance: see §12. Both are in the Lab.

**The measure splits the drift in two:**
- **DURING the stance:** the foot is still planted on the same stance 2 ticks later;
- **at the LIFT-OFF:** the one-tick jump of the ball in a stance's last 2 ticks, which is how a stance cut short shows.

## 4. BOOT ↔ BOOT AND PLANTED ↔ PLANTED (§5)

**The volumes.** Stage 1's foot volume is a capsule along the foot's long axis. 3B.2 adds a **boot sole**: heel → toe, radius 4.5 cm, as drawn.

**The four classes, kept separate:**

| class | what 3B.2 does |
|---|---|
| **SWING** (a swinging boot against any boot) | resolved through **3B.1's own solve** (`LM.solveContacts`, unchanged): the swinging limb's closing is the source, the impulse paired, bounded and energy-non-increasing, in the ledger like every 3B.1 application. The swinging foot deflects (the solve's yield); nothing is moved positionally |
| **LANDING** (a boot within 60 ms of touchdown) | the landing check (§2) keeps recovery landings out of his boots; ordinary and committed landings are reported (§12 says why they are not moved) |
| **PLANTED ↔ PLANTED** | **never moved.** Reported, with each player's support: an anchored conflict is a support consequence (3B.3's input), not a placement |
| **BALL CONTEST** (both boots at the ball) | reported only: the ball and its authority are untouched |

**A limit:** thin, fast boots pass each other within 1–2 ticks at 240 Hz. Catching every such pass needs continuous (swept) collision, which 3B.1 does not have.

## 5. AUTHORED ACTIONS (§7)

**Before any obstruction, 3B.2 does nothing to an authored action.** Body Feint, Croqueta and Standing Tackle are drawn exactly as authored:
- one footballer, 105 canonical cases: identical every tick;
- every encounter is identical to Stage 2 before the first physical contact (§9).

**A committed landing the opponent blocks:**
- **≤ 5 cm into his boot / shin:** the action continues. Its swing yields where it meets the leg (3B.1), and the obstruction is **reported**.
- **beyond 5 cm, or its swing passing > 5 cm through him, with no route:** the action **ends by Stage 3's own interruption rule**:
  - `TECHNICAL EVENT COMPLETES, RECOVERY REPLACED` if its decisive event has been made (**a decisive touch already made stays made**);
  - `INTERRUPTED BEFORE TECHNICAL EVENT` otherwise.
  - The foot is then Stage 3's to recover and 3B.2's to place.
- **The ball and its authority are never touched** by 3B.2.

**Every deviation is recorded as your chain** (Lab diagnostics; `metrics_*.txt`, COMMITTED DEVIATIONS):

AUTHORED TARGET (where the author put the foot) → PHYSICAL OBSTRUCTION (what, how deep, when) → ALTERNATIVE FOOT PATH (the yielding swing, or the body's re-placement) → LANDING → RETURN / HANDOFF (the stance it lands on, or Stage 3's interruption and the recovery that replaces it).

## 6. CROSSED LEGS — THE CLASSES (§6; `tools/b2_cross.mjs`)

**A crossed tick** is Stage 3's instrument: a player's feet across each other's line by > 5 cm in the pelvis frame. Each crossed **event** (consecutive crossed ticks of one player) takes the first class that applies:

| class | erroneous? | what it means |
|---|---|---|
| IMPOSSIBLE SELF-INTERSECTION | ✗ | the player's own legs inside each other (thigh / shin / boot > 2 cm; the thighs' upper halves, the hips, excluded) |
| RECOVERY ON THE WRONG SIDE | ✗ | both feet down and crossed, one of them on a recovery step's stance. Either the recovery was placed across, or the gait's next foot landed across the recovery foot |
| LIMB PUSHED ACROSS | ✗ | 3B.1's yield displaced one of the feet > 2 cm during the event |
| TRANSIENT PASSAGE | legitimate | one foot swinging past the other, ≤ 50 ms, no self-intersection |
| AUTHORED CROSSOVER | legitimate | the canonical plan's own stances crossed (the gait's, a technique's): the motion as authored |

**Per set (ticks (events)):**

| | Stage 2 | 3B.1 | 3B.2 |
|---|---|---|---|
| **review** — erroneous · legitimate | 273 (13) · 106 (4) | 293 (13) · 95 (5) | **367 (21)** · 152 (11) |
| **matrix** — erroneous · legitimate | 266 (15) · 19 (5) | 407 (15) · 91 (6) | **384 (19)** · 128 (9) |
| **114** — erroneous · legitimate | 685 (40) · 105 (15) | 1134 (52) · 171 (12) | **942 (49)** · 288 (25) |

**The longest erroneous events under 3B.2** are all canonical self-intersections:
- `x30-jog` ±m: 53 ticks, 17 cm;
- `croq-recover2` ±m: 45 ticks;
- `static-walk`: 39 ticks;
- `croq-early` ±m: 38 ticks.

`static-walk` is the same under 3B.1. In the others the gait re-plans after an episode and turns over a planted foot.

## 7. EVERY FALL / TRIP CANDIDATE (§10; the 114 set; `metrics_l3.{txt,json}`)

**NO_FEASIBLE_RECOVERY: 0** (review, matrix, 114). Every candidate below is Stage 3's own classification of a step that 3B.2 placed or found blocked:

| case | player | at | severity · impulse | class | why |
|---|---|---|---|---|---|
| `headon-jog` | attacker | +1.01 s | SEVERE · 42.7 N·s | **TRIP** | the stepping foot (R) is blocked by the opponent's THIGH_L |
| `croq-before` | defender | +1.80 s | SEVERE · 26.4 N·s | capture runaway | the nearest feasible step leaves 29 cm |
| `in-croq` | defender | +0.56 s | SEVERE · 81.8 N·s | capture runaway | one step leaves 23 cm, the next would need 52 cm |
| `in-croq` | attacker | +0.56 s | SEVERE · 84.8 N·s | capture runaway | one step leaves 23 cm, the next would need 53 cm |
| `headon-jog-m` | attacker | +1.01 s | SEVERE · 42.7 N·s | **TRIP** | the stepping foot (L) is blocked by the opponent's THIGH_R |
| `croq-before-m` | defender | +0.48 s | SEVERE · 77.8 N·s | capture runaway | the nearest feasible step leaves 78 cm |
| `in-croq-m` | defender | +0.56 s | SEVERE · 81.8 N·s | capture runaway | one step leaves 23 cm, the next would need 52 cm |
| `in-croq-m` | attacker | +0.56 s | SEVERE · 84.8 N·s | capture runaway | one step leaves 23 cm, the next would need 53 cm |
| `croq-recover2` | attacker | +1.67 s | SEVERE · 63.3 N·s | capture runaway | one step leaves 23 cm, the next would need 52 cm |
| `x150-jog` | attacker | +1.16 s | SEVERE · 50.3 N·s | capture runaway | the nearest feasible step leaves 25 cm |
| `x120-jog` | defender | +1.14 s | SEVERE · 94.2 N·s | capture runaway | one step leaves 28 cm, the next would need 62 cm |
| `x90-jog` | defender | +1.08 s | SEVERE · 73.6 N·s | capture runaway | one step leaves 23 cm, the next would need 50 cm |
| `croq-recover2-m` | attacker | +1.67 s | SEVERE · 74.3 N·s | capture runaway | one step leaves 30 cm, the next would need 69 cm |
| `croq-recover2-m` | defender | +0.52 s | SEVERE · 114.0 N·s | capture runaway | one step leaves 23 cm, the next would need 51 cm |
| `x150-jog-m` | attacker | +1.16 s | SEVERE · 50.3 N·s | capture runaway | the nearest feasible step leaves 25 cm |
| `x90-jog-m` | defender | +1.08 s | SEVERE · 73.8 N·s | capture runaway | one step leaves 23 cm, the next would need 50 cm |

**Under 3B.1 there were 26:** 24 capture runaways, and 2 trips in `croq-recover2` ±m (the stepping foot blocked by the defender's shin).

**15 went away.** 3B.2's placed steps catch them, and they are now STAGGER, RECOVERY STEP or CORRECT:
- `headon-jog` ±m, the defender;
- `oblique-firm` ±m, both;
- `croq-leg`, `croq-between`, the defender;
- `croq-before` ±m, the attacker;
- the crossing sweep's attackers at 90 / 120°;
- `x120-jog-m`, the defender.

**5 are new:**
- **`in-croq` ±m, both players (3B.1: CORRECT).** Under 3B.1 the legs passed through each other: 4 ticks > 5 cm, 2 limb contacts, 30.6 N·s. Under 3B.2 they do not (0 ticks > 5 cm), so they *collide*: 5 limb contacts, 107 N·s, both SEVERE.
  - Less interpenetration means more momentum exchanged. That is the physically right direction, and a real change of outcome.
- **`croq-recover2-m`, the defender** (3B.1: RECOVERY STEP).

**Each candidate's state is preserved** as Stage 3's placeholder takes it:
- both roots and velocities;
- the capture state (ξ, u, the overflow);
- both players' stances;
- the 3B.1 leg perturbations and both bodies' joints;
- every option and why it was rejected.

In the Lab they are on the timeline, and in the diagnostics panel with their numbers.

## 8. INVARIANTS, IDENTITY, THE LAB IN CHROME, PERFORMANCE

| check | result |
|---|---|
| **exact before physical contact** (both roots, the ball, the authority, every joint, every tick vs Stage 2 as decided) | review **37/37** · matrix **52/52** · 114 **114/114** · moves **352/352** · search **235/235**. 3B.2 never acts before the first contact |
| identical to the frozen 3B.1 up to 3B.2's first act | review 37/37 · matrix 52/52 · 114 114/114 · moves **347/352**: in 5, a step placed "as wanted" is drawn up to 4 mm differently one tick before the next recorded act, all after contact · search 235/235 |
| one footballer (the canonical vocabulary, 105 cases, 127,092 ticks) | **105/105 identical every tick**; 3B.2, 3B.1 and Stage 3 did nothing in any of them |
| the milestone's regression (`tackling_integration1/tools/milestone_regress.mjs`) | **ALL 10 SUITES IDENTICAL** to the committed evidence (`milestone_regression.txt`) |
| 3B.1's unit invariants on this branch | energy 0 · bound 0 · pairing 0 · rotation 0/6000 · mirror 0/2000 · determinism 0/2000 · tangential 0/2000 · drawing 0.0047 mm (`unit_invariants_3b1_solve.txt`) |
| the ledger (114, every application incl. 83 boot contacts) | Stage 3 took exactly its impulses (1.4e-14 N·s) · pairing 0 · bound 0 · **energy gained 0 J** |
| determinism | 114/114 run twice: identical in every joint and every 3B.2 decision |
| the world turned 37° | 6/6 with the same decisions, releases, steps, classes |
| mirrors | 42 of 57 pairs with the same decisions: the canonical motion is not mirror-symmetric (up to 26 cm before contact; 3B.1's finding) |
| ball / possession | 3B.2 never writes the ball or the authority. Decisive touches 42 · 42; 7 of 114 end with a different possession (answer 9) |
| **the Lab in Chrome** (`browser.json`) | **33 / 34 checks pass.** Every case simulates and draws (129/129); every overlay, the 3B.2 · FLAT RELEASE comparison, the cameras, rates, frame step and loop work; **0 console / page / HTTP errors**. **Page ≡ node: 127/129** — `x120-jog` ±m differ (below) |
| performance (69 encounters, one core; `performance.txt`) | world step mean: Stage 2 106 · 3B.1 152 · **3B.2 251 µs**. The placement pass: idle 2 µs, active mean 499 µs (max 17 ms). Worst 60 Hz frame 29.7 · 36.0 · **37.9 ms**; p99 frame 4.9 · 5.9 · **8.1 ms** |

**Chrome ≠ node in `x120-jog` ±m** (`browser_x120_divergence.txt`):
- **The cause.** The first 3B.1 contact's λ differs by 1.7e-11 N·s between the two JavaScript engines' floating-point functions; that is in 3B.1 too, which it never changes. At tick 1012 two of 3B.2's candidate landings nearly tie: node takes "3 cm ahead-right", Chrome "3 cm right". The runs then part, and by the end the defender is a FALL CANDIDATE in node and CORRECT in Chrome.
- **Within one engine** every run is deterministic.
- **The implication.** Before cross-platform replays or lock-step networking, the candidate ranking needs a quantised tie-break (decision 6).

**Performance.** 3B.2 costs about 0.1 ms per tick per engaged pair on top of 3B.1. Its worst frame is 2 ms above 3B.1's. The search is bounded at 96 evaluations, 24 per retime.

## 9. DECISIONS FOR YOU

1. **3B.1's reconcile drive (frozen; one line).** Its explicit step diverges when a landing is postponed under ~10 ms (§13): the 9.9 cm landing snap in `carry-jog-l`. The fix (ω ≤ 1 / Δt, or the exact critically damped step) changes no accounting. **May I apply it?**
2. **The release pop.** Choose one:
   - keep the default (5–8 cm one-tick pops on 17 stances of 114);
   - take the flat release (no pop, worse on balance, §12);
   - ask for the proper fix: release ~60 ms earlier and let the heel roll run, which needs a new measurement.

   Compare `left=S3B2F&right=S3B2` in the Lab on `both-committed`.
3. **Committed against committed before contact** (answer 1, §10). Two authored landings aimed into each other cannot be changed before contact without breaking exact-before-contact. Choose one:
   - accept the residual (17 cm in `croq-win`);
   - allow 3B.2 to end, before contact, a committed action whose landing its prediction finds blocked by the other's committed landing. That is one bounded exception to identity, and it would show in `b2_identity`.
4. **The 7 outcome changes** (answer 9): the tackle ended at its blocked landing, and the attacker keeps the ball more often. Physically consistent, but it is gameplay. Please look at `both-committed` and `croq-recover2` in the Lab.
5. **For 3B.3: predict a player whom Stage 3 is moving.** Add Stage 3's own displacement (u, the overflow) to the opponent's predicted legs. Today a defender being shoved is predicted where the plan would have taken them.
6. **Later: a quantised tie-break in the candidate ranking** (cross-engine reproducibility, §8).
7. **The next step I propose: 3B.2.1, before 3B.3.**
   - bound the in-flight retiming (no delay while the opponent's predicted body closes on the swing);
   - add the thigh to the corridor;
   - your choice on the release (decision 2);
   - measured on the same sets, the wide sweeps included.

## 10. WHERE YOUR REQUIREMENTS ARE MUTUALLY IMPOSSIBLE (§9)

1. **Exact before contact + authored motion unchanged until the interaction requires it, against no landing through an opponent.**
   - **Where:** two committed landings aimed into each other before any contact (`croq-win` / `both-committed`).
   - **The conflict:** the conflict is visible to the prediction 0.3 s early, but nothing may change before contact. After contact only 40–70 ms remain, inside the blend.
   - **Result:** 17.3 cm. Decision 3.
2. **No foot snap, against avoiding an obstruction that appears in the last 0.13 s.**
   - **Why:** the canonical body blends a foot to a changed landing over 0.12 s. A change later than that lands unblended, and its offset relaxes in the stance as a twisted, sliding planted foot (measured: worst slide 13.1 → 23.9 cm when 3B.2 still edited late).
   - **Result:** 3B.2 does not change a landing in its last 0.13 s, so an opponent who moves into it then is met.
3. **Planted drift ≈ 0, against "do not move planted feet", against Stage 3 moving the body while the other foot is not down.**
   - **The bind:** releasing the plant would leave no support; holding it drags the foot or shortens the leg.
   - **Result:** 3B.2 holds the pelvis within reach (Stage 3's overflow takes the rest) and reports `PLANT OUTRUN, NO SUPPORT TO RELEASE TO` (183 on the 114 set). It is 3B.3's input.
   - **What remains:** the leg is short by > 5 cm in 1 stance of 114 (8.1 cm).
4. **Mirror invariance, against the canonical motion.** The mirrored encounters are not mirrors before contact (up to 26 cm), so their outcomes can differ. The physics' own mirror invariance is exact.
5. **Ordinary gait landings clear of the opponent, against fewer overlaps (with today's occupancy).** This is not strictly impossible, but measured:
   - moving gait landings clear made the overlap worse (+75 %);
   - the feet that meet first are what hold the bodies apart.

   Until body occupancy can hold planted legs apart, ordinary landings into the opponent are reported (8 of 1028 on the matrix > 5 cm), not moved.

## 11. NOT DONE (your instruction)

- **Not built:** trips, falls, ground contact, get-up; the shoulder duel; Astra's A99 gait (not imported); any change to the canonical locomotion. Stage 3's fall placeholder is unchanged.
- **The 3B.1 formulation (F+M):** untouched, including its reconcile drive (decision 1).
- **Nothing frozen, merged, pushed or published.**

## 12. WHAT WAS TRIED, MEASURED AND REJECTED (the default is the measured one)

Every component was switched on alone and together, against 3B.1, on the 52-case and the 114-case matrices (`tools/b2_ablate.mjs`). Noise floor: a 1 µm change to 3B.1's tolerance moves the 37-case totals by ≤ 2 ticks (`b2_noise.mjs`), so the differences below are real consequences, not chaos.

**Moving ORDINARY gait landings clear of the opponent: rejected (worse).** It reached up to +75 % legs > 5 cm and more crossed legs. The mechanism is visible in `headon-both-away`. In 3B.1 the two walkers' feet meet first, and that small foot / shin contact (0.67 N·s) pushes the bodies apart. With the feet moved clear, the bodies close further, and their planted thighs end up 9 cm inside each other, which no stage may push apart (anchors).

Moving a gait landing a few centimetres is not a placement fix while body occupancy cannot hold planted legs apart. Obstructed ordinary landings are **reported** (each with its obstruction, in the Lab and the diagnostics), not moved.

**Moving a COMMITTED action's landing (≤ 15 cm): rejected (worse).** It reached +25 – 40 % legs > 5 cm and more fall candidates. An authored action is one piece. In `in-croq` (a tackle into a Croqueta) the Croqueta's and the tackle's plants were moved 6 – 12 cm, their later authored sweeps and touches then met the defender's legs, and the overlap went 4 → 34 ticks with 3 new fall candidates.

**Instead: a committed landing genuinely blocked ends its action.** The landing must be > 5 cm into his boot / shin, or its swing must pass > 5 cm through them, with no clear way. The action ends by **Stage 3's own interruption rule**: after its decisive event if that comes first (`TECHNICAL EVENT COMPLETES, RECOVERY REPLACED`), else `INTERRUPTED BEFORE TECHNICAL EVENT`. The foot is then Stage 3's to recover and 3B.2's to place. A decisive touch already made stays made, and the ball is untouched. This is the largest single gain: legs > 5 cm −55 % / −69 % (114 / 52 cases).

**The post-recovery own-side guard: rejected (worse).** After a recovery step it held the gait's next landing on its own side absolutely. It produced more crossed legs, not fewer: 538 vs 505 on the review set, 628 vs 607 on the matrix.

**Releasing a plant twisted beyond 65°: rejected.** It did not remove the twist it was meant for (§4: that is the presentation's own yaw relaxation in stance), and it moved other cases.

**Bugs found in 3B.2's own machinery, each fixed and proven:**

- **Edits as re-plans** (the first version) re-decided the whole action: a re-plan is not a landing edit. A fork that changed nothing still changed the run (+33 % legs > 5 cm). **Fix:** the plan fork carries every swing already resolved; only the changed swing is rebuilt. A no-op fork now changes nothing.
- **A stale prediction.** Kept by the plan object, it missed Stage 2's in-place edits (root shifts, moved footholds). Whichever evaluation came first decided what later ones saw, so reporting alone changed outcomes. **Fix:** the prediction is a function of the plan (the ball from the plan's own start, no input lead), kept only while the plan is unedited (its stance lists, its root shift, his ball contacts). Reporting is now **pure**: on / off, identical on the review set.
- **Shared check schedules.** A stance is an ordinary landing before a move commits and a committed one after. With one schedule, ordinary reporting decided when the committed check ran. **Fix:** separate schedules.
- **Late in-flight edits.** The monitor first re-aimed up to 12 ms before touchdown. A landing changed within the canonical body's 0.12 s blend lands unblended, its offset relaxing in the stance as a twisted, sliding planted foot. **Fix:** never within Stage 3's own 0.13 s lock. The worst slide fell 23.9 → 13.1 cm.
- **NO_FEASIBLE on the impact tick.** At a strike's instant the legs are entangled for a few ticks, so no corridor is clear and the first version declared no recovery at once. **Fix:** 80 ms of grace while the support holds. Measured, falls −12 and no NO_FEASIBLE on transient entanglement.
- **A wrong-side landing.** The other foot was measured only where it would be at the landing; its plan changed in between, so a step landed 8 – 68 cm across a foot that never left. **Fix:** both, where it stands now and where it will be.
- **A released plant pops the foot (found in the final evidence; NOT fixed, a decision for you).**
  - **The defect.** A release ends a stance now. The canonical heel rise spans the last 55 % of a stance, so a stance cut short mid-stance jumps to an almost full heel rise in one tick. The drawn ball of the foot moves 5–8 cm in that tick (`both-committed`, the defender, 1.413 s: 7.9 cm). It is 3B.2's own. It is most of the planted-foot "drift" that rose under 3B.2 (§3).
  - **The measured alternative:** a released plant lifts **flat** (`releaseFlat`, its stance's heel rise off), the Lab's **3B.2 · FLAT RELEASE**. On 114 cases (`evidence3b2/variant_flat_release/`) it removes the pop: lift-off jumps > 5 cm **17 → 2**, largest 8.4 → 5.0 cm.
  - **But it is worse on balance:**

    | measure (114 cases) | default | flat release |
    |---|---|---|
    | legs > 5 cm (ticks) | 290 | 313 |
    | fall candidates | 16 | 18 |
    | erroneous crossed-leg ticks | 942 | 968 |
    | joints > 15 m/s | 4025 | 4112 |
    | turf penetration | — | +4 % |

  - **Where it hurts.** `croq-recover` and its mirror: the defender's leg is pushed 20 cm across for 17 ticks, and the attacker becomes a fall candidate. A flat-lifted foot starts its swing lower and further back, so the leg reaches its target late: in-air shortfall > 10 cm in 26 of 46 such swings, against 13 of 44.
  - **The proper fix** keeps the push-off: release about 60 ms earlier and let the canonical heel rise run over that lead. It needs the release decision moved earlier and measured again; not attempted tonight.
- **Search cost.** An unbounded in-flight search reached 818 evaluations in one tick. **Fix:** bounded, nearest first. The worst 60 Hz frame fell 139 → 38 ms; 3B.1's own is 36 ms.

## 13. FINDINGS OUTSIDE 3B.2 (reported, not changed)

**3B.1 — the reconcile drive's integration is unstable close to a landing (FROZEN; your decision).** The drive pulls a leg's perturbation back at ω = max(18, 5 / τ) rad/s, with τ the time to its landing, by explicit Euler. That is stable only for ω·Δt ≲ 2, i.e. τ ≳ 10 ms. When the canonical planner postpones an imminent landing (here 1 ms → 17 ms), the drive runs several ticks at ω·Δt ≈ 5. The leg oscillates to the 25 rad/s cap, the ankle moves 7.8 cm in one tick, and the next tick's landing draws 9.9 cm onto its stance (`carry-jog-l`, 1.646 s).

It is the kinematic reconcile, not the momentum formulation: no impulse, no ledger entry changes. The fix is one line in `occupy3b/l3_limb.js` `drive`: ω ≤ 1 / Δt, or the exact critically damped step. It changes no accounting. Not applied: 3B.1 is frozen. 3B.2 makes it rarer, not absent: landing snaps 11 → 7 on the 114 set, but the largest is this 9.9 cm.

**The canonical presentation — a planted foot's yaw offset relaxes in the stance.** Outside the 99 pace (`accGait`), the feet timeline's yaw spring keeps running while a foot is planted. A foot that touches down with a yaw offset is turned about its ball over the next tenth of a second, and where the leg cannot follow the drawn boot swings round its ankle (the 23.9 cm "slide" in `croq-between`; the Croqueta turn step's 11 cm in Stage 2 alone). That is the canonical body (`vocab2/u_body.js`), unchanged. 3B.2 now triggers it rarely (no late re-aims).

**The canonical gait after an interaction twists the legs.** Most crossed-leg ticks in every stage are **self-intersections** of the canonical body, already 273 / 266 / 685 ticks in Stage 2 alone (review / matrix / 114 set). The body turns over planted feet, and the next step's swing passes through the planted leg. 3B.2 does not add a rule against it (no cosmetic rule, §6). Where it starts more of them after an episode (an action it ended mid-move, the gait re-planning from there), §6 counts them.

**Stage 3 — its fall placeholder carries a pending recovery step with the root.** During the labelled placeholder's fade a pending step's landing still moves with every root shift (Stage 3's `shiftPlan` carry). 3B.2's monitor keeps such a landing on its own side and clear. The placeholder itself is 3B.4's.

**The canonical swing after an interaction: legs that cannot reach, feet that skim the turf** (`tools/b2_swings.mjs`, `evidence3b2/swings_matrix.txt`). Already in 3B.1, measured on the matrix:
- of 1183 swings, **280** have the drawn leg more than 10 cm short of the feet timeline's target in the air (44 more than 25 cm, up to 1.7 m in Stage 3's fall placeholder);
- **351** have the ball of the foot skimming the turf for more than 5 cm (up to 1.5 m, at up to 25 m/s).

The swing target is a function of the plan. After a recovery or an interruption the plan's next landing can lie far from where the body is: the leg is drawn at full reach toward it, and the foot drags low. 3B.2 changes these numbers little (256 and 340 of 1128 ordinary swings). Its released plants follow the same pattern (26 and 10 of 46). It belongs to the canonical swing and to Stage 3's placeholder (3B.3 / 3B.4).

## 14. THE LAB (§11)

**http://127.0.0.1:8367/sandbox/visual/occupy3b2_lab.html** (local only). The 3B.1 Lab on 8366 is unchanged.

**The viewports.** Left STAGE 3B.1 (calibrated F+M) | right STAGE 3B.2. Both re-simulate from identical inputs. Either viewport can also show:
- **OLD STAGE 3**;
- **3B.2 · FLAT RELEASE** (the measured alternative for released plants, §12): `left=S3B2F&right=S3B2` puts the two release styles side by side. Try `both-committed` (the defender at 1.41 s) and `croq-before-m` (the attacker at 1.55 s).

In the URL: `?left=B:F%2BM&right=S3B2`, `left=S3` or `left=S3B2F`.

**The case list.** The lower-body problem cases come first, each directly selectable:
- the legs-landing-into-each-other (22.4 cm) cases;
- the recovery-step cases;
- the planted feet;
- boot ↔ boot;
- crossed legs;
- then your §8 stress cases, their mirrors and the world turned 37°;
- then the rest of the §10 matrix.

**The new overlays (3B.2 group):**
- **PLACEMENT** (`c`), at the decision in force for each player:
  - the candidate landings: ● feasible, ✕ rejected;
  - the ORIGINAL landing ◌ (the gait's / the author's);
  - the one WANTED ◎ (Stage 3's);
  - the SELECTED landing ● (green), with its tag (`ATT RECOVERY R → PLACED (MOVED) · RECOVERY STEP`);
  - the SWING CORRIDOR (the planned foot path) and a route's waypoint ◆;
  - the airborne foot's start ●.
- **PREDICTED LEGS** (`y`): the opponent's thighs, shins and boots as predicted at that landing's time (magenta, dashed), until just after the landing.
- **ANCHORS** (`a`):
  - every planted stance's place (□), filled orange for a recovery step's;
  - a released plant (⇡ cyan) with its reason (the hip would outrun it).
- **FOOT TRAILS** (`u`): each foot's drawn path over the last 0.5 s (right solid, left dashed).

**The frame data** carries, per player, the decision in force:
- what obstructed the landing;
- what Stage 3 wanted;
- what was chosen, and the residual it leaves;
- how many candidates were feasible, and **why the others were rejected** (counts per reason);
- releases, NO_FEASIBLE results and interruptions as they happen.

**The diagnostics panel (`d`)** lists the run's 3B.2 record:
- decisions by kind and result;
- every NO_FEASIBLE with its preserved state;
- every committed deviation as AUTHORED TARGET → OBSTRUCTION → PATH → LANDING → HANDOFF;
- released plants and boot contacts;
- the first 30 decisions and events with their times.

**The timeline** adds ◇ for a placement (green placed / moved, amber kept), ✕ for NO_FEASIBLE and ⇡ for a released plant.

**Unchanged from the 3B.1 Lab:**
- contact volumes, support polygon / centre of mass, balance, normals, impact vectors, Stage 3's recovery steps, trails;
- 3B.1's limb contacts, limb velocity, velocity parts, momentum passed, the approved reference leg;
- 1× / 0.5× / 0.25×, pause, frame step (`,` `.`, shift = one tick), loop, the eight cameras, skin / skeleton.

## FILES AND COMMITS

**Code (new files only; every tracked code file identical to `occupancy-3b1-calibrated-fm-1`):**

| file | what |
|---|---|
| `sandbox/visual/occupy3b2/b2_world.js` | `PlacementWorld` (a `LimbWorld` subclass); `RES3B2` holds every switch (comparisons off) |
| `sandbox/visual/occupy3b2/b2_geom.js` | the predicted landing leg, its volumes (Stage 1's + the boot sole), the corridor |
| `sandbox/visual/occupy3b2/b2_run.js` | `runB2`: S2D · S3 · S3B · S3B2; the rotated encounter |
| `sandbox/visual/occupy3b2/b2_cases.js`, `b2_lab.js`, `../occupy3b2_lab.html` | the Lab |
| `sandbox/visual/occupy3b2/tools/` | the measurements (§1–§8) and the diagnosis tools (HANDOFF.md lists them) |

**Evidence (`evidence3b2/`, the default):**
- `metrics_*`: the four stages, five sets;
- `land_*`: touchdowns, planted drift;
- `cross_*`: §6;
- `boots_*`: §5;
- `identity_*`: §9, five sets;
- `invariants.*`;
- `solo.txt`, `swings_matrix.txt`, `milestone_regression.txt`;
- `unit_invariants_3b1_solve.txt`, `performance.txt`;
- `lab_cases.json`, `browser.json`, `browser_x120_divergence.txt`;
- `variant_flat_release/`: the measured alternative release, the 114 set and the matrix's boots.

**Commits** (`prototype/player-occupancy-stage3b2`, local, not pushed):

| commit | what |
|---|---|
| `12a914ca` | WIP: the placement layer, the Lab, the tools |
| `e9d0524f` | the measured default: reports pure, the prediction a function of the plan, the search bounded |
| the report commit (HEAD) | the evidence, this report, the flat-release comparison (switch + Lab option), the drift split, `b2_solo`, `b2_swings`, status and handoff |

Stills stay in the scratchpad (real players' models). Nothing is pushed, merged, frozen or published. The daily publication of 25 Oct's work is due in the first session after 06:00 EET, 26 Oct.


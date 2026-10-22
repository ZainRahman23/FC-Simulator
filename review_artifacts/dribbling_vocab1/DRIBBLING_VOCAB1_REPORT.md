# DRIBBLING VOCAB-1 — morning report (overnight mission, 22 Oct 2026)

## ▶ PLAYABLES (LOCAL ONLY — the character is a real player's model)

### THE DRIBBLING LAB — http://127.0.0.1:8361/sandbox/visual/vocab1_lab.html

- **The gallery:** grouped by family, every technique with a card: name, status, AUTO / MANUAL, purpose, entry → exit, and a yellow **▶ PLAY**.
- **The replays:** each PLAY is a **deterministic curated replay**: exact initial conditions plus an input timeline, simulated by the same code as the node tests, so it is never a video.
  - It is shown where the move's purpose is obvious: an orange defender cone marks it.
  - It plays at **1× in the gameplay camera, looping**, from the approach through the decisive moment to the continuation.
- **Per card:** **MIRROR** (the left-footed twin), **L | R** (both side by side, synchronised), **AUTO** (the same state with no request: what B4 itself chooses), **REJECTED** (a deliberately invalid setup with the reason), **TRY** (play it yourself: the stick, then E).
- **The bar:**
  - **LOOP**, **1× / 0.5× / 0.25×**, **restart**; the replay bar's scrub, play / pause and frame step (the `.` and `,` keys);
  - **Camera:** gameplay · close side · front · rear · overhead · both (L | R);
  - **diagnostics**, off by default: the ball's and the body's paths, every contact with its foot and surface;
  - **AUTO ⇄ REQUEST**;
  - **CHAIN MODE:** pick a technique, an exit and a mode, then **BRANCH HERE** at any moment of the replay. The case is re-simulated from its exact start with that request added at that tick: a real technique → technique transition.
- **The CHAINS section:** 12 curated chains.
- **The info box:**
  - REQUESTED → PLAYED / REJECTED (with the ALTERNATIVE and the REASON);
  - the phase table: preparation · commitment · decisive · control returned · next action;
  - the contacts; possession;
  - the technique's difficulty dimensions and its future Dribbling envelope (NOT calibrated);
  - a phase timeline under the replay's cursor.

### THE UNIFIED JOYSTICK SANDBOX — http://127.0.0.1:8361/sandbox/visual/vocab1_sandbox.html

- **The player:** S99 · Acc99 D38 · A99-C (Agility scale B below 99) · D99 · BC99 · **CARRY-B** · CONTROLLED · EXPANDED.
- **Controls:** the joystick, SPRINT / sprint lock / WALK, the stick's walk / jog / run zones.
- **Automatic Technical Control:** B4 / B5 with the integrated library and the analog feint.
- **The MANUAL SKILLS palette:** 32 technical intents (the two EXPERIMENTAL ones, the roulette and the new heel chop, included). Click one, or select it and press **E**, while holding the stick toward the exit you want. The resolver decides the foot, the stride, the entry and the timing from the live state, or rejects it; the outcome shows in the bar.
- **Analog feints** can be switched off.

> I cannot play video in real time. Everything below was measured in the simulation (node and headless Chrome); how it **looks** at 1× is your review.

---

## 0. Owner decisions recorded first
- **AGILITY SCALE B** is selected as the provisional Agility curve below 99, with A99 = A99-C. Recorded in `physical_ratings_v1/STATUS.json`; no more A / B / C experiments.
- **Preserved:**
  - Sprint Speed 99 = 38.0 km/h and the approved mapping;
  - Acceleration 99 = D38 and its provisional mapping;
  - CARRY-B, the provisional D99 / BC99 ball-on envelope.
- **Not changed:** no physical rating was recalibrated, no input is delayed, and no movement capability was reduced to hide a body problem.

## 1. MOVEMENT — 150–180° / braking / reversal support (Phase 1)

This was measured on the sandbox's own player, ball on, posed every 1/240 s tick (`tools/v_extreme.mjs`).
- **The scenarios:** 120 / 135 / 150 / 165 / 180° from a jog, a run and a sprint, left and right, at 4 gait phases. Plus repeated reversals, stop → reverse, curve → reverse, sprint → reverse → accelerate, and 150° → 150° back.
- **How failures are classified:**

  | Class | What counts |
  |---|---|
  | **Normal-speed visible** | a jump > 20 cm in a tick · legs interpenetrating > 5 cm · no foot down > 0.25 s (> 0.14 s below 3 m/s) · a knee step > 30° · a planted support swapped > 3 cm |
  | **Slow-motion visible** | the smaller versions of the same |
  | **Diagnostic only** | slides, revised landings |

| | Before (the build tonight started from) | After |
|---|---|---|
| Runs with a **normal-speed-visible** failure | **126 / 140** | **45 / 140** |
| Normal-speed-visible events | 350 | 55 |
| — planted support swapped (one footfall, two identities) | 151 | **0** |
| — knee pops | 56 | 8 |
| — floats | 80 | 6 |
| — leg crossings | 62 | 39 (none deeper than 10.4 cm: the 14 – 15 cm ones are gone) |
| — jumps | 1 | 2 |
| Slow-motion-visible events | 788 | 228 |
| Missed contacts · CONTROLLED exits | 0 · 0 | 0 · 0 |
| BALL OFF (the same scenarios, no ball): runs with a normal-speed-visible failure (events) | 64 / 140 (90) | 49 / 140 (61) |

By entry (runs with a normal-speed-visible failure, before → after):

| Turn | JOG | RUN | SPRINT |
|---|---|---|---|
| 120° | 7/8 → **0/8** | 7/8 → **1/8** | 8/8 → **2/8** |
| 135° | 8/8 → **1/8** | 8/8 → **3/8** | 8/8 → **0/8** |
| 150° | 4/8 → **3/8** | 7/8 → **3/8** | 8/8 → **1/8** |
| 165° | 6/8 → **4/8** | 7/8 → **4/8** | 8/8 → **0/8** |
| 180° | 8/8 → **3/8** | 8/8 → **2/8** | 8/8 → **5/8** |

| Other scenarios | Before → after |
|---|---|
| Repeated reversals | 4/4 → **2/4** (19 → 3 events) |
| Stop → reverse | 2/4 → **2/4** |
| Curve → reverse | 3/4 → **3/4** (5 → 3 events) |
| Sprint → reverse → accelerate | 4/4 → **4/4** (12 → 5 events) |
| 150° → 150° back | 3/4 → **2/4** (14 → 2 events) |

**The fixes.** These are a small, reusable support vocabulary, not move-specific leg hacks. Astra's continuity principles are kept: persistent support identity, committed landings, trajectory-aware planning. Each was kept only when it measured better (`evidence/abl_morning.txt` switches the last seven off one at a time).
1. **ONE FOOTFALL, ONE SUPPORT** (`u_gait.js`).
   - **The cause** (the largest one): after a touch, the touching foot's next landing is committed. A technique re-planned at the same time added its own anchor for that same footfall, so the plan held two stances of one foot at one instant, and the body swapped supports 5–7 cm apart.
   - **The fix:** an anchor now *takes* the kept footfall, keeping its identity and adopting the technique's attributes while it is still in the air. If it is beyond a swing's reach (> 0.12 m), it is refused.
2. **HARD BRAKE** (`u_tc.js`). A technique entered above its speed range — a drag-back or Cruyff from a sprint — brakes **from the request** at the braking limit. Before, the body ran on at full speed for up to 0.75 s and braked at > 30 m/s² inside the technique's window, which caused the knee pops. This is not an input delay: the braking *starts* at the request.
3. **THE PIVOTING SUPPORT** (`u_gait.js` + `u_body.js`). A foot planted under hips that turn far over it pivots on the ball of the foot, never pointing more than 30° from the hips.
   - It is **recomputed by every plan** from the stance's own start (the past from the plans in force then, the future from this plan), the hips' angle over the foot followed **continuously**. Kept from the first plan that needed it, a reversal predicted clockwise and turned the other way pivoted the foot *away* from the hips (175°); the leg's solve flipped and the toe jumped 24 cm in a tick.
   - A pivoting plant may turn 10° a tick (5° elsewhere) to keep up with A99-C's whip.
4. **THE TURN STEP** (`u_gait.js` + `u_body.js`). A low-speed step taken while the hips turn more than 60° swings *around* the planted foot on its own side. Its route is kept even when that step also plays the ball; before, the touch's own swing replaced the route.
   - **It lands for the facing it will stand under** (the facing at its mid-stance, ≤ 0.2 s after touchdown), not the facing at touchdown — placed for the touchdown facing it ended on the centre line once the whip finished, and the next step crossed in front of it. Committed landings keep this when they are revised.
   - It lands ≥ 0.22 m to its own side of the other foot in that frame, **within 0.32 m of the hips** (clearing the braking plant threw it 0.47 m out, beyond the leg's reach), and **already turned toward the new facing** by up to 30°.
5. **THE SWING CORRIDOR AFTER A TURN** (`u_body.js`). Right after the hips have turned (> 15° in 0.25 s), a swinging foot keeps 0.20 m from the support instead of 0.14 m. Straight running is untouched.
6. **A CARRY TOUCH'S APPROACH ON ITS OWN SIDE** (`u_body.js`). The preparation key behind a carry touch lies along the impulse, 0.16 m back from the contact. For a touch played *outward* (the outside of the foot turning the ball to its own side), that put the foot 0.16 m to the far side of the contact, through the planted foot: the commonest crossing in the random torture. A key alongside the support now keeps ≥ 0.15 m on its own side; the contact itself is untouched.
7. **THE HEEL RISES FROM TOUCHDOWN** (`u_body.js`). A foot landing behind the hips (the root ahead of both feet at a reversal) needs its heel raised. It was raised 25 – 31° in its first planted tick, a 30 – 38° knee pop; it now rises ≤ 6° a tick from touchdown, with the ball of the foot on the turf. Stateless, so scrubbing the Lab draws the same pose.
8. **THE SET TOUCH'S LANDING HOLDS** (`u_tc.js`). The foot that sets the ball stays down until the standing foot's own landing, keeping ≥ 0.16 s to swing on. Its fixed 0.16 s left the shield roll and the short Cruyff 0.2 s with no support at walking pace.
9. **A FOOTFALL NEVER CROSSES THE ROOT'S LINE TO DODGE THE BALL** (`u_gait.js`). The shift that keeps a planted boot off the free ball's path stops 0.06 m on the foot's own side. After a croqueta the ball leaves across the landing foot's place; the shift put that foot 0.17 m on the wrong side, it was released 0.05 s later, and the body floated for 0.3 s.
10. **NO SET TOUCH BEYOND A COMMITTED TOUCH** (`u_tc.js`). The set-touch search predicts the ball rolling free. A carry touch already committed before it sends the ball elsewhere: an inside hook's left foot then reached 0.47 m across, behind the standing leg, for its set touch (the 14 – 15 cm crossings at run speed). Beyond a committed touch the technique rolls there or is rejected — its honest feasibility — and B4 chooses from what remains.

**Tried and reverted** (they measured worse):
- a replacement step (the wrong-side foot stepping twice): floats 5 → 23;
- a stricter set-touch reach: the weak-foot entries were lost;
- the turn step routed along an arc of three waypoints: random torture 103 → 109;
- the corridor judged in the turn step's landing frame (78 events vs 52), or ended before an anticipated landing (67 vs 52);
- anticipating only part of the whip (0.2 – 0.8 of it): all within noise on the extreme set, worse in the torture (273 – 279 vs 255 over 18 seeds);
- the fake stop's plant held to its push (it pinned the foot that makes the push: a 50 cm boot gap), or both feet re-timed (the move then started 0.22 s later).

**Remaining locomotion failures (not hidden):**
- **Crossings under A99-C's low-speed facing whip.** At a reversal's stop the facing turns at ≈ 1000 – 1200°/s. When a touch is due inside that whip, the frame turns about 140° within one step: the foot that must reach the ball and the foot returning to its own side cross. In the random torture, 23 of 75 carry crossings (12 minutes classified) happen with both feet in the air, typically in such a whip. **Fixing it needs a low-speed facing-rate limit**, an agility / physical decision (you said no physical recalibration), so it is left for you.
- **A 145° pivot sweeps the heel into the other boot** (7.8 cm) in 4 sprint-reversal runs. Before tonight's pivot fix those runs showed a 24 cm toe jump instead.
- **BALL OFF:** 49 / 140 runs (64 before tonight). Most of the rest are A99-C's ball-off floats (36 events, unchanged from before tonight); the turn-step anticipation costs about 3 runs there.

## 2. RESEARCH (the full report: `RESEARCH_TAXONOMY.md`, with its sources)

A research pass covered:
- coaching material: Coerver / Meulensteen sessions, TeamSnap, Mojo, We Make Footballers;
- reference articles: Wikipedia, Goal, ESPN;
- biomechanics: 16 change-of-direction and dribbling studies;
- match analysis: EURO 2021, EURO 2004, Opta, CIES.

**The findings that shaped the library:**
- **About 10 contact primitives** explain nearly every named move:
  - P1 carry push · P2 cut in front of the standing foot · P3 cut behind the standing leg · P4 hook;
  - P5 sole pull / roll · P6 transfer to the other foot · P7 no-contact fake · P8 same-foot double contact;
  - P9 heel · P10 stop / deaden.

  So the library is primitives plus parameters, not one animation per named trick.
- **Stepover vs scissors**, the clearest distinction in coaching:
  - **scissors:** the leg loops round the *front* of the ball from inside to outside, and the *other* foot's outside takes it away;
  - **stepover:** the foot passes over the front of the ball toward the midline, and the *same* foot's outside takes it back.
- **The sole family is one primitive.** Drag-back, V-pull, L-turn, pull-push and the roulette's first phase are one sole pull with a different follow-up contact.
- **The elastico's two touches "fuse into one".** The cue is guided and never pushed far.
- **The Matthews feint is Coerver's drag-push:** "push, hop, take".
- **How deceptive runners fake:** they exaggerate head, upper-trunk and foot movement and **minimise** the centre of mass's sideways movement. The body feint is built exactly so.
- **Biomechanics:**

  | Cut | Approach speed | Plant contact |
  |---|---|---|
  | 45° | 4.7 m/s | 0.16–0.24 s |
  | 90° | 3.8 m/s | 0.25–0.35 s |
  | 135° | 3.5 m/s | 0.39–0.50 s |
  | 180° | 3.4 m/s | 0.42–0.52 s |

  The braking happens on the penultimate step. This is why reversals from a sprint now brake from the request.
- **What elite players use:** changes of direction and pace, surface changes within a carry, kick-fakes and dummy steps, turns. Elasticos, roulettes and heel tricks are rare. This shaped the AUTO / MANUAL split in §4.

## 3. THE FULL VOCABULARY (the complete catalogue: `VOCABULARY.md`)

**43 catalogue entries:**

| Status | Count |
|---|---|
| INTEGRATED | 22 |
| REVIEW | 19 |
| EXPERIMENTAL | 2 |

**22 authored parametric techniques:**
- the locked baseline's five, untouched: Ronaldo chop, outside cut, Cruyff, inside hook, drag-back;
- **17 new**, in the same reference format: the right foot strikes, mirrored by the resolver, the turn angle is the request's;
- **plus** B4's one-contact families and the body feints.

Every one is reached from the live state — the foot on the stride, the ball where it is, the entry speed, the requested exit. CONTROLLED_BALL owns the ball, and every contact is a kernel launch from where the ball really is.

| Family | Actions / variants | Status |
|---|---|---|
| **CARRY / PACE** | carry · close carry · sprint carry · knock-on (push-and-run) · sole stop | INTEGRATED |
| **CUT / REDIRECT** | compact inside / outside redirect · outside cut · gather · urgent reach · inside hook · **outside hook (new)** · braking touch · braking pivot | INTEGRATED |
| **CHOP** | Ronaldo chop — normal, low-speed, sprint, mirrored; REJECTED from a jog (its hop needs ≥ 3.6 m/s) | INTEGRATED |
| **CRUYFF / BEHIND-BODY** | Cruyff — normal, running, mirrored · **abbreviated Cruyff (new intent: entered at its plant)** | INTEGRATED / REVIEW |
| **SOLE / DRAG** | drag-back · **L-drag (new, auto)** · sole roll | INTEGRATED / REVIEW |
| **LATERAL TRANSFER** | La Croqueta — normal, running, mirrored, pressure-escape | INTEGRATED |
| **FEINT** | **body feint · shoulder drop · hip fake (new, no ball contact)** · feint → outside cut · feint → inside cut · **Matthews (drag-push, new)** · the **analog feint** | REVIEW |
| **STEPOVER / SCISSORS** | **scissors · stepover · double scissors · scissors → continue (new)** | REVIEW |
| **ELASTICO** | **elastico · reverse elastico (new)** | REVIEW |
| **PULL / PUSH / V** | **V-pull (new, auto) · pull-push (new)** | INTEGRATED / REVIEW |
| **SPIN** | **roulette (new)** | EXPERIMENTAL — the right foot now lands under the body and the spin turns on it; the left foot's drag still crosses the legs (2 events) |
| **HEEL / SPEED CHANGE** | **hesitation (stall-and-go, new)** · **heel chop (new, with a HEEL contact pose)** | REVIEW · EXPERIMENTAL — the heel chop plays (normal, mirrored, rejected at a sprint) and its clips measure clean; EXPERIMENTAL until you have reviewed its heel pose at 1× |
| **STOP / HESITATION** | **deaden-and-explode · fake stop (new)** · sole stop | REVIEW / INTEGRATED |
| **PROTECTION / SHIELD TURN** | **shield roll-away (new)** · inside shielding turn (hook) · outside shielding turn (outside hook) · **the threat** (see below) | REVIEW / INTEGRATED |

**How the named moves are built** (`v_tech.js`):
- **Parametric builders:** `elastico(rev)` gives the elastico and its reverse; `solePull(kind)` gives the V-pull, L-drag and pull-push; `stopGo(kind)` gives deaden-and-explode, fake stop and hesitation; `withSetStep()` gives every move that opens with its support foot the striking foot's set step.
- **FREE techniques:** their exit is the request itself, 0° included (stop-and-go, scissors → continue).
- **Two-touch moves on one swing:** the elastico's and the Matthews' two touches are on one swing of one foot. The kernel plays both contacts from the real ball; the body draws the cue as a waypoint of the decisive swing.
- **The threat:** the review harness can supply a THREAT, a point on the pitch (`setThreat`, a recorded event). B4 then penalises solutions that leave the ball nearer the threat than the body, and credits the protecting ones. There are no force fields: the body has to place itself there. With a threat on the right, a jog reversal becomes a drag-back instead of a braking touch, and a 120° left becomes a Cruyff instead of an L-drag (Lab: PROTECTION → AUTO cases).

**Results of the curated cases** (`tools/v_cases_run.mjs`, the Lab's own runner):
- **79 cases + 12 chains (91 clips), 81 requests:** **75 PLAYED**. The 6 not played are exactly the 6 deliberate REJECTED setups, each with its reason:
  - drag-back at a sprint: "entry 9.7 m/s far above its 5 m/s";
  - scissors at 140°: "exit 140° beyond its 92°";
  - a right-foot elastico to the right: "the exit is on the wrong side for this foot";
  - roulette at a sprint, heel chop at a sprint: "entry 9.7 m/s far above its 4.2 / 6 m/s";
  - chop from a jog: "entry 3.2 m/s below its 3.6 m/s".
- **Possession and contacts:** 0 CONTROLLED exits, 0 missed contacts. The ball stays within 0.95 m of the body in every close technique; the pushes away (deaden-and-explode 1.81 m, the sprint chop, the knock-on) go further by design.
- **Control returns after the decisive contact** in 0.06–0.14 s (median 0.06; B5).
- **Body:** **11 normal-speed-visible events in 10 of the 91 clips** (21 in 17 of 88 at the start of the morning's support work):

  | Clip | Event |
  |---|---|
  | Roulette (experimental) | 2 crossings (10.3, 6.4 cm) |
  | Ronaldo chop at a sprint (the locked reference) | a 30.6° knee step |
  | Fake stop | a 0.22 s float (its authored timing, see the reverted list in §1) |
  | Braking touch · sole roll · feint → outside cut · Matthews (and mirror) · shield hook AUTO-2 · stepover → inside chain | 1 crossing each, 5.6 – 9.5 cm |

  The full list is in `VOCABULARY.md` and `evidence/cases.json`.

**All 39 requests × both feet from a right-footed player** (`v_battery.mjs`): **73 / 78 PLAYED** (the heel chop, new this morning, is covered by its curated cases, not the battery). The rest are honest rejections:
- scissors from a full sprint ×2;
- the left-foot Cruyff from a jog, the left-foot double scissors, the left-foot sole roll (its legs still cross).

## 4. AUTO / MANUAL — the recommendation, and why

**Principle:** a technique becomes automatic only when B4 can measure the football problem it solves better from the live state — a turn, a reversal, a sideways escape, the ball's accessibility, protection. Without defenders, deception has no measurable value. Expressive moves therefore stay MANUAL: they must never win by chance, and there is no `skillMoveChance`.

| | Recommendation | Reasoning |
|---|---|---|
| **AUTO** | carry, close carry, sprint carry, knock-on, compact inside / outside redirects, gather, urgent reach, braking touch, braking pivot, sole stop | The ordinary football of every possession: chosen continuously on the predicted outcome |
| **AUTO + MANUAL** | Ronaldo chop, Cruyff (+ abbreviated), inside hook, **outside hook**, drag-back, **L-drag**, **V-pull**, outside cut, La Croqueta, **feint → cut (also by the analog feint)**, body feint, **hesitation**, **deaden-and-explode**, the shield turns | Each solves a measurable problem better than a carry: a sharp protected redirect, a reversal, a lateral escape, a stop and relaunch. B4 picks them on outcome (see the survey below), and they can also be asked for. The sole moves were promoted after measurement |
| **MANUAL** | scissors, stepover, double scissors, scissors → continue, elastico, reverse elastico, Matthews, pull-push, shoulder drop, hip fake, sole roll, roulette, fake stop, heel chop | Their value is deception (a defender's reaction) or expression. They need an intent, not an automatic guess. They are also the rarest moves in elite play |

- **Changes from your starting hypothesis:**
  - the V-pull and L-drag are **AUTO + MANUAL**, because B4 now chooses them for 60–120° turns at a walk or jog;
  - the outside hook joins them;
  - pull-push stays MANUAL: a reset with no turn has no measurable value alone;
  - hesitation and deaden-and-explode are classed AUTO + MANUAL for a future defender model. Tonight they are only played on request: with no defender, B4 has no reason to stop.
- **B4's automatic choices**, surveyed (right-footed player, stick snapped to the angle):

  | | Small turns | ±30–60° | ±90° | ±120° | 150–180° |
  |---|---|---|---|---|---|
  | **Walk** | carry or compact redirects | — | — | braking pivot | braking touch |
  | **Jog** | — | croqueta | — | L-drag (left) · outside hook (right) | drag-back |
  | **Run** | — | compact redirects | — | chops | drag-back |
  | **Sprint** | — | outside cut | chop | — | braking touch → Cruyff |

  Never automatically: a stepover, scissors, elastico, Matthews, roulette, heel chop or fake stop.
- **Quick feet, not busy feet:** in 40 random-joystick minutes, **touches per second are unchanged (2.73 vs 2.78 before tonight)**, while the technique mix diversifies (§8).

## 5. FEINTS

- **Body feints** (`startFeint`):
  - three parameterised kinds — BODY_FEINT, SHOULDER_DROP, HIP_FAKE;
  - a false weight shift: side lean, trunk twist, head and arms toward the fake side, then snapped back;
  - **no ball contact, and the root and the ball are untouched**, following the research (sell with the head and trunk, keep the centre of mass).
  - A manual feint intent plays at once, selling the side *away* from the requested exit.
  - "Feint → outside / inside cut" adds a 0.6 s preference for that cut family; B4 still chooses the touch, the foot and the moment.
- **ANALOG FEINT recognition** (`u_sim.js feintTick`, conservative):

  | Step | Condition |
  |---|---|
  | ESTABLISHED | the request held within ±6° of a line for ≥ 0.35 s, the body ≥ 3 m/s, the carry running (no technique in its window), no feint in the last 0.8 s |
  | THE FAKE | the request leaves the line by 20–75°. The body **sells it at once** (the hip-fake overlay), and for **≤ 0.15 s no new touch takes the ball toward it**. The body follows the stick as A99-C allows, with no input delay |
  | CONFIRMED | the request comes back across the line (≥ 12° the other way) or back onto it within 0.30 s → FEINT. **The ball was never played toward the fake**; the real exit is the next ordinary decision |
  | GENUINE | held past 0.30 s or beyond 75°: a real change of direction. The sell is withdrawn and nothing else changes |

- **Measured** (`v_feint.mjs`):
  - **intended feints** (fake of 25 / 40 / 60° for 0.08–0.25 s, then the other way): **38 / 48** confirmed, **0 with the ball played toward the fake**;
  - **genuine held cuts:** **0 / 16** wrongly confirmed;
  - **noise:** ±60° every 0.35 s → 1 in 20 s · ±30° every 0.12 s → 1 in 20 s (the first flick after the straight run-up) · a 270°/s circle → 0 · ±12° jitter every 0.05 s → 0;
  - **random joystick torture:** **0.50 confirmed per minute** (3 in 6 min).
- **No feint spam:** a jittering stick never re-establishes a line for 0.35 s, so it cannot repeat FEINT FEINT FEINT. The most it produced was one feint at the first deviation after a straight line.

## 6. CHAINING

- **Every technique is branchable:**
  - after its decisive contact, B5 returns control in **0.06–0.14 s**, and the next action is decided from the live state;
  - before commitment, the latest intent may revise it (a technique whose first touch comes before its decisive one is committed from that first touch);
  - after commitment, the physical event is preserved.
- **Chains in the Lab** (decisive contact → control returned → the next action's start, s):

| Chain | Result |
|---|---|
| Body feint → outside cut | feint at 0, outside cut decisive 0.90 → control 0.96 |
| Scissors → outside exit → sprint | scissors 0.90 → 0.96, then the sprint carry |
| Stepover → inside exit | stepover 0.90 → 0.96 · **next action at 0.95** (compact redirect inside, decisive 1.08) |
| Drag-back → croqueta | drag-back 0.43 → 0.51 · croqueta requested 1.05 → decisive 1.49 → 1.55, then a gather 1.72 |
| V-pull → 90° exit | V-pull 0.43 → 0.57 · next 0.85 (lateral transfer 1.03) |
| Ronaldo chop → accelerate | chop 0.66 → 0.80, then D38 acceleration |
| Cruyff → accelerate | Cruyff 0.49 → 0.62 |
| Elastico → sprint | elastico 0.61 → 0.69 |
| Knock-on → sprint → chop | knock-on 0.15 → 0.21 · chop requested 1.60 → decisive 2.23 → 2.37 |
| Stop → feint → explode | deaden-and-explode 0.49 → 0.59 + feint at 0.55 |
| Croqueta → accelerate → outside cut | croqueta 0.52 → 0.58 · outside cut requested 1.60 → decisive 2.14 → 2.20 |
| Matthews → sprint | Matthews 0.75 → 0.81 |

**CHAIN MODE** in the Lab branches any replay at any moment into any technique; in the browser test, a croqueta branched into an outside cut at 0.90 s and both played.

## 7. FUTURE DRIBBLING-RATING READINESS (the interface; NOT calibrated)

- **Every technique carries difficulty dimensions** (0–1): base technical difficulty, maximum useful entry speed (m/s), support difficulty, weak-foot difficulty, preparation demand, redirection demand, chaining difficulty, deceptive complexity.
- **`feasibilityFor(id, dri)`** (`v_meta.js`) gives the envelope a Dribbling rating would grant. **At D99 it is exactly the ceiling** — the identity, tonight's behaviour. Below 99, a provisional shape, s = (99 − D)/98 scaled by the technique's own dimensions:

| Dimension | What it scales |
|---|---|
| vMaxUseful | the highest entry speed it is usable from |
| entryWindow | the share of feasible entry states (stride phase, ball place, set-touch reach) |
| prepScale | the preparation stretched |
| commitLead / branchDelay | committed earlier · control returned later |
| deception | the sell's quality |

  For example, the elastico's useful entry is 7.2 → 6.6 → 5.6 m/s at D99 / 80 / 50. It never becomes "fail → lose the ball". The envelope shrinks, the technique is REJECTED or not chosen, and the ball stays controlled — the same mechanism as tonight's REJECTED reasons.
- **Weak foot:** every technique knows the preferred foot, the striking and support feet, and the ball's side. B4 already charges the non-preferred foot. The `weak` dimension is the hook for the future Weak Foot rating (not calibrated). The Lab's MIRROR is a genuinely mirrored player: left-footed, ball in the left lane. It is not a right-footer reaching across.
- **Dribbling vs Ball Control:** they are kept separate. Tonight both are 99.

## 8. INTEGRITY

| Check | Result |
|---|---|
| **Possession, the prolonged torture** (40 seeds × 60 s, random analog joystick, CONTROLLED) | - **0 CONTROLLED exits and 0 missed contacts.** Touches per second 2.73 (2.78 before tonight); ball–body separation mean 0.42 m, max 1.70 m.
- **12 "observed losses"** (8 for the build before tonight on the same seeds; 9 at the first draft). All 12 are the observer's "no touch for 1.8 s" with the ball 0.4–1.1 m away, **possession still CONTROLLED** and the next touch planned within 0.14–1.1 s. None is a real loss (`evidence/torture_vocab1_verbose.txt`).
- **The technique mix:** the new automatic techniques take part of the reversals — outside hook 236, L-drag 122, V-pull 47 contacts in 40 min, beside drag-back 352 and Cruyff 130. The number of touches did not grow. |
| **Random manual intents under the random stick** (12 × 60 s; a random technique every 1.2–2.6 s) | 361 requests: PLAYED 70 · REJECTED 202 (random requests in random states — the wrong speed, angle or side, each with its reason) · CANCELLED 87 (the stick then changed before commitment) · **0 CONTROLLED exits · 0 missed contacts · the ball never > 3 m** · action switches 4.2 / s |
| **Determinism** | **18 / 18 bit-identical** simulated twice (every tick, with random manual intents) and **18 / 18** re-simulated from the recorded input + events (the page's replay path) · the Lab's case results are node's own. A latent replay bug was found and fixed this morning: the unified step read the stick's heading before it was quantised as the record holds it (< 1e-6 rad), so 2 of 18 seeds' replays diverged — the build tonight started from had it too |
| **Body, posed every tick in the random torture** (6 × 60 s, seeds 1–6) | Normal-speed-visible events (v_extreme's classification): **69 vs 140 before tonight** (103 at the first draft); over 18 seeds 236. Every event at any level, s99_bodytorture's count: jumps 61 (109 before) · knee pops 141 (204) · crossings 405 (566) · floats 184 (239) · slides 5 (11) — all lower |
| **Body, the curated cases** | 11 normal-speed-visible events in 10 / 91 clips; 0 missed contacts |
| **Ball / contact gaps** (the drawn boot ↔ the ball at each authoritative contact, 603 contacts in the curated cases) | median 0.0 cm · p90 0.7 cm · p99 8.3 cm · 12 > 5 cm · 5 > 10 cm. The worst: a braking touch in the REJECTED drag-back case (21.6 cm), the REJECTED heel chop's set touch (11.1 cm), carry sole touches after hooks (10.8 cm) |
| **The Lab and the sandbox in Chrome** | no console errors, no failed requests; the page's results equal node's; MIRROR, L \| R, CHAIN MODE (branch) and the sandbox's manual request verified; the palette has 32 skills (`v_browser.cjs`) |
| **The locked BASELINE-88573ef0** | `bl_lock_check.sh` PASS |

## 9. PERFORMANCE (`v_cpu.mjs`, the same seeded torture input, against the build tonight started from)

| | CPU per simulated s | re-plans / s | re-plan mean / p99 / worst | candidates scored per re-plan (max) | worst tick |
|---|---|---|---|---|---|
| before tonight (`ballon1`, CARRY-B) | 91.4 ms | 40.5 | 2.09 / 5.7 / 9.8 ms | 2.3 (17) | 9.8 ms |
| **tonight (`vocab1`)** | **103.1 ms (+13 %)** | 41.0 | 2.36 / 6.5 / 10.6 ms | 2.8 (21) | 10.7 ms |

(The first draft measured +8 %. The morning's support rules add the rest: the pivot recomputed by every plan, the anticipated turn-step landings, the approach keys.)

The candidates scored per re-plan barely rise. MANUAL techniques are only built while a request is pending, and the generic families are pruned by their own feasibility gates (the turn they need, the speed, the side) before any plan is built. No angle buckets were reintroduced, and no extra pruning was needed.

## 10. Honest notes / known limitations

1. **Visual quality is your call.** The metrics catch jumps, crossings, floats and pops, not whether a stepover *reads* as a stepover.
   - The new techniques' legs are drawn by the existing body solver from authored waypoints. Some loops may look small or fast at 1×; please judge them in the Lab at 1× first.
   - Four new techniques are REVIEW: the stepover family, the elastico, the Matthews, the stop moves.
2. **The remaining locomotion failures** (§1) sit under A99-C's low-speed facing whip (≈ 1000 – 1200°/s at a reversal's stop). The next step there is a low-speed facing-rate decision, which is yours, not a presentation fix.
3. **The two EXPERIMENTAL techniques play, with their blockers named:**
   - **the roulette:** its spin now turns on the right foot under the body, but the left foot's drag still crosses the legs;
   - **the heel chop**, new this morning with a HEEL contact pose: it plays, its clips measure clean, and it is rejected honestly at a sprint. It stays EXPERIMENTAL until you have seen its heel pose at 1×.
   - **Also known:** the fake stop keeps a 0.22 s float before its push-off (§1, reverted list).
4. **Deception has no measurable value without defenders.** The deceptive moves are MANUAL; the threat is a review-harness point, not a defender.
5. **Some rejections are honest limits of the locked references.** The Ronaldo chop needs ≥ 3.6 m/s (its hop), and a left-foot Cruyff from a jog sometimes finds no entry.
6. **CPU is up 13 %** on the build tonight started from (§9), and the observer's possession artefacts are 12 vs 8 (§8: all with possession CONTROLLED).
7. **Nothing is frozen.** Dribbling is not declared complete.

## Files

- `review_artifacts/dribbling_vocab1/`:
  - this report;
  - `VOCABULARY.md` (the catalogue);
  - `RESEARCH_TAXONOMY.md`;
  - `HANDOFF.md`;
  - `STATUS.json`;
  - `evidence/`;
  - `sources/` (the brief, verbatim).
- The code is in `sandbox/visual/vocab1/`; the pages are `vocab1_lab.html` and `vocab1_sandbox.html`.

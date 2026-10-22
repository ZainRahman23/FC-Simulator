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
- **The MANUAL SKILLS palette:** 31 technical intents. Click one, or select it and press **E**, while holding the stick toward the exit you want. The resolver decides the foot, the stride, the entry and the timing from the live state, or rejects it; the outcome shows in the bar.
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
| Runs with a **normal-speed-visible** failure | **126 / 140** | **52 / 140** |
| Normal-speed-visible events | 350 | 67 |
| — planted support swapped (one footfall, two identities) | 151 | **0** |
| — knee pops | 56 | 6 |
| — floats | 80 | 5 |
| — leg crossings | 62 | 50 |
| Slow-motion-visible events | 788 | 269 |
| Missed contacts · CONTROLLED exits | 0 · 0 | 0 · 0 |
| BALL OFF (the same scenarios, no ball): runs with a normal-speed-visible failure | 64 / 140 | 47 / 140 |

By entry (runs with a normal-speed-visible failure, before → after):

| Turn | JOG | RUN | SPRINT |
|---|---|---|---|
| 120° | 7/8 → **0/8** | 7/8 → **1/8** | 8/8 → **2/8** |
| 135° | 8/8 → **1/8** | 8/8 → **2/8** | 8/8 → **0/8** |
| 150° | 4/8 → **3/8** | 7/8 → **3/8** | 8/8 → **1/8** |
| 165° | 6/8 → **4/8** | 7/8 → **5/8** | 8/8 → **1/8** |
| 180° | 8/8 → **6/8** | 8/8 → **4/8** | 8/8 → **5/8** |

| Other scenarios | Before → after |
|---|---|
| Repeated reversals | 4/4 → **1/4** |
| Stop → reverse | 2/4 → **4/4** (worse) |
| Curve → reverse | 3/4 → **3/4** |
| Sprint → reverse → accelerate | 4/4 → **4/4** |
| 150° → 150° back | 3/4 → **2/4** |

**The fixes.** These are a small, reusable support vocabulary, not move-specific leg hacks. Astra's continuity principles are kept: persistent support identity, committed landings, trajectory-aware planning.
1. **ONE FOOTFALL, ONE SUPPORT** (`u_gait.js`).
   - **The cause** (the largest one): after a touch, the touching foot's next landing is committed. A technique re-planned at the same time added its own anchor for that same footfall, so the plan held two stances of one foot at one instant, and the body swapped supports 5–7 cm apart.
   - **The fix:** an anchor now *takes* the kept footfall, keeping its identity and adopting the technique's attributes while it is still in the air. If it is beyond a swing's reach (> 0.12 m), it is refused.
2. **HARD BRAKE** (`u_tc.js`). A technique entered above its speed range — a drag-back or Cruyff from a sprint — brakes **from the request** at the braking limit. Before, the body ran on at full speed for up to 0.75 s and braked at > 30 m/s² inside the technique's window, which caused the knee pops. This is not an input delay: the braking *starts* at the request.
3. **THE PIVOTING SUPPORT** (`u_gait.js`). A foot planted under hips that turn far over it pivots on the ball of the foot, never pointing more than 30° from the hips. It is computed from the plan's facing, so it stays continuous across re-plans.
4. **THE TURN STEP** (`u_gait.js` + `u_body.js`). A low-speed step taken while the hips turn more than 60° swings *around* the planted foot on its own side and lands at least 0.22 m clear of it. Its route is kept even when that step also plays the ball; before, the touch's own swing replaced the route.
5. **THE SWING CORRIDOR AFTER A TURN** (`u_body.js`). Right after the hips have turned (> 15° in 0.25 s), a swinging foot keeps 0.20 m from the support instead of 0.14 m. Straight running is untouched.

**Tried and reverted** (they measured worse):
- a replacement step (the wrong-side foot stepping twice): floats 5 → 23;
- a stricter set-touch reach: the weak-foot entries were lost.

**Remaining locomotion failures (not hidden):**
- **Leg crossings when relaunching on the spot after a 165–180° reversal** at walking speed. A99-C reverses the velocity in about 0.3 s, and the facing then whips through about 120° in 0.1 s at zero speed. The stepping foot and the planted foot meet: about 42 of the 67 remaining events, mostly JOG / RUN 165–180°, stop → reverse and sprint → reverse → accelerate.
- **The proper fix** is a dedicated pivot-turn primitive: the planted foot pivots while the other steps round to its new side, with the facing's whip shared between them. It is the next locomotion item.

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

**21 authored parametric techniques:**
- the locked baseline's five, untouched: Ronaldo chop, outside cut, Cruyff, inside hook, drag-back;
- **16 new**, in the same reference format: the right foot strikes, mirrored by the resolver, the turn angle is the request's;
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
| **SPIN** | **roulette (new)** | EXPERIMENTAL — the spin over pivoting feet still crosses the legs in some phases |
| **HEEL / SPEED CHANGE** | **hesitation (stall-and-go, new)** · heel chop | REVIEW · EXPERIMENTAL — no HEEL contact pose on the boot hull yet, so not authored |
| **STOP / HESITATION** | **deaden-and-explode · fake stop (new)** · sole stop | REVIEW / INTEGRATED |
| **PROTECTION / SHIELD TURN** | **shield roll-away (new)** · inside shielding turn (hook) · outside shielding turn (outside hook) · **the threat** (see below) | REVIEW / INTEGRATED |

**How the named moves are built** (`v_tech.js`):
- **Parametric builders:** `elastico(rev)` gives the elastico and its reverse; `solePull(kind)` gives the V-pull, L-drag and pull-push; `stopGo(kind)` gives deaden-and-explode, fake stop and hesitation; `withSetStep()` gives every move that opens with its support foot the striking foot's set step.
- **FREE techniques:** their exit is the request itself, 0° included (stop-and-go, scissors → continue).
- **Two-touch moves on one swing:** the elastico's and the Matthews' two touches are on one swing of one foot. The kernel plays both contacts from the real ball; the body draws the cue as a waypoint of the decisive swing.
- **The threat:** the review harness can supply a THREAT, a point on the pitch (`setThreat`, a recorded event). B4 then penalises solutions that leave the ball nearer the threat than the body, and credits the protecting ones. There are no force fields: the body has to place itself there. With a threat on the right, a jog reversal becomes a drag-back instead of a braking touch, and a 120° left becomes a Cruyff instead of an L-drag (Lab: PROTECTION → AUTO cases).

**Results of the curated cases** (`tools/v_cases_run.mjs`, the Lab's own runner):
- **76 cases + 12 chains (88 clips):** **68 / 73 requests PLAYED**. The 5 not played are exactly the 5 deliberate REJECTED setups, each with its reason:
  - drag-back at a sprint: "entry 9.7 m/s far above its 5 m/s";
  - scissors at 140°: "exit 140° beyond its 92°";
  - a right-foot elastico to the right: "the exit is on the wrong side for this foot";
  - roulette at a sprint;
  - chop from a jog.
- **Possession and contacts:** 0 CONTROLLED exits, 0 missed contacts, the ball never more than ≈ 0.66 m from the body in a single-move case.
- **Control returns after the decisive contact** in 0.06–0.14 s (median 0.06; B5).
- **Body:** 21 normal-speed-visible events in 17 of the 88 clips. The heaviest:

  | Technique | Events |
  |---|---|
  | Roulette (experimental) | 4 |
  | Matthews mirror, after the move | 3 |
  | V-pull mirror | 2 |
  | Shield roll | floats of 0.2 s at walking speed |

  The full list is in `VOCABULARY.md`.

**All 39 requests × both feet from a right-footed player** (`v_battery.mjs`): **73 / 78 PLAYED**. The rest are honest rejections:
- scissors from a full sprint ×2;
- the left-foot Cruyff from a jog, the left-foot double scissors, the left-foot sole roll (its legs still cross).

## 4. AUTO / MANUAL — the recommendation, and why

**Principle:** a technique becomes automatic only when B4 can measure the football problem it solves better from the live state — a turn, a reversal, a sideways escape, the ball's accessibility, protection. Without defenders, deception has no measurable value. Expressive moves therefore stay MANUAL: they must never win by chance, and there is no `skillMoveChance`.

| | Recommendation | Reasoning |
|---|---|---|
| **AUTO** | carry, close carry, sprint carry, knock-on, compact inside / outside redirects, gather, urgent reach, braking touch, braking pivot, sole stop | The ordinary football of every possession: chosen continuously on the predicted outcome |
| **AUTO + MANUAL** | Ronaldo chop, Cruyff (+ abbreviated), inside hook, **outside hook**, drag-back, **L-drag**, **V-pull**, outside cut, La Croqueta, **feint → cut (also by the analog feint)**, body feint, **hesitation**, **deaden-and-explode**, the shield turns | Each solves a measurable problem better than a carry: a sharp protected redirect, a reversal, a lateral escape, a stop and relaunch. B4 picks them on outcome (see the survey below), and they can also be asked for. The sole moves were promoted after measurement |
| **MANUAL** | scissors, stepover, double scissors, scissors → continue, elastico, reverse elastico, Matthews, pull-push, shoulder drop, hip fake, sole roll, roulette, fake stop | Their value is deception (a defender's reaction) or expression. They need an intent, not an automatic guess. They are also the rarest moves in elite play |

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

  Never automatically: a stepover, scissors, elastico, Matthews, roulette or fake stop.
- **Quick feet, not busy feet:** in 40 random-joystick minutes, **touches per second are unchanged (2.76 vs 2.78 before tonight)**, while the technique mix diversifies (§8).

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
  - **random joystick torture:** **0.33 confirmed per minute** (2 in 6 min).
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
| Drag-back → croqueta | drag-back 0.43 → 0.51 · croqueta requested 1.05 → decisive 1.49 → 1.55 |
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
| **Possession, the prolonged torture** (40 seeds × 60 s, random analog joystick, CONTROLLED) | - **0 CONTROLLED exits and 0 missed contacts.** Touches per second 2.76 (2.78 before tonight); ball–body separation mean 0.41 m, max 1.85 m.
- **9 "observed losses"** (8 for the build before tonight on the same seeds). All are the observer's "no touch for 1.8 s" with the ball 0.3–1.2 m away, possession still CONTROLLED and the next touch planned within 0.07–0.63 s. None is a real loss (`evidence/torture_vocab1_verbose.txt`).
- **The technique mix:** the new automatic techniques take part of the reversals — outside hook 236, L-drag 147, V-pull 54 contacts in 40 min, beside drag-back 405 and Cruyff 123. The number of touches did not grow. |
| **Random manual intents under the random stick** (12 × 60 s; a random technique every 1.2–2.6 s) | 361 requests: PLAYED 71 · REJECTED 211 (random requests in random states — the wrong speed, angle or side, each with its reason) · CANCELLED 76 (the stick then changed before commitment) · **0 CONTROLLED exits · 0 missed contacts · the ball never > 3 m** · action switches 4.7 / s · CPU 102 ms per simulated s |
| **Determinism** | **6 / 6 bit-identical** simulated twice (every tick, with random manual intents) and **6 / 6** re-simulated from the recorded input + events (the page's replay path) · the Lab's case results are node's own |
| **Body, posed every tick in the random torture** (6 × 60 s; all levels counted) | Normal-speed-visible events (v_extreme's classification): **103 vs 140 before tonight.** Every event at any level, s99_bodytorture's count: jumps 122 (109 before) · knee pops 185 (204) · crossings 503 (566) · floats 218 (239) · slides 6 (11). Jumps rose slightly; everything else fell |
| **Body, the curated cases** | 21 normal-speed-visible events in 17 / 88 clips; 0 missed contacts |
| **Ball / contact gaps** (the drawn boot ↔ the ball at each authoritative contact, 582 contacts in the curated cases) | median 0.0 cm · p90 0.6 cm · p99 8.2 cm · 11 > 5 cm · 4 > 10 cm. The worst: a braking touch in the REJECTED drag-back case (21.6 cm), carry sole touches after hooks (10.8 cm), the Matthews' inside nudge (8.2 cm) |
| **The Lab and the sandbox in Chrome** | no console errors, no failed requests; the page's results equal node's; MIRROR, L \| R, CHAIN MODE (branch) and the sandbox's manual request verified (`v_browser.cjs`) |
| **The locked BASELINE-88573ef0** | `bl_lock_check.sh` PASS |

## 9. PERFORMANCE (`v_cpu.mjs`, the same seeded torture input, against the build tonight started from)

| | CPU per simulated s | re-plans / s | re-plan mean / p99 / worst | candidates scored per re-plan (max) | worst tick |
|---|---|---|---|---|---|
| before tonight (`ballon1`, CARRY-B) | 91.3 ms | 40.5 | 2.11 / 5.8 / 10.0 ms | 2.3 (17) | 10.0 ms |
| **tonight (`vocab1`)** | **98.7 ms (+8 %)** | 40.8 | 2.26 / 6.2 / 14.4 ms | 2.6 (18) | 14.4 ms |

Under random manual intents: 102 ms per simulated s, worst tick 23.5 ms (each request builds its technique's instances over the next strides).

The candidates scored per re-plan barely rise. MANUAL techniques are only built while a request is pending, and the generic families are pruned by their own feasibility gates (the turn they need, the speed, the side) before any plan is built. No angle buckets were reintroduced, and no extra pruning was needed.

## 10. Honest notes / known limitations

1. **Visual quality is your call.** The metrics catch jumps, crossings, floats and pops, not whether a stepover *reads* as a stepover.
   - The new techniques' legs are drawn by the existing body solver from authored waypoints. Some loops may look small or fast at 1×; please judge them in the Lab at 1× first.
   - Four new techniques are REVIEW: the stepover family, the elastico, the Matthews, the stop moves.
2. **The relaunch crossings after reversals** (§1) are the main remaining locomotion failure.
3. **The roulette** is EXPERIMENTAL: its spin crosses the legs. **The heel chop** is not authored: there is no HEEL contact pose.
4. **Deception has no measurable value without defenders.** The deceptive moves are MANUAL; the threat is a review-harness point, not a defender.
5. **Some rejections are honest limits of the locked references.** The Ronaldo chop needs ≥ 3.6 m/s (its hop), and a left-foot Cruyff from a jog sometimes finds no entry.
6. **Nothing is frozen.** Dribbling is not declared complete.

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

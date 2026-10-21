# S99 mission: the first 99-everything movement and dribbling reference

*21 Oct 2026, 4-hour mission (started 18:24 BST / 20:24 EEST). Local only: the character is a real player's model, never publish. Nothing frozen, nothing integrated beyond this sandbox, no 1–98 calibration.*

## ▶ PLAYABLE URL

### `http://127.0.0.1:8361/sandbox/visual/s99.html`

It opens straight into the owner's 99 player:

- Sprint Speed 99 = 38.0 km/h, Acceleration 99 = D38, Agility 99 = A99-C, Dribbling 99, Ball Control 99.
- CONTROLLED_BALL, FULL stack, BALL ON, the joystick, EXPANDED techniques.

Top-bar controls:

| Control | What it does |
|---|---|
| **PACE** | 99 PACE ⇄ CURRENT PACE. **⇄ same input → other pace (N)** replays the session through the other pace. |
| **TECHNIQUES** | CORE ⇄ EXPANDED. **⇄ same input → other techniques (T)** replays the session through the other vocabulary. |
| **Playtest** | Presets: sprint carry and its cuts, plus one review preset per new family. |
| **⚙ diagnostics** | A review-only *force a family* selector. |

I cannot play video in real time. Everything below comes from simulation, posed-body checks, browser runs and screenshots, not from watching the player move.

---

## 1. Movement

### D38 is preserved as implemented

Ball off, 99 PACE, from rest:

| Distance | 5 m | 10 m | 20 m | 30 m | 40 m | 60 m |
|---|---|---|---|---|---|---|
| Time (s) | 1.02 | 1.55 | 2.52 | 3.47 | 4.42 | 6.31 |

- 90 % / 95 % / 99 % of top speed at 1.33 / 1.64 / 2.17 s.
- Peak 10.56 m/s (38.0 km/h).
- These match the owner's reference exactly. No pace value was retuned.

### High-speed leg fixes (Phase 1)

Each fix came from an instrumented cause (`tools/s_legs.mjs` and scratch traces), not a symptom filter. All are 99-pace only; CURRENT is untouched.

| # | Failure seen | Cause | Fix |
|---|---|---|---|
| 1 | A planted foot spun ≈ 720°/s | The new plan's yaw was sprung onto a foot already on the ground | A planted foot holds its yaw offset through the stance |
| 2 | Planted foot jumped 18 cm | The heel-rise rebuilt the ankle from a stale ball-of-foot point | The ball of the foot is rebuilt from the drawn ankle and yaw |
| 3 | Knee snapped ≈ 15° at touchdown | The pelvis dropped 4–7 cm in the touchdown tick; support compression was on/off | Compression is weighted in over the last 0.06 s of a swing and out over the last 0.07 s of a stance, rate-limited per tick in the foot timeline (≤ 0.06 per tick) |
| 4 | Planted knee popped 25–50° at a touch in hard cuts | That weight was judged from the plan of the moment, and a re-plan at the contact moved the stance end | The per-tick rate-limited weight (same fix as 3) |
| 5 | Floats while braking or cutting from 38 km/h | A 0.075 s top-speed contact cap applied to braking plants | A foot stays down through hard braking and cut plants; the cap applies to steady running only |
| 6 | Reversal: knee and foot jumped ≈ 18 cm | The body turned ≈ 180° over a planted foot; the leg was asked for a 170° twist and the IK flipped | **Plant pivot:** the foot pivots about the ball of the foot, ≤ 5° per tick, never more than 70° from the facing |
| 7 | Standing 90° start: a 15 ms hop step | A foot given an end by an earlier re-plan was not treated as standing | Near rest (< 0.4 m/s) it is standing, so a proper first step follows |
| 8 | The swinging knee went through the standing knee in hard turns | The pelvis turns ≈ 4° per tick at speed | Both knees swivel outward, continuously, as the knees come within 16 cm (≤ 20°). Normal running never comes closer than 26 cm, so it is untouched |
| 9 | A planted technique foot hovered 13 cm, then dropped 12–14 cm | The foot timeline held the whole touchdown offset through the stance, including its height | The horizontal offset is held (no slide); a height above the stance settles at ≤ 1.5 cm per tick |
| 10 | Larger touchdown deficit | The touchdown lead had been raised | RUN-1's lead is restored |

### Ball-off leg torture, final

`tools/s_legs.mjs`: S99 + D38 + A99-C, 17 scenarios × 8 entry phases = 136 runs, posed every tick.

| | Runs with a visible failure | Jumps | Knee pops > 20°/tick | Crossings | Floats | Slides | Swaps |
|---|---|---|---|---|---|---|---|
| First record this session, after fixes 1–3, 5, 6, 10 (not kept) | 72 | 1 | 145 | 165 | 35 | 0 | 0 |
| After the standing-start fix (`evidence/phase1/s_legs_D38_after_hop_fix.txt`) | 56 | 1 | 54 | 165 | 35 | 0 | 0 |
| **Final** (`evidence/phase1/s_legs_D38_final.txt`) | **52** | 1 | 53 | 150 | 35 | 0 | 0 |
| CURRENT body at its own pace (same scenarios) | 98 | 9 | 134 | 144 | 93 | 0 | 0 |

**Clean:** straight 38 km/h, gentle and sustained curves, stop → sprint, stop → sprint 90°, and the 90° cut.

**Remaining:**

- **The fast circle (270°/s at 38 km/h):** about 113 thigh crossings. A99-C keeps full speed in a 2.2 m-radius circle, which no body can run.
- **Floats inside A99-C's ≈ 26 m/s² stop and 150–180° reversals:** the movement sheds speed faster than a human can, and the braking plant is released by the 0.80 m rule.
- **One 180° jump.**

The ball-off reversal at 38 km/h brakes, plants, pivots and re-accelerates: A99-C's momentum loss, then D38. There is no instant velocity rotation.

---

## 2. Dribbling (CONTROLLED-99-PACE)

### D38 applies with the ball

A straight sprint with the ball under CONTROLLED_BALL has the ball-off splits exactly: 5 m 1.02 · 10 m 1.55 · 20 m 2.52 · 40 m 4.42 · 60 m 6.31 s, top speed 10.56 m/s. Ball scheduling never changes the movement; the root path is A99-C + D38 exactly.

### SPRINT_CARRY

- **Before:** at 38 km/h the old carry played the ball every step, 31 touches in 8 s. The rule that lets the other foot take the ball whenever the lane foot's chance is more than 0.35 s away ping-ponged it between the feet.
- **Now, in open space at a steady sprint:** the lane foot pushes the ball to its own next-but-one swing end, about 0.83 s ahead. The push is about 12.0 m/s, the ball peaks about 0.9 m ahead, and touches drop to **1.2 per second** (10 in 8 s).
- The other foot never intercepts the push, and no touch is made before the one the push planned.

**How it tightens.** It is graded by the stick and the state:

| Level | Condition | Behaviour |
|---|---|---|
| Long push | Stick held within 4° for ≥ 0.8 s, body ≥ 8.5 m/s | Lane foot, every other swing |
| Shorter push | Steering within 10° | The same rhythm, lane foot only |
| Ordinary carry | Beyond 10°, a volatile stick, an opponent's challenge active or within 1 s, or below 7.5 m/s | Either foot (close carry), then the redirect or cut |

**The longer N = 3 push was measured and rejected** (`tools/s99_cutexplode.mjs`): it gives 0.8 touches per second and a 1.2 m lead, but a 20° cut then waits about 1.1 s for the ball. The table below is the chosen push.

### Cut → explode

6 entry phases each, CONTROLLED, EXPANDED. "On line" means body and ball both on the new line. Ball-off figures are in brackets.

| From | Cut | First touch | On line | 90 % top speed again | Max separation |
|---|---|---|---|---|---|
| 38 km/h sprint carry | 20° | +0.17 s | +0.19 s (0.03) | +0.19 s (0.03) | 0.94 m |
| | 45° | +0.17 s | +0.25 s (0.10) | +0.25 s (0.10) | 0.94 m |
| | 90° | +0.67 s | +1.12 s (0.25) | +1.59 s (0.62) | 1.05 m |
| | 135° | +0.34 s | +0.97 s (0.40) | +2.22 s (1.44) | 0.90 m |
| | 180° | +0.49 s | +1.07 s (0.57) | +2.30 s (1.80) | 1.09 m |
| run → sprint | 45° | +0.13 s | +0.19 s (0.08) | +0.93 s (0.92) | 1.47 m |
| | 90° | +0.26 s | +0.60 s (0.19) | +1.58 s (1.12) | 1.05 m |

- From a run, the ball costs nothing to the explosion at 45° (0.93 s vs 0.92 s without it).
- From a full sprint carry the ball is up to about 0.9 m ahead, so a 90° cut waits about 0.5 s for it.
- Without SPRINT_CARRY (the ping-pong) a 90° cut is on line sooner (0.73 s) but back to 90 % top speed later (2.3 s vs 1.59 s), with 2–3× the touches.

### Zero controller-induced loss

The model-blind observer flags "no contact planned 0.5 s / none made 1.8 s / ball over 3 m". Every flag in these runs was raised while the simulation still held CONTROLLED_BALL.

| Run | Simulated | CONTROLLER_FAILURE | Missed contacts | Observed flags | Max separation |
|---|---|---|---|---|---|
| TC-CONTROLLED-1, CURRENT pace (reference) | 4 h | 0 | 0 | 28 | — |
| 99 PACE, CORE (N = 3 build) | 4 h | **0** | 0 | 32, all while CONTROLLED | 1.95 m |
| 99 PACE, EXPANDED (N = 3 build) | 4 h | **0** | 0 | 41, all while CONTROLLED | 2.09 m |
| 99 PACE, EXPANDED, N = 2, sole roll automatic (fresh seeds 1001–1480) | 8 h | **0** | 0 | 83, all while CONTROLLED | 2.24 m |
| **99 PACE, EXPANDED, final configuration** (sole roll review-only, fresh seeds 3001–3240) | 4 h | **0** | 0 | 25, all while CONTROLLED | 2.59 m |

**The edge cases the faster player exposed, each fixed by a better action, not by suppression:**

1. **A slow ball rolling back at the running body** was capped at a 48° redirect and sent sideways at speed. It is now pushed on to its aim.
2. **A body faster than the ball overran it.** Every pursuit headed forward from where the body was, and none could stop short of the ball. A **turn-back pursuit** now aims from the body's braking point.
3. **A ball just beside a body overtaking it** could not be touched by any pursuit. The RECOVERY scan now accepts the other foot's inside slightly across the body, or a ball slightly behind the centre of mass (to 0.22 m).

**Recovery actions:** in the 8-hour run, 2,745 SECURE fallbacks (≈ 5.8 per minute of torture) and 6 RECOVERY pursuits. In the final 4-hour run, 1,393 and 2.

**Before the last fix:** the first 8-hour run of this configuration had 2 CONTROLLER_FAILUREs; the RECOVERY reach fixed both. Earlier builds had 8 (4 h), then 6 (4 h), before the turn-back pursuit.

**Opponents still win the ball** (`tools/c_opponent.mjs`, 99 PACE, EXPANDED):

- 195 of 200 probes hit a controlled ball (5 missed it); 113 broke control (46 OPPONENT_INTERCEPTION, 67 OPPONENT_TACKLE); 82 times control survived the altered ball. 79 balls were re-collected after a break.
- Ball continuity at the hit is exact: ≤ 0.1 mm against the kernel's own step, 0 deviation from a free kernel ball afterwards.
- The page's tracking poke (8 m/s lunging foot, 40 random moments) hit 39 times and broke control 31 times (OPPONENT_TACKLE). With CORE at the 99 pace: 39 hits, 26 broken; at CURRENT PACE: 40 hits, 26 broken.

---

## 3. Technical vocabulary

**Retained unchanged:** CARRY / close carry, COMPACT_INSIDE_REDIRECT, COMPACT_OUTSIDE_REDIRECT, GATHER, URGENT_REACH, BRAKING_TOUCH, BRAKING_PIVOT, RONALDO_CHOP, CRUYFF, HOOK, DRAG_BACK, OUTSIDE_CUT. The Ronaldo chop's definition and templates are untouched. Nothing is replaced by a generic redirect.

**New (EXPANDED; LAT and KNK chosen automatically, SOL and the feints through the review presets).** Each is one swinging-foot contact at the end of its swing, made feasible by the state and chosen by B4's outcome cost like every other candidate. There are no angle buckets. Feet are mirrored by side.

| Family | Action | Wins when (unforced, `tools/s99_families.mjs`) | Rejected when |
|---|---|---|---|
| **LAT: lateral transfer** (La Croqueta) | The inside of one foot plays the ball across to the other foot's next swing end, which carries it on | Run 25–40° shifts (25°: on line 0.33 → 0.29 s); chained after a knock-on or an inside redirect | Above 6.2 m/s; ball not in front of the touching foot |
| **KNK: knock-on** (push-and-go) | The turning touch knocks the ball to the lane foot's swing end ≈ 1.05 s later; the body explodes after it | Run → sprint cuts 35–55° (on line 0.28 → 0.18 s and 0.34 → 0.23 s vs CORE), and the 45° cut out of a 38 km/h sprint carry (0.36 → 0.24 s) | Without SPRINT; below 3 m/s; with a volatile stick; an opponent's challenge active or within 1 s |
| **SOL: sole roll** (review only, for now) | Nearly stopped, the sole rolls the ball out to its own side or back while the body pivots over it | When B4 could choose it, it won slow 60–120° turns (on line 0.96 → 0.72 s at 60°, 0.83 → 0.76 s at 120°). **Taken out of the automatic choice:** in 90–120° pivots its rolling leg still crosses the standing one (walk → 120°: 14 crossings where CORE has none) | Above 2.6 m/s; impulse under 60° off the travel; never across the body |
| **FNO / FNI: body feint + outside / inside cut** (review only) | Weight shifted and trunk turned toward the other side for 0.20–0.30 s before the plant, then snapped onto the real side. Root, plant, touch and ball are the cut's own | Only when forced; a feint's value is a defender's reaction, and there is no defender model yet | Always, automatically |

**Usage under the torture (unforced):**

- **8 h with the sole roll automatic:** lateral transfer 2,088 · knock-on 752 · sole roll 1,385 · SPRINT_CARRY pushes 706, of 76,426 contacts. CORE moves kept their share: drag-back 5,360, inside redirect 3,988, Cruyff 3,046, outside redirect 2,327, hook 2,108, Ronaldo chop 1,612.
- **Final 4 h:** lateral transfer 1,004 · knock-on 377 · SPRINT_CARRY pushes 364, of 38,378 contacts.

**Validation** (`tools/s99_families.mjs`): walk, jog, run and run→sprint entries, 9 states × 2 directions × 3 phases. Each also runs as a left-footed mirror.

- **Mirror:** 270 / 270 identical (right-footed +a ≡ left-footed −a, feet swapped, timing within 0.03 s).
- **Possession exits:** 0.
- **Body, per run (posed every tick):** EXPANDED runs (432) 0.023 jumps · 0.06 knee pops · 0.18 crossings; CORE runs (108) 0.019 · 0.13 · 0.17. In the lateral-transfer and knock-on states the body is as clean as CORE's or cleaner (sprint → 45°: CORE 2 / 12 / 2, EXPANDED 2 / 4 / 0); most crossings are the slow 90° turns, which CORE has too.

**Interruption:** an opponent's contact with the real ball interrupts any action at the tick it happens (above).

**Not built this mission:** elastico / reverse elastico, stepover / scissors, V-pull / pull-push (the sole family has only the roll), Matthews / shoulder feint as an automatic choice. Per the brief's priority order, the time went to the foundation first (Phases 1–2, zero controller failures). Feints and stepovers need a defender-reaction model before B4 can value them.

---

## 4. Responsiveness

- **Contact timing, cut → explode:** the table above.
- **Contact gaps, final 4 h torture:** p10 0.21 · p50 0.25 · p90 0.66 · p99 ≈ 1.3 s.
- **Quick feet, not busy feet.** Same 30 torture minutes (seeds 2001–2030) for each configuration:

| Configuration | Touches/s | Contact gap p50 | The other foot within 0.25 s of a touch |
|---|---|---|---|
| CURRENT PACE, CORE (TC-CONTROLLED-1) | 2.68 | 0.27 s | 44.6 % |
| 99 PACE, CORE | 2.77 | 0.25 s | 47.6 % |
| 99 PACE, EXPANDED | 2.79 | 0.25 s | 49.4 % |

  The 99 player under torture input is about 4 % more touch-active than the current pace, and the faster cadence explains part of it. The alternation share includes multi-contact moves (set touch → move → exit touch) and the torture's abuse input. In open play the change is the other way: SPRINT_CARRY took the straight 38 km/h sprint from 31 touches to 10 in 8 s.
- **Control return:** B5's short exits are unchanged. The new families are single contacts, so ordinary control returns at their touch.

## 5. Integrity

| Check | Result |
|---|---|
| Posed-body torture, ball on, CONTROLLED, the seeded torture input incl. abuse (`s99_bodytorture.mjs`, 8 × 60 s each) | **99 PACE + EXPANDED vs CURRENT + CORE, per minute:** jumps 19.8 vs 27.6 · knee pops 34.7 vs 71.9 · crossings 81 vs 106 · floats 284 vs 490 (totals) · slides 260 vs 148 (totals) — better everywhere except planted-foot slides (below) |
| Straight 38 km/h sprint carry with the ball, posed every tick | 0 failures |
| Determinism (browser) | `PT.verify()` true for every preset; node ≡ browser (`u_resim.mjs`: IDENTICAL) |
| Animation ON / OFF neutrality (`c_neutral.mjs` at 99 PACE + EXPANDED) | 16 / 16 identical (FREE and CONTROLLED, 8 programs × 20 s; 8 with an opponent's hit on the ball) |
| CURRENT PACE ≡ TC-CONTROLLED-1 (`s_equiv.mjs`) | 48 / 48 bit-identical (ball off; ball on FREE; ball on CONTROLLED) |

**Known body issues remaining (ball on):**

- **Planted-foot slides (4–8 mm a tick)** when the plan switches every tick (the action flipping under abuse input). A switch carries the old plan's still-swinging foot into the planted foot's offset. A first fix (holding the point) fought the foot-speed limiter and was reverted.
- **Thigh crossings** of 3–5 cm just after hard 60–90° cuts at 10 m/s.
- **The 180° drag-back from 38 km/h:** single-tick knee changes of 20–35°.
- The fast circle and A99-C's hardest stops (above).

## 6. Performance

| Measure | Value |
|---|---|
| CPU per simulated second (`c_cpu.mjs`, single process, simulation only, CONTROLLED, 8 × 60 s torture input) | **99 PACE + EXPANDED 96.1 ms** vs CURRENT + CORE 79.1 ms (+22 %, mostly the extra candidate builds: genericBuild 69.9 vs 53.7 ms) |
| Worst tick | 12.6 ms (vs 13.7 ms) |
| Pose | 0.39 ms (99 PACE + EXPANDED) vs 0.34 ms (CURRENT) per pose, measured with other runs in parallel |

---

## Evidence (`review_artifacts/s99_mission/evidence/`)

| Folder | What it holds |
|---|---|
| `phase1/` | The leg torture records (and the CURRENT body on the same scenarios) |
| `phase2/` | Every possession torture of the mission, the failing builds included (`…_buildA_8CF`, `…_buildB_6CF`, `…_run1_2CF`); `cutexplode_EXPANDED.*` |
| `phase3/` | `families.*` |
| `compare/` | The same 30 minutes through CURRENT+CORE, 99+CORE and 99+EXPANDED |
| `integrity/` | Body torture, neutrality, equivalence, opponents, poke, CPU |
| `browser/` | The primary page in Chrome: screenshots, `s99_browser.json`, the sessions (node ≡ browser checked with `u_resim.mjs`: IDENTICAL) |

## What to look at first

1. Open the page. Hold the stick up with SPRINT LOCK: 38 km/h with the ball, the pushes every other stride (HUD: SPRINT CARRY).
2. Play **SPRINT CARRY → 90° cut + explode**, then press **N** for the same input at CURRENT PACE.
3. Play **REVIEW · KNOCK-ON**, **REVIEW · LATERAL TRANSFER** and **REVIEW · SOLE ROLL**, then press **T** to see what CORE does with the same input.
4. **B4 CHOOSES · run → sprint 35°** shows the knock-on chosen without forcing.

## Open questions for the owner

1. **SPRINT_CARRY's push length:** N = 2 (now: 1.2 touches/s, a 20° cut answers in 0.17 s) or the longer N = 3 (0.8 touches/s, a 20° cut waits ≈ 1.1 s).
2. **EXPANDED as the default:** on now; CORE is one click.
3. **The next families:** feints need a defender-reaction model before they can be chosen automatically.

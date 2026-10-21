# TC-CONTROLLED-1: the controlled-ball prototype (21 Oct 2026)

**Presented for your playtest. Not frozen. Not integrated. Lower ratings not calibrated. LOCAL ONLY:** the character is a real player's model.

I cannot play video in real time. Every judgement below comes from simulation measurements, posed-body audits and browser screenshots. Whether CONTROLLED feels better is yours to judge on the page.

Your brief is saved verbatim in `sources/`. The section numbers (§) below are the brief's.

---

## The page

# ▶ `http://127.0.0.1:8361/sandbox/visual/tc_controlled1.html`

- **BALL CONTROL MODEL** (top bar, left): `CURRENT FREE` / `CONTROLLED`. The page opens on **CONTROLLED**, with BC99 / D99 / A99-C, FULL, BALL ON and the joystick.
  - `CURRENT FREE` is TC-UNIFIED-1's FULL, bit-identical (384 / 384 runs).
  - `⇄ same input (M)` replays your own last input through the other model, so you can compare them on identical input.
- **`OPPONENT POKE (P)`:** a lunging opponent foot (8 m/s, alternate sides) driven into the real ball. It steers at the ball where it is now. It knows nothing of the player's plan.
- **`RELEASE (K)`:** your next touch becomes a knock-on (an intentional release).
- Pokes and releases are recorded events: replay, re-simulation and node all reproduce them.
- **⚙ diagnostics** adds the possession HUD (§30): model and state, controlled action, ball phase, next planned contact, support / technical foot, committed, control threat, the fallback in use, the continuation and the last exit with its reason.
- `tc_unified1.html` (FULL-FREE as it was) is untouched and linked under ⚙. The locked BASELINE-88573ef0 page is untouched (lock check PASS).

**Checked in Chrome** (`evidence/browser/`):
- 8 / 8 morning cases are deterministic in both models.
- CONTROLLED has no exits.
- FREE fails the sprint fast circle (CONTROLLER_FAILURE).
- A poke in free play → `OPPONENT_TACKLE`, then the player re-collects. A release → `INTENTIONAL_RELEASE`.
- `⇄ same input` replays identical input and events.
- Node ≡ browser on 6 sessions.
- No console or HTTP errors.

---

## The answer in one table

Four simulated hours per model of seeded random legal stick input:
- holds;
- snaps of any angle;
- rotations up to ±400°/s;
- oscillations;
- smooth random wandering;
- stops and restarts;
- deliberately abusive flicking;
- the speed changing every segment.

There are 240 programs × 60 s, identical for both models (`evidence/torture/`).

| over 4 simulated hours (235 min) | CURRENT FREE | CONTROLLED |
|---|---|---|
| **CONTROLLER_FAILURE** (the simulation's own classification) | **705** | **0** |
| exits from CONTROLLED_BALL of any kind | — | **0** |
| observed losses (a model-blind observer: no contact planned 0.5 s / none made 1.8 s / ball > 3 m) | 784 (3.3 per min) | 28 (0.12 per min) |
| … of which the ball was never played again | 37 | 0 |
| … the player's next touch after a flag | median 1.7 s, p90 5.1 s, max 19.5 s | median 0.32 s, max 1.33 s |
| … the ball's separation until that touch | median 2.2 m, p90 4.6 m, max 34 m | median 0.85 m, max 1.48 m |
| largest ball separation in 4 h | 34.3 m | 2.33 m |
| missed contacts | 4 | 0 |

All 28 of CONTROLLED's observer flags are the observer's timing rule: 27 are "no contact made for 1.8 s" and 1 is "none planned for 0.5 s". Every one is answered by the player's own touch with the ball within 1.48 m. Most are at walking pace under a swirling stick, with the ball rolling slowly or resting about 0.8–1 m away (listed in `evidence/torture/controlled_observer_flags.txt`). They are not losses. They show the long touch gaps described in the remaining issues.

**What CONTROLLED costs:**
- more touches under busy input (rapid L/R +15–19 %);
- more leg-crossing warnings (report card 184 → 224; Astra's audit 319 → 339 frames);
- one contact gap of 18 cm.

**What it doesn't change:**
- no input is gated;
- the visible-response clock is identical in all 30 report-card scenarios;
- named moves are identical (33 / 33 grid cells);
- calm input produces exactly FREE's simulation.

---

## 1. The architecture (§2–5, §22)

The ball is the authoritative kernel ball at all times:
- never parented, moved, damped or magnetised;
- between contacts it rolls freely on the kernel;
- only two things change it, each a kernel launch from where the ball really is: the player's planned touches and an opponent's collision.

What CONTROLLED changes is **how the one existing planner chooses**: A99-C movement, the shared support plan, B4, B5 and the carry. There is no second planner and no separate ball animation.

1. **The controlled continuation** (`contOf`). A plan is a controlled plan only if all three hold:
   - its next contact comes within 1.2 s;
   - the free ball stays inside the body's control envelope until then (1.5 m + 0.12 m per m/s of the body's speed);
   - at that contact the ball is within 1.0 m (the kernel contact's own miss rule).

   Alternatively, the ball comes to rest at the feet and stays inside the envelope meanwhile. A continuation that needs a swinging foot to jump (> 8 m/s relative to the body) doesn't count: the boot must visibly play the ball.
2. **The decision.**
   - B4 / the cost score every candidate as before, plus:
     - +50 when it has no controlled continuation;
     - +30 when, under an active stick, it would postpone the running plan's imminent touch.
   - The planner's choice is adopted if it has a continuation. Otherwise, in this order:
     1. the next-best candidate that has one;
     2. **the running touch re-aimed for the new intent**: the body re-plans on the new request at once, and the touch keeps its time and foot;
     3. the running plan kept until the next re-plan (a re-plan happens at every footfall and at least every 0.3 s);
     4. **SECURE**: a pursuit planned through A99-C's real movement, 88573ef0's pursuit, or the wide-reach touch;
     5. if none of those is a controlled continuation, the earliest pursuit that touches the ball at all, kept as the **RECOVERY**. That is a real touch on the real ball, later than a controlled one, but never "no contact".
3. **Controlled touches.** A steady stick at speed keeps 88573ef0's longer push. Otherwise:
   - **Busy stick:** a carry touch's push follows the body's present motion, no faster than the body over the next 0.3 s + a little. It keeps 88573ef0's carry lane (the preferred foot's side and that foot's next swing).
   - **Braking touch / pivot:** the ball goes back no faster than it separates by ≈ 0.9 m during A99-C's own reorientation.
   - **No overrun:** a braking body never slows the ball more than 1 m/s below its own speed.
   - **Execution:** a carry touch re-aims at the newest intent if the stick has moved since the plan.
4. **Stick activity:** the stick's turning over 0.6 s minus its largest 60 ms change, remembered ≈ 0.4 s. One clean snap is not activity, so B4 answers it exactly as before.
5. **The possession state (§17):** FREE → COLLECTED (the player's own contact followed by a controlled continuation) → CONTROLLED → FREE. Each exit is logged and classified (§31).
   - After an opponent's contact, control survives only a **minor** deflection: the ball's velocity changed by under 2 m/s and the player's next touch within 0.6 s.
   - The same monitor runs as an observer on FREE.

Code: `sandbox/visual/tc_controlled1/c_sim.js` (ControlledSim, ≈ 230 lines over tc_unified1's UnifiedSim). `HANDOFF.md` has the file map and every verification command.

## 2. Zero loss is causal, and no input is gated (§1, §19)

There is no `lost = false` anywhere. Over 4 simulated hours, every decision went through the order above. Counted on the same 240 programs (`evidence/decisions_4h.txt`, 524 452 re-plans):

| Decision | Share |
|---|---|
| the planner's own choice (B4 / the cost, unchanged) | 96.11 % |
| kept the running plan | 2.19 % |
| the running touch re-aimed for the new intent | 1.39 % |
| SECURE (pursuit 0.22 %, to the ball 0.03 %, wide touch 7 re-plans) | 0.25 % |
| RECOVERY: entered 9 times in 4 h, then kept over 261 re-plans until its touch | 0.05 % |

- **The planner's own choice** is used in 96.1 % of re-plans. CONTROLLED changes nothing there.
- **The re-aimed running touch** (1.4 %) responds at once: the body is re-planned on the new request in the same tick.
- **"Kept the running plan"** (2.2 % of re-plans) is the one hold. The new request's best plan had no controlled continuation, so the running plan stays until the next re-plan:
  - 3059 episodes in 4 h: median 37 ms, p95 221 ms, max 425 ms;
  - the stick is still read every tick and the next re-plan tries again;
  - nothing is delayed beyond that, and no turn is cancelled.

  It is still a hold, so I'm stating it rather than hiding it.
- **No other gating:**
  - C, sprint and the action locks are untouched;
  - the visible-response clock (the posed body's first visible reaction) is **identical** in all 30 report-card scenarios;
  - the action-lock clock is 0.00 in both models everywhere.
- **Earlier failures, now fixed.** The first 4-hour run found 6 CONTROLLER_FAILUREs (seeds 75, 140, 141, 191 ×2, 217). All came from smooth, fast random wandering at walking pace.
  - **Cause:** the SECURE fallback refused every pursuit that was not a strict controlled continuation. The planner's own "no contact" plan was then adopted for over 0.3 s.
  - **Fix:**
    - the RECOVERY;
    - "rest at the feet" now requires the ball to stay inside the envelope (a ball rolling away from a body that will only later meet its resting point is not at the feet).

  The final 4-hour run has 0.

## 3. Identical traces: FREE vs CONTROLLED (§20)

**The report card** has 240 traces, each posed every tick (`evidence/report_card.txt`). The touch and body columns are totals; the response clocks are medians (p95):

| | FULL-FREE | FULL-CONTROLLED |
|---|---|---|
| LOST (the report card's observer) | 1 | 1 (the same trace, the same observer artifact: rapid L/R sprint L #0) |
| touches / redundant / double | 1425 / 26 / 2 | 1446 / 27 / 2 |
| relevant contact not within 2 s (held changes) | 6 | 9 (small corrections · sprint 6 → 8, jog 0 → 1) |
| new line not within 2 s | 19 | 18 |
| leg-crossing warnings | 184 | **224** |
| foot jumps / support slides | 3 / 13 | 3 / 14 |
| unsupported flight > 0.15 s | 200 | 170 |
| contact gaps > 4 cm | 42 | 40 |
| ball separation max | 1.74 m | 1.79 m |
| rapid L/R · jog: contact / heading / line | 0.28 (0.63) / 0.08 / 0.19 (0.73) s | **0.22 (0.43) / 0.06 / 0.13 (0.35) s** |
| rapid L/R · run: contact / line | 0.28 (0.37) / 0.38 (0.50) s | **0.20** (1.00) / **0.22** (0.96) s |
| rapid L/R · sprint: contact / line | 0.18 (0.41) / 0.34 (0.44) s | 0.18 (0.76) / 0.37 (0.83) s |
| small corrections · sprint: contact / line | 0.24 / 0.18 s | 0.27 / 0.22 s |
| snap 60° · jog: new line | 0.75 (1.18) s | **0.48 (0.87) s** |

All other scenarios are identical or within one touch. That covers flowing carry, snaps at 45 / 90 / 150 / 180°, and gradual rotation at every speed.

**The morning cases** (`evidence/morning_cases.txt`, 33 cases, both models):
- CONTROLLED has no exits in any case;
- FREE loses the sprint fast circle (sep 1.84 m, CONTROLLER_FAILURE), where CONTROLLED stays within 0.92 m;
- touches total 207 vs 231. The extra touches are in the busy cases:
  - fast circle run 8 → 14;
  - fast circle sprint 5 → 12;
  - repeated ±30° sprint 11 → 16;
  - rapid ±60° run 10 → 12;
  - rapid sprint L/R 8 → 11.
- Straight run, straight sprint, gentle and tight curves, snaps at 45–180°, stop / restart and all 11 favourable examples: identical touch counts.

**Named moves:** the action grid (`evidence/action_grid.txt`, jog / run / sprint × 30–180°) is identical in all 33 cells.

**Calm play is unchanged.** The page's free-play session (a straight run, a diagonal, one poke, one release) re-simulated under each model gives the same hash, bb0fc5db. CONTROLLED changes nothing where FREE keeps control.

## 4. Rapid input: tighter, but quick feet, not busy feet (§9, §10)

**Tighter:** under rapid L/R at jog and run, the relevant contact and the new line come sooner. The fast circle and the sprint L/R keep the ball within about 0.9 m, where FREE lets it go.

**Busier than I would like:**
- rapid L/R run 85 → 98 touches and sprint 70 → 83 (+15 % / +19 %), with redundant touches 1 → 2 and 6 → 8;
- the fast circles gain the most touches.

The tightening works by shorter pushes (the ball goes no faster than the body can follow), not by extra taps. Shorter pushes do mean more touches when the stick never settles. There is no 8-touches-per-second behaviour: the torture average is 2.64 touches/s.

## 5. Possession-preserving fallbacks (§11)

The minimum vocabulary, all built from the existing planner. No new named techniques were added.

| Fallback | What it is |
|---|---|
| the next-best controlled candidate | B4's own alternatives |
| the re-aimed running touch | a SHORTENED_CARRY in effect |
| SECURE pursuit / wide touch | GATHER / PROTECTIVE_TOUCH in effect |
| the RECOVERY | the last resort, still a real touch |
| the controlled braking touch / pivot | a CUSHION |

The decision counts are in §2.

## 6. Not invulnerable; the opponent probe (§12–14, §24)

**`c_opponent.mjs`: 200 trials.** Each one is a moment of controlled play at random, with a deterministic foot driven on a straight line through the ball's real position then. The kinds are tackle, poke, interception and block, at 2–9 m/s from any direction. The foot is never told about the player.

| Measure | Result |
|---|---|
| hits on a controlled ball | 200 / 200 (control cannot prevent a hit) |
| broken | 112: OPPONENT_TACKLE 67, OPPONENT_INTERCEPTION 45 |
| survived | 88, all minor deflections (Δv < 2 m/s, next touch < 0.6 s), mostly blocks and glancing pokes |
| continuity at the hit tick | position discontinuity 0.0001 m against the kernel's own step |
| after the hit | deviation from a fresh kernel ball launched from the post-hit state: 0.00000 m (no hidden damping, no reset, no steering) |
| re-collected after a break | 68 |

**The page's tracking poke** (`c_poke.mjs`): 40 pokes at random controlled moments → 40 hit the ball, 26 broke control (OPPONENT_TACKLE), 14 glancing.

**Neutrality:** 16 / 16 runs are identical with the body posed every tick and never posed, 8 of them with an opponent's hit on the ball.

**Not tested: the real standing-tackle system.** The tackle line is the other agent's (Codex) and read-only for me. The probe is a synthetic foot and makes no claim about tackle animation. The interface is `addOpponent({ p0, v, t0, t1, r, z, e[, track] })`: any foot trajectory can drive it.

## 7. Intentional releases and receiving (§15, §16)

- **RELEASE (K)** turns the next carry or generic touch into a 14 m/s knock-on along the stick → `INTENTIONAL_RELEASE`. The intent is held across re-plans until a touch happens.
- **There is no pass / shot / cross / clearance in this sandbox.** Those exit classes exist in the classification, but nothing here can produce them.
- **Receiving:** the sandbox starts with the ball at the feet. COLLECTED is entered on the player's own contact with a controlled continuation (after a poke, for example). The receive line (RECEIVE-CONTROL-1.1 and on) is protected and not integrated here, so entry from a real pass is untested.

## 8. Every exit, classified (§31)

| Exit | Count | Notes |
|---|---|---|
| CONTROLLER_FAILURE | **0** in 4 h | FREE's observer: 705 |
| TECHNICAL_ERROR | **0** | reserved for lower ratings' execution variance; none at 99 |
| INTENTIONAL_RELEASE | on the RELEASE button | |
| OPPONENT_TACKLE / OPPONENT_INTERCEPTION | 67 / 45 | of 200 probe hits (+26 of 40 tracking pokes) |
| EXTERNAL_COLLISION | — | for any other opponent kind |
| PASS / SHOT / CROSS / CLEARANCE | not exercisable | see §7 |

## 9. The animation must not get lazy (§21)

CONTROLLED changes trajectories, not the contact model:
- the same kernel contacts;
- the same contact foot and surface rules;
- the same support plan and pose.

**Astra's body audit, BALL ON** (24 sprint scenarios; `evidence/audit_ball_on.txt`):

| | FULL-FREE | FULL-CONTROLLED |
|---|---|---|
| foot jumps | 14 | **12** |
| leg-intersection frames | 319 | 339 (+6 %) |
| contacts > 3 cm / > 10 cm | 12 / 2 | **9 / 1** |
| worst contact gap | 12.8 cm | 18.1 cm (one contact, rapid sprint L) |
| root ↔ render max | 4.0 cm | 4.0 cm |

The differences are all in the busy sprint scenarios (rapid ±60°, repeated ±30°, fast circle), and they are mixed there.

**Two body fixes this session:**
- **The lane foot.** The controlled touch had sent the ball to the touching foot's lane, so the touches alternated feet across the body. That took intersection frames to 381 and foot jumps to 17. It now keeps 88573ef0's preferred-foot lane.
- **The follow-through.** For CONTROLLED's soft pushes (the ball at about body speed), the posed follow-through now follows the impulse: the ball's out-direction. Before, it followed the foot's near-zero relative velocity, which swung the leg sideways. This is pose-only. FREE's pose is unchanged.

## 10. CPU (§23)

Idle machine, 8 seeded torture programs × 60 s per model; inclusive times (`evidence/cpu.txt`, `evidence/cpu_ticks.txt`).

| ms per simulated second | FULL-FREE | FULL-CONTROLLED |
|---|---|---|
| **whole simulation** | **61.7** | **55.7** (−10 %) |
| decision (replan) | 59.8 | 53.8 |
| contact planning (genericBuild / instantiate / carryTouches) | 42.1 / 7.9 / 0.9 | 38.1 / 6.9 / 0.9 |
| support planning (gaitFrom) | 4.1 | 3.3 |
| controlled-ball evaluation (contOf, possCost, footReach, fallback, possStep) | 0.2 (the observer) | 0.6 |
| opponent collision | 0.02 | 0.02 |
| tick p99 / p99.9 / ticks > 8 ms (of 115 200) | 3.17 / 4.71 ms / 12 | 3.03 / 4.42 ms / 9 |
| worst single tick | 12.5–13.4 ms | 15.3–27.9 ms (GC / JIT pauses: none involved the fallback) |

Your hypothesis holds, measured: CONTROLLED is cheaper. The likely reason is that it no longer wanders into long chases and re-plans of a loose ball.

## 11. Integrity (§25–28)

- **Neutrality:** 16 / 16 runs identical, posed and unposed (§6).
- **Randomness:**
  - CONTROLLED adds no random draws;
  - FREE is bit-identical to TC-UNIFIED-1 (384 / 384), so nothing is rerolled;
  - an opponent's hit is mixed into the hash only when it happens.
- **Lower ratings, structured but not calibrated:**
  - the control envelope (1.5 m + 0.12 m per m/s), the reach (1.0 m), the horizon (1.2 s) and the minor-deflection rule (Δv < 2 m/s) are the places where BC / D / A would later enter;
  - so are which fallbacks are available, and how quickly;
  - TECHNICAL_ERROR is reserved for genuine execution variance;
  - a controller failure can never be relabelled as one.
- **What we like:**
  - the straight run and sprint, the snaps and the favourable named moves are unchanged;
  - B4 / B5 and A99-C are unchanged (FREE ≡ TC-UNIFIED-1);
  - joystick handling is unchanged;
  - the player stays tackleable (§6).
- **One latent TC-UNIFIED-1 bug found:** UnifiedSim's carry-touch retarget could recurse without end in a rare case (it crashed a long torture run). It is fixed with a recursion guard in tc_controlled1's copy only. FREE stays identical on every test. `tc_unified1/` itself is untouched.

## 12. Remaining issues, not hidden

1. **Busier feet under never-settling input:**
   - rapid L/R +15–19 % touches;
   - the fast circles gain the most touches;
   - report-card leg-crossing warnings +22 % (184 → 224), concentrated in rapid L/R at jog / run.

   These are visual warnings. Your hands decide whether it reads as quick or busy.
2. **Long touch gaps at walking pace under a swirling stick:** up to 1.8 s + 1.33 s without a touch, with the ball resting or rolling slowly 0.8–1.5 m away (the 28 observer flags). Not a loss, but it may look like dithering.
3. **The 2.2 % running-plan holds** (p95 221 ms, max 425 ms in 4 h). See §2.
4. **One contact gap of 18.1 cm** in the rapid sprint (FREE's worst is 12.8 cm).
5. **The RECOVERY keeps the state CONTROLLED** while the player goes to a ball up to about 2.3 m away (the 4-hour maximum). You may prefer to label that differently. It was entered 9 times in 4 h.
6. **Not tested:**
   - the real standing tackle (Codex's, read-only);
   - pass / shot / cross / clearance exits (no such system here);
   - entry from a real pass (the receive line is protected).
7. The sprint fast circle and the rapid sprint L/R are where CONTROLLED and FREE differ most, in both directions. Those are the inputs to try first on the page.

## 13. Your decisions

1. Does CONTROLLED feel better than CURRENT FREE in your hands?
   - Try `⇄ same input (M)` after a frantic sequence.
   - Try the playtest menu's fast circle and rapid L/R.
2. Is the touch count under busy input acceptable (§4), or should the tightening give way sooner?
3. Is the minor-deflection rule (Δv < 2 m/s keeps control) right?
4. Should a RECOVERY count as CONTROLLED?
5. If CONTROLLED is the direction, should it become FULL's default? I've done nothing towards that: no freeze, no integration.

## Evidence (`evidence/`)

| Path | What |
|---|---|
| `torture/` | `SUMMARY.txt`, per-chunk logs, `controlled_4h.json` / `free_4h.json`, `controlled_observer_flags.txt`, `free_observer_flags.txt` |
| `decisions.txt`, `decisions_4h.txt` | decision counts |
| `EQUIVALENCE_FREE_vs_UNIFIED.txt` | FREE ≡ TC-UNIFIED-1 |
| `report_card.txt` / `.json` | the report card |
| `audit_ball_on.txt` | Astra's body audit |
| `action_grid.txt` / `.json` | the action grid |
| `morning_cases.txt` | the morning cases |
| `opponent_probe.txt` / `.json` | the opponent probe |
| `poke_tracking.txt` | the page's tracking poke |
| `neutrality.txt` | posed vs unposed |
| `cpu.txt`, `cpu_ticks.txt` | CPU |
| `browser/` | the screenshots, `c_browser.json`, sessions, `node_vs_browser.txt` |

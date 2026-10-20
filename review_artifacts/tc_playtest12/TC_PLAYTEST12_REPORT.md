# TECHNICAL-CONTROL PLAYTEST-1.2 — elite rapid-direction control at 99 / 99 / 99

**Status:** presented for the owner's playtest — NOT frozen, NOT integrated. Local only (the character is a real player's model: never published).
**Page:** http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html (the same joystick sandbox, updated).
**Owner instruction (verbatim):** `sources/2026-10-20_user_instruction_playtest12_rapid_direction_control.md`.

I cannot play video in real time. Everything below comes from:
- deterministic simulations (node);
- real Chrome runs of the page (keys, pointer on the stick, the torture preset), with screenshots;
- node re-simulations of those browser sessions.

## 1. The result against the acceptance rule (§12)

The torture suite has 35 deterministic stick sequences × WALK / JOG / RUN / SPRINT = 140 runs (869 s of play). Baseline = PLAYTEST-1 as presented (88573ef0). Both columns were measured with the same tools.

| §12 requirement | PLAYTEST-1 | PLAYTEST-1.2 | |
|---|---|---|---|
| uncontrolled-ball losses (LOST, §13 definition below) | **26** | **0** | met |
| planned contacts missed | 0 | 0 | met |
| double touches (< 0.10 s apart) | 11 | 0 | met |
| techniques abandoned after their commitment | 0 | 0 | met |
| ball teleports | 0 | 0 | met |
| impossible support swaps (planted feet crossed) | 43 | 1 | **not met** |
| structural leg crossings / phasing (posed capsules > 20 mm, spans) | 528 | 387 | **not met** |
| support-foot collisions (planted ankles < 0.10 m) | 2 | 5 | **not met** (worse) |
| foot teleports (displayed foot > 0.12 m in one tick) | 1893 | 461 | **not met** |
| ball inside a boot > 20 mm (ticks, presentation) | 7583 (3.6 %) | 9098 (4.4 %) | worse |
| recoveries (pursuits, shown as RECOVERING) | 528 | 478 | — |

**Extended random suite** (§11 "random rapid analog directions"):
- 240 seeds × 4 speed groups = 960 runs, 8736 s of play;
- a new stick angle every 0.06–0.40 s;
- results: **LOST 0 · missed 0 · double touches 0 · abandoned after commit 0** · 14 244 contacts.

**Summary:**
- **Control** meets the zero rule: no losses, no missed or double contacts, no technique dropped after commitment, no ball teleports. That holds in every run, including 2.4 hours of random rapid input.
- **The body does not meet it yet.** Leg crossings, foot jumps, crossed supports and support collisions are all reduced except support collisions, but none is zero.

### LOST — defined by feasibility (§13), not by distance

A run counts as LOST while movement is requested, the ball is not at the feet, and either:
- no contact has been planned for 0.5 s, or
- no contact has been made for 1.8 s.

A pursuit that is closing on the ball (bridge footwork) counts as a recovery, not a loss. A long sprint stride touch is fully controlled as long as a contact is planned for it.

## 2. What changed (pt_sim.js unless noted)

**1. Latest movement intent (§1)**
- A change that comes within 0.25 s of the previous one does not re-plan at once. It waits for the next decision point, at most 0.15 s after the current plan, and then plans for the *newest* intent. Superseded intermediate requests never get an action of their own.
- Two or more changes within 0.5 s count as volatile input: carry touches get shorter (×0.7) and one touch at a time.

**2. Commitment phases (§2)** — every action reports FREE / PREPARING / COMMITTED_TO_CONTACT / CONTACT / RECOVERY-EXIT. What cannot change any more:
- landed footfalls;
- a foot in the air keeps its coming landing (< 0.35 s away), with bounded corrections only:
  - re-aim ≤ 0.15 m + 3 m/s × the time left, at most 0.45 m;
  - re-time later by ≤ 25 % of the remaining flight, at most 70 ms (a stride's reach), measured against the landing carried along with the body;
- the landing after a committed touch;
- contacts within the reaction time.

A committed technique keeps its contact, and only its exit re-targets to the newest intent. A technique whose ball is predicted > 0.30 m from where its decisive contact needs it is released *before* contact. It is never forced.

**3. D99 re-planning (§3):**
- re-plans on every request, contact, footfall and 0.3 s refresh;
- late cancellation and conversion while still free;
- technique instances anchored on the committed landings of a foot in the air.

**4. The body plan is validated before it is accepted (§4):**
- stance order;
- swing ≥ 0.07 s;
- stance spacing ≥ 0.12 s;
- the pelvis kept in a band where the right foot stays ≥ 0.06 m right of the left;
- every footfall and touch landing on its own side, ≥ 0.15 m from the other foot;
- every touch checked for the foot's reach in time.

A plan that fails is not executed; the next feasible one is.

**5. Bridge footwork (§5):**
- pursuit / collection steps;
- re-timed and re-aimed landings;
- body steps with no extra touch.

**6. The control envelope (§6–7), all applied before contact (no magnetism, no correction after contact):**
- every technique candidate, and every re-aimed commitment, must leave the ball ≤ 0.30 m from its decisive contact point;
- carry touches are made only on the touching foot's own side, and a planned reachable touch is held;
- long untouched gaps cost extra (+2.5 × (gap − 1.15 s));
- the touches still needed for the new line are counted (redirect cap 48°).

**7. Presentation (pt_body.js):**
- state taken purely from the plan;
- a re-planned swing continues from the displayed foot (C¹);
- swings detour around the predicted ball;
- the ball-clearance push fades through the contact window.

**8. Determinism:** the simulation uses the deterministic trig (`physchar2/core/v2_math.js`), so node ≡ Chrome bit for bit (it had diverged on circles).

**9. Diagnostics (§14–15) — the CONTROL HUD block:**
- the status, coloured: SECURE / REPLANNING / COMMITTED / RECOVERING / LOST;
- the action and its phase;
- the next feasible contact and the time to it;
- the margin;
- the queued action;
- the stick's **raw** angle → the **active** intent.

The status strip sits on top of the ball-separation graph. Raw stick input is recorded every tick, and the replay shows it.

## 3. Technique identity and speed (§9, §16) — normal play, 99 / 99 / 99

"Line" = time from the input until body and ball are both on the new line (`evidence/PT12_NORMAL_PLAY_TESTS.txt`).

| input | PLAYTEST-1 | PLAYTEST-1.2 |
|---|---|---|
| sprint W→A (90° L) | Ronaldo chop R, +0.95 s | Ronaldo chop R, +0.95 s |
| sprint W→D (90° R) / stick snap 90° R | Ronaldo chop L | Ronaldo chop L, +0.82 s |
| run W→A | chop R, +0.79 s | chop R, +0.79 s |
| sprint W→S | drag-back L, +0.85 s | drag-back L, +0.86 s |
| run W→S | drag-back L, +0.65 s | **drag-back R, +0.83 s** |
| run W→SA (135°) | inside hook R, +0.81 s | inside hook R, +0.81 s |
| jog W→D | outside cut R, +0.66 s | outside cut R, +0.66 s |
| W→D→W→A | chop L → chop R, +0.35 s after the last change | chop L → chop R, **+1.16 s** after the last change |
| rapid WA/WD | chop L, +0.53 s | carry, +0.56 s |

Mirror timing sweeps (the turn pressed at 13 stride phases; chop count out of 13):

| | chop at | carry line time |
|---|---|---|
| run W→A | 12 / 13 | — |
| sprint W→A | 13 / 13 | — |
| sprint W→D | 11 / 13 | — |
| run W→D | 6 / 13 | +0.74–1.07 s |

The techniques are unchanged: the same templates and mechanics. The chop is still shield → inside behind the plant → protected path → exit.

**The cost of committing a foot in the air.** When the turn comes as one foot is about to land (≈ 66–70 ms away), the old planner could hold that foot up for another ~80 ms and use it. That hold was a big source of the foot jumps and tangles. Now that landing is kept, so the technique starts on the next suitable footfall. This explains:
- run W→S: drag-back R instead of L, 0.18 s slower;
- W→D→W→A: the second chop is a stride later, so the final A arrives during its exit;
- run W→D: one fewer chop phase (6 vs 7 / 13 with the commitment off).

Right turns at run use the weak foot and fall back to a carry more often. That is the foot preference, not this change.

## 4. The torture preset (§11, §18)

On the page, in the top bar: **Torture** select (35 sequences) + speed group + **▶ play**. It drives the page's own analog stick and can be replayed / slowed like any session.

The sequences are §11's list:
- 0→90→0→−90; 0→150→30→180; 0→90→180→−90→0 (fast / medium / slow);
- circles 0.5 / 1 / 2 Hz both ways;
- left–right flicks ±45 / ±90 at 0.12 / 0.25 / 0.4 s;
- sprint forward → 90° → −90°;
- sprint 180 and back;
- 10 random sequences.

In Chrome, 4 sequences at SPRINT (0→90→180→−90→0 fast, flicks ±90 / 0.12 s, random #3, circles 1 Hz):
- the HUD was sampled every 0.1 s: never LOST;
- determinism identical;
- node ≡ browser on all 4 sessions;
- simulation work avg 1.3–1.8 ms per frame, worst 9.7 ms; frame p99 16.8 ms.

The WASD tour and the real-pointer stick checks also pass:
- WASD tour: 56 contacts, 0 missed;
- stick: drag 37°, captured outside the ring, release, source switch, touch + sprint;
- the replay shows the stick;
- both node ≡ browser.

## 5. What is not done / limitations

**Legs — 387 crossing spans:**
- 70 % have the feet on their own sides, with a segment passing the other leg: a swing past a plant, thigh against thigh;
- 23 % have crossed feet;
- 65 % come from the carry gait and 35 % from a technique stance;
- every speed group is affected: WALK 86, JOG 129, RUN 84, SPRINT 88.
- `evidence/PT12_LEG_CROSSINGS_CLASSIFIED.txt`.

**Feet — 461 jumps:**
- 425 are over-fast swings inside one unchanged swing (≈ 29–36 m/s for a tick), mostly at RUN / SPRINT;
- the other 36 happen at a landing / lift-off or a re-plan;
- `evidence/PT12_FOOT_JUMPS_CLASSIFIED.txt`.

**Other open items:**
- 5 support collisions remain (both planted ankles < 0.10 m apart for 0.01–0.07 s), all in the circle sequences, 4 of them at WALK.
- 1 crossed support remains: one tick, 0.051 m past the line, circles 2 Hz JOG.
- The ball inside a boot is 4.4 % of ticks. This is presentation only: the ball is authoritative.
- Recoveries are frequent (≈ 3.4 per torture run). They are real collections, shown as RECOVERING; none becomes LOST.
- No lower-rating calibration (§17).

## 6. Owner decisions

1. Keep the in-flight landing commitment (organised feet, sometimes a stride later) or allow late holds of a foot about to land (faster in those phases, more foot jumps)?
2. Next step: the body zeros. These are posed-leg clearance in carry turns and a swing-speed limit in the presentation; the authoritative plan already validates order and sides.
3. Should right turns at run prefer the weak-foot chop more often (a dominance / style question)?

## Evidence (`evidence/`)

| file | what |
|---|---|
| `PT12_TORTURE_BASELINE_playtest1.json` | the suite on PLAYTEST-1 (88573ef0) |
| `PT12_TORTURE_SUITE.json/.txt` | the 140-run suite now |
| `PT12_TORTURE_EXTENDED_960.json/.txt` | 960 random runs (control) |
| `PT12_NORMAL_PLAY_TESTS.json/.txt` | the owner's key sequences + timing sweeps both ways |
| `PT12_NORMAL_PLAY_KEY_OUTCOMES.txt` | key sequences with each new mechanism switched off |
| `PT12_STICK_EQUIVALENCE.json/.txt` | WASD ≡ stick 6/6 identical, stick sweeps / snaps |
| `PT12_NEUTRALITY_AND_POSE.txt` | animation on ≡ off 6/6, pose timing, no NaN |
| `PT12_LEG_CROSSINGS_CLASSIFIED.txt` | leg-crossing classification |
| `PT12_FOOT_JUMPS_CLASSIFIED.txt` | foot-jump classification |
| `PT12_TORTURE_BROWSER.json` | the page's torture preset in Chrome, CONTROL HUD samples |
| `PT12_BROWSER_WASD_TOUR.json` | the WASD tour in Chrome |
| `PT12_STICK_BROWSER.json` | real pointer / touch on the stick in Chrome |
| `PT12_NODE_EQUALS_BROWSER.txt` | node re-simulation of the 6 browser sessions: all identical |

Screens (`screens/`) are from the final code:
- the torture preset at SPRINT (CONTROL HUD visible);
- a replay of the last action;
- the stick snapping 90° right at sprint (the chop L).

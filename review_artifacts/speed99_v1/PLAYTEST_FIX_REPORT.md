# SPEED-99-V1: the playtest blocker, fixed (21 Oct 2026)

Your instruction is in `sources/2026-10-21_user_instruction_playtest_blocker_top_speed.md`, verbatim.

**What changed:**
- Only the page's input adapter, camera and HUD changed.
- No candidate was changed: A, B, C and CURRENT are exactly as presented.
- The simulation itself was untouched, and CURRENT is still identical to TC-CONTROLLED-1 (24 / 24).
- No ball, no choice of B or C, no lower ratings.

I cannot play video in real time. Everything below was measured in Chrome with real mouse and keyboard events, and in node.

**The page:** `http://127.0.0.1:8361/sandbox/visual/speed99.html`

## 1. The exact limiting term

I traced the whole path: the stick's magnitude, the mode, the sprint inputs, the request, the acceleration and the authoritative velocity. Every input was played with real events (`tools/s_manual.cjs`; `evidence/playtest_fix/1_before_fix_manual_inputs.txt`).

| Input (before the fix, candidate C) | Mode the page sent | Speed after 6 s |
|---|---|---|
| the stick alone, full magnitude | **RUN** | **5.30 m/s (19.1 km/h)** |
| top-bar Mode **SPRINT**, then the stick | **RUN** | **5.30 m/s (19.1 km/h)** |
| sprint lock, then the stick | SPRINT | 10.35 m/s (37.3 km/h) |
| Shift held + the stick | SPRINT | 10.35 m/s |
| on-screen SPRINT held by a second touch + the stick | SPRINT | 10.35 m/s |
| keyboard W + Shift, or W + top-bar SPRINT | SPRINT | 10.35 m/s |

**The cap is the page's input adapter**, `request()` in the viewer, inherited from 88573ef0's page. Your ~19 km/h was exactly RUN's 5.3 m/s. Two causes:
1. **The stick's magnitude zones stop at RUN** (walk below 40 %, jog below 72 %, run beyond). Full stick magnitude requests RUN, never SPRINT.
2. **The top-bar Mode SPRINT button was ignored while the stick was in use.** It lit up, but only the keyboard path read it.

Also, with a single mouse the on-screen SPRINT button cannot be held while you drag the stick.

**The other suspects, cleared:**
- **SPRINT cap:** the simulation's request is the speed table at the mode, and SPRINT is the candidate's top speed.
- **The old 8 m/s cap:** not present.
- **RUN-1 constants:** they only shape the gait.
- **Steering cap:** the friction circle doesn't bind on a straight.
- **Acceleration reset:** none.
- **A test-page-only cap:** none; the presets set the sprint state.

## 2. The fix (page only)

**Mode SPRINT is the sprint lock now** (top bar, keyboard 4, or the lock button).
- WALK / JOG / RUN release it.
- Its active state is unmistakable: `SPRINT LOCK · ON` glows orange, the SPRINT button and top-bar SPRINT are lit, a banner reads `SPRINT ON · SPRINT LOCK`, and the stick readout says SPRINT.
- Holding SPRINT (touch) or Shift works as before and lights the same indicators.

**The HUD shows what the authoritative player is doing right now:**
- CURRENT SPEED (m/s and km/h)
- REQUESTED SPEED
- CANDIDATE VMAX (m/s and km/h)
- MOVEMENT MODE
- SPRINT INPUT, ON or OFF and by what: lock / held / Shift / preset
- the four tiers with the current one marked: WALK 1.50 · JOG 3.20 · RUN 5.30 · SPRINT vmax
- how to reach each tier
- the run: distance, time, **peak**, time to **90 / 95 / 99 %** of top speed, and splits at 5 / 10 / 20 / 30 / 40 / 60 / **80 m**
- the reference runner's run beside it

**`▶ TOP SPEED RUN`** (top bar, and first in the presets) runs from rest, perfectly straight, full sprint, for 10 s on a course with cones to 80 m. With the reference runner on, it switches to the new **"both runners (side-on)"** camera, so the 99 player visibly pulls away from CURRENT.

**Two page bugs found and fixed:**
- With BALL OFF, the follow camera aimed 28 % toward the untouched start-spot ball. On a long sprint it looked about 22 m *behind* you, so your 99 player ran out of the picture and the reference filled it. It now follows the player alone with the ball off.
- The stick readout said RUN while sprinting.

## 3. Manual = scripted (mandatory)

`tools/s_manual_vs_scripted.cjs`; `evidence/playtest_fix/3_manual_vs_scripted.txt`.

**Method:**
- In Chrome, for each pace, the TOP SPEED RUN preset was compared with:
  - real input: a mouse-dragged stick straight up, with sprint by the **lock**, by **Shift**, and by **top-bar SPRINT**;
  - node's own straight sprint from rest.
- They were compared tick by tick from the first tick the request had a direction: the request (heading, mode), the authoritative speed and the distance, over 10 s (2,400 ticks).

**Result:**
- All three manual inputs and node gave a **request identical** to the preset's.
- The speed and distance differ by **at most 3·10⁻¹⁵ m/s and 6·10⁻¹⁴ m**, floating-point noise.
- The stick alone is the RUN tier (5.30 m/s), by design.

**The TOP SPEED RUN** (identical for scripted, manual and node):

| | peak | 5 m | 10 m | 20 m | 30 m | 40 m | 60 m | 80 m | 90 % / 95 % / 99 % of top |
|---|---|---|---|---|---|---|---|---|---|
| CURRENT | 8.00 m/s (28.8 km/h) | 1.37 | 2.05 | 3.30 | 4.55 | 5.80 | 8.30 | (≈ 10.8) | 1.67 / 1.83 / 1.96 s |
| A | 10.00 m/s (36.0 km/h) | 1.25 | 1.90 | 3.03 | 4.07 | 5.07 | 7.07 | 9.07 | 2.53 / 3.29 / 4.09 s |
| B | 10.35 m/s (37.3 km/h) | 1.20 | 1.83 | 2.92 | 3.92 | 4.89 | 6.82 | 8.75 | 2.42 / 3.14 / 3.97 s |
| C | 10.35 m/s (37.3 km/h) | 1.09 | 1.68 | 2.70 | 3.68 | 4.64 | 6.57 | 8.50 | 1.77 / 2.26 / 2.85 s |

The CURRENT run is 10 s, so it ends at about 75 m. Over 80 m, B finishes about 22 m ahead of the CURRENT reference and C about 23 m ahead.

## 4. How to sprint on the page

| You want | Do |
|---|---|
| WALK / JOG / RUN | the stick: below 40 % / below 72 % / beyond (or WASD with Mode WALK / JOG / RUN) |
| **SPRINT, mouse only** | click **SPRINT LOCK** (or Mode SPRINT, or key 4), then drag the stick fully. Click it again, or WALK / JOG / RUN, to release |
| SPRINT with a hand on the keyboard | hold **Shift** while dragging the stick (or with WASD) |
| SPRINT on a touch screen | hold the on-screen SPRINT with one finger, steer with another |
| the full envelope at a glance | **▶ TOP SPEED RUN** |

Evidence: `evidence/playtest_fix/`
- the before and after input probes;
- manual = scripted, as `.txt` and `.json`;
- the end-of-run panels for all four paces;
- C at top speed with the lock on;
- B pulling away from CURRENT, side-on.

**Next:** your choice of the ceiling. Nothing has been selected.

# TECHNICAL-CONTROL PLAYTEST-1 — playable dribbling sandbox

**Status: PRESENTED FOR THE OWNER'S PLAYTEST — provisional, NOT frozen, NOT integrated.** Local only (the character is a real player's model).
Instruction (verbatim): `sources/2026-10-20_user_instruction_tc_playtest1_playable_dribbling_sandbox.md`.

## Open it

**http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html**

The page loads straight into free play: the 99 / 99 / 99 player stands on the centre spot with the ball. Press WASD to play.
Optional URL parameters: `?cam=follow|touchline|top|side`, `&foot=R|L|B`, `&bc=…&dri=…&agi=…`.

## Controls

| Keys | What they do |
|---|---|
| **W A S D** | The desired movement direction (diagonals included), in the camera's frame. It is latched when the key combination changes, so the camera turning under a held key never turns the request. |
| **Shift** | Sprint while held. |
| **Alt / Option** | Walk while held. |
| **1–4** / Mode buttons | Base mode: WALK · JOG · RUN (default) · SPRINT. |
| **Space** | Pause. |
| **.** | Frame step (1/60 s). **Shift + .** steps one 240 Hz tick. **,** steps back during a replay. |
| Time buttons | 1× · 0.5× · 0.25×. |
| **Q** | REPLAY LAST ACTION: the last technique, at 0.25×, with the WASD actually pressed. |
| **B** | Replay the last 10 s (scrub bar, 0.25× / 0.5× / 1×). |
| **Esc** | Back to live. |
| **R** | RESET. |
| **C** | Cycle the camera: follow (behind / above), touchline, top-down, side / debug. |
| **H** | Hide / show the HUD. |
| **V** | Verify determinism: the whole session is re-simulated from its recorded input. |

**On-screen stick** (bottom-left; see the joystick section below): drag = direction and magnitude; SPRINT (hold) / sprint lock; WALK (hold).

Bar controls:
- **Foot:** right-dominant, left-dominant or two-footed.
- **Style:** only "neutral elite" exists.
- **BC / DRI / AGI sliders:** 1–99, live. Below 99 they are marked **PROVISIONAL**: a linear scaling, not a calibration.
- **Course:** straight acceleration, slalom, sharp-cut 45 / 90 / 120 / 150 / 180° or tight box. Courses are visual only and placed ahead of the player when chosen.
- **Overlays:** HUD, panels (separation graph, technique frequency, last 20 contacts), protection diagnostic, body debug, and the body itself (switching it off runs the simulation only).

## The on-screen joystick (added 20 Oct, input only)

Instruction (verbatim): `sources/2026-10-20_user_instruction_tc_playtest1_joystick.md`.

- **The stick:** bottom-left, drag inside it. The pointer is captured while dragging, so leaving the circle keeps control; releasing returns the thumb to the centre and movement to zero. Mouse, trackpad, pen and touch all work (pointer events).
- **Direction:** continuous, never quantised. Up = the camera's forward, latched when the stick leaves its deadzone. This is the same convention as WASD, which latches when the key combination changes. The HUD shows the exact angle from that forward, e.g. "input STICK +37.0°".
- **Magnitude:** the distance from the centre. Below the deadzone (0.08 of the radius, editable in the bar as "Stick dz", or `?dz=`) there is no movement. Then WALK up to 0.40, JOG up to 0.72, RUN beyond. The outer edge is never a sprint.
- **SPRINT:** hold the SPRINT button (= Shift), or click "sprint lock" to keep sprinting with one hand on a mouse. **WALK** is a hold button (= Alt / Option).
- **Keyboard and stick:** the last source to become active authors the request (a WASD key going down, or the stick being grabbed or dragged). The two are never added.
- **Replay:** the stick's raw position and analog vector are recorded per tick. REPLAY LAST ACTION draws the recorded stick beside the WASD, Shift, Alt, SPRINT and WALK it shows.
- **Implementation:** `pt_input.js` builds the request for both sources. The simulation files are unchanged (git diff empty). The joystick changes nothing in Dribbling, Ball Control, Agility, technique scoring, touch timing, ball physics or movement capability. The stick asks only for a direction; Technical Control chooses the technique.

**Verified.**
- **Equivalence** (`tools/pt_input_test.mjs`, `evidence/PT1_STICK_INPUT_TESTS.*`): identical authoritative results — hash, contacts, actions — 6 / 6:
  - WASD forward vs the stick exactly forward;
  - W + D vs the stick's normalised diagonal (√½, √½);
  - W → WD → D → SD → S vs the stick's equivalents;
  - Shift + W → A vs the stick + the SPRINT button;
  - Alt + W vs the stick + the WALK button;
  - release vs the stick back to the centre.
- **The owner's playtest on the stick:**

  | Stick input | What the player does |
  |---|---|
  | sprint, smooth 0 → 90° over 2.5 s (through 30 / 45 / 60 / 75°) | carry corrections follow it |
  | sprint, held at 30° | carry |
  | sprint, held at 60° | outside cut |
  | sprint, snap 90° | Ronaldo chop |
  | sprint, snap 150° | drag-back |
  | run, 41° / 68° | carry |
  | run, 97° | Ronaldo chop |
  | run, 137° | inside hook |
  | stick in the jog zone, 90° | outside cut |

  0 missed contacts throughout.
- **In Chrome with real pointer input** (`tools/pt_stick_browser.cjs`, `evidence/PT1_STICK_BROWSER.json`):
  - a mouse drag to 37° gives a request 37.0° from the latched forward, RUN zone;
  - with the pointer dragged far outside the circle, the stick stays captured and clamps to the rim;
  - release gives movement zero;
  - W takes over, then a new drag takes back;
  - a touch on the stick while the mouse holds SPRINT gives the stick direction + SPRINT;
  - the sprint sweep 0 → 90° gives carry, the snap 90° a Ronaldo chop L, the snap 150° a drag-back R;
  - REPLAY LAST ACTION shows the recorded stick;
  - the page's determinism check is identical, and the session re-simulated in node is identical (`evidence/PT1_STICK_SESSION_RESIM.txt`).
- **WASD unchanged:** the 34 s WASD tour still gives 59 contacts, 0 missed, determinism identical.

## The techniques (no skill button, no angle buckets)

- **CARRY** (the default; TECHNICAL-CONTROL-1.2's model, re-stated):
  - lane ball;
  - laces at speed, outer instep / outside outward, inside across, sole to stop;
  - same-foot touches with strides between;
  - SPRINT is touch → strides → touch; a standing start uses quick short steps;
  - a touch that would change nothing is not made ("quick feet, not busy feet");
  - STOP is an inside cushion, then the sole.
- **RONALDO CHOP · OUTSIDE CUT · CRUYFF TURN · INSIDE HOOK · DRAG-BACK**: TECHNICAL-CONTROL-1.5's references as parametric templates (`pt_tech.js`), both feet:
  - the chop keeps its mechanics: the shielding leg across in front of the ball, the striking foot's inside from behind it, the ball through the stance, the exit onto the new line;
  - the turn angle scales the template; it is not snapped to a bucket.

**How the resolver chooses.** At every re-plan it scores the carry and every feasible technique instance (both feet, several stride anchor times, with or without a set touch). Re-plans happen on a request change, a contact, a footfall or every 0.3 s. The cost terms are:
- time until the body and the ball are on the new line;
- time to the decisive contact;
- number of contacts;
- ball separation;
- the angle against the technique's comfortable range;
- protection;
- weak foot;
- speed fit;
- a small hysteresis.

The HUD's "why" shows the top candidates with their costs and reasons, live and in replay. Input changes mid-action re-plan within the reaction time (0.045 s at DRI 99). A technique is committed only from 0.08 s before its decisive contact. The ball is the frozen kernel's (BALL-FEEL-1.3 / DRIBBLE-V1): each contact is one launch, and the ball is never attached to the foot.

## Results

**The owner's explicit tests.** Scripted on the same simulation (`tools/pt_tests.mjs`, `evidence/PT1_INPUT_TESTS.*`). Every sequence: 0 missed contacts, deterministic.

| Sequence | What the player does | Body + ball on the new line |
|---|---|---|
| W → WD → D → SD → S | carry corrections only (45° steps) | +0.56 s |
| sprint W → A | **Ronaldo chop R** (set touch → chop → exit) | +0.95 s |
| sprint W → S | drag-back L | +0.85 s |
| W → D → W → A | chop L → chop R (the last A: a carry turn) | +0.35 s |
| run W → A | Ronaldo chop R | +0.79 s |
| run W → SA (135°) | inside hook R | +0.81 s |
| jog W → D | outside cut R | +0.66 s |
| walk W → A | carry turn | +0.35 s |
| stop | inside cushion, then sole | — |

**Timing sweep.** The same turn, pressed at 13 moments of the stride, gives different sensible outcomes; the HUD gives the reason for each.
- RUN W → A: mostly the chop R, at +0.6 to +1.0 s depending on the stride phase. One moment just after a touch is a carry turn instead.
- SPRINT W → A: the outside cut L right after a knock-on, otherwise the chop R. A sprint chop needs a set touch first, because the ball is 1.5–2 m ahead.

**In the browser.** Chrome, real key presses on the real-time loop, a 34 s tour (`tools/pt_browser.cjs`, `evidence/PT1_BROWSER_TOUR.json`):
- 58 contacts, 0 missed;
- outside cut, drag-back and Ronaldo chop chosen from WASD alone.
- Each run's choices vary with the millisecond timing of the keys; other runs gave chop L / chop R / drag-back L and R.

**Performance** (1440 × 900, the last 1200 frames):

| Measure | avg | p95 | p99 | worst |
|---|---|---|---|---|
| frame | 16.67 ms | 16.70 ms | 16.80 ms | 16.80 ms |
| work per frame | 1.13 ms | 2.00 ms | 2.80 ms | 5.40 ms |

- Frames are vsync 60 Hz with no dropped frame.
- Work splits into simulation 0.24, pose 0.31 and render 0.58 ms on average.
- Re-planning averages 0.68 ms, worst 4.6 ms. There are no hidden spikes: RUN-1's tables are baked into `pt_baked.json` instead of being solved in a frame.

**Determinism**
- The browser session re-simulated from its recorded input and seed: hash, contacts, actions and ball all IDENTICAL (ball Δ 0).
- The same browser session re-simulated in node: identical hash, so node and the browser are bit-identical (`evidence/PT1_NODE_EQUALS_BROWSER.txt`).
- Live attribute and foot changes are part of the record.

**Animation neutrality.** Animation ON vs OFF gives identical hash, contacts and actions in 6 / 6 scenarios (`evidence/PT1_NEUTRALITY_AND_POSE.txt`). The body only reads the simulation's history.

## Limitations (honest)

- **Ball / boot overlap (visual only).** In the final tour the ball is more than 20 mm inside a boot in 2.3 % of ticks: short 30–60 mm spans, mostly around lateral carry touches (`evidence/PT1_POSE_AUDIT_tour.json`). Two other sessions measured 2.5 % and 2.7 %; before this session's fixes it was 12.8 %. What changed:
  - swing feet are pushed clear of the ball;
  - stances are placed off the free ball's path;
  - the touching foot's own landing is placed off the path its touch gives the ball;
  - a stop's final stance is placed off where the ball comes to rest.
- **Legs through each other (visual only).** More than 20 mm in 0.6 – 1.7 % of ticks across sessions: short spans in sharp low-speed carry turns and the carry step after a chop. It was 3–6 % until a mirror fault was fixed: a tie-break in the gait gave the left-foot chop an extra planted step. Chop L and chop R are now exact mirrors (0.0 mm).
- **Sprint chops are slow.** About 0.8 s from the request to the chop: the ball is knocked 1.5–2 m ahead at a sprint, so a set touch comes first.
- **No techniques below jog speed.** 45° changes are carry corrections by design. Walking 90° turns and standing 180° turns are carry turns: no technique is cheaper there, and the chop's speed floor is 3.6 m/s.
- **Two-footed / left-dominant.** These go through the same resolver (mirror) but have had less scripted coverage than right-dominant.
- **Attributes below 99** are provisional linear scaling, labelled on the page. **Style:** only neutral is implemented.
- **Follow camera.** It turns slowly by design (no snapping), so after a 180° reversal it takes about 2 s to come round.
- **Replay** re-poses from the recorded history. A contact that was still in the future at the replayed instant uses its real record, so the foot can differ from the live frame by millimetres.

## Isolation

New files only:
- `sandbox/visual/tc_playtest1/` (pt_ball, pt_params, pt_tech, pt_sim, pt_body, pt_viewer, pt_baked.json, tools);
- `sandbox/visual/tc_playtest1.html`;
- `review_artifacts/tc_playtest1/`.

The following are read-only imports:
- the ball kernel (`dribble15/d15_core.js` BALL_DEFAULT);
- TECHNICAL-CONTROL-1.5's pose code (`technical_control15/tc15_ref.js`);
- TECHNICAL-CONTROL-1.1's leg chain;
- RUN-1.3;
- DRIBBLE-1's boot colliders;
- receive_turn11's body constants.

No tracked file changed (frozen check). No defenders, passing, shooting or goalkeeper.

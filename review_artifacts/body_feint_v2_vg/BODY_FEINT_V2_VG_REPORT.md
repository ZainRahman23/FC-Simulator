# BODY FEINT V2 — VIDEO-GUIDED REVIEW (23 Oct 2026)

**Status: stopped for the owner's 1× review. NOT frozen, NOT integrated.** Owner instruction, verbatim: `sources/2026-10-23_user_instruction_body_feint_v2_video_guided.md`.

**I cannot play video in real time.** I studied the recording frame by frame instead (`VIDEO_STUDY.md`):
- every one of its 458 frames, enlarged;
- the player and the ball tracked against the pitch;
- every key frame compared side by side with renders of our player from the same viewpoint.

The 1× judgement is the owner's.

**The reference is EA FC 26 game footage** (a tutorial clip), so it is motion-captured animation, not broadcast football. It is third-party, and none of its frames are committed. The comparison sheets live only in the session scratchpad.

## ▶ PLAYABLE (LOCAL ONLY — the characters are real players' models)

**BODY FEINT V2 — VIDEO-GUIDED REVIEW:** http://127.0.0.1:8361/sandbox/visual/feint2vg_lab.html (its first section). Joystick sandbox: http://127.0.0.1:8361/sandbox/visual/feint2vg_sandbox.html.

- **Six cards:** JOG, LOW SPEED and RUN, each as FAKE LEFT → RIGHT and FAKE RIGHT → LEFT.
- **Buttons on each card:**
  - ▶ VIDEO-GUIDED V2;
  - **A | B | C**: PREVIOUS V2 · VIDEO-GUIDED V2 · OLD, from the identical entry and input, synchronised, 2.6 m apart. Lane A runs the committed PREVIOUS V2 build (`feint2/`, 0c65eac3) untouched.
  - PREVIOUS V2 alone;
  - OLD alone;
  - MIRROR;
  - TRY (the joystick);
  - 1× / 0.5× / 0.25×.
- **Cameras:**
  - GAMEPLAY · FRONT;
  - **FRONT HIGH**: the recording's own view, in front of the player, 40° up, a long lens;
  - **REAR CLOSE** · **SIDE CLOSE** · **OVERHEAD CLOSE**;
  - **THREE LANES**: the A | B | C default.
- **Replay bar:** FRAME STEP (, / .) and LOOP (on).
- **Starting rate:** everything starts at 1×.
- **The earlier sections follow:** the other feint cases, OLD | V2, RAPID INPUT, the advanced solutions, the full library.

## 1. What the video taught us

The recording has four feints:
- **A, B, D:** lie to the player's right;
- **C:** a body mirror, lie to his left.

They share the same structure and timing to within ±2 frames. With t = 0 at the false-step plant, and the touch at about +0.28 s:

1. **The penultimate step lands on the exit side, on the ball's line** (−0.17). Its push launches the false step and begins a hard brake.
2. **The deception starts slightly before the plant.** By −0.07 the trunk is tipping and the exit-side arm is rising.
3. **The false step lands WIDE:** about 0.25 m outside the line the body was running, about 0.6 m from the ball, toe out (0.00).
4. **The lie is held about 0.15 s (+0.05 … +0.20):**
   - the trunk flexes forward about 35–45° and leans about 20–25° toward the fake, in one curve through the spine;
   - the head drops with it, turned toward the fake;
   - the fake-side shoulder is low and forward;
   - the exit-side arm is thrown out at shoulder height, elbow nearly straight: the counterweight;
   - the fake-side hand is low by the fake knee;
   - **the exit-side leg is lifted BEHIND, knee about 90°**, so every gram is on the fake leg;
   - the running arm cycle is gone.
5. **The momentum commits.** Forward speed falls from about 3.2 to about 0.8 m/s while the upper body moves about 0.2 m toward the fake. For an instant the movement points that way, and that is what makes it believable.
6. **The ball is not touched during the lie.** It rolls on, on the exit side. The body leaves it (the gap grows to about 0.4 m), then comes back to it.
7. **The hips go back first.** From about +0.10 the centre of mass returns toward the ball while the upper body is still at its deepest. Then the trunk rises as the free foot swings through from behind and **lands at the ball: the touch on the landing step** (+0.28). The fake foot is still down at that point.
8. **The release is quick.** The fake foot steps inward. By +0.40 the player is upright with the normal arm carriage, and he re-accelerates over about 0.5 s.
9. **The sequence propagates foot → (trunk + head + arms together) → centre of mass back while the upper body still sells → free foot → ball.** It is not foot → hip → torso → reversal. The upper-body cues and the false step overlap; the hips' reversal comes before the upper body's.

## 2. Why PREVIOUS V2 looked wrong (`COMPARISON.md`, measured from FRONT HIGH before any change)

1. **Wrong body parts for the lie.** It used yaw (trunk twist over the hips) and a clavicle drop. From the front these are small rotations of an upright body: trunk pitch 5°, lean 8°, head 4.5 cm lower. The reference tells the lie with flexion and a lateral lean of the whole trunk, with the head going down.
2. **The arms never left the running cycle.** The exit-side hand hung 0.33 m below its shoulder, with no counterweight shape.
3. **The free leg gave the exit away.** At the strongest instant the exit-side foot was 0.15 m *in front of* the pelvis, already heading for the ball. In the reference it hangs behind.
4. **The momentum never committed.** Forward speed only fell from 3.2 to 2.6 m/s, so the body still said "forward".
5. **The ball sat in front of the body and was knocked out at 45°.** In the reference it rolls on the exit side and is collected.
6. **The timing was late.** The maximum lie came just before the touch, and the hips returned with the touch.

**Its timing skeleton was close to the reference's:** false-step plant → touch was 0.32 s against 0.28 s. So the support skeleton and the decisive touch were kept and the body inside them rebuilt.

## 3. What changed (`sandbox/visual/feint2vg/`, a copy of `feint2/`; `feint2/` is unchanged)

| Area | VIDEO-GUIDED V2 |
|---|---|
| **Feet** | The false step lands wider: 0.39–0.43 m outside the pelvis (was 0.15–0.23), toe out 30°. The fake foot stays planted through the touch (double support, as in the reference). The free foot lifts behind through the lie (0.28 m up, 0.24 m behind at a jog). The fake foot's exit stride steps forward and in, in front of the planted exit foot. |
| **Knees** | Both flex under a deeper drop: the pelvis 10 cm lower at the lie (0.79 m against 0.89). |
| **Hips / pelvis** | Turned a little toward the fake (16°). The centre of mass shifts only about 0.11 m toward it: the honest signal stays small. It reverses 0.10 s before the touch (PREVIOUS: at the touch). The pelvis then releases to the exit first. |
| **Torso** | Forward pitch 23° and lean toward the fake 29° at the deepest (PREVIOUS: 5° / 8°). The trunk channel's flexion is 38°, spread through the pelvis, spine and chest as one curve. The upper trunk is turned a little further than the hips (20°). |
| **Shoulders** | The fake-side shoulder dropped (19°) and lowered by the lean. |
| **Arms** | **New authored arm posture** (per side: abduction / flexion / elbow), blended over the running cycle and replacing it during the lie. The exit arm is thrown out: hand 0.15 m above its shoulder, 0.53 m out, elbow about 28°. The fake hand hangs straight down by the fake knee (0.57 m below its shoulder). The running cycle is switched off during the lie (`gait` 0) and comes back as a driving swing on the exit. |
| **Head** | Drops 19 cm with the trunk (PREVIOUS: 4.5), turned toward the fake. It no longer looks at the ball during the lie (the ball is on the exit side: that would be a giveaway). It comes up as the free foot swings through. |
| **Ball** | Placed on the exit side of the body at the touch: 0.30 m ahead, 0.22 m across. Untouched through the lie. The free foot's outside collects it on its landing step and sends it at about the approach speed (was 1.3 ×), so the ball stays within reach. Separation: jog 0.66 m (= PREVIOUS), run 0.79 m (PREVIOUS 1.15). |
| **Timing** | The lie starts in the penultimate step's push, peaks just after the plant and is held to −0.06 before the touch. False-step plant → touch 0.29 s. The upper body rises during the free foot's swing. |
| **Exit** | Hips release first, shoulders follow, then the driving arm swing. The re-acceleration keys are steeper but capped by D38 (no bonus). A larger exit turns more slowly (beyond 54°, the post-touch keys are stretched by the extra turn). |
| **Speed** | The momentum commits: jog 3.2 → 1.7 → 3.2, walk 1.5 → 0.8 → 1.5, run 5.3 → 3.5 → 5.3 m/s (PREVIOUS: 2.6 / 1.2 / 4.5 at the lowest). |
| **Entry** | The feint opened at its false step (the trimmed entry) takes the ball where its last carry touch rolls it. That changes which entries are feasible, not the motion. At a walk the late stride phases fall from 1.02–1.22 s to 0.47–0.73 s. |

**The rules added, each switchable for tools (`ABL=`):**
- `bfball`: the trimmed entry's ball window, and the walking trimmed entry limited to 50° exits;
- `bftrim`: the trimmed entry's facing and heading start from the entry line;
- `bfturn`: the slower turn for large exits;
- `bfblend`: control leaving a feint blends the posture over at least 0.18 s.

**Shared code** (`u_body.js`, `u_tc.js`): only new channels and branches that are zero, or never reached, for every other action.

## 4. Before / after (jog, measured on the posed body at each version's deepest moment: `tools/feint_shape.mjs`)

| | OLD (VOCAB-1) | PREVIOUS V2 | VIDEO-GUIDED V2 | Reference (approx.) |
|---|---|---|---|---|
| Trunk forward pitch (pelvis → head) | 8° | 5° | **23°** | 35–45° (trunk) |
| Lean toward the fake | 0° | 8° | **29°** | 20–25° |
| Head drop | 3 cm | 4.5 cm | **19 cm** | marked |
| Exit hand vs its shoulder | −0.49 m (hanging) | −0.33 m (hanging) | **+0.15 m, 0.53 m out** | at / above shoulder, out |
| Fake hand | −0.29 m | −0.53 m | −0.57 m (straight down) | low by the fake knee |
| Free (exit-side) foot | ordinary stride | 0.15 m *in front* | **0.24 m behind, 0.28 m up** | behind, knee about 90° |
| False step outside the pelvis | — | 0.15 m | **0.39 m** | about 0.3 m |
| Lowest speed | 3.2 m/s | 2.6 m/s | **1.7 m/s** | about 0.8 m/s |
| False-step plant → touch | — | 0.32 s | 0.29 s | 0.28 s |
| Request → touch (this case) | 0.45 s | 1.02 s | 1.02 s | — |
| Request → useful exit | 0.48 s | 1.07 s | 1.15 s | — |

- **Walk and run:** the VIDEO-GUIDED values are near the jog's (pitch 22–23°, lean 22–29°, head 20–21 cm, exit hand out 0.53–0.57 m).
- **At a run the lie is shorter** (time scale 0.8). At its deepest moment the free foot is already swinging through (0.18 m up, level with the pelvis) instead of hanging behind.
- **Pitch:** the trunk's measured pitch (pelvis → head) is lower than the reference's trunk angle, because the head lifts a little to keep the eyes on the play. Making it deeper is one of the owner's decisions (§9).

## 5. Integrity

**Six curated cases** (`evidence/feint_integrity.txt`, normal-visible / slow-motion):

| | Plant slides | Foot jumps | Leg crossings | Knee pops | Floats | Foot swaps | Pelvis step / tick | Torso / shoulder spikes | Possession |
|---|---|---|---|---|---|---|---|---|---|
| VIDEO-GUIDED V2 | 0/0 | 0/0 | 0/0 | 0/0 (run 0/1) | 0/1–0/2 | 0/0 | 0.2–0.4 cm | 0 | 0 missed, 0 exits |
| PREVIOUS V2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/1–0/2 | 0/0 | 0.0–0.1 cm | 0 | 0 missed, 0 exits |

**Exit angles 15–90°** (`tools/` sweep, 4 stride phases each): **no visible event at any pace**. This was fixed during the work:
- the wide false step first crossed the legs at large exits (6–12 cm, ≥ 60–75°);
- the fake foot's exit stride is now routed in front of the planted exit foot;
- a larger exit turns more slowly;
- a walking feint opened at its false step is limited to 50°.

**RAPID INPUT** (the 14 sequences, each as written and mirrored: 28 runs, `evidence/rapid_input.txt`):
- **Totals:** VIDEO-GUIDED body normal 13 / slow 75 · spikes 80 · 0 planted-foot turns · 0 exits · 0 missed. PREVIOUS V2: 2 / 48 · 59.
- **Fixed on the way:**
  - the second feint of a pair crossed its legs (8–10 cm): the exit-stride routing and the slower large-exit turn;
  - a feint cancelled inside the lie snapped the shoulders at about 1100°/s as the carry took over: control leaving a feint now blends the posture over at least 0.18 s, including CONTROLLED's chase plans and the carry's trajectory-driven lean.
- **The feint's own phases:** no normal-visible event in any sequence.
- **What remains is in the ordinary carry under chained or over-fast requests:**
  - 8 floats of 0.15–0.18 s. They count as visible because the carry is then below 3 m/s (the visible threshold is 0.14 s there, 0.25 s above). The deeper feint leaves the body slower. PREVIOUS V2's same carry flights (up to 0.22 s) were above 3 m/s.
  - The carry's far-foot crossing under over-fast alternation (requests every 1.25 s): 11.5–12.6 cm, where PREVIOUS V2 had 7 cm at the same moment.
  - A shoulder-roll burst (up to 1085°/s) in the same sequence, where the carry's trajectory-driven lean takes over between the two feints.
- **Unchanged from PREVIOUS V2:** the spikes when the Cruyff / outside cut follow a feint (17, 4, 2: identical).
- **Not fixed:** the carry's own gait and lean are outside this task.

**Regression** (`evidence/`; every non-feint line compared with PREVIOUS V2's evidence):

| Check | Result |
|---|---|
| Curated cases (116) | every non-feint line identical · 0 exits · 0 missed · the feint cases 0 normal-visible |
| Extreme redirection ball on / off (140 + 140) | identical (61 / 131 · 61 / 69) |
| Technique battery | identical (67 / 72) |
| Determinism | 18 / 18 simulated twice · 18 / 18 replay path |
| Body torture 18 × 60 s (random play) | 254 / 328, identical to PREVIOUS V2: the feint is manual only |
| Possession torture 40 seeds (page config) | 10 losses (0.26/min), 0 missed, identical apart from CPU |
| Random manual requests (361) | 0 exits, 0 missed, ball never > 3 m |
| CPU | 115.5 vs 113.2 ms per simulated s (+2 %); worst tick 19.5 vs 16.1 ms |
| Browser (Chrome) | 0 console errors · 0 HTTP errors · 176 feint-section buttons · 9 cameras · frame step · the six A \| B \| C tables · the sandbox request PLAYED |

**Shared code, and why:**
- **`u_body.js`, the arm posture and head drop:** a pose that did not exist (the running cycle's arms cannot be thrown out or held low), so it was needed. It is zero for every other action.
- **`u_tc.js` and `u_sim.js`, the blend on leaving a feint:** needed because the deeper lie made a cancel snap. It applies only when the previous action was a body feint.
- **Effect on the other actions:** none — every non-feint replay, torture and battery line is identical.

## 6. Mirror

FAKE RIGHT → LEFT is the exact mirror of FAKE LEFT → RIGHT:
- the same template, with every signed channel, the arms and the feet mirrored by the foot;
- support identity, pelvis, shoulders, arms, feet and ball are all mirrored;
- every number in `feint_measure` and `feint_integrity` is identical for each pair.

## 7. Timing honesty

- **Unchanged:** request → touch depends on the stride phase at the request. At a jog it is 0.65–1.14 s, the same as PREVIOUS V2: in those phases neither entry (the full one, or the one opened at the false step) can meet the ball before the next stride.
- **The walk improved:** 0.47–0.81 s in most phases, from up to 1.24 s.
- **The cost of the deeper commitment:** useful exit is 0.08 s later than PREVIOUS V2 at a jog (1.15 vs 1.07), 0.09 s at a walk (0.95 vs 0.86), 0.02 s at a run (1.02 vs 1.00). The touch time itself is unchanged.
- **Rejected attempt:** predicting the ball from a committed carry touch, to open more entries. It mispredicted by 0.8 m, which risks missed contacts, so it was reverted.

## 8. Limitations

- **Not covered:** no sprint variant, no defenders, no "fooled" measure.
- **Exit:** the request's exit (12–90°) is what the feint takes. The reference's own exits are shallower (10–25°).
- **The reference's brake is deeper still** (about 0.8 m/s at a jog against our 1.7), and so is its trunk.
- **RAPID INPUT:** carry floats and a carry crossing remain under chained or over-fast requests (§5).
- **Pre-existing, not touched:**
  - the approach stride's high knee before the false step (PREVIOUS V2 has it too);
  - the 9 s gait-cycle freeze in other builds (this build carries feint2's fix);
  - the Cruyff / outside cut / croqueta spikes when chained after a feint (identical in PREVIOUS V2).

## 9. Owner decisions

1. **At 1×:** does the whole player now tell one believable lie and escape the other way?
2. **Depth:** deeper still toward the reference (trunk about 35°+, the brake toward 1 m/s at a jog, more cost), or this compact version?
3. **Exit angle:** keep the request's exit (up to 90°), or shape the feint toward the reference's shallower exits (10–30°)?
4. **Classification:** MANUAL / REVIEW as built; never AUTO without defenders.

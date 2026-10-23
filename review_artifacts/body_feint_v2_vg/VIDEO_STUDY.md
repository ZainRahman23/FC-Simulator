# BODY FEINT V2 — video study of the owner's reference recording

**Source.** The owner's `Screen Recording 2026-10-23 at 12.11.32 PM.mov`: 7.63 s, 60 fps, 2786 × 1330. It is a screen capture of an **EA FC 26 tutorial clip**, so the reference is game footage (motion-captured animation), not broadcast football. The clip is third-party, and neither the recording nor any frame from it is committed.

**How it was studied.** I cannot play video in real time, so the study is frame by frame:
- I tracked the player's bib through all 458 frames and cut a close crop around him in every frame.
- I measured the camera pan from the grass texture by phase correlation. A planted boot stays put to ±1.5 px, which checks the method.
- That gives ground-plane paths for the upper body (the bib) and the ball, plus the planted boots.
- I then read the crops at 1/60 s steps, enlarged, through every example.

The tools live in the session scratchpad (`bftools/track.py`, `pan.py`, `crops.py`, `ball.py`, `blobs.py`). Numbers are in half-resolution pixels; at the player, about 54 px is 1 m across the screen and about 38 px is 1 m in depth.

**The camera** sits in front of the player, about 40–45° above the pitch. The player runs toward it, so screen-left is the player's RIGHT.

## The examples

There are four feints in the 7.6 s:

| | Frames | Lie (false step + lean) | Later heading change |
|---|---|---|---|
| A | 112–172 | to his RIGHT | ≈ 12° to his left |
| B | 232–275 | to his RIGHT | ≈ 12° to his left |
| C | 316–356 | to his LEFT (a body mirror) | ≈ 25° further left |
| D | 392–432 | to his RIGHT | ≈ 25° to his right |

The heading change afterwards is the tutorial player steering. The move itself never redirects the ball. **A** is the cleanest, and its timeline is below, with t = 0 at the false-step plant (frame 130). B, C and D share the same structure and timing to within ±2 frames.

## A, frame by frame

| t (s) | Frame | Feet / legs | Pelvis / centre of mass | Trunk / shoulders | Arms | Head | Ball |
|---|---|---|---|---|---|---|---|
| −0.30 | 112 | jog: feet under the body, ordinary stride | upright, forward ≈ 3.2 m/s | upright, square | ordinary carriage (elbows ≈ 90°) | up, looking ahead | ≈ 0.5 m ahead, rolling, untouched since the last carry touch |
| −0.17 | 120 | **penultimate step: the exit-side (left) foot lands on the ball's line** | starts braking | upright | still in the cycle | — | beside the right foot |
| −0.10 | 124 | the right foot passes the ball's side, no touch; the left foot pushes off | braking hard | begins to tip | **the exit-side arm starts to rise** | — | rolls on |
| **0.00** | **130** | **FALSE STEP: the right (fake-side) foot lands WIDE**, ≈ 0.6 m from the ball and ≈ 0.25 m outside the line the body was running, toe turned out, the knee flexing | the body falls toward it | **trunk pitches forward and drops toward the fake** | exit-side arm out at shoulder height, elbow almost straight; fake-side arm hanging toward the right knee | drops with the trunk, toward the fake | ≈ 0.3 m on the EXIT side of the pelvis, level with the feet |
| +0.03 → +0.20 | 132–142 | the fake leg is a long diagonal strut; **the exit-side foot is lifted BEHIND, knee ≈ 90°** (all the weight on the fake leg) | **upper body at its widest toward the fake (≈ 0.2 m) at +0.08**, then already returning from ≈ +0.10; forward speed ≈ 0.8 m/s | **deepest at +0.07 … +0.20**: forward flexion ≈ 35–45°, lateral lean toward the fake ≈ 20–25°; the fake-side shoulder low and forward | held: exit arm out and a little back (the counterweight), fake hand low by the fake knee | lowest at the trunk's deepest, turned toward the fake | **untouched**, rolling on; the body–ball gap grows to ≈ 0.4 m across |
| +0.20 → +0.28 | 142–146 | the exit-side foot swings through from behind | back on the ball's side | starts to rise; the hips lead | the exit arm lowers | rises | — |
| **+0.28** | **147** | **the exit-side foot lands AT the ball: the touch**; the fake foot still planted (double support) | forward speed at its lowest | still flexed, rising | coming in | up | collected; it barely changes direction |
| +0.33 → +0.40 | 150–154 | the fake foot lifts and steps INWARD under the body | re-accelerating | nearly upright | **back in the running carriage** | looking ahead | in front of the body |
| +0.45 → +0.50 | 157–160 | ordinary running stride | ordinary | upright | ordinary | ordinary | carried |

## What it teaches

1. **The deception propagates foot → trunk/head/arms together → centre of mass.**
   - **Overlapping cues:** the false step lands with the trunk already tipping and the exit arm already rising. The trunk, head and arms reach their extremes 0.05–0.10 s after the plant.
   - **The centre of mass reverses first:** the hips return toward the ball line from about +0.10, while the upper body is still at its deepest. This is the "hips release first" of the coaching description, seen from the front.
2. **The lie is held, not flicked.** The deep posture lasts about 0.15 s (+0.05 … +0.20), long enough to read at 1×. The whole action, from penultimate step to normal running, takes about 0.65 s.
3. **The body abandons the ball.** The ball is not touched during the lie: it keeps rolling on the exit side. The body moves away from it toward the fake, then comes back, and the exit-side foot collects it as it lands.
4. **The legs commit completely.** The exit-side foot is off the ground and BEHIND the body during the lie, so all the weight is on the fake leg. That leg, planted wide, is also the strut that pushes the body back. The free leg never comes forward until the swing to the ball.
5. **The arms make one big asymmetric shape.** The exit-side arm is thrown out at shoulder height and a little back, elbow nearly straight: a counterweight to the falling trunk. The fake-side arm hangs low by the fake knee. Neither is in the running cycle.
6. **The trunk does most of the selling, by flexion and lateral lean rather than by twist.** The pelvis turns a little toward the fake; the shoulders go further (the fake-side shoulder low and forward). The spine bends in one smooth curve: no rigid block and no separate twist.
7. **The feint costs most of the forward speed.** About 3.2 → 0.8 m/s, so for an instant the movement points toward the fake: that is what makes it believable. The player then re-accelerates over about 0.5 s.
8. **The exit is efficient, not elaborate.** One touch, collected on the landing step, then running. By +0.40 the player looks ordinary again.

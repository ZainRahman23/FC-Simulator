# LA CROQUETA — VIDEO-GUIDED (23 Oct 2026)

**Status: stopped for the owner's 1× review. NOT frozen, NOT integrated.**

- **The instruction:** the owner's, verbatim, in `sources/2026-10-23_user_instruction_croqueta_video_guided.md`.
- **The reference:** the owner's recording `~/Desktop/Screen Recording 2026-10-23 at 2.43.36 PM.mov`, broadcast footage of Messi. It is third-party footage, so it is not committed.
- **How it was studied:** I cannot play video in real time. I read the recording frame by frame, at 60 fps (`VIDEO_STUDY.md`). Our renders were compared against it frame by frame from the reference's own view, aligned on the first touch.
- **Scope:** La Croqueta only. The Body Feint and every other move are unchanged (§5).

## ▶ PLAYABLE — LA CROQUETA — VIDEO-GUIDED REVIEW (LOCAL ONLY)

**http://127.0.0.1:8361/sandbox/visual/croqvg_lab.html** (it opens on the review section, with the first card playing). The sandbox is `croqvg_sandbox.html`.

- **Six cards:** the reference's side (the left inside across to the right foot) at a walk (the reference's pace), a jog and a run. Then the mirror, the right inside across to the left foot, at the same three paces.
- **Buttons on each card:**
  - ▶ **B · VIDEO-GUIDED**;
  - **A · CURRENT ADV-4**: the committed `feint2ef/` build (f8a0e374), run untouched;
  - **A | B side by side**, from the identical entry and input, synchronised, with a comparison table;
  - MIRROR, TRY;
  - **1× / 0.5× / 0.25×**.
- **Cameras:**
  - **REAR HIGH**: the reference's replay view, and the default. It stays behind the approach like the broadcast camera, so the move into the new lane reads against the pitch.
  - GAMEPLAY, FRONT HIGH, FRONT, REAR CLOSE, SIDE CLOSE, OVERHEAD CLOSE.
  - **OVERHEAD · FIXED**: a still camera above the transfer, so the player runs through the frame.
  - BOTH LANES · REAR HIGH (the A | B default) and BOTH LANES · FRONT.
- **⇄ A | B at this moment:** the other version at the exact replay moment, in the same camera.
- **BALL: SHOWN → DIM → HIDDEN:** the ball-hidden test.
- **LANE GUIDE:** each lane's entry line, plus the authoritative root's trail (magenta) and the ball's (white).
- **Controls:** frame step (▸| step, or `.`) and LOOP, in the top bar.
- **Trying it in the sandbox:** the sandbox player is right-footed and carries the ball on the right foot. Request the croqueta with the **stick to the LEFT** for the video-guided one: the right inside across to the left. With the stick to the right, the ball is on the wrong foot and ADV-4's transfer plays instead (§7.5).

## 1. What the video taught us (`VIDEO_STUDY.md`)

- **Rhythm.** A walking dribble, then a slow, almost static set-up, then one quick shift of ball and body together, then an immediate diagonal re-acceleration. The first touch is at 0 and the second at **+0.28 s** (±0.03).
- **Feet.**
  - Set-up: both feet planted about 0.5 m apart, the ball inside the left foot.
  - At the touch: the left foot is far out to the side and back, and its inside sweeps the ball.
  - After: the left foot's follow-through brings it down under the body, beside the right foot.
  - The right foot: planted under the right hip at the touch and loaded; it then lifts (≈ +0.15 – 0.20 s) and steps out to the ball.
- **Ball.** Level with the pelvis at the first touch, never ahead. It is a controlled roll **under the moving body**. It arrives at the right foot's inside beyond the body's line, and the right foot carries it straight on.
- **Knees.** Both flexed in the set-up. The left knee extends through the touch (the long push-off leg); the right stays flexed and loaded.
- **Hips and pelvis.**
  - The pelvis **translates before it rotates**. It starts toward the right foot ≈ 0.10 s **before** the touch and is already ≈ 0.2 m across at the touch: the body leads the ball.
  - The push-off hip rides higher.
  - It stays roughly square until the receive, then turns into the exit. It travels ≈ 0.45 – 0.5 m across by the receive.
- **Centre of mass.** Moves continuously from the set-up into the new lane, with no pause between the touches.
- **Torso and shoulders.** A lean toward the exit (≈ 20°) and a strong forward pitch (≈ 35 – 40°) over the right knee. The exit-side shoulder dips.
- **Arms.** The **right** (exit-side) arm opens ≈ 45°, nearly straight and low: the counterbalance. The **left** stays low, a little out and back, and comes forward with the exit stride. They are never symmetrical and never a running swing.
- **Head.** Down over the ball, moving with the trunk.
- **Exit.** The body leans into the new lane, stays low and re-accelerates. The right foot keeps the ball.

## 2. Why ADV-4 looked wrong (`COMPARISON.md`, per region)

It is **two foot touches underneath a running body**:

1. **No set-up and no load:** the speed is constant (1.5 / 3.2 / 5.3 m/s).
2. **The pelvis is still on the entry line at the touch:** the root 0.03 / 0.04 / 0.10 m across, against ≈ 0.2 m in the reference.
3. **The ball leads the body:** at the receive the ball is 0.20 m further across than the pelvis.
4. **The trunk is upright, with running arms:** pitch 6 – 10° against ≈ 35 – 40°.
5. **The receive is a separate action** (LATERAL TRANSFER → GATHER), and the receiving foot is mid-stride at the first touch.
6. **There are 4 shoulder-roll spikes** (> 900°/s) at the jog's touch.

## 3. What changed (`sandbox/visual/croqvg/`; walk / jog / run, the reference's side; t = 0 at the first touch)

| | CURRENT ADV-4 | VIDEO-GUIDED |
|---|---|---|
| **Set-up** | None: a running step, the speed constant | A braking plant beside the ball and the receiving foot planted wide. Speed 3.2 → **2.0** → 2.3 (+0.5 s) → 3.2 (+1.0 s) at a jog; 5.3 → 3.4 → 4.2 at a run |
| **First touch** | The inside; the touching foot 0.29 – 0.35 m from the pelvis; the boot 5.3 – 6.0 cm into the ball at a jog / run | The inside, a sweep **from the planted foot**. The leg long as the push-off: the foot **0.41 – 0.42 m** from the pelvis. Gap −0.1 / −1.2 / −2.0 cm |
| **Body transfer** | Starts 0.06 – 0.07 s before the touch | Starts **0.18 s before** the touch. The body leads: the pelvis is **0.23 – 0.26 m** across from the ball at the touch (CURRENT 0.14 – 0.23) |
| **Pelvis** | The root 0.03 / 0.04 / 0.10 m across at the touch and 0.36 / 0.51 / 0.75 m at the receive | The root **0.17 / 0.24 / 0.33 m** at the touch and **0.51 / 0.69 / 1.02 m** at the receive. It translates first and turns into the exit after the receive. Lowest pelvis 0.82 m (CURRENT 0.85 – 0.86) |
| **Receiving leg** | Already in the air at the touch; the receive is its next stride | **Planted wide under the body at the touch.** It lifts +0.18 / +0.16 / +0.13 s after, and steps out to the ball beyond the body's line |
| **Second touch** | The inside, a separate GATHER action | **The inside, beyond the body's line:** the ball arrives where the pelvis is going (pelvis 0.51 / 0.69 / 1.02 m, ball 0.55 / 0.83 / 1.12 m, the foot beyond it). The ball is sent on into the new lane. Gap −0.1 / +0.2 / +0.3 cm |
| **Torso** | Pitch 6 – 10°, lean toward the exit 11 – 17° | Pitch **27°**, lean toward the exit **26°** (pelvis → neck). The hips turn only ≈ 14° by the receive, then into the exit. The head drops over the ball |
| **Arms** | The running swing; hands 0.21 – 0.27 m (right) and 0.12 – 0.15 m (left) out from the shoulder | **Authored per side.** Low in the set-up. The **exit arm opens** (0.32 m out, ≈ 45° in the world on the leaning trunk); the **push-off arm** stays low and back, then comes forward with the exit stride |
| **Exit** | Upright running from the gather | The body stays low and pitched for the first strides. The **receiving foot keeps the ball**: its next touch is two steps on (+0.75 s walk, +0.59 s jog, +0.50 s run). The whole body then re-accelerates along the new lane |
| **Touch to touch** | 0.30 / 0.23 / 0.20 s | **0.30 / 0.27 / 0.23 s** (reference ≈ 0.28) |
| **Request → first touch** | 0.40 / 0.44 / 0.49 s | **0.58 / 0.78 / 0.90 s**: the set-up's cost (§7) |
| **Shoulder / torso spikes** | 4 at a jog | 0 |

**Hidden-ball test:** with BALL: HIDDEN the body alone shows the transfer.

- the load, low and wide;
- the pelvis and trunk moving across before the touch;
- the push-off leg extending;
- the exit arm opening;
- the receiving foot stepping out;
- the lean carried into the new lane.

In CURRENT with the ball hidden, the body is an ordinary diagonal jog.

## 4. Integrity (`evidence/croq_integrity.txt`, 6 cases, against CURRENT ADV-4)

| | VIDEO-GUIDED (all six cases) | CURRENT ADV-4 |
|---|---|---|
| Plant slides · foot jumps · leg crossings · knee pops · floats · foot swaps (normal / slow) | **0/0 everywhere** | 0/0 everywhere |
| Contact gaps (first · receive · next) | −0.1 / −1.2 / −2.0 · −0.1 / +0.2 / +0.3 · 0.0 / −0.1 / −0.4 cm | −0.0 / −5.5 (−6.0 mirrored, sole nearest) / −5.3 (sole nearest) · 0.0 / +0.2 / 0.0 · 0.0 / +0.3 / +0.6 cm |
| Least leg clearance | 1.4 / 8.7 / 7.3 cm | 3.4 / 9.4 / 11.0 cm |
| Torso / shoulder spikes (> 900°/s) | 0 | 4 at a jog |
| Pelvis: largest per-tick step beyond the root's travel | 0.69 / 0.50 / 0.42 cm | 0.26 / 0.29 / 0.22 cm |
| Root discontinuity | 0.00 cm | 0.00 cm |
| Missed contacts · possession exits | 0 · 0 | 0 · 0 |
| Toe turn: fastest | 1689 / 1368 / 1230°/s, all in the approach's **set touch**, the shared machinery (§7) | 1056 / 865 / 1840°/s |

The pelvis step is a dip of 0.4 – 0.7 cm, in one 240 Hz tick, as a stretched leg lifts. It comes from the shared body's height compensation. It is about 1 cm between 60 fps frames, which isn't visible at 1×.

## 5. Regression (`evidence/`; every non-croqueta line compared with the Body Feint EXIT-FOOT evidence, which was produced by the same commands)

| Check | Result |
|---|---|
| **Body Feint** (feint_measure, feint_integrity, rapid input, feint_sync, exit-angle sweep) | **identical** |
| Extreme ball on / off | **identical** |
| Curated cases (122) | **0 non-croqueta lines differ.** The body summary is identical: 10 normal-visible events in 9 cases, as before. 97 / 107 with every request PLAYED: the six new REF cases all play, and one chain changes (§7.6) |
| Battery (72) | **identical apart from CROQUETA**, still 67 / 72 PLAYED. Of its four croqueta requests, three play exactly as before (ADV-4's transfer, the fallback); the jog at −30° now plays the new croqueta |
| Body torture 18 × 60 s | **identical**: 254 / 328 |
| Possession torture 40 seeds | **identical apart from CPU**: 10 losses, 0 missed |
| 361 random manual requests (intent torture) | 0 exits, 0 missed. **12 / 12 seeds** are identical, or identical until their first CROQUETA request (`intent_divergence.txt`). 11 are identical throughout. Seed 4 differs from 10.22 s, after its croqueta at 9.97 s: the request counts that shift (PLAYED 73 vs 74 …) come from that one croqueta |
| Determinism | 18 / 18 + 18 / 18 |
| CPU (the same torture input, interleaved, against CURRENT; two runs) | Run 1: 223.5 vs 205.6 ms per simulated s. Run 2: **181.8 vs 193.9**. **The same within the noise**: re-plan mean 5.23 / 4.13 vs 5.15 / 4.53 ms, candidates per re-plan 2.8 vs 2.8. The machine was swapping during both runs (`cpu.txt`, `cpu_run2.txt`) |
| The Lab's CURRENT lane | **12 / 12** contact sequences identical to the committed build's own runner (`lab_current_lane_equivalence.txt`) |
| Browser | 0 console errors · 0 HTTP errors · 6 cards · 48 buttons · 10 cameras · A \| B with its table · ⇄ at the same moment (0.80 s, engine switched) · ball DIM / HIDDEN · the lane guide · frame step · 0.25× · mirror (`browser.json`) |
| Sandbox | The CROQUETA request plays, 4 / 4 in each direction. **The right-footed sandbox player carries the ball on the right foot.** With the stick **left**, the new croqueta plays (the right inside across to the left). With the stick **right**, ADV-4's transfer plays (the fallback, §7.5) |

**Shared code:** the planner additions in `u_tc.js` / `u_sim.js` / `v_run.js` are all gated: they act only for the croqueta template (`croqVG`), its fallback flag (`genFallback`), or template fields only it uses (`rel: "stance"`, `aim.off`). `u_body.js` and `c_sim.js` are unchanged. The regression above is the proof.

## 6. The mirror

The same template, mirrored. **Every number in `croq_integrity` matches for each pair** (walk, jog, run): the contacts, the rhythm, the transfer and the integrity (`evidence/croq_integrity.txt`). The mirror plays:

- the right inside across to the left foot;
- the left arm opening;
- the lean and the lane to the left.

## 7. Limitations and costs

1. **Latency.** Request → first touch is 0.58 / 0.78 / 0.90 s (CURRENT 0.40 / 0.44 / 0.49). The set-up (a braking plant, then the load) is the reference's rhythm, and it costs 0.18 – 0.41 s.
2. **The jog and the run are extrapolations.** The reference is from a walking dribble. The faster versions keep its structure, but the body travels further across (the root 0.69 m at a jog's receive, 1.02 m at a run's) and the set-up is shorter.
3. **The set touch before the croqueta is the shared set-touch machinery.** At a jog or a run it meets the ball with the foot high (ankle ≈ 0.28 – 0.31 m). It also holds the fastest toe turn (1230 – 1689°/s). The same happens in other moves: on CURRENT, **16 of 51 set touches** across Stop-and-Go, Cruyff, Matthews, Chop, V-turn and the Body Feint meet the ball with the ankle above 0.22 m, at a jog, a run or a sprint. It was not retuned (shared movement).
4. **Control returns at +0.34 s** (after the receive). At a jog or a run the ordinary carry then plays the receiving foot's next touch itself, at the same moment and with the inside. At a walk the croqueta's own exit touch plays.
5. **When the ball is on the receiving foot's side** at the set touch, this croqueta is not played; the request falls back to ADV-4's generic transfer, as before. Without the rule, the first foot reached across the body and crossed the planted leg (8.8 cm). The same fallback covers a requested foot on the wrong side for the exit, e.g. the battery's runs.
6. **The chain "Croqueta → outside cut"**: its scripted cut request (t = 0.9 s) now arrives at the new croqueta's first touch (0.90 s), so the croqueta is reported SUPERSEDED, although its touches play. ADV-4's croqueta was over by then.
7. Contact overlaps of 1.2 cm (jog) and 2.0 cm (run) at the first touch, from the sweep. The walk's exit keeps only 1.4 cm of leg clearance.

## 8. Owner decisions

1. **At 1×:** does the entire footballer shift ball and body into the new lane as one continuous action? Compare B against A, and B with the ball HIDDEN.
2. **The set-up's latency** (+0.18 – 0.41 s to the first touch): keep the reference's rhythm, or shorten the set-up at a jog and a run?
3. **The jog and run versions:** the same structure as the walk, or a lighter set-up at speed?
4. **Ball on the wrong foot:** keep ADV-4's transfer as the fallback, or a different solution?
5. Freeze nothing yet: the next pass on your word.

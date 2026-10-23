# LA CROQUETA — X-SWEEP V3 (23 Oct 2026)

**Status: one reference case, stopped for the owner's 1× review. NOT generalized, NOT frozen, NOT integrated.**

- **The instruction:** the owner's, verbatim, in `sources/2026-10-23_user_instruction_croqueta_x_sweep_v3.md`.
- **The reference:** the HOP/SWEEP V2 recording (Iniesta), re-read for the X-shape (`VIDEO_STUDY.md`). It is third-party footage, so it is not committed.
- **How it was studied:** I cannot play video in real time. I read the frames as stills and compared our renders frame by frame (rear-low and front-high, ball shown and hidden).
- **Scope:** the one case only, at a jog. No walk or run, no AUTO / input / ratings. The Body Feint, Cruyff, Chop, ADV-4 and possession are unchanged (§7).

## ▶ PLAYABLE — LA CROQUETA — X-SWEEP V3 REVIEW (LOCAL ONLY)

**http://127.0.0.1:8361/sandbox/visual/croqxs_lab.html** (it opens on the review, with the card playing). The sandbox is `croqxs_sandbox.html`.

- **The one reference case:** the right foot's ball across to the left foot, at a jog.
- **Buttons on the card:**
  - ▶ **B · X-SWEEP V3**;
  - **A · HOP/SWEEP V2**: the committed `croqhs/` build (753d0cc6), run untouched;
  - **C · VIDEO-GUIDED V1**: the committed `croqvg/` build (4a549b8f), run untouched;
  - **A | B | C side by side**, from the identical entry and input, synchronised;
  - **ADV-4**: the committed `feint2ef/` build (f8a0e374), alone;
  - TRY;
  - **1× / 0.5× / 0.25×**.
- **Cameras:**
  - **REFERENCE-LIKE · REAR LOW** (the default);
  - **FRONT HIGH**, **REAR CLOSE**, **OVERHEAD CLOSE**, **SIDE CLOSE**;
  - then GAMEPLAY, FRONT, OVERHEAD · FIXED, ALL THREE · REAR HIGH and ALL THREE · FRONT.
- **⇄ B → A → C at this moment:** the next version at the exact replay moment, in the same camera.
- **BALL: SHOWN → DIM → HIDDEN** and **LANE GUIDE**.
- **Landmarks** (one button each, 11 in all): each pauses the replay on that moment of the lane playing (B's in A | B | C). Step from there with `,` / `.` (1/60 s) or ▸| step. The buttons are NORMAL ENTRY, RIGHT LEG MAX OUT, RIGHT-SIDE BODY BOW, SWEEP BEGINS, MID-SWEEP, TORSO/PELVIS CROSS CENTRE, LEFT LEG OPENS, LEFT-SIDE BODY BOW, LEFT LEG MAX OUT, LEFT INSIDE RECEIVE and EXIT.
- **The info box:** under the timing table, **THE X-SHAPE** gives each lane's leg offsets, bows, pelvis roll and yaw, and the ball's path (the numbers below), then B's landmark times.
- **How to judge:** at 1× with the BALL HIDDEN, in REAR LOW and FRONT HIGH, B against A.
- **Trying it in the sandbox:** the sandbox player is right-footed and carries the ball on the right foot. **Jog at half stick** and request the croqueta with the **stick to the LEFT**: V3 plays. A full stick is a run, which plays V1's run template (not generalized).

## 1. The reference, re-read (`VIDEO_STUDY.md`)

The frames show:

- the right foot well out beyond the ball at the touch;
- the trunk's strongest side lean toward the ball side in the front clip;
- the shorts moving across continuously, with no step and no pause;
- the trunk passing through upright to over the left foot;
- the left leg out, its inside meeting the ball.

They cannot show the hip concavity (the rear crop shows only the legs and shorts), the forward/back offsets (there is no side view) or a number for the ball's backward angle. Those are authored to the owner's description, and the study says which.

## 2. Why V2 still read as a cut (`COMPARISON.md`)

V2's trunk stays stacked over the hips: a 3° bow, then a 10° bow. At the left receive its right hip is still up (+9°). Its right leg is barely abducted (18°), and the right foot is back under the body at the receive (−0.10 m). The ball goes slightly forward (+5°). Only the feet change side, so with the ball hidden it reads as a sideways hop.

## 3. X-SWEEP V3 (`sandbox/visual/croqxs/`; `REF · JOG R → L`; t = 0 at the first touch)

**Two new body channels.** The old `side` channel leaned the whole trunk: pelvis 45 %, spine 30 %, chest 25 %. It could not make one side of the body concave. Two channels now do:

- **`bend`** bends the trunk sideways over the pelvis (spine 55 %, chest 45 %);
- **`proll`** rolls the pelvis itself (+ = the ball-side hip up).

Both are 0 for every template that does not key them, so every other move's pose is unchanged; the regression shows this.

**The sequence:**

| t (s) | What happens |
|---|---|
| −0.28 | Normal upright jog, the ball on the right. |
| −0.28 … −0.12 | **Right-side bow.** The right leg swings OUT and FORWARD beyond the ball, toe out. It is widest at −0.175: out 0.53, forward 0.37, the thigh abducted 26°, the knee out 0.31. The trunk bends toward the right (29° at −0.12), the right hip hikes (+6°) and the left foot trails under the body. |
| −0.12 … 0 | The right leg comes in, and its **inside establishes the ball ahead of the torso** (out 0.40, forward 0.51). The left foot is now 0.60 m behind. |
| 0 … +0.10 | **The sweep.** The right inside sweeps the ball **across and slightly back**, the foot travelling with it. The left foot unweights (+0.02) and opens out and forward, out 0.37 at +0.10. The bend passes through the centre at +0.087 (mid-sweep +0.092), and the pelvis roll passes through 0. |
| +0.10 | The right foot comes down behind its sweep and pushes. |
| +0.10 … +0.18 | The pelvis swings across and yaws toward the exit (41° by the receive). |
| **+0.18** | **Left-side bow.** The left inside receives, the leg out 0.36 and forward 0.12, its thigh abducted 24°. The trunk is bent 26° toward the left, the left hip hiked (pelvis roll −5°), and the right foot trails 0.20 m behind. |
| +0.21 … | The left foot lands where it met the ball; the exit stride; the exit touch on the laces (+0.46); control. |

**Also kept or changed:**

- **Kept:** the low posture (pelvis ≥ 0.70 m), the pitch (21°), the arms swapping with the bow (exit-side hand out 0.48 m), and V2's unweighting.
- **The hop is smaller.** The pelvis's lateral velocity peaks at 2.57 m/s (V2 3.11), so the move reads less as an impulse and more as a sweep.
- **The speed dips to 2.1 m/s** in the sweep (V2 2.8; V1 2.0), back to 3.2 by +0.5 s.
- **Touch 1 is at 0.57 s** after the request (V2 0.53). The touch-to-touch time is the same 0.18 s.

## 4. Landmarks (s from touch 1; `x_geom.js`)

| Landmark | X-SWEEP V3 | HOP/SWEEP V2 | VIDEO-GUIDED V1 |
|---|---|---|---|
| NORMAL ENTRY | −0.400 | −0.400 | −0.400 |
| RIGHT LEG MAX OUT | **−0.175** | −0.004 | −0.025 |
| RIGHT-SIDE BODY BOW | **−0.121** (29°) | −0.058 (3°) | −0.321 (0°) |
| SWEEP BEGINS (touch 1) | 0 | 0 | 0 |
| MID-SWEEP | +0.092 | +0.090 | +0.133 |
| TORSO/PELVIS CROSS CENTRE | **+0.087** | −0.013 | −0.308 |
| LEFT LEG OPENS | +0.046 | +0.104 | +0.204 |
| LEFT LEG MAX OUT | +0.104 | +0.175 | +0.233 |
| LEFT-SIDE BODY BOW | **+0.183** (26°) | +0.142 (10°) | +0.192 (10°) |
| LEFT INSIDE RECEIVE | +0.183 | +0.179 | +0.267 |
| EXIT | +0.303 | +0.299 | +0.387 |

In V3 the bend crosses the centre at mid-sweep, so the reversal happens during the sweep, not before or after it. V2's "bows" are too small for their crossing time to mean anything.

## 5. The diagonals

Measured in the pelvis's own frame, in metres. "out" is from the body's midline on that leg's side.

### At RIGHT LEG MAX OUT, and at touch 1

| | V3 max out (−0.175) | V3 touch 1 | V2 (max = touch 1) | V1 (−0.025) |
|---|---|---|---|---|
| Right foot out / forward | **0.53 / 0.37** | 0.40 / **0.51** | 0.39 / 0.49 | 0.46 / −0.03 |
| Right thigh: from vertical (abduction, flexion) | 42° (**26°**, 36°) | 46° (18°, 45°) | 45° (18°, 43°) | 24° (21°, 13°) |
| Right knee out / forward | **0.31** / 0.24 | 0.25 / 0.30 | 0.25 / 0.29 | 0.30 / 0.09 |
| Left foot forward | −0.10 | **−0.60** | −0.44 | −0.17 |
| Pelvis roll (+ right hip up) / yaw | **+6°** / −4° | +5° / −2° | +2° / +4° | +8° / +7° |
| Torso side bend (+ toward the right) | **+22°** | +15° | −1° | −7° |

### At LEFT LEG MAX OUT, and at the receive

| | V3 max out (+0.104) | V3 receive (+0.183) | V2 receive (+0.179) | V1 receive (+0.267) |
|---|---|---|---|---|
| Left foot out / forward | 0.37 / 0.12 | **0.36 / 0.12** | 0.30 / 0.18 | 0.21 / −0.01 |
| Left thigh: from vertical (abduction, flexion) | 58° (30°, 56°) | 46° (24°, 44°) | 53° (30°, 50°) | 32° (24°, 24°) |
| Left knee out / forward | 0.29 / 0.34 | 0.29 / 0.29 | 0.30 / 0.31 | 0.31 / 0.16 |
| Right foot forward (trailing) | −0.11 | **−0.20** | −0.09 | −0.34 |
| Pelvis roll (+ right hip up) / yaw toward the exit | −1° / 21° | **−5° / 41°** | **+9°** / 18° | +8° / 21° |
| Torso side bend (− toward the left) | −6° | **−26°** | −9° | −8° |

**What this shows:**

- **The right leg is no longer under the body.** At its max it is out 0.53 m and forward 0.37 m, with 26° of thigh abduction (V2 18°), and the knee goes out with it. At the touch the foot is 0.51 m ahead of the pelvis while the left foot is 0.60 m behind.
- **Both sides now bow.** The right side bows by 29°, the left by 26° (V2 3° / 10°). The pelvis roll is the right way round at both ends.
- **The left side is not yet the full mirror of the right.** At the receive the left foot is out 0.36 (V2 0.30) but only 0.12 forward (V2 0.18). Its thigh abduction is 24°, against the right's 26° at its max. The ball arrives from the right and slightly behind, and the body has moved 0.34 m across by then, so the receiving foot cannot be far forward of the pelvis where it meets the ball. The pelvis yaw toward the exit (41°) is what turns "out" into partly "forward". Widening this further would mean a faster ball or a slower body. Both were tried (§6).

## 6. The ball's path (touch 1 → mid-sweep → the left receive)

**World frame**, along the entry; + across = toward the exit, + forward = along the entry:

| | Across: touch → mid → receive = total | Forward/back: touch → mid → receive = total | Angle from straight across |
|---|---|---|---|
| **X-SWEEP V3** | 0.45 + 0.42 = **0.87 m** | −0.08 + −0.07 = **−0.15 m** | **−10°: across and back** |
| HOP/SWEEP V2 | 0.39 + 0.37 = 0.76 m | +0.03 + +0.03 = +0.06 m | +5° (slightly forward) |
| VIDEO-GUIDED V1 | 0.44 + 0.38 = 0.82 m | +0.17 + +0.14 = +0.31 m | +21° (forward) |

**Relative to the pelvis**, from touch 1 to the receive:

| | Across | Forward |
|---|---|---|
| X-SWEEP V3 | +0.53 | −0.44 |
| HOP/SWEEP V2 | +0.42 | −0.27 |
| VIDEO-GUIDED V1 | +0.39 | −0.02 |

The backward component is real in V3 and absent in V2 and V1. The −10° is within what the reference frames allow, but they do not give a number (`VIDEO_STUDY.md`). It is an authored choice, not a measured match.

**What I tried and did not keep:**

- **A faster ball (5.3 – 5.6 m/s)** opened the left leg to 0.42 – 0.47 m. The carry after the move then needed a correction touch at +1.0 s, with ankle snaps of 1100 – 1200°/s.
- **A less lateral body path**, two ways:
  - with the early heading keys changed, it altered the approach's plan, giving a −4.9 cm first contact and a float;
  - with only the later keys changed, it opened the leg to 0.40 – 0.45 m, but the carry again needed a correction touch.

The kept setting (5.15 m/s) leaves the carry exactly as before.

## 7. Integrity and regression (`evidence/`)

### Integrity (`croq_integrity.txt`)

| The reference case (and its mirror) | X-SWEEP V3 | HOP/SWEEP V2 | VIDEO-GUIDED V1 | ADV-4 |
|---|---|---|---|---|
| Slides · jumps · crossings · knee pops · floats · swaps | **0/0 everywhere** | 0/0 | 0/0 | 0/0 |
| Ankle snaps (toe turn > 900°/s) | **none** (fastest 836°/s) | none (888) | 1368 | 865 |
| Pelvis / root discontinuity per tick | 0.42 / 0.00 cm | 0.42 / 0.00 | 0.50 / 0.00 | 0.29 / 0.00 |
| Torso / shoulder spikes | **0** | 0 | 0 | 4 |
| Contact gaps: first · receive · exit | −1.4 · +0.1 · 0.0 cm | −1.3 · 0.0 · 0.0 | −1.2 · +0.2 · −0.1 | −6.0 · +0.2 · +0.3 |
| Least leg clearance | 1.3 cm | 0.0 | 8.7 | 9.4 |
| Missed contacts · possession exits | **0 · 0** | 0 · 0 | 0 · 0 | 0 · 0 |
| Mirror | every number matches | — | — | — |

The walk and run cases are identical to V2's and V1's, because they are not generalized.

### Regression

Every non-croqueta line was compared with HOP/SWEEP V2's evidence, which was produced by the same commands.

| Check | Result |
|---|---|
| **Body Feint**: feint_measure, feint_integrity, rapid input, feint_sync, the exit-angle sweep | **identical** |
| Extreme ball on / off | **identical** |
| Curated cases (122) | **0 non-croqueta lines differ.** The summary is identical: 97 / 107 with every request PLAYED, 0 exits, 0 missed, 10 normal-visible events in 9 cases. The three jog croqueta lines now play V3: touch 1 at 0.57 s instead of 0.53, body 0/0. |
| Battery (72) | **identical**, 67 / 72 PLAYED |
| Body torture, 18 × 60 s | **identical**: 254 / 328 |
| Possession torture, 40 seeds (CONTROLLED) | **identical apart from CPU**: 10 losses, 0 missed |
| 361 random manual requests (intent torture) | **identical outcomes**: 73 played · 218 rejected · 67 cancelled · 0 exits · 0 missed. The contacts are identical to V2's in 12 / 12 seeds (`intent_divergence.txt`): no random request reached the reference state. |
| Determinism | 18 / 18 + 18 / 18 |
| CPU: the same torture input, interleaved, against V2 | 198.0 vs 188.0 ms per simulated s (**+5 %**). The re-plan count (40.8 / s) and the candidates per re-plan (2.8) are identical; the re-plan mean is 4.66 vs 4.39 ms. The machine was loaded during the whole suite (load average ≈ 7.5, from another session), so this run's absolute timings, including the tortures', are not comparable with V2's evidence. A plausible part of the difference: every re-plan now builds two more (constant-zero) channel curves. **Flagged, not proven.** |
| Browser | 0 console errors · 0 HTTP errors · 1 card · 10 cameras · A \| B \| C with both tables · ⇄ B → A → C at the same moment · ball DIM / HIDDEN · the lane guide · the 11 landmarks (each a paused frame; in A \| B \| C, B's) · frame step · 0.25× · ADV-4 alone (`browser.json`) |
| Sandbox | The right-footed player at a **jog (half stick)**, stick **left**: V3 2 / 4. Once V1's walking template won the entry state, and once ADV-4's transfer did (V2 was 3 / 4). Stick **right**: the ball is on the wrong foot, so ADV-4's transfer plays (the fallback). At full stick (a run): V1's run template (`sandbox.txt`). |

**Shared code:** `c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from V2. The `u_tc.js` / `u_body.js` changes are the per-template band (V2's band is the default) and the two channels (0 unless keyed). The identical regression above is the proof.

## 8. Limitations and owner decisions

**Limitations:**

1. **One case.** Walk and run still play V1's templates. Generalizing is the next pass, on your word.
2. **The left side is less extended than the right**, especially forward: 0.12 m against the right's 0.51 m at the touch (§5). The ball arrives from behind the body's line, and the faster-ball fix broke the carry.
3. **The hip concavity, the forward/back offsets and the ball's backward angle are authored.** The reference frames cannot show them (`VIDEO_STUDY.md`).
4. **The legs do not cross.** The rear clip's shins overlap briefly at mid-sweep. V3 keeps the right foot behind its own hip, because integrity forbids crossings.
5. **The speed dips to 2.1 m/s** in the sweep (V2 2.8), and touch 1 comes 0.04 s later than V2's.
6. **The first contact overlaps the ball by 1.4 cm**, as in V2 (1.3): the leg near full reach.
7. **The template is more selective than V2's** (the ball 0.28 – 0.42 m across at the touch, against 0.18 – 0.36). In the sandbox, V1's walking template or ADV-4's transfer won 2 of 4 jog entries (V2: 1 of 4).
8. **CPU +5 %** on an input with no croqueta, measured under load (§7). Not proven either way.

**Owner decisions:**

1. **At 1×, with the ball hidden:** does it read as "the right leg and body open and bow → the whole athlete sweeps through → the left leg and body open and bow", rather than a sharp lateral cut? Compare B with A in REAR LOW and FRONT HIGH.
2. **The left side:** should it open further forward, even at the cost of a faster ball and a correction touch afterwards, or a slower body?
3. **The bows (29° / 26°) and the hip hike:** stronger, weaker, or right?
4. **Then generalize:** walk, run, mirror, other entry states. Not before your verdict.

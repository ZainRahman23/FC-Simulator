# LA CROQUETA — HOP/SWEEP V2 (23 Oct 2026)

**Status: one reference case, stopped for the owner's 1× review. NOT generalized, NOT frozen, NOT integrated.**

- **The instruction:** the owner's, verbatim, in `sources/2026-10-23_user_instruction_croqueta_hop_sweep_v2.md`.
- **The reference:** `~/Desktop/Screen Recording 2026-10-23 at 5.06.46 PM.mov` (Iniesta). It is third-party footage, so it is not committed.
- **How it was studied:** I cannot play video in real time. I read the recording frame by frame at 60 fps (`VIDEO_STUDY.md`) and compared our renders frame by frame from a camera like the reference's.
- **Scope:** La Croqueta only. The Body Feint and every other move are unchanged (§5).

## ▶ PLAYABLE — LA CROQUETA — HOP/SWEEP V2 REVIEW (LOCAL ONLY)

**http://127.0.0.1:8361/sandbox/visual/croqhs_lab.html** (it opens on the review, with the card playing). The sandbox is `croqhs_sandbox.html`.

- **The one reference case:** the right foot's ball across to the left foot, at a jog.
- **Buttons on the card:**
  - ▶ **B · HOP/SWEEP V2**;
  - **C · VIDEO-GUIDED V1**: the committed `croqvg/` build (4a549b8f), run untouched;
  - **A · ADV-4**: the committed `feint2ef/` build (f8a0e374), run untouched;
  - **A | B | C side by side**, from the identical entry and input, synchronised, with a comparison table;
  - TRY;
  - **1× / 0.5× / 0.25×**.
- **Cameras:**
  - **REFERENCE-LIKE · REAR LOW** (the default; the reference's rear clip);
  - **REFERENCE-LIKE · FRONT HIGH** (its front clip);
  - GAMEPLAY, FRONT, REAR CLOSE, SIDE CLOSE, OVERHEAD CLOSE, OVERHEAD · FIXED;
  - ALL THREE · REAR HIGH and ALL THREE · FRONT.
- **⇄ B → C → A at this moment:** the next version at the exact replay moment, in the same camera.
- **BALL: SHOWN → DIM → HIDDEN** and **LANE GUIDE** (the entry line, plus the root's and the ball's trails).
- **Controls:** frame step (▸| step, or `.`) and LOOP, in the top bar.
- The VIDEO-GUIDED V1 review stays further down the page, unchanged.
- **Trying it in the sandbox:** the sandbox player is right-footed and carries the ball on the right foot. **Jog at half stick** and request the croqueta with the **stick to the LEFT**: V2 plays. A full stick is a run, which plays V1's run template (not generalized yet).

## 1. What the new reference changed (`VIDEO_STUDY.md`)

- **Hop / support sequence** (rear-low clip; t = 0 at the first touch):
  - The receiving (left) foot supports under the body at the touch.
  - It **unweights** at ≈ +0.03 – 0.05 s.
  - The ball-side (right) foot comes down under the body (≈ +0.08 – 0.10 s) and **pushes the body across**.
  - The left foot flies across and **lands on the ball** at ≈ +0.15 – 0.20 s.
  - There is one brief flight: a small lateral hop, not a jump.
- **Leg geometry:**
  - Start: the right leg out to the side with the ball, the left supporting (/\|).
  - End: the left leg out in the new lane with the ball, the right long behind as the push-off (\|\\).
  - The legs change sides in one action.
- **Pelvis path:** the lateral travel is **concentrated in the hop**, carried by the right foot's push.
- **Body height:** low, sitting into the transfer: knees well bent, pelvis low.
- **Ball path:** a Z. The ball runs along the right side, is swept sharply across with the body, then carried on along the left side.
- **First contact:** the right inside on the ball's outer side; the foot travels with the ball.
- **Receive:** the left inside, as the left foot lands.
- **Torso:** pitched over the ball, leaning toward the exit through the hop.
- **Arms:** out low on both sides for balance; the exit side opens through the hop.
- **Timing:** a short load, then **touch to touch ≈ 0.15 – 0.20 s**, then go.

## 2. Why VIDEO-GUIDED V1 was still wrong (`COMPARISON.md`)

V1 came from a walking croqueta. At a jog it became three readable steps:

1. **Plant wide:** the receiving foot goes down on the exit side 0.16 s before the touch.
2. **Shift:** the body walks across over it (0.24 m before the touch, 0.71 m in all, peaking late at +0.31 s).
3. **Step out:** the receiving foot lifts again and steps to the ball.

So the lateral motion was spread out with no single impulse. With the ball hidden, the body read as sideways steps. The new reference has one impulse: the ball-side foot's push after its sweep, while the receiving foot is already hopping across.

## 3. HOP/SWEEP V2 (`sandbox/visual/croqhs/`; the reference case `REF · JOG R → L`; t = 0 at the first touch)

| | HOP/SWEEP V2 | VIDEO-GUIDED V1 | ADV-4 |
|---|---|---|---|
| **Set-up (load):** the receiving foot down under the body → the first touch | **0.24 s** | 0.26 s (a planted, wide set-up) | none |
| **Request → first contact** | **0.53 s** | 0.78 s | 0.44 s |
| **First contact** | The right inside, the foot sweeping with the ball, the leg out (the foot 0.36 m from the pelvis) | The right inside from a planted foot | The inside, a running poke |
| **Hop / unweighting** | The left foot lifts **+0.06**, the right foot plants under the body **+0.10** (the push): a 0.04 s flight. The left foot is in the air +0.06 → +0.21. | None: the left foot planted wide −0.16 → +0.16 | None |
| **Maximum lateral pelvis velocity** | **3.11 m/s** at +0.22 s (around the landing) | 2.66 m/s at +0.31 | 2.55 m/s at +0.31 |
| **Lateral displacement** | Pelvis 0.34 m between the touches; 0.38 m from 0.15 s before touch 1 to touch 2; 1.02 m by +0.5 s | 0.43 m between the touches; 0.71 m from 0.15 s before touch 1 | 0.47 m between; 0.49 m |
| **Second contact** | **+0.18 s**: the left inside meets the ball beyond the body's line as it lands (the foot 0.12 m beyond the ball) | +0.27 s | +0.23 s |
| **Landing** | The left foot down at **+0.21** where it met the ball; the right leg long behind (\|\\) | +0.31 | — |
| **Useful exit** | On the exit heading at +0.25. Control returned at +0.46 (the exit touch, the laces, the receiving foot two steps on). The speed holds: 3.2 → 2.8 → 3.2 m/s. | +0.27 / +0.46; 3.2 → 2.0 → 3.2 | 3.2 constant |
| **Body height** | Pelvis down to **0.71 m** | 0.82 m | 0.85 m |
| **Torso** | Pitch 22°, lean toward the exit 24°, the head down over the ball | 27° / 26° | 7° / 17° |
| **Arms** | Out low on both sides; the exit side opens through the hop (0.37 m out, the other 0.35) | 0.32 / 0.34 | 0.24 / 0.12 |
| **Ball path** | Along the right side, swept across with the body (ball 0.63 m vs pelvis 0.41 m across at the receive), then on along the left side | Across, then on | Across ahead of the body |

**The ball-hidden test** (BALL: HIDDEN): the body alone shows the load, one lateral hop with the legs changing sides, and the landing into the new lane. V1 with the ball hidden reads as sideways steps; ADV-4 as running.

**How it is built** (all gated to the new template, `croqHS`):

- **The template `CROQ_HS`** (`v_tech.js`, `croqHopOf`): S-first, starting from the receiving foot's natural landing. It holds the load; F's sweep from outside the ball; S unweighting at +0.06; F planting under the body at +0.10 and pushing; S's receive at +0.18; its landing on the ball; the exit stride; S's exit touch. It also authors the posture (pelvis low, pitch, lean, head, arms per side).
- **Entry where the ball already is** (`u_tc.js`): the ball-side foot meets the ball at its natural point, ±0.10 m ahead and 0.18 – 0.36 m out. Without this, the only entries were a second away; with it, the touch comes 0.53 s after the request.
- **The approach's small steer goes out and back,** and the pelvis is keyed to it. Steered straight, the heading was 8.9° off at the load and snapped back in one tick: a 1000 – 2200°/s pelvis and shoulder spike.
- **CROQUETA → `CROQ_HS`** at a jog. V1's walk and run templates stay outside the jog range, and ADV-4's transfer is the fallback, as before.

## 4. Integrity (`evidence/croq_integrity.txt`)

| The reference case (and its mirror) | HOP/SWEEP V2 | VIDEO-GUIDED V1 | ADV-4 |
|---|---|---|---|
| Plant slides · foot jumps · leg crossings · knee pops · floats · foot swaps | **0/0 everywhere** | 0/0 | 0/0 |
| Ankle snaps (toe turn > 900°/s) | **none** (fastest 888°/s) | 1368°/s (the shared set touch) | 865°/s |
| Pelvis / root discontinuity | 0.42 cm / 0.00 cm per tick | 0.50 / 0.00 | 0.29 / 0.00 |
| Torso / shoulder spikes | **0** | 0 | 4 |
| Contact gaps (first · receive · exit) | −1.3 · 0.0 · 0.0 cm | −1.2 · +0.2 · −0.1 | −6.0 (sole nearest) · +0.2 · +0.3 |
| Least leg clearance | 0.0 cm (touching, no crossing) | 8.7 cm | 9.4 cm |
| Missed contacts · possession exits | **0 · 0** | 0 · 0 | 0 · 0 |
| Mirror | Every number matches | — | — |

## 5. Regression (`evidence/`; every non-croqueta line compared with VIDEO-GUIDED V1's evidence, which was produced by the same commands)

| Check | Result |
|---|---|
| **Body Feint** (feint_measure, feint_integrity, rapid input, feint_sync, exit-angle sweep) | **identical** |
| Extreme ball on / off | **identical** |
| Curated cases (122) | **0 non-croqueta lines differ.** Summary identical: 97 / 107 with every request PLAYED, 0 exits, 0 missed, 10 normal-visible events in 9 cases. The jog croquetas now play V2 (first touch 0.53 s against 0.78), body 0/0 |
| Battery (72) | **identical apart from CROQUETA**, still 67 / 72 PLAYED |
| Body torture 18 × 60 s | **identical**: 254 / 328 |
| Possession torture 40 seeds | **identical apart from CPU**: 10 losses, 0 missed |
| 361 random manual requests (intent torture) | **identical** to V1. 12 / 12 seeds identical throughout (`intent_divergence.txt`) |
| Determinism | 18 / 18 + 18 / 18 |
| CPU (the same torture input, interleaved, against V1; two runs) | 151.5 vs 129.5 and 131.6 vs 120.4 ms per simulated s (+9 – 17 %). The re-plan count is identical (40.8 / s), as are the candidates per re-plan (2.8). The re-plan mean is 3.10 vs 2.97 / 2.80 ms. That input has no croqueta request, and every changed code path is gated to the croqueta template, so the difference is not explained by the change. **Flagged, not resolved.** |
| Browser | 0 console errors · 0 HTTP errors · 1 card · 10 cameras · A \| B \| C with its table · ⇄ B → C → A at the same moment · ball DIM / HIDDEN · the lane guide · frame step · 0.25× (`browser.json`) |
| Sandbox | The right-footed player at a **jog (half stick)**, stick **left**: V2 3 / 4 (once ADV-4's transfer: the ball not yet on the right foot). Stick **right**: the ball is on the wrong foot, so ADV-4's transfer plays (the fallback). At full stick (a run): V1's run template (`sandbox.txt`) |

**Shared code:** `u_body.js`, `c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from V1. The three `u_tc.js` additions act only for `croqHS`. The regression above is the proof.

## 6. Limitations

1. **One case.** At a walk and a run the request plays V1's templates; between 4.2 and 4.4 m/s it plays ADV-4's transfer. In some other jog states (the battery's −30° request) V1's walking template still wins. Generalizing is the next pass, on your word.
2. **The support foot's position comes from the gait.** At this fast entry its landing is already committed, so the base at the touch is ≈ 0.39 m, narrower than the reference's ≈ 0.6 m. The ball-side foot reaches about 0.36 m out.
3. **The first contact overlaps the ball by 1.3 cm**: the leg near full reach for a ball ≈ 0.4 m ahead.
4. The reference's rear clip shows only the legs. The torso and arms come from its front clip, where the croqueta is a hop over a sliding tackle.
5. The ordinary carry's own swings after the move still reach 8 – 9 cm per tick, as in every build.

## 7. Owner decisions

1. **At 1×:** is it one low, explosive lateral hop/sweep, with the ball and the body crossing together and the legs changing sides? Compare B, C and A, and B with the ball HIDDEN.
2. **Height and rhythm:** lower still? A longer or shorter load?
3. **Then generalize:** walk, run, mirror, other entry states. Not before your verdict.

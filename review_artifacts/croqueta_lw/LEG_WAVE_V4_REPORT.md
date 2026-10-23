# LA CROQUETA — LEG-WAVE V4 (23 Oct 2026)

**Status: one reference case, stopped for the owner's review. NOT generalized, NOT frozen, NOT integrated.**

- **The instruction:** the owner's, verbatim, in `sources/2026-10-23_user_instruction_croqueta_leg_wave_v4.md`.
- **The reference:** the owner's screenshot of the X-SWEEP V3 Lab (`sources/2026-10-23_owner_screenshot_L1_right_side_max.png`): the right-side load `\ \`. It matches V3 at the first touch (L1, +0.004 s).
- **Scope:** the one case, at a jog. Everything before L1 is kept from V3: the template's start, its approach, its first-touch swing. No walk or run, no AUTO / input / ratings. Everything else is unchanged (§7).

## ▶ PLAYABLE — LA CROQUETA — LEG-WAVE V4 REVIEW (LOCAL ONLY)

**http://127.0.0.1:8361/sandbox/visual/croqlw_lab.html** (it opens on the review, with the card playing). The sandbox is `croqlw_sandbox.html`.

- **Buttons on the card:**
  - ▶ **B · LEG-WAVE V4**;
  - **A · X-SWEEP V3**: the committed `croqxs/` build (f7645d10), run untouched;
  - **A | B side by side**;
  - TRY;
  - **1× / 0.5× / 0.25×**.
- **Cameras:**
  - **REFERENCE-LIKE · REAR LOW** (the default), **REAR CLOSE**, **OVERHEAD CLOSE**, **GAMEPLAY**;
  - then FRONT HIGH, SIDE CLOSE, FRONT, OVERHEAD · FIXED, BOTH · REAR HIGH and BOTH · FRONT.
- **The leg wave:**
  - **L0 · L1 · L2 · L3 · L4 · L5 · L6**: each pauses on that frame of the lane playing (B's in A | B);
  - **◀ 1 frame / 1 frame ▶** (1/60 s, or `,` / `.`);
  - **◀ landmark / landmark ▶**;
  - **L1 → L5 LOOP 0.25×**: from one frame before L1 to one frame after L5, looped;
  - the current time from touch 1, and the landmark you are on.
- **⇄ A | B at this moment**, **BALL: SHOWN → DIM → HIDDEN**, **LANE GUIDE**.
- **The info box:** under the timing table, **THE LEG WAVE** gives each lane's leg angles at L1 – L5, the feet at L4 and the left foot's continuity. Under it is **the wave plotted live**: right leg red, left leg blue, their mean white, B solid and A faint, with the landmarks and the replay's moment.
- **Trying it in the sandbox:** jog at half stick and request the croqueta with the stick to the LEFT.

## 1. What was wrong in V3 from your screenshot onward (`COMPARISON.md`)

**The left foot jumped forward to find the ball.** It went from 0.65 m behind the pelvis to 0.24 m ahead in 0.1 s, at 12.7 m/s relative to the body, getting 0.11 m ahead of the ball. Then it reached back in for the ball.

**The right foot landed on its own side.** The body moving left swung it back to `\`.

**The legs crossed vertical 46 ms apart**, left first: `\ \ → \ | → | / → \ /`. One leg acted and the other reacted.

The cause, from the swing's targets: a waypoint 0.22 m ahead of the pelvis at +0.11, then the ball at +0.14.

## 2. LEG-WAVE V4 (`sandbox/visual/croqlw/`; `REF · JOG R → L`; t = 0 at the first touch)

| t (s) | | What happens |
|---|---|---|
| … 0 | **L0 → L1** | V3, unchanged: your screenshot at L1 (`\ \`: right leg +24°, left +12°). |
| 0 … +0.10 | **WAVE 1** | **The right inside carries the ball inward, left and back.** The foot stays beside the ball (a waypoint at +0.05) and comes down at +0.10 just behind it, on its own side of the ball's path. **At the same time the left foot, already behind, travels OUT to the left.** Its path is authored all the way: body-relative waypoints at +0.06 / +0.09 / +0.12 / +0.15 open it 0.20 → 0.29 → 0.35 → 0.38 m out while it comes forward steadily (−0.52 → −0.32 → −0.14 → +0.03 m). There is no waypoint on the ball: the ball comes to the foot. |
| +0.087 | **L3** | **Both legs through vertical together**: right 0°, left −2°. The right leg crosses at +0.092 and the left at +0.083, **8 ms apart** (V3: 46 ms). The trunk's bend crosses the centre at +0.087, the same tick as L3; the pelvis roll is keyed to cross with it. The bows stay 29° (right) and 26° (left). |
| +0.10 … +0.17 | **→ `/ /`** | The right leg is `/` from +0.10 to +0.16 (most −9° at +0.104), the left leg increasingly `/`. **L4** (+0.167): left out 0.40 m, forward 0.10, at −21°. The right foot trails (−0.04 m), its leg back to +2° as the body passes over it. |
| +0.183 | **L5 — the cushion** | The ball arrives diagonally at the already-open left inside, out 0.37 m. The inside takes half its pace (4.5 → 2.2 m/s; V3 sent it on at 3.1). The left side is bowed (bend −26°, as in V3). |
| +0.21 … | **WAVE 2 → L6** | The left foot down in the far left; the right foot swinging through; both legs back under the body by +0.325 (**L6**); the right foot down (+0.38); the exit touch on the laces (+0.46), forward toward middle-left; control. |

**The ball's path is kept:** 0.87 m across and 0.15 m back (−10°), V3's.

## 3. The landmarks (s from touch 1; `lw_geom.js`) and the legs at each

Leg angle: each leg seen from behind along the entry; **+ = `\`**, **− = `/`**. Feet: out / forward from the pelvis, in metres.

| | V4: t · right leg · left leg | V4 feet (R · L) | V3: t · right leg · left leg |
|---|---|---|---|
| **L0** \| \| NORMAL | −0.400 · −13° · +3° | −0.10 / −0.47 · 0.10 / 0.06 | identical |
| **L1** \ \ RIGHT-SIDE MAX | +0.004 · **+24° · +12°** | 0.40 / 0.50 · 0.04 / −0.62 | identical (your screenshot) |
| **L2** EARLY SWEEP | +0.046 · +12° · +9° | 0.32 / 0.28 · 0.14 / −0.61 | +0.042 · +13° · +7° |
| **L3** MID-SWEEP | +0.087 · **0° · −2°** | 0.19 / 0.13 · 0.27 / −0.37 | +0.075 · **+10° · −11°** |
| **L4** / / LEFT-SIDE MAX | +0.167 · +2° · **−21°** | 0.15 / −0.04 · **0.40 / 0.10** | +0.113 · +1° · −26° (left 0.37 / 0.20: **ahead of the ball**) |
| **L5** LEFT CUSHION | +0.183 · +6° · −22° | 0.16 / −0.07 · 0.37 / 0.16 | +0.183 · **+15° · −20°** (`\ /`) |
| **L6** \| \| EXIT RESOLUTION (both legs within ±8°) | +0.325 · +7° · +5° | 0.18 / −0.06 · 0.21 / −0.15 | +0.329 · +7° · +5° |

**Each leg's full chain at each landmark** — the hip's flexion and abduction, the thigh's and the shin's angles seen from behind, the knee's offsets, the foot's yaw — is in `evidence/leg_wave.txt`. The Lab shows the same numbers live.

## 4. The left foot's continuity, L1 → L4 (the jolt)

| | LEG-WAVE V4 | X-SWEEP V3 |
|---|---|---|
| Largest forward velocity (relative to the pelvis) | **7.1 m/s** @+0.083 | 12.7 m/s @+0.083 |
| Largest lateral velocity | **3.8 m/s outward** @+0.050 | 5.8 m/s **inward** @+0.129 (reaching back for the ball) |
| Largest speed over the ground | 8.5 m/s | 14.1 m/s |
| Largest displacement in one tick / in one 60 fps frame | 3.5 cm / **13.9 cm** | 5.9 cm / 23.4 cm |
| Largest acceleration | 677 m/s² @+0.013 (the push-off) | 1591 m/s² @+0.142 (the ball waypoint pulling it back) |
| Ahead of the ball before the receive (the body's frame) | **never** (0.00 at the touch itself) | 0.11 m @+0.121 |

**Is any target or blend causing a sudden acceleration?**

- **V3:** yes. The left foot's waypoint 0.22 m ahead of the pelvis at +0.11 causes the forward jolt, and the waypoint beside the ball at +0.14 causes the pull back.
- **V4:** no. Its largest acceleration is the push-off at +0.013, and the forward velocity is a single smooth peak in mid-swing.

**The right foot** stays at V3's level: 8.5 cm per tick at most and 15.0 cm per frame (V3 8.4 / 14.9).

## 5. The right leg's `/`, and why it stops at −9°

The right leg is `/` from +0.10 to +0.16 (most −9° at +0.104). It is back near vertical (+2°) by L4, because its foot is planted and the body moves on over it.

A plant further inward was tried. The foot has 0.10 s from the touch to its landing (a later landing changes the swing before L1, which you asked me not to touch). Its path then crosses the ball's path. The body never lets a boot pass through the ball, so the boot is held off the ball and then catches up at the foot-speed limit: **35 cm in one 60 fps frame**, a visible snap. That version reached −11° at L4. **I kept the smooth one.** The choice is yours (§8).

## 6. The start is kept

From the request to the first touch, V4's body matches V3's. The only difference is at the right toe, up to 1.7 mm in the last 0.04 s before the touch, as the toe begins to turn for the carry (the shin 0.3 mm). Every other joint and the ball are identical (`evidence/start_identity.txt`).

## 7. Integrity and regression (`evidence/`)

### Integrity (`croq_integrity.txt`)

The reference case and its mirror:

| | LEG-WAVE V4 | X-SWEEP V3 |
|---|---|---|
| Slides · jumps · crossings · knee pops · floats · swaps | **0/0 everywhere** | 0/0 |
| Ankle snaps (toe turn > 900°/s) | **none** (fastest 759°/s) | none (836) |
| Pelvis / root discontinuity per tick | 0.54 / 0.00 cm | 0.42 / 0.00 |
| Torso / shoulder spikes | **0** | 0 |
| Contact gaps: first · receive · exit | −1.4 · +0.1 · 0.0 cm | −1.4 · +0.1 · 0.0 |
| Least leg clearance | 5.0 cm | 1.3 |
| Missed contacts · possession exits | **0 · 0** | 0 · 0 |
| Mirror | every number matches | — |

Walk and run are identical to V3's (not generalized).

### Regression

Everything was compared with X-SWEEP V3's evidence, produced by the same commands.

| Check | Result |
|---|---|
| **Body Feint**: feint_measure, feint_integrity, rapid input, feint_sync, the exit-angle sweep | **identical** |
| Extreme ball on / off | **identical** |
| Curated cases (122) | **identical, every line** (the summary 97 / 107, 0 exits, 0 missed, 10 normal-visible in 9). A 2.0 m/s cushion had added one slow-motion float in the "Drag-back → croqueta" chain's carry; 2.2 m/s removes it. |
| Battery (72) | **identical**, 67 / 72 |
| Body torture, 18 × 60 s | **identical**: 254 / 328 |
| Possession torture, 40 seeds | **identical apart from CPU**: 10 losses, 0 missed |
| Intent torture (361 random requests) | **identical outcomes**; the contacts are identical to V3's in 12 / 12 seeds |
| Determinism | 18 / 18 + 18 / 18 |
| CPU: interleaved against V3 | 128.8 vs 131.9 ms per simulated s: the same within noise |
| Browser | 0 console errors · 0 HTTP errors. Checked: the review first; A \| B with the leg-wave table and the plot; ⇄; ball DIM / HIDDEN; the lane guide; L0 – L6 each a paused frame; ◀ / ▶ frame and landmark; the L1 → L5 loop at 0.25×; all 10 cameras; 0.25× (`browser.json`) |
| Sandbox (jog, stick left) | V4 **3 / 4** (once ADV-4's transfer: the ball not yet on the right foot; V3 2 / 4) · stick right: ADV-4's transfer (the ball on the wrong foot) (`sandbox.txt`) |

**Shared code:** `u_tc.js`, `u_body.js`, `c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from V3. The change is the template, the meta entry, the case card, the Lab and the measuring code.

## 8. Limitations and owner decisions

**Limitations:**

1. **One case.** Walk and run play V1's templates. Generalizing comes after your verdict.
2. **The right leg's `/` is brief** (+0.10 – +0.16, at most −9°; back to +2° by L4): see §5.
3. **The left foot's forward progression is still 0.7 m.** It starts 0.62 m behind (your L1) and the ball arrives 0.15 m ahead of the pelvis. It is spread evenly over the sweep, without a jump.
4. **The far left is 0.40 m out** (V3 0.37), because the ball is 0.15 – 0.20 m out from the pelvis at the receive. A faster ball or a body moving across less would open it further, but those change the frames before L1 or the carry afterwards.
5. **Wave 2 is V3's exit**: the right leg swings through past the planted left (to +30° at +0.28) before the legs settle.

**Owner decisions:**

1. **Frame by frame L1 → L5, and at 1× with the ball hidden:** one wave through both legs, the hips and the trunk, with the left leg opening out and never jumping forward?
2. **The right leg at L4:**
   - keep the smooth `/` (−9° briefly);
   - or the more inward plant (−11° at L4, with a 35 cm right-foot snap);
   - or allow a later right-foot landing, which changes the frames before L1.
3. **The cushion's strength** (2.2 m/s out of the left inside).
4. **Then generalize** (walk, run, mirror, other entry states), on your word.

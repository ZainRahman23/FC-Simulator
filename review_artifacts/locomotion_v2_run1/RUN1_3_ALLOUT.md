# RUN-1.3 — ALL-OUT: a top-speed regime above RUN-1.2

> **Status (10 Oct, later):** the user approved the archival captures and froze RUN-1.3 as the **Locomotion V2 straight-line baseline** (`run1_gait_v13.js`, `LOCOMOTION_V2_STRAIGHT_BASELINE.md`; state contract `LOCOMOTION_V2_STATE_CONTRACT.md`).

**The decision (user, 10 Oct evening, after watching RUN-1.2 several times).**
- Keep all three RUN-1.2 regimes exactly. They are good motions, read one category slower than their names:
  - 3.0 m/s: a fast-walk / shuffle-jog transition;
  - 5.5 m/s: a good jog / easy run;
  - 7.8 m/s: a convincing fast football run.
- What is missing is an unmistakable all-out sprint above them: "this player has opened up and is running as fast as he possibly can".
- Do not exaggerate or replace the existing three. Do not get there by playback speed, longer strides, higher knees, bigger arms or more lean.
- Add one fitted top-end regime inside the same continuous system, with no visible mode switch.
- Stop for visual review; do not freeze the baseline.

**State.**
- `run1_gait.js` = **RUN-1.3**: RUN-1.2 plus `RUN1.regimes.ALLOUT`, fitted at **9.5 m/s**.
- RUN-1.2 is frozen as `run1_gait_v12.js` (cddaf890 verbatim, API `RUN1_V12`), beside RUN-1.1 and RUN-1.0.
- **RUN-1.3 is bit-identical to RUN-1.2 at every speed ≤ 8.0 m/s**, constant or ramped (§4).
- The user's names for the ladder are now used in the viewer, the HUD and here:

| ladder name | speed | parameter key | origin |
|---|---|---|---|
| LOW | 3.0 m/s | `JOG` | RUN-1.1's jog, unchanged |
| JOG | 5.5 m/s | `RUN` | RUN-1.2 |
| FAST RUN | 7.8 m/s | `SPRINT` | RUN-1.2 |
| **ALL-OUT** | **9.5 m/s** | `ALLOUT` | **new** |

The keys keep their fitting history; `RUN1.ladder` maps them to the names.

**Labels:**
- **[M]** measured or tabled in the paper; **[F]** read from a figure; **[A]** abstract only; **[S]** secondary source;
- **[D]** arithmetic or interpretation on reported values; **[X]** regression or model value;
- **[R]** RUN-1 measurement (`tools/ref/run1_regime.cjs`, same definitions as before);
- **[design]** a choice with no data behind it.

The evidence hand-off (a literature search for this task) is summarised in §2 and §6. Nothing was copied into the repository.

## 1. What changes when a footballer goes all-out

At top speed the change is a *coordinated* one, and most of it is in timing and in how hard the leg works, not in bigger shapes.

1. **Speed comes from turnover, not stride.**
   - Same subjects, 7.0 → 9.0 m/s: stride frequency +25 %, stride length only +3 %, contact 145 → 118 ms (DSP12 [M]).
   - Swing time drops from ≈0.43 to 0.34 s within a runner [D]. (Weyand 2000's "constant swing time" is *across* runners at their own top speed [A].)
2. **Short, stiff contacts with a fast rearward sweep.**
   - Contact ≈105 ms at 9.5 m/s (Clark 2020 [M]); soccer players at their own maximum 113 ms (Kadlec 2024 [M]).
   - The stance knee still yields ≈14° (13.6 ± 3.6°, Miyashiro 2019 [M]). The *body* stiffens: vertical stiffness 74 → 105 kN/m from 7.7 to 9.4 m/s (Paradisis 2019 [X]). So the COM sinks less and the step is flatter.
   - Peak stance hip-extension velocity ≈850 °/s (Miyashiro 2019 [M]).
3. **A violent swing.**
   - Thigh lift ≈790 °/s, late-swing backswing ≈470 °/s (Miyashiro 2019 [M]).
   - Thigh excursion grows 85 → 94° from 6.9 to 8.2 m/s (Clark 2020 [M]).
   - The heel folds high (sprinters' minimum included knee angle 32°, i.e. 148° flexion [M]).
4. **Arms become a full drive.** Shoulder range 118–135° and elbow range 67–84° in 200 m sprinters (Mann via Macadam 2018 [S]). One international sprinter at top speed: elbow 44° behind to 142° in front (Haralabidis 2021, CC BY [D]).
5. **Posture.**
   - The trunk is *nearly upright* at top speed: 6–9° from vertical at contact (Haugen 2018; Paradisis 2019 [M]). Steep lean belongs to acceleration (36° at step 2).
   - The pelvis turns more: rotation plateaus ≈16° in acceleration (Nagahara 2018 [A]); one sprinter ≈24° [D].
6. **Footballer, not track sprinter.** At a matched ≈9.3 m/s, team-sport athletes vs track athletes (Clark 2025 [M]):
   - they land **flat** (foot 0.2 ± 6.5° vs 8.6° toe-down);
   - they lift the thigh less (65 ± 7° vs 76°) and extend it further back (−34° vs −28°);
   - the swing thigh is further back when the other foot lands (−7° vs +15°), with the knee more open (118° vs 131° flexion);
   - the foot lands a little further ahead (CoM–foot 16° vs 13°);
   - the thigh's angular velocity is *not* different.
7. **No clear front-side "secret".** In sprinters at top speed, no front-side or back-side variable correlated with speed. Contact time, step rate and horizontal ankle speed did (Haugen 2018 [M]).

Read together: an all-out footballer is distinguished from his fast run mainly by **rate and force**:
- shorter, harder contacts;
- faster thigh reversal and sweep;
- a much bigger arm drive;
- a taller, steadier trunk;
- more pelvis turn.

Not by a track sprinter's knee lift.

## 2. The prototype speed: 9.5 m/s (34.2 km/h)

**Match peaks** (LaLiga 2017–18, 475 players, 25 Hz tracking; Del Coso 2020 [M]):
- season-best match peaks are forwards 9.18 ± 0.38, defenders 9.09, midfielders 8.91 m/s;
- 14.9 % of players exceed 9.44 m/s; the fastest reached 9.78 m/s.

**Tests:** professional test sprints give 8.8–9.0 m/s (Haugen 2013 [M]). These are split averages, which understate instantaneous peaks.

**Choice:** a fast professional winger is ≈9.4–9.6 m/s [D], so the prototype anchor is **9.5 m/s**. It is one point on a scale, not the attribute model: §4 says how per-player top speeds fit.

## 3. ALL-OUT as built (A1 → A3)

| | problem | change |
|---|---|---|
| A1 `7a8204cc` | first draft from general sprint knowledge, before the evidence arrived | cadence 4.5, contact 100 ms, force skew 1.8, forefoot strike, swing knee 142°, thigh 69.5°, big arms, lean 11 |
| A1 fix | the −12° forefoot strike bulged the swing foot roll to 25° (ankle inversion box 25°) | strike −10°, heel lowering over 22 % of stance |
| A2 `bdab1f5f` | the evidence showed A1 was a *track* sprinter: footballers land flat, tuck the heel less at the other touchdown (118° vs A1's 138°), extend the thigh further back (−34° vs −25°); force data support less front-loading than RUN-1.2's 1.4 already has | FAST RUN's strike kept, force skew 1.4, contact 105 ms, cadence 4.55, swing knee peak later, thigh 66°, pelvis ±9.5° |
| A3 `bdab1f5f` | stance yield 22.6° (too soft); rear thigh still −27°; the front hand rose to forehead height | knee 27° → 21° at toe-off with no extra loading peak (yield 14°), rear thigh −29°; arm forward 50° with the elbow 90 ± 40° (hand to cheek height) |

### ALL-OUT 9.5 m/s against FAST RUN 7.8 and the evidence (all [R]; `allout/final/regime_metrics_RUN1.3_ladder.txt`)

| | FAST RUN 7.8 | RUN-1.2 stretched to 9.5 | **ALL-OUT 9.5** | evidence |
|---|---|---|---|---|
| cadence / step | 4.03 / 1.93 m | 4.03 / **2.36 m** | **4.53 / 2.10 m** | 4.58 / 2.07 m at 9.50 [M] |
| contact / flight | 121 / 129 ms | 121 / 129 | **104 / 117 ms** | 105 / 114 [M]; soccer at their max 113 [M] |
| flight / contact | 1.07 | 1.07 | 1.12 | 1.09–1.10 [M] |
| swing time | 0.38 s | 0.38 | **0.34 s** | ≈0.34 s at 9 m/s [D] |
| COM range / per step | 6.2 cm / 3.2 % | 6.1 / 2.6 % | **5.4 cm / 2.6 %** | stiffer, flatter [X]; footballers not found |
| COM drop in stance | 2.2 cm | 2.4 | **1.6 cm** | vertical stiffness +42 % [X] |
| leg to vertical at touchdown | 15.1° | 23.0° (over-striding) | **17.1°** | CoM–foot 16.1 ± 1.8° team sport [M] |
| foot behind COM at toe-off | 0.57 m | 0.65 | **0.59 m** | ≈0.59 m [M] |
| stance knee touchdown → peak (yield) | 31 → 44° (13°) | 30 → 56° (26°) | **28 → 42° (14°)** | 27–28° TD, 13.6 ± 3.6° yield [M] |
| stance thigh sweep rate | 680 °/s | 910 | **808 °/s** | peak hip extension 850 ± 73 [M] |
| rear thigh at toe-off / max | −27 / −28° | −32 / −32 | **−28 / −29°** | team sport −34°, track −28° [M] — **between** |
| thigh lift rate | 671 °/s | 686 | **843 °/s** | 792 ± 47 [M] |
| thigh drive (peak) | 63.5° | 63.8 | **66.3°** | team sport 65 ± 7°, sprinters 70° [M] |
| swing knee peak | 135° | 135 | **142°** | sprinters 148° [M] |
| knee when the other foot lands | 123° | 123 | **126°** | team sport 118°, track 131° [M] |
| swing thigh when the other foot lands | +0.7° | −0.3 | **+0.7°** | team sport −7°, sprinters +4° [M] |
| late-swing backswing | 362 °/s | 352 | **414 °/s** | 466 ± 50 [M] |
| foot vs hip 10 ms before touchdown | −6.8 m/s | −6.6 | **−7.8 m/s** | ankle vs CoM at TD −6.5 to −8.2 m/s at 10.2–10.6 [M] |
| upper-arm range | 104° | 105 | **113°** | 118–135° sprinters [S]; limited by V2's shoulder box |
| elbow behind / in front | 65 / 125° | 65 / 125 | **50 / 130°** | 44 / 142° one sprinter [D] |
| hand above hip / behind hip | 50 / 21 cm | 50 / 22 | **55 / 28 cm** | not found [design: cheek height] |
| trunk lean | 11.5° | 11.5 | **10.9°** | 6–9° at contact [M]; never more than FAST RUN |
| pelvis / shoulder yaw range | 12.6 / 27.2° | 12.5 / 27.3 | **17.3 / 33.1°** | pelvis ≈16–24° [A/D] |
| head vertical range / pitch | 5.0 cm / 1.2° | 4.9 / 1.2 | **3.8 cm / 0.8°** | not found [design: steadier] |

**What this says.**
- Most ALL-OUT values sit inside the measured top-speed ranges, and between team-sport and track athletes wherever those two differ.
- The same 9.5 m/s done by stretching RUN-1.2 lands far outside them. It over-strides (2.36 m steps, the leg 23° ahead at touchdown) and sinks 26° into each stance. That is the "longer strides" route the brief ruled out.

**Above 9.5 m/s** the parameters hold, so any extra speed comes from step length alone: at 10.0 m/s, 2.21 m steps and the knee yields 18°. A player whose top speed is higher would carry his own anchor (§4).

## 4. Architecture

**The same construction.** ALL-OUT is one more fitted anchor in the existing piecewise-linear parameter blend:

> JOG 3.0 · JOG 4.0 · RUN 5.5 · SPRINT 7.8 · SPRINT 8.0 · ALL-OUT 9.5

- **One continuous gait.** Every speed is still one solved gait: a stance solve per speed-grid cell, C1 joins, planted plants.
- **The blend runs 8.0 → 9.5 m/s.** On the 6 → 9.5 → 6 m/s ramp, contact, cadence, the swing keys and the arm law change continuously. There is no mode switch and no pose blend (`allout/final/continuity_ramp_6_9.5.txt`).
- **No new motion construct.** No new knots, so the knot counts across the grid are unchanged.
- **The speed grid now reaches 10.0 m/s** (31 cells, previously 27). The new cells are solved lazily at first use, 48 ms each.

**Identity below 8.0 m/s.**
- The grid cell at 8.0 m/s takes part in every speed above 7.75. So the SPRINT parameters are held from 7.8 to 8.0 m/s (RUN-1.2 already held them above 7.8), and the ALL-OUT blend starts at the 8.0 cell.
- Every cell ≤ 8.0 is therefore RUN-1.2's own solve.
- Verified by pose hash (`allout/final/frozen_and_identity.txt`): constant speeds 3.0 / 3.5 / 4.0 / 4.75 / 5.5 / 6.5 / 7.0 / 7.5 / 7.8 / 7.9 / 8.0 and a 3 → 8 m/s ramp are all IDENTICAL.

**Different players, different top speeds (not built).**
- Anchor speeds are absolute today.
- The natural attribute hook is to express the upper anchors as fractions of a player's own maximum: FAST RUN at ≈0.82 · vmax, ALL-OUT at vmax. A faster winger then reaches ALL-OUT later and a slower centre-back earlier, each with the same mechanics.
- Acceleration into the regime is a separate dimension. RUN-1 has only its filtered acceleration lean; no acceleration regime is built.

**Less freedom at the top (not built).** The blend position (HUD: regime name and blend value) is a continuous "how all-out is he" signal. Game rules could later read it to limit turning rate or touch quality. Nothing reads it now.

## 5. How it reads

- **Close side views** (`A3_side_FAST_RUN_7.8_vs_ALL-OUT_9.5.png`): ALL-OUT shows a taller stance with short contacts and a hard sweep. Off the ground the legs split fully, with the rear leg driven back. The heel snaps up under the hip and the knee comes through fast. The arms drive the hand from cheek height to behind the hip.
- **Same speed, 9.5 m/s** (`A3_side_same_9.5_RUN1.2_stretched_vs_ALL-OUT.png`): RUN-1.2 stretched reaches and sinks; ALL-OUT turns over. This is the clearest evidence that the difference is mechanics, not speed.
- **Phases and waveforms** (`A3_phases_…`, `A3_waveforms_…`): the swing thigh and knee curves are faster and earlier, the stance knee hump shrinks, the arm swing opens forward.
- **Chronophotograph** (`A3_chronophotograph_ladder.png`): at 9.5 m/s, ALL-OUT makes 5 contacts in 0.9 s against the stretched gait's 4; the hip path is flatter.
- **Gameplay camera.**
  - At 2.5× (`A3_game_zoom2.5_ladder_sheet_labels_hidden.png`) the ALL-OUT lane is identifiable in stills by its long, flat flight split and high hands.
  - At 1× (`A3_game_zoom1_ladder_sheet_labels_hidden_crop_x3.png`, magnified ×3 for print) the figures are ~40 px tall. In stills the cues are the split and the arm height; in motion they add cadence (+13 %) and travel speed (+22 %).
  - **Whether you can pick out the all-out runner at 1× with labels hidden is the test only your eye in motion can answer.** That is what the blind mode is for (§8).

## 6. Regression (`allout/final/`)

- **Authoritative simulation untouched.** 0 files changed outside the RUN-1 paths vs 9d57d460. V1 gate output is line-for-line identical to the RUN-1.2 session's; its item-3 flag is the pre-existing corner-flag timer.
- **Frozen copies.** RUN-1.0, RUN-1.1 and RUN-1.2 are byte- and pose-identical to their commits.
- **Determinism.** IDENTICAL replays at constant 5.5 and 9.5 m/s and on the 3 → 7.8 → 3 and 6 → 9.5 → 6 m/s ramps. Replay ≡ incremental at constant speed.
- **Foot planting.** Contact slip 0 at constant speed, ≤ 0.01 mm/tick on the ramps. Boot mesh: stance median 0.0 mm at 3.0–10.0 m/s, never below the stud plane; swing minimum ≥ 0.0 mm.
- **Clearance.** Swing foot to stance leg ≥ 21.0 cm at 5.5–10 m/s; knees ≥ 19.0 cm. Hands: no penetration at 7.8 / 8.5 / 9.5 / 10 m/s.
- **Joint limits** (11 speeds, 3.0–10.0 m/s).
  - All inside V2's planning box, except the inherited hip extension −20.1° at 4.0–4.25 m/s (RUN-1.1, disclosed before).
  - ALL-OUT: hip −14 … 81°, knee 142° (box 150), ankle inversion 16.8° (box 25), elbow 50–130° (box 145), shoulder −59.8° (box −60). The shoulder is at the box, which is what caps the arm range below a sprinter's.
- **Smoothness** (p99, cm per tick² at 60 Hz; per-tick max ≈ p99 everywhere, i.e. no pops):

| at 9.5 m/s | RUN-1.3 ALL-OUT | RUN-1.2 stretched | RUN-1.0 | V1.3 |
|---|---|---|---|---|
| pelvis / knees | 0.67 / 4.58 | 0.64 / 6.05 (max 14.2) | 0.35 / 5.99 | 18.9 / 20.1 |
| ankles / toes / hands | 11.1 / 13.3 / 4.55 | 8.7 / 9.5 / 2.86 | 9.3 / 10.6 / 3.38 | 29.5 / 36.9 / 22.8 |
| ramp 6 → 9.5 → 6, ankles / toes / hands | 9.7 / 11.5 / 4.25 | 7.7 / 9.0 / 2.76 | 8.7 / 10.2 / 3.34 | 23.9 / 30.5 / 18.4 |

  - The trunk and knees are as smooth as RUN-1.2.
  - The distal segments are rougher per tick at ALL-OUT, because they move faster: 13 % more cadence (acceleration ∝ amplitude × frequency²) and a bigger arm and heel action. That is 28–59 % above RUN-1.2 stretched and still ⅓–⅕ of V1.
  - At ≤ 8.0 m/s nothing changed (identical poses).
- **CPU** (Node, 22 rigs, mean / p95): ALL-OUT 0.63 / 0.75 ms; RUN-1.2 0.59 / 0.70; V1.3 2.46 / 3.69 at 9.5 m/s. Grid solve 48 ms per cell, lazily at first use.
- **Tool fix.** `run1_limits.cjs` read the elbow through the YXZ decomposition, whose arcsine caps at 90°. RUN-1.2's reported elbow maximum "90°" was really 125°, inside the 145° box. Now read with atan2.

## 7. What is still weak

1. **No replayable reference at top speed.** The one CC BY top-speed dataset (Haralabidis 2021) is a single sprinter, half a gait cycle of joint angles. The targets are literature values, not motion compared frame by frame.
2. **Touchdown is "set down", not struck.**
   - Real feet hit the ground still moving forward at ≈2.4–3.7 m/s and stop within ~25 ms (Haugen 2018; Murphy 2021 [D]; Clark, Ryan & Weyand 2014).
   - RUN-1's fixed plant forces zero ground speed at contact. ALL-OUT's foot is at 1.4 m/s 10 ms before.
   - The *sweep* relative to the body matches (−7.8 m/s); the impact abruptness does not. Changing this means changing the contact model (slip or a short impact phase), which the planted-foot rule forbids. Not attempted.
3. **Rear thigh extension −29°**, between track (−28°) and team-sport (−34°) athletes. More would need a lower or longer stance.
4. **Arm range 113°**, below sprinters' 118–135°: V2's shoulder extension box (−60°) is the limit. The elbow opening behind carries the rest of the visual drive.
5. **Vertical COM data for footballers at top speed were not found.** ALL-OUT's 5.4 cm COM range is consistent with "stiffer and flatter", but it is not measured.
6. **The force skew is not front-loaded further.**
   - Force data say even sprinters' first-half/second-half vertical force ratio is below what RUN-1.2's skew 1.4 implies.
   - The real impact peak at ≈27 % of contact is a two-mass feature that a single smooth stance force cannot show, and it is largely invisible in the COM path.
7. **At 1× the decisive cues are motion cues** (cadence, arm pumping, travel speed); stills undersell them. Needs your eye.
8. **Inherited:** RUN-1.1's hip extension −20.1° at 4.0–4.25 m/s.
   - **Erratum for RUN-1.2 §6:** "identical to RUN-1.1 at every speed ≤ 4.0 m/s" holds bit-for-bit only at 3.0 / 3.5 / 4.0 m/s, with floating-point noise below 1 µm at 3.25 / 3.75. *Between* speed-grid cells, RUN-1.2 differs from RUN-1.1 by up to 0.12 mm.
   - The cause: RUN-1.2's always-present hip knot is lerped between cells, and lerping five knots is not exactly lerping four. Invisible; not fixed, since RUN-1.2 is frozen and RUN-1.3 must equal it.
   - The old check sampled only grid speeds.

## 8. How to review

- **Server:** `cd ~/Downloads/"FC Simulator worktrees"/locomotion-v2-run1 && python3 -m http.server 8317 --bind 127.0.0.1`
- **http://127.0.0.1:8317/sandbox/visual/run1.html** opens the **Ladder** preset: LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5 (nearest the camera first). Close views show ALL-OUT (A) and FAST RUN (B) from the side.
- **The blind test:** `run1.html?blind=1` (to `?blind=4`).
  - The four lanes appear in a fixed shuffled order, with every label, speed and the HUD hidden.
  - Watch at 1×, decide which lane is all-out, then press **L** to reveal.
  - Plain `&labels=0` hides labels without shuffling.
- **Diagnosis:** `?lanes=diag` shows ALL-OUT alone at 2.5× zoom and 0.25× playback, with side and front-¾ close views.
- **Mechanics, not speed:** `?lanes=stretch` shows RUN-1.2's 7.8 m/s gait stretched to 9.5 m/s beside ALL-OUT at 9.5.
- **Top end:** `?lanes=top` shows FAST RUN beside ALL-OUT.
- **Transition:** the speed menu's "ramp 6 → 9.5 → 6" with a same-speed preset (`?lanes=cmp&v=ramp9`).
- **RUN-1.2 as reviewed:** the presets `hier`, `review` and `jogrun` now run the frozen copy, byte for byte.
- **Keys:** Space play/pause, 1–4 playback speed, `.` frame step, S skeleton, C contacts, L labels. URL extras: `&zoom=2.5`, `&rate=0.25`.

**Recommendation.** Do the blind test at 1× first, then check the same-speed comparison at 2.5×.
- If ALL-OUT is unmistakable and FAST RUN still looks right beside it, the ladder is complete for straight running.
- Freezing it as a baseline waits for your word.
- Not started: acceleration, curves, turning, per-player top speeds, match integration.

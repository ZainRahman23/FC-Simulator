# RUN-1.2 — speed regimes: why RUN-1.1 reads as a jog, and what a 5.5 m/s run and a sprint must change

**The decision (user, 10 Oct, after watching RUN-1.1 in motion).**
- The effort pass works. Keep RUN-1.1 exactly: it is frozen as `run1_gait_v11.js` (83a457db, checked by `tools/run1_frozen_check.cjs`).
- But even when commanded at 5–6 m/s, RUN-1.1 reads as a good athletic **jog**, not a football run.
- The question is whether human gait changes structurally with speed, so that one procedural gait stretched across 3–8 m/s cannot be right.
- Then build a 5.5 m/s RUN that clearly reads faster and more aggressive than the jog, and define what changes again for a 7–8 m/s sprint.

**Labels used below:**
- **[M]** measured in the cited paper;
- **[F]** read from a figure;
- **[D]** my computation on open data;
- **[X]** extrapolation, regression evaluated or model-derived;
- **[A]** abstract only;
- **[R]** RUN-1 measurement, the same definition as on the real strides (`tools/ref/run1_regime.cjs`).

## 1. Why RUN-1.1 reads as a jog

**One gait, stretched.** RUN-1.1 changes its *timing* with speed, but its *body mechanics* barely change.

At 5.5 m/s its limb waveforms are practically those of real recreational runners at 3.6–4.1 m/s. Evidence: `regimes/R0_waveforms_real_vs_RUN1.1_3.0_5.5_7.8.png`, `R0_phases_…`, `R0_chronophotograph_…`, `R0_regime_metrics_…`.

| at RUN-1.1 5.5 m/s | RUN-1.1 [R] | real 3.4–4.1 m/s joggers (9 CMU strides) [D] | real ≈ 5 m/s |
|---|---|---|---|
| peak swing knee flexion | 115° | 109° (108–116) | 116° FUK17 4.5 [M]; ~128° HD13 5.0 [F] |
| highest swing-ankle point | 44 cm | 45 cm | — |
| knee drive (peak thigh angle) | 48° | 41° | 46° CL20 [X] |
| stance knee peak | **54°** (jog: 51°) | 47° | 45° FUK17 4.5 / HD13 5.0 [M/F] |
| upper-arm range | 60° | 37° | grows: arm angular momentum doubles 2 → 5 m/s, HD13 [M] |
| hand forward of the hips | 34 cm, to the chest | 18 cm | — |
| pelvis rotation range | **12°** | 15.5° | **21°** VHd 5.0 [D] |
| thorax-on-pelvis twist range | **≈ 9°** | — | **33°** VHd 5.0 [D] |
| foot speed 25 ms before touchdown | **4.1 m/s** | 1.5 m/s | the foot lands at ≈ 0.3 × speed, CL23 [X] |

The 5.5 m/s timing is plausible against the overground data (DSP12 at 5.2 m/s; CL20):

| at 5.5 m/s | RUN-1.1 [R] | DSP12 at 5.2 m/s | CL20 |
|---|---|---|---|
| contact | 175 ms | 188 ms | 180 ms |
| flight | 138 ms | 152 ms | 133 ms |
| cadence | 3.20 steps/s | 2.94 | 3.19 |
| step length | 1.72 m | 1.71 m | 1.62 m |
| duty factor | 0.28 | 0.28 | — |

The thigh drive (48° vs CL20's 46°) and the touchdown foot speed (1.7 m/s 10 ms before touchdown vs ≈ 1.6–1.7 [X]) also match. So the *timing* already says "run" and the *body* says "jog". The mismatch, in order of visibility:

1. **The stance sinks.**
   - The knee loads to 54° at 5.5 m/s, deeper than RUN-1.1's own jog (51°) and about 9° deeper than real runners at 4.5–5 m/s (45°).
   - Real stance-knee depth is roughly constant up to ~5 m/s. Above it the knee *stiffens*: a sprint yields only ~14° (MIY19 [X]).
   - Vertical stiffness rises 24 → 36 → 57 → 87 kN/m from jog to sprint (DSP12 [X]).
   - A deep, soft stance at speed reads as a heavy jog.
2. **Jog arms.** In E2, RUN-1.1's arm carriage was fitted to 3.6 m/s joggers and extended only slightly to 5.5. Real arm action grows steadily with speed (HD13; 200 m sprinters: shoulder range 118–135°, elbow range 67–84°, Mann & Herman via Macadam 2018 [S]). Compact, small arms at 5.5 m/s say "jog".
3. **A quiet pelvis and an un-twisted trunk.**
   - E5 made the pelvis turn *with* the thorax, from the CMU skeleton fits.
   - The marker-based pelvis in the open Fukuchi data contradicts that ([D], `regimes/R0_fukuchi_pelvis_phase.txt`). In 5 runners at 3.5–4.5 m/s, "right hip back" peaks at ~20 % of the stride: mid-stance, individual range 0–42 %, not at touchdown.
   - Pelvis rotation range is 8–22°, and grows with speed: 15° → 21° from 3.3 to 5 m/s, VHd [D]. The thorax-on-pelvis twist reaches 33° at 5 m/s.
   - RUN-1.1 rotates the pelvis ±6° and twists the spine about ±4.5°, so the hips and shoulders move as one block. **E5 was a mistake for running speeds.**
   - RUN-1.1 itself stays frozen, as instructed. The RUN and SPRINT regimes use the measured phase.
4. **A late, abrupt landing instead of an active one.**
   - The swing foot is still travelling forward at 0.75 × running speed 25 ms before contact, then stops; the real 3.6 m/s strides are at 0.4 ×.
   - Late-swing thigh retraction is only 147 °/s (real jog 156 °/s, sprint ≈ 250–300 °/s, CL20 [X]).
   - At speed the leg should be *swept back* into the ground ("pawing"). RUN-1.1's foot is *placed*.
5. **Heel recovery and knee drive** match a real ~4–4.5 m/s runner (knee 115°, thigh 48°), not 5.5.
   - At 5 m/s the knee flexes ~120–128° and the thigh peaks ~48–50° [X].
   - The swing leg's growth with speed is **front-loaded**: thigh flexion 36 → 68° from 3.5 to 9 m/s, against extension 25 → 31° (CL20).

The phase relationships themselves are not jog-specific. Peak knee drive coincides with the opposite foot's toe-off at all speeds (FUKd; OTA24), and RUN-1.1 has that: +8 ms. The jog signature is in what each regime *does* inside those phases: stance compliance, the arms, the pelvis and trunk, and the landing.

## 2. What a 5.5 m/s football RUN needs

These are changes to the RUN regime only. Timing stays as RUN-1.1 (it already matches); the bounce stays physical.

| | RUN-1.1 at 5.5 | RUN target | support |
|---|---|---|---|
| **stance** | knee 28 → 54° | land on a slightly straighter, stiffer leg: touchdown ~24°, peak ~45° | real 45° at 4.5–5 m/s [M]; stiffness rises with speed [X] |
| foot strike | heel 7° up (mid-foot) | a clearer **forefoot** landing, heel ~9° up | forefoot in 7 of 9 runners at 5.2 m/s, DSP12 [M] |
| **landing** | the foot is placed | an **active landing**: thigh sweeping back at ≈ 200–250 °/s, the foot slowing earlier before contact | foot at ≈ 0.3 × speed at touchdown, CL23 [X]; retraction grows with speed, CL20 [X] |
| **heel recovery** | knee peak 115° at 61 % | **~125°**, a little earlier, held folded while the thigh drives | 116° at 4.5 [M], ~128° at 5.0 [F] |
| knee drive | thigh 48° | ~50°, peaking at the opposite toe-off | 46° [X] at 5 m/s (CL20) |
| **arms** | upper-arm range 60°; hand to the chest | **range ~80°**: forward ~20°, back ~58°. The elbow opens behind (~70°) and closes in front (~120°); the hand comes to chest–chin height | arm action grows continuously with speed [M, S] |
| **pelvis** | ±6°, in phase with the thorax | **±9–10° rotation, lagging the thorax by ~75°** (right hip back at ~18 % of the stride). Obliquity ±5°, tilt ±3° | Fukuchi pelvis phase [D]; VHd ranges [D] |
| trunk | lean 12.5° ± 3° | lean ~11° ± 2°, *not* more lean | steady-speed lean does not grow with speed, VHd [D], NAG14 [M]; your instruction |
| vertical | 7.6 cm, true gravity | unchanged in kind; a little stiffer and quicker through stance | runners are "bounciest" at 5–7 m/s, DSP12 [M] |

**Expected read.**
- A runner who hits the ground with a stiffer leg and sweeps it back under the body.
- The heel snaps up behind and the knee drives through in front.
- The pelvis drives the swing leg, while the shoulders and arms counter it with a bigger, harder arm action.
- The same speed and bounce, and the same smoothness.

## 3. What distinguishes a SPRINT (~7–8 m/s), in addition

This is literature for 7–9 m/s and footballers at top speed: DSP12, CL20, CL25 team-sport athletes, MIY19, OTA24, NAG14.

- **Strategy switch, structural.** Above ~7 m/s step length plateaus (~2.0 m) and cadence carries the speed (3.5 → 4.4 steps/s) [M DSP12]. Duty factor stops falling (~0.25); flight and vertical bounce shrink after peaking at ~7 m/s.
  - Sprint target at 7.8 m/s: cadence ~4.0, step ~1.95 m, contact ~0.12 s, flight ~0.13 s. RUN-1.1: 4.14 / 1.89.
- **Stiff stance.** The knee lands *more* flexed (~28–30°) but yields only ~14°. The force is front-loaded into the first half of stance (Clark & Weyand 2014 [A]): a larger force skew.
- **The swing leg leads the cycle.**
  - The heel is already tucked when the opposite foot lands (knee 112–118° for team-sport athletes) [X CL25].
  - Peak swing knee is ~135–140°; elite sprinters reach 148° [X MIY19].
  - The thighs are nearly together at touchdown (25–30° apart) and split ~95–100° at toe-off [X OTA24]. RUN-1.1 at 7.8 m/s: 19° / 86°.
  - Knee drive: thigh ~63–65° for team-sport athletes (76° for track athletes) [M CL25]; RUN-1.1: 58°.
- **Violent recovery and active retraction.** Hip and hamstring swing work rises several-fold; leg backswing ≈ 470 °/s (MIY19); thigh retraction ≈ 250–300 °/s (CL20).
- **Arms become a drive.** Shoulder range is ~100–120° in 200 m sprinters. A footballer is less, but much more than at the run. The elbow opens markedly behind and the hand rises to face height in front.
  - Muybridge's 1887 "Running at full speed" (plate 62, public domain, Wellcome Collection) shows exactly this, with a near-horizontal knee drive and the heel tucked under the buttock.
- **Trunk not more inclined at steady top speed.** About 14° upper / 5° lower trunk (NAG14 [M]). Steep lean belongs to *acceleration*, a separate dimension: RUN-1 already has a filtered acceleration lean.
- **Pelvis.** ~13° rotation between touchdowns; obliquity −3 → +7° from touchdown to toe-off (OTA24 [M]).
- **Footballer, not track sprinter.** CL25 reports more ground-based mechanics than track athletes at the same speed: longer contact, less thigh flexion (65° vs 76°), more extension (−34° vs −29°), and a less tucked heel at the opposite touchdown.

## 4. Can the RUN-1 architecture express it?

**Yes, with one small structural extension and no new motion constructs.** Every quantity in sections 2 and 3 is already a continuous parameter of the RUN-1 construction:
- the stance foot roll and knee curve;
- the swing knot values and timings (knee peak and hold, hip peak, timing relative to the events);
- the vertical force skew;
- the pelvis, thorax and arm amplitudes and phases.

What was wrong is the *data*, not the construction. RUN-1.1's "RUN" anchor was RUN-1.0's design, tuned against jog references in E1–E6, then stretched.

**The extension, already in `run1_gait.js` (commit `f4f54264`).**
- **Speed regimes as independently fitted anchors:**
  - **JOG 3.0** is RUN-1.1's own jog anchor.
  - **JOG 4.0** is RUN-1.1's own parameter blend at 4.0 m/s, so RUN-1.2 is identical to RUN-1.1 up to 4.0 m/s (verified).
  - **RUN 5.5** is fitted to 5–5.5 m/s references.
  - **SPRINT 7.8** is fitted to ≥ 7 m/s references.
- **Still one continuous construction.**
  - Every speed is solved for its own gait: a stance solve per speed-grid cell, C1 joins, planted plants.
  - The regimes blend by parameter, never by pose, so a transition between regimes is as smooth as any speed change.
  - Phase relationships, stance stiffness, recovery shape and arm law all change with speed.
  - This is neither three canned animations nor one gait stretched.

**Not needed now:**
- a second stance model;
- a discrete gait switch: humans have none between jogging and sprinting, only the ~7 m/s strategy shift above, which the anchors express;
- canned clips.

**Possible later:**
- a front-loaded sprint force profile beyond what the force skew covers;
- an *acceleration* regime: inclined trunk, foot landing under or behind the COM, no stance knee yield (NAG14; Kugler & Janshen 2010). It belongs to acceleration, not to speed.

**No decision needs your approval to proceed.**

## 5. Evidence base

**Measured references used** (full table and URLs in this session's research hand-off, summarised in section 1–3 rows):
- DSP12: Dorn, Schache & Pandy 2012, overground, 3.5 / 5.2 / 7.0 / 9.0 m/s, J Exp Biol 215:1944. SCH11: Schache 2011, same lab.
- HD13: Hamner & Delp 2013, treadmill 2–5 m/s.
- FUK17 / FUKd / FUKr: Fukuchi 2017, CC BY 4.0, treadmill 2.5 / 3.5 / 4.5 m/s. My analyses of its processed and raw files, including the pelvis phase.
- CL20 / CL23 / CL25: Clark et al., overground regressions 3–10 m/s, foot speed, and team-sport vs track athletes at top speed.
- MIY19: Miyashiro 2019. OTA24: Ota 2024. NAG14: Nagahara 2014. HAN22: Hanley 2022. KOV25: Kovše 2025.
- VHd: Van Hooren & Meijer 2024, treadmill 3.33 / 5.0 m/s.
  - Its dataset licence is unclear for a game, so only summary numbers are cited and nothing is copied.
- BRU11: Brughelli 2011, footballers, trends only.
- Real strides of my own: CMU mocap, 9 strides, 3.4–4.1 m/s (`R0_*`).
- Muybridge 1887 plates 62 / 65, public domain, Wellcome Collection IIIF. Visual check of full-speed posture only; images not copied into the repository.

**Gaps:**
- **No open, legally reusable full-body dataset of steady overground running at ≥ 5 m/s exists.** Fukuchi stops at 4.5 m/s on a treadmill; Hamner needs a SimTK login; AddBiomechanics is 418 GB.
- So the RUN and SPRINT numbers above are literature values, not motion I can replay.
- Joint angles in the 6.5–7 m/s band, front/back elbow angles and hand heights are thinly reported.
- Where values are [X], they are regressions or model derivations, and are labelled as such.

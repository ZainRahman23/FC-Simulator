# GK-SHOT-MAP-1 — current goalkeeper × 80 Shot Power

Ready for owner visual review. This is an isolated diagnostic harness. No match AI, shot profile, ball law, attribute, collider size or scoring probability was tuned.

**Power meaningfully reduces this keeper's save envelope:** Normal/Laces saves 40.55% and Power 32.47% at the central 19 m origin. Power arrives 85.09 ms earlier and reduces the save fraction by 8.07 percentage points. The equal-family central diagnostic is 51.05%. **These are not match save percentages.**

## Review entry points

Open **review.html** in the exported bundle, or use the local lab at http://127.0.0.1:8769/sandbox/visual/gkshotmap1/. The exported review embeds its modules and measurements; video files and charts remain adjacent. If browser local-file policy prevents modules, start START-REVIEW.command from the bundle and open http://127.0.0.1:8871/review.html. No internet connection or hosted publication is needed.

Select an origin and family; click a cell; play its actual save, goal or parry example where available. Both camera views share one physical clock and run at 1×. The five small maps, speed comparison, area bands and 21 exported 60 fps films are on the same page.

![Five primary maps and the combined diagnostic](sheets/central-six-maps.png)

- [Finesse 30 m/s](sheets/centre-INSIDE.png) · [vector SVG](sheets/centre-INSIDE.svg)
- [Trivela 32 m/s](sheets/centre-OUTSIDE.png) · [vector SVG](sheets/centre-OUTSIDE.svg)
- [Normal / Laces 34 m/s](sheets/centre-LACES.png) · [vector SVG](sheets/centre-LACES.svg)
- [Power 39 m/s](sheets/centre-POWER.png) · [vector SVG](sheets/centre-POWER.svg)
- [Chip 17 m/s](sheets/centre-CHIP.png) · [vector SVG](sheets/centre-CHIP.svg)
- [Combined equal-family diagnostic](sheets/centre-ALL.png)
- [Shot speed / origin comparison](sheets/speed-comparison.png)

## Frozen provenance and reconstructed keeper

Shot baseline: **0b60ba93c2a8ffba0289ae58b03b3a9804e7d17f**. All **657** existing ball, feel, reference and shot files remain byte-identical. The physical ball is the approved BALL-FEEL-1.4 world, launched through the unchanged BALL-SHOT-1.1 resolver: SP80, full charge, fast bracket, preferred right foot. Speeds are exactly 30 / 32 / 34 / 39 / 17 m/s.

Keeper source: **touchline-current @ 5b0d9b070b93402bcf04a7b748a072fe0c3397cd**, sandbox/visual/match.js. The 154,890-byte keeper block hashes to **01e08f84d4195f1fa65edd922f0cb28037ddaaa91b1d9525f9441b93135cd3c6**. It is identical in the approved shot checkout and the other 12 committed worktrees checked. The original development checkout on prototype/3d-animation-pipeline @ f5f607692a06b73cc79b39f3a25fd0516eb693ac has one uncommitted surface-settling predictor hook; that experimental line is recorded in provenance and is not the integrated baseline. Neither checkout was edited.

The complete actual physical keeper is extracted verbatim, including positioning, observations, movement, selection, reach, hand/body/leg TOI, contact quality and response. The separate Python probability keeper is not used. Wrapper code supplies the original state shape and converts coordinate axes; observation instrumentation calls the original contact response unchanged. The instrumentation-vs-original test produces identical keeper and ball states.

| Subsystem | Actual baseline |
| --- | --- |
| Positioning | NEW aperture-bisector model, D2 balanced set depth, canonical positioning 72. Central root is x=102.025 m, lateral=34 m: 2.975 m off the line. Side origins recompute the same geometry. |
| Reaction / anticipation | Authoritative kicked edge starts the current reaction model. Perception is recorded at 0.016667 s, intrinsic latency 0.143128 s, readiness 0.159795 s, first eligible 60 Hz decision 0.166667 s. No pre-kick animation anticipation exists in this keeper. |
| Movement | M6 read → one preparation step → commit. Existing acceleration, sprint cap, coasting and prep limits are retained. |
| Selection / timing | S2 physical interception selection; CAUSAL action times; standing, low, lateral, high and leg actions from the existing envelope. Commit is immutable, so later curve/prediction error can defeat the chosen path. |
| Reach | GOOD max lateral envelope approximately 2.789 m, standing reach 2.47 m and high reach 2.961 m. These are feasibility limits, not a guarantee that hands arrive in time. |
| Collision | H4 active hand sphere radius 0.045 m; torso radius 0.20 m plus the existing lower-body and lead-leg volumes; physical ball radius 0.11 m. Original 12-sample moving-volume TOI at 60 Hz. |
| Resolution | Original causal contact quality, handling, relative velocity, support and timing decide catch, controlled/weak parry, fingertip/body/foot/leg response. No save roll or RNG. |
| Presentation | Contact is independent of sprites. The review draws authoritative root/hand/body/lead-leg geometry. Its pink COM is explicitly a root + 0.62 × height proxy: this keeper does not expose a full dynamic 3D COM. |

| Attribute | Value |
| --- | --- |
| name | GOOD |
| positioning | 72 |
| reflex | 78 |
| diving | 78 |
| handling | 78 |
| jump | 74 |
| height | 190 |
| weight | 85 |
| acceleration | 72 |
| sprint_speed | 64 |
| strength | 74 |
| agility | 73 |

Agility is inherited reference metadata, not consumed by this implementation. Profile objects already pass through keeperFor/runShot so a later authorized quality matrix can use the same harness. This mission runs only GOOD.

## Sampling, legal domain and probability meaning

There is no relevant random execution spread for this controlled shooter. Each map therefore uses **32 × 12 equal-area cells × 20 deterministic stratified initial placements = 7,680 cases**. Twenty keyed points occupy a 4 × 5 subgrid with bounded seeded offsets. The same origin/cell/attempt target is paired across families. Both sides and both half-spaces are simulated independently; no map is mirrored.

The nominal frame has centres at ±3.66 m laterally and 2.44 m high; post/bar radius is 0.06 m, ball radius 0.11 m. Maps cover the physically admissible **ball-centre domain ±3.49 m, height 0.11–2.27 m**, area **15.0768 m²**. The grey rim is clearance, not an unsaveable region. Reported goal-area percentages refer to this domain, not the nominal 7.32 × 2.44 rectangle.

Only initial yaw and elevation are solved before kick. Speed, charge, spin, physical drag, Magnus force, bounce and turf remain unchanged. This is the target-aim exception allowed by the brief, not a shot-profile edit. For 21 difficult bounce/corner placements, a real crossing within the same aim cell and below 2 cm aim residual was retained before the physical frame-control check (maximum 17.88 mm); the actual crossing is never snapped. Most solves meet 0.03 mm. Exact errors and aim values are in raw records. The solver cannot steer after launch.

The displayed save fraction is **spatial occupancy within a cell**, not a probabilistic outcome for repeating the identical shot. Identical state and seed replay identically in the same runtime. Raw cell colours are unsmoothed; 10/40/70/90% contours use visual linear interpolation only. No interpolation alters saves or area-band calculations. At 20 placements a complete raw cell has 5 percentage-point increments; boundary precision remains finite.

Primary bins use the **actual physical no-keeper control crossing**. This is necessary because a caught shot never reaches the goal plane. Actual keeper-on crossings are independently recorded and remain null when absent. No saved ball receives an invented crossing. Each crossing stores time, position, velocity and spin; speed is the norm of the recorded velocity. Whole-ball end-line crossing is tested separately and prior crossing cannot be erased by a later keeper touch.

There are **145,920 case keys**, **145,917 keeper evaluations**, **145,819 eligible map cases**, **98 off-target/frame controls**, and **3 numerical failures**. Every cell has resolved eligible samples. The three failures are existing frame CCD iteration-budget exhaustion in no-keeper controls: central Chip crossbar, left Chip crossbar, left Trivela far post. They are retained as unknown, excluded from save denominators, and replay the same errors. The maximum uncertainty from a single missing sample in its family/origin's equal-area mean is 0.0131 percentage points. This does not justify silently changing collision physics.

## Results: central 19 m

| Family | Launch | Arrival speed mean | Flight mean | Equal-area saved | ≥90% area | 70–<90% | 40–<70% | 10–<40% | <10% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Finesse | 30 m/s | 22.95 m/s | 739.79 ms | 46.41% | 43.75% | 0.78% | 3.13% | 2.86% | 49.48% |
| Trivela | 32 m/s | 24.51 m/s | 692.19 ms | 43.36% | 40.36% | 0.78% | 3.91% | 1.56% | 53.39% |
| Normal / Laces | 34 m/s | 26.09 m/s | 649.14 ms | 40.55% | 38.54% | 1.04% | 1.56% | 2.08% | 56.77% |
| Power | 39 m/s | 30.00 m/s | 564.05 ms | 32.47% | 28.13% | 1.30% | 4.43% | 6.77% | 59.38% |
| Chip | 17 m/s | 12.86 m/s | 1462.89 ms | 92.47% | 89.06% | 2.60% | 1.56% | 2.60% | 4.17% |

The combined map averages each family's cell fraction with **20% weight**, then averages equal-area cells. It has no claimed gameplay-frequency weighting.

| Outcome | Finesse | Trivela | Normal / Laces | Power | Chip |
| --- | --- | --- | --- | --- | --- |
| CLEAN CATCH | 3235 | 693 | 530 | 65 | 3340 |
| CONTROLLED PARRY | 257 | 2564 | 2527 | 1589 | 3729 |
| DANGEROUS PARRY | 30 | 22 | 16 | 588 | 4 |
| DEFLECTION WIDE/OVER | 42 | 51 | 41 | 252 | 32 |
| GOAL | 2622 | 3826 | 3687 | 4248 | 574 |
| GK CONTACT BUT GOAL | 1494 | 524 | 879 | 938 | 0 |
| POST/CROSSBAR WITHOUT GK | 0 | 0 | 0 | 0 | 0 |
| MISS | 0 | 0 | 0 | 0 | 0 |
| NUMERICAL FAILURE | 0 | 0 | 0 | 0 | 1 |

A save requires an on-target no-keeper control, meaningful physical goalkeeper contact and no goal. Contact-but-goal is a goal. Deflections crossing outside the goal are separated from parries that remain in play. Controlled/dangerous parry labels retain the existing contact response classification; there are no other players in this lab, so “dangerous” is not a measured rebound-concession probability.

## Laces 34 versus Power 39

All **7,680** central placements pair directly. Power reduces saves by **8.07 pp**, a 19.91% relative reduction. Mean flight drops from 649.14 to 564.05 ms. Available post-read time drops by the same **85.09 ms** because the keeper's reaction law is held fixed.

Mean root displacement achieved by interception or free-arrival time drops from **0.66 m** to **0.59 m** (−0.07 m). This is displacement, not path length, and catches terminate earlier. **629** placements change from Laces save to Power goal; **9** reverse. **22 cells** move from at least 70% Laces saves to below 40% Power saves, mostly on the boundary about 0.9–1.4 m either side of centre at several heights. Exact indices are in comparisons in summary.json/maps.json.

The ≥90%-saved area contracts from **38.54%** to **28.13%**. Power has 588 dangerous parries versus Laces' 16, and only 65 clean catches versus 530. Speed is meaningful here, but this compares real families: their frozen lift and spin differ too. It is not a speed-only causal intervention.

## Curve, foot and symmetry

Central right-foot Finesse saves **37.55% on the left / 55.26% on the right**; Trivela reverses the bias, **54.82% / 31.90%**. Laces is exactly equal across halves in this sweep. Power's small half difference comes from independently sampled boundary placements, not mirrored data.

A separate 420-run probe covers 35 mirrored target pairs per hard family and repeats the mirrored target with the opposite shooting foot. Finesse changes save/goal on **7/35** same-foot mirrored pairs; Trivela on **10/35**. Mirroring the foot restores all **35/35** paired outcomes for each family. Laces and Power each match all 35 pairs without needing a foot change. This is evidence of the frozen spin/foot interaction, not an invented preferred-hand effect. It does not prove exact symmetry at every possible state; full maps remain independently sampled.

At the keeper's initial depth, mean lateral bow away from the endpoint chord is **−0.187 m Finesse**, **+0.249 m Trivela**, approximately zero for Laces/Power. The keeper's mean absolute goal-plane lateral prediction error at commit is **6.27 cm Finesse** and **11.41 cm Trivela**. The selected intercept path is locked, so late displacement changes overlap and contact quality. Saved and contact-but-goal films expose those differences. Detailed mirrored cases, selected actions, physical intercepts and predictor errors are retained in curve-mirror-probes.json.

## Chip-specific reading

Chip's 17 m/s flight averages **1.46 s**, versus 0.65 s for Laces. It saves **92.47%** centrally, with 3340 catches, 3729 controlled parries and 574 goals. High corners remain the main escape: only **27.07%** saved in the high-corner region (|lateral| ≥2.5 m, height ≥1.8 m).

The mean **unopposed** ball height at the initial keeper plane is **2.37 m**. This is a counterfactual plane measurement, not height above the moving keeper's hands; actual hand/ball contact points are stored separately. Mean maximum forward advance is **0.03 m**, mean maximum retreat is **0.39 m**. Thus the response is predominantly read/recover/intercept, not a new rush behavior. The initial set is already 2.975 m off the line.

Mean unopposed first landing is **20.84 m forward from the shooter**, about 1.84 m beyond the goal plane. Every resolved Chip row includes actual contact, keeper-on landing when reached, counterfactual landing and keeper-plane height. **43** central controls bounce before goal-plane crossing: a low requested region can produce a real turf skip while retaining backspin. It is not silently flattened to a straight ground shot. Yaw/elevation ranges are reported in summary.json; the fixed family loft is the aim solver's branch preference, not a forced 30° shot at every target.

## Secondary origins

| Family | Centre 19 m | Left half-space | Right half-space | Centre 25 m |
| --- | --- | --- | --- | --- |
| Finesse | 46.41% | 52.45% | 50.29% | 82.99% |
| Trivela | 43.36% | 44.67% | 47.03% | 70.66% |
| Normal / Laces | 40.55% | 42.38% | 42.49% | 61.85% |
| Power | 32.47% | 35.12% | 35.13% | 46.65% |
| Chip | 92.47% | 89.75% | 89.71% | not requested |

Central origin [86,0.11,34], left [86,0.11,27], right [86,0.11,41], long [80,0.11,34] in physical [forward,height,lateral] metres. The side origins have 19 m forward separation and approximately 20.25 m distance to goal centre. Each recomputes the current keeper's natural starting set. The 25 m extension covers the four hard families and gives substantially more recovery time; it is not part of the central combined map.

## Boundary diagnosis and animation

| Measured diagnostic category | Finesse | Trivela | Normal / Laces | Power | Chip |
| --- | --- | --- | --- | --- | --- |
| REACTION LIMITED | 0 | 0 | 0 | 0 | 0 |
| MOVEMENT LIMITED | 0 | 0 | 0 | 0 | 0 |
| REACH LIMITED | 809 | 877 | 672 | 636 | 574 |
| WRONG SAVE SELECTION | 0 | 0 | 0 | 0 | 0 |
| CONTACT GEOMETRY LIMITED | 1655 | 1300 | 979 | 950 | 0 |
| BALL TOO FAST FOR CURRENT ENVELOPE | 1652 | 2173 | 2915 | 3600 | 0 |
| OTHER | 0 | 0 | 0 | 0 | 0 |

These categories are **rule-based diagnostic hypotheses**, not proven causal attribution. A committed best-effort failure is reach limited; a ball passing before the selected action completes is marked too fast; contact-but-goal is placed under contact response/geometry. No reaction-limited classification surviving the hand-motion audit does not prove reaction is unimportant: readiness still consumes ~160 ms. Root and first-hand movement clocks are both retained; arm motion cannot be mistaken for no movement merely because the root stays set.

The lab does not infer saves from animation. Missing physical overlap and weak physical contact remain misses/goals even when an illustrative arm looks close. It establishes the current geometry's envelope; it does **not** establish that finished match animation explains it correctly. The diagnostic stick/body view is not a finished keeper animation review.

**Hardest region:** outer corners, especially high corners. All four hard families save 0% in the defined low- and high-corner bands at 19 m; Chip makes high corners the hardest combined area.

**Easiest region:** the central strip |lateral| <0.7 m. Finesse, Trivela and Laces are 100% saved there; Power 99.51%; Chip 99.93%.

**Most surprising weakness:** low corners are as unreachable as high corners for the hard families in this controlled setup, and a touch is often insufficient (Finesse alone has 1,494 contact-but-goals).

**Most surprising strength:** Chip's longer flight lets this keeper cover almost the entire goal despite beginning nearly 3 m advanced; 89.1% of sampled goal area is saved at least 90% of the time.

## Films to watch first

Three saves:

- [Finesse · left curve boundary — CLEAN CATCH](videos/centre-INSIDE-9-6-2.mp4)
- [Power · marginal reach — DEFLECTION WIDE/OVER](videos/centre-POWER-10-2-2.mp4)
- [Chip · central interception — CLEAN CATCH](videos/centre-CHIP-15-6-0.mp4)

Three goals:

- [Normal / Laces · low corner — GOAL](videos/centre-LACES-0-0-0.mp4)
- [Power · high corner — GOAL](videos/centre-POWER-0-11-0.mp4)
- [Finesse · right curve boundary — GK CONTACT BUT GOAL](videos/centre-INSIDE-26-6-0.mp4)

All 21 films use the same camera scale, 60 fps, real 1× time, gameplay projection plus a goal-facing diagnostic, authoritative hands/lead leg, selected action, predicted intercept and actual contact. Short flights hold their final physical state for review; time does not slow down. COM is labelled as a proxy. Twelve films cover all six requested regions for Laces and Power; six show curves and three show Chip. Every film replays its stored case fingerprint, and all MP4s fully decode.

## Three biggest current limitations and next mission

1. **The keeper predicts an older ball model.** Its legacy predictor uses older curve/friction/bounce behavior, while actual flight uses the approved physical world's drag, Magnus and turf. Central hard-family mean absolute height prediction errors at commitment are roughly 17–21 cm. The source's historical “same physics” comment is no longer true for this combination. This is measured unchanged, not compensated with a hidden aim or reach adjustment.
2. **Finite movement plus an immutable chosen reach path restricts the envelope.** One prep step and action timing leave wide low and high regions uncovered. Power's 85 ms reduction is consequential, but the diagnosis does not prove that increasing a particular attribute is the right fix.
3. **Current contacts are an incomplete physical-ball interface.** The legacy moving-collider TOI is a 12-sample linear sweep at 60 Hz; its response supplies linear velocity but no physical angular impulse. The adapter preserves incoming spin and lets the unchanged physical world continue. Weak contact can still concede. Three separate frame-control CCD cases fail numerically. These limitations need explicit validation before balancing.

**Recommended next step: goalkeeper integration/validation first, after owner review; keep shots frozen.** Align the keeper's prediction and contact contract with the authoritative physical ball in a separately approved mission, then repeat these exact case keys. Do not rebalance keeper attributes or shot pace from these uniform-location rates. No such fix was implemented here.

## Verification, performance and reproducibility

The **12 keeper-harness checks**, **20 prior shot checks**, and **53 physical foundation regressions** pass. Raw validation checks every row, actual bin, save eligibility and finite replay state. **135 outcome/aim-edge representatives plus all three numerical failures** reproduce exactly in Node. Browser replay comparisons additionally allow 7-decimal-place numeric fingerprints because Chrome and Node can differ at the last floating-point bit (observed 4.4e−16 in the reach calculation); outcomes and physical geometry must still match. This tolerance is a verification rule only, never a simulation change.

| Measure | Result |
| --- | --- |
| Maps | 19 family/origin maps + 3 equal-family maps |
| Grid | 32 × 12; 20 seeded placements/cell |
| Unique case keys | 145,920 |
| Keeper evaluations | 145,917 |
| Matched physical controls | 145,920 (3 failed before keeper execution) |
| Aim-only physical trial runs | 1,688,919 |
| Additional mirrored probe runs | 420 |
| Main + normalization wall time | 1150.16 s (19.17 min) |
| CPU user + system time | 2830.43 s |
| CPU cost per case, including aim/control work | 19.40 ms |
| Workers | 4 worker threads; no simplified keeper |
| Precision repair | 21 same-cell physical placements; maximum residual 17.88 mm |

Timing excludes plotting, video encoding, tests and mirror probes. Historical performance.json retains the pre-repair batch state; performance-final.json is the completed coverage/time report. Initial development pilot files are excluded.

Source is exported in source/. From that folder run:

```sh
node sandbox/visual/gkshotmap1/tools/test.mjs
node sandbox/visual/gkshotmap1/tools/verify-raw.mjs
node sandbox/visual/gkshotmap1/tools/batch.mjs
node sandbox/visual/gkshotmap1/tools/analyze.mjs
```

A fresh batch uses the final aim solver and clock/Chip observers. Gzip JSONL raw data contains all case keys, target seeds, resolved initial aim, velocity/spin, actual control/keeper crossings, contacts, timing, commit, reach and end state. Fields in keeper.commit retain the original legacy [forward,lateral,height] axis order; displayed/physical positions use [forward,height,lateral]. Null means unobserved/not reached, never zero. Raw and summary artefacts, exact frozen source, provenance, preservation hashes and replay checks accompany the bundle. No match integration or remote push occurred.

## Requested status

CURRENT GOALKEEPER RECONSTRUCTED: YES<br>
GOALKEEPER VERSION/COMMIT: touchline-current / 5b0d9b070b93402bcf04a7b748a072fe0c3397cd<br>
BALL-SHOT-1.1 PRESERVED: YES — 0b60ba93, 657 files byte-identical<br>
80-SP FIVE-FAMILY MATRIX COMPLETE: YES — all attempted, three unknown controls flagged<br>
CENTRAL GOAL HEATMAP COMPLETE: YES<br>
LEFT ORIGIN COMPLETE: YES<br>
RIGHT ORIGIN COMPLETE: YES<br>
FINESSE SAVE MAP: PASS<br>
TRIVELA SAVE MAP: PARTIAL — central/right/25 m complete; one left-origin numerical unknown<br>
LACES SAVE MAP: PASS<br>
POWER SAVE MAP: PASS<br>
CHIP SAVE MAP: PARTIAL — one central and one left-origin numerical unknown; all cells covered<br>
LACES VS POWER DIFFERENCE MEANINGFUL: YES<br>
CURVE AFFECTS SAVE ENVELOPE: YES<br>
CHIP GOALKEEPER RESPONSE CHARACTERIZED: YES<br>
SAVE/PARRY/CATCH CLASSIFICATION: PASS<br>
DETERMINISM: PASS — exact same-runtime replay; documented browser floating-point tolerance<br>
GOALKEEPER UNCHANGED DURING SWEEP: YES<br>
SHOT PHYSICS UNCHANGED DURING SWEEP: YES<br>
READY FOR OWNER VISUAL REVIEW: YES

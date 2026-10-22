# BALL-SHOT-1.2 — final V1 Shot Power calibration

Implemented for owner visual review in the new ballshot12 resolver, on top of approved BALL-SHOT-1.1 and BALL-FEEL-1.4 Candidate A. Previous labs remain historical versions. No goalkeeper integration, balance change or heatmap rerun was performed.

## Calibration

The existing capability function is imported by reference, unchanged: C(s) = 0.65 + 0.65 × (s/99)², on the validated domain 1–99. Hard-shot speed = anchor90 × C(s)/C(90). Chip speed = 17 × sqrt(C(s)/C(90)). The square root is the single new technique-specific compression parameter, not a replacement capability curve.

Laces remains the common 34 m/s reference. Technique conversions are Finesse 30/34, Trivela 31/34, Laces 1, Power 1 with explicit 39/34 commitment, and Chip 17/34. All speeds then multiply the existing bracket, charge and execution/context factors. Default player is controlled-90. All other player attributes remain neutral 50; right preferred/selected foot, pressure 0, stamina/energy/body setup/execution 1; stationary ball at [0,0.11,0].

Full intent here means the approved FAST baseline bracket with charge 1. The historical controlled/very-fast review brackets retain their relative multipliers. They are review candidates, not hidden rating increases; a non-default bracket therefore need not equal the listed anchor.

## Required final status

EXISTING SHOT POWER SCALING ARCHITECTURE PRESERVED: YES

90-SP REANCHOR COMPLETE: YES

90 FINESSE: 30 m/s

90 TRIVELA: 31 m/s

90 LACES: 34 m/s

90 POWER: 39 m/s

90 CHIP: 17 m/s

TRIVELA 32→31 CHANGE: YES

CHIP SCALING MORE COMPRESSED: YES

50–60 SHOT POWER MATERIALLY WEAKER: YES

90→99 HEADROOM BOUNDED: YES

MONOTONICITY: PASS

CURVE LEFT FROZEN: YES

GOALKEEPER LEFT UNCHANGED: YES

BALL-FEEL FOUNDATION PRESERVED: YES

DETERMINISM: PASS

READY FOR OWNER VISUAL REVIEW: YES

## Full-intent launch speed (m/s)

| Shot Power | Finesse | Trivela | Laces | Power | Chip |
|---:|---:|---:|---:|---:|---:|
| 40 | 19.11 | 19.74 | 21.65 | 24.84 | 13.57 |
| 50 | 20.62 | 21.30 | 23.36 | 26.80 | 14.09 |
| 60 | 22.46 | 23.21 | 25.45 | 29.20 | 14.71 |
| 70 | 24.64 | 25.46 | 27.92 | 32.03 | 15.41 |
| 80 | 27.15 | 28.06 | 30.77 | 35.30 | 16.17 |
| 90 | 30.00 | 31.00 | 34.00 | 39.00 | 17.00 |
| 95 | 31.55 | 32.60 | 35.76 | 41.02 | 17.43 |
| 99 | 32.85 | 33.95 | 37.23 | 42.71 | 17.79 |

These values were generated from the implemented resolver, not used as a fitted input table.

## Synchronized videos

- [Laces — 50 / 60 / 70 / 80 / 90 / 99](videos/laces-ratings-1x.mp4)
- [Power — 50 / 60 / 70 / 80 / 90 / 99](videos/power-ratings-1x.mp4)
- [Chip — 50 / 70 / 90 / 99](videos/chip-ratings-1x.mp4)

Every panel begins at authoritative contact t=0, advances at 1 simulated second per video second, and uses the same setup. 1920×1032, 60 fps. Laces and Power use the same fixed gameplay camera; Chip uses the same side camera in every panel. No time normalization, trajectory alteration, keeper, net capture or physical goal-frame collider is used in these comparison videos. The drawn goal is a 19 m reference. Frame interactions are covered separately by the unchanged physics regression battery. Preparation is preserved in the resolver (Power 0.65 s versus Laces 0.28 s); these videos deliberately compare flight from contact.

## Percentage changes

| Family | Velocity increase 50→90 | Velocity increase 90→99 | 50 below 90 |
|---|---:|---:|---:|
| Finesse | 45.52% | 9.50% | 31.28% |
| Trivela | 45.52% | 9.50% | 31.28% |
| Laces | 45.52% | 9.50% | 31.28% |
| Power | 45.52% | 9.50% | 31.28% |
| Chip | 20.63% | 4.64% | 17.10% |

Increase A→B uses (vB/vA − 1) × 100. The last column uses (1 − v50/v90) × 100. At 50 the hard families retain 47.2200% of 90's launch translational kinetic energy; at 60 they retain 56.0428%. Chip retains 68.7168% at 50.

## Physical consequences and limits

LACES: 50-SP arrival 0.964 s; 60-SP 0.874 s; 90-SP 0.642 s; 99-SP 0.587 s. POWER: 50-SP arrival 0.820 s; 60-SP 0.752 s; 90-SP 0.563 s; 99-SP 0.514 s. These are unopposed travel times to the same 19 m plane, not measured keeper reaction windows or save rates.

The 50-SP Chip lands at 16.00 m; 70 at 18.70 m; 90 at 22.10 m; 99 at 23.83 m, all with the same 30° launch and +12 rad/s backspin. This is a usable lower chip envelope without an excessive high-rating launch.

50-SP Power is 26.80 m/s versus 90-SP Laces 34.00 m/s (21.18% slower). Hard-shot 90→99 headroom is 9.50%; Chip headroom is 4.64%.

Expected consequence: lower launch speed changes apex, landing, arrival and speed-dependent Magnus response even though angles, spin and every post-launch curve/physics coefficient are frozen. Aiming at a fixed target may require different weighting; no aim correction was added. In this exact chip setup, 50/70 land before the 19 m goal reference. The original quadratic's nonzero low-rating floor is preserved: this mission did not redesign the low end. At rating 1, Laces still launches at about 18.62 m/s at clean full intent. No unexpected numerical, replay or preservation failures were found.

## Verification and reproducibility

18/18 calibration tests, including 17,640 monotonicity comparisons across ratings 1–99, all brackets, four charges and three foot/context setups. Zero charge is nondecreasing (zero throughout); nonzero charge is strictly increasing. 53/53 frozen foundation assertions pass: bounce/turf, normal/driven passes, post/crossbar and body deflections, tackle loose ball, CCD, contact eligibility and deterministic replay. Candidate A ground replay (normal/through/firm/driven) remains SHA-256 4bd0e797103f4a29c7bb6fd45e1c0b35f6a5cefeb393c8355cb9e1616d3e42bf. New rating replay: 8b088bb4b4e6fbe1a613787e6de6f50af3e3d56200b2d76fcb587a4e63edfe42.

2075 pre-existing source/assets and 963 historical GK-SHOT-MAP-1 output/archive files were verified unchanged by SHA-256. Base commit: dba497653cc78b767c71a55f18ba1f28f6ada6d2. GK-SHOT-MAP-1 was not rerun.

Run node sandbox/visual/ballshot12/tools/test.mjs in the working checkout. The supplied source tree includes the original source/assets so source-preservation checks remain reproducible. When testing the packaged source, set SHOT_WORKSPACE_ROOT to the original workspace containing outputs/GK-SHOT-MAP-1 for the historical-output hash check. The full evidence and all physical replay frames are included. Video generation accepts SHARP_PATH and FFMPEG_PATH environment overrides.

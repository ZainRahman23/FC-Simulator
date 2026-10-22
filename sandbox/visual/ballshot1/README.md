# BALL-SHOT-1 — 80 Shot Power review

The provisional FAST baselines are Inside 30, Outside 32, Laces 34, Power 39 and Chip 16 m/s. All use the same Shot Power 80 player and the exact Candidate A physical environment. These are recommendations for owner selection, not an approved match integration.

- **BALL-FEEL-1.4 CANDIDATE A PRESERVED: YES**

- **80 SHOT POWER BASELINE ESTABLISHED: YES**

- **INSIDE FAMILY: PASS**

- **OUTSIDE/TRIVELA FAMILY: PASS**

- **LACES FAMILY: PASS**

- **POWER SHOT FAMILY: PASS**

- **CHIP FAMILY: PASS**

- **FIVE FAMILIES VISUALLY DISTINCT: PARTIAL**

- **POWER > LACES VELOCITY: YES**

- **80→99 ATTRIBUTE HEADROOM PRESERVED: YES**

- **CURVE LEFT FROZEN: YES**

- **POST-LAUNCH BALL FULLY PHYSICAL: YES**

- **NO SCRIPTED TRAJECTORY: PASS**

- **GROUND-BALL REGRESSION: PASS**

- **DETERMINISM: PASS**

- **READY FOR OWNER VISUAL REVIEW: YES**

Family PASS means a physical, measured set of three usable calibration candidates exists. Five-family visual distinction is PARTIAL: Chip is clearly lofted, Inside/Outside bend in opposite directions, but Laces and Power retain similar low direct shapes. Their distinction currently relies mainly on pace and disclosed preparation. Final kick animation and owner feel approval are pending.

## Five videos to watch first

- [INSIDE — three brackets, 1×](videos/inside-80-brackets-1x.mp4)

- [OUTSIDE — three brackets, 1×](videos/outside-80-brackets-1x.mp4)

- [LACES — three brackets, 1×](videos/laces-80-brackets-1x.mp4)

- [POWER — three brackets, 1×](videos/power-80-brackets-1x.mp4)

- [CHIP — three brackets, 1×](videos/chip-80-brackets-1x.mp4)

Each 9-second clip shows CONTROLLED → FAST → VERY FAST, three seconds per candidate, at 60 fps and 1× simulation time. All use the same frozen Touchline camera. They start at contact; preparation is available separately. No audio.

Also included: [synchronized five-family matrix](videos/five-families-80-1x.mp4), [Chip side view](videos/chip-fast-side-1x.mp4), [0.25× contact timing](videos/contact-timing-quarter-speed.mp4).

Open review.html in the delivered folder for the packaged review, or use the live HTTP review. The page defaults to the synchronized 1× Touchline view and provides each family’s brackets, side/behind/goal/contact cameras, preparation, 25/30 m and charge/attribute comparisons. The packaged HTML embeds the replay data and module graph. Its syntax, links and source were checked; opening a local file in the automated browser was not tested. The live HTTP page was visually checked.

## Recommended 80 baseline and 19 m arrival

| Family | Launch m/s | Horizontal / vertical m/s | Elevation / yaw ° | Arrival s | Arrival m/s | Centre height m | First-flight apex clearance m / time s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INSIDE | 30.0 | 29.54 / 5.21 | 10.0 / -4.0 | 0.733 | 23.05 | 1.02 | 1.21 / 0.483 |
| OUTSIDE | 32.0 | 31.41 / 6.11 | 11.0 / 7.0 | 0.691 | 24.42 | 1.59 | 1.59 / 0.542 |
| LACES | 34.0 | 33.67 / 4.73 | 8.0 / 0.0 | 0.642 | 26.26 | 0.77 | 0.93 / 0.408 |
| POWER | 39.0 | 38.71 / 4.75 | 7.0 / 0.0 | 0.559 | 30.15 | 0.79 | 0.86 / 0.379 |
| CHIP | 16.0 | 12.94 / 9.40 | 36.0 / 0.0 | 1.721 | 11.82 | 1.83 | 4.34 / 0.950 |

The ball starts at [0, 0.11, 0] m, stationary. X is forward, Y is up, Z is lateral. The target plane is X=19 m, with a 7.32 × 2.44 m reference goal. All five selected candidates cross within its mouth. Goal-plane times start at authoritative contact, excluding preparation. Heights are ball-centre height; apex is ball-bottom clearance above turf (add 0.11 m for centre height).

The calibration flights have no goal or character colliders, so the goal is diagnostic geometry and the trajectories continue through its plane. Post/crossbar and incidental-contact behavior is exercised by the frozen foundation suite, not inferred from these free-flight goal results.

## All fifteen 80-power launch candidates

| Family / bracket | Shot Power | Speed m/s | Horizontal / vertical m/s | Velocity [X,Y,Z] m/s | Elevation / yaw ° | 19 m time / speed | Apex clearance / time | First landing distance / time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INSIDE / controlled | 80 | 26.0 | 25.61 / 4.51 | [25.543, 4.515, -1.786] | 10.0 / -4.0 | 0.846 s / 20.24 m/s | 0.94 m / 0.425 s | 19.52 m / 0.873 s |
| INSIDE / fast | 80 | 30.0 | 29.54 / 5.21 | [29.472, 5.209, -2.061] | 10.0 / -4.0 | 0.733 s / 23.05 m/s | 1.21 m / 0.483 s | 24.70 m / 0.993 s |
| INSIDE / very-fast | 80 | 34.0 | 33.48 / 5.90 | [33.402, 5.904, -2.336] | 10.0 / -4.0 | 0.647 s / 26.01 m/s | 1.51 m / 0.537 s | 30.05 m / 1.108 s |
| OUTSIDE / controlled | 80 | 28.0 | 27.49 / 5.34 | [27.281, 5.343, 3.350] | 11.0 / 7.0 | 0.789 s / 21.52 m/s | 1.25 m / 0.487 s | 23.32 m / 1.000 s |
| OUTSIDE / fast | 80 | 32.0 | 31.41 / 6.11 | [31.178, 6.106, 3.828] | 11.0 / 7.0 | 0.691 s / 24.42 m/s | 1.59 m / 0.542 s | 28.75 m / 1.122 s |
| OUTSIDE / very-fast | 80 | 36.0 | 35.34 / 6.87 | [35.075, 6.869, 4.307] | 11.0 / 7.0 | 0.614 s / 27.42 m/s | 1.94 m / 0.596 s | 34.26 m / 1.239 s |
| LACES / controlled | 80 | 30.0 | 29.71 / 4.18 | [29.708, 4.175, 0.000] | 8.0 / 0.0 | 0.728 s / 23.33 m/s | 0.75 m / 0.371 s | 19.71 m / 0.759 s |
| LACES / fast | 80 | 34.0 | 33.67 / 4.73 | [33.669, 4.732, 0.000] | 8.0 / 0.0 | 0.642 s / 26.26 m/s | 0.93 m / 0.408 s | 24.11 m / 0.845 s |
| LACES / very-fast | 80 | 38.0 | 37.63 / 5.29 | [37.630, 5.289, 0.000] | 8.0 / 0.0 | 0.575 s / 29.27 m/s | 1.13 m / 0.446 s | 28.64 m / 0.927 s |
| POWER / controlled | 80 | 34.0 | 33.75 / 4.14 | [33.747, 4.144, 0.000] | 7.0 / 0.0 | 0.641 s / 26.40 m/s | 0.68 m / 0.342 s | 20.51 m / 0.699 s |
| POWER / fast | 80 | 39.0 | 38.71 / 4.75 | [38.709, 4.753, 0.000] | 7.0 / 0.0 | 0.559 s / 30.15 m/s | 0.86 m / 0.379 s | 25.38 m / 0.780 s |
| POWER / very-fast | 80 | 44.0 | 43.67 / 5.36 | [43.672, 5.362, 0.000] | 7.0 / 0.0 | 0.495 s / 33.97 m/s | 1.05 m / 0.412 s | 30.35 m / 0.857 s |
| CHIP / controlled | 80 | 15.0 | 12.14 / 8.82 | [12.135, 8.817, 0.000] | 36.0 / 0.0 | 1.830 s / 12.22 m/s | 3.84 m / 0.896 s | 19.01 m / 1.831 s |
| CHIP / fast | 80 | 16.0 | 12.94 / 9.40 | [12.944, 9.405, 0.000] | 36.0 / 0.0 | 1.721 s / 11.82 m/s | 4.34 m / 0.950 s | 21.18 m / 1.947 s |
| CHIP / very-fast | 80 | 18.0 | 14.56 / 10.58 | [14.562, 10.580, 0.000] | 36.0 / 0.0 | 1.536 s / 11.65 m/s | 5.38 m / 1.058 s | 25.66 m / 2.174 s |

## Spin, preparation and technique conversion

| Family (all three brackets) | Angular velocity [X,Y,Z] rad/s | Magnitude rad/s | Unit spin axis | Prep s | Conversion × commitment |
| --- | --- | --- | --- | --- | --- |
| INSIDE | [0.000, -35.000, 0.000] | 35.00 | [0.000, -1.000, 0.000] | 0.24 | 0.8824 × 1.0000 |
| OUTSIDE | [0.244, 60.000, -1.985] | 60.03 | [0.004, 0.999, -0.033] | 0.30 | 0.9412 × 1.0000 |
| LACES | [0.000, 0.000, -4.000] | 4.00 | [0.000, 0.000, -1.000] | 0.28 | 1.0000 × 1.0000 |
| POWER | [0.000, 0.000, -8.000] | 8.00 | [0.000, 0.000, -1.000] | 0.65 | 1.0000 × 1.1471 |
| CHIP | [0.000, 0.000, 12.000] | 12.00 | [0.000, 0.000, 1.000] | 0.32 | 0.4706 × 1.0000 |

Spin and aim are fixed within each family’s three speed brackets. Positive local backspin is +Z for a straight +X launch; negative Z is topspin. Outside’s small X component comes from rotating its local topspin axis by its +7° launch yaw. Inside/Outside use opposite Y sidespin. The existing fc-b Magnus law is imported unchanged; selecting launch spin does not retune that law.

The boot in contact diagnostics is a timing illustration with its toe at the ball at t=0. The resolver determines launch; boot motion neither generates nor corrects ball velocity. Preparation is a disclosed timing cost (.65 s for Power versus .28 s for Laces), not a completed match action or final family-specific skeletal animation. The physical scheduled action is at tick 0; negative replay time illustrates preparation outside the physics run.

## Trajectory heights at useful distances

Centre heights in metres. These observer samples can be after a real turf bounce; they are not prescribed control points. A dash means that flight did not reach the plane within its recorded duration.

| Candidate | 5 m | 10 m | 15 m | 19 m | 20 m | 25 m | 30 m |
| --- | --- | --- | --- | --- | --- | --- | --- |
| inside-controlled | 0.792 | 1.045 | 0.808 | 0.216 | 0.172 | 0.243 | 0.138 |
| inside-fast | 0.842 | 1.250 | 1.291 | 1.023 | 0.910 | 0.153 | 0.354 |
| inside-very-fast | 0.875 | 1.388 | 1.614 | 1.561 | 1.513 | 1.035 | 0.122 |
| outside-controlled | 0.907 | 1.318 | 1.294 | 0.920 | 0.772 | 0.313 | 0.116 |
| outside-fast | 0.948 | 1.489 | 1.695 | 1.588 | 1.520 | 0.905 | 0.294 |
| outside-very-fast | 0.977 | 1.607 | 1.971 | 2.047 | 2.033 | 1.749 | 1.063 |
| laces-controlled | 0.653 | 0.858 | 0.678 | 0.222 | 0.140 | 0.250 | 0.115 |
| laces-fast | 0.687 | 0.998 | 1.008 | 0.771 | 0.674 | 0.198 | 0.266 |
| laces-very-fast | 0.711 | 1.097 | 1.240 | 1.157 | 1.106 | 0.658 | 0.245 |
| power-controlled | 0.590 | 0.787 | 0.665 | 0.310 | 0.182 | 0.265 | 0.148 |
| power-fast | 0.620 | 0.910 | 0.953 | 0.789 | 0.718 | 0.166 | 0.311 |
| power-very-fast | 0.640 | 0.994 | 1.151 | 1.117 | 1.085 | 0.767 | 0.164 |
| chip-controlled | 2.947 | 3.954 | 2.793 | 0.117 | 0.805 | 0.451 | 0.110 |
| chip-fast | 3.050 | 4.396 | 3.835 | 1.833 | 1.101 | 0.891 | 0.123 |
| chip-very-fast | 3.207 | 5.067 | 5.429 | 4.474 | 4.048 | 0.705 | 0.978 |

## 25–30 m results

| Family | Plane m | Arrival s | Speed m/s | Centre height m | Before first turf contact |
| --- | --- | --- | --- | --- | --- |
| INSIDE | 25 | 1.009 | 19.11 | 0.15 | NO — physical bounce/skim |
| INSIDE | 30 | 1.285 | 17.76 | 0.35 | NO — physical bounce/skim |
| OUTSIDE | 25 | 0.949 | 22.80 | 0.90 | YES |
| OUTSIDE | 30 | 1.191 | 18.64 | 0.29 | NO — physical bounce/skim |
| LACES | 25 | 0.885 | 22.24 | 0.20 | NO — physical bounce/skim |
| LACES | 30 | 1.118 | 20.79 | 0.27 | NO — physical bounce/skim |
| POWER | 25 | 0.766 | 28.03 | 0.17 | YES |
| POWER | 30 | 0.966 | 24.12 | 0.31 | NO — physical bounce/skim |

These use exactly the selected 19 m launch, spin and aim. Only the observation plane moves. At 25 m, Outside and Power remain in first flight; Inside and Laces have already landed. At 30 m all four have landed, retaining 17.76–24.12 m/s. This supports pace retention, not a claim that the low 19 m aim is the final long-shot aim.

## Chip distance and charge

| Landing target m | Charge % | Launch m/s | Horizontal / vertical m/s | Apex clearance m | First landing m | Landing time s |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 58.10 | 10.46 | 8.46 / 6.15 | 1.92 | 10.000 | 1.285 |
| 15 | 72.68 | 13.08 | 10.58 / 7.69 | 2.97 | 15.000 | 1.604 |
| 20 | 85.88 | 15.46 | 12.51 / 9.09 | 4.07 | 20.000 | 1.885 |
| 25 | 98.39 | 17.71 | 14.33 / 10.41 | 5.23 | 25.000 | 2.142 |

All four chips keep Shot Power 80, elevation 36°, yaw 0° and backspin +12 rad/s. They use the 18 m/s upper candidate as the full-charge ceiling; the common 19 m FAST candidate uses 16 m/s at full charge. A deterministic offline bisection selects charge before launch by measuring first physical landing. There is no in-flight distance controller. Near-exact landing distances are numerical calibration results, not a promise of live execution accuracy. The 240/480 Hz check gives the practical integration tolerance.

The selected 16 m/s Chip first lands at 21.18 m after 1.947 s. The 18 m/s candidate reaches the 19 m plane at 4.47 m centre height, clearly over the bar at this fixed aim.

## Controlled player and context

| Player attribute | Value |
| --- | --- |
| id | controlled-80 |
| shotPower | 80 |
| finishing | 50 |
| longShots | 50 |
| curve | 50 |
| technique | 50 |
| weakFoot | 50 |
| preferredFoot | R |

| Context | Value |
| --- | --- |
| selectedFoot | R |
| pressure | 0 |
| stamina | 1 |
| energy | 1 |
| bodySetup | 1 |
| executionQuality | 1 |
| charge | 1 |
| startingVelocity | [0,0,0] |
| contactPosition | [0,0.11,0] |
| description | Preferred foot; neutral 50 technique attributes; full intent; clean stationary ball and body setup; no pressure; full stamina/energy. |

Finishing, Long Shots, Curve and Technique remain separate reserved inputs at 50. They have no uncalibrated hidden bonus in this experiment. Weak Foot is 50 but does not penalize the selected preferred right foot. No attribute is silently set to 99. Pressure, fatigue, body setup and execution are separate resolver factors; their broader curves are not calibrated here.

## Capability, charge and headroom

`capability(SP) = 0.65 + 0.65 × (SP / 99)²`, valid for ratings 1–99. The map is nonlinear, strictly increasing, and bounded on that declared domain; it is not an asymptotically saturating curve. Invalid ratings fail explicitly.

`speed = 34 × capability(SP)/capability(80) × techniqueConversion × commitment × bracketScale × charge × contextFactor`.

FAST bracketScale is 1. Power uses the same capability(80) and Laces conversion 1, with explicit commitment 39/34. Inside converts at 30/34, Outside 32/34 and Chip 16/34. Aim decomposes the scalar launch once. Spin is resolved once. The selected 80→99 gain is 20.99%; it is not 99/80 scaling.

| Shot Power | Inside | Outside | Laces | Power | Chip |
| --- | --- | --- | --- | --- | --- |
| 50 | 22.78 | 24.30 | 25.82 | 29.61 | 12.15 |
| 65 | 25.97 | 27.70 | 29.44 | 33.76 | 13.85 |
| 80 | 30.00 | 32.00 | 34.00 | 39.00 | 16.00 |
| 90 | 33.15 | 35.36 | 37.57 | 43.09 | 17.68 |
| 99 | 36.30 | 38.72 | 41.14 | 47.19 | 19.36 |

Speeds above are m/s, projected clean FAST strikes. The four hard families remain within the 19 m reference mouth at these sampled ratings. Full-charge Chip at 90/99 clears the bar at fixed 36° (about 4.11/5.83 m centre height); use lower charge for the same target. This is an envelope check, not finished attribute calibration or goalkeeper-readability validation.

| Shot Power 80 family | Soft charge 35% m/s | Normal charge 65% m/s | Hard charge 100% m/s |
| --- | --- | --- | --- |
| INSIDE | 10.50 | 19.50 | 30.00 |
| OUTSIDE | 11.20 | 20.80 | 32.00 |
| LACES | 11.90 | 22.10 | 34.00 |
| POWER | 13.65 | 25.35 | 39.00 |
| CHIP | 5.60 | 10.40 | 16.00 |

Charge weights linear launch speed in this provisional interface, independent of the nonlinear player capability. Context factor is (0.75+0.25×executionQuality) × (0.85+0.15×bodySetup) × (1−0.10×pressure) × (0.85+0.15×min(energy,stamina)) × footFactor. Preferred-foot factor is 1; the uncalibrated weak-foot branch is 0.72+0.28×weakFoot/99. Those context transforms are exposed for audit, not claimed to be final gameplay balance.

## Which upper candidate feels too fast

**Power 44 m/s** is my provisional excessive-at-80 candidate: it crosses 19 m in 0.495 s. I recommend 39 m/s for owner review, preserving a 47.19 m/s projected FAST ceiling at 99. This is a visual/readability judgment, not a conservative real-world speed limit. **Chip 18 m/s** is too much for the fixed 19 m aim, though useful for a longer chip. The owner can still choose either upper bracket.

## Three remaining shot-feel questions

1. Does Power at 39 m/s with 0.65 s preparation feel sufficiently distinct from Laces at 34 m/s and 0.28 s, given their similar low flight shapes?

2. Are the frozen opposite bends and launch geometry enough to read Inside versus Outside at 1×, before the separate curve-calibration mission?

3. Is Chip at 16 m/s and 36° the right 19 m loft, with charge providing distance control, or should the later aim design include a lower, quicker chip?

## Verification and boundaries

- 24/24 shot/audit tests; 53/53 foundation regressions pass.

- All 586 prior BALL-PHYS/BALL-FEEL files remain byte-identical to c9479985fd0cfb810d9de7674b36f50f4ec555fc. No prior evidence was overwritten.

- Old ground streams: 18 ground candidates plus 20 foundation scenarios, 19372439 bytes; SHA-256 `4bd0e797103f4a29c7bb6fd45e1c0b35f6a5cefeb393c8355cb9e1616d3e42bf`. Exact saved Candidate A parity.

- New 15 shot streams: 5708084 bytes; SHA-256 `ce51c9d2a9d4be2d699b8b31b27588a5ad1358a89f47b23fdb1b4b2a63dabe3a`. Exact Node rerun and actual Chrome browser replay.

- Normal/through/firm/driven/old low-shot skims, bounce, incidental body contacts, tackle-loose, posts/crossbar and CCD remain covered. Body interaction remains in the imported physical world.

- Maximum selected-candidate 240→480 Hz differences: arrival 0.299 ms, centre height 1.536 cm, apex 0.879 cm, first landing 6.503 cm.

- One authoritative launch per shot; changing metadata cannot steer it; moved-ball contact cancels; duplicate actions reject; all selected flights eventually settle under unchanged turf.

- Eight MP4s fully decoded successfully; representative frames were visually inspected. Browser controls, cameras, synchronized replays and full view were checked. No keeper, match action selection, receiving or dribbling integration.

## Source and reproducibility

The delivered source folder preserves the repository layout under source/sandbox/visual. With Node 22, run `node source/sandbox/visual/ballshot1/tools/test.mjs` from the package to reproduce the tests, including byte checks of all bundled frozen files. Serve the source folder with a local HTTP server to open sandbox/visual/ballshot1/index.html. No npm install is required for tests or the page.

The evidence builder additionally needs the original Git history at c9479985. Video regeneration uses Sharp and FFmpeg at the local paths documented in tools/videos.mjs; exported MP4s need neither. The package contains replay evidence, measurements, source hashes, tests, validation, and the implementation patch/commit metadata. review.html contains the runtime and data; adjacent videos/evidence/report links need the rest of the folder.

Resolver entry points are resolveShot and scheduledLaunch, with their auditable interface in contract.d.ts. This stationary-ball lab rejects nonzero starting velocity rather than silently misreporting it. Full-precision vectors, contact facts, observer planes, event lists and per-substep states are retained in evidence/measurements.json and evidence/review.json.

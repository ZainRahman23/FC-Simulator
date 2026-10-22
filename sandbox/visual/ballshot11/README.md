# BALL-SHOT-1.1 — reference-guided candidates

**Power and Normal/Laces remain the two strongest shots.** At equal Shot Power 80, bracket, full charge and clean execution, the selected launch order is Power 39 > Normal/Laces 34 > Trivela 32 > Finesse 30 > Chip 17 m/s. No family silently substitutes a higher player rating.

This is a separate candidate lab above d5790bf4. All 622 previous physics, feel and shot files are preserved. Candidate A remains the exact imported physical world. Ground response, drag, Magnus, collision materials, mass, radius and inertia are untouched. The supplied clips guide visual character; no exact world-speed reconstruction is claimed.

## Working reference labels and limits

**File-to-technique labels remain provisional pending owner confirmation.** Frame inspection revised the initial guess: the working mapping is 9.10.16 Chip; 9.12.57 Finesse; 9.14.15 Power; 9.15.19 Trivela. The last clip is mostly a paused end-state, so it cannot establish a new flight or speed.

### Chip

[Screen Recording 2026-10-16 at 9.10.16 PM.mov](references/ref-211016.mp4)

Ball leaves boot around 0.75–0.80 s; clear upward arc then descent toward the keeper around 1.9–2.0 s. Subsequent movement is affected by the keeper.

Shorter in-box distance, moving camera and unknown playback speed. This is a shape/feel reference, not a measured 19 m speed target.

**Applied:** 17 m/s at 30° replaces 16 m/s at 36°; backspin stays +12 rad/s. Quicker flight and lower apex at the common 19 m setup.

### Finesse / Inside (working label)

[Screen Recording 2026-10-16 at 9.12.57 PM.mov](references/ref-211257.mp4)

Contact near the beginning; the ball rises past the keeper and enters the goal region around 0.4–0.5 s. Ignore the later crossfade.

Technique label needs confirmation. Perspective, distance and source playback are not calibrated.

**Applied:** Keep 30 m/s; lift increases from 10° to 11.5°. Existing inside spin and curve law stay fixed.

### Power (working label)

[Screen Recording 2026-10-16 at 9.14.15 PM.mov](references/ref-211415.mp4)

Middle shot contact around 3.1–3.2 s; ball reaches the goal region around 3.6–3.7 s. Opening and closing shots are edited examples.

Technique label needs confirmation; edits and camera motion prevent reliable world-speed fitting.

**Applied:** Keep strongest 39 m/s and 0.65 s preparation; elevation rises from 7° to 10° for a rising drive.

### Trivela / Outside (working label)

[Screen Recording 2026-10-16 at 9.15.19 PM.mov](references/ref-211519.mp4)

Ball is already airborne and the scene is essentially held; a pause indicator appears. No launch-to-arrival interval is visible.

Insufficient motion to calibrate speed, spin, bend or timing. No inferred m/s or spin values are attributed to this recording.

**Applied:** Retain 32 m/s, 11°, +60 rad/s sidespin and existing aim. Do not retune from a paused end-state.

Clips were inspected as every-third-frame samples from 60 fps recordings, with additional frame sequences around the strikes. Times above are recording time, not verified simulation time. Camera movement, short distances, edits, unknown playback rate and keeper contacts limit quantitative inference. Unrelated on-screen text was treated as source content, not task instructions. Original filenames and SHA-256 hashes are in references/sources.json.

## Before and after at the common 19 m plane

| Family | Launch old → new m/s | Elevation old → new | Arrival old → new s | Apex clearance old → new m | New goal-centre height m |
| --- | --- | --- | --- | --- | --- |
| INSIDE | 30.0 → 30.0 | 10.0° → 11.5° | 0.733 → 0.737 | 1.21 → 1.57 | 1.51 |
| OUTSIDE | 32.0 → 32.0 | 11.0° → 11.0° | 0.691 → 0.691 | 1.59 → 1.59 | 1.59 |
| LACES | 34.0 → 34.0 | 8.0° → 8.0° | 0.642 → 0.642 | 0.93 → 0.93 | 0.77 |
| POWER | 39.0 → 39.0 | 7.0° → 10.0° | 0.559 → 0.563 | 0.86 → 1.68 | 1.78 |
| CHIP | 16.0 → 17.0 | 36.0° → 30.0° | 1.721 → 1.500 | 4.34 → 3.59 | 1.97 |

Finesse gains modest lift without losing its dangerous 30 m/s pace. Power remains fastest and gains a more rising drive. Normal/Laces stays at its prior 34 m/s direct benchmark. Chip gains forward pace while reducing excess hang time. Trivela retains its prior motion because the putative reference lacks a usable launch-to-arrival sequence.

These are one-time launch changes. Finesse elevation is 11.5°, Power 10°, Chip 30° with a 17/34 technique conversion. Normal stays 8° and Trivela 11°. Every spin vector remains exactly the prior family choice. No new curve law, target steering or post-contact correction exists.

The preserved resolver validates player/context/contact, then this lab transforms the launch before schedule(). The physical ball receives velocity and spin once. Power commitment remains 39/34, with 0.65 s disclosed preparation versus Normal/Laces 0.28 s. The illustrative boot aligns at t=0 but does not generate ball force. It is not a final skeletal kick animation.

## Three brackets per family

| Candidate | SP | Launch m/s | Horizontal / vertical m/s | Elevation / yaw ° | Spin rad/s [X,Y,Z] | 19m time / speed | First-flight apex / time | Landing distance / time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inside-controlled | 80 | 26.0 | 25.48 / 5.18 | 11.5 / -4.0 | [0.000, -35.000, 0.000] | 0.851 s / 20.05 m/s | 1.22 m / 0.487 s | 21.80 m / 0.996 s |
| inside-fast | 80 | 30.0 | 29.40 / 5.98 | 11.5 / -4.0 | [0.000, -35.000, 0.000] | 0.737 s / 22.88 m/s | 1.57 m / 0.550 s | 27.43 m / 1.131 s |
| inside-very-fast | 80 | 34.0 | 33.32 / 6.78 | 11.5 / -4.0 | [0.000, -35.000, 0.000] | 0.651 s / 25.84 m/s | 1.96 m / 0.608 s | 33.19 m / 1.260 s |
| outside-controlled | 80 | 28.0 | 27.49 / 5.34 | 11.0 / 7.0 | [0.244, 60.000, -1.985] | 0.789 s / 21.52 m/s | 1.25 m / 0.487 s | 23.32 m / 1.000 s |
| outside-fast | 80 | 32.0 | 31.41 / 6.11 | 11.0 / 7.0 | [0.244, 60.000, -1.985] | 0.691 s / 24.42 m/s | 1.59 m / 0.542 s | 28.75 m / 1.122 s |
| outside-very-fast | 80 | 36.0 | 35.34 / 6.87 | 11.0 / 7.0 | [0.244, 60.000, -1.985] | 0.614 s / 27.42 m/s | 1.94 m / 0.596 s | 34.26 m / 1.239 s |
| laces-controlled | 80 | 30.0 | 29.71 / 4.18 | 8.0 / 0.0 | [0.000, 0.000, -4.000] | 0.728 s / 23.33 m/s | 0.75 m / 0.371 s | 19.71 m / 0.759 s |
| laces-fast | 80 | 34.0 | 33.67 / 4.73 | 8.0 / 0.0 | [0.000, 0.000, -4.000] | 0.642 s / 26.26 m/s | 0.93 m / 0.408 s | 24.11 m / 0.845 s |
| laces-very-fast | 80 | 38.0 | 37.63 / 5.29 | 8.0 / 0.0 | [0.000, 0.000, -4.000] | 0.575 s / 29.27 m/s | 1.13 m / 0.446 s | 28.64 m / 0.927 s |
| power-controlled | 80 | 34.0 | 33.48 / 5.90 | 10.0 / 0.0 | [0.000, 0.000, -8.000] | 0.646 s / 26.10 m/s | 1.34 m / 0.475 s | 27.33 m / 0.985 s |
| power-fast | 80 | 39.0 | 38.41 / 6.77 | 10.0 / 0.0 | [0.000, 0.000, -8.000] | 0.563 s / 29.87 m/s | 1.68 m / 0.525 s | 33.40 m / 1.095 s |
| power-very-fast | 80 | 44.0 | 43.33 / 7.64 | 10.0 / 0.0 | [0.000, 0.000, -8.000] | 0.499 s / 33.71 m/s | 2.03 m / 0.571 s | 39.48 m / 1.199 s |
| chip-controlled | 80 | 15.5 | 13.42 / 7.75 | 30.0 / 0.0 | [0.000, 0.000, 12.000] | 1.645 s / 8.01 m/s | 3.02 m / 0.800 s | 18.89 m / 1.630 s |
| chip-fast | 80 | 17.0 | 14.72 / 8.50 | 30.0 / 0.0 | [0.000, 0.000, 12.000] | 1.500 s / 12.44 m/s | 3.59 m / 0.871 s | 22.10 m / 1.782 s |
| chip-very-fast | 80 | 18.5 | 16.02 / 9.25 | 30.0 / 0.0 | [0.000, 0.000, 12.000] | 1.381 s / 12.71 m/s | 4.20 m / 0.942 s | 25.40 m / 1.930 s |

The 18.5 m/s Chip upper candidate clears the 19 m crossbar at the fixed aim; it is an intentionally strong longer-chip option. The 44 m/s Power upper candidate remains a possible excessive-at-80 comparison. FAST is provisional, not owner-approved. All selected FAST shots fit the reference goal mouth.

The world uses X forward, Y up, Z lateral. Goal plane is X=19 m; ball starts stationary at [0,0.11,0] m. Goal heights are centre heights. Apex is bottom clearance above turf. Calibration goal frames are visual reference geometry; there is no goalkeeper or net capture in these runs. Actual frame collisions remain exercised by foundation regressions.

## Distances and headroom

| Family | Plane m | Time s | Speed m/s | Centre height m | Before first landing |
| --- | --- | --- | --- | --- | --- |
| INSIDE | 25 | 1.013 | 21.46 | 0.67 | YES |
| INSIDE | 30 | 1.280 | 17.31 | 0.42 | NO |
| OUTSIDE | 25 | 0.949 | 22.80 | 0.90 | YES |
| OUTSIDE | 30 | 1.191 | 18.64 | 0.29 | NO |
| LACES | 25 | 0.885 | 22.24 | 0.20 | NO |
| LACES | 30 | 1.118 | 20.79 | 0.27 | NO |
| POWER | 25 | 0.772 | 27.69 | 1.46 | YES |
| POWER | 30 | 0.960 | 26.13 | 0.79 | YES |

Longer-distance trials use the same launch, aim and spin; only the observer plane changes. Power now remains in first flight at 30 m. At 25 m only Normal/Laces has already landed; at 30 m the other three hard families have landed. This comparison does not claim a finished long-shot aiming model.

| Chip landing target m | Charge % of 18.5 m/s ceiling | Launch m/s | Apex clearance m | Landing time s |
| --- | --- | --- | --- | --- |
| 10 | 58.84 | 10.89 | 1.52 | 1.148 |
| 15 | 73.46 | 13.59 | 2.35 | 1.432 |
| 20 | 86.62 | 16.02 | 3.21 | 1.683 |
| 25 | 99.03 | 18.32 | 4.12 | 1.913 |

Chip distance weighting is selected by offline bisection before contact. All distance chips use 30° and +12 rad/s backspin. The baseline 17 m/s FAST shot is full charge under its own technique bracket; distance tests use the stronger 18.5 m/s ceiling. Numerical landing accuracy is a calibration result, not live target steering.

| Shot Power | Finesse | Trivela | Normal | Power | Chip |
| --- | --- | --- | --- | --- | --- |
| 50 | 22.78 | 24.30 | 25.82 | 29.61 | 12.91 |
| 65 | 25.97 | 27.70 | 29.44 | 33.76 | 14.72 |
| 80 | 30.00 | 32.00 | 34.00 | 39.00 | 17.00 |
| 90 | 33.15 | 35.36 | 37.57 | 43.09 | 18.78 |
| 99 | 36.30 | 38.72 | 41.14 | 47.19 | 20.57 |

Speeds are m/s. The existing capability map 0.65+0.65×(SP/99)² remains monotone and bounded on ratings 1–99, with 20.99% speed headroom above 80. The selected hard-shot projections remain within the reference mouth at 50/65/80/90/99; high-rating full-charge chips require reduced charge for the same target. Ratings are projections, not a completed attribute calibration.

## Player, action weight and audit

| Attribute | Value |
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

| Family | 35% charge m/s | 65% charge m/s | 100% charge m/s |
| --- | --- | --- | --- |
| INSIDE | 10.50 | 19.50 | 30.00 |
| OUTSIDE | 11.20 | 20.80 | 32.00 |
| LACES | 11.90 | 22.10 | 34.00 |
| POWER | 13.65 | 25.35 | 39.00 |
| CHIP | 5.95 | 11.05 | 17.00 |

Finishing, Long Shots, Curve and Technique remain separate reserved values at 50; no hidden 99 values or uncalibrated power bonuses were introduced. Full launch vectors, unit spin axes, contact metadata, preparation, context factors and heights at 5/10/15/19/20/25/30 m are retained in evidence/measurements.json. Every physical substep and event is in evidence/review.json.

## Review and verification

Open review.html in the delivered folder, or use the live HTTP lab. Start at Five families for synchronized 1× gameplay view. References & before/after provides the supplied clip, observations and old/new FAST shots. The reference player is deliberately independent: it is not time-stretched or falsely synchronized to a different 19 m scene. Side, behind, goal-facing and 0.25× contact views remain available.

- [INSIDE candidates at 1×](videos/inside-80-brackets-1x.mp4)

- [OUTSIDE candidates at 1×](videos/outside-80-brackets-1x.mp4)

- [LACES candidates at 1×](videos/laces-80-brackets-1x.mp4)

- [POWER candidates at 1×](videos/power-80-brackets-1x.mp4)

- [CHIP candidates at 1×](videos/chip-80-brackets-1x.mp4)

Also: [five-family matrix](videos/five-families-80-1x.mp4), [Chip side view](videos/chip-fast-side-1x.mp4), [quarter-speed contact](videos/contact-timing-quarter-speed.mp4).

- 20/20 reference-shot tests and 53/53 foundation regressions pass.

- 622 preserved files match d5790bf4 byte-for-byte, including all Candidate A evidence.

- Old ground streams: `4bd0e797103f4a29c7bb6fd45e1c0b35f6a5cefeb393c8355cb9e1616d3e42bf` — unchanged.

- Old shot streams: `ce51c9d2a9d4be2d699b8b31b27588a5ad1358a89f47b23fdb1b4b2a63dabe3a` — unchanged.

- New shot streams: `fbde20bebfc53711f4ad5a247e6e7a8aea9d8397f3e903fa5d63ed31a03c55d6`; 5653207 bytes across 15 candidates.

- Maximum 240→480 Hz differences: arrival 0.299 ms; centre height 1.353 cm; first landing 6.077 cm.

No match, goalkeeper, receiving or dribbling integration. Final family animation and owner visual selection remain pending. Five-family visual distinction is still a qualitative review question rather than a claimed proven success.

Source is supplied with its original relative layout. Run `node source/sandbox/visual/ballshot11/tools/test.mjs` with Node 22 to reproduce packaged checks. Evidence regeneration additionally needs Git history at d5790bf4. Video regeneration needs Sharp and FFmpeg at the paths shown in tools/videos.mjs. Packaged HTML embeds its runtime and replay data; adjacent reference/video/report links require the whole folder. Local-file browser opening has not been tested.

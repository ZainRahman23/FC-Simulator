# BALL-FEEL-1.1 — fast / responsive review

Owner selection only. This lab does not change the live match. Commit 51bbcb2f and both approved evidence directories remain unchanged. The new work lives entirely in `sandbox/visual/ballfeel11`.

Open the review page and use its three sections: **A Ground pass feel**, **B Curve**, **C General fast feel**. Playback defaults to 1×. Select a candidate, replay, pause at the target or scrub. Primary playback uses the unchanged actual Touchline projection: 30 m height, 22° pitch, 28° field of view and fixed 1280 × 720 reference focal length. The ball remains its physical 0.11 m radius. Scale figures are visual references, not receivers or colliders. Camera rail is fixed for each target distance; very long rejected runouts may leave that framing. Measured stop distance remains visible.

## Recommendation awaiting owner selection

Use the **progressive rolling surface**, with the normal pass resolver centered at **13.01 m/s for 15 m**: **1.414 s arrival**, **8.245 m/s arrival speed**, **24.520 m untouched stop**, **4.271 s full rest**. Compared with BALANCED, arrival is 24.4% quicker, total range 32.4% shorter, and the excess travel beyond the receiver falls from 21.25 to 9.52 m (55.2% less). Short-pass center reaches 5 m in 0.714 s; normal ground weighting reaches 5 m in 0.546 s.

Three useful matrix alternatives:

| Candidate | Launch m/s | Time to 15 m s | Arrival m/s | Stop m |
|---|---:|---:|---:|---:|
| FAST + progressive | 12.50 | 1.506 | 7.432 | 22.650 |
| FAST + constant 2.10 | 12.50 | 1.463 | 8.183 | 29.190 |
| VERY RESPONSIVE + progressive | 15.00 | 1.161 | 10.932 | 32.231 |

The low-speed BALANCED launch plus progressive turf stops short at 12.56 m. This is intentionally retained as a failed combination: resistance alone is not the answer. The 15 m matrix contains exactly 12 combinations, including the unchanged BALANCED control. Supplementary constant anchors 0.9, 1.2, 1.5, 1.8 and 2.1 are measured at the same 12.5 m/s launch.

## Global surface and flight model

`world.js` extends the approved physical world only at its scalar rolling-resistance input. The original solver still computes contact, Coulomb skid friction, the rolling constraint, normal/tangential impulses, CCD, launch arbitration, no-double-impulse guards and rest. There is one authoritative ball. No target or intended arrival state enters the world.

The proposed global rolling law, for horizontal speed v in m/s, is:

```
a(v) = [1.2 + 3.8 / (1 + (v / 8)^2)] * v / (v + 0.6)  m/s²
```

The four knobs are high-speed resistance 1.2, low/middle asymptote 5, knee speed 8 and terminal taper 0.6. Resistance is sampled once per 240 Hz substep and is applied only when the existing solver has achieved the no-slip rolling constraint. At 15 m/s it is approximately 1.96 m/s²; at 3 m/s approximately 3.78 m/s². The terminal taper is deliberately viscous: acceleration approaches zero smoothly as the ball settles, instead of switching on a fixed brake. The existing very small sleep thresholds remain unchanged. The plotted measured deceleration also includes aerodynamic drag. The deliberate instantaneous launch is excluded from the friction derivative. All 12 time series are supplied in `evidence/velocity-decay.csv`.

Sliding friction stays **0.30**. Turf tangential friction stays **0.30**. Turf restitution stays **0.60**. Gravity, drag coefficient 0.25, air spin decay 0.12, rest thresholds, dwell and bounce cutoff stay unchanged. A driven center launch skids for about **0.50 s**, then rolls; increasing rolling resistance does not multiply the skid impulse. The original skid states match exactly before rolling begins.

The global Magnus lift slope remains **1.0** and its cap rises from **0.30 to 1.20**. This permits high angular velocities to create more bend rather than saturating early. The approved energy-preserving Magnus velocity rotation remains unchanged. Ground yaw-spin decay increases from **1.6 to 12 rad/s²**, globally, so exaggerated sidespin does not leave a ball rotating in place for a minute. It affects the vertical spin axis on the ground, not normal bounce impulses. Translation may stop before residual yaw spin; both times are recorded. At 110 rad/s, translation settles around 5.25 s and full angular rest at 9.46 s.

## Action resolver

Global turf is identical for every proposed action. The resolver sets only the initial direction, speed, vertical component and angular velocity. Ground speed is solved continuously for distance and intended arrival weighting, using a transparent 256-step RK4 integration in distance:

```
u = v²
 du/dD = 2 * (a(sqrt(u)) + k*u)
 k = 0.5*rho*pi*r²*Cd / (mass * (1 + inertiaFactor))
```

This is a pre-launch estimate, not a controller. Measured arrivals differ by less than 0.025 m/s across the tested ordinary weighting/distance grid, because the actual solver integrates fixed time steps. It is not a universal inverse solution for arbitrary high-speed sliding or external contacts. No fixed launch speed is reused across 5, 10, 15, 20, 25 and 30 m. The evidence includes 54 distance/power combinations across short, normal and firm ground families. Existing action errors, selected/preferred foot metadata, seeded execution and authoritative handoff remain in place. No second error draw is introduced.

Normal ground center launches across 5–30 m are 10.07, 11.62, 13.01, 14.31, 15.57 and 16.79 m/s. Arrival times are 0.546, 1.008, 1.414, 1.781, 2.116 and 2.425 s. Intended arrival weighting stays 8.25 m/s; the untouched stop remains about 9.52 m beyond the receiver. The separate short-pass family is softer but still sharp.

## Curve selection

Same starting position, horizontal speed 22.5 m/s, lift 6.9 m/s, zero backspin and 22 m measuring plane for every bracket candidate. The new global environment is common to all five. The CURRENT 39 rad/s flight to the measuring plane is identical to the prior BALANCED result; its later ground decay uses the new shared turf.

| Level | Sidespin rad/s | Bend at 22 m | Relative to CURRENT |
|---|---:|---:|---:|
| CURRENT | 39 | 2.644 m | 1.00× |
| STRONG | 60 | 4.157 m | 1.57× |
| VERY STRONG | 80 | 5.721 m | 2.16× |
| SPECTACULAR | 110 | 8.493 m | 3.21× |
| EXTREME | 135 | 11.704 m | 4.43× |

Recommend VERY STRONG as a clearly expressive high-skill result and SPECTACULAR for elite technique. EXTREME is deliberately too much in my judgment; unlike the first four, it bounces before crossing the measuring plane. Its forward velocity stays nonnegative throughout. The next probes at 140 and 150 rad/s eventually reverse after bouncing, and are rejected rather than offered as playable settings. The proposed default INSIDE/OUTSIDE action envelope also remains forward across power 0–1.

Sidespin scales continuously with `(0.06 + 0.94*curveSkill²) * (0.15 + 0.85*executionQuality²)`. Technique factors: INSIDE and INSIDE_FINISH 1.0, OUTSIDE 1.15 with reversed sign, LACES 0.18, LACES_POWER 0.10, CHIP 0.08. At the common setup, high-quality INSIDE bend goes from 0.44 m (skill 0), to 2.19 m (0.5), to 5.83 m (0.85), to 8.49 m (1.0). Poor execution plus low skill yields about 0.10 m. Elite OUTSIDE yields 10.45 m. Straight normal/power shots still have zero sidespin by default. Once launched, every curve is caused by angular velocity and Magnus; there is no spline or steering.

## Shots and aerials

Placed, normal and power horizontal speed centers are **20.5, 27 and 34.5 m/s**. Their common-20 m arrival times are 1.170, 0.848 and 0.664 s. The power ceiling tested is 40 m/s (0.572 s). The additional **56 m/s boundary** reaches 20 m in **0.409 s**: my too-fast candidate, retained for owner comparison. The normal C-section shot uses its representative 18 m distance; the shot-ceiling comparison uses 20 m for every shot.

Loft and cross horizontal centers increase to 18.5 and 22 m/s. Chip increases from 8.5 to 9.5 m/s and its center backspin is reduced from 32 to 29 rad/s to offset the larger lift cap. Pure vertical drop trajectories and impacts at 0.25, 0.5, 1 and 2 m match BALANCED **bit for bit**. Revised aerial apex / first-landing-time changes are respectively:

- Loft: −0.15% / +0.36%.
- Cross: −0.78% / −0.04%.
- Chip: +2.22% / +2.95%.

The chip cap coupling is therefore small and explicitly measured; no restitution adjustment hides it. Normal impacts still retain e² = 0.36 of incoming normal kinetic energy above the bounce cutoff. Later horizontal skid/runout intentionally differs.

## Low-speed envelope

Free rolling separation in metres; no dribbling or possession control:

| Launch m/s | 100 ms | 250 ms | 500 ms | 1 s | Full rest s |
|---|---:|---:|---:|---:|---:|
| 0.5 | 0.039 | 0.068 | 0.081 | 0.083 | 0.675 |
| 1 | 0.084 | 0.162 | 0.209 | 0.217 | 0.858 |
| 2 | 0.181 | 0.386 | 0.574 | 0.643 | 1.146 |
| 3 | 0.280 | 0.629 | 1.026 | 1.287 | 1.412 |
| 4 | 0.380 | 0.878 | 1.517 | 2.128 | 1.671 |
| 5 | 0.481 | 1.131 | 2.024 | 3.098 | 1.938 |

## Validation and limits

- 53/53 original foundation assertions pass under the proposed global calibration and rolling wrapper. No assertion is weakened. They include boot/shin/body contacts, tackles, blocks, posts/crossbars, 100 m/s CCD, no-double-impulse policy, action cancellation, energy, rest and timestep convergence.
- 38/38 calibration assertions pass: continuous weighting, distance estimation, seeded errors, real match camera projection, exact BALANCED ground control, exact vertical drops, aerial equivalence, smooth dissipative rolling, unchanged sliding, curve/technique envelope and shared globals.
- Node v22.19.0 and Chrome 155 match **70 full unrounded 240 Hz state/event replays**, including all 12 ground candidates through 14 s, all five curve candidates through 12 s, 33 execution variants and 20 physical fixtures. SHA-256: `0f4b439f6eeb6972162699007b5b0bfe7c21bfdfca20ee0cf348a648566fbb05`; 41,631,588 UTF-8 bytes.
- Latest local CPU median batch mean: **0.787 ms per 60 Hz tick with 308 actual V2 colliders**, four substeps. Maximum of seven batch means 1.125 ms. Free flight 0.015 ms; rolling 0.018 ms. These are local CPU measurements taken while rendering evidence, not a full-match or worst-frame performance guarantee.
- All 48 files across BALL-PHYS-1 and BALL-FEEL-1 match their preserved commits byte for byte.
- Browser checks cover the live HTTP review. The offline bundle's module graph, syntax, embedded data and local references are validated separately; browser automation does not certify opening a file URL.

Three biggest remaining feel defects:

1. **Driven / firm untouched runout is still long.** Driven center travels 78.46 m, firm center 51.35 m. Fast initial pace and modest high-speed resistance preserve considerable momentum. Below normal arrival pace the turf kills residual motion quickly, but the complete driven envelope still needs owner judgment.
2. **The extreme curve changes the kind of shot.** At 135 rad/s it crosses the plane after a bounce; residual yaw can outlast translation. The clean elite ceiling should probably remain near the 80–110 rad/s bracket, with OUTSIDE used deliberately.
3. **Receiving and keeper context are absent.** A 0.41 s shot or 8.25 m/s arriving pass is measurable, but tackle/readability, first touch and save timing need a later integration review after owner selection. Nothing here authorizes live promotion.

## Reproduce

From this directory, `node tools/foundation-regression.mjs`, `node tools/test.mjs`, and `node tools/build-evidence.mjs` write only BALL-FEEL-1.1 evidence. They never run the prior evidence writers. `tools/videos.mjs` uses Sharp and ffmpeg to export 1280 × 720, 30 fps, 1× clips. `tools/package.mjs <output-directory>` builds a self-contained review with bundled modules and embedded measurements. Open the local HTTP review using the repository's normal static server. The downloadable package also contains source, videos, a patch and verification results.

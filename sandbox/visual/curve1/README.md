# CURVE-1 — continuous Curve candidate

This is the separately authorized continuous-Magnus Finesse candidate. The original BALL-SHOT-1.2 foundation, including fc-b, remains byte-for-byte intact. Only this candidate selects the existing ordinary Magnus law with constant gain 1, rather than the inherited speed-windowed gain and quench. No delayed activation, time multiplier, target seeking, spline or trajectory steering exists. Original Trivela and all other family labs retain their world and speed.

Intentional sidespin magnitude = 40 × (Curve / 75)^2.7 rad/s in clean execution. Right-foot Finesse has spin [0, −magnitude, 0], axis [0, −1, 0]; Curve 0 has [0,0,0] and no defined spin axis (stored [0,0,0]). Existing execution factor and charge multiply spin once at contact. All calibration cases use both factors = 1. Magnitude/axis error is deferred.

The original 60 rad/s hypothesis was tested before any keeper run. Under frozen fc-b, higher ratings can bend less. Under the separate ordinary Magnus candidate, 60 makes the 99-Curve long fixed-aim case reverse; 50–55 land before the goal. The selected 40 anchor yields 2.61/3.56 m bend at 75 and 6.58/9.31 m at 99 in A/B, without reversal through an additional 8-second unopposed runout. The old 21 rad/s frozen-physics candidate is preserved separately.

50 is visibly weaker than 75. 90 is my first clearly elite candidate; 85 is the transition. 99 looks spectacular and remains nonreversing, but its longer fixed-aim shot is deliberately near the high end of playable bend. This is a visual judgment for owner review, not an approved calibration. The 75 reference match is PARTIAL: the supplied 9.12.57 PM clip supports visual character, but its short distance, camera motion and unverified playback/attribute values do not establish an exact 3D 75-Curve target. No source speed, spin or metre measurement has been invented.

## Review media

- [Scenario A — 50/75/90/99, fixed launch, 1×](videos/A-fixed-50-75-90-99-1x.mp4)
- [Scenario B — 50/75/90/99, fixed launch, 1×](videos/B-fixed-50-75-90-99-1x.mp4)
- [Scenario A — same target, 1×](videos/A-targeted-50-75-90-99-1x.mp4)
- [Scenario B — same target, 1×](videos/B-targeted-50-75-90-99-1x.mp4)
- [0/75/99 fixed launch — A](videos/A-fixed-0-75-99-1x.mp4) / [B](videos/B-fixed-0-75-99-1x.mp4)
- [Interactive review](review.html)

## Controlled setup

Scenario A starts at [84,0.11,26] m: 21 m forward from the goal and 22.47 m from goal centre. Scenario B starts at [80,0.11,25]: 25 m forward / 26.57 m from centre. The goal is 7.32 × 2.44 m, plane X=105, centre Z=34. Same target [105,1.4,37] m. Both use a right-footed player in the left half-space.

Fixed mode uses the Curve-75 prelaunch solve once, then leaves the initial velocity exactly identical across all 11 ratings: A yaw 21.780955°, elevation 12.699964°; B yaw 18.644999°, elevation 14.473201°. Stronger spin may miss because aim is frozen. Targeted mode solves initial yaw/elevation for every primary rating against the same target and same 0.00001 m tolerance, before launching. It supplies no high-Curve accuracy advantage and never reads keeper outcomes.

Bend is lateral departure from the initial horizontal tangent at a forward-X plane; it excludes the shared aim angle. All curve measurements are unopposed. Keeper contacts and goal-frame contacts are only included in separate outcome/replay runs. 240 Hz substeps / 60 Hz keeper decisions. Checkpoints beyond the goal are diagnostic continuations; † means after first landing. Full spin vectors, curvature samples, 25/30 m points, and actual keeper contacts are in evidence/measurements.json. Maximum lateral acceleration is the normal component in the horizontal plane, separated from longitudinal deceleration; world-Z acceleration is also recorded.

## Frozen Courtois audit

| INPUT | VALUE | USED BY GK? | EXACT EFFECT |
| --- | --- | --- | --- |
| Fixture / player | GK_CAP.COURTOIS / p001 | Identity only | No name-based save multiplier |
| OVR | 93 | No | Database metadata |
| gk_reflexes | 96 | Yes | Reaction latency and hand acceleration; latency 0.12548316004334992 s |
| gk_diving | 91 | Yes | Lateral/down reach envelope, dive acceleration and loading time |
| gk_handling | 95 | Yes | Catch security, control quality and parry response after contact |
| jumping | 68 | Yes | Vertical reach and upward action acceleration |
| height_cm | 199 | Yes | Body geometry, hand rest height and coupled reach envelope |
| weight_kg | 96 | Yes | Post-contact body restitution through effective mass |
| acceleration | 42 | Yes | Foot repositioning acceleration |
| sprint_speed | 52 | Yes | Foot repositioning speed limit |
| strength | 70 | Yes | Braking/bracing and contact absorption/security |
| gk_positioning | 94 in record; 72 effective | 72 only | Unchanged aperture/SET positioning; existing fixture leaves profile 94 unapplied |
| reactions / agility | 94 / 63 | No | Present in profile; unused by this save implementation |
| gk_kicking / balance / composure | 82 / 45 / 66 | No | Database values; unused by this save test |
| GK stamina / preferred foot | 38 / L | No | No stamina depletion or foot preference in saving |
| Shooter context | SP90; full charge; right preferred/selected foot; pressure0; stamina1; energy1; execution1; body setup1 | Launch only | Same for all cases; no random error |
| Other shooter attributes | finishing50 / longShots50 / technique50 / weakFoot50 | No extra curve bonus | Reserved ratings; preferred-foot test means no weak-foot penalty |
| Keeper policy | M6 / NEW-D2-Q25 / H4 / SET | Yes | Fixed policies; reset at each contact; no GK tuning |

The save envelope is unchanged: lateral span 2.9132432895660134 m; standing reach 2.587 m; high reach 3.048165425934221 m; hand rest height 1.5522 m. Initial roots are A [102.67996507161543, 0, 32.979137883686846] and B [103.01033127199327, 0, 33.16889372240784]. Each scenario uses exactly the same initial attributes and keeper state across ratings. Different trajectories legitimately change observed prediction, movement and contacts. No pressure, stamina/energy or preferred foot modifies Courtois in these tests. Name and OVR have no effect. Prediction horizon, action policies, collision radii, contact thresholds and animation geometry constants remain hardcoded in the frozen implementation.

Source snapshot SHA-256: 01e08f84d4195f1fa65edd922f0cb28037ddaaa91b1d9525f9441b93135cd3c6. Runtime SHA-256: acb120a123ebaa23e55f9901e44a5502fc3db268200459b9c76132bee22138b3.

## Full physical measurements

### Scenario A — initial spin and bend (metres)

| Curve | Initial spin rad/s | 5 m | 10 m | 15 m | 20 m | Goal |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| 25 | 2.060 | 0.007 | 0.027 | 0.061 | 0.111 | 0.122 |
| 50 | 13.385 | 0.044 | 0.177 | 0.405 | 0.736 | 0.815 |
| 60 | 21.898 | 0.072 | 0.291 | 0.671 | 1.227 | 1.360 |
| 70 | 33.202 | 0.109 | 0.447 | 1.037 | 1.912 | 2.124 |
| 75 | 40.000 | 0.132 | 0.542 | 1.265 | 2.345 | 2.609 |
| 80 | 47.614 | 0.158 | 0.651 | 1.527 | 2.853 | 3.179 |
| 85 | 56.082 | 0.187 | 0.774 | 1.829 | 3.449 | 3.853 |
| 90 | 65.441 | 0.219 | 0.913 | 2.177 | 4.156 | 4.657 |
| 95 | 75.727 | 0.254 | 1.070 | 2.579 | 5.004 | 5.631 |
| 99 | 84.647 | 0.286 | 1.210 | 2.946 | 5.816 | 6.576 |

### Scenario A — spin at distance (rad/s)

| Curve | 5 m [Y / magnitude] | 10 m | 15 m | 20 m | 25 m |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 |
| 25 | -2.013 / 2.013 | -1.964 / 1.964 | -1.913 / 1.913 | -1.859 / 1.859 | -1.803 / 1.803 |
| 50 | -13.081 / 13.081 | -12.759 / 12.759 | -12.420 / 12.420 | -12.062 / 12.062 | -11.686 / 11.686 |
| 60 | -21.399 / 21.399 | -20.870 / 20.870 | -20.308 / 20.308 | -19.712 / 19.712 | -19.079 / 19.079 |
| 70 | -32.443 / 32.443 | -31.633 / 31.633 | -30.766 / 30.766 | -29.836 / 29.836 | -28.834 / 28.834 |
| 75 | -39.085 / 39.085 | -38.103 / 38.103 | -37.046 / 37.046 | -35.904 / 35.904 | -34.660 / 34.660 |
| 80 | -46.523 / 46.523 | -45.346 / 45.346 | -44.071 / 44.071 | -42.678 / 42.678 | -41.139 / 41.139 |
| 85 | -54.794 / 54.794 | -53.397 / 53.397 | -51.869 / 51.869 | -50.179 / 50.179 | -48.267 / 61.142 † |
| 90 | -63.934 / 63.934 | -62.288 / 62.288 | -60.470 / 60.470 | -58.424 / 58.424 | -55.997 / 67.291 † |
| 95 | -73.978 / 73.978 | -72.053 / 72.053 | -69.898 / 69.898 | -67.417 / 67.417 | -64.274 / 74.170 † |
| 99 | -82.687 / 82.687 | -80.514 / 80.514 | -78.049 / 78.049 | -75.141 / 75.141 | -71.171 / 80.061 † |

### Scenario A — flight and goal-plane measurements

| Curve | Launch m/s | Flight s | Arrival m/s | Max lateral a m/s² | Apex centre m | Goal [X,Y,Z] m |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 30.000 | 0.903 | 21.816 | 0.000 | 2.002 | 105.000, 1.563, 34.391 |
| 25 | 30.000 | 0.905 | 21.805 | 0.351 | 2.002 | 105.000, 1.557, 34.514 |
| 50 | 30.000 | 0.918 | 21.742 | 2.284 | 2.002 | 105.000, 1.520, 35.206 |
| 60 | 30.000 | 0.929 | 21.689 | 3.736 | 2.002 | 105.000, 1.488, 35.751 |
| 70 | 30.000 | 0.945 | 21.611 | 5.665 | 2.002 | 105.000, 1.436, 36.515 |
| 75 | 30.000 | 0.956 | 21.559 | 6.825 | 2.002 | 105.000, 1.400, 37.000 |
| 80 | 30.000 | 0.970 | 21.496 | 8.124 | 2.002 | 105.000, 1.354, 37.570 |
| 85 | 30.000 | 0.987 | 21.419 | 9.568 | 2.002 | 105.000, 1.294, 38.244 |
| 90 | 30.000 | 1.009 | 21.324 | 11.165 | 2.002 | 105.000, 1.213, 39.048 |
| 95 | 30.000 | 1.037 | 21.206 | 12.920 | 2.002 | 105.000, 1.103, 40.022 |
| 99 | 30.000 | 1.066 | 21.088 | 14.442 | 2.002 | 105.000, 0.982, 40.968 |

![Scenario A top-down overlay](evidence/A-top-down.png)

[All eleven ratings](evidence/A-top-down-all-ratings.png). Individual plots: [0](evidence/A-curve-0-trajectory.png) · [25](evidence/A-curve-25-trajectory.png) · [50](evidence/A-curve-50-trajectory.png) · [60](evidence/A-curve-60-trajectory.png) · [70](evidence/A-curve-70-trajectory.png) · [75](evidence/A-curve-75-trajectory.png) · [80](evidence/A-curve-80-trajectory.png) · [85](evidence/A-curve-85-trajectory.png) · [90](evidence/A-curve-90-trajectory.png) · [95](evidence/A-curve-95-trajectory.png) · [99](evidence/A-curve-99-trajectory.png). SVG equivalents are included.

### Scenario B — initial spin and bend (metres)

| Curve | Initial spin rad/s | 5 m | 10 m | 15 m | 20 m | Goal |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| 25 | 2.060 | 0.006 | 0.025 | 0.058 | 0.105 | 0.166 |
| 50 | 13.385 | 0.041 | 0.167 | 0.383 | 0.694 | 1.107 |
| 60 | 21.898 | 0.068 | 0.275 | 0.633 | 1.154 | 1.851 |
| 70 | 33.202 | 0.103 | 0.421 | 0.975 | 1.790 | 2.896 |
| 75 | 40.000 | 0.125 | 0.511 | 1.187 | 2.189 | 3.565 |
| 80 | 47.614 | 0.149 | 0.612 | 1.429 | 2.654 | 4.357 |
| 85 | 56.082 | 0.176 | 0.727 | 1.707 | 3.195 | 5.302 |
| 90 | 65.441 | 0.206 | 0.856 | 2.025 | 3.829 | 6.449 |
| 95 | 75.727 | 0.240 | 1.001 | 2.390 | 4.578 | 7.875 |
| 99 | 84.647 | 0.269 | 1.130 | 2.721 | 5.283 | 9.313 |

### Scenario B — spin at distance (rad/s)

| Curve | 5 m [Y / magnitude] | 10 m | 15 m | 20 m | 25 m |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 | 0.000 / 0.000 |
| 25 | -2.014 / 2.014 | -1.965 / 1.965 | -1.915 / 1.915 | -1.862 / 1.862 | -1.806 / 1.806 |
| 50 | -13.085 / 13.085 | -12.768 / 12.768 | -12.435 / 12.435 | -12.084 / 12.084 | -11.716 / 11.716 |
| 60 | -21.406 / 21.406 | -20.885 / 20.885 | -20.334 / 20.334 | -19.751 / 19.751 | -19.135 / 19.135 |
| 70 | -32.454 / 32.454 | -31.658 / 31.658 | -30.810 / 30.810 | -29.905 / 29.905 | -28.936 / 28.936 |
| 75 | -39.098 / 39.098 | -38.134 / 38.134 | -37.103 / 37.103 | -35.994 / 35.994 | -34.796 / 34.796 |
| 80 | -46.539 / 46.539 | -45.385 / 45.385 | -44.142 / 44.142 | -42.796 / 42.796 | -41.324 / 41.324 |
| 85 | -54.813 / 54.813 | -53.445 / 53.445 | -51.961 / 51.961 | -50.335 / 50.335 | -48.527 / 48.527 |
| 90 | -63.957 / 63.957 | -62.348 / 62.348 | -60.586 / 60.586 | -58.629 / 58.629 | -56.403 / 56.403 |
| 95 | -74.005 / 74.005 | -72.127 / 72.127 | -70.046 / 70.046 | -67.690 / 67.690 | -64.921 / 64.921 |
| 99 | -82.719 / 82.719 | -80.601 / 80.601 | -78.230 / 78.230 | -75.492 / 75.492 | -72.144 / 72.144 |

### Scenario B — flight and goal-plane measurements

| Curve | Launch m/s | Flight s | Arrival m/s | Max lateral a m/s² | Apex centre m | Goal [X,Y,Z] m |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 30.000 | 1.091 | 20.755 | 0.000 | 2.515 | 105.000, 1.693, 33.435 |
| 25 | 30.000 | 1.094 | 20.745 | 0.349 | 2.515 | 105.000, 1.683, 33.602 |
| 50 | 30.000 | 1.110 | 20.683 | 2.267 | 2.515 | 105.000, 1.619, 34.543 |
| 60 | 30.000 | 1.124 | 20.630 | 3.708 | 2.515 | 105.000, 1.561, 35.286 |
| 70 | 30.000 | 1.146 | 20.551 | 5.622 | 2.515 | 105.000, 1.468, 36.332 |
| 75 | 30.000 | 1.161 | 20.497 | 6.774 | 2.515 | 105.000, 1.400, 37.000 |
| 80 | 30.000 | 1.181 | 20.431 | 8.063 | 2.515 | 105.000, 1.311, 37.792 |
| 85 | 30.000 | 1.206 | 20.351 | 9.497 | 2.515 | 105.000, 1.193, 38.738 |
| 90 | 30.000 | 1.238 | 20.250 | 11.082 | 2.515 | 105.000, 1.030, 39.884 |
| 95 | 30.000 | 1.283 | 20.124 | 12.824 | 2.515 | 105.000, 0.793, 41.310 |
| 99 | 30.000 | 1.332 | 19.999 | 14.334 | 2.515 | 105.000, 0.514, 42.748 |

![Scenario B top-down overlay](evidence/B-top-down.png)

[All eleven ratings](evidence/B-top-down-all-ratings.png). Individual plots: [0](evidence/B-curve-0-trajectory.png) · [25](evidence/B-curve-25-trajectory.png) · [50](evidence/B-curve-50-trajectory.png) · [60](evidence/B-curve-60-trajectory.png) · [70](evidence/B-curve-70-trajectory.png) · [75](evidence/B-curve-75-trajectory.png) · [80](evidence/B-curve-80-trajectory.png) · [85](evidence/B-curve-85-trajectory.png) · [90](evidence/B-curve-90-trajectory.png) · [95](evidence/B-curve-95-trajectory.png) · [99](evidence/B-curve-99-trajectory.png). SVG equivalents are included.

## Courtois outcomes

| Scenario | Mode | Curve | Result | Goal | Save | Catch | Parry | Contact→goal | Miss | Frame |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | fixed | 50 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| A | fixed | 75 | GOAL | YES | — | — | — | — | — | — |
| A | fixed | 90 | MISS | — | — | — | — | — | YES | — |
| A | fixed | 99 | MISS | — | — | — | — | — | YES | — |
| A | targeted | 50 | GOAL | YES | — | — | — | — | — | — |
| A | targeted | 75 | GOAL | YES | — | — | — | — | — | — |
| A | targeted | 90 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| A | targeted | 99 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | fixed | 50 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | fixed | 75 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | fixed | 90 | MISS | — | — | — | — | — | YES | — |
| B | fixed | 99 | MISS | — | — | — | — | — | YES | — |
| B | targeted | 50 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | targeted | 75 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | targeted | 90 | CLEAN CATCH | — | YES | YES | — | — | — | — |
| B | targeted | 99 | CLEAN CATCH | — | YES | YES | — | — | — | — |

These are controlled examples, not estimated save probabilities. 18 keeper cases were run (fixed 0/50/75/90/99 and targeted 50/75/90/99 for two scenarios). No heatmap or broad keeper sweep. Higher Curve does not guarantee a goal: all four targeted Scenario B shots are caught, and targeted A 90/99 are caught. The anchor was selected before these outcomes.

## Targeting audit

| Case | Yaw ° | Elevation ° | Prelaunch target residual m |
| --- | --- | --- | --- |
| A-targeted-50 | 25.686936 | 12.684474 | 0.0000000031 |
| A-targeted-75 | 21.780955 | 12.699964 | 0.0000000100 |
| A-targeted-90 | 18.017744 | 12.729642 | 0.0000000173 |
| A-targeted-99 | 15.145324 | 12.762321 | 0.0000000309 |
| B-targeted-50 | 23.306226 | 14.440854 | 0.0000000133 |
| B-targeted-75 | 18.644999 | 14.473201 | 0.0000000466 |
| B-targeted-90 | 14.136560 | 14.535844 | 0.0000001008 |
| B-targeted-99 | 10.675889 | 14.605598 | 0.0000002019 |

## Verification

17/17 checks passed, plus all 53 underlying physics assertions. Every integer Curve rating 0–99 was checked for monotone physical bend in both scenarios without a keeper. Unchanged ground replay and entire BALL-SHOT-1.2 replay remain bit-exact. 2,102 frozen source files and 3,083 historical output files retain their hashes. Trivela, Laces, Power and Chip resolver outputs are unchanged. All five SP90 anchors are 30/31/34/39/17 m/s. The only authorized physics difference is confined to this separate Finesse Magnus candidate.

Full review replay SHA-256: 9c9df2a792e285303fe6cbf6356095d4863e2c2d48f33debff6e888c554e595d.

Renderers project actual sampled physical positions. Keeper/shooter figures are diagnostic geometry proxies, not final skeletal animations; they do not determine physics. No net capture is simulated. A held ball or completed crossing freezes at its last simulated frame. Primary videos have no trails; slow diagnostics add actual-position trails.

## Remaining calibration questions

1. Does the 75-Curve shot now match the good-but-ordinary reference character, or should its anchor move slightly?
2. Is 99 in Scenario B spectacular enough, or already too extreme for gameplay?
3. After the magnitude envelope is approved, how much sidespin-magnitude and spin-axis error should low Curve introduce?

## Required status

```text
BALL-SHOT-1.2 FOUNDATION PRESERVED: YES
SHOT POWER LEFT FROZEN: YES
COURTOIS FIXTURE USED: GK_CAP.COURTOIS / simulator/data/players.json p001 / Thibaut Courtois
COURTOIS UNCHANGED: YES
CURVE 0 = ZERO INTENTIONAL CONTRIBUTION: YES
CURVE MAPPING IMPLEMENTED: YES
CURVE MAPPING EXPONENT: 2.7
50 CURVE: PASS
75 CURVE REFERENCE MATCH: PARTIAL
90 CURVE: PASS
99 CURVE: PASS
99/75 SPIN-CAPABILITY RATIO: 2.116165
99/75 ACTUAL BEND RATIO: A 2.520923 / B 2.612473 (fixed launch)
CONTINUOUS PHYSICAL MAGNUS: YES
ARTIFICIAL LATE HOOK: NO
90-SP FINESSE REMAINS 30 m/s: YES
DETERMINISM: PASS
READY FOR OWNER VISUAL REVIEW: YES
```

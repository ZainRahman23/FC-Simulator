# BALL-FEEL-1 — Touchline ball calibration candidate

Recommended for owner visual review. This is a standalone laboratory, not a live-match promotion. BALL-PHYS-1 commit `f3e2ff62` and its 22 tracked files, including all evidence, remain byte-identical. No changes were made to the original shared Downloads checkout or the prior BALL-PHYS-1 output package.

Open `review.html` in the delivered package. It contains its own data and JavaScript modules for direct opening without a server. The automated browser only permits HTTP(S), so direct file-URL opening could not be tested; the live lab was verified in Chrome. The source lab can also be served at `sandbox/visual/ballfeel1/`. Start at 1× in Touchline camera, switch candidates at the same playback time, then use diagnostics. The primary camera reproduces the actual `match.js` CAMERA_V1 functions, including their **fixed 1280×720 reference viewport**, runtime zoom 1, height 30 m, pitch 22°, FOV 28° and translated rail. It does not zoom to the trajectory. Camera parity is tested against the actual extracted functions at three viewport sizes. Rendering uses simple pitch/scale figures rather than live match artwork; the projection, world distances and physical ball radius are preserved.

## Recommended global environment

| Parameter | Balanced V1 | Basis |
|---|---:|---|
| Radius / mass | 0.11 m / 0.43 kg | Regulation-compatible dimensions |
| Gravity | 9.81 m/s² | Earth reference |
| Inertia | (2/3)mr² | Thin-shell idealization |
| Rolling deceleration | 0.90 m/s² | Touchline calibration |
| Sliding / impact tangential friction | 0.30 / 0.30 | Touchline calibration |
| Turf restitution | 0.60 | Touchline calibration; 2 m drop rebounds 0.696 m |
| Drag coefficient / air density | 0.25 / 1.20 kg/m³ | Illustrative aerodynamic reference / fixed environment |
| Magnus lift slope / cap | 1.0 / 0.30 | Touchline calibration; physical ω×v direction |
| Air spin decay | 0.12 s⁻¹ | Touchline calibration |
| Supported yaw-spin decay | 1.6 rad/s² | Touchline calibration |
| Rest speed / spin / dwell | 0.015 m/s / 0.12 rad/s / 0.15 s | Numerical settling policy |
| Small-bounce cutoff | 0.20 m/s incoming normal speed | Numerical settling policy |

Three global experiments bracket resistance, bounce and aerodynamics together. Controlled uses rolling resistance 1.20, sliding μ 0.36, restitution 0.50 and Cd 0.28. Lively uses 0.65, 0.24, 0.67 and 0.22. A 3 m/s initially rolling ball stops at 3.62 / 4.80 / 6.60 m respectively; a 6 m/s ball at 13.28 / 17.35 / 23.39 m. Drop rebound is 0.482 / 0.696 / 0.872 m. The same 9.40 m/s launch is replayable under all three environments. Balanced retains a readable tail without the lively surface's long low-speed separation or the controlled surface's stronger braking. This is a provisional visual/game recommendation, not a laboratory fit to a particular pitch.

## The recommended action envelope

All three action candidates use **one balanced global environment**. Candidate powers are 0.15 / 0.50 / 0.85 within continuous endpoints; the names are experiment labels, not player settings. The reference candidates use right foot, full attainable power/Curve skill and ideal execution with no aim error, to isolate the launch envelope. Execution and skill variations are tested separately. `config.js` contains all endpoints. Distances are target planes, not automatic receptions.

| Balanced action | Target m | Horizontal / vertical m/s | Time to plane s | Arrival speed m/s | Apex m | Untouched range m |
|---|---:|---:|---:|---:|---:|---:|
| Short / soft | 5 | 5.17 / 0 | 1.09 | 4.00 | 0 | 13.30 |
| Normal ground | 15 | 9.40 / 0 | 1.87 | 6.75 | 0 | 36.25 |
| Firm ground | 25 | 13.77 / 0 | 2.18 | 9.50 | 0 | 61.83 |
| Driven | 25 | 18.50 / 0.65 | 1.75 | 11.88 | 0.012 | 75.86 |
| Loft | 25 | 16.50 / 9.50 | 1.84 | 13.72 | 4.41 | 53.44 |
| Cross | 25 | 19.00 / 8.50 | 1.58 | 14.92 | 3.42 | 59.70 |
| Chip | 12 | 8.50 / 7.50 | 1.61 | 9.76 | 3.02 | 22.49 |
| Placed / weak shot | 16 | 16.00 / 3.55 | 1.18 | 10.49 | 0.60 | 46.48 |
| Normal shot | 18 | 21.50 / 5.75 | 0.94 | 17.54 | 1.35 | 65.08 |
| Power shot | 20 | 27.50 / 5.70 | 0.83 | 21.45 | 1.24 | 82.22 |
| Curved shot | 22 | 22.50 / 6.90 | 1.15 | 17.34 | 2.12 | 67.33 |

Arrival speed is the magnitude of the full velocity, including descent. Chip therefore arrives at almost 9.8 m/s before its first landing, then leaves that impact at 5.6 m/s. Loft first lands at 26.58 m after 1.98 s; cross at 26.78 m after 1.72 s; chip at 12.28 m after 1.65 s. Their backspin is 12 / 7 / 32 rad/s; the cross additionally has 13.2 rad/s sidespin. Cross's bend at 25 m is 1.36 m toward pitch-left. These differences are physical launch/flight/contact outcomes.

Ground endpoints describe desired **arrival weight**: short 2.5–5.5, normal 4.5–9.0, firm 7–12 m/s. Initial speed follows distance rather than a single family constant. The 15 m normal slow/balanced/fast bracket reaches the plane in 2.29 / 1.87 / 1.57 s. Balanced 10 m is 1.31 s; at 30 m the normal weight takes 3.28 s, so choose firm (2.53 s) or driven (2.19 s) for purposeful longer delivery. Driven has a continuous 14–23 m/s horizontal-speed envelope and an initial rolling-spin fraction of 0.65. Its fast skim lasts about 81 ms in the balanced example; that height is nearly invisible in the match camera. It is mainly distinguished by pace and arrival speed.

Shots span horizontal envelopes 13–19 (placed), 18–25 (normal), 24–31 (power), with separate lift endpoints. Normal balanced total speed is 22.26 m/s; power is 28.09 m/s. The full matrix includes placed, normal, strong, power and maximum-envelope strikes at 12 / 18 / 25 m. A goal-plane time is not a goalkeeper response allowance: windup, anticipation, network latency, launch alignment and keeper motion have not been assessed here. The fast power end is reserved for a committed strong strike, not every shot.

Curved shot candidates use 15 / 39 / 60 rad/s sidespin, alongside their speed bracket. The balanced shot bends 2.64 m at 22 m. Twelve independent speed/spin experiments cover 19 / 23 / 27 m/s and 12 / 30 / 50 / 60 rad/s with common lift. Eighteen further experiments vary normalized Curve skill, technique and foot. High bend can miss the goal; no post-launch targeting or automatic aim compensation is applied.

## Interpretable launch resolver

`resolveLaunch(intent, globalParameters, familyConfiguration)` returns velocity, angular velocity and a complete audit object. Inputs include family, continuous power, horizontal direction, target distance, optional vertical velocity, curve intent, technique, selected/preferred foot, attainable power, normalized Curve skill and already-resolved execution error. No player is allowed to change the global environment. Existing fatigue, pressure, passing/finishing attributes and foot selection remain upstream of physics.

For a rolling pass, let a be rolling deceleration and k = ½ρACd / [m(1 + inertiaFactor)]. Integrating dv/dt = −a − kv² over intended distance D gives:

`v0² = (arrival² + a/k) exp(2kD) − a/k`

The inertia term matters: translational drag causes support friction to exchange energy with rotation. This launch estimate matches measured arrival speeds within 0.015 m/s across the tested uncapped matrix. It does not determine the trajectory after launch. Family caps are reported, so an unreachable requested weight is not silently presented as achieved. Air actions use linear horizontal/vertical/backspin endpoints. Lift is explicit in m/s, rather than an opaque apex solver. Physical Magnus, drag, gravity and collisions determine the apex.

Right-foot inside curve uses positive ωY and bends toward −Z for a +X kick. Left foot or OUTSIDE reverses that sign. This preserves the audited old pitch-left convention. LACES has a smaller technique multiplier. Curve skill modulates attainable sidespin, and execution quality/error can reduce or perturb it. `spinOverride` supports an already-authoritative angular velocity without resampling.

`scheduledLaunch` hands off to the untouched BALL-PHYS-1 action contract: position is an eligibility check, not a teleport; a striking collider can be designated; contested or stale actions cancel; one surface contact episode is suppressed briefly, while defenders remain live. Physics owns everything after the one velocity assignment.

## Legacy audit: preserved behavior and deliberate changes

The engine's `body_decide` (engine.py around 4575) uses effective passing or finishing skill, distance, pressure and seeded action-specific Gaussian errors. The existing execution pipeline includes fatigue effects and preferred-foot selection. These concepts remain authoritative. `fromLegacyDecision` consumes its resolved error once, retains decision/attribute provenance, and chooses the corresponding new family. Receiver lead and selected shot corner must already be included in the supplied target displacement. Despite their RNG-channel names, the old pass errors are added directly to world X/Y by `continuous.py:apply_decision`; the adapter preserves that actual convention. Shot aim error remains a world-Y offset clamped to ±8 m. The adapter does not invent a weak-foot force multiplier.

The audited playtest curve in `match.js` is charge-driven and active for right INSIDE / INSIDE_FINISH. Its curl acceleration uses the left-perpendicular of velocity, with flight/ground decay and an offline target setup lookup. **No player Curve-attribute input is wired into that playtest launch path.** Normalized `curveSkill` and mirrored left/outside directions are explicit V1 resolver extensions, not claims about an existing live integration. The old initial setup-angle lookup is not reused: its numerics were solved for the old integrator. An upstream physical aim-assistance decision may be considered separately after review.

The local `resolveExecution` helper is optional for new standalone intents. Its bounded triangular error channels are independently keyed by integer seed + stable action ID + channel, so adding another action or presentation effect cannot advance its RNG stream. This is a proposed local error sampler, not a replacement for the engine's Gaussian distribution. If the engine already supplied its errors, use `fromLegacyDecision` and do not sample again. Deterministic math is used for all state-affecting trigonometry/exponentials. No visual RNG influences a launch.

Rejected numerical obligations: legacy 13.2 m/s ground launch, old 4.2 m/s² ground deceleration, fixed bounce horizontal-keep factors, old charge speed/lift ratios, old scalar-curve strength/decay and target-setup angles, and legacy stopping/arrival ranges. The 70.2 m versus 20.1 m result remains preserved in BALL-PHYS-1 evidence; neither distance is a target here. Actual old free-flight clips remain available as labeled context, with their original target distances and launches.

## Low-speed foundation for the next experiment

| Initial rolling m/s | 100 ms | 250 ms | 500 ms | 1 s |
|---|---:|---:|---:|---:|
| 0.5 | 0.045 m | 0.096 m | 0.136 m | 0.138 m |
| 1 | 0.095 m | 0.221 m | 0.386 m | 0.546 m |
| 2 | 0.195 m | 0.470 m | 0.883 m | 1.536 m |
| 3 | 0.295 m | 0.719 m | 1.378 m | 2.519 m |
| 4 | 0.395 m | 0.968 m | 1.872 m | 3.494 m |
| 5 | 0.494 m | 1.215 m | 2.363 m | 4.462 m |

Distances are from a stationary launch point, not relative to a moving player. Begin DRIBBLE-1 at **1–3 m/s** (roughly 0.22–0.72 m after 250 ms), and use 4–5 m/s for running touches. Keep 0.5 m/s as a tiny adjustment/rest threshold probe. No dribble controller, ownership tether or target following was implemented. A physical, B resolved and C hybrid touch architectures remain open.

## Evidence and reproducibility

Run from the preserved repository root:

```
node sandbox/visual/ballfeel1/tools/foundation-regression.mjs
node sandbox/visual/ballfeel1/tools/test.mjs
node sandbox/visual/ballfeel1/tools/build-evidence.mjs
```

The first tool reuses all 53 original assertions with only import/default-configuration/report-path changes. It writes BALL-FEEL-1 evidence only. The second adds 24 resolver, camera and integration-boundary checks. All 77 pass. Incidental tackle, block, shin, boot, thigh, torso, head, post and crossbar physics remain successful; no authored ricochet path was added. Full deterministic replay checks 33 execution-bearing launches and 20 original physical scenes, at 240 Hz. Chrome 155 and Node 22.19.0 match all 22,458,391 serialized bytes under SHA-256 `31331d2005b52c7b23ff915ab5377db79dbe14bc4399f89522356774be80d196`.

Measurements include 33 candidate actions, 45 pass rows, 15 shot rows, 12 speed/spin rows, 18 technique rows, six low-speed runs and three global environments. Arrival is interpolated from neighboring 240 Hz samples (one substep resolution around discontinuous contacts). Display snapshots are 60 Hz; videos are 30 fps at 1×. Untouched metrics use an empty infinite turf plane; displayed shots independently run the same launch with physical goal-frame colliders. This separation prevents a post rebound from masquerading as the action's natural stopping range. There is no goalkeeper, net, possession, receiving trap or boundary reset.

CPU is measured in seven batches after warmup: a final logged median of **0.737 ms per 60 Hz tick** with four substeps and 308 actual V2 body colliders, on this machine with the review UI active. Earlier batches measured 0.305 ms; timings vary with machine load. This is roughly 4.4% of a 16.67 ms frame budget, for the ball subsystem. It excludes dynamic character solving, rendering and keeper logic. See raw batch timings in `evidence/measurements.json`; this is not a full-match performance claim.

## Research basis and limits

- [IFAB Law 2](https://www.theifab.com/laws/2025-26/the-ball/): regulation mass/circumference context for the chosen ball dimensions. We do not model pressure or shell deformation.
- [Sakamoto, Numazu, Hong & Asai (2016), Kinetic Analysis of Instep and Side-foot Kick](https://www.sciencedirect.com/science/article/pii/S1877705816306634): six female and six male participants performed maximal kicks; reported instep means were 22.5 and 27.9 m/s. The small maximum-effort study is context for a broad envelope, not a representative distribution of all match shots.
- [Penn State Center for Sports Surface Research (2012), Soccer Ball Roll Testing](https://plantscience.psu.edu/research/centers/ssrc/documents/soccer-ball-roll-report.pdf/@@download/file/soccer-ball-roll-report.pdf): ramp tests on two synthetic fields gave different average roll lengths, around 6.1–6.2 and 10.5 m. This supports bracketing surface behavior. Our straight rolling probes do not reproduce that ramp procedure or claim FIFA certification.
- [NASA, Drag on a Soccer Ball](https://www.grc.nasa.gov/www/k-12/airplane/socdrag.html): quadratic drag structure and an illustrative Cd 0.25. Real drag is speed-, seam- and flow-dependent.
- [Asai et al. (2007), Fundamental aerodynamics of the soccer ball](https://people.stfx.ca/smackenz/Courses/HK474/Labs/Jump%20Float%20Lab/Asai%202007%20Fundamental%20aerodynamics%20of%20the%20soccer%20ball.pdf): spin ratio and Reynolds-number dependence inform the model structure and a plausible several-revolutions-per-second curve bracket. The lab's Magnus slope/cap are game-calibrated, not fitted to this dataset.

## Three remaining defects / limits before convergence

1. Firm/driven actions retain long runout and hot arrival speeds. The driven skim is almost visually flat. The lab shows this honestly; receiver traps, moving-player control and turnover costs must establish whether the top weights are too punishing.
2. Aerodynamics and turf remain simplified: constant drag, capped linear spin-ratio lift, one flat homogeneous surface and constant restitution/friction. High-spin yaw can remain after translation stops. Seams/knuckle flight, variable restitution, wind and uneven/wet grass are outside this V1 calibration.
3. Contact fixtures prescribe player motion. Real TURN-1 foot alignment, reciprocal body response, kick contact timing and keeper readability are not yet validated with the action envelopes. This prevents match promotion even though the standalone contact regressions pass.

Once the owner chooses the feel candidates and TURN-1 is available, replay its actual timed boot/shin collider frames through the existing adapter. Align deliberate contact poses/ticks, verify no-double-impulse and contested cancellations, then compare physical / resolved / hybrid 1–3 m/s touches under identical conditions. Approve action ranges and reception/keeper interactions before any live-match replacement.

# BALL-FEEL-1.2 — two final choices

Status: isolated proposal for owner visual selection. **No match integration.**

The foundation is commit `e8da0c379e3b139c98562dfa76259bf9420336b3`. All 182 tracked files from BALL-PHYS-1, BALL-FEEL-1 and BALL-FEEL-1.1 are byte-identical to their preserved commits. Work is confined to `sandbox/visual/ballfeel12` on `prototype/ball-feel-1-2`. The original dirty Downloads checkout is untouched.

## Open the review

Use `review.html` in the deliverable, or the running local lab at `http://127.0.0.1:8769/sandbox/visual/ballfeel12/`. The lab has exactly two primary sections: driven pass and curve. Each row shares one playback clock, defaults to 1×, and uses the frozen Touchline camera. Full view, pause, scrub, optional trail and 0.25× diagnostic controls are available. Select a driven row's rotation view to inspect the actual integrated quaternion with asymmetric body-fixed markers.

The package contains 63 decoded MP4s: 16 candidate clips (including five toward-camera mirrors), three simultaneous comparison reels, twelve rotation diagnostics (1× and 0.25×), eight approved-action regressions, eight contact/drop regressions and sixteen exaggerated-curve interceptions. Candidate clips are 60 fps; comparison/regression clips are 30 fps. Physics snapshots remain 240 Hz. Standalone SVG/PNG plots and complete CSV traces are in `evidence`.

Live HTTP review was tested in Chrome. Browser file-URL navigation was unavailable under the tool's access policy, so the self-contained offline file was validated by its embedded module graph, JavaScript syntax, JSON and local links; it was not browser-opened. No external scripts, fonts or services are required.

## Recommended first watches

**Driven: SHORTER SKID B**, then AGGRESSIVE CONTROL and SHORTER SKID A. Keep CONTROL visible for comparison.

| Candidate | Horizontal launch | Mode skid distance / time | Stable roll time / speed | 25 m time / speed | Untouched range |
|---|---:|---:|---:|---:|---:|
| CONTROL | 30 m/s | 12.86 m / 0.504 s | 0.575 s / 22.72 m/s | 1.047 s / 20.17 m/s | 78.46 m |
| SHORTER SKID A | 30 m/s | 1.34 m / 0.050 s | 0.121 s / 25.02 m/s | 1.097 s / 19.58 m/s | 76.03 m |
| SHORTER SKID B | 33 m/s | 6.88 m / 0.275 s | 0.404 s / 20.01 m/s | 1.176 s / 16.56 m/s | 63.57 m |
| ROLL-EARLY | 30 m/s | 0.70 m / 0.025 s | 0.071 s / 27.07 m/s | 1.029 s / 21.19 m/s | 82.64 m |
| AGGRESSIVE CONTROL | 32 m/s | 7.32 m / 0.304 s | 0.429 s / 19.37 m/s | 1.216 s / 15.98 m/s | 61.21 m |
| OVERCORRECTED | 26 m/s | 7.16 m / 0.342 s | 0.433 s / 18.11 m/s | 1.400 s / 14.23 m/s | 54.19 m |

B's first 10 m takes **0.358 s versus 0.368 s** for CONTROL. Mode-skid distance falls 46.5%; stable rolling begins 29.7% sooner; total range falls 19.0%. It remains faster than the approved firm pass at 25 m (firm: 1.523 s / 13.50 m/s). The cost is a 12.3% later 25 m arrival and 17.9% lower arrival speed than the driven control. “Early pace preserved” means the first 10 m, not identical speed at the receiver.

**Curve: FC-LIKE A, FC-LIKE B, EXTREME GAME, ABSURD.** B is the provisional late-hook choice; A is the more useful middle-bend alternative. Owner gameplay-camera judgment decides.

| Curve | Spin at launch | Bend at 10 / 15 / 20 / 22 m | 22 m time | Strongest first-flight curvature |
|---|---:|---:|---:|---:|
| CURRENT SPECTACULAR | 110 rad/s | 1.51 / 3.56 / 6.76 / 8.49 m | 1.270 s | 0.0341 /m at 22.50 m |
| FC-LIKE A | 80 rad/s | 1.49 / 4.32 / 8.86 / 11.08 m | 1.376 s | 0.0555 /m at 10.12 m |
| FC-LIKE B | 80 rad/s | 0.37 / 1.77 / 6.50 / 11.63 m | 1.536 s | 0.0879 /m at 16.58 m |
| EXTREME GAME | 80 rad/s | 1.13 / 4.85 / 13.23 / 18.70 m | 1.885 s | 0.0859 /m at 10.75 m |
| ABSURD | 80 rad/s | 1.52 / 5.99 / 17.16 / 28.41 m | 2.876 s | 0.0882 /m at 10.52 m |

All five use **[22.5, 6.9, 0] m/s**, total 23.53 m/s, with the same drag, gravity and restitution. No shot was slowed to create bend. New styles reach 22 m **after the first bounce**; the control reaches it before. First-landing lateral displacement is 8.99 / 10.47 / 8.92 / 12.01 / 12.99 m respectively. B's first-flight total deviation is close to CONTROL, but its changing direction is concentrated much later. The large 22 m values must not be described as entirely airborne curve.

## Driven diagnosis

1. CONTROL starts with `vX=30`, `vY=.65`, `omegaZ=-177.2727`. Its contact surface speed is 19.5 m/s: a 10.5 m/s (35%) rolling mismatch. Its maximum clearance is only 3.9 mm, yet four small bounces interrupt contact.
2. The base solver's `SLIDING` mode counts 0.504 s / 12.86 m. Including actual physical mismatch during sub-centimetre airborne intervals gives **0.571 s / 14.81 m**. B improves that broader metric to **0.400 s / 10.87 m**. Both are reported; mode-only duration is not the whole story.
3. Air drag decelerates translation. High rolling spin then requires contact traction to keep translation and rotation consistent. With the shared 0.30 friction cap, fast near-rolling launches can leave rolling again. More topspin does not solve that model interaction.
4. Rolling resistance applies when residual slip is essentially zero (`<1e-7`), while the display mode labels rolling below 1% normalized slip. Those are different thresholds. Neither threshold was changed or used to force a visual transition.
5. Launch-only sweeps came first. At 30 m/s, forward fractions 0.8, 0.9 and 1.0 produced about 89.25, 97.87 and 105.60 m of runout under the old contact law. More stored angular energy can worsen range. Zero spin shortens range but greatly extends the skid.
6. Stronger high-speed grip is therefore a global physical-state correction in the candidates, followed by a launch-state compromise. It is not a driven-family flag inside the world.

Remaining rolling distance after CONTROL's stable transition is 63.55 m; B's is 52.62 m. Once two balls roll at the same speed on the same frozen progressive turf, their remaining runouts cannot differ. Preserving identical 25 m speed while removing a further 15–25 m of range would require another change. This mission explicitly exposes that tradeoff.

A separate rejected boundary sweep covers 35–45 m. Examples: 20 m/s / 0.65 fraction stops at 44.70 m but needs 0.571 s to 10 m and 1.675 s to 25 m; 18 m/s / 0.40 stops at 35.40 m but needs 0.632 s and 1.999 s. Those launches lose the drilled character. The six primary candidates therefore prioritize the useful 54–83 m bracket.

## Contact model

Progressive rolling resistance is preserved exactly:

`a(v) = [1.2 + 3.8 / (1 + (v/8)^2)] × v/(v+0.6)`.

Let `smooth(a,b,x)` be clamped cubic smoothstep and `u` be the normalized physical contact slip. Proposed high-speed grip is:

`mu = 0.30 + 3 smooth(20.5,26,|v|) + 3 smooth(17.5,22,|v|) [1-smooth(.15,.40,u)]`.

The existing impulse solver still takes the **minimum** of the slip-cancelling impulse and the Coulomb cap `mu m g dt`. The near-rolling term supplies traction against air drag; it does not snap velocity, spin or orientation. The coefficients are deliberately game-calibrated, not a claim about measured grass friction. Original turf-impact friction, restitution, ordinary low-speed sliding and yaw decay are unchanged. There is no range clamp or time-triggered brake.

All new candidates except CONTROL use that same grip. B shifts driven horizontal endpoints by +3 m/s (center 33) and changes the rolling fraction from .65 to .20. AGGRESSIVE uses +2 m/s. Ordinary family resolver output delegates byte-for-byte to 1.1.

**Preservation boundary:** 45 ordinary-action trials cover short/ground/firm at 5, 15 and 30 m across powers .15/.5/1, and placed/normal/power/loft/cross/chip at their approved distances. Every complete state/event stream is identical to 1.1. All six candidate environments reproduce the normal-pass center exactly. The same is true for nineteen original physical fixtures, excluding the intentionally changed driven fixture.

Outside that tested approved range, maximum-power firm passes at 45/60 m and normal passes at 60 m change because the stronger grip prevents high-speed traction loss. Maximum position differences over twelve seconds are 9.17 / 18.53 / 4.77 m. Normal 45 m remains exact. This is a documented limitation of the proposal, not a claim of universal family preservation. It must be considered before eventual integration; no broad resolver recalibration was made to conceal it.

## Curve shape and physical model

The old control remains unchanged. For expressive candidates, a smooth physical-yaw-spin activation rises from 0 at 45 rad/s to 1 at 85 rad/s. Below 45 rad/s the original `air()` code path is called exactly. The side force still points along `omega × velocity`; Rodrigues integration rotates velocity without adding kinetic energy.

For speed `v`, the response rises from `early` to `gain` as speed falls through a band:

`response = early + (gain-early) [1-smooth(lowSpeed,highSpeed,v)]`.

A second speed band fades it toward a 0.15 tail. The spin activation blends this with the original Magnus response, the extra gain saturates above 80 rad/s, and the lift coefficient has a bounded cap (base 1.2 blended toward 3). The implementation records every coefficient in `config.js` and every candidate definition in the evidence.

- A: early 1, gain 4.5, 17–23 m/s rise, 16.5–20.5 m/s fade.
- B: early .2, gain 7, 16–21.5 m/s rise, 15.5–18.5 m/s fade.
- EXTREME: early .2, gain 8, A's bands.
- ABSURD: early .6, gain 8, A's bands.

Low-speed yaw drag (maximum extra 12/s, smoothly activated below 17 m/s and full below 13 m/s) dissipates residual high sidespin. It operates from physical speed/spin, not a bounce event, target, action name or elapsed flight time. Restitution remains 0.60. Reversing unwindowed and excessive late-gain probes are recorded as rejected experiments. Every offered center remains forward through rest.

**B has the strongest late hook.** Its average first-flight curvature after 17 m is 0.0773 /m versus 0.0333 for CONTROL, 0.0198 for A and 0.0255 for EXTREME. B's maximum lateral acceleration is 28.47 m/s² around 15.83 m; its maximum curvature occurs around 16.58 m. These are distinct metrics. A/EXTREME/ABSURD peak around 10–11 m and should be described as middle hooks, not late-force peaks.

**ABSURD is too extreme:** it lands after only 18.59 m forward, then reaches the 22 m plane 28.41 m sideways after 2.876 s. It never reaches 25 m forward. It remains physical and non-reversing, but is an intentionally rejectable style.

**Stronger, shaped Magnus worked better than more spin.** Eighty rad/s produces a sharper hook than the old 110 rad/s control while low-speed rotational drag controls the aftermath. This is a provisional style judgment from the unchanged camera and diagnostic shape, not a substitute for owner 1× review.

Camera perspective matters: the old 8.49 m deviation at 22 m is only about 51.54 screen pixels relative to a straight ball at the same height in a 1280×720 view; ABSURD is about 144 px. CSS scaling compresses that further. When the ball bends away, the projected lateral motion also partly cancels the motion from falling, visually flattening the late hook. The review therefore offers both away and toward camera directions, produced by reversing physical yaw spin and resimulating; mirrored positions agree exactly. The default retains the original away-camera control. The camera basis, focal length and physical 11 cm radius are unchanged; no zoom or oversized ball manufactures the result.

## Distance and attributes

Equivalent launch trials measure planes at 18, 22, 25 and 30 m. The new late-hook B never reaches 25 m forward at its center launch (max 24.72 m). EXTREME never reaches 30 m; ABSURD never reaches 25 m. These cells are null/“Not reached”, not extrapolated.

Faster 27 and 30 m/s horizontal trials retain 6.9 m/s lift. B bends only 3.64 and 2.34 m respectively at the 30 m plane. The speed-window model develops later in fast shots; it is not a distance-invariant universal curve style. A is broader and less sensitive. No target-distance input is supplied to physics to conceal this limitation.

The original continuous skill-squared and execution-squared launch mapping remains, including technique factors and selected-foot sign. Generated expressive yaw spin is capped continuously at ±80 rad/s, so elite inside and outside techniques share a safe high-end ceiling. Outside still reverses direction and increases attainable spin below the ceiling. LACES_POWER uses its small original factor; normal power remains straight. Explicit diagnostic spin overrides remain explicit and can exceed the offered safe envelope.

101 power levels for elite inside/outside (202 trials) stay forward through rest under proposed B. Sixteen interceptions cover all four expressive centers against defender, goalkeeper proxy, post and crossbar fixtures. Every contact produces a real impulse. Restarting from the post-contact physical state reproduces the future exactly: there is no path controller to resume.

## Validation and reproducibility

- 53/53 original foundation assertions pass under the proposed environment: energy, rest, CCD at up to 100 m/s, moving boots, insertion ordering, no double impulse, no teleport, tackle-loose-ball and incidental contact.
- 27/27 focused assertions pass: controls, byte parity, pace/runout tradeoff, bounded curve envelope, contact interruption, force continuity, energy, camera identity and convergence.
- Fifty-five unrounded replay streams match between Node 22.19.0 and Chrome 155: SHA-256 `38e0dad324f7c62c63fd2bf5190b467fc395ea86963f69dc86cf36dc456fb11c`, 34,455,570 UTF-8 bytes. Metadata now identifies the selected 1.2 proposals.
- Isolated one-ball benchmark with 22 × 14 V2 colliders: median 0.387 ms per 60 Hz tick, worst batch mean 0.440 ms. Free expressive flight: 0.0063 ms; driven skid: 0.0091 ms. This excludes animation/rendering and is not a live-match performance claim.
- Every MP4 is decoded and checked against its declared dimensions/frame count. The review's authoritative timestamps come from the simulation; dropped browser render frames do not alter physics.

Inside the checkout:

```sh
node sandbox/visual/ballfeel12/tools/build-evidence.mjs
node sandbox/visual/ballfeel12/tools/foundation-regression.mjs
node sandbox/visual/ballfeel12/tools/test.mjs
```

After rebuilding evidence, use the review's “Verify browser replay” button and save its report before running the cross-runtime assertion. Video tools accept `BALL_FFMPEG` and `BALL_SHARP`; physics/tests need only Node. In the exported source, the foundation/focused tests can run using the bundled evidence. Rebuilding the preservation manifest itself requires the original Git history.

## Three limitations worth accepting for initial V1

1. A shorter driven runout still costs speed later in the pass. B is a first-10 m compromise, not identical 25 m delivery. Its 63.57 m untouched range remains long.
2. Exaggerated curve depends strongly on launch speed, and the largest 22 m deviations include bounces. B is a sharp late-hook style around this center, not a solved 18–30 m curve mapping.
3. Stronger global grip changes maximum-power long ground passes outside the verified 5–30 m range. Keep this isolated until the owner selects the model and initial integration explicitly bounds that envelope.

Stop here for one driven choice and one curve choice. Do not broadly recalibrate or integrate automatically.

# BALL-FEEL-1.3 — Physical turf skips

Experimental owner-review package based on **db526cc4**. No match or receiving integration. No curve selection or tuning. All 365 tracked BALL-PHYS-1 / BALL-FEEL-1 / 1.1 / 1.2 files were compared byte-for-byte with the foundation commit and preserved. The original Downloads checkout was not edited.

Open `review.html` from the extracted package, or use the live HTTP review. Start with the three primary sections at **1× Touchline camera**. Firm and soft passes are under Normal; the spin study and incidental regressions are supporting disclosures. All rows share playback time. Full Touchline view replays at 1×. Close slow motion is 0.25×; vertical exaggeration appears only in the explicitly labelled trajectory plots.

## What changed

Only opt-in deliberate launch proposals were added. `world.js` re-exports the exact 1.2 class. Gravity, Magnus, all curve laws, restitution (0.60), friction impulses, sliding grip, progressive resistance, contact ordering, CCD, rest and quaternion integration are unchanged. There is no roughness model, no random draw, no vertical animation, and no hidden per-bounce brake. Unselected actions resolve exactly as before.

The first experiment tested positive vertical launch velocity with the existing surface. It already produced small diminishing hops. `evidence/launch-sweeps.json` records 270 launch-only trials: 126 initial lift/spin trials, 96 small driven pace/spin trials and 48 normal/firm refinements. A micro-turf model was therefore unnecessary for this bracket. This is a smooth deterministic skip sequence, not irregular grass chatter throughout the pass.

The raised ground-pass proposal explicitly supplies forward angular velocity. Simply setting lift on the old ground-family resolver would otherwise select its zero-spin default. Normal/firm horizontal launch velocity is preserved exactly. Explicit caller spin overrides remain authoritative. Selected execution lift is applied once; direction and accuracy remain owned by the existing resolver. The review selector never reaches the physical world.

## Provisional owner viewing order

- **Normal:** MICRO-SKIP (2.52 cm), VISIBLE MICRO-SKIP (6.63 cm), TOO BOUNCY (42.12 cm). Keep NEAR ROLL CONTROL alongside them. MICRO-SKIP is the provisional subtle choice; VISIBLE MICRO-SKIP is the stronger camera comparison; the gameplay visibility gate remains partial.
- **Firm:** FIRM SUBTLE (2.17 cm), FIRM FOOTBALL SKIP (5.13 cm), FIRM GAME SKIP (9.25 cm). FOOTBALL SKIP is the middle starting point.
- **Driven:** SUBTLE SKIP / RUNOUT OPTION (2.55 cm), MEDIUM SKIP (5.58 cm), STRONG FOOTBALL SKIP (10.66 cm). Also inspect EXAGGERATED (19.89 cm) and TOO BOUNCY (48.60 cm) to set the ceiling.
- **Low shot:** TURF SKIM (5.50 cm) is the provisional choice; STRONG SKIP reaches 15.28 cm. Both retain the approved 34.5 m/s shot horizontal launch and −12 rad/s topspin.

Best overall turf character to inspect: **MICRO-SKIP normal → FIRM FOOTBALL SKIP → STRONG FOOTBALL SKIP driven → TURF SKIM low shot**. This is a review recommendation, not a frozen final preset. The strong driven option wins texture, not runout. The owner must choose all four characters before integration.

## Driven tradeoffs

| Measurement | Exact SHORTER SKID B | SUBTLE / runout | MEDIUM | STRONG |
|---|---:|---:|---:|---:|
| Horizontal launch m/s | 33 | 32 | 33 | 33 |
| Vertical launch m/s | 0.65 | 1.00 | 1.60 | 2.20 |
| Forward rolling-spin fraction | 0.20 | 0.15 | 0.20 | 0.20 |
| First peak clearance cm | 0.85 | 2.55 | 5.58 | 10.66 |
| Meaningful airborne intervals | 3 | 4 | 5 | 4 |
| Time to 10 m, s | 0.358 | 0.348 | 0.331 | 0.329 |
| Time to 15 m, s | 0.612 | 0.580 | 0.537 | 0.523 |
| Time to 25 m, s | 1.176 | 1.159 | 1.086 | 1.041 |
| Horizontal speed at 25 m, m/s | 16.56 | 15.88 | 16.77 | 17.03 |
| Supported sliding distance m | 6.88 | 12.23 | 7.40 | 9.23 |
| Supported sliding time s | 0.275 | 0.579 | 0.338 | 0.446 |
| Stable roll time s | 0.404 | 0.817 | 0.700 | 0.904 |
| Distance after stable roll m | 52.62 | 41.46 | 46.18 | 42.84 |
| Untouched runout m | 63.57 | 60.79 | 64.40 | 65.47 |
| Total energy lost at turf impacts J | 6.50 | 10.26 | 17.44 | 20.56 |

The subtle option reduces total range by **2.78 m / 4.4%** with a 3.0% horizontal launch reduction, while all 10/15/25 m arrivals become faster. It has more supported sliding than the control. Stronger skips have faster early travel and less distance after stable rolling, but more distance before rolling; their total range increases. Do not attribute the subtle option's range reduction to bounces alone: lift, forward spin and horizontal launch all differ. The launch sweeps isolate those variables.

The strong candidate's meaningful hop peaks are **10.66 → 3.28 → 1.34 → 0.41 cm**. Its first contact occurs at 0.203 s / 6.41 m: horizontal **30.29 → 29.31 m/s**, vertical **−2.04 → +1.22 m/s**. All subsequent contacts, including submillimetre contacts, are retained in `all-hop-contacts.csv` and the review tables. The net horizontal loss over all strong-candidate impacts is 2.27 m/s. The existing Coulomb impulse supplies the loss; no separate brake was inserted.

## Normal, firm and receiver implications

Normal MICRO-SKIP retains the approved 13.0086 m/s launch, reaches 15 m in **1.400 s** versus 1.414 s, and settles into stable rolling at **0.263 s / 3.30 m**. It is already rolling at every 5/10/15/20 m plane. MICRO-SKIP stops just short of 25 m, correctly marked **NOT REACHED**. VISIBLE MICRO-SKIP peaks at 6.63 cm, reaches 15 m in 1.370 s, and reaches 25 m rolling at 2.14 m/s. Both retain the original horizontal launch speed.

FIRM FOOTBALL SKIP retains 19.6575 m/s horizontal launch. Its 25 m time is **1.538 s**, versus 1.523 s (0.96% slower); range is 50.72 m versus 51.35 m. At 5 m it has 1.07 mm clearance, then is rolling by 10 m. The full table has precise vertical velocity and horizontal speed for every candidate at 5/10/15/20/25 m.

DRIVEN STRONG has 7.39 cm clearance and −1.11 m/s vertical velocity at 5 m, 0.96 cm / +0.47 m/s at 10 m, and is supported at 15/20/25 m. LOW SHOT TURF SKIM has 3.66 cm clearance at 5 m, 0.53 cm at 10 m, and slides on the turf at 15/20/25 m. No receiver logic was added.

Spin is physically consequential. At the same 33 m/s horizontal and 1.6 m/s vertical launch, topspin/no-spin/backspin peak at **5.58 / 12.15 / 129.21 cm** and run **64.40 / 65.57 / 78.01 m**. The backspin case is a diagnostic rejection for a grounded pass. At some later normal/firm impacts, forward spin increases horizontal speed slightly even while total kinetic energy falls. The tables retain those negative horizontal-loss values instead of concealing them.

## Visual and numerical limits

1. **Camera readability:** at 1280×720, MICRO-SKIP normal departs from its rolling screen position by only about 0.41 pixel, VISIBLE MICRO-SKIP by 1.08 pixels, FIRM FOOTBALL SKIP by 0.84 pixel and DRIVEN STRONG by 1.74 pixels. Ordinary shadows are projected from the real ground position and were left unchanged. Subtle contact texture needs owner review in motion; the close view cannot substitute for that gate.
2. **Runout versus sliding:** stronger skips avoid ground friction and increase total range; the only shorter-range driven candidate here is modest and slides longer. This mission does not resolve all excessive late travel or puck-like sliding.
3. **Tiny-hop precision:** the fixed 240 Hz solver's last millimetre-scale contacts depend on timestep and the existing low-speed bounce cutoff. At 480 Hz the selected probes differ by at most 2.24 mm in peak, 0.264 m in range and 8.83 ms at 25 m; meaningful hop counts can differ by one. Fixed-configuration replay remains bit-exact.

## Measurement and verification

- Ball-bottom clearance = authoritative centre Y minus the 0.11 m radius.
- Maxima/hop peaks use 240 Hz samples, not an analytic apex estimate. Exact CCD impact timestamps divide intervals; each interval records duration and distance since the prior contact (first interval starts at launch).
- Meaningful airborne interval = peak ≥1 mm and duration ≥12.5 ms. Every smaller impact remains in the evidence.
- Read-only instrumentation captures exact pre/post velocity, angular velocity, impulse and energy around the existing solver. It has exact snapshot/event parity with the uninstrumented class for all 18 candidates.
- Plane values interpolate between 240 Hz samples; any interval spanning an impact is flagged. Stable rolling begins only after the last airborne or sliding sample.
- **53/53 foundation regressions**, **26/26 focused checks**. Tackle, block, boot/shin, post/bar, drops, rest and swept CCD pass.
- Chrome 155 and Node 22.19.0: **38 full unrounded state/event streams**, 20,000,189 UTF-8 bytes, SHA-256 `07fe27223ab4a43d939ca28a6ae62bfeacf69d8742bf5a72b1962945e2034e60`.
- Isolated CPU benchmark with 308 V2 colliders: median **0.325 ms per 60 Hz tick**, worst batch mean 0.328 ms. This is a sandbox benchmark, not full-match frame time.
- Offline HTML embeds its module graph and review data. Syntax, dependencies, links and data are validated. The live HTTP page is browser-verified; the offline file itself was not opened in the browser because file-URL navigation was unavailable in this session.

## Reproduce

In the source checkout, run `npm test` inside `sandbox/visual/ballfeel13`. `node tools/build-evidence.mjs` rebuilds measurements and preservation checks (requires the original Git history); `node tools/sweep.mjs` rebuilds the launch-only sweep. The packaged `source/ballfeel13` also contains runnable tests and necessary imported source modules. Video generation uses Sharp and ffmpeg, with `BALL_SHARP` / `BALL_FFMPEG` paths configurable. Video validation decodes every MP4 and checks dimensions/frame counts.

No final curve or ground-ball preset was selected. Stop here for owner visual choice; receiving and match integration remain outside this mission.

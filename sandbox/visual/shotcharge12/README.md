# SHOT-CHARGE-1.2 — live input and overcharge

Owner review candidate; no winner or further calibration selected.

- Foundation: b71910b8e7f0d3603d702b41d442750682c8ef0a.
- Default: 80 SP; real Space or pointer hold, exact duration forwarded.
- Approved 80–600 response: untouched, 0.32 m tap / 3.0 m useful maximum.
- Overcharge apex after 600 ms: 3 + 7 × (1 − exp(−((h − 600) / 300)^2)) m.
- Same physical pre-contact solver, fixed total speed, original BALL-PHYS.
- Long holds smoothly approach a shared reachable 10 m apex; raw hold is not capped.
- At the frozen 19 m setup, the approved 600 ms profile already clears the bar.
- Exact camera/projection retained; fixed extended viewport contains high shanks.
- Live front end imports the same experiment module as tests in a module worker.
- All results are reference-plane geometry; no keeper, posts or net colliders.

Build in order: tools/build-evidence.mjs, tools/test.mjs, tools/videos.mjs, tools/build-review.mjs. Stage with tools/package.mjs --preview, verify live UI, then tools/package.mjs. Serve the output directory locally.

UI evidence distinguishes native timed Space/pointer checks from timed synthetic DOM-event checks. No test controls appear without ?test=1. The package contains exact transitive runtime source copies, measurements and physical video exports. Original sources and historical outputs are hash-verified separately.

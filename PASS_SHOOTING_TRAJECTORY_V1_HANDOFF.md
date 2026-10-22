# PASS / SHOOTING TRAJECTORY V1

Published 2026-10-22. This milestone preserves ball trajectory and ball behaviour only. No trajectory, physics constant, rating equation, receiving rule or animation was retuned during publication.

## Identity

- Shared repository: https://github.com/ZainRahman23/TouchlineSimulator
- Branch: `milestone/pass-shooting-trajectory-v1`
- Release tag: `PASS-SHOOTING-TRAJECTORY-V1`
- Exact source/evidence snapshot commit: `e16135ada760b1e7648ed1746fe87b1e65262510`
- The publication commit adds this handoff only. Resolve its exact hash with `git rev-parse 'PASS-SHOOTING-TRAJECTORY-V1^{commit}'` after fetching the tag. The source snapshot above is its parent.
- Shooting ancestry: `7653bcb00513858117764caf00c86ea7e4c14a1e` (`prototype/shot-charge-1-3-faster-input`).
- Passing provenance: local owner-approved freeze `90adbc99dfd6e4057920c639dc1a1692b30e85b7`, `PASSING-V1-approved-2026-10-19`. Its exact files and manifest are preserved here; that historical local Git repository is not required to use this release.

The publication branch is based on shared `main` commit `a0cd26da587c4ed1bca61a6f6eb261d4509a2ba9`. It imports only the preserved source/evidence snapshot and this handoff, not the 670 unpublished commits of unrelated local project history. The original local histories remain intact. Canonical review/test support files are also hashed under `canonicalArchive` in the manifest.

## Authority boundary

**BALL TRAJECTORY IS AUTHORITATIVE.**

**Future shooting/pass animations must visually synchronize to this trajectory system.**

**Animation/body mechanics must NOT replace or derive the authoritative gameplay trajectory from procedural foot force.**

Resolve launch position, velocity and spin before contact; schedule the physical launch once. The preserved ball world then owns flight, curve, drag, bounce, skid, rolling and rest. Animation must match that contact event and subsequent physical trajectory. Do not add post-launch target attraction, steering, foot-force reconstruction or a separate animation-owned ball path.

## Authoritative source paths

All paths are repository-relative. The exact file-by-file SHA-256 inventory and recursive import closure are in `trajectory_v1/SOURCE_MANIFEST.json`. There are 865 byte-identical transported files; the dependency closure includes 170 files. Some dependencies are fixtures, not gameplay/animation authority.

| Subsystem | Entry points and configuration |
|---|---|
| Shot families / frozen BALL-SHOT-1.2 speed ceilings | `sandbox/visual/ballshot12/resolver.js`, `config.js`; inherited `ballshot11/` and `ballshot1/` resolvers/configs |
| Approved Laces charge / elevation | `sandbox/visual/shotcharge13/resolver.js`, `config.js`; inherited `shotcharge11/resolver.js` vertical solve and `shotcharge1/resolver.js` capability mapping |
| CURVE-1.1 targeted Finesse | `sandbox/visual/curve11/resolver.js`, `config.js`, `experiments.js` (`solveTarget`, `launch`); inherited geometry/trace in `curve1simple/experiments.js` |
| Latest physical shooting playtest | `trajectory_v1/playtest/core.mjs`; exact frozen imports under `trajectory_v1/playtest/foundation/frozen/`; geometry/RNG/locked model in `trajectory_v1/playtest/foundation/` |
| Current passing dispatch | `trajectory_v1/passing/pass-router.mjs`, `flight-router.mjs` |
| Short Pass | `trajectory_v1/passing/short-pass.mjs`, `resolver.mjs`, `config.mjs` |
| Through Ball / Cross | `trajectory_v1/passing/space-pass.mjs`, `through-execution.mjs`, `cross-execution.mjs`, `cross-shift.mjs`, `range-capability.mjs` |
| Existing execution inputs preserved | `trajectory_v1/passing/passing-attributes.mjs`, `space-accuracy.mjs`, `through-accuracy.mjs`, `rng.mjs`, `target-assistance.mjs` |
| Shared ball physics | `sandbox/visual/ballphys1/ball.js`, `geometry.js`, `math.js`; `sandbox/visual/physchar2/core/v2_math.js`; `sandbox/visual/ballfeel11/world.js`, `ballfeel12/world.js`, `ballfeel14/world.js` and their configs plus `ballfeel1/config.js` |
| Clean continuous-Magnus variant | `sandbox/visual/curve1/world.js`; passing adapter `trajectory_v1/passing/cross-physics.mjs` |
| Passing ground-flight adapter and frozen copies | `trajectory_v1/passing/physics.mjs`, `trajectory_v1/passing/frozen/sandbox/visual/`; retain these actual imported copies |

Important selection details:

- CURVE-1.1 is **56 × (Curve / 75)^2.7**, exact zero at Curve 0. Use `curve11`, not the historical 40-rad/s `curve1` resolver alone. SP80 Finesse remains **27.15099715099715 m/s**. The targeted Finesse review and continuous-Magnus world are separate from Laces charge; this milestone does not invent a unified all-shot API.
- Laces preserves the 0–40 ms weak floor, 450 ms velocity ceiling and earlier-red elevation rise from 310 ms. The earlier 600 ms / 3 m maximum is superseded; do not restore it from old folders.
- Current passing review uses `accuracyModel: 'variation'` and Cross `crossCurveModel: 'newest'`. Set these explicitly when reproducing that review; lower-level legacy defaults/comparison options are also retained. Preserve dominant-foot mirroring, existing pre-contact curved-target solve, range capability and charge behaviour.
- The continuous-Magnus world is used for Finesse and Cross; ground passes/Laces retain their actual inherited ground/turf world. Do not consolidate these different imports as a cleanup during animation work.
- Existing ratings and shooting accuracy options are compatibility inputs. This milestone adds no ratings and does not approve the optional `accuracyCurve: 'new'` experiment. The shooting playtest defaults to the existing `current` curve.

## Preserved integration support, deliberately not V1 animation authority

`trajectory_v1/through-target-1-2/core.mjs` preserves the latest user-endpoint → frozen pass preparation (`endpoint`, `prepareScenario`) and the complete integration demonstration. `navigation.mjs`, runner selection/chase/abandonment, and `foundation/sandbox/visual/technical_control1/` are unchanged supporting/provisional work. `through-target-1-1/` and `passing-v1-approved/` provide its comparison/dependency snapshots.

Receiving is **not required by standalone ball flight**. The through-target demonstration needs the frozen receiving foundation, so that dependency is preserved. Its receiving animation, player-body mechanics, plant/cut implementation and goalkeeper presentation are **not** declared authoritative by this milestone. No new shooting or passing animations, procedural body/foot systems, RECEIVE changes, gameplay behaviours or production-match integration are included. Other pre-existing repository systems and historical comparison folders are not approved merely because they are in the same Git tree.

## Verification and review

Use Node **v22.19.0** and Python 3. Run from the repository root:

```sh
python3 trajectory_v1/verify_snapshot.py
node --jitless trajectory_v1/verify_replays.mjs
```

These commands are portable and do not modify saved evidence. They verify **1,225 unique file hashes** and **18 exact saved shooting replay hashes**. The Finesse replay hash covers all eleven Curve ratings, not just one shot.

Existing portable regression commands (they write their own result JSON, so use a disposable checkout/copy):

```sh
node sandbox/visual/ballphys1/tools/test.mjs
node sandbox/visual/ballfeel14/tools/test.mjs
node sandbox/visual/ballfeel14/tools/foundation-regression.mjs
node trajectory_v1/passing-stabilization-6/short-regression.mjs
node trajectory_v1/passing-range-7/study.mjs
node trajectory_v1/passing-assist-9/study.mjs
node trajectory_v1/through-target-1-2/verify-candidate.mjs
```

Publication reran ten existing trajectory/regression suites: **3,101 reported checks passed**. The unchanged through-target integration suite also passed **320 checks**. Exact commands, results and the initial default-JIT failures are retained in `trajectory_v1/publication-tests/`.

Full older suites also run `ballshot12/tools/test.mjs`, `curve11/tools/test.mjs`, `shotcharge13/tools/test.mjs` and `playtest/validate.mjs`. Their historical-preservation sections assume the original workspace layout, clean original checkout and approximately 3.87 GB of prior calibration artifacts (and the complete original source checkout). Those local archives were available for this publication run but are not duplicated here. The original manifests remain unchanged as provenance. Use the portable snapshot/replay verification above on a fresh clone; do not rewrite historical reference data to accommodate a different checkout.

To open the preserved reviews:

```sh
python3 -m http.server 8891 --bind 127.0.0.1
```

- Laces physical playtest: http://127.0.0.1:8891/trajectory_v1/playtest/
- Passing sandbox: http://127.0.0.1:8891/trajectory_v1/passing/?setup=unified
- Finesse, behind shooter: http://127.0.0.1:8891/sandbox/visual/curve11/review.html
- Charge review: http://127.0.0.1:8891/sandbox/visual/shotcharge13/live.html
- Supporting Through Target review: http://127.0.0.1:8891/trajectory_v1/through-target-1-2/

## Known limitations

- Default-JIT Node execution failed two strict historical shooting-hash gates. Both complete suites passed unchanged with `--jitless`; use that mode for exact golden replay certification. No golden hash, trajectory or physics source was changed to obtain a pass. Do not promise bit-identical execution across runtimes/JIT modes.
- The retained through-target browser/Node audit reports matching pre-RECEIVE flight and handoff timing but differences after RECEIVE (up to about 0.242 m in ball position over the following two seconds). That controller is outside the trajectory milestone and untouched.
- The shooting playtest is Laces-only, with a 12-second observation limit and no goal-frame/keeper collisions. Separate historical physics tests cover collision behaviour; the Finesse review uses its frozen Courtois fixture. Review outcomes are not a universal scoring contract.
- These are existing prototype/lab modules, not a newly integrated production match API. Historical UI labels may still say “provisional”; this publication approves only the trajectory/ball-behaviour boundary above.
- The through-target meeting predictor retains its old RUN forecast while the executed path uses the later cut controller. This supporting movement limitation is not part of ball-flight authority.

Start the next animation project from the release tag. Preserve this foundation and synchronize presentation to it; do not begin further trajectory calibration as part of that work.

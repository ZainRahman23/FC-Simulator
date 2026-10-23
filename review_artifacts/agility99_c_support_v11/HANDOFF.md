# A99-C + persistent support locomotion V1.1 — handoff to Claude

**Status: handoff only. Stop this workstream’s feature/presentation development. C is selected; the presentation is not approved or frozen.**

## READ FIRST — owner feedback and integration blockers

### 1. Straight running is worse; restore the approved RUN appearance

The owner finds the new ordinary straight running overly **compact, crouched and awkward**, describing it as looking somewhat like the player **“needs to use the bathroom.”** Turning footwork is substantially better, but that does not approve the global replacement of RUN. **The original 88573ef0 RUN appearance is preferred for ordinary straight running.**

Preserve the persistent support architecture while letting stable straight movement use the original/approved appearance. Intended routing:

`stable straight → original RUN; curve → curved support; significant redirect → cut/replacement; braking/reversal → braking/replacement; stabilized trajectory → smooth return to ordinary RUN`.

This routing is the **next integration experiment**, not implemented in the delivered snapshot. V1.1 currently uses the new body for straight motion too. Its phase-zero straight sprint kept 32 lift/land switches over four seconds but lowered pelvis height, changed foot arcs and increased flight share from 53.5% to 60.1%.

### 2. BALL ON IS NOT INTEGRATED — not Technical-Control ready

Across the diagnostic set’s **144 successful simulation contacts**, the original body is more than 10 cm from the ball at **3** contacts; the new support body at **51**. The worst new boot-surface/ball gap is **53.6 cm**. New locomotion removes diagnosed jumps but often fails to visually witness the actual touch.

**Physical/simulation contacts remain authoritative.** New support feet currently run independently of baseline touch choreography. Do not move, tether or teleport the authoritative ball/contact to match animation. Claude owns the future support/B4/B5 integration. Do not describe the delivered BALL ON mode as working dribbling integration.

### 3. Remaining locomotion compromises

Airborne turning, late landing corrections, ankle-centred pivots and incomplete crossover support remain. These are quantified below and in the review. The owner’s visual feedback takes precedence over any earlier “ready for review” wording in the preserved report.

## Owner decisions and rules

- **A99-C is the selected provisional Agility-99 movement ceiling. Preserve its current implementation exactly.** A99-B’s earlier recommendation is superseded by the owner’s selection of C.
- No lower-rating calibration. No freeze. No production merge or integration in this handoff.
- Preserve persistent trajectory-aware support planning, continuous swing paths, landing commitment across replans, curved support and cut/replacement/braking vocabulary.

Owner integration rules, verbatim:

> C is the selected A99 movement target. Do not slow C merely because the old animation cannot explain it.
>
> The persistent support architecture is valuable because it eliminated the catastrophic foot discontinuities. Preserve that architectural lesson.
>
> Do not globally replace the original good straight-running presentation. Specialized support/cutting behavior should activate when directional demand requires it and return cleanly to normal RUN afterward.
>
> Technical Control contacts remain authoritative. The support locomotion must eventually coordinate with B4/B5 so the visible foot witnesses the real contact; do not move the authoritative ball or contact to fit animation.
>
> Simulation decides what happens; animation explains what happened.

## Exact provenance and integration patch

- Grounded appearance/TC foundation: **`88573ef09e3d372bd674f0f623317b52f1dc4903`**.
- Exact repository snapshot used to build this isolated prototype, and patch base: **`c59e3be5bdb039289adc7cbc5b9084445dcbe85c`**.
- Claude worktree HEAD observed at handoff preparation: **`70b83e3b6cc1523f1561e3868ae6d40c7a08cd8b`**, parent `b60496da9ed7294190c390c0cf2989aef93495e8`, branch `prototype/dribble-1`. That is Claude’s TC-LAYERED-2/B4/B5 work, not the base of the Astra prototype.
- **No handoff commit was created.** The active worktree belongs to Claude’s ongoing B4/B5 line. A clean patch avoids moving its branch/index/history. No existing worktree source was changed.
- Applyable source patch: [`patches/A99-C-support-v1.1-from-c59e3be5.patch`](patches/A99-C-support-v1.1-from-c59e3be5.patch).
- Patch SHA-256: **`6f64e720fd3cb1a0d86d9a57f9f43f79f6016473da44739006cd3534e5383e41`**.
- Scope: **12 new source files, 0 modified base files**. All 1,596 supplied base runtime files match their c59e3be5 Git blobs. The patch reconstructs all 12 files byte-for-byte and `git apply --check` passes against Claude’s inspected HEAD. It was **not applied there**.
- The secondary `V1-to-V1.1-presentation.patch` is an explanatory diff against the isolated V1 prototype. **Do not apply both patches.** Use the combined patch for a clean repository without `agility99/`; use the secondary only when comparing an existing V1 implementation.

Full runnable source and assets are in [`review/lab/`](review/lab/). No session folders or external model files are needed to run it. The preserved review contains one complete runtime copy; the patches are the compact integration artifact. `patches/manifest.json` is the machine-readable file inventory.

From a separate integration checkout based on the stated snapshot (or after checking the destination dependencies), the command is:

```sh
git apply --check /absolute/path/to/this-package/patches/A99-C-support-v1.1-from-c59e3be5.patch
git apply /absolute/path/to/this-package/patches/A99-C-support-v1.1-from-c59e3be5.patch
```

These commands are instructions for Claude’s next work, not actions performed by this handoff. Keep the project’s locked `tc_baseline_88573ef0*` files untouched. The existing TC-LAYERED-2 handoff requires `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` before any later commit.

## Source map

Paths below are repository-relative after applying the combined patch. In the self-contained package, prefix them with `review/lab/`.

| File | Responsibility |
|---|---|
| `sandbox/visual/agility99/movement.js` | Exact C envelope, smooth angle/speed scaling, retained-momentum cap, angular continuation, acceleration and facing response. CURRENT/A/B are comparison options. |
| `sandbox/visual/agility99/sim.js` | Readable adapter over locked PlaySim. BALL OFF input/replan behavior; C trajectory arrays; original TC ownership in BALL ON. Unchanged in V1.1. |
| `sandbox/visual/agility99/support.js` | New persistent causal support timeline, trajectory forecasts, landing commitment, continuous swing, curve/cut/brake/replacement scheduling. |
| `sandbox/visual/agility99/direction_body.js` | New body reads support; coordinated pelvis/torso/arms, vertical compression, one existing leg solve, exact root translation. |
| `sandbox/visual/agility99/body.js` | Original V1 body used in the left comparison. Small V1 BALL OFF swing adapter over the baseline body. **This is not a byte-identical raw 88573ef0 body**, though the underlying locked body is supplied. |
| `sandbox/visual/agility99/body_gait.js` | Original V1 plan-level support helper used by the simulation adapter. Do not remove casually: changing the adapter can affect unchanged TC behavior. |
| `sandbox/visual/agility99/cases.js` | Deterministic input definitions and run loop; all cases, modes, phases and signs. |
| `sandbox/visual/agility99/metrics.js` | Acknowledgement, old-velocity, useful-line, recovery and momentum measurements. |
| `sandbox/visual/agility99/bench.mjs` | Movement matrix runner, quick/full. |
| `sandbox/visual/agility99/draw.js` | Local renderer helpers. |
| `sandbox/visual/agility99/viewer.js` | Playground, live BODY swap, shared-simulation old/new comparison, support guides. |
| `sandbox/visual/agility99.html` | Playground UI; C / BALL OFF / new body defaults. |

Relative to V1, only `viewer.js` and `agility99.html` were changed, and `support.js` / `direction_body.js` added. `movement.js`, `sim.js`, `body_gait.js`, `body.js` and `cases.js` remain byte-identical. No B4/B5 file is present in the combined patch.

## Authoritative movement — preserve exactly

Read [`notes/AUTHORITATIVE_MOVEMENT.md`](notes/AUTHORITATIVE_MOVEMENT.md) for all C formulas, anchor parameters, angle/speed scaling, acceleration/facing rules and TC boundaries. Read [`notes/C_RESPONSE_CLOCKS.md`](notes/C_RESPONSE_CLOCKS.md) for measured jog/run/sprint clocks. Full evidence: `review/data/a99-c-movement-matrix.json` (564 C runs) and `a99-c-response-clocks.csv` (972 individual input intervals).

Key anchors at 8 m/s: C turn-duration / retained incoming speed is 30° .075 s / .996; 60° .180 s / .960; 90° .275 s / .840; 120° .375 s / .640; 150° .445 s / .300; 180° .420 s / 0. These are model inputs, **not** measured useful-line clocks. A 180° reverses only after removing the incoming speed; subsequent positive acceleration remains the baseline function. Sprint ceiling is 8 m/s.

## Support locomotion architecture

Read [`notes/SUPPORT_ARCHITECTURE.md`](notes/SUPPORT_ARCHITECTURE.md) for sequencing and engineering constants. The minimum vocabulary is three families with variants:

1. Running: `STRAIGHT_RUN` and `CURVED_RUN` are one running family with straight/curved forms.
2. Redirecting transfer: `CUT_SUPPORT`.
3. Braking/reversal: `BRAKE_REPLACE`.
4. `REPLACEMENT_STEP` is a per-foot transfer variant when a support becomes unsuitable, not a fourth authored animation family.

The support timeline is persistent and presentation-only. It carries foot identity, position/velocity, phase, stance and landing across movement replans. It forecasts using only the current authoritative plan and recent curvature, not future inputs. Early endpoints adapt; late commitment is preserved or shortened/retimed. Retiming retains swing height phase. Swing routes and boot orientation are established **before** the existing leg solver; the root is never pulled to repair reach.

The delivered `DirectionBody` also globally changes ordinary RUN posture. **That is the owner-rejected presentation regression, not an architectural requirement.** Preserve the support lesson while restoring the approved straight presentation and adding clean transitions in Claude’s next pass.

## Why the old body failed

The old body already predicted future landing positions. The architectural failure was translating repeated plans through ordinary RUN swing templates with unstable phase/anchor ownership:

- Movement replans could rewrite an in-flight landing anchor.
- Support changes could bypass the old .12 s blend.
- Corrections larger than .6 m could abandon blending/continuity.
- Planted/contact-only reach correction could switch on at touchdown and move the rendered root/pelvis.

Fast circle phase 0/right: 87 large toe jumps in four seconds; 84 coincide with plan changes. At +.550 s, the authoritative root moves 3.33 cm and the intended target about .06 cm, yet the toe jumps 25.2 cm as the leg reach shortfall falls from about 26 cm in swing to .4 cm at plant. Repeated ±30° at +.900 s rewrites a landing by about 1.10 m and jumps the toe 1.22 m.

Evidence: `review/data/diagnosis.json`, `trace-{circle-fast,repeat30,rapid,sequence}.json`, and matching `new-trace-*.json`. The traces retain velocity, travel/facing, pelvis, phase/support identities, intended/rendered ankle, hip/knee/toe and IK state. New traces add family, next support and revisions. Pelvis is a COM presentation proxy, not a mass-weighted COM calculation.

## What V1.1 fixed — carry forward

| BALL OFF audit | Original V1 body | New support body |
|---|---:|---:|
| Large foot jumps across 272 scenarios | 898 | 0 |
| Flagged intersection frames | 2,086 | 0 |
| Maximum rendered-root gap | 79.84 cm | 0 |
| Maximum toe displacement in one 240 Hz tick | 123.87 cm | 7.92 cm |
| Fast-circle jumps, phase 0/right | 87 | 0 |

Both bodies were sampled over 264,192 frames each: all three speeds, both directions, sprint offsets 0/.12/.24/.36 s and jog/run offsets 0/.24 s, sustained angles plus ramps/repeated input/circles/stop. Jump threshold: >12 cm per 1/240 s. Intersection flag: capsule clearance <−2 cm. The new minimum clearance is −1.11 cm; zero flags is **not** mesh-perfect clearance or owner approval.

All 564 authoritative C runs matched V1’s entire tick arrays, contacts and hashes exactly. Eight additional profile/ball combinations showed no simulation feedback from posing and exact online/replay joint equality. See `review/data/verification.json` and the portable verifier described below.

## What remains unresolved — do not conceal

- **Straight presentation:** owner rejection at the top. Phase-zero sprint pelvis range changed from roughly .841–.937 m to .778–.872 m; cadence alone did not preserve appearance.
- **BALL ON:** 51/144 new boot/contact gaps exceed 10 cm; worst 53.6 cm. Physical contacts remain valid in simulation but are not correctly witnessed by the new feet. Original comparison has 3/144 over 10 cm.
- **Airborne turning:** phase-zero/right fast circle flight falls 66.3% → 50.2%, but still turns about 510° during flight over four seconds. Repeated ±30° gets worse: 55.1% → 66.3% flight, 261° → 381° airborne rotation. Coherent limbs do not prove grounded force explanation.
- **Late landings:** final target-to-achieved target error peaks at 24.6 cm (sprint fast ramp, offset .24/right); rendered ankle error at 24.8 cm. Initial predictions can be invalidated by later input, up to 3.82 m in the left fast ramp. The upstream reachable corridor can shorten a committed landing; the event log exposes this rather than silently treating it as a perfect prediction.
- **Pivots:** ankle-centred boot rotation, not an articulated forefoot-pressure model. Fast-circle total planted ankle travel is 3.7 cm; cumulative toe travel is 1.72 m across supports due mainly to pivoting, not one giant slip.
- **Crossover:** researched, but no complete authored crossover model. Compact lateral replacement and separate swing routes are implemented.
- **Lag:** body-heading frame has a 25 ms exponential follower and 12° cap; fast-circle sample peaks at 7.13° (~26 ms at 270°/s). Ordinary cyclic pelvis twist up to 6° is separate. Root translation has no lag.

## Play and reproduce

Double-click **`review/Launch.command`**. It starts a loopback-only Python server on a free port and opens `review/Report.html`; keep its terminal open, Control-C to stop. Alternatively, from this package:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory review
```

Open `http://127.0.0.1:8768/Report.html`, then Play. The untouched baseline reference is also served at `lab/sandbox/visual/tc_baseline_88573ef0.html`; use it when comparing the approved 88573ef0 RUN appearance, rather than assuming the left V1-adapted body is the raw baseline. The browser must support WebGL2. All JS, rig, mesh, textures and baked data are local. No npm install or external service is needed for the playground. Node built-ins suffice for numerical audits (developed with Node v22.19.0; see fixture metadata for the runtime used to generate it).

- Default: C, BALL OFF, new body.
- Compare: original V1 body left / new support right on **one shared simulation**. Choose straight sprint; 30/45/60/90/120/150/180°; gradual turn; repeated ±30°; rapid ±60°; 90° sequence; slow/fast circle. Phase and direction selectors, top/body view, scrubber and support guides are available.
- Straight **RUN**: Play → RUN, sprint lock off → hold W or outer stick without Shift. Swap BODY while moving; it preserves the live simulation. Straight **SPRINT**: Shift or sprint lock, or Compare’s straight sprint case. Numerical `RUN_snap_0` controls are in the audit too. Compare’s preset runner is sprint-only; do not mistake it for a speed selector.
- BALL ON: toggle only for diagnosis; keep the contact mismatch warning in view.
- Twenty 30 fps clips in `review/replays/`; playback defaults to 1×. Fifteen BALL OFF controls/stress cases and five unchanged-TC diagnostics. `cases.js` and replay manifests preserve the exact inputs, phase, sign, duration and hashes.

Portable checks (run from the indicated directory):

```sh
# From package root: hashes, 8 no-feedback/causal-replay cases and reference smoke cases
node tools/verify.mjs
# Also replay all 564 immutable V1 authoritative fixtures
node tools/verify.mjs --full
# From review/: full 272-scenario posed comparison, then 24 BALL ON scenarios
node review-tools/audit.mjs
node review-tools/audit.mjs --ball
node review-tools/diagnose.mjs
node review-tools/new_diagnose.mjs
```

Audits overwrite matching diagnostic files under `review/data/`; the preserved HTML embeds its original reviewed values. `tools/verify.mjs` writes a separate handoff-verification file. Historical verification remains untouched. Browser/render checks and recording instructions are in `tools/README.md`; pre-recorded videos remove any requirement to install capture tooling just to review.

## Claude’s next integration experiment — preserve separable layers

Start from **88573ef0 grounded baseline + exact A99-C + Astra V1.1 persistent support + Claude B4 generic technical vocabulary + Claude B5 short technical entry/exit**. Do not blindly flatten these components together. Retain owner-playtest toggles:

1. A (88573ef0 baseline)
2. A + C
3. A + C + support locomotion
4. A + C + support + B4
5. A + C + support + B4 + B5

Here **A means the grounded baseline, not the old A99-A movement candidate**. The current package is not that integrated stack. Claude’s `review_artifacts/tc_layered2/HANDOFF.md` remains the source for B4/B5 ownership and controls. Preserve their files while building a separate experiment. Technical Control must eventually supply actual contact constraints to support planning so the foot witnesses simulation, while straight RUN regains its approved appearance.

## Evidence index

- `review/Report.html`: before/after matrices, selectable diagnostics, event tables, 20 clips and known compromises.
- `review/data/body-diagnostics.csv`, `body-audit.json`, `ball-audit.json`: all 592 posed results.
- `review/data/events-*.json`: lift/land/retime events, initial forecast, latest target, achieved target and revisions.
- `review/data/a99-c-movement-matrix.json`, `a99-c-response-clocks.csv`: exact C movement outputs and clocks.
- `review/data/v1-authoritative-reference.json`: portable SHA-256 fixtures generated from V1, checked against the original matrix hashes.
- `review/data/verification.json`, `ui-verification.json`, `report-verification.json`, `provenance.json`, `v1-provenance.json`: historical checks.
- `review/Football-footwork-research.md`, `notes/Movement-research.md`: cited research; evidence is separated from implementation choices.
- `patches/manifest.json`, `HANDOFF_MANIFEST.json`: patch/file inventory and package integrity.

**Handoff completed without freeze, lower-rating work, B4/B5 changes or integration.**

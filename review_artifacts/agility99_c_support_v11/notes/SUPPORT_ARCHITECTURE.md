# Persistent support implementation map

**Preserve the architecture; do not preserve the owner-rejected global straight-running appearance.** All numeric bounds below are engineering choices for this provisional prototype, not biomechanics-derived caps on C.

## Data flow and causality

`SupportTimeline(sim)` reads the simulation only. Its cached timeline advances at 240 Hz. For a new tick t it selects `sim.planAt(max(0,t−DT/2))`, then `stateAt(t,plan)`. This avoids consulting a plan that only became available after that simulation step, and makes live and replay presentation identical. `at(t)` rounds to the same tick and advances sequentially from cached history.

Each foot owns world ankle position/velocity, current yaw, planted state, touchdown/liftoff identity, swing segment origin and velocity, landing time, original prediction, current endpoint, frozen status, extension count and revision count. Sim replans do not replace these foot objects. A global next-landing schedule and next-support identity persist across direction updates.

`DirectionBody.pose(t)` reads that support frame, uses authoritative `stateAt(t).P` **exactly** as its rendered root, and never calls old reach-driven root/pelvis correction. It reuses the original character, FK, skinning, ankle solver and leg IK. It does not feed pose state back to simulation, contacts or the ball.

## Family selection and cadence

- `STRAIGHT_RUN`: simple running when no significant directional demand is active.
- `CURVED_RUN`: sustained filtered turn rate >35°/s, active motion angle <40°, moving speed >1; curve persistence >.07 s (family additionally requires >1.2 m/s). Curve persistence decays twice as quickly as it accumulates when coherence disappears.
- `CUT_SUPPORT`: active motion angle >40°.
- `BRAKE_REPLACE`: active motion angle >135°, or strong braking >7 m/s² if no earlier family condition wins.
- `REPLACEMENT_STEP`: per-foot variant on a support becoming unreachable or late retiming; it can occur inside any global family. It is not a separate global locomotion mode.

Start from the original gait Ts. Curved cadence blends toward .17 s per landing as turn rate approaches 270°/s; cuts/braking cap it at .185 s. General period bounds .16–.34 s. Ordinary phase-zero sprint keeps 32 per-foot lift/land transitions in four seconds, matching the old body. This does not preserve its posture or flight share.

Stance duration is `min(period*1.05, max(.09, .80/max(speed,1)))`. A support releases early when its hip-relative horizontal reach exceeds .44 m or its same-side separation falls below .10 m. The next landing is reserved on release, not again on touchdown; double-advancing that reservation would break cadence.

## Forecast and landing commitment

The default prediction samples `stateAt(t+remaining, currentPlan)`. During a coherent curve it blends that prediction with a recent-turn-rate arc extrapolation, ramping with curve persistence over .12 s. It never reads future recorded inputs.

Landing uses the predicted root/travel tangent, forward lead `min(.36, speed*.045)` m, and nominal side width .17 m. Outside curved support adds .025 m; a cut adds .035 m. Initial target yaw follows predicted travel with a 3° side bias.

At liftoff, preserve current foot position and velocity and start a Hermite segment. Every four ticks (60 Hz), update the endpoint only while more than .055 s remains. Endpoint shift per revision is capped at .25 m early (> .12 s remaining), .08 m later. An endpoint change >.025 m increments the revision counter.

If remaining time is <.065 s and desired endpoint has diverged >.34 m, the current implementation can extend landing by .065 s, at most twice, and classify that transfer as replacement. **Extension retains the current normalized height phase** instead of resetting the swing height; resetting it caused a discontinuity during development. These mechanics can still produce too much flight in repeated steering; keep that known limitation.

Final reachable swing corridors can shorten a target after commitment. Logs therefore preserve all three: initial prediction, last planned endpoint and achieved target. Errors up to roughly .25 m are real compromise, not hidden exactness.

## Continuous swing and orientation before IK

Each Hermite segment starts with the current foot position/velocity, aims at the endpoint with zero terminal velocity, and uses the remaining time. Height is `( .20 + min(.10, speed*.012) ) sin²(pi*phase)` above an .088 m ankle-ground height. Pitch is −18° sin(2 pi phase).

A reachable corridor is computed in the moving body heading frame before IK: forward/back bound `.38 + .25 sin(pi*phase)` m, nominal own-side lateral interval .13–.29 m. Liftoff pose is admitted smoothly over .09 s so an existing contact is not projected abruptly into the corridor. This is a support-route constraint, not an iterative post-pose collision repair.

Early landing yaw was found to sweep a boot through the opposite calf. Mid-swing therefore bounds yaw relative to the body heading at ±22°, opening smoothly to ±45° after phase .65. Swing yaw rate is capped at 800°/s. A planted ankle remains in place while boot yaw follows the body at up to 650°/s. This is an ankle-centred pivot cheat, not true forefoot roll or contact-pressure simulation.

No full authored crossover routing is implemented. Separate recovery routes and compact lateral replacements are the current choice; “zero intersection flags” does not prove a complete crossover model.

## Pelvis, torso and root

The body heading frame follows authoritative facing with a .025 s exponential response and a hard 12° lag bound. Lean is driven by speed × filtered turn rate, capped at ±26°, smoothed over .065 s. Crouch is .035 m plus up to .075 m from lateral demand/braking, smoothed over .045 s. Trunk counter-rotation is capped at ±12° with .05 s smoothing. Cyclic pelvis twist is up to 6°; nominal vertical bob .014 m. Arms and shoulders participate in the support cycle.

Before the single leg solve, whole-body vertical compression follows both swing and stance targets continuously, up to .075 m below the current nominal pelvis height. That avoids enabling a new reach pull only at touchdown. Horizontal root position is unchanged. Existing IK can still leave centimetre-scale target/rendered ankle discrepancy; it is measured.

**This global pelvis/crouch/arc setup is why straight RUN changed.** Do not blindly route stable straight motion through `DirectionBody` forever. The desired next architecture restores 88573ef0 RUN appearance and transitions support ownership without restarting an in-flight foot or dragging the skeleton behind C.

## Contact and integration boundary

For BALL ON, `DirectionBody` currently uses its independent support feet and computes diagnostic boot/ball gaps. It does not consume the baseline’s authored touch-foot constraints. The unchanged physical simulation still performs its contacts. A future bridge to B4/B5 must schedule/commit visible support and touch feet around those real contacts; it must not move the authoritative event or ball to match this presentation.

Preserve testable boundaries: exact authoritative C, persistent support ownership, original RUN fallback, and TC contact authority. Add each integration layer behind a separate owner-playtest toggle.

## Evidence and diagnostics

`review/data/events-*.json` records lift, land and retime; initial/last/achieved landing; revisions and per-foot family. `new-trace-*.json` records global family, next support, revisions, body-heading lag, pelvis and hip/knee/ankle/toe state. The playground’s support guides show family/next foot/revisions and cyan planned targets. `body-diagnostics.csv` separately reports root/pelvis/facing, planted ankle/toe travel, jumps, capsule clearance, support transitions, flight displacement/rotation/velocity change, and final target-to-rendered ankle error.

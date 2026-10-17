Proceed with **DRIBBLE-1.5** and fix the remaining foundation issues identified in the DRIBBLE-1.4 review.

This is now an **implementation task**, not merely an outline.

The objective is to finish the generic dribbling foundation so that, if the acceptance criteria are met, we can freeze DRIBBLE-V1 and move on to player attributes.

## Current state

DRIBBLE-1.4 made meaningful improvements and should remain the baseline.

Current important results:

```text
Cuts taken:
D1.2 = 258 / 384
D1.3 = 256 / 384
D1.4 = 273 / 384

Clean cuts:
D1.2 = 129 / 384
D1.3 = 114 / 384
D1.4 = 121 / 384

D1.4 directional results:
60R = 6.50 / 8
60L = 6.25 / 8
90R = 5.67 / 8
90L = 4.33 / 8

Decisive toe rate = 5.9%
≥9 m/s decisive cut touches = 0
Straight control = 100%
Immediate same-foot recontact = 0.10%

Average CPU = 143 ms/s
Worst spike = 23 ms

Chrome/Node determinism = PASS
```

DRIBBLE-1.4 improved overall cuts taken, retained good performance, and fixed the known early-release root cause.

However:

```text
READY TO FREEZE DRIBBLE-V1 FOUNDATION = NO
```

because clean 90° cuts remain weaker than they should be.

## Known early-release issue

The previous investigation established that the apparent early-release problem was not fundamentally caused by releasing too early.

The release search was only checking every third tick from the release tick. That meant a decisive contact could fall on one side or the other of the sampling schedule.

In the known 90° right / seed 16 case:

```text
D1.3:
stage touch at tick 639
~6.3 m/s
left-toe recovery
ball loose
lost
```

whereas D1.4 evaluates every tick and reaches:

```text
tick 640
~6.9 m/s
plans cut
outside-right cut
taken
```

So preserve the root-cause fix.

Do NOT regress to the old coarse release-search behaviour.

## Main remaining problem

The worst remaining generic-foundation weakness is **clean 90° cutting**.

The review found that 90° right is taken more often than before, but the ball reaches the new line more slowly:

```text
median approximately:
D1.4 = 2.14 s
D1.2 = 1.71 s
```

and clean 90° outcomes remain substantially below where we want them.

This does NOT appear to be:

- planner latency;
- simply release timing;
- or something that should be hidden by making the generic player universally more agile.

Find and fix the actual remaining foundation cause.

## Scope of DRIBBLE-1.5

Keep this pass **narrow**.

The previous review specifically recommended testing the three DRIBBLE-1.3 search restrictions against their DRIBBLE-1.2 behaviour, **one at a time**:

1. `maxSetups`
   - restore/check the previous setup-search cap behaviour;
   - remain within the CPU budget.

2. `rStop1`
   - examine the release search stopping at its first valid plan.

3. `c12CutAtContact`
   - examine the cut-at-contact option.

Do not blindly revert all three.

Test each independently first.

Use matched seeds/randomness so the effect of each change can be classified causally.

Then, only if justified, test the smallest combination necessary.

## Primary target

Recover clean 90° cuts toward the DRIBBLE-1.2 level.

The previous recommendation was approximately:

```text
clean 90° cuts:
target ≈ 48 / 192
```

while preserving DRIBBLE-1.4's gains.

Do not optimize solely for this number at the expense of football quality.

Inspect representative cases visually.

## Preserve DRIBBLE-1.4 improvements

A DRIBBLE-1.5 candidate is not acceptable if it fixes clean 90° cuts by substantially regressing:

- 60° cuts;
- total cuts taken;
- physical plausibility;
- ball-loss possibility;
- straight control;
- same-foot recontact;
- decisive-toe behaviour;
- deterministic behavior;
- performance.

In particular, retain the important DRIBBLE-1.4 gain of:

```text
273 / 384 cuts taken
```

as closely as reasonably possible.

Do not sacrifice a large amount of the overall improvement merely to make one metric prettier.

## Performance constraints

Keep:

```text
average CPU ≤ 170 ms/s
```

and avoid pathological spikes.

DRIBBLE-1.4 currently achieves:

```text
143 ms/s average
23 ms worst spike
```

so there is some room for a better search, but do not return to DRIBBLE-1.2's expensive behaviour:

```text
205 ms/s average
540 ms worst spike
```

Performance architecture from DRIBBLE-1.3/1.4 should remain intact unless a very small, measured exception is demonstrably necessary.

## Determinism

Preserve matched randomness.

The previous comparison successfully showed that shared cases were consuming identical errors.

Maintain:

- seeded randomness;
- deterministic Chrome/Node decisions;
- matched-seed counterfactual testing;
- causal localization of randomness.

Do not "improve" results by rerolling execution error.

## Do not solve attribute problems in the generic foundation

There are three known limitations that should remain for the later attribute layer:

### 1. Maximum turn sharpness

How sharply a player can bend a 90° turn should eventually depend on things such as:

```text
Agility
Ball Control
pressure/context
```

Do not make the generic player unnaturally perfect simply to eliminate this limitation.

### 2. Preferred / weak foot

Do not solve preferred-foot and weak-foot behavior as a universal generic-player capability.

That belongs in the attribute/player layer.

### 3. Bad-touch severity

A sufficiently poor execution should still be capable of losing the ball.

Eventually Ball Control should scale execution error through the existing execution-error interface.

Do not remove genuine control loss from the foundation.

The generic system must remain capable of:

```text
bad execution
→ bad touch
→ ball becomes difficult/unrecoverable
→ possession lost
```

That is desirable simulation behavior.

## Football quality outranks metric gaming

Do not add special cases such as:

```text
if turn == 90°:
    force successful cut
```

Do not directly optimize outcome labels.

Fix the underlying search/planning/contact behavior so the better result emerges naturally.

Simulation causality must remain intact.

## Validation

Run the full **384-run matrix** for every serious candidate.

Compare at minimum:

```text
D1.2
D1.3
D1.4
D1.5 candidate
```

Report:

- cuts taken / 384;
- clean cuts / 384;
- 60R;
- 60L;
- 90R;
- 90L;
- clean 60° totals;
- clean 90° totals;
- decisive toe rate;
- ≥9 m/s decisive cut touches;
- setup attempts;
- setup success;
- straight control;
- immediate same-foot recontact;
- average CPU;
- worst spike;
- determinism.

Also classify changed outcomes against D1.4:

```text
better
worse
neutral / different but equivalent
```

using matched randomness where possible.

## Visual inspection

Do not rely only on aggregate metrics.

Inspect at least:

1. the known 90° right / seed 16 diagnostic case;
2. the best recovered 60° case;
3. representative newly recovered clean 90° cases;
4. representative D1.4 → D1.5 regressions;
5. any suspicious cases where the metric says "clean" but the football looks poor.

Confirm that recovered 90° cuts actually:

- redirect the ball convincingly;
- get onto the new line promptly;
- do not depend on ugly emergency toe contacts;
- do not create teleporting/sliding;
- preserve physical interpretation.

## Investigate why 90° cuts are slow

The key symptom to understand is:

```text
D1.4 90° cuts are being taken more often,
but transition onto the new line is slower.
```

Do not merely search constants until the metric rises.

Trace representative cases and identify what causes that extra delay.

Determine whether it comes from:

- setup selection;
- contact selection;
- release-plan selection;
- cut-at-contact availability;
- recovery contacts;
- or another specific foundation mechanism.

Fix the actual cause with the smallest justified change.

## Acceptance criteria

Freeze DRIBBLE-V1 only if you can reasonably conclude:

1. The remaining generic 90° foundation defect is fixed or reduced enough that further improvement clearly belongs to player attributes.

2. Clean 90° performance moves materially back toward D1.2.

3. DRIBBLE-1.4's 60° and cuts-taken gains are substantially preserved.

4. CPU remains ≤170 ms/s average.

5. No ≥9 m/s decisive cut-touch problem returns.

6. Straight control remains effectively perfect.

7. Same-foot immediate recontact remains negligible.

8. Control loss remains possible.

9. Chrome/Node determinism passes.

10. Visual inspection confirms the numerical improvement represents better football.

If these conditions are genuinely satisfied:

```text
READY TO FREEZE DRIBBLE-V1 FOUNDATION = YES
```

and freeze it.

If they are not satisfied, report:

```text
READY TO FREEZE DRIBBLE-V1 FOUNDATION = NO
```

and identify the precise remaining foundation defect.

Do not continue broad experimentation indefinitely.

This should be the **last narrow foundation pass** before moving to:

```text
Dribbling
Ball Control
Agility
preferred/weak foot
pressure/context
```

attributes.

## Deliverable

Implement the narrow DRIBBLE-1.5 fix, test it thoroughly, and give me:

- root cause;
- exact code/behavior change;
- before/after metrics;
- matched-seed analysis;
- representative visual cases;
- performance results;
- determinism results;
- regressions;
- whether the remaining limitations now belong to attributes rather than the generic foundation;
- final `READY TO FREEZE DRIBBLE-V1 FOUNDATION` decision.

Commit the completed local work if it meets the project's normal commit criteria, but do not push unless the existing project workflow explicitly calls for it.

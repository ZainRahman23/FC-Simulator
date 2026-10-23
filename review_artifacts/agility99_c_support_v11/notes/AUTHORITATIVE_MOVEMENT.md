# Exact authoritative A99-C movement

**Source of truth:** `../review/lab/sandbox/visual/agility99/movement.js`, together with `sim.js` and the locked baseline parameters. Preserve the code and constants byte-for-byte while integrating. This note explains the implementation; it is not permission to reimplement a numerically different approximation.

## C parameter anchors

Angles in degrees; time in seconds at 8 m/s. Retention is the fraction of incoming speed available at completion, a ceiling rather than a speed grant.

| Angle | 0 | 15 | 30 | 45 | 60 | 90 | 120 | 150 | 165 | 180 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Time | 0 | .040 | .075 | .120 | .180 | .275 | .375 | .445 | .435 | .420 |
| Retention | 1 | 1 | .996 | .985 | .960 | .840 | .640 | .300 | .095 | 0 |

`stopTime = .34`; `faceTau = .031`; fixed integration step `DT = 1/240` s. Positive acceleration nominal `aAcc = 7 m/s²`; lower requested-speed braking `aBrake = 9.5 m/s²`. Mode ceilings are WALK 1.5, JOG 3.2, RUN 5.3 and SPRINT 8.0 m/s. These are the baseline A99 values; no lower-rating tuning was performed. A99-A/B in the source are alternative ceiling hypotheses, not lower Agility ratings.

## Smooth angle and entry-speed scaling

Let `clamp(x,a,b)` have its usual meaning; `E(x) = u²(3−2u)` where `u = clamp(x,0,1)`. Angle `a` is the absolute wrapped heading difference, in degrees, from current travel to the new requested heading.

`sample(values,a)` finds the two adjacent angle anchors and interpolates their values with E of the normalized interval. It is not a nearest-angle bucket or linear interpolation.

For entry speed `s0`:

```text
v = clamp(s0 / 8, 0, 1)
rLoss = E((a − 150) / 30)
lossScale = (.35 + .65 v)(1 − rLoss) + rLoss
T = max(.032, sample(time,a)(.58 + .42 v))
R = 1 − (1 − sample(retention,a)) lossScale
```

Thus small low-speed corrections have shorter durations and lose a smaller proportion of speed. A true reversal still has R = 0. The 0° duration also has the .032 floor; that does not create a straight-line acceleration buff.

On stick release (target null), `T = max(.12, .34(.4 + .6 s0/8))`, `R = 0`.

## Persistent motion state and travel heading

`newMotion` stores the current heading h0, target, s0, signed wrapped angle θ in radians, start time, duration, retention and the previous travel angular rate. A request change greater than `1e−5` rad, or switching between null/non-null request, creates a new motion starting at `t − DT`.

For normalized time `u = clamp((t − t0)/T,0,1)`:

```text
rTurn = E((a − 120)/60)
delay = .5 rTurn
z = clamp((u − delay)/(1 − delay),0,1)
slope = rate0 T (1 − delay)
h = h0 + θ E(z) + slope z(1 − z)²
```

The Hermite continuation term carries angular velocity through analog retargets. It avoids repeatedly starting a small turn from rest. Major turns delay more travel reorientation until speed is lower. At 180°, speed loss finishes by normalized u=.72 while travel reorientation occupies the latter half; no incoming speed is magically flipped into outgoing speed.

## Speed and root integration

Release: `s = min(s, s0(1 − E(u)))`.

A directional request uses:

```text
lossProgress = E(u / (1 − .28 rTurn))
cap = s0 [1 − (1 − R) lossProgress]
if s0 > .3 and u < 1: s = min(s, cap)
acc = 7 clamp(1 − s/11, .35, 1)
canGain = (s0 <= .3 or u >= 1)
if s < requestedModeSpeed and canGain:
    s = min(requestedModeSpeed, s + acc DT)
else if s > requestedModeSpeed:
    s = max(requestedModeSpeed, s − 9.5 DT)
```

Changed requests never restore lost speed. Every positive speed gain still uses the baseline acceleration function. `sim.js` integrates the root with the updated travel velocity each tick: `Pnext = P + s[cos(h), sin(h)] DT`. C’s substantially faster redirection and greater momentum retention are intentional owner-selected behavior.

## Authoritative facing — separate from body lag

The movement model’s own facing state is `(psi,w)`. In the non-authored C path:

```text
travelRate = wrap(h − previousH) / DT
facingTarget = h + clamp(.012 travelRate, −5°, +5°)
omega = 1 / .031
angularAcceleration = clamp(omega² wrap(facingTarget−psi)
                            + 2 omega(travelRate−w), −12000°/s², +12000°/s²)
w = clamp(w + angularAcceleration DT, −1200°/s, +1200°/s)
psi = psi + w DT
```

The V1.1 support body adds a **presentation-only** heading follower after this. Do not confuse its 25 ms/12° cap with C’s authoritative facing parameters. Neither changes authoritative root translation.

## Simulation adapter and TC ownership

`AgilitySim` subclasses the restored baseline `PlaySim`, keeping a 1.5 s predicted plan sampled at 240 Hz. Arrays hold P, V, psi, angular velocity, travel heading/rate and motion state. `stateAt()` reads that plan.

- BALL OFF samples analog replanning at up to 60 Hz (every four ticks) when requested heading differs from the current plan request by >.1°. It removes contacts from the movement probe and uses the existing V1 body-gait helper. It adds presentation lean/crouch channels but does not move the root for the new body.
- BALL ON retains the original request thresholds, contact commitment, technique selection and replan machinery. When `progAt()` is keyed/authored, its original speed/heading/facing path is used. Otherwise the carry path uses C’s advance function. Existing authored TC therefore can own/delay/replace part of the motion; BALL ON is not evidence of the free C envelope.
- The CURRENT profile goes directly through baseline `mkPlan`. V1.1 did not alter any of these behaviors.

Do not remove the V1 plan/gait adapter merely because the new body uses its own support timeline. Preserve behavior first and prove equivalence after any refactor.

## Four response-clock definitions

`metrics.js` measures clocks separately from model T:

1. **Acknowledgement:** first velocity difference ≥.05 m/s or facing difference ≥1° versus a counterfactual run that keeps the previous request. This is simulation response, not input-device/display latency.
2. **Old-velocity response:** 50% / 90% reduction of velocity incompatible with the requested positive travel ray. Residual is `|V − max(0,V·unitTarget) unitTarget|`; for release it is speed. Threshold comparisons include .005 m/s slack. Rotation as well as braking can reduce it.
3. **Useful new line:** heading error within `clamp(.2 entryAngle,2°,10°)` and speed ≥60% of the requested mode speed, continuously for .06 s. The reported time is the start of that held interval. Directional-only line uses the same heading tolerance at speed ≥.5 m/s. Release useful line means speed <.3 m/s.
4. **Recovery:** same heading tolerance at ≥90% of requested speed, held .06 s. A deep reversal may reorient quickly but take much longer to recover speed.

Minimum speed, speed at useful line, +.25/+.50 s speed, path distance, old-axis progress and TC-owned time are also retained. Each repeated-input interval ends at the next request; missing clocks remain null rather than being silently passed. See `C_RESPONSE_CLOCKS.md` for measured values and the full CSV/JSON for all phases and BALL ON results.

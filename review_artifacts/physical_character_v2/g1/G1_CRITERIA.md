# V2-G1 pass criteria — v3 (pre-registered)

This file was written and committed **before** the G1 evidence run that follows decisions D1–D4 (`sources/2026-10-03_user_decision_g1_d1_d4.md`). It replaces v2 (commit `77815db`), which replaced v1 (commit `5e4548d`). The same values are encoded in `sandbox/visual/physchar2/gates/v2_g1_checks.js` (`TOL`, `HS_TOL`) and `tools/g1_run.js`.

Every difference from v2 comes from an approved decision (D1a, D2a, D3a, D4a–d) and is recorded with its evidence in `DECISIONS.md`. No value was changed because a run failed.

## Configuration under test (the gate)

- **Engine:** pinned JoltPhysics.js 1.1.0 / Jolt 5.6.0 wasm-compat, single-threaded, sha256 `011233a5…57de`.
- **Rate:** 240 Hz × 1 collision step.
- **Solver:**
  - **150 velocity iterations [D2a]:** the validation baseline. It is a correctness configuration, *not* the accepted production-performance configuration.
  - 2 position iterations; warm starting on.
- **Contacts [spec §15.4]:**
  - speculative distance 0.02 m, slop 0.005 m, Baumgarte 0.2, restitution 0;
  - per-sub-shape friction;
  - manifold reduction off and body-pair contact cache off [C3].
- **Boot [D1a]:**
  - the approved rigid boot hull, represented as **10 convex pieces** (a grid AP 5 × ML 2) that tile it exactly;
  - Jolt hull tolerance 1e-5 m, so the Jolt pieces equal the specified pieces;
  - external geometry, ankle position, mass, COM, inertia and the semantic foot → toe mapping are identical (G0 0.10e and the D1a verification).
- **Head [C4]:** two spheres plus the neck capsule.
- **Bodies:** zero body damping, gravity factor 1, no sleeping, maxAngVel 100 rad/s, gyroscopic on [G1-D1].
- **Passive joints:**
  - the end-range law (25 % capacity at the hard limit, B = 6) and the four couplings;
  - viscous damping;
  - the C2 anatomical end-stop (100 % capacity 3° past the anatomical limit; kept by D3a);
  - all folded into the implicit motor rows with causal fixes G1-D2 … D8.
- **Emergency (Jolt) stops:** at anatomical ± `ENGINE_MARGIN`, measured by `tools/g1_margins.js` over **the whole validation set** [D3a]:
  - V2-REF and V1-matched: every scenario except impact15;
  - four variants: the essential scenarios;
  - the D4a timestep ensembles: 4 rates × 5 starts;
  - the C7 envelope.

  The rule is max(2°, ⌈1.5 × overshoot + 1°⌉). The anatomical ROM is unchanged.
- **Run lengths:** falls 10 s, isolated tests 2 s, envelope 1–1.5 s. The rest window is the final 0.5 s.
- **Bodies:**
  - V2-REF and V1-matched run every scenario;
  - V2-165-62, V2-198-92, V2-long-legs and V2-short-legs run the ten essential scenarios;
  - no per-body tuning.

## Criteria (gate)

Rows marked "v2" are unchanged.

| id | criterion | pass | source |
|---|---|---|---|
| 1.F, 1.2a–d | finite; energy per step ≤ 0.5 J; non-increasing after first contact ≤ 0.5 J; contact-free gain ≤ 0.01 J/step; free-fall COM accel ≤ 0.01 m/s² | v2 | spec 1.2, brief |
| 1.3a / 1.3c | joint separation transient / at rest | ≤ 5 / ≤ 1 mm | spec 1.3 |
| 1.3b | the emergency (Jolt) stop is never reached | 0 ticks; actual anatomical overshoot reported | C2, D3a |
| **1.3d** | **settled excursion beyond the anatomical ROM boundary** (the 3° end-stop's numerical / compliance deflection) | **≤ 1.5°**; actual value and joint reported | **D3a** (v2: 0.5°) |
| 1.3e / 1.3f | frame continuity / chatter | v2 | brief |
| 1.4a / 1.4d | turf / self penetration, transient | ≤ 10 mm | spec 1.4 |
| **1.4b / 1.4e** | resting turf / self penetration ≤ the 5 mm slop | **≤ 5 mm, compared with a 0.01 mm numerical tolerance** | C5, **D4c** |
| 1.4c, 1.4i, 1.4f, 1.4j | disabled pairs; initial overlap; standing-release sole touch; isoSelfCol missed collision | v2 | brief, C5 |
| **1.4h** | isoSelfCol: the reachable non-adjacent self-collision (leg ↔ leg) occurs and stops the limbs; arm ↔ trunk contacts are **reported** | ≥ 1 leg pair, no pass-through | brief, **D4b** |
| 1.R | at rest, no jitter | v2 | brief |
| 1.1a / 1.1b | isoMomentum momentum | ≤ 2e-5 / ≤ 5e-3 | C6 |
| 5, 5c | passive rig and couplings | v2 | brief, spec §13.2 |
| 1.6a / b / c | determinism ×3 / snapshot / browser = Node | identical | spec 1.6 |
| **8** | **timestep [D4a]** (details below) | invariants pass + no genuine 240 Hz effect | brief §8, **D4a** |
| 7.HS | C7 envelope: HS.1–HS.4 in each of the 8 scenarios | all | C7 |

**7.HS: hsKickShin.** HS.3 there is "contact occurs (no complete pass-through)". The missed-step count of the thin 10-piece boot at about 20 m/s is reported as **HS.3k, KNOWN UNRESOLVED ISSUE (D1a)**: report-only, carried as technical debt.

**8: the timestep study.** Each rate scenario runs at 180 / 240 / 360 / 720 Hz as an **ensemble** of 5 starts (nominal; initial lift ±1 µm, ±10 µm).
- **Invariants** must hold for every member at every rate:
  - integrity: 1.F, 1.3a, 1.3b, 1.3e, 1.4c, 1.4d;
  - contact-free energy (1.2c) and free fall (1.2d);
  - momentum (1.1a / b) on isoMomentum.
- **Distributions** are compared against the 720 Hz ensemble. A **genuine rate effect** is any of:
  - the posture sets are disjoint;
  - |Δ median first-non-foot time| > max(25 ms, the larger ensemble range);
  - |Δ median final COM| > max(0.15 m, the larger within-ensemble spread).
- **Gate:** invariants pass, and there is **no genuine effect at the 240 Hz validation rate**.
- **Genuine effects at 180 / 360 Hz are reported and preserved.** Examples are the 1 m drop contact timing and the 360 Hz lean-forward landing; they are not averaged away.

**impact15** (15 m/s whole-body): **diagnostic, report-only [D4d]**. Every check is evaluated and reported with its own pass value; none counts toward PASS.

## Reported, not gated

| id | what is reported |
|---|---|
| 1.5 | iteration study 10/15/20/30/60/150 [D2a] |
| 1.1f | C6 free-body floor |
| 1.7 | V1 Gate A |
| 9 | performance: the cost of D1a + D2a against the previous baseline |
| § 19 | actual excursions and emergency-stop usage [D3a] |
| HS.3k | the known shin-kick miss [D1a] |
| impact15 | diagnostic [D4d] |
| D1a | seam verification |
| DX-* | diagnostics |

## Clarifications (measurement)

1–8 are as in v2.

9. **The arm ↔ trunk part of 1.4h is removed (D4b).** The approved shoulder ROM stops the arm about 4° short of the trunk. Three alternative starts were tested and none produced an impact.

## What the result means

- **PASS** requires every gate row.
- Diagnostics are measured, not adopted.

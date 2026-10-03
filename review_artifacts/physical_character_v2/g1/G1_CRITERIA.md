# V2-G1 pass criteria — v2 (pre-registered)

This file was written and committed **before** the final G1 evidence run of 2026-10-03. It replaces v1 (commit `5e4548d`). The same values are encoded in `sandbox/visual/physchar2/gates/v2_g1_checks.js` (`TOL`, `HS_TOL`).

Every change from v1 comes from one of these sources:
- a decision in `sources/2026-10-03_user_decision_g1_c1_c7.md` (C1–C7);
- a clarification of how a check is measured (numbered below).

Each change is recorded with its measured justification in `DECISIONS.md`. No value was changed because a run failed.

## Configuration under test (the gate)

- **Engine:** pinned JoltPhysics.js 1.1.0 / Jolt 5.6.0 wasm-compat, single-threaded, sha256 `011233a5…57de`. Checked on every run.
- **Rate:** 240 Hz × 1 collision step [spec §19, C7: no global rate increase].
- **Velocity iterations:** 60 [C1: the validation baseline]. Position iterations: 2. Warm starting on.
- **Contacts [spec §15.4]:**
  - speculative distance 0.02 m;
  - slop 0.005 m;
  - Baumgarte 0.2;
  - restitution 0;
  - per-sub-shape friction.
- **Contact manager [C3]:** manifold reduction off, body-pair contact cache off.
- **Boot [C3]:** the approved hull as two convex pieces (rear / front at 55 % of the length). The external geometry is identical: the hull of the union is the approved hull.
- **Head [C4]:** two spheres plus the neck capsule.
- **Bodies:**
  - zero body damping;
  - gravity factor 1;
  - no sleeping;
  - maxAngVel 100 rad/s;
  - gyroscopic force on [G1-D1].
- **Passive joints [spec §13.1.5, §13.3, §13.2; C2]:**
  - the end-range law (25 % of opposing capacity at the hard limit, B = 6);
  - the four couplings;
  - viscous damping;
  - the C2 anatomical end-stop (a linear spring beyond the hard limit reaching 100 % capacity 3° beyond it).
  - All of this is folded into the implicit motor rows, with the causal fixes listed in `DECISIONS.md` (G1-D2 … G1-D8).
  - The Jolt hard stop is an emergency stop at anatomical ± `ENGINE_MARGIN`. The margins are measured by `tools/g1_margins.js` for this configuration (C2).
- **Run lengths:**
  - every fall: 10 s, including impact15;
  - isolated tests: 2 s;
  - envelope: 1–1.5 s.
  - The rest window is the final 0.5 s.
- **Bodies:**
  - V2-REF and V1-matched run every scenario.
  - V2-165-62, V2-198-92, V2-long-legs and V2-short-legs run the ten essential scenarios.
  - There is no per-body tuning.

## Criteria (gate)

| id | criterion | pass | source |
|---|---|---|---|
| 1.F | finite, no explosion | no NaN/Inf; ≤ 25 m/s | [brief §2] |
| 1.2a | net mechanical-energy increase per step (E = KE + PE + U) | ≤ 0.5 J | [spec 1.2] |
| 1.2b | E non-increasing after first contact | ≤ 0.5 J above the running minimum | [spec 1.2] |
| 1.2c | contact-free steps: ΔE + damping loss | ≤ +0.01 J per step | [brief §4] |
| 1.2d | contact-free: COM acceleration = (0, −g, 0) | ≤ 0.01 m/s² | [brief §3] |
| 1.3a / 1.3c | joint separation, transient / at rest | ≤ 5 / ≤ 1 mm | [spec 1.3] |
| 1.3b | the emergency (Jolt) stop is never reached | 0 engine-stop ticks; anatomical overshoot reported | **[C2]** |
| 1.3d | settled joints inside the anatomical ROM | ≤ 0.5° beyond the anatomical hard limit at rest | [spec 1.3] |
| 1.3e / 1.3f | frame continuity / hard-limit chatter | ≤ 2 × 100 rad/s × dt per tick / ≤ 10 toggles per 0.5 s | [brief §2] |
| 1.4a | turf penetration, transient (exact collider geometry) | ≤ 10 mm | [spec 1.4] |
| 1.4b | resting turf penetration | ≤ 5 mm (the slop) | **[C5]** |
| 1.4d | self-penetration between allowed pairs, transient | ≤ 10 mm | [spec 1.4] |
| 1.4e | resting self-contact penetration | ≤ 5 mm (the slop) | **[C5]** |
| 1.4c | disabled pairs never in contact | 0 | [brief §3] |
| 1.4i | no allowed pair overlaps in the initial condition | ≤ 1 mm | **[C5]** |
| 1.4f | standing release: at t = 0 only boot soles **touch** (separation ≤ 1 mm), inside the plantar outline, on the sole plane, normal +Y | 0 / ≤ 2 mm / ≤ 2 mm / ≤ 2° | [brief §3] (clarification 6) |
| 1.4h / 1.4j | isoSelfCol: intended self-contacts occur; no missed self-collision (geometric overlap > slop + 2 mm with no manifold) | ≥ 1 each / 0 | [brief §3] |
| 1.R | comes to rest; no jitter | KE ≤ 0.1 J, joint ω RMS ≤ 0.05 rad/s | [brief / spec 1.2] |
| 1.1a / 1.1b | isoMomentum: linear / angular momentum, relative | ≤ 2e-5 / ≤ 5e-3 | **[C6]** |
| 5.a–5.d, 5c | passive rig and couplings | as v1 | [brief §5, spec §13.2] |
| 1.6a / b / c | ×3 determinism (two processes) / SaveState-RestoreState bit-exact / browser = Node | identical | [spec 1.6] |
| 8 | timestep 180/240/360/720 Hz: integrity at every rate, same qualitative outcome, fall timing ≤ 25 ms, final COM ≤ 0.15 m vs 720 Hz | all | [brief §8] |
| 7.HS | **C7 no-tunnelling envelope** (V2-REF, 8 scenarios, 10–20 m/s limbs and bodies; see the table below) | HS.1–HS.4 pass in each | **[C7]** |

**impact15** (15 m/s body into the turf) is the EXTREME test [C7]:
- It is checked with HS.1–HS.4 plus 1.R.
- Its first-touch depth (1.4g) is reported, not gated.

### C7 envelope checks

| id | check | pass |
|---|---|---|
| HS.1 | finite; max body speed ≤ initial + free-fall gain + 5 m/s | yes |
| HS.2 | no missed turf collision (a body below the turf by more than the slop with no turf manifold) | 0 steps |
| HS.3 | no tunnelling / missed limb collision (exact geometric overlap > slop + 2 mm on a step with no manifold), and contact did occur | 0 |
| HS.4 | no catastrophic constraint failure: joint separation | ≤ 20 mm transient; ≤ 1 mm at rest (with gravity) |
| HS.r | penetration, engine-stop ticks, anatomical overshoot, energy | report |

### Report-only rows

| id | what is reported |
|---|---|
| 1.5 | iteration study 10/15/20/30/60 [C1] |
| 1.1f | the free-body angular-momentum floor [C6] |
| 1.7 | V1 Gate A A–E side by side |
| 9 | performance |
| D.cand | the decision candidate (below) |

## Clarifications (how a check is measured; none is a tolerance)

1–5 are as in v1.

6. **Sole check (1.4f) counts only touching points.** These are points whose separation along the contact normal is ≤ 1 mm. Jolt reports speculative points up to 20 mm apart, and those are not touches. With a multi-piece boot, the raised toe pieces carry speculative points 11 mm above the turf at t = 0.
7. **impact15 runs 10 s, like every other fall.** At 6 s it was still settling (joint ω RMS 0.40 rad/s, energy decreasing); at 10 s it is at rest.
8. **Engine-stop margins are re-measured whenever the passive drive or the contact configuration changes** (the C2 procedure: `tools/g1_margins.js`; rule max(2°, ⌈1.5 × overshoot + 1°⌉) over the V2-REF scenario envelope without impact15).

## Decision candidate (measured, NOT part of the gate)

The runner also evaluates one candidate package on every body and the envelope. It is reported as `D.cand` to inform the decision report and does not count toward PASS. The package:
- the approved boot hull as 10 convex pieces (an AP 5 × ML 2 grid; identical external geometry);
- 150 velocity iterations;
- its own engine-stop margins, measured by the same C2 procedure (`g1/json/g1_margins_candidate.json`).

## What the result means

- **PASS** requires every gate row.
- Diagnostics (`DX-*`) and the candidate are measured, not adopted.

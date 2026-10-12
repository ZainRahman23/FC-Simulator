# MUSCLE-1 §2: audit of Astra's actuator hypothesis against the code and the PPR-3 histories

The instruction is saved verbatim in `sources/2026-10-12_user_instruction_muscle1_validate_physical_muscle_actuator_layer.md` (4b8e6654).

**The hypothesis:**

> V2's activation dynamics may constrain the amount of torque available without sufficiently constraining how quickly actual physical torque changes inside that envelope.

This audit came before any MUSCLE-1 model existed. It uses:
- the frozen code;
- regenerated frozen PPR-3 battery runs (`scripts/m1_capture.mjs`). The determinism job reproduces its committed hash, 4178181c7f012d8b;
- a standalone axis fixture (`scripts/m1_kit.mjs`, `scripts/m1_models.mjs`) that re-evaluates the frozen actuator equations on prescribed inputs.

**Fixture validation.** Replaying PPR-3's recorded kinematics and excitations through the fixture's S2 model reproduces the recorded rows after a 0.1 s warm-up:
- drive, strain torque, request and window agree to ≤ 0.008 N·m. The warm-up residue comes from the unrecorded entry command;
- the applied constraint torque agrees to ≤ 0.04 N·m on the moderate push, and to ≤ 0.5 N·m during large or lateral falls. There, contact coupling inside the Jolt solver departs from the closed-form motor.

There are **two different actuator paths** in the code. The answer differs between them.

## 1. What the 15 / 50 ms activation dynamics govern

| | CURRENT V2: canonical `ActuatorLayer` (`sandbox/visual/physchar2/sim/v2_actuation.js`), used by SnapshotTone and the G2 controllers | PPR-3's S2 actuator (`ppr3/scripts/ppr3_body.mjs` `S2Actuator`, on PPR-1's `PreReflexActuator`) |
|---|---|---|
| Controller output | an implicit PD request {τ0, K, D} | a net-torque correction Δτ, turned into excitation u± (`solveFloors`) |
| Excitation | derived **from the request**: u = min(1, \|req\|·1.25/cap + 0.02) on the request's side | the command itself (exact inverse at the entry capacities, plus tone floors) |
| Activation (15 / 50 ms, Thelen 2003) | sets **only the torque envelope** [−a⁻cap⁻, +a⁺cap⁺] | **sets the active torque**: drive = a⁺·capIso⁺(θ) − a⁻·capIso⁻(θ) |
| Physical torque | the Jolt motor delivers **the request**, τ0 − (D + dt·K)·ω_end, clipped to the envelope | the motor delivers drive + strain elastic + passive − damping, clipped to the window |
| Can the controller change torque without activation? | **yes**: anywhere inside the envelope, in one tick; and always downwards | **no**: a command changes torque only through u → a |

So the answer to Q2 depends on the path:
- **CURRENT V2:** activation governs **available** torque only. The 25 % excitation margin keeps the envelope ahead of the request.
- **S2:** activation governs **generated** active torque. The only other torque terms are mechanical: short-range stiffness on C's strain arms, passive B, damping, force–length and force–velocity.

## 2. How fast each path changes physical torque (Q3)

Isometric ankle fixture at the PPR-3 standing operating point (left ankle df; tonic active target −13.6 N·m, −21.4 N·m total with passive B). Same requested net-torque step for both.

| Request | CURRENT V2 | S2 actuator (active torque) |
|---|---|---|
| step up, −50 N·m | 10–90 % in **12.5 ms**; up to 5,271 N·m/s in one tick | 10–90 % in 33 ms (τ_act 15 ms) |
| step back down | **one tick (4.17 ms): 12,000 N·m/s** | 10–90 % in 108 ms (τ_deact 50 ms) |
| −2 N·m inside the envelope | **instantaneous** (one tick) | 33 ms |

**CURRENT V2.** Once the request is inside the envelope, the servo changes physical torque within one solver step, at unlimited slew. Decreases are never limited. Increases are limited only by the 15 ms activation rise of an envelope that is driven 25 % above the request.

**S2.** Physical active torque follows the command through a single first-order lag of 15 ms up and 50 ms down. Nothing else lies between command and force.

**Neither path has contraction dynamics.** There is no force-development stage between activation and force: no series elasticity taken up by the contractile element, and no cross-bridge recruitment kinetics. In Thelen 2003, the source of the 15 / 50 ms constants, those constants describe excitation → activation and are followed by tendon / contractile-element dynamics. V2 uses the constants without that second stage.

## 3. Where PPR-3's torque rise came from (Q4)

Both ankles, df axis, relative to the undisturbed twin. Data: the frozen battery's moderate (9.7 N·s) and large (36.4 N·s) forward pushes at t = 2 s. Each actuator plan is aligned with the step in which it acted. Output: `evidence/MUSCLE1_AUDIT.json` (`scripts/m1_audit.mjs`).

| | Moderate | Large |
|---|---|---|
| P2's requested torque (command): peak; max 25 ms slew | −50.2 N·m; **974 N·m/s** | −355.8 N·m; 3,645 |
| Active torque after activation (drive) | −51.5 N·m; **922** (activation passes 94.7 %) | −187.5 (capacity-limited); 3,418 (93.8 %) |
| Actual constraint torque | −62.4 N·m; **1,122** | −142.2; 3,453 |

**Over the 25 ms window where the actual torque rises fastest** (moderate, 121–146 ms after onset), −1,122 N·m/s splits as:

| Component | Slew (N·m/s) | Share | Pathway |
|---|---|---|---|
| active (P2 command through activation) | −922 | **82 %** | the command slews −974 there |
| strain-elastic (C) | −208 | **19 %** | mechanical: the ankle is being stretched |
| passive B | −13 | 1 % | mechanical |
| damping | +11 | −1 % | mechanical |
| window clamp / solver | +10 | −1 % | — |

The large push (108–133 ms) gives the same split: active 87 %, strain 23 %, passive 2 %, damping −6 %, clamp −5 %.

**Attribution:**

| Source | Share of the excessive rise | Note |
|---|---|---|
| **P2's requested command** | ≈ 85–90 % of the actual slew | Delayed COM / segment feedback with velocity terms produces a near-ramp of ≈ 50 N·m in ≈ 50 ms when the delayed sample of the post-push velocity arrives |
| **Activation dynamics** | attenuates the command's slew by only **5–6 %** | The 15 ms rise is short relative to the command's ≈ 50 ms ramp |
| **Servo / actuator dynamics** | **none in S2** | S2 has no request-servo path. CURRENT V2's servo would have passed the same command through even faster (§2) |
| **Intrinsic / passive mechanics** | +19–25 % on top | Immediate and physically correct in kind: an already-active, stretched muscle resists |

## 4. Verdict on the hypothesis

1. **For CURRENT V2's canonical actuator, Astra is correct, exactly as stated.** Activation bounds available torque; inside that bound the implicit motor changes torque in one tick, and downward changes are never rate-limited.
2. **For PPR-3's S2 actuator, the stated mechanism does not exist.** There is no servo inside an envelope: activation directly sets generated force. Yet PPR-3's corrective torque was still superhuman, for another reason:
   - S2's force production is **a single 15 ms first-order lag with no contraction dynamics**;
   - so P2's fast command reached the joint almost unchanged. About 95 % of the command's slew survived.
3. **The diagnosis is therefore not materially wrong.** Its conclusion holds for both paths: V2 has no physiological force-development stage. Its mechanism is specific to CURRENT V2.

**Consequence for MUSCLE-1.** The PPR-3 attribution moves part of the "superhuman torque" onto **P2's command shape**: about 85–90 % of the slew was requested by P2. Whether a human actuator would have attenuated that command is exactly what Experiments A and C test against human force-development data.

**Decision: proceed with MUSCLE-1.** This report and the final report state the S2 / CURRENT V2 distinction.

## 5. Reproduce

From the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:
- `node review_artifacts/physical_character_v2/muscle1/scripts/m1_capture.mjs --out <dir>`
  - regenerates the frozen undisturbed base and 6 pushes (plus the determinism job) with per-step actuator capture;
  - hashes are listed in `evidence/CAPTURE_INDEX.json`.
- `node review_artifacts/physical_character_v2/muscle1/scripts/m1_audit.mjs --capture <dir> --out <json>` re-runs the fixture validation, the servo-speed table and the decomposition.

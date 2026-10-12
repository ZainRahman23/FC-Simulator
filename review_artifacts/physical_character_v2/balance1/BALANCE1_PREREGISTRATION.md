# BALANCE-1 preregistration (frozen before any battery run)

**Instruction:** `sources/2026-10-12_user_instruction_overnight_m1b_adoption_balance1.md` (2f16fff4).

**Design history:** `BALANCE1_DESIGN_LOG.md` D0–D12, including the design-stage disclosure.

**Frozen files and hashes:** `BALANCE1_FREEZE.json`. Nothing listed there changes after this commit. A successor (§9) is a new, labelled file set with its own amendment, committed before its run.

## 1. What is being qualified

| Part | Frozen file | Summary |
|---|---|---|
| Body | `params/B1_BODY.json` → canonical M1b `MuscleLayer` (`sim/v2_muscle.js`, `spec/v2_muscles.js`) | Excitation-only force path: delay 2 steps → activation 15 / 50 ms → developed force (per-group τc) → intrinsic mechanics → joint torque. Every muscle group is canonical (literature §19.1; no override) |
| Candidate A | `params/B1_A.json` + `scripts/b1_ctrl.mjs` | Coordinated delayed feedback, no prediction |
| Candidate B | `params/B1_B.json` + `scripts/b1_ctrl.mjs` | A + limited model-based prediction of the ML COM mode (efference copy + known dynamics; re-anchored on each delayed observation) |
| Sensitivity bodies | `params/B1_BODY_SENS_LOW.json`, `params/B1_BODY_SENS_HIGH.json` | Every literature-ranged muscle group at the fast (low τc) / slow (high τc) end of its preregistered range |

**Controller structure (both variants; `b1_ctrl.mjs` header):**
- it runs every step from t = 0, with no trigger;
- each channel sees only its delayed sample;
- every command is logged with the sensed step index;
- output is a net-torque INTENT, converted by the canonical allocator to EXCITATION;
- no torque input, no muscle-state access or reset.

**Objectives:**
- COM relative to support (AP, ML), through the legs' static Jacobian;
- upper-body orientation groups (hips, lumbar, thoracic) and head;
- per-leg support length (knees);
- support symmetry (differential ankle);
- weak posture on axial hip/knee rotation and the arms.

**Delays (steps @ 240 Hz, rounded up; literature §19.2):**

| Channel | Steps | Latency | Pathway |
|---|---|---|---|
| COM → ankle / knee | 24 | 100 ms | |
| COM → hip | 18 | 75 ms | |
| Orientation offsets | 18 | 75 ms | |
| Orientation rate | 8 | 30 ms | proprioceptive velocity |
| Head | 6 | 22 ms | vestibulocollic |
| Leg (knees, support symmetry) | 24 | 100 ms | |
| Posture | 24 | 100 ms | |

**Gains:** human-normalised (Peterka / Pasma): kP 1.3–1.33, kD 0.45 s, kI 0.17 s⁻¹, × measured or derived gravitational stiffness. Support symmetry has kD 0 (D11). Motor noise cv 0.025 [D].

## 2. Settled standing state

**Entry:** the PPR-3 standing entry fixture (`ppr3/fixture/PPR3_STANDING_ENTRY.json`).
- The muscle layer is initialised at the rest-statics excitation (delay line, activation and developed force all equal to it).
- The controller history is the entry sample.

**Criterion U2** audits the first 250 ms: load, penetration, separation, COP–COM offset, pelvis, COM and joint drift. No hidden settling impulse exists. The audit proves it.

## 3. Battery (`scripts/b1_qualify.mjs`, B1B)

**Common protocol:**
- Runner alone (SOLO); PVP is sealed.
- 240 Hz; onset at step 480 (t = 2 s); 50 ms pelvis-COM pulse (12 steps); 4 s window.
- Every push is compared with the undisturbed twin.

**U — quiet standing:** 60 s (14,400 steps) with motor noise; sway from t = 2 s.

**P — pushes.** Four directions × four levels. Magnitudes are the centrals of the literature's human bands (§19.3.3), scaled to 73.9 kg. They are independent of this simulator.

| Level | Forward | Backward | Lateral (L / R) | Literature band | Expected human outcome |
|---|---|---|---|---|---|
| small | 6.5 | 4.0 | 7.5 | 5–8 / 3–5 / 6–9 N·s | feet in place |
| moderate | 12.0 | 8.5 | 15.0 | 10–14 / 7–10 / 13–17 | feet in place; hip/trunk added |
| limit (informational) | 19.5 | 13.5 | 23.0 | 16–23 / 11–16 / 20–26 | ≈ half of young adults step |
| over-limit | 28.0 | 19.5 | 32.5 | ≥ 26–30 / ≥ 18–21 / ≥ 30–35 | humans step or fall |

The lateral bands come from hip-width stance (low confidence). The character's stance is 0.42 m; no human data exist there.

**M — Rietdyk-form pushes:** 20 N·s over 350 ms, forward and left.

**T — no-step thresholds:**
- forward and left;
- 50 ms pulse;
- bisection over [0, 1.5 × the character's zero-delay limit];
- 7 iterations;
- J_lim forward 24.27 / backward 29.01 / lateral 62.22 N·s.

**D — determinism:** bit-identical reruns of 4 s standing and of the moderate forward push.

## 4. Human comparison ranges (reported with every result)

- **Quiet standing:**
  - COM RMS AP / ML 4.1–4.3 / 1.7–2.0 mm;
  - COP SD 4.6 ± 2.2 / 3.1 ± 0.9 mm, median frequency ≈ 0.3 Hz;
  - joint SDs ankle 0.21, knee 0.18, hip 0.30, neck 0.31° (Wang 2014);
  - the head moves with the trunk.
- **Pushes:**
  - first postural EMG 70–110 ms;
  - active torque onset 100–160 ms;
  - COM peak ≈ (0.24–0.34 s) × Δv, at 0.4–0.6 s;
  - overshoot ≤ ≈ 15 %;
  - return ≈ 1 s, settling 2–3 s;
  - ML moment share hips ≈ 85–90 %;
  - knee flexion ≈ 4–5°;
  - peak ankle torque ≤ ≈ 95 N·m;
  - joint-moment rate ≈ 250 N·m/s (platform) / 372 ± 267 N·m/s (lean release).
- **Thresholds:**
  - forward 16–23 N·s;
  - backward 11–16 N·s;
  - lateral 20–26 N·s (hip width);
  - ≈ 0.40–0.61 of the zero-delay limit (AP).

**Further reported metrics:**
- torque slew and peak per joint group;
- excursions;
- head vs thorax angular speed;
- per-foot load and asymmetry;
- muscle work (positive / negative);
- neural onset by family;
- low-passed COP RMS;
- muscle-state size;
- CPU.

## 5. Criteria (`scripts/b1_eval.mjs`, verbatim)

| ID | Criterion |
|---|---|
| U1 | [D] quiet standing 60 s with motor noise: no fall (COM within 100 mm of entry, pelvis drop < 150 mm), no stop |
| U2 | [D/S] first 250 ms: load steps 1–4 within ±10 % BW, steps 5–60 within ±1 %; penetration and separation ≤ 1 mm; COP within 5 mm of the COM projection from step 5; pelvis ≤ 1 mm, COM ≤ 2 mm, key-axis drift ≤ 0.5° |
| U3 | [D] no slow fold or creep: last-10-s mean vs 1–2 s mean — key axes ≤ 3°, pelvis ≤ 10 mm, COM ≤ 15 mm |
| U4 | [M/E] alive but bounded: COM sway RMS AP within [1.0, 12.9] mm, ML within [0.43, 6.0] mm (human 4.1–4.3 / 1.7–2.0, Foulger 2025, × [0.25, 3]) |
| U5 | [S] separation ≤ 5 mm and penetration ≤ 1 mm over 60 s |
| U6 | [M/D] quiet-standing joint-angle SD within [0.1, 0.6]° for both ankles (df), knees (flex), hips (flex) and the neck (flex) (Wang 2014 side-by-side stance: ankle 0.21, knee 0.18, hip 0.30, neck 0.31°; band ×0.5–2, literature §19.3.1) |
| P1 | small human-level pushes (fwd 6.5 / back 4.0 / lateral 7.5 N·s): recovered without a step (no fall; COM within 10 mm of the twin over the last 1 s; pelvis < 10 mm) |
| P2 | moderate human-level pushes (fwd 12.0 / back 8.5 / lateral 15.0 N·s): recovered without a step |
| P3 | over-limit pushes (fwd 28.0 / back 19.5 / lateral 32.5 N·s; humans step or fall): loss of no-step balance within 4 s in every direction — a feet-in-place save exceeds human capability |
| P4 | continuum: COM peak excursion strictly increases small < moderate < limit < over-limit in every direction |
| P5 | [causality] every push: commands bit-identical to the undisturbed twin until the disturbance reaches the controller's delayed observations; first command difference ≥ onset + 1 + the shortest channel delay; first activation difference not before it |
| P6 | [M] tiered latency (literature §19.3.4 / PPR-3 §1g): first neural torque change (developed force × entry capacity, > 0.1 N·m) (a) at ankle / knee / hip / lumbar / thoracic never before 30 ms (W0); (b) at the ankle (task-level) ≥ 85 ms; (c) for moderate pushes the first change among ankle / knee / hip / lumbar ≤ 200 ms. Also REPORTED (not judged): the PPR-3 form (≥ 60 ms in all four families) |
| P7 | [M weak] no superhuman corrective-torque rise: both-ankle AP torque max 25-ms slew ≤ 906 N·m/s for small and moderate forward / backward pushes (Robinovitch 2002 lean-release 372 ± 267 N·m/s, mean + 2 SD; PPR-3 S2+P2 moderate forward 1,122) |
| M1 | [M/E] Rietdyk-form pushes (20 N·s over 350 ms, AP and ML): recovered; COM peak within [24, 120] mm; time to peak within [0.25, 1.0] s; settled (within 10 mm) by 3.5 s |
| T1 | [M/E] no-step failure threshold (50 ms pelvis pulse): forward within [8.5, 19.4] N·s, lateral within [21.8, 49.8] N·s ([0.35, 0.80] × the zero-delay limit; humans ≈ 0.44–0.56) |
| DET | [S] bit-identical reruns (4 s standing; moderate forward push) |

**Changes from the PPR-3 S2 + P2 criteria,** all made BEFORE any battery run:
- **magnitudes:** literature human levels, plus limit and over-limit (P1–P4);
- **P6** is tiered as in literature §19.3.4. Proprioceptive velocity (30 ms) is a recognised early pathway; the task-level ankle latency is ≥ 85 ms. The PPR-3 form (≥ 60 ms everywhere) is still reported.
- **U6** joint SD is added (a literature human metric).
- **P7** (torque slew) is BALANCE-1's own criterion.

## 6. Comparison runs (reported; P7 is the verdict)

`scripts/b1_compare.mjs` runs the same small / moderate forward / backward pushes on two systems:
- **S2 + old P2:** PPR-3 frozen candidates, unchanged;
- **M1b + the adopted BALANCE-1 variant.**

It reports both-ankle AP torque slew and peak, so that "the superhuman P2 torque rise is gone" is shown at identical magnitudes.

## 7. A vs B adoption rule (`scripts/b1_decide.mjs`)

**B is adopted ONLY IF all three conditions hold:**
1. **No regression:** B passes every criterion A passes.
2. **Material human-likeness gain,** at least one of:
   - B passes a criterion A fails;
   - quiet-standing ML COM RMS distance to the human central (1.85 mm) reduced by ≥ 25 %;
   - mean settle time of the four moderate pushes reduced by ≥ 25 %.
3. **Not superhuman:**
   - thresholds ≤ 0.80 J_lim in both directions;
   - quiet COM RMS ≥ the U4 lower bounds;
   - every over-limit push falls;
   - B's first command difference is never earlier than A's.

**Otherwise A.**

## 8. Sensitivity (preregistered; reported, does not change the central verdict)

**Runs:** the full battery for both variants on `B1_BODY_SENS_LOW` and `B1_BODY_SENS_HIGH`.

**Robustness of the adopted variant:** U1, P1, P2, P3 and P5 pass at BOTH ends.

## 9. Recipient status mapping (applied to the adopted variant)

| Status | Condition |
|---|---|
| **A. QUALIFIED FOR OUT-OF-SAMPLE PVP VALIDATION** | every criterion passes at the central body, AND the sensitivity robustness of §8 holds |
| **B. PROMISING BUT BALANCE NOT YET QUALIFIED** | U1, P1 and P5 pass at the central body, but some other criterion or the robustness fails |
| **C. FUNDAMENTAL ARCHITECTURAL BLOCKER** | U1 or P5 fails for BOTH variants, or excitation-only control on the M1b body cannot stand quietly |

## 10. Failure handling

A principled successor is allowed only for a causal, measured failure:
- **Parameters:** evidence-based or derived, never searched.
- **Amendment:** each successor gets a labelled amendment section appended here and a new freeze, committed before its run.
- **Limit:** at most two successor rounds.
- **Preservation:** every failed result is preserved.

There is no visual tuning and no gain search.

## 11. Visuals and performance (after the verdict)

**Clips** (`render/b1_save_runs.mjs` → PPR-3 clip pipeline): CURRENT V2 | S2 + old P2 | M1b + BALANCE-1 (adopted variant).
- **Scenarios:** quiet; small forward; moderate forward; moderate lateral; over-limit forward. Magnitudes as §3.
- **Versions:** 1× and slow motion; gameplay and close camera; clean and overlay (skeleton / COM / support).

**Performance:**
- M1b layer, controller and total CPU per step;
- state sizes (muscle, controller);
- snapshot / restore cost;
- 22-player estimate.

## 12. Stop conditions (mission)

Stop instead of proceeding if progress would require any of:
- PVP;
- stepping;
- simulation / RUN-1 changes;
- guessed physiology;
- major anatomy changes;
- a visual parameter search.

PVP is not run.

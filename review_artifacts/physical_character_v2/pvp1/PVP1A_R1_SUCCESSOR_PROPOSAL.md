# PVP-1A-R1: proposed successor to PVP-1A (DRAFT PROPOSAL; not frozen, not implemented)

**Status:**
- Designed on 11 Oct 2026, **after** PVP-1A was BLOCKED and after the DX run and its post-hoc diagnostics had been observed.
- It is therefore **outcome-informed**. It is a separate, new experiment, never "PVP-1A rerun".
- **Nothing here has been built or stepped.**
- It needs your approval before any freeze.
- PVP-1A and PVP-1A-DX keep their results.

**Evidence base:**
- `PVP1A_STOP_H2.md`;
- `evidence/dx_run1/PVP1A_DX_EVAL_corrected.json`;
- `diag/PVP1A_DX_DIAGNOSTICS.md` (D1–D6, the cause classification).

## 1. What R1 would answer, and what it cannot

**Question.** With a valid, self-collision-free, limit-clear tackler entry, does native PvP contact on IB1-SR reproduce the authoritative contact:
- at the authoritative instant, segment and region (CG-1…6);
- with mechanically trusted bodies for **both** players through the impulse-response window;
- and does the physical **contact-induced** change in the runner's balance state agree in direction and size with the simulation's contact term?

**Cannot answer (stated before any run):**
- **Whether the runner "stumbles".** The simulation's STUMBLE is three recovery steps of 0.32 s each. Neither body has a stepping controller, so physics cannot execute or refute those steps (D5).
- **What happens after the first non-authoritative contact.** From about 260 ms the passive tackler's continued slide strikes the runner's pelvis with its head (D5). That event does not exist in the simulation.
- Anything about moving players / RUN-1, falls, recovery, or live gameplay.

## 2. Unchanged from PVP-1A

- the case facts (IB1-SR, V1.3 at 5042230, gameplay hash a2678624, read-only);
- the bodies (R0, V1-matched) and the world (combined spec in an unmodified V2JoltWorld, frozen G1_WORLD solver);
- the controllers (IFM-1 SnapshotTone, flags (1,1) / (0,0));
- τ_act 51.0 and the modes C0 / N2 / X2;
- CG-1…6;
- integrity and ledger thresholds;
- the X2 equivalence test;
- determinism and neutrality;
- CPU;
- the views A–D;
- no presentation RNG, no outcome switches, no hidden impulses, no writeback, no tuning to the label.

## 3. Changes, each tied to a classified cause

| id | change | cause addressed (diagnostics) | risk / honesty note |
|---|---|---|---|
| **R1-E1** | **Tackler entry contract.** An anatomical slide template replaces the full primitive fit (below). | H2 infeasible (representation mismatch); H3 arm self-overlap (D3) | this lowers the geometric bar on non-contact segments; correspondence at contact stays gated by CG-1…6 |
| **R1-E2** | **Joint-margin rule:** at entry, every free DOF is ≥ 5° inside its hard limit | D4: ankle_L at −60° drifts under load | changes the entry pose; frozen before any run |
| **R1-E3** | **Arm rule:** the lowest shoulder abduction on a fixed grid (30…90° step 5°, elbow 15°, other arm angles 0) giving ≥ 10 mm clearance to every enabled pair and to the turf | D3 (CF1 used 50° / 15°, chosen once) | deterministic; no outcome input |
| **R1-C1** | **C0 runner:** both boots loaded at every step **n ≥ 2**; step 1 may be unloaded only with pelvis drop ≤ 1 mm (the +0.5 mm grounding) | the preregistration conflict | the original "every step" wording is kept as a reported row |
| **R1-C2** | **C0 tackler:** boot forward point ≤ 20 mm from the authoritative LEG extreme at τ_sim; drift through the primary window **reported, not gated**; COM v_x > 0; integrity | an unactuated slide cannot follow a prescribed trajectory: internal torques cannot change COM momentum, only turf friction can, and turf μ is a frozen spec fact | **this relaxes a frozen PVP-1A criterion after its failure was seen.** That is why R1 is a different experiment. DX measured 18.3 mm at τ_sim, CF1 18.4 mm |
| **R1-I** | **Isolation:** each character must be bit-identical to a solo world in which it occupies **the same body-ID slot** (probe of D1). The cross-order difference is reported | D1: the frozen H6 is unattainable for the second-created character | bit-exact; stricter than the frozen 1e-6 tolerance in the matched slot |
| **R1-W** | **Window of claim:** inference ends at the earlier of (a) the first integrity failure and (b) the first **non-authoritative cross contact**, i.e. any pair that involves neither the struck runner leg (shank_R / foot_R) nor the tackler's lead leg. Later frames are labelled "NON-AUTHORITATIVE CONTACT: no outcome inference" | D5 | in DX, (b) would have ended inference at step 63 (262 ms) |
| **R1-O** | **Outcome rows.** The frozen OC-3 is retired as a gate for double-support runners. OC-3a and OC-3b replace it (below). OC-3 is still computed and reported | the frozen OC-3 is non-discriminating; under the simulation's own law, the **no-contact** baseline is FALL (eH 0.356) | OC-3a is expected to **fail** on IB1-SR (§5) |

**R1-E1, the tackler entry in detail:**
- **Template:** a frozen anatomical slide pose, defined by joint angles only:
  - lead (left) leg extended along the slide;
  - trail (right) leg tucked;
  - pelvis and trail thigh/shank resting on the turf at +0.5 mm;
  - trunk reclined to the authoritative BODY primitive's axis.
- **Fit:** only the contact-relevant degrees of freedom are fitted:
  - root yaw and position;
  - lead hip / knee / ankle.
- **Gates (contact-relevant only):**
  - lead boot forward point ≤ 10 mm;
  - lead shank line ≤ 20 mm;
  - grounding ≤ 30 mm (G-T4 unchanged).
- **Reported but not gated:** the residuals of the non-contact primitives (hip spacing, TUCK, TUCKSHIN, THIGH), labelled **REPRESENTATION_MISMATCH**. The primitives encode 0.265 m hip spacing against the body's 0.190 m.

**R1-O, the replacement outcome rows:**
- **OC-3a, contact-effect correspondence.** Δe is the physical contact-induced XcoM change (N2 − C0 at n\* = first contact + 0.060 s). It is compared with the simulation's contact term, which is reconstructed from its recorded err vector and the decisive event (dvCom, normal, tSup) with the simulation's formula.
  - Pass: direction within 30° **and** magnitude ratio in [0.5, 2].
- **OC-3b, physical recoverability within the window of claim:**
  - no runner non-foot turf contact;
  - pelvis drop ≤ 0.121 m;
  - every runner foot unloaded by the contact is reloaded inside the window, or still airborne at its end (reported as such).

## 4. Verdicts (same structure as PVP-1A)

| verdict | condition |
|---|---|
| **MECHANICAL PASS** | entries, C0 and isolation valid; CG-1…6; both players' primary mechanics valid; OC-3a **and** OC-3b; determinism; neutrality; visual review pending |
| **PARTIAL** | valid entries and C0, plus any of: a CG row fails while contact still occurs within ±1 tick; OC-3b passes while OC-3a fails; the window of claim ends inside the primary window |
| **ARCHITECTURAL FAILURE** | with valid entries and C0: PHYSICS_MISS; OC-3b fails; or primary NATIVE_INTEGRITY_FAILED |
| **BLOCKED** | provenance, entry, isolation, or any need to change physics, the solver, thresholds or the simulation |

## 5. Predictions to freeze with R1, from what is already known

| row | prediction | basis |
|---|---|---|
| entry | clean; no self-overlap; ankle margin ≥ 5° | CF1 |
| CG-1…6 | pass | DX, CF1 |
| tackler primary mechanics | pass | CF1 (clean to step 18 even with the ankle at its limit) |
| runner Δv at n\* | ≈ 0.20 m/s, mostly forward | DX, CF1, solver sweep |
| X2 vs N2 | not equivalent (≈ 71 mm / 5.8°) | DX, CF1 |
| **OC-3a** | **FAIL: direction ≈ 55° off** (physical forward vs the simulation's toward the left foot); magnitude ratio ≈ 0.72 | DX post-hoc |
| window of claim | ends at the head ↔ pelvis contact (≈ step 61–63) unless the R1-E1 template changes the tackler's trunk path | D5 |
| **expected verdict** | **PARTIAL** | the above |

**Because the predicted verdict is already known, R1 on IB1-SR is a development run, not a confirmation.**
- No independent held-out standing case exists among the 26 V1.3 fixtures:
  - rx_standing has the identical decisive contact (tick 52 sub 2, LEG → shin_R, J 75.64);
  - the other recoverable cases (rx_free_leg, rx_rear_diag) are running cases.
- A confirmatory test would need either:
  - a new authoritative fixture from the **unchanged** V1.3 simulation, with different contact geometry (your approval needed); or
  - the moving cases, after §6's blockers are resolved.

## 6. Relevance beyond IB1-SR (moving RUN-1 PvP)

- **Leg geometry.** The simulation's contact legs are 0.197 / 0.251 m (p50 / p90) from LV2's at 3 m/s, with 0 % within CG-4. Moving cases will fail CG-4 before any physics question arises (PVP1_SURVEY).
- **Running-presentation momentum** is incoherent (HG-A; IFM-1 HANDOFF_FAILED). A moving runner has no valid physical entry state yet.
- **The rigid foot matters most.** In IB1-SR, 89 % of the primary-window impulse is the boot riding under the rigid planted foot (foot_R ↔ foot_L, 38.8 of 43.8 N·s); the shin strike is 5.0 N·s. A toe joint or a compliant sole would change exactly this phase.
- **Planted-leg falls** (rx_lateral, rx_front_diag) need trusted bodies through large sustained loads. D4's limit drift is the first warning.
- **Controllers.**
  - Without a **stepping executor**, no STUMBLE / CORRECTION outcome can ever be tested physically. Such an executor would carry out the simulation's decided step plan; the simulation decides, physics executes.
  - Without a **slide drive** model, the tackler's post-contact path is not the simulation's.
  - Both are architecture decisions for you, not tuning. They are PVP-1B-scale work and are not started.

## 7. Sequence (if approved)

1. Freeze R1, including §5's predictions.
2. Build the template entry, the arm rule and the margin rule (geometry only), and run the entry checks.
3. Pre-run freeze of the implementation hashes, committed before any stepping.
4. Run C0 / N2 / X2 / SOLO (slot-matched), determinism and CPU.
5. Evaluate, render, report.

The harness exists (the PVP-1A-DX plant, runner, evaluator and renderer), so R1 is roughly half a day of work.

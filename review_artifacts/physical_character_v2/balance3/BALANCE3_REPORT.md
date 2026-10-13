# BALANCE-3 report: coordinated ankle–hip control for the P8 defect

**Instruction:** `sources/2026-10-13_user_instruction_balance3_coordinated_ankle_hip.md` (00:58, 13 Oct).

**Outcome: B3 is NOT QUALIFIED, and the stop condition is reached.**
- The one principled coordinated candidate, frozen before any run, performs worse than C3.
- Making a coordinated controller work on this body would need a redesign of C3's qualified COM objective, built from a multi-segment dynamic model of this body that does not yet exist. Its parameters would be unsupported, because human gains exist only for a rigid-trunk model's ankle and hip modes.
- As instructed, I stopped instead of tuning.
- **C3 remains the 16 / 17 baseline**, unchanged. No qualified no-step recipient baseline was frozen.
- PVP was not run.

**The 12 Oct publication** was completed under the project rule:
- V2 `903c12d` → `0055641` at 01:04;
- chronicle `touchline-current` `38496e4` → `702f130` at 01:05, with the 12 Oct entry plus Current state, Open problems and appendices;
- both verified; no owner screenshots.

## 1. Research (`research/BALANCE3_ANKLE_HIP_LITERATURE.md`; 34 sources, access levels and labels per number)

**Measured, robust across studies:**
- ankle and hip contributions **blend continuously**: hip torque is added to ankle torque, with no switch (Runge 1999; Park 2004 and Hong & Park 2025; Creath 2005; Zhang 2007);
- trunk and legs move **in phase below ≈ 1 Hz**;
- feedback is **cross-coupled**: hip torque responds to leg angle, ankle to trunk angle (Kiemel 2011; Boonstra 2013; Engelhart 2016);
- sagittal releases of about 4° are **"typically free of overshoot"** (Zelei 2021).

**Model fits to human data:**
- Alexandrov 2005 eigenmovement control: each sagittal mode is its own delayed PD loop on its own coordinate.
  - A (whole body): 120.8 ms, K_S 1.15, K_V 0.31 s;
  - **H (trunk against legs): 66.1 ms, K_S 1.15, K_V 0.17 s**, non-oscillatory, τ ≈ 0.48 s [E].
- Independent modal loops form coupled, symmetric joint gains.
- The ankle component accompanies a trunk correction and cancels its COM shift (Alexandrov 2001).

**Unknown:**
- numerical joint-space gain matrices;
- integral action in any fitted model;
- sagittal overshoot at COM peaks ≤ 40 mm;
- whether overshoot is scale-invariant.

**Flag (not acted on):** Rietdyk 1999's journal paper is medio-lateral. The A-P overshoot behind P8 comes from the thesis, which the earlier PPR-3 notes cite as read in full, but the research agent could not re-access it. P8 is unchanged. The only sagittal data (Zelei) are stricter.

## 2. Body audit (`BALANCE3_BODY_AUDIT.md`)

- **The P8 mechanism, quantified.** The HAT lean about the hips has **≈ 0 net low-frequency stiffness**:
  - beyond 0.5 s the body supplies 1.01 × gravity (M1b's persistent strain arm + passive B, inside the human passive range of 0.6–1.2 ×, Kiemel 2008);
  - the controller supplies ≈ 0 (the BALANCE-1 map defect);
  - the trunk therefore drifts back with τ ≈ 9 s.
- **The rigid two-segment model is wrong for this body.** In open-loop replay, hip torque moves the COM ≈ 7 × less than the model predicts, because the knees and spine are compliant.
- **This body's open-loop responses at 400 ms** (5 N·m, 200 ms pulses):
  - ankle: COM +2.6 mm, HAT −0.4°;
  - hip: COM −0.4 mm, HAT +0.5°;
  - lumbar: COM −1.6 mm, HAT +1.5°.
  - The spine, not the hips, is the soft link for trunk orientation, and the ankle is the only strong COM actuator.
- **C4's failure** was overlapping composite objectives. The hips and spine regulated composites that share mass, so the spine counter-rotated, giving a slow ≈ 5 s whole-body oscillation with hip and ankle torques in anti-phase.

## 3. B3 as frozen (`BALANCE3_PREREGISTRATION.md`, `b3/`; freeze `42130c7c`)

- **A-mode:** C3's COM objective, unchanged.
- **K-mode:** the existing knee objective.
- **H-mode, new:** an objective on the **mean hip angle**, chosen so it overlaps neither the spine nor the COM objective.
  - τ_H = −(1.15 · G_H · Δξ_H(t − 75 ms) + 0.17 s · G_H · ξ̇_H(t − 30 ms)), with G_H = 145.9 N·m/rad (entry statics);
  - Alexandrov's H-mode gains; no integral;
  - a **COM-neutral ankle companion** τ_A = 0.141 · τ_H, a ratio identified on this body.
- **Output** only through the M1b excitation interface. No event logic.
- **Before the freeze:** only a construction and sign check, which confirmed the hip-angle sign and the entry constants.

## 4. Results

**Frozen B2F battery: 14 / 17** (C3: 16 / 17).

| Criterion | C3 | B3 |
|---|---|---|
| P8, backward small | 0.287 | **0.34** (worse) |
| P2, forward moderate | settled | **not settled** in the tail window |
| P6, tiered latency | pass | **fail**: the hip responds at 58–71 ms, from the H-mode rate on the 30 ms channel |
| T1′ forward (band 10.15–14.21) | 12.09 | 11.80 |
| U1–U6, P1, P3, P4′, P5, P7, M1′, DET | pass | pass |

**BALANCE-3 rows** (12 s; back small, back moderate, fwd small, fwd moderate):

| Row | C3 | B3 |
|---|---|---|
| R1 recovery: max \|Δx\| after 3.5 s, mm (tolerance 4.1) | 4.5 / 7.4 / 2.9 / 6.1, **fails** (3 of 4) | 6.1 / 9.4 / 2.7 / 9.0, **fails** (3 of 4) |
| R2 HAT pitch after 3.5 s (≤ 1°) | 1.2 / 2.4 / 0.7 / 1.2°, **fails** (3 of 4) | 1.8 / 3.1 / 0.9 / 1.2°, **fails** (3 of 4) |
| R3 hip–ankle torque correlation (fighting if < −0.5, both RMS > 2 N·m) | −0.43 / −0.31 / −0.47 / −0.21, passes | **−0.77 / −0.77 / −0.77 / −0.52, fails** |
| L1 boot tip / L2 genuine falls | pass / pass | pass / pass (physical 11.78 = frozen 11.80) |
| Causality C1–C5 | (C1–C4) pass | **pass** (H-mode first reacts at step 489 = onset + 1 + 8) |
| Determinism | pass | **pass** (full B2F rerun bit-identical) |
| Muscle | back moderate peak activation 0.997 | 0.995 |

The "< 0.99" muscle row was a preregistration flaw: C3 also exceeds it, so it is not a B3 regression.

**Requested comparisons (C3 | B3):**

| Case | C3 | B3 |
|---|---|---|
| Backward small | overshoot 0.287, 4.5 mm after 3.5 s | 0.34, 6.1 mm |
| **Forward 12 N·s** | recovered | **falls at 2.68 s**, stiff at the hips, going over as a plank (still at +2.6 s) |
| Near-limit forward 14 N·s | falls at 1.65 s | falls at 1.63 s (genuine; legitimate) |
| Lateral 15 N·s | unchanged | unchanged (after 3.5 s 8.7 mm in both) |
| Quiet standing | COM RMS AP 1.52 mm | 1.15 mm |

**Visual review** (`review/BALANCE3_REVIEW.html`):
- 30 synchronized clips: C3 | B3, the 7 scenarios at normal speed and slow motion, plus the 12 s back-small case;
- 4 stills.
- The clips agree with the numbers: B3 stays straight at the hips and topples at 12 N·s, and the back-small differences are millimetre-level and invisible.

## 5. Why B3 failed (post-hoc; nothing was retuned)

1. **The dominant coupling runs from the ankle to the hip angle, not the other way.**
   - C3's ankle (COM) actions change the hip angle through trunk lag: an ankle pulse rotates the legs +0.47° while the trunk lags −0.41°, more than a hip pulse moves it (+0.54°).
   - The hip-mode loop therefore spends its effort reacting to the COM loop's own ankle actions, and fights them (correlation −0.77).
   - The COM-neutral companion addressed only the weak opposite direction, hip → COM.
2. **It removed the hip motion C3 used near its forward limit.** At 12 N·s, C3's hip and ankle torques run in phase (+0.79), which is the human hip contribution that grows with perturbation size (Runge; Park). A fixed-stiffness hip-angle objective resists it, so B3 falls.
3. **The spec error is not the cause.** A labelled post-hoc diagnostic put the rate term on the 75 ms channel, as Alexandrov's single-delay model specifies (`evidence/B3_POSTHOC_DIAG_RATE75.json`). It was worse: back small 0.41, correlation −0.83, and 12 N·s still falls.

**What a working coordinated controller would need.** In Alexandrov's modal framework, every mode's torque pattern is orthogonal (with respect to the body's mass matrix) to the others. That would mean:
- the COM loop's own torque pattern rebuilt so the trunk moves with the legs, replacing C3's static-Jacobian pattern;
- the mode patterns derived from an **identified multi-segment dynamic model of this body**, since the rigid two-segment model was shown wrong, and V2's spine is compliant (lumbar intrinsic 0.36 × gravity at low frequency);
- gains for the spine and any additional modes, for which there is **no sagittal human evidence**.

That is a controller-architecture redesign with unsupported parameters, so per your stop condition I am reporting rather than building it.

## 6. Owner decisions

1. **Accept C3 as the current no-step recipient baseline with P8 open** (back small 0.287 vs ≤ 0.26). The defect is a slow trunk-lean drift of a few millimetres, invisible on screen, and every other matched criterion passes.
2. **Authorise BALANCE-4, a full modal redesign**, with its own preregistration:
   - identify this body's multi-segment sagittal dynamics;
   - derive mutually non-interfering ankle- and hip-mode torque patterns, including a redesigned COM pattern;
   - accept that spine-mode parameters lack human evidence.
3. **Re-examine P8's human source.** The A-P overshoot figures could not be re-verified, and the only sagittal data say "no overshoot", which is stricter. Re-verifying the thesis numbers would settle what bound applies. This is not a request to weaken P8.

## 7. Commits and files (local; the 12 Oct day was published at 01:04–01:05)

**Commits:**
- `00556410`: BALANCE-3 instruction;
- `9662f997`, `ba2ce96f`: audit and identification;
- `42130c7c`: B3 freeze;
- this commit: results, review and report.

**Evidence** (`balance3/evidence/`):
- B2F verdict and battery: `B2F_V_BALANCE3_B3.json`, `B2F_Q_…`;
- causality, legitimacy, long-window and diagnostic: `B3_CAUSALITY.json`, `B3_LEGIT.json`, `B3_LONG_B3.json`, `B3_LONG_C3*.json`, `B3_POSTHOC_DIAG_RATE75*.json`.

**Outside Git:** the B3 review records (9 runs, 191 MB, `SHA256SUMS`) in `_preserved_2026-10-12_evidence_outside_git/…/balance3/records/`.

**Review:** http://127.0.0.1:8350/balance3/review/BALANCE3_REVIEW.html

# BALANCE-2: flat-sole forward criterion and the P8 backward-small overshoot

**Instruction:** `sources/2026-10-12_user_instruction_balance2_flat_sole_criterion_p8.md`.
- Retain the rigid flat foot.
- Audit and, if justified, correct the T1′ forward criterion to the loadable flat-sole edge.
- Rerun C3 unchanged.
- Investigate P8 causally and fix only that defect, with the smallest evidence-backed successor if one is genuinely required.
- PVP sealed.

**RECIPIENT STATUS: B. PROMISING — SPECIFIC BALANCE GAP REMAINS** (frozen C3 rule).
- The forward criterion was inconsistent and is now corrected.
- Unchanged C3 passes it: **16 / 17**, failing only P8.
- P8 is a genuine controller-side defect.
- The one declared minimal successor made it worse and was rejected by its frozen rule.
- **No controller is frozen as the qualified no-step recipient baseline**, because none passes the complete battery.
- Closing the gap needs a controller-architecture decision: coordinated ankle–hip control (§4).

## 1. Three capabilities, kept apart

Forward, 50 ms pelvis push. The no-step limit scales with the COM-to-front-edge distance d. The human "try not to step" fraction of that limit is 0.50–0.70.

| | Support distance d | Zero-delay no-step limit | Human-fraction band | Source |
|---|---|---|---|---|
| **Human anatomical capability** (toes load; toe rise extends the COP) | ≈ 150 mm (CoPmax 153 mm; toe tip 145–185) | ≈ 37–47 N·s at 73.9 kg | ≈ 19–27 N·s (Robert per-subject extrapolation 20.5 ± 3.3) | literature §4–5 |
| **Current V2 rigid-flat-foot capability** (loadable flat sole to the MTP1 corners) | **80.29 mm** | **20.30 N·s** | **10.15–14.21 N·s** (central 11.57) | `B2_GEOMETRY.json`; this criterion |
| *(V2 boot rocker: ruled not legitimate)* | *102.95 mm* | *26.03 N·s* | *13.01–18.22 (old B2M band)* | *B2M* |
| **Controller capability** (C3, measured) | Envelope 64.8 mm (oblique MTP line): **less** than the body offers | — | **12.09 N·s** = 0.595 of the body's flat-sole limit. Physical limit 12.13; beyond it, genuine falls | `B2F_V_BALANCE2_C3.json`, `C3_LEGIT_BALANCE2_C3.json` |

**The controller does not compensate for anything the body lacks.**
- It never loads the boot tip (L1: 0 in every recovered run).
- Its limit equals its physical limit (L2).
- It reaches a human-typical fraction of what the rigid flat foot allows, not more.
- The gap to human capability (≈ 12 vs ≈ 20 N·s) is the body's: no toe joint, so no toe-loaded reach. You chose to keep it.
- The remaining controller-side margin (12.09 vs the 14.21 band top, or the 20.30 zero-delay limit) is unused. That is acceptable, because C3 sits inside the human band.

**Backward:**
- human-matched band, at the heel edge 124.76 mm: 15.77–22.08 N·s;
- body capability: the heel edge, the same as the static support;
- C3: 20.23 N·s, rocking on the heel edge at most 9.3° near the limit (flat sole, legitimate).

**Lateral:** band 21.8–49.8; C3 25.88 / 26.61.

**P8 (overshoot):**
- **human:** ≈ 0.13 of the peak, response complete in 2–3 s;
- **body:** no cause; its history memory resists the offset (§3);
- **controller:** a slow upper-body lean mode lasting more than 12 s (§3).

## 2. Forward criterion: audit, correction, C3 rerun

Full derivation: `BALANCE2_FLAT_SOLE_CRITERION.md`. Frozen as `44e782dc` before use.

**Audit (holds).**
- The human fraction f (0.50–0.70) was normalised to each subject's *loadable* reach: measured CoP reach or toe tip.
- B2M normalised the fixture to the 102.95 mm static edge. That edge lies on the raised toe spring and is reachable only by pitching the boot onto its tip (≈ 7–10°). The criteria document called it "the boot rocker".
- With boot-tip support ruled out, the consistent normaliser is the loadable flat-sole edge, 80.29 mm. That is the two MTP1 corners, measured on the same settled entry as before, counting only loaded points.

**Correction.**
- T1′ forward [13.01, 18.22] → **[10.15, 14.21] N·s**.
- Everything else is unchanged: the battery and its magnitudes, U, D, backward, lateral, the fall rule and its edges, P1–P8, M1′.
- The forward push levels and M1′, which also scaled with d, are deliberately kept at their larger B2M values. They are more demanding for this body, so they cannot make any candidate easier to qualify.

**Uncertainty.**
- The band width is the human f.
- The d measurement (79.8–80.7 mm) and ω0 together move the band by under ±0.3 N·s.
- Choosing the 64.8 mm oblique-line plateau instead would give 8.19–11.47 N·s. I rejected it, because that plateau reflects how much ankle eversion the controller uses (controller capability), not the body's loadable support.

**C3 rerun, completely unchanged** (`evidence/B2F_Q_BALANCE2_C3.json`, `B2F_V_BALANCE2_C3.json`):
- **16 / 17, failing P8 only**, as predicted before applying;
- T1′ forward 12.09 ∈ [10.15, 14.21];
- every run's final hash is identical to the original B2M C3 evidence (determinism);
- C3's original 15 / 17 on B2M stays as history.

## 3. P8: why the backward-small overshoot remains

Full diagnosis: `p8/P8_DIAGNOSIS.md`. Data: `p8/evidence/P8_DIAGNOSTICS.json`.

**What 0.287 is.**
- After the backward push returns (≈ 1.6 s), the COM sits ≈ 3 mm *forward* of the twin, with a ±1.5 mm, 1.7 Hz ripple. The scored 4.8 mm is at 2.9 s.
- Over 12 s it is the first swing of a ≈ 9 s-period slow oscillation (−4.2 mm at 3 s, +4.2 mm at 7.5 s).
- Humans finish in 2–3 s.

**Cause, by single-factor ablation:**

| Question | Answer |
|---|---|
| Noise? | No. Noise off: 0.361 (worse) |
| Controller integrals? | Not the cause. With every integral held and noise off, so the controller is memoryless, the offset is still there (0.364) and decays with τ ≈ 9 s. The quiet-band AP integral adds ≈ 0.7 mm |
| Body memory? | No. Removing M1b's persistent strain arm *raises* it to 0.477: the body resists the offset |
| Test artifact? | No. The feet move < 0.1 mm against the twin. The offset is real, relative to the feet, and inside the response window |
| Where is it? | The upper body leans ≈ 1.2° forward about the hips (hip flexion +1.0°; legs upright). That carries 4.7 of the 5.7 mm |
| Why does it stay? | BALANCE-1's trunk-lean objective does not act at the hips front-to-back: its map there is ≈ 0 instead of ≈ −217 N·m/m per hip (C2 design log D6). The lean is held only by intrinsic hip stiffness and by the COM loop's hip rows, which need a COM error to produce hip torque |

**Is P8 matched?** Partly.
- The human ratio comes from one, larger push size (≈ 56 mm peak). Applying it to a 16.6 mm peak assumes scale invariance.
- In absolute terms the fixture's 4.8 mm is below the human 7–8 mm.
- But the slow, more-than-12 s response is non-human at every size (back moderate 0.232 carries the same mode).
- So P8 is not waived: the defect is genuine.

**Classification: controller-side.**

## 4. The successor attempt (one candidate, declared first)

Design log: `c4/C4_DESIGN_LOG.md`. Declaration `65373ab2`, result `010d03ca`.

**Constraints.** No gain search. No casual hip-map repair with existing gains. No gain increase either: the sagittal evidence does not support one. The hip eigenmode is ≈ 1.15 × gravitational (Alexandrov 2005), below BALANCE-1's 1.3. The only higher value, 1.7–1.9 trunk-mgh, is frontal-plane (Goodworth & Peterka).

**The smallest change the diagnosis supports:**
- **H1:** make BALANCE-1's declared trunk-lean P and D act at the hips (corrected map; kP 1.3 and kD 0.45 unchanged), keeping its AP integral at zero as it effectively was in C3.
- **Reference only:** the full repair with the existing gains, which you excluded.

**Result on the development set:**

| DEV case | C3 | H1 | Reference |
|---|---|---|---|
| back 6 | 0.311 | **0.455** | 0.439 |
| back 12 | 0.223 | 0.310, not settled | 0.299, not settled |
| fwd 5 | 0.045 | 0.169 | 0.171 |
| fwd 10 | settled 2.70 s | not settled | not settled |

H1 fails the frozen adoption rule. **No successor; C3 unchanged.**

**Why it fails.**
- In a two-segment body, hip torque that corrects the trunk drives the legs, and with them the COM, the other way.
- BALANCE-1 runs the COM objective and the trunk objective as independent loops. A working trunk loop therefore fights the COM loop.
- With it inactive (C3), the lean drifts slowly; with it active, the COM overshoots.

**What would close the gap: controller architecture, your decision.**
- Coordinated ankle–hip control: a COM objective that includes the trunk lean, or eigenmovement-based coordination (Alexandrov 2005).
- Or new sagittal human evidence for upper-body gains.
- Either needs its own preregistration. I did not start one.

## 5. Final-candidate checks (C3, unchanged)

- **Causality:** C1–C4 re-run, identical to the committed audit: PASS.
- **Determinism:** the B2F rerun is bit-identical to the original evidence, and DET passes.
- **Legitimacy:** L1 and L2 pass (same runs).
- **Visual:** a new 12 s back-small clip of C3 beside its twin, plus stills at +0.3 / 2.9 / 7.5 s (`p8/review/`). The scored 4.8 mm, ≈ 1° trunk lean is **not visible at viewing scale**: both figures are upright and flat-footed. The defect is a measurable slow posture mode, not a visible artifact. The 28 C3 clips from the previous step still apply.

## 6. Files and commits

| | |
|---|---|
| Criterion | `BALANCE2_FLAT_SOLE_CRITERION.md`, `criteria/b2f_eval.mjs`, `BALANCE2_FREEZE_B2F.json` |
| Evidence | `B2F_Q/V_BALANCE2_C3.json`, `p8/evidence/P8_DIAGNOSTICS.json`, `c4/dev/*.json` |
| Diagnosis | `p8/P8_DIAGNOSIS.md` and `p8/*.mjs` |
| Review | `p8/review/BALANCE2_B2F_P8_REVIEW.html`, at http://127.0.0.1:8350/balance2/p8/review/BALANCE2_B2F_P8_REVIEW.html |

**Commits** (all local, none pushed):
- `2b70f3d6`, `5773306f`: instruction;
- `44e782dc`: criterion freeze;
- `ae8177ff`: C3 on B2F;
- `65373ab2`: P8 diagnosis and C4 declaration;
- `010d03ca`: C4 result;
- this commit: report and review.

**Outside Git:** the 14 s P8 review records (79 MB, `SHA256SUMS_P8`) are in `_preserved_2026-10-12_evidence_outside_git/.../balance2/records/`.

**Not done:** PVP; any change to C3, gains, M1b, anatomy, stance, foot or support geometry, or the fall rule; the hip-map repair (tested only as the rejected candidate and the reference).

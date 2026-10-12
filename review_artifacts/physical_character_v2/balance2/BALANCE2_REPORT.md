# BALANCE-2 report: forward balance audit, correction and qualification

**Review page:** http://127.0.0.1:8350/balance2/review/BALANCE2_REVIEW.html

**Not touched:** PVP was not run. BALANCE-1, M1b, the matched criteria, anatomy, stance and foot geometry are unchanged; their freezes verify (BALANCE-1 28/28, B2M 12/12, C2 11/11).

## Sequence

| Step | Commit |
|---|---|
| Audit (§2–§10) and P4′ correction | `ae489400` |
| Matched battery B2M frozen | `0c0f5f2b` |
| Unchanged BALANCE-1 B run on B2M | `a32506b2` |
| Successor C2 preregistered and frozen, after development on a disjoint set | `4b6ebd98` |
| C2 run on B2M, plus the causality re-audit | `b995c13f` |
| Four-system battery | `ca218302` |
| Review clips, post-hoc diagnostics, this report | `85792a65` |

---

**1. Is the 16–23 N·s human forward comparison actually valid for our fixture?**

No (audit §2, literature audit). It mixed:
- a natural-stepping threshold (Emmens);
- one subject's extrapolated curve (Robert), whose shortest pulse was 150 ms;
- sub-threshold recovered pushes (Rietdyk thesis);
- an ML paper cited as AP evidence.

Its pulses were 150–370 ms, and it was normalised by mass only. Matched to this fixture (50 ms pulse, its own support distance), the evidence predicts **13.0–18.2 N·s**.

**2. Is the 103 mm COM-to-toe support margin human-like?**

Partly.
- 103 mm is the battery edge: the boot rocker, reached by ≈ 10° of boot pitch.
- The flat-foot loaded edge is 80 mm. The COP actually plateaus about 65 mm ahead (the oblique MTP line).
- Humans reach ≈ 150 mm dynamically using their toes.
- V2's rigid boot has no toe joint, but a strongly driven foot can pitch onto the boot tip (159 mm). C2 does exactly that (Q15).
- What counts as legitimate support is the open **support-representation decision**.

**3. Is V2 anatomy wrong, or was the stance/posture wrong?**

Neither (audit §3–4):
- foot length 0.153 × H;
- COM 60.5 mm ahead of the ankle, 22.5 % of foot length (human 3–6 cm);
- normal stance width and joint angles.

The forward limit comes from the **support representation** (the rigid boot with no toe loading). §11 (stance correction) was not triggered.

**4. What is the matched expected forward no-step limit?**

**14.83 N·s** for a 50 ms pulse, band [13.01, 18.22], from T = f · m · ω0 · d · 1.081 with:
- f = 0.57 (0.50–0.70, the "try not to step" datasets);
- d = 103 mm.

Sensitivity:

| d | T |
|---|---|
| 80 mm (flat foot) | 11.6 N·s |
| 149.5 mm (anatomical toe tip) | 21.5 N·s |

**5. Why did the 12 N·s case fail to settle?**

BALANCE-1 B (audit §6):
- The COP was pinned at the forefoot, with heels up for 2.39 s.
- The COM integral wound up while the command could not be delivered.
- The 100 ms COM channel had no AP prediction, so it kept pushing while the COM was already returning.
- The descent off the forefoot was unbraked until the heels landed.

The plantarflexors had 70 % reserve unused, so muscle strength was not the limit. C2 recovers the same push in 1.95 s with zero overshoot and heels down by about 1 s (DEV; F12 clip).

**6. Why did it overshoot backward?**

Two causes:
1. The wound-up COM integral, about 2 N, equivalent to a ≈ 4 mm offset on a ≈ 500 N/m net stiffness. It is still pushing when the heels land.
2. Delayed braking with no AP prediction.

The integral ablation confirmed (1). C2's integral gate plus support-aware prediction removes both: forward overshoot is 0.00–0.05.

**7. Why do backward/lateral cases succeed?**

Because their BALANCE-1 pushes were smaller relative to their support: 0.29 and 0.24 of the support limit, against 0.64 forward. At matched normalised difficulty, backward and lateral pushes **fall** where forward stands (audit §7). The control is not direction-specific.

**8. Is the 20 N·s fall actually abnormal?**

Not for flat-foot support.
- Observed recoverable impulse for the 350 ms form: 16.3 N·s.
- Expected at d = 80 mm: 15.5–21.6 N·s.
- The reference push itself was sub-threshold and wrongly sourced (audit §8).

**9. What was wrong with P4 and how was it corrected?**

P4 compared "peak excursions" across levels that included falls, where a post-fall peak is undefined. P4′ (frozen before any successor used it) tests:
- falls upward-closed;
- a graded peak below failure;
- graded time-to-fail;
- a graded pre-failure excursion at a fixed time.

BALANCE-1's original P4 failure stays on record.

**10. Final classification: G / Q / C / M / X?**

**X (mixed):**

| Code | Share |
|---|---|
| **Q** | Dominant for the recorded failures |
| **G** (support representation) | Dominant for absolute forward capacity |
| **C** | Secondary but real: wind-up, missing AP prediction, overshoot |
| **M** | Not limiting |

**11. What changed in BALANCE-2, if anything?**

**The criterion (§12).** Matched battery B2M, frozen before any candidate ran on it:
- AP magnitudes matched to the fixture (the backward bar rose);
- upper bounds against superhuman robustness;
- a new human-overshoot criterion, P8.

The unchanged BALANCE-1 B scores **16 / 17** on it, failing only P8: backward small 0.609, backward moderate 0.490, forward small 0.284, limit ≤ 0.26.

**The controller (§13).** Successor **C2** = BALANCE-1 B plus three diagnosed mechanisms. All output still goes through M1b; gains, delays, anatomy and stance are unchanged.
1. **AP COM integral confined to the quiet-standing band** (±10.6 mm = 2.58 × human COM sway RMS). It holds outside the band (anti-windup).
2. **AP prediction** with B's internal model, whose developed force is **bounded by the support** the entry geometry can transmit (front 64.8 / back 124.8 mm). The implied maximum ankle moment is 90.9 N·m vs Kim 2009's flat-foot 93.2 N·m.
3. **Direction-specific contraction constants** in the AP efference copy (canonical dorsiflexor group for dorsiflexion-direction force).

**Result: C2 scores 16 / 17, failing only P8 on backward small** (0.287 vs ≤ 0.26).
- Every other overshoot is ≤ 0.232.
- It fails nothing B passes, and the causality re-audit passes, so **C2 is adopted by the frozen rule**.

**Instructed but not adopted.** Four evidence-grounded **ankle → hip transitions** were tested on the development set; every one lowered forward capacity or degraded the near-limit response (design log D5). Also not adopted:
- a corrected HAT map (D6);
- a rigid-rotation COM map (D7).

**12. Did causality remain intact?**

Yes.
- **P5 on all 16 B2M pushes:** commands are bit-identical to the twin until 29.2 ms (onset + 1 + the 22 ms vestibulocollic channel). Activations never change earlier.
- **`b2_causality.mjs` on six pushes:**
  - C1: every logged observation index equals n − that channel's delay;
  - C2: commands are identical through the shortest delay;
  - C3: C2's new internal state (gated integral, gate, internal-model AP force history) stays bit-identical to the twin until step 505, which is onset + 1 + the 100 ms COM channel.

So the new mechanisms see the push only through delayed observations and the controller's own commands.

**13. Are torque/force-development rates still human-like?**

Yes. P7 passes. Both-ankle AP max 25 ms slew, N·m/s (limit 906):

| Push | C2 | B | S2 + P2 |
|---|---|---|---|
| Forward small | 198 | 154 | — |
| Forward moderate | 403 | 315 | 1,115 |
| Backward small | 318 | 248 | — |
| Backward moderate | 648 | 522 | 1,164 |

- **Latencies unchanged (P6):** ankle 121 ms, hip 100 ms, lumbar 54 ms.
- **Muscle work, forward moderate:** C2 9.7 / −12.3 J; B 8.5 / −10.7 J; S2 + P2 28.8 / −27.3 J.
- **Centroidal momentum change** after the 12 N·s push: the same for B and C2 (9.3).

**14. What is the final recoverable boundary in each direction?**

Frozen rule, 50 ms pulse, C2 (B in brackets): **forward 16.64 (14.36), backward 19.55 (18.19), left 25.88 (25.88), right 26.61 (27.34) N·s**. All are inside T1′ (forward fraction 0.64 of the zero-delay limit).

**But see Q15:** physically, C2's forward limit is ≈ 21.6 N·s.

**15. Can sufficiently large disturbances still genuinely topple the player?**

Yes in every direction, but **forward needs an owner decision**.
- **By the frozen rule:** every over-limit push is a loss of no-step balance (P3).
- **Physically** (post-hoc diagnostic, not a criterion; `B2_PHYSICAL_BOUNDARY_*.json`):
  - Backward and lateral pushes genuinely topple C2 (backward from ≈ 19.2 N·s).
  - **Forward, C2 rocks onto its rigid boot tips** (heels up to ≈ 16°, COM up to 138 mm ahead) and **returns to standing from up to 21.5 N·s**. It only genuinely falls from 23 N·s.
  - The frozen rule scores 16.6–21.5 N·s as falls, because its support edge is the static entry polygon.
  - B also reaches the boot tips (it ends 14.8–16.6 N·s still perched, without recovering) and falls from 18.2 N·s.
- **What it means:**
  - 21.6 N·s is close to a human *with toes* (matched 21.5 at d = 149.5 mm), but above the fixture's matched band (≤ 18.22).
  - The save is a rigid upright tiptoe rock with no arm or hip response (frames on the review page).
  - So C2's support-aware drive effectively **compensates for the rigid-toe limitation through control**, which you ruled out.
  - Capping the ankle at the flat-foot limit was already tested (design log D5, V5cap): the fixture then falls at 12 N·s. So whether boot-tip support is legitimate is a body decision, not something to patch in control.

**16. Did sway improve?**

Slightly, as a by-product. Quiet COM AP RMS 1.09 → **1.38 mm**, frequency 0.72 → **0.51 Hz** (human 4.1–4.3 mm).

The diagnostic shows the sway is entirely **motor-noise-driven** (0.18 mm with the noise off), scaling with the [D] noise level:

| cv | COM AP RMS |
|---|---|
| 0.05 | 3.3 mm |
| 0.1 | 7.6 mm |

So the deficit is the noise model (no sensory noise; motor cv 0.025), not controller bandwidth. Nothing was changed: a new noise level needs evidence.

**17. Did head/trunk coordination improve?**

No. Nothing was changed. The head / thorax peak-rate ratio in moderate pushes is 1.85–1.93 for C2 vs 1.71–1.88 for B. The head still turns about twice as fast as the trunk.

Related finding (design log D6):
- BALANCE-1's HAT lean loop is **inactive about the hips in AP**, because its gravity-load map is ≈ 0 (3.4 / 0.9 instead of ≈ −217 N·m/m per hip).
- Correcting the map with the declared gains worsens overshoot.
- A trunk-coordination redesign needs new gains, so it goes to you.

**18. Did knee posture improve?**

No. Knee excursion in moderate pushes is 1.0–2.0° (C2) vs 1.0–2.1° (B), against human ≈ 4°. The static stance is unchanged (§11 not triggered), so no stance correction could resolve it.

**19. CPU/determinism/state cost?**

- **Determinism:** bit-identical reruns (DET; the review runs are hashed).
- **CPU:** 60 s quiet standing took 12.3 s wall for C2 vs 14.9 s for B (same machine; within run-to-run variation; C2 runs the internal model twice per step).
- **State:**
  - muscle state unchanged at 448 floats;
  - controller adds 2 integrator scalars and one AP efference / prediction chain (the same structure B already ran for ML);
  - diagnostic logs (`diag`), which can be dropped in production.

**20. What surprised you?**

1. The frozen fall rule cannot tell a fall from a boot-tip save. C2's real forward limit is ≈ 21.6 N·s.
2. Every evidence-based hip strategy made this body *worse*. Leaning the trunk toward the push moves the COM forward faster than its shear helps.
3. BALANCE-1's trunk-lean loop was silently inactive at the hips in AP.
4. Plain AP prediction *lowered* the threshold (to 12.4 N·s). Its internal model assumed force the pinned COP could not deliver. Bounding it by the support fixed this.
5. The residual backward overshoot is body-side: M1b's history-dependent muscle state leaves the COM 2–5 mm forward after a backward push.
6. CURRENT V2 cannot stand 60 s (falls at 1.4 s). S2 + P2 is superhuman forward (24.3 N·s) and survives the over-limit forward push.

**21. What remains before PVP?**

**Owner decisions:**
1. **Support representation:** are boot-tip saves legitimate (toe-like support), or should the body be unable to perch? This sets d and the matched band, and decides whether C2's forward behaviour is acceptable. If not, revert to B (which also perches).
2. Whether the fall rule should follow the dynamic support rather than the static entry polygon. That would be a new, preregistered criterion, not a change to B2M.
3. The P8 backward-small gap (0.287 vs 0.26).
4. A genuine hip strategy and trunk-coordination redesign (the HAT map), which needs new gains.
5. An evidence-based sensory/motor noise model (sway).
6. Head–trunk coordination.
7. Knee excursion.

Then the preregistered PVP entry and one out-of-sample replay.

**22. Exact commits/files.**

**Commits** (branch `prototype/physical-character-v2`; all local and unpushed except the overdue publication, pushed earlier: `903c12d4` and touchline `38496e4f`):

| Commit | Contents |
|---|---|
| `4154eb41` | Instruction and authorization |
| `ae489400` | Audit and P4′ |
| `0c0f5f2b` | B2M freeze |
| `36f2e639` | Continue instruction |
| `a32506b2` | B on B2M |
| `4b6ebd98` | C2 freeze |
| `b995c13f` | C2 on B2M and causality |
| `ca218302` | Four-system battery |
| `85792a65` | Review, diagnostics, report |

**Files** (`review_artifacts/physical_character_v2/balance2/`):
- `BALANCE2_AUDIT.md`, `BALANCE2_MATCHED_CRITERIA.md`, `BALANCE2_SUCCESSOR_PREREGISTRATION.md`, `BALANCE2_REPORT.md`;
- `BALANCE2_FREEZE_{P4,B2M,C2}.json`;
- `successor/` (`b2_ctrl.mjs`, `params/C2.json`, `C2_DESIGN_LOG.md`, `dev/`);
- `scripts/` (`b2_qualify`, `b2_dev`, `b2_causality`, `b2_compare`, `b2_summary`, `b2_physical_boundary`, `b2_sway_noise`, and the audit scripts);
- `criteria/`;
- `evidence/` (`B2M_Q_*`, `B2M_V_*`, `B2M_COMPARE_*`, `B2_CAUSALITY_*`, `B2_PHYSICAL_BOUNDARY_*`, `B2_FINAL_SUMMARY`, `B2_SWAY_NOISE_DIAGNOSTIC_C2`);
- `render/`;
- `review/` (`BALANCE2_REVIEW.html`, 28 MP4s, frames).

**Outside Git:** review run records in `_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance2/records/` (413 MB, SHA256SUMS, FINAL_HASHES). The clip data (2.3 GB) regenerates deterministically from them.

**23. Exact localhost review URL.**

http://127.0.0.1:8350/balance2/review/BALANCE2_REVIEW.html

---

## RECIPIENT STATUS: **B. PROMISING — SPECIFIC BALANCE GAP REMAINS**

**By the preregistered rule.** The adopted M1b + C2 fails only P8 (backward small overshoot 0.287 vs 0.26). Everything else passes, including causality and the superhuman bounds as the frozen battery measures them.

**My judgement on top of that rule.** Do not go to PVP until you decide the support representation:
- the forward results, and whether C2 should be adopted at all, depend on whether boot-tip saves are acceptable (Q15);
- that is a body-architecture question, so in practice the next step is a C-type decision.

PVP was not run.

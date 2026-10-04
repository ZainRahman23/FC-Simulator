# Ankle law: results of the preregistered comparison (final pre-E1a stage, §4)

**Preregistration:** `ANKLE_LAW_PREREG.md` (commit 1926df6, before the official runs). **Evidence:** `evidence/gval/` (full G1 runs, scratch tree), `evidence/knee/`, `evidence/sweep/`, the policy battery and the yaw-anchor diagnostics.

## 1. Criteria per candidate

| criterion | k = 0 (control) | k = 0.13, current knee | k = 0.13, diagnostic envelope `lit1` | k = 0.13, diagnostic `shift` (zero shift only) |
|---|---|---|---|---|
| AL1 full G1 (gating rows; 1.V1 n/a in a scratch tree; rows 5 / 5c test conformance to the current spec, so they fail by construction for any knee change) | passes (accepted) | **fails 1.S, 1.S′:** prone-rest knee 2.39° (systematic: 13 / 15 perturbed members), plus elbow / lumbar settled excursions, impact15 elbow engine-stop ticks | **fails 1.S, 1.S′, 6, 8:** awkward knee engine-stop on every body (the envelope is too narrow for violent falls), upright hip 1.5–1.9°, impact15 elbow. The same failures appear at k = 0 with this envelope, plus 7.HS, so **the envelope itself breaks G1** | targeted: prone rest **0 / 15**, upright 0 / 15, V1-matched awkward 0 / 15; **V2-REF awkward 15 / 15 fail at the ELBOW** (settled 1.7–1.9°: the changed fall leaves the arm pinned). Ensemble: 16.3 % (§2) |
| AL2 energy | ✓ | ✓ (G1 energy rows pass) | ✓ | ✓ |
| AL3 unloaded plausibility (evidence 0.10–0.15 N·m/°) | ✗ (zero stiffness in ±10°) | ✓ | ✓ | ✓ |
| AL4 loaded behaviour (HO1 ≤ 15° and back within 3°; LIFT ≤ 5°) | HO1 12.5° / 4.3° back (**✗**); LIFT 7.9° (**✗**) | HO1 9.8° / 2.7°; LIFT 1.3° (✓) | (same controller behaviour) | (same) |
| AL5 morphology | — | ✓ (battery, 8 bodies) | — | — |
| AL6 rate | ✓ | ✓ (180 / 480 Hz harness and policy) | — | — |
| AL7 G2 / G3 with reference + lifecycle | — | — | G2: every re-measured gating row passes. G3 v3.3: 13 / 15 native rows; **I2 fails** (V2-long-legs touching foot drifts 5.0 mm under the lifecycle hold) and **K fails** (T11 over 1.2 stands instead of failing). Both are lifecycle behaviours at standing height | — |
| AL8 approaching single support (twist ≤ 3°) | ✗ (U:R / T5 5.0–5.1° under reference; 8–11° under the other policies) | ✓ (1.3°) | ✓ | ✓ |

## 2. Reading

1. **k = 0 is G1-valid but physically implausible.**
   - It has zero foot-axial stiffness in ±10°, against 0.10–0.15 N·m/° measured unloaded in vivo.
   - With it, no posture policy meets the preregistered semantics (`TWIST_POLICY_RESULTS.md`).
   - Single support has no yaw anchor inside ±10°.
2. **k = 0.13 (the evidence centre) gives the right controller-level behaviour** in every test:
   - twist ≤ 1.3° approaching single support;
   - LIFT 1.3°;
   - bounded single-support yaw;
   - rate-robust.

   **But it fails AL1.** Changing the passive plant changes the rest postures of passive falls. With every knee model tried, some rest trips G1's settled end-range tolerance (1.5°) somewhere:

   | knee model | where | how |
   |---|---|---|
   | current | knee, prone rest | systematic; the knee envelope's fixed zero places the natural deep-flexion internal rotation at the end range |
   | `lit1` | knee in "awkward" | the unfitted narrow envelope |
   | `shift` | elbow in V2-REF "awkward" | a pinned arm |

3. **The accepted plant itself fails a G1 criterion in 5 % of perturbed members** (chaotic marginality of rows 1.3d / 1.3b).
   - The established method (FP-9 lesson) compares perturbed failure **rates** before calling a regression.
   - With the current knee, k = 0.13 raised the rate to 11.3 % (runway) with a systematic case.
   - The envelope variants' rates are worse; see the table below.

**Perturbed G1 ensembles** (240 Hz; plane turf; V2-REF + V1-matched × 10 scenarios × 15 lift perturbations; 300 runs per cell; `evidence/sweep/`):

| knee model | k = 0 | k = 0.13 | scenarios failing systematically (≥ 3 of 15 members) |
|---|---|---|---|
| current (accepted; runway data) | **5.0 %** | 11.3 % | k = 0: none ≥ 5 (perturb 4 / 15, leanR 4 / 15); k = 0.13: **V1-matched perturb 13 / 15** (prone knee), upright 5–6 / 15 |
| diagnostic `lit1` (narrow, literature-shaped) | 14.7 % | 15.0 % | **awkward 15 / 15 on both bodies** (knee engine stop), V2-REF upright 7–13 / 15; 4 energy events at k = 0 |
| diagnostic `shift` (zero shift only) | 10.7 % | 16.3 % | **awkward 15 / 15 on both bodies.** The shifted internal hard limit lies beyond the unchanged Jolt emergency stop, so the knee meets the engine stop before its passive end-stop. At k = 0.13 also V1-matched upright 10 / 15, leanF 6 / 15 |

- **Neither diagnostic knee is a usable remedy.** The prone-rest failure disappears, but a systematic awkward-fall failure replaces it.
- **The engine emergency limits must follow any revised envelope.** For `shift` they did not.

## 3. Decision (by the preregistered rule)

- **No candidate with k > 0 meets AL1 under any knee model available now.**
- **The evidence-supported law (constant k ≈ 0.13) is therefore not adopted.**
- **k = 0 remains**, as the only G1-valid law. It fails AL3 / AL4 / AL8.
- **No law is sufficiently validated:** a supported number without a G1-valid plant to carry it.

**What would resolve it (evidence and decisions):**
1. **A knee axial envelope fitted to the bone-level data.**
   - Width and the internal zero shift with flexion, without the `lit1` narrowness that slams the knee in violent falls.
   - With G1 perturbed failure rates comparable to the accepted plant's 5 %.
2. **Your decision on how G1's settled end-range tolerance applies to passive-fall rest postures under a changed plant:**
   - (a) nominal pass / fail, as accepted;
   - (b) perturbed failure rate vs the accepted plant, the method the project already uses for these chaotic rows.

   That is a G1 criterion interpretation, so it is yours, and I have not applied it.
3. **Then** k = 0.13 + the reference posture policy, preregistered as in this stage.

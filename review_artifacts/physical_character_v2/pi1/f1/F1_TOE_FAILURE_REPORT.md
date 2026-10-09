# D-1F1 articulated toe body: body-level regression FAILS on energy passivity; no principled fix found. Toe work STOPPED (failure report)

**Authority:**
- `../../sources/2026-10-09_user_decision_option1_option2_correction.md` (Option 2);
- `../../sources/2026-10-09_user_instruction_overnight_autonomy.md` (§0 hard stop, §6 stop conditions).

**Frozen design:** `../CORRECTION_DESIGN_FROZEN.md` §2 (7c090de). Nothing in it was changed. §7 has no amendment.

**Verdict:**
- The frozen D-1F1 toe body builds exactly: mass, COM and inertia closure are exact, the record dimensions are matched, the existing hashes are unchanged, and it is deterministic.
- But at the accepted V2 configuration it **breaks energy passivity** (G1 1.2a / 1.2b) in drop1m and leanF.
- **Cause:** contact-lambda warm starting on the separate, light toe body's turf contacts.
  - No change confined to the foot / toe / contact representation removes the cause.
  - Both global solver alternatives that remove it introduce **other robust integrity failures**, and one also weakens resting-contact fidelity.
- Under the overnight instruction:
  - §0: "if the articulated toe cannot be made physically stable without materially weakening contact fidelity, violating energy/integrity requirements, or requiring broad redesign of V2, stop the toe work";
  - §6: "toe/contact stability requires a questionable physics workaround"; "V2 integrity materially regresses".
- **The toe work is stopped, and so is the dependent work:**
  - CHARCOLLIDE-1 (its radii and inscribed toe capsule come from the F1 boot) is not started;
  - PM-1 promotion evaluation is not started;
  - the slide-contact rebaseline, the gate rerun and PI-1 are not started.
- **Nothing is adopted.** The F1 code remains a default-off leaf extension.

## 1. What was built (default-off; nothing existing changes)

**Code:**
- `spec/v2_f1.js` (new): boot split at the hinge, toe mass properties, MTP joint definition, rear and front colliders.
- `spec/v2_spec.js`, `spec/v2_joints.js`: the F1 path runs only when `human.f1` is set, plus the generic `neutralKPerDeg` passive term.
- `spec/v2_pi1_runner.js`: `PI1_RUNNER_F1`, `pi1RunnerF1Spec`.

**Spec hashes (working tree vs HEAD 7c090de):** identical for the whole variation set and the F0 runner.

| spec | hash |
|---|---|
| V2-165-62 | 13fa5bfa |
| V2-175-70 | ca23788 |
| V2-REF | ceda2998 |
| V2-190-85 | 9044adba |
| V2-198-92 | f86d3971 |
| V2-long-legs | d5920ded |
| V2-short-legs | 5b56bcc8 |
| V1-matched | dd54edaa |
| runnerF0 | 62d5d797 |

**F1 construction checks (`f1_regression.json`): all pass.**
- F1.1: spec deterministic ×3.
- F1.2: foot + toe = the F0 foot exactly (Δm 0, ΔCOM 0, ΔI 8.7e-19).
- F1.3: heel 0.0808 / tip 0.2752 / hinge 0.1805 ahead and 0.031 above the studs, as recorded.
- F1.4: 10 rear + 4 front pieces carry every boot-hull vertex.
- F1.5: Jolt build of 16 bodies / 15 joints, mass readback exact.
- Toe mass 0.198 kg; foot 1.002 kg.

## 2. Body-level regression at the accepted configuration (240 Hz, 150 / 2, plane turf, v2k knee, ankle K 0.13)

`tools/pi1_f1_regression.mjs` → `f1_regression.json`. G1 ESSENTIAL scenarios, F1 vs the frozen F0 runner.

| scenario | F0 | F1 | MTP DF min / max (hard margin) |
|---|---|---|---|
| upright | pass | pass | −6.8 / 13.1° (28.3°) |
| **leanF** | pass | **FAIL 1.2a / 1.2b: +0.741 J in one step (t = 0.467 s)**; limit 0.5 J; F0 0.000 J | −0.4 / 34.3° (34.7°) |
| leanL | pass | pass | −2.7 / 12.2° (32.3°) |
| **singleLeg** | pass | **FAIL 1.4f** (explained, §4) | −2.3 / 22.4° (32.7°) |
| **drop1m** | pass | **FAIL 1.2a / 1.2b: +3.607 J in one step (t = 0.458 s, landing)**; F0 0.000 J | −30.1 / 2.1° (4.9°) |
| sideFirst | pass | pass | −7.4 / 2.4° (27.6°) |
| awkward | pass | pass | −12.5 / 34.8° (22.6°) |
| flatSupine | pass | pass | −1.0 / 0.4° (34.0°) |
| isoMomentum | pass | pass | −0.2 / 0.1° (34.8°) |
| isoSelfCol | FAIL 1.4d 24.59 mm (known; PI-1-scoped exception) | FAIL 1.4d 13.84 mm (improved) | −0.2 / 2.3° (34.8°) |

**Other properties:**
- **Determinism ×2:** identical (upright 10e1026f, drop1m 3334b509, awkward d5abd5b0).
- **MTP limits:** within its hard limits in every scenario. The minimum margin is 4.9° in drop1m.
- **Frozen requirement:** "energy passivity unchanged". **Not met.**

## 3. Measurement / tooling corrections (disclosed separately from the physical failures; none changes a physics result or an F0 hash)

| # | where | defect | correction |
|---|---|---|---|
| M1 | `gates/v2_g1.js` `firstNonFoot` | counted the toe (boot) as the first non-foot body contact | the regex is now `/^(foot\|toe)_/` |
| M2 | `gates/v2_g1.js` 1.4f sole classification | listed only `foot_L` / `foot_R`, so every toe sole contact was reported "non-boot" | toe bodies are added with their **own** plantar outline (`bootSole` of the toe body). Absent on F0, so F0 is identical. After M2, upright 1.4f passes; singleLeg 1.4f still fails for a genuine geometric reason (§4) |
| M3 | `tools/pi1_f1_regression.mjs` | G0's `g0Body` crashed on the toe body (it is written for the single-piece boot) | G0 is **not** edited and still runs on F0 as reference. F1 gets explicit construction checks F1.1 – F1.5 |
| M4 | `tools/pi1_f1_regression.mjs` | MTP angle display converted degree fields to degrees again and read a non-existent field | the display now reads the anatomical `anMin` / `anMax` and `marginMinDeg` |

## 4. singleLeg 1.4f: explained by the intended change (flagged)

**Scenario:** a single-leg stance with the right hip at 30° and the knee at 60°, which holds the raised right foot about 30° toe-down.

**What happens at release:**
- The record-length F1 boot (tip 0.275 m, F0 ≈ 0.22 m) brings the raised foot's toe tip to the turf.
- G1 then lifts the body so that the toe is the lowest point (0.5 mm), and the stance foot hangs 4.2 mm up.
- The only touch at t = 0 is the raised toe's tip. In F0 the raised foot cleared the turf by 24 mm.

**The same boot as one rigid body fails identically** (`f1_energy_diag.json`; 47 mm outside the outline). So the length, not the articulation, causes it.

**Classification:** this is a toe contact produced by the intended change. The frozen exception covers it. It is flagged for your review, not hidden.

## 5. Diagnosis of the energy rise (`tools/pi1_f1_energy_diag.mjs` → `f1_energy_diag.json`; `tools/pi1_f1_toe_variants.mjs` → `f1_toe_variants.json`)

**Per body and per joint at the jump step** (the probes are preserved unchanged in `probes/`):
- **drop1m:** passive U changes by only +0.016 J. Leg KE + PE rises (shanks +3.8 / +3.5 J, thighs +1.9 / +1.6 J) more than the trunk's falls. It is a single landing step, with the feet and toes all reaching the turf.
- **leanF:** F1 rolls forward onto its toes, with both ankles at ≈ 60° plantarflexion and the forearms striking the turf. Per-step energy swings are −5 to −78 J, and one step is +0.74 J.

**Localisation (one change at a time; 1.2a / 1.2b):**

| variant | drop1m rise | leanF rise |
|---|---|---|
| F1 frozen | **3.607 J FAIL** | **0.741 J FAIL** |
| MTP elastic terms off / damping off | 3.59 / 3.66 FAIL | 0.13 / 0.13 ok |
| toe engine-locked at 0° (no articulation) | **3.43 FAIL** | 0.13 ok |
| record-length boot as **one rigid body** | **0.000 ok** | 0.005 ok |
| T1: toe collider as one hull | 3.26 FAIL | 0.13 ok |
| **T2: toe body kept, turf contact removed** | **0.000 ok** | 0.10 ok |
| T3: toe inertia ×4 | 3.80 FAIL | 1.91 FAIL |
| T4: toe mass 18 % (spec upper bound) | 3.60 FAIL | 0.13 ok |
| T5: gap at the hinge line (toe 10 / 20 mm ahead; rear 10 / 20 mm behind) | 3.6 – 3.96 FAIL | 0.03 – 1.40 (mixed) |
| MTP-only joint warm-start reset | 3.36 FAIL | 5.78 FAIL |
| joint warm start off (all joints) | 1.36 FAIL | 5.21 FAIL |
| **contact-lambda warm start off** | **0.000 ok** | 0.054 ok |
| all warm start off | 0.000 ok | 0.000 ok |
| 600 velocity iterations | 0.000 ok | **5.90 FAIL** |
| 10 position iterations | 3.10 FAIL | 0.14 ok |
| **480 Hz** | **0.000 ok** | 0.078 ok |

**Established:** the rise needs both of these:
- (i) a **separate light body (0.198 kg) carrying turf contacts**. It persists with the articulation locked and vanishes when the same geometry is one rigid body, or when the toe has no turf contact;
- (ii) **contact-lambda warm starting**. Removing joint warm start does not help.

**Not explained by:** the toe's passive law, its mass or inertia within physiological bounds, the number of its pieces, or coincident contacts at the hinge line.

**Robustness** (G1's D4a ensembles, nominal + lift ±1 µm / ±10 µm; `tools/pi1_f1_candidates.mjs` → `f1_candidates.json`):
- drop1m fails in **5 / 5** members (3.597 – 3.616 J). Systematic.
- leanF fails in **3 / 5** (0.74 – 2.07 J).

## 6. Candidate fixes compared

**Leaf-local** (the preferred class, §0):
- None of T1 – T5 removes the drop1m rise. Neither do the toe passive-law variants or the toe lock.
- The only leaf-local change that does is removing the toe's turf contact (T2). That violates the requirement that the toe "remain a normal collision body" and would weaken contact fidelity. **Rejected.**

**Global solver changes** (would need a fresh versioned preregistration and full regression).

First, the exploratory full G1 ESSENTIAL set, F0 and F1 (`f1_energy_diag.json`):

| configuration | F0 | F1 |
|---|---|---|
| accepted 240 Hz | isoSelfCol 1.4d (known) | leanF 1.2a / b, drop1m 1.2a / b, singleLeg 1.4f (explained), isoSelfCol 1.4d |
| contact warm start off | **singleLeg 1.4b + 1.4e** (resting turf / self penetration 5.04 / 5.06 mm, above the slop), isoSelfCol | **awkward 1.3b** (Jolt emergency stop), singleLeg 1.4f, isoSelfCol |
| 480 Hz | **all pass** (isoSelfCol too) | **awkward 1.3b** (2 emergency-stop ticks at `hip_L.rot`), singleLeg 1.4f |

Then the ensembles (5 members each, `f1_candidates.json`):

| configuration / body | drop1m | leanF | awkward | singleLeg | CPU, ms per simulated s (one body) |
|---|---|---|---|---|---|
| F1 240 Hz | 0 / 5 pass | 2 / 5 | 5 / 5 | — | 120 – 161 |
| F1 480 Hz | 5 / 5 | 5 / 5 | **0 / 5** (1.3b, 2 ticks each) | — | 230 – 293 (≈ 1.85×) |
| F1 contact warm start off | 5 / 5 energy, but resting turf penetration 3.7 – 4.7 mm (240 Hz warm: 0.5 – 0.9) | 3 / 5 (1.4e; 1.2a + 1.2b + 1.4b) | **1 / 5** (1.3b) | — | 118 – 155 |
| F0 480 Hz | — | — | 5 / 5 | — | 208 – 210 |
| F0 contact warm start off | — | — | 5 / 5 | **3 / 5** (1.4b + 1.4e) | 107 – 121 |
| F0 240 Hz | — | — | — | 5 / 5 | 114 – 120 |

**Reading:**
- **Contact warm start off** removes the energy rise but weakens resting-contact fidelity, in F0 too: resting penetration up to 5 mm against the slop. It also robustly drives F1 awkward into the emergency stop. It is not a clean fix.
- **480 Hz** removes the rise and is otherwise clean for F0. But it **robustly** (5 / 5) drives F1 awkward into the hip's emergency stop. That is an integrity row that F1 passes at 240 Hz and F0 passes at 480 Hz. It also roughly doubles physics CPU (TD-1).
- Neither candidate passes the unchanged criteria. Adopting one would mean either a global change with a known failing integrity row, or loosening 1.3b or 1.4b / 1.4e after seeing failures. **Neither is permitted.**
- I did not search further rates or solver settings. That would be searching until something passes (§0: "Do not endlessly tune it overnight").

## 7. What this indicates

**Not a mapping or integration problem.**
- The defect is a numerical limitation of the V2 simulation stack: Jolt sequential impulses, contact-lambda warm starting, 240 Hz.
- It appears with a **light articulated body carrying ground contacts**, here the 0.198 kg forefoot under whole-body landing loads.
- It is independent of the toe's passive law, mass and inertia within physiological bounds, and of the collider tiling.

**Why the rest is blocked.**
- The presentation's toe-pivot frames (class C, `../PI1_V12_GATE_RESULTS.md` §3) still have no physically stable V2 counterpart.
- Under §6 ("evidence … suggesting a genuine underlying V2 body limitation rather than a mapping/integration problem"), development stops here.

## 8. Options (none started; each needs your decision)

1. **A time-boxed solver investigation, preregistered.**
   - Instrument Jolt's contact constraint manager to read per-manifold warm-start and solved lambdas on the toe pieces at the drop1m landing step.
   - Establish the exact mechanism, for example a speculative toe contact's preserved lambda being re-applied after the foot's own impact, or the order of contact versus joint solving.
   - Then judge whether a principled per-contact remedy exists.
   - Engineering only. No criterion changes.
2. **A versioned global configuration change with full preregistered regression**, accepting that it is a V2-wide change.
   - On current evidence, 480 Hz is the closest. Its blocker is a reproducible F1 awkward hip emergency-stop contact (1.3b). Investigating that would be part of the preregistration.
   - CPU roughly doubles for promoted bodies.
3. **Keep F0 (rigid boot) for PI-1 and resolve class C in the presentation instead**: the promoted body's foot drives the presented foot during promotion.
   - This is a presentation-side mapping change, the reverse direction of PM-1.
   - It needs your architectural decision, because the presented toe-pivot pose would change during promotion.
4. **Proceed with CHARCOLLIDE-1 (Option 1) alone,** using the record-length boot dimensions (they exist without articulation), as the corrected simulation baseline.
   - The contact-gate CG-1 / CG-5 issues could then be re-measured.
   - CG-7 (toe pivot) would still fail against a rigid V2 boot. PI-1 therefore stays blocked, but the gameplay-geometry half would be done and gated.

**My recommendation:**
- **Option 1 first, time-boxed:** it is the only route that could keep the toe without a global change.
- **Option 4 in parallel if you want progress:** it is independent of the physics and required in every scenario.

## 9. Evidence and reproduction (worktree root; all deterministic)

```
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_regression.mjs   review_artifacts/physical_character_v2/pi1/f1/f1_regression.json
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_energy_diag.mjs  review_artifacts/physical_character_v2/pi1/f1/f1_energy_diag.json
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_toe_variants.mjs review_artifacts/physical_character_v2/pi1/f1/f1_toe_variants.json
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_candidates.mjs  review_artifacts/physical_character_v2/pi1/f1/f1_candidates.json
```

**CPU figures** come from one interactive machine with no concurrent jobs during `f1_candidates.json`. They are indicative only.

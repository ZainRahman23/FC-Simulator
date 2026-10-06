# A + B swing-contract amendment AB2: PREREGISTRATION (versioned; the AB battery and its FAIL verdict are preserved unchanged)

**Authority:** user decision 2026-10-06, `../sources/2026-10-06_user_decision_AB2_coordinator.md` (verbatim).

**Supersedes nothing.** `AB_VALIDATION_PREREG.md`, `AB_VALIDATION_RESULTS.md` and `evidence_ab/` stand as a **failed** preregistered validation (AB-4a, AB-4b, AB-7). AB2 is a new, versioned contract with explicit ownership.

**Frozen in the commit that adds this file, before any AB2 run:**
- evaluator `tools/ab2_eval.mjs`, a copy of `tools/ab_eval.mjs` changed only as stated below;
- runner `scripts/run_ab2_val.sh`;
- run list `AB_RUN_LIST.json` (unchanged).

**Unchanged:**
- A and B implementations, configurations, harness (`tools/ab_val.mjs`) and the 1,728-run matrix;
- every threshold, including the E1a-7 torque limits;
- T-1.

**Known before freezing.** The AB diagnosis (`AB_VALIDATION_RESULTS.md` §2) is known: the remaining β_y miss lies in the first ≈ 90 ms after liftoff, and the 7 continuity violations lie within −2 … +5 ticks of contact.
- The phase boundaries below are defined by lifecycle and measured-contact semantics, not from those values.
- The simulation is deterministic and A / B are unchanged, so AB2's records are expected to be **bit-identical** to the AB battery's. That is checked (§4), and the verdict is computed from the fresh AB2 records.

## 1. Ownership split

| subsystem | owned by | region (semantic definition) |
|---|---|---|
| airborne swing compensation (A) | **AB2-7** | from the first tick at which the lifecycle reports the swing foot **genuinely airborne**: state AIRBORNE **and** airborne weight a = 1 (the lifecycle's own "fully airborne", at which the swing servo has full authority), to φ 0.8. The liftoff transient [measured liftoff, that tick) is a **separate diagnostic** (β_y per configuration), not gated |
| swing torque continuity | **AB2-4a** | from the measured liftoff up to, **not including**, the solver step that contains the first measured Jolt contact of the swing foot. t_nc = (first tick with touching pieces) − dt. Unchanged rule and limits |
| contact-transition torque continuity | **the touchdown coordinator's validation** | [t_nc, the landed foot's first SUPPORT). **Not exempted.** AB2 reports it (runs with violations, max commanded / applied Δτ) per configuration. The 7 AB failures stand as the requirement the coordinator must eliminate without raising any limit |
| no-regression of continuity | **AB2-4b** | E1a-7 violations **outside** the contact-transition region: AB runs ≤ BASE runs, per set |

## 2. Criteria

Identical to `AB_VALIDATION_PREREG.md` §4 (AB-1 … AB-10, I-1, I-4 … I-7, L-1, L-2, G-3, C-1 … C-3) except:

- **AB2-4a:** the swing window ends at t_nc instead of 2 ticks before the lifecycle's contact state.
- **AB2-4b:** violations outside [t_nc, SUPPORT) only.
- **AB2-7:** the pooled vertical β_y over the airborne window, AB and A ≤ 0.5 × BASE over the same window, per R / C trajectory id. The threshold is unchanged.
- **Reported (not gated):**
  - the liftoff-transient β_y per configuration;
  - the contact-transition continuity per set and configuration;
  - the mean φ at which a = 1.

**Stop rule:** if AB2 fails for any reason outside the re-owned regions, stop and diagnose. If it passes:
- A + B are frozen as qualified **swing** mechanisms;
- the touchdown coordinator stage starts;
- the contact-transition continuity becomes a gating requirement of the coordinator's validation.

## 3. Run

`scripts/run_ab2_val.sh`: the same frozen 1,728-run list, harness and clean archived tree, evaluated by `tools/ab2_eval.mjs` into `evidence_ab2/`.

## 4. Determinism check (reported)

Each AB2 record's end-of-run hash is compared with the AB battery's record of the same run.

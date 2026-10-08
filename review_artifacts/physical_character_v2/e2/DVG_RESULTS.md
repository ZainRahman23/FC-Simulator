# DVG combined qualification: DOES NOT VALIDATE as preregistered (CQ-1b, CQ-3a) → STOPPED before adoption and TD2C

**Authority:** `../sources/2026-10-08_user_decision_rate_ff_guard_combined_qualification.md`.

**Preregistration:** `DVG_PREREG.md`:
- §§0 – 7 committed in b25f0b0, before any DVG code;
- freeze step 2 with amendments A1 – A4 in b08b77a;
- erratum E1 and freeze step 2b with amendment A5 in 7de6c00.

**Battery:** `scripts/run_dvg_cq.sh` on a clean archive of 7de6c00 (01:13 – 02:15). 1,522 / 1,522 jobs:
- reach stress 528, repeats 24, mirror probes 24;
- AB 432, SV-2 servo-on 438;
- E1a 10 + E1b 28, each with the guard on and off.

**Evidence** (`evidence_dvg/`):
- `dvg_eval_summary.txt`, `dvg_eval.json.gz`;
- logs and guard traces, stress records, mirror probes, identity;
- `sv2_eval_guarded.txt`;
- `diagnostics/` (post-hoc, labelled);
- `aborted_first_run_b08b77a/` (the first run, aborted unevaluated: erratum E1).

**Stop rule applied:**
- DVG is **not adopted**; the TD2C battery was **not run**;
- no E2 integration, no SV-2 re-qualification, no PG-1, no official E2.

D1G v1, TD2 and TD2B stay FAIL. Nothing is pushed.

## 1. Verdicts

| item | result | detail |
|---|---|---|
| CQ-0 identity | **PASS** | KV0 IDENTICAL, 58 / 58, every reference hash, D1G v1 record d823bca7 |
| CQ-1a AB nominal (AB2) | **PASS** | 432 / 432 **bit-identical** to the TD2B AB runs; zero engagements |
| **CQ-1b SV-2 servo-on** | **FAIL** (2 items) | 432 / 432 non-engaged runs bit-identical. 6 engaged: V2-long-legs C-L11, both legs, 3 rates. **At 180 Hz, SV-2's I-4 (saturation ≤ 5 % of swing rows) newly fails: 5.17 % vs 4.26 % unguarded** (§2.1) |
| CQ-1c E1a / E1b (PSTAR4) | **PASS** | 38 / 38 bit-identical to the guard-off runs, incl. the P15 aborts / put-downs; zero engagements |
| CQ-2 reach stress (192 DVG runs) | **PASS** | finite; 0 over-capacity; applied joint-rate commands ≤ **0.352 ×** their force–velocity limit; every fade source V4-valid; every stress engaged |
| **CQ-3a mirror probe** | **FAIL** (1 sample, 3 items) | 4,056 samples: flags, λ and valid-sample D1 (≤ 1.1 · 10⁻⁷ N·m) agree; 13 IK-fold samples reported (TD-17). **1 mismatch gated because the classifier missed it as a fold:** a knee coordinate 4.5 · 10⁻¹⁰ rad inside its soft bound (§2.2) |
| CQ-3b L / R pairs | **PASS** | 96 / 96 same engagement and outcome class (fell / abort) |
| CQ-4a / b determinism | **PASS** | 24 / 24 repeats identical (hashes and guard logs); engagement consistent across 180 / 240 / 480 Hz |
| CQ-5 energy | **PASS** | 24 E1a-8 failures in the frozen sets, all 180 Hz deep / diag (Σ+ 0.507 – 0.635 J), **all attributed** to the pre-existing integration debt TD-15 by the preregistered rule (excess over the no-feed-forward reference ≤ 0.045 J; per-tick closure ≤ 0.0241 J, equal to the reference's) |
| CQ-6 guard law | **PASS** | exact law, held source, weight law and slew reference on every guarded tick of every DVG run, including after release (CQ-6x) and the engaged SV-2 runs. Guard-attributable step ≤ **0.66 ×** the E1a-7 commanded bound (max 26.5 N·m at 180 Hz, bound 40) |

**Reported:**

**Guard off vs on, reach stress:**

| | guard off | DVG |
|---|---|---|
| max commanded \|τ0\| | 1.3 · 10¹⁷ – 4.4 · 10²¹ N·m | ≤ 1.35 · 10³ N·m |
| max closure per tick | up to 477 J | ≤ 0.155 J |
| max Σ+ | up to 2,499 J | ≤ 0.89 J |
| aborts / falls | 25 / 34 | 0 / 36 (all deep; also falls in R0) |
| B_cmd | 144 / 144 runs above (historical, reported) | 0 runs above |

**CQ-6x energy** (release set; reported): 32 runs fail E1a-8 (180 / 240 Hz), against their R0 references, e.g. V2-REF 180 Hz 0.585 vs 0.564 J. The largest L / R Σ+ difference in any pair is 0.16 J, V2-198-92 deepRel 240 Hz; outside deepRel it is ≤ 0.008 J.

## 2. Diagnosis of the two failures (`diagnostics/`)

### 2.1 CQ-1b: SV-2 C-L11 on V2-long-legs, an out-of-envelope trajectory

SV-2 had already recorded this trajectory as **certified reachable but unreachable in execution**; the planner's reach certificate rejects it for the other 7 bodies.

| SV-2 item, 180 Hz (L / R) | unguarded (SV-2 battery) | DVG |
|---|---|---|
| I-2 applied Δτ max (violations) | 162 – 184 N·m (21 – 25) | **9.2 – 9.6 N·m (0)** |
| I-2 commanded Δτ0 max | 1.6 · 10¹³ – 3.2 · 10¹³ N·m | **65.5 N·m** (8 violations) |
| I-3 energy | **FAIL:** closure 0.63 – 5.39 J per tick, Σ+ 2.0 – 8.0 J | **PASS** |
| I-4 saturation | 4.26 % / 22 ms (passed) | **5.17 % / 33 ms (fails 5 %)** |
| I-6 single touchdown | FAIL (rebounds) | FAIL (rebounds) |

At 240 / 480 Hz, I-4 already failed unguarded (5.6 %; 10.9 % / 60 ms). With DVG it is 5.2 % at every rate.

- **The newly failing item:** 6 of 116 swing rows (33 ms) on one knee axis saturate during the guard's fade (7.894 – 7.922 s; fade 7.833 – 7.961 s), while the leg reaches for the unreachable target.
- **Every other measure improves:** the blow-up is removed, energy integrity is restored, and saturation becomes rate-consistent.
- Under the preregistered rule ("no newly failing item"), this is a **FAIL**.

### 2.2 CQ-3a: a fold the classifier missed (a mechanical tool defect)

- **The sample:** V2-165-62 diag, t 9.7875. The left solve is unreached (residual 1.35 · 10⁻⁴); the right reaches (3.7 · 10⁻¹⁶).
- **The left knee coordinate is 4.508 · 10⁻¹⁰ rad inside its soft bound** (margin 0.000°). The bounded IK's exact `atBound` flag is false, so the evaluator's fold rule (which tests that flag) did not classify it.
- Under a 10⁻¹³ relative input perturbation, the left solve reaches (5.9 · 10⁻¹⁶), the mirror side's answer: the same active-set basin boundary as the other 13 fold samples and the 4 D1G ones.
- **By the preregistered definition** ("the unreached side ends with a coordinate on its soft bound") this is an IK-fold sample. The tool's exact-flag test is stricter than the definition, which makes this a mechanical tool defect (erratum and re-evaluation on the same runs). **It is not re-evaluated here:** the CQ verdict is FAIL on CQ-1b regardless.

## 3. Decisions needed (none taken)

1. **CQ-1b.** Whether the C-L11 / V2-long-legs runs (outside the executable envelope; failing SV-2's I-2 and I-6 with or without the guard) are judged by "no newly failing item" or by no material worsening. With the guard, I-4 at 180 Hz moves 4.26 → 5.17 %, while I-2 (applied), I-3 and the blow-up are resolved. Options:
   - (a) accept as non-material for an out-of-envelope run; record it;
   - (b) treat as substantive, i.e. investigate saturation during the guard's fade (no tuning of thresholds or the law without your decision);
   - (c) other.
2. **CQ-3a erratum.** Classify a coordinate within 10⁻⁶ rad of its soft bound as "on its soft bound" (the IK's own reach tolerance scale). Re-run the 24 deterministic mirror probes with the margins recorded, and re-evaluate. Expected: the sample becomes the 14th fold, and CQ-3a passes.
3. **If 1 and 2 resolve:**
   - adopt DVG;
   - apply the prepared TD2C amendment (configuration names and DVG's guard law only);
   - run the frozen TD2C battery;
   - on a pass: E2 integration (drafted in a scratch tree: a non-test step runs approach → search → measured TOUCHDOWN → acceptance → DONE) → SV-2 re-qualification → PG-1 → prerequisites → official E2.

**Recommendation:** 1 (a) and 2. The guard does what you required everywhere the battery exercises it, and the two failures are:
- a 0.17-point saturation change on a run that is outside the envelope and already failing;
- a classifier precision defect.

Both are your call under the stop rule.

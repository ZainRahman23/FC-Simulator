# DVG2 qualification: PASS (after evaluator erratum E1) → DVG adopted

**Authority:** `../sources/2026-10-08_user_instruction_overnight_dvg2_td2c_e2.md` (item 1).

**Preregistration and freeze:** `DVG2_PREREG.md` (`d426ceb`, before any DVG2 run).

**Battery:** `scripts/run_dvg2.sh` on a clean archive of `d426ceb` (03:56 – 04:49):
- step 0: 480 certifier runs;
- 12 class-B extras;
- the frozen CQ battery of 1,522 jobs (mirror probes by `dvg2_unit`);
- CQ-0 identity.

**Evidence:** `evidence_dvg2/`:
- `classification/` (the certifier logs, `cls.json`);
- `dvg2_eval_summary_ORIGINAL.txt` and `dvg2_eval_summary.txt` (after E1);
- unit records, logs, the engaged guard traces;
- `sv2_eval_guarded.txt`;
- `determinism_vs_cq.txt`.

**The DVG CQ stays FAIL as recorded** (`DVG_RESULTS.md`). DVG2 is a separate, versioned qualification of the same, unchanged implementation.

## 1. Verdicts

| item | result | detail |
|---|---|---|
| CQ-CLS classification | **PASS** | 480 / 480 certifier runs: class A 432, class B 48 (every C-L11 case; V2-long-legs by replay at 180 / 240 / 480 Hz, the other 7 bodies positional). The 240 Hz verdicts are identical to the 6 Oct sweep, line for line (0 differences). 6 class-B cases are in the SV-2 servo-on list: V2-long-legs C-L11, L / R, 3 rates |
| CQ-0 identity | **PASS** | 12 PASS lines; KV0 IDENTICAL |
| CQ-1a AB | **PASS** | 432 / 432 bit-identical; 0 engagements |
| CQ-1b SV-2 (non-engaged) | **PASS** | 432 / 432 bit-identical |
| CQ-1b class A (engaged) | **PASS** | no class-A run engages |
| **CQ-1b class B (engaged)** | **PASS** (after E1) | the 6 V2-long-legs C-L11 runs: B-1 … B-8 all pass (§2) |
| CQ-1c E1a / E1b | **PASS** | 38 / 38 bit-identical; 0 engagements |
| CQ-2 reach stress | **PASS** | as CQ (bit-identical) |
| **CQ-3a mirror** (corrected classifier) | **PASS** | 4,056 samples. 14 IK folds: 13 under the exact flag, as in CQ, plus 1 newly classified (V2-165-62 diag t 9.7875, margin 4.51 · 10⁻¹⁰ rad), which is **mirror-equivalent** (2 of 4 perturbed solves reach: 5.2e-16, 7.9e-16). Valid-sample D1 ≤ 1.07 · 10⁻⁷ N·m |
| CQ-3b L / R pairs | **PASS** | 96 / 96 |
| CQ-4a / b determinism | **PASS** | 24 / 24 repeats identical; engagement consistent across rates |
| CQ-5 energy | **PASS** | 24 E1a-8 failures (180 Hz deep / diag), all attributed to TD-15 by the frozen rule, as in CQ |
| CQ-6 guard law | **PASS** | as CQ |
| **Determinism vs the DVG CQ battery** | identical | **1,496 / 1,496** common runs have identical end hashes (same code) |

## 2. Class B: the 6 engaged V2-long-legs C-L11 runs

| run | saturation, DVG | unguarded | safety items failing, DVG / off | max \|Δτ0\| | certifier with DVG |
|---|---|---|---|---|---|
| L 180 | 5.17 % / 33.3 ms | 4.26 % / 22.2 ms | I-6 / I-3, I-6 | 65.5 N·m | NOT QUALIFIED |
| L 240 | 5.23 % / 33.3 ms | 5.56 % / 29.2 ms | I-6 / I-3, I-6 | 48.2 | NOT QUALIFIED |
| L 480 | 5.25 % / 31.3 ms | 10.90 % / 60.4 ms | I-6 / I-3, I-6, sat > 50 ms | 45.3 | NOT QUALIFIED |
| R 180 | 5.17 % / 33.3 ms | 4.26 % / 22.2 ms | I-6 / I-3, I-6 | 65.5 | NOT QUALIFIED |
| R 240 | 5.23 % / 33.3 ms | 5.56 % / 29.2 ms | I-6 / I-3, I-6 | 48.2 | NOT QUALIFIED |
| R 480 | 5.25 % / 31.3 ms | 7.06 % / 37.5 ms | I-6 / I-3, I-6 | 45.5 | NOT QUALIFIED |

**What each gate showed:**
- **B-1:** finite series and rows, V4-valid sources, rate envelope < 1.
- **B-2:** over-capacity 0.
- **B-3:** E1a-8 holds; e.g. L 180 has closure max 0.019 J per tick and Σ+ 0.148 J, where the unguarded run fails I-3.
- **B-4:** the guard law holds.
- **B-5:** the guarded safety-item set {I-6} is a subset of the unguarded {I-3, I-6} in every run; the guard adds no unsafe outcome and removes the energy failure.
- **B-6:** longest continuous saturation ≤ 33.3 ms (bound 50).
- **B-7a:** the repeats are identical.
- **B-7b:** L and R have identical verdicts and safety sets.
- **B-8:** the certifier with DVG still rejects every case, with positional and analytic layers equal to the DVG-off runs.

**The saturation fraction** (5.17 – 5.25 % with DVG) is reported, not gated, for class B, as preregistered. It is not a pass of SV-2's I-4.

## 3. Erratum E1 (evaluator; `3e1c33c`)

**The defect:** the first evaluation returned **FAIL** (CQ-1bB, 18 items: B-2, B-3 and B-6 on all 6 class-B runs; every other item passed).
- `dvg2_eval` read the frozen SV-2 evaluator's per-run metrics at `runs[k]`, but they are stored at `runs[k].m`.
- So B-2 (over-capacity 0), B-3 (E1a-8) and B-6 (≤ 50 ms) compared undefined values, and B-9 printed "—".
- The intended tests are those of `DVG2_PREREG.md` §3, fixed before the battery.

**Fix and re-evaluation:**
- One line was fixed: `m = runs[k].m`.
- The same records were re-evaluated with the committed evaluator; no simulation was re-run.
- The original summary is preserved (`evidence_dvg2/dvg2_eval_summary_ORIGINAL.txt`).

**Process note:** writing the fix, an inline comment first swallowed the rest of its line (the recorded mid-line `//` defect class). `node --check` caught it before any use.

## 4. Reported, not gated: the 13 exact-flag IK folds (TD-17)

- Under the new perturbation probe, 6 of the 13 exact-flag folds flip to the mirror side's reach class, and **7 do not**: robust branch differences at the fold, with the unreached side's knee exactly on its soft bound.
- This is the TD-17 finding the user recorded on 8 Oct (bounded-IK branch selection at a soft-bound fold; D1G §3.3 already noted robust differences). These samples are reported under CQ-3a's frozen rule, not gated.
- **No closed-loop left / right physical difference** follows from them: CQ-3b holds 96 / 96 (same engagement and outcome class; max relative command difference 3.3 %). The largest L / R Σ+ difference, 0.16 J, is in the deepRel TD-15 end-range regime, as in CQ.
- **The one mismatch CQ gated** is now classified as a fold **and** is mirror-equivalent, which is the user's condition for treating it as a tool-tolerance defect.

## 5. Adoption

**DVG is adopted** (`DVG2_PREREG.md` §5; the user's item 2): `d1Guard: 2` in the E2 configurations that use IK-derived feed-forward, i.e. **PSTAR5CHABV** (A + B + DVG) and **PSTAR5CHABTDV** (TD2C).

**Next:** TD2C amendment A5 (configuration and guard law only), then the frozen TD2C battery.

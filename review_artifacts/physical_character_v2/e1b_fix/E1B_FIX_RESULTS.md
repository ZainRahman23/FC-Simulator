# E1b fix (configuration PSTAR2): validation results

**Frozen inputs:** `E1B_FIX_VALIDATION_PREREG.md` at **99c71e9**, design `E1B_FIX_DESIGN.md` at a89c307.

**Official run:**
- a clean `git archive` copy of 99c71e9 (`evidence/commit.txt`);
- sets E, A, X and W: 18:37–18:44;
- G0–G3 regression G: from 18:48.

**Evaluation:** the frozen tools (`evidence/e1b_eval.*`, `e1a_eval.*`, `ext_eval.*`, `w_node/`). Two tooling errata (§4) are evaluated separately; the original outputs are kept.

## 0. Bottom line

**VALIDATION FAIL: E1b still fails, so PSTAR2 is not adopted.**

- The foot-yaw part works everywhere it was tested.
- The abort put-down fixes the torque step **of the descent**, but it brings back a **capture failure**: 13 of 23 runs with the 15 N·s abort now fall.
- It also exposes a **second, pre-existing** torque-rate source at load acceptance.
- Under prereg §4 rule 2 there is no retuning. This needs your decision (§5).

| part | result |
|---|---|
| **E1b-17** (stance yaw) | **FIXED.** All 56 yaw runs pass: set E (3), X-Y (29: YAW and the reversed YAWN, 8 bodies × both sides), X-RATE (12: 180 / 480 Hz) and X-SENS (12). Excursion 4.35–5.74° (≤ 10), at +3 s **0.13–0.95°** (≤ 2). Before: V2-REF 7.35° / **2.27°** |
| E1b-7, **put-down descent** | **Fixed:** applied Δτ during the descent 0.9–2.2 N·m in all 23 P15 runs (one-tick drop: 22–38 N·m). Touchdown +0.29–0.32 s after the trigger (≤ 0.4 ✓) |
| **P15 (15 N·s, beyond capacity)** | **FAIL:** 13 / 23 P15 runs fall ("step required → fell"), including set-E V2-REF and V2-165-62. The recovering ones (V2-198-92, V2-190-85, V1-matched) show 9.0–10.9 N·m applied steps at **load acceptance** (V2-198-92: **10.79**, limit 10) |
| everything else in E | PASS: E1b-1 … 6, 9, 12 … 14, knee16 / 17, 16, 17, 9p15; determinism E1b-11 23 / 23 |
| **A** E1a re-verification | **PASS** (all E1a-1 … 17, 8 bodies + mirrored, determinism). The E1a-10 soft-limit sub-check is now effective (erratum E1-3 fixed) |
| X-U (7) / X-P5 (52) / X-DET (2) | **PASS** |
| X-Y / X-RATE yaw / X-SENS | **PASS** after erratum E1bF-e1 (§4). The frozen output fails every YAWN run on E1b-8 because of a missing table entry |
| X-P15 (13) / X-RATE P15 (6) | **FAIL** (falls; E1b-7 at acceptance) |
| **W** browser = Node | **3 / 3** after erratum E1bF-e2 (§4); the frozen script's path could not load the files. W_P15 exercises the put-down (abort 9.733 s, contact +0.308 s) |
| **G** G0–G3 regression | **PASS** V3.1–V3.10 after erratum E1bF-e3 (§4, §6). The PSTAR2 flags do not change accepted G0–G3 behaviour |

## 1. Set E (the frozen E1b protocol)

`evidence/e1b_eval.log`. Failing:

| run | outcome | E1b-7 | E1b-18 |
|---|---|---|---|
| V2-REF L P15 | **fell** | 140.9 N·m (in the fall) | abort 9.742 s, TOUCHDOWN +0.304 s, then fell; end AIRBORNE / AIRBORNE |
| V2-165-62 L P15 | **fell** | 118.8 N·m (in the fall) | TOUCHDOWN +0.287 s, then fell |
| V2-198-92 L P15 | recovered | **10.79 N·m** (hip_R.z, load acceptance) | PASS |

E1b-8 and E1b-10 fail only in the two falls.

## 2. Diagnosis of the P15 failure

### 2.1 Cause: the put-down alone

Diagnostic runs (not evidence; `$S/e1bfix/diag/`):

| configuration | V2-REF | V2-165-62 |
|---|---|---|
| PSTAR + `lcPutDown` | fell | fell |
| PSTAR + `footYaw` (one-tick drop) | recovered | recovered |

### 2.2 Mechanism: capture timing

The landed foot joins the support about 0.2 s after touchdown:
- the λ return starts at contact (H9) and needs about 0.15 s of its 0.6 s min-jerk to request ≥ 5 % on that foot (`wantShare`);
- then `acceptDebounce` adds 0.05 s.

During that time the DCM keeps diverging over the stance foot (ω ≈ 3.2 s⁻¹). V2-REF:

| | touchdown | support | ξ relative to the stance foot at support | ξ margin inside the new two-foot hull | outcome |
|---|---|---|---|---|---|
| one-tick drop (PSTAR) | +0.09 s | +0.29 s | 7.0 cm outside | **+3.8 cm** | recovered |
| 0.302 s put-down | +0.31 s | +0.51 s | 14–17 cm outside | +1.6 cm, then **outside** | **fell** |

So the bandwidth-derived duration (smoothness) conflicts with capture timeliness. The E1b-18 bound (TOUCHDOWN ≤ 0.4 s) is met, but touchdown is not support.

### 2.3 Load acceptance after an abort: a second, pre-existing E1b-7 source

- When the landed foot enters LOAD_ACCEPT with the DCM about 9 cm outside the stance foot, its support weight ramps over `accept` = 0.1 s. The CoP moves fast, and the stance-hip rotation torque changes **about 10 N·m per tick for about 15 ticks**. It is a sustained ramp, not a step.
- It **already existed in the official PSTAR runs:** V2-198-92 **12.69 N·m** at +0.242 s after touchdown; V2-REF 9.41; V2-165-62 6.51. The one-tick drop's 22–38 N·m step hid it.
- **Correction to `../e1a/E1B_RESULTS.md` §1:** E1b-7 on P15 has two sources, not one:
  1. the one-tick drop, now fixed;
  2. post-abort load acceptance under a large DCM error, not fixed.
- The earlier `lcAbortRamp` diagnostic attributed its 13.07 N·m (V2-198-92) to the 0.1 s descent. It kept no per-tick rows, so that cannot be checked. Source (2) is the likely one.

## 3. What the yaw result shows, and what it does not

- **In the yaw test, the active path works through damping, not capacity.** The stance-ankle yaw actuator peaks at **1.13 N·m** (V2-REF; 0.91 V2-198-92), 3–8 % of its budgeted capacity, with no saturation. That is the existing `ankleD` 2.0 N·m·s/rad row (measured unloaded axial damping: 2.25).
- The capacity sensitivity (k 0.38 / 0.90 ≈ 15 / 35 N·m) gives the same E1b-17 values to 0.01°. The physics hashes differ only through activation dynamics.
- **Capacity is therefore untested by E1b.** The shared budget is exercised only by the 15 N·s push (stance share minimum 0.00 while inversion saturates). In quiet single stance the yaw path keeps about 97 % of its budget.

## 4. Tooling errata (mechanical; originals kept; neither changes set E)

| id | defect | effect | correction |
|---|---|---|---|
| **E1bF-e1** | `tools/e1b_eval.mjs` E1a-8: the scheduled-impulse table has no `YAWN` entry (I added the reversed impulse to the harness and to E1b-17, not to this table) | the comparison is against `undefined` → NaN, so every YAWN run "fails" E1b-8. Physics: closure 0.012 J / tick, Σ+ 0.12 J, impulse exactly 0.5 N·m·s | `YAWN: 0.5`. Corrected extended output: `evidence/ext_eval_erratum1.*`. Set E output unchanged (verified) |
| **E1bF-e2** | `scripts/run_validation.sh` W step: viewer-relative paths with three `../` instead of four | the browser fetched an HTML 404 page, so the run was incomplete | re-run of the browser comparison only, on the same Node records: 3 / 3 identical (`evidence/w_node/browser_rerun.json`) |
| **E1bF-e3** | `scripts/regress_battery_pstar2.sh`: a double sed rename wrote `qual_eval` / `twist_eval` / `close_eval_policy` / `g3_mirror` to `*_vP22.json`, so the copy to the frozen evaluator's `*_v4` names missed them | the frozen output (`evidence_regression/regress_eval.log`) reports V3.5–V3.7 "output missing" → FAIL | the same files renamed, frozen evaluator re-run on the same battery: **PASS** (`evidence_regression/regress_eval_erratum3.*`) |
| **E1bF-e4** (found during the P15 capture study) | §2.3 and the DECISIONS E1-5 text call `hip_R.z` "stance-hip **rotation**". In the spec, hip axis z is **abduction / adduction** (x rotation, y flexion) | wrong label only; no verdict change | the acceptance transient is the release of the stance hip **abductor** moment (≈ 100–116 N·m, ≈ 1.2 N·m/kg, the single-stance abductor load) as the landed foot takes weight: `../p15_capture/P15_EVIDENCE_COMPARISON.md` |

## 5. Decision needed

**Already settled by evidence:**
- the active foot-yaw path fixes E1b-17 across bodies, sides, directions and rates;
- the quintic put-down makes the descent smooth.

**Still unsolved:** the beyond-capacity abort. The smooth put-down is too slow to capture, and load acceptance under a large DCM error is too fast for the 10 N·m criterion. These are materially different architectural choices with no evidence-based winner (your stop condition):

| option | mechanism | evidence | risk / what it changes |
|---|---|---|---|
| **P1: capture-timed put-down** | T_put = min(servo-bandwidth T, the LIPM / DCM-predicted longest T that keeps ξ inside the bilateral hull at the predicted support time, with a margin) | IHMC swing speed-up on a large ICP error; Koolen capturability; Englsberger DCM | shorter T means larger descent torque rates (the 0.1 s ramp's descent was not resolved, §2.3). There may be no window that satisfies both |
| **P2: earlier acceptance intent in an abort** | the λ return starts at the abort, not at contact. The lifecycle still needs physical contact, so support follows touchdown after only the 0.05 s debounce (−0.15 s) | BLF / IHMC planned-vs-estimated contact (the plan may want contact before it exists) | changes the H9 supervisor semantics; the request then shifts ξ_ref toward bilateral while one foot is airborne |
| **P3: abort-specific acceptance profile** | ramp the landed foot's support weight over a duration set by the DCM error / servo bandwidth instead of the fixed 0.1 s | PyPnC / IHMC ramp normal-force ceilings over 0.2–0.45 s | addresses §2.3 only; a slower ramp also delays capture |
| **P4: recovery step** | place the foot in the capture region instead of the anchor | IHMC `PushRecoveryControlModule`, capturability | the established response to "step required", but it is a recovery step, beyond E1b, and changes E1b-18's "puts the foot down" |
| **P5: criterion decision on P15** | e.g. accept "step required" as the 15 N·s outcome, or exempt post-abort load acceptance from E1b-7 | — | weakens a physical criterion: your decision only |

**Possible partial adoption:** the foot-yaw path alone ("PSTAR + footYaw").
- Validated by: E1b-17, X-Y, X-RATE yaw, X-U, X-P5 and A.
- G passed with both flags (§6). A footYaw-only regression would still need running, because it is not established whether G ever exercises the put-down path.
- Diagnostic: with footYaw alone, P15 recovers on V2-REF and V2-165-62.
- Adopting it alone leaves E1b-7 failing on P15. There are two sources: the one-tick drop, and the pre-existing acceptance transient.

**Not done, per the prereg:** no parameter or criterion changed after the results, and no E2 work began. E2 research stays in `../e2/research/` as archived study only.

## 6. G0–G3 regression (`scripts/regress_battery_pstar2.sh`)

**Run:** a clean copy of 99c71e9, 18:48–19:15 (`evidence_regression/`). **Verdict, frozen evaluator after erratum E1bF-e3: PASS.**

| item | result |
|---|---|
| V3.1 | KV0 identical, suite 58 / 58, V1 guard OK |
| V3.2 | knee bench, rig and B1 bench identical |
| V3.3 | G0 51 / 52 (0.V1, the worktree guard) |
| V3.4 | G1 74 / 74 hash-identical to qualification v2 |
| V3.5 | G2 11 / 11 gating rows |
| V3.6 | G3 v3.3: no failing rows; J2a 81 / 81 |
| V3.7 | twist battery: C1′ / C7′ none failing |
| V3.8 | KV6c 8 / 8 |
| V3.9 | boundary harness at 180 / 240 / 480 Hz |
| V3.10 | yaw decomposition, no masking |
| browser | G1 10 / 10, G2 6 / 6, G3 4 / 4 |

**Reported:** outcome changes against the PSTAR battery (`$S/vP`), counting uniquely matched jobs only:
- **G3:** 0 changes in 283 jobs.
- **G2:** 3 changes in 459 jobs, all toward recovery:
  - V2-190-85, two boundary pushes: "step required → fell" → recovered;
  - V2-REF S4: "foot relocated" → recovered.
- Jobs whose key fields repeat were not compared.

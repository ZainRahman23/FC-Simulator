# E1b fix: validation preregistration (configuration version PSTAR2)

**Authority:** the user instruction of 2026-10-05: "Rerun E1b … Preregister any necessary corrected/new criteria before the official run; run full regression, determinism, browser = Node, body variants and perturbations."

**Status:** written and committed **before any validation run**.

**Configuration:** PSTAR2 = PSTAR + `footYaw: true` + `lcPutDown: true` (`E1B_FIX_DESIGN.md`, code at a89c307).

**Frozen inputs:**
- this document;
- `E1B_FIX_DESIGN.md`;
- `scripts/run_validation.sh`, `scripts/regress_battery_pstar2.sh`, `manifest_w.json`;
- the tools at the commit that adds this file: `tools/e1b_run.mjs`, `e1a_run.mjs`, `e1b_eval.mjs`, `e1a_eval.mjs`, `e1bfix_eval.mjs`, `preswing_char.mjs`, `unload_browser.mjs`, and the frozen regression evaluators.

**No criterion or parameter changes after any result.** Failed runs are kept.

## 1. Disclosure: what was run with the PSTAR2 code before this document

| run | purpose | result |
|---|---|---|
| PSTAR (not PSTAR2) V2-REF L none / P15 | the new code is inert without its flags | hash-identical to the official E1b runs (23 / 23, 21 / 21) |
| official PSTAR E1b runs, re-evaluated by the corrected evaluator | erratum E1b-e1 (distinct keys) changes no verdict | identical verdict (E1b-7, E1b-17 fail as recorded) |
| **smoke:** PSTAR2 V2-REF L, **10 mm** lift (not the protocol's 20 mm; in no set below), P15 | the mechanisms engage | put-down T 0.302 s, TOUCHDOWN +0.263 s after the abort, hand-back +0.304 s, recovered. Largest applied Δτ after the abort 8.62 N·m (hip_R.z, during load acceptance), Δτ0 8.38 N·m. Foot-yaw axes active, over-capacity 0. Stance yaw budget share: median 0.98 in quiet single stance, minimum 0.00 right after the 15 N·s push (inversion saturated) |

No parameter was changed after the smoke run. Every value was fixed in `E1B_FIX_DESIGN.md` (committed a89c307 before it).

## 2. Changes to the frozen E1 tooling (none to criteria)

- **Erratum E1b-e1:** E1a-16 / -17 are reported as `E1b-knee16` / `E1b-knee17`, so they no longer collide with E1b-16 / -17. Verified: identical output on the official PSTAR runs apart from the labels.
- **Erratum E1-3:** the harness capture index is fixed (`IKcap[a[2]]`), so E1a-10's swing-leg soft-limit sub-check (≥ −2°) is now **effective** in the PSTAR2 E1a / E1b runs. The capture is read-only, so physics hashes are unchanged.
- **New options:**
  - `--config=PSTAR2` in both harnesses and evaluators;
  - validation-only harness options `--hz`, `--yawk`, `--pert=YAWN`;
  - the default `--config=V2` and PSTAR behaviour are unchanged.
- **Rate-equivalent torque steps (RATE set only):** at 180 / 480 Hz the E1a-7 limits scale by 240 / hz (the same torque rate as 10 / 25 / 30 N·m per 1/240 s), and the contact-onset window covers the same duration (≥ 2 ticks). At 240 Hz the code path and numbers are identical.

## 3. Sets and pass rules

| set | runs | what | pass rule |
|---|---|---|---|
| **E** official E1b | 28 | the frozen E1b protocol and run list (`../final_pre_e1a/E1_PREREGISTRATION.md` §4–§6, `../e1a/E1B_HARNESS.md`), configuration PSTAR2 | `tools/e1b_eval.mjs --config=PSTAR2` → **E1b RESULT: PASS**: every E1b-1 … 18 as frozen, including **E1b-7 at 10 N·m applied / 30 N·m τ0** and **E1b-17 at ≤ 10° / ≤ 2° at +3 s**; determinism E1b-11 |
| **A** E1a re-verification | 10 | the frozen E1a protocol and run list (5 mm lift), PSTAR2 | `tools/e1a_eval.mjs --config=PSTAR2` → **E1a RESULT: PASS** (all E1a-1 … 17, determinism) |
| **X-U** | 7 | right foot lifted, unperturbed, the 7 other bodies | every applicable E1b per-run criterion |
| **X-P5** | 52 | PF / PB / PL / PR 5 N·s, 8 bodies × L / R minus the official 12 | per-run set + E1b-16 |
| **X-Y** | 29 | YAW (+0.5 N·m·s) and **YAWN (−0.5)**, 8 bodies × L / R minus the official 3 | per-run set + E1b-16 + **E1b-17** |
| **X-P15** | 13 | 15 N·s toward the lifted side, 8 bodies × L / R minus the official 3 | E1b-7, -8, -9p15, -10, **-18** |
| **X-RATE** | 18 | YAW / YAWN / P15 × {V2-REF, V2-165-62, V2-198-92} × L × {180, 480} Hz | gating: E1a-6, -7 (rate-equivalent), -8, -9 / -9p15, -10, E1b-16, -17, -18. The rest of the per-run set is reported |
| **X-SENS** | 12 | footYaw axial share k = 0.38 / 0.90 (≈ 15 / 35 N·m at 78 kg) × YAW / YAWN × the 3 bodies × L | **reported only** (capacity sensitivity, §4) |
| **X-DET** | 2 | repeats of V2-REF L YAW and V2-REF L P15 | every hash mark identical to the set-E run |
| **W** browser = Node | 3 | `manifest_w.json`, PSTAR2 flags, V2-REF: (1) 20 mm lift (0.6 s, 1.5 s hover) with 15 N·s toward the lifted side at 9.65 s; (2) 5 N·s toward, right foot near-unloaded; (3) −15° turn | browser hash = Node hash at every 1 s mark and the end, 3 / 3. **Run 1 must exercise the put-down:** the Node record has an abort and a put-down log with a contact time. Otherwise W is incomplete and fails |
| **G** G0–G3 regression | battery | `scripts/regress_battery_pstar2.sh`: the PSTAR regression (preswing V15) with the PSTAR2 flags — KV0, suite, V1 guard, bench, G0, G1, G2, G3 v3.3 + J2a, twist battery, KV6c, boundary harness (180 / 240 / 480 Hz), yaw decomposition, browser G1 / G2 / G3 | `tools/touchrest_regress_eval.mjs` → **all V3.1 … V3.10 PASS** (the rules that accepted PSTAR). **Any failing item is a material change to accepted G0–G3 behaviour** (stop rule) |

**Evaluators:**
- X: `tools/e1bfix_eval.mjs`. It lists the expected runs; a missing or unexpected run fails X.
- E: `tools/e1b_eval.mjs`. A: `tools/e1a_eval.mjs`.
- W: `tools/unload_browser.mjs` + the Node record check.
- G: the frozen regression evaluators.

**Reported, not gating:**
- every non-gating failure (listed, never hidden);
- per run: put-down timings (contact and hand-back after the abort) and start state;
- per run: yaw actuator peak torque, capacity fraction, saturation and minimum budget share;
- G2 / G3 metric changes PSTAR → PSTAR2;
- controller cost.

## 4. Decision rules

1. **E, A, X (gating), W and G all pass → PSTAR2 is adopted** (DECISIONS entry; configuration addendum). E1b is closed. Work continues to E2 research / design / preregistration and **stops before the first official E2 implementation or run**.
2. **E fails E1b-7 or E1b-17** (or any other E criterion) → no retuning. Report the failure; the stop rule applies ("E1b still fails after the evidence-backed approaches have been exhausted").
   - A clear **implementation bug** is the only exception: it may be fixed under a new, documented preregistration, keeping these runs.
3. **G has any failing item** → material change to accepted G0–G3 behaviour → stop for the user's decision.
4. **X (gating) fails** → the fix is not robust across bodies / sides / perturbations / rates → stop and report.
5. **W fails** → a determinism / portability defect → stop and report.
6. **X-SENS** is reported:
   - if k = 0.38 fails E1b-17 while the nominal passes, the result depends on capacity within the evidence range, and the user is told;
   - if k = 0.90 fails, the higher capacity destabilises something, and the user is told.

   Neither is a validation failure, because the nominal is the evidence-based value.

## 5. Order of execution

1. Commit this document.
2. `scripts/run_validation.sh` (E, A, X, W; clean `git archive` copy of the committed tree).
3. `scripts/regress_battery_pstar2.sh` (G).
4. Evaluate exactly as frozen. Record `E1B_FIX_RESULTS.md` (all sets, failures included) and commit.

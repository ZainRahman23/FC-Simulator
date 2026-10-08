# DVG2: versioned qualification of the DVG guard (class A / class B split of CQ-1b; corrected CQ-3a fold classifier): preregistration and freeze, before any DVG2 battery run

**Authority:** `../sources/2026-10-08_user_instruction_overnight_dvg2_td2c_e2.md` (item 1).

**The DVG combined qualification stays FAIL as recorded** (`DVG_RESULTS.md`, CQ-1b and CQ-3a). DVG2 does not re-evaluate it or reinterpret CQ-1b. It is a new, versioned qualification of the **same implementation**:
- `ctrl/v2_stand.js` `d1Guard: 2` as frozen for CQ at `d3f9bcc` [historical `7de6c00`];
- no file under `sandbox/visual/physchar2/` other than the new DVG2 tools has changed since (`git diff d3f9bcc -- sandbox/visual/physchar2` is empty apart from them).

The guard, its fade (τ_g = 0.10 s), its weight law and every threshold are unchanged. Nothing is tuned.

## 1. What DVG2 changes, and what it keeps

| item | DVG2 |
|---|---|
| CQ-0, CQ-1a, CQ-1c, CQ-2, CQ-3b, CQ-4a, CQ-4b, CQ-5, CQ-6 (incl. CQ-6x) | **unchanged**: the same criteria, the same run list (`CQ_RUN_LIST.json`) and the same tools (`dvg_val`, `dvg_wrap`, `dvg_lib`) |
| CQ-3a | the **fold classifier** corrected (§2); every other CQ-3a gate unchanged |
| CQ-1b | **split by class** (§3). Class A keeps the frozen gate in full; class B gets the physical-safety gates B-1 … B-8 |

**DVG2 passes iff** CQ-0, CQ-1a, CQ-1b (classes A and B), CQ-1c, CQ-2, CQ-3a, CQ-3b, CQ-4a, CQ-4b, CQ-5 and CQ-6 pass, and the classification step (§3) is complete and consistent.

## 2. CQ-3a: the corrected at-bound test (tool erratum; the definition is unchanged)

**Definition (`DVG_PREREG.md` §4, CQ-3):** an IK-fold sample is one where "the two solves differ in reach class and the unreached side ends with a coordinate on its soft bound". These are reported, not gated (TD-17).

**The defect:** `tools/dvg_unit.mjs` operationalised "on its soft bound" with the bounded IK's exact flag, `x ≤ lo || x ≥ hi`. The solver works in floating point. A coordinate stopped by the fallback or polish step can sit a rounding distance inside its bound with the flag false. CQ's one gated mismatch was such a coordinate: V2-165-62 diag t 9.7875, knee 4.508 · 10⁻¹⁰ rad inside.

**Correction:** "on its soft bound" ≡ the unreached side's smallest soft-limit margin `min(x − lo, hi − x) ≤ IK.h`.
- `IK.h` = 1 · 10⁻⁶ rad (`ctrl/v2_stand.js`) is the bounded solver's own coordinate-perturbation step.
- It is the finest resolution at which the solver distinguishes coordinate values. Its Jacobian stencil at a point within `IK.h` of a bound reaches the bound.
- **The tolerance comes from the solver, not from the observed sample** (4.5 · 10⁻¹⁰ rad). It also equals the scale that `DVG_RESULTS.md` §3 proposed for this erratum.

**Equivalence safeguard (the user's condition):** the corrected classifier may reclassify a sample only if the mirrored IK behaviour is shown to be equivalent.
- For every sample whose reach classes differ, `tools/dvg2_unit.mjs` re-solves the unreached side with the target position perturbed relatively by ±1 · 10⁻¹³ and ±1 · 10⁻¹¹ (the method of the CQ-3a diagnosis).
- `equiv` = at least one perturbed solve reaches (residual ≤ 1 · 10⁻⁶), i.e. the two sides pose the same problem to within floating-point noise, and the difference is the solver's active-set path (TD-17).
- **Gate:** every sample that is a fold under the corrected test but **not** under the exact flag ("newly classified") must be `equiv`. Otherwise **CQ-3a FAILS**, and DVG2 stops for an investigation of a genuine L / R difference.
- Samples that are folds under the exact flag keep CQ's treatment (reported, TD-17). Their perturbation result and margins are reported.
- **CQ-3b** (the closed-loop L / R pairs, same engagement and outcome class) stays gating, unchanged.

**Tool:** `tools/dvg2_unit.mjs` is a versioned copy of the frozen `dvg_unit.mjs`. The simulation, probe inputs and verdict code are unchanged. It adds recording (both sides' margins, `foldExact`, `foldTol`, the perturbed residuals, `equiv`), and the fold flag uses the corrected test. Tool verification before this freeze (disclosed): V2-165-62 diag reproduces CQ's end hash 6407bea3. Its one reach-class-differing sample (t 9.7875, the known mismatch) is classified as a newly classified fold with `equiv` true (perturbed residuals 5.2e-16, 1.3e-4, 1.3e-4, 7.9e-16).

## 3. CQ-1b: class A (certified / executable) and class B (independently not certified before controller execution)

**Class membership is fixed before the guarded execution** by the **frozen execution-feasibility certifier** (`EXECUTION_FEASIBILITY.md`; `ctrl/v2_footstep.js` `certifyExecution` plus `tools/exec_qualify.mjs`), committed on 6 Oct, before DVG existed, and run **with DVG off**:
- **class A:** the certifier returns `→ QUALIFIED` for the case (body, leg, trajectory, rate);
- **class B:** `→ NOT QUALIFIED`, whether positional, analytic or replay.

**On the replay layer.** The certifier's layer 3 is a closed-loop replay with the unguarded qualified swing controller (PSTAR5CHAB). That replay is the certifier's own pre-runtime qualification ("as a qualification it precedes any real execution"). It is independent of, and prior to, DVG2's guarded execution, and is how the certifier rejects the V2-long-legs C-L11 counterexample "before runtime". At PG-1, this certifier supplies the planner's NO_CERTIFIED verdict.

**Step 0 of the battery** (before any guarded run; `scripts/run_dvg2.sh`):
- the certifier runs on all 8 bodies × 2 legs × 10 trajectories × {180, 240, 480} Hz (480 runs);
- `tools/dvg2_cls.mjs` writes the classes;
- its 240 Hz verdicts must equal the committed sweep (`evidence_exec/sweep.txt`); a difference is a test defect and fails the classification step (CQ-CLS);
- the class-B extras (B-7a repeats, B-8 certifier runs) are derived from the classification **alone**: every class-B case present in the SV-2 servo-on list.

**Class A (engaged runs):** the frozen CQ-1b gate in full. The frozen SV-2 evaluator on the guarded record shows **no newly failing item**, including I-4's 5 % fraction and its 50 ms continuous bound.

**Class B (engaged runs): bounded, physically safe failure.** All of the following are gated:

| # | requirement | operational test |
|---|---|---|
| B-1 | finite / bounded commands | every tick's applied-torque step, commanded-torque step and energy-closure increment in the record finite (a non-finite τ0, τ or state appears there), applied leg torques finite on every row, the run completes. On the guard trace: every non-OFF guarded tick's source is V4-feasible (`srcInvalid` 0), and the applied joint-rate commands stay inside the force–velocity envelope (`rateMax` < 1). These are CQ-2 (i), (iii) and (iv). The historical B_cmd is **not** used; max \|Δτ0\| is reported |
| B-2 | no applied torque beyond physical capacity | over-capacity events 0 (SV-2 I-1) |
| B-3 | no unexplained / generated energy | E1a-8 per run: closure ≤ 0.05 J per tick, Σ+ ≤ 0.5 J, authority writes 0 (SV-2 I-3) |
| B-4 | bounded torque / rate transitions into and out of the guard | CQ-6 (i) – (iv) on the run's guard trace (exact law, held source, weight law, guard-attributable step ≤ the E1a-7 commanded bound 30 · 240 / hz N·m) |
| B-5 | no new physically unsafe outcome caused by the guard | the run's failing set among the physical-safety items {I-1 over-capacity, I-3 energy, I-5 early contact / no liftoff / failed touchdown, I-6 touchdown rebound / re-entry, I-7 abort / final support} plus B-6's sustained-saturation bound, **with DVG**, is a subset of the same run's set **without DVG** (the frozen SV-2 battery's servo-on run, `evidence_sv2/sv2_eval.json`) |
| B-6 | guard-specific sustained-saturation safety bound | longest continuous saturation per swing-leg axis **≤ 50 ms** (see below) |
| B-7 | deterministic and L / R-equivalent handling | **(a)** each class-B run repeated with DVG: identical end hash and guard trace. **(b)** per (body, trajectory, rate): the L and R runs both engage or neither; identical verdicts on B-1 … B-6 and B-8; identical B-5 safety-item sets |
| B-8 | NO_CERTIFIED / unreachable classification preserved | the certifier re-run **with DVG enabled** (`dvg_wrap --dvgcfg=PSTAR5CHAB tools/exec_qualify.mjs`) still returns `→ NOT QUALIFIED`, and its positional and analytic layer verdicts equal the DVG-off run's (the guard cannot make the case look certified) |
| B-9 | saturation reported | saturation fraction and longest continuous run per axis, with DVG and without; max \|Δτ0\|; safety-item sets; certifier verdicts. **Reported, not gated.** The 5 % fraction is an actuator-utilisation statistic and is **not** gated for class B; it is neither raised nor reused |

**Normal / certified paths unchanged:** CQ-1a, CQ-1b class A and CQ-1c, as frozen. Bit-identical for every run with zero invalid evaluations; engaged runs pass their frozen contracts.

**Where B-6's 50 ms comes from** (fixed before any DVG2 run; not from the observed 33 ms):
- The project's existing control semantics bound continuous actuator saturation at **50 ms** per axis:
  - E2-11 of the frozen official E2 preregistration (`E2_PREREGISTRATION_v2.md`: "longest continuous saturation ≤ 50 ms");
  - the continuous part of SV-2 I-4;
  - SV-1 V-4.
- It equals the actuator model's **deactivation time constant τ_deact = 50 ms** (`PHYSICAL_CHARACTER_V2_SPEC.md` §14: da/dt = (u − a)/τ, τ_act 15 ms, τ_deact 50 ms). That is the time scale on which a saturated actuator releases its activation, so a longer saturation is sustained, not transient.
- The guard's fade (τ_g 0.10 s) is unchanged.
- The 5 % threshold is not raised: it simply is not a class-B criterion, as the user directed.

## 4. Battery (`scripts/run_dvg2.sh`, on a clean archive of the freeze commit)

1. **Step 0:** the certifier on 480 cases (DVG off); classification (CQ-CLS).
2. **Class-B extras:** for each class-B case in the SV-2 servo-on list, an SV-2 repeat with DVG (B-7a) and the certifier with DVG (B-8).
3. **The frozen CQ battery** of `CQ_RUN_LIST.json`, unchanged: stress 528, repeats 24, mirror probes 24 (with `dvg2_unit`), AB 432, SV-2 438, E1a 10 + E1b 28, each with DVG on and off; plus CQ-0 identity.
4. **Evaluation:**
   - `tools/dvg2_eval.mjs`, a versioned copy of `dvg_eval` with §2 and §3;
   - the frozen SV-2 evaluator (`swing_servo_eval2`) on the guarded SV-2 records if any engage;
   - the frozen E1a / E1b evaluators if any E1 run engages.
5. **Reported:** end hashes of every common run against the DVG CQ battery (same code: expected identical).

## 5. Adoption and what follows (the user's items 2 – 3)

**If DVG2 passes:**
1. DVG is adopted: `d1Guard: 2` in the E2 configurations that use IK-derived feed-forward (PSTAR5CHABV / PSTAR5CHABTDV).
2. The TD2C amendment is applied: the preserved amendment A5 (`e2/drafts/`), which changes only the configuration and the guard-law checks, plus the user's restated TD2C contract. It is frozen before the TD2C battery.
3. On a TD2C pass: E2 integration → swing / servo / SV-2 re-qualification for PG-1 → PG-1 → the remaining frozen prerequisites → official E2.

**If DVG2 fails:**
- stop at that gate;
- diagnose causally (counterfactuals allowed);
- no criterion change after seeing a result, no fade or constant tuning, no actuator change.

## 6. Predictions (before any DVG2 run)

- **Classification:**
  - the 14 C-L11 cases of the 7 bodies that cannot reach it are NOT QUALIFIED (positional) at every rate, and V2-long-legs C-L11 (L, R) is NOT QUALIFIED at 240 Hz (replay);
  - at 180 / 480 Hz V2-long-legs C-L11 is **expected** NOT QUALIFIED (the runaway was shown at all three rates in the vertical-residual diagnosis), but this is not certain;
  - every other case is QUALIFIED.
- **CQ-1b:**
  - engaged runs are expected to be the 6 V2-long-legs C-L11 runs, in class B, with no class-A engagement;
  - B-1 – B-4 are expected to pass (CQ-6, I-1 and I-3 passed on these runs);
  - B-5 is expected to pass (I-6 fails with and without DVG);
  - B-6 is expected to pass (33 ms at 180 Hz in CQ);
  - B-8: the guard cannot make the target reachable, so the replay is expected to still reject.
- **At risk:**
  - B-7b, if L and R differ in a gated verdict;
  - B-5, if a guarded run shows a safety item the unguarded run did not;
  - the classification at 180 / 480 Hz. If V2-long-legs C-L11 is QUALIFIED at some rate, its run there is class A, and CQ's I-4 result (180 Hz) would fail it.
- **CQ-3a:** the one known mismatch becomes a newly classified fold with `equiv` true. The 13 exact-flag folds recur.
- **Everything else:** bit-identical to CQ (same code).

## 7. Known before this freeze

- **All CQ results and diagnostics:**
  - CQ-1b's numbers for the 6 engaged runs (5.17 % / 33 ms at 180 Hz; about 5.2 % at every rate with DVG; I-2 commanded 8 violations; I-6 failing with and without DVG);
  - the CQ-3a diagnosis (margin 4.5 · 10⁻¹⁰ rad; the perturbation flip).
- **The certifier's 240 Hz sweep.**
- **The tool verification of §2.**
- **Not known:** the certifier's verdicts at 180 and 480 Hz, and the class-B gate results as defined here. Several components are predictable from CQ evidence, and that is disclosed above.
- **Order:** the DVG2 tools (`dvg2_unit`, `dvg2_cls`, `dvg2_eval`, `scripts/run_dvg2.sh`) were written before this document was committed, and are committed with it as one freeze, before any DVG2 battery run.

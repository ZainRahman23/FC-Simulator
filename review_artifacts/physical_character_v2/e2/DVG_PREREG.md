# DVG (D1G v2): domain-validity guard for all IK-derived feed-forward, and its combined qualification (CQ): preregistration (freeze step 1, before any DVG code in the repository)

**Authority:** `../sources/2026-10-08_user_decision_rate_ff_guard_combined_qualification.md` (verbatim).

**History preserved, nothing adopted:**
- D1G v1 (`d1Guard: true`; `D1G_TD2C_PREREG.md`, `D1G_RESULTS.md`, `evidence_d1g/`) stays **FAIL** and is not adopted. Its code path stays bit-for-bit as frozen, so its evidence remains reproducible.
- TD2 and TD2B stay FAIL.
- The historical command bound B_cmd (D1G DG-2 (iv)) is **not redefined and not used as a CQ gate**. Its value is reported for comparison only.

**Unchanged:**
- physics rates, the energy criterion E1a-8, the passive law, end-range parameters;
- every threshold, gain and actuator capacity;
- T-1, AB / AB2, the execution-feasibility certifier, the 30 mm apex;
- 1A unused, 1B rejected; recovery issue C;
- TD2B's values; the TD2C criteria and run list;
- the 25 % BW contract.

Everything is local; nothing is pushed.

## 0. Design study (disclosed; `evidence_dvg_design/`)

**Prototype:** a scratch-tree prototype of the design in §1 (`prototype.diff`) was smoke-run before this document:
- 3 normal runs: AB nominal V2-REF L 240 R-F, TDV nominal V2-REF L 240 R-F, TDV nominal V2-long-legs L 180 H-T45;
- 1 obstacle run: earlyOOE V2-198-92 L 480 H-D;
- 4 + 6 reach-stress runs.

Results (`design_smoke.txt`):
- **Normal runs:** zero invalid evaluations; end hashes **identical** to the unguarded ones (b63184da, 787cc0c9, d7816939).
- **Reach stress:**
  - max raw τ0 1.17 kN·m where D1G v1 gave 3.96 kN·m (and 4.23 → 0.93, 2.06 → 0.42);
  - per-tick closure ≤ 0.024 J, where v1 gave up to 0.18 – 0.25 J;
  - guard step ≤ 23 N·m;
  - one 180 Hz diag run still has **Σ+ 0.581 J**, accrued in the hold (§2).
- **Obstacle (earlyOOE):** Σ+ 0.106 J, closure ≤ 0.004 J per tick, RECOVERED.

**No parameter was chosen from these runs.** τ_g, srEps, U_MARGIN, the E1a-7 bound and the ½ share are fixed in §1 from existing quantities.

## 1. The correction (DVG = `d1Guard: 2`; default false; v1 = `true` unchanged)

### 1.1 Principle (the user's rule, operationalised)

Feed-forward derived from a leg's IK solution is authoritative only while that solution is:
- reached (certified executable);
- sufficiently conditioned;
- finite;
- within the actuator's torque and joint-rate feasibility envelope.

**Guarded terms** (all IK-derived feed-forward of a non-supporting leg):
- **D1:** the resolved-acceleration wrench (`swingAccFF`);
- **ω\*:** the joint-rate feed-forward (`lcVff`: the pelvis-motion rate plus the commanded-target rate, `ikW`), entering the command as (1 − s)(D + dt·K)·ω\*;
- **B:** the passive reference rate (`ikWref`, B), entering the command as (1 − s)·c_passive·ω_B.

### 1.2 Domain

Every tick on which a non-supporting leg's servo law (the default path) evaluates a **commanded target** (a lifecycle swing target, from any commanding layer: E2 sequencer, harness, E1 protocols, abort put-down). Once engaged, the guard stays in charge until it is back in PASS.

Out of domain:
- a leg with no commanded target (the contact / rest hold law, μ0-damped, unchanged);
- a supporting leg (its terms are already weighted out by (1 − s)).

### 1.3 One verdict per leg and tick, for all guarded terms ("consistent validity semantics")

| # | condition | source |
|---|---|---|
| V1 | IK residual ≤ 10⁻⁶ (the soft-limit-bounded IK the law uses) | certifier reach / AB-9 |
| V2 | λ_min(J_fᵀJ_f) ≥ `IK.srEps`² at the IK solution (the same J_f expressions as D1) | certifier conditioning |
| V3 | D1 (if evaluated), ω\* and ω_B all finite | — |
| V4 | **torque- and rate-feasible:** the certifier's torque-feasibility item, \|(gravity + D1) · axis\| ≤ capacity(anatomical angle, **wq**) / (1 + U_MARGIN) on every actuated axis, at the **commanded coordinate rate wq = max(max\|ẋ_D1\|, max\|ω\*\|)**. Through the actuator's force–velocity law, this places every commanded joint rate inside the axis's rate envelope (capacity vanishes at the concentric limit w0) | `certifyExecution` torque item (D1G A1), with the commanded rate |

### 1.4 One weight w per leg, for all guarded terms

| state | behaviour |
|---|---|
| **PASS** (w = 1) | the fresh terms **untouched** (the same objects, the original arithmetic) |
| **FADE** | holds the last valid terms (on entering the domain already invalid: the previous tick's **applied** terms); w decreases; completes regardless of validity |
| **OFF** (w = 0) | no IK-derived feed-forward |
| **RAMP** | fresh valid terms × w, w increasing |

Then back to PASS.

**Weight step:**
- Δw = min(dt / τ_g, S · dt / C), so that the guard's own per-axis command step is \|Δw\| · C ≤ S · dt.
- τ_g = the lifecycle's `release` (0.10 s; D1G's value).
- S · dt = **½ × the E1a-7 commanded bound** = 15 · 240 / hz N·m: the guard may use at most half of the per-tick commanded-continuity budget.
- C = the largest unit-weight per-axis contribution of the guarded terms (the held source in FADE, the fresh terms in RAMP), measured with the servo's own gains on the previous tick.
- The weight snaps to 0 / 1 within 10⁻¹².

**Requirements and bit-identity:**
- It requires the lifecycle and the sim's actuator layer (`ctrl.d1gAct`, as D1G A1).
- **Never engaged ⇒ bit-identical.**

**Recording only** (no effect on commands):
- the controller's DVG record per leg and tick: state, w, V1 – V4, λ, residual, torque ratio, wq, C, source tick;
- with `torqueLedger`, per axis: the applied guarded contribution, the unit-weight source and fresh contributions, w, state.

**Configurations** (`gates/v2_e2.js`):
- PSTAR5CHABV = PSTAR5CHAB + DVG;
- PSTAR5CHABTDV = PSTAR5CHABTDB + DVG;
- PSTAR5CHABVR0 = PSTAR5CHABV + `diagNoIKFF`. A **diagnostic energy reference only, never a candidate:** no IK-derived feed-forward at all on commanded-target ticks. It exists only for the attribution rule of CQ-5.

## 2. The 180 Hz end-range energy build-up (user item 2): what the evidence establishes

**Established (D1G evidence plus the design study):**
- **Independent of D1 and of the guard:**
  - removing D1 entirely changes Σ+ by ≤ 0.06 J, and the hold-phase part by ≤ 0.004 J;
  - with **no IK-derived feed-forward at all (R0)**, the hold-phase build-up persists: 0.27 – 0.46 J vs 0.18 – 0.47 J guarded;
  - R0 itself exceeds Σ+ 0.5 J (V2-198-92 diag 180 Hz 0.546 J; V2-190-85 deep 180 Hz 0.555 J);
  - the guarded runs exceed R0 by 0.005 – 0.035 J.
- **Rate-dependent:** 37 / 6 / 0 failing D1G runs at 180 / 240 / 480 Hz. It accrues while the leg is held at end range against an unreachable target.
- **Consistent with** recorded debt TD-15 (180 Hz end-range integration).

**Not established, and therefore not attributed to TD-15:**
- D1G's **per-tick closure spikes** (> 0.05 J per tick, 24 runs) were partly caused by the **unguarded joint-rate feed-forward**. In V2-165-62 deep 180 Hz, swing Σ+ fell from 0.291 to 0.104 J and closure max from 0.18 to 0.025 J when it was suppressed.
- These are the target of this correction, not debt.
- D1G's DG-5 failure stands as recorded.

**Rule for CQ:** see CQ-5. **TD-15 gates** any later certification that exercises the unresolved 180 Hz end-range regime. TD-15 is not investigated now: none of TD2C, E2 integration, SV-2 re-qualification, PG-1 or official E2 holds a leg at an unreachable end range.

## 3. The IK mirror fold (user item 3): confirmations and disposition

**Evidence** (`evidence_dvg_design/ik_fold_solutions.txt`, `ik_fold_checks.txt`):

| check | result |
|---|---|
| mirrored inputs under identical equations / tolerances | one leg-agnostic `legIKBounded` (no side branch); shared `IK` constants; the soft-limit tables of the 6 solved coordinates are **exact mirror images on all 8 bodies** (worst mismatch 0.0 rad, same-sign for sagittal / twist coordinates, sign-swapped for the frontal hip / ankle coordinates) |
| both returned solutions individually valid where the target is feasible | at all 4 fold samples one side converges to an **interior solution** (residual ≈ 6 · 10⁻¹⁶, soft-limit margin 3.1 – 4.2°). The other side's active-set iterate parks the **knee coordinate on its soft bound** (−1.2217 rad) and stops at a constrained stationary point (residual 0.29 – 0.52 mm, a pose inside the limits) |
| execution-feasibility verdict conservative | the stalled side reports **unreached** (V1 fails, the guard treats it as invalid). "Reached" is the forward-kinematic residual itself, so it can never be reported falsely |
| no L / R physical outcome bias away from the fold | 72 closed-loop L / R pairs: **0** outcome-class differences (fell / abort); \|L − R\| ≤ 1.1 % max \|τ0\|, ≤ 0.008 J Σ+, ≤ 0.001 J per-tick closure, first invalidity within one tick, including both fold bodies |

**Disposition:**
- All four hold, and the two branches do not produce materially different feasibility or outcomes. The ambiguity is recorded as **debt TD-17** (bounded-IK branch selection at a soft-bound fold: active-set path dependence).
- **CQ and TD2C do not gate on exact internal IK-solution identity at a fold.** No solver or guard change.

## 4. Combined qualification (CQ): frozen at freeze step 2, before any CQ run

The safety properties (user item 4):
- no non-finite / unbounded command;
- commanded / applied actuator behaviour inside the already-defined capacity / rate semantics;
- invalid IK cannot inject uncontrolled energy;
- invalidity transitions continuous and bounded;
- normal executable trajectories unaffected.

| # | requirement | test | gate |
|---|---|---|---|
| **CQ-0** | default path unchanged | at the implementation commit, DVG off: the D1G DG-0 battery (KV0, 58 / 58, 99c29491, b62309f5, 3dd9f13d, b63184da × 3, c76cadc7, 56717579, TD2B 787cc0c9 / 83369114); **plus the D1G v1 record** d1g_PSTAR5CHABG_far_V2-REF_L_240 reproduced by `tools/d1g_val.mjs` (end hash equal to `evidence_d1g`) | all equal |
| **CQ-1** | normal / executable paths unaffected; AB2 / E1 / E1b / E2-swing regressions clean | DVG on. **(a)** AB nominal 432 (PSTAR5CHABV) vs the TD2B AB logs. **(b)** SV-2 servo-on 438 (PSTAR5CH + DVG, wrapper) vs the SV-2 logs. **(c)** E1a (10) + official E1b (28) under PSTAR4 + DVG (option-injection wrapper; the frozen runners unchanged) vs the same runs at this commit with DVG off. The E2 in-window swing (TDV nominal / earlyC / lateC / beyond / noground) is TD2C's C-G2 after adoption | **bit-identical** for every run with zero invalid evaluations. Engaged runs are listed and must pass their frozen contract with **no newly failing item**: (a) the AB2 per-run items of B-1's evaluator; (b) the frozen SV-2 evaluator; (c) `e1a_eval` RESULT PASS on the 10 and the E1b closing evaluation (`e1b_eval --config=PSTAR4` non-P15 criteria, `e1bclose_eval` P15 classes) PASS |
| **CQ-2** | unreachable / singular targets cannot generate unbounded / non-finite commands; capacity / rate semantics | **reach stress** (`tools/dvg_val.mjs`, the D1G set R timeline: deep / far / diag, turf off, 1.5 s hold): 8 bodies × 2 legs × 3 rates × 3 conditions × {PSTAR5CHAB guard off (reference), PSTAR5CHABV (DVG), PSTAR5CHABVR0 (energy reference)} = 432 runs | DVG runs: **(i)** every commanded τ0, applied τ and body state finite; **(ii)** over-capacity 0 (applied ≤ capacity); **(iii)** **rate envelope:** on every tick every applied component of the IK-derived joint-rate commands satisfies \|ω\*_i\| < w0 of that axis in that direction; **(iv)** every non-OFF guarded tick's source was V4-feasible (ratio ≤ 1); **(v)** the stress engaged the guard (else a test defect) |
| **CQ-3** | symmetric across legs | **(a)** mirror probe (`tools/dvg_unit.mjs`, after `d1g_unit`): 8 bodies × 3 conditions, left leg, 240 Hz, every 3rd guarded evaluation. The DVG verdict (V1 – V4, wq from the mirrored side's own D1 and the mirror-invariant magnitude of the left rates) on mirrored inputs. **(b)** closed-loop L / R pairs of CQ-2 (72) | (a) flags identical; λ to 10⁻⁶ · max(λ, ε²); residual classes equal; valid-sample D1 to 10⁻⁶ relative + 10⁻⁶ N·m. **IK-fold samples** (the two solves differ in reach class and the unreached side ends with a coordinate on its soft bound) and near-threshold samples are **reported, not gated** (TD-17). (b) both legs engage, and the same outcome class (fell / abort) in every pair |
| **CQ-4** | deterministic across legs and 180 / 240 / 480 Hz | (a) 24 same-rate repeats (DVG deep, L); (b) CQ-2 per (body, leg, condition) | (a) end hashes and DVG logs identical; (b) engaged at every rate or at none |
| **CQ-5** | no new energy source | E1a-8 (closure ≤ 0.05 J per tick, Σ+ ≤ 0.5 J) on every DVG run of CQ-2 and every engaged run of CQ-1 | a CQ-2 run that fails E1a-8 is **attributed to the pre-existing integration debt (TD-15), not to DVG**, iff against its paired R0 run (identical except no IK-derived feed-forward): Σ+(DVG) − Σ+(R0) ≤ 0.05 J (one tick's E1a-8 tolerance), **and** (closure max(DVG) ≤ 0.05 J **or** closure max(R0) > 0.05 J). Otherwise FAIL. **Every** E1a-8 failure is reported with its attribution. Reported: the motor work of the guarded terms over non-PASS ticks |
| **CQ-6** | transitions into / out of invalidity bounded and continuous | every guarded tick of CQ-1 and CQ-2 (records) | **(i)** exact law per axis: applied guarded contribution = w × unit-weight source contribution (FADE / RAMP; 10⁻⁹ N·m), 0 in OFF; **(ii)** FADE holds one source (the source tick is constant and equals the tick before the fade began); **(iii)** weight law Δw = min(dt / τ_g, S·dt / C_prev) to 10⁻¹²; **(iv)** guard-attributable per-axis step \|Δw\| × \|unit source\| ≤ the **E1a-7 commanded bound** 30 · 240 / hz N·m |

**Reported, not gated:**
- the raw max \|τ0\| and the historical B_cmd comparison;
- E1a-7 totals on the stress;
- held-term magnitudes, engagement counts and durations;
- outcomes;
- guard-off counterparts;
- IK-fold samples.

**CQ passes iff CQ-0 … CQ-6 pass.**

## 5. Order, adoption, stop rules

1. **This document:** freeze step 1.
2. Implement DVG in the repository from §1, plus the tools:
   - `tools/dvg_val.mjs` (stress; a copy of the D1G set R harness);
   - `tools/dvg_unit.mjs`;
   - `tools/dvg_wrap.mjs` (CFG wrapper and option-injection mode);
   - `tools/dvg_lib.mjs`, `tools/dvg_eval.mjs`;
   - the CQ run list and runner.

   Run CQ-0 and the design-verification smoke (disclosed); amendments only before the battery. **Freeze step 2.**
3. Run CQ. Any CQ failure → **stop, diagnose, no tuning.**
4. **If CQ passes:**
   - adopt DVG (`d1Guard: 2` in the E2 configurations that use IK-derived feed-forward);
   - a dated TD2C amendment that changes **only** the configuration it runs (PSTAR5CHABV / PSTAR5CHABTDV) and the guard-law checks (DVG's law, via `dvg_lib`). Conditions, criteria and run list stay frozen;
   - run the TD2C battery;
   - on a pass: E2 integration → swing / servo re-qualification for PG-1 → PG-1 → remaining prerequisites → official E2.

   Stop on a substantive new failure; stop before E3 if E2 passes.

## 6. Predictions

- **CQ-1:** no engagement in AB / SV-2 except SV-2's V2-long-legs C-L11 (unreachable; 6 runs). E1a / E1b non-P15: no engagement. **E1b P15 runs** (aborts, put-down) may engage; then the E1b closing evaluation decides.
- **CQ-2:**
  - raw max τ0 roughly ≤ 1.2 kN·m (reported);
  - (iii) holds by construction (V4 at the commanded rate);
  - CQ-5: some 180 Hz runs exceed Σ+ 0.5 J and are expected to attribute (design study: excess over R0 ≤ 0.035 J);
  - **at risk:** a run whose DVG excess over R0 exceeds 0.05 J.
- **CQ-6:** guard step ≤ ½ bound by design; gain changes within one tick can raise it. The gate is the full bound.
- **CQ-3 (a):** the fold samples recur (reported).

## 7. Known before this freeze

- D1G results and diagnostics.
- The design study of §0.
- The R0 comparison of §2.
- The item-3 checks of §3.
- No DVG code is in the repository at this commit.

---

# Part 8. Amendments (dated 2026-10-08; before any CQ battery run, committed with freeze step 2)

## A1. Implementation (`ctrl/v2_stand.js`; default off, `d1Guard: 2`), as §1

**Functions:** `dvgStep` (verdict, state, weight, outputs), `dvgRecordApplied` (the carry-over state), `dvgAxis` (torque-loop recording), `jfLam`, `dvgFeasible`.

**Recording only** (no effect on commands): per-axis unit contributions (applied `dvx`, source `dvu`, fresh `dvf`), the next tick's slew reference C, the source tick, the applied joint-rate command's force–velocity ratio, and a power term.

**D1G v1** (`d1Guard: true`) is untouched: it is selected by `=== true` and keeps its ledger fields. CQ-0 reproduces its record (d823bca7).

The repository implementation reproduces the design-study prototype bit-for-bit (deep V2-198-92 L 240: a9ff2f0a).

## A2. Operational definitions (tools; no criterion change)

1. **Tools:**
   - `tools/dvg_val.mjs` (stress; a versioned copy of the frozen `d1g_val`);
   - `tools/dvg_unit.mjs` (mirror; a copy of `d1g_unit`);
   - `tools/dvg_wrap.mjs` (`--dvgcfg` / `--dvginject`, with an optional guard-trace sidecar);
   - `tools/dvg_lib.mjs` (`guardLaw`; `ab2Metrics` / `tdMetrics` copied verbatim from `td2b_eval`);
   - `tools/dvg_eval.mjs`.

   Run list `e2/CQ_RUN_LIST.json`:
   - stress 432, repeats 24, mirror 24, AB 432, SV-2 438;
   - E1a 10 (incl. the V2-REF L repeat and V2-REF R of the closing set) and E1b 28 (the official set), each with DVG on and off.

   Runner `e2/scripts/run_dvg_cq.sh`; identity `e2/scripts/dvg_identity.sh` (the D1G DG-0 battery plus the v1 record).
2. **CQ-1 (c) "no newly failing item":** the frozen `e1a_eval` / `e1b_eval` report aggregate criterion verdicts. Every criterion that passes on the DVG-off set must pass on the DVG-on set, and the E1a RESULT must be PASS.
3. **CQ-6 guard law** (`dvg_lib.guardLaw`) is checked on the DVG stress runs, the repeats and the engaged CQ-1 runs (sidecars). The slew reference C of a FADE / OFF tick must equal the preceding tick's measured maximum unit source contribution (fresh for RAMP), to 10⁻⁹ relative. The domain-entry carry-over is counted, not compared (its C is measured off-domain).
4. **R0 runs** (`PSTAR5CHABVR0`) serve CQ-5 only. Their guard records are not meaningful for CQ-6 (the outputs are zeroed after the guard), and they are not gated on CQ-2 / CQ-6.
5. **"Motor work of the guarded terms" (reported):** realised as the integral over non-PASS ticks of Σ_axes (applied guarded contribution × the joint's axis rate) dt.
   - This is the **commanded** guarded term's power integral. The actuator's implicit damping (−(D + dt·K)·ω) and capacity clamp sit between that command and the applied torque, so it overstates the actuator work.
   - The actuator work itself is in the energy ledger (`Wact`), which CQ-5's closure test uses.
6. **The rate envelope** (CQ-2 (iii)) is checked on the applied joint-rate feed-forward ω\* (ikW). The B reference rate drives the passive damping reference, not an actuator, and is reported.

## A3. Design-verification smoke (disclosed; `evidence_dvg_design/implementation_smoke.txt`)

**Bit-identical with DVG and zero invalid evaluations:**
- AB nominal V2-REF L 240 R-F b63184da (184 evaluations);
- E1a V2-REF L PSTAR4 7d0ab4db (312 evaluations; equal to the E1b-closing evidence);
- E1b V2-165-62 L **P15** (abort, put-down) e6e2b493 (390 evaluations);
- SV-2 V2-REF L 240 R-F.

**SV-2 V2-long-legs C-L11** engages, as predicted (the unreachable trajectory).

**Mini-set CQ evaluation:**
- **diag V2-198-92 180 Hz** (both legs): Σ+ 0.581 / 0.579 J vs R0 0.546 J; closure max 0.0241 J (R0 0.0241). Hence **attributed to TD-15** under CQ-5 (excess 0.035 J).
- Guard step ≤ 20.0 N·m (bound 40); rate envelope ≤ 0.28; mirror-valid D1 to 7 · 10⁻⁸ N·m; L / R Σ+ difference 0.0014 J.

**Tool defects found and fixed before the freeze:**
- `guardLaw` read a missing `valid` field (now V1 ∧ V2 ∧ V3 ∧ V4);
- the E1 repeat-run naming;
- the identity script invoked with zsh instead of bash.

## A4. No other change

The criteria of §4, the sets, the attribution rule and the stop rules are unchanged.

## A5. Erratum E1 (implementation), the aborted first CQ run, and the added set CQ-6x (dated 2026-10-08; before any CQ evaluation)

### Erratum E1 (implementation, not design)

**The defect:**
- The first implementation (b08b77a [published as 6b7ab90]) applied the guard's held / ramped terms only into slots the tick had already filled with a fresh term.
- When the commanded target ended mid-fade, no D1 was evaluated (no swing reference), and the held D1 was dropped in one tick. That violated §1: "once engaged, until back in PASS"; FADE "holds the last valid terms".

**How it was found:**
- By the smoke of the prepared TD2C amendment (amended `td2c_val` / `td2c_eval`; earlyOOE V2-198-92 L 480 H-D and obs20 V2-198-92 L 180 H-D).
- `guardLaw` flagged 162 and 18 per-axis law violations on the post-contact hand-back ticks after the target cleared.

**Fix:** the guard now applies its terms whether or not the tick produced a fresh one (`dvgStep` outputs).
- Re-smoke: 0 law violations; U-1 … U-7 and DG-6 pass on those runs.
- The stress hash is unchanged (deep V2-198-92 L 240 a9ff2f0a: the target is held there, so the defect could not occur).

### The first CQ run (b08b77a [published as 6b7ab90])

- It was started (00:58) and **aborted at 01:05, unevaluated**, as soon as the defect was confirmed: 73 / 1,426 jobs done, CQ-0 12 PASS lines.
- It was not evaluated, and none of its runs is used.
- It is kept aside as `scratchpad dvgcq/run_aborted_b08b77a` and listed in the results.

### Added set CQ-6x: domain exit with the guard engaged (a strengthening, prompted by the defect class)

**Condition `deepRel`:** "deep", with the commanded target **released at T**, so the guard must complete its fade under the contact / rest law with no commanded target.
- 8 bodies × 2 legs × 3 rates × {PSTAR5CHABV, PSTAR5CHABVR0} = 96 runs.

**Gated:**
- CQ-2 (i) – (iv), (v);
- CQ-3 (b) pairs and CQ-4 (b) rates;
- **CQ-6** (the full guard law, incl. after the release).

**Energy reported, not gated**, with its R0 comparison:
- The release of a fully extended leg produces a per-tick closure burst in the first 0.1 s that is present **without** IK-derived feed-forward: R0 0.47 – 0.56 J; 0.13 – 0.15 J per tick at 180 Hz. This is the unresolved TD-15 end-range regime, which the user ruled gates any certification of that regime.
- **Disclosed before freezing:** in the smoke, V2-198-92 180 Hz deepRel had Σ+ 0.816 J vs R0 0.624 J (excess 0.19 J > CQ-5's 0.05 J), while V2-REF 180 Hz exceeded R0 by 0.02 J; 480 Hz runs were clean.
- **The CQ-5 rule for the frozen sets (deep / far / diag) is unchanged.** CQ-6x's energy line is reported as found (`erratum_E1_and_cq6x_smoke.txt`).

**Run list:** stress 528 (432 + 96). Freeze step 2b commits the corrected implementation, `dvg_val` (deepRel) and `dvg_eval` (CQ-6x).

**CQ-0 at the corrected code:** 12 PASS (KV0, 58 / 58, every reference hash, the D1G v1 record d823bca7).

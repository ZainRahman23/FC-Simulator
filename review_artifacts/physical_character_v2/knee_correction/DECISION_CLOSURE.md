# Closing the pre-E1a decisions (audit + investigations; before the superseding preregistration)

**Source:** `../sources/2026-10-04_user_instruction_close_decisions_before_e1a.md` (verbatim).

**Integrity:**
- The original frozen preregistration (`KNEE_CORRECTION_PREREG.md`), its results (`KNEE_CORRECTION_RESULTS.md`, `evidence/official/`), the old knee and every historical result are **unchanged**.
- Every original FAIL below **stays a FAIL** in the record.
- Superseding criteria are versioned in `QUALIFICATION_V2_PREREG.md`, committed before any further qualifying run.
- Audit runs: `evidence/audit/` (code at commit 89cb31e plus the audit hooks listed in §6). The twist battery ran from a scratch copy.

---

## 1. The four preregistration failures, audited one by one

The common test for each: was the criterion wrong, or did the knee fail the physical requirement the criterion meant to test? Each corrected criterion is:
- **derived from that requirement**, keeping the original constants where they still apply;
- run on the **old knee** (accepted plant), the **corrected knee** and **deliberately bad variants**, to show it still discriminates.

**The bad variants** (test-harness patches only; the simulator is untouched):

| variant | what it does |
|---|---|
| **naive** | the moving rest angle **without** the flexion reaction (the envelope frozen at the current flexion inside the gradient: exactly the per-tick rest-angle move you prohibited) |
| **inject** | +0.5 N·m·s/rad negative damping on the knee twist row (an energy source) |
| **spring** | a non-potential elastic torque −0.2 N·m/° × (θ − θ0) |
| **stepped** | the ER width switching 0.5 → 1.0 at 20° (a discontinuity) |

### 1.1 KV2b: "passive work = −ΔU − viscous loss"

- **Original result:** FAIL (14 / 35 rig runs), preserved.
- **Why the criterion was wrong:**
  - The passive drive is an implicit spring. Jolt's converged motor impulse is λ/dt = K·δ − (c + dt·K)·Jv (`sim/v2_passive.js`, the drive encoding).
  - Its −dt·K·Jv part is the linearised spring evaluated at the end of the step. It absorbs energy whenever the spring moves (the energy-safe design: every linearisation error is dissipative).
  - The ledger counted only c·ω² as dissipation, so it demanded energy conservation from a scheme designed to dissipate. The accepted old knee fails it identically (−0.55 J).
- **The intended invariant:** the applied passive torque is the gradient of U (power consistency) and the passive layer never creates energy.
- **Superseding KV2b′**, from the drive encoding. Elastic part = λ/dt + c·ω_end (+ explicit remainder); viscous part = −c·ω_end.
  - (a) no elastic creation: W_el + ΔU ≤ 0.02 J + 0.5 % ∫|P_el| (the original constants);
  - (b) viscous part dissipative: W_visc ≤ 0.02 J;
  - (c) consistency: |W_el + ΔU| converges with the timestep, with empirical order ≥ 0.5 from 240 → 480 Hz and monotone from 180 Hz, unless it is below 5 mJ.
- **Why order ≥ 0.5:** a torque that is the gradient leaves only discretisation error (→ 0 as dt → 0; first order for this scheme). A torque that is not the gradient leaves a dt-independent error (order 0). 0.5 is the midpoint.
- **Discrimination** (`evidence/audit/rig_*.log`):

| variant | (a) creation | (b) viscous | (c) order 240 → 480 Hz | verdict |
|---|---|---|---|---|
| corrected knee | none (30 / 30 runs) | ✓ | 0.85, 0.65, 1.10, 3.83, 2.35 | **PASS** |
| old knee | none | ✓ | 0.72, 0.72 (multi-rate run `rig_old_kv8`; the single-rate old logs print a vacuous FAIL for (c) because they contain no rate family) | **PASS** |
| naive | +0.08 … +0.23 J | ✓ | 0.00 (kv6b: 5.75 mJ at every rate) | **FAIL** |
| inject | +2.5 … +7.3 J | ✓ | −0.95 … −2.55 (grows) | **FAIL** |
| spring | +0.10 … +0.25 J | ✓ | 0.00 … 0.41 | **FAIL** |

### 1.2 KV3b: closed flexion–axial cycles

- **Original result:** FAIL (12 cycle violations; amplitude "growth" 6.55 %), preserved.
- **Why the criterion was wrong:**
  - Its two-sided bounds (|closure| ≤ 0.05 J, |W_el| ≤ 0.02 J + 1 %) treat dissipation like creation. In fast 120° flexion cycles the plant's numerical dissipation (implicit drive + Jolt constraint stabilisation) is −0.10 … −0.15 J per cycle; the old knee shows −0.11 … −0.13 J in the same cycles.
  - "Amplitude growth" measures excursion, not energy. The corrected knee's 6.55 % is a one-time step (3.51 → 3.74°) with energy falling; the old knee's is 128 % in its slack zone.
- **The intended invariant:** a passive conservative element plus dissipation returns no net energy over a closed cycle and does not pump.
- **Superseding KV3b′** (per cycle 2–5; the original magnitudes, made one-sided):
  - closure ≤ +0.05 J;
  - W_el (exact decomposition) ≤ +0.02 J + 1 % ∮|P_el|;
  - pumping: energy at the same cycle phase non-increasing within +0.02 J.
- **Discrimination:**

| variant | verdict | detail |
|---|---|---|
| corrected knee | **PASS** | 24 cycles |
| old knee | **PASS** | 24 cycles |
| naive | **FAIL** | W_el +0.046 J per cycle, 0–120° |
| inject | **FAIL** | closure +1.3 … +2.0 J per cycle |
| spring | **FAIL** | W_el +0.05 J per cycle |

### 1.3 KV4a.3: "continuity across the 0–40° grid (5° steps) ≤ 2.5°"

- **Original result:** FAIL (2.66°), preserved.
- **Why the criterion was wrong:**
  - Its intent (its own name) is continuity. A bound on the change per 5° is a bound on slope; it cannot tell a steep smooth ramp from a jump.
  - The frozen ER ramp (provisional, 15–40°) has a C¹-smooth maximum slope of 0.53°/°.
- **Superseding KV4a.3′:** continuity by refinement, over φ ∈ [−5, 40]° at 2.5 / 5 / 10 / 15 N·m, per side.
  - (a) the largest increment over a 0.05° step ≤ 0.75 × the largest over a 0.1° step. A Lipschitz function halves (ratio 0.5); a jump does not (ratio 1); 0.75 is the midpoint.
  - (b) no increment > 0.1° per 0.05° step: a jump detector at 2°/°, ≥ 3.6× the steepest evidence slope (0.55°/°, Boguszewski 2015).
  - C¹ reported.
- **Slope magnitude** stays a parameter question, judged against the evidence by KV4a.1, which passes (|z| ≤ 1.11).
- **Discrimination:**

| variant | verdict | ratio | largest step |
|---|---|---|---|
| corrected knee | **PASS** | 0.500 | 0.027° |
| old knee | **PASS** | 0.501 (C¹ kink 0.028°/° reported) | — |
| stepped | **FAIL** | 1.000 | 12.5° jump |

### 1.4 G1 row 5: the knee-flexion damping-only rig (a test premise)

- **Original result:** FAIL (5.a: −1.152 vs −0.896 N·m), preserved.
- **Why the premise was wrong:**
  - The test assumes no elastic torque at the rig's "ROM centre" (axial 0 at 70° flexion).
  - Under `v2k` that pose is 14° external of θ0(70°), so the axial term is active, and its **flexion reaction**, required by your decision 4, acts on the flexion row.
  - The −0.256 N·m difference equals the predicted 3.84 N·m × θ0′(70°) = 0.068.
- **Superseding G1-5′:** the expected flexion-row torque is −c·ω **plus the specification coupling** cos(tw)·(−∂U_spec/∂φ), taken from the independent spec law (`kneeAxialTorque`). The original tolerances are unchanged.
- **Discrimination** (`tools/g1_row5_audit.mjs`):

| variant | verdict | 5.a at release |
|---|---|---|
| corrected knee | **PASS** | −1.152 vs −1.138 |
| old knee | **PASS** | −0.897 vs −0.897 |
| naive | **FAIL** | −0.897 vs −1.139: no flexion reaction |

- **This makes the test a direct check of the energy-consistent coupling.**
- (The 0.52 N·m tracking error later in the run is the knee **flexion** end range at 145°, the same in v1; tolerance 7 N·m.)

---

## 2. The splayed-leg hip-rest finding: a genuine finding

### 2.1 Mechanism (`tools/splay_probe.mjs --mode=trace`, V1-matched upright, k = 0.13)

- **0–0.3 s:** the knees buckle to about 95°. The corrected knee's axial follows its reference path, θ0(95°) ≈ 15° internal. With the feet planted, the femurs turn outward (hips +3.5° abduction, −3.8° rotation already at 0.3 s).
  - The old knee's axial stays near 0° (50° slack zone), so its femurs do not turn.
- **0.5 s:** both models reach a full passive squat, knee flexion 162° (beyond the 155° flexion limit). The corrected knee is at about 25° internal, its hips at about 19° abduction.
- **0.7 s:** the corrected-knee body sits down between splayed legs (hips about 100° flexion, 98–100° abduction, −77 … −80° rotation). The old-knee body folds its legs together and falls over the knees.
- **Rest:** the hips rest on their combined end range. The legs' weight loads the hip rotation end-stop at about 45–72 N·m, while the knees rest inside their envelope (6–8 N·m).

### 2.2 Dependency on the provisional > 120° parameters (`--mode=map`; 35 cells δ150 × w150 × 15 lift members; characterisation, not selection)

| δ150 \ w150 | 1.0 | 0.8 | 0.6 | 0.45 | 0.3 |
|---|---|---|---|---|---|
| −8 | 5 | 0 | 0 | 0 | 0 |
| −4 | 0 | 0 | 0 | 0 | 0 |
| −2 | 9 | 0 | 7 | 2 | 0 |
| 0 (central) | 15 | 15 | 13 | 13 | 0 |
| +2 | 15 | 14 | 15 | 15 | 0 |
| +5 | 15 | 15 | 7 | 0 | 0 |
| +10 | 1 | 0 | 0 | 0 | 0 |

*(1.3d failures of 15 per cell, all at the hip rotation.)*

- **The splayed collapse occurs in 15 / 15 members of every cell, and on V2-REF too.**
- The deep-flexion parameters do **not** decide the splay. Only the resting hip excursion varies: 0.56–2.26° over the 525 runs (median 1.25°; V2-REF 0.98–1.16°), and it crosses G1's 1.5° tolerance erratically (non-monotonic in both parameters).
- **The splay comes from the evidence-calibrated reference path during the buckle (≤ 120°), not from the provisional region.**
- **This corrects my reading in `KNEE_CORRECTION_RESULTS.md` §4 / §5.2** ("it depends on the provisional deep-flexion parameters"; "0.0–0.7 % at in-band alternatives"). Those runs counted G1 failures. The same 0 / 15 cells still splay in 15 / 15 members: the alternatives move the rest's excursion below 1.5°, they do not change the collapse. The results file stays as written; this is the record of the correction.

### 2.3 The two settings that "remove" the failure, judged on evidence only

| setting | evidence for | evidence against | can the evidence separate it from central? |
|---|---|---|---|
| δ150 −4 (θ0(150°) ≈ 10.75° vs central 14.75°) | cadaver passive paths: Li 2004 11.1 ± 6.7°, Most 2004 7.2° (TEA) | Most 2004 19.9° (GCA), Victor 2010 16°, in vivo unloaded MRI rise (Nakagawa 2000), in vivo weight-bearing 15–29° | **No.** Both lie inside the cadaver passive band (7–20°) and within one between-subject SD (6–9°) of each other; the axis definition alone moves θ0 by about 13° (Most 2004) |
| w150 0.3 (strong deep narrowing vs none) | Li 2004 "highly constrained" at 150°; Kono 2018 activity spread 20° → 2.5°; van Kampen −20–30% at 133–138° | Markolf 1976 (35 knees): no narrowing at 135° | **No.** The evidence conflicts. Narrowing beginning at about 135° would reconcile it, but no torque-defined data exist beyond 120° |

- **The G1 outcome is not evidence about either parameter.** It does not remove the splay; it moves a marginal excursion across a threshold (§2.2).
- **Decision:** the deep-flexion parameters stay a **provisional uncertainty family** with the central member as default. No member is selected.

### 2.4 Does the deep-flexion family matter inside E1a's envelope? No.

- **Analytically:** the deep terms are S((φ − 120°)/30°) and S((φ − 125°)/25°), both exactly 0 below 120° / 125°.
- **Measured** (`tools/deep_irrelevance.mjs`): the E1a pelvis drop (reference + lifecycle + `v2k`, k 0.13) gives **bit-identical final state hashes** across all 8 family members tried (δ150 −8 … +10, w150 0.3 … 1.0, combined), on V2-REF and V2-165-62.
- E1a's knees peak at 28.3–29.7°.

### 2.5 Status

- **This is a genuine G1 finding of the adopted knee:**
  - a robust splayed passive collapse whose rest loads the hip's combined flexion–abduction–rotation end range;
  - the hip end-stop's settled compliance sits at G1's 1.5° tolerance (V1-matched straddles it; V2-REF stays below).
- I have not loosened the tolerance, tuned the hip or selected knee parameters. It does not involve the knee mechanism, deep flexion or anything E1a exercises.
- **Resolving it requires your decision** (§7).

---

## 3. Ankle stiffness k ≈ 0.13 with the corrected knee (decided on the preregistered ankle requirements, not on G1 rate)

**Three roles, kept apart:**
1. **Passive unloaded ankle evidence:**
   - whole-foot axial stiffness about the tibia, 0.10–0.15 N·m/° unloaded (Watanabe 2012, Hattori 2022, Ficanha 2015: full texts, lit1);
   - k = 0.13 is the evidence centre, a **tissue property**;
   - k = 0 (a ±10° zero-stiffness zone) contradicts it.
2. **Single-support yaw anchoring:**
   - in humans it is distributed: hip rotators (largest), ground torque, foot/ankle. **Loaded** small-angle foot stiffness is unmeasured (lit1).
   - In our model, KV10 shows the passive foot-axial joint dominates whole-body yaw compliance with either knee, while the controller's hips counter-rotate. That is a model property, not a human budget.
3. **Active foot/subtalar yaw control:**
   - the oblique subtalar axis gives humans an **active** yaw path (moment arms up to about 20 mm, McCullough 2011);
   - our reduced ankle coordinate is `passiveOnly`, so **this path is absent** (`final_pre_e1a/SINGLE_SUPPORT_YAW.md`, architecture D).

**Decision:**
- k = 0.13 is adopted for the E1a configuration **as the passive tissue value only**.
- It is **not** raised or tuned to supply yaw stability. Whole-body yaw stability must come from the hips (reference semantics) and, eventually, the missing active path.
- E1b-17 stays the declared place where that absence may show.

**Preregistered requirements** (`final_pre_e1a/ANKLE_LAW_PREREG.md`), with the corrected knee:

| criterion | k = 0 | k = 0.13 | source |
|---|---|---|---|
| AL3 unloaded plausibility | ✗ (zero stiffness in ±10°) | ✓ | lit1 |
| AL4 loaded behaviour (HO1 ≤ 15°; LIFT ≤ 5°) | HO1 12.8°, LIFT 4.7° (C6 fails on 3 bodies) | HO1 10.0°, LIFT 1.1° | battery, reference policy |
| AL5 morphology | — | ✓ (8 bodies) | battery |
| AL6 rate | ✓ | ✓ | final pre-E1a §9 |
| AL7 G2 / G3 (reference + lifecycle) | — | G2 ✓, G3 14 / 15 (only K, which K′ resolves, §5) | KV9f |
| AL8 approaching single support (twist ≤ 3°) | ✗ (4.8°) | ✓ (1.3 / 1.2°) | battery |
| AL1 full G1 | the splayed-rest finding (V1-matched upright, 10 / 15 at k = 0) | the same finding (15 / 15) | **present at both k: not caused by k** |

---

## 4. Reference twist semantics with the corrected knee and k = 0.13

**Battery** (preregistered `final_pre_e1a/TWIST_POLICY_PREREG.md` scenarios; 384 runs: {reference, current} × 8 bodies × 12 scenarios × k {0.13, 0}, `v2k`; frozen evaluator; `evidence/audit/policy_eval.json, twist_battery_v2k/`):

| policy at k = 0.13 | C1 | C2 | C3 | C4 (voluntary turn held) | C5 | C6 (LIFT) | C7 |
|---|---|---|---|---|---|---|---|
| **reference** | ✓ (8 / 8) | ✓ | ✓ | ✓ (yaw at 12 s: 20.0°) | ✓ | ✓ (stance ankle 1.1°) | ✗ on V2-165-62, V2-198-92 |
| current | ✗ (6) | ✗ (6) | ✗ (7: adopts twist) | ✗ (6) | ✗ (2) | ✗ (8) | ✓ |

At k = 0 the reference policy fails C4 on all 8 bodies and C6 on 3: no policy works without the evidence-based ankle stiffness, as before.

**Two criterion flaws, audited the same way as §1:**

**C7 (HO1).**
- The reference "failures" are the **unloaded** left foot of the U:R single-support hold being dragged 25–40 mm by the 1 N·m·s pelvis yaw impulse. The **stance foot slips 0.3 mm in every run.**
- C7 inherits G2's bilateral relocation rule (either foot > 20 mm, `gates/v2_g2.js` l. 136) inside single-support scenarios, where one foot carries no load.
- With the old knee the same foot was dragged 12–19 mm: its 50° axial slack absorbed pelvis yaw that the physiological knee now passes to the leg.
- **Superseding C7′:** judged on the **supporting** feet (HO1 / HO2 right, HO3 both). No fall / step, no supporting foot displaced > 20 mm; the non-supporting foot's displacement is reported.
- **Discrimination** (`tools/c7_adversarial.mjs`, HO2 on an "ice" turf via the friction policy):

| contact μ | supporting foot (R) | unloaded foot (L) | original outcome | C7′ |
|---|---|---|---|---|
| 0.05 | 2.5 mm | 25.5 mm | "foot relocated" | not flagged (only the unloaded foot moved) |
| 0.04 | 23.8 mm | 54.2 mm | "foot relocated" | **flagged** |
| 0.03 | 73.6 mm | 110.2 mm | "foot relocated" | **flagged** |
| 0.025 | 996 mm | 766 mm | step required → fell | **flagged** |

*(V2-REF, reference, k = 0.13; `evidence/audit/c7adv_*.log`. HO1 on μ 0.05 drags the unloaded foot 59 mm with the stance foot at 0.2 mm: the yaw impulse spins rather than slides the stance foot.)*

**C1 (HO3).**
- The HO3 push (15 N·s, set from V2-REF) fells V2-165-62 under **every** policy. C1 then classifies the twist of a fallen body.
- **Superseding C1′:** the preregistered C7 capacity-fall exemption, applied to C1. An HO3 fall shared with "current" is a push-capacity event.
- **Discrimination:** "current" still fails C1′ on 5–7 bodies (sustained oscillation in PY4 / PR8).

**Under C1′ / C7′:**
- **reference at k = 0.13 meets every criterion on all 8 bodies** with the corrected knee;
- "current" fails C1′, C2, C3, C4, C6.

**Decision:**
- **Adopt reference semantics** in the E1a configuration: twist DOFs target their anatomical neutral, which for the knee is θ0(φ).
- **Voluntary heading stays an active command** (`yawCmd` → heading target; TURN: 20.0° held to 12 s, C4 ✓). Retained twist is never adopted (C3 ✓: 0.16° residual after the sustained-torque release).

## 5. Support lifecycle / G3 row K

**Original result:** K FAIL in the E1a configuration (T11 over 1.2 stands), preserved.

**What row K asks:**
- An excessive request (λ_R → 1.2, 1.4, 1.4 supervised) must not be realised as a stable stance.
- The T11 title says the λ = 1.2 target lies "beyond the right foot's region **centroid**". Beyond the centroid is not the same as infeasible.

**Geometry** (`tools/k_premise.mjs`, the controller's own target law at the T11 start state). Signed margin of the λ target inside the stance foot's usable region:

| request | margin, all 8 bodies |
|---|---|
| λ 1.2 | **+1.09 … +1.11 cm (inside)** |
| λ 1.3 | −0.5 … −0.8 cm |
| λ 1.4 | −2.1 … −2.8 cm |

**Classification:** λ 1.2 is **physically feasible** (single support with the COM 1.1 cm inside the boot edge).
- The lifecycle realises it: the left foot is released (s → 0) and the right carries 100 %, with a minimum margin of 0.58 cm. The validated controller without the lifecycle cannot realise this feasible target and falls.
- **This is an obsolete premise, not a lifecycle defect.**
- The genuinely excessive λ 1.4 fails physically in every configuration. Row L (no authority writes, energy, capacities) holds.

**Superseding K′:**
- every T11 request whose target lies **outside** the stance foot's usable region (margin < 0) is not realised as a stable stance;
- feasible requests are reported, not required to fail.

**Discrimination:**
- **"Silent rescue" adversarial:** a controller that rescales the request so its peak maps to λ 1.1 (target ≥ 2 cm inside). In the E1a configuration it makes **T11 over 1.4 stand**, and **K′ fails it.**
- K′ passes the E1a configuration, the corrected knee with the default controller, and the accepted old-knee G3.

---

## 6. Audit tooling added (test harness only; no change to the corrected knee or the default path)

**Tools:**
- `tools/knee_v2k_rig.mjs`: exact elastic / viscous decomposition, `--crit=v2` (KV2b′, KV3b′), `--adv=naive|inject|spring`, old-knee multi-rate comparator.
- `tools/knee_v2k_bench.mjs`: `--crit=v2` (KV4a.3′, with old and stepped comparators).
- `tools/g1_row5_audit.mjs`.
- `tools/k_premise.mjs`.
- `tools/close_eval.mjs`: K′, C1′, C7′ next to the originals.
- `tools/c7_adversarial.mjs`, `tools/splay_probe.mjs`, `tools/deep_irrelevance.mjs`.

**Code edits:**
- `gates/v2_g1_tests.js`:
  - G1-5′ behind `V2_KNEE_CRIT=v2`;
  - `passiveHook` for discrimination tests;
  - the rig's passive layer now receives `opts.kneeModel` when given. An audit bug of mine: without it, an option-selected model fell back to the env.
- Browser checks:
  - `spec/v2_joints.js` `setAnkleNeutralKOverride` (default null);
  - viewers g1 / g2 / g3 check-mode URL configuration;
  - `tools/g*_browser.mjs` `--qs` / `--out`.

**Qualification tooling** (added before the freeze, all default-off):
- `tools/knee_v2k_ctrl.mjs` gains `--stand` (the adopted configuration), `--hz`, and a hard-limit margin report for hips and knees.
- `tools/yaw_decomp.mjs` gains `--stand`.
- `tools/g3_mirror_v3.mjs`:
  - gains `--stand` / `--out`;
  - J2a now **mirrors the lifecycle state** (feet swapped, anchor / swing poses reflected). Without this a J2a run with the lifecycle would compare unmatched controllers.
- `tools/qual_eval.mjs`: G2 v1 / G3 v3.3 evaluators on the adopted configuration, K → K′.
- Regressions R9.a–b: the ankle override is inert by default and reversible.

**Development smoke checks** (allowed, listed; no result is used as qualification evidence):
- J2a on the U:R pairs in the adopted configuration: 9 / 9, mismatch ≤ 3e-11 N·m.
- Browser = Node in the adopted configuration against the official 097dcb7 runs: G1 10 / 10, G2 6 / 6, G3 4 / 4.
- `qual_eval.mjs` on the official E1a-configuration G2 / G3 runs:
  - only browser / J2a missing (not run there);
  - K′ PASS where K FAILs.

**Freeze checks:**
- After every edit the default path is bit-identical: 4 / 4 G3 hashes equal `hash_head.txt`.
- Suite 52 / 52; `guard_v1` OK.

## 7. What remains open

**One item: the splayed-leg hip rest (§2.5).** Everything else closes on evidence and on versioned criteria with demonstrated discrimination. The qualification run (`QUALIFICATION_V2_PREREG.md`) checks that everything else holds on frozen code.

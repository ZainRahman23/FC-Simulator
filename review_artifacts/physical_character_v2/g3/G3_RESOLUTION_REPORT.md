# V2-G3 resolution / diagnostic pass (D1–D6): decision report

**Source:** the user's decision of 2026-10-03, `../sources/2026-10-03_user_decision_g3_resolution_pass.md`.

**Status: G3 is NOT declared passed. G3 final run 3 (post-fix, criteria v1 unchanged): 16/19.** The four disputed criteria are unchanged, and their results are preserved as measured.
- **D1 determinism fix:** approved and implemented. G2 was re-validated and **PASSES 13/13**.
- **D2–D5:** diagnostics only. No anatomy, passive-tissue, actuator, criterion or budget change.
- **D6:** diagnostic configurations only. Nothing was removed.
- **G4 not started. Nothing pushed.**

**Tools added (permanent):**
- `tools/g3_twist.mjs` (D2), `tools/g3_mirror.mjs` (D4), `tools/g3_bench.mjs` (D5);
- the `--stand=` / `--tag=` diagnostic configurations of `tools/g3_run.js` (D6);
- the viewer's `?tickhash=` cross-engine divergence finder.

**Data:** `json/g3_twist.json`, `json/g3_mirror.json`, `json/g3_bench.json` (+ `g3_bench_prefix_tree.json`), `json/g3_d3_unload_*.json`, `json/g3_d6_compare.json` and `json/g3_results_D6_*.json.gz`. Run 2 is preserved in `json/run2/`. The accepted pre-fix G2 artifacts are in `../g2/accepted_pre_D1/`.

## 1. Post-fix G2 result

**What changed (D1, approved).** Every non-correctly-rounded `Math` call in physics-feeding standing-controller code is replaced by the project's deterministic math:
- `ctrl/v2_stand.js`: 11 × `Math.hypot` → `dnorm`, 3 × `Math.atan2` → `datan2`, 2 × `Math.asin` → `dasin`. This covers the leg IK residual and line search, heading yaw, CoP allocation, polygon distance and inset, `norm2`, and the hip / arm strategy deviation.
- `ctrl/v2_stance.js`: 1 × `Math.hypot` → `dnorm` (the stance-reference solver's convergence test).
- `dnorm` (√ of the in-order sum of squares) and `dasin` are new exports of `core/v2_math.js`. Same quantities, IEEE-exact operations only. No other logic change.

**Audit result, not fixed (outside the approval):** `sim/v2_passive.js:115` (G1 passive layer, predictive linearisation angle) uses `Math.hypot`. It is the same hazard class. Fixing it would change accepted G1 at the last bit, so it is for your decision. Everything in `gates/` is measurement-only, which the rule allows.

**Re-validation, in the order you set:**

| step | result |
|---|---|
| G0 | all checks pass |
| G1 | curated 10/10; full results unchanged (227 hashes, 0 differences). G1 does not use the controller. |
| G2 complete 620-run validation | **PASS 13/13** on the clean run. Outcomes **620/620 identical** to the accepted run. Hashes 0/620 identical (expected: every run changed at the last bit). |
| How large the change is | Recovered runs (339): max \|Δ foot slip\| **0.012 mm**, max \|Δ ξ deviation\| 0.014 mm, recovery time ≤ 1 detection tick. Only post-fall sliding of falling runs differs materially (chaotic). |
| G2 browser = Node | 6/6 |
| G2 snapshot / restore | 3/3 bit-exact |
| G2 determinism ×3 | 6/6 |
| Two post-fix G2 runs | 620/620 hash-identical |

**Recorded openly: the first post-fix G2 run evaluated 12/13.**
- Row 2.5 (controller cost) measured 0.190 ms, because my D2 / D3 diagnostics were running alongside it (≈ 12 processes instead of the accepted 9).
- The isolated benchmark shows the deterministic math costs nothing measurable:

  | scenario | pre-fix controller mean | post-fix |
  |---|---|---|
  | G3 T5 | 0.0358 ms | 0.0364 ms |
  | G2 quiet stance | 0.0252 ms | 0.0284 ms (overlapping trial ranges) |

- The clean re-run under the accepted conditions gives 0.115 ms mean (accepted: 0.108), p99 0.467 (accepted: 0.507), so **row 2.5 PASS**.
- Both evaluations are kept: `../g2/postD1_contended/`, and the current `../g2/json/`.

## 2. Post-fix G3 result (final run 3; criteria v1 unchanged)

**16/19.** Rows run, A–H, K–N, O, P and Q pass.

| row | run 2 (pre-fix) | run 3 (post-fix) |
|---|---|---|
| **O browser = Node** | FAIL 3/4 | **PASS 4/4**: T5, U:R, T3, and the previously diverging T8 hold R push R 10 |
| **I body variants** | FAIL: short-legs 0.9487 / 0.9483 | **FAIL (preserved):** short-legs **0.9487 / 0.9483** |
| **J mirror symmetry** | FAIL: Δ slip 0.76 / 0.60 mm | **FAIL (preserved):** Δ slip **0.76 / 0.60 mm** (T7 0.5 / 0.25 s) |
| **S controller cost** | FAIL: 0.152 ms | **FAIL (preserved):** **0.173 ms**, inside the 9-process run |
| P earlier gates | PASS | PASS: G0 ✓; G1 ✓; G2 = the re-validated post-fix baseline (two runs hash-identical, PASS 13/13) |

Every physical result is unchanged to the printed precision:
- near-single-support min 0.9536 / mean 0.9678;
- unloading 5.31 s at ≤ 1 % BW, 0 contact loss;
- H1 32/32, H2 18/18;
- T11 falls physically;
- energy and authority ledgers exact.

## 3. Ankle-twist causal analysis (D2 — diagnosis only)

Data: `json/g3_twist.json`, from accepted-G2 pushes, G3 transfers / pushes, and a torque-step probe at 5 support levels × 2 legs × 2 torques.

**3.1 Which physical DOF: one coordinate.** It is the ankle's **passive foot ab/adduction**, i.e. axial rotation of the shank on the planted foot. Three independent measures agree to ≤ 0.2°:

| T5 | L | R |
|---|---|---|
| joint coordinate | 10.68° | 11.05° |
| foot-relative-to-shank rotation about the shank long axis | 10.51° | 10.88° |
| shank world yaw | 10.49° | 10.88° |

- Foot world yaw ≈ 0 (the foot never turns).
- Inversion changes 6.6° (the subtalar-like axis follows load, not twist).
- **Knee rotation ≤ 0.4°**, so thigh and shank turn as one unit.
- **Hip rotation is equal and opposite (≈ −10°)**, keeping the pelvis at ≤ 2° in slow transfers.
- The ground's vertical moment about the ankle equals the passive ab/adduction torque (T5: 1.12 vs 1.12 N·m; G2 R20: 6.05 vs 6.07 N·m), and the free moment matches. That tissue is the only yaw path from the leg to the turf. No actuator spans the axis.

**3.2 Under load, unloading, or both: both.**
- The loaded and the unloading leg twist about equally (T5 stance 11.05°, unloading 10.68°).
- The peak is in the **transition** (stance load 0.6–0.9: 10–11°). In the static near-single-support hold it is 2.7° on both legs.
- It grows with transfer speed: 12.5–13.0° at 2 s ramps, 12.3–13.1° at 1 s, 11.9–13.1° in pushes.

**3.3 Restoring, neutral or unstable: neutral with free play, bounded by end-range tissue.**
- Under a constant 0.5 N·m axial torque on one shank, the leg turns **8.7–14.1° within 1 s with zero passive torque** until the tissue engages (> 10°).
- After release it **does not return to centre**. It wanders / oscillates within about ±7–14° for ≥ 6 s (e.g. λ 0.95: +6.2, −5.8, +10.5, −1.2, +7.9° at 0.5 / 1 / 2 / 3 / 5.9 s).
- It never grows beyond the end range (not unstable).
- The pelvis is barely affected (≤ 2–4°), because the hip counter-rotates.

**3.4 Accepted G2: same behaviour.** 10.5–13.6° under bilateral pushes (R10 11.3 / 11.8°; R20 11.7 / 13.6°; F15 10.6°; L15 12.8 / 11.7°), with the hip counter-rotating ≈ 9°.

**3.5 Toward single-leg: a material increase in compliance.**

| support level | 0.5 N·m probe | 2 N·m probe |
|---|---|---|
| λ ≤ 0.85 | 8.7–11.5° | peaks ≤ 14.9° |
| λ ≥ 0.95 | **13.7–14.1°** | peaks **15.6–17.8° — past the 15° anatomical hard limit, into the end-stop** |

The closed chain through the other foot is gone in single support.

**3.6 Human evidence: contradicts both the magnitude and the mechanism.** Primary-literature search. [F] = number read in the full text, [A] = abstract only.
- **Range:**
  - Lundgren 2008 (bone pins, walking): talocrural transverse range over the *whole stance* 7.8 ± 2.7°, calcaneus-on-tibia 7.3 ± 2.4° [F].
  - Roach 2016 (dual fluoroscopy, walking): tibiotalar 6.9–7.4° [F].
  - Kaneda 2019 (upright CT, single-leg load): talus internal 4.3 ± 4.6° and calcaneus external 4.1 ± 2.4°, *opposite directions*, so little net shank-on-calcaneus twist [F].
  - Lundberg 1989 (stereo X-ray, full weight, voluntary leg rotation): talocrural 5.7° + subtalar 2.1° [F].
  - So **10–13° in a slow weight shift is at or above the human walking range**.
- **Stiffness:**
  - Rasmussen 1982: an *unloaded*, isolated talocrural joint carries 1.5 N·m at 7–10° [F].
  - Li 2023: foot–tibia with 150 N preload, 0.43 N·m/° at 4 N·m [F].
  - Load adds articular restraint, ≈ 30–60 % of it (Stormont 1985, Tochigi 2006, Watanabe 2012) [A].
  - The model's 0 N·m inside ±10° is **more compliant than the unloaded cadaver joint**. The zero-stiffness neutral zone is contradicted.
- **Mechanism:**
  - Humans couple axial rotation with inversion/eversion (≈ 0.2°/°, Lundberg [A]; 11° of external leg rotation with loaded inversion in cadavers, Cass & Settles 1994 [A]).
  - That coupling is resisted and spread over the talocrural, subtalar and talonavicular joints. Humans do not show a free degree of freedom drifting while the hip cancels it.
- Caveat: no in-vivo loaded axial torque–angle curve was found. The inferred human neutral zone of ≈ ±3–5° with ≈ 0.2–0.5 N·m/° is the research agent's inference, not a published value.

**3.7 Conclusion and options (no change made).** The twist is a **modelling defect of the passive-only ankle axis**, a zero-stiffness ±10° neutral zone. It is not human behaviour and not a controller fault. It predates G3 (it is in accepted G2), and single support makes it worse.

| option | what | evidence | cost |
|---|---|---|---|
| **A (recommended)** | Passive-tissue change for the passive-only ab/adduction axis: a neutral-zone stiffness ≈ 0.3–0.5 N·m/° near neutral; end range and end-stop kept | Rasmussen 1982, Li 2023 | approved-tissue change; G1 / G2 / G3 re-validation |
| B | A plus load-dependent stiffening (articular congruence) | Stormont, Tochigi, Watanabe | more complex; needs the contact force in the passive layer |
| C | small ab/adduction actuator | humans rely on ligament / articular restraint, not active control of this axis | not supported |
| D | leave as is | contradicted by the evidence; worse in single support (beyond the hard limit at 2 N·m) | risk for G4 |

## 4. Evidence behind the 95 % criterion and the short-leg 94.9 % case (D3)

**Where 95 % came from: an engineering definition, not evidence-derived, not derived from swing mechanics.**
- The brief's text was *"load_R → 0.8 → 0.9 → 0.95+ … Do not adopt these example numbers blindly as pass criteria. Measure the plant and use human/biomechanical evidence…"*. I took the example number.
- Its only defensible link is the spec's later-gate event convention: per-foot touchdown / liftoff at **5 % BW** (spec §22 G4, citing Vítečková 2020 on detection-method sensitivity), which 95 % of total vertical force equals.
- The **mechanically relevant swing requirement** in the spec is stricter and separate: **load at liftoff ≤ 2 % BW, no dragging**. 95 % stance load leaves ≈ 5 % BW on the other foot, which is *not* a liftoff state.

**Short-legs, post-fix, measured:**

| quantity | V2-short-legs | V2-REF | V2-long-legs |
|---|---|---|---|
| T9 hold min (first tick of the window, t = 5.50 / 18.50 s) | **0.9487 / 0.9483** | 0.9536 / 0.9534 | 0.9576 / 0.9574 |
| T9 end of hold | **0.9685 / 0.9685** | 0.9690 | 0.9693 |
| other foot at the minimum | 39.7 N = 5.13 % BW, 8/8 pieces | 4.64 % BW, 8/8 | 4.24 % BW, 8/8 |
| friction demand of the other foot (vs μ = 1.2) | ≤ 0.006 | ≤ 0.005 | ≤ 0.003 |
| hold time with the other foot ≤ 5 % BW | 97.6 % / 96.9 % | 100 % | 100 % |
| **full unloading (λ = 1.0): other foot** | **≤ 0.71 % BW, 100 % of the window at ≤ 1 % BW**, 8/8 pieces, friction demand ≤ 0.033, slip 0.26–0.28 mm | ≤ 0.52 % BW | ≤ 0.37 % BW |

- The 94.9 % is a **convergence-rate transient at the start of the hold window**. The steady state is identical across bodies (0.9685–0.9693).
- This corrects my run-2 report, which said short-legs' steady state was ≈ 0.6 % lower: that came from the hold mean.
- The short-legs leg **is mechanically sufficiently unloaded for a G4 swing when asked**: ≤ 0.71 % BW, below the spec's 2 % BW liftoff rule, with no drag risk.

**Recommendation (not applied):** define near-single-support through the **unloaded-foot requirement**, not a raw universal stance-load threshold:
1. **Settled hold:** opposite foot ≤ 5 % BW (the spec's event threshold), evaluated after a stated settling interval (e.g. ≥ 1 s after the ramp ends), or as a hold percentile.
2. **Pre-swing capability:** on request, the opposite foot reaches ≤ 2 % BW (the spec's liftoff rule) without contact loss, drag or relocation.

This is already body-weight-normalised, so it needs no morphology-specific thresholds: steady states agree across bodies to 0.1 %.

## 5. Measured mirror-symmetry floor (D4)

Repeated runs are bit-identical (determinism ×3), so the floor was measured three ways (`json/g3_mirror.json`).

| measure | result |
|---|---|
| **A. Self-symmetry** (mirror-symmetric scenarios) | Quiet stance and sagittal pushes: L/R slip 6.5e-5 mm, lateral COM ≤ 0.03 mm (0.81 mm after F15), pelvis roll ≤ 0.09°. G3 bilateral baseline 0.027 mm. |
| **B. Mirrored pairs, non-sliding** (both feet ≤ 1–2 mm) | G2 (43 pairs): max **0.046 mm**, p95 0.029. G3 (38): max **0.077 mm**. |
| **B. Mirrored pairs, sliding, recovered** | G2 (22): max **1.52 mm** (V1-matched FL/FR 20; V2-REF FL/FR 20: 1.46 mm), p95 0.11. G3 (18): max **1.45 mm** (T8 mid-ramp F15: 3.80 vs 2.35 mm, a pair row J did not test by slip), then 0.76 (T7 0.5 s), 0.60 (T7 0.25 s), 0.40, 0.30… |
| outcome classes | identical in 120/120 G2 pairs and 64/64 + 6/6 G3 pairs. Supervisor abort times identical. |
| **C. Last-bit sensitivity** (±1–4e-9 m/s start perturbations, 9 runs each) | Non-sliding spread 0.004–0.005 mm. **Sliding spread 0.07–0.19 mm** (T7 0.5 s 0.068; T8 R10 0.088; G2 FL20 0.194). |

- The plant carries a **deterministic L/R asymmetry that appears only when a foot slides**: up to ≈ 1.5 mm in both accepted G2 and G3. That is ~10× the last-bit sensitivity.
- A probable but unverified cause is solver ordering: sequential-impulse contact rows are solved left before right, and that order matters at the friction-cone limit.
- **The controller is mirror-exact.**
- The measured 0.76 mm is inside the accepted plant's own sliding-mirror floor.

**Recommended criterion (not applied):**
- non-sliding pairs: |Δ slip| ≤ 0.1 mm (≈ 2× the 0.046 / 0.077 mm floor);
- sliding pairs: identical outcome class and |Δ slip| ≤ 2 mm (accepted plant 1.52 mm);
- plus explicit controller-decision symmetry: identical supervisor decisions and times, |Δ load mean| ≤ 1e-3.

Under that criterion all G3 pairs pass, including T8 F15 mid-ramp at 1.45 mm.

## 6. Isolated controller-performance result (D5)

**Benchmark (`tools/g3_bench.mjs`, `json/g3_bench.json`):**
- one process, nothing else running (Apple M4, Node 22.19);
- one discarded warm-up run per scenario, then **7 trials**;
- per-tick samples over the steady part (t ≥ 1 s);
- statistic: the median across trials of each per-trial statistic;
- two scopes: controller only (G3 row-S scope) and controller + actuator computation (G2 row-2.5 scope).

| scenario | controller mean | median | p95 | p99 | controller + actuators mean | p99 |
|---|---|---|---|---|---|---|
| G2 quiet stance | 0.028 | 0.023 | 0.033 | 0.146 | 0.042 | 0.171 |
| **G3 T5** | **0.036** | 0.032 | 0.042 | 0.151 | **0.047** | 0.167 |
| G3 U:R | 0.037 | 0.032 | 0.042 | 0.156 | 0.048 | 0.168 |
| G3 T3 | 0.038 | 0.033 | 0.042 | 0.156 | 0.049 | 0.169 |
| G3 T8 hold R push R 10 | 0.043 | 0.041 | 0.053 | 0.163 | 0.054 | 0.177 |

All in ms. Trial-to-trial range of the T5 mean: 0.0354–0.0381.

- **Instrumentation:** `performance.now()` costs 27.8 ns per call. The G3 IK timer adds one call pair inside the controller (≈ 0.06 µs = 0.15 % of the controller time).
- **Answer: under this methodology G3 does not exceed the 0.15 ms budget.** The mean is 0.036–0.043 ms (controller only) or 0.047–0.054 ms (with actuators), ≈ 3–4× under. The p99 is ≈ 0.15–0.18 ms, from occasional spikes, and the budget is defined as an average.
- **The 0.152 / 0.168 / 0.173 ms gate figures** were measured inside 9 concurrent processes, ≈ 4× contention. The same controller ranges 0.098–0.275 ms across 128 runs there.
- **Ambiguity in the original definition, for your decision.** Spec §20 says *"≤ 0.15 ms per player per physics tick averaged"*. It does not specify:
  1. measurement conditions (isolated vs concurrent; hardware) — G2 and G3 both measured inside a 9-process final run;
  2. scope — G2's row 2.5 includes *actuator computation*, while my G3 row S did not.
- **Recommendation:** fix the methodology to this isolated benchmark and, for continuity, the G2 scope (controller + actuators). Under it G3 passes (0.047–0.054 ms). The budget itself is unchanged.

## 7. Redundant-mechanism results (D6)

**Method.** Two diagnostic configurations, each without one mechanism, ran the **complete G3 gate set (T0–T11, U) plus boundary cases, perturbed starts and the fore-aft test: 190 jobs each**. They are compared job by job with run 3 (`json/g3_d6_compare.json`). G2 is unaffected by construction: both options are off in G2.

The boundary cases add outward 12.5 N·s pushes and **pushes while the opposite foot is fully unloaded** (`UP`).

| | without **contactSupport** | without **holdUnloaded** |
|---|---|---|
| hashes identical | 153/190 | 130/190 |
| outcome class identical | 190/190 | **189/190: `UP:R:B:5` recovered → foot relocated** |
| supervisor decisions identical | 190/190 | 190/190 |
| non-falling runs, max change | 0 in every hold / slip / lift / tilt / tracking metric | hold min 0.028, slip 0.94 mm, lift 0.51 mm, tilt 0.92° |
| where it matters | **Every case where a foot has actually left the turf.** 36 falls change dynamics: with it the body balances on the true support **up to 0.43–0.58 s longer** (UP outward 10, T11 λ 1.2 / 1.4). In `UP:R:R:5` contact is lost for 1.7–1.8 s; the outcome is equal, the timing differs. | **Pushes while the opposite foot is unloaded:** that foot is dragged **31–67 mm** with it vs **53–230 mm** without (lift 19 vs 72 mm). |

**Recommendation: keep both.** Neither is bit-identical or behaviourally equivalent across the boundary cases.
- **holdUnloaded** has a measured function: 2–4× less displacement of the unloaded foot under disturbance.
- **contactSupport** is what the brief requires (§12: *"Do not continue treating an unloaded/non-contacting foot as part of the support polygon"*). It changes behaviour exactly when a foot leaves the turf, which becomes routine in G4. It is never exercised before a failure in the G3 gate set, so it is invisible in nominal scenes.
- This corrects my run-2 minimality note, which was based on nominal scenes only.

**New boundary finding (report-only):** with the opposite foot fully unloaded, outward / F / B pushes of only 5–10 N·s **relocate that foot 31–67 mm**. The body itself recovers in most cases. A free foot has no friction to resist leg drag. This matters for G4 swing-phase disturbance handling.

## 8. Recommended resolution of each remaining failed criterion

| row | what failed | recommendation (none applied; criteria v1 unchanged) |
|---|---|---|
| **I** | short-legs 0.9487 / 0.9483 < 0.95 at the first tick of the hold window; steady state 0.9685 like every body; full unloading ≤ 0.71 % BW | Redefine near-single-support via the **unloaded-foot requirement** (§4): settled hold, other foot ≤ 5 % BW, **plus** on-request unloading to ≤ 2 % BW without contact loss or drag. Body-weight-normalised, universal. Short-legs passes it. |
| **J** | Δ slip 0.76 / 0.60 mm > 0.5 mm in sliding fast ramps; controller decisions mirror-exact | Replace with the **measured-floor criterion** (§5): non-sliding ≤ 0.1 mm; sliding = same class and ≤ 2 mm; plus controller-decision symmetry. |
| **S** | 0.173 ms in the 9-process run (0.152 / 0.168 earlier) | **Methodology ambiguity — your decision** (§6). Under the isolated benchmark: 0.036 ms (controller), 0.047 ms (G2 scope) ≪ 0.15. |
| (O) | — | **Resolved by D1**: browser = Node 4/4 (G3) and 6/6 (G2). |

**Further open items:**
- **TD-11 ankle twist (§3):** option A recommended before G4.
- The same determinism hazard in the **G1 passive layer** (`sim/v2_passive.js:115`, `Math.hypot`): recommend fixing it with a G1 re-validation, by your decision.
- **Unloaded-foot relocation under pushes (§7):** G4 design input.

## 9. Does the physical pre-step state remain demonstrated?

**Yes.** The D1 fix changed nothing physical: G3 run 3 reproduces run 2 to the printed precision. For V2-REF, mirror-exact:
- controlled near-single-support (≥ 95.4 % for 10 s, other foot touching);
- **full unloading of the opposite foot to ≤ 1 % BW for 5.3 s without lift, drag or contact loss**;
- reversibility, and no drift over 5 cycles;
- all 5 N·s pushes and inward pushes ≤ 15 N·s recovered with physical continue / abort decisions;
- excessive requests fail physically;
- no hidden authority;
- **cross-engine determinism**.

**Every body**, short-legs included, can bring the opposite foot to ≤ 0.71 % BW on request, below the spec's 2 % BW liftoff rule.

**Caveats that bear on G4:**
- the free ±10° ankle twist (TD-11), worse in single support;
- the unloaded foot's sensitivity to pushes (31–67 mm at 5–10 N·s).

G4 is not started.

# Corrected knee (`v2k`): qualification results

**Inputs:**
- **Preregistration:** `KNEE_CORRECTION_PREREG.md` and `KNEE_PARAMETERIZATION.md` (commit 0267291, before implementation or any run).
- **Official run:** the frozen implementation, commit **097dcb7** (clean tree), run in a scratch copy so the accepted evidence is untouched.
- **Evidence:** `evidence/official/`.
- **Source:** `../sources/2026-10-04_user_instruction_knee_correction_before_e1a.md`.

**Status:**
- **Nothing adopted.** The flag stays default off.
- **E1a not run.** Nothing pushed.

## 0. Bottom line

1. **The knee mechanics validate.** Every preregistered check of the corrected knee as a mechanism passes:
   - conventions and L/R mirroring;
   - the law equal to its independent specification;
   - generalised-power and closed-cycle conservation (kinematic);
   - torque–rotation in the plant within 0.001° of the law;
   - the passive reference path followed (7.6° of screw-home emerging over 0 → 30°);
   - the end-stop at bound + 3.00°;
   - the Jolt stop never approached;
   - rate-independence (180 / 240 / 480 Hz);
   - in the E1a pelvis drop, the knee tracks θ0 within 1.4°.
2. **Strictly, the knee is NOT QUALIFIED.** Five preregistered items fail:
   - **three** are threshold flaws in my preregistration: KV2b and KV3b, whose residuals are dissipative and shared by the accepted plant, and KV4a.3, a 2.66° step against 2.5°;
   - **one** is a G1 conformance-test premise: the knee-flexion damping rig at a pose outside the new zero-torque zone, failing by exactly the designed flexion reaction;
   - **one is a genuine physical finding:** the V1-matched "upright" passive collapse now systematically settles in a splayed-leg posture with the **hip** rotation 1.5–2.3° past its hard limit (tolerance 1.5°). **It depends on the provisional deep-flexion parameters:** with two in-band settings it disappears and the G1 rate falls to 0.0–0.7 % (§5.2). Neither setting is adopted.
3. **What the correction fixes.**
   - The old k > 0 blocker (prone rest, 13 / 15) is gone.
   - G1 perturbed failure rates are 4.3 % (k = 0) and 5.3 % (k = 0.13), against the old knee's 5.0 % / 11.3 % re-measured in the same run.
   - G2 and G3 pass at k = 0.
   - In the E1a configuration, G3's earlier I2 failure disappears; only the lifecycle's row K remains.
4. **E1a is NOT ready to authorise.** The remaining decisions are yours (§6). None of them requires a change to the low-flexion knee parameters.

## 1. Process record (nothing hidden)

| item | what happened |
|---|---|
| development smoke runs | Before freezing I ran the bench, rig and controller tools on the developing code (allowed by prereg rule 2). They exposed one **tool** defect, fixed before freezing: KV1c / KV6a read the x row's full generalised torque, which also carries ~1e-8 N·m of finite-difference rounding from the knee's flexion end-range term at −5° / 155°. The criterion is about the **axial law term**, so the tool now reads that term and reports the row noise (≤ 3e-5 N·m). **No implementation or parameter change came from a development run** |
| report-only additions | The rig ledgers gained the implicit-drive dissipation (Σ dt·K·ω² dt) as a **reported** quantity after the development run showed the KV2b gap. No criterion uses it (§3) |
| yaw-decomposition closure | The cross-check linearisation point was moved from the initial pose to the window start. That did not change the closure (0.55° in scenario B), so it is a method limit (non-axial DOFs), reported as a flag |
| batch incident | My first parallel launcher failed (`xargs -I` line limit), and the replacement launched all 72 controller / yaw jobs at once (load 82) while G1 k = 0 ran. I killed them after about 2 minutes and re-ran them after the gates, 4 at a time. No gating row depends on wall-clock time, and every run is deterministic, so no result is affected; only the G1 iteration study's reported ms/tick is inflated |
| scratch-tree limits | G0 0.V1 and G1 1.V1 (the V1 freeze guard) need the git checkout. They fail in the scratch tree by construction; `tools/guard_v1.sh` in the worktree: **OK** |
| the independent Astra review | Not available as a file. The parameterization reconciles against the primary evidence directly (`KNEE_PARAMETERIZATION.md` header) |

## 2. Results by criterion (official, frozen 097dcb7)

| id | result | value |
|---|---|---|
| **KV0** flag-off identity | **PASS** | 4 G3 runs bit-identical to `hash_head.txt`; component suite **50 / 50** (incl. R8.a–f) |
| **KV1a–e, a′** conventions / mirror / spec law | **PASS** (6 / 6) | readback ≤ 1e-13°; envelope readback ≤ 2e-14°; restoring sign 0 / 600 violations; mirror \|Δτ\| 3e-8 N·m; layer = spec law within 1e-4 N·m + 0.1 %; +θ turns the toes medially on both legs |
| **KV2a** generalised power (kinematic) | **PASS** | 40 random flexion–axial paths incl. end-stop: worst \|W + ΔU\| = 0.2 % of its limit |
| **KV2b** passive work = −ΔU − viscous loss (rig) | **FAIL (strict)** | 14 / 35 runs outside 0.02 J + 2 %. Residual dissipative in 29 / 30 distinct runs (one +0.0018 J); \|residual\| ≤ implicit-drive dissipation + 0.02 J in **30 / 30**; the old knee: same structure (−0.55 J vs −0.46 J) → erratum E1 |
| **KV3a** closed loops (kinematic) | **PASS** | worst \|∮τ·dq\| = 1.7e-3 J (0.4 % of its limit). Naive "moving rest angle" variant: up to **19.1 J per loop** (the reason for approved decision 4) |
| **KV3b** closed cycles (rig) | **FAIL (strict)** | 0–30° (the E1a range): all pass. 0–120° at 0.5 Hz: closure −0.10 … −0.15 J per cycle (limit 0.05) and \|W_el\| up to 0.05 J, all **dissipative**; old knee −0.11 … −0.13 J in the same cycles. Amplitude "growth" 6.55 % is a one-time step (3.51 → 3.74°) with energy decreasing → erratum E2 |
| **KV4a.1–2** law vs in vivo; monotonic | **PASS** | max \|z\| 1.11 over 17 in vivo points; strictly increasing |
| **KV4a.3** continuity across 0–40° | **FAIL (strict)** | 2.66° between 15° and 20° at 15 N·m (limit 2.5°). This is the designed ER ramp slope (25° × 0.5 × 1.5 / 35°) → erratum E3 |
| **KV4b** plant torque–rotation | **PASS** | 42 / 42 holds within 0.001° of the bench law; flexion held within 0.07° |
| **KV5** passive vs actuator work | reported | rig: actuator covers dissipation (W_act ≈ D in every cycle); KV6c: knee-axial actuator and passive work below 0.07 J per run (§2.1) |
| **KV6a** zero-torque interval | **PASS** | exact (8e-15°), both knees, −5 … 40° |
| **KV6b** reference path, axial free (rig) | **PASS** | never beyond slack + 1°; axial change over 0 → 30° flexion **7.57°** (prereg 8.6 ± 1.5°) |
| **KV6c** E1a pelvis drop, full character | **PASS** | 12 / 12 runs (§2.1) |
| **KV7a** Jolt stop enclosure | **PASS** | ≥ 33.9° beyond bound + 3° at every reachable flexion |
| **KV7b** end-stop / emergency (rig) | **PASS** | at capacity torque exactly **3.00°** beyond the bound (all 6 cases); Jolt margin ≥ 31.5°; hold closure ≤ 0.01 J |
| **KV7c** G1 overshoot vs Jolt stop | **PASS** | largest knee-axial overshoot beyond the bound in any G1 run 22.0° (awkward; the old knee overshoots its own limit by 20.8° in the same scenario) → 22.0 × 1.5 + 1 = 34.0° ≤ 36.9° (minimum bound-to-stop distance); 0 Jolt-stop ticks |
| **KV8** 180 / 240 / 480 Hz | **PASS** | every rate-tested criterion holds; static rotation spread 0.0001° |
| **KV9a** G0 | PASS (in scope) | every row passes except 0.V1 (scratch tree; guard OK in the worktree) |
| **KV9b** G1 full, k = 0 | **FAIL (strict)** | 1.S, 6, 1.6a, 1.6b, 5c, 8, 7.HS, 1.1f, 1.E pass. **1.S′:** V1-matched upright 1.3d = 1.53° at **hip_R.rot** (§4). **5:** 33 / 34. The knee-**flexion** damping-only test at the rig's centre pose (axial 0 at 70° flexion = 14° outside the `v2k` zero-torque zone) sees −1.152 vs −0.896 N·m. The −0.256 N·m difference = 3.84 N·m axial × θ0′(70°) 0.068 = the designed flexion reaction → erratum E4. The `knee_R rot` rig against the `v2k` spec law passes |
| **KV9c** G1 perturbed ensembles (300 / cell) | **FAIL (strict)** | `v2k`: k = 0 **4.3 %**, k = 0.13 **5.3 %**, but V1-matched upright fails 10 / 15 and 15 / 15 (≥ 5 / 15 systematic). Old knee, same run: 5.0 % / **11.3 %** (V1-matched perturb 13 / 15 at k = 0.13: the old prone-rest blocker) |
| **KV9d** G2, k = 0 | **PASS** | every re-measured gating row (10 / 13; R, 2.5, D-browser not re-measured, as accepted) |
| **KV9e** G3 v3.3, k = 0 | **PASS** | 15 / 15 native rows |
| KV9 (report) G2 / G3 at k = 0.13, G3 controller defaults | report | G2: S4 5 / 6 (roll 8 N·m·s, final trunk 3.14° > 3°; accepted 2.28°). G3: 13 / 15 (D, I2: the k-related rows the k = 0.10 validation already failed, G3-R8) |
| **KV9f** E1a configuration (reference + lifecycle + k 0.13 + `v2k`) | report | G2: every re-measured row passes. G3: **14 / 15**. Only **K** fails (T11 over 1.2 / fast 0.1 stand: the lifecycle finding of FP-14). D passes (yaw Δ 0.00°); **I2 passes 8 / 8**, where FP-14 failed it on long legs |
| **KV10** yaw decomposition | *see §5* | |
| **KVS** sensitivity | report | low flexion: E1a behaviour unchanged at every band edge. **Deep flexion: the G1 finding of §4 depends on the provisional deep-flexion parameters** (§5.2) |

### 2.1 KV6c: the E1a pelvis drop on the full character

**Setup:** V2-REF, V2-165-62, V2-198-92 × policy {current, reference} × k {0, 0.13}; with the old knee as comparator. Evidence: `evidence/official/ctrl/`, `phase1_summary.json`.

| measure | `v2k` (12 runs) | old knee (12 runs) |
|---|---|---|
| outcome | stood × 12 | stood × 12 |
| stance-foot slip | 0.246–0.257 mm | identical |
| knee flexion range (the E1a envelope, measured) | 3.6–29.7° | 3.6–29.5° |
| reference policy: max \|θ − θ0(φ)\| | **1.39–1.40°** (the initial pose, axial 0 at 3.6–3.8° flexion); **0.08–0.11° from 1 s on** | — |
| current policy: knee axial | holds its initial twist, so it deviates up to 6.2–6.6° from θ0 at 27–30° flexion; still ≥ 11.5° inside the calibrated bound | — |
| knee-axial work (actuator / passive) per run | reference: ≤ 0.016 J / ≤ 0.003 J; current: about −0.07 J / +0.07 J (actuator and tissue exchange energy as flexion changes) | — |

**Reading:**
- Under the reference policy the knee follows its passive reference path through the whole E1a knee-angle envelope with negligible actuator effort.
- Under "current" the actuator holds the twist against the moving neutral; this is the semantic difference the reference policy removes.

## 3. Errata: preregistration flaws (strict FAIL stands; your decision whether to accept)

| # | criterion | the flaw | evidence it is not a knee defect |
|---|---|---|---|
| **E1** | KV2b | The ledger "passive work = −ΔU − viscous loss" omits the implicit drive's own numerical dissipation. The drive encoding λ/dt = K·δ − (c + dt·K)·Jv dissipates dt·K·ω² beyond the viscous c·ω² | Residual ≤ 0 in 29 / 30 runs (one +0.0018 J), bounded by the implicit dissipation in 30 / 30; the accepted old knee shows the same (−0.55 J, implicit 0.56 J) |
| **E2** | KV3b | 0.05 J per cycle and 1 % thresholds were set without measuring the plant's numerical dissipation in fast 120° flexion cycles (Jolt constraint stabilisation + implicit drive) | All residuals dissipative; the old knee −0.11 … −0.13 J in the same cycles; the E1a range (0–30°) passes every component; the amplitude step is one-time with energy decreasing |
| **E3** | KV4a.3 | The continuity bound (2.5° per 5°) is inconsistent with the frozen ER ramp (slope 2.68° per 5° at the 15 N·m point) | C¹-smooth by construction. A ramp of 40° (inside the provisional 15–40° band) would satisfy it (KVS: 13 / 13 bench), but choosing it now would be a post-result parameter change, so **not done** |
| **E4** | G1 row 5 | The knee-flexion damping-only rig assumes no elastic torque at the old ROM centre (axial 0). Under `v2k` that pose is 14° external of θ0(70°), so the coupled flexion reaction of approved decision 4 appears | −0.256 N·m measured vs 0.261 N·m predicted (axial 3.84 N·m × θ0′(70°) = 0.068) |

## 4. The one physical finding: V1-matched upright now collapses into a splayed-leg rest on the hip end range

*(G1 1.S′, KV9c.)*

**Rest states** (k = 0.13; `tools/_rest_probe.mjs`, scratch):

| knee | result |
|---|---|
| old | the body ends with the hips at moderate rotation (−70° / +57° anatomical, 5–22° flexion); settled excursion **2.05° at lumbar.rot** (the old knee fails this nominal run too at k = 0.13) |
| `v2k` | both hips about 104° flexed, splayed and externally rotated, resting on their end-stops (hip rotation passive torque about ±60–70 N·m), knees about 96°; settled excursion **2.09° at hip_L.rot** |

**Why:**
- With the feet planted, the moving reference path rotates the tibiae internally as the knees buckle, which turns the femurs outward.
- The passive collapse therefore takes the splayed branch in all 15 members at k = 0.13 (10 / 15 at k = 0).
- The rest then sits on the hip's combined flexion–abduction–rotation end range, about 0.03–0.75° past G1's 1.5° settled tolerance.
- The old knee's 50° slack zone absorbed that leg twist, so it never reached the hip.
- **It is not a knee-law defect** (the knee rests inside its envelope at about −20° from θ0, 6–8 N·m). It is the hip end range (approved anatomy) exposed by a physiological knee, in a passive collapse outside E1a's envelope.
- **It depends on the provisional deep-flexion parameters** (§5.2): with θ0(150°) ≈ 11° or strong deep narrowing the collapse no longer ends there (0 / 15). It is therefore a property of the uncertain deep-flexion region that every passive collapse passes through, not of the qualified low-flexion envelope.

## 5. Whole-leg yaw decomposition (KV10) and sensitivity (KVS)

**Scope:** 48 runs: scenarios A (bilateral, sustained 2 N·m pelvis torque) and B (single support on the lift harness, 0.5 N·m·s yaw impulse) × 3 bodies × {current, reference} × k {0, 0.13} × knee {old, `v2k`}. Mean |contribution| at peak pelvis yaw:

| scenario | knee | pelvis yaw | ground | ankle (foot axial) | knee | hip | upper body | max knee share |
|---|---|---|---|---|---|---|---|---|
| A | old | 8.83° | 0.00° | 10.54° | 0.48° | 3.11° (opposite sign) | 0.60° | 30 % |
| A | `v2k` | 8.83° | 0.00° | 10.55° | 0.30° | 2.89° | 0.59° | 26 % |
| B | old | 8.50° | 0.00° | 10.61° | 0.39° | 2.39° | 0.48° | 5 % |
| B | `v2k` | 8.92° | 0.00° | 11.82° | 0.49° | 2.96° | 0.52° | 7 % |

**Findings:**
1. **The knee does not mask another weak link.**
   - Whole-body yaw and its distribution are essentially unchanged by the knee correction.
   - Ground slip is 0.
   - No ankle or hip element leaves a range it stayed within with the old knee.
2. **The dominant yaw compliance in the model, with either knee, is the passive foot-axial joint (ankle ab/adduction).** The controller's hips counter-rotate (about 3°, opposite sign).
   - That inverts the human budget, where the hip is the largest contributor.
   - It is the existing single-support yaw-anchor question (`final_pre_e1a/SINGLE_SUPPORT_YAW.md`), not a knee effect. It stays visible here, as asked.
3. **Flags:**
   - The axial-only closure check exceeds 0.3° in scenario B (0.40–0.78°): the non-axial DOFs (hip flexion / abduction, ankle inversion) move during the drop / single support. This is a method limit; the telescoped decomposition is exact.
   - "Knee leaves its soft range" appears only under the "current" policy (by 1.3–2.5°): `v2k`'s zero-torque zone is ±1°, so any held twist exceeds it by construction. There are no such flags under the reference policy.
4. **A G2 observation in the same spirit:** an 8 N·m·s thorax yaw impulse now produces 3.6–4.3 mm of foot slip (accepted: 0.41 mm), still within G2's 10 mm. With a physiologically stiff knee, more of a large yaw impulse reaches the boot–turf contact instead of the knee's former slack.

### 5.2 KVS: sensitivity (report only)

**Low flexion:**
- All eight band edges leave KV6c unchanged (knee within 1.31–1.40° of θ0, stood).
- The literature fit degrades at the edges (max |z| 1.16–2.13; ramp 15° worst).
- Ramp 40° passes all 13 bench checks (see E3).

**Deep flexion (provisional parameters)** (G1 perturbed ensembles, V2-REF + V1-matched × 10 scenarios × 15, k = 0.13, plane turf; `evidence/official/sens/`):

| setting (everything else central) | θ0(150°) / width at 150° | failure rate | systematic scenarios (≥ 5 / 15) |
|---|---|---|---|
| **central** (δ150 0, w150 1.0) | 14.75° / ×1.0 | 5.3 % | V1-matched upright 15 / 15 |
| δ150 −4 | 10.75° / ×1.0 | **0.0 %** | none |
| δ150 +5 | 19.75° / ×1.0 | 8.0 % | V1-matched upright 15 / 15; V2-REF leanR 5 / 15 |
| δ150 +10 | 24.75° / ×1.0 | 6.3 % | V2-REF leanL 8 / 15, perturb 8 / 15 (incl. 1.3b emergency-stop ticks) |
| w150 0.6 | 14.75° / ×0.6 | 5.7 % | V1-matched upright 13 / 15 |
| w150 0.3 | 14.75° / ×0.3 | **0.7 %** | none |

- **The §4 finding is not a robust property of the low-flexion correction.** It changes sign and location with the deep-flexion parameters, which the evidence does not pin down. All six settings lie inside the evidence bands: θ0(145–150°) 11–30°; width 0.3–1.0×.
- **Two settings inside the bands** (θ0(150°) ≈ 11°, the cadaver passive-path value of Li 2004; or strong deep-flexion narrowing, ×0.3, the "highly constrained at 150°" end of the evidence) give G1 perturbed rates of 0.0–0.7 % with no systematic scenario.
- **I have not adopted either.** Choosing a deep-flexion parameter because it makes G1 pass is exactly what your instruction forbids. Deep flexion stays provisional and outside the certified envelope.

## 6. Is E1a ready to authorise?

**No.** What remains, all yours:

1. **Knee qualification errata E1–E4** (§3): accept them, or ask for criteria fixes and a re-run.
2. **The V1-matched upright splayed-leg rest** (§4). It hinges on the provisional deep-flexion parameters (§5.2). Options:
   - (a) accept it under the perturbed-rate reading of G1 (FP-14 item 2): overall rate 4.3 / 5.3 %, at or below the accepted 5.0 %, with one systematic passive-collapse scenario that passes through uncertified deep flexion;
   - (b) decide the deep-flexion parameters **on evidence**, then re-run G1. Two directions are supported: θ0(150°) toward the unloaded cadaver passive path (Li 2004 11.1°, Most 7–20°), or deep narrowing ("highly constrained" at 150°: Li 2004, Kono 2018, van Kampen). Markolf 1976 argues against narrowing. This must be **your** evidence decision, because I cannot make it now without selecting on the test result;
   - (c) a separate, approved review of the hip's combined flexion–abduction–rotation end range, the element the splayed rest loads;
   - (d) keep the old knee. That re-blocks k = 0.13 (prone rest), and with it the reference semantics.
3. **Ankle law k = 0.13.** With `v2k` the prone-rest blocker is gone and the perturbed rate halves (11.3 → 5.3 %). G3 D / I2 still fail with the default controller at k = 0.13 but pass in the E1a configuration.
4. **Reference twist semantics and the lifecycle for E1.** The only G3 row failing in the E1a configuration is K (the lifecycle's "over 1.2 stands").
5. **Then** freeze `E1_PREREGISTRATION_V2.md` with the decided configuration and authorise E1a.

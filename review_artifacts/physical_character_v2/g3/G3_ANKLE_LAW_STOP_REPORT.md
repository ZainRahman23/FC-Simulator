# V2-G3 resolution pass 2: ankle neutral-zone law — **STOPPED for a decision** (material regression in G1)

**Source:** `../sources/2026-10-03_user_decision_g3_resolution_accepted_ankle_criteria_v2.md`.

**Status:**
- **D1 for G1 is done and validated.**
- **The evidence-based ankle law (D2) was preregistered, implemented and validated. It causes a material regression in G1 at every stiffness tested, so per your instruction it is not adopted.** The default is restored to the accepted historical ankle (k = 0); the law stays implemented and selectable.
- Criteria v2 (D3–D5) are preregistered (`G3_CRITERIA_v2.md`, commit `a028bed`). The **final validation was halted**, because its precondition (a valid corrected plant) failed.
- D6 authority audit and hold demand: done. D7 handoff: recorded.
- **G3 is not passed. G4 is not started. Nothing pushed.**

**Commits:**
- `3d9ebb7`: D1 for G1, evidence verification, preregistered selection.
- `a028bed`: the law, criteria v2 and benchmark method, preregistered before any run with the law.
- The result commit: see `git log`.

**Evidence:** `../ankle_law_k010_validation/`, `../ankle_law_sensitivity/`, `../DECISIONS.md` G3-R1b, G3-R7, G3-R8.

## 1. D1 for G1: passive-layer deterministic norm — DONE

`sim/v2_passive.js:115`: `Math.hypot(φ)` → `dnorm(φ)`. This is the same forbidden-math issue with the same intended mechanics: the rest of the passive layer already used deterministic math.

| check | result |
|---|---|
| G0 | pass |
| G1 | **PASS**; qualitative outcomes 74/74 identical; per-run check changes 0 |
| G1 browser = Node | 10/10 |
| Heel-rise regression | impact and free-rise pitch identical in all 13 variants; heel peak ≤ 1.2 mm |
| G2 | outcomes 620/620 identical |

The accepted G1 is preserved in `g1/accepted_baseline_zeroNeutralAnkle/`.

## 2. Selected ankle passive law and primary evidence (verified before selection)

**Our coordinate:** the passive-only `fabd`, i.e. rotation of the rigid foot about the foot vertical ≈ the tibial long axis. That is the ISB foot **internal/external rotation (= ab/adduction) of the whole talocrural + subtalar complex**.

[FT] = full text read, [AB] = abstract only.

| class | sources | used? |
|---|---|---|
| internal/external rotation, whole complex, calcaneus vs tibia, subtalar free | **Hattori 2022** [FT]: cadaver, 5 N, 1.7 N·m → 11.8–13.7° = 0.12–0.14 N·m/° · **Watanabe 2012 Int Orthop** [FT]: in vivo, unloaded, 1.7 N·m → 11.7–15.4° = 0.11–0.15 N·m/° | **yes**: direct match |
| internal/external rotation, talocrural only | Rasmussen 1982 [FT]: 0.15–0.21 unloaded · **Li 2023** [FT]: 0.43 ± 0.09 at 150 N **with the subtalar screwed fixed**, external rotation only | no: series sub-joint, stiffer |
| inversion / eversion | Villamar 2022 [FT]: ≈ 3× stiffer 0 → 50 % BW | no: different axis |
| load effect on internal/external rotation | Stormont 1985, Tochigi 2006, Watanabe 2012 Clin Biomech [AB] | direction only, no magnitude |

- **0.3–0.5 N·m/° did not remain supported** for our coordinate: it is 2–4× the whole-complex value.
- The preregistered selection was **k = 0.10 N·m/°**, the near-neutral slope; the complex is most flexible near neutral (Chen 1988).
- **Law form:**
  - linear inside the approved ±10° soft range, saturating at 1.0 N·m beyond it;
  - the approved end-range law and end-stop unchanged on top;
  - conservative, convex, restoring;
  - internal = external rotation; L = R.
- **Implementation:**
  - added to the passive layer's potential, so torque, implicit stiffness and energy all derive from it;
  - G0 row **0.9n** passes (form, saturation, L = R, value);
  - the G1 passive-joint rig (implementation = spec law) passes at every k.

## 3. What went wrong: material regression in G1

### 3.1 At the selected k = 0.10

| gate | result |
|---|---|
| G0 | pass, incl. 0.9n |
| **G1** | **FAIL, 2 rows** |
| G1 row 1.S′ (V1-matched) | two passive falls settle 1.68° (shoulder abduction) and 1.78° (knee rotation) past the ROM, vs the 1.5° limit (k = 0: 0.00°) |
| **G1 row 8** (timestep ensemble) | the 720 Hz leanF member +1e-5 has a **one-step energy explosion: +450 J, 107 mm separation at the right ankle, 47° inversion overshoot, engine stop** |
| G1, other changes | **passive-fall postures changed in 7/74 validation runs at 240 Hz** (e.g. V2-REF upright: supine → on right side). In the 720 Hz leanF ensemble, k = 0 lands 13/14 supine with no event, k = 0.10 lands 9/14 prone and 4/14 on the right side, plus 1 blow-up. |
| Heel rise (validated V0) | essentially unchanged: peak 237.6 → 237.0 mm, pitch 69.98 → 69.97° |
| G2 (620) | **outcomes 620/620 identical**; push boundaries and their symmetry unchanged; recovered slip changes ≤ 3.2 mm |

**G3 under criteria v2, support-state rows:**
- E2 near-single-support: **PASS**, unloaded foot ≤ 4.07 % BW settled.
- F2 swing-ready: **PASS**, ≤ 0.85 % BW.
- **I2 FAIL:** in full unloading, the unloaded foot of V2-198-92 slides 5.4 / 7.1 mm, and V1-matched 2.01 mm.
- **D FAIL:** pelvis yaw at the end of each T4 cycle wanders (+6.4 … −6.5°, Δ 12.85°).

### 3.2 Diagnosed mechanisms

**Mechanism 1 — the G1 blow-up is an engine-level event.** *(Explained by Investigation B, `../engine_blowup_B/B_REPORT.md`: a reversed boot–turf contact manifold from Jolt's GJK → EPA on the 100 m turf box, then a contact position-solver teleport. Not an ankle or engine-joint defect, and also present at k = 0. Original text kept below.)*
- In both cases, the 720 Hz leanF member at k = 0.10 and V1-matched singleLeg at **240 Hz** at k = 0.15, the body is resting or landing with shank **and** foot on the turf.
- The passive drive before the event is negligible: ≤ 0.2 N·m, neutral stiffness 6–9 N·m/rad. The singleLeg body had been completely still for ≥ 40 ms.
- Then **within one Jolt step** the ankle jumps to 57–85° inversion, with +182 / +450 J and ≈ 105 mm separation.
- The passive torque does not drive it. The engine's constraint/contact solve diverges in a configuration (combined large plantarflexion + inversion with a shank–foot–turf loop) that the historical zero-stiffness ankle never settles into.
- Isolating it inside the engine step (e.g. the ankle constraint's swing-limit formulation under combined swing) is an engine / architecture question.

**Mechanism 2 — G3 drag and yaw wander come from coupling.**
- The spring now couples the leg's axial twist into the lightly loaded foot. The unloaded foot of V2-198-92 rotates 5.9° in world yaw (0.0° at k = 0); that rotation is the 5–7 mm "drag".
- The pelvis is no longer re-centred between cycles. The ankle reaction travels up the leg, and the hip posture targets follow the current twist.
- At k = 0.10 the spring is below the level at which the leg re-centres: 5.9 s after a 0.5 N·m torque step it still sits ≈ 7° off neutral.

## 4. Sensitivity across the tested stiffness range (report-only; selection was fixed at 0.10 beforehand)

| k (N·m/°) | evidence status | G1 | G1 events | G3 E2 / F2 / I2 / D | T5 ankle twist / pelvis yaw | worst unloaded-foot drag | probe re-centring (offset 5.9 s after release) |
|---|---|---|---|---|---|---|---|
| **0** (historical) | — | **PASS** | none | (run 3 under v1) | 11.1° / 2.1° | 0.3 mm | does not re-centre (free play) |
| 0.05 | evidence range | FAIL (1.S′) | settled-pose 2.8°, penetration 5.4 mm | ✗ / ✗ / ✗ / ✗ | 12.4° / 7.5° | 6.8 mm | ±5–7° |
| **0.10** | **preregistered** | FAIL (1.S′, 8) | **720 Hz +450 J** | ✓ / ✓ / ✗ / ✗ | 10.9° / 6.5° | 7.1 mm | ≈ 7° |
| 0.15 | evidence range (top) | FAIL (1.S′) | **singleLeg 240 Hz +182 J** | ✓ / ✓ / ✓ / ✓ | **1.3° / 0.2°** | 0.7 mm | ≈ 1° |
| 0.3 | unsupported | FAIL (1.S, 1.S′, 6) | engine stops (shoulders) in leanL / R; awkward +1.9 J | ✓ / ✓ / ✓ / ✓ | 1.0° / 0.1° | 0.3 mm | 0.0° |
| 0.5 | unsupported | FAIL (1.S′, 8) | **leanF +142–161 J at 180 Hz; +18,246 / +45,983 J at 720 Hz** | ✓ / ✓ / ✓ / ✓ | 0.9° / 0.1° | 0.3 mm | 0.0° |

**Twist before → after (max over L/R):**

| run | k = 0 | 0.10 | 0.15 | 0.3 |
|---|---|---|---|---|
| G2 push R10 | 11.8° | 10.8° | 5.6° | 3.5° |
| G2 push R20 | 13.6° | 12.4° | 11.5° | 7.6° |
| G2 push F15 | 10.6° | 0.1° | 0.2° | 0.3° |
| G3 T1 | 10.7° | 2.9° | 0.9° | 0.7° |
| G3 T5 | 11.1° | 10.9° | 1.3° | 1.0° |
| G3 U:R | 11.1° | 4.5° | 1.4° | 1.1° |
| G3 T8 push R10 | 13.1° | 12.1° | 4.9° | 3.7° |

**Single-support ankle behaviour (torque-step probe at λ 0.95 / 1.0, 0.5 N·m):**

| k | deflection | re-centring |
|---|---|---|
| 0 | 13.7–14.1° | none |
| 0.10 | 3.6–4.3° | incomplete |
| 0.15 | 2.5–5.1° | re-centres |
| 0.3 | 1.1–1.6° | re-centres fully |

**Reading of the sensitivity:**
- The **twist problem is solved only from k ≈ 0.15 upward**. The leg-twist mode needs a minimum stiffness to be restored against the posture control.
- **Every nonzero k breaks G1**, and the engine blow-ups grow with k.
- The evidence-preregistered 0.10 sits in the worst place: it couples the light foot but does not restore the leg.
- I did **not** switch to 0.15. That would be choosing by G3 score, and 0.15 also fails G1 with a 240 Hz blow-up.

## 5. Energy / passivity verification

- **The law itself:** conservative and convex (0.9n). The passive layer derives torque, implicit stiffness and potential from one function. Before every blow-up its torque was ≤ 0.2 N·m.
- **In G3** (k = 0.10): ledger residual ≤ −0.29 J in every gate run, i.e. no injection under control.
- **The injections are in the engine step** (G1 rows 1.2a / 1.3a: +182 to +45,983 J), in passive falls only.

## 6. D6: safety mechanisms — kept; authority and demand

- **Hold the unloaded foot still:** joint-space commands only (leg IK to the stored pose plus ankle PD at distal-subtree gains). They go through the G2 finite actuators clamped to §14 capacity.
  - No world-space position or velocity write: the authority ledger is 0 in every run, and the controller has no access to `setPose` / `setVel`.
  - No constraint is created.
  - The held foot still moves under disturbances (D7), which is direct evidence it is not pinned.
  - **Demand while held** (U:R / U:L, 5.6 s): peak 3.4 % of capacity (hip abduction 6.3 N·m carrying the free leg), ankle DF 0.8 N·m, everything else ≤ 1.1 %.
- **Support only from touching feet:** a logical support-state rule derived from the probes' touching-piece counts. It only selects which feet enter the support polygon and load split, and generates no force.

## 7. D7: G4 handoff finding (preserved)

With the unloaded-foot hold removed, 5–10 N·s disturbances relocate a fully unloaded foot by ≈ 31–67 mm (53–230 mm without the hold; G3-R6). Do not solve this by pinning: in G4, deliberate finite-actuator swing-leg control must own the free foot's trajectory.

## 8. What was not completed (halted, by your instruction to stop on regression)

These were not run on the corrected plant, because no valid corrected plant exists:
- the final G3 validation under criteria v2 with row J2 (mirror pairs) and row S2 (isolated benchmark);
- the final browser checks;
- the final regression report.

The last isolated benchmark, on the post-D1 plant, gave controller 0.036 ms and controller + actuators 0.047 ms (≪ 0.15).

## 9. Decision options

- **A — Keep the historical zero-neutral ankle for now; accept TD-11 into G4 as a known limitation.**
  - G0 / G1 / G2 remain valid.
  - G3 can be evaluated under criteria v2 on this plant (not yet done; ≈ 15 min).
  - The twist stays: ±10–13° leg twist, worse in single support.
  - **Contrary to your stated aim** of resolving it before G4.
- **B — Investigate the engine-level blow-up first (recommended before any ankle law).**
  - A focused investigation of the one-step divergence in the shank–foot–turf loop at combined plantarflexion + inversion: Jolt SixDOF swing-limit formulation (pyramid vs cone), limit softness, position iterations, contact/constraint ordering.
  - If it is a latent engine fragility exposed by the new rest poses, it is a G1-level defect: a resting body must never gain 182 J.
  - Then re-test the law.
  - Touches the G1 physics configuration / engine use → your decision.
- **C — Revisit the stiffness value or law form with better evidence.**
  - The loaded internal/external-rotation magnitude (e.g. Watanabe 2009, 5 N vs 700 N, full text not accessed) could justify a load-dependent law: soft when unloaded (no light-foot drag), ≈ 0.15–0.3 under stance load (restores the leg).
  - This addresses mechanism 2 but **not** mechanism 1 (blow-ups appear at every k ≥ 0.10).
  - Needs an evidence source and your approval.
- **D — Address the posture-control side of the twist.**
  - The leg-twist mode is neutral partly because the leg-IK hip targets follow the current twist (G2 form; the alternative was rejected in G3-A7 on the old plant).
  - A controller change, within my remit only by your instruction, and only after the plant question is settled.

**My recommendation: B, then C.** The G1 blow-up is the serious issue: physics integrity in passive falls. It must be understood before any ankle passive law can be validated, whatever its stiffness. C then gives an evidence-backed, load-aware law that restores the stance leg without coupling the free foot.

## 10. Updated technical debt

- **TD-11** (ankle axial free play) remains open; this report is its investigation.
- **TD-12 (new):** one-step engine divergence at the ankle in shank–foot–turf contact loops at combined large plantarflexion + inversion, observed only with axial ankle stiffness: +182 J at 240 Hz, up to +45,983 J at 720 Hz.
  - **[Superseded by Investigation B, `../engine_blowup_B/B_REPORT.md`; the original wording is kept above.]** The cause is a Jolt narrow-phase reversed turf manifold on the 100 m turf box, followed by a contact position-solver teleport. It is independent of the ankle law and present in the accepted k = 0 plant.
- **TD-13 (new):** at low axial stiffness the posture control's twist-following leaves the leg-twist mode un-restored (probe offsets at k ≤ 0.10).
- **Carried over:** TD-1 … TD-10. D7 is a G4 input.

## 11. Answer to the G4 question

**Not answered "yes".**
- The conditions you set (a corrected plant with G0 / G1 / G2 valid **and** G3 passing the revised criteria) are **not met**.
- The physical pre-step state is demonstrated on the historical plant, but its ankle twist is the defect you wanted resolved, and the evidence-based correction breaks G1.

**Review page (historical plant, unchanged):** `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g3.html`. The law can be viewed only in Node diagnostics (`V2_ANKLE_NEUTRAL_K`).

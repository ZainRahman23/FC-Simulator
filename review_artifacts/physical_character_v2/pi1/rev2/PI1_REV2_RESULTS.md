# PI-1 Revision 2: results. HARD STOP — NEAR MISS 0, RECOVERABLE 1, PLANTED-LEG FALL 0. PI-1 not run

**Authority:** `../../sources/2026-10-09_user_decision_pi1_revision2.md`.

**Preregistration:** `PI1_REV2_PREREG.md`, frozen at f8cd44a before any REV2 code. Two amendments were committed before the full scan:
- **A1** (f2016c6): the criteria compare the decisive gameplay contact.
- **A2** (cf1d412): a physical contact is detected from the stand-in's contact impulse.

One post-scan erratum, **E1**, corrects a CG-6 measurement error (§5.2). It does not change any class count.

**Unchanged:** V2, F0, F1 (unadopted), the Jolt configuration, V1.3 (5042230) and its records, outcomes, the 30 mm / 10 mm limits, every frozen threshold and simulation neutrality. The knee jitter and toe-pivot animation were not touched.

**Stop rule:** REV2 §10 and the user's instruction: "If Revision 2 still produces zero representatives in any class, stop and identify the smallest remaining blocker. Do not introduce Revision 3 automatically."

## 1. Result per class

| class | candidates | passing | representative |
|---|---|---|---|
| NEAR MISS | 7: 5 where the predictor fires, plus sl_early and sl_late, where it never fires | **0** | — |
| RECOVERABLE / STUMBLE | 4 | **1** | rx_behind_standing |
| PLANTED-LEG FALL | 8 | **0** | — |
| other (not a PI-1 class) | 7 | — | — |

**Two classes have zero representatives, so PI-1 was not run.** No representative was frozen, and no robustness test or CPU budget run followed.

**Only three of the 26 candidates reach a valid promotion frame:** rx_behind_standing, rx_facing_front and rx_side_standing. **All three runners are standing still** (authoritative velocity 0). **No moving runner obtains a valid promotion frame.**

## 2. Per candidate

**Columns:**
- **W:** the selector window [trigger, k_end].
- **k_p / lead:** the valid promotion frame, with the lead to the predicted contact (ticks of 1/60 s).
- **HG-A in W:** the range across the window (limit 0.05 m/s).
- **Best frame:** the latest frame with the fewest failing HG rows.
- **Predicted contact:** the decisive gameplay contact (time, runner segment / tackler primitive, reaction).

| candidate | W | k_p (lead) | HG-A in W (m/s) | best frame: failing rows | predicted contact | rejection |
|---|---|---|---|---|---|---|
| **NEAR MISS** | | | | | | |
| rx_miss | 51–59 | — | 0.128 – 0.713 | 57: HG-A | none | HG-A fails at all 9 frames; 3 fail only HG-A |
| rx_sprint | 51–66 | — | 0.163 – 0.685 | 66: HG-A | none | HG-A at all 16; 5 HG-A only |
| rx_airborne | 50–60 | — | 0.051 – 0.864 | 60: HG-A | none | HG-A at all 11; 4 HG-A only |
| rx_heavy | 51–66 | — | 0.163 – 0.685 | 66: HG-A | none | as rx_sprint |
| rx_light | 51–66 | — | 0.163 – 0.685 | 66: HG-A | none | as rx_sprint |
| sl_early | — | — | — | — | none | the predictor never fires (d_pred never ≤ 0.25 m), so NM cannot hold |
| sl_late | — | — | — | — | none | as sl_early |
| **RECOVERABLE** | | | | | | |
| **rx_behind_standing** | 40–50 | **50 (0.5)** | 0 | — | 51.5 shin_R / LEG, planted, STUMBLE | **PASS** (§3) |
| rx_free_leg | 41–49 | — | 0.041 – 0.732 | 43–45: P-17 (57 – 63 % vs 10 %) | 59.75 toe_R / LEG, STUMBLE (first: 50.25 foot_L, CORRECTION) | P-17 where HG-A holds; elsewhere HG-A, P-5, P-14, P-15, HG-T |
| rx_standing | 40–50 | — | 0.002 – 0.318 | 44–47: P-5 (11.3 – 11.5°) | 51.5 shin_R / LEG, planted, STUMBLE | P-5 at every frame (11.3 – 12.6° > 5°): one-legged stance foot |
| rx_rear_diag | 38–43 | — | 0.064 – 0.765 | 43: HG-A | 45.0 toe_L / LEG, CORRECTION | HG-A at all 6 |
| **PLANTED-LEG FALL** | | | | | | |
| rx_planted_leg | 39–47 | — | 0.186 – 0.983 | 45: HG-A | 48.75 shin_L / LEG, FALL | HG-A at all 9; 3 HG-A only |
| rx_jog | 39–47 | — | 0.186 – 0.983 | 45: HG-A | 48.75 shin_L / LEG, FALL | identical to rx_planted_leg before contact |
| rx_glancing | 55–64 | — | 0.151 – 0.865 | 64: HG-A | 65.75 shin_L / LEG, FALL | HG-A at all 10; 3 HG-A only |
| rx_lateral | 41–48 | — | 0.054 – 1.212 | 48: HG-A | 57.25 foot_L / THIGH, FALL (first: 50.0 foot_L / LEG, STUMBLE) | HG-A at all 8 |
| rx_front_diag | 49–55 | — | 0.042 – 0.956 | 55: HG-A | 61.0 foot_L / TUCK, FALL (first: 56.5 toe_L / TUCKSHIN) | HG-A or P-9 / P-15 / P-17 at every frame |
| **rx_facing_front** | 39–51 | **51 (0.25)** | 0 | — | 52.25 shin_L / LEG, FALL | **CG-1**: the physical body is first struck on the boot (§5.1) |
| **rx_side_standing** | 41–59 | **59 (0.5)** | 0 | — | 60.5 shin_R / THIGH, FALL | **the retained 10 mm criterion: 10.8 mm** (§5.2); CG-6 as run was a measurement error |
| sl_from_behind | 75–85 | — | 0.029 – 1.071 | 81: HG-T | 86.25 foot_R / LEG, FALL | HG-T at every frame: the slide leg is still extending at contact |
| **other** | | | | | | |
| rx_square | 50–60 | — | 0.041 – 0.865 | 54: P-17 | 66.0 foot_R / TUCK, FALL (not planted) | — |
| rx_rear | 30–51 | — | 0.024 – 0.777 | 45: P-17 | 52.75 foot_R, NEGLIGIBLE | — |
| rx_early_stance | 45–56 | — | 0.086 – 0.893 | 53: HG-A | 62.5 toe_R, FALL (not planted) | — |
| rx_late_stance | 48–54 | — | 0.218 – 0.478 | 49: HG-A | 60.5 toe_R, FALL (not planted) | — |
| sl_win | 64–71 | — | 0.041 – 0.493 | 67: P-17 | 72.75 foot_R, FALL (not planted) | — |
| sl_left | 64–73 | — | 0.041 – 0.712 | 70: HG-A | 74.5 foot_L, NEGLIGIBLE | — |
| sl_loose | 135–144 | — | 0.053 – 0.717 | 135: HG-A | 145.25 pelvis / TRUNK, FALL | — |

**Totals:** 271 window frames. HG-A holds on 59 of them:
- 35 belong to the three standing runners that obtained a promotion frame;
- 6 more to the standing rx_standing.

**48 frames fail only HG-A.** Per-frame values: `diagnostics/hga_values_per_frame_{rx,def}.json`. These match the scan's per-frame failure lists exactly (0 mismatches).

## 3. The three valid promotions (handoff, stand-in, contact)

All three handoffs are clean:
- P-1 0 mm; P-4 ankle ≤ 0.0011 mm; P-5 0°;
- P-9 −3.9 / −3.9 mm (rx_side_standing −1.5 / −1.5 mm), both feet supported, ankle mode, no pitch;
- P-13 ≥ 92.9 mm;
- P-14 – P-17 0; HG-A 0 (velocity shift 0);
- HG-D true; 28 state writes.

**Stand-in AST-1:**
- TORSO = TUCK + TUCKSHIN + BODY + TRUNK, 59.55 kg.
- LEG = LEG + THIGH, 18.45 kg.
- AST-C1 tracking before contact ≤ 0.05 mm (limit 10 mm).

**Predicted (gameplay) vs realized (physical) contact:**

| | rx_behind_standing | rx_facing_front | rx_side_standing |
|---|---|---|---|
| k_p, lead | 50, 0.5 ticks (8.3 ms) | 51, 0.25 ticks (4.2 ms) | 59, 0.5 ticks (8.3 ms) |
| gameplay: time, segment / primitive | 51.5, shin_R / LEG | 52.25, shin_L / LEG | 60.5, shin_R / THIGH |
| physical: time, body / stand-in segment | 51.5, shank_R / LEG | 52.25, **foot_L** / LEG | 60.25, shank_R / LEG |
| first-contact impulse / total | 7.47 / 19.94 N·s | 3.34 / 21.00 N·s | 17.00 / 31.56 N·s |
| CG-1 segment | pass | **fail**: foot_L, 93 mm from the ankle (limit 30) | pass |
| CG-3 Δt | 0 | 0 | −0.25 tick |
| CG-4 distance, s_sim / s_phys | 0.037 m, 0.911 / 0.892 | 0.085 m, 0.876 / 1.044 | 0.065 m, 0.856 / 0.883 |
| CG-5 overlap ratio | 0.744 | 0.744 | 1.419 |
| CG-6 normal angle | 5.5° | 23.7° | 14.9° |
| CG-6 relative velocity, as run (post-impulse) | 18.1° | 3.9° | **74.3° (fail)** |
| CG-6 relative velocity, approach (E1) | 0.8° | 0.0° | 0.0° |
| CG-2 support | pass | pass | pass |
| CG-8 self-separation | 85.9 mm | 92.3 mm | 81.5 mm |
| 10 mm tackler metric | 4.4 mm | 4.4 mm | **10.8 mm (fail)** |
| authoritative FALL / B released | — | 53 / 52 | 61 / 60 |
| CPU per case (full scan incl. mapping) | 164 ms | 204 ms | 172 ms |

**rx_behind_standing works end to end at the handoff and contact level.**
- The physical runner is promoted from the visible pose with zero discontinuity.
- The articulated stand-in follows the authoritative slide.
- The physical stand-in leg strikes the same segment as the gameplay contact, at the same sub-step, within 37 mm and the same region along the shin.

## 4. Why no moving runner can be promoted: HG-A

**HG-A** requires the mapped body's whole-body horizontal COM velocity at k_p to match the authoritative root velocity within 0.05 m/s. A single uniform shift can then remove the residual invisibly.

In running, the presentation's whole-body momentum is not coherent with the authoritative motion:

| record, rows | authoritative root | mapped pelvis | whole-body COM, 2nd-order (HG-A's derivative) | COM, 1st-order | HG-A |
|---|---|---|---|---|---|
| rx_planted_leg 30–47 | 3.00 m/s, constant | 3.00 m/s exactly | **2.35 – 3.96 m/s**, frame to frame | 2.62 – 3.66 | 0.04 – 0.96 |
| rx_miss 45–59 | 3.00 | 3.00 | **2.24 – 3.76** | 2.43 – 3.57 | 0.04 – 0.76 |

**The source is the presentation pose itself.**
- With RF-1 foot reconciliation switched off, the range is unchanged: 2.35 – 3.92 and 2.24 – 3.74 (`diagnostics/hga_rf1_vs_plain.txt`).
- The pelvis follows the authoritative root exactly, but the mass-weighted limbs (stance-leg plant IK, swing leg, arms) add ±0.8 m/s of frame-to-frame COM velocity.
- In the two probes, HG-A holds only on quiet rows before the trigger: rx_planted_leg rows 34–35 (trigger 39), rx_miss row 45 (trigger 51).
- **Across all moving candidates' windows, no frame passes every HG row.** Where HG-A happens to hold, other rows fail (P-5, P-9, P-15, P-17 or HG-T).

**Caveat (observation, not tested).** HG-A compares against a constant-velocity point-mass root. A real runner's horizontal COM speed also oscillates within each step (braking, then propulsion). So even a momentum-coherent presentation would meet 0.05 m/s only near the frames where its COM speed crosses the root's. Whether such a frame would fall inside each lead window has not been tested.

## 5. The two standing falls

### 5.1 rx_facing_front: the F0 boot is struck before the shin (CG-1)

The stand-in leg approaches the runner's front. At the first contact step (52.25), Jolt reports 8 manifolds (`diagnostics/manifolds_rx_facing_front_52.25-53.00.txt`):
- **seven against foot_L**, the nearest at −2.1 mm (speculative);
- **one against shank_L, 15.0 mm away.**

The physical boot's toe region (93 mm from the ankle) is genuinely nearer than the shin. In gameplay, V1.3's character-derived foot capsule (24.8 mm) is inscribed inside the F0 boot, so the gameplay leg reaches shin_L first.

This is the same finding as REV1 (92 mm). It is a geometric correspondence limit between the inscribed V1.3 gameplay foot and the larger physical boot when struck from the front. Every other criterion passes; timing is identical.

### 5.2 rx_side_standing: the simulation's own slider-blocking stop exceeds the retained 10 mm metric

**Where the 10.8 mm comes from.** The retained criterion measures the simulation's tackler primitives over [k_p, contact + 2 ticks]. The maximum is at 62.25 (`diagnostics/cg6_prestep_and_discontinuity_location.json`):
- the LEG primitive's hip endpoint moves 12.5 mm per sub-step (3.0 m/s), then 1.7 mm (0.41 m/s) in the next sub-step;
- the simulation's def log at tick 62 records `SLIDER_BLOCKED_BY_FALLER` (pen 0.088 m) and `FALLER_STEERED` (dv 2.80 m/s).

So the simulation stops the slider within one sub-step when it runs into the falling runner's legs, 1.75 ticks after the decisive contact. The stand-in follows the authoritative slide (tracking 0 mm before contact), so reproducing the slide means reproducing this stop.

**This is authoritative tackler behaviour, not a stand-in artefact.** Under the user's instruction, the 10 mm criterion stays. It fails.

**CG-6 as run (74.3°) was my measurement error (E1).**
- **What the scan did.** It took the relative velocity at the contact point from the state *after* the contact step, by which time Jolt had applied the 17 N·s impulse. The relative velocity was then nearly arrested: 0.32 m/s, mostly tangential. Its direction does not describe the approach.
- **What CG-6 is.** The original criterion (PI1_COMPAT_GATE CG-6) is an "approach direction" criterion.
- **The pre-contact value.** Evaluated from the state before the contact step, it is 3.80 m/s vs the simulation's 3.71 m/s: **0.0°** (rx_behind_standing 0.8°, rx_facing_front 0.0°).
- **Effect on the result.** The class counts do not change. rx_side_standing still fails the 10 mm criterion, and the other two do not change verdict.
- **Disclosure.** The as-run values stay in `scan_rev2_rx.json`; the correction is a disclosed post-scan erratum.

### 5.3 First contact penetrates in one step

rx_side_standing's first physical contact is already 9.8 mm deep when detected: the slide leg closes 15.5 mm per 240 Hz step at 3.7 m/s. This is recorded, not gating.

## 6. Non-gating diagnostic: what lies behind HG-A

**Purpose.** To find out whether HG-A is the *only* blocker or merely the first, I reran the scan with HG-A waived in the selector only (`scripts/probe_hga_waived_diagnostic.mjs`; `diagnostics/NONGATING_hga_waived_*`).
- Waiving means the uniform velocity shift equals the HG-A error: 0.09 – 1.21 m/s. That shift is exactly the visible velocity pop HG-A forbids.
- **Nothing here is a representative**, and nothing is used as one.

| class | passes with HG-A waived | the others, with HG-A waived |
|---|---|---|
| NEAR MISS | **rx_airborne**: lead 0.5 ticks, shift 0.65 m/s, no physical contact, stand-in tracking 8.8 mm | rx_miss: AST-C1 10.39 mm at a 2.5-tick lead. rx_sprint / rx_heavy / rx_light: **a physical contact where gameplay has none** (the stand-in leg touches foot_R): the larger physical boot again |
| RECOVERABLE | rx_behind_standing (the real pass) | rx_rear_diag: CG-4 / CG-5 / CG-6 / CG-2 |
| PLANTED-LEG FALL | **rx_glancing**: lead 0.75 ticks, shift 0.51 m/s; shank_L at 65.75, Δt 0, 27 mm, CG-6 approach 29.5° | rx_planted_leg / rx_jog: CG-3 (+1.5 ticks) and CG-2, at a 2.75-tick lead: the right foot the gait should lift stays planted. rx_lateral / rx_front_diag: several rows |

**Two observations follow.**
1. **In the current records, HG-A is the only gating failure for at least one candidate in each of the two empty classes** (rx_airborne, rx_glancing).
2. **REV2's causal contract has a lead-time cost.** Once promoted, the physical body has no locomotion: posture tone holds the promoted pose, and B pulls the root. At leads beyond ≈ 1 tick, the foot support and contact timing drift from the authoritative gait (rx_planted_leg: CG-2 / CG-3), and the stand-in's tracking error grows toward 10 mm (rx_miss). The selector picks the *latest* clean frame, so short leads are preferred. But the presentation rarely offers a clean frame near contact.

## 7. The smallest remaining blocker

**HG-A: the running presentation's whole-body momentum does not cohere with the authoritative motion.**
- The pelvis tracks the root exactly.
- The limbs make the mapped COM velocity swing 2.2 – 4.0 m/s frame to frame around a constant 3.00 m/s.
- No moving runner, in any class, has a window frame that passes every HG row.
- In 48 window frames HG-A is the only failure.
- With HG-A waived, rx_airborne (NEAR MISS) and rx_glancing (PLANTED-LEG FALL) pass every downstream criterion (§6).

**Making the presentation momentum-coherent is excluded from this experiment** ("Do not smooth or repair the animation"). It was not attempted.

**Second-order blockers:** these would remain even if HG-A were met, and they decide which candidates could pass.

| # | blocker | candidates |
|---|---|---|
| 1 | **Inscribed-geometry correspondence.** The F0 boot is larger than V1.3's gameplay foot capsule. Struck from the front, the boot is hit before the shin; at a near miss with small clearance, the boot is touched where gameplay records no contact. | rx_facing_front; rx_sprint / rx_heavy / rx_light under the diagnostic |
| 2 | **The simulation's slider-blocking stop.** `SLIDER_BLOCKED_BY_FALLER` falls inside the retained 10 mm window. | rx_side_standing |
| 3 | **HG-T.** A slide leg still extending at contact cannot be represented by the two-segment stand-in. | sl_from_behind |
| 4 | **Lead-time drift** of the causal, non-locomoting physical body. | rx_planted_leg / rx_jog under the diagnostic |
| 5 | **Standing-pose rows.** P-5: a one-legged stance foot needs 11 – 13° of reconciliation pitch. P-17: angular momentum. | rx_standing, rx_free_leg |

**No Revision 3 is introduced.**

## 8. The architectural question

> Can we cleanly hand an ordinarily animated, simulation-driven footballer into physical dynamics before a meaningful interaction, let physics visibly resolve that interaction, and cleanly hand presentation back afterward without changing the simulation's decision?

**Partly demonstrated, for a standing footballer only. Not demonstrated for a moving one.**

**Demonstrated:**
- **Standing runner, handoff in.** rx_behind_standing: a clean handoff into physical dynamics before the interaction (zero pose, velocity and momentum discontinuity; deterministic), against an articulated, finite-mass stand-in that follows the authoritative slide.
- **Physics resolves the same interaction.** The same segment, the same sub-step, 37 mm apart.
- **Simulation authority is untouched.** The stand-in and physics read no outcome, and the V1.3 records are unchanged.
- **Not tested: the hand-back.** The demotion gate (DG) and the visible resolution through recovery belong to PI-1, which did not run.

**Not demonstrated:**
- **A moving footballer cannot be handed in cleanly** under the frozen tolerances, because its presentation's momentum is incoherent (§4).
- **Two of the three standing planted-leg falls fail correspondence:** boot vs shin, and the slider-blocking stop (§5).

**Earlier blockers that REV2 removed:**
- REV1's per-frame lead-in matching: the lead-in contract is now satisfied by construction;
- the rigid stand-in tackler: AST-1 follows the extension and sweep, with ≤ 0.05 mm tracking.

The remaining blocker sits upstream, in the ordinary presentation's physical consistency.

## 9. Errors and disclosures

1. **E1: the CG-6 measurement timing** (§5.2). The scan measured post-impulse velocities. The approach values are reported beside the as-run ones. No class count changes.
2. **A2** (cf1d412, before the full scan). A 2-case smoke test found that the depth-based contact test missed a 7.47 N·s speculative-contact collision. Detection now uses the momentum balance. The smoke output is kept as `scan_rev2_smoke_SUPERSEDED_defective_contact_detector.json`.
3. **Attribution under A2.** An impulse is attributed to the deepest manifold of the step. For rx_facing_front this is foot_L at −2.1 mm, against shank_L at −15.0 mm. The attribution is unambiguous here, but a step with near-equal depths would not be.
4. **The JSON label.** The scan's `prereg` string reads "f8cd44a + A1". It omits A2, which the scan script does implement (line 60). The label is not edited after the run.
5. **Selector input.** The selector's predicted contact tick T is taken from the record's first gameplay contact. In an unperturbed record this equals the first overlap of the planned geometry (REV2 §3, "offline evaluation"). It was not recomputed independently.
6. **Tooling fixed before any reported output:**
   - the controller needed `stand: SLP_STAND` (`gainSwing` was undefined);
   - a `_sense` stub was needed when probes are off;
   - the stand-in's initial velocity used a forward difference, now a backward difference;
   - CG-6's stand-in velocity uses the point velocity v + ω × r.
7. **Post-scan diagnostics are labelled as such:** §5, §6, the per-frame HG-A values and the RF-1 comparison. None changes a criterion, a threshold or a scan output.

## 10. Not run

PI-1 (§8 of the prereg), the demotion gate, the robustness tests and the CPU budget. Their precondition, at least one passing candidate in every class, was not met.

## 11. Files

**Scripts** (`scripts/`):
- `pi1_rev2_sim.mjs`, `scan_rev2.mjs` (the scan as run);
- `probe_cg6_prestep_and_discontinuity.mjs`, `probe_hga_waived_diagnostic.mjs` (non-gating), `probe_hga_values.mjs`;
- `hga_presentation_momentum_probe.mjs`, `hga_rf1_vs_plain_probe.mjs`.

**Scan outputs:** `scan_rev2_rx.json`, `scan_rev2_def.json`, `scan_rev2_rx.log`, `scan_rev2_def.log`.

**Probes:** `hga_rx_planted_leg_rows30-47.txt`, `hga_rx_miss_rows45-59.txt`.

**Diagnostics** (`diagnostics/`): per-frame HG-A values, E1 values and the discontinuity location, the manifold listings, the non-gating HG-A-waived outputs, and the RF-1 comparison.

**Records** (not committed; regenerable): `air_v13/`, `air_v13_def/` by `../trackB/scripts/air_export_v13*.cjs` at V1.3 5042230.

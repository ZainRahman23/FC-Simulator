# PPR-1 report: physiological passive / pre-reflex response

**Verdict:** B **FAILED** its preregistration: 12 of 23 hard criteria (`evidence/PPR1_EVAL.json`).
- The result is preserved; B was **not** retuned.
- Status: VISUAL_PENDING. Nothing is adopted. Nothing is pushed.

**Review:** `http://127.0.0.1:8350/ppr1/review/PPR1_REVIEW.html`

**Supporting documents:**
- `PPR1_PREREGISTRATION.md` (frozen d8849a6b);
- `PPR1_PRERUN_FREEZE.json` (e7afc26c);
- `PPR1_AUDIT_CURRENT_V2.md`;
- `PPR1_RESEARCH_AND_DESIGN.md`;
- `research/PRE_REFLEX_LITERATURE.md`.

## Answers

### 1. What was physically wrong with CURRENT V2?

**A behaves like a mannequin with an instantaneous nervous system.**

| problem | measurement |
|---|---|
| **Zero-latency torque generation** | The actuator's excitation is computed from the same step's pose-spring demand. In the collision, the struck ankle goes from 9 % to **96 %** activation within ≈ 50 ms; torque rises at **12,700–16,500 N·m/s from 0 ms**; up to **68 N·m** per axis is produced beyond what its pre-contact activation could deliver. A human cannot change muscle drive before ≈ 50–60 ms (short-latency reflex torque) or ≈ 120–160 ms (postural). |
| **About 100× human damping** | Critically styled servos: ankle 349 N·m·s/rad, D / K 0.12–0.35 s. In probes, **78–97 %** of the resistance at 50 ms is viscous, so joints creep instead of deflecting and yielding. |
| **Stiffness that never yields** | 1.5 × the supported load on every joint and axis (ankle 1.54 mgh vs intrinsic 0.64–0.94 mgh), identical in every direction. The response is linear to full capacity. |
| **A frozen whole-body pose target** | Arms, trunk and neck are held to the entry pose. |
| **A cannot stand** | From the PVP entry it falls at **1.45 s**, and recomputing statics every step does not help (diagnostic). Its joint-space pose tone is not a standing controller. |

**Not causes:**
- frozen gravity compensation inside 0–120 ms (physiological there);
- the passive tissue layer.

### 2. What B changes, and why

B uses the same actuator model (capacity, force–length, force–velocity / eccentric plateau, activation dynamics, Jolt motor). Only the law changes:
1. **No neural change before 125 ms.**
   - Excitation comes from a tonic drive: A's statics bias, plus, on the support chain only, A's tone remainder evaluated on the runner's own state **125 ms earlier**.
   - It never comes from the same-step servo request.
2. **Intrinsic muscle mechanics.**
   - Stiffness: K_i = Σ (e − 1)·a·capIso / θ_y. It is proportional to active torque, elastic for ≈ 1° (ankle calibrated to 0.78 mgh; trunk to Brown & McGill), then **yields** at V2's own eccentric plateau, with plastic re-anchoring.
   - Damping: ζ = 0.2, giving ankle 0.72 N·m·s/rad and lumbar 9.4 N·m·s/rad, as measured in humans.
3. **Collision-blind by construction.** B reads only the runner's own states and actuator readback. B-C0 is bit-identical to the runner standing alone.

**Why:** these are the literature's pre-reflex mechanics. Short-range stiffness is proportional to force and exhausted within milliseconds in a sweep, after which the muscles' eccentric plateau takes over. The change is the smallest one the existing architecture allows (§3 of the design).

### 3. Did B pass its preregistration?

**No.**

| criteria | result | cause |
|---|---|---|
| H1, H2, H3, PR3 | FAIL: activation changed in the window, up to 0.61 on one axis | **My specification error.** The excitation divides the drive by the *current-angle* capacity capIso(θ_n), so activation follows joint motion with zero latency (the same normalisation exists in V2's own actuator). **Post-hoc D1:** normalising by the entry capacity freezes activation exactly (N2 = C0 bit for bit). The window kinematics are unchanged (struck ankle 15.90° vs 15.95°, knee 19.22° vs 19.20°), so the visual comparison is representative |
| QS1–QS4, P1 | FAIL: **B cannot stand.** It falls at **0.85 s** (A: 1.45 s) | Frontal ankle and knee-rotation axes saturate from the first 30 ms: the frozen tonic activation leaves yield margins of only 0.7–1 N·m over their static loads, so the body sags 2–3° before the delayed loop acts. **D2** (no delay) falls *sooner* (0.41 s) and **D3** (no plastic slip) at 1.00 s. Latency is not the cause; joint-space tone with B's lower damping and thin margins does not stand this body (A doesn't either) |
| IMP1 | FAIL | Joint-anchor separation 1.43–1.48 mm (limit 1 mm) under the 10 kg impacts on a compliant body |
| PR1, PR2 | FAIL, partly **criterion errors** | I required a yield in both directions. Pushing into the tonic muscles' unloading direction (lumbar extension), or into the ground at the stance ankle, is elastic for physical reasons. Failures still count |

**Passed:**
- H4 (integrity and ledgers in the window);
- H5 (determinism);
- H6 (no chatter);
- H7 (physiological entry magnitudes);
- V1 (same law without a tackler, bit-identical);
- QS5 (no energy creation);
- P2 (progressive yield to pushes);
- P3 (overwhelmed by 90 N·s).

### 4. Does the first 0–120 ms look materially more human?

**My reading of the evidence: yes for the struck leg. Pelvis, trunk and arms are subtle. The judgement is yours.**

| 0–120 ms | A | B |
|---|---|---|
| struck ankle | 5.5° | **16°** |
| struck knee | 3.2° | **19°** |
| struck-leg actuator torque change | up to 69 N·m | **≤ 10 N·m** |
| struck-leg activation | rises to 0.96 | constant, except the normalisation artefact late on one knee axis |
| muscle work over the window | −21 J | **−8 J**; the runner's energy comes almost entirely from the contact (≈ 89 J) |
| pelvis / trunk / head at 120 ms | 5.2° / 0.65° / 2.0° | **2.2° / 0.6° / 0.4°** |

**In the close-up:** in B the boot carries the right foot and the knee folds; in A the foot is held stiffly.

### 5. Does the struck leg now yield plausibly?

**Yes in kind and timing; possibly on the soft side.**

The literature predicts:
- short-range stiffness exhausted within ≈ 3–10 ms;
- then a plateau of 1.2–1.8 × the pre-impact torque;
- passive trapdoor inversions reaching 30° in 80 ms (Konradsen 1997).

**What B does:**
- The ankle yields from 4 ms and the knee from 12.5 ms.
- B's plateau is V2's 1.2–1.35×, the low end of that range, and V2 has no non-yielding long-range elasticity. So the 19° knee fold may overstate the yield (see 10).
- The generic 10 kg rear-shank impactor buckles B's knee 18° (A 1.9°). The side impactor rolls B's ankle 32°, in line with the trapdoor data.

### 6. Do the pelvis, trunk and arms respond naturally through mechanical coupling?

**In direction and order, yes; in magnitude, they are small within 120 ms.**
- **Order:** onsets propagate outward from the contact: ankle 4 ms → knee 12.5 ms → hip 17–25 ms → lumbar and neck 25 ms → hip abduction 46 ms.
- **Arms:** they move only by inertia (≤ 0.4°) and are free of tackle-specific action.
- **Pelvis:** A's larger pelvis rotation (5.2°) came from its rigid legs passing the sweep's torque up the body. In B the yielding leg absorbs it (2.2°).

### 7. Is standing / no-contact behaviour sound?

**No-contact: yes.**
- B in C0 is bit-identical to B with no tackler at all (V1).
- It is deterministic, and repeats are identical.

**Standing: no.**
- **B alone falls at 0.85 s.** That is a hard failure.
- CURRENT V2 also falls (1.45 s), so neither joint-space tone is a standing controller (see 12).

### 8. Is B still capable of losing balance?

**Yes, too readily when standing still:**
- 90 N·s pushes knock it over;
- the 10 kg rear impact buckles it;
- in the PVP collision it loses balance after the window (trunk > 20° at 0.35 s; A 0.31 s).

### 9. Was V2's existing architecture sufficient?

**For the pre-reflex window: yes (Model 2).** V2's actuator, run at frozen activation, *is* an activated-muscle model:
- its implicit spring acts as short-range stiffness;
- its torque window acts as the eccentric plateau, so it yields;
- its force–velocity term acts as the braking force.

B shows that drive, stiffness, damping and yield can be made physiological in 0–120 ms without new actuators, bodies or solver features; D1 shows activation can be frozen exactly.

**Beyond the window: Model 1 elements remain.** V2 cannot hold a frozen-drive body, for two reasons:
1. V2 has **no non-yielding long-range intrinsic elasticity**: mid-range passive stiffness is zero by specification, and the eccentric reserve is fixed at 1.2–1.35×. Beyond ≈ 1° a frozen-drive joint has almost no stiffness. Measured stance values are 0.44–0.58 mgh at 1–5°.
2. **Joint-space tone, A or B, does not stand this body.** Standing needs a balance controller, and the head needs faster loops than any 125 ms joint-space loop. Toy analysis: any such loop destabilises the head.

### 10. Genuine V2 body limitations discovered

- Zero mid-range passive stiffness, so there is no tendon / passive long-range elasticity.
- Eccentric reserve of 1.2–1.35×, below the literature's 1.5–2× (in vitro; 1.2–1.8 recommended range).
- The frontal ankle: 33 N·m inversion capacity against a 4.3 N·m static frontal load in this wide stance leaves almost no yield margin at postural activation.
- Joint-anchor separation of 1.4–1.5 mm under fast motion of compliant joints.
- The PVP entry pose is not a stable equilibrium for joint-space tone. CURRENT V2 falls at 1.45 s with no disturbance.
- V2's own ActuatorLayer normalises excitation by the current-angle capacity, an additional zero-latency path in A.

### 11. CPU cost and determinism

**CPU:**
- B's law costs **0.017–0.019 ms per step**; A's tone costs 0.03 ms.
- Physics plus the passive layer take ≈ 0.6–1.2 ms per step.
- B adds less than 2 %.

**Determinism:** every run is deterministic.
- QS and N2 repeats are bit-identical;
- B-C0 is bit-identical to B-QS;
- law A through the PPR-1 plant reproduces the committed DX records bit for bit.

### 12. What remains for delayed active balance

- A **balance controller with physiological latency** (≥ 120 ms) on top of the intrinsic layer. It needs load transfer with sensed support (statics that follow the support state) and COM / XcoM feedback, as ABI-1 GBC-1 provides. Joint-space tone cannot stand this body.
- **Head and neck regulation** through faster (vestibulocollic-type) loops.
- **The short- and medium-latency reflex torque in 50–120 ms**, excluded here by design. It slightly understates human resistance late in the window.

### 13. What remains for reactive stepping

As ABI-1 found:
- a stepping executor with a fast load channel and a predictive (capture-point / time-to-boundary) trigger.

New from this work:
- A compliant struck leg folds earlier (knee 19° by 120 ms), so the swept-leg retrieval and the stepping timing must start from a yielding, not a rigid, limb.

### 14. Commits and files (local; not pushed)

**Commits:**
- `468c8971`: source instruction (verbatim);
- `d8849a6b`: **preregistration frozen** (before any B code), with the audit, literature, design and tools;
- `e7afc26c`: **pre-run freeze**, B implemented and acceptance passed;
- the results commit adding this report.

**Files:**
- Law: `ppr1/scripts/ppr1_law.mjs`.
- Tools:
  - `ppr1/scripts/ppr1_plant.mjs`, `ppr1_run.mjs`, `ppr1_battery.mjs`, `ppr1_probe.mjs`, `ppr1_metrics.mjs`, `ppr1_battery_summary.mjs`;
  - audits `ppr1_audit_law.mjs` and `ppr1_audit_pvp.mjs`;
  - `ppr1_design_table.mjs`, `ppr1_regulator_toy.py`, `ppr1_acceptance.mjs`, `ppr1_eval.mjs`, `ppr1_review_data.mjs`.
- Diagnostics:
  - `ppr1/diag/ppr1_diag_live_statics.mjs`;
  - `ppr1/diag/ppr1_diag_d1_entrycap.mjs` (D1 / D2 / D3).
- Evidence: `ppr1/evidence/*.json`. The run records are outside Git (`records.OUTSIDE_GIT.md`, SHA256SUMS).
- Review:
  - `ppr1/review/PPR1_REVIEW.html`, with 15 videos (5 views × mesh / colliders / overlay);
  - frames outside Git (`frames.OUTSIDE_GIT.md`).
- Render tools: `ppr1/render/ppr1_clip_prep.mjs`, `ppr1_capture.cjs`.

### 15. Visual A / B review

**http://127.0.0.1:8350/ppr1/review/PPR1_REVIEW.html**

**Views:**
- struck-leg close-up;
- 8× close;
- gameplay 1×;
- no contact (C0);
- away-from-tackle impactor.

**Each view in three variants:** mesh, mesh + colliders, skeleton / COM / ground contact.

**Controls:**
- 1×, 0.25×, 8× slow and 0.1× playback;
- frame stepping;
- jumps to 0, 40, 80 and 120 ms;
- a per-frame A | B readout.

## Successor proposal (not run; your decision)

B′ would change the following:
1. **Excitation normalised by the delayed-state capacity**, D1's fix. It is verified to freeze activation without changing the window.
2. **A non-yielding long-range intrinsic elasticity** in the support chain, representing tendon and passive tissue, calibrated to stance 0.44–0.58 mgh at 1–5°. This is a **V2 passive-representation change** (mid-range stiffness) and needs your approval.
3. **Eccentric reserve at the literature's middle** (≈ 1.5×). This is a V2 capacity-specification decision.
4. **Corrected criteria:**
   - probes judged in the stretched direction only;
   - impact integrity that allows for compliant joints.
5. **Standing validation** judged together with a latency-respecting balance controller (delayed active balance), because joint-space tone cannot stand either A or B.

## What surprised me

- **CURRENT V2 cannot stand at all** from the PVP entry: it falls at 1.45 s, and live statics does not help. The "posture tone" was never a standing controller.
- **Removing the latency made standing worse** (D2 falls at 0.41 s). B's standing failure is a stiffness, damping and yield-margin problem, not a delay problem.
- **My excitation formula reintroduced a zero-latency path** through the force–length normalisation. V2's own actuator has the same path, and it is part of A's super-human behaviour.
- **In B the struck leg is mostly a passive body being swept.** Its muscles absorb ≈ 8 J over 120 ms (A ≈ 21 J).
- **No 125 ms joint-space loop can hold a human head.** In every single-joint model it oscillates, which is consistent with the neck relying on much faster reflexes.

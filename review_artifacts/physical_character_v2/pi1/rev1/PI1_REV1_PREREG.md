# PI-1 compatibility revision 1 (REV1): knee retarget PM-2, rigid-foot reconciliation RF-1, tackler-criterion decision. PREREGISTRATION (frozen before PM-2 / RF-1 code or any REV1 test)

**Source:** `../../sources/2026-10-09_user_decision_pi1_compat_revision_knee_rigidfoot_tackler.md`.

**Status:** frozen at the commit that adds this file. Later changes are recorded amendments (§8).

**Unchanged:**
- V2, F0 / F1 and Jolt;
- the 30 mm / 10 mm limits;
- V1.3 (5042230) and its records;
- every PI1_COMPAT_GATE / PCG-F0 threshold (TRACKB_PREREG §3 + A2), except as replaced in §4. Each replacement is approved by the user's direction and stated with its reason.

## 1. Findings that shape REV1 (diagnostic, made before this freeze; evidence in `scripts/`)

**F-1, the source of the R-K spin** (`rk_diag` / `rk_pos` probes on rx_free_leg).
- In swing the presentation's knee is a pure hinge: out-of-hinge angle 0.00°, R-K twist 0.
- While a foot is planted, the presentation's plant-solve IK bends the knee out of its hinge plane by up to 5.5°.
- The IK **switches on / off within one frame**: −1.07° at heel-strike row 37; +4.43° → 0 at toe-off row 59.
- Near a straight knee (bend ≈ 15°), 1° out of the hinge tilts the leg plane by ≈ 4°.
- R-K turns these presentation steps into 4.2 – 4.6° thigh-twist steps, i.e. 4.4 – 4.8 rad/s.
- The presentation's knee also oscillates 15° ↔ 47° frame to frame in late stance, with knee 2nd differences up to 200 mm.

**F-2, a bound** (analysis, to be checked numerically in §5).
- A hinge-knee mapping (V2 has no varus DOF) that keeps the knee and ankle within 10 mm can absorb only ≈ 1.5° (ankle) + ≈ 2.2° (knee) of leg-plane step at a bend of ≈ 80°.
- If P-14 (≤ 0.25 m/s) also holds, the absorbable position change per frame is only ≈ 4 mm.
- So a ≈ 4.5° single-frame plane step at toe-off cannot be absorbed within P-4 + P-14 + P-15 by **any** causal mapping. Heel-strike steps at a bend of ≈ 15° can.

**F-3, the tackler** (`tackler_proxy_diag.mjs`; `tackler_diag_*.json`).
- **What the 17.9 mm is:** the step in per-sub-step displacement where the far-rule slide leg's extension stops. The extension velocity is not part of the primitive's reported velocity.
- **Comparison:** the gameplay contact vs the same contact test with PI-1 §7's rigid stand-in (shape frozen at k_p, carried with the simulation's root).
- **Where it diverges, the leg is still extending / sweeping after k_p:**
  - the first contact changes segment and timing: rx_planted_leg shin_L → foot_L at +7.5 ticks; rx_behind_standing LEG → shin_R becomes TUCK → foot_R at +12 ticks; rx_rear_diag toe_L → shin_L at +7.75 ticks;
  - or the contact disappears (sl_win, sl_from_behind, sl_left);
  - leg endpoints at contact differ by 112 – 1,050 mm.
- **Where it is exact:** where the leg has stopped by k_p (rx_square, rx_glancing, rx_late_stance, sl_loose).

## 2. Tackler criterion (item 4): RETAINED as gating; no amendment

**Origin.** The user's D1C requirement "neither body requires a pose discontinuity to reproduce the interaction" (source line 30). I operationalised it for the stand-in tackler in PI1_COMPAT_GATE CG-7: "no sub-step jump beyond their velocity·dt + 10 mm".

**The implementation.**
- The v1.2 / v1.3 gate implemented it as the maximum change in per-sub-step displacement ≤ 10 mm (a second difference), not literally.
- Disclosed, and kept unchanged for comparability.
- Literally, the leg exceeds velocity·dt by ≈ 22 mm per sub-step during the extension.

**Decision.** The quantity reflects a tackler representation that **can** materially change the struck segment, timing, overlap and contact existence (F-3). Under the user's rule it stays **gating, unchanged**.

**Diagnosis.**
- PI-1's rigid stand-in cannot represent the V1.2 far-rule slide's post-promotion extension and its sweep of up to 75°.
- The 10 mm metric is a weak proxy: the sweep is smooth and does not trip it, as rx_early_stance shows (0.9 mm, yet the stand-in's leg is off by up to 102 mm).
- A stand-in whose leg follows the simulation's own slide-leg law would be a tackler-representation design, not approved here.

## 3. PM-2: minimum inertia-weighted displacement knee retarget (replaces R-K)

**Per leg, per frame k.** Positions from the presentation:
- hip H, knee K, ankle A;
- thigh direction u = (K − H)/|·|;
- presentation shank direction w;
- R-K plane twist δ_k: the thigh twist relative to the rig thigh's twist about u that makes V2's hinge axis normal to the H–K–A plane, exactly as R-K computes it.

**The candidate family.** For a relative thigh twist x (relative to the rig thigh twist):
- the V2 hinge axis is h(x) = the R-K axis rotated about u by (x − δ_k);
- the V2 shank direction is w(x) = w projected onto the plane ⟂ h(x), normalised (the best hinge reproduction of the shank);
- the V2 ankle is K + L_s·w(x);
- the knee is exact; the thigh direction is exact.

**The choice.** x_k minimises

  C(x) = Σ_{shank, foot} m_i · |p_i(x) − p_i,pres|² + I_eff,k · (x − x_{k−1})²

where:
- p_i = the body COMs. The shank COM is carried along w(x) at its V2 COM fraction. The foot COM moves with the ankle.
- I_eff,k = the inertia, about the thigh axis, of the thigh, shank and foot at frame k. It uses the V2 spec's masses and inertias with the parallel-axis theorem, at the presentation's geometry.

**What the objective is.** A discrete minimum-action fit: mass-weighted presentation mismatch plus the kinetic energy of the mapping's own twist change. **It has no free constant.** Every weight is the body's own mass or inertia.

**Mechanics.**
- Minimisation: golden-section search on x ∈ [δ_k − 45°, δ_k + 45°], 80 iterations. Deterministic.
- Then the hard-ROM projection is applied, as before.
- Shank twist: rotates with the thigh (hinge), as in R-K.
- Foot: the rig foot rotation, before RF-1.
- **History.** Causal, evaluated from the record's first row: x_0 = δ_0, then each frame from the previous one. No future frame is read.
- The mapping is identical for every case and class, and reads no outcome.

## 4. RF-1: rigid-foot presentation / physical reconciliation (F0 physics; the rendered foot follows physics)

**The physical F0 foot.** Physics initial pose, and the pose evaluated by the gate.
- Start from the PM-2 leg and the rig foot rotation, projected onto the ankle's hard ROM.
- **Foot held in contact** (presentation contact flag, any mode): apply the minimal rotation about the foot's mediolateral axis, at the ankle joint, that puts the F0 boot's lowest point at y = 0. This is a pitch, solved by bisection within the ankle hard ROM.
- **Foot not in contact:** if its lowest point is < 0, apply the minimal pitch to y = 0; otherwise no change.
- **Recorded:** the reconciliation pitch Δθ, and any residual if the ROM does not allow y = 0.

**Physical velocities at promotion.** The 2nd-order backward difference of the same reconciled mapping at k_p, k_p − 1 and k_p − 2, propagated through the tree (PI-1 §6.2).

**The rendered foot while promoted.** Presentation only.
- The rendered rig foot rotation is slerp(stream-A foot, physical foot, w), with w = smoothstep((t − t_p) / T_b) and **T_b = 0.10 s**, the predictor horizon.
- **Rendered toe:** the stream-A local rotation. If the rendered toe tip would go below y = 0 under the blended foot, the toe is rotated up minimally to y = 0.
- From t_p + T_b on, the rendered foot = the physical foot. Physics is authoritative for the visible foot, and the physical foot never chases the animation.

**After demotion.** The rendered pose blends back to the authored stream-A pose over T_b, using the same smoothstep. The authoritative trajectory is never moved.

**Neutrality.** RF-1 is presentation / physics-side only. Gameplay hashes are unchanged by construction; NT-1 … NT-4 verify it.

**PCG rows changed for REV1.** These follow from the user's direction ("the rendered foot follows the physical F0 foot, rather than requiring the physical foot to reproduce the presentation toe-pivot / heel-strike configuration").

| row | REV1 |
|---|---|
| P-5 foot orientation (physical vs presentation) | **replaced** by TR-1 below. The physical foot may differ by Δθ. |
| P-9 contact | applied to the **reconciled physical** foot (in contact → lowest point in [−5, +2] mm) |
| P-10 | the physical body after reconciliation |
| P-11 | the **rendered** foot + toe during the blend: ≤ 10 mm penetration |
| P-14 / P-15 for the feet | **replaced** by TR-1 (visible) and TR-3 (momentum) |
| P-14 / P-15 for every other body | unchanged |
| everything else | unchanged |

**Transition criteria** (for every evaluated promotion frame, over [t_p, t_p + T_b]; the physical-foot target = the reconciled foot per frame):

| | criterion |
|---|---|
| TR-1 | no visible snap: the per-frame increment of the rendered foot's rotation relative to stream A ≤ 5° (P-5's tolerance applied per frame); rendered foot angular velocity vs stream A ≤ 2.0 rad/s (P-15's) |
| TR-2 | pelvis / root at k_p unchanged by RF-1: P-1 / P-2 |
| TR-3 | no injected momentum: whole-body COM velocity ≤ 0.05 m/s (P-16) and angular momentum ≤ 10 % (P-17), including the reconciled foot velocities |
| TR-4 | no turf penetration: physical ≥ −5 mm (P-9 / P-10); rendered ≤ 10 mm (P-11) |
| TR-5 | authoritative timing / outcome / hashes unchanged: NT checks |

## 5. Tests (before the gate rerun) and adoption rule

**Domain:** every pre-contact frame of every distinct V1.3 record (rx + defending), by speed class and stride phase (as in `pcg_scan`).

**Mapping criteria for PM-2.** Each frame is evaluated as a promotion frame:

| | criterion |
|---|---|
| MC-1 | hip / knee / ankle ≤ 10 mm (P-4) |
| MC-2 | limb direction ≤ 2° (P-6); twist ≤ 10° (P-7) |
| MC-3 | angular velocity introduced by the mapping: per mapped body \|ω_V2 − ω_rig\| ≤ 2.0 rad/s (P-15), reported axial / transverse; linear ≤ 0.25 m/s (P-14) |
| MC-4 | no ROM clamp (P-12) |
| MC-5 | determinism: identical output twice |
| MC-6 | P-16 / P-17 |

**Reported** for R-K and PM-2 side by side. The F-2 bound is checked numerically at every IK-switch frame.

**RF-1:** TR-1 … TR-4 on the same domain.

**Adoption, decided now.**
- **PM-2** replaces R-K in the rerun if MC-4 and MC-5 hold, it is no worse than R-K on MC-1 / MC-2 failures, and it lowers the maximum MC-3 axial excess. Otherwise R-K stays and the failure is reported.
- **RF-1** is used in the rerun as specified. Its TR failures are reported per frame and enter the gate as rows.

## 6. Gate rerun on V1.3 (unchanged)

**What runs:** `compat_gate_v13.mjs` logic with PCG-F0 → PCG-REV1 (PM-2 + RF-1 rows), on the same 26 candidates and the same selection rule.

**Unchanged:** CG-1 … CG-8, NM, and the CG-7 window (trigger → contact) with the tackler-primitive sub-item.

**Reported:** pass counts per class (near miss; recoverable / STUMBLE; planted-leg FALL) and every remaining failure reason.

## 7. PI-1 and hard stops

**PI-1 runs** only if every class has at least one gate-passing candidate, with PI-1 amendment 1 committed before any physics, as TRACKB_PREREG §8.

**Stop rather than amend again** if:
- knee compatibility needs a change to V2 anatomy / joint ranges;
- RF-1 causes a materially visible pop that cannot be handled presentation-side;
- simulation outcomes change;
- V1.3 would have to be tuned;
- the three classes cannot all be represented;
- PI-1 would need outcome-specific physics.

## 8. Amendments

None at freezing.

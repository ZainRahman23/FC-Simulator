# AST-1E: the stand-in tackler with an extending slide leg. PREREGISTRATION (frozen before any AST-1E code or run)

**Date:** 10 Oct 2026.

**Source:** `../../sources/2026-10-10_user_decision_option_c_moving_stand_in.md` (3ec464e, verbatim).

**Context:**
- PCS-1 stopped at its promotion-frame re-check (`PCS1_STOP_KP_RECHECK.md`, fbdb6f5).
- PCS-1 itself (`PCS1_PREREG.md`, 8585adc) is unchanged: D-1 … D-8, every criterion, and the ≥ 6-tick lead.
- **Frozen, byte-identical:** the runner / carrier code (`scripts/law_provider.mjs`, `scripts/pi1_carrier_sim.mjs`), REV2's `pi1_rev2_sim.mjs`, and everything in physchar2, LC-1 and V1.3.

> **Correction recorded prominently.** On 10 Oct the PCS-1 frames k39 (rx_free_leg) and k38 (rx_planted_leg) were described in `PROMOTION_CARRIER_INVESTIGATION.md` §6.2 / §6.3 as passing the full REV2 handoff gate. **That was wrong.**
> - They fail **HG-T**.
> - The frames were taken from `locomotion_continuity/evidence/valid_on_rx.json`, whose "valid" flag (`lc_valid.mjs` / `hg_valid_frames.mjs`) records HG-T separately and does not count it.
> - The original evidence and texts are kept unchanged. The erratum is appended to the investigation report, and the stop report documents it.

---

## 1. The representation mismatch (from the record; read-only)

**HG-T's frozen quantity** (REV2 §2): "the stand-in is instantiable at k_p". Its condition for the rigid AST-1 was "the slide leg's extension is complete (launch τ ≥ extT)", because AST-1's slide leg is a rigid copy of the k_p primitives and **freezes at promotion**.

**What the simulation's slide leg does** ("far" rule, `ptRxTacklerPrims` → `ptDefSlideLeg`; LC-1 exports; `evidence/` in §5):

| fact | value |
|---|---|
| THIGH (hip → knee, r 0.085), TUCK, TUCKSHIN, BODY, TRUNK | constant lengths; they translate, and the leg also yaws with the sweep |
| LEG (knee → toe, r 0.07) | **grows in length** from launch, 0.0889 m per tick, to 0.6401 m at full extension (frame 43 in all three records) |
| LEG in the thigh's own planar frame | knee point fixed at (0.4779, 0, −0.050) m; direction exactly collinear with the thigh (0.000°) at every sub-step; after full extension **rigid** (endpoint drift 0.00 mm to contact + 2 ticks) |
| the sweep | rotates thigh and leg together (thigh yaw 90.0° → 99.9° over frames 38 – 44, rx_planted_leg) |

**So the only thing AST-1 cannot represent is the LEG capsule's growth before full extension.** Thigh motion, sweep and the post-extension leg are rigid motions that AST-1's drive already tracks.

## 2. AST-1E: the smallest change (the LEG segment only)

**TORSO:** AST-1 exactly as REV2 §5 (prims, mass, rigid fit, drive, caps).

**LEG segment** (prims THIGH + LEG, as AST-1):

| item | AST-1 (REV2 §5) | AST-1E |
|---|---|---|
| body | one dynamic body, translation + yaw | the same |
| mass | m_T × 0.2365 (PT_REACT leg mass fractions) | the same |
| inertia / COM | uniform density over the k_p capsules | uniform density over the **fully extended** leg: THIGH (k_p) + the LEG capsule from the knee along its k_p direction, with length L_ext = L_LEG(k_p) / min(1, launchT(k_p) / extT). This uses the record at k_p only; no later frame is read. |
| pose at τ | planar (yaw + translation) Kabsch fit of all segment endpoints at k_p to the recorded endpoints at τ | the same fit on the segment's **rigid** points only: THIGH.a, THIGH.b, LEG.a. These are exactly rigid at all times (§1). |
| geometry | fixed compound of the k_p capsules | compound of the THIGH capsule (k_p, fixed) and the LEG capsule whose body-local endpoints are the recorded LEG endpoints at τ mapped by the inverse of the fitted pose. **Exact record geometry.** |
| geometry update | none | before each physics step while prescribed (§3): the shape for the step's end time τ + 1/4 tick, the same time as AST-1's tether target. It is set by `BodyInterface.SetShape(…, updateMassProperties = false)` inside an `OffsetCenterOfMassShape` that keeps the body's COM at the extended-geometry COM. Mass, inertia, COM, position and velocity are therefore never changed by a geometry update. |
| drive | (i) feed-forward m·a_auth, I_yy·α_auth (second differences of the fitted pose); (ii) capped tether 2 Hz, ζ = 1, 334 N / 82 N·m × mass fraction | the same, while prescribed |

**Same for all three cases:** the mechanism, mapping and constants, with no case-specific branch.
- In rx_miss (k_p = 47) the extension is complete at k_p, so the leg geometry is constant from the start.
- In rx_free_leg and rx_planted_leg the LEG grows from k_p until frame 43, then stays constant.

**Not added:** no joint between the segments (AST-1's rule stands); no IK, targeting, control, balance or outcome logic; no tuning; no change to the torso, to collision radii, or to the runner.

## 3. Relinquishing authority at contact (the critical requirement)

**Prescribed** means the LEG segment's drive (feed-forward + tether) and its geometry updates are active. Prescription ends permanently at the first of:
- **(a)** the step after any physics step that reports a manifold between the LEG body and any runner body (speculative contacts included, the A2 manifold set);
- **(b)** the first step of the authoritative contact interval: τ_n ≥ r_c = first gameplay contact event tick − 1. This is the same row rule as PCS-1's C-T. rx_miss has none.

**At that moment, between two physics steps:**
- the feed-forward stops (no further `AddForce` / `AddTorque` on the LEG body);
- the tether's four motors (x, y, z, yaw) are switched Off. The constraint's locked roll / pitch axes are DOF locks and stay;
- the geometry is frozen at its last shape.

**Not done:** no position, rotation or velocity of any body is written. Nothing is reset. Nothing is switched by outcome class. The rule and its constants are identical in every case and in the no-tackler counterpart.

**From then on** the LEG body is a free dynamic body. It keeps its exact momentum and receives only contact impulses, which Jolt solves. No force pulls it back toward the authoritative path. The simulation's own contact response, in the record after r_c, is never applied to it.

**TORSO.** Unchanged (AST-1). Any torso ↔ runner contact is reported.

**Tests (gating for AST-1E):**

| row | requirement |
|---|---|
| R-1 | after release: the LEG body's feed-forward force / torque and tether lambdas are **exactly 0** at every step |
| R-2 | the release writes no state: the LEG body's position, rotation, linear and angular velocity read immediately before and after the release operations are bit-identical, and stand-in state writes after init = 0 |
| R-3 | no impulse cancellation: over [the LEG's first physical (A2) contact, + 0.10 s], the LEG's drive impulse (feed-forward·dt + tether lambdas) opposing the contact impulse is 0 when released before the contact step; if any contact step precedes release, that opposing impulse ≤ 0.5 × the contact impulse (RC-3's threshold) |
| R-4 | the release rule, constants and code path are identical for all cases (logged constants; one code path) |

## 4. Verification before any carrier run (the user's items 2 – 6)

All are run with the REV2 runner plant (carrier off) and AST-1E, so no carrier physics is involved. Any failure stops before the carrier slice.

| item | test |
|---|---|
| **2. Geometry** | In the no-tackler variant (no contact possible), every LEG-segment capsule endpoint (THIGH a / b, LEG a / b) is within **10 mm** (AST-C1's tolerance) of the recorded primitive endpoint at every sub-step from τ_p to τ_ref (the first gameplay contact; rx_miss: the closest approach), or to release if earlier. Reported: the maximum, and the whole stand-in's AST-C1 value. |
| **3. Gate** | The full REV2 handoff gate, code unchanged, on every pre-contact frame: P-1 … P-17, HG-A v2, HG-D, and **HG-T evaluated for the stand-in in use (AST-1E)**, with its frozen quantity "the stand-in is instantiable at k_p". For AST-1E it holds on a frame iff the slide state is SLIDE with launchT > 0, so the LEG has a direction and L_ext is defined. Item 2 is then verified from the selected frame (a failure stops). **Reported alongside, unchanged:** AST-1's condition (launch ≥ extT). |
| **4. Frames** | The D-5 rule (latest gate-valid frame with lead ≥ 6 ticks) must give **47, 39 and 38**, the PCS-1 frames. Anything else stops: the PCS-1 re-check would mismatch. |
| **5. Hashes** | The records' SHA-256 are unchanged (`SHA256SUMS`). The records' gameplay hashes are identical across OFFNP / OFF / FULL / LOCO and equal V1.3's (LC-1 export summaries). |
| **6. Interaction** | The AST-1E capsules from the item-2 run, shifted back by −500 m, are swept against the simulation's own runner segments (`simBody`, the simulation's capsule radii and taper) at every sub-step. **rx_miss:** no penetration over [τ_p, τ_ref + 12 ticks]. **Contact cases, for each gameplay contact** (rx_free_leg: the first and the decisive contact; rx_planted_leg: its contact), at time t_g on runner segment s_g by primitive p_g: the stand-in segment carrying p_g penetrates s_g, or an adjacent segment of the same leg with the closest point ≤ 30 mm from the shared joint (CG-1's rule), at some sub-step in [t_g − 1, t_g + 1] ticks (CG-3). Also, no stand-in capsule penetrates any runner segment in [τ_p, t_g − 1) before the first gameplay contact. |

## 5. Then

**If items 2 – 6 and R-4 pass,** run PCS-1 exactly as preregistered (8585adc), with AST-1E as its stand-in.
- K0 is already done.
- K4b runs with AST-1E in both the REV2 plant and the carrier-off plant (bit-identity of the runner plant).
- Then the 12 carrier runs; R-1 … R-3 are evaluated on them.
- Stop for review after the slice.

**Predicted, disclosed now (a record property, unchanged criterion).** PCS-1 §4.3 keeps REV2's 10 mm tackler-discontinuity row: the maximum change of per-sub-step displacement of any recorded primitive endpoint over [k_p, contact + 2].
- Over the PCS-1 windows it is **17.9 mm** for rx_free_leg and rx_planted_leg: the simulation's LEG stops growing abruptly at frame 43 / sub-step 2. It is 3.4 mm for rx_miss.
- It is computed from the record alone and does not depend on the stand-in.
- Under the frozen answer rule it will fail in those two cases. It is reported and attributed, not changed.

**Hard stop (user):** if AST-1E cannot give valid ≥ 6-tick frames for all three cases, or items 2 / 5 / 6 fail, stop and report.
- No further amendment.
- No relaxed criterion.
- No change to collision geometry.
- No trajectory tuning.
- No carrier physics.

## 6. Amendments

None at freezing.

### A1 (before any AST-1E output; implementation of §2's geometry update only; every preregistered property unchanged)

**Why.** The preregistered mechanism cannot run in this Jolt build.
- §2's mechanism was `SetShape` inside an `OffsetCenterOfMassShape`.
- `OffsetCenterOfMassShape` constructs, but its `GetCenterOfMass` aborts the wasm module ("RuntimeError: null function or function signature mismatch"; probe `scripts/jolt_probe.mjs`, reproduced on the harness's first AST-1E construction, which produced no output). `SetShape` calls that method internally.

**Replacement, with the same properties:**
- **Shape.** The LEG segment's shape is a `MutableCompoundShape`:
  - sub-shape 0 = the THIGH capsule (k_p, fixed);
  - sub-shapes 1 … K (K = 8) = collinear capsules of radius r_LEG, each with axis length ℓ = L_ext / K.
- **Mass properties.** It is built in the fully extended layout (the K axis segments tiling [knee, knee + L_ext]), so mass, inertia and COM are those of the fully extended leg, as §2 requires.
- **Update.** Before each prescribed step, piece i is moved with `ModifyShape` and **no** `AdjustCenterOfMass`. It goes to the axis segment [s_i, s_i + ℓ] along the recorded LEG axis (knee → toe, body-local by the inverse fit), with s_i = min(i·ℓ, L(τ) − ℓ), clamped at 0. Then `BodyInterface.NotifyShapeChanged(updateMassProperties = false)` updates the bounds.
- **Exact geometry.** The union of equal-radius collinear capsules whose axis segments cover [0, L(τ)] is exactly the recorded LEG capsule whenever L(τ) ≥ ℓ = 0.080 m. That holds at every k_p used (L ≥ 0.267 m).
- **No state change.** A geometry update changes no COM, mass, inertia, position or velocity (probe `scripts/jolt_probe2.mjs`: COM identical after `ModifyShape`).
- **Release.** Release freezes the pieces.

Everything else in §2 – §5 is unchanged.

### A2 (user-approved correction, `../../sources/2026-10-10_user_approval_standin_timing_correction.md`; before the re-run of checks 2 – 6)

**Change.** The stand-in tether's spring **position and orientation targets** are set to the authoritative pose at the **start** of the step (p0, τ), replacing the end-of-step pose (p1, τ + ¼ tick). It applies to both segments while prescribed.

**Unchanged:**
- the velocity / angular-velocity targets ((p1 − p0) / dt);
- the feed-forward;
- caps, gains, mass properties, geometry, trajectory, the release rule;
- every check and threshold, including item 2's 10 mm.

**Reason.** Jolt evaluates a spring motor's position error at the start of the step. With the end-of-step target, an on-path body is pulled about one step ahead (`AST1E_STOP_TRACKING.md` §2). This is a correction of the inherited drive's timing, not of any criterion.

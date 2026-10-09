# SLP-2 — authoritative locomotion field (A) + finite physical support / recoverability (B) + physical legs (C): PREREGISTRATION (FROZEN before any SLP-2 code or run)

**Status:** frozen at the commit that adds this file. No SLP-2 code and no SLP-2 run existed at freezing. Any later change is a recorded amendment (§11), never a silent edit.

**Sources (verbatim):**
- `../sources/2026-10-09_user_decision_slp2_separation_design.md` (the A / B / C separation);
- `../sources/2026-10-09_user_approval_slp2.md` (decisions 1 – 4 approved; production-contract clarification; run and stop rules).

**Architecture:** `SLP2_ARCHITECTURE_DRAFT.md` (approved).

**Preserved:** SLP-1 (627d935) and SLP-1b (e4f572f) are failed experiments, unchanged. Their code paths (driver versions "1", "1b") must reproduce their calibration hashes.

## 0. Production-contract clarification (recorded before freezing, as instructed)

- **SLP-2 is a calibration experiment.** Physical disruption or a fall may diverge from the authoritative trajectory T. That divergence is only **reported**: D is report-only and never feeds back into T.
- **This is not the final production gameplay contract.**
  - In production the football simulation remains authoritative over whether a football interaction changes the player's gameplay state or trajectory. Presentation physics must not independently change an already-decided football outcome.
  - Once the match engine resolves a collision, tackle or contact outcome, the physical character is responsible for producing a plausible body response consistent with that outcome.
  - **SLP-2 does not address that integration.**

## 1. Question

With ordinary translation supplied by an authoritative, state-independent field (A), can V2-REF move along a straight authoritative trajectory at 1.2 / 3 / 6 m/s as a genuine articulated, contactable body?
- Its finite support (B) must use only a small part of its recovery budget in undisturbed motion.
- Its legs (C) must carry the weight and explain the motion without propelling it.

And do matched disturbances then produce physically differentiated, recoverable or unrecoverable responses, decided only by the resulting physical state?

## 2. Mechanisms (driver / simulator version "2"; new code paths only; default off)

### A — locomotion authority

- Before every Jolt step, each of the 14 character bodies receives F_A,i = α·m_i·(a_T,x, 0, a_T,z), evaluated at mid-step (t + dt / 2), applied at the body's COM with Jolt `BodyInterface::AddForce`.
- a_T = the authoritative horizontal acceleration: the frozen SLP-1 trajectories, a straight line along +z with the min-jerk ramp, so a_T,x = 0.
- **A reads no physical state.** It is a function of time and α only.
- It is not a motor, constraint, kinematic body, character controller or gravity change.
- No torque about the whole-body COM; no joint load.
- **Ledger:** W_A = Σ_i F_A,i · v_i,mid · dt. The A force vector (Σ_i F_A,i) is recorded every tick.

### B — physical support / recoverability

SLP-1's mechanism, **unchanged**:
- the turf ↔ pelvis SixDOF constraint, PositionAndVelocity motors;
- **caps:** walk / jog / run horizontal 313.85 / 274.95 / 333.94 N; vertical +1161.2 / −193.5 N; torque 81.80 N·m on each axis;
- spring candidates {1, 2, 4} Hz (ζ = 1);
- **authority law:** α̇ = −α·ω·max(0, −m̂) + (1 − α)·ω·max(0, m̂)·[not FALLEN], with m̂ = 1 − ‖ξ_S − ξ_ref‖ / R and R, ω, J* as frozen.
  - ξ_ref is computed from the authoritative trajectory, exactly as in SLP-1 / 1b. The SLP-1 authority law is unchanged.

**Targets:**
- position and velocity = the reference R (§2 R);
- orientation = q0;
- vertical feed-forward α·(M·(g + δa_y,impl) − Σ F_y,sched), exactly SLP-1b's B4 form.

**Rules:** B never reads contacts or collisions; never writes a pose or velocity; never exceeds its caps.

### C — legs (SLP-1b driver, minus B2)

- **B1:** stance-leg IK in the controller's validated posture-"ik" frame (measured horizontal pelvis origin, reference height, reference orientation); swing-leg IK in the actual pelvis frame; blended by the stance weight.
- **B3:** stance vertical force schedule.
  - Walking-type schedules: M·g by the scheduled shares.
  - Flight schedules: F_pk·sin(πu), with F_pk = π·M·g·(T / 2) / (2·t_c).
  - Ground force direction through the measured COM.
- **No B2:** touchdown targets as in SLP-1, with the stance centred under the reference hip at mid-stance. So the scheduled stance force has zero net horizontal impulse per step.
- Everything else as in SLP-1b:
  - existing bounded leg IK (hard box), gains, `stepSegment` swing, stance roll;
  - the 0.03 s blends;
  - FALLEN posture hold.

### R — reference body state

R = T + δ_C. δ_C is the deviation that C's own scheduled forces produce, computed before t = 0 on the 240 Hz grid:
- δa = Σ_n F_n,sched / M + g − (0, ḧ_settle, 0);
- with A carrying a_T, **no −a_T term**;
- δv = D(∫δa), δx = D(∫δv), with the centred one-step-period detrend D of SLP-1b.

D(t) = S − R (§3) is report-only.

### Unchanged

- Gait inputs (`../slp1/gait_inputs.mjs`), derived quantities (`../slp1/derived.json`).
- V2 body, actuators, passive tissue, contacts.
- 240 Hz, 150 / 2 iterations, IK frequency (every tick), diagnostic configuration.
- Disturbance definitions and the 21-case matrix (SLP-1 §2.4, with amendment 1's shank point); impactor rule v_i = 1.5·J_mod / 20 kg.
- The SLP-1 driver's touchdown capture of the planted pose.

**No tackle-specific threshold, fall rule, animation logic or collision-event branch exists anywhere.**

## 3. Discrepancy D and momentum (recorded, report-only)

**Per tick (60 Hz trace):**
- D_x = c_S − c_R (3D), D_v = v_S − v_R (3D);
- pelvis orientation q_R⁻¹·q_S (pitch / roll / yaw), pelvis angular velocity ω_pelvis;
- whole-body angular momentum about the COM, L (the existing G1 measurement);
- linear momentum P = M·v_S;
- A force, B force and torque, α, m̂, ‖ξ_S − ξ_ref‖;
- ground contact force per foot; schedule phase; IK residual; actuator saturation; leg hard-limit margin; energy residual.

**Per disturbance:**
- applied or transferred impulse;
- contact body and point(s) (impactor: from the contact manifolds);
- stance / swing phase of both feet at the start;
- foot contacts (20 N log) and planted-foot slip per stance after the disturbance;
- P and L immediately before contact (the tick before the pulse start / first impactor contact), immediately after contact (pulse end / last impactor contact), and at disengagement (the tick before and the tick of α < 0.05);
- time to recover;
- classification (§6.3).

## 4. Criteria

**Steady window:** [t_g + T_ramp + 1 s, end] for D0; [t_g + T_ramp + 1 s, t_d) for disturbance runs. **Ramp window:** [t_g, t_g + T_ramp].

### 4.1 Architecture criteria (all must hold at a speed for that speed to pass)

| | criterion |
|---|---|
| **A1** | realised mean forward speed within ± 5 % of v |
| **A2** | pelvis horizontal error vs the authoritative path: RMS ≤ 30 mm, max ≤ 100 mm |
| **A3** | B saturated on ≤ 5 % of steady ticks |
| **A4** | α ≥ 0.99 throughout; no FALLEN |
| **A5** | integrity: finite; `authorityWrites` = 0; caps never exceeded beyond 1e-3 N; no position correction > 20 mm; energy Σ+ ≤ 5 J (the ledger now includes W_A) |
| **A6** | every scheduled stance has turf contact (≥ 1 tick at ≥ 20 N) |
| **A7** | legs carry ≥ 50 % of body weight (steady window) |
| **A9 — support budget (new)** | in undisturbed steady locomotion, B stays below 25 % of its caps. For every B axis (F_x, F_y, F_z, T_x, T_y, T_z), mean \|B_axis\| / cap_axis ≤ 0.25 (cap of the sign in force for F_y). p95 and max are reported. |
| **A10 — A carries the translation (new)** | over [t_g, end of the steady window], the net forward impulses satisfy \|J_B\| ≤ 0.25·\|J_A\| and \|J_legs\| ≤ 0.25·\|J_A\|. J_A = ∫Σ F_A,z; J_B = ∫F_B,z; J_legs = ∫Σ ground F_z (ankle-probe contact impulses). |

### 4.2 Calibration

- D0 at walk / jog / run × f ∈ {1, 2, 4} Hz, each executed twice.
- f = the softest value meeting **A1 – A7, A9, A10** at all three speeds.
- If none: **stop and report**.

### 4.3 Matrix

The 21 runs (7 cases × 3 speeds) at the calibrated f, each executed twice.

### 4.4 Disturbance progression

As SLP-1 §6.3, with the deviation measured as D (vs R):
- **retained:** α ≥ 0.99 and peak horizontal ‖D_x‖ (pelvis) ≤ the same speed's D0 maximum + 20 mm;
- **displaced / recovering:** α ≥ 0.99; larger peak, back inside that envelope within 1.5 s;
- **substantially disrupted:** α < 0.99 at some time with recovery to ≥ 0.99, or stride disruption (scheduled stance without contact, planted slip > 20 mm, touchdown > 50 mm from target);
- **support lost:** α < 0.05;
- **fell:** FALLEN.

**Time to recover:** from the disturbance start to the last instant ‖D_x‖ leaves the D0 envelope, given that α ≥ 0.99 at the end.

### 4.5 Tests

- **Cancellation (§6.4 of SLP-1).**
  - Over [disturbance start, + 0.10 s], B's impulse opposing the disturbance, divided by the disturbance impulse; A's impulse over the same window is also reported.
  - "Materially cancels" iff (B + A) opposing impulse ≥ 0.5 × the disturbance impulse.
  - By construction A has no lateral component and no state dependence.
- **Loss continuity (§6.5).** No write, and no per-tick COM Δv > 0.5 m/s around α < 0.05.

## 5. Stop rules (the user's)

Stop immediately and report if any of these occurs:
- A materially cancels collision response (§4.5);
- B must carry ordinary locomotion again (A10, or A7 failing because of B);
- ordinary undisturbed locomotion consumes more than the preregistered support budget (A9 / A3);
- momentum is discontinuously changed on disengagement (§4.5);
- the architecture requires hidden state writes (`authorityWrites` > 0, or any write path).

If SLP-2 passes: stop and report. No SLP-3, tackles, polish, optimisation, TD2C / E2.

## 6. Comparisons to report

- **Matched impulse (0.75·J*):** torso D2 vs swing-leg D4 vs stance-leg D5, per speed. Do location, gait phase and current state produce different responses (D, α, contacts, joint loads, momentum) from identical impulse magnitudes?
- **Rigid impactor D2c vs applied pulse D2:** transferred impulse, struck segments, contact duration, the momentum split between linear and angular, and the body's response. Explain any meaningful difference.

## 7. CPU

Sequential runs, same configuration and counters as SLP-1 / 1b (Jolt, passive, driver, A + support, actuators, probes, measurement). Nothing optimised.

## 8. Regression and preservation

- SLP-1 (version "1") and SLP-1b (version "1b") calibration hashes reproduce (walk / jog / run f1).
- No existing non-SLP file is edited. The probe / CF battery and component regressions are unaffected by construction (verified at 627d935).

## 9. Not claimed

- Production gameplay contract (§0).
- Football validity; tackle behaviour; recovery; turning; gait quality (LOC-1).
- Robustness beyond 21 cases; CPU optimisation.

## 10. Reporting

All of §3 – §7, with figures of D, α, A / B forces and momentum per disturbance.

## 11. Amendments

None at freezing.

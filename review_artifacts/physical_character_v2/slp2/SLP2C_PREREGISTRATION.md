# SLP-2C — contact-compatible legs: PREREGISTRATION (FROZEN before any SLP-2C code or run)

**Status:** frozen at the commit that adds this file. No SLP-2C code and no SLP-2C run existed at freezing. Later changes are recorded amendments (§9).

**Sources (verbatim):**
- `../sources/2026-10-09_user_decision_slp2c_contact_compatible_legs.md` (scope, staged stop rules, required pass conditions and reporting);
- the SLP-2 protocol `SLP2_PREREGISTRATION.md` (03455b8) with its result `SLP2_RESULTS.md` (e3c99e1).

**Preserved:** SLP-2 stays a failed calibration exactly as recorded. A is validated and **unchanged**. SLP-1 / 1b / 2 code paths (versions "1", "1b", "2") must reproduce their hashes.

## 1. Purpose (sole)

Determine whether real physical foot contacts can coexist with authoritative translation (A) without consuming B's disturbance / recovery budget in ordinary unobstructed locomotion. In other words: whether C can be **mechanically neutral with respect to authoritative translation while remaining physically real**.

## 2. The failure being addressed (measured, read-only, before freezing)

Source: `analysis/contact_diagnosis_{walk,jog,run}_f1.json`, from `scripts/contact_diagnosis.mjs`. Each run was regenerated from the frozen SLP-2 calibration runs; all three hashes are identical.

**Touchdown.**
- In the healthy early steps, feet land with forward ground-relative speed of 0.14 – 0.38 m/s (walk), 0.01 – 0.16 (jog) and up to 0.28 (run).
- They often land **before** the scheduled touchdown, still in swing gains and without the stance schedule, with 0.25 – 0.95 m/s of downward speed.
- They land 0.12 – 0.48 m ahead of the (increasingly lagging) COM. The legs brake at each touchdown, the lag compounds, and B absorbs it.

**Stance resistance.**
- The stance legs carry no velocity feed-forward (SLP-1 §2.3.5 gave it to swing legs only). Their joint damping therefore acts against the sweep of the body over the planted foot.
- The requested stance damping torque (D + dt·K)·ω averages 145 – 334 N·m at the ankle pitch axis (above the ankle's capacity) and 86 – 167 N·m at the knee.

**Vertical.**
- Legs delivered ≈ the scheduled stance vertical impulse in walk (402 vs 416 N·s) and jog (238 – 288 vs 265 – 275), but 73 – 82 % in run.
- Many run stance axes saturate, partly on those damping requests.
- B carried 300 – 650 N in jog / run flights.

## 3. Mechanisms (driver version "2c"; everything else is SLP-2 version "2")

**Unchanged:**
- **A:** uniform whole-body field α·m_i·a_T.
- **B:** constraint, caps, spring candidates, α law, R, J*.
- **R:** T + δ_C. C's scheduled footholds, contact points and stance forces are unchanged, so δ_C is unchanged.
- The V2 body, joints, actuator capacities, contact / friction model, 240 Hz, 150 / 2 iterations, IK every tick, diagnostics.
- Disturbance definitions and the matrix.

**C1 — swing-foot landing state (horizontal settles before contact).**
- The swing trajectory's **horizontal position and foot orientation** reach the touchdown pose at rest at T_sw − τ_d (one `stepSegment`, without knot, over T_h = T_sw − τ_d), then hold it.
- The **vertical** coordinate keeps SLP-2's segment over the full T_sw (apex knot at T_sw / 2, arriving at the touchdown height at T_sw at rest).
- So during the last τ_d the foot descends onto its foothold with **zero scheduled horizontal velocity relative to the ground**, the physically appropriate value for a planted, non-sliding foot.
- **τ_d = 3 / (ζ_sw·2π·f_sw) = 0.1492 s:** three time constants of the existing swing servo (`LIFECYCLE.swingHz` = 4 Hz, `swingZeta` = 0.8). This is the time the physical foot needs to settle onto its scheduled horizontal state. No new tuned value.
- T_h = 0.247 / 0.305 / 0.326 s for walk / jog / run.

**C2 — stance-leg compatibility (accommodate, don't resist).**
- The velocity feed-forward (D + dt·K)·ω_ref, which SLP-1 / 2 applied to swing legs only, is applied to **all leg phases** (weight 1 instead of 1 − w).
- ω_ref = the rate of the leg's IK target (the existing finite difference of successive targets within a schedule phase; zero on a phase's first tick).
- In stance the IK frame is the controller's posture-"ik" frame:
  - measured horizontal pelvis position, so the targets follow the body's actual sweep over the fixed foot;
  - reference height and orientation (unchanged B1).
- Joint damping then acts only on deviation from that accommodation, not against the translation.
- The planted pose stays fixed (no sliding foot).

**C3 — jog / run vertical cycle.**
- The scheduled vertical stance impulse (B3 half-sine, M·g per step) and the reference bounce (δ_y in R and in the stance IK frame height) are unchanged.
- With C2 the stance legs now track the scheduled leg extension (the bounce) with velocity feed-forward, which is the actual flight launch. With C1, contact happens at the scheduled touchdown, so the stance force schedule and the contact coincide.
- **C3 adds no further mechanism or parameter.** If the launch still fails, that is the finding.

**Not used:**
- no B-cap increase; no A compensation of any contact force; no friction change; no presentation-only contact;
- no balance feedback; no change to footholds;
- no tackle- or disturbance-specific logic.

## 4. Pass conditions (V2-REF, f = 1 Hz, undisturbed; steady window [t_g + T_ramp + 1 s, end])

All must hold at a speed for that speed to pass.

| | requirement (user) | preregistered test |
|---|---|---|
| **P1** | A responsible for essentially all net horizontal locomotion | over [t_g, end], net forward impulses: \|J_B\| ≤ 0.10·J_A and \|J_legs\| ≤ 0.10·J_A |
| **P2** | B below the 25 % budget in steady locomotion | SLP-2 A9 (mean \|B_axis\| / cap ≤ 0.25, every axis) **and** A3 (B saturated ≤ 5 % of ticks) |
| **P3** | feet do not accumulate systematic net braking / propulsion | per steady step (touchdown to next touchdown), net leg forward impulse: \|mean\| ≤ 0.02·M·v; and \|J_legs over the steady window\| ≤ 0.05·M·v |
| **P4** | planted feet genuinely planted | planted-foot slip (sole centroid, flat stance 0.2 ≤ u ≤ 0.6) < 20 mm for every steady stance (the existing G2 relocation tolerance) |
| **P5** | legs carry the ordinary vertical support | legs' vertical ground impulse over the steady window ≥ 0.90·M·g·duration |
| **P6** | jog / run stance – flight structure, B not carrying flight | flight schedules only: every steady stride contains a measured flight (both feet < 20 N); mean measured flight ≥ 50 % of the scheduled flight; B's mean vertical force during scheduled flight ≤ 0.25·M·g |
| **P7** | no progressive lag | over steady steps: mean forward D_x per step shows no accumulation (thirds rule as CF-6 §7, floor 5 mm); \|D_x,z\| ≤ 50 mm at the end; \|mean Dv_z per step\| ≤ 0.05 m/s; A2 (pelvis vs authoritative RMS ≤ 30 mm, max ≤ 100 mm) |
| **P8** | actuator / joint margins valid before any failure | leg hard-limit margin ≥ 0° throughout the steady window; leg actuator saturation ≤ 10 % of leg axis-ticks in the steady window |
| **P9** | earlier evidence reproducible | versions "1", "1b", "2": walk / jog / run f1 calibration hashes reproduce (SLP-1 8619bbfb / 3841c86c / 9a5908ef; SLP-1b cfe3d864 / 78645f75 / a6bcd4a2; SLP-2 6fbee446 / e07e8f6c / b9939a2e) |
| also | A1, A4, A5, A6 of SLP-2 | speed ± 5 %; α ≥ 0.99 and no FALLEN; integrity (no writes, caps, finite, Σ+ ≤ 5 J); every stance in contact |

## 5. Staged procedure and stop rules (user)

1. **Stage 1:** walk 1.2 m/s, D0, f = 1 Hz, executed twice.
   - If it fails for the same contact incompatibility (touchdown or stance braking consuming B), **stop**.
   - If it fails for another reason: also stop and report. No stage proceeds on a failure.
2. **Stage 2:** jog 3 m/s, then **Stage 3:** run 6 m/s. Same conditions, each executed twice; stop at the first failure.
3. **Only if all three pass:** rerun the frozen **SLP-2 calibration** (D0 × f ∈ {1, 2, 4} × 3 speeds × 2) with driver "2c", under SLP-2's criteria (A1 – A7, A9, A10; softest passing f).
4. **Only if that passes:** the frozen 21-case matrix (including the genuine rigid impactor) at the calibrated f, each executed twice, with SLP-2's recording, comparisons and stop rules. No disturbance-specific tuning.
5. **Stop and report** (for review) after the last stage reached.

**Hard stop:** if passing would need presentation-only contacts, A compensating contact forces, materially reduced friction, larger B caps, or anything that makes collisions physically meaningless. Report instead.

## 6. Reported per speed (user)

- A horizontal impulse;
- net horizontal ground-contact impulse;
- touchdown horizontal foot velocity relative to ground (per physical touchdown);
- stance-foot slip;
- vertical ground-reaction impulse;
- B force / torque usage;
- body / reference discrepancy;
- pelvis orientation;
- contact / flight timing;
- joint and actuator margins;
- CPU;
- the verdict on mechanical neutrality.

## 7. Not attempted

Realistic running animation, turning, acceleration polish, football-specific gait, tackles, recovery animation, performance optimisation, TD2C / E2, production LOC-1.

## 8. Code

- Version "2c" paths only in `ctrl/v2_supported.js` (C1, C2) and `tools/slp1_probe.mjs` (P-tests, touchdown velocity, flight timing).
- `gates/v2_slp.js` A / B unchanged.

## 9. Amendments

None at freezing.

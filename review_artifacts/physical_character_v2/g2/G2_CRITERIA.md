# V2-G2 pass criteria, v1 (pre-registered before the final validation run)

**Sources:**
- spec §22 V2-G2 (rows 2.1–2.5);
- the user's G2 instruction (`../sources/2026-10-03_user_instruction_g2_active_standing.md`, items 1–23);
- the G2 development measurements (`../DECISIONS.md`, G2 entries).

These criteria are written and committed **before** the final validation run (`tools/g2_run.js`). Any later change is a recorded amendment with both evaluations kept, as at G1.

## Configuration under test

**Plant:** the G1 plant unchanged:
- 240 Hz, 150 velocity / 2 position iterations;
- 10-piece boot;
- passive tissue as approved.

**Actuators:** a parallel actuator constraint per joint, with §14 capacity and activation.

**Controller:** `ctrl/v2_stand.js` at its defaults:
- kξ = 1/3;
- posture "ik";
- κ = 1.5, ζ = 0.7;
- ankle damping 2 N·m·s/rad;
- minimum foot load share 0.10;
- foot-region inset 5 mm;
- hip strategy **off**, arm counter-motion **off**;
- latency and noise **off**.

There is one configuration for every body. All gains derive from each body's own masses, inertias and geometry; there is no per-body tuning.

## Definitions

| term | definition |
|---|---|
| **Push** | A horizontal force on the thorax at its COM for 100 ms, starting at t = 1.0 s; impulse J (N·s). Directions F, B, L, R, FL, FR, BL, BR in the character's frame. Runs last 6 s. |
| **Angular impulse** | A torque on the thorax for 100 ms (N·m·s) about yaw, pitch or roll. |
| **Recovered in place** | All of the following hold: no fall; foot displacement ≤ 20 mm; and by the end of the run the phase has been QUIET continuously for ≥ 0.5 s. QUIET = ξ within 1.5 cm of its target, \|v_COM\| < 3 cm/s, and the requested CoP inside the support region. |
| **Fall** | COM below 70 % of its start height, or any body other than the boots touching the turf. |
| **Step required** | A fall preceded by ξ leaving the support polygon (EXHAUSTED before FALLEN). |
| **Foot displacement** | The largest horizontal displacement of a foot origin (ankle joint centre) from its start. |
| **Body set** | V2-165-62, V2-175-70, V2-REF, V2-190-85, V2-198-92, V2-long-legs, V2-short-legs, V1-matched (G0 variation set). |

## Gate rows

| # | criterion | pass |
|---|---|---|
| **2.1** | **Quiet stance (S0)**: every body, 60 s untouched | All of the following, for every body: <br>(a) no fall; foot displacement ≤ 2 mm; foot tilt ≤ 1°. <br>(b) time-mean COM 2–6 cm anterior of the mid-ankle point (2–60 s); knee flexion 0–15° throughout. <br>(c) every actuator's peak \|τ\| ≤ 50 % of its isometric capacity T_iso·M (1–60 s). <br>(d) zero saturated actuator ticks after 1 s. <br>(e) zero external force or impulse in the ledger; zero authority writes after initialisation. <br>(f) bounded sway: COM horizontal range ≤ 10 mm over 2–60 s. <br>(g) at rest (last 0.5 s): joint separation ≤ 1 mm; no hard-limit excursion > 1.5°; turf penetration ≤ 5 mm; 0 Jolt emergency-stop ticks over the whole run. |
| **2.2a** | **Required small-disturbance envelope (S1–S3)** | **Every body:** pushes of 10 N·s in all 8 directions. **V2-REF and V1-matched:** additionally 5 and 15 N·s in all 8 directions. Each must recover in place with foot displacement ≤ 10 mm and foot tilt ≤ 10°. |
| **2.2b** | **Boundary (S7)**: 5 N·s increments from 5 N·s per direction until the first non-recovery, then two further increments | Measured for V2-REF and V1-matched in 8 directions, and for every other body in F / B / L / R. **Monotone:** no recover → not-recover → recover inversion within the sweep. **Symmetric:** L = R, FL = FR, BL = BR boundaries (identical on the 5 N·s grid, i.e. within 10 %). The boundary is reported in N·s and in body-normalised units (Δv = J/M, m/s), next to V1 C1. Outcomes beyond the boundary are **not** failures. |
| **2.3** | **Capacity integrity** | Over every G2 run, 0 ticks in which an actuator's applied torque exceeds its instantaneous §14 capacity (or its activation-limited envelope) by more than 1e-6 relative. Saturation time per axis reported. |
| **2.4** | **Release** | Every trial that does not recover either falls physically or has a foot displaced by the dynamics, with no hidden support: authority writes 0 and the external-impulse ledger equals the scheduled test disturbance to 1e-9 relative. **Capture-point consistency:** every fall is a "step required" fall, i.e. ξ left the support polygon before the fall. |
| **2.5** | **Controller cost** | Controller (state estimation + balance + leg IK + actuator computation): mean ≤ 0.15 ms per tick per player (spec §20 budget); p99 reported. Physics cost reported separately (TD-1). |
| **S4** | **Angular perturbations** | V2-REF, thorax yaw / pitch / roll at 4 and 8 N·m·s: recovered in place, foot displacement ≤ 10 mm, final trunk orientation within 3° of the reference. |
| **S5** | **Varied initial state** | V2-REF, 10 offsets: knees 12°; hips 10°; COM over the ankles; COM 7 cm ahead; trunk 10° flexed; arms 30° abducted; head 20° flexed; COM 5 cm/s forward / right / back-left. Each: no fall; QUIET from ≤ 3 s to the end; foot displacement ≤ 2 mm; final trunk within 3° of the reference. |
| **S6** | **Body variants** | Covered by 2.1 and 2.2a for every body with the single configuration. The boundaries (2.2b) are reported per body. |
| **F** | **Foot / CoP** | (i) In the CoP sweep test (slow target ramps F / B / L / R / FR / BL inside the usable region, V2-REF): net-CoP per-tick change ≤ 5 mm and CoP tracking error ≤ 5 mm while the command is ≥ 1 cm inside the support. No fall; foot displacement ≤ 2 mm. Piece-set transitions and per-foot CoP changes reported. <br>(ii) In every run of 2.1 / 2.2a / S4 / S5: turf penetration ≤ 10 mm transient and ≤ 5 mm at rest. |
| **D** | **Determinism** | ×3 identical per-tick hashes for the curated set (S0 10 s; push F 15; push R 15; push BL 10; angular pitch 8; offset COM over ankles). Snapshot / restore bit-exact on 3 scenarios. Browser = Node on the curated set. |
| **E** | **Energy / authority** | Every run: authority writes 0; external impulse = the scheduled test impulse. The energy residual ΔE − (W_active + W_external − damping) is ≤ +0.5 J per run, i.e. no unexplained energy source. It contains contact work and implicit-solver dissipation; its values are reported. |
| **R** | **Earlier gates** | G0 8/8; every G1 curated V2-REF hash unchanged, and the full G1 results unchanged. |

## Reported, not gated

- Human-likeness: quiet-stance sway (noiseless, plus a report-only seeded motor-noise test), ankle torque fraction, CoP / COM excursions, recovery times, trunk (hip) contribution, foot loading. Compared with literature ranges, without tuning toward them.
- The development evaluations (`../DECISIONS.md` G2): hip strategy (continuous / bounded), arm counter-motion, kξ alternatives, leg-posture alternatives.
- Pelvis-level 50 ms pushes for V1 comparability (V1 C1 pushed the pelvis COM for 50 ms).
- Latency (50 / 100 / 150 ms) and motor noise: V2 does not specify them numerically.
- Cost per component: physics step, passive layer, controller, actuators, instrumentation.

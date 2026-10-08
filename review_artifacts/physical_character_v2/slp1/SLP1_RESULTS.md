# SLP-1 — Supported Locomotion Prototype 1: RESULTS (STOPPED at calibration)

**Protocol:** `SLP1_PREREGISTRATION.md`, frozen 49785b7, with amendments 1 – 2 recorded before any evidence run (a38e8fa).
**Sources:** `../sources/2026-10-08_user_decision_pivot_supported_locomotion_slp1.md`, `../sources/2026-10-08_user_approval_slp1_with_amendments.md`.
**Status:** DIAGNOSTIC prototype, default off; nothing adopted. TD2C / E2 untouched. CF-1 … CF-6 untouched.

## 0. Short answer

**SLP-1 stopped at its own calibration step (§4.1).**
- No support frequency f ∈ {1, 2, 4} Hz met the architecture criteria A1 – A6 at all three speeds.
- The user stop rule that fired: **"ordinary undisturbed motion requires forces beyond the frozen caps"**.
- **The 21-case disturbance matrix, including the rigid-impactor case, was therefore not run.** No disturbance or collision result exists.

**What happened:**
- **Walk (1.2 m/s):**
  - The support tracked the prescribed path well: 1.197 – 1.203 m/s, pelvis error ≤ 29 mm, α = 1, all 9 scheduled stances with contact.
  - But it was saturated on 68 – 93 % of ticks, chiefly its pelvis pitch torque (82 N·m cap) and roll torque.
  - The body pitched 26 – 60° and the support carried 74 – 88 % of the body weight. Feet were in contact only 7 – 25 % of their scheduled stance time and slid 0.5 – 1.2 m.
  - The run met A1 / A2 only because the support was dragging a collapsed body along the path.
- **Jog (3 m/s) and run (6 m/s):**
  - During the prescribed speed ramp the forward support sat at its cap (275 / 334 N) and the body fell progressively behind the reference.
  - When the capture-point error exceeded the frozen reach R, authority α decayed exactly as designed and the body fell (jog 2.36 – 2.47 s, run 2.86 – 2.88 s, every f).

**Cause, as classified below:**
- **Primarily locomotion authoring.** My driver bypassed the controller's pelvis-orientation control through the stance legs, and its legs add no propulsion. Ordinary locomotion forces therefore fell on the support.
- **Exposes one architecture-level tension.** The support's caps were sized from what foot placement could recover (R, a foot-CoP moment), and the same caps were also asked to carry ordinary locomotion.
- **No evidence of a V2 body limit** (§4).

**Held throughout:**
- Support integrity: no pose or velocity write; caps never exceeded beyond 1.2e-4 N of solver tolerance; S solved by Jolt with the contacts.
- Contacts stayed live; α-driven loss without any state discontinuity.
- Determinism 9 / 9; regression 106 / 106 and component regressions 58 / 58.

**CPU:** SLP-1 as built costs **933 – 952 µs per 240 Hz step (walk), against 892 µs for the autonomous CF-6 walk. No saving** (§6).

## 1. What was run

- **Pre-run derivation** (`scripts/derive.mjs` → `derived.json`; `derive_reach_explore.txt`) from V2-REF's geometry: support height, pitches, R, caps, J*.
- **Two smoke runs** (`evidence/smoke/`, walk D0 f = 1 Hz). Not evidence for any criterion. They exposed amendment 2 and two implementation bugs.
- **Calibration** (`scripts/run_calibration.sh` → `evidence/calibration/`): D0 at walk / jog / run × f = 1 / 2 / 4 Hz, each executed twice. **Every pair has identical end hashes.**
- **CPU** (`scripts/run_cpu.sh` → `cpu/cpu_measurements.txt`): sequential runs, 3 trials each, including the autonomous baseline re-measured in the same session.
- **Regression:**
  - `regression_cf0-6_with_slp1.txt`: probe / CF-1 … CF-5 battery, **106 / 106 end hashes**, CF-3 / 4 / 5 records 18 / 29 / 11 field for field. A CF-6 bracket run also reproduces its evidence hash 235cb44e.
  - `component_regressions_with_slp1.txt`: **58 / 58**.

## 2. Calibration results (§4.1; steady window = t_g + T_ramp + 1 s to the end)

| speed | f (Hz) | end hash (a = b) | A1 speed (m/s) | A2 pelvis err RMS / max (mm) | A3 support saturated | A4 α min / FALLEN | A5 Σ+ (J) / pos-corr (mm) | A6 stances w. contact | verdict |
|---|---|---|---|---|---|---|---|---|---|
| walk | 1 | 8619bbfb | 1.203 | 16.5 / 29.3 | **87.8 %** | 1 / no | **53.1** / 0.44 | 9 / 9 | fails A3, A5 |
| walk | 2 | e3c3908d | 1.199 | 12.2 / 25.9 | **68.2 %** | 1 / no | **18.9** / 0.72 | 9 / 9 | fails A3, A5 |
| walk | 4 | 677f8fcc | 1.197 | 8.4 / 24.7 | **92.8 %** | 1 / no | **13.5** / 1.87 | 9 / 9 | fails A3, A5 |
| jog | 1 | 3841c86c | — | — | — | **0 / 2.47 s** | 2.8 / 0.65 | — | fails A4 (fell in the ramp) |
| jog | 2 | e943d6a2 | — | — | — | **0 / 2.36 s** | 4.8 / 0.65 | — | fails A4 |
| jog | 4 | ecfe93f9 | — | — | — | **0 / 2.38 s** | 3.0 / 0.75 | — | fails A4 |
| run | 1 | 9a5908ef | — | — | — | **0 / 2.86 s** | 4.6 / 1.37 | — | fails A4 |
| run | 2 | ff22c8e4 | — | — | — | **0 / 2.88 s** | 5.7 / 1.63 | — | fails A4 |
| run | 4 | 519b34e7 | — | — | — | **0 / 2.86 s** | 6.4 / 1.34 | — | fails A4 |

Notes:
- For jog and run, the falls happen before the steady window opens (3.0 s / 4.5 s), so A1 – A3 and A6 are not meaningful there.
- In every run: `authorityWrites` = 0; caps never exceeded beyond 1.2e-4 N; state finite; worst per-tick position correction 1.9 mm.

## 3. Diagnosis (read-only analysis of the calibration evidence)

### Walk: the support carries pelvis orientation and most of the body weight

**Support saturation by axis** (steady window):

| f | pitch Tx | roll Tz | forward Fz | lateral Fx |
|---|---|---|---|---|
| 1 Hz | 81 % | 25 % | 9 % | — |
| 2 Hz | 56 % | 29 % | 11 % | 7 % |
| 4 Hz | 79 % | 48 % | 19 % | 25 % |

**Rotational cap.**
- The cap is M·g·(boot half-length) = 81.8 N·m, the moment a stance-foot centre of pressure could make.
- The driver delivers no pelvis-orientation regulation through the stance legs. It replaced `StandController.compute`, including its task-space pelvis wrench, with joint-space posture gains (κ = 1.5).
- So the swing-leg and trunk reaction torques fall on S's rotational axes, which saturate.
- The pelvis then pitches 26 – 60°. The leg joint targets, computed for an upright reference pelvis, put the feet in the wrong places, the planted-pose captures go wrong, and the IK targets become unreachable (residual up to 1.9 m).

**Consequences, all authoring metrics:**
- legs carry only 12 – 26 % of body weight;
- contact in 7 – 25 % of scheduled stance time;
- planted-foot slip 0.5 – 1.2 m;
- leg joints 10 – 12° beyond their anatomical hard limits (inside the engine margin);
- commanded Δτ0 up to 38,556 N·m (IK target jumps × gains).

The speed and pelvis tracking (A1 / A2) pass because S drags the collapsed body along the path. **This is not walking.**

**A5 energy.**
- The positive closure Σ+ at 60 Hz is 46.4 / 6.4 / 4.7 J (per tick 53.1 / 18.9 / 13.5 J).
- It is concentrated in support-saturated ticks (40.6 / 6.0 / 4.6 J of it), and at f = 1 also in ticks with legs at or through their hard limits (32.4 J).
- There is no instability: state finite, position corrections ≤ 1.9 mm, energy not growing.
- Attribution between the support-work estimate (F·v at mid-step under saturation) and engine-stop contact is **unresolved**.

### Jog and run: the support is the only propulsion, and its cap is below the ramp's demand

- The prescribed min-jerk ramps peak at 1.875·v / T_ramp = 3.75 m/s², so M·a = 296 N.
- The frozen horizontal caps F_h = M·ω²·R are 275 N (jog) and 334 N (run).
- The authored stance feed-forward puts body weight through the COM. It brakes at every touchdown (horizontal component ≈ M·g·Δx / h with the foot ahead) and never propels.
- So the forward support sits at its cap from about 1.0 s (jog) and 1.7 s (run), and the body falls behind: 0.04 → 0.30 m (jog by 1.6 s, run by 2.4 s).
- When ‖ξ − ξ_ref‖ passed R (jog 1.45 s, run 2.35 s), α decayed continuously (§2.2). The articulated body, now unsupported, kept its own motion and fell (COM below 70 %).

**Loss continuity (§6.5, applied to these losses):**
- no write; caps never exceeded; α continuous;
- the largest COM velocity change per 4 ticks within ± 0.3 s of α < 0.05 was 0.27 m/s (jog) and 1.65 m/s (run). The run value coincides with the body striking the turf (FALLEN 2.858 s, α < 0.05 at 2.90 s): a physical impact, not a support-induced jump.

## 4. Classification

| finding | class |
|---|---|
| No pelvis-orientation control through the stance legs (driver bypassed the controller's task-space pelvis wrench) → S's rotational caps saturate → posture collapse | **Locomotion authoring** (driver design; frozen §2.3.5) |
| Legs give no propulsion; the stance feed-forward brakes at every touchdown → S is the sole propulsion → horizontal cap saturates in the ramp | **Locomotion authoring** (driver design) |
| Caps derived from foot-placement recoverability (R, CoP moment) are also asked to carry ordinary locomotion forces → saturation in ordinary motion | **Architecture-level tension:** the same caps set both the ordinary-locomotion authority and the recoverability bound. It is decisive only while the legs do not produce ordinary locomotion forces. |
| Constant-height reference gait with the hard-box IK at its reach boundary (touchdown at the edge by construction of dh) | Authoring (reference gait), contributing |
| V2 body: actuator saturation in walk 2.3 – 2.5 axes per tick; ≈ 0 in jog / run before the fall; hard-limit excursions only after the collapse; no non-finite state | **No V2 body limit** shown |
| Support integrity (Amendment 2), loss without state reset (Amendment 3), determinism, default-off regression | **Held** |

**The stop is SLP-1's preregistered outcome, not a tuning opportunity.** No cap, gain, criterion or driver element was changed after the calibration results.

## 5. What SLP-1 did and did not show

**Shown:**
- The support mechanism itself can be built and solved inside Jolt with no state writes, never exceeding its caps.
- It is deterministic and leaves every existing path bit-identical.
- A finite, compliant support can hold a prescribed path at 1.2 m/s, although with this driver the body collapses underneath it.
- The recoverability authority releases support from the resulting physical state, with no impulse threshold, and the articulated body falls carrying its own momentum. Seen in jog / run, in undisturbed runs.

**Not shown:**
- Sustained clean supported locomotion at any speed.
- Any disturbance response: the retained / displaced / disrupted / lost progression; torso vs swing-leg vs stance-leg at matched impulse.
- That a genuine collision propagates through the articulated body (the rigid-impactor case).
- Any computational advantage.

## 6. CPU (§4.3; Apple M4, Node 22; µs per 240 Hz physics step, median of 3 sequential trials)

| component | autonomous CF-6 walk (0.1 m/s) | SLP-1 walk f = 1 / 2 / 4 | SLP-1 jog f = 2 (fell at 2.36 s) | SLP-1 run f = 2 (fell at 2.88 s) | SLP-1 walk f = 2 lean (no probes) |
|---|---|---|---|---|---|
| Jolt step | 337.9 | 292.2 / 293.5 / 290.3 | 322.7 | 334.4 | 293.1 |
| passive tissue (plan + apply) | 202.4 | 228.8 / 225.0 / 223.8 | 251.9 | 249.4 | 221.1 |
| controller / driver | 182.2 | 281.1 / 299.1 / 300.9 | 116.3 | 116.1 | 295.3 |
| support targets | — | 1.0 / 1.1 / 1.0 | 2.3 | 2.2 | 0.9 |
| actuators | 18.8 | 22.2 / 21.5 / 21.8 | 26.4 | 26.8 | 21.4 |
| probes + measurement | 130.2 | 107.2 / 112.9 / 108.3 | 125.5 | 125.8 | 76.8 |
| **total** | **892.3** | **933.2 / 951.9 / 945.2** | 839.2 | 855.7 | 909.0 |

**Reading:**
- With this driver there is **no saving**. The driver costs more than the autonomous controller.
  - Its two bounded leg-IK solves per tick (hard box, up to 30 iterations) run to their iteration limit on the unreachable targets of the collapsed gait.
  - Once FALLEN (posture hold, no IK), the driver costs 116 µs.
- The support constraint itself costs ≈ 1 – 2 µs per tick, and its effect on the Jolt step is not measurable here.
- Jolt plus passive tissue (≈ 520 – 580 µs) remain the floor, as predicted in the design.
- The ≈ 10 – 20 % saving estimated in the design is **not demonstrated**. It would need a driver whose IK converges (or is cheaper), and was never the main cost lever (Amendment 4: no optimisation attempted).

## 7. Amendments and corrections (all before any evidence run, disclosed)

1. **Amendment 1:** shank disturbance point. Mesh-edge crossings were added; there is no vertex in the frozen band.
2. **Amendment 2:** leg IK at the reference pelvis pose, reverting freeze-time change 5.
   - Smoke run 0: with the measured pelvis, the legs never followed the support height.
   - Pelvis 6 – 9 cm high, support at its down-cap, fall at 2.21 s.
3. **Implementation fixes:**
   - `pitched()` near-zero-angle sign test (crash);
   - an SLPSim `_sense` stub for the lean CPU mode only (G2's sensing hook assumed the probes; the driver never reads it).
   - Verified: the calibration walk f = 1 hash 8619bbfb reproduces after the stub.

## 8. Decision needed (nothing started)

SLP-1 stopped as instructed. Options, for the user:

- **A — authoring fix inside the approved architecture (SLP-1b; my recommendation).** The driver gives the legs the ordinary locomotion forces:
  - pelvis orientation through the stance legs (the existing controller's task-space pelvis wrench, reused);
  - propulsion consistent with the trajectory's acceleration in the stance feed-forward;
  - S then only corrects, within the unchanged caps.
  - New preregistration amendment, then re-run calibration and the matrix.
- **B — architecture change:** decouple S's ordinary-locomotion authority from the recoverability bound.
  - Caps sized to the undisturbed reference motion's demand; loss of support still decided by m̂ with R from capture reach.
  - Simpler, but S would then do more than foot placement could.
- **C — A and B together.**
- Either way, the reference gait (constant height, touchdown at the reach boundary) is LOC-1 territory and was not changed here.

## Files

- `SLP1_PREREGISTRATION.md` (frozen, amendments §10); `SLP1_DESIGN_PREREGISTRATION_DRAFT.md` (superseded).
- `gait_inputs.mjs`, `derived.json`, `derive_reach_explore.txt`.
- `scripts/`: `derive.mjs`, `reach_explore.mjs`, `run_calibration.sh`, `run_cpu.sh`.
- `evidence/smoke/` (2 runs), `evidence/calibration/` (18 runs).
- `cpu/cpu_measurements.txt`; `baseline/` (autonomous CPU profile tool and design-stage baseline).
- `regression_cf0-6_with_slp1.txt`, `component_regressions_with_slp1.txt`.
- Code, new files only:
  - `sandbox/visual/physchar2/ctrl/v2_supported.js`;
  - `sandbox/visual/physchar2/gates/v2_slp.js`;
  - `sandbox/visual/physchar2/tools/slp1_probe.mjs`.

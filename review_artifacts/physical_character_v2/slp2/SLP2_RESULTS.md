# SLP-2 — RESULTS: STOPPED at calibration (user stop rules); the 21-case matrix and the impactor were not run

**Protocol:** `SLP2_PREREGISTRATION.md`, frozen 03455b8. **No amendments.**
**Sources:** `../sources/2026-10-09_user_decision_slp2_separation_design.md`, `../sources/2026-10-09_user_approval_slp2.md`.
**Production contract (§0 of the preregistration):** SLP-2 is a calibration experiment. D is report-only, never fed back into T. It is not the production gameplay contract.

## 0. Short answer

**A works exactly as designed. SLP-2 stops because the physical legs' contact forces, which A by decision does not compensate, use more than B's preregistered budget in ordinary undisturbed locomotion.** Two of your stop rules fired at every speed and every spring frequency:
- "ordinary undisturbed locomotion consumes more than the preregistered support budget" (A9);
- "B must carry ordinary locomotion again" (A10).

**A, the uniform whole-body field:**
- Over the ramp and steady window it delivered **exactly the authoritative momentum** in every run: J_A = 94.69 / 236.66 – 236.73 / 473.46 N·s against M·v = 94.69 / 236.73 / 473.46 N·s.
- It read no state, applied no torque about the COM, wrote nothing, and cost 3 – 7 µs per step (including B's target update).
- While the legs behaved, B was small: run, first four stances, |J_B| ≤ 14 N·s per step; jog, first stance, 13.5 N·s.

**The legs (C):**
- **Net horizontal braking.** Over the same windows the legs braked by **−202 to −369 N·s net** (−221 / −241 / −348 N·s at f = 1 Hz for walk / jog / run), and B pushed back by about the same amount (+216 / +275 / +343 N·s).
- **Two components:**
  - impulsive braking at each touchdown (ground forward force spikes to −400 … −670 N in walk, −830 … −1,100 N in jog, up to −1,900 N in run);
  - sustained stance braking that grows step by step as the body lags its reference. The COM forward-speed deficit against R grows −0.03 → −0.52 m/s over five run steps.
- **The feedback loop:** a lagging body meets each foothold early, so its through-COM ground force brakes harder, which deepens the lag. B's spring and damper absorb this until B's forward axis reaches its cap (275 – 334 N). Its push at the pelvis against foot braking then pitches the body past the 81.8 N·m pitch cap, and the gait collapses.
- **Vertical.** In jog and run the legs do not launch the body for flight; B carries 300 – 650 N vertically in every flight.

**Calibration** (each configuration twice, all pairs identical):
- walk falls at 2.52 / 7.49 s, or (4 Hz) stays up only with B 100 % saturated and the legs carrying 9 % of body weight;
- jog falls at 2.38 – 2.60 s;
- run falls at 2.85 – 2.93 s.

**Classification:**
- The **A / B separation is validated for translation**: A carried 100 % of the authoritative momentum, as intended.
- The failure is **C's contact realisation** (locomotion authoring): touchdown braking, stance braking under lag, and flight launch. Under decision 3 these are real physical disturbances, they consume B's finite budget, and in ordinary motion they exceed it.
- **No V2 body limit.**

## 1. What ran

- **Preservation:** SLP-1 (version "1") and SLP-1b (version "1b") calibration hashes reproduced with the SLP-2 code present (walk / jog / run f1: 8619bbfb / 3841c86c / 9a5908ef and cfe3d864 / 78645f75 / a6bcd4a2).
- **Smoke:** one walk D0 f1 run (`evidence/smoke/`), identical to the calibration run. No code change followed.
- **Calibration** (`scripts/run_calibration.sh` → `evidence/calibration/`): D0 × f ∈ {1, 2, 4} Hz × walk / jog / run, each twice. **9 / 9 identical pairs.**
- **Analysis** (`scripts/analyse_calibration.py`): `analysis/calibration_summary.{json,txt}` (A9 / A10, per-step impulses, failure chain) and `analysis/SLP2_CALIBRATION_TIMESERIES.png`.
- A first read-only damping diagnostic was discarded before use. It equated requested actuator terms with dissipated power, which is invalid: the requested terms include the implicit position term and are clipped by capacity. It is not used here.
- **CPU:** `cpu_measurements.txt` (sequential).
- **The matrix was not run** (stop rule).

## 2. Calibration (§4.2)

**A9: mean |B axis| / cap**

| run | Fx | Fy | Fz | Tx (pitch) | Ty | Tz (roll) |
|---|---|---|---|---|---|---|
| walk f1 | 0.09 | **0.63** | **0.41** | **0.93** | 0.09 | 0.13 |
| walk f2 | **0.41** | **0.60** | **0.53** | **0.94** | **0.58** | **0.72** |
| walk f4 | **0.50** | **0.62** | **0.65** | **1.00** | **0.56** | **0.85** |
| jog f1 | (post-fall) | | | | | |
| jog f2 | 0.09 | **0.61** | **0.64** | **0.82** | 0.04 | 0.08 |
| jog f4 | 0.19 | **0.80** | **0.75** | **0.94** | 0.11 | **0.40** |
| run f1 | 0.09 | **0.64** | **0.38** | **1.00** | 0.13 | 0.19 |
| run f2 | 0.12 | **0.74** | **0.49** | **1.00** | 0.05 | 0.08 |
| run f4 | 0.12 | **0.94** | **0.54** | **1.00** | 0.03 | 0.07 |

**Other criteria:**

| run | A10: J_A / J_B / J_legs (N·s), M·v | A1 speed | A3 B saturated | A4 α min / FALLEN | A6 stances | A7 legs' share of body weight | A5 Σ+ (J) |
|---|---|---|---|---|---|---|---|
| walk f1 | 94.7 / **216.2** / **−221.3**, 94.7 | 1.190 | **81 %** | 1 / **2.52 s** | **2 / 4** | **0.06** | **7.3** |
| walk f2 | 94.7 / **235.1** / **−201.8** | 1.194 | **94 %** | 1 / **7.49 s** | **8 / 9** | **0.09** | **92.4** |
| walk f4 | 94.7 / **344.2** / **−330.1** | 1.198 | **100 %** | 1 / no | **7 / 9** | **0.09** | **325.3** |
| jog f1 | 236.7 / **275.4** / **−240.6**, 236.7 | (post-fall) | 14 % | **0 / 2.38 s** | **2 / 4** | — | 4.9 |
| jog f2 | 236.7 / **394.9** / **−349.1** | 2.964 | **97 %** | **0.84 / 2.48 s** | 4 / 4 | **0.11** | **12.8** |
| jog f4 | 236.7 / **369.4** / **−369.0** | 2.962 | **100 %** | 0.98 / **2.60 s** | 5 / 5 | **0.15** | **36.3** |
| run f1 | 473.5 / **342.5** / **−348.0**, 473.5 | 6.015 | **100 %** | 1 / **2.85 s** | 1 / 1 | **0.10** | **22.2** |
| run f2 | 473.5 / **347.9** / **−346.3** | 6.017 | **100 %** | 1 / **2.90 s** | 1 / 1 | **0.08** | **24.8** |
| run f4 | 473.5 / **359.1** / **−358.6** | 6.038 | **100 %** | 1 / **2.93 s** | 1 / 1 | **0.09** | **65.9** |

The jog / run steady windows (from 3.0 / 4.5 s) open after the falls, so their A1 / A7 / A9 entries describe a fallen or dragged body. The decisive evidence is pre-collapse (§3).

**Integrity in every run:** `authorityWrites` = 0; B's caps were never exceeded beyond solver tolerance; state finite.

## 3. Where it breaks (per scheduled step, f = 1 Hz; `calibration_summary.txt`)

**Walk:**

| step | J_A | J_B | J_legs (first 60 ms) | peak leg F_y | max \|pitch\| | min Dv_z |
|---|---|---|---|---|---|---|
| start (R stance) | 28.4 | 0.4 | +2.6 | — | 1.9° | −0.05 |
| L stance 0.90 – 1.45 s | 66.1 | **120.8** | **−123.0** (−1.4) | 1,332 N | **23.5°** | −0.21 |

The braking is spread over the L stance: the foot is ahead of the lagging COM in single support. The forward cap is reached at 1.12 s, pitch passes 5° at 1.17 s, FALLEN at 2.52 s.

**Jog:**

| step | J_A | J_B | J_legs (first 60 ms) | max \|pitch\| | min Dv_z |
|---|---|---|---|---|---|
| start | 39.9 | 1.9 | +5.8 | 1.7° | −0.07 |
| L stance | 95.0 | 13.5 | −16.0 (−9.5) | 1.8° | −0.16 |
| R stance | 84.6 | 54.4 | −70.4 (−31.6) | 5.9° | −0.39 |
| L stance | 17.1 | 92.3 | −100.6 (−3.6) | 51.7° | −0.89 |

**Run:**

| step | J_A | J_B | J_legs (first 60 ms) | max \|pitch\| | min Dv_z |
|---|---|---|---|---|---|
| start | 14.4 | 9.6 | +4.4 | 9.8° | −0.05 |
| L | 41.4 | −10.3 | +2.3 | 11.5° | −0.03 |
| R | 65.4 | −14.2 | +16.9 | 11.4° | −0.08 |
| L | 87.9 | 8.6 | −9.7 (−8.4) | 6.8° | −0.17 |
| R | 92.7 | 43.4 | −39.0 (−21.5) | 3.4° | −0.25 |
| L | 81.4 | 86.8 | **−142.4** (−34.1) | 32° | **−0.52** |

The run forward cap is reached at 2.17 s; FALLEN at 2.85 s.

**Reading:**
- For the first one (jog) to four (run) stances the separation behaves as designed: A carries the acceleration, legs ≈ 0 net, B small.
- Then the legs' braking grows step by step together with the speed deficit. That is the inverted-pendulum lag feedback, seeded by touchdown braking impulses (−8 to −34 N·s per touchdown in jog / run).
- B absorbs it until its forward axis caps. The capped push at the pelvis against foot braking then saturates the pitch torque and the posture collapses.
- In parallel, flights in jog / run are carried by B vertically (300 – 650 N; figure, bottom row).

## 4. Classification

| finding | class |
|---|---|
| A delivered exactly M·Δv_T: state-independent, no torque, no writes, 3 – 7 µs per step | **A validated** (decision 1) |
| B never exceeded its caps, never read contacts, never wrote state; α law continuous | **B integrity held** (decision 2) |
| Touchdown braking impulses; stance braking that grows with the lag (positive feedback); no flight launch in jog / run | **C contact realisation (locomotion authoring).** Under decision 3 these are physical disturbances on B's budget. In ordinary motion they exceed it: **stop** |
| V2 body: hard-limit and actuator issues only during the collapse | **no V2 body limit** |
| D report-only, T untouched | held (decision 4) |

**What this means architecturally:**
- With A carrying translation, the remaining coupling between the authoritative motion and the physical body is the foot – ground contact.
- Under decision 3 (A never compensates leg forces) and a recovery-sized B, ordinary locomotion is only as good as C's contact realisation. The swing foot must arrive without net braking. The stance leg must neither resist nor push the authoritative motion. Flight gaits must actually launch the body.
- **None of this is a reason to change A or B.** It is the gating requirement on C.

## 5. Disturbance records requested for every disturbance

Not produced: the matrix did not run (stop rule). The recording is implemented and verified on the calibration runs (`slp2` block of every evidence file): A and B forces separately, D series, momentum, contact windows, post-disturbance margins and slip. It is ready for any later run.

## 6. CPU (sequential, Apple M4; µs per 240 Hz step, median of 3; runs end 2 s after FALLEN)

| | autonomous CF-6 walk | SLP-2 walk f1 / f4 | SLP-2 jog f1 | SLP-2 run f1 |
|---|---|---|---|---|
| total | 892.3 | 839.4 / 943.9 | 839.4 | 818.9 |
| Jolt | 337.9 | 301.7 / 291.1 | 303.9 | 305.4 |
| passive | 202.4 | 245.6 / 220.2 | 249.9 | 243.5 |
| driver | 182.2 | 133.7 / 297.9 | 123.2 | 114.1 |
| A + B targets | — | 4.3 / 3.0 | 6.2 | 7.1 |

**Reading:**
- A itself is negligible.
- The driver costs 114 – 134 µs when the run is mostly fallen (posture hold) and ≈ 300 µs when it keeps solving IK on the collapsed body.
- No optimisation was attempted (instruction). The physics floor is unchanged.

## 7. Options for your decision (nothing started)

1. **C contact quality (LOC-1-type work, inside the approved architecture).** Make the legs' contacts consistent with the authoritative motion:
   - swing-foot touchdown matched to the ground (no horizontal relative velocity at contact);
   - stance-leg joint motion that follows the authoritative sweep (velocity feed-forward also for stance legs);
   - realised flight launch for jog / run;
   - re-run the SLP-2 calibration unchanged.
2. **A restricted, explicit refinement of decision 3,** for example only for unobstructed runners in a cheap tier where foot contacts are presentation-only. This is your decision; it touches the "contacts remain physical" principle.
3. Accept the evidence as the end of the SLP series and move to the production integration contract (§0) with C quality as a known prerequisite.

## Files

- `SLP2_PREREGISTRATION.md` (frozen 03455b8), `SLP2_ARCHITECTURE_DRAFT.md` (approved), this file.
- `evidence/smoke/` (1), `evidence/calibration/` (18).
- `analysis/calibration_summary.{json,txt}`, `analysis/SLP2_CALIBRATION_TIMESERIES.png`.
- `cpu_measurements.txt`.
- `scripts/run_calibration.sh`, `scripts/analyse_calibration.py`.
- Code (version "2" paths only):
  - `ctrl/v2_supported.js`, `gates/v2_slp.js` (A field, D / momentum recording);
  - `tools/slp1_probe.mjs` (A9 / A10, disturbance records).

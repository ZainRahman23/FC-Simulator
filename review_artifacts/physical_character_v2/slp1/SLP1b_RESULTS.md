# SLP-1b — RESULTS: STOPPED at calibration (the user's stop condition); matrix not run

**Protocol:** `SLP1b_AMENDMENT.md` (frozen 1137244) on `SLP1_PREREGISTRATION.md` (49785b7, amendments 1 – 2). **No amendment to SLP-1b.**

**Decision source:** `../sources/2026-10-09_user_decision_slp1b_option_a.md`.

**Preserved:** SLP-1 (627d935) is unchanged. Its code path (version "1") still reproduces its calibration end hashes (walk / jog / run f1: 8619bbfb / 3841c86c / 9a5908ef, verified with the 1b code present).

## 0. Short answer

**With the legs given pelvis orientation, body support and propulsion, no support frequency (1 / 2 / 4 Hz) meets A1 – A8 at any of 1.2 / 3 / 6 m/s within the unchanged caps.** Per your instruction, SLP-1b stops here; the disturbance matrix and the impactor case were not run.

| speed | f = 1 Hz | f = 2 Hz | f = 4 Hz |
|---|---|---|---|
| walk 1.2 m/s | FALLEN 2.42 s | FALLEN 6.91 s (support 99 % saturated) | no fall, but support 100 % saturated; legs carry 9 % of body weight; support supplies 97 % of positive forward impulse |
| jog 3 m/s | FALLEN 2.08 s | FALLEN 2.13 s | FALLEN 2.17 s |
| run 6 m/s | FALLEN 2.61 s | FALLEN 2.73 s | FALLEN 2.70 s |

Every configuration was executed twice; every pair has identical end hashes.

**Why, in one paragraph:**
- **What works.** The restored mechanisms work where they can. From gait start to the first forward-cap saturation:
  - the legs carry 78 – 123 % of body weight (support vertical ≈ 0 or slightly negative);
  - the stance legs hold pelvis pitch within 1.5° and roll within 3.4° (walk / jog);
  - the path is tracked within 3.5 cm.
- **What does not: forward propulsion.**
  - The legs' ground force passes through the COM (the controller's own inverse statics), so a leg propels only when the COM leads its contact point.
  - The support's job — holding the body on the prescribed path — suppresses exactly that lead.
  - In the first 0.4 – 0.6 s of the speed ramp the support therefore supplies 52 – 88 % of the forward impulse; the body still lags (walk 0.45 vs 0.82 m/s, jog 0.08 vs 0.41 m/s at the first forward-cap saturation).
- **The lag then feeds itself.**
  - The next scheduled foothold lies ahead of the lagging COM, so touchdown brakes (ground forward force down to −550 N in walk) instead of propelling.
  - The support's forward force reaches its cap (275 – 334 N) 0.4 – 1.0 s after gait start.
  - That capped push at the pelvis, against braking at the feet, pitches the body forward. Pitch passes 5° 0.45 – 0.93 s after gait start, beyond what the 81.8 N·m pitch cap and the stance hips can hold; the legs unload and the support ends up carrying the body.
- **Vertically for jog / run:**
  - impact peaks reach 1,500 – 1,900 N (jog; scheduled peak 1,670 N) and 1,300 – 1,800 N (run; scheduled 2,533 N), but the load decays through the stance;
  - per step the legs deliver 65 – 109 % of the scheduled vertical impulse in the first steps, falling to 14 – 60 % before the fall;
  - the support carries the shortfall in every flight (600 – 1,000 N).
- **Underlying property.** An inverted-pendulum body without balance feedback cannot correct its own forward-momentum error. With autonomous balance removed (no foot-placement feedback, by your rule), that correction falls entirely to the support. With these caps, ordinary start-up and touchdown errors exceed what the support can supply within the first 1 – 1.5 s.

**Answer to your conditional question:** the evidence supports separating the support's ordinary-stabilisation authority from the recoverability cap (see §5). It also shows a smaller, specific gap: start-up propulsion and the trajectory-consistent COM lead (§5, item 2).

## 1. What ran

- **Smoke runs** (`evidence/smoke_1b/`, walk / jog / run D0 f1): implementation checks only. No code change followed them; they are identical to the calibration runs at f1.
- **Calibration** (`scripts/run_calibration_1b.sh` → `evidence/calibration_1b/`): D0 at walk / jog / run × f = 1 / 2 / 4 Hz, driver version "1b", each executed twice. **9 / 9 identical pairs.**
- **Read-only analyses:**
  - `scripts/analyse_1b.py` → `analysis_1b/per_step.{json,txt}`: per-step leg vs support impulses and the failure chain;
  - `scripts/summary_1b.py` → `analysis_1b/summary_windows.{json,txt}`: windows W1 / W2;
  - `analysis_1b/first_liftoff.txt`: first single support;
  - `scripts/plot_1b_cycles.py` → `analysis_1b/SLP1b_TIMESERIES.png`.
- **CPU** (`cpu/cpu_measurements_1b.txt`), sequential.

## 2. The requested calibration report

There is **no steady window**: every run has failed or collapsed within ≈ 2 s of gait start. So the table gives:
- **W1** = [gait start, first forward-cap saturation), where the separation existed if it existed at all;
- **W2** = [gait start, FALLEN or end].

Values are for **f = 1 Hz** (the softest); all f are in `summary_windows.txt`.

| quantity | walk W1 (0.50 – 1.12 s) | walk W2 (→ 2.42 s) | jog W1 (0.50 – 0.93 s) | jog W2 (→ 2.08 s) | run W1 (0.50 – 1.53 s) | run W2 (→ 2.61 s) |
|---|---|---|---|---|---|---|
| achieved COM forward speed at window end vs v_ref (m/s) | 0.45 vs 0.82 | 1.58 vs 1.20 (falling) | 0.08 vs 0.41 | 2.62 vs 3.00 (falling) | 0.90 vs 1.31 | 4.07 vs 5.02 (falling) |
| body weight: legs / support (mean vertical force) | **legs 1.03** (839 N / −28 N) | legs 0.79 | **legs 0.78** | legs 0.61 | **legs 0.79** | legs 0.68 |
| forward impulse, positive parts: support share | 0.86 | 0.90 | 0.72 | 0.83 | 0.52 | 0.76 |
| forward impulse, net: ground / support (N·s) | −16 / +57 | −125 / +253 | +1 / +14 | −51 / +248 | +54 / +18 | +16 / +307 |
| support saturated (% of ticks) | 8 | 66 | 15 | 66 | 55 | 74 |
| pelvis pitch range (°) | −0.1 … 1.5 | … 83 | −0.6 … 1.1 | … 95 | −9.6 … 6.3 | … 73 |
| pelvis roll range (°) | −3.4 … −0.1 | −6.5 … 8.7 | −2.8 … −0.1 | −7.8 … 16.2 | −2.8 … 10.9 | −2.8 … 10.9 |
| pelvis error, max: vs authoritative / vs scheduled ref (m) | 0.029 / 0.035 | 0.18 / 0.17 | 0.018 / 0.021 | 0.48 / 0.48 | 0.031 / 0.030 | 0.59 / 0.59 |
| stance-contact fraction (20 N, complete scheduled stances) | — (none complete) | 0.67 | — | 0.60 | 0.94 | 0.98 |
| actuator saturation (axes per tick, mean) | 1.2 | 2.5 | 1.2 | 3.5 | 2.5 | 4.3 |
| leg hard-limit margin, min (°) | +12.4 | −8.0 | +11.7 | −12.6 | −0.6 | −6.0 |

**Other quantities:**
- **Foot slip.** Planted-foot slip is defined over steady stances, and there are none. In W2 the feet slide during the collapse; see each evidence file's `authoring.plantedSlipMm`.
- **CPU:** §4.

**Physically locomotion, or the support dragging the body?**
- **In W1, partly locomotion.** The legs genuinely carry the body weight and hold the pelvis, but the support supplies most of the propulsion.
- **In W2, the support drags the body.** By the end the support is saturated most of the time and carries 21 – 39 % of the weight; it supplies 76 – 90 % of the positive forward impulse; the pelvis pitches 73 – 95°.
- **Walk at 4 Hz never falls only because the support carries the collapsed body:** legs 9 % of the weight, support 100 % saturated.

**Time series:** `analysis_1b/SLP1b_TIMESERIES.png`. For each speed (f = 1 Hz) it shows support force (3 axes), ground vertical force per foot vs support vertical, ground vs support forward force, and pelvis pitch / roll with the forward deviation from the scheduled reference, from gait start to the fall, with touchdown / liftoff marks. It shows the separation directly:
- vertical support ≈ 0 while the legs carry the walk;
- support vertical spikes of 600 – 1,000 N in jog / run flights;
- forward support at its cap opposite to ground braking just before the pitch rises.

## 3. Failure chain (all f; `per_step.txt`)

| | first pitch / roll cap | first forward cap | pitch > 5° | α < 0.99 | FALLEN |
|---|---|---|---|---|---|
| walk 1 / 2 / 4 Hz | 0.517 s (first liftoff) | 1.12 / 1.10 / 1.03 | 1.20 | never | 2.42 / 6.91 / — |
| jog 1 / 2 / 4 Hz | 0.517 | 0.93 / 0.92 / 0.92 | 0.95 / 1.43 / 1.30 | 1.58 | 2.08 / 2.13 / 2.17 |
| run 1 / 2 / 4 Hz | 0.517 | 1.53 / 1.08 / 1.08 | 0.95 / 1.22 / 1.25 | 2.20 / 2.35 / 2.27 | 2.61 / 2.73 / 2.70 |

**First single support** (`first_liftoff.txt`):
- the support holds the COM 8.3 – 9.8 cm medial of the stance foot (≈ W0 / 2) with 48 – 67 N of lateral force;
- roll / pitch torque means are 16 – 33 / 26 – 49 N·m, at the 81.8 N·m cap for 12 – 41 % of that phase;
- pelvis roll stays within 3.4°.
- The single-support toppling moment of a COM held off the stance foot (M·g·W0 / 2 = 67.5 N·m) is already of the order of the rotational cap.
- It is held, at a cost, and is not where the collapse starts.

**Then:** the forward cap, braking at touchdown, pitch, leg unloading, collapse.
- In walk, α never fell below 0.99: the DCM error stayed below R because the support was dragging the body along the path.
- The falls are posture collapses under a support that is still fully on.

## 4. CPU (sequential, Apple M4; µs per 240 Hz step, median of 3; runs end 2 s after FALLEN)

| | autonomous CF-6 walk | SLP-1b walk f = 1 / 2 / 4 | SLP-1b jog f = 1 | SLP-1b run f = 1 |
|---|---|---|---|---|
| total | 892.3 | 827.2 / 915.6 / 951.0 | 844.5 | 840.2 |
| Jolt / passive | 337.9 / 202.4 | 288 – 301 / 227 – 247 | 309.5 / 248.5 | 315.3 / 246.0 |
| controller or driver | 182.2 | 128.1 / 262.2 / 304.4 | 130.1 | 127.5 |

**Reading:**
- The driver costs ≈ 128 µs when it spends most of the run in FALLEN posture hold (no IK), and 262 – 304 µs while its two bounded-IK solves run on unreachable targets.
- There is still **no demonstrated saving**. The physics (Jolt + passive ≈ 520 – 560 µs) is the floor, as before.

## 5. Classification and what the evidence says about separating the caps

| finding | class |
|---|---|
| Restored leg mechanisms deliver body support and pelvis orientation while the motion is on schedule (W1) | works (authoring adequate here) |
| Leg propulsion requires the COM to lead the contact point; the support holding the authoritative path suppresses that lead; start-up and touchdown momentum errors then grow (LIPM positive feedback) and only the support can correct them | **Architecture:** with balance removed, the support is the sole momentum corrector |
| The correction needed in ordinary start-up / touchdown exceeds the frozen forward cap (275 – 334 N) within 0.4 – 1.0 s; the capped push at the pelvis against braking at the feet then exceeds the 81.8 N·m pitch cap | **Architecture:** caps derived from foot-placement recoverability are too small for ordinary stabilisation |
| Jog / run stance load decays after impact (legs deliver 65 – 109 % of the scheduled vertical impulse per step at first, then 14 – 60 %); support carries flights | Authoring (open-loop stance-force realisation) |
| B4 detrends δ to zero step-mean, removing the sustained COM lead an accelerating pendulum needs | Authoring (frozen design choice), contributing |
| V2 body: actuator saturation low in W1 (1.2 – 2.5 axes per tick); hard-limit violations only during collapse | **No V2 body limit** |
| Support integrity (no writes; caps respected), determinism, SLP-1 preservation | held |

**What it means for your next decision:**
1. **Separation is warranted by evidence.** Without autonomous balance, the support is the only thing that can correct forward-momentum and posture errors in ordinary motion. Caps sized from what one step or a foot centre of pressure could recover are exceeded in ordinary start-up within about a second, at every speed and every spring frequency, even with the legs carrying the weight. A support whose ordinary-stabilisation caps are sized to undisturbed demand, with loss of support still decided by the recoverability margin (option B), is the direct test.
2. **A smaller authoring gap would remain either way:**
   - start-up propulsion (the first stance cannot be shifted back);
   - the absence of a trajectory-consistent COM lead during acceleration.
   - A driver that schedules the COM lead physically required by the commanded acceleration is not balance feedback: it is a function of the authoritative trajectory only. It would reduce what the support must do.
3. Disturbance behaviour, the retained / lost progression and impactor propagation remain **untested**.

## 6. Integrity, determinism, preservation

- `authorityWrites` = 0 and caps were never exceeded beyond solver tolerance in every run (per-run `architecture.A5`).
- Deterministic: 9 / 9 calibration pairs.
- SLP-1 code path: the three calibration hashes reproduce with the 1b code present.
- Only SLP files changed: `ctrl/v2_supported.js`, `gates/v2_slp.js`, `tools/slp1_probe.mjs`. No other V2 file. The probe / CF battery and component regressions, verified at 627d935, are unaffected by construction.

## Files

- `SLP1b_AMENDMENT.md` (frozen 1137244), this file.
- `evidence/smoke_1b/` (3), `evidence/calibration_1b/` (18).
- `analysis_1b/`: `per_step.*`, `summary_windows.*`, `first_liftoff.txt`, `SLP1b_TIMESERIES.png`.
- `cpu/cpu_measurements_1b.txt`.
- `scripts/`: `run_calibration_1b.sh`, `analyse_1b.py`, `summary_1b.py`, `plot_1b_cycles.py`.

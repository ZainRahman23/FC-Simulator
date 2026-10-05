# E2 timing and load assumptions (measured; planning-only)

**Authority:** audit-correction instruction 2026-10-05 / 06 (`../../sources/2026-10-05_user_instruction_e2_audit_corrections.md` §1, §10).

Every value comes from Touchline's own validated runs (E1b closing set, PSTAR4; instrumented hash-identical re-runs). None is an external robot constant.

## 1. Whole-body state used by the planner

- **COM / COM velocity:** the controller already uses the **mass-weighted COM and COM velocity of all 14 segments** (`ctrl/v2_stand.js` state estimation). The planning tool recomputes them independently (`tools/e2_plan_lib.mjs` `bodyState`): ξ difference 0.000 mm.
- **Constant-height DCM:** ω = √(g/h), ξ = COM_xy + COMvel_xy/ω, with h = the measured COM height.
- **Operating height per body** (quiet single support, E1b hover):

| body | h (m) | ω (s⁻¹) |
|---|---|---|
| V2-REF | 1.007 | 3.121 |
| V2-165-62 | 0.912 | 3.281 |
| V2-198-92 | 1.097 | 2.991 |
| V2-175-70 | 0.968 | 3.184 |
| V2-190-85 | 1.052 | 3.054 |
| V2-short-legs | 0.988 | 3.151 |
| V2-long-legs | 1.026 | 3.092 |
| V1-matched | 1.051 | 3.054 |

**Model-assumption deviations (logged):**
- **Quiet single support:** h range ≤ 1 mm and |COM vertical speed| ≤ 3.2 mm/s, so the constant-height approximation holds well.
- **At the end of the 15 N·s push** (V2-165-62 snapshot): COM vertical speed −0.057 m/s; centroidal angular momentum 4.6 kg·m²/s.
- Both are logged per planning call. The LIPM ignores them; the measured margins (§3) and the timing margin cover their effect only empirically.

## 2. Timing chain (planned touchdown ≠ measured contact ≠ effective support)

| interval | measured value | source |
|---|---|---|
| swing command → measured LIFTOFF / AIRBORNE (E1b lift profile: min-jerk 20 mm in 0.6 s) | 154–158 ms / 167–171 ms (8 bodies) | E1b none runs, lifecycle logs. Model: the time for the reference to rise past the touch gap plus servo lag (≈ 70 ms). **The E2 swing profile must be re-measured in its smoke run** |
| recovery from hover (foot already airborne, 17.6 mm clearance) | 0 | — |
| touchdown vs the reference reaching the foothold | −13 … −25 ms (the foot leads) | E1b none runs |
| measured contact → TOUCHDOWN state | 1 tick (`touchdownDebounce` 0.004 s) | lifecycle |
| TOUCHDOWN → LOAD_ACCEPT (intent present, contact sustained) | **0.050 s, exactly, in 23 / 23 runs** | T-A runs |
| requested → realised landed-foot load share | lag ≤ 1 tick (best fit 0–4.2 ms); 50 % crossing realised 4–8 ms after requested; rms 0.03–0.05 | instrumented PSTAR3 runs |
| LOAD_ACCEPT → full support | the ramp T_r (0.10–0.225 s, smoothstep); support region grows from the landed foot's centroid with s | lifecycle |
| timing margin before contact | 0.04 s (the validated model's largest LOAD_ACCEPT discrepancy) | `../../p15_capture/` |

**Consistency:**
- the capture horizon in the planning model = remaining liftoff delay + swing + touchdown + debounce + realised-load lag + ramp;
- support grows explicitly with s; the landed foot has **zero support authority before LOAD_ACCEPT**;
- no circularity: acceptance needs **sustained contact plus intent**, not prior load.

## 3. Measured margins (adverse direction for capture)

| margin | value | measured as |
|---|---|---|
| CoP realisation, stance foot, single support | **2.3 mm** | p95 of the realised-minus-commanded lateral CoP |
| CoP realisation, landed foot, during the acceptance ramp (s < 1) | **15.2 mm** | p95 of the inward shortfall (realised less outward than commanded) |
| CoP realisation after full support | **4.0 mm** | p95 inward shortfall |
| realised-load lag | **8 ms** | 50 %-crossing lag |
| landing position, base | **1.64 mm** | maximum landed-from-anchor over the 23 validated put-downs |
| landing position, motion term | + 5.77·d/(ω_n² T²) | servo-bandwidth tracking bound for a min-jerk move of length d in T (ω_n = 2π · 4 Hz) |
| timing | 0.04 s before contact | as above |

**Caveat:** the CoP-ramp margin was measured on the 0.10 s-ramp runs (PSTAR3). Longer PSTAR4 ramps should give smaller shortfalls, so the value is conservative.

## 4. Swing torque envelope (time / torque-qualified reach, separate from kinematic reach)

Inertial hip torque ≈ I_distal · (5.77 d/T²)/L_leg, using the controller's own distal-inertia values.

| swing | inertial hip torque | hip capacity | share |
|---|---|---|---|
| recovery, 4.4 cm in 0.207 s | 15–26 N·m | 148–228 N·m | ≈ 10–12 % |
| planned, 10 cm forward in 0.6 s | 4–7 N·m | 148–228 N·m | < 5 % |
| planned, 8 cm lateral in 0.6 s | 3–6 N·m | 148–228 N·m | < 5 % |

Torque is not binding. The servo-bandwidth tracking bound sets the minimum swing time (T_min = max(0.20 s, √(5.77 d/(ω_n² · 0.010 m)))).

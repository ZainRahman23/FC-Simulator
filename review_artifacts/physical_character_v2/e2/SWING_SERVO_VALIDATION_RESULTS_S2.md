# Swing-servo validation, amendment S2 (corrected rate + continuous re-anchor): SERVO DOES NOT VALIDATE (V-1, V-2, V-4) → no certified allowance

**Preregistration:** `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S2.md` (commit 4a2807e, before any run). Battery and criteria are those of `SWING_SERVO_VALIDATION_PREREG.md`.

**Run:**
- `scripts/run_servo_val_H.sh` from a clean copy of commit d97862f;
- 192 / 192 runs;
- VAL-OFF = PSTAR5BH, VAL-ON = PSTAR5CH;
- evidence: `evidence_servo_H/` (runs, `servo_eval.json`, `servo_eval_summary.txt`).

**Decision rule (§3 of the base):** the servo validates iff V-1 … V-6 all hold. They do not → **stop**. No allowance is set in the certificate, and no gain, bandwidth, trajectory or threshold is changed.

## 1. Tracking, against the first battery (same trajectories, bodies, legs, rates)

Representative set, means over 8 bodies × 2 legs × 3 rates:

| trajectory | first battery RMS OFF → ON (mm) | **S2 RMS OFF → ON (mm)** | S2 peak ON max (mm) | S2 lag ON (ms) |
|---|---|---|---|---|
| L1 (liftoff → 10 cm forward) | 7.66 → 6.19 | **5.47 → 1.50** | 3.12 | 0.7 |
| R1 | 5.69 → 3.97 | **4.27 → 1.35** | 3.41 | 4.0 |
| L2 (liftoff → 8 cm outward) | 7.48 → 6.63 | **4.46 → 1.97** | 5.84 | 4.6 |
| R2 | 4.68 → 4.03 | **3.15 → 1.32** | 3.60 | 2.0 |

Harder set, RMS ON mean: 1.5 – 2.6 mm (first battery 2.2 – 6.9).

## 2. Criteria

| # | result | failing items and cause (diagnosed, not re-interpreted) |
|---|---|---|
| V-1 (RMS ON ≤ 0.5 × OFF) | **FAIL (23)** | All on targets beyond reach of the shorter bodies at the battery's elevated heights:<br>- V2-165-62 L2: ratio 0.57 – 0.59; it ends at hover with a 45 mm apex above the anchor;<br>- H3r (return from the 40 mm-apex trajectory): V2-165-62 0.64 – 0.66, V2-175-70 0.52, V2-short-legs 0.50 – 0.51.<br>There the IK targets saturate (soft-limit box), so ON and OFF track the same slowed targets. Every other trajectory passes |
| V-2 (β_OFF ≥ 0.5, \|β_ON\| ≤ 0.25) | **FAIL (8 trajectory ids)** | β_OFF < 0.5 on the return segments (R1 0.40, R2 0.42, H1r – H4r −0.05 … 0.31) and on H5 / H5r (0.05 / 0.03). On those segments the OFF error is not mainly inertial: a joint fit gives a residual velocity-lag term of γ ≈ 0.22 – 0.29 × 2ζ/ωn (14 – 19 ms). That is the pelvis-motion term of the velocity feed-forward, which the correction deliberately leaves at the validated damping (`VFF_RATE_CORRECTION.md` §3a). ON passes everywhere (\|β_ON\| ≤ 0.24 except R2 0.33) |
| V-3 (representative peak ≤ 10, RMS ≤ 5 mm) | **PASS** | worst peak 5.84 mm |
| V-4 (integrity) | **FAIL (314 items)** | see the breakdown below |
| V-5 (no oscillation) | PASS | |
| V-6 (rate stability) | PASS | |

**V-4 breakdown:**
- **energy, Σ+ rule (E1a-8: Σ positive closure ≤ 0.5 J per run), 30 runs:** every 180 Hz and 12 of the 16 240 Hz sequence-B runs, plus 2 at 180 Hz in A.
  - The positive closure increment is proportional to dt. First battery medians: 0.71 / 0.53 / 0.29 J at 180 / 240 / 480 Hz.
  - It accumulates over the long multi-segment runs, equally without the feed-forward (the first battery's OFF runs fail the same way).
  - Per-tick closure ≤ 0.024 J (limit 0.05).
- **saturation, 16:** L1 at 180 Hz in every body (6.4 – 9.2 % of rows, 39 – 56 ms).
  - It is the hip-flexion axis, activation-limited during the torque reversal near the apex: 7 – 10 N·m requested at low activation in the new direction, about 3 % of capacity.
  - Physical activation dynamics (spec §14), exposed by the faster torque reversal with the inertial feed-forward.
- **torque continuity, 62:** commanded Δτ0 30 – 53 N·m on the H1r / H3r returns and V2-165-62 L2.
  - These are steps of the now-exact desired joint rate when a coordinate enters or leaves the soft-limit box at those heights.
  - The free set of the rate solve changes discontinuously there; the old 0.3× attenuation had hidden it.
- No over-capacity, no swing-foot contact, no aborts.

## 3. Allowance (computed by the §4 rule; NOT applied because the servo does not validate)

| phase | worst downward lowest-boot-point deviation, representative VAL-ON | where |
|---|---|---|
| rise [0, 0.4) | 4.80 mm | V2-165-62 L2 (reach saturation) |
| apex [0.4, 0.6] | 6.66 mm | V2-165-62 L2 (reach saturation) |
| descent (0.6, 1] | 3.17 mm | V2-long-legs R2 at φ = 1.00 — the overshoot when the foot stops in the air at hover |

**What the descent number measures:**
- The §4 phase binning takes the descent maximum over (0.6, 1].
- The certificate only uses φ ≤ 0.8, and in the E2 step the descent ends in contact (φ ≈ 0.88), not in an in-air stop.
- Inside the certificate window the battery's worst descent deviation is 2.24 mm over [0.6, 0.8] (V2-165-62 L2, reach-saturated), 0.92 mm over [0.7, 0.8] and **0.75 mm over [0.75, 0.8]**.

The planning consequence is in `E2_OVERNIGHT_REPORT.md` §7 / §12.

## 4. Classification

- **Control-side, measured and causal:**
  - the velocity-feed-forward correction works: L1 OFF lag about 4 ms;
  - D1 now works as designed: representative ON RMS 1.3 – 2.0 mm, \|β_ON\| ≈ 0.0 – 0.3.
- **Residual control effect:** the pelvis-motion term (closed loop, left at the validated damping) produces the V-2 failures on return / lateral segments. Its stable correction is an architecture question: the explicit variant was refuted.
- **Battery-design effects** (the base's own caveat, plus findings now visible):
  - reach saturation on the elevated trajectories (V-1, continuity);
  - the dt-proportional Σ+ energy accumulation over long runs (V-4 energy);
  - the phase binning of the allowance (descent includes the in-air stop at φ → 1).
- **Physical actuator dynamics:** activation-limited hip reversal at 180 Hz (V-4 saturation).
- Interpreting any of these differently is a criterion decision. It is listed, not taken.

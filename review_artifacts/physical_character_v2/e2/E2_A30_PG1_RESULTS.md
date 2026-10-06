# E2 amendment A30 (apex 30 mm): PG-1 does NOT certify (0 / 32) → STOPPED

**Authority:** `../sources/2026-10-06_user_decision_e2_apex30.md`.

**Preregistration:** `E2_PREREG_AMENDMENT_A30.md` (commit 0625226, before any A30 run).

**Evidence:** `evidence_pg_A30/`.

**Not done, per the decision's stop rule:**
- no 30 mm touchdown matrix;
- no E2 smoke or official run;
- no change to E2-5, touchdown behaviour, servo-validation criteria, the apex (beyond 30 mm) or thresholds.

## 1. PG-1 under A30

32 preregistered commanded decisions (8 bodies × L / R × forward 0.10 m / lateral 0.08 m, 240 Hz), planner and certificate code unchanged:

| run | role | result | clearance margin at the binding point | what limits it |
|---|---|---|---|---|
| **(G)** PSTAR5CH (D1) | **gate** | **0 / 32: the planner refuses all 32** ("tracked-clearance allowance not derived (servo validation)") | — | no servo validation has passed, so no tracked allowance exists (D1 not declared validated) |
| (E) PSTAR5BH: servo-independent bandwidth envelope | reported | 0 / 32 | 3.41 – 3.62 mm at φ 0.80 (envelope 3.21 forward / 3.00 lateral) | the envelope grows with the apex: a_max / ωn², 2.98 → 3.21 mm |
| (W1) what-if: S2 rule allowance (4.80 / 6.66 / 3.17 mm) | reported | 0 / 32 | 3.46 mm at φ 0.80 | descent allowance 3.17 mm (the in-air stop at φ → 1 of hover-ending battery segments) |
| (W2) what-if: S2 per phase, restricted to the window (4.80 / 6.66 / 2.24 mm) | reported | 0 / 32 | 4.39 mm at φ 0.80 | descent allowance 2.24 mm (reach-saturated V2-165-62 L2 at φ ≈ 0.60) |
| (W3) offline: S2 worst deviation per 0.05-φ bin against the A30 reference | reported | **would certify** (every bin ≥ 5 mm) | **5.87 mm** at φ 0.75 – 0.80 (margin 0.87 mm) | — |

**Geometry delivered as computed:**
- The A30 reference's lowest boot point at φ 0.80 is **6.62 mm**: margin + envelope from the PG records, against 6.60 predicted in the amendment.
- Path and reach certificates: every evaluated candidate node is path-certified for all 8 bodies (29 / 29 … 35 / 35). **The 30 mm swing is reachable everywhere.** Capture certificates are unchanged.

**PG-1 verdict (preregistered rule: all 32 CERTIFIED under (G)): FAIL.** It does not certify under any certificate that exists today:
- the D1 certificate has no validated allowance;
- the servo-independent envelope is too conservative by 1.4 – 1.6 mm;
- the old battery's per-phase allowances are set by trajectories outside the E2 envelope.

**Only a φ-resolved allowance (W3) certifies 30 mm,** with a 0.87 mm margin, consistent with the amendment's budget. No validated rule produces that allowance.

## 2. Classification

- **Geometry: no longer the limiting factor.**
  - The 30 mm reference gives a 1.62 mm budget at φ 0.8.
  - The measured worst downward deviation there is 0.75 mm, in both the independent S2 battery and the E2 matrix (evaluator convention).
- **The blocker is the certificate's allowance, i.e. servo validation.** The tracked certificate needs an allowance validated for the E2 servo, and none exists. The old battery cannot provide a representative one:
  - its representative segments rise 1.8× higher;
  - they end in an in-air stop;
  - V2-165-62 L2 saturates reach;
  - its integrity rules fail even with D1 off.
- The correction from the amendment (§3) stands: my overnight claim that a window-restricted per-phase allowance would be 0.75 mm was wrong; it is 2.24 mm.

**Next step, needing a decision:** the versioned servo-validation battery (`SWING_SERVO_VALIDATION_V2_PROPOSAL.md`). It is representative of the E2 envelope, with a φ-resolved allowance rule. Not frozen, not run.

## 3. Touchdown (E2-5): the physical quantity and a rate-robust formulation

This section uses **existing 25 mm data only** (the 96-run PSTAR5CH matrix). The 30 mm matrix was not run, because PG-1 failed and the decision says stop.

**What E2-5's impact clause constrains:**
- E2-5 takes its impact clause verbatim from E1a-12: "contact impact peak vertical load ≤ 25 % BW".
- E1a defined it for a placed (not loaded) foot after a 5 – 20 mm lift-and-replace (`final_pre_e1a/E1_PREREGISTRATION.md`, `e1a/E1A_HARNESS.md`): max vertical contact load over [t_TD, t_TD + 0.1 s].
- Its intent, given the lifecycle's "contact ≠ support" semantics: **the landing foot is placed, not slammed.** The physical load it delivers before load acceptance stays a small fraction of body weight.
- That is a bound on a physical force over the contact event, not on the solver's one-tick impulse.
- The same E2-5 row separately bounds the kinematic cause: normal approach ≤ 0.15 m/s, tangential ≤ 0.05 m/s.

**Evidence of timestep sensitivity** (`evidence_pg_A30/touchdown_metrics_25mm.txt`). Ratio is 480 / 180 Hz over the 16 body × direction groups; max is over the 96 runs:

| metric | ratio 480 / 180 | max at 180 / 240 / 480 Hz |
|---|---|---|
| **instantaneous peak** (frozen E2-5) | **1.08 – 2.30** | 22.5 / 27.9 / **43.5** % BW |
| max 5 ms window-mean load | 0.92 – 1.72 | 22.5 / 27.9 / 27.9 % BW |
| **max 10 ms window-mean load** | 0.70 – 0.95 | 19.8 / 22.1 / 16.8 % BW |
| max 20 ms window-mean load | 0.58 – 0.95 | 14.0 / 13.3 / 11.4 % BW |
| impulse 20 ms | 0.59 – 0.92 | 2.56 / 1.62 / 1.58 N·s |
| impulse 50 ms (reported now) | 0.55 – 0.81 | 3.86 / 3.43 / 2.97 N·s |
| approach normal speed | 0.87 – 0.95 | 0.10 / 0.09 / 0.09 m/s |

**Reading:**
- In this rigid-contact solver the instantaneous peak is essentially the one-tick contact impulse ÷ dt. At equal (or lower) approach speed it doubles from 180 to 480 Hz. That measures the solver step, not a physical load.
- Load averaged over a fixed physical window of ≥ 10 ms does not grow with rate. It even falls slightly, together with the slightly lower approach speed at 480 Hz.
- A 5 ms window is too short: about one tick at 180 / 240 Hz, so it still tracks the step.
- The 50 ms impulse is not exactly constant either (ratio 0.55 – 0.81). It includes post-contact loading by the leg's hold, not only the impact.

**Recommended rate-robust formulation (not adopted; E2-5 unchanged until decided):**
- Impact = max over [t_c, t_c + 0.1 s] of the normal contact load **averaged over a sliding 10 ms window of physical time**, ≤ 25 % BW, keeping the threshold and its physical meaning.
- Exact-window averaging (fractional tick weights) so the window is 10 ms at every rate.
- The instantaneous peak and the 50 ms impulse stay reported.
- **Why 10 ms:**
  - the shortest window that spans ≥ 2 ticks at the lowest preregistered rate (180 Hz);
  - shorter than the rise time of a human heel-strike impact transient, roughly 10 – 30 ms (recalled [R], not sourced here; a source should be added before adoption);
  - it removes the solver-step dependence: ratio ≤ 0.95 in every group.
- On the existing 25 mm matrix it would pass 96 / 96. Max 22.1 % BW: margin 2.9 % BW. It must be re-measured at 30 mm, whose final descent is about 7 % faster.

## 4. Unchanged and preserved

- Old servo batteries and results:
  - `SWING_SERVO_VALIDATION_PREREG.md` / `_RESULTS.md` / `evidence_servo/`;
  - amendment S (superseded, never run);
  - `_PREREG_AMENDMENT_S2.md` / `_RESULTS_S2.md` / `evidence_servo_H/`.
- `vffPassive` stays diagnostic-only.
- Recovery (C) untouched.
- E2 tracking thresholds unchanged.

# BALANCE-2 successor C4 (P8 defect only): design log (development set only)

**Why.** Unchanged C3 passes the frozen flat-sole criterion B2F at 16 / 17. It fails only P8, backward small 0.287 (`evidence/B2F_V_BALANCE2_C3.json`). The causal diagnosis (`p8/P8_DIAGNOSIS.md`) finds a genuine, controller-side defect:
- after a backward push the upper body (HAT) stays leaning ≈ 1.2° forward about the hips;
- BALANCE-1's HAT lean objective does not act at the hips in AP (map ≈ 0);
- the COM loop then holds a few millimetres of COM error to support the lean;
- the integrals turn the slow decay into a ≈ 9 s oscillation.

The instruction says to solve only that defect, preserve C3, not search gains, and not casually repair the hip map with the existing gains.

## D0. Declared before any C4 development run

**The one candidate**, H1 (`c4/c4_ctrl.mjs`, `c4/params/C4.json`):
- C3 + the HAT AP map corrected (C2's frozen `hatMap: "pivot"` option);
- the HAT objective's declared P and D terms act through the corrected map (kP 1.3, kD 0.45 s, unchanged);
- its AP integral is kept at zero, as it effectively was in C3;
- nothing else changes;
- no gain is chosen.

**Reference only, not eligible:** Href = the full repair with the existing gains, integral included. This is what the owner excluded. It is run only to document its effect on this DEV set; earlier DEV evidence, C2 design log D6 V7, showed it was worse.

**Development set:** C3's (`scripts/c3_dev.mjs`, disjoint from B2M):
- 100 ms pulses: fwd 5 / 10, back 6 / 12, left 12;
- fwd 12 @ 50 ms;
- forward and backward 100 ms bisections;
- 20 s quiet standing;
- legitimacy on every case and level.

**Adoption rule.** H1 is adopted as C4 only if **all** of these hold. Otherwise there is no successor and the P8 gap is reported unresolved, with C3 unchanged.
1. Legitimacy: boot-tip load ≤ 0.02 in every non-fall case and level, and in quiet standing.
2. No DEV case that C3 recovers is a fall or "not settled" under H1.
3. Overshoot on back 6 and back 12 is lower than C3's (0.311, 0.223), and no DEV case's overshoot exceeds C3's by more than 0.02.
4. Neither 100 ms threshold is lower than C3's by more than 0.3 N·s (C3: fwd 12.42, back 21.09).
5. Quiet standing COM RMS AP stays inside U4's band [1.0, 12.9] mm.

If adopted, C4 is preregistered and frozen before any B2F, causality or review run.

## D1. DEV result: H1 not adopted; no successor (`c4/dev/DEV_R0_C3.json`, `DEV_H1.json`, `DEV_Href.json`)

| DEV case | C3 (R0) | H1: corrected map, P / D, no AP integral | Href (reference): full repair, existing gains |
|---|---|---|---|
| fwd 5 @ 100 ms | os 0.045 | **os 0.169** | os 0.171 |
| fwd 10 @ 100 ms | recovered, settled 2.70 s | **not settled** (3.60 s) | not settled |
| back 6 @ 100 ms | os 0.311 | **os 0.455** | os 0.439 |
| back 12 @ 100 ms | os 0.223, settled 1.50 s | **os 0.310, not settled** | os 0.299, not settled |
| left 12 | os 0.046 | 0.043 | 0.043 |
| fwd 12 @ 50 ms | not settled (3.39 s) | not settled (3.21 s) | not settled |
| fwd / back threshold, 100 ms | 12.42 / 21.09 | 12.42 / 21.66 | 12.42 / 21.09 |
| Boot-tip load at non-fall levels | 0 | 0 | 0 |
| Quiet COM RMS AP | 1.74 mm | 1.54 mm | 1.54 mm |

**Adoption rule.** H1 fails rule 2 (fwd 10 and back 12 become not settled) and rule 3 (back 6 overshoot rises from 0.311 to 0.455; fwd 5 from 0.045 to 0.169). **Not adopted. No successor**, as declared. C3 stays the candidate, unchanged.

**What this shows.**
- Making the hips actively restore the HAT's AP lean, with or without the integral, increases COM overshoot. Href confirms the earlier V7 finding.
- In a two-segment body, hip torque that corrects the trunk lean accelerates the legs, and with them the COM, the other way (the hip-strategy shear).
- BALANCE-1's architecture runs the COM objective (static Jacobian map) and the HAT objective (gravity-load map) as independent loops with independent delays. Nothing coordinates them, so a working HAT loop fights the COM loop.
- With the HAT loop inactive, as in C3, the lean is left to drift slowly. With it active, it disturbs the COM.
- Removing the P8 defect therefore needs **coordinated ankle–hip control**: a COM objective that includes the HAT lean, or eigenmovement-based coordination (Alexandrov 2005).
  - Alternatively, it needs sagittal human evidence for different upper-body gains, which the literature audit did not find.
- Either is a controller-architecture decision for the owner, not a minimal repair.

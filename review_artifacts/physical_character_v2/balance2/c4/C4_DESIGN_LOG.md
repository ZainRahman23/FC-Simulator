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

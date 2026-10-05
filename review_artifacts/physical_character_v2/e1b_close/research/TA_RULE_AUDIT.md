# Audit of the two remaining E1b-7 items of the T-A validation (diagnostic; no tuning to observed values)

**Source:** user decision 2026-10-05 (`../../sources/2026-10-05_user_decision_p15_split_close_e1b_e2_prep.md`).

**Data:** the official PSTAR3 runs (`../../e1b_ta/evidence/`), plus instrumented re-runs of four of them (V2-long-legs, V2-REF, V2-175-70, V2-165-62; L, P15). The re-runs are hash-identical to the official ones.

**Tool:** `../tools/ta_rule_audit.mjs`; output `ta_rule_audit.log`.

## 1. V2-long-legs E1b-7 (10.23 / 10.21 N·m): the capture rule forced the minimum ramp unnecessarily

**Question:** did the capture-timing rule force the minimum ramp in cases that had more time available? **Yes.**

- **During the descent**, the executed plan stayed feasible with the **longest** ramp (0.225 s) at every checked tick (+0.004 … +0.154 s).
- **At measured contact**, revision 1 delayed the model's LOAD_ACCEPT by the 0.04 s timing margin **again**. It then found **no** feasible ramp, even 0.10 s, and forced 0.10 s with a "step required" flag.
- **With acceptance at the measured-contact debounce** (no extra margin), the same model, inputs and constraints give a longest feasible ramp of:
  - **0.215–0.22 s** (V2-long-legs, V2-REF);
  - **0.165–0.17 s** (V2-175-70);
  - **none** (V2-165-62, which is infeasible under either rule).
- The forced 0.10 s ramp releases the stance hip abductor (≈ 1.2 N·m/kg) about twice as fast. Hence 10.2 N·m on V2-long-legs.

**Why the margin does not belong there:**
- The 0.04 s margin was preregistered as timing uncertainty: the validated model's largest LOAD_ACCEPT timing discrepancy, which came from touchdown time and the old λ-driven acceptance.
- After measured contact, T-A's acceptance is determined by the lifecycle's own debounce. Measured: **contact → LOAD_ACCEPT = 0.050 s in all 23 T-A P15 runs.**
- Re-applying the margin after contact double-counts an uncertainty that no longer exists.

**Correction (rule revision 2, `abortCapture: 2`):** `planRamp` uses no timing margin after measured contact. Everything else is unchanged: the margin before contact, the descent rule, bounds, grids and split. This follows from the margin's own definition, not from the observed torque values.

**Not changed:** the descent-stage rule. The audit also compared starting the λ return at the planned touchdown rather than touchdown + margin; the effect was mixed across bodies and not systematic, so revision 1's descent rule is kept.

## 2. V2-REF 480 Hz E1b-7 (one tick 6.61 N·m against the rate-scaled 5 N·m): the rate rule mis-scaled an impact response

**What it is:**
- At +0.612 s the old stance foot, carrying about 50 N with all pieces already touching, takes a **one-tick load jump to 369 N**: the lightly loaded foot slapping flat.
- The knee's applied torque responds by 6.61 N·m through the implicit damping. The commanded Δτ0 that tick is 0.71 N·m, so **the command is smooth**.
- E1b-7's contact-onset exception does not apply, because the foot did not go from 0 to more than 0 touching pieces.

**The same event at every rate** (largest stance-foot load jump after acceptance):

| rate | load jump | applied Δτ that tick | commanded Δτ0 | rate-scaled limit | verdict under that limit |
|---|---|---|---|---|---|
| 180 Hz | +207 N | 6.17 N·m | 1.28 | 13.33 | pass |
| 240 Hz | +248 N | 6.43 N·m | 1.12 | 10 | pass |
| 480 Hz | +316 N | 6.61 N·m | 0.71 | 5 | "fail" |

- **An impact response is rate-independent:** about 6.2–6.6 N·m per tick at all three rates.
- **A smooth ramp is rate-proportional:** the acceptance ramp gives V2-REF 12.03 N·m at 180 Hz vs 9.70 at 240 Hz, roughly 240/180.

My RATE-set rule (E1b-fix prereg) scaled the applied limit by 240/hz for every change. That is correct for smooth ramps and wrong for jumps.

**Correction (RATE set only):**
- **Applied-torque limit × max(1, 240/hz):** a jump must stay within the 240 Hz per-tick value at any rate; a smooth change keeps the same torque rate at lower rates.
- **Commanded limit stays × 240/hz:** smooth controller output.
- **Unchanged:** the official E1b-7 values at 240 Hz (10 / 25 / 30 N·m).

## 3. What the audit does not change

No duration bound, grid, margin before contact, split rule, criterion threshold, passive tissue, lifecycle constant or put-down trajectory.

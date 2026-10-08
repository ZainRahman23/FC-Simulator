# Diagnostics (not qualification)

Each folder here is a **diagnostic** study. None of them is a qualification gate, adopts a mechanism, or changes a frozen criterion or an official verdict.

Qualified V2 behaviour and its evidence live under `../e2/` and the gate folders.

| folder | date | question | result |
|---|---|---|---|
| [`loco_probe_2026-10-08/`](loco_probe_2026-10-08/LOCO_PROBE_RESULTS.md) | 8 Oct 2026 | Can step 1 feed step 2, and does V2 chain steps? (the user's locomotion viability probe) | Step 1 is clean on 4 bodies × 2 sides × 2 step kinds; step 2 is never initiated. The between-steps transfer cannot reach the next single support (A + B, no C). YELLOW. |
| [`loco_cf1_2026-10-08/`](loco_cf1_2026-10-08/CF1_RESULTS.md) | 8 Oct 2026 | COUNTERFACTUAL CF-1 (user-approved): with the missing between-steps transfer supplied, do steps chain? | Forward: the transfer works (DCM error 0.4 mm, trailing foot released), then the single-step planner refuses the trailing-leg swing (ankle 2.7–5.3° beyond its soft bound; hard limits satisfied; A). Wide lateral stance: the trailing foot keeps 1.2–1.6 % BW (B). No physical step 2. YELLOW (strengthened). |

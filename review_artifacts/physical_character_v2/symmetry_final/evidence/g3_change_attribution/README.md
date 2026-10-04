# G3 changes between the pre-correction validation (7eb6248) and the final symmetry package (833ec4a): attribution

**Comparison:** `g3/json/g3_results.json` at 7eb6248 vs the final run. Jobs are paired by (group, body, key, title, stand, eval).

- **Correction to an earlier statement:** a first comparison keyed jobs by (group, body, key) only. That paired *different* strategy arms (the `eval` variants) and reported one outcome change, "strategy T8:hold:R:BR:15: step required → fell → foot relocated". It was a **pairing artifact**. With the full key there are **0 outcome changes**.
- **22 abort-timing changes** (`changed_jobs.txt`), all in supervised trials:
  - 20 aborts move **later**: +1 tick in the mirrored T8 pairs, the abort arms and the T8 / strategy arms; +2 in T11:over:1.4:sup; +10 … +14 in three knee arms and in UP:R:R:10 / UP:L:L:10.
  - 2 aborts no longer happen (T8:hold:R:FL:10 and its mirror T8:hold:L:FR:10). Both trials **still recover**.
  - The members of each mirrored pair change identically.

**Attribution runs** (final code with one element reverted; `attribution_tree.diff` is the exact edit; the job filter `ATTR_KEYS` exists only in the scratch copies):

| run | what differs from the final code | result on the 22 jobs |
|---|---|---|
| `g3_results_attr_region` | usable region = 7eb6248's `insetPoly(hull2Canonical(·))` (non-convex) **and** 7eb6248's sign-consistency `insidePoly` | **reproduces the 7eb6248 abort tick and outcome in 22 / 22** |
| `g3_results_attr_nopolish` | IK polish off (`V2_IK_POLISH=none`) | equals the final run in 21 / 22. T8:ramp:R:BR:15 aborts at tick 598 instead of 597, while its mirror T8:ramp:L:BL:15 stays at 597: without the polish this pair's abort timing is no longer mirror-identical. |
| `g3_results_attr_final` | none (rerun) | identical to the final run, hashes 22 / 22 (determinism; the bit-identity of the `legChain` refactor) |

**Conclusion:**
- Every G3 change comes from the **convex usable region**:
  - its area is +1.2 … 1.4 % larger (the reflex notch filled);
  - the supervisor's support margin therefore crosses its threshold later or, in the two marginal FL / FR pushes, not at all.
- The quaternion-scope change and the polish change no abort tick here, except the single polish tick above. That tick makes the timing mirror-consistent.
- No outcome changes.

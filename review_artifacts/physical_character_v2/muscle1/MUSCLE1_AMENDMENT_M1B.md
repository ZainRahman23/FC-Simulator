# MUSCLE-1 amendment: labelled successor M1b (preregistration decision rule 2)

**M1 failed** its frozen preregistration on one ankle criterion, A4 (`evidence/MUSCLE1_VERDICT.json`, commit 6c68177b). The result is preserved and not re-scored.

## 1. The failure and its cause

| | |
|---|---|
| **Criterion A4** | Every neural step must take ≥ 5 ms to reach 2 % of its change, and change force by ≤ 1 % in the first 4.17 ms tick ("a neural command cannot change force instantly") |
| **M1** | The 2 % onset passes everywhere (6.1–12.9 ms). The first-tick fraction is 1.11 % for the groups with τc,rise = 88.8 ms (dorsiflexors; knee extensors and flexors). Plantarflexors give 0.68 % (pass) |
| **Cause** | M1's neural pathway is two first-order lags with **no pure latency**, so force begins to change in the first tick after the command. Humans show no force change until the electrochemical process has run: about 6 ms from EMG onset to fascicle motion (below) |
| **Own error, disclosed** | The 1.11 % was computable at design time (`m1_design_derive.mjs` printed 1.11e-2), and the 1 % threshold was set without cross-checking it. The threshold is kept; the cause is physiological and independent of it |

## 2. The change (independently justified)

**Add the electrochemical delay to the excitation**, before activation:

```
u_used(n) = u(n − d),  d = 2 steps
```

**Evidence [M].** Nordez et al. 2009, *J Appl Physiol* 106:1970 (PMID 19359617):
- medial gastrocnemius fascicle motion begins **6.05 ± 0.64 ms** after EMG onset;
- the evoked EMD is 11.6 ms, of which ≈ 47.5 % is series-elastic take-up (FORCE_PRODUCTION_LITERATURE §2.3 and §12.2: "pure transport delay ≈ 6 ms").
- M1's cascade already represents activation, contraction and take-up. Its soft onset reaches 2 % at 6–9 ms. The pure electrochemical part is what is missing.

**Discretisation [D].**
- 6.05 ms is rounded **up** to 2 steps (8.33 ms) by the project convention that no pathway is faster than in humans (PPR-3 POSTURAL_TIMING §delays).
- The same delay applies to every muscle group: there are no muscle-specific data.

**Nothing else changes:** activation, contraction lags, mechanical pathway, window, strain arms and all criteria.

**Code** (additive; M1 is unchanged and still reproducible):
- `M1bAxis` in `scripts/m1_models.mjs`;
- `params/MUSCLE1B_CANDIDATE.json` (M1's constants + `electrochemicalDelay`);
- `make()` in `m1_experiments.mjs` accepts "M1b";
- `m1_eval.mjs` gains `--candidate` (default M1). The criteria and bands are untouched. With the default it reproduces M1's committed verdict byte for byte, which was checked.

## 3. Expected effect (stated before the run)

- A pure shift of 8.33 ms in every neural response:
  - 10–90 % rise and fall times unchanged;
  - 2 % onsets later by 8.33 ms, still inside [5, 30] ms;
  - first-tick change zero.
- The mechanical pathway (Experiment B) is unaffected.
- The replays (Experiment C) shift by 8.33 ms.

## 4. Re-qualification

M1b is run on the **same frozen battery**: the same scripts and protocol, with "M1b" added to the model list, and judged with `m1_eval.mjs --candidate M1b`. Under decision rule 1, the knee is judged only if every ankle criterion passes. `MUSCLE1B_FREEZE.json` records the hashes before the run.

# Controller mirror-symmetry fixes: DIAGNOSTIC results (not adopted, not a gate configuration)

These were produced with `node --import ./tools/b_sym_patch.mjs <tool>` and `B_SYM=<fixes>`, after the pre-registered J2a failed (`../G3_V3_EVALUATION.md`). Production code is unchanged.

| file | what it holds |
|---|---|
| `g3_mirror_v3_sym-<fixes>.json.gz` | J2a / J2b on all 81 pairs, for the fixes `region`, `norm`, `region+ik+norm`, `region+iktol+norm` and `region+ik+iktol+norm` (the full package). **Exception:** `region+ik` holds only 2 debug pairs (T1, T8 hold BR10) |
| `g2_results_symfix.json.gz` | the full 620-job G2 run with the full package |
| `g3_results_symfix.json.gz` | the full 332-job G3 run with the full package |
| `g3_bench_symfix.json` | the isolated S2 benchmark with the full package |

The committed gate results (`../json/`, `../../g2/json/`) were restored after each diagnostic run. Verified: unchanged against `HEAD`.

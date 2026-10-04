# Reachability evidence (pre-G4 runway, item 5)

The text that uses these files is `../../REACHABILITY_STRESS_AND_TAXONOMY.md` §3b–3e. Every run is static: it captures a G3 state, and no simulation code is changed. Each run is deterministic; a re-run reproduced 1,336 / 1,336 rows bit for bit.

| folder | produced by | content |
|---|---|---|
| `cert6/` | `tools/ik_certificate.mjs --cap=4e8 --body=<b> --state=<s>` (8 bodies × U:R, U:L, T5, T6) | `cert_<body>_<state>.json` / `.log`: one row per 6-D-invalid target, with verdict, cells, ms, warm residual and minimum lower bound. `cert_agg.mjs` builds the table. `ik_cert_V2-REF_UR` / `ik_cert_V2-165-62_UR` are the first runs (cap 1e8, pre-refactor tool; their rows are verified identical to the refactored tool's). `cert_tight_V2-REF_UR`: the same 41 targets with `--tight` (identical verdicts, 1.30× fewer cells) |
| `soundness/` | `tools/ik_certificate.mjs --soundness=200` (5 body / state combinations) | rate maxima, cell-inequality violations and slack, known-solution path results |
| `twist_free/` | `tools/ik_twist_free.mjs` | `tf_<body>`: variants V7k / V7ks / V7a / V7as / V8 / V8s for every 6-D-invalid target. `tfs_` / `tfsn_` add `--sens` (held-twist sensitivity). `killed_cert8_*.log` / `killed_cert8_tight_*.log`: the `--cert` runs (generic levers / `--tight --only-v8nf`), each stopped after 4 of 18 8-D certificates, all UNDECIDED at 4·10⁸ cells (the "UNDECIDED" lines). `agg.mjs` and `sens_agg.mjs` aggregate (gunzip into a working directory first) |
| `refall/` | `tools/ik_twist_free.mjs --refall` | every geometric target classified with the twist DOFs held at instantaneous vs reference values |
| `e2/` | `tools/e2_target_check.mjs` | the E2 footholds (5 / 10 cm forward and lateral; pelvis drop 0–10 cm; both twist definitions) |

**Re-aggregation:** copy a folder to scratch, run `gunzip *.gz`, then `node <agg script>`. The scripts read `*.json` in the current directory.

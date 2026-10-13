# SUPPORT-1 items kept outside Git

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/support1/`

| Item | Size | What it is | Checksums |
|---|---|---|---|
| `records/SLIDER_v6.74.json.gz` | 16 MB | Exploratory two-body run: passive sliding body at 6.74 m/s. Final hash b25add1c5ecf2afa | `records/SHA256SUMS` |
| `records/SLIDER_v5.json.gz` | 16 MB | Exploratory two-body run at 5 m/s. Final hash 018cf4c760611a5f | `records/SHA256SUMS` |
| `literature_raw/` | 69 MB | Source texts and PDFs fetched by the literature review: Blackburn 2012 thesis, FIFA Test Manual 2015, Grund 2010, 23 PMC full texts and others. Some are under copyright, so they are not committed | `literature_raw/SHA256SUMS` |

**SHA-256 of the records:**
- `SLIDER_v5.json.gz`: 415a2838f500c163b7a94eab76c4d2b71b4e4411e86685ae80f80c503fadfdae
- `SLIDER_v6.74.json.gz`: 69eae67c11075728f549065caf68d85ed3566f018448da1828134ef15cd30399

**Not preserved, because each regenerates deterministically from committed code:**
- The 341-run lab sweeps per candidate. Only their per-run metrics and hashes are committed, in `evidence/S1_SWEEP_<cand>.json`. Any run can be re-run, and the clip preparation checks its hash against that file.
- The clip data, about 1 GB.
- The PNG frame dumps. The stills used on the review page are committed in `review/frames/`.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>` and `node --max-old-space-size=8192`:
1. **PVP-0 audit:** `support1/scripts/s1_feet_audit.mjs --dir <pvp0 records> --out evidence/S1_PVP0_FEET.json`, then `s1_cross_decomp.mjs` the same way.
2. **Sweeps:** `support1/lab/s1_sweep.mjs --cand <V2|C3SC|C3UR|LDG|LDG_C3UR> --pvp0 <pvp0 records> --out evidence/S1_SWEEP_<cand>.json`. That file records the replacement of the LOAD family (±40 N); re-running it with `--families LOAD` reproduces those rows.
3. **Regression:** `support1/scripts/s1_regress.mjs --cand <id> --out evidence/S1_REGRESS_<id>.json`. It writes `_Q.json` beside the output.
4. **Comparison, CPU and summary:** `s1_compare.mjs`, `s1_cpu.mjs`, then `s1_summary.mjs --slider <records dir>`.
5. **Exploratory two-body:** `support1/scripts/s1_slider_run.mjs --speed 6.74 --gap 0.45 --out <rec>`, and again with `--speed 5`.
6. **Video:**
   - Lab clips: `support1/render/s1_clip_prep.mjs --runs key=CAND:LABEL,... --yaw 75 --range -24,600 --out <clips> --evidence <sweep jsons> [--pvp0 <records>]`, then `support1/render/s1_capture.cjs --views review/video/VIEWS_S1_*.json`.
   - Two-body clips: `pvp0/render/pvp0_clip_prep.mjs`, then `pvp0_capture.cjs` with `review/video/VIEWS_S1_SLIDER.json`.
7. **Page:** `support1/render/s1_review_build.mjs`.

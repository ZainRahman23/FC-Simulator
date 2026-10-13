# PVP-0 run records, kept outside Git

**What is outside Git:** the 6 deterministic PVP-0 run records (`*.json.gz`, 16–30 MB each, 143 MB total), their run logs, `FINAL_HASHES_PVP0.txt` and `SHA256SUMS`. Every analysis, still and video in `pvp0/` was produced from these records.

| record | steps | final hash | what it is |
|---|---|---|---|
| `LIGHT` | 1440 | 363ec994c97bad90 | strength LIGHT (approach 0.5 × K) |
| `NOMINAL` | 1440 | 80fe925d6380b67b | strength REFERENCE (approach 1.0 × K = 6.74 m/s) |
| `NOMINAL_rerun` | 1440 | 80fe925d6380b67b | determinism rerun of NOMINAL (bit-identical) |
| `HEAVY` | 1440 | 9376fd891f4c9cbd | strength HEAVY (approach 1.25 × K) |
| `TWIN` | 1440 | 2960efa781b24fb1 | the same world with the tackler parked for the whole run: the recipient's undisturbed reference |
| `CALIB` | 840 | dad4aba129e196f9 | the NOMINAL tackler placed 10 m from the recipient: placement calibration and the no-contact tackler reference |

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/pvp0/records/`

**Not preserved:** the clip data (313 MB). It regenerates deterministically.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>` and `node --max-old-space-size=8192`:
1. Records: `pvp0/scripts/pvp0_run.mjs --case LIGHT|NOMINAL|HEAVY|TWIN --out <rec.json.gz>`, and `--case CALIB --steps 840`.
2. Evidence: `pvp0_analyze.mjs`, `pvp0_strike.mjs`, `pvp0_detail.mjs`, `pvp0_pose.mjs` and `pvp0_tackler_ref.mjs`, each with `--dir <records> --out <json>`. Then `pvp0_kfoot.mjs --out <json>`, which needs no records.
3. Clip data: `pvp0/render/pvp0_clip_prep.mjs --key <S> --run <rec> --steps 396-1140 --out <clips>` for S = LIGHT, NOMINAL and HEAVY. For the 0.25× close-ups, `--key <S>_C --steps 444-600`.
4. Video: `pvp0/render/pvp0_capture.cjs --clips <clips> --views pvp0/review/video/VIEWS_PVP0.json --archive <tag archive> --out <dir> --only <view id>`, one view per process.

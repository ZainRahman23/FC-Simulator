# PPR-1 run records, kept outside Git

**What:** every trajectory record behind the PPR-1 evaluation (66 files, 239 MB):
- `bat_A/`, `bat_B/`: the frozen battery for law A and law B (QS, 8 + 15 pushes, 3 impacts, C0, N2, DET logs);
- `diag_D1/`: the labelled post-hoc diagnostics D1 / D2 / D3.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ppr1/evidence/records/`, with `SHA256SUMS`.

**Regenerate.** The runs are deterministic, and every repeat was bit-identical. From the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<frozen tag archive>`:
- `node ppr1/scripts/ppr1_battery.mjs --law A|B --fixture pvp1/fixture/PVP1A_FIXTURE.json --dir <dir>`;
- `node ppr1/diag/ppr1_diag_d1_entrycap.mjs --fixture … --dir <dir> [--variant D2|D3]`.

Final hashes: B N2 `2463d9b08e927d52`, B QS `a544fcdc2c08a33d`, A N2 `e5751b0cbdd7c2b9` (= the committed PVP-1A-DX), A C0 `bc24da7b20eaf828`.

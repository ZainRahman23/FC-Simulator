# PPR-2 records

**In Git:** the battery evidence files are complete summaries: `PPR2_Q_*.json` (per-family results and final hashes) and `PPR2_VERDICT_*.json`. Per-step records are not stored, because every run is deterministic and re-creatable from the frozen scripts at commit e454b068 (T7 verified bit-identical reruns).

**Outside Git:** the per-step records used for the review clips are preserved at `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ppr2/records/`, with `SHA256SUMS`.

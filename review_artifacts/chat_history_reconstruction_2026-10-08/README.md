# Chat-history reconstruction, 1 – 7 Oct 2026: citation record

This folder is the **provenance record** behind the chronicle's `[Chat extraction]` citations. It is not a second chronicle. The narrative lives only in `docs/TOUCHLINE_DEVELOPMENT_CHRONICLE.md`, where the reconstruction's seven day supplements were audited and merged on 8 Oct 2026, and screenshots live only in `review_artifacts/chronicle_screens/`.

**Source.** Astra reconstructed the user's chat history for the manager-interface, ratings and development-model work of 1 – 7 Oct and delivered it as an import package (`TOUCHLINE_CHAT_HISTORY_RECONSTRUCTION_2026-10-08.zip`). It could not write to the repository itself (HTTP 403).

**Kept here, unchanged from the package:**
- `ASTRA_REPORT.md`, `ASTRA_VALIDATION.md` (renamed from `REPORT.md` / `VALIDATION.md`), `PACKAGE_METADATA.json`;
- `SHA256SUMS`, the package's own checksums. They cover files not kept here, so verify only the files present;
- `sources/CHAT_EVIDENCE_LEDGER.md` (C01 – C19, U01) and `sources/source_register.json`;
- `evidence/QUANTITATIVE_RECORD.md`, `CONFLICTS_AND_GAPS.md`, `ACQUISITION_QUEUE.tsv` / `.json`, `SELECTED_SCREENSHOTS.tsv` and `GITHUB_INSPECTION.md`.

**Not kept:**
- the seven `daily_entries/`, merged into the chronicle;
- the importer scripts. The importer's guard was pinned to an older chronicle blob, so the merge was done by hand;
- the manifest snapshot, byte-identical to `chronicle_screens/MANIFEST.tsv`.

**Added on 8 Oct:** `ORIGINALS_STATUS.tsv`, a local audit of the 30 acquisition-queue entries. For each it gives:
- whether the original was found on the development machine (Codex workspace `~/Documents/Codex/2026-10-0X/`, `~/Downloads`, `~/Desktop`);
- path, size, modification time and SHA-256;
- whether it is in the Git archive (none is).

26 of the 30 were located; A12, A15, A19 and A27 were not. Located files are **not** copied into Git. They are archived under their historical day only on the owner's decision. Card images and pages with real players' photos stay unpublished, as already decided.

**Evidence levels** (as in the chronicle):
- **located:** the original file is present;
- **reported:** an assistant's delivery or check report, not re-verified;
- **designed:** a user decision;
- **incomplete**;
- **uncertain / conflicting.**

The extraction is selected excerpts with UTC times, not raw transcripts. The chronicle converts its times at +01:00, the offset of every commit of 1 – 7 Oct.

**Links inside `ASTRA_REPORT.md`** to `daily_entries/`, the package `README.md` or `import/` point to files that were merged or not kept; the chronicle's day entries replace them.

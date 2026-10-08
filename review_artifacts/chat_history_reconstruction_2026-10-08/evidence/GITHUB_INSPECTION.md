# GitHub inspection and required archive format

**Repository:** `ZainRahman23/FC-Simulator`. **Archive branch:** `touchline-current`, not the default `visual-integration-v1`.
**Inspected archive head:** `9e95b87ad04adc0cd7fc1ec39bc318acb8153c3e`. **Chronicle blob:** `2892fdddc81666da042b96d65d3ae0e5c0c26729`.

At2026-10-08T02:12:04Z, `c1328ef1e9d5b251d45c9cb92a769b965a0fed3c` added11original screenshot records. Its child `9e95b87ad04adc0cd7fc1ec39bc318acb8153c3e` updated `docs/TOUCHLINE_DEVELOPMENT_CHRONICLE.md` through7October and the8October publication. Reads used the authenticated GitHub connector, including branch listing, direct repository metadata, commit records, chronicle slices, screenshot directory and manifest. Search-index/repository-list results initially omitted this repository; direct access worked.

Required format observed: one heading per development day, local day extending through06:00; Evidence/provenance, intent/starting state, iterations and failures, decisions versus non-adoption, end-of-day state and next blockers. Plain fact versus Reconstructed versus Uncertain is explicit. Existing provenance labels include Chat,FC-SimGit,TLGit,Doc,Local,Astra,Later,Session. New chat findings are labelled **Chat extraction**, not falsely described as original18August chat or Claude’s local Session records.

Screenshots live in `review_artifacts/chronicle_screens/<date>_<subject>/`. `MANIFEST.tsv` columns are `folder,file,original_name,bytes,sha256,original_mtime_local,subject` (tab-separated). The existing11-row manifest is reproduced as a reference snapshot; its computed Git blob is `75eb420c372bda8a92a16f4f63ed7f383bea28f3` against expected `75eb420c372bda8a92a16f4f63ed7f383bea28f3`. **Image raster hashes were not recomputed.** The nine selected manager-UI records are references only. No new image manifest entries are appropriate until original bytes are recovered.

Existing non-physics coverage: October1card note; October4first standings/squad captures; October5thirteenHTMLiterations plus four screenshots; October7competition/training/colour-test captures and Calendar file23:10local. Source/author was generally marked unknown. The new work expands these notes rather than adding duplicate days. August18first broad website is already covered. Physical-character chronology and its gate outcomes must not change.

An actual attempt to create the documentation-only branch `docs/chat-history-reconstruction-2026-10-08` failed with403 `Resource not accessible by integration`. **No write succeeded.** No repository file,code,commit,branch ref or history was changed. No PR was opened. Repository-wide metadata reporting push/admin did not translate into integration write authority.

The import tool is local,documentation-only and guarded by the exact chronicle blob. It does not create commits,backdate,force-push or run simulation validation. Claude must inspect its diff,resolve any artifact-dependent claims before upgrading their certainty,and publish only genuine new documentation work with current timestamps.

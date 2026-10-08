# Evidence storage policy (physical character)

Adopted 8 Oct 2026, after one generated archive (105.8 MB) blocked publication (`PUBLICATION_REWRITE_2026-10-08.md`). The aim is to keep the evidence a reviewer needs in Git, and to keep bulk that can be regenerated out of it.

## Commit (normal Git)

- **Records:** preregistrations, amendments, errata, decisions (`DECISIONS.md`, `sources/`), results and reports.
- **Code:** simulation and controller code, harnesses, evaluators, run lists and run scripts.
- **Per-run outputs:** logs, `commit.txt` / `tree_status.txt` / `queue.log`, evaluation summaries (`*_eval*.json|txt`), and tracking and criteria JSON.
- **Compact archives:** archives of diagnostics or records **under 50 MB**. The largest committed one is `e2/evidence_dvg/logs/guard_traces.tgz`, 41.5 MB.

## Keep outside Git

- **Raw per-run record archives** named `runs_records_*.tgz`. These are git-ignored.
- **Any generated archive or file of 50 MB or more.**

Store such a file in a local folder outside Git:

`~/Downloads/FC Simulator worktrees/_preserved_<date>_evidence_outside_git/<repository-relative path>`

Put a `SHA256SUMS` file beside it. Then commit a pointer file, `<name>.OUTSIDE_GIT.md`, that gives:
- the size and SHA-256;
- the local location;
- the committed script and commit that regenerate it.

Example: `e2/evidence_smoke_H/runs_records_240_REF_165.tgz.OUTSIDE_GIT.md`.

## Limits and guard

- **GitHub's limits:** files over 100 MiB are rejected; a warning appears above 50 MiB. Push large histories in batches of ≤ 0.4 GB.
- **`tools/git-hooks/pre-commit`:**
  - rejects staged files of 100 MiB or more, always;
  - rejects files of 50 MiB or more unless `ALLOW_LARGE_EVIDENCE=1` is set for a reviewed exception;
  - install it with `cp tools/git-hooks/pre-commit "$(git rev-parse --git-common-dir)/hooks/pre-commit"` (installed in this clone on 8 Oct 2026).

## History

- **Published history is never rewritten.**
- **An unpublished oversized object** may be removed only on the user's decision. Removal needs a one-for-one replay that preserves dates, and a permanent old → new map (precedent: `PUBLICATION_REWRITE_2026-10-08.md`).

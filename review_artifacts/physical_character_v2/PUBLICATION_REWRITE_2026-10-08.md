# Publication rewrite, 8 October 2026: old → new commit map

**Why.** One generated evidence archive made 33 unpublished commits impossible to push:
- `e2/evidence_smoke_H/runs_records_240_REF_165.tgz`, 105,822,358 bytes (Git blob `8091c762`);
- GitHub rejects any file over 100 MiB (104,857,600 bytes).

The rewrite occurred **solely to remove that unpublished > 100 MiB generated evidence object for GitHub publication.** The user decided it on 8 Oct 2026 (`sources/2026-10-08_user_decision_publication_rewrite.md`), explicitly without Git LFS.

**Scope.**
- **Rewritten:** the 33 commits after the last published commit `9578ccf` (6 Oct 04:56), from `e519c8f` (the commit that added the archive) to the then-local head `6e03afe`.
- **Not rewritten:** anything published. `9578ccf` and everything before it are unchanged, and the rewritten tail was pushed as a normal fast-forward.

**What changed in each commit, and what did not** (verified for every pair):
- **Tree:** the original tree minus that one path, which is present in commits 1 – 33. `git diff --name-status <old> <new>` shows only `D` of that path; every other file is byte-identical.
- **Order and boundaries:** unchanged. One new commit for each old commit, same parent chain, nothing squashed or reordered.
- **Dates:** author and committer name, e-mail and date are preserved exactly (the original author dates run from 6 Oct 05:26 to 8 Oct 03:00, +01:00). No date was invented or redistributed.
- **Messages:** the original text is unchanged, with three trailers appended:
  - `Publication-rewrite-of: <old full hash>`;
  - `Publication-rewrite-refs: old=new` for any rewritten commit the message cites;
  - `Publication-rewrite-note`.
- **The original objects** stay in the local repository under `refs/backup/physical-character-v2-pre-publication-rewrite-2026-10-08` (→ `6e03afe`). That ref is local only and is not pushed.

**Verification** (8 Oct, before pushing):
- 33 / 33 pairs: identical tree apart from the one path, identical parent mapping, identities and dates, and original message as prefix.
- No blob over 100 MiB is reachable from the new head; the largest in the rewritten range is 41.5 MB (`e2/evidence_dvg/logs/guard_traces.tgz`).
- A secret / personal-data scan of the rewritten tail found nothing.

## The removed archive: where it is, and how to regenerate it

- **Kept locally, outside Git:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-08_evidence_outside_git/physical_character_v2/e2/evidence_smoke_H/runs_records_240_REF_165.tgz` (SHA-256 `765df83e46cd2c8611b3acf366fb9ec5f022a838af5e8749a45048ed517c6626`, with `SHA256SUMS` and a README beside it). It is not uploaded anywhere.
- **What it is:** 16 raw per-run record files (`smk_PSTAR5BH|PSTAR5CH _ V2-REF|V2-165-62 _ L|R _ 240 _ f|l .json.gz`). They are a subset of the diagnostic non-test 128-job smoke matrix behind `E2_OVERNIGHT_REPORT.md` §8.
- **What stays committed:** the matrix's compact evidence, in `evidence_smoke_H/`. That covers the 128 run logs, `track_5BH|5CH`, `eval_5CH`, `matrix_rows.json`, `commit.txt`, `tree_status.txt` and `queue.log`. No report figure depends on the archive alone.
- **How it was made:** `e2/scripts/run_smoke_matrix_H.sh`, on a clean `git archive` of `9578ccf` (published and unchanged), 6 Oct 05:02 – 05:08. Line 23 tars the V2-REF and V2-165-62 240 Hz records.
- **To regenerate:** run that script with the worktree at `9578ccf`.
  - The simulation is deterministic (repeat runs are hash-identical in every battery), so the extracted records are expected to reproduce.
  - The tar / gzip container bytes need not match (timestamps).
  - It was **not** re-run during the rewrite.
- **Future archives of this kind** are kept out of Git by `.gitignore` (`runs_records_*.tgz`) and the evidence-storage policy (`EVIDENCE_STORAGE_POLICY.md`).

## References to rewritten hashes

- **Inside the rewritten commits,** documents and logs keep the hashes they were written with. They are historical snapshots.
- **At the head, after the rewrite,** each documentary reference to a rewritten commit carries both hashes: `old [published as new]`. This covers DECISIONS, the preregistrations, results and reports, and `e2/drafts/README.md`.
- **Machine-written run provenance** (`commit.txt`, `queue.log`) is not edited. A `commit.published.txt` beside each `commit.txt` names the published replacement.
- **Text records that keep the original hash** and are resolved by this table: `e2/evidence_vres/r1_provenance.txt` (`93f9548`, `c3034fa`), `e2/evidence_dvg_design/erratum_E1_and_cq6x_smoke.txt` (`b08b77a`), and the directory name `e2/evidence_dvg/aborted_first_run_b08b77a/`.
- **The Touchline Development Chronicle** (`touchline-current`) cites the published hashes and points here.

## Map (author dates, +01:00)

Full 40-character hashes, with committer dates and a per-commit "contained the archive" flag, are in `PUBLICATION_REWRITE_2026-10-08.tsv`.

| # | old | new (published) | author date | subject |
|---|---|---|---|---|
| 1 | `e519c8f` | `d202cac` | 2026-10-06 05:26 | physchar-v2(E2): servo re-validation S2 DOES NOT VALIDATE (V-1/V-2/V-4: reach-saturated el… |
| 2 | `0625226` | `ac4674e` | 2026-10-06 12:19 | physchar-v2(E2): PREREGISTRATION amendment A30 (user decision): nominal swing apex 25 -> 3… |
| 3 | `2310aa3` | `eaddffd` | 2026-10-06 12:26 | physchar-v2(E2): A30 PG-1 does NOT certify (0/32): gate PSTAR5CH refused (no validated tra… |
| 4 | `84b92b1` | `7bde433` | 2026-10-06 15:53 | physchar-v2(E2): SV-2 swing-servo validation PREREGISTRATION FROZEN (before any battery ru… |
| 5 | `d41b92a` | `9a538a7` | 2026-10-06 16:08 | physchar-v2(E2): 30 mm touchdown matrix analysis plan, written before the SV-2 evaluation … |
| 6 | `cd3cd8f` | `a7def97` | 2026-10-06 16:09 | physchar-v2(E2): PG-1 runner under A30 with the SV-2 allowance (PSTAR5CH, the 32 preregist… |
| 7 | `c3034fa` | `76f81d0` | 2026-10-06 16:29 | physchar-v2(E2): SV-2 swing-servo validation DOES NOT VALIDATE -> STOPPED (876/876 runs on… |
| 8 | `93f9548` | `84a6922` | 2026-10-06 18:48 | physchar-v2(E2): vertical-residual DIAGNOSTIC infrastructure (user decision 2026-10-06, ve… |
| 9 | `65b98ad` | `4afccb7` | 2026-10-06 19:17 | physchar-v2(E2): vertical-residual DIAGNOSIS (diagnostic only; nothing adopted; 884 matche… |
| 10 | `54629de` | `1a65417` | 2026-10-06 20:37 | physchar-v2(E2): A + B implemented (default OFF) and factorial validation PREREGISTRATION … |
| 11 | `0e832fb` | `b735b95` | 2026-10-06 21:42 | physchar-v2(E2): A + B factorial validation DOES NOT VALIDATE -> STOPPED at stage 2 (1728/… |
| 12 | `28f2632` | `3c46742` | 2026-10-06 22:03 | physchar-v2(E2): AB2 versioned A + B swing-contract amendment PREREGISTRATION FROZEN (befo… |
| 13 | `9f57fb0` | `bc3d558` | 2026-10-06 22:56 | physchar-v2(E2): touchdown coordinator DESIGN STOPPED before preregistration (substantive … |
| 14 | `b4c6e16` | `85758ab` | 2026-10-06 23:17 | physchar-v2(E2): AB2 A + B swing-contract amendment VALIDATES (1728/1728 on frozen 28f2632… |
| 15 | `d6d4868` | `c4c7061` | 2026-10-07 00:17 | physchar-v2(E2): user decision 1A/1B + touchdown timing saved verbatim; 1A/1B PREREGISTRAT… |
| 16 | `452cc60` | `0150ce8` | 2026-10-07 01:07 | physchar-v2(E2): 1A/1B implementation (default-off) + FREEZE step 2 before any battery run… |
| 17 | `9610cb6` | `e658953` | 2026-10-07 02:34 | physchar-v2(E2): 1A/1B validation results (frozen 452cc60, 2160/2160, G pass): 1A DOES NOT… |
| 18 | `d14d34f` | `3bb6752` | 2026-10-07 02:53 | physchar-v2(E2): overnight runway decision saved verbatim; TD2 touchdown-coordinator desig… |
| 19 | `5015dc6` | `d285f10` | 2026-10-07 03:33 | physchar-v2(E2): TD2 implementation (default-off: ctrl/v2_td2.js, CFG PSTAR5CHABTD, e2td r… |
| 20 | `63d489b` | `20d7837` | 2026-10-07 04:34 | physchar-v2(E2): TD2 validation results (frozen 5015dc6, 1824/1824): DOES NOT VALIDATE as … |
| 21 | `c99e536` | `6606ad5` | 2026-10-07 04:35 | physchar-v2(E2): overnight runway morning report (TD2 designed, preregistered, qualified, … |
| 22 | `13d2d09` | `b6fe3c0` | 2026-10-07 12:33 | physchar-v2(E2): user decision (next TD2 iteration) saved verbatim; TD2B PREREGISTRATION (… |
| 23 | `9cab1a9` | `2200cd9` | 2026-10-07 12:39 | physchar-v2(E2): TD2B implementation (default-off: TD2B params + escalationSegment in ctrl… |
| 24 | `0114429` | `4836364` | 2026-10-07 15:58 | physchar-v2(E2): TD2B validation results (frozen 9cab1a9, 2688/2688): DOES NOT VALIDATE on… |
| 25 | `4051ba2` | `8e0cf07` | 2026-10-07 22:56 | physchar-v2(E2): user decision (D1 guard + TD2C) saved verbatim; D1G + TD2C PREREGISTRATIO… |
| 26 | `3914a0c` | `19eb4d5` | 2026-10-07 23:29 | physchar-v2(E2): D1G implementation (default-off: d1Guard in ctrl/v2_stand.js - validity V… |
| 27 | `d0ad788` | `20e782d` | 2026-10-07 23:56 | physchar-v2(E2): D1G validation results (frozen 3914a0c, 774 jobs): DOES NOT VALIDATE as p… |
| 28 | `0214283` | `72506d0` | 2026-10-08 00:19 | physchar-v2(E2): user decision 2026-10-08 (rate-feed-forward domain-validity correction; 1… |
| 29 | `b25f0b0` | `f9e0a11` | 2026-10-08 00:45 | physchar-v2(E2): DVG (D1G v2) PREREGISTRATION (freeze step 1, before any repository DVG co… |
| 30 | `b08b77a` | `6b7ab90` | 2026-10-08 00:58 | physchar-v2(E2): DVG implementation (default-off d1Guard: 2 in ctrl/v2_stand.js: one verdi… |
| 31 | `7de6c00` | `d3f9bcc` | 2026-10-08 01:13 | physchar-v2(E2): DVG erratum E1 + FREEZE step 2b before any CQ evaluation: the guard now a… |
| 32 | `bd4c56e` | `b54bb6a` | 2026-10-08 02:19 | physchar-v2(E2): DVG combined qualification results (frozen 7de6c00, 1522 jobs): DOES NOT … |
| 33 | `6e03afe` | `e5ea11f` | 2026-10-08 03:00 | physchar-v2(E2): preserve the unadopted TD2C amendment A5 and E2 integration drafts (not a… |

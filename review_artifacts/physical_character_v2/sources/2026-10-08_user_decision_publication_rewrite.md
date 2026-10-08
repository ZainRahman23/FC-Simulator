# User decision (2026-10-08): publication rewrite of the blocked physical-character-v2 commits

Pasted by the user; reproduced exactly as received, below the rule.

---

Decision on the blocked 33 physical-character-v2 commits: remove the oversized generated evidence archive from the unpublished history. Do not use Git LFS for this file, and do not leave the 33 commits permanently local.
The file e2/evidence_smoke_H/runs_records_240_REF_165.tgz is generated simulation evidence and should not justify carrying a >100 MiB object in the normal Git history.
You may rewrite only the unpublished physical-character-v2 history beginning with the first commit containing that oversized object through the current local physical-character-v2 HEAD. Do not rewrite anything already published remotely.
Requirements:
1. Preserve the substantive source, preregistrations, decisions, reports, validation code and appropriate compact evidence from every affected commit.
2. Remove the oversized .tgz Git object from the rewritten history, not merely from HEAD.
3. Preserve genuine original author dates. Do not manufacture or redistribute dates to populate the contribution graph.
4. Preserve the original logical commit ordering and commit boundaries as closely as practicable. Do not squash the 33 commits merely for convenience.
5. Because hashes necessarily change, generate and retain a permanent provenance document mapping every rewritten old commit hash to its replacement hash and explaining that the rewrite occurred solely to remove an unpublished >100 MiB generated evidence object for GitHub publication.
6. Search the affected repository documentation, preregistrations, decision records and reports for references to rewritten hashes. Update references where they are intended to identify the corresponding commit. Where historical integrity requires retaining an original hash, record both the historical hash and its publication replacement rather than silently replacing history.
7. Preserve the actual oversized evidence file locally outside Git if it is still useful for audit/reproduction, and document where/how it can be regenerated from committed code/seeds/configuration. Do not upload it merely for the contribution graph.
8. Add/adjust .gitignore or the project's evidence-storage policy so generated archives of this kind cannot accidentally enter Git history again. Do not broadly ignore useful compact evidence.
9. Verify the rewritten history contains no Git object exceeding GitHub's ordinary limit and no secrets/private material.
10. Push the rewritten previously-unpublished physical-character-v2 tail normally. Do not force-rewrite already-published remote history.
After pushing, verify remote physical-character-v2 contains the complete intended history and report the old→new HEAD/hash mapping.
Do not change the GitHub default branch merely to make the contribution graph green. touchline-current versus the current visual-integration-v1 default is a separate repository-architecture decision for me.
Also do not create fake per-day commits. The authentic existing author dates are what I want represented.
Confirm whether the physical-character commits should begin appearing on the contribution graph immediately or whether they still require merge/reachability from the GitHub default branch. Do not alter history merely to force them to appear.
Make sure the daily chronicle and screenshot archive you just created remain committed and pushed, and retain the permanent start-of-day archive/publication rule.
When this publication repair is complete, stop and report to me. Do not start new E2 work yet.

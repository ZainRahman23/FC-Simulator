<!-- preserved verbatim from Claude session 6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4, transcript line 15074. -->

I need to reboot my Mac now. Stop all further development and make the entire current physical-character project state safely recoverable after a reboot.
Do not start locomotion or any new work.
Please:
1. Save/preserve everything from the overnight runway, including:
   - V1.1 promoted physical-character foundation;
   - C2 integration;
   - C3 corrective stepping;
   - C4 reactive arms;
   - C5 protective falls;
   - Gate D two-character work;
   - D6 physical slide tackle;
   - all reports, proposals, measurements, test fixtures, review artifacts and relevant source changes;
   - the locomotion proposal;
   - the overnight consolidated report.
2. Inspect the current worktree for modified, staged and untracked files. Do not assume the existing local commits contain everything.
3. Make whatever local checkpoint commit(s) are necessary so that all source/configuration/test/documentation needed to resume the work is preserved. Do not push anything to GitHub.
4. Review generated/heavy review media separately. Preserve anything necessary to reproduce or understand the accepted/partial gates, but do not accidentally commit huge disposable captures if the project's existing policy keeps them outside Git. If important untracked evidence should remain outside Git, preserve it in the existing snapshot/review-artifact structure and explicitly tell me where it is.
5. Verify the existing preserved snapshots/checkpoints are intact, particularly the V1/V1.1 and overnight physical-character work.
6. Update the project/session handoff or memory so a fresh Claude session after reboot can determine:
   - current branch/worktree;
   - current architecture;
   - which gates are Pass / Partial / off-by-default;
   - V1.1's promoted status;
   - known C3/C4/C5/D6 limitations;
   - where the overnight report and locomotion proposal live;
   - that locomotion is the next unresolved architectural decision;
   - that nothing has been pushed.
7. Run only lightweight integrity checks now:
   - git status;
   - current branch;
   - current HEAD;
   - local commits not on a remote;
   - confirm required files/snapshots exist.
Do not rerun expensive physics/regression/browser suites just for shutdown. We already have the validation evidence. I want the Mac ready to reboot, not another long validation run.
8. Shut down any temporary processes that are safe to stop, including the server on port 8171 if appropriate. It does not need to survive reboot.
9. Give me a final REBOOT SAFE summary containing:
   - worktree path;
   - branch;
   - HEAD commit;
   - local checkpoint commit(s);
   - git status;
   - location of non-Git preserved artifacts/snapshots;
   - overnight report path;
   - locomotion proposal path;
   - exact command(s) to resume after reboot;
   - exact URL/command to restart the review harness;
   - confirmation that nothing was pushed.
Then stop. Do not perform any further development.

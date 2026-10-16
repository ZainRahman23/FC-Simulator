# User instruction, 2026-10-16 (verbatim): TURN-1.2 freeze / publish / handoff

- Pasted by the owner into the Claude Code session at 2026-10-16T14:33:01.978Z UTC (EEST = UTC + 3), after the TURN-1.2 report (head 634bf20d).
- Saved under the standing rule (every owner instruction verbatim). The block below is reproduced exactly as received.

---

TURN-1.2 FREEZE / PUBLISH / HANDOFF
TURN-1.2 is owner-approved as the current locomotion baseline.
Do not make any further locomotion, animation, resolver, threshold, braking, shuffle, pivot, or visual changes.
This is a short closeout task only.
1. Freeze the exact current TURN-1.2 implementation and all parameters.
2. Preserve TURN-1 and TURN-1.1 history/evidence; TURN-1.2 is now the current approved development baseline.
3. Run only the necessary final regression/sanity checks to ensure the committed state is clean, deterministic, and matches the reviewed TURN-1.2 result. Do not use test failures as permission to redesign anything; report unexpected failures instead.
4. Save a concise handoff recording the current architecture, resolver thresholds/logic, movement families, known accepted V1 limitations, relevant commits, and exact interfaces needed by future DRIBBLE-1 work—especially foot state, foot prediction, plant/contact timing, and continuous-input behavior.
5. Commit any closeout documentation only. Do not alter production behavior.
6. Publish/push the approved work according to the project's existing publication workflow. Verify the remote contains the intended commits.
7. Confirm the worktree is clean and report the final branch + commit/hash.
8. Do not begin DRIBBLE-1, ball work, further locomotion polish, or any new milestone.
Final response should be brief:
TURN-1.2 FROZEN: YES/NO
BEHAVIOR CHANGED DURING CLOSEOUT: YES/NO
FINAL REGRESSION: PASS/FAIL
DETERMINISM: PASS/FAIL
HANDOFF SAVED: YES/NO
PUBLISHED/PUSHED: YES/NO
WORKTREE CLEAN: YES/NO
FINAL BRANCH:
FINAL COMMIT:
READY FOR DRIBBLE-1 WHEN INSTRUCTED: YES/NO
Then stop and wait for my next instruction.
Do not improve anything. The reviewed TURN-1.2 behavior is what I am approving and freezing.

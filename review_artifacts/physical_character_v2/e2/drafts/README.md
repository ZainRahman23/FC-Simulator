# Unadopted drafts (preserved, not applied)

These two drafts were prepared on 8 Oct 2026 (00:59 – 01:01 BST) in a temporary scratch tree, ahead of the DVG combined qualification. `DVG_RESULTS.md` §3 refers to them as "the prepared TD2C amendment" and the E2 integration "drafted in a scratch tree". They were moved here during the 8 Oct publication housekeeping, so a reboot clearing the temporary directory cannot lose them.

**Neither is applied, validated or adopted.** The repository code is unchanged. Applying either one depends on the user's decisions in `DVG_RESULTS.md` §3.

| file | what | apply |
|---|---|---|
| `TD2C_AMENDMENT_A5_amend_td2c.py` | TD2C amendment A5 (`DVG_PREREG.md` §5.4): TD2C runs with the adopted DVG (configurations PSTAR5CHABV / PSTAR5CHABTDV and DVG's guard-law checks only; conditions and criteria unchanged) | `python3 TD2C_AMENDMENT_A5_amend_td2c.py <worktree root>`, after a DVG adoption decision |
| `E2_INTEGRATION_DRAFT.patch` | E2 integration draft: a non-test step runs approach → search → measured TOUCHDOWN → acceptance → DONE (`ctrl/v2_footstep.js`, `ctrl/v2_step.js`, `tools/e2_run.mjs`) | `git apply` on `bd4c56e` (checked: applies cleanly) |

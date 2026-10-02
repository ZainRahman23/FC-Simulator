# Scratch probes (preserved, NOT maintained)

These are the one-off diagnostic, analysis and batch scripts written during Physical Character V1 research (2026-09-30 → 2026-10-02). They were copied verbatim on 2026-10-02 from the volatile session scratchpad `/private/tmp/claude-501/…/d4761610-…/scratchpad/`. The folder structure mirrors that scratchpad.

- **They are evidence of how numbers in the reports were produced. They are not tooling.**
  - Many hard-code absolute paths: the worktree, and the scratchpad for their outputs.
  - Some import from the overnight `lib.mjs` helper.
  - Expect to adapt paths before re-running any of them.
  - Maintained tooling lives in `sandbox/visual/physchar/tools/` and `tools/stepper/`.
- **Their raw outputs,** and the scratch files that are not scripts (JSON / logs / viewer data, backup copies of `pc_*.js`), are in the non-Git snapshot: `_preserved_2026-10-02_physical_character_v1_final/volatile_scratch.tgz`.
- **Scripts behind numbers in the final Physical Stepper review** (`g2_stepper/G2_STEPPER_REVIEW.md`):
  - `x/decomp.mjs`: §9.2, shared vs per-candidate surrogate error.
  - `x/smooth.mjs`: §9.3, the per-state quadratic floor at the next step start; the touchdown comparison is the committed `tools/stepper/smooth_td.mjs`.
  - `x/region.mjs`: the walking-region accuracy.
  - `x/prof.mjs`: snapshot / restore / tick cost.
  - `x/mat/run*.sh`, `x/mat/live/run_live.sh`: the matrix and live batches.
  - `x/regress/run_all.sh`: the full regression run (regress.sh + G2W_A8 + foot gate F0 / F2h slow).
- **Earlier phases** (directory names follow their scratch use):
  - `fg/`: foot gate;
  - `g1b/`: G1b;
  - `g2/`, `g2b/`, `g2c/`: G2a / G2b / G2 plant characterisation;
  - `w2/`: walker;
  - `sp/`: speed / swing;
  - `u/`: unified controller;
  - `x/`: overnight runway + Physical Stepper.

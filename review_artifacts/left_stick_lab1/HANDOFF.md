# HANDOFF — TOUCHLINE — LEFT-STICK INPUT LAB V1 (24 Oct 2026)

**NO INTENT RECOGNIZER EXISTS YET.** This lab is an instrument. It records the owner's stick input against the canonical footballer, as evidence for designing Intent Recognizer V1.

- **Branch:** `prototype/left-stick-intent-v1`, from the milestone `f775daac`. It adds files only; the canonical code is unchanged. Worktree: `~/Downloads/FC Simulator worktrees/left-stick-intent-v1`.
- **Page:** http://127.0.0.1:8362/sandbox/visual/lsi1_lab.html. Serve it from the worktree root with `python3 -m http.server 8362 --bind 127.0.0.1`. **Local only** (a real player's model).
- **Report:** `LEFT_STICK_LAB_REPORT.md` covers what is recorded, the pipeline, the signals, the state fields, the schema, the workflow, comparison, verification and limitations.
- **Owner's instruction (verbatim):** `sources/2026-10-24_user_instruction_left_stick_input_recorder.md`.

## Analysing the owner's recordings (the next step, after the owner has recorded and reviewed)

The owner exports `TOUCHLINE_LEFT_STICK_RECORDING_V1` JSON from the lab (ATTEMPTS → EXPORT). Keep the files in `recordings/`.

```sh
cd sandbox/visual/lsi1/tools
node lsr_report.mjs ../../../../review_artifacts/left_stick_lab1/recordings/*.json            # per attempt + per label (--anchor mark|d150|omega|dzexit|release|start)
node lsr_verify.mjs <file.json>                                                               # node ≡ browser (hash, state, derived, the pipeline)
```

Everything in an attempt is columnar and self-describing (`lsr_schema.js`, report §5). The derived signals can be recomputed at any level from `frames` (`lsr_signals.js analyzeSamples`). The state can be re-sampled from a node re-simulation (`lsr_state.js sampleState` on `makeSim("TL", session.o0)` stepped with `unrleInput(session.inputRLE)` + `session.events`).

## Re-run the evidence

```sh
cd sandbox/visual/lsi1/tools
node lsr_test_signals.mjs                                         # the recorder tests: 129 checks
node lsr_verify.mjs ../../../../review_artifacts/left_stick_lab1/evidence/lsr_recorder_tests.json
PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir with puppeteer-core> node lsr_browser.cjs --out <dir> --shots <dir> [--cpu 20]   # needs the :8362 server
node ../../../../review_artifacts/left_stick_lab1/tools/milestone_regress.mjs --out <dir>   # the milestone's suites vs its committed evidence
bash ../../../../review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh
```

## Rules carried over

- Do not modify any canonical file (vocab2 and earlier); the lab frames them.
- Do not resurrect the old analog feint.
- No automatic Body Feint or Croqueta.
- No thresholds, recognizer or buffering until the owner has recorded and reviewed.
- Screenshots of the lab show a real player's model. Keep them out of Git and off the web.

## Later (24 Oct, OWNER INPUT ANALYSIS V1)

- **The owner's first session:** 21 real attempts, saved as `recordings/owner_2026-10-24_session1_21attempts.json`. They are analysed in `../owner_input_analysis1/`; start with its `HANDOFF.md`.
- **One lab change: the pad placement.**
  - **pad at left** is the default and is unchanged.
  - **pad at centre** is set with `?pad=centre` or the top-bar selector.
  - Each attempt records the placement as `input.padPos`.
  - **Why it was added:** with the pad 12 px from the window's left edge, a mouse drag stops at the screen edge, 1.38 stick radii from the pad's centre. That happened in 14 of the owner's 20 gestures.
- **The G mark** is set in REVIEW: scrub to the instant you meant the gesture, then press G or MARK.

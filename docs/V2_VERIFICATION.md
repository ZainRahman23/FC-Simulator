# Touchline v2 verification

The Claude build was resumed from the unfinished working tree on 2026-09-30. Implementation is being integrated on `claude/coach-mvp`, for review in PR #1 against `touchline-current`.

## Functional evidence

| Area | Verified result | Coverage |
|---|---|---|
| Existing backend | 49 tests pass in the final broad rerun (376.77s) | Mapping, native parity, persistence/recovery, rewind, management, analysis, scenarios |
| New build/backend | 70 tests pass | All 52 card compilers/appliers; pure training; real Analyst and three-week stress futures; Ghost fixtures/persistence; atomic budgets; failed ranked attempt remains consumed; presented-clock reports; replay and expiry; frozen CPU policy; named CPU systems |
| Engine hooks | 33 tests validated: 32 broad, 1 added targeted | Nine frozen ledger cases, including explicitly unset hooks; set pieces; all new shapes/remaps; scheduled effects; partner departure on substitutions and red cards |
| Existing engine | 100 tests pass | Native football simulation regression suite |
| Browser | 27 cases validated, including targeted reruns | System/training persistence, exact card drawer, presented-clock card play, league round, Broadcast, career and Analyst stress |
| Balance plumbing | 9 tests pass (7.1s) | Source/scale isolation, per-future resume, 3/1/0 points, paired null comparison, calendar/training progression, JSON provenance; actual CPU match/checkpoint score identity and canonical system contexts |

JavaScript syntax and `git diff --check` pass. The final substitution-window run passed its new case plus all nine legacy ledger identity cases (10 tests, 48 seconds). The standalone formation harness reproduces an existing smoke row exactly after removing its pytest dependency.

The initial two backend failures were an exact-key test rejecting additive goals in the insight window, and a manual tempo/press change inaccurately labelled as sending more men forward. The contract test now allows added fields; the decision label now lists the actual changed instructions. Browser follow-ups are recorded in the UI progress logs.

The screenshots in [the walkthrough](../README_TOUCHLINE.md) are captures of the actual running app, not UI mockups. The final post-freeze career match finished Everton 0–3 Liverpool; banner and Review both showed 5.46–0.00 penalty-inclusive xG, all nine CPU fixtures completed in 16.2 seconds, and no JavaScript errors occurred. The relevant live-card and full-career-round cases passed again (2 tests, 24.9 seconds).

## Balance status

**Release balance remains unverified. Functional test passes do not certify game balance.**

- The earlier three-season, engine-only study measured excessive draws, ineffective home advantage and concentrated striker scoring. It is historical evidence, not a current-build acceptance result.
- Earlier v2 browser captures produced Liverpool 11–0 and 13–0 Everton. The exact 13–0 request replay matched the recorded ledger; without its one Tactical Foul card it still finished 9–1. CPU named-system application was subsequently corrected. These are diagnostic captures, not final-snapshot acceptance evidence. Statistical analysis must establish the scoring tail after the fix.
- The existing formation report contains 16 paired seeds per setup/shape. It exercises execution, but the requested 200-seed calibration remains pending.
- The effect-table placeholder has `calibrated:false`; the UI reports unavailable estimates honestly. A card receives measured previews only after its own calibration evidence passes.
- The [generated balance report](../tools/balance/report.md) states sample sizes, source versions and method limits. The [remote run receipt](v2_progress/remote-balance.md) records running smoke job 1801 and 200-seed formation job 1797, plus dependent medium 1802 and full 1803, with source hashes and retrieval commands.

State sampling now uses progressed CPU-card season records and their immutable prepared requests, preserving actual system IDs, training, familiarity and frozen CPU policy at kickoff. The regression checks the recorded goal timeline against a 30-minute checkpoint and verifies exact final-score replay.

Large sweeps use a frozen snapshot and Slurm CPU allocations. They do not run on the remote login node or consume the laptop's full CPU. Intermediate matches and paired futures persist so interrupted jobs can resume compatible work.

## Engine changes and scope notes

E1 introduces designated corner/free-kick/penalty takers with fallback. E2 introduces additive match modifiers, optional partner dependencies, expiration and scheduled commands. E3 adds 4-4-2, 3-4-3 and 5-3-2 with slot/remap support. E4 introduces corner zones and targets. All are input-gated; flags-off identity remains exact.

Build preparation stores immutable player bases plus explicit modifier layers and calibrated CPU policy models, so changing the effect table cannot change old replay choices. Named CPU systems apply their actual formation, tactics and roles by default; an explicit false override is respected. Live/full-time xG includes penalty probabilities consistently, while non-penalty xG remains separately available. A departing partner removes only the dependent layers, preserving unrelated familiarity modifiers. Card effects are validated on a clone before mutating the live match and are recorded as one versioned command for deterministic replay.

Custom systems initially have nine unlocked cards, so their minimum deck size is the lesser of ten and the unlocked pool size. The camp stress test charges the entire camp week's Analyst budget. Ghost ranking reserves the first attempt before simulation; failed attempts remain consumed. Anonymous browser identities are not account-level anti-cheat.

V2 substitutions enforce five players in three in-play windows; same-clock batches share a window and the 2700-second halftime boundary is exempt. Legacy requests retain their original behavior. Loans and sell-on clauses remain the explicitly deferred Phase 2 scope. Economy modelling covers scripted Liverpool strategies with exported app constants, not a full interactive transfer/injury career for every club size. These limits and outstanding calibration gates remain visible in the PR.

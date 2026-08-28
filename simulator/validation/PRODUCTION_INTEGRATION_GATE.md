# PRODUCTION INTEGRATION GATE — Hybrid-C + cal12 into fc_simulator

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the gate. **No deploy, no cleanup, no tuning, no cal13, no renderer work.** Live RC8 process untouched and healthy throughout; save DB byte-identical (`b2092e4415533069…`).

## Verdict on the §11 question: **IDENTICAL**

The production-integrated engine reproduces the accepted candidate **bit-for-bit**: all 20 matched seeds produce identical trace hashes AND identical scores; harness-level family results are identical to the digit; even the chunked-execution hash matches the candidate's recorded value across implementations (`369ce65c1fcdf8aa`). No "explained differences" were needed anywhere.

## Files changed (exactly as pre-declared)

| file | action | hash |
|---|---|---|
| `fc_simulator/engine.py` | MODIFIED: inserted the byte-verified 8,680-B brain/body seam block (relative-import form) before `_build_result`; added a 4-line lazy flag branch at the top of `run()` | `429ec3eb301495a9` |
| `fc_simulator/world.py` | NEW: the accepted physical body — **byte-identical copy** of candidate `body.py` | `c4c7a761c6672ec9` (= candidate) |
| `fc_simulator/continuous.py` | NEW: the accepted adapter+execution layer (candidate `lab.py ce6a0ac1…` + `hybrid.py 68048902…` merged); **wiring-only changes**: package imports, engine passed in by caller, `_eff_attr`/`_add_load` from `.fatigue`, `run_continuous()` entry | `6d889b508d8b728a` |
| `fc_simulator/worldflags.py` | NEW: `WORLD={"CONTINUOUS": False}` + `CAD_PROFILE` (accepted D2+aerial values verbatim) | `26e515c9884de490` |

Untouched: calibration.py, players.json, all other engine modules, DB, renderer, server. **No behavioral constant of any kind was altered** — xG, candidacy, finishing, GK, passing, tackling, fatigue curves, attributes, tactics, decision utilities, cadence parameters, foul/card logits, aerial frequency: all verbatim from the accepted candidate. Causal ownership preserved exactly (brain decides, body resolves; no pre-sampled steering; no OVR).

## Freeze & rollback

Checkpoint: `simulator/checkpoints/pre-integration-hybridc-cal12-20260826.tar.gz` (full `fc_simulator/` + players.json). **Rollback = restore the tarball** (or: revert `engine.py` from it and delete the three new files). Additional safety: flags default OFF, so even the current tree serves legacy cal11 bit-for-bit; the live RC8 process was never restarted and runs the pre-integration code from memory regardless.

## Proofs (per §5/§6/§7)

1. **Flags-OFF bit identity** — native behavioral digests (score + full event stream + RNG audit tail) identical on 3 seeds BEFORE vs AFTER every integration step (`3d342b2f92…`, `66c42eb968…`, `60f9161dbb…`).
2. **Incremental steps** — world module (no engine change) → seam block insertion (native digests re-proved) → adapter port → flag branch (native digests re-proved again). No step proceeded with an unexplained divergence; zero divergences occurred.
3. **Matched-seed candidate↔production parity** — direct adapter: exact hash equality; full `MatchEngine.run()` flag-ON path: exact hash + score equality (`db6dd6d1346417b8`, 5–1); **20/20 battery seeds PARITY True** (`prod_battery.out`).
4. **Determinism** — same-seed reproducible across processes (battery + direct runs); chunk-independent (`369ce65c1fcdf8aa` = candidate value); 20 distinct hashes across seeds (divergence). RNG consumption order unchanged by construction (byte-derived logic) and verified by the hash equalities.
5. **Regression batteries on the production modules** (compat shim `integration/prod_parity_env.py` rebinds the accepted harnesses to `fc_simulator.*`): micro-gates A–J **10/10 PASS**; duels/shooting/GK/passing monotone tables **identical to the candidate to the last digit**; possession ecology identical to the digit (flips 8.43, spell 4.71 s, re-flip 0.413, melee 10.27). (Micro-gate narrative numbers vary per process due to the harness's known salted-`hash()` park placement — documented harness artifact; the seeded batteries are the parity instrument.)
6. **Flag-ON end-to-end** — `MatchEngine.run()` returns a `MatchResult` (score + player states with body-fed energy/distance + `result.continuous` payload: match events ledger, wakes, decisions, violations=0). Full event-ledger/timeline parity with the abstract schema remains minimal by design (documented below).

## Performance

Native path ≈ 3 s per 90-min match; continuous path ≈ 43 s per 90-min (≈14×; ~125× real-time). Acceptable for the lab and turn-based/simulated-round use; a performance pass is a future workstream if live-tick serving ever needs it.

## Shooting finding — preserved, NOT fixed (§8)

R1 carried forward verbatim: xG/shot ≈ 0.105 (plausible), goals−xG ≈ +1.32/match concentrated in low-xG shots (on-target 54% vs ~35% real; GK 62% vs ~70%). **Proposed as the first post-integration calibration workstream** (forensic study of shot-distance dispersion / physical finishing execution / GK coverage) — *not executed, awaiting authorization*.

## Other limitations carried forward unchanged (§9)

Aerial contest frequency (R2), strict shot candidacy vs real junk volume (R3), workload density (R4), halftime recovery port (R5 — note: still unported; flag-ON matches end without halftime recovery exactly as the candidate did), header-shots (R6), off-ball fouls/advantage (R7), corner/throw-in rates (R8), 1v1 harness artifact (R9), measurement-tooling passive-mirror QA item (R10), presentation compression measured-not-implemented (R11). Also documented: `result.continuous` is a minimal ledger — full production event-schema/timeline mapping (for app UI parity) is a named integration-completion item for the cleanup phase.

## Visual evidence (§10)

Because production parity is bit-exact, the production replay **is** the candidate replay: `viewer_cal12.html` on **:8303**, now with **26 bookmarked clips, all from battery seed 789335328** (first-occurrence selection, no cherry-picking): buildup, pressing, sustained possession, take-on success/fail, tackle, interception, short/long/through pass, cutback, near/far-post crosses, box-run received/unserved, multi-player box occupation, final-third attack → shot, GK parry, goal, foul+live restart, offside, aerial contest, strong- and weak-team counters, physical kickoff reset, and a late-match fatigue sequence (84').

---

**STOP.** Old engine path intact and default. Awaiting your review of the replay and parity evidence before cleanup, calibration, or deployment is authorized.

# E1a rerun with configuration version PSTAR: results

**Authority and frozen inputs:**
- **Authority:** `../sources/2026-10-05_user_instruction_preswing_contact_boundary_runway.md` ("If that candidate genuinely passes, adopt the justified fixes and rerun E1a exactly as frozen").
- **Candidate validation:** passed in full (`../preswing/PRESWING_RESULTS.md`, PS-2).
- **Protocol and criteria:** unchanged (`../final_pre_e1a/E1_PREREGISTRATION.md`, `../knee_correction/E1_PREREGISTRATION_V2.md`, `E1A_HARNESS.md`).
- **Configuration:** `../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`.
- **Harness:** the frozen `tools/e1a_run.mjs` / `tools/e1a_eval.mjs` with the configuration-version option only (6413a6b). The default reproduces the official run hash-identically.

**Run:**
- A clean scratch copy of **3da5e5e** (`pstar/commit.txt`, tree clean).
- 10 runs: 8 bodies with the left foot lifted, the mirrored V2-REF right-foot run, and the V2-REF repeat.
- Evidence: `pstar/runs/` (full per-tick rows and playback poses) and `pstar/e1a_eval.log` / `.json`.

## 0. Bottom line

**E1a PASS.** Every criterion E1a-1 … 17 passes on all 8 bodies and the mirrored V2-REF run. E1a-11 determinism: 21 / 21 hash marks identical (end cec8d7f8).

**What the runs show:**
- Each run unloads, releases (TOUCHING ≥ 0.5 s), lifts 5 mm, hovers, touches down once (no bounce) and re-accepts load once.
- It returns to a valid two-foot state.
- No abort, no chatter, no energy event, no limit approach.

## 1. Per-run key values (`pstar/e1a_eval.log`)

| run | hover error max / RMS (mm; limit 3 / 2) | hover clearance min (mm; ≥ 3 for 80 %) | ξ margin during hover (cm; ≥ 1) | applied Δτ / commanded Δτ0 max (N·m; ≤ 10 / 30) | touchdown offset (mm) / impact (% BW) | load tracking \|Δ\| (≤ 0.10) | stance slip (mm; ≤ 1.0) |
|---|---|---|---|---|---|---|---|
| V2-REF L | 1.21 / 0.40 | 4.47 | 4.30 | 4.83 / 4.84 | 0.25 / 0.2 | 0.007 | 0.326 |
| V2-165-62 L | 1.14 / 0.38 | 4.51 | 3.90 | 3.48 / 3.49 | 0.24 / 0.2 | 0.007 | 0.319 |
| V2-198-92 L | 1.28 / 0.42 | 4.44 | 4.68 | 6.22 / 6.24 | 0.26 / 0.2 | 0.007 | 0.300 |
| V2-175-70 L | 1.15 / 0.37 | 4.52 | 4.14 | 4.17 / 4.18 | 0.25 / 0.2 | 0.007 | 0.306 |
| V2-190-85 L | 1.24 / 0.41 | 4.45 | 4.49 | 5.49 / 5.51 | 0.25 / 0.2 | 0.007 | 0.301 |
| V2-short-legs L | 1.24 / 0.39 | 4.40 | 4.30 | 4.84 / 4.85 | 0.23 / 0.2 | 0.009 | 0.308 |
| V2-long-legs L | 1.10 / 0.39 | 4.58 | 4.24 | 4.83 / 4.84 | 0.27 / 2.0 | 0.006 | 0.279 |
| V1-matched L | 1.24 / 0.41 | 4.46 | 4.49 | 5.05 / 5.06 | 0.25 / 0.1 | 0.007 | 0.280 |
| V2-REF R (mirrored) | 1.18 / 0.38 | 4.51 | 4.30 | 4.84 / 4.84 | 0.25 / 0.2 | 0.007 | 0.288 |

## 2. Erratum E1-3: E1a-10's swing-leg soft-limit sub-check was vacuous (harness defect, verdict unchanged)

- **The defect:** `tools/e1a_run.mjs` captures the bounded-IK result by the wrong argument index (`IKcap[a[3]]`, which is the pelvis-position array, instead of `a[2]`, the leg index). So E1a-10's "swing-leg solved coordinates never beyond their soft limit by > 2°" sub-check printed "bounded IK not used" and never evaluated.
- **Scope:** this holds in the original official run (no lift was ever reached) and in this rerun. The hard-limit and swing-knee-flexion parts of E1a-10 were evaluated (smallest hard-limit margin 8.96°; swing knee flexion ≥ 3.96°).
- **Independent check:** a diagnostic copy of the harness with only the index corrected (`pstar/diag_softcap/`; its runs are hash-identical to the official PSTAR runs) measures the smallest soft margin of the solved swing-leg coordinates. Over V2-REF, V2-short-legs and V2-long-legs, it is **≥ 0.88° inside** the soft limits (criterion: ≥ −2°). By construction the non-supporting leg's IK is box-bounded to its soft limits.
- **Status:** the frozen harness is not edited; this is recorded as an erratum next to the frozen text. Any future E1 harness built from it must use the corrected index. The E1b harness copy inherits the same capture line; its E1a-10 sub-check is equally vacuous, and E1b reports the same independent measurement.

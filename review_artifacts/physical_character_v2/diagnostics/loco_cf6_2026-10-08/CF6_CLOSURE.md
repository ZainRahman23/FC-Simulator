# CF-6 — CLOSED as evidence (8 Oct 2026)

**Decision:** `../../sources/2026-10-08_user_decision_pivot_supported_locomotion_slp1.md` (verbatim). Recorded in `../../DECISIONS.md` (2026-10-08, architecture pivot).

**What is unchanged:**
- CF-6 is closed exactly as reported.
- Nothing in this folder has been altered:
  - `CF6_PREREGISTRATION.md` (frozen 1e98e1d);
  - `CF6_RESULTS.md`, `evidence/`, `replay/`, `analysis/`, `scripts/` (b6edadc);
  - the replay viewer (7651a25).
- CF-1 … CF-5 and the speed ladder remain historical evidence as committed.

**Architectural reading (the user's decision, recorded):**
- CF-6 demonstrated **59 consecutive genuinely continuous steps at 0.10 m/s**, with convergence and no accumulating physical instability.
- The higher-speed failures (L1 0.4 m/s at step 2, 0.2 m/s at step 9) occurred in the gait / planning / control layer. They did not establish a C-class structural body limitation.
- The 0.10 m/s motion is **not** considered production-quality walking. It is evidence about repeated physical support stability.

**Consequences:**
- No further autonomous-gait development.
  - No CF-7.
  - None of the CF-6 report's "next experiment" options (handover amendment, completeness runs) will be run.
- Production locomotion moves to the simulation-authoritative supported physical character, starting with SLP-1 (`../../slp1/`). V2 remains the physical character.
- TD2C / E2 stay where E2-22 left them. They are not resumed by this decision.

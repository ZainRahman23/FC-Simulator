# TD2B: DOES NOT VALIDATE. Every condition except out-of-envelope early terrain passes, including physics-rate invariance; earlyOOE fails integrity (B-9) and handling (B-11) → STOPPED

**Authority:** `../sources/2026-10-07_user_decision_TD2_next_iteration.md`.

**Preregistration:** `TD2B_PREREG.md`:
- design, window, escalation and bounds committed in 13d2d09 [published as b6fe3c0], before any TD2B code;
- freeze in 9cab1a9 [published as 2200cd9] with amendments A1 – A3, before any battery run.

A2 disclosed before the battery the smoke blow-up on earlyOOE V2-198-92 L 480 H-D and the prediction that B-9 may fail.

**Battery:** `scripts/run_td2b_val.sh` on a clean archive of 9cab1a9 [published as 2200cd9]. 2,688 / 2,688 runs (12:40 – 14:22); 0 runtime reachability exclusions.

**Evidence** (`evidence_td2b/`):
- `td2b_eval_summary.txt`, `td2b_eval.json.gz`;
- `logs/`;
- `records_240_REF_198/`;
- `diagnostics/` (post-hoc, labelled).

**TD2 stays a FAIL** (`TD2_RESULTS.md`).

**Stop rule applied:** no E2 integration, no servo re-qualification, no PG-1, no official E2. Nothing is pushed.

## 1. Verdicts

| item | result |
|---|---|
| B-G1 identity + TD2 regression | PASS: KV0; 99c29491; b62309f5; 3dd9f13d; b63184da × 4; 58 / 58; TD2 records c76cadc7 / 56717579 reproduced |
| B-G2 determinism | PASS (432 / 432 vs FB) |
| B-G3 completeness / exclusions | PASS |
| B-1 AB2 swing contract | PASS |
| B-2 premise | PASS (nominal / earlyC / lateC) |
| B-3 contact kinematics | PASS (in-window + beyond) |
| B-4 touchdown | PASS (in-window + beyond) |
| B-5 E1a-7 | PASS: **0 violations** in nominal, earlyC, lateC, beyond, noground (2,256 runs) |
| B-6 support / B-7 placement | PASS |
| B-8 search floors, escalation, explicit failure | PASS |
| **B-9 energy / integrity** | **FAIL:** 170 earlyOOE runs (closure up to 477 J / tick, Σ+ up to 208 J). Every other condition passes |
| B-10 physics-rate invariance | **PASS** (every bound, every pair 180 / 480 vs 240 Hz; nominal, earlyC, lateC, beyond) |
| **B-11 earlyOOE handling (E2 §2a)** | **FAIL:** 16 runs (12 aborts, 15 not both SUPPORT at the end). Every acceptance happened at ≥ 60 % (φ 0.81 – 0.82) |

## 2. Touchdown measurements (median / max)

| condition | contact (ms after the search start) | downward speed (mm/s) | horizontal foot speed max (mm/s) | impact, instantaneous (% BW) | E1a-7 violating runs | rebounds |
|---|---|---|---|---|---|---|
| AB nominal | (approach, φ ≈ 0.9) | 59 – 77 / 122 | 91 | 20 – 35 / 60 | 14 | 32 |
| TD nominal | 148 – 152 | 22 – 25 / 30.5 | 30.6 | 5 – 6 / **12.0** | **0** | 0 |
| TD earlyC (+0.05 mm) | 148 | 23 – 26 / 31.0 | 29.1 | 6 / 14.3 | 0 | 0 |
| TD lateC (−0.05 mm) | 153 – 154 | 22 – 25 / 30.4 | 30.4 | 5 / 10.0 | 0 | 0 |
| TD beyond (S-LATE, escalated search) | 1,080 – 1,087 | 8.7 / 9.4 | 2.5 | 1 – 3 / 7.7 | 0 | 0 |
| TD noground | no contact; explicit failure in 96 / 96 runs; stance held | — | — | — | 0 | — |
| **TD earlyOOE (+10 mm)** | −194 … −199 (in the approach) | 170 – 195 / **255** | 189 | 98 – 123 / **281** | **432** | **432** |

**Also:**
- **Load to support:** LA → SUPPORT ≤ 0.104 s.
- **Placement:** ≤ 3.15 mm (in-window, beyond).
- **Penetration:** 0 (in-window, beyond).
- **Touchdown-time spread across rates** (diagnostic; no longer gating): median 0.7 – 3.5 ms, max 7.6 – 11.8 ms.

## 3. Causal diagnosis of the earlyOOE failure (`diagnostics/`)

1. **Unexpected collision at swing speed.** The turf is 10 mm higher than planned, so the foot meets it at φ ≈ 0.81 during the approach descent, at median 178 mm/s (max 255). No coordinator can make this contact slow: it lies outside the certified window by design (§1 of the prereg).
2. **E2's existing hand-back overshoots into the surface.** Acceptance starts the hand-back C2 from the still-descending reference state, so the reference goes **3.3 – 4.3 mm below the landed anchor**, i.e. into the turf, in every run.
3. **Unreachable IK, then a singular D1.**
   - In 121 / 432 runs the IK target then becomes unreachable (residual > 10⁻⁶; up to 0.98).
   - The resolved-acceleration feed-forward D1 (`swingAccFF`, part of the qualified baseline) evaluated at those near-singular configurations makes the **commanded** torque explode (up to 2 · 10¹⁸ N·m). The actuators clamp the applied torque, and energy is injected.
   - 111 of the 169 per-tick closure failures coincide with an unreachable target. The other 58 come with the violent impact itself (impact 98 – 281 % BW, rebounds in every run).

**Counterfactuals** on 24 heavy cases (8 bodies × L × 180 Hz × R-L / C-L5 / H-D); `diagnostics/earlyOOE_counterfactuals.txt`; nothing adopted:

| variant | closure > 0.05 J / tick | Σ+ > 0.5 J | aborts | not both SUPPORT | max commanded Δτ0 (N·m) |
|---|---|---|---|---|---|
| frozen | 22 | 19 | 3 | 4 | 5.7 · 10¹⁶ |
| hand-back from rest at the contact reference | 22 | 16 | 3 | 2 | 3.3 · 10¹⁶ |
| **no D1 for an unreachable IK target** | 11 | **0** | **0** | **0** | 4.4 · 10⁴ |
| both | 15 | 0 | 0 | 0 | 4.3 · 10³ |

**Reading:**
- The **falls, aborts and energy blow-ups come from D1 at unreachable / singular IK targets**: a pre-existing controller robustness defect that only this out-of-envelope collision exposed.
- What remains with the guard is the physics of a 10 mm obstacle hit at ≈ 180 mm/s: impact > 25 % BW, rebounds, E1a-7 steps, and per-tick closure spikes in 11 – 15 / 24 cases.

## 4. What this establishes

For every terrain **within the certified window** and for E2's late / no-ground semantics (2,256 runs, all bodies, both legs, three rates), TD2B is clean:
- 0 E1a-7 violations;
- impact ≤ 14.3 % BW;
- contact ≤ 31 mm/s with horizontal speed ≤ 31 mm/s;
- no rebounds; placement ≤ 3.2 mm;
- the AB2 swing contract kept;
- the escalation reaches the planner's turf with search-speed contact (≈ 9 mm/s), and fails explicitly without fabricating contact when there is no ground;
- **the new physics-rate invariance criterion passes.**

## 5. Decisions needed (none taken)

1. **D1 robustness.** A versioned controller correction: no (or a bounded) resolved-acceleration feed-forward when the leg's IK target is unreachable, or at near-singular configurations.
   - Counterfactual: it removes every energy blow-up, abort and fall in 24 / 24 heavy cases.
   - In-envelope runs never reach unreachable targets, so in-envelope behaviour should be unaffected. That needs its own identity / validation.
2. **Out-of-envelope early-terrain requirement.** Even with (1), a 10 mm obstacle at swing speed violates the touchdown and continuity contracts. Options:
   - judge earlyOOE by E2 §2a handling only (no fall / abort, acceptance rule, support), with integrity reported;
   - gate a physically meaningful subset (no Σ+ energy creation, no abort);
   - reduce the swing speed near possible obstacles: a different architecture.
3. **Then:** a fresh versioned battery (TD2C), and on a pass the prerequisite sequence (E2 integration → SV-2 re-qualification with the §6 allowance → PG-1 → … → official E2).

**Recommendation:**
- (1), as a separately preregistered, minimal controller guard with identity checks;
- (2), §2a handling plus "no energy creation (Σ+), no abort / fall" as the earlyOOE gate, with impact and continuity reported. A 10 mm unexpected obstacle at swing speed cannot satisfy the 25 % BW contact contract by any touchdown design that keeps the validated swing.

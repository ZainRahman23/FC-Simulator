# Settled Attacking Structure — Implementation Report (v0.7-cal2 → v0.7-cal3)

Phase: first engine implementation pass after the structural possession diagnostics
(POSSESSION_STRUCTURAL_REPORT.md). Three ordered families, each independently
validated and accepted. All changes are movement-target geometry, choice utility,
or possession-state continuity. No accuracy, xG, or attribute math was modified.

## 1. Scope and non-negotiables honored
- No `settled_attack_bonus`, `low_block_xg_penalty`, `chance_creation_boost` or
  equivalent scalar exists anywhere in the change set.
- No tactic changes any player attribute. Directness/risk/tempo/focus act at the
  action-choice layer only; movement changes are physical targets.
- Ratings position-group centering fix, GK population normalization, OVR-metadata
  isolation, and the KeyedRNG architecture are untouched (verified by the core
  suite's OVR-isolation and reproducibility tests plus the run-vs-advance parity
  audit after every family).
- Touchline (server.py / bridge.py / web) untouched.

## 2. Starting evidence (locked diagnostics)
Settled penetration was missing: balanced-mirror settled shots averaged 0.040 xG,
chance creation was financed by turnover chaos (32% of balanced shot-possessions
began at interception/tackle), and damping chaos sterilized play (both prior
coefficient families reverted). LONG≈55% pass share and forward 63–65% were
invariant across all tactical profiles.

## 3. Part A — settled attacking support structure (ACCEPTED)
Implemented on the existing role/target model in `_desired_target`:
- **Receiving pockets** (`_support_pocket`): advanced supporters scan a small
  deterministic candidate set around their structural target, scored by real
  space (nearest defender), teammate separation (anti-clumping), passable range,
  and — on the box approach — a role-specific arrival lane (near post ST/poacher,
  central SS/CAM, weak-side far post, cutback/edge CM). Pocket quality scales
  with Attacking Position and Attack Effort. ~3s re-scan cadence. No RNG.
- **Second-phase shape retention**: a side that loses the ball high and wins it
  straight back (≤12s) from a defensive relief action (clearance/block/parry)
  resumes with a bounded settled-maturity credit (`possession_shape_credit`,
  ≤9s) feeding only the existing `_settled_probe` spatial machinery. Ledger
  durations and transition logic untouched.
- Rest defense and recycling outlets were verified to already exist structurally
  (deep-shell stagger, post-regain hold, physical positions) and were not
  re-implemented.

Validation (840 matched-configuration matches vs cal2 baseline `poss_baseline3`,
plus 480 matched-seed A/B):
- Structure: support near shooter +40–90% in controlled/wide profiles, spacing
  tighter, box occupation up; shape credits fire ecology-dependently
  (aggr-ultra 25/match, ultra-ultra 0.03/match).
- Balanced settled xG/shot 0.0426→0.0442 (matched-seed +16%); second-ball shot
  possessions +32–65% where sieges exist, with better quality.
- No stop condition: ultra-ultra stayed ultra-low-event (0.24 xG/match total,
  possessions longer), aggr-aggr transition identity intact (total xG +0.4%),
  possession durations flat, pass-type mix stable (LONG 54.4→54.0%),
  terminations stable.
- Workload causal: attacker distance +2–9% (largest in open play, smallest in
  ultra shells).

## 4. Part B — tactical action-choice sensitivity (ACCEPTED)
Pre-B matched-seed one-dial counterfactuals showed three dials already material
after Part A (risk: 12.6pt LONG-share separation; tempo: −26% possession
duration; focus: +72% cross share) and one broken: **passing_directness** was
inverted (SHORT sides played MORE ground launches than DIRECT, 52.8% vs 50.9%).

Change (choice layer only, `_pass_option_utility`): the linear ±0.18/0.24
directness term was replaced by distance-banded preferences — SHORT gains on
≤15m options and pays a real cost on 18m+ ground launches (damped 0.70× by set
deep blocks so the siege relief outlet survives); DIRECT strengthens its long
channel and adds a vertical-progress preference. MIXED is exactly zero: all
MIXED-plan scenarios reproduce **byte-identically**, proving scope.

Post-B: LONG share SHORT 45.5% vs DIRECT 51.4% (correct direction, ~6pt),
SHORT-type share 25.1% vs 15.9%, aerials 5.4% vs 15.6%, completion 64.8% vs
56.0%; neither arm sterilized (xG 0.50 / 0.47 per match). Aggr-aggr transition
share preserved (62.6%). Ultra-ultra became moderately more sterile
(identity-consistent; the openness contract guardrail — which is on the
controlled mirror — passed throughout).

## 5. Part C — defensive reorganization after siege clearances (ACCEPTED)
§29 measurement (re-entry bands by seconds-since-relief) first showed
reorganization already emerges geometrically — deep blocks reset to org 0.726
within 6–12s (shot quality collapses to 0.073 xG/shot in that window), high
blocks crawl 0.55→0.615 over 20s+. The measured gap: after a relief action the
block-shift formula immediately pulled deep blocks up toward the cleared ball,
capping their reset (0.726) far below their unstressed organization (0.813).

Change (`_desired_target` defensive branch + `_last_relief` state): a block that
just made a relief action holds its compressed defensive-third lines while the
ball is loose/recycled — the existing compression tables simply keep applying up
to ball-rel 60 for a short window: DEEP 7s, MID 4s, HIGH 0s. High presses keep
their step-up-and-squeeze identity (aggressive-vs-aggressive is byte-identical).

Post-C: early re-entry xG conceded (0–20s) fell ~10% via shot denial (−29%
shots in the 6–12s reset window) while total siege shots stayed flat — the
siege is not killed; sustained pressure (20–45s attrition) remains the way
through a block. Controlled mirror −7.5% (nets to −0.5% vs original cal2
across the whole phase, with more settled / less transition composition).
Balanced +8.4% (holding shape instead of stepping out concedes sustained
territory; quality per shot flat). Ultra mirror pair combined −1.1%.

## 6. Final matrix (vs original cal2 baseline, 120 matches/scenario)
| scenario | total xG Δ | identity check |
|---|---|---|
| ultra_vs_ultra | 26.6→25.6 (−4%) | still lowest-event; survival 38.5→41.0s |
| controlled mirror | 78.0→77.6 (−0.5%) | settled 73.7→74.9, transition 4.3→2.7 |
| balanced mirror | 104.0→114.9 (+10.5%) | settled xG/shot 0.0426→0.0456 |
| wide_v_controlled | 135.5→139.8 (+3.2%) | support +90%, crosses differentiated |
| aggr_vs_aggr | 450.0→421.8 (−6.3%) | transition share 63%; byte-stable in C |
| aggr/ultra pair | 754.5→796.3 (+5.5%) | siege earns second phases; re-entry denied early |

Quality gradient, workload families, integration/E2E, and worker reproducibility:
see §7 (final battery) below.

## 7. Final regression battery (all after Parts A+B+C and the version bump)
- Core suite: **62 passed** (53 original + 9 new structural tests), including the
  match-openness contract guardrail (controlled mirror xG band 0.14–0.55), seed
  reproducibility, RNG-audit semantic keying, and OVR isolation.
- Run-vs-advance parity: **PASS** (3 seeds, full ledger + RNG draw audit + states).
- Integration: **22 passed** (re-run after the version bump).
  E2E (Playwright, chrome): **4 passed** pre-bump and re-run post-bump
  (version assertions are dynamic against /api/health).
- Worker reproducibility: single-worker vs 8-worker `run_validation` output
  identical in all match content (only the wall-clock metadata field differs).
- Quality gradient (80 matches/scenario): elite 0.45 > strong 0.34 > avg 0.31
  goals vs an average opponent — monotone, no collapse; mean shot xG rose
  slightly and uniformly (0.038–0.042 → 0.040–0.044) from real structure.
- OVR isolation at scale: `integrity/ovr_control` vs `ovr_shifted` produce
  **identical** aggregate outputs (goals 0.450/0.450, distance 99.24/99.24 km).
- Workload: high-work-rate teams 0.44–0.56 goals vs low-work 0.19–0.20 on both
  stamina tiers; matched-seed attacker distance +2–9% from pocket work,
  largest in open play, smallest in ultra shells.

## 9. Honest caveats
- Balanced-mirror total xG rose +10.5% across the phase (structure earns more
  sustained attacks; quality per shot up 3%). This is the intended direction —
  settled play can now finance chances — but future recalibration passes should
  treat v0.7-cal3 matrix levels as the new reference.
- Ultra-vs-ultra remains, by identity, an extreme low-event corner
  (~0.21 xG/match total); Part B made SHORT sides decline hopeful launches, and
  the 0.70 block damping deliberately preserves only part of that chaos finance.
- The siege matchup (aggr-vs-ultra) nets +5.5% xG across the phase: second-phase
  continuity (A) outweighs early re-entry denial (C). Both mechanisms are
  individually verified; the balance between them is a calibration question,
  not a structural one.

CALIBRATION_VERSION: v0.7-cal2 → **v0.7-cal3** (bumped once, at completion).


## 8. Files changed
- `fc_simulator/engine.py` — `_support_pocket`, `_attack_structure_snapshot`
  (diagnostic shot fields), `possession_shape_credit` + `_last_loss` +
  `SECOND_PHASE_REASONS`, `_settled_probe` age credit, directness rework in
  `_pass_option_utility`, `_last_relief` + post-relief reform window.
- `fc_simulator/calibration.py` — CALIBRATION_VERSION bump only.
- `tests/test_structure.py` — 9 new structural unit tests.
- `validation/out/` — poss_afterA/B/C.json, final_quality_afterC.json.

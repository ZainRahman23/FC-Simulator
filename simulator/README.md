# FC Simulator v0.7 — Random Integrity, Asymmetric Matchups & Quality Gap Core

A deterministic, event-driven 11v11 football simulator built around individual player attributes, continuous spatial context, tactics, roles, workload and causal event chains. **OVR is metadata only and never enters match resolution.**

## v0.7 highlights

- 100-player bundled data set with Height and Weight populated.
- Continuous formation/role geometry with 1-second Energy, Acute Exertion and workload state.
- Passing, receptions, interceptions, pressing, dribbling, shielding, tackles, aerials, crossing/cutbacks, fouls/cards, shooting, goalkeeping, restarts and substitutions.
- All 13 team tactics plus per-player Attack Role/Effort and Defense Role/Effort.
- 4-3-3, 4-2-3-1 and 4-1-4-1, including in-match reshaping and red-card restructuring.
- **Semantic keyed RNG:** draws depend on the match seed plus causal stage identifiers rather than a mutable global random cursor or event number.
- Debug-only logging is regression-tested not to alter normal football outcomes.
- Compact defenses can deny a reception even when they cannot intercept the original passing lane; multiple nearby defenders combine with diminishing influence.
- Deep blocks resist repeated vertical/central feeds through actual action utility and receiving geometry, not a hidden low-block scoring modifier.
- Controlled cagey and ultra-low football are separated: controlled teams retain selected penetration roles and balanced progression; ultra-low teams minimize forward commitment.
- Mirrored-team tactical calibration cleanly separates tactical effects from roster quality.
- Paired home/away quality-gap sweeps change **actual attributes only** and test that ratings shift expected outcomes without predetermining results.

## Current tactical ecology diagnostic

A six-seed x 30-minute mirrored calibration batch, scaled to per-90 rates, currently produces approximately:

| Matchup | Total xG / 90 | Character |
|---|---:|---|
| Ultra-low vs ultra-low | **0.24** | Very low commitment, almost no transition threat |
| Controlled vs controlled | **0.59** | Cagey but still capable of settled attacks; still a little below the desired ~0.8 central reference |
| Wide attack vs ultra-low | **0.84** | One-sided territorial siege rather than two-way chaos |
| Extreme open vs open | **3.48** | Highest transition frequency and two-way chance creation |
| Extreme open vs ultra-low | **2.36** | Asymmetric stress case; still too productive in the current high-intensity tail |

These are calibration diagnostics, not forced targets. No tactic label changes xG or goal probability directly.

## Ratings versus randomness

The paired quality sweep uses identical mirrored teams, then shifts real player attributes by equal and opposite amounts while keeping OVR untouched. At zero gap, expected xG is exactly symmetric in the current paired sample. As the true attribute gap increases, the stronger side's xG share rises from **0.50 -> 0.58 -> 0.63 -> 0.73** across the tested gaps. The weaker side still records wins at a moderate gap. There is no favorite, upset, comeback, momentum or parity switch.

## Run

```bash
python -m fc_simulator.cli --seed 13000 --minutes 90
pytest -q
python scripts/matchup_matrix.py --samples 6 --minutes 30 --out matchup_matrix_v0_7.json
python scripts/quality_sweep_paired.py --seed-pairs 4 --minutes 30 --deltas 0 1 2 3 --out quality_sweep_paired_v0_7.json
```

See `IMPLEMENTATION_STATUS.md`, `REFERENCE_RESULTS.md`, `VALIDATION.md`, `CALIBRATION.md` and `ARCHITECTURE.md` for current limits and design contracts.

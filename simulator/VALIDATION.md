# Validation Contract — v0.7

Current suite: **53 passing tests**.

The suite covers:

- Same-seed event-ledger reproducibility.
- OVR isolation.
- Semantic RNG audit reproducibility and different-seed divergence.
- Debug-only event insertion does not alter the normal football event ledger.
- Cross resolution remains unchanged when unrelated logging changes event numbering.
- Probability bounds and distribution invariants.
- Passing attribute monotonicity and Weight invariance for passing.
- Stamina efficiency and low-workload conservation.
- Height/aerial causality and Weight/contact causality.
- Crossing delivery precision, cross candidate geometry and cutback xG invariance.
- Offside, throw-ins, goal kicks and formation remapping/switching.
- All 13 tactical controls through real plan state.
- Red-card restructuring remains ten active players.
- Role evidence requires actual role-relevant spatial behavior.
- Dead-ball seconds do not inflate controlled-possession time.
- Ball carriers cannot silently follow off-ball targets between events.
- Low-block structural floors before penetration plus legitimate emergency recovery afterward.
- Near-contact defenders can obstruct/block shots.
- Compact defensive reception denial increases when multiple eligible defenders surround the target.
- Deep compact-shell resistance is stronger than ordinary mid-block resistance and arises from geometry/action selection.
- Tactical ecology guardrails across ultra-low, controlled and open styles.

## Random-integrity contract

Randomness is keyed to semantic causal context rather than `event_id`. Match seed + stage identifiers determine each draw. Logging an unrelated event therefore does not move a global RNG cursor or automatically change later outcomes. Important distributions/draws can be audited with key identifiers.

## Quality-gap contract

Paired sweeps play each seed twice with the attribute advantage swapped HOME/AWAY. At zero gap the expected xG should be symmetric. Increasing real attribute quality should move conditional success and aggregate xG share toward the stronger team, while individual matches remain probabilistic. No test requires the favorite to win every game.

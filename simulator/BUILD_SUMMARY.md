# FC Simulator v0.7 — Build Summary

v0.7 focuses on **random integrity, asymmetric tactical matchups, compact-block resistance and ratings-vs-randomness balance**.

## Major changes

1. **Semantic keyed RNG was hardened.** Cross-clearance draws no longer depend on `event_id`; unrelated debug/logging events are regression-tested not to alter normal football outcomes.
2. **Mirrored calibration teams were added.** Tactical comparisons can now use identical attributes with unique IDs, preventing roster-quality leakage into tactic conclusions.
3. **Asymmetric matchup calibration was added.** Ultra-v-ultra, controlled-v-controlled, attack-v-ultra, open-v-open and open-v-ultra can be compared with the same personnel/seed families.
4. **Compact-block reception denial became multi-defender.** Eligible nearby defenders combine with diminishing influence after the pass reaches the target zone; the block does not receive a hidden execution bonus.
5. **Deep-shell resistance is action-selection based.** Repeated central/vertical feeds into a packed deep defense become less attractive; width, recycling and alternative routes become relatively more attractive.
6. **Controlled cagey was restored after an overcorrection.** Patient teams now keep attacking-third decision cadence, balanced box support and selected penetration roles so controlled football does not become refusal to attack.
7. **Paired quality-gap sweeps were added.** Actual player attributes are shifted while OVR remains untouched. The advantage is swapped HOME/AWAY under the same seed set to reduce directional noise.
8. **Underdog variance remains native.** Better ratings materially shift expected xG, but underdogs can still win individual games from the same event-level random process.

## Current diagnostics

Latest six-seed mirrored matchup batch (30-minute samples scaled per 90):

- Ultra vs Ultra: **~0.24 total xG**.
- Controlled vs Controlled: **~0.59 total xG**; still a little below the desired ~0.8 cagey reference.
- Wide attack vs Ultra: **~0.84 total xG**, strongly asymmetric.
- Extreme Open vs Open: **~3.48 total xG** with far more transition shots/possession changes.
- Extreme Open vs Ultra: **~2.36 total xG**, but still an overproductive stress tail requiring further structural calibration.

Paired actual-attribute sweep xG share for the stronger side: **0.50, 0.58, 0.63, 0.73** as the tested total attribute gap rises from 0 to 6 points. A moderate-gap underdog still won in the small paired sample.

No scoreline, xG target, favorite result or upset is forced.

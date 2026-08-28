# Calibration Guide — v0.7

Calibration must preserve the causal model. Never tune a final scoreline directly and never add a tactic-to-xG, favorite, comeback or upset multiplier.

## Tactical matchup targets

Calibration is matchup-based rather than preset-based:

- **Ultra-low vs ultra-low:** the natural home of ~0.2–0.4 total xG matches and frequent 0-0s, particularly with weak attackers/minimal counter commitment.
- **Controlled/cagey vs controlled/cagey:** competent teams should usually create low-but-meaningful attacking output. Roughly **~0.8 total xG** is a useful central reference, not a hard target.
- **Strong attack vs ultra-low:** meaningful one-sided attacking output through sustained possession, overloads, technical quality, width, cutbacks, second balls and set pieces; fewer transitions than an open match.
- **Aggressive vs ultra-low:** territorial siege, not automatically two-way chaos. Counter threat depends on the low block's own transition commitment.
- **Aggressive/open vs aggressive/open:** highest transition frequency, lowest organization after turnovers and highest total chance volume/xG.

## Quality versus randomness

Actual attributes should move event probabilities enough that better teams create more and win more often over large samples. But football events remain stochastic, so underdogs can win through saves, finishing variance, blocks, turnovers, set pieces and execution sequences. Never create an underdog boost or favorite guarantee.

Use paired/matched seeds and mirrored personnel to isolate changes. Prefer expected/chance metrics over tiny-sample win rates.

## Calibration order

1. Movement and positional geometry.
2. Action availability/choice frequency.
3. Passing/reception/interception micro events.
4. Press/dribble/tackle/loose-ball resolution.
5. Aerial/crossing/physical contests.
6. Shot geometry and goalkeeper response.
7. Tactical matchup possession/transition ecology.
8. Workload/fatigue distributions.
9. Ratings/stat attribution.
10. Full-match and league-level distributions.

Prefer conditional metrics (completion by pressure, xG by geometry, receiving denial by defender density, aerial win by reach margin) over aggregate goal counts.

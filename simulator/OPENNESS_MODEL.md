# Match Openness Model — v0.7

The simulator does **not** apply a hidden `cagey = fewer goals`, `open = more goals`, or `strong team = win` modifier. Match chance ecology emerges from the interaction of both teams' tactics and player quality through positions, decisions, turnovers, defensive organization, receiving pressure, transition access and shot geometry.

## Matchup interaction

Openness is not a property of one tactic label in isolation.

- **Ultra-low vs ultra-low:** both teams protect structure, commit few runners and accept little transition risk. Very low total xG can naturally emerge.
- **Controlled vs controlled:** fewer transitions than normal/open football, but selected creators/runners still build settled attacks. Competent cagey teams should not be sterile.
- **Good attack vs ultra-low:** the stronger/attacking side can still break the shell through sustained territory, technical execution, width, overloads, cutbacks, second balls and set pieces. The match should look like a siege rather than end-to-end chaos.
- **Aggressive vs ultra-low:** the attacking side can create pressure and turnovers, but the passive side only makes the match two-way if its own counter commitment is high enough.
- **Aggressive vs aggressive:** both sides leave transition space, so this is the natural high-turnover/high-xG environment.

## Geometry-derived defensive organization

The defending team's organization is derived from current geometry, including goal-side coverage, central protection and line coherence. Recent turnover state alone does not make a team disorganized. A deep block with bodies already behind the ball can remain organized immediately after a turnover; a high-pressing team with players ahead of the ball can be exposed.

Organization enters chance context alongside pressure and lane density. The same shooter/geometry therefore faces a harder chance when actual bodies and structure are present, not because the tactic is named `Deep`.

## Compact-block reception resistance

A pass into a packed block is not resolved only by whether a defender intersects the original pass lane. After the ball arrives, nearby eligible defenders can contest the reception. Their influence combines with diminishing returns, so three compact defenders can make a central reception harder than one without granting a hidden defensive attribute boost.

The action-choice layer also recognizes genuine deep-shell congestion: repeated central/vertical feeds become less attractive relative to recycling, width and alternate routes. This mechanism is geometry-dependent and is regression-tested not to activate equally against an ordinary mid block.

## Through balls and space behind

Through-ball availability requires a run-oriented receiver, an onside relationship to the actual second-last-defender line and meaningful space behind that line. Deep blocks remove this space naturally. High lines expose it until defenders recover after the ball actually breaks the line.

## Clearances and pressure relief

Secure/deep teams can prefer a clearance or safer release when pressure closes exits near their own goal. A clearance creates a real trajectory, restart or second-ball contest. It is not guaranteed possession relief, but neither is every clearance automatically treated as a broken-field transition for the opponent.

## Current mirrored diagnostic

Six seeds x 30 minutes, scaled to per-90 rates:

| Matchup | Total xG | Transition character |
|---|---:|---|
| Ultra vs Ultra | **0.235** | essentially none |
| Controlled vs Controlled | **0.591** | very low |
| Wide Attack vs Ultra | **0.837** | asymmetric siege |
| Extreme Open vs Open | **3.484** | highest two-way transition rate |
| Extreme Open vs Ultra stress | **2.364** | one-sided pressure; still an overproductive tail |

The absolute coefficients remain calibration targets. In particular, controlled football is still slightly below the desired ~0.8 central reference and the deliberately extreme open-v-ultra stress case still creates too many close siege chances in some seeds. These will be fixed structurally, never through a scoring cap.

# Role-Aware Rating Layer — current through v0.7

The live 1–10 rating remains event-led. Passing, defending, dribbling, shooting, goalkeeping and discipline add performance value relative to contextual difficulty and consequence. A separate, capped role-performance signal lets off-ball work matter without rewarding raw running volume.

Role evidence is opportunity-based during active play. Examples include an Overlap fullback physically providing the outside lane, a Run Behind forward timing the actual second-last-defender line, a Link/Target forward becoming a usable central outlet, a Screen midfielder occupying the ball-to-goal corridor, or a Track Runner defender staying goal-side and connected to the relevant threat.

`role_value` contributes much less to the displayed rating than football-event execution/impact. Effort itself earns no rating credit, and a player cannot obtain an elite rating merely by standing in the assigned zone.

v0.7 does not change this core contract: quality calibration and semantic RNG remain upstream of ratings. The rating engine observes what happened; it never alters player attributes, randomness, tactic choice or future event probabilities.

Match output exposes attack/possession/defense/goalkeeping/discipline/role component values plus role opportunities, successes, support options, line-stretch runs, screening actions, tracking actions, width actions and box-support actions.

# Implementation Status — v0.7

## Implemented

- Deterministic seeded 11v11 match loop and auditable event ledger.
- Semantic keyed child randomness with stage-level audit records; no mutable global random cursor.
- 0–100 continuous pitch coordinates; formation anchors; 4-3-3, 4-2-3-1 and 4-1-4-1.
- Second-by-second position, activity, Energy and Acute Exertion with nonlinear fatigue-adjusted effective attributes.
- All 13 team tactics and per-player Attack Role/Effort + Defense Role/Effort.
- Passing option generation/choice/execution, weak-foot/body/pressure context, interception, contested reception and first touch.
- Multiple compact defenders can combine with diminishing influence to disrupt a reception.
- Offside from the actual second-last-defender line and timed attacking runs.
- Pressing, carrying, dribbling, shielding, standing/sliding tackles and ground duels.
- Height/Jumping aerial reach; Strength/Weight contact; headers, clearances and loose/second balls.
- Zone-based crossing, cutback windows, goalkeeper high-ball behavior and byline/cutback defensive cover.
- Fouls, advantage, yellows/reds, penalties and ten-man restructuring.
- Shooting, blocks, xG/PSxG, goalkeeper positioning/reach/handling, parries/rebounds.
- GK distribution, sweeper actions, corners, direct free-kick proxy, throw-ins and goal kicks.
- Active/dead-ball timing, halftime recovery, substitutions, coach tactical responses and formation switching.
- Event-derived player/team stats, chance creation, assists/pre-assists and role-aware ratings.
- Mirrored tactical calibration teams, asymmetric matchup matrix runner and paired favorite/underdog quality sweep.

## v0.7 calibration progress

- Ultra-low vs ultra-low remains the lowest-xG ecology.
- Controlled vs controlled has been restored from an overly sterile regression to roughly **0.6 total xG/90** in the latest small mirrored batch; the long-run target remains around **~0.8** for competent cagey football rather than a fixed hard value.
- A good attacking side can create meaningfully more against an ultra-low block through territory, width, reception quality and settled possession; the block does not apply a scoring penalty.
- Aggressive/open vs aggressive/open remains the highest-transition ecology.
- One aggressive side vs an ultra-low block behaves more like a siege than symmetric end-to-end football, although the extreme stress preset still has an overproductive tail.
- Actual attribute gaps materially shift expected chance creation. Moderate underdogs can still win from the normal event distribution; no upset aid exists.

## Explicitly provisional / incomplete

- Numerical coefficients remain calibration parameters rather than final football truth.
- Extreme high-intensity tails can still generate too many close siege chances in some seeds, especially the deliberately extreme open-v-ultra stress case.
- Controlled-cagey population xG is still a little below the desired ~0.8 central reference in the latest mirrored sample.
- Dedicated Free Kick Accuracy, Curve and Penalties attributes are absent from the source data; current proxies are temporary.
- Injuries are hooks only; set-piece routines/assignments are limited; coach AI is intentionally simple.
- Body orientation is contextual rather than a full continuous orientation state.
- Match ratings need larger positional/role calibration and more formations remain future work.

## Non-negotiable invariants

- OVR never enters match resolution.
- Tactics/roles change positions, movement and action utility; they do not boost technical attributes.
- Height and Weight remain physical metadata; Height affects reach and Weight affects real contact, not pace/passing.
- Ball carriers advance only through explicit football events.
- A player must be geometrically capable of affecting an event before attributes matter.
- Same inputs + seed + engine/calibration/data version reproduce the same event ledger.
- Debug/logging changes cannot reshuffle football outcomes.
- There is no favorite, upset, comeback, parity, chaos or score-correction switch.

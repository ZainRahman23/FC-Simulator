# Architecture Notes — v0.7

## Source of truth

The event ledger is authoritative. Player stats, team stats, possession, goals and ratings derive from the same simulated state/events rather than being independently generated.

## Immutable ability vs runtime state

`Player` stores base attributes plus Height/Weight metadata. `PlayerState` stores runtime position, Energy, Acute Exertion, activity, instructions and match statistics. Fatigue never edits the base player.

## Spatial model

Every player has a formation anchor plus dynamic role/event targets. Tactics and roles alter targets/decision utilities; they never boost attributes. Players move physically toward targets, so pressing, overlaps, recovery runs and formation changes consume time/workload. A ball carrier advances only through explicit football actions.

## Probability model

Event methods use context-first bounded logistic/softmax probability structures and normalized effective attributes. Geometry gates whether a player can influence an event. Multiple eligible defenders can combine with diminishing influence where appropriate.

## Semantic keyed randomness

`KeyedRNG` derives each draw from the match seed plus semantic causal identifiers (stage, possession/decision context, relevant players/action subtype). It does not consume a mutable global PRNG cursor. `event_id` is bookkeeping only and is not an RNG key. This lets matched-seed counterfactuals remain meaningful and prevents debug logging from automatically reshuffling later football outcomes.

The audit path can retain distribution/key identifiers/value for important sampled stages. Same complete inputs and seed reproduce the same event ledger.

## Physical metadata

Height contributes only where physical reach matters. Weight contributes only where physical contact/momentum matters. Strength and Jumping remain separate execution attributes. Weight is regression-tested to have no pass-execution effect.

## Tactical model

The 13 team tactics affect space, timing, pressing thresholds and action utility. Player Attack/Defense Roles affect movement targets and action preferences. Effort affects range, frequency, urgency and workload. None grants a technical attribute bonus.

Tactical ecology is a matchup interaction. A deep block against another deep block can be extremely low-event; a strong attack can still create against that block through sustained territory and quality; two aggressive teams create the strongest two-way transition environment.

## Quality versus randomness

There is no team-quality or OVR term in the match engine. Better teams become favorites because the individual players participating in thousands of contextual events have better relevant attributes. Those advantages move event probabilities rather than guaranteeing outcomes. Underdog wins therefore arise from ordinary sequences of saves, finishing, blocks, turnovers, duels and set pieces under the same keyed randomness.

## Discipline, ratings and coaching

Cards remove players from active play and red-card restructuring preserves the correct player count. Ratings are downstream of event execution/impact and role evidence; ratings do not feed back into ability. Coach AI changes formation/tactics/personnel through ordinary plan state and never receives hidden performance boosts.

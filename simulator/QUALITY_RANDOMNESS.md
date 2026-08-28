# Quality, Underdogs & Random Integrity — v0.7

The simulator does not choose a winner, favorite, upset or comeback state. Team quality emerges from the contextual attributes of the players participating in each football event.

## Why better teams should win more often

A stronger team accumulates small and medium advantages across recognition, passing, receiving, pressing resistance, defensive positioning, duels, shooting and goalkeeping. Those advantages change event probabilities and the states created by earlier events. There is no OVR/team-rating term.

## Why underdogs can still win

Even when expected chance creation favors one side, individual football events remain sampled from their contextual distributions. An underdog can win through a legitimate sequence of saves, blocks, turnovers, set pieces, defensive execution and finishing. No additional upset probability is introduced.

## Paired quality experiment

The v0.7 sweep starts from mirrored equal teams. For every seed, the quality advantage is played once as HOME and once as AWAY. Only actual attributes are shifted; OVR is unchanged.

| Shift each side | Total attribute gap | Stronger-side xG share | Stronger / Draw / Underdog wins |
|---:|---:|---:|---:|
| 0 | 0 | 0.500 | 3 / 2 / 3 |
| +/-1 | 2 | 0.580 | 3 / 5 / 0 |
| +/-2 | 4 | 0.627 | 2 / 5 / 1 |
| +/-3 | 6 | 0.728 | 2 / 6 / 0 |

The win counts are only eight short matches per row and are not used as stable win-rate estimates. The monotonic expected-xG-share movement is the primary diagnostic. The moderate-gap underdog win demonstrates that a quality advantage does not guarantee the match result.

## RNG integrity

`KeyedRNG` hashes semantic causal keys with the match seed. There is no mutable random cursor. `event_id` is bookkeeping only. Debug-only event insertion is regression-tested not to alter the normal football event ledger, and cross-specific draws were audited to remove the last event-number dependency.

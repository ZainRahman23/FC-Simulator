# GAME-STATE RISK POLICY (cal10 candidate) — WORKING REPORT
2026-08-23. Diagnostic basis: LIVE_CASE_5_WEAK_TEAM_THREAT_FORENSIC.md (accepted).
Safety: cal9 verified frozen (engine 0ecafb39946d4059); hosted RC5 untouched; work in
simulator/exp_gs/ behind GS={"policy"} flag; flags-OFF reproduces live case #5 digest
a2575ffe9153601772a55042 bit-exactly (held through every edit).

## Existing coach-policy source trace (cal9)
_coach_check (every 300s from 55'): the ONLY game-state logic is
minute>=68 & losing -> CHASE preset (8 dims + 4-2-3-1) / minute>=75 & winning -> PROTECT.

## Final formulation (candidate)
RISK PRESSURE u in [-1,+1], deterministic, evaluated every 60s from 10':
  losing (m<0):  u = (1 + 0.5*(min(-m,3)-1)) * (0.20 + 0.75*tau^2)      [tau = clock/5400]
  winning (m>0): u = -(min(m,2)/2) * max(0, 0.90*tau^2 - 0.10)
  not winning:   u += 0.15 * clamp((threat_drought_min - 12)/18, 0, 1)
  threat = own BOX_ENTRY or SHOT with xg>=0.05 (causal recent-state evidence, not an xG target).
NOTCHES: |u|>=0.35 -> 1, >=0.60 -> 2, >=0.85 -> 3 (sign = chase/protect), with downward
hysteresis (-0.08 bands) and a 120s rate limit unless the goal margin changed.
MAPPING (identity-preserving DELTAS on the team's own base tactics; directness/width/creation
focus NEVER touched - risk means committing players, not longer passes):
  +1: progression_risk +1 step, box_commitment +1 step
  +2: + tempo +1 step, COUNTER / COUNTERPRESS, line STEP_UP
  +3: + pressing +1 step, block +1 step, formation 4-2-3-1
  -1/-2/-3 mirrored (SECURE/REGROUP/DROP; block -1 at -3; press identity kept).
Human-managed teams excluded (coach_ai_teams). No RNG draws. No outcome modifiers anywhere.

## Score/minute response grid (drought 5min)
level: 0 everywhere (early/level matches remain cal9 EXACTLY - simulations are bit-identical
until the first goal). losing -1: 15' n0 (0.22) / 30' n0 (0.28)... wait band map: 15'/30' -> 0,
45' 0.39 -> 1, 60' 0.53 -> 1, 70' 0.65 -> 2, 80' 0.79 -> 2, 88' 0.92 -> 3.
losing -2: 30' 0.42 -> 1, 45' 0.58 -> 1, 55' 0.72 -> 2, 65' 0.89 -> 3, 75'+ -> 3.
losing -3: 45' 0.78 -> 2, 60'+ -> 3.  winning +1: 70' -> -1 ... 88' -> -1(-0.38).
winning +2: 60' -> -1, 75' -> -2 (-0.53), 85' -> -2 (-0.70).
Monotone in margin and time everywhere football logic requires it; drought adds at most +0.15
and never moves a level early game past n0.

## Sunderland exact-seed counterfactual
cal9: unchanged behavior 51'-70', binary CHASE at 70:00.
cal10: RISK+1 41:00 (0-1, u .362) -> RISK+2 55:00 (0-2, u .603) -> RISK+3 72:00 (u 1.0).
Behavior diverges BEFORE the old trigger (60-70' band: passes 10->46, box entries 0->2,
FB>half 6->19%) with long-ball share NOT inflated (46% vs cal9's 60% in that band). In this
timeline Sunderland conceded twice more while chasing (0-3): the risk is real and unhedged.
Rejected variants: (a) linear-minute notches (rejected on the grid: panic at 0-1@15');
(b) round(u*3) mapping (same defect) - replaced by banded thresholds; (c) no-hysteresis
version (drought resets caused +2->+1->+2->+3 flapping inside 3 minutes).

## Multi-seed distributions (final dose; SUN/EVE 30 seeds, mirrors 20, matrix/quality 12/arm)
SUN (cal9 -> cal10): weak-side xG 0.23 -> 0.38 (+65%), box 6.4 -> 7.5, conceded 2.60 -> 1.95 xG
(3.20 -> 2.83 goals: graded exposure beats the old all-at-once panic), completion 0.56 -> 0.54,
long share 0.43 -> 0.47 (mild, from commitment/tempo - directness untouched by construction),
distance 121 -> 126km (real workload cost). FB advancement by STATE (the §10 behavioral proof):
level 3.5% (identical to cal9) -> down1 6.1% -> down2 10.3% - monotone in deficit.
EVE: box 4.4 -> 5.2, FB down1 4.3 -> 6.6%, xG flat (their chases are milder by design - fewer
2-goal deficits early). Balanced mirror (favorite/underdog symmetry, both CPU): whichever side
trails chases with the SAME policy; leading sides concede less late (0.71 -> 0.57 xGc);
level-state FB identical (18.2 vs 18.7). No team-strength term exists anywhere in the policy.
Tactical identity: ultra remains ultra (long share 0.09 UNCHANGED while chasing FB advancement
24 -> 41%: an urgent ultra, not a new team); controlled/aggressive rows within noise of cal9;
level/early play is BIT-IDENTICAL to cal9 until the first goal (simulation divergence only via
tactic changes after state changes). Quality gradient rows preserved (elite/weak unchanged).

## Integrity & acceptance
Flags-OFF identity: held through every edit (digest a2575ffe9153601772a55042).
Parity + same-seed repro (policy ON): PASS. 95 core tests PASS flags-ON and flags-OFF
(ONE documented expectation update: test_coach_chase_mode... now reaches 4-2-3-1 through the
graded policy at maximum urgency; flag-tolerant for cal9 rollback). +5 new unit tests
(tests/test_game_state_policy.py): monotonicity grid, level==cal9, directness-never-touched,
max-chase full commitment, protect reduction. Production == validated variant 5/5 digests.
Checkpoint cal10-checkpoint-20260823 (engine blake2b 45a633a00c6e7cdf61e9, players unchanged
e7f2cda3...). RC6 STAGED at ~/TouchlineRC6-staging (0.1.0-rc6) - NOT deployed; hosted RC5
(cal9) verified live and untouched.

## DECISION: ACCEPT GAME-STATE RISK POLICY CAL10
Acceptance standard §19: A progressive/rational grid ✓; B Sunderland's 0-2 behavior now changes
from 55' (+2) instead of 70' ✓; C visible commitment gradients ✓; D real costs (workload,
completion, and in the exact-seed replay two extra goals conceded while chasing) ✓; E long-ball
share near-flat, directness untouchable by construction ✓; F quality decisive (weak chasers
still mostly fail - 0.38 xG, 0.23 goals) ✓; G identities distinct ✓; H level/early bit-identical
✓; I cal9 gains untouched (95 tests ON, no attacking-intelligence code paths modified) ✓;
J ecology flat ✓; K quality gradient ✓; L RNG/parity exact ✓.

## Football interpretation (concise)
The CPU coach now understands that a game state has a value that decays. A side a goal down
at half-time leans forward; two down entering the last half hour it commits genuinely more
bodies - its OWN way: an ultra-defensive team counters with more players and a higher line but
still won't play short-passing possession football; a patient side speeds up. Leading late, the
same maths turns protective. Nothing about the ball, the boots or the dice changed - only when
the manager points the machinery you already accepted at the situation in front of him.

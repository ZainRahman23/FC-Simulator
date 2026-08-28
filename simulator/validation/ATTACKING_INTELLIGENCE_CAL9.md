# ATTACKING INTELLIGENCE (cal9 candidate) — WORKING REPORT
2026-08-23. Diagnosis source: LIVE_CASE_023FBCCE23AA_CAL8_FORENSIC.md (authoritative).
Safety: cal8 checkpoint verified (engine fa9886847b06406c); hosted RC4 untouched; all work in
simulator/exp_ai/ behind AI flags {F1,F2,F4,F5,F6}; flags-OFF reproduces live case #4 digest
37407a037491f3b112f74df8 bit-exactly (gate held through every edit). F3 NOT implemented -
overload exploitation emerges from F1+F2 as designed (no missing mechanism encountered).

## F4 — 2D CARRY DESTINATIONS — ACCEPTED
Design: _ai_carry_plan(): five candidate vectors (straight / diagonal-in / diagonal-out /
lateral cut-in / cut-out, attack frame, "in" = toward goal-side half-space) scored by corridor
clearance x ON-PITCH ROOM (kills the corner-clamp phantom-carry trap), goal-distance reduction,
shooting-angle improvement, teammate occupation and width-role identity. Execution untouched:
p_clean/dribble resolution identical; carry_u in action choice now reads the best real route.
Honest event logging: CARRY distance_m = actual movement (phantom-carry accounting fixed) + dir.
Evidence: exact case winger vectors 187 straight/55 out/0 IN -> 153 straight/97 diag-in/2 cut-in
(context-sensitive); monotonicity micro-tests: all-open -> diag_in, inside-walled -> diag_out,
outside-blocked -> cut_in; corner reachability: straight never chosen in the corner (no room).
Corner-parking (exact case): 221s -> 17s with F4 alone.

## F6 — GEOMETRIC SHOT CANDIDACY — ACCEPTED
Design: SHOOT enters the action menu iff G = g_dist x g_angle >= 0.05 where g_dist ramps to zero
beyond r_max = 24 + 4·clamp(g(long_shots), -1.2, 2.0) (+6 late-game chasing) over 6m, and
g_angle ramps to zero below 0.055 rad shooting angle (corner-flag/extreme-width geometry).
Smooth multivariate frontier - no hard distance cutoff; monotone in geometry; execution, xG and
cal6 xg_eff signal untouched for eligible shots. Micro: 22m central everyone / 28m elite-only /
38m-halfway-cornerflag never / late-chasing extends range. Exact case candidates: >=35m
319 -> 8 (-97%); extreme-width 338 -> 48 (residue = legitimate близко tight-angle near-goal);
30-seed: shots >=35m 4.4 -> 0.0 per match, >=25m 15.0 -> 5.2 (selective 25-30 survives).
The three real goals (8.5-11.4m) remain trivially eligible.

## F5 — STAGNATION ESCALATION — ACCEPTED (after one bug fix)
Design: deterministic stationarity tracker (carrier displaced <2.5m from reference); once
still-age exceeds the defending side's patience (PASSIVE 10s / SELECTIVE 8 / AGGRESSIVE 6 /
RELENTLESS 5) and the carrier is within 30m, the nearest UNCOMMITTED defender becomes press-
eligible (cutback-lane protectors excluded - the first version nominated the locked LCB and
never fired; REJECTED and fixed). Engagement then flows through the existing D-ownership
(engage-vs-contain) machinery - no possession-age penalty, no scripted dive-in. Late-game
protection remains possible as CONTESTED football. Micro: corner park engaged after 10s vs
PASSIVE, 3s vs AGGRESSIVE. Exact case: the 95s/53s/25s deadlocks are gone (F4F5: total 33s,
episodes contested); 30-seed corner-parking 168s -> 64s/match.

## F2 — PERSISTENT OFF-BALL INTENTIONS — ACCEPTED (after dose-down)
Design: progressive completed passes (>=8m, attacking half), through-balls and take-on BEATs
plant ONE intention in the geometrically fitting nearby teammate: OVERLAP (wide, behind ball ->
touchline lane ahead), RUN_BEYOND (runner roles/ST, offside-guard preserved), ATTACK_BOX
(central mids at br>=70 -> far-post zone), TRAIL (deep central -> cutback/second-ball spot),
EXPLOIT (into a beaten defender's vacated channel). Intentions live 3-6s (Attack Effort scales),
override structural retargeting at 65% blend, and terminate on possession loss, ball regression,
destination occupation or expiry. No rotation, no bonuses, no scripts. First version (2 intents
per event, extreme targets rel+13/edge-9) REJECTED: corner dwell exploded to 450s via byline
pile-ups. Evidence: run persistence (share of advanced teammates still sprinting after a
progressive pass) 1s/3s/5s: 0.680/0.555/0.382 -> 0.716/0.592/0.454 (+19% at 5s); F2-alone
overload windows 87 -> 126 and box entries 47 -> 68 (+45%) on the exact case; micro: 3v2 break
assigns OVERLAP to the free fullback.

## F1 — CONTEXTUAL RECOVERY — ACCEPTED
Design: _ai_recovery_duty(): when the ball is deep (own rel<=32) and the committed-attacker vs
home-defender count shows a genuine deficit, the nearest stranded high players (own rel>=45)
inherit recovery duty (cap toward ball+12, shade central) - deterministically, up to the
deficit. COUNTER plans always spare their highest outlet; STAY_HIGH instructions are respected
until the deficit reaches emergency size (>=3). No universal sprint-back; band-cap identity
preserved otherwise. Evidence: exact case stranded >=4 share 0.269 -> 0.143 alone / 0.053 in the
package; micro: balanced plan assigns duty at deficit, counter spares the outlet, small-deficit
STAY_HIGH respected.

## Integration (exact case, ALL): corner 221s->46s; stranded 0.269->0.053; overload windows
87->102; diag-in carries 0->97; >=35m candidates 319->5; extreme-width 338->26; sh25 17->11.
30 matched seeds: sh35 4.4->0.0, sh25 15->5.2, corner 168->64s, xG total -6% (junk removal +
smarter defense offsetting F2's exploitation gain - both sides play better football), dist flat.

## Integrity so far
Flags-OFF identity held through every edit; parity + same-seed repro PASS (2 seeds);
88 core tests PASS flags-OFF AND flags-ON (zero expectation updates); 7 new family unit tests
(tests/test_attacking_intelligence.py) PASS; 15-microstate suite persisted (out/microstates.json).
Pending at time of writing: canonical guardrails (matrix/quality/press) vs cal8 reference.

## FINAL guardrails (final source, cal8 -> cal9, matched scenarios, 25-30 seeds each)
scenario              xGtot        Δ%     shareH         25m+ shots     box        distH
ultra                 0.09->0.09   -2%   0.595->0.439    4.4->1.8    12.1->15.5   97->96
controlled            0.52->0.59  +13%   0.452->0.487    6.4->4.2    24.6->22.8  135->135
balanced              1.04->1.00   -3%   0.454->0.485   11.1->4.9    66.3->56.5  144->143
aggressive(stress)    8.19->8.68   +6%   0.353->0.381    6.2->5.6    95.4->86.3  186->189
avg_vs_avg            1.01->1.11  +10%   0.446->0.454   10.8->4.2    67.8->56.8  144->141
strong_vs_avg         1.12->1.16   +4%   0.615->0.567   11.4->4.1    69.4->64.4  148->145
elite_vs_avg          1.25->1.06  -15%   0.686->0.712    9.6->4.6    73.1->64.3  148->146
avg_vs_weak           1.29->1.11  -14%   0.686->0.701   12.2->4.8    67.6->54.1  145->144
press nets: PASSIVE -0.73->-1.25 / SELECTIVE +0.04->-0.13 / AGGRESSIVE +0.35->+0.12 /
RELENTLESS +0.25->+0.23. Ordering preserved (passivity punished harder by intelligent attacks -
a parked bus conceding 1.66 xG vs a balanced opponent is football-defensible; workload
counterweight intact 132->157km across the dial, total distance flat vs cal8).
Junk 25m+ down 55-65% in EVERY scenario (F6 at scale); box entries -8..-20% in settled scenarios
= the F1/F5 defensive improvement claiming its share; quality gradient monotone
(0.454 < 0.567 < 0.712, weak-side 0.701); tactical identities intact.

## Final decision: ACCEPT ATTACKING INTELLIGENCE CAL9
- Production commit: AI defaults all True; flags-OFF path == cal8 bit-exact (rollback/forensics).
- Calibration bumped ONCE: v0.7-cal8 -> v0.7-cal9. Engine v0.7. players-v3-4attrs untouched
  (blake2b e7f2cda3... unchanged since cal5).
- Production == validated exp variant: 5/5 matched-seed digest equality (cal9 comparator).
- Battery: 95 core tests (88 + 7 new test_attacking_intelligence.py; ZERO expectation updates
  in existing tests, flags ON and OFF) + run-vs-advance parity + same-seed repro + 41 app tests.
- Checkpoint: checkpoints/cal9-checkpoint-20260823 (blake2b engine 22595bda7637ed1c7971,
  calibration 93289c91bb233ee8b759).
- RC5 STAGED at ~/TouchlineRC5-staging (app 0.1.0-rc5, cal9 football + rc4's P4 mapping).
  NOT deployed. Hosted RC4 (cal8) verified live and untouched.

## Rejected experiments
1. F5 v1 stepper (nominated cutback-locked LCB - never fired; the 95s deadlock survived).
2. F2 v1 doses (2 intents/event, targets rel+13/edge-9): corner dwell exploded to 450s.
3. F6 v1 frontier (r_max 29+5, /8 ramp): left the 30-35m band alive.
4. F3 separate overload machinery: never needed - F2-alone raised overload windows 87->126 and
   box entries +45%; F1+F2 compose as designed.

## Remaining limitations (carried)
- Box-entry volume in settled scenarios drops ~10-20% (defense got smarter faster than attack);
  watch in live play - the intended next lever if needed is intention VOCABULARY breadth
  (cutback offers, near-post arrivals), not bonuses.
- SELECTIVE press net slightly negative (-0.13): the dial's middle softened; monitor.
- Participation breadth (~2.8 unique/possession) still open (P3-class problem).
- Mirror side-asymmetry, Curve, foul/card calibration: untouched as ordered.

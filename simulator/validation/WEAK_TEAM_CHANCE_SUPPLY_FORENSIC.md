# WEAK-TEAM CHANCE-SUPPLY FORENSIC — FINAL PRE-RENDERER DIAGNOSTIC
2026-08-24 · primary evidence LIV 2-0 WHU (246e8d3aa07e, seed 1025035663, v0.7-cal10).
DIAGNOSIS ONLY. cal10/RC6 hashes verified checkpoint==prod==hosted before and after
(engine 587a2ec7ac1cb38f, calibration 823bdbcab1e609bd, players 14bbe398203d9ba6).

## 1. Exact live-match forensic
Reproduction: digest 07cf02d6fb8229dd0463e44e == saved, 2-0 == saved; instrumentation
digest-neutral (1728 decisions / 2857 events / 5400 samples).
West Ham's match, possession-level: 138 possessions; 45 reached the final third or deeper
(13 final third, 23 box vicinity, 9 box). Their 0.38 xG contains TWO genuine box chances
(headers 0.188 @22' and 0.156 @89') - the "0 SOT" scoreboard hid real danger. Promising
possessions died at the LAST action: interceptions 9, tackles 9, heavy touches 5, receiver
denials 3 - attrition at the door, not failure to arrive. Transition supply is REAL: 143
regains, 32 with <=6 Liverpool players goal-side (cal10 commitment creates genuine windows),
50 progressed 15+ units within 10s. Overload seconds present (99).

## 2. Multi-seed distributions (60x LIV-WHU + 20x elite/strong/avg quality scenarios, cal10)
LIV-WHU weak side (the EXTREME mismatch: elite squad + human-quality tactics vs generic side):
  open-play xG P10 0.04 / P25 0.14 / med 0.30 / P75 0.46 / P90 0.63 / P95 0.71
  P(>=1 box shot) 75% · P(>=3 box shots) 30% · P(>=1 chance >=0.10) 57% · P(>=1 >=0.20) 25%
  P(zero chances >=0.05) 23% · P(zero >=0.10) 43% · West Ham scores in 27% of matches.
Quality ladder (weaker side): avg_vs_weak med 0.49 (>=0.10 chance in 90%), strong_vs_avg med
0.60 (95%), elite_vs_avg med 0.49 (80%) - the distribution scales smoothly with the gap; the
near-zero games concentrate exactly where they should: the biggest mismatches.
THE LIVE RUN IN CONTEXT: EVE 0.02 (a P~23% zero-chance draw), SUN one late chance, WHU two
real chances >=0.15 - three consecutive lowish games from a band whose per-match probability
is 40-50% against THIS Liverpool. Normal sampling, not structural starvation.

## 3. Chance-source decomposition (weak side, per match)
LIV-WHU: open 0.149 (47%) / TRANSITION 0.111 (35%) / headers-crosses-corners 0.050 (16%) /
settled 0.010 (3%) / penalties 0.08 per match. Settled-siege creation vs an elite side is
correctly near-zero; counters and crosses are alive and carry the load. In the quality
scenarios settled creation returns (32-41%) as the gap narrows - route availability is
gap-dependent, exactly as football logic wants.
ONE GLOBAL THINNESS (all teams, not weak-team-specific): THROUGH BALLS - 2 attempted /
0 completed in the live match; the THROUGH eligibility gate (runner role + >=10 progress +
<=33m + >=18 space behind + line-window) is strict. Footnote for a future polish pass; it is
not the weak-team story.

## 4. Transitions / 5. Overloads
Measured above: exploitable regains exist (32/match live), progress half the time; the cal4/
cal7-9 machinery (beaten states, run intents, 2D carries) serves the weak side too (their one
0.188 chance came from a cross after a transition sequence). Overload conversion for weak
executors fails at execution frequency consistent with attributes (see 6).

## 6. Quality separation - HEALTHY (re-confirmed)
Case-5 counterfactual holds under cal10 context: same structure with attack attributes at 86
tripled Sunderland-class threat (0.44 xG, 16.3 box entries, completion 0.68). In this battery
the weaker-side medians rise monotonically as the quality gap narrows (0.30 -> 0.49 -> 0.60).
Weak players fail the last pass/touch/duel at rates their attributes dictate - the door is
there; they fumble the key. No OVR anywhere.

## 7. Defensive imperfection - PRESENT AND EMERGENT
Liverpool's defense in the live match: 5/23 tackles failed (attacker retained), dribbled past
8 times (beat+partial), 27 aerials lost, 60 attacker-won ground duels, 3 fouls. West Ham's
defense fails more (17/35 failed tackles, 14 times dribbled). Errors emerge from duel/attribute
systems with the correct quality gradient - no scripted mistakes needed.

## 8. Set pieces
Present at sane rates for weak sides: headers/crosses/corners 16-26% of their xG; penalties
0.08-0.35/match across scenarios; the SUN live penalty (saved) and WHU's two headers show the
dead-ball/second-phase channel functioning.

## 9. cal10 interaction
Chasing genuinely opens the upper tail: weak-side xG while trailing has P90 0.63 (LIV-WHU) /
0.69-0.95 (quality scenarios); and sometimes desperation just gets them countered (case-5
exact-seed 0-3). Both outcomes occur - which is the design goal.

## 10-11. VERDICT: (A + D) - HEALTHY, driven by correct player-quality effects.
Not B: no bounded parameter suppressing threat was found (every route measurably live).
Not C: no missing pathway - transitions, crosses, corners, counters, penalties, take-ons all
produce weak-side xG; the only thin channel (through balls) is global and minor.
The recent live matches are plausible draws from a healthy, quality-scaled distribution whose
zero-chance band (~23-43% vs THIS Liverpool) is where such games should live.
SMALLEST OPTIONAL FUTURE WORKSTREAM (not required, NOT implemented): a through-ball
eligibility review (relax the compound gate marginally, all teams symmetrically) - polish, not
repair. RECOMMENDATION: freeze the football architecture at v0.7-cal10 and begin the animated
match presentation workstream.

## Freeze proof
cal10 checkpoint == production == hosted re-verified after analysis; no calibration bump; no
staging; no deployment. Artifacts: validation/forensics/case6/out/{ledger,positions,decisions,
dist6.jsonl}.

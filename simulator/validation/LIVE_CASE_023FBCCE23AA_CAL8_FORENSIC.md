# LIVE FORENSIC CASE #4 — 023fbcce23aa (MW04-LIV-NEW 3-0, first human cal8 match)
2026-08-23 · v0.7 / v0.7-cal8 / players-v3-4attrs · seed 1614610549 · DIAGNOSIS ONLY.
cal8 hashes verified checkpoint==prod==hosted (engine fa9886847b06406c). Hosted RC4 untouched.

## 1. Reproduction & instrumentation
tools/reproduce_match.py: digest 37407a037491f3b112f74df8 == saved; 3-0 == saved; 4 management
commands replayed; versions exact. 1Hz replay + extended decision hook (shot geometry) both
digest-neutral. Artifacts: validation/forensics/case4/out/{positions,decisions,ledger,
transition.json,attack.json,multiseed4.jsonl}.

## 2. cal8 gains CONFIRMED (§25 regression, this match + probes)
Take-ons, FB advancement, displacement, possession maturation all present in-match; role probe:
Overlap/88 FBs 50.4% beyond halfway / 19.2% final third vs conservative/25: 13.0%/2.0% — the
territorial role vocabulary is real on cal8. P1/P2 are NOT implicated by this case's defects.

## 3. STRANDED DEFENDERS (§2-4) — SYSTEMATIC, BY CONSTRUCTION
While a team attacks deep (attacker rel-x>=72; 2060s in this match), the defense keeps >=3
players at/above halfway 73% of seconds and >=4 players 26.9% (81 discrete 4+ episodes,
timestamps persisted; peaks 5-7). Mechanism (code): the defending band-gap caps
(ball_rel<=42: target <= back_depth + {W 25, AM 23, ST 31}) are STATIC — they hold W+ST+AM
(4-2-3-1 Newcastle: exactly 4 players) near halfway regardless of the numerical situation at
the ball. Emergency recovery (penetrated caps) exists ONLY for CB/FB/DM/CM slots; forwards/AMs
have no recovery duty and no context sensitivity (numbers-down, broken line, danger). The
engine HAS defensive-transition machinery (transition window, REGROUP pull, per-slot emergency
caps, beaten-state RECOVER) but its coverage is positional-role-fixed, not situation-derived.
Ordinary turnovers reorganize instantly (>=8 goal-side within ~0.4s median) because most
turnovers occur with the block already home — the defect is specifically the rest-offense cast
after DEEP displacement.

## 4. OVERLOADS DIE (§5) — CONFIRMED
79 final-third overload windows (>=+1 attacker; 634s total) -> 15 box entries (19%) -> 11 shots
(14%). Off-ball continuation after progressive passes (>=12m, attacking half; 158 events):
70% of advanced teammates advancing >2.5 u/s at +1s but only 55% by +3s — runs decay because
every target is recomputed per second from current geometry (pockets re-scan each 3s; no state
carries a run through to its completion). §8 hypothesis PROVEN in mechanism form: there is no
persistent run intention that survives the ball moving to another carrier; the structural
target (phase/pocket/station) retakes control within ~2-3s. The furthest-player reception
becomes an isolated 1v1 because supporters' targets are stations, not exploit-runs.

## 5. RUN-INTENTION VOCABULARY (§7)
EXISTS (static/structural): role depth offsets (OVERLAP/UNDERLAP/RUNNER...), width roles, offside-
line run timing (RUN_BEHIND/POACHER), receiving pockets + box arrival lanes (near/far/cutback at
br>=74), Family-C buildup/relief supporters, COUNTER transition runs, P1 occupation stations.
MISSING (event-triggered/persistent): exploit-run after a defender commits; trailing runner;
overload-preserving second run; cutback OFFER as an intention (exists only as a lane position);
run persistence across carrier changes; numerical-advantage awareness anywhere in movement.

## 6. WINGER CARRIES (§9-12) — ONE-DIMENSIONAL BY ARCHITECTURE
Code: _execute_carry targets old_rel + gain at CONSTANT y ("carries never change lane");
_space_ahead evaluates only the straight-ahead corridor; DRIBBLE-BEAT advances +7 with tiny y
noise. Measured (this match, winger carries in attacking half): straight_forward 187,
diagonal_outward 55 (width-role y-drift between actions), backward/hold 37,
**diagonal_inward 0, lateral_inward 0**. Gakpo: 45 straight / 34 hold / 9 outward / 0 inward.
Inside cuts and goalward diagonals DO NOT EXIST in the movement space (§10 classified: single-
vector carry generation). §12: no "cross attractor" — worse: a NOTHING attractor: 167 wide
final-third receptions -> 8 crosses, 4 cutbacks, 4 shots within 10s; the touchline corridor is
an absorbing state (see §7 corner deadlock).

## 7. CORNER STAGNATION (§13-14) — EXACT RECONSTRUCTION, 4-SYSTEM DEADLOCK
Authoritative: 95 SECONDS at 78:05-79:40 (plus 53s at 88:08, 25s at 72:56 — the user's "2-3
minutes" is the sum). Second-by-second: Gakpo parked at (96, 11) — the exact CARRY clamp corner
(clamp(rel+gain, 3, 96)). Every 3-5s: CARRY "PROGRESSED 5.88m" with ZERO actual movement — the
gain is computed pre-clamp, the event logs phantom distance and inflates carry stats (accounting
bug flagged). Utilities every decision: CARRY +0.17 (pressure 0.00, corridor "open" because the
only defender is 19-21m away) vs PASS -0.24..-1.8 (nearest mate never within 8m for 95s; the
eventual 32m cutback attempt was INTERCEPTED) vs SHOOT -2.38. Defensive side: nearest Newcastle
defender held 19-21m for the entire episode - the carrier sits OUTSIDE every engagement radius
(max_press <=16m at their intensity), inside NOBODY's zone (in_my_zone needs d<=4.5), byline-
defense caps the FB at rel<=16 (12 units short of the corner), and D-containment only activates
for press-ELIGIBLE defenders. There is NO mechanism that escalates pressure on a stationary
unpressured carrier (§14: confirmed absent) and no time-wasting logic (not deliberate).
Classification: carrier decision deadlock (phantom carry beats bad passes) x defender
non-engagement hole x support-station geometry (no outlet within range) x boundary clamp.
482 fifteen-second stagnant windows in the match overall (§15).

## 8. SHOT ORIGINS (§16-20)
32 shots; bands: <10m 4 (0.93 xG), 10-16m 8 (1.17), 16-25m 3, 25-30m 4, 30-35m 11, 35m+ 2 —
17 shots >=25m carrying 0.28 xG total; every one has xG<=0.023 with the familiar all-bad-menu
signature. Extreme geometry exists: GK Okoye 48.6m from y=98.9 (own clearance context), Salah
31.4m at y=95.7. CANDIDATE GEOMETRY (§18): SHOOT candidacy is rel_x>=66 ONLY — no angle, no
width, no corridor input. Measured: 976 SHOOT-candidate decisions; 34% arise at EXTREME width
(|y-50|>=36); selection leak 2.25% overall (extreme-wide 1.5%, central 3.5%) — the previously
deferred constant leak now measured WITH geometry: it fully explains the absurd shots (§20).
GOALS (§19): all three legitimate and short-range — Ekitike 11.3m header (24:30), Ekitike 11.4m
(65:48), VAN DIJK 8.5m CORNER HEADER (81:33). The "35m header goal" is a UI conflation:
Szoboszlai's 35m shot was BLOCKED -> corner -> VVD 8.5m header, all within one glide window.
REFUTED: no goal came from implausible range.

## 9. REST-DEFENSE COHERENCE (§21)
During sustained attacks the 10 outfielders are: 4-5 in the final third (P1 staffing), DM ~62-68,
CBs 42-48 (probe-gated), remaining CM/FB at stations. Division of labor exists and is coherent;
what is missing is situational modulation (recover-vs-stay decisions keyed to numbers/danger).

## 10. Multi-seed & counterfactuals — see §13b table (50-seed base, cal7 reference, 5 variants).

## 11. ROOT-CAUSE TREE
R-A' STATIC HIGH-CAST: defending W/ST/AM band-caps are context-blind -> systematic 3-5 stranded
     players; no numbers-down recovery duty for forwards. (Attackers exploit poorly due to R-B'.)
R-B' NO PERSISTENT/EVENT-TRIGGERED RUN INTENT: all off-ball movement is a per-second function of
     current geometry; runs decay in ~2-3s; overloads die (79 windows -> 15 box entries).
R-C' 1D CARRY SPACE: single forward vector at constant y; no inside/diagonal routes; corner clamp
     + phantom-carry logging; the touchline is an absorbing state.
R-D' ENGAGEMENT-RADIUS HOLE: an unpressured stationary carrier outside ~16m of everyone is
     permanently ignored (no step-up/escalation vs stationary carriers).
R-E' SHOT CANDIDACY HAS NO GEOMETRY: rel_x-only eligibility + constant softmax leak -> absurd-
     geometry attempts (34% of candidates at extreme width).
REFUTED: goals from implausible range (UI conflation); cross-attractor (it is a nothing-
attractor); P1/P2 regressions (role/territory/staffing all healthy); deliberate time-wasting.

## 12. F1-F6 VERDICT (required subset) + smallest cal9 proposal
REQUIRED: F1 (contextual recovery: numbers/danger-derived recovery duty for the high cast —
NOT universal sprint-back); F2 (persistent off-ball intentions with event triggers and decay);
F4 (2D carry destinations: candidate vectors {ahead, diagonal-in, inside, outside} scored by
space/angle/cover — fixes both inside cuts and the corner clamp trap); F6 (shot-candidate
geometry: eligibility from distance+angle+corridor, not rel_x alone — still no hard cutoff).
PARTIALLY REQUIRED: F5 (stagnation response) — most stagnation resolves via F4 (real carry
options) + D-escalation vs stationary carriers (small F5 component: defender step-up when
carrier unpressured & stationary >6-8s). NOT required as separate machinery: F3 (overload
exploitation emerges from F1+F2: defenders recover, runners persist; defender-choice geometry
already exists via pressure/containment).
Smallest cal9 workstream: F4 + D-escalation first (mechanical, low-risk, kills corner deadlock
and 1D wings), then F2 (run persistence), then F1 (contextual high-cast recovery), F6 last
(after structure changes re-measure the leak). Regression risks: F4 touches carry (cal6 carry
opportunity-cost must be preserved); F1 must not collapse counter-attacking outlets (tactic-
gated); F2 must not recreate P3's churn (intentions must be sticky, not rotating).
Validation gates: corner episodes >8s ~0; diagonal-inward carry share >0 and context-sensitive;
stranded-4+ share materially down when numbers demand recovery WITH counter outlets preserved
under COUNTER plans; overload->box-entry conversion up; 25m+ extreme-width candidates ~0;
plus the full standing battery (matrix/quality/press/parity/workload/cal6 signal/live cases).

## 13b. Multi-seed & counterfactual table (MW04 kickoff tactics, no in-match commands)
cfg                    n  goals      xG H/A     shots sh25  box  overW box/W strand4 FB>half corner_s dist
cal8                   50 0.26-1.40  0.26/1.46  25.8 13.4  41.2  65.4  0.64  0.059   30.2   166   133
cal7ref (PD off)       30 0.23-1.67  0.15/1.88  26.1 13.1  30.0  10.4  3.23  0.054    6.1   149   118
cal8_direct            12 2.58-1.08  2.04/1.47  34.8 16.1  62.7  96.2  0.65  0.155   36.3   181   151
cal8_commit_wide       12 0.83-1.67  0.70/1.63  28.5 15.6  42.6  84.1  0.51  0.079   36.5   121   142
cal8_narrow_cautious   12 0.58-1.17  0.23/1.54  24.0 11.0  42.6  68.8  0.62  0.056   30.1   164   129
cal8_passive_def       12 0.25-1.83  0.30/1.92  30.0 13.9  69.8  87.8  0.80  0.037   40.0   293   127
cal8_relentless_def    12 0.33-1.67  0.38/1.79  26.0 11.8  36.3  49.4  0.76  0.123   21.1   130   144
Readings: base rows reflect Liverpool's possession-donating KICKOFF plan (the user's live 3-0
came after their 4 in-match tactic commands; cal8_direct approximates that and wins 2.58-1.08).
§5: cal8 creates 6x more overload windows than cal7 (10.4 -> 65.4) but conversion per window
collapses (3.23 -> 0.64) - the structure now CREATES advantages that then die (R-B'), net box
entries still +37%. §13: corner-parking pre-dates cal8 (cal7ref 149s vs cal8 166s) and explodes
under PASSIVE defense (293s/match) - the engagement-radius hole (R-D') scales inversely with
press intensity. §22-23: tactical/role differentiation strong (direct/commit/narrow/press all
produce distinct signatures; Overlap FBs 50.4%/19.2% vs conservative 13.0%/2.0%). §25 regression:
FB advance 6.1% -> 30.2%, staffing/take-ons/displacement present, workload +13% (as accepted).

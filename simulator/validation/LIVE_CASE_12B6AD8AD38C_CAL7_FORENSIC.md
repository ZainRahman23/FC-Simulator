# LIVE FORENSIC CASE #3 — 12b6ad8ad38c (MW03-MCI-LIV 0-0, first human cal7 match)
2026-08-23 · engine v0.7 · calibration v0.7-cal7 · players-v3-4attrs · seed 791730844
DIAGNOSTIC ONLY. Hosted RC3 untouched. cal7 hashes verified checkpoint==prod==hosted
(engine ae5b9a9097acf23a). Note: task brief's save id had the recurring typo; persisted
save is save-e6sdbd31mt5gn04o. No management commands were issued in this match.

## 1. Reproduction & instrumentation
- tools/reproduce_match.py: digest b169d6c9e2e9b03ce1ba61f2 == saved; 0-0 == saved; versions match.
- External 1Hz replay: digest identical. Decision hook: digest identical. Pass-option audit hook:
  digest identical. All instrumentation neutrality-proven.
- Artifacts: validation/forensics/case3/{harness.py, territory.py, possession3.py, passaudit.py,
  multiseed3.py, out/*.json(.gz)}.

## 2. PITCH BOUNDARIES (§5-8) — ENGINE HEALTHY, PRESENTATION BROKEN
Authoritative: ZERO coordinate violations in 108,000 player-seconds (x within [4.0, 97.0];
y touches exactly 0/100 only during legal touchline play: throw-ins/corners/wide containment;
y<=1 or y>=99 for ~674 player-seconds/match). Ball: zero out-of-[0,100] seconds. Every cal7
movement system clamps targets to legal space (Vec2.clamp 0-100; _desired_target/pocket/support
clamp 4-96; move_toward clamps every step).
PRESENTATION MECHANISM (exact): the pitch SVG draws its lines INSET — field rect x 1.5..98.5,
y 1.5..60.5 inside a 0-100 x 0-62 viewBox stretched over the container — but liveScreen(x,y)
maps engine coordinates to the FULL container (left=x%, top=y%) with no inset compensation,
and the 34px marker box (margin -17/-13px) overhangs its anchor. Consequences: any legal engine
position within ~1.5% (x) / ~2.4% (y-equivalent) of the boundary renders ON or BEYOND the drawn
line; corners/throw-ins/wide play render clearly outside; all four sides affected. The BALL at
y=0/100 (throw-ins) renders outside the drawn line while play continues afterwards.
Verdict: PITCH BOUNDARY INTEGRITY (engine) = HEALTHY; (presentation) = BROKEN (app-only fix:
map engine 0-100 onto the drawn line rectangle and offset markers; NOT done in this phase, §51).

## 3. TERRITORIAL FREEDOM (§9-16, 38, 41) — THE CAGES ARE REAL AND QUANTIFIED
Exact match (in-possession, attack frame):
- FB during middle/final/box possession: median 24.5/30.0/33.6; beyond halfway 2.2/1.8/1.3% of
  seconds; final third 0/0.9/1.0%. (Max 84.2 occurs only via with-ball actions/set pieces.)
- CB during SUSTAINED (10s+) final-third possession (81 runs, 1077s established): median 31.5,
  p90 38.6, max 46.4; one-CB-near-halfway share 0.6%; both-CBs-deep(<38) 87.9%.
- Anchor leash: median distance from anchor 7-11m, p90 16-24m; movement target within 8m of the
  formation anchor 32-53% of all seconds.
- Group x phase medians confirm narrow bands (CB 15->33 across all phases; FB 25->34).
§38 REACHABILITY CEILINGS (maximally favorable: settled possession, ball rel-x 76,
AMBITIOUS/COMMIT/SHORT, 40s of unimpeded target pursuit):
  CB 45.0 · FB 50.4 · DM 69.6 · CM 72.5 · ST 75.7 · W 85.7
A CB structurally CANNOT reach halfway; an FB can barely touch it; in the huge FINAL_THIRD phase
(ball 66-78, 1918s of case-2 equivalent) the six-yard-relevant zone is structurally reachable
only by wingers. WHY (§13, exact formula audit): Family B line-targets (back cap 40/46/52 by
risk) MINUS the cal3 shell-stagger subtraction (-9.0·shell FB, -8.5 DM, -7.5 CM at ball>=58 vs
set shell) MINUS micro-oscillation; box-commitment bonuses exclude CBs entirely and cap FBs.
The cal3 stagger was designed when bases were HIGH; under cal7 line-targets it double-subtracts
exactly in settled sieges. CONFIRMED ROOT CAUSE R-A.
Consequence measured: City attacked the final third with a mean 3.1 players vs 6.0 recovered
defenders (1328s) -> permanently outnumbered -> 8 box entries from 147 possessions. City
attempted 81 take-ons (18 BEATs) — individual routes because no structural ones exist.

## 4. POSSESSION MATURATION (§17-21) — LARGELY FIXED BY CAL7 (a genuine win)
- City: 147 possessions, mean 26.2s, median 20s, P90 56s, max 179s; 40 possessions of 6+ actions,
  23 of 13+ actions. Liverpool: 96 possessions, mean 17.1s, median 7s.
- Hazard by ACTION NUMBER: 0.213 / 0.216 / 0.145 / 0.081 / 0.175 / 0.158 (actions 1..5, 6+):
  DECLINING through early actions — the near-memoryless cal6 ecology (flat 6-11%/s) is gone.
- vs Live Case #2 (cal6): possessions 439->243; mean duration 12s->22s; passes/poss 1.5->~2.7;
  CB-CB/CB-FB/FB-CB links 2/0/0 -> 2/4/6 plus DM->CM 17, CB->DM 6, DM->CB 6.
- Combination play exists: 34 one-twos (A->B->A <=8s), 91 A->B->C chains, 54 possessions with
  3+ completed passes. The "3-4 touch ping-pong" perception was ~half presentation (see §8):
  Liverpool's own possessions WERE short (median 7s under City's press), the UI shows one
  snapshot per 6-24s, and the boundary/glide artifacts erode trust in what is rendered.
- Participation is genuinely narrow: unique players per possession mean 2.8 (City) / 2.2 (LIV);
  only 8/147 City possessions involved 6+ players. Circulation cycles among the 2-3 nearest
  designated supporters. PARTIAL defect (R-B).

## 5. SUPPORT: EXISTS AND IS USED (§24-27)
Pass-option audit (digest-neutral, 855 deep/mid choices):
- short option (<=14m, not deep-backward) AVAILABLE at 71.8% of choices (cal6 case-2: FB had
  0.03 mates within 8m — availability repaired);
- when available, a short option is SELECTED 43.3% of the time;
- selected direction mix: forward 63%, backward 24%, lateral 13%; mean utility gap of chosen
  forward balls over the best short option: -0.055 (forward is NOT being systematically forced).
§26 utility audit: utility = 1.20·progress/20 + 0.22·centrality + 0.78·ln(p_exec) + tactic terms.
§27 finding: a backward/lateral reset is charged its negative progress and receives NO
future-state credit (only small block-gated recycle bonuses). §28: there is no representation of
possession-state quality, defensive displacement, or lanes-created-by-circulation. Confirmed
architectural limitation — but NOT the binding constraint today (see §6).

## 6. WHY RECYCLING HAS NO FUTURE VALUE (§29, 33) — CONFIRMED ROOT CAUSE R-C
Defensive lateral displacement: defending-team y-centroid tracks ball y with corr 0.74 but
amplitude ratio only 0.24 (defense σ 7.5 vs ball σ 30.9). After switch-like moves (ball crosses
>=25 y-units in <=4s; 25 such passes in the match), the defense's largest lateral gap is 16.8
units vs 17.6 baseline — switches open NOTHING. Circulation cannot manipulate the block, so
direct/vertical play and individual take-ons remain the only penetration routes. This also
explains why the earlier progress-vs-risk rebalance (see in-code note) made football MORE
sterile when it suppressed launches.

## 7. MATCH ANATOMY (§34-37)
City 72.2%: 147 possessions at median 20s — LONG, SAFE, STERILE possession (not many short ones):
pressure>0.5 at only 32% of City decisions (Liverpool's Selective press + cal7 containment =
free circulation), but 8 box entries, 8 shots (junk-tail 9 total 25m+ both teams), 3 chances
xG>=0.05, 0.30 xG. Liverpool 27.8%: 77% of decisions under pressure>0.5, 41 self-clearances
(Patient/Short/Secure plan under City's press), median possession 7s: they could neither keep
nor progress it. §37 verdict: (D)+(E) — possessions fail to convert into settled PENETRATION
because the final third is understaffed (R-A) and circulation does not displace (R-C); with a
side order of (C): Liverpool's own low-press plan donated territory. NOT primarily "good
defending" and NOT attacker quality.

## 8. VISUAL AMPLIFICATION (§48)
Authoritative City median possession 20s vs perceived ping-pong: at 1x the UI renders ONE
snapshot per 6 simulated seconds (24s at 4x) and cosmetically glides. A 20-second, 7-action
possession renders as ~3 keyframes. Boundary mapping error (see §2) further breaks trust.
Presentation amplifies but does not create the confirmed structural findings.

## 9. FAMILY REASSESSMENT (§44-47)
- A (temporal): WORKING AS INTENDED. Hazard declines with action number; possessions mature;
  inter-action cadence contextual (urgent 1-2s under pressure, ~3-6s free).
- B (phase shape): PARTIAL/INSUFFICIENT. Metrics moved but the caps + cal3 shell-stagger
  interaction leaves CB<=45/FB<=50.4 structural ceilings; final third understaffed 3.1v6.0.
  The cal7 acceptance metrics measured slopes, not staffing sufficiency.
- C (support): PARTIAL. Availability repaired (72%) and used (43%); but supporter set = nearest
  2-3 players -> participation width 2.8 unique/possession; no rotation of who offers.
- D (engagement/containment): WORKING AS INTENDED (0.32 pressure share for the free team,
  containment world) — but note it makes passive pressing very donation-heavy (LIV 28%).
- E (take-ons): WORKING AS INTENDED (81+33 attempts, 18+6 BEATs, used as the only available
  penetration route — which exposes R-A rather than E misbehaving).

## 10. ROOT-CAUSE TREE (§53)
CONFIRMED:
R-A phase translation FUNCTIONALLY INSUFFICIENT (caps + stagger double-subtraction) ->
     rest-attack understaffed (3.1 v 6.0) -> sieges sterile -> 0.30 xG from 72% possession.
R-B support participation narrow (nearest-2-3 designation, no rotation/relay) ->
     2.8 unique players/possession -> circulation is local ping-pong between few players.
R-C defense does not displace under circulation (lateral amplitude 0.24, switches open nothing)
     -> recycling has no future value -> myopic single-action utility is LOCALLY CORRECT.
R-D presentation: boundary mapping inset error + 6-24s snapshot glide -> "off-pitch players" and
     amplified ping-pong perception. (App-only.)
REFUTED:
- "possessions remain very short under cal7" — City median 20s; hazard declines with action age.
- "support exists but is ignored" — 43% selection when available; forward gap -0.055.
- "pass utility structurally forces long balls" — direction mix 63/24/13 with short preference
  terms active; the sterile outcome is caused upstream (R-A/R-C).
- "off-pitch positions are an engine defect" — zero authoritative violations.
- "anchors continuously drag players back" (in the strong sense) — excursions to p90 16-24m
  exist; the binding constraint is target CAPS, not restoring force.

## 11. DESIGN ANSWERS (§54-56) — recommendation only, NOT implemented
§54 RELATIONAL POSITIONING: YES, required for the final third. The next package should position
the rest-attack RELATIVE to the opponent block and ball (occupy half-spaces/zones, staff the box
approach) rather than enlarging anchor offsets further. Formation stays the responsibility map.
§55 POSSESSION-STATE: YES, a small interpretable state (SECURE/PROGRESSING/PENETRATING/
UNDER_PRESSURE/RESETTING) should modulate movement priorities & risk appetite (no bonuses).
Much of it exists implicitly (settled_probe, block_resistance, transition) — formalize, not add.
§56 LOOKAHEAD: NOT full search. The smallest causal mechanism is to make circulation actually
DISPLACE the defense (fix R-C: real lateral block shifting, marking hand-offs, gap creation).
Once resets change the future state physically, the existing myopic utility will value the
resulting geometry without any state-value bonus. Combine with R-A staffing fix. Only if that
proves insufficient, consider a bounded 1-step state credit for switches/resets.

## 12. PROPOSED NEXT WORKSTREAM (cal8 candidate): "Penetration & Displacement"
P1 Rest-attack staffing (R-A): rework the settled-siege interaction — the shell-stagger becomes
   a STAGGERED OCCUPATION (edge-of-box/cutback/second-line stations by slot) instead of a flat
   depth subtraction; raise/risk-scale back-line caps (CB near halfway in dominant settled
   possession; FB genuinely enters the attacking half per role/effort/tactic); box-approach
   staffing target derived from opponent block, not anchors (relational, §54).
P2 Defensive displacement (R-C): block shifting with real amplitude vs ball circulation
   (side-overload response, weak-side compression, marking hand-offs), so switches/resets create
   genuine gaps — pressing/containment identities preserved.
P3 Participation rotation (R-B): supporter designation rotates by phase/lane (third-man relay,
   weak-side involvement), widening unique-player participation causally.
P4 Presentation (app-only, separate): boundary mapping fix + denser keyframes.
Validation: reachability ceilings (CB>=~50 risk-gated, FB final-third share meaningful under
attacking roles), final-third staffing (>=4.5 attackers in sustained sieges at COMMIT),
displacement amplitude (>=0.45 ratio), switch gap creation (>baseline), unique players/possession
(>=3.5 possession teams), funnel (box entries per settled siege), plus the full standing battery
(matrix/quality/pressing/parity/live-case counterfactuals, §60 principles).

## 13. Multi-seed & counterfactuals
(50-seed MW03 base + LIV tactical/role variants; results appended by multiseed3 aggregation.)

## 13b. Multi-seed & counterfactual results (completed)
variant          n  LIVposs  dur H/A     uniq H/A    box H/A    xG H/A     FB>half% CBp90 atkFT  goals/m
base             50  0.33   24.7/19.0  2.78/2.53  10.1/ 1.9  0.33/0.09    1.0    36.9  3.06  0.34-0.12
liv_direct       15  0.33   16.6/12.5  2.53/2.39   8.0/11.9  0.41/1.31    1.5    38.5  3.16  0.47-0.93
liv_short_press  15  0.49   15.8/16.0  2.27/2.34   3.1/ 2.8  0.20/0.25    0.5    36.4  2.92  0.13-0.13
liv_attack_fbs   15  0.34   23.8/19.0  2.81/2.62  10.8/ 2.5  0.55/0.25   12.4    39.0  3.19  0.33-0.20
Readings: the live match is typical of its seed population (LIV 33%, sterile City 0.33 xG).
§39 tactical range: REAL — Direct Liverpool penetrates (1.31 xG, 11.9 box entries, wins on
average); two patient sides produce 0.26 total goals/match (settled-siege sterility dominates).
Pressing intensity causally moves possession share (0.33 -> 0.49). §40 role range: PARTIAL —
Overlap/88-effort fullbacks raise beyond-halfway share 1.0% -> 12.4% (roles matter) but ceilings
still bind. DECISIVE: attackers-in-final-third is 2.9-3.2 in EVERY variant — the rest-attack
staffing wall (R-A) is tactic- and role-independent. One-twos 34 / A->B->C 91 in the live match:
combination machinery exists; it lacks bodies ahead of the ball and a displaceable defense.

## 14. §58 CLASSIFICATION
PITCH BOUNDARY INTEGRITY: engine HEALTHY / presentation BROKEN
TERRITORIAL FREEDOM: INSUFFICIENT (structural ceilings CB 45 / FB 50.4)
PHASE TRANSLATION: PARTIAL (works to the cap; stagger double-subtraction in sieges)
FORMATION ELASTICITY: PARTIAL (p90 excursions 16-24m; caps bind, not restoring force)
FULLBACK ADVANCEMENT: INSUFFICIENT (1-2% beyond halfway; 12% under Overlap = partial role range)
CB COMPRESSION: INSUFFICIENT (sustained sieges: both deep 88%, max 46.4)
BUILDUP SUPPORT: PARTIAL (availability 72% - repaired; participation width 2.8 unique - narrow)
SUPPORT USAGE: HEALTHY (43% selection when available; direction mix 63/24/13)
PASS CHOICE: HEALTHY given current geometry (myopia is locally correct while R-C holds)
RECYCLING VALUE: MISSING MECHANISM (no future-state credit AND no physical future value: R-C)
DEFENSIVE RESPONSE TO CIRCULATION: BROKEN/MISSING (amplitude 0.24; switches open nothing)
POSSESSION MATURATION: HEALTHY (median 20s possession, declining action hazard) - cal7 win
TURNOVER HAZARD: HEALTHY (0.21/0.22/0.15/0.08 by action number - no longer memoryless)
TACTICAL BUILDUP DIFFERENTIATION: HEALTHY (direct/patient/press produce distinct football)
ROLE TERRITORIAL DIFFERENTIATION: PARTIAL
CHANCE-CREATION FUNNEL: BROKEN in settled sieges (147 poss -> 8 box entries -> 0.30 xG)
CAL7 TEMPORAL REFORM (A): HEALTHY
CAL7 ENGAGEMENT (D): HEALTHY (note: passive plans donate heavily - monitor)
CAL7 TAKE-ONS (E): HEALTHY (81 attempts/18 beats as the only penetration route)
VISUAL REPRESENTATION: BROKEN (boundary mapping + 6-24s keyframes)

# PENETRATION & DISPLACEMENT (cal8 candidate) — WORKING REPORT
2026-08-23. Diagnosis source: LIVE_CASE_12B6AD8AD38C_CAL7_FORENSIC.md (authoritative).
Safety: cal7 checkpoint verified before work (engine ae5b9a9097acf23a); hosted RC3 untouched;
all engine work in simulator/exp_pd/ behind PD flags {P1,P2,P3}; flags-OFF reproduces live case
#3 digest b169d6c9e2e9b03ce1ba61f2 bit-exactly (gate held through every edit).

## P1 — REST-ATTACK STAFFING (flag P1) — ACCEPTED
Design: territorial ceilings generated ONCE. (a) The cal3 shell-stagger flat depth subtraction
(-9·shell FB / -8.5 DM / -7.5 CM...) is replaced vs set shells by staggered OCCUPATION STATIONS
relative to the BALL (FB ball-14, DM ball-18, CM ball-11, W/AM ball-5..8 rel units, shell-scaled);
stations pull deep targets UP toward the play instead of retreating them. (b) Line targets split:
FB line (0.62br+2, caps 56/64/72 by risk, +10·effort for OVERLAP/WIDE_RUNNER/UNDERLAP roles);
CB line (0.55br-2, caps 42/48/54 with the last 6 units gated by settled-probe maturity - CBs EARN
halfway in dominant possession); DM 0.62br+6 caps 62/68/74; mid 0.70br+13 caps 74/80/84.
Transitions remain exempt; rest defense unchanged (recovery machinery untouched - see transition
evidence below).
Evidence: reachability ceilings (max reachable rel-x, maximally favorable settled possession):
CB 45.0->49.7, FB 50.4->61.5(default role; higher with Overlap). Live case #3: FB beyond-halfway
share 1.9%->43.9%, CB median 31.5->36.2, box entries 6->11. COMMIT sustained sieges (3 seeds,
final source): staffing 3.79->4.78 mean (>=5 share 65%) — GATE >=4.5 MET; composition both
wingers + ST + 1.5 CM + FBs. Role counterfactual preserved (Overlap FBs materially higher).

## P2 — DEFENSIVE BLOCK DISPLACEMENT (flag P2) — ACCEPTED
Design: (a) defending width-pull with real amplitude (WIDE .20 / BALANCED .36 / NARROW .50) +
collective side-shift 0.12·(ref_y-50) + weak-side central shading 0.22 — all against an
EXPONENTIALLY SMOOTHED ball reference (ema 0.82/0.18 per second): the block slides with inertia
against sustained circulation, it does not vibrate against one-second pings (jitter version
REJECTED: +25% team distance). (b) Strike-the-window urgency (Family-A extension): an advanced
receiver (rel-x>=55) with >=5m separation — the state a switch now physically creates — attacks
immediately instead of surveying while the block recovers (first version without this REJECTED:
switches opened space but nothing arrived before it closed).
Evidence (final source): displacement amplitude 0.249->0.452 (GATE >=0.45 MET; corr 0.73->0.89);
weak-side openness 14.7->22.2m; switch reception separation 6.0->10.0m vs normal-reception 6.2m
(cal7: 6.0 vs 7.0 — switches used to buy NOTHING); switch volume rose emergently 89->118 with
zero utility changes — recycling now has physical future value, exactly per the case-3 §56
recommendation (no lookahead, no reset bonuses).

## P3 — PARTICIPATION ROTATION — REJECTED (honest classification)
Variants tested: rotation penalty 7.0 + weak-side outlet + give-and-go; rot 3.0; give-and-go
only; each with shade 0.22/0.14. ALL degraded the funnel in combination (box/xG down ~30-60%;
long-possession unique players 4.27->4.47 only; receiver entropy flat). Mechanism: supporter
churn destabilizes the geometry that P1/P2 need. Participation breadth (2.8 unique/possession)
remains a documented limitation for a future workstream — NOT masked with a scalar.

## P4 — PRESENTATION BOUNDARY REPAIR (app-only) — ACCEPTED
web/touchline.html liveScreen() now maps engine (0-100)^2 onto the DRAWN line rectangle
(x: 1.5+0.97x %, y: 2.419+0.9516y %). Verified: in-page corner mapping exact; real-match browser
check: 0 of 22 marker dot centers outside the drawn lines (worst overshoot 0px). Engine
coordinates untouched; football movement untouched. 41-test app battery green with the fix.
NOT deployed (hosted RC3 untouched).

## Guardrails (pre-EMA run; final-source rerun in progress at time of writing — final table below)
cal7 -> cal8-candidate, same scenarios/seeds: settled levels within -13..+25% bands; mirror
shares IMPROVED (aggressive 0.310->0.408, ultra 0.462->0.521); 25m+ junk DOWN in every settled
scenario (e.g. quality 13.7->11.3, controlled 8.0->6.7) — the case-3 §39 prediction (junk falls
when structure improves) realized without touching SHOT; pressing dial monotone, PASSIVE net
improved (-0.95->-0.70), RELENTLESS unchanged (+0.33). Workload: pre-inertia +25% REJECTED;
post-inertia +14% (case: 115.6->132.1 km) with fatigue absorbing it (FT energy 75.1->72.2, no
collapse) — real cost of real movement, stamina untouched per §49/50.

## Integrity
- Flags-OFF identity: held through every edit (digest b169d6c9e2e9b03ce1ba61f2).
- P1P2 parity + same-seed reproducibility: PASS (2 seeds, run==advance==rerun).
- 82 core tests vs exp_pd flags OFF: PASS. New unit tests tests/test_penetration.py (6) PASS.
- Live-case counterfactuals (final source): #3 base typical; #2 (LIV-LEE): xG 1.66->2.59 total
  (attacking matchup livelier); COMMIT staffing gate met.

## FINAL guardrails (final source, cal7 -> cal8, matched scenarios)
scenario              xGtot         Δ%    shareH          25m+        distH    transXG(c8)
ultra                 0.23->0.09   -61%  0.462->0.595   6.5->4.4    85->97    0.00
controlled            0.60->0.52   -13%  0.379->0.452   8.0->6.4   116->135   0.04
balanced              0.95->1.04    +9%  0.432->0.454  12.6->11.1  118->144   0.22
aggressive(stress)    7.49->8.19    +9%  0.310->0.353   5.0->6.2   172->186   6.94
avg_vs_avg            0.86->1.01   +17%  0.517->0.446  13.7->10.8  119->144   0.18
strong_vs_avg         1.07->1.12    +5%  0.534->0.615  14.0->11.4  120->148   0.24
elite_vs_avg          1.10->1.25   +13%  0.673->0.686  12.4->9.6   122->148   0.31
avg_vs_weak           0.95->1.29   +35%  0.670->0.686  12.7->12.2  119->145   0.22
press PASSIVE..RELENTLESS: nets -0.73 / +0.04 / +0.35 / +0.25 (cal7: -0.95/-0.09/+0.19/+0.33) —
over-pressing now pays a real cost against a displacing opponent (RELENTLESS < AGGRESSIVE): the
healthiest dial shape any calibration has produced. Junk 25m+ DOWN in 10/12 scenarios (structure,
not SHOT, was the cause - as case-3 predicted). Quality gradient monotone (0.446<0.615<0.686,
avg_vs_weak 0.686). Mirror home-share improved broadly (pre-existing away bias reduced). Workload
+14-21% (fatigue absorbs: FT energy 75->72) - real cost of real movement; stamina untouched.
Transition xG present in settled scenarios: advanced lines are genuinely punishable (rest-defense
risk is real).
30-seed MW03 smoke: the patient-away-vs-selective pairing REMAINS sterile (City xG 0.28->0.19)
- with both new structures active this specific pairing is a legitimate low-event grind;
penetration gains appear in balanced/attacking ecologies. Documented honestly, not tuned.

## Final decision: ACCEPT PENETRATION & DISPLACEMENT CAL8 (P1+P2 engine, P4 app; P3 REJECTED)
- Production commit: PD defaults {P1 True, P2 True, P3 False}; flags-off path == cal7 bit-exact.
- Calibration bumped ONCE: v0.7-cal7 -> v0.7-cal8. Engine v0.7. players-v3-4attrs untouched.
- Production == validated exp variant: 5/5 matched-seed digest equality.
- Battery: 88 core (82 + 6 new test_penetration.py, ZERO expectation updates needed) + parity +
  41 app tests + P4 browser boundary check (0/22 marker centers outside drawn lines).
- Checkpoint: checkpoints/cal8-checkpoint-20260823 (blake2b engine e6fcd1cc5fd1fb63c9a2,
  calibration f2ae6c6ecc1d658adb8a, players e7f2cda3... unchanged, touchline fa73702761...).
- RC4 STAGED at ~/TouchlineRC4-staging (app 0.1.0-rc4 with cal8 football + P4 mapping).
  NOT deployed. Hosted RC3 (cal7) verified live and untouched.

## Remaining limitations (carried, documented)
- Participation breadth ~2.8 unique players/possession (P3 rejected; needs a future mechanism
  that broadens involvement without destabilizing support geometry).
- 25m+ junk tail reduced but present; SHOT-candidacy work still deferred.
- Mirror side-asymmetry reduced, not eliminated (pre-existing, deferred diagnostic).
- Patient-vs-passive pairings are very low-event (defensible football; monitor in live play).
- Workload absolute scale high vs real football (~135-155 km team); consistent internally.

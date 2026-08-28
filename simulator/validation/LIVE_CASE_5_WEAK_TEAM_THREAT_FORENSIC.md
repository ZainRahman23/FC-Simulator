# LIVE FORENSIC CASE #5 — WEAK-TEAM OPEN-PLAY THREAT / GAME-STATE ADAPTATION
2026-08-23 · SUN 0-2 LIV (823b438c4890, seed 1674399537, v0.7-cal9) + EVE 0-0 LIV reference
(ea63cd2c4c6d, cal5-era persisted record). DIAGNOSIS ONLY — production RC5/cal9 untouched,
hashes verified checkpoint==prod==hosted (engine 0ecafb39946d4059).

## Phase 1 — Reproduction
MW05: digest a2575ffe9153601772a55042 == saved; 0-2 == saved; seed/versions exact; zero
management commands from the user (played straight). External 1Hz replay + decision hook both
digest-neutral (1687 decisions, 2673 events). MW01 Everton correctly NOT re-simulated (cal5
historical record vs cal9 engine — the tool refuses cross-version claims); its persisted
authoritative ledger is used directly. Artifacts: validation/forensics/case5/out/.

## Phase 2 — Threat decomposition (CRITICAL CORRECTION CONFIRMED, WITH A TWIST)
Sunderland's ledger-shot xG 0.291 contains NO penalty at all: the 76:47 Xhaka penalty was
SAVED (p_goal 0.785) and penalties are ledgered separately from open-play shots. The late rise
from ~0.05@62' came from Dobson's 82:38 close-range header (7.5m, 0.185) — their one genuine
chance, created AFTER the coach-AI CHASE switch. Decomposition: transition 1 shot/0.018,
other open 3/0.088, header 1/0.185; box entries 5 (3 of them post-CHASE); possessions >=0.05 xG: 2.
Everton MW01: 0.019 open-play xG, 2 shots, ZERO box entries, zero possessions >=0.05.
Both matches: essentially no open-play threat until (SUN only) the late CHASE window.

## Phase 3 — Sunderland possession autopsy (minute bands)
band   poss  dur    acts  uniq | poss% ahead FB>half passes comp fwd long | shots box xG
0-15    17  21.5s   5.8  2.94 |  31%  4.74   10%     39   59%  64%  46%  |  1    1  0.02
15-30    7  31.6s   8.4  3.57 |  44%  3.85    4%     41   71%  68%  39%  |  1    1  0.02
30-45   11  32.5s   9.1  3.45 |  37%  3.59   12%     31   52%  61%  42%  |  1    0  0.02
45-51 (0-1 at 50:51 ... second goal 50') -> 51-68 (0-2, PRE-CHASE):
                              |  32%  3.35   12%     31   58%  55%  39%  |  0    0  0.00
68-90 (CHASE fires 70:00)     |  40%  3.08   25%    131   42%  63%  47%  |  2    3  0.24
Reading: possession maturation works even for the weak side (32s means mid-match) but is
STERILE; the ONLY threat window of the match is post-CHASE, where behavior genuinely
transforms (FB advancement 12->25%, pass volume x3 QUICK tempo, box entries, 0.24 xG) at a
real cost (completion 58->42%).

## Phase 4 — The 51% completion question: ANSWERED (B + E + D, NOT A, NOT C)
287 passes, 149 completed (52%). Failures: LOOSE 76 (touch/reception control), INTERCEPTED 30,
RECEIVER_DENIED 13, AERIAL_LOST 12, KNOCKDOWN 6, OUT 1.
- B (already too direct): 44% of ALL their passes were 27m+ launches (completion 47%);
  failed passes mean 26.7m, 49% of failures were 27m+.
- E (player quality): even their SHORT <15m passes completed only 56% — generic attributes
  failing receptions/executions at every range (mean p_execution 0.59 on failures, 0.65 on
  completions — mediocre everywhere).
- D (Liverpool press): SUN decisions at mean pressure 0.34 vs LIV 0.25.
- NOT C: support geometry PARITY with Liverpool (mates<=8m 0.32 vs 0.29; <=12m 0.77 vs 0.75) —
  cal8/cal9 structure serves both sides; the outlets exist, the executions fail.
- NOT A: they were never passive — forward share 55-68% all match.
=> Making them MORE direct pre-CHASE would worsen the football. The deficiency is graduated
RISK-STATE adaptation, not baseline directness.

## Phase 5 — Game-state adaptation: THE BINARY-CHASE FINDING
Code (_coach_check, every 300s): the ONLY game-state response is minute>=68 & losing -> CHASE
(8 tactic dims + 4-2-3-1) and minute>=75 & winning -> PROTECT. Nothing responds to deficit
before 68', to two-goal vs one-goal margins, to chance droughts, territorial suppression or
time-remaining continuum. Measured: SUN 0-2 from 50:51; NOTHING changed for 19 minutes
(51-68' band identical to earlier behavior: ahead-of-ball 3.35, FB 12%, zero shots); CHASE
fired at 70:00 and the behavioral change was REAL and material (see band table) — the cal7-9
tactic-causal machinery works when pointed at it. The gap is graduated, earlier, margin- and
time-aware risk appetite — an EV-of-game-state concept, not a stronger CHASE.

## Phase 11 — Salah record (NO CHANGE MADE)
100 lateral-box-edge decisions (relx>=74, |y-50| 16-34): SHOOT present in the menu at 89/100
(F6 does NOT over-gate the zone); chosen 3x. He declines because raw xG there is genuinely
0.016-0.05 (tight angle) -> shoot_u -1.8..-2.4 vs carry/pass alternatives — the accepted cal6
truthful-signal behaving as designed. Instrumented and archived; no shot tweak proposed.

## Phase 7 — Multi-seed distributions (40 seeds each fixture, cal9, kickoff tactics)
weak side (HOME) open-play xG:
                 mean   med   P(<0.10) P(<0.20) shots<=2 shots<=5 box=0 box_mean comp long  LIVxG  goals
SUN v LIV (40)   0.216  0.181   30%      57%      20%      72%     0%    6.2    0.56 0.44  2.26  0.05-2.62
EVE v LIV (40)   0.278  0.231   30%      45%      28%      78%     5%    4.8    0.55 0.44  1.74  0.17-2.17
Verdict: the two live near-zero performances are INSIDE the normal band (P(op-xG<0.3) ~65%),
i.e. NOT statistical flukes to be ignored NOR outliers to be excused — the distribution itself
sits low. A weak team's median day at Anfield-strength opposition is ~0.2 op-xG with 72-78%
of matches at <=5 shots. Occasional 0.02 days are valid tails; their FREQUENCY is the issue,
and the cause decomposes below.

## Phase 8 — Tactical counterfactuals (same seeds/players)
sun_attacking (Ambitious/Commit/Quick/Counter): op-xG 0.216 -> 0.451 (median 0.533; 0% of
matches <0.10), box 6.2 -> 8.9, WITH REAL COSTS: LIV xG 2.26 -> 2.80, goals conceded 2.62 ->
2.83, completion still 0.55. sun_short_patient: 0.336 with fewer box entries. Tactics are
BEHAVIORALLY differentiated and already causal (§8 PASS) — the attacking configuration
approximately shows what a graduated risk policy would unlock when chasing.

## Phase 9 — Player-quality counterfactual (same tactics, attack attributes raised to 86)
sun_elite_attack: op-xG 0.442 (P(<0.20) = 8%), box entries 6.2 -> 16.3, completion 0.56 -> 0.68,
shots<=5 share 72% -> 8%. Elite players exploit the SAME structural opportunities massively:
the geometry supplies viable attack; weak executions fail it. LEGITIMATE quality
differentiation, not architectural starvation (§9 PASS).

## Phase 10 — cal9 preservation (sun_cal8 = AI flags OFF path, 20 seeds, same fixture)
cal8 -> cal9 on identical setup: diagonal-in carries 0 -> ~293/match (F4 alive), >=35m shots
4.1 -> 0.07/match (F6 alive), take-on beats present both, LIV xG 1.65 -> 2.26 (+37% — the
attacking improvement the user observed is REAL at scale), weak-side op-xG unchanged
(0.27 vs 0.22 — cal9 did not suppress weak teams; they were equally toothless under cal8).

## Root-cause hierarchy
1. PLAYER QUALITY (legitimate, dominant): generic attributes fail executions at all ranges
   (short-pass completion 56%); elite counterfactual proves the structure is exploitable.
2. STATIC CPU GAME-STATE POLICY (the actionable defect): one binary CHASE at minute>=68.
   19 minutes at 0-2 with zero response in the live match; the only threat of the match
   arrived immediately after CHASE fired — the tactic-causal machinery works, the POLICY that
   points it is primitive. No margin sensitivity, no drought sensitivity, no continuum.
3. CONSERVATIVE DEFAULT PLANS amplify 1+2 (44% launch share at baseline).
4. LIVERPOOL LEGITIMACY: elite pressing/quality (their 2.26 xG is earned, not scripted).
REFUTED: support-geometry starvation (parity with LIV); passivity (fwd 55-68% throughout);
penalty-inflation (the penalty was SAVED and is not even in the shot-xG ledger); cal9
regression of weak teams; Salah F6 over-gating (89% menu presence).

## Proposed next workstream (NOT implemented): "Game-State Risk Policy (coach layer)"
Smallest causal mechanism: replace the binary 68' CHASE with a graduated, deterministic
chase/protect pressure derived from (goal margin, time remaining, recent open-play threat
drought) that steps the EXISTING tactic dimensions in stages (e.g. one risk notch at any
2-goal deficit, two from ~60' losing, full CHASE late; symmetric staged PROTECT), plus
optionally margin-aware substitution urgency. Coach-policy only — zero engine/probability/
attribute changes; all effects flow through the already-validated tactic-causal systems, and
all costs (counters conceded, workload, completion drop) emerge naturally as measured in
Phase 8. EXPLICIT NON-SOLUTIONS: comeback/xG/finishing boosts, opponent nerfs, "losing team
gets better" scalars, forced directness for weak teams (they are already too direct),
possession bonuses, any outcome scripting.

## Freeze proof
cal9 checkpoint==production==hosted (engine 0ecafb39946d4059 / calibration ba7400d1b1027273);
hosted /api/health 0.1.0-rc5 v0.7-cal9; no calibration bump; nothing staged or deployed.
Artifacts: validation/forensics/case5/out/{positions,decisions,ledger,multiseed5.jsonl}.

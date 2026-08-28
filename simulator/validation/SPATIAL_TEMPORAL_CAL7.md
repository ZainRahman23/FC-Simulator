# SPATIAL-TEMPORAL ARCHITECTURE (cal7 candidate) — WORKING REPORT
Started 2026-08-23. Diagnosis source: LIVE_CASE_2C912EB05BB6_STRUCTURE_FORENSIC.md (accepted).
Safety: cal6 checkpoint re-verified (engine 33d1801f9643690c / calibration 6abf77bef4abc72f /
players 14bbe398203d9ba6); hosted RC2 untouched; all work in simulator/exp_st/ (experimental copy);
production fc_simulator/ frozen; calibration stays v0.7-cal6 during experimentation.
Gate held throughout: exp engine with ALL flags OFF reproduces live digest c25b8fc79870ce00c4f1fac3.

## Feature flags (exp_st/fc_simulator/engine.py)
ST = {A, A2, B, C, D, E}; ST_E dose = {base -1.78, space 0.80, cover 1.30}.

## FAMILY A — on-ball temporal reform (flag A) [+ A2 = REJECTED]
Design: (1) reception-ready scheduling — after every control-gaining event the next decision time
derives from the reception itself: difficulty = 1.15(1-p_control)+0.55·receive_pressure+0.10·d/40
-> 1/2/3/4s bands; urgent (pressed >=0.45 / through-ball / aerial / regain) acts at the physical
floor, unpressured receivers keep a >=3s survey (quick play = escape/exploit tool, not a metronome).
Deterministic, no new RNG draws. (2) A3 carrier evasion: the carrier is never frozen — under an
arriving presser (<=4.5m) he shields/rolls away at 1.5–2.1 m/s choosing the best of 5 escape
directions; real distance, real fatigue, ball follows. (3) challenge-cadence guard: a presser rolls
a challenge at most every 3s so faster decisions cannot silently double per-second challenge hazard.
Results (exact case): reception wait 3.96->~1.7-2.2s pressured; one-touch 1%->41%; separation at
first decision for standard receptions 4.3->~4.0m (was ->1.5m); pressure@decision 0.64->0.50;
all-decision pressure>0.5 share 0.90->0.84. Churn analysis: possession CHANGES rose (434->~550
package) but actions/match +37% and HAZARD PER ACTION FELL 0.334->0.302 — seconds-based duration
drops because dead wait time is removed, not because possession got fragile.
REJECTED: A2 pressure-interrupt (forced decisions on 3m/4.5m gap crossing) — increased churn in
every combination (+30-50 changes); first A1 design (fast clean receptions everywhere) — inverted
football logic, 714 changes @7.8s; both documented, removed/disabled.

## FAMILY B — possession-phase shape translation (flag B)
Design: _phase_shift(): per-LINE common shift preserving intra-line spacing (formation identity).
Past halfway, back/DM/mid lines advance to real line targets (back 0.52·br−3 cap 40/46/52 by risk;
DM 0.60·br+4; mid 0.62·br+10), ramped in continuously over br 50->62; transitions exempt (counters
stay stretched); deep buildup (br<=42): forwards cap height at ball+34 (directness/role adjusted).
Results (exact case): back slope 0.144->0.264 (corr 0.513->0.672); box-attack CB 26.7->33.4,
FB 30.4->38.8, DM 43.8->49.7; team length in box phase 59.5->53.4; deep phase ST 66.1->62.9.
Existing cal3 shell-stagger logic retained (damps FB/DM advance vs set blocks by design).

## FAMILY C — buildup support / checking (flag C)
Design: _st_buildup_supporters(): deep-phase (br<=48) designation of SHORT 3 / MIXED 2 / DIRECT 1
support movers (nearest-first with Attack Effort bias, CBs eligible, 5s sticky so runs can arrive);
_st_support_point(): pocket-scored receiving points (defender distance, teammate separation,
passable range; slot-shaped: FB wide outlet, DM show, CM check, winger come-short, CB split/angle);
blend 0.72+0.18·effort. No pass-completion bonuses.
Results (exact case, ABC): FB def-third support8 0.03->~0.5 (s12 ~1.0); DM 0.14->0.45; CB 0.2->0.35;
backline 30m+ share 0.555->~0.49; sub-15m share 0.12->0.14-0.20; CB->FB/GK->CB links restored;
HOME completion 0.689->0.71-0.74.

## FAMILY D — engagement ownership + containment (flag D)
Design: _st_primary_engager(): deterministic per-second primary (distance − press-role/effort bias,
CB line-discipline). Primary decides ENGAGE vs CONTAIN via e_score (intensity base −0.35..+0.45 +
role ±: press +0.30/hold −0.15 + 0.40·(effort−0.5) + exposure>0.55 +0.60 + emergency +1.0 +
counterpress +0.50 + own-zone +0.40 − wide −0.25). CONTAIN = goal-side stand-off point
(2.0+0.8·(1−effort) m, inside shading) at normal speed — positional defending, tackling machinery
unchanged (containment still yields pressure ~0.7 at 2.4m: not free time). Non-primary pressers
ENGAGE only under aggressive/relentless plans, counterpress, emergencies or own zone; otherwise
COVER (6.5m goal-side). cal4 n_presser semantics preserved.
Results (exact case): wide 1v1 min distance 1.33->1.94m; contact(<=2m) share 0.79->0.66; closers
3+ share modestly down; dribble stages 47->66; BD possessions LONGER than base (13.0s vs 12.3s).

## FAMILY E — take-on selection + beaten state (flag E)
Design: selection only (execution _execute_dribble untouched): _st_space_beyond() excludes the duel
defender from the corridor (fixes space=0-in-1v1 defect); dribble_u = −1.78 + 0.40·drib + 0.28·agi
+ 0.80·space_beyond − 1.30·cover − 0.22·def_awareness (dose accepted from 2 ladders: −0.85/0.85/0.90
and −1.0..−1.6 variants REJECTED: 160-337 attempts/match spam). BEAT => defender st_beaten_until =
clock + clamp(2.2+0.8Δaccel+0.4Δagility+0.5·lowE, 1.5, 4.5): RECOVER state (no press eligibility,
goal-side recovery path); attacker continues at +1s (no freeze). PARTIAL => 1s.
Results (exact case): DRIBBLE top-2 rank share 0% -> ~41% (raw), selection 4%->~7% at accepted dose
in isolated states 13-17% vs crowded 2.5%; separation after BEAT +1/2/3s: 1.18/0.2/0.0m ->
5.8/6.7/6.3m (beaten stays beaten); elite selection 20.5% vs weak 9.5% (execution unchanged:
66% vs 6% win). beats/match 5 -> ~19-25.

## Integration status
Staged multiseed (OFF/A/B/C/D/E/AB/ABC/ABCD/ABCDE × 15-30 seeds, case kickoff): RUNNING.
Pending: tactical matrix, quality gradient, pressing dial, cal3/cal6 guardrails, live-case
counterfactuals (#1 ea63cd2c4c6d, #2 2c912eb05bb6), workload, parity/RNG, performance, final battery.

## Iteration log (integration phase)
- REJECTED: universal urgent regains (xG doubled via turbo transitions) -> regain urgency now
  tactic-causal (COUNTER only).
- Evasion clamped strictly non-advancing (progression stays an explicit, logged, risk-bearing
  CARRY/DRIBBLE action).
- Temporal softmax temperature: T = 0.72·clamp(0.60+0.1334·gap, 0.73, 1.0) — exploration noise per
  TIME, not per decision; symmetric across actions; SHOT/xG/xg_eff formulas untouched.
- Family C extended: advanced-phase RELIEF supporter (nearest pivot shows 8.5 units behind an
  advanced carrier as a pressure valve).
- Shot-volume analysis: package totals ~27 shots / ~2.7-3.0 total xG / ~2.3-3 goals per match are
  PL-plausible; cal6's 19 shots/1.6 goals was the frozen-world artifact. Residual flagged defect
  (survives structural repair, §39): 25m+ share ~50% (should be ~25%) — junk leak is a constant
  ~1.7%-per-final-third-decision softmax noise; scales with decision density. SHOT-candidacy work
  deliberately NOT done in this phase (out of authorization); flagged for a future SHOT-specific pass.

## Integrity results (final package source)
- Exp engine, all flags OFF: digest identity with live case (c25b8fc79870ce00c4f1fac3) — held
  through every edit.
- 74 core tests vs exp source (flags OFF): PASS.
- Package flags ON: run-vs-advance parity + same-seed reproducibility PASS (3 seeds, digests equal).
- Live-case counterfactuals (exact seeds + command logs):
  * 2c912eb05bb6 (MW02 LIV 1-3 LEE): package -> LIV 2-0, xG 0.82/0.28, take-ons 47->99 (20 beats),
    press>0.5 share 0.897->0.838.
  * ea63cd2c4c6d (MW01 EVE 0-0 LIV): package -> LIV (away) wins 0-3, xG 1.79, junk 25m+ 14->8,
    take-ons 32->61. cal6 truthful-signal bands remain monotone in both replays (§38/§48 PASS).

## Final staged-family multiseed (case kickoff, fresh final source; 15-30 seeds/config)
cfg    slpB len poss  dur  hz/act p>.5 sup8 wide<2 beats drb-ch sh25/tot  comp H/A
OFF    0.16 55  452  11.9 0.350  0.92 0.20 0.79    6.6   56   11.2/21.7  0.68/0.51
A      0.15 55  582   9.6 0.326  0.87 0.14 0.71    8.9   68   15.6/29.2  0.67/0.51
B      0.27 52  436  12.3 0.334  0.92 0.20 0.78    7.7   55   12.1/22.1  0.69/0.50
C      0.15 54  424  12.7 0.327  0.92 0.46 0.76    6.5   51   11.6/20.3  0.70/0.51
D      0.16 55  433  12.4 0.333  0.88 0.21 0.68    6.9   56   11.7/21.5  0.68/0.51
E      0.17 55  443  12.1 0.336  0.90 0.19 0.75   12.7   89   11.4/18.8  0.69/0.49
ABCD   0.25 52  522  10.6 0.296  0.80 0.39 0.54    7.5   63   13.6/26.4  0.69/0.51
ABCDE  0.25 52  531  10.5 0.296  0.79 0.38 0.51   15.6  100   13.0/25.4  0.70/0.51
Reading: every family moves its own dial in isolation and the package composes; hazard per action
falls 15% while actions rise 37% (the seconds-based possession decline is removed dead time, not
fragility); pass execution untouched (completion stable).

## Guardrails: same-infra OFF (cal6) vs ON (cal7 package), 25-30 seeds each
matrix: ultra 0.18->0.23 xG total (levels tiny); controlled 0.55->0.60 (+9%); balanced 1.11->0.95
(-14%); aggressive stress-mirror 5.04->7.49 (+49% - WATCH ITEM, both-sides-max-aggression config).
quality: avg 1.03->0.86, strong 0.98->1.07, elite 1.07->1.10, avg_vs_weak 1.01->0.95; xG share
monotone 0.517 < 0.534 < 0.673, underdog viable (§45 PASS, slightly compressed extremes).
pressing dial (home dial vs balanced away): net xG OFF -0.48/-0.12/+0.10/+0.06 -> ON
-0.95/-0.09/+0.19/+0.33; workload spread OFF 99->108km -> ON 115->131km. Monotone with a real
physical cost; spread widened (PASSIVE now concedes a realistic deep-block 1.31 xG) - documented,
not a dominance inversion (§46 PASS with note).
possession durations by identity: ultra mirrors 64s, settled 16-21s, aggressive 7.5s (§42 PASS -
the skeleton finally responds to tactics).
SIDE ASYMMETRY: mirrors show home xG share 0.31-0.46 UNDER BOTH cal6 (OFF: aggressive 0.256,
balanced 0.339) and the package (0.31-0.46) - the pre-existing deferred diagnostic, now measured
across all mirrors; package-neutral (improves aggressive, shifts others). CARRIED, still deferred.
Workload: balanced team-km 101->118 (+17%, coherent with support runs/press/evasion; §49-50: no
stamina coefficients touched). Performance: 2.53->3.08 s/match (+22%, §52 acceptable).

## Live-case counterfactuals (final source)
2c912eb05bb6: 1-3 -> LIV 2-0; xG 0.82/0.28; take-ons 47->99 (20 beats); press>0.5 0.90->0.84.
ea63cd2c4c6d: 0-0 -> LIV away win 0-3; xG(LIV) 1.38->1.79; 25m+ shots 14->8; take-ons 32->61.
cal6 truthful-signal bands monotone in both (§38/§48 PASS).

## Rejected experiments (full list)
1. A2 pressure-interrupt (both 3.0m and 4.5m variants) - churn +30-50 changes in every combo.
2. A1 v1 "fast clean receptions everywhere" - inverted football logic, 714 changes @7.8s.
3. Universal urgent regains - xG doubled via turbo transitions for every plan; replaced with
   COUNTER-only regain urgency.
4. Forward-drifting carrier evasion - recreated the unlogged-advance bug class; evasion is now
   strictly non-advancing.
5. In-loop carrier evasion - broke home/away update symmetry (measured heavy AWAY bias);
   replaced with two-phase update (all off-ball first, carrier last).
6. Family E doses -0.85/0.85/0.90, -1.0/0.75, -1.15/0.7, -1.3/0.6, -1.45/0.6/1.15, -1.6/0.7/1.25
   (110-337 attempts/match spam) - accepted -1.78/0.80/1.30.
7. Unbounded inside-shading on contain points (wide stand-off drifted to 4m+) - bounded +-1.6 units.

## Residual limitations (documented, not blockers)
- 25m+ junk-shot tail persists and scales with final-third decision density (constant ~1.7%/decision
  softmax leak); INDEPENDENT SHOT-candidacy defect per §39 - flagged for a future SHOT-specific pass.
- Pre-existing mirror side-asymmetry (above) - deferred diagnostic, now with cross-mirror data.
- Aggressive stress-mirror +49% xG; pressing-dial spread widened - monitor in live play.
- Ultra-mirror possessions average 64s (two parked buses politely passing) - curiosity, watch.
- CONTAIN/COVER/RECOVER are code states not yet exposed as presentation activity labels (§53 note:
  they are explicit code paths, trivially surfaceable for a future renderer).

## Integrity (committed production source)
- Production == validated exp variant: 5/5 matched-seed digest equality.
- cal7 checkpoint: checkpoints/cal7-checkpoint-20260823 (blake2b engine 84933399d9156974aa23,
  calibration eeb5f2a908db419d168f, players e7f2cda3404df1d81360 - player data untouched).
- Calibration bumped ONCE: v0.7-cal6 -> v0.7-cal7. Engine stays v0.7 (consistent with cal3-cal6
  precedent: architecture phases have never bumped the engine version).
- Expectation updates in the accepted-change sense: test_pressing.py zone-defense stand-off
  (<1.0m -> <3.6m, intent preserved); +8 new family unit tests (tests/test_spatial.py).
- RC3 staged at ~/TouchlineRC3-staging (app 0.1.0-rc3, football hash-matched to production).
  NOT deployed. Hosted RC2 (cal6) verified untouched.

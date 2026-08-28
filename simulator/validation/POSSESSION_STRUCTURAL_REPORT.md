# Possession Structural Diagnostic — v0.7-cal2 baseline (pre-change)

840 matches (7 scenarios x 120), 90 min, mirrored XIs, coach AI frozen. All numbers
reconstructed post-hoc from event ledgers (`validation/possession.py`) — zero runtime
instrumentation, parity exact by construction.

## A. Possession survival
| scenario | poss | mean s | med | P75 | P90 | >10s | >20s | >30s |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| ultra_vs_ultra | 16576 | 38.52 | 28 | 57 | 88 | 70% | 58% | 48% |
| controlled_vs_controlled | 34304 | 18.77 | 14 | 26 | 40 | 61% | 34% | 19% |
| balanced_vs_balanced | 38842 | 16.59 | 13 | 23 | 35 | 58% | 31% | 14% |
| wide_attack_vs_controlled | 33948 | 18.95 | 14 | 27 | 41 | 60% | 36% | 20% |
| aggressive_vs_ultra | 45752 | 14.1 | 10 | 19 | 30 | 48% | 22% | 10% |
| aggressive_vs_aggressive | 80916 | 7.98 | 6 | 10 | 18 | 24% | 7% | 2% |

## B. Termination causes (balanced / controlled / aggr-v-ultra attacker side)
- **balanced_vs_balanced**: PASS_INTERCEPTED 21.6%, TACKLE_LOST 21.2%, CLEARANCE_LOST 13.8%, CARRY_LOST 11.5%, SHIELD_LOST 7.6%, PASS_RECEIVER_DENIED 5.5%, CROSS_CLEARED 5.1%
- **controlled_vs_controlled**: TACKLE_LOST 23.2%, PASS_INTERCEPTED 22.9%, CLEARANCE_LOST 16.7%, CARRY_LOST 13.2%, SHIELD_LOST 9.0%, PASS_RECEIVER_DENIED 6.6%, PASS_FIRST_TOUCH_LOST 2.9%

## C. Stage funnel
| scenario | reach mid | reach final | reach box | shot | xG/final-poss | xG/box-poss |
|---|--:|--:|--:|--:|--:|--:|
| ultra_vs_ultra | 68% | 35% | 2.1% | 5.6% | 0.0043 | 0.027 |
| controlled_vs_controlled | 67% | 36% | 5.3% | 4.3% | 0.0061 | 0.029 |
| balanced_vs_balanced | 71% | 54% | 15.7% | 6.2% | 0.0048 | 0.0126 |
| wide_attack_vs_controlled | 68% | 48% | 16.8% | 5.5% | 0.0083 | 0.0201 |
| aggressive_vs_ultra | 60% | 38% | 22.1% | 6.4% | 0.0213 | 0.0344 |
| aggressive_vs_aggressive | 69% | 57% | 25.9% | 4.6% | 0.0098 | 0.0196 |

## D. Passing decomposition (balanced)
- Mix: LONG 55% / SHORT 18% / PROGRESSIVE 14% / AERIAL+CROSS 13% — near-identical
  across ALL profiles (fwd share 63-65% everywhere incl. PATIENT/SHORT plans).
- Completion by distance: 0-15m 80.4% · 15-30m 67.0% · 30-45m 56.8% · 45m+ 38.7%.
  Realized completion ~= engine's own p_exec estimate (stages are consistent).
- First-touch (LOOSE) loses 9-13% of ground passes in every band.

## E. Pressure timing (the central finding)
Share of ground passes under high pressure (>=0.5) and mean pressure:
- ultra_vs_ultra (both PASSIVE): 35.5% high, mean 0.243
- controlled_vs_controlled (both SELECTIVE): **81.3% high, mean 0.609**
- balanced_vs_balanced (SELECTIVE): 60.0% high, mean 0.416
- aggressive_vs_aggressive (AGGR/RELENTLESS): 95.3% high, mean 0.759
`_pressure()` is proximity-only — `pressing_intensity` never enters it. A PASSIVE
mid-block standing 4m away produces the same pressure (and downstream challenge rolls,
decision-time cuts, execution error) as an active presser. Compact shapes therefore
generate perma-pressure regardless of tactical intent — the §13 pathology
"passive low block still pressures too quickly", confirmed quantitatively.

## F. Loose-ball / clearance ecology
- 48.4% of aggressive-vs-ultra shot-possessions start from the ULTRA side's own
  clearance (instant attacker recovery — ultra commits no rest-attack, realistic),
  plus 19% rebound-context xG. The loop itself is siege-like; the problem is re-entry
  QUALITY (below).

## G. Settled vs transition xG (per-shot quality)
| scenario | settled xG share | trans share | rebound share | xG/shot settled |
|---|--:|--:|--:|--:|
| balanced_vs_balanced | 72% | 8% | 16% | 0.0426 |
| aggressive_vs_ultra | 64% | 12% | 19% | 0.1137 |
| aggressive_vs_aggressive | 26% | 54% | 18% | 0.0794 |

## H. Aggressive-vs-ultra anatomy
Settled siege shots average **0.114 xG/shot — 2.7x the quality of balanced settled
shots (0.043)** against a 10-man block, arriving within seconds of a clearance.
Defensive organization is evidently not restored at re-entry. This is RC3 (below),
distinct from the pressure finding.

## I. Balanced/controlled 0-0 anatomy
Balanced football is NOT failing to reach territory (54% of possessions reach the
final third) — it fails to create: 0.0048 xG per final-third possession, mean shot
0.040 xG. Possessions are short (median 13s), hazard flat ~20-30% per action, and
every carrier is pressured, so play is a chain of contested launches rather than
circulation into prepared attacks. Cagey-but-functional is currently indistinguishable
from sterile: the maturation machinery (settled probe) requires possession ages that
perma-pressure prevents.

## J. Ranked root causes
1. **CRITICAL — RC1: proximity-only pressure.** `pressing_intensity` absent from
   `_pressure()`. Evidence: E above; TACKLE_LOST kills 21% of balanced possessions
   (challenge probability is pressure-fed); decision intervals cut by pressure.
   Fix (sanctioned by §35): scale proximity→pressure by defending team's pressing
   intent, with a spatial trigger restoring full engagement near the defender's own
   goal (blocks always defend their box). Behavior change only — no attribute effect.
2. **MATERIAL — RC2: choice-layer progress/risk imbalance.** +1.20*progress/20 vs
   0.78*ln(p_exec); turnover consequence zero outside own third; softmax T=0.75 →
   ~14:1 preference for the 40m ball; direction mix identical across profiles.
   Re-measure after RC1 (pressure reshapes p_exec landscape) before touching.
3. **MATERIAL — RC3: post-clearance re-entry quality vs deep blocks** (0.114 xG/shot
   settled siege). Root: block organization at shot time after clearance chains.
   Structural (rest-defense reorganization pace); higher-risk change — defer unless
   RC1 re-measurement keeps it critical.
4. **POSSIBLE — RC4: reception leakiness** (80% completion at 0-15m; touch logit
   charges -1.30*receive_pressure). Likely partially RC1-derived; re-measure after.

## Pre-registered family-1 change + acceptance thresholds (§38)
`_pressure()` engagement factor: PASSIVE 0.55 / SELECTIVE 0.75 / AGGRESSIVE 1.00 /
RELENTLESS 1.08, blended to full engagement as the carrier approaches the defender's
goal (ramp rel 62→92). Support-cover term untouched (compact bodies still constrain).
Accept only if: controlled/balanced median possession rises materially with pressure
share dropping; ultra-vs-ultra total xG stays <= 0.30; aggr-vs-aggr xG within +-0.25 of
3.77; aggr-vs-ultra total xG rises no more than +0.30; quality gradient preserved;
all RNG/parity/regression suites green.

---

# OUTCOME OF THE CHANGE FAMILIES (post-diagnosis experiments)

## Family 1 — pressure-engagement gating (TESTED, REVERTED)
`_pressure()` × {PASSIVE .55 / SELECTIVE .75 / AGGRESSIVE 1.00 / RELENTLESS 1.08} with an
own-box spatial ramp. 600 matched-seed matches: measured pressure fell as designed
(controlled 0.61→0.50, ultra 0.24→0.16), aggressive-vs-aggressive untouched (3.77→3.77 —
the gating was tactic-faithful), but the intended effects did not materialize: median
possession +1s, TACKLE_LOST unchanged (23.2→22.7%), funnel and xG flat, and the core
controlled-ecology guardrail fell to 0.119 (<0.14). **Failed §38.2 → reverted.**

## Family 2 — pass-choice progress/risk rebalance (TESTED, REVERTED)
`_pass_option_utility`: progress 1.20→0.95, ln(p_exec) 0.78→1.05, +0.20 global
turnover-consequence floor. Controlled guardrail fell further to 0.069. Suppressing
launches makes cagey football MORE sterile. **Failed → reverted.**

## The decisive structural finding
Three independent families (settled-probe utility — prior pass; pressure damping;
launch damping) all fail the same way, from three directions. Conclusion:

> **Current cagey/balanced chance creation is chaos-financed.** Possessions reach the
> final third constantly (54% in balanced play) but settled entries are worth
> 0.005 xG because they are launches to isolated attackers; the chances that DO
> arrive come from turnover chaos (interception/tackle-started possessions are 32%
> of shot-possessions in balanced play). Any change that reduces chaos — less
> pressure, fewer launches, more patience — removes the existing chance supply
> without unlocking a settled one, because the engine lacks a functioning
> settled-penetration mechanism (support movement into receiving pockets between
> lines, box occupation ahead of the pass, second-phase combinations).

This is the engine docs' own deferred "reduce repeated siege entries structurally /
settled penetration" workstream. It requires coordinated changes to support-movement
targets and receiving-pocket generation — beyond a one-family calibration pass, and
attempting it with coefficients demonstrably makes football worse. The correct next
step is a dedicated engine-development pass with this report as its specification.

Final state: **engine identical to v0.7-cal2** (bit-level reproduction of cal2
artifacts verified); evaluation notes retained as comments at the three sites.

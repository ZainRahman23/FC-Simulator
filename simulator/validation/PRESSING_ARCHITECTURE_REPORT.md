# Pressing Architecture Report (v0.7-cal3 → v0.7-cal4)

Goal: make pressing a genuine football tradeoff, not a dominant strategy. All
changes act through decisions, physical movement, and real geometry — no
intensity ever modifies an attribute, no bonus/penalty scalar exists anywhere.

## 1. Baseline pathology (cal3, matched-seed dial, balanced mirror)
PASSIVE→AGGRESSIVE: own xG +49% (0.365→0.544), xG conceded −57% (0.866→0.375),
transition xG conceded also FELL (0.084→0.037), energy cost ~2 points. Pressing
was near-strictly dominant. Checkpoint verified before work:
`cal3-checkpoint-20260821` (hashes matched the live source exactly); baseline
battery 62 core + 26 integration/E2E + parity all green.

## 2. Root-cause findings (instrumented, outcome-neutral proof first)
A press-lifecycle episode logger (`press_debug` config flag; engine bookkeeping
+ separate log, no events, no RNG) was proven outcome-neutral: matched-seed
ledger+state hashes identical flag on/off across profiles (~700 episodes/match
balanced, ~4,200 aggressive mirror).
- **Pressure/engagement — PARTIAL.** The dial already scaled engagement volume
  (199→713 episodes/match), range (d0 2.1→10.2m) and structural displacement
  (abandon p90 9.5→20m). Missing: pursuit persistence semantics, a structural
  leash, engagement-count discipline, and any urgency notion for the chase
  itself. Also PASSIVE's 3.5m effective radius sat below the 3.4m challenge
  gate: passive defenders were statues even inside their own zones (§17
  violation).
- **Short-distance movement — CONFIRMED.** Formal audit: at 2/5/8m targets,
  time-to-target and 1s/2s displacement were IDENTICAL for pace 50 vs 90 and
  energy 100 vs 40 (fixed 2.1/3.5 m/s bands). Consequence one: routine
  positioning was pace-blind. Consequence two: press chases ran at 3.5 m/s =
  intensity 0.41, just under the 0.42 acute-exertion threshold — pressing was
  physically FREE (0.02 energy/episode; ~2 energy per player per match even at
  RELENTLESS).
- **Vacated-space visibility — CONFIRMED (as consequence deficit).** Holes were
  physically real and bypasses common (34–41% of episodes) but consequence-free:
  option utility had no notion of beating a committed presser, returns were
  cheap/fast, and recognition ignored pressure entirely (a hounded carrier
  scanned like an unpressed one), so escape was never a Vision contest.
- **Cover/recovery — NOT REQUIRED.** Defensive organization is a pure function
  of real coordinates (unit-tested: moving a DM out of the lane costs exactly
  what moving him back restores); zonal cover/marking already reposition
  teammates. No Family D change was needed.

## 3. Family A — engagement architecture (ACCEPTED)
`_desired_target` pressing branch: (1) engagement-count semantics — PASSIVE
commits 1 presser, SELECTIVE 2, AGGRESSIVE/RELENTLESS 3; (2) pursuit
persistence — an engaged presser stays on his chase instead of flickering with
the per-tick nearest re-sort, until the carrier changes, the chase is hopeless,
or (3) the structural leash binds: displacement from his structural position
capped at 6/12/20/30m by intensity (× Defense Effort), own-box emergencies
exempt. **A2 (§17):** universal zone defense — any defender closes a carrier
standing in his own zone (≤4.5m from him AND ≤9m from his structural point) at
any intensity; passivity means not proactively leaving structure, never
watching an opponent dribble through your zone.
Evidence: monotone episodes 176→717/match, d0 1.8→10.1m, abandonment and
workload gradients, PASSIVE conceding 0.93→0.79 after A2. Unit tests:
relentless-engages-where-passive-holds; zone-defense-at-any-intensity.

## 4. Family B — physical movement (ACCEPTED; defect was proven first)
`_movement_speed`: the fixed sub-10m bands became effective-Acceleration-scaled
(means preserved at the population average: d<4m = 1.75+0.50·acc/99; d<10m =
2.80+1.00·acc/99 — deliberately half-sensitivity for positional shuffling after
an 8-seed demo-team check showed full sensitivity let quick attackers beat
packed blocks too easily). An **engaged press chase** uses the full running
formula at any distance: explosive closing that (a) arrives on Acceleration and
(b) crosses the exertion threshold, so pressing finally costs real energy and
acute exertion through the existing fatigue system. Evidence: chase 5m in 1s vs
2s positioning; pace 90 beats 50 from 12m; E20 slows arrival; RELENTLESS final
energy 75.3 vs PASSIVE 78.0 with 10.4km distance spread; second-half conceded
ratios up to 1.44 for heavy pressing. Test-only change alongside: the openness
contract fixture widened 4→8 seeds (was one-outlier fragile); every margin kept.

## 5. Family C — vacated-space exploitation (ACCEPTED)
Two pieces, both stage-correct:
- `_pass_option_utility`: a forward option that carries the ball beyond
  defenders currently engaged on this carrier gains utility scaled by each
  beaten presser's real displacement from structure (live engagement state,
  capped +0.50). Choice layer only; recognition still gates; execution untouched.
- `_recognized`: pressure now adds recognition difficulty (+0.90·pressure), so
  escaping a committed press is a genuine Vision/Reactions contest (the audit's
  documented stage gap). Stage evidence: vision 90 vs 55 vs a RELENTLESS press
  went from indistinguishable (231 vs 229 forward bypasses) to +7% for high
  vision (229.0 vs 214.2).
Carry-into-vacated-lane already worked through `_space_ahead` real geometry.
Unit test: same coordinates, same receiver — utility rises only when the
presser is engaged and displaced.

## 6. Family D — not implemented (evidence: §2 last bullet).

## 7. Pressing dial before/after (150 matched seeds/arm, balanced mirror)
| dial | eps/m | xG for | xG conceded | transition xGc | dist km | energy |
|---|---|---|---|---|---|---|
| PASSIVE | 237 | 0.450 (was 0.365) | 0.890 (0.866) | 0.060 | 97.8 | 78.0 |
| SELECTIVE | 347 | 0.526 (0.473) | 0.550 (0.480) | 0.031 | 100.7 | 77.2 |
| AGGRESSIVE | 538 | 0.583 (0.544) | 0.460 (0.375) | 0.035 | 104.3 | 76.3 |
| RELENTLESS | 741 | 0.623 (0.542) | 0.418 (0.397) | 0.040 | 108.2 | 75.3 |

**§41 dominance check — the broken conjunction is gone:** transition xG
conceded now RISES with over-commitment (S→R +27%; baseline: it fell 56%);
xG conceded bottoms at AGGRESSIVE in independent runs (0.436 vs RELENTLESS
0.448); top-end attacking benefit is flat; workload/energy gradients are real.
Matchup dependence (§25): vs a DIRECT opponent RELENTLESS ≤ AGGRESSIVE
(net −2.53 both, with h2 fatigue punishment); DEEP-block sides get AGGRESSIVE
h2/h1 conceded 1.44; the coherent ultra bundle (deep+passive) concedes ~3.1 vs
an aggressive onslaught — comparable to pressing defenses at far lower energy —
which is PASSIVE's rational niche. PASSIVE+MID vs patient sides remains the
worst plan on the board: conceding territory without disruption *should* lose.

## 8. Structural-risk evidence
Abandonment is real coordinates (p90 20m at RELENTLESS) visible to every
consumer of positions; ultra_vs_aggressive transition xG rose +35% after the
families (the parked side counter-punishing an over-committed presser);
per-half degradation emerges from acute exertion, not scripting.

## 9. Physical-attribute evidence
Arrival: pace 90 vs 50 = 3s vs 4s (12m positioning), 2s vs 3s (chase), E20
slows both. Match level: +12 sprint now moves xG share +3.5pt / GD +0.16
(was statistical noise under cal3); +12 accel +2.3pt / +0.07.

## 10. Vision interaction — §5 above; no Vision retuning beyond the
stage-correct pressure term.

## 11. Tactical matrix (cal3 → cal4, 120 matched seeds)
aggr_vs_aggr 3.530→3.861 (+9%, transitions 1.89→2.06 — MORE open ✓§46);
aggr_vs_ultra 3.374→3.123 (−7%, siege alive); balanced 0.973→1.091 (+12%);
controlled 0.659→0.815 (+24%, 0-0 73%→58%, settled-driven, durations intact —
zone contests + press-beating progression made patient football livelier);
ultra 0.216→0.161 (−25%, 0-0 93% — even deader, identity-consistent; cumulative
watch-note: 0.24 cal2 → 0.16 cal4).

## 12. Quality gradient (cal3 → cal4)
Shares 0.481→0.485 / 0.663→0.649 / 0.713→0.718 / 0.764→0.717; favorite win
rates all up (elite 0.44→0.48). Monotone, preserved.

## 13. Home/away asymmetry (§35)
Measured before and after: aggressive-mirror home xG delta −0.746 → −0.768 —
**unchanged; not pressing-related.** No correction attempted. This is the next
focused diagnostic after this phase.

## 14. Discipline
Dial fouls 6.4→8.8 (PASSIVE→AGGRESSIVE) emerge from challenge volume; matrix
foul/card rates moved within noise. The pre-existing extreme-profile
penalty/red quirks neither improved nor worsened materially.

## 15. Reverted experiments
Full-sensitivity movement bands (±0.4 m/s at d<10) were applied and rolled back
to half-sensitivity within Family B after the demo-team openness check — the
only in-family rollback. Nothing else reverted.

## 16. RNG integrity
Run-vs-advance parity PASS after every family and after the version bump
(ledger + RNG audit + score + states); same-seed reproducibility and OVR
isolation in the core suite; instrumentation outcome-neutrality proven by
matched-seed hash equality; worker reproducibility: 1 vs 8 workers identical
except wall-clock metadata.

## 17. Regression tests
- `pytest simulator/tests -q`: **68 passed** (62 + 6 new pressing tests)
- `pytest tests_integration.py tests_e2e.py -q`: **26 passed**
- parity: **PASS** — all after the cal4 bump.

## 18. Calibration version
`v0.7-cal3 → v0.7-cal4` (single bump at completion). cal4 contains exactly:
engagement persistence/leash/count + universal zone defense (Family A/A2),
attribute-scaled movement bands + explosive press chases (Family B),
press-beating pass utility + recognition-under-pressure (Family C).

## 19. Remaining issues for live-server testing
- **BLOCKING FOR LIVE TEST:** none identified.
- **NON-BLOCKING / TEST IN LIVE PLAY:** absolute scoring scale in cagey
  profiles (balanced mirror ~1.1 total xG) — a global-scale question best
  informed by live feedback; PASSIVE+MID being weak (football-legitimate);
  controlled-mirror liveliness (+24%) — direction desirable, level worth
  observing live; ultra-mirror deadness (0.16); extreme-profile penalty/red
  rates; GK-handling footprint reduction noted in the cal3 audit.
- **DEFERRED:** aggressive-mirror home/away side asymmetry (next focused
  diagnostic — measured, unchanged by pressing, cause unknown); vision/pace
  telemetry instrumentation for future tuning.

## 20. Live-test release gate (§54)
> **Is the football engine now suitable to freeze for a live-test release
> candidate? — YES.**
- Pressing is no longer near-dominant (§7: broken conjunction gone; matchup-
  and fatigue-dependent optima) ✓
- Pressing has real structural/workload tradeoffs (coordinates, energy, acute
  exertion, transition exposure) ✓
- cal3 settled-attacking improvements survive (§11: settled composition,
  durations, siege ecology intact — patient football got livelier, not
  reverted) ✓
- Quality gradient survives (§12) ✓
- Tactical identities survive (§11: chaos more open, sieges alive, ultra dead) ✓
- RNG/parity invariants survive (§16) ✓
- Remaining quirks are non-blocking (§19) ✓
No deployment was started in this pass (§55).

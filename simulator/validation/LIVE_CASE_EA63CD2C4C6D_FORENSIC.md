# Live Case Forensic — Match ea63cd2c4c6d (MW01 Everton 0–0 Liverpool)

Seed 1553558118 · save save-e6sdbd31mt5gn04o · v0.7 / v0.7-cal5 / players-v3-4attrs
· persisted ledger digest 14e6346bf811b551a2452243. Read-only investigation; the
persisted record was never modified; no football changes were made.

## 1. Reproduction & instrumentation neutrality
`tools/reproduce_match.py` → **MATCH** (identical digest, score, versions, all 8
management commands replayed). Forensic instrumentation = runtime source-patch
of `_choose_action` (the engine's own source with one logging call injected);
the instrumented replay reproduces the persisted digest exactly →
**neutrality PASS**. Artifacts: `validation/forensics/{decisions.jsonl,
ledger.json, advanced_analysis.json, multiseed.json}` (1,117 decisions,
728 Liverpool).

## 2. What actually happened in the user's observed advanced positions
- 433 Liverpool SHOOT candidates (every on-ball decision at rel-x ≥ 66
  generates one — eligibility/candidate generation is never the blocker).
  18 chosen by action choice (+3 direct free kicks) = 21 shots.
- Advanced-zone (≤~10m outside box) action mix over 326 decisions:
  **CARRY 62%**, PASS 22%, SHOOT 4.6%, DRIBBLE 5%, SHIELD 6%.
  Inside the box (53 decisions): CARRY 26, PASS 17, SHOOT 4.
- Best declined windows: Ekitike inside the box at 0.13–0.18 xG (8–12m),
  pressure 0.69–0.74, losing to CARRY by 0.15–0.45 utility. The user's
  "space to shoot" reading was amplified by presentation (below), but the
  systematic decline is real and quantified in §4.
- All 22 ADVANCED_DEEP_RECYCLE events (advanced position → completed pass
  ≥8m backward; up to −33.6m) occurred at candidate xG < 0.05 **or** heavy
  pressure, and in **all 22 the carrier had zero teammates within 10m**.
  Classification: 22 SENSIBLE at the decision instant, 0 QUESTIONABLE,
  0 PATHOLOGICAL — deep recycling is the rational tail of a deeper problem:
  the box moments the attack manufactures are isolated and low-value, and
  the few good ones are declined (§4).

## 3. Taken shots (21)
0–10m: 3 (xG 0.695, incl. the match's only 0.2+ chance) · 10–16m: 3 (0.373)
· 20–25m: 1 (0.019) · **25m+: 14 (xG 0.196, mean 0.014, 4 SOT)**. Long-range
shots are not individually overvalued — they are **softmax noise**: 341
sub-0.02-xG candidates × ~4% selection tail ≈ 14 junk shots, taken in moments
when every alternative also scored poorly.

## 4. The central quantitative finding — shot selection vs opportunity quality
This match: <0.02 xG → 4% taken · 0.02–0.05 → **0/70** · 0.05–0.10 → 10% ·
0.10–0.20 → **18%** · 0.20+ → 1/1.
50-seed sample (identical kickoff input): 2.3% · 4.4% · 6.8% · **23%** · **33%**.
The engine declines two-thirds of 0.20+ chances and ~93% of 0.05–0.10 windows,
while junk-candidate volume yields ~8 shots/match from 25m+. This is exactly
the user-perceived inversion, confirmed as systematic (not seed-specific).

## 5. Root cause (utility architecture, measured — §14/§16 probes)
`shoot_u = −2.72 + 3.65·xg + modifiers`, chosen via softmax (T=0.72) against
alternatives whose baseline sits near 0 (CARRY ≈ −0.1 + 0.42·space −
0.65·pressure). Monotonicity is correct; the **scale is misaligned with the
engine's own xG distribution**: SHOOT only becomes top-ranked around
xg ≈ 0.30–0.37, but v0.7's organization/lane-discounted xG model produces
settled chances almost entirely in 0.03–0.20 (this match's open-play max:
0.19). Merit-based shooting is therefore unreachable in settled play; shot
output degenerates to noise. Contributing factors, all verified:
- CARRY is the perpetual default (61–62% of advanced decisions across seeds;
  5.8 carries per box possession → 38/51 box possessions die by
  tackle/shield/interception on isolated carriers).
- The designed "cash out a decent window vs a set shell" bonus
  (+0.34–0.56·block for 0.025–0.13 xg) is gated exclusively behind
  `progression_risk == AMBITIOUS`; the user played Balanced, so it never
  applied against Everton's block (mean 0.59, p90 0.71).
- Support starvation: when a Liverpool player held the ball inside the box,
  on average **0.93** teammates were in the box with him — entries are solo
  winger incursions, which also caps candidate xG.
- Recycle utility is NOT inflated (§15/§16 REFUTED as cause): backward passes
  won with utilities of −0.7…−1.8, and pass utility decays properly with
  penetration. Recycling wins by default, not by reward.
- Role/effort (§17): shoot_u sees slot (ST +0.26) and finishing only; Attack
  Role/Effort do not reach shot choice. Game state (§19): no score/minute
  term exists in attacking action utility for human-managed teams.
- Tactics (§18): the 73'–76' changes (Central focus + defensive settings)
  correctly had no shot-utility effect (Central affects pass centrality only;
  VERTICAL +0.08 and AMBITIOUS/COMMIT are the shot-relevant dials).

## 6. Box entries: 54 → 21 shots → 1 big chance, explained
Definition verified: possession-level box entries (ball enters the penalty
area in controlled possession; analyzer `box_entries`). 51 entry possessions:
13 → shot (xG 1.19 of the 1.28 total), 38 lost around the box (tackle 11,
interception 8, shield 6, aerial 6, cross-cleared 5, other 2). Entries are
real penetration, wasted by isolation + carry-looping + declined windows —
"box entry" is not too permissive; conversion after entry is the failure.

## 7. Turnovers / passing (§23–24)
Liverpool was NOT turnover-prone: 128 possessions, mean 24.5s (37% ≥30s),
5.0 actions/possession. The "constant turnover" feel is Everton's 53%
one-action clearance possessions ping-ponging the ball back. Liverpool pass
completion 65% is explained by distance mix: mean pass 31.4m, 54% of attempts
≥30m (switch/long-heavy vs a block), 66–68% completion mid-range, 72% short —
consistent with cal5 profile behavior, not a passing defect.

## 8. Visual representation (§22)
The live pitch renders snapshot boundaries with CSS marker glide between
advance batches; authoritative decisions occur mid-batch. The top declined
box windows carried pressure 0.69–0.74 (defender ≈1–2m) at the decision
instant — on screen this can read as open space. Classification: presentation
amplifies the perception (QUESTIONABLE cosmetics) but does not cause the
measured selection pathology.

## 9. Baseline / representativeness (§25–26)
50 seeds of the exact kickoff: Liverpool wins 41/50, LIV xG mean 1.32
(this match 1.28 ✓ typical process), 0-0 in 4/50 → the scoreline is a
plausible tail; the action-selection distribution is fully representative.

## 10. Classifications (§30)
| item | verdict |
|---|---|
| Long-range shot selection | **BROKEN** (softmax noise off junk-candidate volume; not overvaluation) |
| Advanced shot declining | **BROKEN** (utility scale unreachable by real xG; 77–93% declines of genuine windows) |
| Deep recycling | HEALTHY at decision level (symptom, not cause) |
| Box-entry productivity | QUESTIONABLE (real entries, wasted by isolation + carry loops — partly the same root cause) |
| Turnover frequency | HEALTHY (perception artifact of opponent clearances) |
| Pass completion | HEALTHY (distance-mix driven) |
| Tactical sensitivity | HEALTHY as designed; NOTE: shell cash-out gated solely behind AMBITIOUS |
| Visual representation | QUESTIONABLE (glide can mask pressure at decision instant) |

## 11. Proposed smallest causal fix (NOT implemented — awaiting authorization)
**System**: `MatchEngine._choose_action`, SHOOT utility term only.
**Structural defect**: the linear map −2.72 + 3.65·xg anchors shooting to an
xG scale (~0.3+ for competitiveness) the engine's discounted xG model cannot
produce in settled play; the softmax then emits only noise-shots.
**Correction**: re-anchor the shot-utility curve to the realized xG
distribution — steepen the slope and re-center (e.g., a two-piece or scaled
form ≈ −2.35 + 9.5·min(xg, 0.12) + 3.65·max(0, xg−0.12), coefficients to be
set by matched-seed experiment, NOT by these placeholder numbers), leaving
every existing tactical/probe/block/commitment modifier and all xG/finishing/
GK math untouched. Steepening (rather than raising the base) simultaneously
makes 0.05–0.20 windows competitive AND widens the gap against sub-0.02 junk —
correcting both halves of the observed inversion with one term.
**Must remain unchanged**: xG model, finishing/on-target/GK stages, pass/carry
/recycle utilities, tactical modifier structure, RNG keys, all locked fixes.
**Expected consequences**: 0.10–0.20 selection ≥ ~50%, sub-0.02 selection ≤
~2%, 25m+ shots/match down, box-entry→shot conversion up, mean xG/shot up;
total xG drift bounded.
**Risks**: openness-contract band (chaos economy — more shots end possessions
→ fewer sustained sieges), ultra/controlled identities, aggressive-mirror
levels, rebound ecology volume.
**Acceptance plan**: matched-seed 50→150 on this exact kickoff (selection-rate
table by band must become monotone-sensible; long-shot count falls; box
conversion rises) + full canonical matrix vs cal5 references (identities and
openness band hold) + quality gradient + ratings centering + run-vs-advance
parity + OVR isolation + worker reproducibility. Calibration bump to cal6
only on acceptance.
Secondary candidates deliberately deferred (re-examine after the primary fix):
in-box CARRY saturation; box-support arrival in solo-entry attacks; exposing a
non-AMBITIOUS fraction of the shell cash-out term.

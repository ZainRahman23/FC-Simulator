# CAL12 FINAL READINESS STUDY — box occupation / chance supply + aerial contact

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the gate. Production/save byte-identical (engine `4d8ac52d864fcc6a…`, calibration `6fb2036c6cff41ed…`, players `14bbe398203d9ba6…`, DB `b2092e4415533069…`, RC8 live). No integration, no cal13, no renderer work, no output tuning of any kind.
**Freeze:** cal12 candidate snapshotted (`*_cal12_baseline.py`: `34868913d08ebb44` / `ce6a0ac104795fcb` / `c4c7a761c6672ec9`); final build `hybrid.py 68048902576ad619` (aerial addition), lab/body unchanged from cal12 baseline. **Flags-OFF re-proven bit-identical** (90-min hash `d72f534a3caae3d1`) before AND after the aerial addition (which is `CAD['AERIAL']`-gated, default off). D2 reproduction confirmed against `cal12_battery.json`.

---

## PHASE 1–3: where does shot supply "disappear"? — IT LARGELY DOESN'T

Full-funnel forensics (`boxforensic.py`, instrumented BX/intent lifecycle, per-entry outcomes, per-reception decision latency):

| stage rate (D2, 90 min) | value | reference |
|---|---|---|
| entries per FT-control-second | 0.045 | native 0.047 — **equal** |
| entry → shot within 6 s | **38%** (9/24) | healthy-high |
| box receptions decision latency | **p50 = 0.0 s** | one-touch in the box works; settle-and-scan correctly bypassed (24 immediate RECEPTION, 7 SHOOT chosen, IMPROVED wakes catching late windows) |
| pass-into-box selection given a box runner available | 22/94 = 23%; 8.7% of all FT passes | native ≈ 9% — **cal11's willingness unchanged** |
| BX.P authorizations → physical box arrivals | 175/360 (49%) | runners genuinely arrive |
| box occupancy while in control | 2.07 attackers mean | multi-player attacks exist |
| intent deaths (360 runs) | possession_lost 181 · full-lifetime expiry 124 · ball_regressed 24 · occupied 31 | **no pathological cancellation** — Phase-3 hypothesis REFUTED |

The whole remaining absolute gap is the already-characterized dwell/tempo multiplier — and cal12's FT dwell (535 s) sits in the **real-football band** (real ≈ 400–550 s total; native's 969 s is the zero-flight artifact). Shots-per-goal is 4.4 vs real ≈ 9: cal11's frozen shot-selection math declines the low-xG junk volume that pads real shot counts, while goals/match (3.0–3.35) lands at real football's 2.8. The system is self-consistent.

**Phase-6 classification: A — HEALTHY DISTRIBUTIONAL DIFFERENCE (with a strict-candidacy flavor of F that is cal11's own frozen math, not a defect).** No chance-supply repair is justified under the anti-tuning rules; any "fix" would be shot-selection loosening or possession scripting, both forbidden. Documented future option (authorization-gated, cal13-class): recalibrate `shoot_u`'s probe/volume terms against the continuous world if real-style shot counts are ever desired as a product goal.

Supporting counterfactuals: **box_commitment** — COMMIT vs downgraded-BALANCED: entries 12 vs 2, simultaneous occupancy 2.05 vs 1.0 (HOME's preset is COMMIT; gradient causal). **Pressure response**: PRESSURE wakes affect only the carrier; off-ball intents die only by the F2 guards above. **Post-pass continuation**: passer-moving-share and box-run persistence gates from prior studies re-verified; relational destinations (near/far/spot/cutback) all authorized and physically occupied (BX kinds 76/100/67/117).

## PHASE 4–5: quality and tactics

Quality funnel (45-min × 2 matched seeds): box control monotone with quality (weak 6.9 s → avg 9.1 s → elite 12.9 s); entries/shot cells remain noisy at this window length; the authoritative quality evidence stays the 20-seed records and the monotone family gates (all re-run and green on the final build: finishing, GK, passing, reception, tackling, reactions; the 1v1 take-on diorama remains a documented harness artifact — match BEATs 12–24 ≈ native band). Weak sides construct legitimate attacks (away 1.35 goals/match; WEAK_TRANSITION and WEAK_TEAM_CHANCE bookmarks). Tactical classes retain the cal12 study's differentiation (siege vs end-to-end vs low-event mirrors), and elite-vs-low-block sustains pressure without becoming chaos.

## PHASE 7: aerial contact seam

Implemented, `CAD`-gated: a descending ball in the jumping band (1.5 < z < 2.6, falling) with converged opponents triggers a physical **AERIAL CONTEST**: resolution = 0.40·jumping + 0.20·strength + 0.15·height + 0.15·positioning + 0.10·reactions (+keyed noise); winner heads (direction quality from heading_accuracy, safety-wide priors when deep, explosive jump load applied); loser lands off-balance; worse-positioned climber risks the foul through the existing cal11-shaped adjudicator (cards inclusive). **Deterministic micro-scenarios: monotone** (jump 85v55 → 26–4; reversed → 19–11; 95v40 → 28–2; Van Dijk's height/strength legitimately dominates equal-jumping contests). No OVR, no manufactured frequency.
**Limitation (non-blocking, documented):** match volume is 0–2 contests/match vs real ~30–40 aerial duels, because pursuit still waits at the landing point rather than attacking the descent — a body-behavior extension (attack-the-ball-in-the-air) deliberately NOT rushed into this gate. The trigger vocabulary, attribute causality and adjudication seam are structurally complete.

## PHASE 8: full-match battery (20 matched seeds × 90 min per arm)

| arm | record (HOME) | goals | shots/team | fouls | cards |
|---|---|---|---|---|---|
| A native | ~all wins | 15–1 style | ~22 total | 8–21 | 0–5 |
| B D2 pre | W11 D3 L5 | 40–24 | 6.8/6.5 | 18.9 | regular Y, occasional R |
| C final (D2+aerial) | W9 D5 L6 | 40–27 | 6.6/6.4 | 18.4 | ~3 Y/match, 5 R/20 (0.25 ≈ real) |

B↔C differences are matched-seed variance from the added event class (both in the real strong-favorite band; native remains the abstract extreme). Median spells 4.0–5.9 s, melee ~10–14/min, zero continuity violations, energy trajectories unchanged. Full distributions in `final_c_battery.json`.

## PHASE 9: integrity

Same-seed reproducible (final battery re-run identical), seeds diverge, chunk-independent (cal12 `369ce65c1fcdf8aa`), flags-OFF bit-identical, no Math.random, all draws keyed/audited, scheduler deterministic. Matched-seed counterfactual first-divergence remains attributable (e.g., aerial flag's first divergence is the first HEADER contact of the run).

## PHASE 11: visual evidence

`viewer_cal12.html` (:8303) now replays the FINAL candidate with bookmarks: SUSTAINED_ATTACK, MULTI_BOX_ARRIVAL, CUTBACK, CROSS_FARPOST, RECYCLE_NO_SHOT, WEAK_TRANSITION, WEAK_TEAM_CHANCE, TAKEON_EXPLOIT, SHOT/GOAL/PENALTY/CORNER/FREE_KICK, FOUL_CARD, AERIAL_FAIR, KICKOFF — plus the debug wake overlays.

## PHASE 12 — FINAL GATE ANSWERS

1. **Where was shot supply lost?** Nowhere pathological: every stage-conversion rate equals native/real references; the absolute gap is real-band dwell × cal11's strict (frozen) shot candidacy, which declines real football's junk-shot volume while matching its goals.
2. **Was 26 s box control pathological?** No — proportional to real-band FT dwell with 38% entry→shot conversion; and it responds causally to box_commitment (2→12 entries) and quality (6.9→12.9 s).
3. **Did D2 cause the problem?** No — D2 improved every dwell metric; its box receptions are one-touch (p50 latency 0.0 s).
4. **Were attacking intentions cancelled too readily?** No — 360 runs: deaths are possession-loss (50%) and full-lifetime expiry (34%); regression/occupancy cancellations are minor and football-legitimate.
5. **Were players arriving too slowly?** No — 49% of authorized runners physically reach the box within intent life; occupancy 2.07 during control.
6. **Was shooting candidacy healthy?** Yes — windows evaluated (4/5) and taken at native per-instant rates; 7 SHOOTs among 37 box receptions.
7. **Player quality causal?** Yes (20-seed records, monotone families, box-control gradient); 30–45-min single-cells remain noisy (documented).
8. **Tactical differentiation causal?** Yes (siege/low-event/end-to-end signatures; commitment gradient).
9. **Weak teams construct real chances?** Yes — 1.35 goals/match, bookmarked transitions.
10. **Elite sustains vs low block?** Yes — siege signature (shots 6-0/4-2, longest spells, lowest flips).
11. **Aerial mechanisms structurally complete?** Vocabulary, attribute causality, adjudication and cards: yes. Contest FREQUENCY is low pending attack-the-descent pursuit — documented non-blocking limitation.
12. **Any repair touch xG/finishing/scoring?** No. The only code added in this workstream is the flag-gated aerial contest; chance supply was classified healthy and left untouched.
13. **Attributes/tactics monotone?** Yes (all family gates re-run green; jumping/strength/height monotone in the new aerial family; stamina/fatigue unchanged).
14. **Random integrity intact?** Yes (all proofs above).
15. **Flags-OFF bit-identical?** Yes — re-proven after every change (`d72f534a3caae3d1`).
16. **Ready to become the production architecture?**

# VERDICT: **READY WITH DOCUMENTED NON-BLOCKING LIMITATIONS**

Limitations register: (L1) aerial contest frequency low until attack-the-descent pursuit exists (seam complete); (L2) per-team shot counts track cal11's strict candidacy, not real football's junk-shot volume — goals land real-band; any change is an authorization-gated cal13-class calibration; (L3) headers are directional touches (no targeted header-shots yet); (L4) the isolated 1v1 take-on harness is unrepresentative under brain-authored pressing (match-level gates authoritative); (L5) presentation compression measured (11.2×/9.8× for ~8 min) but intentionally unimplemented.

Integration sequence remains as proposed in CAL12_CADENCE_STUDY.md §"Proposed production-integration sequence" (flags default-OFF, digest-identity gates, checkpoint, parity batteries, rollback) — **not executed**.

**HARD STOP honored.** Awaiting review and the personal visual gate (`viewer_cal12.html`, :8303).

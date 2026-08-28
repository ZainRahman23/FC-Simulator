# Player Data v3 + Four-Attribute Integration Report
(v0.7-cal4 / players-v2-gkstats → v0.7-cal5 / players-v3-4attrs)

## 1. Workbook inspection
`2025-26-rankings-fc-attributes_32.xlsx`, 19 sheets. Master = `All players`:
160 rows × 48 cols. Columns: Rank, Player, Position, OVR (formula), POT
(formula), Age, Ht (cm/ft), Wt (kg/lb), Foot, WF, Nat. side, the 29 original
attributes (Acceleration…GK Reflexes), POT override, then **Curve, FK Accuracy,
Balance, Penalties, Composure**. Support sheets: `Weights` (per-position OVR
weights, 15 positions), `Rules` (wrong-foot penalty by weak-foot stars +
potential growth model), `Card` (face stats PAC/SHO/PAS/DRI/DEF/PHY, eligible
positions, skill moves), `Contracts` (club, national team, contract until,
wage, value), `ValueRules`, `CardWeights`, per-position views, `PosLists`.
Data quality: 0 duplicates, 0 missing names/positions/attributes/height/weight,
0 non-numeric, all attributes within 1–99, OVR 72–93 (cached values present for
all rows). **Documented ambiguity:** the workbook contains a fifth new column,
`Curve` (n=160, mean 70.2, sd 17.6), not named in the phase spec. It is
imported as data (canonical key `curve`, frontend `cur`) with **no engine role
and no UI display** this phase.

## 2. Player migration
old 100 → new 160. Name-matched: **100/100** (0 unmatched, 0 ambiguous,
0 duplicates); 60 genuinely new players. 60 of the 100 matched players carry
byte-identical raw attributes; 40 were re-rated in the workbook (e.g.
Lewandowski, Spence: full re-rates). Nothing was deleted; the master dataset
retains all non-PL players (82) alongside 78 Premier-League players.

## 3. Attribute mapping (complete, unambiguous)
All 29 original attributes keep their keys. Changes/additions:

| Workbook column | Canonical engine key | Frontend key | Normalization population | Football responsibility |
|---|---|---|---|---|
| Ball Control | ball_control | **bco** (was `bal`) | all 160 | touch/manipulation security (unchanged) |
| Balance | balance | **bln** | all 160 | body stability under contact/awkward context |
| FK Accuracy | free_kick_accuracy | **fka** | all 160 | direct-FK placement/execution |
| Penalties | penalties | **pen** | all 160 | penalty-kick execution |
| Composure | composure | **cmp** | all 160 | resistance to pressure-induced execution degradation |
| Curve | curve | **cur** | all 160 | none this phase (data only) |
| GK Diving…GK Reflexes | gk_* | gkd…gkr | **GK population (n=11)** | unchanged (locked fix preserved) |

## 4. Ball Control / Balance migration
The ambiguous `bal` key is **retired everywhere** — it no longer exists in the
frontend data, generic templates, label map, bridge ATTR_MAP, or tests, so any
stale reference fails loudly instead of silently meaning the wrong attribute.
`bco`=Ball Control, `bln`=Balance. Tests: integration asserts
`ball_control == a["bco"]`, `balance == a["bln"]`, and `"bal" not in a`;
core test proves Ball Control ≠ Balance across >100 players.

## 5. OVR
The workbook formula was fully reconstructed and verified **exactly for all
160/160 players across all 10 positions**: OVR = round(Σ 29 original
attributes × position weights) − wrong-foot penalty (applies to RM/LM/RW/LW
when natural side ≠ slot side; penalty 5/3/2/1/0 by weak-foot stars). The four
new attributes and Curve do **not** enter OVR. Stored workbook values are
preserved verbatim in players.json; OVR remains presentation/selection
metadata. **Isolation proof:** the core OVR-isolation test (drastic OVR swap →
identical ledger/RNG/score/states) passes on the new data.

## 6. Population-stat changes (old → new; full table in §7 tooling output)
Modest, legitimate shifts from the elite-top-160 expansion: largest are
reactions (85.0→82.9, 0.44 old-sd), jumping (80.2→77.0), and the defensive
family (defensive_awareness 60.2→53.9, standing_tackle 62.6→56.0 — the added 60
players skew attacking: 34 ST, 27 LW). GK stats essentially unchanged
(n 10→11; gk_reflexes 89.2→89.2). New-attribute distributions: FKA 64.6±18.5,
Penalties 71.4±17.2, Balance 74.2±13.0, Composure **81.8±5.6** (narrow — an
elite-sample trait; z-range is compressed accordingly), Curve 70.2±17.6.

## 7. Existing-player normalization drift
For raw-unchanged players, z-drift is bounded (typically +0.0…+0.4, e.g.
Alisson reactions z +0.43→+0.78). Largest population shifts ranked:
reactions > jumping > standing_tackle > defensive_awareness > vision >
interceptions. Judged legitimate (better/larger population); no compensation
applied (§61).

## 8. Free Kick Accuracy
Stages: (a) direct-FK **taker selection** — the on-pitch outfielder with the
highest FKA takes it (mirrors corner-taker selection); (b) attempt appetite
p_direct uses the taker's FKA; (c) placement — `_execute_shot` routes
DIRECT_FREE_KICK placement skill to free_kick_accuracy (replacing the
long_shots/power/finishing proxy); Shot Power keeps velocity; wall/GK stages
unchanged. Two pre-existing pipeline defects surfaced by validation and fixed
in scope: direct attempts now require ≤32m range (previously 40–57m attempts
occurred), and the **dead-ball law** applies to block geometry (defenders
within 9.15m cannot block a free kick — previously 70% of FKs were "blocked"
by players standing on the ball). Validation (150 matched matches/arm, FKA set
55 vs 90): placement p_on 0.359→0.547, realized on-target 33%→53%, FK award
rate unchanged (4.97 vs 4.93/match), open-play shots provably untouched (unit
test: identical p_on for OPEN_PLAY at FKA 50 vs 95).

## 9. Penalties
Stages: designated **taker selection** (highest Penalties on pitch) + execution
`shoot = 0.85·penalties + 0.15·finishing` replacing the finishing/reactions
proxy; GK contest unchanged; award path untouched. Validation (150/arm, set 55
vs 90): award frequency **identical** (0.087/match both arms), p_goal
0.683→0.770, conversion 77%→92% (bracketing real-world ~78%). No tuning to a
target percentage was performed.

## 10. Balance
Four contact contexts only — ground-duel scramble (+0.20·Δbalance beside the
untouched strength/mass terms), shield stability (carrier +0.26), dribble under
contact (+0.18), physically contested first touch (+0.42 × disturbance, zero
when unmarked). Distinctness evidence: clean pass execution is bit-identical
across balance 50↔95 (unit test); a 95-balance/45-strength carrier still loses
the shield force contest to a 95-strength defender (unit test); Agility keeps
its direction-change roles untouched.

## 11. Composure
One helper, `_effective_pressure(player, pressure) = pressure ×
clamp(1 − 0.15·z(composure), 0.72, 1.28)`, applied **only inside execution
formulas** where pressure already degrades execution: pass execution context,
pass error sigma, shot on-target, pressured first touch. Zero pressure ⇒ zero
effect (unit-tested bit-identical); pressured execution never exceeds the
player's own unpressured level (unit-tested); elite technique + modest
composure beats modest technique + elite composure under pressure
(unit-tested). Not applied to xG (chance quality), decisions, recognition, or
challenge willingness — no double counting, no clutch scripting.

## 12. Touchline migration
DETAILED_PLAYER_PROFILES regenerated from the master (160 profiles, new keys,
club/value/wage fields, Card faces, eligible positions). Generic templates
extended (outfield 75-scaffold for new keys; GK template mirrors workbook GK
patterns: bco 30, bln 45, fka 15, pen 20, cmp 66). Label map: Balance under
Ball group, FK Accuracy/Penalties under Shooting, Composure under Physical.
CLUB_OF regenerated from the Contracts sheet: 78 PL mappings (31 newly
available PL players; Liverpool now fields 21 real detailed profiles replacing
generics). Bridge ATTR_MAP migrated (`bco`,`bln`,`fka`,`pen`,`cmp`,`cur`).

## 13. Set-piece validation — §8/§9 numbers above; direct-FK volume
~0.25/match and on-target 33–53% now in realistic ranges after the range-gate
and dead-ball fixes.

## 14. Match ecology regression (new population; ecology-level vs cal4 refs)
Pressing dial: healthy cal4 shape preserved — xGf 0.42/0.44/0.57/0.65, xGc
0.86/0.57/**0.44/0.46** (bottoms at AGGRESSIVE, rises at RELENTLESS ✓ no
dominance recreation). Tactical matrix: all identities intact (aggr-aggr
transition-heavy 1.90/3.61; sieges alive 2.93; ultra dead 0.12, 0-0 95%;
controlled drawish 0.56, 0-0 68%). Levels shifted down modestly vs cal4 —
explained by deeper elite XIs both ways plus Composure damping chaos-financed
errors; identities and the openness contract band hold.

## 15. Quality gradient (new population, 100 matches/tier)
Monotone and healthy: favorite xG share .472 (avg mirror) / .643 (strong) /
.703 (elite) / .742 (vs weak); favorite wins 23%→38%→42%→53%; underdogs win
19%/13%/7%/2%. Average < Strong < Elite preserved without scripting.

## 16. Ratings / GK regression
Ratings (30 matches, balanced mirror, new population): overall 6.315, GK 5.96 /
DEF 6.22 / MID 6.10 / ATT 6.78 — centered, same shape as cal4. GK sensitivity: reflexes 60→88 conceded −3% (directional ✓, matching the
cal3-audit magnitude). Handling 60→88 at n=300: **+0.023 ± 0.191 — statistical
null**, the endpoint of a trend documented since the cal3 audit (−22% → −7% →
null) as re-entry denial and zone defense legitimately shrank the rebound
ecology where handling bites. The attribute still enters save/parry resolution
unchanged; classified non-blocking, monitored (a future GK-ecology micro-pass
is the remedy if desired). GK-population normalization itself is intact
(n=11, stats within 0.1 of old).

## 17. RNG integrity
Run-vs-advance parity PASS after data import, after attribute integration, and
after the cal5 bump. Same-seed reproducibility + OVR isolation in core suite.
Worker reproducibility re-verified this phase (§18).

## 18. Tests
- core: **74 passed** (68 + 6 new-attribute stage tests) — post-cal5-bump
- integration + E2E: **26 passed** — post-cal5-bump, post-CLUB_OF regeneration
- run-vs-advance parity: PASS (post-bump)
- worker reproducibility: PASS (1 vs 8 workers identical)
- OVR isolation, same-seed reproducibility, RNG-audit keying: in core suite ✓

## Release gate (§66)
> **Is the expanded-player + four-attribute engine suitable to freeze for the
> Live-Test Release Candidate / Deployment Hardening phase? — YES.**
Data imported correctly (100/100 matched, 0 lost, verified OVR formula);
no ambiguous mappings (`bal` retired, tested); all four attributes causally
validated at their stages with no-irrelevant-effect proofs; OVR isolated;
pressing tradeoff intact; settled identities intact; quality gradient intact;
ratings centered; RNG/parity green. No deployment was started (§63).

## 19. Versions
Engine **v0.7** · Calibration **v0.7-cal5** · Data **players-v3-4attrs** ·
rollback: `checkpoints/cal4-old-player-schema-20260822` (engine hash
78ef1307a625e3ef4a4e + players-v2 snapshot).

## 20. Remaining issues
- **BLOCKING FOR LIVE TEST:** none identified.
- **NON-BLOCKING:** GK-handling match-level footprint now statistically null (§16, monitored); Composure's compressed elite-sample distribution (sd 5.6)
  limits its differentiation range by construction; GK composure/balance sit at
  the population floor (rushed GK clearances degrade more — plausible, watch);
  Curve unused; controlled-mirror level shift (−31%, explained).
- **DEFERRED:** aggressive-mirror side asymmetry (unchanged scope);
  FK/penalty realism tuning against real-world rates (explicitly out of scope
  this phase); Curve integration (crossing/shot bend) as a future micro-phase.

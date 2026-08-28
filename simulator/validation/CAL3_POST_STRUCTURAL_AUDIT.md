# CAL3 Post-Structural Audit (v0.7-cal3 vs v0.7-cal2)

Audit-only pass: no football behavior was changed. All comparisons are
matched-seed (same scenario, teams, players, tactics, coach-AI frozen, same
`scenario_seed` scheme) between the live cal3 engine and a **certified cal2
reference twin** (`validation/cal3_audit/cal2ref/`): the four accepted cal3
behaviors reverted, all instrumentation kept. Certification: the twin's 840-match
canonical possession matrix reproduces the historical cal2 artifact
`poss_baseline3.json` **identically on every aggregate for all seven scenarios**.

## 1. Checkpoint
- Snapshot: `simulator/checkpoints/cal3-checkpoint-20260821/` (+ `.tar.gz`),
  MANIFEST.json with blake2b hashes (engine.py `68be7bae7fe1f5a952ec…`).
- Engine v0.7 · CALIBRATION_VERSION `v0.7-cal3` · data `players-v2-gkstats`.
- Version unchanged through the audit (instrumentation lived outside the engine).

## 2. Regression baseline (all green before the audit body)
- `.venv/bin/python -m pytest simulator/tests -q` → **62 passed**
  (incl. openness-contract guardrail, same-seed reproducibility, RNG-audit
  semantic keying, OVR isolation).
- `.venv/bin/python -m pytest tests_integration.py tests_e2e.py -q` → **26 passed**.
- `PYTHONPATH=simulator .venv/bin/python /tmp/parity.py` → **RUN-VS-ADVANCE PARITY: PASS**.
- Worker reproducibility: re-verified during the prior phase (1 vs 8 workers:
  match content identical; only wall-clock metadata differs).

## 3. Executive verdict — **YES, WITH CAVEATS**
cal3 is a better football engine than cal2 at the distribution and causal-process
level. The settled-structure changes did what they claimed, where they claimed,
and nowhere else:
- Patient football gained *process* (box entries +9–19%, completion +1pt,
  recycling up, healthier 0-0 composition) without xG inflation — the controlled
  mirror's matched-seed ΔxG is **−0.007 ± 0.077** (null).
- The one significant xG increase sits exactly where the diagnosis demanded
  penetration: the siege matchup (+0.33 ± 0.18 per match, +11%).
- Tactical identities survived: aggressive-vs-aggressive within noise on every
  metric; ultra-vs-ultra still dead (0-0 86%, xG 0.20/match).
- Quality gradient, roles, workload, ratings centering, GK sensitivity, and
  discipline are preserved.
Caveats: absolute scoring in cagey profiles remains low vs real football
(pre-existing scale, not cal3's doing); a **pre-existing side asymmetry** in the
aggressive mirror (which cal3 *reduces* but does not remove); and pressing is
revealed as a near-dominant strategy (pre-existing; the audit's main discovery).

## 4. cal2 → cal3 tactical matrix (160 matched seeds/scenario/arm)
Full table: `validation/cal3_audit/out/tactical_matrix.json` + `cal2_vs_cal3.csv`.
Matched-seed deltas (mean ± 95% CI), per-match totals:

| scenario | ΔxG | Δgoals | Δshots | box entries | 0-0 % | notes |
|---|---|---|---|---|---|---|
| ultra_vs_ultra | −0.011±0.040 | +0.031±0.094 | −0.68±0.78 | 2.59→2.56 | 89→86% | durations +6%, recycling +10% |
| controlled mirror | **−0.007±0.077** | +0.025±0.114 | +0.19±1.13 | 10.6→12.7 (+19%) | 73→71% | process up, output flat |
| balanced mirror | +0.076±0.089 | +0.181±0.189 | +0.49±1.33 | 24.9→27.2 (+9%) | 46→38% | BTTS 5.6→12.5% |
| wide_v_controlled | +0.028±0.098 | +0.056±0.188 | −0.32±1.10 | 29.1→31.4 (+8%) | 46→43% | settled xG +6% |
| aggr_vs_ultra | **+0.328±0.180** | +0.269±0.311 | +1.71±1.23 | 54.4→61.6 (+13%) | 11→7% | the intended siege gain |
| ultra_vs_aggr | +0.093±0.206 | +0.013±0.315 | +1.96±1.13 | 53.3→61.7 (+16%) | 9→13% | mirror pair nets +6.7% |
| aggr_vs_aggr | −0.152±0.207 | −0.037±0.347 | −0.35±1.49 | 64.4→64.4 | 3.8→3.8% | identity intact |

Energy −0.1…−0.4 final; distance +1–3% everywhere (paid-for movement).

## 5. Controlled/balanced football — did settled attacks genuinely improve?
**IMPROVED (process), honest (output).** The ecology moved from
"territorial progression → isolated entries → sterile outcome" toward
"progression → support → recycling → coordinated penetration":
- Box entries: controlled +19%, balanced +9%; recycling +1–3pt; completion +1pt.
- Balanced settled xG/shot 0.0439→0.0464 (+6%); shot spacing (nearest advanced
  teammate at shots) 6.4→8.1m in controlled (+26%) — distinct-lane box occupation
  replacing shooter piles (this is also why `support_10m` *fell* in sieges:
  anti-clumping spreads arrivals across lanes by design).
- Crucially, controlled total xG is unchanged (null delta): structure did not
  become a chance printer; it converted the same output into a more legible,
  causal process. Balanced gained modestly (+8%, borderline CI).

## 6. Draw / 0-0 ecology
Transparent classifier: healthy 0-0 = total xG ≥ 1.0; sterile < 0.5.
- Balanced: 0-0 74→61 of 160 (−18%); healthy share of the remaining 0-0s 26→31%.
- Controlled: 0-0 117→114 (flat — profile identity); sterile share 38→32%.
- Neutral quality mirror (avg_vs_avg): draws 57.3%→48.7%.
Sterile outcomes decreased for the right reasons (composition, not forced goals).
Controlled remains extremely drawish in absolute terms — see caveat on global
scoring scale (§18, pre-existing).

## 7. Aggressive-vs-Ultra — siege anatomy
The +11% xG decomposes across every earned channel, not one artificial one:
settled +8%, transition +18% (small base), rebound +11%, second-ball +16%,
corners +10%, box entries +13%, box attackers at shot 2.47→2.56, xG/shot +4%.
Territorial structure unchanged (final-third entries +1%, possession durations
+1%). Re-entry banding (§ 8 below) shows the block still denies the
reorganization window. This is a siege that earns second phases — not a
clean-chance factory: xG/shot 0.119 vs 0.115, and the 4–15s re-entry windows
remain the *worst* shot value on the pitch for the attacker.

## 8. Post-clearance re-entry (Part C causality, cal2 vs cal3)
`reentry_bands.csv` (seconds since defensive relief; xG/shot | defensive org):

aggr_vs_ultra (DEEP block):
- 0–3s: 0.143|0.690 → 0.156|0.698 — immediate chaos stays dangerous ✓
- 4–8s: 0.085|0.730 → 0.095|0.717, share of shots ↓ (286→264 despite +6% total) — reorganization denies ✓
- 9–15s: 0.086 → 0.098; 16s+: 0.123 → 0.125 — attrition unchanged ✓

aggr_vs_aggr (HIGH block): bands statistically unchanged (Part C's window is 0s
for HIGH by design); the 4–8s broken-press window remains its most dangerous.

## 9. Aggressive-vs-Aggressive — open football survived
Every core metric within matched-seed noise (xG −4% n.s., transitions −5% n.s.,
possession 8.0→8.1s, turnover ecology unchanged, energy/distance stable). The
notable mover, draw % 17.5→28.1, is explained by cal3 *reducing* the
pre-existing home/away asymmetry in this profile (ΔxG home−away −0.90 → −0.75,
Δwin −26pt → −16pt): less side bias → more even matches → more draws.

## 10. Ultra-vs-Ultra — dead football survived
xG 0.214→0.203 (−5%, n.s.), shots −8%, 0-0 89→86%, box entries flat, energy
flat. SHORT-directness sides keep the ball longer (durations +6%, recycling
+10%) and refuse hopeful launches — cagier, not livelier. No artificial attack
appeared where neither side commits.

## 11. Quality gradient (paired/mirrored, artifact-authoritative cal2)
`quality_gradient.csv` (favorite W/D/L | xG share | GD):

| scenario | cal2 | cal3 |
|---|---|---|
| avg_vs_avg | .214/.573/.214 · .500 · 0.00 | .227/.487/.287 · .485 · −0.13 |
| strong_vs_avg | .354/.516/.130 · **.6575** · +0.31 | .320/.547/.133 · **.6490** · +0.26 |
| elite_vs_avg | .427/.516/.057 · **.7114** · +0.51 | .420/.487/.093 · **.7038** · +0.49 |
| avg_vs_weak | .505/.427/.068 · **.7544** · +0.63 | .447/.480/.073 · **.7485** · +0.58 |

Average < Strong < Elite preserved; xG shares within a point of cal2; underdogs
alive (7–13% wins); no scripting, no flattening from structure. (The neutral
mirror's −0.13 GD reflects the residual side asymmetry, §18.)
Why quality wins (cal3 favorite-vs-underdog gaps, elite_vs_avg): pass% +4.9pt,
dribbles won +13.2, aerials won +6.9, mean shot xG +0.012, big chances +0.17 —
advantage flows through execution, duels, and shot quality at the right stages,
not through any scripted term.

## 12. Roles (§21–22) — behavioral differentiation is real
`role_behavior.json` (attacking-phase positional means):
- ST: Poacher relx 81.8/box 42% · Run-Behind 82.6/49% · Target 78.6/21% ·
  Link 76.0/12% — four distinct depths and box occupations.
- Wide: Touchline width 35.9 · Wide Creator 28.9 · Free 18.8 · Inside Forward
  13.4 (66% half-space, 18% box, and the highest workload 13.3km).
- FB: Overlap wide+advanced (34.0 relx, width 35.7) · Underlap 71% half-space ·
  Invert central at depth · Support conservative.
- CM: Runner most advanced (58.7 vs Controller 53.3); Roamer most central.
Complementarity emerges purely geometrically: IF+Overlap = winger inside (13.6)
with fullback outside (34.7); TW+Underlap = the exact inverse (36.3 / 14.9).
No combination bonuses exist.

## 13. Workload (§23)
Matrix-wide: distance +1–3%, final energy −0.1…−0.4 — support movement is paid
for. Effort dials (cal3): A/D 20→100 raises xG 0.26→0.62 and pressures 390→483
while energy falls 78.3→77.6. Quirk (Minor): total distance *falls* slightly
with effort (99.4→97.0km) because dominant teams chase less; effort buys useful
movement, not raw kilometres. No free movement found (min energy 53.5, zero
players at 0 energy across 1120 matches).

## 14. Pressing diagnosis (§24–28) — **the audit's main discovery**
Stage level (code-verified): intensity acts only on engagement willingness —
radius (PASSIVE 4m → RELENTLESS 22m, scaled by Defense Effort/role) and the
tackle *decision* logit; arrival physics come solely from attributes+energy.
Team intensity and individual Defense Effort compose without coupling.
Dial experiment (balanced mirror, 40 matched seeds/dial,
`pressing_dials.csv`):

| dial | pressures | tackles | opp dur | dist km | xG for | xG conceded | transition xG conceded |
|---|---|---|---|---|---|---|---|
| PASSIVE | 373 | 15.3 | 22.0s | 97.2 | 0.365 | 0.866 | 0.084 |
| SELECTIVE | 440 | 23.6 | 16.8s | 99.4 | 0.473 | 0.480 | 0.054 |
| AGGRESSIVE | 512 | 30.0 | 14.5s | 102.3 | 0.544 | 0.375 | 0.037 |
| RELENTLESS | 549 | 36.0 | 13.3s | 105.5 | 0.542 | 0.397 | 0.042 |

**Pressing is a near-dominant strategy.** More pressing lowers xG conceded 57%
AND raises xG for 49%, and even *transition chances conceded fall* as pressing
rises — the bypass/vacated-space cost demanded by §27 does not exist. Only
RELENTLESS shows a faint flattening. Traced mechanism (three interlocking
facts): (a) `_pressure` is proximity-only, so extra pressing bodies degrade the
opponent everywhere with no compactness debt; (b) a bypassed presser's return to
shape travels at the fixed sub-10m movement speeds (§15 below) — over-commitment
is physically free; (c) opponents cannot exploit vacated zones within the 3–6s
decision cadence. Pre-existing (cal2 ecology), surfaced by this audit.

## 15. Vision / Acceleration / Sprint diagnosis (§29–38)
Stage probes (`vision_stage.csv`, `pace_stage.csv`; formula-level, no RNG):
- **Vision is correctly wired.** Recognition p (vision 50→95): short 0.877→0.972,
  long 0.738→0.934, through 0.689→0.916 — trivial options barely gated, hard
  options strongly gated; plus execution bonuses (0.22–0.34z on
  PROGRESSIVE/CUTBACK/THROUGH) and a small sigma term. Match level under cal3:
  +12 vision → favorite wins +10pt, GD +0.18 — Vision now visibly matters
  (structure created more recognizable options). Gap: recognition has **no
  pressure term** — "scanning under pressure" is unmodeled; and no
  option-recognition telemetry exists in the ledger (future instrumentation).
- **Pace responds where modeled, is absent where not.** Arrival times
  (races/press/loose balls): 30m chase 6.81s→5.06s across 50→90 pace (−26%);
  fatigue nonlinearity intact (−1.5% at E70, −10% at E20). But ALL movement
  toward targets <10m away runs at fixed 2.1/3.5 m/s regardless of attributes —
  routine positioning (including pocket adjustments and press-recovery) is
  pace-blind. Match level: +12 accel → xG share +2.6pt, GD +0.28 (real);
  +12 sprint → GD +0.17, share within noise (weak). Verdict: the attributes
  work at their intended stages; the fixed sub-10m band both dilutes their
  match-level footprint and (see §14) subsidizes free press recovery.
  Tactical effort scales movement *targets/urgency*, never speed — no
  effort-as-pace leak found.
- Geometry sanity: challenge (≤3.4m), interception lane (perp ≤5.5m), receiver
  denial (3.6–5.25m) gates are attribute-independent; no impossible reach.
- Pressing×pace×energy hierarchy verified causal: intensity decides whether/how
  urgently; attributes+energy decide how fast.

## 16. Ratings / GK regression (§39–40)
Matched 30-match balanced probe: overall 6.314 (cal2ref) → 6.321 (cal3);
GK 5.97→5.96; DEF 6.23→6.18; MID 6.17→6.08; ATT 6.69→6.87. Centering intact;
cal3 moves ~0.1–0.2 of rating mass toward attackers (they now do more rateable
things). Minor note, no action. Scorers 6.99 vs non-scorers 6.30 — sane.
GK sensitivity (set-based 60→88, matched seeds; cal2 = `after_gk` artifact):
goals conceded by the varied-GK side — reflexes cal2 2.083→1.938 (−7%), cal3
1.950→1.900 (−3%); handling cal2 2.042→1.583 (−22%), cal3 1.710→1.590 (−7%).
Direction preserved in all four cells; the handling footprint shrank, most
plausibly because Part C's re-entry denial removed part of the rebound ecology
where handling is decisive. Note for monitoring, not a normalization break
(the attribute still enters the same save/parry math; population normalization
untouched).

## 17. Discipline / set pieces (§41–42)
Stable across arms in every profile (fouls ±6%, yellows ±10% on small bases,
corners ±10%; no restart loops — corner rate flat even in sieges). Pre-existing
absolute-level quirks (both arms, extreme profiles only): penalties 1.0–1.5 and
reds 0.35–0.40 per aggressive match are high vs real football. Minor, not cal3's.

## 18. Pathologies (ranked)
- **Material (pre-existing, improved by cal3):** home/away side asymmetry in the
  aggressive mirror — identical XIs, home xG −0.90 (cal2) / −0.75 (cal3), home
  wins −26pt / −16pt. Balanced mirror: −0.14 (cal2) → −0.03 (cal3) win delta.
  Something in the end-to-end ecology is side-coordinate sensitive. Deserves a
  dedicated diagnosis (not this audit's workstream winner, but next in line).
- **Material (pre-existing):** pressing dominance (§14).
- **Minor (pre-existing):** ultra keep-ball possessions up to 360–400s when the
  opponent refuses to engage (PASSIVE 4m radius = nobody ever comes); penalties/
  reds in aggressive profiles; effort-vs-distance inversion (§13); 25/1120
  matches with ≥6 duplicate-xG shots (rebound-clamp echo, cosmetic).
- **None found:** energy collapse, never-tiring players, box crowding (max 4
  attackers), role clumping, directness caricature (SHORT sides still launch
  43–45% when geometry demands), siege loops, corner loops.

## 19. Recommended next engine workstream — **Pressing architecture (risk/reward)**
The single most important remaining causal weakness. Every other audited system
is HEALTHY/IMPROVED; pressing is a near-dominant strategy with no structural
counterweight, which directly distorts the tactical meta Touchline exposes to
players (max-press ≈ free wins). It also subsumes the pace finding: the fixed
sub-10m movement band is one of the reasons over-committing is free.
Runner-up considered and declined for now: Vision option-recognition layer
(wired and now visible; add pressure-term + telemetry *within* the pressing
workstream where it naturally belongs), side-asymmetry diagnosis (Material but
narrower).

## 20. Proposed next change (NOT implemented)
- **Observed problem:** pressing intensity strictly improves both defense and
  attack; transition cost of being bypassed does not exist (§14 table).
- **Evidence:** `pressing_dials.csv`; `_pressure` proximity-only; fixed sub-10m
  speeds in `_movement_speed`; recognition lacking pressure term.
- **Root cause:** engaged pressers accrue no positional debt: chase targets are
  granted regardless of arrival feasibility, return-to-shape is fixed-speed, and
  vacated zones are not represented as exploitable space in opponents' option
  utilities within the decision cadence.
- **Likely files/functions:** `engine.py` — `_desired_target` (pressing branch),
  `_movement_speed` (sub-10m bands in pressing/recovery contexts),
  `_pass_option_utility` (+ bonus for options into a zone vacated ≤N s ago),
  `_recognized` (pressure term so press-resistance becomes a Vision/skill
  contest), `_pressure` (optional compactness component). `calibration.py` for
  new constants.
- **Proposed causal fix:** (1) make press engagement a real chase: target granted
  only with feasible arrival, movement at attribute/energy speeds including the
  return leg (remove fixed bands for engaged/recovering pressers only);
  (2) represent vacated-zone exposure: for ~4–6s after a presser leaves his zone,
  passes/carries into that zone gain utility and its lane loses interception
  cover — the bypass cost becomes geometric; (3) add a pressure term to
  recognition so escaping a press is a genuine Vision/technique contest.
- **What must NOT change:** no attribute boosts from intensity; tackle execution
  math; guardrail band; aggressive-vs-aggressive transition identity; ultra
  low-event identity; RNG architecture; ratings/GK fixes; Touchline.
- **Acceptance tests:** pressing dial curve becomes concave (SELECTIVE/AGGRESSIVE
  optimal by matchup; RELENTLESS pays in transition xG conceded ≥ +30% vs
  AGGRESSIVE when bypassed); PASSIVE stops conceding 2.3× SELECTIVE; press-
  resistant high-Vision teams beat RELENTLESS more often than low-Vision ones on
  matched seeds; workload cost of RELENTLESS grows; all §2 batteries stay green.
- **Regression risks:** chaos economy (guardrail!), siege ecology (clearance
  recoveries), workload realism, parity/reproducibility.

## §46 classification summary
| system | verdict |
|---|---|
| Ultra ecology | HEALTHY |
| Controlled ecology | IMPROVED |
| Balanced ecology | IMPROVED |
| Aggressive-vs-Ultra | IMPROVED (watch xG/shot) |
| Aggressive-vs-Aggressive | HEALTHY (side asymmetry: pre-existing, reduced) |
| Quality gradient | HEALTHY |
| Roles | IMPROVED |
| Workload | HEALTHY |
| Ratings | HEALTHY (minor ATT drift note) |
| GK | HEALTHY |
| Pressing | QUESTIONABLE → next workstream |
| Vision | HEALTHY (recognition-under-pressure gap noted) |
| Acceleration | HEALTHY at stage level; diluted by fixed sub-10m band |
| Sprint Speed | QUESTIONABLE (weak match-level footprint) |
| Fouls/cards | HEALTHY (absolute-level quirks pre-existing) |
| Set pieces | HEALTHY |

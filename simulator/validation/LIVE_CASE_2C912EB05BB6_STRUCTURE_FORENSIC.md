# LIVE FORENSIC CASE #2 — 2c912eb05bb6 (MW02-LIV-LEE, LIV 1–3 LEE)
2026-08-23 · engine v0.7 · calibration v0.7-cal6 · players-v3-4attrs · seed 561517662
DIAGNOSTIC ONLY — no football changes made. Hosted RC2 untouched.

## 1. Exact reproduction & instrumentation neutrality
- tools/reproduce_match.py: digest c25b8fc79870ce00c4f1fac3 = saved, score 1-3 = saved, versions match. PASS.
- External 1 Hz replay (no engine modification): digest identical. PASS.
- Decision hook (runtime source-patch of _choose_action, case-1 method): digest identical. PASS.
- Artifacts: validation/forensics/case2/{harness.py, out/positions.jsonl.gz (5400 samples),
  out/decisions.jsonl.gz (1306), out/ledger.json (2692 events), out/{shape,possession,defense,duels,shots}.json,
  out/dribble_probe.json, out/multiseed.jsonl (50 case seeds + 4x30 tactical mirrors)}.
- Note: save id in the task brief had a typo; persisted save is save-e6sdbd31mt5gn04o.
- User tactic change replayed at 3354s (two commands, second wins: Patient/Short/Wide/Secure/Selective/Zonal/Hold).

## 2. THE POSITIONAL MODEL AS IMPLEMENTED (§10)
_desired_target(): every outfielder's target = formation anchor + ball-proportional shift + local modifiers.
- In possession: shift = 0.24·(ball_rel_x − 50). Advanced slots get role/box/probe/pocket bonuses
  (mostly gated at ball_rel_x ≥ 55/62/64); **CBs are excluded from nearly every forward modifier**;
  FBs get modest ones. Out of possession: shift = 0.14·(ball_rel_x − 50) + block-height offsets + compression caps.
- Envelope floors (min_rel_x per slot) and band caps bound everything. Micro sin-oscillation (~4-5 units) on top.
- Verdict: genuine possession-phase translation exists only as the 0.24 slope; the model is
  fundamentally "anchor + small ball-coupled offset", exactly the static-anchor hypothesis.

Measured (exact match, 1 Hz, attack frame; 1 unit = 1.05 m):
- Line slopes vs ball x (in possession): back 0.14–0.15, mid 0.22–0.24, fwd 0.22–0.24 (corr 0.46–0.69).
- Ball def-third → box-attack (Δ~60 units): CB centroid 15.0→26.7 (+11.7), FB 18.7→30.4, DM 29.5→43.8,
  CM 39.6→57.6, W 61.4→80.7, ST 66.1→84.7. With ball at 78+, CBs sit 55.5 units (~58 m) behind it.
- Team length (deepest→highest outfielder): 52.6–59.5 units in ALL phases (grows in final third).
  The team NEVER compresses; back→mid gap 19–25, mid→fwd 25–29 in every phase.
- Sustained final-third possession (116 runs, 1899 s): ball 72.6, CB 24.3, FB 27.7, DM 41.7.
- Deep-buildup checking (per-second movement): ST toward-ball 45%/away 46%; W 34/56; CM 38/45 —
  micro oscillation, not purposeful checking; attackers hold rel-x 61–66 during own-third buildup.
- 50 seeds: slope_back 0.14, length 55.4 — the live match is typical.
- Tactical mirrors (30 seeds each): slope_back 0.17–0.22, length 53–61, support8 0.21–0.43 across
  Ultra→Aggressive. THE POSITIONAL SKELETON IS TACTIC-INVARIANT (§50): tactics move tempo, pressing,
  directness and utilities causally, but not the structural shape.

## 3. BUILDUP (§11–15)
- Def-third carrier support (teammates within 8/12/18/25 m): FB 0.03/0.19/0.82/2.16; CB 0.22/0.84/2.48/4.19;
  GK 0.66/1.6/2.7/4.1. There is structurally nobody to combine with.
- Back-line pass profile: FB 62% of passes ≥30 m (74% forward); CB 41% ≥30 m (88% forward, 52% to CM);
  GK 100% forward. Whole-match: CB→CB 2, CB→FB 0, FB→CB 0, CB→DM 12, DM→CB 1 vs back-line→attack 132.
- Def-third possession typology: SHORT_BUILDUP 2/112 (LIV), 1/83 (LEE); IMMEDIATE_CLEARANCE 45 (LIV!),
  15 (LEE); rest MIXED/DIRECT/TRANSITION.
- Recycling is not "available but unselected" — the options do not exist: pass-option utilities cannot
  select receivers who are 25+ m away laterally when the structure never provides an 8–12 m triangle.
- Verdict: circulation football is structurally unavailable, caused by the shape model (§2), not by
  pass selection or execution. (§52: Leeds 49–50% completion emerges from 30m+ contested balls with
  generic players; LIV 68% same system with elite players. No execution tuning indicated.)

## 4. THE TIME MODEL — CENTRAL NEW FINDING (root cause R1)
Code facts: the ball carrier is FROZEN between decisions (_update_movement_and_fatigue: carrier target=pos,
speed 0, activity "on_ball"); decisions fire every 3–6 s (Patient: up to 8 s deep); engaged pressers move
every second at explosive speed (press branch of _movement_speed) toward carrier.pos exactly; there is no
containment/stand-off state (press target IS the carrier's position).
Measured consequence (exact match, 369 matched receptions):
- separation at reception: mean 4.3 m (47% ≥3 m)
- separation at first permitted decision (mean wait 4.0 s): mean 1.5 m (14% ≥3 m)
- mean pressure at decision 0.63; **90% of all 1306 decisions taken at pressure > 0.5**.
The player who receives in space never gets to ACT in space. Every downstream pathology follows.

## 5. POSSESSION RHYTHM (§18–21)
- 439 possessions (LIV 233 @ 13.7 s mean / LEE 206 @ 10.6 s); 1.5 completed passes per possession.
- Survival: LIV >10s 46%, >20s 25%, >30s 11%; LEE >10s 35%, >20s 11%.
- Hazard by age: 5.9%/s (0–3s), 10.6%, 9.2%, 8.5%, 6.8%, 8.8%/s — flat after 3 s: termination is
  near-memoryless, matching the observed constant turnover rhythm. Possession never "matures" into safety
  because pressure is permanent (§4) and support never assembles (§3).
- Termination: duels/pressure ~45% (tackle/pressure_tackle/heavy_touch/shield), interception 49,
  clearance channels 79, receiver denial 31 — redundant hazard sources (matches the cal3 audit note).
- Ultra mirror: 148 possessions @ 36.6 s — duration responds to pressing environment, so the short-possession
  rhythm is pressure-driven, not a hidden duration cap. (§53 honored: no duration tuning proposed.)

## 6. DEFENSIVE ENGAGEMENT (§22–29)
Architecture (code): NO primary-presser assignment. Each defender independently evaluates every second:
n_pressers cap by intensity (PASSIVE 1 / SELECTIVE 2 / AGGRESSIVE 3 / RELENTLESS 3) over nearest-sorted
players + max_press radius + persistence leash + universal zone-defense override (d≤4.5 & in-zone) +
emergency/CB-discipline exceptions. Engagement is binary go/hold — ENGAGE and (implicit) HOLD exist;
CONTAIN/JOCKEY DO NOT EXIST as behaviors; COVER exists only as passive by_slot geometry; TRACK exists as
marking blends. The concurrent-presser CAP prevents true 4–5-man swarms.
Measured: concurrent closers (≥1 m/s toward carrier, ≤14 m): 0×54%, 1×28%, 2×12%, 3×5.6%, 4+ 0.4%;
authoritative press episodes never exceed 3. Swarm events (3+ closers): 206 (2.3/min), 66% central midfield.
Consequences: 51% of swarms end carrier's possession ≤6 s; escape → shot within 10 s only 12/206 (5.8%).
Role/effort compliance (closing minutes/90): HOLD_LINE 1.4, STAY_HIGH(low eff) 1.1 vs HOLD_ZONE 6.5,
SCREEN 10.0 — roles DO differentiate engagement volume. §27 PASS at the volume level.
- Perceived "3–4 collapsing" = 2–3 real closers + zone-defense override + §46 display smearing.
WING DEFENDING (§28–29): 199 wide-1v1 defensive episodes. Initial distance 5.3 m → min distance 0.9 m;
closed to ≤2 m in 86.4%; mean closing 1.43 m/s; contain-like (|v|≤0.5) 16%; back off 2%.
CONFIRMED: defenders close to contact universally. Root: press target = carrier.pos with no stand-off
distance, and closing a frozen carrier is free (§4) — cost only exists if the carrier could act meanwhile.

## 7. 1v1 / TAKE-ON SYSTEM (§30–39)
What "DRIBBLE" is (code): a real take-on duel (_execute_dribble): BEAT (carrier advances ~7 m past
defender, exposure resets), PARTIAL (+3.5 m), RETAIN, TACKLED, LOOSE, FOUL — softmax over attribute
logits: attacker 0.72·dribbling+0.48·agility+0.35·ball_control+0.22·accel+0.18·balance vs defender
0.52·awareness+0.40·agility+0.60·standing_tackle+0.18·accel, plus space/cover/exposure/pressure terms.
CARRY is a separate space-run action (not a duel). §31–32 answered: PASS/CARRY/DRIBBLE/SHIELD/CLEAR/
SHOOT are the real candidate set; CROSS/through are pass-target variants.
Exact match: 1181 decisions had a DRIBBLE candidate; chosen 47 (4.0%). Outcomes: BEAT 5, PARTIAL 8,
RETAIN 7, TACKLED 20, LOOSE 7. Defenders WERE beaten (Salah 00:55, Ekitike 17:26 & 49:37, Gakpo 35:08,
Calvert-Lewin 56:52). 50 seeds: 58.9 attempts/match, 7.8 BEATs/match, selection 4.3%, BEAT share 13%.
SELECTION IS BROKEN (§34/36): DRIBBLE ranked 1st or 2nd in 0 of 1181 candidate sets; mean utility gap
to winner −2.42 (softmax weight ~3.5%). Base −1.78 dominates; max realistic attribute swing ~±0.8.
STRUCTURAL BUG-CLASS FINDING: _space_ahead measures the corridor THROUGH the duel defender, so space≈0
in every genuine 1v1 — the +0.28·space term can never fire where dribbling matters, and the utility
contains no term for the value of BEATING the defender (open corridor behind him, xg_eff after beat).
§37 counterfactual (controlled states, engine's own formulas): execution differentiates properly —
elite(90 drb/bc/agi/acc) vs weak(60): BEAT 38%, win 66%, lose 18%; reversed: BEAT 1%, lose 84%.
But selection barely moves: elite picks DRIBBLE 7.8%, weak 3.4%. The engine has a working duel that
the decision layer almost never deliberately uses.
§39 ENGAGEMENT RISK / BEATEN CONSEQUENCE — BROKEN: in ALL 5 BEATs the beaten defender was back at
0.0–1.5 m within 1–2 s (attacker frozen post-burst; defender press-chases at full speed; no beaten/
recovery state exists). A won duel is spatially nullified before the attacker's next decision.
Consequently the low dribble utility is "correct" in the current world: dribbling genuinely does not
pay. Fixing selection without fixing consequence would only add turnovers.
§35 winger behavior: 383 wide winger decisions: CARRY 46%, PASS 35% (fwd 39/lat 30/back 32 —
back+lat 61% of passes), DRIBBLE 6.8%, SHIELD 11%, SHOOT 1.6%. High pressure at decision (90%>0.5)
makes recycle/probe rational. Observation E confirmed as downstream of §4/§6.
§40 pressing bypass: swarm escape → shot ≤10 s: 5.8%. Beat-the-press consequence is muted because the
positional damage of a failed press is repaired at press-chase speed onto a frozen target (§4/§39);
cal4's dial-level tradeoff (PASSIVE 0.87 xGc vs RELENTLESS 0.42) survives, but at player-interaction
level over-commitment is nearly free.
§65 workload: press chases use the full running formula + explosive load (code) — RELENTLESS mirrors
run ~108 km vs PASSIVE ~98 km (cal4 data) and this match 105.6/111.1 km. Charged appropriately.

## 8. LONG SHOTS (§41–45)
All 25 shots reproduced with utilities. Distance bands: 0–10m ×2 (0.53 xG), 10–16 ×7 (1.24), 16–20 ×2,
25–30 ×5 (0.112 total), 30+ ×9 (0.088 total). 14/25 shots ≥25 m carrying 0.20 xG combined.
Candidate generation (code): SHOOT candidate exists iff rel_x ≥ 66 (≤ ~35.7 m); no distance/angle gate.
Selection rates: 25m+ 7/289 = 2.4%, 20–25 3/123 = 2.4%, <20 6/68 = 8.8%.
cal6 signal (§44): behaving exactly as accepted — selection by xg_eff band: <0.02 → 2.8%,
0.02–0.05 → 12.5%, 0.05–0.10 → 1/1, 0.20+ → 1/3; chosen mean xg_eff 0.028 vs declined 0.0066.
Only 12/480 SHOOT candidates all match had xg_eff ≥ 0.02 (matches the app's "0 big chances").
Every 25m+ shot fired from: space 0.0, pressure 0.65–0.77, 0–1 teammates within 12 m, ALL candidate
utilities negative (e.g. 07:34 Ekitike: PASS −2.24 / CARRY −0.52 / SHOOT −2.34). When the whole menu
is bad, softmax leaks ~2–8% noise into SHOOT.
§45 INTERACTION HYPOTHESIS CONFIRMED, VERDICT = C (weak competing options from static structure),
with a small B component (no candidate gate above ~30 m would be harmless polish). NOT A (xg_eff is
tiny and adds ~0.05 utility at these ranges); not D (distances authoritative). Long shots are
downstream of the positional/time model. DO NOT tune SHOT now.

## 9. VISUAL VS AUTHORITATIVE (§46)
The UI receives ONE positional snapshot per advance: 6 simulated seconds at 1×, 12 at 2×, 24 at 4×
(MATCH_SPEEDS), and CSS-glides markers linearly between snapshots ("interpolation is cosmetic").
All sub-6s dynamics — press bursts, 7 m dribble breaks, 1–2 s re-engagements, swarm collapses,
containment vs closing — are invisible or smeared. This AMPLIFIES every perception (static shape reads
even more static; take-ons literally cannot be seen at 4×) but does not create the underlying findings,
which are authoritative. Classified separately as presentation debt.

## 10. REPRESENTATIVE TIMELINE (exact match, authoritative)
00:19 Salah→Gakpo 43 m LOOSE; 00:25 Kavanagh→DCL 34 m LOOSE (opening rhythm: both teams bypass)
00:48 Gakpo→Salah 37 m LONG completed; 01:23 Szoboszlai→Salah 37 m (LIV's standard progression)
00:55 Salah BEATS Barros (+7 m) — Barros back at 1.5 m after 1 s, 0.0 m after 2 s; 00:59 forced pass LOOSE
07:34/10:36/17:43 Ekitike 25–26 m shots: xg_eff 0.006, all-negative menus, support12 ≤1
17:26 Ekitike BEATS Duarte — re-caught ≤2 s, carry, recycle
19:29 Ferro 31 m shot (transition, xg_eff 0.004); 22:53 Mbaye 30 m shot (same signature)
32:35 GOAL LEE: header, xG 0.33 (cross chain Ferro→Mbaye), transition-born
35:08 Gakpo BEATS Hartley — re-caught, aerial recycle lost
46:45 GOAL LEE: Mbaye header 0.19 (DCL cross, second-phase)
49:37 Ekitike BEATS Okoye — heavy touch 2 s later, possession lost
55:54 user switches LIV to Patient/Short/Wide (deep-zone decision interval becomes 4–8 s: freeze worsens)
56:52 DCL BEATS Robertson — TACKLED 3 s later by recovering LIV
74:40 GOAL LEE: penalty (Hartley)
79:22 GOAL LIV: Ekitike 0.094 (Salah assist) — the only sub-16m LIV shot chain that escaped a wall
Wide-1v1 signature (03:47 Gakpo, 52:06 DCL, 58:18/77:54 lee_gen_rw): defender at 0.2–2.2 m, space 0.0,
CARRY/recycle chosen; DRIBBLE −1.6 to −1.9 vs CARRY −0.5.

## 11. §57 CLASSIFICATION
- TEAM SHAPE TRANSLATION — BROKEN (slope 0.14–0.24, constant 55–60-unit length, tactic-invariant)
- BUILDUP SUPPORT — BROKEN / MISSING MECHANISM (no checking runs, no triangles; FB 0.03 mates ≤8 m)
- BUILDUP PASS SELECTION — HEALTHY GIVEN GEOMETRY (direct balls are the rational menu; §52 no tuning)
- POSSESSION DURATION — QUESTIONABLE (emergent from R1/R2; responds to pressing environment correctly)
- TURNOVER HAZARD — QUESTIONABLE (near-memoryless by age; redundant hazard channels)
- DEFENSIVE ENGAGEMENT — QUESTIONABLE (ownership emergent-not-assigned; cap prevents true swarms;
  role/effort compliance real at volume level)
- SWARM PRESSING — QUESTIONABLE (2–3 real closers, not 4–5; perception amplified by §46)
- WING CONTAINMENT — MISSING MECHANISM (no contain/jockey state; 86% close-to-contact)
- 1v1 TAKE-ON SELECTION — BROKEN (never ranks top-2; space term structurally zero in duels;
  no beat-value term; attribute differentiation minimal at selection)
- 1v1 TAKE-ON EXECUTION — HEALTHY (attribute-driven, well-differentiated: 66% vs 6% elite/weak)
- DEFENDER-BEATEN CONSEQUENCE — MISSING MECHANISM (beaten defender re-arrives ≤2 s; no recovery state)
- PRESSING BYPASS CONSEQUENCE — QUESTIONABLE (dial-level tradeoff intact; interaction-level cost ~absent)
- LONG-RANGE SHOT ELIGIBILITY — QUESTIONABLE (rel_x≥66 only; no distance gate; minor)
- LONG-RANGE SHOT SELECTION — HEALTHY (cal6 monotone by xg_eff; leakage is all-bad-menu noise, root R1/R2)
- VISUAL REPRESENTATION — BROKEN as a diagnostic instrument (6–24 s keyframes + cosmetic glide)

## 12. ROOT CAUSES (§58)
R1 — ON-BALL TIME MODEL: carrier frozen 3–6 s (to 8 s Patient-deep) between decisions while defenders
    (press exempt from maneuvering bands) close continuously onto carrier.pos. Separation 4.3→1.5 m
    before first action; 90% of decisions under pressure >0.5. Causes: universal contact-range defending
    (D), all-bad menus → junk-shot leakage (G), recycle-heavy wingers (E), beaten-defender nullification
    (F-consequence), memoryless turnover rhythm (B/rhythm).
R2 — ANCHOR-DOMINATED SHAPE MODEL: translation slope 0.14–0.24 with per-slot anchors and near-constant
    55–60-unit team length; no phase compression/expansion; CBs/FBs/DM excluded from advance; attackers
    never check. Causes: no buildup triangles (B), forced 30 m+ progression, low completion as geometry
    (52), CBs-near-own-box perception (A), weak PASS/CARRY alternatives feeding (G).
R3 — MISSING BEHAVIORS on top of R1/R2: contain/jockey state (D); beaten-defender recovery state (F);
    take-on selection value (beat-value + space-through-defender) (E/F).
The observations are ONE connected system (R1×R2 create the environment; R3 are the absent behaviors),
not seven independent defects. Refuted along the way: swarms of 4–5 (capped at 3); take-ons never occur
(5 real BEATs this match, 7.8/match over 50 seeds); cal6 shot signal misbehaving (monotone, correct);
possession-duration cap (ultra mirror 36.6 s); role/effort non-compliance at engagement volume; xG-layer
blame for Leeds' 50% completion (geometry + player quality).

## 13. PROPOSED NEXT WORKSTREAM (design only — NOT implemented)
"Spatial-Temporal Architecture (cal7 candidate)" — one coherent package, staged families, each gated:
A. ON-BALL TIME REFORM (R1): carrier may act between scheduled decisions when context changes
   (pressure crossing, arrival of presser) OR carrier drifts/shields with the ball at reduced speed;
   alternatively shorten decision latency after receptions ("first touch decision" at 1–2 s with
   composure/awareness scaling). Design constraint: keyed-RNG cadence must stay deterministic.
B. PHASE-SHAPE TRANSLATION (R2): possession-phase targets built from ball x AND phase (buildup/
   progression/final-third) with line-depth couplings (compress behind attack, contract toward deep
   buildup) while formation stays the identity; roles/efforts/tactics scale the coupling. No hidden
   +10 CB bonus — a real phase model (§56, §61).
C. BUILDUP SUPPORT/CHECKING (R2): nearest 2–3 eligible players generate genuine support movements
   toward the carrier in deep phases (role/effort/tactic-gated), creating triangles the pass-utility
   layer can already see.
D. ENGAGEMENT OWNERSHIP + CONTAINMENT (R3): primary-presser designation with cover shadowing;
   CONTAIN/JOCKEY stand-off behavior (hold 1.5–2.5 m, deny inside line, delay) as the default for
   non-ball-winner roles/efforts; ENGAGE remains role/intensity-driven (§62). Preserves cal4 semantics.
E. TAKE-ON VALUE + BEATEN STATE (R3): selection utility gains a beat-value term (space BEHIND the
   defender × xg_eff/progression value × attribute differential); _space_ahead variant that excludes
   the duel defender for DRIBBLE evaluation; BEAT applies a short recovery state to the beaten
   defender (re-engage delayed by agility/accel-scaled 1.5–3 s leash) so winning means something (§63).
   Attributes per §64 (existing only: dribbling/agility/balance/acceleration/composure vs awareness/
   standing_tackle/agility/accel).
F. PRESENTATION (separate, app-only): denser positional keyframes or event-anchored micro-snapshots.
Validation strategy: neutrality-gated instrumentation (this harness) as regression instrument; gates:
reception-separation retention (4.3→>3 m at first action), team-length phase response (buildup <45,
final-third compress), def-third support8 ≥1.0 for FB/CB, take-on selection ranks top-2 when elite+
isolated (with matrix xG guardrails ±10% on settled scenarios), wing containment share ≥40% for
non-press roles, beaten-defender re-engage ≥3 s, canonical 5-scenario matrix + quality gradient +
pressing dial + parity + 74-core suite all within accepted bands; live-case counterfactual on
2c912eb05bb6 + ea63cd2c4c6d; §60 principles enforced throughout.

## 14. FOOTBALL FREEZE PROOF (§67)
sha256(16): engine.py 33d1801f9643690c, calibration.py 6abf77bef4abc72f, players.json 14bbe398203d9ba6 —
identical across cal6 checkpoint / production repo / hosted RC2 app. Hosted /api/health:
0.1.0-rc2, engine 0.7, v0.7-cal6, players-v3-4attrs. No calibration bump. RC2 untouched.

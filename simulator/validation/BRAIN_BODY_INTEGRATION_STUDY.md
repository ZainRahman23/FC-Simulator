# BRAIN × BODY INTEGRATION STUDY
Touchline cal11 brain × Continuous Football Runtime body — isolated laboratory (integration/).
Date: 2026-08-25 · NOTHING deployed · production untouched · STOPPED after this study.

## 1-2. Frozen baseline & prototype provenance
Production hashes pre==post (sha256/20): engine `4d8ac52d864fcc6adaeb`, calibration
`6fb2036c6cff41edefab`, players `14bbe398203d9ba60106` — cmp-identical to cal11-checkpoint-20260824.
Live RC8 healthy (0.1.0-rc8 / v0.7-cal11 / production, db ok); persistent DB integrity ok; no fixture
consumed. CFR prototype preserved untouched (cfr.js `b70869c7e0f2d706`, scenarios `63aee0bf4a107045`,
index `c72eeeb453497cec`). Lab lives entirely in `integration/`: `engine_lab.py` (byte-derived copy of
the frozen engine + three ADDITIVE service methods), `body.py` (Python port of the accepted CFR
substrate), `lab.py` (adapter), `microgates.py`, `viewer.html`, traces.

## 3. BrainBodyContract (authority per concern)
cal11 OWNS (verified live through the seam): tactical plan/formations/roles (its own per-second
target computation drives all off-ball movement), action choice (`_choose_action` verbatim),
intended receiver + pass family, take-on/shot/clear/shield decisions, attributes and their execution
mathematics (pass sigma from its exact `_execute_pass` formula; finishing dispersion from
`finishing`), energies/fatigue (its `update_fatigue` runs inside `body_targets`), pressure model,
seeded KeyedRNG draws for execution dispersion.
BODY OWNS: continuous x/y/z motion, accel/brake/turn limits, real travel time, ball physics
(gravity/linear friction/restitution), physical possession (radius + relative-velocity control gates
+ kicker exclusion), touch cadence, deflections/interceptions/loose balls, take-on geometry &
recovery, GK catch-vs-parry physics, restart choreography, collisions.

## 6. Action-family authority table
| family | class | realization |
|---|---|---|
| movement/support/runs/press shape | A brain-authoritative | cal11 targets, body travels |
| PASS (all families) | C constrained realization | brain: receiver+family+skill dispersion (its own sigma formula, keyed draws); body: physical flight, reception/interception EMERGENT |
| CARRY | C | brain picks corridor (its own target), body executes touches |
| TAKE_ON | B body-authoritative outcome | brain decides to attempt (+attributes shape knock/burst); separation/recovery purely physical — the cal9 BEAT/TACKLED probability sampling is bypassed in the lab |
| SHOT | B/C | brain: decision + finishing dispersion; goal/save/miss physical (xG model no longer resolves outcomes) — class-D flag below |
| TACKLE/INTERCEPT | B | physical poke/contact rules |
| GK actions | B (primitive) | catch/parry by relative speed; distribution decided by cal11 (`GK_DISTRIBUTION` wake) |
| RESTARTS | A placement + B choreography | placement sanctioned; run-back physical |
| **UNRESOLVED (class D)** | — | (1) xG/finishing bookkeeping when outcomes are physical: cal11's xG remains a *decision input* but no longer a result generator — stat pipeline needs a redesign decision. (2) cal11's dribble outcome distribution (BEAT/TACKLED probabilities encode attributes the physical duel only partially reuses) — either the brain pre-rolls intent-level commitment or duel physics must absorb those attributes fully. (3) Off-ball fouls/advantage. These are the exact items the next architecture decision must settle. |

## 4. issueIntent schema (as implemented)
`set_intent(pid, {kind})` with kinds: KICK{tx,ty,fam,windup} (all pass/shot/clear families),
TAKE_ON{side,knock,burstT}, CARRY{tx,ty}, MOVE_TO, plus adapter-mediated structural movement from
cal11 targets, chase (loose pursuit), restart positioning/taking. No hidden teleport commands exist;
the body's only placement API logs dead-ball reasons.

## 5. Adapter architecture
`body_sync(positions, ball, controller)` mirrors the physical world into the lab engine →
`body_targets()` runs cal11's own per-second movement/fatigue pass, returns targets, restores
positions (body owns travel) → `body_decide(pid)` runs the real `_choose_action` + execution-
parameter derivation, no execution. Wake events (body→brain): RECEPTION (decide now), LOOSE_BALL /
POSSESSION_CHANGE / DEFLECTION / BALL_OUT / GOAL (structural resync), plus 2.5 s carrier cadence and
1 Hz target refresh. Every decision logged with attributes, dispersion, wake reason.

## 7. Micro-gates — ALL TEN PASS
A short pass (kick→1.55 s flight→receiver control; no pre-arrival action) · B through ball (parallel-
lane race: fast runner wins, mirrored fast defender wins — arrival purely physical) · C take-on (fast
attacker's separation grows past 6.6 m and keeps rising; slow attacker peaks 7.5 m and the fast
defender physically closes to 3.2 m — the old instant-reacquire defect cannot occur) · D cross (5 m
apex, physical box contest) · E shot (strike→flight→GK parry) · F+G press/tackle (zero possession
flips without a logged physical contact) · H buildup (9 kicks/52 receptions in 35 s closed loop; 90%
of players in motion while the ball travels — the world NEVER freezes during brain thinking) ·
I continuous runs (max per-tick step 0.14 m; top runner physically covered 161 m) · J goal→aftermath→
run-back→kickoff→open play.

## 8. Decision cadence findings (§8 of the mandate, measured)
In 6 min of 11v11: 256 decisions = 217 RECEPTION wakes + 39 cadence checks; plus 139
POSSESSION_CHANGE and 81 LOOSE_BALL structural resyncs. **Event-triggered reconsideration is the
dominant and correct model** — receptions alone drive 85% of decisions; fixed cadence is only a
fallback for long carries. cal11's native 1 Hz targets + wake-driven decisions kept the world fully
continuous (gate H).

## 9. Attribute counterfactuals — survive the seam
Pass dispersion: Mac Allister (skill 82) sigma 1.91 m via cal11's own formula; finishing: Salah 0.53 m
aim dispersion vs generic 0.95 m; pace: gates B/C above (take-on and through-ball outcomes flip with
pace); stamina: cal11's real fatigue model ran through `body_targets` (median 17.6 energy drop over
a 2-min high-intensity spell — workload is now PHYSICAL distance, which is itself an architectural
gain). No OVR anywhere.

## 10. Determinism
Same seed → identical 45 s trace hash (`9904914854215642`); different seed diverges; fixed 60 Hz
timestep (FPS-independent by construction); randomness = cal11 KeyedRNG (execution dispersion) +
stateless keyed hash for body tie-breaks. Matched-seed counterfactuals remain meaningful.

## 11. 11v11 matched comparison (360 s, same fixture MW08 & seed)
| metric | native cal11 | brain×body | classification |
|---|---|---|---|
| kicks/passes | 48 | 70 | changes (physical circulation is denser) |
| completion to teammate | 69% | 66% | **INVARIANT-class** — skill math carries over |
| pass-family identity | LONG-heavy (18 LONG/48) | LONG-heavy (62 LONG decisions) | **INVARIANT** — tactical identity survives |
| dribble attempts | 8 | 12 | comparable |
| shots | 2 | 5 | comparable |
| possession changes | 16 | 139 | legitimately explodes: physical deflections/loose scrambles are real events cal11 never modeled; ALSO inflated by the adapter's primitive nearest-man defense — needs cal11 defensive decision routing (scope §15) |
| score | 1-0 | 0-0 | outcomes now emergent (expected) |
Should remain invariant in production integration: completion by skill/pressure, family mix,
tactical shape, attribute gradients, energies. Legitimately changes: travel times, contest/loose-ball
frequency, outcome resolution locus, workload (now physical), possession-change accounting.

## 12. Performance
Headless: **112× realtime** (6 world-min in 3.2 s) including all brain syncs — the brain/body seam
costs ~0.15 ms per 60 Hz tick amortized. Real-time browser operation is trivially within budget
(CFR sandbox already renders at 61 FPS).

## 13. Unresolved architectural conflicts (honest list)
1. Outcome-resolution locus (xG/finishing/dribble distributions) — class D above.
2. Defensive decision routing: press/contain/challenge choices still live inside cal11's per-second
   loop; the lab used its targets + body-side poke rules. Production needs `body_decide`-class
   surfaces for defenders (same pattern, ~cal11's `_defender_challenge_probability`).
3. Fatigue source-of-truth: cal11 computes energy from its own intended movement; production should
   feed body-measured distances (interface exists — one wiring change).
4. Statistics/ledger: the event ledger must be emitted by the SEAM (brain decisions + physical
   outcomes), a new schema vs today's engine-internal ledger — save/digest compatibility decision.
5. Match-length compression: untouched by mandate; world time is honest (1× real).

## 14. Recommendation
**YES WITH CHANGES — cal11 remains the football brain; the CFR runtime becomes the body.**
Every micro-gate passed; attributes, tactics, energies, determinism and cal11's decision identity
survive the seam; the world is temporally continuous; teleport-class artifacts are structurally
impossible. cal11 must SURRENDER: movement execution & travel time, physical possession, contested
outcome resolution (interceptions, duels, saves — with its attribute mathematics re-expressed as
execution dispersion/physical parameters, as prototyped), and instant-execution assumptions.
cal11 RETAINS: all tactical intelligence, action choice, roles/effort, attributes, fatigue model,
game-state policy, seeded randomness. Required production changes (est. scope §15): the three
service surfaces hardened (sync/targets/decide + defender decisions), wake-event scheduler,
seam-emitted ledger, fatigue rewiring — **~3-6 weeks of engine-adjacent work + a new validation
battery; no rewrite of cal11's football logic.** The class-D outcome-locus decision (steered vs
fully emergent shots/duels) is the single open architecture choice and belongs to the user.

## 15. Artifacts & evidence
integration/{engine_lab.py, body.py, lab.py, microgates.py, microgate_results.json,
trace_11v11.json, decisions_11v11.json, viewer.html} · viewer: **http://localhost:8303/viewer.html**
(replay of the cal11-driven 11v11; pause + speed slider) · screenshots
simulator/validation/renderer/bbi_11v11*.png · all gates re-runnable:
`cd integration && ../.venv/bin/python microgates.py`.

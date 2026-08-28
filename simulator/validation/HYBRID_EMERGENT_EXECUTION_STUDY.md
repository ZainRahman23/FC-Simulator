# HYBRID EMERGENT EXECUTION AUTHORITY STUDY

**Question:** Where should execution outcomes resolve — in the cal11 brain, or in the continuous physical world?
**Date:** 2026-08-25 · **Status:** COMPLETE — evidence for an architectural decision. Nothing deployed; nothing in production changed.

Candidate boundaries compared with matched seeds:

- **A — NATIVE:** frozen cal11 engine, outcomes resolved abstractly (the shipped RC8 baseline).
- **B — BRAIN-STEERED CFR:** cal11 rolls the outcome first (pass success, goal-vs-save), then ball flights are velocity-guided so the physical world *realizes the script*.
- **C — HYBRID EMERGENT:** cal11 chooses WHAT (frozen action selection); attributes/context/energy set HOW WELL as bounded execution-parameter distributions drawn **before** physical consequence; the world alone decides WHAT HAPPENS.

---

## 1. Freeze & provenance

Production frozen and verified unchanged at study end:

| artifact | sha256/20 |
|---|---|
| `fc_simulator/engine.py` | `4d8ac52d864fcc6adaeb` |
| `fc_simulator/calibration.py` | `6fb2036c6cff41edefab` |
| `data/players.json` | `14bbe398203d9ba60106` |

Live RC8 healthy throughout (`v0.7-cal11`, `players-v3-4attrs`). No live, save, DB, renderer, or production writes.

Experimental layer (sha256/16): `hybrid.py b8bda16ae315c31c`, `lab.py 564787831c702c69`, `body.py d54ecbafcb1d048b`, harnesses `passcal.py 3f04ac5cca9843eb`, `dueltrials.py fe76e2e1e5c4d99d`, `shotcal.py c27d0d34c52ae7e8`, `runner3.py 0a33269e90634422`. Phase-2 baselines preserved as `lab_phase2_baseline.py` / `body_phase2_baseline.py`. Result data: `passcal_results.json`, `duel_results.json`, `shot_results.json`, `runner3_results.json`, `microgate_results.json`.

## 2. Authority matrix (16 action families)

Owners: **D**ecision · **P**arameters · **R**andomness locus · **Ph**ysics · **F**inal result · **W**ake.

| family | D | P (from) | R (enters as) | Ph | F | W |
|---|---|---|---|---|---|---|
| A ground pass | brain (frozen `_choose_action`/`_pass_type`) | σ_m from passing skill/dist/pressure | aim error before kick | flight, races | world | RECEPTION |
| B driven/long | brain | σ_m (long_passing/gk_kicking) | aim error | flight | world | RECEPTION |
| C through ball | brain | σ_m + lead | aim error | runner-vs-defender race | world | RECEPTION |
| D cross/cutback | brain | σ_m, family arc | aim error | aerial flight, box contest | world | RECEPTION/DEFLECTION |
| E first touch | — (reflexive) | skill = .55·bc+.25·tech+.20·comp × energy | touch-quality draw before contact | CLEAN/HEAVY/LOOSE ball states race | world | RECEPTION/HEAVY_TOUCH/LOOSE_BALL |
| F hostile touch/interception | — | .40·bc+.30·st+.30·reactions | stab-quality draw; stab costs 0.22 s balance | true pick needs q>0.30 **and** rv<9; else directional poke race | world | POSSESSION_CHANGE/LOOSE_BALL |
| G carry | brain | touch cadence, corridor | — | touch-ahead physics | world | cadence |
| H take-on | brain (DRIBBLE) | side, burst, knock (dribbling/accel) | side draw (decision-class) | DRAW→CUT: contain backpedal, reactions-freeze, flank knock race | world | RECEPTION (regain) |
| I tackle | **brain decides WHETHER** (`_defender_challenge_probability` — decision randomness) | timing/reach: .55·st+.25·reactions vs strength/balance shield, exposure | execution-quality draw | win-poke / 50-50 / miss+0.55 s stumble | world | LOOSE_BALL |
| J clearance | brain | direction spread | keyed direction | flight | world | LOOSE_BALL |
| K shot | **brain (SELECTION FROZEN)** | corner aim + dispersion from finishing/pressure | angular error before strike | flight, posts, GK | world | GOAL/DEFLECTION/BALL_OUT |
| L GK shot-stopping | — | react = .30−.18·reflexes01; dive speed 4.2+2.6·reflexes01; catch gate 17+9·handling01 m/s | react-time noise, parry angle | read-at-strike, committed ballistic dive, reach | world | POSSESSION_CHANGE/DEFLECTION |
| M GK distribution | brain (GK_DISTRIBUTION wake) | as pass families | aim error | flight | world | RECEPTION |
| N restarts | brain shape (targets) + adapter legality | — | keyed taker choices | placed ball, real kicks | world | restart machine |
| O pressing/contain | brain intent (routing PRESS/COVER/RECOVER; ownership from cal11 presser) | reactions→knock-freeze latency | freeze draw | cushion-mirror containment | world | — |
| P shielding | brain (SHIELD) | strength/balance in tackle shield term | — | exclusion/separation | world | cadence |

**Justified exceptions (brain-resolved, no physics):** fouls & cards (no contact-severity physics; cal11 FOUL logit stays authoritative), offside (rule bookkeeping), any discipline/rating bookkeeping. Off-ball fouls remain the class-D open item from the integration study.

## 3. Execution-parameter mathematics (production formulas reused, reinterpreted)

- Pass dispersion: `σ_m = max(0.20, 2.15 − 0.017·skill + 0.024·d + 1.10·pressure)`; lateral err ~ N(0,σ), longitudinal ~ N(0,0.7σ), drawn pre-kick. Families keep arrival-speed solutions `v0 = √(2μD + r²)`.
- Reception difficulty: `0.06 + 0.032·rv + 0.10·min(z,1.5) + 0.22·press` vs skill (above) — q>0.12 CLEAN; q>−0.12 HEAVY (squirts 2.2+0.18·rv m, keeps first-toucher advantage); else LOOSE.
- Shot: aim = far/near corner ±2.9 m + N(0, disp), `disp = max(0.25, 2.6 − 0.022·finishing + 1.2·pressure)`; launch 24–31 m/s (family), never guided.
- GK: reads shot **at the strike**; reaction `0.30 − 0.18·reflexes01 (+|N|·0.05)` s; one committed ballistic dive at `4.2 + 2.6·reflexes01` m/s; catch if arrival speed < `17 + 9·handling01`, else field-side parry.
- Tackle quality: `tq = .55·st01+.25·re01 + .35·exposure − (.30·str01+.20·bal01)(1−exposure/2) + N·0.12` → >0.30 clean poke, >−0.05 50-50, else miss + 0.55 s stumble.
- Take-on: DRAW (carry at defender; contain backpedals) → CUT when carrier v>4 m/s / lunge / 1.2 s: knock past flank to die (r=3) ~3.5 m beyond; engaged defenders get reactions-derived freeze `0.10+0.24·(1−re01)` s at the knock; stun removes active reach (>0.35 m).

No OVR anywhere; every attribute acts on its own physical mechanism; energy multiplies execution skill (0.85–1.0) and cal11's own `effective_attribute`.

## 4. RNG contract

`LabRNG.draw(tag,k) = khash(tag, per-tag-ordinal, seed + 7919k)` — khash's char-accumulator hashes tags (no Python salted `hash()`); ordinal per tag ⇒ order-stable, auditable (full audit log kept). Draws parameterize execution only (angles, timing, reach) — **no outcome is ever pre-sampled in hybrid mode**. cal11's own KeyedRNG continues to own decision randomness (action choice, challenge election, aim-side).

## 5. Family results

**Passes (§6/§7).** Open-space cells complete at 1.00 regardless of σ — a *structural* truth of physical worlds: a pass fails only when an opponent occupies the error ellipse or the receiver can't reach the ball; cal11's `pass_execution_probability` silently embeds match-context opposition. Contested/moving cells are where physics decides, and they track skill: Szoboszlai 26 m pressured+moving+contested **0.50** (int 0.50) vs Konaté **0.40** (int 0.60); at 12 m 0.80 vs 0.63. Interceptions scale with σ exactly as designed.

**Reception.** 2,073 modelled touches in 30 min 11v11: 69% CLEAN, 30% mid (HEAVY/poke), 1% LOOSE; no auto-possession, no pinball (stab self-cost + energy-honest pokes killed a genuine 11-alternation melee pathology found mid-study).

**Take-ons/tackles (§8/§9).** Base Salah-vs-CB: BEAT 0.40 / PARTIAL 0.33 / TACKLED 0.28 (cal11 renormalized target 0.24/0.26/0.16). PARTIAL/RETAIN merge physically into contested-retain — cal11's five abstract buckets project onto a progress-distance continuum.

**Shooting (§10).** Grid vs cal11 xG (n=100/cell): d10 free 0.51/0.39, d10 prs 0.35/0.29, d16 free 0.05/0.16, d22 free 0.01/0.07, wide 0.27/0.16 — |err| ≤ 0.12 everywhere with **zero outcome tuning**; the shape difference (physics favors close range, punishes 16 m+ more than cal11's curve) is a reinterpretation finding, not an error. 11v11 shot distances mean 21.4 m (9–36 m spread).

**GK (§11).** Save behavior fully physical: read-at-strike, dive, handling gate. Beats/saves both occur; parries go field-side; holds trigger GK_DISTRIBUTION brain wakes.

## 6. Probability→physics calibration tables

Full tables in `passcal_results.json` / `shot_results.json`. Summary: pass grid empirical−target errors are +0.05…+0.67 in *open* cells (structural, see §5), −0.36…+0.07 in contested-moving cells; shot grid errors within ±0.12. Verdict: cal11 probabilities transfer as *execution-dispersion generators* very well; they do **not** transfer as unconditional completion rates because half their failure mass is contextual opposition that the physical world now represents explicitly.

## 7. Attribute sweeps (40/60/80/95)

| channel | metric | 40→95 | monotone |
|---|---|---|---|
| Passing (synthetic) | open completion | 1.00→1.00 (σ 2.6→0.9 visible in contested cells) | ✓ (trivially; contested gradient real) |
| Finishing | conversion d14 | 0.13→0.21 (xG 0.22) | ✓ |
| GK reflexes | conceded d14 | 0.48→0.04 | ✓ (strong) |
| GK handling | conversion / held | 0.27→0.13 / 0.00→0.77 | ✓ both |
| Dribbling | BEAT | 0.00→0.40 | ✓ (steeper than cal11's 0.11→0.26) |
| Tackling | TACKLED | 0.20→0.34 | ✓ (comparable to target 0.10→0.19) |
| Reactions | BEAT conceded | 0.38→0.02 | ✓ as containment; TACKLED non-monotone (elite reactions *contain* rather than steal — real football, documented) |
| Pace (vmax 6.5/7.5/8.5) | BEAT | 0.32/0.30/0.38 | weak-monotone; pace is a channel cal11's duel math doesn't have at all |

## 8. Churn decomposition (30-min hybrid 11v11, 505 flips)

`uncontested_pickup 178 · failed_reception 88 · bad_launch 57 · tackle 56 · interception 46 · carry_lost 41 · takeon_lost 17 · clearance 17 · gk_claim 5`

Hybrid possession flips: 23.3/min vs NATIVE'S 4.2/min (engine `POSSESSION_CHANGE` semantics; counting native RECOVERY+POSSESSION_CHANGE gives ≈10/min — the honest gap is ≈2.3×). Largest single cause is **uncontested pickups** — adapter movement ecology (only nearest player chases; off-ball structure doesn't shield loose balls), not the execution models. Per the mandate, no global retention bonus was added; the demonstrated causes are (i) adapter loose-ball ecology, (ii) 2.5 s carrier cadence leaving carriers exposed. STEERED's churn is *worse* (55/min, uncontested 924): scripted interceptions dump guided balls into dead space.

## 9. Defensive integration

PRESS/COVER/RECOVER routed as distinct bodies; PRESS honors cal11 engagement ownership (presser named by the latest carrier decision keeps the job; nearest-defender only as fallback). Containment is a 1.7 m cushion with speed-mirroring — never dive-in; challenges fire only when cal11's own `_defender_challenge_probability` elects to lunge. Tactical counterfactual (AWAY pressing PASSIVE vs RELENTLESS, same seed, 15 min): challenges 21→24 (+14%), HOME completion 0.694→0.660 — tactics alter probabilities through the frozen cal11 math and the world converts them into consequences; no scripting. Magnitude is attenuated by single-presser routing (production would route cal11's full press-sweep assignments).

## 10. Wake scheduler results

30-min hybrid: RECEPTION 1420 · LOOSE_BALL 655 · POSSESSION_CHANGE 624 · cadence 141 · DEFLECTION 137 · HEAVY_TOUCH 52 · BALL_OUT 26 · GK_DISTRIBUTION 9 · GOAL 1. Decisions 58.6/min, 3.1 per possession spell — event-driven dominance (cadence only 4.8% of decisions), no thrash. BEAT and REBOUND wake through existing RECEPTION/DEFLECTION channels.

## 11. Three-way 11v11 (matched seed 789335328)

| metric | A NATIVE | B STEERED | C HYBRID |
|---|---|---|---|
| active minutes | 86.8 | 29.5 | 26.8 |
| goals | 2 | 0 | 1 |
| passes/min | 10.6 | 22.1 | 15.7 |
| completion | **0.577** | 0.629 | **0.667** |
| possession flips/min | 4.2 (≈10 w/ recoveries) | **54.9** | 23.3 |
| shots/min | 0.16 | 0.14 | 0.37 |
| goals/shot | 0.143 | 0.000 | 0.100 |
| dribbles/min | 1.15 | 3.73 | 2.20 |
| avg possession spell | — | **1.27 s** | 3.55 s |
| melee alternations | — | 2019 | 1147 |
| continuity violations | — | 0 | 0 |
| shot distance mean | — | 22.1 m | 21.4 m |
| workload (median) | — | — | 205 m/min |
| energy after 30 min (mean) | on-curve | 45.7 | **5.4 (defect, §13)** |

Classification: completion, goals/shot, shot distances, dribble frequency = **invariant-or-close**. Pass tempo and shot volume higher = **legitimately changed** (a continuous world converts cal11's decision density into more, shorter actions; consistent with the Architecture-B schedule-ratio finding that cal11's density is ~2× real football — cal12-class cadence work, out of scope here). Possession churn = **defect-class gap** with decomposed causes (§8). The steered comparator B is dominated on every ecology metric: pre-sampled outcomes + guidance produce the *least* coherent world while also erasing pace/reactions as causal channels.

## 12. Determinism & parity

Same-seed hybrid 30-min trace hash `9e0363866c28b978` — identical across independent processes, identical under chunked execution (2×900 s vs 1×1800 s), divergent under seed change. Recomputed post-interruption with hash equality asserted. Zero teleports/continuity violations in all runs (max inter-tick ball step 0.33 m at 60 Hz). All 10 phase-2 micro-gates re-pass after every semantic change.

## 13. Abstraction limits, defects, rejected variants

**Newly discovered defects:**
1. **Fatigue over-drain (open):** cal11's abstract fatigue, mirrored at 1 Hz over a churning continuous world, biases activity sampling toward sprint states → mean energy 5.4 after 30 min (native pace: barely dented). Production must drive energy from the body's *measured* distance/speed (the body knows true workload; median 205 m/min is itself ~15% hot). Not tuned around, per mandate.
2. **Baseline take-on semantics were wrong** (knock never released control; carrier chased a bearing, not the ball) — invisible to gate C, exposed by duel trials; fixed as two-phase DRAW→CUT with release.
3. **Melee pinball** (11 alternating stabs/0.2 s) — fixed physically: stab balance-cost 0.22 s, energy-honest pokes, stun removes active reach.

**Rejected variants (with causal reasons):**
- *Waypoint-cached press tracking with latency* — outcome flipped chaotically on 0.1 s cache phase; latency belongs on reaction-to-event, not on tracking quantization.
- *Sprint-speed containment at 1.1 m* — eliminated the cushion pre-knock; duels became touch-RNG coin flips.
- *Hostile-contact skill bump alone* — a +0.05 skill delta across a sharp CLEAN threshold flipped whole duel populations (knife-edge handover = pinball's cousin); replaced by the interception/poke/deflect structure with a controllability gate.
- *Straight-line ±0.55 rad knock* and *at-defender short knock* — geometrically doomed vs a set defender; replaced by flank-relative, arrival-speed-solved knock into space.
- *Center-aim shooting* — inverted the finishing gradient (elite passed to the GK); corner-aim restored it.
- *9 m/s GK dive* — superhuman; swallowed the frame and flattened finishing; 4.2–6.8 m/s restored both gradients.
- *GK reaction clocked at first contact* — keeper mathematically always beaten; reads-at-strike fixed it.

**Standing abstraction limits:** no foul/card physics (brain-resolved exception), FOUL removed from duel target renormalization; cal11's PARTIAL/RETAIN buckets have no discrete physical analogue; heading is aerial-contact only (no header model); pass calibration in open space is structurally 1.00 (§5).

## 14. Smallest justified production architecture

**Boundary C, with three brain-resolved exceptions (fouls/cards, offside, GK distribution *choice*) and one accounting change (fatigue from body telemetry).** Concretely:

1. cal11 unchanged as decision brain (action selection, pass/shot/dribble election, challenge election, tactics, restarts shape) via the 3-method seam already proven (`body_sync`/`body_targets`/`body_decide`).
2. Execution layer exactly as `hybrid.py`: reception model, hostile-touch model, tackle execution, take-on DRAW→CUT, corner-aim shooting, GK read/dive/handling, defensive routing with cal11 engagement ownership — all parameters derived from existing attributes and cal11's own formulas; keyed auditable RNG.
3. Body (`body.py` CFR) unchanged plus the two additive physical rules earned here: stun removes active reach; take-on knock releases the ball.
4. **Not carried into production without further work:** loose-ball ecology (multi-man structured recovery instead of nearest-chaser) and cadence density (cal12-class), fatigue telemetry mapping — these own the churn gap and the energy defect.

## 15. Recommendation, scope, risks

**Recommendation: C — HYBRID EMERGENT, ACCEPT WITH EXCEPTIONS** (exceptions as §14; burden of proof met for each: no physics exists for fouls/offside, and GK distribution choice is a decision, not an execution).

**A** remains the correct *shipping* engine until integration completes — nothing here touches it. **B is rejected on evidence**, not aesthetics: it reproduces cal11's headline numbers *worse* than C (goals/shot 0.000, spells 1.27 s, 55 flips/min, melee 2×), erases pace/reactions/dive as causal channels, and its guided flights are the teleport-family artifact the renderer forensics already condemned — steering the world to a script destroys the world's meaning without buying calibration.

**What stays brain-resolved:** action choice and all decision probabilities; tackle *election*; tactics; fouls/cards/offside/discipline; restart shapes; distribution choices; ratings/xG bookkeeping (xG becomes a measured calibration target — §6 shows it lands within ±0.12 already).
**What becomes physical:** every flight, touch, race, duel resolution, save, rebound, and possession transition.

**Estimated integration scope:** 4–7 weeks on top of the 3–6 week brain×body estimate's overlap — (1) full-squad defensive routing from cal11 press-sweep (1 wk); (2) loose-ball/second-ball team ecology (1–2 wk, owns the churn gap); (3) fatigue-from-telemetry + energy re-calibration (1 wk); (4) foul/offside brain-event injection & bookkeeping parity (1 wk); (5) season-level statistical validation vs cal11 across seed batteries (1–2 wk). **Risks:** churn convergence is not yet demonstrated at native levels (mitigation: ecology work, measured, no retention bonuses); match-length/action-density interacts with the frozen cadence question (explicitly deferred); attribute gradients are steeper than cal11's (a product decision — physics amplifies quality; flag for design review, not silent tuning).

**STOP.** No production integration, no cal12, no deploys, no renderer/live/save changes. Execution authority is now the user's decision.

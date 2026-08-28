# PHYSICAL POSSESSION ECOLOGY STUDY

**Workstream:** make possession, touches, tackles, interceptions, deflections and loose-ball recovery behave like continuous football physics in the accepted Hybrid-C laboratory.
**Date:** 2026-08-25 · **Status:** COMPLETE. Nothing deployed; cal11 production, live RC8, and the save untouched (engine `4d8ac52d864fcc6adaeb`, calibration `6fb2036c6cff41edefab`, players `14bbe398203d9ba60106` re-verified). Architecture B remains dead.

Accepted-C entry state frozen as `hybrid_acceptedC_baseline.py b8bda16ae315c31c`, `lab_acceptedC_baseline.py 564787831c702c69`, `body_acceptedC_baseline.py d54ecbafcb1d048b`.

---

## 1. Baseline root-cause decomposition (30-min 11v11, seed 789335328, hash `9e0363866c28b978`)

Instrumentation: `ecology.py` classifies **every player-level control establishment** by physical origin from the contact/event record; measures spells, immediate re-flip, ping-pong windows, and per-0.1s ball-state occupancy.

| headline | baseline |
|---|---|
| team flips/min | 16.8 |
| median / mean possession spell | **0.57 s** / 3.55 s (p25 0.15 s; p75 4.33 s; 55 spells > 10 s) |
| re-flip within 3 s | **70%** |
| ping-pong player P→Q→P < 3 s | **546** (team A→B→A < 4 s: 226) |
| melee alternations/min | 38.2 |
| loose-ball events/min | 21.8 (the "205/min" in the tasking was m/min workload, not loose balls) |

Causes of the 1,117 ownership changes: **adapter/controller artifact 530 (47%)** · pass reception 137 · interception 123 · ricochet 87 · loose race 74 · tackle 41+31 · shield loss 45 · take-on 30 · bad touch 11 · GK 5 · restart 3. Of team flips: artifacts 162, interceptions 120, ricochets 65.

**Diagnosis:** the mass of sub-second pseudo-possessions was not football — it was the control model itself: (i) `interact()` was nearest-wins-per-tick, so opponents *passively stole at the controller's feet* with no football action; (ii) carriers knocked the ball into the duel zone regardless of pressure; (iii) passes in flight were treated as loose balls (instant perfect intercept-lead pursuit by the nearest opponent from the tick of the kick); (iv) the designated receiver never attacked his pass; (v) lofted balls bounced for 4–12 s in no-man's land because `chase_point` led the current velocity ≤ 0.8 s while `predict_stop` (rolling-only) was never even in the pursuit path.

## 2. The possession state model (implemented, physically derived)

`UNCONTROLLED → CONTESTED → CONTROL_ESTABLISHING → CONTROLLED`, all emergent:

- **CONTROLLED / at feet (< 0.95 m):** not passively stealable. Dislodging requires a football action — cal11-elected challenge (tackle/poke), or interception of the *next touch* once the ball genuinely separates (dribble knock beyond the control radius). The controller gains nothing by fiat: challenges resolve physically and he can absolutely lose the ball.
- **CONTROL_ESTABLISHING:** every control sets a settle clock `b['estT']`; skill-derived on modelled touches (`0.55 − 0.40·skill + 0.02·rv`, clamped 0.10–0.55 s — strong technicians kill the ball faster). During settle, challenges get +0.35 exposure: dispossession risk concentrates in the unsettled window, as in real football.
- **CONTESTED:** loose ball with both teams in reach — resolved by the hostile-touch model (interception needs quality *and* a controllable ball; otherwise a directional poke starts a race; every stab costs 0.22 s balance, and pokes never add energy).
- **UNCONTROLLED:** races on honest pursuit geometry (see C6).

## 3. Every attempted change (accepted ✔ / rejected ✘), with measured effect

| # | change | flips/min | med spell | ping-pong | verdict |
|---|---|---|---|---|---|
| — | baseline | 16.8 | 0.57 | 546 | — |
| C1 | **control protection + settle window** (no passive steals at feet; skill settle; est-window challenge exposure) | **9.1** | **3.92** | **91** | ✔ the single decisive change |
| C2 | **pressure-aware close control** (carriers shorten touches with an opponent < 2.8 m) | 11.4 | 2.68 | 87 | ✔ kept — physically right; its regression exposed the missing PRESSURE wake |
| C3 | **PRESSURE wake** (closing opponent < 2.2 m forces an early cal11 decision, 0.8 s rate-limit) | 11.1 | 2.55 | 90 | ✔ carriers release before the tackle on cal11's own logic (622 fires/30 min; cadence 141→15) |
| C4 | **crisp pass arrivals** (SHORT r 3→6.5, CUTBACK 4.5→6 m/s) + **0.30 s flight-reaction gate** + kicker never chases his own pass | 11.9 | 2.45 | 109 | ✔ physically true; insufficient alone — anatomy showed the real failure was elsewhere |
| C5 | **the called pass** (intended receiver = designated chaser from release; opponents stay reaction-gated) | 11.0 | 3.21 | 113 | ✔ |
| C6 | **bounce-aware pursuit** (`predict_stop` models hang time + geometric bounce chain, restitution 0.55; `chase_point` routes aerial balls to the landing/rest point) | **9.5** | **3.93** | **64** | ✔ second decisive change — killed the lofted-ball no-man's-land |
| C7 | **flatter long ball** (LOFT T = D/16, cap 2.2 s) | 9.7 | 3.65 | 67 | ✔ trims hang time to real long-pass trajectories |

**Rejected variants / non-events:** first C6 patch matched nothing and was re-applied (trace-identical run proved zero effect — recorded as a non-event, not a data point); micro-scenario 13/15 initial FAILs were **scenario-design flaws** (perfectly symmetric 50/50 = deterministic footrace repeated 30×; melee spawn 0.7 m from a player = legitimate instant control) — geometry fixed, physics unchanged. Earlier-phase rejections (waypoint press caching, 9 m/s GK dive, center-aim shooting, hostile skill-bump-alone) carry over from the authority study §13.

## 4. Final ecology (3 seeds × 30 min, `battery_results.json`)

| metric | baseline | final (789335328 / 424242 / 20260825) |
|---|---|---|
| flips/min | 16.8 | **9.7 / 10.2 / 10.5** (native cal11's honest recovery+change band ≈ 10/min) |
| median spell | 0.57 s | **3.65 / 3.84 / 3.45 s** (p75 ≈ 8.4 s, p90 ≈ 16 s — possessions breathe) |
| re-flip < 3 s | 0.70 | **0.454 / 0.451 / 0.454** |
| ping-pong (player, 30 min) | 546 | **67 / 73 / 72** |
| melee alternations/min | 38.2 | 15.7 / 18.4 / 17.2 |
| loose events/min | 21.8 | 11.6 / 13.7 / 13.4 |
| artifact flips (30 min) | 162 | 23 / 33 / 30 |
| clean first-touch rate | — | 0.94 / 0.92 / 0.93 |
| completion | 0.667 | 0.61 / 0.67 / 0.69 (native 0.577) |
| passes/min | 15.7 | 12.3 / 13.4 / 14.0 (native 10.6) |
| goals (30 min) | — | 2 / 3 / 1 · shots 6 / 3 / 11 |

Ball-state occupancy (final): DEAD ~14%, CONTROLLED ~26%, IN_FLIGHT ~43%, LOOSE ~14%, CONTESTED ~3%. The high IN_FLIGHT share is the signature of cal11's pass volume and ~40% LONG mix rendered honestly (long balls now fly real 2.2 s trajectories); it is brain-mix/cadence territory (cal12-class), not a physics defect.

Flip causes are now football: interceptions ~3.4/min (dominated by contested aerial landings on the long-ball mix — measured long-ball loss ≈ 50%, the real-football rate), tackles won 30–45/30 min, shield losses ~32, ricochets ~38, blocks-at-release 27% of failed passes, second-ball pathology ≤ 6%.

## 5. Micro-scenarios (15/15 PASS, `ecoscenario_results.json`)

Uncontested/pressured/moving/hard/underhit receptions 30/30 · through-ball race (gate B) · lane interception 16/30 when a body occupies the lane (0/30 when none — failure requires opposition) · shielded reception 30/30 · tackle triad with st-gradient · take-on vs slow defender BEAT 17/30 · varied-geometry 50/50 splits 13–17 · ricochet recovery 30/30 with **zero** alternations · 3v3 melee resolves in 1.2 s mean with **zero** alternations · reception ball-control sweep monotone (clean 0.95→1.00 across 40→95 on hard driven balls; the gradient is steeper at the weak end, ceiling at the top).

## 6. Family regressions (thresholds unchanged — all re-pass after C1–C7)

- **Micro-gates A–J:** pass after every single change (run 8×).
- **Duels:** base BEAT 0.47/PART 0.25/TKL 0.28; dribbling, tackling, reactions monotone; pace gradient *strengthened* (BEAT 0.22→0.44 across vmax 6.5→8.5).
- **Shots/GK:** grid errors vs cal11 xG within ±0.12, five of eight cells within ±0.06 (better than pre-ecology); finishing 0.09→0.21 monotone; GK reflexes 0.52→0.06; handling→held 0→0.67.
- **Pass sweep:** monotone; open-space completion remains structurally 1.00 (§5 of the authority study).

## 7. Counterfactuals (3-seed replication, `cf_replication.json`)

**Tactical (away press PASSIVE→AGGRESSIVE):** HOME completion **0.700 → 0.640** (lower in all three seeds); challenge attempts 19→21 (+10%); flips ≈ flat. Pressing works through frozen cal11 probabilities and physical consequence — no scripting. The contest-volume gradient is real but attenuated by single-presser routing (production: route cal11's full press-sweep). An interesting honest effect: aggressive pressure forces *earlier releases* rather than only more tackles.

**Technical (HOME technique −18 / +12):** clean first touch **0.857 → 0.940** (monotone in every seed — the direct execution channel). Completion is flat (0.700 vs 0.702) because of a genuine selection effect: cal11's brain trusts elite passers with more ambitious balls (LONG share 0.21 → 0.29), so elite teams attempt harder passes at equal completion — risk-adjusted execution is clearly better. Weak teams also hold shorter spells (2.9 vs ~3.7 s median on 2 of 3 seeds).

## 8. Fatigue telemetry (measured only — NOT redesigned, per mandate)

Physical workload is plausible in shape: speed bands 37% walk / 27% jog / 17% run / 10% HSR / 9% sprint; average 3.3 m/s ≈ 200–220 m/min — about **1.8× real match intensity**, consistent with cal11's known ~2× decision density (cadence work, explicitly deferred). The energy *accounting* is the defect: drain measures **5.05/min vs native's implied 0.39/min (≈13×)** — energy mean hits ~24 by world-minute 15 and ~5 by minute 30. Since bodies are demonstrably not sprinting 13× more, the error is at the seam: `_update_movement_and_fatigue` on mirrored per-second displacements mis-classifies activity. **Migration path:** production feeds cal11's fatigue system the body's *measured* per-player distance-by-speed-band telemetry (already instrumented here) as the authoritative workload input; the abstract movement inference is retired at the seam. No behavior changed in this workstream.

## 9. Determinism & parity

Final build: same-seed 30-min trace identical (`7931d05ea27ffd3d`), chunk-independent (2×900 s ≡ 1×1800 s), seed-divergent. RNG remains localized and auditable (LabRNG keyed tags + cal11's KeyedRNG); zero continuity violations in every run; micro-gates and family harnesses deterministic throughout.

## 10. Visual/replay evidence

`integration/viewer_final.html` on **:8303** replays the final-build primary-seed 30-minute match (`trace_final.json`, decisions in `decisions_final.json`). Machine checks on the same trace: 0 teleports, max inter-tick ball step 0.33 m, ball-state occupancy as §4. Personal viewing remains the user's gate.

## 11. Remaining architectural defects (open, in priority order)

1. **Fatigue accounting at the seam (13×)** — migration path defined (§8); blocks nothing in the lab, blocks production.
2. **Scoring rate** ~2–3× native (6 goals/90 pace; close-range conversion runs +0.12 over xG and box defense has no dedicated ecology) — integration-phase work: full-squad box routing, shot-context density.
3. **Workload/cadence 1.8×** — cal11 decision-density (cal12-class, deferred by mandate).
4. **Single-presser routing** attenuates pressing-intensity contest gradients — production should route cal11's press-sweep assignments to multiple bodies.
5. **Passes-per-spell 1.3** (real ~3–5) — driven by the 40% LONG mix + PRESSURE-wake quick releases; partly brain pass-selection context (cal11 never knew flights take time), partly cadence.
6. No foul/offside physics (standing brain-resolved exceptions), no header model (aerial contests are ground-projected races).

## 12. Recommendation

**Hybrid C's physical substrate now plays coherent, recognizable football at possession level, and is SAFE to become the production body beneath cal11 — conditional on the four integration prerequisites** (fatigue telemetry migration; full-squad defensive/box routing; scoring-rate ecology validation across seed batteries; foul/offside event injection). Possessions breathe (median ~3.7 s, p90 16 s), teams circulate, pressure raises turnover risk and forces early releases, aggressive pressing produces more contests and lower opponent completion, technical quality shows in touch and pass ambition, scrambles still occur and resolve in ~1 s without pinball, and every ownership change traces to a football cause. No outcome scripting, no OVR, no hidden modifiers, no retention bonuses were introduced; every accepted change is a physical rule with a causal justification and a measured effect.

**STOP.** No production integration, no cal12, no deploy, no renderer/live/save changes.

# PRODUCTION-INTEGRATION PREREQUISITE STUDY — Hybrid-C beneath cal11

**Date:** 2026-08-25 · **Status:** COMPLETE — stopped before production merge, as mandated.
Production untouched throughout (engine `4d8ac52d864fcc6adaeb`, calibration `6fb2036c6cff41edefab`, players `14bbe398203d9ba60106`, save `touchline.db b2092e4415533069`, deployed renderer `touchline.html d603a86df35566ef`; RC8 live-healthy verified before and after). B remains dead. Entry substrate frozen as `*_ecofinal_baseline.py` (`9819c913befca8f2` / `88d698aea0fc486c` / `41d63f3dd079a0dc`).

---

## Prerequisite classifications

| # | prerequisite | verdict |
|---|---|---|
| 2 | Fatigue authority migration | **PASS** |
| 3 | Full-squad defensive ownership | **PASS** (workload differentiation masked by cadence saturation — deferred cal12-class) |
| 4 | Box defense + attacking occupation | **PARTIAL** — attacking structure restored (major seam repair); transition box protection still lets counters over-convert |
| 5 | Foul/offside/restart injection | **PASS with a volume gap** — all machinery authoritative and tested; foul rate 2–3/90 vs native ~21; no cards yet |
| 6 | Possession ecology kept | **PASS** |
| 7 | Tactical + quality counterfactuals | tactics **PASS** · attributes **PASS** (family level + stamina) · match-aggregate quality **PARTIAL** (selection effects + short windows) |
| 8 | Random integrity | **PASS** |

Because prerequisite 4 is PARTIAL (critical), **no integration plan is proposed** per the gate condition. The recommended next step is one more isolated repair workstream (below).

## 1. Freeze + baselines

A-side: `native_baseline.json` — 3 seeds, full 90-min causal metrics (per seed ≈: passes 10.6/min, completion 0.577, shots 14, fouls 21, offsides 6, tackles 72, box entries 46, energy mean 65.3/min 57.6). B-side pre-workstream: ecology-final battery (`battery_results.json`). Post-workstream: `battery2_results.json` + `battery2_final.out`.

## 2. Fatigue authority migration — PASS

**Defect confirmed at source:** `_update_movement_and_fatigue` charged energy from cal11's internal `move_toward` against externally-overwritten mirrored positions — permanent phantom sprinting (5.05 energy/min, 13× native's 0.39/min).

**Fix — authority boundary, not symptom:** the body measures true per-tick displacement into cal11's own five activity bands (`measure_workload`/`take_telemetry`); an additive `body_fatigue(telemetry)` feeds the **unchanged accepted model** — `update_fatigue` (stamina efficiency, intensity² locomotion load, acute exertion) per measured band, `add_explosive_load` for measured sprint efforts and physical duels (cal11's own event values at the physical knock/challenge). `body_targets` restores energy/exertion/distances (pure target computation); the engine clock now advances on world seconds only. Distance bookkeeping is body-authoritative (a double-count found and fixed).

**Proofs (all mandated causal claims):**
- Same role, higher workload → more drain: standing 0.35 vs identical-duration shuttle 5.7 (16×); 11v11 drain ranks by measured distance (pressing mids most, CBs least, GKs ~nil).
- Same physical workload (1293 m shuttle, scripted identically) → stamina 40 drains 5.7, stamina 90 drains 4.0 — pure efficiency, no hidden modifiers.
- Low-workload role conserves with mediocre stamina; pressing/transition roles drain materially faster (role → workload → drain, causally).
- Degradation: effective sprint_speed per-step losses steepen 0.9→2.1→3.1→4.3→5.4 from energy 95→8 (accepted nonlinear curve intact).
- Match-level stamina counterfactual monotone: home energy 83.4/86.5/88.5 across stamina −25/base/+20 (away control stable).
- Post-migration drain 0.65/min vs native 0.39/min — the residual is exactly the measured 1.8× physical workload (223 m/min median; speed bands 37/27/17/10/9%), i.e., cal11's 2× decision-density rendered honestly. 90-min energy mean 41–42 vs native 65 — explained by workload + no halftime recovery in the lab (`halftime_recovery` unport noted). **Migration path delivered: body telemetry is now the authoritative workload input.**

## 3. Full-squad defensive ownership — PASS

Single-presser heuristics replaced by cal11's own hierarchy via additive `body_defense()`: **ENGAGE** (engagement-owning presser; containment cushion + cal11-elected challenges), **SUPPORT** (press-sweep support: jockeys a 4.5 m goal-side post, denies lanes, never tackles — an early variant that closed to 2.5 m at sprint became a de-facto second presser, measurably regressed the ecology, and was **rejected**), **RECOVER** (cal11's `st_beaten_until`), **HOLD** (cover/screen/line instructions — pure structural shape; excluded from loose-ball chasing beyond 6 m), **TRACK** (cal11 structural targets: marking/line/block). Roles refresh at 0.5 s and persist 2 s through loose balls. No universal swarm anywhere; engagement handoff only through cal11 naming a new presser.

**Four-intensity counterfactual (PASSIVE/SELECTIVE/AGGRESSIVE/RELENTLESS, 2 seeds):** flips/min 11.0→11.1→12.2→13.7 and opponent spells 3.2→2.2 s monotone; challenges 22.5→27.5 and unique engagers 7.0→8.5 rise at RELENTLESS; completion-vs-press effect confirmed separately (0.700→0.640 across 3 seeds, every seed). Distance/energy differentiation is flat because all roles already run at the saturation workload of cal11's target density — a cadence-class limitation, documented, not papered over.

## 4. Box defense + attacking occupation — PARTIAL

**Major architectural find:** all five `_bx_box_runs` call sites — plus Family E's beaten-window and BX.Q's exploit-window authorship — live inside cal11's `_execute_*` outcome methods, which hybrid replaced with physics. **The cal7–cal11 box-arrival and post-BEAT systems were silently severed at the seam.** Repaired by re-injecting brain-state authorizations at the corresponding physical events: deep penetration reception → `_bx_box_runs` (ai_intents then drive `body_targets` → real box runs); physically confirmed BEAT → cal11's own `t_rec` formula sets `st_beaten_until` + `bx_exploit_until` (measured: 14–24 BEAT windows/90, mean t_rec ≈ 2–3 s; beaten defenders re-claim within 2 s in ≤¼ of cases — the accepted no-instant-reclaim property).

Organic 90-min structure: box entries 43–74, box shots arrive with multiple attackers (e.g. 3v4 occupancy), attackers keep moving after releasing (75% moving > 1.5 m/s at +1 s in open play), no defenders-stranded or all-collapse patterns in replay inspection. "Lone-striker shots" 6–13 of 12–17 conflates long-range strikes (empty box is correct there); box-shot-specific occupancy is healthy. Posed diorama scenarios were rejected as off-manifold (cold-started tactical state produced scrambles — a harness lesson, not a world defect).

**The open defect:** elite HOME generates 21 shot decisions to AWAY's 5, yet AWAY won all three final matches (1-2, 1-3, 0-3) by converting counters at ~50%/shot. Transition box protection (rest-defense bodies vs breakaways, GK 1v1 context) does not yet punish counters the way settled box defense does. This inverts the team-quality gradient at match level and **blocks production integration**.

## 5. Foul / offside / restart injection — PASS with a volume gap

- **Fouls:** physical challenge execution (missed lunge through the carrier at <1.6 m; widened to through-the-carrier 50-50 contacts at reduced weight) → cal11-shaped foul logit → keyed adjudication → authoritative FREE_KICK/PENALTY dead-ball with player reset (deterministic tests: box challenges produce penalties; midfield produce FKs). **Volume 2–3/90 vs native ~21** — the physical trigger set is still too narrow (no shirt-pull/shoulder/aerial fouls, no persistent-contact model); cards not yet ported. Non-blocking for play coherence, blocking for season-ledger parity.
- **Offside:** judged from physical positions at the kick, whistled at the flagged receiver's first touch, FK to defenders at the flag spot. Deterministic offside and onside-control tests pass; organic volume 1–7/90 vs native ~6. (Simplification: only the called receiver is judged.)
- **Restarts:** throw-in/corner/goal-kick/kickoff/FK/penalty all authoritative football states with physical player resets; dead-ball placement is the only sanctioned discontinuity; 0 open-play continuity violations across every run. **Correction recorded:** an earlier "zero throw-ins" alarm was a counter artifact (placement skipped when the ball dies on the line, so the reason was never logged) — the trace shows ~114 throw-in restarts/90 (≈1.3/min, modestly above real ~0.5/min after the wide-clearance priors; those priors are football-plausible and measured-safe, but their original justification was partly the phantom counter — kept, with this honest note).

## 6. Possession ecology — PASS (kept at 90-minute scale)

Final 90-min matches (3 seeds + 3 re-run seeds after event-injection changes): flips 10.0–11.5/min, median spell 3.2–4.2 s, re-flip 0.45–0.48, ping-pong ~2.5/min, melee ~17.9/min, artifact flips a small minority, completion 0.635–0.663 (native 0.577), first-touch CLEAN 92–94%. Tactical environments differentiate as required: RELENTLESS press → least stable ecology (13.7 flips/min, 2.2 s spells); PASSIVE → most mature possession. No single-duration optimization anywhere.

## 7. Tactical + quality counterfactuals

Tactics: monotone instability/engagement gradients (§3) plus completion suppression under press. Quality: family-level attribute gradients all re-validated post-changes (dribbling 0→0.4 BEAT, tackling, reactions-as-containment, pace strengthened 0.22→0.44, finishing 0.09→0.21, GK reflexes 0.52→0.06, handling holds 0→0.67, reception ball-control monotone, stamina monotone). Match-aggregate 2×2 quality grid (15-min cells) shows the beats gradient (eliteVweak 6–8 vs weak cells 1–2) but flat completion — the established selection effect (better squads attempt more ambitious balls) plus short windows; and the §4 transition defect currently suppresses elite match-win expression. Classified PARTIAL at match aggregate, PASS at mechanism level.

## 8. Random integrity — PASS

No per-frame movement noise introduced anywhere. All randomness: cal11's KeyedRNG (decisions) + LabRNG keyed tags with per-tag ordinals (execution parameters only, fully audited). Determinism on the final build: same-seed identical 90-min traces, chunk-independence (verified at 30-min scale post-§2/§3), seed divergence. Matched-seed counterfactuals remained meaningful throughout (stamina CF's away-side control barely moved while home moved monotonically).

## 9. Long-run battery vs native (3 × 90 world-min, final build)

| metric | native (seed 1) | hybrid finals (3 seeds) |
|---|---|---|
| goals | 2 | 3 / 4 / 3 (total; **away-skewed — §4 defect**) |
| shots | 14 | 12 / 14 / 17 · dist mean 15–24 m |
| completion | 0.577 | 0.651–0.663 |
| possession flips | ~10/min (with recoveries) | 10.0–11.0/min |
| fouls / offsides | 21 / 6 | 2–3 / 2–4 |
| corners / throw-ins / goal kicks | — | 2–5 / ~114 / 8–11 |
| box entries | 46 | 43–74 |
| take-ons / tackles | 100 / 72 | 198–227 decisions / 271–282 challenge contacts (density-inflated; per-action outcomes calibrated) |
| BEAT windows | — | 17–21, t_rec ≈ 2–3 s |
| energy mean / min | 65.3 / 57.6 | 41–42 / 22–25 (1.8× workload + no halftime; accounting honest) |
| workload | — | 220–226 m/min median (≈1.8× real; cadence-class) |
| continuity violations | — | 0 |

Differences are explainable by the physical execution model and cal11's decision density — except the away-conversion asymmetry (§4).

## 10. Visual evidence

`integration/viewer_sequences.html` on **:8303** — deterministic 90-minute replay (seed 789335328, hash `967d02322b711056`) with **104 jump bookmarks**: buildup ×10, pressing ×10, take-on ×7, BEAT ×10, cross ×10, cutback ×5, shot ×10, goal ×3, foul ×2, offside ×3, throw-in ×10, corner ×5, free kick ×5, goal kick ×10, kickoff ×4. Evidence viewer only; no sprite/camera/art work done.

## 11. Final decision gate

1. **Structurally ready for production?** **Not yet — one repair short.** Substrate, seam, fatigue, defense hierarchy, ecology, events, determinism are production-shaped; the transition box-defense conversion asymmetry (and secondarily foul/card ledger volume) must close first.
2. **Brain-authoritative:** all action/target selection; tactics & instructions; challenge/press election; box-run/beaten/exploit authorizations (now event-triggered); foul-risk weighting; offside/restart semantics & shapes; ratings/xG/cards bookkeeping; substitutions/energy *consequences* (via `effective_attribute`).
3. **Body-authoritative:** all movement/travel; every flight, touch, race, duel resolution, save, rebound; possession states; workload telemetry (now the fatigue input); out-of-play geometry; goal detection.
4. **Across the seam:** brain→body: targets+activities (1 Hz + wakes), carrier intents with execution dispersions, defensive roles, restart shapes. Body→brain: mirrored state, wake events (RECEPTION/LOOSE/POSSESSION/DEFLECTION/HEAVY_TOUCH/PRESSURE/OUT/GOAL), workload telemetry, physical event candidates (foul contact, offside geometry, BEAT confirmation, penetration entries).
5. **Remaining regressions/defects:** transition box-defense over-conversion (blocker); foul volume 2–3 vs 21 & no cards (season-ledger blocker, play-safe); match-aggregate quality expression coupled to the blocker; workload 1.8× & flat tactical fatigue differentiation (deferred cal12-class cadence); no halftime recovery in lab; headers still ground-projected; throw-in rate modestly high.
6. **Next justified step: one more isolated repair workstream** — transition/rest-defense box protection + foul/card ledger volume — then re-run this battery. Not production integration yet; not rejection (every gate but one passed, and that one is precisely characterized).

Per the mandate's condition ("if and ONLY if all critical prerequisites pass"), the integration plan is intentionally **not** written.

**STOP.** Nothing merged, deployed, or created as cal12; live RC8 and the save byte-identical.

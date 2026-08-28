# TRANSITION / BOX-DEFENSE REPAIR + FOUL/CARD VOLUME — isolated prerequisite-repair workstream

**Date:** 2026-08-25 · **Status:** COMPLETE — stopped at the decision gate, as mandated.
Production frozen throughout and re-verified at close: engine `4d8ac52d864fcc6a…`, calibration `6fb2036c6cff41ed…`, players `14bbe398203d9ba6…`, save DB `b2092e4415533069…`, RC8 live-healthy. No integration, no cal12, no renderer change, no xG/finishing/scoring tuning anywhere. Final lab build: `hybrid.py d1b822a3ae8e3d5b`, `lab.py acfbdc896b8ce149`, `body.py 5577178f3d61eb46`.

**Frozen-reference proof:** `engine_lab.py` byte-verified as the frozen production engine (imports absolutized) + exactly one inserted lab-methods block (8,704 bytes, `1c6a3ef4445c4fc9`); prefix (275,511 B) and suffix (591 B) identical to production.

---

## 1. Reproduction and causal decomposition (before)

The three failing seeds reproduced hash-identically. All **8 away goals** were classified by terminal mechanism from contact-level forensics (`goal_forensic.py`):

| class | n | anatomy |
|---|---|---|
| **GK parries teammate back-pass toward own goal** | 1 | `gk_model` treated any ≥12 m/s arrival as a shot — including Bradley's back-pass |
| **GK catches, slides over his own line holding the ball** | 1 | the committed dive had no landing: ballistic velocity decayed 1.5%/tick, carrying keeper + held ball through the goal plane |
| **Defender's control cushion pushes ball over own line** | 1 | first-touch cushion followed `facing` even facing the goal from 1 m out |
| **Quick transition strikes** (0.4–1.1 s after winning a scramble ball) | 5 | legitimate football, conversion inflated by GK displacement from the same dive/parry defects |

**Category verdict (the A–L question):** the ~50% conversion was **I (goalkeeper mechanics) + micro-J (touch/dive physics)** — with contributions from the same displacement to the 5 "real" strikes. Rest defense was largely acquitted: 3–7 goal-side defenders were present in 7 of 8 goals (one true 0-defender counter, which *should* score). Categories A–H were measured and are not the cause.

## 2. Exact mechanisms changed (all causal; none touch xG/finishing/outcomes)

1. **Back-pass discrimination** (`gk_model`): a teammate's ball is gathered (<14 m/s) or beaten WIDE — never processed as a shot; the shot-response mover likewise never dives at teammate balls, but now **sweeps/collects** teammate balls running goalward (a first fix that merely disabled the mover produced a bounced-past-keeper own goal on a 40 m back-pass; replaced by sweeping).
2. **The dive lands**: ground friction after 0.45 s and a hard floor at the goal plane (keeper x clamped 0.15 m field-side); **catch = plant** (velocity ×0.2 at both catch sites). A held ball can no longer be carried in.
3. **Protective cushion** (`Body._cushion_dir`): within 14 m of one's own goal, a first touch facing goalward opens up wide instead of pushing along facing.
4. **Held-ball release side** fixed for the away keeper; **carry corridors clamped** away from one's own goal mouth (nobody dribbles into his own net on a brain target artifact).
5. **World-time beaten windows**: found during validation — the BEAT hook stamped `st_beaten_until` on the *engine clock*, which advances only in match flow; stale windows silently demoted the true presser (ENGAGE never reassigned) and inverted duels (TACKLED 0.86 with the "beaten" defender getting a structural-retreat head start). Fixed: windows tracked in world time, stale engine fields expired before role classification. Duels restored (BEAT 0.31/PART 0.26/TKL 0.42; dribbling/tackling/reactions monotone).
6. **Routing robustness** (kept as guards even where not the driver): defensive roles never apply to the ball controller, to players executing carrier actions, or to the team in possession; possession hysteresis (0.30 s) prevents role whiplash on one-tick control flickers.
7. **Fouls/cards**: measured root cause — elected challenges almost never miss in match flow (70 win / 13 poke / **0 miss** per 30 min; cal11 only elects lunges on exposed balls), so the miss-branch foul path was starved. Added the two missing *physical* channels: **desperation challenges from behind** by RECOVER-state defenders (election biased up by emergency, execution biased down by body position — the classic transition-stopping foul) and **through-the-carrier 50-50 contact** adjudication at reduced weight. One unified adjudicator: cal11-shaped logit, keyed draws, severity-based cards (from-behind, closing speed, badness, last-man) feeding **cal11's own `yellow_cards` caution term**; second yellow / last-man → red with brain send-off and the body leaving the field. No global multiplier anywhere.

**Rejected/non-driver variants (documented):** disabling the cushion (no effect on duels), disabling desperation (no effect), hysteresis alone (trajectory-identical — kept only as robustness), ENGAGE-only routing (diagnostic tool, not a fix).

## 3. Before/after transition anatomy

| | before (3 forensic matches) | after (10-seed battery) |
|---|---|---|
| counters against HOME per match | — | 12–26 (they exist — risk is real) |
| counter conversion | **~50%** | **~4%** (0.6 goals/match) |
| self-inflicted goal classes (parry-in / carry-in / cushion-in) | 3 of 8 goals | **eliminated** (all sampled goals SHOT-mechanism, incl. worst seed 1-4: five legitimate strikes, 2–7 defenders present, one from a clean tackle-won turnover) |
| HOME record | L, L, L | **W4 D2 L4** (15–17 aggregate) |

## 4. Tactical commitment gradients (§4-test)

CAUTIOUS/BALANCED/COMMIT (2 seeds × 30 min): attackers ahead of ball 2.4 → 2.3 → **2.8** (COMMIT commits ✓). Counters-conceded ordering is inside noise at this sample (6.0/5.5/3.0) — **no hidden safety net was added**, and none of the repairs pin players back: rest counts are tactic-driven and unchanged. Pressing (3-seed, earlier gate): opponent completion 0.700→0.640 monotone, challenges +10%, instability monotone across four intensities.

## 5. Quality gradients

- **Controlled 2×2 (30-min cells, final build):** eliteVweak **2-0** (shots 3-0, box entries 24) · weakVelite **0-1** · eliteVelite 1-1 (shots 5-2, box entries 30, beats 9) · weakVweak 0-2. Correctly signed where quality differs; a home/away *stylistic* asymmetry remains visible (the generics' direct game translates well to the physical world).
- **Attribute counterfactuals** (final build re-runs): dribbling 0→0.32 BEAT, tackling and reactions monotone, finishing 0.12→0.24, GK reflexes 0.52→0.06, GK handling holds 0→0.71, passing sweep monotone, stamina match-monotone. Pace's 1v1 cell is noise-band at n=50 (0.34/0.18/0.18) — flagged; pace remains monotone in through-ball races (gate B) and earlier sweeps.
- **Match aggregate (10 seeds):** HOME W4 D2 L4 vs native W8 D1 L0; away scores 1.7/match vs native 0.1. Elite shot **volume** is now the shortfall (6.7/match vs 22 native) while away converts efficiently on quick strikes. This is a real, honestly-reported PARTIAL — the inversion's *mechanisms* are gone, but elite chance-creation volume and away conversion balance are not yet where the quality gap says they should be.

## 6. Foul/card results

1.3 fouls/match (0–2) + occasional yellows (severity-based; cal11 caution loop live) vs native 8–21 + 0–5 cards. Direction restored, volume still low: desperation channel fires rarely because RECOVER windows are short and pursuit geometry rarely closes to 1.3 m from behind. **PARTIAL** — remaining honest gap: aerial/holding/shirt-pull contact classes have no physical trigger yet.

## 7. Regression gates (final build)

Micro-gates A–J **PASS** (re-run after every change). Ecology **PASS — best readings recorded**: flips 10.2/min, median spell 4.53 s, re-flip 0.433, ping-pong 62/30 min, loose 10.1/min, melee 17.2/min. Duels/shots/passes harnesses **PASS** (values above). Fatigue authority **PASS** (battery energy means ≈40–42 at 90 world-min, per the known 1.8× cadence workload; accounting honest). Offside/restart injection **PASS** (offsides 1–7/90; penalties/FKs/throw-ins/corners authoritative). Random integrity **PASS**: same-seed identical (`6b60dde9ad3440d7`), chunk-independent, seed-divergent; keyed/auditable streams only; no unseeded randomness introduced.

## 8. Decision gate

| prerequisite | verdict |
|---|---|
| Fatigue authority | **PASS** |
| Full-squad defensive ownership | **PASS** (stale-beaten defect found & fixed here) |
| Box defense + attacking occupation — **transition conversion blocker** | **PASS** (mechanisms eliminated; counters convert ~4%; risk preserved) |
| Match-level quality gradient | **PARTIAL** — controlled 2×2 correct; 10-seed record W4 D2 L4 with elite shot volume 6.7 vs native 22 and away 1.7 goals/match |
| Foul/card ledger volume | **PARTIAL** — 1.3/90 vs native 8–21; machinery correct, contact-trigger classes incomplete |
| Possession ecology | **PASS** |
| Tactical counterfactuals | **PASS** (commitment counter-ordering noise-level at n=2, no safety net added) |
| Attribute counterfactuals | **PASS** (pace 1v1 cell flagged as noise-band) |
| Random integrity | **PASS** |

**Final recommendation: NOT READY** — per the mandate's own rule ("if quality-gradient behavior remains partial, say so explicitly and stop rather than tuning until a metric turns green"). The original blocker — transition box-defense conversion — is repaired and verified causally. What remains is a *different, smaller* defect pair: elite chance-creation volume (likely coupled to the strengthened defensive hierarchy suppressing settled-attack shot windows — cal11's SHOOT elections are frozen and correct; the physical windows it waits for now open less often) and foul contact-class coverage. No integration plan is proposed.

**STOP.** Awaiting review.

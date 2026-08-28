# Shot-Choice cal6 Experiment — VERDICT: KEEP CAL5

Authorized repair experiment for the confirmed systemic shot-selection defect
(live case ea63cd2c4c6d). All candidate formulations were applied as runtime
source-patches in validation tooling; **engine.py was never modified**; the
hosted RC1 was never touched. Final state: cal5 football byte-identical to its
checkpoint (hashes verified), 74 core tests + parity green, live-case
reproduction still MATCH.

## 1–3. Baseline
cal5 frozen (engine f4bd3754… / calibration 50cc4900… / players e7f2cda3…);
74 core + parity + live-case reproduction green before and after. Exact
current SHOT utility verified in source:
`shoot_u = −2.72 + 3.65·xg + ST(+0.26) + 0.15·finishing_z` plus modifiers
(settled-probe shot term; CAUTIOUS −0.24/COMMIT +0.08; AMBITIOUS-vs-shell
cash-out up to +0.56·block (+0.12 VERTICAL); WIDE low-value malus; COUNTER
transition +0.10), softmax T=0.72 against PASS/CARRY/DRIBBLE/SHIELD/CLEAR.
Baseline probe: SHOT only out-ranks the advanced-zone alternative median
(−0.06) around xg ≈ 0.30–0.37; empirical cal5 selection is nearly flat
(2.3%/4%/7%/20%/32%/43% across ascending bands) — the defect in one line.

## 4. Candidate formulations (all monotone; §10-13 constraints respected)
| | base formula | mid (0.10) | top (0.30) |
|---|---|---|---|
| A_linear | −2.95 + 16·xg | 13% | 93% |
| B_twopiece | −3.06 + 26·min(xg,.10) + 10·max(0,xg−.10) | 34% | 89% |
| C_logistic | −2.95 + 2.9·σ((xg−.085)/.028) + 3.65·xg | 26% | 81% |
| D_package | −3.00 + 24·min(xg,.10) + 3·max(0,xg−.10) **+ stack damped 50–60%** | 30% | 52%* |
| E_midlift | cal5 + 1.35·σ((xg−.075)/.025) (top ≈ cal5) | 12%* | 45%* |
(*analytic; empirical values ran higher once tactical modifiers stacked.)

## 5–11. Results (live-case counterfactual + 50 seeds + 120-seed matrix each)
User-case improvements were real for every candidate (e.g. B: selection
34%/87% in the 0.05–0.10/0.10–0.20 bands, inversion pairs −57%, long-shot
share 49%→36%, the exact match becomes 0–2 with a sane shot mix; junk <0.02
selection unchanged ~2.4% in all candidates — no shoot-on-sight at the low
end; finishing differentiation preserved and consequential; pressure flows
through xg as designed).

**But every candidate broke the canonical matrix** (120 matched seeds vs cal5):

| aggressive_vs_ultra xG | aggressive_vs_aggressive xG | balanced |
|---|---|---|
| cal5 2.93 · A 9.67 · B 10.16 · C 9.84 · D 7.94 · E 7.16 | cal5 3.60 · A 11.96 · B 13.39 · C 12.43 · D 10.43 · E 8.75 | 1.00 → 1.49–1.92 |

Aggressive ecologies inflate +144–272% under every formulation — 49–79
shots/match, transition xG ×3–5, goals up to 7.7/match. Ultra stays dead and
the quality gradient survives in all candidates, but §25–§28 fail decisively.

## 12. Diagnosis — why no SHOT-only repair can work (§44)
The dose-response is nearly flat across radically different curves because the
explosion is not caused by the curve's shape; it is caused by what any
responsive curve reveals:
1. **Candidate-supply density**: aggressive/transition/siege ecologies
   mass-produce 0.10–0.35 xg shot-moments (counters, rebounds, second phases).
   cal5's flat selector declined 57–80% of them, and that suppression is
   **load-bearing** for the entire accepted cal3–cal5 ecology — unshot
   possessions continue into the recycling/second-phase/pressing economy that
   every prior phase validated.
2. **The tactical shot-bonus stack** (AMBITIOUS cash-out, probe term, COUNTER)
   was sized to compensate the dead base; on any live curve it double-counts
   (E's analytically flat top ran at 81–85% empirically). Damping it 50–60%
   (candidate D) recovered only ~25% of the explosion.
3. **Rebound cascades**: elevated top-band selection converts every parry into
   another elevated-selection candidate; monotonicity (§9, correctly required)
   forbids capping the top below the mid.
Fixing the ranking by raising SHOT is volume-explosive; the other half of the
mis-ranking — CARRY's ≈0 advanced-zone baseline with a 61% advanced share and
5.8 carries per box possession — cannot be touched under this experiment's
correct §6 scoping.

## 13–17. Verdict and required next design
**KEEP CAL5.** No formulation satisfies §36's ten criteria simultaneously; per
§44 this defect requires a broader action-choice redesign, co-designing:
(a) the SHOT base curve (a B/C-like mid response is the right shape);
(b) the advanced-zone CARRY baseline (repetition/diminishing value for
    consecutive carries in the final third — lowering the alternative fixes
    the same ranking ratio *without* multiplying shot volume);
(c) the legacy tactical shot-bonus stack (rescaled as part of, not after,
    the curve change);
(d) rebound-refire moderation (the instant re-shot loop);
with matrix identities re-accepted as a package, under the same guardrails,
instrumentation, and matched-seed discipline used here. Evidence base:
`validation/forensics/{cal6_experiment.py, cal6_run.py, cal6_matrix.py,
cal6_compare.py, cal6_multiseed.json, cal6_matrix_*.json}`.

## 18–20. Final state
No calibration bump (cal5 retained). No deployment change (RC1 untouched,
still serving the live test). Football-freeze proof: engine/calibration/
players hashes identical to `v0.7-cal5-pre-rc-20260822`; 74 core tests PASS;
run-vs-advance parity PASS; live-case reproduction MATCH.

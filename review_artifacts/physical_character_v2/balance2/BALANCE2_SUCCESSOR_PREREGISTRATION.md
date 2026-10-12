# BALANCE-2 successor C2: preregistration (§13, §14, §17, §18)

**Status.** Frozen (`BALANCE2_FREEZE_C2.json`) before C2 is run on the frozen matched battery B2M. B2M (`BALANCE2_FREEZE_B2M.json`) is unchanged and still verifies. So do BALANCE-1 and M1b.

**Order** (`BALANCE2_MATCHED_CRITERIA.md` §6):
1. The unchanged BALANCE-1 B was evaluated on B2M first: 16 / 17, failing P8 only (AP overshoot back small 0.609, back moderate 0.490, fwd small 0.284; limit ≤ 0.26). See `evidence/B2M_V_BALANCE1_B.json`.
2. The audit's decision gate (§10: C triggered, §13) permits a successor for the diagnosed C defects only, preregistered after the B2M freeze and not tuned on it.

## 1. What C2 is

C2 is `successor/b2_ctrl.mjs` `SuccessorController` with `successor/params/C2.json`.
- It extends the frozen `balance1/scripts/b1_ctrl.mjs` (imported, unmodified).
- Its output is still excitation through canonical M1b. There is no torque command, stepping, collision logic or outcome-specific logic, and no anatomy, stance or foot change. M1b and the criteria are unchanged.

| # | Mechanism (§13 class) | Parameter | Provenance |
|---|---|---|---|
| 1 | AP COM integral confined to the quiet-standing regime: integrate inside, hold outside (anti-windup / command decay) | band 10.6 mm; kI 0.17 s⁻¹ unchanged | 2.58 × 4.1 mm, human quiet-stance COM AP RMS (Foulger 2025) [M→E] |
| 2 | AP prediction (B's existing internal model, enabled for AP) with a support-aware developed-force bound (prediction) | support front 64.8 mm, back 124.76 mm from the entry COM | `B2_GEOMETRY.json` [M]; consistent with Kim 2009 maximum allowable flat-foot ankle torque (90.9 vs 93.2 ± 12.8 N·m) |
| 3 | Direction-specific contraction constants in the AP efference copy (prediction, calibrated body model) | PF τ 146.7 / 54.2 ms; DF τ 88.8 / 95.3 ms | canonical `MUSCLE_GROUPS` [E] |

**Everything else is BALANCE-1 B:** delays, channels, gains, groups, knee, support symmetry, posture, ML prediction, motor noise and seed.

**The rigid-toe support limitation is not compensated.**
- Mechanism 2 uses the flat-foot support exactly as the body has it.
- C2 adds no capacity-seeking term.
- Any change in forward capacity comes from the internal model no longer under-commanding near the edge (development D3), and it is judged against T1′'s upper bounds.

## 2. What the successor does NOT contain, and why (development log D5–D7)

**The ankle → hip transition.** Four evidence-grounded implementations were tested on the development set: ankle cap + HAT set-point; cap only; transfer only; direct hip-flexor transfer (plus an opposite-sign diagnostic). Every one either lowered forward no-step capacity (to 11.95–12.89 N·s at 100 ms, from 16.64) or degraded the near-limit response. **None is adopted.** The near-limit symptoms attributed to its absence (wind-up, the 2.4 s forefoot perch, the unbraked descent, the 70 % overshoot) are addressed by mechanisms 1 and 2 on DEV.

**The HAT lean map defect (latent BALANCE-1 finding, D6).**
- BALANCE-1's HAT map at the hips is ≈ 0 in AP, so its declared trunk-lean loop is inactive about the hips.
- The corrected map with the declared gains worsens AP overshoot. **Not adopted**: making it work would need new trunk gains.
- Put to the owner.

**Rigid-rotation COM map (D7):** negligible effect. Not adopted.

## 3. Development evidence and predicted B2M outcome

DEV is disjoint from B2M (100 ms pulses, other magnitudes; `scripts/b2_dev.mjs`, `successor/dev/`).

| DEV | B | C2 |
|---|---|---|
| fwd 5 / 10 overshoot | 0.29 / 0.23 | 0.045 / 0.00 |
| back 6 / 12 overshoot | 0.60 / 0.48 | 0.31 / 0.22 |
| left 12 overshoot | 0.05 | 0.05 |
| fwd 12 N·s (50 ms) | not settled, overshoot 0.70 | recovered 1.95 s, overshoot 0.00 |
| thr fwd / back (100 ms) | 14.77 / 18.84 | 16.64 / 19.97 |
| quiet COM RMS AP (20 s) | 1.13 mm | 1.74 mm |

**Prediction, stated before the run.** C2 passes U1–U6, P1–P7, M1′, T1′ and DET. On P8 the forward and lateral runs and backward moderate (≈ 0.22) pass. **Backward small is expected near or above 0.26 (DEV 0.31): a likely P8 fail**, from the body-side post-push offset (D8).

## 4. Evaluation (all frozen now)

| Item | Script | What |
|---|---|---|
| Qualification | `scripts/b2_qualify.mjs` + `criteria/b2_eval.mjs` (B2M, unchanged) | 17 criteria on C2 |
| Causality re-audit (§14) | B2M P5 (16 pushes) **and** `scripts/b2_causality.mjs` | C1: every logged observation index = n − channel delay. C2: commands bit-identical to the twin through onset + the shortest delay. C3: the successor's new internal state (AP integral term, quiet-band gate, internal-model AP force history) bit-identical to the twin until onset + 1 + the AP COM channel delay. Run on BALANCE-1 B (tool validation, PASS) and C2 |
| Genuine failure / superhuman (§15) | B2M T in four directions with T1′ upper bounds; P3 over-limit falls in every direction; P7 torque slew | |
| Four-system battery (§17) | B2M on CURRENT V2 and S2 + P2 (`scripts/b2_compare.mjs`, outcome criteria by the frozen formulas); on M1b + BALANCE-1 B and M1b + C2 by `b2_qualify.mjs` | Same battery and recovery definitions |
| Review clips (§18) | `render/b2_save_runs.mjs` → PPR-3 clip prep → PPR-3 capture | Seven scenarios (quiet; small fwd 4.82; 12 N·s fwd; matched moderate back 11.69; matched moderate lateral 15.0; near-limit fwd 14.0; unrecoverable fwd 21.5) × four systems, at 1× and slow motion. Presentation only: **nothing is tuned from the clips**, and metric failures are not overridden by appearance |

## 5. Decision rules (frozen)

**Adoption.** C2 replaces BALANCE-1 B as the balance controller **iff** all of the following hold:
- C2 fails no B2M criterion that B passes;
- the causality re-audit passes;
- either C2 passes strictly more B2M criteria, or the same number with a lower worst AP small / moderate overshoot fraction than B (0.609).

Otherwise B remains.

**RECIPIENT STATUS** for the adopted system:

| Status | Condition |
|---|---|
| **A. Qualified for out-of-sample PVP validation** | 17 / 17 on B2M, causality passes, no superhuman indicator (T1′ upper bounds, P3, P7), and the review clips do not contradict the metrics |
| **B. Promising, specific balance gap remains** | Every failure lies in the diagnosed C defect class (AP overshoot, P8) and everything else passes, including causality |
| **C. Body / stance architecture decision required** | A failure is attributable to the support representation or stance (e.g. T1′ forward outside its band because of the flat-foot support) |
| **D. Controller architecture decision required** | A failure needs a mechanism the frozen architecture cannot provide, or causality fails |

**Owner items reported but not used to set the status:**
- the absent hip strategy (§2);
- the HAT-map defect (§2);
- the support-representation decision (`BALANCE2_AUDIT.md` §4, §10 G).

## 6. Disclosures

- C2 was designed after B's B2M result was known. That result identified P8 as the gap, as the audit had predicted.
- No successor variant was run on B2M before this freeze. Every design decision is in `successor/C2_DESIGN_LOG.md` with its DEV evidence.
- B2M's backward moderate magnitude is 11.69 N·s in the frozen script (0.65 × 17.98 = 11.687, rounded by `r2`). `BALANCE2_MATCHED_CRITERIA.md` writes 11.68. The script value is the one run, for every system.
- `b2_ctrl.mjs` keeps the non-adopted mechanisms as options that are OFF in C2, so the design log stays reproducible.

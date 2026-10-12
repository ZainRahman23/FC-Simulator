# BALANCE-2 flat-sole forward criterion (B2F): audit and preregistration

**Status.**
- Frozen in `BALANCE2_FREEZE_B2F.json` before the corrected criterion is applied to any candidate.
- Preserved unchanged as historical evidence: B2M (`BALANCE2_MATCHED_CRITERIA.md`, `criteria/b2_eval.mjs`) and C3's original B2M result (15 / 17, `evidence/B2M_V_BALANCE2_C3.json`).

**Instruction** (`sources/2026-10-12_user_instruction_balance2_flat_sole_criterion_p8.md`):
- the rigid flat foot is retained;
- the T1′ forward criterion appears inconsistent with the decision that boot-tip support is not legitimate;
- audit it, and if the derivation holds, preregister a corrected criterion at the loadable ≈ 80.3 mm edge;
- this is a criterion correction, not permission to tune C3.

## 1. Audit of the B2M forward derivation

**The formula** (`BALANCE2_MATCHED_CRITERIA.md` §2): T = f · m · ω0 · d · 1.081.
- f is a human duration-corrected fraction.
- m · ω0 · d is the body's zero-delay no-step limit.
- 1.081 is the 50 ms pulse factor.

**How the human fraction f was normalised** (`research/BALANCE2_FORWARD_REFERENCE_LITERATURE.md` §4.1–4.2). Each study's threshold was divided by the zero-delay limit of its own subjects at d = the edge of the support those subjects could actually load:
- Robert 2018's measured dynamic COP reach (CoPmax 0.153 m, toe rise), giving f = 0.60;
- or the anatomical COM-to-toe-tip distance (145–185 mm), giving f = 0.50–0.64;
- Crenshaw & Kaufman 2014: 0.42–0.62 (0.50–0.58 at the scaled CoPmax);
- Robert's long pulls: 0.69–0.70.
- The adopted range is **f = 0.50–0.70, central 0.57**.

So f answers one question: what fraction of the support you can load do humans manage in a 50 ms "try not to step" push?

**What B2M used for the fixture.**
- d = 102.95 mm, the BALANCE-1 battery edge.
- That edge is the front of the convex hull of sole contact points within 5 mm of the turf at the settled entry (`ppr3_battery.bos`).
- On the rigid F0 boot, the 5 mm hull reaches 163.2 mm along the foot axis, which is onto the raised toe spring. The loaded flat sole ends at the oblique MTP break, 140.3 mm along at MTP1 (`evidence/B2_GEOMETRY.json`: `hullFrontAtHeight`, `contactAlong`).
- The criteria document itself names this edge "the boot rocker, reached by pitching". Reaching it needs ≈ 9–10° of whole-boot pitch onto the tip (`BALANCE2_AUDIT.md` §4; `scripts/c3_support.mjs` tool check: B and C2 load the tip from 6.5–7.4° of heel lift).

**Finding: the derivation holds, and B2M is internally inconsistent with the owner's decision.**
- The human fraction is normalised to support the subject can legitimately load.
- B2M normalised the fixture to an edge reachable only through rigid boot-tip support, which the owner has ruled out.
- For a body whose legitimate support is the flat sole, the consistent normaliser is the loadable flat-sole front edge.
- **Consequence:** the B2M forward band demanded about 1.28 × the matched capacity of the legitimate support. Only boot-tip support could meet that, which is what B and C2 did (`evidence/C3_LEGIT_TOOLCHECK_ON_B1.json`, `C3_LEGIT_TOOLCHECK_ON_C2.json`).

## 2. Corrected derivation [E]

| Quantity | Value | Basis |
|---|---|---|
| m | 73.91 kg | V2 spec, unchanged |
| ω0 | 3.1639 s⁻¹ | √(g / 0.97997 m), settled COM height, `B2_GEOMETRY.json`, unchanged |
| 50 ms factor | 1.0812 | u / (1 − e^(−u)), u = ω0 · 0.05, unchanged |
| **d_fwd** | **80.29 mm** | The settled entry's loadable flat-sole front edge. Same entry, run and time (battery protocol, t = 2 s, with noise) as B2M's 102.95 mm, but only loaded contact points (λ > 0) are counted. It is the larger world-x of the two feet's loaded fronts minus the COM x. Both feet's MTP1 corners sit at 140.3 mm along the foot axis. With both soles flat, the two-foot loaded hull's front edge joins those corners, so it is the furthest forward the total ground reaction can act without boot-tip support (`B2_GEOMETRY.json` `distancesMm.comToLoadedFront`) |
| Zero-delay limit at d_fwd (50 ms) | 73.91 · 3.1639 · 0.08029 · 1.0812 = **20.30 N·s** | |
| Central threshold (f = 0.57) | **11.57 N·s** | |
| **Corrected T1′ forward band** (f = 0.50–0.70) | **[10.15, 14.21] N·s** | |

The result equals the sensitivity value disclosed in `BALANCE2_MATCHED_CRITERIA.md` §2 ("at d = 80.3 mm … T would be 11.6 N·s") and in the C3 report (10.15–14.21). It is derived here from the formula and the frozen geometry, not copied from those documents.

**Backward:** d_back = 124.76 mm, the heel edge. The heel edge is the back of the loadable flat sole and is not boot-tip support, so the backward band [15.77, 22.08] stays unchanged.

**Lateral:** unchanged, [21.8, 49.8].

## 3. Uncertainty

| Source | Range | Effect on the forward band |
|---|---|---|
| **Human fraction f** | 0.50–0.70 (central 0.57). Robert's per-subject spread is ≈ ±16 % (1 SD) | This **is** the band. It dominates the uncertainty |
| f at short pulses | Robert's 150 ms point sits ≈ 14 % below his 300–1000 ms plateau. Humans do worse at short pulses than the LIP duration model predicts | If applied, the human 50 ms fraction would be lower, moving the band down. Not applied, the same as in B2M |
| d measurement | 80.29 mm (with noise, t = 2 s) vs 80.70 noise-free (+0.5 %) vs 79.77 from the spec's MTP1 landmark (−0.6 %). Quiet COM sway RMS 1.38 mm (±1.7 %) | ±0.1–0.25 N·s at the band edges |
| **Which edge** | 80.29 mm, the geometric loadable front (MTP1 corners), vs 64.8 mm, the oblique MTP-line midpoint. 64.8 is where a foot whose COP is centred across its width begins to pivot; it is the ≈ 65 mm COP plateau measured with the existing controllers, and C3's envelope | At 64.8 mm the band would be [8.19, 11.47] |
| ω0 | ±1.5 % (COM height) | ±0.2 N·s |
| Duration factor | LIP model, shared with B2M | — |

**Why 80.29 mm and not 64.8 mm.**
- The human f is normalised to each subject's geometric, loadable edge (toe tip or measured maximum COP reach). It is not normalised to a strategy-dependent COP plateau.
- On V2's rigid flat foot, whether the COP reaches the MTP1 corners depends on ankle inversion / eversion use. That is **controller capability**, not body capability.
- The corrected criterion therefore measures the controller against what the **body** legitimately offers. A controller that uses less, as C3 does with its 64.8 mm envelope, is judged against the body's full flat-sole capability, not against its own self-limitation.

**Combined.** The d-measurement and ω0 uncertainties together shift the band by under ±0.3 N·s. The band width comes from the human f.

## 4. What changes and what does not

**Changes:** only the T1′ forward band, [13.01, 18.22] → [10.15, 14.21] N·s (`criteria/b2f_eval.mjs`, which imports `criteria/b2_eval.mjs` unchanged and overrides T1 only).

**Unchanged:**
- the battery: `scripts/b2_qualify.mjs` B2M, same runs and magnitudes;
- U, D, the backward and lateral bands;
- the fall rule and its edges, which still use the frozen 102.95 mm static edge, as the owner instructed;
- the threshold bisection search range;
- every other criterion, including P1, P2, P3, P4′, P5–P7, P8, M1′ and DET.

**Disclosed and deliberately not changed.** B2M's forward push levels (small 4.82, moderate 9.64, limit 14.83, over 21.50) and the forward M1′ push (10.58 N·s / 367 ms) were also derived from d = 102.95 mm.
- Re-derived at 80.29 mm they would be 3.76 / 7.52 / 11.57 / 16.78 and 8.25 N·s.
- They are kept at the B2M values for three reasons:
  - they are **more** demanding for this body than flat-sole-matched levels (moderate = 0.83 instead of 0.65 of the corrected matched threshold; M1′ = 0.33 instead of 0.26 of the flat-sole limit);
  - so keeping them cannot make any candidate easier to qualify;
  - M1′'s peak band [24, 120] mm predates the matching, has no documented derivation, and could not be rescaled consistently.
- The full rescale is recorded here as a disclosed alternative and is not used.

## 5. Application plan (frozen)

1. Run C3 completely unchanged on B2M (`scripts/b2_qualify.mjs`, the same command as `evidence/B2M_Q_BALANCE2_C3.json`) → `evidence/B2F_Q_BALANCE2_C3.json`.
   - **Determinism check:** every run's final hash must equal the original B2M evidence.
2. Evaluate with `criteria/b2f_eval.mjs` → `evidence/B2F_V_BALANCE2_C3.json`.
3. Legitimacy: the evidence is unchanged from `evidence/C3_LEGIT_BALANCE2_C3.json` (same runs). L1 and L2 still apply.
4. **Prediction, stated before applying.**
   - C3's forward threshold is 12.09 N·s (the same deterministic bisection), inside [10.15, 14.21], so T1′ passes.
   - P8 still fails (backward small 0.287).
   - **B2F: 16 / 17, failing P8 only.**

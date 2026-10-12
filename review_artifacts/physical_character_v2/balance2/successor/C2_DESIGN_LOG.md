# BALANCE-2 successor C2: design log (development set only)

**Status.** Everything here ran on the development set DEV (`scripts/b2_dev.mjs`) before the successor preregistration and freeze. No successor variant was run on the frozen matched battery B2M during development.

## DEV, disjoint from B2M

| | B2M (frozen) | DEV |
|---|---|---|
| Pulse | 50 ms | **100 ms** (24 steps) |
| Forward | 4.82 / 9.64 / 14.83 / 21.50 N·s | 5 / 10 N·s |
| Backward | 5.84 / 11.69 / 17.98 / 26.07 N·s | 6 / 12 N·s |
| Lateral | 7.5 / 15 / 23 / 32.5 N·s | left 12 N·s |
| Near-limit forward | — | fwd 12 N·s at 50 ms: the audit's C-diagnosis case (BALANCE-1 moderate; `BALANCE2_AUDIT.md` §6), already exposed |
| Superhuman guards | T in four directions (50 ms) | forward and backward bisection at 100 ms; 20 s quiet standing |

The protocol is otherwise identical: SOLO, PPR-3 entry, onset step 480, 4 s window, undisturbed twin, frozen recovery rule.

All DEV results are in `dev/DEV_*.json`; the summary is `dev/DEV_SUMMARY.json`.

**Starting point.** BALANCE-1 B was already evaluated on B2M (`evidence/B2M_V_BALANCE1_B.json`): 16 / 17, failing P8 only (AP overshoot back 0.61 / 0.49, forward small 0.28; limit ≤ 0.26).

## D1. What causes the AP overshoot? Diagnostic ablations of B (not candidates)

| Variant | fwd 5 | fwd 10 | back 6 | back 12 | left 12 | fwd 12 @ 50 ms | fwd thr (100 ms) |
|---|---|---|---|---|---|---|---|
| B | os 0.29 | 0.23 | **0.60** | **0.48** | 0.05 | not settled, os 0.70 | 14.77 |
| AP + ML COM integral off | 0.07 | 0.01 | 0.40 | 0.30 | **left not settled** | os 0.20, peak 78 | — |
| AP prediction on | 0.20 | 0.18 | 0.50 | 0.41 (not settled) | 0.05 | os 0.29, peak 55 | — |
| Orientation-group integrals off | 0.28 | 0.22 | 0.61 | 0.49 | 0.03 | 0.68 | — |

**Reading.**
- The COM integral drives most of the forward overshoot. It winds up during the excursion: about 2 N, which equals a ≈ 4 mm offset on the ≈ 500 N/m net stiffness.
- The ML integral is needed: without it the lateral push does not settle. So any integral change is AP-only.
- The remainder (backward) is delay-limited braking: 100 ms COM channel plus muscle lag, and B has no AP prediction. This is the audit's §6 "bad state estimation: partly".

## D2. Mechanism 1: AP integral confined to the quiet-standing band

**Rule.** The AP COM integral (BALANCE-1 kI 0.17 s⁻¹, unchanged) integrates only while the AP error is within ±10.6 mm, and holds outside.
- 10.6 mm = 2.58 × 4.1 mm: the 99 % range of human quiet-stance COM AP excursion (Foulger 2025 COM RMS 4.1–4.3 mm; lower end).
- Purpose: drift correction stays; transient excursions and the near-limit hold no longer wind it up (anti-windup, §13 "command decay / momentum regulation").

| | fwd 5 | fwd 10 | back 6 | back 12 | left 12 | fwd 12 | fwd thr |
|---|---|---|---|---|---|---|---|
| Wrapper identity (band ∞) | = B exactly | | | | | | |
| Gate | 0.09 | 0.03 | 0.42 | 0.30 | 0.05 | not settled, os 0.13 | — |

## D3. Mechanism 2: AP prediction, made support-aware

**Plain AP prediction on top of the gate:**
- the forward 12 N·s case recovers with zero overshoot (peak 55 mm, settled 2.18 s);
- but the forward threshold drops to **12.42 N·s** (100 ms), which projects below the matched band.

**Cause.**
- The internal model assumes its commanded force is delivered.
- Near the forefoot edge the COP is pinned, so the model predicts a deceleration that is not happening, and the command backs off.

**Fix within the same mechanism (body schema).**
- The modelled developed AP force is bounded by what the support transmits at the propagated offset: the COP shift (F + K_i·x)/(M·g/h) stays within [−124.76, +64.8] mm of the entry COM.
- **Functional support** (`B2_GEOMETRY.json`): front 64.8 mm = mean of COM→MTP1 79.8 and COM→MTP5 49.9 (the oblique flat-foot pivot line; the §6 COP plateau is ≈ 65 mm); back = heel edge 124.76 mm.
- **Check:** the implied maximum ankle moment, 90.9 N·m, matches Kim et al. 2009's measured maximum allowable flat-foot ankle torque, 0.073 × BW × H = 93.2 ± 12.8 N·m.
- **The command itself is not capped.** See D5 for why capping is wrong.

| V3 = gate + support-aware prediction | fwd 5 | fwd 10 | back 6 | back 12 | left 12 | fwd 12 | fwd thr |
|---|---|---|---|---|---|---|---|
| | 0.04 | 0.00 | 0.36 | 0.25 | 0.05 | **recovered, 1.93 s, os 0.00** | **16.64** |

## D4. Mechanism 3: direction-specific contraction constants in the AP efference copy

**Rule.** B's AP model used the plantarflexor constants (τ rise 146.7 / fall 54.2 ms) in both directions. Dorsiflexion-direction force is now modelled with the canonical dorsiflexor group (rise 88.8 / fall 95.3 ms), selected by the sign of the modelled activation. This calibrates a known body model; it changes no gain.

| V4 = V3 + direction-specific constants | fwd 5 | fwd 10 | back 6 | back 12 | left 12 | fwd 12 | fwd thr | back thr | quiet COM RMS AP |
|---|---|---|---|---|---|---|---|---|---|
| | 0.045 | 0.00 | **0.31** | 0.22 | 0.05 | recovered 1.95 s, os 0.00 | 16.64 | 19.97 | 1.74 mm |

## D5. The ankle → hip transition: four implementations, none adopted

The instruction and the audit (§6, §10 C) ask for a near-limit ankle → hip transition. Each implementation below was tested once on DEV, on top of V4, and grounded in evidence:
- Kuo & Zajac 1993: the flat-foot ankle constraint;
- Runge 1999: hip-flexor torque added to ankle plantarflexor torque in fast translations;
- Park, Horak & Kuo 2004: hip gains rise with perturbation size.

| Variant | Rule | Result vs V4 |
|---|---|---|
| V5 | Ankle share of the COM command capped at the support limit; unmet moment → HAT lean set-point shift (≤ 20°) | **12 N·s FALLS**; fwd thr **11.95** |
| V5cap | Ankle cap only | 12 N·s **FALLS**; thr 11.95. **The cap is the destabiliser:** the command must lead the developed force to overcome muscle lag, so capping the command removes force the support could still transmit |
| V5xfer | HAT set-point transfer only | ≈ V4. Diagnosis: the transfer had almost no effect, see D6 |
| V10 | Direct transfer: unmet ankle moment (excess × h_COM) as hip torque toward the push (the human hip-flexor pattern), lean-bounded | fwd thr **12.89**; fwd 10 and fwd 12 **not settled** |
| V10neg (diagnostic) | The same with the opposite sign (trunk counter-leans) | thr 17.11 but 12 N·s peak 65 mm, not settled |

**Conclusion.**
- On this body and this frozen architecture, every evidence-grounded hip transfer either lowers forward no-step capacity (V5, V10: leaning the HAT toward the push moves the COM forward faster than its shear helps) or degrades the near-limit response (V10neg).
- **No ankle → hip transition is adopted.**
- The near-limit symptoms the audit attributed to its absence are addressed differently. With the support-aware internal model (V4), the 12 N·s case no longer winds up, no longer perches for 2.4 s, descends braked and settles at 1.95 s with zero overshoot.
- Whether V2 needs a genuine hip strategy (which would require the D6 HAT-map redesign and new trunk-loop gains) is put to the owner.

## D6. Finding: BALANCE-1's HAT lean loop is inactive about the hips in AP (latent BALANCE-1 defect)

**The defect.**
- The HAT gravity-load map at the hips (AP column) is **3.4 / 0.9 N·m/m**, where about −m_HAT·g/2 = −217 N·m/m per hip is expected.
- **Cause:** `b1_ctrl.mjs` builds each group's map by *translating* the group's bodies. For the HAT this includes the pelvis, which carries the hip joint centres, so the HAT COM's lever about the hips does not change.
- The trunk / upper / head maps are correct (−353.7 / −236.7 / −49.7 ≈ −m·g). The HAT ML column is correct.
- **Consequence:** in BALANCE-1 B, the declared HAT lean objective (kP 1.3, kD 0.45 s, kI 0.17 s⁻¹) contributes almost nothing at the hips in AP. Hip AP torque comes from the COM map's static hip rows.

**The corrected map** (`p.b2.hatMap = "pivot"`: HAT rotated about the fixed hip axis) gives −222.2 / −217.8 N·m/m. With the same declared gains:

| Variant | fwd 5 | fwd 10 | back 6 | back 12 | fwd 12 | thr |
|---|---|---|---|---|---|---|
| B + corrected map | 0.42 | 0.31 | **0.76** | 0.66 (not settled) | not settled | — |
| V4 + corrected map (V7) | 0.17 | not settled | 0.44 | not settled | recovered | 16.17 |

**Not adopted.** Activating the trunk-lean loop with the gains BALANCE-1 declared (but never effectively used in AP) worsens AP overshoot everywhere. Making it work would mean choosing new trunk-loop gains, which is a gain search §13 excludes. Reported to the owner as a latent BALANCE-1 defect.

## D7. Rigid-rotation COM map (ankle eigenmovement)

**Rule.** Hip / knee rows with rigid-rotation-about-the-ankle proportions (height-weighted; normalised to the same ankle torque): hips −0.105 → −0.126, knees 0.273 → 0.291. Ankle rows unchanged.

**Result** (V9, on V4): back 6: 0.30, back 12: 0.26, fwd thr 17.11. Negligible or mixed. **Not adopted.**

## D8. The residual backward overshoot (V4 back 6: 0.31)

**What it is.**
- After the backward push the COM returns and then sits 2–5 mm *forward* of the twin for seconds, with a ±1.5 mm ripple at ~1.7 Hz.
- The overshoot metric takes the most-forward point of that offset (5.3 mm on a 17.0 mm peak).

**Diagnostic ablations on V4:**

| Removed | back 6 | back 12 |
|---|---|---|
| Orientation-group integrals | 0.33 | 0.27 |
| Head integral | 0.31 | 0.22 |
| Support-symmetry integral | 0.31 | 0.22 |
| Motor noise | 0.35 | 0.24 |

None removes it. The offset is body-side: M1b's history-dependent muscle state shifts the post-push equilibrium, and the quiet-band AP integral removes it slowly at the declared kI. It is not a diagnosed control defect, and compensating for it would be tuning. **Accepted and disclosed.** On B2M's backward small push, C2 is therefore expected to sit near or above the P8 limit (prediction in the preregistration).

## D9. Decision

**C2 = V4:**
1. AP integral confined to the quiet-standing band.
2. AP prediction with a support-aware internal model.
3. Direction-specific contraction constants in the AP efference copy.

All other parameters are BALANCE-1 B. Not adopted: the ankle cap; every hip transfer; the corrected HAT map; the rigid COM map. They remain in `b2_ctrl.mjs` as switchable options that are OFF in `params/C2.json`, so the log stays reproducible.

**Verification.** `params/C2.json` reproduces V4 exactly (`dev/DEV_C2_FROM_FILE.json`).

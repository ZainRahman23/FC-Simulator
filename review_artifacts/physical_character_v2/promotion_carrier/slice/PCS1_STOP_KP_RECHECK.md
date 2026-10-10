# PCS-1: STOPPED at the promotion-frame re-check (preregistered stop). No carrier run was made.

**Date:** 10 Oct 2026.

**Protocol:** `PCS1_PREREG.md` (frozen 8585adc), §1 and §5. Rule: "the k_p re-check mismatches: stop before any carrier run."

**Sources:** `../../sources/2026-10-10_user_approval_carrier_slice.md` (2c39acf).

## 1. What happened

The harness (`scripts/pcs1_run.mjs`) re-derives the promotion frame by the D-5 rule: the latest frame passing the **full** REV2 handoff gate HG, with HG-A v2, and a lead of ≥ 6 ticks.

| case | preregistered k_p | re-derived k_p | result |
|---|---|---|---|
| rx_miss | 47 | 47 | match |
| rx_free_leg | 39 | **none** | mismatch → stop |
| rx_planted_leg | 38 | **none** | mismatch → stop |

Frames 39 and 38 fail one REV2 handoff row, **HG-T** ("the tackler's slide leg is at full extension at k_p"). The two-segment rigid stand-in AST-1 is built from the k_p primitives and cannot extend. Promoting while the slide leg is still extending would give the physical tackler a shorter leg than the simulation's (blocker B3 in the moving-handoff report).

## 2. Cause: my error in the investigation

- **Where the frames came from.** `PROMOTION_CARRIER_INVESTIGATION.md` §6.2 / §6.3 and the PCS-1 preregistration table took the frames from `locomotion_continuity/evidence/valid_on_rx.json`.
- **What that file means by "valid".** It is produced by `lc_valid.mjs`, a copy of the moving-handoff `hg_valid_frames.mjs`. That tool records HG-T **separately** and does not count it in "valid" (its header: "HG-T recorded separately").
- **The wrong claim.** The investigation said these frames "pass the full REV2 handoff gate". That was wrong for rx_free_leg and rx_planted_leg.
- **The record already said so.** The moving-handoff report states it explicitly: "The latest valid frame (HG-T included) comes 1 – 11.5 ticks before contact … Without HG-T: 4.25 – 21.75 ticks (rx_planted_leg 21.75)."
- **The check worked as intended.** The preregistered re-check caught the error before any carrier physics ran.

## 3. What ran (all read-only or non-carrier)

| item | result |
|---|---|
| K0 (law provider vs the recorded `simBody`, rows k_p − 2 … cap, 4,928 segments per case; bind) | **pass** in all three cases (max \|Δ\| 0 / 0 / 7.1e-15 m; bind 0) — `evidence/K0.json` |
| K4b rx_miss (carrier off + probes vs the REV2 plant, 92 steps) | **pass**: 92 / 92 per-step state digests identical; 28 promotion writes, none afterwards. The ankle probes are confirmed read-only. — `evidence/k4b/rx_miss_*` |
| K4b rx_free_leg / rx_planted_leg | **not run.** The harness stopped at the k_p re-check; each output file holds only the stop record. |
| carrier runs | **none** |

## 4. The full gate, frame by frame

`scripts/pcs1_hg_frames.mjs` (read-only; same handoff code as the harness) → `evidence/hg_frames_lc1.json`, `evidence/hg_frames_v13.json`.

| | rx_miss | rx_free_leg | rx_planted_leg |
|---|---|---|---|
| reference time τ_ref (contact / closest approach) | 60.5 | 50.25 | 48.75 |
| first frame with the slide leg fully extended (HG-T) | 43 (lead 16.5) | 43 (lead **6.25**) | 43 (lead **4.75**) |
| LC-1: fully valid frames (lead, ticks) | 45 (14.5), **47 (12.5)**, 57 (2.5) | 45 (4.25), 47 (2.25) | **none** |
| LC-1: valid except HG-T | 10, 38, 39 | 10, 38 (11.25), 39 (10.25) | 17, 19, 29, 35, 38 (9.75) |
| V1.3: fully valid frames | 54 (5.5) | none | none |
| latest fully valid frame with lead ≥ 6 (LC-1) | **47** | **none** | **none** |

**Reading:**
- **rx_miss is valid as approved:** k47, lead 12.5 ticks.
- **rx_free_leg.** With a fully extended slide leg the longest possible lead is 6.25 ticks (frame 43), and frame 43 fails P-17. The latest fully valid frame is 45, lead 4.25 ticks.
- **rx_planted_leg.** HG-T alone caps the lead at 4.75 ticks. No frame between 43 and contact passes the other rows (P-5, P-14, P-15, P-17, HG-A v2). This record has **no** valid promotion frame at all, with either presentation.
- **D-5 and D-4 conflict.** "≥ 6 ticks" (D-5) and "promotion must still satisfy the existing physical compatibility requirements" (D-4) cannot both hold for the two contact cases.

## 5. Options for your decision (none taken)

| | option | consequence |
|---|---|---|
| A | **Keep every existing requirement; relax D-5's lead** to "the latest fully valid frame". rx_miss k47 (12.5 ticks), rx_free_leg k45 (4.25 ticks). | The planted-leg fall cannot run: no valid frame, and D-7 forbids another record. The slice answers the coherence question over 12.5 / 4.25 ticks and the swing-clip collision; the planted fall stays open. |
| B | **Keep D-5; waive HG-T for this slice only** (k39 / k38 as preregistered). | The physical tackler keeps the shorter, mid-extension slide leg the simulation had at k_p (B3). Contact may land later, lower or not at all, so the contact rows (CG-1 … CG-6) lose meaning. The runner-side criteria (coherence, commands identical, momentum not erased) remain measurable if a contact occurs. It conflicts with D-4. |
| C | **Remove the reason for HG-T first:** let the stand-in's slide leg follow the simulation's extension (an extending AST-1 leg), then run the slice as approved (k47 / k39 / k38). | Correct tackle geometry at the approved leads. New tackler work outside the approved slice (B3); it needs its own short design / preregistration. |
| D | **Promote rx_planted_leg at its HG-T-limited frame anyway** (not fully valid: P-5 / P-14 / P-15 / P-17 / HG-A v2 fail at 43 – 47). | It violates the handoff gate, so promotion artefacts would contaminate the collision. Not recommended. |

**Recommendation.**
- **A now:** run rx_miss and rx_free_leg with every existing requirement intact. It is the only option that changes no requirement except the lead, and it answers whether the carrier keeps the runner coherent and leaves a real leg collision visible.
- **C next,** if you want the planted-leg fall tested with correct tackle geometry at a ≥ 6-tick lead.
- **Not B.** It would pass or fail on a tackler geometry we already know is wrong.

## 6. Preserved

- `PCS1_PREREG.md` is unchanged.
- The investigation report gets an appended erratum (§6.2 / §6.3 frames). Its original text is unchanged.
- LC-1, V1.3, V2, REV2, SLP and their evidence are untouched; the AIR records' SHA-256 are unchanged.
- No authority, cap, gain, geometry or outcome was changed. Nothing was pushed.

## Files

- **Scripts:**
  - `scripts/law_provider.mjs`, `scripts/pi1_carrier_sim.mjs`, `scripts/pcs1_run.mjs` (implementation, as built; never run with the carrier on);
  - `scripts/pcs1_k0.mjs`;
  - `scripts/pcs1_hg_frames.mjs` (diagnostic).
- **Evidence:** `evidence/K0.json`, `evidence/k4b/*`, `evidence/hg_frames_lc1.json`, `evidence/hg_frames_v13.json`.

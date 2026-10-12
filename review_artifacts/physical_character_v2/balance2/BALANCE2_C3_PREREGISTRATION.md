# BALANCE-2 successor C3: preregistration

**Status.** Frozen in `BALANCE2_FREEZE_C3.json` before any C3 run on the matched battery B2M, the causality audit or the review scenarios. C3 has run only on the development set DEV (`c3/C3_DESIGN_LOG.md`, `c3/dev/`).

**Instruction.** Owner decision, 12 Oct 2026 22:12 (`sources/2026-10-12_user_instruction_balance2_c3_legitimate_support.md`): rigid boot-tip support is not legitimate toe support. C2 is preserved as evidence and is not adopted. C3 must respect the current rigid foot's legitimate support envelope.

## 1. What C3 is

**C3 = C2 + one mechanism.**

| # | Mechanism | Source |
|---|---|---|
| 1 | AP integral confined to the quiet-stance band ±10.6 mm | C2, unchanged |
| 2 | AP prediction with the support-aware internal model, envelope [−124.76, +64.8] mm | C2, unchanged |
| 3 | Direction-specific dorsiflexor / plantarflexor constants in the AP efference copy | C2, unchanged |
| 4 | **Support-envelope governor**, `force` mode: the AP COM command (all COM-map rows together) is reduced to the largest value whose modelled developed force stays inside mechanism 2's envelope at the propagated offset. It never raises or reverses a command, and never acts on ML or any other objective. | `c3/c3_ctrl.mjs`; mode selected on DEV by the D0 rule |

**Files.**
- Code: `c3/c3_ctrl.mjs` (`C3Controller`), which extends the frozen `successor/b2_ctrl.mjs` (C2), which extends the frozen `balance1/scripts/b1_ctrl.mjs` (BALANCE-1). None of them is modified.
- Parameters: `c3/params/C3.json`, which is `successor/params/C2.json` plus `c3.governor = {mode: "force", horizonSteps: 120, iters: 20, tolN: 0.01}`.
- `c3/dev/DEV_C3_FROM_FILE.json` reproduces the selected DEV run exactly.

**Unchanged:** the body (M1b, `balance1/params/B1_BODY.json`), anatomy, stance, foot geometry and colliders, every gain, delay and channel, the support constants, B2M and its criteria, the fall rule, and PVP (sealed).

**Excluded:**
- repairing the HAT-map defect (C2 design log D6, preserved);
- any hip transfer;
- any new gain;
- any support constant other than C2's.

## 2. Why this mechanism

These points summarise `c3/C3_DESIGN_LOG.md` and `evidence/C3_SUPPORT_TOOLCHECK.json`.

- **The physical fact.** A loaded point on the raised tip of the rigid boot is boot-tip support. The flat sole runs from the heel to the oblique MTP break.
- **What C2 does.** C2's 14 N·s forward recovery, inside the matched band, puts 100 % of the feet's load on the boot tip for 0.93 s. Every recovered DEV level at or above 15 N·s does the same.
- **Why.** C2 already modelled the flat-foot envelope, but only in its prediction; its command was not bound by it.
- **What C3 does.** It binds the command to the same envelope through the same muscle model. The developed force may approach the envelope as fast as the muscle allows, but not exceed it.

**DEV evidence** (100 ms forward threshold; boot-tip load share at the recovered levels):

| Mode | Threshold | Tip share |
|---|---|---|
| C2 | 16.64 | 1.00, not eligible |
| `command` | 11.48 | 0 |
| `activation` | 11.48 | 0 |
| **`force`** | **12.42** | **0** |

`force` was selected by the rule declared before any C3 run.

## 3. Evaluation plan

All scripts are frozen here. Run from the worktree root, in this order.

1. **B2M**, unchanged:
   - `scripts/b2_qualify.mjs --body balance1/params/B1_BODY.json --ctrl c3/params/C3.json --ctrlModule c3/c3_ctrl.mjs --ctrlClass C3Controller` → `evidence/B2M_Q_BALANCE2_C3.json`;
   - `criteria/b2_eval.mjs`, unchanged → `evidence/B2M_V_BALANCE2_C3.json`.
   - The 17 criteria include determinism (DET) and overshoot (P8).
2. **Causality:** `scripts/c3_causality.mjs` → `evidence/B2_CAUSALITY_BALANCE2_C3.json`.
   - C1–C3 come from the unchanged BALANCE-2 audit.
   - C4 is new: the governor's trace is identical to the twin until onset + 1 + 18 steps.
3. **Legitimate support:** `scripts/c3_legit.mjs` → `evidence/C3_LEGIT_BALANCE2_C3.json`.
   - **L1:** boot-tip load share ≤ 0.02 at every step of every B2M run the frozen rule does not score as a fall. That covers U (60 s), the 16 P pushes, the 2 M′ pushes and every non-fall threshold bisection level. Every push's final hash must match the B2M evidence.
   - **L2:** on the unchanged physical-boundary tool's forward grid, no frozen-rule fall ends in a feet-in-place physical recovery, and the physical forward boundary ≤ the B2M forward threshold + 0.7 N·s.
   - **Tool check:** the same script on C2's B2M evidence (`evidence/C3_LEGIT_TOOLCHECK_ON_C2.json`, run before this freeze) must flag C2.
4. **Human comparison** (reported, not judged): B2M's recorded human metrics (torque slew, muscle work, head / thorax rate, excursions, overshoot) and thresholds. The thresholds are given as fractions of the zero-delay limit at the battery edge (102.95 mm, B2M) and at the legitimate flat-foot loaded edge (80.3 mm; disclosed in `BALANCE2_MATCHED_CRITERIA.md` §2: T = 11.6 N·s, band 10.15–14.21). Compared with B, C2, CURRENT V2 and S2 + P2.
5. **Visual review:** the seven BALANCE-2 review scenarios (QUIET, SMALLF 4.82, F12 12.0, BACKM 11.69, LATM 15.0, NEARF 14.0, OVERF 21.5; onset 480, 6 s) with C3 added. Synchronized panels at normal speed and slow motion, plus the boot-tip load share per scenario. Nothing is tuned from the clips.

## 4. Predictions (from DEV, before any B2M run)

| Criterion | Prediction |
|---|---|
| U1–U6 | Pass. Identical to C2: the governor is inactive in quiet standing (DEV 20 s quiet identical to C2) |
| P1, P2, P3, P4′, P5, P6, P7, DET | Pass |
| **P8** | **Fail**: backward small ≈ 0.29, the governor being inactive there (C2: 0.287) |
| M1′ | Pass, likely. The 367 ms forward push is milder than DEV fwd 10 @ 100 ms (settled 2.70 s) |
| **T1′** | **Fail, forward below band:** ≈ 12.0–12.8 N·s vs ≥ 13.01. Backward ≈ 20.5–21.5 (in band); lateral ≈ C2 (in band) |
| Total | **15 / 17** (P8, T1′) |
| L1, L2 | Pass |
| Causality C1–C4 | Pass |

**Reading of the forward prediction (disclosed now).**
- The T1′ forward band is scaled to the battery edge, d = 102.95 mm. That edge is reachable only by pitching the rigid boot onto its tip: the criteria document calls it "the boot rocker, reached by pitching".
- At the legitimate flat-foot loaded edge (80.3 mm), the same human fraction gives a band of 10.15–14.21 N·s.
- This is not used to judge C3. Changing the criteria is the owner's decision.

## 5. Status mapping (frozen)

Precedence is D > C > B > A.

| Status | Condition | Consequence |
|---|---|---|
| **A. QUALIFIED** | B2M 17 / 17, causality pass, L1 pass, L2 pass, and the clips show no boot-tip balancing | C3 is frozen as the **qualified no-step recipient baseline** (`BALANCE2_QUALIFIED_NO_STEP_BASELINE.json`) |
| **B. PROMISING — SPECIFIC BALANCE GAP** | Legitimate (L1, L2) and causal; fails only controller-class criteria (P8 overshoot, or other non-support criteria) | Not frozen as qualified |
| **C. BODY / STANCE ARCHITECTURE DECISION** | Legitimate and causal; fails T1′ forward below the band, or a forward P / M′ recovery: the legitimate rigid flat foot cannot reach a band scaled to the boot-rocker edge | Not frozen as qualified. The owner decides between articulated toes, stepping, or re-deriving the band at the legitimate edge |
| **D. CONTROLLER ARCHITECTURE DECISION** | Causality fails, or L1 / L2 fails: the governor cannot hold the controller to the legitimate envelope within this architecture | Not frozen as qualified |

PVP stays sealed whatever the status. Nothing is pushed.

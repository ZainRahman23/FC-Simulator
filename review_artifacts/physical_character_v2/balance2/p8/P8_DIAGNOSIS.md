# P8 backward-small overshoot (C3: 0.287 vs ≤ 0.26): causal diagnosis

**Status.** Post-hoc diagnostics on the failing B2M case: back.small, 5.84 N·s, 50 ms, onset step 480, frozen C3. This exposure of the battery case is disclosed. Nothing here is a candidate or a criterion.
- Scripts: `p8/p8_diag.mjs`, `p8/p8_segments.mjs`, `p8/p8_feet.mjs`.
- Results: `p8/evidence/P8_DIAGNOSTICS.json`.

## 1. What the 0.287 is

The push − twin AP COM trace (positive = backward, the push direction):

| t (s) | 0.3 | 0.7 | 1.0 | 1.6 | 1.7 | 2.3 | 2.9 | 3.5 | 4.0 |
|---|---|---|---|---|---|---|---|---|---|
| mm | 16.5 | 16.3 | 7.3 | −0.7 | −2.9 | −4.5 | **−4.8** | −4.1 | −2.9 |

- After returning (≈ 1.6 s), the COM does not settle on the twin. It sits **≈ 3 mm forward**, with a ±1.5 mm ripple at ≈ 1.7 Hz.
- The scored 4.8 mm is that offset plus a ripple trough at 2.91 s. It is not a single post-peak rebound.

**Over 12 s** (`long12s`): the offset is the first swing of a **slow oscillation with a ≈ 9 s period**.

| t (s) | 3 | 7.5 | 11.5 |
|---|---|---|---|
| mm | −4.2 | +4.2 | −1.0 |

The human pelvis-push response is complete in 2–3 s (Rietdyk 1999).

## 2. Single-factor ablations (applied to twin and push alike)

| Variant | back small | back moderate | fwd small | Reading |
|---|---|---|---|---|
| C3 as frozen | **0.287** | 0.232 | 0.050 | |
| Motor noise off | 0.361 | 0.245 | 0.025 | **Not noise.** Noise slightly masks it |
| AP COM integral held from onset | 0.243 | 0.190 | 0 | The quiet-band integral contributes ≈ 0.7 of the 4.8 mm |
| Every controller integral held from onset | 0.270 | 0.258 | 0 | |
| Noise off + every integral held | 0.364 | 0.281 | 0 | **The offset exists with a memoryless controller.** The integrals are not its cause |
| AP prediction off | 0.431 | 0.311 | 0.077 | C2's prediction helps |
| Direction-specific muscle constants off | 0.357 | 0.253 | 0.031 | C2's constants help |
| Governor off (= C2) | 0.287 | 0.232 | 0.050 | Governor inactive on small pushes |
| BALANCE-1 B | 0.609 | 0.490 | 0.284 | |
| **Body diagnostic:** M1b persistent strain arm removed | 0.477 | 0.350 | 0.149 | **The body's history memory resists the offset.** It is not the cause |
| Body diagnostic + noise off + integrals held | 0.590 | 0.419 | 0 | |

**Test-side checks.**
- **Foot slip:** the feet move < 0.1 mm relative to the twin (`p8_feet.mjs`). The COM offset is real, relative to the feet.
- **Noise floor:** noise reduces the metric.
- **Window:** the scored trough falls at 2.9 s, inside the human response duration plus margin. It is the first swing of a real slow mode, not a late artifact.

## 3. Where the offset lives (`p8_segments.mjs`)

With noise off and every controller integral held (a memoryless controller), at 3.5–4.0 s the COM is 5.7–6.2 mm forward of the twin.

| Contributor | Value |
|---|---|
| Pelvis, abdomen, thorax, head and arms | 4.7 of the 5.7 mm |
| Pelvis / abdomen / thorax pitch | +1.2 / +1.0 / +1.3° (forward) |
| Hip flexion | +1.0° |
| Shank pitch | +0.09°: the legs are upright |

**The upper body (HAT) is leaning ≈ 1.2° forward about the hips.** With the integrals held it decays with a time constant of ≈ 9 s (6.2 mm at 3.5 s, 2.5 mm at 11.5 s). It is a slow, near-neutral mode, not a permanent new equilibrium.

**Mechanism.**
1. The backward pelvis push leaves the trunk behind: hip flexion is +1.3° at 0.3 s.
2. BALANCE-1's HAT lean objective does not act at the hips in AP. Its gravity-load map there is 3.4 / 0.9 N·m/m instead of ≈ −217 N·m/m per hip (C2 design log D6), so nothing actively restores the HAT's AP lean.
3. The lean is held only by intrinsic hip stiffness and by the COM loop's hip rows. Those rows produce hip torque only in proportion to a COM error, so the controller sustains a few millimetres of COM error to hold the lean.
4. The integrals slowly remove it, which turns the decay into the ≈ 9 s oscillation.

**Diagnostic with the hip map corrected** (rotation about the fixed hip axis, existing gains, noise off, integrals held):
- the hip offset vanishes (≤ 0.2°);
- the slow offset moves into the spine (lumbar / thoracic +1.8–2.6°) and the arms;
- the COM stays 4.6–7.6 mm forward.

So the map defect is the entry point, and the upper-body orientation loops as a whole are weakly stiff. Earlier DEV evidence (C2 design log D6, V7) showed the full repair with the existing gains, integral included, worsens overshoot on DEV.

## 4. Classification

| Side | Verdict | Evidence |
|---|---|---|
| **Controller** | **Yes: the cause** | A memoryless controller reproduces it (noise off, integrals held). It lives in the HAT lean about the hips, which the controller does not regulate in AP (latent BALANCE-1 map defect) |
| Body | No | M1b's persistent strain arm resists the offset (removing it doubles the overshoot). The feet do not slip. There is no other long body memory |
| Test | No | The offset is real relative to the feet, not noise, and inside the response window |

**Is P8 appropriately matched?** Partly.
- The human reference (Rietdyk: 0.7–0.8 cm on 5.6–6.4 cm, ≈ 0.13, band × 2 = 0.26) was measured at one, larger push size. Applying the ratio to a 16.6 mm peak assumes scale invariance, which holds for a linear system and is not tested in humans.
- In absolute terms the fixture's 4.8 mm is below the human 7–8 mm.
- But the defect P8 catches is genuinely non-human at every size: the backward small response lasts more than 12 s against the human 2–3 s, and back.moderate (0.232) carries the same mode.
- **Conclusion:** P8 is not waived. The defect is genuine and controller-side. A successor is required.

## 5. What a successor may and may not do

- **May:** repair the HAT objective at the hips, where the diagnosis locates the cause.
- **May not:**
  - raise any orientation gain. The sagittal human evidence does not support it: the hip eigenmode is ≈ 1.15 × gravitational (Alexandrov 2005), below BALANCE-1's 1.3; the only higher value, 1.7–1.9 trunk-mgh, is frontal-plane (Goodworth & Peterka 2009 / 2010);
  - use the full repair with the existing gains (owner instruction; DEV evidence: worse);
  - search gains;
  - change the body, the foot or any criterion.

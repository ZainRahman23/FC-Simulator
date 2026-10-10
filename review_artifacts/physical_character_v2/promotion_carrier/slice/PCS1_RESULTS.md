# PCS-1 RESULTS: STOPPED at the first case (preregistered hard stop: pre-contact coherence). rx_free_leg and rx_planted_leg were not run.

**Date:** 10 Oct 2026.

**Protocol:**
- `PCS1_PREREG.md` (8585adc);
- stand-in `AST1E_PREREG.md` (7b77dc5, A1 bc12611, A2 2306cc0);
- sources: 2c39acf, 3ec464e, and `../../sources/2026-10-10_user_approval_standin_timing_correction.md`.

> **Correction recorded prominently.** The PCS-1 frames 39 / 38 were first wrongly described as passing the full gate, because HG-T had been omitted from the extracted `valid` flag. See the erratum in `../PROMOTION_CARRIER_INVESTIGATION.md` and `PCS1_STOP_KP_RECHECK.md`. The original evidence is unchanged.

## 0. Verdict

**The core architecture is not yet demonstrated.**
- **The chain tested:** cheap authoritative locomotion → seamless promotion → genuine rigid-body interaction → physically caused correction / stumble / fall.
- **Where it broke:** the second link. In the first case (rx_miss) the promoted runner stayed coherent for **3 ticks**. Then the carrier's gait driver drove the swinging left foot into the turf 6 ticks before the simulation's touchdown. That is a preregistered hard stop, so the collision cases never ran.
- **The cause is the temporary gait driver acting on its reference, not the V2 body.**
  - The joint targets are the simulation's own leg law (D-1). That law's legs assume a pelvis trajectory that vaults up to **137 mm above** the height a physical body reaches.
  - With B's vertical released (D-2), the physical pelvis follows physics, so the law's swing-foot clearance (92 mm) became −45 mm.
- **Everything around it worked:** the stand-in (now tracking within 0.24 mm), the promotion gate, determinism, gameplay neutrality, and the identity of every driver command with and without the tackler.

## 1. What ran (in the frozen order)

| step | result |
|---|---|
| A2 correction, then checks 2 – 6 re-run unchanged | **pass:** slide-leg geometry 0.24 / 0.11 / 0.11 mm (≤ 10 mm); frames 47 / 39 / 38; hashes unchanged; near miss untouched; contacts reproduced (foot_L 50.25 exact; toe_R→foot_R 59.5; shin_L 48.75 exact); release R-1 / R-2 pass (`evidence/ast1e_a2/`) |
| K0 | pass: law provider bit-exact against the simulation's own legs |
| K4b with AST-1E, all three cases | pass: carrier off + probes = REV2 plant, bit-identical; 2(b) K, D and capacity recomputed exactly (`evidence/k4b_ast1e/K4b.json`) |
| rx_miss: contact a, no-tackler a, contact b, no-tackler b | ran; **§4.1 fails at tick 51 → hard stop** |
| rx_free_leg, rx_planted_leg | **not run** (stop rule: "§4.1 fails in any case: stop at that case") |

**Frozen answer rule:** **NO**. Evaluation: `evidence/runs/PCS1_EVAL.json`.

## 2. rx_miss: your ten items

**1. Is promotion itself continuous?** Within the gate, yes. In velocity, not fully.

| row | value | verdict |
|---|---|---|
| HG (P-1 … P-17, HG-A v2 shift 0.146 m/s, HG-T for AST-1E) | — | pass |
| 28 authority writes, none after | — | pass |
| PR-3 energy residual Σ+ over 0.05 s | 0.39 J | pass |
| PR-4 turf force | 649 N vs 1,450 N | pass |
| PR-2 v2 (velocity continuity over the first frame) | 19.65 mm (shank_R) | fail |

The PR-2 v2 failure is the known handoff-initialisation issue: PI-1 §6.2's 60 Hz backward differences, recorded in LC-1. It is reported, not gating.

**2. Does the physical runner stay coherent before contact? No.**
- Coherent ticks 49 – 50.
- **Tick 51:** CG-2 and NM-2 fail. The physical left foot is on the turf while the simulation's left leg is in swing.
- **Tick 53:** CG-4 fails; the legs are 135 – 248 mm from the simulation's legs.
- The left foot then slides 141 mm in its premature "stance" (τ 51 – 59).
- B is saturated on 87 % of pre-contact steps (mean |F|/cap: x 0.79, roll 0.80, yaw-axis 0.92), against a ≤ 5 % / ≤ 25 % budget.
- Pelvis height and tilt held until much later (ratio ≥ 0.996, tilt ≤ 4.7° before contact).

**3. Physical contact (the near miss should have none):**
- At **τ 59.75** the stand-in's slide LEG struck the runner's **foot_L**.
- Contact point (0.73, 0.11, 0.24) m, render frame; normal (−0.02, −0.12, −0.99), i.e. along the slide.
- Transferred impulse **18.75 N·s**; angular 17.39 N·m·s about the COM.
- It happened because the left foot was dragging on the turf instead of swinging (item 2).
- The simulation's near miss passes the swinging foot. In the no-tackler counterpart there is no contact.

**4. Displacement and momentum caused by that collision** (contact run minus the no-tackler run):

| after contact | ΔP | ΔL | share of the contact impulse retained along it |
|---|---|---|---|
| + 0.05 s | 12.6 N·s | 10.3 N·m·s | 87 % |
| + 0.10 s | 9.6 N·s | 8.2 N·m·s | 25 % |
| + 0.25 s | 12.9 N·s | 3.3 N·m·s | (turf / fall dominated) |

- **RC-2 (visible response):** struck-foot Δv 0.76 m/s within 5° of the normal; the foot deviated 139 mm. Pass.

**5. Support / recovery-authority use:**
- B is saturated on **96.8 %** of all promoted steps. It strained throughout to pull the lagging, foot-dragging body toward the authoritative path.
- RC-3 at the contact: B's opposing impulse 10.74 N·s > 0.5 × 18.75 N·s, so it **fails**, in a case that should have had no contact.
- The carrier's own feed-forward never reacted: it was identical to the no-tackler run at every step.
- **Actuators:** saturated on 1,620 axis-steps.
- **Peak requests:**
  - target inverse dynamics 3,198 N·m (2,381 N·m at the left-hip cusp, τ 53.0);
  - velocity feed-forward 2,592 N·m on the right ankle, whose capacity was 94 – 129 N·m.

**6. Did the runner correct, stumble or fall, and why? It fell.**
- Pelvis below 0.85 × the presentation's height from τ 76; tilt > 20° from τ 81; pelvis COM ≤ 0.35 m at τ 92.25 (minimum 0.12 m).
- **Why:**
  - The gait driver lost coherence at τ 51: the swing foot touched down early, dragged, and the stance ankle saturated.
  - B was saturated almost continuously.
  - The unintended foot contact at 59.75 added 18.75 N·s.
  - The no-tackler run, identical through τ 59.5, also leaves coherence at 51.
- **The fall is caused by the gait driver, not by a collision.**

**7. Did the near miss stay physically untouched? No.** It was touched at τ 59.75, as a consequence of item 2.

**8. Does the physical outcome agree with the simulation? No.** The simulation has NO_CONTACT and continues running; physics has an early foot strike, a contact and a fall. DG was never reached.

**9. Determinism and neutrality:**
- **Determinism:** a / b runs, in separate processes, bit-identical at every step (state, posture command, carrier stream) for both the contact and the no-tackler run.
- **Gameplay neutrality:** the records' SHA-256 are unchanged, and their gameplay hashes are identical across OFFNP / OFF / FULL / LOCO and equal V1.3's. Nothing flows back to the simulation.

**10. CPU** (run b, mean µs per 240 Hz step, Node 22 / Apple M4, unoptimised):

| component | µs per step |
|---|---|
| physics (Jolt 348 + passive tissue 356 + posture servo 21 + actuators 39) | **765** |
| gait targets / reference law + mapping | 236 |
| inverse-dynamics feed-forward | 34 |
| carrier (A field + B target computation) | 7.7 |
| recovery support (B target setting) | 1.8 |
| stand-in | 25 |
| measurement / logging (excluded) | 1,628 |

- Per 60 Hz frame: physics ≈ 3.1 ms; carrier terms ≈ 1.1 ms.
- The law evaluation and mapping, 6 per tick, is the carrier's main cost.
- Browser and mobile were not measured.

## 3. Attribution (which part failed)

| part | verdict | evidence |
|---|---|---|
| **V2 body: joints, actuators, contact model** | **no failure shown** | Actuators saturate only because the requests are 20 – 25× their capacity (2,579 N·m asked at the right ankle). The left foot slid with ordinary turf friction because it was driven into the turf. Hard limits kept a margin ≥ 2.5° before contact. |
| **Collision physics** | **not reached in a valid state** | The one contact was solved physically with a visible response (RC-2 pass), but it came from the drag, not from an intended interaction. |
| **Carrier / temporary gait driver** | **primary failure** | **(1)** Joint-space targets from the law reproduce the law's leg shape relative to the pelvis, but the pelvis follows physics (B vertical released). At ticks 49 – 52 the physical pelvis was 102 – 137 mm below the law's, so the 92 mm law clearance became an early touchdown at τ 51.0 (law touchdown τ 57). **(2)** The velocity feed-forward (D + dt·K)·ω* with the posture driver's stance gains (K 497, D 175) turns the law's fast stance-ankle motion into 2,000 – 2,600 N·m requests. **(3)** The target inverse dynamics spikes at the law's velocity cusps (2,381 N·m). |
| **Source reference (the simulation's leg law)** | **contributing** | Its pelvis vaults upward at ≈ 1.4 m/s while the physical body rises ≈ 0.3 m/s. The same non-physical vertical that LC-1 found makes the presented legs depart from the simulation's legs. The presentation itself is up to 235 mm from the simulation's legs in this window. |
| **Handoff** | **not the cause; one known defect** | The gate passed. The pelvis starts at the LC-1 (physically plausible) height, ≈ 100 mm below the law's. PR-2 v2 shows 19.65 mm of 60 Hz velocity-initialisation error (known). |
| **Stand-in (AST-1E after A2)** | **worked** | Tracking 0.00 – 0.24 mm; identical runner commands with and without it until the first manifold at τ 59.75. |
| **Test apparatus** | **worked** | Determinism, the 2(b) recomputation (exact), K0, K4b, hashes. Two measurement bugs were found and fixed before any carrier run: the stand-in logging field, and a capacity-check `share` factor plus a syntax slip. Both are disclosed in git history. |
| **Source record (17.9 mm discontinuity)** | **not evaluated** | The two cases it applies to did not run. |

## 4. What this means

**The finding.** Tracking the simulation's own leg law in joint space cannot stay physically coherent for a ≥ 6-tick lead. The law's leg geometry is only consistent with a pelvis trajectory that physics cannot produce. This one fact is behind both the LC-1 presented-legs gap and this failure. It sits in the source law, beneath both the presentation and the carrier.

**Options for your decision (nothing started):**
1. **Make the shared law's pelvis vertical physically realisable,** for example a spring-mass vertical inside the simulation's law.
   - It changes the simulation's CHARCOLLIDE capsule heights slightly, so it needs a gameplay-geometry decision.
   - It would remove the root cause for both the presentation and the carrier.
2. **Keep the law, but give the carrier foot-space targets on the physical pelvis**: the law's horizontal foot positions, with leg IK at the physical height. This is new foot-placement logic, which D-7 currently excludes.
3. **Shorten the promotion lead to the coherent interval this carrier achieves (≈ 3 ticks).** This conflicts with D-5 (≥ 6 ticks).
   - Gate-valid frames at that lead exist for rx_miss (k57, 2.5 ticks) and rx_free_leg (k47, 2.25 ticks).
   - None exists for rx_planted_leg.

**Recommendation:** investigate option 1 read-only first. It addresses the cause rather than the symptom.

**Not started:** recovery-to-animation or any other slice, as instructed. Nothing was pushed.

## Files

- **Scripts:**
  - `scripts/pcs1_eval.mjs` (evaluation), `scripts/pcs1_run.mjs` (harness, with measurement additions);
  - `scripts/stand_in_e.mjs` (A2);
  - `scripts/diag_rx_miss_attribution.mjs` (read-only attribution).
- **Evidence:**
  - `evidence/runs/` (four rx_miss runs, `PCS1_EVAL.json`, `diag_rx_miss_attribution.json`);
  - `evidence/k4b_ast1e/`, `evidence/ast1e_a2/`;
  - `evidence/K0.json`.

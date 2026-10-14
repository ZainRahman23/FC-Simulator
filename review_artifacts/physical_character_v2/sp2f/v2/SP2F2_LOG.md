# SP2F addendum log: continuous side slide + active posting-arm stabilisation (SP2F2)

## Sources and fixed conditions

- **Instruction:** `sources/2026-10-14_user_instruction_sp2f_addendum_reference3_side_slide_active_arm.md` (≈ 21:30 BST, 14 Oct 2026).
- **Second reference:** REFERENCE3, kept outside Git: `_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov`.
- **First pass:** SP2F (`28491975`) is kept unchanged.

**Fixed throughout:**
- **Friction:** F37.5 (temporary).
- **Unchanged:** the run-to-tackle transition, dive / scissor, folded-leg tuck, tackling-leg trajectory, boot / stud model, root / COM, body, recipient and C3.
- **Not used:** no anti-roll torque, no root translation, no propulsion and no world-space hand target.

**Measurement conventions:**
- Times are given after the first fold-side contact.
- Unless noted, values are at 5.0 m/s. Candidate sweeps ran at 4.5 / 5.0 / 5.5 m/s.

## 1. REFERENCE3 (frame strips at 10 / 20 fps, slider-tracked crops)

- **The drop:** the slider rolls onto his folded side during the drop. When the hip lands, the trunk is already tilted ≈ 30–45° toward the folded side.
- **The arm:** the folded-side hand reaches the turf at about the hip landing. It is a long, nearly straight arm, placed out to the side and slightly behind.
- **The slide:** the body then slides on that side. The trunk lowers slowly while the shoulder opens.
- **Incidental (not copied):** the other arm is raised.
- **Playback rate:** unknown. It may be a slowed replay.

## 2. New diagnostics

**`v2/scripts/sp2f2_lat.mjs` (persistent lateral orientation).** Sampled every 8 ms:
- **Measured:** pelvis roll; trunk tilt; trunk roll (the folded-side shoulder line below horizontal); chest-normal elevation; lying direction ψ (0 = on the folded side, 90 = on the back, < −30 = chest-down); shoulder and hip heights; turf-contact regions.
- **Classification:** upright, lateral, back or chest-down.
- **Summary:** the established lateral slide, excursions, ψ reversals, folded-side-lower shares and region shares.

**`v2/scripts/sp2f2_eval.mjs`.** Adds the arm actuator effort (|τ| / capacity, from the plant's actuator rows), the support command, the landing pelvis-roll kick and the backward rocks.

**Baseline (5.0 m/s):**

| | trunk < 30° after landing | pelvis contact |
|---|---|---|
| SP2F | 0.42 s | on the buttock |
| SP2D | 0.47 s | |
| SP2E | 0.10 s | lying toward the back (ψ ≈ 80–90°), not the side |

## 3. Controller additions (opt-in `slide_phys2/scripts/sp2_ctrl.mjs` `post.support`; inert when absent)

All three regression hashes are unchanged: SP2 `792ce24e…`, SP2A `3062e3e2…`, SP2F `7838fc53…`.

**Support regulator.** The arm's press magnitude is fed back from the sensed trunk lowering:
- the input is the thorax tilt and rate, sensed with a 25 ms delay and filtered by 40 ms activation;
- it is compared against the athlete's intended lowering (`sched`), on the same curves the trunk targets follow.

**Variants tried:**
- **(a) Rate term.** A pure rate term braked a trunk that was still behind its intended lowering. The descent then stalled in steps (staircase, candidate Zb).
- **(b) Predicted-error braking.** Braking on e = (tilt − ref) + 0.12 s × (rate − refRate) never engaged in the chosen tackles. It was effectively a constant 130 N press, which propped the trunk at ≈ 69°.
- **(c) Two-sided (kept).** F = clamp(Fmin + Ka·e, Flo, Fmax): 130 N on the intended lowering, down to 30 N when the trunk is behind it, up to 300 N when it runs ahead.

**Load-aware yielding (`yieldN`).** Damping scales down under a load excess. It is implemented but not needed in the final candidate.

**End-range shoulder stabiliser (`elevMax`, `kR`, `capR`).** Beyond 115° of elevation, a bounded torque (≤ 60 N·m, scaled by authority) brings the arm back toward the trunk.
- At 4.5 m/s the turf otherwise dragged the hand overhead (157°) and the elbow buckled (8° → 47° in 0.1 s).

## 4. Candidate history (`v2/scripts/sp2f2_cand.mjs`)

**X (lateral via the pelvis objective plus a 70° arm reach).**
- The trunk was still upright for 0.33 s.
- The hand landed late (+0.38 s) and ended overhead (176°).

**Y (release SP2C's counter-lean from 0.28 s).**
- Upright time fell to 0.25 s.
- The hand hovered ≈ 1 cm above the turf for 80 ms. The reach target had finished before contact and held the hand up through the 80 ms blend.

**Z / W / V / U (release timing × lean × reach × seat onset).**
- **Diagnosis:** the upright phase is not a hold. The trunk arrives leaning ≈ 30° toward the tackling side (the in-air counter-lean) and swings through vertical (13° at +0.08 s).
- **Releasing earlier:**
  - leaning onto the folded side in the air (Zb, release from 0.16 s) is REFERENCE3-like, with upright time 0.075 s;
  - but the pelvis lands flat and kicks away from the folded side (−740°/s), and the trunk rate spikes to 290°/s.
- **The landing kick** is the buttock-impact rebound. It depends on the pelvis roll at impact:
  - release 0.23–0.25 s: −64…−175°/s;
  - release 0.26–0.30 s: −200…−500°/s;
  - SP2F: −180…−270°/s.

**T (faster pelvis-roll objective, gain 400–1500, onset 0.05–0.15 s).**
- No earlier roll: the pelvis stayed at 14–16° at +0.2 s.
- Late chest-down rolls and 4–10° fold-hip excursions.
- Rejected.

**Folded knee (knee_L.x = tibial axial rotation, 27 N·m capacity).** Every in-air release twists the landing shin past its hard stop. Excursion against release start time:

| release start | excursion |
|---|---|
| 0.22 s | 8–12° |
| 0.24 s | 6–9° |
| 0.26 s | 4–6° |
| 0.28–0.30 s | 2.6–5° |
| SP2F | ≤ 1.7° |
| SP2E | ≤ 4.2° |

Other levers:
- Releasing at or after contact (0.44–0.48 s) keeps the knee ≤ 3°, but gives a 200–260°/s trunk fall and 0.33–0.43 s upright.
- Folded-leg authority acts only 0.3 s after contact, too late to help.
- A thoracic-led lean did not change the knee.

**P / M / N (thoracic-led lean; slower, contact-spanning release).** Thoracic-led −8 / −20 was slightly smoother at 5.5 m/s. Nothing escaped the knee / kick trade-off.

**K (arm, hand gap at 5.5 m/s).** A 46 ms rebound after the first-touch impact. It was fixed by:
- a 30 ms target blend (was 80 ms);
- a 130 N contact press.

With these there are no gaps at any speed and the trunk RMS acceleration drops.

**H (final organisation).**
- With the earlier lateral establishment, pelvis-roll 75° plus thoracic rotation 36° rolled the body chest-down at 5.5 m/s in nearby variants.
- Pelvis roll 70° was clean.
- Thoracic rotation 44° was robust at release 0.26 s but rougher at 4.5 m/s.

**G (wider / straighter reach, abduction 50–60°).** More rocking (≤ 12°), 220–245°/s rates, and the arm folded in against the body. Rejected; abduction 40° kept.

**F1 → R30 (robustness).** Each of the release ± 5 ms, contact press ± 15 N, lean ± 2° and reach end ± 50 ms perturbations at 3 speeds (27 runs per family).
- **F1** (one-sided press): 0 chest-down, 0 gaps, 2 rocks > 3°.
- **D (two-sided press):** Flo 30 / 60, Ka 4 / 8, T1 80 / 88.
- **R30 and R60:** 0 chest-down, 0 gaps, 1 rock > 3° each.
- **Kept:** R30, the lowest floor. The arm yields most to the descent.

## 5. SP2F2 (`v2/evidence/SP2F2_opts.json`), final evaluation (`v2/scripts/sp2f2_final.mjs` → `v2/evidence/SP2F2_eval.json`)

**Settings:**
- **Base:** SP2F's recline (sine 0.20 → 1.5 s), with pelvis roll 70° and thoracic rotation 36°.
- **Lean (E):** lumbar −8°, thoracic −20°, from 0.25 → 0.40 s. Two-curve sum with the recline, so there is no pause.
- **Reach:** 0.25 → 0.70 s; abduction 40°, flexion −30°, elbow 15°; blend 0.03 s.
- **Support:** Fmin 130, Flo 30, Fmax 300 N; Ka 4 N/°; Tp 0.12 s; sched 15° → 40° by 0.40 s → 88° by 1.5 s; elevMax 115°, kR 150, capR 60.

**Results (4.5 / 5.0 / 5.5 m/s):**

| | SP2F (first pass) | SP2F2 |
|---|---|---|
| upright after landing (trunk < 30°) | 0.40 / 0.42 / 0.46 s | **0.12 / 0.23 / 0.26 s** |
| excursions after the lateral slide is established | 0 | 0 |
| chest-down | never | never |
| lying direction ψ after establishment | −3…49 / −0…63 / 26…68° | 42…59 / 28…47 / −0…43° |
| backward rock (largest) | 5.5 / 1.4 / 4.3° | 0.8 / 2.7 / 2.5° |
| landing pelvis-roll kick | −179 / −245 / −267°/s | −98 / −75 / −64°/s |
| peak trunk rate after landing | 98 / 107 / 143°/s | 120 / 133 / 182°/s |
| RMS trunk acceleration | 547 / 442 / 573 | 543 / 545 / 492 |
| first hand contact | +0.10 / 0.22 / 0.28 s | +0.08 / 0.12 / 0.15 s |
| hand contact | continuous | continuous (1.9 / 2.15 / 2.5 s) |
| hand sliding distance | 3.25 / 3.75 / 4.70 m | 3.26 / 4.25 / 5.42 m |
| first-touch normal peak | 1.25 / 0.64 / 0.78 BW | 2.6 / 2.0 / 2.0 BW (one 8 ms sample) |
| arm press | constant 150 N | 34–126 / 46–130 / 63–130 N (mean 63 / 71 / 97) |
| shoulder effort mean | 0.56 / 0.57 / 0.59 | 0.37 / 0.42 / 0.47 |
| folded knee tibial rotation past stop | 1.7 / 1.0 / 1.5° | **7.6 / 6.4 / 5.1°** (0.24–0.36 s) |
| slide | 4.10 / 5.38 / 6.75 m | 4.09 / 5.33 / 6.79 m |

- **Determinism:** `badcc352f5a35170` ×2.
- **Robustness:** 27 perturbed runs; 0 chest-down; 0 hand gaps; 1 rock > 3° (3.7°).

**Renders and page:**
- `v2/render/sp2f2_render.sh` → `v2/review/video/`: SP2F | SP2F2 in every view, including rear 3/4 at 1× (≈ the REFERENCE3 camera); speeds side and rear.
- `v2/render/sp2f2_compose_reference.sh` → `v2/review/local_reference/` (gitignored): REFERENCE3 | SP2F | SP2F2 (rear) and REFERENCE | SP2F | SP2F2 (side).
- Page: `v2/render/sp2f2_review_build.mjs` → `v2/review/SP2F2_REVIEW.html`.

**Visual review:** I cannot play video in real time. I reviewed 30 fps frame strips and the traces.

# SLIDE-PHYS-2A (SP2A): authored dive and tuck intent on the rigid body, and the RUN → DIVE start transition

- **Instruction:** `sources/2026-10-14_user_instruction_sp2a_authored_dive_run_to_dive.md`.
- **Investigation log:** `SP2A_LOG.md`.
- **Reference analysis:** `REFERENCE_SP2A_ANALYSIS.md`.
- **Review page:** `review/SP2A_REVIEW.html`.
- **Candidate:** `evidence/SP2A_opts.json`.

## Verdict: architecture established and demonstrated; tackle PARTIAL, not qualified, not frozen

**What works:**
- **One continuous event, with no setup pose.** RUN-1 runs into an **authored final flight**: every joint is a C1 Hermite from the run's own angle and rate into the committed plant state, and the root follows an exact ballistic COM arc. Physics then takes over from the plant touchdown, in exactly the authored state.
- **The momentum is legitimate.** The incoming momentum is the run's own. The final flight is ballistic by construction. From step 1 onward, the momentum residual stays ≤ 4×10⁻⁴ N·s, and the airborne phases have a COM acceleration of exactly g.
- **The plant, the push-off, the scissor, the fold-side ground entry and the slide are all physical**, and contacts win.
- **SP2's tackle structure carries over:**
  - bent-leg side first (fold thigh/knee at 0.41 s, tackling boot 13 ms later, shin 0.48 s, hip 0.50 s);
  - fold boot sole facing up and away;
  - no face-down and no head contact at 5.0 m/s;
  - slide 1.35 m;
  - deterministic.
- **The 3D-tuck refinement roughly halves SP2's fold-hip overrun:** 3.0° (SP2: 8°) at 5.0 m/s.

**What does not meet the brief:**
- **The knee is still the dominant long-duration glide point:** 50% of the glide (SP2: 51%).
- **The fold hip still overruns its stop for about 1 s** (3.0° for 1.05 s).
- **The *tackling* ankle overruns its limit by 2.5° for 29 ms** when that boot lands. The fold ankle has no violation at 5.0 m/s.
- **The 3D tuck is reached during the slide, not at ground entry.** At first contact the fold leg still has SP2's geometry (hip abducted 12°, rotation about 0°).
- **At 4.5 m/s the body rolls onto its front at the end of the slide** (head at 1.55 s).

So SP2A is **not frozen** as the new baseline. The brief makes freezing conditional on success. I have stopped here for your visual review, and nothing has been started on the running recipient.

**The most important finding** (`SP2A_LOG.md` §1): the physical body cannot be handed the run's last stride or last stance and turn it into a dive. Three reasons:
- its limbs lag running-speed motion by 50–100 ms;
- the kinematic RUN-1 stance is not dynamically consistent (its implied centre of pressure is 0.27 m behind the heel, at 2–2.8 BW);
- the run's stance rotates the body forward at the moment a commitment would release it.

Every structure that tried it (searches S1–S6, about 60 hand variants) ended face-down. The adopted structure follows your architecture literally: the deliberate transition is authored, and the momentum and everything that is supported or touched are physical.

---

## 1. Results against the brief

All figures are at 5.0 m/s (the review speed) unless stated. All three speeds are in `evidence/SP2A_eval.json`.

| Brief requirement | Result | Evidence |
|---|---|---|
| Recognisable authored athletic dive | **Yes**: a decisive final step, a 0.100 s flight into the plant, a push-off with a 0.17 s airborne scissor, then ground entry | videos SP2A_MAIN, START |
| Correct asymmetric scissor | **Yes**: the free (tackling) thigh drives forward and up through the final flight and stance (about 520 °/s at the plant) while the plant leg pushes off, then folds | START_025x, plot |
| Genuinely 3D folded-leg tuck | **Partial**: at ground entry the fold leg is SP2's (knee 146°, hip flexion 43°, abduction 12°, rotation −4°); during the slide it morphs into the 3D tuck (adduction 17°, external rotation 35°, flexion 85°, knee 132°) | `foldGeometryAtFirstBodyContact`, `SP2A_opts.json` |
| Studs naturally clear of the turf | **Fold boot: yes**, sole facing up/away (sole-down cosine −0.45). **Tackling boot:** heel and sole touch at 0.425 s, peak 0.46 BW over 29 ms, 15.6% of the glide | `SP2A_eval.json` |
| Bent-leg side contacts first | **Yes**: fold thigh/knee at 0.412 s, tackling boot 0.425 s, shin 0.479 s, pelvis 0.504 s | `firstContact` |
| Load spreads quickly from knee/shin into the outer thigh/hip | **Partial**: hip contact follows 0.09 s after the knee, but the knee still carries 50% of the glide (thigh 12%, pelvis 17%) | `glideShare` |
| No ankle hard-limit violation | **Fold ankle: none** at 5.0 m/s (0.6° for 8 ms at the earlier S7 candidate). **Tackling ankle: 2.5° for 29 ms** when it lands; 2.1° for 0.11 s at 5.5 m/s | `limits` |
| No sustained hip hard-limit violation | **No**: fold hip 3.0° for 1.05 s (SP2: 8° for 1.1 s); 1.8° for 0.55 s at 4.5 m/s; 5.1° for 0.08 s at 5.5 m/s | `limits` |
| Physical slide after touchdown | **Yes**: 1.35 m, mean deceleration 6.8 m/s² | `slideDistM` |
| Contact overrides animation | **Yes**: obstacles O1–O3 in the tackling leg's path (§4) | `obstacle_summary.json` |
| No root teleportation | **Yes**: one state write, the entry at the plant touchdown; after it the momentum residual is ≤ 4.2×10⁻⁴ N·s per step | `momentumResidual` |
| Deterministic execution | **Yes**: `3062e3e24694aaf0` twice | `determinism` |

### Robustness across run-in speeds

| Speed | Hash | First contacts | Glide: knee / thigh / pelvis | Fold-hip overrun | Ankle | Face-down / head |
|---|---|---|---|---|---|---|
| 4.50 | `a0414e08…` | thigh/knee 0.433 → boot 0.458 → shin 0.471 → pelvis 0.496 | 0.65 / 0.00 / 0.19 | 1.8° for 0.55 s | none | **rolls onto front at the end; head 1.55 s** |
| 5.00 | `3062e3e2…` | 0.412 → 0.425 → 0.479 → 0.504 | 0.50 / 0.13 / 0.17 | 3.0° for 1.05 s | tackling 2.5° for 29 ms | no / no |
| 5.50 | `8f286fcd…` | thigh/knee and tackling boot both at 0.392 → shin 0.521 | 0.39 / 0.13 / 0.00 (fold boot 0.20) | 5.1° for 0.08 s | tackling 2.1° for 0.11 s | no / no |

## 2. The RUN → DIVE start transition: your three questions

The video is `START_1x/025x`; the plot is `review/transition_plot.png`.

- **1. Does the final running stride flow directly into the tackle?** Yes, by construction and by measurement.
  - **The final flight is authored.** Every joint is a cubic Hermite with the run's own angle and rate at its last toe-off and the plant state's angle and rate at touchdown, so pose *and* velocity match at both ends. Physics then starts in exactly the last authored state.
  - **Boundary check.** Joint angular accelerations within ±3 frames of each boundary are no larger than the run's own peak over its last stride:
    - at the toe-off: 646,439 °/s², equal to the stride's own peak, which occurs at that same toe-off;
    - at the touchdown: 187,084 °/s².
  - **COM continuity:** at the touchdown the COM moves exactly one step's worth (21 mm at 5.06 m/s).
  - **The cost:** the final flight is 0.100 s, against the run's own 0.129 s. That is a decisive, shortened final step, not a pause.
- **2. Does the whole body participate before take-off?** Partly.
  - **Legs: yes.** The free (tackling) thigh's drive is under way before the plant lands: hip flexion rate about 520 °/s at touchdown, carried in from the run and continued by the authored flight. The plant leg reaches the plant posture.
  - **Arms: yes.** In the flight, the tackling-side arm swings forward (shoulder flexion 11° → 45°) and both arms abduct slightly. After the plant, the fold-side arm goes out (abduction to 37°).
  - **Trunk: not before the plant.** Lumbar flexion and side-bend stay within about 3° during the flight; the side lean (about 9°) only comes during the stance.
  - **Not reproduced:** the start reference's overhead-arm counterweight and trunk lean-back during the last support. The authored flight targets SP2's committed plant posture. Both could be authored into the flight; neither is physically constrained in it.
- **3. Is the momentum physically legitimate?** Yes:
  - **Final flight:** ballistic by construction, from the run's own COM state (COM v_y +0.476 → −0.506 m/s in 0.100 s; horizontal 5.06 m/s unchanged).
  - **After the physical push-off** (take-off at 0.142 s): 37 airborne steps with COM acceleration exactly −9.81 m/s² and zero horizontal acceleration.
  - **Momentum residual:** ≤ 4.2×10⁻⁴ N·s per step after the entry write.
  - **The reference's descent:** at face value, the stylised start reference drops into its seat faster than free fall from a push-off allows (`REFERENCE_SP2A_ANALYSIS.md` S4). SP2A's seat arrives when gravity delivers it, about 0.5 s after the plant.

## 3. The folded leg, reference and SP2

- **Reference (broadcast):** the folded leg is packed under the pelvis, with the shin flat pointing back and the dorsum on the turf (studs away). The pelvis then rolls onto that side, so the lateral thigh and hip take over within 0.10–0.24 s. The lateral knee displacement is INFERRED (hip adduction plus external rotation); this camera cannot measure it.
- **SP2:** the fold enters correctly but is held in abduction. Under load the hip overruns its stop by 8° for 1.1 s, and the knee carries 51% of the glide.
- **SP2A:**
  - The same entry: fold-side first, dorsum down (sole-down cosine −0.45).
  - Once the fold side is down, the leg and seat morph into a 3D tuck (adduction 17°, external rotation 35°, flexion 85°, knee 132°; seat pitch −27°, roll 21°). That cuts the hip overrun from 8° to 3°.
  - It does **not** reduce the knee's glide share (50%), and the tuck is reached at 0.48–0.59 s, **after** the ground entry, not before it.
  - Applying the full tuck before the ground entry (variant F2) made the tackling boot land first and shortened the slide to 0.5 m.
  - The flight is too short (about 0.27 s from push-off to first fold contact) for M1c's finite capability to package the leg before contact.

## 4. Contacts win (obstacles in the tackling leg's path, 5.0 m/s)

| Case | Obstacle | First hit | Obstacle impulse | Tackling leg after 50 ms (hip / knee) | Largest deviation | A6 yield steps | Slide |
|---|---|---|---|---|---|---|---|
| O0 | none | – | – | – | – | 0 | 1.35 m |
| O1 | 5 kg box, glancing | boot 0.613 s | 28 N·s | 0.6° / 0.3° | hip 6.6°, fold knee 11.9° | 302 (fold leg regional failure at 0.89 s) | 1.29 m |
| O2 | 20 kg box | boot 0.563 s | 52 N·s | 0.8° / 2.9° | ankle 23°, hip 7.7° | 115 | 1.09 m (ends face-down) |
| O3 | immovable post | boot 0.563 s | 226 N·s | 5.1° / 7.8° | hip 22°, knee 18°, ankle 31° | 125 | 0.83 m (ends face-down) |

The tackling limb deviates as soon as it is hit, and the authored intent does not push through. Heavier obstructions end in a fall onto the front, which is a physical outcome, not a scripted one.

## 5. What is authored and what is physical

| Element | Authored (kinematic or intent) | Physical |
|---|---|---|
| Run-in up to the last toe-off | RUN-1 animation (frozen tag, read only), geometrically scaled | – |
| Final flight (0.100 s) | Joint, pelvis and arm choreography (C1 Hermite) | The COM arc is gravity only, from the run's own state; the duration follows from the momenta |
| Plant stance, push-off, flight, ground entry, slide | Joint targets (SP2's tracks plus the 3D tuck morph), tracked with finite authority | Every body motion; all contacts and friction; muscle capacity, activation and force–velocity (M1c); A6 yielding; A7 authority falls as the fold side lands |
| Obstacles | – | Contact impulses; the limb yields |

## 6. Owner decisions

1. **Adopt the authored-final-flight architecture** (RUN-1 → authored ballistic flight → physics from the plant) as the way to enter a physical tackle from the run. The alternative is to keep requiring physics to execute the run's last stride, which every structure tried failed at.
2. **Is the knee-dominant glide acceptable?** If not, the next step is a fold posture *before* contact, which needs a longer flight or a faster actuator (M1c's limit), or contact-shaping of the knee collider.
3. **The fold-hip overrun** (3° for about 1 s). Accept it, adjust the hip range, or keep refining the tuck.
4. **The tackling-ankle overrun at its touchdown** (2.5° for 29 ms). Accept it as an impact transient, or add a protective pre-contact ankle posture.
5. **The 4.5 m/s end-of-slide roll-over.**
6. **Running-recipient work stays on hold**, as the brief requires, until you have reviewed SP2A.

## 7. Files

- **Scripts** (`scripts/`):
  - authoring: `sp2a_run1.mjs`, `sp2a_tuck.mjs`, `sp2a_author.mjs` + `sp2a_run.mjs` (structure A);
  - **`sp2a_flight.mjs`** (structure B: the authored final flight and the tackle candidate);
  - `sp2a_wbid.mjs` (whole-body inverse dynamics);
  - search: `sp2a_search.mjs` (CMA-ES; S1–S8);
  - evaluation: `sp2a_eval.mjs`, `sp2a_obstacle.mjs`, `sp2a_transition.mjs`.
- **Renders** (`render/`): `sp2a_render.sh`, `sp2a_pad_clip.mjs`, `sp2a_compose_reference.sh`, `sp2a_review_build.mjs`. The collider wireframe is `slide_phys1/render/sp_wire.mjs`.
- **Evidence** (`evidence/`): `SP2A_opts.json`, `SP2A_eval.json`, `obstacle_summary.json`, `transition_summary.json`, `transition_plot.svg`, `search/searchS1…S8_summary.json`.
- **Outside Git** (`_preserved_2026-10-14_evidence_outside_git/sp2a/`): `reference/` (the start reference), `records/eval|obstacles` (run records), `search/` (full search logs). The reference composites are in `review/local_reference/` (gitignored).

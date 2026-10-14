# SLIDE-PHYS-1 — final report (14 Oct 2026)

Physical football slide tackle for the V2 articulated character. Presentation / physical-character experiment only: nothing here touches the authoritative match simulation, RUN-1 or C3.

**Review page:** `http://localhost:8350/slide_phys1/review/SLIDE_PHYS1_REVIEW.html` (server root `review_artifacts/physical_character_v2/`).
**Working log:** `SLIDE_PHYS1_LOG.md` (every generation, search and variant, as written).
**Reference analysis:** `REFERENCE_ANALYSIS.md`.

## In one paragraph

I replaced Astra's K with a tackler driven entirely through its own muscles and contacts (SP1).

**What works:**
- SP1 starts from a physically consistent running plant-foot touchdown at 4.5–5.5 m/s.
- It carries the run's horizontal momentum into a low bent-leg slide on the fold thigh and hip.
- It sits back onto a posting forearm, with no belly-flop, no hover and no phasing.
- Its ledgers close and it is deterministic.
- Obstacles fold its tackling leg without ever being penetrated.
- Against unchanged C3, the strongest condition produced a sliced-out fall that was not scripted: the near foot was swept away along the sweep and left the turf before the pelvis dropped, and the recipient fell over the slider.

**What doesn't:**
- The tackling heel lands first, as a strut. That inverts the tackling ankle 13.5° past its hard limit and brakes the slide.
- The slide is short (≈ 0.5 m at 4.5–5.0 m/s) and decelerates harder than the literature.
- The pitch balance of the slide is marginal: it lies back at 5.25 m/s, and a light obstacle tips it over.
- The whole-body fallback never fired.
- LIGHT and MODERATE contact also ended in (slow) falls instead of a graded spectrum.

I stopped Stage-1 refinement under **stop condition C**: the remaining defects were not moving under explained single-variable changes, and more search would be unsupported tuning. Three items need an **architectural decision (B)** from you, listed in Q36.

---

## 1. What does the attached reference actually show?

An EA FC playstyle tutorial (vertical edit, 15.1 s, 60 fps) with four segments plus a loop:

1. **Slide Tackle (0.00–3.30 s).** A white defender jockeys beside the navy dribbler, then drops into a sweeping slide through his feet at ≈ 1.75 s. The dribbler's feet are swept out (1.85–1.95 s) and he pitches forward onto his hands. The slider rolls forward onto his hands and is standing again by ≈ 2.6 s.
2. **R1-held tackle (3.37–6.63 s).** A lead-leg slide with the trailing leg folded under. The slider rides the trailing hip and thigh, the trailing hand posts behind, the trunk leans back about 30–45°, and the lead arm is raised.
3. **Slide Intercept.** A sideways "knife": the body is horizontal about 0.1 s after the commit.
4. **Slide Block.** A sideways block with the legs raised.
5. A loop of segment 1.

**Measured from 2D keypoints:**
- Approach is slow: ≈ 1–2.5 m/s in segment 2, and from a jockey in segment 1.
- The hip accelerates horizontally (≈ 1 → 3–4 m/s) while it descends monotonically. There is no spring.
- Commit to hip-on-turf takes 0.17–0.25 s.
- The fold shin and knee touch first, then the hip and thigh.
- The slide is short: 0.35–0.4 s and ≈ 0.4–0.8 m.

## 2. What did you infer versus directly observe?

**OBSERVED:**
- The segment content, contact order, limb configuration and arm use.
- That the hip descends monotonically.
- The roll forward onto the hands, and the dribbler's forward fall onto his hands.

**INFERRED:**
- Real-time playback: no duplicated frames, and the runner cadence is ≈ 3.5 steps/s.
- Camera depression ≈ 45°.
- All speeds and distances: ball scale ≈ 88 px/m, ±30 %.
- Trunk lean of 30–45°.
- That the hip's horizontal surge is mostly pelvis/trunk reorganisation rather than COM acceleration.

**AUTHORING-MODEL CHOICE:**
- Approach speeds of 4.5–5.5 m/s, following the literature (van den Eijnde 2017: 4.5–5.0) and the sim's slide (own speed + 1 m/s), not the slow reference.
- Fold leg = left, tackling leg = right.
- The bent-leg R1 slide shape of segment 2, rather than segment 1's two-legs-forward slide.

Details are in `REFERENCE_ANALYSIS.md`.

## 3. What was wrong with K?

From the audit (`scratchpad` copy; summary in the log §1):
- K's root follows an animation curve that accelerates from 2.5 to 7 m/s at up to 3.1 g, and 63 % of that happens airborne. No ground contact exists to supply that force.
- Its pelvis meets the ground at −1.6 m/s and is stopped at 7.3 g, which is a belly-flop.
- In PVP-0 the K tackler belly-flopped even when alone.
- Its motion reference was a Roblox clip.
- L, the latest candidate, has the same structure. There is no K2.

## 4. Did you retain K, modify it, or replace it?

**Replaced.**
- **Kept:** the intent of a bent-leg slide with the fold leg tucked and the tackling leg extended.
- **Not kept:** any root/COM curve.

The new choreography is joint-space intent only, executed by muscles against real contacts.

## 5. What is the final tackle choreography?

SP1 at 5.0 m/s; t = 0 at the plant-foot touchdown.

| t (s) | what the body does |
|---|---|
| 0–0.09 | **Commit / plant.** The fold (left) knee yields 22 → 45°. The plant pushes the COM sideways toward the tackling side (3.5 m/s² lateral support plan) and rolls the pelvis 11° to the fold side. |
| 0.05–0.22 | **Thigh drive.** The tackling hip drives 0 → 82°. Its knee follows the actual hip angle (proprioceptive coupling, 30 ms prediction), extending from 115° to 15° as the thigh comes through. The foot peaks at 13 m/s. |
| 0.05–0.28 | **Fold.** The fold leg sweeps back and under: knee 90° by 0.18 s, then 126°. Hip external rotation −44° and abduction 14° fold it laterally — the asymmetric scissor. |
| 0.12–0.30 | **Arms.** The tackling-side arm goes forward (60°). The fold-side arm abducts 41° and reaches back to post. |
| 0.12–0.7 | **Trunk.** The lumbar extends to −19° and the pelvis pitches back: sit-back. |
| 0.2–0.37 | **Flight.** Ballistic descent: v_y goes −0.7 → −2.2 m/s at −9.8 m/s². |
| 0.367 | Tackling heel strikes the turf. |
| 0.462 | Fold thigh lands: **ground entry**. |
| 0.525 | Fold shank lands. |
| 0.746 | Pelvis lands. |
| 0.821 | Posting forearm lands. |
| 0.27–1.07 | **Leading-leg press** (tactile-gated, contact ≥ 0.3 m ahead of the COM): 0.18 BW into the turf, pelvis pitch −21°, roll 12°. |
| → 1.4 | The slide stops, then a follow-through lie-back on the forearm. |

## 6. What is the physically valid committed-entry state?

`E-PLANT5B` (`evidence/sp1/SP1_entry_5.json`, `scripts/sp_entry.mjs`): the plant (left) foot touching down in a 5 m/s run.

**Pose and velocities:**
- COM at 1.064 m, moving at (−0.25, −0.49, 5.02) m/s.
- Plant knee 22°, flexing at 150°/s.
- Swing (tackling) leg at mid-swing: knee 118°, hip flexing at 450°/s.
- Arms in running counter-swing.
- Plant sole 0.5 mm above the turf, moving at (−0.29, −1.91, −0.58) m/s: a normal running touchdown.

**Why it is self-consistent:**
- Every body's velocity comes from the central difference of two exact V2 FK poses, so it is joint-consistent.
- It is written once, at activation. That is the documented 398 N·s / 1081 J entry in the ledger.
- The muscle state is computed on the true entry state (the SoloPlant fix).
- There is no mid-air start and no velocity reset.

## 7. What would future RUN-1 need to supply?

RUN-1 was not modified. A RUN → SLIDE hand-over needs:
- **Timing:** a fold-side plant touchdown about 0.37–0.46 s before the wanted boot / thigh contact. The commit must be decided before that touchdown.
- **Speed:** 4.5–5.5 m/s. SP1 is not qualified outside that range.
- **Swing leg:** the tackling leg at mid-swing, coming through (hip flexion rate ≈ 450°/s, knee ≈ 120°).
- **Plant leg:** plant knee ≈ 20–25° and yielding; COM ≈ 1.06 m, descending ≈ 0.5 m/s.
- **State:** joint-consistent body velocities, plus the M1b/M1c activation state, for continuity rather than re-initialisation.
- **Context:** heading and side.
- **Not yet supported:** the mirrored (right-fold) version and slower approaches (the reference's 1.5–3 m/s).

## 8. How is authored root/COM intent physicalised?

It is never written to the root. Planned quantities become forces through the legs:
- the COM height plan (κ(t));
- the lateral support acceleration;
- the pelvis orientation targets.

**How:**
1. Jacobian-transpose support objectives turn these into joint-torque intents: through the plant leg during the commit, and through the tackling leg's press during the slide, tactile-gated.
2. A SIMBICON-style stance-hip torque (net of the free hip / lumbar intents) handles orientation.
3. These intents, plus PD tracking of the choreography and Newton–Euler feed-forward, set M1b/M1c excitation.
4. Muscle torque acts on the rigid bodies, and the COM moves only by contact forces.

**Authority:** finite and regional (A5).

## 9. What generates horizontal momentum?

The run. The entry carries 5.02 m/s, and the plant and flight keep 4.85–4.94 m/s. The plant adds no forward impulse; its push is lateral.

The reference's hip "surge" is reproduced only as a pelvis/trunk reorganisation, not as COM acceleration (INFERRED to be the same in the reference).

## 10. What controls vertical descent?

The plant-leg support objective:
- holds the COM against the planned κ profile until 0.09 s, then yields;
- after that, gravity takes over (flight from ≈ 0.2 s).

The landing is absorbed by:
- the tackling heel (peak 9.6 BW at 0.40 s, a strut);
- the fold thigh (peak 10.6 BW at 0.46 s), then the fold shank, pelvis and forearm.

The peak total ground force is 12.0 BW, at 0.46 s.

## 11. Horizontal velocity at ground entry (fold thigh)

**3.67 m/s at 5.0** (3.33 at 4.5; 3.66 at 4.75; 3.97 at 5.25; 3.82 at 5.5). Just before the tackling heel strikes it is 4.94 m/s.

## 12. Vertical velocity at ground entry

**−1.67 m/s at 5.0** (−1.95, −1.94, −1.77, −1.58 at 4.5, 4.75, 5.25, 5.5).

|v_y|/v_h = 0.46 (0.41–0.58). For comparison, the literature's peak horizontal/vertical *force* ratio at hip impact is 0.37–0.46. SP1's thigh force ratio sits at the Coulomb limit of 0.5.

## 13. What is the ground-contact sequence?

**SP1:** plant boot (0) → **tackling heel (0.367 s)** → fold thigh (0.462) → fold shank (0.525) → pelvis (0.746) → posting forearm (0.821).

**Reference and literature:** fold shin/knee, then hip/thigh, with the tackling leg lying along the turf.

**Difference:** SP1's tackling heel lands first. This is the main remaining defect: it causes the ankle overload (Q23) and much of the braking (Q15).

## 14. How much horizontal momentum survives ground entry?

| moment | v_h (m/s) | share of pre-strike speed |
|---|---|---|
| Before the heel strike | 4.94 | 100 % |
| Fold-thigh entry | 3.67 | 74 % |
| 0.6 s | 1.62 | 33 % |
| 0.8 s | 0.61 | 12 % |

## 15. What causes slide deceleration?

Three causes:

1. **Coulomb friction under the fold thigh and pelvis.** μ 0.5; the measured horizontal/vertical force ratio is exactly 0.50.
2. **The tackling boot dragging on its studs.** Horizontal/vertical up to 1.44. The sole faces the turf for 80–93 % of the boot's load, so the TCF-1 rule keeps the studded μ 1.2.
3. **The heel-strike strut.** 9.6 BW with horizontal/vertical 1.1, which turns forward momentum into vertical load.

The mean deceleration from entry to 0.8 s is ≈ 9 m/s², above the literature glide estimate of μg = 3.9–7.8 m/s².

## 16. How far does the character slide?

COM travel after ground entry:

| approach (m/s) | slide (m) |
|---|---|
| 4.5 | 0.42 |
| 4.75 | 0.50 |
| 5.0 | 0.52 |
| 5.25 | 0.14 (lies back) |
| 5.5 | 1.14 |

For comparison:
- reference: ≈ 0.4–0.8 m, at a much slower approach;
- literature estimate: 0.3–1.8 m;
- the sim's slide (`pt_defend.js`): ≈ 2.3 m — **a mismatch to resolve at integration**.

## 17. Does it belly-flop?

**No.** The minimum belly normal is −0.17 to −0.25, and there are no face-down steps at any Stage-1 speed. Under contact (MODERATE), the slider rolls forward onto its hands after being stopped, which is also what the reference's slider does in segment 1.

## 18. Does it hover?

**No.** Turf contacts carry the weight: vertical turf impulse is 1583 N·s against 1548 N·s of gravity over 2 s. Turf penetration is ≤ 2.5 mm at 5.0 m/s (7.6 mm at 4.5, at the heel strike).

## 19. Does it remain recognisable as the intended tackle?

**Yes, as a bent-leg slide.** Fold leg tucked, tackling leg extended low ahead, sitting back, trailing forearm posting. See `SP1_IP_*` and `CMP_SOLO_*`.

**Less fluid than the reference.** The heel strike and the stop are abrupt, and there is no visible glide. On the touchline camera it reads as a slide tackle; up close, the stop gives it away.

## 20. How does motor authority change through the action?

**A5** (`scripts/sp_authority.mjs`):

| region | authority |
|---|---|
| Everything, commit through entry | 1.0 |
| Tackling hip / knee / ankle | 0.6 by 0.55–0.70 s, then 0.45 by 0.8–1.0 s |
| Arms | 0.6 by 0.6–0.9 s |
| Trunk, hips, fold leg | 0.9 by 0.8–1.1 s |

**Local yield:** e0 12° on the tackling-leg axes from 0.5 s (the stiffness term saturates).

**Whole-body fallback:** rms tracking error > 30° for 60 ms makes authority decay to 0.12 with τ 80 ms. This keeps every transform, velocity, contact and muscle state.

**Rejected models:**
- A1–A3 (a global phase schedule, or a constant 0.6) failed: with reduced trunk authority the trunk pitches forward.
- A4 (A5 without the fallback) gives the same Stage-1 results as A0.

## 21. Can the tackling leg yield to an obstacle?

**Yes.** Stage 2 at 5.0 m/s placed boxes in the boot's path:

| case | obstacle | what the leg did |
|---|---|---|
| O1 | 3 kg box | ankle 29° / hip 17° off the reference; the box is knocked away |
| O2 | 15 kg box | knee pushed 77° off |
| O3 | 60 kg box | knee folded 128° |
| O4 | immovable box | knee folded 131° |
| O5 | static wall | knee 31°, body stopped |

Obstacle penetration is ≤ 1.2 mm in every case: the animation never pushes through.

## 22. Can severe disruption produce larger yielding / ragdoll?

**Not demonstrated.** Severe obstacles produced large *local* yielding (knee folded 131°). The whole-body fallback never fired, because post-hit rms error peaked at 28.5° against a 30° threshold: a whole-body rms dilutes one folded knee.

A related finding: the tackling leg's local yield is active on some axis in *every* step of the normal slide, so it is not a disturbance-only mechanism.

**What it needs:** both mechanisms need redesigning as regional, disturbance-relative triggers.

## 23. Any joint-limit failures?

**Yes, one real one.** Measured in the plant's own constraint coordinates (`scripts/sp_climits.mjs`), the tackling ankle inverts 13.5° beyond its hard limit for 0.38 s at the heel strike (5.0 m/s). By speed:
- 5.7° at 4.5 m/s;
- 12.5–16.6° at 4.75–5.5 m/s;
- up to 18.3° in Stage 3.

Contacts win, so this is physically consistent, but it is an inversion-sprain load.

**Smaller excursions:** knee_L 2.6° for 0.14 s and hip_L 1.5° for 0.29 s.

**Not a failure:** the anatomical decomposition's shoulder_R abduction of −34° is an artefact. There is no constraint violation.

## 24. Any phasing?

**No.**
- Turf penetration ≤ 2.5 mm (7.6 mm peak at 4.5).
- Joint-anchor separation ≤ 2.2 mm.
- Obstacle depth ≤ 1.2 mm.
- Cross-character contacts are exactly equal and opposite (dJ = dH = 0 every step).
- Stage-3 turf penetration ≤ 2.5 mm.

## 25. Any solver problems?

**None found.**
- Everything stays finite; peak body speed is 13.6 m/s (the tackling foot's swing).
- Runs are deterministic.
- Solver energy creation is ≤ 0.55 J per step (1.5–2.3 J per 2 s run).

## 26. Is M1b adequate for this athletic action?

**No, for the fast shortening of the tackling hip.** At full excitation, M1b's shortening torque falls to ≈ 0 above 4–5 rad/s. For hip flexion, that is 0 N·m at ≥ 4 rad/s against a Hill capacity of 95 N·m.

**Cause:** the short-range stiffness and its damping act on the full joint velocity (`evidence/m1b_effective_fv.json`).

**M1c** weights that short-range term by λ = 1/(1 + (v_sh/ω_c)²), with τ_cb = 20 ms, and restores the Hill capacity (`evidence/m1c_effective_fv.json`).
- It is used for the tackler only.
- It is **not adopted**; C3 stays on M1b.

Force development (τ_rise ≈ 135 ms) also forces anticipation, through feed-forward with a lead.

## 27. Did turf/body contact require changes?

**No friction was lowered.**
- V2 values are unchanged: boot|turf 1.2, body|turf 0.5, hand|turf 0.7.
- Skin/kit-on-turf research (FIFA tests: 0.35–0.75) supports body 0.5.

**One added rule, labelled, tackler only: TCF-1.** A boot's studs (μ 1.2) apply only when its sole faces the turf within 35°, blending to μ 0.5 (the upper / side of the boot) by 55°. It is not adopted for canonical use.

## 28. What failed candidates were tested?

All are preserved.

| family | candidates |
|---|---|
| Earlier work | RDS-1…4 (hip "asked 260 got 64 N·m"; fell forward) |
| Astra | K / L (audited) |
| Hand-built generations | G1–G24 |
| CMA-ES searches | S1 (8.0), S2 (1.01 → SP1), S3 (2.12), S4 (2.94), S5 (stopped, no progress) |
| Explained variants (G25) | hold, trunk counter-flexion, seat objective × 4, hold-only × 2 |
| Authority models | A0–A5 |

Generation renders: `review/video/generations/`.
G25 render: `review/video/G25_REJECTED_*`.
Ledgers: `evidence/generations.json`, `evidence/search*_log.json`, `evidence/G25_variants_log.txt`.

## 29. What did each teach us?

**Generations G1–G24:**
- **G1–G13:** a planted fold with full support makes a seated fall; without support it makes a dive. The commit must be a yielding plant that hands over to flight.
- **G14:** the entry muscle-state defect — the parked zero-velocity state made the first command wrong. Fixed.
- **G15–G16:** the M1b force–velocity defect, and M1c.
- **G16–G17:** thigh–thigh collision stalls the swing; fixed by swing abduction.
- **G17–G18:** force development lags ≈ 135 ms, so time-keyed targets run ahead.
- **G19–G20:** proprioceptive coupling (the knee follows the actual hip).
- **G21–G22:** friction below the COM pitches the body forward. The support's centre of pressure must be ahead of the COM, so the slider must sit back and the leading leg must press. The press needs a tactile gate placed ahead of the COM.
- **G23–G24:** roll needs a lateral plant push, and the system is chaotically sensitive, so one-at-a-time hand tuning does not converge.

**Searches:**
- **S1–S2:** a physics-in-the-loop search over meaningful intent parameters finds a credible slide.
- **S3–S5:** the stud drag and the ankle overload are not removable within this controller structure.

**G25:**
- The anatomical limit audit was misleading; the constraint-space audit is the right measure.
- The slide's pitch control rides entirely on the tackling-leg press. Holding that leg up (which fixes the ankle) removes the control and the body falls back.
- A seat objective through the fold hip cannot replace it, because that hip is at its limit.

**Authority models:** trunk authority must stay high; yield and fallback must be regional.

## 30. If C3 was introduced, what happened at light / moderate / heavy contact?

C3 was unchanged and is the recipient in every case. The tackler travels −z from the recipient's left; the boot meets the line 0.08 s after its own touchdown. Times below are after the tackler's activation.

| condition | first contact | recipient outcome | slider |
|---|---|---|---|
| **LIGHT** (4.5 m/s, line +0.12 m toward the toes) | 0.43 s, boot × boot, 248 N·s, peak 6.0 kN spike | Displaced (feet 0.87–0.89 m); stands ≈ 1.2 s; then falls *against* the sweep | Lies back |
| **MODERATE** (5.0, through the near foot) | 0.41 s | Stands over the slider's legs ≈ 1.3 s; trips and lands across its back (fall 1.77 s after contact) | Stopped by the boot; rolls forward onto its hands |
| **GRAZE** (4.5, +0.20 m; added) | 0.44 s | ABSORBED: the slider stops against the boots and its boots press them down (−182 N·s); the recipient stands | Sits against the recipient's feet |
| **STRONG** (5.5, 0.05 m toward the heel) | 0.40 s | Near foot swept 1.52 m along the sweep, off the turf 0.68 s after contact; pelvis drops 0.15 m at 1.14 s after contact; falls **along** the sweep over the slider | — |

**CALIB:** the recipient stands undisturbed (pelvis 0.912 → 0.913 m).

**Horizontal impulse.** LIGHT delivered 263 N·s of horizontal impulse to the recipient (190 N·s in the first 0.2 s of contact). SUPPORT-1's recipient falls from ≈ 48–80 N·s, so "LIGHT" was never light. When the slider's boot is stopped by the recipient's boot, the slider's whole momentum (≈ 280 N·s at 3.6 m/s) goes into that foot.

**GRAZE** (added after the first three runs; LIGHT kept as run): 4.5 m/s, line +0.20 m toward the toes, so only the boot tips can meet.
- Outcome: ABSORBED. The recipient's feet move 2 cm and its COM 1.4 cm.
- Why: the slider slides into the boots and stops against them. Its boots press **down** on the recipient's boots (−182 N·s vertical), and the feet stay anchored by the extra friction.
- That is PVP-0's "statue" mechanism (pinning from above), not a clean glancing contact.

Summary: `evidence/stage3/stage3_summary.json`.

## 31. Did the support-loss / sliced-out response emerge naturally?

**Partially.**
- **STRONG:** shows the sliced-out signature, unscripted. Support is taken from under the body: the foot leaves the turf before the pelvis drops, and the fall goes along the sweep over the slider.
- **The spectrum is not graded.** LIGHT and MODERATE also end in falls, slowly, 1.2–1.8 s after contact. They are not absorb/recover outcomes. LIGHT delivered 3–5× SUPPORT-1's fall threshold in horizontal impulse.
- **The one absorbed case (GRAZE) is absorbed for the wrong reason:** the slider's boots press down on the recipient's boots.
- **Even STRONG is slower than the reference.** The reference dribbler pitches forward within ≈ 0.2–0.45 s.

The slow topples are consistent with C3 having no stepping or protective response. I did not touch C3.

## 32. Did either character become pinned unnaturally?

**Yes, in GRAZE.** The slider's boots end on the recipient's boots and press them down (−182 N·s vertical on the recipient), so the recipient stands as a statue. That is PVP-0's anchoring mechanism, which reappears when the slide stops *at* the feet instead of sweeping *through* them. It follows from the short slide (Q16).

**Not in LIGHT, MODERATE or STRONG.** Their vertical cross impulse is small (−61, +65, −34 N·s).

In MODERATE, the recipient stands over the slider's legs for ≈ 1.3 s before falling. Then the two lie piled together, which is why that contact lasts 3.3 s. It reads as a slow trip, not a pin.

## 33. Momentum / energy accounting?

**Stage 1, after the activation write** (398 N·s / 1081 J, the documented entry):
- linear residual 0 N·s;
- angular ≤ 0.1–0.3 N·m·s per step;
- turf work −1130 to −1390 J (dissipative);
- solver energy creation ≤ 0.55 J per step.

**Stage 2:** obstacle impulses are ledgered as external.

**Stage 3:**
- equal-and-opposite exact (dJ = dH = 0);
- system residual after activation ≤ 0.0003 N·s and ≤ 0.085 N·m·s.

## 34. Determinism?

**Yes.**
- SP1 / A5 / 5.0 reruns give hash `8f2fbbf0bed38c95` both times.
- All six Stage-2 cases reproduce their hashes on rerun.
- Tool additions leave Stage-1 hashes unchanged: the constraint audit subclass, the seat option and G23's `frameYaw` / `tOffset` defaults (S2-best `0383f9521243968a`).

## 35. CPU?

**One character (Stage 1, 1/240 s steps):** 0.85–1.08 ms per step including research ledgers.

| stage | ms per step |
|---|---|
| Jolt step | 0.30 |
| Passive | 0.26 |
| Tone | 0.12 |
| Controller | 0.12 |
| Actuators | 0.05 |
| Development-only ledgers / measurement | 0.21 |

That leaves ≈ 0.75 ms per step at runtime, ≈ 18 % of one core per character at 240 Hz in JS.

**Two characters (Stage 3):** 3.0 s wall per 1300 steps.

**Path to 22 players:** plausible only if the articulated plant runs just for the 1–3 players in physical contact (others stay kinematic), possibly at 120 Hz (not tested). It is not plausible for all 22 at 240 Hz in JS.

## 36. What remains before production integration?

**Architectural decisions for you (stop condition B):**
1. **Slide pitch control.** The slide needs a whole-body (centroidal / seated-balance) controller that does not depend on the tackling leg pressing the turf. Today, freeing the leg (which fixes the ankle) loses balance. This is the same class of problem as BALANCE-3's coordination: a new controller class, not a parameter.
2. **Adopt M1c** (athletic shortening force) and **TCF-1** (sole-orientation studs) for V2, or not.
3. **Fallback and yield** must become regional, disturbance-relative triggers.

**Then:**
- Fix the contact order so the fold knee/thigh lands before the tackling heel, and remove the ankle overload.
- A longer, glide-like slide.
- Robustness at 5.25 m/s and beyond 5.5.
- Slower approaches (2–4.5 m/s, the reference).
- The mirrored side.
- Get-up / recovery.
- Resolve the sim/physics slide-length mismatch (2.3 m vs 0.4–1.1 m).

## 37. What remains before RUN → SLIDE?

- A hand-over module that takes RUN-1's actual plant touchdown (Q7) and starts SP1 from it with muscle-state continuity. Not built; RUN-1 is frozen and untouched.
- A test that the commit lead time (0.37–0.46 s to contact) can be scheduled from sim facts.
- A slower-approach version.

## 38. What remains before authoritative PVP integration?

- **Interface.** The sim decides the tackle and its outcome; physics must explain it. That needs a placement and timing layer so that the boot meets the feet when and where the sim says, using only allowed inputs.
- **Recipient.** A recipient layer with protective stepping or reflexes, so light contact can be absorbed and strong contact is fast.
- **Reconciliation.** A rule for when the physical outcome disagrees with the sim's.
- **Cost.** The cost at scale (Q35).
- **Decisions.** All of Q36.

## 39. What surprised you?

- M1b's own damping cancels its force–velocity curve at athletic speeds.
- The anatomical-angle audit flagged a shoulder violation that isn't one, while the real failure (the ankle) was only visible in constraint space.
- Giving the fold hip a balance job made things *worse*: it was already at its limit.
- A5's "local yield" is never off, and its whole-body fallback never fires.
- The sliced-out fall emerged only in the strongest condition, and looks like the reference's.
- A sliding tackler that is *stopped* by a boot hands over almost all its momentum. A "light" contact is therefore not light unless the slide carries on past the feet. When it doesn't (GRAZE), the slider's boots pin the feet from above, as in PVP-0.
- The reference's approach is much slower (≈ 1.5–3 m/s) than the literature and the sim assume.

## 40. Exact commits / files / review URL

**Branch:** `prototype/physical-character-v2` (local; pushed only under the daily publication rule).

**Commits:**
- `b6fc8180` — 14 Oct 01:10 checkpoint: scripts, G1–G24, S1.
- `a4cbf503` — 14 Oct ≈ 02:58, the final SLIDE-PHYS-1 commit: SP1, G25, Stage 2, Stage 3 (including GRAZE), review page, this report.
- The follow-up commit that fills in this hash.

**Files:**
- **Reports:** `review_artifacts/physical_character_v2/slide_phys1/`: `SLIDE_PHYS1_REPORT.md`, `SLIDE_PHYS1_LOG.md`, `REFERENCE_ANALYSIS.md`.
- **Scripts:** `scripts/` (`sp_*.mjs`; final tackler = `sp_param.makeCand(toPhys(evidence/sp1/SP1_u.json))` + `sp_authority` A5).
- **Tools:** `tools/` (`variant.mjs`, `runparam.mjs`), `render/` (`sp_clip.mjs`, `sp_capture.cjs`).
- **Evidence:** `evidence/` (`sp1/`, `stage2/`, `stage3/`, `G25_variants_log.txt`, `search*_log.json`, `m1b/m1c` FV, `generations.json`).
- **Review:** `review/SLIDE_PHYS1_REVIEW.html`, `review/video/` (own renders).

**Outside Git:**
- `review/local_reference/` (gitignored: composites containing the third-party reference).
- `_preserved_2026-10-13_evidence_outside_git/slide_phys1/` (reference video, pose data, all run records with SHA-256 sums, search-5 state).

**Review:** `http://localhost:8350/slide_phys1/review/SLIDE_PHYS1_REVIEW.html`.

---

```
REFERENCE MOTION UNDERSTOOD: YES
SINGLE-PLAYER PHYSICAL SLIDE: PARTIAL
GROUND ENTRY AND SLIDE: PARTIAL
PHYSICAL INTERRUPTIBILITY: PARTIAL
TWO-PLAYER CONTACT (IF RUN): PARTIAL
SLICED-OUT RESPONSE EMERGES WITHOUT SCRIPTING: PARTIAL
READY FOR NEXT INTEGRATION MILESTONE: NO
RECOMMEND FOR CANONICAL V2: NOT YET
```

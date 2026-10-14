# SP2A body-friction sweep: diagnostic only

- **Instruction:** `sources/2026-10-14_user_instruction_sp2a_body_friction_sweep.md` (commit `97baba7a`).
- **Review page:** `review/FSWEEP_REVIEW.html` (served at `:8350/sp2a/fsweep/review/FSWEEP_REVIEW.html`).
- **Evidence:** `evidence/fsweep_summary.json` (all measures and ledgers), `evidence/fsweep_tracks.json` (COM tracks).
- **Records:** outside Git, in `_preserved_2026-10-14_evidence_outside_git/sp2a/fsweep/records/`.

**DO NOT ADOPT ANY VARIANT YET.** I have stopped for your visual review. The running recipient, C3, the SP2A choreography, M1c and TCF-1 are all untouched.

## Setup

**Frozen SP2A.** The candidate is `sp2a/evidence/SP2A_opts.json` on the 5.0 m/s RUN-1 run-in. Its authored flight, tuck, controller, muscles, limits, entry and geometry are unchanged. Every condition runs 6 s (1440 steps); SP2A's own evaluation stopped at 2 s.

**Only one thing changes:** the friction of **non-stud** tackler–turf contacts, scaled by a multiplier m. This is a diagnostic contact-material separation (`scripts/fs_contact.mjs`), not canonical V2. It wraps the engine's contact listener *after* TCF-1:

| Contact | μ in the run |
|---|---|
| Non-boot bodies (shin, knee, thigh, pelvis, torso, arms, forearms, hands) | m × μ_spec (body 0.5, hand 0.7) |
| Boots | m·0.5 + (1.2 − m·0.5)·k, where k is TCF-1's own sole-orientation weight |

- A properly sole-down boot (k = 1) keeps TCF-1's studded μ 1.2 exactly. A boot on its side or upper (k = 0) gets m × 0.5.
- **m = 1 reproduces SP2A bit-for-bit:** hash `3062e3e24694aaf0` at 2 s, both with and without the wrapper.

**The ledger** (`scripts/fs_measure.mjs`) uses SP2's region classifier. For every contact it records the normal impulse and the **tangential braking impulse** (the horizontal friction impulse opposed to the COM's horizontal velocity). Boots are split by TCF-1's k: stud-engaged (k ≥ 0.999) against partial/upper/side.

On flat turf every horizontal external impulse is a contact tangential impulse. Muscles, joint limits and constraints are internal and cannot change the COM's horizontal momentum. So the ledger must close against M·Δv_h, and it does: to **≤ 0.19 N·s** in every condition.

## Comparison

| Variant | Body friction multiplier | Slide distance (COM path, entry → stop) | Stop time (from the plant) | Avg decel (entry → stop) | Peak decel (29 ms) | Knee braking | Thigh braking | Hip braking | Arms/hands braking | Stud engagement (after push-off) |
|---|---|---|---|---|---|---|---|---|---|---|
| **F100** | ×1.00 | 1.80 m | 2.49 s | 2.26 m/s² | 36.7 m/s² | 189 N·s (50%) | 78 (20%) | −1 (0%) | 3 (1%) | none (either boot) |
| **F75** | ×0.75 | 2.39 m | 1.93 s | 3.20 | 31.0 | 132 (34%) | 73 (19%) | 104 (27%) | 3 (1%) | none |
| **F50** | ×0.50 | 3.86 m | 2.16 s | 2.78 | 20.0 | 117 (30%) | 56 (15%) | 75 (19%) | 17 (5%) | none |
| **F25** | ×0.25 | 8.86 m | 4.12 s | 1.33 | 10.8 | 108 (28%) | 30 (8%) | 89 (23%) | 40 (10%) | none |
| **F10** | ×0.10 | ≥ 19.6 m | not stopped by 6 s (2.1 m/s) | 0.52 | 4.4 | 60 (26%) | 10 (4%) | 64 (28%) | 35 (15%) | none |
| **F0** | ×0.00 | ≥ 28.1 m | never decelerates (5.03 m/s) | 0 | 0 | 0 | 0 | 0 | 0 | none |

**Speed-loss timing.** The table's average deceleration hides the shape, so here is v_h after ground entry, with the time to lose 50% and 90% of the entry speed:

| Variant | Entry | +0.25 s | +0.5 s | +1.0 s | 50% / 90% lost by |
|---|---|---|---|---|---|
| F100 | 4.78 | 2.23 | 1.06 | 0.27 | 0.24 / 0.64 s |
| F75 | 4.94 | 2.92 | 2.08 | 0.37 | 0.39 / 0.95 s |
| F50 | 4.94 | 3.63 | 3.09 | 1.87 | 0.78 / 1.57 s |
| F25 | 5.01 | 4.34 | 4.08 | 3.43 | 1.77 / 3.38 s |
| F10 | 5.02 | 4.76 | 4.66 | 4.39 | 4.83 s / not reached |
| F0 | 5.03 | 5.03 | 5.03 | 5.03 | not reached |

**Knee: load versus braking (F100, entry → stop).**

| Region | Normal impulse (share) | Braking (share) |
|---|---|---|
| Knee | 435 N·s (24%) | 189 N·s (50%) |
| Hip/pelvis | 505 N·s (27%) | about 0 |

The knee is down during the fast phase. The hip loads mostly after the body has slowed.

**Which variant looks closest to the reference:** F50. It slides seated and keeps going until about 1.2 s, and its deceleration over the first second (3.1 m/s²) sits inside the reference's lying-phase band of 2.5–3.3 m/s². This is a visual and diagnostic judgment, **not** evidence that ×0.5 is the physically correct coefficient.

## Answers

1. **Does reducing non-stud body friction materially increase slide distance?** Yes. The slide grows from 1.80 m (F100) to 2.39, 3.86 and 8.86 m, then ≥ 19.6 m (F10) and ≥ 28.1 m (F0). At F0 the body does not decelerate at all after ground entry.

2. **Is the relationship approximately monotonic?** Yes for distance, and for the time to lose 50% / 90% of the entry speed. It is not monotonic for stop time or for the entry → stop average deceleration. F100 sheds 90% of its speed by 0.64 s, then creeps at 0.2–0.3 m/s for about 1.5 s while it rolls over.

3. **Does the tackle begin to visually "glide" rather than grab the turf?** Partly.
   - F100 grabs: half its speed is gone 0.24 s after ground entry.
   - F50 and F25 keep sliding seated for longer.
   - But the lower the friction, the sooner the body rolls past its side onto its front: F25 at 1.17 s, F10 at 1.12 s, F0 at 1.07 s, against F100 at 2.31 s. Much of the extra distance is covered face-down.

4. **Which body regions currently produce most of the braking?** In F100:
   - knee 50%;
   - thigh 20%;
   - boots on heel/upper/side 18% (the tackling boot's heel and upper about 49 N·s, the folded boot's upper about 23 N·s);
   - torso 7%;
   - shin/calf 4%;
   - hip/pelvis about 0;
   - arms about 0;
   - forearms/hands 1%.

   Most of it happens in the first 0.6 s after entry (4.78 → 0.69 m/s). Every contacting region slides there at the full Coulomb ratio (braking/normal ≈ μ = 0.5).

5. **Are hands/forearms significant brakes in F100?** No: 4.8 N·s (1%) of braking for 61 N·s of normal impulse. The hands have the spec's highest non-boot μ (0.7), but they touch mostly late, at low speed.

6. **Is the knee's ~50% load share responsible for substantial braking, or mainly normal support?** Responsible. The knee does 50% of the braking on 24% of the normal impulse, because it is the region on the turf during the fast phase. The hip/pelvis is the opposite case: 27% of the normal impulse and about 0% of the braking. The difference is *timing*, not load.

7. **At what friction range does the slide begin to resemble the reference?** Around ×0.5 (F50; body μ ≈ 0.25, hands 0.35).
   - Over the first second after entry it decelerates at 3.1 m/s². The reference's lying slide is 2.5–3.3 m/s² (μ_eff 0.26–0.34) on a pitch that looks wet.
   - No condition ≥ F50 reproduces the reference's first 0.25 s of knee-glide with almost no speed loss. The landing impact alone costs F50 1.3 m/s in its first 0.25 s (the landing's normal impulse × μ).

8. **At what point does it become obviously too slippery?** F25 and below.
   - One second after entry the body still moves at 3.4 m/s (F25), 4.4 m/s (F10) and 5.0 m/s (F0).
   - F25 slides 8.9 m from a 5 m/s entry. The reference covers 7.5 m from 9 m/s before getting up.

9. **Does lowering body friction expose another braking mechanism?** No.
   - The ledger closes to ≤ 0.19 N·s, and at F0 v_h stays at 5.03 m/s for 5.6 s.
   - Muscles, joint limits, impact redirection and the solver add nothing measurable to horizontal braking.
   - Lowering friction does expose a rotational problem: the earlier roll onto the front, and a growing fold-hip limit excursion (question 11).

10. **Do the tackling studs remain correctly disengaged in every normal run?** Yes, in every condition. Neither boot engages its studs after the plant push-off: the stud-engaged normal impulse is 0 for both. The tackling boot touches only on its heel, upper or side, and those contacts are part of the scaled group.

11. **Does any condition introduce instability, pathological rotation or joint-limit problems?**
   - **No numerical instability:** every run is finite, completes 6 s, and is deterministic.
   - **Pathological rotation: yes, in every condition, F100 included.** F100 rolls onto its front at 2.31 s, just after SP2A's 2 s evaluation window. That corrects the SP2A report's "no face-down at 5.0 m/s"; see `../SP2A_REPORT.md`, correction note. It happens earlier as friction drops.
   - **Fold-hip constraint excursion grows:** 3.0° (F100) → 5.0 → 7.1 → 9.0 → 9.2 → 10.0° (F0), each for about 1.1–1.3 s.
   - **Peak hip/pelvis load rises** from 1.3 to 5.2 BW.
   - **The tackling-ankle excursion shrinks** (2.5° → 1.6°).

12. **Based solely on this diagnostic, is non-stud body/turf friction the principal remaining cause of insufficient slide distance?** Yes.
   - All of the slide's braking is non-stud body friction: knee, thigh and boot uppers during the landing phase. The studs play no part, and removing that friction removes all the deceleration.
   - Whether body|turf 0.5 is the right value is a calibration question; the reference suggests μ_eff ≈ 0.3 on a likely wet pitch.
   - Lowering friction alone does not give a clean glide, because the roll onto the front arrives sooner.

---

BODY FRICTION EXPLAINS SHORT SLIDE: **YES**
LOW-FRICTION BODY CONTACT PRODUCES DESIRED GLIDE: **PARTIAL**
OTHER MAJOR BRAKING MECHANISM FOUND: **NO**
BEST VISUAL DIAGNOSTIC VARIANT: **F50**
**DO NOT ADOPT ANY VARIANT YET.**

## Files

- **Scripts** (`scripts/`):
  - `fs_contact.mjs`: the diagnostic friction separation and the run hook;
  - `fs_run.mjs`: the runner;
  - `fs_measure.mjs`: measures and ledger;
  - `fs_tracks.mjs`: COM tracks.
- **One opt-in addition to SP2A's code:** `sp2a_flight.mjs` `runFlight(…, runOpts)` passes a setup hook to the run. The motion is unchanged, and F100 is identical.
- **Renders** (`render/`): `fs_render.sh` and `fs_compose_reference.sh`. The opt-in `--fsweep` data layer is in `slide_phys1/render/sp_clip.mjs`, and the `diag` overlay in `sp_capture.cjs`.
- **Review page:** `fs_review_build.mjs`.
- **Videos** (`review/video/`, in Git): five views per condition (switchable at the same time position) and the six-condition grids.
- **Local only** (`review/local_reference/`): the retimed broadcast reference and the REFERENCE | six-condition composites.
- **Page note:** the page loads videos into memory, because the :8350 server (python http.server) ignores Range requests, without which a video cannot be seeked.

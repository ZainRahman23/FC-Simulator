# SP2A investigation log (14 Oct 2026)

**Instruction:** `sources/2026-10-14_user_instruction_sp2a_authored_dive_run_to_dive.md` (commit `3fa9d392`).
**Scripts:** `sp2a/scripts/`. **Renders:** `sp2a/render/`.
**Records** (run records, full search logs) are outside Git, in `_preserved_2026-10-14_evidence_outside_git/sp2a/`.

Everything below is in the order it happened. Dead ends are kept, because several of them are findings in their own right.

---

## 0. Inputs built first

- **RUN-1 run-in** (`sp2a_run1.mjs`).
  - The frozen tag is read only, through `LV2_STATE.queryAt`, then the PI-1 mapper (R-K + RF-1), then V2 anatomical angles at 240 Hz.
  - The extracted speeds are 4.147 / 4.608 / 5.069 m/s.
  - The run-in is scaled **geometrically** by the tackler/runner leg ratio LEGR = 1.085, in all three directions (dynamic similarity), so the tackler runs at **4.50 / 5.00 / 5.50 m/s**.
  - The first version scaled only the vertical. That made the stance foot slide backward at about 0.6 m/s (§2.4).
- **3D tuck geometry** (`sp2a_tuck.mjs`, kinematic FK only).
  - Result: pelvis pitch −14°, roll +27°; hip flexion 59°, adduction 23°, external rotation 39°; knee 130°; ankle plantarflexion 18°, inversion 22°.
  - In this tuck the lateral thigh, shin and hip are near the turf, the knee is not lower than them, and the sole faces away from the turf. Every angle has margin inside the V2 hard range.
- **Reference analysis:** `REFERENCE_SP2A_ANALYSIS.md`.

## 1. Structure A: the physical body takes over at (or before) the plant touchdown and follows the authored commitment

These are `sp2a_author.mjs` and `sp2a_run.mjs`. The authored tracks are blended (C1) from RUN-1's own continuation into the commitment, and there is a RegionalTracker (A6) plus contact-driven authority (A7, `sp2_ctrl.mjs` `contactAuth`).

### 1.1 Controller defects found and fixed

All of these are opt-in. SP1 and SP2 are bit-identical: the SP2 hash `792ce24ee2a3c678` was re-checked after every change.

| # | Defect | Fix |
|---|---|---|
| 1 | **Entry activation initialisation.** At t = 0 the muscle state is initialised as the steady state of the controller's command. That command already looks 70 ms ahead to the commitment, so the knee extensors started fully on and the knees went the wrong way for about 60 ms. | `initChor`: initialise from the incoming run's continuation. |
| 2 | **Inverse-dynamics FF base acceleration.** The entry makes two calls at step 0, before and after the velocities are written, and the free-chain ID read the write as a base acceleration of about 1200 m/s². | Fresh ID closures for the init call. |
| 3 | **Free-chain ID applied to the stance leg.** | The plant-leg FF is gated off while that leg supports. |
| 4 | **Rate reference 70 ms ahead.** At running joint speeds this is an acceleration feed-forward of gain D·lead, on top of the ID feed-forward. | `rateLead`. |
| 5 | **Init evaluated 70 ms ahead.** The stance knee was initialised with flexor force (f ≈ 1.0) and extensor force at 0.09, and the knee collapsed while the force states swapped over about 150 ms. | The init evaluates the run at the present instant. |
| 6 | **Support VF orientation term.** It compensated the free hip's and lumbar's reaction on the pelvis using their *unbounded intents* (10³ N·m), so the stance hip was asked for 2000 N·m. | `otherCap`: clamp to each axis' muscle capacity. |
| 7 | **Swing-knee init.** The run's small flexion-decelerating torque became extensor activation, and M1's full short-range damping on a group lengthening at about 10 rad/s stalled the swing. | Passive free-knee init (airborne takeover only). |

### 1.2 Seam (pose and velocity continuity)

The handover was measured against RUN-1's own continuation, using pelvis |Δω|. The *fixes* were:
- the takeover moved 25 ms into the stance, after the animation's forefoot-landing transient;
- the support force starts along the leg and blends into the commitment over about 50 ms;
- **whole-body inverse dynamics of the run** at the takeover (`sp2a_wbid.mjs`) initialises every muscle, including the trunk joints, which the partial command left at zero.

Results:
- **Seam:** 2.1 / 4.1 / 5.4 / 4.3 rad/s at 4 / 8 / 17 / 25 ms **became 0.8 / 1.2 / 1.4 / 1.8 rad/s**.
- **The run is not dynamically consistent.** The whole-body ID shows that the kinematic RUN-1 stance implies its centre of pressure is **0.27 m behind the plant sole centre** (off the heel), with 2–2.8 BW vertical, and a non-zero net force in its flight phases.

### 1.3 Why structure A could not produce a seated slide

Searches S1–S6 and about 60 hand-built variants (A3 … Z3; the records are in the session scratchpad, not preserved) all failed in the same way:
- the tackling boot lands first, or the body pitches forward over the fold knee;
- the body ends **face-down**.

The causes, in the order they were established:

1. **Angular momentum budget.** SP2's plant generates −17 N·m·s (backward) by 0.15 s and keeps it to landing. RUN-1's own stance carries the body **forward to +15 N·m·s at mid-stance, then back to −11 by toe-off**. A commitment that releases the stance early (fold style) leaves at peak forward rotation. A full push-off reached +45 physically.
2. **The physical stance cannot do what the run does.**
   - The ground reaction actually delivered is 1–1.4 BW and nearly vertical, while the support objective asks for 2–6 BW pointing forward. The stance joints saturate.
   - When the commitment demands support with the COM ahead of the foot, the stance hip is asked for *flexion*, which jack-knifes the pelvis forward.
   - Neither a centroidal aim point nor capacity-aware force scaling (`sp_vf` `alongLeg.keep/aim`, `capScale`) changed the delivered direction.
3. **The limbs lag running-speed motion by 50–100 ms** (M1 activation and force lag; eccentric short-range damping).
   - With an airborne takeover (−75 / −100 ms) and an authored longer, paw-back final step, the plant boot met the turf moving **forward at 3.1–4.5 m/s**, where the run's own boot was at −0.4…−0.8. The touchdown impulse then braked and pitched the body forward.
   - The swing knee only reached about 60° where the run has 94–119°, so the free boot dragged.
4. **Muscle initialisation versus rotation.** The run-consistent whole-body-ID init gives the best seam, but it reproduces the run's forward stance rotation (+28 N·m·s by 0.1 s). The partial init rotates backward (−7 N·m·s) at a worse seam (4.2 rad/s).
5. **The tackling leg.** Even with the backward-rotating variant (D4), the hips descend faster than the fold side rolls (3° of roll at 0.3 s against SP2's 12–23°). The tackling boot lands 70 ms before the fold knee and trips the body.

## 2. Structure B (adopted): an authored ballistic final flight into a physically executable plant state

The brief allows the deliberate RUN → DIVE transition to be authored. What must stay physical is the incoming momentum, the state at the transition, the supported contacts, the resulting trajectory and the collisions. Implemented in `sp2a_flight.mjs`:

- **t ≤ t_TO** (the free foot's last running toe-off): RUN-1.
- **t_TO < t < 0** (the final flight):
  - every joint is a cubic Hermite from the run's own angle and rate to the plant state's angle and rate;
  - the pelvis orientation is handled the same way;
  - the root is placed so that the **COM follows the exact ballistic arc** from the run's COM state at toe-off.
- **The flight duration is not a free parameter:** T = (v_y,TO − v_y,plant) / g = **0.100 s**, against RUN-1's own 0.129 s. A shortened, decisive final flight from the run's own toe-off (COM v_y +0.48 m/s) arrives at **COM height 1.0655 m with v_y −0.51 m/s**. SP2's committed plant state is 1.064 m. The plant state's horizontal COM velocity is the run's own.
- **t ≥ 0:** **physics**, entered in exactly that state:
  - SP2's physical tackle (A6);
  - A7 contact-driven authority;
  - the SP2A refinement: the fold leg and seat morph into a 3D tuck after the fold side has landed (`morph`, searched in S7 and S8).

**Bug found and fixed while rendering:** the ballistic start had the gravity term's sign flipped, so the authored flight sat gT² ≈ 9.8 cm low and the COM jumped at t = 0. It was presentation only; the physical entry was unaffected. After the fix:
- at t = 0 the last authored frame differs from the physical entry by exactly one step of motion;
- at the toe-off the COM is continuous and the run-in feet are on the turf (7 mm).

## 3. Searches (CMA-ES, logged)

Summaries are in `evidence/search/searchS*_summary.json`; the full logs are outside Git. Costs are **not comparable across searches**: terms were added as the structure changed (seam, landPitch, sustained-hip weight).

| Search | Structure | Result |
|---|---|---|
| S1 | A: old entry (vertical-only scaling, 25 ms takeover), fold style | Face-down in every candidate. Best 32.2. |
| S2 | A plus scissor lead leg and tuck parameters | Face-down in every candidate. Best 20.0 on an entry later found to be wrong. |
| S3 | A on the corrected entry (seam term) | Face-down in every candidate. Stopped. |
| S4 | A, push-off plant with centroidal aim, airborne takeover | Face-down in every candidate. Stopped. |
| S5 | A, touchdown takeover, fold style, init blend | Face-down in every candidate. Stopped. |
| S6 | A, touchdown takeover, partial init (D4 family), tackling-leg geometry free | Face-down in every candidate. Stopped. |
| S7 | **B**: tuck morph and seat (11 parameters), 3 run-ins, 1.75 s window | Seated at all three speeds. Best 18.6. |
| S8 | **B**: refinement on the full 2.0 s window, sustained-hip weight × 2 | Best 19.3. **Selected:** `evidence/SP2A_opts.json`. |

## Tools added to the shared SLIDE-PHYS libraries

All are opt-in and inert when absent. SP2 still reproduces `792ce24ee2a3c678`.

- **`sp_vf.mjs`:** `alongLeg` (blend or keep with aim), `otherCap`, `capScale`, `gate` pass-through.
- **`sp_cand.mjs` (G23 assembly):** `forward`, `driveRamp`, pass-through of `alongLeg`, `otherCap`, `gate` and `capScale`.
- **`sp_entry.mjs`:** `lowestY`, for an airborne entry.
- **`sp2_ctrl.mjs` (RegionalTracker):** `contactAuth` (A7), `initChor`, `initTau` / `initMix`, `rateLead`.
- **`sp_clip.mjs` / `sp_capture.cjs`:** run-in prefix, collider wireframe and joint skeleton (`render/sp_wire.mjs`), authored-intent skeleton ghost, panels without the mesh, HUD labels for the run-in and the authored flight.

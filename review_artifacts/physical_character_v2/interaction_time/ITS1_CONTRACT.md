# Interaction-time physics: production contract (10 Oct 2026)

**Source:** `../sources/2026-10-10_user_decision_interaction_time_physics_pivot.md` (2c6900de).

**Basis:** the IB-1 evidence consolidation (`../consolidation/CANONICAL_EVIDENCE.md`, 15b0d5c6).

**Prior work:**
- All earlier CF, SLP, PI-1, REV, PCS, LC-1 and V1.3 work stays exactly as research / evidence. Nothing in it is changed or reinterpreted.
- The simulation baseline is not changed to make old gates pass.

## 1. Roles

| layer | owns | must not |
|---|---|---|
| **Football simulation** (V1.3 baseline, 5042230) | ordinary trajectory, movement, facing, contact detection, the contact model's values (J, normal, point, support, class) and the football outcome | read anything from presentation or physics |
| **Ordinary locomotion presentation** | skeletal animation of ordinary movement (a separate effort replaces the current running presentation; not this work) | propel V2; feed back to the simulation |
| **V2 interaction physics** | a mechanically credible realisation of an interaction the simulation has decided; it is active only while that interaction needs it | change the football outcome; write to the simulation; run during ordinary locomotion; require V2 to have run to the interaction state |
| **Presentation of the interaction** | shows the physical body | influence the simulation (simulation-neutral) |

## 2. Activation contract (what the first slice tests)

1. **Trigger.** The simulation's authoritative contact event (`PLAYER_CONTACT`: tick, sub-step, struck segment, point, normal, J, support, runner / tackler velocities).
2. **Initialization at or very near contact.** One explicit, recorded write of every V2 body's pose and velocity (the "initialization writes"). It is built from authoritative quantities:
   - position and facing;
   - whole-body translational momentum;
   - the support state;
   - the simulation's own collision-skeleton pose (gait context) at that sub-step.
   - **Mechanical validity takes precedence over copying any presentation pose.** Every approximation is listed and measured.
3. **The collision.** The authoritative impulse is applied **exactly once**, to the V2 body that maps to the struck segment, at the authoritative contact point. An impulse already represented elsewhere (an earlier contact, or the simulation's own post-contact response) is never applied again.
4. **After initialization:**
   - no state writes;
   - no outcome-specific rule, animation or hidden impulse;
   - no carrier / locomotion machinery;
   - the controller is the same for every case.
5. **Disagreement.** If the unrestricted physical evolution and the authoritative outcome disagree, the disagreement is **reported**. Physics is not tuned to match.
6. **Not in this contract yet:** hand-back / reconciliation to presentation, recovery, broader tackle coverage, bumps, aerial contacts, production integration. These come after review.

## 3. Requirements carried into every slice

- **Neutrality:** simulation records and hashes are unchanged; physics reads them deep-frozen; no presentation RNG; no wall clock in the physics path.
- **Determinism:** bit-identical across repeats, processes and run order.
- **Integrity:** finite state; no energy generation beyond numerical tolerance; joints intact; self-penetration ≤ 10 mm; turf penetration ≤ 10 mm.
- **Cost:** CPU per interaction measured, with physics separated from diagnostics.

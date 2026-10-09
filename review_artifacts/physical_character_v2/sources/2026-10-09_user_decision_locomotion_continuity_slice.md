# User decision 2026-10-09 (≈22:05 BST) — locomotion-presentation continuity slice (pelvis/COM vertical continuity + ballistic flight, continuous plant transitions, root-bone ground-clamp fix, PR-2 corrected to the expected continuation, explicit angular handoff state); preregister continuity criteria first; then rerun the REV2 promotion scan unchanged except HG-A v2 + corrected PR-2; before/after browser replay; stop (verbatim)

Received in the Claude Code session, in reply to `pi1/moving_handoff/MOVING_HANDOFF_INVESTIGATION.md` (1846be4). Reproduced verbatim below.

---

Adopt HG-A v2 as proposed and preserve its reasoning and evidence.
I agree that the next work should address the underlying locomotion-presentation continuity rather than introduce another PI-1-specific workaround.
Treat this as a small general locomotion-development slice, not as tuning the animation to make PI-1 pass.
The production architecture remains:
simulation-authoritative locomotion → presentation/animation → temporary promotion into physical V2 only for meaningful interactions → physical response → deterministic return to locomotion presentation.
Therefore the locomotion presentation needs to provide a physically coherent state from which promotion can occur at arbitrary useful phases of a run.
Design and implement the smallest principled correction to the current procedural running presentation addressing the problems your investigation found:
1. Make pelvis/COM vertical motion continuous in position and velocity across stance/flight and heel/toe transitions. During genuine flight, use a physically sensible ballistic trajectory rather than framewise height switching.
2. Replace instantaneous plant-IK locking/releasing with continuous plant transitions. A planted foot should remain convincingly fixed to the ground while the body passes over it, without a one-frame knee/leg discontinuity.
3. Fix the ground-clamp/root-bone bug you identified.
4. Correct PR-2 so that it tests continuity against the presentation's expected continuation over the same interval rather than treating normal limb motion as an error.
5. Define the angular handoff state explicitly: authoritative whole-body facing/angular motion plus the locomotion presentation's physically meaningful relative limb motion. Do not import non-conserved frame-to-frame animation artefacts as physical angular momentum.
Do not modify gameplay outcomes, the simulation trajectory, V2 anatomy, Jolt configuration, collision thresholds, PI-1 contact geometry, or existing simulation logic to make the gate pass.
Preserve the foundational rule that simulation decides what happens and presentation explains it. The locomotion work must remain simulation-neutral and deterministic.
Before implementing, preregister objective continuity criteria. Include at minimum:
- pelvis/COM position and velocity continuity;
- joint position/velocity continuity;
- planted-foot world slip;
- physically sensible vertical COM motion;
- physically sensible angular state;
- deterministic reproduction;
- animation ON/OFF gameplay neutrality.
Then implement the smallest general solution and test it across representative walking/jogging/running speeds, including the existing 3.0 m/s PI-1 runner and the 7.5 m/s case.
Afterward rerun the existing Revision 2 promotion scan unchanged except for the already-adopted HG-A v2 and corrected PR-2 definition. Do not weaken any remaining PI-1 collision/contact criteria merely because the locomotion presentation improved.
Report separately:
- whether the locomotion itself became continuous;
- how many frames at each speed are now valid physical-promotion states;
- how long a promoted unobstructed runner remains coherent before contact;
- which PI-1 blockers disappear as a consequence;
- which blockers remain genuinely collision/geometry/architecture problems;
- whether anything now suggests a V2 body limitation.
Also give me a browser replay comparing before vs after for the same running sequence, preferably with slow motion and overlays for pelvis/COM, planted feet and promotion-valid frames.
Stop after the continuity slice, the unchanged promotion scan, and the visual comparison. Do not begin another PI-1 revision without my approval.

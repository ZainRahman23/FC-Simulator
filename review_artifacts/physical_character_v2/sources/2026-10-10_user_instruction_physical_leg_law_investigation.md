# User instruction 2026-10-10 (≈03:15 BST) — approve the read-only investigation of option 1 (a physically realisable pelvis vertical in the shared leg law); no modification of simulation, presentation, carrier, V2, collision model, thresholds or the frozen PI-1 design; reconstruct the vertical over full strides at walk / jog / run, inventory every discontinuity and non-physical acceleration and its cause, compare required reach / clearance / foot and joint velocity / inverse-dynamics torque with V2's demonstrated envelope; answer six questions; specify a single principled correction with predicted effects, or compare alternatives and stop; no PI-1 run; next gate = an unobstructed promoted runner coherent for the longest pre-contact window (verbatim)

Received in the Claude Code session, in reply to `promotion_carrier/slice/PCS1_RESULTS.md` (badd7e9). Reproduced verbatim below.

---

Approve the read-only investigation of option 1 first. Do not modify the simulation, presentation, carrier, V2 body, collision model, thresholds, or frozen PI-1 design yet.
Determine precisely why the shared leg law's pelvis-vertical trajectory is not physically realizable after promotion and whether a physically realizable replacement can serve all three roles consistently:
1. the simulation's collision-leg geometry;
2. ordinary locomotion presentation;
3. the promoted V2 body's gait reference.
I want the smallest principled correction, not another PI-1-specific workaround.
In particular, reconstruct the vertical pelvis/COM trajectory over complete strides at the relevant walking, jogging and running speeds. Identify every discontinuity or nonphysical acceleration introduced by stance/flight switching, heel/toe switching, plant IK, stride timing, or the existing gait law. Compare the required leg reach, swing clearance, foot velocity, joint velocity and inverse-dynamics torque against V2's demonstrated physical envelope.
Then answer:
- Can the vertical gait trajectory be made continuous in position and velocity and ballistic during genuine flight without changing the authoritative horizontal locomotion?
- Can the same corrected law generate the gameplay collision legs and presentation legs, eliminating their current disagreement?
- Would it materially alter existing collision timing/geometry or gameplay outcomes?
- Does it allow the promoted runner to survive the full pre-contact windows for rx_miss, rx_free_leg and rx_planted_leg with no tackler present?
- Which existing failures disappear merely from correcting this trajectory, and which remain independent?
- Does any evidence point to a genuine V2 joint/body/actuator limitation?
Do not tune against the three PI-1 outcomes. Derive any proposed trajectory from gait/physics constraints and test it against broader locomotion cases.
If a single principled correction exists, specify it precisely and show predicted effects before implementing it. If several alternatives exist, compare them and stop for my decision.
Do not run PI-1 again yet. Our next gate should be simpler: a promoted unobstructed runner must remain physically coherent for at least the entire longest required pre-contact window with no tackler. Only after that passes should we spend another run on collision outcomes.

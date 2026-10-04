# User instruction (verbatim), 2026-10-04 19:04 UTC: focused knee axial biomechanics research review

Pasted by the user; reproduced exactly as received, below the rule.

---

Conduct a focused biomechanics research review to determine the correct knee axial/internal-external rotation model for the Touchline Physical Character V2 rig.
This research will directly determine the physical knee model used in a dynamically simulated football player, so prioritize primary human biomechanics literature, experimental studies, cadaver/in-vivo measurements, and authoritative biomechanical models over generic animation/rigging sources.
The current model has a fixed knee axial-rotation range and fixed neutral orientation regardless of knee flexion. Our implementation work has found evidence that:
- the current axial ROM may be approximately twice as wide as human evidence supports;
- axial rotation behavior changes substantially with knee flexion;
- the neutral/resting axial orientation may shift as the knee flexes;
- a prone-rest passive-physics test at approximately 146° knee flexion exposes the current model;
- this knee coordinate interacts in series with ankle/foot axial resistance;
- we must distinguish actual knee behavior from ankle/subtalar and hip contributions to whole-leg yaw.
Research and answer:
1. What is the experimentally supported passive internal/external rotational ROM of the human tibiofemoral knee across knee flexion angles from full extension through deep flexion?
2. How does axial rotational freedom change with flexion?
3. What is the screw-home mechanism, over what flexion range is it important, and should it be represented as a shift in neutral axial orientation, asymmetric limits, passive torque, kinematic coupling, or some combination?
4. What should the neutral/rest axial rotation angle as a function of knee flexion look like?
5. What evidence exists for passive torque-angle/stiffness behavior in axial rotation, including nonlinear/end-range behavior?
6. How do loaded/weight-bearing measurements differ from unloaded measurements?
7. For a planted footballer's leg, which yaw resistance belongs physiologically to the knee versus the ankle/subtalar complex, foot-ground interface and hip musculature?
8. Should our knee axial model use flexion-dependent hard limits, soft limits, a moving neutral/reference, passive torque, screw-home coupling, or another formulation?
9. What behavior should occur near full extension, moderate flexion, 90° flexion and very deep flexion around 145°?
10. Are there important differences between passive anatomical ROM and actively controllable ROM that matter for a physical simulation?
11. Which measurements are sufficiently well established to use as model parameters, and which remain uncertain?
12. What is the simplest defensible physical knee model suitable for real-time simulation that preserves the important biomechanics without overengineering the joint?
Do not design the model to make our existing G1/G2/G3 tests pass. Treat those tests only as context. Derive the recommendation from biomechanics first.
Where studies disagree, explain why and give ranges rather than choosing convenient values.
Finish with a concrete implementation recommendation containing:
- flexion-dependent axial neutral/reference;
- flexion-dependent internal and external ROM;
- passive stiffness/torque behavior;
- screw-home treatment;
- hard versus soft/end-stop limits;
- what should remain actuated versus passive;
- what should not be assigned to the knee because it belongs to ankle/subtalar/hip mechanics;
- recommended numerical parameter ranges with citations and confidence levels;
- specific validation experiments we should run before accepting the model.
Explicitly address whether this evidence supports changing the current V2 knee model before E1a lift-hover-replace.

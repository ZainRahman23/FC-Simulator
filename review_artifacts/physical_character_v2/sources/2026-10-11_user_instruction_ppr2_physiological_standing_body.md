# User instruction, 2026-10-11 21:49 BST (verbatim)

---

PPR-2 — ESTABLISH THE PHYSIOLOGICAL STANDING BODY BEFORE RETURNING TO PVP
PPR-1 is preserved as a failed preregistered experiment. Do not adopt B and do not overwrite its result.
The findings support continuing the physiological-body direction, but I do not want B′ tuned against the tackle yet.
The most important new finding is more fundamental: CURRENT V2 falls from the PVP standing entry after ~1.45 s without disturbance, while B falls after ~0.85 s. Therefore before further PVP, active balance, stepping or slide work, establish whether V2 can represent a mechanically plausible pre-reflex standing human at all.
The next milestone is a sound standing physical substrate.
1. Separate the three findings
Treat these independently:
A. Excitation bug/control-law issue
PPR-1's excitation formula reintroduced a zero-latency path by dividing drive by current-angle muscle capacity.
First derive and correct this conceptually so pre-contact muscle activation is genuinely determined from the pre-contact state and cannot change because of a collision before the prescribed physiological latency.
Do not count this as a body-spec improvement.
B. Mid-range passive elasticity
Investigate whether V2 requires passive elastic resistance beyond PPR-1's ~1° intrinsic-muscle region in order to represent human muscle-tendon/joint mechanics.
C. Eccentric reserve
Investigate defensible human eccentric-force capability and whether V2's current low reserve is inadequate.
Do not assume B or C are required merely because the proposed B′ contains them. Establish them from biomechanics and isolated tests.
2. No tackle during calibration
Do not use PVP-1A-DX to choose parameters.
Build/preregister the candidate using only isolated standing and generic perturbation tests.
The PVP collision remains sealed until the standing-body candidate has passed or failed its frozen qualification.
3. Standing-body requirements
Use the existing V2 anatomy, masses, joint limits, colliders and actuator architecture unless evidence demonstrates that one is fundamentally incapable.
Establish a physically defensible model containing only mechanisms that a human possesses before an unexpected disturbance:
- gravity;
- pre-existing muscle activation/tone;
- intrinsic muscle stiffness;
- tendon/passive elasticity;
- realistic damping;
- eccentric resistance;
- ground contact.
No collision-triggered neural response.
No balance controller reacting to instantaneous state.
No stepping.
No frozen-pose spring whose purpose is simply to keep the character upright.
No root constraint or hidden stabilizing impulse.
4. Critical distinction: passive body vs active standing
Investigate an important conceptual question rather than assuming the answer:
Can a human-like body actually remain standing for the required duration using only passive mechanics and fixed pre-activation, or does physiological quiet standing inherently require continuous delayed neural feedback?
If the literature/evidence says long-duration standing cannot legitimately be achieved without active feedback, do not artificially force the passive model to stand indefinitely.
In that case define:
- what duration the pre-reflex/passive substrate should remain mechanically credible;
- what ongoing low-bandwidth/delayed postural control a real standing human requires;
- how that controller can exist continuously before a collision without becoming zero-latency collision response.
This distinction is essential.
5. Qualification battery before PVP
Preregister generic tests such as:
- undisturbed standing;
- small AP perturbation;
- small ML perturbation;
- moderate AP/ML perturbations;
- larger perturbations expected to exceed no-step balance;
- ankle/knee/hip isolated displacement-response tests;
- release/settling tests;
- energy/damping tests.
Use predetermined perturbation magnitudes derived independently of PVP.
A successful model should show a continuum:
small disturbance → compliant displacement and settling
moderate disturbance → substantial sway/yield
large disturbance → loss of no-step balance
It must not behave as either a rigid mannequin or a floppy ragdoll.
6. Measure
Quantify:
- stiffness curves rather than one stiffness number;
- damping ratio;
- eccentric/concentric capability;
- torque and torque-rate;
- joint displacement;
- COM/support relationship;
- ground reaction forces;
- energy storage/return/dissipation;
- actuator work;
- passive work;
- joint-anchor separation;
- stability duration;
- oscillation;
- determinism;
- CPU.
Compare all defensible quantities against human biomechanics ranges and clearly label measured values, literature values and design choices.
7. Do not blindly preserve bad criteria
PPR-1 found that some preregistered probes incorrectly demanded yielding in directions that should physically remain elastic, and the 1 mm joint-separation threshold may need scrutiny.
Do not quietly change those criteria.
Audit them read-only and report whether they are physically justified. Propose corrected criteria before running the successor qualification.
8. Only after qualification, reopen PVP
If and only if the candidate standing substrate passes its frozen independent qualification, replay the exact existing PVP-1A-DX collision once, without retuning.
Compare:
CURRENT V2 vs qualified physiological substrate
over the trustworthy 0–120 ms window using corrected TRC-1 rendering.
That PVP replay is a validation test, not calibration data.
Determine whether the struck leg now yields like a loaded human limb and whether the disturbance still propagates contact → ankle → knee → hip → trunk without collision-triggered active response.
9. Stop there
Do not implement delayed active balance.
Do not implement stepping.
Do not modify the slide.
Do not modify RUN-1.
Do not modify the simulation.
Do not modify collision geometry.
Do not tune against visual PVP results.
10. Final decision
Tell me whether:
A. existing V2 actuator/body architecture is sufficient with corrected physiological control laws;
B. V2 needs the proposed passive-elasticity/eccentric body-spec extension;
C. quiet standing fundamentally requires a continuous delayed balance controller in addition to the passive substrate;
D. some deeper V2 architecture problem exists.
Preserve PPR-1 as historical evidence and stop for my review.

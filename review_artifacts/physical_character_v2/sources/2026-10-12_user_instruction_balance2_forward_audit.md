# User instruction, 2026-10-12 14:24 BST (verbatim)

---

BALANCE-2 — FORWARD BALANCE AUDIT, CORRECTION & QUALIFICATION
BALANCE-1 is accepted as a promising result, but the recipient is not yet qualified for PVP.
Preserve the BALANCE-1 frozen battery and results.
The major architectural findings stand:
- M1b is now the canonical V2 muscle layer.
- Controllers can command excitation only; direct physical torque is prohibited.
- quiet standing works for 60 s;
- small pushes recover in all four directions;
- moderate backward and lateral pushes recover;
- supra-human-limit pushes can genuinely topple the body;
- disturbance-dependent control is causally delayed;
- the old superhuman torque-rise problem is gone;
- determinism holds.
The remaining qualification failures are concentrated in the forward direction.
Do not immediately tune BALANCE-1.
The first task is to determine whether the forward weakness comes from:
A. standing/support geometry,
B. a mismatched qualification criterion/reference,
C. the controller's near-limit forward strategy,
or some combination.
1. Freeze BALANCE-1
Treat the current BALANCE-1 implementation and frozen battery as historical evidence.
Do not overwrite:
- M1b;
- BALANCE-1 A/B;
- preregistration;
- frozen push cases;
- results;
- videos;
- qualification thresholds.
Any successor must receive a new version/name and preregistration.
2. Audit the forward human references first
BALANCE-1 currently reports:
- character forward support threshold ≈ 14.4 N·s;
- human comparison ≈ 16–23 N·s;
- character toe edge ≈ 103 mm ahead of COM.
Before changing anything, return to the actual human sources underlying those numbers.
Determine exactly how comparable those experiments are to our fixture.
Extract where available:
- subject height/mass;
- stance width;
- fore-aft foot placement;
- foot angle;
- COM relative to ankle/toe/support polygon;
- footwear/barefoot condition;
- perturbation application point;
- perturbation direction;
- impulse duration;
- force profile;
- initial posture;
- knee/hip flexion;
- instruction to subjects;
- whether stepping was prohibited;
- definition of recovery/failure;
- actual failure threshold distribution;
- whether 16–23 N·s is normalized for mass/height;
- whether the subjects used an ankle, hip or mixed strategy.
Do not use a human number merely because it is labelled "forward push."
Establish whether 16–23 N·s is actually an appropriate target for this exact V2 fixture.
3. Audit the V2 standing geometry
Measure the actual settled BALANCE-1 standing state.
I want:
- anatomical foot length;
- physical/collider support length;
- heel position;
- toe position;
- COP;
- COM projection;
- ankle position;
- COM-to-toe distance;
- COM-to-heel distance;
- stance width;
- foot yaw;
- knee flexion;
- hip flexion;
- trunk lean;
- pelvis orientation;
- bilateral load split;
- ankle plantar/dorsiflexor preactivation;
- relevant passive/elastic loading.
Compare these directly with the human reference fixture where evidence exists.
Determine whether 103 mm of forward support from COM is physically plausible for a footballer in the intended neutral/ready stance.
4. Do NOT change anatomy unless anatomy is actually wrong
Distinguish:
anatomy
from
stance/posture
from
collision/support representation.
If the feet themselves are anatomically plausible but the player simply stands with COM too far forward, do not lengthen the feet.
If stance geometry is the problem, fix the standing initialization/neutral posture.
If collider support does not correspond appropriately to the anatomical foot, identify that separately.
Canonical anatomy may only change if there is independent evidence that it is wrong.
5. Derive the passive mechanical forward limit
Before involving active balance control, characterize the body's physical forward stability envelope.
From the settled state, determine:
- support polygon;
- static tipping boundary;
- impulse/momentum boundary under a simplified passive condition;
- sensitivity to COM placement;
- sensitivity to stance posture;
- sensitivity to knee flexion;
- sensitivity to foot angle;
- sensitivity to perturbation application height.
This is diagnostic only.
Do not optimize stance to maximize the number.
The purpose is to understand why BALANCE-1 obtains ~14.4 N·s.
6. Reanalyse the 12 N·s forward case
This case is especially important.
BALANCE-1 reports:
- no fall;
- ~51 mm displacement at 0.5 s, apparently human-like;
- then ~65 mm forward hold for ~1.5 s;
- eventual swing back ~70% past upright;
- failure because it does not settle within 4 s.
Decompose this trajectory.
Plot/measure through time:
- COM;
- COP;
- COM velocity;
- trunk angle;
- pelvis angle;
- ankle/knee/hip angles;
- head;
- excitation;
- activation;
- developed force;
- physical torque;
- ground reaction;
- foot loading;
- controller observations;
- estimated state;
- controller commands.
Identify separately:
1. initial passive response;
2. first delayed neural response;
3. peak corrective response;
4. prolonged forward hold;
5. reversal;
6. backward overshoot;
7. settling.
Determine whether the problem is:
- insufficient correction;
- correction too late;
- excessive integral/long-duration action;
- poor whole-body coordination;
- bad state estimation;
- insufficient restoring stiffness near the support limit;
- muscle-force timing;
- or something else.
Do not assume the answer is "increase gain."
7. Compare forward versus backward/lateral success
BALANCE-1 already succeeds elsewhere.
Use those cases as controls.
Compare the successful moderate backward and lateral cases against the failed forward case at equivalent normalized difficulty.
Ask:
What does the controller/body do successfully backward/laterally that it fails to do forward?

Compare:
- support geometry;
- available joint range;
- muscle reserve;
- response latency;
- COM/COP margin;
- hip contribution;
- ankle contribution;
- trunk strategy;
- saturation;
- sign/reversal timing.
This should help distinguish a general controller defect from a direction-specific geometry/strategy problem.
8. Audit the 20 N·s forward failure
Do not automatically treat falling at 20 N·s as a defect.
If the matched human fixture genuinely predicts that this body/stance should recover it without stepping, then it is a failure.
If the human comparison does not match our stance/support geometry, then correct the criterion rather than making the character superhuman.
Report:
expected recoverable impulse for the matched V2 body/stance
versus
observed recoverable impulse.
Include uncertainty.
9. Fix P4 as a test, not as a character change
BALANCE-1 found that P4 cannot correctly compare two forward pushes when both produce falls.
Audit and amend the P4 criterion so it measures the intended property robustly.
Freeze the correction before using it on a successor.
Preserve the original P4 result as historical evidence.
Do not choose the corrected rule based on which candidate it makes pass.
10. Decision gate before any successor
After the audits above, classify the dominant forward problem:
G — geometry/stance
Q — qualification/reference mismatch
C — controller strategy
M — muscle/body mechanics
X — mixed
Show the evidence.
Only then may you build BALANCE-2.
11. If stance is wrong
If evidence demonstrates that the initial stance is not representative of the intended football-ready standing posture:
create a corrected evidence-based neutral stance.
Do not optimize it for push performance.
Requirements:
- natural-looking footballer posture;
- realistic knee/hip flexion;
- realistic foot placement;
- realistic COM;
- realistic bilateral loading;
- no artificial support enlargement;
- no anatomy changes unless separately justified.
Then rerun the unchanged BALANCE-1 controller first.
This is critical.
We need to know what geometry alone changes before changing control.
12. If the criterion is wrong
If the human reference is not directly comparable:
derive a better qualification criterion from matched evidence.
Preregister it independently of candidate outcome.
Do not lower the bar merely because BALANCE-1 failed.
Explain exactly why the previous criterion was mismatched.
13. If the controller strategy is genuinely deficient
Only after geometry/reference are resolved may you modify control.
Do not perform an unconstrained gain search.
Diagnose the missing strategy.
Investigate evidence-supported mechanisms such as:
- coordinated ankle/hip strategy transition near the stability boundary;
- stronger but physiologically bounded hip recruitment;
- altered trunk coordination;
- momentum regulation rather than pose restoration;
- better state prediction;
- improved command decay to prevent overshoot.
Do not introduce stepping.
Do not introduce collision-specific logic.
Do not directly command torque.
Everything still flows through M1b.
14. Preserve causality
Any BALANCE-2 successor must preserve the strongest BALANCE-1 result:
the disturbed and undisturbed twins receive identical commands until delayed sensing can causally distinguish them.
No:
- push detection;
- collision detection;
- outcome labels;
- current perfect state;
- future state;
- hidden impulse knowledge.
Re-run the causal audit.
15. Preserve genuine failure
Do not turn the character into an invincible balancing machine.
After any improvement:
- small pushes should recover;
- moderate human-recoverable pushes should recover;
- near-limit pushes should show substantial effort;
- sufficiently large pushes must still topple the character.
Explicitly measure the new failure boundary in every direction.
If forward improvement causes superhuman backward/lateral robustness, reject it.
16. Secondary refinements — only after forward qualification
BALANCE-1 also found:
- AP COM sway ≈1.1 mm versus human ≈4.1–4.3 mm;
- sway frequency too high;
- head turns roughly twice as fast as trunk, whereas human head follows trunk more closely;
- knee flexion ≈2–3° versus human ≈4–5°;
- some knee/neck sensitivity cases exceed the human band.
Do not let these distract from the forward audit.
Only after the forward problem is resolved, investigate whether these can be improved without breaking qualification.
In particular:
Sway
Determine whether missing sensory/physiological noise or controller bandwidth explains the overly small/high-frequency sway.
Do not add arbitrary animation noise.
Head/trunk
Investigate physiologically plausible head-trunk coordination rather than visually damping the head.
Knee
Determine whether the stance correction naturally resolves the flexion discrepancy before changing anything else.
17. Final frozen qualification
If BALANCE-2 is built, rerun the complete frozen/matched battery:
- quiet standing;
- small pushes all directions;
- moderate pushes all directions;
- large pushes all directions;
- deterministic repeats;
- causality;
- muscle/torque rates;
- energy;
- momentum;
- human comparison.
Compare:
CURRENT V2
S2 + P2
M1b + BALANCE-1
M1b + BALANCE-2
where useful.
18. Visual review
Produce clean synchronized review clips for:
1. quiet standing;
2. small forward push;
3. 12 N·s moderate forward push;
4. matched moderate backward push;
5. matched moderate lateral push;
6. near-limit forward push;
7. genuine unrecoverable forward push.
Show normal speed and slow motion.
I want to judge:
Does the character look like a living athlete whose balance becomes progressively more challenged as the disturbance approaches his physical limit?

Do not visually tune around failed metrics.
19. Keep PVP sealed
Do not run the tackle.
Astra is separately developing the physical slide tackler.
Do not modify:
- PVP;
- slide;
- Astra's branch;
- simulation;
- authoritative outcomes;
- RUN-1.
The recipient should be qualified independently.
20. Autonomy
Work autonomously through:
- literature/reference audit;
- geometry audit;
- criterion audit;
- causal diagnosis;
- principled successor if justified;
- qualification;
- visual review.
You may build multiple successors if each follows a frozen causal diagnosis.
No blind gain search.
Stop if progress would require:
- anatomy changes without independent evidence;
- stepping;
- PVP;
- outcome-specific logic;
- unsupported physiology;
- arbitrary threshold relaxation.
Final report
Answer directly:
1. Is the 16–23 N·s human forward comparison actually valid for our fixture?
2. Is the 103 mm COM-to-toe support margin human-like?
3. Is V2 anatomy wrong, or was the stance/posture wrong?
4. What is the matched expected forward no-step limit?
5. Why did the 12 N·s case fail to settle?
6. Why did it overshoot backward?
7. Why do backward/lateral cases succeed?
8. Is the 20 N·s fall actually abnormal?
9. What was wrong with P4 and how was it corrected?
10. Final classification: G / Q / C / M / X?
11. What changed in BALANCE-2, if anything?
12. Did causality remain intact?
13. Are torque/force-development rates still human-like?
14. What is the final recoverable boundary in each direction?
15. Can sufficiently large disturbances still genuinely topple the player?
16. Did sway improve?
17. Did head/trunk coordination improve?
18. Did knee posture improve?
19. CPU/determinism/state cost?
20. What surprised you?
21. What remains before PVP?
22. Exact commits/files.
23. Exact localhost review URL.
Finish with:
RECIPIENT STATUS
A. QUALIFIED FOR OUT-OF-SAMPLE PVP VALIDATION
B. PROMISING — SPECIFIC BALANCE GAP REMAINS
C. BODY/STANCE ARCHITECTURE DECISION REQUIRED
D. CONTROLLER ARCHITECTURE DECISION REQUIRED
Do not actually run PVP regardless of the verdict. Stop for my review.

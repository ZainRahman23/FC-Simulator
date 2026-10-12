# User instruction, 2026-10-13 ≈ 00:55 BST (verbatim): BALANCE-3 — coordinated ankle–hip controller for the P8 defect; complete the due 12 Oct publication

---

Approved: close the remaining P8 defect with a coordinated ankle–hip controller.
The forward problem is closed for the current body:
- retain the corrected flat-sole forward criterion;
- retain C3's ~12.09 N·s legitimate forward threshold;
- rigid boot-tip support remains invalid;
- no articulated toes;
- no stepping;
- no anatomy/stance changes.
Preserve C3 unchanged as the current 16/17 baseline.
BALANCE-3 objective
Investigate and build the smallest evidence-based coordinated front-to-back ankle–hip balance strategy necessary to remove the genuine P8 long-period overshoot.
Do not treat this as gain tuning.
The diagnosed problem is that BALANCE-1/C3 effectively have separate COM and trunk-lean loops, while the known front/back hip-map defect prevents useful hip participation. Simply restoring the old hip map with the old gains made the loops oppose one another and worsened recovery.
The successor should instead coordinate:
COM state + trunk lean + ankle contribution + hip contribution
as one front-to-back balance problem.
Research first
Before designing the controller, review appropriate human postural-control literature on coordinated ankle and hip strategies.
Specifically determine:
- when healthy humans transition/blend between ankle and hip strategy;
- whether the strategies are better represented as continuous coordination rather than a hard switch;
- relationship between COM position/velocity and trunk angle/angular velocity;
- appropriate sensory delays;
- whether ankle and hip contributions should emerge from one state estimate/objective;
- recovery time and overshoot after small disturbances;
- implications for a no-step model.
Distinguish measured evidence from modelling assumptions.
Do not use literature merely to justify an architecture chosen beforehand.
Freeze before running
After the research/audit, preregister:
- controller structure;
- state inputs;
- delays;
- ankle/hip coordination rule;
- fixed parameters/gains and their provenance;
- P8 success criterion;
- all existing C3 criteria that must remain passing;
- hard rejection conditions.
Freeze this before candidate runs.
Hard constraints
The new controller must still output only through the canonical M1b muscle/excitation interface.
Do not:
- increase muscle strength;
- change M1b;
- change foot geometry;
- use boot-tip support;
- change anatomy;
- change stance;
- add stepping;
- change the corrected forward criterion;
- weaken P8;
- add an event-specific “backward push” response;
- detect the test case;
- add hidden instantaneous feedback;
- brute-force/search gains against the battery.
The controller must be generic and continuous.
Critical architectural requirement
Avoid two independent controllers fighting over the same physical objective.
The ankle and hip contributions should be derived from a coordinated estimate/objective so that trunk correction does not push COM in a direction the ankle controller immediately fights.
Investigate whether the appropriate representation is something like:
whole-body COM error/velocity + trunk orientation/rate
→ coordinated desired ankle/hip action
→ muscle excitation
rather than:
COM loop → ankle
plus independently
trunk loop → hip.
Do not assume that exact formulation if the evidence supports something better.
Qualification
The goal is not merely P8 ≤ 0.26.
Require:
- P8 within its frozen human-matched bound;
- recovery duration human-plausible rather than ~9–12 s;
- no new long-period oscillation;
- no ankle/hip controller fighting;
- corrected forward behavior preserved;
- genuine falls beyond physical support preserved;
- no boot-tip support;
- all other matched-battery criteria remain passing;
- quiet standing remains stable;
- causality preserved;
- deterministic reruns;
- physiological muscle limits respected.
Compare:
C3 | successor
especially for:
- backward-small P8;
- forward 12 N·s;
- near-limit forward fall;
- quiet standing;
- representative lateral disturbance.
Produce synchronized normal-speed and slow-motion visual review.
Stop condition
If a principled coordinated ankle–hip controller passes the complete matched battery, freeze it as the qualified no-step recipient baseline.
Do not continue polishing sway, head motion or other secondary visual characteristics.
Do not add toes.
Do not add stepping.
Do not run PVP.
If the coordinated architecture cannot pass without unsupported parameters or another body change, stop and report that instead of tuning around it.
Also complete the due 12 Oct publication according to the existing project rule.
Stop for my review.

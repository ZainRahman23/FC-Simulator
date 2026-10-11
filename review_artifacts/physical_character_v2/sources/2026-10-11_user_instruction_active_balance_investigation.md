# User instruction, 2026-10-11 13:23 BST (verbatim)

---

ACTIVE BALANCE INVESTIGATION — isolate whether the poor PVP response comes from inadequate impact or inadequate active control.
Do not fix or redesign the slide tackle yet. Do not change RUN-1, the simulation, authoritative contact, V2 anatomy, contact geometry, impact speed/impulse, friction, solver settings, or the existing PVP-1A diagnostic.
The PVP-1A diagnostic has given us an important result: native two-player contact exists, sustained contact matters, both bodies react, and the disturbance propagates from the struck leg. Visually, however, the runner does not respond like a footballer actively fighting to retain balance.
I want to determine whether the missing ingredient is active balance/recovery control, rather than insufficient collision magnitude.
Architectural rule
The controller must be outcome-blind.
It must never receive STUMBLE/FALL/CORRECTION or any other authoritative outcome label. It must not know whether a tackle occurred except through the physical state/contact forces available to an ordinary physical controller.
Its objective should be generic:
continue the intended state/motion, maintain physically plausible balance and support, and resist disturbances where possible.
The simulation remains authoritative. Do not write physical results back to gameplay.
Phase 1 — research and design before implementation
First inspect the existing V2 controllers, IFM-1/PVP-1A evidence and relevant biomechanics/control literature as needed.
Determine what a human footballer physically does during approximately the first 0–250 ms after an unexpected disturbance to a planted leg.
In particular investigate the roles and realistic timing of:
- ankle strategy;
- knee response;
- hip strategy;
- pelvis/COM regulation;
- trunk counter-rotation;
- arm response;
- unloading/reloading the support leg;
- free-leg response;
- reactive stepping.
Distinguish passive mechanical response from active neuromuscular response.
Do not assume we need a complicated humanoid controller. Find the smallest physically principled control law V2 could use.
Phase 2 — freeze an experiment
Design a diagnostic using the same early PVP-1A contact as the disturbance.
Preserve the exact tackler trajectory/contact conditions sufficiently to make comparisons causal. Restrict conclusions to the trustworthy early window; do not use the known late head/pelvis collision as evidence.
Create three experimental conditions:
A — PASSIVE/CURRENT
Existing V2 response, unchanged.
B — ACTIVE BALANCE, NO STEP
Add only the minimum generic active-balance controller. Feet may not take a new recovery step.
C — ACTIVE BALANCE + REACTIVE STEP
Same controller as B, but permit a physically triggered recovery step if/when support geometry requires one.
Do not implement B/C until their controller equations, authority, limits, activation rules, physiological assumptions, thresholds and success criteria are preregistered.
Do not tune B/C to reproduce STUMBLE.
Critical comparison
The collision must remain the same across A/B/C.
Do not make B or C look better by changing impact velocity, contact impulse, tackler mass, friction, collision geometry or contact duration.
We are specifically testing:
Does adding physically plausible active human control make the same collision produce a substantially more believable response?

Controller constraints
The controller should operate through V2's physical capabilities wherever possible: joint torques/actuators, support forces and physically meaningful targets.
No:
- pose teleporting;
- hidden impulses;
- canned stumble animation;
- STUMBLE controller;
- FALL controller;
- outcome-specific gains;
- predetermined recovery trajectory;
- animation overriding collision physics;
- root translation to fake balance;
- presentation-only displacement.
Determine appropriate physiological reaction delays rather than allowing impossible zero-latency reactions. If some stabilizing mechanisms represent ongoing pre-contact postural control rather than reflex response, distinguish them explicitly.
Respect V2 actuator limits. Saturation is evidence, not permission to increase capacity after seeing the result.
Measurements
For A/B/C record at minimum:
- identical initial physical state;
- contact timing/location;
- per-step contact impulses;
- tackler velocity change;
- runner body-part velocities;
- runner COM position/velocity;
- COM relative to support region;
- angular momentum;
- pelvis/trunk orientation;
- hip/knee/ankle torques;
- actuator saturation;
- ground reaction forces;
- support-foot loading/slip;
- free-leg trajectory;
- controller work/energy;
- time of first active response;
- if C steps: trigger time, foot trajectory, touchdown location and resulting support polygon;
- conservation/integrity measures;
- CPU cost.
Also determine whether the controller is fighting the collision unrealistically. A good controller must be capable of losing balance when the disturbance exceeds its physical ability.
Visual comparison
This is important.
Produce a synchronized visual review with:
A: current/passive
B: active balance/no step
C: active balance/reactive step
Use the exact same contact and starting instant.
Provide:
- normal Touchline gameplay camera at 1×;
- 6–8× crop at 0.25×;
- clean views;
- optional diagnostic skeleton/contact/COM/support overlays;
- frame stepping around first contact;
- at least the trustworthy first ~200–250 ms.
I want to visually judge whether the progression is:
mannequin receiving force → footballer resisting force → footballer actively saving himself.
Do not exaggerate the camera or response for readability.
Impact-magnitude control
After A/B/C are complete and frozen, you may run a read-only impact-sensitivity diagnostic using scaled versions of the same disturbance, but only if scientifically useful.
This must be explicitly separate from the primary experiment.
The purpose is to answer:
Was the original collision simply too weak to require an obvious human response?

If you do this, use several predetermined impact levels around the original rather than searching for one that “looks right.” Do not adopt any new impact magnitude.
Ideally determine whether the same generic controller naturally produces a continuum such as:
small perturbation → absorbed → obvious balance correction → recovery step → unrecoverable disturbance.
Do not map those states onto gameplay outcome labels during the run.
What I want answered
At the end give me direct answers to:
1. Is PVP-1A's visual weakness primarily insufficient impact magnitude, insufficient active control, both, or neither?
2. What is the minimum active controller that materially improves it?
3. Does active balance without stepping help?
4. When does reactive stepping become necessary?
5. Does the response originate causally from native contact?
6. Does the tackler still receive the appropriate equal/opposite response?
7. Is the controller physically capable of failing, or does it behave like an artificial stabilizer?
8. Are V2's existing actuator ranges/capacities sufficient?
9. What genuine V2 limitations appear?
10. Does this approach look suitable for shoulder challenges, trips, tackles and other disturbances without event-specific reaction logic?
Work autonomy
You may work through the research, preregistration, implementation, diagnostics and visual comparison autonomously.
If the preregistered B or C fails, diagnose it rather than tuning until it passes. You may create explicitly labelled post-hoc diagnostic variants to understand failures, but preserve the frozen results.
Do not modify the slide tackle itself.
Do not start production recovery animation.
Do not modify frozen RUN-1.
Do not change authoritative simulation outcomes.
Do not proceed to a new PVP fixture.
Commit legitimate work locally and follow existing publication/history rules.
The goal is not to make this tackle look impressive. The goal is to discover whether a generic, physically constrained footballer trying to stay balanced transforms the same native collision from a passive mannequin response into believable human behaviour.
When finished, stop for my visual review and give me one exact localhost URL where I can compare A/B/C.

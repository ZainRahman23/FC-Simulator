# User approval 2026-10-08 — CF-5 continuous forward walk, final bounded viability diagnostic (verbatim)

Received in the Claude Code session of 8 Oct 2026, after CF-4 (`diagnostics/loco_cf4_2026-10-08/`). Reproduced verbatim below.

---

Before returning to TD2C/E2 qualification, approve one final bounded diagnostic: attempt an actual continuous forward walk. This is a viability test, not production walking and not another open-ended CF development programme.
CF-4 established that V2 remains bounded when successive swings begin with inherited momentum. Its remaining artificial limitation is now explicit: the existing E2 swing is a stop-step and deliberately reduces forward COM velocity to approximately zero by touchdown.
I want to answer the remaining question directly:
If the swing/foothold plan is minimally changed so forward walking momentum is allowed to survive through touchdown into the next transfer and swing, can V2 physically chain a genuine continuous walk?
Strict scope
Work only in the diagnostic harness, default-off.
Reuse CF-4's:
- walking frame and stance-width regulation;
- direct stance-to-stance transfer;
- planned trailing-foot unloading;
- coupled ankle feasibility;
- existing physical contact/support lifecycle.
Do not redesign the body, controller, contact physics, actuators or balance system.
The only new functionality permitted is the minimum walking-specific swing/foothold planning necessary to stop treating every step as a stop-step.
Specifically investigate how to generate the next foothold and swing terminal state from the body's current forward motion so the swing foot lands appropriately without requiring forward COM velocity to approach zero at touchdown.
Do not prescribe an arbitrary human gait animation. Physics remains authoritative.
Do not add hidden stabilizing forces, teleportation, kinematic root motion, outcome-dependent corrections, stronger actuators, increased friction, relaxed joint limits, body-specific tuning or post-contact velocity cancellation.
First prove this is genuinely continuous
A run counts as continuous walking only if:
1. physical alternating steps occur;
2. the next swing begins with inherited momentum;
3. forward COM momentum remains materially non-zero through touchdown;
4. the following transfer and swing inherit that state;
5. this repeats without resetting physical state.
Report COM velocity immediately before touchdown, at touchdown, after load acceptance and at the next liftoff.
If forward velocity repeatedly collapses near zero at touchdown, explicitly report NOT CONTINUOUS WALKING regardless of how many steps complete.
Tiny staged test
Start with V2-REF only at 240 Hz.
Do not run a large battery.
Attempt:
2 → 4 → 6 → 10 → 20 physical alternating forward steps.
Stop immediately at the first substantive failure and diagnose it.
If REF reaches 10 genuinely continuous steps with bounded state, test light/short, heavy/tall and long-legs.
If all four reach 10, allow 20 steps.
No more than this is necessary.
What matters
Track per step:
- forward and lateral COM velocity;
- pelvis velocity;
- DCM/capture point;
- capture margin;
- foothold/landing error;
- stride length and stance width;
- touchdown velocity;
- stance-foot slip;
- support/load transfer;
- joint-limit margins;
- ankle-inversion saturation;
- actuator saturation generally;
- torque continuity;
- energy residual;
- contact stability.
Show whether each important quantity converges to a periodic gait, remains bounded but irregular, or grows step-to-step.
This is now a serious architectural test
Do not automatically fix failures.
Classify the first blocker:
A — missing walking-specific planning/supervision, such as foothold prediction or heading regulation;
B — an existing V2 controller/mechanism reaches a correctable limitation under continuous gait;
C — structural V2 instability, such as compounding balance error, uncontrollable saturation, energy growth, contact instability or unavoidable falling despite a reasonable walking plan.
If A or B appears, diagnose it but do not implement another counterfactual automatically.
If C appears, stop immediately and treat it as meaningful evidence for reconsidering V2/V3.
Hard time/scope stop
This is an experiment, not a new development phase.
If producing a genuine continuous step requires multiple new subsystems rather than one minimal walking swing/foothold extension, stop and report that fact instead of building them.
Do not create CF-6 or recursively repair discovered problems.
Final answer
Give me:
Body | steps | COM speed pre-touchdown | at touchdown | next liftoff | bounded/diverging | first blocker | A/B/C
And answer explicitly:
1. Did V2 physically walk continuously, rather than repeatedly execute stop-steps?
2. What is the maximum number of consecutive genuine continuous walking steps demonstrated?
3. Did its state converge toward a repeatable gait cycle or deteriorate step-to-step?
4. Did anything appear that materially argues for V3?
Then stop. Do not adopt the diagnostic, build production walking, begin running, or resume TD2C/E2 until I review the result.

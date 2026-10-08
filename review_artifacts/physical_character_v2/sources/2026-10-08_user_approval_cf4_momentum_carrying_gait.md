# User approval 2026-10-08 — CF-4 momentum-carrying continuous-gait counterfactual, final diagnostic (verbatim)

Received in the Claude Code session of 8 Oct 2026, after CF-3 (`diagnostics/loco_cf3_2026-10-08/`). Reproduced verbatim below.

---

Approve one final diagnostic counterfactual specifically to test momentum-carrying continuous walking.
The previous cadence sweep answered an important question: shortening the existing isolated-step schedule cannot produce dynamic walking because the lifecycle itself forces the character to settle before every swing. Do not continue shortening those timers.
We now have strong evidence that V2 can chain quasi-static physical steps: four representative bodies complete 20 steps with bounded periodic state. Preserve that result.
The remaining architectural question is:
When the next swing is allowed to begin while the body still carries meaningful forward momentum from the previous step, does V2 remain physically bounded or does its underlying architecture become unstable?
This remains diagnostic-only. Do not adopt any mechanism, alter TD2C/E2, or treat the result as qualified walking.
Build the minimum continuous-gait counterfactual
Supply only the two missing lifecycle/planning mechanisms identified by CF-3:
1. Direct stance-to-stance transfer
After touchdown/load acceptance, move the capture-point/balance objective continuously toward the next stance/support state rather than first returning to and settling at a midpoint.
The transfer should be derived from the current measured physical state and next foothold/support geometry.
Do not artificially stop COM motion between steps.
2. Planned trailing-foot unloading/release
Do not wait passively for the trailing foot's measured load to decay below the existing <1% release threshold before beginning the next gait phase.
Introduce a diagnostic gait-level load-transfer plan that deliberately unloads the trailing foot as the new stance foot accepts support.
Physical measured contact remains authoritative: the foot may lift only when physically unloaded sufficiently under a principled release rule. Do not fake liftoff or contact.
The objective is to permit the next swing to begin while meaningful COM/DCM momentum remains from the preceding step.
Preserve everything else
Keep the existing:
- V2 body;
- actuators and capacities;
- contact/friction physics;
- CF-2 coupled ankle feasibility;
- CF-3 walking frame/stance-width regulation;
- swing trajectory and servo;
- touchdown physics;
- support/contact lifecycle;
- deterministic simulation.
Do not add hidden stabilisation, COM forces, kinematic corrections, teleportation, increased capacities, body-specific tuning or outcome-dependent intervention.
Do not fix the recorded small toe-out/yaw drift unless it prevents this experiment from answering the momentum question.
Prove that this is actually a different regime
Before interpreting stability, demonstrate quantitatively that the next swing now starts with non-trivial inherited motion.
For every step record at swing initiation:
- COM velocity;
- DCM/capture-point state;
- pelvis velocity;
- remaining trailing-foot load;
- new-stance-foot load;
- time since previous touchdown.
Compare these directly with CF-3, where COM speed at swing decision was ≤2.1 mm/s.
If the new experiment still begins every swing near rest, stop. The experiment has not reached continuous walking and must not be reported as evidence about dynamic V2 stability.
Small staged test
Start with V2-REF only.
Find the slowest schedule that produces clearly non-trivial inherited forward momentum at the next swing.
Once that occurs, attempt:
2 → 4 → 6 → 10 → 20 genuine alternating physical steps.
If REF reaches at least 10 steps with bounded state, run the same regime on:
- light/short;
- heavy/tall;
- long-legs.
Do not run a giant battery.
If all bodies remain stable, optionally test one moderately faster regime. Do not proceed into running or a flight phase.
This time, failure means something
Once swing genuinely begins with inherited momentum, do not automatically classify failures as missing functionality.
Examine whether repeated use causes:
- growing COM/DCM error;
- loss of capture;
- accumulating pelvis drift;
- growing foothold error;
- increasing slip;
- progressively harder touchdown;
- actuator saturation that increases step-to-step;
- joint-limit convergence;
- torque discontinuities;
- positive/unexplained energy growth;
- contact instability;
- eventual unavoidable fall.
Separate a bounded periodic gait from a slowly diverging one.
Specifically watch the ankle-inversion saturation Claude identified as cadence increased. Determine whether it stays bounded per step or grows toward failure.
Classification
A: another clearly absent gait-planning function.
B: an existing V2 controller/mechanism reaches a limitation that appears reasonably correctable.
C: V2's underlying physical/control architecture becomes intrinsically unstable under momentum-carrying repeated locomotion.
A genuine C result should count as evidence toward V3. Do not explain it away.
Report
For every tested body give:
Body | inherited COM speed at swing | 2 steps | 4 | 6 | 10 | 20 | first failure | A/B/C
Also plot/report the per-step trend for the principal stability quantities so we can see whether they converge, remain periodic or diverge.
End with one of these conclusions:
GREEN: momentum-carrying repeated locomotion is demonstrated with bounded physical state; V2 is a credible basis for production walking.
YELLOW: continuous gait works partially but exposes identifiable controller/gait mechanisms requiring further development.
RED: momentum-carrying gait exposes structural instability that materially calls V2 into question.
Most importantly answer:
“Did we finally test the regime in which V1 failed—successive swings beginning with momentum from previous steps—and what happened?”
Stop immediately after this diagnostic. Do not adopt the counterfactual, resume TD2C/E2, implement production walking, or begin running.

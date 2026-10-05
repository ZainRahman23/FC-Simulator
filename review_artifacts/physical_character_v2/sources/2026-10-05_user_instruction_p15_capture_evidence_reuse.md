# User instruction, 2026-10-05: P15 is an evidence / reuse decision (verbatim)

Do not choose P1–P5 yet and do not weaken P15.
This is now an evidence/reuse decision. The BLF-style smooth put-down solved the torque discontinuity, while the remaining P15 failure is caused by the body losing recoverability before the landed foot becomes effective support.
Before implementing another candidate, research how established humanoid locomotion stacks handle emergency swing abort / early touchdown / capture during an interrupted swing, concentrating on IHMC, BLF and PyPnC and their underlying literature/code.
Specifically determine:
1. When balance becomes endangered during swing, do established controllers:
   - shorten swing duration;
   - alter the touchdown location using capture-point/DCM error;
   - begin contact/load-transition preparation before measured touchdown;
   - accelerate load acceptance after touchdown;
   - combine these;
   - or use another mechanism?
2. Distinguish carefully between:
   - commanding a foot toward contact;
   - anticipating contact in the controller;
   - measured physical contact;
   - accepting load;
   - declaring the foot supporting.
Physics/contact must remain authoritative. Do not fake contact or support before Jolt reports it.
3. Compare P1–P4 against the established approaches. P5 is not an engineering solution and should remain excluded unless evidence shows P15's premise itself is invalid.
4. Determine whether the 15 N·s disturbance is:
   - recoverable by an in-place emergency put-down;
   - recoverable only by changing foot placement;
   - or physically beyond the no-step recovery envelope.
Use capture-point/DCM analysis if appropriate rather than selecting a put-down duration from the observed pass/fail boundary.
5. Preserve the successful work:
   - keep the validated foot-yaw actuator unless contrary evidence appears;
   - keep the smooth BLF-derived trajectory machinery;
   - do not revert to the one-tick target drop;
   - do not tune passive ankle tissue for yaw;
   - do not weaken P15 merely to obtain a pass.
6. If established evidence clearly selects an architecture, implement it behind a default-off flag, preregister validation before the official run, and test it. If multiple materially different architectures remain defensible, stop and give me the comparison.
In particular, if the correct solution is a capture-aware recovery step, say so rather than forcing E1b to solve a problem that properly belongs to stepping/E2.
Also determine whether P15 should conceptually distinguish:
recover without moving the foothold versus recover by taking a step.
Do not change that criterion without my approval.
Do not begin E2 implementation yet. You may use E2/DCM/LIPM research to understand P15.
Keep everything local and do not push.

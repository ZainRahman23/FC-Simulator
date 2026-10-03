# User decision, 2026-10-03 — approve B only (engine one-step energy blow-up investigation)

Verbatim user instruction (received after `G3_ANKLE_LAW_STOP_REPORT.md`, commit 12309ee):

---

Decision: approve B only. Do not implement C or D yet. Do not start G4.
The evidence-supported ankle stiffness investigation has exposed a more fundamental G1 physics-integrity problem. We must understand that before changing the ankle model.
Preserve:
- accepted historical plant k = 0;
- all current G0/G1/G2/G3 artifacts;
- the diagnostic ankle law and stiffness switch;
- all failed stiffness results;
- the revised G3 criteria;
- the primary-source biomechanics findings.
Do not adopt any nonzero ankle stiffness yet.
B — INVESTIGATE THE ONE-STEP ENERGY BLOW-UP
The central question is:
How can introducing a small passive ankle restoring stiffness lead to a one-step whole-body energy increase of +182 J, +450 J, or much larger when the passive ankle itself contains nowhere near that amount of stored energy?

Treat this as a physics-engine/constraint-integrity investigation, not a controller problem.
No G2/G3 controller tuning.
1. Build a minimal deterministic reproducer
Find the smallest exact scenario that reproduces the blow-up reliably.
Start from one of the existing G1 failures at the lowest stiffness that reproduces it.
Capture the full physical state for several ticks before and after the energy jump.
Ideally reduce it progressively:
full body
→ relevant leg + pelvis
→ leg only
→ shank/foot + ankle
but only if each reduction still reproduces the same mechanism.
Do not assume the ankle itself is the source merely because enabling its stiffness triggers the event.
2. Exact per-tick energy ledger
For at least 10 ticks before and 10 ticks after the blow-up, account for:
- translational kinetic energy per body;
- rotational kinetic energy per body;
- gravitational potential;
- passive ankle spring potential;
- passive damping work;
- every other passive-joint potential/work term;
- motor/drive work;
- contact impulse work;
- joint-constraint impulse work where derivable;
- hard-limit / emergency-stop activity;
- penetration correction / Baumgarte or equivalent solver correction if applicable;
- warm-start impulses;
- restitution;
- friction;
- gyroscopic contribution;
- speculative contacts;
- any position/velocity stabilization.
Identify which bodies receive the first unexplained kinetic-energy increase and on which tick.
The ledger must distinguish:
the ankle stiffness causes energy
from
the ankle stiffness changes configuration, which triggers energy elsewhere.
3. Inspect the exact pre-blow-up configuration
At the last healthy tick and first bad tick report:
- all relevant joint angles;
- angular velocities;
- joint-limit distances;
- soft/end-stop torques;
- hard-stop state;
- actuator/drive targets and impulses;
- contact manifolds;
- contact normals;
- penetration depths;
- per-contact impulses;
- boot pieces in contact;
- self-contacts;
- body transforms;
- relative orientations;
- solver lambdas/constraint impulses if accessible.
Look specifically for:
- joint singularity or near-singularity;
- conflicting constraints;
- contact + joint-limit conflict;
- compound-contact pathology;
- incorrect drive target;
- limit sign/frame error;
- warm-start impulse amplification;
- restitution on a persistent contact;
- excessive penetration correction;
- invalid/ill-conditioned Jacobian;
- constraint ordering dependence.
4. Controlled ablations
Starting from the same saved pre-event state, change one thing at a time.
Diagnostic only:
- ankle stiffness off;
- ankle damping off;
- ankle hard stop off where safe;
- other passive ankle axes off;
- motors/drives off;
- contact restitution zero;
- friction zero;
- speculative contact off;
- warm starting off if Jolt exposes it;
- self-collision off;
- boot/turf contact removed;
- single-hull diagnostic boot;
- simplified foot contact geometry;
- relevant adjacent joint constraints removed one at a time;
- increased solver iterations;
- timestep sweep;
- isolated leg;
- zero gravity from the saved state if useful.
Do not adopt any ablation.
Build a causal table showing which intervention eliminates, reduces, moves, or leaves the blow-up unchanged.
5. Stiffness sweep is a trigger study, not tuning
Test around the onset:
k = 0, 0.01, 0.025, 0.05, 0.075, 0.10, 0.125, 0.15 N·m/°
only as diagnostics.
Determine whether:
- there is a sharp threshold;
- blow-up magnitude scales with stiffness;
- stiffness merely changes which configuration is reached;
- event timing changes continuously or discontinuously.
Do not select a stiffness from this sweep.
6. Jolt source-level audit
Trace the relevant Jolt constraint/contact code paths.
We already know earlier V2 investigations uncovered engine-specific behaviors that were not obvious from high-level API use.
Determine exactly how:
- SixDOF limits;
- motor/drive impulses;
- warm starting;
- contact constraints;
- restitution;
- penetration correction;
- velocity iterations;
- position stabilization
interact in the reproducing configuration.
If necessary, instrument the vendored/pinned Jolt build diagnostically.
Do not modify the production engine behavior yet.
7. Rate and solver study
Reproduce at the relevant combinations of:
- 180 Hz;
- 240 Hz;
- 360 Hz;
- 480 Hz;
- 720 Hz;
and appropriate iteration counts.
We need to know whether this is:
- timestep convergence failure;
- iteration convergence failure;
- discrete contact transition;
- or an engine/configuration defect that remains under refinement.
The fact that +182 J occurs at the validated 240 Hz configuration means this cannot simply be dismissed as an extreme-rate artifact.
8. Check whether accepted k=0 merely hides the same defect
This is critical.
Determine whether the accepted zero-stiffness plant can enter an equivalent pathological configuration under any existing or slightly perturbed G1 scenario.
Do not assume k=0 is physically safe merely because current tests pass.
Use state perturbations around the reproducing configuration to determine whether the stiffness is:
the defective mechanism
or merely
a path into an already-defective region of state space.
If k=0 can exhibit the same energy injection under a reachable physical state, that potentially reopens G1.
Stop and report that explicitly.
9. Passivity invariant
Add a diagnostic invariant capable of detecting this class of event automatically.
For a system containing only:
- gravity;
- passive tissue;
- dissipative damping;
- non-propulsive contacts;
unexplained positive mechanical energy beyond numerical tolerance must be flagged.
Do not choose the tolerance from the current failure magnitude.
Base it on the already-measured numerical floor/convergence behavior.
Keep this instrumentation permanently if practical.
10. Do not solve by hiding the state
Unacceptable "fixes" include:
- reducing ankle stiffness until the tested falls happen not to blow up;
- changing the G1 scenarios;
- tightening controller behavior so the configuration isn't reached;
- clamping velocities after the event;
- deleting energy;
- adding damping merely large enough to mask it;
- loosening the G1 energy criterion;
- adopting a load-dependent ankle law solely because it avoids the failing state.
We need the causal defect.
STOP CONDITIONS
If you identify an unambiguous implementation bug in our own V2 code that violates the existing specification, you may fix it diagnostically, demonstrate before/after, and rerun the reproducer.
Before adopting it into the accepted plant, report what changed and which historical gates require rerunning.
If the cause requires changing:
- Jolt configuration/solver architecture;
- contact architecture;
- joint topology;
- approved passive-tissue specification;
- timestep;
- solver-iteration policy;
- anatomical limits;
STOP FOR MY DECISION.
Do not proceed to C.
Do not change posture-control switch-following behavior.
Do not start G4.
REQUIRED REPORT
Return with:
1. smallest deterministic reproducer;
2. first bad tick;
3. exact body/body-pair where unexplained energy first appears;
4. per-tick energy ledger;
5. pre/post state;
6. constraint/contact impulses;
7. ablation matrix;
8. stiffness-trigger sweep;
9. timestep/iteration results;
10. Jolt source-level explanation;
11. whether k=0 can reach the same pathology;
12. whether this is our implementation bug, Jolt behavior, invalid configuration, or unresolved;
13. candidate fixes, without selecting one if architectural;
14. consequences for G1/G2/G3;
15. permanent regression/invariant you recommend.
Preserve everything, commit diagnostic work locally, nothing pushed, and STOP.

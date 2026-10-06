# User decision, 2026-10-06: diagnostic-only investigation of the swing velocity-lag (verbatim)

Approve the diagnostic-only investigation. Do not change controller behaviour, gains, lifecycle constants, swing trajectory, E2 criteria or physical parameters yet.
The objective is to explain the approximately 20 ms velocity-like tracking lag and why the existing validated velocity feed-forward appears to deliver only ~70% of its intended compensation.
Instrument the entire command path from swing-foot reference to realized motion and identify where the phase/amplitude loss enters.
In particular distinguish:
- reference generation;
- Cartesian desired position/velocity;
- IK/Jacobian conversion;
- desired joint velocity;
- any filtering/interpolation;
- gain blending around liftoff;
- velocity-error term;
- feed-forward term;
- joint damping;
- actuator command;
- Jolt motor/constraint target;
- actual joint velocity;
- actual foot Cartesian velocity.
Test the hypotheses you identified:
1. implicit actuator/motor response in Jolt;
2. IK/Jacobian rate-convention or frame error;
3. velocity feed-forward being scaled/filtered/combined incorrectly;
4. pelvis/body motion causing the Cartesian foot error despite correct relative-leg tracking;
5. lifecycle gain blending creating part of the lag.
Use simple diagnostic trajectories—constant Cartesian velocity, low-frequency sinusoid/chirp and direction reversals—so phase delay and amplitude ratio can be measured independently of E2.
Where possible compare floating-body and artificially fixed-pelvis diagnostics to separate leg-servo error from floating-base coupling.
Do not fix anything yet.
Produce a causal accounting of the ~20 ms / ~70% behavior and identify the smallest principled correction.
Keep D1 default-off and do not run official E2.
Keep everything local. Do not push.

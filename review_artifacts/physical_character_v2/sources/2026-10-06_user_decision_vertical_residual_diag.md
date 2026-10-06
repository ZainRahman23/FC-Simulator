# User decision, 2026-10-06: bounded diagnostic-only investigation of the descent-end / touchdown vertical residual (verbatim)

Approve a bounded diagnostic-only investigation of the descent-end / touchdown vertical residual. Do not change behaviour yet.
The objective is to causally explain why the swing foot is approximately 1–2.4 mm below its vertical reference near the end of descent and still moving downward at approximately 0.05–0.08 m/s when physical contact occurs.
Treat the following as potentially one causal family until disproven:
- T-1 vertical residual;
- early physical contact;
- touchdown/rebound failures;
- touchdown torque steps;
- the binding φ≈0.80 clearance allowance;
- post-touchdown contact loss on longer/harder trajectories.
Instrument and decompose vertical foot motion from reference generation through realized contact. Specifically separate:
- desired world-space foot z, velocity and acceleration;
- desired relative-to-pelvis/stance-foot quantities;
- measured pelvis translation/velocity/acceleration;
- Jacobian/Jdot contributions;
- desired and realized joint velocities/accelerations;
- D1 feed-forward;
- PD/velocity terms;
- gravity/passive terms;
- actuator saturation;
- support-leg/body motion;
- Jolt contact onset.
Use matched diagnostics that isolate:
1. fixed pelvis versus floating pelvis;
2. vertical-only swing versus full forward/lateral swing;
3. D1 on/off;
4. representative E2 trajectories versus one harder reachable trajectory;
5. 180/240/480 Hz;
6. descent before contact versus the same trajectory with the turf removed/lowered so physical contact cannot truncate the measurement.
Determine whether the residual is primarily:
- floating-base/pelvis coupling;
- actuator/servo phase lag;
- incomplete floating-base inverse-dynamics compensation;
- trajectory/reference-frame construction;
- contact anticipation/early geometry contact;
- or another identified mechanism.
Do not implement a softer landing, change the apex, change swing duration, alter gains, modify E2-5, or change tracking/clearance thresholds during this investigation.
Reachability: also report how the existing certifier should distinguish positional IK reachability from dynamically executable swing reachability, but do not change it yet. The V2-long-legs 0.11 m lateral case is important evidence: position-reachable does not imply executable under finite torque/conditioning.
T-1: do not remove or weaken it merely because the miss is 0.26/0.28 versus 0.25. Determine what it measures and whether it remains physically meaningful before proposing any amendment.
φ=0.80: do not round the 4.977 mm result into a pass. Preserve the failure. Revisit the clearance certificate only after the vertical residual is understood.
Touchdown metric: preserve both the instantaneous and exact-10-ms measurements. Do not adopt the 10 ms formulation yet. The current data show that it is more rate-robust, but also that the physical landing remains too hard under the existing 25% BW concept.
At the end, give me:
1. a causal decomposition of the vertical residual;
2. counterfactual evidence isolating the dominant cause;
3. the smallest principled correction;
4. expected consequences for clearance, touchdown impact, torque steps and contact retention;
5. whether the correction belongs generally in the swing servo or specifically in touchdown/descent behavior;
6. whether external research is still needed before implementation.
Stop before implementing the correction.
Keep recovery issue C untouched. Keep all existing failed evidence. Keep everything local and do not push.

# User instruction (verbatim), 2026-10-04 23:xx UTC: close the remaining decisions before E1a (do not run E1a)

Pasted by the user; reproduced exactly as received, below the rule.

---

Continue from the knee-correction decision point. Do not run E1a yet.
I provisionally accept the corrected-knee architecture and reject reverting to the old knee. The evidence so far strongly supports the corrected mechanism, but close the remaining decisions rigorously before E1a.
1. Four preregistration failures
Audit the three threshold failures and the invalid test-premise failure individually.
If, as currently reported, the criteria themselves were incorrectly specified rather than the corrected knee failing their intended physical requirement:
- preserve the original frozen preregistration unchanged;
- document the original result as FAIL;
- explain exactly why the criterion/premise was invalid;
- create a versioned corrected/superseding criterion before any further qualifying run;
- demonstrate that the corrected criterion follows from the intended invariant/evidence rather than from choosing a threshold that admits this result;
- where possible, test the corrected criterion against both the old and new knee and adversarial deliberately-bad cases to show that it still has discriminatory power.
Do not simply convert failures into passes.
2. Splayed-leg hip-rest finding
Treat this as a genuine finding.
Do not loosen the hip tolerance, tune the hip, or select knee parameters by G1 score.
Investigate why the corrected knee redistributes passive-collapse rotation into the hip and characterize the dependency on the provisional >120° knee parameters.
For the two evidence-range deep-flexion settings that remove the hip-rest failure, determine independently whether each is supported by the literature/evidence already collected. Compare them with the current central estimate without using G1 outcome as the selection criterion.
If the evidence cannot distinguish them, retain deep flexion as an uncertainty/sensitivity family rather than choosing the best-scoring member.
Determine whether any deep-flexion uncertainty actually matters inside E1a's observed/expected knee-flexion envelope. Do not require E1a to certify 145° knee behavior if E1a never approaches it.
3. Ankle stiffness
Re-evaluate whether k ≈ 0.13 can now be adopted with the corrected knee. Use the preregistered/evidence-derived requirements, not improvement in G1 failure rate as the reason.
Explicitly distinguish:
- passive unloaded ankle evidence;
- single-support yaw anchoring;
- active yaw control that the biological ankle/subtalar/foot complex would provide but our reduced coordinate may lack.
Do not make passive ankle stiffness artificially responsible for whole-body yaw stability.
4. Reference twist policy
Re-evaluate and, if justified by the previously collected evidence, adopt the reference semantics with the corrected knee + chosen ankle configuration.
Preserve voluntary heading/turning as an active command rather than accidental retained twist.
5. Support lifecycle / G3 row K
Investigate the remaining row-K failure in the E1a configuration. Determine whether it is:
- an actual lifecycle/mechanical defect;
- an obsolete criterion/premise;
- or an expected consequence of enabling the lifecycle that requires a versioned criterion change.
Do not waive it merely because E1a needs the lifecycle.
6. Qualification
Once these decisions are resolved, run the appropriate corrected qualification/regression sequence on frozen code/configuration.
Require:
- corrected-knee mechanical validation still clean;
- G0–G3 appropriate to the newly adopted configuration;
- no unexplained energy generation;
- deterministic/browser equivalence;
- acceptable timestep behavior;
- E1a-envelope knee behavior;
- yaw decomposition remaining observable;
- no tuning to E1a outcomes.
Then finalize the E1a v2 configuration and freeze/preregister it before E1a is ever run.
If all of that closes cleanly, stop and report E1a READY TO AUTHORISE, but still do not run E1a without my explicit approval.
If something genuinely blocks E1a, stop with the smallest unresolved blocker, evidence, alternatives and recommendation.
Keep the old knee, original preregistration and all historical results intact. Commit locally only. Nothing pushed.

# User decision (verbatim), 2026-10-05: implement B1 + B3 subject to preregistered validation; no Option A; then (only if qualified) adopt, re-freeze and rerun E1a

Pasted by the user; reproduced exactly as received, below the rule.

---

Approved: proceed with B1 and B3 exactly as proposed, subject to the preregistered validation you described.
Do not implement release-on-request (Option A). Keep the existing physical load-based release criterion and existing 1% threshold.
Before changing production behavior:
1. Freeze and commit the complete validation specification/dataset and acceptance criteria.
2. Preserve the current failed E1a evidence unchanged.
3. Preserve the current default behavior behind default-off flags until qualification is complete.
Then implement and test:
B1 — generalized-force correction
- Add the missing locked-axis contribution to the knee feed-forward/generalized-force calculation.
- Apply the same mathematically required correction to the elbow if the same mapping defect exists there.
- This must be derived from the actual generalized-force/vector identity, not fitted to E1a.
- Bench-test it across the preregistered twist/flexion domain and demonstrate that the corrected mapping matches the independently calculated generalized force.
B3 — zero-share cap
- When a foot is below the lifecycle's existing unloaded-share level, its commanded support share may not exceed its requested share.
- Do not use this to force the physical foot off the ground.
- Do not change the existing 1% physical load release threshold.
- Verify that small legitimate nonzero requested shares are preserved and do not falsely trigger release.
Run the separate preregistered unloading characterization across both feet, all eight bodies, the full specified pelvis-drop range, zero and small-nonzero shares, perturbations, release-boundary cases, recontact/chatter cases, stance slip, energy, torque continuity, determinism and browser/Node equivalence.
Include diagnostic arms for:
- original configuration;
- B1 only;
- B3 only;
- B1+B3.
I want the results to demonstrate causal separation: B1 should remove the large residual created by the incorrect generalized-force mapping; B3 should remove only the smaller support-share leakage.
Then run the full regression sequence exactly as proposed:
- component/bench regressions;
- G0;
- G1;
- G2;
- G3 including symmetry and the relevant pelvis-drop/knee/yaw checks.
Do not reinterpret a regression failure merely to advance E1. Stop if B1 or B3 creates a substantive new physical failure.
If and only if B1+B3 qualify:
1. adopt/version them;
2. write and commit the E1a configuration addendum;
3. re-freeze E1a without changing its behavioral criteria;
4. rerun E1a exactly as originally intended.
Do not tune anything from the E1a outcome.
If E1a reaches actual liftoff, continue through its already-preregistered lift → hover → replace/touchdown → load-acceptance sequence and evaluate every criterion. Do not start E1b unless E1a passes.
If E1a fails at a new stage, preserve the failure and stop there for review.
Maintain the architectural rule throughout: controller/lifecycle changes may withdraw or redirect control authority, but they may never kinematically lift, teleport, pin, detach or otherwise force the foot through the desired trajectory. The physics simulation must determine the actual motion and contacts.
Also preserve as technical debt, without solving it during this task unless it directly invalidates qualification:
- posture-authority withdrawal;
- slow pelvis settling;
- hip end-range review TD-16;
- any newly identified elbow consequence beyond the generalized-force mapping correction itself.
At completion report:
- B1 bench result;
- unloading dataset results;
- B1/B3 causal comparison;
- G0–G3 results;
- whether B1+B3 were adopted;
- E1a result criterion-by-criterion;
- actual foot-load trajectory around release;
- actual liftoff time and height if liftoff occurs;
- hover behavior;
- touchdown impact/load acceptance if reached;
- all regressions/new debt;
- commit hashes.
Commit locally only. Nothing pushed.

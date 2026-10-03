<!-- preserved verbatim: the user's instruction to continue the approved G1 work autonomously, 2026-10-03. -->

Continue autonomously with the currently approved G1 work while I am away.
Follow the previous instructions exactly. In particular:
- finish the C2 measured per-joint emergency-stop derivation rather than choosing arbitrary margins;
- complete the C3 foot/contact-manifold comparison before adopting a permanent representation;
- keep 240 Hz as the candidate baseline and treat realistic no-tunnelling validation separately from the extreme 15 m/s penetration test;
- rerun G0 whenever an approved collision/joint representation change requires it;
- rerun the full G1 suite, variants, determinism and timestep sensitivity after the decisions are integrated;
- preserve raw measurements and negative results;
- make local checkpoint commits where useful;
- do not push.
You have a long runway while I am away, so if G1 still fails, continue diagnosing it with controlled experiments as long as the next experiment does not require changing an approved anatomical value, topology, or foundational physical-authority rule. You may fix demonstrated implementation bugs and engine-configuration issues, but document each causal chain and rerun the relevant gates afterward.
Do not weaken criteria simply to obtain a pass. A criterion may only change when you demonstrate that the previous criterion was internally contradictory, below the measured numerical floor, or testing the wrong physical requirement, and record that evidence in the decision log.
If C3 has a clear winner that preserves the approved external foot anatomy and materially improves contact without introducing instability or excessive cost, you may adopt it, document why, rerun G0/G1, and continue. If the alternatives involve a meaningful tradeoff with no evidence-based winner, stop for my decision.
If G1 eventually passes cleanly, STOP THERE. Do not start G2 active standing.
If G1 cannot pass without:
- changing approved anatomy;
- changing core physical topology;
- globally moving to an obviously impractical simulation rate;
- introducing hidden support/forces;
- or making another architectural decision with materially different viable alternatives,
stop and leave me a decision report.
Before stopping for any reason, leave the repository in a clean/recoverable state, commit intended G1 work locally, keep V1 untouched, keep the review artifacts, and leave the review server running if practical.
When I return, I want either:
A. G1 PASS with the complete evidence and review page,
or
B. G1 NOT YET PASSED with the remaining failures reduced to specific measured causes and the smallest decisions needed from me.
Under no circumstances begin G2 while I am away.

<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 2802. -->

G1a looks good overall and I approve the architecture demonstrated by it, but do not start G2 continuous walking yet.
Do a small G1b closure/qualification pass first.
The purpose is not to add locomotion capability. It is to understand/close the two failed G1a criteria and remove only the issues that would directly undermine G2.
1. 240 vs 480 Hz convergence
Investigate S10's 4–15% disagreement in the 50 ms landing-impact windows.
The overall trajectory and touchdown timing already agree, so determine whether this is:
- an expected sampling/windowing artifact;
- contact-solver/substep sensitivity;
- controller-rate sensitivity;
- or a genuine physical divergence.
Compare physically meaningful integrated quantities over appropriate event windows, not only a fixed arbitrary 50 ms window.
Do not tune 240 Hz merely to reproduce 480 Hz.
I want to know whether both rates converge on materially the same physical event and whether 240 Hz remains justified.
2. Controller performance
Profile the new controller/locomotion layers rather than broadly optimizing.
Break the reported ~0.13–0.76 ms/player/frame into:
- sensing;
- motion planning;
- gait/support state;
- task controllers;
- actuator arbitration;
- diagnostics/instrumentation;
- anything else material.
Determine p50/p95/worst representative costs and distinguish production-required computation from review/debug instrumentation.
Look for obvious accidental costs or work that does not need to run at 240 Hz.
Make only low-risk/general optimizations if an obvious problem is found. Do not compromise determinism or physical behavior to hit the provisional 0.4 ms target.
Give me a realistic preliminary 22-player projection, clearly separating Jolt, production controller and debug/review overhead.
3. G2 blockers
Review the listed open items and fix only those that genuinely block continuous walking:
- no mid-swing escalation from rhythmic → corrective step;
- no downward search when planned ground is absent;
- touching-but-unloaded foot not being reloaded;
- recovery planner choosing the same foot twice;
- ±12° pelvis yaw during in-place stepping.
Do not automatically fix all five.
Classify each as:
G2 blocker / can wait / desirable later
with reasoning.
Implement only genuine G2 blockers that can be fixed cleanly without expanding scope.
4. Latency
Preserve the latency architecture, but do not canonize 50 ms / 120 ms as universal human constants.
Document which processes actually require:
- immediate mechanical response;
- fast feedback;
- slower replanning.
Do not tune latency merely to make tests pass.
5. Final G1 visual review
Give me a compact interactive review containing the most informative G1 cases:
- 10 alternating steps;
- weight transfer + single step;
- push during swing;
- unexpected early touchdown;
- obstacle contact;
- actuator saturation;
- the most important latency comparison;
- the 240/480 comparison.
I care separately about:
physical correctness and how human the movement looks.
Do not hide robotic movement just because the metrics pass.
Scope
Do not start continuous walking.
Do not work on C4/C5.
Do not return to the Reference Tackle.
Do not alter authoritative football simulation.
Do not push.
Keep tests sequential and resource use conservative.
At the end, tell me whether G1 as a whole is ready to promote and G2 is ready to begin, and stop for my review.

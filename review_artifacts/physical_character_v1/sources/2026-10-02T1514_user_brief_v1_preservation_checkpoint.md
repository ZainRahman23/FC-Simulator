<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 18638. -->

PRESERVATION CHECKPOINT — FREEZE AND SAVE PHYSICAL CHARACTER V1
Before we make any further architectural decisions, I want the entire current Physical Character V1 state preserved safely and comprehensively.
This is a preservation task only.
Do not begin V2.
Do not redesign the character.
Do not improve walking.
Do not continue transition-planned walking.
Do not tune anything.
Do not refactor working code unless absolutely necessary to create the preservation artifacts.
Do not push anything.
The objective is:
If I reboot the machine, close this Claude session, create a fresh Claude session weeks from now, or decide to return to V1 after building V2, we must be able to recover exactly where we are now and understand why everything exists.

1. STOP DEVELOPMENT
First stop any:
- physics batches;
- oracle searches;
- model fitting;
- identification runs;
- background experiments;
- headless browsers;
- temporary analysis jobs.
The only process that may remain afterward is the single review server if useful.
Do not kill unrelated user/system processes.
Record what you stopped and what remains.
2. AUDIT THE CURRENT REPOSITORY STATE
Record:
- exact worktree path;
- branch;
- HEAD;
- local commits;
- upstream status;
- remote status;
- tracked modifications;
- staged files;
- untracked files;
- ignored/generated evidence;
- anything in temporary directories that matters.
Explicitly establish:
what exists only locally
and
what exists remotely.
Do not assume previous handoff statements remain current.
3. COMMIT ALL INTENDED V1 SOURCE / DOCUMENTATION
Review the current changes carefully.
All intended V1:
- source code;
- test code;
- harness code;
- regression tooling;
- diagnostic tooling;
- configuration;
- reports;
- decision records;
- handoff documentation;
should be safely represented in local Git commits where appropriate.
Do not blindly commit generated media, huge raw datasets or files that project policy intentionally keeps outside Git.
Preserve those separately.
Make a final clearly named local checkpoint commit if necessary, e.g. conceptually:
checkpoint(physchar-v1): freeze complete pre-V2 research state
Do not rewrite historical commits.
Do not squash the research history.
Do not push.
4. TAG THE EXACT V1 FREEZE POINT
Create an unambiguous local Git tag identifying the final V1 research state.
Use a clear name such as:
checkpoint/physchar-v1-final-research
or the closest naming convention compatible with the repository.
Record:
- tag;
- commit hash;
- branch;
- date/time.
Do not move an existing historical tag.
Do not push the tag.
5. PRESERVE NON-GIT EVIDENCE
Identify everything important that intentionally lives outside Git, including where applicable:
- review screenshots;
- contact sheets;
- raw identification data;
- oracle results;
- model-fitting data;
- JSON result files;
- baseline hashes;
- videos/captures;
- regression evidence;
- local analysis outputs;
- temporary scripts that became important;
- Astra reports copied into the project;
- any evidence required to reproduce recent conclusions.
Copy/move anything important out of volatile locations such as /private/tmp.
Nothing necessary to understand or reproduce V1 may remain only in a temporary directory.
Preserve the existing project's policy of keeping large/generated evidence out of Git where appropriate.
6. CREATE A NEW COMPLETE NON-GIT SNAPSHOT
Create a new dated preservation directory alongside the previous preserved snapshots.
It should contain at minimum:
Git recovery
- full Git bundle containing the complete V1 branch/history;
- verification that the bundle is valid;
Non-Git evidence
- archive of important untracked/generated V1 evidence;
- file manifest;
- checksums;
Recovery documentation
- exact restore instructions;
- exact worktree/branch/tag/HEAD;
- environment assumptions;
- how to restart the review server;
- how to rerun regressions;
- where important review pages/reports live.
Verify the snapshot rather than merely creating it.
7. PRESERVE ALL APPROVED BASELINES
Ensure the preservation contains the complete historical baseline/evidence chain for:
- Gate A;
- Gate B;
- C1;
- C2;
- V1/V1.1;
- C3;
- C4;
- C5;
- Gate D;
- D6;
- G1;
- G2a;
- subsequent G2 walking experiments;
- foot-gate F0/F1/F2/F2h work where preserved;
- current Physical Stepper work.
Do not regenerate historical baselines unnecessarily.
Preserve the original evidence rather than replacing it with current reruns.
8. FINAL REGRESSION STATE
We already recently obtained clean results such as:
- regress.sh 12/12;
- G2W_A8 6/6;
- F0/F2h foot-gate 42/42;
Verify the exact current status from the repository/evidence.
Do not run huge experiments merely for preservation.
Run only cheap final checks necessary to establish that the frozen checkpoint is internally consistent.
Record exact results and hashes.
9. PRESERVE THE PHYSICAL STEPPER WORK
The new Physical Stepper did not solve robust walking, but it contains important architecture and evidence.
Preserve it completely.
In particular preserve:
- pc_stepper.js and associated code;
- opt-in wiring;
- contact-event lifecycle;
- surrogate/model code;
- oracle tools;
- one-step/two-step experiments;
- prediction-quality measurements;
- planner-cost measurements;
- event lifecycle evidence;
- viewer;
- decision record;
- reports.
Do not delete it because it failed to outperform the old controller.
Its negative results are part of V1's research record.
10. PRESERVE THE LATEST CORRECTED FINDINGS
The final V1 handoff must explicitly capture the latest corrections to earlier conclusions.
In particular:
Oracle fragility
Earlier 28–34-step oracle results were not evidence of robust walking.
Tiny command differences (~0.1 mm) can materially alter survival.
Preserve the exact evidence and explanation.
Speed creep
Persistent stride-to-stride speed creep remains the major observed walking failure.
Long steps can brake
Correct the earlier claim that stepping cannot brake.
Long steps can reduce speed by approximately the measured amount in the current experiments.
Good gait vs controller gait
Preserve the measured difference between the longer-step/longer-double-support gait and the current short/quick controller gait.
Lookahead
Lookahead helps case-by-case but has not produced robust walking.
Learned planner
Preserve its measured prediction errors, false-safe rate and compute cost.
Stance experiments
Preserve that the tested stance/speed-regulation changes did not materially solve the problem.
Double-support transition
Preserve the latest evidence that event-based double-support termination materially increases transition unpredictability and that transition-planned walking is the current leading next hypothesis, not an implemented/approved solution.
Do not rewrite history to make the research look more linear than it was.
11. PRESERVE THE ASTRA RESEARCH / ARCHITECTURAL DECISIONS
Ensure the handoff references or preserves the conclusions from the recent independent research:
Walking/planning research
- continuation viability matters;
- do not flatten normal within-stride COM velocity oscillation;
- stance changes should be evidence-gated;
- physical toes remain deferred.
Furkan / Stepper research
- useful abstraction: explicit future contact/limb intentions;
- football actions may eventually modify/contact-constrain locomotion plans;
- requested events must still physically fail when execution/contact fails;
- Furkan's unrecovered Stepper implementation must not be treated as known source code.
Production render skeleton research
Freeze the future render-skeleton contract:
root
→ hips
→ three-spine torso / limbs
with:
upperLeg → lowerLeg → foot → toe
plus clavicles, hands, neck/head and branch-based deformation twist bones.
Record:
- hips is the render pelvis semantic;
- there are no semantic hip_L / hip_R render bones;
- physical left/right hip joints remain physics constraints;
- render toe does not imply physical toe;
- structural root is not mapped to Unity Humanoid;
- canonical production reference/export pose is T-pose;
- fingers remain deferred;
- same semantic topology for goalkeeper/outfield players.
This is a future V2/render contract. Do not implement it during this preservation task.
12. CREATE A FINAL V1 HANDOFF
Create a new definitive document, something like:
PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md
It should be sufficient for a fresh engineer/Claude session with no conversational memory.
Include:
A. What V1 is
Purpose and architecture.
B. Exact frozen state
Branch, HEAD, tag, snapshot.
C. Body
Bodies, joints, dimensions, physical-foot state and relevant parameters.
D. Controller architecture
C1–C5, G1/G2 work and current walking stack.
E. What is approved
Exact gate history.
F. What worked
Important successful mechanisms.
G. What failed
Include negative results.
H. Current walking problem
Explain it in plain English and technically.
I. Oracle findings and corrections
J. Physical Stepper
Architecture, results and limitations.
K. Foot experiments
F0/F1/F2/F2h conclusions.
L. Two-body/contact work
Gate D/D6.
M. Determinism/random integrity
N. Performance
O. Important diagnostics/tools
P. Review pages
Q. Important source files
R. Important reports/evidence
S. Current unresolved hypotheses
Especially transition-planned walking.
T. Things NOT to rediscover
List disproven/reverted ideas and why.
U. Future production render-skeleton contract
Clearly separated from V1 physics.
V. Exact recovery instructions
13. CREATE A SHORT V1 LESSONS DOCUMENT
In addition to the exhaustive handoff, create a concise:
PHYSICAL_CHARACTER_V1_LESSONS.md
This should answer:
If we build Physical Character V2, what did V1 teach us that we absolutely should not forget?

Include architectural lessons, successful mechanisms, failed assumptions, testing methodology and traps.
Do not design V2 yet.
This document is lessons only.
14. CREATE A MACHINE-READABLE MANIFEST
Create a compact machine-readable manifest (JSON is fine) containing:
- branch;
- HEAD;
- tag;
- relevant commit range;
- important baseline files;
- important report paths;
- important viewer paths;
- snapshot path;
- snapshot checksums;
- regression status;
- server command;
- important opt-in flags;
- volatile/untracked evidence locations if any remain.
This will make future restoration less dependent on prose.
15. VERIFY RECOVERY
Before declaring success, verify as much as practical that:
- Git bundle is readable;
- tag resolves correctly;
- archived files match checksums;
- handoff paths exist;
- important reports exist;
- important source files exist;
- review viewer still loads if server is intentionally left running;
- restore instructions are internally consistent.
Do not actually destroy/reclone the working tree unless necessary.
16. DO NOT PUSH
This is important:
Nothing gets pushed.
Report explicitly:
- which commits exist only locally;
- whether the branch has an upstream;
- whether the tag exists only locally;
- last known remote state.
17. FINAL STATE
Once preservation is complete:
- stop all temporary/background processes;
- optionally leave one review server only if useful;
- make no further code changes;
- do not begin V2;
- do not continue walking experiments;
- wait for my review.
FINAL RESPONSE
Start with:
V1 PRESERVATION: SAFE / NOT SAFE
Then report:
1. frozen branch / HEAD / tag;
2. final local commits;
3. what is unpushed;
4. Git status;
5. snapshot location;
6. Git bundle verification;
7. non-Git archive verification;
8. regression status;
9. final handoff path;
10. lessons document path;
11. manifest path;
12. review URL if one remains;
13. processes still running;
14. anything that would prevent a reboot right now.
End with a plain-English statement:
If the machine were rebooted immediately after this message, could a fresh session recover the complete V1 state and continue from it?

Answer yes or no and explain any remaining caveat.
Then STOP. Do not start V2.

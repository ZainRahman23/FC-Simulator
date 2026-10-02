<!-- preserved verbatim: the user's approval of the V2 specification and the G0 brief, 2026-10-02. -->

I approve proceeding with Physical Character V2, with the following decisions:
1. Commit the completed V2 specification and its calculation/source artifacts locally on the V2 branch. Do not push.
2. Approve the canonical baseline body at 1.82 m / 78 kg. Treat this as the reference/generated baseline, not a permanent universal player size. Preserve the parameterized height/weight architecture.
3. Approve athlete-appropriate strength/torque evidence as the V2 baseline where supported by the cited literature. Preserve source provenance and do not simply run every motor continuously at measured maximum voluntary torque. The actuator architecture must retain dynamic/velocity-dependent capability and activation behavior.
4. Approve the proposed core V2 topology for G0.
5. Begin with the realistic single rigid physical foot proposed in the specification. Keep the render foot → toe hierarchy. Do not add a physical forefoot yet. Preserve the planned forefoot capability test before running/sprinting so physical articulation can earn promotion from measured need.
6. Defer the 22-player browser-WASM vs native/server Jolt decision. Record it as an unresolved production architecture decision. It must not block G0/G1.
7. Approve the remaining specification decisions as written except where implementation of G0 exposes a concrete contradiction. If that occurs, stop rather than silently changing the specification.
IMPLEMENT V2-G0 ONLY
Build the anatomy/static-construction gate exactly as specified.
G0 should include:
- deterministic V2 human generator from the 1.82 m / 78 kg reference parameters;
- semantic 31-bone production skeleton in canonical T-pose;
- exact coordinate/chirality contract;
- V2 physical rigid bodies;
- colliders;
- masses;
- COMs;
- inertias;
- all physical joints and frames;
- joint limits;
- passive joint properties required by the specification;
- physics ↔ semantic/render mapping;
- rigid-foot + procedural/render-toe mapping;
- body-size parameterization infrastructure;
- static inspection/review harness;
- instrumentation necessary to inspect every body/joint numerically.
Do not implement active standing, balance, stepping or locomotion.
Motors may exist structurally if required by the architecture, but G0 is not a controller gate.
REVIEW HARNESS
I want to be able to visually inspect V2 before G1.
Provide a clear browser review page showing the V2 character in T-pose and/or neutral anatomical pose with toggles for:
- rendered/semantic skeleton;
- physical rigid bodies;
- colliders;
- joint centres;
- joint axes;
- joint limits;
- segment COMs;
- total COM;
- bone names;
- body names;
- physics ↔ render mapping;
- left/right identification;
- ground plane;
- dimensions.
Provide useful cameras:
- front;
- back;
- side;
- 3/4;
- top if useful.
Make the differences between semantic bones and physical bodies visually obvious.
In particular I want to inspect:
- pelvis/Unity hips relationship;
- left/right physical hip centres;
- knee axes;
- ankle location inside the new realistic foot;
- heel length;
- forefoot length;
- foot → toe semantic inheritance;
- shoulder centres;
- spine mapping;
- overall proportions.
NUMERICAL G0 VALIDATION
Verify automatically:
- generated height;
- total mass;
- segment mass sum;
- whole-body COM;
- body dimensions;
- bilateral symmetry where intended;
- joint-centre positions;
- joint axes;
- chirality;
- no mirrored-coordinate mistake;
- no initial collider interpenetration beyond declared tolerance;
- semantic hierarchy validity;
- Unity Humanoid semantic mapping completeness;
- foot dimensions;
- ground alignment;
- inertia tensors positive/valid;
- deterministic generation;
- identical repeated hashes.
Compare the important physical measurements against the specification and fail loudly if they differ outside declared tolerances.
V1
V1 remains completely frozen.
Do not modify its branch, tag, snapshot, baselines or evidence.
Reuse body-agnostic infrastructure only through the V2 branch/worktree as specified.
STOP CONDITION
When G0 is built and validated:
STOP.
Do not proceed to G1.
Do not add standing.
Do not add balance.
Do not make it walk.
Do not tune the body based on how you imagine it will walk.
Report:
- commit(s);
- exact G0 pass/fail results;
- generated body table;
- joint table;
- mass/COM/inertia validation;
- semantic skeleton validation;
- physics/render mapping;
- deterministic hashes;
- any deviations from the approved specification;
- review URL.
Leave the review server running for me.
Nothing pushed.

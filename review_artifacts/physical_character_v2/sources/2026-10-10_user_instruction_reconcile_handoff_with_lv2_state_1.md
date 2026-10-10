# User instruction 2026-10-10 (≈20:17 BST) — Locomotion V2 straight-line baseline formally frozen (tag locomotion-v2-straight-baseline-1, 4a226b1f; contract LV2-STATE-1); treat it as an immutable upstream dependency, consumed only via git archive of the tag; reconcile the Physical Character RUN-1 → V2 handoff contract draft against LV2-STATE-1 (21/21 check independently; classify R-0…R-8; re-measure on the frozen baseline; preserve V2 responsibilities; report the open architectural questions; verdict A READY / B NOT READY); no bridge, no PI-1, no collision, no new controller; no change to RUN-1, the simulation or V2; stop for review (verbatim)

Received in the Claude Code session as the whole message (pasted text), in reply to the handoff contract draft report (14b5cbaa). Reproduced verbatim below.

---

The Locomotion V2 straight-line baseline is now formally frozen. This supersedes the old locomotion/presentation source used by our previous moving-runner handoff investigations.
Do not modify the frozen locomotion baseline. Do not modify the simulation or V2 physics.
Frozen source:
~/Downloads/FC Simulator worktrees/locomotion-v2-run1
Tag:
locomotion-v2-straight-baseline-1
Frozen commit:
4a226b1f43ddf5b918acab2807041334ff637405
Consume it only through a git archive of that tag, never from the live worktree.
Read first:
review_artifacts/locomotion_v2_run1/LOCOMOTION_V2_STATE_CONTRACT.md
Contract ID:
LV2-STATE-1
Implementation:
sandbox/visual/run1/lv2_state.js
Frozen locomotion implementation:
sandbox/visual/run1/run1_gait_v13.js
The accepted straight-line locomotion ladder is:
- LOW 3.0 m/s
- JOG 5.5 m/s
- FAST RUN 7.8 m/s
- ALL-OUT 9.5 m/s
This locomotion is now an upstream dependency. Treat it as immutable.
Immediate task: reconcile the Physical Character handoff contract
Do not build the animation→physics bridge yet.
First determine exactly how LV2-STATE-1 changes or resolves the assumptions in the existing Physical Character V2 handoff work.
1. Run the frozen contract's checks from the archive using tools/lv2_state_check.cjs and confirm 21/21 independently.
2. Find and read the existing:
RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT
and all directly relevant PI-1 / promotion / moving-handoff evidence.
3. Revise that draft against LV2-STATE-1.
For every existing R-0 through R-8 row, explicitly classify it as:
- answered directly by LV2-STATE-1;
- derivable from LV2-STATE-1;
- still owned by V2;
- genuinely unresolved.
Replace obsolete measurements based on the previous locomotion/presentation system with measurements from the frozen baseline where the contract permits that.
Do not weaken thresholds merely because the new baseline fails one.
4. Preserve V2's responsibilities.
In particular, do not move V2-owned physical quantities into locomotion simply because locomotion now exposes more state.
Keep the V-* responsibilities, V2 COM/P/L from V2's own mass model, and the one-split H-4 read at t0 as previously designed unless the new contract provides evidence that an assumption is factually wrong.
RUN-1 COM is diagnostic unless the frozen contract explicitly says otherwise.
5. Explicitly report these unresolved architectural questions rather than deciding them silently:
   - stride-clock ownership: RUN-1 currently uses its own stride clock rather than the simulation's;
   - the exact meaning of v_auth where COM motion and foot/root motion differ;
   - the rigid V2 F0 foot versus RUN-1's heel-up/toe-pad stance;
   - the source/meaning of vertical authoritative motion;
   - any remaining mismatch between gameplay collision geometry and the frozen visible/physical runner.
Also determine whether the old moving-runner blockers—frame-difference velocity estimation, presentation jitter, plant-IK discontinuities, pelvis-height switching, etc.—are now genuinely eliminated by LV2-STATE-1 or merely hidden/rephrased. Cite measurements.
6. Re-run the handoff contract measurements using the frozen Locomotion V2 baseline.
I want to know whether the fundamental state handoff is now clean enough that a FAST RUN or ALL-OUT runner can be instantiated as V2 physics without a pose, linear-velocity or angular-velocity discontinuity caused by the handoff itself.
Do not require the promoted physical body to continue running yet.
At this stage we are only establishing whether the instantaneous state transfer is correct.
7. Give me a concise final verdict:
A. HANDOFF STATE CONTRACT READY
or
B. HANDOFF STATE CONTRACT NOT READY
If B, identify the smallest genuine blocker and which subsystem owns it.
Do not start PI-1, tackle collision, recovery, fall behavior, acceleration, turning, or any new physics controller.
Do not change RUN-1, the simulation, or V2.
Commit only documentation, measurement tooling and revised contract work that is appropriate to this investigation.
Stop for my review after the revised contract and checks.

# Touchline production render-skeleton contract (FROZEN, 2026-10-02)

**Source:** the Astra Unity Humanoid audit (checked against the Unity 6.0 documentation built 2026-09-29), adopted by the user's brief (Part 26).

- This is the future PRODUCTION RENDER skeleton. It is independent of the physics-body topology; no one-to-one render-bone / rigid-body mapping is assumed.
- It is not being built now.
- **Topology rule:** no structural change to the semantic hierarchy after animation production starts. Future additions (fingers, facial bones) attach only as LEAF branches and never between two frozen semantic joints.

## Hierarchy

```
root                                          [structural, nondeforming, UNMAPPED]
└── hips                                      [Unity Hips = the central pelvis]
    ├── spine_01                              [Spine]
    │   └── spine_02                          [Chest]
    │       └── spine_03                      [UpperChest]
    │           ├── neck                      [Neck]
    │           │   └── head                  [Head]
    │           ├── clavicle_L                [LeftShoulder]
    │           │   └── upperArm_L            [LeftUpperArm]
    │           │       ├── lowerArm_L        [LeftLowerArm]
    │           │       │   ├── hand_L        [LeftHand]
    │           │       │   └── forearm_twist_L   [deformation, unmapped]
    │           │       └── upperArm_twist_L      [deformation, unmapped]
    │           └── clavicle_R                [RightShoulder]
    │               └── upperArm_R            [RightUpperArm]
    │                   ├── lowerArm_R        [RightLowerArm]
    │                   │   ├── hand_R        [RightHand]
    │                   │   └── forearm_twist_R   [deformation, unmapped]
    │                   └── upperArm_twist_R      [deformation, unmapped]
    ├── upperLeg_L                            [LeftUpperLeg]
    │   ├── lowerLeg_L                        [LeftLowerLeg]
    │   │   ├── foot_L                        [LeftFoot]
    │   │   │   └── toe_L                     [LeftToes]
    │   │   └── calf_twist_L                  [deformation, unmapped]
    │   └── thigh_twist_L                     [deformation, unmapped]
    └── upperLeg_R                            [RightUpperLeg]
        ├── lowerLeg_R                        [RightLowerLeg]
        │   ├── foot_R                        [RightFoot]
        │   │   └── toe_R                     [RightToes]
        │   └── calf_twist_R                  [deformation, unmapped]
        └── thigh_twist_R                     [deformation, unmapped]
```

## Rules

**Root and hips:**
- `root` stays separate from `hips`.
- `root` carries character-space displacement and heading, aligned to the authoritative SIMULATION (never animation root motion).
- `hips` carries the pelvis pose.
- Unity's Humanoid root-motion abstraction is not this bone.

**No `hip_L` / `hip_R` render bones.**
- The physical left / right hip joints are CONSTRAINTS between the pelvis body and the thigh bodies, not render bones.
- Hip-crease skinning helpers, if ever needed, are unmapped leaf branches.

**Mappings:**
- Three semantic spine bones: Spine / Chest / UpperChest. No fourth spine bone.
- Clavicles are Unity's Shoulder semantic: mandatory in Touchline, though optional in Unity.
- Toes: one forefoot / toe bone per foot (Unity Toes), mandatory.
- The render toe does NOT require a physical toe: F0 drives it from animation, contact or IK; a future F2h forefoot body could drive it directly.

**Not deformation bones, not part of the hierarchy:**
- No deforming heel bone. Heel, ball-of-foot and toe-tip points are helper metadata or control targets.
- IK helpers (foot / hand targets, knee / elbow poles, look and ball-contact targets) are a runtime / control layer, exported only when a documented runtime interface consumes them.

**Twist bones:**
- Upper arm, forearm, thigh and calf twist bones are BRANCHES off the semantic chain, never inserted into it.
- They are driven procedurally from the semantic rotation (twist extraction).

**Deferred:**
- Fingers. If ever added: the full Unity-compatible 5 digits × 3 phalanges.
- Eyes, jaw, facial bones.

**Shared and canonical:**
- One topology for goalkeepers and outfield players; proportions never change topology.
- Canonical reference / export pose: T-pose. A-pose authoring is allowed only with a deterministic conversion to the canonical T-pose.

**Export:**
- Fixed names, local axes, handedness and scale; validated by an import round-trip test.
- No FBX leaf / end bones.
- No flattened hierarchy.
- The non-deforming `root` must survive export (an allow-list, not "only deform bones").

## Unity mapping summary

| Touchline | Unity Humanoid | Unity required | Touchline required |
|---|---|---|---|
| root | — (unmapped) | — | yes |
| hips | Hips | yes | yes |
| spine_01 / 02 / 03 | Spine / Chest / UpperChest | Spine only | all three |
| neck / head | Neck / Head | Head | both |
| clavicle_L/R | Left/RightShoulder | no | yes |
| upperArm / lowerArm / hand (L/R) | Upper/LowerArm, Hand | yes | yes |
| upperLeg / lowerLeg / foot (L/R) | Upper/LowerLeg, Foot | yes | yes |
| toe_L/R | Left/RightToes | no | yes |
| twist bones | — | — | yes (unmapped) |
| fingers / eyes / jaw | Unity optional semantics | no | deferred |

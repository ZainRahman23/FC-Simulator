<!-- preserved verbatim from Claude session d4761610-c35f-4019-9308-cb83973e7b76, transcript line 16697, pasted block 2 of 4; the user's own note: "read the 3rd text first as it is the prompt" -->

I kept this strictly to the requested Unity-compatibility research pass—no implementation or asset changes—and did not reopen the earlier physics-foot/toe decision. :chatgpt-content-reference{index="0"} I checked the current Unity 6.0 documentation built September 29, 2026, rather than relying on the 2020-era UI.

# Final Unity Humanoid Skeleton Compatibility Audit for Touchline

## A. Executive verdict

**Yes: Unity Humanoid is a very good baseline compatibility contract for Touchline's production render skeleton, provided Touchline treats it as a semantic interoperability standard rather than copying every Unity runtime assumption.**

The tentative Touchline hierarchy is fundamentally correct:

```text
root
└── hips/pelvis
    ├── spine_01
    │   └── spine_02
    │       └── spine_03
    │           ├── neck
    │           │   └── head
    │           ├── clavicle_L
    │           │   └── upperArm_L
    │           │       └── lowerArm_L
    │           │           └── hand_L
    │           └── clavicle_R
    │               └── upperArm_R
    │                   └── lowerArm_R
    │                       └── hand_R
    ├── upperLeg_L
    │   └── lowerLeg_L
    │       └── foot_L
    │           └── toe_L
    └── upperLeg_R
        └── lowerLeg_R
            └── foot_R
                └── toe_R
```

The key mapping should be:

```text
Touchline              Unity Humanoid

hips/pelvis        →   Hips
spine_01           →   Spine
spine_02           →   Chest
spine_03           →   UpperChest
neck               →   Neck
head               →   Head

clavicle_L/R       →   Left/RightShoulder
upperArm_L/R       →   Left/RightUpperArm
lowerArm_L/R       →   Left/RightLowerArm
hand_L/R           →   Left/RightHand

upperLeg_L/R       →   Left/RightUpperLeg
lowerLeg_L/R       →   Left/RightLowerLeg
foot_L/R           →   Left/RightFoot
toe_L/R            →   Left/RightToes

root               →   no HumanBodyBones mapping
```

Current Unity 6 explicitly exposes all of these semantics, including `UpperChest`, `LeftToes`/`RightToes`, shoulders and the full finger set. :chatgpt-content-reference{index="1"}

### What I would freeze

**Freeze now:**

- separate nondeforming `root`;
- single mapped `hips/pelvis`;
- three semantic/deforming spine bones;
- neck;
- head;
- clavicles/shoulders;
- normal upper/lower arm chains;
- hands;
- normal upper/lower leg chains;
- feet;
- one forefoot/toe bone per foot;
- one twist-deformation branch for each upper arm, forearm, thigh and calf;
- one topology for goalkeeper and outfield players.

### What I would not freeze yet

- finger chains;
- facial bones;
- eyes/jaw;
- literal exported IK target bones;
- physics toe articulation.

The most important clarification from this audit is:

> **Unity `Hips` means the character's central pelvis transform. It does not mean two anatomical hip joints, and it does not need to be the top/root transform of the exported skeleton.**

A clean:

```text
root
└── hips
```

contract is fully compatible with the Humanoid model.

---

# B. Exact Unity required bones

Unity's current Avatar Mapping distinguishes **required** bones from **optional** bones; the current API also exposes `HumanTrait.RequiredBone()`, explicitly defined as testing membership in Mecanim's minimal required human-bone set. :chatgpt-content-reference{index="2"}

The minimal Humanoid set is **15 bones**:

| Unity semantic | Required | Canonical ancestor relationship |
|---|---:|---|
| `Hips` | **Yes** | Root mapped humanoid body bone |
| `Spine` | **Yes** | Descendant of Hips |
| `Head` | **Yes** | Descendant of Spine/torsal chain |
| `LeftUpperArm` | **Yes** | Descendant of torso |
| `LeftLowerArm` | **Yes** | Descendant of LeftUpperArm |
| `LeftHand` | **Yes** | Descendant of LeftLowerArm |
| `RightUpperArm` | **Yes** | Descendant of torso |
| `RightLowerArm` | **Yes** | Descendant of RightUpperArm |
| `RightHand` | **Yes** | Descendant of RightLowerArm |
| `LeftUpperLeg` | **Yes** | Descendant of Hips |
| `LeftLowerLeg` | **Yes** | Descendant of LeftUpperLeg |
| `LeftFoot` | **Yes** | Descendant of LeftLowerLeg |
| `RightUpperLeg` | **Yes** | Descendant of Hips |
| `RightLowerLeg` | **Yes** | Descendant of RightUpperLeg |
| `RightFoot` | **Yes** | Descendant of RightLowerLeg |

Unity's current import documentation confirms that Avatar creation succeeds only when all required bones can be matched, while optional bones improve the result. :chatgpt-content-reference{index="3"}

## Important consequence

Unity does **not** require:

- Chest;
- UpperChest;
- Neck;
- shoulders/clavicles;
- toes;
- fingers.

But that does **not** mean Touchline should omit them.

Unity's minimum is deliberately lower than Touchline's sensible production minimum.

---

# C. Unity optional bones relevant to Touchline

Current `HumanBodyBones` contains the following important optional semantics in addition to the required set:

| Unity semantic | Unity status | Touchline recommendation |
|---|---:|---|
| `Chest` | Optional | **Include** |
| `UpperChest` | Optional | **Include** |
| `Neck` | Optional | **Include** |
| `LeftShoulder` | Optional | **Include** |
| `RightShoulder` | Optional | **Include** |
| `LeftToes` | Optional | **Include** |
| `RightToes` | Optional | **Include** |
| Eyes | Optional | Defer |
| Jaw | Optional | Defer |
| 30 mapped finger phalanges | Optional | Defer |

Unity explicitly states that optional mapped bones can have their movement interpolated when missing. :chatgpt-content-reference{index="4"}

That is useful for generic interoperability but should not define Touchline's production quality bar.

For Touchline:

```text
Unity required
     +
football-important Unity optional bones
     +
Touchline deformation bones
```

is the right contract.

---

# D. Root vs Hips / Pelvis

This distinction should be frozen in the design documentation because it is very easy to get wrong.

## `Hips` is the pelvis

Unity's current enum calls the semantic `Hips`, but Unity's own current Biped mapper maps a Biped bone named **Pelvis** to `HumanBodyBones.Hips`. :chatgpt-content-reference{index="5"}

So conceptually:

```text
Unity Hips
=
Touchline pelvis
=
central rigid/deforming pelvic segment
```

It is **not** a left/right pair of hip joints.

## Unity does not define a HumanBodyBones.Root

Look at the entire current `HumanBodyBones` enumeration: it begins with `Hips`; there is no semantic `Root`. :chatgpt-content-reference{index="6"}

At the same time, Unity separately exposes an `Avatar.root` concept. `Animator.avatarRoot` is the transform at which the Avatar hierarchy is nested inside the Animator hierarchy. :chatgpt-content-reference{index="7"}

Therefore this is perfectly legitimate:

```text
character / animator
└── root                ← not a HumanBodyBones mapping
    └── hips            ← maps to Hips
```

### Touchline recommendation

**Keep the separate `root`.**

Do not merge `root` and `hips`.

`root` should carry global character-space concerns:

- trajectory/world displacement;
- character heading;
- authoritative simulation alignment;
- animation clip displacement contract;
- global rig placement.

`hips` should carry pelvis/body pose:

- pelvic tilt;
- pelvic rotation;
- pelvic sway;
- vertical/lateral pelvic motion relative to character space;
- leg attachment.

## Unity root motion nuance

Unity's standard Humanoid root-motion system does not simply say “animate a bone named root.”

For Humanoid animation, Unity derives a **Body Transform** representing the character's mass centre and orientation, then projects a **Root Transform** from it and applies the frame-to-frame Root Transform change to the GameObject. :chatgpt-content-reference{index="8"}

So:

> Touchline having an explicit `root` is structurally compatible with Unity Humanoid, but Touchline should not assume Unity's standard Humanoid root-motion algorithm literally maps to that bone.

That distinction is especially useful for Touchline because the simulation, not the animation clip, remains authoritative.

### Touchline runtime concept

```text
authoritative simulation transform
          ↓
        root
          ↓
pelvis/hips + animated body pose
```

rather than allowing pelvis animation to move the authoritative player through the world.

---

# E. Unity Hips vs physical left/right hip joints

This should be completely unambiguous.

## Render skeleton

```text
hips
├── upperLeg_L
└── upperLeg_R
```

## Physics skeleton

Conceptually:

```text
pelvis rigid body
├── LEFT physical hip joint → left thigh body
└── RIGHT physical hip joint → right thigh body
```

The physical hip joint centres are constraints connecting bodies.

They are **not render bones that Unity expects**.

Therefore:

```text
Unity Hips
        ≠
left physical hip joint
        ≠
right physical hip joint
```

Instead:

```text
Unity Hips
≈
render pelvis transform
≈
authoritative pelvis body's orientation/position
```

while:

```text
Unity LeftUpperLeg
≈
render left thigh

Unity RightUpperLeg
≈
render right thigh
```

The physical left/right hip constraints conceptually sit **between** those render semantics.

## Do not add semantic `hip_L` and `hip_R`

Do not make:

```text
hips
├── hip_L
│   └── upperLeg_L
└── hip_R
    └── upperLeg_R
```

part of the core semantic hierarchy.

If future skinning requires small hip-crease deformation helpers, they can exist as **unmapped deformation branches**, but they should not be mistaken for Unity HumanBodyBones.

---

# F. Correct parent-child hierarchy

The core semantic hierarchy should be:

```text
root                             [unmapped]
└── hips                         [Hips]
    ├── spine_01                 [Spine]
    │   └── spine_02             [Chest]
    │       └── spine_03         [UpperChest]
    │           ├── neck         [Neck]
    │           │   └── head     [Head]
    │           │
    │           ├── clavicle_L   [LeftShoulder]
    │           │   └── upperArm_L
    │           │       └── lowerArm_L
    │           │           └── hand_L
    │           │
    │           └── clavicle_R   [RightShoulder]
    │               └── upperArm_R
    │                   └── lowerArm_R
    │                       └── hand_R
    │
    ├── upperLeg_L
    │   └── lowerLeg_L
    │       └── foot_L
    │           └── toe_L
    │
    └── upperLeg_R
        └── lowerLeg_R
            └── foot_R
                └── toe_R
```

### Is direct parenthood mandatory?

Not absolutely in the sense that Unity only knows a rigid fixed imported transform tree.

Unity distinguishes:

1. the **full skeleton transform hierarchy**; and
2. the subset mapped to Humanoid semantics.

`HumanDescription.skeleton` explicitly holds the transforms included in the Avatar and says all parents of a human transform must be present. :chatgpt-content-reference{index="9"} Unity's import system also explicitly recognizes transforms that are in the skeleton hierarchy but are **not mapped in the Avatar**. :chatgpt-content-reference{index="10"}

Unity's own editor Biped-mapping code also walks through optional parents and can climb through absent optional Humanoid levels. :chatgpt-content-reference{index="11"}

### But Touchline should still keep the semantic chain clean

For maximum interchange compatibility:

**do not insert deformation or helper bones directly into the primary semantic chain unless there is a compelling reason.**

Prefer:

```text
upperArm
├── lowerArm
└── upperArm_twist
```

over:

```text
upperArm
└── upperArm_twist
    └── lowerArm
```

even though a sophisticated importer may tolerate the latter.

The first version preserves the obvious human hierarchy for:

- Unity;
- Blender;
- mocap systems;
- Mixamo-like workflows;
- custom retargeters;
- future tooling.

---

# G. Spine recommendation and Unity mapping

Touchline's proposed three-spine structure is almost ideal for Unity.

Use:

```text
hips
└── spine_01       → Unity Spine
    └── spine_02   → Unity Chest
        └── spine_03 → Unity UpperChest
```

`Spine`, `Chest` and `UpperChest` all exist as first-class current Unity Humanoid semantics. :chatgpt-content-reference{index="12"}

Unity only **requires** `Spine`, but Touchline should require all three.

## Why three

Three semantic torso joints provide useful distribution of:

- flexion;
- extension;
- lateral bend;
- axial rotation;
- sprint counter-rotation;
- shielding;
- shoulder challenges;
- stumbling;
- airborne twists;
- goalkeeper dives.

without building an unnecessarily high-density torso.

## Recommendation

### `spine_01`

Lower lumbar / lower trunk.

Map to:

**Unity `Spine`**

### `spine_02`

Mid/upper torso.

Map to:

**Unity `Chest`**

### `spine_03`

Upper thoracic / shoulder girdle parent.

Map to:

**Unity `UpperChest`**

Attach:

- neck;
- clavicle_L;
- clavicle_R

to `spine_03`.

## Extra spine bones?

Unity can retain extra transforms in the skeleton, but adding an extra unmapped spine bone into the semantic chain creates little value for Touchline and increases retargeting ambiguity.

**Do not add a fourth semantic spine bone now.**

---

# H. Shoulder / clavicle recommendation

Unity calls the semantic:

```text
LeftShoulder
RightShoulder
```

but this corresponds functionally to what Touchline has been calling the clavicle.

Unity's own Biped mapper makes this explicit:

```text
"L Clavicle" → LeftShoulder
"R Clavicle" → RightShoulder
``` :chatgpt-content-reference{index="13"}


Therefore:

```text
Touchline clavicle_L → Unity LeftShoulder
Touchline clavicle_R → Unity RightShoulder
```

is exactly appropriate.

Unity makes these optional.

Touchline should make them **mandatory**.

They are important for:

- running arm swing;
- sprint posture;
- shoulder challenges;
- reaching;
- falls;
- arm bracing;
- goalkeeper catches;
- goalkeeper diving;
- high ball actions.

### Recommended hierarchy

```text
spine_03 / UpperChest
└── clavicle
    └── upperArm
```

Do not connect `upperArm` directly to the torso in the production Touchline skeleton.

---

# I. Foot / toe recommendation

The existing decision maps very cleanly to Unity.

Current Unity 6 defines:

- `LeftFoot`;
- `RightFoot`;
- `LeftToes`;
- `RightToes`. :chatgpt-content-reference{index="14"}


Therefore:

```text
lowerLeg
└── foot
    └── toe
```

should map directly as:

```text
LowerLeg
→ Foot
→ Toes
```

## `toe_L/R` should map to Unity `LeftToes/RightToes`

Yes.

There is no need to invent a special Unity mapping for "ball of foot."

Touchline's single forefoot/toe-base render bone semantically fits the Unity Toes slot.

### Toes are optional to Unity

But Touchline should retain the earlier decision:

**mandatory in the Touchline production render skeleton.**

## No heel bone

Do **not** add a deforming semantic heel bone.

Use a heel contact marker/helper if required:

```text
foot
├── toe
└── [heel_marker helper]
```

rather than:

```text
foot
└── heel
```

inside the deform chain.

Heel position is useful to IK/contact systems, but that does not make it a Humanoid articulation.

## Additional ankle helper?

Same principle.

Use metadata/helper targets rather than deforming semantic bones unless later deformation evidence genuinely requires them.

---

# J. Twist / deformation recommendation

This is where I would make one structural refinement to the earlier conceptual tree.

Touchline should include:

- `upperArm_twist_L/R`;
- `forearm_twist_L/R`;
- `thigh_twist_L/R`;
- `calf_twist_L/R`.

But **do not map them to Unity Humanoid bones.**

Unity's `HumanDescription` has dedicated twist-distribution parameters for:

- upper arm;
- lower arm;
- upper leg;
- lower leg. :chatgpt-content-reference{index="15"}


That confirms that twisting the long limb segments is an explicit Humanoid concern, while there are no separate `HumanBodyBones.UpperArmTwist` semantics.

## Recommended topology

### Arm

```text
upperArm_L                 [mapped]
├── lowerArm_L             [mapped]
│   ├── hand_L             [mapped]
│   └── forearm_twist_L    [unmapped deformation]
└── upperArm_twist_L       [unmapped deformation]
```

Equivalent on the right.

### Leg

```text
upperLeg_L                 [mapped]
├── lowerLeg_L             [mapped]
│   ├── foot_L             [mapped]
│   └── calf_twist_L       [unmapped deformation]
└── thigh_twist_L          [unmapped deformation]
```

### Why branch rather than inline?

It preserves:

```text
UpperArm → LowerArm → Hand
UpperLeg → LowerLeg → Foot
```

as an obvious semantic chain.

The twist bones can still deform vertices along the relevant segment but do not become necessary ancestors of another mapped Humanoid joint.

## Driving them

Prefer procedural distribution:

```text
semantic limb rotation
        ↓
twist extraction
        ↓
twist-bone rotation
```

rather than making every animation author key them independently.

That gives clean:

- animation authoring;
- mocap retargeting;
- mirroring;
- skin deformation;
- Unity interoperability.

## Unity Optimize Game Object warning

If these bones are required as transforms at runtime in Unity, they need appropriate handling when `Optimize Game Object` is enabled because Unity can remove unmapped Transform objects unless explicitly exposed. :chatgpt-content-reference{index="16"}

That is a Unity runtime implementation detail, not a reason to remove them from Touchline's production skeleton.

---

# K. Hands and fingers

## Hands

`LeftHand` and `RightHand` are **required Unity Humanoid bones**.

They are the wrist semantic—the current API describes them as left/right wrist bones. :chatgpt-content-reference{index="17"}

Touchline absolutely keeps them.

## Fingers

Unity supports the complete standard structure for each hand:

```text
Thumb
  proximal
  intermediate
  distal

Index
  proximal
  intermediate
  distal

Middle
  proximal
  intermediate
  distal

Ring
  proximal
  intermediate
  distal

Little
  proximal
  intermediate
  distal
```

for both hands. :chatgpt-content-reference{index="18"}

None are needed for a valid Humanoid Avatar.

### Recommendation: defer them

I would **not** put 30 finger bones into the mandatory Touchline skeleton yet.

Reasons:

- current match camera makes individual finger articulation low-value;
- outfield players gain almost nothing;
- goalkeeper glove silhouette can initially be expressed adequately from hand/wrist pose;
- fingers are leaf chains, so they are much safer to retrofit than spine, toe or shoulder topology.

Most importantly, adding fingers later does **not** require inserting bones into an existing core chain.

It becomes:

```text
hand
├── thumb...
├── index...
├── middle...
├── ring...
└── little...
```

Existing arm animations remain valid.

### Lock a future convention now

If fingers are later adopted:

**use the full conventional Unity-compatible 3-bone-per-digit structure.**

Do not invent:

- one-bone fingers;
- two-bone fingers;
- special goalkeeper-only finger hierarchy.

That would undermine the interoperability benefit.

So:

**Finger inclusion: defer.  
Finger topology if eventually included: already decided.**

---

# L. IK / helper recommendation

Unity Humanoid does not require skeleton bones named things like:

- `ik_foot_l`;
- `ik_hand_r`;
- knee target;
- elbow target;
- ball-contact target.

Humanoid works from mapped anatomy, muscles and IK goals.

Therefore Touchline should distinguish three categories rigidly:

### Humanoid semantic bones

Actual anatomical/animation contract:

```text
hips
spine
chest
upperChest
neck
head
shoulders
arms
hands
legs
feet
toes
```

### Deformation bones

Mesh-quality implementation:

```text
upperArm_twist
forearm_twist
thigh_twist
calf_twist
```

### Helpers / controls

Procedural solving data:

```text
foot_target
heel_marker
ball_marker
toe_tip_marker
knee_pole
hand_target
elbow_pole
look_target
ball_contact_marker
```

## Prefer runtime/control structures for helpers

Do not export helper transforms merely because an authoring rig has them.

The production deformation skeleton should not contain every Blender controller.

Export a helper only if:

- runtime systems explicitly consume it;
- a downstream format requires it;
- it is part of a documented Touchline interface.

Otherwise calculate it from the production skeleton.

This prevents the game skeleton from turning into an authoring-rig dump.

---

# M. Bind / reference pose

Current Unity 6 documentation remains explicit:

> T-pose is the required Avatar reference pose.

Unity's current importer still provides `Sample Bind-pose` and `Enforce T-Pose`, and the documentation describes T-pose as both required by Avatar creation and recommended for modeling. :chatgpt-content-reference{index="19"}

So the old 2020-era guidance has **not** been superseded by an A-pose requirement.

## Canonical Touchline export/reference pose

Lock a clean T-pose.

Conceptually:

```text
character upright
head forward
spine neutral

arms approximately horizontal
elbows straight
palms in a consistent neutral convention

legs straight
feet flat
feet pointing forward
toes neutral/straight continuation of foot
```

### A-pose authoring

Artists may prefer an A-pose internally for shoulder deformation.

That is fine as an **authoring workflow**, but do not let multiple incompatible bind/reference poses enter the production contract.

If A-pose modeling is used:

```text
artist A-pose
      ↓
deterministic conversion
      ↓
canonical Touchline T-pose
      ↓
export / Humanoid mapping
```

## Axes

Unity Humanoid is designed to map differing imported skeleton structures rather than mandate one raw DCC bone-axis convention.

Still, Touchline should freeze its own axes.

Every character should have:

- identical local-axis conventions;
- identical handedness;
- identical forward/up definitions;
- symmetrical left/right orientation conventions;
- consistent root orientation.

Do not depend on import-time heuristics to fix arbitrary bone rolls from player to player.

---

# N. Blender / export implications

Touchline can author in Blender while maintaining a Unity-compatible skeleton contract.

The important decisions are structural, not “Unity-specific Blender settings.”

## Preserve the hierarchy

Do not flatten:

```text
root
→ hips
→ semantic skeleton
```

on export.

Blender's glTF exporter explicitly offers hierarchy-affecting options such as `Flatten Bone Hierarchy`; those should not be used for the canonical production skeleton. :chatgpt-content-reference{index="20"}

## Export the rest pose deliberately

Blender's current glTF documentation explicitly offers **Use Rest Position Armature**, which exports the armature rest pose as the joint rest pose. :chatgpt-content-reference{index="21"}

For Touchline, that rest pose should correspond to the frozen canonical reference pose.

## Disable synthetic leaf bones

Blender's FBX exporter exposes an **Add Leaf Bones** option specifically to append artificial terminal bones to chains. :chatgpt-content-reference{index="22"}

For the production contract:

**do not add FBX leaf/end bones.**

Otherwise you end up with things such as:

```text
head_end
hand_end
toe_end
```

that have no Touchline or Unity semantic purpose.

## Be careful with “Only Deform Bones”

Touchline's `root` may deliberately be nondeforming but still be structurally required.

Do not blindly strip nondeforming bones during export.

Export policy should be based on the **production skeleton allow-list**, not simply Blender's deform flag.

## Scale

Freeze one scale convention and validate it in automated import tests.

Do not allow:

- different FBX scale factors by player;
- unapplied Armature Object scale;
- compensating `0.01`/`100` transforms to leak into the semantic skeleton.

The exact DCC unit choice matters less than deterministic round-tripping.

## Names

Unity supports explicit mapping—bone names do not technically have to equal `LeftUpperArm`, etc.—but descriptive, stable names materially improve auto-mapping and general interoperability. Unity's own import documentation recommends body-part-representative names. :chatgpt-content-reference{index="23"}

So freeze names now.

---

# O. Full Touchline → Unity mapping table

| Touchline bone | Unity semantic | Unity required? | Touchline required? | Classification | Recommendation |
|---|---|---:|---:|---|---|
| `root` | none | No | **Yes** | Structural/root | **KEEP EXACTLY** |
| `hips` / `pelvis` | `Hips` | **Yes** | **Yes** | Semantic | **KEEP; map as Hips** |
| `spine_01` | `Spine` | **Yes** | **Yes** | Semantic | **KEEP EXACTLY** |
| `spine_02` | `Chest` | No | **Yes** | Semantic | **KEEP** |
| `spine_03` | `UpperChest` | No | **Yes** | Semantic | **KEEP** |
| `neck` | `Neck` | No | **Yes** | Semantic | **KEEP** |
| `head` | `Head` | **Yes** | **Yes** | Semantic | **KEEP** |
| `clavicle_L` | `LeftShoulder` | No | **Yes** | Semantic | **KEEP; map differently named semantic** |
| `clavicle_R` | `RightShoulder` | No | **Yes** | Semantic | **KEEP; map differently named semantic** |
| `upperArm_L` | `LeftUpperArm` | **Yes** | **Yes** | Semantic | **KEEP** |
| `upperArm_R` | `RightUpperArm` | **Yes** | **Yes** | Semantic | **KEEP** |
| `lowerArm_L` | `LeftLowerArm` | **Yes** | **Yes** | Semantic | **KEEP** |
| `lowerArm_R` | `RightLowerArm` | **Yes** | **Yes** | Semantic | **KEEP** |
| `hand_L` | `LeftHand` | **Yes** | **Yes** | Semantic | **KEEP** |
| `hand_R` | `RightHand` | **Yes** | **Yes** | Semantic | **KEEP** |
| `upperLeg_L` | `LeftUpperLeg` | **Yes** | **Yes** | Semantic | **KEEP** |
| `upperLeg_R` | `RightUpperLeg` | **Yes** | **Yes** | Semantic | **KEEP** |
| `lowerLeg_L` | `LeftLowerLeg` | **Yes** | **Yes** | Semantic | **KEEP** |
| `lowerLeg_R` | `RightLowerLeg` | **Yes** | **Yes** | Semantic | **KEEP** |
| `foot_L` | `LeftFoot` | **Yes** | **Yes** | Semantic | **KEEP** |
| `foot_R` | `RightFoot` | **Yes** | **Yes** | Semantic | **KEEP** |
| `toe_L` | `LeftToes` | No | **Yes** | Semantic | **KEEP** |
| `toe_R` | `RightToes` | No | **Yes** | Semantic | **KEEP** |
| `upperArm_twist_L/R` | none | No | **Yes** | Deformation | **ADD** |
| `forearm_twist_L/R` | none | No | **Yes** | Deformation | **ADD** |
| `thigh_twist_L/R` | none | No | **Yes** | Deformation | **ADD** |
| `calf_twist_L/R` | none | No | **Yes** | Deformation | **ADD** |
| finger chains | Unity finger semantics | No | No, presently | Semantic optional | **DEFER** |
| eyes | `LeftEye` / `RightEye` | No | No | Optional | **DEFER** |
| jaw | `Jaw` | No | No | Optional | **DEFER** |
| heel helper | none | No | Runtime-dependent | Helper | **Not a deform bone** |
| foot IK target | none | No | Runtime-dependent | Helper | **Runtime/control layer** |
| hand IK target | none | No | Runtime-dependent | Helper | **Runtime/control layer** |
| knee pole target | none | No | Runtime-dependent | Helper | **Runtime/control layer** |

---

# P. Final recommended Touchline hierarchy

Here is the hierarchy I would actually freeze.

```text
root                                                   [STRUCTURAL / UNMAPPED]
└── hips                                               [Hips]
    │
    ├── spine_01                                       [Spine]
    │   └── spine_02                                   [Chest]
    │       └── spine_03                               [UpperChest]
    │           │
    │           ├── neck                               [Neck]
    │           │   └── head                           [Head]
    │           │
    │           ├── clavicle_L                         [LeftShoulder]
    │           │   └── upperArm_L                     [LeftUpperArm]
    │           │       ├── lowerArm_L                 [LeftLowerArm]
    │           │       │   ├── hand_L                 [LeftHand]
    │           │       │   └── forearm_twist_L        [DEFORMATION]
    │           │       └── upperArm_twist_L           [DEFORMATION]
    │           │
    │           └── clavicle_R                         [RightShoulder]
    │               └── upperArm_R                     [RightUpperArm]
    │                   ├── lowerArm_R                 [RightLowerArm]
    │                   │   ├── hand_R                 [RightHand]
    │                   │   └── forearm_twist_R        [DEFORMATION]
    │                   └── upperArm_twist_R           [DEFORMATION]
    │
    ├── upperLeg_L                                     [LeftUpperLeg]
    │   ├── lowerLeg_L                                 [LeftLowerLeg]
    │   │   ├── foot_L                                 [LeftFoot]
    │   │   │   └── toe_L                              [LeftToes]
    │   │   └── calf_twist_L                           [DEFORMATION]
    │   └── thigh_twist_L                              [DEFORMATION]
    │
    └── upperLeg_R                                     [RightUpperLeg]
        ├── lowerLeg_R                                 [RightLowerLeg]
        │   ├── foot_R                                 [RightFoot]
        │   │   └── toe_R                              [RightToes]
        │   └── calf_twist_R                           [DEFORMATION]
        └── thigh_twist_R                              [DEFORMATION]
```

### Optional future extensions

Attach only as leaf branches:

```text
hand
├── thumb...
├── index...
├── middle...
├── ring...
└── little...
```

No future feature should require inserting a new joint between any pair of already-frozen Humanoid semantic joints.

That is an important topology rule.

---

# Q. Lock now vs defer

| Decision | Lock now? | Decision | Retrofit risk |
|---|---:|---|---:|
| Separate `root` | **YES** | Nondeforming parent above Hips | **Very high** |
| `hips` / pelvis semantic | **YES** | Single central Hips bone | **Very high** |
| Left/right render hip bones | **NO** | Do not add to semantic chain | Medium |
| Three-spine topology | **YES** | Spine → Chest → UpperChest | **Very high** |
| Neck | **YES** | One neck bone | High |
| Clavicles | **YES** | Unity Shoulder semantics | **High** |
| Arm hierarchy | **YES** | Shoulder → UpperArm → LowerArm → Hand | **Very high** |
| Leg hierarchy | **YES** | Hips → UpperLeg → LowerLeg → Foot → Toe | **Very high** |
| Render toes | **YES** | One per foot → Unity Toes | **High** |
| Upper-arm twists | **YES** | Branch deformation bones | High mesh cost later |
| Forearm twists | **YES** | Branch deformation bones | High mesh cost later |
| Thigh twists | **YES** | Branch deformation bones | High mesh cost later |
| Calf twists | **YES** | Branch deformation bones | High mesh cost later |
| Finger topology inclusion | **NO** | Defer actual bones | Medium |
| Finger future convention | **YES** | Full standard Unity-style chains if adopted | Low to lock conceptually |
| Eye/jaw bones | NO | Defer | Low |
| IK helper representation | NO | Runtime/control-rig decision | Low |
| Helper semantics | **YES** | Standardize targets/markers | Medium |
| T-pose reference | **YES** | Canonical exported/reference pose | **Very high** |
| Naming contract | **YES** | Stable names forever | **Very high** |
| Axis convention | **YES** | Stable local axes/handedness | **Very high** |
| Physics toe | NO | Still independent | Low render-topology risk |

---

# R. Physics ↔ render mapping

The Unity-compatible render skeleton does not change the core Touchline architecture.

## Pelvis

```text
authoritative pelvis rigid body
            ↓
render hips / Unity Hips
```

The render `hips` transform represents the visual/anatomical pelvis.

## Hip joints

```text
physics pelvis
   │
   ├── physical left hip constraint
   │      ↓
   │   left thigh body
   │      ↓
render LeftUpperLeg
   │
   └── physical right hip constraint
          ↓
       right thigh body
          ↓
render RightUpperLeg
```

No render `hip_L` or `hip_R` bone is necessary.

## Rigid F0 foot

```text
Physics

lower-leg body
└── rigid foot body
```

can drive:

```text
Render

lowerLeg
└── foot
    └── toe
```

with the render toe driven by animation/contact/IK as already decided.

Unity's `LeftToes`/`RightToes` mapping is entirely compatible with that.

## Future F2h

If physics later becomes:

```text
lower-leg body
└── foot body
    └── physical forefoot body
```

the render skeleton remains:

```text
lowerLeg
└── foot
    └── toe
```

and the physical forefoot articulation can directly become a strong driver of the already-existing render toe.

Therefore Unity compatibility creates **no pressure whatsoever** to adopt a physical toe today.

---

# Tentative topology audit

The original proposal asked for every element to be classified.

| Proposed element | Verdict |
|---|---|
| `root` | **KEEP EXACTLY** |
| `hips/pelvis` | **KEEP; formally map to Unity Hips** |
| `spine_01` | **KEEP; map to Spine** |
| `spine_02` | **KEEP; map to Chest** |
| `spine_03` | **KEEP; map to UpperChest** |
| `neck` | **KEEP EXACTLY** |
| `head` | **KEEP EXACTLY** |
| `clavicle_L/R` | **KEEP; map to Left/RightShoulder** |
| `upperArm_L/R` | **KEEP EXACTLY** |
| `lowerArm_L/R` | **KEEP EXACTLY** |
| `hand_L/R` | **KEEP EXACTLY** |
| `upperLeg_L/R` | **KEEP EXACTLY** |
| `lowerLeg_L/R` | **KEEP EXACTLY** |
| `foot_L/R` | **KEEP EXACTLY** |
| `toe_L/R` | **KEEP EXACTLY; map to Left/RightToes** |
| upper-arm twist | **ADD** |
| forearm twist | **ADD** |
| thigh twist | **ADD** |
| calf twist | **ADD** |
| fingers | **OPTIONAL / DEFER** |
| IK helper bones | **DO NOT make part of mandatory semantic skeleton** |

So the answer is not that the proposed Touchline skeleton was structurally wrong.

It was **very close already**.

The final Unity audit mainly freezes the semantic meaning of those bones and gives the deformation bones a clean topology.

---

# Unity-required semantic bones

Touchline must always be able to supply these mappings:

```text
Hips

Spine
Head

LeftUpperArm
LeftLowerArm
LeftHand

RightUpperArm
RightLowerArm
RightHand

LeftUpperLeg
LeftLowerLeg
LeftFoot

RightUpperLeg
RightLowerLeg
RightFoot
```

---

# Unity-optional but Touchline-required

```text
Chest
UpperChest
Neck

LeftShoulder
RightShoulder

LeftToes
RightToes
```

These are the key bones where Touchline deliberately exceeds Unity's bare minimum.

---

# Touchline deformation-only bones

```text
upperArm_twist_L
upperArm_twist_R

forearm_twist_L
forearm_twist_R

thigh_twist_L
thigh_twist_R

calf_twist_L
calf_twist_R
```

Do not map them to Humanoid semantics.

Do not use them as football-action semantics.

---

# Touchline helper / IK layer

Conceptually standardize:

```text
foot_target_L/R
heel_point_L/R
ball_point_L/R
toe_tip_L/R
knee_target_L/R

hand_target_L/R
elbow_target_L/R

look_target
ball/contact targets
```

but leave open whether each is:

- a bone;
- a socket;
- runtime metadata;
- a procedural rig target.

---

# Deferred

```text
fingers
eyes
jaw
facial rig
extra neck articulation
additional spine segments
physics toe
```

---

# Historical/current Unity note

The 2020 video should not be used as the authority for UI details.

The current Unity 6.0 documentation checked for this report was built **September 29, 2026**. It still explicitly:

- distinguishes required and optional Avatar bones;
- supports `UpperChest`;
- supports toes;
- supports full fingers;
- requires/recommends a T-pose for Humanoid Avatar setup;
- separates the Avatar hierarchy/root from the `Hips` Humanoid semantic;
- supports extra nonmapped transforms. :chatgpt-content-reference{index="24"}


So there is no current Unity change that undermines the basic Touchline architecture.

The notable thing to avoid is confusing **Unity's Humanoid root-motion abstraction** with **Touchline's explicit `root` bone**. Those concepts can coexist but are not identical. :chatgpt-content-reference{index="25"}

---

# Final acceptance checklist for implementation

## Skeleton hierarchy

- [ ] exactly one production skeleton root named according to frozen Touchline convention
- [ ] `root` is nondeforming
- [ ] `root` is above pelvis/Hips
- [ ] `root` is **not** mapped to any Unity `HumanBodyBones` semantic
- [ ] `hips/pelvis` maps to Unity `Hips`
- [ ] Hips represents the central pelvis, not a left/right hip
- [ ] no semantic `hip_L` / `hip_R` bones inserted before the thighs

## Spine

- [ ] `spine_01` maps to `Spine`
- [ ] `spine_02` maps to `Chest`
- [ ] `spine_03` maps to `UpperChest`
- [ ] hierarchy is `Hips → Spine → Chest → UpperChest`
- [ ] `neck` maps to `Neck`
- [ ] `head` maps to `Head`

## Shoulders / arms

- [ ] `clavicle_L` maps to `LeftShoulder`
- [ ] `clavicle_R` maps to `RightShoulder`
- [ ] shoulders parent from `spine_03 / UpperChest`
- [ ] `Shoulder → UpperArm → LowerArm → Hand` semantic chain is preserved
- [ ] upper-arm twist bones are unmapped deformation branches
- [ ] forearm twist bones are unmapped deformation branches
- [ ] twist bones do not interrupt the semantic arm chain

## Legs

- [ ] `Hips → UpperLeg → LowerLeg → Foot → Toe`
- [ ] no separate render hip-joint bones in the semantic chain
- [ ] thigh twist is an unmapped branch
- [ ] calf twist is an unmapped branch
- [ ] twist bones do not interrupt the semantic leg chain

## Feet

- [ ] `foot_L/R` map to `LeftFoot/RightFoot`
- [ ] `toe_L/R` map to `LeftToes/RightToes`
- [ ] hierarchy is literally `Foot → Toe`
- [ ] no deforming heel bone
- [ ] heel/ball/toe-tip contacts are helper metadata or control targets
- [ ] F0 rigid physical foot remains compatible
- [ ] future F2h forefoot articulation remains compatible

## Hands

- [ ] `hand_L/R` map to `LeftHand/RightHand`
- [ ] no mandatory finger chains yet
- [ ] if fingers are added, use standard Unity-compatible five-digit/three-segment topology

## Reference pose

- [ ] canonical production reference/export pose is a T-pose
- [ ] left/right bone orientation is symmetric
- [ ] root has canonical zero orientation
- [ ] Hips/pelvis has defined neutral orientation
- [ ] feet face consistently forward
- [ ] toe bones have a neutral forefoot continuation
- [ ] local-axis convention documented and identical across players
- [ ] scale convention fixed

## Blender/export

- [ ] production hierarchy survives Blender export unchanged
- [ ] no synthetic FBX leaf/end bones
- [ ] rest/bind pose exported deliberately
- [ ] no uncontrolled Armature Object scale
- [ ] `root` is not accidentally stripped for being nondeforming
- [ ] control-rig-only bones are not exported
- [ ] production bone names are stable
- [ ] importer round-trip validates hierarchy and bind transforms

## Unity compatibility

- [ ] all 15 Unity-required Humanoid semantics map successfully
- [ ] Touchline's Chest, UpperChest, Neck, shoulders and toes also map
- [ ] unmapped deformation bones do not interfere with Humanoid mapping
- [ ] optional extra transforms are handled correctly if Unity's hierarchy optimization is enabled
- [ ] Avatar validates in current Unity 6
- [ ] Avatar validates in canonical T-pose

## Physics/render contract

- [ ] render `Hips` maps conceptually to physical pelvis
- [ ] physical L/R hip constraints map between pelvis and thigh bodies, not to render bones
- [ ] one-to-one render-bone/rigid-body topology is **not** assumed
- [ ] render toe does not require physical toe
- [ ] physics remains authoritative
- [ ] same render topology works for F0 and future F2h

## Shared character topology

- [ ] goalkeeper and outfield players use the same semantic skeleton
- [ ] player proportion changes do not alter topology
- [ ] player body generation preserves the same bone names and semantics
- [ ] boot changes preserve Foot → Toe contract
- [ ] kit/mesh customization never changes semantic hierarchy

---

# Final frozen recommendation

If I were giving Claude one hierarchy to implement later, it would be this:

```text
root
└── hips
    ├── spine_01
    │   └── spine_02
    │       └── spine_03
    │           ├── neck
    │           │   └── head
    │           ├── clavicle_L
    │           │   └── upperArm_L
    │           │       ├── lowerArm_L
    │           │       │   ├── hand_L
    │           │       │   └── forearm_twist_L
    │           │       └── upperArm_twist_L
    │           └── clavicle_R
    │               └── upperArm_R
    │                   ├── lowerArm_R
    │                   │   ├── hand_R
    │                   │   └── forearm_twist_R
    │                   └── upperArm_twist_R
    ├── upperLeg_L
    │   ├── lowerLeg_L
    │   │   ├── foot_L
    │   │   │   └── toe_L
    │   │   └── calf_twist_L
    │   └── thigh_twist_L
    └── upperLeg_R
        ├── lowerLeg_R
        │   ├── foot_R
        │   │   └── toe_R
        │   └── calf_twist_R
        └── thigh_twist_R
```

with:

```text
spine_01       = Unity Spine
spine_02       = Unity Chest
spine_03       = Unity UpperChest

clavicle       = Unity Shoulder

toe            = Unity Toes

root           = unmapped structural root
hips           = Unity Hips / anatomical render pelvis
```

**No structural change to that semantic hierarchy should occur after animation production starts.**

The strongest lock-now conclusion from the audit is therefore:

> **Your proposed `root → hips → three-spine → clavicle/arm` and `hips → upperLeg → lowerLeg → foot → toe` model is correct for a Unity-compatible production skeleton. Keep it, formalize the Unity mapping, add branch-based twist deformation bones, and do not insert separate left/right hip bones or helper bones into the Humanoid semantic chains.**

The main decision I would change relative to a bare Unity Humanoid is intentional: Unity can omit Chest, UpperChest, Neck, shoulders and toes and still validate, but **Touchline should not**. Those optional Unity bones are exactly the ones a football character benefits from keeping in the frozen production topology.

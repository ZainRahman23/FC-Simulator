# Single-support yaw: what anchors it, what humans do, which architecture (final pre-E1a stage, §2)

**Evidence:**
- `literature/lit1_ankle_foot_axial.md` (ankle–foot axial resistance);
- `literature/lit3_stance_yaw_demand.md` (stance-foot yaw demand, rotation, ground traction);
- `literature/lit2_knee_axial.md` (knee);
- the diagnostics `tools/yaw_anchor_arch.mjs` (`evidence/arch/`) and the policy battery.

**Every literature value carries its source and how it was read** (full text / abstract / secondary / derived) in those files. **No number below is invented.** Where the evidence is silent, that is said.

## 1. What anchors yaw in true single support in our model

- **Path:** the net vertical-axis torque from the turf to the body runs boot contact → foot → ankle → shank.
  - At the ankle, the torque splits onto the joint's three axes.
  - With a near-vertical shank, almost all of it falls on the **foot ab/adduction axis**, the rotation of the foot about the shank's long axis.
  - In our model that axis is **passive-only**. The DF and inversion actuators carry only the components set by the shank's inclination.
- **Hip and knee axial actuators cannot create net body yaw against the ground.** They only orient the segments relative to each other.
- **The ground side is not the limit.** Boot–turf rotational traction is 28–63 N·m (cleats, standard tests; full text). That is several times the demand of ordinary tasks.

**Measured** (U:R single-support hold, policy = reference, 3 bodies):

| yaw impulse on the pelvis | k = 0 (accepted) | k = 0.13 (unloaded evidence) |
|---|---|---|
| 0.5 N·m·s: stance-ankle peak / left after 3 s | 11.3° / 2.8° | 4.8° (max 6.2°) / 1.4° |
| 1 N·m·s | 12.5° (into the end range) / 4.3° | 9.8° (max 11.1°) / 2.7° |
| the gentle external lift (LIFT) | 7.9° / 2.9° | 1.3° / 0.7° |

**At k = 0** the stance foot has **no** yaw anchor inside ±10°. Even the gentle lift moves the body 8° about the stance ankle.

## 2. What human evidence implies

**In single support, yaw resistance is distributed:**

| structure | what it does | evidence |
|---|---|---|
| talocrural mortise | load-dependent bony congruence; articular geometry gives about 30 % of rotational stability at 1 BW | Stormont 1985, Tochigi 2006 (abstracts) |
| distal tibiofibular joint | about half of unloaded talar rotation | lit1 |
| **subtalar joint (oblique axis, about 37–42°)** | foot yaw is **coupled to inversion / eversion**, so inverter / evertor muscles have transverse-plane moment arms (up to about 20 mm). Our orthogonal ankle drops this **active** yaw path | lit1 (McCullough 2011 abstract; OpenSim gait2392 model file) |
| midfoot | about 9° of talonavicular transverse-plane motion | lit1 |
| knee axial | unloaded compliance about equal to the ankle–foot's; 0.16–2.54 N·m/° with co-contraction | Shoemaker & Markolf 1982, Louie & Mote 1987 (abstracts) |
| hip | turns the body over the planted foot (25–45° within one cutting stance, mostly at the hip) | lit3 |
| arms / trunk | in walking, arm swing and trunk counter-rotation manage most of the yaw angular momentum | Negishi & Ogihara 2023 (full text) |

**Magnitudes:**

| quantity | value | status |
|---|---|---|
| unloaded passive foot rotation about the tibia, small torques | **0.10–0.15 N·m/°** | full text, well supported |
| loaded small-angle passive stiffness | **not measured** in anything found | unknown |
| loaded whole limb (ankle + knee + hip in series), active, 2 Hz | ≥ about 0.35–0.44 N·m/° | Lee 2014, figure read |
| end range | about 0.8–1.7 N·m/° (secants to 20–40°, failure tests) | end range only |
| demand: free moment | walking 3.4 ± 1.4 N·m; running about 8–13 N·m; 45° sidestep about 10–11 N·m (SD 9) | full text |
| demand: ankle axial moment (free moment + horizontal force × CoP lever) | about 0.1–0.3 N·m/kg (7–25 N·m) in running / cutting | full text |
| shank-over-foot rotation in stance | tibia vs calcaneus about 5° (running, bone pins), mostly coupled to eversion; 3–4° per half stance in walking | full text |
| single-leg quiet stance, slow foot lift | **no data found**; inferred ≤ 1–3 N·m | inference |

**Does our single coordinate stand in for a distributed human system? Yes.** The one passive "fabd" coordinate stands in for:
- talocrural and tibiofibular rotation;
- the subtalar yaw component, **both passive and active**;
- the midfoot.

**What it lacks:**
- the active path;
- load-dependent stiffening;
- the eversion coupling.

**Two consequences pull in opposite directions:**
1. Folding midfoot and part of the knee compliance into it argues for more compliance.
2. Dropping the active subtalar path and the load dependence makes a passive spring under-represent loaded human resistance.

## 3. Architectures compared (conceptually and diagnostically; none adopted)

**Stance-ankle peak, median of 3 bodies, policy = reference, k_u = 0.13:**

| | 0.5 N·m·s | 1 N·m·s | 1 N·m·s near-single (T5 97 %) | LIFT | energy |
|---|---|---|---|---|---|
| passive, constant k = 0.13 | 4.8° | 9.8° | 9.5° | 1.3° | conservative |
| **A** load-dependent passive, k_L = 0.4 at 1 BW (the loaded whole-limb lower bound, **not** a measured ankle value) | 3.5° | 6.9° | 7.1° | 1.0° | **not conservative**: ½·Δk·x² injected (measured ≤ 0.002 J here) |
| A, k_L = 1.0 (the runway's scoping value; **no evidence**) | 2.4° | 4.8° | 5.0° | 0.7° | as above |
| **B** active foot-yaw torque, capacity 5 N·m (K 2 N·m/°) | 0.7° | 2.1° | 2.1° | 0.7° | dissipative (active work −0.12 J) |
| B, capacity 10 N·m | 0.7° | 1.4° | 1.5° | 0.7° | dissipative |
| **C** distributed (hip / knee / arms) | cannot anchor net yaw. It can only redistribute angular momentum (arms / trunk) or hold the pelvis on the leg (hips: what reference already does) | | | | — |

**Limitation:** the B diagnostic is an explicit internal torque pair, applied only to a loaded foot. At a 20 N·m capacity it went numerically unstable on some bodies (closure +146–178 J). A real implementation would be an implicit actuator row.

**Conclusions:**
1. **The evidence-supported passive part is k ≈ 0.13** (unloaded). With it, single-support yaw is compliant but bounded: about 10° under 1 N·m·s, then it recentres.
   - That is the same order the literature review's own scoping gives for a passive human ankle at about 0.4 N·m/°: about 10° under 1 N·m·s.
   - **The runway's 5° target is not evidence-based** and is withdrawn as a requirement.
2. **Load-dependent passive stiffening (A) is directionally supported but has no measured magnitude.** It cannot be adopted as a number, and it is not conservative.
3. **The active subtalar path (B) is the human mechanism our model omits.**
   - Modest capacity bounds single-support yaw to about 1.5–2° in these tests. That is plausibly too stiff for running and cutting, where humans show about 5° of coupled rotation.
   - Its capacity is unmeasured, and adding it is an anatomy / actuator decision.
4. **Recommended architecture: D.**
   - **Now:** the passive constant law k = 0.13.
   - **Later, for running / cutting / turning:** the active subtalar-type yaw path, sized from inverter / evertor capacities through the oblique-axis geometry, plus whole-body angular-momentum management by arms and trunk.
   - The load-dependent part waits for a loaded measurement.

## 4. Relevance to E1a / E1b

- **E1a** (5 mm, slow, in place) has a tiny yaw demand. At k = 0.13 the stance ankle moves about 1.3° under the comparable external lift, so **it does not need the active path.**
- **E1b's 0.5 N·m·s yaw perturbation** gives about 5° at k = 0.13, inside the preregistered 10°.
- **At k = 0** the stance ankle reaches 8–11°, and the policy battery shows the posture semantics fail. **E1 needs k > 0.**

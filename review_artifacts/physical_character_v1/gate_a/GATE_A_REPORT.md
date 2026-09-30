# Physical Character V1: Gate A report

**Passive 14-body humanoid on Jolt Physics.** No motors, no animation targets, one character. Worktree `physical-character-v1`; nothing committed or pushed.

2026-09-29 · Gabriel Magalhães (190 cm, 78 kg) · Jolt Physics 5.6.0 (JoltPhysics.js 1.1.0, wasm-compat) · 240 Hz, 1 collision step, 30 velocity / 4 position iterations

![Gate A contact sheet](contact_sheet.jpg)

---

## Verdict

**My opinion: Gate A passes on its physical criteria.** Two items still need your eyes before we teach the body to move:

1. **Rendered mesh sinking into the turf.** The colliders sit ≤ 5.3 mm into the turf at rest. The skinned mesh extends 3–5 cm beyond the colliders on the limbs, so at rest it dips up to **2.4 cm** below the turf plane (shin, hand, shorts). In mid-fall it dips up to **3.7 cm**, lasting a few frames. This comes from how the colliders are fitted, not from the solver.
2. **Joint-limit excursions during impact.** Hard limits yield up to **7.2°** briefly on landing. At rest they are within **0.63°**. The soft end-stops on the knees and elbows overshoot up to **12°** by design, and are within 1.45° at rest.

| criterion | measured (worst over drops A–E) | pass? |
|---|---|---|
| joints stay connected (no "sausages") | max separation **4.6 mm** in flight, ≤ 0.13 mm at rest | ✅ |
| no collider sinking into the turf | ≤ **13.9 mm** transient (drop D, spinning foot), ≤ **5.3 mm** at rest (Jolt's 5 mm slop) | ✅ |
| rendered mesh not visibly below the turf | ≤ **37 mm** transient, ≤ **23.7 mm** at rest | ⚠️ your call |
| self-penetration between bodies | ≤ **5.5 mm** (drop C forearm–thigh), otherwise ≤ 2.2 mm | ✅ |
| anatomical limits respected | hard ≤ **7.2°** transient / ≤ 0.63° at rest; soft stops ≤ 12.3° transient / ≤ 1.45° at rest | ⚠️ your call |
| no explosions, pops or jitter | max correction pop **1.4 mm**; no NaN; residual motion **0 mm/s**; all drops **asleep ≤ 1.85 s** | ✅ |
| energy is not created | max single-step gain **2.6 J** against 400–1150 J of starting energy; the causes are identified (§15) | ✅ |
| propagation emerges, not a rigid plank | first-to-last turf contact spread over 200–600 ms, body by body (§3) | ✅ (from data and stills; judge the motion in the harness) |
| deterministic | 3/3 repeats bit-identical for every drop; **Node = Chrome** for every drop | ✅ |
| cheap | **0.17–0.26 ms per 60 Hz frame** (4 steps), one character, Apple M4 | ✅ |

The ✅ items are measured. I have not judged how natural the motion looks: I only looked at stills and the contact sheet. The harness is there for that.

---

## 1. Interactive harness

```
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
python3 -m http.server 8171
# open http://127.0.0.1:8171/sandbox/visual/physchar/index.html
```

It needs the HTTP server because of ES modules, the WASM, the mesh fetch and the suite JSON. Stop the server with Ctrl-C when you are done.

- **Simulation:** the page simulates each drop in the browser with the exact Gate A settings and the same Jolt WASM as the Node runs. It records every 240 Hz step, so playback, scrubbing and stepping are exact rather than re-simulated. The side panel shows the browser run's hash next to the Node suite's hash.
- **Toolbar 1:**
  - drop selector A–E, ↺ restart;
  - ▶ play / pause (Space) at 1× / 0.5× / 0.25×;
  - ◀ step / step ▶ by one physics step (← / →);
  - **worst** jumps to the worst frame for ground penetration, joint separation, limit violation, correction pop, self-penetration or energy gain;
  - **view** mesh / physics toggles;
  - **camera** presets ¾ / front / side / back / top, plus follow-COM.
- **Toolbar 2, overlays:** bodies, colliders, body COMs, total COM, joint anchors, joint axes, joint limits, ground contacts, contact normals, penetration, linear velocity, angular velocity, joint error ×20, sleeping.
- **Camera:** drag to orbit; Shift-drag or right-drag to pan (this turns follow off); scroll wheel to zoom.
- **Timeline:** a scrubber over the whole run. Below it is a chart of KE (yellow), awake bodies (green) and worst-frame markers (red ticks).
- **Side panel:** live per-step readouts (KE / PE / E, awake count, contacts, penetration, joint error, limits), the drop's summary, and the Node suite table.

## 2. Views

- **mesh + physics** (default): the skinned player mesh is drawn from the physical body transforms, with colliders as a cyan wireframe over it.
- **physics only** (toggle "mesh" off): colliders in per-body colours; sleeping bodies are grey.
- **mesh only** (toggle "physics" off).

The mesh is **fitted from** the physical state. Each rig bone's skin matrix is its body's rigid transform about the bind pose (`pc_fit.js`). There is no second animation state.

## 3. Drop suite (deterministic, released passive)

| drop | set-up | first turf contacts (s) |
|---|---|---|
| **A** relaxed upright | standing, joints slightly relaxed, 3 cm up, released from rest | foot_L 0.050, foot_R 0.050 → foreArm_L 0.533, foreArm_R 0.533 → pelvis 0.579 |
| **B** hip / side-first | rolled ~92° onto the right side, trunk bent laterally away from the turf, right arm overhead (10° inside its limit), legs lightly flexed; 20 cm up, 0.5 m/s down; right thigh / hip lowest | **thigh_R 0.154 → pelvis 0.171 → upperArm_R 0.192 → foot_R 0.254 → foreArm_L 0.313 → foot_L 0.400 → shin_L 0.479 → thigh_L 0.496** |
| **C** shoulder / upper-body-first | pitched 70° forward, rolled 35° right, bent at the hips; arms asymmetric; 30 cm up, 0.4 m/s forward | foreArm_R 0.217 → foot_R 0.237, foot_L 0.242 → thigh_R 0.346 → shin_R 0.350 → pelvis 0.392 → thigh_L 0.408 |
| **D** rotating | nearly upright, feet 2 cm up; ω = (1.5, 2.0, −2.5) rad/s, drift 1.2 m/s sideways, 0.6 m/s forward | foot_R 0.004 → foot_L 0.096 → foreArm_R 0.462 → foreArm_L 0.529 → head 0.571 → upperArm_R 0.575 → thigh_R 0.592 → pelvis 0.604 |
| **E** awkward asymmetric | root yawed 30°, pitched 25°, rolled −35°; right leg flexed, abducted and twisted, left leg extended; arms opposite; spine twisted and bent; 40 cm up with a small tumble | foot_R 0.246 → foot_L 0.338 → shin_R 0.400 → shin_L 0.471 → thigh_L 0.487 → foreArm_L 0.496 → foreArm_R 0.546 |

Every drop's starting pose is checked for self-overlap before release, and none have any. Poses are built from joint angles through the same swing–twist convention Jolt clamps (`pc_gatea.js: jointRelRot`). Limit violations are measured from step 0, and no drop starts outside a limit (A's 0.88° is its largest, at landing).

**Propagation evidence:**

- **Drop B (hip-first)** shows the load travelling through the chain. The right thigh lands, the pelvis follows 17 ms later, then the raised right arm 38 ms later. The legs fold over and the free-side (left) arm and leg reach the turf 160–340 ms after the first impact. A rigid plank would land in one event; disconnected parts would not bring the pelvis down 17 ms after the thigh.
- **Drop A** is a collapse, not a topple: the feet stay planted, the knees and hips buckle, the forearms reach the turf 0.48 s later and the pelvis after them.
- Stills (in `stills/`):
  - `B1_0.16s_hip_contact` / `B2_0.20s_propagation_physics`: the moment of hip contact and the chain 40 ms later;
  - `A2_0.55s`: the crouched collapse;
  - `E2_worst_limit_physics`: the worst-limit frame of the asymmetric drop;
  - `D2_0.6s_physics_top`: the tumbling drop from above.

## 4. Measurements

All figures are from `gatea_final_240x1.json` / `.log`: 6 s per drop, 1,440 steps, maxima over every step. Rendered-mesh depth is measured every 4th step (60 Hz) by CPU-skinning all of the mesh's referenced vertices.

| drop | turf pen. (colliders) max / rest | rendered mesh below turf max / rest | self-pen. max | joint separation max | hard-limit max (time > 2°) | soft-stop overshoot | pop max | max step E-gain (steps > 50 mJ) | settle / sleep | start PE + KE |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 5.75 / 2.52 mm | 3.3 (toe) / 2.3 (toe) mm | 0.19 mm | 1.64 mm (lumbar) | 0.88° (0 ms) | 8.65° | 0.45 mm | 2.63 J (10) | 1.14 / 1.63 s | 846.7 + 0 J |
| B | 7.90 / 5.26 mm | 28.6 (hand_R) / 23.7 (shin_L) mm | 0.23 mm | 4.44 mm (shoulder_R) | 5.59° shoulder_R (500 ms) | 0.53° | 0.69 mm | 0.60 J (1) | 0.98 / 1.52 s | 397.3 + 9.8 J |
| C | 5.09 / 5.04 mm | 14.3 (head) / 11.2 (thigh_L) mm | 5.47 mm (foreArm_L–thigh_L) | 3.76 mm (hip_R) | 4.21° shoulder_L (13 ms) | 1.37° | 1.27 mm | 0.24 J (1) | 0.78 / 1.28 s | 768.2 + 9.8 J |
| D | 13.9 / 1.95 mm | 17.1 (thigh_R) / 10.5 (upperArm_R) mm | 2.19 mm | 4.62 mm (ankle_R) | 5.31° ankle_R (96 ms) | 10.73° | 0.81 mm | 2.36 J (9) | 1.34 / 1.85 s | 858.9 + 127.8 J |
| E | 4.15 / 1.42 mm | 37.0 (shin_L) / 18.9 (hand_R) mm | 0.23 mm | 3.89 mm (ankle_R) | 7.20° shoulder_R (33 ms) | 12.26° | 1.39 mm | 0.96 J (2) | 1.10 / 1.60 s | 1142.3 + 21.7 J |

State at rest (t = 6 s, re-run on 2026-09-29; hashes identical to the suite):

| drop | largest hard-limit violation | soft-stop overshoot | joint separation |
|---|---|---|---|
| A | 0.00° | 0.41° | 0.00 mm |
| B | 0.63° (shoulder_R) | 0.00° | 0.13 mm |
| C | 0.08° | 0.54° | 0.05 mm |
| D | 0.00° | 1.45° | 0.01 mm |
| E | 0.00° | 0.01° | 0.00 mm |

**Definitions:**

- **Turf penetration:** the exact lowest point of every collider shape below y = 0, computed analytically from the body state. It is not the engine's contact report, although the two agree (drop B: 7.90 vs 7.89 mm).
- **Rendered mesh below turf:** the lowest skinned vertex, labelled with its dominant bone.
- **Self-penetration:** the deepest contact between two of the character's own bodies. This is Jolt's contact depth, which is pre-solve (§15).
- **Joint separation:** the distance between the joint's anchor on the parent and on the child.
- **Hard / soft limit:** the swing–twist angles outside the ROM, recomputed independently in JS and checked against Jolt's own readouts (`tools/check_joints.js`). "Hard" means the SixDOF joints; "soft" means the knee and elbow spring end-stops.
- **Pop:** each step, the gap between a body's COM displacement and its v·dt. This is the position-correction jump.
- **Energy gain:** any step where KE + PE rises by more than 50 mJ with no external source.
- **Settle:** the time at which every body falls below its motion threshold. **Sleep:** the time at which Jolt puts all 14 bodies to sleep.

**Rendered-visible penetration**, by class:

- **Transient:** colliders ≤ 13.9 mm (D's spinning right foot, 0.25 s in); mesh ≤ 37 mm (E's left shin).
- **Sustained (rest):** colliders ≤ 5.3 mm, which is Jolt's intended resting overlap (penetration slop 5 mm); mesh ≤ 23.7 mm.
- **Rendered-visible:** the mesh-at-rest figures, which you are likely to see as a shin or hand dipping into the grass at close camera range. The cause is the collider fit (§9), not the solver.

## 5. Jolt version and build

- **Jolt Physics 5.6.0** through **JoltPhysics.js 1.1.0** (npm `jolt-physics`), **`jolt-physics.wasm-compat.js`**: the single-threaded build with the WASM inlined. MIT licence.
- Vendored at `sandbox/visual/physchar/vendor/`, with the licence file and a README (sha256 `011233a5…4c257de`). Node and the browser load this identical file, which is the precondition for the cross-runtime check.
- No multithreading, no SharedArrayBuffer, no COOP/COEP headers needed.
- `pc_jolt.js` is the only file that knows Jolt. The body spec (`pc_body.js`) and the drop suite (`pc_gatea.js`) are engine-agnostic data and measurement.

## 6. Timestep and solver configuration

| setting | value | why |
|---|---|---|
| step | **240 Hz, 1 collision step** (4 steps per 60 Hz frame) | the lowest rate that keeps joint separation under 5 mm and hard-limit transients under 10° (sweep below) |
| iterations | **30 velocity / 4 position** | Jolt's default of 10 velocity iterations let trapped limbs inject up to 18 J; 4 position iterations halve limit transients against 2 without the energy cost of 8 |
| penetration slop | 5 mm | Jolt's resting-overlap allowance; this is where the 5.3 mm at rest comes from |
| speculative contact distance | 0.02 m (Jolt default) | the fall speeds here (≤ 4 m/s) do not need the 0.25 m that fast limbs will need (a Gate B+ concern) |
| Baumgarte | 0.2 (default) | |
| linear / angular damping | 0.05 / 0.05 | Jolt default; small, uniform, not tuned per drop |
| max angular velocity | 47.1 rad/s (15π) | Jolt default |
| sleeping | allowed | all drops sleep ≤ 1.85 s with 0 residual motion |
| knee / elbow end-stops | soft, 20 Hz, ζ = 1.0 | hard hinge stops injected up to 14 J (§15) |
| gravity | −9.81 m/s² | |

**Configuration comparison** (`config_sweep.txt`; worst over all five drops):

| config | turf mm | joint mm | hard lim ° | soft over ° | self mm | max E+ J | E+ steps | sleep ≤ s | ms / 60 Hz frame |
|---|---|---|---|---|---|---|---|---|---|
| 60 Hz, Jolt defaults (hard stops) | 44.6 | 47.7 | 39.0 | 7.3 | 32.8 | 8.82 | 176 | 4.40 | 0.062 |
| 60 Hz, 30 vel it, soft stops | 76.7 | 31.0 | 43.8 | 15.9 | 31.6 | 4.28 | 44 | 3.23 | 0.050 |
| 120 Hz, 30 vel it, soft stops | 17.5 | 13.2 | 12.3 | 10.8 | 8.1 | 3.68 | 21 | 1.83 | 0.071 |
| 120 Hz, 30 vel / 4 pos it, soft stops | 19.3 | 12.3 | 7.6 | 10.9 | 11.3 | 3.68 | 16 | 2.10 | 0.112 |
| 180 Hz, 30 vel it, soft stops | 18.1 | 9.9 | 19.0 | 15.5 | 10.5 | 4.90 | 27 | 2.21 | 0.111 |
| 240 Hz, 10 vel it (default), soft stops | 13.9 | 7.2 | 8.8 | 12.6 | 5.2 | **18.04** | 28 | 3.23 | 0.157 |
| 240 Hz, 30 vel it, HARD stops | 15.8 | 6.2 | 9.4 | 3.3 | 5.5 | 6.46 | 17 | 2.49 | 0.148 |
| 240 Hz, 30 vel / 2 pos it, soft stops | 15.8 | 5.8 | 15.4 | 12.3 | 4.9 | 2.63 | 19 | 1.80 | 0.127 |
| 240 Hz, 30 vel / 8 pos it, soft stops | 13.6 | 4.8 | 5.3 | 12.2 | 5.6 | 7.22 | 23 | 1.95 | 0.329 |
| **240 Hz, 30 vel / 4 pos it, soft stops ← Gate A** | **13.9** | **4.6** | **7.2** | **12.3** | **5.5** | **2.63** | 23 | **1.85** | **0.196** |

- **60 Hz is not usable:** the joints open 3–5 cm, limits blow through by ~40°, and bodies overlap 3 cm.
- **120 Hz with 30 / 4 iterations is the near-miss alternative** at about half the cost. Its 12 mm joint gaps are the reason I did not choose it.
- **60 × 20 was not inherited.** 240 × 1 is 5× fewer solver steps.
- **180 Hz scoring worse than 120 Hz on limits is a sampling artefact:** each config runs the same five chaotic landings once, so single-config differences of a few degrees are noise. The trend over 60 → 120 → 240 is the result.

## 7. The 14-body hierarchy

```
pelvis (root)
├── abdomen ── chest ─┬─ head
│                     ├─ upperArm_L ── foreArm_L (+hand)
│                     └─ upperArm_R ── foreArm_R (+hand)
├── thigh_L ── shin_L ── foot_L (+toe)
└── thigh_R ── shin_R ── foot_R (+toe)
```

- **Exactly the 14 bodies you specified:** 13 joints (9 SixDOF, 4 hinges).
- **No fingers, toes, clavicles or extra spine segments.** The rig's extra bones ride on their parent bodies: root → pelvis; clavicle_L/R → chest; neck, head and hair → head; hand → forearm; toe → foot.
- **Nothing had to be added for Gate A.** One candidate for later: the missing clavicle / scapula means the shoulder cannot shrug, and arm elevation is capped at 150° (§10, §14). That did not matter for passive falls; it may matter when Gate B raises the arms.
- **Body frames:** each body's origin is its rig bone's joint, with world-aligned axes at bind, so a body's transform *is* its bone's transform. The COM is offset inside the body (`OffsetCenterOfMassShape`), and mass and inertia are given explicitly (`MassAndInertiaProvided`), never derived from the collider volumes.

## 8. Masses, COMs and inertia (with sources)

- **Player:** `rig.identity` gives Gabriel Magalhães at **190 cm, 78 kg**. The physical mass totals **78.000 kg**.
- **Mass:** de Leva (1996) **male** segment mass fractions × 78 kg. Two combined bodies:
  - forearm + hand = 1.62 % + 0.61 %;
  - head = the de Leva head segment, which includes the neck (vertex → C7).
- **COM:**
  - limbs: de Leva's CM % applied along **the rig's own segment** (proximal joint → distal joint);
  - trunk slices: the rig's joint-to-joint height;
  - head: measured from the vertex at the player's stature;
  - foot: along the rendered boot heel → toe, 4.5 cm above the stud plane;
  - forearm + hand: the mass-weighted composite, with hand length = de Leva × stature ratio.
- **Inertia:** de Leva radii of gyration (% of de Leva's mean segment length, 1.741 m subjects) × **(H / 1.741) = 1.091**, then m·k².
  - Axes: x = transverse (medio-lateral), y = longitudinal, z = sagittal (antero-posterior). The foot lies along z, so its Iz is the longitudinal one.
  - The forearm + hand uses the parallel-axis theorem about the composite COM.
  - Inertia scaled ×2 on the light distal bodies was tried and gave mixed results, so it was not adopted.

| body | parent | mass kg | de Leva segment | COM (body-local, m) | Ixx / Iyy / Izz (kg·m²) |
|---|---|---|---|---|---|
| pelvis | — | 8.713 | lower trunk 11.17 % | (0, 0.045, 0) | 0.067 / 0.076 / 0.083 |
| abdomen | pelvis | 12.737 | mid trunk 16.33 % | (0, 0.128, 0) | 0.103 / 0.154 / 0.164 |
| chest | abdomen | 12.449 | upper trunk 15.96 % | (0, 0.190, 0) | 0.089 / 0.188 / 0.221 |
| head | chest | 5.413 | head + neck 6.94 % | (0, 0.133, 0) | 0.038 / 0.026 / 0.035 |
| upperArm L/R | chest | 2.114 | upper arm 2.71 % | (0, −0.198, 0) | 0.014 / 0.005 / 0.016 |
| foreArm L/R | upperArm | 1.739 | forearm 1.62 % + hand 0.61 % | (0, −0.204, 0) | 0.028 / 0.002 / 0.030 |
| thigh L/R | pelvis | 11.045 | thigh 14.16 % | (0, −0.197, 0) | 0.254 / 0.052 / 0.254 |
| shin L/R | thigh | 3.377 | shank 4.33 % | (0, −0.197, 0) | 0.047 / 0.008 / 0.049 |
| foot L/R | shin | 1.069 | foot 1.37 % | (0, −0.043, 0.077) | 0.005 / 0.006 / 0.001 |

**Source:** de Leva P. (1996), "Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters", *J Biomech* 29(9):1223–1230, male columns. The table is transcribed in `pc_body.js: DE_LEVA`.

## 9. Colliders and mesh fit

Every collider is **fitted to this player's own skinned mesh**. Each vertex is assigned to its dominant bone, then to that bone's body. Percentile windows keep joint bulges, sleeve and short hems, and the hair shell out of the fit.

- **Trunk (pelvis / abdomen / chest): rounded boxes,** one per height slice of all torso vertices, stacked joint to joint.
  - Only 66 vertices are skinned mainly to `spine`, so a per-bone fit was useless.
  - The chest slice stops 3 cm medial of the shoulder joints; the deltoid belongs to the upper-arm capsule.
- **Limbs: tapered capsules** whose axis runs through the **cross-section centroids** of the limb's own vertices, not the bone line.
  - The calf sits behind the tibia; a bone-line capsule left the calf mesh 2–3 cm under the turf.
  - The radius is the 80th percentile of distance to that axis.
- **Hand:** a capsule on the hand's own centre line, offset from the bone, part of the forearm body. A flat box hand was measured and rejected (§15).
- **Head:** a skull sphere (85th percentile of head-bone vertices; the 36,801-vertex hair shell is excluded) plus a neck capsule.
- **Foot:** a rounded box = the rig's rendered boot bounds (`footwearMin/Max`).

| body | collider(s) | mesh verts | inside collider | p95 / max outside |
|---|---|---|---|---|
| pelvis | box ½-extents 0.182 × 0.133 × 0.119, r 0.04 | 1826 | 88.6 % | 26.5 / 27.7 mm |
| abdomen | box 0.172 × 0.116 × 0.107, r 0.04 | 66 † | 86.4 % | 12.9 / 12.9 mm |
| chest | box 0.193 × 0.136 × 0.100, r 0.04 | 1607 | 87.1 % | 32.0 / 35.0 mm |
| head | sphere r 0.115 + neck capsule ½h 0.047 r 0.062 | 36801 | 91.3 % | 31.6 / 39.3 mm |
| upperArm L / R | tapered capsule ½h 0.090, r 0.075 → 0.067 | 530 | 79.2 / 78.5 % | 46.0 / 48.8 mm |
| foreArm L / R | tapered capsule ½h 0.099, r 0.049 → 0.038 + hand capsule ½h 0.072 r 0.029 | 954 | 72.3 / 71.5 % | 28.0 / 35.1 mm |
| thigh L / R | tapered capsule ½h 0.086, r 0.118 → 0.096 | 2038 / 1975 | 75.6 / 75.5 % | 33.4 / 57.6 mm |
| shin L / R | tapered capsule ½h 0.146, r 0.065 → 0.060 | 848 | 69.8 / 70.3 % | 37.6 / 44.8 mm |
| foot L / R | box 0.082 × 0.075 × 0.179, r 0.01 | 920 | 100 % | 0 / 0 mm |

† The abdomen fit column counts the spine-dominant vertices. The box itself is fitted to the whole torso slice.

- **How to read the fit:** the colliders are deliberately *inside* the mesh surface on the limbs. The p95 of the mesh lies 3–5 cm outside them, and that margin is exactly the rendered sinking at rest (§4).
- **The trade-off:** fatter colliders reduce the sinking but make limbs meet each other earlier and fight (for example hands against thighs). This was a fitting choice, and it is the main open visual question (§14).
- **The thigh radius is set by the shorts:** 11.8 cm at the top. The rendered thigh is inside the shorts.

## 10. Joints: definitions, ROM and the Jolt mapping

Each constraint frame's X axis is the twist axis: it points up the trunk and neck, and down the limbs. Y is the first swing axis (the body's +x at bind), and Z = X × Y.

| joint | Jolt constraint | twist (X) | swing Y | swing Z | passive friction N·m |
|---|---|---|---|---|---|
| lumbar | SixDOF, pyramid | ±12° | −20° ext … +45° flex | ±20° lateral | 2.0 |
| thoracic | SixDOF, pyramid | ±30° | −10° … +35° | ±15° | 2.0 |
| neck | SixDOF, pyramid | ±60° | ±45° | ±40° | 0.5 |
| shoulder_L | SixDOF, pyramid | −70° … +90° | −150° flex … +50° ext | −150° abd … +30° add | 0.5 |
| shoulder_R | SixDOF, pyramid | −90° … +70° | −150° … +50° | −30° add … +150° abd | 0.5 |
| elbow L/R | Hinge, soft stops | — | 0 … 145° flexion (−2° allowance) | — | 0.3 |
| hip_L | SixDOF, pyramid | ±45° | −120° flex … +30° ext | −45° abd … +30° add | 2.0 |
| hip_R | SixDOF, pyramid | ±45° | −120° … +30° | −30° add … +45° abd | 2.0 |
| knee L/R | Hinge, soft stops | — | 0 … 140° flexion (−3° allowance) | — | 1.0 |
| ankle_L | SixDOF, pyramid | ±10° | −20° dorsi … +50° plantar | −15° … +35° (inv / ev, mirrored) | 0.5 |
| ankle_R | SixDOF, pyramid | ±10° | −20° … +50° | −35° … +15° | 0.5 |

**Sign convention for this rig:**

- A hinge angle > 0 is flexion.
- SixDOF swing Y > 0 is flexion for the trunk and neck (X up) but *extension* for hips and shoulders, and plantarflexion for ankles (X down).
- Swing Z > 0 moves a down-pointing segment toward the player's right. That is abduction on the right and adduction on the left, which is why the left limits are mirrored.

**ROM sources:**

- AAOS / Norkin & White normative ROM, cross-checked against the CDC normal-joint-ROM study (Soucie et al. 2011).
- The **trunk split is ours:** total flexion 80°, extension 30°, lateral bend 35° and rotation 42° are divided between lumbar and thoracic, with the rotation mostly thoracic.
- **Shoulder elevation is capped at 150°,** not 180°. Glenohumeral motion alone is about 120°; the rest comes from the scapula, which we don't have. Pyramid swing also becomes poorly conditioned near 180°.

**Why these Jolt constraints:**

- **SixDOF with `ESwingType_Pyramid`:**
  - `SwingTwistConstraint` and SixDOF's cone mode only allow symmetric swing, but anatomy is asymmetric (hip flexion 120° against extension 30°). Pyramid gives independent min / max per axis.
  - All three translation axes are locked, and the rotation limits are hard.
  - Jolt's swing–twist decomposition (twist about X, then swingY / swingZ = 2·atan2) is reproduced in `pc_math.js: Q.swingTwist`. It is verified identical to Jolt's own readouts, which is how the limit measurements in §4 are independent of the solver.
- **Hinge for knees and elbows:** one degree of freedom is the cheapest and most stable constraint.
  - **Soft end-stops** (`mLimitsSpringSettings`, 20 Hz, ζ = 1) replace hard stops, which injected energy.
  - The cost is designed overshoot under load: ≤ 12° transient, ≤ 1.45° at rest.
  - Known consequence: the forearm cannot pronate or supinate (§14).
- **Passive joint friction:** `SetMaxFriction` per rotation axis on SixDOF, `mMaxFrictionTorque` on the hinges.
  - This is dry friction: it only ever opposes relative rotation, and no motor state is enabled. It is what stops the limbs flopping like rope. Zero friction measured worse during tuning.
  - That tuning run was not repeated for the final configuration.
- **Self-collision** (`GroupFilterTable`):
  - Every body pair collides except these 16:
    - the 13 parent–child pairs, which always overlap at the joint;
    - pelvis–chest, which sit one short abdomen apart and meet under ordinary trunk flexion;
    - abdomen–thigh L / R, which fought the hip at deep flexion and injected 12 J.
  - So hands against thighs, arm against chest, leg against leg, head against arm and so on all collide.

## 11. Friction, restitution and damping

| pair | friction | restitution |
|---|---|---|
| boot ↔ turf | 0.9 | 0 |
| hand ↔ turf | 0.6 | 0 |
| body ↔ turf | 0.5 | 0 |
| body ↔ body | 0.4 | 0 |
| boot ↔ body | 0.4 | 0 |
| hand ↔ body | 0.4 | 0 |

- **How the policy is applied:** it is applied per contact pair (a `ContactListenerJS` sets `mCombinedFriction` / `mCombinedRestitution`), not by Jolt's geometric-mean combine.
- **Restitution is 0 everywhere,** because humans don't bounce.
- **Damping:** linear and angular 0.05 on every body. Joint friction is in §10.
- **Starting values, not tuned:** these were chosen as plausible values and nothing was tuned per drop. Gate B will be the first real test of turf friction, when feet push.

## 12. Determinism

- **Hash:** FNV-1a over the exact Float64 bits of position, rotation, linear and angular velocity for all 14 bodies, chained every step (1,440 steps per drop).
- **Repeats:** 3 runs per drop in one Node process are **bit-identical** for all five drops.
- **Cross-runtime:** the Chrome 154 harness (same WASM) against Node 22.19 is **identical for all five drops**:

  | drop | hash |
  |---|---|
  | A | `5bbffb56` |
  | B | `2f8a9c80` |
  | C | `34af33e` |
  | D | `55b97ba8` |
  | E | `48f19a22` |

- **Fresh process:** a separate Node process today, used for the rest-state table in §4, reproduced all five hashes.
- **Condition:** everything JS-side that feeds the physical state uses **deterministic trigonometry** (§15). `Math.sin` is only allowed for display.
- **Not tested:** other machines or CPU architectures. WASM float arithmetic is IEEE-deterministic apart from NaN payloads, so the same file *should* reproduce elsewhere, but that is unverified.

## 13. Performance

Figures are Jolt step time, measured in Node 22.19 on an Apple M4, single-threaded, for one character: 14 bodies, 13 constraints, the turf, and all self-collision pairs live.

| drop | ms / 240 Hz step | ms / 60 Hz frame (4 steps) |
|---|---|---|
| A | 0.055 | 0.221 |
| B | 0.052 | 0.206 |
| C | 0.042 | 0.166 |
| D | 0.065 | 0.259 |
| E | 0.051 | 0.204 |

- That is about **1.5 % of a 16.7 ms frame per character.** It excludes the harness's measurement code and rendering.
- Browser step time was not separately benchmarked; the harness pre-simulates the drop.

## 14. Known failures and limitations

1. **Rendered mesh sinks up to 2.4 cm at rest** (shins, hands, shorts) and 3.7 cm transiently. This is the collider-fit margin (§9), not solver penetration. It can be fixed later by fitting limbs closer to the p95 surface, or with a render-side contact offset. I have not attempted either.
2. **Hard limits can be overpowered by body weight on landing:** up to 7.2°, for 500 ms total on B's loaded shoulder, and ≤ 0.63° at rest. More position iterations reduce it, but 8 iterations raised the energy injection to 7.2 J.
3. **Soft knee and elbow stops overshoot** ≤ 12° under impact. This is the price of not injecting energy.
4. **Trapped-limb energy events:** a limb pinned between the turf and the body gets conflicting contact and joint corrections. They are now ≤ 2.6 J per step, 23 steps over all drops, and they settle. Reduced, not eliminated.
5. **Elbow is a hinge:** there is no pronation or supination, so the forearm cannot twist. A SixDOF elbow would allow it at some cost in stability. It didn't matter for passive falls.
6. **Shoulder at 150° max elevation, and no clavicle or scapula:** no shrug. Pyramid limits get poorly conditioned towards 180°.
7. **The thigh collider is sized by the shorts** (r 11.8 cm), so thigh-to-thigh and hand-to-thigh contact happens at the shorts' surface.
8. **Three collision pairs are filtered out on purpose** (pelvis–chest, abdomen–thigh L/R), so extreme trunk-to-thigh folding is limited only by the hip ROM, not by contact.
9. **Jolt JS exposes no post-solve contact impulses.** The contact depth in the listener is pre-solve (the previous committed state). Contact *forces* for later gates will have to come from velocity deltas or a custom readout.
10. **120 Hz was a near miss** (§6). If the frame budget ever matters more than 12 mm joint gaps, it is the fallback.
11. **Not tested:** fast limb impacts (tunnelling at 13–15 m/s, deliberately out of scope), a second character, other players' rigs, and other machines for determinism.

## 15. Unexpected discoveries

1. **`Math.sin` is not bit-identical between Node 22 and Chrome 154.**
   - Drop D's starting pose came out differently in the two runtimes, and the chaotic tumble amplified that into a different hash. Jolt itself was not the problem: once the inputs matched, its WASM gave identical bits.
   - Fixed with deterministic `dsin` / `dcos` / `dtan` in `pc_math.js`: Cody–Waite reduction plus Taylor polynomials, using only + − × ÷, and `Math.sqrt` instead of `Math.hypot`.
   - **Production rule this implies:** any JS maths feeding a physics state must avoid `Math.sin/cos/tan/exp/pow/hypot/atan2`.
2. **Hard joint stops create energy.** The hinge's hard knee limit injected up to **14 J**. Soft end-stops at 20 Hz, ζ = 1 removed that.
3. **Trapped limbs are the dominant energy source, and the hand's shape decides it.**
   - A trapped flat box hand injected **29 J**. The offset capsule plus 30 velocity iterations brought it to ≤ 2.6 J.
   - Even with the capsule hand, the 240 Hz sweep with Jolt's default 10 velocity iterations shows 18 J (§6).
4. **Collider-fit details matter more than the solver for what you see.**
   - Bone-line capsules left the calf 2–3 cm in the turf.
   - The original abdomen box was fitted to only 66 vertices.
   - The original thigh radius was 13.5 cm, and the head sphere was too small.
   - Percentile windows, torso height slices and centroid axes fixed each of these. The remaining 2.4 cm is the deliberate interior margin (§14.1).
5. **A starting pose can start "outside" a limit without looking wrong.** Drop B's raised arm began at the shoulder's limit and stayed in violation for 5.3 s until it was moved 10° inside. Every drop is now checked for self-overlap before release, and limit violations are measured from step 0.
6. **More position iterations are not monotonically better.** 2 → 4 halved the limit transients, but 4 → 8 raised the energy gain from 2.6 J to 7.2 J.

---

## Evidence and files

**Evidence (`review_artifacts/physical_character_v1/gate_a/`):**

- `contact_sheet.jpg`: A, B, C, D and E at key frames and at rest.
- `stills/`:
  - `A1_start_mesh+phys`, `A2_0.55s_mesh+phys`, `A3_rest_physics`
  - `B1_0.16s_hip_contact`, `B2_0.20s_propagation_physics`, `B3_rest_mesh`
  - `C1_0.25s_mesh+phys`, `C2_0.45s_physics`
  - `D1_0.35s_mesh+phys`, `D2_0.6s_physics_top`
  - `E1_0.45s_mesh+phys`, `E2_worst_limit_physics`, `E3_rest_mesh`
- `gatea_final_240x1.json` / `.log`: full per-drop summaries, worst frames, contact order and hashes.
- `config_sweep.txt`: the §6 comparison.

**Code (`sandbox/visual/physchar/`, all untracked):**

| file | role |
|---|---|
| `pc_math.js` | Float64 V/Q, deterministic trig, swing–twist, hash |
| `pc_body.js` | body spec: de Leva, collider fit, joints, materials |
| `pc_jolt.js` | the only Jolt-aware file (adapter) |
| `pc_fit.js` | mesh-from-physics skinning |
| `pc_gatea.js` | drops, measurement, summary |
| `pc_harness.js` + `index.html` | the review harness |
| `vendor/` | the pinned Jolt build |
| `tools/` | Node runners |
| `results/` | the suite and sweep outputs |

**Reproduce the suite** (one Node process, sequential):

```
cd "…/physical-character-v1/sandbox/visual/physchar"
node tools/gatea_run.js --drops A,B,C,D,E --tsc 240x1 --world '{"hingeSoftHz":20,"velSteps":30,"posSteps":4}' --mesh --repeat 3 --order --why --out results/gatea_final_240x1.json
node tools/gatea_run.js --spec          # body / collider / joint dump
node tools/config_sweep.js              # §6 table
```

**Not done, as instructed:** Gate B, motors, animation targets, Reference Tackle reproduction, a second character, fast-limb collision, production integration, commits and pushes.

**Preserved and untouched:** touchline-current, Reference Tackle V1 and `RT_export()`, the Reference Tackle cache, the rear-contact and follow-through work, the defence experiments, and the substrate spikes.

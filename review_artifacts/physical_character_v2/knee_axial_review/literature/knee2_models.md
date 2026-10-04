# How authoritative models represent knee axial (tibial internal/external) rotation, and what that means for a real-time physics knee

Prepared 2026-10-04. Scope: tibial internal/external (IE, "axial") rotation and how it couples to flexion, in OpenSim musculoskeletal models, higher-DOF knee models, MuJoCo/MyoSuite, and physics-based character humanoids. It closes with options for a 240 Hz rigid-body character.

**Tag legend**
- [FT] = I read the full text, or the actual model/source file.
- [ABS] = abstract only.
- [SEC: x] = taken from secondary source x.
- [FIG] = read off a figure.
- [DERIVED] = my own computation from tagged inputs.
- [RECALLED — unverified] = from memory, not checked.

Every model-file number below was parsed from the raw files downloaded from GitHub. Local copies are in `scratchpad/lit/osim/`.

**Sign conventions used throughout (right knee unless stated).**
- Flexion is positive.
- IR = internal tibial rotation, positive. Add = adduction/varus, positive.
- I checked the axis directions for each file by recomputing its frames (see §1.3).

---

## (a) Summary table

| Model | Knee DOFs (tibiofemoral) | How tibial axial rotation is handled | Coupling function (numbers) | Source / tag |
|---|---|---|---|---|
| **Delp 1990 → gait2392 / gait2354 / gait10dof18musc / Hamner 2010 full-body / SoccerKickingModel** | 1 (`knee_angle_r`, range −120°…+10°; flexion is negative) | **Locked.** IE rotation (`rotation2`, axis y) and ab/adduction (`rotation3`, axis x) are `Constant 0`. | Only sagittal translations are coupled: tibia origin x (anterior) and y (superior) are SimmSplines of knee angle. Example: y = −0.4226 m at −120° and −0.3966 m at −10°. This is the Yamaguchi & Zajac (1989) planar knee. | .osim files [FT]; OpenSim Gait 2392/2354 docs [FT] |
| **Arnold et al. 2010 lower-limb model** | 1 (flexion, 0–100° as stated in the paper) | **Coupled** to flexion with the Walker et al. 1988 equations (AP and ML translation, IE and varus/valgus rotation). | Same IE and varus/valgus functions as Rajagopal, per Lai 2017 [FT]. I did not read the .osim, which is on SimTK, not GitHub. | Arnold 2010 [FT]; Lai 2017 [FT] |
| **Rajagopal et al. 2016 ("walker_knee_r")** | 1 (`knee_angle_r`, 0–120°, clamped) | **Coupled** (tibia-fixed axis, applied after flexion and adduction). | IR rises from 0 at 0° to 15.06° at 110°, with slope 0.34°/° near extension. Adduction peaks at 1.92° at 50°. Translations are ≤ 1.6 mm (superior) and ≤ 6.8 mm (anterior). Full table in §(b) B1. | Rajagopal2016.osim [FT]; Rajagopal 2016 paper [FT] |
| **Rajagopal2015_opensense** | 1 | Coupled. Splines are identical to Rajagopal2016; translations are scaled ×0.99284 (MultiplierFunction). | As B1 | .osim [FT] |
| **Lai, Arnold & Wakeling 2017 → LaiUhlrich2022 (OpenCap) / RajagopalLaiUhlrich2023** | 1 (`knee_angle_r`, 0–140°) | **Coupled.** IE and adduction are polynomials in radians that reproduce the Walker 1988 equations exactly. Translations were refit and now act along all 3 axes. | IR(q) = 0.36950 q − 0.16948 q² + 0.025166 q³ (rad). Gives 15.06° at 110° and 14.79° at 140°. Table in §(b) B2. | LaiUhlrich2022.osim and RajagopalLaiUhlrich2023.osim [FT]; Lai 2017 [FT] |
| **Lerner et al. 2015 (medial/lateral contact model)** | 1 plus a fixed, subject-specific frontal-plane alignment | **Locked.** Sagittal tibial and patellar kinematics are identical to Delp's; the model adds alignment and compartment bodies for contact forces. | None for IE | Lerner 2015 [FT] |
| **Lenhart et al. 2015 / Smith & Thelen COMAK (OpenSim-JAM), right knee** | **6** (flex −10…160°, add ±50°, rot ±50°, translations ±0.2 m), plus a 6-DOF patellofemoral joint | **Free.** IE is resisted only by 76 ligament elements (`Blankevoort1991Ligament`) and elastic-foundation cartilage contact. | No prescribed coupling. Ligament stiffness per bundle (N/strain): ACL 820 (12 bundles), PCLal 900, PCLpm 300, MCL 500, LCL 600, popliteofibular (PFL) 440, posterior capsule 500, ITB 10000. Transition strain is 0.06 by default. | lenhart2015.osim [FT]; Blankevoort1991Ligament.h [FT]; Lenhart 2015 [FT] |
| **Same lenhart2015.osim, left knee** | 1 | **Coupled** splines; the file does not say where they came from. | IR = 2.71° at 10° and 11.36° at 120°. Add (varus) = 4.0° at 120°. Table B5. | .osim [FT] |
| **COMAK-IK passive-sweep coupling (JAM walking example)** | 1 (built automatically from the 6-DOF knee) | **Coupled.** Splines come from a forward simulation in which flexion is prescribed and the secondary coordinates are free. | IR = +1.84° at 11°, then −4.38° (external) at 71.5° and −4.93° at 104.5°. Varus = 5.1° at 104.5°. Table B6. | ik_constrained_model.osim [FT]; COMAKInverseKinematicsTool.h [FT] |
| **Marra et al. 2015 (AnyBody, force-dependent kinematics, FDK)** | 11 (6 tibiofemoral + 5 patellofemoral). Flexion is driven; the other 10 are solved quasi-statically. | **Free (quasi-static).** Set by ligament springs and rigid-rigid contact equilibrium; force residual < 0.3 N. Compared against a hinge knee. | None prescribed | Marra 2015 [ABS]; Marra thesis [FT] |
| **AnyBody TLEM 2.0-based models (e.g. Halonen 2017)** | Either a hinge (1 DOF tibiofemoral, 1 DOF patellofemoral) or FDK (11 DOF) | Hinge: none. FDK: free. | The hinge was chosen "due to its lower computational cost". | Halonen 2017 [FT] |
| **Xu, Bloswick & Merryweather 2015 (OpenSim)** | 6: 3 rotations + ML translation independent; AP and proximodistal translations tied to flexion | **Free**, resisted by 10 ligament elements (ACL, PCL, MCL, LCL) | — | [ABS] |
| **Blankevoort et al. 1988 / Blankevoort & Huiskes 1991** | Experiment: a 6-DOF rig, treated conceptually as a 2-DOF mechanism (flexion + tibial rotation). Model: 6-DOF ligament + contact. | **Envelope.** The IE limits are defined at ±3 N·m of tibial torque. | Screw-home is "not an obligatory effect of the passive joint characteristics, but a direct result of the external loads". | [ABS] ×2 |
| **Wilson, Feikes & O'Connor 1998; Feikes 2003 (parallel-mechanism knee)** | 1 (spatial parallel mechanism: 2 articular contacts + isometric ACL, PCL and MCL fascicles = 5 constraints) | **Coupled, emerging from anatomy.** The mechanism predicts IR and ab/adduction coupled to flexion. | Numbers not in the abstracts | [ABS] ×2 |
| **MyoSuite MyoLegs (MuJoCo; converted from Rajagopal)** | 5 joints (flexion + 2 slides + 2 hinges); 4 are slaved to flexion | **Coupled through MuJoCo equality constraints** (`<joint polycoef>`, quartic). solimp = 0.9999 0.9999 0.001 0.5 2, i.e. nearly rigid. | rotation3: 0.369499 x − 0.169478 x² + 0.0251643 x³ (Walker). Range ±0.2628 rad. Timestep 1 ms. | myolegs_chain.xml and myolegs_assets.xml [FT]; myoconverter CustomJoint.py [FT] |
| **DeepMimic humanoid3d** | 1 (revolute) | None | Limits [−3.14, 0] rad; torque limit 150 N·m; PD gains Kp 500, Kd 50 | humanoid3d.txt and humanoid3d_ctrl.txt [FT] |
| **AMP / IsaacGymEnvs amp_humanoid** | 1 (hinge) | None | Range 0–160°; stiffness 300; damping 30; armature 0.02; gear 100; timestep 0.00555 s | amp_humanoid.xml [FT] |
| **MuJoCo humanoid.xml** | 1 (hinge) | None | Range −160…+2°; gear 80; fixed "hamstring" tendon couples hip and knee | humanoid.xml [FT] |
| **dm_control CMU humanoid (2020)** | 1 (hinge `rtibiarx`) | None | Range 0.01–2.967 rad; gear 80 | humanoid_CMU_V2020.xml [FT] |
| **PHC SMPL humanoid (static asset)** | 3 hinges | **Free but tiny range.** Knee_y (≈ long axis, since the model is y-up) is limited to ±5.625°; zero passive stiffness. | Flexion axis ±180°; the other two ±5.625° | smpl_humanoid.xml [FT] |
| **MASS (Lee et al. 2019, 284 muscles)** | 1 (revolute) | None | Range 0–2.3 rad | human.xml [FT] |

---

## (b) Numeric coupling tables, read from the model files

### B0. How OpenSim composes a coupled CustomJoint (needed to reproduce the tables)

- OpenSim builds a `CustomJoint` from Simbody's `FunctionBased` mobilizer.
  - Simbody computes **R_FM = R(s1, a1) · R(s2, a2) · R(s3, a3)**, with all three axes given in the parent joint frame F. That is a **body-fixed (intrinsic) sequence**.
  - Simbody computes **p_FM = s4·a4 + s5·a5 + s6·a6** in F.
  - Source: Simbody `MobilizedBodyImpl.h`, `FunctionBasedImpl::calcMobilizerTransformFromQ` [FT code].
  - That OpenSim passes `rotation1..3` and `translation1..3` to Simbody in file order is [RECALLED — unverified]. The MyoSuite conversion supports it: its MuJoCo joints appear in the same order.
- In the Rajagopal walker knee both offset frames have orientation (−1.64157, 1.44618, 1.5708), a body-fixed XYZ rotation. Recomputing that rotation gives the joint axes in the femur frame (x anterior, y superior, z right/lateral) [DERIVED]:
  - joint **x** (flexion) = (0.000, −0.071, −0.998). This points medially, about 4° off the pure mediolateral axis.
  - joint **y** (axial) = (−0.124, 0.990, −0.070).
  - joint **z** = (0.992, 0.124, −0.009), pointing anterior.
- So walker_knee = **Rx(flex) · Rz(add(flex)) · Ry(IR(flex))**. This matches a Grood–Suntay sequence: femur-fixed flexion, a floating middle axis, tibia-fixed axial rotation.
- I checked the directions [DERIVED]: positive rotation3 turns the tibia's anterior face medially (IR), and positive rotation2 moves the distal tibia medially (varus).
- The MyoLegs axes match these vectors exactly: knee_angle_r axis (−3.98e-10, −0.0707, −0.9975); rotation3 (−0.1243, 0.9898, −0.0702) [FT].
- OpenSim `PolynomialFunction` coefficients run from **highest to lowest power** (PolynomialFunction.h [FT]).
- MuJoCo `polycoef` runs **a0…a4, ascending**, giving y − y0 = Σ aᵢ (x − x0)ⁱ (MuJoCo XMLreference [FT]).

### B1. Rajagopal 2016 walker_knee_r: SimmSpline knots (in the file at 10° spacing), checked against Walker 1988

| Flex (°) | rotation3 (rad) | **IR (°)** | Walker RI eq. (°) | rotation2 (rad) | **Add/varus (°)** | Walker RV eq. (°) | t1 along joint y (mm) | t2 along joint z (mm) | dIR/dflex (°/°) |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.34 |
| 10 | 0.059461 | 3.41 | 3.41 | 0.012681 | 0.73 | 0.73 | 0.48 | 0.99 | 0.31 |
| 20 | 0.109399 | 6.27 | 6.27 | 0.022697 | 1.30 | 1.30 | 0.84 | 1.90 | 0.26 |
| 30 | 0.150618 | 8.63 | 8.63 | 0.029605 | 1.70 | 1.70 | 1.09 | 2.73 | 0.21 |
| 40 | 0.183920 | 10.54 | 10.54 | 0.033205 | 1.90 | 1.90 | 1.25 | 3.49 | 0.17 |
| 50 | 0.210107 | 12.04 | 12.04 | 0.033535 | 1.92 | 1.92 | 1.35 | 4.17 | 0.13 |
| 60 | 0.229983 | 13.18 | 13.18 | 0.030878 | 1.77 | 1.77 | 1.39 | 4.78 | 0.10 |
| 70 | 0.244350 | 14.00 | 14.00 | 0.025755 | 1.48 | 1.48 | 1.40 | 5.30 | 0.07 |
| 80 | 0.254012 | 14.55 | 14.55 | 0.018929 | 1.08 | 1.08 | 1.40 | 5.76 | 0.04 |
| 90 | 0.259770 | 14.88 | 14.88 | 0.011407 | 0.65 | 0.65 | 1.40 | 6.13 | 0.02 |
| 100 | 0.262428 | 15.04 | 15.04 | 0.004433 | 0.25 | 0.25 | 1.42 | 6.43 | 0.01 |
| 110 | 0.262788 | 15.06 | 15.06 | −0.000505 | −0.03 | −0.03 | 1.48 | 6.65 | 0.00 |
| 120 | 0.261654 | 14.99 | 14.99 | −0.001678 | −0.10 | −0.10 | 1.60 | 6.79 | −0.01 |

Columns 2, 5, 8 and 9 are [FT] from Rajagopal2016.osim. The IR, add and dIR/dflex columns are [DERIVED]. The Walker-equation columns are [DERIVED] from the equations in B3.

What the table shows:
- **Screw-home size:** 3.41° of external rotation over the last 10° of extension, 6.27° over the last 20°, and 8.63° over the last 30°.
- **Peak IR:** analytically 15.06° at about 107° [DERIVED: root of dRI/dθ].
- **Translations act along joint y and z only.** They are small (≤ 6.8 mm) because Rajagopal moved the joint frames to "anatomic approximations of the center of rotation" [FT paper].

### B2. Lai 2017 lineage (LaiUhlrich2022 / RajagopalLaiUhlrich2023): PolynomialFunction coupling, evaluated [DERIVED from FT coefficients]

Coefficients (highest power first; q in rad; outputs in rad or m):
- rotation2 (add, joint z): 0.0108321, −0.0252183, −0.0328478, 0.0791000, −1.47e-08
- rotation3 (IR, joint y): 0.0251658, −0.169480, 0.369499, −4.43e-08
- translation1 (joint **x**): 1.5904e-4, −1.01515e-3, 1.81751e-3, 2.6414e-5, −7.75e-7
- translation2 (joint y): −5.7969e-4, 5.07977e-3, −1.144238e-2, 3.93691e-3, −2.52e-5
- translation3 (joint z): 1.208087e-3, −4.453611e-3, 6.11649e-4, 6.265430e-3, −1.46e-5

| Flex (°) | Add (°) | **IR (°)** | tx, joint x/ML (mm) | ty, joint y/SI (mm) | tz, joint z/AP (mm) |
|---|---|---|---|---|---|
| 0 | 0.00 | 0.00 | 0.00 | −0.03 | −0.01 |
| 10 | 0.73 | 3.41 | 0.05 | 0.34 | 1.07 |
| 20 | 1.30 | 6.27 | 0.19 | 0.16 | 2.08 |
| 30 | 1.70 | 8.63 | 0.38 | −0.42 | 2.89 |
| 40 | 1.90 | 10.54 | 0.60 | −1.26 | 3.43 |
| 50 | 1.92 | 12.04 | 0.82 | −2.26 | 3.66 |
| 60 | 1.77 | 13.18 | 1.05 | −3.31 | 3.56 |
| 70 | 1.48 | 14.00 | 1.25 | −4.32 | 3.12 |
| 80 | 1.08 | 14.55 | 1.42 | −5.21 | 2.39 |
| 90 | 0.65 | 14.88 | 1.56 | −5.92 | 1.43 |
| 100 | 0.25 | 15.04 | 1.66 | −6.38 | 0.32 |
| 110 | −0.03 | 15.06 | 1.73 | −6.57 | −0.83 |
| 120 | −0.10 | 14.99 | 1.76 | −6.46 | −1.88 |
| 130 | 0.17 | 14.89 | 1.77 | −6.03 | −2.65 |
| 140 | 0.88 | 14.79 | 1.77 | −5.28 | −2.96 |

- **Rotations:** converting Walker's degree polynomials to radians gives exactly the file's coefficients [DERIVED]:
  - IR: 0.3695, −2.958e-3 × 57.2958 = −0.16948, 7.666e-6 × 57.2958² = 0.025166.
  - Add: 0.0791, −0.032848, −0.025219, 0.010832.
  - This matches Lai's statement that "varus/valgus and internal/external rotations … are identical in all three models" (Arnold, Rajagopal, Lai) [FT].
- **Translations differ from Rajagopal's.**
  - Lai: "the translations of the tibia in our refined model are generally greater than those specified in Rajagopal et al.'s model when the knee is flexed more than about 60°" [FT].
  - The femur-side joint frame also moved, from Rajagopal's (−0.00809, −0.40796, −0.00275) m to (−0.0045, −0.4096, −0.00175) m [FT, both files].
  - Above 120° the IR is a polynomial extrapolation of Walker's 0–120° fit [DERIVED].

### B3. Walker, Rovick & Robertson 1988: the source equations

As reproduced by Asker et al. 2025, citing Walker 1988 [SEC: Asker 2025]. θ = flexion in degrees; valid for θ ∈ [0°, 120°]; rotations in degrees, translations in mm.

- **R_I (internal rotation)** = 0.3695 θ − 2.958×10⁻³ θ² + 7.666×10⁻⁶ θ³
- **R_V (varus)** = 0.0791 θ − 5.733×10⁻⁴ θ² − 7.682×10⁻⁶ θ³ + 5.759×10⁻⁸ θ⁴
- **D_PD (proximal–distal)** = −0.0683 θ + 8.804×10⁻⁴ θ² − 3.750×10⁻⁶ θ³
- **D_AP (anterior–posterior)** = −0.1283 θ + 4.796×10⁻⁴ θ²

Evaluated [DERIVED]:

| Flex (°) | D_PD (mm) | D_AP (mm) |
|---|---|---|
| 0 | 0.00 | 0.00 |
| 30 | −1.36 | −3.42 |
| 60 | −1.74 | −5.97 |
| 90 | −1.75 | −7.66 |
| 120 | −2.00 | −8.49 |

How much to trust this:
- The R_I and R_V equations match the Rajagopal spline knots to 0.01° at all 13 knots (B1) and match the Lai polynomial coefficients exactly (B2). That makes the secondary transcription effectively verified [DERIVED].
- The D_PD and D_AP direction conventions are only as Asker states them [SEC]; Rajagopal re-referenced the translations, so they are not comparable.
- **Data origin.**
  - Walker 1988 itself is "a computer model of 23 knees … obtained by embedding, slicing and digitizing" [ABS].
  - Asker says the average-knee model comes from Walker et al. 1985 (14 cadavers + 8 volunteers) and was refined in Walker 1988 [SEC: Asker 2025].
  - I could not retrieve the Walker 1985 or 1988 full texts.

### B4. gait2392 / gait2354 / Hamner / gait10dof18musc knee translation splines

Translations of the tibia origin in the femur frame [FT]. In these files knee_angle is negative in flexion; the coordinate range is −120° to +10°.

| Spline | Knots (deg = rad × 57.3) | Values (m) |
|---|---|---|
| translation1 (x, anterior) | −120, −100, −80, −60, −40, −20, −10, +11.3, +19.3, +28.1, +87.2, +120 | −0.0032, 0.00179, 0.00411, 0.0041, 0.00212, −0.001, −0.0031, −0.005227, −0.005435, −0.005574, −0.005435, −0.00525 |
| translation2 (y, superior) | −120, −70, −30, −20, −10, +9.1, +120 | −0.4226, −0.4082, −0.399, −0.3976, −0.3966, −0.395264, −0.396 |
| rotation2 (y, IE) / rotation3 (x, add) | — | **Constant 0** |

- Knots above +10° lie outside the coordinate range.
- SoccerKickingModel uses the same knee scaled: translation2 = −0.4960 m at −120°.
- leg39 frees the two translations as independent coordinates (`tib_tx_r`, `tib_ty_r`) [FT].

### B5. lenhart2015.osim, **left** knee (1-DOF coupled)

Converted to the right-knee sign convention [DERIVED]. I assumed the left-leg frames follow the OpenSim convention (z points to the subject's right, i.e. medially for the left leg), so a negative rotation about y = IR and a negative rotation about x = varus.

| Flex (°) | IR (°) | Varus (°) | tx (mm) | ty (mm) | tz (mm) |
|---|---|---|---|---|---|
| −10 | −3.26 | −0.29 | −1.65 | −404.0 | 0.83 |
| 0 | 0.00 | 0.00 | 0.00 | −404.4 | 1.27 |
| 10 | 2.71 | 0.35 | 1.54 | −405.5 | 1.71 |
| 20 | 4.92 | 0.73 | 2.80 | −407.1 | 2.13 |
| 30 | 6.67 | 1.11 | 3.66 | −409.1 | 2.51 |
| 40 | 8.03 | 1.47 | 4.02 | −411.3 | 2.85 |
| 50 | 9.03 | 1.80 | 3.81 | −413.8 | 3.13 |
| 60 | 9.75 | 2.08 | 3.03 | −416.2 | 3.36 |
| 70 | 10.25 | 2.32 | 1.69 | −418.4 | 3.54 |
| 80 | 10.58 | 2.54 | −0.13 | −420.4 | 3.68 |
| 90 | 10.80 | 2.77 | −2.36 | −421.9 | 3.78 |
| 100 | 10.96 | 3.06 | −4.85 | −423.0 | 3.85 |
| 110 | 11.13 | 3.44 | −7.50 | −423.6 | 3.90 |
| 120 | 11.36 | 4.01 | −10.15 | −423.6 | 3.92 |

- The model's credits say it was built on the Arnold model; the file does not say where these left-knee splines came from.
- They do not match Walker: 2.71° vs 3.41° at 10°, and 11.4° vs 15.0° at 120°.
- They include 10° of hyperextension, during which the tibia rotates 3.3° **externally**.

### B6. Coupling produced by COMAK-IK's passive sweep of the 6-DOF Lenhart right knee (JAM walking example)

Splines are knee_rot_r(flex), knee_add_r(flex) and knee_tx/ty/tz(flex), stored as CoordinateCouplerConstraints. IR is positive about +y; the femur_distal_r and tibia_proximal_r frames have zero orientation offsets.

| Flex (°) | IR (°) | Varus (°) | tx (mm) | ty (mm) | tz (mm) |
|---|---|---|---|---|---|
| 0 | 0.52 | −0.17 | 1.82 | 0.22 | −0.27 |
| 11.0 | **1.84** | 0.57 | 3.30 | 0.51 | −0.88 |
| 22.0 | 1.15 | 1.16 | 3.45 | 0.20 | −1.75 |
| 33.0 | −0.56 | 1.76 | 1.88 | 0.30 | −2.50 |
| 44.0 | −2.29 | 2.48 | 2.32 | −0.45 | −2.46 |
| 55.0 | −3.66 | 2.97 | 3.04 | −2.15 | −2.26 |
| 66.0 | −4.35 | 3.41 | 3.27 | −4.48 | −2.20 |
| 77.0 | −4.22 | 4.23 | 2.58 | −6.32 | −1.38 |
| 88.0 | −3.68 | 4.58 | 1.32 | −7.63 | −1.10 |
| 104.5 | **−4.93** | 5.11 | −1.07 | −8.81 | −1.05 |

Read this as a demonstration of **model and load-condition dependence**, not as a validated passive path:
- The tool documentation says its settling step locks the primary coordinates, applies no external loads, and sets muscles to 0.02 × F_max [FT]. I did not find the exact sweep conditions (gravity, posture).
- The sign is opposite to Walker beyond about 30° of flexion.
- Wilson 2000 reports that "internal tibial rotation with flexion was always observed" in 15 unloaded cadaver knees [ABS].

### B7. Comparison: in vivo coupling during treadmill walking (Koo & Koo 2019)

Their regression [ABS], with y = tibial **external** rotation (°) and x = flexion (°):
- **swing:** y = −0.002 x² + 0.19 x − 0.64
- **stance:** y = −0.19 x − 1.22

Converted to IR and set against Walker [DERIVED]:

| Flex (°) | Stance IR (°) | Swing IR (°) | Walker IR (°) |
|---|---|---|---|
| 0 | 1.22 | 0.64 | 0.00 |
| 10 | 3.12 | −1.06 | 3.41 |
| 20 | 5.02 | −2.36 | 6.27 |
| 40 | (extrapolated) 8.82 | −3.76 | 10.54 |
| 60 | (extrapolated) 12.62 | −3.56 | 13.18 |

- In stance the tibia rotates internally with flexion at 0.19°/°, about half Walker's initial slope.
- In swing, the abstract's equation means the tibia rotates *externally* with flexion [DERIVED from ABS].

---

## (c) Sections 1–4

### 1. OpenSim models

**1.1 Delp 1990 lineage (gait2392, gait2354, gait10dof18musc, Hamner 2010, SoccerKickingModel).**
- Tibial IE rotation is **locked, not coupled.** In every file the IE and ab/adduction TransformAxes are `Constant 0` [FT].
- Only the tibia origin's x and y translations follow the knee angle (B4).
- The documentation says the planar Yamaguchi & Zajac (1989) knee was adopted "in order to calculate the extensor moment arm of the knee in a computationally inexpensive way". It describes the model as "single-degree-of-freedom … in the sagittal plane". Its contact point follows Nisell (1986). Seth removed the patella "to avoid kinematic constraints" [FT doc].
- Lerner 2015 kept these sagittal kinematics and added a constant frontal-plane alignment plus medial/lateral compartment bodies, so IE stays locked [FT]. Their result: each 1° of alignment change shifted the first peak of medial contact force by 51 N [ABS].

**1.2 Arnold 2010 → Rajagopal 2016 → Lai 2017 (the "Walker knee").**
- Arnold 2010: "The knee included one degree of freedom (flexion/extension) and used the equations reported by Walker et al. for the derived translations and rotations (anterior/posterior and medial/lateral translation and internal/external and varus/valgus rotation) … tested by comparing the moment arms of knee muscles to those measured in cadaver subjects" [FT].
- Rajagopal 2016 [FT]:
  - "single degree of freedom … coupled rotation and translation of the tibia relative to the femur was parameterized by the knee flexion angle using the joint kinematic equations defined by Walker et al., modified such that the joint reference frame on each body was coincident with anatomic approximations of the center of rotation"; range 0–120°.
  - The discussion credits this parameterization with "better estimat[ing] both the anatomical center of rotation … and the patellar force transmission … [which] allows for estimation of knee joint contact forces".
- Lai 2017 extended the range to 140° for pedalling and running and reconciled a translation "discrepancy" between Arnold and Rajagopal; rotations were left identical [FT].
- The reference all three papers cite is Walker PS, Rovick JS, Robertson DD (1988) *J Biomech* 21(11):965–974, "The effects of knee brace hinge design and placement on joint mechanics" (reference metadata in all three PMC records [FT]).
- **Coupling values:** B1–B3. IR rises 0→15° from 0→~107°, steepest near extension (0.34°/°), which is the screw-home. Varus is ≤ 1.9°.

**1.3 The axis-direction check was necessary.** In the walker knee the axial axis is the tibia-fixed joint y, tilted about 8° from femoral vertical in the reference pose. The flexion axis is tilted about 4°. If you copy the tables, you need these frames (B0).

### 2. Higher-DOF knee models and simulation humanoids

- **Lenhart 2015 / COMAK (Thelen lab, OpenSim-JAM).**
  - Structure: 6-DOF tibiofemoral and 6-DOF patellofemoral joints; 14 ligament bundles meshed as 76 elements; elastic-foundation cartilage contact. The model was built from MRI [FT].
  - Ligament law (`Blankevoort1991Ligament`) [FT code]:
    - F = 0 for ε < 0
    - F = (k / 2ε_t) ε² for 0 ≤ ε ≤ ε_t
    - F = k(ε − ε_t/2) for ε > ε_t
    - damping c·ε̇ only while stretched and lengthening (default c = 0.003 N·s/strain)
    - ε_t defaults to 0.06; the code notes that other literature uses 0.03.
  - Model laxity: "A 5 Nm internal rotation moment induced internal tibial rotation angles ranging from 10° to 22° across the 90° of knee flexion considered, while external rotation moments induced rotations of 9°–18°." These are consistent with cadaver data [FT].
  - "Anterior tibial translation and internal tibial rotation exhibited the greatest variability when uncertainties in ligament properties were considered" [FT].
  - COMAK separates *prescribed*, *primary* and *secondary* coordinates and solves the secondary ones (IE, add, translations) inside the optimization [FT code; Smith 2019 ABS].
  - COMAK-IK can also **generate a 1-DOF coupled knee** from the 6-DOF model by a passive sweep (B6) [FT code].
- **Marra 2015 (AnyBody FDK).**
  - Two knee versions: a hinge, and 11 DOF (tibiofemoral + patellofemoral) solved by force-dependent kinematics [ABS].
  - From the thesis [FT]: knee flexion is driven; the remaining 10 DOFs are found by quasi-static equilibrium with residual < 0.3 N; 17 ligament spring bundles (no ACL in that TKA subject); rigid–rigid contact.
  - Total, medial and lateral contact forces were "highly similar" between hinge and FDK. Secondary kinematics in a leg swing were better with FDK: Sprague & Geers combined error C = 0.06 vs 0.34 for the hinge [ABS].
- **AnyBody TLEM 2.0 models (Halonen 2017):** hinge or 11-DOF FDK; the hinge was used where cost mattered [FT].
- **Blankevoort & Huiskes 1991:** a 3-D ligament model with ligament–bone wrapping (MCL). Wrapping affected valgus restraint, but "the effect … on the internal-external rotation laxity … was negligible" [ABS].
- **MyoSuite MyoLegs (MuJoCo):** a direct port of the Rajagopal walker knee.
  - Every dependent spatial axis becomes its own joint, slaved to `knee_angle_r` by a quartic `<equality><joint polycoef>` [FT].
  - myoconverter fits a quartic to each OpenSim spline ("We can't model the relationship between two joints using a spline, but we can try to approximate it with a quartic function") [FT code].
  - IE is therefore a constraint, not a DOF. solimp 0.9999/0.9999 makes it essentially rigid; integration step 1 ms [FT].
- **Physics-character humanoids.**
  - DeepMimic, AMP (IsaacGymEnvs), the MuJoCo humanoid, the dm_control CMU humanoid and MASS all use a **1-DOF knee hinge with no axial DOF** [FT files]. Ranges: 0–160° (AMP), −160…2° (MuJoCo), 0–180° (DeepMimic), 0.6–170° (CMU), 0–132° (MASS).
  - The PHC SMPL asset gives the knee 3 hinges but limits the two non-flexion axes to ±5.625° with zero stiffness [FT].
  - None of these files encode screw-home coupling or axial laxity.

### 3. How the models justify their choices, and what locking, coupling or freeing does

**Stated justifications**
- **Cost and simplicity.**
  - Yamaguchi & Zajac's knee was chosen to compute the extensor moment arm "in a computationally inexpensive way" (gait2392 doc) [FT].
  - Gait2354 reduced the muscle count "to improve simulation speed" [FT doc].
  - AnyBody studies use the hinge "due to its lower computational cost" [FT].
  - FDK knee run times: 13.6 min (reference contact model) or 4.5 min (surrogate) for one 1.2-s gait trial (146 frames). Rising from a chair: 70.3 min vs 27.2 min [FT thesis].
  - Lenhart: FE knee models "remain computationally challenging to solve within the context of a multibody simulation of gait", and "computing coordinated muscle actions needed to control six DOF joints remains challenging" [FT].
- **Accuracy where it matters for each model.**
  - The Walker coupling was kept for knee muscle moment arms (Arnold) and for joint-centre and contact-force estimation (Rajagopal) [FT].
  - Dumas 2012: more DOFs raised musculo-tendon and joint-reaction forces, with some redistribution between muscles. They concluded "a five-degree-of-freedom lower-limb musculo-skeletal model with some angle-dependent joint coupling and stiffness seems to provide satisfactory" outputs [ABS].
  - Valente 2015: "The model including more degrees of freedom showed more discrepancies in predicted muscle activations compared to measured muscle activity". Peak knee-force differences between joint models reached 2.40 BW. "Joint model complexity should be set according to the imaging dataset available and the intended application" [ABS].

**Consequences of LOCKING tibial rotation** (gait2392 lineage; plain-hinge character humanoids)
- All transverse-plane knee moment goes into the joint reaction; no tissue or actuator carries it [DERIVED from the joint definition].
  - The model therefore cannot express the internal-torque pathway to ACL loading.
  - In a validated 3-D knee model, "neither [valgus nor internal rotation moment alone] caused ACL strain >0.077", while combined moments raised peak ACL strain to 0.105 (Shin 2011) [ABS].
  - In FE knees, larger internal rotation torque increased ACL force through the posterior tibial slope and lateral-plateau contact (Navacchia 2019) [ABS].
- In inverse kinematics, transverse-plane knee motion has to be absorbed elsewhere, at hip rotation or the ankle.
  - Kainz 2016 found joint-angle differences up to 13° between a clinical direct-kinematics model and gait2392. 94.4% of the difference came from anatomical models and joint constraints, and only 2.7% from the IK-vs-direct-kinematics method itself [ABS].
- Muscle-force effects are modest for monoarticular muscles but larger for biarticular ones.
  - Mokhtarzadeh 2014 (1-DOF vs 3-DOF knee, single-leg hop): sagittal and transverse angles matched within RMS < 3°. Biarticular muscles (hamstrings, rectus femoris, gastrocnemius) differed more. "Care must be taken in interpreting the magnitude of force predicted in the biarticular muscles and the soleus, especially when using a 1 DOF knee" [ABS].

**Consequences of COUPLING** (Walker knee; MyoLegs)
- **What it reproduces:** the passive screw-home path, plausible moment arms, and better joint-centre placement [FT].
- **What it cannot reproduce:**
  - Load-dependent deviation. Lenhart: "secondary kinematics are not simple functions of knee flexion". Gait produced "external rotation through load acceptance, internal rotation through toe-off, followed by external tibia rotation during much of swing", which "differed considerably from what would be assumed based a constrained one DOF knee model created from the passive motion results" [FT].
  - In vivo coupling also changes between stance and swing (Koo & Koo 2019, B7) [ABS].
- **The passive-path debate:**
  - Blankevoort 1988 treats the knee as a 2-DOF flexion + rotation mechanism bounded by an envelope (±3 N·m) and calls screw-home load-driven [ABS].
  - Wilson 2000 counters that, with truly minimal resistance, IE is coupled to flexion. Flexing and extending paths differed by < 2°, and "when released after being displaced, the femur … sprang back" [ABS].
  - The two are consistent if the coupled path is the **neutral line inside an envelope** [DERIVED synthesis].
- **Rigidity:** a hard coupling makes IE infinitely stiff. Axial torque at the foot (cutting, planting, tackles) is then passed entirely to the hip and ankle, and reacted by the constraint, with no compliance.

**Consequences of FREEING** (6-DOF with ligaments and contact, FDK/COMAK)
- **Gains:** load-dependent secondary kinematics (Marra C 0.06 vs 0.34) and ligament and contact loads [ABS; FT].
- **Costs:**
  - IE becomes the DOF most sensitive to ligament parameters (Lenhart) [FT].
  - It needs articular contact plus ligaments to be well posed.
  - It adds large compute (above).
  - It gives little benefit for total contact force (Marra) [ABS].
- **Freeing without restraints is not viable** [DERIVED]: every free-DOF model above restrains IE with ligament springs or contact. Simulation humanoids that free a non-flexion knee axis (PHC) clamp it to ±5.6° instead.

### 4. Reduced-order formulations that keep (a) screw-home, (b) flexion-dependent laxity, (c) end-range stiffening

| Formulation | (a) Screw-home | (b) Laxity(flex) | (c) End-range stiffening | Real-time suitability | Field precedent |
|---|---|---|---|---|---|
| **1-DOF Walker-coupled knee** (Arnold/Rajagopal/Lai; MyoLegs) | Yes (B1–B3) | No (zero laxity) | n/a | Excellent; MyoLegs runs it at 1 kHz in MuJoCo | Standard in OpenSim gait models [FT] |
| **Parallel-mechanism 1-DOF** (Wilson 1998 / Feikes 2003 / Parenti-Castelli group) | Yes, emerging from geometry | No | n/a | Needs an iterative constraint solve; Feikes' method was "forty times faster than the original algorithm" [ABS]; singularities and "locking" are possible | Research models; multi-body optimization (Gasparutto 2015: only marginal gains over a spherical joint) [ABS] |
| **"Envelope" 2-DOF** (flexion + tibial rotation; limits defined at ±3 N·m) | Neutral path inside the envelope | Yes, by definition | Implied by the limits | Good | Blankevoort 1988 concept [ABS]; Dumas 2012 "angle-dependent coupling and stiffness" [ABS] |
| **Coupled neutral + compliant axial DOF** (soft version of the MyoLegs equality constraint) | Yes (neutral = Walker R_I) | Yes, via the torque law | Yes, via the torque law | Good. One extra DOF and one 1-D torque law. | Closest published analogues: MyoLegs equality constraint (stiff), Dumas 2012 (coupling + stiffness), Xu 2015 (free IE + ligament springs) |
| **Ligament-spring 6-DOF** (Blankevoort law; COMAK/FDK) | Emerges (model-dependent, see B6) | Emerges (Lenhart: ±5 N·m gives 10–22° IR, 9–18° ER) | Emerges (ligament toe → linear) | Poor for 240 Hz games: needs contact surfaces and many stiff springs; usually quasi-static (FDK) or offline (COMAK) | Lenhart 2015, Marra 2015 [FT] |
| **6-DOF → 1-DOF reduction** (COMAK-IK passive sweep) | Yes, model-derived | No | n/a | Offline generation, cheap at runtime | OpenSim-JAM [FT code] |

**Anchor numbers for a compliant axial DOF** (all tagged; laxity magnitudes deserve their own literature pass):
- **Neutral path:** R_I(θ) from B3, or the 13 knots in B1.
- **Laxity versus flexion:**
  - Lenhart's model under ±5 N·m: IR 10°→22°, ER 9°→18° across 0–90° [FT].
  - Roth 2015 (±3 N·m, 10 cadaver knees): compared with 0°, laxity at 45° flexion was larger by IR +10.2° ± 2.7° and ER +10.1° ± 2.0°; at 90°, by IR +10.0° ± 4.6° and ER +10.1° ± 4.5° [ABS].
  - Roth 2015 (JOR): the IE limits vary between knees by more than 3.6° and are largely uncorrelated with the other limits [ABS].
- **Stiffness and its dependence on muscle activity (in vivo):**
  - Louie & Mote 1987: torsional stiffness 0.16–2.54 N·m/° depending on which muscles were active; "increases in joint stiffness of over 400%" [ABS].
  - Shoemaker & Markolf 1982: at up to ±10 N·m, tibial rotation was about half of foot rotation, which matters when you calibrate against foot-twist data; ligament failure torque was similar to maximal voluntary isometric twisting torque [ABS].
  - Mills & Hull 1991: axial moments couple into varus/valgus (external → varus); ER > IR at 15° flexion but not at 60° [ABS].
- **End-range shape precedent:** ligament force rises quadratically in the toe region up to ε_t (0.03–0.06 strain), then linearly. A torque law shaped the same way (zero inside the envelope, quadratic toe, then linear) imitates bundle recruitment [DERIVED from FT code].
- **Implications for a 240 Hz step** [DERIVED]:
  - Axial inertia of shank + foot about the tibial long axis in the unscaled Rajagopal model is about **0.0185 kg·m²** (tibia alone 0.0051).
  - With I = 0.0185: k = 145 N·m/rad (≈ 2.54 N·m/°) gives ω ≈ 89 rad/s and ω·Δt ≈ 0.37 at 240 Hz.
  - k = 1500 N·m/rad gives ω·Δt ≈ 1.19. With I = 0.0051 the same stiffness gives ω·Δt ≈ 2.26, which breaks the explicit-integration limit of 2.
  - So stiffen the end range with an implicit/joint-space spring or a hard limit constraint, not an explicit stiff torque, especially on the unloaded swing shank.

---

## (d) Recommendation: the simplest defensible formulation for a real-time physics player

**What the field uses as its "simplest defensible" knee:** the **1-DOF Walker-coupled knee**. Arnold 2010, Rajagopal 2016 and Lai 2017 all use it in OpenSim, and MyoLegs uses it in MuJoCo. Its IE neutral is R_I(θ) = 0.3695θ − 2.958e-3θ² + 7.666e-6θ³ (degrees), 0→15° over 0→107°. Character-animation humanoids go simpler still: a plain hinge with no axial DOF.

**What I recommend for your character** (meets requirements a–c and stays within published practice): **a flexion hinge plus one compliant axial hinge whose neutral is Walker-coupled.**

1. **Kinematics.**
   - Order: flexion about the femoral knee axis, then axial rotation q_a about the tibia's long axis.
   - This is the Rajagopal order (Rx → [Rz] → Ry, B0) with varus/valgus dropped; Walker's varus is ≤ 1.9°.
   - Translations: ignore, or prescribe from B1. They are ≤ 7 mm and matter mainly for moment arms.
2. **Neutral path.** Set θ₀(φ) = Walker R_I(φ), clamped to φ ∈ [0, 120°].
   - Hold the end value beyond 120° (the Lai polynomial changes by only 0.3° up to 140°).
   - For hyperextension, decide explicitly: extrapolate the slope of about 0.34°/° (Lenhart's left-knee splines show −3.3° at −10°), or hold 0.
3. **Passive torque on the deviation Δ = q_a − θ₀(φ).**
   - A soft or near-zero zone whose half-width w(φ) grows from extension to mid-flexion; anchors are Lenhart and Roth above.
   - Then a quadratic toe, then a linear region (the Blankevoort-law shape).
   - Plus damping.
   - Plus a hard limit constraint at the envelope edge.
   - Muscle co-contraction can raise effective stiffness by more than 4× (Louie & Mote), which your finite actuators could supply.
4. **Make the coupling conservative.**
   - If the spring is U(Δ), it also exerts a flexion torque τ_φ = −∂U/∂φ = +U′(Δ)·θ₀′(φ), with θ₀′ up to 0.34 near extension.
   - Leaving this term out, which is what happens if you only retarget an axial drive to θ₀(φ), adds or removes energy whenever the knee flexes under axial load [DERIVED].

**Pros**
- Reproduces the cadaver screw-home exactly (identical to Rajagopal, Lai and MyoLegs).
- Gives load-dependent IE deviation, as Lenhart's gait simulation and Koo & Koo's in vivo stance/swing differences show is needed.
- Gives axial compliance for cutting and planting instead of passing everything to the hip and ankle.
- Matches Blankevoort's 2-DOF envelope view and Dumas's recommendation of "angle-dependent coupling and stiffness".
- Costs one DOF and one 1-D torque law.
- At 240 Hz it is stable for realistic stiffness if the end range uses implicit or constraint limits.

**Cons and risks**
- Laxity and stiffness parameters vary between knees (Roth: limits uncorrelated) and depend on load. No published reduced-order model provides a validated (θ, Δ) → torque surface; you would assemble it from laxity studies.
- No varus/valgus or translational laxity, and no axial-to-varus coupling (Mills & Hull).
- No ligament-specific loads (ACL/MCL), so injury mechanics are only qualitative.
- The coupled neutral is a passive, unloaded construct. Under load the true IE path changes, even reversing sign in swing (Koo & Koo) or in some 6-DOF passive sweeps (B6). The compliant DOF exists to absorb exactly that, but the gameplay meaning of "neutral" is a modelling choice.
- In maximal-coordinate engines the coupled-neutral spring needs a custom joint motor or constraint. In reduced-coordinate engines it is a joint-space spring.

---

### Sources (all URLs)

**Model files and code [FT]**
- gait2392: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Gait2392_Simbody/gait2392_thelen2003muscle.osim
- gait2354: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Gait2354_Simbody/gait2354_simbody.osim
- gait10dof18musc: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Gait10dof18musc/gait10dof18musc.osim
- Hamner 2010: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Hamner/FullBodyModel_Hamner2010_v2_0.osim
- leg39: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Leg39/leg39.osim
- SoccerKick: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/SoccerKick/SoccerKickingModel.osim
- Rajagopal2016: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Rajagopal/Rajagopal2016.osim
- RajagopalLaiUhlrich2023: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Rajagopal/RajagopalLaiUhlrich2023.osim
- Rajagopal2015_opensense: https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Rajagopal_OpenSense/Rajagopal2015_opensense.osim
- LaiUhlrich2022 (OpenCap): https://raw.githubusercontent.com/stanfordnmbl/opencap-core/main/opensimPipeline/Models/LaiUhlrich2022.osim
- lenhart2015: https://raw.githubusercontent.com/clnsmith/opensim-jam/master/models/lenhart2015/lenhart2015.osim
- JAM COMAK-IK output: https://raw.githubusercontent.com/clnsmith/opensim-jam/master/opensim-jam-release/examples/walking/results/comak-inverse-kinematics/ik_constrained_model.osim
- Blankevoort1991Ligament.h: https://github.com/clnsmith/opensim-jam/blob/master/src/Blankevoort1991Ligament.h
- COMAKTool.h: https://github.com/clnsmith/opensim-jam/blob/master/src/COMAKTool.h
- COMAKInverseKinematicsTool.h: https://github.com/clnsmith/opensim-jam/blob/master/src/COMAKInverseKinematicsTool.h
- Simbody FunctionBasedImpl: https://github.com/simbody/simbody/blob/master/Simbody/src/MobilizedBodyImpl.h
- OpenSim PolynomialFunction.h: https://github.com/opensim-org/opensim-core/blob/main/OpenSim/Common/PolynomialFunction.h
- MyoLegs: https://github.com/MyoHub/myo_sim/blob/main/myo_sim/models/leg/assets/myolegs_chain.xml and https://github.com/MyoHub/myo_sim/blob/main/myo_sim/models/leg/assets/myolegs_assets.xml
- myoconverter: https://github.com/MyoHub/myoconverter/blob/main/myoconverter/xml/joints/CustomJoint.py
- MuJoCo XML reference: https://github.com/google-deepmind/mujoco/blob/main/doc/XMLreference.rst
- MuJoCo humanoid: https://github.com/google-deepmind/mujoco/blob/main/model/humanoid/humanoid.xml
- dm_control CMU humanoid: https://github.com/google-deepmind/dm_control/blob/main/dm_control/locomotion/walkers/assets/humanoid_CMU_V2020.xml
- DeepMimic: https://github.com/xbpeng/DeepMimic/blob/master/data/characters/humanoid3d.txt and https://github.com/xbpeng/DeepMimic/blob/master/data/controllers/humanoid3d_ctrl.txt
- AMP: https://github.com/isaac-sim/IsaacGymEnvs/blob/main/assets/mjcf/amp_humanoid.xml
- PHC: https://github.com/ZhengyiLuo/PHC/blob/master/phc/data/assets/mjcf/smpl_humanoid.xml
- MASS: https://github.com/lsw9021/MASS/blob/master/data/human.xml

**Papers and docs**
- OpenSim Gait 2392/2354 doc [FT]: https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53086215/Gait+2392+and+2354+Models
- Rajagopal 2016 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5507211/
- Arnold 2010 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC2903973/
- Lai 2017 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5989715/
- Lerner 2015 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4330122/
- Lenhart 2015 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4886716/
- Walker, Rovick & Robertson 1988 [ABS]: https://pubmed.ncbi.nlm.nih.gov/3253283/ (https://doi.org/10.1016/0021-9290(88)90135-2)
- Asker et al. 2025, reproducing the Walker equations [SEC]: https://eprints.whiterose.ac.uk/id/eprint/224223/ (https://doi.org/10.1177/09544062251313926)
- Blankevoort 1988 [ABS]: https://pubmed.ncbi.nlm.nih.gov/3182875/
- Blankevoort & Huiskes 1991 [ABS]: https://pubmed.ncbi.nlm.nih.gov/1921352/
- Wilson 1998 [ABS]: https://pubmed.ncbi.nlm.nih.gov/9882045/
- Wilson 2000 [ABS]: https://pubmed.ncbi.nlm.nih.gov/10768395/
- Feikes 2003 [ABS]: https://pubmed.ncbi.nlm.nih.gov/12485647/
- Gasparutto 2015 [ABS]: https://pubmed.ncbi.nlm.nih.gov/25655463/
- Marra 2015 [ABS]: https://pubmed.ncbi.nlm.nih.gov/25429519/
- Marra thesis [FT]: https://repository.ubn.ru.nl/bitstream/handle/2066/201897/201897.pdf
- Halonen 2017 [FT]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5727195/
- Xu 2015 [ABS]: https://pubmed.ncbi.nlm.nih.gov/24611807/
- Hast & Piazza 2013 [ABS]: https://pubmed.ncbi.nlm.nih.gov/23445058/
- Smith 2019 COMAK [ABS]: https://pubmed.ncbi.nlm.nih.gov/30420173/
- Mokhtarzadeh 2014 [ABS]: https://pubmed.ncbi.nlm.nih.gov/25129166/
- Valente 2015 [ABS]: https://pubmed.ncbi.nlm.nih.gov/26506255/
- Dumas 2012 [ABS]: https://pubmed.ncbi.nlm.nih.gov/22468466/
- Kainz 2016 [ABS]: https://pubmed.ncbi.nlm.nih.gov/27139005/
- Koo & Koo 2019 [ABS]: https://pubmed.ncbi.nlm.nih.gov/31017635/
- Shin 2011 [ABS]: https://pubmed.ncbi.nlm.nih.gov/21266934/
- Navacchia 2019 [ABS]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6790148/
- Roth 2015 JBJS [ABS]: https://pubmed.ncbi.nlm.nih.gov/26491132/
- Roth 2015 JOR [ABS]: https://pubmed.ncbi.nlm.nih.gov/26218329/
- Louie & Mote 1987 [ABS]: https://pubmed.ncbi.nlm.nih.gov/3584153/
- Mills & Hull 1991 [ABS]: https://pubmed.ncbi.nlm.nih.gov/1918091/
- Shoemaker & Markolf 1982 [ABS]: https://pubmed.ncbi.nlm.nih.gov/7056775/

**Not obtained, so no numbers from them**
- Full texts of Walker 1985 (J Rehabil Res Dev 22:9–22), Walker 1988 and Blankevoort 1988. Envelope widths are therefore not quoted from Blankevoort.
- The Arnold 2010 and original Lai-Arnold 2017 .osim files (on SimTK; LaiUhlrich2022 was used as the descendant).
- Delp 1990 full text.
- Sancisi & Parenti-Castelli papers.
- AnyBody AMMR knee source.
- The IsaacGym rule that MJCF stiffness/damping become PD drive gains is [RECALLED — unverified].

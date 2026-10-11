<!-- Compiled 11 Oct 2026 by a research subagent of the PPR-1 session. Sources were checked against PubMed records (title, authors, journal, volume, pages, DOI), PMC/open full texts, or publisher PDFs where available. Where only an abstract was read, this is stated. Labels are defined in §0. -->

# Pre-reflex body response, 0–120 ms after an unexpected leg impact

Literature review for PPR-1. The question: when a slide tackle sweeps the planted right heel and shank from behind, what in the first 0–120 ms comes from **(A) passive mechanics** and **(B) muscle activation that already existed before impact**, as opposed to **(C) collision-triggered neural responses**? The subject is a simulated 73 kg, ~1.8 m footballer built from rigid bodies with torque actuators.

This review builds on ABI-1 (`abi1/research/BALANCE_LITERATURE.md`) and does not repeat it. ABI-1 already covers:

- intrinsic ankle stiffness in quiet stance (§1.1);
- the knee/hip/trunk data gap (§1.2);
- reflex latencies (§2);
- automatic postural responses and electromechanical delay (EMD) (§3);
- joint torque capacity and rate of torque development (§10);
- the latency table (§12).

Those findings are cited as "ABI-1 §x".

---

## 0. Conventions

**Evidence labels:**

| Label | Meaning |
|---|---|
| **[M]** | Measured in the cited study. The population and conditions are given. |
| **[R]** | From a review or compilation, or a parameter of a published model (marked "model"). |
| **[E]** | My extrapolation or arithmetic. The derivation is shown. |
| **[D]** | Would be a design choice for the simulator, not a literature value. |

**How each source was read:**

- **[abstract]**: only the abstract was read.
- **[full text]**: the open full text was read directly.
- **[summary tool]**: numbers came from the open full text through an automated page summariser and were not re-read line by line.

**Units and reference values:**

- Joint units are SI: N·m/rad, N·m·s/rad, ms. 1 N·m/deg = 57.3 N·m/rad.
- **mgh** = 73 × 9.81 × 0.94 ≈ **670 N·m/rad**. This is the gravitational "toppling" stiffness of the whole body about the ankles, i.e. both legs together (ABI-1 §0.1).

**Corrections to the brief:**

- **De Groote, Allen & Ting 2017** was published in *J Biomech* 55:71–77, not in *PLoS Comput Biol* (PMID 28259465).
- **"Cui et al."** is *J Biomech* 41:1945–1952 (2008).

---

## 1. Bottom line for the simulator

1. **Short-range stiffness (SRS) is real, it scales with force, and it is immediate. For this tackle it is also used up almost at once.**
   - Fibre-level elastic limit:
     - ≈0.5–1 % of optimal fibre length in active fibres [M]: 7.7 nm per half-sarcomere ≈ 0.57 % l_opt in Getz et al. 1998; ≈0.5 % L0 in Campbell & Moss 2000.
     - ~0.2–0.4 % in relaxed muscle [M].
   - Joint-level equivalent, with a rigid tendon: **≈0.3–0.8°** at ankle, knee and hip, and ≈1–3° at elbow and shoulder [E, §2.6].
   - A compliant tendon in series raises the ankle figure to ≈0.4–4.6°, depending on the SRS gain assumed [E].
   - The boot drives the leg at ~6–13 rad/s, so the SRS limit is passed within **≈3–10 ms** [E, §2.7].
2. **After the elastic limit, already-active muscle behaves like a yielding force source, not a spring.**
   - Force plateaus near **~1.5–2 × the pre-stretch isometric force** in fast-stretched, highly activated fibres [M: Lombardi & Piazzesi 1990, 1.9–2 T0; Getz 1998, plateau ≥2–3.3 P0].
   - At **low stimulation rates** (postural tone), tension during sustained stretch can **fall below isometric**, i.e. it yields [M: Joyce, Rack & Westbury 1969, cat soleus at 5–15 pulses/s].
   - Rack & Westbury 1974 describe the beyond-limit resistance as "frictional".
3. **Every intrinsic resistance scales with pre-impact activation.**
   - Isolated joints, stretches of 1–12° over ~60 ms: incremental stiffness ≈ **3–5 N·m/rad per N·m of background torque** [M: Blanpied & Smidt 1992, ankle, 4.30 ± 0.34; Franklin & Milner 2003, shoulder/elbow, ≈3.0–3.1].
   - Weiss et al. 1988: K proportional to torque from rest to MVC [M].
   - In **stance** the ankle is **tendon-limited**: muscle is ~15× stiffer than tendon, so ankle stiffness rises only weakly with torque [M: Sakanaka et al. 2018].
4. **Sub-degree intrinsic ankle stiffness in stance is ≈0.6–0.95 mgh. It falls to ≈0.44–0.58 mgh at 1–5°** [M: Sakanaka 2021, Vlutters 2015; see ABI-1 §1.1].
   - A series muscle-SRS + Achilles-tendon model with published parameters reproduces 0.56–1.53 mgh [E, §3.3]. This is a useful sanity check for the implementation.
5. **Knee and hip intrinsic stiffness under load in stance remains a data gap** (as ABI-1 found). The best proxies:
   - walking quasi-stiffness: knee **284 ± 78 N·m/rad** [M]; hip ≈ **320–335 N·m/rad** with large SD [M];
   - swing-phase impedance: hip 34–66 N·m/rad, knee 0–3.5 N·m/rad [M];
   - seated knee quasi-stiffness at 85 % MVIC, 0–4°: ≈335–370 N·m/rad scaled to 73 kg [E from M; inertia-contaminated];
   - passive knee: ≈90 N·m/rad at full extension, ≈10 N·m/rad at 20°, 2–5 N·m/rad at 30–60° [E from the Riener & Edrich equation].
6. **Trunk intrinsic stiffness without reflexes is low.**
   - ≈**109 N·m/rad** mean in flexion, damping up to ~10 N·m·s/rad [M: Brown & McGill 2009].
   - Effective stiffness with reflexes: 785–2200 N·m/rad [M: Cholewicki et al. 2000].
   - Passive lumbar flexion stiffness: ≈19–135 N·m/rad from neutral to end range [R: Watt 2022].
7. **There are two damping regimes, and they must not be mixed.**
   - Small-signal system identification gives ankle B ≈ **0.7–1.8 N·m·s/rad** [M/R].
   - Large, fast stretches of active muscle give force-velocity "damping" one to two orders larger, and it saturates [E, §5.2]. Small-signal B values must not be used for a violent sweep.
8. **Activation cannot add force fast.**
   - Model activation time constants: 10–15 ms up, 40–50 ms down [R model].
   - Voluntary normalized rate of force development (RFD) in the first 50 ms: 2.8–4.9 MVC/s [M], i.e. ~14–24 % MVC at 50 ms after EMG onset.
   - Any new neural command arrives no earlier than ~40 ms after impact (short-latency reflex EMG). Collision-triggered torque therefore starts at ~50–60 ms at the earliest (ABI-1 §12). Excluding (C) until 120 ms is a **[D]** that slightly understates human reflex torque in the 50–120 ms window.
9. **For an unseen tackle from behind, no anticipatory co-contraction is justified.** Pre-impact activation should be whatever the current task (stance or running) requires.
   - When perturbations are anticipated, humans raise pre-activation, e.g. +24–76 % EMG in the 50 ms before landing on an expected hard surface [M: Moritz & Farley 2004].
   - Surprises are handled passively at first: leg mechanics changed within 52 ms, before any EMG change at 68–188 ms [M].
10. **Modelling literature agrees intrinsic properties act as zero-delay feedback but are insufficient alone.**
    - Muscle properties reduce perturbation effects with zero delay [M/R: van Soest & Bobbert 1993; Haeufle 2010; van der Krogt 2009; De Groote 2017].
    - SRS-augmented Hill models still over-predict joint motion in 0–100 ms. With SRS, angles were about half of up to 5° (at 50 ms) and 15° (at 100 ms), versus measured <0.12° and <1° [M/R: De Groote 2017].
    - Intrinsic trunk stiffness alone cannot stabilise the spine [M: Brown & McGill 2009; Moorhouse & Granata 2007].

---

## 2. Muscle short-range stiffness (SRS)

### 2.1 Phenomenon and mechanism

- **Hill 1968** (*J Physiol* 199:637–684). Relaxed frog/toad sartorius has a "short-range elastic component" (SREC).
  - It acts only for length changes up to **≈0.2 % of muscle length** (the "elastic limit").
  - Beyond it, tension is "maintained at a fixed level, producing a sort of frictional resistance" [M, abstract]. It is attributed to long-lived attached cross-bridges.
- **Rack & Westbury 1974** (*J Physiol* 240:331–350). Tetanized cat soleus and lateral gastrocnemius [M, abstract].
  - Small movements, or the first part of larger ones, are resisted by a steep SRS "which did not persist as the movement continued". Beyond it the muscle "became more compliant".
  - SRS was **independent of velocity unless the movement was very slow**, though "it lasted for more of a fast movement than of a slow one".
  - Within the short range, behaviour is "essentially elastic". With larger amplitudes "the muscle met the movement with a frictional resistance".
  - Attributed to cross-bridge elasticity.
  - The numerical extent of the short range (mm) was **not extracted**: only the abstract was available as text.
- **Joyce, Rack & Westbury 1969** (*J Physiol* 204:461–474). Cat soleus, constant-velocity stretch [M, abstract]:
  - High stimulation rates: tension during lengthening always rose above isometric.
  - **Low rates (5–15 pulses/s): tension rose at the start of the stretch, then fell later in the movement, often below the isometric tension.** Vibration >0.1 mm also reduced tension far below isometric at low rates.
  - This is the basis for "yield" in weakly activated muscle.

### 2.2 Magnitude: proportional to force

- **Cui, Perreault, Maas & Sandercock 2008** (*J Biomech* 41:1945–1952; PMID 18499113) [summary tool].
  - Six feline lower-hindlimb muscles, 2 mm stretches at 100 mm/s, SRS measured "before the onset of yielding".
  - **SRS was linear in force, K_M = γ·P / l_F, with a uniform γ = 23.4 (±2.4, jackknife)** [M, cat]. K_M is muscle stiffness, P is force, l_F is optimal fibre length.
  - Prediction error was <30 % for all muscles, and <8 % without EDL.
  - Tendon modelled as K_T = E·A/l_T with E = 522 MPa (EDL 1114 MPa) [M, cat].
- **Campbell & Moss 2000** (*J Physiol* 525:531–548) [M, abstract]. Initial stiffness **scaled with developed tension** across Ca²⁺ activation, in permeabilised rabbit psoas fibres.
- **Campbell 2010 review** (*Adv Exp Med Biol* 682:223–246) [R, summary tool]. "Initial stiffness … increases in proportion with isometric force" as Ca²⁺ rises.
- **Getz, Cooke & Lehman 1998** (*Biophys J* 75:2971–2983; PMID 9826617) [M, abstract]. Glycerinated rabbit psoas, ramp stretches at 0.1–3 L/s.
  - Force rose in two phases. The transition came at a **critical stretch L_C = 7.7 ± 0.1 nm per half-sarcomere, independent of velocity**.
  - **Force at the transition rose with velocity up to 1 L/s, then held at 3.26 ± 0.06 × isometric.**
- **De Groote et al. 2017** converted Getz's data into a whole-muscle model [M parameters from fibres → R model] (§10.1):
  - **F_SRS = γ·F_M0·a·f_L(l̃)·Δl̃**, for 0 < Δl̃ < δ;
  - **γ = 280**; **δ = 5.7 × 10⁻³** (normalized critical stretch, from 7.7 nm on a 1.35 µm half-sarcomere);
  - F_SRS is held at γ·F_M0·a·f_L·δ beyond δ, and is 0 during shortening.
  - They note γ = 280 is "about ten times higher" than Cui's whole-muscle-tendon value. They "were unable to reproduce [inverse dynamics] torques using the previously reported value".
  - Implied force increment at the limit: γδ ≈ **1.6 × the active isometric force** [E: 280 × 0.0057 = 1.60]. This matches their statement that SRS "rapidly increases force to at least twice the pre-stretch isometric force, followed by a force plateau" [full text].
- **Barrett et al. 2024** (*PLoS One* 19:e0307977) [R/model, summary tool].
  - Argues SRS behaves like a **Maxwell element** (spring in series with a dashpot), not a pure spring.
  - Theoretical dimensionless gain q ≈ **240–560**, versus the 1–40 used in spine models.
  - In their erector-spinae inverted-pendulum simulations, SRS "cannot be solely responsible for joint stability, even for modest perturbations".

**Interpretation [E].**

- Cui's γ ≈ 23 is fitted on whole muscle-tendon units in situ. It already contains aponeurosis compliance and sarcomere non-uniformity.
- De Groote's γ = 280 is a fibre-level value.
- For a model with an explicit compliant tendon, the fibre-level value is the consistent choice. For a joint-level lumped spring, γ ≈ 20–40 is closer to what whole muscles show.

### 2.3 The elastic limit

| Preparation | Elastic limit | Label |
|---|---|---|
| Relaxed frog/toad whole muscle | ≈0.2 % of muscle length | [M] Hill 1968 |
| Relaxed frog fibres | ≈0.4 % L0 | [M] Campbell & Lakie 1998, *J Physiol* 510:941–962 |
| Active permeabilised rabbit psoas | "first 0.005 L0" (0.5 %) | [M] Campbell & Moss 2000 |
| Active glycerinated rabbit psoas | 7.7 nm/half-sarcomere ≈ 0.57 % l_opt (at 2.7 µm sarcomere) | [M] Getz 1998; conversion by De Groote 2017 |
| Active frog fibres, fast lengthening | Peak at 10–14 nm/half-sarcomere, steady after ~20 nm/hs | [M] Lombardi & Piazzesi 1990, *J Physiol* 431:141–171. ≈0.9–1.3 % at ~1.1 µm half-sarcomere [E] |
| Review | "stretched further than ~1 % of its initial length" | [R] Campbell 2010 |

**Working range [E]:** δ ≈ **0.5–1.0 % of optimal fibre length** for active fibres.

### 2.4 Behaviour after the limit

- **Plateau.**
  - Edman, Elzinga & Noble 1978 (*J Physiol* 281:139–155) [M, abstract]: force rose to a plateau during stretch whose level "was dependent upon the velocity of stretch, was independent of the amplitude". Residual force enhancement persisted after stretch.
  - Lombardi & Piazzesi 1990 [M, abstract]: steady tension during lengthening rose with speed up to 0.25–0.4 µm/s per half-sarcomere, reaching **1.9–2 × T0**, and barely increased beyond that. At higher speeds tension overshot the steady level, peaking at 10–14 nm/hs.
- **Slight drop to a plateau.** Campbell & Moss 2002 (*Biophys J* 82:929–943) [M, abstract]: "tension rose sharply during the initial phase … before dropping slightly to a plateau".
- **Yield below isometric** at low stimulation rates: Joyce et al. 1969 (§2.1).
- **"Frictional" resistance**, i.e. lengthening tension above shortening tension: Rack & Westbury 1974; Hill 1968.

**Synthesis [E].** Beyond δ, a well-activated fibre behaves like a velocity-saturating force source near 1.5–2 × its active isometric force. A weakly activated, slowly firing muscle may give little or no enhancement and can yield. In vivo, which regime applies at postural activation levels is **not established** (gap §13).

### 2.5 History dependence and recovery

- **Relaxed muscle.** Campbell & Lakie 1998 [M, abstract]: a first stretch reduces the SREC response to a second stretch (thixotropy). The biphasic response is clearest on the first movement after a period at fixed length.
- **Active fibres.** Campbell & Moss 2000 [M, abstract]:
  - a second triangular length change shortly after the first gives a reduced initial stiffness, and a third matches the second;
  - **recovery runs at ≈1 s⁻¹ (τ ≈ 1 s)**;
  - the relative thixotropic reduction is independent of activation level.
  - Temperature was not extracted. Skinned-fibre experiments usually run below body temperature, so in vivo recovery may be faster [E, not verified].
- **Effect of Ca²⁺.** Campbell & Moss 2002 [M, abstract]: the rates of stiffness and tension recovery **increase with Ca²⁺ activation**.
- **In humans.** Axelson & Hagbarth 2001 (*J Physiol* 535:279–288) [M, abstract]:
  - after rest, only the first passive wrist movement showed clear SRS, and mechanical agitation markedly reduced it;
  - the CNS appears to compensate for this history-dependent stiffness.
  - Review: Lakie & Campbell 2019 (*J Appl Physiol* 126:1790–1799) [R].
- **Recovery time.** Campbell 2010 [R]: full recovery is shown within ~7 s intervals in one figure.

**Implication [E/D].**

- A footballer **standing still** has full SRS.
- In **running**, support-leg muscles cycle through length changes every stride, so SRS at impact may be partly depleted. How much depends on whether the muscle was near-isometric in the preceding ~100+ ms. No data were found for this (gap).
- Treat SRS availability as a scenario parameter [D].

### 2.6 Joint-angle equivalent of the elastic limit [E]

**Rigid-tendon lower bound.** Joint rotation needed to stretch fibres by δ·l_opt:

> Δθ = δ·l_opt / (r·cos α)

where r is the moment arm and α the pennation angle.

- **Optimal fibre lengths and pennation** are from the OpenSim Rajagopal 2016 model, whose architecture comes from Ward et al. 2009 cadaver and MRI data. Arm values are from the OpenSim Arm26 model. Values were read from the model files [R model].
- **Moment arms** are typical values I assumed [D]: Achilles 5 cm; TA 4 cm; patellar 4.5 cm; hamstrings 3 cm at the knee and 6.5 cm at the hip; gluteus maximus 7 cm; gluteus medius 5 cm; iliacus 5 cm; biceps 4 cm; brachialis 2.5 cm; triceps 2 cm; deltoid 2.5 cm; erector spinae 5.5 cm.

| Muscle (joint) | l_opt (m) | α (°) | Δθ at δ = 0.57 % | Δθ at δ = 1 % |
|---|---|---|---|---|
| Soleus (ankle) | 0.044 | 21.9 | 0.31° | 0.54° |
| Gastrocnemius medialis (ankle) | 0.051 | 9.5 | 0.34° | 0.59° |
| Tibialis anterior (ankle) | 0.068 | 11.2 | 0.57° | 1.00° |
| Vastus lateralis (knee) | 0.099 | 14.5 | 0.75° | 1.31° |
| Vastus medialis (knee) | 0.097 | 24.2 | 0.77° | 1.35° |
| Rectus femoris (knee) | 0.076 | 12.4 | 0.56° | 0.99° |
| Biceps femoris long head (knee only) | 0.098 | 10.1 | 1.08° | 1.89° |
| Biceps femoris long head (hip only) | 0.098 | 10.1 | 0.50° | 0.87° |
| Semimembranosus (hip) | 0.069 | 14.6 | 0.36° | 0.63° |
| Gluteus maximus, mid (hip extension) | 0.157 | 21.0 | 0.78° | 1.38° |
| Gluteus medius (hip abduction) | 0.073 | 18.1 | 0.50° | 0.88° |
| Iliacus (hip flexion) | 0.107 | 16.0 | 0.72° | 1.27° |
| Biceps brachii long head (elbow) | 0.116 | 0 | 0.94° | 1.66° |
| Brachialis (elbow) | 0.086 | 0 | 1.12° | 1.97° |
| Triceps lateral (elbow) | 0.114 | 9.0 | 1.88° | 3.30° |
| Deltoid (shoulder; l_opt 0.10–0.14 m, **not verified**) | ~0.12 | 0 | ~1.6° | ~2.8° |
| Erector spinae (lumbar; fascicle length 0.05–0.20 m, **not verified**) | 0.05–0.20 | 0 | 0.3–1.2° | 0.5–2.1° |

**Adding the series tendon (ankle example).** The muscle force increment at the limit, ΔF = γδ·F, also stretches the tendon by ΔF/k_T.

Inputs:

- Quiet stance: per-leg plantar-flexor torque ≈ 17 N·m (Sakanaka 2021: 5 % mgh ≈ 34 N·m for both legs [M]), so F ≈ 340 N.
- Fibre component: 0.27 mm.
- Tendon stiffness k_T = 145–231 N/mm (whole Achilles, interquartile range, Lichtwark & Wilson 2005 [M]). The free tendon alone is 759 N/mm (Magnusson 2003 [M]).

| SRS gain | ΔF at limit | Tendon stretch | Total joint rotation at limit |
|---|---|---|---|
| γ = 280 (De Groote) | 543 N | 2.4–3.7 mm (0.7 mm with the free-tendon k) | **3.0–4.6°** (1.1°) |
| γ = 23.4 (Cui) | 45 N | 0.20–0.31 mm | **0.53–0.67°** (0.38°) |

**Measured ankle amplitude-dependence [M]** (sits between the two variants):

- Passive calf: short-range stiffness for rotations <0.2° falls steeply to long-range by ~7° (Loram et al. 2007a; ABI-1 §1.1).
- Active stance (Sakanaka 2021): 94 % mgh at 0.2° versus 58 % mgh at 0.9°.
- Active stance (Vlutters 2015): 0.93 mgh at 0.29° falling to 0.44 mgh at 4.6°.
- Kearney & Hunter 1982 (*J Biomech* 15:753–756): K and B fall with displacement amplitude.

**Working value [E/D]:** ankle SRS "knee" ≈ **0.3–1°**, with a gradual fall to ~0.45 mgh by ~5°.

### 2.7 Relevance to this tackle [E]

- The boot moves the heel at ~6 m/s mean, ~12 g if constant acceleration (ABI-1 §0.1).
- That corresponds to segment angular rates of ~6.7 rad/s (whole leg about the hip, 0.9 m) to ~13 rad/s (shank about the knee, 0.45 m).
- If the foot reaches that speed over ~15 ms, angular acceleration ≈ 450–870 rad/s². A 1° (0.0175 rad) rotation is then reached in t = √(2θ/α) ≈ **6–9 ms**. At full speed it takes 1.3–2.6 ms.
- So in this scenario **SRS governs only the first few milliseconds and the first ~1° at each joint**.
- After that, the response comes from:
  1. the active muscles' force plateau or yield (§2.4, §5.2);
  2. passive tissue (§4.1);
  3. tendon elasticity (§6);
  4. segment inertia and contact.

---

## 3. Load-dependent intrinsic joint stiffness

### 3.1 Isolated joints (supine/seated, servo perturbations)

| Study | Conditions | Finding | Label |
|---|---|---|---|
| Hunter & Kearney 1982, *J Biomech* 15:747–752 | Ankle, stochastic perturbations | K (and B) rise with mean torque | [M] (ABI-1 §1.1; numbers not extracted) |
| Weiss, Hunter & Kearney 1988, *J Biomech* 21:539–544 | Ankle, supine, rest to MVC, stochastic | **"K increased in proportion to mean ankle torque … more than an order of magnitude"; ζ "almost invariant"** | [M, abstract] |
| Weiss, Kearney & Hunter 1986, *J Biomech* 19:727–735 | Relaxed ankle across range of motion | Passive torque small mid-range; at the extremes K is large and linear in passive torque | [M, abstract] |
| Kearney & Hunter 1982, *J Biomech* 15:753–756 | Ankle, varying amplitude | Low-frequency gain, K and B **fall with displacement amplitude**; I constant | [M, abstract] |
| Sinkjaer et al. 1988, *J Neurophysiol* 60:1110–1121 | Dorsiflexors; intrinsic stiffness isolated by nerve stimulation | Intrinsic stiffness **linear in torque, ≈0.5 → 2.5 N·m/deg (29 → 143 N·m/rad) at 80 % MVC**. Reflex share 0.5–1.5 N·m/deg at 30–50 % MVC, ≈0 at rest and at max | [M, abstract] |
| Blanpied & Smidt 1992, *J Biomech* 25:29–39 | Plantar flexors, prone, 20–60 % MVC, 0.2 rad (12°) rapid stretch, first **62 ms** | **Slope of stiffness vs pre-stretch torque = 4.30 ± 0.34 N·m/rad per N·m**. Stretch velocity effects were computational artefacts | [M, abstract] |
| Mirbagheri, Barbeau & Kearney 2000, *Exp Brain Res* 135:423–436 | Ankle, parallel-cascade identification | Intrinsic K rises monotonically with contraction. Reflex K peaks at low contraction (reflex share ~1–55 %) | [M] (ABI-1 §1.1) |
| Golkar, Sobhani Tehrani & Kearney 2017, *Front Comput Neurosci* 11:35 | Ankle, time-varying contractions, supine | Intrinsic elasticity monotonic with activation. Per-subject maxima 18–174 N·m/rad over a 0–40 % MVC sine (MVC 26–79 N·m). Simulation used I = 0.015 kg·m², B = 1.1 N·m·s/rad | [M] / [R model], full text |
| Clark & Franz 2019, *J Appl Biomech* 35:182–189 | Ankle quasi-stiffness, slow rotation | **24 (passive) → 154 (25 % MVC) → 213 N·m/rad (75 % MVC)**. Much more sensitive to activation onset than to further increases | [M, summary tool] |
| Franklin & Milner 2003, *Exp Brain Res* 152:211–220 | Arm, horizontal plane, up to 30 % MVC | **R_ss = 3.03·τ_s + 1.14·τ_e + 6.55; R_ee = 1.12·τ_s + 3.11·τ_e + 10.24 N·m/rad** (pooled; τ = joint torque magnitude, N·m) | [M, full text] |
| Gomi & Osu 1998, *J Neurosci* 18:8965–8978 | Arm, force regulation | Single-joint stiffness "roughly proportional to the torque of its own joint"; viscosity similar | [M, abstract] |
| Zhang & Rymer 1997, *IEEE TBME* 44:1192–1209 | Elbow, small random perturbations | Stiffness, viscosity and reflex gain rise with background torque; reflex share significant | [M, abstract] |

**Dimensionless form [E].**

- At muscle level, k = q·F / l (Bergmark 1989 notation; equivalent to Cui's γ).
- At joint level this becomes **K_joint ≈ q·τ·(r/l) ≈ q·τ·(r·cos α / l_opt)**.
- With r/l ≈ 0.4–1.1 (typical lower-limb values from §2.6), the measured isolated-joint slopes of **3–5 rad⁻¹** imply q ≈ 4–10.
- This matches the spine-modelling convention q ≈ 10 (range 0.5–50; Brown & McGill 2010, citing Crisco & Panjabi 1991 and Cholewicki & McGill 1995 [R]).
- It is far below the fibre SRS value (q ≈ 240–560 per Barrett 2024; γ = 280 per De Groote). The reason: these measurements span 1–12° over ~60 ms, i.e. mostly **beyond** the SRS limit, and they include tendon compliance.

### 3.2 In stance the ankle is tendon-limited

- **Loram & Lakie 2002** (ABI-1 §1.1): intrinsic stiffness 91 ± 23 % mgh, "increasing only slightly with ankle torque" [M].
- **Sakanaka et al. 2018** (*PLoS One* 13:e0193850) [M, summary tool]. 140 ms raised-cosine perturbations of 0.1/0.3/0.7°.
  - Ankle torque 4.9 ± 2.4 (vertical) → 16.4 ± 4.7 (normal) → 31 ± 5.7 N·m (maximal forward lean). Stiffness rose **≈30 % per condition**.
  - Passive dorsiflexion by a 15° toes-up tilt raised stiffness 50 → 77 % mgh (0.7°) and 77 → 109 % mgh (0.1°), while torque rose only ~4.8 N·m.
  - Conclusion: "in normal standing, the muscle is typically ~15 times stiffer than the tendon". The tendon is the limiting element.
- **Sakanaka, Lakie & Reynolds 2021** (*PLoS One* 16:e0244993) [M, summary tool]. 140 ms perturbations; stiffness from the first 70 ms.
  - Short-range (0.2°) **94.1 ± 21.6 % mgh** (range 40–134 %).
  - Long-range (0.9°) **57.9 ± 12.3 % mgh** (26–91 %).
  - Baseline torque ≈5 % mgh.
  - Long-range stiffness correlated strongly with baseline torque; short-range only weakly.
  - Estimated viscosity was larger for larger perturbations.
- **Vlutters et al. 2015** (*J Biomech* 48:1258–1263) [M, abstract]. 40 ms ramp-and-hold rotations of 0.005–0.08 rad, short enough to exclude reflexes: intrinsic ankle-foot stiffness **0.93 ± 0.09 → 0.44 ± 0.06 mgh**, falling with amplitude.
- **For this subject [E]:**
  - sub-degree: 0.64–0.94 mgh ≈ **430–630 N·m/rad** (both legs);
  - at 1–5°: ≈0.44–0.58 mgh ≈ **295–390 N·m/rad**.

### 3.3 Cross-check: a series SRS + tendon model reproduces stance values [E]

Per leg in quiet stance: F ≈ 340 N, l_opt = 0.044 m, α = 21.9°, r = 0.05 m.

- **Muscle joint stiffness:** K_m = γ·F·cos²α·r² / l_opt.
  - γ = 280: ≈ **4660 N·m/rad**.
  - γ = 23.4: ≈ **390 N·m/rad**.
- **Tendon joint stiffness:** K_T = k_T·r² = **362–578 N·m/rad** (k_T = 145–231 N/mm).
- **Series combination, both legs:**
  - γ = 280: 673–1028 N·m/rad = **1.00–1.53 mgh**.
  - γ = 23.4: 376–465 N·m/rad = **0.56–0.69 mgh**.
- Measured: **0.64–0.94 mgh**. The two published SRS gains bracket the data, and Sakanaka's "muscle ≈15 × tendon" favours the high-gain variant.
- Recommendation: **calibrate γ (or a lumped ankle spring) against 0.6–0.95 mgh for <0.5°**, rather than adopting either γ blindly [D].

---

## 4. Knee, hip, trunk, shoulder and elbow impedance

### 4.1 Passive moment–angle relations

- **Riener & Edrich 1999** (*J Biomech* 32:539–544; doi:10.1016/S0021-9290(99)00009-3) [M, abstract]. Double-exponential passive moments for hip, knee and ankle, with biarticular coupling, in 10 healthy subjects.
  - The original coefficients were not read this session. A secondary source gives the knee equation (φ in degrees, flexion positive):
    > M_K = exp(1.800 − 0.0352·φ_K − 0.0460·φ_A + 0.0217·φ_H) − exp(−3.971 + 0.0495·φ_K − 0.0004·φ_A − 0.0128·φ_H) + exp(2.220 − 0.150·φ_K) − 4.820
  - The secondary source is a search-engine excerpt citing Riener's patent US 8,108,190. The assignment of the 0.0352/0.0460 coefficients to the knee/ankle angles could not be verified.
  - Differentiating with hip = ankle = 0 [E]:

| Knee flexion | 0° | 5° | 10° | 20° | 30° | 45° | 60° |
|---|---|---|---|---|---|---|---|
| Passive knee stiffness (N·m/rad) | 91–95 | 48–50 | 26–28 | 10 | 5 | 2.6–3.1 | 2.1–2.5 |

  - Both coefficient assignments give the same picture within <10 %. The steep rise toward full extension is the capsule/ligament term exp(2.220 − 0.150·φ_K).
- **Silder et al. 2007** (*J Biomech* 40:2628–2635) [M, abstract]. Subject-specific 8-exponential passive model, n = 20; root-mean-square (RMS) fit errors 2.5/1.4/0.7 N·m at hip/knee/ankle. "Passive hip moments were substantial from terminal stance through initial swing".
- **Further passive-moment sources** (exist; values not extracted):
  - Yoon & Mansour 1982 (*J Biomech* 15:905–910): passive hip moment with knee-angle dependence;
  - Mansour & Audu 1986 (*J Biomech* 19:369–373): knee;
  - Amankwah, Triolo & Kirsch 2004 (*J Rehabil Res Dev* 41:15–32): 11-parameter non-linear **viscoelastic** passive model including velocity dependence.
- **Passive knee check [E from M].** Craig et al. 2019 passive long-range knee quasi-stiffness (0–40°, seated): 0.0015–0.0020 N·m/deg/kg ≈ **6–8 N·m/rad** at 73 kg. This agrees with the Riener-derived 3–5 N·m/rad at 30–60°.
- **Passive lumbar spine.** Watt, Callaway & Williams 2022 meta-analysis (*Med Biol Eng Comput* 60:2133–2157; 13 studies, 354 participants) [R, full text]. Weighted means by quartile of range, from neutral to end range:

| Direction | Quartile 1 | Quartile 2 | Quartile 3 | Quartile 4 |
|---|---|---|---|---|
| Flexion, N·m/° | 0.34 | 0.65 | 1.28 | 2.36 |
| Flexion, N·m/rad | 19 | 37 | 73 | 135 |
| Lateral bend, N·m/° | 0.32 | 0.83 | 2.03 | 5.03 |
| Lateral bend, N·m/rad | 18 | 48 | 116 | 288 |
| Axial rotation, N·m/° | 0.21 | 0.34 | 0.71 | 1.33 |
| Axial rotation, N·m/rad | 12 | 19 | 41 | 76 |

  - Neutral-zone stiffness ≈0.18–0.20 N·m/° (≈10–11 N·m/rad).
  - McGill, Seguin & Bennett 1994 (*Spine* 19:696–704) [abstract]: torsos are stiffest in lateral bending.

### 4.2 Knee intrinsic stiffness under load (still a gap)

- **Zhang et al. 1998** (*J Biomech* 31:71–76) [M, abstract].
  - Knee stiffness and viscosity "increased with muscle contraction substantially"; inertia constant.
  - **System damping ratio stayed ≈0.2 from relaxed to 50 % MVC, while natural frequency more than doubled.** Since I is constant, K rose more than 4× [E: K ∝ ω_n²].
  - Quadriceps stiffness peaked at 30° flexion; flexors at 90°.
  - Absolute values were not in the abstract.
- **Craig et al. 2019** (*Eur J Sport Sci*, online 2019, doi:10.1080/17461391.2019.1627421) [M, full text]. Seated, knee at 30°, 40° flexion perturbation at 100°/s, young athletes and controls. Quasi-stiffness over 0–4° ("short range"):
  - **passive 0.046–0.057 N·m/deg/kg**;
  - **85 % MVIC pre-activated, non-reactive: 0.080–0.088 N·m/deg/kg**;
  - long range (0–40°) active: 0.022–0.025 N·m/deg/kg.
  - Scaled to 73 kg [E]: passive short-range ≈200–240 N·m/rad; active short-range ≈335–370 N·m/rad; active long-range ≈92–105 N·m/rad.
  - **Caution [E]:** ΔT/Δθ over the first 40 ms of a 100°/s imposed motion includes inertial and viscous torque. A passive short-range value ~30× the passive long-range value is more than SRS can explain, so treat these as upper bounds.
- **Shamaei, Sawicki & Dollar 2013a** (*PLoS One* 8:e59993) [M, full text]. 14 subjects (mean 72.5 kg, 1.70 m), walking 0.75–2.63 m/s. Knee **quasi-stiffness** (moment–angle slope, not impedance) in weight acceptance:
  - **284 ± 78 N·m/rad**;
  - flexion stage 304 ± 114, extension stage 263 ± 91;
  - per-subject range 98–565.
  - That is ≈3.9 N·m/rad/kg → ≈285 N·m/rad at 73 kg [E].
- **van der Kooij et al. 2022** (*IEEE TNSRE* 30:1203–1212) [M, abstract]. Swing phase at 0.5 m/s: knee stiffness **0–3.5 N·m/rad**, damping 0.02–0.14 N·m·s/rad (near-relaxed lower bound).
- **Further knee sources** (exist; values not extracted):
  - Pfeifer et al. 2012 (*IEEE TBME* 59:2604–2612): EMG-model-based knee stiffness;
  - Nazon, Doshi & Rouse 2021 (*J Biomech Eng*, doi:10.1115/1.4051843): bench validation only, with no human stance values in that paper;
  - a 2024 Michigan thesis (Nazon) on knee impedance in walking (not read).
- **De Groote et al. 2017** [M, full text]. In backward/forward platform translations, **sagittal knee and hip torques rose substantially within 0–50 ms with angle changes <0.12°**. Hip torque changes in 0–50 ms were comparable to those at 50–100 ms and in the active response. This shows large effective intrinsic hip/knee stiffness at very small amplitudes in stance. The study does not report N·m/rad.

### 4.3 Hip (gap)

- **Shamaei et al. 2013b** (*PLoS One* 8:e81841) [M, full text]. Walking hip quasi-stiffness, 26 subjects (mean 69.1 kg): extension stage **320 ± 196**, flexion stage **335 ± 329 N·m/rad**.
- **van der Kooij et al. 2022** [M, abstract]. Swing hip stiffness **34–66 N·m/rad**, damping **1.9–4.6 N·m·s/rad**.
- **Rietdyk et al. 1999** (ABI-1 §1.2) [M]: hip/spine moments under lateral trunk pushes appeared at 56–116 ms, "too early" for active contraction.
- No verified measurement of intrinsic hip stiffness (any plane) in loaded stance was found.

### 4.4 Lumbar/trunk active intrinsic stiffness

- **Brown & McGill 2009** (*J Electromyogr Kinesiol* 19:727–736) [M, full text]. Nine males side-lying on a near-frictionless jig; quick releases into flexion or lateral bend from pre-contraction moments of 14–47 N·m.
  - Reflexes were rare: onsets within 150 ms in ~6–11 % of muscles.
  - **Mean flexion stiffness ≈109 N·m/rad.** Example trial: **141 N·m/rad, damping 11 N·m·s/rad**. Damping fell within ~0–14 N·m·s/rad across conditions (figure axis).
  - Displacements exceeded 50 % of flexion range and 70 % of lateral-bend range in maximal trials. The authors concluded intrinsic stiffness alone was insufficient.
  - The stiffness was ≈9–11 % of Cholewicki's reflex-inclusive values. Gravity was removed, so spinal compression was minimal.
- **Brown & McGill 2010** (*Comput Methods Biomech Biomed Engin* 13:829–835) [M, full text]: the stiffness gain q in k = q·F/l **decreased with rising trunk activation** (studied range up to ~25–50 % MVC in the most active muscles).
- **Cholewicki, Simons & Radebold 2000** (*J Biomech* 33:1377–1385) [M, full text]. Upright quick releases; effective stiffness **785 ± 580 N·m/rad (no load) → 2200 ± 1015 N·m/rad** (40 % BW vertical + 20 % BW horizontal loads). This includes reflexes: the fit window ran to peak deflection (~250 ms), and trunk reflexes occur at 40–80 ms.
- **Moorhouse & Granata 2007** (*J Biomech* 40:1058–1065) [M, abstract]. Pseudorandom torso perturbations: **reflexes provided 42 % of stabilising trunk stiffness**, and the intrinsic proportional term was negative (insufficient) in >60 % of trials.
- **Krajcarski, Potvin & Chiang 1999** (*Clin Biomech* 14:54–62) [M, abstract]: a higher trunk pre-load (16 % vs 4 % of max extensor moment) gave smaller flexion rotation under sudden added loads.

### 4.5 Shoulder and elbow

- **Mussa-Ivaldi, Hogan & Bizzi 1985** (*J Neurosci* 5:2732–2743) [abstract]: hand stiffness ellipses depend on arm configuration, measured "before the onset of any voluntary reaction". Numbers not extracted.
- **Franklin & Milner 2003** (§3.1) [M, full text]. Relaxed intercepts: **shoulder ≈6.6 N·m/rad, elbow ≈10.2 N·m/rad**; slopes ≈3 N·m/rad per N·m of own-joint torque.
  - Stiffness was taken at peak displacement during a 26 ms window after a displacement pulse. Whether short-latency reflexes contribute was not resolved here (not verified).
- **Perreault, Kirsch & Crago 2001** (*Exp Brain Res* 141:312–323) [abstract]: elastic arm stiffness changes during force regulation are driven mainly by single-joint muscles.
- **Perreault, Kirsch & Crago 2004** (*Exp Brain Res* 157:507–517) [M, abstract]: endpoint elasticity rose nearly linearly with force and viscosity non-linearly, giving **a remarkably consistent damping ratio** across subjects and conditions. The ζ value was not extracted.
- **Bennett et al. 1992** (*Exp Brain Res* 88:433–442) [M, abstract]: during movement, elbow stiffness was below postural values; natural frequency <3 Hz; always underdamped.
- No verified passive shoulder moment–angle data were found (gap).

---

## 5. Intrinsic damping

### 5.1 Small-signal identified viscosity (linear IBK fits)

IBK = the standard linear inertia–damping–stiffness joint model (I, B, K).

| Joint, condition | B | Other | Label |
|---|---|---|---|
| Ankle, supine, nominal model value used by the Kearney group | **1.1 N·m·s/rad** | I = 0.015 kg·m² | [R model] Golkar 2017 |
| Ankle, walking stance | **0.010–0.024 N·m·s/rad/kg** → **0.7–1.8 N·m·s/rad** at 73 kg [E] | Stiffness 0.35–6.42 N·m/rad/kg, rising linearly through stance | [R] Lee, Rouse & Krebs 2016, synthesising Rouse 2014 and Lee & Hogan 2015 |
| Ankle, closed-loop balance model | 68.8 N·m·s/rad (intrinsic) | K 40.5 N·m/rad | [R model] Pasma 2017 (ABI-1 §1.1). Model-dependent; not comparable |
| Ankle, all contraction levels | ζ almost invariant from rest to MVC | — | [M] Weiss 1988 |
| Knee, relaxed to 50 % MVC | ζ ≈ 0.2 | — | [M] Zhang 1998 |
| Knee, swing | 0.02–0.14 N·m·s/rad | — | [M] van der Kooij 2022 |
| Hip, swing | 1.9–4.6 N·m·s/rad | — | [M] van der Kooij 2022 |
| Trunk, quick release, reflexes minimal | ≈0–14 N·m·s/rad (example 11) | — | [M] Brown & McGill 2009 |
| Arm endpoint | Viscosity rises non-linearly with force, keeping ζ constant | — | [M] Perreault 2004 |

**Amplitude dependence.** Viscosity rises with perturbation size (Sakanaka 2021 [M]). B also falls with displacement amplitude in random-perturbation identification (Kearney & Hunter 1982 [M]). Small-signal B is therefore not a constant property.

### 5.2 Force–velocity as a load-dependent damper

- **Classical sources.**
  - Katz 1939 (*J Physiol* 96:45–64) is commonly cited for lengthening force up to ~1.8 × isometric and a slope near v = 0 several times steeper on the lengthening side [R, **not verified against the original this session**].
  - Lombardi & Piazzesi 1990 [M]: steady lengthening tension 1.9–2 T0 at ≥0.25–0.4 µm/s per half-sarcomere, little increase beyond.
- **In vivo voluntary eccentric torque** is limited by neural inhibition.
  - Westing, Seger & Thorstensson 1990 (*Acta Physiol Scand* 140:17–22) [M, abstract]: superimposed stimulation raised eccentric knee-extension torque 21–24 % above voluntary.
  - Review: Duchateau & Enoka 2016 (*J Exp Biol* 219:197–204) [R].
  - For an **unexpected** stretch, the CNS cannot change the drive for ≥~40 ms. Within that time the intrinsic FV curve at the pre-impact activation applies [E].
- **Linearised FV damping [E].**
  - Hill's equation with a/F0 = 0.25 gives |dF/dv| at v = 0 (shortening side) = 5·F_act / v_max.
  - Joint damping is B = (dF/dv)·r².
  - Example: per-leg triceps surae in quiet stance. F_act ≈ 340 N; v_max ≈ 10 l_opt/s = 0.44 m/s [D: typical model value]; r = 0.05 m.
    - B_short ≈ 5 × 340 / 0.44 × 0.0025 ≈ **9.7 N·m·s/rad**.
    - With a lengthening-side slope 2–6× steeper, **B_len ≈ 19–58 N·m·s/rad** per leg.
  - This is ~10–50× the small-signal identified value (§5.1).
  - The linearisation holds only for |v| ≲ 0.05–0.1 v_max, about 0.4–0.9 rad/s at the ankle. Beyond that, force **saturates** at ~1.5–2 F_act (in vitro), i.e. **Coulomb-like** behaviour.
  - Series tendon compliance reduces the fibre velocity seen at high frequency.
- **Reconciling the two regimes [E].** Small-amplitude, random-perturbation identification probes the SRS and tendon region, which is elastic, with low B. Large, fast stretches leave SRS and engage FV, which is high but saturating. This matches Rack & Westbury's "essentially elastic" (short range) versus "frictional" (large amplitude) description.

### 5.3 Which regime applies to the tackle [E]

- Hamstring and gluteal fibres are stretched by hip flexion plus knee extension at several rad/s.
- Example: hip rate 6.7 rad/s × 6.5 cm = 0.44 m/s, i.e. ~0.45–0.6 v_max for l_opt 0.07–0.1 m.
- So **already-active hip extensors and knee flexors should be modelled near their eccentric force plateau**:
  - torque ≈ (1.2–1.8) × pre-impact active torque, roughly velocity-independent;
  - the lower end allows for low-rate yield and in vivo uncertainty [D];
  - plus passive tissue.
- They should **not** be modelled as springs or as linear dampers with small-signal B.

---

## 6. Tendon and series elasticity

| Tendon | Stiffness | Population | Label |
|---|---|---|---|
| Achilles, free tendon | **759 ± 132 N/mm** (at 2641 N; strain 8 %; modulus 788 MPa); aponeurosis strain only 1.4 % | n = 5, isometric | [M] Magnusson et al. 2003, *Acta Physiol Scand* 177:185–195 |
| Achilles, whole (muscle-tendon junction to calcaneus) | **145–231 N/mm** (interquartile range); modulus 0.67–1.07 GPa; hysteresis 17–35 % | 10 males, one-legged hopping | [M] Lichtwark & Wilson 2005, *J Exp Biol* 208:4715–4725 |
| Gastrocnemius tendon | Curvilinear: 1.7 mm at 87.5 N → 11.1 mm at 875 N; modulus 1.16 GPa | 6 men | [M] Maganaris & Paul 2002, *J Biomech* 35:1639–1646 |
| Patellar tendon | **≈4300 N/mm** (high-force region); strain 6.9 %; modulus 1.09 GPa | Maximal isometric ramps | [M] Hansen et al. 2006, *Clin Biomech* 21:54–58 |

**Joint-level conversion, K_T,joint = k·r² [E]:**

- Achilles, r = 5 cm:
  - whole tendon **≈360–580 N·m/rad per leg**;
  - free tendon ≈1900 N·m/rad.
  - Loram et al. 2007b reports series elastic stiffness ≈77 ± 13 % mgh (ABI-1 §1.1). The normalisation basis (per leg vs both legs) was not re-verified.
- Patellar, r = 4.5 cm: ≈**8800 N·m/rad** (≈13 mgh) at high force.
- **Low force (toe region):** both are lower. At standing-level forces, Maganaris & Paul's curve implies roughly 50–100 N/mm in the first ~100–900 N [E from their two points: 787.5 N / 9.4 mm ≈ 84 N/mm average].

**Effects in the first tens of milliseconds:**

- **Ankle in stance.** Tendon compliance dominates small-rotation stiffness: muscle ≈15× stiffer than tendon (Sakanaka 2018 [M]). It also enlarges the joint-angle SRS limit (§2.6).
- **Knee extensors at high force.** The patellar tendon is stiff, so knee extensor stiffness is likely muscle- and aponeurosis-limited [E]. Quadriceps aponeurosis and quadriceps tendon properties were not reviewed (gap).
- **Electromechanical delay.** Passive series-elastic take-up is ≈47 % of the evoked EMD in gastrocnemius medialis (Nordez 2009; ABI-1 §3).
- **Tendon stiffness alone cannot replace SRS.** De Groote 2017 doubled tendon stiffness and still could not reproduce the 0–50 ms torques without SRS [M, full text].

---

## 7. Activation dynamics and torque rise

**Two mechanisms, two time scales.**

| | SRS / FV of already-active muscle (B) | New activation, any command (C) |
|---|---|---|
| Delay | **None.** Force changes with fibre strain or velocity at the instant of stretch | Reflex EMG ≥~23–45 ms (muscle-dependent), then EMD ~10–15 ms (evoked) to ~50 ms (voluntary), then activation rise |
| Magnitude cap | ≈γδ·F_pre at the SRS limit (0.13–1.6 × F_pre depending on γ). Then a plateau ≈1.5–2 × F_pre (high activation) or a yield (low rate) | Up to MVC, but slowly |
| Scales with | Pre-impact activation and force | Reflex gain and drive (task- and set-dependent) |

**Activation time constants [R model]:**

- **Thelen 2003** (*J Biomech Eng* 125:70–77): τ_act = 15 ms, τ_deact = 50 ms (OpenSim Thelen2003Muscle defaults). The paper prolongs deactivation for older adults.
- **OpenSim Arm26 model:** τ_act = 10 ms, τ_deact = 40 ms (read from the model file).
- **Zajac 1989 review** (*Crit Rev Biomed Eng* 17:359–411): activation-dynamics formulation. Its specific τ ranges are commonly quoted as ~10–20 ms (activation) and longer for deactivation, but this was **not verified** this session.
- **Winters & Stark 1988** (*J Biomech* 21:1027–1041): Hill-model parameter estimates for many muscles; τ values not extracted.
- **He, Levine & Loeb 1991** (*IEEE Trans Autom Control* 36(3); pages not verified): a cat-hindlimb linear-quadratic regulator (LQR) model with activation kinetics. Not a source of human τ.
- **Torque-level filters** (ABI-1 §3, §10): Welch & Ting 2008, first-order 40 ms; Pasma 2017, second-order ω = 16.8 rad/s, ζ = 0.99.

**Electromechanical delay** (ABI-1 §3): evoked 11.6 ± 1.5 ms in gastrocnemius medialis (Nordez 2009); voluntary 49.5–55.5 ms (Cavanagh & Komi 1979). Hug et al. 2011 caution that voluntary EMD overestimates the physiological delay [R].

**Rate of force development:**

- **Tillin et al. 2010** (*MSSE* 42:781–790) [M, abstract]. Knee extension, normalized RFD:
  - 0–50 ms after onset: **4.86 ± 1.46 MVC/s** (power athletes) vs **2.81 ± 1.20** (untrained);
  - 50–100 ms: 6.68 vs 7.93 MVC/s.
  - Torque at 50 ms after contraction onset ≈ **24 % vs 14 % MVC**; at 100 ms ≈ 58 % vs 54 % MVC [E: integrating the windows].
  - Intrinsic contractile RFD (twitch, tetanus) did not differ between groups.
- **de Ruiter et al. 2004** (*J Appl Physiol* 97:1693–1701) [M, abstract]: voluntary torque-time integral over the first 40 ms was on average only **40 %** of the value under supramaximal 300 Hz stimulation, ranging 10–83 % across subjects.
- **Folland, Buckthorpe & Hannah 2014** (*Scand J Med Sci Sports* 24:894–906) [M, abstract]: early explosive force (0–50 ms) is determined by neural activation and twitch force; 13-fold variability between individuals.
- **Maffiuletti et al. 2016** (*Eur J Appl Physiol* 116:1091–1116) [R]: the first 50–75 ms of RFD is governed mainly by motor-unit discharge rate.
- Quadriceps absolute RFD of 1.1–2.2 kN·m/s: Aagaard 2002 (ABI-1 §10).

**Implication [E].**

- Even if a reflex command were allowed, at most ~5–15 % MVC of new torque could exist by ~70 ms after impact: ~40 ms latency + ~10 ms EMD + ~20 ms at 3–5 MVC/s.
- Over the same window, an already-active muscle stretched past its SRS limit produces an **immediate** +50–100 % of its pre-impact force (high activation), and does so with no delay.
- For a running support leg at tens of % MVC, the intrinsic contribution therefore dominates the first ~60–80 ms.

---

## 8. Pre-existing activation (what "B" should contain)

### 8.1 Quiet standing

- **Ankle plantar flexors.**
  - Baseline torque ≈5 % mgh for both legs ≈ 34 N·m, i.e. ≈17 N·m per leg [M: Sakanaka 2021; Sakanaka 2018 normal standing 16.4 ± 4.7 N·m].
  - Plantar-flexion MVC ≈ 122 N·m (non-athlete anchor; ABI-1 §10), higher in athletes [U in ABI-1].
  - So triceps surae run at roughly **8–14 % MVC torque** in quiet stance [E].
  - A search excerpt quoted soleus surface EMG ≈11.8 ± 6.8 % MVC in young adults standing. The source paper could not be confirmed, so this is **not verified**.
- **Gastrocnemius.**
  - Medial gastrocnemius motor units are recruited intermittently with forward sways, discharging **8 ± 1.1 → 10 ± 0.9 pulses/s** [M: Vieira et al. 2012, *J Neurophysiol* 107:666–676].
  - Lateral gastrocnemius is rarely active in standing; its recruitment thresholds are 20–35× those of soleus and medial gastrocnemius [M: Héroux et al. 2014, *J Appl Physiol* 116:140–148].
- **Tibialis anterior.** Its length mostly follows sway passively ("orthodox"); soleus and gastrocnemius act as active agonists most of the time [M: Di Giulio et al. 2009, *J Physiol* 587:2399–2416].
- **Knee, hip, trunk.** No verified % MVC values were found for quadriceps, hamstrings, glutei or erector spinae in quiet stance (gap). Low single-digit % MVC is the conventional expectation [D].
  - De Groote 2017's optimisation chose mean baseline activations of **0.08–0.11** (without SRS) or 0.18–0.20 (with SRS) across 43 muscles per leg to match standing torques [R model]. The baseline is therefore model-dependent.
- **Firing rate and yield.** Postural motor units fire at low rates (~8–10 pulses/s, medial gastrocnemius). That is within the range where cat soleus *yields* during sustained stretch (Joyce 1969, 5–15 pulses/s). Whether human postural muscles yield similarly is untested here [E, gap].

### 8.2 Running stance (support leg)

- **Kyröläinen, Avela & Komi 2005** (*J Sports Sci* 23:1101–1109) [M, abstract]. 17 elite male middle-distance runners: average EMG rose with speed, "especially in the pre-contact and braking phases". At higher speeds, **gastrocnemius, vastus lateralis, biceps femoris and gluteus maximus exceeded 100 % MVC** in those phases.
- **Tsuji et al. 2015** (*J Phys Ther Sci* 27:353–356) [M, full text]. n = 10, treadmill. Running cycle-averaged % MVC:
  - vastus medialis 38.8, vastus lateralis 37.7, tibialis anterior 37.6, lateral gastrocnemius 40.8, soleus 44.8, hip adductors 50.1;
  - peaks 88–137 % MVC.
- **Implication [E/D].**
  - Support-leg extensors at impact during running are at **tens of % MVC up to ≥100 % MVC of isometric reference**, roughly 5–10× quiet-stance levels.
  - All intrinsic resistances (SRS, FV plateau, load-dependent K) scale accordingly.
  - The phase of stance at impact matters: braking phase (high extensor activity) versus late propulsion.

### 8.3 Anticipated vs unexpected impacts

- **Anticipation raises pre-activation.**
  - Moritz & Farley 2004 (*J Appl Physiol* 97:1313–1322) [M, abstract]: expected hard surface → EMG **+24–76 % in the 50 ms before landing**, and landing with more knee flexion.
  - Surprise hard surface → "within 52 ms after subjects landed … joint flexion increased, and the legs became less stiff". EMG first changed at **68–188 ms**. The authors attribute the early change to passive dynamics.
  - van der Krogt et al. 2009 (*J Appl Physiol* 107:801–808) [M/R, abstract] reproduced this passive adaptation in a forward simulation with unchanged stimulation (§10).
- **Trunk.**
  - Lavender & Marras 1995 (*J Electromyogr Kinesiol* 5:45–56) [M, abstract]: back muscles were tensed when sudden loads were anticipated; timing information altered the co-contraction.
  - Krajcarski 1999 (§4.4): higher pre-load gave smaller rotation.
- **First-trial and startle responses** to unexpected perturbations (exaggerated, co-contraction) occur at reflex/postural latencies, not before impact (ABI-1 §13).
- **Real-world analogue.** Konradsen, Voigt & Højsgaard 1997 (*Am J Sports Med* 25:54–58) [M, abstract]. Trapdoor ankle inversion:
  - peroneal EMG 54 ms after inversion onset; quadriceps/hamstrings 68 ms;
  - **active eversion only at 176 ms**, while the trapdoor reached 30° in ~80 ms;
  - "too slow to protect the ankle".

**Justified for an unseen tackle from behind [D]:**

- pre-impact activation = the activation the ongoing task requires, whether standing balance or running gait phase;
- no added bracing or co-contraction.

A seen tackle (bracing) would be a separate, explicitly labelled scenario. The only quantitative anchor for it is Moritz & Farley's +24–76 %.

---

## 9. Latency boundaries for (C) (compact restatement of ABI-1 §2, §3 and §12)

| Mechanism | EMG onset after impact | Earliest torque | Sources |
|---|---|---|---|
| Short-latency stretch reflex (M1) | Quadriceps 23–25 ms; soleus 35–50 ms (41 ± 4 ms to a 5° stretch at 170°/s); hamstrings ~59 ms; peronei 54 ms (inversion) | **≈45–80 ms** (central 60 ms) | ABI-1 §2; Toft et al. 1991, *J Neurophysiol* 65:1402–1410 [M, abstract]; Konradsen 1997 |
| Trunk reflex responses | 40–80 ms (quick release); paraspinal stretch reflex ~60 ms | ≈60–100 ms | Cholewicki 2000 (citing Radebold 2000); ABI-1 §2. Brown & McGill 2009: reflex onsets within 150 ms in only ~6–11 % of muscles |
| Medium latency (M2) | ~70–120 ms | ≈80–130 ms | ABI-1 §2 |
| Automatic postural response | 73–110 ms (100 ± 20 ms) | **≈120–160 ms** | ABI-1 §3, §12 |
| Surprise-surface EMG change in hopping | 68–188 ms | — | Moritz & Farley 2004 |
| Voluntary | >120–150 ms | >150–180 ms | ABI-1 §3 |

**Boundary for this project [D].**

- Strictly, the purely pre-reflex torque window is **0 to ~45–60 ms**.
- Using A + B only until 120 ms omits:
  - short- and medium-latency reflex torque in stretched muscles from ~50–60 ms;
  - for the trunk, possible reflex stiffening from ~60–100 ms.
- Literature on the size of that omission:
  - reflex share of ankle stiffness 1–55 %, peaking at low contraction (Mirbagheri 2000);
  - 42 % of trunk stiffness (Moorhouse & Granata 2007);
  - short-latency responses can also be destabilising (ABI-1 §2).

---

## 10. Modelling papers: what intrinsic properties achieve without reflexes

| Study | Model and perturbation | What intrinsic properties did | Label |
|---|---|---|---|
| **De Groote, Allen & Ting 2017**, *J Biomech* 55:71–77 | OpenSim, 43 muscles per leg, constant activation. Platform translations 12 cm, 30 cm/s, 0.45 g; 2 subjects | **SRS needed** to reproduce 0–50 ms hip/knee torques: RMSE −56 % and −47 %. SRS gave **97 % of force change** but 6 % of force. Without SRS, forward simulations gave **≤5° at 50 ms and ≤15° at 100 ms**; SRS halved these. Measured: **<0.12° and <1°**. Extending the window from 50 to 100 ms raised RMSE 80–105 % for all models. Doubling tendon stiffness did not substitute for SRS | [M]+[R model], full text |
| **van Soest & Bobbert 1993**, *Biol Cybern* 69:195–204 | Vertical-jump direct dynamics; stimulation control vs prescribed-moment control | Muscle force–length–velocity properties "constitute a peripheral feedback system that has the advantage of zero time delay". With small perturbations the task succeeds without changing stimulation | [R model], abstract |
| **Gerritsen, van den Bogert & Nigg 1995**, *J Biomech* 28:661–668 | 2D 4-segment, 7 muscles; heel-toe running impact | With joint moments at heel-strike held equal, different stimulation combinations changed the impact peak by **<10 %**. Touchdown kinematics dominated: 85 N/deg foot angle; 212 N per 0.1 m/s heel velocity | [R model], abstract |
| **van der Krogt et al. 2009**, *J Appl Physiol* 107:801–808 | Hopping, unchanged stimulation, surprise hard/soft surface | Leg stiffness adapted **passively, in both directions**, through FV and length changes of muscles with nearly constant active state | [R model], abstract |
| **Haeufle, Grimmer & Seyfarth 2010**, *Bioinspir Biomim* 5:016004 | 1D hopping, Hill muscle without serial or parallel elastic elements | **Stability comes from the force–velocity relation**, not force–length | [R model], abstract |
| **Daley, Voloshina & Biewener 2009**, *J Physiol* 587:2693–2707 | Guinea fowl, unexpected terrain drop, in vivo gastrocnemius | Intrinsic mechanics drive the initial force/work changes, which are "inherently stabilising". EMG differs only in the next stride | [M, animal], abstract |
| **Araz et al. 2023**, *Front Bioeng Biotechnol* 11:1150170 | In vitro fibres under simulated perturbed-hopping boundary conditions | A stereotyped SRS response first, then velocity-dependent (damping-like) force. Preflex work is set mostly by stretch magnitude. Stiffness and damping both depend on activity | [M, in vitro], abstract |
| **Bunderson, Burkholder & Ting 2008**, *J Biomech* 41:1537–1544 | Cat hindlimb, 31 muscles | Only a subset of activation patterns is intrinsically stable. Where unstable, the time constants are long enough for long-latency feedback | [R model], abstract |
| **Loeb, Brown & Cheng 1999**, *Exp Brain Res* 126:1–18; **Brown & Loeb 2000**, chapter in Winters & Crago (eds), *Biomechanics and Neural Control of Posture and Movement*, Springer, pp. 148–163 | Hierarchical / "preflex" framework | Lower-level properties "maintained stability in the face of feedback delays". The term "preflex" was coined here (originally Brown, Scott & Loeb 1995, Soc Neurosci abstract). The chapter was checked for existence only; the PDF is scanned | [R], abstract |
| **Barrett et al. 2024**, *PLoS One* 19:e0307977 | Spine inverted pendulum; SRS as a Maxwell element | SRS alone insufficient even for modest (5 N·m, 50 ms) perturbations. Its damping "slows down the mechanical response" and buys time for the CNS | [R model], summary tool |
| **Brown & McGill 2009** (experiment) | Trunk quick release with minimal reflexes | Intrinsic stiffness insufficient; large displacements | [M] |
| Kistemaker, van Soest & Bobbert 2006, *J Neurophysiol* 95:2898–2912 | Elbow equilibrium-point control with realistic muscle | Shows the importance of realistic non-linear muscle properties. Not a perturbation-response study | [R model], abstract |

**Consensus [E].** Intrinsic properties:

1. **Supply nearly all of the force change** in the first ~50 ms (De Groote: 97 % from SRS).
2. **Halve, but do not eliminate, model joint excursions.** Even with SRS, Hill models over-predict the measured motion by about an order of magnitude in mild perturbations.
3. Are dominated by **FV** (velocity-dependent, saturating) for larger and faster disturbances.
4. **Buy time rather than stabilise.**

None of these studies examined a perturbation as violent as a ~12 g foot sweep.

---

## 11. Synthesis: what A + B should produce in the tackle, 0–120 ms [E]

| Time after contact | Dominant intrinsic mechanism | Notes |
|---|---|---|
| 0–~3 ms | Contact compliance, segment inertia | Impact force builds through boot–shin and foot–ground contact |
| ~0–10 ms | **SRS** of all active muscles stretched by the motion. Elastic, ~0.3–1° joint range, ΔF up to 0.13–1.6 × F_pre | Tendon in series (ankle compliant; patellar stiff) |
| ~5–120 ms | **Eccentric FV plateau** of active stretched muscles, ≈1.2–1.8 × pre-impact torque, roughly velocity-independent. **Shortening** muscles lose force (FV shortening side, SRS release) | Hamstrings and glutes on the swept leg (hip flexion + knee extension); stance-leg extensors depending on loading |
| Throughout | **Passive tissue**: exponential near end range (knee extension, hip flexion with extended knee, lumbar end range); tendon elasticity | Viscoelastic passive terms are small in mid-range |
| Throughout | **Held pre-impact activation**. No activation change; force changes only via F–L, F–V, SRS and tendon | Activation dynamics irrelevant without new excitation |
| ≥~50–60 ms (if allowed) | Short- and medium-latency reflex torque | Excluded by project design [D] |

---

## 12. Parameter table per joint

mgh = 670 N·m/rad (both legs). Values are for **one joint, one side** unless stated. "K_act(τ)" is the incremental stiffness under background torque τ.

| Joint | Passive stiffness | Intrinsic active stiffness and torque scaling | SRS elastic limit (joint) | Damping |
|---|---|---|---|---|
| **Ankle** (sagittal) | Passive calf: short range (<0.2°) ≈67 % mgh; long range (7°) 13–19 % mgh (Loram 2007a, ABI-1 §1.1) [M]. Relaxed supine K small mid-range, large at extremes (Weiss 1986) [M] | **Stance:** 0.64–0.94 mgh (430–630 N·m/rad, both legs) for <1°; 0.44–0.58 mgh (295–390) at 1–5° [M: Loram 2002, Casadio 2005, Sakanaka 2021, Vlutters 2015]. Weak torque dependence, ~+30 % per step from 5 → 16 → 31 N·m (Sakanaka 2018) [M]: tendon-limited. **Isolated:** K ∝ τ from rest to MVC (Weiss 1988); **K ≈ 4.3·τ** over 12°/62 ms (Blanpied 1992) [M]; dorsiflexors 29 → 143 N·m/rad at 80 % MVC (Sinkjaer 1988) [M]. Series model 0.56–1.53 mgh [E] | Fibre-only 0.31–0.54° (soleus), 0.57–1.0° (TA) [E]. Tendon-inclusive 0.4–4.6° [E]. Measured softening already between 0.2° and 0.9° [M] | Small-signal **0.7–1.8 N·m·s/rad** (walking; Lee 2016) [R]; 1.1 (model nominal) [R]; ζ ~invariant with torque [M]. Large-motion FV: ≈10 (shortening) to 20–60 N·m·s/rad (lengthening) per leg in stance, saturating [E] |
| **Knee** (sagittal) | ≈91–95 N·m/rad at 0°; 26–28 at 10°; 10 at 20°; 2–5 at 30–60° (hip/ankle 0) [E from Riener & Edrich; secondary-source equation]. Seated passive long range ≈6–8 N·m/rad [E from M, Craig 2019] | **Gap in stance.** K ×>4 from relaxed to 50 % MVC, ζ ≈ 0.2 [M/E, Zhang 1998]. Seated 0–4° at 85 % MVIC: ≈335–370 N·m/rad (inertia-contaminated upper bound) [E from M]. Walking quasi-stiffness 284 ± 78 N·m/rad [M] (not impedance). Swing 0–3.5 N·m/rad [M]. Suggested scaling: K ≈ (3–5)·τ + K_passive [E/D, by analogy with ankle and arm] | Vasti 0.75–1.35°; RF 0.56–1.0°; hamstrings 1.1–1.9° (knee only) [E]. Patellar tendon stiff, so small tendon addition [E] | ζ ≈ 0.2 [M]; swing 0.02–0.14 N·m·s/rad [M]; FV-based [E] as for ankle with τ_pre |
| **Hip** (sagittal / frontal) | Exponential with knee-angle coupling (Yoon & Mansour 1982; Riener & Edrich 1999; Silder 2007) [M; values not extracted]. Substantial near terminal-stance extension (Silder) | **Gap.** Walking quasi-stiffness 320 ± 196 (extension stage) / 335 ± 329 N·m/rad (flexion stage) [M]. Swing 34–66 N·m/rad [M]. Large torque rises with <0.12° motion in 0–50 ms of platform perturbation (De Groote 2017) [M, no N·m/rad]. Suggested K ≈ (3–5)·τ + K_passive [E/D] | Semimembranosus 0.36–0.63°; BF long head 0.50–0.87°; glut max 0.78–1.38°; glut med (abduction) 0.50–0.88°; iliacus 0.72–1.27° [E] | Swing 1.9–4.6 N·m·s/rad [M]; FV-based for active extensors [E] |
| **Lumbar / trunk** | Flexion 19 / 37 / 73 / 135 N·m/rad by quartile; lateral bend 18 / 48 / 116 / 288; axial rotation 12 / 19 / 41 / 76; neutral zone ≈10–11 N·m/rad [R: Watt 2022] | **Without reflexes:** ≈109 N·m/rad mean in flexion (example 141 at 22.5 N·m pre-moment) [M: Brown & McGill 2009]; q falls with activation [M: Brown & McGill 2010]. **With reflexes:** 785 → 2200 N·m/rad [M: Cholewicki 2000]; reflexes ≈42 % (Moorhouse & Granata 2007) [M] | 0.3–2.1° (erector spinae; fascicle lengths not verified) [E] | ≈0–14 N·m·s/rad (example 11) [M: Brown & McGill 2009] |
| **Shoulder** (horizontal-plane data) | **Gap** (no verified passive curve) | R_ss ≈ **6.6 + 3.0·τ_s + 1.1·τ_e N·m/rad** [M: Franklin & Milner 2003]; proportional to own torque (Gomi & Osu 1998) [M]; constant ζ across force (Perreault 2004) [M] | Deltoid ≈1.6–2.8° (l_opt not verified) [E] | **Gap** (ζ value not extracted) |
| **Elbow** | Relaxed intercept ≈10 N·m/rad [M: Franklin & Milner 2003] | R_ee ≈ **10.2 + 3.1·τ_e + 1.1·τ_s N·m/rad** [M]; stiffness and viscosity rise with torque (Zhang & Rymer 1997) [M]; lower during movement (Bennett 1992) [M] | Biceps 0.94–1.66°; brachialis 1.1–2.0°; triceps 1.9–3.3° [E] | **Gap** (rises with torque; values not extracted) |

**Cross-joint SRS law for implementation [R model/D]:**

- F_SRS = γ·F_act·Δl̃ for 0 < Δl̃ < δ, held at γδ·F_act beyond δ.
- **δ = 0.0057–0.01**; **γ = 280** if the tendon is modelled explicitly, or calibrated (~20–40) as a joint-level lump.
- The SRS state is reset after the limit is exceeded, with recovery τ ≈ 1 s or faster [M fibres; D].
- Muscles that are shortening have no SRS beyond their elastic range (De Groote's model sets F_SRS = 0 in shortening).

---

## 13. Data gaps

1. **Knee and hip intrinsic stiffness under load in stance** (N·m/rad, sub-degree to a few degrees, reflex-excluded): none found. This is the same gap ABI-1 reported. The proxies (walking quasi-stiffness, swing impedance, seated tests) are not equivalent.
2. **Absolute SRS extent in whole human muscle in vivo, and its active-state value.** Human data are joint-level (ankle) and mostly passive or low-activation. The γ values differ ~10× between fibre-level (280) and whole-muscle-tendon (23.4) parameterisations.
3. **Post-limit behaviour at postural firing rates in humans** (plateau vs yield below isometric). The yield evidence is from cat soleus at 5–15 pulses/s (Joyce 1969).
4. **SRS availability during running** (history dependence at in vivo temperature and stride frequency). Fibre recovery ≈1 s⁻¹ was measured in skinned fibres; temperature not verified.
5. **Eccentric force enhancement in vivo for unexpected, very fast stretches** of submaximally active human muscle (1.5–2× in vitro; voluntary eccentric limited by neural inhibition). The Katz 1939 numbers were not verified against the original.
6. **Trunk erector-spinae and deltoid optimal fascicle lengths** were not verified, so their SRS joint limits are rough.
7. **Passive shoulder moment–angle data** and **shoulder/elbow damping values** were not extracted.
8. **Quiet-stance % MVC of quadriceps, hamstrings, glutei and erector spinae** was not verified. The soleus value is torque-derived [E]; the EMG figure of 11.8 % is not verified.
9. **Running mid-stance joint torques** for setting B-state activation were not extracted this session. Schache et al. 2011 (*MSSE* 43:1260–1271) and the Rajagopal 2016 model data are candidate sources.
10. **Riener & Edrich coefficients** were taken from a secondary source; the knee/ankle coefficient assignment is not verified.
11. **Rack & Westbury 1974 SRS extent in mm** and **Zajac 1989 τ ranges**: full texts not read.
12. **Any study of joint responses in the first 120 ms of a sports tackle or of a lab "sweep" perturbation at ~10 g.** None found. All evidence is extrapolated from perturbations 1–2 orders of magnitude milder.
13. **Quadriceps aponeurosis and quadriceps tendon stiffness** and their share of knee series compliance: not reviewed.

---

## 14. References

Citations verified this session against PubMed records unless noted. DOIs are as listed in PubMed.

- Amankwah K, Triolo RJ, Kirsch R (2004). Effects of spinal cord injury on lower-limb passive joint moments revealed through a nonlinear viscoelastic model. *J Rehabil Res Dev* 41(1):15–32. doi:10.1682/JRRD.2004.01.0015. PMID 15273894.
- Araz M, Weidner S, Izzi F, Badri-Spröwitz A, Siebert T, Haeufle DFB (2023). Muscle preflex response to perturbations in locomotion: in vitro experiments and simulations with realistic boundary conditions. *Front Bioeng Biotechnol* 11:1150170. doi:10.3389/fbioe.2023.1150170. PMID 37214305.
- Axelson HW, Hagbarth KE (2001). Human motor control consequences of thixotropic changes in muscular short-range stiffness. *J Physiol* 535:279–288. doi:10.1111/j.1469-7793.2001.00279.x. PMID 11507177.
- Barrett JM, Malakoutian M, Fels S, Brown SHM, Oxland TR (2024). Muscle short-range stiffness behaves like a Maxwell element, not a spring: implications for joint stability. *PLoS One* 19(8):e0307977. doi:10.1371/journal.pone.0307977. (Verified on PMC, PMC11324116.)
- Bennett DJ, Hollerbach JM, Xu Y, Hunter IW (1992). Time-varying stiffness of human elbow joint during cyclic voluntary movement. *Exp Brain Res* 88:433–442. doi:10.1007/BF02259118. PMID 1577114.
- Blanpied P, Smidt GL (1992). Human plantarflexor stiffness to multiple single-stretch trials. *J Biomech* 25(1):29–39. doi:10.1016/0021-9290(92)90243-T. (Verified via the institutional repository record.)
- Brown IE, Loeb GE (2000). A reductionist approach to creating and using neuromusculoskeletal models. In: Winters JM, Crago PE (eds) *Biomechanics and Neural Control of Posture and Movement*. Springer, New York, pp. 148–163. (Existence verified; content not read.)
- Brown SHM, McGill SM (2009). The intrinsic stiffness of the in vivo lumbar spine in response to quick releases: implications for reflexive requirements. *J Electromyogr Kinesiol* 19:727–736. doi:10.1016/j.jelekin.2008.04.009. PMID 18513993.
- Brown SHM, McGill SM (2010). The relationship between trunk muscle activation and trunk stiffness: examining a non-constant stiffness gain. *Comput Methods Biomech Biomed Engin* 13:829–835. doi:10.1080/10255841003630652. PMID 20603728.
- Bunderson NE, Burkholder TJ, Ting LH (2008). Reduction of neuromuscular redundancy for postural force generation using an intrinsic stability criterion. *J Biomech* 41:1537–1544. doi:10.1016/j.jbiomech.2008.02.004. PMID 18374342.
- Campbell KS (2010). Short-range mechanical properties of skeletal and cardiac muscles. *Adv Exp Med Biol* 682:223–246. doi:10.1007/978-1-4419-6366-6_13. PMID 20824529.
- Campbell KS, Lakie M (1998). A cross-bridge mechanism can explain the thixotropic short-range elastic component of relaxed frog skeletal muscle. *J Physiol* 510:941–962. doi:10.1111/j.1469-7793.1998.941bj.x. PMID 9660904.
- Campbell KS, Moss RL (2000). A thixotropic effect in contracting rabbit psoas muscle: prior movement reduces the initial tension response to stretch. *J Physiol* 525:531–548. doi:10.1111/j.1469-7793.2000.00531.x. PMID 10835052.
- Campbell KS, Moss RL (2002). History-dependent mechanical properties of permeabilized rat soleus muscle fibers. *Biophys J* 82:929–943. doi:10.1016/S0006-3495(02)75454-4. PMID 11806934.
- Cholewicki J, McGill SM (1996). Mechanical stability of the in vivo lumbar spine: implications for injury and chronic low back pain. *Clin Biomech* 11:1–15. doi:10.1016/0268-0033(95)00035-6. PMID 11415593.
- Cholewicki J, Simons AP, Radebold A (2000). Effects of external trunk loads on lumbar spine stability. *J Biomech* 33:1377–1385. doi:10.1016/S0021-9290(00)00118-4. PMID 10940396.
- Clark WH, Franz JR (2019). Activation-dependent changes in soleus length-tension behavior augment ankle joint quasi-stiffness. *J Appl Biomech* 35:182–189. doi:10.1123/jab.2018-0297. PMID 30676171.
- Craig D, Needle AR, Kaminski TW, Royer TD, Swanik CB (2019, online). Reactive knee stiffening strategies between various conditioning histories. *Eur J Sport Sci*. doi:10.1080/17461391.2019.1627421. (Verified from the article PDF; final volume and pages not verified.)
- Cui L, Perreault EJ, Maas H, Sandercock TG (2008). Modeling short-range stiffness of feline lower hindlimb muscles. *J Biomech* 41:1945–1952. doi:10.1016/j.jbiomech.2008.03.024. PMID 18499113.
- Daley MA, Voloshina A, Biewener AA (2009). The role of intrinsic muscle mechanics in the neuromuscular control of stable running in the guinea fowl. *J Physiol* 587:2693–2707. doi:10.1113/jphysiol.2009.171017. PMID 19359369.
- De Groote F, Allen JL, Ting LH (2017). Contribution of muscle short-range stiffness to initial changes in joint kinetics and kinematics during perturbations to standing balance: a simulation study. *J Biomech* 55:71–77. doi:10.1016/j.jbiomech.2017.02.008. PMID 28259465.
- de Ruiter CJ, Kooistra RD, Paalman MI, de Haan A (2004). Initial phase of maximal voluntary and electrically stimulated knee extension torque development at different knee angles. *J Appl Physiol* 97:1693–1701. doi:10.1152/japplphysiol.00230.2004. PMID 15180971.
- Di Giulio I, Maganaris CN, Baltzopoulos V, Loram ID (2009). The proprioceptive and agonist roles of gastrocnemius, soleus and tibialis anterior muscles in maintaining human upright posture. *J Physiol* 587:2399–2416. doi:10.1113/jphysiol.2009.168690. PMID 19289550.
- Duchateau J, Enoka RM (2016). Neural control of lengthening contractions. *J Exp Biol* 219:197–204. doi:10.1242/jeb.123158. PMID 26792331.
- Edman KAP, Elzinga G, Noble MIM (1978). Enhancement of mechanical performance by stretch during tetanic contractions of vertebrate skeletal muscle fibres. *J Physiol* 281:139–155. doi:10.1113/jphysiol.1978.sp012413. PMID 309001.
- Folland JP, Buckthorpe MW, Hannah R (2014). Human capacity for explosive force production: neural and contractile determinants. *Scand J Med Sci Sports* 24:894–906. doi:10.1111/sms.12131. PMID 25754620.
- Franklin DW, Milner TE (2003). Adaptive control of stiffness to stabilize hand position with large loads. *Exp Brain Res* 152:211–220. doi:10.1007/s00221-003-1540-3. PMID 12845511.
- Gerritsen KGM, van den Bogert AJ, Nigg BM (1995). Direct dynamics simulation of the impact phase in heel-toe running. *J Biomech* 28:661–668. doi:10.1016/0021-9290(94)00127-P. PMID 7601865.
- Getz EB, Cooke R, Lehman SL (1998). Phase transition in force during ramp stretches of skeletal muscle. *Biophys J* 75:2971–2983. doi:10.1016/S0006-3495(98)77738-0. PMID 9826617.
- Golkar MA, Sobhani Tehrani E, Kearney RE (2017). Linear parameter varying identification of dynamic joint stiffness during time-varying voluntary contractions. *Front Comput Neurosci* 11:35. doi:10.3389/fncom.2017.00035. PMID 28579954.
- Gomi H, Osu R (1998). Task-dependent viscoelasticity of human multijoint arm and its spatial characteristics for interaction with environments. *J Neurosci* 18:8965–8978. doi:10.1523/JNEUROSCI.18-21-08965.1998. PMID 9787002.
- Haeufle DFB, Grimmer S, Seyfarth A (2010). The role of intrinsic muscle properties for stable hopping: stability is achieved by the force-velocity relation. *Bioinspir Biomim* 5:016004. doi:10.1088/1748-3182/5/1/016004. PMID 20185859.
- Hansen P, Bojsen-Moller J, Aagaard P, Kjaer M, Magnusson SP (2006). Mechanical properties of the human patellar tendon, in vivo. *Clin Biomech* 21:54–58. doi:10.1016/j.clinbiomech.2005.07.008. PMID 16183183.
- He J, Levine WS, Loeb GE (1991). Feedback gains for correcting small perturbations to standing posture. *IEEE Trans Autom Control* 36(3). (Existence verified; pages not verified.)
- Héroux ME, Dakin CJ, Luu BL, Inglis JT, Blouin JS (2014). Absence of lateral gastrocnemius activity and differential motor unit behavior in soleus and medial gastrocnemius during standing balance. *J Appl Physiol* 116:140–148. doi:10.1152/japplphysiol.00906.2013. PMID 24311748.
- Hill DK (1968). Tension due to interaction between the sliding filaments in resting striated muscle. The effect of stimulation. *J Physiol* 199:637–684. doi:10.1113/jphysiol.1968.sp008672. PMID 5710425.
- Hug F, Lacourpaille L, Nordez A (2011). Electromechanical delay measured during a voluntary contraction should be interpreted with caution. *Muscle Nerve* 44:838–839. doi:10.1002/mus.22139. PMID 22006702.
- Joyce GC, Rack PMH, Westbury DR (1969). The mechanical properties of cat soleus muscle during controlled lengthening and shortening movements. *J Physiol* 204:461–474. doi:10.1113/jphysiol.1969.sp008924. PMID 5824647.
- Katz B (1939). The relation between force and speed in muscular contraction. *J Physiol* 96:45–64. doi:10.1113/jphysiol.1939.sp003756. PMID 16995114. (Citation verified; the quoted numbers were not verified against the text.)
- Kearney RE, Hunter IW (1982). Dynamics of human ankle stiffness: variation with displacement amplitude. *J Biomech* 15:753–756. doi:10.1016/0021-9290(82)90090-2. PMID 7153228.
- Kearney RE, Hunter IW (1990). System identification of human joint dynamics. *Crit Rev Biomed Eng* 18:55–87. PMID 2204515.
- Kistemaker DA, van Soest AJ, Bobbert MF (2006). Is equilibrium point control feasible for fast goal-directed single-joint movements? *J Neurophysiol* 95:2898–2912. doi:10.1152/jn.00983.2005. PMID 16436480.
- Konradsen L, Voigt M, Højsgaard C (1997). Ankle inversion injuries: the role of the dynamic defense mechanism. *Am J Sports Med* 25:54–58. doi:10.1177/036354659702500110. PMID 9006692.
- Krajcarski SR, Potvin JR, Chiang J (1999). The in vivo dynamic response of the spine to perturbations causing rapid flexion: effects of pre-load and step input magnitude. *Clin Biomech* 14:54–62. doi:10.1016/S0268-0033(98)00048-5. PMID 10619090.
- Kyröläinen H, Avela J, Komi PV (2005). Changes in muscle activity with increasing running speed. *J Sports Sci* 23:1101–1109. doi:10.1080/02640410400021575. PMID 16194986.
- Lakie M, Campbell KS (2019). Muscle thixotropy: where are we now? *J Appl Physiol* 126:1790–1799. doi:10.1152/japplphysiol.00788.2018. PMID 31070959.
- Lavender SA, Marras WS (1995). The effects of a temporal warning signal on the biomechanical preparations for sudden loading. *J Electromyogr Kinesiol* 5:45–56. doi:10.1016/S1050-6411(99)80005-4. PMID 20719636.
- Lee H, Rouse EJ, Krebs HI (2016). Summary of human ankle mechanical impedance during walking. *IEEE J Transl Eng Health Med* 4:2100407. doi:10.1109/JTEHM.2016.2601613. PMID 27766187.
- Lichtwark GA, Wilson AM (2005). In vivo mechanical properties of the human Achilles tendon during one-legged hopping. *J Exp Biol* 208:4715–4725. doi:10.1242/jeb.01950. PMID 16326953.
- Loeb GE, Brown IE, Cheng EJ (1999). A hierarchical foundation for models of sensorimotor control. *Exp Brain Res* 126:1–18. doi:10.1007/s002210050712. PMID 10333003.
- Lombardi V, Piazzesi G (1990). The contractile response during steady lengthening of stimulated frog muscle fibres. *J Physiol* 431:141–171. doi:10.1113/jphysiol.1990.sp018324. PMID 2100305.
- Maffiuletti NA, Aagaard P, Blazevich AJ, Folland J, Tillin N, Duchateau J (2016). Rate of force development: physiological and methodological considerations. *Eur J Appl Physiol* 116:1091–1116. doi:10.1007/s00421-016-3346-6. PMID 26941023.
- Maganaris CN, Paul JP (2002). Tensile properties of the in vivo human gastrocnemius tendon. *J Biomech* 35:1639–1646. doi:10.1016/S0021-9290(02)00240-3. PMID 12445617.
- Magnusson SP, Hansen P, Aagaard P, et al. (2003). Differential strain patterns of the human gastrocnemius aponeurosis and free tendon, in vivo. *Acta Physiol Scand* 177:185–195. doi:10.1046/j.1365-201X.2003.01048.x. PMID 12558555.
- Mansour JM, Audu ML (1986). The passive elastic moment at the knee and its influence on human gait. *J Biomech* 19:369–373. doi:10.1016/0021-9290(86)90013-8. (Verified via a reference list.)
- McGill S, Seguin J, Bennett G (1994). Passive stiffness of the lumbar torso in flexion, extension, lateral bending, and axial rotation. *Spine* 19:696–704. doi:10.1097/00007632-199403001-00009. PMID 8009335.
- Mirbagheri MM, Barbeau H, Kearney RE (2000). Intrinsic and reflex contributions to human ankle stiffness. *Exp Brain Res* 135:423–436. (ABI-1.)
- Moorhouse KM, Granata KP (2007). Role of reflex dynamics in spinal stability: intrinsic muscle stiffness alone is insufficient for stability. *J Biomech* 40:1058–1065. doi:10.1016/j.jbiomech.2006.04.018. PMID 16782106.
- Moritz CT, Farley CT (2004). Passive dynamics change leg mechanics for an unexpected surface during human hopping. *J Appl Physiol* 97:1313–1322. doi:10.1152/japplphysiol.00393.2004. PMID 15169748.
- Mussa-Ivaldi FA, Hogan N, Bizzi E (1985). Neural, mechanical, and geometric factors subserving arm posture in humans. *J Neurosci* 5:2732–2743. doi:10.1523/JNEUROSCI.05-10-02732.1985. PMID 4045550.
- Nazon YF, Doshi RM, Rouse EJ (2021). Validation of methods for estimation of knee joint mechanical impedance during locomotion using a torque-controllable knee exoskeleton. *J Biomech Eng*. doi:10.1115/1.4051843. (Verified from the article PDF; volume and pages not recorded.)
- Perreault EJ, Kirsch RF, Crago PE (2001). Effects of voluntary force generation on the elastic components of endpoint stiffness. *Exp Brain Res* 141:312–323. doi:10.1007/s002210100880. PMID 11715075.
- Perreault EJ, Kirsch RF, Crago PE (2004). Multijoint dynamics and postural stability of the human arm. *Exp Brain Res* 157:507–517. doi:10.1007/s00221-004-1864-7. PMID 15112115.
- Pfeifer S, Vallery H, Hardegger M, Riener R, Perreault EJ (2012). Model-based estimation of knee stiffness. *IEEE Trans Biomed Eng* 59:2604–2612. doi:10.1109/TBME.2012.2207895. PMID 22801482.
- Rack PMH, Westbury DR (1974). The short range stiffness of active mammalian muscle and its effect on mechanical properties. *J Physiol* 240:331–350. doi:10.1113/jphysiol.1974.sp010613. PMID 4424163.
- Rajagopal A, Dembia CL, DeMers MS, Delp DD, Hicks JL, Delp SL (2016). Full-body musculoskeletal model for muscle-driven simulation of human gait. *IEEE Trans Biomed Eng* 63:2068–2079. doi:10.1109/TBME.2016.2586891. PMID 27392337. (Muscle parameters read from the OpenSim model file Rajagopal2016.osim.)
- Riener R, Edrich T (1999). Identification of passive elastic joint moments in the lower extremities. *J Biomech* 32:539–544. doi:10.1016/S0021-9290(99)00009-3. PMID 10327008.
- Rouse EJ, Hargrove LJ, Perreault EJ, Kuiken TA (2014). Estimation of human ankle impedance during the stance phase of walking. *IEEE Trans Neural Syst Rehabil Eng* 22:870–878. doi:10.1109/TNSRE.2014.2307256. PMID 24760937.
- Sakanaka TE, Gill J, Lakie MD, Reynolds RF (2018). Intrinsic ankle stiffness during standing increases with ankle torque and passive stretch of the Achilles tendon. *PLoS One* 13:e0193850. doi:10.1371/journal.pone.0193850. PMID 29558469.
- Sakanaka TE, Lakie M, Reynolds RF (2021). Individual differences in intrinsic ankle stiffness and their relationship to body sway and ankle torque. *PLoS One* 16:e0244993. doi:10.1371/journal.pone.0244993. PMID 33481823.
- Shamaei K, Sawicki GS, Dollar AM (2013a). Estimation of quasi-stiffness of the human knee in the stance phase of walking. *PLoS One* 8:e59993. doi:10.1371/journal.pone.0059993. PMID 23533662.
- Shamaei K, Sawicki GS, Dollar AM (2013b). Estimation of quasi-stiffness of the human hip in the stance phase of walking. *PLoS One* 8:e81841. doi:10.1371/journal.pone.0081841. PMID 24349136.
- Silder A, Whittington B, Heiderscheit B, Thelen DG (2007). Identification of passive elastic joint moment-angle relationships in the lower extremity. *J Biomech* 40:2628–2635. doi:10.1016/j.jbiomech.2006.12.017. PMID 17359981.
- Sinkjaer T, Toft E, Andreassen S, Hornemann BC (1988). Muscle stiffness in human ankle dorsiflexors: intrinsic and reflex components. *J Neurophysiol* 60:1110–1121. doi:10.1152/jn.1988.60.3.1110. PMID 3171659.
- Thelen DG (2003). Adjustment of muscle mechanics model parameters to simulate dynamic contractions in older adults. *J Biomech Eng* 125:70–77. doi:10.1115/1.1531112. PMID 12661198.
- Tillin NA, Jimenez-Reyes P, Pain MTG, Folland JP (2010). Neuromuscular performance of explosive power athletes versus untrained individuals. *Med Sci Sports Exerc* 42:781–790. doi:10.1249/MSS.0b013e3181be9c7e. PMID 19952835.
- Toft E, Sinkjaer T, Andreassen S, Larsen K (1991). Mechanical and electromyographic responses to stretch of the human ankle extensors. *J Neurophysiol* 65:1402–1410. doi:10.1152/jn.1991.65.6.1402. PMID 1875249.
- Tsuji K, Ishida H, Oba K, Ueki T, Fujihashi Y (2015). Activity of lower limb muscles during treadmill running at different velocities. *J Phys Ther Sci* 27:353–356. doi:10.1589/jpts.27.353. PMID 25729166.
- van der Kooij H, Fricke SS, van 't Veld RC, Vallinas Prieto A, Keemink AQL, Schouten AC, van Asseldonk EHF (2022). Identification of hip and knee joint impedance during the swing phase of walking. *IEEE Trans Neural Syst Rehabil Eng* 30:1203–1212. doi:10.1109/TNSRE.2022.3172497. PMID 35503817.
- van der Krogt MM, de Graaf WW, Farley CT, Moritz CT, Casius LJR, Bobbert MF (2009). Robust passive dynamics of the musculoskeletal system compensate for unexpected surface changes during human hopping. *J Appl Physiol* 107:801–808. doi:10.1152/japplphysiol.91189.2008. PMID 19589956.
- van Soest AJ, Bobbert MF (1993). The contribution of muscle properties in the control of explosive movements. *Biol Cybern* 69:195–204. doi:10.1007/BF00198959. PMID 8373890.
- Vieira TMM, Loram ID, Muceli S, Merletti R, Farina D (2012). Recruitment of motor units in the medial gastrocnemius muscle during human quiet standing: is recruitment intermittent? What triggers recruitment? *J Neurophysiol* 107:666–676. doi:10.1152/jn.00659.2011. PMID 21994258.
- Vlutters M, Boonstra TA, Schouten AC, van der Kooij H (2015). Direct measurement of the intrinsic ankle stiffness during standing. *J Biomech* 48:1258–1263. doi:10.1016/j.jbiomech.2015.03.004. PMID 25843262.
- Ward SR, Eng CM, Smallwood LH, Lieber RL (2009). Are current measurements of lower extremity muscle architecture accurate? *Clin Orthop Relat Res* 467:1074–1082. doi:10.1007/s11999-008-0594-8. PMID 18972175. (Architecture values used via the Rajagopal 2016 model.)
- Watt AA, Callaway AJ, Williams JM (2022). In vivo through-range passive stiffness of the lumbar spine: a meta-analysis of measurements and methods. *Med Biol Eng Comput* 60:2133–2157. doi:10.1007/s11517-022-02609-w. PMID 35776374.
- Weiss PL, Hunter IW, Kearney RE (1988). Human ankle joint stiffness over the full range of muscle activation levels. *J Biomech* 21:539–544. doi:10.1016/0021-9290(88)90217-5. PMID 3410857.
- Weiss PL, Kearney RE, Hunter IW (1986). Position dependence of ankle joint dynamics, I: passive mechanics. *J Biomech* 19:727–735. doi:10.1016/0021-9290(86)90196-X. PMID 3793747.
- Westing SH, Seger JY, Thorstensson A (1990). Effects of electrical stimulation on eccentric and concentric torque-velocity relationships during knee extension in man. *Acta Physiol Scand* 140:17–22. doi:10.1111/j.1748-1716.1990.tb08971.x. PMID 2275401.
- Winters JM, Stark L (1988). Estimated mechanical properties of synergistic muscles involved in movements of a variety of human joints. *J Biomech* 21:1027–1041. doi:10.1016/0021-9290(88)90249-7. PMID 2577949.
- Yoon YS, Mansour JM (1982). The passive elastic moment at the hip. *J Biomech* 15:905–910. doi:10.1016/0021-9290(82)90008-2. PMID 7166551.
- Zajac FE (1989). Muscle and tendon: properties, models, scaling, and application to biomechanics and motor control. *Crit Rev Biomed Eng* 17:359–411. PMID 2676342.
- Zhang LQ, Nuber G, Butler J, Bowen M, Rymer WZ (1998). In vivo human knee joint dynamic properties as functions of muscle contraction and joint position. *J Biomech* 31:71–76. doi:10.1016/S0021-9290(97)00106-1. PMID 9596540.
- Zhang LQ, Rymer WZ (1997). Simultaneous and nonlinear identification of mechanical and reflex properties of human elbow joint muscles. *IEEE Trans Biomed Eng* 44:1192–1209. doi:10.1109/10.649991. PMID 9401219.

**Cited from ABI-1** (see `abi1/research/BALANCE_LITERATURE.md` §15 for full references): Loram & Lakie 2002; Casadio et al. 2005; Loram et al. 2007a,b; Pasma et al. 2017; Peterka 2002; Rietdyk et al. 1999; Welch & Ting 2008; Nordez et al. 2009; Cavanagh & Komi 1979; Aagaard et al. 2002; Schieppati & Nardone 1997; Mrachacz-Kersting et al. 2004; Carpenter et al. 1999; Horak & Nashner 1986; Allum et al. 2011; Campbell et al. 2013.

<!-- Compiled on 11 Oct 2026 by a research subagent of the ABI-1 session (web search of PubMed / Europe PMC records, abstracts and open full texts). Its citations were checked by that agent, not independently re-verified by the session author; evidence labels [M] / [MODEL] / [I] / [U] are its own. Copied verbatim from the session scratchpad. -->

# Human reactive balance, 0–300 ms after an unexpected mechanical disturbance

Literature summary for preregistering a minimal, outcome-blind, delay-respecting joint-torque balance controller for a simulated footballer (73 kg, ~1.8 m, 14 rigid bodies) who is slide-tackled from behind. The tackler's boot strikes the back of the planted right shin, then sweeps the right foot ~0.6 m forward in ~100 ms while the left foot stays planted.

Compiled 11 Oct 2026. Every primary citation below was checked this session against its PubMed/Europe PMC record (title, authors, journal, year, volume, pages), and where available against the abstract or open full text. Numbers taken from abstracts or open full text are marked as such. A small number of robotics/graphics citations were checked for existence only; they are flagged.

## 0. Conventions

**Evidence labels** (used on every number):

- **[M]** MEASURED in the cited study. The population and perturbation are given in brackets.
- **[MODEL]** a parameter fitted or assumed in a published model, not a direct measurement.
- **[I]** INFERRED or EXTRAPOLATED by me, from the cited data plus physics, scaling or arithmetic. The derivation is shown.
- **[U]** UNVERIFIED: a plausible value I could not confirm against a source this session. Do not preregister it without checking.

**Other conventions:**

- **t = 0** is perturbation onset, i.e. first boot–shin contact. All latencies run from t = 0 unless stated otherwise.
- **EMG onset ≠ torque onset.** Torque onset is EMG onset plus electromechanical delay (EMD). Measurable joint torque then lags further while force builds.

### 0.1 Scenario physics (all [I] unless noted)

| Quantity | Value | Derivation |
|---|---|---|
| CoM height *l* | ≈1.0 m | ≈0.55–0.57 × stature (standard anthropometry, [U] exact coefficient) |
| ω₀ = √(g/l) | ≈3.13 s⁻¹ (1/ω₀ ≈ 0.32 s) | Hof et al. 2005 definition |
| Gravitational "load stiffness" at the ankle, *mgh* | ≈670 N·m/rad (≈11.7 N·m/deg) | 73 kg × 9.81 × ~0.94 m (CoM height above ankle axis) |
| Mean foot sweep speed | 6 m/s (0.6 m / 0.1 s). Peak 9–12 m/s, depending on profile (half-sine to constant-acceleration) | kinematics |
| Implied foot acceleration | ~120 m/s² (~12 g) if constant | 2d/t² |
| Lab comparison | Platform translations in the classic studies peak at 0.05–0.55 m/s [M, Runge et al. 1999] or 0.25 m/s / 0.3 g [M, Welch & Ting 2008] | — |

**Consequences [I]:**

- **The sweep (0–100 ms) is over before any automatic postural response can produce torque.** Postural-response EMG starts at about 75–110 ms; corrective torque at about 120–160 ms (§3).
- **The sweep phase is governed by passive/intrinsic mechanics and contact forces.** Only short-latency reflexes could add a little torque from about 50–80 ms (§2).
- **Active balance acts on the consequences of the sweep.** By then the right foot is ~0.6 m forward and largely unloaded (riding on the boot or airborne). The support polygon has collapsed to the left foot, and the CoM lies medial (rightward) of it by roughly half the stance width.

## 1. Passive/intrinsic vs active neuromuscular response

### 1.1 Intrinsic ankle stiffness in quiet stance

- **Loram & Lakie 2002**, *J Physiol* 545:1041–1053. Small, unobtrusive foot perturbations from a piezo translator during free standing, sized like natural sway; no stretch reflex in soleus or gastrocnemius.
  - Intrinsic ankle stiffness was **91 ± 23 % of the stiffness needed for minimal stabilisation (mgh)** [M, healthy adults, abstract].
  - It was "substantially constant, increasing only slightly with ankle torque". It was attributed to foot, Achilles tendon and aponeurosis, and **cannot be neurally regulated in quiet standing**.
  - Conclusion: **intrinsic stiffness alone is insufficient**, so active (neural) torque modulation is required.
- **Casadio, Morasso & Sanguineti 2005**, *Gait Posture* 21:410–424. Motorised footplate, step disturbances of 1° over 150 ms, with estimates chosen to precede reflex influence.
  - Intrinsic stiffness was **64 ± 8 % of critical stiffness** [M, abstract].
  - The authors treat 64 % (1° disturbances) and 91 % (tiny disturbances) as the lower and upper bounds for normal sway.
- **Loram, Maganaris & Lakie 2007a**, *J Physiol* 584:661–675 (passive calf, i.e. relaxed muscles; subject supported). Stiffness falls sharply with amplitude:
  - short range (<0.2°, 0.15–0.4° rotations): **3.0–3.6 N·m/deg, 67 ± 10 % mgh** [M];
  - long range (7°): **0.81 ± 0.3 N·m/deg, 13–19 % mgh** [M];
  - stiffness ∝ rotation^−0.33 [M]. (Values from a WebFetch summary of the open full text.)
- **Loram et al. 2007b**, *J Physiol* 584:677–692. Short-range stiffness lies in the contractile component. Series-elastic (tendon) stiffness ≈ **77 ± 13 % mgh** [M] and limits stiffness for small rotations.
- **Winter et al. 1998** (*J Neurophysiol* 80:1211–1221) and **2001** (*J Neurophysiol* 85:2630–2633) argued for "stiffness control" with stiffness above the gravitational spring. In 2001, a regression of ankle moment on sway angle in 10 subjects gave R² ≈ 0.92 [M].
  - This was rebutted by **Morasso & Schieppati 1999** (*J Neurophysiol* 82:1622–1626) and **Morasso & Sanguineti 2002** (*J Neurophysiol* 88:2157–2162). They argue that CoP–CoM in-phase behaviour is dictated by physics and that physiological ankle stiffness cannot stabilise the pendulum without anticipatory/active control.
  - The consensus after Loram & Lakie 2002 is that intrinsic stiffness is just below critical.
- **Kearney/Hunter group (system identification, supine, isolated ankle):**
  - **Hunter & Kearney 1982**, *J Biomech* 15:747–752: second-order (I, B, K) model; B and K rise with mean torque [M, qualitative].
  - **Weiss, Hunter & Kearney 1988**, *J Biomech* 21:539–544: K rises in proportion to mean ankle torque, by more than an order of magnitude from rest to MVC; damping ratio ζ is almost invariant [M, qualitative]. Absolute values were not extracted (abstract only).
  - **Mirbagheri, Barbeau & Kearney 2000**, *Exp Brain Res* 135:423–436: intrinsic stiffness rises monotonically with contraction; reflex stiffness peaks at low contraction. The reflex share of total stiffness ranged **~1 % to 55 %** across subjects [M]. Their reflex pathway model is delay → half-wave rectifier → low-pass filter [MODEL].

**Model-dependence warning [MODEL].** Closed-loop identification gives much lower "intrinsic" values than the direct measurements above.

- **Pasma et al. 2017** (*Front Comput Neurosci* 11:99; independent-channel model after Peterka 2002), defaults for a 75 kg subject with CoM 0.83 m:
  - intrinsic K = **40.5 N·m/rad**, intrinsic B = **68.8 N·m·s/rad**;
  - active K_P = **943.9 N·m/rad**, K_D = **313.5 N·m·s/rad**, time delay τ_D = **0.097 s** (lowered because activation dynamics, ω = 16.8 rad/s and ζ = 0.99, were added) [MODEL, Table 1 of the open full text].
- **Peterka 2002** (*J Neurophysiol* 88:1097–1118): fitted stiffness was "always about **1/3 larger** than necessary to resist the destabilizing torque due to gravity", i.e. ≈1.33 mgh [M/MODEL, abstract]. Its fitted time delays were not extracted [U].

### 1.2 Hip/knee/trunk intrinsic mechanics

- **Rietdyk et al. 1999**, *J Biomech* 32:1149–1158. Medio-lateral pushes to the trunk/pelvis in 10 men.
  - Joint-moment onset was synchronous with joint-angle change and **occurred at 56–116 ms, "too early … to be result of active muscle contraction"**. "The first line of defense was provided by muscle stiffness" [M, abstract].
  - Hip + spine moments supplied ≈85 % of the recovery, the ankles ≈15 % [M].
- **Henry, Fung & Horak 2001**, *J Neurophysiol* 85:559–570. Wide stance relies more on passive stiffness from limb geometry; narrow stance needs more active loading/unloading control. EMG latencies are unchanged with stance width [M, qualitative].
- **Data gap.** I found no direct, verified measurements of intrinsic knee or hip stiffness (N·m/rad) in loaded stance. Treat knee/hip intrinsic impedance as a free but bounded parameter. Recommendation [I]: scale it relative to ankle values and report a sensitivity analysis.

### 1.3 Fraction of required stiffness and implications [I]

- For this subject, critical ankle stiffness ≈ mgh ≈ 670 N·m/rad. Intrinsic ankle stiffness is ≈430–610 N·m/rad (64–91 %) for sub-degree motions.
- It falls to roughly 90–130 N·m/rad (13–19 % mgh) for multi-degree rotations, extrapolating the passive-muscle data of Loram et al. 2007a. During a violent sweep, short-range stiffness is exceeded within a fraction of a degree, so the passive "spring" is soft.
- Active ankle stiffness seen in closed-loop fits is ≈1.3–1.55 mgh (Peterka 2002; Pasma 2017 ratio 943.9/(75 × 9.81 × 0.83) ≈ 1.55). For this subject that is ≈870–1040 N·m/rad. Active damping ≈ 0.5 s × mgh ≈ 340 N·m·s/rad (Pasma ratio 313.5/611). Both scalings are [I].

## 2. Stretch-reflex components (leg muscles)

| Muscle / context | Short latency (M1/SLR) | Medium (M2/MLR) | Long (M3/LLR) | Source |
|---|---|---|---|---|
| Soleus, standing, dorsiflexing platform perturbation | **42.4 ms** (47.0 when cooled) | **72.0 ms** (82.3 cooled) | — | [M] Schieppati & Nardone 1997, *J Physiol* 503:691–698. Group II afferents proposed for the MLR |
| Soleus/FDB standing, tilt and translation | SLR = true autogenetic stretch reflex (follows H/T reflex) | MLR spinal, slower afferents (~29 m/s, FDB) | LLR in TA/EDB for toe-up/backward translation | [M] Schieppati et al. 1995, *Exp Brain Res* 105:411–422 |
| Triceps surae, toe-up platform rotation (n = 20) | **55–65 ms** | **108–123 ms** (higher speeds/amplitudes) | Compensatory LLR in **TA 130–145 ms** | [M] Diener et al. 1984, *Exp Brain Res* 56:126–134 |
| TA, toe-down rotation | none | **103–118 ms** | Late compensatory triceps response **139–170 ms** | [M] Diener et al. 1984 |
| Soleus vs gastrocnemius, standing translation | Ankle-motion-triggered component: soleus **35–50 ms** onset, gastrocnemius **75–85 ms** | — | Body-sway-triggered component **95–100 ms**, ending 145–155 ms | [M] Hiraoka et al. 2020, *Brain Sci* 10:230 |
| Quadriceps (RF/VL/VM), imposed knee flexion | **23–25 ms** (23 ± 1, 24 ± 1, 23 ± 1 ms in gait; RF 25 ± 2 ms sitting) | MLR/LLR windows defined | Transcortical contribution possible to later bursts | [M] Mrachacz-Kersting et al. 2004, *Exp Brain Res* 159:108–122; 2006, *Exp Brain Res* 168:529–540 |
| Hamstrings (biceps femoris), anterior tibial translation (KT-2000) | **58.9 ± 17.9 ms** ("ACL–hamstring reflex"; elicited in only 38.5 % of trials) | — | — | [M] Abulhasan et al. 2016, *J Exp Orthop* 3:4 |
| Paraspinals, multidirectional rotations | Stretch reflex onset **~60 ms**; unloading reflex **~40 ms** | Windows: SR 40–100 and 80–120 ms | Balance-correcting 120–220 and 240–340 ms | [M] Carpenter, Allum & Honegger 1999, *Exp Brain Res* 129:93–113 |
| Stumbling (swing-leg collision with obstacle, treadmill) | RP1 **~40 ms** (impact stretch reflex) | RP2 **~75 ms** | RP3 **~110 ms**, RP4 **~160 ms** (these determine elevating vs lowering strategy) | [M] Schillings et al. 2000, *J Neurophysiol* 83:2093–2102 |

**Functional caveats [M]:**

- **Short- and medium-latency responses can be destabilising.** In toe-up rotation the stretched triceps responses "enforce the induced backward displacement". Stabilisation comes from the antagonist's long-latency response (Diener et al. 1984).
- **Reflex gain is task/set dependent and adaptable** (Nashner 1976, *Exp Brain Res* 26:59–72). Only 5 of 12 subjects used long-latency (~120 ms) stretch reflexes to reduce sway, and gain adapted over 3–5 trials.
- **Cortical involvement increases with latency** (review: Jacobs & Horak 2007, *J Neural Transm* 114:1339–1348).

**Delay budget for the fastest reflex [I, from More & Donelan 2018].** More & Donelan (*Proc R Soc B* 285:20180613) give allometric coefficients, delay = a·M^b, from the open full text:

| Component | a | b |
|---|---|---|
| Sensing | 0.6 ms | 0 |
| Nerve conduction | 5.3 ms | 0.30 |
| Synaptic | 0.7 ms | 0 |
| Neuromuscular junction | 0.9 ms | 0 |
| Electromechanical | 4.3 ms | 0.21 |
| Force generation (time to peak twitch force) | 17.6 ms | 0.20 |
| Total | 31.0 ms | 0.21 |

For M = 73 kg this gives [I]: conduction ≈ 19 ms, constants ≈ 2 ms, EMD ≈ 11 ms, force generation ≈ 42 ms, total ≈ 76 ms. The first detectable force would therefore come about 33 ms after stimulus in a generic 73 kg mammal. Humans are tall for their mass, which fits the measured soleus SLR of 35–50 ms (EMG). Peak reflex force arrives about 40 ms after that.

## 3. Automatic postural responses (support-surface perturbations)

- **Horak & Nashner 1986**, *J Neurophysiol* 55:1369–1381. Forward/backward translations on a normal surface.
  - Stereotyped leg and trunk activation at **73–110 ms** [M].
  - "Activity began in the ankle joint muscles and then radiated in sequence to thigh and then trunk muscles" on the same body aspect (**distal-to-proximal**) [M]. This produced compensatory ankle torque, i.e. the **ankle strategy**.
  - On short surfaces: similar latencies, but antagonistic trunk/thigh muscles fired **proximal-to-distal** with little ankle torque and a horizontal shear force, i.e. the **hip strategy** [M].
  - Latencies were unchanged during the first trials after a change of surface [M].
- **Nashner 1977**, *Exp Brain Res* 30:13–24. Patterns at "functional stretch response latency (100–120 msec)" are preprogrammed and fixed, sequencing from the ankle proximally [M, abstract].
  - I could not verify the exact inter-segment lags (ankle → thigh → trunk) [U]. Do not hard-code a specific value without the paper.
- **Horak, Diener & Nashner 1989**, *J Neurophysiol* 62:841–853. Central set changes response magnitude (scaling disappears when amplitudes are randomised; subjects over- or under-respond to expected amplitudes). Initial EMG latencies were unaffected: **100 ± 20 ms (mean ± SD)** [M].
- **Henry, Fung & Horak 1998**, *J Neurophysiol* 80:1939–1950 (12 directions). Shank and thigh latencies were constant across directions. TFL, rectus abdominis and erector spinae were "early or late" depending on direction [M, qualitative].
- **Dietz, Horstmann & Berger 1989**, *J Neurophysiol* 62:680–693. The most scenario-relevant lab paradigm: **unilateral** split-belt displacement of one foot during stance.
  - Unilateral perturbations evoked **bilateral** responses: TA for forward-directed displacements, gastrocnemius for backward.
  - Onset **displaced leg 75–96 ms, non-displaced leg 93–112 ms** [M]. Amplitude scales with belt acceleration. TA responses relate to acceleration, gastrocnemius responses to velocity [M].
  - **Berger, Dietz & Quintern 1984** (*J Physiol* 357:109–125): unilateral displacement during static standing evoked a bilateral TA activation [M].
- **Allum et al. 2002**, *J Physiol* 542:643–663. Pitch/roll rotations, 7.5° at 30 or 60°/s; 36 subjects aged 20–75.
  - Balance-correcting ankle EMG in the 120–220 ms window, delayed 20–30 ms in the elderly.
  - **Ankle torque responses differed from ~160 ms** [M]. This is evidence that corrective torque is present by ≈160 ms after rotation onset.
- **Beck et al. 2023**, *Sci Robot* 8:eadf1080. Backward support-surface translations, n = 10 young adults.
  - Soleus reactive EMG onset **101 ± 14 ms**; soleus fascicles began shortening at **108 ± 22 ms** (B-mode ultrasound) [M].
  - The authors estimate balance-correcting plantar-flexion moments start **≈130 ms** after perturbation onset [I by the authors: EMG + literature EMD of 10–50 ms].
  - Exoskeleton torque delivered **before** physiological torque onset (from 68 ± 11 ms) improved the balance threshold by 9 %. Torque from 171 ± 15 ms did not [M]. **A controller that acts before ~130 ms is acting faster than human physiology.**
- **Welch & Ting 2008**, *J Neurophysiol* 99:1032–1038 (7 young adults; 12 cm, 25 cm/s, 0.3 g translations).
  - The **entire EMG time course** in ankle, knee, hip and trunk muscles was reconstructed by **delayed feedback of CoM acceleration, velocity and displacement with a common delay** [M/MODEL]. Variance accounted for exceeded 75 % in ankle muscles and 67 % proximally.
  - The delay was bounded to 60–250 ms. The optimiser consistently chose the minimum, so it was fixed at **100 ms** for group analysis [MODEL]. Muscle torque came from EMG via a first-order filter with a **40 ms time constant** [MODEL].
  - Without acceleration feedback, unphysiologically short delays (10–60 ms) were needed [M/MODEL].
- **Electromechanical delay.**
  - Voluntary EMD in elbow flexors: **49.5 ms** (eccentric) to **55.5 ms** (concentric) [M, Cavanagh & Komi 1979, *Eur J Appl Physiol* 42:159–163].
  - Electrically evoked EMD in gastrocnemius medialis: **11.6 ± 1.5 ms** (ultrasound; passive series-elastic share ≈47 %) [M, Nordez et al. 2009, *J Appl Physiol* 106:1970–1975].
  - Literature range used by Beck et al. 2023: 10–50 ms.

**Synthesis [I].**

| Phase | Timing after perturbation onset |
|---|---|
| Postural-response EMG onset | ≈75–110 ms (displaced side earliest; contralateral leg ~15–20 ms later) |
| First active corrective ankle torque | ≈120–160 ms (central 130 ms) |
| Peak corrective torque | later; not modelled here |

## 4. Ankle vs hip vs stepping strategies, and the mechanics

**Selection evidence:**

- **Surface length.** Hip strategy on short supports (Horak & Nashner 1986) [M].
- **Perturbation velocity.** Backward translations of 5–55 cm/s (**Runge et al. 1999**, *Gait Posture* 10:161–170): joint torques show a **hip-flexor torque added to the ankle plantar-flexor torque during fast translations**. There is a continuum, and **"pure hip strategy (hip torque without ankle torque) was not observed"** [M].
- **Biomechanical feasibility** (**Kuo & Zajac 1993**, *Prog Brain Res* 97:349–358). With knees straight, feasible accelerations favour ankle:hip motion in a **1:3 ratio** (hip strategy). The ankle strategy needs more muscle activation per unit of horizontal CoM acceleration [MODEL].
- **Optimal control with delay** (**Kuo 1995**, *IEEE TBME* 42:87–101). Optimal control plus estimation reproduces strategy selection. Time delay limits which strategies are stable [MODEL].

**Mechanics:**

- **Three mechanisms** (**Hof 2007**, *J Biomech* 40:451–457). CoM horizontal acceleration is driven by:
  1. CoP displacement relative to the CoM projection;
  2. counter-rotation of segments about the CoM (angular momentum, i.e. CMP ≠ CoP);
  3. external forces other than the ground reaction force [M/MODEL].
- **Extrapolated CoM** (**Hof, Gazendam & Sinke 2005**, *J Biomech* 38:1–8):
  - XcoM = x + v/ω₀, ω₀ = √(g/l).
  - Dynamic stability requires XcoM to lie within the base of support (BoS).
  - Margin of stability b = distance from XcoM to the BoS edge; alternatively the temporal margin τ.
  - **Hof 2008** (*Hum Mov Sci* 27:112–125): a velocity disturbance Δv is compensated by shifting the CoP (foot placement) by **Δv/ω₀** [MODEL].
- **Capture point** (**Pratt, Carff, Drakunov & Goswami 2006**, *Humanoids 2006*, pp. 200–207). The point where a step brings the linear inverted pendulum to rest. It equals XcoM for the LIPM. With a flywheel (angular momentum), the capture region is enlarged.
- **Centroidal moment pivot** (**Popovic, Goswami & Herr 2005**, *IJRR* 24(12):1013–1032). The CMP coincides with the CoP when the moment about the CoM is zero. CMP–CoP separation measures how much angular momentum is being used.
- **Stability regions** (**Stephens 2011**, CMU-RI-TR-11-15, §3.3, checked in the PDF; builds on Stephens 2007, *Humanoids*, "Humanoid push recovery").
  - **CoP ("ankle") balancing** succeeds iff δ⁻ < x + ẋ/ω < δ⁺, i.e. the capture point lies inside the foot.
  - **CMP ("hip") balancing** with peak torso torque τ_max, torso inertia I and joint limit θ_max (bang-bang, T₂ = 2T₁, T_max = √(Iθ_max/τ_max)) enlarges this to δ⁻ − (τ_max/mg)(e^{ωT_max} − 1)² < x + ẋ/ω < δ⁺ + (τ_max/mg)(e^{ωT_max} − 1)².
  - **Outside that, step.** CoP balancing is preferred when possible, to keep the head/torso upright [MODEL].
- **CoM velocity–position feasibility.**
  - **Pai & Patton 1997** (*J Biomech* 30:347–354): forward-fall boundary from **1.1 s⁻¹ (velocity normalised to body height) at 2.4 foot-lengths behind the heel, to 0.45 s⁻¹ over the heel, to 0 over the toe**. For a 1.8 m subject, 0.45 s⁻¹ ≈ 0.81 m/s [I].
  - Friction (μ < 0.82) and strength (plantar-flexion strength reduced by more than 35 %) shrink the region [MODEL].
  - **Pai & Iqbal 1999** (*J Biomech* 32:779–786): forced sliding of the BoS shifts the stable region in the sliding direction [MODEL]. This is relevant because the tackle is a forced slide of one foot.
- **CoP limits within the foot.** The CoP cannot leave the active support polygon. I did not verify numeric functional-limit percentages of foot length [U]. Use the model's actual foot polygon minus a small margin, and treat that margin as a preregistered parameter.

## 5. Knee, pelvis/CoM, trunk and arm responses

- **Knee.**
  - In ankle-strategy responses to translations there is little knee/hip motion, yet thigh and pelvis muscle EMG is still well described by the same delayed CoM feedback (Welch & Ting 2008) [M].
  - Slip during gait (**Cham & Redfern 2001**, *J Biomech* 34:1439–1445): corrective **knee-flexion and hip-extensor moments** from ≈25 % to 45 % of stance (**≈190–350 ms after heel contact**) to pull the slipping foot back under the body. **The ankle acted as a passive joint** in fall trials [M].
  - Stance-leg slip EMG (**Chambers & Cham 2007**, *Gait Posture* 25:565–572): **medial hamstrings ≈175 ms, then vastus lateralis ≈240 ms** [M]. VL is delayed further in severe slips.
- **Pelvis/CoM.**
  - Task-level CoM feedback explains muscle activity throughout the body (Welch & Ting 2008) [M].
  - Medio-laterally, hip abductors/adductors control the CoP by the **load/unload mechanism** in side-by-side stance (**Winter et al. 1996**, *J Neurophysiol* 75:2334–2343; **Winter 1995**, *Gait Posture* 3:193–214) [M, qualitative].
- **Trunk counter-rotation.**
  - Young subjects show early, large trunk roll opposite to platform roll, which is lost with age (Allum et al. 2002) [M].
  - Paraspinal stretch reflex at ~60 ms and unloading reflex at ~40 ms (Carpenter et al. 1999) [M].
  - Young women used 93 % more torso extension than older women in response to anterior waist pulls (**Schulz et al. 2005**, *Gait Posture* 22:198–209) [M].
- **Hip abductors (walking, lateral pushes).** Gluteus medius responses at **≈100 ms and ≈170 ms**, plus a late reaction at **>270 ms**, facilitated in swing (**Hof & Duysens 2013**, *Exp Brain Res* 230:301–310) [M].
- **Arms:**
  - **Deltoid responses at 100 ms** in young adults (20–30 ms later in the elderly), with pitch/roll rotations; arm movements counterbalance the pelvis ("uphill") in the young (Allum et al. 2002) [M].
  - **McIlroy & Maki 1995** (*Neurosci Lett* 184:177–180): shoulder-muscle activation after platform translation is "**similar in timing to the 'automatic' ankle responses**". It is scaled to perturbation magnitude, persists when perturbations are expected, and is not caused by arm stretch [M, abstract]. The exact ms value was not extracted [U].
  - Slip during walking: arm, upper-body and unperturbed-limb muscles were recruited "**at the same latency**" as the perturbed limb (**Marigold, Bethune & Patla 2003**, *J Neurophysiol* 89:1727–1737). Perturbed-limb flexor synergy onset was **146–199 ms** (**Marigold & Patla 2002**, *J Neurophysiol* 88:339–353) [M].
  - Trips: arm movements **reduced forward angular momentum by 13 %** between trip and recovery-foot contact in young adults' elevating strategies (**Roos et al. 2008**, *Gait Posture* 27:352–356) [M].

## 6. Unloading/reloading and load transfer

- **Compensatory steps lack, or truncate, the anticipatory ML weight shift.** In 5 young adults, ML anticipatory postural adjustments (APAs) appeared in **70 %** of perturbation-evoked steps. They were "too small and brief" to move the CoM substantially, unlike light-cued voluntary steps (**McIlroy & Maki 1999**, *Gait Posture* 9:190–198) [M].
- **When required, a large APA can be added at little time cost.** With an obstacle in front: +137 % APA amplitude, +50 % duration, and only a **32 ms** foot-lift delay (**Zettel, McIlroy & Maki 2002**, *Exp Brain Res* 145:297–308) [M].
- **Lateral perturbations: the unloaded leg steps.** In 96 % of steps the leg unloaded by the perturbation was swung. A lateral component gave **20 % (90 ms) earlier foot-off, +20 % (7 cm) step length and +70 % (110 ms) swing duration** versus sagittal steps (**Maki, McIlroy & Perry 1996**, *J Biomech* 29:343–353) [M].
  - Back-calculation [I]: 90 ms = 20 % implies a sagittal foot-off ≈450 ms under "try not to step" instructions.
- **Waist-pull lateral steps.** Young adults used a single sidestep with the leg loaded passively by the pull; older adults used crossover/multiple steps (**Mille et al. 2005**, *Clin Biomech* 20:607–616) [M].
- **Swing-leg unloading onset** was similar in young and elderly (**McIlroy & Maki 1996**, *J Gerontol A* 51:M289–M296) [M, qualitative; timing not extracted].
- **Effect of an APA on foot-lift latency** (**Liu et al. 2003**, *Neurosci Lett* 336:1–4): with waist pulls, trials **with** an APA had **shorter** foot-lift latency, and larger APAs gave shorter latencies. This contrasts with platform studies [M].
- **Bilateral coupling.** Unilateral displacement evokes graded responses in both legs. The response is summed when both legs are displaced the same way and subtracted when they move in opposite directions (Dietz et al. 1989) [M]. For this scenario, expect the planted left leg to respond ~15–20 ms after the swept right leg [I].

## 7. Free/swing-leg responses in trips (and the most analogous slip data)

- **Eng, Winter & Patla 1994**, *Exp Brain Res* 102:339–349. Reflex latencies **60–140 ms** [M].
  - Early-swing trips: **elevating** strategy (swing-limb flexion; stance-limb extensor push, early heel-off).
  - Late-swing trips: **lowering** strategy (rapid foot placement, shorter step) [M].
- **Schillings et al. 2000**. Response peaks at ~40, ~75, ~110 and ~160 ms. Strategy-specific responses only after ~100 ms [M].
- **Support limb after tripping:**
  - **EMG 60–80 ms** in hamstrings and triceps surae (young and older; soleus +11 ms in older adults) (**Pijnappels et al. 2005a**, *Exp Brain Res* 160:326–333) [M].
  - The support limb restrains forward angular momentum (trip impact adds **≈11.4 kg·m²/s**) and gains time and clearance (**Pijnappels et al. 2004**, *J Biomech* 37:1811–1818) [M].
  - Older fallers show a lower rate of moment generation and a lower peak ankle moment (**Pijnappels et al. 2005b**, *Gait Posture* 21:388–394) [M].
- **Forward-slip analogues (the planted foot is driven forward):**
  - Bilateral leg/thigh responses at **90–140 ms**, 4–9 × walking EMG amplitude, 70–200 ms duration. Proximal (trunk/hip) responses were not earlier and adapted away (**Tang, Woollacott & Chong 1998**, *Exp Brain Res* 119:141–152) [M].
  - **Unilateral slips lead to "splits" falls.** All unilateral slips that ended in falls were splits falls (**Yang et al. 2012**, *J Biomech* 45:1259–1264; older adults) [M].
  - The scenario (one foot driven forward, the other planted) is mechanically a forced unilateral slip [I].

## 8. Reactive (compensatory) stepping

| Measure | Value | Population / perturbation | Source |
|---|---|---|---|
| Step onset (force-plate unloading) | **as early as 160 ms; mean 250 ms** | 7 young; forward platform translations | [M] McIlroy & Maki 1993, *Brain Res* 616:30–38 |
| Dynamic reaction time | **90.8 ms** | 8 subjects; release from forward lean, instructed to walk | [M] Do, Breniere & Brenguier 1982, *J Biomech* 15:933–939 |
| Braking of forward fall | **184–237 ms** | same | [M] Do et al. 1982 |
| Toe-off | **236–328 ms** (subject-dependent) | same | [M] Do et al. 1982 |
| Foot-off | **306 ± 25 ms** | 19 young (27.6 y); lean-and-release at ~13–15 % body weight | [M] Saumur et al. 2021, bioRxiv 10.1101/2021.01.18.427144 (**preprint**; units typed as "s" in the text but clearly ms) |
| Swing time | **168 ± 27 ms** | same | [M] Saumur et al. 2021 |
| Foot contact | **≈470 ms** | same | [I] 306 + 168 |
| Swing (compensatory vs voluntary) | ~140 vs ~200 ms | young adults | [U] (search-engine summary only, primary source not identified) |
| Maximum single-step lean angle | **32.5°** young men vs 23.9° old men | lean-and-release | [M] Thelen et al. 1997, *J Gerontol A* 52:M8–M13 (correlated with weight-transfer time and step velocity) |
| Maximum single-step lean angle | **30.7°** young women | same | [M] Wojcik et al. 1999, *J Gerontol A* 54:M44–M50 |
| Step length effect | Max release angle **+36 %** (young) from 15 % to 25 % of body height, a further **+23 %** to 35 % of body height. Contact time correlated with recovery and was 50–100 ms faster in young | young/elderly women, forward lean | [M] Hsiao-Wecksler & Robinovitch 2007, *Clin Biomech* 22:574–580 |
| Body configuration at contact | Single steppers' step-angle/lean-angle ratio **1.4 ± 0.5** vs 0.6 ± 0.5 for multiple steppers | elderly, 7° backward lean | [M] Hsiao & Robinovitch 2001, *J Gerontol A* 56:M42–M47 |

**Triggering mechanics:**

- **A dynamic CoM model predicts stepping far better than a static one.** The dynamic (position + velocity) model predicted **71 %** of observed steps; the static "CoM outside BoS" rule predicted only **11 %** (**Pai et al. 2000**, *J Biomech* 33:387–392; 10 young adults, platform translations) [M/MODEL].
- **Time-to-boundary works as a step predictor.** A step is predicted when the time for the CoM to reach the BoS boundary falls below τ_opt **≈0.5–0.8 s**: 0.58 s young, 0.52 s anterior, 0.84 s posterior. This was 83 % accurate overall (**Schulz et al. 2006**, *J Biomech* 39:1444–1453; waist pulls of 1–5 % body weight, women) [M].
- **The XcoM/capture-point criterion** (Hof 2005; Pratt 2006; Stephens 2011) is the mechanical necessity condition [MODEL].

**People step when it is not mechanically necessary:**

- "Change-in-support reactions are … often initiated well before the center of mass is near the stability limits" (**Maki & McIlroy 1997**, *Phys Ther* 77:488–507).
- Subjects **stepped in 98 % of trials** to novel, unconstrained platform perturbations (McIlroy & Maki 1996) [M].
- Stepping is more frequent when unconstrained, and onset times (mean 250 ms) imply "**step initiation often occurs well before the limits of stability are reached**" (McIlroy & Maki 1993) [M].
- Liftoff "did not reflect entirely an immediate necessity … but rather a decision to step". Balance uncertainty delayed stepping by 100–300 ms (**Rogers et al. 2003**, *Cogn Brain Res* 16:192–198) [M].
- Under postural threat, young adults stepped **200–300 ms earlier**, often **before MoS < 0** (**Avalos, Shah & Rosenblatt 2026**, *Exp Brain Res* 244:136) [M].

**Threshold magnitudes.** No universal threshold exists; it depends on paradigm.

- The smallest disturbance that sometimes elicits a step did not differ between young and old. The magnitude for consistent stepping was larger in the young (**Luchies et al. 1994**, *J Am Geriatr Soc* 42:506–512; backward waist pulls) [M, qualitative].
- Waist pulls of 4–5 % body weight required 0.5 more steps in older women (Schulz et al. 2005) [M].
- In this scenario, mechanical necessity is near-certain once right-foot support is lost (§11) [I].

## 9. Athlete-specific and football-specific data

**Latencies in athletes (small samples, heterogeneous paradigms):**

- **Judo.** Judokas (n = 7) had shorter TA onset than untrained men (n = 7): **20.6 ± 7.1 vs 28.3 ± 8.9 ms** after backward push-and-release (**Sado et al. 2023**, *Motor Control* 27:818–829) [M].
  - These absolute values are far below platform-perturbation APRs, so latency is evidently defined from a different event. Use only the **~8 ms difference**.
- **Soccer.** High-level amateur soccer players (n = 10) had **shorter core-muscle reflex latencies** (rectus abdominis, erector spinae, external oblique) than non-players under sudden sagittal trunk loading while seated (**Borghuis, Lemmink & Hof 2011**, *MSSE* 43:108–114) [M, qualitative].
- **Ballet.** Dancers had significantly faster long-latency responses (**Simmons 2005**, *Int J Neurosci* 115:1193–1203) [M, qualitative].
- **Interpretation [I].** Training may shorten latencies by the order of ~10 ms. I found no evidence that trained athletes have fundamentally different APR latencies (≈100 ms), and **no study measuring reactive latencies in footballers being tackled**. Preregister non-athlete latencies, with an athlete sensitivity arm at −10 %.

**Football tackle and injury mechanics:**

- **Tackle direction.** Tackles **from the side** were twice as likely as tackles **from behind** to require post-match medical attention (123 FIFA matches; **Fuller et al. 2004**, *AJSM* 32:43S–53S) [M].
- **Foot/ankle injuries** (**Giza et al. 2003**, *AJSM* 31:550–554): 72 of 76 involved player contact. Most were from side tackles with lateral/medial force. The limb was **weight-bearing in 41/76**, and weight-bearing injuries caused more time loss [M].
- **Ankle sprain mechanism** (**Andersen et al. 2004**, *AJSM* 32:69S–79S): impact on the medial leg just before or at foot strike forces the ankle into inversion [M].
- **ACL, professional men** (**Della Villa et al. 2020**, *BJSM* 54:1423–1432; 134 cases):
  - **44 % non-contact, 44 % indirect contact, 12 % direct contact** [M].
  - Situational patterns include "**tackled**" (n = 24). Knee valgus loading in 81 % [M].
- **ACL** (**Waldén et al. 2015**, *BJSM* 49:1452–1460; 39 cases): 25 non-contact, 8 indirect and 6 direct contact. **Tackling-induced direct contact produced a knee valgus collapse in all cases (3/3)** [M].
- **Injury timing** (**Koga et al. 2010**, *AJSM* 38:2218–2225; handball/basketball, non-contact): ACL injury likely **≈40 ms after initial contact**, with peak vertical GRF 3.2 × body weight at ~40 ms [M].
  - Implication [I]: injury-relevant joint loading in contact events happens within the window governed by intrinsic mechanics, before any postural response.

## 10. Joint-torque capacity and rate of torque development (young male / athlete)

Body weight × height for this subject = 73 × 9.81 × 1.8 ≈ 1289 N·m.

| Joint action | Reference value | Scaled to 73 kg / 1.8 m | Source / notes |
|---|---|---|---|
| Ankle plantar flexion | C1 = 0.095 × BW·H | **≈122 N·m** [I] | [M] Anderson, Madigan & Nussbaum 2007, *J Biomech* 40:3105–3113, young males 18–25 (n = 7, 72.8 kg, 174.8 cm), peak active isometric parameter. Mixed-sex young adults: 101.8 ± 28.4 N·m isometric (Saumur 2021 preprint). Higher values for athletic men are plausible but **not verified here [U]** |
| Ankle dorsiflexion | 0.033 × BW·H | **≈43 N·m** [I] | [M] Anderson 2007 |
| Knee extension | 0.163 × BW·H isometric | **≈210 N·m** [I] | [M] Anderson 2007 |
| Knee extension (athletes) | **297.9 ± 45.4 N·m** concentric at 60°/s, professional players (77 kg); 241.8 ± 39.4 in U-18 | — | [M] Bishop, Coratella & Beato 2021, *Sports* 9:129. Units not printed in the extracted table text; N·m inferred from magnitude |
| Knee extension (untrained → trained) | Isometric MVC **291 ± 10 → 339 ± 10 N·m** after 14 weeks of heavy resistance training | — | [M] Aagaard et al. 2002, *J Appl Physiol* 93:1318–1326 (n = 15 men) |
| Knee flexion | 0.087 × BW·H | **≈112 N·m** [I] | [M] Anderson 2007 |
| Knee flexion (athletes) | **184.0 ± 39.0 N·m** concentric at 60°/s, professional players | — | [M] Bishop et al. 2021 |
| Hip extension | 0.161 × BW·H | **≈207 N·m** [I] | [M] Anderson 2007 |
| Hip flexion | 0.113 × BW·H | **≈146 N·m** [I] | [M] Anderson 2007 |
| Hip abduction | **2.35 ± 0.33 N·m/kg** (dominant), isometric hand-held dynamometer, elite soccer | **≈172 N·m** [I] | [M] Thorborg et al. 2011, *AJSM* 39:121–126 |
| Hip adduction | **2.45 ± 0.54 N·m/kg** | **≈179 N·m** [I] | [M] Thorborg et al. 2011 |
| Trunk extension | **4.11 ± 0.52 N·m/kg** active male controls; 4.53 ± 0.65 elite skiers (concentric, 150°/s) | **≈300–330 N·m** [I] | [M] Hildebrandt et al. 2017, *J Hum Kinet* 57:51–59 |
| Trunk flexion | **2.32 ± 0.42** (controls) / 2.44 ± 0.30 N·m/kg | **≈170–178 N·m** [I] | [M] Hildebrandt et al. 2017 |

Caveats:

- Anderson 2007 has n = 7 per cell. Its young-female hip-extension C1 (0.181) exceeds the male value, so treat it as approximate.
- Torque depends strongly on joint angle and velocity. Anderson et al. 2007 provide a full angle–velocity surface model.
- Harbo et al. 2012 (*Eur J Appl Physiol* 112:267–275; 178 non-athletes) and Cometti et al. 2001 (*IJSM* 22:45–51; French soccer players) give normative data, but their numbers were not extracted [U].

**Rate of torque development:**

- **Quadriceps, isometric** (Aagaard et al. 2002) [M]. RFD over 0–30, 0–50, 0–100 and 0–200 ms:
  - before training: **1601, 1802, 1543 and 1141 N·m/s**;
  - after training: **2020, 2201, 1806 and 1363 N·m/s**.
- **Torque reached after contraction onset** [I] (= RFD × window): ≈90 N·m at 50 ms (31 % MVC), ≈154 N·m at 100 ms (53 % MVC), ≈228 N·m at 200 ms (78 % MVC).
  - **Time to 50 % MVC ≈ 95–100 ms after contraction onset, even in maximal voluntary efforts.** Reactive responses are submaximal, so this is an upper bound on rise speed.
- **Plantar flexors, elite athletes** (54 % female; **Hollville et al. 2022**, ECSS conference abstract; not peer-reviewed): RTD 0–50 ms **437 ± 159**, 50–100 ms **1000 ± 323**, 100–150 ms **682 ± 223**, 0–200 ms **620 ± 165 N·m/s** [M].
- **Ankle dorsiflexion** (young females; **Thelen et al. 1996**, *J Gerontol A* 51:M226–M232): ~**236 ms** to reach 15 N·m, of which **141 ms** was reaction time, so ≈95 ms of rise [M]. The elderly needed 337 ms.
- **What limits early RFD** (**Maffiuletti et al. 2016**, *Eur J Appl Physiol* 116:1091–1116): the first 50–75 ms are governed mainly by neural activation (motor-unit discharge rate) [review].
- **Modelling convention.** First-order activation with a ~40 ms time constant (Welch & Ting 2008) [MODEL], or second-order activation with ω = 16.8 rad/s and ζ = 0.99 (Pasma et al. 2017, after Mugge et al. 2010) [MODEL].

## 11. Scenario timeline (synthesis, all [I] unless cited)

**0 ms.** Boot strikes the posterior distal right shank. This is an external force: Hof mechanism 3, not under control.

**0–~50 ms.** Contact forces and intrinsic impedance only. Short-range stiffness is exceeded almost immediately, leaving low long-range stiffness. Impact-evoked short-latency EMG may appear at ~25–50 ms in stretched muscles: quadriceps ~23–25 ms, soleus 35–50 ms, an impact RP1 at ~40 ms. Their torque would only appear around 45–80 ms. Injury-relevant loading peaks in this window (cf. ACL ≈40 ms).

**~50–100 ms.** Sweep continues; the right foot unloads. Medium-latency reflexes (EMG ~70–90 ms). Bilateral TA-type responses begin in the displaced leg at ~75–96 ms (Dietz 1989) and in the planted leg at ~93–112 ms. Little or no task-level corrective torque yet.

**~100–160 ms.** Sweep complete. Task-level postural responses produce their first corrective torques:

- left-leg ankle and hip-abductor torque;
- trunk/hip counter-rotation (hip strategy) as the CoP saturates in the left foot;
- arm abduction/elevation (deltoid EMG ~100 ms; torque later).

Strategy-specific swing-leg responses for the swept leg (cf. Schillings RP3 ~110 ms, RP4 ~160 ms) begin to shape a lowering/re-placement of the right foot.

**~160–300 ms.** Hip/knee corrective moments for the swept leg, analogous to slips: knee-flexion and hip-extension moments to retrieve the foot from about 190 ms (Cham & Redfern 2001). Stance-leg push/extension (Pijnappels: support-limb EMG 60–80 ms after trips, moments later). The earliest decisions to re-place the swept foot as a support ("step"): step onsets as early as 160 ms, typically ≈250–300 ms in lab paradigms.

**>300 ms.** Foot re-contact (lab foot-contact ≈450–500 ms), or a fall. The outcome must emerge from physics; the controller is outcome-blind.

**Mechanical necessity check.** After right-foot unloading, the base of support is the left foot. The CoM sits roughly half the stance width (~0.1–0.15 m) medial of the left-foot centre; the foot half-width is ~0.04–0.05 m. **XcoM is outside the left-foot BoS** medio-laterally even before any velocity is acquired. With zero initial velocity, an excess of 0.05 m beyond the edge grows to 0.3 m in t = acosh(6)/ω₀ ≈ 0.8 s.

- Hip/trunk angular momentum (Stephens' CMP region) can enlarge the recoverable set only transiently. Re-establishing support with the right foot, or losing balance, are the physically available end states.
- The sagittal component (feet driven forward relative to the CoM) adds backward angular momentum about the CoM. That argues for a backward-directed foot-placement target for the reloading leg (capture point) [I].

## 12. Recommended preregistration values

Latency = earliest plausible **torque** onset (not EMG) after perturbation onset (t = 0 at first boot–shin contact).

| # | Mechanism | Torque-onset latency: central (range) | Acts on | Basis and label | Key sources |
|---|---|---|---|---|---|
| 1 | Intrinsic muscle-tendon impedance (short-range → long-range stiffness, damping) | **0 ms** (instantaneous) | All joints. Ankle K ≈ 0.64–0.91 mgh for <1° rotations, falling toward ~0.13–0.19 mgh by ~7° (passive data). Knee/hip: bounded free parameter | [M] ankle; [I] amplitude dependence in active muscle; knee/hip [U] | Loram & Lakie 2002; Casadio et al. 2005; Loram et al. 2007a,b; Rietdyk et al. 1999 |
| 2 | Hold of pre-perturbation tone (last neural command persists through the dead time) | 0 ms (constant until the first feedback arrives) | All joints (gravity-compensating torques at t = 0) | [I] (follows from the existence of a sensorimotor delay) | Peterka 2002; Welch & Ting 2008 (delayed feedback structure) |
| 3 | Short-latency stretch reflex (M1), local velocity-sensitive | **60 ms** (45–80) | Stretched muscles only, ipsilateral. Low, variable gain (reflex share of stiffness 1–55 %); may be destabilising | [M] EMG 23–25 ms (quadriceps), 35–50 ms (soleus), ~59 ms (hamstrings); [I] +10–30 ms EMD | Mrachacz-Kersting 2004/2006; Schieppati & Nardone 1997; Hiraoka 2020; Abulhasan 2016; Mirbagheri 2000; Diener 1984 |
| 4 | Medium-latency reflex (M2, group II) | **95 ms** (80–130) | Stretched ankle/foot muscles; bilateral spinal coupling in stance | [M] EMG 72 ms soleus (translation), 103–123 ms (rotation); [I] +EMD | Schieppati & Nardone 1997; Diener 1984; Dietz 1989 |
| 5 | Automatic postural response: task-level delayed CoM feedback → ankle torque/CoP (ankle strategy), **displaced leg** | **125 ms** (110–160) | Ankle (then knee/hip, distal-to-proximal) of the swept leg while loaded | [M] EMG 73–110 ms, 100 ± 20 ms, 75–96 ms (displaced leg); [I/M] torque ≈130 ms; torque responses evident by 160 ms | Horak & Nashner 1986; Horak et al. 1989; Dietz 1989; Beck et al. 2023; Allum et al. 2002; Welch & Ting 2008 |
| 6 | Automatic postural response, **planted (contralateral) leg** | **140 ms** (120–175) | Left ankle (CoP within left foot), knee, hip | [M] EMG 93–112 ms (non-displaced leg); [I] +EMD | Dietz 1989; Berger et al. 1984 |
| 7 | Hip/trunk counter-rotation (CMP ≠ CoP; "hip strategy") | **140 ms** (110–200) | Hip flexion/extension and abduction/adduction, lumbar/trunk. Used when CoP saturates / fast perturbations; never "pure hip" | [M] hip-strategy latencies similar to ankle strategy (73–110 ms EMG); paraspinal balance-correcting 120–220 ms window; gluteus medius 100/170 ms; [I] torque | Horak & Nashner 1986; Runge et al. 1999; Carpenter 1999; Allum 2002; Hof & Duysens 2013; Hof 2007; Stephens 2011 |
| 8 | Arm responses (angular-momentum contribution) | **130 ms** (110–200) | Shoulder abduction/flexion | [M] deltoid EMG 100 ms (rotations); "similar to ankle" (translations); 146–199 ms (gait slips); [I] torque | Allum et al. 2002; McIlroy & Maki 1995; Marigold et al. 2003; Roos et al. 2008 |
| 9 | Planted-limb extensor/push-off synergy | **100 ms** (80–140) | Left ankle plantar flexors, knee/hip extensors (body elevation, angular-momentum restraint) | [M] EMG 60–80 ms (support limb after trips); [I] torque | Pijnappels et al. 2004, 2005a,b; Eng et al. 1994 |
| 10 | Swept-leg retrieval/lowering (slip/trip swing-leg strategy) | **180 ms** (130–250) | Right hip extension, knee flexion (pull foot back), then placement | [M] strategy-specific swing responses ≥110–160 ms; slip flexor synergy 146–199 ms; medial hamstrings ~175 ms, VL ~240 ms; corrective moments 190–350 ms after heel contact; [I] | Schillings 2000; Marigold & Patla 2002; Chambers & Cham 2007; Cham & Redfern 2001 |
| 11 | Step / reload trigger (change-in-support decision) | Decision ≥**160 ms**; liftoff/placement motor onset central **250 ms** (160–330); re-contact ≈**400–500 ms** | Stepping/reloading leg; placement toward capture point | [M] step onset 160–250 ms; toe-off 236–328 ms; foot-off 306 ± 25 ms (preprint); swing 168 ± 27 ms; [I] contact | McIlroy & Maki 1993; Do et al. 1982; Saumur et al. 2021; Maki et al. 1996; Pratt 2006; Hof 2008 |
| 12 | Athlete adjustment (sensitivity arm only) | Latencies 2–11 shortened by ≤10 % | — | [M] judo −8 ms; soccer/dance faster, magnitudes small; [I] | Sado 2023; Borghuis 2011; Simmons 2005 |

**Actuator constraints to preregister alongside** (§10):

- Peak torques ≈ ankle PF ≥120 N·m ([U] upper value for athletes), DF ≈ 43, knee extension 210 (isometric, non-athlete) to ~300 (athlete, concentric at 60°/s), knee flexion 110–185, hip extension ≈ 205, hip flexion ≈ 145, hip abduction ≈ 170, trunk extension ≈ 300, trunk flexion ≈ 175 N·m.
- Rise: first-order activation τ ≈ 40 ms, plus a rate cap consistent with ≤50 % MVC at ~100 ms after onset. The quadriceps RFD ceiling is ≈1.1–2.2 kN·m/s depending on window.

## 13. Smallest physically principled controller

**What the literature supports as a minimal, outcome-blind law:**

1. **Passive layer, always on.**
   - Per-joint intrinsic impedance τ_int = −K(|Δθ|)·Δθ − B·Δθ̇ about the pre-perturbation posture. Stiffness is amplitude-softening (short-range → long-range), anchored on the ankle data (§1).
   - Pre-perturbation gravity-compensating torques are held constant during the dead time. Nothing reacts before sensory information can arrive.
2. **Optional local reflex layer.**
   - Delayed, half-wave-rectified stretch-velocity feedback on stretched actuators (delay 40–50 ms for the ankle, ~25 ms for the knee; low gain). This is the Mirbagheri et al. 2000 structure [MODEL].
   - Preregister a small gain and a "reflex off" sensitivity arm, because short-latency reflexes can be destabilising (Diener 1984).
3. **Task-level balance layer** (the core; delay ≈100 ms to "neural command", plus activation/EMD giving torque onset ≈120–140 ms):
   - Sense **delayed CoM acceleration, velocity and position** relative to the support polygon (Welch & Ting 2008). Compute **XcoM = x + v/ω₀** (Hof 2005), i.e. the capture point (Pratt 2006).
   - Desired CoP/CMP: p* = XcoM + k·(XcoM − x_ref), clamped to the current support polygon minus a margin. The desired horizontal ground reaction is F* = mω₀²(x − p*) (LIPM). Vertical F* ≈ mg plus height regulation.
   - **Distribute through the stance leg(s) via Jacobian-transpose (virtual-force) mapping**, τ = −Jᵀ F*, plus gravity compensation. This is the virtual-model-control idea (Pratt et al. 2001, *IJRR* 20(2):129–143, checked for existence only) and the gravity/velocity-compensation term of Coros, Beaudoin & van de Panne 2010 (*ACM TOG*, SIGGRAPH 2010).
   - With two feet loaded, split F* by load and support geometry. The Lee & Goswami 2012 (*Auton Robots* 33:399–414) and Macchietto, Zordan & Shelton 2009 (*ACM TOG* 28(3)) momentum controllers distribute GRF/CoP per foot.
   - Saturate every joint at the §10 torque and rate limits.
   - Gain sanity check [I]: the equivalent ankle-level stiffness should land near 1.3–1.55 mgh, with damping ≈ 0.5 s × mgh (Peterka 2002; Pasma 2017). Higher gains with a 100 ms delay go unstable or look super-human.
4. **Angular-momentum (hip/trunk, arms) term.**
   - When p* saturates at the foot edge, command a centroidal moment, i.e. CMP offset from the CoP (Popovic et al. 2005; Hof 2007 mechanism 2). Use hip/trunk torque and, optionally, arm torque, bang-bang-like within joint limits.
   - The torso must be braked before its joint limit (Stephens 2011: T₂ = 2T₁, T_max = √(Iθ_max/τ_max)).
   - Same delay class as the ankle term (§12 rows 5–8). Never pure hip (Runge et al. 1999).
5. **Step/reload trigger and placement.**
   - Trigger when the delayed capture point leaves the CoP-balancing region or the enlarged CMP region (Stephens 2011, Eq. 3.15/3.26). A preregistered early trigger (time-to-boundary τ ≤ ~0.5–0.8 s, Schulz et al. 2006, or MoS below a positive margin) reflects the human tendency to step before it is strictly necessary (Maki & McIlroy 1997).
   - Target foot placement: capture point + margin (Hof 2008: Δv/ω₀; Coros 2010 inverted-pendulum foot placement). Swing executed by the same torque-limited actuators, with step timing no earlier than §12 row 11.
   - In this scenario, the "stepping" limb is the already unloaded right leg (retrieval/lowering, §12 row 10).

**Known pitfalls:**

- **Zero-latency feedback is unphysiological and makes the character too robust.** Beck et al. 2023 showed that torque delivered before ~130 ms (from 68 ms) measurably improves human balance thresholds. A zero-delay controller therefore outperforms any human.
  - Geijtenbeek, van de Panne & van der Stappen 2013 (*ACM TOG*, SIGGRAPH Asia) note that Wang et al. 2012 used "PD control without neural delay for coronal and upper-body balance". That gave exceptional lateral balance but "makes it respond less naturally to perturbations".
  - Geijtenbeek's own feedback delays (5/10/20 ms for upper leg / lower leg / foot muscles, following Geyer & Herr 2010, *IEEE TNSRE* 18:263–273) are spinal-loop magnitudes. They are far shorter than task-level postural-response delays (~100 ms) and should not be reused for CoM-level balance feedback.
- **Unrealistically strong controllers.** Removing neural delay and muscle dynamics produced "increased stiffness and high-gain torque patterns" (Geijtenbeek et al. 2013).
  - Enforce both peak torque and rate of torque development. Even maximal voluntary quadriceps contractions reach only ~50 % MVC about 100 ms after onset (Aagaard 2002).
  - Reactive torques in the first 300 ms are far below MVC in lab perturbations [I].
- **"Fighting" collisions.** During the imposed 0–100 ms sweep, a high-gain joint servo resists the boot. The result is either an unphysical "pillar" or numerical contact explosions and impulsive injury-level loads.
  - Physiologically, this window is governed by intrinsic impedance that **yields** beyond ~0.5° (Loram et al. 2007a).
  - Keep tracking gains off until delayed feedback arrives. Do not include anticipatory terms derived from knowledge of the tackle (outcome-blindness).
- **Static-BoS triggers miss most steps.** A "CoM outside BoS" rule predicted 11 % of steps vs 71 % for a dynamic rule (Pai et al. 2000). Use XcoM/capture-point logic.
- **First-trial/startle effects.** Unexpected perturbations act as startling stimuli. First-trial responses are exaggerated, with co-contraction and increased trunk flexion, and habituate (**Allum et al. 2011**, *Hum Mov Sci* 30:279–295; **Campbell et al. 2013**, *J Neurophysiol* 110:2236–2245).
  - A single unexpected tackle is a "first trial". Either omit this from the minimal model or include a bounded co-contraction burst as a preregistered sensitivity arm, not a tuned fix.
- **Central set.** Response magnitudes depend on expectation, but latencies do not (Horak et al. 1989). An outcome-blind controller should not scale its gains with knowledge of the tackle.
- **Bilateral coupling is real.** The non-displaced leg responds ~15–20 ms later than the displaced leg (Dietz 1989). Do not model the planted leg as an independent, simultaneous servo.

## 14. Gaps and items not verified this session

- Exact fitted time delays in Peterka 2002; exact inter-segment lags in Nashner 1977; exact deltoid latency in McIlroy & Maki 1995; timing components (reaction / weight transfer / step) in Thelen et al. 1997; absolute ankle plantar-flexion MVC for athletic young men (commonly higher than the 122 N·m anchor used here); Harbo 2012 and Cometti 2001 values; intrinsic knee/hip stiffness in loaded stance. All are marked [U] or omitted.
- No primary study of reactive balance latencies or recovery kinematics in footballers being slide-tackled was found. The closest analogues are unilateral split-belt stance perturbations (Dietz 1989), forward slips (Tang 1998; Marigold & Patla 2002; Cham & Redfern 2001; Yang 2012) and forced-sliding models (Pai & Iqbal 1999).
- Robotics/graphics citations checked for existence only (details partly from memory): Pratt et al. 2001 (VMC); Yin, Loken & van de Panne 2007 (SIMBICON, *ACM TOG* 26(3)); Coros et al. 2010 (article number not checked); Macchietto et al. 2009; Wang, Hamner, Delp & Koltun 2012 (*ACM TOG*); Stephens 2007 and Stephens & Atkeson 2010 (*Humanoids*, pp. 52–59). The stability-region equations were checked directly in the Stephens 2011 thesis PDF.

## 15. References

Abulhasan JF, Anley CM, Snow MD, Grey MJ (2016). Hamstring stretch reflex: could it be a reproducible objective measure of functional knee stability? *J Exp Orthop* 3:4. doi:10.1186/s40634-016-0040-x

Aagaard P, Simonsen EB, Andersen JL, Magnusson P, Dyhre-Poulsen P (2002). Increased rate of force development and neural drive of human skeletal muscle following resistance training. *J Appl Physiol* 93:1318–1326. doi:10.1152/japplphysiol.00283.2002

Allum JHJ, Carpenter MG, Honegger F, Adkin AL, Bloem BR (2002). Age-dependent variations in the directional sensitivity of balance corrections and compensatory arm movements in man. *J Physiol* 542:643–663. doi:10.1113/jphysiol.2001.015644

Allum JHJ, Tang KS, Carpenter MG, Oude Nijhuis LB, Bloem BR (2011). Review of first trial responses in balance control. *Hum Mov Sci* 30:279–295. doi:10.1016/j.humov.2010.11.009

Andersen TE, Floerenes TW, Arnason A, Bahr R (2004). Video analysis of the mechanisms for ankle injuries in football. *Am J Sports Med* 32:69S–79S. doi:10.1177/0363546503262023

Anderson DE, Madigan ML, Nussbaum MA (2007). Maximum voluntary joint torque as a function of joint angle and angular velocity. *J Biomech* 40:3105–3113. doi:10.1016/j.jbiomech.2007.03.022

Avalos MA, Shah S, Rosenblatt NJ (2026). Postural threat influences reactive stepping characteristics at the single-step threshold, but not when a step is necessary. *Exp Brain Res* 244:136. doi:10.1007/s00221-026-07328-4

Beck ON, Shepherd MK, Rastogi R, Martino G, Ting LH, Sawicki GS (2023). Exoskeletons need to react faster than physiological responses to improve standing balance. *Sci Robot* 8:eadf1080. doi:10.1126/scirobotics.adf1080

Berger W, Dietz V, Quintern J (1984). Corrective reactions to stumbling in man. *J Physiol* 357:109–125. doi:10.1113/jphysiol.1984.sp015492

Bishop C, Coratella G, Beato M (2021). Intra- and inter-limb strength asymmetry in soccer. *Sports* 9:129. doi:10.3390/sports9090129

Borghuis AJ, Lemmink KA, Hof AL (2011). Core muscle response times and postural reactions in soccer players and nonplayers. *Med Sci Sports Exerc* 43:108–114. doi:10.1249/MSS.0b013e3181e93492

Campbell AD, Squair JW, Chua R, Inglis JT, Carpenter MG (2013). First trial and StartReact effects induced by balance perturbations to upright stance. *J Neurophysiol* 110:2236–2245. doi:10.1152/jn.00766.2012

Carpenter MG, Allum JHJ, Honegger F (1999). Directional sensitivity of stretch reflexes and balance corrections for normal subjects in the roll and pitch planes. *Exp Brain Res* 129:93–113. doi:10.1007/s002210050940

Casadio M, Morasso PG, Sanguineti V (2005). Direct measurement of ankle stiffness during quiet standing. *Gait Posture* 21:410–424. doi:10.1016/j.gaitpost.2004.05.005

Cavanagh PR, Komi PV (1979). Electromechanical delay in human skeletal muscle under concentric and eccentric contractions. *Eur J Appl Physiol* 42:159–163. doi:10.1007/BF00431022

Cham R, Redfern MS (2001). Lower extremity corrective reactions to slip events. *J Biomech* 34:1439–1445. doi:10.1016/S0021-9290(01)00116-6

Chambers AJ, Cham R (2007). Slip-related muscle activation patterns in the stance leg during walking. *Gait Posture* 25:565–572. doi:10.1016/j.gaitpost.2006.06.007

Coros S, Beaudoin P, van de Panne M (2010). Generalized biped walking control. *ACM Trans Graph* (SIGGRAPH 2010) 29(4). doi:10.1145/1778765.1781156

Della Villa F, Buckthorpe M, Grassi A, et al. (2020). Systematic video analysis of ACL injuries in professional male football (soccer). *Br J Sports Med* 54:1423–1432. doi:10.1136/bjsports-2019-101247

Diener HC, Dichgans J, Bootz F, Bacher M (1984). Early stabilization of human posture after a sudden disturbance. *Exp Brain Res* 56:126–134. doi:10.1007/BF00237448

Dietz V, Horstmann GA, Berger W (1989). Interlimb coordination of leg-muscle activation during perturbation of stance in humans. *J Neurophysiol* 62:680–693. doi:10.1152/jn.1989.62.3.680

Dietz V, Quintern J, Sillem M (1987). Stumbling reactions in man. *J Physiol* 386:149–163. doi:10.1113/jphysiol.1987.sp016527

Do MC, Breniere Y, Brenguier P (1982). A biomechanical study of balance recovery during the fall forward. *J Biomech* 15:933–939. doi:10.1016/0021-9290(82)90011-2

Eng JJ, Winter DA, Patla AE (1994). Strategies for recovery from a trip in early and late swing during human walking. *Exp Brain Res* 102:339–349. doi:10.1007/BF00227520

Fuller CW, Smith GL, Junge A, Dvorak J (2004). The influence of tackle parameters on the propensity for injury in international football. *Am J Sports Med* 32:43S–53S. doi:10.1177/0363546503261248

Geijtenbeek T, van de Panne M, van der Stappen AF (2013). Flexible muscle-based locomotion for bipedal creatures. *ACM Trans Graph* (SIGGRAPH Asia 2013). doi:10.1145/2508363.2508399

Geyer H, Herr H (2010). A muscle-reflex model that encodes principles of legged mechanics produces human walking dynamics and muscle activities. *IEEE Trans Neural Syst Rehabil Eng* 18:263–273. doi:10.1109/TNSRE.2010.2047592

Giza E, Fuller C, Junge A, Dvorak J (2003). Mechanisms of foot and ankle injuries in soccer. *Am J Sports Med* 31:550–554. doi:10.1177/03635465030310041201

Harbo T, Brincks J, Andersen H (2012). Maximal isokinetic and isometric muscle strength of major muscle groups … in 178 healthy subjects. *Eur J Appl Physiol* 112:267–275. doi:10.1007/s00421-011-1975-3

Henry SM, Fung J, Horak FB (1998). EMG responses to maintain stance during multidirectional surface translations. *J Neurophysiol* 80:1939–1950. doi:10.1152/jn.1998.80.4.1939

Henry SM, Fung J, Horak FB (2001). Effect of stance width on multidirectional postural responses. *J Neurophysiol* 85:559–570. doi:10.1152/jn.2001.85.2.559

Hildebrandt C, Müller L, Heisse C, Raschner C (2017). Trunk strength characteristics of elite alpine skiers. *J Hum Kinet* 57:51–59. doi:10.1515/hukin-2017-0046

Hiraoka K, Kuramitsu T, Nii N, Osumi M, Tanaka N (2020). Time window of perturbation-induced response triggered by ankle motion and body sway above the ankle. *Brain Sci* 10:230. doi:10.3390/brainsci10040230

Hof AL (2007). The equations of motion for a standing human reveal three mechanisms for balance. *J Biomech* 40:451–457. doi:10.1016/j.jbiomech.2005.12.016

Hof AL (2008). The 'extrapolated center of mass' concept suggests a simple control of balance in walking. *Hum Mov Sci* 27:112–125. doi:10.1016/j.humov.2007.08.003

Hof AL, Duysens J (2013). Responses of human hip abductor muscles to lateral balance perturbations during walking. *Exp Brain Res* 230:301–310. doi:10.1007/s00221-013-3655-5

Hof AL, Gazendam MG, Sinke WE (2005). The condition for dynamic stability. *J Biomech* 38:1–8. doi:10.1016/j.jbiomech.2004.03.025

Hollville E, Nordez A, Giroux C, et al. (2022). Rate of torque development and contractile performance during ankle plantar flexion in elite athletes. 27th ECSS Congress, Sevilla (conference abstract).

Horak FB (2006). Postural orientation and equilibrium. *Age Ageing* 35(S2):ii7–ii11. doi:10.1093/ageing/afl077

Horak FB, Diener HC, Nashner LM (1989). Influence of central set on human postural responses. *J Neurophysiol* 62:841–853. doi:10.1152/jn.1989.62.4.841

Horak FB, Nashner LM (1986). Central programming of postural movements: adaptation to altered support-surface configurations. *J Neurophysiol* 55:1369–1381. doi:10.1152/jn.1986.55.6.1369

Hsiao ET, Robinovitch SN (2001). Elderly subjects' ability to recover balance with a single backward step associates with body configuration at step contact. *J Gerontol A* 56:M42–M47. doi:10.1093/gerona/56.1.m42

Hsiao-Wecksler ET, Robinovitch SN (2007). The effect of step length on young and elderly women's ability to recover balance. *Clin Biomech* 22:574–580. doi:10.1016/j.clinbiomech.2007.01.013

Hunter IW, Kearney RE (1982). Dynamics of human ankle stiffness: variation with mean ankle torque. *J Biomech* 15:747–752. doi:10.1016/0021-9290(82)90089-6

Jacobs JV, Horak FB (2007). Cortical control of postural responses. *J Neural Transm* 114:1339–1348. doi:10.1007/s00702-007-0657-0

Koga H, Nakamae A, Shima Y, et al. (2010). Mechanisms for noncontact anterior cruciate ligament injuries. *Am J Sports Med* 38:2218–2225. doi:10.1177/0363546510373570

Kuo AD (1995). An optimal control model for analyzing human postural balance. *IEEE Trans Biomed Eng* 42:87–101. doi:10.1109/10.362914

Kuo AD, Zajac FE (1993). Human standing posture: multi-joint movement strategies based on biomechanical constraints. *Prog Brain Res* 97:349–358. doi:10.1016/S0079-6123(08)62294-3

Lee SH, Goswami A (2012). A momentum-based balance controller for humanoid robots on non-level and non-stationary ground. *Auton Robots* 33:399–414.

Liu W, Kim SH, Long JT, Pohl PS, Duncan PW (2003). Anticipatory postural adjustments and the latency of compensatory stepping reactions in humans. *Neurosci Lett* 336:1–4. doi:10.1016/S0304-3940(02)01215-6

Loram ID, Lakie M (2002). Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. *J Physiol* 545:1041–1053. doi:10.1113/jphysiol.2002.025049

Loram ID, Maganaris CN, Lakie M (2007a). The passive, human calf muscles in relation to standing: the non-linear decrease from short range to long range stiffness. *J Physiol* 584:661–675. doi:10.1113/jphysiol.2007.140046

Loram ID, Maganaris CN, Lakie M (2007b). … the short range stiffness lies in the contractile component. *J Physiol* 584:677–692. doi:10.1113/jphysiol.2007.140053

Luchies CW, Alexander NB, Schultz AB, Ashton-Miller J (1994). Stepping responses of young and old adults to postural disturbances: kinematics. *J Am Geriatr Soc* 42:506–512. doi:10.1111/j.1532-5415.1994.tb04972.x

Macchietto A, Zordan V, Shelton CR (2009). Momentum control for balance. *ACM Trans Graph* 28(3) (SIGGRAPH 2009).

Maffiuletti NA, Aagaard P, Blazevich AJ, et al. (2016). Rate of force development: physiological and methodological considerations. *Eur J Appl Physiol* 116:1091–1116. doi:10.1007/s00421-016-3346-6

Maki BE, McIlroy WE (1997). The role of limb movements in maintaining upright stance: the "change-in-support" strategy. *Phys Ther* 77:488–507. doi:10.1093/ptj/77.5.488

Maki BE, McIlroy WE, Perry SD (1996). Influence of lateral destabilization on compensatory stepping responses. *J Biomech* 29:343–353. doi:10.1016/0021-9290(95)00053-4

Marigold DS, Bethune AJ, Patla AE (2003). Role of the unperturbed limb and arms in the reactive recovery response to an unexpected slip during locomotion. *J Neurophysiol* 89:1727–1737. doi:10.1152/jn.00683.2002

Marigold DS, Patla AE (2002). Strategies for dynamic stability during locomotion on a slippery surface. *J Neurophysiol* 88:339–353. doi:10.1152/jn.00691.2001

McIlroy WE, Maki BE (1993). Task constraints on foot movement and the incidence of compensatory stepping following perturbation of upright stance. *Brain Res* 616:30–38. doi:10.1016/0006-8993(93)90188-S

McIlroy WE, Maki BE (1995). Early activation of arm muscles follows external perturbation of upright stance. *Neurosci Lett* 184:177–180. doi:10.1016/0304-3940(94)11200-3

McIlroy WE, Maki BE (1996). Age-related changes in compensatory stepping in response to unpredictable perturbations. *J Gerontol A* 51:M289–M296. doi:10.1093/gerona/51a.6.m289

McIlroy WE, Maki BE (1999). The control of lateral stability during rapid stepping reactions evoked by antero-posterior perturbation. *Gait Posture* 9:190–198. doi:10.1016/S0966-6362(99)00013-2

Mille ML, Johnson ME, Martinez KM, Rogers MW (2005). Age-dependent differences in lateral balance recovery through protective stepping. *Clin Biomech* 20:607–616. doi:10.1016/j.clinbiomech.2005.03.004

Mirbagheri MM, Barbeau H, Kearney RE (2000). Intrinsic and reflex contributions to human ankle stiffness. *Exp Brain Res* 135:423–436. doi:10.1007/s002210000534

Morasso PG, Sanguineti V (2002). Ankle muscle stiffness alone cannot stabilize balance during quiet standing. *J Neurophysiol* 88:2157–2162. doi:10.1152/jn.2002.88.4.2157

Morasso PG, Schieppati M (1999). Can muscle stiffness alone stabilize upright standing? *J Neurophysiol* 82:1622–1626. doi:10.1152/jn.1999.82.3.1622

More HL, Donelan JM (2018). Scaling of sensorimotor delays in terrestrial mammals. *Proc R Soc B* 285:20180613. doi:10.1098/rspb.2018.0613

Mrachacz-Kersting N, Lavoie BA, Andersen JB, Sinkjaer T (2004). Characterisation of the quadriceps stretch reflex during the transition from swing to stance phase of human walking. *Exp Brain Res* 159:108–122. doi:10.1007/s00221-004-1941-y

Mrachacz-Kersting N, Grey MJ, Sinkjaer T (2006). Evidence for a supraspinal contribution to the human quadriceps long-latency stretch reflex. *Exp Brain Res* 168:529–540. doi:10.1007/s00221-005-0120-0

Nashner LM (1976). Adapting reflexes controlling the human posture. *Exp Brain Res* 26:59–72. doi:10.1007/BF00235249

Nashner LM (1977). Fixed patterns of rapid postural responses among leg muscles during stance. *Exp Brain Res* 30:13–24. doi:10.1007/BF00237855

Nordez A, Gallot T, Catheline S, Guével A, Cornu C, Hug F (2009). Electromechanical delay revisited using very high frame rate ultrasound. *J Appl Physiol* 106:1970–1975. doi:10.1152/japplphysiol.00221.2009

Pai YC, Iqbal K (1999). Simulated movement termination for balance recovery: can movement strategies be sought to maintain stability in the presence of slipping or forced sliding? *J Biomech* 32:779–786. doi:10.1016/S0021-9290(99)00074-3

Pai YC, Maki BE, Iqbal K, McIlroy WE, Perry SD (2000). Thresholds for step initiation induced by support-surface translation. *J Biomech* 33:387–392. doi:10.1016/S0021-9290(99)00199-2

Pai YC, Patton J (1997). Center of mass velocity-position predictions for balance control. *J Biomech* 30:347–354. doi:10.1016/S0021-9290(96)00165-0

Pasma JH, Boonstra TA, van Kordelaar J, Spyropoulou VV, Schouten AC (2017). A sensitivity analysis of an inverted pendulum balance control model. *Front Comput Neurosci* 11:99. doi:10.3389/fncom.2017.00099

Peterka RJ (2002). Sensorimotor integration in human postural control. *J Neurophysiol* 88:1097–1118. doi:10.1152/jn.2002.88.3.1097

Pijnappels M, Bobbert MF, van Dieën JH (2004). Contribution of the support limb in control of angular momentum after tripping. *J Biomech* 37:1811–1818. doi:10.1016/j.jbiomech.2004.02.038

Pijnappels M, Bobbert MF, van Dieën JH (2005a). Control of support limb muscles in recovery after tripping in young and older subjects. *Exp Brain Res* 160:326–333. doi:10.1007/s00221-004-2014-y

Pijnappels M, Bobbert MF, van Dieën JH (2005b). Push-off reactions in recovery after tripping discriminate young subjects, older non-fallers and older fallers. *Gait Posture* 21:388–394. doi:10.1016/j.gaitpost.2004.04.009

Popovic MB, Goswami A, Herr H (2005). Ground reference points in legged locomotion: definitions, biological trajectories and control implications. *Int J Robot Res* 24(12):1013–1032.

Pratt J, Carff J, Drakunov S, Goswami A (2006). Capture point: a step toward humanoid push recovery. *Proc IEEE-RAS Humanoids 2006*, 200–207.

Pratt J, Chew CM, Torres A, Dilworth P, Pratt G (2001). Virtual model control: an intuitive approach for bipedal locomotion. *Int J Robot Res* 20(2):129–143. (existence checked; pages from memory)

Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE (1999). Balance recovery from medio-lateral perturbations of the upper body during standing. *J Biomech* 32:1149–1158. doi:10.1016/S0021-9290(99)00116-5

Rogers MW, Hedman LD, Johnson ME, Cain TD, Hanke TA (2001). Lateral stability during forward-induced stepping for dynamic balance recovery in young and older adults. *J Gerontol A* 56:M589–M594. doi:10.1093/gerona/56.9.m589

Rogers MW, Hedman LD, Johnson ME, Martinez KM, Mille ML (2003). Triggering of protective stepping for the control of human balance: age and contextual dependence. *Cogn Brain Res* 16:192–198. doi:10.1016/S0926-6410(02)00273-2

Roos PE, McGuigan MP, Kerwin DG, Trewartha G (2008). The role of arm movement in early trip recovery in younger and older adults. *Gait Posture* 27:352–356. doi:10.1016/j.gaitpost.2007.05.001

Runge CF, Shupert CL, Horak FB, Zajac FE (1999). Ankle and hip postural strategies defined by joint torques. *Gait Posture* 10:161–170. doi:10.1016/S0966-6362(99)00032-6

Sado N, Fujii N, Nonaka E, Miyazaki T (2023). Judokas exhibit short response latency even to non-judo-specific external perturbation. *Motor Control* 27:818–829. doi:10.1123/mc.2023-0026

Saumur TM, Nestico J, Mochizuki G, Perry SD, Mansfield A, Mathur S (2021). Associations between lower limb isometric torque, isokinetic torque, and explosive force with phases of reactive stepping in young, healthy adults. *bioRxiv* (preprint). doi:10.1101/2021.01.18.427144

Schieppati M, Nardone A (1997). Medium-latency stretch reflexes of foot and leg muscles analysed by cooling the lower limb in standing humans. *J Physiol* 503:691–698. doi:10.1111/j.1469-7793.1997.691bg.x

Schieppati M, Nardone A, Siliotto R, Grasso M (1995). Early and late stretch responses of human foot muscles induced by perturbation of stance. *Exp Brain Res* 105:411–422. doi:10.1007/BF00233041

Schillings AM, van Wezel BM, Mulder T, Duysens J (2000). Muscular responses and movement strategies during stumbling over obstacles. *J Neurophysiol* 83:2093–2102. doi:10.1152/jn.2000.83.4.2093

Schulz BW, Ashton-Miller JA, Alexander NB (2005). Compensatory stepping in response to waist pulls in balance-impaired and unimpaired women. *Gait Posture* 22:198–209. doi:10.1016/j.gaitpost.2004.09.004

Schulz BW, Ashton-Miller JA, Alexander NB (2006). Can initial and additional compensatory steps be predicted …? *J Biomech* 39:1444–1453. doi:10.1016/j.jbiomech.2005.04.004

Simmons RW (2005). Neuromuscular responses of trained ballet dancers to postural perturbations. *Int J Neurosci* 115:1193–1203. doi:10.1080/00207450590914572

Stephens B (2011). Push recovery control for force-controlled humanoid robots. PhD thesis, Carnegie Mellon University, CMU-RI-TR-11-15. (Stephens B, 2007, "Humanoid push recovery", Proc IEEE-RAS Humanoids; Stephens BJ, Atkeson CG, 2010, "Push recovery by stepping for humanoid robots with force controlled joints", Proc IEEE-RAS Humanoids, 52–59.)

Tang PF, Woollacott MH, Chong RK (1998). Control of reactive balance adjustments in perturbed human walking. *Exp Brain Res* 119:141–152. doi:10.1007/s002210050327

Thelen DG, Schultz AB, Alexander NB, Ashton-Miller JA (1996). Effects of age on rapid ankle torque development. *J Gerontol A* 51:M226–M232. doi:10.1093/gerona/51a.5.m226

Thelen DG, Wojcik LA, Schultz AB, Ashton-Miller JA, Alexander NB (1997). Age differences in using a rapid step to regain balance during a forward fall. *J Gerontol A* 52:M8–M13. doi:10.1093/gerona/52a.1.m8

Thorborg K, Serner A, Petersen J, Madsen TM, Magnusson P, Hölmich P (2011). Hip adduction and abduction strength profiles in elite soccer players. *Am J Sports Med* 39:121–126. doi:10.1177/0363546510378081

Waldén M, Krosshaug T, Bjørneboe J, Andersen TE, Faul O, Hägglund M (2015). Three distinct mechanisms predominate in non-contact anterior cruciate ligament injuries in male professional football players. *Br J Sports Med* 49:1452–1460. doi:10.1136/bjsports-2014-094573

Wang JM, Hamner SR, Delp SL, Koltun V (2012). Optimizing locomotion controllers using biologically-based actuators and objectives. *ACM Trans Graph* 31(4) (SIGGRAPH 2012).

Weiss PL, Hunter IW, Kearney RE (1988). Human ankle joint stiffness over the full range of muscle activation levels. *J Biomech* 21:539–544. doi:10.1016/0021-9290(88)90217-5

Welch TDJ, Ting LH (2008). A feedback model reproduces muscle activity during human postural responses to support-surface translations. *J Neurophysiol* 99:1032–1038. doi:10.1152/jn.01110.2007

Winter DA (1995). Human balance and posture control during standing and walking. *Gait Posture* 3:193–214.

Winter DA, Patla AE, Prince F, Ishac M, Gielo-Perczak K (1998). Stiffness control of balance in quiet standing. *J Neurophysiol* 80:1211–1221. doi:10.1152/jn.1998.80.3.1211

Winter DA, Patla AE, Rietdyk S, Ishac MG (2001). Ankle muscle stiffness in the control of balance during quiet standing. *J Neurophysiol* 85:2630–2633. doi:10.1152/jn.2001.85.6.2630

Winter DA, Prince F, Frank JS, Powell C, Zabjek KF (1996). Unified theory regarding A/P and M/L balance in quiet stance. *J Neurophysiol* 75:2334–2343. doi:10.1152/jn.1996.75.6.2334

Wojcik LA, Thelen DG, Schultz AB, Ashton-Miller JA, Alexander NB (1999). Age and gender differences in single-step recovery from a forward fall. *J Gerontol A* 54:M44–M50. doi:10.1093/gerona/54.1.m44

Yang F, Espy D, Bhatt T, Pai YC (2012). Two types of slip-induced falls among community dwelling older adults. *J Biomech* 45:1259–1264. doi:10.1016/j.jbiomech.2012.01.036

Yin KK, Loken K, van de Panne M (2007). SIMBICON: simple biped locomotion control. *ACM Trans Graph* 26(3) (SIGGRAPH 2007). doi:10.1145/1276377.1276509

Zettel JL, McIlroy WE, Maki BE (2002). Can stabilizing features of rapid triggered stepping reactions be modulated to meet environmental constraints? *Exp Brain Res* 145:297–308. doi:10.1007/s00221-002-1083-z

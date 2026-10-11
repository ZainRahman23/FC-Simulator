# Eccentric persistence after stretch-hold, short-range stiffness recovery, and intrinsic joint damping

PPR-3 literature review for Touchline Physical Character V2. Compiled 11–12 Oct 2026.

## Scope, labels, access levels

The question: once a joint has been stretched past the short-range yield (θ_y ≈ 1°) and is then held, how much of the stretch-induced extra force R = (e − 1)·a·capIso should still be there after 100 ms, 300 ms and 1 s, at 5–30 % activation? The two current options are wrong in opposite directions. The Hill-type rule removes the extra force the moment velocity reaches zero. The previous phase's strain reserve keeps all of it for as long as the stretch is held.

Labels: **[M]** measured value as reported. **[E]** inferred from measured data, including derived ratios and temperature or scale extrapolation. **[MODEL]** a conversion of measured data into engine terms. **[D]** a design choice that the literature does not fix.

Access levels: **FT** = I read the open-access full text. **FT-s** = full text read only through a summarising fetch, so a number should be checked against the PDF before it is frozen. **Abs** = abstract only, so numbers come only from the abstract. **Cit** = citation only, not read. "Unverified" marks any number I could not trace to a primary source I read.

---

## 0. Bottom line

1. **Stretch-hold time course.** When stretch ends, the extra force falls in three parts:
   - A fast drop that follows cross-bridge re-equilibration. In warm mammalian muscle it is over within tens of ms.
   - A slower decay over hundreds of ms.
   - A small residual force enhancement (RFE), which lasts as long as activation is held (≥ 10–22 s measured).

   In humans in vivo, after large stretches, roughly **0.35–0.47 of the peak extra force remains at 0.5–1 s** and **0.14–0.28 remains at 2.5–3 s** [E from M]. In isolated rat fibres at 20 °C only about 0.1 remains at 0.5 s [E].
2. **Neither current model is right.** The Hill rule ("gone at v = 0") erases the slow and residual parts. The strain reserve ("held at R indefinitely") overstates the force by about 3–5× at 1 s and 5–10× by 3 s.
3. **RFE at low voluntary activation is real but small and inconsistent.**
   - 25 % activation: 7–12 % above isometric after 9–10 s.
   - 10 % MVC: consistent in only 4 of 12 subjects.

   In electrically or chemically controlled preparations the *absolute* RFE does not shrink as activation falls, so the *relative* RFE rises.
4. **Short-range stiffness comes back quickly when the joint is held still.**
   - Cat soleus in situ (body temperature): 30–40 ms.
   - Cool skinned fibres: up to about 1 s.

   After a reversal, the decaying extra force is unloaded within less than one short-range stretch. Part of the long-lasting RFE survives a reversal of about a third of the stretch amplitude.
5. **Intrinsic damping is small at the ankle and larger proximally.**
   - Ankle: about 0–2 N·m·s/rad.
   - Hip in stance: about 18–27 N·m·s/rad, both hips together.
   - Trunk, effective value that includes reflexes: about 33–48 N·m·s/rad.

   Damping rises sub-linearly with activation. The damping ratio stays roughly constant (ζ ≈ 0.2 at the knee), so B ∝ K^0.3–0.5.

---

## 1. Q1 — Force time course after stretch-hold, and RFE

### 1.1 Components (mechanistic frame)

- **Transient cross-bridge component, strain-limited.**
  - During a ramp, force rises steeply up to a critical stretch, then bends to a much flatter slope. This is the short-range "yield". Critical stretch values:
    - **16.6 ± 3.4 (SD) nm per half-sarcomere**, n = 15 frog fibres, 0.8–3.8 °C. Independent of velocity and of sarcomere length between 1.8 and 2.8 µm [M; Edman et al. 1981, FT].
    - **≈18 nm per half-sarcomere** in rat fibres at 20 °C [M; Pinniger et al. 2006, FT].
    - **20–35 nm per half-sarcomere** in cat soleus, quoted from Rack & Westbury 1974 [M, secondary via Pinniger 2006].
  - After stretch, the "early decaying force component" has a force–extension curve like the one during stretch. It **"disappeared over ~2 s"** at 1–4 °C.
  - A small quick release removes this component completely. The release needed is *smaller* than the critical stretch, and it shrinks with time after the stretch, along the same time course as the force [M; Edman 1981, FT].
  - The authors describe its stress–strain relation as having a "striking plastic characteristic". That is exactly the elastic-then-plastic element in the engine.
- **Slow non-cross-bridge component.**
  - In intact rat fast-fibre bundles (20 °C, 5 % L0 ramps, 0.1–10 L0/s), the decay after the ramp fits two exponentials [M; Pinniger et al. 2006, FT]:
    - fast: 100–150 s⁻¹, τ ≈ 7–10 ms;
    - slow: 2–10 s⁻¹, τ ≈ 0.1–0.5 s;
    - the fast amplitude is about 2× the slow amplitude.
  - Curve fitting gave the non-cross-bridge tension at the end of the ramp, P3*, as **0.365 ± 0.031 P0**. By 500 ms it had fallen to P3 = **0.084 ± 0.008 P0**, about 20–23 % of its peak.
  - The cross-bridge plateau increment P_L was **0.602 ± 0.032 P0**, and P_k − P2 was 0.20 ± 0.01 P0 (n = 5).
  - Faster stretches decayed faster, so P3 measured at a fixed 500 ms was slightly higher after slow stretches [M].
- **Residual force enhancement (RFE).** This is the steady force above isometric at the final length.
  - Frog fibres: on the descending limb it "decayed only slowly and stayed higher throughout" tetani of up to 8 s [M; Edman et al. 1982, Abs].
  - At sarcomere lengths of 1.9–2.3 µm the enhancement "decayed rapidly". Above 2.3 µm it "was still present after 4 s" [M; Edman et al. 1978, Abs].
  - Raising the temperature *reduced* the velocity-dependent and early-decaying components and *increased* the long-lasting one [M; Edman et al. 1984, Abs].

### 1.2 Fibres and myofibrils

| Preparation | Temp | Peak / plateau during stretch | After stretch | Source (access) |
|---|---|---|---|---|
| Frog single fibres | 0.8–3.8 °C | breakpoint at 16.6 ± 3.4 nm/hs | early component gone in ~2 s; RFE on descending limb only, uninfluenced by velocity | Edman 1981 (FT), 1982 (Abs) |
| Frog fibres | 0.5–3.6 °C | — | RFE linearly related to the slow rise during the ramp; elastic recoil on release grows with RFE (LS = 0.200·FE + 8.65 nm/hs) | Edman & Tsuchiya 1996 (Abs) |
| Rat fast intact bundles | 20 °C | P_L 0.60 P0 (cross-bridge) + P3* 0.37 P0 | biexponential, τ ≈ 7–10 ms and 0.1–0.5 s; RFE 0.084 P0 at 500 ms; RFE velocity-insensitive | Pinniger 2006 (FT) |
| Rat **soleus (slow)** intact bundles | 20 °C | higher P2/P0 than fast fibres | **P3 = 0, no RFE** (single preliminary experiment) | Pinniger 2006 (FT) |
| Rat fast bundles, 10 → 35 °C | 10–35 °C | lengthening tension largely temperature-insensitive, so it falls relative to P0 when warm | **RFE "markedly reduced" on warming** (numbers not in abstract) | Roots et al. 2012 (Abs) |
| Rabbit psoas / soleus skinned | — | — | absolute RFE unchanged at **low Ca²⁺**, BDM, or low pH, so relative RFE larger; measured **15 s** after stretch (n = 60 fibres) | Fukutani & Herzog 2018 (Abs) |
| Rabbit psoas skinned | — | — | RFE shifts force–pCa curve **left** (higher Ca²⁺ sensitivity; titin-dependent) | Joumaa & Herzog 2014 (Abs) |
| Rabbit psoas bundles | — | — | RFE 38 ± 4 % (SEM) after slow stretch, **abolished by very fast stretch** (0.08 vs 800 µm·s⁻¹ as given in abstract; per-sarcomere vs per-fibre units unverified) | Liu et al. 2022 (Abs) |
| Human VL single fibres vs joint | — | — | RFE ≈ 20 % in fibres vs ≈ 5 % at the joint in the same 16 subjects | Hinks et al. 2025 (Abs) |

### 1.3 Whole animal muscle

- **Cat soleus in situ, stimulated at 5 Hz and 30 Hz** [M; Herzog & Leonard 2002, Abs]:
  - RFE was "small but consistent" on the ascending limb at **both** frequencies. 5 Hz is a low-activation state. Magnitudes are not in the abstract.
  - On the descending limb, passive force enhancement made up >50 % of total RFE for 6–9 mm stretches, peaking at 83.7 %.
  - The passive enhancement "only disappeared once the muscle was shortened".
- **Cat soleus, 3–24 mm stretches** [M; Hisey et al. 2009, Abs]: RFE grew with amplitude on the descending limb up to a threshold, then plateaued. It did not grow with amplitude on the ascending limb.
- **Areflexive cat soleus at physiological temperature** [M; Lin & Rymer 1993, Abs]:
  - High short-range stiffness for the first **400–900 µm**, then yield, then a force plateau.
  - The plateau was mostly velocity-dependent, but weakly: a 10-fold faster stretch gave less than 2-fold more force.
  - After stretch ended, small-signal stiffness "returned to its prestretch magnitude shortly (30–40 ms)". The authors read the yield as "a transition between short-range, transient elastic behavior to steady-state, essentially viscous behavior".
  - Lin & Rymer 1998 [Abs] add that areflexive muscle behaves like a viscous damper after yield, with force varying only with velocity.
- **Slow fibres can yield in force** [M; Nichols & Houk 1976, Abs; Malamud et al. 1996, Abs]:
  - In areflexive soleus, "muscular stiffness becomes negative transiently during stretch".
  - Type I fibres yield beyond about 1 % of muscle length, with force actually *falling* during continued stretch, over 0.01–2 ML/s.

### 1.4 Human in vivo (stretch-hold)

| Study | Muscle, drive | Stretch | Peak extra during stretch | After stretch | Fraction of peak extra remaining [E] |
|---|---|---|---|---|---|
| Cook & McDonagh 1995 (Abs) | FDI, tetanic electrical | constant velocity | up to +80 %, depends on amplitude and velocity | "decayed quickly for the first 100 ms and thereafter much more slowly", to +30 %; independent of velocity, dependent on amplitude | ≈0.4 (upper-bound pairing of "up to" values) |
| Seiberl et al. 2015 (FT) | adductor pollicis, 50 Hz electrical at 50.0 ± 5.7 % MVC, n = 14 | 30° at 161 ± 6°/s | 89.0 ± 12.0 N vs 54.5 ± 10.4 N isometric (+63 %) | 116.4 ± 7.4 % at **2.5–3 s** | **0.26** |
| Hahn et al. 2010 (Abs) | multi-joint leg extension, **maximal** voluntary, n = 22 | 20° at 60°/s | +26–30 % | 10.5–12.3 % at **0.5–1 s**; 4.3–7.4 % at **2.5–3 s** | **0.35–0.47** (0.5–1 s); **0.14–0.28** (2.5–3 s) |
| Pinniger & Cresswell 2007 (Abs) | PF and DF, **25 %** voluntary (EMG feedback); PF electrical | 15° at 15°/s | not in abstract | RFE at **9–10 s**: 7 % (PFv), 13 % (PFs), 12 % (DFv) | — |
| Lee & Herzog 2002 (Abs) | adductor pollicis, MVC and electrical, n = 12 | 10–30° at 10–60°/s | — | steady RFE present; some enhancement persisted after relaxation (passive) | — |
| de Ruiter et al. 2000 (Abs) | adductor pollicis, tetanic | various velocities | transient component rises with velocity, proportional to activation | steady component **not affected by velocity or by activation level** | — |
| Hahn et al. 2007 (Abs) | quadriceps, MVC, n = 15 | 15–35° at 60°/s | peak before end of stretch | **no significant active RFE**; small passive enhancement | — |

Taken together: in humans at body temperature, after large stretches, about 0.35–0.47 of the peak extra force is left at 0.5–1 s and 0.15–0.28 at 2.5–3 s. This is consistent across electrical and maximal voluntary drive [E].

### 1.5 Dependencies of RFE

- **Activation**
  - Absolute RFE is preserved when cross-bridge force is reduced: low Ca²⁺ (Fukutani & Herzog 2018), BDM (Rassier & Herzog 2004: "BDM … increased the total force enhancement"), BTS (Pinniger 2006: P3 "not depressed at all" with tetanic force down about 70 %).
  - Human electrically evoked RFE at 10, 30 and 60 % MVC was present in all subjects (n = 10) [M; Oskouei & Herzog 2009, Abs].
  - Voluntary results are mixed:
    - Seiberl et al. 2012 (30 % vs 60 %, n = 30 quadriceps): RFE "independent of the level of activation" [M, Abs].
    - Oskouei & Herzog 2006a: consistent RFE in **4/12 subjects at 10 %** and 10/12 at 60 % of maximal effort; absolute RFE grew from 10 % to 60 % [M, Abs].
    - Oskouei & Herzog 2005: 30 % MVC, 8/17 subjects [M, Abs].
    - Oskouei & Herzog 2006b: with the hold always at 30 %, RFE grew with activation *during the stretch*; a passive stretch gave none [M, Abs].
  - Meta-analysis: the voluntary effect is small, SMD = 0.323 (95 % CI 0.237–0.410), with evidence of publication bias. The electrically evoked effect is larger, SMD = 0.84 (0.29–1.39). The authors note "the increase in torque relative to the isometric contraction is similar across maximal and submaximal contractions" [M; de Campos et al. 2022, FT].
- **Amplitude**
  - In fibres and animal muscle, RFE grows with amplitude on the descending limb and plateaus (Edman 1978/1982; Hisey 2009).
  - In humans, a meta-regression found no amplitude effect [M; de Campos 2022]. Muscle length mattered more than amplitude [M; Bakenecker et al. 2022, Abs].
- **Velocity**
  - RFE is independent of velocity (Edman 1978/1982; Pinniger 2006; Cook & McDonagh 1995; de Ruiter 2000; Tilp et al. 2009, Abs).
  - Exception: near-step stretches in skinned fibres abolished it (Liu 2022).
  - The *transient* force does scale with velocity.
- **Muscle length**
  - Bakenecker 2022 (50 % EMG-matched quadriceps, n = 11): torque-based RFE was **2 ± 5 %** (short, not significant), **7 ± 5 %** (long) and **12 ± 8 %** (very long) [M].
  - Frog: rapid decay at sarcomere lengths ≤ 2.3 µm (Edman 1978).
- **Temperature, fibre type, scale.** RFE is reduced when warm (Roots 2012). It was absent in rat slow fibres in vitro (Pinniger 2006) but present in cat soleus in situ (Herzog & Leonard 2002). It is about 4× smaller at the joint than in fibres (Hinks 2025).

### 1.6 Duration

RFE persists for as long as activation is held at a constant level:

- ≥ 8 s (Edman 1982);
- 9–10 s at 25 % voluntary (Pinniger & Cresswell 2007);
- 15 s in fibres (Fukutani & Herzog 2018);
- **"present for up to 22 s post-stretch"** during 30 % voluntary multi-joint extension, at 3–22 % above isometric (Seiberl et al. 2013) [all M, Abs].

The passive part survives deactivation and is removed only by shortening (Herzog & Leonard 2002). It partly survives a 1-s interruption of activation (Herzog & Leonard 2005) [M, Abs].

---

## 2. Q2 — Short-range stiffness recovery and thixotropy

- **Held still after a ramp, warm mammalian muscle:** small-signal stiffness is back to control **30–40 ms** after the stretch ends (cat soleus, areflexive, activated by crossed-extension reflex) [M; Lin & Rymer 1993, Abs].
  - In the same study, the initial stiffness of a *second* ramp, given 0–500 ms later, was still reduced in a time-dependent way. The plateau force of the second ramp was unchanged.
  - Initial stiffness and yielding recover at *different* rates during an isometric delay, which suggests distinct processes [M; Huyghues-Despointes et al. 2003b, Abs; rates not in abstract].
- **Activation dependence:** the rates of stiffness and tension recovery *increase* with Ca²⁺ activation [M; Campbell & Moss 2002, Abs, rat soleus skinned, paired 3 % L0 ramps at ±0.1 L0/s]. Recovery is therefore slower at the low activations Touchline uses.
- **Posturally relevant amplitudes at low activation** (rat soleus skinned, 22 °C, n = 11, activation < 15 % / 15–40 % / > 40 %) [M; Horslen et al. 2023, FT]:
  - SRS and impulse stayed **near 100 %** when the conditioning stretch–shorten cycle was below about 1 % L0, or came more than about 1 s before the test.
  - SRS was significantly reduced at an inter-stretch interval of 0.1 s for amplitudes ≥ 2.88 % L0.
  - The maximum reduction was about **70 %**, for amplitudes > 3 % L0 and intervals ≤ 0.01–0.1 s. Shorter intervals than 0.01 s, or amplitudes above about 3–6 % L0, added nothing.
  - The reduction "cannot be predicted solely on muscle force at the time of stretch".
  - Earlier work cited there: a 3 % L0 conditioning stretch cuts test SRS by up to about 50 %, and recovery continues monotonically "up to at least 10 s".
- **Relaxed muscle (passive thixotropy) runs on much longer time scales.**
  - Frog fibres: the SREC covers the first ~0.4 % L0. A zero interval between stretches was not much worse than 0.5–1 s. The biphasic SREC appears on the first movement after rest "irrespective of the direction of movement" [M; Campbell & Lakie 1998, Abs].
  - Human finger muscles keep stiffening at rest for ≥ 30 min. Movement resets this; isometric effort does not [M; Lakie & Robson 1988, Abs].
  - Reviews: Proske et al. 1993 (Cit); Lakie & Campbell 2019 (Abs).
- **On reversal:**
  - Short-range stiffness reappears at the start of each movement after a reversal. With larger movements the muscle shows "frictional" hysteresis: tension is higher during lengthening than during shortening [M; Rack & Westbury 1974, Abs].
  - The decaying extra force is removed by a release smaller than the critical stretch [M; Edman 1981, FT].
  - The long-lasting RFE is **not** immediately removed by shortening. After a 30° stretch followed by 10° of shortening, 10 % RFE remained, compared with 16 % after stretch alone. After 20° or 30° of shortening, force was no longer significantly different from isometric [M; Seiberl et al. 2015, FT].
  - After full stretch–shortening cycles at 20–50 % electrically stimulated MVC, no RFE persisted [M; Groeber et al. 2020, Abs].
- **Modelling.** Hill-type models do not capture SRS or its history dependence. Cross-bridge models with cooperative thin- and thick-filament activation do [M; van der Zee et al. 2026, FT, on the Horslen dataset].

---

## 3. Q3 — Joint-level ramp-and-hold in humans

- **Reflex window.**
  - Ankle dorsiflexors: reflex contribution to torque begins **≈50 ms** after stretch onset and peaks at **150–300 ms**.
  - Intrinsic stiffness, measured during 7–50 Hz nerve stimulation, rises linearly from about 0.5 to about 2.5 N·m/deg at 80 % MVC.
  - Stiffness was nearly independent of amplitude over 2–7°. **1° stretches gave higher stiffness**, attributed to short-range stiffness [M; Sinkjaer et al. 1988, Abs].
  - Soleus phasic EMG starts at **41 ± 4 ms** (5° at 170°/s), and a silent period ends at 170–210 ms [M; Toft et al. 1991, Abs].
  - Consequence: in voluntary hold experiments, torque beyond about 50 ms is reflex-contaminated. The intrinsic hold time course must come from constant-drive (electrical) data (§1.4).
- **Yield angle.**
  - Passive calf in standing: contractile stiffness shows a marked transition at about **0.5°**, and the contractile/series stiffness ratio falls from 18 ± 11 to 1 ± 0.4 between 0.1° and 7° [M; Loram et al. 2007, Abs].
  - Fast 40-ms ramp-and-hold (0.005–0.08 rad): intrinsic ankle-foot stiffness falls from **0.93 ± 0.09 to 0.44 ± 0.06 mgh** [M; Vlutters et al. 2015, Abs].
  - 0.2° perturbations give higher stiffness than 0.9° perturbations [M; Sakanaka et al. 2018, 2021, Abs].
  - The engine's θ_y ≈ 1° is at the upper end of this evidence; 0.5–1° is plausible [E].
- **Large imposed stretch of active triceps surae:** stiffness rose late in the stretch ("did not yield significantly"). Post-stretch steady-state stiffness was about 60 % above the pre-stretch value. The reflex torque twitch began about 60 ms after stretch onset [M; Kirsch & Kearney 1997, Abs].
- **100–1000 ms torque under constant drive.** Human data (Cook & McDonagh 1995; Seiberl 2015; Pinniger & Cresswell 2007 PFs) show:
  - a fast decay that is complete by about 100 ms;
  - a slow decay over 0.1 to a few seconds;
  - a plateau 7–30 % above isometric.

  I found no human ankle or knee study that reports a fitted time constant for the hold phase under constant drive (gap).

---

## 4. Q4 — Intrinsic joint damping

| Joint | Value (N·m·s/rad) | Condition | Label, source (access) |
|---|---|---|---|
| Ankle, standing (two-joint model; both legs) | 2.2 ± 11.4 (low amplitude); 0.0 ± 19.5 (high amplitude); authors: "<3 N m s/rad and less than their SE" | quiet stance, visual-scene perturbation, n = 17; ± type (SD vs SE) unverified | [M] Kiemel et al. 2008 (FT-s) |
| Ankle, walking (per leg) | 0.010–0.024 per kg, about 0.75–1.8 for 75 kg | stiffness 0.35–6.42 N·m/rad/kg over the same phases | [M] Lee, Rouse & Krebs 2016 (FT); the absolute conversion is [MODEL] |
| Ankle, model conventions | 1.1 (simulation "consistent with" Mirbagheri 2000); 4.0 (standing model, whole body) | — | [MODEL] Golkar et al. 2017 (FT); Asai et al. 2009 (FT) |
| Ankle, scaling | viscous term increases with mean torque; inertia constant | seated, stochastic perturbation | [M qualitative] Hunter & Kearney 1982; Weiss et al. 1986 (Abs); numbers not obtained |
| Knee, swing | 0.02–0.14 (stiffness 0–3.5 N·m/rad) | walking at 0.5 m/s, n = 9 | [M] van der Kooij et al. 2022 (Abs) |
| Knee, seated | **damping ratio ≈ 0.2 from relaxed to 50 % MVC**; natural frequency rises more than 2× | random perturbation | [M] Zhang et al. 1998 (Abs) |
| Hip, standing (both hips) | 27.4 ± 10.0 (low amplitude); 18.0 ± 11.6 (high amplitude); stiffness 95–147 N·m/rad | quiet stance, n = 17 | [M] Kiemel 2008 (FT-s) |
| Hip, swing (per leg) | 1.9–4.6 (stiffness 34–66 N·m/rad) | walking at 0.5 m/s | [M] van der Kooij 2022 (Abs) |
| Lumbar trunk (**effective, includes reflexes**) | 33.4 ± 26.1 (extension) to 47.8 ± 36.0 (axial rotation); flexion and lateral bending lie within this range | quick release, semi-seated, n = 14 | [M] Cholewicki et al. 2010 (FT) |
| Trunk, translational at T10 | 314 ± 72 N·s/m; stiffness 2.78 ± 0.96 N/mm; mass 37 kg | extension preloads of 100–170 N, n = 21 | [M] Moorhouse & Granata 2005 (Abs). As rotation: B ≈ c·r², e.g. r = 0.3 m gives ≈28 [MODEL, r assumed] |
| Trunk, quick-release stiffness | 785 (SD 580) to 2200 (SD 1015) N·m/rad as load rises | flexion, extension, lateral bending | [M] Cholewicki et al. 2000 (Abs); damping not in abstract |
| Neck | no measured B obtained. Model without reflexes: underdamped, 5.2 dB peak at 2.1 Hz (≈ ζ 0.3 [E]). Effective neck stiffness and viscosity rise with 2.2–8.9 N preload | yaw model; sagittal impulses | Peng et al. 1996 (Abs); Simoneau et al. 2008 (Abs) |
| Arm (cross-check only) | elasticity roughly linear in force, viscosity non-linear; **damping ratio "remarkably consistent"** | multijoint isometric | [M] Perreault et al. 2004 (Abs); Zhang & Rymer 1997 elbow; Milner & Cloutier 1998 wrist (the damping coefficient falls as velocity rises) |

**Scaling with activation.**

- Intrinsic K is close to linear in torque (Sinkjaer 1988; Weiss 1986; Mirbagheri 2000 [Abs]).
- With ζ roughly constant (knee about 0.2; the arm), B = 2ζ√(I·K) ∝ K^0.5 [MODEL].
- In walking, ankle K varies 18× while B varies 2.4×, which gives an effective exponent of **≈0.3** [MODEL from Lee 2016].
- Golkar 2017 and van Eesbeek (as cited there) report only small variation in viscosity with activation.

---

## 5. Recommendations

**Proposed form** [MODEL]. Let R be the extra force on the yield plateau at the moment velocity reaches zero. While the stretch is held, model the extra force as:

F_ex(t) = R · [ f_res + w_s·e^(−t/τ_s) + w_f·e^(−t/τ_f) ],  with w_f + w_s + f_res = 1.

This can be built as three parallel elastic-plastic elements of stiffness w_i·K and cap w_i·R. Two of them are Maxwell elements whose anchor angles relax toward the current angle, with time constants τ_f and τ_s; the third is the residual. One state variable then gives three things:

- stress relaxation;
- recovery of short-range stiffness at the same rate (as in Edman 1981 and Lin & Rymer 1993);
- elastic unloading over less than θ_y on reversal.

The residual element is not a short-range spring (Seiberl 2015). [D] Hold it while activation is held, and reduce it linearly to zero as shortening reaches about 2/3 of the preceding stretch amplitude.

| # | Quantity | Central | Sensitivity range | Label | Basis |
|---|---|---|---|---|---|
| 5a-1 | Fraction of R left at **100 ms** | **0.40** | 0.25–0.60 | [E]/[D] | fast decay over by about 100 ms in humans (Cook & McDonagh); 30–40 ms stiffness recovery at body temperature (Lin & Rymer); fast:slow amplitude ≈ 2:1 (Pinniger) |
| 5a-2 | Fraction at **300 ms** | **0.31** | 0.15–0.45 | [E]/[D] | slow τ 0.1–0.5 s at 20 °C (Pinniger) |
| 5a-3 | Fraction at **1 s** | **0.19** | 0.08–0.35 | [E]/[D] | humans 0.35–0.47 at 0.5–1 s (Hahn, maximal, large stretch); rat about 0.1 at 0.5 s |
| 5a-4 | Plateau fraction (≥ 3 s; lasts while activation is constant) | **0.15** | 0–0.30 | [E]/[D] | humans 0.14–0.28 at 2.5–3 s; lower at short or mid muscle lengths and small stretches (Bakenecker 2 ± 5 %; Edman SL ≤ 2.3 µm) |
| 5b-1 | τ_f (cross-bridge component), w_f | **20 ms**, 0.55 | 10–40 ms, 0.45–0.70 | [E] | Pinniger 7–10 ms at 20 °C; Lin & Rymer 30–40 ms in vivo |
| 5b-2 | τ_s (slow component), w_s | **0.5 s**, 0.30 | 0.2–1.5 s, 0.2–0.4 | [E] | Pinniger 0.1–0.5 s at 20 °C; Hahn still decaying between 0.75 and 2.75 s |
| 5b-3 | Single τ, if one exponential to f_res is required | **0.15 s** | 0.05–0.5 s | [D] | a one-exponential fit cannot match both 100 ms and 1 s; prefer the two-stage form |
| 5b-4 | Residual duration | ≥ 10 s while activation is constant | 10–22 s measured | [M] | Pinniger & Cresswell; Fukutani; Seiberl 2013 |
| 5b-5 | Recovery of short-range stiffness while held | same τ_f / τ_s as relaxation | 30 ms – 1 s; slower at low activation | [M]/[D] | Lin & Rymer; Campbell & Moss; Horslen |
| 5b-6 | Activation dependence of the fractions (5–30 %) | none (fractions independent of a) | f_res × 0.5–2 at a ≤ 0.1 | [D] | absolute RFE independent of a in vitro (relative rises) vs inconsistent voluntary RFE at 10 % — the sign is unresolved |
| 5c-1 | Ankle B (per joint) at 5–30 % | **1.0** | 0.3–2.0 | [M]/[E] | Kiemel < 3 (both legs); walking 0.75–1.8 |
| 5c-2 | Knee B | 2·ζ·√(I·K(a)), ζ = **0.2** | ζ 0.1–0.3; floor 0.02–0.14 | [M]/[MODEL] | Zhang 1998; van der Kooij 2022 |
| 5c-3 | Hip B (per hip) | **3** at about 5 %, **10** at 20–30 % stance | 2–14 | [E] | swing 1.9–4.6; standing 18–27 for both hips |
| 5c-4 | Lumbar B (flexion, extension, lateral bending) | **20** (intrinsic) | 10–40 | [E]/[D] | effective 33–48 includes reflexes; the translational value converts to about 28 |
| 5c-5 | Neck B | 2·ζ·√(I·K), ζ = **0.25** | 0.15–0.35 | [E]/[D] | no measured value obtained |
| 5c-6 | Activation scaling | B(a) = B_pass + (B_ref − B_pass)·(a/0.2)^**0.4** | exponent 0.3–0.5 | [MODEL] | constant ζ gives 0.5; walking ankle gives 0.3 |

Check of the central curve:

- 0.15 + 0.30·e^(−0.1/0.5) + 0.55·e^(−0.1/0.02) = 0.40 at 100 ms.
- 0.31 at 300 ms; 0.19 at 1 s; 0.15 at 3 s.

Against the two current models:

- **Strain reserve (always 1.0):** too high by **2.5× at 100 ms, 3.2× at 300 ms, 5.3× at 1 s**.
- **Hill rule (0 at v = 0):** removes 100 % of the force immediately.

---

## 6. Caveats

1. **The decay data come from large stretches.** Nearly all hold-phase data use stretches well beyond yield: 5 % L0 in fibres, 15–35° at the joint. For stretches of only 1–3 θ_y at mid-range angles, the residual should sit at the low end (0–0.1) [E]. For large stretches near the end of range, the in vivo human data (0.2–0.4 at 1–3 s) argue for the high end.
2. **Temperature.** Frog data were taken at 1–4 °C and rat data at 20–22 °C. Cross-bridge kinetics are much faster at 37 °C, and RFE falls on warming (Roots 2012). The human in vivo numbers are the most relevant. The time constants above are estimates and have not been measured at a human joint.
3. **Low activation.** The evidence at ≤ 25 % voluntary activation comes from a few small studies. Responders and non-responders exist, and publication bias is likely (de Campos 2022). Under voluntary control, part of the RFE shows up as a *reduction in EMG* at matched torque rather than as extra torque at matched EMG.
4. **Slow, postural muscles.** In vitro, slow fibres showed no RFE (Pinniger 2006, n = 1) and force yield (Malamud 1996). In situ cat soleus and human plantarflexors do show RFE. Soleus-dominated plantarflexion may sit lower in the range.
5. **Reflexes.** Every voluntary joint record after about 50 ms includes reflexes. The trunk damping values are "effective" and include them. Do not let damping and the eccentric reserve double-count the reflex. Also subtract the engine's linearised Hill force–velocity slope from the measured B so it is not counted twice [MODEL].
6. **Accuracy of measured damping.** Ankle damping is close to zero with large SE (Kiemel). Most values are fits of a second-order model over 40–100 ms windows. The Kearney/Hunter/Weiss/Mirbagheri ankle B magnitudes were not obtainable (abstract only), and Kiemel's ± dispersion type is unverified.
7. **Unit ambiguity.** Liu 2022 stretch-velocity units are unverified (abstract only). The Cook & McDonagh fraction pairs two "up to" values.

---

## 7. References

Access codes as in the scope section.

- Asai Y et al. (2009) A model of postural control in quiet standing… PLoS One 4:e6169. doi:10.1371/journal.pone.0006169; PMID 19584944. FT.
- Bakenecker P, Weingarten T, Hahn D, Raiteri B (2022) Residual force enhancement is affected more by quadriceps muscle length than stretch amplitude. eLife 11:e77553. doi:10.7554/elife.77553; PMID 35579415. Abs (OA).
- Campbell KS, Lakie M (1998) A cross-bridge mechanism can explain the thixotropic short-range elastic component of relaxed frog skeletal muscle. J Physiol 510:941–962. doi:10.1111/j.1469-7793.1998.941bj.x; PMID 9660904. Abs.
- Campbell KS, Moss RL (2002) History-dependent mechanical properties of permeabilized rat soleus muscle fibers. Biophys J 82:929–943. doi:10.1016/S0006-3495(02)75454-4; PMID 11806934. Abs.
- Cholewicki J, Simons AP, Radebold A (2000) Effects of external trunk loads on lumbar spine stability. J Biomech 33:1377–1385. doi:10.1016/S0021-9290(00)00118-4; PMID 10940396. Abs.
- Cholewicki J, McGill KC, Shah KR, Lee AS (2010) The effects of a three-week use of lumbosacral orthoses… BMC Musculoskelet Disord 11:154. doi:10.1186/1471-2474-11-154; PMID 20609255. FT.
- Cook CS, McDonagh MJ (1995) Force responses to controlled stretches of electrically stimulated human muscle-tendon complex. Exp Physiol 80:477–490. doi:10.1113/expphysiol.1995.sp003862; PMID 7640012. Abs.
- de Campos D, Orssatto LBR, Trajano GS, Herzog W, Fontana HB (2022) Residual force enhancement in human skeletal muscles: a systematic review and meta-analysis. J Sport Health Sci 11:94–103. doi:10.1016/j.jshs.2021.05.006; PMID 34062271. FT.
- de Ruiter CJ, Didden WJ, Jones DA, de Haan A (2000) The force-velocity relationship of human adductor pollicis muscle during stretch and the effects of fatigue. J Physiol 526:671–681. doi:10.1111/j.1469-7793.2000.00671.x; PMID 10922017. Abs.
- Edman KA, Elzinga G, Noble MI (1978) Enhancement of mechanical performance by stretch during tetanic contractions of vertebrate skeletal muscle fibres. J Physiol 281:139–155. doi:10.1113/jphysiol.1978.sp012413; PMID 309001. Abs.
- Edman KA, Elzinga G, Noble MI (1981) Critical sarcomere extension required to recruit a decaying component of extra force during stretch… J Gen Physiol 78:365–382. doi:10.1085/jgp.78.4.365; PMID 6974762. FT.
- Edman KA, Elzinga G, Noble MI (1982) Residual force enhancement after stretch of contracting frog single muscle fibers. J Gen Physiol 80:769–784. doi:10.1085/jgp.80.5.769; PMID 6983564. Abs.
- Edman KA, Elzinga G, Noble MI (1984) Stretch of contracting muscle fibres… Adv Exp Med Biol 170:739–751. doi:10.1007/978-1-4684-4703-3_71; PMID 6611040. Abs.
- Edman KA, Tsuchiya T (1996) Strain of passive elements during force enhancement by stretch in frog muscle fibres. J Physiol 490:191–205. doi:10.1113/jphysiol.1996.sp021135; PMID 8745287. Abs.
- Fukutani A, Herzog W (2018) Residual force enhancement is preserved for conditions of reduced contractile force. Med Sci Sports Exerc 50:1186–1191. doi:10.1249/MSS.0000000000001563; PMID 29373340. Abs.
- Golkar MA, Sobhani Tehrani E, Kearney RE (2017) Linear parameter varying identification of dynamic joint stiffness… Front Comput Neurosci 11:35. doi:10.3389/fncom.2017.00035; PMID 28579954. FT.
- Groeber M, Stafilidis S, Seiberl W, Baca A (2020) Contribution of stretch-induced force enhancement to increased performance… Front Physiol 11:592183. doi:10.3389/fphys.2020.592183; PMID 33281623. Abs.
- Hahn D, Seiberl W, Schwirtz A (2007) Force enhancement during and following muscle stretch of maximal voluntarily activated human quadriceps femoris. Eur J Appl Physiol 100:701–709. doi:10.1007/s00421-007-0462-3; PMID 17476525. Abs.
- Hahn D, Seiberl W, Schmidt S, Schweizer K, Schwirtz A (2010) Evidence of residual force enhancement for multi-joint leg extension. J Biomech 43:1503–1508. doi:10.1016/j.jbiomech.2010.01.041; PMID 20167325. Abs.
- Herzog W, Leonard TR (2002) Force enhancement following stretching of skeletal muscle: a new mechanism. J Exp Biol 205:1275–1283. doi:10.1242/jeb.205.9.1275; PMID 11948204. Abs.
- Herzog W, Leonard TR (2005) The role of passive structures in force enhancement of skeletal muscles following active stretch. J Biomech 38:409–415. doi:10.1016/j.jbiomech.2004.05.001; PMID 15652538. Abs.
- Hinks A, Jacob KBE, Patterson MA, Dalton BE, Power GA (2025) Residual force enhancement decreases when scaling from the single muscle fiber to joint level in humans. J Sport Health Sci 14:101000. doi:10.1016/j.jshs.2024.101000; PMID 39454825. Abs.
- Hisey B, Leonard TR, Herzog W (2009) Does residual force enhancement increase with increasing stretch magnitudes? J Biomech 42:1488–1492. doi:10.1016/j.jbiomech.2009.03.046; PMID 19442977. Abs.
- Horslen BC, Milburn GN, Blum KP, Simha SN, Campbell KS, Ting LH (2023) History-dependent muscle resistance to stretch remains high after small, posturally relevant pre-movements. J Exp Biol 226:jeb245456. doi:10.1242/jeb.245456; PMID 37661732. FT.
- Hunter IW, Kearney RE (1982) Dynamics of human ankle stiffness: variation with mean ankle torque. J Biomech 15:747–752. doi:10.1016/0021-9290(82)90089-6; PMID 7153227. Abs.
- Huyghues-Despointes CM, Cope TC, Nichols TR (2003a) Intrinsic properties and reflex compensation in reinnervated triceps surae muscles of the cat: effect of activation level. J Neurophysiol 90:1537–1546. doi:10.1152/jn.00718.2002; PMID 12736242. Abs.
- Huyghues-Despointes CM, Cope TC, Nichols TR (2003b) Intrinsic properties and reflex compensation in reinnervated triceps surae muscles of the cat: effect of movement history. J Neurophysiol 90:1547–1555. doi:10.1152/jn.00719.2002; PMID 12736243. Abs.
- Joumaa V, Herzog W (2014) Calcium sensitivity of residual force enhancement in rabbit skinned fibers. Am J Physiol Cell Physiol 307:C395–C401. doi:10.1152/ajpcell.00052.2014; PMID 24965591. Abs.
- Kiemel T, Elahi AJ, Jeka JJ (2008) Identification of the plant for upright stance in humans… J Neurophysiol 100:3394–3406. doi:10.1152/jn.01272.2007; PMID 18829854. FT-s (Table 2).
- Kirsch RF, Kearney RE (1997) Identification of time-varying stiffness dynamics of the human ankle joint during an imposed movement. Exp Brain Res 114:71–85. doi:10.1007/PL00005625; PMID 9125453. Abs.
- Lakie M, Campbell KS (2019) Muscle thixotropy—where are we now? J Appl Physiol 126:1790–1799. doi:10.1152/japplphysiol.00788.2018; PMID 31070959. Abs.
- Lakie M, Robson LG (1988) Thixotropic changes in human muscle stiffness and the effects of fatigue. Q J Exp Physiol 73:487–500. doi:10.1113/expphysiol.1988.sp003169; PMID 3174910. Abs.
- Lee H, Rouse EJ, Krebs HI (2016) Summary of human ankle mechanical impedance during walking. IEEE J Transl Eng Health Med 4:2100407. doi:10.1109/JTEHM.2016.2601613; PMID 27766187. FT.
- Lee HD, Herzog W (2002) Force enhancement following muscle stretch of electrically stimulated and voluntarily activated human adductor pollicis. J Physiol 545:321–330. doi:10.1113/jphysiol.2002.018010; PMID 12433972. Abs.
- Lin DC, Rymer WZ (1993) Mechanical properties of cat soleus muscle elicited by sequential ramp stretches. J Neurophysiol 70:997–1008. doi:10.1152/jn.1993.70.3.997; PMID 8229184. Abs.
- Lin DC, Rymer WZ (1998) Damping in reflexively active and areflexive lengthening muscle evaluated with inertial loads. J Neurophysiol 80:3369–3372. doi:10.1152/jn.1998.80.6.3369; PMID 9862935. Abs.
- Liu S, Joumaa V, Herzog W (2022) Fast stretching of skeletal muscle fibres abolishes residual force enhancement. J Exp Biol 225:jeb244011. doi:10.1242/jeb.244011; PMID 35485194. Abs.
- Loram ID, Maganaris CN, Lakie M (2007) The passive, human calf muscles in relation to standing: the short range stiffness lies in the contractile component. J Physiol 584:677–692. doi:10.1113/jphysiol.2007.140053; PMID 17823208. Abs.
- Malamud JG, Godt RE, Nichols TR (1996) Relationship between short-range stiffness and yielding in type-identified, chemically skinned muscle fibers… J Neurophysiol 76:2280–2289. doi:10.1152/jn.1996.76.4.2280; PMID 8899603. Abs.
- Mirbagheri MM, Barbeau H, Kearney RE (2000) Intrinsic and reflex contributions to human ankle stiffness: variation with activation level and position. Exp Brain Res 135:423–436. doi:10.1007/s002210000534; PMID 11156307. Abs.
- Moorhouse KM, Granata KP (2005) Trunk stiffness and dynamics during active extension exertions. J Biomech 38:2000–2007. doi:10.1016/j.jbiomech.2004.09.014; PMID 16084200. Abs.
- Nichols TR, Houk JC (1976) Improvement in linearity and regulation of stiffness that results from actions of stretch reflex. J Neurophysiol 39:119–142. doi:10.1152/jn.1976.39.1.119; PMID 1249597. Abs.
- Oskouei AE, Herzog W (2005) Observations on force enhancement in submaximal voluntary contractions of human adductor pollicis muscle. J Appl Physiol 98:2087–2095. doi:10.1152/japplphysiol.01217.2004; PMID 15705725. Abs.
- Oskouei AE, Herzog W (2006a) Force enhancement at different levels of voluntary contraction in human adductor pollicis. Eur J Appl Physiol 97:280–287. doi:10.1007/s00421-006-0167-z; PMID 16596318. Abs.
- Oskouei AE, Herzog W (2006b) The dependence of force enhancement on activation in human adductor pollicis. Eur J Appl Physiol 98:22–29. doi:10.1007/s00421-006-0170-4; PMID 16850317. Abs.
- Oskouei AE, Herzog W (2009) Activation-induced force enhancement in human adductor pollicis. J Electromyogr Kinesiol 19:821–828. doi:10.1016/j.jelekin.2008.02.009; PMID 18430589. Abs.
- Peng GC, Hain TC, Peterson BW (1996) A dynamical model for reflex activated head movements in the horizontal plane. Biol Cybern 75:309–319. doi:10.1007/s004220050297; PMID 8953740. Abs.
- Perreault EJ, Kirsch RF, Crago PE (2004) Multijoint dynamics and postural stability of the human arm. Exp Brain Res 157:507–517. doi:10.1007/s00221-004-1864-7; PMID 15112115. Abs.
- Pinniger GJ, Cresswell AG (2007) Residual force enhancement after lengthening is present during submaximal plantar flexion and dorsiflexion actions in humans. J Appl Physiol 102:18–25. doi:10.1152/japplphysiol.00565.2006; PMID 16946022. Abs.
- Pinniger GJ, Ranatunga KW, Offer GW (2006) Crossbridge and non-crossbridge contributions to tension in lengthening rat muscle: force-induced reversal of the power stroke. J Physiol 573:627–643. doi:10.1113/jphysiol.2005.095448; PMID 16627571; PMC1779750. FT.
- Proske U, Morgan DL, Gregory JE (1993) Thixotropy in skeletal muscle and in muscle spindles: a review. Prog Neurobiol 41:705–721. doi:10.1016/0301-0082(93)90032-N; PMID 8140258. Cit.
- Rack PM, Westbury DR (1974) The short range stiffness of active mammalian muscle and its effect on mechanical properties. J Physiol 240:331–350. doi:10.1113/jphysiol.1974.sp010613; PMID 4424163. Abs.
- Rassier DE, Herzog W (2004) Active force inhibition and stretch-induced force enhancement in frog muscle treated with BDM. J Appl Physiol 97:1395–1400. doi:10.1152/japplphysiol.00377.2004; PMID 15194676. Abs.
- Roots H, Pinniger GJ, Offer GW, Ranatunga KW (2012) Mechanism of force enhancement during and after lengthening of active muscle: a temperature dependence study. J Muscle Res Cell Motil 33:313–325. doi:10.1007/s10974-012-9307-8; PMID 22706970. Abs.
- Sakanaka TE, Gill J, Lakie MD, Reynolds RF (2018) Intrinsic ankle stiffness during standing increases with ankle torque and passive stretch of the Achilles tendon. PLoS One 13:e0193850. doi:10.1371/journal.pone.0193850; PMID 29558469. Abs (OA).
- Sakanaka TE, Lakie M, Reynolds RF (2021) Individual differences in intrinsic ankle stiffness and their relationship to body sway and ankle torque. PLoS One 16:e0244993. doi:10.1371/journal.pone.0244993; PMID 33481823. Abs (OA).
- Seiberl W, Hahn D, Herzog W, Schwirtz A (2012) Feedback controlled force enhancement and activation reduction of voluntarily activated quadriceps femoris during sub-maximal muscle action. J Electromyogr Kinesiol 22:117–123. doi:10.1016/j.jelekin.2011.10.010; PMID 22115525. Abs.
- Seiberl W, Paternoster F, Achatz F, Schwirtz A, Hahn D (2013) On the relevance of residual force enhancement for everyday human movement. J Biomech 46:1996–2001. doi:10.1016/j.jbiomech.2013.06.014; PMID 23845729. Abs.
- Seiberl W, Power GA, Herzog W, Hahn D (2015) The stretch-shortening cycle (SSC) revisited: residual force enhancement contributes to increased performance during fast SSCs of human m. adductor pollicis. Physiol Rep 3:e12401. doi:10.14814/phy2.12401; PMID 25975646. FT.
- Simoneau M, Denninger M, Hain TC (2008) Role of loading on head stability and effective neck stiffness and viscosity. J Biomech 41:2097–2103. doi:10.1016/j.jbiomech.2008.05.002; PMID 18571655. Abs.
- Sinkjaer T, Toft E, Andreassen S, Hornemann BC (1988) Muscle stiffness in human ankle dorsiflexors: intrinsic and reflex components. J Neurophysiol 60:1110–1121. doi:10.1152/jn.1988.60.3.1110; PMID 3171659. Abs.
- Tilp M, Steib S, Herzog W (2009) Force-time history effects in voluntary contractions of human tibialis anterior. Eur J Appl Physiol 106:159–166. doi:10.1007/s00421-009-1006-9; PMID 19214557. Abs.
- Toft E, Sinkjaer T, Andreassen S, Larsen K (1991) Mechanical and electromyographic responses to stretch of the human ankle extensors. J Neurophysiol 65:1402–1410. doi:10.1152/jn.1991.65.6.1402; PMID 1875249. Abs.
- van der Kooij H et al. (2022) Identification of hip and knee joint impedance during the swing phase of walking. IEEE Trans Neural Syst Rehabil Eng 30:1203–1212. doi:10.1109/TNSRE.2022.3172497; PMID 35503817. Abs.
- van der Zee TJ, Simha SN, Milburn GN, Campbell KS, Ting LH, De Groote F (2026) Cross-bridge model for predicting muscle short-range stiffness during movement. PLoS Comput Biol 22:e1014748. doi:10.1371/journal.pcbi.1014748; PMID 42678999. FT (partial).
- Vlutters M, Boonstra TA, Schouten AC, van der Kooij H (2015) Direct measurement of the intrinsic ankle stiffness during standing. J Biomech 48:1258–1263. doi:10.1016/j.jbiomech.2015.03.004; PMID 25843262. Abs.
- Weiss PL, Kearney RE, Hunter IW (1986) Position dependence of ankle joint dynamics—I. Passive mechanics; II. Active mechanics. J Biomech 19:727–735; 737–751. doi:10.1016/0021-9290(86)90196-X; 10.1016/0021-9290(86)90197-1; PMIDs 3793747, 3793748. Abs.
- Zhang LQ, Rymer WZ (1997) Simultaneous and nonlinear identification of mechanical and reflex properties of human elbow joint muscles. IEEE Trans Biomed Eng 44:1192–1209. doi:10.1109/10.649991; PMID 9401219. Abs.
- Zhang LQ, Nuber G, Butler J, Bowen M, Rymer WZ (1998) In vivo human knee joint dynamic properties as functions of muscle contraction and joint position. J Biomech 31:71–76. doi:10.1016/S0021-9290(97)00106-1; PMID 9596540. Abs.

Requested but not obtained or verified: Kearney & Hunter 1990 (review); Kearney, Stein & Parameswaran 1997 (ankle B values); Abbott & Aubert 1952 (Cit only); full texts of Pinniger & Cresswell 2007 and Hunter & Kearney 1982 (no SDs or B magnitudes).

<!-- Compiled 12 Oct 2026 by the PPR-3 literature agent from four parallel research subagents (reflex timing; APR/EMD/sensory latencies; control models; sway and recovery). Subagent notes, verbatim quotes and downloaded texts are in the session scratchpad (ppr3_lit_timing/). Key values listed in the Method paragraph were re-checked by the compiling agent against Europe PMC records. Evidence labels: [M] measured, [E] inferred, [MODEL] fitted model parameter, [D] design choice. -->

# Postural timing and continuous control: literature for PPR-3

Compiled 12 Oct 2026 for Touchline Physical Character V2, PPR-3.

**Purpose.** This review sets timing boundaries for two parts of the model:
1. The passive/intrinsic substrate, whose response to an unexpected push must be judged only before any neural pathway can change muscle force.
2. A separate continuous delayed postural controller, which uses only past sensed state.

It also gives human comparison values.

**Method.**
- Four parallel searches covered: stretch reflexes; automatic postural responses, electromechanical delay and sensory latencies; control models; and sway and recovery.
- Sources were PubMed, the Europe PMC REST API and open full texts, including S. Rietdyk's 1999 University of Waterloo PhD thesis. The thesis holds the full data behind Rietdyk et al. 1999.
- The compiler re-checked key values against Europe PMC records: Robinovitch 2002, Do 1988, Allum 2008, Diener 1988, Horak 1989, Kirker 2000, Masani 2008, Zhou 1995, Nordez 2009, Britton 1993, Fitzpatrick 1994, and the Rietdyk thesis passages.
- Most classic J Neurophysiol and Exp Brain Res full texts returned HTTP 403, so they are cited from abstracts.
- Raw notes and quotes are in the session scratchpad (`ppr3_lit_timing/`), not in the repository.

## 0. Conventions

- **Evidence labels.** **[M]** measured; **[MODEL]** fitted or assumed in a published model; **[E]** inferred here (arithmetic, scaling or synthesis); **[D]** design recommendation.
- **Access levels** (after each citation). (FT) full text read; (FT-w) full text read through a fetch/summariser tool; (ABS) abstract only; (SEC) secondary source, named; (U) unverified.
- **Time zero.** t = 0 is perturbation onset. "From stretch" marks latencies timed from muscle-stretch onset. EMG onset and torque onset are kept distinct.
- **This model [E].**
  - m = 73.9 kg (weight 725 N); COM 0.98 m.
  - COM above the ankle axis h ≈ 0.90 m, so mgh = 652 N·m/rad (710 N·m/rad with h = 0.98 m).
  - ω₀ = √(g/h) = 3.2–3.3 s⁻¹.
- **Simulation timing [E].**
  - One step = 4.17 ms, so 30 ms = 7.2 steps, 100 ms = 24 and 175 ms = 42.
  - First-order activation with τ_act = 15 ms reaches 10 / 50 / 90 % of a step change in excitation at 1.6 / 10.4 / 34.5 ms. It therefore adds almost no *onset* delay.
  - Any modelled neural pathway must carry its full EMG-onset latency as an explicit excitation delay.


## Summary of answers

1. **First neural force [E from M].**
   - Short-latency stretch-reflex EMG starts at:
     - **≈ 20–28 ms** in thigh, hip and trunk muscles: hamstrings 20 ± 4 ms; quadriceps 23–25 ms; gluteus medius and paraspinals 28 ms;
     - **≈ 41–46 ms** in the calf and shin muscles: soleus, gastrocnemius and TA.
   - Electromechanical delay at low activation is **≈ 10–22 ms**.
   - So no neural pathway can change force anywhere in the body before **≈ 30 ms**, at the knee, hip or trunk before **≈ 30–45 ms**, or at the ankle before **≈ 50 ms**. Measured reflex torque at the ankle appears at **≈ 50–75 ms**.
2. **Automatic postural responses [M].**
   - EMG starts at **100 ± 20 ms** (range ≈ 60–145 ms by paradigm).
   - Active corrective torque starts at **≈ 100–160 ms**: 99 ± 13 ms in lean-release; ≈ 150 ms after shoulder pulls.
   - Joint moments seen at 56–116 ms after pushes are in phase with joint angle, i.e. they come from stiffness.
3. **Windows [E/D].**
   - (i) Intrinsic only: **0–30 ms** whole-body. By joint: ankle 0–40, knee 0–30, hip/trunk 0–30, neck 0–25 ms.
   - (ii) Segmental reflex: from 30–40 ms to ≈ 100 ms.
   - (iii) Long loop / automatic postural: from ≈ 100 ms, with torque by 100–160 ms.
   - The previous 300 ms "passive" window contained the whole automatic postural response.
   - The 70 ms window of Sakanaka et al. is valid only for sub-degree perturbations.
4. **Controller delays [MODEL → D].**
   - The 175 ms of Peterka & Loughlin 2004 is a lumped "effective" delay. It already includes force generation, and it falls to ≈ 105 ms for large tilts.
   - Models with explicit force dynamics give a sensed-state → EMG delay of **≈ 85–130 ms** (central ≈ 100 ms).
   - Human EMG→torque dynamics add a further **≈ 0.1–0.3 s** of low-frequency lag. The sim's 15 ms activation does not supply this by itself.
   - Hip/trunk loops are faster (**≈ 65–80 ms**) than ankle loops.
   - Visual pathways carry **≈ 80–90 ms** more delay.
   - No study has identified separate proprioceptive and vestibular delays at the ankle.
5. **Gains [MODEL].** Active ankle K_P ≈ 1.3 mgh and K_D ≈ 0.45 mgh·s in lumped models. Total stiffness is ≈ 1.3–1.65 mgh. With measured intrinsic stiffness of 0.45–0.9 mgh, the active share is correspondingly smaller.
6. **Quiet sway [M].**
   - COM RMS ≈ 4.1–4.3 mm AP and 1.7–2.0 mm ML for hip to shoulder-width stances.
   - COP SD ≈ 4.6 mm AP and 3.1 mm ML; COP velocity ≈ 6–9 mm/s; median frequency ≈ 0.3 Hz.
7. **Recovery [M].** A 20–23 N·s pelvis push to an 86 kg man produces:
   - a COM peak of 5.6–6.4 cm at ≈ 0.5–0.6 s;
   - an overshoot of ≈ 0.7–0.8 cm;
   - a response lasting 2–3 s;
   - in the ML direction, ≈ 85–90 % of the corrective moment from the hips.
   
   The feet-in-place limit for brief pelvis pushes is about Δv ≈ 0.25–0.35 m/s.
8. **Stretch reflexes in standing [M].** For sway-sized perturbations (≤ 0.6°) stretch reflexes are absent or negligible. For large, fast perturbations they fire at 40–65 ms, but they are partly destabilising. The stabilising torque comes from the response at ≥ 100 ms.

## 1. When does the first neural contribution to force appear?

### 1a. Short-latency (spinal) stretch-reflex EMG onset, by muscle

Values are mean ± SD. "From stretch" means timed from the onset of muscle stretch rather than of the perturbation.

| Muscle | EMG onset, with n and condition | Source (access) |
|---|---|---|
| Soleus | **42.4 ms** (n=9, standing, toe-up platform) | Schieppati & Nardone 1997 (ABS) |
| Soleus | **41 ± 4 ms** from stretch (seated, 170°/s) | Toft 1991 (ABS) |
| Soleus | **43 ± 3 ms** from stretch (n=13, seated, 200°/s; onset = baseline + 3 SD) | Finley 2013 (FT) |
| Soleus | **46 ms** (n=12, standing, 7.5° rotations) | Allum, Oude Nijhuis & Carpenter 2008 (ABS, re-checked) |
| Soleus | 55–65 ms from *platform* onset (n=20, standing tilt) | Diener 1984 (ABS) |
| Medial gastrocnemius | **40 ± 3 ms** from stretch (n=13) | Finley 2013 (FT) |
| Lateral gastrocnemius | not found | gap |
| Tibialis anterior (TA) | **M1 44 ± 2 ms** from stretch (n=17, seated) | Petersen et al. 1998 (FT) |
| Tibialis anterior, standing | no short-latency response when the toes tilt down; first response is a medium-latency one at 103–118 ms | Diener 1984 (ABS) |
| Quadriceps | **23 ± 1 to 25 ± 2 ms** (n=11, walking and seated); patellar tendon reflex 17.7 ± 3.7 ms (n=25, young) | Mrachacz-Kersting 2004, 2006 (ABS); Khatun 2024 (FT) |
| Hamstrings | **20.3 ± 3.5 ms** (n=10, anterior tibial translation, standing protocol); medium-latency 38.9 ± 4.2 ms | Friemert 2005 (ABS) |
| Gluteus medius | **28 ms** (n=12, standing, rotations); 62 ± 19 ms after pelvis pushes in walking, which the authors call "reflexive origin" | Allum 2008 (ABS); Vlutters 2018 (FT) |
| Gluteus maximus | not found | gap |
| Lumbar paraspinals | **28 ms** (standing, rotations). Stretch reflex ≈ 60 ms and unloading reflex 40 ms with 7.5° at 50°/s (n=14). Tap reflex 11.8–12.3 ms (n=18, standing). Indentation reflex 19.3 ± 2.1 ms (n=5) | Allum 2008; Carpenter 1999 (ABS); Beith 2012 (FT); Zedka 1999 (FT) |
| Rectus abdominis | tap reflex **18.8 ± 1.9 ms**; none when upright and relaxed (n=10) | Myriknas 2000 (ABS) |
| Neck: sternocleidomastoid (SCM) | **22–25 ms** after head free-fall (vestibulocollic). 31–33 ms (SD 12–18) after a relaxed head drop. A segmental reflex is expected at ≈ 12 ms | Ito 1995 (ABS); Wochner 2022 (FT); Govender 2025 (FT) |

**Scaling with conduction distance.**
- **Height.** Tendon-reflex latency correlates with height: patellar r = 0.70, ankle r = 0.72 (n=102; Frijns 1997 (ABS)). Stam & van Crevel 1989 (ABS) found all tendon-reflex latencies linear in height. In standing, SLR and MLR latencies rise with height, and the MLR afferent velocity of ≈ 17.5 m/s points to group II afferents (Nardone 1996 (ABS)).
- **Soleus H-reflex formula.** Braddom & Johnson 1974 give 9.14 + 0.46 × leg length (cm) + 0.1 × age (SEC via Sarmast 2018). For this model's ≈ 42–44 cm leg at age 25, that predicts ≈ 31 ms; the mechanical SLR is ≈ 10 ms later [E].
- **Path-length ordering [E].** The measured onsets order by distance to the cord: lumbar tap ≈ 12 ms → knee, hip and trunk ≈ 20–28 ms → ankle ≈ 41–46 ms. For a 1.80 m body, use the upper half of each range.

### 1b. Medium- and long-latency responses

- **TA [M].** M2 69 ± 6 ms and M3 95 ± 9 ms. The minimum transcortical loop is 79 ms, so only M3 can be transcortical (Petersen 1998 (FT)).
- **Soleus medium-latency response [M].** 72.0 ms in standing, attributed to group II afferents (Schieppati & Nardone 1997 (ABS)). In seated subjects it peaks at 68–71 ms (Finley 2013 (FT)).
- **Rectus femoris [M].** The earliest possible transcortical contribution is at 54 ± 6 ms (Mrachacz-Kersting 2006 (ABS)).
- **Standing toe-up tilt [M].** The triceps surae medium-latency response at 108–123 ms is destabilising. The stabilising TA long-latency response follows at 130–145 ms (Diener 1984 (ABS)).
- **Long-latency stretch reflex [M].** At ≈ 120 ms it reduced sway in only 5 of 12 subjects (Nashner 1976 (ABS)).
- **Analysis-window conventions.** Leg: SLR 30–60, MLR 60–85, LLR 85–120 ms (Ritzmann 2019 (FT)). Arm: SLR 20–45, LLR 50–100 ms (Kurtzer 2014 (FT)). Jacobs & Horak 2007 (FT) decline to give numeric reflex/APR boundaries.

### 1c. Automatic postural responses and active torque onset

**EMG onset**

| Paradigm | Onset (n) | Source (access) |
|---|---|---|
| Platform translation | **73–110 ms**, ankle → thigh → trunk | Horak & Nashner 1986 (ABS) |
| Backward translation, 10–35 cm/s | **94–145 ms**; inter-segment lags **18–29 ms**; independent of velocity and amplitude (n=10) | Diener, Horak & Nashner 1988 (ABS, re-checked) |
| Forward-sway translation | **100 ± 20 ms**, unchanged by central set | Horak, Diener & Nashner 1989 (ABS, re-checked) |
| 12 cm translations, 0.1–0.6 g | TA 119 ± 22 ms; medial gastrocnemius 136 ± 49 ms (n=7) | Welch & Ting 2009 (FT) |
| Translation at balance threshold | soleus 101 ± 14 ms; fascicle shortening 108 ± 22 ms (n=10) | Beck 2023 (FT) |
| Treadmill impulse in stance | 65–75 ms | Dietz 1988 (ABS) |
| Shoulder pulls, pushed backward (median) | TA 78, quadriceps 90, soleus 108 ms. The trigger underestimated true onset | Colebatch 2016 (FT) |
| Shoulder pulls, pushed forward (median) | paraspinals 94, soleus 117, hamstrings 118 ms; no distal-first order (n=10) | Colebatch 2016 (FT) |
| Sideways pelvis push | **gluteus medius 74 ms**, contralateral adductor 111 ms (n=16; no SD available) | Kirker 2000 (ABS, re-checked) |
| ML pushes to trunk or pelvis | 75–120 ms | Rietdyk thesis, citing Little 1997 (SEC) |
| Release from forward lean | soleus 59 ms, unchanged by ischaemia (n=12) | Do 1988 (ABS, re-checked) |

**Torque, COP or force onset**

| Paradigm | Onset | Source (access) |
|---|---|---|
| Lean-release, ankle only | active torque onset **99 ± 13 ms**; rate 372 ± 267 N·m/s; peak 116 ± 32 N·m (n=23) | Robinovitch 2002 (ABS, re-checked) |
| ML pushes | joint moments at **56–116 ms**, "synchronous with the joint angle change" and "too early … to be result of active muscle contraction" | Rietdyk 1999 (ABS) |
| AP pushes | angle 66 ± 2 ms, then moment 89 ± 3 ms (± SE); COP moves within 78 ms. The authors estimate active torque at **≈ 125–150 ms** | Rietdyk thesis (FT) |
| Shoulder pulls of 10–20 N | opposing ground-reaction force from **≈ 150 ms** (n=16) | Di Giulio 2016 (FT) |
| Shoulder pulls | COP onset 91–99 ms, probably mostly passive | Colebatch 2016 (FT) |
| Platform rotations | torque differences between age groups appear after 160 ms | Allum 2002 (ABS) |
| Platform translation | ≈ 130 ms, the authors' inference. Exoskeleton torque given at 68 ms helped; at 171 ms it did not | Beck 2023 (FT) |
| Voluntary dorsiflexion, for contrast | reaction time 141 ms | Thelen 1996 (ABS) |

**Synthesis [E].**
- APR EMG starts at 75–110 ms; active torque at 100–160 ms (central ≈ 130 ms).
- In push paradigms, torque before ≈ 90–100 ms is intrinsic or segmental.
- Order of recruitment by paradigm:
  - **Platform translations:** distal first.
  - **Pelvis pushes:** hip first.
  - **Shoulder pushes:** no fixed order.

### 1d. Electromechanical delay (EMD) and EMG-to-torque dynamics

| Measure | Value | Source (access) |
|---|---|---|
| EMD, evoked, medial gastrocnemius | **11.6 ± 1.5 ms**; passive series elasticity ≈ 47 % (n=9) | Nordez 2009 (ABS, re-checked) |
| EMD, evoked, medial gastrocnemius, slack tendon | 19.2 ± 2.2 ms at 30° plantarflexion; 15.0 ± 1.4 ms at 0° | Muraoka 2004 (ABS) |
| EMD, knee extensors | tendon reflex **22.1 (SEM 1.3) ms**; evoked 17.2 ms; voluntary 38.7 ms (n=21) | Zhou 1995 (ABS, re-checked) |
| EMD, voluntary | 49.5–55.5 ms | Cavanagh & Komi 1979; Begovic 2014 (ABS) |
| Reflex EMG → reflex torque, ankle | EMG ≈ 40 ms → torque ≈ 50–60 ms; ≈ 75 ms onset and ≈ 170 ms peak in one report | Sinkjaer 1988; Allum & Mauritz 1984 (ABS); Stein & Kearney 1995 via Loram & Lakie 2002 (SEC) |
| EMG → torque, quiet standing | critically damped 2nd order, contraction time **0.152 ± 0.027 s**; ≡ 200–380 ms of lag in the sway band (n=10) | Masani 2008 (ABS, re-checked) |
| EMG → torque, identified | ankle ω₀ **6.9 ± 1.0 rad/s**, ζ ≈ 1.0; hip ≈ 9.4 rad/s, ζ ≈ 1.5 (n=17) | Kiemel 2008 (FT) |

**Interpretation [E].**
- Onset delay is short: ≈ 10–20 ms for reflex or evoked activity.
- Torque *build-up* is slow. With ω₀ = 6.9 rad/s, torque reaches 10 % ≈ 77 ms and 50 % ≈ 243 ms after an EMG step.
- The sim's 15 ms first-order activation reproduces the onset but not the build-up, unless the muscle-tendon dynamics supply it (§2.5, §8).

### 1e. Vestibular, visual and cutaneous latencies

| Channel | Latency | Source (access) |
|---|---|---|
| Galvanic vestibular, soleus, standing | **62 ± 2.4 ms** (early) and **115 ± 5.2 ms** (late, which drives the sway), mean ± SEM. Absent if the muscle is not used for balance | Britton 1993 (ABS, re-checked) |
| Galvanic vestibular, soleus/TA | **56 ms** and **105 ms**; absent when seated | Fitzpatrick, Burke & Gandevia 1994 (ABS, re-checked) |
| Galvanic vestibular | 60–70 ms (otolith) and 120 ms (canal). Stochastic stimulation gives *peaks* at 65 and 103 ms | Cathers 2005; Dakin 2007 (ABS) |
| Visual scene rotation | force onset **≈ 190 ms**; late component > 0.7 s | Day 2016 (FT) |
| Visual surround translation | COP onset **230 ± 55 ms** and 256 ± 46 ms | Hemakumara 2025 (FT) |
| Moving room | ≈ 600 ms; older reports > 1 s | Bronstein 1986 (ABS); Lestienne 1977 (SEC) |
| Cutaneous (sural/tibial nerve) | from 40 ms (44–54 ms by muscle); in standing, seen only in active muscles | Aniss 1992 (ABS) |
| Plantar cutaneous | middle latency ≈ 70–110 ms, specific to location | Nakajima 2006 (ABS) |

### 1f. How the stiffness literature defines the intrinsic-only window

- **Sinkjaer 1996 (ABS):** "first 35 ms after stretch onset (nonreflex torque)". Reflex EMG was at 42 ms.
- **Sinkjaer 1988 (ABS):** reflex stiffness "began approximately 50 ms after onset of stretch". Intrinsic stiffness was separated by nerve stimulation, not by a time window.
- **Allum & Mauritz 1984 (ABS):** intrinsic torque lasts until ≈ 60 ms, when force from the short-latency reflex arrives (confirmed with ischaemia).
- **Kearney parallel-cascade school:** reflex delay 40–45 ms; the intrinsic impulse response is kept shorter than that (Golkar 2017; Guarín 2017 (FT); Kearney 1997 and Mirbagheri 2000 via these, SEC).
- **Loram & Lakie 2002 (FT):** fitted over **140 ms**, but only for **0.055°** perturbations. No reflex EMG or torque appeared in any of 15 subjects. The first neural reaction was bilateral, with EMG at ≈ 100 ms and torque at ≈ 140 ms.
- **Sakanaka 2016, 2018, 2021 (FT):** **first 70 ms** of 0.1–0.9° perturbations (peak 20°/s). The justification was Loram & Lakie plus an EMG no-change check.
- **Casadio 2005 (ABS):** 1° steps; the estimate did not depend on window width.

**Reading [E].** For a large or fast stretch, the ankle intrinsic window is **0–35/40 ms**. Windows of 70–140 ms hold only for sub-degree, slow perturbations, where reflex gain is ≈ 0 (§5). A football push or contact is not such a perturbation.

### 1g. Recommended windows

Each boundary is the earliest plausible neural force (minimum SLR EMG + ≈ 10 ms EMD), rounded down for margin [E/D].

| Window | Ankle | Knee | Hip and lumbar | Neck |
|---|---|---|---|---|
| (i) Intrinsic only | **0–40 ms** | **0–30 ms** | **0–30 ms** | **0–25 ms** |
| (ii) Segmental reflex | 40–100 ms | 30–100 ms | 30–90 ms | 25–90 ms |
| (iii) Long loop / APR | EMG 75–110 ms; torque ≈ 100–160 ms | as ankle; ≈ 20 ms later on platforms | pelvis push: gluteus medius 74 ms, torque ≈ 90–130 ms | vestibular medium response ≈ 105–120 ms |

**Whole-body rule [D].**
- **0–30 ms** is the only window in which no neural pathway anywhere can have changed force.
- 30–100 ms is "intrinsic-dominant but reflex-possible".
- **The 300 ms "passive" window is not defensible**, because APR torque is present from ≈ 100–160 ms.

## 2. Continuous postural control models: delays, gains, sensed variables

Gains are normalised by each paper's own mgh: K_P/mgh is dimensionless and K_D/mgh is in seconds. All parameters are [MODEL].

### 2.1 Ankle-level (single-joint) models fitted to human data

| Model | Sensed variables | Delay | Active gains (/mgh) | Passive | Access |
|---|---|---|---|---|---|
| **Peterka 2002**, independent-channel PID; n=8 + 4 vestibular-loss; pseudorandom tilts 0.5–8° | body–feet angle (proprioceptive), body–space (graviceptive), body–surround (visual), weighted | one **"effective" τd**: 191 ms at 0.5° falling to **105 ms at 8°**; **206 ± 11 ms** under visual stimulation | K_P **1.46** (up to 1.65× at 8°); K_D **0.48 s**; K_I 0.17 s⁻¹ | 0.125 mgh, ≈ 1/10 of active | FT |
| **Peterka & Loughlin 2004** (source of the 175 ms) | proprioceptive + graviceptive; W_prop 0.8 | **0.175 s**, defined to include "sensory transduction, neural transmission, nervous system processing, muscle activation, and force development" | K_P **1.29**; K_D **0.46 s** | none | FT |
| Maurer & Peterka 2005, spontaneous sway | body sway | 0.171 s | K_P 1.48; K_D 0.43 s; low-pass torque noise SD 10.7 N·m | a fixed 0.9 mgh passive term made the fit *worse* | FT |
| Peterka et al. 2018, normative test (n=40) | as Peterka 2002 | surface tilt, eyes closed: **0.144 ± 0.015 s** (2°), 0.120 s (4°); **visual 0.210 ± 0.025 s** | K_P 1.24–1.74; K_D 0.48–0.54 s | not identifiable | FT |
| **van der Kooij & Peterka 2011** (Peterka 2002 data refitted) | proprioceptive + graviceptive + slow torque feedback | **0.097 s** neural, plus a fixed 2nd-order activation filter (16.8 rad/s, ζ 0.99; ≈ 0.115 s equivalent lag [E]) | K_P **1.29**; K_D **0.43 s** | 0.055 mgh; 0.094 s | FT |
| **Pasma et al. 2017**, constrained by EMG (n=20) | proprioceptive + vestibular/visual + force | **0.104 s** + activation (1.48 Hz, ζ 1.3; ≈ 0.2–0.27 s equivalent [E]). Without acceleration feedback the fitted delay collapsed to < 1 ms | K_P 1.33; K_D 0.87 s; K_A 0.13 s² | 0.14 mgh | FT |
| **DEC model**: Hettich 2014; Assländer 2015 | proprioceptive, vestibular, torque → disturbance estimates with thresholds | lumped per joint: **ankle 0.15–0.18 s; hip 0.07 s**. Muscle dynamics are folded into the controller | K_P 1.0, K_D 0.3 s (fixed by convention) | 0.15 × active | FT |
| Vette et al. 2007 (n=10 men) | body angle | **40 ms afferent + 40 ms central/efferent**, plus 2nd-order twitch dynamics (T 63–116 ms) | ≈ 1.1–1.4; ≈ 0.39–0.44 s [E] | — | FT |
| Zelei et al. 2021, push-release (n=10) | delayed θ, θ̇ | **157 ± 81 ms** | ≈ 0.6–0.7 [E] | 0.91 mgh assumed | FT |

### 2.2 Task-level delayed COM feedback

| Model | Delay | Key points | Access |
|---|---|---|---|
| **Welch & Ting 2008, 2009**: COM acceleration, velocity and displacement → EMG | λ fixed at 100 ms (2008). Fitted per subject **60–116 ms, 88 ± 19 ms [E]** (2009). Muscle filter first order, 40 ms | Without the acceleration term, λ had to be 10–60 ms (non-physiological). k_v and k_p did not change with perturbation size. Gain units are EMG-normalised, so no conversion to mgh is possible | FT |
| Safavynia & Ting 2012, 2013 | COM 88 ± 10 ms (n=23); 90–130 ms in other data sets | Joint-angle feedback needed a median of 11 ms | FT |
| **Kiemel, Zhang & Jeka 2011** | **127.8 ± 1.4 ms**, kinematics → EMG, one delay for all channels | Plus an identified EMG→torque plant (ankle 9.9 rad/s, ζ 1.5). Stance used only 1.6 % more activation than the stabilising minimum | FT |
| Jakubowski et al. 2025, torque-level model | ankle 85 ± 23 ms and 190 ± 44 ms loops | Hip and knee also show ≈ 1–6 ms loops (short-range stiffness) | FT-w |
| Bingham, Choi & Ting 2011, frontal plane | **150 ms = 100 ms neural + 50 ms mechanical** | k_p/k_v ≈ 3.6; gains fall as stance widens | FT-w |
| Loram et al. 2022, robot balanced under EMG control (n=14) | disturbance → EMG ≈ 97 ms physiological [E]; model delays 85–108 ms | Intermittent and continuous predictive models fit equally well | FT |

### 2.3 Intermittent control

- **Correction rate [M].** 2.6 calf adjustments per second in quiet stance (Loram 2005b (FT)); modal 2 per second in manual balance (Loram 2011 (FT)).
- **Refractory periods [M].** 250 / 350 / 550 ms for 0th-, 1st- and 2nd-order visual tracking; ≈ 500 ms whole-body (van de Kamp 2013 (FT)).
- **Visuo-manual delay [M].** 124–220 ms, split as transmission 60–75 ms plus central 54–150 ms (Loram 2009 (FT)).
- **Asai et al. 2009 intermittent PD [MODEL].** Δ = 0.2 s, P = 0.25 mgh, D = 10 N·m·s/rad, passive 0.8 mgh (FT).
- **Fits to quiet sway [MODEL].** Δ ≈ 0.28–0.30 s and P ≈ 0.1–0.25 mgh (Tietäväinen 2017; McKee 2019 (FT)).
- **Evoked responses** are "dominated by continuous feedback" (van der Kooij & de Vlugt 2007 (ABS)).

### 2.4 Multi-joint and pathway-specific models

| Model | Delays | Gains | Access |
|---|---|---|---|
| Engelhart 2016, pelvis and shoulder force perturbations | **ankle ≈ 91 ms, hip ≈ 79 ms** (young) | ankle ≈ 1.4 mgh | FT, read from figures |
| Alexandrov 2005, eigenmovements | **ankle mode 121 ± 23 ms, hip mode 66 ± 10 ms, knee mode 12 ± 3 ms**. These average passive and active parts | ≈ 1.15 × gravitational | FT-w |
| **Goodworth & Peterka 2009/2010**, frontal-plane trunk | **proprioceptive velocity 25 ± 6 ms; vestibular/visual velocity 135 ± 18 ms; orientation 281 ± 24 ms** | ≈ 1.7–1.9 trunk-mgh [E] | FT-w, Table 1 checked |
| Goodworth & Peterka 2012, two segments | lower body 114–118 ms; upper body 67–74 ms | — | FT-w, Table 2 checked |
| Park, Horak & Kuo 2004; Kim 2009, 2012 | **no delay in the model** | ankle gains fall and hip gains rise almost linearly with perturbation size; pushes need a different gain set (figures only) | ABS / FT |
| Shanbhag 2024, after Li 2012 | **assumed**: proprioceptive hip 25 / knee 35 / ankle 50 ms; vestibular and visual +100 ms | — | FT; Li SEC |

### 2.5 Synthesis [E]

1. **The 175 ms is an effective, model-dependent value, not a latency.** It falls with stimulus amplitude, and it absorbs passive torque, force build-up and reflexes that the model leaves out.
2. **Delays split by joint, not by sense.**
   - No sagittal ankle-level fit has separate proprioceptive and vestibular delays.
   - Visual pathways carry ≈ 80–90 ms more delay (206–210 vs 92–144 ms).
   - Pathway-specific delays exist only for the frontal-plane trunk: 25 / 135 / 281 ms.
3. **How the split depends on model structure.**
   - With no muscle model, the lumped delay is 0.15–0.21 s for small tilts and 0.09–0.14 s for 2–8° tilts.
   - With an explicit EMG→torque stage, the sensed-state → EMG delay is **85–130 ms** (97, 104, 88, 128, 85–108 ms in the studies above).
   - Total effective lag at 0.2–1 Hz stays ≈ 0.2 s.
4. **Hip/trunk loops are faster.**
   - Hip: 66–79 ms (eigenmode, Engelhart, DEC 70, Goodworth upper body 67–74).
   - Ankle: 91–180 ms.
5. **Gains.**
   - Active K_P ≈ 1.2–1.5 mgh (typically 1.3); K_D ≈ 0.4–0.5 mgh·s.
   - Model fits assign little passive stiffness (0.05–0.15 mgh). Direct measurements say 0.44–0.93 mgh (Loram & Lakie 2002; Vlutters 2015; Sakanaka 2021). This conflict is unresolved.
   - If the substrate carries measured intrinsic stiffness, set the controller's active K_P so that the total is ≈ 1.3–1.5 mgh.
6. **Gain scheduling.** Hip gain rises with perturbation size (Park 2004), but Welch & Ting 2009 found invariant COM gains. A fixed-gain continuous controller is defensible for sway and moderate pushes.
7. **Intermittency** (2–3 corrections per second) mainly shapes the quiet-sway spectrum. Perturbation responses are well described by continuous delayed feedback.

## 3. Quiet-stance sway norms (healthy young adults, eyes open)

No study used a 42 cm stance. The widest is 150 % of hip-joint width (Foulger 2025). Sway scales as K_e^−0.55, so it falls as the stance widens; this effect is mainly in ML (Winter 1998 (ABS); Kirby 1987 (ABS)).

**COM and COP sway**

| Measure | AP | ML | Condition | Source (access) |
|---|---|---|---|---|
| COM RMS, hip width | **4.33 ± 1.51 mm** | **2.04 ± 1.20 mm** | n=16, 25 y, 3 × 2 min | Foulger 2025 (FT) |
| COM RMS, 150 % hip width | **4.11 ± 1.68 mm** | **1.69 ± 0.85 mm** | same | Foulger 2025 (FT) |
| COM range, 150 % hip width | 21.3 ± 8.3 mm | 8.1 ± 4.1 mm | same | Foulger 2025 (FT) |
| COP SD | **4.62 ± 2.22 mm** | **3.05 ± 0.91 mm** | n=31 young men (181 cm, 77 kg), 20 s, width not stated | Borzucka 2020 (FT) |
| COP range | 22.8 ± 7.9 mm | 17.4 ± 4.9 mm | same | Borzucka 2020 (FT) |
| COP mean velocity | **6.65 ± 1.94 mm/s** | **5.65 ± 1.57 mm/s** | same | Borzucka 2020 (FT) |
| COP RMS / mean velocity, soccer players (group means) | 5.1 mm / 8.9 mm/s | 3.3 mm / 8.1 mm/s | "wide" stance, 4 × 30 s | Thompson 2017 (FT) |

**Frequency, angle and torque**

| Measure | Value | Source (access) |
|---|---|---|
| COP median frequency | AP 0.33 ± 0.07 Hz; ML 0.32 ± 0.07 Hz (n=16, feet together) | Yamamoto 2015 (FT) |
| Sway power below 2 Hz | 90 ± 4 % (AP); modal AP frequency 0.30–0.45 Hz | Soames & Atha 1982 (ABS) |
| Unidirectional sway | **0.13°** eyes open; reversals peak 0.25 Hz, mean 0.45 Hz | Loram, Maganaris & Lakie 2005b (FT) |
| Mean COP position | 13–52 mm in front of the ankle | Kim 2009; Yamamoto 2015 (FT) |
| Baseline ankle torque | 5.16 ± 1.28 % of mgh (eyes closed) | Sakanaka 2021 (FT) |
| COM–COP relation | in phase within 6 ms. COP velocity tracks COM *acceleration* more closely than COM velocity | Winter 1998; Masani 2014 (ABS) |
| Hip vs ankle | angular acceleration ratio −3.15 ± 1.24. Knee and hip angle variance does not differ from ankle variance. In phase below ≈ 1 Hz, anti-phase above | Aramaki 2001; Pinter 2008; Creath 2005 (ABS) |

**Derived for this model [E].**
- Ankle-equivalent sway angle RMS ≈ 0.27° (COM RMS 4.2 mm over 0.90 m).
- Mean ankle torque ≈ 34–37 N·m.
- Ankle torque SD ≈ m·g·SD(COP) ≈ 3.3 N·m.
- **Gap:** no numeric joint-angle SDs in degrees were found.

## 4. Recovery after brief pushes or platform perturbations without a step

**Rietdyk 1999** (PhD thesis, FT). Subjects: 10 men, 86 kg, 182 cm. Perturbation: manual pushes of ≈ 113–122 N lasting ≈ 370 ms. Values are mean (SE).

| | ML pelvis push | AP pelvis push |
|---|---|---|
| Impulse | 22.8 (0.4) N·s, range 16.8–31.4 | 19.7 (0.4) N·s, range 13.3–28.2 |
| Peak COM / COP excursion | **6.4 (0.2) / 12.5 cm** | **5.6 (0.3) / 11.3 cm** |
| Overshoot (COM / COP) | 0.7 / 1.9 cm | 0.8 / 1.3 cm |
| Time of peak | shank at 607 ms; trunk (opposite direction) at 508 ms | segments at 566 ms; pelvis 118 ms later |
| Corrective moment | hips ≈ 90 % (contralateral 70 %); ankles ≈ 14 %; load/unload strategy 85.5 % | ankle + hip; knee flexion ≈ 4° when present |
| Earliest response | joint moment 56–116 ms, in phase with angle | angle 66 ms → moment 89 ms |
| Response duration | 2–3 s | 2–3 s |
| Stepping | 3 of 10 subjects stepped at least once, at the larger pushes | — |

Velocity change [E]: ≤ 0.27 m/s (ML) and ≤ 0.23 m/s (AP). Impulse/mass is an upper bound because the push is long. The same Δv on 73.9 kg needs ≈ 17–20 N·s.

**Other data**

| Paradigm | Key numbers | Source (access) |
|---|---|---|
| 150 ms pelvis pushes, 3–12 % BW, staggered stance (n=10) | COM deviation up to ≈ 0.5 cm per % BW. COM velocity reverses at **0.4–0.5 s**, up to 0.8 s for the strongest perpendicular pushes. Ankle moment changes by ≈ 1.7–2.3 N·m per % BW. Data: 4TU DOI 10.4121/20318382 | van Mierlo 2023 (FT) |
| Lean-release, ankle only (n=23) | torque onset 99 ± 13 ms; 372 ± 267 N·m/s; peak 116 ± 32 N·m. Recoverable lean 5.9 ± 1.1° (dynamic) vs 14.9 ± 1.4° (static) | Robinovitch 2002 (ABS) |
| Waist pulls, shoulder-width stance (n=12) | anterior 3.8 / 7.4 / 11.4 cm at 0.13 / 0.24 / 0.35 m/s: steps in 0, 1 and 3 of 36 trials. Medial pulls at ≈ 0.33 m/s: steps in 15 of 36 | Zhu 2022 (FT) |
| Platform translations | ankle strategy at 0.1 m/s; ankle + hip at 0.2 m/s; hip torque is added gradually, never a pure hip strategy | Hwang 2009; Runge 1999; Park 2004 (ABS) |
| Effective base of support after a sudden perturbation | ≈ 30 % of the static base | Hof & Curtze 2016 (ABS) |

**Feet-in-place limit for brief pelvis pushes [E from M].**
- Δv ≈ **0.25–0.35 m/s** (≈ 18–26 N·s on 73.9 kg).
- In the Rietdyk thesis, 3 of 10 subjects stepped at ≤ 0.37 m/s.
- Forward-pull thresholds behave as a constant force × duration product, levelling off at ≈ 10 % BW for pulls > 1.5 s (Robert 2018 (ABS)).
- The smallest step-eliciting shoulder pull was 8.75 % BW (Verniba & Gage 2019 (ABS)).
- This agrees with the PPR-2 table (Crenshaw & Kaufman 2014; Mille 2003; Sturnieks 2013).
- A 42 cm stance should raise the ML limit above these values; no measurement exists.

## 5. Are stretch-reflex gains low in standing?

**Small perturbations: none detected.**
- At 0.055° (≈ 5 × faster than sway) there was "no EMG or torque evidence of a stretch reflex in all 15 of our subjects". The authors concluded that stretch reflexes "are probably not relevant to quiet standing" (Loram & Lakie 2002 (FT)).
- There was no EMG change within 70 ms for perturbations up to 0.6° (Sakanaka 2016 (FT)).
- Calf muscles move **paradoxically** in sway: they shorten as the body sways forward. Stretch reflexes cannot produce this, and EMG leads muscle length by 110 ± 50 ms (Loram 2004, 2005a (ABS)).
- TA tracks sway "orthodoxly" for 84 ± 9 % of the time (Di Giulio 2009 (ABS)).

**Low-frequency measurements show some reflex contribution.**
- Reflex stiffness was "a necessary component" of standing in slow waist-perturbation studies (Fitzpatrick, Taylor & McCloskey 1992 (ABS)).
- Reflex gain is "relatively low during quiet stance" but can rise (Fitzpatrick, Gorman, Burke & Gandevia 1992 (ABS)).
- The reflex loop gain is ≈ 1, "insufficient" to explain stability (Fitzpatrick 1996 (ABS)).
- The reflex share of ankle stiffness ranges from 1 to 55 % (Mirbagheri 2000 (ABS)).
- Plantarflexor reflexes were "substantial in half of the subjects" (Amiri & Kearney 2021 (ABS)).

**Large or fast perturbations evoke short-latency reflexes at 40–65 ms** (Diener 1984; Schieppati & Nardone 1997; Carpenter 1999; Allum 2008; Do 1988). However:
- They "functionally destabilize posture"; the stabilising response is the antagonist's at 130–170 ms (Diener 1984 (ABS)).
- Gain *falls* with random background perturbation and with less stable loads (Stein & Kearney 1995; Finley 2012 (ABS)).
- Only 5 of 12 subjects used the 120 ms reflex (Nashner 1976 (ABS)).

**Design reading [E/D].**
- A reflex gain of ≈ 0 is consistent with the data for quiet stance.
- For tackle-sized pushes, reflexes fire from ≈ 40–50 ms (ankle) and ≈ 25–30 ms (knee, hip, trunk). Their torque is modest and partly destabilising.
- Balance restoration comes from the delayed loop at ≥ 100 ms.
- A local reflex layer is optional; if added, it must respect §1a and §1g.

## 6. Recommended timing table

**Conventions.**
- Times run from **contact onset**, the first non-zero external force.
- Labels: [M] measured, [E] inferred, [MODEL] fitted model parameter, [D] design choice.
- At 240 Hz, delays should be whole step counts rounded **up**, so no pathway is faster than in humans [D]. Examples: 25 ms → 6 steps, 40 ms → 10, 75 ms → 18, 100 ms → 24, 130 ms → 32.

### 6.1 Evaluation windows

| Window | Scope | Boundary (range) | Label | Basis |
|---|---|---|---|---|
| **W0. Substrate only** | whole body | **0–30 ms** (25–35) | [E/D] | earliest SLR EMG 20–28 ms (knee, hip, trunk) + EMD ≥ 10 ms |
| W0 | ankle | 0–40 ms (35–50) | [E] | SLR EMG 41–46 ms; Sinkjaer 0–35 ms; Kearney school 40–45 ms; reflex torque ≈ 50–60 ms |
| W0 | knee | 0–30 ms (25–35) | [E] | quadriceps 23–25 ms; hamstrings 20 ms; tendon-reflex EMD 22 ms |
| W0 | hip, lumbar | 0–30 ms (25–40) | [E] | gluteus medius and paraspinals 28 ms |
| W0 | neck | 0–25 ms (20–30) | [E] | vestibulocollic 22–25 ms |
| **W1. Segmental reflex** | ankle / knee / hip-trunk | from 40 / 30 / 30 ms to ≈ 100 ms | [E] | SLR torque, then spinal medium-latency responses (69–72 ms) |
| **W2. APR / long loop** | all | EMG **100 ± 20 ms** (60–145); torque **≈ 100–160 ms** (central 130) | [M] | Horak 1989; Diener 1988; Robinovitch 2002; Di Giulio 2016; Rietdyk |
| W2 order | platform translation | distal → proximal, 18–29 ms per segment | [M] | Diener 1988 |
| W2 order | pelvis push | hip first (gluteus medius 74 ms) | [M] | Kirker 2000; Rietdyk |
| **W3. Voluntary / visual** | all | ≥ 140–200 ms; visual force onset ≈ 190 ms | [M] | Thelen 1996; Day 2016 |
| Recovery | whole body | COM peak ≈ 0.5–0.6 s; velocity reversal 0.4–0.8 s; response 2–3 s | [M] | Rietdyk; van Mierlo 2023 |
| Previous 300 ms "passive" window | — | **reject** | [E] | APR torque is present from ≈ 100–160 ms |

### 6.2 Controller delays (sensed state → excitation)

| Pathway | Delay | Label | Notes |
|---|---|---|---|
| **Ankle task-level loop** (proprioceptive + vestibular COM / body-angle state) | **100 ms** (85–130) | [D] on [MODEL] | 88 ± 19, 88 ± 10, 97, 104, 85–108, 128 ms. Must be paired with human-like force build-up (next row) |
| Ankle force generation | effective state → torque lag ≈ **0.2 s** at 0.2–1 Hz; push-evoked torque onset **≈ 100–150 ms** | [MODEL]/[M] | If the muscle-tendon dynamics give ≪ 0.1 s of low-frequency lag, add a critically damped 2nd-order command filter (ω_n ≈ 12–17 rad/s) [D]. The alternative, a Peterka/DEC-style lumped pure delay of 130–160 ms [E], makes torque onset later than in humans |
| **Hip/trunk loop** | **75 ms** (45–100) | [D] on [MODEL] | DEC 70; eigenmode 66 ± 10; Engelhart 79; Goodworth upper body 67–74 |
| Knee | none identified; use the hip or ankle loop | [D] | knee eigenmode 12 ms is mostly passive |
| Vestibular (if separate) | ≈ 100–110 ms; the short 56–62 ms response is small | [M]/[E] | galvanic stimulation 56/105 and 62/115 ms |
| **Visual** (if modelled) | **≈ 180–210 ms** (proprioceptive + 80–90 ms) | [MODEL]/[M] | Peterka 206 ± 11 ms; 0.210 s; force onset ≈ 190 ms |
| Optional local stretch reflex (low gain) | ankle 41–46; knee 20–25; hip/lumbar 25–28; neck 22–25 ms | [M] | gain ≈ 0 for sway-sized input; must not act inside W0 |
| Trunk short-latency proprioceptive velocity | 25 ms (frontal plane) | [MODEL] | Goodworth & Peterka 2009 |
| Intermittent variant | refractory ≥ 250 ms; 2–3 corrections per second | [M] | van de Kamp 2013; Loram 2005b |

**Gains [MODEL/E].**
- Total ankle stiffness (intrinsic + active) **1.3–1.65 mgh**, i.e. 850–1070 N·m/rad here.
- Active K_D **0.4–0.5 mgh·s**, i.e. 260–355 N·m·s/rad.
- Active K_P = total minus the substrate's intrinsic stiffness, i.e. ≈ 0.5–0.8 mgh if intrinsic is 0.6–0.9 mgh.

## 7. Recommended human comparison table

Values are for healthy young adults; [E] marks a value scaled to 73.9 kg.

**Sway**

| Measure | Target | Label, source |
|---|---|---|
| COM RMS AP / ML | **4.1–4.3 / 1.7–2.0 mm**; ML should be at the low end for a 42 cm stance | [M] Foulger 2025 |
| COP SD AP / ML | **4.6 ± 2.2 / 3.1 ± 0.9 mm** | [M] Borzucka 2020 |
| COP mean velocity AP / ML | 6.7 ± 1.9 / 5.7 ± 1.6 mm/s (8–10 mm/s in Thompson 2017) | [M] |
| COP median frequency | ≈ 0.3 Hz; > 90 % of power below 2 Hz | [M] Yamamoto 2015; Soames & Atha 1982 |
| COM vs COP | in phase within 6 ms | [M] Winter 1998 |
| Ankle-equivalent sway angle RMS | ≈ 0.27° | [E] |
| Mean ankle torque | 34–37 N·m | [E] |
| Ankle torque SD | ≈ 3.3 N·m | [E] |

**Latency**

| Measure | Target | Label, source |
|---|---|---|
| Neural force anywhere | none before ≈ 30 ms | [E] |
| SLR EMG, soleus / hip-trunk | 42–46 / 28 ms | [M] |
| APR EMG | 100 ± 20 ms | [M] Horak 1989 |
| Gluteus medius after a lateral pelvis push | 74 ms | [M] Kirker 2000 |
| Stiffness-driven moment after a push | 56–116 ms | [M] Rietdyk |

**Torque**

| Measure | Target | Label, source |
|---|---|---|
| Active ankle torque onset | 99 ± 13 ms (lean-release); ≈ 150 ms GRF onset after a shoulder pull | [M] Robinovitch 2002; Di Giulio 2016 |
| Rate of torque rise | 372 ± 267 N·m/s | [M] Robinovitch 2002 |
| Peak ankle torque | 116 ± 32 N·m | [M] Robinovitch 2002 |

**Recovery** (subjects 86 kg)

| Measure | Target | Label, source |
|---|---|---|
| Pelvis push of 20–23 N·s: peak COM / COP | 5.6–6.4 / 11–13 cm | [M] Rietdyk |
| Time of peak | ≈ 0.5–0.6 s | [M] Rietdyk |
| COM overshoot | 0.7–0.8 cm | [M] Rietdyk |
| Response duration | 2–3 s | [M] Rietdyk |
| ML corrective moment from the hips | ≈ 85–90 % | [M] Rietdyk |
| COM velocity reversal after a 150 ms push | 0.4–0.5 s | [M] van Mierlo 2023 |

**Thresholds**

| Measure | Target | Label, source |
|---|---|---|
| Feet-in-place limit, brief pelvis push | Δv ≈ 0.25–0.35 m/s (18–26 N·s) | [M/E] Rietdyk; Zhu 2022 |
| Ankle-only lean-release limit | 5.9 ± 1.1° | [M] Robinovitch 2002 |
| Ankle → ankle + hip strategy | between 0.1 and 0.2 m/s platform velocity | [M] Hwang 2009 |

## 8. Implementation notes [D]

1. **Substrate test.**
   - Judge the substrate in W0 (0–30 ms). Report 30–100 ms separately as "reflex-possible in humans".
   - Because the controller sees only states ≥ 75–100 ms old, its torque during W0 and W1 is fixed by pre-contact history.
   - Log any muscle excitation change between contact and its earliest allowed pathway delay as a violation.
2. **Replace the single 175 ms delay.**
   - It is a lumped value from a model with no muscle dynamics.
   - It depends on amplitude (105 ms at 8°).
   - It is too long for the hip/trunk.
3. **Match the force build-up as well as the delay.**
   - Check the sim's excitation→torque transfer against ω₀ ≈ 7–17 rad/s with ζ ≈ 1.
   - Check push responses against human torque onset of 100–150 ms and a COM peak at ≈ 0.5–0.6 s.
4. **Leave segmental reflexes out of the first controller.** Their gain in standing is ≈ 0 for small inputs, and for large inputs they are partly destabilising.

## 9. Gaps and caveats

- **Classic APR papers were mostly abstract-only.** Nashner 1977 was not retrievable; Horak & Nashner 1986, Diener 1988 and Moore 1988 were read only as abstracts. Per-muscle means, sequence lags beyond Diener's 18–29 ms, and torque-onset traces are missing.
- **Ankle reflex-torque onset is from abstracts:** Sinkjaer 1988 at ≈ 50 ms; Allum & Mauritz 1984 at ≈ 60 ms. Stein & Kearney's 75 ms is SEC. Robinovitch's onset definition was not read.
- **No direct calf reflex EMD at low activation.** The proxies are the knee-extensor tendon reflex (22 ms) and evoked medial gastrocnemius (11.6 ms).
- **Muscles not measured:** lateral gastrocnemius, gluteus maximus, a segmental neck stretch reflex, and the standing hip-abductor stretch reflex (walking data only).
- **No identified per-channel delays at the ankle.** Li 2012's 50/150/150 ms are assumptions; the pathway-specific delays found are frontal-plane trunk only.
- **Multi-joint gains** (Park 2004; Kim 2009, 2012) are figure-only, and those models contain no delay.
- **Unresolved conflicts:**
  - intrinsic ankle stiffness from fits (0.05–0.16 mgh) vs direct measurement (0.44–0.93 mgh);
  - EMG→torque as a 40 ms first-order lag vs a 0.2–0.3 s equivalent second-order filter. Fast-muscle models need acceleration feedback.
- **Sway data limits:**
  - no data for a 42 cm, knee-flexed stance;
  - no joint-angle SDs in degrees;
  - Prieto 1996, Gage 2004 and Collins & De Luca 1993 values were not obtained, so the ≈ 1 s stabilogram crossover is [U];
  - athlete data are limited to Thompson 2017 (soccer, group means) and Borzucka 2020 (volleyball).
- **Recovery data limits:**
  - Rietdyk's subjects are 86 kg and the pushes long, so Δv is an upper bound;
  - van Mierlo used a staggered stance.
- **Windows assume prompt muscle stretch at contact.** For pelvis pushes, distal muscles are stretched later, which only extends their intrinsic period. W0 = 30 ms is the conservative whole-body bound.

## 10. References

**Access codes:**

| Code | Meaning |
|---|---|
| FT | full text read |
| FT-w | full text read through a fetch or summariser tool; the numbers were spot-checked where stated |
| ABS | abstract only |
| SEC | known only through a named secondary source |
| U | not accessed |

### Stretch reflexes, conduction scaling, intrinsic windows (§1a, 1b, 1f, 5)

**Lower-leg stretch reflexes**
- Schieppati M, Nardone A (1997) J Physiol 503:691–698. doi:10.1111/j.1469-7793.1997.691bg.x. PMID 9379421. ABS
- Toft E, Sinkjaer T, Andreassen S, Larsen K (1991) J Neurophysiol 65:1402–1410. doi:10.1152/jn.1991.65.6.1402. PMID 1875249. ABS
- Finley JM, Dhaher YY, Perreault EJ (2013) Physiol Rep 1:e00051. doi:10.1002/phy2.51. PMID 24303134. PMC3835007. FT
- Finley JM, Dhaher YY, Perreault EJ (2012) Exp Brain Res 217:53–66. doi:10.1007/s00221-011-2972-9. PMID 22169978. ABS
- Sinkjaer T, Andersen JB, Larsen B (1996) J Neurophysiol 76:1112–1120. doi:10.1152/jn.1996.76.2.1112. PMID 8871224. ABS
- Sinkjaer T, Toft E, Andreassen S, Hornemann BC (1988) J Neurophysiol 60:1110–1121. doi:10.1152/jn.1988.60.3.1110. PMID 3171659. ABS
- Allum JH, Mauritz KH (1984) J Neurophysiol 52:797–818. doi:10.1152/jn.1984.52.5.797. PMID 6512589. ABS
- Diener HC, Dichgans J, Bootz F, Bacher M (1984) Exp Brain Res 56:126–134. doi:10.1007/BF00237448. PMID 6468561. ABS
- Petersen N, Christensen LO, Morita H, Sinkjaer T, Nielsen J (1998) J Physiol 512:267–276. doi:10.1111/j.1469-7793.1998.267bf.x. PMID 9729635. PMC2231172. FT
- Stein RB, Kearney RE (1995) J Neurophysiol 73:65–72. doi:10.1152/jn.1995.73.1.65. PMID 7714590. ABS; reflex torque timing SEC via Loram & Lakie 2002

**Thigh and hip stretch reflexes**
- Mrachacz-Kersting N et al. (2004) Exp Brain Res 159:108–122. doi:10.1007/s00221-004-1941-y. PMID 15221163. ABS
- Mrachacz-Kersting N, Grey MJ, Sinkjaer T (2006) Exp Brain Res 168:529–540. doi:10.1007/s00221-005-0120-0. PMID 16240144. ABS
- Khatun Z et al. (2024) Front Neurol 15:1522121. doi:10.3389/fneur.2024.1522121. PMID 39949533. PMC11822941. FT
- Friemert B et al. (2005) Exp Brain Res 160:1–9. doi:10.1007/s00221-004-1980-4. PMID 15322783. ABS
- Vlutters M, van Asseldonk EHF, van der Kooij H (2018) Sci Rep 8:14621. doi:10.1038/s41598-018-32839-8. PMID 30279499. PMC6168500. FT

**Trunk and neck reflexes**
- Carpenter MG, Allum JH, Honegger F (1999) Exp Brain Res 129:93–113. doi:10.1007/s002210050940. PMID 10550507. ABS
- Beith ID (2012) Exp Brain Res 218:433–440. doi:10.1007/s00221-012-3032-9. PMID 22349561. PMC3324696. FT
- Zedka M, Prochazka A, Knight B, Gillard D, Gauthier M (1999) J Physiol 520:591–604. doi:10.1111/j.1469-7793.1999.00591.x. PMID 10523425. PMC2269584. FT
- Myriknas SE, Beith ID, Harrison PJ (2000) Exp Physiol 85:445–450. doi:10.1111/j.1469-445X.2000.02045.x. PMID 10918083. ABS
- Ito Y et al. (1995) J Physiol 489:911–916. doi:10.1113/jphysiol.1995.sp021103. PMID 8788954. ABS
- Wochner I, Nölle LV, Martynenko OV, Schmitt S (2022) Biomed Eng Online 21:25. doi:10.1186/s12938-022-00994-9. PMID 35429975. PMC9013062. FT
- Govender S, Hochstrasser D, Todd NPM, Colebatch JG (2025) Exp Brain Res 243:220. doi:10.1007/s00221-025-07168-8. PMID 41045362. PMC12496292. FT

**Conduction scaling**
- Braddom RL, Johnson EW (1974) Arch Phys Med Rehabil 55:161–166. PMID 4823067. U; formula SEC via Sarmast AH et al. (2018) Asian J Neurosurg 13:585–589, PMC6159075
- Frijns CJ et al. (1997) Clin Neurol Neurosurg 99:31–36. doi:10.1016/S0303-8467(96)00593-8. PMID 9107465. ABS
- Stam J, van Crevel H (1989) J Neurol 236:231–237. doi:10.1007/BF00314505. PMID 2760635. ABS
- Nardone A, Grasso M, Giordano A, Schieppati M (1996) Neurosci Lett 206:89–92. doi:10.1016/S0304-3940(96)12430-7. PMID 8710194. ABS

**Long-latency responses and window conventions**
- Nashner LM (1976) Exp Brain Res 26:59–72. doi:10.1007/BF00235249. PMID 964327. ABS
- Ritzmann R et al. (2019) Front Physiol 10:576. doi:10.3389/fphys.2019.00576. PMID 31164834. PMC6536696. FT
- Kurtzer IL (2014) Front Integr Neurosci 8:99. doi:10.3389/fnint.2014.00099. PMID 25688187. PMC4310276. FT

**Intrinsic-stiffness windows**
- Kearney RE, Stein RB, Parameswaran L (1997) IEEE Trans Biomed Eng 44:493–504. doi:10.1109/10.581944. PMID 9151483. ABS
- Mirbagheri MM, Barbeau H, Kearney RE (2000) Exp Brain Res 135:423–436. doi:10.1007/s002210000534. PMID 11156307. ABS
- Golkar MA, Sobhani Tehrani E, Kearney RE (2017) Front Comput Neurosci 11:35. doi:10.3389/fncom.2017.00035. PMID 28579954. PMC5437117. FT
- Guarín DL, Kearney RE (2017) Front Comput Neurosci 11:51. doi:10.3389/fncom.2017.00051. PMID 28649196. PMC5465305. FT
- Loram ID, Lakie M (2002) J Physiol 545:1041–1053. doi:10.1113/jphysiol.2002.025049. PMID 12482906. PMC2290720. FT
- Sakanaka TE, Lakie M, Reynolds RF (2016) J Physiol 594:781–793. doi:10.1113/JP271137. PMID 26607292. PMC4988472. FT
- Sakanaka TE, Gill J, Lakie MD, Reynolds RF (2018) PLoS One 13:e0193850. doi:10.1371/journal.pone.0193850. PMID 29558469. PMC5860743. FT
- Sakanaka TE, Lakie M, Reynolds RF (2021) PLoS One 16:e0244993. doi:10.1371/journal.pone.0244993. PMID 33481823. PMC7822306. FT
- Casadio M, Morasso PG, Sanguineti V (2005) Gait Posture 21:410–424. doi:10.1016/j.gaitpost.2004.05.005. PMID 15886131. ABS
- Vlutters M et al. (2015) J Biomech 48:1258–1263. doi:10.1016/j.jbiomech.2015.03.004. PMID 25843262. FT
- Amiri P, Kearney RE (2021) IEEE Trans Neural Syst Rehabil Eng 29:497–507. doi:10.1109/TNSRE.2021.3057785. PMID 33556012. ABS

**Reflex gain in quiet standing**
- Fitzpatrick RC, Taylor JL, McCloskey DI (1992) J Physiol 454:533–547. doi:10.1113/jphysiol.1992.sp019278. PMID 1474502. ABS
- Fitzpatrick RC, Gorman RB, Burke D, Gandevia SC (1992) J Physiol 458:69–83. doi:10.1113/jphysiol.1992.sp019406. PMID 1338796. ABS
- Fitzpatrick R, Burke D, Gandevia SC (1996) J Neurophysiol 76:3994–4008. doi:10.1152/jn.1996.76.6.3994. PMID 8985895. ABS
- Loram ID, Maganaris CN, Lakie M (2004) J Physiol 556:683–689. doi:10.1113/jphysiol.2004.062398. PMID 15047776. ABS
- Loram ID, Maganaris CN, Lakie M (2005a) J Physiol 564:281–293. doi:10.1113/jphysiol.2004.073437. PMID 15661825. ABS
- Di Giulio I et al. (2009) J Physiol 587:2399–2416. doi:10.1113/jphysiol.2009.168690. PMID 19289550. ABS

### Automatic postural responses, torque onset, EMD, sensory latencies (§1c, 1d, 1e)

**Platform perturbations**
- Horak FB, Nashner LM (1986) J Neurophysiol 55:1369–1381. doi:10.1152/jn.1986.55.6.1369. PMID 3734861. ABS
- Diener HC, Horak FB, Nashner LM (1988) J Neurophysiol 59:1888–1905. doi:10.1152/jn.1988.59.6.1888. PMID 3404210. ABS, re-checked
- Horak FB, Diener HC, Nashner LM (1989) J Neurophysiol 62:841–853. doi:10.1152/jn.1989.62.4.841. PMID 2809706. ABS, re-checked
- Nashner LM (1977) Exp Brain Res 30:13–24. doi:10.1007/BF00237855. PMID 590411. U
- Moore SP, Rushmer DS, Windus SL, Nashner LM (1988) Exp Brain Res 73:648–658. doi:10.1007/BF00406624. PMID 3224674. ABS
- Welch TD, Ting LH (2009) J Neurophysiol 101:3294–3309. doi:10.1152/jn.90775.2008. PMID 19357335. PMC2694108. FT
- Beck ON, Shepherd MK, Rastogi R, Martino G, Ting LH, Sawicki GS (2023) Sci Robot 8:eadf1080. doi:10.1126/scirobotics.adf1080. PMID 36791215. PMC10169237. FT
- Dietz V, Horstmann GA, Berger W (1988) Neurosci Lett 94:82–87. doi:10.1016/0304-3940(88)90274-1. PMID 3241675. ABS
- Allum JH et al. (2002) J Physiol 542:643–663. doi:10.1113/jphysiol.2001.015644. PMID 12122159. ABS
- Allum JH, Oude Nijhuis LB, Carpenter MG (2008) Exp Brain Res 184:391–410. doi:10.1007/s00221-007-1112-z. PMID 17849108. ABS, re-checked
- Jacobs JV, Horak FB (2007) J Neural Transm 114:1339–1348. doi:10.1007/s00702-007-0657-0. PMID 17393068. PMC4382099. FT

**Pushes, pulls and lean-release**
- Colebatch JG, Govender S, Dennis DL (2016) Exp Brain Res 234:367–376. doi:10.1007/s00221-015-4442-2. PMID 26487178. PMC4731437. FT
- Kirker SG, Simpson DS, Jenner JR, Wing AM (2000) J Neurol Neurosurg Psychiatry 68:458–464. doi:10.1136/jnnp.68.4.458. PMID 10727481. ABS, re-checked
- Do MC, Brenière Y, Bouisset S (1988) Electroencephalogr Clin Neurophysiol 69:448–452. doi:10.1016/0013-4694(88)90067-3. PMID 2451592. ABS, re-checked
- Robinovitch SN, Heller B, Lui A, Cortez J (2002) J Neurophysiol 88:613–620. doi:10.1152/jn.2002.88.2.613. PMID 12163514. ABS, re-checked
- Di Giulio I et al. (2016) J Neurophysiol 116:493–502. doi:10.1152/jn.00996.2015. PMID 27098030. PMC4978787. FT
- Thelen DG, Schultz AB, Alexander NB, Ashton-Miller JA (1996) J Gerontol A 51:M226–M232. doi:10.1093/gerona/51a.5.m226. PMID 8808994. ABS
- Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE (1999) J Biomech 32:1149–1158. doi:10.1016/S0021-9290(99)00116-5. PMID 10541064. ABS
- Rietdyk S (1999) *Postural responses to unexpected multi-directional upper body perturbations.* PhD thesis, University of Waterloo. https://dspacemainprd01.lib.uwaterloo.ca/server/api/core/bitstreams/15050f48-2f33-4140-9711-0fe90d652732/content. FT. EMG onsets in it are cited from Little 1997 (SEC)

**Electromechanical delay and EMG-to-torque**
- Nordez A et al. (2009) J Appl Physiol 106:1970–1975. doi:10.1152/japplphysiol.00221.2009. PMID 19359617. ABS, re-checked
- Muraoka T et al. (2004) J Appl Physiol 96:540–544. doi:10.1152/japplphysiol.01015.2002. PMID 14527969. ABS
- Zhou S, Lawson DL, Morrison WE, Fairweather I (1995) Eur J Appl Physiol 70:138–145. doi:10.1007/BF00361541. PMID 7768236. ABS, re-checked
- Begovic H et al. (2014) Front Physiol 5:494. doi:10.3389/fphys.2014.00494. PMID 25566091. ABS
- Cavanagh PR, Komi PV (1979) Eur J Appl Physiol 42:159–163. doi:10.1007/BF00431022. PMID 527577. ABS
- Masani K, Vette AH, Kawashima N, Popovic MR (2008) J Neurophysiol 100:1465–1475. doi:10.1152/jn.00801.2007. PMID 18596181. ABS, re-checked
- Kiemel T, Elahi AJ, Jeka JJ (2008) J Neurophysiol 100:3394–3406. doi:10.1152/jn.01272.2007. PMID 18829854. PMC2604857. FT / FT-w

**Vestibular, visual and cutaneous**
- Britton TC et al. (1993) Exp Brain Res 94:143–151. doi:10.1007/BF00230477. PMID 8335069. ABS, re-checked
- Fitzpatrick R, Burke D, Gandevia SC (1994) J Physiol 478:363–372. doi:10.1113/jphysiol.1994.sp020257. PMID 7965852. ABS, re-checked
- Cathers I, Day BL, Fitzpatrick RC (2005) J Physiol 563:229–234. doi:10.1113/jphysiol.2004.079525. PMID 15618274. ABS
- Dakin CJ et al. (2007) J Physiol 583:1117–1127. doi:10.1113/jphysiol.2007.133264. PMID 17640935. ABS
- Day BL, Muller T, Offord J, Di Giulio I (2016) J Physiol 594:5661–5671. doi:10.1113/JP271813. PMID 27686250. PMC5043039. FT
- Hemakumara SG, Forero J, Fenrich KK, Misiaszek JE (2025) Exp Brain Res 243:99. doi:10.1007/s00221-025-07053-4. PMID 40121583. PMC11930864. FT
- Bronstein AM (1986) Exp Brain Res 63:655–658. doi:10.1007/BF00237488. PMID 3489640. ABS
- Lestienne F, Soechting J, Berthoz A (1977) Exp Brain Res 28:363–384. PMID 885185. SEC via Day 2016
- Aniss AM, Gandevia SC, Burke D (1992) J Neurophysiol 67:1375–1384. doi:10.1152/jn.1992.67.5.1375. PMID 1597720. ABS
- Nakajima T et al. (2006) Exp Brain Res 175:514–525. doi:10.1007/s00221-006-0568-6. PMID 16847613. ABS

### Control models (§2)

**Peterka family**
- Peterka RJ (2002) J Neurophysiol 88:1097–1118. doi:10.1152/jn.2002.88.3.1097. PMID 12205132. FT
- Peterka RJ, Loughlin PJ (2004) J Neurophysiol 91:410–423. doi:10.1152/jn.00516.2003. PMID 13679407. FT
- Maurer C, Peterka RJ (2005) J Neurophysiol 93:189–200. doi:10.1152/jn.00221.2004. PMID 15331614. FT
- Peterka RJ, Murchison CF, Parrington L, Fino PC, King LA (2018) Front Neurol 9:1045. doi:10.3389/fneur.2018.01045. PMID 30619027. PMC6300494. FT
- van der Kooij H, Peterka RJ (2011) J Comput Neurosci 30:759–778. doi:10.1007/s10827-010-0291-y. PMID 21161357. PMC3108015. FT
- Goodworth AD, Peterka RJ (2009) J Neurophysiol 102:496–512. doi:10.1152/jn.00118.2009. PMID 19403751. PMC2712260. FT-w, Table 1 checked
- Goodworth AD, Peterka RJ (2010) J Neurophysiol 103:1978–1987. doi:10.1152/jn.01064.2009. PMID 20147413. PMC2853278. FT-w
- Goodworth AD, Peterka RJ (2012) J Neurophysiol 107:12–28. doi:10.1152/jn.00670.2010. PMID 21940611. PMC3349694. FT-w, Table 2 checked

**Twente and DEC models**
- Pasma JH et al. (2017) J NeuroEng Rehabil 14:97. doi:10.1186/s12984-017-0299-x. PMID 28915821. PMC5603100. FT
- Engelhart D et al. (2016) J Neurophysiol 115:1422–1435. doi:10.1152/jn.00030.2015. PMID 26719084. PMC4808116. FT, values read from figures
- van der Kooij H, de Vlugt E (2007) J Neurophysiol 98:730–743. doi:10.1152/jn.00457.2006. PMID 17460106. ABS
- Hettich G, Assländer L, Gollhofer A, Mergner T (2014) Hum Mov Sci 37:123–146. doi:10.1016/j.humov.2014.07.004. PMID 25150802. FT
- Assländer L, Hettich G, Mergner T (2015) Hum Mov Sci 41:147–164. doi:10.1016/j.humov.2015.02.010. PMID 25816794. PMC4427279. FT

**Kiemel/Jeka and Ting lab**
- Kiemel T, Zhang Y, Jeka JJ (2011) J Neurosci 31:15144–15153. doi:10.1523/JNEUROSCI.1013-11.2011. PMID 22016548. PMC3470452. FT
- Welch TD, Ting LH (2008) J Neurophysiol 99:1032–1038. doi:10.1152/jn.01110.2007. PMID 18094102. FT (lab PDF)
- Safavynia SA, Ting LH (2012) J Neurophysiol 107:159–177. doi:10.1152/jn.00653.2011. PMID 21957219. FT
- Safavynia SA, Ting LH (2013a) J Neurophysiol 109:31–45. doi:10.1152/jn.00684.2012. PMID 23100133. FT
- Safavynia SA, Ting LH (2013b) J Neurophysiol 110:1278–1290. doi:10.1152/jn.00609.2012. PMID 23803325. PMC3763153. FT
- Jakubowski KL et al. (2025) J Neurophysiol 133:206–221. doi:10.1152/jn.00367.2024. PMID 39658948. PMC11967846. FT-w
- Bingham JT, Choi JT, Ting LH (2011) J Neurophysiol 106:437–448. doi:10.1152/jn.00010.2011. PMID 21543754. PMC3129728. FT-w

**Masani/Vette, intermittent and delay-limited models**
- Vette AH et al. (2007) Proc Canadian Med Biol Eng Soc 30(1). proceedings.cmbes.ca/index.php/proceedings/article/view/204. FT
- Zelei A et al. (2021) Sci Rep 11:11392. doi:10.1038/s41598-021-90305-4. PMID 34059718. PMC8167093. FT
- Asai Y et al. (2009) PLoS One 4:e6169. doi:10.1371/journal.pone.0006169. PMID 19584944. PMC2704954. FT
- Loram ID, Maganaris CN, Lakie M (2005b) J Physiol 564:295–311. doi:10.1113/jphysiol.2004.076307. PMID 15661824. PMC1456055. FT
- Loram ID, Lakie M, Gawthrop PJ (2009) J Physiol 587:1343–1365. doi:10.1113/jphysiol.2008.166173. PMID 19171654. PMC2675002. FT
- Loram ID, Gollee H, Lakie M, Gawthrop PJ (2011) J Physiol 589:307–324. doi:10.1113/jphysiol.2010.194712. PMID 21098004. PMC3043535. FT
- van de Kamp C, Gawthrop PJ, Gollee H, Loram ID (2013) PLoS Comput Biol 9:e1002843. doi:10.1371/journal.pcbi.1002843. PMID 23300430. PMC3536613. FT
- van de Kamp C et al. (2013) Front Comput Neurosci 7:55. doi:10.3389/fncom.2013.00055. PMID 23675342. PMC3648771. FT
- Loram ID, Gollee H, van de Kamp C, Gawthrop PJ (2022) IEEE Trans Biomed Eng 69:3623–3634. doi:10.1109/TBME.2022.3174927. PMID 35560085. FT (eprints.gla.ac.uk/270781)
- Tietäväinen A et al. (2017) Sci Rep 7:3771. doi:10.1038/s41598-017-02372-1. PMID 28630413. PMC5476665. FT
- McKee KL, Neale MC (2019) PLoS One 14:e0222664. doi:10.1371/journal.pone.0222664. PMID 31527893. PMC6748412. FT

**Multi-joint and simulation models**
- Alexandrov AV, Frolov AA, Horak FB, Carlson-Kuhta P, Park S (2005) Biol Cybern 93:309–322. doi:10.1007/s00422-005-0004-1. PMID 16228222. PMC1430400. FT-w
- Park S, Horak FB, Kuo AD (2004) Exp Brain Res 154:417–427. doi:10.1007/s00221-003-1674-3. PMID 14618285. ABS
- Kim S, Horak FB, Carlson-Kuhta P, Park S (2009) J Neurophysiol 102:2910–2920. doi:10.1152/jn.00206.2009. PMID 19741108. PMC2777824. FT
- Kim S, Atkeson CG, Park S (2012) J Biomech 45:1379–1386. doi:10.1016/j.jbiomech.2012.03.001. PMID 22444347. ABS
- Shanbhag J et al. (2024) Front Neurosci 18:1393749. doi:10.3389/fnins.2024.1393749. PMID 38812972. PMC11133552. FT
- Li Y, Levine WS, Loeb GE (2012) IEEE Trans Neural Syst Rehabil Eng 20:738–748. doi:10.1109/TNSRE.2012.2199333. PMID 22692939. SEC via Shanbhag 2024

### Sway, recovery and thresholds (§3, 4)

**Quiet-stance sway**
- Foulger LH, Reiter ER, Kuo C, Carpenter MG, Blouin JS (2025) PLoS One 20:e0315851. doi:10.1371/journal.pone.0315851. PMID 39804881. PMC11730423. FT
- Winter DA et al. (1998) J Neurophysiol 80:1211–1221. doi:10.1152/jn.1998.80.3.1211. PMID 9744933. ABS
- Kirby RL, Price NA, MacLeod DA (1987) J Biomech 20:423–427. doi:10.1016/0021-9290(87)90049-2. PMID 3597457. ABS
- Borzucka D et al. (2020) Sci Rep 10:19334. doi:10.1038/s41598-020-76390-x. PMID 33168913. PMC7653955. FT
- Thompson LA et al. (2017) Sports 5:86. doi:10.3390/sports5040086. PMID 29910446. PMC5969037. FT
- Yamamoto T et al. (2015) Physiol Rep 3:e12329. doi:10.14814/phy2.12329. PMID 25780094. PMC4393163. FT
- Soames RW, Atha J (1982) Eur J Appl Physiol 49:169–177. doi:10.1007/BF02334065. PMID 6981506. ABS
- Masani K et al. (2014) Gait Posture 39:946–952. doi:10.1016/j.gaitpost.2013.12.008. PMID 24444652. ABS
- Aramaki Y et al. (2001) Exp Brain Res 136:463–473. doi:10.1007/s002210000603. PMID 11291727. ABS
- Pinter IJ, van Swigchem R, van Soest AJ, Rozendaal LA (2008) J Neurophysiol 100:3197–3208. doi:10.1152/jn.01312.2007. PMID 18829852. ABS
- Creath R et al. (2005) Neurosci Lett 377:75–80. doi:10.1016/j.neulet.2004.11.071. PMID 15740840. ABS
- Prieto TE et al. (1996) IEEE Trans Biomed Eng 43:956–966. doi:10.1109/10.532130. PMID 9214811. ABS; table values not obtained
- Gage WH, Winter DA, Frank JS, Adkin AL (2004) Gait Posture 19:124–132. doi:10.1016/S0966-6362(03)00037-7. PMID 15013500. ABS; values not obtained
- Collins JJ, De Luca CJ (1993) Exp Brain Res 95:308–318. doi:10.1007/BF00229788. PMID 8224055. ABS

**Recovery and feet-in-place limits**
- van Mierlo M et al. (2023) PLoS One 18:e0272245. doi:10.1371/journal.pone.0272245. PMID 37043457. PMC10096271. FT
- Zhu RT, Lyu PZ, Li S, Tong CY, Ling YT, Ma CZ (2022) Biosensors 12:430. doi:10.3390/bios12060430. PMID 35735577. PMC9220852. FT
- Hwang S, Tae K, Sohn R, Kim J, Son J, Kim Y (2009) Ann Biomed Eng 37:1629–1637. doi:10.1007/s10439-009-9717-y. PMID 19472056. ABS
- Runge CF, Shupert CL, Horak FB, Zajac FE (1999) Gait Posture 10:161–170. doi:10.1016/S0966-6362(99)00032-6. PMID 10502650. ABS
- Hof AL, Curtze C (2016) J Biomech 49:580–585. doi:10.1016/j.jbiomech.2016.01.021. PMID 26892898. ABS
- Robert T et al. (2018) J Biomech 75:89–95. doi:10.1016/j.jbiomech.2018.05.010. PMID 29793765. ABS
- Verniba D, Gage WH (2019) J Biomech 94:224–229. doi:10.1016/j.jbiomech.2019.07.027. PMID 31395277. ABS
- Crenshaw JR, Kaufman KR (2014) Gait Posture 39:810–815. doi:10.1016/j.gaitpost.2013.11.006. PMID 24300837. PMC3910088. FT
- Mille ML et al. (2003) J Neurophysiol 90:666–674. doi:10.1152/jn.00974.2002. PMID 12711707. ABS
- Sturnieks DL et al. (2013) PLoS One 8:e70981. doi:10.1371/journal.pone.0070981. PMID 23951059. PMC3739780. carried from PPR-2


# Force production, relaxation and series elasticity in human ankle and knee muscles

**Literature review for preregistering a reduced muscle/actuator model (Touchline Physical Character V2, MUSCLE-1)**

Compiled 12 Oct 2026. Desk research only. No simulation code was changed, and nothing in this file has been tuned against the simulator.

---

## 0. Conventions, access and method

### 0.1 Labels

| Label | Meaning |
|---|---|
| **[M]** | Measured human value, as reported by the authors. Animal or fibre data are labelled [M] with the species stated. |
| **[E]** | Derived by the compiler from measured or model values. The arithmetic is stated in the row or in Appendix A. |
| **[MODEL]** | A parameter fitted, assumed or chosen inside a model, including values fitted to human data. |
| **[D]** | Design choice. Used only in §12 (Recommendation). |
| **[UNVERIFIED]** | The compiler could not confirm the value from an accessible primary source. |

### 0.2 Access codes (per reference)

| Code | Meaning |
|---|---|
| **FT** | Full text read: PMC HTML, Europe PMC XML, a publisher PDF or a scanned PMC page. "FT-W" means full text extracted through a web-fetch tool that quotes sentences verbatim. Treat it as full text, slightly weaker. |
| **ABS** | Abstract only (Europe PMC / NCBI record). |
| **SEC** | The value comes from another paper that cites the original. The original was not read. |

### 0.3 How the search was done

- **WebSearch quota was used up**, so no general web search was available.
  - Sources were found through the Europe PMC REST API and NCBI E-utilities (metadata and abstracts).
  - Full text came from PMC HTML (all *J Physiol* back issues, *PLoS*, *Frontiers*, *Physiol Rep* and NIH manuscripts), Semantic Scholar OA links, the CMBES proceedings site and the OpenSim source on GitHub.
- **Publisher sites returned HTTP 403** (physiology.org, Wiley, Springer, Elsevier). Many *J Appl Physiol*, *Eur J Appl Physiol* and *J Biomech* papers are therefore **ABS only**.
- **An abstract-parsing bug was found and fixed during the work.** The bug deleted any text between a "<" and a later ">", so sentences next to "P < 0.05" could vanish.
  - All abstracts that contain "<" or ">" and are cited here were re-fetched and re-checked after the fix.
  - One earlier "unverified" verdict was reversed as a result: Magnusson 2003, free Achilles tendon stiffness 759 ± 132 N/mm, is in the abstract.
- **Every number below was read from the cited source** at the access level stated. Values that come only through a secondary citation are marked SEC.
- **Earlier repo reviews were used only as leads** (PPR-1 `PRE_REFLEX_LITERATURE.md`, PPR-2 `STANDING_SUBSTRATE_LITERATURE.md`, PPR-3 `POSTURAL_TIMING_CONTROL_LITERATURE.md`, ABI-1 `BALANCE_LITERATURE.md`). Values were re-verified, and corrections to those reviews are listed in §13.3.

### 0.4 Definitions used throughout

| Term | Definition |
|---|---|
| **TPT / CT** | Twitch time to peak, also called contraction time. Timed from torque onset unless a row says "from stimulus"; timing from the stimulus includes the EMD of ~10–14 ms. |
| **HRT** | Half-relaxation time, peak → 50 % of peak. |
| **10–90 % rise / 90–10 % fall** | Time between the 10 % and 90 % levels of the force change. For a first-order lag τ this is 2.197τ. For a critically damped second-order system with natural frequency ωn it is 3.358/ωn. |
| **Low-frequency group delay** of a second-order low-pass | 2ζ/ωn. Earlier reviews called this the "equivalent lag". |
| **EMD** | Electromechanical delay: EMG (or M-wave) onset → force onset. A transport delay. |
| **NMD** | Neuromechanical delay: lag between motor-unit drive and force during *continuous* force modulation. It behaves like the phase lag of a low-pass filter, not a pure delay. |
| **mgh** | Body weight × centre-of-mass height. The standing "toppling stiffness" per radian. |

---

## 1. Bottom line

1. **Human whole-muscle force develops far more slowly than a 15 ms first-order activation.** [M]
   - Twitch time-to-peak at ~33–35 °C:
     - whole triceps surae ≈ 104–134 ms (most studies 110–124 ms)
     - soleus 156.5 ms; medial gastrocnemius 113.7 ms; lateral gastrocnemius 100.0 ms
     - tibialis anterior ≈ 71–111 ms (most 81–96 ms)
     - quadriceps ≈ 61–94 ms (most 79–94 ms)
   - Even a supramaximal 8-pulse/300 Hz knee-extensor "octet" (a 23 ms burst) peaks 112–147 ms after onset. It reaches only 59–74 % of its peak by 50 ms. [M]/[E]
   - Triceps surae peak rates of tetanic rise are 0.36 % P0/ms (50 Hz) and 0.48 % P0/ms (200 Hz). That puts a lower bound on the evoked 10–90 % rise of ≈ 222 ms and ≈ 167 ms [E].
   - Converted to one step-response descriptor (§9), the human 10–90 % torque rise is ≈ 0.25–0.45 s for plantarflexors and ≈ 0.15–0.25 s for dorsiflexors and knee extensors [E].
   - The current actuator (first-order, 15 ms, no contraction dynamics) gives 33 ms [E].
2. **Relaxation is faster than rise for the triceps surae, but slower than a 50 ms first-order deactivation alone (90–10 % = 110 ms).** [M]
   - Triceps surae twitch HRT ≈ 64–121 ms (most 80–100 ms). It is strongly angle-dependent: 101 ms at 20° dorsiflexion vs 64 ms at 20° plantarflexion.
   - Tibialis anterior HRT 70–110 ms. Dorsiflexor 50 Hz tetanus HRT 138–180 ms.
   - Peak TS relaxation rate is 1.25–1.27 % P0/ms, so the 90–10 % fall is at least ≈ 63 ms [E].
   - TS force returns to baseline 232–243 ms after EMG stops (50 Hz motor-point tetanus). [M]
3. **Electromechanical delay (EMD) is a short transport delay and depends heavily on method.**
   - Evoked: triceps surae / medial gastrocnemius ≈ 8.5–14 ms with high-resolution methods (Yavuz 2010; Nordez 2009; Ota 2023), 23–27 ms with threshold detection (Toninelli 2024). Knee extensors 10–17 ms.
   - Voluntary: knee extensors 18–23 ms on low-noise rigs vs 39–50 ms on standard dynamometers. Tibialis anterior 31 ms from rest, 18 ms when pre-activated. Hamstrings 44 ms.
   - About half of evoked medial gastrocnemius EMD (47.5 ± 6.0 %) is passive series-elastic take-up (Nordez 2009). [M]
4. **When EMG→torque transfer is fitted in standing, the fits are slow** [MODEL fitted to human data].
   - Second-order fits: ωn ≈ 6.6–9.9 rad/s, ζ ≈ 1.0–1.5. That implies a 10–90 % step rise of ≈ 0.42–0.59 s and a low-frequency group delay of ≈ 0.25–0.30 s [E] (Kiemel 2008/2011; Masani 2008; Pasma *JNER* 2017).
   - The reflex-pathway fit with tendon modelled separately (Mugge 2010: 2.68 Hz, ζ 0.99) implies ≈ 0.20 s [E].
   - **The "40 ms first-order" filter of Welch & Ting (2009) was assumed, not fitted.** It must not be weighed against the fitted values.
5. **In Hill-type models the slowing comes from tendon compliance plus fibre force–velocity, not from activation.**
   - In a Thelen-type model simulated here with Gait2392 parameters, adding the compliant tendon multiplied the 10–90 % rise by 1.5–4.4 (49–145 ms vs 33 ms for activation alone) [E, model simulation]. Relaxation stayed ≈ 110 ms, i.e. set by τ_deact.
   - This matches Mayfield 2023: lower tendon stiffness "slowed and prolonged force development … without affecting force decay" [MODEL fitted to human twitch].
   - Even those model rise times are faster than the measured in vivo human data in item 1.
6. **Cross-bridge force redevelopment is probably not rate-limiting at body temperature.**
   - Human type I fibre k_tr is 53.6 s⁻¹ at 30 °C (1/k_tr ≈ 19 ms) [M/E]. Q10 is ≈ 6, extrapolating to ≈ 5 ms at 37 °C [E, speculative].
   - The slow in vivo rise is therefore attributed to activation kinetics plus series compliance plus force–velocity.
7. **Series elasticity at the joint ("SEC" below) is soft at low force and stiffens with force.**
   - Plantarflexor SEC:
     - ≈ 240–300 N·m/rad per leg at standing torques (Loram 2002/2007, foot included) [E]
     - 250–530 N·m/rad at 100 N·m by quick release (Hof 1998; de Zee & Voigt 2001) [M]
     - ≈ 1200–1600 N·m/rad near MVC from ultrasound k·r², foot excluded [E]
   - Dorsiflexor SEC: ≈ 80 → 209 N·m/rad (TA tendon, 0 → max stimulated force) [E]; 149–219 N·m/rad at 34 N·m by quick release [M].
   - Knee-extensor SEC: limited by the tendon–aponeurosis, ≈ 1160 N·m/rad secant at MVC [E]. The patellar tendon alone is ≈ 7–10× stiffer and is not the limiting element.
8. **Short-range stiffness (SRS) is immediate, proportional to force, and limited at the joint by the series tendon.**
   - Muscle-level: K = γF/l_opt, with γ ≈ 23.4 [MODEL, cat whole muscle] up to ≈ 280 [MODEL from fibre data]. The elastic limit is ≈ 0.5–1 % of fibre length.
   - At the standing ankle the contractile element is 6–17× stiffer than the SEC for rotations ≤ 0.4°. The intrinsic joint stiffness (≈ 0.77–0.93 mgh) is therefore tendon-limited (Loram 2007b).
   - Stiffness tracks *developed* torque rather than EMG (Hunter & Kearney 1983 fatigue study).
   - In cold frog fibres stiffness leads force by 11–20 ms on the rise; ramp methods find the two synchronous. This has not been measured in human muscle at 37 °C.
9. **History effects.**
   - Residual force enhancement after active stretch is ≈ 5–17 % (stimulated or maximal). It is ≈ 7 % for plantarflexors at 25 % voluntary effort, and absent in roughly half or more of subjects at 10–30 % voluntary effort. It settles within 1–2 s and vanishes when force returns to zero.
   - Force depression after shortening is 9–37 % and is largely abolished by ≈ 200 ms of relaxation.
   - Work absorbed by stretched active muscle is dissipated as heat. Tendon returns ≈ 90 % or more of stored energy (in vitro hysteresis 6–11 %). In vivo hysteresis estimates, 5–50 %, are dominated by method.
10. **Main conflicts** are listed in §11. The largest:
    - the assumed 40 ms filter vs fitted 0.42–0.59 s EMG→torque rise
    - a 10× method spread in Achilles stiffness
    - SRS gain γ = 23.4 vs 280
    - knee-extensor octet HRT 78–83 vs 174–208 ms
    - whether stiffness leads force on the rise and lags it in relaxation

---

## 2. A — Force development and relaxation in vivo

### 2.1 A1. Twitch time-to-peak and half-relaxation

#### Whole triceps surae (tibial-nerve stimulation unless stated)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| TPT / HRT | [M] **112.4 ± 11.1 / 99.6 ± 14.4 ms**. Tetanic fusion ≈ 60 Hz. Stretching the muscle (dorsiflexion) lengthens both times | Young adults. n and sex not in the abstract | Sale et al. 1982 (ABS) |
| TPT / HRT | [M] **110 ± 11 / 82 ± 11 ms** | 11 healthy young men | Thomas et al. 1988 (ABS) |
| TPT / HRT | [M] **111 ± 20 / 83 ± 13 ms** | 5 men, 22 y | Davies, Mecrow & White 1982 (ABS) |
| TPT, young vs elderly | [M] Young men 118 ± 14, young women 132 ± 11 ms. Elderly men 147 ± 15, elderly women 143 ± 8 ms | Young ≈ 22 y, elderly ≈ 69 y | Davies, Thomas & White 1986 (ABS) |
| TPT / HRT | [M] 126 ± 10 / 88 ± 7 ms | 4 men, before voluntary immobilisation | White, Davies & Brooksby 1984 (ABS) |
| CT / HRT | [M] **134.2 ± 16.1 / 120.6 ± 19.7 ms**. Twitch 18.2 N·m; potentiation 17 % | 25 controls (15 M/10 F), 19–63 y. Knee 90°, ankle 10° dorsiflexion. Skin 34–38 °C | Bélanger & McComas 1983 JNNP (FT, scanned) |
| TPT / HRT vs ankle angle | [M] **20° dorsiflexion: 109.2 ± 10.7 / 100.9 ± 7.2 ms. 20° plantarflexion: 103.5 ± 11.0 / 64.2 ± 7.7 ms**. HRT is ≈ 37 % longer when the muscle is lengthened | 10 recreationally active men, 24 ± 3 y. Knee 90° | Hali, Zero & Rice 2021 (FT) |
| TPT / HRT | [M] **123.6 ± 8.6 / 100.2 ± 17.2 ms**. Older men (n = 18, 72 y): 154.8 ± 24.7 / 129.0 ± 24.4 ms | 10 young men, 28 ± 3 y. Knee extended, ankle 0°. Unpotentiated | Mayfield, Cronin & Lichtwark 2023 (FT) |
| TPT / HRT | [M] Men 0.10 ± 0.02 s, women 0.10 ± 0.01 s / men 0.08 ± 0.01 s, women 0.09 ± 0.01 s. TPT timed from torque onset | 14 M (22 y), 13 F (21 y), physically active | Ha et al. 2022 (FT) |
| TPT / HRT / EMD vs **muscle temperature** | [M] At 38.1 / 33.0 / 25.0 °C (measured triceps surae temperature): TPT **97.5 ± 10.4 / 116.1 ± 12.5 / 141.5 ± 13.3 ms**; HRT **84.3 ± 14.8 / 104.9 ± 22.4 / 146.3 ± 15.1 ms**; evoked EMD 12.4 / 13.5 / 14.4 ms. TPT timed from the stimulus | 10 men, 25.7 y. Prone, knee extended, ankle 90° | Ota & Sasaki 2023 (FT) |
| Trained vs untrained | [M] Power- and endurance-trained athletes have shorter CT and HRT. No absolute values in the abstract | 3 × 12 subjects | Pääsuke et al. 1999 (ABS) |

#### Soleus vs gastrocnemius (stimulation over each muscle belly)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Contraction time | [M] **Soleus 156.5 ± 14.7 ms; medial gastrocnemius (MG) 113.7 ± 19.6 ms; lateral gastrocnemius (LG) 100.0 ± 10.8 ms** | Submaximal belly stimulation. n not in the abstract | Vandervoort & McComas 1983 (ABS) |
| HRT | [M] Differed significantly between all three muscles. Values not in the abstract [UNVERIFIED] | Same | Same |
| Post-tetanic potentiation (3 s at 50 Hz) | [M] LG 60.4 ± 43.1 %; soleus 2.6 ± 3.3 % | Same | Same |

#### Tibialis anterior / dorsiflexors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| CT / HRT | [M] **81.2 ± 7.4 / 83.6 ± 17.2 ms**. Stretching TA slows the twitch | Healthy young men | Marsh et al. 1981 (ABS) |
| CT / HRT (dorsiflexors) | [M] **84.8 ± 10.2 / 102.8 ± 24.1 ms**. Twitch 1.8 N·m; potentiation 130 % | 25 controls (as Bélanger above). Ankle 20° plantarflexion | Bélanger & McComas 1983 (FT, scanned) |
| tc / ½tR at control length | [M] 96 ± 8 / 110 ± 14 ms. At the short length (30° dorsiflexion): tc 90 % and ½tR 79 % of control | 3 M, 2 F. Motor-point stimulation | Gandevia & McKenzie 1988 (FT, scanned) |
| TPT / HRT | [M] **71.0 ± 10.1 / 70.0 ± 9.6 ms** (after ballistic training: 67 / 78 ms, n.s.) | 3 F, 2 M, 18–22 y. Peroneal nerve, ankle ≈ 90° | Van Cutsem, Duchateau & Hainaut 1998 (FT-W) |
| TPT / HRT (dorsiflexors) | [M] **110.7 ± 15.7 / 109.5 ± 22.7 ms**. Old men (76 y): 133.3 ± 9.1 / 146.0 ± 23.9 ms | 10 young men, 26.1 ± 2.7 y. Ankle 40° plantarflexion (lengthened TA) | Power, Rice & Vandervoort 2012 (FT) |

#### Quadriceps / knee extensors (femoral-nerve stimulation)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| TPT / HRT | [M] **94 ± 12 / 97 ± 32 ms** (trials 2–3: 93 / 81 and 92 / 84 ms) at rectal temperature 37 °C. At 39 °C: 76 ± 11 / 65 ± 11 ms | 10 (5 F/5 M), 35.6 ± 7.2 y, endurance-active. Knee 105° (180° = extended) | Gordon et al. 2023 (FT) |
| TPT | [M] Resting twitch 79 ± 11 and 82 ± 8 ms (two groups). Potentiated 79 ± 6 / 79 ± 9 ms. Twitch EMD 10–11 ms | 23 untrained men, 22 y. Knee ≈ 95° | Jones et al. 2017 (FT) |
| TPT vs fibre type | [M] **61 ± 12 ms (72 % type II) vs 86 ± 7 ms (39 % type II)** | Extreme groups, n = 4 each, out of 20 young men | Hamada et al. 2000 (ABS) |
| Twitch torque at 50 ms ÷ peak twitch torque | [E] 0.80 / 0.85 / 0.88 / 0.86 / 0.87 at knee 35 / 50 / 65 / 80 / 95° flexion. Ratio of group means | 28 men, 23 ± 3 y, recreationally active | Lanza, Balshaw & Folland 2019 (FT, Table 1) |

#### Hamstrings / knee flexors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| TPT / HRT | [M] **95.8 ± 41.6 / 85.6 ± 50.8 ms**. Contraction duration 181.5 ± 64.6 ms. Twitch rate of torque development 350.9 N·m/s. Old men (80 y): 159 ± 53 / 168 ± 63 ms | 11 men, 26 ± 4 y. Seated, knee 110° (180° = extended). **Percutaneous muscle stimulation recruited only part of the muscle**: the 100 Hz train reached 31 ± 2 % MVC. Low confidence | Kirk, Gilmore & Rice 2018 (FT) |

**A1 summary.** All values are from resting muscle at ≈ 33–35 °C unless stated.

| Muscle | TPT range (central) | HRT range (central) | Speed evidence |
|---|---|---|---|
| Whole triceps surae, young | 104–134 ms (≈ 110–124) | 64–121 ms (≈ 80–100) | Blend of soleus and gastrocnemius |
| Soleus | 156.5 ms | — | Slow-twitch range; ≈ 3 % potentiation (Vandervoort & McComas 1983; Bellemare et al. 1983, ABS) |
| Gastrocnemius | 100–114 ms | — | Faster; LG potentiates ≈ 60 % |
| TA | 71–111 ms (≈ 81–96) | 70–110 ms (≈ 84–110) | Dorsiflexor twitch potentiation 130 % (Bélanger & McComas 1983); fibre composition not reviewed here |
| Quadriceps | 61–94 ms (≈ 79–94) | 65–97 ms | TPT 61 vs 86 ms at 72 % vs 39 % type II (Hamada 2000) |
| Hamstrings | 96 ± 42 ms (one partial-recruitment study) | 86 ± 51 ms | — |

Modifiers [M]:
- **Temperature.** Warm muscle (38 °C) shortens triceps surae TPT by ≈ 16 % and HRT by ≈ 20 % (Ota & Sasaki 2023). At 39 °C rectal temperature, knee-extensor TPT is ≈ 19 % shorter and HRT ≈ 33 % shorter than at 37 °C (Gordon 2023).
- **Length.** Lengthening slows the twitch, especially relaxation (Hali 2021; Sale 1982; Marsh 1981).
- **Age and sex.** Women and older adults are slower.

### 2.2 A2. Electrically evoked tetanic and octet rise and relaxation

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Triceps surae peak rate of tetanic rise, 50 / 200 Hz | [M] **0.36 ± 0.07 / 0.48 ± 0.08 % P0 per ms** | 11 young men | Thomas et al. 1988 (ABS) |
| Triceps surae peak rate of tetanic relaxation, 50 / 200 Hz | [M] **1.27 ± 0.33 / 1.25 ± 0.27 % P0 per ms** | Same | Same |
| Implied lower bounds | [E] **10–90 % rise ≥ 80 / 0.36 = 222 ms (50 Hz) and ≥ 167 ms (200 Hz)**. **90–10 % fall ≥ 80 / 1.27 ≈ 63 ms**. These are bounds because the peak slope is not sustained over the whole rise or fall | — | Arithmetic on Thomas 1988 |
| Triceps surae, young vs elderly | [M] Rise and relaxation rates at 50/200 Hz are slower in the elderly. Rate of rise correlates inversely with twitch TPT | Young ≈ 22 y vs elderly ≈ 69 y | Davies, Thomas & White 1986 (ABS) |
| Triceps surae fusion frequency | [M] ≈ 60 Hz | — | Sale 1982 (ABS) |
| Triceps surae, 50 Hz motor-point tetanus (2 s) | [M] EMG stop → onset of force decay ≈ 19.7 ms. **EMG stop → force back to baseline: MG 243, LG 242, soleus 232 ms** | 26 men, 23 y. Ankle 0°. 3 SD onset criterion | Toninelli et al. 2024 (FT) |
| Dorsiflexor 50 Hz tetanus HRT | [M] **138.2 ± 26.7 ms** (twitch HRT 109.5 ms in the same subjects). 10 : 50 Hz torque ratio 0.69 (14.8 vs 21.5 N·m) | 10 young men | Power, Rice & Vandervoort 2012 (FT) |
| Dorsiflexor 50 Hz, 1.5 s train | [M] HRT from last pulse **0.15 ± 0.04 and 0.18 ± 0.07 s**. [E] Torque gained in the first 100 ms (from the 2nd pulse) ÷ peak 50 Hz torque = 0.61–0.64 | 12 (10 M/2 F), 23 y. Intramuscular temperature 33.5 °C | Richards et al. 2025 (FT) |
| TA relaxation after a 35 Hz tetanus | [M] Relaxation delay (end of stimulation → force decline) **22.5 ± 5.9 ms** young, 51.4 ms old. Maximum decline rate −110 ± 46 N·m/s young | 20 young, 20 old | Cogliati et al. 2023 (ABS) |
| Knee-extensor octet (8 pulses at 300 Hz) | [M] **TPT 147 ± 10 ms; half-relaxation 78 ± 14 ms** at 37 °C rectal (39 °C: 127 / 58 ms) | As Gordon 2023 above | Gordon et al. 2023 (FT) |
| Knee-extensor octet | [M] TPT 117 ± 25 and 127 ± 19 ms. [E] Force at 50 ms ÷ peak = 0.74 and 0.67 | As Jones 2017 above | Jones et al. 2017 (FT) |
| Knee-extensor octet | [M] **TPT 137 ± 9 / HRT 208 ± 21 ms at "101°"; 112 ± 13 / 174 ± 12 ms at "155°"**. Angle convention most likely 180° = extended [convention UNVERIFIED]. TPT/HRT definitions not stated in the fetched text | 14 men, 24 ± 6 y | Tillin, Pain & Folland 2012 (FT-W) |
| Knee-extensor octet torque at 50 ms ÷ peak octet torque | [E] 0.63 / 0.64 / 0.64 / 0.61 / 0.59 at knee 35–95° flexion | 28 men | Lanza et al. 2019 (FT) |
| Knee extensors, voluntary vs stimulated (8 × 300 Hz) | [M] Peak rate of torque development similar, but the voluntary peak occurs later. Voluntary torque–time integral over the first 40 ms ≈ **40 %** of stimulated (individual range 10.3–83.3 %) | 7 subjects with > 90 % voluntary activation | de Ruiter et al. 2004 (ABS) |
| Knee-extensor force–frequency | [M] 50 % of the tetanic response at 14.3 ± 2.5 and 13.9 ± 2.2 Hz | 23 men. Submaximal percutaneous stimulation | Jones et al. 2017 (FT) |
| Hamstring force–frequency | [M] Half-maximal force at 18 Hz (young) and 12 Hz (old). Fused at 40–50 Hz | 5 young, 5 old. Percutaneous | Kirk et al. 2018 (FT) |

**A2 notes.**
- **No accessible source gave a directly measured 10–90 % tetanic rise time at 20–50 Hz** for triceps surae, soleus, TA or quadriceps. Only peak rates (Thomas 1988) and partial dorsiflexor data (Richards 2025) were found [gap].
- **The octet is a brief (≈ 23 ms) maximal burst, not a sustained step.** Its TPT of 112–147 ms shows that force keeps rising for ≈ 90–125 ms after the burst ends (TPT − 23 ms). This is consistent with persistent activation plus series-elastic stretch.
- **Tetanic relaxation is slower than twitch relaxation** (dorsiflexors 138–180 vs 110 ms HRT).

### 2.3 A3. Electromechanical delay (EMD)

#### Evoked EMD

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| MG, evoked | [M] **EMD 11.63 ± 1.51 ms** (muscle trials), 11.67 ± 1.27 ms (tendon trials). Fascicle motion onset 6.05 ± 0.64 ms; muscle–tendon junction (MTJ) motion onset 8.42 ± 1.63 ms | 9 subjects. 4 kHz ultrasound | Nordez et al. 2009 (ABS) |
| MG, share of EMD from passive series elasticity | [M] **47.5 ± 6.0 % of EMD** (aponeurosis 20.3 ± 10.7 %, tendon 27.6 ± 11.4 %) | Same | Same |
| MG evoked EMD vs ankle angle | [M] 19.2 / 17.2 / 16.0 / 15.0 / 14.8 ms at −30 / −20 / −10 / 0 / +5°. Tendon slack angle −16 ± 5°. No further change once slack is taken up | n not in abstract | Muraoka et al. 2004 (ABS) |
| Triceps surae, supramaximal tibial-nerve stimulation | [M] **8.5 ± 1.3 ms at rest**. Falls with contraction level; rises with age and fatigue | 15 M + 15 F, 18–60 y | Yavuz, Sendemir-Urkmez & Türker 2010 (ABS) |
| Triceps surae evoked EMD vs temperature | [M] 12.4 / 13.5 / 14.4 ms at 38.1 / 33.0 / 25.0 °C | 10 men | Ota & Sasaki 2023 (FT) |
| GM / GL / soleus, 50 Hz 2 s motor-point tetanus | [M] **26.6 / 26.8 / 23.5 ms**. Split: EMG→mechanomyogram (MMG) ≈ 9.7 ms; MMG→force 16.9 / 17.2 / 13.8 ms | 26 men, 23 y. Ankle 0°. 3 SD onset criterion | Toninelli et al. 2024 (FT) |
| Knee extensors, twitch | [M] Twitch EMD 10–11 ms | 23 men | Jones et al. 2017 (FT) |
| Knee extensors, electrical / tendon reflex | [M] Electrical **17.2 (SEM 0.62) ms**; patellar reflex 22.1 (SEM 1.32) ms | 21 young subjects | Zhou, Lawson, Morrison & Fairweather 1995 (ABS) |
| Knee extensors, low-noise method | Involuntary EMD "< 7 ms", voluntary "< 13 ms" | Quoted from Tillin et al. 2010 | Maffiuletti et al. 2016 (FT); Tillin 2010 = SEC |

#### Voluntary EMD

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Knee extensors, MVC | [M] **38.7 (SEM 1.18) ms** | 21 young subjects | Zhou et al. 1995 (ABS) |
| Knee extension, explosive | [M] **18.5 ± 3.6 ms** | 12 men. Low-noise chair, manual onset | Buckthorpe, Pain & Folland 2013 (FT) |
| Quadriceps vs hamstrings, explosive | [M] **22.6 vs 44.0 ms** | 20 untrained men | Hannah et al. 2014 (ABS) |
| Rectus femoris, MVC | [M] 49.7 ± 7.0 ms | 14 men. Commercial dynamometer, 3 SD criterion | Begovic et al. 2014 (FT) |
| TA, ballistic | [M] **30.7 ± 1.3 ms from rest; 18.4 ± 1.3 ms from ≈ 25 % MVC** (mean ± s.e.m.) | 7 adults (1 F/6 M), 22–44 y | Van Cutsem & Duchateau 2005 (FT-W) |
| Plantarflexion, rapid | [M] 69 ± 11 and 78 ± 15 ms (two groups, baseline). Torque onset at a 2.5 % MVC threshold, which inflates EMD | 24 young men | Ando et al. 2021 (FT) |
| Elbow flexors (for orientation only) | [M] 49.5–55.5 ms. **Arm data, not leg** | — | Cavanagh & Komi 1979 (ABS) |

#### Neuromechanical delay (NMD) during continuous force modulation

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| TA and first dorsal interosseous (FDI) | [M] Neural drive leads force by **194.6 ± 55 ms** (mean of conditions and muscles). Range 70–385 ms, shorter at faster force changes. TA 66 ms longer than FDI | 8 men. 0.5–1.5 Hz sinusoids, 1–10 % MVC amplitude around 10 % MVC | Del Vecchio et al. 2018 (ABS) |
| TA | [M] ≈ 150 ms drive→torque; ≈ 75 ms drive→fascicle length | 10 men. 20/40 % MVC | Martinez-Valdes et al. 2022 (FT) |
| Triceps surae | [M] **502 ± 120 ms at 10 % MVC; 462 ± 135 ms at 40 % MVC** | 25 adults | Contreras-Hernandez et al. 2024 (FT) |
| Vasti | [M] **175.8 ± 44.1 ms at 10 % MVC → 121.6 ± 34.6 ms at 70 % MVC** | 13 men. Knee 90° | Krätschmer et al. 2025 (FT) |

**A3 interpretation.**
- **The true minimum delays are short.** The electrochemical part of EMD is ≈ 3–10 ms. Evoked whole-muscle EMD with high-resolution methods is ≈ 8.5–14 ms at the triceps surae and 10–17 ms at the knee. Voluntary EMD from rest is ≈ 18–31 ms on low-noise rigs.
- **Longer published values are mostly a detection artefact.** Plantarflexion 69–78 ms, rectus femoris 50 ms and motor-point tetanus 23–27 ms come from threshold criteria and noisier rigs, which hide early force below the detection level.
- **Slack and pre-activation shift EMD.**
  - Slack adds ≈ 4 ms in MG (Muraoka 2004).
  - Pre-activation shortens voluntary TA EMD by ≈ 12 ms (Van Cutsem & Duchateau 2005).
  - ≈ 48 % of evoked MG EMD is passive series-elastic take-up (Nordez 2009).
- **EMD and NMD are different quantities.**
  - EMD is a delay before the force *onset*.
  - NMD (120–500 ms) reflects the low-pass filtering of force development plus series compliance during ongoing modulation.
  - NMD in triceps surae (≈ 460–500 ms) is ≈ 3× that in TA and vasti (≈ 120–195 ms). This is consistent with a slow, soleus-dominated, compliant-tendon system, but rests on one study.

### 2.4 A4. Voluntary rapid isometric contractions (rate of torque development, RTD)

**Freund & Büdingen 1978** (Exp Brain Res 31:1–12; ABS).
- The abstract describes **three hand and forearm muscles only**. No leg muscles are reported.
- The abstract confirms the central finding: in the fastest voluntary isometric contractions, the time from onset to peak force stays roughly constant across amplitudes, so the rate of force rise scales with amplitude.
- The millisecond value of the time-to-peak could not be verified. The PDF was inaccessible [UNVERIFIED].
- The leg analogue found here is TA (Van Cutsem 1998; Van Cutsem & Duchateau 2005), below.

#### Knee extensors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Torque at 25/50/75/100/125/150 ms after onset, % MVT | [M] **2 / 12 / 31 / 46 / 58 / 67 % (knee "101°"); 2 / 11 / 29 / 50 / 65 / 74 % ("155°")** | 14 men, 24 ± 6 y | Tillin, Pain & Folland 2012 (FT-W) |
| Voluntary torque at 50 ms vs octet | [M] 36–46 % of octet torque at the same time | Same | Same |
| Force at 50 / 100 / 150 ms | [M] 168 / 442 / 580 N vs MVF 736 N. [E] = 22.8 / 60.1 / 78.8 % MVF. Octet force at 50 ms 300 N; octet peak rate 13,511 N/s | 12 men. Low-noise chair | Buckthorpe, Pain & Folland 2013 (FT) |
| Normalised RTD (power athletes vs untrained) | [M] 0–50 ms: 4.86 vs 2.81 MVC/s. 50–100 ms: 6.68 vs 7.93 MVC/s | Power-trained vs untrained men | Tillin et al. 2010 (ABS) |
| Peak RTD | [M] 1858 ± 637 N·m/s, reached at 54 ± 13 ms. Octet peak rate 2720 N·m/s | Young adults | Salvaggio et al. 2026 (FT) |
| Time to reach MVC | "> 300 ms" | Review statement | Maffiuletti et al. 2016 (FT); original = SEC |
| Voluntary vs evoked, first 40 ms | [M] Voluntary torque–time integral ≈ 40 % of the 8 × 300 Hz value | 7 subjects | de Ruiter et al. 2004 (ABS) |
| Determinants of RTD by time window | [M] Within the first 40 ms, voluntary RTD correlates moderately with twitch contractile properties. After 90 ms, MVC explains 52–81 % of RTD variance | Knee extensors | Andersen & Aagaard 2006 (ABS) |
| RTD vs tendon–aponeurosis stiffness | [M] r = 0.55 (vastus lateralis) | 16 trained men | Bojsen-Møller et al. 2005 (ABS) |

#### Dorsiflexors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Normalised RTD 0–50 / 0–100 / 0–150 ms | [M] **3.1 / 4.8 / 4.6 MVT/s**. [E] ≈ 16 / 48 / 69 % MVT at 50 / 100 / 150 ms. Time to peak RTD 61–74 ms voluntary vs 24–28 ms with a 200 Hz train | 34 adults | Grootenhuis et al. 2025 (FT) |
| Ballistic time to peak torque | [M] **135.8 ± 6.9 ms**. Peak RTD 333 %MVC/s before training. Peak RTD rises linearly with target amplitude: RTD = 0.0042·A + 0.057 (%MVC/ms) | 5 subjects. Mean ± s.e.m. | Van Cutsem, Duchateau & Hainaut 1998 (FT-W) |
| Ballistic time to peak torque across 5–75 % MVC targets | [M] **136.3 ms from rest** | 7 adults | Van Cutsem & Duchateau 2005 (FT-W) |
| Rapid isometric dorsiflexion to 15 N·m | [M] ≈ 236 ms total in young women, of which 141 ms is reaction time (old women 337 / 164 ms) | 24 young (23 y), 24 old (72 y). Seated | Thelen et al. 1996 (ABS) |

#### Plantarflexors (weakest evidence)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Relative RTD | [M] 0–100 ms: 353–407 %MVC/s. 0–200 ms: 305–340 %MVC/s. [E] ≈ 35–41 % MVC at 100 ms and 61–68 % at 200 ms after onset (2.5 % MVC threshold) | 24 young men | Ando et al. 2021 (FT) |
| Stepwise RTD | [M] 116 / 201 / 254 / 221 N·m/s over 0–30 / 30–50 / 50–100 / 100–150 ms. [E] ≈ 31 N·m at 150 ms. MVC not reported; 10 Hz low-pass filter slows the curve | Young adults | Gonçalves et al. 2023 (FT) |

**A4 interpretation.**
- In explosive voluntary contractions from rest, knee extensors and dorsiflexors reach ≈ 10 % MVT at ≈ 45–50 ms and ≈ 50 % at ≈ 100 ms (≈ 46–60 % across studies).
- They reach ≈ 70–79 % by 150 ms, and MVC only after > 300 ms.
- [E] The voluntary 10–90 % rise is therefore ≳ 250 ms. It cannot be computed exactly because the 90 % crossing was not reported.
- Plantarflexors are slower (≈ 35–41 % at 100 ms), but the data are threshold-based and sparse.
- Voluntary rise is slower than evoked rise, because recruitment and rate coding are not a step: voluntary ≈ 40 % of evoked torque in the first 40 ms.

### 2.5 A5. Postural and balance responses

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Latency of active ankle torque generation after tether release | [M] **99 ± 13 ms** | 23 young adults. Lean-and-release, ankle strategy only, ankles initially relaxed | Robinovitch, Heller, Lui & Cortez 2002 (ABS) |
| Rate of ankle torque generation | [M] **372 ± 267 N·m/s** (verified in the abstract). Computation window not stated | Same | Same |
| Peak ankle torque | [M] **116 ± 32 N·m**. No difference between dynamic and static trials | Same | Same |
| Effect of pre-release baseline torque | [M] Raising baseline torque from 31 ± 18 to 54 ± 24 N·m increased the dynamic recovery limit by 11 ± 14 % | Same | Same |
| Recovery limits | [M] Dynamic 5.9 ± 1.1° vs static 14.9 ± 1.4° lean | Same | Same |
| Crude torque-rise duration | [E] 116 / 372 ≈ 0.31 s. Ratio of group means, not a per-subject statistic. CV of the rate ≈ 72 % | — | Arithmetic |
| Old vs young women | [M] Elderly: reaction time 27 % slower, torque rate 15.6 % slower, peak torque 7.7 % smaller (absolute values not in abstract) | 25 young (19–36 y), 25 elderly (66–90 y) women | Mackey & Robinovitch 2006 (ABS) |
| Muscle onset latency after release (forward lean, stepping allowed) | [M] 73–114 ms across 12 muscles. No age difference in the shortest latencies | 14 young, 12 old men | Thelen et al. 2000 (ABS) |
| Automatic postural EMG latency, support translation | [M] 73–110 ms. Ankle muscles first, then thigh, then trunk | Platform translations | Horak & Nashner 1986 (ABS) |
| Postural EMG latencies, backward translation | [M] 94–145 ms absolute. 18–29 ms between segments. Bursts 75–100 ms | 10 subjects | Diener, Horak & Nashner 1988 (ABS) |
| Support-limb response after a trip | [M] EMG ≈ 65 ms (60–80 ms). Peak ankle plantarflexion moment 204 N·m. Rates not in abstract | 12 young adults (walking trips) | Pijnappels, Bobbert & van Dieën 2005 (ABS) |
| Quiet stance: EMG leads muscle length | [M] Soleus 167 ms; gastrocnemius 203 ms (cross-correlation). EMG leads CoM velocity by 58 ms (soleus) and 28 ms (gastrocnemius) | 10 (1 F/9 M), 25–50 y. Ultrasound | Loram, Maganaris & Lakie 2005a (FT-W) |
| Quiet stance: EMG → muscle length | [M] 110 ± 50 ms, using integrated EMG with τ = 100 ms | 10 subjects, 25–49 y | Loram, Maganaris & Lakie 2005b (FT) |
| Lateral gastrocnemius EMG vs centre of gravity / centre of pressure | [M] Peak cross-correlation lag 250–300 ms | Quiet stance | Gatev et al. 1999 (ABS) |

**A5 notes.**
- **No accessible study measured EMG onset, torque onset and torque rate in the same feet-in-place perturbation trials.**
- Robinovitch's 99 ms torque latency and Thelen's 73–114 ms EMG latencies come from different protocols and must not be subtracted to obtain an EMD.
- Robinovitch's ankles started relaxed. The 372 N·m/s therefore includes slack take-up and recruitment, and it is very variable.

---

## 3. B — EMG / neural drive → force or torque transfer models fitted to human data

Arithmetic used for the [E] columns:
- second-order step responses were computed numerically from the unit-step response;
- impulse peak = time to peak of the impulse response, i.e. the "twitch-equivalent" TPT;
- low-frequency group delay = 2ζ/ωn.

The script and outputs are summarised in Appendix A.

### 3.1 Two different Pasma 2017 papers

An earlier repo review (ABI-1) attributed ω = 16.8 rad/s and ζ = 0.99 to "Pasma 2017". Full text shows the following.

- **16.8 rad/s with ζ = 0.99 originates in Mugge et al. 2010** (Exp Brain Res 200:325–340, FT).
  - Table 3 gives f_a = 2.68 ± 0.78 Hz and d_a = 0.99 ± 0.32; 2π × 2.68 = 16.8 rad/s.
  - It was fitted to ankle admittance in a seated "gas-pedal" task. n = 10 (5 M/5 F, 20–28 y). Fit bounds: f_a 2–10 Hz, d_a 0.5–1.5.
  - The filter sits only in the reflex pathway. Tendon stiffness is a separate parameter, 5074 ± 2369 N·m/rad.
- **The same value was later reused as a fixed default, not refitted.**
  - van der Kooij & Peterka 2011 (J Comput Neurosci, FT).
  - Pasma, Boonstra, van Kordelaar, Spyropoulou & Schouten 2017 (Front Comput Neurosci 11:99, FT, Table 1).
- **1.48 Hz with ζ = 1.30 comes from a different paper**: Pasma, van Kordelaar, de Kam, Weerdesteyn, Schouten & van der Kooij 2017 (J NeuroEng Rehabil 14:97, FT, Table 3).
  - These values were fitted to EMG, torque and sway frequency responses (n = 20) and then used in simulation.

### 3.2 Model table

| Model / source | Form and parameters | What it lumps | Implied step and twitch behaviour [E] | Source |
|---|---|---|---|---|
| **Welch & Ting 2009** | [MODEL, *assumed*] First order, τ = 40 ms, gain A = 4·m·h. "The time constant of the muscle model was defined as τ = 40 ms". Only the feedback gains and delay λ were fitted. Fitted λ for TA, Table 4: 79, 60, 98, 105, 82, 77, 116 ms (n = 7), i.e. 60–116 ms, [E] 88 ± 19 ms | Unspecified "muscle" force development | 10–90 % = 88 ms; group delay 40 ms | FT |
| **Mugge et al. 2010** | [MODEL, *fitted*] H_act = ω²/(s² + 2dωs + ω²), f_a = 2.68 ± 0.78 Hz, d_a = 0.99 ± 0.32. Spindle delay 38 ± 9 ms, Golgi tendon organ delay 25 ± 9 ms; tendon separate (5074 ± 2369 N·m/rad). "H_act describes the activation dynamics (the process of active muscle force buildup following a neural activation signal A)" | Activation plus contraction, **excluding tendon**. Reflex pathway only | Mean: 10–90 % **197 ms**, impulse peak 60 ms, group delay 118 ms. ± 1 SD of f_a: 152–277 ms | FT |
| **van der Kooij & Peterka 2011** | [MODEL, borrowed] ω_act 16.8 rad/s, β 0.99, cited to Mugge. The fitted lumped delay fell to **97 ms**, from "about 170 ms" in the earlier model without activation dynamics. Intrinsic k = 40.5 N·m/rad, b = 68.8 N·m·s/rad. n = 8 (24–46 y) | Motor command → force | 197 ms | FT |
| **Pasma et al. 2017, Front Comput Neurosci** | [MODEL, borrowed] 16.8 rad/s, 0.99 (Mugge); delay 0.097 s | — | 197 ms | FT |
| **Pasma et al. 2017, JNER** | [MODEL, *fitted*] Second order f0 = **1.48 Hz** (9.30 rad/s), β = **1.30**. Delay 0.104 s; intrinsic K 94.4 N·m/rad, D 10.9 N·m·s/rad. The paper notes that without acceleration feedback the fitted delay collapsed to < 1 ms | **EMG → ankle torque** (activation, contraction and tendon). Summed GM, SOL and TA EMG, both legs | 10–90 % **524 ms**; impulse peak 98 ms; group delay 280 ms | FT. n = 20 young (10 M, 23.6 ± 2.9 y), support-surface rotations |
| **Kiemel, Elahi & Jeka 2008** | [MODEL, *fitted*] Weighted rectified EMG (SOL, GAS, TA) → active ankle torque. Second-order low-pass, no delay. Ankle ω0 = **6.90 ± 0.98 rad/s, η 1.03 ± 0.19** (low-amplitude visual perturbation); 7.64 ± 1.53 rad/s, η 0.97 ± 0.31 (high). Hip 9.46 / 9.37 rad/s, η 1.58 / 1.50 | Whole EMG → torque path. Delay absorbed into the filter | Ankle 10–90 % **508 / 420 ms**; impulse peak 144 / 132 ms; group delay 299 / 254 ms | FT-W. n = 17 (19–31 y) |
| **Kiemel, Zhang & Jeka 2011** | [MODEL, *fitted*] Ankle ω0 9.9 rad/s, η 1.50; hip 12.1 rad/s, η 1.65 (group fit) | Same | Ankle 10–90 % ≈ 592 ms; group delay ≈ 303 ms | FT-W. n = 18 (18–27 y) |
| **Masani et al. 2008** | [MODEL, *fitted*] Rectified soleus EMG → ankle torque, **critically damped second order, "twitch contraction time 0.152 ± 0.027 s"**. "Effective time delay of about 200 to 380 ms" in the sway band | Whole path. Supported standing, voluntarily mimicking sway torque | ωn = 6.58 rad/s; 10–90 % **510 ms** (± 1 SD of T: 420–601 ms); group delay 304 ms | ABS. n = 10 |
| **Vette, Masani, Tan, Abe, Nakazawa & Popovic 2007** (CMBES proceedings) | [MODEL, *fitted*] Critically damped second-order "plantar flexor dynamics" with contraction time T. Initial T* = 116 ms, cited to Bellemare et al. 1983. Optimised T in the six example traces (3 subjects × eyes open/closed): **63, 66, 73, 79, 84, 97 ms**. Group values shown only as box plots. Sensory-motor delay modelled as 80 ms plus τ_E | Neural command → ankle torque | T = 63–116 ms ⇒ 10–90 % 212–390 ms; group delay 126–232 ms | FT (PDF). 10 healthy men, 30.7 ± 4.1 y. Quiet standing, eyes open/closed. **The 116 ms initial value is SEC** (Bellemare 1983 abstract gives no values) |
| **Genadry, Kearney & Hunter 1988** | [MODEL] Triceps surae EMG → torque eigenfrequency rose from ∼8 to ∼12 rad/s as torque-modulation SD rose from 2.5 to 25 % MVC; no delay | EMG → torque | If ζ = 1 is assumed: 420 → 280 ms | SEC (via Kiemel 2008) |
| **Kearney, Stein & Parameswaran 1997** | [MODEL] Reflex stiffness = delay → one-direction rate-sensitive element → low-pass. Kiemel 2008 reports its eigenfrequency as "∼20 rad/s" and notes that it includes an explicit EMD | Reflex pathway | If ζ = 1: ≈ 168 ms | ABS + SEC |
| **Mirbagheri et al. 2000/2001** | [MODEL] Reflex: delay, half-wave rectifier, low-pass (2000); third order in later work. Intrinsic: second order | — | Numbers [UNVERIFIED] | ABS |
| **Bawa & Stein 1976** | [MODEL] Stimulus → tension of human soleus is a second-order low-pass. Natural frequency falls and gain rises with dorsiflexion; damping unchanged or slightly higher | Stimulus → tension | Values not in abstract [UNVERIFIED] | ABS |
| **Bobet & Stein 1998** | [MODEL] Two first-order systems separated by a static nonlinearity; second rate constant depends on force | Stimulus → force. **Cat** soleus and plantaris | — | ABS |
| **Bobet, Gossen & Stein 2005** | [M]/[MODEL] Stimulated human ankle dorsiflexors. A linear critically damped second-order model fitted worst (rms 15 N); the Ding 2002 and Bobet–Stein models fitted best (9.2 and 9.4 N). "No linear model … error less than 9 % of maximum force" | Stimulus → force | — | ABS. n = 8 |
| **Lloyd & Besier 2003** | [MODEL] "Second-order discrete non-linear model" from rectified, low-passed EMG. Calibrated on n = 6; knee moments predicted with R² 0.91, error ≈ 12 N·m | EMG → activation (Hill model separate) | Coefficients and EMD [UNVERIFIED] | ABS |
| **Buchanan, Lloyd, Manal & Besier 2004** | [MODEL] u(t) = α·e(t − d) − β1·u(t−1) − β2·u(t−2), with β1 = γ1 + γ2, β2 = γ1·γ2, \|γ\| < 1, α − β1 − β2 = 1. Derived from a critically damped twitch (Milner-Brown 1973). Initial guesses γ1 = γ2 = 0.5, d = 40 ms; nonlinearity A ∈ (−3, 0). EMD "has been reported to range from 10 msec to about 100 msec (Corcos et al., 1992)" | EMG → "neural activation" only; tendon handled in the Hill model | Not convertible without the sampling interval | FT-W |
| **Olney & Winter 1985** | [MODEL] EMG–moment regression with length and velocity corrections; ankle RMS error 3.2–9.5 N·m, knee 4.7–13.0 N·m | — | Filter type and cutoff [UNVERIFIED] | ABS |
| **Hof & van den Berg 1981 (I–IV)** | — | — | Time constants [UNVERIFIED]; no abstract, no full-text access | not read |
| *Current Touchline actuator* | First order, τ_act = 15 ms (Thelen 2003), no contraction dynamics | Activation only | 10–90 % 33 ms | — |

### 3.3 What these filters represent, and why they disagree

1. **Assumed vs fitted.** Welch & Ting's 40 ms is a definition inside a model whose fitted quantities were feedback gains and a delay. It is not evidence about human force development.
2. **What is lumped.**
   - Kiemel, Masani, Genadry and Pasma (JNER) fit the **whole EMG → torque path**. That includes EMD, excitation–contraction coupling, cross-bridge dynamics, fibre force–velocity and Achilles/aponeurosis/foot compliance.
   - Mugge's filter excludes the tendon (modelled separately) and sits in the reflex pathway.
   - Buchanan/Lloyd filters represent only EMG → activation; the Hill model supplies contraction dynamics.
   - These are different quantities and should not be compared one-to-one.
3. **Delay and filter trade off.**
   - Without an explicit delay (Kiemel, Genadry, Masani), transport delay is absorbed into a lower apparent ωn.
   - Adding activation dynamics reduced van der Kooij & Peterka's fitted delay from ≈ 170 ms to 97 ms.
   - Pasma (JNER) found the delay collapsed without acceleration feedback.
   - Any preregistered filter must be specified together with its delay.
4. **Signal size.**
   - Standing fits are small-signal (sway), low-force and soleus-weighted (slow fibres, compliant Achilles).
   - Genadry shows ωn rising with modulation depth (∼8 → 12 rad/s), and NMD shortens with faster force changes (Del Vecchio 2018).
   - Sway-fitted filters therefore probably *underestimate* the speed of large, rapid step commands.
5. **Human stimulated muscle is not linear second order** (Bobet 2005).
   - A linear critically damped twitch also predicts HRT = 1.68 × TPT [E].
   - Measured triceps surae HRT is only 0.6–0.9 × TPT, and TA ≈ 1.0–1.15 × (§2.1).
   - So a single linear filter cannot match both rise and relaxation (Appendix A).

---

## 4. C — Model time constants, and how activation and contraction dynamics each shape force development

### 4.1 Activation / deactivation constants in musculoskeletal models

| Quantity | Value | Model / form | Source |
|---|---|---|---|
| Thelen 2003 τ_act / τ_deact, young adults | [MODEL] **15 / 50 ms**. OpenSim `Thelen2003Muscle` defaults: 0.015 / 0.050 s | First-order activation | OpenSim source (FT). Mehrabi 2016 quotes "τ_rise = 15 ms, τ_fall = 50 ms" (SEC). Thelen 2003 (ABS) |
| Thelen 2003 τ_deact, older adults | [MODEL] 60 ms ("prolonged muscular deactivation") | Ageing adjustment | Abstract (ABS); "increased from 50 to 60 ms" per Mallah & Occhipinti 2026 (SEC) |
| Activation equation used with these constants | [MODEL] da/dt = (u − a)/τ. **Rising: τ = τ_act·(0.5 + 1.5a). Falling: τ = τ_deact/(0.5 + 1.5a)** | OpenSim `MuscleFirstOrderActivationDynamicModel`, "a modification of those used by Thelen (2003) and Winters (1995)". Same as Millard 2013 eq. 3 | OpenSim source (FT); Millard 2013 (FT) |
| Effective τ under that equation (15/50) | [E] Rise: 7.5 ms (a = 0) to 30 ms (a = 1). Fall: 100 ms (a = 0) to 25 ms (a = 1) | Arithmetic | — |
| Millard 2012/2013 defaults | [MODEL] **τ_A 10 ms, τ_D 40 ms**, a_min 0.01. "set to 10 ms and 40 ms by default [39]" (ref 39 = Thelen 2003) | Same equation | Millard et al. 2013 (FT); OpenSim source (FT) |
| Gait2392 lower-limb model (Delp 1990 lineage), all leg muscles | [MODEL] τ_act 0.010 s, τ_deact 0.040 s | `gait2392_thelen2003muscle.osim` | Model file (FT) |
| De Groote et al. 2016 | [MODEL] τ_a 0.015 s, τ_d 0.060 s, smoothing b = 0.1. da/dt = [(f + 0.5)/(τ_a·z) + (0.5 − f)·z/τ_d]·(e − a), with f = 0.5·tanh(b(e − a)) and z = 0.5 + 1.5a | Based on Raasch 1997 as modified by De Groote 2009 | De Groote et al. 2016 (FT); OpenSim `DeGrooteFregly2016Muscle` (FT) |
| Effect of b = 0.1 | [E] f ≈ 0, so rise and fall average to a nearly symmetric τ (≈ 27 ms at a = 0.5). OpenSim note: "a value of 10 is recommended to achieve activation and deactivation speeds closer to the intended time constants" | — | OpenSim header (FT) |
| Zajac 1989 form | [MODEL] T_act·ȧ + (β + (1 − β)u)·a = u, β = τ_act/τ_deact. Zajac's own numeric τ values: [UNVERIFIED] | As reproduced by Venkadesan 2009 and Rockenfeller 2015 | SEC |
| Venkadesan & Valero-Cuevas 2009 | [MODEL] T_act 12 ms, β 0.2. T_act chosen from "fast muscle fibres (Wells 1965; Close 1972; Zajac 1989)"; β from Winters & Stark 1988. Contraction lag T_con = 3·T_act = 36 ms, "rate-limiting time scale" | Reduced two-time-scale model (finger) | FT |
| Winters & Stark 1985 | [MODEL] τ_a 30 ms | — | SEC (Stienen et al. 2007) |
| Winters & Stark 1988 | [MODEL] τ_act 11 ms, τ_deact 68 ms | Elbow muscles | SEC (Hasson et al. 2016) |
| Hatze activation constant m | [MODEL] 3.67–11.25 s⁻¹ (Rockenfeller used 10 s⁻¹) | Hatze formulation | Rockenfeller et al. 2015 (FT, secondary for Hatze) |
| Dick, Biewener & Wakeling 2017 | [MODEL] Separate slow- and fast-fibre τ_act derived from tetanic data; values in an image-only table [UNVERIFIED] | Two-element Hill model | FT (table unreadable) |
| He, Levine & Loeb 1989/1991; Raasch 1997; Anderson & Pandy 2001; McLean 2003; Umberger 2003 | Constants not found in any accessible text [UNVERIFIED] | — | — |

### 4.2 Contraction-dynamics defaults (tendon, force–velocity)

| Quantity | Value | Source |
|---|---|---|
| Thelen tendon strain at F0 | [MODEL] 0.04 in the OpenSim default (source comment: "was 0.033"). Gait2392 uses 0.033. The Thelen 2003 paper's own value: [UNVERIFIED] | OpenSim source and model file (FT) |
| Thelen fibre constants | [MODEL] Af 0.25; Flen 1.4 ("was 1.8"; Gait2392 1.8); active shape 0.45; passive shape 5; passive strain 0.6; Vmax 10 L0/s, scaled by (0.25 + 0.75a) | Source (FT) |
| Thelen tendon curve | [MODEL] Exponential toe to 0.33 F0, then linear. Toe strain ≈ 0.609·ε0; linear slope ≈ 1.712/ε0 (normalised) | Source (FT) |
| Millard tendon strain at 1 F0 | [MODEL] 0.049 (also the OpenSim De Groote default) | `TendonForceLengthCurve` source (FT) |
| Millard fibre damping | [MODEL] β = 0.1 ("damping forces are 0.1 f_o^M at v_max^M"). "Though strong damping forces have not been observed during in vivo human experiments, it is reasonable to assume that muscle is lightly damped" | Millard 2013 (FT) |

### 4.3 What the model papers say about activation vs contraction dynamics

- **Zajac 1989** (ABS): the ratio of tendon slack length to optimal fibre length "specifies whether excitation-contraction or musculotendon contraction is the rate-limiting process of force generation".
- **Millard et al. 2013** (FT): force is "assumed to be a function of only its activation, length, and velocity … first compute the activation resulting from neural excitation (activation dynamics) and then use this result to compute the muscle force (contraction dynamics)". When their models were fitted to the same rat-soleus force record, the fitted τ_A depended on the tendon model:
  - **22.8 ms** (damped elastic tendon) and **24.0 ms** (equilibrium elastic tendon);
  - **37.8 ms** for a rigid tendon, which also needed Vmax 9.86 instead of 5.3–5.5 L0/s and gave larger errors (4.5–20.9 % vs 3.0–8.9 %) [MODEL].
  - **Lesson:** a rigid-tendon model has to slow its activation to mimic contraction dynamics.
- **Venkadesan & Valero-Cuevas 2009** (FT): "Contraction dynamics refers to the dynamics of force generation in the muscle that depends on sarcomere mechanics and muscle plus tendon compliance". They chose T_con = 3·T_act.
- **Mayfield, Cronin & Lichtwark 2023** (FT): a Hill model with calcium-driven activation and a series elastic element (SEE), fitted to the human triceps-surae twitch (young men: CT 123.6 ± 8.6 ms, HRT 100.2 ± 17.2 ms).
  - Fitted values [MODEL]: pulse 4.8 ms; Ca²⁺ rise τ1 **42.2 ms**; Ca²⁺ removal τ2 **256 ms**; [a]50 0.1025; Hill coefficient 3; Vmax 6 L0/s; SEE strain 5 % at P0; series stiffness 3.33 P0/L0; L0 50 mm; series length 300 mm.
  - Sensitivity: series stiffness −30 % → twitch CT +13 %, force −9 %; +50 % → rise time −14 %, force +9 %.
  - "Lower tendon stiffness and slower intrinsic shortening speed slowed and prolonged force development in a compliance-dependent manner without affecting force decay."
  - **Note:** these Ca²⁺ constants act through a steep nonlinear (Hill n = 3) activation curve, so they are not directly comparable with first-order τ_act/τ_deact.
- **Mayfield, Cresswell & Lichtwark 2016** (ABS), in vivo human triceps surae, N = 15 [M]:
  - The series elastic element "was effectively stiffened by applying a 55 ms rotation to the ankle, through a range of 5 deg, at the onset of twitch" stimulation.
  - This increased twitch torque by 40–75 %, RTD by **124–154 %** and torque–time integral by 70–110 %, compared with constant-length contractions, "yet caused only modest reductions in shortening amplitude and velocity".
  - Authors' conclusion: tendon compliance changes "are likely sufficient to considerably alter contractile performance, particularly maximal RTD".

### 4.4 Step-excitation simulation of a Thelen-type Hill model [E, model simulation]

**Setup** (compiler's script; scratch file `sim/hill_step.py`):
- Muscle and tendon curves taken from OpenSim `Thelen2003Muscle`; Vmax 10 L0/s.
- Muscle–tendon length fixed so that the fibre sits at L0 at full activation.
- Gait2392 parameters:
  - soleus L0 5.0 cm, tendon slack 25 cm, pennation 25°
  - MG 6.0 / 39 cm, 17°
  - TA 9.8 / 22.3 cm, 5°
  - vastus lateralis (VL) 8.4 / 15.7 cm, 5°
- Excitation 0.01 → 1 for 1 s, then back to 0.01. Time step 20 µs (checked at 10 µs).
- **Not included:** foot, aponeurosis or dynamometer compliance, any cross-bridge state, subject-specific parameters. These are model outputs, not human data.

| Case (τ 15/50 ms, constant) | 10–90 % rise (ms), tendon strain at F0 3.3 % / 4.9 % | 90–10 % fall (ms), 3.3 % / 4.9 % |
|---|---|---|
| Rigid tendon (activation only, ≈ current actuator) | 33.0 (= τ·ln 9) | 109.8 |
| VL | 49.0 / 59.6 | 110.2 / 109.6 |
| TA | 53.6 / 67.4 | 110.0 / 109.2 |
| Soleus | 76.6 / 104.0 | 109.2 / 106.8 |
| MG | 102.6 / 145.2 | 106.6 / 102.2 |

Further results [E, model simulation]:
- **Activation-dependent τ (Thelen form):**
  - rigid 48 ms rise / 114 ms fall;
  - soleus 90.6 / 117.0 ms rise and VL 63.6 / 74.4 ms rise (tendon strain 3.3 / 4.9 %);
  - falls ≈ 120 ms.
- **Submaximal step 0.01 → 0.3 (constant τ):** soleus rise 81.6 / 111.4 ms; VL 47.0 / 58.4 ms. With the activation-dependent τ, the 90–10 % fall from a = 0.3 slows to ≈ 166–172 ms.
- **Onset:** time to 2 % of the force change was 3–7 ms in every case. Contraction dynamics do not create an EMD-like dead time.
- **Second-lag equivalent:** fitted as two first-order lags with τ1 = 15 ms, the second lag τ2 ≈ 14–20 (VL), 17–25 (TA), 29–43 (soleus) and 43–63 ms (MG).

**Reading:**
- With generic parameters, tendon compliance plus force–velocity multiplies the rise time 1.5–4.4× over activation alone, and leaves relaxation set by τ_deact.
- The model rise times (49–145 ms) are still shorter than the human lower bounds from evoked tetani (triceps surae ≥ 167–222 ms) and voluntary RTD (§2.2, §2.4). The simulation omits foot, heel-pad and aponeurosis compliance, which the in vivo measurements include.

### 4.5 Cross-bridge force redevelopment (k_tr) in human fibres

| Quantity | Value | Subjects/protocol | Source |
|---|---|---|---|
| k_tr at 15 °C, maximal Ca²⁺ | [M] **MHC I 2.10 ± 0.39 s⁻¹; MHC IIa 6.87 ± 1.50 s⁻¹** | VL fibres. 19 young (24 ± 3 y, 8 F), 21 older (77 ± 7 y, 7 F). No age or sex effect | Teigen et al. 2020 (FT) |
| k_tr at 15 °C, half-maximal Ca²⁺ | [M] MHC I 0.56 ± 0.16; MHC IIa 1.64 ± 0.49 s⁻¹ | Same | Same |
| k_tr at 15 °C, no added phosphate | [M] MHC II young 9.5 ± 1.4 s⁻¹; MHC I young 3.2 ± 0.5 s⁻¹ (± SE) | VL. 6 young (20–29 y), 6 old (73–89 y) men; 254 fibres | Sundberg et al. 2018 (FT) |
| k_tr at **30 °C**, MHC I | [M] **No added phosphate: 53.6 ± 7.5 (young), 51.4 ± 7.8 s⁻¹ (old)**. 4 mM phosphate: 68.7 / 64.4 s⁻¹. MHC II fibres "deteriorated too rapidly" at 30 °C | Same | Same |
| Implied Q10 and time constant | [E] 15 → 30 °C ×14–18 ⇒ Q10 ≈ 5.8–6.9. 1/k_tr at 30 °C ≈ **19 ms** (type I). Extrapolated to 37 °C: ≈ 180–210 s⁻¹ (≈ 5 ms). **Speculative**: Q10 usually falls at higher temperature | — | Arithmetic on Sundberg 2018 |
| Sinusoidal-analysis rates at 37 °C (not k_tr) | [M]/[E] 2πb (weak → strong binding) ≈ 135 s⁻¹ (MHC I), ≈ 237 s⁻¹ (IIA) at 37 °C vs ≈ 14 / 51 s⁻¹ at 25 °C. Q10 for 2πb 6.34 (I), 3.73 (IIA). Myosin attachment time 5.5 ms (I), 3.4 ms (IIA) at 37 °C | VL fibres, older adults (n = 13, 8 F, 65–80 y) | Momb et al. 2026 (FT) |

**Interpretation [E, compiler's inference].**
- At body temperature, cross-bridge force development is probably ≈ 5–20 ms, faster than the whole-muscle rise in vivo.
- The ≥ 100 ms whole-muscle rise is therefore more plausibly set by Ca²⁺/activation kinetics, series compliance and fibre shortening than by a separate cross-bridge state.
- No human k_tr above 30 °C was found.

---

## 5. D — Series elasticity

Joint-level conversions use K_joint = k_tendon · r² [E]. The moment arm r is stated in each row; where the paper did not give r, the compiler's assumed value is marked.

Moment arms grow from rest to MVC: Achilles +22–27 %, TA +33–44 %. When torque is used to derive tendon force (F = M/r), K_joint therefore scales roughly with r.

### 5.1 Achilles tendon / triceps surae tendon–aponeurosis

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Tendon + aponeurosis stiffness at 90–100 % of max force | [M] **Proximal 467, distal 494 N/mm**. Quadratic force–displacement fit (R² 0.98) | 5 men, 37 ± 3 y. Seated, knee extended, ankle neutral, 10 s ramp MVC. Corrected for ankle rotation (3.6°) and dorsiflexor coactivation. MVC 161 ± 11 N·m; Achilles force 3171 N (3255 N with coactivation correction); r = 51 ± 1 mm (MRI); CSA 78.1 mm² | Magnusson et al. 2001 (FT) |
| Max aponeurosis displacement | [M] 13.9 ± 1.6 mm raw → **10.7 ± 1.3 mm after rotation correction (−30 %)** | Same | Same |
| Strain / stress / modulus at max | [M] 4.4–5.6 % / 41.6 MPa / 1048–1474 MPa | Same | Same |
| Free tendon vs distal aponeurosis at 2641 ± 306 N | [M] Free tendon deformation 5.85 ± 0.85 mm (L0 74 mm, **strain 8.0 ± 1.2 %**). Aponeurosis 2.12 ± 0.64 mm (L0 145 mm, strain 1.4 ± 0.4 %). **Free-tendon stiffness 759 ± 132 N/mm**; stored energy 6.14 ± 1.89 J; E 788 ± 181 MPa | 5 subjects. Isometric plantarflexion | Magnusson et al. 2003 (ABS, re-checked after the parsing fix) |
| Free tendon (soleus MTJ → calcaneus) | [M] **2622 ± 534 N/mm**; 2.2 mm at 1924 N | 10 men | Kongsgaard et al. 2011 (ABS) |
| Whole Achilles tendon (MTJ → calcaneus) in hopping | [M] Stiffness IQR **145–231 N/mm**; E 0.67–1.07 GPa; peak strain 8.3 %; force–length "relatively linear"; hysteresis IQR 17–35 % | 10 men, one-legged hopping. Ultrasound + 3D motion, inverse-dynamics force | Lichtwark & Wilson 2005 (ABS) |
| Achilles tendon, 10–80 % MVC | [M] **193 ± 18 (fast, 120 % MVC/s) vs 207 ± 22 N/mm (slow, 21 % MVC/s)**, n.s. Elongation 13.0–14.3 mm at 80 % MVC. Hysteresis 5 ± 2 % (SE). No toe region above ≈ 0.3 kN preload | 14 (10 M/4 F), 36 ± 13 y, active | Peltonen et al. 2013 (FT) |
| MG tendon + aponeurosis, ramp MVC | [M] 25.6 ± 9.0 N/mm, **computed from MG force alone** (MG share k = 0.18; slope over 50–100 % MVC). L_max 24.2 mm (uncorrected for rotation) at MVC 106 N·m. Hysteresis 17.7–18.7 % | 8 untrained men, 21 y | Kubo, Kanehisa & Fukunaga 2002 (FT) |
| Kubo rescaled to whole-plantarflexor force | [E] ≈ 142 N/mm (25.6/0.18) | — | Arithmetic |
| Gastrocnemius tendon | [M] 1.7 mm (0.8 %) at 87.5 N → 11.1 mm (4.9 %) at 875 N. E 1.16 GPa. Hysteresis 18 ± 3 % | 6 men | Maganaris & Paul 2002 (ABS) |
| Achilles tendon and aponeurosis max strain | [M] 5.1 ± 1.1 % and 5.9 ± 1.6 % | 7 men | Muramatsu et al. 2001 (ABS) |
| Stiffness vs strength | [M] Tendon stiffness correlates with max tendon force, r = 0.817. Only sprinters had higher normalised stiffness | 66 young men (10 inactive, 28 endurance runners, 28 sprinters) | Arampatzis et al. 2007 (ABS) |
| Method dependence | Review: much of the variability between studies arises from ultrasound method | — | Seynnes et al. 2015 (ABS) |

### 5.2 Moment arms

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Achilles moment arm, rest | [M] 4.4 cm (−15° dorsiflexion) → 5.5 cm (+30° plantarflexion) | 6 active men, 28 y. MRI, knee 90° | Maganaris, Baltzopoulos & Sargeant 1998a (FT) |
| Achilles moment arm, MVC | [M] 5.4 → 7.0 cm. **+1–1.5 cm (22–27 %) vs rest**; multiply resting values by 1.22–1.27 | Same | Same |
| Achilles moment arm, other | [M] 51 ± 1 mm (Magnusson 2001, MRI); 4.3–5.6 cm at rest by two methods (Maganaris 2000) | — | FT / ABS |
| TA moment arm | [M] 36 ± 4 mm at neutral | 5 men | Maganaris & Paul 1999 (FT) |
| TA moment arm vs angle and contraction | [M] ≈ 4.5 → 2.9 cm from dorsiflexion to plantarflexion at rest. **+0.9–1.5 cm (33–44 %) at MVC** | 6 subjects | Maganaris 2000 J Biomech; Maganaris et al. 1999 Clin Biomech (ABS) |
| TA tendon excursion | [M] 46.5 ± 1.7 mm/rad | 5 men | Fukunaga et al. 1996 (ABS) |
| Patellar tendon moment arm (passive) | [M] ≈ 5.8–5.9 cm at full extension → ≈ 4.8 cm at 90° flexion | 7 men. Videofluoroscopy | Tsaopoulos et al. 2009 (ABS) |
| Patellar tendon moment arm, MVC vs rest | [M] +14–15 %; +6–26 % after correcting for knee rotation | 6 men | Tsaopoulos et al. 2007 (ABS) |

### 5.3 Joint-level series elasticity of the plantarflexors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Quick-release SEC stiffness | [M] **250–400 N·m/rad at 100 N·m**. Quadratic toe region, then linear; "K1 increases with the level of activation". SEC energy 23–37 J at 150 N·m, 31–57 J at 180 N·m | 12 subjects. Hydraulic quick release, standing | Hof 1998 (ABS) |
| Quick-release series elastic stiffness (SES) | [M] **506 ± 72 (voluntary) and 529 ± 125 N·m/rad (stimulated) at 100 N·m**, n.s. "did not reach an asymptote" up to near isometric max | n not in abstract | de Zee & Voigt 2001 (ABS) |
| Standing, relaxed calf (supported) | [M] **K_se = 0.77 ± 0.13 mgh** (range 0.62–0.94); 0.93 ± 0.41 mgh from origin–insertion displacement. Roughly constant with rotation size. mgh 11.0 ± 2.3 N·m/deg | 10 subjects. Normalisation: left-leg value × 2 over whole-body mgh | Loram, Maganaris & Lakie 2007b (FT) |
| Loram 2007b per leg | [E] 0.77 × 11.0 / 2 ≈ 4.24 N·m/deg ≈ **243 N·m/rad per leg** | — | Arithmetic |
| Intrinsic ankle stiffness, quiet stance | [M] **≈ 5 N·m/deg per leg = 91 % mgh (both legs)**. One-third of the compliance in the foot, two-thirds in the Achilles tendon and muscle | 15 (8 M), 20–68 y | Loram & Lakie 2002 (FT) |
| Loram & Lakie 2002 in N·m/rad | [E] ≈ 286 N·m/rad per leg including foot. Removing the foot's ⅓ share of compliance leaves ≈ 430 N·m/rad for the ankle–Achilles path | — | Arithmetic |
| Series elasticity caps standing stiffness | [M] SEC "limits maximal ankle stiffness to 92 ± 20 %" of mgh | 10 subjects, 25–49 y | Loram, Maganaris & Lakie 2005b (FT) |
| Intrinsic stiffness, 1° disturbances in stance | [M] 64 ± 8 % of critical stiffness (150 ms steps) | n not in abstract | Casadio, Morasso & Sanguineti 2005 (ABS) |
| Ultrasound-derived joint SEC near MVC (Magnusson 2001) | [E] k·r² = 467–494 N/mm × (0.051 m)² ≈ **1215–1285 N·m/rad**. ≈ 1480–1630 if the MVC moment-arm factor (×1.22–1.27) is applied | — | Arithmetic |
| Ultrasound-derived, Lichtwark / Peltonen | [E] ≈ 362–578 N·m/rad (Lichtwark 145–231 N/mm); ≈ 482–518 N·m/rad (Peltonen 193–207 N/mm). r = 0.05 m assumed [D] | — | Arithmetic |
| Free tendon only | [E] ≈ 1900 N·m/rad (Magnusson 2003, 759 N/mm); ≈ 6550 N·m/rad (Kongsgaard, 2622 N/mm). r = 0.05 m. **Not the whole SEC** | — | Arithmetic |
| SEC excursion at MVC | [E] Magnusson 2001: 10.7 mm / 51 mm ≈ 0.21 rad (12°), rotation-corrected. Kubo 2002: 24.2 mm / 50.6 mm ≈ 0.48 rad (27°), uncorrected | — | Arithmetic |

**Force dependence, plantarflexors (central reading):**
- ≈ 240–300 N·m/rad per leg at standing torques (≈ 5–30 N·m), foot included;
- ≈ 250–530 N·m/rad at 100 N·m (quick release, foot and heel pad included);
- ≈ 1200–1600 N·m/rad near MVC (ultrasound k·r², foot excluded).

The toe region matters. Constant series stiffness would overstate stiffness at low force or understate it at high force.

### 5.4 Fascicle shortening during "isometric" plantarflexion

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| GM, rest → MVC | [M] Fascicle 50.8 → 32.9 mm (−35 %); pennation 15.5 → 33.6°. "considerably slack" at rest | Ankle 110°. n not in abstract | Narici et al. 1996 (ABS) |
| Graded 0 → 100 % MVC, neutral ankle | [M] **GM 45 → 23.4 mm (−49 %); GL 74 → 35 mm (−53 %); soleus 35.4 → 30.2 mm (−15 %)**. Not corrected for ankle rotation | 6 untrained men, 28 y | Maganaris, Baltzopoulos & Sargeant 1998b (FT) |
| Rest → MVC vs angle | [M] Shortening is larger at longer fascicle lengths | 6 men | Kawakami, Ichinose & Fukunaga 1998 (ABS) |
| TA, voluntary | [M] Fascicles 90 → 76 mm; tendon elongation 15 mm; TA tendon 10 N/mm (0–20 N) → 32 N/mm (240–260 N) | 9 subjects | Ito et al. 1998 (ABS) |
| Force depression inside fixed-end contractions | [M] TA fascicles shorten against the compliant tendon as force rises, producing residual force depression. Lengthening the muscle–tendon unit during the rise cut fascicle shortening by 2.5 mm, lowered EMG by 3.9 % MVC and raised force by 3.7 % MVC at the same target level | n = 10, voluntary dorsiflexion | Raiteri & Hahn 2019 (ABS) |

### 5.5 Tibialis anterior / dorsiflexors

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| TA tendon stiffness | [M] **62 ± 12 N/mm (0–50 N) → 161 ± 26 N/mm at max**. Max tendon force 530 N, elongation 4.1 mm, strain 2.5 %. E 0.45 → 1.2 GPa | 5 men, 22 y. **Stimulated; max moment only 25 ± 3 N·m** | Maganaris & Paul 1999 (FT) |
| TA joint-level tendon stiffness | [E] 62–161 N/mm × (0.036 m)² ≈ **80 → 209 N·m/rad** | — | Arithmetic |
| TA tendon vs aponeurosis | [M] Tendon 1.3 → 4 mm; aponeurosis 3.7 → 12 mm at 20–100 % of max. Strain 0.8–2.5 % vs 2.1–7 % | 5 men | Maganaris & Paul 2000 J Exp Biol (ABS) |
| Dorsiflexor quick-release SES at 34 N·m | [M] **219 ± 54 (voluntary) vs 149 ± 54 N·m/rad (stimulated)**, significantly different. Voluntary MVC 66 ± 17 N·m vs stimulated TA max 34 ± 16 N·m | 8 subjects | de Zee & Voigt 2002 (ABS) |
| TA tendon hysteresis | [M] 19 % | 6 men | Maganaris & Paul 2000 J Biomech (ABS) |

### 5.6 Knee: patellar tendon and quadriceps tendon–aponeurosis

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Patellar tendon stiffness | [M] **4334 ± 562 (SEM) N/mm**; strain 6.9 %; E 1.09 GPa. The tibia moves 45 % of the tibia–patella displacement | n and force range not in abstract | Hansen et al. 2006 (ABS) |
| Patellar tendon, habitual loading | [M] **3494 ± 446 (non-lead) vs 4766 ± 716 N/mm (lead leg)** at a common force; E 2.16 vs 2.27 GPa | 7 elite fencers/badminton players | Couppé et al. 2008 (ABS) |
| Patellar tendon by sex | [M] **Men 1652 ± 216, women 1053 ± 108 N/mm** at the same force; strain 9.0 vs 10.6 % | 10 M (23.1 y), 10 F (21.3 y). Tibial displacement accounted for | Onambélé, Burgess & Pearson 2007 (ABS) |
| Patellar tendon, older adults | [M] **0–10 % force: 231.6 ± 105.6 N/mm (pre-training)**, 307 ± 111 (post). **90–100 % force: 2187 N/mm (pre)**, 3610 (post). Max 3346 N, 4.7 mm, 9.9 % strain | 18 adults, 67–74 y | Reeves, Maganaris & Narici 2003 (FT) |
| VL tendon–aponeurosis | [M] **11.6 ± 2.5 mm at 5834 ± 1341 N** after rotation correction (12.7 mm raw; correction 0.41 mm/deg) | 8 men | Bojsen-Møller et al. 2003 (ABS) |
| VL tendon–aponeurosis (Kubo method) | [M] ≈ 32 mm at MVC ≈ 220 N·m; 67 N/mm using VL force only (VL share 0.29); r = 44.1 mm (estimated). Uncorrected for rotation | 8 untrained men, 22.6 y | Kubo, Kanehisa & Fukunaga 2001 (FT) |
| Patellar tendon joint-level | [E] 3494–4766 N/mm × (0.048 m)² ≈ **8000–11000 N·m/rad**. Onambélé men ≈ 3800; Reeves low-force ≈ 530–710 | r = 0.048 m assumed [D] | Arithmetic |
| Quadriceps SEC (tendon–aponeurosis) | [E] Bojsen-Møller: secant 5834/11.6 ≈ 503 N/mm → ≈ **1160 N·m/rad**; excursion ≈ 14°. Kubo: ≈ 450 N·m/rad, but its 42° excursion is uncorrected and implausibly large | r = 0.048 m | Arithmetic |
| Hamstrings | No in vivo stiffness values found. Kellis 2016 reports strains only (biceps femoris long head and semitendinosus tendon/aponeurosis; 40 participants) | — | Kellis 2016 (ABS) [gap] |

### 5.7 Caveats for D

1. **Achilles stiffness spans ≈ 10× across methods.**
   - Whole tendon from the MTJ: 145–231 N/mm (Lichtwark & Wilson), 193–207 N/mm (Peltonen).
   - Tendon + aponeurosis near MVC: 467–494 N/mm (Magnusson 2001).
   - Free tendon: 759 N/mm (Magnusson 2003) and 2622 N/mm (Kongsgaard).
   - The drivers are tracking site, force range, rotation correction and moment arm (Seynnes 2015).
   - Kubo's N/mm values use a single muscle's share of force and are not comparable.
2. **Quick release gives ≈ ⅓–½ of the ultrasound k·r² value near MVC.**
   - Quick release includes foot, heel pad, footplate and any contractile compliance. It is the closest measure to the *lumped* series spring a joint actuator sees.
   - Hof finds K rising with activation; de Zee & Voigt find it depends on moment only.
3. **The knee is aponeurosis-dominated.**
   - The patellar tendon alone (≈ 3.5–4.8 kN/mm) is ≈ 7–10× stiffer than the VL tendon–aponeurosis path (≈ 0.5 kN/mm secant).
   - Using patellar tendon stiffness as the knee SEC would overstate series stiffness by roughly an order of magnitude.
4. **"Isometric" contractions are not isometric.** Ankle rotation accounts for ≈ 30 % of raw aponeurosis displacement at the ankle (Magnusson 2001) and ≈ 9 % at the knee (Bojsen-Møller 2003).

---

## 6. E — Short-range stiffness (SRS) and its time course

### 6.1 Magnitude, proportionality to force, elastic limit (animal and fibre data)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Whole-muscle SRS (including tendon) vs tension | [M, cat] **Soleus 0.6–1.0 N/mm per N mean tension; lateral gastrocnemius 0.5–0.9 N/mm per N**. Roughly proportional to tension | 14 cats in situ, rectal temperature 36–38 °C. Tetanised soleus (n = 11) and LG (n = 3). Lengthening ≥ 10 mm/s | Rack & Westbury 1974 (FT, scanned) |
| SRS of the contractile part (tendon-corrected) | [M, cat] **1.1–1.5 N/mm per N** = "35–50 % increase in force per 1 % extension of the soleus fibres". Assumes 33 mm fibres and tendon compliance 0.05 mm/N | Same | Same |
| Same in Cui's γ notation (K = γ·F/l_F) | [E] γ ≈ 36–50 at fibre level (1.1–1.5 × 33 mm); ≈ 20–33 at muscle–tendon level | — | Arithmetic on Rack & Westbury |
| Velocity dependence | [M, cat] SRS is velocity-independent above ≈ 8 mm/s (soleus) and ≈ 10 mm/s (LG), lower when slower. The *range* of SRS grows with speed | Same | Same |
| Extent of SRS (elastic limit) | [M, cat] Up to **1.4 mm** of muscle–tendon stretch in rapid alternating movements, of which ≥ 0.6 mm is tendon. The fibre part (0.8 mm) is **2–3 % fibre strain**. About half that distance when starting from isometric; ≈ 0.6 mm in slow (5 mm/s) movement | Same | Same |
| SRS–force model | [MODEL fitted to cat data] **K = γ·F/l_F with γ = 23.4** (jackknife 24.1 ± 2.4), with tendon + aponeurosis modelled separately (E = 522 MPa). Error 12.9 ± 12.3 % overall (EDL 26 %, others 5.1 ± 1.9 %) | 6 cat hindlimb muscles. 100 Hz tetanus. 2 mm ramps at 100 mm/s; slope before yield | Cui, Perreault, Maas & Sandercock 2008 (FT) |
| Fibre-derived SRS constant | [MODEL from fibre data] **γ = 280**, δ = 5.7×10⁻³ (from 0.208 P0 per nm/half-sarcomere and 7.7 nm). The authors note this is "about ten times higher" than the whole-muscle value. Cui's γ could not reproduce inverse-dynamics ankle torques | 2 men (34, 24 y). Platform translations, 0–50 ms | De Groote, Allen & Ting 2017 (FT) |
| Critical stretch, active fibres | [M, rabbit psoas] **7.7 ± 0.1 nm/half-sarcomere**, velocity-independent. Force at that point rises with velocity to 1 L/s, then plateaus at 3.26 ± 0.06 P0. Temperature [UNVERIFIED] | Glycerinated fibres | Getz, Cooke & Lehman 1998 (ABS) |
| Elastic limit, active rabbit psoas | [M] First 0.005 L0. Initial stiffness scales with developed tension | Permeabilised fibres, pCa 6.3–4.5 | Campbell & Moss 2000 (ABS) |
| Elastic limit and yield, cat fibres | [M] SRS measured over the first 0.5 % L; yield beyond ≈ 1 % of muscle length at 0.5 L/s. Type I fibres stiffer and yield more | Skinned soleus, vastus intermedius and LG fibres | Malamud, Godt & Nichols 1996 (ABS) |
| Elastic limit, relaxed | [M] ≈ 0.2 % muscle length (frog, Hill 1968); ≈ 0.4 % L0 (frog fibres, Campbell & Lakie 1998) | — | ABS |
| Slow vs fast motor units | [M, cat] Stiffness–tension slope **2.5× steeper for slow (S) than fast-fatigue-resistant (FR) units**. A second ramp reduces initial stiffness by 20–60 % | Cat peroneus longus | Petit et al. 1990b (ABS); 1990a (ABS) |
| Natural vs synchronous recruitment | [M, cat] Small, non-significant difference in MG SRS | 8 cats | Cui, Perreault & Sandercock 2007 (ABS) |
| Low firing rates | [M, cat] At 5–15 pulses/s, tension rises early in a stretch then falls (yield), often below isometric | Cat soleus | Joyce, Rack & Westbury 1969 (ABS) |

### 6.2 Does stiffness track force during force development and relaxation?

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Lead during tetanus rise | [M, frog] Roughly constant **lag of tension behind stiffness, 11–16 ms**; ≈ 10 ms from first stiffness rise to first tension | Frog TA fibres, **0.8–2.5 °C** | Ford, Huxley & Simmons 1986 (ABS) |
| Lead on rise, lag in relaxation | [M, frog] "fiber stiffness led tension (t½ lead **20 ms** at 4 °C) during the tetanus rise and **lagged during the isometric phase of relaxation**" | Intact frog fibres, 4 °C | Cecchi et al. 1991 (ABS); also 1982, 1984, 1986 (ABS) |
| Twitch | [M, frog] Stiffness develops faster than force. Twitch stiffness reaches 0.82 ± 0.07 of tetanic (6 °C). **Force falls faster than stiffness** during relaxation | Frog bundles, 6 and 26 °C | Schoenberg & Wells 1984 (ABS) |
| Mammalian slow vs fast muscle | [M, cat] "The stiffness of the slow-twitch soleus muscle (but not of the fast plantaris muscle) reaches a maximum **after** the peak in twitch tension" | Cat in situ; temperature not in abstract | Stein & Parmiggiani 1979 (ABS) |
| Counter-evidence | [M, frog] With a ramp method insensitive to inertia and viscosity, "the development of stiffness upon stimulation is **synchronous** with the development of force". Later work: relative stiffness "deviates from direct proportionality less than previously reported" | Frog fibres | Bagni et al. 1998 (ABS); 1999 (ABS) |
| Non-cross-bridge stiffness on activation | [M, frog] A "static" stiffness rise in the latent period is not abolished by BDM (a myosin inhibitor). An extra, cross-bridge-insensitive elasticity appears on activation | Frog | Bagni et al. 1994 (ABS); Colombini et al. 2010 (ABS) |
| Human fatigue | [M] Ankle stiffness (Hunter & Kearney, TA, n = 4) and elbow pre-reflex stiffness (Kirsch & Rymer, n = 7) are unchanged at matched torque despite a large EMG rise. **Stiffness follows developed torque, not activation/EMG** | Human | Hunter & Kearney 1983 (ABS); Kirsch & Rymer 1992 (ABS) |
| Human ankle, rapid voluntary contraction | [M] Low-frequency stiffness gain fell during the transient phase; not described by a stationary second-order model | Ensemble identification | MacNeil, Kearney & Hunter 1992 (ABS) |
| Human knee, reciprocal isometric transitions | [M] Stiffness fell from 1.5–2× passive to **below 0.5× passive** at flexion↔extension switches | 3 men, 29–33 y. PRBS 0.06 rad, 0.15 s switching, 2 s alternation | Ludvig & Perreault 2014 (FT) |
| Human knee, volitional movement | [M] Stiffness below passive "at the onset of flexor muscle relaxation". Movement stiffness 21 ± 2 N·m/rad (73 % of resting passive) below torque- and position-matched isometric. [E] Passive ≈ 29 N·m/rad | 13 (9 M), 23–33 y | Ludvig et al. 2017 (FT) |

### 6.3 History dependence (thixotropy) and recovery

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Relaxed human calf elastic limit | [M] "Shoulder" after **1.0–1.3°** ankle rotation ≈ **0.6 % of triceps surae resting length**. Shoulder torque 0.67 ± 0.22 N·m | 11 subjects. Seated, knee 90°, 1–40°/s | Hufschmidt & Schwaller 1987 (FT, scanned) |
| Recovery after a stretch–release cycle | [M] k = 0.291 ± 0.099 s⁻¹ (n = 11; second group 0.235 ± 0.093, n = 5). [E] τ ≈ 3.4 s | Same | Same |
| Decay of the shoulder with latency from movement onset | [M] k = 5.5 s⁻¹ (τ ≈ 0.18 s) | 5 subjects | Same |
| Active fibres, recovery | [M, rabbit] ≈ 1 s⁻¹. Relative reduction independent of pCa | Permeabilised psoas | Campbell & Moss 2000 (ABS) |
| Rat soleus fibres | [M] Stiffness and tension recovery rates increase with Ca²⁺ | Permeabilised | Campbell & Moss 2002 (ABS) |
| Human wrist | [M] Only the first passive movement after rest shows clear SRS; agitation reduces it | — | Axelson & Hagbarth 2001 (ABS) |

### 6.4 Joint level: SRS in series with tendon (human ankle in stance)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Active stance, intrinsic stiffness | [M] Left leg **5.2 ± 1.2 N·m/deg** standing (4.7 ± 1.0 balancing a pendulum); both legs ≈ 91 % mgh. "As ankle torque is increased from 5 to 25 N m, the mean ankle stiffness rises from 5 to 6 N m deg⁻¹". [E] 5.2 N·m/deg ≈ 298 N·m/rad | 15 subjects. 0.055° raised-cosine, 140 ms | Loram & Lakie 2002 (FT) |
| Passive standing calf, amplitude dependence | [M] Chord stiffness falls from **101 ± 9 % to 19 ± 5 % mgh** (left leg 5.6 ± 1.4 → 1.0 ± 0.4 N·m/deg) over 0.03–7°, a power law. Short-range 67 ± 10 % (0.15°), 54 ± 12 % (0.4°); long-range 13 % | 10 subjects (7 F), 26 ± 12 y | Loram, Maganaris & Lakie 2007a (FT) |
| Contractile vs series-elastic stiffness | [M] **K_ce/K_se = 17 ± 11 at 0.13°, 12 ± 9 at 0.15°, 6.3 ± 10 at 0.4°**, falling to ≈ 1 beyond ≈ 1°. Transition ≈ 0.5° (≈ 300 µm contractile displacement). "the tendon, not the muscle provides the weakest series link" | Ultrasound, passive calf | Loram, Maganaris & Lakie 2007b (FT) |
| Active stance vs torque | [M] Stiffness rose ≈ 30 % per step: **53 → 66 → 81 % mgh at 4.9 ± 2.4 → 16.4 ± 4.7 → 31 ± 5.7 N·m**. 0.1° vs 0.7°: 82 vs 51 %. Passive 15° toes-up tilt (+4.8 N·m, stretching the Achilles): 50 → 77 % (0.7°) and 77 → 109 % (0.1°) | 2 × 10 subjects. < 0.7°, 140 ms. Whether torques are per leg [UNVERIFIED] | Sakanaka, Gill, Lakie & Reynolds 2018 (FT) |
| Short- vs long-range stiffness | [M] 0.2°: 94.1 ± 21.6 % mgh; 0.9°: 57.9 ± 12.3 % mgh (first 70 ms) | 19 subjects | Sakanaka, Lakie & Reynolds 2021 (FT) |
| Amplitude dependence (40 ms ramps, 0.005–0.08 rad) | [M] Intrinsic ankle–foot stiffness **0.93 ± 0.09 → 0.44 ± 0.06 mgh** | Standing | Vlutters et al. 2015 (ABS) |

### 6.5 Isolated joints (non-stance): stiffness vs torque

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Ankle, rest to MVC | [M] Stiffness **proportional to mean torque**, rising more than 10-fold; damping ratio almost invariant. Slope not in abstract [UNVERIFIED] | Supine, stochastic perturbations | Weiss, Hunter & Kearney 1988 (ABS) |
| Ankle vs torque and amplitude | [M] K and B rise with mean torque (inertia constant) and fall with perturbation amplitude | n = 5 | Hunter & Kearney 1982; Kearney & Hunter 1982 (ABS) |
| Dorsiflexors, intrinsic | [M] Intrinsic stiffness under nerve stimulation (7–50 Hz) linear in torque, **≈ 0.5 → 2.5 N·m/deg at 80 % MVC** ([E] ≈ 29 → 143 N·m/rad). Reflex part 0.5–1.5 N·m/deg at 30–50 % MVC. Higher at 1° than at 2–7° (attributed to SRS) | 14 subjects | Sinkjaer et al. 1988 (ABS) |
| Plantarflexors | [M] Slope **4.30 ± 0.34 N·m/rad per N·m** | Prone, knee 90°, 20–60 % MVC. 0.2 rad (≈ 12°) stretch, first 62 ms. Well beyond SRS | Blanpied & Smidt 1992 (ABS) |
| Plantarflexors, time-varying | [M] Max intrinsic elasticity per subject 18.2–174.1 N·m/rad over a 0–40 % MVC sine; monotonic with activation | 5 (1 F), 26–33 y. MVC 26–79 N·m. 0.05 rad perturbations | Golkar, Sobhani Tehrani & Kearney 2017 (FT) |
| Arm test of the SRS model | [MODEL vs M] SRS with γ = 23.4 explained endpoint stiffness: variance accounted for 98 ± 2 / 91 ± 4 / 82 ± 12 % (orientation / shape / area). Force–length-slope models underestimated it | ≤ 30 % MVC, ≈ 2–3° perturbations | Hu, Murray & Perreault 2011 (FT) |

### 6.6 Implications for a joint-level SRS (compiler's synthesis [E])

- **SRS is immediate and elastic.** It is velocity-independent above a few mm/s (cat). It acts until ≈ 0.5–1 % fibre strain from an isometric start, or 2–3 % in alternating movement, and then yields.
- **At the ankle, SRS is in series with the SEC.**
  - At small rotations (≤ 0.4°) the contractile element is 6–17× stiffer than the SEC. Joint stiffness ≈ K_SEC ≈ 0.77–0.93 mgh, only weakly torque-dependent at ≤ 0.1° (Loram & Lakie 2002).
  - With larger rotations and higher torque the joint becomes torque-proportional (Sakanaka 2018; Weiss 1988; Blanpied & Smidt slope 4.3 rad⁻¹).
  - Series combination: K_joint = K_SRS·K_SEC/(K_SRS + K_SEC), with both terms force-dependent.
- **SRS should scale with *developed* force, not with commanded activation.** Supporting evidence: Hunter & Kearney 1983; Kirsch & Rymer 1992; Cui 2008. On the rise, stiffness may lead force slightly; ramp methods find the two nearly synchronous. No mammalian 37 °C measurement of the lead was found.
- **In relaxation the data conflict.**
  - Frog fibres and cat soleus: stiffness outlasts force.
  - Human knee: stiffness drops below passive at relaxation onset. Possible confounds: reflex withdrawal, 0.06 rad perturbations beyond SRS, n = 3.
- **Elastic-limit angle at the human ankle:** ≈ 0.5° active in stance (Loram 2007b) and 1.0–1.3° relaxed seated (Hufschmidt & Schwaller 1987).

---

## 7. F — Eccentric behaviour, muscle history and energy

### 7.1 Residual force enhancement (RFE) after active stretch, humans in vivo

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Steady-state RFE, adductor pollicis (thumb) | [M] Protocol 1: 16 ± 3 % (voluntary), 17 ± 2 % (stimulated). Protocol 2: 12 ± 3 / 17 ± 2 %. Measured 2.5–3 s after stretch | n = 12. 10–30° stretch at 10–60°/s | Lee & Herzog 2002 (FT) |
| Peak force during stretch | [M] 138–149 % of isometric | Same | Same |
| Time for post-stretch force to settle | [M] "about 1.5–2 s" | Same | Same |
| Passive force enhancement | [M] Persists after deactivation ("long lasting"); grows with stretch amplitude; speed-independent | Same | Same |
| RFE, plantarflexors and dorsiflexors | [M] **Plantarflexors 7 % (voluntary), 13 % (stimulated); dorsiflexors 12 % (voluntary)** | ≈ 25 % activation held by EMG feedback. 15° at 15°/s. Measured 9–10 s after stretch | Pinniger & Cresswell 2007 (ABS) |
| RFE time course, dorsiflexors at MVC | [M] Young: **17.1 ± 4.4 % (1 s), 11.2 (2 s), 8.6 (3 s), 7.1 (4 s), 6.4 (5 s), 6.9 ± 3.9 % (6 s)**; steady-state mean 8.4 ± 5.0 %. Old: 37.8 → 22.4 %. Passive force enhancement ≈ 20 % (young) and 37 % (old) of RFE | 10 young men (26.1 ± 2.7 y), 10 old (76 y). 30° at 15°/s | Power, Rice & Vandervoort 2012 (FT) |
| Knee extensors at MVC | [M] No significant active RFE; small significant passive enhancement (Hahn 2007). **5–10 %** (Seiberl 2010). **4–13 % (short), 7–20 % (long length)**, same in young and old (Power 2013) | n = 15 / 18 / 11 + 11 | Hahn, Seiberl & Schwirtz 2007 (ABS); Seiberl et al. 2010 (ABS); Power et al. 2013 (FT) |
| Leg press | [M] At MVC: 10.5–12.3 % at 0.5–1 s, 4.3–7.4 % at 2.5–3 s (n = 22). At 30 % activation: 3–22 %, present up to 22 s (n = 13). At walking-like angles: up to 24.8 ± 32.5 % in 8 of 13 subjects, none in 5 | — | Hahn et al. 2010; Seiberl et al. 2013; Paternoster et al. 2016 (ABS) |
| Submaximal voluntary, adductor pollicis | [M] Consistent RFE in **8/17 subjects at 30 % MVC, 4/12 at 10 %, 10/12 at 60 %**. Grows with activation; none after passive stretch | — | Oskouei & Herzog 2005, 2006a, 2006b (ABS) |
| Stretch–shortening cycle, adductor pollicis | [M] RFE 16 % after stretch; force depression 9–15 % after pure shortening; 10 % RFE remains after stretch then shortening | n = 14, stimulated | Seiberl, Power, Herzog & Hahn 2015 (ABS) |
| Abolition | RFE "can be abolished instantaneously if activation of the muscle is interrupted for long enough for the force to drop to zero" | Review statement | Herzog 2018 (FT-W) |
| Energy cost after stretch | [M, rabbit psoas, skinned] ATP per unit force −17.2 ± 4.1 % | — | Joumaa & Herzog 2013 (ABS) |

### 7.2 Force depression (FD) after active shortening

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| FD, adductor pollicis, stimulated | [M] Up to **37 ± 2 % (SEM)** after 38° at 6.1°/s. Rises with distance (r² > 0.98), falls with speed, scales with force during shortening | 7 men. 50 and 20 Hz | De Ruiter et al. 1998 (FT) |
| FD recovery | [M] Largely abolished by **≈ 200 ms of relaxation**: "only 27.2 ± 5.5 % of the deficit remained after the stimulation was interrupted for between 203 and 2400 ms" | Same | Same |
| FD, adductor pollicis, voluntary and stimulated | [M] 9.9 / 15.6 / 22.4 % after 10 / 20 / 30° of shortening; 27.1 / 19.3 / 15.6 % at 20 / 60 / 300°/s. Stiffness in the depressed state 5.9 vs 7.2 N/deg isometric | 12, 28 ± 5 y | Lee & Herzog 2003 (ABS) |
| FD at 30 % voluntary effort | [M] Force −20 %, or +18 % EMG needed to match force | Adductor pollicis | Rousanoglou, Oskouei & Herzog 2007 (ABS) |
| FD, plantarflexors, stimulated | [M] 87.1 ± 9.1 % (long) and 92.1 ± 7.8 % (short) of isometric at 4.9 s, i.e. ≈ 8–13 % FD | 11 men | Fukutani, Misaki & Isaka 2017 (ABS) |
| FD inside fixed-end contractions | [M] See §5.4 (Raiteri & Hahn 2019) | — | — |

### 7.3 Energy during active lengthening

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Fate of work done on stretched active muscle | [M, amphibian] "no significant part of the work remains as mechanical (elastic) energy after the muscle has relaxed". For a stretch during relaxation, the "whole of the work … reappears as heat" | Twitch / short tetanus | Abbott, Aubert & Hill 1951 (ABS) |
| Net absorption threshold | [M, frog fibres 0.8–1.8 °C] Heat output equals work done at ≈ 0.34 L0/s; net absorption only above ≈ 0.35 L0/s | — | Linari, Woledge & Curtin 2003 (FT-W) |
| Maximum absorption | [M] 0.092 ± 0.002 P0·L0 at 1.64 L0/s, "more than half of the work done on the fibre" | n = 8 | Linari et al. 2003 (ABS) |
| Elastically storable share | [E, authors' estimate] ≈ 34 % of the maximum absorbed | — | Linari et al. 2003 (ABS) |
| What happens to stored energy | [M, ≈ 1 °C] Released as heat, fast exponential τ ≈ 40 ms; "by about 200 ms after the end of stretch all the energy that had been stored has been released as heat". Shorter at 37 °C is expected but not measured | — | Linari et al. 2003 (FT-W) |
| Tendon energy return | Review: tendons "return 90–97 % of any energy they absorb"; dissipate "< 10 %" | — | Roberts & Konow 2013 (FT) |
| Tendon buffering of muscle energy dissipation | [M, wild turkey LG, landing] Force rise 58 ± 26 ms with near-isometric fascicles (0.6 ± 1.9 % L0); force decay 164 ± 52 ms with fascicles lengthening 25 ± 11 % L0. Energy passed to the muscle ≈ 2.4× more slowly | In vivo | Konow, Azizi & Roberts 2012 (FT) |
| Human TA fascicles in lengthening | [M] Negligible fascicle length change; the tendon takes the stretch | Voluntary isokinetic | Reeves & Narici 2003 (SEC via Roberts & Konow 2013) |
| Achilles energy return in hopping | [M] 38 J = 16 % of 254 J hop work | 10 men | Lichtwark & Wilson 2005 (ABS) |
| Human joint-level split between muscle-stored and tendon-stored eccentric work | Not found [gap] | — | — |

### 7.4 Tendon hysteresis (energy lost per load–unload cycle)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Sheep plantaris, in vitro | [M] ≈ 7 %; frequency-independent 0.22–11 Hz | — | Ker 1981 (ABS) |
| Ten mammalian species, in vitro | [M] 6–11 %; "lower values are probably the most reliable" | — | Bennett, Ker, Dimery & Alexander 1986 (ABS) |
| Human TA tendon, in vivo | [M] **19 %** | 6 men | Maganaris & Paul 2000 J Biomech (ABS) |
| Human gastrocnemius tendon, in vivo | [M] 18 ± 3 % | 6 men | Maganaris & Paul 2002 (ABS) |
| MG tendon + aponeurosis, in vivo | [M] 17.7 ± 9.2 and 18.7 ± 10.3 % (n = 8); 22.2 ± 8.8 % (range 9.7–37.2, n = 19); men 18.7 ± 8.5 vs women 11.1 ± 5.9 %; 20.6 → 13.5 % after 10 min static stretching | Ramp to MVC and ramp relaxation (5 s up / 5 s down) | Kubo et al. 2002 J Physiol (FT); 2002 SJMSS, 2003, 2001 (ABS) |
| VL tendon + aponeurosis | [M] 16.5 ± 7.1 % (gastrocnemius 17.4 ± 4.4 %) | 8 men, 24 ± 4 y | Kubo et al. 2004 (ABS) |
| Achilles tendon, hopping | [M] IQR 17–35 % (Lichtwark & Wilson 2005); 17 ± 12 % (Farris 2011) | 10 men | ABS |
| Achilles tendon, isometric, loading and unloading times matched | [M] **5 ± 2 % (SE)**, range −7 to 21 % (0.589 s loading vs 0.588 s unloading) | 14, 36 ± 13 y | Peltonen et al. 2013 (FT) |
| Effect of relaxation time | [M] 50.3 % (0.3 s), 41.0 % (0.5 s), 40.4 % (0.7 s); no difference between 1 and 5 s | 17 men, 23 y. Gastrocnemius tendon | Sasajima et al. 2023 (FT) |
| Critique | Large in vivo loops come largely from method: unmatched unloading rate, relaxation control, aponeurosis inclusion, estimated force | Viewpoint | Finni et al. 2013 (SEC); Peltonen 2013 (FT) |

### 7.5 In vivo eccentric force–velocity (relevant to how much extra force an active muscle offers under imposed stretch)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Knee extensors, tetanic stimulation (45–60 % of voluntary isometric) | [M] Eccentric torque reaches 1.4× isometric by 1.57 rad/s and then plateaus. Voluntary eccentric not above isometric | 8 untrained, 28 y | Dudley et al. 1990 (ABS) |
| Knee extensors, stimulation superimposed | [M] Eccentric torque 21–24 % above voluntary | 9 trained men | Westing, Seger & Thorstensson 1990 (ABS) |
| Knee extensors, quick stretch | [M] Peak eccentric (% MVC) = 1.44 × pre-activation + 7.08 (r = 0.99); extrapolates to 151 % MVC | 30 men. 12° step at 100°/s, 1.7–95 % MVC | Webber & Kriellaars 1997 (ABS) |
| Adductor pollicis, 80 Hz | [M] 137.3 ± 1.5 % of isometric at 152.8°/s | 8 women, skin 36 °C | de Ruiter et al. 2000 (FT-W) |
| Dorsiflexors at MVC | [M] Eccentric 147.8 ± 12.9 % of isometric at 15°/s (young) | n = 10 | Power et al. 2012 (FT) |
| Soleus, 30 % EMG-matched voluntary | [M] Lengthening torque not different from isometric at any speed | 7 subjects (with peroneal block) | Pinniger, Steele & Cresswell 2003 (ABS); Pinniger et al. 2000 (ABS) |
| Voluntary activation, quadriceps | [M] Lengthening 79 ± 8 % vs isometric 93 ± 5 % (60°/s); eccentric 88.3 % vs isometric 95.2 % (20°/s) | n not in abstract / 8 men | Beltman et al. 2004; Babault et al. 2001 (ABS) |

---

## 8. G — Knee: parameters for a second joint

This section consolidates knee values from §2–§7 and adds intrinsic knee stiffness.

### 8.1 Timing (quadriceps and hamstrings)

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Quadriceps twitch TPT / HRT | [M] 94 ± 12 / 97 ± 32 ms at rectal 37 °C; 76 / 65 ms at 39 °C | 10 (5 F/5 M), 35.6 y | Gordon et al. 2023 (FT) |
| Quadriceps twitch TPT | [M] 79–82 ms (resting), 79 ms (potentiated); twitch EMD 10–11 ms | 23 men, 22 y | Jones et al. 2017 (FT) |
| Quadriceps TPT vs fibre type | [M] 61 ± 12 ms (72 % type II) vs 86 ± 7 ms (39 % type II) | 2 × 4 men | Hamada et al. 2000 (ABS) |
| Quadriceps octet TPT / HRT | [M] 147 / 78 ms (Gordon); 117–127 ms TPT (Jones); 112–137 / 174–208 ms (Tillin) | See §2.2 | FT |
| Quadriceps voluntary torque-time course | [M] 12 / 46 / 67 % MVT at 50 / 100 / 150 ms (Tillin 2012); 23 / 60 / 79 % at 50 / 100 / 150 ms [E] (Buckthorpe 2013) | See §2.4 | FT |
| Quadriceps EMD | [M] Evoked 10–17 ms; voluntary 18.5–22.6 ms (low-noise rigs) or 38.7–49.7 ms (standard dynamometers) | See §2.3 | FT/ABS |
| Hamstrings EMD, voluntary | [M] 44.0 ms (quadriceps 22.6 ms in the same subjects) | 20 untrained men | Hannah et al. 2014 (ABS) |
| Vasti NMD | [M] 175.8 ± 44.1 ms (10 % MVC) → 121.6 ± 34.6 ms (70 % MVC) | 13 men | Krätschmer et al. 2025 (FT) |
| Hamstrings twitch TPT / HRT | [M] 95.8 ± 41.6 / 85.6 ± 50.8 ms (partial recruitment; low confidence) | 11 men, 26 y | Kirk et al. 2018 (FT) |
| Hamstrings force–frequency | [M] Half-maximal force at 18 Hz; fused at 40–50 Hz | 5 young | Kirk et al. 2018 (FT) |

### 8.2 Series elasticity (see §5.6)

| Measure | Value | Source |
|---|---|---|
| Patellar tendon | [M] 1652 (men) / 1053 (women) N/mm (Onambélé 2007); 3494–4766 N/mm (Couppé 2008); 4334 N/mm (Hansen 2006); older adults 232 N/mm at 0–10 % force → 2187 N/mm at 90–100 % (Reeves 2003) | ABS / FT |
| VL tendon–aponeurosis | [M] 11.6 ± 2.5 mm at 5834 ± 1341 N (Bojsen-Møller 2003) → [E] secant ≈ 503 N/mm ≈ **1160 N·m/rad** (r = 0.048 m) | ABS / [E] |
| Patellar tendon moment arm | [M] ≈ 5.8–5.9 cm (extended) → 4.8 cm (90°); +6–26 % at MVC | Tsaopoulos 2007/2009 (ABS) |
| Hamstring tendon stiffness | Not found [gap] | — |

### 8.3 Intrinsic knee stiffness at low activation

| Measure | Value | Subjects/protocol | Source |
|---|---|---|---|
| Active knee stiffness vs torque | [E, read from Fig. 4, ± ≈ 10 %] Extension ≈ 100–120 N·m/rad at ≈ 18 N·m; ≈ 170–210 at 30–35 N·m; ≈ 230–310 at 45–57 N·m. Flexion ≈ 45–50 at −8; ≈ 80–90 at −17; ≈ 100–160 at −25 to −35 N·m. **Slope ≈ 5–6 (extension) and 4–6 (flexion) N·m/rad per N·m** | 5 men, 27–31 y. Knee 60° flexion. Stochastic 0.5° SD perturbations at 10/20/30 % MVC | Pfeifer et al. 2012 (FT) |
| SRS-model prediction (knee) | [MODEL] SRS model with Cui-scaled tendon (toe region) was 7.3 ± 14.1 % below experiment; the tendon model strongly affected the prediction | Same | Pfeifer et al. 2012 (FT) |
| Knee resonance | [M]/[E] ≈ 1.5 Hz passive → ≈ 4 Hz at 30 % MVC, i.e. K ×≈ 7 at constant inertia | Same | Pfeifer et al. 2012 (FT) |
| Amplitude effect (0.5 → 2.5° SD) | [M] Stiffness fell by 27.0 ± 17.2 (flexion) and 53.9 ± 13.2 (extension) N·m/rad at 10 % MVC; passive fell 27.9 ± 5.9 N·m/rad | Same | Same |
| Relaxed to 50 % MVC | [M] Damping ratio ≈ 0.2 throughout while natural frequency more than doubled ([E] K > 4×). Quadriceps stiffness highest at 30° flexion, flexors at 90°; passive stiffness highest at full extension. No absolute values in abstract [UNVERIFIED] | Small random perturbations | Zhang et al. 1998 (ABS) |
| Passive knee stiffness at rest | [E] ≈ 29 N·m/rad (21 N·m/rad = 73 % of passive) | 13 subjects | Ludvig et al. 2017 (FT) |
| Knee stiffness during reciprocal activation | [M] Drops below 0.5× passive at flexion↔extension switches | 3 men | Ludvig & Perreault 2014 (FT) |

### 8.4 History and energy at the knee

| Measure | Value | Source |
|---|---|---|
| RFE, knee extensors at MVC | [M] Disputed: none active (Hahn 2007); 5–10 % (Seiberl 2010); 4–20 % (Power 2013) | ABS / FT |
| FD, knee extensors, voluntary | [M] Present; independent of distance and speed (unlike stimulated). Magnitudes not in abstracts [UNVERIFIED] | Lee, Suter & Herzog 1999/2000 (ABS) |
| VL tendon–aponeurosis hysteresis | [M] 16.5 ± 7.1 % | Kubo et al. 2004 (ABS) |
| Patellar tendon hysteresis in vivo | Not found [gap] | — |
| Eccentric/isometric, knee extensors | [M] Stimulated 1.4× (plateau above 1.57 rad/s); voluntary ≈ 1.0×; voluntary activation lower in lengthening (79–88 % vs 93–95 %) | Dudley 1990; Beltman 2004; Babault 2001 (ABS) |

---

## 9. Cross-method synthesis of force-development speed [E]

Every row below converts a different kind of measurement into one common descriptor: the natural frequency ωn of a **linear, critically damped second-order** system and its 10–90 % step rise (3.358/ωn). Arithmetic and scripts are in Appendix A.

This is a *descriptor*, not a claim that the muscle is linear second order. Bobet 2005 showed human stimulated muscle is not, and relaxation is faster than this form predicts (§3.3, item 5).

| Joint / muscle | Kind of data | Basis | ωn (rad/s) | 10–90 % step rise |
|---|---|---|---|---|
| **Plantarflexors** | Twitch TPT 104–134 ms (central 110–124) | TPT = 1/ωn | 7.5–9.6 | 350–450 ms |
| | Soleus twitch 156.5 ms | same | 6.4 | 526 ms |
| | Evoked tetanus, peak rate 0.36 / 0.48 % P0/ms (50 / 200 Hz) | Peak slope = ωn/e | 9.8 / 13.0 | 343 / 257 ms. **Model-free lower bound 222 / 167 ms** |
| | Voluntary rapid contraction: 35–41 % MVC at 100 ms, 61–68 % at 200 ms (Ando) | Fraction-of-final fit | 10.3–14.0 | 240–326 ms |
| | Standing EMG → torque fits (Kiemel, Masani, Pasma JNER) | Fitted ωn, ζ 1.0–1.5 | 6.6–9.9 | 420–600 ms |
| | Standing, Vette 2007 fitted T 63–97 ms (examples) | T = 1/ωn | 10.3–15.9 | 212–326 ms |
| **Dorsiflexors** | Twitch TPT 71–111 ms (central 81–96) | TPT = 1/ωn | 9.0–14.1 | 238–373 ms |
| | 50 Hz train: 61–64 % of peak at 100 ms (Richards 2025) | Fraction fit | 20.6–21.8 | 154–163 ms |
| | Voluntary: 16 / 48 / 69 % MVT at 50 / 100 / 150 ms (Grootenhuis 2025) | Fraction fit | 14.0–16.2 | 208–241 ms |
| | Ballistic time to peak 136 ms, constant across 5–75 % MVC targets (Van Cutsem) | — | — | — |
| **Knee extensors** | Twitch TPT 61–94 ms (central 79–94) | TPT = 1/ωn | 10.6–16.4 | 205–316 ms |
| | Voluntary: Tillin 2012 (points 75–150 ms); Buckthorpe 2013 | Fraction fit | 14.3–17.8 (Tillin, both angles); 18.0–20.3 (Buckthorpe) | 189–235 ms (Tillin); 166–186 ms (Buckthorpe) |
| | Octet TPT 112–147 ms (a ≈ 23 ms burst, not a step) | not converted | — | — |
| **Knee flexors** | Twitch TPT 96 ± 42 ms (partial recruitment) | TPT = 1/ωn | ≈ 10 | ≈ 320 ms (low confidence) |
| *Current actuator* | First order, 15 ms | — | — | 33 ms |
| *Thelen-type Hill model with tendon (§4.4)* | Simulation | — | — | 49–145 ms |

**Notes.**
- **Early points give lower apparent ωn.** In the voluntary fits, the 25–50 ms points give lower ωn because neither the onset delay nor gradual recruitment is modelled. Only points from ≥ 75 ms (knee) or all points (dorsiflexors, plantarflexors) are used.
- **Voluntary fits describe recruitment plus mechanics.** The voluntary rise includes the CNS's own drive ramp, so it is not a pure actuator property.
- **Evoked tetani are the closest analogue of a "step in neural drive",** since all motor units are driven at a fixed rate.

**Reading.** Methods that differ in kind converge:
- **Plantarflexors:** ωn ≈ 7–14 rad/s, 10–90 % step rise ≈ 0.25–0.45 s (up to 0.6 s in small-signal standing fits).
- **Dorsiflexors and knee extensors:** faster, ωn ≈ 14–22 rad/s, 10–90 % ≈ 0.15–0.25 s by tetanic or voluntary data. Twitch TPT-based values are ≈ 1.5× slower.
- **The current actuator is ≈ 5–14× faster than these human descriptors** (33 ms vs 0.15–0.45 s).
- **Generic Hill-model contraction dynamics recover part of the gap, not all** (49–145 ms).

**Relaxation descriptors [E]:**
- **Plantarflexors.**
  - Peak relaxation rate 1.25–1.27 % P0/ms (Thomas 1988). A first-order fall with this initial slope has τ ≈ 80 ms and a 90–10 % fall of ≈ 175 ms. The model-free lower bound is 63 ms.
  - Whole-muscle force returns to baseline 232–243 ms after EMG stops (Toninelli 2024).
  - Twitch HRT 64–121 ms, i.e. ≈ 0.6–0.9 × TPT. A linear critically damped system would give 1.68 × TPT.
  - So the plantarflexor fall is faster than its rise, by roughly 2–3× in peak slope.
- **Dorsiflexors.** 50 Hz tetanus HRT 138–180 ms, timed from the last pulse and including a ≈ 22 ms relaxation delay. A critically damped fall (t½ = 1.678/ωn) with the same half-time, with or without the 22 ms delay removed, gives a 90–10 % fall of ≈ 230–360 ms. TA twitch HRT ≈ 1.0–1.15 × TPT.
- **Knee extensors.** Twitch HRT 65–97 ms. Octet HRT 58–83 ms (Gordon) vs 174–208 ms (Tillin): an unresolved conflict.

---

## 10. Data gaps (not found in accessible sources)

- **Tetanic rise times.** No directly measured 10–90 % tetanic rise times at 20–50 Hz for triceps surae, soleus, TA or quadriceps; only peak rates and partial curves. No soleus-specific tetanic data.
- **Same-trial postural data.** No human study measured EMG onset, torque onset and torque rate in the same feet-in-place perturbation trials.
- **Plantarflexor voluntary EMD and RTD on low-noise rigs with manual onset detection.**
- **Hamstrings.** No tetanic times, tendon/aponeurosis stiffness or SRS data; only one partial-recruitment twitch study.
- **Patellar tendon in vivo.** No hysteresis data, and no short-range (< 0.5°) knee stiffness limited by the patellar tendon.
- **Stiffness vs force over time.** No human or 37 °C measurement of whether stiffness leads force on the rise or lags it in relaxation.
- **Cross-bridge kinetics at body temperature.** No human k_tr above 30 °C; fast fibres could not be measured at 30 °C.
- **Muscle vs tendon share of eccentric work.** No human joint-level split between work stored and returned by muscle and by tendon.
- **Hip.** Not reviewed; the scope was limited to ankle (primary) and knee (secondary). The only hip numbers here are the Kiemel 2008/2011 EMG→torque fits in §3.2 (hip ω0 9.4–12.1 rad/s, η 1.5–1.65).
- **Activation constants for slow vs fast muscle.** Dick 2017 is image-only and Winters & Stark was not read; human calcium-transient time courses in vivo were not found.

---

## 11. Conflicts register

| # | Conflict | Sources | Most likely explanation | Consequence for preregistration |
|---|---|---|---|---|
| 1 | **"40 ms first order" vs fitted 0.2–0.6 s EMG→torque** | Welch & Ting 2009 (τ = 40 ms *assumed*) vs Mugge 2010 (2.68 Hz, ζ 0.99, 10–90 % ≈ 0.20 s, tendon excluded) vs Pasma JNER 2017 (1.48 Hz, ζ 1.30, ≈ 0.52 s) and Kiemel 2008/2011, Masani 2008 (≈ 0.42–0.59 s) | Welch & Ting is not a fit. Mugge excludes the tendon and sits in the reflex pathway. Standing fits are small-signal, soleus-weighted and absorb transport delay into the filter | Do not cite 40 ms as human evidence. Specify filter and delay together. Expect large step commands to be faster than sway fits (Genadry: ωn rises with modulation depth) |
| 2 | **Pasma 2017: 16.8 rad/s/0.99 vs 1.48 Hz/1.30** | Pasma Front Comput Neurosci (borrowed from Mugge) vs Pasma JNER (fitted) | Two different papers (§3.1) | Cite Mugge 2010 for 16.8 rad/s; cite Pasma JNER for 1.48 Hz |
| 3 | **Model activation constants vs in vivo lumped responses** | τ_act 10–15 ms (Thelen, Millard, Gait2392) vs twitch TPT 61–157 ms and evoked plantarflexor rise ≥ 167–222 ms (lower bound) | The model constants describe activation only and rely on a tendon plus force–velocity to slow force. Mayfield's human-twitch fit uses much slower Ca²⁺ kinetics (42 / 256 ms) through a steep nonlinearity | A first-order 15 ms activation with no contraction dynamics is not supported by any human force data |
| 4 | **Hill-model contraction dynamics vs in vivo** | Thelen-type simulation 49–145 ms 10–90 % (§4.4) vs human descriptors 0.15–0.45 s (§9) | The simulation lacks foot, heel-pad and aponeurosis compliance and uses generic parameters. Voluntary data include recruitment | A Hill model with Gait2392 tendons is still faster than humans, especially for the knee and dorsiflexors |
| 5 | **Linear filter cannot fit both rise and fall** | Measured triceps surae HRT/TPT 0.6–0.9 and peak relaxation rate 2.6–3.5× peak rise rate (Thomas 1988), vs linear critically damped HRT/TPT = 1.68 | Ca²⁺–force cooperativity; relaxation partly set by Ca²⁺ re-uptake. Bobet 2005: linear models fit human stimulated dorsiflexors worst | Rise and fall need separate time constants (asymmetric), or a nonlinear activation |
| 6 | **EMD 8.5 vs 78 ms** | Evoked high-resolution 8.5–14 ms vs motor-point threshold 23–27 ms vs voluntary 18–50 ms vs plantarflexor threshold 69–78 ms | Onset detection, noise, slack, pre-activation | Use ≈ 10 ms evoked / ≈ 20–30 ms voluntary as the physical minimum. About half of evoked EMD is series-elastic take-up and emerges from an explicit series elastic component |
| 7 | **EMD vs NMD** | EMD 10–50 ms vs NMD 120–500 ms (TS 462–502; TA 150–195; vasti 122–176) | NMD is filter phase lag during ongoing modulation, at low force where the tendon is compliant | NMD is a useful *validation* target for any contraction filter. The triceps surae value comes from one study |
| 8 | **TA twitch CT 71 vs 111 ms** | Van Cutsem 1998 (ankle ≈ 90°, nerve) vs Power 2012 (ankle 40° plantarflexion) vs Marsh 1981 (81 ms) | Muscle length and stimulation method | Use 81–96 ms as central, with the length dependence noted |
| 9 | **Knee octet HRT 78–83 vs 174–208 ms** | Gordon 2023 vs Tillin 2012 | Different HRT definitions (not stated by Tillin) or angle | Unresolved; do not average |
| 10 | **Achilles stiffness spans 145 to 2622 N/mm** | Lichtwark & Wilson; Peltonen; Magnusson 2001/2003; Kongsgaard; Kubo | Tracking site (free tendon vs tendon + aponeurosis), force range, rotation correction, single-muscle force | Use joint-level quick-release and standing measurements for a lumped joint SEC; use ultrasound values only with stated scope |
| 11 | **Quick-release vs ultrasound joint SEC** | Hof 250–400 and de Zee 506–529 N·m/rad at 100 N·m vs k·r² 1200–1600 N·m/rad near MVC | Quick release includes foot and heel pad; ultrasound excludes them. Different force levels | The lumped joint SEC is the softer one |
| 12 | **Does SEC stiffness depend on activation or only moment?** | Hof 1998 (rises with activation) vs de Zee & Voigt 2001 (moment only, voluntary = stimulated) | Method | Model SEC stiffness as a function of tendon force (moment), not activation |
| 13 | **SRS gain γ = 23.4 vs 280** | Cui 2008 (cat whole muscle; validated in human arm, Hu 2011) vs De Groote 2017 (fibre-derived; needed for stance inverse-dynamics torques; n = 2) | Fibre ramps include faster components; Rack & Westbury matched SRS to the slower Huxley–Simmons phase | Preregister a range; the joint value is capped by the SEC anyway at the ankle |
| 14 | **Stiffness leads force (11–20 ms) vs synchronous** | Ford 1986, Cecchi 1991 (frog, 0–6 °C) vs Bagni 1998/1999 (ramp method) | Method; non-cross-bridge stiffness on activation | Make stiffness proportional to developed force, with at most a small lead |
| 15 | **Stiffness in relaxation: lags force vs drops below passive** | Cecchi 1991, Schoenberg & Wells 1984, Stein & Parmiggiani 1979 (cat soleus) vs Ludvig 2014/2017 (human knee) | Preparation; reflex withdrawal; perturbation size | Unresolved |
| 16 | **Tendon hysteresis 6–11 % vs 5–50 %** | In vitro (Ker; Bennett) and matched-rate in vivo (Peltonen 5 %) vs in vivo ramp methods (17–35 %; 40–50 % at < 1 s relaxation) | In vivo artefacts (Finni 2013) | Use ≈ 5–10 % for tendon energy loss |
| 17 | **RFE in maximal quadriceps** | None active (Hahn 2007) vs 5–10 % (Seiberl 2010) vs 4–20 % (Power 2013) | Protocol | Low priority for a reduced model |
| 18 | **Thelen τ: constant vs activation-dependent; 15/50 vs 10/40** | OpenSim Thelen default vs Millard/Gait2392; activation-dependent form in OpenSim and Millard | Different implementations | State which form is used. With the activation-dependent form, effective τ is 7.5–30 ms (rise) and 25–100 ms (fall) |
| 19 | **Robinovitch 372 ± 267 N·m/s** | CV ≈ 72 %; window undefined; ankles started relaxed | — | Weak calibration target; use only as a plausibility range |

---

## 12. Recommendation for a reduced model

Everything in this section is **[D]**, a design proposal derived from the evidence above. The basis of each number is given as [M], [E] or [MODEL]. Ranges are the literature spread; the "central" values are the middle of the better-quality evidence. **They were not chosen with reference to any simulation behaviour.**

### 12.1 Structural points the literature supports

1. **Human data constrain the lumped command → torque response, not τ_act on its own.**
   - No human measurement isolates activation (Ca²⁺) dynamics in vivo.
   - τ_act / τ_deact values are model parameters, and they were calibrated inside Hill models that also contain tendon compliance and force–velocity (Millard 2013: a rigid-tendon model needed τ_A 37.8 vs 23–24 ms).
   - Keeping τ_act = 15 ms without contraction dynamics produces a 10–90 % rise ≈ 5–14× faster than any human descriptor (§9).
2. **Rise and fall must be asymmetric.**
   - Triceps surae HRT is 0.6–0.9 × TPT, and the peak relaxation rate is 2.6–3.5× the peak rise rate (Thomas 1988).
   - A single linear filter, first or second order, cannot match both (§3.3, §11 #5).
3. **Intrinsic resistance to an imposed stretch is immediate, but bounded.**
   - SRS acts without delay and is velocity-independent above a few mm/s (Rack & Westbury 1974).
   - Its magnitude scales with *developed* force, not commanded activation (Hunter & Kearney 1983; Kirsch & Rymer 1992; Cui 2008).
   - It acts in series with the SEC, so the immediate joint stiffness cannot exceed K_SEC. At the standing ankle the joint is tendon-limited (Loram 2007b: K_ce/K_se 6–17 at ≤ 0.4°).
   - **[D] implication:** the immediate-stiffness path should bypass the force-development filter, but scale with the filtered (developed) force and be combined in series with K_SEC.
4. **Part of EMD emerges from series compliance.**
   - ≈ 48 % of evoked medial gastrocnemius EMD is slack take-up (Nordez 2009).
   - The simulated Hill model with tendon reached 2 % of the force change within 3–7 ms (§4.4), so contraction dynamics alone do not create a dead time.
   - A model with an explicit SEC needs only the electrochemical delay. A lumped model needs the whole EMD.
5. **Plantarflexor values are soleus-dominated (slow); knee extensors are mixed.**
   - Soleus CT 156.5 vs gastrocnemius 100–114 ms.
   - Standing EMG→torque fits are soleus-weighted.
   - Quadriceps TPT is 61–86 ms depending on type II fraction (Hamada 2000).
   - A single lumped plantarflexor actuator should use whole-triceps-surae values, not soleus-only values.

### 12.2 Parameter table

**Ankle plantarflexors (PF)**

| Parameter | Range | Central | Basis |
|---|---|---|---|
| Activation rise τ_act (first order, if kept) | 10–15 ms | 15 ms (Thelen); 10 ms (Millard/Gait2392) | [MODEL] only; no human measurement; not validated without contraction dynamics |
| Deactivation τ_deact | 40–68 ms | 50 ms | [MODEL] (Millard 40; Thelen 50 young / 60 old; De Groote 60; Winters & Stark 68, SEC) |
| Twitch TPT target | 104–134 ms (soleus 156.5; gastrocnemius 100–114) | ≈ 115 ms | [M] resting muscle at 33–35 °C; ≈ 16 % shorter at 38 °C |
| Twitch HRT target | 64–121 ms | ≈ 90 ms | [M]; strongly length-dependent (64 ms shortened vs 101 ms lengthened) |
| Equivalent contraction lag τ_c,rise (after a 15/50 ms activation) | 112–205 ms | ≈ 135–160 ms | [E] cascade inversion of the step-rise targets (Appendix A.4) |
| Equivalent contraction lag τ_c,fall | ≈ 17–95 ms | ≈ 55 ms | [E] cascade inversion of the fall targets |
| EMD, evoked | 8.5–14 ms | ≈ 11 ms | [M] (Yavuz; Nordez; Ota) |
| EMD, voluntary from rest | No low-noise plantarflexor data. 69–78 ms threshold-based (inflated) | [D] 20–30 ms by analogy with TA and knee extensors | [M] gap |
| Pure transport delay if the SEC is explicit | ≈ 5–6 ms | ≈ 6 ms | [M] MG fascicle-motion onset 6.05 ms (Nordez 2009) |
| Step-drive 10–90 % torque rise | 250–450 ms (small-signal standing fits up to 600 ms; model-free lower bound 167–222 ms) | ≈ 300–350 ms | [E] §9 |
| Relaxation 90–10 % | 120–250 ms | ≈ 175 ms | [E] Thomas 1988 peak rate, first-order assumption; lower bound 63 ms; force at baseline 232–243 ms after EMG stops [M] |
| Joint-level SEC, low torque (≤ 30 N·m, per leg, foot included) | ≈ 240 (relaxed calf, K_se 0.77 mgh) to ≈ 290 N·m/rad (active stance: SEC caps ankle stiffness at 92 ± 20 % mgh). The measured active intrinsic stiffness, ≈ 286 N·m/rad per leg, is itself a lower bound on the active-stance SEC | ≈ 290 N·m/rad (active stance) | [E] Loram 2007b; Loram 2005b; Loram & Lakie 2002; whole-body mgh 11.0 N·m/deg |
| Joint-level SEC at 100 N·m (quick release, foot/heel included) | 250–530 N·m/rad | ≈ 400 N·m/rad | [M] Hof 1998; de Zee & Voigt 2001 |
| Joint-level SEC near MVC (tendon + aponeurosis only) | 1200–1600 N·m/rad | — | [E] Magnusson 2001 k·r² |
| SRS gain at muscle level | γ = 23.4–280 (K = γF/l_opt) | Preregister a range | [MODEL] Cui 2008 vs De Groote 2017 |
| SRS at joint level (one muscle, F = T/r) | K_SRS ≈ γ·T·r/l_opt. Soleus (r ≈ l_opt ≈ 0.05 m): ≈ 23 × T (γ 23.4) to ≈ 280 × T (γ 280) N·m/rad | — | [E] |
| SRS elastic limit | 0.5–1 % l_opt from an isometric start (≈ 2–3 % in alternating movement). Joint transition ≈ 0.5° in stance; 1.0–1.3° relaxed seated | — | [M] |

**Ankle dorsiflexors (DF)**

| Parameter | Range | Central | Basis |
|---|---|---|---|
| τ_act / τ_deact | As PF (10–15 / 40–68 ms) | 15 / 50 ms | [MODEL]; no muscle-specific human values verified |
| Twitch TPT | 71–111 ms | ≈ 85 ms | [M]; length-dependent |
| Twitch HRT | 70–110 ms | ≈ 90 ms | [M] |
| Tetanic (50 Hz) HRT | 138–180 ms | ≈ 150 ms | [M] (Power 2012; Richards 2025) |
| τ_c,rise | 65–112 ms | ≈ 90 ms | [E] cascade inversion |
| τ_c,fall | ≈ 85–150 ms | ≈ 95 ms | [E] cascade inversion of the tetanic fall |
| EMD, voluntary | 18–31 ms | ≈ 25 ms (31 ms from rest, 18 ms pre-activated) | [M] Van Cutsem & Duchateau 2005 |
| Relaxation delay | ≈ 22.5 ± 5.9 ms | 22 ms | [M] Cogliati 2023 |
| Step-drive 10–90 % rise | 150–250 ms (twitch-based up to 370 ms) | ≈ 200 ms | [E] §9 |
| Relaxation 90–10 % | 230–360 ms (from tetanic HRT). Twitch HRT implies faster | ≈ 250 ms | [E]; weak evidence |
| Joint-level SEC | 80 → 209 N·m/rad (TA tendon only, 0 → 25 N·m stimulated); 149–219 N·m/rad at 34 N·m (quick release) | ≈ 150–200 N·m/rad at moderate torque | [E]/[M] Maganaris & Paul 1999; de Zee & Voigt 2002 |
| Intrinsic stiffness vs torque | ≈ 0.5 → 2.5 N·m/deg (29 → 143 N·m/rad) up to 80 % MVC | — | [M] Sinkjaer 1988 (stimulated) |

**Knee extensors (KE)**

| Parameter | Range | Central | Basis |
|---|---|---|---|
| τ_act / τ_deact | As PF | 15 / 50 ms | [MODEL] |
| Twitch TPT | 61–94 ms | ≈ 85 ms | [M]; ≈ 19 % shorter at 39 °C rectal |
| Twitch HRT | 65–97 ms | ≈ 85 ms | [M] |
| Octet TPT / HRT | 112–147 / 58–208 ms (HRT conflict) | TPT ≈ 130 ms | [M] |
| τ_c,rise | ≈ 70–105 ms | ≈ 90 ms | [E] cascade inversion of 165–235 ms |
| τ_c,fall | ≈ 17–70 ms (twitch/octet-based); larger if Tillin's octet HRT is right | ≈ 45 ms | [E] cascade inversion of 120–200 ms |
| EMD | Evoked 10–17 ms; voluntary 18–23 ms (low-noise) or 39–50 ms (standard) | Evoked ≈ 11 ms; voluntary ≈ 20 ms | [M] |
| Step-drive 10–90 % rise | 165–235 ms (twitch-based up to 316 ms) | ≈ 200 ms | [E] §9 |
| Relaxation 90–10 % | 120–200 ms (twitch- and octet-based, 2.0 × HRT, critically damped fall shape); 350–415 ms if Tillin's octet HRT is used | ≈ 160 ms | [E]; conflict #9 |
| Joint-level SEC near MVC | ≈ 450–1160 N·m/rad (tendon–aponeurosis) | ≈ 1000 N·m/rad | [E] Bojsen-Møller 2003; Kubo 2001 |
| Joint-level SEC at low force | Not measured. Upper bound ≈ 530–710 N·m/rad from the patellar tendon toe region (older adults) | — | [E] Reeves 2003; aponeurosis in series makes the true value lower |
| Intrinsic knee stiffness vs torque | Slope ≈ 5–6 N·m/rad per N·m (extension); ≈ 100–310 N·m/rad at 18–57 N·m | — | [E] read from Pfeifer 2012 Fig. 4; 0.5° SD perturbations |
| Passive knee stiffness at rest | ≈ 29 N·m/rad | — | [E] Ludvig 2017 |

**Knee flexors (KF)**

| Parameter | Range | Central | Basis |
|---|---|---|---|
| Twitch TPT / HRT | 96 ± 42 / 86 ± 51 ms | — | [M] one partial-recruitment study; low confidence |
| EMD, voluntary | 44 ms | 44 ms | [M] Hannah 2014 (one study) |
| Step-drive rise, SEC, SRS | No direct data | Borrow knee-extensor structure with wider bounds | [gap] |
| Intrinsic stiffness vs torque | Slope ≈ 4–6 N·m/rad per N·m (flexion); ≈ 45–160 N·m/rad at 8–35 N·m | — | [E] Pfeifer 2012 Fig. 4 |

### 12.3 Notes on using the table

- **The τ_c values are conditional on one structure:** first-order activation (15/50 ms) followed by a first-order force lag with separate rise and fall constants (Appendix A.4).
  - With the activation-dependent Thelen τ, or 10/40 ms, the τ_c values shift. They must be re-derived from the *step-rise and relaxation targets*, which are the structure-independent quantities.
- **An explicit SEC + force–velocity (Hill) alternative** reproduced only 49–145 ms rises with Gait2392 parameters (§4.4). It would need softer series compliance (foot, heel pad, aponeurosis) or slower fibre or activation parameters to reach the human targets.
  - Mayfield 2023's human-twitch fit is one fully specified option: Vmax 6 L0/s, SEE strain 5 % at P0, Ca²⁺ 42.2 / 256 ms with Hill n = 3 [MODEL].
- **Signal size matters.**
  - Sway-fitted filters (0.42–0.6 s) are small-signal and low-force.
  - Step-like commands from rest are faster, as evoked tetani and voluntary RTD show.
  - Preregister which regime each validation test represents.
- **Resting-muscle lab values apply to cool muscle.** Most were measured at ≈ 33–35 °C. Exercising muscle at ≈ 38 °C is ≈ 15–20 % faster (twitch TPT and HRT).
- **SEC is force-dependent, softest at low force.**
  - At standing torques, the plantarflexor SEC is ≈ 0.77–0.93 mgh per both legs.
  - Do not use the patellar tendon alone for the knee SEC.
  - Do not use free-tendon ultrasound values for the ankle SEC.
- **Joint-level SRS cross-check [E].**
  - At a standing torque of ≈ 20 N·m per leg, γ = 23.4 gives K_SRS ≈ 470 N·m/rad. In series with an active-stance K_SEC ≈ 290, the joint is ≈ 180 N·m/rad, ≈ 63 % of the measured ≈ 286 N·m/rad per leg (Loram & Lakie 2002).
  - γ = 280 gives ≈ 276 N·m/rad (≈ 96 %).
  - The stance data therefore sit closer to the high-γ end, consistent with De Groote 2017. Loram 2007b's K_ce/K_se ≈ 6–17 (passive calf) also exceeds the ≈ 1.6 (470/290) implied by γ = 23.4.
  - This is a single-muscle approximation (soleus geometry, r ≈ l_opt ≈ 0.05 m).

---

## 13. Unverified items and corrections

### 13.1 Requested items that could not be verified

| Item | Status |
|---|---|
| Freund & Büdingen 1978: millisecond time-to-peak values | [UNVERIFIED]. The abstract confirms near-constant time-to-peak across amplitudes in three hand and forearm muscles; PDF inaccessible |
| Vandervoort & McComas 1983: HRT values and n | [UNVERIFIED] (abstract only) |
| Buller et al. (human "fast and slow muscles") | Not accessible |
| Belanger & McComas 1981; Belanger, McComas & Elder 1983 (antagonist muscle groups): numbers | Closed access; abstracts give no numbers |
| Bigland-Ritchie / Jones / Edwards tetanic relaxation values | Not retrieved |
| Hof & van den Berg 1981 (I–IV): EMG-to-force time constants | Not read |
| Olney & Winter 1985: filter cutoff / natural frequency | [UNVERIFIED] |
| Lloyd & Besier 2003: fitted coefficients and EMD | [UNVERIFIED] |
| Bawa & Stein 1976: soleus second-order parameters | [UNVERIFIED] |
| Mirbagheri 2000/2001: reflex delay, ωn, ζ | [UNVERIFIED] |
| Genadry 1988; Kearney 1997 eigenfrequencies | SEC only (via Kiemel 2008) |
| Vette 2007 group-median T | Box plot only; six example values read |
| Bellemare 1983: source of Vette's T* = 116 ms | SEC (abstract gives no times) |
| Zajac 1989; He, Levine & Loeb 1989/1991; Raasch 1997; Anderson & Pandy 2001; McLean 2003; Umberger 2003: activation constants | [UNVERIFIED]. The suggested Raasch "22/200 ms" was not found |
| Winters & Stark 1985/1988 originals | SEC only (30 ms; 11/68 ms) |
| Dick 2017 fibre-type activation constants | Image-only table |
| Thelen 2003 paper's own tendon strain (0.033 vs 0.04) and Flen | Only OpenSim defaults and code comments seen |
| Hof 1998: unit of "about 30"; de Zee & Voigt 2001: n and SES at other moments | Abstracts only |
| Hansen 2006: n and force range; Narici 1996: n | Abstracts only |
| Weiss 1988; Hunter & Kearney 1982: numeric stiffness–torque slopes | [UNVERIFIED] |
| Zhang 1998: absolute knee stiffness | [UNVERIFIED] |
| Getz 1998: temperature; the 0.208 P0/nm value | SEC (via De Groote 2017) |
| Stein & Parmiggiani 1979: size of the stiffness lag and temperature | [UNVERIFIED] |
| Robinovitch 2002: definition and window of the torque rate; EMG onset | Not in abstract |
| Abbott, Bigland & Ritchie 1952: oxygen cost of negative work | Not read |
| Tilp 2009 RFE magnitude (dorsiflexors 6–19 %) | SEC via Power 2012 |
| Lee, Suter & Herzog 1999/2000: quadriceps force-depression magnitudes | Abstracts give no magnitudes |
| Tillin 2012: angle convention and HRT definition | Not stated in the fetched text |
| Hali 2021 normalised relaxation-rate columns | Appear internally inconsistent; not used |

### 13.2 Consulted but no usable absolute numbers

- Vandervoort & McComas 1986 (PMID 3525504): twitch slows with age.
- Connelly et al. 1999 (PMID 10444648): TA contraction duration +23 % in old men.
- Roos et al. 1999 (PMID 10417793): quadriceps ≈ 10 % slower in old men.
- Dalton et al. 2009 (PMID 19797692): triceps surae contraction duration +20 % in old men.
- Harridge et al. 1996 (PMID 8772143): TPT relates to fibre type; numbers not accessible.
- Hof, van Zandwijk & Bobbert 2002 (PMID 11851593): no SEC numbers in the abstract.
- Thelen et al. 1997 (PMID 9008663): lean-release with stepping; no torque rates in the abstract.
- Vette, Masani & Popovic 2007 IEEE TNSRE (PMID 17601193) and Vette et al. 2010 (PMID 20071280): no twitch values in the abstracts.

### 13.3 Corrections to earlier repo reviews and to the task brief

1. **ABI-1 (`BALANCE_LITERATURE.md`):** "Pasma et al. 2017 *Front Comput Neurosci* 11:99 … activation ω = 16.8 rad/s, ζ = 0.99". The values do appear there, but as defaults borrowed from **Mugge et al. 2010**, not as a fit. The fitted 1.48 Hz / ζ 1.30 is in the separate Pasma 2017 *JNER* paper (§3.1).
2. **PPR-3 (`POSTURAL_TIMING_CONTROL_LITERATURE.md`):** "Vette et al. 2007 … twitch dynamics (T 63–116 ms)". Corrected: 63–97 ms are the six example fitted values, and 116 ms is the *initial* value taken from Bellemare 1983 (SEC). Group values appear only as box plots. n = 10 healthy men, 30.7 ± 4.1 y.
3. **PPR-3:** Welch & Ting "Muscle filter first order, 40 ms" is correct, but the filter was *assumed* ("defined as τ = 40 ms"), not fitted. The fitted delays λ (Table 4) are 60–116 ms, mean 88 ± 19 ms [E], n = 7.
4. **PPR-1:** "free tendon 759 N/mm (Magnusson 2003)". **Verified** in the abstract after the parsing fix (759 ± 132 N/mm, n = 5). A research fork had flagged it as unverified because of the parsing bug.
5. **PPR-1 §3.2:** Sakanaka 2018's "muscle ~15 times stiffer than the tendon" is a citation in that paper's Introduction (to Loram's work), not a Sakanaka measurement. The measured values are K_ce/K_se = 17 ± 11 (0.13°), 12 ± 9 (0.15°) and 6.3 ± 10 (0.4°) in the *passive* standing calf (Loram 2007b).
6. **PPR-1 §2.2:** Cui 2008's γ = 23.4 does **not** "already contain aponeurosis compliance". Cui modelled tendon + aponeurosis separately (E = 522 MPa); γ is the fibre term.
7. **PPR-2:** Lichtwark & Wilson 2005 "17–35 %" hysteresis is an interquartile range from hopping, not a mean. Matched-rate isometric measurement gives 5 ± 2 % (Peltonen 2013).
8. **Task brief:**
   - Robinovitch 2002's third author is **Lui**.
   - Zhou 1995's authors are **Zhou, Lawson, Morrison & Fairweather**.
   - Freund & Büdingen 1978 studied **hand and forearm muscles only**.
   - "Pasma 2017 (1.48 Hz, ζ 1.3)" is the *JNER* paper.
   - "van der Kooij & Peterka 2011 (16.8 rad/s, ζ 0.99)" borrowed the value from Mugge 2010.

---

## 14. References

Metadata come from Europe PMC, NCBI or Crossref records. Access codes refer to what this review read: FT, FT-W, ABS or SEC. "Not read" means the item is cited only to flag an unverified value.

1. Abbott BC, Aubert XM, Hill AV (1951). The absorption of work by a muscle stretched during a single twitch or a short tetanus. *Proc R Soc Lond B* 139:86–104. doi:10.1098/rspb.1951.0048. PMID 14911816. ABS.
2. Andersen LL, Aagaard P (2006). Influence of maximal muscle strength and intrinsic muscle contractile properties on contractile rate of force development. *Eur J Appl Physiol* 96:46–52. doi:10.1007/s00421-005-0070-z. PMID 16249918. ABS.
3. Ando R, Sato S, Hirata N, Tanimoto H, Imaizumi N, Suzuki Y, Hirata K, Akagi R (2021). *Front Physiol* 12:777268. doi:10.3389/fphys.2021.777268. PMID 35035358. PMC8753453. FT.
4. Arampatzis A, Karamanidis K, Morey-Klapsing G, De Monte G, Stafilidis S (2007). Mechanical properties of the triceps surae tendon and aponeurosis in relation to intensity of sport activity. *J Biomech* 40:1946–1952. doi:10.1016/j.jbiomech.2006.09.005. PMID 17101142. ABS.
5. Axelson HW, Hagbarth KE (2001). *J Physiol* 535:279–288. doi:10.1111/j.1469-7793.2001.00279.x. PMID 11507177. ABS.
6. Babault N, Pousson M, Ballay Y, Van Hoecke J (2001). Activation of human quadriceps femoris during isometric, concentric, and eccentric contractions. *J Appl Physiol* 91:2628–2634. doi:10.1152/jappl.2001.91.6.2628. PMID 11717228. ABS.
7. Bagni MA, Cecchi G, Colomo F, Garzella P (1994). *J Physiol* 481:273–278. doi:10.1113/jphysiol.1994.sp020437. PMID 7738825. ABS.
8. Bagni MA, Cecchi G, Colombini B, Colomo F (1998). *Adv Exp Med Biol* 453:383–391. doi:10.1007/978-1-4684-6039-1_43. PMID 9889850. ABS.
9. Bagni MA, Cecchi G, Colombini B, Colomo F (1999). *J Muscle Res Cell Motil* 20:469–476. doi:10.1023/A:1005582324129. PMID 10555065. ABS.
10. Bawa P, Stein RB (1976). *J Neurophysiol* 39:788–793. doi:10.1152/jn.1976.39.4.788. PMID 966038. ABS.
11. Begovic H, Zhou GQ, Li T, Wang Y, Zheng YP (2014). *Front Physiol* 5:494. doi:10.3389/fphys.2014.00494. PMID 25566091. PMC4274888. FT.
12. Bélanger AY, McComas AJ (1983). Contractile properties of muscles in myotonic dystrophy. *J Neurol Neurosurg Psychiatry* 46:625–631. doi:10.1136/jnnp.46.7.625. PMID 6886699. PMC1027481. FT (scanned). Control-group values used.
13. Bellemare F, Woods JJ, Johansson R, Bigland-Ritchie B (1983). Motor-unit discharge rates in maximal voluntary contractions of three human muscles. *J Neurophysiol* 50:1380–1392. doi:10.1152/jn.1983.50.6.1380. PMID 6663333. ABS.
14. Beltman JG, Sargeant AJ, van Mechelen W, de Haan A (2004). *J Appl Physiol* 97:619–626. doi:10.1152/japplphysiol.01202.2003. PMID 15075302. ABS.
15. Bennett MB, Ker RF, Dimery NJ, Alexander RMcN (1986). Mechanical properties of various mammalian tendons. *J Zool (Lond)* 209:537–548. doi:10.1111/j.1469-7998.1986.tb03609.x. No PMID. ABS (Crossref).
16. Blanpied P, Smidt GL (1992). *J Biomech* 25:29–39. doi:10.1016/0021-9290(92)90243-T. PMID 1733982. ABS.
17. Bobet J, Stein RB (1998). A simple model of force generation by skeletal muscle during dynamic isometric contractions. *IEEE Trans Biomed Eng* 45:1010–1016. doi:10.1109/10.704869. PMID 9691575. ABS.
18. Bobet J, Gossen ER, Stein RB (2005). *IEEE Trans Neural Syst Rehabil Eng* 13:444–451. doi:10.1109/TNSRE.2005.858461. PMID 16425825. ABS.
19. Bojsen-Møller J, Hansen P, Aagaard P, Kjaer M, Magnusson SP (2003). Measuring mechanical properties of the vastus lateralis tendon-aponeurosis complex in vivo by ultrasound imaging. *Scand J Med Sci Sports* 13:259–265. doi:10.1034/j.1600-0838.2003.00301.x. PMID 12859609. ABS.
20. Bojsen-Møller J, Magnusson SP, Rasmussen LR, Kjaer M, Aagaard P (2005). *J Appl Physiol* 99:986–994. doi:10.1152/japplphysiol.01305.2004. PMID 15860680. ABS.
21. Buchanan TS, Lloyd DG, Manal K, Besier TF (2004). Neuromusculoskeletal modeling: estimation of muscle forces and joint moments and movements from measurements of neural command. *J Appl Biomech* 20:367–395. doi:10.1123/jab.20.4.367. PMID 16467928. PMC1357215. FT-W.
22. Buckthorpe MW, Pain MT, Folland JP (2013). *PLoS One* 8:e57549. doi:10.1371/journal.pone.0057549. PMID 23472091. PMC3589403. FT.
23. Campbell KS, Lakie M (1998). *J Physiol* 510:941–962. doi:10.1111/j.1469-7793.1998.941bj.x. PMID 9660904. PMC2231083. ABS.
24. Campbell KS, Moss RL (2000). *J Physiol* 525:531–548. doi:10.1111/j.1469-7793.2000.00531.x. PMID 10835052. PMC2269955. ABS.
25. Campbell KS, Moss RL (2002). *Biophys J* 82:929–943. doi:10.1016/S0006-3495(02)75454-4. PMID 11806934. PMC1301901. ABS.
26. Casadio M, Morasso PG, Sanguineti V (2005). Direct measurement of ankle stiffness during quiet standing. *Gait Posture* 21:410–424. doi:10.1016/j.gaitpost.2004.05.005. PMID 15886131. ABS.
27. Cavanagh PR, Komi PV (1979). *Eur J Appl Physiol Occup Physiol* 42:159–163. doi:10.1007/BF00431022. PMID 527577. ABS.
28. Cecchi G, Griffiths PJ, Taylor S (1982). *Science* 217:70–72. doi:10.1126/science.6979780. PMID 6979780. ABS.
29. Cecchi G, Griffiths PJ, Taylor S (1984). *Adv Exp Med Biol* 170:641–655. doi:10.1007/978-1-4684-4703-3_60. PMID 6611038. ABS.
30. Cecchi G, Griffiths PJ, Taylor S (1986). *Biophys J* 49:437–451. doi:10.1016/S0006-3495(86)83653-0. PMID 3955178. ABS.
31. Cecchi G, Griffiths PJ, Bagni MA, Ashley CC, Maeda Y (1991). *Biophys J* 59:1273–1283. doi:10.1016/S0006-3495(91)82342-6. PMID 1873464. ABS.
32. Cogliati M, Cudicio A, Benedini M, Cabral HV, Negro F, Reggiani C, Orizio C (2023). *Eur J Appl Physiol* 123:1825–1836. doi:10.1007/s00421-023-05198-0. PMID 37071199. PMC10363076. ABS.
33. Colombini B, Nocella M, Bagni MA, Griffiths PJ, Cecchi G (2010). *Biophys J* 98:2582–2590. doi:10.1016/j.bpj.2010.02.014. PMID 20513402. PMC2877350. ABS.
34. Contreras-Hernandez I, Arvanitidis M, Falla D, Negro F, Martinez-Valdes E (2024). *J Neurophysiol* 132:1198–1210. doi:10.1152/jn.00391.2023. PMID 39230338. PMC11495179. FT.
35. Couppé C, Kongsgaard M, Aagaard P, Hansen P, Bojsen-Moller J, Kjaer M, Magnusson SP (2008). Habitual loading results in tendon hypertrophy and increased stiffness of the human patellar tendon. *J Appl Physiol* 105:805–810. doi:10.1152/japplphysiol.90361.2008. PMID 18556433. ABS.
36. Cui L, Perreault EJ, Sandercock TG (2007). *J Appl Physiol* 103:796–802. doi:10.1152/japplphysiol.01451.2006. PMID 17510297. PMC3732113. ABS.
37. Cui L, Perreault EJ, Maas H, Sandercock TG (2008). Modeling short-range stiffness of feline lower hindlimb muscles. *J Biomech* 41:1945–1952. doi:10.1016/j.jbiomech.2008.03.024. PMID 18499113. PMC2488157. FT.
38. Davies CT, Mecrow IK, White MJ (1982). *Eur J Appl Physiol Occup Physiol* 49:255–269. doi:10.1007/bf02334074. PMID 6889502. ABS.
39. Davies CT, Thomas DO, White MJ (1986). *Acta Med Scand Suppl* 711:219–226. doi:10.1111/j.0954-6820.1986.tb08954.x. PMID 3465206. ABS.
40. De Groote F, Kinney AL, Rao AV, Fregly BJ (2016). *Ann Biomed Eng* 44:2922–2936. doi:10.1007/s10439-016-1591-9. PMID 27001399. PMC5043004. FT.
41. De Groote F, Allen JL, Ting LH (2017). Contribution of muscle short-range stiffness to initial changes in joint kinetics and kinematics during perturbations to standing balance: a simulation study. *J Biomech* 55:71–77. doi:10.1016/j.jbiomech.2017.02.008. PMID 28259465. PMC5436583. FT.
42. Delp SL, Loan JP, Hoy MG, Zajac FE, Topp EL, Rosen JM (1990). *IEEE Trans Biomed Eng* 37:757–767. doi:10.1109/10.102791. PMID 2210784. Parameters read from `gait2392_thelen2003muscle.osim` (FT).
43. Delp SL, Anderson FC, Arnold AS, et al. (2007). OpenSim. *IEEE Trans Biomed Eng* 54:1940–1950. doi:10.1109/TBME.2007.901024. PMID 18018689. Paper not read. opensim-core source read (FT): `Thelen2003Muscle`, `Millard2012EquilibriumMuscle`, `MuscleFirstOrderActivationDynamicModel`, `DeGrooteFregly2016Muscle`, `TendonForceLengthCurve`.
44. Del Vecchio A, Úbeda A, Sartori M, Azorín JM, Felici F, Farina D (2018). *J Appl Physiol* 125:1404–1410. doi:10.1152/japplphysiol.00135.2018. PMID 29975604. ABS.
45. de Ruiter CJ, De Haan A, Jones DA, Sargeant AJ (1998). Shortening-induced force depression in human adductor pollicis muscle. *J Physiol* 507:583–591. doi:10.1111/j.1469-7793.1998.583bt.x. PMID 9518715. PMC2230803. FT.
46. de Ruiter CJ, Didden WJ, Jones DA, de Haan A (2000). *J Physiol* 526:671–681. doi:10.1111/j.1469-7793.2000.00671.x. PMID 10922017. PMC2270043. FT-W.
47. de Ruiter CJ, Kooistra RD, Paalman MI, de Haan A (2004). Initial phase of maximal voluntary and electrically stimulated knee extension torque development at different knee angles. *J Appl Physiol* 97:1693–1701. doi:10.1152/japplphysiol.00230.2004. PMID 15180971. ABS.
48. de Zee M, Voigt M (2001). Moment dependency of the series elastic stiffness in the human plantar flexors measured in vivo. *J Biomech* 34:1399–1406. doi:10.1016/s0021-9290(01)00133-6. PMID 11672714. ABS.
49. de Zee M, Voigt M (2002). Assessment of functional series elastic stiffness of human dorsiflexors with fast controlled releases. *J Appl Physiol* 93:324–329. doi:10.1152/japplphysiol.00696.2001. PMID 12070221. ABS.
50. Dick TJM, Biewener AA, Wakeling JM (2017). *J Exp Biol* 220:1643–1653. doi:10.1242/jeb.154807. PMID 28202584. PMC5450802. FT (Table 3 unreadable).
51. Diener HC, Horak FB, Nashner LM (1988). *J Neurophysiol* 59:1888–1905. doi:10.1152/jn.1988.59.6.1888. PMID 3404210. ABS.
52. Dudley GA, Harris RT, Duvoisin MR, Hather BM, Buchanan P (1990). *J Appl Physiol* 69:2215–2221. doi:10.1152/jappl.1990.69.6.2215. PMID 2077019. ABS.
53. Farris DJ, Trewartha G, McGuigan MP (2011). *J Biomech* 44:822–826. doi:10.1016/j.jbiomech.2010.12.015. PMID 21272885. ABS.
54. Finni T, Peltonen J, Stenroth L, Cronin NJ (2013). Viewpoint: On the hysteresis in the human Achilles tendon. *J Appl Physiol* 114:515–517. doi:10.1152/japplphysiol.01005.2012. PMID 23085961. SEC.
55. Ford LE, Huxley AF, Simmons RM (1986). *J Physiol* 372:595–609. doi:10.1113/jphysiol.1986.sp016027. PMID 3487643. PMC1192781. ABS.
56. Freund HJ, Büdingen HJ (1978). The relationship between speed and amplitude of the fastest voluntary contractions of human arm muscles. *Exp Brain Res* 31:1–12. doi:10.1007/BF00235800. PMID 639903. ABS.
57. Fukunaga T, Ito M, Ichinose Y, Kuno S, Kawakami Y, Fukashiro S (1996). *J Appl Physiol* 81:1430–1433. doi:10.1152/jappl.1996.81.3.1430. PMID 8889784. ABS.
58. Fukutani A, Misaki J, Isaka T (2017). *Front Physiol* 8:183. doi:10.3389/fphys.2017.00183. PMID 28392769. PMC5364859. ABS.
59. Gandevia SC, McKenzie DK (1988). Activation of human muscles at short muscle lengths during maximal static efforts. *J Physiol* 407:599–613. doi:10.1113/jphysiol.1988.sp017434. PMID 3256627. PMC1191222. FT (scanned).
60. Gatev P, Thomas S, Kepple T, Hallett M (1999). *J Physiol* 514:915–928. doi:10.1111/j.1469-7793.1999.915ad.x. PMID 9882761. ABS.
61. Genadry WF, Kearney RE, Hunter IW (1988). *Med Biol Eng Comput* 26:489–496. doi:10.1007/BF02441916. PMID 3256738. SEC.
62. Getz EB, Cooke R, Lehman SL (1998). *Biophys J* 75:2971–2983. doi:10.1016/S0006-3495(98)77738-0. PMID 9826617. PMC1299968. ABS.
63. Golkar MA, Sobhani Tehrani E, Kearney RE (2017). *Front Comput Neurosci* 11:35. doi:10.3389/fncom.2017.00035. PMID 28579954. PMC5437117. FT.
64. Gonçalves AD, Pezarat-Correia P, Vila-Chã C, Mendonça GV (2023). *Sleep Sci* 16:e454–e461. doi:10.1055/s-0043-1776869. PMID 38197028. PMC10773507. FT.
65. Gordon RJFH, Moss JN, Castelli F, Reeve T, Diss CE, Tyler CJ, Tillin NA (2023). *Eur J Appl Physiol* 123:1067–1080. doi:10.1007/s00421-022-05127-7. PMID 36637508. PMC10119217. FT.
66. Grootenhuis A, Hiereth FC, Škarabot J, Oßwald M, Del Vecchio A, Gruber M, Ruggiero L (2025). *Scand J Med Sci Sports* 35:e70065. doi:10.1111/sms.70065. PMID 40350716. PMC12066930. FT.
67. Ha PL, Dalton BE, Alesi MG, Smith TM, VanDusseldorp TA, Feito Y, Hester GM (2022). *J Musculoskelet Neuronal Interact* 22:504–513. PMID 36458388. PMC9716306. FT.
68. Hahn D, Seiberl W, Schwirtz A (2007). *Eur J Appl Physiol* 100:701–709. doi:10.1007/s00421-007-0462-3. PMID 17476525. ABS.
69. Hahn D, Seiberl W, Schmidt S, Schweizer K, Schwirtz A (2010). *J Biomech* 43:1503–1508. doi:10.1016/j.jbiomech.2010.01.041. PMID 20167325. ABS.
70. Hali K, Zero AM, Rice CL (2021). Effect of ankle joint position on triceps surae contractile properties and motor unit discharge rates. *Physiol Rep* 8:e14680 (PubMed pub. date 2021). doi:10.14814/phy2.14680. PMID 33356017. PMC7757371. FT.
71. Hamada T, Sale DG, MacDougall JD, Tarnopolsky MA (2000). *J Appl Physiol* 88:2131–2137. doi:10.1152/jappl.2000.88.6.2131. PMID 10846027. ABS.
72. Hannah R, Minshull C, Smith SL, Folland JP (2014). *Med Sci Sports Exerc* 46:963–972. doi:10.1249/MSS.0000000000000188. PMID 24126965. ABS.
73. Hansen P, Bojsen-Moller J, Aagaard P, Kjaer M, Magnusson SP (2006). Mechanical properties of the human patellar tendon, in vivo. *Clin Biomech* 21:54–58. doi:10.1016/j.clinbiomech.2005.07.008. PMID 16183183. ABS.
74. Hasson CJ, Gelina O, Woo G (2016). *Front Hum Neurosci* 10:59. doi:10.3389/fnhum.2016.00059. PMID 26973487. PMC4771770. Used only as the secondary source for Winters & Stark 1988.
75. Herzog W (2018). The multiple roles of titin in muscle contraction and force production. *Biophys Rev* 10:1187–1199. doi:10.1007/s12551-017-0395-y. PMID 29353351. PMC6082311. FT-W.
76. Hill DK (1968). *J Physiol* 199:637–684. doi:10.1113/jphysiol.1968.sp008672. PMID 5710425. ABS.
77. Hof AL (1998). In vivo measurement of the series elasticity release curve of human triceps surae muscle. *J Biomech* 31:793–800. doi:10.1016/s0021-9290(98)00062-1. PMID 9802779. ABS.
78. Hof AL, van den Berg J (1981). EMG to force processing I–IV. *J Biomech* 14:747–758, 759–770, 771–785, 787–792. PMIDs 7334035–7334038. Not read.
79. Horak FB, Nashner LM (1986). *J Neurophysiol* 55:1369–1381. doi:10.1152/jn.1986.55.6.1369. PMID 3734861. ABS.
80. Hu X, Murray WM, Perreault EJ (2011). Muscle short-range stiffness can be used to estimate the endpoint stiffness of the human arm. *J Neurophysiol* 105:1633–1641. doi:10.1152/jn.00537.2010. PMID 21289133. PMC3075303. FT.
81. Hufschmidt A, Schwaller I (1987). *J Physiol* 391:451–465. doi:10.1113/jphysiol.1987.sp016749. PMID 3443955. PMC1192225. FT (scanned).
82. Hunter IW, Kearney RE (1982). *J Biomech* 15:747–752. doi:10.1016/0021-9290(82)90089-6. PMID 7153227. ABS.
83. Hunter IW, Kearney RE (1983). *J Biomech* 16:985–991. doi:10.1016/0021-9290(83)90099-4. PMID 6671989. ABS.
84. Ito M, Kawakami Y, Ichinose Y, Fukashiro S, Fukunaga T (1998). *J Appl Physiol* 85:1230–1235. doi:10.1152/jappl.1998.85.4.1230. PMID 9760310. ABS.
85. Jones RL, Barnett CT, Davidson J, Maritza B, Fraser WD, Harris R, Sale C (2017). *Eur J Appl Physiol* 117:867–879. doi:10.1007/s00421-017-3569-1. PMID 28349262. PMC5388709. FT.
86. Joumaa V, Herzog W (2013). *J Biomech* 46:1135–1139. doi:10.1016/j.jbiomech.2013.01.008. PMID 23422864. ABS.
87. Joyce GC, Rack PM, Westbury DR (1969). *J Physiol* 204:461–474. doi:10.1113/jphysiol.1969.sp008924. PMID 5824647. PMC1351564. ABS.
88. Kawakami Y, Ichinose Y, Fukunaga T (1998). *J Appl Physiol* 85:398–404. doi:10.1152/jappl.1998.85.2.398. PMID 9688711. ABS.
89. Kearney RE, Hunter IW (1982). *J Biomech* 15:753–756. doi:10.1016/0021-9290(82)90090-2. PMID 7153228. ABS.
90. Kearney RE, Stein RB, Parameswaran L (1997). *IEEE Trans Biomed Eng* 44:493–504. doi:10.1109/10.581944. PMID 9151483. ABS + SEC.
91. Kellis E (2016). *J Electromyogr Kinesiol* 26:111–119. doi:10.1016/j.jelekin.2015.11.007. PMID 26710667. ABS.
92. Ker RF (1981). Dynamic tensile properties of the plantaris tendon of sheep. *J Exp Biol* 93:283–302. doi:10.1242/jeb.93.1.283. PMID 7288354. ABS.
93. Kiemel T, Elahi AJ, Jeka JJ (2008). *J Neurophysiol* 100:3394–3406. doi:10.1152/jn.01272.2007. PMID 18829854. PMC2604857. FT-W.
94. Kiemel T, Zhang Y, Jeka JJ (2011). *J Neurosci* 31:15144–15153. doi:10.1523/JNEUROSCI.1013-11.2011. PMID 22016548. PMC3470452. FT-W.
95. Kirk EA, Gilmore KJ, Rice CL (2018). Neuromuscular changes of the aged human hamstrings. *J Neurophysiol* 120:480–488. doi:10.1152/jn.00794.2017. PMID 29668388. PMC6139447. FT.
96. Kirsch RF, Rymer WZ (1992). *J Neurophysiol* 68:449–470. doi:10.1152/jn.1992.68.2.449. PMID 1527569. ABS.
97. Kongsgaard M, Nielsen CH, Hegnsvad S, Aagaard P, Magnusson SP (2011). Mechanical properties of the human Achilles tendon, in vivo. *Clin Biomech* 26:772–777. doi:10.1016/j.clinbiomech.2011.02.011. PMID 21392868. ABS.
98. Konow N, Azizi E, Roberts TJ (2012). Muscle power attenuation by tendon during energy dissipation. *Proc R Soc B* 279:1108–1113. doi:10.1098/rspb.2011.1435. PMID 21957134. PMC3267137. FT.
99. Krätschmer R, Stingl M, Holzer D, Paternoster FK (2025). *Sci Rep* 15:25378. doi:10.1038/s41598-025-10477-1. PMID 40659770. PMC12260023. FT.
100. Krylow AM, Sandercock TG (1997). *J Biomech* 30:27–33. doi:10.1016/S0021-9290(96)00097-8. PMID 8970921. Not read; source of Millard 2013's benchmark data.
101. Kubo K, Kanehisa H, Kawakami Y, Fukunaga T (2001). *J Appl Physiol* 90:520–527. doi:10.1152/jappl.2001.90.2.520. PMID 11160050. ABS.
102. Kubo K, Kanehisa H, Fukunaga T (2001). Effects of different duration isometric contractions on tendon elasticity in human quadriceps muscles. *J Physiol* 536:649–655. doi:10.1111/j.1469-7793.2001.0649c.xd. PMID 11600697. PMC2278867. FT.
103. Kubo K, Kanehisa H, Fukunaga T (2002). Effects of resistance and stretching training programmes on the viscoelastic properties of human tendon structures in vivo. *J Physiol* 538:219–226. doi:10.1113/jphysiol.2001.012703. PMID 11773330. PMC2290007. FT.
104. Kubo K, Kawakami Y, Kanehisa H, Fukunaga T (2002). *Scand J Med Sci Sports* 12:3–8. doi:10.1034/j.1600-0838.2002.120102.x. PMID 11985759. ABS.
105. Kubo K, Kanehisa H, Fukunaga T (2003). *Eur J Appl Physiol* 88:520–526. doi:10.1007/s00421-002-0744-8. PMID 12560950. ABS.
106. Kubo K, Akima H, Ushiyama J, Tabata I, Fukuoka H, Kanehisa H, Fukunaga T (2004). *Br J Sports Med* 38:324–330. doi:10.1136/bjsm.2003.005595. PMID 15155437. PMC1724819. ABS.
107. Lanza MB, Balshaw TG, Folland JP (2019). *Eur J Appl Physiol* 119:1735–1746. doi:10.1007/s00421-019-04163-0. PMID 31115654. PMC6647239. FT.
108. Lee HD, Suter E, Herzog W (1999). *J Appl Physiol* 87:1651–1655. doi:10.1152/jappl.1999.87.5.1651. PMID 10562604. ABS.
109. Lee HD, Suter E, Herzog W (2000). *J Biomech* 33:917–923. doi:10.1016/s0021-9290(00)00070-1. PMID 10828321. ABS.
110. Lee HD, Herzog W (2002). Force enhancement following muscle stretch of electrically stimulated and voluntarily activated human adductor pollicis. *J Physiol* 545:321–330. doi:10.1113/jphysiol.2002.018010. PMID 12433972. PMC2290659. FT.
111. Lee HD, Herzog W (2003). *J Physiol* 551:993–1003. doi:10.1113/jphysiol.2002.037333. PMID 12815187. PMC2343298. ABS.
112. Lichtwark GA, Wilson AM (2005). In vivo mechanical properties of the human Achilles tendon during one-legged hopping. *J Exp Biol* 208:4715–4725. doi:10.1242/jeb.01950. PMID 16326953. ABS.
113. Linari M, Woledge RC, Curtin NA (2003). Energy storage during stretch of active single fibres from frog skeletal muscle. *J Physiol* 548:461–474. doi:10.1113/jphysiol.2002.032185. PMID 12598584. PMC2342853. ABS + FT-W.
114. Lloyd DG, Besier TF (2003). An EMG-driven musculoskeletal model to estimate muscle forces and knee joint moments in vivo. *J Biomech* 36:765–776. doi:10.1016/S0021-9290(03)00010-1. PMID 12742444. ABS.
115. Loram ID, Lakie M (2002). Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. *J Physiol* 545:1041–1053. doi:10.1113/jphysiol.2002.025049. PMID 12482906. PMC2290720. FT.
116. Loram ID, Maganaris CN, Lakie M (2005a). Human postural sway results from frequent, ballistic bias impulses by soleus and gastrocnemius. *J Physiol* 564:295–311. doi:10.1113/jphysiol.2004.076307. PMID 15661824. PMC1456055. FT-W.
117. Loram ID, Maganaris CN, Lakie M (2005b). Active, non-spring-like muscle movements in human postural sway. *J Physiol* 564:281–293. doi:10.1113/jphysiol.2004.073437. PMID 15661825. PMC1456051. FT.
118. Loram ID, Maganaris CN, Lakie M (2007a). The passive, human calf muscles in relation to standing: the non-linear decrease from short range to long range stiffness. *J Physiol* 584:661–675. doi:10.1113/jphysiol.2007.140046. PMID 17823209. PMC2277155. FT.
119. Loram ID, Maganaris CN, Lakie M (2007b). The passive, human calf muscles in relation to standing: the short range stiffness lies in the contractile component. *J Physiol* 584:677–692. doi:10.1113/jphysiol.2007.140053. PMID 17823208. PMC2277144. FT.
120. Ludvig D, Perreault EJ (2014). *Conf Proc IEEE EMBC* 2014:1599–1602. doi:10.1109/EMBC.2014.6943910. PMID 25570278. PMC6219385. FT.
121. Ludvig D, Plocharski M, Plocharski P, Perreault EJ (2017). *Exp Brain Res* 235:2959–2970. doi:10.1007/s00221-017-5032-2. PMID 28712015. PMC6190719. FT.
122. Mackey DC, Robinovitch SN (2006). *Gait Posture* 23:59–68. doi:10.1016/j.gaitpost.2004.11.009. PMID 16311196. ABS.
123. MacNeil JB, Kearney RE, Hunter IW (1992). *IEEE Trans Biomed Eng* 39:1213–1225. doi:10.1109/10.184697. PMID 1487284. ABS.
124. Maffiuletti NA, Aagaard P, Blazevich AJ, Folland J, Tillin N, Duchateau J (2016). Rate of force development: physiological and methodological considerations. *Eur J Appl Physiol* 116:1091–1116. doi:10.1007/s00421-016-3346-6. PMID 26941023. PMC4875063. FT.
125. Maganaris CN (2000). *J Biomech* 33:375–379. doi:10.1016/s0021-9290(99)00188-8. PMID 10673122. ABS.
126. Maganaris CN, Baltzopoulos V, Sargeant AJ (1998a). Changes in Achilles tendon moment arm from rest to maximum isometric plantarflexion. *J Physiol* 510:977–985. doi:10.1111/j.1469-7793.1998.977bj.x. PMID 9660906. PMC2231068. FT.
127. Maganaris CN, Baltzopoulos V, Sargeant AJ (1998b). In vivo measurements of the triceps surae complex architecture in man. *J Physiol* 512:603–614. doi:10.1111/j.1469-7793.1998.603be.x. PMID 9763648. PMC2231202. FT.
128. Maganaris CN, Baltzopoulos V, Sargeant AJ (1999). *Clin Biomech* 14:661–666. doi:10.1016/s0268-0033(99)00018-2. PMID 10521650. ABS.
129. Maganaris CN, Baltzopoulos V, Sargeant AJ (2000). *Eur J Appl Physiol* 83:363–369. doi:10.1007/s004210000247. PMID 11138576. ABS.
130. Maganaris CN, Paul JP (1999). In vivo human tendon mechanical properties. *J Physiol* 521:307–313. doi:10.1111/j.1469-7793.1999.00307.x. PMID 10562354. PMC2269645. FT.
131. Maganaris CN, Paul JP (2000a). Load-elongation characteristics of in vivo human tendon and aponeurosis. *J Exp Biol* 203:751–756. doi:10.1242/jeb.203.4.751. PMID 10648216. ABS.
132. Maganaris CN, Paul JP (2000b). Hysteresis measurements in intact human tendon. *J Biomech* 33:1723–1727. doi:10.1016/s0021-9290(00)00130-5. PMID 11006400. ABS.
133. Maganaris CN, Paul JP (2002). Tensile properties of the in vivo human gastrocnemius tendon. *J Biomech* 35:1639–1646. doi:10.1016/s0021-9290(02)00240-3. PMID 12445617. ABS.
134. Magnusson SP, Aagaard P, Dyhre-Poulsen P, Kjaer M (2001). Load-displacement properties of the human triceps surae aponeurosis in vivo. *J Physiol* 531:277–288. doi:10.1111/j.1469-7793.2001.0277j.x. PMID 11179410. PMC2278435. FT.
135. Magnusson SP, Hansen P, Aagaard P, Brønd J, Dyhre-Poulsen P, Bojsen-Moller J, Kjaer M (2003). Differential strain patterns of the human gastrocnemius aponeurosis and free tendon, in vivo. *Acta Physiol Scand* 177:185–195. doi:10.1046/j.1365-201X.2003.01048.x. PMID 12558555. ABS.
136. Malamud JG, Godt RE, Nichols TR (1996). *J Neurophysiol* 76:2280–2289. doi:10.1152/jn.1996.76.4.2280. PMID 8899603. ABS.
137. Mallah J, Occhipinti LG (2026). *Front Sports Act Living* 8:1888675. doi:10.3389/fspor.2026.1888675. PMID 42730156. PMC13563653. Used only as a secondary source for the Thelen 2003 ageing changes.
138. Marsh E, Sale D, McComas AJ, Quinlan J (1981). Influence of joint position on ankle dorsiflexion in humans. *J Appl Physiol* 51:160–167. doi:10.1152/jappl.1981.51.1.160. PMID 7263411. ABS.
139. Martinez-Valdes E, Negro F, Botter A, Pincheira PA, Cerone GL, Falla D, Lichtwark GA, Cresswell AG (2022). *J Appl Physiol* 133:1136–1148. doi:10.1152/japplphysiol.00758.2021. PMID 36227169. PMC9639771. FT.
140. Masani K, Vette AH, Kawashima N, Popovic MR (2008). Neuromusculoskeletal torque-generation process has a large destabilizing effect on the control mechanism of quiet standing. *J Neurophysiol* 100:1465–1475. doi:10.1152/jn.00801.2007. PMID 18596181. ABS.
141. Mayfield DL, Cresswell AG, Lichtwark GA (2016). Effects of series elastic compliance on muscle force summation and the rate of force rise. *J Exp Biol* 219:3261–3270. doi:10.1242/jeb.142604. PMID 27510960. ABS.
142. Mayfield DL, Cronin NJ, Lichtwark GA (2023). Understanding altered contractile properties in advanced age: insights from a systematic muscle modelling approach. *Biomech Model Mechanobiol* 22:309–337. doi:10.1007/s10237-022-01651-9. PMID 36335506. PMC9958200. FT.
143. Mehrabi N, Sharif Razavian R, Ghannadi B, McPhee J (2016). *Front Comput Neurosci* 10:143. doi:10.3389/fncom.2016.00143. PMID 28133449. PMC5233688. Used only as a secondary source for Thelen's 15/50 ms. Author list after the first author not re-checked.
144. Millard M, Uchida T, Seth A, Delp SL (2013). Flexing computational muscle: modeling and simulation of musculotendon dynamics. *J Biomech Eng* 135:021005. doi:10.1115/1.4023390. PMID 23445050. PMC3705831. FT.
145. Mirbagheri MM, Barbeau H, Kearney RE (2000). Intrinsic and reflex contributions to human ankle stiffness: variation with activation level and position. *Exp Brain Res* 135:423–436. doi:10.1007/s002210000534. PMID 11156307. ABS.
146. Mirbagheri MM, Barbeau H, Ladouceur M, Kearney RE (2001). *Exp Brain Res* 141:446–459. doi:10.1007/s00221-001-0901-z. PMID 11810139. ABS.
147. Momb BA, Chipkin SR, Kent JA, Miller MS (2026). *J Physiol* 604:6465–6487. doi:10.1113/JP289946. PMID 42459137. PMC13423134. FT.
148. Mugge W, Abbink DA, Schouten AC, Dewald JP, van der Helm FC (2010). A rigorous model of reflex function indicates that position and force feedback are flexibly tuned to position and force tasks. *Exp Brain Res* 200:325–340. doi:10.1007/s00221-009-1985-0. PMID 19714322. PMC2821582. FT.
149. Muraoka T, Muramatsu T, Fukunaga T, Kanehisa H (2004). Influence of tendon slack on electromechanical delay in the human medial gastrocnemius in vivo. *J Appl Physiol* 96:540–544. doi:10.1152/japplphysiol.01015.2002. PMID 14527969. ABS.
150. Muramatsu T, Muraoka T, Takeshita D, Kawakami Y, Hirano Y, Fukunaga T (2001). *J Appl Physiol* 90:1671–1678. doi:10.1152/jappl.2001.90.5.1671. PMID 11299254. ABS.
151. Narici MV, Binzoni T, Hiltbrand E, Fasel J, Terrier F, Cerretelli P (1996). *J Physiol* 496:287–297. doi:10.1113/jphysiol.1996.sp021685. PMID 8910216. PMC1160844. ABS.
152. Nordez A, Gallot T, Catheline S, Guével A, Cornu C, Hug F (2009). Electromechanical delay revisited using very high frame rate ultrasound. *J Appl Physiol* 106:1970–1975. doi:10.1152/japplphysiol.00221.2009. PMID 19359617. ABS.
153. Olney SJ, Winter DA (1985). Predictions of knee and ankle moments of force in walking from EMG and kinematic data. *J Biomech* 18:9–20. doi:10.1016/0021-9290(85)90041-7. PMID 3980492. ABS.
154. Onambélé GN, Burgess K, Pearson SJ (2007). Gender-specific in vivo measurement of the structural and mechanical properties of the human patellar tendon. *J Orthop Res* 25:1635–1642. doi:10.1002/jor.20404. PMID 17568426. ABS.
155. Oskouei AE, Herzog W (2005). *J Appl Physiol* 98:2087–2095. doi:10.1152/japplphysiol.01217.2004. PMID 15705725. ABS.
156. Oskouei AE, Herzog W (2006a). *Eur J Appl Physiol* 97:280–287. doi:10.1007/s00421-006-0167-z. PMID 16596318. ABS.
157. Oskouei AE, Herzog W (2006b). *Eur J Appl Physiol* 98:22–29. doi:10.1007/s00421-006-0170-4. PMID 16850317. ABS.
158. Ota K, Sasaki K (2023). *Physiol Rep* 11:e15802. doi:10.14814/phy2.15802. PMID 37620102. PMC10449604. FT.
159. Pääsuke M, Ereline J, Gapeyeva H (1999). *Eur J Appl Physiol* 80:448–451. doi:10.1007/s004210050616. PMID 10502078. ABS.
160. Pasma JH, van Kordelaar J, de Kam D, Weerdesteyn V, Schouten AC, van der Kooij H (2017). *J NeuroEng Rehabil* 14:97. doi:10.1186/s12984-017-0299-x. PMID 28915821. PMC5603100. FT.
161. Pasma JH, Boonstra TA, van Kordelaar J, Spyropoulou VV, Schouten AC (2017). *Front Comput Neurosci* 11:99. doi:10.3389/fncom.2017.00099. PMID 29163116. PMC5664365. FT.
162. Paternoster FK, Seiberl W, Hahn D, Schwirtz A (2016). *J Biomech* 49:773–779. doi:10.1016/j.jbiomech.2016.02.015. PMID 26903409. ABS.
163. Peltonen J, Cronin NJ, Stenroth L, Finni T, Avela J (2013). Viscoelastic properties of the Achilles tendon in vivo. *SpringerPlus* 2:212. doi:10.1186/2193-1801-2-212. PMID 23710431. PMC3661039. FT.
164. Petit J, Filippi GM, Emonet-Dénand F, Hunt CC, Laporte Y (1990a). *J Neurophysiol* 63:190–197. doi:10.1152/jn.1990.63.1.190. PMID 2299381. ABS.
165. Petit J, Filippi GM, Gioux M, Hunt CC, Laporte Y (1990b). *J Neurophysiol* 64:1724–1732. doi:10.1152/jn.1990.64.6.1724. PMID 2074460. ABS.
166. Pfeifer S, Vallery H, Hardegger M, Riener R, Perreault EJ (2012). Model-based estimation of knee stiffness. *IEEE Trans Biomed Eng* 59:2604–2612. doi:10.1109/TBME.2012.2207895. PMID 22801482. PMC3643895. FT.
167. Pijnappels M, Bobbert MF, van Dieën JH (2005). *J Biomech* 38:627–634. doi:10.1016/j.jbiomech.2004.03.029. PMID 15652564. ABS.
168. Pinniger GJ, Steele JR, Thorstensson A, Cresswell AG (2000). *Eur J Appl Physiol* 81:375–383. doi:10.1007/s004210050057. PMID 10751098. ABS.
169. Pinniger GJ, Steele JR, Cresswell AG (2003). *Eur J Appl Physiol* 90:191–198. doi:10.1007/s00421-003-0893-4. PMID 14504953. ABS.
170. Pinniger GJ, Cresswell AG (2007). Residual force enhancement after lengthening is present during submaximal plantar flexion and dorsiflexion actions in humans. *J Appl Physiol* 102:18–25. doi:10.1152/japplphysiol.00565.2006. PMID 16946022. ABS.
171. Power GA, Rice CL, Vandervoort AA (2012). Increased residual force enhancement in older adults is associated with a maintenance of eccentric strength. *PLoS One* 7:e48044. doi:10.1371/journal.pone.0048044. PMID 23133544. PMC3479122. FT.
172. Power GA, Makrakos DP, Rice CL, Vandervoort AA (2013). *Physiol Rep* 1:e00004. doi:10.1002/phy2.4. PMID 24303098. PMC3831934. FT.
173. Rack PM, Westbury DR (1974). The short range stiffness of active mammalian muscle and its effect on mechanical properties. *J Physiol* 240:331–350. doi:10.1113/jphysiol.1974.sp010613. PMID 4424163. PMC1331019. FT (scanned).
174. Raiteri BJ, Hahn D (2019). A reduction in compliance or activation level reduces residual force depression in human tibialis anterior. *Acta Physiol* 225:e13198. doi:10.1111/apha.13198. PMID 30300958. ABS.
175. Reeves ND, Maganaris CN, Narici MV (2003). Effect of strength training on human patella tendon mechanical properties of older individuals. *J Physiol* 548:971–981. doi:10.1113/jphysiol.2002.035576. PMID 12626673. PMC2342903. FT.
176. Reeves ND, Narici MV (2003). *J Appl Physiol* 95:1090–1096. doi:10.1152/japplphysiol.01046.2002. PMID 12740314. SEC.
177. Richards AJ, Malekzadeh R, Elghobashy ME, Laham R, Power GA, Paris MT, Cheng AJ (2025). *Scand J Med Sci Sports* 35:e70061. doi:10.1111/sms.70061. PMID 40318171. PMC12046540. FT.
178. Roberts TJ, Konow N (2013). How tendons buffer energy dissipation by muscle. *Exerc Sport Sci Rev* 41:186–193. doi:10.1097/JES.0b013e3182a4e6d5. PMID 23873133. PMC3836820. FT.
179. Robinovitch SN, Heller B, Lui A, Cortez J (2002). Effect of strength and speed of torque development on balance recovery with the ankle strategy. *J Neurophysiol* 88:613–620. doi:10.1152/jn.2002.88.2.613. PMID 12163514. ABS.
180. Rockenfeller R, Günther M, Schmitt S, Götz T (2015). Comparative sensitivity analysis of muscle activation dynamics. *Comput Math Methods Med* 2015:585409. doi:10.1155/2015/585409. PMID 26417379. PMC4568353. FT.
181. Rousanoglou EN, Oskouei AE, Herzog W (2007). *J Biomech* 40:1–8. doi:10.1016/j.jbiomech.2005.12.002. PMID 16443230. ABS.
182. Sakanaka TE, Gill J, Lakie MD, Reynolds RF (2018). Intrinsic ankle stiffness during standing increases with ankle torque and passive stretch of the Achilles tendon. *PLoS One* 13:e0193850. doi:10.1371/journal.pone.0193850. PMID 29558469. PMC5860743. FT.
183. Sakanaka TE, Lakie M, Reynolds RF (2021). *PLoS One* 16:e0244993. doi:10.1371/journal.pone.0244993. PMID 33481823. PMC7822306. FT.
184. Sale D, Quinlan J, Marsh E, McComas AJ, Belanger AY (1982). Influence of joint position on ankle plantarflexion in humans. *J Appl Physiol* 52:1636–1642. doi:10.1152/jappl.1982.52.6.1636. PMID 7107473. ABS.
185. Salvaggio F, Bizet B, D'Emanuele S, Trinchi M, Berbenni T, Rainoldi A, Schena F, Tarperi C, Monte A, Boccia G (2026). *Scand J Med Sci Sports* 36:e70328. doi:10.1111/sms.70328. PMID 42390228. PMC13326521. FT.
186. Sasajima S, Yasuda A, Kosaka T, Kubo K (2023). Effect of relaxation time on hysteresis of human tendon in vivo. *J Musculoskelet Neuronal Interact* 23:84–89. PMID 36856103. PMC9976180. FT.
187. Schoenberg M, Wells JB (1984). *Biophys J* 45:389–397. doi:10.1016/S0006-3495(84)84163-6. PMID 6607749. ABS.
188. Seiberl W, Hahn D, Kreuzpointner F, Schwirtz A, Gastmann U (2010). *J Appl Biomech* 26:256–264. doi:10.1123/jab.26.3.256. PMID 20841616. ABS.
189. Seiberl W, Paternoster F, Achatz F, Schwirtz A, Hahn D (2013). On the relevance of residual force enhancement for everyday human movement. *J Biomech* 46:1996–2001. doi:10.1016/j.jbiomech.2013.06.014. PMID 23845729. ABS.
190. Seiberl W, Power GA, Herzog W, Hahn D (2015). *Physiol Rep* 3:e12401. doi:10.14814/phy2.12401. PMID 25975646. PMC4463830. ABS.
191. Seynnes OR, Bojsen-Møller J, Albracht K, et al. (2015). Ultrasound-based testing of tendon mechanical properties: a critical evaluation. *J Appl Physiol* 118:133–141. doi:10.1152/japplphysiol.00849.2014. PMID 25414247. ABS.
192. Sinkjaer T, Toft E, Andreassen S, Hornemann BC (1988). Muscle stiffness in human ankle dorsiflexors: intrinsic and reflex components. *J Neurophysiol* 60:1110–1121. doi:10.1152/jn.1988.60.3.1110. PMID 3171659. ABS.
193. Stein RB, Parmiggiani F (1979). *Can J Physiol Pharmacol* 57:1189–1192. doi:10.1139/y79-178. PMID 509373. ABS.
194. Stienen AH, Schouten AC, Schuurmans J, van der Helm FC (2007). *J Comput Neurosci* 23:333–348. doi:10.1007/s10827-007-0037-7. PMID 17503169. PMC2799624. Used only as a secondary source for Winters & Stark 1985. Author list after the first author not re-checked.
195. Sundberg CW, Hunter SK, Trappe SW, Smith CS, Fitts RH (2018). Effects of elevated H⁺ and Pi on the contractile mechanics of skeletal muscle fibres from young and old men. *J Physiol* 596:3993–4015. doi:10.1113/JP276018. PMID 29806714. PMC6117549. FT.
196. Teigen LE, Sundberg CW, Kelly LJ, Hunter SK, Fitts RH (2020). Ca²⁺ dependency of limb muscle fiber contractile mechanics in young and older adults. *Am J Physiol Cell Physiol* 318:C1238–C1251. doi:10.1152/ajpcell.00575.2019. PMID 32348175. PMC7311743. FT.
197. Thelen DG (2003). Adjustment of muscle mechanics model parameters to simulate dynamic contractions in older adults. *J Biomech Eng* 125:70–77. doi:10.1115/1.1531112. PMID 12661198. ABS + SEC.
198. Thelen DG, Schultz AB, Alexander NB, Ashton-Miller JA (1996). Effects of age on rapid ankle torque development. *J Gerontol A Biol Sci Med Sci* 51:M226–M232. doi:10.1093/gerona/51a.5.m226. PMID 8808994. ABS.
199. Thelen DG, Muriuki M, James J, Schultz AB, Ashton-Miller JA, Alexander NB (2000). *J Electromyogr Kinesiol* 10:93–101. doi:10.1016/s1050-6411(99)00028-0. PMID 10699557. ABS.
200. Thomas DO, Sagar G, White MJ, Davies CT (1988). Electrically evoked isometric and isokinetic properties of the triceps surae in young male subjects. *Eur J Appl Physiol Occup Physiol* 58:321–326. doi:10.1007/bf00417270. PMID 3220074. ABS.
201. Tillin NA, Jimenez-Reyes P, Pain MT, Folland JP (2010). *Med Sci Sports Exerc* 42:781–790. doi:10.1249/MSS.0b013e3181be9c7e. PMID 19952835. ABS.
202. Tillin NA, Pain MT, Folland JP (2012). Contraction type influences the human ability to use the available torque capacity of skeletal muscle during explosive efforts. *Proc R Soc B* 279:2106–2115. doi:10.1098/rspb.2011.2109. PMID 22258636. PMC3321696. FT-W.
203. Toninelli N, Coratella G, Longo S, Romani GM, Doria C, Rampichini S, Limonta E, Esposito F, Cè E (2024). *PLoS One* 19:e0300112. doi:10.1371/journal.pone.0300112. PMID 38530855. PMC10965097. FT.
204. Tsaopoulos DE, Baltzopoulos V, Richards PJ, Maganaris CN (2007). *J Biomech* 40:3325–3332. doi:10.1016/j.jbiomech.2007.05.005. PMID 17606267. ABS.
205. Tsaopoulos DE, Baltzopoulos V, Richards PJ, Maganaris CN (2009). *Eur J Appl Physiol* 105:809–814. doi:10.1007/s00421-008-0968-3. PMID 19125279. ABS.
206. Van Cutsem M, Duchateau J, Hainaut K (1998). Changes in single motor unit behaviour contribute to the increase in contraction speed after dynamic training in humans. *J Physiol* 513:295–305. doi:10.1111/j.1469-7793.1998.295by.x. PMID 9782179. PMC2231276. FT-W.
207. Van Cutsem M, Duchateau J (2005). *J Physiol* 562:635–644. doi:10.1113/jphysiol.2004.074567. PMID 15539402. PMC1665520. FT-W.
208. van der Kooij H, Peterka RJ (2011). Non-linear stimulus-response behavior of the human stance control system is predicted by optimization of a system with sensory and motor noise. *J Comput Neurosci* 30:759–778. doi:10.1007/s10827-010-0291-y. PMID 21161357. PMC3108015. FT.
209. Vandervoort AA, McComas AJ (1983). A comparison of the contractile properties of the human gastrocnemius and soleus muscles. *Eur J Appl Physiol Occup Physiol* 51:435–440. doi:10.1007/bf00429079. PMID 6685041. ABS.
210. Venkadesan M, Valero-Cuevas FJ (2009). Effects of neuromuscular lags on controlling contact transitions. *Phil Trans R Soc A* 367:1163–1179. doi:10.1098/rsta.2008.0261. PMID 19218157. PMC2635488. FT.
211. Vette AH, Masani K, Tan J, Abe M, Nakazawa K, Popovic MR (2007). Modulation of proportional and derivative (PD) control command can match physiological ankle torque modulation during quiet standing. *Proc Canadian Medical and Biological Engineering Society (CMBES)* 30(1). https://proceedings.cmbes.ca/index.php/proceedings/article/view/204. No DOI or PMID. FT (PDF).
212. Vlutters M, Boonstra TA, Schouten AC, van der Kooij H (2015). *J Biomech* 48:1258–1263. doi:10.1016/j.jbiomech.2015.03.004. PMID 25843262. ABS.
213. Webber S, Kriellaars D (1997). *J Appl Physiol* 83:40–45. doi:10.1152/jappl.1997.83.1.40. PMID 9216942. ABS.
214. Weiss PL, Hunter IW, Kearney RE (1988). Human ankle joint stiffness over the full range of muscle activation levels. *J Biomech* 21:539–544. doi:10.1016/0021-9290(88)90217-5. PMID 3410857. ABS.
215. Welch TD, Ting LH (2009). A feedback model explains the differential scaling of human postural responses to perturbation acceleration and velocity. *J Neurophysiol* 101:3294–3309. doi:10.1152/jn.90775.2008. PMID 19357335. PMC2694108. FT.
216. Westing SH, Seger JY, Thorstensson A (1990). *Acta Physiol Scand* 140:17–22. doi:10.1111/j.1748-1716.1990.tb08971.x. PMID 2275401. ABS.
217. White MJ, Davies CT, Brooksby P (1984). *Q J Exp Physiol* 69:685–691. doi:10.1113/expphysiol.1984.sp002860. PMID 6514993. ABS.
218. Winters JM, Stark L (1985). *IEEE Trans Biomed Eng* 32:826–839. doi:10.1109/TBME.1985.325498. PMID 4054926. SEC.
219. Winters JM, Stark L (1988). Estimated mechanical properties of synergistic muscles involved in movements of a variety of human joints. *J Biomech* 21:1027–1041. doi:10.1016/0021-9290(88)90249-7. PMID 2577949. SEC.
220. Yavuz SU, Sendemir-Urkmez A, Türker KS (2010). Effect of gender, age, fatigue and contraction level on electromechanical delay. *Clin Neurophysiol* 121:1700–1706. doi:10.1016/j.clinph.2009.10.039. PMID 20430696. ABS.
221. Zajac FE (1989). Muscle and tendon: properties, models, scaling, and application to biomechanics and motor control. *Crit Rev Biomed Eng* 17:359–411. PMID 2676342. No DOI. ABS.
222. Zhang LQ, Nuber G, Butler J, Bowen M, Rymer WZ (1998). In vivo human knee joint dynamic properties as functions of muscle contraction and joint position. *J Biomech* 31:71–76. doi:10.1016/S0021-9290(97)00106-1. PMID 9596540. ABS.
223. Zhou S, Lawson DL, Morrison WE, Fairweather I (1995). Electromechanical delay in isometric muscle contractions evoked by voluntary, reflex and electrical stimulation. *Eur J Appl Physiol Occup Physiol* 70:138–145. doi:10.1007/BF00361541. PMID 7768236. ABS.

---

## Appendix A. Arithmetic behind the [E] values

All computations were done by the compiler in Python (numerical integration, dt = 10–50 µs). The scripts live in the session scratchpad and are not part of the repository.

### A.1 Formulas

| Quantity | Formula |
|---|---|
| First-order lag τ | 10–90 % = 2.197 τ; peak slope of a unit step = 1/τ |
| Critically damped second order (ωn) | Unit-step 10–90 % = 3.358/ωn. Impulse-response peak (twitch-equivalent TPT) = 1/ωn. Half-relaxation of the impulse response, measured from its peak = 1.678/ωn, so HRT/TPT = 1.68. Peak slope of a unit step = ωn/e. Fraction of the step reached at time t: 1 − e^(−ωn·t)(1 + ωn·t) |
| Low-frequency group delay of a second-order low-pass | 2ζ/ωn |
| Joint-level stiffness from tendon stiffness | K = k·r². With F = M/r, K scales ≈ ∝ r if the moment arm changes with contraction |
| Joint-level SRS from muscle SRS (single muscle) | K_SRS,joint = γ·F·r²/l_opt = γ·T·r/l_opt |
| Series combination | K = K1·K2/(K1 + K2) |
| Model-free lower bound on 10–90 % rise from a peak rate R (% of final per ms) | ≥ 80/R ms |

### A.2 Second-order filters cited in §3 (unit step and impulse)

| Filter | ωn (rad/s) | ζ | 10–90 % (ms) | t10 (ms) | Impulse peak (ms) | HRT from peak (ms) | Group delay 2ζ/ωn (ms) |
|---|---|---|---|---|---|---|---|
| Mugge 2010 mean (2.68 Hz) | 16.84 | 0.99 | 196.5 | 31.5 | 59.6 | 99.1 | 118 |
| Mugge −1 SD (1.90 Hz) | 11.94 | 0.99 | 277.2 | 44.5 | 84.0 | 139.8 | — |
| Mugge +1 SD (3.46 Hz) | 21.74 | 0.99 | 152.2 | 24.4 | 46.1 | 76.8 | — |
| Pasma JNER 2017 (1.48 Hz) | 9.30 | 1.30 | 524.2 | 60.4 | 97.9 | 214.0 | 280 |
| Kiemel 2008, low amplitude | 6.90 | 1.03 | 508.4 | 77.5 | 143.5 | 247.4 | 299 |
| Kiemel 2008, high amplitude | 7.64 | 0.97 | 420.3 | 69.2 | 132.2 | 216.0 | 254 |
| Kiemel 2011 | 9.9 | 1.5 | 591.7 | 58.9 | 86.9 | 224.7 | 303 |
| Masani 2008 (T = 0.152 s) | 6.58 | 1.0 | 510.4 | 80.8 | 152.0 | 255.1 | 304 |
| Masani ± 1 SD (T 0.125 / 0.179 s) | 8.00 / 5.59 | 1.0 | 419.8 / 601.1 | — | 125 / 179 | — | — |
| Vette 2007 T = 63 / 97 / 116 ms | 15.87 / 10.31 / 8.62 | 1.0 | 211.6 / 325.7 / 389.5 | — | 63 / 97 / 116 | — | 126 / 194 / 232 |
| Genadry 1988 (ζ = 1 assumed) | 8 / 12 | 1.0 | 419.8 / 279.8 | — | — | — | — |
| First order τ = 15 / 40 / 50 ms | — | — | 33.0 / 87.9 / 109.9 | — | — | — | 15 / 40 / 50 |

### A.3 Two-lag cascade used for §12

**Model:** first-order activation (τ_act rising, τ_deact falling) followed by a first-order force lag τ_c. For the twitch, the input is a 5 ms excitation pulse.

| τ_act / τ_deact / τ_c (ms) | Twitch CT (ms) | Twitch HRT (ms) | Step 10–90 % (ms) | Step 90–10 % fall (ms) |
|---|---|---|---|---|
| 15 / 50 / 20 | 33.0 | 56.4 | 59.0 | 123.2 |
| 15 / 50 / 40 | 47.0 | 75.3 | 97.4 | 151.5 |
| 15 / 50 / 60 | 57.1 | 92.1 | 138.7 | 185.0 |
| 15 / 50 / 80 | 65.1 | 107.8 | 181.1 | 221.1 |
| 15 / 50 / 100 | 71.7 | 122.8 | 223.9 | 258.9 |
| 15 / 50 / 120 | 77.4 | 137.3 | 266.9 | 298.1 |
| 15 / 50 / 150 | 84.8 | 158.6 | 330.4 | 358.6 |
| 10 / 40 / 100 | 63.4 | 112.7 | 221.4 | 246.4 |

**Reading:**
- With a 15/50 ms first-order activation and a 5 ms pulse, no linear τ_c reproduces the human triceps surae twitch: CT ≈ 110–124 ms with HRT < CT.
- CT saturates near 85 ms while HRT exceeds CT.
- This is the same rise/fall mismatch as in §3.3. It is why §12 specifies separate τ_c,rise and τ_c,fall and calibrates against step-rise and relaxation targets rather than twitch shape.
- Mayfield 2023 reproduced the human twitch only with a steep Ca²⁺ nonlinearity (Hill n = 3) and slower Ca²⁺ kinetics.

### A.4 Cascade inversion: τ_c that reproduces a target (activation 15/50 ms)

The contraction lag uses τ_c,rise while force is below activation and τ_c,fall while it is above.

| Target step 10–90 % rise (ms) | 150 | 200 | 250 | 300 | 350 | 450 | 600 |
|---|---|---|---|---|---|---|---|
| τ_c,rise (ms) | 65 | 89 | 112 | 135 | 158 | 205 | 278 |

| Target 90–10 % fall (ms) | 120 | 175 | 250 | 300 | 360 |
|---|---|---|---|---|---|
| τ_c,fall (ms) | 17 | 54 | 95 | 121 | 151 |

The minimum fall with τ_deact = 50 ms and a negligible τ_c,fall is 110 ms.

### A.5 Critically damped fits to reported torque–time fractions (§9)

Each point solves 1 − e^(−x)(1 + x) = f with x = ωn·t.

| Data set | ωn per point (rad/s) | Implied 10–90 % (ms) |
|---|---|---|
| Knee extensors, Tillin 2012 "101°": 2 / 12 / 31 / 46 / 58 / 67 % at 25–150 ms | 8.6, 11.9, 15.0, 15.5, 15.6, 15.4 | 215–391 (all points); 215–224 (≥ 75 ms) |
| Knee extensors, Tillin 2012 "155°": 11 / 29 / 50 / 65 / 74 % at 50–150 ms | 11.3, 14.3, 16.8, 17.8, 17.6 | 189–298 (all); 189–235 (≥ 75 ms) |
| Knee extensors, Buckthorpe 2013: 22.8 / 60.1 / 78.8 % at 50 / 100 / 150 ms | 18.0, 20.3, 19.4 | 166–186 |
| Dorsiflexors, Grootenhuis 2025: 15.5 / 48 / 69 % at 50 / 100 / 150 ms | 14.0, 16.2, 16.0 | 208–241 |
| Plantarflexors, Ando 2021: 35.3–40.7 % at 100 ms; 61–68 % at 200 ms | 10.3–14.0 | 240–326 |
| Dorsiflexors, Richards 2025, 50 Hz: 61–64 % at 100 ms | 20.6–21.8 | 154–163 |
| Triceps surae peak tetanic rate (Thomas 1988): 0.36 / 0.48 % P0/ms | 9.8 / 13.0 (ωn = e·R) | 343 / 257 |
| Same peak rate under other shape assumptions | First order: τ = 278 / 208 ms → 610 / 458 ms. Two-lag (τ1 = 15 ms): τ2 = 230 / 164 ms → 506 / 362 ms | — |

### A.6 Joint stiffness conversions

| Source value | r (m) | K_joint (N·m/rad) |
|---|---|---|
| TA tendon 62 / 161 N/mm (Maganaris & Paul 1999) | 0.036 (measured) | 80 / 209 |
| Achilles tendon + aponeurosis 467 / 494 N/mm (Magnusson 2001) | 0.051 (measured) | 1215 / 1285 |
| Achilles 145 / 231 N/mm (Lichtwark & Wilson) | 0.05 (assumed) | 362 / 578 |
| Achilles 193 / 207 N/mm (Peltonen) | 0.05 (assumed) | 482 / 518 |
| Free Achilles 759 / 2622 N/mm (Magnusson 2003; Kongsgaard) | 0.05 (assumed) | 1898 / 6555 |
| Patellar tendon 1652 / 4334 N/mm | 0.048 (assumed) | 3806 / 9986 |
| Patellar tendon 232 / 2187 N/mm (older adults, 0–10 % / 90–100 % force) | 0.048 (assumed) | 535 / 5039 |
| VL tendon–aponeurosis secant 5834 N / 11.6 mm = 503 N/mm | 0.048 (assumed) | 1159 |
| Loram & Lakie 2002: 5 N·m/deg per leg | — | 286 |
| Loram 2007b: 0.77 × 11.0 N·m/deg (both legs) / 2 | — | 243 per leg |

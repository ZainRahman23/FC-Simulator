# Balance muscles, sensory channels and no-step benchmarks: literature for BALANCE-1

**Literature review for preregistering muscle parameters, controller delays and a no-step qualification battery (Touchline Physical Character V2, BALANCE-1)**

Compiled 12 Oct 2026. Desk research only. No simulation code was changed, and nothing in this file was tuned against the simulator.

This review **extends** two earlier repository reviews and does not repeat them:
- `muscle1/research/FORCE_PRODUCTION_LITERATURE.md` (MUSCLE-1): ankle plantarflexors, ankle dorsiflexors, knee extensors, knee flexors (borrowed). Its §9 method and Appendix A.4 cascade inversion are reused here unchanged.
- `ppr3/research/POSTURAL_TIMING_CONTROL_LITERATURE.md` (PPR-3 timing): stretch-reflex and APR latencies, GVS soleus latencies, ankle-level control models, COM/COP sway norms, Rietdyk 1999 pelvis pushes.
- `ppr3/research/STANDING_TONE_LITERATURE.md` (PPR-3 tone): quiet-standing EMG % MVC for hip, trunk and neck. §13 (Part 3f) only adds what that review lacks.
- `ppr2/research/STANDING_SUBSTRATE_LITERATURE.md` §5 and `abi1/research/BALANCE_LITERATURE.md` §4–§8: feet-in-place thresholds and strategy mechanics, used as leads.

---

## 0. Conventions, access and method

### 0.1 Labels

| Label | Meaning |
|---|---|
| **[M]** | Measured human value, as reported by the authors. |
| **[E]** | Derived by the compiler from measured values. The arithmetic is stated in the row or in Appendix A. |
| **[MODEL]** | A parameter fitted, assumed or chosen inside a published model. |
| **[D]** | Design choice. Used only in §19 (Recommendation). |
| **[UNVERIFIED]** | The compiler could not confirm the value from an accessible primary source in this session. |

### 0.2 Access codes (per reference)

| Code | Meaning |
|---|---|
| **FT** | Full text read (PMC / Europe PMC XML or an open PDF). "FT-W" = full text read through a web-fetch summariser that quotes sentences; slightly weaker. |
| **ABS** | Abstract only (PubMed / Europe PMC record). |
| **SEC** | The value comes from another paper that cites the original; the original was not read. The citing paper is named. |

### 0.3 How the search was done

- **WebSearch was unavailable** (session quota exhausted). Sources were found through the Europe PMC REST API (field-restricted queries), NCBI E-utilities (exact PubMed abstracts) and open full texts (Europe PMC / PMC XML, parsed as XML so that "<" and ">" in text are preserved — the abstract-parsing bug reported in MUSCLE-1 §0.3 cannot recur).
- Six parallel research passes covered: hip muscles; trunk and neck muscles; ankle invertors/evertors and arm anchors; sensory channels and state estimation; ML/AP push thresholds; joint coordination, head stabilisation and joint-level sway. Each pass logged a verbatim quote for every number. The compiler re-checked the numbers that carry weight in §19 against the PubMed abstract or full text (marked "re-checked").
- Publisher sites (Elsevier, Springer, Wiley, physiology.org) mostly return HTTP 403, so many classic papers are **ABS only**. Pre-2000 *J Physiol* papers are in PMC as scans without text and are treated as ABS unless stated.
- Raw notes and quotes are in the session scratchpad (`balance1/notes_*.md`), not in the repository.

### 0.4 Definitions (as MUSCLE-1 §0.4)

| Term | Definition |
|---|---|
| **TPT / CT** | Twitch time to peak (contraction time), from torque onset unless stated. |
| **HRT** | Half-relaxation time, peak → 50 % of peak. |
| **10–90 % rise / 90–10 % fall** | Time between the 10 % and 90 % levels of a step change in torque. |
| **EMD** | Electromechanical delay: EMG (or M-wave) onset → force onset. |
| **RTD** | Rate of torque (force) development. "% MVC at t ms" = torque t ms after onset as a fraction of maximal voluntary torque. |
| **TMG** | Tensiomyography: radial *displacement* of the muscle belly after a single electrical twitch. Tc = time from 10 % to 90 % of maximal displacement; Td = delay to 10 %; Tr = 90 → 50 % on relaxation. **Displacement, not force**; used here only to rank muscles, never as a torque time. |
| **mgh** | Body weight × COM height. |
| **XcoM** | Extrapolated COM, x + v/ω₀, ω₀ = √(g/l) (Hof et al. 2005). |

### 0.5 Method used to convert measurements into step-rise and relaxation descriptors

Identical to MUSCLE-1 §9 and Appendix A (formulas repeated in Appendix A here):
- **Twitch TPT → critically damped descriptor:** ωn = 1/TPT, 10–90 % step rise = 3.358 × TPT.
- **Fraction-of-peak voluntary curves:** solve 1 − e^(−x)(1 + x) = f, x = ωn·t, for each reported (t, f) point; 10–90 % = 3.358/ωn. Points earlier than ≈ 75 ms are reported but not used for the central value (onset delay and recruitment are not modelled), as in MUSCLE-1.
- **Peak rate R (% of final per ms):** model-free lower bound on 10–90 % rise ≥ 80/R ms.
- **Relaxation:** 90–10 % fall ≈ 2.0 × HRT (critically damped fall shape, as MUSCLE-1 used for the knee extensors), cross-checked against first-order (2.197 τ) readings of relaxation rates where available.
- **Calibration of the twitch shortcut against the already-adopted groups [E].** For the three groups MUSCLE-1 parameterised from multiple methods, the adopted central step rise is 2.35 × central TPT for dorsiflexors (200/85 ms) and knee extensors (200/85 ms) and 2.83 × for plantarflexors (325/115 ms); the twitch-only critically damped value (3.358 × TPT) is 1.2–1.4× slower than the adopted multi-method value. The adopted central relaxation is 1.9 × (PF 175/90), 1.9 × (KE 160/85) and 2.8 × (DF 250/90; tetanic HRT basis) the central twitch HRT. Where a new group has *only* twitch or fibre-type evidence, these empirical ratios (rise 2.3–2.8 × TPT; fall 1.9–2.8 × HRT) are used to state ranges, and the group is flagged as a sensitivity-range group.
- **Cascade inversion (Appendix A.3):** the target rise and fall are converted into τc,rise and τc,fall for the cascade u → 2-step (8.3 ms) pure delay → first-order activation (15 ms rise / 50 ms fall) → first-order contraction lag (τc,rise while developed force < activation, τc,fall otherwise). The compiler's re-implementation reproduces MUSCLE-1 A.4 (200 ms → 88.8 ms; 175 ms fall → 54.2 ms). The pure delay shifts onset only and does not change the 10–90 % or 90–10 % times.
- **Fibre type as a proxy.** Across human muscles, twitch speed increases with type II fraction (Hamada et al. 2000: quadriceps TPT 61 vs 86 ms at 72 vs 39 % type II; MUSCLE-1 §2.1). Fibre type is used only as a *rank* argument (slower or faster than an anchor muscle with known kinetics), because tendon compliance, architecture and moment arm also set whole-muscle torque kinetics (MUSCLE-1 §4.4).

---

## 1. Bottom line

### Part 1 — muscle force development

1. **No direct step-response evidence for the balance muscles.** For the hip, trunk, neck and frontal-plane ankle muscles, no human study in accessible sources gives an electrically evoked twitch or tetanus time course measured as joint torque. Every descriptor below is [E] from voluntary rapid-contraction data, reflex-driven torque responses, fibre type or model fits, converted with the MUSCLE-1 §9 method.
2. **Step-rise descriptors (10–90 %):**
   - **Hip:** ≈ 200–400 ms (central 280 ms abductors/adductors, 300 ms extensors/flexors).
   - **Trunk:** ≈ 200–500 ms (central 300–320 ms; very weak evidence).
   - **Neck:** ≈ 180–300 ms (central 240 ms; the best-supported new group).
   - **Ankle invertors/evertors:** ≈ 200–450 ms (central 300 ms).
   - **Elbow flexors:** ≈ 150–250 ms (central 210 ms).
3. **Relaxation is essentially unmeasured** except for the elbow (twitch HRT 37–63 ms) and indirectly the SCM (≈ 230 ms [E]). All other falls are declared sensitivity ranges of 120–300 ms (§19.1).
4. **Hip and trunk force is not faster than ankle force,** even though their neural loops are faster.
   - Standing EMG→torque fits: hip/lower trunk 544–660 ms vs ankle 420–592 ms.
   - Same-protocol voluntary RTD: hip 198–275 ms vs plantarflexion 210–225 ms.
   - Fibre type ranks torque kinetics poorly across muscles (TA ≈ 73 % type I yet faster than the triceps surae), so it is used only as a bound.

### Part 2 — sensory channels and delays

5. **Delays to excitation, by channel:**
   - vestibular → neck ≈ 22 ms (8–25);
   - vestibular → trunk ≈ 65 ms (45–110);
   - vestibular → legs ≈ 110 ms (sway-driving component);
   - plantar/foot-load → legs ≈ 80 ms (75–100);
   - neck proprioception → legs ≈ 80 ms (70–100);
   - task-level body/COM state → hip/trunk ≈ 75 ms, → ankle ≈ 100 ms (PPR-3).
6. **There is no measurable "COM estimation delay".** The operational value is the latency of COM-scaled EMG, ≈ 70–130 ms.
7. **Perception thresholds bound the information available.** Whole-body sway is perceived at ≈ 0.0005–0.002 rad/s, ≈ 0.003 rad; vestibular-only thresholds are ≈ 10× higher.
8. **Prediction: what humans can and cannot do.**
   - Predicting one's own body state over the delay is consistent with every fitted model. Trained humans stand with total loop delays of ≈ 500–560 ms, beyond the ≈ 300–340 ms critical delay of non-predictive PD, but at ≈ 38× sway variance.
   - Naive humans fail at +200–300 ms added delay.
   - Disturbances are not predicted: unpredictable perturbations produce no anticipatory activity, and foreknowledge of direction does not shorten the ≈ 70–80 ms response.

### Part 3 — human benchmarks for a no-step battery

9. **Feet-in-place thresholds, brief pelvis pushes, young adults, scaled to 73.9 kg:**
   - forward ≈ 16–23 N·s (0.22–0.31 m/s);
   - backward ≈ 11–16 N·s (0.15–0.22 m/s);
   - both ≈ 0.40–0.46 of the zero-delay XcoM limit (up to ≈ 0.6 for 100 ms pulls under "try not to step");
   - lateral at hip-to-shoulder width ≈ 20–26 N·s (0.27–0.35 m/s), low confidence;
   - no human data at the character's 0.42 m stance.
10. **ML recovery is hip load/unload.**
    - Hips supply ≈ 85–90 % of the corrective moment.
    - Gluteus medius/TFL respond first (≈ 70–80 ms), the contralateral adductor at ≈ 110 ms.
    - Vertical load shifts between the feet from ≈ 100 ms.
11. **Response shape:**
    - peak COM excursion ≈ (0.24–0.34 s) × Δv, reached at 0.4–0.6 s;
    - small overshoot;
    - upright again within ≈ 1 s; settled in 2–3 s;
    - knee flexion ≈ 4–5°;
    - hip contribution grows continuously with push size; no pure hip strategy;
    - peak ankle torque is suppressed before the flat-foot limit (≈ 0.073 × body weight × height in young adults) is reached.
12. **Quiet stance and head:**
    - within-trial joint-angle SD: ankle 0.21°, knee 0.18°, hip 0.30°, neck 0.31° (fills a PPR-3 gap);
    - trunk and legs in phase below ≈ 0.8 Hz, anti-phase above ≈ 1.1 Hz;
    - the head is **not** stabilised in space in standing; it moves with the trunk, and neck muscles stay quiet during body perturbations.

---

# PART 1 — Force development and relaxation of the balance muscle groups not yet parameterised

**What exists, in one sentence.** For every group in Part 1, **no electrically or magnetically evoked twitch time-to-peak, half-relaxation, or tetanic rise/relaxation measured as joint torque was found** in accessible human sources. The exceptions are the elbow flexors and triceps brachii (§6) and indirect relaxation data for the sternocleidomastoid (§4). Everything else rests on voluntary rapid-contraction data, reflex-driven torque responses, EMD, fibre type and model fits. All §2–§5 descriptors are therefore **sensitivity-range values** (§19.1).

## 2. Hip extensors, flexors, abductors and adductors

### 2.1 Evoked twitch and tetanus

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Twitch TPT / HRT, any hip group | **Not found** | Searches for hip-flexor, gluteal, obturator-nerve and superior/inferior-gluteal-nerve stimulation returned only animal work and voluntary-activation studies | — |
| Evoked hip-flexion torque | [M] Magnetic stimulation of iliopsoas gave higher torque than electrical stimulation of sartorius + TFL + rectus femoris. **No timing values** in the abstract | 11 healthy volunteers, isometric hip flexion | Ito, Tsubahara & Watanabe 2013 (ABS) |
| Hamstrings (knee-flexion torque) | Already in MUSCLE-1 (Kirk 2018: TPT 95.8 ± 41.6 ms, partial recruitment). No hip-extension-torque twitch found | — | MUSCLE-1 §2.1 |

### 2.2 Voluntary rapid isometric torque (RTD)

**Same-protocol, multi-joint data (the most useful for ranking against the already-adopted groups).**

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Peak torque (N·m/kg), basketball / running / tennis | [M] Abduction 1.91 / 1.78 / 1.88; adduction 1.88 / 1.86 / 1.91; extension 2.21 / 2.13 / 2.16; flexion 1.89 / 1.80 / 1.90 | **327 professional athletes** as stated (the paper's sub-groups, 163 basketball, 102 tennis and 49 runners, sum to 314; 118 F), 18.6 ± 8.1 y, 71.2 kg, 1.79 m. MuscleBoard dynamometer, seated, hip ≈ 45° flexion, load cell just above the malleoli; 450 Hz; onset at 3 % of peak torque; peak torque = maximal 1-s mean | Kozinc, Smajla & Šarabon 2021 (FT, re-checked Table 3) |
| RTD 0–50 / 0–100 ms (N·m/kg/s), same order | [M] Abduction 5.07–5.65 / 7.71–8.21; adduction 5.12–5.96 / 7.96–9.10; extension 5.01–5.65 / 8.22–8.58; flexion 4.20–4.50 / 6.47–6.66 | Same | Same |
| Same athletes, **knee and ankle** (calibration rows) | [M] Knee extension PT 2.40 / 2.96 / 3.38, RTD100 10.01 / 15.35 / 19.14; ankle plantarflexion PT 3.63–3.64, RTD100 15.14–16.21; ankle dorsiflexion PT 0.96–1.07, RTD100 5.06–5.82 | Same protocol and session | Same |
| Torque rise above onset at 50 / 100 ms, % of peak | [E] (RTD × t)/PT. Abduction 13–16 / 42–43 %; adduction 14–16 / 43–48 %; extension 11–13 / 38–40 %; flexion 11–12 / 35–36 %. **Knee extension 18–33 / 42–57 %; plantarflexion 18 / 44–45 %; dorsiflexion 28–29 / 52–54 %** | Ratio of group means; add ≈ 3 % for the onset threshold | Arithmetic on Kozinc 2021 |
| RTD 0–50 / 100 / 150 / 200 ms (N·m/kg/s) and peak torque (N·m/kg), hand-held dynamometer (HHD) | [M] Flexion 2.64 / 3.90 / 4.61 / 4.49, PT 1.27; extension 3.54 / 4.71 / 5.32 / 5.33, PT 1.80; abduction 3.30 / 4.06 / 4.22 / 3.93, PT 1.29; adduction 2.89 / 3.66 / 3.75 / 3.35, PT 1.08 | 30 healthy (13 M), 30 ± 8 y. Belt-stabilised HHD **sampled at 40 Hz**; onset = baseline + 2 N·m; PT from separate 3-s trials | McNabb et al. 2024 (FT, re-checked) |
| Torque at 50 / 100 / 150 / 200 ms, % PT | [E] Flexion 10 / 31 / 54 / 71 %; extension 10 / 26 / 44 / 59 %; abduction 13 / 32 / 49 / 61 %; adduction 13 / 34 / 52 / 62 % | Arithmetic on the rows above (e.g. extension 200 ms: 5.33 × 0.2 / 1.80) | McNabb 2024 |
| Bilateral long-lever adduction squeeze / abduction press: MVC; RFD 0–100, 0–200 ms | [M] Squeeze 175.3 N; 700.0, 535.2 N/s. Press 156.2 N; 844.1, 574.0 N/s | 20 healthy 18–40 y; supine, HHD between the ankles, 100 Hz, onset 6.7 N | Ishøi et al. 2023 (FT) |
| Force at 100 / 200 ms, % MVC | [E] Squeeze 40 / 61 %; press 54 / 74 % | Arithmetic | Ishøi 2023 |
| Peak (steepest-slope) RTD, standing bilateral hip abduction / adduction | [M] Younger **213.7 ± 20.5 / 179.5 ± 16.8 N·m/s** (mean ± SE); older 73.3 / 145.3 | 15 younger (29 y) and 15 older (71 y); Biodex, 30° abduction, standing frame | Inacio, Creath & Rogers 2019 (FT) |
| Torque at 50 / 100 / 150 / 200 ms, % MVT, older adults | [E] Abduction 20 / 44 / 56 / 59 %; adduction 3 / 12 / 24 / 38 % | 14 adults, 71 y; standing Biodex; visual onset | Lanza et al. 2020 (FT) |
| Normalised RTD, hip extensors | [M] Women 11.6 ± 1.3, men 13.1 ± 0.9 MVT/s. Window and definition not in the abstract | Healthy adults; drop-jump study | Stearns-Reider & Powers 2018 (ABS) |
| Hip-extension and hip-flexion RTD, young vs old; fallers | Relative differences only (elderly 62–68 % lower) | — | Palmer 2015, 2017; Farrow & Palmer 2021; Morcelli 2016a,b (ABS) |
| Time to peak RTD, ballistic time to peak torque, relaxation rate | **Not found** for any hip group | — | — |
| Data sets rejected | Kim 2025 and Yoo 2025: derived torque at 200 ms = 96–133 % of peak (internally inconsistent). Lanza 2021: 40 Hz HHD shows almost no rise from 50 to 100 ms | — | (FT) |

### 2.3 EMD

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Gluteus medius voluntary EMD | "about 50–66 ms" [SEC; UNVERIFIED]. Attributed to Kim 2011 (values not in the abstract) and Dieterich 2015 | — | Anders et al. 2021 (FT) citing Kim 2011 (ABS) and Dieterich 2015 (ABS) |
| EMG onset → ultrasound tissue-motion onset (not torque) | [M] Gluteus medius median 33 (IQR 53) ms; gluteus minimus 17 (IQR 63) ms | 9 healthy, isometric abduction, fine-wire EMG | Dieterich et al. 2015 (ABS) |
| Evoked EMD, any hip group | **Not found** | — | — |

The Anders "50–66 ms" cannot be reconciled with Dieterich's 17–33 ms (a different end-point). For the model, use the ≈ 10–20 ms evoked and ≈ 20–30 ms voluntary EMD of MUSCLE-1 by analogy; the delay does not affect 10–90 % times.

### 2.4 Fibre type (% type I)

| Muscle | Value | Subjects/method | Source (access) |
|---|---|---|---|
| Gluteus maximus / iliopsoas / biceps femoris / rectus femoris / adductor magnus / sartorius | [M] 52.4 / 49.2 / 66.9 / 38.1 [E, mean of 3 sites] / 58.4 [E, mean of 2 sites] / 49.6 % | Autopsy, 6 males 17–30 y, mATPase | Johnson et al. 1973 (SEC: values read from the Queeno 2023 dataset cells) |
| % MHC-I protein (not fibre count): gluteus maximus 75.2, **gluteus medius 86**, iliacus 76.7, psoas 64.2, adductor longus 61.7, adductor magnus 76.1, TFL 62.8, rectus femoris 49.7, vastus lateralis 48.3, soleus 68.1, TA 79.4 | [M] | 6 cadavers, 83 ± 3 y, SDS-PAGE | Tirrell et al. 2012 (ABS + SEC via Queeno dataset) |
| Biceps femoris long head, biopsy | [M] MHC-I 47.1 ± 9.1 % (32.6–71.0) | 31 young men | Evangelidis et al. 2017 (ABS) |
| Psoas major | [M] "predominance of type IIA" cranially vs caudally; no numbers accessible | 15 young males | Arbanas et al. 2009 (ABS) |

**Reading [E].** The hip muscles are mixed (≈ 40–70 % type I in young adults by Johnson; higher in the elderly Tirrell sample, which also gives vastus lateralis 48 % and soleus only 68 %, so absolute values are not comparable across the two studies). Gluteus medius has the highest % MHC-I of the hip muscles in Tirrell's sample (86 %), above TA (79 %) and tibialis posterior (80 %). Fibre type alone places the hip groups between the knee extensors (adopted rise 200 ms) and the triceps surae (325 ms).

### 2.5 Tensiomyography (radial displacement, not force)

| Muscle | Tc | Subjects | Source (access) |
|---|---|---|---|
| Rectus femoris / biceps femoris / semitendinosus | [M] 29.3 / 28.7 / 41.4 ms (pooled means); Tr 70.2 / 57.6 / 63.5 ms | Meta-analysis of 25 studies of soccer players | Paravlic 2025 (FT) |
| Gluteus maximus | [M] position medians 38.6–50.8 ms | 52 elite female footballers | Sučka et al. 2026 (FT) |

**Not used for torque timing.** In the same meta-analysis, gastrocnemius has the *shortest* Tc (≈ 21–22 ms), whereas the triceps surae has the slowest torque twitch of the leg groups (MUSCLE-1). TMG Tc ranks fibre type *within* a muscle (r = 0.88 with % MHC-I in vastus lateralis, Šimunič 2011, ABS; r = 0.76–0.90 across nine muscles, Dahmane 2005, ABS) but does not rank whole-joint torque kinetics *across* muscles.

### 2.6 Derived step-rise and relaxation descriptors for the hip [E]

Critically damped fits to the fraction-of-peak data (Appendix A.2, method §0.5):

| Data set | Points used | Implied 10–90 % rise |
|---|---|---|
| Kozinc 2021, 100 ms point (raw / +3 % onset) | abduction; adduction; extension; flexion | **215–233; 198–230; 228–257; 249–275 ms** |
| Same protocol, calibration groups | knee extension; plantarflexion; dorsiflexion | 167–235; 210–225; 174–194 ms |
| McNabb 2024 (HHD 40 Hz), points ≥ 100 ms | abduction; adduction; extension; flexion | 295–327; 279–320; 335–338; 272–301 ms |
| Ishøi 2023 long-lever | press (abduction); squeeze (adduction) | 186–257; 244–325 ms |
| Lanza 2020, older adults, points ≥ 100 ms | abduction; adduction | 223–338; 509–580 ms |
| Kiemel 2008/2011 standing "hip" EMG→hip torque fits (RF, BF, ES, RA weighted) [MODEL] | ωn 9.4–12.1 rad/s, ζ 1.50–1.65 | **544–660 ms**, vs 420–592 ms for the ankle fits in the same papers (ratio 0.92–1.49) |

**Calibration against the adopted groups [E].** In the Kozinc protocol, dorsiflexion (174–194 ms) and knee extension (167–235 ms) come out close to their MUSCLE-1 adopted values (200 ms each). Plantarflexion (210–225 ms) comes out ≈ 1.46× faster than its adopted 325 ms. The adopted plantarflexor value leans on twitch and standing-fit data. Scaling the hip Kozinc values by 1.0 (DF/KE calibration) to 1.46 (PF calibration) gives **≈ 200–400 ms**. The HHD (McNabb) values, 272–338 ms, and the ratio of Kiemel's standing hip/ankle fits (0.9–1.5 × the plantarflexor value) fall inside that span.

**Relaxation.** No hip relaxation data of any kind were found. A design range is needed (§19.1).

**Ordering [E].** In the two multi-group data sets, abduction ≈ adduction ≥ extension ≥ flexion in speed (Kozinc); McNabb has extension the slowest. The differences (≈ 10–25 %) are smaller than the method spread.

## 3. Trunk / lumbar muscle groups

### 3.1 Evoked kinetics

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Twitch TPT/HRT or tetanic rise/relaxation as torque, erector spinae, multifidus, rectus abdominis, obliques, quadratus lumborum | **Not found** | Only TMS voluntary-activation studies, FES papers, and abdominal *pressure* twitches | — |
| Back-extensor superimposed twitch | [M] "Time-to-peak amplitude decreased linearly with increasing voluntary torque" (no numbers). Voluntary activation during MVC 67.71 ± 5.22 % | 16 healthy; TMS; back-extension dynamometry | Lagan et al. 2008 (ABS) |
| Abdominal-flexor voluntary activation | [M] 86.20 ± 2.29 % at 100 % MVC | 20 healthy; TMS | Szepietowski et al. 2025 (ABS) |
| Abdominal twitch gastric pressure (T10 magnetic) | [M] 23.5 ± 5.4 cmH₂O (amplitude only); contraction time and half-relaxation were measured by Tiller 2017 but are in an image table [UNVERIFIED] | 6 healthy; 7 healthy men | Kyroussis 1996 (ABS); Tiller 2017 (FT text) |

**Low voluntary activation of the back extensors (≈ 68 %)** means that % MVC normalisations for the trunk understate true capacity.

### 3.2 Voluntary rapid force, EMD and EMG→force lags

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Time to peak torque of a submaximal ballistic trunk *extension* ("shoot and release" to 60 % MVC) | [M] **462.74 ± 149.71 ms** | 21 healthy (11 M/10 F), 24 y; standing, LIDO isometric | Boucher, Normand & Descarreaux 2013 (FT) |
| Same task, dorsiflexion, for scale | [M] Ballistic dorsiflexion time to peak torque **136 ms** across 5–75 % MVC targets | 7 adults | Van Cutsem & Duchateau 2005 (MUSCLE-1 §2.4) |
| Trunk MVC, standing | [M] Flexion 236.2 N·m, extension 346.5 N·m (means) | 10 men, 26 y | Descarreaux et al. 2005 (FT) |
| Multi-joint back pull (knee 141°, hip 124°): peak force; peak RFD | [M] Trained 3229 N, 21 006 N/s; recreational 2540 N, 8011 N/s. [E] Peak RFD/PF 6.5 and 3.2 s⁻¹ | 27 trained, 41 recreational men | Zemková et al. 2019 (FT) |
| Lumbar erector spinae voluntary EMD, isometric back extension | [M] **Standing 69.9 ms**; kneeling 79.7; sitting 94.1 ms | 19 participants | Fagbemigun, Cavallo & Brown 2023 (ABS) |
| Residual EMG→effort lag in slow trunk ramps | [M] 31–196 ms by muscle (after correcting the up/down slope difference; uncorrected 261–658 ms) | 23 healthy, standing, pelvis fixed; indwelling RA, IO, EO, longissimus, iliocostalis, multifidus | Stokes 2005 (ABS) |
| EMG→force optimal time shift, rapid cyclic trunk efforts | [M] **111–218 ms**, longer for extensors than flexors | 10 young men; 0.33–1.0 Hz cycling to 20–60 % MVC | Thelen, Schultz & Ashton-Miller 1994 (ABS) |
| Quick-release: agonist shut-off / antagonist switch-on | [M] 53 / 70 ms (healthy); 70 / 83 ms (chronic LBP) | 17 + 17; semi-seated | Radebold et al. 2000 (ABS) |
| Erector spinae and multifidus onset after unexpected loading over the hands | [M] 113.8–119.7 ms; external oblique 124.9–130.9 ms | 32 adults, 22 y, standing | Kocjan & Šarabon 2020 (FT) |
| Trunk RTD at fixed times as % MVC; time to 50/90 % MVC; lateral-bend or rotation RTD; relaxation | **Not found**. Kozinc 2021 measured trunk torque but explicitly did not compute trunk RTD ("questionable validity and reliability") | — | Kozinc 2021 (FT) |

### 3.3 Fibre type and TMG

| Muscle | Value | Subjects/method | Source (access) |
|---|---|---|---|
| Lumbar multifidus / longissimus | [M] **62 % / 57 % type I** (by number); type I area 70–75 % (F), 54–58 % (M) | 16 healthy, 20–30 y; biopsies | Thorstensson & Carlson 1987 (ABS) |
| Thoracic / lumbar paravertebral | [M] **74 %** (thoracic); 57 % superficial, 63 % deep (lumbar) | 21 male autopsies + 17 biopsies | Sirca & Kostevc 1985 (ABS) |
| Rectus abdominis, external and internal oblique, transversus | [M] **55–58 % type I** (range of means) | 13 surgical patients, 24–55 y | Häggmark & Thorstensson 1979 (ABS) |
| Quadratus lumborum; axial rotators as a group | **Not found** | — | — |
| TMG Tc (displacement): lumbar erector spinae; rectus abdominis | [M] 15.2–15.4 ms (sedentary men, young women); 21.0 ms (bodybuilding trainees); RA 20.6 ms | — | Yeom 2023; Lee 2024; Kim 2025 (FT) |

### 3.4 Derived descriptors for the trunk [E]

The evidence points in two directions:
- **Toward ≈ 200–300 ms (like dorsiflexors / knee extensors):** fibre type (55–74 % type I; TA 73 %, VL ≈ 40–50 %); trunk EMG→force time shifts of 111–218 ms (Thelen 1994), which sit in the same range as neuromechanical delays of the vasti (122–176 ms) and TA (150–195 ms), not the triceps surae (462–502 ms; MUSCLE-1 §2.3); multi-joint back-pull peak RFD/PF 3.2–6.5 s⁻¹, implying a critically damped 10–90 % rise of ≈ 190–390 ms (ωn = e × RFD/PF).
- **Toward ≈ 350–500 ms (slower than plantarflexors):** Kiemel 2008's standing "hip/lower-trunk" EMG→torque fit (erector spinae and rectus abdominis in the weighted signal) gives 625–660 ms vs 420–508 ms at the ankle (ratio 1.3–1.5 × the plantarflexor value, i.e. ≈ 420–490 ms if scaled to the adopted 325 ms); the submaximal ballistic trunk-extension time to peak is 463 ms, 3.4× the dorsiflexor value; lumbar erector spinae voluntary EMD is ≈ 70 ms standing (vs 18–39 ms for the knee extensors).

**No group-specific evidence separates flexors, lateral flexors and rotators** beyond Thelen's "extensors slower than flexors". These are the weakest groups in the review.

## 4. Neck (head stabilisation)

### 4.1 Evoked kinetics

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| SCM twitch maximum relaxation rate (fresh) | [M] **9.51 ± 0.64 (SEM) % force loss per 10 ms**; accelerated to > 140 % after MVC or tetanus | 10 normal subjects; stimulated SCM | Mak et al. 1991 (ABS) |
| SCM 20 : 50 Hz force ratio | [M] 73.4 ± 2.6 % | Same | Same |
| [E] First-order equivalent of the relaxation rate | τ = 10 ms / 0.0951 ≈ 105 ms → 90–10 % fall ≈ 2.197 × 105 ≈ **230 ms** | Same method as MUSCLE-1 used for the Thomas 1988 plantarflexor relaxation rate. Indicative only: a twitch rate normalised to twitch peak is assumed from the units | Arithmetic |
| Twitch TPT/HRT, any neck muscle | **Not found** | — | — |

### 4.2 Voluntary rapid force and EMD

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Time to 50 % of peak force | [M] Extension **135 ± 29**, flexion 146 ± 65, protraction 142 ± 40, left/right lateral bending 138 ± 28 / 148 ± 40 ms | **26 highly active men**, 21.6 y; seated, helmet on a load cell; "as fast as possible"; onset 2 SD above baseline for 100 ms | Almosnino, Pelland & Stevenson 2010 (FT, table read from image) |
| Peak force; peak RFD (50 ms window) | [M] Extension 253.2 N, 1614 N/s; flexion 149.7 N, 865 N/s; lateral bending 157–162 N, 1231–1351 N/s. [E] RFD/PF 5.8–8.4 s⁻¹ | Same | Same |
| Force at 50 / 100 / 150 / 200 ms, % of peak force | [E] Flexion 20 / 46 / 59 / 64 %; extension 15 / 42 / 59 / 66 %; right lateral flexion 19 / 49 / 64 / 65 %; left 21 / 54 / 68 / 66 % (from RFD over 0–t × t ÷ PF; ≈ 2–4 % higher if the 5 N threshold is added) | **26 (13 F/13 M)**, 24.2 y; reaction-time ballistic contractions against a helmet pad; 1000 Hz, 50 Hz low-pass; onset 5 N | Nagai et al. 2023 (FT, re-checked) |
| Visual reaction time to force onset | [M] 426–472 ms (by direction) | Same | Same |
| Peak RTD (steepest 100 ms) / MVC | [M] Extension 149.6–165.4 N·m/s, MVC 37.3–38.1 N·m; flexion 104.0–109.1 N·m/s, MVC 26.5–27.5 N·m. [E] 3.8–4.3 s⁻¹. Trials started from slight pre-tension | 69 military helicopter crew, 40 y | Murray et al. 2020 (FT) |
| Voluntary EMD (13-SD threshold) | [M] Extension: splenius capitis **31.0–33.1**, upper trapezius 37.4–38.3 ms; flexion: SCM **69.8–70.6** ms; lateral bend, ipsilateral muscles 38.0–63.0 ms | 21 athletic men, 21 y; MVCs against a helmet | Almosnino et al. 2009 (FT, re-checked) |

### 4.3 Fibre type

| Muscle | Value | Subjects/method | Source (access) |
|---|---|---|---|
| SCM | [M] **31.5 % pure MyHC-1** (+ 5.2 % hybrids) in young males; 44.6 % slow in older males | Autopsy | Cvetko et al. 2012; Meznaric et al. 2018 (ABS) |
| Splenius capitis | [M] **51.2 ± 9.8 %** type 1 | 13 young male autopsies | Pollak et al. 2025 (FT) |
| Trapezius descending part | [M] 66–69 % | 5 male autopsies | Lindman 1990 (SEC via Pollak 2025) |
| Longus colli / longus capitis | [M] 50.0 / 48.5 % | 4 elderly cadavers | Cornwall & Kennedy 2015 (SEC via Pollak 2025) |

### 4.4 Derived descriptors for the neck [E]

| Data | Implied 10–90 % rise |
|---|---|
| Nagai 2023, points at 100 and 150 ms | **187–256 ms** (200 ms points 297–311 ms are depressed because force plateaus at ≈ 65 % of PF in the reaction-time trials) |
| Almosnino 2010, time to 50 % PF (ωn = 1.678/T50) | 270–296 ms |
| Almosnino 2010, peak RFD/PF (ωn = e × slope) | 148–214 ms (model-free lower bound 96–138 ms) |
| Murray 2020, peak RTD/MVC | 285–327 ms (pre-tension, 100 ms window) |

**Reading.** Neck rise ≈ 190–300 ms. This is the best-supported group in Part 1 (two full-text multi-direction data sets plus one RTD study), and it is similar to the dorsiflexors and knee extensors. No direction is clearly faster; flexion (SCM, ≈ 32 % type I) has the longest EMD (≈ 70 ms) but not a slower rise. Relaxation rests only on the SCM twitch relaxation rate (≈ 230 ms [E], weak).

## 5. Ankle invertors and evertors (frontal-plane ankle)

### 5.1 Evertor torque after sudden inversion (the closest thing to a step response)

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| First (automatic) eversion torque | [M] **135 ms** after platform rotation starts; this component = **30 %** of the maximal eversion torque response | 13 young adults with stable ankles; sudden-inversion platform | Konradsen et al. 2005 (ABS, re-checked) |
| Second (voluntary) component | [M] from **305 ms** | Same | Same |
| Time to 66 % of maximal eversion torque | [M] **326 ms** unbraced; 230 ms braced; **89 ms with the peroneals pre-activated** | Same | Same |
| Peroneal EMG onset after inversion detection; first visible active eversion | [M] **54 ms; 176 ms** (trap door 30° in ≈ 80 ms) | 10 volunteers, standing | Konradsen, Voigt & Højsgaard 1997 (ABS, re-checked) |
| Peroneal reaction time to sudden inversion | [M] 56.78 ms (healthy ankles, 50° standing inversion); 68.5 ± 9.5 ms (frontal axis), 71.5 ± 8 ms (Henke's axis); peroneus brevis 63–71 ms | 46 healthy ankles; 10 healthy | Vaes, Duquet & Van Gheluwe 2002 (FT-W); Forestier & Terrier 2011 (ABS) |

### 5.2 EMD, strength and rate

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Peroneus longus evoked EMD (M-wave → lateral ground force) | [M] **10.54 ± 0.71 ms** bipedal; 8.67 ± 0.63 ms single-leg | 10 healthy, standing; common peroneal nerve stimulation | Mora, Quinteiro-Blondin & Pérot 2003 (ABS) |
| Same, single-leg | [M] 13.35 ± 3.47 ms | 16 subjects, 20 y | McLoda et al. 2009 (ABS) |
| Voluntary EMD, EMG → movement (accelerometer) | [M] 23.69 ms | 41 subjects (46 ankles), 15–29 y | Vaes 2002 (FT-W) |
| Voluntary "EMD" on an isokinetic dynamometer | [M] 122–133 ms (method-dependent; onset criteria not in the abstract) | 21 males | Flevas et al. 2017 (ABS) |
| Maximal eversion moment, full weight-bearing | [M] **50 ± 8 N·m** | 20 healthy men, 24 y; 15° inversion | Ashton-Miller et al. 1996 (ABS) |
| Maximal isometric inversion / eversion, seated | [M] 20.1 ± 6.1 / 18.9 ± 8.3 N·m | 26 adults, 22.5 y; HHD vs isokinetic | Alfuth & Hahm 2016 (FT-W) |
| Frontal-plane ankle RTD (rapid lateral → medial COP shift, single-leg stance) | [M] **162.0 ± 54.6 N·m/s** | 9 young women | Gutierrez et al. 2001 (ABS) |
| Evoked eversion twitch/tetanus; non-weight-bearing rapid eversion RTD as % MVC; any tibialis posterior timing | **Not found** | — | — |

### 5.3 Fibre type

| Muscle | Value | Source (access) |
|---|---|---|
| Peroneus longus | [M] 62.5 % type I (Johnson 1973); 55.6 % MHC-I (Tirrell 2012) | SEC via Queeno dataset |
| Peroneus brevis | [M] 61.9 % MHC-I (Tirrell) | SEC |
| **Tibialis posterior** | [M] **80 % MHC-I** (Tirrell) | SEC |
| TA (also an invertor) | [M] 73.4 / 72.7 % (Johnson, two sites); 79.4 % (Tirrell) | SEC |

### 5.4 Derived descriptors [E]

- Konradsen 2005's 66 % at 326 ms comes from a **reflex-driven, two-component** response (automatic component from 135 ms, voluntary from 305 ms). It is not a step in drive.
  - Fitting a critically damped rise to "66 % at (326 − onset) ms" gives **284 ms** if the onset is the automatic-torque onset (135 ms) and 404 ms if it is the EMG onset (54 ms).
  - With the peroneals pre-activated, 66 % at 89 ms gives ≈ 130 ms, but that starts from a non-zero torque.
- Fibre type: evertors (≈ 56–62 % type I) are mixed, like the gastrocnemius; tibialis posterior (80 %) is as slow-typed as TA (79 %), and more so than soleus (68 %), in the same sample.
- Evoked EMD (9–13 ms) matches the triceps surae and knee extensors (MUSCLE-1).
- **Reading:** frontal-plane ankle rise ≈ 200–450 ms. No relaxation data.

## 6. Shoulder and elbow: anchors only

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Elbow flexor twitch TPT / HRT | [M] **71.3 / 56.3 ms**; peak twitch 10.1 N·m | 15 untrained men, 21.7 y; elbow 90°; musculocutaneous-nerve stimulation; grand mean of two baseline sessions | Jenkins et al. 2016 (FT) |
| Elbow flexor evoked / voluntary EMD | [M] **8.1 / 38.5 ms** | Same | Same |
| Elbow flexor resting twitch, biceps-belly stimulation | [M] TPT 41.3–59.4 ms, HRT 37.3–58.3 ms (by forearm orientation, rest vs potentiated) | 11 men, 23 y; elbow 110° | Kohn, Smart & Jakobi 2018 (FT) |
| Triceps brachii twitch TPT / HRT, unpotentiated | [M] **84 ± 7 / 63 ± 13 ms**; triceps surae in the same subjects 132 ± 14 / 99 ± 13 ms | 18 men and women, 27 y | Zoughaib et al. 2026 (FT, re-checked) |
| Elbow flexion MVC; time to 30 % / 80 % MVC; time to peak RTD; peak RTD/MVC | [M] 71.4 ± 8.7 N·m; **70 ± 13 / 204 ± 55 ms**; 69 ± 12 ms; 8.01 ± 2.02 s⁻¹ | 20 untrained men, 22.9 y; "as hard and as fast as possible"; onset 5 SD | Dotan et al. 2013 (FT-W) |
| Voluntary EMD, elbow flexion (5 SD criterion) | [M] 53.6 ± 10.4 ms | Same | Same |
| Deltoid onset after support-surface rotation (standing) | [M] "commenced at **100 ms** in the young and 20–30 ms later in the elderly" | 12 young of 36; 7.5° rotations at 30–60°/s | Allum et al. 2002 (FT) |
| Shoulder-muscle onset after platform translation | [M] "very early … similar in timing to the 'automatic' ankle responses" (no ms in abstract) | — | McIlroy & Maki 1995 (ABS) |
| Fibre type: biceps / triceps / deltoid | [M] 53–61 / 33 / 57 % type I (Johnson); 55–56 / 42–48 / 64 % MHC-I (Tirrell) | — | SEC via Queeno dataset |

**Derived [E].** Elbow flexors: Dotan's 30 % at 70 ms and 80 % at 204 ms give a critically damped 10–90 % rise of **214–229 ms**; twitch TPT 41–71 ms × 3.358 gives 138–239 ms. Relaxation: HRT 37–63 ms × 1.9–2.8 → 70–176 ms, bounded below by the cascade minimum of 110 ms.

## 7. Fibre type as a proxy, and the cross-muscle synthesis

### 7.1 Anchors (% type I)

| Muscle | Johnson 1973 (6 males, 17–30 y) | Other | Adopted MUSCLE-1 rise / fall |
|---|---|---|---|
| Soleus | 86.4 / 89.0 % (two sites) | 70 % (Edgerton 1975, ABS); 68.1 % MHC-I (Tirrell) | Plantarflexors 325 / 175 ms (whole triceps surae) |
| Gastrocnemius | lateral 43.5 / 50.3 %, medial 50.8 % | ≈ 50 % (Edgerton 1975) | (part of PF) |
| Tibialis anterior | 73.4 / 72.7 % | 79.4 % (Tirrell) | Dorsiflexors 200 / 250 ms |
| Vastus lateralis | 37.8 / 46.9 % | ≈ 32 % (Edgerton); 52 % whole-muscle (Lexell 1983, ABS) | Knee extensors 200 / 160 ms |

Johnson values are SEC (Queeno 2023 dataset cells); Edgerton and Lexell are ABS.

### 7.2 What fibre type can and cannot say [E]

- **Within a muscle,** type I fraction predicts twitch speed: quadriceps TPT 61 vs 86 ms at 72 vs 39 % type II (Hamada 2000, ABS); TMG Tc vs % MHC-I r = 0.88 (Šimunič 2011, ABS).
- **Across muscles it does not rank torque kinetics reliably.** TA (≈ 73 % type I) has a *faster* torque rise (adopted 200 ms) than the whole triceps surae (≈ 50–89 % type I by head; 325 ms). Within subjects, Hucteau et al. found "no significant correlations between all muscle group pairs for doublet twitch contraction time and doublet twitch half-relaxation time" (2020, ABS). Tendon compliance and architecture (MUSCLE-1 §4.4) matter as much as fibre type.
- **Use:** fibre type only bounds a group between anchors of similar composition and architecture; it is never the sole basis of a central value here.

### 7.3 Cross-method synthesis table [E]

| Group | Evidence kind | 10–90 % rise | Relaxation evidence |
|---|---|---|---|
| Hip abductors | Voluntary RTD (Kozinc, McNabb, Ishøi; Lanza in older adults) | 186–338 ms | none |
| Hip adductors | Voluntary RTD | 198–325 ms (older adults 509–580) | none |
| Hip extensors | Voluntary RTD | 228–338 ms | none |
| Hip flexors | Voluntary RTD | 249–301 ms | none |
| Hip/trunk (lumped) | Standing EMG→torque fit [MODEL] | 544–660 ms (0.9–1.5 × ankle fit) | — |
| Trunk extensors | Peak RFD/PF (multi-joint); time shifts; ballistic TPT; fibre type | 190–390 ms (RFD); ballistic TPT 463 ms | none |
| Trunk flexors / lateral / rotators | Fibre type; quick-release latencies | none | none |
| Neck | Voluntary RFD (3 data sets) | 187–296 ms (148–214 from peak slope; 285–327 with pre-tension) | SCM twitch relaxation rate → ≈ 230 ms |
| Ankle evertors | Reflex-driven torque response | 284–404 ms | none |
| Ankle invertors | Fibre type only (tibialis posterior 80 %) | none | none |
| Elbow flexors | Twitch + voluntary | 138–239 ms | HRT 37–63 ms |
| Elbow extensors | Twitch | 84 ms TPT → 197–282 ms | HRT 63 ms |
| *For comparison (adopted)* | PF / DF / KE | 325 / 200 / 200 ms | 175 / 250 / 160 ms |

---

# PART 2 — Sensory channels, delays and state estimation (extends PPR-3 §1e and §2)

**Timing convention.** All latencies run from stimulus or perturbation onset to **EMG onset**. In the V2 cascade, EMG corresponds to the excitation *u*. The 8.3 ms pure delay and the activation/contraction stages come after it. So a measured EMG-onset latency maps directly onto the **sensed-state → excitation delay**, with nothing subtracted.

## 8. Plantar cutaneous and foot-load (COP) feedback

### 8.1 Reflex latencies from the sole

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Soleus / TA cutaneomotor reflex, **standing**, heel noise vibration | [M] **84 / 77.4 ms** (peak of pooled cumulant density); earlier ≈ 30 ms component attributed to Ia afferents; later > 110 ms | 12 young adults (9 F), 22.5 y; background soleus ≈ 20 % max | Sharma, Peters & Bent 2020 (FT) |
| TA cutaneomotor reflex, **seated**, forefoot noisy vibration | [M] **96.3 ± 2.7 ms** (SE); 93 ± 3.1 ms across conditions; independent of stimulus amplitude and background EMG | 10 (6 M), 25.5 y | Peters et al. 2020 (FT) |
| Sural nerve reflex, standing/running | [M] Biceps femoris 76 ms; TA "P2" 79 ms (6/10). Standing reflex/background ratios 1.07 (BF), 0.53 (TA) vs 1.78 and 1.1 in running | 10 subjects | Duysens et al. 1993 (ABS) |
| Heel stimulation → soleus stretch-reflex facilitation | [M] At conditioning–test intervals of 30–70 ms | — | Sayenko et al. 2007 (ABS) |
| Already in PPR-3 | Sural/tibial cutaneous reflexes from 40 ms (44–54 ms by muscle), only in active muscles (Aniss 1992); plantar middle latency ≈ 70–110 ms (Nakajima 2006) | — | PPR-3 §1e |

### 8.2 What foot-sole input contributes (loss studies)

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Quiet stance after whole-sole anaesthesia | [M] COP velocity **+11–12 %**, shear RMS +13 %, **eyes closed only**; COP displacement unchanged | Iontophoretic + intradermal anaesthesia | Meyer, Oddsson & De Luca 2004a (ABS) |
| Lateral platform perturbations after sole anaesthesia | [M] Torque impulses still scale with perturbation; compensatory torque shifts from ankles and trunk **to the hips** | — | Meyer et al. 2004b (ABS) |
| Foot/ankle hypoxic anaesthesia, AP translations | [M] Responses "not delayed or disorganized"; more hip strategy | Healthy subjects | Horak, Nashner & Diener 1990 (ABS) |
| Foot ischaemia, rapid tilts | [M] M1, M2 (triceps surae) and M3 (TA) preserved; foot afferents matter for slow (0.3 Hz) platform motion | — | Diener et al. 1984 (ABS) |
| Diabetic neuropathy, posterior translations | [M] APR EMG onsets **delayed 20–30 ms at all segments**; scaling to perturbation velocity impaired | Patients vs age-matched controls | Inglis et al. 1994 (ABS) |
| Leg muscle afferents vs plantar cutaneous loss (lean-release step) | [M] Muscle-afferent loss affected the response more | 4 ischaemia, 5 foot anaesthesia | Thoumie & Do 1996 (ABS) |
| Foot-sole cooling → GVS | [M] Medium-latency GVS response in soleus **+35 %**; short-latency unchanged (reweighting toward vestibular) | 12 standing, 1 °C, 15 min | Muise, Lam & Bent 2012 (ABS) |
| Sole vibration | [M] Whole-body tilt opposite to the vibration-simulated pressure increase, amplitude ∝ frequency; no latency in abstracts | 9–10 standing | Kavounoudias 1998, 2001 (ABS) |
| Load receptors | [M] Load-dependent compensatory EMG to translational (not rotational) impulses, attributed to extensor load receptors | — | Dietz et al. 1992 (ABS) |

**Reading [E].** Plantar input reaches leg muscles at ≈ 75–100 ms in standing, i.e. at APR timing. It is not needed to *trigger* fast responses to large perturbations: foot anaesthesia or ischaemia does not delay them (Horak 1990; Diener 1984), although diabetic neuropathy, which also affects leg proprioceptors, delays them by 20–30 ms (Inglis 1994). It does contribute to quiet-stance regulation, slow perturbations and the ankle/hip torque split. A foot-load/COP channel at ≈ 80 ms is consistent with the data; there is no evidence for a faster COP channel.

## 9. Vestibular contributions to neck, trunk, arm and leg muscles

### 9.1 GVS / EVS and vestibulocollic latencies (muscles not covered in PPR-3)

| Muscle | Latency | Subjects/protocol | Source (access) |
|---|---|---|---|
| Lumbar erector spinae (L3/L4), standing | [M] **59–110 ms** (range across subjects), 2 mA; lower-limb latencies longer; motor conduction velocity 13 ± 10 m/s | 19 subjects | Ali, Rowen & Iles 2003 (ABS) |
| Paraspinal vs gastrocnemius, standing | [M] Primary response **74 ± 20 vs 118 ± 18 ms**; second, opposite component 232 ± 27 vs 262 ± 54 ms | 10, eyes closed, 0.6 mA | Ardic, Latt & Redfern 2000 (ABS) |
| Lumbar erector spinae, seated | [M] Short-latency (inhibitory) **45.5 ± 5.3 ms**; medium-latency (excitatory) **73.2 ± 5.1 ms** (range 61.0–86.3) | 10 (7 F), 24 y; EVS 2–5 mA | Desgagnés et al. 2021 (FT) |
| Triceps brachii, used posturally | [M] **41 ± 2.6 / 138 ± 4.3 ms** (± SEM); absent when not used posturally | Standing, holding a fixed handle | Britton et al. 1993 (ABS) |
| Review: axial vs appendicular; paraspinal vs lower limb | [M] ≈ 8 vs ≈ 50 ms; ≈ 61 vs ≈ 85 ms; SCM peaks at 10–13 and 21–23 ms | Review | Forbes et al. 2014 (FT) |
| Neck muscles (intramuscular, stochastic EVS) | [M] First and second peaks 12.1 ± 2.8 and 20.9 ± 3.2 ms | **n = 2**, 14 muscles | Forbes et al. 2018 (FT) |
| Click-evoked SCM VEMP | [M] Onset **8.2 ms** (mean); p13–n23 | Normal subjects | Colebatch, Halmagyi & Skuse 1994 (ABS) |
| Sound-evoked single motor units | [M] Splenius capitis gap at 11.7 ms; SCM at 12.7 ms | 10 volunteers | Rosengren et al. 2019 (ABS) |
| Vestibular reflex bandwidth | [M] Neck 0–70 Hz; back 0–15 Hz; lower limb 0–20 Hz | — | Forbes et al. 2013 (ABS) |
| Axial vs limb responses | [M] Light head contact or microgravity abolishes lower-limb GVS responses; back-muscle responses persist | 19 | Guillaud et al. 2020 (ABS) |
| Already in PPR-3 | Soleus/TA 56–62 ms (early) and 105–115 ms (late); stochastic peaks 65 / 103 ms | — | Britton 1993; Fitzpatrick 1994; Dakin 2007 |

### 9.2 Vestibular contribution to perturbation responses

| Finding | Value | Source (access) |
|---|---|---|
| Head-only displacement | [M] Triggers **48–84 ms** responses in leg and trunk muscles at about **one-third** the amplitude of whole-body displacement responses; absent with bilateral vestibular loss (BVL) | Horak, Shupert, Dietz & Horstmann 1994 (ABS) |
| BVL, rotations/translations | [M] **Onset latencies unaltered**; leg responses at 120–240 ms reduced > 50 %; paraspinal responses up ≈ 100 %; patients respond "as if the perturbation were 50% slower" | Allum, Honegger & Schicks 1994 (ABS) |
| BVL, multidirectional rotations | [M] Onsets ≈ 120 ms normal; soleus delayed 38–45 ms only for forward + roll; ankle torque reduced at 160–260 ms, increased at 280–380 ms. "Vestibular influences are earlier for the pitch plane and are directed to leg muscles, whereas roll control is later and focused on trunk muscles" | Carpenter, Allum & Honegger 2001 (ABS) |
| BVL strategy | [M] Normal ankle strategy, no hip strategy | Horak, Nashner & Diener 1990 (ABS) |

**Reading [E].** Vestibular signals reach neck muscles in ≈ 8–25 ms, trunk muscles in ≈ 45–110 ms (central ≈ 60–75 ms), and leg muscles in ≈ 55–120 ms (sway-driving component ≈ 105–118 ms). Vestibular input does not set APR *onset*, but it scales the 120–240 ms part of the response and is needed for the hip strategy.

## 10. Neck proprioception

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Dorsal neck vibration → leg EMG, standing | [M] TA activated and triceps surae inhibited at **70–100 ms** after vibration onset | 10 healthy | Andersson & Magnusson 2002 (ABS) |
| Neck vs mastoid vibration | [M] Neck-muscle vibration responses larger and more consistent | 10, eyes closed | Magnusson et al. 2006 (ABS) |
| Neck vibration → posture | [M] Whole-body forward lean (set-point shift) and atlanto-occipital extension; direction set by head/gaze orientation | 8; — | Verrel et al. 2011; Ivanenko, Grasso & Lacquaniti 1999 (ABS) |
| SCM response to head free-fall | [M] Normal **24.5 ms** (vestibular); labyrinthine-defective **67.4 ms** (cervicocollic stretch reflex); voluntary activity ≈ 100 ms | Supine head-drop | Ito et al. 1997 (ABS) |
| Head/trunk-in-space perception from neck + vestibular input | [M] Gain ≈ 0.7 at 0.2–0.4 Hz, falling at lower frequencies; velocity threshold ≈ 1 deg/s | Passive horizontal rotations | Mergner et al. 1991 (ABS) |

**Reading [E].** Neck proprioception acts on posture at ≈ 70–100 ms (comparable to APRs) and supplies the head-on-trunk signal needed to convert vestibular head-in-space information into trunk- or body-in-space estimates.

## 11. Trunk orientation sensing and perception thresholds

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Sway perception threshold, standing, all senses | [M] **0.003 rad (0.17°) at 0.001 rad/s (0.057°/s)**; smaller as velocity rises to 0.003 rad/s; eye closure no effect | 5 subjects | Fitzpatrick & McCloskey 1994 (ABS) |
| Proprioceptive-only (balancing an equivalent body) | [M] Equal to the all-senses threshold; ≈ 2× higher with relaxed leg muscles; SEC value 0.0018 rad/s | Same | Fitzpatrick & McCloskey 1994 (ABS); value SEC via Tisserand 2022 (FT) |
| Vestibular-only threshold | [M] "An order of magnitude greater" than proprioceptive and visual, and above normal sway; SEC ≈ 0.01 rad at 0.004 rad/s | Same | Same |
| Whole-body perturbation direction threshold, immobile vs actively balancing | [M] **0.0016 ± 0.0004 rad/s** vs **0.00045 ± 0.0003 rad/s**; below ≈ 0.0025 rad/s subjects report their own corrective motion | Robotic balance simulator | Tisserand et al. 2022 (FT) |
| Ankle rotation direction threshold, weight-bearing | [M] 0.04° / 0.09° / 0.41° at 2.5 / 0.5 / 0.1°/s (young women); 3–4× larger in old | 12 + 12 women | Thelen et al. 1998 (ABS) |
| Support-rotation perception | [M] Similar with ankle, knee or hip free; lower for roll than pitch; much higher with only the neck free | — | Teasdale et al. 1999 (ABS) |
| Vestibular direction-recognition thresholds | [M] Yaw 0.97°/s; roll tilt 0.66°/s (1 Hz), 0.35°/s (0.2 Hz); y-translation 0.58 cm/s | 105 adults (< 40 y values) | Bermúdez Rey et al. 2016 (ABS) |
| Trunk graviceptors | [M] Receptor centroid near the last ribs; inputs at T11 (abolished by nephrectomy) and above C6 | Centrifuge psychophysics | Mittelstaedt 1996 (ABS) |
| Proprioceptive reflex bandwidth and loop gain, standing | [M] Soleus EMG coherent with waist perturbation up to 5 Hz (max 1–2 Hz), phase advance 135° at 3 Hz; reflex loop gain ≈ 1, "insufficient to explain the stability of normal human standing" | 9; — | Fitzpatrick 1992, 1996 (ABS) |
| Already in PPR-3 | Frontal-plane trunk: proprioceptive velocity 25 ± 6 ms, vestibular/visual velocity 135 ± 18 ms, orientation 281 ± 24 ms (Goodworth & Peterka 2009) | — | PPR-3 §2.4 |

**Reading [E].** Leg proprioception detects sway of ≈ 0.1–0.2° at sway velocities; vestibular-only detection is ≈ 10× worse at these slow speeds. A model that gives the controller noise-free sub-0.01° body-state information is better informed than a human. Thresholds of this order (0.0005–0.002 rad/s for whole-body velocity; ≈ 0.04–0.4° for ankle angle depending on velocity) are a defensible scale for sensory noise or dead-zones.

## 12. COM state estimation, internal models and the limits of prediction

### 12.1 Is there a measurable "COM estimation delay"?

There is no direct measurement. The delay of a COM estimate is a model construct. The measurable quantity is the latency from perturbation to EMG, of the response that *scales with* COM kinematics:
- 88 ± 19 ms (Welch & Ting 2009), 88 ± 10 ms (Safavynia & Ting 2012), 127.8 ms (Kiemel 2011) — all PPR-3 §2.2;
- gluteus medius / gastrocnemius 70–80 ms after pelvis pushes, unchanged by foreknowledge of push direction (Gilles, Wing & Kirker 1999, ABS);
- gluteus medius 74 ms (Kirker 2000; PPR-3).

**[E]** An operational COM-state channel delay of ≈ 70–130 ms (central ≈ 90–100 ms) to excitation is what the data support.

### 12.2 Estimation and prediction models

| Model | What is estimated or predicted | Delay | What it shows | Source (access) |
|---|---|---|---|---|
| Kuo 1995 | Full state (LQR + estimator, two segments) | Effect studied; value not in abstract | Strategy selection emerges from an objective weighting COM excursion and posture | Kuo 1995 (ABS) |
| Kuo 2005 | Body orientation from proprioception, vestibular and vision through an internal model of body and sensor dynamics | [UNVERIFIED]; Rasman 2021 cites it for ≈ 100–160 ms (SEC) | Robust with normal sensors, not with ≥ 2 inaccurate sensors; removing vestibular input reproduces BVL-like instability | Kuo 2005 (ABS) |
| van der Kooij et al. 1999 | Body orientation with a **predictive element** to compensate delays | **100 ms** | Stabilises an inherently unstable 3-link stance model with 100 ms neural delays | vdK 1999 (ABS) |
| van der Kooij et al. 2001 | Adaptive estimator of environment and body states | — | Reproduces saturation of visually induced sway without explicit thresholds; slow, small movements cannot be estimated optimally (illusions) | vdK 2001 (ABS) |
| Mergner, Maurer & Peterka 2003 (DEC precursor) | Internal estimates of support tilt, gravity and external torque, fed as set points to a local proprioceptive loop | (DEC delays in PPR-3) | Handles combined disturbances; BVL problems traced to force-cue decomposition (Mergner 2009) | ABS |
| Kiemel, Oie & Jeka 2002, 2006 | Kalman-filter state estimate with computation noise | — | Slow sway component lies *inside* the feedback loop, consistent with state-estimation error | ABS |
| Insperger, Milton & Stépán 2013 | PDA (position–derivative–acceleration) feedback = predictor from the latest state, **without** using the control input | Case delay 200 ms | Stabilises with **≈ 40 % larger delays** than PD | ABS (parameters FT-W) |
| Zhang, Stepan & Insperger 2018 | PDA with torque saturation | — | Subcritical Hopf bifurcation → falls under large perturbations; worse with higher acceleration gain or lower torque limit | ABS |
| Gawthrop et al. 2011, 2014 | Intermittent predictor with system-matched hold | Δ = 0.18 s (simulation) | Prediction is "the essential difference" from delayed PD; masquerades as continuous control when thresholds are small | ABS; FT |
| van der Kooij & Peterka 2011 | (non-predictive delayed PD with fitted passive and activation dynamics) | — | **No stabilising K_P, K_D above ≈ 340 ms delay** | FT |
| Morasso & Sanguineti 2002 | — | — | Ankle stiffness alone is mechanically unstable without anticipatory control | ABS |

### 12.3 Evidence of what humans cannot do

| Finding | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Added sensorimotor delay, naive | [M] Marked difficulty at **≥ 200–300 ms added**; at **400 ms added, no participant could stay upright** in the first minute (18 ± 5 limit hits) | 13 naive; robot-simulated AP ankle standing; delays added on top of physiological ≈ 100–160 ms | Rasman et al. 2021 (FT, re-checked) |
| Learning with 400 ms added | [M] After ≈ 100 min over 5 days: within limits 97 ± 3 % of the time, but sway velocity variance still **≈ 38× baseline**. [E] Total loop ≈ 500–560 ms | 16 | Same |
| Vestibular responses with added delay | [M] Coherence and gain fall at ≥ 200 ms added; a transient 200 ms delay cuts vestibular responses by ≈ **70–90 % within seconds** | 7–8 | Same |
| Detection of added delay | [M] 70 % threshold **147 ± 21 ms** pre-learning; button press ≥ ≈ 2 s after onset | 18 | Same |
| Model critical delay | [MODEL] ≈ 300–340 ms (vdK & Peterka 2011 FT: ≈ 340 ms; Milton & Insperger 2019 via Rasman) | — | — |
| Sensory reweighting time course | [M] ≈ 1–2 s to onset, steady state in ≈ 1–3 s after a sudden change in sensory condition; slower for high-to-low amplitude and inter-modality transitions | Review; 14 young | Honeine & Schieppati 2014 (FT); Assländer & Peterka 2014 (ABS) |
| Unpredictable vs predictable perturbations | [M] **No anticipatory postural activity** for unpredictable shoulder perturbations. Predictable ones: COM peak 17 ± 5.5 vs 28 ± 9.6 mm (1.6× smaller); COP peak 28 vs 60 mm; APA EMG at −250 to −100 ms | 8 adults, pendulum at the shoulders | Santos, Kanekar & Aruin 2010a (ABS), 2010b (FT, re-checked) |
| Foreknowledge of direction | [M] Gluteus medius / gastrocnemius onset **70–80 ms** whether push direction was predictable or random: "prior information does not speed postural responses" | 5, pelvis pushes | Gilles, Wing & Kirker 1999 (ABS) |
| Vestibular loss | [M] Onsets unchanged; later (120–240 ms) responses halved | — | Allum 1994; Carpenter 2001 (ABS) |

### 12.4 Synthesis for the A-vs-B controller comparison [E]

1. **Predicting one's own body state over the sensory delay is supported.** It uses a body model plus efference copy of previous commands. Every state-estimation model that fits human data contains a body model, and humans can learn to stand with total loop delays (≈ 500–560 ms) beyond the ≈ 300–340 ms critical delay of non-predictive delayed PD.
2. **Predicting the disturbance is not supported.**
   - Unpredictable perturbations produce no anticipatory activity.
   - Foreknowledge of direction does not shorten the ≈ 70–80 ms response.
   - Torque that a human could deliver only from sensed information cannot appear before the sensory latency (§12.1, PPR-3 §1g).
3. **Quantitative ceiling on benefit.**
   - Acceleration-feedback "prediction" raises the tolerable delay by ≈ 40 % in a model.
   - Trained humans tolerate ≈ 1.5–1.9× the non-predictive critical delay ([E] 500–560 / 300–340 ms), but only with ≈ 38× the sway variance.
   - Naive humans fail at added delays of ≈ 200–300 ms.
   - **Implication:** a predictive controller that makes the character *better* than humans — smaller sway or later stepping thresholds than the human ranges in Part 3 — exceeds this evidence.
4. **Limits to respect:**
   - estimation noise of the order of the perception thresholds (§11);
   - reweighting time constants of seconds, not milliseconds;
   - no use of the disturbance's own timing;
   - the vestibular channel contributes at ≈ 100 ms to legs, not instantly.

---

# PART 3 — Human benchmarks for a no-step balance battery (extends PPR-3 §3–§4 and PPR-2 §5)

**Already in the repository and not repeated here:** quiet-sway COM/COP norms (PPR-3 §3); Rietdyk 1999 pelvis pushes, van Mierlo 2023, Robinovitch 2002, Zhu 2022 step counts (PPR-3 §4); feet-in-place threshold table and direction ratios (PPR-2 §5); strategy mechanics, XcoM, capture point (ABI-1 §4).

**Generic body used for every [E] XcoM ratio in this part** (not the simulator body; Appendix A.6):
- COM height l = 0.55·H, ω₀ = √(g/l);
- foot length 0.15·H, ankle 21 % of foot length from the heel;
- quiet-stance COM 0.045 m in front of the ankle;
- zero-delay limit Δv_max = ω₀ × (BoS edge − x₀).
- For H = 1.75–1.80 m: forward ≈ 0.52–0.53 m/s, backward ≈ 0.32 m/s.
- A push's F·t/m is an **upper bound** on COM Δv.

## 13. Mediolateral perturbations without stepping

### 13.1 Mechanism: hip load/unload

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Quiet side-by-side stance | [M] "A/P balance is totally under ankle (plantar/dorsiflexor) control, whereas M/L balance is under hip (abductor/adductor) control." In tandem stance the reverse: ankle invertors/evertors dominate ML | Two force plates | Winter et al. 1996 (ABS) |
| Lateral vs AP platform translations | [M] Lateral: asymmetric redistribution of vertical force between the feet, **first muscle = proximal TFL**. AP: bilaterally symmetric, distal muscles first | 4 directions | Henry, Fung & Horak 1998a (ABS) |
| Muscles tuned to lateral translations | [M] Rectus femoris and TFL maximally active for lateral translations; adductor longus active orthogonal to its anatomical prediction | 7 healthy, 12 directions | Henry, Fung & Horak 1998b (ABS) |
| Controlled variable, ML pelvis perturbations | [M] The **sum of ankle and hip** net joint torques is controlled in ML, decoupled from AP (ankle sum) | 8 subjects, 8 directions, 3 strengths | Matjačić et al. 2001 (ABS) |
| Hip vs ankle share of the corrective ML moment | [M] Hips ≈ 90 % (contralateral 70 %), ankles ≈ 14 %, load/unload 85.5 % | 10 men, pelvis pushes | Rietdyk 1999 thesis (PPR-3 §4) |
| Hip EMG after a sideways pelvis push | [M] Gluteus medius (side pushed toward) **74 ms**; contralateral adductor **111 ms** | 16 controls | Kirker et al. 2000 (ABS; PPR-3) |
| Gluteus medius / gastrocnemius onset, predictable vs random direction | [M] **70–80 ms** in both cases | 5, pelvis pushes | Gilles, Wing & Kirker 1999 (ABS) |
| Onset of active weight transfer after a lateral waist pull (vertical GRF rise under the unloaded/stepping limb) | [M] **96 ± 2 ms** (50 % preload) and 104 ± 2 ms (65 %) (± SEM), young; older 132–134 ms. Rate of vertical-force rise 620–733 N/s | 15 young (29 y); instructed-step trials | Inacio, Creath & Rogers 2019 (FT) |
| Passive phase | [M] "the leg contralateral to the perturbation direction initially undergoes passive unloading while the ipsilateral limb undergoes passive loading" | Same | Same |
| Sole anaesthesia, lateral perturbations | [M] Compensatory torque shifts from ankles and trunk to the hips | — | Meyer et al. 2004b (ABS) |

### 13.2 Magnitudes tolerated and ML responses

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Platform translation tolerated feet-in-place in all 12 directions, including pure lateral | [M] **12.4 cm, 35 cm/s, 0.5 g**; stepping elicited at 23 cm, 45 cm/s, 0.75 g | 8 young, 21–27 y; "maintain balance without stepping if possible" | Chvatal et al. 2011 (FT-W) |
| COM displacement relative to the feet in those translations | [M] **10–12 cm** opposite to platform motion, then return in nonstepping trials | Same | Same |
| Same translations at several stance widths | [M] Heel spacing 9, 19, 30 cm and 60 cm (whether all widths used identical parameters: [UNVERIFIED]) | 9 young, 1.71 m, 63.7 kg | Torres-Oviedo & Ting 2010 (FT-W) |
| Position-controlled waist pulls, shoulder-width stance: large medial / lateral pull | [M] Pelvis displacement 16.0 / 15.1 cm in 0.53 s, peak pull velocity **0.351 / 0.317 m/s**; medial: stepping or leg elevation in **15 of 36** trials (7 of 12 participants) | 12 young; pull = 8 % of height at large magnitude | Zhu et al. 2022 (FT, Table 3 re-checked) |
| Lateral sideways pelvis push used clinically | [M] 3 % BW (duration not in the abstract) | 15 controls | Holt et al. 2000 (ABS) |
| Force-controlled lateral waist pulls at 3 stance widths | [M] 6 % and 12 % BW (300 ms ramp, 200 ms hold, 100 ms ramp-down); interheel distance 12, 24, 47 cm; lift-off in 301 of 1874 trials, almost all at 12 % BW. [E] F·t/m ≤ 0.24 m/s (6 %) and ≤ 0.47 m/s (12 %). Controls middle-aged; control-only numbers not extractable | 10 controls (55.8 y) + myelopathy patients | Boerger et al. 2022 (FT-W) |
| Stance width vs COM excursion and EMG (translations) | [M] **No significant change in COM displacement** from narrow to wide (large COP changes compensate); EMG smaller in wide stance, latencies unchanged; narrow = active load/unload, wide = more passive stiffness from limb geometry | 7 healthy, 12 directions | Henry, Fung & Horak 2001 (ABS) |
| Frontal-plane model | [MODEL] Mechanical stability *decreases* with stance width (smaller effective inertia); stable feedback gains must fall with width; gain ranges non-overlapping across widths | 1.8 m, 72 kg, 100 ms delay | Bingham, Choi & Ting 2011 (ABS); Bingham & Ting 2013 (FT) |
| Narrow vs wide, pseudorandom frontal tilts | [M] Narrow stance nonlinear across stimulus amplitude; wide more linear | — | Goodworth & Peterka 2010 (ABS) |
| Weight-bearing asymmetry | [M] Lowers the stepping threshold toward the loaded side, raises it toward the unloaded side | 10 young | de Kam et al. 2016 (ABS) |
| Lateral single-step threshold, feet touching, "try not to step" (treadmill belt, 400 ms triangular pulse) | [M] Initial acceleration 3.30 ± 0.75 / 3.20 ± 0.73 m/s² (two sides) [E: means of Table 1] | 15 adults, 29 y | Crenshaw & Kaufman 2014 (FT) |
| ML recovery time feet-in-place, young | **Not found** beyond Rietdyk (2–3 s) and van Mierlo (velocity reversal 0.4–0.8 s) | — | — |
| ML feet-in-place threshold vs stance width in young adults | **Not found** | — | — |

**Reading [E].**
- In side-by-side stance, ML balance after a push is a hip problem from the first response: gluteus medius/TFL at ≈ 70–80 ms, contralateral adductor ≈ 110 ms, vertical load shifting under the feet from ≈ 100 ms.
- The ankle invertors/evertors contribute ≈ 10–15 % of the corrective moment.
- Human data constrain the ML feet-in-place limit only at roughly hip-to-shoulder width: Rietdyk Δv ≤ 0.27 m/s with 3/10 subjects stepping at the larger pushes; Zhu: 42 % stepping at 0.35 m/s position-controlled medial pulls.
- Wider stance should raise the limit geometrically (Appendix A.6: zero-delay limit ≈ 0.41 m/s at 17 cm centre-to-centre, ≈ 0.82 m/s at 42 cm). No measurement confirms how much of that gain humans realise, and the model literature predicts reduced mechanical stability (Bingham 2011).

## 14. Anteroposterior pushes and pulls: thresholds without stepping

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| **Pelvis push force threshold** (strongest force with no step), 0.2 s rectangular pulse | [M] **Forward 0.11 ± 0.029 mg; backward 0.074 ± 0.023 mg**. Instruction: "maintain balance in a natural way (with or without stepping)", with a counting-backwards distraction task | 10 young (5 F), 23.6 y, 75 kg, 1.80 m; feet side by side under the hips; arms crossed | Emmens et al. 2020 (FT, re-checked) |
| Same as Δv / impulse | [E] Forward ≤ 0.216 m/s (16.2 N·s at 75 kg; **16.0 N·s at 73.9 kg**); backward ≤ 0.145 m/s (10.9 / **10.7 N·s**) | F·t/m, t = 0.2 s | Arithmetic |
| Ratio to the zero-delay XcoM limit | [E] Forward ≤ 0.41; backward ≤ 0.45. Backward/forward force ratio 0.67 (geometry predicts 0.61) | Generic body, H = 1.80 m | Arithmetic |
| Forward waist-pull stepping boundary (50 % stepping), "try not to step" | [M/SEC] F50 (% BW) = 2434 / t_p + 7.69, t_p in ms (unit inferred: F50(1500 ms) = 9.3 % BW matches the abstract's "about 10%BW") | 22 young, 19–37 y; 86 force × duration combinations | Robert et al. 2018 (ABS), formula SEC via Liu et al. 2024 (FT) |
| Same as Δv and XcoM ratio | [E] t_p → 0: impulse/m 0.239 m/s (**17.7 N·s at 73.9 kg**), ratio 0.46. t_p = 100 ms: 0.314 m/s (23.2 N·s), ratio 0.61 (upper bound) | Generic body, H = 1.75 m | Arithmetic |
| Treadmill-belt single-step thresholds, "try not to step" | [M] Anterior fall **273.0 ± 82.3 N·m** (4.0 ± 0.7 N·m/kg), posterior fall **235.5 ± 98.0 N·m** (3.4 ± 1.0 N·m/kg). [E] Initial belt acceleration 3.90 / 3.27 m/s² (visit 1). Ratio posterior/anterior 0.86 | 15 adults (10 F), 29 y; **side-by-side stance 17.2 ± 4.4 cm**; 400 ms triangular pulses | Crenshaw & Kaufman 2014 (FT, re-checked) |
| Position-controlled waist pulls, shoulder width | [M] Anterior pulls 3.8 / 7.4 / 11.4 cm at 0.127 / 0.238 / 0.349 m/s peak velocity; steps 0, 1, 3 of 36. Posterior 2.4 / 4.7 / 7.0 cm at 0.124–0.338 m/s; steps at large 2 of 36 | 12 young | Zhu 2022 (FT) |
| Volitional (functional) base of support per foot | [M] Area **22 % [9–36]** of the footprint; length **65 % [49–81]** of foot length; width **35 % [21–62]** of foot width (median [range]) | 38 young, feet hip-width, "move COM as much as possible without moving the feet" | Sloot et al. 2025 (FT, re-checked) |
| Effective BoS after a sudden perturbation | [M] "some 30%" of the static BoS area | — | Hof & Curtze 2016 (ABS) |
| Pai & Patton feasible region (no delay) | [MODEL] Forward-fall boundary 1.1 s⁻¹ (velocity / body height) at 2.4 foot lengths behind the heel → 0.45 s⁻¹ over the heel → 0 over the toe; backward-fall 0.9 s⁻¹ at 2.7 foot lengths behind the heel → 0 over the heel. Friction < 0.82 or plantarflexor strength −35 % shrinks it. [E] 0.45 s⁻¹ × 1.75 m = 0.79 m/s ≈ zero-delay XcoM heel-to-toe span (0.84 m/s) | Model | Pai & Patton 1997 (ABS; erratum not read) |
| Step occurrence vs platform translation | [M] Steps more frequent for anterior (83) than posterior (45) translations; rose with velocity and with displacement up to 15 cm, then plateaued | 8 young | Rogers et al. 1996 (ABS) |
| Step onset when stepping is allowed | [M] From 160 ms; **mean 250 ms**; "well before the limits of stability" | 7 | McIlroy & Maki 1993 (ABS) |
| Time-to-boundary step predictor | [M/fitted] τ_opt 0.58 s (young); anterior 0.52 s, posterior 0.84 s | Waist pulls 1–5 % BW, women | Schulz et al. 2006 (ABS) |
| Dynamic vs static step prediction | [M] Dynamic (position + velocity) model correct for 71 % of steps; static 11 % | 10 young, translations | Pai et al. 2000 (ABS) |
| Ankle-only release (hips and knees held extended) | [M] Release forces 27–56 N (4.6–8.2 % BW [E]); mean peak sway **3.87°**; "typically free of overshoot", like a critically damped oscillator; [MODEL] fitted delay 157 ± 81 ms | 10 adults, 28 y | Zelei et al. 2021 (FT) |
| Feet-in-place limit for platform translations (275 ms ramps) | [M] 3 of 7 young kept their feet in place at 15 cm; heel-off/stepping from ≈ 12 cm | 7 young | Kim et al. 2009 (FT, re-checked) |
| Recovery-model reaction time | [MODEL] 75 ms reaction, 150 ms step preparation | Sagittal pendulum + flywheel | Aftab, Robert & Wieber 2016 (FT) |

**Reading [E].**
- **Instruction moves the threshold.** Young adults step before it is mechanically necessary when stepping is allowed (McIlroy & Maki 1993; Emmens's "natural" instruction). "Try not to step" thresholds (Robert, Crenshaw) are higher.
- **For brief (≤ 0.2 s) pelvis pushes in young adults, the measured feet-in-place limit is ≈ 0.40–0.46 of the zero-delay XcoM limit.** This rises to ≈ 0.6 (upper bound) for 100 ms waist pulls under "try not to step".
- This fraction is lower than the delay factor alone (e^(−ω₀·0.15) ≈ 0.62). It is consistent with a delay plus a usable base of support < 100 % (65 % of foot length volitionally; ≈ 30 % of area after sudden perturbations).
- **At 73.9 kg:**
  - forward threshold ≈ 0.22–0.31 m/s (16–23 N·s);
  - backward ≈ 0.15–0.22 m/s (11–16 N·s; ratio 0.67–0.91 × forward across Emmens, Crenshaw, Sturnieks).

## 15. Ankle, hip, knee and trunk coordination in perturbation recovery

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Ankle → hip continuum | [M] Hip flexor torque added to ankle plantarflexor torque in fast translations; **pure hip strategy not observed** | Backward translations 5–55 cm/s | Runge et al. 1999 (ABS) |
| Gain scaling with size | [M + MODEL] Hip gains rise and ankle gains fall about linearly with perturbation magnitude (R² 0.92) | 13 young, 3–15 cm translations | Park, Horak & Kuo 2004 (ABS) |
| Ankle torque saturates before the heel-lift limit | [M] Peak ankle torque "gradually suppressed with increased perturbation magnitude … even before the constraint on heel lift was reached". "Maximum allowable ankle joint torque", defined as "the peak ankle joint torque possible without violating the flat-foot constraint": **0.073 ± 0.01 × body weight × height** (young; elderly 0.057) | 7 young, 3–15 cm in 275 ms | Kim et al. 2009 (FT, re-checked) |
| Joint motion across conditions | [M] Changes characterised "predominantly by changes in maximum hip deflection (P < 0.02), with ankle and knee deflection remaining constant"; initial joint direction not conserved even within a subject; upright again within ≈ 1 s | 7 young; 12 cm at 25–40 cm/s, 0.1–0.6 g | Welch & Ting 2009 (FT) |
| Peak knee angle, non-stepping backward translations | [M] **5 ± 3.8°** | 10 young; 0.16 m translations | Afschrift et al. 2016 (FT) |
| Joint-moment rate | [M/MODEL] Simulations bounded at ±250 N·m/s, "similar to the average maximal rate of change in joint moments found in the experimental trials"; peak hip angle correlates with effort | Same | Same |
| Knee in AP pushes | [M] ≈ 4° knee flexion when present | 10 men | Rietdyk 1999 (PPR-3) |
| Joint sequence by perturbation type | [M] Forward translation: early knee flexion, then ankle dorsiflexion and hip extension. Backward: hip flexion + ankle plantarflexion. Toes-up rotation: early hip and knee flexion. Muscles active 60–170 ms | 13 adults | Szturm & Fallang 1998 (ABS) |
| Same, forward platform motion | [M] Ankle dorsiflexion → knee flexion → hip flexion; ankle strategy at 0.1 m/s, mixed at 0.2 m/s | 13 young | Hwang et al. 2009 (ABS) |
| Eigenmovement feedback delays [MODEL] | Ankle mode **120.8 ± 22.7 ms**, hip mode **66.1 ± 10.2 ms**, knee mode 12.3 ± 3.2 ms; joint stiffness matrix (ankle, knee, hip) S11 602, S22 337, S33 128 N·m/rad (off-diagonals 127–343) | 9 young, 3–7.5 cm ramps | Alexandrov et al. 2005 (FT) |
| Trunk after support rotations | [M] Trunk roll begins **within 30 ms** (young); mean roll velocity 21°/s at 90–130 ms (60°/s stimuli); trunk pitch velocity peaks at **≈ 200 ms**; deltoid from 100 ms | 12 young of 36; 7.5° at 30–60°/s | Allum et al. 2002 (FT) |
| Hip–ankle (trunk–leg) phase, quiet stance and slow tilts | [M] In phase below ≈ 0.8–1 Hz, anti-phase above ≈ 1–1.1 Hz (quiet stance and slow tilts) | §17 | Zhang 2007; Creath 2008 (FT) |
| Measured joint-torque peak times; trunk pitch excursion in degrees; peak ankle/hip angles per perturbation size | **Not found numerically** (figure-only in Kim 2009, Welch & Ting 2009, Allum 2002) | — | — |

## 16. Head stabilisation during whole-body perturbations

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| Head-motion onset after slow forward platform translation | [M] **120 ± 46 ms**; first head motion = downward pitch | 12 young; 5 cm at 5 cm/s | Keshner & Dhaher 2008 (FT) |
| Head angular acceleration after fast rotations | [M] From **15 ms** (passive mechanics) | 14; 7.5° at 50°/s | Carpenter, Allum & Honegger 1999 (ABS) |
| Neck muscles in body vs head perturbations | [M] "little neck muscle activity for body perturbations, but large, early activations in both neck extensors and flexors for head perturbations" | 13 normals | Shupert & Horak 1996 (ABS) |
| Neck flexor and abdominal responses | [M] "as early as those of the stretched ankle muscles" for posterior translations | 10 | Keshner, Woollacott & Debu 1988 (ABS) |
| What sets head velocity | [Review] Mostly the head–neck mass–viscoelastic system (modifiable by co-contraction); neck responses mainly triggered by trunk and leg proprioception; a major role for the vestibulocollic reflex not established | — | Allum, Gresty, Keshner & Shupert 1997 (ABS) |
| Head on trunk in quiet stance | [M] Below 0.7 Hz "head locked to trunk" (inverted-pendulum mode); resonant mode ≈ 3 Hz; "The head is not stabilised in space during stance, rather the pelvis is" | 16 young, 14 elderly; gyroscopes | Honegger, van Spijker & Allum 2012 (ABS) |
| Elderly vs young | [M] Elderly head accelerations start sooner and peak earlier ("stiffer" trunk) | — | Allum 2002 (FT) |
| Head during continuous AP platform oscillation | [M] Head moves in phase with the platform; differences between visual conditions ≈ 1° | 20, 10 cm at 0.2–0.6 Hz | Sozzi, Nardone & Schieppati 2019 (FT) |
| Locomotion context | [M] Head pitch ≤ 20°, angular velocity < 140°/s | 10 | Pozzo, Berthoz & Lefort 1990 (ABS) |
| Head pitch excursion (°) or head angular velocity (°/s) during standing pushes or translations in young adults | **Not found numerically** | — | — |

**Reading [E].** In standing, humans do **not** stabilise the head in space against body perturbations. The head moves with the trunk at low frequency, and neck muscles are little used unless the head itself is perturbed. A head-stabilising controller that holds the head fixed in space during a push would therefore be non-human. Only qualitative and timing benchmarks exist: head follows trunk; head motion onset ≈ 100–150 ms for slow translations; passive head acceleration from ≈ 15 ms for fast ones.

## 17. Quiet-standing joint-level sway and the COM–COP relation

| Measure | Value | Subjects/protocol | Source (access) |
|---|---|---|---|
| **Within-trial SD of sagittal joint angle, side-by-side stance** | [M] **Ankle 0.21°; knee 0.18°; hip 0.30°; neck 0.31°** (fills the PPR-3 §3 gap). Single-leg stance: 0.59 / 0.57 / 0.92 / 0.75° | 10 (6 M, 4 F), 1.70 m, 67.6 kg; feet shoulder-width, arms folded, 2 × 1 min; markers on one side, 100 Hz, 5 Hz low-pass | Wang, Ko, Challis & Newell 2014 (FT, re-checked Table 1) |
| Which joint moves most | [M] "The hip joint had the largest angular motion across all postural conditions, even in quiet stance." [E] Hip/ankle SD ratio 1.43, knee/ankle 0.86 | Same | Same |
| Hip vs ankle | [M] Comparable SD and range, slight hip predominance in normal stance; ankle SD increases with narrow stance | 7 men | Gatev et al. 1999 (FT) |
| Upper body | [M] C7 and atlanto-occipital angles more variable than ankle, knee, hip, lumbosacral (values figure-only; some SDs < 1°) | 15, eyes closed, feet 10 cm apart | Verrel, Pradon & Vuillerme 2012 (FT) |
| Trunk vs leg segments | [M] Trunk variability > leg | 10 | Zhang, Kiemel & Jeka 2007 (FT) |
| Angular acceleration amplitude | [M] Ankle < knee < hip | 8 | Yamamoto et al. 2015 (ABS) |
| Hip vs ankle displacement | [M] No consistent displacement correlation; accelerations anti-phase | 10 | Sasagawa et al. 2009 (ABS) |
| Trunk–leg phase vs frequency | [M] In phase below ≈ 1 Hz, anti-phase above (Zhang 2007); in phase below ≈ 0.8 Hz, anti-phase above ≈ 1.1 Hz (Creath 2008) | 10; 5 controls | FT |
| Ankle–hip anti-phase mode | [M] Fundamental **1.1–1.4 Hz** (5 subjects; mean 1.2 Hz [E]); hip/ankle angle ratio along the mode **−3.0 to −3.7** | 5 young men | Suzuki et al. 2016 (FT) |
| Legs vs trunk under visual-scene drive | [M] Legs lag trunk from ≈ 0.2 Hz, ≈ 150° at 3 Hz | 17 | Kiemel, Elahi & Jeka 2008 (FT) |
| COP–COM coherence and phase | [M] Coherence ≈ **0.8–1** at 0.017–0.8 Hz; cophase ≈ 0° up to ≈ 0.12 Hz, then **COM leads COP**; joint-pair coherence ≈ 0.4–0.6 | 10 | Wang 2014 (FT) |
| Zero-lag correlations | [M] COG–COP and head–COG high, positive, zero-phase; lateral gastrocnemius EMG leads COG/COP by 250–300 ms | 7 | Gatev 1999 (FT) |
| Pelvis vs upper trunk (gyroscopes) | [M] < 0.7 Hz pelvis and shoulder pitch in phase; > 3 Hz pitch dominated by the pelvis | 28 controls | Horlings et al. 2009 (ABS) |
| Where angular motion occurs | [M] Ankle motion dominates lateral sway only for stance < 8 cm; otherwise most angular motion is between trunk and leg | 35 men | Day et al. 1993 (ABS) |
| Dominant low-frequency sway frequency of joint angles; COM–COP amplitude ratio | **Not found** as numbers (COP median frequency ≈ 0.3 Hz in PPR-3 §3) | — | — |

## 18. Quiet-standing muscle activity (Part 3f)

`ppr3/research/STANDING_TONE_LITERATURE.md` already gives the following (references there), so they are not repeated here:
- gluteus medius 3.6 ± 1.5 % MVC (Itoh 2018);
- TFL 3.7 ± 2.2 %;
- lumbar erector spinae 2–7 %, thoracic 2–5 %;
- cervical erector spinae 5.5 % and upper trapezius 7.2 % (Chen 2025);
- peroneus longus 5.3 % (Itoh).

This review adds only:
- **Tibialis posterior** (fine-wire): significantly more active in single-limb than double-limb stance; double-limb values are in figures only (Ridge et al. 2022, FT; 20 young adults).
- **Sternocleidomastoid and splenius in quiet standing:** no % MVC value found (field-restricted and broader Europe PMC searches returned no relevant study). This confirms the STANDING_TONE gap.
- **Neck muscles during body perturbations:** little activity in normals (Shupert & Horak 1996), consistent with low neck tone.

---

# 19. Recommendation

Everything in this section is **[D]**, a design proposal derived from the evidence above. The basis of each number is stated as [M], [E] or [MODEL]. Ranges are the literature spread or, where there is no direct evidence, a declared sensitivity span; "central" values sit in the middle of the better-quality evidence. **No value was chosen with reference to simulator behaviour.**

## 19.1 Muscle force development and relaxation per group

**Structure assumed** (same as MUSCLE-1 §12): u → 2-step (8.3 ms) pure delay → first-order activation 15 / 50 ms → first-order contraction lag (τc,rise / τc,fall) → active torque. τc values come from the compiler's cascade inversion (Appendix A.3, which reproduces MUSCLE-1 A.4). With this structure, torque reaches 10 % of a step change ≈ 30–35 ms after the excitation step (delay included). **If the structure changes, re-derive τc from the rise and fall targets**, which are the structure-independent quantities.

| Group | 10–90 % step rise: range (central) | 90–10 % fall: range (central) | τc,rise central [range] | τc,fall central [range] | Basis | Confidence | Sensitivity range mandatory? |
|---|---|---|---|---|---|---|---|
| Hip abductors (gluteus medius/minimus, TFL) | **200–400 (280) ms** | **120–250 (175) ms** | 126 [89–181] ms | 54 [17–95] ms | Rise [E]: voluntary RTD in 4 data sets (186–338 ms), calibrated against DF/KE/PF in the same protocol (×1.0–1.46); hip/ankle ratio of standing EMG→torque fits 0.9–1.5. Fall: **no hip data**; span of adopted lower-limb central falls (160–250 ms), median 175 | Rise low–moderate; fall very low | **Yes** (fall especially) |
| Hip adductors | **200–400 (280) ms** | **120–250 (175) ms** | 126 [89–181] | 54 [17–95] | As abductors (198–325 ms; older-adult outlier 509–580 ms excluded from the central) | Rise low–moderate; fall very low | **Yes** |
| Hip extensors (gluteus maximus; hamstrings at the hip) | **220–400 (300) ms** | **120–250 (175) ms** | 135 [98–181] | 54 [17–95] | Voluntary RTD 228–338 ms (slower than abductors in both multi-group sets); gluteus maximus ≈ 52 % type I | Rise low; fall very low | **Yes** |
| Hip flexors (iliopsoas, rectus femoris) | **220–400 (300) ms** | **120–250 (175) ms** | 135 [98–181] | 54 [17–95] | Voluntary RTD 249–301 ms; no evoked data; iliopsoas ≈ 49 % type I | Rise low; fall very low | **Yes** |
| Trunk extensors (erector spinae, multifidus) | **200–500 (320) ms** | **120–300 (200) ms** | 144 [89–227] | 68.5 [17–121] | Conflicting evidence (§3.4): fibre type 57–74 % type I, EMG→force time shifts 111–218 ms, back-pull RFD/PF → 190–390 ms, vs hip/trunk EMG→torque fit 1.3–1.5 × ankle and ballistic TPT 463 ms. Fall: no data | Very low | **Yes** |
| Trunk flexors (rectus abdominis, obliques) | **200–450 (300) ms** | **120–300 (200) ms** | 135 [89–204] | 68.5 [17–121] | Fibre type 55–58 % type I; "flexors faster than extensors" (Thelen 1994); no RTD; no relaxation | Very low | **Yes** |
| Trunk lateral flexors (obliques, quadratus lumborum, ipsilateral erector spinae) | **200–450 (300) ms** | **120–300 (200) ms** | 135 [89–204] | 68.5 [17–121] | No group-specific data; same muscles as extensors and flexors | Very low | **Yes** |
| Trunk axial rotators | **200–450 (300) ms** | **120–300 (200) ms** | 135 [89–204] | 68.5 [17–121] | No data | Very low | **Yes** |
| Neck extensors / flexors / lateral flexors | **180–300 (240) ms** | **150–300 (220) ms** | 107 [79–135] | 79 [39–121] | Rise [E]: 3 full-text voluntary data sets (187–296 ms; 148–214 from peak slope; pre-tension 285–327); no direction separable. Fall [E]: SCM twitch relaxation rate → ≈ 230 ms (one abstract, assumption on normalisation) | Rise moderate (best of Part 1); fall very low | Fall: **yes**; rise: preregister the range |
| Ankle evertors (peroneus longus/brevis) | **200–450 (300) ms** | **120–300 (200) ms** | 135 [89–204] | 68.5 [17–121] | Reflex-driven eversion torque, 66 % at 326 ms after platform onset → 284–404 ms depending on onset; fibre type 56–62 % type I; evoked EMD 9–13 ms. No relaxation data | Very low | **Yes** |
| Ankle invertors (tibialis posterior; TA) | **200–450 (300) ms** | **120–300 (200) ms** | 135 [89–204] | 68.5 [17–121] | **No timing data at all**; tibialis posterior 80 % MHC-I (as TA in the same sample). Fibre type does not rank torque kinetics across muscles (§7.2) | Very low | **Yes** |
| Elbow flexors | **150–250 (210) ms** | **110–180 (130) ms** | 94 [65–112] | 25 [≈ 0–57] | Twitch TPT 41–71 ms, HRT 37–63 ms; voluntary 30 % at 70 ms, 80 % at 204 ms → 214–229 ms. The 110 ms floor is the cascade minimum (τc,fall → 0) | Moderate | Preregister the range |
| Elbow extensors | **190–290 (230) ms** | **115–180 (140) ms** | 103 [84–131] | 32.5 [12–57] | Triceps brachii twitch TPT 84 ms × 2.35–2.83 (adopted-group calibration, §0.5) = 197–238 ms; HRT 63 ms × 1.9–2.8 = 120–176 ms | Low | Preregister the range |
| Shoulder (deltoid and other shoulder muscles) | **150–300 (220) ms** | **110–220 (150) ms** | 98 [65–135] | 39 [≈ 0–79] | No deltoid torque twitch found; borrows the elbow values widened; fibre type 50–64 % type I | Very low | **Yes** |
| *Knee flexors (refinement of MUSCLE-1's borrowing)* | *200–300 (240) ms* | *as knee extensors, 120–200 (160) ms* | *107 [89–131]* | *45 [17–79]* | Same-protocol RTD (Kozinc 2021): knee flexion 222–300 ms vs knee extension 167–235 ms, so ≈ 1.1–1.4× slower; hamstring twitch TPT 96 ± 42 ms (partial recruitment) | Low | Optional; it replaces "borrowed from extensors" |
| *Already adopted (MUSCLE-1, unchanged)* | PF 250–450 (325); DF 150–250 (200); KE 165–235 (200) | PF 120–250 (175); DF 230–360 (250); KE 120–200 (160) | 147 / 89 / 89 | 54 / 95 / 45 | — | — | — |

**Groups that must use sensitivity ranges (preregister low / central / high and report outcomes at all three):** all hip groups (fall always; rise recommended), all trunk groups, ankle invertors and evertors, shoulder, and the neck fall.

**Reasoning for the sensitivity design [D]:**
- **Low end.** The fastest adopted lower-limb rise (150 ms, dorsiflexors) and the cascade-feasible fall floor (110–120 ms).
- **High end.** Bounded by the slowest standing EMG→torque fits for that region, scaled to the adopted plantarflexor value (hip/trunk ≈ 1.3–1.5 × 325 ms ≈ 420–490 ms), and by the slowest adopted fall (DF 360 ms, used only up to 300 ms here).
- **Central.**
  - Where voluntary data exist (hip, neck, elbow): their calibrated midpoint.
  - Where they do not (trunk, ankle frontal, shoulder): the midpoint of the voluntary-derived hip range, 300 ms. This is not a measured value. It reflects that no evidence places these groups outside the lower-limb envelope.
- **Ordering constraints worth testing in the sensitivity runs** ([E] from same-protocol [M] data): hip abductors/adductors ≤ hip extensors/flexors; knee flexors slower than knee extensors; neck ≈ dorsiflexors / knee extensors.
- **Do not make hip or trunk force faster than the ankle because their neural loops are faster.** The fast hip/trunk *delays* (66–79 ms; PPR-3) are neural; the measured hip/trunk *force development* is as slow as, or slower than, the plantarflexors' (Kiemel fits 544–660 vs 420–592 ms; Kozinc hip 198–275 vs PF 210–225 ms).

**EMD (if a lumped model needs it).** Use MUSCLE-1's values (evoked ≈ 10–15 ms; voluntary ≈ 20–30 ms from rest on low-noise rigs) for all groups. Group-specific published values are method-inflated: gluteus medius "50–66 ms" [SEC], lumbar ES 70 ms, SCM 70 ms at a 13-SD threshold. The evoked peroneus longus EMD (9–13 ms) matches the leg values. The pure 8.3 ms delay in the cascade already represents the electrochemical part.

## 19.2 Recommended sensory delays (sensed state → excitation)

**Rules.**
- Delays are EMG-onset latencies, mapped onto excitation (Part 2 timing convention).
- At 240 Hz, round **up** to whole steps (PPR-3 §6), so no pathway is faster than in humans.
- Each observation must carry the timestamp of the physical state it reflects.

| Channel | Destination muscles | Delay range | Central | Steps @ 240 Hz (central) | Basis | Label |
|---|---|---|---|---|---|---|
| Segmental stretch reflex (optional, low gain) | ankle / knee / hip–lumbar / neck | 41–46 / 20–25 / 25–28 / 22–25 ms | unchanged from PPR-3 §6.2 | 10–11 / 5–6 / 6–7 / 6 | PPR-3 §1a | [M] |
| Task-level body/COM state (proprioceptive + vestibular) | ankle muscles | 85–130 ms | **100 ms** | 24 | PPR-3 §6.2 (88 ± 19, 97, 104, 128 ms) | [D] on [MODEL] |
| Same | hip and trunk muscles | 65–100 ms | **75 ms** | 18 | Gluteus medius 74 ms; Gilles 70–80 ms; eigenmode 66 ± 10 ms; Engelhart 79 ms | [D] on [M]/[MODEL] |
| Plantar cutaneous / foot load / COP | leg muscles | 75–100 ms (earliest low-gain cutaneous reflex 40–54 ms) | **80 ms** | 20 | Standing soleus 84, TA 77 ms; sural 76–79 ms; seated TA 93–96 ms; Nakajima 70–110 ms | [D] on [M] |
| Vestibular | neck muscles (vestibulocollic) | 8–25 ms | **22 ms** | 6 | Natural head acceleration (head free-fall): SCM 22–25 ms (Ito 1995, PPR-3; Ito 1997 24.5 ms). Artificial stimuli that bypass transduction are faster (click VEMP onset 8.2 ms; EVS peaks 12 / 21 ms; motor units 11.7–12.7 ms), so they set only the lower bound | [M] |
| Vestibular | trunk / paraspinal muscles | 45–110 ms | **65 ms** | 16 | Seated short/medium latency 45.5 / 73.2 ms; standing 59–110, 74 ± 20 ms; review ≈ 61 ms | [M] |
| Vestibular | leg muscles | early 55–62 ms (small); sway-driving 100–120 ms | **110 ms** (sway-driving) | 27 | Soleus 62 / 115, 56 / 105 ms (PPR-3); gastrocnemius 118 ± 18 ms | [M] |
| Vestibular | arm muscles used posturally | 41 / 138 ms (early / late) | 138 ms (late) | 34 | Britton 1993, triceps | [M] |
| Neck proprioception (head-on-trunk) | leg muscles | 70–100 ms | **80 ms** | 20 | Neck vibration → TA / triceps surae 70–100 ms | [M] |
| Neck proprioception | neck muscles (cervicocollic) | 25–70 ms | **50 ms** | 12 | Earliest SCM response without labyrinths 67.4 ms; vestibular 24.5 ms in normals (head drop) | [E], weak |
| Trunk orientation / angular velocity, proprioceptive | trunk / hip | 25–40 ms (velocity) | **30 ms** | 8 | Goodworth & Peterka frontal-plane proprioceptive velocity 25 ± 6 ms [MODEL]; must not act inside W0 (0–30 ms; PPR-3 §1g) | [MODEL] |
| Trunk orientation, graviceptive / vestibular | trunk | 65–135 ms | 100 ms | 24 | Vestibular/visual velocity 135 ± 18 ms [MODEL]; vestibular → trunk 45–110 ms [M] | [D] |
| COM / whole-body state estimate (if an estimator is used) | any | no channel newer than its row above; operational 70–130 ms | 90–100 ms | 22–24 | COM-scaled EMG at 88 ± 10–19 ms; Kiemel 128 ms | [D] on [M]/[MODEL] |
| Visual (if modelled) | any | 180–210 ms | 200 ms | 48 | PPR-3 | [M]/[MODEL] |
| Voluntary / decision | any | ≥ 140–200 ms | — | — | PPR-3 | [M] |

**Sensory resolution and adaptation (same table, for the estimator) [D on M]:**

| Quantity | Value | Use |
|---|---|---|
| Whole-body sway velocity perception threshold | 0.00045 (actively balancing) – 0.0018 rad/s (proprioceptive) | Order of magnitude for velocity noise or dead-zone |
| Sway position perception threshold | 0.003 rad (0.17°) at slow sway | Position noise scale |
| Vestibular-only threshold | ≈ 10× the proprioceptive one at sway speeds (≈ 0.01 rad at 0.004 rad/s, SEC) | If vestibular is modelled separately, it must be the noisier channel |
| Ankle rotation threshold | 0.04° at 2.5°/s; 0.41° at 0.1°/s | Velocity-dependent ankle angle resolution |
| Reweighting time | 1–3 s to steady state | No instantaneous sensory reweighting |

**Prediction (controller B) limits [D on M]:**
- A forward model may propagate the body's *own* state over the sensory delay using efference copy and known dynamics (§12.4).
- It must not reduce the latency of the first disturbance-specific excitation change below the row delays above. In humans, foreknowledge does not speed reactive responses, and unpredictable perturbations produce no anticipatory activity.
- If B produces sway or thresholds outside the §19.3 human ranges (better than human), the benefit exceeds the evidence. The human reference: trained tolerance ≈ 1.5–1.9 × the non-predictive critical delay, at ≈ 38× sway variance; model acceleration feedback gives +40 % delay tolerance.

## 19.3 Human comparison table for the no-step battery

**Assumptions.** Healthy young adults; brief pelvis pushes (≤ 0.2 s) near the COM; feet about hip width; values scaled to **73.9 kg** [E] (impulse = m·Δv; F·t/m is an upper bound on Δv). Pushes from behind = forward. All "Δv" are COM velocity changes.

### 19.3.1 Quiet standing

| Measure | Human range | Label, source |
|---|---|---|
| COM RMS AP / ML | 4.1–4.3 / 1.7–2.0 mm | [M] PPR-3 (Foulger 2025) |
| COP SD AP / ML; COP velocity; median frequency | 4.6 ± 2.2 / 3.1 ± 0.9 mm; 6–9 mm/s; ≈ 0.3 Hz | [M] PPR-3 |
| Joint-angle SD (within trial) | ankle ≈ 0.21°, knee ≈ 0.18°, hip ≈ 0.30°, neck ≈ 0.31°; **hip ≥ ankle ≈ knee**. [D] Acceptance band 0.1–0.6° per joint (×0.5–2 of the means; one study, n = 10) | [M] Wang 2014 |
| Trunk–leg coordination | In phase below ≈ 0.8 Hz; anti-phase above ≈ 1.1 Hz; anti-phase mode fundamental 1.1–1.4 Hz; hip/ankle angle ratio along it −3.0 to −3.7 | [M] Zhang 2007; Creath 2008; Suzuki 2016 |
| COP–COM | Coherence ≈ 0.8–1 below 0.8 Hz; in phase up to ≈ 0.12 Hz, COM leads COP above | [M] Wang 2014 |
| Head | Locked to trunk below 0.7 Hz; head not stabilised in space (the pelvis is) | [M] Honegger 2012 |
| Tone | Per joint as `STANDING_TONE_LITERATURE.md` §2 (e.g. gluteus medius 2–6 %, lumbar ES 2–7 %, neck extensors 2–7 % MVC) | [M] PPR-3 tone |

### 19.3.2 Feet-in-place thresholds (the human capability limit)

| Direction | Threshold Δv | Impulse at 73.9 kg | Fraction of zero-delay XcoM limit | Basis |
|---|---|---|---|---|
| Forward | **0.22–0.31 m/s** | **16–23 N·s** | ≈ 0.40–0.46 (≤ 0.2 s pushes); up to ≈ 0.6 for 100 ms pulls ("try not to step") | [M/E] Emmens 2020 (≤ 0.216, "natural"); Robert 2018 (0.239–0.314); Rietdyk (≤ 0.23) |
| Backward | **0.15–0.22 m/s** | **11–16 N·s** | ≈ 0.45 | [M/E] Emmens 2020 (≤ 0.145); ratio to forward 0.67–0.91 (Emmens; Crenshaw torque 0.86; Sturnieks 0.91) |
| Lateral (hip-to-shoulder width) | **0.27–0.35 m/s** | **20–26 N·s** | not determinable (stance widths not reported) | [M/E] Rietdyk (≤ 0.27; 3/10 stepped); Zhu 2022 (42 % stepped at 0.35 m/s position-controlled pulls); lateral ≈ 1.4 × AP by force in older adults (Sturnieks) |

**Lateral confidence is low.** At the character's 0.42 m ankle spacing, no human threshold exists. The zero-delay XcoM limit roughly doubles from a 17 cm to a 42 cm stance (Appendix A.6), but humans have not been measured there, and a frontal-plane model predicts reduced mechanical stability with width (Bingham 2011).
- **[D]** Preregister the hip-width human values as the human comparison.
- **[D]** Report separately the fraction of the character's own zero-delay ML XcoM limit at which it fails; do not present that fraction as a human-validated value.

### 19.3.3 Push levels and expected human responses

Levels are fractions of the central threshold T (forward 0.26, backward 0.18, lateral 0.31 m/s) [D]:
- small ≈ 0.25–0.4 T
- moderate ≈ 0.55–0.75 T
- large ≈ T
- over-limit ≈ 1.3–1.6 T

| Level | Forward | Backward | Lateral (hip width) | Expected human outcome |
|---|---|---|---|---|
| **Small** | 5–8 N·s (0.07–0.11 m/s) | 3–5 N·s (0.04–0.07 m/s) | 6–9 N·s (0.08–0.12 m/s) | Feet in place always. AP mostly ankle; ML hip load/unload from the start |
| **Moderate** | 10–14 N·s (0.14–0.19 m/s) | 7–10 N·s (0.09–0.14 m/s) | 13–17 N·s (0.17–0.23 m/s) | Feet in place. Hip/trunk added; COP approaches the edge of the usable base |
| **Large** | 16–23 N·s (0.22–0.31 m/s) | 11–16 N·s (0.15–0.22 m/s) | 20–26 N·s (0.27–0.35 m/s) | At the human limit: about half of young adults step under "try not to step"; feet-in-place recovery possible but marginal (heel/toe lift, large hip motion) |
| **Over-limit** | ≥ 26–30 N·s (≥ 0.35–0.41 m/s) | ≥ 18–21 N·s (≥ 0.24–0.29 m/s) | ≥ 30–35 N·s (≥ 0.40–0.47 m/s) | Humans step (or fall if prevented). **A feet-in-place recovery here exceeds human capability** and should count as a fail of the human-likeness criterion |

These bands agree with PPR-2 §9(c) and refine it with Emmens 2020 and the verified Robert formula. The main changes are a lower forward "moderate" band (10–14 vs 12–16 N·s) and an explicit over-limit level.

### 19.3.4 Response metrics for pushes (all levels below the limit)

| Measure | Human range | Label, source |
|---|---|---|
| No neural change in the disturbed twin before | ≈ 30 ms anywhere; ≈ 70 ms for task-level hip/trunk; ≈ 100 ms for ankle task-level; ≈ 22–25 ms vestibulocollic (neck; PPR-3 W0) | [E] §19.2; PPR-3 §1g |
| First postural EMG | 70–110 ms (pelvis push: gluteus medius 74 ms; contralateral adductor 111 ms) | [M] Kirker 2000; Gilles 1999; PPR-3 |
| Active torque onset | 100–160 ms (central ≈ 130 ms); ML vertical load transfer from ≈ 100 ms | [M] PPR-3; Inacio 2019 |
| Peak COM excursion | ≈ (0.24–0.34 s) × Δv (e.g. ≈ 3.6–8.5 cm for Δv 0.15–0.25 m/s) | [E] Rietdyk 5.6 / 6.4 cm at Δv ≤ 0.23 / 0.27 m/s → ≥ 0.24 s; van Mierlo ≤ 0.5 cm per % BW for 150 ms pushes → ≤ 0.34 s (Appendix A.6) |
| Time of COM peak; velocity reversal | 0.4–0.6 s; 0.4–0.5 s (up to 0.8 s) | [M] Rietdyk; van Mierlo 2023 |
| Overshoot | Small: ≤ ≈ 15 % of peak (0.7–0.8 cm on 5.6–6.4 cm); ankle-only releases overshoot-free (critically damped) | [M] Rietdyk; Zelei 2021 |
| Return to upright; full settling | ≈ 1 s; 2–3 s | [M] Welch & Ting 2009; Rietdyk |
| ML moment share | Hips ≈ 85–90 %, ankles ≈ 10–15 % (side-by-side stance) | [M] Rietdyk; Winter 1996 |
| Knee flexion | ≈ 4–5° (± 3.8°) at moderate-to-large perturbations | [M] Rietdyk; Afschrift 2016 |
| Strategy scaling | Hip contribution rises continuously with magnitude; no pure hip strategy; ankle torque saturates before the heel-lift limit | [M] Runge 1999; Park 2004; Kim 2009 |
| Peak ankle torque | Below the flat-foot limit, which is ≈ 0.073 × body weight × height in young adults (≈ 95 N·m at 73.9 kg, 1.80 m [E]; it depends on the subject's COP–ankle geometry); peak torque is suppressed before this limit is reached. Lean-release peak 116 ± 32 N·m | [M] Kim 2009; Robinovitch 2002 |
| Joint-moment rate | Average maximum ≈ 250 N·m/s (platform); 372 ± 267 N·m/s (lean-release, ankle) | [M/MODEL] Afschrift 2016; Robinovitch 2002 |
| Trunk | Trunk motion starts within ≈ 30 ms (passive); trunk pitch velocity peak ≈ 200 ms | [M] Allum 2002 |
| Head | Moves with the trunk; neck muscles little active for body perturbations; head-motion onset ≈ 120 ± 46 ms (slow translation). No numeric head-excursion target exists | [M] Shupert & Horak 1996; Keshner & Dhaher 2008; Honegger 2012 |

---

# 20. Gaps, conflicts and corrections

## 20.1 Data gaps (not found in accessible sources)

1. **Evoked twitch/tetanus as torque** for every hip, trunk, neck and ankle frontal-plane group. Only the elbow flexors and triceps brachii have them.
2. **Relaxation of any kind** for hip, trunk, ankle frontal-plane and shoulder muscles. The neck has one indirect SCM value.
3. **Trunk voluntary RTD at fixed times** (% MVC at 50/100/200 ms) for extension, flexion, lateral bend and rotation. Kozinc 2021 measured trunk torque but deliberately did not compute RTD.
4. **Tibialis posterior** kinetics and EMD; non-weight-bearing rapid eversion RTD.
5. **Quadratus lumborum and semispinalis** fibre type; TMG of the obliques and neck muscles.
6. **GVS latency in gluteus medius**; onset latency of GVS-evoked whole-body motion; Fallon 2005 single-afferent latencies; Kavounoudias vibration-response latency; Assländer & Peterka 2014 reweighting time constants; Kuo 2005 delay value.
7. **Young-adult ML feet-in-place threshold** at a stated stance width, and its dependence on stance width.
8. **Joint-angle excursions in degrees vs perturbation size**, measured joint-torque peak times, and trunk pitch excursion. All are figure-only in Kim 2009, Welch & Ting 2009 and Allum 2002.
9. **Numeric head excursion** (degrees, deg/s) during standing pushes or translations in young adults.
10. **SCM and splenius % MVC** in quiet standing.
11. **COM–COP amplitude ratio** and the dominant low-frequency joint-angle sway frequency.
12. **Publisher-blocked sources:**
    - Mille 2003, Robert 2018, Hof & Curtze 2016 and Henry 2001 (full texts);
    - Pinter 2008, Hsu 2007 and Günther 2009 (joint variances);
    - Mannion 1997 and Boyd-Clark 2001 (fibre-type numbers);
    - Tiller 2017 (abdominal twitch time course, image table).

## 20.2 Conflicts register

| # | Conflict | Sources | Most likely explanation | Consequence |
|---|---|---|---|---|
| 1 | Hip rise: voluntary 186–338 ms vs standing EMG→torque fits 544–660 ms | Kozinc, McNabb, Ishøi vs Kiemel 2008/2011 | Small-signal, low-force fits are slower for every joint (MUSCLE-1 conflict #1); same ratio applies to the ankle | Use the same-protocol calibration; range 200–400 ms |
| 2 | Trunk: fast indicators (fibre type, time shifts, RFD/PF) vs slow (hip/trunk fit, ballistic TPT 463 ms, ES EMD 70 ms) | §3.4 | Task differences (submaximal targeted "shoot and release"; threshold-based EMD); no direct step data | Widest sensitivity range (200–500 ms) |
| 3 | Gluteus medius EMD 50–66 ms vs 17–33 ms | Anders 2021 (SEC) vs Dieterich 2015 | Torque vs tissue-motion end-points; Kim 2011 values unverified | Do not use a hip-specific EMD |
| 4 | TMG Tc ranks gastrocnemius fastest; torque twitch ranks triceps surae slowest | Paravlic 2025 vs MUSCLE-1 | TMG measures belly displacement, not joint torque | TMG excluded from cross-muscle ranking |
| 5 | Fibre type vs torque speed across muscles | TA (73 % type I) faster than whole triceps surae; Hucteau 2020: no intermuscular correlation of twitch kinetics | Tendon compliance and architecture | Fibre type used only as a bound |
| 6 | Neck rise 148–214 (peak slope) vs 187–256 (fractions) vs 270–296 (T50) vs 285–327 ms (pre-tension) | Almosnino 2010; Nagai 2023; Murray 2020 | Descriptor choice; reaction-time trials plateau; pre-tension | Range 180–300 ms |
| 7 | Peroneus longus voluntary EMD 24 ms vs 122–133 ms | Vaes 2002 vs Flevas 2017 | End-point (acceleration vs torque threshold), rig | Use evoked 9–13 ms / generic voluntary 20–30 ms |
| 8 | AP threshold "natural" (≤ 0.41–0.45 of XcoM) vs "try not to step" (0.46–0.61) | Emmens 2020 vs Robert 2018 | Instruction; people step before necessity | Thresholds given as a range spanning both |
| 9 | Wider stance: larger geometric XcoM limit vs lower mechanical stability (model); COM excursion unchanged with width | Appendix A.6 vs Bingham 2011; Henry 2001 | No direct measurement | Lateral thresholds at wide stance not claimed as human |
| 10 | Rogers-lab lateral pull level 5: 50 cm/s vs 31.5 cm/s at 22.5 cm | Bair 2016 etc. vs Hilliard 2008 | Unresolved reporting difference | Not used for magnitudes |
| 11 | Predictive models tolerate +40 % delay; trained humans 1.5–1.9× critical delay, but naive humans fail at +200–300 ms | Insperger 2013; Rasman 2021 | Learning over ≈ 100 min; cost in sway variance | Limit controller B (§19.2) |
| 12 | Vestibular role: unchanged onsets in BVL vs large late-response reductions | Allum 1994; Carpenter 2001; Horak 1994 | Vestibular scales the 120–240 ms response; it does not trigger it | Vestibular → leg at ≈ 110 ms, not earlier |

## 20.3 Corrections and refinements to earlier repository reviews

1. **PPR-3 §3 / §9 ("no numeric joint-angle SDs in degrees"):** now available. Wang et al. 2014 (FT) gives within-trial SDs of ankle 0.21°, knee 0.18°, hip 0.30° and neck 0.31° in side-by-side stance (n = 10).
2. **PPR-2 §5.2, Crenshaw & Kaufman 2014** (previously from a summary tool: forward 4.1, backward 3.5, lateral 3.4–3.5 m/s²).
   - Full-text Table 1 gives visit-1 means of 3.90 (anterior fall) and 3.27 (posterior fall) m/s², visit-2 means of 4.00 / 3.43, and lateral (feet touching) 3.30 / 3.20 m/s². These are the compiler's means of the table rows.
   - The authors' own threshold torques are 273.0 ± 82.3 and 235.5 ± 98.0 N·m. The posterior/anterior ratio of 0.86 is unchanged.
3. **PPR-2 §5.2, Robert 2018 formula** ("not checked against the full text"): the formula F50 = 2434/t_p + 7.69 (% BW) is now verified verbatim in Liu et al. 2024 (FT). It is still secondary; the ms unit is inferred.
4. **PPR-3 §6.2, "Vestibular (if separate) ≈ 100–110 ms":** this holds for *leg* muscles only. Vestibular → trunk is 45–110 ms (central ≈ 65 ms) and vestibular → neck is 8–25 ms (§9).
5. **PPR-3 §2.5 item 4, "Hip/trunk loops are faster":** correct for neural *delay*. Hip/trunk *force development* is not faster than the plantarflexors' (§2.6, §19.1). A controller should not combine fast hip delays with fast hip actuators.
6. **MUSCLE-1 §12.2 (knee flexors borrowed from extensors):** same-protocol RTD data (Kozinc 2021) put the knee flexors ≈ 1.1–1.4× slower. An optional refinement is in §19.1.
7. **MUSCLE-1 Appendix A.4:** the compiler's re-implementation reproduces every entry within ≈ 1 ms except 600 ms → τc,rise 273 ms (vs 278 ms). The difference probably comes from simulation length and is immaterial to the adopted ranges.
8. **ABI-1 §5 (McIlroy & Maki 1995 shoulder onset):** still unverified. A deltoid onset of "100 ms in the young" is now verified in Allum et al. 2002 (FT) for support-surface rotations.
9. **Segment-E note:** Kirker 2000's contralateral adductor latency of 111 ms is already in PPR-3 §1c; it is not new here.


## 20.4 Items that could not be verified (not used as primary evidence)

| Item | Status |
|---|---|
| Johnson 1973 and Tirrell 2012 per-muscle fibre-type values | SEC only (Queeno 2023 dataset cells); original tables / Table S1 not read; which Johnson site value is superficial vs deep is unknown |
| Gluteus medius EMD "about 50–66 ms" (Anders 2021 citing Kim 2011, Dieterich 2015) | [UNVERIFIED]; Kim 2011 values not in the abstract |
| Cornwall & Kennedy 2015 longus colli / capitis fibre type | SEC via Pollak 2025; bibliographic details not looked up |
| Tiller 2017 abdominal twitch contraction / half-relaxation time | Measured, but in an unreadable image table |
| Robert 2018 formula unit (ms) | Inferred from the 10 % BW asymptote, not read |
| Kuo 2005 delay value | [UNVERIFIED]; Rasman 2021 cites it for ≈ 100–160 ms |
| Fitzpatrick & McCloskey 1994 proprioceptive (0.0018 rad/s) and vestibular (≈ 0.01 rad at 0.004 rad/s) numbers | SEC via Tisserand 2022; the abstract gives only the all-senses value and the qualitative ratios |
| McIlroy & Maki 1995 shoulder-muscle onset in ms | Not in the abstract |
| Torres-Oviedo & Ting 2010: identical perturbation at all stance widths | Not confirmed (FT-W summary) |
| Batcir 2020 perturbation velocities/accelerations | Units misprinted in the source ("cm/ms") |
| Insperger 2013 closed-form critical delay | Seen only in a summariser output; deliberately not reproduced |
| Pinter 2008, Hsu 2007, Günther 2009 joint-angle variances | Publisher 403 |
| Mannion 1997, Boyd-Clark 2001, Arbanas 2009, Sirca 1980 fibre-type numbers | Scanned or closed full texts; abstracts qualitative |
| Dotan 2013 elbow torque at 100 ms | Unit ambiguous in the summariser output; not used |
| Birkbeck 2024 per-muscle peroneus longus MRI twitch times | Full text 403 |
| Watson & Colebatch 1998 exact galvanic VCR peak latencies | Abstract gives names (p13/n23) only |
| Kirker 2000 push magnitude | Not in the abstract |

---

# 21. References

**Sources of metadata.** Europe PMC / NCBI records retrieved in this session. Access codes: FT, FT-W, ABS, SEC (see §0.2). "re-checked" = the number used in §19 was verified by the compiler against the abstract or full text. Fibre-type values marked "SEC via Queeno dataset" were read from the cells of the Queeno et al. 2023 Mendeley spreadsheet (doi:10.17632/y47mj24ywy.3), not from the original tables.

### Part 1 — Hip

1. Kozinc Ž, Smajla D, Šarabon N (2021). The relationship between lower limb maximal and explosive strength and change of direction ability: comparison of basketball and tennis players, and long-distance runners. *PLoS One* 16:e0256347. doi:10.1371/journal.pone.0256347. PMID 34407142. PMC8372951. FT, re-checked.
2. McNabb K, Sánchez MB, Selfe J, Reeves ND, Callaghan M (2024). Handheld dynamometry: validity and reliability of measuring hip joint rate of torque development and peak torque. *PLoS One* 19:e0308956. doi:10.1371/journal.pone.0308956. PMID 39150968. PMC11329127. FT, re-checked.
3. Ishøi L, Thorborg K, Krohn L, Louis Andersen L, Møller Nielsen A, Bek Clausen M (2023). Maximal and explosive muscle strength during hip adduction squeeze and hip abduction press test using a handheld dynamometer: an intra- and inter-tester reliability study. *Int J Sports Phys Ther* 18:905–916. doi:10.26603/001c.83259. PMID 37547845. PMC10399103. FT.
4. Inacio M, Creath R, Rogers MW (2019). Effects of aging on hip abductor-adductor neuromuscular and mechanical performance during the weight transfer phase of lateral protective stepping. *J Biomech* 82:244–250. doi:10.1016/j.jbiomech.2018.10.040. PMID 30455060. PMC6310621. FT.
5. Lanza MB, Addison O, Ryan AS, J Perez W, Gray V (2020). Kinetic, muscle structure, and neuromuscular determinants of weight transfer phase prior to a lateral choice reaction step in older adults. *J Electromyogr Kinesiol* 55:102484. doi:10.1016/j.jelekin.2020.102484. PMID 33176230. PMC8209691. FT.
6. Lanza MB, Rock K, Marchese V, Addison O, Gray VL (2021). Hip abductor and adductor rate of torque development and muscle activation, but not muscle size, are associated with functional performance. *Front Physiol* 12:744153. doi:10.3389/fphys.2021.744153. PMID 34721067. PMC8551702. FT (rejected for fraction-of-peak use).
7. Kim S, Yoo T, Burland JP, Glaviano NR (2025). Validity and agreement of a portable dynamometer in evaluating hip strength and rate of torque development: influence of fixation methods. *Int J Sports Phys Ther* 20:606–617. doi:10.26603/001c.133495. PMID 40182909. PMC11964701. FT (internally inconsistent; not used).
8. Yoo T, Kim S, Burland JP, Glaviano NR (2025). Reliability of hand-held dynamometer in measuring gluteal muscle rate of torque development and peak torque: push and pull configurations. *Int J Sports Phys Ther* 20:595–605. doi:10.26603/001c.133550. PMID 40182912. PMC11964699. FT (not used).
9. Stearns-Reider KM, Powers CM (2018). Rate of torque development and feedforward control of the hip and knee extensors: gender differences. *J Mot Behav* 50:321–329. doi:10.1080/00222895.2017.1363692. PMID 28985154. ABS.
10. Palmer TB, Thiele RM, Williams KB, Adams BM, Akehi K, Smith DB, Thompson BJ (2015). The identification of fall history using maximal and rapid isometric torque characteristics of the hip extensors in healthy, recreationally active elderly females. *Aging Clin Exp Res* 27:431–438. doi:10.1007/s40520-014-0305-0. PMID 25539974. ABS.
11. Palmer TB, Thiele RM, Thompson BJ (2017). Age-related differences in maximal and rapid torque characteristics of the hip extensors and dynamic postural balance in healthy, young and old females. *J Strength Cond Res* 31:480–488. doi:10.1519/jsc.0000000000001503. PMID 27227788. ABS.
12. Farrow AC, Palmer TB (2021). Age-related differences in hip flexion maximal and rapid strength and rectus femoris muscle size and composition. *J Appl Biomech* 37:311–319. doi:10.1123/jab.2020-0383. PMID 33906159. ABS.
13. Morcelli MH, LaRoche DP, Crozara LF, Marques NR, Hallal CZ, Rossi DM, Gonçalves M, Navega MT (2016a). Neuromuscular performance in the hip joint of elderly fallers and non-fallers. *Aging Clin Exp Res* 28:443–450. doi:10.1007/s40520-015-0448-7. PMID 26400861. ABS.
14. Morcelli MH, Rossi DM, Karuka AH, Crozara LF, Hallal CZ, Marques NR, Gonçalves M, Navega MT (2016b). Peak torque, reaction time, and rate of torque development of hip abductors and adductors of older women. *Physiother Theory Pract* 32:45–52. doi:10.3109/09593985.2015.1091870. PMID 26756456. ABS.
15. Ito T, Tsubahara A, Watanabe S (2013). Use of electrical or magnetic stimulation for generating hip flexion torque. *Am J Phys Med Rehabil* 92:755–761. doi:10.1097/phm.0b013e318282c643. PMID 23370583. ABS.
16. Anders C, Sander K, Layher F, Patenge S, Kinne RW (2021). Temporal and spatial relationship between gluteal muscle surface EMG activity and the vertical component of the ground reaction force during walking. *PLoS One* 16:e0251758. doi:10.1371/journal.pone.0251758. PMID 34038412. PMC8153502. FT (SEC for gluteus medius EMD).
17. Kim JW, Kwon Y, Chung HY, Eom GM, Jun JH, Chung JS, Park BK (2011). Age-sex differences in the hip abductor muscle properties. *Geriatr Gerontol Int* 11:333–340. doi:10.1111/j.1447-0594.2011.00693.x. PMID 21410857. ABS.
18. Dieterich AV, Pickard CM, Deshon LE, Strauss GR, Gibson W, Davey P, McKay J (2015). M-mode ultrasound used to detect the onset of deep muscle activity. *J Electromyogr Kinesiol* 25:224–231. doi:10.1016/j.jelekin.2014.12.006. PMID 25636500. ABS.
19. Johnson MA, Polgar J, Weightman D, Appleton D (1973). Data on the distribution of fibre types in thirty-six human muscles. An autopsy study. *J Neurol Sci* 18:111–129. doi:10.1016/0022-510x(73)90023-3. PMID 4120482. SEC via Queeno dataset (no abstract; original tables not read).
20. Tirrell TF, Cook MS, Carr JA, Lin E, Ward SR, Lieber RL (2012). Human skeletal muscle biochemical diversity. *J Exp Biol* 215:2551–2559. doi:10.1242/jeb.069385. PMID 22786631. PMC3394665. ABS + FT-W (methods) + SEC via Queeno dataset (per-muscle values).
21. Queeno SR, Sterner KN, O'Neill MC (2023). Meta-analysis data of skeletal muscle slow fiber content across mammalian species. *Data Brief* 50:109520. doi:10.1016/j.dib.2023.109520. PMID 37701714. PMC10493253. FT + dataset.
22. Evangelidis PE, Massey GJ, Ferguson RA, Wheeler PC, Pain MTG, Folland JP (2017). The functional significance of hamstrings composition: is it really a "fast" muscle group? *Scand J Med Sci Sports* 27:1181–1189. doi:10.1111/sms.12786. PMID 27739112. ABS.
23. Arbanas J, Klasan GS, Nikolic M, Jerkovic R, Miljanovic I, Malnar D (2009). Fibre type composition of the human psoas major muscle with regard to the level of its origin. *J Anat* 215:636–641. doi:10.1111/j.1469-7580.2009.01155.x. PMID 19930517. ABS.
24. Paravlic AH (2025). Establishing reference values for tensiomyography-derived parameters in soccer players: insights from a systematic review, meta-analysis and meta-regression. *Biol Sport* 42:171–192. doi:10.5114/biolsport.2025.139853. PMID 39758175. PMC11694203. FT.
25. Sučka J, Pajonková F, Čech P, Lenková R (2026). Limited positional differences in lower-limb muscle contractile properties among female football players. *Front Sports Act Living* 8:1915995. doi:10.3389/fspor.2026.1915995. PMID 42630297. PMC13493519. FT.
26. Šimunič B, Degens H, Rittweger J, Narici M, Mekjavić IB, Pišot R (2011). Noninvasive estimation of myosin heavy chain composition in human skeletal muscle. *Med Sci Sports Exerc* 43:1619–1625. doi:10.1249/mss.0b013e31821522d0. PMID 21552151. ABS.
27. Dahmane R, Djordjevic S, Simunic B, Valencic V (2005). Spatial fiber type distribution in normal human muscle: histochemical and tensiomyographical evaluation. *J Biomech* 38:2451–2459. doi:10.1016/j.jbiomech.2004.10.020. PMID 16214493. ABS.
28. Hamada T, Sale DG, MacDougall JD, Tarnopolsky MA (2000). Postactivation potentiation, fiber type, and twitch contraction time in human knee extensor muscles. *J Appl Physiol* 88:2131–2137. doi:10.1152/jappl.2000.88.6.2131. PMID 10846027. ABS.
29. Kiemel T, Elahi AJ, Jeka JJ (2008). Identification of the plant for upright stance in humans: multiple movement patterns from a single neural strategy. *J Neurophysiol* 100:3394–3406. doi:10.1152/jn.01272.2007. PMID 18829854. PMC2604857. FT (EMG muscles re-checked).
30. Kiemel T, Zhang Y, Jeka JJ (2011). Identification of neural feedback for upright stance in humans: stabilization rather than sway minimization. *J Neurosci* 31:15144–15153. doi:10.1523/jneurosci.1013-11.2011. PMID 22016548. PMC3470452. FT.

### Part 1 — Trunk and neck

31. Lagan J, Lang P, Strutton PH (2008). Measurement of voluntary activation of the back muscles using transcranial magnetic stimulation. *Clin Neurophysiol* 119:2839–2845. doi:10.1016/j.clinph.2008.09.013. PMID 18976953. ABS.
32. Szepietowski O, Ertman H, Chiou SY, Strutton PH (2025). Measurement of voluntary activation of abdominal flexors using transcranial magnetic stimulation. *J Electromyogr Kinesiol* 80:102961. doi:10.1016/j.jelekin.2024.102961. PMID 39637546. ABS.
33. Kyroussis D, Mills GH, Polkey MI, Hamnegard CH, Koulouris N, Green M, Moxham J (1996). Abdominal muscle fatigue after maximal ventilation in humans. *J Appl Physiol* 81:1477–1483. doi:10.1152/jappl.1996.81.4.1477. PMID 8904556. ABS.
34. Tiller NB, Campbell IG, Romer LM (2017). Influence of upper-body exercise on the fatigability of human respiratory muscles. *Med Sci Sports Exerc* 49:1461–1472. doi:10.1249/mss.0000000000001251. PMID 28288012. PMC5473371. FT (text; table values not read).
35. Boucher JA, Normand MC, Descarreaux M (2013). Trunk isometric force production parameters during erector spinae muscle vibration at different frequencies. *J Neuroeng Rehabil* 10:89. doi:10.1186/1743-0003-10-89. PMID 23919578. PMC3750832. FT.
36. Descarreaux M, Blouin JS, Teasdale N (2005). Isometric force production parameters during normal and experimental low back pain conditions. *BMC Musculoskelet Disord* 6:6. doi:10.1186/1471-2474-6-6. PMID 15703067. PMC549631. FT.
37. Zemková E, Poór O, Pecho J (2019). Peak rate of force development and isometric maximum strength of back muscles are associated with power performance during load-lifting tasks. *Am J Mens Health* 13:1557988319828622. doi:10.1177/1557988319828622. PMID 30819070. PMC6775675. FT.
38. Fagbemigun RO, Cavallo M, Brown SHM (2023). The effects of posture and dynamic stretching on the electromechanical delay of the paraspinal muscles. *J Appl Biomech* 39:179–183. doi:10.1123/jab.2022-0271. PMID 37105546. ABS.
39. Stokes IA (2005). Relationships of EMG to effort in the trunk under isometric conditions: force-increasing and decreasing effects and temporal delays. *Clin Biomech* 20:9–15. doi:10.1016/j.clinbiomech.2004.08.010. PMID 15567531. ABS.
40. Thelen DG, Schultz AB, Ashton-Miller JA (1994). Quantitative interpretation of lumbar muscle myoelectric signals during rapid cyclic attempted trunk flexions and extensions. *J Biomech* 27:157–167. doi:10.1016/0021-9290(94)90204-6. PMID 8132683. ABS.
41. Radebold A, Cholewicki J, Panjabi MM, Patel TC (2000). Muscle response pattern to sudden trunk loading in healthy individuals and in patients with chronic low back pain. *Spine* 25:947–954. doi:10.1097/00007632-200004150-00009. PMID 10767807. ABS.
42. Kocjan A, Šarabon N (2020). Increased liveliness of trunk muscle responses in elite kayakers and canoeists. *Sports (Basel)* 8:E78. doi:10.3390/sports8060078. PMID 32485794. PMC7353639. FT.
43. Thorstensson A, Carlson H (1987). Fibre types in human lumbar back muscles. *Acta Physiol Scand* 131:195–202. doi:10.1111/j.1748-1716.1987.tb08226.x. PMID 2960128. ABS.
44. Sirca A, Kostevc V (1985). The fibre type composition of thoracic and lumbar paravertebral muscles in man. *J Anat* 141:131–137. PMID 2934358. PMC1166395. ABS.
45. Häggmark T, Thorstensson A (1979). Fibre types in human abdominal muscles. *Acta Physiol Scand* 107:319–325. doi:10.1111/j.1748-1716.1979.tb06482.x. PMID 161688. ABS.
46. Yeom S, Jeong H, Lee H, Jeon K (2023). Effects of lumbar stabilization exercises on isokinetic strength and muscle tension in sedentary men. *Bioengineering (Basel)* 10:342. doi:10.3390/bioengineering10030342. PMID 36978733. PMC10045455. FT.
47. Lee H, Lee S, Kim C, Jeon K (2024). A comparison of contractile properties and acute muscle fatigue response in adult females with non-specific chronic low back pain. *Bioengineering (Basel)* 11:1202. doi:10.3390/bioengineering11121202. PMID 39768020. PMC11672949. FT.
48. Kim I, Jee J, Park S (2025). Comparative analysis of tensiomyographic and isokinetic assessments of the rectus abdominis and erector spinae in bodybuilding trainees with nonspecific low back pain. *PeerJ* 13:e20309. doi:10.7717/peerj.20309. PMID 41356438. PMC12677043. FT.
49. Mak VH, Chapman F, James C, Spiro SG (1991). Sternomastoid muscle twitch maximum relaxation rate: prolonged slowing with fatigue and post-tetanic acceleration. *Clin Sci* 81:669–676. doi:10.1042/cs0810669. PMID 1661654. ABS.
50. Almosnino S, Pelland L, Stevenson JM (2010). Retest reliability of force-time variables of neck muscles under isometric conditions. *J Athl Train* 45:453–458. doi:10.4085/1062-6050-45.5.453. PMID 20831389. PMC2938315. FT (Table 1 read from image).
51. Nagai T, Schilaty ND, Wong H, Keller VC, Stiennon ST, Chang RWB, Stuart MJ, Krause DA (2023). Acute effects of an isometric neck warm-up programme on neck performance characteristics and ultrasound-based morphology. *Ann Med* 55:2295402. doi:10.1080/07853890.2023.2295402. PMID 38142049. PMC10763903. FT, re-checked.
52. Murray M, Lange B, Søgaard K, Sjøgaard G (2020). The effect of physical exercise training on neck and shoulder muscle function among military helicopter pilots and crew: a secondary analysis of a randomized controlled trial. *Front Public Health* 8:546286. doi:10.3389/fpubh.2020.546286. PMID 33330303. PMC7719717. FT.
53. Almosnino S, Pelland L, Pedlow SV, Stevenson JM (2009). Between-day reliability of electromechanical delay of selected neck muscles during performance of maximal isometric efforts. *Sports Med Arthrosc Rehabil Ther Technol* 1:22. doi:10.1186/1758-2555-1-22. PMID 19775461. PMC2764695. FT, re-checked.
54. Cvetko E, Karen P, Eržen I (2012). Myosin heavy chain composition of the human sternocleidomastoid muscle. *Ann Anat* 194:467–472. doi:10.1016/j.aanat.2012.05.001. PMID 22658700. ABS.
55. Meznaric M, Eržen I, Karen P, Cvetko E (2018). Effect of ageing on the myosin heavy chain composition of the human sternocleidomastoid muscle. *Ann Anat* 216:95–99. doi:10.1016/j.aanat.2017.12.001. PMID 29289708. ABS.
56. Pollak N, Ugwoke CK, Umek N, Alibegović A, Janáček J, Radochová B, Cvetko E (2025). Fiber-type composition and 3D capillary analysis of the human splenius capitis muscle. *Biomol Biomed* 25:1351–1361. doi:10.17305/bb.2024.10787. PMID 39340391. PMC12042670. FT (also SEC source for Lindman 1990 and Cornwall & Kennedy 2015).
57. Lindman R, Eriksson A, Thornell LE (1990). Fiber type composition of the human male trapezius muscle: enzyme-histochemical characteristics. *Am J Anat* 189:236–244. doi:10.1002/aja.1001890306. PMID 2148051. ABS; numbers SEC via Pollak 2025.
58. Cornwall J, Kennedy E (2015). Cited in Pollak 2025 Table 3 as the source of the longus colli / longus capitis values. **Title, journal and identifiers not looked up [UNVERIFIED]**. SEC.

### Part 1 — Ankle frontal plane, arm, fibre-type anchors

59. Konradsen L, Peura G, Beynnon B, Renström P (2005). Ankle eversion torque response to sudden ankle inversion: torque response in unbraced, braced, and pre-activated situations. *J Orthop Res* 23:315–321. doi:10.1016/j.orthres.2004.07.005. PMID 15734242. ABS, re-checked.
60. Konradsen L, Voigt M, Højsgaard C (1997). Ankle inversion injuries. The role of the dynamic defense mechanism. *Am J Sports Med* 25:54–58. doi:10.1177/036354659702500110. PMID 9006692. ABS, re-checked.
61. Vaes P, Duquet W, Van Gheluwe B (2002). Peroneal reaction times and eversion motor response in healthy and unstable ankles. *J Athl Train* 37:475–480. PMID 12937570. PMC164380. ABS + FT-W.
62. Forestier N, Terrier R (2011). Peroneal reaction time measurement in unipodal stance for two different destabilization axes. *Clin Biomech* 26:766–771. doi:10.1016/j.clinbiomech.2011.02.009. PMID 21396754. ABS.
63. Mora I, Quinteiro-Blondin S, Pérot C (2003). Electromechanical assessment of ankle stability. *Eur J Appl Physiol* 88:558–564. doi:10.1007/s00421-002-0748-4. PMID 12560955. ABS.
64. McLoda TA, Stanek JM, Hansen AJ, McCaw ST (2009). A task failure has no effect on the electromechanical delay of the peroneus longus. *Electromyogr Clin Neurophysiol* 49:109–115. PMID 19400406. ABS.
65. Flevas DA, Bernard M, Ristanis S, Moraiti C, Georgoulis AD, Pappas E (2017). Peroneal electromechanical delay and fatigue in patients with chronic ankle instability. *Knee Surg Sports Traumatol Arthrosc* 25:1903–1907. doi:10.1007/s00167-016-4243-6. PMID 27401005. ABS.
66. Ashton-Miller JA, Ottaviani RA, Hutchinson C, Wojtys EM (1996). What best protects the inverted weightbearing ankle against further inversion? Evertor muscle strength compares favorably with shoe height, athletic tape, and three orthoses. *Am J Sports Med* 24:800–809. doi:10.1177/036354659602400616. PMID 8947403. ABS.
67. Alfuth M, Hahm MM (2016). Reliability, comparability, and validity of foot inversion and eversion strength measurements using a hand-held dynamometer. *Int J Sports Phys Ther* 11:72–84. PMID 26900502. PMC4739050. FT-W.
68. Gutierrez EM, Helber MD, Dealva D, Ashton-Miller JA, Richardson JK (2001). Mild diabetic neuropathy affects ankle motor function. *Clin Biomech* 16:522–528. doi:10.1016/s0268-0033(01)00034-1. PMID 11427295. ABS.
69. Ridge ST, Rowley KM, Kurihara T, McClung M, Tang J, Reischl S, Kulig K (2022). Contributions of intrinsic and extrinsic foot muscles during functional standing postures. *Biomed Res Int* 2022:7708077. doi:10.1155/2022/7708077. PMID 35572731. PMC9098302. FT.
70. Jenkins ND, Housh TJ, Buckner SL, Bergstrom HC, Smith CM, Cochrane KC, et al. (2016). Four weeks of high- versus low-load resistance training to failure on the rate of torque development, electromechanical delay, and contractile twitch properties. *J Musculoskelet Neuronal Interact* 16:135–144. PMID 27282457. PMC5114356. FT.
71. Kohn S, Smart RR, Jakobi JM (2018). Voluntary activation and twitch potentiation of the elbow flexors across supinated, neutral, and pronated forearm orientations. *Physiol Rep* 6:e13560. doi:10.14814/phy2.13560. PMID 29333724. PMC5789656. FT.
72. Zoughaib WS, Fry MJ, Singhal A, Hoffman RL, Coggan AR (2026). Post activation potentiation is greater in human triceps brachii versus triceps surae muscles. *Muscle Nerve* 73:815–821. doi:10.1002/mus.70172. PMID 41649381. PMC13047951. FT, re-checked.
73. Dotan R, Mitchell C, Cohen R, Gabriel D, Klentrou P, Falk B (2013). Child-adult differences in the kinetics of torque development. *J Sports Sci* 31:945–953. doi:10.1080/02640414.2012.757343. PMID 23320937. PMC3804465. FT-W.
74. Allum JH, Carpenter MG, Honegger F, Adkin AL, Bloem BR (2002). Age-dependent variations in the directional sensitivity of balance corrections and compensatory arm movements in man. *J Physiol* 542:643–663. doi:10.1113/jphysiol.2001.015644. PMID 12122159. PMC2290411. FT.
75. McIlroy WE, Maki BE (1995). Early activation of arm muscles follows external perturbation of upright stance. *Neurosci Lett* 184:177–180. doi:10.1016/0304-3940(94)11200-3. PMID 7715841. ABS.
76. Edgerton VR, Smith JL, Simpson DR (1975). Muscle fibre type populations of human leg muscles. *Histochem J* 7:259–266. doi:10.1007/BF01003594. PMID 123895. ABS.
77. Lexell J, Henriksson-Larsén K, Sjöström M (1983). Distribution of different fibre types in human skeletal muscles. 2. A study of cross-sections of whole m. vastus lateralis. *Acta Physiol Scand* 117:115–122. doi:10.1111/j.1748-1716.1983.tb07185.x. PMID 6858699. ABS.
78. Hucteau E, Jubeau M, Cornu C, Cattagni T (2020). Is there an intermuscular relationship in voluntary activation capacities and contractile kinetics? *Eur J Appl Physiol* 120:513–526. doi:10.1007/s00421-019-04299-z. PMID 31925519. ABS.
79. Van Cutsem M, Duchateau J (2005). Preceding muscle activity influences motor unit discharge and rate of torque development during ballistic contractions in humans. *J Physiol* 562:635–644. doi:10.1113/jphysiol.2004.074567. PMID 15539402. PMC1665520. FT-W (via MUSCLE-1).

### Part 2 — Sensory channels and state estimation

80. Sharma T, Peters RM, Bent LR (2020). Subthreshold electrical noise applied to the plantar foot enhances lower-limb cutaneous reflex generation. *Front Hum Neurosci* 14:351. doi:10.3389/fnhum.2020.00351. PMID 33005140. PMC7479210. FT.
81. Peters RM, Mildren RL, Hill AJ, Carpenter MG, Blouin JS, Inglis JT (2020). Lower-limb muscle responses evoked with noisy vibrotactile foot sole stimulation. *Physiol Rep* 8:e14530. doi:10.14814/phy2.14530. PMID 32776496. PMC7415907. FT.
82. Duysens J, Tax AA, Trippel M, Dietz V (1993). Increased amplitude of cutaneous reflexes during human running as compared to standing. *Brain Res* 613:230–238. doi:10.1016/0006-8993(93)90903-z. PMID 8186969. ABS.
83. Sayenko DG, Vette AH, Kamibayashi K, Nakajima T, Akai M, Nakazawa K (2007). Facilitation of the soleus stretch reflex induced by electrical excitation of plantar cutaneous afferents located around the heel. *Neurosci Lett* 415:294–298. doi:10.1016/j.neulet.2007.01.037. PMID 17276004. ABS.
84. Meyer PF, Oddsson LI, De Luca CJ (2004a). The role of plantar cutaneous sensation in unperturbed stance. *Exp Brain Res* 156:505–512. doi:10.1007/s00221-003-1804-y. PMID 14968274. ABS.
85. Meyer PF, Oddsson LI, De Luca CJ (2004b). Reduced plantar sensitivity alters postural responses to lateral perturbations of balance. *Exp Brain Res* 157:526–536. doi:10.1007/s00221-004-1868-3. PMID 15029466. ABS.
86. Horak FB, Nashner LM, Diener HC (1990). Postural strategies associated with somatosensory and vestibular loss. *Exp Brain Res* 82:167–177. doi:10.1007/bf00230848. PMID 2257901. ABS.
87. Diener HC, Dichgans J, Guschlbauer B, Mau H (1984). The significance of proprioception on postural stabilization as assessed by ischemia. *Brain Res* 296:103–109. doi:10.1016/0006-8993(84)90515-8. PMID 6713202. ABS.
88. Inglis JT, Horak FB, Shupert CL, Jones-Rycewicz C (1994). The importance of somatosensory information in triggering and scaling automatic postural responses in humans. *Exp Brain Res* 101:159–164. doi:10.1007/bf00243226. PMID 7843295. ABS.
89. Thoumie P, Do MC (1996). Changes in motor activity and biomechanics during balance recovery following cutaneous and muscular deafferentation. *Exp Brain Res* 110:289–297. doi:10.1007/bf00228559. PMID 8836692. ABS.
90. Muise SB, Lam CK, Bent LR (2012). Reduced input from foot sole skin through cooling differentially modulates the short latency and medium latency vestibular reflex responses to galvanic vestibular stimulation. *Exp Brain Res* 218:63–71. doi:10.1007/s00221-012-3002-2. PMID 22278107. ABS.
91. Kavounoudias A, Roll R, Roll JP (1998). The plantar sole is a 'dynamometric map' for human balance control. *Neuroreport* 9:3247–3252. doi:10.1097/00001756-199810050-00021. PMID 9831459. ABS.
92. Kavounoudias A, Roll R, Roll JP (2001). Foot sole and ankle muscle inputs contribute jointly to human erect posture regulation. *J Physiol* 532:869–878. doi:10.1111/j.1469-7793.2001.0869e.x. PMID 11313452. PMC2278585. ABS.
93. Dietz V, Gollhofer A, Kleiber M, Trippel M (1992). Regulation of bipedal stance: dependency on "load" receptors. *Exp Brain Res* 89:229–231. doi:10.1007/bf00229020. PMID 1601101. ABS.
94. Ali AS, Rowen KA, Iles JF (2003). Vestibular actions on back and lower limb muscles during postural tasks in man. *J Physiol* 546:615–624. doi:10.1113/jphysiol.2002.030031. PMID 12527747. PMC2342524. ABS.
95. Ardic FN, Latt LD, Redfern MS (2000). Paraspinal muscle response to electrical vestibular stimulation. *Acta Otolaryngol* 120:39–46. doi:10.1080/000164800760370819. PMID 10779184. ABS.
96. Desgagnés A, Desmons M, Cyr JP, Simoneau M, Massé-Alarie H (2021). Motor responses of lumbar erector spinae induced by electrical vestibular stimulation in seated participants. *Front Hum Neurosci* 15:690433. doi:10.3389/fnhum.2021.690433. PMID 34366814. PMC8339290. FT.
97. Britton TC, Day BL, Brown P, Rothwell JC, Thompson PD, Marsden CD (1993). Postural electromyographic responses in the arm and leg following galvanic vestibular stimulation in man. *Exp Brain Res* 94:143–151. doi:10.1007/bf00230477. PMID 8335069. ABS.
98. Fitzpatrick R, Burke D, Gandevia SC (1994). Task-dependent reflex responses and movement illusions evoked by galvanic vestibular stimulation in standing humans. *J Physiol* 478:363–372. doi:10.1113/jphysiol.1994.sp020257. PMID 7965852. ABS (via PPR-3).
99. Forbes PA, Siegmund GP, Schouten AC, Blouin JS (2014). Task, muscle and frequency dependent vestibular control of posture. *Front Integr Neurosci* 8:94. doi:10.3389/fnint.2014.00094. PMID 25620919. PMC4288134. FT.
100. Forbes PA, Fice JB, Siegmund GP, Blouin JS (2018). Electrical vestibular stimuli evoke robust muscle activity in deep and superficial neck muscles in humans. *Front Neurol* 9:535. doi:10.3389/fneur.2018.00535. PMID 30026725. PMC6041388. FT.
101. Forbes PA, Dakin CJ, Vardy AN, Happee R, Siegmund GP, Schouten AC, Blouin JS (2013). Frequency response of vestibular reflexes in neck, back, and lower limb muscles. *J Neurophysiol* 110:1869–1881. doi:10.1152/jn.00196.2013. PMID 23904494. ABS.
102. Colebatch JG, Halmagyi GM, Skuse NF (1994). Myogenic potentials generated by a click-evoked vestibulocollic reflex. *J Neurol Neurosurg Psychiatry* 57:190–197. doi:10.1136/jnnp.57.2.190. PMID 8126503. PMC1072448. ABS.
103. Rosengren SM, Weber KP, Govender S, Welgampola MS, Dennis DL, Colebatch JG (2019). Sound-evoked vestibular projections to the splenius capitis in humans: comparison with the sternocleidomastoid muscle. *J Appl Physiol* 126:1619–1629. doi:10.1152/japplphysiol.00711.2018. PMID 30920883. ABS.
104. Guillaud E, Faure C, Doat E, Bouyer LJ, Guehl D, Cazalets JR (2020). Ancestral persistence of vestibulospinal reflexes in axial muscles in humans. *J Neurophysiol* 123:2010–2023. doi:10.1152/jn.00421.2019. PMID 32319843. ABS.
105. Horak FB, Shupert CL, Dietz V, Horstmann G (1994). Vestibular and somatosensory contributions to responses to head and body displacements in stance. *Exp Brain Res* 100:93–106. doi:10.1007/bf00227282. PMID 7813657. ABS.
106. Allum JH, Honegger F, Schicks H (1994). The influence of a bilateral peripheral vestibular deficit on postural synergies. *J Vestib Res* 4:49–70. PMID 8186863. ABS.
107. Carpenter MG, Allum JH, Honegger F (2001). Vestibular influences on human postural control in combinations of pitch and roll planes reveal differences in spatiotemporal processing. *Exp Brain Res* 140:95–111. doi:10.1007/s002210100802. PMID 11500802. ABS.
108. Andersson G, Magnusson M (2002). Neck vibration causes short-latency electromyographic activation of lower leg muscles in postural reactions of the standing human. *Acta Otolaryngol* 122:284–288. doi:10.1080/000164802753648169. PMID 12030575. ABS.
109. Magnusson M, Andersson G, Gomez S, Johansson R, Mårtensson A, Karlberg M, Fransson PA (2006). Cervical muscle afferents play a dominant role over vestibular afferents during bilateral vibration of neck muscles. *J Vestib Res* 16:127–136. doi:10.3233/ves-2006-16305. PMID 17312340. ABS.
110. Verrel J, Cuisinier R, Lindenberger U, Vuillerme N (2011). Local and global effects of neck muscle vibration during stabilization of upright standing. *Exp Brain Res* 210:313–324. doi:10.1007/s00221-011-2636-9. PMID 21442219. ABS.
111. Ivanenko YP, Grasso R, Lacquaniti F (1999). Effect of gaze on postural responses to neck proprioceptive and vestibular stimulation in humans. *J Physiol* 519:301–314. doi:10.1111/j.1469-7793.1999.0301o.x. PMID 10432359. PMC2269485. ABS.
112. Ito Y, Corna S, von Brevern M, Bronstein A, Gresty M (1997). The functional effectiveness of neck muscle reflexes for head-righting in response to sudden fall. *Exp Brain Res* 117:266–272. doi:10.1007/s002210050221. PMID 9419072. ABS.
113. Ito Y, Corna S, von Brevern M, Bronstein A, Rothwell J, Gresty M (1995). Neck muscle responses to abrupt free fall of the head: comparison of normal with labyrinthine-defective human subjects. *J Physiol* 489:911–916. doi:10.1113/jphysiol.1995.sp021103. PMID 8788954. ABS (via PPR-3).
114. Mergner T, Siebold C, Schweigart G, Becker W (1991). Human perception of horizontal trunk and head rotation in space during vestibular and neck stimulation. *Exp Brain Res* 85:389–404. doi:10.1007/bf00229416. PMID 1893987. ABS.
115. Fitzpatrick R, McCloskey DI (1994). Proprioceptive, visual and vestibular thresholds for the perception of sway during standing in humans. *J Physiol* 478:173–186. doi:10.1113/jphysiol.1994.sp020240. PMID 7965833. PMC1155655. ABS; numbers also SEC via Tisserand 2022.
116. Tisserand R, Rasman BG, Omerovic N, Peters RM, Forbes PA, Blouin JS (2022). Unperceived motor actions of the balance system interfere with the causal attribution of self-motion. *PNAS Nexus* 1:pgac174. doi:10.1093/pnasnexus/pgac174. PMID 36714829. PMC9802180. FT.
117. Thelen DG, Brockmiller C, Ashton-Miller JA, Schultz AB, Alexander NB (1998). Thresholds for sensing foot dorsi- and plantarflexion during upright stance: effects of age and velocity. *J Gerontol A Biol Sci Med Sci* 53:M33–M38. doi:10.1093/gerona/53a.1.m33. PMID 9467431. ABS.
118. Teasdale N, Nougier V, Barraud PA, Bourdin C, Debû B, Poquin D, Raphel C (1999). Contribution of ankle, knee, and hip joints to the perception threshold for support surface rotation. *Percept Psychophys* 61:615–624. doi:10.3758/bf03205534. PMID 10370332. ABS.
119. Bermúdez Rey MC, Clark TK, Wang W, Leeder T, Bian Y, Merfeld DM (2016). Vestibular perceptual thresholds increase above the age of 40. *Front Neurol* 7:162. doi:10.3389/fneur.2016.00162. PMID 27752252. PMC5046616. ABS.
120. Mittelstaedt H (1996). Somatic graviception. *Biol Psychol* 42:53–74. doi:10.1016/0301-0511(95)05146-5. PMID 8770370. ABS.
121. Fitzpatrick RC, Gorman RB, Burke D, Gandevia SC (1992). Postural proprioceptive reflexes in standing human subjects: bandwidth of response and transmission characteristics. *J Physiol* 458:69–83. doi:10.1113/jphysiol.1992.sp019406. PMID 1338796. PMC1175144. ABS.
122. Fitzpatrick R, Burke D, Gandevia SC (1996). Loop gain of reflexes controlling human standing measured with the use of postural and vestibular disturbances. *J Neurophysiol* 76:3994–4008. doi:10.1152/jn.1996.76.6.3994. PMID 8985895. ABS.
123. Gilles M, Wing AM, Kirker SG (1999). Lateral balance organisation in human stance in response to a random or predictable perturbation. *Exp Brain Res* 124:137–144. doi:10.1007/s002210050607. PMID 9928835. ABS.
124. Kuo AD (1995). An optimal control model for analyzing human postural balance. *IEEE Trans Biomed Eng* 42:87–101. doi:10.1109/10.362914. PMID 7851935. ABS.
125. Kuo AD (2005). An optimal state estimation model of sensory integration in human postural balance. *J Neural Eng* 2:S235–S249. doi:10.1088/1741-2560/2/3/s07. PMID 16135887. ABS.
126. van der Kooij H, Jacobs R, Koopman B, Grootenboer H (1999). A multisensory integration model of human stance control. *Biol Cybern* 80:299–308. doi:10.1007/s004220050527. PMID 10365423. ABS.
127. van der Kooij H, Jacobs R, Koopman B, van der Helm F (2001). An adaptive model of sensory integration in a dynamic environment applied to human stance control. *Biol Cybern* 84:103–115. doi:10.1007/s004220000196. PMID 11205347. ABS.
128. van der Kooij H, Peterka RJ (2011). Non-linear stimulus-response behavior of the human stance control system is predicted by optimization of a system with sensory and motor noise. *J Comput Neurosci* 30:759–778. doi:10.1007/s10827-010-0291-y. PMID 21161357. PMC3108015. FT, re-checked.
129. Mergner T, Maurer C, Peterka RJ (2003). A multisensory posture control model of human upright stance. *Prog Brain Res* 142:189–201. doi:10.1016/s0079-6123(03)42014-1. PMID 12693262. ABS.
130. Mergner T, Schweigart G, Fennell L, Maurer C (2009). Posture control in vestibular-loss patients. *Ann N Y Acad Sci* 1164:206–215. doi:10.1111/j.1749-6632.2008.03722.x. PMID 19645901. ABS.
131. Kiemel T, Oie KS, Jeka JJ (2002). Multisensory fusion and the stochastic structure of postural sway. *Biol Cybern* 87:262–277. doi:10.1007/s00422-002-0333-2. PMID 12386742. ABS.
132. Kiemel T, Oie KS, Jeka JJ (2006). Slow dynamics of postural sway are in the feedback loop. *J Neurophysiol* 95:1410–1418. doi:10.1152/jn.01144.2004. PMID 16192341. PMC2717851. ABS.
133. Lockhart DB, Ting LH (2007). Optimal sensorimotor transformations for balance. *Nat Neurosci* 10:1329–1336. doi:10.1038/nn1986. PMID 17873869. ABS (cat).
134. Insperger T, Milton J, Stépán G (2013). Acceleration feedback improves balancing against reflex delay. *J R Soc Interface* 10:20120763. doi:10.1098/rsif.2012.0763. PMID 23173196. PMC3565692. ABS; parameters FT-W.
135. Zhang L, Stepan G, Insperger T (2018). Saturation limits the contribution of acceleration feedback to balancing against reaction delay. *J R Soc Interface* 15:20170771. doi:10.1098/rsif.2017.0771. PMID 29386400. PMC5805977. ABS.
136. Milton J, Insperger T (2019). Acting together, destabilizing influences can stabilize human balance. *Philos Trans A Math Phys Eng Sci* 377:20180126. doi:10.1098/rsta.2018.0126. PMID 31329069. PMC6661324. ABS; FT-W.
137. Gawthrop P, Loram I, Lakie M, Gollee H (2011). Intermittent control: a computational theory of human control. *Biol Cybern* 104:31–51. doi:10.1007/s00422-010-0416-4. PMID 21327829. ABS.
138. Gawthrop P, Loram I, Gollee H, Lakie M (2014). Intermittent control models of human standing: similarities and differences. *Biol Cybern* 108:159–168. doi:10.1007/s00422-014-0587-5. PMID 24500616. PMC3962584. FT.
139. Morasso PG, Sanguineti V (2002). Ankle muscle stiffness alone cannot stabilize balance during quiet standing. *J Neurophysiol* 88:2157–2162. doi:10.1152/jn.2002.88.4.2157. PMID 12364538. ABS.
140. Rasman BG, Forbes PA, Peters RM, Ortiz O, Franks I, Inglis JT, Chua R, Blouin JS (2021). Learning to stand with unexpected sensorimotor delays. *eLife* 10:e65085. doi:10.7554/elife.65085. PMID 34374648. PMC8480973. FT, re-checked.
141. Honeine JL, Schieppati M (2014). Time-interval for integration of stabilizing haptic and visual information in subjects balancing under static and dynamic conditions. *Front Syst Neurosci* 8:190. doi:10.3389/fnsys.2014.00190. PMID 25339872. PMC4186340. FT.
142. Assländer L, Peterka RJ (2014). Sensory reweighting dynamics in human postural control. *J Neurophysiol* 111:1852–1864. doi:10.1152/jn.00669.2013. PMID 24501263. PMC4044370. ABS.
143. Santos MJ, Kanekar N, Aruin AS (2010a). The role of anticipatory postural adjustments in compensatory control of posture: 1. Electromyographic analysis. *J Electromyogr Kinesiol* 20:388–397. doi:10.1016/j.jelekin.2009.06.006. PMID 19660966. ABS.
144. Santos MJ, Kanekar N, Aruin AS (2010b). The role of anticipatory postural adjustments in compensatory control of posture: 2. Biomechanical analysis. *J Electromyogr Kinesiol* 20:398–405. doi:10.1016/j.jelekin.2010.01.002. PMID 20156693. PMC2859839. FT, re-checked.
145. Welch TD, Ting LH (2009). A feedback model explains the differential scaling of human postural responses to perturbation acceleration and velocity. *J Neurophysiol* 101:3294–3309. doi:10.1152/jn.90775.2008. PMID 19357335. PMC2694108. FT.
146. Safavynia SA, Ting LH (2012). Task-level feedback can explain temporal recruitment of spatially fixed muscle synergies throughout postural perturbations. *J Neurophysiol* 107:159–177. doi:10.1152/jn.00653.2011. PMID 21957219. PMC3349688. FT (via PPR-3).
147. Goodworth AD, Peterka RJ (2009). Contribution of sensorimotor integration to spinal stabilization in humans. *J Neurophysiol* 102:496–512. doi:10.1152/jn.00118.2009. PMID 19403751. PMC2712260. FT-W (via PPR-3).
148. Engelhart D, Pasma JH, Schouten AC, Aarts RG, Meskers CG, Maier AB, van der Kooij H (2016). Adaptation of multijoint coordination during standing balance in healthy young and healthy old individuals. *J Neurophysiol* 115:1422–1435. doi:10.1152/jn.00030.2015. PMID 26719084. PMC4808116. FT (via PPR-3).

### Part 3 — Push recovery and thresholds

149. Emmens AR, van Asseldonk EHF, Prinsen V, van der Kooij H (2020). Predicting reactive stepping in response to perturbations by using a classification approach. *J Neuroeng Rehabil* 17:84. doi:10.1186/s12984-020-00709-y. PMID 32616066. PMC7331196. FT, re-checked.
150. Robert T, Vallée P, Tisserand R, Buloup F, Bariatinsky D, Vercher JL, Fitzpatrick RC, Mille ML (2018). Stepping boundary of external force-controlled perturbations of varying durations: comparison of experimental data and model simulations. *J Biomech* 75:89–95. doi:10.1016/j.jbiomech.2018.05.010. PMID 29793765. ABS; formula SEC via Liu 2024.
151. Liu Y, Sun R, Zou K, Li Y, Xu P (2024). Torque-ratio-adjustable ankle-foot exoskeleton for resisting perturbation in forward direction within fan-shaped region of pelvis horizontal plane. *Front Bioeng Biotechnol* 12:1429605. doi:10.3389/fbioe.2024.1429605. PMID 39161355. PMC11330797. FT (secondary source for Robert 2018).
152. Crenshaw JR, Kaufman KR (2014). The intra-rater reliability and agreement of compensatory stepping thresholds of healthy subjects. *Gait Posture* 39:810–815. doi:10.1016/j.gaitpost.2013.11.006. PMID 24300837. PMC3910088. FT, re-checked.
153. Sloot LH, Gerhardy T, Mombaur K, Millard M (2025). The size of the functional base of support decreases with age. *Sci Rep* 15:37351. doi:10.1038/s41598-025-22630-x. PMID 41145821. PMC12559752. FT, re-checked.
154. Hof AL, Curtze C (2016). A stricter condition for standing balance after unexpected perturbations. *J Biomech* 49:580–585. doi:10.1016/j.jbiomech.2016.01.021. PMID 26892898. ABS.
155. Hof AL, Gazendam MG, Sinke WE (2005). The condition for dynamic stability. *J Biomech* 38:1–8. doi:10.1016/j.jbiomech.2004.03.025. PMID 15519333. ABS.
156. Pai YC, Patton J (1997). Center of mass velocity-position predictions for balance control. *J Biomech* 30:347–354. doi:10.1016/s0021-9290(96)00165-0. PMID 9075002. ABS (erratum J Biomech 1998;31:199 not read).
157. Pai YC, Maki BE, Iqbal K, McIlroy WE, Perry SD (2000). Thresholds for step initiation induced by support-surface translation: a dynamic center-of-mass model provides much better prediction than a static model. *J Biomech* 33:387–392. doi:10.1016/s0021-9290(99)00199-2. PMID 10673124. ABS.
158. Chvatal SA, Torres-Oviedo G, Safavynia SA, Ting LH (2011). Common muscle synergies for control of center of mass and force in nonstepping and stepping postural behaviors. *J Neurophysiol* 106:999–1015. doi:10.1152/jn.00549.2010. PMID 21653725. PMC3154805. FT-W.
159. Torres-Oviedo G, Ting LH (2010). Subject-specific muscle synergies in human balance control are consistent across different biomechanical contexts. *J Neurophysiol* 103:3084–3098. doi:10.1152/jn.00960.2009. PMID 20393070. PMC2888239. FT-W.
160. Henry SM, Fung J, Horak FB (1998a). Control of stance during lateral and anterior/posterior surface translations. *IEEE Trans Rehabil Eng* 6:32–42. doi:10.1109/86.662618. PMID 9535521. ABS.
161. Henry SM, Fung J, Horak FB (1998b). EMG responses to maintain stance during multidirectional surface translations. *J Neurophysiol* 80:1939–1950. doi:10.1152/jn.1998.80.4.1939. PMID 9772251. ABS.
162. Henry SM, Fung J, Horak FB (2001). Effect of stance width on multidirectional postural responses. *J Neurophysiol* 85:559–570. doi:10.1152/jn.2001.85.2.559. PMID 11160493. ABS.
163. Bingham JT, Choi JT, Ting LH (2011). Stability in a frontal plane model of balance requires coupled changes to postural configuration and neural feedback control. *J Neurophysiol* 106:437–448. doi:10.1152/jn.00010.2011. PMID 21543754. PMC3129728. ABS.
164. Bingham JT, Ting LH (2013). Stability radius as a method for comparing the dynamics of neuromechanical systems. *IEEE Trans Neural Syst Rehabil Eng* 21:840–848. doi:10.1109/tnsre.2013.2264920. PMID 23744699. PMC4387576. FT.
165. Winter DA, Prince F, Frank JS, Powell C, Zabjek KF (1996). Unified theory regarding A/P and M/L balance in quiet stance. *J Neurophysiol* 75:2334–2343. doi:10.1152/jn.1996.75.6.2334. PMID 8793746. ABS.
166. Matjačić Z, Voigt M, Popović D, Sinkjaer T (2001). Functional postural responses after perturbations in multiple directions in a standing man: a principle of decoupled control. *J Biomech* 34:187–196. doi:10.1016/s0021-9290(00)00182-2. PMID 11165282. ABS.
167. Kirker SG, Simpson DS, Jenner JR, Wing AM (2000). Stepping before standing: hip muscle function in stepping and standing balance after stroke. *J Neurol Neurosurg Psychiatry* 68:458–464. doi:10.1136/jnnp.68.4.458. PMID 10727481. PMC1736885. ABS.
168. Day BL, Steiger MJ, Thompson PD, Marsden CD (1993). Effect of vision and stance width on human body motion when standing: implications for afferent control of lateral sway. *J Physiol* 469:479–499. doi:10.1113/jphysiol.1993.sp019824. PMID 8271209. PMC1143881. ABS.
169. Goodworth AD, Peterka RJ (2010). Influence of stance width on frontal plane postural dynamics and coordination in human balance control. *J Neurophysiol* 104:1103–1118. doi:10.1152/jn.00916.2009. PMID 20427616. PMC2934921. ABS.
170. de Kam D, Kamphuis JF, Weerdesteyn V, Geurts AC (2016). The effect of weight-bearing asymmetry on dynamic postural stability in healthy young individuals. *Gait Posture* 45:56–61. doi:10.1016/j.gaitpost.2016.01.004. PMID 26979884. ABS.
171. Boerger TF, McGinn L, Wang MC, Schmit BD, Hyngstrom AS (2022). Degenerative cervical myelopathy delays responses to lateral balance perturbations regardless of predictability. *J Neurophysiol* 127:673–688. doi:10.1152/jn.00159.2021. PMID 35080466. PMC8897012. FT-W.
172. Holt RR, Simpson D, Jenner JR, Kirker SG, Wing AM (2000). Ground reaction force after a sideways push as a measure of balance in recovery from stroke. *Clin Rehabil* 14:88–95. doi:10.1191/026921500668655351. PMID 10688349. ABS.
173. Bair WN, Prettyman MG, Beamer BA, Rogers MW (2016). Kinematic and behavioral analyses of protective stepping strategies and risk for falls among community living older adults. *Clin Biomech* 36:74–82. doi:10.1016/j.clinbiomech.2016.04.015. PMID 27228075. PMC5568553. FT.
174. Hilliard MJ, Martinez KM, Janssen I, Edwards B, Mille ML, Zhang Y, Rogers MW (2008). Lateral balance factors predict future falls in community-living older adults. *Arch Phys Med Rehabil* 89:1708–1713. doi:10.1016/j.apmr.2008.01.023. PMID 18760155. PMC2953551. FT.
175. Rogers MW, Hain TC, Hanke TA, Janssen I (1996). Stimulus parameters and inertial load: effects on the incidence of protective stepping responses in healthy human subjects. *Arch Phys Med Rehabil* 77:363–368. doi:10.1016/s0003-9993(96)90085-4. PMID 8607760. ABS.
176. McIlroy WE, Maki BE (1993). Task constraints on foot movement and the incidence of compensatory stepping following perturbation of upright stance. *Brain Res* 616:30–38. doi:10.1016/0006-8993(93)90188-s. PMID 8358619. ABS.
177. Schulz BW, Ashton-Miller JA, Alexander NB (2006). Can initial and additional compensatory steps be predicted in young, older, and balance-impaired older females in response to anterior and posterior waist pulls while standing? *J Biomech* 39:1444–1453. doi:10.1016/j.jbiomech.2005.04.004. PMID 15950234. ABS.
178. Zelei A, Milton J, Stepan G, Insperger T (2021). Response to perturbation during quiet standing resembles delayed state feedback optimized for performance and robustness. *Sci Rep* 11:11392. doi:10.1038/s41598-021-90305-4. PMID 34059718. PMC8167093. FT.
179. Aftab Z, Robert T, Wieber PB (2016). Balance recovery prediction with multiple strategies for standing humans. *PLoS One* 11:e0151166. doi:10.1371/journal.pone.0151166. PMID 26974820. PMC4790971. FT.
180. Zhu RT, Lyu PZ, Li S, Tong CY, Ling YT, Ma CZ (2022). How does lower limb respond to unexpected balance perturbations? New insights from synchronized human kinetics, kinematics, muscle electromyography (EMG) and mechanomyography (MMG) data. *Biosensors (Basel)* 12:430. doi:10.3390/bios12060430. PMID 35735577. PMC9220852. FT, Table 3 re-checked.
181. Sturnieks DL, Menant J, Delbaere K, Vanrenterghem J, Rogers MW, Fitzpatrick RC, Lord SR (2013). Force-controlled balance perturbations associated with falls in older people: a prospective cohort study. *PLoS One* 8:e70981. doi:10.1371/journal.pone.0070981. PMID 23951059. PMC3739780. Via PPR-2.
182. Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE (1999). Balance recovery from medio-lateral perturbations of the upper body during standing. *J Biomech* 32:1149–1158. doi:10.1016/s0021-9290(99)00116-5. PMID 10541064. ABS; thesis data via PPR-3.
183. Rietdyk S (1999). *Postural responses to unexpected multi-directional upper body perturbations.* PhD thesis, University of Waterloo. FT via PPR-3.
184. van Mierlo M, Ormiston JA, Vlutters M, van Asseldonk EHF, van der Kooij H (2023). Pelvis perturbations in various directions while standing in staggered stance elicit concurrent responses in both the sagittal and frontal plane. *PLoS One* 18:e0272245. doi:10.1371/journal.pone.0272245. PMID 37043457. PMC10096271. FT via PPR-3.
185. Robinovitch SN, Heller B, Lui A, Cortez J (2002). Effect of strength and speed of torque development on balance recovery with the ankle strategy. *J Neurophysiol* 88:613–620. doi:10.1152/jn.2002.88.2.613. PMID 12163514. ABS via PPR-3.
186. Mille ML, Rogers MW, Martinez K, Hedman LD, Johnson ME, Lord SR, Fitzpatrick RC (2003). Thresholds for inducing protective stepping responses to external perturbations of human standing. *J Neurophysiol* 90:666–674. doi:10.1152/jn.00974.2002. PMID 12711707. ABS (full text not accessible).

### Part 3 — Coordination, head, quiet-stance kinematics

187. Wang Z, Ko JH, Challis JH, Newell KM (2014). The degrees of freedom problem in human standing posture: collective and component dynamics. *PLoS One* 9:e85414. doi:10.1371/journal.pone.0085414. PMID 24427307. PMC3888423. FT, Table 1 re-checked.
188. Gatev P, Thomas S, Kepple T, Hallett M (1999). Feedforward ankle strategy of balance during quiet stance in adults. *J Physiol* 514:915–928. doi:10.1111/j.1469-7793.1999.915ad.x. PMID 9882761. PMC2269093. FT.
189. Verrel J, Pradon D, Vuillerme N (2012). Persistence of motor-equivalent postural fluctuations during bipedal quiet standing. *PLoS One* 7:e48312. doi:10.1371/journal.pone.0048312. PMID 23110228. PMC3482199. FT.
190. Zhang Y, Kiemel T, Jeka J (2007). The influence of sensory information on two-component coordination during quiet stance. *Gait Posture* 26:263–271. doi:10.1016/j.gaitpost.2006.09.007. PMID 17046262. PMC2041859. FT.
191. Creath R, Kiemel T, Horak F, Jeka JJ (2008). The role of vestibular and somatosensory systems in intersegmental control of upright stance. *J Vestib Res* 18:39–49. doi:10.3233/ves-2008-18104. PMID 18776597. PMC2938746. FT.
192. Suzuki Y, Morimoto H, Kiyono K, Morasso PG, Nomura T (2016). Dynamic determinants of the uncontrolled manifold during human quiet stance. *Front Hum Neurosci* 10:618. doi:10.3389/fnhum.2016.00618. PMID 27999535. PMC5138220. FT.
193. Yamamoto A, Sasagawa S, Oba N, Nakazawa K (2015). Behavioral effect of knee joint motion on body's center of mass during human quiet standing. *Gait Posture* 41:291–294. doi:10.1016/j.gaitpost.2014.08.016. PMID 25248799. ABS.
194. Sasagawa S, Ushiyama J, Kouzaki M, Kanehisa H (2009). Effect of the hip motion on the body kinematics in the sagittal plane during human quiet standing. *Neurosci Lett* 450:27–31. doi:10.1016/j.neulet.2008.11.027. PMID 19027828. ABS.
195. Horlings CG, Küng UM, Honegger F, Van Engelen BG, Van Alfen N, Bloem BR, Allum JH (2009). Vestibular and proprioceptive influences on trunk movements during quiet standing. *Neuroscience* 161:904–914. doi:10.1016/j.neuroscience.2009.04.005. PMID 19362125. ABS.
196. Honegger F, van Spijker GJ, Allum JH (2012). Coordination of the head with respect to the trunk and pelvis in the roll and pitch planes during quiet stance. *Neuroscience* 213:62–71. doi:10.1016/j.neuroscience.2012.04.017. PMID 22521818. ABS.
197. Afschrift M, Jonkers I, De Schutter J, De Groote F (2016). Mechanical effort predicts the selection of ankle over hip strategies in nonstepping postural responses. *J Neurophysiol* 116:1937–1945. doi:10.1152/jn.00127.2016. PMID 27489362. PMC5144705. FT.
198. Kim S, Horak FB, Carlson-Kuhta P, Park S (2009). Postural feedback scaling deficits in Parkinson's disease. *J Neurophysiol* 102:2910–2920. doi:10.1152/jn.00206.2009. PMID 19741108. PMC2777824. FT, re-checked.
199. Runge CF, Shupert CL, Horak FB, Zajac FE (1999). Ankle and hip postural strategies defined by joint torques. *Gait Posture* 10:161–170. doi:10.1016/s0966-6362(99)00032-6. PMID 10502650. ABS.
200. Park S, Horak FB, Kuo AD (2004). Postural feedback responses scale with biomechanical constraints in human standing. *Exp Brain Res* 154:417–427. doi:10.1007/s00221-003-1674-3. PMID 14618285. ABS.
201. Alexandrov AV, Frolov AA, Horak FB, Carlson-Kuhta P, Park S (2005). Feedback equilibrium control during human standing. *Biol Cybern* 93:309–322. doi:10.1007/s00422-005-0004-1. PMID 16228222. PMC1430400. FT.
202. Szturm T, Fallang B (1998). Effects of varying acceleration of platform translation and toes-up rotations on the pattern and magnitude of balance reactions in humans. *J Vestib Res* 8:381–397. PMID 9770656. ABS.
203. Hwang S, Tae K, Sohn R, Kim J, Son J, Kim Y (2009). The balance recovery mechanisms against unexpected forward perturbation. *Ann Biomed Eng* 37:1629–1637. doi:10.1007/s10439-009-9717-y. PMID 19472056. ABS.
204. Carpenter MG, Allum JH, Honegger F (1999). Directional sensitivity of stretch reflexes and balance corrections for normal subjects in the roll and pitch planes. *Exp Brain Res* 129:93–113. doi:10.1007/s002210050940. PMID 10550507. ABS.
205. Keshner EA, Dhaher Y (2008). Characterizing head motion in three planes during combined visual and base of support disturbances in healthy and visually sensitive subjects. *Gait Posture* 28:127–134. doi:10.1016/j.gaitpost.2007.11.003. PMID 18162402. PMC2577851. FT.
206. Shupert CL, Horak FB (1996). Effects of vestibular loss on head stabilization in response to head and body perturbations. *J Vestib Res* 6:423–437. doi:10.3233/ves-1996-6604. PMID 8968970. ABS.
207. Keshner EA, Woollacott MH, Debu B (1988). Neck, trunk and limb muscle responses during postural perturbations in humans. *Exp Brain Res* 71:455–466. doi:10.1007/bf00248739. PMID 3416963. ABS.
208. Allum JH, Gresty M, Keshner E, Shupert C (1997). The control of head movements during human balance corrections. *J Vestib Res* 7:189–218. doi:10.3233/ves-1997-72-309. PMID 9178224. ABS.
209. Sozzi S, Nardone A, Schieppati M (2019). Vision does not necessarily stabilize the head in space during continuous postural perturbations. *Front Neurol* 10:748. doi:10.3389/fneur.2019.00748. PMID 31354614. PMC6635830. FT.
210. Pozzo T, Berthoz A, Lefort L (1990). Head stabilization during various locomotor tasks in humans. I. Normal subjects. *Exp Brain Res* 82:97–106. doi:10.1007/bf00230842. PMID 2257917. ABS.
211. Foulger LH, Reiter ER, Kuo C, Carpenter MG, Blouin JS (2025). Estimating whole-body centre of mass sway during quiet standing with inertial measurement units. *PLoS One* 20:e0315851. doi:10.1371/journal.pone.0315851. PMID 39804881. PMC11730423. FT via PPR-3.

---

## Appendix A. Arithmetic behind the [E] values

All computations were done by the compiler in Python (numerical integration, dt = 10–50 µs; root finding with Brent's method). The scripts are in the session scratchpad (`balance1/calc/`), not in the repository.

### A.1 Formulas (as MUSCLE-1 Appendix A.1)

| Quantity | Formula |
|---|---|
| Critically damped second order, fraction of a step at time t | f = 1 − e^(−ωn·t)(1 + ωn·t); solved for ωn per (t, f) point |
| Its 10–90 % step rise | 3.358/ωn |
| Its time to 50 % | 1.678/ωn |
| Its peak slope (fraction per s) | ωn/e |
| Twitch TPT shortcut | ωn = 1/TPT, so 10–90 % = 3.358 × TPT |
| First-order relaxation from a peak rate R (fraction per ms) | τ = 1/R; 90–10 % = 2.197 τ |
| Model-free lower bound on rise from a peak slope R | ≥ 0.8/R |
| Fraction of peak torque at time t from RTD over 0–t | f(t) = RTD₀₋ₜ × t / PT (ratio of group means) |
| XcoM zero-delay limit | Δv_max = ω₀ × (edge − x₀), ω₀ = √(g/l) |
| Delay factor | e^(−ω₀·τ) |

### A.2 Critically damped fits to the fraction-of-peak data (Part 1)

| Data set | (t ms, fraction) points | Implied 10–90 % rise per point (ms) |
|---|---|---|
| Kozinc 2021, hip abduction (basketball / running / tennis), 100 ms point | 0.430 / 0.433 / 0.423 | 229 / 228 / 233 (216 / 215 / 219 with +3 % onset) |
| Kozinc 2021, hip adduction | 0.463 / 0.428 / 0.476 | 215 / 230 / 209 (203 / 217 / 198) |
| Kozinc 2021, hip extension | 0.376 / 0.403 / 0.381 | 257 / 243 / 254 (241 / 228 / 239) |
| Kozinc 2021, hip flexion | 0.346 / 0.359 / 0.351 | 275 / 266 / 272 (257 / 249 / 254) |
| Kozinc 2021, knee extension | 0.417 / 0.519 / 0.566 | 235 / 193 / 177 (222 / 183 / 167) |
| Kozinc 2021, knee flexion | 0.373 / 0.308 / 0.417 | 258 / 300 / 235 (242 / 279 / 222) |
| Kozinc 2021, ankle plantarflexion | 0.445 / 0.440 / 0.446 | 222 / 225 / 222 (210 / 212 / 210) |
| Kozinc 2021, ankle dorsiflexion | 0.544 / 0.517 / 0.527 | 184 / 194 / 190 (174 / 183 / 180) |
| McNabb 2024, flexion | (50, 0.104) (100, 0.307) (150, 0.544) (200, 0.707) | 308, 301, 276, 272 |
| McNabb 2024, extension | (50, 0.098) (100, 0.262) (150, 0.443) (200, 0.592) | 320, 338, 335, 337 |
| McNabb 2024, abduction | (50, 0.128) (100, 0.315) (150, 0.491) (200, 0.609) | 272, 295, 305, 327 |
| McNabb 2024, adduction | (50, 0.134) (100, 0.339) (150, 0.521) (200, 0.620) | 264, 279, 288, 320 |
| Ishøi 2023, adduction squeeze / abduction press | (100, 0.399) (200, 0.611) / (100, 0.540) (200, 0.735) | 244, 325 / 186, 257 |
| Lanza 2020 (older), abduction / adduction | (50, 0.197) … (200, 0.590) / (50, 0.027) … (200, 0.380) | 206–338 / 509–665 |
| Nagai 2023, neck flexion | (50, 0.200) (100, 0.456) (150, 0.590) (200, 0.636) | 204, 218, 254, 311 |
| Nagai 2023, neck extension | (50, 0.151) (100, 0.419) (150, 0.585) (200, 0.658) | 245, 235, 256, 298 |
| Nagai 2023, right / left lateral flexion | 100 ms: 0.486 / 0.535; 150 ms: 0.635 / 0.682 | 206, 233 / 187, 214 |
| Almosnino 2010, time to 50 % PF (ωn = 1.678/T50) | 135 / 146 / 142 / 138 / 148 ms (ext / flex / protraction / left / right) | 270 / 292 / 284 / 276 / 296 |
| Almosnino 2010, peak RFD/PF (ωn = e × slope) | 6.37 / 5.78 / 6.53 / 7.83 / 8.35 s⁻¹ | 194 / 214 / 189 / 158 / 148 (lower bounds 126 / 138 / 123 / 102 / 96) |
| Murray 2020, peak RTD/MVC | 3.78–4.34 s⁻¹ | 285–327 |
| Zemková 2019, back-pull peak RFD/PF | 3.15 / 6.50 s⁻¹ | 392 / 190 |
| Dotan 2013, elbow flexion | (70, 0.30) (204, 0.80); peak RTD/MVC 8.01 s⁻¹ | 214, 229; 154 (peak-slope basis) |
| Konradsen 2005, eversion, 66 % at 326 ms after platform onset | onset taken as 0 / 54 / 135 ms | 484 / 404 / 284 |
| Konradsen 2005, pre-activated, 66 % at 89 ms | — | ≈ 132 (starts from non-zero torque) |
| Kiemel 2008, "hip" EMG→torque (ωn 9.46 / 9.37 rad/s, ζ 1.58 / 1.50) [MODEL] | numerical step response | 660 / 625 (ankle in the same paper: 508 / 420) |
| Kiemel 2011, hip (12.1 rad/s, ζ 1.65) [MODEL] | numerical step response | 544 (ankle 9.9 rad/s, ζ 1.5: 592) |

### A.3 Cascade inversion (activation 15 / 50 ms; contraction lag τc,rise while force < activation, τc,fall otherwise)

**Rise.**

| Target 10–90 % rise (ms) | 150 | 180 | 190 | 200 | 210 | 220 | 230 | 240 | 250 | 260 | 280 | 290 | 300 | 320 | 325 | 350 | 400 | 420 | 450 | 500 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| τc,rise (ms) | 65 | 79 | 84 | 89 | 94 | 98 | 103 | 107 | 112 | 117 | 126 | 131 | 135 | 144 | 147 | 158 | 181 | 190 | 204 | 227 |

**Fall.**

| Target 90–10 % fall (ms) | 110 | 115 | 120 | 130 | 140 | 150 | 160 | 175 | 180 | 200 | 220 | 230 | 250 | 280 | 300 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| τc,fall (ms) | ≈ 3 | 12 | 17 | 25 | 33 | 39 | 45 | 54 | 57 | 68.5 | 79 | 85 | 95 | 111 | 121 |

**Notes.**
- The fall floor with τ_deact = 50 ms and τc,fall → 0 is 109.8 ms.
- Check, forward simulation: τc 126 / 54 → rise 280 / fall 175 ms; 135 / 68.5 → 300 / 200; 107 / 79 → 239 / 219; 94 / 25 → 211 / 129. Torque reaches 10 % of the step 30–35 ms after the excitation step (the 8.3 ms pure delay included). The pure delay shifts onset only.
- **Agreement with MUSCLE-1 A.4:** 150 → 65.4, 200 → 88.8, 250 → 112.1, 300 → 135.2, 350 → 158.2, 450 → 204.1 ms (MUSCLE-1: 65, 89, 112, 135, 158, 205); falls 120 → 17.2, 175 → 54.2, 250 → 95.4, 300 → 121.0, 360 → 150.7 (MUSCLE-1: 17, 54, 95, 121, 151). For 600 → 273 ms here vs 278 ms in MUSCLE-1.

### A.4 Relaxation conversions

| Source value | Conversion | Result |
|---|---|---|
| SCM twitch maximum relaxation rate 9.51 % per 10 ms (Mak 1991) | τ = 10/0.0951 = 105 ms; 90–10 % = 2.197 × 105 | ≈ 231 ms (indicative; twitch rate, normalisation assumed) |
| Elbow flexor HRT 37–63 ms (Jenkins 2016; Kohn 2018) | × 1.9–2.8 (adopted fall / HRT ratios: PF 175/90, KE 160/85, DF 250/90) | 70–176 ms, floored at 110 ms by the cascade |
| Triceps brachii HRT 63 ms (Zoughaib 2026) | × 1.9–2.8 | 120–176 ms |
| Triceps brachii TPT 84 ms | × 2.35–2.83 (adopted rise / TPT: DF and KE 200/85, PF 325/115); × 3.358 (twitch-only shortcut) | 197–238 ms; 282 ms |
| Elbow flexor TPT 41–71 ms | × 3.358 | 138–239 ms |

### A.5 Same-protocol calibration (Kozinc 2021)

| Group | Kozinc-derived rise (ms) | MUSCLE-1 adopted central (ms) | Adopted / Kozinc |
|---|---|---|---|
| Dorsiflexors | 174–194 | 200 | ≈ 1.0–1.15 (central ≈ 1.06) |
| Knee extensors | 167–235 | 200 | ≈ 0.85–1.2 (central ≈ 1.0) |
| Plantarflexors | 210–225 | 325 | ≈ 1.46 |

Applied to the hip groups (198–275 ms): ×1.0 → 198–275 ms; ×1.46 → 289–402 ms. Hence the hip range of ≈ 200–400 ms.

### A.6 XcoM and push arithmetic (Part 3)

**Generic body (segment-E script).**
- COM height l = 0.55·H; foot length 0.15·H; ankle at 21 % of foot length from the heel; x₀ = 0.045 m.
- H = 1.75 m: l = 0.963 m, ω₀ = 3.19 s⁻¹; forward limit 0.518 m/s, backward 0.320 m/s.
- H = 1.80 m: ω₀ = 3.15 s⁻¹; forward limit 0.530 m/s, backward 0.320 m/s.
- Delay factor e^(−ω₀τ): 0.62 at τ = 0.15 s, 0.53 at 0.20 s.

**ML zero-delay limit vs stance width** (COM at midline; outer edge = S/2 + 0.045 m; ω₀ 3.15–3.30 s⁻¹):

| S, centre-to-centre (m) | 0.09 | 0.17 | 0.24 | 0.30 | 0.42 |
|---|---|---|---|---|---|
| Edge (m) | 0.090 | 0.130 | 0.165 | 0.195 | 0.255 |
| Δv_max (m/s) | 0.28–0.30 | 0.41–0.43 | 0.52–0.54 | 0.61–0.64 | 0.80–0.84 |
| × 0.62 (150 ms delay) | 0.18 | 0.25–0.27 | 0.32–0.34 | 0.38–0.40 | 0.50–0.52 |

This ignores the leg-inclination effect at wide stance (Bingham 2011) and the usable-BoS fraction (Sloot 2025).

**Thresholds as Δv and impulse.**
- **Emmens 2020:** 0.11 mg × 0.2 s → Δv ≤ 0.216 m/s; 0.074 mg × 0.2 s → ≤ 0.145 m/s. Ratios to the H = 1.80 m limits are 0.41 and 0.45.
- **Robert 2018:** impulse/m = (2434 + 7.69·t_p) % BW·ms × g = 0.239 m/s as t_p → 0, 0.314 m/s at 100 ms. Ratios to the H = 1.75 m forward limit are 0.46 and 0.61.
- **At 73.9 kg:**
  - forward 0.22–0.31 m/s → 16.3–22.9 N·s;
  - backward 0.15–0.22 → 11.1–16.3 N·s;
  - lateral 0.27–0.35 → 20.0–25.9 N·s.

**Push levels** (fractions of the central threshold T: forward 0.26, backward 0.18, lateral 0.31 m/s):

| Level | Forward | Backward | Lateral |
|---|---|---|---|
| Small, 0.25–0.4 T | 0.065–0.104 m/s, 4.8–7.7 N·s | 0.045–0.072 m/s, 3.3–5.3 N·s | 0.077–0.124 m/s, 5.7–9.2 N·s |
| Moderate, 0.55–0.75 T | 0.143–0.195 m/s, 10.6–14.4 N·s | 0.099–0.135 m/s, 7.3–10.0 N·s | 0.171–0.232 m/s, 12.6–17.2 N·s |
| Over-limit, 1.3–1.6 T | 0.338–0.416 m/s, 25.0–30.7 N·s | 0.234–0.288 m/s, 17.3–21.3 N·s | 0.403–0.496 m/s, 29.8–36.7 N·s |

§19.3.3 rounds these.

**Other conversions.**
- **COM excursion per unit Δv.** Rietdyk 5.6 cm / 0.23 m/s = 0.24 s (AP) and 6.4 / 0.27 = 0.24 s (ML); these are lower bounds, because Δv is an upper bound. van Mierlo ≤ 0.5 cm per % BW with Δv = 0.01 × 9.81 × 0.15 = 0.0147 m/s per % BW → ≤ 0.34 s.
- **Kim 2009 flat-foot ankle-torque limit** at 73.9 kg and 1.80 m: 0.073 × 725 × 1.80 ≈ 95 N·m.
- **Zelei 2021 release forces:** 27–56 N on 50–95 kg subjects → 4.6–8.2 % BW.

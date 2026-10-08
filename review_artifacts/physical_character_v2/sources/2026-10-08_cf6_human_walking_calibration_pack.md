# CF-6 human walking calibration pack — external research package supplied by the user (verbatim)

Received in the Claude Code session of 8 Oct 2026 (sent twice, identical). Reproduced verbatim below; the `:chatgpt-content-reference{...}` markers are the package's own and are kept as received.

---

# CF-6 HUMAN WALKING CALIBRATION PACK

**Scope:** Healthy-adult, level-ground walking. Values below are human references, not controller parameters or pass/fail thresholds.

**Evidence labels:** **M** = reported measurement; **D** = explicitly calculated from reported values; **F** = evaluated published regression. Unless stated otherwise, “±” means **between-participant standard deviation**, not a confidence interval or normality limit. Source codes link to full citations in §E.

## Definitions that must remain fixed

A **step** runs between successive opposite-foot contacts; a **stride**, or complete gait cycle, runs between successive contacts of the same foot. Let \(s\) be average step length, \(S\) stride length, \(C\) cadence in **steps/min**, and \(T\) stride time:

\[
S=s_L+s_R,\qquad
v=\frac{Cs}{60}=\frac{CS}{120},\qquad
T=\frac{120}{C}.
\]

Thus, **strides/min = steps/min ÷ 2**. These are accounting identities, not empirical prediction equations. Products or reciprocals of separately averaged population measurements need not reproduce the corresponding population mean exactly.

**Stance** includes single support plus **two double-support intervals**. Single-limb support is the period when that limb alone supports the body; it corresponds to the opposite limb’s swing. All percentages below use the **complete stride**, not the step, as denominator. Hebenstreit’s phase diagram makes these distinctions explicit. :chatgpt-content-reference{index="0"}

---

## 1. Walking speed, step length and cadence

**Principal samples:** **S:** 30 healthy adults, 15 women/15 men, age \(30\pm10\) years; instrumented treadmill/virtual environment. **C:** CADENCE-adults, healthy adults aged 21–40; level treadmill, with condition-specific sample sizes below. **U:** 10 adults, age \(26.7\pm3.6\) years; matched treadmill/overground conditions, predominantly arms folded. :chatgpt-content-reference{index="1"}

### Evidence table 1

| Source and condition | Speed, m/s | Step length, m | Cadence, **steps/min** | Measurement/pinpoint |
|---|---:|---:|---:|---|
| **S**, prescribed slow | **0.40** | **0.38 ± 0.04 M** | **64.8 ± 7.2 D** | Measured stride length **0.75 ± 0.08 m**. Cadence converted from steps/s. Thesis Table 8-1, p.116. |
| **S**, prescribed slow | **0.60** | **0.45 ± 0.04 M** | **80.4 ± 7.2 D** | Stride **0.90 ± 0.08 m**; same table. |
| **S**, prescribed slow | **0.80** | **0.52 ± 0.04 M** | **91.8 ± 6.6 D** | Stride **1.05 ± 0.08 m**; same table. |
| **C**, 1.0 mph; n=76 | **0.44704 D** | **0.396 D** | **67.8 ± 9.1 M**; observed range **53–105** | Table 2; cadence directly counted. |
| **C**, 1.5 mph; n=76 | **0.67056 D** | **0.480 D** | **83.8 ± 8.0 M**; **72–110** | Table 2. |
| **C**, 2.0 mph; n=76 | **0.89408 D** | **0.558 D** | **96.1 ± 6.5 M**; **85–115** | Table 2. |
| **C**, 2.5 mph; n=75 | **1.11760 D** | **0.634 D** | **105.8 ± 6.1 M**; **93–121** | Table 2. |
| **C**, 3.0 mph; n=74 | **1.34112 D** | **0.708 D** | **113.6 ± 6.1 M**; **101–127** | Table 2. |
| **U**, preferred frequency | **1.30** | **0.718 D** | **108.6 ± 6.2 D** | Table 1 reports **54.3 ± 3.1 strides/min**. |
| **U**, frequency prescribed 20% above preferred | **1.30** | **0.598 D** | **130.4 ± 7.2 D** | Table 1 reports **65.2 ± 3.6 strides/min**. |

Sources: S, author-archived measurements; C, published Table 2; U, published Table 1. :chatgpt-content-reference{index="2"}

**Important distinction:** C and U step lengths above are **kinematic equivalents**, calculated as \(60v/C\) using group-mean cadence. They are **not directly reported mean step lengths**.

### What establishes shorter-step/higher-cadence plausibility?

At **0.44704 m/s**, C actually observed cadence as high as **105 steps/min**. The corresponding steady-speed average step length is approximately **0.255 m D**. This supports the existence of substantially shorter-step/higher-cadence walking near the requested lower speed range—but that value is a **sample extreme**, not the typical pattern. :chatgpt-content-reference{index="3"}

U independently demonstrates deliberate frequency increases at unchanged walking speed: the higher-frequency condition was performed, rather than merely predicted. It does **not** establish that the same relative increase is equally typical at very slow speeds. :chatgpt-content-reference{index="4"}

### Optional size normalization

Hof’s Table 1 and equations 8–9 give:

\[
\hat{s}=s/L,\qquad
\hat{v}=v/\sqrt{gL},\qquad
\hat{f}=f\sqrt{L/g},
\]

where frequency \(f\) must retain its **step-versus-stride** definition. Hof’s table specifies greater-trochanter-to-floor leg length. Alexander’s 1984 abstract instead describes hip-joint height and uses \(Fr=v^2/(gL)\). **Hof calls the unsquared quantity a Froude number and explicitly notes the competing convention.** Always write the formula, not just “Froude number.” :chatgpt-content-reference{index="5"}

---

## 2. Single support and double support versus speed

**H:** Hebenstreit et al.—the likely intended “Hebestreit” citation—studied **21 healthy adults**, age \(23.8\pm3.3\) years, on an instrumented treadmill at **0.6–1.7 m/s in 0.1 m/s increments**. Foot-contact events used a **20 N vertical-force threshold**. :chatgpt-content-reference{index="6"}

### Evidence table 2

| Source; speed | One limb’s stance | One limb’s swing / single support | **Both double-support intervals combined** | Basis and pinpoint |
|---|---|---|---|---|
| **S; 0.40 m/s** | **1.38 ± 0.18 s M** | Swing **0.54 ± 0.05 s M**; single support **0.55 ± 0.07 s M** | **0.83 s D; 43.2% D** | Table 8-1, pp.115–116; calculation below. |
| **S; 0.60 m/s** | **1.04 ± 0.10 s M** | Swing **0.48 ± 0.06 s M**; single support **0.50 ± 0.06 s M** | **0.54 s D; 35.5% D** | Same source. |
| **S; 0.80 m/s** | **0.87 ± 0.07 s M** | Swing **0.45 ± 0.04 s M**; single support **0.46 ± 0.05 s M** | **0.41 s D; 31.1% D** | Same source. |
| **H; 0.60 m/s** | **66.08% F** | Swing **33.74% F** | **32.02% F/D** | Table 1 regressions; author proof p.5. |
| **H; 0.80 m/s** | **65.44% F** | Swing **34.42% F** | **30.76% F/D** | Same source. |
| **H; 1.00 m/s** | **64.80% F** | Swing **35.10% F** | **29.50% F/D** | Same source. |
| **H; 1.20 m/s** | **64.16% F** | Swing **35.78% F** | **28.24% F/D** | Same source. |

Sources: S appendix; H Table 1 and Figure 4. :chatgpt-content-reference{index="7"}

**S calculations:** To avoid its ambiguously worded double-support definition and problematic stride-time statistics, the table uses:

\[
\bar T=\overline{t_{\rm stance}}+\overline{t_{\rm swing}},
\qquad
\overline{t_{\rm DS,total}}
=\overline{t_{\rm stance}}-\overline{t_{\rm single-support}}.
\]

The resulting percentages are **ratios of rounded published means**, not reported mean individual percentages. No double-support SD has been manufactured.

**H equations**, with \(v\) in m/s and outputs in percent of stride:

\[
\begin{aligned}
\text{stance}&=68.0-3.2v,\\
\text{swing}&=31.7+3.4v,\\
\text{first DS: loading response}&=17.9-3.2v,\\
\text{second DS: preswing}&=17.9-3.1v.
\end{aligned}
\]

Thus **combined DS \(=35.8-6.3v\)**. These are fitted cohort relationships, **not exact individual identities**; phase regressions were fitted separately. Do not extrapolate them below **0.6 m/s**. H does not provide the cadence/stride-time information needed here to report speed-specific seconds without another derivation or dataset. :chatgpt-content-reference{index="8"}

---

## 3. Defensible slow and normal-slow ranges

**No universal healthy-adult “slow” or “normal-slow” category boundaries were verified.** The defensible approach is to identify numerical experimental conditions and distinguish instructed slow walking from self-selected comfortable walking.

### Evidence table 3

| Source | Population and setting | Verified speed evidence | Interpretation |
|---|---|---|---|
| **S** | Healthy adult treadmill sample described above | **0.2–0.8 m/s**, increments **0.1**, plus self-selected walking | Direct experimental coverage includes the requested starting region. These are tested conditions, not diagnostic categories. |
| **W: Wu et al. 2019** | **8 analyzed adults**, ages **23–31**; treadmill | Prescribed **0.4, 1.2, 1.8, 2.2 km/h**; authors label these approximately **0.1, 0.3, 0.5, 0.6 m/s** | **0.4 km/h is not 0.4 m/s.** The paper’s “very slow” framing is study-specific. |
| **W**, self-selected condition | Same sample | Individual self-selected speeds **0.92–1.14 m/s** | Comfortable treadmill walking need not equal a single textbook speed. |
| **H** | Healthy young-adult treadmill sample | **0.6–1.7 m/s** | Supplies continuous support-phase evidence through slow-to-ordinary walking. |
| **B: Bohannon 1997** | **230 healthy adults aged 20–79**; timed overground walking over **7.62 m** | Comfortable means: men in their 20s **1.393 ± 0.153 m/s**; women in their 20s **1.407 ± 0.175 m/s** | Primary ordinary-adult context; Table 4, p.17. |
| **B**, all age/sex strata | Same study | Stratum means span **1.272–1.462 m/s** | A range of **group means**, not an individual healthy-speed reference interval. |

Sources: S methods; W methods; H methods; B Table 4. :chatgpt-content-reference{index="9"}

These findings support a ladder beginning near **0.4 m/s** and proceeding toward ordinary adult speeds, without assigning invented category boundaries. A walk-to-run transition value is unnecessary for defining this ladder; none is imported as a walking limit.

---

## 4. Minimum toe/foot clearance

**Minimum toe clearance is not peak swing-foot height.** It describes a low-clearance event during swing. It is also not interchangeable with the minimum height of any arbitrary foot marker or with an all-points, all-times collision clearance. :chatgpt-content-reference{index="10"}

### Evidence table 4

| Source | Sample and condition | Verified clearance | Measurement and pinpoint |
|---|---|---|---|
| **Wi: Winter 1992** | **11 young adults**, **10 repeated walking trials each** for clearance analysis; absolute speed not recoverable from the accessible abstract | **12.9 mm**, variability **about 4 mm** | Minimum toe clearance; abstract, p.45. The separate **55-trial** slow/natural/fast-cadence analysis concerns energetics—not 55 clearance subjects. |
| **T: Schulz 2011**, slow | **14 unimpaired adults**, 7 women/7 men, ages **20–35**; shod overground, flat/no-obstacle condition | **8.5 ± 5.0 mm M** | Digitized shoe-to-floor geometry; Table 1, author manuscript p.18. |
| **T**, preferred | Same sample and surface | **10.2 ± 4.5 mm M** | Same measurement and table. |
| **T**, fast instructed walking | Same sample and surface | **14.6 ± 6.0 mm M** | Same measurement and table; contextual rather than a slow-walking target. |

Sources: Winter’s publisher abstract; Schulz’s primary manuscript and Table 1. :chatgpt-content-reference{index="11"}

**Schulz qualifications:** The speed row is labeled **“% Leg Length/s”**, with no-obstacle entries **1.02, 1.50, 2.56**. This is an unresolved unit/presentation problem; these numbers must **not** be relabeled m/s. Trials also used dim lighting. The speed post-hoc analysis did **not** find a significant slow-versus-preferred MTC difference. :chatgpt-content-reference{index="12"}

**Unresolved clearance gap:** I did not verify an unambiguous healthy-adult MTC table specifically at **0.4, 0.6 and 0.8 m/s**. The available evidence establishes a cross-check at roughly centimetre scale, not a speed-specific minimum-clearance prescription. :chatgpt-content-reference{index="13"}

---

## A. High-confidence facts

**Healthy people can perform sustained walking in the requested slow-speed region.** Both step length and cadence generally increase with speed, but a population’s preferred relationship is not the boundary of physically performed human walking. C and U provide direct evidence of shorter-step/higher-frequency alternatives. :chatgpt-content-reference{index="14"}

**Support timing is speed-dependent.** Slower walking increases the proportion devoted to double support. A single fixed stance/swing or double-support percentage is therefore inappropriate as a universal reference across the entire speed ladder. :chatgpt-content-reference{index="15"}

**Clearance references require an event and geometric definition.** Toe-clearance results can support a plausibility cross-check, but they do not establish a universal safe minimum or peak foot-lift target. :chatgpt-content-reference{index="16"}

## B. Approximate/context-only findings

The tabulated **cohort means, ±SD bands, sample extrema and regression outputs** are descriptive references—not validated pass/fail limits. In particular, the highest observed cadence in a sample should not be treated as either typical behavior or a universal maximum.

Size-normalized relationships are useful only when the leg-length landmark, frequency definition and squared/unsquared speed convention remain consistent. :chatgpt-content-reference{index="17"}

## C. Conflicts and uncertainties

**Smith archive quality:** The appendix’s stride-time statistics contain internal contradictions: at **0.4 m/s**, the printed mean is **1.91 s** but the minimum is **1.94 s**. Its double-support definition also has inconsistent event/unit wording. Those fields were not silently corrected; the combined-support calculations above use separately reported stance, swing and single-support means. Treat the archive-derived exact values cautiously until checked against original subject-level data. :chatgpt-content-reference{index="18"}

**Cross-study support differences:** At **0.6 m/s**, S-derived combined double support is approximately **35.5%**, versus **32.0%** from H’s fitted relationship. These are different cohorts, processing pipelines and statistic types; they should not be averaged into a supposedly universal constant. :chatgpt-content-reference{index="19"}

**Short-step evidence is not a complete joint distribution.** Separately reported step-length and cadence ranges do not authorize arbitrary combinations of their endpoints. Derived combinations must satisfy the speed identity.

**Classic-source verification is incomplete.** Bibliographic identification is not verification of remembered equations. The source audit in §E identifies which classic sources were retained for context and which did not yield verified calibration constants.

## D. Suggested evidence-supported test points

The following **five reference points** use actual experimental speeds rather than invented category boundaries. The upper two retain CADENCE-adults’ exact mph conversions.

Step/cadence ranges below are **mean ±1 SD summaries**, except that upper-row step ranges are explicitly inverse-transformed from cadence. Support fractions at the upper speeds come from **H, a separate cohort**; they are not jointly measured with C’s cadence.

| Human-reference speed | Step-length reference, m | Cadence reference, steps/min | Support reference |
|---|---:|---:|---|
| **0.400 m/s** | **0.34–0.42 M** | **57.6–72.0 D** | Single support **0.48–0.62 s M**; combined DS approximately **0.83 s / 43.2% D**. |
| **0.600 m/s** | **0.41–0.49 M** | **73.2–87.6 D** | Single support **0.44–0.56 s M**; combined DS approximately **0.54 s / 35.5% D**. H independently gives **32.0% F**. |
| **0.800 m/s** | **0.48–0.56 M** | **85.2–98.4 D** | Single support **0.41–0.51 s M**; combined DS approximately **0.41 s / 31.1% D**. |
| **1.11760 m/s** | **0.599–0.673 D** | **99.7–111.9 M** | H: swing/opposite single support approximately **35.5% F**; combined DS **28.8% F/D**. |
| **1.34112 m/s** | **0.672–0.749 D** | **107.5–119.7 M** | H: swing/opposite single support approximately **36.3% F**; combined DS **27.4% F/D**. |

Sources and arithmetic: Tables 1–2 above. :chatgpt-content-reference{index="20"}

For the upper rows, step bounds are \(60v/(C+SD)\) through \(60v/(C-SD)\), **not independently measured step-length percentiles**. No cross-study support times in seconds or missing double-support variability have been invented.

---

## E. Sources, links and classic-source audit

### Primary quantitative sources

**S — Smith AJJ, Lemaire ED.** Temporal-spatial gait parameter models of very slow walking. *Gait & Posture*. 2018;61:125–129. [DOI: 10.1016/j.gaitpost.2018.01.003](https://doi.org/10.1016/j.gaitpost.2018.01.003). PMID: 29331720. Detailed values recovered from **Smith AJJ. *Modeling Human Dynamics for Powered Exoskeleton Control*. University of Ottawa dissertation, 2019**, Chapter 3 and Table 8-1, printed pp.115–116. [Institutional full text](https://ruor.uottawa.ca/bitstreams/14ad400d-96b8-48d0-9647-5952297fc6ca/download). Archive issues are documented above.

**H — Hebenstreit F, Leibold A, Krinner S, Welsch G, Lochmann M, Eskofier B.** Effect of walking speed on gait sub phase durations. *Human Movement Science*. 2015;43:118–124. [DOI: 10.1016/j.humov.2015.07.009](https://doi.org/10.1016/j.humov.2015.07.009). PMID: 26256534. **Figure 1; Table 1/Figure 4.** [Institutional author proof](https://www.mad.tf.fau.de/files/2020/12/hebenstreit_2015_hms_proof2.pdf). Correct author spelling: **Hebenstreit**, not Hebestreit.

**C — Tudor-Locke C, Aguiar EJ, Han H, Ducharme SW, Schuna JM Jr, Barreira TV, Moore CC, Busa MA, Lim J, Sirard JR, Chipkin SR, Staudenmayer J.** Walking cadence (steps/min) and intensity in 21–40 year olds: CADENCE-adults. *International Journal of Behavioral Nutrition and Physical Activity*. 2019;16:8. [DOI/full text: 10.1186/s12966-019-0769-6](https://doi.org/10.1186/s12966-019-0769-6). **Table 2.** Its exercise-intensity thresholds are not used as gait-normality boundaries.

**U — Umberger BR, Martin PE.** Mechanical power and efficiency of level walking with different stride rates. *Journal of Experimental Biology*. 2007;210:3255–3265. [DOI/full text: 10.1242/jeb.000950](https://doi.org/10.1242/jeb.000950). PMID: 17766303. **Table 1; Materials and methods.**

**B — Bohannon RW.** Comfortable and maximum walking speed of adults aged 20–79 years: reference values and determinants. *Age and Ageing*. 1997;26:15–19. [DOI: 10.1093/ageing/26.1.15](https://doi.org/10.1093/ageing/26.1.15). PMID: 9143432. **Table 4, p.17.**

**W — Wu AR, Simpson CS, van Asseldonk EHF, van der Kooij H, Ijspeert AJ.** Mechanics of very slow human walking. *Scientific Reports*. 2019;9:18079. [DOI/full text: 10.1038/s41598-019-54271-2](https://doi.org/10.1038/s41598-019-54271-2). **Methods; Figures 1–2.** [Public dataset: 10.5683/SP2/EMQLLE](https://doi.org/10.5683/SP2/EMQLLE). No graph-read numerical values have been substituted for raw data.

**T — Schulz BW.** Minimum toe clearance adaptations to floor surface irregularity and gait speed. *Journal of Biomechanics*. 2011;44:1277–1284. [DOI: 10.1016/j.jbiomech.2011.02.010](https://doi.org/10.1016/j.jbiomech.2011.02.010). PMID: 21354576. [Public manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC5375113/). **Table 1; §§2.2–2.3 and 3.1.**

**Wi — Winter DA.** Foot trajectory in human gait: a precise and multifactorial motor control task. *Physical Therapy*. 1992;72:45–53. [DOI/publisher: 10.1093/ptj/72.1.45](https://doi.org/10.1093/ptj/72.1.45). PMID: 1728048. Clearance value and sample verified from the **abstract, p.45**; speed-specific clearance values were not recovered.

### Normalization and requested classic sources

**Hof AL.** Scaling gait data to body size. *Gait & Posture*. 1996;4:222–223. [DOI: 10.1016/0966-6362(95)01057-2](https://doi.org/10.1016/0966-6362(95)01057-2). **Table 1 and equations 8–9 verified.** Useful for normalization, not a human speed–cadence calibration curve.

**Alexander RM, Jayes AS.** A dynamic similarity hypothesis for the gaits of quadrupedal mammals. *Journal of Zoology*. 1983;201:135–152. [DOI: 10.1111/j.1469-7998.1983.tb04266.x](https://doi.org/10.1111/j.1469-7998.1983.tb04266.x). **Quadrupedal comparative framework**, not a healthy-human slow-walking reference table. :chatgpt-content-reference{index="21"}

**Alexander RM.** The gaits of bipedal and quadrupedal animals. *International Journal of Robotics Research*. 1984;3(2):49–59. [DOI: 10.1177/027836498400300205](https://doi.org/10.1177/027836498400300205). Froude definition verified in abstract; **no unverified human calibration coefficients imported**. The year alone is not a unique identification of all Alexander publications. :chatgpt-content-reference{index="22"}

**Alexander RM.** Optimization and gaits in the locomotion of vertebrates. *Physiological Reviews*. 1989;69:1199–1227. [DOI: 10.1152/physrev.1989.69.4.1199](https://doi.org/10.1152/physrev.1989.69.4.1199). PMID: 2678167. Bibliography verified; **specific remembered walking equations not verified and not used**. :chatgpt-content-reference{index="23"}

**Grieve DW, Gear RJ.** The relationships between length of stride, step frequency, time of swing and speed of walking for children and adults. *Ergonomics*. 1966;9:379–399. [DOI: 10.1080/00140136608964399](https://doi.org/10.1080/00140136608964399). PMID: 5976536. **Original quantitative tables/equations not recovered**; no coefficients attributed to it here. :chatgpt-content-reference{index="24"}

**Murray MP, Drought AB, Kory RC.** Walking patterns of normal men. *Journal of Bone and Joint Surgery, American Volume*. 1964;46:335–360. [PMID: 14129683](https://pubmed.ncbi.nlm.nih.gov/14129683/). **Original numerical tables not recovered**; frequently repeated reference numbers were not accepted without them. :chatgpt-content-reference{index="25"}

**Kharb A, Saini V, Jain YK, Dhiman S.** A review of gait cycle and its parameters. *International Journal of Computational Engineering & Management*. 2011;13:78–83. [Author-uploaded full text](https://www.researchgate.net/publication/268423123_A_review_of_gait_cycle_and_its_parameters). **Narrative review, not primary normative data.** Its approximate phase percentages and figures trace to other references, including Whittle and Otis/Burstein; they are not retained as calibration constants. :chatgpt-content-reference{index="26"}

**Perry J, Burnfield JM.** *Gait Analysis: Normal and Pathological Function*. 2nd ed. SLACK; 2010. ISBN 9781556427664. [Publisher listing](https://www.routledge.com/Gait-Analysis-Normal-and-Pathological-Function/Perry-Burnfield/p/book/9781556427664). Edition identified, but **specific numerical pages were not directly verified**. Hebenstreit cites **Perry 1992**, which must not be silently relabeled as the Perry/Burnfield second edition. :chatgpt-content-reference{index="27"}

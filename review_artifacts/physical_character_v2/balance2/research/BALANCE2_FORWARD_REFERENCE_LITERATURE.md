# BALANCE-2: forward no-step human reference, primary-source literature audit

Date: 12 Oct 2026. Scope: research only. No simulations were run and no project files other than this one were touched.

**Value labels.** [M] = measured value, quoted from the paper's own text, tables or figures. [E] = derived here (the arithmetic is shown or given in §1). [MODEL] = model reasoning. [SEC] = a value quoted through another paper.
**Access codes** (one per reference, §8). FT = full text read (publisher, PMC, HAL or thesis PDF). ABS = abstract only. SEC = known only through another paper. Where a value was not reported or not accessible, the text says "not reported" or "not accessed".

---

## 0. Key findings (summary)

1. **The "16–23 N·s human forward feet-in-place threshold" is not a measured threshold for a 50 ms push.** It mixes four different things:
   - a natural-stepping threshold for a 200 ms push (Emmens);
   - sub-threshold manual pushes of about 370 ms, with frontal-plane and sagittal values mixed together (Rietdyk);
   - one subject's individual curve, mislabelled as the group 50 % boundary and extrapolated outside the tested range (Robert);
   - a treadmill study that only supplied a stance width (Crenshaw).
2. **Robert 2018.** The formula F = 2434/t_p + 7.69 is subject 14's *individual* boundary (Fig. 2 and Table 3, row 14). The *group* 50 % boundary is F50 = 2379/t_p + 8.79 (Fig. 4). The shortest pulse tested was **150 ms**, so any t_p ≤ 100 ms is an extrapolation.
3. **Rietdyk 1999.** The J Biomech paper reports only **medio-lateral** pushes. The anterior-posterior pushes are in the thesis (Chapter 3): pelvis 19.7 N·s, 367 ms, 113 N, primary COM excursion 5.6 cm. The figures "122 N / 22.8 N·s / 6.4 cm" are medio-lateral. None of these pushes is a threshold.
4. **Longer pulses tolerate more impulse.** For an inverted pendulum with delayed centre-of-pressure (CoP) control, an equal-capacity push carries about 25 % more impulse at 200 ms and 53–57 % more at 350–370 ms than at 50 ms [MODEL]. Robert's data rise even faster than this between 150 and 300 ms [E].
5. **Normalisation.** Express each threshold as a fraction of the subjects' own zero-delay limit, corrected for pulse duration. Human "try not to step" data then fall at **0.50–0.64** (Robert at 150 ms, relative to measured CoP reach: 0.60; Crenshaw belt thresholds as model equivalents: 0.42–0.62), and up to 0.70 for long pulls [E].
6. **The fixture scores 0.60 raw and 0.556 duration-corrected.** That is inside the human band, slightly below Robert's 150 ms value. As an effective delay, the fixture behaves like 187 ms versus 164 ms for humans (Robert, 150 ms) [E].
7. **Expectation for the fixture as specified (d = 103 mm): 13–18 N·s, centre about 15 N·s.** That is 0.126–0.176 N·s per mm of COM-to-front distance. The measured 14.4 N·s is consistent with it. A target of 16–23 N·s would require 0.67–0.96 of the fixture's zero-delay limit, so it is not appropriate.
8. **Human geometry for a 1.76 m man** (all [E]):
   - Foot length about 255–262 mm.
   - Quiet-stance COM 3–6 cm in front of the ankle.
   - COM to toe tip 145–185 mm barefoot.
   - COM to first metatarsal head 75–110 mm.
   - Static voluntary forward limit about 0.40 foot lengths, i.e. 100–105 mm.
   - Dynamic CoP reach under perturbation about 150 mm.

   **103 mm is plausible only as a functional (metatarsal-level) edge. It is short for a boot toe edge.**
9. **Not found:** any study of ≤100 ms pelvis pushes with feet in place, any forward threshold for athletes or footballers, and any measured football "ready stance" kinematics.

---

## 1. Fixture, conventions and the model used for normalisation

### 1.1 Fixture (as supplied by the caller)
- Body: 73.9 kg, about 1.76 m tall, arms free, rigid-soled football boots.
- Stance: ankles 0.42 m apart, feet parallel.
- COM to toe edge: d ≈ 0.103 m (being re-measured).
- Push: 50 ms rectangular, at the pelvis COM. Stepping is impossible.
- Threshold: J = 14.4 N·s, so Δv = 14.4/73.9 = 0.195 m/s [E].

### 1.2 COM height and ω0 [E]
- The fixture's COM height was not supplied. I bracket it at l = 0.55–0.58 H, i.e. 0.968–1.021 m.
- The bracket is supported by two papers. Back-solving Robert 2018's own model check gives z0 = 1.005 m = 0.576 H (see §4.1). Crenshaw & Kaufman 2014 assumed a pendulum length of 0.586 H [M].
- This gives ω0 = √(g/l) = 3.10–3.18 rad/s (central value 3.15 at l = 0.99 m).
- Zero-delay limit: Δv_lim = ω0·d = 0.319–0.328 m/s (central 0.324), i.e. J_lim = 23.6–24.2 N·s.
- **Fixture fraction:**
  - raw: Δv/Δv_lim = 0.59–0.61 (0.60);
  - duration-corrected (÷ 1.081 for 50 ms, see §1.3): 0.55–0.57 (0.556).

### 1.3 Linear-inverted-pendulum criterion with delayed CoP shift [MODEL]
- Assumptions: CoM at constant height. The CoP starts under the COM. At time Tr after force onset it jumps to the front edge, a distance d ahead, and stays there.
- The extrapolated COM is ξ = x + v/ω, and evolves as dξ/dt = ω(ξ − p) + F(t)/(mω).
- Integrating gives the recoverability condition for any force profile:
  **(1/m)·∫ e^(−ωt) F(t) dt ≤ ω·d·e^(−ωTr)**.
  The left side is the "exponentially discounted impulse".
- For a rectangular pulse of length Tp this becomes:
  J_max = m·ω·d·e^(−ωTr) · u/(1 − e^(−u)), with u = ωTp.
  This is identical to Robert et al. 2018, Appendix Eq. 7. I checked that it holds whether Tp is shorter or longer than Tr.
- Consequences:
  - The duration factor u/(1 − e^(−u)) is independent of Tr.
  - The "duration-corrected fraction" Δv_th / (Δv_lim · u/(1 − e^(−u))) estimates e^(−ωTr_eff), the effective delay of a full CoP shift.
  - A platform translation of acceleration a(t) is equivalent to F = −m·a(t) at the COM.
- Limitations: real CoP shifts are rate-limited, not instantaneous; hip and arm strategies, and heel or toe rise, are ignored.

| Tp (rectangular) | u/(1−e^(−u)) at ω = 3.15 | Impulse ratio relative to 50 ms (equal capacity) |
|---|---|---|
| → 0 | 1.000 | 0.925 |
| 50 ms | 1.081 | 1.000 |
| 100 ms | 1.166 | 1.079 |
| 150 ms | 1.255 | 1.161 |
| 200 ms | 1.347 | 1.247 |
| 350 ms | 1.650 | 1.527 |
| 370 ms | 1.691 | 1.566 |

For a symmetric (hand-push-like) pulse the factor is about e^(ωTp/2). At 367 ms that is about 1.76, against 1.67 for a rectangular pulse [MODEL].

---

## 2. Audit of the earlier "16–23 N·s" construction (errors found)

| Item | What the earlier document used | What the primary source says | Effect |
|---|---|---|---|
| **Robert 2018 formula** | "F50 = 2434/t_p + 7.69, 50 % boundary" (seen via Liu 2024) | It is the **individual** fit of the representative subject (Fig. 2: a = 2434 [1929–2939], C = 7.69 [6.32–9.06], R² = 0.94; Table 3 row 14) [M]. Liu et al. 2024 label it f̂_ind [M]. The **group** F50 fit is a = 2379 [2236–2522], c = 8.79 [8.40–9.18], R² = 0.9955 (Fig. 4) [M]. Individual "thresholds" were midpoints between the largest no-step force and the smallest step force, not 50 % points [M]. | Numerically small: t_p → 0 gives 0.233 (group) vs 0.239 m/s; 100 ms gives 0.320 vs 0.314 m/s [E]. The attribution is wrong. |
| **Robert tested range** | Extrapolated to t_p → 0 and 100 ms | Tested durations: 150, 300, 450, 600, 800, 1000, 1500, 2000 and 3000 ms. Forces: 15 levels, 40–180 N [M]. **t_p ≤ 100 ms is an extrapolation.** The authors' text says "for a 100 ms perturbation ... approximately 25 % BW" [M], but their own group hyperbola gives 32.6 % BW at 100 ms [E]. 24.4 % BW was measured at **150 ms** [M]. | The extrapolated values are model-dependent (§4.3). |
| **Rietdyk 1999 paper** | J Biomech 32:1149 cited as forward evidence | The paper covers **medio-lateral** pushes only (abstract [M]; the thesis Ch. 2 is the same study, FT). The forward/A-P data are in **thesis Ch. 3** only. | Wrong source for forward evidence. |
| **Rietdyk magnitudes** | "113–122 N, about 370 ms; COM 5.6–6.4 cm at 20–23 N·s" | **A-P** (Table 3.1/3.2): 113.1 N shoulder / 112.9 N pelvis; 19.4 / 19.7 N·s; 370 / 367 ms; primary COM 7.0 / 5.6 cm [M]. **M-L** (Table 2.1/2.3): 108.7 / 122.0 N; 18.4 / 22.8 N·s; 347 / 368 ms; COM 6.0 / 6.4 cm [M]. Latencies of 66 ms (angle) and 89 ms (moment) are A-P, both sites pooled, mean ± SE [M]. | Planes were mixed. |
| **Rietdyk as a threshold** | "Δv ≤ 0.23 m/s" | Pushes were *random*, 13.3–28.2 N·s (A-P pelvis), with instruction to stay feet-in-place. The number of stepping trials in A-P was not reported; in M-L "three of the participants had to take a step ... in at least one trial" [M]. | 0.229 m/s is a recovered mean, i.e. a **lower bound** on capacity, not a threshold. |
| **Emmens 2020** | Forward 0.11 mg, 200 ms, taken as a no-step threshold | 0.11 ± 0.029 mg is the trial-1 **first estimate** (0.02 mg resolution) of the strongest force without a step under "maintain balance in a natural way (with or without stepping)", with counting backwards [M]. Trials with "a lot of heel lift" were discarded [M]. The actuator "could not track the desired reference force perfectly" [M]. | A natural-stepping threshold sits below feet-in-place capacity (§3). |
| **Sturnieks** | Lateral/AP force ratios | Sturnieks 2013 studied **older adults, 80.0 ± 4.4 y** [M]. Robert attributes "about 81 N for young subjects, 600 ms" to Sturnieks 2012/2013 [SEC]; the 2012 title says "in older adults" (not accessed). | Not a young-adult reference. |

---

## 3. Task A: extraction of forward (anterior-fall) feet-in-place and stepping-threshold studies

"Forward" always means the fall direction is anterior. For a push or pull this is the push direction. For a support-surface translation the platform moves backward.

### 3.1 Subjects and set-up

| Study | Subjects | Stance / foot placement | COM rel. support | Footwear | Perturbation (point, profile, duration) | Posture, arms |
|---|---|---|---|---|---|---|
| **Emmens 2020** (FT) | 10 (5 F), 23.6 ± 1.9 y, 75 ± 11 kg, 1.80 ± 0.09 m; non-athletic, not stated [M] | "feet ... next to each other underneath the hips", weight even; tape marks; fore-aft and foot angle not reported [M] | Not reported. Trials dismissed if lean deviated > 0.03 m at onset [M] | Not reported | Pelvis brace on a rod from behind (forward push); reference **rectangular 0.2 s**, 0.04–0.16 mg in 0.02 mg steps, device cap 133 N; delivered force imperfect [M] | Upright comfortable; knee/hip not reported; **arms crossed**; gaze 3 m; harness [M] |
| **Robert 2018** (FT, HAL manuscript) | 22 (5 F/17 M; 21 analysed), 19–37 y (25.5 ± 4.13), 174.3 ± 7.14 cm, 69.9 ± 10.2 kg; non-athletic, not stated [M] | "natural and comfortable foot position", traced; width not reported [M] | Not reported. CoPmax 0.153 ± 0.018 m (near-threshold trials) [M] | Not reported | Waist belt "at upper pelvis level", forward pull by cable; **step-to-plateau ("simple step") force**, 40–180 N × 150–3000 ms (86 combinations); baseline 8 N; rise time not reported [M] | **Arms unconstrained** [M]; harness not reported |
| **Rietdyk 1999 thesis Ch. 3** (FT) | 10 M, 26.0 ± 4.2 y, 86.0 ± 8.2 kg, 181.6 ± 7.1 cm [M] | "one foot on each force plate", comfortable; width not reported [M] | Not reported | Not reported | **Manual** push via instrumented device at pelvis or shoulder; A-P pelvis 112.9 ± 1.7 N (SE), 19.7 ± 0.4 N·s, 367 ± 7 ms; random magnitude 13.3–28.2 N·s [M] | White noise in headphones; arms not reported [M] |
| **Crenshaw & Kaufman 2014** (FT) | 15 (10 F/5 M), 22–44 y; mass 44.6–102.0 kg (mean 67.5 [E]); pendulum height 0.90–1.09 m (= 0.586 H, i.e. H ≈ 1.73 m [E]) [M] | Side-by-side, **17.2 ± 4.4 cm** comfortable width [M] | Not reported | Own athletic shoes [M] | Treadmill belt, 400 ms triangular velocity (peak 0.1–3.2 m/s; initial acceleration 0.5–16 m/s²); anterior = fall direction [M] | Harness; arms not reported |
| **Koushyar 2019** (FT) | Young 5 (2 F), 23.4 ± 2.5 y, 1.74 ± 0.07 m, 72.5 ± 8.1 kg [M] | Feet about shoulder width [M] | Not reported | **Barefoot** [M] | Platform translated **backward** about 0–0.25 m in about 350 ms, +1 cm steps; velocity profile not reported [M] | **Arms crossed**; hip motion allowed [M] |
| **Fujimoto 2013** (FT, author manuscript) | Young 16 (8 F), 25.4 ± 4.3 y, 171.3 ± 8.7 cm, 67.7 ± 12.5 kg [M] | One foot per plate; width not reported [M] | FBOS measured from the ankle (§5.3) [M] | Not reported | Platform **backward 15 cm** at 15–70 cm/s, ramp-to-parabola acceleration [M] | **Arms folded**; harness; "not to bend their trunk with hip flexion" [M] |
| **Robinovitch 2002** (ABS) | 23 young; sex and anthropometry not in abstract [M] | Not in abstract | Lean angle used (definition not accessed) | Not in abstract | **Tether-release** from forward lean; ankle-only instruction [M] | Ankle strategy only |
| **Mille 2003** (ABS) | Young and older, n not in abstract | Not in abstract | Thresholds in "% BoS" | Not in abstract | Forward waist pulls, position-velocity controlled [M] | Not in abstract |
| **Pai 1998** (ABS) | 13 young (plus older groups) [M] | Not in abstract | Phase-plane COM | Not in abstract | Forward waist pulls, 3 magnitudes [M] | Not in abstract |
| **Verniba & Gage 2019** (ABS) | 14 young males [M] | Not in abstract | BOS = foot length | Not in abstract | Shoulder-harness pull and platform, driven by falling weights [M] | Not in abstract |
| **Zhu 2022** (FT) | 12 (6 F), 20.9 ± 0.7 y, 169.9 ± 6.9 cm, 58.3 ± 6.2 kg [M] | Shoulder width, shoes [M] | Not reported | Shoes [M] | Belt above the PSIS, **displacement-controlled** anterior pull up to 6 % of height (thirds) [M] | Holding a light rod at waist height [M] |

### 3.2 Instruction, stepping rule, failure definition, threshold distribution, normalisation, strategy

| Study | Instruction / stepping rule | Failure definition | Threshold distribution | Normalisation | Strategy, heel/toe |
|---|---|---|---|---|---|
| **Emmens** | "maintain balance in a natural way (with or without stepping)", counting backwards in 13s; stepping **allowed** [M] | Step = vertical GRF < 20 N on one foot, within 2 s, step length ≥ 20 % of foot length; heel-lift-heavy trials discarded [M] | Forward **0.11 ± 0.029 mg** (backward 0.074 ± 0.023 mg), n = 10; per-subject not reported [M]. Δv = 0.11·g·0.2 = **0.216 ± 0.057 m/s**; 16.2 N·s at 75 kg [E] | Force in units of m·g [M] | CoM acceleration/velocity and cervical-joint position were the most predictive features (implying trunk/hip involvement) [M] |
| **Robert** | "try not to step"; arms free; stepping **discouraged** [M] | Step = vertical + anterior heel-marker displacement [M] | **Group F50** [M]: 24.4 % BW at 150 ms; 17.3 % at 300; 14.2 % at 450; 12.4 % at 600; 11.6 % at 800; 11.1 % at 1000; 10.1 % at 1500; 10.4 % at 2000; 9.5 % at 3000. Per-subject hyperbolas (n = 21): a = 2360 ± 450 %BW·ms (range 1495–3641), c = 9.31 ± 0.95 %BW [M]. Δv at 150 ms = **0.359 m/s** [E] | % body weight [M] | "swayed around the ankles, sometimes rising on their toes"; trunk lean θmax 0.36 ± 0.16 "rad" as printed, described by the authors as small; Tr 116 ± 20 ms [M] |
| **Rietdyk Ch. 3** | "attempt to maintain balance without taking a step"; stepping **discouraged** [M] | Not formally defined; A-P step counts not reported | **No threshold.** Recovered pushes 13.3–28.2 N·s (pelvis); mean 19.7 N·s, i.e. Δv **0.229 m/s** (range 0.155–0.328) [E] | Absolute N·s [M] | Pelvis push: "jack-knife" (hip extension), knee flexion in most; the ankle plantarflexor moment "was sufficient to cause heel-lift"; peak foot-segment angle 3.9 ± 0.3° (SE) [M] |
| **Crenshaw** | "try not to step"; stepping **discouraged** [M] | Step, or harness support (reported or observed); threshold = level giving 4 consecutive failures [M] | Anterior single-step **τ = 273.0 ± 82.3 N·m**; per-subject initial accelerations 3.0–5.5 m/s² (mean 3.95 ± 0.63, both visits [E]) [M]. LIP-equivalent impulsive Δv: last passing level 0.238 ± 0.043 m/s; first failing 0.273 ± 0.043 m/s [E, §4.2] | τ = m·ẍ·0.586H [M] | Authors attribute lower reliability to an ankle-to-hip strategy continuum [M] |
| **Koushyar** | "try not to step"; hip allowed [M] | Step or assistance; 3 failures at one displacement [M] | Young max displacement **16.2 ± 2.6 cm** (n = 5); per-subject in supplement (not accessed) [M] | cm [M] | Heel rise < 2.5 cm; knee changes about 5° [M] |
| **Fujimoto** | No step, no hip flexion [M] | STEP; heel rise (HR) = heel raised > 1 % of body height [M] | Young: STEP in 19.7 % of trials, HR in 75.2 %; 26.2 % of HRs followed by a step. Mean threshold accelerations not reported (regression only) [M] | m/s²; FBOS in % foot length [M] | Young usually recovered after heel rise [M] |
| **Robinovitch 2002** | Ankle muscles only [M] | Not in abstract | Dynamic recovery limit **5.9 ± 1.1°** vs static 14.9 ± 1.4°; latency 99 ± 13 ms; torque rate 372 ± 267 N·m/s; peak ankle torque 116 ± 32 N·m [M] | Lean angle [M] | Ankle only |
| **Mille 2003** | Not in abstract | Step | Young: T_L 107 % BoS, T_H 72 % BoS, transition velocity 121 % BoS·s⁻¹; young stepped in 40 % of trials [M] | % BoS (definition not accessed) | Not in abstract |
| **Pai 1998** | Not in abstract | Step | Young stepped in 2.7 % of trials at the lowest level [M]; magnitudes not in abstract | COM phase plane | Not in abstract |
| **Verniba & Gage** | Responses "feet-in-place or stepping" [M] | Step | Lowest common step-eliciting combination 8.75 % BW and 105 % BOS [M] | % BW, % foot length [M] | Not in abstract |
| **Zhu** | "try best to maintain postural balance without making steps" [M] | Stepping or foot elevation | Large anterior pulls: 3/36 events (1 participant) [M]. Not a threshold study | % height | Hip extension onset before flexion [M] |

**Excluded or not applicable (checked):**
- **Not feet-in-place studies:** Do et al. 1982 (subjects were told to recover by walking; dynamic reaction time 90.8 ms [M]) and the tether-release stepping studies (Thelen, Wojcik, Hsiao-Wecksler 2008 review).
- **Wrong population:** Sturnieks 2012/2013 (older adults).
- **Wrong stance:** van Mierlo 2023 (staggered stance; 150 ms pelvis pulses at 3–12 % BW).
- **Delay or model sources only, no thresholds:** Kim 2009 (backward translations 3–15 cm in 275 ms; feedback-gain model) and Zelei 2021 (sub-threshold force release; delay τ = 146 ± 65 ms in AP and 169 ± 93 ms in PA [M]).
- **Concepts only:** McIlroy & Maki 1993 (ABS: stepping more frequent when unconstrained; step onset as early as 160 ms, mean 250 ms) and Hof & Curtze 2016 (ABS: effective BoS area about 30 % of static BoS area).

### 3.3 Comparability to the fixture and direction of bias

Fixture: 50 ms rectangular push at the pelvis COM, cannot step, ankles 0.42 m apart, rigid boot, arms free, 73.9 kg, 1.76 m.

| Study | Main mismatches | Bias of the study's threshold relative to the fixture's expected capacity |
|---|---|---|
| Emmens | 200 ms pulse; natural stepping; arms crossed; counting task; delivered force ≠ reference | Pulse: overestimates by ×1.25 [MODEL]. Instruction: underestimates, large (Emmens Δv at 200 ms is about 53 % of Robert's 200 ms boundary of 0.406 m/s [E]). Arms crossed: underestimates (size not quantified in accessed sources). **Net: not a capacity measure.** |
| Robert | ≥150 ms only; "try not to step" (humans may still step early); toe rise allowed; arms free; smaller body (69.9 kg, 1.74 m) | Pulse ≥150 ms: overestimates the impulse vs 50 ms (×1.16 or more at 150 ms [MODEL]). "Try not to step" gives a lower bound on capacity, so it underestimates. Body size: absolute impulse scales as m·ω·d ∝ m·√H, so Robert's subjects are about 0.94× the fixture [E]. **Closest instruction and application point.** |
| Rietdyk | Sub-threshold; manual, about 370 ms, not rectangular; larger body (86 kg, 1.82 m) | Pulse: overestimates by ×1.5–1.6 [MODEL]. Sub-threshold: underestimates capacity. Body: overestimates by ×1.18 [E]. **Not a threshold.** |
| Crenshaw | Support translation (feet accelerated, not pelvis); 400 ms doublet; athletic shoes; harness | Not directly convertible; the LIP equivalent (§4.2) is roughly comparable. Sensory trigger differs (feet move first). |
| Koushyar / Fujimoto | Platform; barefoot or not reported; hip restricted (Fujimoto); arms crossed | Not convertible (velocity profile or threshold means not reported). |
| Robinovitch / Mackey | Lean release (initial COM offset, zero velocity); ankle-only; ankles relaxed at release | Not convertible without the lean-angle definition. The hip constraint underestimates mixed-strategy capacity. |

---

## 4. Task B: normalisation to each study's own zero-delay limit

### 4.1 Inputs
- **ω for each study:** l = 0.576 H. This is Robert's own z0 back-solved from their check (CoPmax/z0)·e^(−ω·0.116 s) = 10.6 % BW, which gives z0 = 1.005 m at H = 1.743 m [E]. For Crenshaw I used their 0.586 H [M].
- **d (COM to front edge) options:**
  1. **Robert's measured CoPmax**, 0.153 m [M], scaled by height for other studies.
  2. **Anatomical COM to toe tip, barefoot**, 145–185 mm at 1.76 m, scaled by H (§5.6) [E].
  3. **Static voluntary limit**, 0.40 foot lengths (§5.3) [E]. Shown only to illustrate that humans exceed it dynamically.

### 4.2 Table B1: thresholds as fractions of the zero-delay limit [E]

"Raw" = Δv_th / (ω·d). "Corrected" = raw ÷ the §1.3 duration factor, which estimates e^(−ωTr_eff).

| Study (quantity) | Δv_th (m/s) | Pulse | ω (rad/s) | d basis (m) | Raw | Duration factor | Corrected |
|---|---|---|---|---|---|---|---|
| **Fixture** | 0.195 | 50 ms rect. | 3.15 | 0.103 | **0.60** | 1.081 | **0.556** |
| Robert F50 (group, measured) | 0.359 | 150 ms rect. | 3.125 | CoPmax 0.153 [M] | 0.75 | 1.253 | **0.60** |
| Robert F50 | 0.359 | 150 ms | 3.125 | toe tip 0.144–0.183 | 0.63–0.80 | 1.253 | 0.50–0.64 |
| Robert F50, 300–1000 ms | 0.509–1.089 | rect. | 3.125 | CoPmax 0.153 | 1.07–2.28 | 1.54–3.27 | **0.69–0.70** (1500–3000 ms: 0.62–0.68) |
| Crenshaw (LIP equivalent: (a/ω)(1−e^(−0.2ω))²) | 0.238 (pass) / 0.273 (fail) | belt doublet, already discounted | 3.11 | toe tip 0.142–0.182; CoPmax-scaled 0.152 | — | — | 0.42–0.62 (0.50–0.58 with 0.152) |
| Emmens (natural stepping) | 0.216 ± 0.057 | 200 ms rect. (reference) | 3.08 | toe tip 0.148–0.189; scaled CoPmax 0.158 | 0.37–0.47 | 1.339 | **0.28–0.35** |
| Rietdyk A-P pelvis mean (recovered) | 0.229 | 367 ms manual | 3.06 | toe tip 0.150–0.191 | 0.39–0.50 | 1.67 (rect.)–1.76 (sym.) | 0.22–0.30 (lower bound) |
| Rietdyk largest pelvis push (outcome not reported) | 0.328 | 367 ms | 3.06 | same | 0.56–0.72 | 1.67–1.76 | ≤0.32–0.43 |
| Robert F50 vs static limit 0.40 FL (0.102 m) | 0.359 | 150 ms | 3.125 | 0.102 | 1.12 | 1.253 | 0.90 (humans exceed the static limit dynamically) |

How the Crenshaw equivalent was derived [MODEL]: the belt's triangular velocity profile is a rectangular acceleration of +a for 0.2 s followed by −a for 0.2 s. Its discounted impulse per unit mass is (a/ω)(1 − e^(−0.2ω))². With a = 3.5 m/s² (last passing level, approximately) this gives 0.242 m/s; with a = 4.0 m/s² (typical failing level) 0.276 m/s. Per-subject means are in the table [E]. Recomputing τ from Crenshaw's per-subject table (both visits pooled) gives 272.9 ± 82.8 N·m, matching the reported 273.0 ± 82.3 [E]. That check validates the transcription.

**Reading the table:**
- The two "try not to step" datasets (Robert 150 ms; Crenshaw) give corrected fractions of **about 0.50–0.64**.
- Robert's long pulls give about 0.70, which equals e^(−ω·0.116 s) = 0.696, i.e. their measured Tr [E].
- Natural stepping (Emmens) occurs at about **0.3** of capacity.
- The fixture's 0.556 sits inside the "try not to step" band.

### 4.3 Pulse duration: model and evidence
- **Model.** For equal capacity, impulse grows with Tp by u/(1−e^(−u)), whatever the delay (§1.3). A 200 ms push carries about 25 % more impulse than a 50 ms push; a 350–370 ms push carries 53–57 % more [MODEL]. A longer pulse of equal impulse delivers its momentum later, so less of it compounds through the unstable dynamics before the delayed CoP response. **Yes, a longer pulse of equal impulse is easier to recover** [MODEL].
  - For a waist-pull **ramp**, the impulse centroid shifts later still, which raises the tolerable impulse further [MODEL].
  - Robert's force was a step to a plateau with unreported rise time [M]. Liu 2024 used a 1 s ramp held for 5 s [M]. Sturnieks 2013 used a 300 ms ramp within a 0.5 s pulse, in older adults [M].
- **Empirical (Robert, tested 150–3000 ms).**
  - The impulse at the F50 boundary rises from 0.359 m/s (150 ms) to 0.509 m/s (300 ms), a factor of 1.42, against the model's 1.23 [E].
  - In duration-corrected terms the 150 ms point (0.60) falls about 14 % below the 300–1000 ms plateau (0.69–0.70) [E].
  - So, in the only short-pulse evidence available, humans do worse at short pulses than the model with Tr = 116 ms predicts.
- **Extrapolation to 50 ms (human geometry).**
  - Group hyperbola: 56.4 % BW, i.e. Δv 0.277 m/s, **20.4 N·s at 73.9 kg** [E]. Per-subject hyperbolas: 0.277 ± 0.045 m/s (range 0.187–0.404), i.e. **20.5 ± 3.3 N·s (13.8–29.8)** [E].
  - Robert's exponential/LIP fit (k = 9.90 % BW, Appendix): 0.336 m/s, i.e. 24.8 N·s [E].
  - All of these are **extrapolations beyond 150 ms** and differ by about 20 % depending on the functional form.
- **Converting the earlier sources to 50 ms with the LIP factor** [E] (each in its own subjects' geometry):

| Source | Original | 50 ms equivalent | At 73.9 kg |
|---|---|---|---|
| Emmens | 0.216 m/s at 200 ms | 0.173 m/s | 12.8 N·s |
| Rietdyk mean (sub-threshold) | 0.229 m/s at 367 ms | 0.147 m/s | 10.8 N·s |
| Robert | 0.359 m/s at 150 ms | 0.309 m/s | 22.9 N·s (an upper estimate, given the short-pulse shortfall) |

### 4.4 Effective delay interpretation [E]
Tr_eff = −ln(corrected)/ω:

| Case | Tr_eff |
|---|---|
| Fixture | **187 ms** |
| Robert, 150 ms pulse | 164 ms |
| Robert, 300–1000 ms pulses | 112–118 ms |
| Crenshaw | 175–220 ms |

Measured human onset latencies are shorter:
- Robert CoP onset: 116 ± 20 ms [M].
- Rietdyk joint moment: 89 ± 3 ms (SE) [M].
- Robinovitch: 99 ± 13 ms [M].
- Zelei delay fits: 146–169 ms [M].

The gap reflects a finite rate of torque rise (Robinovitch: 372 ± 267 N·m/s [M]).

### 4.5 Sensitivity of the fixture expectation to d and l_COM [E]
Expected 50 ms threshold J = 73.9 · ω0 · d · 1.081 · f, with corrected fraction f = 0.50–0.70 (central 0.57):

| d (m) | l_COM 0.968 m (ω 3.18) | l_COM 0.99 m (ω 3.15) | l_COM 1.021 m (ω 3.10) |
|---|---|---|---|
| 0.090 | 11.4–16.0 (13.0) N·s | 11.3–15.8 (12.9) | 11.1–15.6 (12.7) |
| 0.103 | 13.1–18.3 (14.9) | 13.0–18.1 (14.8) | 12.8–17.9 (14.5) |
| 0.120 | 15.3–21.4 (17.4) | 15.1–21.1 (17.2) | 14.9–20.8 (16.9) |
| 0.150 | 19.1–26.7 (21.7) | 18.9–26.4 (21.5) | 18.6–26.0 (21.2) |

ω0 has only a weak effect (±1.5 %). The band is governed by d and by the human fraction f.

---

## 5. Task C: human standing geometry

### 5.1 Foot dimensions

| Quantity | Value | Source |
|---|---|---|
| Foot length / stature, men | 271 ± 14.7 mm at 1821 ± 80 mm, ratio 0.149 [M; ratio E]. Osteometric board, Martin no. 58 | Hora 2017 |
| Foot length / stature, pooled | 260 / 1751 = 0.1485 [E] | Hora 2017 |
| Foot length / stature, men | 26.1 ± 1.5 cm at 179.7 ± 7.2 cm, ratio 0.145 [M; ratio E] | Słomka 2020 |
| **Foot length for 1.76 m** | **255–262 mm** (individual SD about ±15 mm) [E] | |
| Medial malleolus → 1st MTP joint ("forefoot") | 13.9 ± 0.8 cm in men, i.e. 53 % of foot length [M; % E]. The table footnote defines forefoot to the 5th MTP while the text says 1st MTP, and the all-subject mean (13.8) is inconsistent with the sex means (12.4, 13.9) | Słomka 2020 |
| Big-toe length | 7.2 ± 0.8 cm in men [M] | Słomka 2020 |
| Heel → medial malleolus (horizontal) | 26.1 − 13.9 − 7.2 = 5.0 cm, i.e. 19 % of foot length [E] (assumes collinear segments). **No direct measurement accessed** | from Słomka |
| Heel → 1st MTP ("ball of foot length") | 181.6/249.3 = 72.8 % (3D scan); 71.7 % (caliper) [E]; Słomka men 72.4 % [E] | Lee 2014; Słomka |
| Medial malleolus → toe tip | about 81 % of foot length (13.9 + 7.2 cm) [E] | from Słomka |
| **For 1.76 m** | heel → ankle about 49–50 mm; ankle → 1st MTP about 137–140 mm; ankle → toe tip about 207–212 mm [E] | |

### 5.2 Quiet-stance COM/COP relative to the ankle
- **Schieppati 1994, via Mirando 2025:** "the distance between the internal malleolus and the anterior–posterior position of the CoP is on average less than 6 cm, corresponding to about 24 % of foot length" [SEC].
- **Le Mouel & Brette 2017, quoting Schieppati 1994:** COM "vertically aligned with the middle of the foot, a few centimeters forwards of the ankle" [SEC].
- **Leeuwis 2026 (n = 13, young):** mean preferred whole-body lean −0.03° to 2.54° with eyes open and 0.70° to 2.91° with eyes closed; 12/13 leaned forward [M]. Lean was computed as x_CoP = h_CoM·θ, with the reference point not confirmed in the text read. With h_CoM about 1.0 m this is −1 to 44 mm [E].
- **Słomka 2020:** quiet-stance COP relative to the medial malleolus is shown in Fig. 3; values were not extracted.
- **Working value: COM 3–6 cm anterior to the ankle** [E]. The SD of mean COP position was not accessed. Long-term mean COM ≈ mean COP in quiet stance [MODEL].

### 5.3 Anterior limit of stability (feet in place)

| Measure | Value | Source |
|---|---|---|
| Max A-P CoP range, young, sustained lean, eyes open | about 60 % of foot length (EC about 50 %) [M] | Schieppati 1994 (ABS) |
| Forward lean beyond normal stance | up to 40 % of foot length forward, 20 % backward [SEC] | Schieppati via Le Mouel 2017 |
| FBOS (< 60 y) | 0.60 ± 0.07 foot lengths; forward lean = 66 % of FBOS, i.e. about 0.40 FL ahead of normal stance [M; product E] | King 1994 (ABS) |
| Forward FBOS from the ankle, young | **65.3 ± 5.1 % FL**; backward −3.7 ± 5.0 %; total 69.0 ± 4.0 % [M]. Minus quiet COP (24 % FL) leaves 41 % FL [E] | Fujimoto 2013 |
| fBOS polygon (feet flat, own running shoes, hip width), young n = 38 | toe-edge inset 21 [10–36] % FL; heel inset 17 [9–29] %; length 65 [49–81] %; area 22 [9–36] % of footprint (median [range]) [M] | Sloot 2025 |
| Flat-foot voluntary limit | participants "were not able to cross" the line of the 1st MTP joints; with toe isometric flexion or heel raise they "easily crossed" it [M] | Słomka 2020 |
| Dynamic CoP reach (near-threshold forward pulls) | CoPmax 0.153 ± 0.018 m, toe rise observed [M] | Robert 2018 |
| Dynamic CoP excursion (sub-threshold A-P pelvis push) | primary COP 11.3 ± 0.2 cm (SE) [M] | Rietdyk Ch. 3 |
| Effective BoS after unexpected perturbation | about 30 % of static BoS area [M] | Hof & Curtze 2016 (ABS) |
| Toes | unilateral hallux non-contact reduced the forward LoS [M] | Tomita 2025 (ABS) |
| Shoes | no systematic shod vs barefoot fBOS difference (27 young in the prior study; 8 middle-aged + 3 older: 21.2 % vs 20.1 %) [M] | Sloot 2025 |
| Rigid-sole football boot | **no accessed evidence** (toe spring, stud layout and dynamic CoP reach unknown) | — |

Reported for older adults only: Holbein-Jenny 2007, Tomita 2021 (young FBoS area 47.2 ± 6.4 % of BoS [M]), Tanaka 1999 and Murray 1975 abstracts gave no usable young forward-limit numbers.

### 5.4 Quiet-stance joint angles; athletic ready stance
- **Wang 2014** (n = 10, 169.8 ± 10.7 cm, side-by-side shoulder-width stance, angles from markers):
  - knee 175.30° (180° = straight, so about 4.7° flexion [E]);
  - hip 151.79° (thigh vs trochanter–acromion line, **not** anatomical hip flexion);
  - ankle 105.27° (shank vs malleolus–5th metatarsal line).
  - The SDs (0.18–0.30°) are within-trial circular SDs, not between-subject [M].
- **During perturbation responses:** Rietdyk A-P pushes, knee flexion averaged 4.2° when present (64/100 trials > 0.5°) [M]. Koushyar, knee changes about 5° [M].
- **Whole-body forward lean** in preferred stance: about 0–2.5° (Leeuwis) [M].
- **Football or athletic "ready/defensive" stance:** no measured kinematics were found in Europe PMC searches (soccer/goalkeeper ready, set or preparatory position; athletic or defensive stance). Coaching descriptions were not collected. **This is a gap.**

### 5.5 Load split and pre-activation
- **Bilateral load split in parallel stance:** no numeric source accessed. Emmens required even loading and dismissed uneven trials [M]. van Mierlo 2023 reported 60.3 ± 4.2 % on the trailing leg in *staggered* stance, which is not applicable [M].
- **Soleus vs tibialis anterior:**
  - "Sol was tonically active during normal stance"; TA (and extensor digitorum brevis) active during backward leaning; flexor digitorum brevis active in forward leaning (Schieppati 1994) [M].
  - TA "on" was defined as > 2.5 % MVC; able-bodied quiet-stance co-contraction "lower than 30–40 % MVC" (Fok 2021). Group values appear only in figures and were not extracted [M].
  - TA highly active only in backward-leaning postures (Leeuwis 2026) [M].
  - Robert 2018 (their model): quiet ankle torque about 50 N·m (70 kg, 1 m COM, 4° lean), about 15–20 % of soleus contractile strength, citing Joseph & Nightingale 1952 and Morin & Portnoy 1956 [SEC].

### 5.6 Derived human reference for a 1.76 m adult [E]

| Distance from quiet-stance COM | Barefoot estimate | Basis |
|---|---|---|
| To toe tip | **145–185 mm** (central about 150–160) | 0.81 FL ankle→toe − (30–60 mm) |
| To 1st MTP head | **75–110 mm** | 0.53 FL − (30–60 mm) |
| To static voluntary forward limit | **100–105 mm** | 0.40 FL (King/Schieppati; Fujimoto 65.3 − 24 %) |
| To fBOS front edge (feet flat, shod) | about 80–90 mm | Sloot: (1 − 0.21) FL − COM position (0.44–0.49 FL from heel) |
| Dynamic CoP reach (toe rise allowed) | about 150–155 mm | Robert CoPmax scaled to 1.76 m |
| In a football boot | add the boot's toe allowance beyond the toes | not quantified in accessed sources |

---

## 6. Task D: conclusions

**(i) Is 16–23 N·s an appropriate target for the fixture? No.**
- It was assembled from:
  - a natural-stepping threshold (Emmens, about 0.3 of capacity);
  - sub-threshold, mixed-plane manual pushes (Rietdyk);
  - a single-subject curve extrapolated beyond the 150 ms tested minimum (Robert);
  - pulses of 150–370 ms, which by the LIP criterion tolerate 16–57 % more impulse than 50 ms.
- At the fixture's own geometry (d = 103 mm, ω ≈ 3.15), 16–23 N·s corresponds to 0.67–0.96 of the zero-delay limit (0.62–0.89 duration-corrected). The top of that range would need Tr_eff ≈ 40 ms, which no human achieves [E].
- The band does overlap the *human-geometry* 50 ms extrapolations (20.4–24.8 N·s; per-subject 13.8–29.8 N·s). Those apply to a COM-to-front distance of about 150 mm, not 103 mm.

**(ii) Best evidence-matched expectation for this fixture.**
- Duration-corrected fraction **0.50–0.70**, central about 0.57–0.60. The lower part comes from Robert 150 ms (0.60) and Crenshaw (0.50–0.58, range 0.42–0.62). The upper bound is Robert's long-pulse value (0.70). Robert's per-subject spread is about ±16 % (1 SD).
- For a 50 ms pulse at d = 103 mm this gives:
  - raw fraction **0.54–0.76**;
  - Δv **0.175–0.245 m/s**;
  - **J ≈ 13–18 N·s (central about 15 N·s)** [E].
- Scaling: **0.126–0.176 N·s per mm of d** (73.9 kg, ω = 3.15). If d is re-measured, rescale the band linearly.
- The observed 14.4 N·s (0.60 raw; 0.556 corrected) is **inside the band**, about 4–7 % below its centre. That is within human individual variability.
- [MODEL] The "Rietdyk-form" test (20 N·s over 350 ms) needs 0.48–0.51 duration-corrected on the fixture, below its implied 0.556 capacity, so recovery would be predicted with a small margin. That test's outcome was not supplied to me.

**(iii) Is about 103 mm COM-to-front plausible for a 1.76 m adult in quiet stance?**
- Expected values (§5.6):
  - about 145–185 mm to the barefoot toe tip, more to a boot toe;
  - 75–110 mm to the 1st metatarsal head;
  - 100–105 mm to the static voluntary limit;
  - about 150 mm dynamic CoP reach.
- 103 mm therefore matches a **functional/metatarsal-level** edge. It is **40–80 mm short** for an anatomical or boot toe edge.
- If 103 mm really is to the boot tip, the character either has its COM about 4–8 cm further forward relative to the foot than humans (humans: 3–6 cm ahead of the ankle), or a short ankle-to-toe length (human ankle → toe tip ≈ 0.81 FL ≈ 207–212 mm).
- The re-measurement should report ankle → boot-toe and COM → ankle separately.
- Because absolute capacity scales with d, the fixture's capacity relative to a human of equal control quality is about 103/150 ≈ 0.69 [E].

**(iv) Genuinely unknown.**
1. No study measured feet-in-place thresholds for **≤100 ms** pushes, or for pelvis pushes of any duration with stepping strictly prevented. Robert's shortest is 150 ms. The 50 ms value is model-dependent, ±20 %.
2. Forward thresholds in **athletes or footballers** and in boots or on studs: none found.
3. Robert: footwear, harness, force rise time and the CoPmax reference point were not reported; only the HAL accepted manuscript was read.
4. Emmens: the delivered (not reference) impulse; per-subject thresholds; footwear.
5. Rietdyk A-P: the number of stepping trials and the outcome of the largest pushes; arm posture; exact push height.
6. The effect of arms free vs crossed, of the 0.42 m stance, and of the counting task on forward thresholds: not quantified in accessed sources.
7. Directly measured heel-to-malleolus distance and the between-subject SD of quiet-stance COM–ankle distance (only [SEC] or derived values here).
8. Whether the fixture's rigid boot permits heel rise or toe pivoting equivalent to human toe rise (which supplied Robert's 15.3 cm CoP reach).
9. Measured football "ready stance" knee, hip and trunk angles; quiet-stance bilateral load split; quantitative soleus/TA %MVC (figures only).
10. Lean-angle definitions in Robinovitch 2002 and Mackey & Robinovitch 2006 (abstract only). Their static limit of 14.9° cannot be reconciled with plausible foot geometry without the full text. Koushyar quotes young/older women limits of 16.3°/13.1° [SEC], which match the 19.6 % "static" difference, not the 36.1 % dynamic one [E].

---

## 7. Search notes
- **Tools used:** Europe PMC REST (core results and fullTextXML), NCBI E-utilities (PMC), OpenAlex (OA locations), HAL (Robert manuscript), Library and Archives Canada (Rietdyk thesis PDF).
- **Not accessible:** publisher pages for J Neurophysiol and ScienceDirect returned HTTP 403. The web-search tool quota was exhausted early in the session, so searching relied on Europe PMC and OpenAlex queries ("feet-in-place", "without stepping", "stepping threshold", "stepping boundary", "lean release" + "ankle strategy", "maximum recoverable lean", waist-pull thresholds, functional base of support, limits of stability).

---

## 8. References (access code in brackets)

1. Emmens AR, van Asseldonk EHF, Prinsen V, van der Kooij H (2020). Predicting reactive stepping in response to perturbations by using a classification approach. *J Neuroeng Rehabil* 17:84. doi:10.1186/s12984-020-00709-y. PMID 32616066. **[FT]**
2. Robert T, Vallée P, Tisserand R, Buloup F, Bariatinsky D, Vercher JL, Fitzpatrick RC, Mille ML (2018). Stepping boundary of external force-controlled perturbations of varying durations: comparison of experimental data and model simulations. *J Biomech* 75:89–95. doi:10.1016/j.jbiomech.2018.05.010. PMID 29793765. **[FT: HAL accepted manuscript hal-01794074]**
3. Liu Y, Sun R, Zou K, Li Y, Xu P (2024). Torque-ratio-adjustable ankle-foot exoskeleton for resisting perturbation in forward direction within fan-shaped region of pelvis horizontal plane. *Front Bioeng Biotechnol* 12:1429605. doi:10.3389/fbioe.2024.1429605. PMID 39161355. **[FT]**
4. Rietdyk S (1999). *Postural responses to unexpected multi-directional upper body perturbations.* PhD thesis, University of Waterloo (NLC ISBN 0-612-44780-4). **[FT]**
5. Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE (1999). Balance recovery from medio-lateral perturbations of the upper body during standing. *J Biomech* 32:1149–1158. doi:10.1016/s0021-9290(99)00116-5. PMID 10541064. **[ABS; same study as thesis Ch. 2, read FT]**
6. Crenshaw JR, Kaufman KR (2014). The intra-rater reliability and agreement of compensatory stepping thresholds of healthy subjects. *Gait Posture* 39:810–815. doi:10.1016/j.gaitpost.2013.11.006. PMID 24300837. **[FT: PMC3910088]**
7. Koushyar H, Bieryla KA, Nussbaum MA, Madigan ML (2019). Age-related strength loss affects non-stepping balance recovery. *PLoS One* 14:e0210049. doi:10.1371/journal.pone.0210049. PMID 30657760. **[FT]**
8. Fujimoto M, Hsu WL, Woollacott MH, Chou LS (2013). Ankle dorsiflexor strength relates to the ability to restore balance during a backward support surface translation. *Gait Posture* 38:812–817. doi:10.1016/j.gaitpost.2013.03.026. PMID 23602447. **[FT: PMC3735801]**
9. Robinovitch SN, Heller B, Lui A, Cortez J (2002). Effect of strength and speed of torque development on balance recovery with the ankle strategy. *J Neurophysiol* 88:613–620. doi:10.1152/jn.2002.88.2.613. PMID 12163514. **[ABS]**
10. Mackey DC, Robinovitch SN (2006). Mechanisms underlying age-related differences in ability to recover balance with the ankle strategy. *Gait Posture* 23:59–68. doi:10.1016/j.gaitpost.2004.11.009. PMID 16311196. **[ABS; angles SEC via ref. 7]**
11. Mille ML, Rogers MW, Martinez K, Hedman LD, Johnson ME, Lord SR, Fitzpatrick RC (2003). Thresholds for inducing protective stepping responses to external perturbations of human standing. *J Neurophysiol* 90:666–674. doi:10.1152/jn.00974.2002. PMID 12711707. **[ABS]**
12. Pai YC, Rogers MW, Patton J, Cain TD, Hanke TA (1998). Static versus dynamic predictions of protective stepping following waist-pull perturbations in young and older adults. *J Biomech* 31:1111–1118. doi:10.1016/s0021-9290(98)00124-9. PMID 9882043. **[ABS]**
13. Pai YC, Patton J (1997). Center of mass velocity-position predictions for balance control. *J Biomech* 30:347–354. doi:10.1016/s0021-9290(96)00165-0. PMID 9075002. **[ABS]** (feasible-region upper boundary about 0.45 body heights/s over the heel, reaching 0 at the toe [M])
14. Verniba D, Gage WH (2019). Stepping threshold with platform-translation and shoulder-pull postural perturbation methods. *J Biomech* 94:224–229. doi:10.1016/j.jbiomech.2019.07.027. PMID 31395277. **[ABS]**
15. Zhu RT, Lyu PZ, Li S, Tong CY, Ling YT, Ma CZ (2022). How does lower limb respond to unexpected balance perturbations? New insights from synchronized human kinetics, kinematics, muscle EMG and MMG data. *Biosensors* 12:430. doi:10.3390/bios12060430. PMID 35735577. **[FT]**
16. Kim S, Horak FB, Carlson-Kuhta P, Park S (2009). Postural feedback scaling deficits in Parkinson's disease. *J Neurophysiol* 102:2910–2920. doi:10.1152/jn.00206.2009. PMID 19741108. **[ABS]**
17. Zelei A, Milton J, Stepan G, Insperger T (2021). Response to perturbation during quiet standing resembles delayed state feedback optimized for performance and robustness. *Sci Rep* 11:11392. doi:10.1038/s41598-021-90305-4. PMID 34059718. **[FT]**
18. McIlroy WE, Maki BE (1993). Task constraints on foot movement and the incidence of compensatory stepping following perturbation of upright stance. *Brain Res* 616:30–38. doi:10.1016/0006-8993(93)90188-s. PMID 8358619. **[ABS]**
19. Hof AL, Curtze C (2016). A stricter condition for standing balance after unexpected perturbations. *J Biomech* 49:580–585. doi:10.1016/j.jbiomech.2016.01.021. PMID 26892898. **[ABS]**
20. Do MC, Brenière Y, Brenguier P (1982). A biomechanical study of balance recovery during the fall forward. *J Biomech* 15:933–939. doi:10.1016/0021-9290(82)90011-2. PMID 7166553. **[ABS]**
21. Hsiao-Wecksler ET (2008). Biomechanical and age-related differences in balance recovery using the tether-release method. *J Electromyogr Kinesiol* 18:179–187. doi:10.1016/j.jelekin.2007.06.007. PMID 17681793. **[ABS]**
22. Sturnieks DL, Menant J, Delbaere K, Vanrenterghem J, Rogers MW, Fitzpatrick RC, Lord SR (2013). Force-controlled balance perturbations associated with falls in older people: a prospective cohort study. *PLoS One* 8:e70981. doi:10.1371/journal.pone.0070981. PMID 23951059. **[FT, methods read]**
23. Sturnieks DL, Menant J, Vanrenterghem J, Delbaere K, Fitzpatrick RC, Lord SR (2012). Sensorimotor and neuropsychological correlates of force perturbations that induce stepping in older adults. *Gait Posture* 36:356–360. doi:10.1016/j.gaitpost.2012.03.007. **[SEC via ref. 2; not accessed]**
24. van Mierlo M, Ormiston JA, Vlutters M, van Asseldonk EHF, van der Kooij H (2023). Pelvis perturbations in various directions while standing in staggered stance elicit concurrent responses in both the sagittal and frontal plane. *PLoS One* 18:e0272245. doi:10.1371/journal.pone.0272245. PMID 37043457. **[FT, methods read]**
25. Sloot LH, Gerhardy T, Mombaur K, Millard M (2025). The size of the functional base of support decreases with age. *Sci Rep* 15:37351. doi:10.1038/s41598-025-22630-x. PMID 41145821. **[FT]**
26. King MB, Judge JO, Wolfson L (1994). Functional base of support decreases with age. *J Gerontol* 49:M258–M263. doi:10.1093/geronj/49.6.m258. PMID 7963278. **[ABS]**
27. Schieppati M, Hugon M, Grasso M, Nardone A, Galante M (1994). The limits of equilibrium in young and elderly normal subjects and in parkinsonians. *Electroencephalogr Clin Neurophysiol* 93:286–298. doi:10.1016/0168-5597(94)90031-0. PMID 7521289. **[ABS; further values SEC via refs 34–35]**
28. Słomka KJ, Michalska J, Marszałek W, Bacik B, Juras G (2020). Forward functional stability indicator (FFSI) as a reliable measure of limits of stability. *MethodsX* 7:10–16. doi:10.1016/j.mex.2019.11.029. PMID 31890643. **[FT]**
29. Tomita H, Kuno S, Kawaguchi D, Nojima O (2021). Limits of stability and functional base of support while standing in community-dwelling older adults. *J Mot Behav* 53:83–91. doi:10.1080/00222895.2020.1723484. PMID 32028861. **[ABS]**
30. Tomita H, Tsukeshiba M, Matsukura Y, Kikunaga Y, Nakata K, Nojima O, Ogawa Y, Asai H (2025). Noncontact of the unilateral hallux with the ground reduces forward limits of stability while standing. *J Phys Ther Sci* 37:21–27. doi:10.1589/jpts.37.21. PMID 39764301. **[ABS]**
31. Hora M, Soumar L, Pontzer H, Sládek V (2017). Body size and lower limb posture during walking in humans. *PLoS One* 12:e0172112. doi:10.1371/journal.pone.0172112. PMID 28192522. **[FT]**
32. Lee YC, Lin G, Wang MJ (2014). Comparing 3D foot scanning with conventional measurement methods. *J Foot Ankle Res* 7:44. doi:10.1186/s13047-014-0044-7. PMID 25364389. **[FT]**
33. Wang Z, Ko JH, Challis JH, Newell KM (2014). The degrees of freedom problem in human standing posture: collective and component dynamics. *PLoS One* 9:e85414. doi:10.1371/journal.pone.0085414. PMID 24427307. **[FT]**
34. Mirando M, Pavese C, Pingue V, Sozzi S, Nardone A (2025). Can plantar pressure distribution during gait be estimated from quiet stance in healthy individuals? *J Funct Morphol Kinesiol* 10:301. doi:10.3390/jfmk10030301. PMID 40843833. **[FT]**
35. Le Mouel C, Brette R (2017). Mobility as the purpose of postural control. *Front Comput Neurosci* 11:67. doi:10.3389/fncom.2017.00067. PMID 28798679. **[FT]**
36. Leeuwis M, van Aerts N, Seth A, Forbes PA (2026). The energetic cost of human standing balance and gait initiation over a range of natural postures. *PLoS Comput Biol* 22:e1013522. doi:10.1371/journal.pcbi.1013522. PMID 42412861. **[FT]**
37. Fok KL, Lee JW, Unger J, Chan K, Musselman KE, Masani K (2021). Co-contraction of ankle muscle activity during quiet standing in individuals with incomplete spinal cord injury is associated with postural instability. *Sci Rep* 11:19599. doi:10.1038/s41598-021-99151-w. PMID 34599267. **[FT]**
38. Duarte M, Zatsiorsky VM (2002). Effects of body lean and visual information on the equilibrium maintenance during stance. *Exp Brain Res* 146:60–69. doi:10.1007/s00221-002-1154-1. PMID 12192579. **[ABS; no limit values in abstract]**
39. Holbein-Jenny MA, McDermott K, Shaw C, Demchak J (2007). Validity of functional stability limits as a measure of balance in adults aged 23–73 years. *Ergonomics* 50:631–646. doi:10.1080/00140130601154814. PMID 17454084. **[ABS; no values in abstract]**
40. Tanaka T, Takeda H, Izumi T, Ino S, Ifukube T (1999). Effects on the location of the centre of gravity and the foot pressure contribution to standing balance associated with ageing. *Ergonomics* 42:997–1010. doi:10.1080/001401399185261. PMID 10424187. **[ABS; no values in abstract]**
41. Murray MP, Seireg AA, Sepic SB (1975). Normal postural stability and steadiness: quantitative assessment. *J Bone Joint Surg Am* 57:510–516. doi:10.2106/00004623-197557040-00012. PMID 1141262. **[ABS; no values in abstract]**
42. Joseph J, Nightingale A (1952). Electromyography of muscles of posture: leg muscles in males. *J Physiol* 117:484–491. doi:10.1113/jphysiol.1952.sp004762. PMID 12991235. **[SEC via ref. 2]**

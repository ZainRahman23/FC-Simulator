# Standing tone: joint-specific tonic activation in quiet and ready stance

PPR-3 research note, 12 Oct 2026. It answers the PPR-2 gap: no verified % MVC values for the thigh, hip or trunk in quiet stance (`ppr2/research/STANDING_SUBSTRATE_LITERATURE.md` §9(d)4; `PPR2_REPORT.md` §4).

**Scope.** What tonic (pre-disturbance) activation humans actually show, per joint axis and side. It covers relaxed quiet standing and, where any data exist, a slightly crouched footballer's "ready" stance. Values are **not** chosen to make the V2 body stand. Where the literature is silent, this note says so and gives a low / mid / high sensitivity range with reasons.

---

## 0. Conventions

**Value labels.**
- **[M]** measured in humans (mean ± SD unless stated).
- **[E]** inferred from biomechanics, interpolation or extrapolation. The arithmetic is shown.
- **[MODEL]** a conversion that depends on a modelling assumption (EMG to activation, or the V2 stiffness law).
- **[D]** design suggestion. Not a measurement.

**Access levels.**
- **FT**: full text read (Europe PMC XML or publisher PDF).
- **FT-s**: full text read through a summarising fetch tool, with targeted verbatim checks.
- **ABS**: abstract only.
- **FIG**: value read by eye from a figure (approximate).
- **SEC**: quoted by another paper; original not seen.

These numbers were re-checked against the primary text while this note was written: Potter & Kirby 1991 (abstract), Itoh 2018 Table 1, Fujitani 2017 Table 2, Zaback 2021 Table 3, Cholewicki 1997 (abstract) and Brown & McGill 2008/2009 (abstracts).

**Units.**
- "% MVC" = EMG amplitude as a percentage of the EMG in a maximal voluntary (isometric) contraction. It is surface EMG unless stated.
- V2's activation a± is a fraction of maximal isometric capacity, so 5 % MVC ≈ a = 0.05 only if EMG is linear in force (§5).

**V2 reference values.** The PPR-2 candidate S\* has tone u± = (rest statics)/capIso + 0.02. Its values below come from `ppr2/evidence/PPR2_DIAG_RESERVE_SSTAR.json`. They are listed only for comparison.

---

## 1. Bottom line

1. **Ankle: S\* is already human-like.**
   - Soleus runs 7–8 % MVC in young adults standing quietly (Mitsutake 2022 [M]). Okada & Fujiwara 1984 give 2–6 % for the COP range of normal stance [M].
   - Tibialis anterior is near-silent, ≈1 % MVC [M, four studies].
   - S\* has plantar flexors at 0.10 and dorsiflexors at 0.02.
2. **Knee: the best direct evidence says a 14° crouch needs real quadriceps tone.**
   - Bilateral standing with the knees held flexed: vastus lateralis **7.6 ± 5.6 % MVC at 10°** and **10.9 ± 7.6 % at 20°** [M], against 0.3 ± 0.2 % with straight knees (Potter & Kirby 1991, n = 10).
   - Interpolated to 14°: ≈8.5–8.9 % [E].
   - S\* has both knee sides at 0.02–0.03.
3. **Hip flexion/extension: tone is low in humans too.**
   - Hip flexors (iliopsoas surface site, TFL, sartorius, rectus femoris) run ≈1.5–4 % MVC in quiet standing [M]. Extensors (gluteus maximus, hamstrings) run ≈1–4 % [M].
   - Nothing in the literature supports a hip-flexor tone much above ≈4 % in a ready stance.
   - **Raising hip-flexor tone to make the hip hold is therefore not evidence-based above ≈4–5 %.** §8 lists what else could supply the missing hip stiffness (Kiemel 2008: 95–147 N·m/rad for both hips).
4. **Hip abduction: S\*'s 0.32 is ≈5–15 × the human value.**
   - Gluteus medius runs 3.6 ± 1.5 % MVC with heels 20 cm apart [M].
   - The frontal-plane hip moment in a wide double stance is statically indeterminate, because it depends on the shear force between the feet [E, §3.3]. S\*'s value follows from a modelling choice, not from human data.
5. **Lumbar lateral bending: human evidence points well above 2 % per side.**
   - The lateral benders are the same muscles that are tonically active in standing: erector spinae 2–5.5 %, multifidus 3–7 %, external oblique 3–9 %, internal oblique 6–10 % [M]. A per-side lateral tone of ≈3–8 % is therefore inferred [E].
   - Measured intrinsic trunk stiffness is **at least as high in lateral bending as in flexion** (Brown & McGill 2009 [M]; Cholewicki 2000 [M]). S\* is ≈7 × lower laterally than in flexion.
6. **Trunk flexors: S\*'s 2 % matches measurement.**
   - Measured antagonist flexor–extensor co-activation around the neutral spine posture, during slow trunk flexion–extension, is **1.7 ± 0.8 % MVC** (Cholewicki, Panjabi & Khachatryan 1997, n = 10 [M]).
7. **Threat and readiness change leg tone only modestly.**
   - On first exposure to height threat, tibialis anterior rises by **+5.8 ± 4.8 % MVC** and soleus–TA co-activation by +2.5 ± 2.0 % MVC [M]. Soleus does not change.
   - A known perturbation time adds only ≈8–15 % relative EMG in the leg [M]. Warning does not raise trunk pre-activation [M].
   - **No study reports static ready-stance EMG in footballers or other athletes.**
8. **EMG % MVC is a defensible first estimate of a, with known biases in both directions.** These are EMG–force curvature (EMG under-reads force in large muscles), submaximal MVCs (over-read), and crosstalk and noise near 1 % (over-read) (§5).

---

## 2. Summary table: baseline activation per joint axis and side (% MVC ≈ 100·a)

How to read the table:
- "Mid" is the suggested single value if one is required.
- Ranges are the plausible human range, not ±SD.
- "Ready" is the footballer's crouch (knee 14°, hip 7°, ankle 10° dorsiflexion, 42 cm stance, COM 6 cm ahead of the ankles) **without** extra threat. Threat or anticipation increments are listed separately in §6.

| Axis | Side (muscles) | (a) Relaxed quiet stance | (b) Ready stance | Label | Key sources | S\* now |
|---|---|---|---|---|---|---|
| Ankle sagittal | Plantar flexors (soleus ≫ medial gastrocnemius; lateral gastrocnemius ≈ 0) | **5–10**, mid 7 | **5–10**, mid 7 | [M]; (b) [E] | Mitsutake 2022; Okada & Fujiwara 1984; Itoh 2018; Baudry 2012; Héroux 2014 | 0.10 |
| | Dorsiflexors (tibialis anterior) | **0.5–2**, mid 1 | **0.5–2**, mid 1 | [M] | Papegaaij 2016; Mitsutake 2022; Itoh 2018; Wuehr 2014 | 0.02 |
| Ankle frontal | Evertors (peroneus longus) | **2–8**, mid 4 | same | [M] one study; (b) [E] | Itoh 2018 | 0.02 |
| | Invertors (tibialis posterior, TA) | **gap**: 1 / 2 / 5 | same | TA [M] 1–2; tibialis posterior [D] | — | 0.15–0.19 |
| Knee sagittal | Extensors (vasti, rectus femoris) | **0.3–3**, mid 1.5 | **6–11**, mid 8.5 | (a) [M]; (b) [E from M] | Potter & Kirby 1991; Mitsutake 2022; Itoh 2018; Okada 1972 | ≈0.02–0.03 |
| | Flexors (hamstrings; gastrocnemius also flexes the knee) | **1–5**, mid 2.5 | **1–6**, mid 3 | [M]; (b) [M sparse/E] | Itoh 2018; Mitsutake 2022; Okada 1972 | ≈0.02–0.03 |
| Knee axial | Internal / external rotators | **gap**: 1 / 3 / 6 | same | [D] | — | 0.17–0.18 one side, 0.02 other |
| Hip sagittal | Extensors (gluteus maximus, hamstrings) | **1–4**, mid 2.5 | **3–8**, mid 5 | (a) [M]; (b) [M sparse/E] | Chan 2025; Okada 1972; Fujitani 2017; Itoh 2018; Snijders 1995 | 0.10 |
| | Flexors (iliopsoas, rectus femoris, TFL, sartorius) | **1.5–4**, mid 3 | **1.5–4**, mid 3 | [M]; (b) [M/E] | Fujitani 2017; Mitsutake 2022; Itoh 2018 | 0.02 |
| Hip frontal | Abductors (gluteus medius, TFL, upper gluteus maximus) | **2–6**, mid 3.5 | **gap at 42 cm**: 2 / 4 / 8 | (a) [M]; (b) [D] | Itoh 2018; Fujitani 2017; ceiling 18 in single-leg stance (Murofushi 2024) | **0.32–0.33** |
| | Adductors | **gap**: 1 / 3 / 6 | same | [D]; single-leg stance 2.0–4.9 [M] | Murofushi 2024 | 0.02 |
| Hip axial | Rotators, each direction | **gap**: 1 / 3 / 6 | same | [D] | — | 0.02–0.05 |
| Lumbar sagittal | Extensors (erector spinae, multifidus) | **2–7**, mid 4.5 | **4–12**, mid 7 (rises with trunk inclination) | [M] | Fujitani 2017; Park 2015; Okada 1972; Abbasi 2025 | 0.12 |
| | Flexors (rectus abdominis, obliques' flexor share) | **1.5–5**, mid 2.5 | **1.5–5**, mid 2.5 | [M]; (b) [E] | Cholewicki 1997; Fujitani 2017; Park 2015 | 0.02 |
| Lumbar lateral | Each side (quadratus lumborum, erector spinae/multifidus, external/internal oblique) | **2 / 4.5 / 8** | **3 / 6 / 10** | [E] | §4.2 | **0.02** |
| Lumbar axial | Each side (obliques, multifidus) | **2 / 4 / 8** | same | [E] | §4.2 | 0.02 |
| Thoracic sagittal | Extensors (thoracic erector spinae) | **2–5**, mid 3.5 | **3–9**, mid 5 | [M] | Fujitani 2017; Abbasi 2025 | 0.086 |
| | Flexors | as lumbar | as lumbar | [E] | — | 0.02 |
| Thoracic lateral / axial | Each side | as lumbar | as lumbar | [E] | — | 0.02 |
| Neck sagittal | Extensors (cervical erector spinae; upper trapezius 7.2) | **2–7**, mid 5 | same | [M] weak | Chen 2025; Yim 2020 | 0.053 |
| | Flexors (sternocleidomastoid) | **gap**: 1 / 2 / 4 | same | [D] | — | 0.02 |
| Neck lateral / axial | Each side | **gap**: 2 / 4 / 6 | same | [D] | Upper trapezius nonzero (Chen 2025) | 0.02 |

**Where S\* falls outside the human range:**
- **Below:** knee extensors in the ready stance (≈3–4 × low), lumbar and thoracic lateral bending and axial rotation (≈2–4 × low, [E]), and possibly hip flexors (slightly low).
- **Above:** hip abductors (≈5–15 ×) and ankle invertors (≈8–19 × the TA level; tibialis posterior unmeasured). Both come from statics with an assumed inter-foot shear (§3.3).
- **Inside:** ankle sagittal, hip extensors, lumbar extensors, lumbar flexors and neck extensors.

---

## 3. Lower limb

### 3.1 Ankle

**Plantar flexors.**

| Source | n, subjects | Posture | Normalisation | Values (% MVC) | Access |
|---|---|---|---|---|---|
| Mitsutake 2022 | 17 (6 M), 21.7 ± 2.3 y | Feet together, eyes open, firm | MVC by manual resistance | Soleus **7.11 ± 3.39 / 8.43 ± 3.47** (two baseline days); EC 7.11 ± 3.20; foam EC 11.28 ± 3.85 | FT |
| Okada & Fujiwara 1984 | 10 M PE students, 18–24 y | Feet together, COP held at targets | Isometric MVC (gastrocnemius long-sitting) | "2-3 % MVC to 5-6 % MVC … in the soleus of every subject" in the natural balance area; at the forward limit soleus 19.5 ± 3.1, MG 22.0 ± 4.2, LG 5.2 ± 3.0 | FT |
| Itoh 2018 | 11 M, 26 ± 5 y | Heels 20 cm apart, floor | MVC, posture not described | MG **6.0 (4.4)**; soleus not recorded | FT |
| Baudry & Duchateau 2012 | young n = 5 per table row (mostly F) | Self-selected; mean of rigid/foam × EO/EC | Seated MVC, knee extended | Soleus 11.8 ± 6.8, MG 10.3 ± 6.2, LG 10.4 ± 5.4, TA 3.1 ± 1.9 (includes foam, so an upper estimate) | FT-s |
| Okada 1972 | 5 M, 20–27 y | Natural upright | Integrated EMG / MVC at three lengths | Soleus ≈13–22 (range, FIG). The author says triceps surae MVCs were probably submaximal, so values "should be reduced" | FT, FIG |
| Héroux 2014 | 7, intramuscular | Quiet stance | Motor units | Soleus units active ≈100 % of the time; MG intermittent (median ≈74 %); "little to no LG MU activity" | ABS + FT-s |

- **Torque cross-check [E]** (PPR-1 §8.1): ≈17 N·m per leg against an MVC of ≈122 N·m gives 8–14 % MVC torque.
- **Placing this stance in Okada & Fujiwara's table [E]:**
  - Assume (not from the paper) a foot of 26–27 cm with the ankle axis 5–6 cm in front of the heel. The COM 6 cm ahead of the ankle then puts the COP at ≈42–45 % of foot length.
  - Interpolating Table 1/2 gives soleus ≈4–5 %, LG ≈0–2 % and TA ≈0.
- **Ready stance:**
  - Okada's moderate half-rise lowered soleus to "5 % or below", with gastrocnemius 2–3 %.
  - Adding forward trunk bend "recovered" soleus to the upright level and pushed gastrocnemius to ≥10 % [M, FT].
  - So 5–10 % stays the range [E].

**Dorsiflexors and peronei.**
- Tibialis anterior is near silent:
  - "0.8 … % of MVC" in young adults (Papegaaij 2016, n = 20; FT)
  - 1.01 ± 0.39 (Mitsutake)
  - 1.8 (1.1) (Itoh)
  - 0.9 ± 0.6 (Wuehr 2014, middle-aged, laboratory floor; FT).
- In Okada & Fujiwara, TA was active in the natural range in only 1 of 10 subjects.
- Peroneus longus: 5.3 (4.8) % MVC (Itoh) [M, single study].

**Invertors.** No tibialis posterior data were found. The 1 / 2 / 5 % range is [D]: the low end is TA's level, the high end is the peroneal level.

### 3.2 Knee, including the effect of knee angle

**Near-straight knees (relaxed quiet stance).**
- Vastus lateralis 0.3 ± 0.2 % at 0° (Potter & Kirby 1991).
- Rectus femoris 1.45 ± 1.77 and 1.28 ± 1.48 (Mitsutake); 2.6 (1.9) (Itoh); 3.3 ± 3.4 (Fujitani 2017).
- Okada 1972: quadriceps "almost negligible" except in one subject "who had a peculiar habit of keeping these muscles unrelaxed" (FT).
- Quadriceps + hamstrings averaged:
  - Tikkanen 2013 (EMG shorts, n = 84, 44 ± 17 y): 0.9 × standing EMG = 2.5 ± 1.7 % MVC, so standing ≈2.8 % [E: 2.5/0.9]. FT.
  - Pesola 2016: 1.4 ± 1.4 % (normal weight, n = 57). ABS.
- **Flexors:** biceps femoris 4.2 (4.4) (Itoh); "active at the 5 % level" (Okada); semitendinosus 0.95 ± 0.90 (Mitsutake), ≈0–1 (Okada, FIG).

**Static flexed-knee standing (the key data for the ready stance).** Potter & Kirby 1991 (ABS, verified):
- n = 10 normal subjects, bilateral standing, knees held flexed by a line from waist to each sole, surface VL.
- VL % MVC: **0°: 0.3 ± 0.2; 10°: 7.6 ± 5.6; 20°: 10.9 ± 7.6; 30°: 16.6 ± 12.4; 40°: 24.0 ± 14.0**.
- Linear fit: y = 0.62 + 0.56·x (r² = 0.986).
- At 14° [E]: fit 0.62 + 0.56 × 14 = **8.5 %**; linear between the 10° and 20° points, 7.6 + 0.4 × 3.3 = **8.9 %**.
- Caveats: sex, age and MVC method are not in the abstract. The hip and ankle were free.

Supporting:
- **Okada 1972, moderate half-rise** (knee angle not measured, visibly more than 14°): "In the quadriceps activities above 15 % developed even in moderate [half-rise] and increased up to 30 % or above with the knees flexed further" (FT). Fig 8A ranges: RF ≈2–22, VM ≈1–17, VL ≈3–14 [FIG]. Biceps femoris read high but is suspected VL crosstalk; semitendinosus stayed ≈0–1.
- **Perry, Antonelli & Ford 1975** (cadaver, ABS): the quadriceps force needed equals "20 per cent of average maximum quadriceps strength at 15 degrees and … 50 per cent at 30 degrees". This is single-limb loading through the femoral head with no trunk compensation, so it is an upper bound, not EMG.
- **Hsu 1993** (single-limb stance, intramuscular, ABS): EMG rises slowly below 30° and faster above; no numbers available.
- **Ohkoshi 1991** (ABS, qualitative): in bilateral standing at 30–60° knee flexion, hamstring EMG rises with trunk flexion, with quadriceps–hamstring co-contraction in all conditions.

**Why humans show ≈8 % vasti at 14° when V2's static knee moment is ≈1 N·m [E].** Two non-exclusive explanations:
1. **Different alignment.** Humans in such stances may carry the COM line further behind the knee than V2's rest pose.
   - A simple estimate: shank 0.43 m inclined 10° puts the knee ≈7.5 cm ahead of the ankle. With the COM 6 cm ahead, it is ≈1.5 cm behind the knee.
   - That gives ≈320 N × 0.015 m ≈ 5 N·m extensor demand per knee, already ≈4 × V2's 1.0–1.3 N·m. V2's segment geometry was not checked here.
2. **Co-contraction against biarticular flexors.** Gastrocnemius flexes the knee.
   - Assume gastrocnemius supplies ≈30 % of a 17–21 N·m plantar-flexor moment, with moment arms of 5 cm at the ankle and 2–3 cm at the knee.
   - Then its knee-flexion moment is ≈2–4 N·m per leg, which the quadriceps must cancel.
   - This explains only part of 8 %. With a quadriceps MVC of ≈150–250 N·m at 14° (assumed, not verified), 2–4 N·m is ≈1–3 % MVC.

Either way, the measured human quadriceps tone at 10–20° is 7.6–10.9 % MVC. That is the honest target for the ready stance's knee-extensor side. V2's knee "statics + 0.02" gives 0.02–0.03.

### 3.3 Hip

**Sagittal, relaxed.**
- **Gluteus maximus:**
  - 1.22–2.59 % MVC across 0–9° inclines in controls; 2.09 % on level ground (Chan 2025, n = 9; FT, no SD in text).
  - ≈0–1 % (Okada 1972, FIG).
  - Fujitani 2017 (n = 17 M; FT, verified): upper fibres 7.2 ± 5.6, lower fibres 3.9 ± 3.6. The upper fibres are partly abductors.
  - Snijders 1995 (n = 6, ABS): gluteus maximus and biceps femoris "showed practically no activity in unconstrained erect posture".
- **Flexors** (Fujitani 2017, neutral standing): iliopsoas (surface site, doubtful) **4.0 ± 2.2**, TFL **3.7 ± 2.2**, sartorius 2.5 ± 2.3, rectus femoris 3.3 ± 3.4. Also rectus femoris 1.3–2.6 (Mitsutake; Itoh).
- No intramuscular psoas value for quiet standing was verified. Andersson 1995 and Juker 1998 are abstract-only.

**Sagittal, ready stance (hip flexed 7°, trunk slightly forward).**
- Okada 1972 half-rise with forward bending: gluteus maximus and semitendinosus ≈5 % (FT).
- Fujitani 2017's "lordosis" posture (anterior pelvic tilt, trunk lean +3.7 ± 3.6°): extensors *fall* (lower gluteus maximus 1.8 ± 1.4); flexors 1.6–3.6 (iliopsoas 3.6 ± 1.2, TFL 2.1 ± 2.1, rectus femoris 1.6 ± 2.6).
- Leeuwis 2026 (FT, values in figure only): hip extensors rise with forward lean.
- So extensors 3–8 % and **flexors stay at 1.5–4 %** [M/E]. **No source supports high hip-flexor tone in a forward-inclined stance.**

**Frontal.**
- Gluteus medius **3.6 (1.5)** % MVC with heels 20 cm apart (Itoh 2018) [M]. TFL 3.7 ± 2.2 (Fujitani).
- Single-leg stance, the maximal static frontal load (Murofushi 2024, n = 13 M, medians with IQR; FT): gluteus medius 18.3 (13.4) support side / 2.6 (2.1) other side; adductors 2.0 / 4.9.
- **No study of stance-width effects on abductor or adductor % MVC in quiet standing was found.** Day 1993 and Winter 1996 are kinetic studies, Kirker 2000 reports latencies, and Benjuya 2004 is paywalled.

**Frontal statics in a wide stance are a modelling choice [E].**
- Geometry for each leg (assumed): foot 21 cm lateral of the midline, hip centre 9 cm lateral at 0.88 m height, COM at 0.98 m, half body weight 362 N, leg 16.1 % of body mass with its COM at (0.15 m, 0.42 m).
- External frontal moment about the hip:
  - With **no inter-foot shear** (vertical GRF): +43.5 N·m (GRF) − 7.0 N·m (leg weight) = **+36 N·m abducting**. Hip *adductors* are needed.
  - With each foot's GRF **aimed at the whole-body COM** (inward shear 362 × 0.21/0.98 = 78 N, the "inward pair" in PPR-2): −24.9 − 7.0 = **−32 N·m**. *Abductors* are needed.
  - **Zero hip moment** needs ≈41 N inward shear per foot.
- Humans choose this shear (and the COP under each foot), so the statics alone do not decide whether the abductors or the adductors carry tone.
- The measured gluteus medius level (3.6 %) suggests humans keep the frontal hip moment small in a moderate stance.
- S\*'s 52–53 N·m abductor drive (0.31 of capacity, plus 0.02) is larger than even the COM-aimed estimate. That is worth checking against the V2 hip geometry.
- The ankle-invertor drive (5.7 N·m) is consistent with the same inward shear acting through a COP under the ankle centre: 362 × 0.08 m × 0.21/0.98 ≈ 6 N·m [E]. A COP ≈1.7 cm more lateral would null it.

---

## 4. Trunk and neck

### 4.1 Sagittal

| Source | n | Posture | Normalisation | Values (% MVC) | Access |
|---|---|---|---|---|---|
| Fujitani 2017 | 17 M, 21 y | Neutral standing, arms hanging | 5-s MVCs (test positions not stated) | RA 1.8 ± 0.9; EO 8.6 ± 6.3; IO 10.2 ± 5.6; thoracic ES (iliocostalis dorsi site) 3.7 ± 2.2; lumbar ES (iliocostalis lumborum site) 4.5 ± 3.8; multifidus 6.9 ± 3.4 | FT |
| | | "Lordosis" (anterior tilt, trunk lean +3.7°) | | Thoracic ES 9.0 ± 5.3; lumbar ES 13.5 ± 5.4; multifidus 16.0 ± 3.3; RA 1.7 ± 0.7 | FT |
| | | Sway-back | | Lumbar ES 2.1 ± 1.9; IO 4.4 ± 2.3; RA 3.7 ± 3.7 | FT |
| Park 2015 | 33 (16 M), 20 y | Pooled standing + sitting, quiet breathing | % MVIC | IO/TrA 5.81 ± 6.12; EO 2.81 ± 1.25; RA 2.36 ± 1.13; ES 3.40 ± 1.70; multifidus 2.89 ± 1.37. IO/TrA, EO and multifidus higher standing than sitting | FT |
| Abbasi 2025 | 24 F (standing back-pain developers) | Level standing, 60-min mean | Biering-Sørensen / side-plank MVCs | Lumbar ES 4.26–5.50; thoracic ES 3.15–3.62; TrA/IO site 8.66–9.47 (biased up) | FT |
| Okada 1972 | 5 M | Upright; half-rise | MVC (author: probably submaximal) | Every trunk muscle "never exceed[s] 2-3 %" upright. FIG: ES-L4 ≈0–3, RA ≈0–2, EO ≈0–3.5. Half-rise with straight trunk: ES ≈0–1. With forward bend: ES-L1 ≈5–7 | FT, FIG |
| Cholewicki 1997 | 10 | Slow flexion–extension through neutral | % MVC (six muscles, right side) | Antagonist co-activation **1.7 ± 0.8** unloaded, **2.9 ± 1.4** with 32 kg. A moment-equilibrium model predicts 0; a stability model predicts 1.0 / 3.1 | ABS |

**What this means for the stance.**
- With the trunk upright, extensors run 2–7 % and flexors 1.5–5 %.
- Flexing the knees with the trunk upright does not raise erector spinae (Okada).
- Inclining the trunk or pelvis forward raises the extensors 2–3 × (Fujitani; Okada).
- So the ready stance's lumbar extensor tone depends on trunk inclination: 4–12 %. S\*'s 0.12 sits at the top of that range, consistent with its 22 N·m static load.

### 4.2 Lateral bending and axial rotation [E]

- **No quiet-standing study isolates lateral-bending or rotational co-activation.**
- The inference rests on anatomy. The per-side lateral benders are quadratus lumborum, the ipsilateral erector spinae (iliocostalis has the largest lateral moment arm), multifidus, and the external and internal obliques. All are tonically active in standing for sagittal, respiratory or intra-abdominal-pressure reasons, and all are bilateral.
- **Unweighted per-side mean of the measured tone:**
  - Fujitani: (4.5 + 6.9 + 8.6 + 10.2)/4 = **7.6 %**.
  - Park: (3.4 + 2.9 + 2.8 + 5.8)/4 = **3.7 %**.
  - Okada: ≤2–3 %.
- Hence **low 2 / mid 4.5 / high 8 %** relaxed. In a forward-inclined ready stance the erector spinae rises (§4.1), so 3 / 6 / 10 %.
- Caveat: oblique and TrA/IO tone is partly respiratory and pressure-related rather than moment-producing.
- **Asymmetric frontal control exists** (single-leg stance, Murofushi 2024): lumbar ES 7.2 on the unsupported side vs 3.9 on the support side; multifidus 10.4 vs 4.6.
- **Quadratus lumborum** "increased activation in response to increasing compression in static upright standing postures" (McGill, Juker & Kropf 1996, fine-wire, ABS); no unloaded number.
- Psoas is "selectively" used for frontal-plane spinal stabilisation under contralateral loading (Andersson 1995, ABS).
- **Axial rotation** (obliques, multifidus): the same reasoning gives 2 / 4 / 8 %. No direct data.

### 4.3 Neck

- Cervical erector spinae 5.5 (0.8) and upper trapezius 7.2 (1.1) % MVC, unloaded (Chen 2025, n = 30; FT). These appear pooled over standing and walking.
- Cervical erector spinae in sitting: 2.67–6.77 % depending on seat slope (Yim 2020; FT).
- No quiet-posture values were found for sternocleidomastoid or splenius capitis.

### 4.4 Is hip and trunk activity continuous? (Q5)

- **Woodhull-McNeal 1986** (ABS): medians ES 1.0, EO 2.5, RA 0.7 µV standing vs 0.2 µV lying; "no periods without increased muscle activity in the torso muscles"; the muscles act as "guy wires". Values are µV, not % MVC.
- **De Troyer 1983** (needle EMG, ABS): abdominals are always silent supine; 8 of 10 subjects show **tonic** abdominal activity standing, greater in the lower portions.
- **Snijders 1995** (ABS): IO > EO, both active standing. Erector spinae, gluteus maximus and biceps femoris are practically silent.
- **Callaghan & McGill 2001** (ABS, n = 8, 2 h): "A rest component … was present for all muscles monitored in both sitting and standing". So trunk activity is low and **intermittent**, not strictly continuous.
- **Héroux 2014:** soleus units are on ≈100 % of the time, MG ≈74 %, LG almost never.
- **Hodges & Gandevia 2000a, 2000b** (ABS): the diaphragm stays active through expiration (78 ± 17 % of peak inspiratory level) during repetitive arm movement in standing, unlike standing at rest; diaphragm and TrA become tonic when the trunk is challenged.
- **Synthesis:**
  - Continuously active: soleus, the deep abdominals (IO/TrA) and, at a low level, the torso as a whole.
  - Intermittent or near-silent: gluteus maximus, superficial erector spinae, lateral gastrocnemius and tibialis anterior.
  - Typical time-averaged levels are 1–10 % MVC.

---

## 5. EMG % MVC as an estimate of activation (Q3)

**EMG–force relation.**
- Lawrence & De Luca 1983 (ABS): "quasilinear for the first dorsal interosseous", "nonlinear for the biceps and deltoid". Woods & Bigland-Ritchie 1983 (ABS): linear in muscles of uniform fibre type, non-linear in mixed muscles.
- De Luca 1997 (FT): curvature is "more pronounced in larger muscles". As rate coding saturates, EMG "increase[s] more than the force output", so at low force a large muscle's EMG fraction **under-reads** its force fraction.
- Alkner 2000 (ABS): VL and BF linear; VM and RF non-linear.

**How EMG-driven models handle it.**
- Buchanan, Lloyd, Manal & Besier 2004 (FT-s): the relation is "nonlinear, especially at lower forces (up to about 30 %)". They use a = (e^{A·u} − 1)/(e^{A} − 1) with −3 ≤ A ≤ 0, tuned per muscle (Manal & Buchanan 2003).
- [MODEL] arithmetic:

| u (EMG fraction) | A = 0 | A = −1 | A = −2 | A = −3 |
|---|---|---|---|---|
| 0.02 | 0.020 | 0.031 | 0.045 | 0.061 |
| 0.05 | 0.050 | 0.077 | 0.110 | 0.147 |
| 0.10 | 0.100 | 0.151 | 0.210 | 0.273 |

**Biases in the other direction.**
- **Submaximal MVCs inflate % MVC.** Okada 1972 explicitly; Wuehr 2014's manual-test soleus value is 22.7 ± 26.5.
- **Crosstalk inflates small signals.** Tibialis anterior contamination from the triceps surae "approached a mean of 50 %" at 40 mm spacing (triceps at 80 % MVC, TA at 10 %) (De Luca 2012, ABS). Okada suspects VL crosstalk in BF in the half-squat. Surface "iliopsoas" (Fujitani) and abdominal layers are uncertain, though well-placed surface sites reproduce deep trunk muscles "within 15 % RMS" (McGill, Juker & Kropf 1996b, ABS).
- **Noise floor:** values below ≈1–2 % MVC are close to surface-EMG noise.

**[D] Conversion recommendation.**
- **Mid:** a = EMG fraction (A = 0).
- **High-sensitivity bound:** A = −2, which roughly doubles low values.
- **Low bound:** subtract ≈0.5–1 point for signals below ≈3 %.
- The two bias directions are of unknown relative size, so identity is the honest central estimate.

**Static optimisation vs EMG.**
- Moment-equilibrium (static-optimisation-like) solutions predict **no** antagonist activity. Cholewicki 1997: 0 predicted vs 1.7 % measured.
- Akhavanfar 2019 (ABS): in OpenSim, static optimisation "only equilibrate[s] applied moments". When stability demand rises at constant moment, it predicts constant activations while EMG rises.
- De Groote 2017's standing optimisation chose baseline activations of 0.08–0.11 (bounded at 0.3) [MODEL], so its tone is model-dependent.
- "Rest statics + uniform co-contraction" is this class of solution. The literature says antagonist tone should follow measured co-activation per axis, which is nonuniform.

---

## 6. Threat, readiness and anticipation (Q4)

| Source | n | Manipulation | Change vs baseline | Access |
|---|---|---|---|---|
| Zaback 2021 | 37 (15 M) | 0.8 m away from edge → 3.2 m at edge | First HIGH trial: **TA +5.79 ± 4.84 % MVC**, soleus −0.37 ± 2.76 (ns), **soleus–TA co-activation +2.49 ± 2.04 % MVC**. After 20 trials: TA +2.72 ± 3.28, co-activation +0.92 ± 1.33, soleus −1.63 ± 1.88 | FT (Table 3 verified) |
| Wuehr 2014 | 16, 46 y, visual height intolerance | Lab floor → 15-m balcony | TA 0.9 ± 0.6 → **2.7 ± 2.4**; leg co-contraction index 10.4 ± 7.1 → **30.9 ± 24.2 %**; soleus 22.7 → 14.2 (ns); neck and arm indices unchanged | FT |
| Carpenter 2001 | 8 | Ground → 81 cm at edge | AP stiffness (COP−COM method) **+27.5 %**; only TA correlated with it; subjects leaned back | ABS |
| Horslen 2018 | 40 | 1.1 → 3.5 m at edge | Soleus short-latency reflex +11 %, medium-latency +9.5 %, tendon tap +16.9 %, "independent of changes in background muscle activity" | ABS |
| Hodgson 2023 | 20 | Virtual 14 m height | Background EMG MG +10.4 %, TA +6.5 %, soleus +3.9 % (ns) (relative, not % MVC) | FT |
| Lim 2017 | 25 | Threat of perturbation at ground level, heels 15 cm apart | Background EMG higher in **external oblique, gluteus medius, vastus lateralis**; no numbers in text | FT-s |
| Ruest 2025 | 20 | Countdown vs random-timed surface translation | −750–0 ms integrated EMG: MG +15 %, soleus +8 %, TA +11 % (relative, against an already-threatened baseline) | FT |
| Kanekar & Aruin 2014; Krishnan 2012 | 13; 9 | Predictable pendulum impacts | Anticipatory onsets ≈65–145 ms before impact (e.g. lumbar ES −133 ± 13 ms); early adjustments 400–500 ms before. Bursts, not sustained tone | FT-s; ABS |
| Mawston 2007 | 31 M | Warning before sudden trunk loading | Warning "did not alter the level of trunk muscle activity prior to sudden loading" | ABS |
| Granata 2001 | — | Expected vs no sudden flexion load | No difference in preparatory co-activation | ABS |
| Shaw 2012 | 16 | Expecting a push to the trunk | Anxiety up; trunk sway up, not down | ABS |
| Martino 2023 | 13 | **Instructed** co-activation | Soleus +83 to +283 %, TA +363 to +4,581 % vs relaxed; soleus shear-wave stiffness proxy +73 % | FT |

**Athletes.**
- No study gives static ready-stance or defensive-stance % MVC (tennis, volleyball, basketball, goalkeeping, football). No usable athlete vs non-athlete comparison of quiet-stance co-contraction was found.
- Herrington & Horsley 2009 (professional rugby tacklers) report only shoulder-muscle onset order.
- All threat figures above come from upright, normal-width stances.

**[D] Increments for a "seen contact or anticipation" scenario, added to column (b) of §2:**
- Tibialis anterior: **+3 to +6 points**.
- Ankle co-contraction: ×2–3.
- Other leg muscles: ×1.1–1.15 relative.
- Trunk: no evidence-based increase.
- A deliberate brace (e.g. 10–30 % MVC abdominal co-activation, Vera-Garcia 2006) is a separate, explicitly labelled scenario.
- An unseen tackle keeps column (b) unchanged (PPR-1 §8.3).

---

## 7. Stiffness vs co-activation (Q2)

| Joint / axis | Value | Condition | Source | Access |
|---|---|---|---|---|
| Trunk flexion, intrinsic | Mean **109 N·m/rad**; example trial 141 N·m/rad, damping 11 N·m·s/rad | Lying (gravity removed), quick release, reflexes in ≈6–11 % of trials; EO biofeedback 5 / 10 / 15 % MVC (light / moderate / heavy did not differ; only maximum did) | Brown & McGill 2009 | FT (sub-agent) + ABS |
| Trunk lateral bend, intrinsic | **Stiffer than flexion at every level** (p < 0.0001); values in figure only | as above | Brown & McGill 2009 | FT |
| Trunk, long-range quasi-static | Stiffness ×1.6–1.7 from relaxed to EO ≈15 % MVC; flexion and lateral bend rise exponentially with angle; "yielding" near end range | ≈5°/s stretch | Brown & McGill 2008 | FT + ABS |
| Trunk, effective (includes reflexes) | Ext 1237 (698), flex 1253 (760), lateral bend L 1180 (722), R 1191 (685) N·m/rad; **lateral ≈ sagittal** | Semi-seated quick release, 35 % effort preload | Cholewicki, Simons & Radebold 2000 | FT (sub-agent) |
| Trunk, standing, pelvis fixed | 14.5 → 19.8 N/mm (+36.8 %) for 20 → 40 % maximal extension effort; authors' estimate 2.5–10 N·m/deg (145–580 N·m/rad) | Translational perturbation at ≈T12 | Gardner-Morse & Stokes 2001 | FT (sub-agent) |
| Trunk, co-contraction effect | +37.8 % with maximal voluntary co-contraction (3.12 → 4.87 N/mm at 15 % MVE) | Extension effort | Lee, Rogers & Granata 2006 | FT-s |
| Trunk, intrinsic vs reflex | Intrinsic 1280 ± 240 → 2116 ± 710 N/m (20 → 50 % MVE); net intrinsic term negative (insufficient) at 20 %; reflexes give 42 % of stabilising stiffness | Pseudorandom force | Moorhouse & Granata 2007 | FT-s |
| Hip (sagittal, stance) | **95 ± 28 and 147 ± 52 N·m/rad**; damping 27.4 / 18.0 N·m·s/rad; "at most, roughly equal to the amount necessary to stabilize the plant" | Closed-loop two-joint identification, n = 17. Probably both hips lumped (inference), i.e. ≈48–74 per hip | Kiemel 2008 | FT-s |
| Ankle (stance) | 91 ± 23 % mgh (Loram & Lakie 2002); 64 ± 8 % (Casadio 2005); 45–56 % (Kiemel 2008); 53 / 66 / 81 % mgh at 4.9 / 16.4 / 31 N·m (Sakanaka 2018) | Small perturbations | as listed | ABS; FT |
| Knee (isolated) | Natural frequency ×>2 from relaxed to 50 % MVC at ζ ≈0.2, so K ×>4 [E] | Seated | Zhang 1998 | ABS |

**What this means [E].**
- **Joint-level stiffness in standing has a large passive or tendon intercept and rises sub-proportionally with activation.** Trunk: +37 % for doubled effort; ankle in stance: ×1.5 for ×6 torque. Only isolated supine joints scale about proportionally (Weiss, Hunter & Kearney 1988, ABS).
- Stiffness identified with small random (bidirectional) perturbations rises with the agonist's torque, which implies **the active muscle resists displacement in both directions** (Hunter & Kearney 1982; Weiss 1988; ABS). At fibre level, quick *releases* drop tension in proportion to step size (Huxley & Simmons 1971, abstract-level classic). Short-range stiffness therefore acts in shortening as well as stretch.
- **[MODEL] check using the V2 law from the PPR-2 diagnostic.** K_mus ≈ 4.78 × Σ(a·capIso) on lumbar axes:
  - Lumbar flexion at S\* (0.02 / 0.12) gives 141 N·m/rad. That is close to Brown & McGill's intrinsic 109 N·m/rad at light-to-heavy brace.
  - Lumbar lateral at 0.02 / 0.02 gives 4.78 × 110.9 × 0.04 = **21 N·m/rad**, against a human lateral ≥ flexion.
  - The human-inferred per-side lateral tone of 0.045–0.08 gives 530 × (0.09–0.16) = **48–85 N·m/rad**. That is still ≤ flexion, so the evidence-based tone moves V2 toward, not past, the measured anisotropy.
  - Compare the trunk's gravitational stiffness of ≈90 N·m/rad (PPR-2 [E]). Humans are not expected to be intrinsically stable here either (Moorhouse & Granata 2007; Brown & McGill 2009).

---

## 8. Implications for the PPR-2 diagnosis (no tuning)

1. **Lumbar and thoracic lateral bending and axial rotation:** raising tone from 0.02 to ≈0.045 (range 0.02–0.08) per side is supported by inference from measured muscle tone, and the direction is supported by measured stiffness anisotropy. **Strongest case for change.**
2. **Knee extensors in the ready stance:** ≈0.085 (0.06–0.11) is supported by direct measurement at 10–20° knee flexion. Flexors stay at 0.01–0.06. Adding knee-extensor tone without matching flexor tone will create a net moment. The honest options are to (i) recheck the V2 rest alignment at the knee, or (ii) model the co-contraction explicitly (including gastrocnemius's knee-flexor share).
3. **Hip flexors:** the evidence supports **0.015–0.04**, little above 0.02. If V2's hip only holds with a much higher flexor tone, the shortfall is likely elsewhere, not in human tone. Candidates:
   - (a) the active extensors' short-range resistance to *shortening* (they should unload when the trunk tips back);
   - (b) passive hip and fascial stiffness;
   - (c) delayed feedback (Kiemel 2008: intrinsic hip stiffness only about equals the requirement).
   Check (a) in the V2 actuator before raising the flexor side.
4. **Hip abductors at 0.32 and ankle invertors at 0.15–0.19** exceed every human value found (gluteus medius 3.6 %; tibialis anterior ≈1–2 %). They follow from the assumed inter-foot shear and COP placement, which humans choose. **Recommendation [D]:** treat the frontal rest statics as an assumption to revisit, not as evidence. In the absence of stance-width EMG, a range of 2 / 4 / 8 % per side for both abductors and adductors is defensible.
5. **Ankle sagittal, hip extensors, lumbar extensors and flexors, and neck extensors** are already within the human range.

---

## 9. Caveats

- **Normalisation.**
  - MVC posture, joint angle and effort vary widely: manual resistance (Mitsutake, Wuehr), dynamometer, Biering-Sørensen (Abbasi), or unstated (Itoh, Fujitani).
  - Submaximal MVCs inflate % MVC. Okada says his triceps surae, back, abdominal and gluteal percentages "should be reduced". Wuehr's soleus SD exceeds its mean.
  - MVCs at other muscle lengths distort low-level ratios.
- **Crosstalk and depth.** Soleus/TA and VL/BF crosstalk, layered abdominals, and surface "iliopsoas" and "transversus" sites all add uncertainty. Values below ≈2 % are near the noise floor.
- **Posture differences.**
  - Most data are feet-together or 15–20 cm stances with near-straight knees (hip ≈0°, knee ≈1°, ankle ≈3° dorsiflexion in Itoh).
  - The ready stance differs in knee angle (the dominant effect on quadriceps), trunk inclination (dominant for erector spinae and hip extensors) and stance width (unstudied for hip abductors and adductors).
  - Potter & Kirby constrained only the knee.
- **Sex, age, population.**
  - Mitsutake is 11 F / 6 M; Baudry mostly F; Abbasi all F with back pain; Tikkanen mean age 44 y; Wuehr 46 y and height-intolerant.
  - Male young-adult sources: Okada 1972 and 1984, Itoh 2018, Fujitani 2017 (n = 17 M), Murofushi 2024, Brown & McGill.
  - Larivière 2019 (ABS) report higher EO % MVA in females than males (+1.5–2.3 points).
- **Athletes.** No data. A footballer's higher MVC would give *lower* % MVC for the same absolute moment. Habitual co-contraction in athletes is unmeasured.
- **Time-averaging.** Mean % MVC hides intermittency (MG active ≈74 % of the time; Callaghan & McGill's "rest component"). A constant tone equal to the mean overstates the instantaneous floor and understates the bursts.
- **Between-subject spread.** SD ≈ mean is typical (VL 7.6 ± 5.6 at 10°). Any single value represents a population mean, not a person.
- **Stiffness transfer.** Brown & McGill (lying, gravity removed), Cholewicki 2000 (semi-seated, reflexes included) and Kiemel (model-based) are not the V2 condition. Kiemel's bilateral lumping is inferred, not stated.

---

## 10. Gaps (literature does not constrain)

1. Static athletic or ready-stance EMG in any sport, footballers included.
2. Stance-width effects on gluteus medius, TFL and adductor % MVC in quiet standing.
3. Quiet-standing % MVC for adductors, tibialis posterior, hip rotators, intramuscular iliopsoas and quadratus lumborum.
4. A bilateral-standing study recording both quadriceps and hamstrings at ≈15° knee flexion in young men.
5. Trunk lateral-bending and axial-rotation co-activation in quiet standing. Per-level lateral stiffness values (Brown & McGill 2009 figure only).
6. Neck flexor, splenius and sternocleidomastoid tone.
7. Primary sources not read: Joseph & Nightingale 1952–1955, Joseph & Williams 1957, Floyd & Silver 1955 and Basmajian & De Luca (scanned or book); Carpenter 2001 and Santos 2010 EMG values (paywalled); Panzer 1995 and Kouzaki 2007 ("plantarflexors below 10 % of maximum", SEC via Takahashi 2025).

---

## 11. References

Access as defined in §0.

- Abbasi S, et al. (2025). BMC Musculoskelet Disord 26:299. doi:10.1186/s12891-025-08525-y. PMID 40140795. PMC11938693. FT.
- Akhavanfar MH, Brandon SCE, Brown SHM, Graham RB (2019). J Biomech 91:61–68. doi:10.1016/j.jbiomech.2019.05.007. PMID 31138478. ABS.
- Alkner BA, Tesch PA, Berg HE (2000). Med Sci Sports Exerc 32:459–463. PMID 10694132. ABS.
- Andersson E, Oddsson L, Grundström H, Thorstensson A (1995). Scand J Med Sci Sports 5:10–16. doi:10.1111/j.1600-0838.1995.tb00004.x. PMID 7882121. ABS.
- Andersson EA, et al. (1996). Clin Biomech 11:392–400. doi:10.1016/0268-0033(96)00033-2. PMID 11415651. ABS.
- Baudry S, Duchateau J (2012). J Physiol 590:5541–5554. doi:10.1113/jphysiol.2012.228932. PMID 22946095. PMC3515837. FT-s.
- Brown SHM, McGill SM (2008). How the inherent stiffness of the in vivo human trunk varies with changing magnitudes of muscular activation. Clin Biomech 23:15–22. doi:10.1016/j.clinbiomech.2007.08.011. PMID 17910898. FT + ABS.
- Brown SHM, McGill SM (2009). The intrinsic stiffness of the in vivo lumbar spine in response to quick releases. J Electromyogr Kinesiol 19:727–736. doi:10.1016/j.jelekin.2008.04.009. PMID 18513993. FT + ABS.
- Brown SHM, McGill SM (2010). Comput Methods Biomech Biomed Engin 13:829–835. doi:10.1080/10255841003630652. PMID 20603728. FT.
- Buchanan TS, Lloyd DG, Manal K, Besier TF (2004). J Appl Biomech 20:367–395. doi:10.1123/jab.20.4.367. PMID 16467928. PMC1357215. FT-s.
- Callaghan JP, McGill SM (2001). Ergonomics 44:280–294. doi:10.1080/00140130118276. PMID 11219760. ABS.
- Carpenter MG, Frank JS, Silcher CP, Peysar GW (2001). Exp Brain Res 138:210–218. doi:10.1007/s002210100681. PMID 11417462. ABS.
- Casadio M, Morasso PG, Sanguineti V (2005). Gait Posture 21:410–424. doi:10.1016/j.gaitpost.2004.05.005. PMID 15886131. ABS.
- Chan RKK, et al. (2025). Sci Rep 15:11242. doi:10.1038/s41598-025-96048-w. PMC11965470. FT.
- Chen, Tang, Guan (2025). Sci Rep 15:36091. doi:10.1038/s41598-025-20015-8. PMID 41094091. PMC12528664. FT.
- Cholewicki J, Panjabi MM, Khachatryan A (1997). Stabilizing function of trunk flexor-extensor muscles around a neutral spine posture. Spine 22:2207–2212. doi:10.1097/00007632-199710010-00003. PMID 9346140. ABS (verified).
- Cholewicki J, Simons APD, Radebold A (2000). J Biomech 33:1377–1385. doi:10.1016/s0021-9290(00)00118-4. PMID 10940396. FT.
- Cui L, Perreault EJ, Maas H, Sandercock TG (2008). J Biomech 41:1945–1952. doi:10.1016/j.jbiomech.2008.03.024. PMID 18499113. PMC2488157. FT-s.
- De Groote F, Allen JL, Ting LH (2017). J Biomech 55:71–77. doi:10.1016/j.jbiomech.2017.02.008. PMID 28259465. PMC5436583. FT-s.
- De Luca CJ (1997). The use of surface electromyography in biomechanics. J Appl Biomech 13:135–163. FT (reprint).
- De Luca CJ, Kuznetsov M, Gilmore LD, Roy SH (2012). J Biomech 45:555–561. PMID 22169134. ABS.
- De Troyer A (1983). Respir Physiol 53:341–353. doi:10.1016/0034-5687(83)90124-x. PMID 6227964. ABS.
- Fujitani R, Jiromaru T, Kida N, Nomura T (2017). J Phys Ther Sci 29:1212–1215. doi:10.1589/jpts.29.1212. PMID 28744050. PMC5509594. FT (Table 2 verified).
- Gardner-Morse MG, Stokes IAF (2001). Trunk stiffness increases with steady-state effort. J Biomech 34:457–463. doi:10.1016/s0021-9290(00)00226-8. PMID 11266668. FT.
- Granata KP, Orishimo KF, Sanford AH (2001). J Electromyogr Kinesiol 11:247–254. doi:10.1016/s1050-6411(01)00003-7. PMID 11532595. ABS.
- Héroux ME, Dakin CJ, Luu BL, Inglis JT, Blouin JS (2014). J Appl Physiol 116:140–148. doi:10.1152/japplphysiol.00906.2013. PMID 24311748. PMC3921363. ABS + FT-s.
- Herrington L, Horsley I (2009). Sports Med Arthrosc Rehabil Ther Technol 1:10. doi:10.1186/1758-2555-1-10. PMC2697139. ABS.
- Hodges PW, Gandevia SC (2000a). J Physiol 522:165–175. PMID 10618161. ABS.
- Hodges PW, Gandevia SC (2000b). J Appl Physiol 89:967–976. PMID 10956340. ABS.
- Hodgson DD, et al. (2023). Front Hum Neurosci 17:1128548. doi:10.3389/fnhum.2023.1128548. PMID 37082148. PMC10110857. FT.
- Horslen BC, Zaback M, Inglis JT, Blouin JS, Carpenter MG (2018). J Physiol 596:5251–5265. doi:10.1113/jp276459. PMID 30176053. ABS.
- Hunter IW, Kearney RE (1982). J Biomech 15:747–752. PMID 7153227. ABS.
- Huxley AF, Simmons RM (1971). Proposed mechanism of force generation in striated muscle. Nature 233:533–538. doi:10.1038/233533a0. PMID 4939977. ABS (classic; quick-release result cited qualitatively).
- Itoh N, et al. (2018). J Phys Ther Sci 30:1262–1266. doi:10.1589/jpts.30.1262. PMC6181658. FT (Table 1 verified).
- Juker D, McGill S, Kropf P, Steffen T (1998). Med Sci Sports Exerc 30:301–310. PMID 9502361. ABS.
- Kanekar N, Aruin AS (2014). Exp Brain Res 232:1127–1136. doi:10.1007/s00221-014-3822-3. PMID 24449006. PMC3954907. FT-s.
- Kiemel T, Elahi AJ, Jeka JJ (2008). J Neurophysiol 100:3394–3406. doi:10.1152/jn.01272.2007. PMID 18829854. PMC2604857. FT-s.
- Krishnan V, Latash ML, Aruin AS (2012). Clin Neurophysiol 123:1016–1026. doi:10.1016/j.clinph.2011.09.014. PMID 21983281. ABS.
- Larivière C, et al. (2019). J Electromyogr Kinesiol 46:55–62. PMID 30927631. ABS.
- Lawrence JH, De Luca CJ (1983). J Appl Physiol 54:1653–1659. doi:10.1152/jappl.1983.54.6.1653. PMID 6874489. ABS.
- Lee PJ, Rogers EL, Granata KP (2006). Active trunk stiffness increases with co-contraction. J Electromyogr Kinesiol 16:51–57. doi:10.1016/j.jelekin.2005.06.006. PMID 16099678. PMC1635026. FT-s.
- Leeuwis M, van Aerts N, Seth A, Forbes PA (2026). PLoS Comput Biol. doi:10.1371/journal.pcbi.1013522. PMC13340847. FT (values in figures only).
- Lim SB, et al. (2017). J Neurophysiol 117:604–611. doi:10.1152/jn.00712.2016. PMID 27832609. PMC5288487. FT-s.
- Loram ID, Lakie M (2002). J Physiol 545:1041–1053. doi:10.1113/jphysiol.2002.025049. PMID 12482906. ABS.
- Manal K, Buchanan TS (2003). J Biomech 36:1197–1202. doi:10.1016/s0021-9290(03)00152-0. PMID 12831746. ABS.
- Martino G, Beck ON, Ting LH (2023). J Neurophysiol 129:1378–1388. doi:10.1152/jn.00458.2022. PMC10259861. FT.
- Mawston GA, McNair PJ, Boocock MG (2007). Ergonomics 50:2157–2170. doi:10.1080/00140130701510139. PMID 17852372. ABS.
- McGill S, Juker D, Kropf P (1996a). Quadratus lumborum. Clin Biomech 11:170–172. doi:10.1016/0268-0033(95)00056-9. PMID 11415616. ABS.
- McGill S, Juker D, Kropf P (1996b). Surface vs deep trunk EMG. J Biomech 29:1503–1507. PMID 8894932. ABS.
- Mitsutake T, Taniguchi T, Nakazono H, Yoshizuka H, Sakamoto M (2022). Front Hum Neurosci 16:891669. doi:10.3389/fnhum.2022.891669. PMC9202802. FT.
- Moorhouse KM, Granata KP (2007). J Biomech 40:1058–1065. doi:10.1016/j.jbiomech.2006.04.018. PMID 16782106. PMC1851677. FT-s.
- Murofushi K, et al. (2024). Front Sports Act Living 6:1343888. doi:10.3389/fspor.2024.1343888. PMID 38550671. PMC10973116. FT.
- Ohkoshi Y, et al. (1991). Am J Sports Med 19:605. PMID 1781498. ABS.
- Okada M (1972). An electromyographic estimation of the relative muscular load in different human postures. J Human Ergol 1:75–93. doi:10.11183/jhe1972.1.75. PMID 4773262. FT (J-STAGE PDF) + FIG.
- Okada M, Fujiwara K (1984). J Human Ergol 13:97–105. doi:10.11183/jhe1972.13.97. FT (J-STAGE PDF).
- Papegaaij S, Baudry S, Négyesi J, Taube W, Hortobágyi T (2016). Eur J Appl Physiol 116:959–967. doi:10.1007/s00421-016-3354-6. PMC4834104. FT.
- Park, Kweon, Hong (2015). J Phys Ther Sci 27:491–493. doi:10.1589/jpts.27.491. PMID 25729199. PMC4339169. FT.
- Perry J, Antonelli D, Ford W (1975). J Bone Joint Surg Am 57:961–967. doi:10.2106/00004623-197557070-00014. PMID 1194303. ABS.
- Pesola AJ, Laukkanen A, Tikkanen O, Finni T (2016). Appl Physiol Nutr Metab 41:1155–1162. doi:10.1139/apnm-2016-0170. PMID 27806635. ABS.
- Potter PJ, Kirby RL (1991). Relationship between electromyographic activity of the vastus lateralis while standing and the extent of bilateral simulated knee-flexion contractures. Am J Phys Med Rehabil 70:301–305. PMID 1741999. ABS (verified verbatim).
- Ruest, Eichenlaub, Franz (2025). Exp Brain Res 243:115. doi:10.1007/s00221-025-07075-y. PMID 40232512. PMC12000272. FT.
- Sakanaka TE, Gill J, Lakie MD, Reynolds RF (2018). PLoS One 13:e0193850. PMID 29558469. PMC5860743. FT.
- Shaw JA, Stefanyk LE, Frank JS, Jog MS, Adkin AL (2012). Gait Posture 35:658–661. doi:10.1016/j.gaitpost.2011.12.020. PMID 22277369. ABS.
- Snijders CJ, et al. (1995). Clin Biomech 10:73–78. doi:10.1016/0268-0033(95)92042-k. PMID 11415534. ABS.
- Tikkanen O, et al. (2013). PLoS One 8:e52228. doi:10.1371/journal.pone.0052228. PMC3548884. FT.
- Vera-Garcia FJ, Brown SHM, Gray JR, McGill SM (2006). Clin Biomech 21:443–455. doi:10.1016/j.clinbiomech.2005.12.006. PMID 16442677. ABS.
- Weiss PL, Hunter IW, Kearney RE (1988). J Biomech 21:539–544. doi:10.1016/0021-9290(88)90217-5. PMID 3410857. ABS.
- Woodhull-McNeal AP (1986). Activity in torso muscles during relaxed standing. Eur J Appl Physiol 55:419–424. doi:10.1007/BF00422744. PMID 3758044. ABS.
- Woods JJ, Bigland-Ritchie B (1983). Am J Phys Med 62:287–299. PMID 6650674. ABS.
- Wuehr M, et al. (2014). Physiol Rep 2:e00232. doi:10.1002/phy2.232. PMID 24744901. PMC3966255. FT.
- Yim, Park, Lohman, Do (2020). Medicine 99:e21178. PMC7360225. FT.
- Zaback M, Luu MJ, Adkin AL, Carpenter MG (2021). Sci Rep 11:384. doi:10.1038/s41598-020-79417-5. PMID 33431937. PMC7801693. FT (Table 3 verified).
- Zhang LQ, Nuber G, Butler J, Bowen M, Rymer WZ (1998). J Biomech 31:71–76. doi:10.1016/s0021-9290(97)00106-1. PMID 9596540. ABS.

Carried over from PPR-1 / PPR-2 notes, not re-read here: Kouzaki & Shinohara 2010 (Muscle Nerve 42:78–87); PPR-1 §8.1 torque-based plantar-flexor estimate.

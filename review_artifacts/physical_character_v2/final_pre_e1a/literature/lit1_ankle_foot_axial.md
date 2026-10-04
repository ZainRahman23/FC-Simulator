# What resists rotation of the body about the vertical axis over a planted foot? Ankle–foot axial-rotation literature review

Prepared 2026-10-04 for the Touchline physical-character model: the passive `fabd` ankle axis and single-support yaw.

## How the sources were read
- **Abstracts** came from the Europe PMC REST API (`resultType=core`).
- **Full texts** came from PMC / Europe PMC full-text XML for open-access papers. Two papers were read through PMC pages with WebFetch.
- **Figure values** were read by eye from the downloaded figure image where needed (Lee 2014 only).
- **The OpenSim model file** was downloaded from GitHub.
- **Paywalled classics** (McCullough & Burge 1980, Stormont 1985, Chen/Siegler 1988, Watanabe 2012 *Clin Biomech*, McCullough 2011, Wei 2010/2012, Mait 2017, Mote & Lee 1982, Shoemaker & Markolf 1982, Lundberg 1989) could only be read as **abstracts**. Each row in the tables says how its source was read.
- **Numbers I computed** (for example secant = torque ÷ angle, or unit conversion 1 N·m/° = 57.3 N·m/rad) are marked *(computed)*.
- **Values recalled rather than read** are marked **[RECALLED — unverified]**.

---

## TL;DR

1. **Unloaded, relaxed, small torque (≤ 1.7 N·m): well supported. Whole ankle–hindfoot internal/external rotation stiffness is about 0.10–0.15 N·m/°.**
   - Watanabe 2012 (in vivo), Hattori 2022 (in vitro) and Ficanha 2015 (in vivo) agree.
   - The 0.11–0.15 N·m/° in your notes reproduces correctly from Watanabe 2012 and Hattori 2022.
2. **The torque–rotation curve is strongly nonlinear and viscoelastic.**
   - Chen 1988: flexibility is highest around neutral and falls rapidly toward the extremes.
   - Average secants near end range (20–40°) reach about 0.8–1.7 N·m/° in vitro (Wei 2010, Markolf 1989, Mait 2017).
   - Fast (transient) moments are about 2.3–3.4× the relaxed (long-time) moments (Mait 2017, n = 2).
3. **Loaded, small-angle, passive: I found no directly measured number in a source I could read.**
   - Load clearly matters. Rotation is "load-dependent" (McCullough & Burge 1980). Articular geometry provides 30–60% of rotational stability at physiological or body-weight load (Stormont 1985, Tochigi 2006, Watanabe 2012).
   - None of the abstracts give the loaded N·m/° value.
   - The nearest analogue is the frontal (inversion/eversion) plane in vivo: stiffness ×4.1 at full single-leg weight-bearing versus unloaded (Matos 2021). Part of that rise is muscle activation, and it is a different coordinate.
4. **Loaded and active, whole limb: about 20–25 N·m/rad (≈ 0.35–0.44 N·m/°) at baseline.**
   - Source: dynamic (2 Hz) pivot stiffness of the shod, strapped, weight-bearing limb during elliptical stepping (Lee 2014, read from Fig. 3B).
   - Ankle–foot, knee and hip are in series, so the ankle–foot element must be **at least** this stiff in that state *(inference)*. That is about 3× the unloaded passive value, and still below your ≥ 1 N·m/° requirement. It is a lower bound, so it does not rule ≥ 1 N·m/° out either.
5. **In humans this resistance is spread over several structures, not one passive hinge.**
   - The talocrural mortise (load-dependent) and the distal tibiofibular joint (about half of unloaded talar rotation).
   - The subtalar joint, whose oblique axis couples yaw with inversion/eversion. Its yaw component is therefore actively controllable by invertors and evertors, and under load is resisted by the ground reaction about the subtalar axis.
   - The midfoot (talonavicular transverse-plane motion about 9°).
   - Shoe/foot compliance.
   - Knee axial rotation, which carries roughly as much rotation as the ankle–foot (unloaded, relaxed).
   - Your orthogonal model removes the subtalar coupling and the active yaw path entirely, and loads everything onto one passive spring.

---

## 1. Results table: torque–rotation of the ankle–foot complex (and series elements)

Abbreviations: TC = talocrural, ST = subtalar, ER/IR = external/internal rotation, BW = body weight, WB = weight-bearing, PF = plantarflexion.

| Source | In vivo / in vitro | n | Load condition | Coordinate / axis | Rotation range | Torque / stiffness values | Subtalar free? | Read | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| **Watanabe K, Fujii T, Kitaoka HB et al. 2012**, *Int Orthop* 36(1):89–94 (doi:10.1007/s00264-011-1376-6; PMC3251665) | in vivo, healthy | 10 (+3 patients) | Non-WB. Seated, hip and knee at 90°, leg on a low-friction sliding block. Foot strapped to a footplate (forefoot/midfoot strap + heel cup). Muscle state not controlled or EMG-checked | Calcaneus skin sensor vs proximal anteromedial tibia sensor ("ankle–hindfoot complex"). Torque from a spring-loaded generator about the tibial axis | Swept from PF to DF under constant torque | **1.7 N·m IR → max IR 15.4 ± 3.4°, min 11.7 ± 3.5°** (Fig. 3/text) → secant **0.11–0.15 N·m/°** *(computed)*. Zero reference not explicitly stated | Yes (midfoot partly included; skin artefact) | Full text (PMC page via WebFetch extraction; figures not inspected) | Moderate |
| **Hattori S et al. 2022**, *Orthop J Sports Med* 10(8):23259671221111397 (PMC9358583) | in vitro, 6-DOF robot | 9 (all male, 56 ± 17 y) | **5 N axial** ("to maintain contact"). Tibia potted, **calcaneus potted** and driven. Proximal tibiofibular joint screwed | Calcaneus vs tibia, ISB joint coordinate system. IR measured from the zero-load "passive path". Inversion/eversion left under force control (free) during IR torque | 1.7 N·m | **1.7 N·m IR → 13.7° (30° PF), 11.8° (15° PF)** → **0.12–0.14 N·m/°** *(computed)*. 0° and DF values only in Fig. 6B (not extracted) | Yes (TC + ST; midfoot excluded) | Full text (raw XML) | High for these numbers |
| **Ficanha EM, Ribeiro GA, Rastgaar M 2015**, *Front Bioeng Biotechnol* 3:198 (PMC4672054) | in vivo | 10 male | Non-WB, seated, knee 90°, relaxed (no EMG check). Modified shoe. Shin brace on **spherical joints that let the shin rotate in all planes**, so knee axial rotation and shoe compliance are in series | Shoe rotation about the vertical/tibial axis | Quasi-static ±0.4 rad (±23°) at 0.4 rad/s | **5.81 ± 0.81 (SE) N·m/rad ≈ 0.10 N·m/°**. Impedance 0–1 Hz: 4.90 ± 0.74 N·m/rad. Second-order fit: K 4.66 N·m/rad, **B 2.25 N·m·s/rad**, I 0.37 kg·m² | Yes (plus knee, tibiofibular, shoe) | Full text (raw XML) | High for this condition. A lower bound for the ankle alone |
| Lee H et al. "2014c", as cited inside Ficanha 2015 (venue not checked) | in vivo | – | Unloaded, relaxed | DP and IE planes (for comparison only) | small | Impedance magnitude below 2 Hz: **DP 12.61 ± 1.27, IE 7.96 ± 0.62 N·m/rad** (transverse plane 4.9: the most compliant plane) | – | Secondary (citation in Ficanha full text) | Moderate |
| **Li Y et al. 2023**, *Indian J Orthop* 57(9):1461–1472 (doi:10.1007/s43465-023-00951-1; PMC10441913) | in vitro | 15 | **150 N axial**. **Subtalar fixed (2 screws), knee fixed** | ER of foot vs tibia. Stiffness = 4 N·m ÷ max ER angle | 0 → 4 N·m ER at 1°/s | **Intact 0.430 ± 0.090 N·m/° (Table 3)** → about 9.3° at 4 N·m *(computed)* | **No** | Full text (raw XML) | High for the number. Not applicable as whole-complex stiffness (you were right to reject it) |
| **Lee SJ, Ren Y, … Zhang LQ 2014**, *Med Sci Sports Exerc* 46(7):1400–1409 (PMC4140528) | in vivo, active | 41 (21 training / 20 control) | **Weight-bearing elliptical stepping**. Shoes strapped (toe + heel) to pivoting footplates. Handlebars held lightly | **Whole-limb** pivot: footplate rotation about an axis aligned with the tibial long axis (ankle–foot + knee + hip + shoe in series) | 5 N·m offset + 1.8 N·m, 2 Hz sinusoid. Torque limit 10 N·m | **\|FRF\| at 2 Hz ≈ 20–25 N·m/rad baseline (≈ 0.35–0.44 N·m/°); ≈ 26–33 N·m/rad after 6 weeks of training** (Fig. 3B, read by eye). Baseline max pivot angles about 15–20° (internal task) and about 29–31° (external task) | Yes (whole limb) | Full text + figure image | Moderate (figure-read; whole limb; dynamic) |
| **Shoemaker SC, Markolf KL 1982**, *JBJS-Am* 64:208 (doi:10.2106/00004623-198264020-00010) | in vivo | 20 | Non-WB, muscles relaxed. Knee 20°/90° | Foot (boot) rotation vs tibial rotation | up to ±10 N·m | **Tibial rotation ≈ ½ of foot rotation**, so knee and ankle–foot carry about equal shares. Max isometric tibial torque measured (internal > external); values not in abstract | Yes | Abstract | Moderate (ratio only) |
| **Markolf KL, Schmalzried TP, Ferkel RD 1989**, *Clin Orthop* 246:266 (PMID 2504526) | in vitro (+ in vivo citation) | 19 | Foot supinated. Axial load not stated | Foot ER to failure | 0 → failure | **Failure 45.3 N·m at 41.4°** (average secant ≈ 1.1 N·m/° *(computed)*). Abstract cites a prior in vivo study: **about 10 N·m and 20° of foot rotation tolerated before pain** | Apparently yes (one subtalar dislocation) | Abstract | Moderate |
| **Wei F, Villwock MR, … Haut RC 2010**, *J Biomech Eng* 132:091001 (doi:10.1115/1.4002025) | in vitro | 10 | Foot constrained; **subtalar constrained** (stated). Axial load not given in abstract | Foot ER to failure, at 0.5 and 2 Hz | 0 → failure | **69.5 ± 11.7 N·m at 40.7 ± 7.3°** (secant ≈ 1.7 N·m/° *(computed)*). No rate effect | **No** | Abstract | Moderate |
| **Wei F, Meyer EG, … Haut RC 2012**, *J Biomech Eng* 134:041002 (doi:10.1115/1.4005695) | in vitro | 12 (6 pairs) | Cadaver feet in football shoes (flexible vs rigid). Axial load not given in abstract (the companion *JOR* 2012 study was "axially loaded") | Shoe ER 30°. Talus tracked with bone-mounted array | 30° of shoe rotation | **Torque 35.4 ± 5.7 (flexible) / 46.2 ± 9.3 N·m (rigid)**. Talus rotation only **12.1 ± 1.0 / 15.9 ± 1.6°**. Talus eversion 5.6 / 1.2°. Secant ≈ 1.2–1.5 N·m/° per degree of shoe rotation; ≈ 2.9 N·m/° per degree of talus rotation *(computed)* | Yes (in shoe) | Abstract | Moderate. Near end range |
| **Mait AR, Mane A, Forman JL, … Kent RW 2017**, *J Biomech* 53:196–200 (doi:10.1016/j.jbiomech.2017.01.006) | in vitro | **2** | Knee-disarticulated legs. Fibula unconstrained. Calcaneus free to translate. Preload not given in abstract | Tibial axial rotation over the calcaneus (tibial axis) | 21° ramp, then hold | Neutral position: **transient ER 16.5 / 30.3, IR 26.3 / 32.1 N·m; long-time ER 5.5 / 13.2, IR 9.0 / 9.5 N·m** → transient secant 0.8–1.5, long-time 0.26–0.63 N·m/°; transient ÷ long-time ≈ 2.3–3.4 *(computed)* | Yes | Abstract | Low–moderate (n = 2) |
| **McCullough CJ, Burge PD 1980**, *JBJS-Br* 62-B:460 (doi:10.1302/0301-620X.62B4.7430225) | in vitro | ? | "Conditions which simulated normal load-bearing" | Talar rotation in the horizontal plane | Full range | **Unloaded: 25° total, about half from inferior tibiofibular joint motion.** Rotation "load-dependent" (loaded values not in abstract). Excising the malleolar articular surfaces gave "only a moderate increase" in rotation | ? | Abstract | Moderate (qualitative) |
| **Stormont DM, Morrey BF, An KN, Cass JR 1985**, *Am J Sports Med* 13:295 (doi:10.1177/036354658501300502) | in vitro | ? | "Defined physiologic loading" | Rotation and version stability | ? | **Articular surface = 30% of rotational and 100% of version (inversion/eversion) stability** under load | ? | Abstract | Moderate (percentages only) |
| **Tochigi Y et al. 2006**, *JBJS-Am* 88:2704 (doi:10.2106/JBJS.E.00758) | in vitro + model | 6 | **1 BW axial** + secondary IR/ER torque | TC contact-stress redistribution | ? | Articular surface ≈ **70% A/P, 50% version, 30% IR/ER stability**. Under IR/ER torque, contact stress rises at two diagonal sites | Yes | Abstract | Moderate |
| **Watanabe K, Kitaoka HB, … An KN 2012**, *Clin Biomech* 27:189 (doi:10.1016/j.clinbiomech.2011.08.015) | in vitro | 16 | **Unloaded vs axial load = BW** | Talar/foot IR/ER, in neutral, DF and PF | ? | Unloaded: ligaments give 50–80% of rotational stability. **Loaded: articular geometry gives 60% of rotational (100% of translational) stability.** Least stable in PF | ? | Abstract (**key full text not obtained**) | Moderate (percentages only) |
| **Chen J, Siegler S, Schneck CD 1988** (Part II), *J Biomech Eng* 110:374 (doi:10.1115/1.3108456) | in vitro | 15 | Unloaded; incremental loads applied to the calcaneus | Foot–shank complex, 3-D | Full range | Highly nonlinear and asymptotic. **Most flexible near the unloaded neutral position; flexibility falls rapidly toward the extremes.** Strong coupling in IR/ER and IE. ATFL cut → large rise in transverse- and coronal-plane flexibility | Yes | Abstract | Moderate |
| **Johnson EE, Markolf KL 1983**, *JBJS-Am* 65:81 (doi:10.2106/00004623-198365010-00011) | in vitro | 30 | "Tibiotalar joints"; load not stated | IR/ER laxity | ? | Laxity depends on flexion; **DF the least lax**. Cutting the ATFL adds 10.8° of total IR/ER laxity in PF | Unclear | Abstract | Moderate |
| **Clanton TO et al. 2017**, *Foot Ankle Int* 38:66 (doi:10.1177/1071100716666277) | in vitro | 16 (8 pairs) | **750 N axial** | Foot rotated 15° ER / 10° IR; torque recorded | 15° ER → 10° IR | Intact fibula: 4.3° axial rotation, 3.3 mm sagittal translation. **Intact torques not in abstract** | Yes | Abstract | – |
| **Louie JK, Mote CD 1987**, *J Biomech* 20:281 (doi:10.1016/0021-9290(87)90295-8) | in vivo | ? | Self-generated co-contraction. WB not stated | Rotation about the lower-leg long axis at the knee (electrogoniometer); foot twisted by examiner | ? | **Knee torsional stiffness 0.16–2.54 N·m/°** depending on active muscles. **More than 400% increase** with activation | n/a (knee) | Abstract | Moderate |
| **Mote CD, Lee CW 1982**, *J Biomech* 15:211 (doi:10.1016/0021-9290(82)90254-8) | in vivo | ? | WB vs not; muscle "bias torsion"; knee flexion | 4-DOF torsion model (foot–ankle–knee–hip–pelvis), sinusoids of 2–6° at 1–20 Hz | ±2–6° | **WB and muscle bias torsion raised the knee, ankle and pelvis stiffness elements.** Ankle stiffness lowest at the largest amplitude. No numbers in abstract | Yes | Abstract | Low–moderate |
| **Matos M, Perreault EJ, Ludvig D 2021**, *J Biomech* 124:110565 (PMC8569913) | in vivo | ? | 0–100% BW on the tested ankle, foot flat | **Frontal plane (inversion/eversion), not yaw.** 0.03 rad PRBS perturbations | ±0.03 rad | **Stiffness ×2.6 at 50% BW and ×4.1 at 100% BW vs unloaded.** Muscle activation explains part, not all, of the rise | n/a | Full text (verbatim quotes via WebFetch) | Moderate. **Analogue only** |

---

## 2. Section answers

### Q1. Torque–rotation behaviour; unloaded vs loaded; neutral zone

**Unloaded, small torque**
- Three independent sources agree on **≈ 0.10–0.15 N·m/°** over the first ≈ 10–15° (≈ 1.7 N·m):
  - Watanabe 2012, in vivo, calcaneus vs tibia, seated.
  - Hattori 2022, in vitro, calcaneus vs tibia, 5 N axial load, plantarflexed positions.
  - Ficanha 2015, in vivo, shoe vs global, knee 90°, over ±23°.
- Chen 1988 confirms qualitatively that this is a **neutral zone**: flexibility is highest near neutral and falls rapidly toward the extremes.
- Two caveats on mapping these to your coordinate:
  - Hattori's robot left the inversion/eversion axis under force control (free) during the IR test. The number is therefore the IR compliance with coupled motions free. With your IE axis held by its actuator, the equivalent fabd-only stiffness would be **≥** these values.
  - Ficanha's value includes knee axial rotation (the shin could rotate) and shoe compliance, so it is a lower bound for the ankle alone.

**End range**
- Average secants to 20–40° are about **0.8–1.7 N·m/°**: Markolf 1989 to failure ≈ 1.1; Wei 2010 ≈ 1.7 with subtalar constrained; Mait 2017 ≈ 0.8–1.5 transient at 21°.
- Wei 2012: with a shoe, 30° of shoe rotation took 35–46 N·m, but the talus turned only 12–16°. The rest occurred in the subtalar and midtarsal joints and between foot and shoe.
- These are **secants over large rotations**. Tangent stiffness near end range is higher; within ±5° it is far lower. Using them inside your ±10° zone would transplant end-range behaviour into the neutral zone.

**Rate dependence**
- Mait 2017 (n = 2): transient moments after a 21° ramp were 2.3–3.4× the relaxed (long-time) moments.
- Wei 2010 found no effect of 0.5 vs 2 Hz on failure torque or angle.
- So the effective stiffness against fast perturbations may be higher than quasi-static values. The magnitude at small angles is unknown.

**Loaded**
- All load-controlled studies I could read agree qualitatively that axial load reduces rotation and shifts restraint onto the articular surfaces:
  - McCullough & Burge 1980: rotation is "load-dependent".
  - Stormont 1985: articular surface gives 30% of rotational stability.
  - Tochigi 2006: ≈ 30% at 1 BW.
  - Watanabe 2012: 60% at BW.
- **None of those abstracts give the loaded torque–angle values, so I cannot state a loaded small-angle stiffness in N·m/°.**
- Li 2023 (subtalar fixed, 150 N) measured talocrural/syndesmosis-only ER at 0.43 N·m/° secant over 0–4 N·m. That is not comparable to the whole-complex values: different torque level, subtalar fixed, low load.

**Statement of uncertainty:** the loaded vs unloaded multiplier for yaw stiffness at ±5° is **unknown** from the sources I could read. A 3–4× increase is consistent with two indirect lines:
- the Lee 2014 whole-limb lower bound;
- the frontal-plane analogue (Matos 2021, ×4.1).

That is an inference, not a measurement. The full texts most likely to settle it are Watanabe 2012 (*Clin Biomech*), Watanabe 2009 (*Clin Biomech* 24(8):655–660, which compared 5 N and 700 N axial loads in intact ankles), Stormont 1985 and McCullough & Burge 1980.

### Q2. Talocrural vs subtalar vs midfoot contributions; mortise congruence

**How rotation divides between joints depends strongly on set-up and direction. The sources conflict:**

| Source | Read | Split |
|---|---|---|
| Siegler 1988 Part I (in vitro, unloaded, n = 15) | Abstract | Ankle and subtalar joints contribute **about equally** to IR/ER of the foot–shank complex |
| Bahr 1998 *KSSTA* (in vitro, 0 vs 375 N, n = 8, positional tests) | Abstract | Subtalar : tibiotalar motion ratio **4 : 1 for IR/ER** (3 : 1 for supination/pronation) |
| Button 2015 *J Biomech* (in vitro, 20° external foot rotation, n = 14) | Abstract | Talocrural **11.9 ± 2.8° vs subtalar 1.8 ± 1.6°**. Pre-eversion "unlocks" the subtalar joint (TC 10.5°, ST 2.4°) |
| Wei 2012 (shoe) | Abstract | Talus turns only 12–16° of 30° of shoe rotation |
| Lundberg 1989 Part 3, *Foot Ankle* 9:304 (in vivo, **weight-bearing**, roentgen stereophotogrammetry, n = 8) | Abstract | Leg rotation from internally rotated to neutral: motion mainly talar rotation in the mortise. Further external rotation: mainly **talonavicular and talocalcaneal**, plus some navicular–cuneiform |
| Nester 2003 *Foot Ankle Int* 24:164 (in vivo standing leg rotation) | Abstract | Ankle transverse-plane motion "generally greater than 15°". The ankle does not simply pass transverse moments on to the subtalar joint |
| McCullough & Burge 1980 | Abstract | About half of unloaded talar rotation is **fibular motion at the inferior tibiofibular joint** |

**Midfoot**
- Arndt 2007 (bone pins, running, n = 4; abstract): talonavicular transverse-plane motion **8.7 ± 1.4°**.
- Kitaoka, Lundberg, Luo & An 1995 (*Foot Ankle Int* 16(8), doi:10.1177/107110079501600806; in vitro, axial load to 667 N, no torque; abstract): screw-axis rotations from load alone were talonavicular 9.4 ± 2.2°, first metatarsal–navicular 7.2 ± 1.5°, talar–tibial 5.2 ± 1.6°, calcaneal–talar 4.4 ± 1.7°.
- So a large part of "foot vs shank yaw" with the forefoot planted happens distal to the hindfoot.

**Mortise congruence under load**
- Articular contribution to rotational stability: 30% (Stormont), 30% (Tochigi 2006), 60% (Watanabe 2012).
- Tochigi 2005 (*Foot Ankle Int*, PMC2268960; abstract): no peri-ankle ligament was reproducibly recruited during simulated stance; stance motion "appears to be primarily controlled by articular congruity."
- Mait 2018 (*OJSM*, PMC6077923, full text, 2 kN preload) describes the mechanism: under vertical preload, external rotation wedges the talar dome against both malleoli and spreads the syndesmosis.
- Uncertainty: the percentages come from serial-sectioning or model analyses with different definitions. They are not stiffness values.

### Q3. Subtalar axis obliquity and active yaw torque capacity

**Axis orientation**
- Inman (cadavers): mean **42° inclination from horizontal, 23° medial to the long axis of the foot**, with high variability.
  - Read in the open-access review Krähenbühl et al. 2017, *EFORT Open Rev* 2:309 (PMC5549175, full text), citing Stiehl, *Inman's Joints of the Ankle* (1991).
  - Ranges of 20.5–68.5° and 4–47° (Isman & Inman 1969) appeared only in a web-search snippet: **secondary, unverified**. I could not reach the original PDF (VA archive server rejected the connection).
- OpenSim gait2392 (Delp lineage), read directly from `gait2392_thelen2003muscle.osim`:
  - subtalar axis = (0.787, 0.605, −0.121) in the talus frame → **≈ 37° elevation and ≈ 9° medial deviation** *(computed)*;
  - ankle (talocrural) axis = (−0.105, −0.174, 0.979), about 10° off horizontal *(computed)*.

**What obliquity implies (vector projection, my inference)**
- A moment about the subtalar axis has a vertical component of sin(37–42°) ≈ **0.60–0.67** of its magnitude.
- Muscles that invert or evert about the subtalar axis therefore also produce foot adduction/abduction moments about the vertical/tibial axis.
- Direction:
  - Supinators (tibialis posterior) adduct the foot, which rotates the tibia externally over a planted foot.
  - Pronators (peronei) abduct the foot, which rotates the tibia internally.

**Moment arms**

| Source | Read | Values |
|---|---|---|
| Klein, Mattys & Rooze 1996, *J Biomech* 29:21 (in vitro, n = 10) | Abstract | About the subtalar joint: tibialis posterior **−19.1 mm** (inversion), tibialis anterior −3.8 mm, triceps surae mean −5.3 mm (changes sign), **peroneus longus 21.8 mm, peroneus brevis 20.5 mm** (eversion) |
| McCullough MB, Ringleb SI, Arai K, Kitaoka HB, Kaufman KR 2011, *Foot Ankle Int* 32:300 (in vitro, n = 5, axial + tendon loads) | Abstract | **Direct transverse-plane (IR/ER) moment arms.** Largest is **peroneus brevis 20.5 ± 6.4 mm**. Full table not obtained |
| Hintermann, Nigg & Sommer 1994, *Foot Ankle Int* 15:386 (n = 15) | Abstract | Relative invertor moment arms about the eversion–inversion axis: tibialis posterior 1.00, flexor digitorum longus 0.75, flexor hallucis longus 0.62, tibialis anterior 0.59, soleus 0.24, extensor hallucis longus 0.22, extensor digitorum longus −0.26, **peroneus longus −0.82, peroneus brevis −0.85** |
| Ziai 2013 *KSSTA* (in vitro, n = 12) | Abstract | With lateral ligaments cut, also cutting the **peroneus longus tendon significantly reduced the resisting torque** at 30° IR. Musculotendon units also resist yaw passively |
| Zuppke 2023 *J Biomech* (OpenSim) | Abstract | Subtalar axis origin and orientation significantly change subtalar moment arms and moments |

**Direct isometric foot IR/ER (adduction/abduction) torque**
- **No study measuring this about the tibial axis was found.**
- Closest: Houck 2008 (*Foot Ankle Int*, PMC3004286, full text via WebFetch). Isometric "subtalar inversion + forefoot adduction" **force** (not torque) in controls was 0.96–0.99 N/kg, non-WB, foot in 30–45° PF.
- Shoemaker & Markolf 1982 measured maximum isometric tibial torque with the foot locked (internal > external). That is whole-limb (mostly knee and hip muscles), and the values were not available.

**Conclusion:** humans do have active yaw torque capacity at the ankle–foot through muscles with transverse-plane moment arms of about 2 cm. Its magnitude in N·m is **not measured directly** in anything I could read.

### Q4. Coupling of subtalar eversion/pronation with tibial internal rotation ("movement transfer")

| Source | Condition | Finding |
|---|---|---|
| Hintermann, Nigg, Sommer & Cole 1994, *Clin Biomech* 9:349 | in vitro, n = 14 | Calcaneal eversion → significant internal tibial rotation. **Internal tibial rotation did not induce calcaneal eversion** (asymmetric). Large inter-specimen differences. Vertical load and foot flexion strongly affect transfer |
| Hintermann, Nigg & Cole 1994, *Clin Biomech* 9:356 | in vitro, selective fusions, n = 6 | Subtalar fusion cut transfer from calcaneal inversion to external tibial rotation by **71.8%**, and from external tibial rotation to calcaneal inversion by **35.8%**. Eversion ↔ internal tibial rotation transfer unchanged. The talocrural joint "must have more than 1 degree of freedom" |
| Hintermann & Nigg 1995, *Foot Ankle Int* 16:514 | in vitro, axially loaded | Axial loading alone → internal tibial rotation + calcaneal eversion. **10° DF → 2.1° internal tibial rotation (0.1° eversion); 10° PF → 1.3° external tibial rotation (1.6° inversion)** |
| Michelson & Helgemo 1995, *Foot Ankle Int* 16:577 | in vitro, up to 900 N, n = 13 | DF → about 2.5° ER (consistent in sign with the row above: foot ER relative to tibia = tibial IR relative to foot). Raising load from 50 to 750 N → 1–2° more ER and valgus |
| Tochigi 2000, *Foot Ankle Int* 21:486 | in vitro, axial load 9.8–686 N | Load alone → talocrural PF + **adduction**, subtalar eversion. (Sign conflicts with Michelson; set-ups differ) |
| Cass & Settles 1994, *Foot Ankle Int* 15:134 | in vitro, axial load on inverted hindfoot | **Intact: 11.1° external leg rotation with inversion** |
| Sommer 1996, *Foot Ankle Int* 17:79 | in vitro, n = 8 | Vertical loading "unimportant" to tibial rotation in their set-up; lateral ligaments matter |
| Lundberg 1989 Part 2, *Foot Ankle* 9:248 | in vivo, WB, stereophotogrammetry, n = 8 | **0.2° tibial ER per 1° of foot supination** (platform tilt) |
| Edo & Yamamoto 2018, *J Phys Ther Sci* 30:1479 (PMC6279692, full text) | in vivo, standing, skin markers, n = 54 | Ratio of shank rotation to calcaneal pronation/supination: **0.9 ± 0.3 (PF), 1.0 ± 0.2 (neutral), 1.3 ± 0.4 (DF)** |
| Nigg, Cole & Nachbauer 1993, *J Biomech* 26:909 | running, n = 30 | Eversion → internal leg rotation transfer rises with arch height (27% of variance) |
| Stacoff 2000, *Foot Ankle Int* 21:232 | bone pins, running, n = 5 | Coupling present in all subjects. Higher from heel strike to midstance than afterwards. "Far more complex than a simple mitered joint or universal joint model" |
| Reinschmidt 1997, *Clin Biomech* 12:8 | bone pins, running | Skeletal maximum eversion **8.6°**, vs 16.0° from external markers |
| Wei, Braman, Weaver & Haut 2011, *J Biomech* 44:2636 | in vivo, n = 6, **single-leg internal rotation of the body over a planted foot** | Hindfoot **dorsiflexion, eversion and external rotation** relative to the tibia (angles not in abstract) |

**Notes**
- The coupling ratio ranges from about 0.2 (bone markers, platform tilt) to about 1.3 (skin markers, DF). The large spread comes from different definitions, inputs and measurement methods.
- Lundberg's 0.2°/° and Edo's 0.9–1.3 measure **different quantities** (tibial rotation per degree of platform tilt vs per degree of calcaneal motion relative to the shank) and should not be averaged.
- Holden & Cavanagh 1991 (*J Biomech* 24:887; abstract): in the first half of running stance, the ground free moment acts to **resist foot abduction (a component of pronation)**. So the yaw moment at the foot–ground interface is coupled to pronation in vivo.

### Q5. Active muscle contribution to axial rotational stiffness of the loaded ankle/leg

**There is no in vivo measurement of transverse-plane stiffness of the ankle–foot alone, loaded and with controlled activation, in anything I could find or read.** The available evidence is indirect:
- **Whole limb, WB, active (Lee 2014, full text):** dynamic stiffness about 0.35–0.44 N·m/° at baseline, rising ≈ 20–30% after training. Since elements act in series, the ankle–foot is at least this stiff in that state *(inference)*.
- **Mote & Lee 1982 (abstract):** weight-bearing and muscle-induced bias torsion **increased** the knee, ankle and pelvis stiffness elements of a lower-limb torsion model identified in vivo. Ankle stiffness fell at larger amplitudes (no numbers).
- **Johnson & Hull 1988, *J Biomech* 21(5):401–415 (abstract):** in vivo transient torsional pulses of 0–100 N·m at the foot (n = 1). Weight-bearing changed the identified parameters (no numbers in abstract).
- **Knee:**
  - Louie & Mote 1987: torsional stiffness 0.16–2.54 N·m/° depending on co-contraction (more than 400% increase).
  - Markolf 1978, *JBJS-Am* 60:664 (abstract): tensing knee muscles increased (AP and varus–valgus) knee stiffness 2–4×.
  - Wojtys 2003, *JBJS-Am* 85:782 (abstract): voluntary muscle activation raises apparent knee torsional stiffness; women show an 18% smaller increase than matched men.
- **Frontal-plane analogue (Matos 2021):** ×4.1 at 100% BW. Muscle activity explained part but "could not completely explain" the rise.
- **STJ rotational equilibrium:** Payne 2003 (*J Am Podiatr Med Assoc* 93:131; abstract) found standing resistance to rearfoot supination correlated with **body weight (r = 0.52)** and with the distance from the fifth metatarsal head to the subtalar axis (r = 0.59). This supports the Kirby 2001 rotational-equilibrium idea: under load, the ground reaction's moment about the subtalar axis resists subtalar rotation. Because yaw is coupled to subtalar rotation (Q3/Q4), this is a **load-dependent yaw-resisting path that does not depend on ligament stiffness** *(inference from the mechanism; not a measured yaw stiffness)*.

### Q6. Is your single passive "fabd" coordinate standing in for a distributed human system? Yes.

In single support, rotation of the body about the vertical axis relative to a planted foot is spread across these elements in series:

1. **Talocrural transverse-plane laxity.** Not a pure hinge (Siegler 1988; Hintermann 1994). Resistance comes from ligaments unloaded and increasingly from mortise congruence when loaded (30–60%). Strongly nonlinear, with a neutral zone.
2. **Distal tibiofibular (fibular) motion.** About half of unloaded talar rotation (McCullough & Burge 1980).
3. **The yaw component of subtalar motion along an oblique axis** (≈ 37–42° inclined). This is:
   - coupled to inversion/eversion (pronation/supination) in both directions, with asymmetric transfer;
   - **actively controllable** by invertors and evertors (moment arms about 2 cm; McCullough 2011, Klein 1996);
   - **load-dependent** through the ground reaction moment about the subtalar axis (Payne 2003; Kirby 2001).
4. **Midfoot (talonavicular / transverse tarsal) transverse-plane motion.** About 9° in running (Arndt 2007); the dominant contributor in loaded external leg rotation per Lundberg 1989.
5. **Foot–shoe and shoe–ground compliance.** Wei 2012: only 12–16° of 30° of shoe rotation reached the talus.
6. **Tibial axial rotation at the knee.** About as much as the ankle–foot under ±10 N·m unloaded (Shoemaker & Markolf 1982). Strongly stiffened by co-contraction (Louie & Mote 1987).
7. **Hip rotation.** In series, with large active capacity. Not reviewed here.

**What your model lacks** (from the description given):
- the oblique subtalar coupling between IE and fabd;
- any active fabd torque (in humans this arrives through the subtalar obliquity and through muscles with transverse-plane moment arms);
- load-dependent and rate-dependent stiffening;
- nonlinear stiffening toward end range;
- midfoot yaw;
- possibly knee axial rotation, if the knee is a hinge.

**Two opposing consequences:**
- Lumping knee and midfoot compliance into fabd argues for **more** total yaw compliance than ankle-only data imply.
- Dropping the active subtalar path and the load-dependent articular and COP mechanisms argues that a purely passive orthogonal spring **under-represents** loaded human yaw resistance.

---

## 3. Implications for the model

### Supported by evidence, with the coordinate each value applies to

- **Unloaded, relaxed, small torque (≤ ~2 N·m): ≈ 0.10–0.15 N·m/°.**
  - Coordinate: calcaneus/foot vs tibia about the tibial long axis, with coupled DOFs free.
  - Sources: Watanabe 2012 in vivo; Hattori 2022 in vitro at 15–30° PF; Ficanha 2015 in vivo, which includes knee and shoe.
  - **Your current 0 N·m inside ±10° is softer than the unloaded human evidence. Your tested 0.11–0.15 N·m/° matches it.** With your IE axis actuated or held, the equivalent fabd-only stiffness would be ≥ these values.
- **Viscous damping (unloaded, relaxed, lower leg about the vertical axis): B ≈ 2.25 N·m·s/rad** (Ficanha 2015, second-order fit; includes the device/shoe inertia fit of 0.37 kg·m²).
- **Strong nonlinearity:** most compliant near neutral (Chen 1988). Average secants of about 0.8–1.7 N·m/° to 20–40° in vitro (Markolf 1989, Wei 2010, Mait 2017).
- **Viscoelasticity:** transient moments about 2.3–3.4× relaxed moments after a 21° ramp (Mait 2017, n = 2, in vitro).
- **Load raises rotational restraint qualitatively** (McCullough & Burge 1980; Stormont 1985; Tochigi 2006; Watanabe 2012). Articular geometry provides 30–60% of rotational stability under physiological/BW load.
- **Loaded, active, whole-limb pivot stiffness ≈ 0.35–0.44 N·m/° (dynamic, 2 Hz)** during weight-bearing stepping (Lee 2014). As a series element, the ankle–foot is ≥ this in that state.
- **Subtalar axis obliquity (≈ 37–42°)** implies IE ↔ yaw coupling and a vertical-axis component of subtalar moments of ≈ 0.6–0.67 (vector projection). Ankle muscles have **transverse-plane moment arms of up to about 20 mm** (McCullough 2011, peroneus brevis).
- **Knee axial rotation compliance is comparable to ankle–foot compliance** unloaded (Shoemaker & Markolf 1982). Knee torsional stiffness ranges 0.16–2.54 N·m/° with activation (Louie & Mote 1987).

### Not supported

- **A passive, loaded, small-angle (within ±5–10°) fabd stiffness of ≥ 1 N·m/°.** No measurement found.
  - Values of about 1–3 N·m/° appear only as **secants to 20–40°** (failure or near-failure tests, often with the subtalar joint constrained), or per degree of *talus* rotation inside a shoe.
  - Using them in the neutral zone would transplant end-range behaviour into a different coordinate range.
- **Li 2023's 0.43 N·m/° as a whole-complex value.** Subtalar and knee were screwed, ER only, 0–4 N·m secant, 150 N preload. Your rejection stands. It is at most a talocrural + syndesmosis value at a higher torque level.
- **Treating human foot yaw as purely passive and independent of inversion/eversion.** Contradicted by the subtalar axis geometry, the movement-transfer studies and the transverse-plane moment-arm data.

### Uncertain (would change the answer if resolved)

- **The loaded/unloaded multiplier for yaw stiffness near neutral.**
  - Indirect lines (Lee 2014 lower bound; frontal-plane ×4.1 analogue) are consistent with about 3–4×. That would give roughly 0.3–0.6 N·m/° loaded *(inference, not measured)*.
  - Obtaining Watanabe 2012 *Clin Biomech*, Watanabe 2009 *Clin Biomech* (5 N vs 700 N), Stormont 1985 and McCullough & Burge 1980 in full is the most direct way to settle it.
- **The size of active yaw torque at the ankle–foot** (no direct isometric measurement). Moment arms are known (about 2 cm); muscle forces in this task are not.
- **How rotation divides between talocrural, subtalar and midfoot under load.** Published ratios conflict (equal; 4 : 1 subtalar; about 6.6 : 1 talocrural) depending on boundary conditions, direction and pre-eversion.
- **Rate-dependent stiffening at small angles** (Mait 2017 is n = 2 and at 21°; Wei 2010 found no rate effect at failure).
- **Large inter-individual variation** in coupling and transfer (Hintermann 1994; Stacoff 2000), which limits any single "human" value.
- **Coordinate mismatch.** Hattori reports in ISB coordinates at 15–30° PF. In the ISB ankle joint coordinate system the IR/ER axis is embedded in the calcaneus **[RECALLED — unverified: Wu et al. 2002 ISB recommendation]**, so at plantarflexed positions it is not exactly your shank-long-axis fabd.

### Scoping note (my calculation, flagged)

- A planted human limb with ankle–foot yaw stiffness of about 0.4 N·m/° (the loaded-active lower bound above), on its own, would deflect about 10° to absorb a 1 N·m·s yaw impulse.
- This assumes whole-body yaw inertia ≈ 1.2 kg·m² **[RECALLED — unverified]** and ignores damping and active torque.
- So the 5° target in your scoping calculation may be stricter than what passive human ankle–foot mechanics alone would deliver.
- If the target is kept, the human-like way to meet it is through the paths your model lacks: subtalar-coupled active torque, load-dependent articular/COP restraint, and damping or rate stiffening. Raising a single passive spring to ≥ 1 N·m/° is not the route the evidence points to.

---

## 4. Sources

**Ankle–foot torque–rotation and laxity**
- Watanabe K et al. 2012 *Int Orthop* — https://pmc.ncbi.nlm.nih.gov/articles/PMC3251665/ (doi:10.1007/s00264-011-1376-6)
- Hattori S et al. 2022 *OJSM* — https://pmc.ncbi.nlm.nih.gov/articles/PMC9358583/
- Ficanha EM et al. 2015 *Front Bioeng Biotechnol* — https://pmc.ncbi.nlm.nih.gov/articles/PMC4672054/
- Li Y et al. 2023 *Indian J Orthop* — https://pmc.ncbi.nlm.nih.gov/articles/PMC10441913/
- Lee SJ et al. 2014 *MSSE* — https://pmc.ncbi.nlm.nih.gov/articles/PMC4140528/
- McCullough & Burge 1980 — https://doi.org/10.1302/0301-620X.62B4.7430225
- Stormont et al. 1985 — https://doi.org/10.1177/036354658501300502 (PMID 4051085)
- Chen, Siegler, Schneck 1988 (Part II) — https://doi.org/10.1115/1.3108456 ; Siegler, Chen, Schneck 1988 (Part I) — https://doi.org/10.1115/1.3108455
- Tochigi et al. 2006 — https://doi.org/10.2106/JBJS.E.00758 ; Tochigi et al. 2005 — https://pmc.ncbi.nlm.nih.gov/articles/PMC2268960/ ; Tochigi et al. 2000 — https://doi.org/10.1177/107110070002100607
- Watanabe et al. 2012 *Clin Biomech* — https://doi.org/10.1016/j.clinbiomech.2011.08.015 ; Watanabe et al. 2009 *Clin Biomech* — https://doi.org/10.1016/j.clinbiomech.2009.06.007
- Wei et al. 2010 — https://doi.org/10.1115/1.4002025 ; Wei et al. 2012 *JBE* — https://doi.org/10.1115/1.4005695 ; Wei et al. 2012 *JOR* — https://doi.org/10.1002/jor.22085 ; Wei et al. 2011 *J Biomech* — https://doi.org/10.1016/j.jbiomech.2011.08.010
- Button, Wei, Haut 2015 — https://doi.org/10.1016/j.jbiomech.2015.08.007
- Mait et al. 2017 — https://doi.org/10.1016/j.jbiomech.2017.01.006 ; Mait et al. 2018 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6077923/
- Markolf, Schmalzried, Ferkel 1989 (PMID 2504526) ; Johnson & Markolf 1983 — https://doi.org/10.2106/00004623-198365010-00011
- Clanton et al. 2017 — https://doi.org/10.1177/1071100716666277
- Bahr et al. 1998 — https://doi.org/10.1007/s001670050083

**Coupling and multi-joint kinematics**
- Lundberg et al. 1989 Parts 2 and 3 — https://doi.org/10.1177/107110078900900508 ; https://doi.org/10.1177/107110078900900609
- Nester et al. 2003 — https://doi.org/10.1177/107110070302400211
- Arndt et al. 2007 — https://doi.org/10.1016/j.jbiomech.2006.12.009 ; Kitaoka et al. 1995 *Foot Ankle Int* — https://doi.org/10.1177/107110079501600806
- Hintermann et al. 1994 *Clin Biomech* — https://doi.org/10.1016/0268-0033(94)90064-7 ; https://doi.org/10.1016/0268-0033(94)90065-5
- Hintermann & Nigg 1995 — https://doi.org/10.1177/107110079501600811 ; Michelson & Helgemo 1995 — https://doi.org/10.1177/107110079501600912 ; Cass & Settles 1994 — https://doi.org/10.1177/107110079401500308 ; Sommer et al. 1996 — https://doi.org/10.1177/107110079601700204
- Edo & Yamamoto 2018 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6279692/
- Nigg et al. 1993 — https://doi.org/10.1016/0021-9290(93)90053-H ; Stacoff et al. 2000 — https://doi.org/10.1177/107110070002100309 ; Reinschmidt et al. 1997 — https://doi.org/10.1016/s0268-0033(96)00046-0
- Holden & Cavanagh 1991 — https://doi.org/10.1016/0021-9290(91)90167-L

**Axis and moment arms**
- Krähenbühl et al. 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5549175/
- Klein et al. 1996 — https://doi.org/10.1016/0021-9290(95)00025-9 ; McCullough et al. 2011 — https://doi.org/10.3113/FAI.2011.0300 ; Hintermann et al. 1994 *Foot Ankle Int* — https://doi.org/10.1177/107110079401500708
- Ziai et al. 2013 — https://doi.org/10.1007/s00167-012-2273-2 ; Zuppke et al. 2023 — https://doi.org/10.1016/j.jbiomech.2023.111451
- Houck et al. 2008 — https://pmc.ncbi.nlm.nih.gov/articles/PMC3004286/
- Payne et al. 2003 — https://doi.org/10.7547/87507315-93-2-131 ; Kirby 2001 — https://doi.org/10.7547/87507315-91-9-465
- OpenSim gait2392 — https://raw.githubusercontent.com/opensim-org/opensim-models/master/Models/Gait2392_Simbody/gait2392_thelen2003muscle.osim

**Knee, whole leg and active stiffness**
- Shoemaker & Markolf 1982 — https://doi.org/10.2106/00004623-198264020-00010 ; Markolf et al. 1978 — https://doi.org/10.2106/00004623-197860050-00014
- Louie & Mote 1987 — https://doi.org/10.1016/0021-9290(87)90295-8 ; Mote & Lee 1982 — https://doi.org/10.1016/0021-9290(82)90254-8 ; Johnson & Hull 1988 — https://doi.org/10.1016/0021-9290(88)90146-7
- Wojtys et al. 2003 — https://doi.org/10.2106/00004623-200305000-00002
- Matos, Perreault, Ludvig 2021 — https://pmc.ncbi.nlm.nih.gov/articles/PMC8569913/

## 5. Gaps and full texts worth obtaining, in priority order

1. Watanabe 2012 *Clin Biomech* 27:189 — intact IR/ER torque–angle, unloaded vs BW.
2. Watanabe 2009 *Clin Biomech* — intact IR/ER at 5 N vs 700 N.
3. Stormont 1985 — loaded vs unloaded rotation and the torques used.
4. McCullough & Burge 1980 — loaded talar rotation values.
5. Mote & Lee 1982 — identified ankle torsional stiffness, WB vs non-WB, with muscle bias.
6. McCullough 2011 — the full transverse-plane moment-arm table.
7. Shoemaker & Markolf 1982 — maximum isometric tibial torques, plus the separate foot and tibia torque–rotation curves.
8. Wei 2011 *J Biomech* — in vivo hindfoot ER angles during planted-foot body rotation.
9. Lundberg 1989 Part 3 and Kobayashi 2014 *Foot Ankle Spec* — in vivo weight-bearing talocrural/subtalar/midfoot yaw breakdown.
10. Clanton 2017 — intact torque at 15° ER under 750 N.

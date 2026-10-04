# Knee axial rotation: active control, strength, moment arms, task use, and how planted-leg yaw is shared

Literature review knee2. Prepared 2026-10-04 for the Physical Character V2 model. In that model the knee axial DOF is actuated (0.35 N·m/kg per direction, about 27 N·m at 78 kg) and the ankle has a separate passive foot-vs-shank axial coordinate. This review builds on lit2 (`lit2_knee_axial.md`: passive ROM, laxity, stiffness) and lit3 (`lit3_stance_yaw_demand.md`: free moment, ankle axial moment, traction). It does not repeat their content. Where a lit2 or lit3 value is reused, it is marked "(lit2)" or "(lit3)" and keeps its original tag.

## Provenance tags

- **[FT]**: I read the full text myself (Europe PMC XML or the PMC page).
- **[FT-sum]**: I read the full text only through the WebFetch page summariser, so numbers could not be checked against tables.
- **[ABS]**: I read the PubMed or Europe PMC abstract only.
- **[SEC: X]**: the value comes from secondary source X, which I read. I did not read the primary paper.
- **[FIG]**: I read the value myself off a published figure image. Approximate, about ±1–2°.
- **[SNIP]**: the value appears only in a search-engine summary. The publisher page was blocked (403/402). Lowest confidence.
- **[DERIVED]**: my own arithmetic or inference. The method is stated each time.
- **[RECALLED — unverified]**: from memory. Do not rely on these.

**Conventions.** IR/ER = tibial internal/external rotation relative to the femur. "Bone-level" means bone pins, biplane or dual fluoroscopy, stereoradiography, or MRI/CT. "Foot-level" means a boot, footplate or device that rotates the foot (lit2 found foot-level ≈ 2× bone-level). Reference body for conversions: 78 kg.

---

## 0. Summary of findings

1. **Active vs passive ROM.**
   - Voluntary (active) foot-level rotation reaches about **77–87% of the passive end range**. In men: active IR 32.8° vs passive 37.9°, active ER 39.2° vs passive 48.9° (Muaidi 2017 [ABS]; ratios [DERIVED]).
   - **No bone-level measurement of voluntary tibial rotation at full extension was found.**
   - Indirect evidence says voluntary axial authority near extension is small:
     - passive laxity is smallest there (lit2);
     - hamstring loading changes tibial rotation at every flexion angle **except full extension** (Li 1999 [ABS]);
     - rotator moment arms peak at 70–90° flexion (Buford 2001 [ABS]).
   - Under body weight, however, the tibia does rotate about 12° (ER) relative to the femur at only 4–6° flexion during a 180° pivot on a planted foot (Khodabandeloo 2026 [FIG]). That is load-driven rotation near extension, not proof of voluntary control.
2. **Strength.**
   - Isometric rotator torque at 80° flexion, neutral axial angle, healthy men (≈80 kg): **IR 0.39, ER 0.46 N·m/kg**, i.e. ≈31–37 N·m (Królikowska 2015 [FT]).
   - Torque depends strongly on axial angle. IR torque is ×1.49 at 30° ER and ×0.62 at 25° IR (foot-level angles). ER torque is ×0.65 at 30° ER and ×1.09 at 25° IR [DERIVED from FT].
   - Isokinetic 60°/s: IR ≈ ER ≈ 0.46 N·m/kg [FT]; IR 27.8 N·m at 90° (Armour 2004 [ABS, converted]).
   - Flexion dependence: 45° gives 11–16% more torque than 20° (Shoemaker 1988 [ABS]). 45° < 90° (Osternig 1980 [SNIP]).
   - **No strength data exist at 0° or beyond ≈100°.**
   - Women have lower ER strength (Kiriyama 2009 [ABS]).
   - Torque correlates only weakly with body weight (Shoemaker 1988 [ABS]).
   - Our 0.35 N·m/kg equals 0.76–0.90× the measured neutral isometric value at 80°.
3. **Moment arms.**
   - Only **one experimental knee-IE moment-arm dataset exists** (Buford 2001), according to a 2025 systematic collection of 300 datasets (Chen & Franklin 2025 [FT]).
   - At 30° flexion: medial rotators (SM, ST, GR, SA) 6–14 mm, popliteus 0–10 mm, biceps femoris 15–30 mm [ABS; SEC digitised].
   - Moment arms peak in flexion: IR at 70°, ER at 90° [ABS].
   - **No values at 0° were accessible.**
   - **No measured knee-IE moment arms exist for gastrocnemius or TFL/ITB.** One model study lists TFL as an external rotator [ABS].
   - Conclusion: active axial torque is smaller near extension than at 60–90°, but "near zero at 0°" is **not demonstrated**.
4. **Task use (bone-level).**
   - Across 17 gold-standard datasets (walking, running, drop landing, hopping, stairs, cutting), tibiofemoral IR stays within **−1° to +15°** of the full-extension pose. It is mostly coupled to flexion (Gasparutto 2017 [FT]).
   - Per-task excursion: walking 5–10°, running 7–14°, hopping 2.5–7°, cutting 6.5–7° (means) [DERIVED from SEC data].
   - Landing: the departure from the passive flexion-coupled path is only **≈3–6°** (Myers 2011 [FT]).
   - 180° pivot on a planted foot: ≈12° ER excursion at 4–6° flexion [FIG].
   - Peak external knee internal-rotation moment (KIRM):
     - sidestep cut 0.24 ± 0.21 N·m/kg (n = 702; Mausehund 2024 [FT]);
     - COD 45°→180° in male footballers 0.32 → 0.86 N·m/kg (Li & Qian 2025 [FT]);
     - 180° pivot 0.4–0.5 N·m/kg (Leppänen 2021 [FT]; Zou 2024 [FT]).
   - At 78 kg that is ≈19–67 N·m [DERIVED], i.e. up to 2.5× the model's actuator capacity.
5. **How planted-leg yaw is shared.**
   - **No study partitions body yaw over a planted foot into hip / tibiofemoral / ankle-foot / shoe–ground at bone level.**
   - Indirect evidence is consistent:
     - The knee takes ≲10–15° per stance (above).
     - The tibia–calcaneus–midfoot chain takes ≈5–15° (lit3).
     - The foot can pivot on the ground: 18 ± 12° in stop-and-turn on turf (lit3).
     - **The hip takes the rest.** Footballers' passive hip ROM is IR ≈21–26°, ER ≈31–34° (Figueroa-Mayordomo 2026 [FT]).
   - Rotation imposed at the foot is "resolved at the hip", with tibiofemoral changes "barely detectable" (Lafortune 1994 [ABS], bone pins).
   - In football pressing actions the hip rotated ≈17° within 100 ms while the knee stayed near neutral (Sasaki 2018 [ABS]).
6. **Modelling bottom line.**
   - **(a)** Keep the knee axial DOF actuated, but low-authority. Make capacity depend on flexion (and on axial angle). Its main job is stiffness and small corrections.
   - **(b)** It operates in roughly −12° to +18° around the full-extension zero, or about ±6–10° around the flexion-coupled neutral.
   - **(c)** The knee's share of body yaw over a planted foot is about ≤20–30% in ordinary cuts and <10% in 180° pivots. The hip is the main yaw joint.
   - **(d)** The knee actuator must not be assigned:
     - hip yaw;
     - shoe–ground pivot;
     - static tibial torsion;
     - subtalar/ankle-coupled shank rotation;
     - screw-home coupling (which is kinematic);
     - the large external KIRMs of sharp cuts. In weight-bearing those are carried mainly by compression-dependent articular conformity and ligaments.

---

## 1. Voluntary (active) vs passive tibial rotation, as a function of flexion

| Source | Method | n | Task / flexion | Values | Read | Confidence |
|---|---|---|---|---|---|---|
| Muaidi 2017, *J Back Musculoskelet Rehabil* 30:1237, doi:10.3233/BMR-169613 | Knee rotatory kinaesthetic device (KRKD): foot on a low-friction rotating device, closed chain (device: Muaidi 2007 [ABS]); active (self-generated) vs passive (examiner) | 30 (15 M, 15 F) | Flexion not given in abstract | Active IR: M 32.80 ± 3.64°, F 41.29 ± 7.46°. Passive IR: M 37.94 ± 5.22°, F 53.43 ± 11.67°. Active ER: M 39.16 ± 5.46°, F 49.71 ± 11.37°. Passive ER: M 48.89 ± 7.09°, F 62.29 ± 13.74°. **Active/passive:** M IR 0.86, ER 0.80; F IR 0.77, ER 0.80 [DERIVED]. **F/M:** active ≈ 1.26–1.27; passive IR 1.41, ER 1.27 [DERIVED] | ABS | Moderate (foot-level; ≈2× bone-level) |
| Muaidi, Nicholson & Refshauge 2009, *Scand J Med Sci Sports* 19:103, doi:10.1111/j.1600-0838.2008.00783.x | KRKD + dynamometer | 18 Olympic-level soccer players vs 18 non-athletes | — | Athletes: **less passive rotation ROM** (P = .001), higher isometric rotation strength (P = .006), better rotation proprioception | ABS (numbers: see §2, SNIP only) | Moderate for direction |
| Osternig, Bates & James 1980, *MSSE* 12:195 (PMID 7402056) | Isokinetic boot, active | 28 M | 45°, 90° | Active total ROM 57° / 59° (R/L) at 90°; 50° at 45°. ROM and torque both lower at 45°. 90–100% of peak torque reached in the first 5–10° of active rotation, then sustained over a further 15–20° | SNIP (no PubMed abstract; Ovid 402) | Low |
| Mossberg & Smith 1983, *JOSPT* 4:236, doi:10.2519/jospt.1983.4.4.236 | Active, seated, foot on platform | 85 F | 70°, 90°, 100° | Total 35 → 40 → 44°; ER ≈ 2× IR | SNIP (lit2) | Low–moderate |
| Zarins et al. 1983, *AJSM*, doi:10.1177/036354658301100308 (comparator, passive) | Passive end-feel | 17 | 5–90° | 5°: IR 10 / ER 23°. 30–90°: ≈25 / ≈45° | ABS (lit2) | Moderate (foot-level) |
| Testa et al. 2012, *Orthop Traumatol Surg Res* 98:159, doi:10.1016/j.otsr.2011.08.017 | Optical tracking of femur and tibia, **active rotation while weight-bearing** | 11 | **Extension** and 30° | Subjects performed active IR/ER with the knee extended and at 30°; IR, ER and total were measured at both angles; ICC > 0.9 (values not in abstract) | ABS | Qualitative: active rotation in extension is measurable |
| Jeon & Hong 2021, *J Back Musculoskelet Rehabil* 34:589, doi:10.3233/BMR-200110 | IMU; active vs passive extension | 20 M | 90° → 0° | Tibial longitudinal-rotation waveforms differ between active and passive extension (CMC 0.63). Screw-home "increased abruptly during the last 20°" of **active** extension | ABS | Low–moderate (IMU) |
| Myers et al. 2012, *AJSM* 40:170, doi:10.1177/0363546511423746 | Biplane fluoroscopy | 10 F | Unweighted active extension 90 → 0°; walking; max isometric extension at 70°; 40 cm drop-jump | Peak IR: unweighted extension 14.5 ± 7.7°, isometric 15.9 ± 6.7°, landing 19.4 ± 5.7°, walking 3.9 ± 4.2°. Quadriceps-driven extension alone produces IR of the same order as landing | ABS | Moderate–high |
| Khodabandeloo et al. 2026, *OJSM* 14:23259671261422732, doi:10.1177/23259671261422732 (PMC13050415) | Dual fluoroscopy + CT model tracking | 11 (healthy contralateral knees of ACLR+M patients) | **180° pivot, foot kept stationary**, flexion ≈4–6° throughout the analysed window | Tibia goes from ≈0° to ≈−12° (ER) relative to femur across the window (90% → peak → 90% of lateral-knee-marker AP position) | FIG (Fig. 4); task FT | Moderate (window is part of the pivot; frame zero not normalised to extension) |
| Quanbeck et al. 2017, *J Sports Sci* 35:331, doi:10.1080/02640414.2016.1164335 | Functional hip/knee joint-centre motion capture, ballet turnout | 10 F dancers | Standing, knees extended | Bilateral knee ER 41 ± 5.9° (32% of 135° total turnout), i.e. ≈20° per leg [DERIVED]; hip ER 49° bilateral (36%) | ABS | Low (skin markers; conflicts with Grossman) |
| Duncan et al. 2020, *Med Probl Perform Art* 35:96, doi:10.21091/mppa.2020.2015 | Motion capture, turnout | 23 F dancers | Standing, low-friction discs vs floor | Knee ER 18.5 ± 4.8° on low-friction discs, larger with floor friction | ABS | Low (skin) |
| Grossman et al. 2008, *J Dance Med Sci* 12:142 (PMID 19618571) | Goniometer, markers, MRI | 14 F dancers | Extended | "When the knee is extended and locked ('screwed home') it will not factor into a whole-leg turnout value" | ABS | Low–moderate (assertion) |
| Carter et al. 2018, *J Sports Sci* 36:2217, doi:10.1080/02640414.2018.1446386 | 3D kinematics | dancers | — | Measured active and passive tibiofemoral rotation (values not in abstract). Dancers compensate by pronating rather than rotating the knee | ABS | — |

**Interpretation.**

- **Active ROM is a large fraction of passive ROM at 70–100° flexion.**
  - Foot-level active ≈ 0.8× passive (Muaidi 2017).
  - Osternig's isokinetic active total of 57–59° at 90° is close to foot-level passive end-feel values (lit2: Almquist 72–79° at 9 N·m) [DERIVED comparison].
  - Applying lit2's ≈½ foot-to-bone factor, bone-level **active** total at 90° is ≈30–36° in men [DERIVED, low confidence].
- **Active ROM shrinks with less flexion.** 50° at 45° vs 57–59° at 90° (Osternig [SNIP]). Total 35° at 70° vs 44° at 100° (Mossberg [SNIP]).
- **Near full extension, no study measured voluntary rotation at bone level.**
  - Testa 2012 shows people can produce measurable active rotation standing with an extended knee, but the abstract gives no numbers.
  - The turnout studies (skin markers) report ≈18–20° "knee ER" per leg standing with extended knees. That conflicts with Grossman's claim that the locked knee does not contribute, and skin artefact is large in the transverse plane (§4).
  - Classic anatomy teaching says voluntary axial rotation is possible only with the knee flexed [RECALLED — unverified].
  - **Best reading:** active rotation at 0–10° is small, a few degrees, and mostly within the passive laxity envelope (lit2: ≈16° total at ≈5 N·m at 0°). Voluntary axial control becomes substantial from about 20–30° flexion [DERIVED].
- **Under load near extension, rotation does occur.** In the dual-fluoroscopy pivot (Khodabandeloo [FIG]) the tibia rotated ≈12° relative to the femur at ≈5° flexion. This is the load-driven envelope that a pivoting, nearly straight stance leg actually uses. It is probably mostly passive (hip/foot torques acting through articular and ligament restraint) [DERIVED].
- **Sex and athletic status.**
  - Women: ≈26% more active and 27–41% more passive foot-level rotation [DERIVED from ABS].
  - Elite soccer players: less passive ROM, more strength (Muaidi 2009 [ABS]). A male footballer sits at the stiff, strong end.

---

## 2. Isometric / isokinetic IR and ER strength vs flexion

| Source | Method | n | Flexion / condition | Values | Read | Confidence |
|---|---|---|---|---|---|---|
| **Królikowska, Czamara & Kentel 2015**, *Med Sci Monit* 21:2084, doi:10.12659/MSM.893930 (PMC4514330) | Humac Norm (Cybex); supine; **knee 80°, hip 80°, ankle 90°**; isometric (6 s) at 6 shin-rotation angles; isokinetic 60 and 180°/s | 20 healthy male controls (80.75 ± 7.77 kg) + 12 test-retest males (79.5 kg) + 2×20 ACLR | 80° | **Isometric IR, N·m/kg (controls, right leg):** 30° ER 0.58 ± 0.11; 20° ER 0.51; 10° ER 0.45; neutral 0.39 ± 0.07; 10° IR 0.34; 25° IR 0.24 ± 0.07. **Isometric ER:** 30° ER 0.30 ± 0.07; 20° ER 0.37; 10° ER 0.43; neutral 0.46 ± 0.08; 10° IR 0.48; 25° IR 0.50 ± 0.10. **Isokinetic peak (controls):** 60°/s IR 0.46 ± 0.10, ER 0.46 ± 0.07; 180°/s IR 0.39, ER 0.41. **Absolute (test-retest, right leg, session 1):** IR 52.4 (30° ER) → 36.1 (neutral) → 22.5 N·m (25° IR); ER 24.8 → 38.9 → 43.3 N·m; PT 60°/s IR 41.5, ER 37.9 N·m. ICC 0.70–0.97 | FT | **High** (best healthy data set) |
| Armour et al. 2004, *AJSM* 32:1639, doi:10.1177/0363546504263405 | Cybex isokinetic; ankle brace | 30 (≥2 y post-ACLR; non-operated limb) | 90° | IR peak, non-operated limb: 20.5 ± 4.7 / 15.9 ± 3.8 / 13.4 ± 3.8 ft-lb at 60 / 120 / 180°/s = **27.8 / 21.6 / 18.2 N·m** [DERIVED ×1.3558]. ER "statistically similar" between limbs (values not in abstract) | ABS | Moderate |
| Shoemaker et al. 1988, *Clin Orthop* 228:164 (PMID 3342561) | Max twist against a fixed footplate with torque cell | 18 M | 20°, 45°; seated vs single-leg flexed stance; restrained vs free torso | 30–71 N·m by condition. **45° gives 11–16% more than 20°.** Stance 19–49% > seated. Free pelvis/torso +17–49%. Restrained: IR = ER. Unrestrained: IR 12% > ER. **No strong correlation with body weight or height** | ABS | Moderate–high |
| Osternig, Bates & James 1980 (PMID 7402056) | Isokinetic | 28 M | 45°, 90° | Torque lower at 45° than 90° (no numbers available). Peak reached in the first 5–10° of rotation | SNIP | Low |
| Osternig et al. 1981, *Arch Phys Med Rehabil* 62:381 (PMID 7259471) | Isokinetic | 15 M | — | Peak rotary torque within the first 5–10° of motion; rotation strength not predictable from flexion strength | ABS | Moderate |
| Oshimo et al. 1983, *MSSE* 15:529 (PMID 6656564) | Modified Cybex II, orthotic boot | 40 (20 M, 20 F) | Knee 90°; hip 120 / 90 / 45 / 10° | Greatest IR torque at hip 120° in 60% of M and 65% of F; 120° vs 10° significant (P < .001). The biarticular length–tension effect is large | ABS | Moderate |
| Kiriyama, Sato & Takahira 2009, *AJSM* 37:168, doi:10.1177/0363546508324692 | Isometric dynamometer, supine | 169 (81 F, 88 M), 17 y | **30°** | Women had significantly less ER strength (P < .001). ER strength vs peak shank IR in single-leg drop landing: r = −0.32 | ABS | Moderate (numbers not accessible) |
| Torry et al. 2004, *Clin J Sport Med* 14:325, doi:10.1097/00042752-200411000-00001 | Isokinetic 60 / 120 / 180°/s | 102 (34 controls) | Not in abstract | Gender main effect not significant for IR (P = .07) or ER (P = .48) torque | ABS | Moderate |
| Muaidi et al. 2009 (above) | Dynamometer | 18 soccer vs 18 | — | Soccer players stronger (P = .006); ER > IR (P = .001). Snippet values in **newtons** (lever arm unknown, not convertible): players ER 121 / 118 N, IR 88 / 94 N; controls ER 93 / 92 N, IR 77 / 76 N | ABS + SNIP | Low for numbers |
| Viola 2000, doi:10.1177/03635465000280041801; Segawa 2002, doi:10.1053/jars.2002.29894; Zhang 2002, doi:10.1097/00005768-200201000-00002 | Isokinetic / multi-axis | 23 / 62 / 81 | — | ST/G harvest → IR weakness; female patients recover less (Segawa); chronic ACL-deficient patients show a lower IR/ER ratio (compensation) | ABS | Moderate (direction) |
| *Comparator:* Figueroa-Mayordomo et al. 2026, *Front Sports Act Living*, doi:10.3389/fspor.2026.1837082 (PMC13267181) | Hand-held dynamometer + inclinometer, hip rotators | 56 amateur soccer players | Hip 0° and 90° | Hip IR 0.082–0.126, ER 0.093–0.107 kg·m/kg = **0.80–1.24 / 0.91–1.05 N·m/kg** [DERIVED ×9.81]. Passive hip ROM: IR 21–26°, ER 31–34° | FT | Moderate |

**Flexion dependence.**

- Only three data points constrain the shape:
  - 20° ≈ 0.86–0.90× 45° (Shoemaker 1988 [ABS]);
  - 45° < 90° (Osternig [SNIP]; magnitude unknown);
  - lit2 adds that Shoemaker & Markolf 1982 found ER torque rising from 20° to 90° while IR changed less [ABS].
- **No measurements at 0–15° or >100° were found** (searched: "tibial rotation strength", "rotary torque", "knee rotators", isometric/isokinetic + flexion angles; Pedersen, Mikkelsen, Hagood, Fan → no rotation-strength papers).
- If 45° ≈ 0.9× 90° [assumption], then 20° ≈ 0.77–0.81× the 90° value [DERIVED].

**Axial-angle dependence is at least as large as the flexion dependence** (Królikowska [FT]).

| Shin rotation (foot-level) | IR torque / neutral | ER torque / neutral |
|---|---|---|
| 30° ER | 1.49 | 0.65 |
| 20° ER | 1.31 | 0.80 |
| 10° ER | 1.15 | 0.93 |
| 0° | 1.00 | 1.00 |
| 10° IR | 0.87 | 1.04 |
| 25° IR | 0.62 | 1.09 |

Ratios are [DERIVED]. Each rotator group is strongest when the tibia is rotated away from its pulling direction, i.e. when the muscle is lengthened. Device angles are foot-level, so the equivalent bone-level span is roughly half (≈±12–15°) [DERIVED from the lit2 ≈2× factor].

**Magnitude vs the model.** At 80° flexion and neutral axial angle, healthy men produce IR 0.39 and ER 0.46 N·m/kg isometric, about 0.46 N·m/kg isokinetic at 60°/s. At 78 kg: IR 30 N·m, ER 36 N·m at neutral; best-angle peaks IR 45, ER 39 N·m [DERIVED].

- The model's 0.35 N·m/kg is 0.90× (IR) and 0.76× (ER) the neutral isometric values. That is modestly conservative for 70–90° and likely more so for elite footballers (Muaidi 2009: stronger).
- Restrained single-leg twisting torques of ≥30 N·m (Shoemaker 1988) are consistent with this.

**Sex and mass scaling.**

- Female ER strength is lower (Kiriyama [ABS]).
- In patients, absolute IR/ER torque showed no significant sex main effect (Torry 2004 [ABS]).
- Body weight and height correlate only weakly with twisting torque (Shoemaker 1988 [ABS]).
- **Per-kg scaling is acceptable within a narrow athlete mass band, but is not strongly supported.**
- The hip rotators are ≈2× stronger per kg than the knee rotators [DERIVED from FT; different devices, so the comparison is order-of-magnitude only].

---

## 3. Moment arms about the tibial axial axis vs flexion

| Source | Method | n | Flexion | Values | Read | Confidence |
|---|---|---|---|---|---|---|
| **Buford et al. 2001**, *Knee* 8:293, doi:10.1016/s0968-0160(01)00106-5 | Cadaver tendon excursion vs IE rotation angle | 17 hemipelves | Flexion range (≥90°) | 7 of 13 muscles significant. **External rotators:** biceps femoris long and short head. **Internal rotators:** gracilis, sartorius, semimembranosus, semitendinosus, popliteus. **Moment arms greatest in flexion: IR peak at 70°, ER peak at 90°.** At 30° (min–max over the IE range): SM 10.1–11.6, ST 6.8–9.0, GR 6.0–15.7, SA 8.2–14.1, POP 0.0–10.4, BFsh 14.7–27.9, BFlh 18.5–31.5 mm. ACL deficiency changed moment arms only at extremes of flexion-extension | ABS | Moderate |
| Buford 2001 30° curves, digitised in **Chen & Franklin 2025 dataset** (doi:10.1007/s10439-025-03735-w; data figshare doi:10.6084/m9.figshare.26018563) | Digitised from the Buford figure | — | **30° only** | Moment arm (mm) at IE −15 / −10 / −5 / 0 / +5 / +10° (ER−, IR+): **ST** 13.7 / 14.2 / 11.2 / 9.1 / 8.2 / 8.2. **SM** 14.1 / 13.6 / 12.8 / 9.7 / 8.1 / 6.1. **GR** 10.3 / 10.9 / 11.2 / 10.5 / 10.9 / 11.6. **SA** 8.3 / 8.3 / 8.3 / 7.1 / 7.9 / 8.3. **POP** 0 / 6.7 / 9.9 / 8.7 / 3.9 / 3.1. **BFlh** −18.8 / −18.6 / −22.0 / −25.1 / −26.4 / −30.4. **BFsh** −14.9 / −14.9 / −17.3 / −20.1 / −20.5 / −26.2 | SEC: Chen 2025 (.mat file I read) | Moderate |
| Chen & Franklin 2025, *Ann Biomed Eng* 53:1757 (PMC12283864) | Systematic collection: 72 studies, 300 datasets | — | — | Knee ex-/internal-rotation moment-arm datasets come **only from Buford 2001** (one each for BFlh, BFsh, SM, ST, GR, SA, POP). **No knee-IE datasets for gastrocnemius or TFL.** 2D centre-of-rotation methods project 3D moment arms and can misstate axis-dependent values | FT | High (as a statement of evidence scarcity) |
| Buford et al. 1997, *IEEE Trans Rehabil Eng* 5:367, doi:10.1109/86.650292 | Cadaver | 15 | FE axis | Knee has two non-orthogonal, non-intersecting axes (FE and longitudinal rotation). Flexion moment arms only | ABS | — |
| Cleather 2018, *J Theor Biol* 455:101, doi:10.1016/j.jtbi.2018.07.013 | FreeBody model, vertical jump | 12 athletic M | Jump | BF and **TFL** are external rotators. SM, ST, SA, GR, popliteus and **patellar tendon** are internal rotators. Hamstring IE moments are of similar magnitude to their flexion moments | ABS | Moderate (model) |
| Li et al. 1999, *J Biomech* 32:395, doi:10.1016/s0021-9290(98)00181-x | Robotic cadaver testing | 10 | 0–90° | 200 N quadriceps → tibial IR, increasing 0 → 30° then decreasing. Adding 80 N hamstrings **reduced IR at all angles except full extension** (−30% at 30°) | ABS | Moderate–high (functional evidence of small axial authority at 0°) |
| Li et al. 2004, *J Orthop Res* 22:90, doi:10.1016/S0736-0266(03)00118-9 | Robotic cadaver testing | 13 | 0–150° | Muscle loads changed rotation from 0 to 120° but **had little effect at 150°** (knee "highly constrained") | ABS | Moderate |
| Kwak 2000 (doi:10.1002/jor.1100180115); Victor 2010 (doi:10.1002/jor.21019); Shalhoub 2016 (doi:10.1002/jor.23185); MacWilliams 1999 (doi:10.1002/jor.1100170605); Chevalier 2023 (doi:10.1016/j.knee.2022.11.025) | Cadaver muscle loading | 4–8 | Flexion ranges | Hamstrings → tibial ER and reduced IR. Lateral hamstrings more influential than medial. Higher medial:lateral ratio → more IR. ITB load → **2.4° ER**, smaller effect than hamstrings. Gastrocnemius (triceps) activation → **increased** laxity width | ABS | Moderate |
| Maniar et al. 2018, *Sci Rep* 8:2501, doi:10.1038/s41598-017-19098-9 (PMC5802728) | OpenSim; knee 1-DOF with IE coupled to flexion | 8 M (77.6 kg), unanticipated 45° sidestep | Weight acceptance | Knee transverse **joint reaction** moment: ER, peak **25 N·m** (≈0.32 N·m/kg). Contributors: vasti up to 23 N·m, soleus up to 10 N·m (through the coupled kinematics). Gluteals oppose (2–10 N·m) | FT | Low–moderate (model-dependent) |
| van den Bogert, Reinschmidt & Lundberg 2008, *J Biomech* 41:1632, doi:10.1016/j.jbiomech.2008.03.018 | Bone pins, running | 3 | Stance | Finite helical axis tilts up to ≈15° medially during flexion. Moment arms must be defined about the functional axis; the knee needs more than one kinematic DOF | ABS | Moderate |
| Wretenberg et al. 1996, *Clin Biomech* 11:439, doi:10.1016/s0268-0033(96)00030-7 | MRI | 17 | 0, 30, 60° | Sagittal and frontal moment arms only (no axial). Sex- and angle-specific | ABS | — |

**Capacity check from moment arms [DERIVED].** I multiplied the Buford 30° moment arms (Chen dataset) by the generic OpenSim gait2392 maximal isometric forces, read from the model file: SM 1288, ST 410, GR 162, SA 156, BFlh 896, BFsh 804 N. Credits: Delp 1990, doi:10.1109/10.102791. Popliteus is not in that model, and force–length effects and activation limits are ignored.

| IE angle at 30° flexion | −15° | −10° | −5° | 0° | +5° | +10° |
|---|---|---|---|---|---|---|
| IR capacity (N·m) | 26.7 | 26.4 | 24.2 | 19.0 | 16.8 | 14.4 |
| ER capacity (N·m) | 28.8 | 28.6 | 33.6 | 38.7 | 40.1 | 48.3 |

- Order of magnitude agrees with Królikowska's measured 31–37 N·m at 80° [FT].
- The **direction of the axial-angle dependence agrees** with the measured torques: IR is strongest with the tibia externally rotated, ER strongest with it internally rotated.

**Is the axial moment arm (and active axial torque) near zero at full extension?**

- **Not demonstrated, but it is smaller than in flexion.**
- Evidence for "smaller near extension":
  - peak moment arms at 70–90° (Buford [ABS]);
  - hamstring force has no measurable effect on tibial rotation at full extension, but does at 15–60° (Li 1999 [ABS]);
  - at extension the pes and hamstring tendons run nearly parallel to the tibial long axis, so their tangential (axial-moment) component is small [DERIVED geometric reasoning];
  - lit2: passive axial stiffness is highest at extension (Markolf 1976), so muscles have the least relative effect there.
- Evidence against "near zero":
  - at 30° the moment arms are already 7–30 mm (except popliteus at some rotations);
  - twisting torque at 20° is still 86–90% of 45° (Shoemaker 1988).
- **Capacity should be flexion-scaled** (minimum near 0°, plateau from ≈60° to ≥90°) **and axial-angle-scaled**.
- **Gastrocnemius and TFL/ITB**: no measured knee-axial moment arms exist. TFL/ITB acts as a weak external rotator [ABS]. Gastrocnemius adds laxity in cadavers rather than torque [ABS]. They should not drive the knee axial DOF in the model.

---

## 4. Knee axial rotation and moments during football-relevant tasks

### 4.1 Bone-level kinematics

| Source | Method | n | Task / flexion | Axial rotation | Read | Confidence |
|---|---|---|---|---|---|---|
| **Gasparutto et al. 2017**, *Appl Bionics Biomech* 2017:1908618, doi:10.1155/2017/1908618 (PMC5405570) | Synthesis of 17 gold-standard studies (pins, biplane, stereo-X), digitised and transformed to the ISB convention, **zero at 0° flexion** | 126 subjects total | Walk / drop / hop / stairs / run / cut; flexion +4° to −61° | Across all datasets **IR ranged from −1° to +15°**. IR "mainly" accompanies flexion. "The effect of the dynamic activities on the couplings… appeared limited" | FT | High |
| ↳ Per-study data (supplementary .xls I parsed) | — | — | — | IR min–max (excursion) at flexion min–max; mean slope IR/flex. **Walking:** Lafortune 1992 0–10.0 (10.0°), Benoit 2006 4.9–10.3 (5.4°), Benoit 2007 3.9–9.8 (5.9°), Kozanek 2009 −0.9–9.1 (10.0°), Li 2009 −0.1–6.8 (6.9°), Farrokhi 2012 1.3–7.8 (6.4°). **Drop landing:** Torry 2011 0–2.7 (2.7°). **Hop:** Beillas 2004 1.4–8.6 (7.2°), Deneweth 2010 2.8–5.3 (2.5°). **Stairs:** Kozanek 2011 −0.5–2.1 (2.6°), Li 2012 8.9–10.0 (1.2°). **Running:** Reinschmidt 1996 1.2–14.9 (13.6°; flexion 13–54°), Tashman 2004 2.0–8.9 (7.0°), Tashman 2007 2.5–11.4 (8.9°), Li 2012 4.7–12.5 (7.7°). **Cutting:** Benoit 2006 (1 subject, pins) 2.4–8.9 (6.5°; flexion 18–46°), Miranda 2013 (1 typical subject, biplane) 8.4–15.4 (6.9°; flexion 40–55°). Slope IR/flex ≈ 0.05–0.46°/° (median ≈ 0.24°/°) | SEC: Gasparutto data + DERIVED | Moderate–high (mean curves; individual peaks larger) |
| Myers et al. 2011, *AJSM* 39:1714, doi:10.1177/0363546511404922 (PMC4167636) | Biplane fluoroscopy | 16 (6 M, 81 kg; 10 F, 57 kg) | 40 cm bilateral drop landing, soft vs stiff | **Absolute** max IR (tibial frame zero at full extension): soft 18.9 ± 5.3°, stiff 15.4 ± 6.4°; average 15.3 / 12.3°. **Normalised to the passive knee-extension path** (i.e., load-driven part): max 5.6 ± 5.5° vs 4.9 ± 4.7°, average 3.7 / 2.7°. No sex effect | FT | High |
| Myers et al. 2012 (above) | Biplane | 10 F | Walk / landing / isometric / unweighted extension | Peak IR 3.9 / 19.4 / 15.9 / 14.5° | ABS | Moderate–high |
| Kamada et al. 2025, *OJSM*, doi:10.1177/23259671251399819 (PMC12701257) | Biplane radiography 150 Hz | 19 healthy collegiate athletes | Fast running 5.0 m/s; single-leg drop landing 20 cm | Tibial IR at peak ACL-bundle elongation (zero = CT pose, ≈6.5° flexion): running ≈14–15° IR at ≈30° flexion; landing ≈8–11° IR at 8–14° flexion | FT | High |
| Khodabandeloo et al. 2026 (above) | Dual fluoroscopy | 11–12 healthy contralateral | Single-leg landing; lunge; **180° pivot** | Landing (flexion 14 → 38°): IR ≈5 → 9° (≈4° excursion). Lunge (85–100°): ≈−2 → −6° (≈4°). **Pivot (flexion ≈4–6°): ≈0 → −12° (≈12° ER excursion)** | FIG | Moderate |
| Kozanek et al. 2009, *J Biomech* 42:1877, doi:10.1016/j.jbiomech.2009.05.003 (PMC2725209) | Dual fluoroscopy, treadmill 0.67 m/s | 8 | Gait stance | Femur relative to tibia: 1.6° IR at heel strike; ER peak 5° early stance; 7.4° ER at toe-off. Axial rotation correlated with flexion (r² = 0.53) | FT-sum | Moderate |
| Miranda et al. 2013, *MSSE* 45:942, doi:10.1249/MSS.0b013e31827bf0e4 (PMC3594620) | Biplanar videoradiography | 10 intact (5 M, 5 F) | Jump-cut (45° sidestep after a single-leg landing) | "All subjects began internally rotating after contact". No sex or ACLR differences (absolute values not reported in text) | FT-sum | Moderate |
| Nishida et al. 2022, *J Orthop Res* 40:239, doi:10.1002/jor.25162 | Biplane radiography | 19 athletes | Fast run, drop jump, **180° IR/ER rotation hops** | Side-to-side differences in rotation ≤5.5°; women up to 2.3° less adduction (axial values not in abstract) | ABS | — |
| Benoit et al. 2006, *Gait Posture* 24:152, doi:10.1016/j.gaitpost.2005.04.012 | Intracortical pins vs skin markers | 8 M | Walk, cut | Skin-marker rotational error up to **4.4° (walk) and 13.1° (cut)**; translational up to 13–16 mm | ABS | High (for the error) |
| Benoit et al. 2007, *Clin Orthop* 454:81, doi:10.1097/BLO.0b013e31802dc4d0 | Pins | 6 | Walk | Secondary rotations "much smaller" than skin-derived; for a given flexion, multiple axial/frontal combinations exist | ABS | High |
| Reinschmidt et al. 1997, *J Biomech* 30:729, doi:10.1016/s0021-9290(97)00001-8 | Pins vs skin | 3 | Running | Skin IE error = **63% of the IE ROM** | ABS | High |

### 4.2 Video, skin-marker and injury kinematics (lower validity; for context)

| Source | Method | n | Task | Values | Read | Confidence |
|---|---|---|---|---|---|---|
| Koga et al. 2010, *AJSM* 38:2218, doi:10.1177/0363546510373570 | Model-based image matching (MBIM) of injury video | 10 ACL injuries (handball, basketball) | Cut / landing | Flexion 23° at IC, +24° within 40 ms. Knee 5° ER at IC (range −5 to 12°); **IR 8° (95% CI 2–14) in the first 40 ms, then ER 17° (13–22)**, likely after rupture | ABS | Moderate |
| Koga et al. 2018, *AJSM* 46:333, doi:10.1177/0363546517732750 | MBIM | Same 10 cases | Injury | **Hip IR 29° (18–39) at IC, unchanged over 40 ms**; hip flexion 51°; heel strike | ABS | Moderate |
| Sasaki et al. 2018, *Scand J Med Sci Sports* 28:1263, doi:10.1111/sms.13018 | MBIM, female collegiate football | 5 pressing actions (non-injury) | Pressing (deceleration step) | **Knee rotation close to neutral at IC with "only minor" changes.** Hip 7° ER at IC → 10° IR at 100 ms (≈17° excursion) | ABS | Moderate |
| Wang & Zheng 2010, *Int J Sports Med* 31:742, doi:10.1055/s-0030-1261942 | Skin markers | 20 | Spin vs step turn after stair descent | Spin turn: peak IR 13.5 ± 5.9°, range −15.1 → +13.5° (≈29°). Step turn: 5.1 ± 5.2°, −11.5 → 5.1° (≈17°) | ABS | Low (skin; see Benoit errors) |
| Zou et al. 2024, *Front Physiol* 15:1424092, doi:10.3389/fphys.2024.1424092 (PMC11394182) | Skin markers | 21 F footballers | 180° pivot turn | Knee IE at IC 4.0–7.4 ± 9°, at first vGRF peak 0.2–7.6 ± 6–7°. Hip IE 3–13° at those instants, switching from IR to ER through the turn. Ankle −5 to −11° | FT | Low–moderate |
| Kellis, Katis & Gissis 2004, *MSSE* 36:1017, doi:10.1249/01.mss.0000128147.01979.31 | Skin markers | 10 M | Instep kick, support leg, 0 / 45 / 90° approach | Angled approaches gave **greater tibial ER displacement** and IR velocity of the support leg, plus more biceps femoris EMG at contact (values not in abstract) | ABS | Low |
| Kono et al. 2022, *BMC MSD* 23:326, doi:10.1186/s12891-022-05267-z; Kono et al. 2024, *Cureus* 16:e59678, doi:10.7759/cureus.59678 | Fluoroscopy, 2D/3D registration | 6 volunteers (12 knees) | **Sitting sideways, 110–150° flexion** | Tibiofemoral (femoral ER rel. tibia = tibial IR): 13.7 ± 3.5° ipsilateral, 5.8 ± 6.8° contralateral. Yet **segmental** femur/tibia rotations were 12–30° (e.g., contralateral tibia IR 30.4°, femur IR 23.8°). Knee relative motion stays within the normal coupled envelope; the asymmetry is taken by the segments | ABS | Moderate (deep-flexion relevance) |

### 4.3 External knee rotation moments (inverse dynamics, skin markers)

| Source | n / population | Task | Peak external knee IR moment (KIRM) | ≈N·m at 78 kg [DERIVED] | Read |
|---|---|---|---|---|---|
| Mausehund & Krosshaug 2024, *AJSM* 52:1209, doi:10.1177/03635465241234255 (PMC10986153) | 702 elite female handball and soccer players | Sport-specific sidestep cut, approach ≈3.1 m/s | **0.24 ± 0.21** (injury-free); 0.18 ± 0.19 (previous ACL, ipsilateral). KAM 1.67 ± 0.55 | 19 (14) | FT |
| Li & Qian 2025, *Sci Rep*, doi:10.1038/s41598-025-33102-7 (PMC12749382) | 26 semi-pro male footballers (76.3 kg) | COD 45 / 90 / 135 / 180° | **0.32 ± 0.11 / 0.48 ± 0.15 / 0.74 ± 0.19 / 0.86 ± 0.22**. Hip IR moment 0.35 → 1.03 | 25 / 37 / 58 / 67 | FT |
| Leppänen et al. 2021, *AJSM* 49:2651, doi:10.1177/03635465211026944 (PMC8355634) | 258 youth basketball and floorball players (legs: 203 F, 286 M) | 180° pivot turn | IR **0.4 ± 0.2 (F), 0.5 ± 0.2 (M)**; ER moment 0.2 ± 0.1–0.2 | 31–39 | FT |
| Zou et al. 2024 (above) | 21 F footballers | 180° pivot turn | In/external rotation moment at first vGRF peak: 0.49–0.50 (anticipated), 0.21–0.22 (unanticipated) | 17–39 | FT |
| Maniar et al. 2018 (above) | 8 M | Unanticipated 45° sidestep | Knee transverse joint **reaction** moment (model) up to 25 N·m (ER) | ≈25 | FT |
| Besier et al. 2001, *MSSE* 33:1176, doi:10.1097/00005768-200107000-00015 | 11 M | Pre-planned vs unanticipated cutting | Varus/valgus and IE moments up to **2×** larger when unanticipated (values not in abstract) | — | ABS |
| Wannop et al. 2010 (lit3) | 13 | V-cut, high vs low traction shoes | "Knee external rotation" 36.2 vs 32.0 N·m (frame unclear) | — | ABS (lit3) |

**Task-level reading.**

1. **Operating envelope.** At bone level the tibiofemoral axial angle during walking, running, landing, hopping, stairs and cutting stays within about **−1° to +15° IR of the full-extension pose** (means). It is mainly **coupled to flexion**, at a median ≈0.25° of IR per degree of flexion.
   - Per-task excursions are ≈3–14°.
   - In landing, the part not explained by the passive flexion coupling is ≈3–6° (Myers 2011).
   - Pivoting on a nearly straight leg uses ≈12° of ER (Khodabandeloo [FIG]).
   - Injury: 8° IR then 17° ER, the latter probably after rupture (Koga 2010).
   - Skin-marker studies report wider ranges (≈17–29° in turns), but skin error in cutting is up to 13° (Benoit 2006).
2. **Moments.**
   - Peak external KIRMs in cutting and pivoting are 0.2–0.9 N·m/kg, rising steeply with cut angle (Li & Qian 2025).
   - At 78 kg that is ≈19–67 N·m, comparable to or above the measured voluntary rotator capacity (≈30–45 N·m; §2) and the model's 27 N·m.
   - These net moments are shared by muscles, ligaments and the compression-dependent articular "uphill" mechanism. Under compressive load, condylar conformity becomes an important stabiliser (Hsieh & Walker 1976 [ABS], PMID 946171). Articular contact supplies 50–85% of IR restraint (Blankevoort & Huiskes 1996, lit2).
   - Bone-level rotation stays small despite these moments. **Weight-bearing knee axial stiffness is therefore far higher than the unloaded laxity curves in lit2** [DERIVED].
3. **Kicking support leg.**
   - No bone-level axial data were found.
   - Angled approaches increase support-leg tibial ER displacement (Kellis 2004 [ABS]).
   - Support-leg moments mostly do not drive motion except at the knee in the sagittal plane (Inoue 2014 [ABS], doi:10.1080/02640414.2014.886126).
   - The support foot pivots on the ground under GRF interaction torque (Inoue & Nunome 2025, lit3).

---

## 5. Sharing of whole-leg yaw over a planted foot

| Source | Method | n | Task | Segment/joint finding | Read | Confidence |
|---|---|---|---|---|---|---|
| Lafortune et al. 1994, *J Orthop Res* 12:412, doi:10.1002/jor.1100120314 | Steinmann pins, tibia + femur | 5 M | Walking with valgus/varus wedges | Valgus wedge rotated the tibia 4° more internally than varus, but tibiofemoral IE patterns did not change consistently: "increased internal and external tibial rotation is **resolved at the hip joint**, with changes at the tibiofemoral joint that barely are detectable" | ABS | High (bone-level; walking) |
| Gasparutto 2017 (§4) | Synthesis | 126 | Dynamic weight-bearing tasks incl. cutting | Knee IR excursion ≤ ≈14° per task, mostly flexion-coupled | FT + DERIVED | High |
| Khodabandeloo 2026 (§4) | Dual fluoroscopy | 11 | 180° turn on a stationary planted foot | Rotation done by "knee, hip, and torso" with the foot fixed. Knee ≈12° ER at ≈5° flexion | FT (task) + FIG | Moderate |
| Sasaki 2018 (§4) | MBIM | 5 | Football pressing | Hip ≈17° rotation in 100 ms; knee near neutral | ABS | Moderate |
| Koga 2010 / 2018 | MBIM | 10 | ACL injury cut/landing | Hip held at 29° IR; knee 8° IR then 17° ER | ABS | Moderate |
| Hase & Stein 1999, *J Neurophysiol* 81:2914, doi:10.1152/jn.1999.81.6.2914 | EMG + kinematics + forces | — | Rapid walking turns | Spin turn = "spinning the body around the right foot" (stance limb). Step turn = external rotation of the opposite hip and a step. Ankle invertors and gluteus medius help control trunk rotation | ABS | Moderate (qualitative) |
| Taylor, Dabnichki & Strike 2005, *Hum Mov Sci* 24:558, doi:10.1016/j.humov.2005.07.005 | 3D kinematics/kinetics | small | 90° spin vs step turns | Spin turns (ipsilateral pivot or crossover) need more transverse-plane RoM and muscular demand than step turns (values not in abstract) | ABS | — |
| Kono 2022 / 2024 (§4) | Fluoroscopy | 6 | Asymmetric kneeling, 110–150° | Segment rotations 12–30°, but tibiofemoral only 6–14° (coupled IR) | ABS | Moderate |
| Ogasawara et al. 2021, *Sports Med Open* 7:75, doi:10.1186/s40798-021-00368-w (PMC8531138) | Skin markers + GRF decomposition | 25 F | 60° cut, rearfoot vs forefoot strike | Rearfoot strike → GRF-driven hip and knee IR moments in the first 5–10% of stance, with hip IR excursion 1.5° vs −2.1° (forefoot). Hip muscle moment counteracts it | FT | Low–moderate |
| Quanbeck 2017 / Duncan 2020 (§1) | Skin markers | 10 / 23 | Static turnout (max external whole-leg rotation, foot vs pelvis) | Hip ≈36–43% of turnout, knee ≈32% (≈18–20° per leg), the rest from tibial torsion and foot. Hip uses 70–83% of available ER | ABS | Low (skin; static) |
| Almasi et al. 2025, *BMC MSD* 26:444, doi:10.1186/s12891-025-08692-y | Clinical exam | 606 ballet students | Static | **Tibial torsion 22.4 ± 6.3°** (a static offset, not motion). Hip ER 60°, IR 43.5° (dancers) | ABS | Moderate |
| Figueroa-Mayordomo 2026 (§2) | Inclinometer | 56 amateur footballers | Passive hip ROM | Hip IR 21–26°, ER 31–34° | FT | Moderate |
| From lit3 | — | — | — | Tibia vs calcaneus ≈5° touchdown → midstance, ≈10–13° whole running stance (Stacoff 2000 [FT]; Behling 2025 [FT]). Talonavicular ≈8.7° (Arndt 2007 [ABS]). Foot rotates on turf **18 ± 12°** in stop-and-turn (Kati 2012 [SEC]). Body re-orients ≈25–45° over the planted foot in a 45° cut (Qiao 2014; Jindrich 2006). Low-friction ground → whole-body spins (Carrier 2017 [FT]) | lit3 | — |

**No study found partitions body yaw over a planted foot into hip / tibiofemoral / ankle-subtalar-midfoot / shoe–ground contributions with bone-level or validated methods.** Searches covered pivot turns, spin turns, cutting segmental mechanics, golf lead leg, turnout, and fluoroscopic or pin pivot tasks. The budget below is therefore [DERIVED] from per-joint bone-level excursion limits and the indirect evidence above.

**Yaw budget [DERIVED, low–moderate confidence]**

| Task | Body yaw over the planted foot within one stance | Knee (tibiofemoral) | Ankle / subtalar / midfoot (shank vs foot) | Shoe–ground pivot | Hip (+ pelvis/trunk) |
|---|---|---|---|---|---|
| Walking / running straight | Small (a few degrees of pelvis rotation) | 5–14° excursion, mostly flexion-coupled IR (not yaw "taken") | 5–13° (coupled to eversion) | ≈0 (anchored; lit3) | Absorbs the foot-induced tibial rotation (Lafortune) |
| 45° sidestep cut | ≈25–45° | ≈5–10° (≈15–30%) | ≈5–10° (≈15–30%) | 0–10° (surface/boot-dependent; up to the ≈18 ± 12° seen in stop-turns) | Remainder, ≈10–30° (≈40–60%), within hip PROM ≈21–34° per direction |
| Sharp COD 135–180° / 180° pivot on planted foot | 90–180° over the turn (spread over contact + swing) | ≈12° (<10%) | ≈10° | Large and necessary on the forefoot (the forefoot torque limit is only ≈18 N·m barefoot; lit3) | Up to hip ROM (≈55–60° total); trunk and the contralateral step supply the rest |
| Asymmetric kneeling / deep flexion | Segment rotations 12–30° | 6–14° (coupled IR only) | — | — | Takes the asymmetry (Kono) |

---

## 6. Synthesis for modelling

### (a) Should the knee axial DOF be actuated, and should its capacity vary with flexion?

**Yes, actuate it, but as a low-authority, flexion- and angle-dependent actuator.**

- Muscles do create substantial axial torque at 60–90° flexion (≈0.4–0.5 N·m/kg). Co-contraction raises torsional stiffness more than 4× (Louie & Mote, lit2).
- Hamstring medial:lateral balance measurably steers tibial rotation (cadaver).
- **Capacity should be smallest near extension and plateau from ≈60–100°.** Evidence: moment-arm peaks at 70–90°; 20° ≈ 0.86–0.90× 45°; 45° < 90°; no hamstring effect on rotation at 0°.
- **Capacity also depends strongly on axial angle**: ×0.6–1.5 across the foot-level ±25–30° range (Królikowska). The same pattern appears in the moment-arm × force calculation.
- **In weight-bearing, the actuator is not the main axial restraint.** Bone-level rotation stays within ±≈6° of the flexion-coupled path in landing despite 0.2–0.9 N·m/kg external KIRMs. That implies compression-dependent articular stiffness (Hsieh & Walker 1976) plus ligaments do most of the work.
- **Model implication:** pair the actuator with a passive restraint whose stiffness rises with joint compression, rather than with a soft spring the actuator must fight.
- Beyond ≈120° flexion, muscle loads barely change rotation (Li 2004). Do not count on the actuator to position the tibia in deep flexion.

### (b) What operating range does the knee axial DOF use in football tasks?

- **About −12° (ER) to +15–19° (IR) relative to the full-extension zero**, bone-level, means plus about 1 SD:
  - IR mostly flexion-coupled: ≈0.25°/° of flexion; walking 5–10°, running 7–14°, cutting 6.5–7° of excursion;
  - ER up to ≈12° in a pivot near extension.
- **Around a flexion-coupled neutral, the load-driven deviation is only ≈3–6° (mean max), ±≈5° SD** (Myers 2011).
- Injury-level excursions (8° IR in 40 ms then 17° ER) mark the edge of the physiological envelope.
- The model's soft limits (20° IR / 30° ER) and hard limits (30/40°) are **well outside the used range**. lit2 already found them to be foot-level-sized.

### (c) Which share of planted-leg yaw belongs to the knee vs ankle/subtalar vs hip vs foot–ground?

[DERIVED; no direct measurement exists]

- **Knee:** ≲10–15° per stance. That is ≈15–30% of the yaw in an ordinary cut and <10% in a 180° pivot.
- **Ankle/subtalar/midfoot (shank vs foot):** ≈5–15°, largely coupled to eversion and plantar/dorsiflexion (lit3).
- **Shoe–ground:** ≈0 in straight running. Variable in cuts. Essential in sharp pivots: 18 ± 12° in stop-turns on turf; unlimited on low friction (lit3).
- **Hip:** the largest contributor. It absorbs foot-imposed tibial rotation (Lafortune 1994) and provides ≈17° of fast rotation in football actions (Sasaki 2018), within a passive ROM of ≈21–26° IR / 31–34° ER in footballers, with rotators ≈2× stronger per kg than the knee rotators.

### (d) What must NOT be assigned to the knee axial DOF?

1. **Whole-body yaw over the planted foot.** This belongs mainly to the hip, plus shoe–ground pivot and trunk. A knee actuator "twisting the body" over the foot is non-physiological.
2. **Shoe–ground pivoting.** A foot that must rotate on the ground should slip at the contact, not push the knee to its axial limits.
3. **Ankle/subtalar-coupled shank rotation** (tibia vs calcaneus 5–13° per stance, coupled to eversion). This belongs to the passive foot-vs-shank coordinate (lit3).
4. **Static tibial torsion** (≈22 ± 6°) and foot-progression (toe-out) differences. These are anatomical offsets, not knee motion.
5. **Screw-home / flexion-coupled IR** (≈0.25°/° of flexion; ≈15–20° by mid-to-deep flexion; lit2 to 30° at 150°). This should be a kinematic coupling or a moving neutral, not something the actuator produces or fights.
6. **The large external KIRMs of sharp cuts and pivots** (0.5–0.9 N·m/kg ≈ 40–67 N·m). These are carried mainly by articular conformity under compression and by ligaments. An actuator sized to ≈27–35 N·m should not be the only element resisting them.
7. **Skin-marker-sized "knee rotation" ranges** (17–29° in turns; 18–20° knee ER in turnout). These are inflated by soft-tissue artefact (up to 13° in cutting; 63% of running IE ROM) and include segment rotations.
8. **Deep-flexion asymmetry** (kneeling, prone rest). Segment rotations of 25–30° occur while tibiofemoral rotation stays at 6–14° of coupled IR (Kono). The hip and foot take the asymmetry.

---

## Parameter-ready values

| Parameter | Value | Basis | Confidence |
|---|---|---|---|
| Reference axial capacity at 70–100° flexion, neutral axial angle | **IR 0.39, ER 0.46 N·m/kg isometric** (≈30 / 36 N·m at 78 kg). Isokinetic 60°/s ≈0.46 N·m/kg. Football athletes plausibly +10–30% (direction from Muaidi 2009) | Królikowska 2015 [FT]; Armour 2004 [ABS] | Moderate–high (80°) |
| Current model 0.35 N·m/kg | 0.90× (IR) and 0.76× (ER) of measured neutral isometric at 80°. Acceptable to slightly conservative at 60–100° | [DERIVED] | Moderate |
| Flexion scaling s(θ) (relative to 70–100°) | 20°: **0.77–0.81**; 45°: ≈0.9 (assumed); 60–100°: 1.0 | Shoemaker 1988 (20 vs 45°) [ABS] + Osternig 1980 direction [SNIP] + Buford peaks [ABS] | Low–moderate |
| Axial-angle factor (foot-level shin angle; bone-level ≈ half) | IR torque ×1.49 / 1.31 / 1.15 / 1.00 / 0.87 / 0.62 at 30 ER / 20 ER / 10 ER / 0 / 10 IR / 25 IR. ER torque ×0.65 / 0.80 / 0.93 / 1.00 / 1.04 / 1.09 | Królikowska 2015 [FT] | Moderate–high (shape) |
| Rotator moment arms at 30° flexion | Medial (SM, ST, GR, SA) 6–14 mm; popliteus 0–10 mm; BF 15–30 mm (ER); vary with axial angle as in §3 | Buford 2001 [ABS; SEC digitised] | Moderate |
| Active/passive foot-level ROM ratio | ≈0.8 (0.77–0.87) | Muaidi 2017 [ABS, DERIVED] | Moderate |
| Bone-level operating envelope in football tasks | IR 0 → +15° (up to ≈19° absolute in landing) relative to full-extension zero; ER to ≈−12° in near-straight pivots; load-driven deviation from the coupled path ≈3–6° (±5°) | Gasparutto [FT/SEC]; Myers 2011 [FT]; Kamada 2025 [FT]; Khodabandeloo [FIG] | Moderate–high |
| Flexion-coupled IR slope in weight-bearing tasks | ≈0.25°/° (range 0.05–0.46) | Gasparutto data [DERIVED] | Moderate |
| Peak external KIRM | Sidestep 0.24 ± 0.21 N·m/kg; COD 45 / 90 / 135 / 180°: 0.32 / 0.48 / 0.74 / 0.86; 180° pivot 0.4–0.5 | Mausehund 2024; Li & Qian 2025; Leppänen 2021 [FT] | Moderate–high (inverse dynamics, skin markers) |
| Hip rotation (comparator for yaw sharing) | Passive IR 21–26°, ER 31–34° (footballers); rotator strength ≈0.8–1.2 N·m/kg (HHD) | Figueroa-Mayordomo 2026 [FT] | Moderate |

## Uncertain or not found

- **Strength or capacity at 0–15° and >100° flexion.** No data. s(0°) is unknown: plausibly 0.4–0.8 of the 90° value (central guess 0.6) [DERIVED extrapolation]. Muscle authority over rotation appears negligible at ≈150° (Li 2004).
- **Moment arms at 0°, 60°, 90° and beyond.** The Buford figure values outside 30° were not accessible (paywalled; academia.edu 403). Only one experimental dataset exists. **No gastrocnemius or TFL/ITB knee-axial moment arms exist.**
- **Voluntary bone-level rotation at full extension.** Not measured. Testa 2012 has no abstract values; the turnout skin-marker data conflict with each other.
- **Bone-level axial kinematics in true football cutting, kicking support leg, and fast pivots on turf.** Only 1-subject mean curves for cutting (Benoit, Miranda). Pivot data come from ACLR patients' contralateral knees, figure-read. Nishida 2022 rotation hops: no values accessible.
- **Direct partition of planted-leg yaw** into hip / knee / ankle / ground. Not found. §5 is a derived budget.
- **Sex differences in rotation strength.** Mixed: women lower ER (Kiriyama); no main sex effect in patients (Torry). Magnitudes not accessible. Muaidi 2009 values exist only in newtons via search snippet.
- **Weight-bearing knee axial stiffness.** Implied to be much higher than unloaded laxity (small bone-level rotations despite 20–67 N·m KIRMs), but no torque–rotation curve under physiological compression in vivo was found. Hsieh & Walker 1976 and Markolf 1981 are cadaveric, with no numbers accessed.
- Inaccessible primary sources: Osternig 1980 (no abstract; Ovid 402), Mossberg & Smith 1983 (JOSPT 403), Kiriyama 2009 numbers, Benoit 2006 full curves, Taylor 2005 RoM values, Buford 2001 full figures.

---

## Sources (DOI / ID)

**Active ROM:**
- Muaidi 2017 10.3233/BMR-169613
- Muaidi 2009 SJMSS 10.1111/j.1600-0838.2008.00783.x
- Muaidi 2007 device 10.1016/j.medengphy.2006.10.009
- Osternig 1980 PMID 7402056
- Osternig 1981 PMID 7259471
- Mossberg & Smith 1983 10.2519/jospt.1983.4.4.236
- Zarins 1983 10.1177/036354658301100308
- Testa 2012 10.1016/j.otsr.2011.08.017
- Jeon & Hong 2021 10.3233/BMR-200110
- Fuss 1991 J Anat 179:115, PMID 1817129, PMC1260580 (cadaveric restraint study; abstract only)
- Quanbeck 2017 10.1080/02640414.2016.1164335
- Duncan 2020 10.21091/mppa.2020.2015
- Grossman 2008 PMID 19618571
- Carter 2018 10.1080/02640414.2018.1446386
- Almasi 2025 10.1186/s12891-025-08692-y

**Strength:**
- Królikowska 2015 10.12659/MSM.893930 (PMC4514330)
- Armour 2004 10.1177/0363546504263405
- Shoemaker 1988 PMID 3342561
- Oshimo 1983 PMID 6656564
- Kiriyama 2009 10.1177/0363546508324692
- Torry 2004 10.1097/00042752-200411000-00001
- Viola 2000 10.1177/03635465000280041801
- Segawa 2002 10.1053/jars.2002.29894
- Zhang 2002 10.1097/00005768-200201000-00002
- Figueroa-Mayordomo 2026 10.3389/fspor.2026.1837082 (PMC13267181)

**Moment arms / muscle action:**
- Buford 2001 10.1016/s0968-0160(01)00106-5
- Buford 1997 10.1109/86.650292
- Chen & Franklin 2025 10.1007/s10439-025-03735-w (PMC12283864); dataset figshare 10.6084/m9.figshare.26018563
- Cleather 2018 10.1016/j.jtbi.2018.07.013
- Li 1999 10.1016/s0021-9290(98)00181-x
- Li 2004 10.1016/S0736-0266(03)00118-9
- Kwak 2000 10.1002/jor.1100180115
- Victor 2010 10.1002/jor.21019
- Shalhoub 2016 10.1002/jor.23185
- MacWilliams 1999 10.1002/jor.1100170605
- Chevalier 2023 10.1016/j.knee.2022.11.025
- Maniar 2018 10.1038/s41598-017-19098-9 (PMC5802728)
- van den Bogert 2008 10.1016/j.jbiomech.2008.03.018
- Wretenberg 1996 10.1016/s0268-0033(96)00030-7
- du Moulin 2024 10.1002/jor.25814
- OpenSim gait2392 model (Delp 1990 10.1109/10.102791; model file read locally)

**Task kinematics:**
- Gasparutto 2017 10.1155/2017/1908618 (PMC5405570; supplementary data parsed)
- Myers 2011 10.1177/0363546511404922 (PMC4167636)
- Myers 2012 10.1177/0363546511423746
- Kamada 2025 10.1177/23259671251399819 (PMC12701257)
- Khodabandeloo 2026 10.1177/23259671261422732 (PMC13050415)
- Kozanek 2009 10.1016/j.jbiomech.2009.05.003 (PMC2725209)
- Miranda 2013 10.1249/MSS.0b013e31827bf0e4 (PMC3594620)
- Nishida 2022 10.1002/jor.25162
- Benoit 2006 10.1016/j.gaitpost.2005.04.012
- Benoit 2007 10.1097/BLO.0b013e31802dc4d0
- Reinschmidt 1997 10.1016/s0021-9290(97)00001-8
- Lafortune 1994 10.1002/jor.1100120314
- Koga 2010 10.1177/0363546510373570
- Koga 2018 10.1177/0363546517732750
- Sasaki 2018 10.1111/sms.13018
- Wang & Zheng 2010 10.1055/s-0030-1261942
- Zou 2024 10.3389/fphys.2024.1424092 (PMC11394182)
- Kellis 2004 10.1249/01.mss.0000128147.01979.31
- Inoue 2014 10.1080/02640414.2014.886126
- Kono 2022 10.1186/s12891-022-05267-z
- Kono 2024 10.7759/cureus.59678

**Moments:**
- Mausehund & Krosshaug 2024 10.1177/03635465241234255 (PMC10986153)
- Li & Qian 2025 10.1038/s41598-025-33102-7 (PMC12749382)
- Leppänen 2021 10.1177/03635465211026944 (PMC8355634)
- Besier 2001 10.1097/00005768-200107000-00015
- Besier 2003 10.1097/00005768-200301000-00019
- Hsieh & Walker 1976 PMID 946171

**Yaw sharing:**
- Hase & Stein 1999 10.1152/jn.1999.81.6.2914
- Taylor 2005 10.1016/j.humov.2005.07.005
- Ogasawara 2021 10.1186/s40798-021-00368-w (PMC8531138)
- Sritharan 2025 10.1098/rsos.240908 (step-down-and-pivot; model has no knee axial DOF, so all yaw is attributed to the hip, a common modelling choice)
- lit3 sources (Stacoff 2000, Behling 2025, Arndt 2007, Kati 2012, Carrier 2017) as cited there.

**Access notes.**
- Europe PMC full-text XML and supplementary-file endpoints were used for the [FT] items and for the Gasparutto and Chen datasets, plus the Khodabandeloo figures.
- PMC HTML worked intermittently: one success (Myers 2011), then reCAPTCHA.
- WebFetch summariser was used for Kozanek 2009 and Miranda 2013.
- Blocked: Wiley (Muaidi 2009), Ovid/LWW (Osternig 1980), JOSPT, ScienceDirect, academia.edu (Buford 2001).

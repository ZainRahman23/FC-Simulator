# Knee axial (tibial internal/external) rotation vs flexion: primary-literature review

Date: 2026-10-04. Scope: tibiofemoral axial rotation ROM, torque–rotation behaviour, end range, muscular stiffness and strength, from full extension to deep flexion. The goal is to check the physics-character knee model (axial soft limits IR 20°/ER 30°, hard limits 30°/40°, soft range × clamp(flex/60°, 0.1, 1), passive law reaching 25% of capacity at the hard limit and 100% over 3° beyond it, capacity 0.35 N·m/kg).

## How each number was obtained

Every number below carries one of these tags:

- **[FT]**: I read the open full text myself (PMC / Europe PMC XML).
- **[FT-sum]**: from the full text, but extracted through a web-page summariser, which can lose detail.
- **[ABS]**: I read the PubMed abstract myself. The full text was not accessed.
- **[SEC]**: the number appears in another paper's full text that cites the primary source. I did not read the primary source.
- **[SNIP]**: seen only in a search-engine summary of the abstract. The publisher page was blocked (403/402).
- **[DERIVED]**: my own arithmetic or inference from tagged numbers. The method is stated each time.
- **[RECALLED — unverified]**: from memory. I tried to avoid these, and the few that remain are flagged.

Convention: IR = tibial internal rotation, ER = tibial external rotation. "Bone-level" means rotation measured on the bones themselves (RSA, fluoroscopy+CT, MRI, CT, intracortical pins). "Foot/skin-level" means a boot or footplate goniometer, or skin sensors.

---

## 0. Summary of findings

1. **Measurement level dominates the numbers.** Foot- or boot-based measurements overestimate tibiofemoral rotation by about 100%. RSA showed the Rottometer "consistently overestimated the rotation by about 100%" (Almquist 2002 [ABS]). Tibial rotation was "approximately one-half the foot rotation" up to ±10 N·m (Shoemaker & Markolf 1982 [ABS]). A robotic boot measured tibial rotation at 48.7% of foot rotation (Branch 2010, via Mouton 2016 [FT-sum]). A boot inclinometer overestimated by 34° (Alam 2013 [ABS]). **Our soft range (20/30°) and hard range (30/40°) match the foot-level class of numbers** (e.g. Zarins 1983: about 25° IR / 45° ER at 30–90°). The model also has a separate ankle axial joint, so the knee probably double-counts rotation that really happens distal to the knee.
2. **Bone-level, relaxed, in vivo:**
   - At ±2.5 N·m: IR about 4° and ER about 8–10° at 30° and 90° flexion (Moewis 2016 [FT]).
   - At about 5–6 N·m: total about 16° at 0°, about 23° at 30°, about 26° at 90° (Hemmerich 2011 via Zee 2020 [FT]; Almquist 2002 RSA via Tsai 2008 [SEC]).
   - Our hard limit sits at the angle where model torque reaches about 6.8 N·m (25% of 27.3 N·m). At 30–90° it allows 70° total, about 2.5–3× the bone-level rotation measured at similar torque.
3. **Flexion dependence.**
   - Range is smallest at full extension (Markolf 1976 [ABS]: "with the knee at full extension, stiffness was maximum and laxity was minimum").
   - It grows quickly to about 30–45°, then plateaus to about 90–100° (Lagae 2020 [FT]; Roth 2015 [ABS]; Zarins 1983 [ABS]).
   - Total range at full extension is about 0.5–0.7× the mid-flexion range, not 0.1× [DERIVED, several sources].
   - In cadavers under ±3 N·m, **both** IR and ER limits are about 10° larger at 45° and at 90° than at 0° (Roth 2015 [ABS]). The data therefore support flexion-dependent **outer** limits, not only flexion-dependent onset.
4. **The neutral (zero-torque) position moves internally with flexion.**
   - About 5° of obligatory tibial IR over 0–10° (Iwaki 2000 [ABS]).
   - 10.6 ± 2.8° coupled over 0–60° (Ishii 1997, intracortical pins [ABS]).
   - About 20° by 120° (Johal 2005 [ABS]); about 30° at 150° in a weight-bearing lunge (Hamai 2013 [FT]).
   - With a fixed zero and asymmetric limits, at 145° flexion the natural coupled IR (20–30°) lies at or near our 30° IR hard limit. This could contribute to the prone-rest blocker [DERIVED hypothesis; it depends on which direction the knee is loaded in that case].
5. **Torque–rotation curves.** In vivo curves are non-linear and hysteretic, and stiffen gradually with no wall-like stop up to the highest torques tested in awake subjects (9–15 N·m). Bone-level incremental stiffness in relaxed knees is about 0.25–1 N·m/° [ABS/DERIVED]. Our end-stop slope (about 6.8 N·m/°) has no direct in vivo support. There are no in vivo data above about 15 N·m.
6. **Muscle co-contraction raises torsional stiffness more than 4×**: 0.16 → 2.54 N·m/° (Louie & Mote 1987 [ABS]).
7. **Strength.** Maximal isolated lower-leg twisting torque is about 30 N·m or more in adult males, and up to 71 N·m with stance, ski boot and free torso (Shoemaker 1988 [ABS]). Isokinetic IR at 90° flexion is about 28 N·m (Armour 2004 [ABS, unit-converted]). Torque is **lower near extension** (20° < 45° < 90°). Our 0.35 N·m/kg (≈27 N·m at 78 kg) is in the right range for 45–90° flexion, probably too high near extension, and has no data support beyond about 100°.
8. **Deep flexion (≥120°).** I found **no** study measuring passive axial ROM or stiffness under a defined torque beyond about 100–120°. Kinematic studies show a substantial and partly reversible axial freedom in deep flexion. A **static passive 20+ N·m axial end-range load at rest is not physiologically plausible**: it is 1.5–2.5× the largest passive torques applied to awake subjects, and of the same order as the torques at which cadaver ligaments failed (Shoemaker 1982 [ABS]).

---

## 1. Results table

Total = IR + ER. "Cad." = cadaver. Stiffness and strength values are in the last numeric column.

| Source | In vivo / in vitro (measure level) | n | Flexion angle(s) | Applied torque | IR / ER (°) | Stiffness or strength | Read | Confidence |
|---|---|---|---|---|---|---|---|---|
| Moewis et al. 2016, PLoS One, doi:10.1371/journal.pone.0159600 | in vivo, **bone** (fluoroscopy + CT model RSA, ≤1° error) | 9 (healthy contralateral knees of ACL patients) | 30°, 90° | ±2.5 N·m, relaxed, seated | 30°: IR 3.7±1.4 / ER 7.6±3.5. 90°: IR 4.0±2.0 / ER 10.0±3.1 | Clear hysteresis. Neutral sat about 6–8° ER of device zero | FT | High (small n) |
| Almquist et al. 2002, J Orthop Res, doi:10.1016/S0736-0266(01)00148-6 | in vivo, **bone** (RSA tantalum markers) plus external device | 5 | 60°, 90° | 3, 6, 9 N·m | RSA at 90°/6 N·m: IR 10 / ER 16 (device: 21 / 27) | Device overestimates about 100% | ABS + SEC (RSA values quoted in Tsai 2008 [FT]) | Moderate (n=5; secondary) |
| Hemmerich et al. 2011, AJSM, doi:10.1177/0363546510379333 (values from Zee 2020 Table 1) | in vivo, **bone** (MRI, torsional device) | 32 patients; intact contralateral knees, M and F | 0°, 30° | manual, mean 5.2 N·m (per Zee 2020) | 0°: IR 9.6±4.3 / ER 6.2±3.0 (M); IR 9.5±2.7 / ER 7.0±2.6 (F). 30°: IR 8.9±4.8 / ER 14.6±5.6 (M); IR 8.8±3.7 / ER 13.9±4.7 (F) | — | SEC (Zee 2020 [FT]) + ABS | Moderate–high |
| Nordt et al. 1999, AJSM, doi:10.1177/03635465990270051101 | in vivo, **bone** (CT) | 21 (uninjured contralateral) | ≈20° | 5 N·m (torque per Zee 2020) | IR 10.8 / ER 7.4 | — | ABS (+ torque from Zee [FT]) | Moderate |
| Lee et al. (CAS) via Zee 2020 | in vivo under anaesthesia, **bone** (navigation) | ≈42 (ACL-deficient → reconstructed; no intact group) | 0, 30, 60, 90° | manual, unquantified | Reconstructed single-bundle: 0°: 8.3/6.5 (total 14.8); 30°: 13.7/12.8 (26.6); 60°: 14.4/13.3 (28.7); 90°: 11.3/13.3 (24.7) | — | SEC (Zee 2020 [FT]) | Low–moderate (non-intact, torque unknown); useful for **flexion trend** |
| Tsai et al. 2008, BMC MSD, doi:10.1186/1471-2474-9-35 | in vivo, skin electromagnetic sensors, boot | 11 males (22 knees) | 30°, 90° | 6 N·m | Total 25.8±5.9 (30°); 18.5±4.7 (90°) | — | FT | Moderate (soft-tissue artefact; authors say it may understate) |
| Almquist et al. 2011, BMC MSD, doi:10.1186/1471-2474-12-291 | in vivo, **foot/skin** device (Rottometer) | 10 subjects (20 knees) per arm | 30, 60, 90° | 3, 6, 9 N·m and "end-feel" | Totals (test-retest M1). 90°: 30±6 / 56±9 / 76±9, end-feel 72±8. 60°: 33 / 58 / 77, end-feel 74. 30°: 28 / 55 / 79, end-feel 78 | Device ≈2× bone (Almquist 2002) | FT | High as device values; low as bone values |
| Almquist et al. 2013, J Orthop Res, doi:10.1002/jor.22184 | in vivo, foot/skin device | 120 (60 F / 60 M) | 30, 60, 90° | 6, 9 N·m, end-feel | No differences between flexion angles. F 10–20% > M. IR 40–44% / ER 56–60% of total | — | ABS | Moderate |
| Zarins et al. 1983, AJSM, doi:10.1177/036354658301100308 | in vivo, passive, side-lying, manual end-feel (torque not graded, per Almquist 2011); probably foot-level | 17 normal | 5, 15, 30, 60, 90° | end-feel | 30–90°: ≈25 / ≈45. 5°: 10 / 23 | — | ABS | Moderate for trend; overestimates bone-level |
| Mossberg & Smith 1983, JOSPT, doi:10.2519/jospt.1983.4.4.236 | in vivo, **active**, seated, foot on floor platform (foot-level) | 85 women | 70, 90, 100° | active (no torque) | Total 35 → 40 → 44°. ER ≈2× IR | — | SNIP (JOSPT page 403) | Low–moderate |
| Osternig et al. 1980, MSSE 12:195 (PMID 7402056) | in vivo, active, isokinetic (boot) | 28 males | 45°, 90° | maximal active | Total ROM 57–59° (90°), 50° (45°) | Torque lower at 45° than 90°. 90–100% of peak torque reached within first 5–10° of rotation | SNIP (no PubMed abstract; publisher 402) | Low |
| Shoemaker & Markolf 1982, JBJS Am 64:208 (PMID 7056775) | in vivo, foot-based device + max isometric torque; cadaver failure tests | 20 normal; 6 cadaver | 20°, 90° | up to ±10 N·m | Tibial rotation ≈ ½ foot rotation. One subject at 90°: 76–83° range, probably foot total (SEC, Almquist 2011) | IR torque > ER torque. ER torque rose from 20° to 90°. Cadaver ligament failure torque ≈ max isometric torque | ABS (+SEC) | Moderate (numbers not accessible) |
| Stoller et al. 1983, Clin Orthop 174:172 | in vivo | 13 | 90° | ±10 N·m | (values not in abstract) | Laxity +14% after a 3.5-mile run; recovery ≈52 min | ABS | — |
| Shultz et al. 2012, J Athl Train, doi:10.4085/1062-6050-47.2.159 | in vivo, skin EM sensors (VKLD) | 140 | 20° | ±5 N·m | Total by laxity cluster: 16.9±4.2 (low) … 36.7±4.0 (high) | — | FT-sum | Moderate |
| Musahl et al. 2007, KSSTA, doi:10.1007/s00167-007-0317-9 | in vitro (EM tracking; boot device) | cad. (n in abstract not given) | 0° → 90° | not stated in abstract | Total 23° (0°) → 46° (90°) | — | ABS | Moderate |
| Lagae et al. 2020, KSSTA, doi:10.1007/s00167-019-05839-y | in vitro, bone (optical tracking) | 12 cad. | 0–100° every 10° | 5 N·m IR | IR (intact): 0° 7.5±3.0; 10° 11.1; 20° 15.1; 30° 18.1; 40° 19.5; 50° 19.8; 60° 19.2; 70° 18.7; 80° 18.2; 90° 18.0; 100° 17.9 | — | FT (Table 2) | High (cadaver) |
| Roth, Howell & Hull 2015, JBJS Am, doi:10.2106/JBJS.N.01256 | in vitro, 6-DOF load system | 10 cad. | 0, 45, 90° | ±3 N·m | IR +10.2±2.7 and ER +10.1±2.0 larger at 45° than at 0°. IR +10.0±4.6 and ER +10.1±4.5 larger at 90° than at 0° (absolute values not in abstract) | — | ABS | High (cadaver) |
| Roth, Hull & Howell 2015, J Orthop Res, doi:10.1002/jor.22926 | in vitro | 10 cad. | 0–120° every 15° | ±3 N·m | Between-knee range of I–E limits > 3.6° (absolute values not in abstract) | — | ABS | — |
| Blankevoort, Huiskes & de Lange 1988, J Biomech, doi:10.1016/0021-9290(88)90280-1 | in vitro, RSA | 4 cad. | flexion range (0–90°+) | ±3 N·m defines the "envelope" | (numbers not accessed; repository PDF blocked) | Envelope barely affected by 300 N axial force or 30 N AP force. Screw-home "not an obligatory effect" | ABS | — |
| Blankevoort & Huiskes 1996, J Orthop Res, doi:10.1002/jor.1100140425 | model (4 knees) | 4 | 0–90° | 3 N·m | — | Articular contact supplies 50–85% of IR restraint. Ligaments supply 95–100% of ER restraint | ABS | Moderate |
| Markolf, Mensch & Amstutz 1976, JBJS Am 58:583 | in vitro | 35 cad. | 6 positions | manual | (values not accessed) | Non-linear, stiffening. Stiffness max and laxity min at full extension | ABS | Moderate |
| Hsu et al. 2006, AJSM, doi:10.1177/0363546505282623 | in vitro, robotic | 82 cad. | low flexion angles | 10 N·m valgus + ±5 N·m IR, combined | Rotatory laxity 26.2° (F) / 20.5° (M) | Torsional stiffness 0.79 (F) / 1.06 (M) N·m/° | ABS | Moderate (combined load) |
| Louie & Mote 1987, J Biomech, doi:10.1016/0021-9290(87)90295-8 | in vivo, electrogoniometer, foot twisted | not in abstract | not in abstract | — | — | Stiffness **0.16–2.54 N·m/°** depending on active muscles; >400% increase with activation | ABS | Moderate |
| Schmitz et al. 2008, AJSM, doi:10.1177/0363546508317411 | in vivo (VKLD) | 20 | 20° | 0–5 N·m | — | Men: stiffness unchanged as torque rose. Women: stiffness rose with torque | ABS (table values not available; figures only) | — |
| Park, Wilson & Zhang 2008, J Orthop Res, doi:10.1002/jor.20576 | in vivo, passive | 20 | 60° | — | — | F > M laxity in ER. Hysteresis / energy loss reported | ABS | — |
| Wojtys et al. 2003, JBJS Am, doi:10.2106/00004623-200305000-00002 | in vivo, 80 N forefoot impulse | 52 | 30°, 60° | impulse | Women 16% (passive) / 27% (active) more rotation | Women 18% smaller volitional stiffness increase | ABS | Moderate |
| Shoemaker et al. 1988, Clin Orthop 228:164 | in vivo, max effort against fixed footplate | 18 males | 20°, 45° | maximal | — | **30–71 N·m** by condition. 45° 11–16% > 20°. Stance 19–49% > seated. Torso free +17–49%. Restrained: IR = ER. No strong correlation with body weight or height | ABS | Moderate–high |
| Armour et al. 2004, AJSM, doi:10.1177/0363546504263405 | in vivo, isokinetic | 30 (post-ACLR; non-operated limb used) | 90° | — | — | IR peak torque, non-operated limb: 20.5±4.7 ft-lb at 60°/s = **27.8±6.4 N·m**; 21.6 N·m at 120°/s; 18.2 N·m at 180°/s [DERIVED unit conversion] | ABS | Moderate |
| Buford et al. 2001, Knee, doi:10.1016/s0968-0160(01)00106-5 | in vitro, moment arms | 17 cad. | flexion range | — | — | IE moment arms largest in flexion (IR peak 70°, ER peak 90°). At 30°: semimembranosus 10–12 mm, popliteus 0–10 mm, biceps 15–32 mm | ABS | Moderate |
| Iwaki, Pinskerova & Freeman 2000, JBJS Br, doi:10.1302/0301-620x.82b8.10717 | in vitro, MRI, unloaded | 6 cad. | 0–110° | none | About 5° obligatory IR over 0–10°. About 20° total at 110°, largely suppressible by ER torque | — | ABS | Moderate |
| Ishii et al. 1997, Clin Orthop 343:144 | in vivo, **intracortical pins** | 5 | 0–60° | active motion | Coupled IR/ER 10.6±2.8° ("screw-home") | — | ABS | Moderate–high |
| Johal et al. 2005, J Biomech, doi:10.1016/j.jbiomech.2004.02.008 | in vivo, interventional MRI | 10 | hyperextension → full squat | WB and NWB | Femoral ER (tibial IR) 20° by 120°. Beyond 120°, both condyles move back by similar amounts. Flexion with tibial ER reverses much of the coupled rotation | — | ABS | Moderate |
| Hamai et al. 2013, BioMed Res Int (PMC3591185) | in vivo, fluoroscopy + CT registration | (not extracted) | lunge 85–150° | WB | Femoral ER relative to tibia 15° over the activity, **30° at 150°** | — | FT | Moderate |
| Nakagawa et al. 2000, JBJS Br, doi:10.1302/0301-620x.82b8.10718 | in vivo, MRI, unloaded | 20 | active 90–133°, passive to 162° | none | Medial condyle back 4.0 mm, lateral back 15 mm → tibial IR. At 162° the lateral condyle lies posterior to the tibia | — | ABS | Moderate |
| Hame, Oakes & Markolf 2002, AJSM, doi:10.1177/03635465020300041301 | in vitro | 37 cad. | 0°, 90°, full flexion, forced hyperflexion | ±10 N·m | — | 10 N·m internal torque at full extension or full flexion is the "most dangerous" ACL loading | ABS | Moderate |

---

## 2. Q1: Knee axial ROM vs flexion, in vivo

### 2.1 Bone-level in vivo data (best evidence for a tibiofemoral joint)

| Flexion | ≈2.5 N·m | ≈5–6 N·m | ≈9–10 N·m |
|---|---|---|---|
| 0° | no data | IR 9.5–9.6 / ER 6.2–7.0, total ≈16 (Hemmerich, MRI) | no bone-level data |
| ≈20° | — | IR 10.8 / ER 7.4, total 18.2 (Nordt, CT) | — |
| 30° | IR 3.7 / ER 7.6 (Moewis) | IR 8.8–8.9 / ER 13.9–14.6, total ≈23 (Hemmerich) | — |
| 60° | — | — | — |
| 90° | IR 4.0 / ER 10.0 (Moewis) | IR 10 / ER 16, total 26 (Almquist RSA, via Tsai) | total ≈38–42 [DERIVED, see below] |
| 120–150° | **no data found** | **no data found** | **no data found** |

The 90°/≈9–10 N·m estimate is my derivation from two independent routes:

- Shoemaker & Markolf 1982: tibial rotation ≈½ foot rotation [ABS]. Their single-subject foot total at ±10 N·m and 90° was 76–83° [SEC]. Half of that is ≈38–42°.
- Almquist 2011: device total 76° at 9 N·m [FT]. The device overestimates by ≈100% (Almquist 2002 [ABS]), giving ≈38°.

Both routes rely on a single "≈2×" correction factor. Treat ±5° as the minimum uncertainty.

Things to keep in mind:

- The IR/ER split at 30–90° favours ER, about 60–70% of total (Moewis; Almquist RSA; Hemmerich 30°). At 0–20° the split **reverses**: IR ≥ ER (Hemmerich 0°; Nordt 20°). Zarins (foot-level) shows ER > IR at every angle, including 5°.
- Women show 10–40% more laxity than men (Almquist 2013 [ABS]; Hsu 2006 [ABS]; Mouton 2016 review cites "up to 40% higher" (Park 2008) [FT-sum]). Higher body mass goes with lower laxity (Mouton 2012 [ABS]). Elite soccer players had **less** passive rotation ROM and higher rotation strength than non-athletes (Muaidi 2009 [ABS]; no numbers accessed). A male football player should therefore sit at the lower-laxity end.

### 2.2 Foot- or skin-level in vivo data (what clinical "ROM" tables usually report)

- Zarins 1983 [ABS]: ≈25° IR / ≈45° ER at 30–90°, 10° / 23° at 5°.
- Mossberg & Smith 1983 [SNIP]: active total 35 / 40 / 44° at 70 / 90 / 100°, ER ≈2× IR.
- Osternig 1980 [SNIP]: active isokinetic total 57–59° at 90°, 50° at 45°.
- Almquist 2011 [FT]: 72–79° at 9 N·m or end-feel.
- These are about 2× bone-level (see Summary item 1). **Our model's soft 20/30 and hard 30/40 sit squarely in this foot-level class.**

### 2.3 Flexion trend

All data sets agree on three points:

1. **Minimum at full extension.** Markolf 1976 [ABS]: stiffness max, laxity min. Lagae: IR 7.5° at 0° vs 18° at 30°. Musahl: total 23° at 0° vs 46° at 90°. Hemmerich: 16° vs 23° (0° vs 30°). Zarins: 33° at 5° vs ≈70° at 30–90°.
2. **Steep rise from 0° to about 30–45°.** Lagae IR: 7.5 → 11.1 → 15.1 → 18.1° at 0 / 10 / 20 / 30° [FT]. Roth: +10° in each direction from 0° to 45° [ABS].
3. **Plateau from about 40° to 100°.** Lagae IR: 19.5 / 19.8 / 19.2 / 18.0 / 17.9° at 40 / 50 / 60 / 90 / 100° [FT]. Roth: 45° ≈ 90° [ABS]. Almquist 2013: no difference among 30 / 60 / 90° [ABS]. Zee 2020 recommends 0°, 30°, 60° because "with more than 60° of knee flexion, no further increase in range of tibial rotation is seen" [FT; based on surgical-navigation (CAS) data from ACL patients].

Some data conflict. Tsai 2008 [FT] found **less** total rotation at 90° than at 30°. Moewis [FT] found **more** at 90°. Both used small groups, and Tsai's skin sensors are prone to artefact.

The plateau region is the only flexion band where the evidence is consistent. Beyond 100–120° there is no torque-defined data (see Q6).

---

## 3. Q2: Screw-home, and how much free axial rotation exists at full extension

### Magnitude of coupled rotation near terminal extension

- About 5° may be obligatory between 0° and 10° (unloaded cadaver MRI; Iwaki 2000 [ABS]).
- 10.6 ± 2.8° of coupled IR/ER between full extension and 60°, in vivo with intracortical pins, n=5 (Ishii 1997 [ABS]).
- About 18° of internal tibial rotation from maximum extension to 90° in native knees (Nedopil 2023, citing three earlier studies [SEC]).
- About 17° in gait from skin-marker motion capture (Kim 2015 [ABS]). Skin artefact makes this an over-estimate (low confidence).
- 6.27 ± 2.35° tibiofemoral rotation angle in hyperextension on positional MRI in controls (Li Z 2026, QIMS [ABS]). Its reference frame differs, so it is only indicative.

### The coupling is not rigid

- Blankevoort 1988 [ABS]: external rotation during extension "is not an obligatory effect of the passive joint characteristics, but a direct result of the external loads."
- Wilson 2000 [ABS]: in 15 cadaver knees, internal tibial rotation with passive flexion "was always observed." When the femur was pushed off its path it "sprang back," but "the exact shape of the path is very sensitive to load."
- Iwaki 2000 [ABS]: most of the ≈20° coupled rotation at 110° "can be suppressed by applying external rotation."
- Johal 2005 and Hill 2000 [ABS]: flexion with the tibia held in ER reverses or suppresses much of the coupled rotation, especially without weight-bearing.

### Free axial rotation at full extension: not ≈0, and not 10% of the mid-flexion range

- Bone-level in vivo at ≈5 N·m: ≈16° total at 0° vs ≈23° at 30° (Hemmerich), a ratio of ≈0.7.
- Cadaver: IR 7.5° at 0° vs ≈18–20° at 30–100° under 5 N·m (Lagae), ≈0.4.
- Cadaver: total 23° vs 46° (Musahl), 0.5.
- Cadaver ±3 N·m: each direction ≈10° smaller at 0° than at 45° (Roth).
- Anaesthetised surgical navigation, reconstructed knees: 14.8° vs 26.6° (Lee), ≈0.56.
- Foot-level: 33° at 5° vs ≈70° at 30–90° (Zarins), ≈0.47.

**[DERIVED] The ratio of full-extension total range to mid-flexion total range is ≈0.4–0.7 across methods.** The knee is stiffest at extension (Markolf 1976), so the torque rises earlier and more steeply there. But the range under a modest torque (3–5 N·m) is still several degrees in each direction.

Our model's 10% scaling of the soft range at full extension (2° IR / 3° ER) may be acceptable for the onset of resistance. Keeping the **hard** limits at 30/40° at full extension contradicts every data set: at ≈5–7 N·m, bone-level rotation is ≈7–10° per direction at 0°, not 30–40°.

Hyperextension (−5°): I found no axial-laxity data. Extrapolation from the trend suggests it should be at least as stiff as 0° [DERIVED].

---

## 4. Q3: Torque–rotation curves (neutral zone, mid-range and end-range stiffness)

### Qualitative shape

- Non-linear and stiffening (Markolf 1976 [ABS]).
- Clearly hysteretic in vivo (Moewis 2016 [FT]; Park 2008 "energy loss" [ABS]).
- In men at 20° flexion, incremental stiffness was roughly constant over 0–5 N·m; in women it rose with torque (Schmitz 2008 [ABS]). So a pronounced low-stiffness "neutral zone" is not universal.
- Almquist 2011 [FT] noted that "3 Nm torque is too small to reach the end-points of the mechanical restraints."

### Stiffening up to 9 N·m is gradual

At 90°, Rottometer totals were 30 → 56 → 76° at 3 → 6 → 9 N·m [FT]. Each 3 N·m step added 26° and then 20°, a ≈1.3× rise in incremental stiffness.

The examiner's "end-feel" fell between the 6 and 9 N·m readings (72° at 90°; 78° at 30°). The perceived end of range in awake relaxed people therefore corresponds to roughly 8–9 N·m [DERIVED interpretation].

### Numerical stiffness

- Louie & Mote 1987 [ABS]: 0.16–2.54 N·m/°. The low end is relaxed, the high end is multi-muscle activation. The foot was twisted, so the ankle is in series and knee-only stiffness is higher than the low end.
- Hsu 2006 cadaver [ABS]: 0.79 (F) / 1.06 (M) N·m/° under combined valgus + IR load.
- Bone-level secant stiffness, 90° flexion [DERIVED]:
  - 0 → 2.5 N·m (Moewis): IR ≈0.6 N·m/°, ER ≈0.25 N·m/°.
  - 2.5 → 6 N·m (Moewis vs Almquist RSA, different subjects; cross-study, low confidence): ≈0.6 N·m/° in both directions.
  - 6 → 9 N·m (Almquist 2011 device, halved for the ≈2× overestimate): ≈0.6 N·m/° per side.
  - Net: **≈0.25–1 N·m/° up to ≈10 N·m in relaxed knees, with no step change.**

### Above 10–15 N·m

- Awake subjects have been tested to 15 N·m with the Rotameter at 30°, prone (Lorbach 2009 [ABS]; no values accessed). The Rotameter overestimated total range by ≈5, 10 and 25° at 5, 10 and 15 N·m (Mouton 2016 review [FT-sum]).
- I found no in vivo torque–rotation data above ≈15 N·m. Cadaver ligament failure in ER occurred at torques "similar in magnitude to the maximum generated isometric torque" (Shoemaker 1982 [ABS]), about 30–70 N·m in Shoemaker 1988 [ABS].

### Judgement on our passive law

Model numbers for 78 kg: capacity 27.3 N·m; 25% = 6.8 N·m at the hard limit; end-stop slope = 0.75 × 27.3 / 3° ≈ **6.8 N·m/°** [DERIVED].

- **Soft → hard segment.** Its average secant slope at ≥60° flexion is 6.8 N·m over 10° ≈ 0.7 N·m/°. That falls within the measured bone-level range. The problem is **location**: the model develops this torque at 20–40° of rotation, while bone-level data develop the same torque at ≈10–16° (90°) and ≈7–10° (0°).
- **At full extension** the same 6.8 N·m is spread over 2–3° → 30–40°, a secant of ≈0.24 N·m/°. This makes extension the most compliant posture in the model, which is the opposite of Markolf 1976.
- **End-stop segment (≈6.8 N·m/°).** No in vivo data reach this torque range. It is ≈7–25× the bone-level relaxed values, and ≈2.7× Louie & Mote's maximal co-contraction stiffness (foot-level). It cannot be called physiological or unphysiological from data. It is acceptable as a numerical barrier if physiological motions rarely enter it. Entering it during **passive rest** points to a misplaced envelope rather than an end-stop that is too soft (see Q6).

---

## 5. Q4: Muscular contribution to torsional stiffness

- Louie & Mote 1987 [ABS]:
  - Stiffness rose with the number of active muscles, from 0.16 to 2.54 N·m/°.
  - "Increases in joint stiffness of over 400% by activation of these muscles."
  - Within-test SD was 0.02–0.25 N·m/°, so the result was repeatable.
- Wojtys 2003 [ABS]: athletes can volitionally raise apparent torsional stiffness under an internal-rotation impulse at 30° and 60°. Women's increase was 18% smaller than men's. The absolute increase is not in the abstract.
- Markolf 1978 [ABS] (anterior–posterior and varus–valgus, not axial, so analogy only): tensing the knee muscles raised stiffness 2–4× and reduced laxity to 25–50%.
- Shoemaker & Markolf 1982 [ABS]: maximal isometric tibial torque is of the same order as the cadaver ligament-failure torque, so muscle can protect the ligaments. Subjects produced more torque in the direction that returns a pre-rotated foot to neutral.
- Muaidi 2009 [ABS]: elite soccer players had "stiffer" knees, with less passive rotation and more strength.
- Rotator moment arms grow with flexion (Buford 2001 [ABS]). Muscular axial stiffness and strength are therefore likely smallest near extension and largest at 60–90° [DERIVED].

Model implication: actuator-mediated stiffness up to roughly 2–3 N·m/° is supported for co-contraction (Louie & Mote order of magnitude, foot-level). A passive resting knee should rely on passive stiffness of about 0.25–1 N·m/° (bone-level).

---

## 6. Q5: Isometric internal/external rotation strength vs flexion

### Magnitude

- Shoemaker 1988 [ABS], 18 males: 30–71 N·m across conditions.
  - With hips and shoulders restrained (lower-leg muscles only), IR and ER torques did not differ.
  - With the torso free, torque was 17–49% higher and IR exceeded ER by 12%.
  - "No strong correlations between generated torque and body weight or height." This undermines pure N·m/kg scaling.
- Armour 2004 [ABS]: concentric isokinetic IR at 90° flexion, 60°/s, non-operated limb: 20.5 ± 4.7 ft-lb = **27.8 ± 6.4 N·m** [DERIVED conversion]. ER is not given in the abstract. Isometric peaks are usually at least as high as 60°/s concentric peaks [RECALLED — unverified general principle].
- Viola 2000 and Zhang 2002 [ABS]: no absolute numbers in the abstracts.
- Osternig 1981 [ABS]: peak rotary torque arises within the first 5–10° of rotation.

### Flexion dependence

- 45° is 11–16% stronger than 20° (Shoemaker 1988 [ABS]).
- Torque is lower at 45° than at 90° (Osternig 1980 [SNIP]).
- Flexing from 20° to 90° raised ER torque; IR torque changed less (Shoemaker 1982 [ABS]).
- Moment arms peak at 70° (IR) and 90° (ER) (Buford 2001 [ABS]). At 30° the popliteus moment arm can approach 0 mm.
- No strength data were found for full extension or for flexion beyond ≈90–100°.
- I searched for a "Pedersen" knee-rotation strength study and found none.

### Assessment of 0.35 N·m/kg (≈27 N·m at 78 kg)

- It agrees with the order of magnitude at 45–90° (≈28–30+ N·m in adult males). It is probably conservative for elite athletes (Muaidi: stronger).
- It is probably too high near full extension, where moment arms are small. The evidence supports making capacity flexion-dependent (lower at 0–20°).
- Per-kg scaling is weakly supported (Shoemaker 1988: no strong correlation with body weight).

**Confidence: moderate for magnitude at 45–90°, low elsewhere.**

---

## 7. Q6: Is a large axial ROM, and a ≈20+ N·m axial end-range load, plausible at ≈145° flexion?

### Axial freedom in deep flexion

The evidence says some freedom exists, but its torque–rotation behaviour is unmeasured.

- Coupled tibial IR keeps growing into deep flexion:
  - ≈20° by 120° (Johal 2005 [ABS]).
  - 15° → 30° from 85° to 150° in a lunge (Hamai 2013 [FT]).
  - 12.9° over full weight-bearing flexion (Li 2007 [ABS]).
  - Lateral condyle 15 mm vs medial 4 mm posterior over 90–162° (Nakagawa 2000 [ABS]). With an assumed 40–50 mm medial–lateral contact separation, that is ≈12–15° of extra IR [DERIVED; the separation is my assumption].
  - Kneeling at 150–165° involves internal tibial rotation (Hefzy 1998 [ABS]).
- That rotation is not locked:
  - Flexion with the tibia in ER reverses much of the femoral ER up to full squatting (Johal 2005 [ABS]).
  - The ≈20° rotation at 110° is largely suppressible (Iwaki 2000 [ABS]).
  - In deep flexion both femoral condyles move back onto the posterior horns, and the lateral condyle almost subluxes (Johal 2005; Freeman & Pinskerova 2005 [ABS]). The ACL, PCL and collateral geometry differs from mid-flexion.
- **No study found** gives passive IR/ER limits or stiffness at a defined torque beyond ≈100–120°. Lagae stops at 100°. Roth's J Orthop Res study reaches 120° but absolute values were not accessible. Hame 2002 applied 10 N·m at full flexion and forced hyperflexion in cadavers, but only ACL forces are reported in the abstract.

### Is a resting 20+ N·m passive axial end-range load plausible?

**No [DERIVED from the following]:**

- Awake passive tests stop at 9–15 N·m because of end-feel or discomfort (Almquist 2011; Lorbach 2009; Moewis kept ≤2.5–3 N·m to protect grafts).
- Cadaver ligament failure in ER occurred near maximal voluntary torque (Shoemaker 1982), and that is 30–71 N·m (Shoemaker 1988). A sustained 23–25 N·m passive load is about one-third to most of that level.
- 10 N·m of **internal** torque at full flexion already produces the "most dangerous" ACL loading in cadavers (Hame 2002).
- In a prone rest posture with the knee at about 145°, the external axial torque from gravity on the foot about the tibial axis is about 0.5 N·m [DERIVED estimate: foot ≈1.1 kg, centre of mass ≈7 cm off the tibial axis, shank about 35° past vertical; not from literature]. A 23 N·m knee axial load at rest therefore needs an external contact twisting the leg, or limits that conflict with each other.
- Constraining the foot in several degrees of freedom produced constraint moments "as high as 23 Nm" in an in vivo test rig (Mills & Hull 1991 [ABS]). Ankle constraint changed measured knee torsional laxity by ≈30% (Quinn 1991 [ABS]). Series foot/ankle constraint really can generate large axial moments, but that is a test-rig artefact, not a resting physiological state.

### Likely contributors in the model [DERIVED hypotheses, to check against the actual load direction]

1. Fixed axial zero plus no flexion-dependent shift of the envelope centre. At 145°, physiological IR coupling (≈20–30°) sits at the model's 30° IR hard limit.
2. Ankle axial plus knee axial ranges that both carry foot-level magnitudes, which double-counts leg axial compliance and lets a contact push both joints to their end ranges.

---

## 8. Q7: Conclusions on the current model

### Is the ROM defensible?

- **As tibiofemoral (bone-level) ROM, no.** The soft and hard values (20/30, 30/40) match foot/skin-level clinical ROM, which is about 2× bone-level.
- **As "whole lower-leg twist" ROM with no separate ankle axial DOF, roughly yes.** The model has an ankle axial joint, so this reading does not apply.
- Bone-level relaxed totals:
  - ≈16° at 0° under ≈5 N·m.
  - ≈23–26° at 30–90° under ≈5–6 N·m.
  - ≈38–42° at 90° under ≈9–10 N·m [DERIVED].
- The ER > IR asymmetry in the model (≈60:40) matches 30–90° data. It may invert near extension (Hemmerich 0°, Nordt 20°).

### Should the hard limit vary with flexion?

**Yes.**

- Cadaver data show both directions' limits ≈10° smaller at 0° than at 45° and 90° under ±3 N·m (Roth 2015). IR under 5 N·m rises from 7.5° to ≈18–20° between 0° and 30–40° (Lagae 2020).
- In vivo bone-level totals rise ≈1.4× from 0° to 30° (Hemmerich).
- The envelope centre (neutral) should also shift internally with flexion: ≈5° over 0–10°, ≈10° by 60°, ≈20° by 90–120°, ≈30° by 150°, weight-bearing (Iwaki; Ishii; Johal; Hamai).
- Above 100–120°, the envelope width is unknown.

### Is the end-stop model adequate?

- **The 25% → 100% over 3° slope is not supported by data.** It is not contradicted either, because nobody has measured that torque range in vivo. It is acceptable as a numerical safety barrier.
- **What does conflict with data** is the angle at which the model reaches the 25% (≈6.8 N·m) point: 30–40° from a fixed zero, vs ≈7–16° from a flexion-dependent neutral in bone-level data.
- **Also in conflict:** at full extension the passive law spreads that torque over 28–37°, making extension the most compliant posture, the reverse of the data.
- A physiological passive state (prone rest) loading the end-stop to 23 N·m is a symptom of the envelope placement, not of end-stop stiffness.

---

## 9. Implications for the model

### Evidence-supported (with conditions)

| Quantity | Supported value or range | Conditions | Main sources | Confidence |
|---|---|---|---|---|
| Bone-level total axial range at ≈5–6 N·m | ≈16° at 0°; ≈18–23° at 20–30°; ≈26° at 90° | relaxed, non-weight-bearing, healthy adults | Hemmerich (via Zee), Nordt, Almquist RSA (via Tsai) | moderate |
| Bone-level range at ≈2.5 N·m | IR ≈4°, ER ≈8–10° at 30–90° | relaxed, non-weight-bearing | Moewis | moderate–high (n=9) |
| Bone-level total at ≈9–10 N·m, 90° | ≈38–42° | derived from two ×½ corrections | Shoemaker 1982 + Almquist 2011/2002 | low–moderate |
| Flexion trend of range | minimum at 0°; steep rise to ≈30–45°; plateau to ≈100° | in vitro and in vivo agree | Lagae, Roth, Hemmerich, Zarins, Almquist 2013 | high (shape) |
| Full-extension range ÷ mid-flexion range | ≈0.4–0.7 (not 0.1) | method-independent | multiple, [DERIVED] | moderate |
| Outer (hard) limits vary with flexion | ≈±10° per direction between 0° and 45° (cadaver, ±3 N·m) | in vitro | Roth 2015 JBJS | moderate–high |
| Neutral shifts to tibial IR with flexion | ≈5° (0–10°), ≈10° (0–60°), ≈18–20° (90–120°), ≈30° (150°, weight-bearing lunge); not obligatory | in vivo + in vitro | Iwaki, Ishii, Nedopil [SEC], Johal, Hamai | moderate |
| IR/ER asymmetry | ER ≈60–70% of total at 30–90°; IR ≥ ER near 0–20° | bone-level | Moewis, Almquist RSA, Hemmerich, Nordt | moderate (extension asymmetry low) |
| Relaxed passive stiffness | ≈0.25–1 N·m/° up to ≈10 N·m, gradually stiffening and hysteretic | bone-level, derived / in vitro | Moewis, Almquist, Hsu, Schmitz, Markolf 1976 | low–moderate |
| Active (co-contraction) stiffness | up to ≈2.5 N·m/° (>4× relaxed) | foot-level in vivo | Louie & Mote | moderate |
| Max lower-leg rotation torque | ≈30 N·m+ (lower leg only, 20–45°, seated); IR ≈28 N·m isokinetic at 90° | adult males | Shoemaker 1988; Armour 2004 | moderate |
| Strength vs flexion | 20° < 45° < 90°; ER gains more with flexion than IR | — | Shoemaker 1982/1988; Osternig 1980; Buford 2001 | moderate (direction), low (magnitude) |

### Not supported by the evidence found

- Hard limits fixed at 30° IR / 40° ER at **all** flexion angles, including 0°. The data contradict this at 0–30°.
- Hard limits of 30/40° even at 60–90°, if the knee DOF is meant to be tibiofemoral and the ankle axial DOF exists separately. That is ≈2.5–3× bone-level at the same torque.
- Scaling of the **soft** range only, with a floor of 10% at full extension. The data show the whole envelope shrinking to ≈40–70%, not onset to 10% with the outer limit unchanged.
- A fixed axial zero across flexion. The coupled IR of 20–30° by 120–150° is not represented.
- The 25% → 100% capacity over 3° end-stop slope as a physiological law. There are no data in that torque range in vivo.
- A flexion-independent 0.35 N·m/kg capacity. Strength is lower near extension, there are no data beyond ≈100°, and the correlation with body weight is weak.
- A resting passive axial load of ≈20+ N·m at 145°, as a physiological state.

### Open uncertainty

- **Deep flexion (≥120°):** no torque-defined passive IR/ER limits or stiffness found, in vivo or in vitro (only kinematics). This is the largest gap, and it is exactly where the blocker lives.
- **Above ≈10–15 N·m:** no in vivo torque–rotation data. Cadaver failure torque is of the same order as maximal voluntary torque (≈30–70 N·m), but the angle at failure was not accessible.
- **Several primary papers were not readable here:** Shoemaker & Markolf 1982 torque tables, Louie & Mote curves and flexion angles, Blankevoort 1988 envelope values (repository PDF blocked by Cloudflare), Markolf 1976 values, Mossberg 1983 and Osternig 1980 full texts (JOSPT 403, LWW 402), Muaidi 2009 strength numbers. These would tighten the extension/90° stiffness and strength numbers if obtained.
- **Bone-level evidence is thin:** n ≤ 32 per study, often contralateral knees of ACL patients. Cross-study derivations (e.g. stiffness from Moewis + Almquist) mix subjects.
- **Weight-bearing and joint compression:** expected to change IR restraint, since articular contact supplies 50–85% of it (Blankevoort 1996), and to change the size of the coupled rotation (Johal). The magnitude of compression-dependent laxity reduction was not accessed (Markolf et al. 1981, JBJS Am 63:570, title only).
- **Sex, body mass and athletic status:** they shift values by 10–40%. Football players likely sit at the lower-laxity, higher-strength end (Muaidi 2009, direction only).

---

## 10. Search and access notes

- I read full texts via Europe PMC XML for: Zee 2020, Almquist 2011, Tsai 2008, Moewis 2016, Lagae 2020, Hamai 2013, Vap 2017 (changes only, no absolute values) and Nedopil 2023 (secondary statements). Mouton 2016 and Shultz 2012 were read through a summariser.
- PubMed abstracts were read via NCBI E-utilities for every other [ABS] item.
- Blocked: JOSPT (403), ScienceDirect (403), LWW/Ovid (402), and the TU/e repository PDF of Blankevoort 1988 (Cloudflare).
- Schmitz 2008: the PMC version shows stiffness only in figures. A summariser gave numeric ranges that I could not verify, so they are excluded.

## Sources (DOI / ID)

Moewis 2016 PLoS One 10.1371/journal.pone.0159600 · Almquist 2002 J Orthop Res 10.1016/S0736-0266(01)00148-6 · Almquist 2011 BMC MSD 10.1186/1471-2474-12-291 · Almquist 2013 J Orthop Res 10.1002/jor.22184 · Tsai 2008 BMC MSD 10.1186/1471-2474-9-35 · Musahl 2007 KSSTA 10.1007/s00167-007-0317-9 · Hemmerich 2011 AJSM 10.1177/0363546510379333 · Hemmerich 2012 Clin Biomech 10.1016/j.clinbiomech.2012.01.005 · Nordt 1999 AJSM 10.1177/03635465990270051101 · Zee 2020 OJSM 10.1177/2325967120945967 · Zarins 1983 AJSM 10.1177/036354658301100308 · Mossberg & Smith 1983 JOSPT 10.2519/jospt.1983.4.4.236 · Shoemaker & Markolf 1982 JBJS Am 64:208 (PMID 7056775) · Shoemaker 1988 Clin Orthop 228:164 (PMID 3342561) · Stoller 1983 Clin Orthop 174:172 (PMID 6831802) · Markolf 1976 JBJS Am 58:583 (PMID 946969) · Markolf 1978 JBJS Am 60:664 (PMID 681387) · Louie & Mote 1987 J Biomech 10.1016/0021-9290(87)90295-8 · Blankevoort 1988 J Biomech 10.1016/0021-9290(88)90280-1 · Blankevoort & Huiskes 1996 J Orthop Res 10.1002/jor.1100140425 · Lagae 2020 KSSTA 10.1007/s00167-019-05839-y · Roth 2015 JBJS Am 10.2106/JBJS.N.01256 · Roth 2015 J Orthop Res 10.1002/jor.22926 · Hsu 2006 AJSM 10.1177/0363546505282623 · Schmitz 2008 AJSM 10.1177/0363546508317411 · Shultz 2007 J Orthop Res 10.1002/jor.20397 · Shultz 2012 J Athl Train 10.4085/1062-6050-47.2.159 · Park 2008 J Orthop Res 10.1002/jor.20576 · Mills & Hull 1991 J Biomech 10.1016/0021-9290(91)90332-h and 10.1016/0021-9290(91)90025-i · Quinn 1991 J Biomech 10.1016/0021-9290(91)90285-u · Wojtys 2003 JBJS Am 10.2106/00004623-200305000-00002 · Lorbach 2009 KSSTA 10.1007/s00167-009-0772-6 and 10.1007/s00167-009-0756-6 · Mouton 2012 KSSTA 10.1007/s00167-011-1877-2 · Mouton 2016 Curr Rev Musculoskelet Med 10.1007/s12178-016-9332-0 · Branch 2010 KSSTA 10.1007/s00167-009-1010-y · Alam 2013 AJSM 10.1177/0363546512469874 · Iwaki 2000 JBJS Br 10.1302/0301-620x.82b8.10717 · Hill 2000 JBJS Br 10.1302/0301-620x.82b8.10716 · Nakagawa 2000 JBJS Br 10.1302/0301-620x.82b8.10718 · Johal 2005 J Biomech 10.1016/j.jbiomech.2004.02.008 · Freeman & Pinskerova 2005 J Biomech 10.1016/j.jbiomech.2004.02.006 · Pinskerova 2004 JBJS Br 10.1302/0301-620x.86b6.14589 · Hefzy 1998 Med Eng Phys 10.1016/s1350-4533(98)00024-1 · Hamai 2013 BioMed Res Int, PMC3591185 · Moro-oka 2008 J Orthop Res 10.1002/jor.20488 · Li G 2007 J Biomech Eng 10.1115/1.2803267 · Ishii 1997 Clin Orthop 343:144 (PMID 9345219) · Wilson 2000 J Biomech 10.1016/s0021-9290(99)00206-7 · Kim 2015 Clin Orthop Surg 10.4055/cios.2015.7.3.303 · Li Z 2026 QIMS 10.21037/qims-2025-1-2628 · Hame 2002 AJSM 10.1177/03635465020300041301 · Armour 2004 AJSM 10.1177/0363546504263405 · Viola 2000 AJSM 10.1177/03635465000280041801 · Osternig 1980 MSSE 12:195 (PMID 7402056) · Osternig 1981 Arch Phys Med Rehabil 62:381 (PMID 7259471) · Buford 2001 Knee 10.1016/s0968-0160(01)00106-5 · Muaidi 2009 Scand J Med Sci Sports 10.1111/j.1600-0838.2008.00783.x · Zhang 2002 MSSE 10.1097/00005768-200201000-00002 · Grood 1988 JBJS Am 70:88 (PMID 3335577) · Vap 2017 OJSM 10.1177/2325967117708190 · Nedopil 2023 KSSTA 10.1007/s00167-021-06840-0

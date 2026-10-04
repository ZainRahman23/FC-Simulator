# Knee axial (tibial IR/ER) torque–rotation law: curve shape, compressive load, and muscles

Date: 2026-10-04. This report builds on `lit2_knee_axial.md`: it checks that review's numbers, corrects some, and adds new data. It focuses on (1) the shape of the torque–rotation curve, (2) how compressive load changes it, (3) how muscle activity changes it, (4) end-range and injury torques, (5) rate effects, and (6) a passive law ready to put in a simulation.

## Tags

- **[FT]**: I read the full text myself.
- **[FIG]**: I read the value off a figure in a full text, by visual digitising (about ±1° / ±0.3 N·m).
- **[SUPP]**: read from a paper's supplementary spreadsheet.
- **[ABS]**: from the abstract only.
- **[SEC: X]**: the value is quoted, plotted or digitised in source X, which I read. I did not read the primary paper.
- **[SNIP]**: from a search-engine summary only.
- **[DERIVED]**: my own arithmetic; the method is stated.
- **[RECALLED — unverified]**: from memory.

Conventions:
- IR = tibial internal rotation; ER = tibial external rotation. Total = IR + ER.
- "Per side" means rotation from neutral in one direction.
- "Bone-level" means the rotation was measured on the bones (RSA, CT, MRI, fluoroscopy, bone pins, robot with bone fixation).
- "Foot-level" means it was measured at a boot or footplate, which roughly doubles the value (see lit2 §0.1).
- BW = body weight. 735 N ≈ 1 BW at 75 kg.

## Key new full texts obtained in this pass

- **Blankevoort 1988** (TU/e repository scan): I read all of it, including Figs 4–7, 10, 11 and 16. Its Fig. 16 re-plots Wang & Walker 1974, Hsieh & Walker 1976, Markolf 1976/1981, Shoemaker 1982/1983, Hungerford 1984, Nielsen 1984 and van Kampen 1986/87.
- **Schmitz 2008** (incremental IR/ER stiffness), **Shultz 2011** (IER laxity and stiffness, n=107), **Neumann 2015a** (CT-validated in vivo rotation at 5, 10 and 15 N·m), **Neumann 2015b**, **Mouton 2015**, **Branch 2015**, **Beckley 2020** and **Oh 2012** (dynamic pivot landing).
- **Seiferheld 2026**: a scoping review of 161 cadaver studies, 1,741 knees, with its raw-data supplement. The supplement contains digitised Hsieh & Walker 1976 loaded/unloaded data.

---

## 0. Bottom line

1. **The relaxed tibiofemoral curve is a J-curve.** It has a slack central region, then stiffness that rises roughly exponentially with rotation. It is not linear, and not bilinear with a flat top. It also has no discrete wall below failure torques.
   - Bone-level incremental stiffness is about 0.1–0.6 N·m/° near neutral, about 1–2.5 N·m/° by 5–6 N·m, and about 2–5 N·m/° at 10–15 N·m [DERIVED from Blankevoort 1988 FIG; Neumann 2015a FT; Serbino and Pedersen via SUPP].
   - In two independent datasets (cadaver RSA and in vivo CT), the exponential rate constant is **B ≈ 0.15–0.25 per degree**. Stiffness therefore roughly doubles every 3–4° beyond the toe region [DERIVED].
2. **Correction to lit2.** Lit2 said "gradual stiffening, ≈0.25–1 N·m/°, up to 10 N·m". That holds only below about 5 N·m.
   - Between ±3 and ±6 N·m, cadaver RSA gains only about 1–3° per side, i.e. about 1–2.5 N·m/°. Blankevoort et al. state the increase is "relatively small … due to the relatively high stiffness in that region" [FT/FIG].
   - In vivo CT between 5 and 15 N·m (Neumann 2015a; n=6, so treat it as indicative): ER grows from about 16–20° to about 24–25° and IR from about 5–8° to about 9–15° [FT].
3. **Joint compression stiffens the knee strongly in the physiological torque range.**
   - Hsieh & Walker 1976 (cadaver, ±4.9 N·m): rotatory laxity fell by about 10% at 0.5 BW, about 20–55% at 1 BW and about 60–85% at 2 BW [SEC: Seiferheld 2026 SUPP, digitised; DERIVED percentages].
   - Small loads (≤300 N) change the ±3 N·m envelope by less than 2° (Blankevoort 1988 [FT]).
   - Compression also moves the zero-torque (neutral) angle, by about 4–5° at 1600 N (Liu-Barba 2007 [ABS]) and by up to 10–20° inside the envelope at 300 N in flexion (Blankevoort Fig. 10 [FIG]).
4. **Muscle co-contraction can raise axial stiffness more than 4×**: 0.16 → 2.54 N·m/° at foot level (Louie & Mote 1987 [ABS]). Under simulated muscle forces plus about 1 BW of impulsive compression, cadaver knees rotated only about 11° for 26 N·m IR and about 18° for 25 N·m ER (secant about 1.4–2.5 N·m/°; Oh 2012 [FT]/[DERIVED]).
   - Muscles are slow. Hamstring electromechanical delay is about 44 ms (quadriceps about 23 ms), and early hamstring force is tiny (Hannah 2014 [ABS]). Reflex stiffening probably needs about 100 ms or more [DERIVED].
5. **Injury torques.**
   - ACL failure under isolated internal torque: 33 ± 13 N·m at 58 ± 19° IR (elderly cadavers, 30° flexion; Meyer & Haut 2008 [ABS]).
   - Ligament failure in ER: about the same as maximal voluntary torque, i.e. 30–71 N·m (Shoemaker 1982/1988 [ABS]).
   - Tibial shaft spiral fracture: 131 ± 53 N·m (Edwards & Troy 2012 [ABS]).
   - Wang & Walker loaded cadaver knees to 25 N·m [SEC: Blankevoort 1988].
   - **A hard end-stop should therefore represent ≥25–35 N·m.** Below that, the exponential passive law itself supplies the end-feel.
6. **Deep flexion gap (lit2), partly filled.**
   - Pooled cadaver laxity at 5 N·m is as large at 120° as at 30–90°: total about 38° [SUPP, n≈65–82 knees].
   - Markolf 1976 reported about 26° (between breakpoints) at 135° [SEC].
   - Two in vitro series (Nielsen 1984; van Kampen 1986/87) show rotatory laxity at ±3 N·m peaking near 110–125° and falling by about 20–40% at 130–140° [FIG via Blankevoort Fig. 16].

---

## (a) Results table: torque–rotation curves

"Max T" is the highest torque the study applied.

| Source (DOI / ID) | In vivo / cadaver; measurement level | n | Flexion | Load condition | Max T | Rotation | Curve shape / stiffness | Tag | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Markolf, Mensch & Amstutz 1976, JBJS Am 58:583 (PMID 946969) | cadaver; handlebar device | 35 | 0, 10, 20, 45, 90, 135° | unloaded, manual | ±8 N·m (terminal tangents) | Total laxity between bilinear breakpoints: ≈10° (0°), 17–19.5 (10°), 22–24.5 (20°), 24–27 (45°), 22.5–24 (90°), 25–26 (135°) | **Non-linear, stiffening**; analysed as **bilinear**. Breakpoint torques 0.5–2 N·m. Stiffness max / laxity min at extension | ABS + SEC: Blankevoort 1988 [FT/FIG] and Seiferheld SUPP | Moderate |
| Wang & Walker 1974, JBJS Am 56:161 (PMID 4812160) | cadaver | 8 | ≈25° | unloaded | 5, 12.5 or 25 N·m | "Primary laxity" (±0.5 N·m): 8.5–25.5° total (mean ≈17 [DERIVED]); varied 4× between specimens. Total at ±5 N·m was on average **14° more** than primary | Two-phase: free zone, then stiff. Secondary laxity varied only 1.5× | SEC: Blankevoort 1988 [FT/FIG] | Moderate |
| Hsieh & Walker 1976, JBJS Am 58:87 (PMID 946171) | cadaver; Instron, cyclic, plotted torque–rotation | 4 (some data n=1) | 0°, 30° | 0–1470 N compression | ±4.9 N·m | Unloaded: 16.4–21.6° (0°), 23.9° (30°, n=1), 28.1 ± 8.1° (30°, n=4) | See table (b) | SEC: Seiferheld SUPP (digitised; coded "EXT", but the n=4 mean matches the *total* in Blankevoort Fig. 16) + ABS | Moderate (small n) |
| Shoemaker & Markolf 1982, JBJS Am 64:208 (PMID 7056775) | in vivo, relaxed; clinical device | 20 | 20°, 90° | NWB | ±10 N·m | Foot: 82 ± 19° (20°) and 91 ± 17° (90°), hip extended. Tibial: ≈33° (20°, hip flexed), ≈41° (20°, hip extended), ≈48° (90°) | Tibia ≈ ½ foot | SEC: Neumann 2015b [FT] (foot); FIG via Blankevoort Fig. 16 (tibial); ABS | Moderate |
| Markolf, Kochan & Amstutz 1984, JBJS Am 66:242 (PMID 6693451) | in vivo controls | 49 | 20° | NWB | ±? (stiffness quoted at 5 N·m) | — | Stiffness at 5 N·m: IR 0.57 ± 0.12, ER 0.56 ± 0.12 N·m/° | SEC: Schmitz 2008 [FT] | Moderate |
| Stoller et al. 1983, CORR 174:172 (PMID 6831802) | in vivo | 13 | 90° | NWB | ±10 N·m | (values not in abstract) | Laxity +14% after a 3.5-mile run; recovery ≈52 min | ABS | — |
| Louie & Mote 1987, J Biomech 10.1016/0021-9290(87)90295-8 | in vivo; foot twisted, electrogoniometer | ? | ? | NWB | ? | — | 0.16 (relaxed) → 2.54 N·m/° (co-contraction); within-test SD 0.02–0.25 | ABS | Moderate |
| **Blankevoort, Huiskes & de Lange 1988**, J Biomech 10.1016/0021-9290(88)90280-1 | cadaver; RSA (bone), 6-DOF rig | 4 | 0–100° (also 20/90° at ±6) | 0, 150, 300 N axial; ±30/45 N AP | ±6 N·m | **Total at ±3 N·m**: 13–26° (0°), ≈27–37 (20°), 33–47 (40°), 38–53 (90–95°) [FIG Fig. 7]. **Limits at ±3 N·m**: IR ≈7–13° at 0° → 20–25° at 30–40° → 22–33° at 90–100°; ER ≈5–8° at 0° → 13–20° at 30° → 17–24° at 90° [FIG Fig. 5]. **±3 → ±6 N·m** adds only 0.3–3.3° per direction (total +2.3 to +5.2°) [FIG Fig. 6] | **Saturating J-curve.** Fig. 4 (25° flexion): a near-zero-torque zone ≈21° wide, then IR +7° for 0→3 N·m and +2.8° for 3→6 N·m; ER +15.4° then +3.5°. **Incremental stiffness 3–6 N·m ≈0.9–1.1 N·m/° (Fig. 4) and ≈0.9–10, typically ≈1.5 N·m/° (Fig. 6)**. Exponential fit B≈0.2/° [DERIVED] | FT + FIG | High for shape; n=4 |
| **Schmitz et al. 2008**, AJSM 10.1177/0363546508317411 (PMC2562882) | in vivo; VKLD; skin EM sensors | 20 (10 M) | 20° | NWB and WB (40% BW) | 0–5 N·m | — | Incremental stiffness (1 N·m bins), NWB: **IR 0.26–1.01, ER 0.26–0.58 N·m/°**. **Males: stiffness unchanged with torque (≈linear 0–5 N·m); females: rising.** WB values shown in figures only. Subjects "cannot maintain relaxed muscles" beyond ≈10 N·m (said of VV) | FT | Moderate (skin artefact) |
| **Shultz, Schmitz & Beynnon 2011**, J Orthop Res 10.1002/jor.21243 (PMC3176732) | in vivo; VKLD | 107 (43 M) | 20° | NWB | 5 N·m | **Males: IR 8.9 ± 4.1, ER 12.4 ± 3.6, total 21.2 ± 6.9°**. Females: 10.6 / 15.5 / 26.0° | Mean IER incremental stiffness **M 0.43 ± 0.14, F 0.32 ± 0.08 N·m/°**. Secant at 5 N·m (M): IR 0.56, ER 0.40 N·m/° [DERIVED] | FT | Moderate–high |
| Shultz & Schmitz 2009, AJSM 10.1177/0363546509334225 (PMC2894638) | in vivo; VKLD | 96 | 20° | NWB | 5 N·m | Mean total LAX_IER: **M 19.3°, F 25.5°** | — | FT | Moderate |
| Moewis et al. 2016, PLoS One 10.1371/journal.pone.0159600 | in vivo; fluoroscopy + CT (bone) | 9 | 30, 90° | NWB, relaxed | ±2.5 N·m | 30°: IR 3.7 / ER 7.6; 90°: IR 4.0 / ER 10.0 (from the centre of the zero-resistance zone) | "Clear hysteresis" every cycle | FT (lit2) | High (small n) |
| Almquist et al. 2002, J Orthop Res 10.1016/S0736-0266(01)00148-6 | in vivo; RSA (bone) | 5 | 60, 90° | NWB | 3, 6, 9 N·m | Total at ±6 N·m: **22 ± 6° (60°), 25 ± 7° (90°)**; at 90°/6 N·m IR 10, ER 16 | Device overestimates ≈100% | SEC: Neumann 2015b [FT], Tsai 2008 [FT] | Moderate |
| Hemmerich et al. 2011, AJSM 10.1177/0363546510379333 | in vivo; MRI (bone) | 32 | 0, 30° | NWB | ≈5.2 N·m | Total ≈16° (0°), ≈23° (30°) | — | SEC: Zee 2020 (lit2) | Moderate–high |
| **Neumann et al. 2015a**, ISRN 10.1155/2015/705201 (PMC4897077) | in vivo; **CT (bone)** + Rotameter boot | 6 (3M/3F) | 30°, prone | NWB | **±15 N·m** | CT bone-level, group averages: **ER −16/−20° (5 N·m), −22/−23° (10), −24/−25° (15)**; **IR 5–8° (5), 7–15° (10), 9–15° (15)** (♂/♀ averages; each torque level from 2 subjects per sex) | **Strongly saturating.** Within-subject increments above 5–10 N·m give ≈1.2–5 N·m/° [DERIVED]. Device error grew with torque: Total Error up to 285% (female IR, 15 N·m), femoral deviation 24/46/73% at 5/10/15 N·m | FT | Moderate (n=6; ±1° reading) |
| Neumann et al. 2015b, ISRN 10.1155/2015/439095 (PMC4897369) | in vivo; Rotameter (foot) | 1 subject per figure | 30° | NWB | ±15 N·m | Male volunteer total at ±15 N·m: 80° (P2 device) | Hysteresis area **increased with rotation speed** (device warns above 0.5 rad/s) | FT (qualitative) | Low–moderate |
| Mouton et al. 2015, KSSTA 10.1007/s00167-014-3244-6 (PMC4661198) | in vivo; Rotameter (foot) | 104 | ≈30°, prone | NWB | 5 N·m | IR5 20.6 ± 6.1, ER5 30.0 ± 9.5, TR5 50.7 ± 14.8°. Regression: TR5 = 83.8 + 10.0·female − 0.6·mass(kg) → ≈37° foot-level for a 78-kg male [DERIVED] (≈18–19° bone-level if halved) | Body mass reduces laxity | FT | High as foot-level |
| Lorbach et al. 2009 (×2), KSSTA 10.1007/s00167-009-0772-6, 10.1007/s00167-009-0756-6 | in vivo (30 subjects); cadaver vs navigation (20) | 30 / 20 | ≈30° | NWB | **15 N·m** | (no values in abstracts) | Rotameter vs bone navigation r ≥ 0.8 at 5/10/15 N·m (cadavers stripped to the capsule) | ABS | — |
| Branch et al. 2015, KSSTA 10.1007/s00167-015-3768-4 (PMC4577538) | in vivo; robot, encoder (foot/lower leg) | 10 | 30° | NWB | ±5.65 N·m | Max ER −52.6°, max IR 23.9° (total ≈76.5°); rotation at T=0 −17.4° | **Hysteresis width at T=0 ("play") 26.1°**, ≈⅓ of total. Slope units unclear, not used | FT | Moderate (foot-level) |
| Beckley et al. 2020, Sports Med Open 10.1186/s40798-020-00266-7 (PMC7399727) | in vivo; robot + tibial EM sensor | 91 (≈45 M) | 30° | NWB | ±6 N·m | Males: **"slack" (between curve turning points) 16.6°**, ER end laxity 5.0–5.1°, IR end laxity 5.5–5.6° (total ≈27° [DERIVED]) | **Neutral zone ≈60% of the ±6 N·m range**; only ≈5–6° per side in the stiff end regions | FT | Moderate |
| **Seiferheld et al. 2026** (pooled cadaver), Front Bioeng Biotechnol 10.3389/fbioe.2026.1741003 (PMC13038627) | cadaver, 39 / 31 studies | IR 463 / ER 387 knees (5 N·m group) | 0–120° | unloaded, single load | 5 N·m | **IR: 9.4 (0°), 17.0 (15), 19.1 (30), 20.2 (45), 18.8 (60), 17.8 (90), 17.7 (120). ER: 10.9, 17.3, 17.0, 17.1, 17.8, 18.1, 20.2.** Totals [DERIVED]: 20.3, 34.2, 36.2, 37.3, 36.6, 35.9, 37.9° | SDs 4–9°; strong method heterogeneity | FT + SUPP | High for trend; cadaver totals ≈1.3–1.6× in vivo bone-level |
| Boguszewski et al. 2015, AJSM 10.1177/0363546515608478 | cadaver; robot; young donors (M 34.6 y) | 47 (22 M) | 0–50° | unloaded | ±5 N·m | **Male**: IR 6.0 (0°), 11.5 (10), 14.7 (20), 16.5 (30), 17.1 (40), 16.2 (50); ER 6.4, 9.8, 11.9, 13.5, 14.6, 15.4 | Male internal stiffness 42% > female at 0–30° | ABS + SEC: Seiferheld SUPP (digitised) | Moderate–high |
| Markolf et al. 2008 (in Seiferheld SUPP) | cadaver | 12 M | 0–120° | unloaded | 5 N·m IR | IR 7.6 (0°), 14.9 (10), 19.6 (20), 23.1 (30), 26.3 (45), 29.3 (60), 31.5 (90), 31.9 (120) | — | SEC: Seiferheld SUPP | Moderate |
| Serbino et al. 2015 (in Seiferheld SUPP) | cadaver | 10 | 0–90° | unloaded | 2 and 5 N·m ER | ER at 2 → 5 N·m: 8.4→11.8 (0°), 9.5→13.0 (30), 9.9→13.5 (60), 11.7→15.5 (90) | **Toe then stiff**: 0–2 N·m secant ≈0.17–0.24; 2–5 N·m incremental ≈0.8–0.9 N·m/° [DERIVED] | SEC: Seiferheld SUPP | Moderate |
| Pedersen et al. 2019 (in Seiferheld SUPP) | cadaver; biplanar X-ray (bone) | 4 | 30° | unloaded | 3 and 6 N·m | IR 10.2 (3) → 15.3 (6); ER 20.3 (3) | IR 0–3 secant 0.29; 3–6 incremental 0.6 N·m/° [DERIVED] | SEC: Seiferheld SUPP | Low–moderate |
| Musahl et al. 2007 (in Seiferheld SUPP) | cadaver | 4 | 0–90° | unloaded | ±6 N·m | IR 11.3 / 22.1 / 35.3 / 27.3; ER 11.7 / 19.4 / 18.9 / 18.3 (0 / 30 / 60 / 90°) | — | SEC: Seiferheld SUPP | Low–moderate |
| Hsu et al. 2006, AJSM 10.1177/0363546505282623 | cadaver; robot | 82 | low flexion | 10 N·m valgus + IR | ±5 N·m | rotatory laxity 26.2 (F) / 20.5 (M)° | stiffness 0.79 (F) / 1.06 (M) N·m/°, measured over 2.5–5 N·m (per Schmitz 2008) | ABS + SEC | Moderate |
| Nielsen 1984; van Kampen 1986/87 (in Blankevoort Fig. 16) | cadaver | 2; 3 | 0–140° | unloaded; quadriceps 100 N | ±3 N·m | Peak 33–52° near 110–125°, then 28–37° at 130–140° | Laxity falls beyond ≈125° | FIG (via Blankevoort 1988) | Low–moderate |
| Hungerford 1984 (in Blankevoort Fig. 16) | cadaver | 1 | 0–90° | 222 N "standing" + quadriceps | ±3 N·m | ≈15° (0°) → ≈39° (40°) → ≈25° (90°) | Laxity falls as contact force rises with flexion | FIG | Low |
| Meyer & Haut 2008, J Biomech 10.1016/j.jbiomech.2008.09.023 | cadaver; elderly, repeated loading to failure | 7 pairs | 30° | (protocol detail not accessed) | to failure | **ACL failure at 33 ± 13 N·m, 58 ± 19° IR** | Secant to failure ≈0.57 N·m/° [DERIVED] | ABS | Moderate |
| **Oh et al. 2012**, AJSM 10.1177/0363546511432544 (PMC4800974) | cadaver; dynamic pivot-landing rig, simulated muscles | 15 | 15° start | impulsive compression 844–1457 N; quadriceps 726–918 N | **±25–27 N·m** (impulsive) | IR 26–27 N·m → 13.3–13.5° (baseline 2.4–2.7°); ER −24.5/−25.5 N·m → −15.0/−15.3° | Secant from baseline ≈2.4 (IR), ≈1.4 (ER) N·m/° [DERIVED] | FT | Moderate (elderly; dynamic; loaded) |

---

## (b) Loaded vs unloaded (compression or weight-bearing)

| Source | Setting | Load | Torque | Effect on axial laxity / stiffness | Tag |
|---|---|---|---|---|---|
| **Hsieh & Walker 1976** | cadaver, 30° | 0 / 367.5 / 735 / 1102.5 / 1470 N | ±4.9 N·m | n=1: 23.9 → 21.3 → 18.8 → 14.4 → 10.1° (**−11%, −21%, −40%, −58%**). n=4 at 735 N: 28.1 ± 8.1 → 15.2 ± 6.3° (**−46%**) | SEC: Seiferheld SUPP (digitised); % [DERIVED] |
| Hsieh & Walker 1976 | cadaver, 0° | same | ±4.9 N·m | Unloaded 16.4–21.6° → 12.7 (367.5 N) → 9.6–11.0 (735) → 4.9 (1102.5) → 3.2 (1470). **≈−22 to −41%, −33 to −56%, −70 to −77%, −80 to −85%** | as above |
| Hsieh & Walker 1976 | — | — | — | Mechanism: unloaded, ligaments, capsule and menisci stabilise; under load, condylar conformity ("uphill movement of the femur") dominates | ABS |
| **Blankevoort 1988** | cadaver, RSA, 0–100° | 150, 300 N axial | ±3 N·m | Envelope limits change **<2°** (Fig. 11). Within the envelope, 300 N with no torque drives the tibia into IR (up to ≈10–20° by 90–100°, Fig. 10); "consistent motion pattern" vs none unloaded | FT + FIG |
| Markolf et al. 1981, JBJS Am 63:570 (PMID 7217123) | cadaver | 925 N | ±5 N·m | "Showed a decrease of rotatory laxity with axial loading". Magnitude not accessed (a search snippet says "up to 30%"; unverified). Unloaded totals: ≈21° (0°), ≈35° (≈20–25°) | SEC: Blankevoort 1988 [FT/FIG]; [SNIP] for 30% |
| Shoemaker & Markolf 1985, JBJS Am 67:136 (PMID 3968092) | cadaver | ≤925 N | IE torque curves | Torsional laxity *increase* after primary MCL or ACL section was **unaffected** by joint load; load reduced the increase only after secondary MCL section. AP: load mattered at low force but was "overcome" at higher force | ABS |
| Hungerford 1984 | cadaver | 222 N + quadriceps, rising with flexion | ±3 N·m | Lower rotatory laxity at 60–90° than unloaded studies (≈25° vs ≈35–50°) | FIG via Blankevoort |
| Liu-Barba, Hull & Howell 2007, J Biomech Eng 10.1115/1.2800762 | cadaver | 1600 N | none | **Neutral shift**: +3.8° IR at 0° flexion, −4.9° (ER) at 30° | ABS |
| **Oh 2012** | cadaver, dynamic | ≈1–1.3 BW impulsive + muscle forces | ±25–27 N·m | Only ≈11° IR / ≈18° ER from baseline (vs unloaded cadaver ≈17–19° per side at just 5 N·m near 15–30°) | FT; comparison [DERIVED] |
| Mote & Lee 1982, J Biomech 10.1016/0021-9290(82)90254-8 | in vivo, sinusoidal 1–20 Hz, ±2–6° | weight bearing | — | "Joint compression … increased the torsional stiffness of the knee" (values not accessed) | ABS |
| Johnson & Hull 1988, J Biomech 10.1016/0021-9290(88)90146-7 | in vivo, transient | WB vs NWB | pulses 0–100 N·m at the foot, 50–600 ms | Parameters depend on weight bearing; "joint stiffness increased somewhat with weight bearing" | ABS + SEC: Mizrahi 2015 [FT] |
| Schmitz 2008; Shultz 2007 (10.1002/jor.20397, 10.1002/jor.20398) | in vivo, 20° | 40% BW | 0–5 N·m | WB IR/ER stiffness measured (figures only; numbers not accessible). INT-WB measurement was unreliable (ICC −0.15 to 0.75) | FT / ABS |
| Shultz, Beynnon & Schmitz 2009, J Orthop Res 10.1002/jor.20810 | in vivo, NWB→40% BW | — | none | Coupled rotation of a few degrees: F +ER, M IR; difference 3.4° at peak WB | ABS/FT |
| Fleming et al. 2001, J Biomech 10.1016/s0021-9290(00)00154-8 | in vivo, ACL strain gauge, 20° | standing WB | ±10 N·m | WB raised ACL strain under external torque and low internal torque (<3 N·m); **equal to NWB at higher internal torque** | ABS |
| Uh 2001 (10.1016/S0736-0266(01)00055-9); Torzilli 1994 (10.1177/036354659402200117) | in vivo / cadaver (AP analogue) | WB; 0–444 N | AP force | AP laxity −65 to 70% (WB) and −50 to 66% (compression) | ABS |

---

## (c) Muscle effect

| Source | Setting | Finding | Tag |
|---|---|---|---|
| Louie & Mote 1987 | in vivo; foot twisted (ankle in series) | Torsional stiffness rose with the number of active muscles: **0.16 → 2.54 N·m/°**, ">400%" increase; repeatable (SD 0.02–0.25) | ABS |
| Wojtys et al. 2003, JBJS Am 10.2106/00004623-200305000-00002 | in vivo; 80 N forefoot impulse; 30° and 60° | Women rotated 16% (passive) / 27% (active) more than size-matched men. Women's volitional increase in apparent torsional stiffness was 18% smaller (42% in jump/pivot sports). Absolute values not accessed | ABS |
| Markolf 1978, JBJS Am 60:664 (AP/VV analogue) | in vivo | Tensing raised stiffness 2–4× and cut laxity to 25–50% | ABS |
| Mote & Lee 1982 | in vivo frequency response | Muscle-induced bias torsion increased knee (and ankle, pelvis) torsional stiffness | ABS |
| MacWilliams et al. 1999, J Orthop Res 10.1002/jor.1100170605 | cadaver, WB flexion simulator | Hamstring co-contraction (force = vertical load) significantly reduced IR | ABS |
| Oh 2012 | cadaver, simulated quadriceps/hamstrings/gastrocnemius + compression | Secant ≈1.4–2.5 N·m/° at ±25 N·m (see table b) | FT/DERIVED |
| Shoemaker 1988, CORR 228:164 | in vivo, max effort | 30–71 N·m. +19–49% standing vs seated; +17–49% with torso free; IR = ER when restrained | ABS |
| Shoemaker & Markolf 1982 | in vivo + cadaver | Max isometric torque ≈ cadaver ER ligament-failure torque; more torque toward neutral when pre-rotated | ABS |
| Schmitz 2008 | in vivo | Higher-torque bins less reliable, attributed to involuntary guarding | FT |
| Hannah et al. 2014, MSSE 10.1249/MSS.0000000000000188 | in vivo, isometric | **EMD: hamstrings 44.0 ms, quadriceps 22.6 ms.** Explosive H/Q force ratio only 0–17% at 25–50 ms after activation | ABS |
| Shultz et al. 2001, J Athl Train 36:37 (PMC155400) | in vivo, WB rotational perturbation | Long-latency reflexes; gastrocnemius before hamstrings before quadriceps; women faster (quadriceps). Latency values not accessed (scanned PDF) | ABS |

---

## (d) Sections

### 1. Torque–rotation curves: neutral zone, toe, linear region, stiffening, hysteresis, flexion

**Shape.** Every source with a full curve shows a slack central zone followed by progressive stiffening, with rotation **saturating** as torque rises.

- Markolf 1976: "non-linear, reflecting increasing stiffness" [ABS]. Markolf summarised it as bilinear, with breakpoints at 0.5–2 N·m [SEC: Blankevoort].
- Blankevoort Fig. 4 [FIG], cadaver at 25° flexion:
  - A near-zero-torque zone about 21° wide.
  - IR then gains 7° from 0→3 N·m and only 2.8° from 3→6 N·m. ER gains 15.4° then 3.5°.
  - Fitting T = A(e^{Bθ}−1) to each branch gives B ≈ 0.20/° (IR) and ≈ 0.19/° (ER) [DERIVED].
- Neumann 2015a CT in vivo [FT]: ER at 30° flexion reaches about 16–20° by 5 N·m, then adds only about 4–7° up to 15 N·m. With different subjects at each torque level, the group means imply an incremental stiffness above 5 N·m of about 1.5–2.5 N·m/° in ER [DERIVED].
- Serbino [SUPP]: the 0–2 N·m secant is 0.17–0.24 N·m/°, and the 2–5 N·m increment is 0.8–0.9 N·m/° [DERIVED], i.e. about 4× stiffening within 5 N·m.

The best single description is **exponential (J / toe) stiffening**: stiffness rises roughly in proportion to torque, k ≈ k₀ + B·T. Bilinear fits work over 0–8 N·m.

**One apparent exception.** In males at 20° flexion (VKLD, skin sensors), incremental stiffness stayed constant at about 0.4–0.6 N·m/° over 0–5 N·m (Schmitz 2008 [FT]). Females stiffened. Skin-sensor compliance and muscle guarding can flatten curves, and the dataset stops at 5 N·m.

**Neutral zone (NZ) width.** The values depend on method:
- Cadaver: Wang & Walker primary laxity at ±0.5 N·m was 8.5–25.5° (about 17° mean) at about 25° [SEC/FIG]. Markolf's between-breakpoint laxity was about 10° at 0° and 22–27° at 20–135° [SEC]. Blankevoort Fig. 4 shows about 21°.
- In vivo, tibial sensor: Beckley "slack" 16.6° (males) at 30° [FT].
- In vivo, bone-level: at ±2.5 N·m the total is only about 11–14° (Moewis [FT]). The in vivo bone-level NZ must therefore be well under 10° total, probably **about 4–10° total (±2–5°)** [DERIVED].

Cadaver NZ widths (about 10–25°) are larger than in vivo values, probably because of age, post-mortem changes and removed soft tissue (Neumann 2015b also notes this).

**Torque each study stopped at:**

| Max torque | Studies |
|---|---|
| ±0.5–25 N·m | Wang & Walker 1974 [SEC] |
| ±2.5 N·m | Moewis |
| ±3 / ±6 N·m | Blankevoort |
| ±4.9 N·m | Hsieh & Walker |
| ±5 N·m | VKLD studies, Hemmerich (≈5.2), Mouton 2015, Boguszewski, most robotic cadaver studies |
| ±5.65 N·m | Branch |
| ±6 N·m | Beckley, Musahl |
| ±8 N·m | Markolf 1976 |
| ±9 N·m | Almquist |
| ±10 N·m | Shoemaker 1982, Stoller 1983, Mouton 2012 |
| ±15 N·m | Lorbach 2009, Neumann 2015 |
| ≈25 N·m (impulsive) | Oh 2012 |
| To failure (33 ± 13 N·m) | Meyer & Haut |
| Pulses up to 100 N·m at the foot, in vivo | Johnson & Hull |

**Hysteresis.**
- Present in every in vivo curve (Moewis "clear hysteresis" [FT]; Park 2008 energy loss, higher in women [ABS]).
- At foot level the loop is wide: 26° play at zero torque out of about 76° total (Branch [FT]).
- The loop grows with speed (Neumann 2015b [FT, qualitative]).
- No bone-level hysteresis magnitude was found.

**Flexion dependence.**
- The total range at 0° is about 0.55–0.7× the mid-flexion value:
  - In vivo: 16 vs 23° at about 5 N·m (Hemmerich).
  - Pooled cadaver: 20 vs 36° [SUPP].
  - Young male cadavers: 12.5° at 0° vs 30° at 30° [SUPP/DERIVED].
- Steep rise to 15–30°, then a plateau to at least 120° [SUPP], with a possible decline beyond about 125–130° [FIG].
- At 0–20° IR ≥ ER in vivo, while at 30–90° ER > IR in vivo (lit2). In cadaver pooled data IR ≈ ER.

### 2. Weight-bearing and compression

**Magnitude (best quantitative source: Hsieh & Walker 1976, digitised in SUPP).** At ±4.9 N·m, total rotatory laxity fell monotonically with compression.

| Load | 30° flexion | 0° flexion |
|---|---|---|
| ≈0.5 BW | −11% | −22 to −41% |
| ≈1 BW | −21% (n=1) to −46% (n=4) | −33 to −56% |
| ≈1.5 BW | −40% | −70 to −77% |
| ≈2 BW | −58% | −80 to −85% |

All percentages [DERIVED].

- Compression helps more near extension, consistent with the AP findings of Shoemaker & Markolf 1985 [ABS].
- Small loads (150–300 N, ≈0.2–0.4 BW) barely move the ±3 N·m limits (<2°; Blankevoort [FT]).
- Markolf 1981 (925 N) also found reduced rotatory laxity (magnitude not accessed).
- In vivo, weight bearing raises knee torsional stiffness (Mote & Lee 1982; Johnson & Hull 1988 [ABS]), but no accessible in vivo magnitudes exist. The VKLD WB values are figure-only.

**Torque range matters.**
- In AP, congruency helps at low force and is "overcome" at high force (Shoemaker & Markolf 1985 [ABS]).
- In torsion, ACL strain WB vs NWB converges for internal torques above 3 N·m (Fleming 2001 [ABS]).
- Torsional laxity increases after ligament section were not reduced by load (Shoemaker & Markolf 1985 [ABS]).

So compression mainly stiffens the toe/low-torque region and **shifts the steep part of the curve inward by a few degrees**. It does not multiply the end-range stiffness [DERIVED interpretation].

**Neutral shift.** Compression also moves the zero-torque angle:
- 300 N drives the tibia into IR within the envelope in flexion (Blankevoort Fig. 10 [FIG]).
- 1600 N gives +3.8° IR at 0° and about 4.9° ER at 30° (Liu-Barba [ABS]).
- In vivo, 40% BW gives 1–3° of sex-dependent coupled rotation (Shultz 2009).

The direction depends on slope geometry and flexion angle.

### 3. Muscles

- Voluntary co-contraction raises torsional stiffness more than 4× (foot-level 0.16 → 2.54 N·m/°; Louie & Mote [ABS]). It reduces rotation under an 80 N forefoot impulse, more in men (Wojtys 2003 [ABS]).
- The analogous AP/VV data show 2–4× stiffness and laxity cut to 25–50% (Markolf 1978 [ABS]).
- In a dynamic cadaver landing with simulated muscle tension plus compression, a 25 N·m torque gave only about 11–18° of rotation (Oh 2012 [FT]).
- Peak voluntary axial torque is 30–71 N·m (Shoemaker 1988).
- **Speed:**
  - Electromechanical delay is about 44 ms (hamstrings) and 23 ms (quadriceps).
  - Hamstring force at 25–50 ms after activation is only 0–17% of the quadriceps' (Hannah 2014 [ABS]).
  - Reflex responses to rotational perturbation are long-latency (Shultz 2001; latency values not accessed).
  - Unplanned muscular stiffening therefore probably takes about 100 ms or more to become substantial [DERIVED]. Only pre-activated (anticipatory) co-contraction gives stiffness at impact.
  - Oh 2012 makes the same point: "the neuromuscular delay needed to volitionally develop a higher level of transknee forces" [FT].

### 4. End-range and injury: is there a physiological wall?

**Below about 15 N·m, no.** The curve stiffens exponentially (about 2–5 N·m/° at 10–15 N·m in vivo) but keeps yielding. Wang & Walker loaded cadaver knees to 25 N·m [SEC]. At 5 N·m of IR plus 10 N·m valgus, the ACL carries only about 30–35 N (AM bundle) and 14–21 N (PL bundle) (Gabriel 2004 [ABS], 10.1016/S0736-0266(03)00133-5). Articular contact supplies 50–85% of IR restraint (Blankevoort & Huiskes 1996 [ABS], lit2).

**Damage thresholds:**

| Threshold | Value | Source |
|---|---|---|
| ACL rupture, isolated internal torsion, 30° | 33 ± 13 N·m at 58 ± 19° IR | Meyer & Haut 2008 [ABS] |
| Ligament failure in ER (no menisci) | ≈ max voluntary torque, 30–71 N·m | Shoemaker 1982/1988 [ABS] |
| Tibial spiral fracture | 131 ± 53 N·m at 8.3 ± 1.5° bone twist | Edwards & Troy 2012 [ABS], 10.1177/0954411912452996 |
| ACL fatigue failure | Repeated pivot landings with internal torque at 3–4 BW: 21 ± 18 cycles (4 BW), 52 ± 10 (3 BW) | Lipps 2013 [ABS], 10.1177/0363546513477836 |

The large failure angle in the Meyer & Haut cadavers (58°) partly reflects elderly specimens, the cadaver neutral zone and repeated sub-failure loading. It should not be read as in vivo end range.

A hard end-stop should represent the **failure / injury band (≥25–35 N·m)**. It should not represent the clinical "end-feel" (about 8–15 N·m), which the exponential passive law already reproduces.

### 5. Rate and viscoelastic effects

**What I found:**
- Hysteresis is present in vivo and grows with rotation speed (Neumann 2015b [FT, qualitative]).
- At foot level, play is about ⅓ of the range (Branch [FT]).
- Women show higher energy loss (Park 2008 [ABS]).
- Frequency-response tests (1–20 Hz, ±2–6°) fit a damped linear 4-DOF oscillator. Stiffness, damping and inertia varied by more than 30% with weight bearing, muscle bias and amplitude, and knee stiffness was largest at the largest amplitude (Mote & Lee 1982 [ABS]).
- Transient pulses (0–100 N·m, 50–600 ms) are better fitted by **nonlinear asymmetric** stiffness than by linear stiffness (Johnson & Hull 1988 [ABS]).
- Exercise conditioning raises laxity by 14%, recovering over about 52 min (Stoller 1983 [ABS]).

**What I did not find:** accessible numeric damping coefficients or rate-dependent stiffness for the tibiofemoral axial DOF. Mote & Lee and Johnson & Hull would supply them but were not accessible.

### 6. Synthesis: a passive law for simulation

**Recommended form.** Measure rotation θ from a flexion-dependent neutral θ₀(φ), where φ is flexion. Per direction d ∈ {IR, ER}:

```
x_d   = max(|θ − θ0| − θnz_d, 0)                              # beyond a small dead/neutral zone
T_d   = A_d · (exp(B · x_d) − 1)  + k_nz · (θ − θ0)            # exponential toe→stiff, plus tiny NZ slope
k_d   = dT/dθ = B · (T_d + A_d)                                # stiffness grows linearly with torque
damping: viscous c·ω (hysteresis observed, rate-dependent; magnitude unmeasured)
```

**Mid-flexion (30–90°) values** [DERIVED: fitted to Moewis ±2.5 N·m, checked against Neumann CT, Hemmerich, Shultz VKLD and Blankevoort RSA]:

- B = 0.20 /° (11.5 /rad); plausible range 0.15–0.25 /°.
- θnz ≈ 0–3° per side; k_nz ≈ 0.05–0.1 N·m/°.
- A_IR ≈ 2.0 N·m (range 1.5–3); A_ER ≈ 0.5 N·m (range 0.4–1.0).

Predicted per-side rotation from neutral (θnz = 0):

| Torque | IR (B=0.2, A=2.0) | ER (B=0.2, A=0.52) | Data for comparison |
|---|---|---|---|
| 2.5 N·m | 4.0° | 8.8° | Moewis: IR 3.7–4.0, ER 7.6–10.0 [FT] |
| 5 N·m | 6.2° | 11.8° | Hemmerich 30°: IR 8.9, ER 14.3; Shultz M 20°: IR 8.9, ER 12.4; Neumann CT: IR 5–8, ER 16–20 |
| 10 N·m | 8.9° | 15.0° | Neumann CT: IR 7–15, ER 22–23; Shoemaker tibial total ≈41–48 at ±10 |
| 15 N·m | 10.6° | 17.0° | Neumann CT: IR 9–15, ER 24–25 |
| 30 N·m | 13.8° | 20.4° | (beyond in vivo data; ACL failure band) |

Stiffness from k = B(T+A):
- IR: 0.4 (T=0), 1.4 (5), 2.4 (10), 3.4 (15), 6.4 (30) N·m/°.
- ER: 0.1, 1.1, 2.1, 3.1, 6.1 N·m/°.

The ER fit runs about 3–8° below the Neumann CT values at 5–15 N·m. If that matters, use B ≈ 0.15 and A_ER ≈ 0.9, which gives ER 12.5 / 16.6 / 19.1° at 5 / 10 / 15 N·m.

**Flexion scaling:**
- At 0°, multiply all angles by about 0.6–0.7 (equivalently B × 1.4–1.6), and make IR ≥ ER.
- Interpolate to the full value by about 30°.
- Keep the plateau to about 120°.
- Beyond 125–130°, optionally reduce angles by up to about 20–30% [FIG; low confidence].
- Shift θ₀ internally with flexion (≈5° by 10°, ≈10° by 60°, ≈20° by 90–120°, ≈30° at 150° weight-bearing; lit2).

**Weight-bearing / compression** [DERIVED from Hsieh & Walker + Blankevoort; low–moderate confidence]:
- Scale A_d by (1 + c·F_c/BW) with c ≈ 1–1.5, leaving B unchanged.
- This reduces rotation at ±5 N·m by about 20–40% at 1 BW and about 50–70% at 2 BW. Because the curve is exponential, the steep region moves inward by only ln(1 + c·F_c/BW)/B ≈ 3–5° at 1 BW, consistent with ligaments still governing high torques.
- Add a load-dependent neutral shift of ±(2–5)° (sign flexion- and geometry-dependent). Treat it as a tunable parameter, not a law.
- Physical alternative with similar effect: a contact resistance of about F_c × r_eff with r_eff ≈ 2.5–5 mm, smoothed through zero. At 1 BW this is about 2–4 N·m [DERIVED from Hsieh & Walker single-specimen curves; low confidence].

**Muscle activation:**
- Add an active term T_m = a(t)·k_m,max·(θ − θ_m,eq) with k_m,max ≈ 2–3 N·m/° (Louie & Mote foot-level 2.54; the knee-only value could be higher).
- Saturate it at the actuator capacity (≈30–70 N·m peak; Shoemaker 1988).
- Delay a(t) for unplanned perturbations: EMD ≈ 20–45 ms, plus reflex and force rise, so ≈100–150 ms to substantial stiffness [DERIVED]. Only pre-set co-contraction acts at impact.

**End-stop:**
- Place it where the passive law reaches about 25–35 N·m: per side from neutral ≈ IR 13–16°, ER 20–24° at 30–90° flexion; about 0.65× those at 0°.
- Make it a numerical safety barrier or an injury flag. Physiologically the exponential law already gives 6+ N·m/° there.
- The present model's end-stop slope (≈6.8 N·m/°, lit2) **matches the exponential law's own stiffness at about 30 N·m**. A slope of that order is therefore physiologically consistent, but only at about 13–24° from neutral, not at 30–40°.

---

## (e) Parameter-ready values

### Well established (moderate–high confidence)

| Quantity | Value / range | Conditions | Sources |
|---|---|---|---|
| Curve shape | Slack NZ → exponential toe → steep, saturating end; **no wall below ≈25 N·m** | relaxed, unloaded, bone-level | Markolf 1976; Wang & Walker; Blankevoort 1988 FT/FIG; Neumann 2015a FT; Serbino/Pedersen SUPP |
| Exponential rate constant B | **0.15–0.25 /°** (≈9–14 /rad) | cadaver RSA and in vivo CT | DERIVED (Blankevoort Fig. 4; Neumann CT) |
| Incremental stiffness | <2.5 N·m: 0.1–0.6; 2.5–5 N·m: 0.5–1.2; 5–10 N·m: 1–2.5; 10–15 N·m: 2–5 N·m/° | per side, bone-level | Schmitz/Shultz FT; Serbino SUPP; Blankevoort FIG; Neumann FT (DERIVED) |
| In vivo total at ±5 N·m (male) | 16° (0°); 19–23° (20–30°) | NWB, relaxed | Hemmerich [SEC]; Shultz 2009/2011 [FT] |
| In vivo IR/ER at ±2.5 N·m | IR ≈4°, ER ≈8–10° (30–90°) | bone-level | Moewis [FT] |
| In vivo total at ±6 N·m | 22 ± 6° (60°), 25 ± 7° (90°) | RSA | Almquist 2002 [SEC] |
| In vivo bone-level at 10–15 N·m (30°) | ER ≈22–25°, IR ≈7–15° per side | CT, n=6 | Neumann 2015a [FT] |
| Flexion: 0° vs mid-flexion | 0.55–0.7× | in vivo and cadaver | Hemmerich; Seiferheld SUPP; Boguszewski |
| Plateau extent | ≈30° to ≥120° | cadaver, 5 N·m | Seiferheld SUPP (n≈65–82 at 120°) |
| Hysteresis | Present, speed-dependent; foot-level play ≈⅓ of range | in vivo | Moewis, Neumann b, Branch [FT] |
| Small compression (≤0.4 BW) | <2° change to ±3 N·m limits | cadaver | Blankevoort [FT] |
| Compression ≈1–2 BW | Laxity at ±5 N·m −20 to −55% (1 BW), −60 to −85% (2 BW) | cadaver, n=1–4 | Hsieh & Walker [SEC SUPP] |
| Co-contraction | Stiffness ×4 or more (0.16 → 2.54 N·m/° foot-level) | in vivo | Louie & Mote [ABS] |
| Peak voluntary axial torque | 30–71 N·m | adult males | Shoemaker 1988 [ABS] |
| Injury thresholds | ACL 33 ± 13 N·m (IR, cadaver); ER ligament failure ≈30–70 N·m; tibia 131 ± 53 N·m | — | Meyer & Haut; Shoemaker; Edwards & Troy [ABS] |

### Uncertain

- **In vivo bone-level curves above 6 N·m** rest on one CT study (n=6, a few subjects per torque level, ±1° readings) plus foot-level devices with large error. The ER/IR asymmetry at 10–15 N·m and the exact B are uncertain (±0.05 /°).
- **Neutral-zone width in vivo** (estimated ±2–5°) is not directly measured at bone level. Cadaver NZs (10–25°) overstate it.
- **Weight-bearing in vivo:**
  - No accessible in vivo magnitudes; VKLD 40% BW data are figure-only.
  - The cadaver compression data come mainly from Hsieh & Walker, n=1–4, digitised by third parties.
  - S2 labelled these values "EXT", but they are probably total laxity (they match Blankevoort Fig. 16).
  - Markolf 1981 magnitudes were not accessed.
  - Whether compression changes end-range stiffness, or only the toe region, is inferred from AP analogues and ACL-strain data.
- **Neutral shift under compression:** magnitude and sign depend on flexion and tibial slope (±4–5° at 1600 N; IR within the envelope at 300 N in flexion).
- **Active stiffness at knee level:** Louie & Mote measured at foot level, with flexion unknown. Wojtys absolute values were not accessed. Knee-only active stiffness may exceed 2.5 N·m/°.
- **Muscle timing for axial loads:** the rotational-perturbation reflex latencies (Shultz 2001) were not accessed. The ≈100–150 ms to substantial stiffness is derived.
- **Rate dependence:** no numeric damping or rate-stiffness values were accessed for the axial DOF (Mote & Lee 1982 and Johnson & Hull 1988 hold them).
- **Deep flexion (>120°):** the possible 20–40% decline beyond about 125–130° rests on 5 cadaver specimens from 1980s studies (FIG).
- **Sex and athlete adjustment:** males are about 20–30% stiffer or less lax (Shultz 2011: IER stiffness 0.43 vs 0.32 N·m/°). Laxity falls with body mass (Mouton: −0.6° foot-level per kg). Elite footballers likely sit at the stiff end (lit2, Muaidi 2009).

---

## Verification against lit2

| lit2 claim | Status here |
|---|---|
| Relaxed bone-level stiffness ≈0.25–1 N·m/° | Confirmed below about 5 N·m (Schmitz FT: IR 0.26–1.01, ER 0.26–0.58; Markolf 1984 0.56–0.57 [SEC]). **Too low above about 5 N·m**: 1–5 N·m/° (Blankevoort FIG, Neumann FT). |
| "Gradual stiffening, no wall to 9–15 N·m" | Refined: there is no wall, but the curve is **strongly saturating**. Rotation from 5 to 15 N·m adds only about 4–7° per side. |
| Louie & Mote 0.16–2.54 N·m/° | Confirmed (abstract only; foot-level). |
| Blankevoort: envelope barely changed by 300 N | Confirmed [FT]: <2°. New: axial force drives IR inside the envelope. |
| Weight-bearing magnitude unknown | Now quantified in cadaver (Hsieh & Walker, digitised). In vivo still missing. |
| No torque-defined data beyond 100–120° | Partly filled: pooled 5 N·m at 120° (≈38° total, cadaver); Markolf 1976 at 135°; Nielsen/van Kampen to 140° at ±3 N·m. |
| Tibia ≈ ½ foot (Shoemaker 1982) | Consistent: Neumann quotes foot totals of 82–91°, Blankevoort plots tibial totals of ≈41–48° at ±10 N·m. |

---

## Sources (DOI / URL)

**Core sources read in full this pass:**

- Blankevoort L, Huiskes R, de Lange A. 1988. J Biomech 21:705. 10.1016/0021-9290(88)90280-1. PDF: https://pure.tue.nl/ws/files/2305657/585371.pdf
- Schmitz RJ et al. 2008. AJSM 36:1380. 10.1177/0363546508317411. PMC2562882
- Shultz SJ, Schmitz RJ, Beynnon BD. 2011. J Orthop Res. 10.1002/jor.21243. PMC3176732
- Shultz SJ, Schmitz RJ. 2009. AJSM. 10.1177/0363546509334225. PMC2894638
- Shultz SJ, Beynnon BD, Schmitz RJ. 2009. J Orthop Res. 10.1002/jor.20810. PMC2885972
- Neumann S et al. 2015a. ISRN 705201 (CT validation). PMC4897077
- Neumann S et al. 2015b. ISRN 439095 (Rotameter design). PMC4897369
- Mouton C et al. 2015. KSSTA. 10.1007/s00167-014-3244-6. PMC4661198
- Branch T et al. 2015. KSSTA. 10.1007/s00167-015-3768-4. PMC4577538
- Beckley S et al. 2020. Sports Med Open. 10.1186/s40798-020-00266-7. PMC7399727
- Oh YK et al. 2012. AJSM. 10.1177/0363546511432544. PMC4800974
- Seiferheld BE et al. 2026. Front Bioeng Biotechnol. 10.3389/fbioe.2026.1741003. PMC13038627, including supplementary Table2/Table4 xlsx
- Bohn MB et al. 2016. J Exp Orthop. 10.1186/s40634-016-0062-4 (context only)
- Mizrahi J 2015. J Med Biol Eng. PMC4342527 (secondary on Johnson & Hull)

**Abstracts read:**

- Markolf 1976 (PMID 946969); Markolf 1978 (PMID 681387); Markolf 1981 (PMID 7217123, title only); Markolf 1984 (PMID 6693451); Markolf 1995 (10.1002/jor.1100130618)
- Hsieh & Walker 1976 (PMID 946171)
- Shoemaker & Markolf 1982 (PMID 7056775), 1985 (PMID 3968092), 1986 (PMID 3753605); Shoemaker 1988 (PMID 3342561)
- Stoller 1983 (PMID 6831802); Bargar 1983 (PMID 6825334)
- Louie & Mote 1987 (10.1016/0021-9290(87)90295-8)
- Wojtys 2003 (10.2106/00004623-200305000-00002)
- Fleming 2001 (10.1016/s0021-9290(00)00154-8)
- Uh 2001 (10.1016/S0736-0266(01)00055-9); Torzilli 1994 (10.1177/036354659402200117); Fukubayashi 1982 (PMID 7056781)
- Liu-Barba 2007 (10.1115/1.2800762)
- Meyer & Haut 2008 (10.1016/j.jbiomech.2008.09.023); Meyer 2008 AJSM (10.1177/0363546508318046)
- Lipps 2013 (10.1177/0363546513477836); Beaulieu 2015 (10.1177/0363546515589164)
- Gabriel 2004 (10.1016/S0736-0266(03)00133-5)
- Boguszewski 2015 (10.1177/0363546515608478)
- Lorbach 2009 (10.1007/s00167-009-0772-6; 10.1007/s00167-009-0756-6); Mouton 2012 (10.1007/s00167-011-1877-2)
- Mote & Lee 1982 (10.1016/0021-9290(82)90254-8); Johnson & Hull 1988 (10.1016/0021-9290(88)90146-7); Dorius & Hull 1984 (10.1016/0021-9290(84)90074-5)
- MacWilliams 1999 (10.1002/jor.1100170605)
- Hannah 2014 (10.1249/MSS.0000000000000188)
- Shultz 2001 J Athl Train 36:37 (PMID 12937513); Shultz 2007 Part I/II (10.1002/jor.20397; 10.1002/jor.20398)
- Schmitz 2010 (10.1016/j.clinbiomech.2009.09.004)
- Park 2008 (10.1002/jor.20576)
- Edwards & Troy 2012 (10.1177/0954411912452996)
- Matsumoto 2000 (10.1097/00003086-200002000-00022)
- Wang & Walker 1974 (PMID 4812160; no abstract; data via Blankevoort)

**Cited from lit2:** Moewis 2016, Almquist 2002/2011/2013, Hemmerich 2011, Zee 2020, Tsai 2008, Hsu 2006, Hame 2002, Blankevoort & Huiskes 1996, Muaidi 2009.

## Access notes

- Blocked: JBJS/LWW (402), Wiley (403), ScienceDirect, PMC HTML (captcha after a few requests), Semantic Scholar API (429).
- NCBI efetch (db=pmc) returned full text for author manuscripts.
- The Europe PMC supplementaryFiles endpoint returned the Seiferheld data.
- Figure values from Blankevoort 1988 were read visually from 2150×3040 px page scans, about ±1°.
- Hsieh & Walker loaded data are third-party digitisations (Seiferheld S2).
- Search snippets ([SNIP]) were not used for any parameter value.

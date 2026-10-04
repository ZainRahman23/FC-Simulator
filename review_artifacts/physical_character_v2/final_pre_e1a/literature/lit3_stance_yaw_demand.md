# Single-support yaw: demand side (free moment, ankle axial moment), rotation of tibia/body over the planted foot, and ground side (foot/boot–surface rotational traction)

Literature review, lit3. Prepared 2026-10-04 for the Touchline / FC Simulator Physical Character V2 work (passive foot-vs-shank axial coordinate).

## How to read the provenance tags

- **[FT]**: I read the primary paper in full text (open access via Europe PMC/PMC XML, or a publisher/author PDF).
- **[FT-auto]**: I read the full text only through an automated page summary (WebFetch). Numbers were quoted, but I could not check them against tables myself.
- **[ABS]**: I read the abstract only. Only numbers that appear in the abstract are given.
- **[SEC: X]**: the value comes from a secondary source X that I read in full text, where X tabulates or quotes the primary study. I did not read the primary study.
- **[DERIVED]**: my own arithmetic on published numbers (unit conversion, secant ratio, simple contact model). It is not a published value.
- **[RECALLED — unverified]**: from memory. I avoided these. Where one appears, do not rely on it.
- **Reference body for conversions [DERIVED]:** 75 kg, 1.80 m, so BW·ht = 1324 N·m and 1×10⁻³ BW·ht = 1.32 N·m.

**Three different "yaw torques".** The literature mixes these up, and the model needs to keep them apart:
1. **Free moment (FM, Tz, VFM).** The ground-reaction torque about the vertical axis through the centre of pressure (COP). It is the friction couple between sole and ground.
2. **Ankle axial (transverse-plane) joint moment.** The torque about the shank's long axis that must pass through the ankle. It equals the FM **plus the moment of the horizontal GRF about the shank axis** (the COP lies off that axis). **This is the load the model's passive foot-vs-shank axial coordinate actually carries.** It is generally several times the FM.
3. **External yaw moment about the whole-body COM.** It equals the FM plus (r_COP−COM × F_horizontal)_z. In walking and turning, the second term dominates.

---

## Table (a): Free moment (and ankle axial moment) by task

| Source | Task | n | Peak / typical value | Normalisation | Read | Confidence |
|---|---|---|---|---|---|---|
| Almosnino, Kajaks & Costigan 2009, *SMARTT* 1:19, doi:10.1186/1758-2555-1-19 (Table 2) | Walking, 1.10 m/s, normal foot angle, arms held at 90° elbow flexion | 11 | Peak FM **3.4 ± 1.4 N·m**; 2.8 ± 0.8 ×10⁻³ BW·ht. Toe-out 30° gives 8.8 ± 6.4 N·m (6.7 ± 4.1 ×10⁻³); some subjects reach running-level values. Pattern is biphasic: early stance resists inward rotation, late stance resists outward rotation. Peak occurs at ~70% of stance. | N·m and BW·ht | FT | High |
| Li et al. 2001, *J Exp Biol* 204:47, doi:10.1242/jeb.204.1.47 | Walking (slow/normal/fast), with and without arm swing | 17 | Peak ~2.5–10 ×10⁻³ (normalised by BW, adults; read off a graph by Almosnino). FM is "strongly affected by arm fixation in males". | BW | SEC: Almosnino 2009 Table 1 (values); ABS (arm-swing statement) | Medium |
| Umberger 2008, *J Biomech* 41:2575 | Walking 1.3 m/s, with and without arm swing | 8 | Peak ~0.5–1.5 ×10⁻² (graph-estimated) | BW × leg length | SEC: Almosnino 2009 Table 1 | Medium-low |
| Negishi & Ogihara 2023b, *Sci Rep* 13:8000, doi:10.1038/s41598-023-34910-5 | Walking 1.1 m/s, with and without arm swing | adult males | VFM "much smaller" than the transverse-plane external moments from r×GRF. VFM was significantly larger in late stance without arm swing. (Normalised curves only; no N·m values in text.) | BW·COM height | FT | High (qualitative) |
| Nigg et al. 1982 (conf. proc.) | Walking / running, ACL-deficient patients | 16 | Walking 11.5–12.9 N·m; running 15.9–17.5 N·m | none | SEC: Almosnino 2009 Table 1 | Low |
| Nigg 1986 (book chapter) | Running 3.5 m/s, several shoes | 1 | 5–7 N·m (graph-estimated) | none | SEC: Almosnino 2009 Table 1 | Low |
| Holden & Cavanagh 1991, *J Biomech* 24:887, doi:10.1016/0021-9290(91)90167-L | Running 4.5 m/s, rear-foot strikers, 3 shoes designed to vary pronation | 10 | Peak 6.7 (varus shoe), 9.7 (neutral), 12.4 (valgus) ×10⁻³ BW·ht, each ± 1.6 (SEM). [DERIVED] ≈ 8.9 / 12.8 / 16.4 N·m for the reference body. FM is largest in the first half of support, resisting foot abduction; opposite sign and smaller in the last 30%. Peak and impulse rise with pronation. | BW·ht | Values SEC: Almosnino Table 1; pattern ABS | Medium-high |
| Milner, Davis & Hamill 2006, *J Biomech* 39:2819, doi:10.1016/j.jbiomech.2005.09.022 | Running 3.7 m/s, female runners: tibial-stress-fracture (TSF) history vs controls | 25 + 25 | Absolute peak FM: controls 5.9 ± 2.1, TSF 9.3 ± 4.3 ×10⁻³ BW·ht ([DERIVED] ≈ 7.8 / 12.3 N·m reference). Peak adduction FM 4.7 ± 2.5 vs 7.7 ± 4.7 ×10⁻³ (Milner et al. MSSE 2006 data). Net angular impulse 1.6 ± 5.5 vs 4.5 ± 9.9 ×10⁻⁴ s ([DERIVED] ≈ 0.2 / 0.6 N·m·s). | BW·ht | Values SEC: Almosnino 2009 Table 1 and Milner et al. 2023 *JSHS* meta-analysis Table 3 (doi:10.1016/j.jshs.2022.12.002) [FT]; design ABS | High |
| Creaby & Dixon 2008, *MSSE* 40:1669 | Running 3.6 m/s, military recruits | 20 + 10 | Absolute peak 9.3 ± 3.2 (controls), 9.5 ± 2.1 ×10⁻³ BW·ht (TSF) | BW·ht | SEC: Almosnino; Milner 2023 | Medium-high |
| Pohl et al. (in Milner 2023 meta-analysis) | Running, TSF vs controls | — | Absolute peak 6.1 ± 2.5 (controls), 9.1 ± 4.2 ×10⁻³ (TSF) | BW·ht | SEC: Milner 2023 | Medium |
| Mahoney et al. 2025, *PLoS ONE* 20:e0332616, doi:10.1371/journal.pone.0332616 (Table 2) | Running at preferred speed, free arms vs pushing a stroller | ~38 | \|FM\|max: control **6.78 ×10⁻³**, stroller 10.4 ×10⁻³ BW·St (+36%). FM impulse 3.5 → 9.8 ×10⁻⁴ BW·St·s. [DERIVED] ≈ 9.0 → 13.8 N·m; impulse 0.47 → 1.3 N·m·s. | BW·stature | FT | High |
| Arefin et al. 2024, *PLoS ONE* 19:e0297592, doi:10.1371/journal.pone.0297592 (Table 2) | 45° sidestep cut at self-selected speed: barefoot / two shoes | 17 (64.7 kg, 1.73 m) | "Twisting moment" (= FM) first peak 9.2 ± 8.1 (barefoot), 10.2 ± 8.0, 9.5 ± 7.0 ×10⁻³ BW·BH; second peak ~7.1–7.9 ×10⁻³. [DERIVED] for their subjects ≈ **10–11 ± 8–9 N·m**. Ankle int/ext-rotation joint moment peaks **0.08–0.12 N·m/kg** (Table 3). | BW·BH ×10⁻³ (the table label "% BW×BH×10⁻³" is ambiguous; I read it as ×10⁻³ BW·BH) | FT | Medium (unit label) |
| Cong & Lam 2021, *J Sports Sci* 39:1386, doi:10.1080/02640414.2021.1874716 | Sidestep cuts at 45°, 90°, 135°, maximal effort, basketball players | 15 | Peak FM was **not** affected by cutting angle (values not in abstract) | — | ABS | Medium |
| David & Potthast 2021, *J Sports Sci* 39:2812, doi:10.1080/02640414.2021.1964748 | 90° sidestep | 52 | FM can be positive or negative within the same task depending on foot placement and strategy. FM "controls body rotation" and predicts knee loading. No values in abstract. | — | ABS | Medium |
| Ogasawara et al. 2022, *J Sports Sci* 40:2072, doi:10.1080/02640414.2022.2133392 | 45° cut, forefoot vs rear-foot strike | 23 | The FM-driven tibial **external** rotation moment counteracts the GRF-driven internal rotation moment in the first 10% of stance | — | ABS | Medium |
| Wannop, Worobets & Stefanyshyn 2010, *AJSM* 38:1221, doi:10.1177/0363546509359065 | Running V-cut, high- vs low-traction shoe | 13 | Peak **ankle external-rotation moment 89.6 vs 80.2 N·m**; knee external rotation 36.2 vs 32.0 N·m. (These are much larger than other ankle axial-moment reports; the frame or definition is unclear from the abstract.) | N·m | ABS | Low-medium (definition) |
| Jiang et al. 2023, *Bioengineering* 10:876, doi:10.3390/bioengineering10070876 (Table 3) | Running at preferred speed, novice vs experienced, shod | 30 | Peak **ankle internal-rotation moment 0.09–0.16 N·m/kg** ([DERIVED] ≈ 7–12 N·m at 75 kg) | N·m/kg | FT | Medium-high |
| Gao et al. 2024, *J Foot Ankle Res* 17:e12027, doi:10.1002/jfa2.12027 | Walking, value at peak dorsiflexion | — | Ankle external-rotation moment 0.07 ± 0.04 (units printed as "Nm/kg·m") | ambiguous | FT | Low-medium |
| Klute & Mulcahy 2024, *Front Rehabil Sci* 5:1354144, doi:10.3389/fresc.2024.1354144 (Table 2) | Transtibial amputees: straight walking and 2 m circle; transverse moment at the prosthesis | 11 | Peak transverse-plane (socket/shank-axis) moment **0.29–0.36 N·m/kg**. Device spec: "<29 N·m" covers straight and circle walking for a ~100 kg adult. | N·m/kg | FT | Medium (prosthetic limb, not intact) |
| Flick et al. 2005, *Prosthet Orthot Int* 29:73, doi:10.1080/03093640500088120 | Able-bodied walking straight and around a 1 m radius circle | 3 | Average peak transverse torque **11.4 N·m** (straight), **11.8 N·m** (inside leg), **8.2 N·m** (outside leg), with "range of motion" 20°, 20°, 26° | N·m | ABS | Low-medium (n = 3; definitions unclear) |
| Dixon et al. 2014, *J Biomech* 47:3726, doi:10.1016/j.jbiomech.2014.09.011 | 90° step vs spin turns, children | 54 | "Spin turns showed large Tz" (no values in abstract) | — | ABS | Medium (qualitative) |
| Inoue & Nunome 2025, *J Appl Biomech* 41:313, doi:10.1123/jab.2024-0189 | Soccer instep kick toward 15°/45°/75°, **support leg** | 9 | Support **foot segment rotates about the vertical axis relative to the force plate**. That rotation is driven mainly by the GRF interaction torque; "no remarkable action of the free moment". | — | ABS | Medium |
| Carrier & Cunningham 2017, *Biol Open* 6:269, doi:10.1242/bio.022640 | **Maximal voluntary FM** resisting trunk twist, barefoot on 120-grit sandpaper | 14 men (78.5 kg) | **One foot, heel down (plantigrade): median 53.1 N·m** (IQR 51.0–61.1). **One foot on ball of foot (digitigrade): 18.4 N·m** (17.1–22.8). Two feet: 113.7 and 71.6 N·m. Trials ended when the feet slid or strength was exceeded. | N·m | FT | High |
| Seki et al. 2018, *Proc IMechE H* 232:637, doi:10.1177/0954411918777267 | Cadaver lower legs, 450 N axial load, foot not allowed to slide | 8 | Passive foot generates **−1.66 N·m** FM (internal-rotation direction) from tarsal coupling alone | N·m | ABS | Medium |
| Single-leg quiet stance; slow foot lifting | — | — | **No primary free-moment data found.** The bipedal quiet-standing FM studies (Dalleau 2007 *Eur Spine J*; Dalleau 2012 and Stylianides 2013 *PLoS ONE*) use one plate under both feet and report inconsistent units (Nm/kg vs Ncm/kg). I judged them unusable. | — | FT (2012/2013); 2007 ABS | — |

## Table (b): Rotational traction (ground side)

| Source | Boot / surface | Vertical load | Peak torque | Rotation at peak / stiffness | Read | Confidence |
|---|---|---|---|---|---|---|
| Thomson et al. 2019, *PLoS ONE* 14:e0216364, doi:10.1371/journal.pone.0216364 (Table 2) | 6 Nike soccer boots (AG, 4× FG, SG) on an elite **natural grass** pitch (Qatar), 5 dates, warm- vs cool-season grass. S2T2 tester, forefoot, 20° plantarflexion. | **580 N** | Shoe-date means **28.1–59.1 N·m**. Shoe means: AG 35.7, FG 40.9–46.2, SG 52.2. Grand means by date: 36.3 (cool-season rye) to 49.5 N·m (warm-season paspalum). | 90° rotation at ~90°/s. No stiffness reported. | FT | High |
| Serensits & McNitt 2014, *Appl Turfgrass Sci*, doi:10.2134/ATS-2013-0073-RS (Tables 2–6) | 8 American-football cleats on Kentucky bluegrass and 3 infilled synthetic turfs. Pennfoot, forefoot stance. | **787 / 1054 / 1321 N** | Combinations **37.9–62.7 N·m**. By load: 47.5 / 51.6 / 55.9 N·m. Natural grass mean 52.3; synthetic 49.3–53.1 N·m. | Peak within 45° rotation; stiffness not reported | FT | High |
| McGowan et al. 2023, *Sci Rep* 13:21631, doi:10.1038/s41598-023-48134-0 | FIFA-type 150 mm studded test disc (6 × 13 mm studs) on 10 **artificial turf** systems | **450 N** | ~20.6–25.3 N·m (non-filled); ~39–63 N·m (cork/pine/rubber-infilled). Peak rises 10–37% from 10°/s to ~72–90°/s, then plateaus. FIFA Quality Pro limit 30–45 N·m; FIFA Quality 25–50 N·m. | "Peak torque commonly occurs between **30° and 40°** of rotation" (citing refs 8, 9). [DERIVED] secant ≈ 0.75–1.5 N·m/°. | FT | High (device ≠ boot) |
| Kati 2012 (PhD thesis, Loughborough, hdl:2134/12361) | Human stop-and-turn on artificial turf | — | — | Foot rotates **18.1 ± 12.3°** on the surface | SEC: McGowan 2023 | Low-medium |
| Kent et al. 2015a, *Sports Biomech* 14:1, doi:10.1080/14763141.2015.1024277 | American-football cleat; 2 natural grass and 6 infill artificial NFL surfaces; elite-athlete load and rate device | high (2.8 kN quoted for translation tests) | Rotation tests: **145 N·m grass vs 197 N·m artificial**. Grass allowed more angular displacement. | Grass "tears" and limits load; turf allows less motion | ABS | Medium-high |
| Kent et al. 2015b, *Sports Biomech* 14:246, doi:10.1080/14763141.2015.1052749 | 19 cleats | as above | Natural grass **120–174 N·m** (the turf shears and leaves a divot). Artificial: all but one cleat held fast up to the device limit (~200 N·m). | release mode described | ABS | Medium-high |
| Kent et al. 2021, *J Biomech* 127:110670, doi:10.1016/j.jbiomech.2021.110670 | NFL natural turfgrass, forefoot external rotation, full power | — | Bermudagrass **144.8 ± 12.0 N·m**; Kentucky bluegrass **126.3 ± 6.1 N·m**; all < 173 N·m. Load–displacement corridors published (values not in abstract). | corridors not accessed | ABS | Medium-high |
| Villwock et al. 2009a, *AJSM* 37:518, doi:10.1177/0363546508328108 | 10 football shoes; FieldTurf, AstroPlay, 2 natural grasses; on-site tests, compliant surrogate ankle | **1000 N**, whole sole, rear-weighted, 90° rotation (method per Serensits 2014) | **Artificial > natural** for both peak torque and rotational stiffness. Turf-style cleat lowest. Shoe upper material affects stiffness. (Values not accessible.) | stiffness reported but not accessed | ABS; method SEC: Serensits 2014 | Medium (no numbers) |
| Livesay et al. 2006, *AJSM* 34:415, doi:10.1177/0363546505284182 | Grass and turf shoes on grass, Astroturf, AstroPlay ×2, FieldTurf | **333 N** | Highest: grass shoe on FieldTurf and turf shoe on Astroturf. Lowest on grass. (Values not in abstract.) | Turf shoe on Astroturf ≈ **2×** the rotational stiffness of all others | ABS | Medium (no numbers) |
| Smeets et al. 2012, *BJSM* 46:1078, doi:10.1136/bjsports-2012-090938 | Studs vs blades; football turf vs natural grass | varied | Sand/rubber-infilled turf > natural grass > non-infilled turf. Torque **increases linearly with vertical load**, increases after an impact, and is higher in external rotation with blades. | — | ABS | Medium |
| Wannop et al. 2013 (*AJSM*; via Thomson 2019) | American football, in-season shoe traction vs injury | 580 N | High-traction group 39–54.9 N·m: 19.2 non-contact LE injuries per 1000 game exposures. Low group 15–30.9 N·m: 4.2. | — | SEC: Thomson 2019 | Medium |
| Lambson et al. 1996 (*AJSM*; via Thomson 2019) | Edge vs other cleats | — | 31 vs 24 N·m; 3.4× ACL injuries with edge cleats | — | SEC: Thomson 2019 | Medium |
| Wannop et al. 2010, *AJSM* 38:1221 | Tread vs smooth court/running shoe on a track surface sample; robotic tester | not in abstract | **23.9 vs 16.1 N·m** | — | ABS | Medium |
| Carrier & Cunningham 2017 (above) | **Barefoot** on sandpaper (a human "max FM" test) | body weight, ~770 N | 53.1 N·m heel down; 18.4 N·m forefoot only. Sock on Teflon cut μ about 6-fold; subjects pushing laterally **spun a median 270°**. | — | FT | High |
| Lam et al. 2017, *PeerJ* 5:e4086, doi:10.7717/peerj.4086 | Basketball-shoe forefoot rotational stiffness (shoe only, machine test) | 250 N compression | — | **~9.2–10.4 N·m/rad** (≈ 0.16–0.18 N·m/°): a compliance in series with the foot | FT | Medium |
| *Anatomical comparators (not ground):* Wei et al. 2010, *J Biomech Eng* 132:091001; Wei et al. 2012, *J Biomech Eng* 134:041002; Meyer & Haut 2008, *J Biomech* 41:3377; Hirsch & Lewis 1965 (via Serensits 2014) | Cadaver foot external rotation to failure; foot in football shoes rotated 30°; knee internal torsion to ACL failure | axial preload | Ankle failure **69.5 ± 11.7 N·m at 40.7 ± 7.3°**. At 30° foot rotation in shoes: **35.4–46.2 N·m**. ACL failure at **33 ± 13 N·m** internal tibial torque at 58 ± 19°. Ankle "max ≈ 75 N·m under 1000 N". | [DERIVED] secant ≈ 1.7 N·m/° (to failure); ≈ 1.2–1.5 N·m/° at 30° in shoes | ABS (Hirsch: SEC) | Medium |

## Table (c): Rotation of the tibia relative to the foot (and body over the foot)

| Source | Method | Task | Degrees | Read | Confidence |
|---|---|---|---|---|---|
| Stacoff et al. 2000, *J Biomech* 33:1387, doi:10.1016/S0021-9290(00)00116-0 (Table 2, Fig. 1) | Intracortical bone pins, tibia and calcaneus; joint coordinate system (JCS) | Heel-toe running 2.5–3.0 m/s, barefoot and 6 shoe conditions | **Total internal tibial rotation relative to the calcaneus, touchdown → midstance:** barefoot 5.11 ± 1.37°, shod 4.81 ± 0.85°; range across subjects/conditions ~1.3–6.5°. Max internal tibial rotation velocity 63–86°/s. Coupling (tibial rotation ÷ eversion) 0.4–1.0, subject-specific. From Fig. 1, external rotation from midstance to toe-off brings the full-stance excursion to roughly ~10° in several subjects (read off the figure; approximate). Shoe vs barefoot effect < 2–3°. | FT | High (n = 5) |
| Reinschmidt et al. 1997, *Clin Biomech* 12:8, doi:10.1016/S0268-0033(96)00046-0 | Bone pins vs skin/shoe markers | Running | External markers overestimate skeletal motion (eversion 16.0° vs 8.6° skeletal). Abduction/adduction values not in abstract. | ABS | High (qualitative) |
| Behling et al. 2025, *Heliyon* 11:e41301, doi:10.1016/j.heliyon.2024.e41301 (Table 2) | Biplanar videoradiography (calcaneus and talus relative to tibia, helical axes) | Walking 1.4 m/s, running 3.0 m/s, hopping | Calcaneus vs tibia, transverse component per phase. Walking: 2.9 ± 3.4° (dorsiflexion phase), 4.3 ± 3.8° (plantarflexion phase). **Running: −4.4 ± 2.6° and +8.3 ± 3.2°** ([DERIVED] ≈ 13° total if the phases add sequentially). Hopping: −4.8 ± 4.8° and 5.8 ± 5.3°. Large between-subject variability. The talocrural joint itself contributes transverse motion. | FT | High (n = 9) |
| Arndt et al. 2007, *J Biomech* 40:2672, doi:10.1016/j.jbiomech.2006.12.009 | Bone pins in 9 bones | Slow running | Talonavicular transverse **8.7 ± 1.4°** (midfoot adds axial rotation beyond tibiocalcaneal); talocrural frontal 12.2 ± 7.1°; subtalar 8.9 ± 3.2° | ABS | High (n = 4) |
| Lundgren et al. 2008, *Gait Posture* 28:93; Nester et al. 2007, *J Biomech* 40:3412 | Bone pins | Walking | Motion at all joints; talonavicular > talocalcaneal (no values in abstracts) | ABS | — |
| Jiang et al. 2023 (above, Table 2) | Skin markers, shod | Running | Ankle int/ext rotation ROM **13.8–14.9°** (likely overestimated vs bone); hip int/ext rotation ROM 10.5–12.7° | FT | Medium |
| Flick et al. 2005 (above) | Motion capture (abstract does not define the segments) | Walking straight and turning | "Range of motion" 20° (straight), 20° (inside leg), 26° (outside leg) | ABS | Low |
| Negishi & Ogihara 2023a, *Sci Rep* 13:6894, doi:10.1038/s41598-023-34153-4 | Point-contact shoes that remove the FM | Walking 1.1 m/s, arms folded vs free | With FM removed and arms restrained: thorax rotation max **11.1 ± 5.5° vs 1.5 ± 3.5°**, pelvis max 7.6 ± 3.9° vs 3.2 ± 2.3°, and thorax and pelvis turn **in phase**. With arm swing allowed, FM removal had little effect. Lz peak was smaller without FM (0.017 vs 0.024, normalised). | FT | High |
| Qiao, Brown & Jindrich 2014, *J Exp Biol* 217:432, doi:10.1242/jeb.087569 | GRF and kinematics, rotational inertia increased up to 4× | 45° sidestep cuts while running | "Rotation due to free moments … [was] small during normal running turns." COM direction changed only 25–27° in the turning step. A 4× change in inertia produced < 50% change in rotational velocity. | FT-auto / ABS | Medium |
| Jindrich, Besier & Lloyd 2006, *J Biomech* 39:1611, doi:10.1016/j.jbiomech.2005.05.007 | Analysis of GRF | Sidestep and crossover cuts at 3 m/s | Without braking forces, lateral forces would rotate the body **1.4–3×** the change in COM direction. Braking forces prevent over-rotation. | ABS | Medium-high |
| Single-leg quiet stance yaw sway | — | — | **No reliable data found.** Liu et al. 2020 (*Int J Physiother Res* 8:3602) IMU "axial range" values of −25.8 ± 75.3° (leg) and −27.1 ± 81.2° (trunk) have SDs about 3× the means, which looks like heading offset rather than sway. Unusable. | FT | — |

---

## 1. Free moment magnitudes

**Walking.** Peak FM is a few N·m.
- **3.4 ± 1.4 N·m** (2.8 ± 0.8 ×10⁻³ BW·ht) at 1.1 m/s [FT, Almosnino 2009].
- Li 2001 and Umberger 2008 give ranges equivalent to ~2–10 N·m [SEC; graph-estimated].
- The pattern is biphasic. The FM resists inward rotation of the foot in the first half of stance and outward rotation late in stance.
- FM is sensitive to arm swing: it gets larger when arms are restrained [ABS Li 2001; FT Negishi 2023b].
- FM is also sensitive to foot progression angle: toe-out 30° gives 8.8 ± 6.4 N·m, with large between-subject spread [FT Almosnino].

**Running (3.6–4.5 m/s).** Normalised peak FM in healthy runners is ~5.9–9.7 ×10⁻³ BW·ht [SEC/FT; Milner, Creaby, Holden & Cavanagh, Mahoney 6.8 ×10⁻³].
- That is **~8–13 N·m** for a 75 kg / 1.80 m runner [DERIVED].
- High-pronation conditions reach ~12.4 ×10⁻³ (~16 N·m) [SEC].
- People with a TSF history sit at the high end, 9–9.5 ×10⁻³ [SEC].
- Pushing a stroller (arms constrained) raises \|FM\|max by 36% and FM impulse by about 4× [FT Mahoney 2025]. This is direct evidence that arm swing offloads FM in running too.
- **Net FM angular impulse per stance is small**: ~1.6–4.5 ×10⁻⁴ s (BW·ht normalised), i.e. **~0.2–0.6 N·m·s** [DERIVED from SEC values]. That is the same order as the model's 1 N·m·s design impulse.

**Sidestep cutting.** In a 45° sidestep, first-peak FM is ~9–10 ×10⁻³ BW·BH, i.e. **~10–11 N·m mean with SD ~8–9 N·m** for 65 kg subjects [FT Arefin 2024; DERIVED].
- So individual peaks of ~20–30 N·m are within the distribution [DERIVED, assuming a roughly normal spread].
- Peak FM does **not** change with cut angle from 45° to 135° [ABS Cong & Lam 2021].
- FM sign varies between athletes doing the same 90° cut [ABS David & Potthast 2021].
- In running turns, FM-driven rotation is "small"; body yaw is produced mainly by GRF moments about the COM and by pre-set angular velocity [FT-auto Qiao 2014; ABS Jindrich 2006].

**Pivoting and turning (walking).**
- Spin turns produce "large" Tz (children; no values) [ABS Dixon 2014].
- Peak transverse torque in turning gait was 8–12 N·m (n = 3) [ABS Flick 2005].

**Kicking (support leg).** In angled instep kicks, the FM does "no remarkable" work. The support foot rotates relative to the plate under the GRF interaction torque [ABS Inoue & Nunome 2025]. No N·m values were found.

**Quiet standing and single-leg standing.** I found no usable primary FM magnitudes for single-leg stance.
- The bipedal quiet-stance FM papers (scoliosis literature) put both feet on one plate and print inconsistent units. I did not use them.
- One relevant fact: under 450 N axial load, a cadaver foot that cannot slide passively produces **−1.66 N·m** of internal-rotation FM [ABS Seki 2018]. Simply loading the foot therefore creates a ~1–2 N·m yaw torque.

**Capacity (maximal voluntary FM).** One foot, barefoot on sandpaper, can resist a trunk twist up to **53 N·m with the heel down but only 18 N·m on the ball of the foot** [FT Carrier & Cunningham 2017].
- A uniform-pressure contact model reproduces this: μ·N·r_eff with r_eff = 72 mm (whole foot) or 36 mm (forefoot) gives 53 and 27 N·m at μ = 1 and N = 736 N [DERIVED].
- **Ankle axial joint moments are larger than the FM.** Reported values are 0.09–0.16 N·m/kg in running [FT Jiang], 0.08–0.12 N·m/kg in a 45° cut [FT Arefin], and ~0.3 N·m/kg at a prosthetic shank in walking and circling [FT Klute 2024]. Wannop 2010 reports 80–90 N·m in V-cuts [ABS; definition uncertain]. **About 7–25 N·m is a defensible "typical-to-high" range for the ankle axial moment** in locomotion and ordinary cutting.

## 2. Shoe/boot–surface rotational traction

**Standardised mechanical tests (forefoot stance, ~450–1300 N).**
- Cleated boots on natural grass and infilled synthetic turf give **~28–63 N·m**:
  - Thomson 2019 (580 N, natural grass): 28–59 N·m.
  - Serensits & McNitt 2014 (787–1321 N): 38–63 N·m.
  - FIFA test disc on 450 N turf: 20–63 N·m (McGowan 2023).
  - FIFA limits are 30–45 N·m (Quality Pro) and 25–50 N·m (Quality).
- Ordering by outsole: SG (screw-in) > FG > AG/turf. The shoe effect is about 4× the surface effect in Serensits.
- Torque rises with vertical load, roughly linearly [ABS Smeets; FT Serensits Table 6: 47.5 → 55.9 N·m for 787 → 1321 N]. It also rises with rotation speed up to ~70–90°/s [FT McGowan].

**Elite-athlete-level loads.**
- Natural grass: **~120–175 N·m**. The surface shears and releases ("divot", a force-limiting mode).
- Infilled artificial turf: ~200 N·m, mostly **without release** [ABS Kent 2015a, 2015b, 2021].

**Rotation at peak torque and stiffness.**
- In the FIFA disc test, peak torque usually occurs at **30–40°** of rotation [FT McGowan, citing others]. The secant is ~1 N·m/° [DERIVED].
- Villwock 2009 and Livesay 2006 report that rotational stiffness differs more between shoe-surface combinations than peak torque does, and is higher on artificial turf. I could not access their numbers [ABS].
- Kent: artificial surfaces allow less angular displacement than grass [ABS].
- In humans, the foot rotated **18 ± 12°** on turf in a stop-and-turn [SEC Kati 2012].

**Barefoot or flat shoe on hard surfaces.**
- Barefoot on high-friction sandpaper: ~53 N·m heel-down and ~18 N·m forefoot-only [FT Carrier].
- Sock on Teflon (μ about 6× lower): lateral pushes produced whole-body spins of ~270° [FT Carrier].
- Robot test of court/running shoes on a track surface: 16–24 N·m [ABS Wannop 2010].
- A basketball shoe's own forefoot rotational stiffness is only ~10 N·m/rad (≈ 0.17 N·m/°) [FT Lam 2017]. This is a substantial compliance in series with foot-ground contact.

**Torg.** I did not retrieve the Torg 1974/1996 release-coefficient papers. I can only cite them by reference: Torg et al. 1974, *J Sports Med* 2:261; Torg et al. 1996, *AJSM* 24:79.

## 3. Tibia relative to the foot, and body over the foot

**Bone-level running (best evidence).**
- Tibia internally rotates **~5° (range ~1–6.5°)** relative to the calcaneus from touchdown to midstance, at ~60–90°/s, then externally rotates to toe-off [FT Stacoff 2000, n = 5].
- Biplanar X-ray gives calcaneus-vs-tibia transverse motion of ~4.4° (dorsiflexion phase) and ~8.3° (plantarflexion phase) in running, ~3–4° per phase in walking, and 5–6° in hopping, each with SD ~3–5° [FT Behling 2025, n = 9].
- The midfoot (talonavicular) adds ~8.7° transverse motion in running [ABS Arndt 2007].
- So a single-segment "foot" vs shank model might see on the order of ~5–15° of total axial excursion per running stance [DERIVED; order-of-magnitude].

**Mechanism caution.**
- Much of this rotation is **kinematically coupled** to eversion/inversion and dorsi/plantarflexion: coupling ratios are 0.4–1.0 [FT Stacoff], and the oblique talocrural axis couples sagittal motion to shank rotation [FT Klute 2024 intro].
- It is not simply a deflection under torque. Skin markers overestimate bone motion: skin-marker ankle int/ext ROM in running is ~14° [FT Jiang], versus ~5–8° at bone level.

**Cutting and kicking.** I found no bone-level tibia-vs-foot axial rotation data.

**Body over the foot.**
- In cuts, the body re-orients by roughly the COM deflection angle within one stance, ~25–45° for 45° cuts [FT-auto Qiao; ABS Jindrich].
- That rotation must occur mostly at the **hip**, and partly at knee/ankle, or by the foot pivoting on the ground.
- In walking without FM and without arm swing, thorax yaw excursion rose to ±11–12° [FT Negishi 2023a].

## 4. How humans stabilise yaw in single support

- **Arm swing and trunk counter-rotation do the main work in walking.**
  - The transverse-plane segment-cancellation coefficient was 0.64 with arm swing vs 0.20 without [FT Negishi 2023b].
  - Arm swing and FM "reinforce each other" [ABS Li 2001].
  - Removing the FM with point-contact shoes only disrupts the trunk when the arms are restrained [FT Negishi 2023a].
- **FM is the backup and the anti-spin constraint.** It grows when the arms are constrained: in walking [FT Negishi 2023b; ABS Li 2001] and in running, +36% with a stroller [FT Mahoney]. On low-friction ground, yaw torques simply spin the body [FT Carrier].
- **GRF moment arms (r×F) dominate whole-body yaw regulation.** This holds in walking [FT Negishi 2023b] and in running turns, where braking forces stop over-rotation [ABS Jindrich 2006; FT-auto Qiao 2014].
- **Hip rotation is the kinematic path for torsion between pelvis and foot** [ABS Ohkawa 2017, *Gait Posture* 58:415].
- **Single-leg quiet stance.** I found **no reliable quantitative yaw-sway data**; the one IMU paper found was unusable (see Table c). This is a gap.

## 5. Synthesis: demand vs ground limit

Numbers are typical (central) values with plausible upper bounds. Tags apply to the underlying sources.

| Condition | FM (foot–ground) | Ankle axial moment (what the model's coordinate carries) | Shank-over-foot axial rotation (bone level) | Ground capacity | Which limits first |
|---|---|---|---|---|---|
| (a) Quiet single-leg stance, slow foot lift | No direct data. Inferred to be ≤ walking peaks: likely ≲ 1–3 N·m, with a ~1–2 N·m load-induced component (Seki). [inference] | Not measured. Probably a few N·m. [inference] | Not measured. Walking per-phase calcaneus-tibia motion is ~3–4°, so quasi-static stance is likely ≤ a few degrees. [inference] | ~53 N·m heel-down barefoot, ~18 N·m on the forefoot; ~30–60 N·m for cleats in standard tests | **Neither.** Demand is < 10% of capacity. The foot is effectively anchored. Body yaw is handled by hip, trunk and arms. |
| (b) Running | ~8–13 N·m peak (up to ~16 N·m); net impulse ~0.2–0.6 N·m·s per stance | ~7–12 N·m (0.09–0.16 N·m/kg) | ~5° touchdown → midstance; ~10–13° whole stance (calcaneus-tibia); more with the midfoot | Heel-down barefoot ~53 N·m; cleats on grass 28–63 N·m (standard tests) and 120–175 N·m at elite loads | **Neither** in normal running (demand ~15–40% of standard-test capacity). At forefoot-only push-off the capacity drops roughly 3× (~18 N·m barefoot), so ground and demand get closer. |
| (c) Cutting / turning / kicking | Sidestep mean ~10 N·m (SD ~9; individual peaks plausibly 20–30 N·m). Turning gait 8–12 N·m. Maximal lateral pushes/strikes up to the MVFM (~18–53 N·m one foot). Kicking: FM small, the foot pivots. | 0.08–0.12 N·m/kg (Arefin) to 80–90 N·m (Wannop V-cut; definition uncertain) | No bone data. Body yaws ~25–45° over the foot in a stance (mostly at the hip). Foot rotates on turf ~18 ± 12° in stop-turns. | Same as (b). On infilled turf, cleats may not release below ~200 N·m. | **Ordinary cuts: neither.** In deliberate pivots on the forefoot, people **let the foot rotate on the ground** (Kati; Inoue & Nunome). **Extreme loads with cleats on infilled turf: anatomy limits first**: turf ~200 N·m without release vs cadaver ankle failure ~70 N·m and ACL ~33 N·m. That ordering is the proposed injury mechanism. On natural grass, the turf releases at ~120–175 N·m, still above the cadaver ankle failure torque. |

---

## Implications for the model

### Evidence-supported (with conditions)

1. **The demand on the passive foot-vs-shank axial coordinate is the ankle axial moment, not the free moment.** In locomotion and normal cutting, published ankle axial moments are **~0.1–0.3 N·m/kg (≈ 7–25 N·m at 75 kg)** [FT Jiang, Arefin, Klute 2024]. Free moments alone are ~3–4 N·m in walking, ~8–13 N·m in running and ~10 N·m (SD ~9) in 45° cuts [FT/SEC]. A coordinate sized only against FM will be overloaded by the horizontal-GRF × COP-offset term.

2. **Per-stance yaw impulses delivered by the FM are ~0.2–0.6 N·m·s in running.** With arms constrained this rises to ~1.3 N·m·s (stroller) [DERIVED from FT/SEC]. A 1 N·m·s design impulse is therefore realistic as a robustness case, not an everyday load.

3. **Bone-level shank-on-foot axial rotation in stance is ~5° (touchdown → midstance) and ~10–13° over a whole running stance** (calcaneus-tibia; more if midfoot motion is lumped into "foot") [FT Stacoff, Behling; ABS Arndt]. Walking is about 3–4° per phase [FT Behling]. Much of it is kinematic coupling with eversion and plantar/dorsiflexion, not torque-driven deflection.

4. **Order-of-magnitude stiffness benchmarks around 1 N·m/° all point the same way.** Each is indirect:
   - Prosthetic transverse-rotation adapters that amputees walk and turn on: 0.25–1.29 N·m/° (Pew 2017, 2019), commercial 0.4–2.7 N·m/° (Flick 2005) [ABS]. Lower stiffness increased the whole-body angular momentum range and was preferred for turning and slow walking; stiffer was preferred for straight and fast walking [ABS Pew 2019].
   - Cadaver ankle external rotation secant ~1.7 N·m/° to failure; ~1.2–1.5 N·m/° at 30° in football shoes [DERIVED from ABS Wei 2010, 2012].
   - Boot–turf interface secant ~0.75–1.5 N·m/° [DERIVED from FT McGowan].
   - Running ratio of FM to tibial rotation ~1–2.7 N·m/° [DERIVED; not a stiffness measurement].
   - **So ~1 N·m/° is within the human-plausible band.** It sits at the stiff end of prosthetic adapters and the compliant end of cadaver/shod values. Note, though: 1 N·m/° under a 7–25 N·m ankle axial moment implies **~7–25° passive deflection**, which exceeds bone-level observations (~5–13°). Humans add muscle (and articular) resistance and kinematic coupling. A purely passive spring at 1 N·m/° will look "too floppy" in running and cutting unless it is load-dependent or supplemented.

5. **The ground side should not be the routine limiter.** With the heel down, foot–ground torsional capacity is ~30–60 N·m (barefoot ~53; cleats 28–63 N·m in standard tests; 120–200 N·m at elite loads). Capacity scales with normal load and contact radius, and **drops roughly 3× with forefoot-only contact** (~18 N·m barefoot) [FT Carrier; FT Serensits; ABS Smeets; DERIVED contact model]. Torsional friction of roughly μ·N·r_eff, with r_eff ≈ 70 mm (whole foot) and ≈ 35 mm (forefoot), reproduces the human data.

6. **Turning, planting, cutting and kicking need the foot to be able to pivot on the ground in some phases.** The foot rotates ~18 ± 12° in stop-and-turn [SEC Kati] and pivots in angled kicks [ABS Inoue & Nunome]. **The body must also be able to yaw ~25–45° over a planted foot within one stance** [FT-auto Qiao; ABS Jindrich]. Biologically that yaw is taken mostly at the hip, not at the ankle axial joint.

7. **Arm swing and trunk counter-rotation are the primary yaw stabilisers in gait; FM is secondary.** Removing the FM barely matters when the arms swing [FT Negishi 2023a, 2023b]. The model's yaw control should not rely on the ankle axial spring alone.

### Not supported, or not found

- No primary free-moment or yaw-sway data for **quiet single-leg stance or slow foot lifting**. The ≲ 1–3 N·m estimate for (a) is an inference.
- No bone-level tibia-vs-foot axial rotation data for **cutting or kicking**, and no support-leg FM values in N·m for kicking.
- Villwock 2009 and Livesay 2006 rotational stiffness and peak values (paywalled; abstracts only). Kent's load–rotation corridors (not accessed).
- Torg release-coefficient values (not retrieved).

### Uncertain

- **Coordinate frames for ankle axial moments differ** (0.1 N·m/kg in Arefin vs ~85 N·m in Wannop 2010 for similar tasks). Treat 7–25 N·m as typical and higher values as possible but unverified.
- Normalised-to-N·m conversions use a 75 kg / 1.80 m reference body [DERIVED]. Footballers in cleats on turf may produce larger FM than runners in lab shoes; no direct data were found.
- **All stiffness "benchmarks" above are secants or ratios** from cadaver failure tests, prosthetic devices or traction testers. None is a measured in-vivo tangent stiffness of the human foot–shank axial joint under weight bearing. Loaded ankles are stiffer than unloaded ones: the articular surface supplies ~30% of rotational stability under physiological load [ABS Stormont 1985], and talar rotation is load-dependent with ~25° unloaded range [ABS McCullough & Burge 1980].

---

## Sources (primary unless noted)

- Almosnino S, Kajaks T, Costigan PA (2009). *SMARTT* 1:19. doi:10.1186/1758-2555-1-19. [FT; also used as secondary source for Holden & Cavanagh, Milner, Creaby & Dixon, Li, Umberger, Nigg]
- Arefin MS et al. (2024). *PLoS ONE* 19:e0297592. doi:10.1371/journal.pone.0297592. [FT]
- Arndt A et al. (2007). *J Biomech* 40:2672. doi:10.1016/j.jbiomech.2006.12.009. [ABS]
- Behling AV, Welte L, Rainbow MJ, Kelly L (2025). *Heliyon* 11:e41301. doi:10.1016/j.heliyon.2024.e41301. [FT]
- Carrier DR, Cunningham C (2017). *Biol Open* 6:269. doi:10.1242/bio.022640. [FT]
- Cong Y, Lam WK (2021). *J Sports Sci* 39:1386. doi:10.1080/02640414.2021.1874716. [ABS]
- David S, Potthast W (2021). *J Sports Sci* 39:2812. doi:10.1080/02640414.2021.1964748. [ABS]
- Dixon PC et al. (2014). *J Biomech* 47:3726. doi:10.1016/j.jbiomech.2014.09.011. [ABS]
- Flick KC et al. (2005). *Prosthet Orthot Int* 29:73. doi:10.1080/03093640500088120. [ABS]
- Holden JP, Cavanagh PR (1991). *J Biomech* 24:887. doi:10.1016/0021-9290(91)90167-L. [ABS + SEC]
- Inoue K, Nunome H (2025). *J Appl Biomech* 41:313. doi:10.1123/jab.2024-0189. [ABS]
- Jiang X et al. (2023). *Bioengineering* 10:876. doi:10.3390/bioengineering10070876. [FT]
- Jindrich DL, Besier TF, Lloyd DG (2006). *J Biomech* 39:1611. doi:10.1016/j.jbiomech.2005.05.007. [ABS]
- Kent R et al. (2015a). *Sports Biomech* 14:1. doi:10.1080/14763141.2015.1024277. Kent R et al. (2015b). *Sports Biomech* 14:246. doi:10.1080/14763141.2015.1052749. Kent R et al. (2021). *J Biomech* 127:110670. doi:10.1016/j.jbiomech.2021.110670. [ABS]
- Klute GK, Mulcahy CW (2024). *Front Rehabil Sci* 5:1354144. doi:10.3389/fresc.2024.1354144. [FT]
- Lam WK et al. (2017). *PeerJ* 5:e4086. doi:10.7717/peerj.4086. [FT]
- Livesay GA, Reda DR, Nauman EA (2006). *AJSM* 34:415. doi:10.1177/0363546505284182. [ABS]
- Mahoney JM et al. (2025). *PLoS ONE* 20:e0332616. doi:10.1371/journal.pone.0332616. [FT]
- McGowan H et al. (2023). *Sci Rep* 13:21631. doi:10.1038/s41598-023-48134-0. [FT]
- Meyer EG, Haut RC (2008). *J Biomech* 41:3377. doi:10.1016/j.jbiomech.2008.09.023. [ABS]
- Milner CE, Davis IS, Hamill J (2006). *J Biomech* 39:2819. doi:10.1016/j.jbiomech.2005.09.022. [ABS + SEC]
- Milner CE et al. (2023). *J Sport Health Sci* 12:333. doi:10.1016/j.jshs.2022.12.002. [FT; meta-analysis]
- Negishi T, Ogihara N (2023a). *Sci Rep* 13:6894. doi:10.1038/s41598-023-34153-4. [FT]
- Negishi T, Ogihara N (2023b). *Sci Rep* 13:8000. doi:10.1038/s41598-023-34910-5. [FT]
- Ogasawara I et al. (2022). *J Sports Sci* 40:2072. doi:10.1080/02640414.2022.2133392. [ABS]
- Ohkawa T et al. (2017). *Gait Posture* 58:415. doi:10.1016/j.gaitpost.2017.09.002. [ABS]
- Pew C, Klute GK (2017). *Gait Posture* 51:104. doi:10.1016/j.gaitpost.2016.10.003. Pew C, Klute GK (2017). *Med Eng Phys* 49:22. doi:10.1016/j.medengphy.2017.07.002. Pew C et al. (2019). *J Biomech* 96:109330. doi:10.1016/j.jbiomech.2019.109330. [ABS]
- Qiao M, Brown B, Jindrich DL (2014). *J Exp Biol* 217:432. doi:10.1242/jeb.087569. [FT-auto/ABS]
- Reinschmidt C et al. (1997). *Clin Biomech* 12:8. doi:10.1016/S0268-0033(96)00046-0. [ABS]
- Seki H et al. (2018). *Proc IMechE H* 232:637. doi:10.1177/0954411918777267. [ABS]
- Serensits TJ, McNitt AS (2014). *Appl Turfgrass Sci*. doi:10.2134/ATS-2013-0073-RS. [FT]
- Smeets K et al. (2012). *BJSM* 46:1078. doi:10.1136/bjsports-2012-090938. [ABS]
- Stacoff A et al. (2000). *J Biomech* 33:1387. doi:10.1016/S0021-9290(00)00116-0. [FT]
- Stormont DM et al. (1985). *AJSM* 13:295. McCullough CJ, Burge PD (1980). *JBJS Br* 62-B:460. [ABS]
- Thomson A et al. (2019). *PLoS ONE* 14:e0216364. doi:10.1371/journal.pone.0216364. [FT; also used as secondary source for Wannop 2013 and Lambson 1996]
- Villwock MR et al. (2009). *AJSM* 37:518. doi:10.1177/0363546508328108. [ABS]
- Wannop JW, Worobets JT, Stefanyshyn DJ (2010). *AJSM* 38:1221. doi:10.1177/0363546509359065. [ABS]
- Wei F et al. (2010). *J Biomech Eng* 132:091001. doi:10.1115/1.4002025. Wei F et al. (2012). *J Biomech Eng* 134:041002. doi:10.1115/1.4005695. [ABS]

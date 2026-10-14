# SLIDE2 — ground entry and body–turf contact for a simulated slide tackle

Round 2, compiled 2026-10-14. Extends `SLIDE_LITERATURE.md` (round 1) and SUPPORT-1 `S1_LITERATURE.md`; values already there are cited, not re-derived. Verbatim quotes: `excerpts2.md`.

**Kind:** MEASURED (human/real-surface data) · MODEL (published simulation) · STANDARD (test method / limit / software rule) · ASSERTION (stated without data: reviews, coaching texts) · DERIVED (my arithmetic, formula given) · ASSUMED / DESIGN CHOICE (mine).
**Check:** [FT] I read the full text · [TOOL-FT] full text read through the WebFetch extractor · [ABS] abstract only · [SEC: X] number seen only in X · [SNIP] search snippet only (unverified). Sub-agents did parts of the search; their tags are kept.

## Executive summary (decision-relevant)

| Question | Best answer | Evidence quality |
|---|---|---|
| First ground contact | Lateral knee / shank of the bent under-leg, then lateral thigh / hip / buttock, then glide (1.1–1.6) | MEASURED, n = 3 force plate + video [FT]; coaching ASSERTION; 75 kg MODEL agrees |
| Extended-leg heel load-bearing? | Not measured anywhere. Coaching says heel up; a foot that catches is an injury mechanism (MCL "sliding" 9/37; high-ankle "sliding" 7/140) | video MEASURED [FT]; no kinetic data |
| Impact phase | knee ≈30 ms, 1.0–2.3 kN; hip 2.9–5.0 kN; window 0.15–0.16 s; Δv_h ≈0.8–1.5 m/s (DERIVED) | MEASURED [FT], n = 3 |
| Glide μ_eff on 3G | 0.2 (knee-form rig, 5 m/s) … 0.37–0.46 (hip H/V) … 0.57 (Securisport, 0.84 m/s); recommend **0.45** for kit (tune 0.35–0.55), **0.55** for skin/sock | MEASURED rigs [FT]; DERIVED; no human glide data |
| Glide on natural grass | **No primary μ anywhere**; use the 3G values and flag | NOT FOUND |
| Slide duration and distance | "< 1 s" for 6.47 m/s approaches (unpublished); DERIVED 0.8–1.2 s and 1.5–3 m from first contact for 4.5–5.5 m/s entries | [SEC]; DERIVED |
| Boot traction by sole region | loaded studs-down 0.9–1.6; flat stud-less plate 0.70; heel-only and edge-on "significantly less" and slide past ≈5–7.5° roll → use 0.6–0.9 | MEASURED (Loud 2024 qualitative [TOOL-FT]; Webb [FT]); ASSUMED numbers |
| Region-specific μ | standard in engines and injury models (body–ground 0.58–0.7, feet 0.6); RL humanoids use one μ of 0.8–1.0; **engine combine rules (max / product / average) decide what you get** | STANDARD [FT] |
| Knee limits | target ≤ 1.3 kN, realistic ≤ 2.5 kN, pathological ≥ 3.5 kN, fail ≥ 5 kN | cadaver MEASURED [ABS]; DESIGN CHOICE |
| Hip | 2.3–4.6 kN expected for 2.5–3.4 m/s (rig k 39–55 kN/m, m 22–33 kg); contusion ≈4–4.5 kN on a small patch | STANDARD [ABS]; ASSERTION [SEC] |
| Arms | EMG 100–126 ms; hands down ≈370–680 ms; ≤ 1 BW per hand; ≈40 J per arm | MEASURED [ABS]/[TOOL-FT] |
| Receiver | no football timing data; lab proxies → ground ≈0.4–0.7 s after the sweep; step ≥ 0.3 s | MEASURED lab [FT]/[ABS]; DERIVED |

---

## Q1. Ground-entry contact sequence

**Answer.** Lateral knee / lateral shank of the bent "under" leg first, then lateral thigh / greater trochanter / buttock, then a glide on lateral thigh + hip (+ shank). The extended tackling leg's heel has **no measured load in any study**. Video injury studies show that a foot which stays in contact and catches the turf during a slide is an *injury mechanism*, not a load path. Coaching texts in both football and baseball say to keep the lead heel off the ground and the under-foot turned so its studs cannot dig in.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 1.1 | Contact order, 36 lab slides (3 players, 3G, 4.5–5.0 m/s) | knee peak, then hip peak; "knee was only in contact with the surface during the landing phase" | van den Eijnde W et al. J Sports Med Phys Fitness 2017;57:1205 (thesis ch. 3.2) | MEASURED | [FT] |
| 1.2 | Which leg lands (sliding-in) | side step on the contralateral leg, then "the bended right leg … moves below the upper body" and lands knee-first | same | MEASURED (video) | [FT] |
| 1.3 | What the force plate could see | 60 × 40 cm plate; a trial counted only if knee **and** hip landed on it, so a heel or hand load would be off-plate | same | MEASURED (method) | [FT] |
| 1.4 | Coaching technique | near leg "leads … sink down onto the left leg, which curls beneath the seat"; far leg "swings around in a wide sweep, with the foot hooked" | Hargreaves A, Bate R. *Skills & Strategies for Coaching Soccer* 2e (Human Kinetics excerpt) | ASSERTION | [TOOL-FT] |
| 1.5 | Baseball bent-leg slide | slide "on the outside of the bent leg … calf, thigh and rear"; "heel off the ground"; bottom-foot instep forward "preventing the spikes from catching"; head back so the knees do not hit first; start 9–10 ft (2.7–3.0 m) from the bag | Baseball Canada, *Sliding fundamentals* (coaching page) | ASSERTION | [TOOL-FT] |
| 1.6 | 75 kg, 11-segment lateral-fall model, "Free" strategy | first impact lateral **knee 512 N** (1261 N with arm), then posterolateral hip / GT **1585 N**, pelvis, buttock; rigid "broomstick" GT 3533 N | Lo J, Ashton-Miller JA. J Biomech 2008;41:1969 (PMC2562433) | MODEL | [TOOL-FT] |
| 1.7 | Same model's ground-contact law | nonlinear in penetration and velocity: soft sites (pelvis, thorax, shoulders) K = 3.5 MN/m³, B = 6 (m/s)⁻¹; bony sites (heel, knee, GT, elbow, wrist, head) K = 10 MN/m³, B = 7 (m/s)⁻¹; no friction given | same | MODEL | [TOOL-FT] |
| 1.8 | Plant step | plant-foot contact 0.38 s (skilled, n = 6) vs 0.50 s (unskilled, n = 6); tackling-leg speeds hip 5.5 / knee 9.1 / ankle 9.9 m/s (skilled) | Yamaguchi R, Asai T, Kon T, Momose K. JSME Sports Eng Symp 2004:306 (doi 10.1299/jsmesports.2004.0_306); 60 Hz, indoor, slides onto a sheet | MEASURED (low quality) | [FT, Japanese] |
| 1.9 | Under-foot catches the ground (ankle) | "sliding" = 7/140 elite ankle sprains, all high-ankle: "toe contact with the ground, large knee flexion and external foot rotation" | Buckthorpe M et al. KSSTA 2025 (PMC12582226) | MEASURED (video) | [FT] |
| 1.10 | Planted leg dragged as the body passes (knee) | "sliding" = 9/37 MCL injuries (24 %): block tackle "with the nontackling leg on the ground", injury "as the body passes the injured leg in contact with the ground"; knee flexion median **110°**, valgus, hip abduction, foot external rotation | Buckthorpe M et al. JOSPT 2021;51:611 (accepted MS) | MEASURED (video) | [FT] |
| 1.11 | Extended-leg overload | stretch-type hamstring / proximal-tendon injuries in "high kicking, sliding tackle, sagittal split" | Askling via Brukner P. BJSM 2015 (PMC4602251); Lefèvre N et al. AJSM 2024 (PMC10943609) | ASSERTION (reviews) | [FT] |
| 1.12 | Slides as a share of tackles | women 11.6 % (410/3531); men ≈25 % (DERIVED from Fuller's 2173/8572 in Tscholl's Table 3); men's foul rate for sliding-in tackles 42.5 % (from behind) / 30.5 % (side) / 20.2 % (front) | Tscholl P et al. BJSM 2007;41(S1):i15 (PMC2465246) | MEASURED | [TOOL-FT] |
| 1.13 | Foot/ankle injuries of tackled players | tackler sliding 37 %, tackler on his feet 57 % (n = 76) | Giza E et al. AJSM 2003, tabulated in Aiello F et al. Sports Med 2023 (PMC9807506) | MEASURED | [SEC: Aiello] |

**DERIVED from round-1 Table 2 (80 kg).** Taking the hip peak ratio H/V = 0.37–0.46 as the direction of the impact impulse, the 183–287 N·s resultant impulse gives J_h ≈ 64–120 N·s, i.e. **Δv_h ≈ 0.8–1.5 m/s lost during the 0.15–0.16 s impact**, and 0.6–1.8 m/s of vertical speed removed. During the impact the body travels ≈0.6–0.7 m. Lesion-based contact areas (round-1 table, Fz/σz): knee ≈20–41 cm², hip ≈54–57 cm².
**Not found:** slide-tackle joint kinematics with markers on turf; any load under the extended leg's heel; slide-tackle hand contact rates.

---

## Q2. Glide phase: deceleration, distance, friction of skin and kit

**Answer.** There is still **no measured whole-body glide deceleration** on grass or 3G, and **no skin/kit/body μ on natural grass** from any rig. On 3G the evidence brackets the effective glide μ between ≈0.2 (rigid knee-form, 5 m/s) and ≈0.57 (Securisport, 0.84 m/s); the slide-tackle hip impact sustained H/V ≈0.37–0.46; and a slide that ends in "< 1 s" from 4.5–6.5 m/s needs μ_eff ≈0.3–0.55 (DERIVED). Dry skin friction is roughly Coulomb (pressure-independent); its speed dependence is known only at mm/s, so velocity dependence at slide speeds is **not established**.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 2.1 | Sliding deceleration, 36 kg knee-form (Lorica skin) released at 5 m/s horizontal from 0.5 m onto four 3G rugby turfs | Rs medians 1.73–2.12 m/s² (range 1.6–2.25) → **μ_eff ≈ 0.16–0.23** (DERIVED, assumes full weight on turf); "in some instances, the impactor did not slide to rest"; impact peak 127–292 m/s² | MacFarlane M et al. Lubricants 2024;12(6):207 (Figs 6–7) | MEASURED / DERIVED | [FT] |
| 2.2 | Slide-tackle approach and duration | approach **6.47 m/s** (5 players, AT, video); "sliding duration lasted less than 1 s" | Ingham C 2013 (unpublished), cited in Tay SP PhD thesis 2016, p. 18 | MEASURED (primary unseen) | [SEC: Tay] |
| 2.3 | Peak H/V during slide-tackle impact (round 1) | hip 0.37–0.46; knee 0.59–0.64 | van den Eijnde 2017 Table 2 | DERIVED | [FT] |
| 2.4 | Securisport (silicone skin, 100 N, 40 rpm = 0.838 m/s) | fully infilled 3G 0.57–0.59; unfilled 0.97–1.20; static 0.53–0.72 (round 1); pass window **0.35–0.75** in FIFA and World Rugby Reg. 22 | Tay 2015/2017; FIFA Handbook of Requirements 2015 V2.3; World Rugby Turf Performance Specification | MEASURED / STANDARD | [FT] / [TOOL-FT] |
| 2.5 | "Realistic" sliding device, unfilled carpets | mean COF ≈0.9–1.8 (peak 1.2–2.25) | Sanchis M et al. Eng Sport 7 (2008) 2:149; ISSS 2010 slides | MEASURED (read from chart) | [FT slides] |
| 2.6 | Feet-first baseball slide on dirt (5 NCAA-II, 87 kg) | peak COM 6.40 m/s; airborne 0.16 s; **slide phase 0.57 ± 0.18 s** (planned), 0.22 ± 0.17 s (unplanned, cut short by the base) | Hanson TM, Hsieh C. ISBS 2015:945 | MEASURED | [FT] |
| 2.7 | Same, 9 Div-I players | last 10 m 1.22 vs 1.13 s (slide vs run-through); mean COM 7.54 vs 8.42 m/s; foot 0.79 m ahead of COM at base contact; slide = "on the hip of a leg which is folded underneath the other, extended leg" | Ficklin T, Dapena J, Brunfeldt A. J Sport Health Sci 2016;5:361 (PMC6188574) | MEASURED | [FT] |
| 2.8 | μ_eff of a planned baseball slide on dirt | ≈0.55–0.75 incl. landing braking (≈2.3–2.5 m in 0.57 s from ≈6 m/s); fragile — the same arithmetic fails on unplanned trials | from 2.6 | DERIVED | — |
| 2.9 | Dry vs wet skin (meta-analysis) | dry 0.57 ± 0.32 (median 0.47), "pressure-independent"; wet 1.5 ± 0.6; speed effect only measured at 0.25–33 mm/s (e.g. 0.39 → 0.52 from 0.5 → 4 mm/s) | Derler S, Gerhardt L-C. Tribol Lett 2012;45:1 | MEASURED (review) | [FT] |
| 2.10 | Skin on textile | 0.27–0.71 (hydration-dependent), "practically no load dependence" | Derler S, Schrade U, Gerhardt L-C. Wear 2007;263:1112 | MEASURED | [ABS] |
| 2.11 | Skin on turf is not Coulomb-linear | soft–soft adhesive (JKR) contact; full infill "acts like ball bearings"; rubber infill > PE ≈ nylon fibre, load-dependent (pin tests) | Tay thesis 2016 §4.5; Morales Hurtado M et al. Tribol Int 2016 | ASSERTION / MEASURED (qualitative) | [FT] |
| 2.12 | Whole-body sliding μ (forensic) | Searle 0.66–0.79, "no difference" grass vs tarmac (round 1, method unreported); body drag on pavement 0.51–0.62; reconstruction models use 0.58–0.7 | Searle 1983 [SEC: Neades]; Kim MT et al. J Korean Soc ITS 2010; Wu 2021; Peng 2024 | MEASURED / DESIGN CHOICE | [SEC]/[ABS]/[FT] |
| 2.13 | Frictional heating (Ghent sledge, ≈100 cm², 15–30 kPa) | ΔT rises with speed and load (14.8 kg: 4.1 → 8.4 °C from 2.4 → 4.2 m/s; 26.8 kg at 3.7 m/s: 12.6 °C); wetting 1 L/m² cuts 3G ΔT 7.9 → 1.7 °C; μ was computed from slide distance but **never published** | Verhelst R et al. JSSM 2007;6(S10); Ghent 2009 proc. | MEASURED | [FT] |

**DERIVED.** Glide entry after the impact loss (Q1) is ≈3.0–4.7 m/s for 4.5–5.5 m/s entries; a ≈0.85 s glide then needs μ = v/(g·t) ≈ 0.36–0.56 (sub-agent A, with 2.5–3.5 m/s entry: 0.30–0.42). The knee-form's 0.2 would give a 1.3–1.8 s, 1.6–3.1 m glide — too long for "< 1 s", so the real body must brake more (multiple contacts, ploughing shank/heel, roll). Why the rigs disagree is confounded (skin material, load 100 vs 353 N, speed 0.84 vs 5 m/s, rotation vs translation).
**Not found:** μ of polyester shorts, socks or sliding shorts on turf; any NG rig value; speed dependence between 0.84 and 5 m/s; Verhelst's μ values; Corzatt 1984 numbers.

---

## Q3. Studded-boot traction by loaded sole region; stud release; region-specific friction

**Answer.** Traction is a property of *which part of the sole engages*. A loaded studs-down boot holds (μ_eff ≈ 0.9–1.6 at BW-level loads, 1.7–2.7 at light loads; SUPPORT-1 §1). Heel-only, toe-only and edge-loaded boots engage only 2–4 studs and measurably lose traction, and past ≈5–7.5° of roll the boot "begins to slide over the playing surface". A flat stud-less plate on 3G gives μ ≈ 0.70; each stud adds ploughing. Per-region (per-material-pair) friction is standard in every physics engine and in pedestrian crash models — but engines *combine* coefficients differently, which matters more than the values.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 3.1 | Heel-only contact (30° dorsiflexion): only the 2 rear studs penetrate | "significantly less translational traction for anterior movement" than neutral; numbers only in figures | Loud D, Grimshaw P, Kelso R, Robertson W. Sports Eng 2024, doi:10.1007/s12283-024-00467-3 (148 N, 67 mm/s, 3G + NG) | MEASURED | [TOOL-FT] |
| 3.2 | Toe-down (30° plantarflexion): 4 front studs; posterior TC bimodal (peaks ≈15–20° and 0°) | — | same | MEASURED | [TOOL-FT] |
| 3.3 | Edge loading: medial TC rises to ≈7.5° inversion then falls; lateral TC peaks ≈5–7.5° eversion then falls as the boot slides over the surface | — | same | MEASURED | [TOOL-FT] |
| 3.4 | Flat 120 × 120 mm plate, no studs, 441 N, 3G | peak ≈310 N at ≈40 mm, then level → **μ ≈ 0.70** (DERIVED) | Webb CH, PhD thesis Loughborough 2017 (figshare 9454658) | MEASURED / DERIVED | [FT] |
| 3.5 | Same plate, 1 stud / 3 studs (13 mm) | ≈440 N still rising (μ ≈ 1.0) / ≈630 N at ≈60 mm then falling (μ ≈ 1.43) (DERIVED); studs alone give little — the plate "edge effect" matters | same | MEASURED / DERIVED | [FT] |
| 3.6 | Static TC < dynamic TC (traction rises once motion starts); TC–load slope changes at 888 N | 222–1776 N, FieldTurf | Kuhlman S et al. Proc IMechE P 2010;224:155 | MEASURED | [ABS]; static<dynamic [SNIP] |
| 3.7 | Stud contact in play: push-off ends on "only the two toe studs", which slide; kick plant lands on the **lateral heel edge**, side-cut on the medial heel studs, which then translate ≈10 mm | heel velocity at strike 2.90 ± 0.13 m/s (NG, n = 11) | Driscoll HF, PhD Sheffield Hallam 2012; Kirk RF et al. Sports Eng 2007;10:129 | MEASURED | [FT]; Kirk [SEC: Driscoll] |
| 3.8 | Feet-first baseball slide: lead foot lands **on the heel** (ankle plantarflexion); ankles, knees, hips, trailing hand at risk | qualitative, high-speed film | Corzatt RD et al. AJSM 1984;12:229 | MEASURED (qualitative) | [SEC: LER magazine review] |
| 3.9 | Engine friction combination | MuJoCo: higher `priority` geom wins, else **element-wise max**; Bullet: **product** (clamp 10); Rapier: **average** default (min/max/multiply selectable); PhysX: average/min/multiply/max (default not verified) | MuJoCo XMLreference/Modeling guide; bullet3 btManifoldResult.cpp; rapier coefficient_combine_rule.rs; PhysX API | STANDARD | [FT]/[TOOL-FT]; PhysX [SNIP] |
| 3.10 | Pedestrian models use one body–ground μ | THUMS-type FE: ground 0.7; Virtual CRASH multibody: 0.6 (slide matches v² = 2μgd within 0.7 %) | Peng Y et al. Biomimetics 2024 (PMC10813001); Becker et al. arXiv:1512.00790 | DESIGN CHOICE (models) | [FT] |

**Not found:** a numeric TC for a heel-only, edge-on or side-on (upper) boot; kinetic μ of a boot sliding on its upper; MADYMO shoe-vs-body ground friction.

---

## Q4. Knee and hip landing loads; injuries

**Answer.** Measured slide-tackle knee peaks (1.0–2.3 kN) are ≈15–66 % of cadaver patellar fracture loads (3.5 kN oblique, 5.9 kN axial, 6.7 kN rigid); occult subchondral damage appears from ≈5 kN. Hip peaks (2.9–5.0 kN) match what a hip-protector test rig predicts for 2.5–3.4 m/s pelvis impacts and are tolerated by young athletes because thigh, pelvis and soft tissue share the load. The slider's injuries in video studies come from **a foot or leg that stays anchored while the body passes** (MCL, high-ankle sprain), not from the knee or hip impact itself; skin abrasion is the dominant surface injury.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 4.1 | Patella fracture, rigid impact | 6.7 kN; subfracture 5.2 kN left occult microcracks | Atkinson PJ, Haut RC. J Orthop Res 1995;13:936 | MEASURED (cadaver) | [ABS] |
| 4.2 | Axial vs oblique (from medial side) knee impact | **5.9 ± 1.4 vs 3.5 ± 1.4 kN** (donors 73 ± 17 y, 90° flexion) | Meyer EG, Haut RC. Stapp Car Crash J 2003;47:1 | MEASURED | [ABS] |
| 4.3 | Deformable interface prevents gross fracture at ≈5 kN; subfracture damage unchanged | rigid 20 vs padded 5 fractures | Atkinson PJ, Haut RC. J Biomech Eng 2001;123:205 | MEASURED | [ABS] |
| 4.4 | Crash-dummy femur limit | 10.0 kN (2250 lb; 50th male); 6805 N (5th female) | FMVSS 208, 49 CFR 571.208 S6.5 | STANDARD | [FT] |
| 4.5 | Hip-protector rig (whole-body equivalent at the trochanter) | v = 3.4 m/s; k = 39–55 kN/m; m_eff = 22–33 kg | Robinovitch SN et al. Osteoporos Int 2009 (PMC3471980) | STANDARD | [ABS] |
| 4.6 | Trochanteric soft tissue stiffens when muscles are tensed | 146 → 232 kN/m (+59 %) relaxed → maximal gluteus medius | Kim SS et al. J Mech Behav Biomed Mater 2023;138:105622 | MEASURED | [ABS] |
| 4.7 | Femur strength, fall on greater trochanter | old (74 y) = ½ of young (33 y); absolute ≈7.2 vs 3.4 kN often quoted | Courtney AC et al. JBJS Am 1995;77:387 | MEASURED | ratio [ABS]; absolutes UNVERIFIED |
| 4.8 | Hip contusion (goalkeeper dives) | ≈110–125 N/cm² (4.0–4.5 kN) "could result in a contusion"; field dives on grass 117 ± 54 N/cm² | Schmitt KU et al. 2010 via van den Eijnde 2014 (PMC4555542) | ASSERTION from MEASURED | [SEC: van den Eijnde 2014] |
| 4.9 | Slide-tackle contact areas (lesion areas, round-1 study) | knee ≈20–41 cm²; hip ≈54–57 cm² (DERIVED: Fz/σz from Table 2) | van den Eijnde 2017 | DERIVED | [FT] |
| 4.10 | Skin injuries, NCAA | men laceration/skin lesion AT 1.81 vs NG 0.61 /1000 match-h (only injury type higher on AT); knee contusion 0.83 vs 0.79 | Fuller CW et al. BJSM 2007;41(S1):i20 (PMC2465254) | MEASURED | [TOOL-FT] |
| 4.11 | Slide-in tackle injury rates (women) | abrasion/laceration 0.9 (tackled) / 0.5 (tackler); contusion 12.4 / 3.7 per 1000 tackles | Tscholl P et al. 2007 | MEASURED | [SEC: van den Eijnde 2014] |
| 4.12 | Slider's own injuries (video) | MCL: "sliding" 9/37, knee flexion 110°, valgus, foot ER; ankle: "sliding" 7/140, all high-ankle, toe catches the ground | Buckthorpe 2021, 2025 (see 1.9–1.10) | MEASURED | [FT] |
| 4.13 | Baseball/softball analogue | 9.51 injuries/1000 slides; baseball feet-first 7.31 vs head-first 3.53; fixed vs breakaway bases 45 vs 2 injuries (627 vs 633 games) | Hosey RG, Puffer JC. AJSM 2000;28:360; Janda DH et al. JAMA 1988;259:1848 | MEASURED | [ABS] |

**DERIVED (B + me), 75 kg player, BW = 736 N.** Knee contact: 2.3 kN over a 30 ms half-sine at 2.4 m/s implies m_eff ≈ F/(v·π/T) ≈ 9 kg and k ≈ m_eff(π/T)² ≈ 100 kN/m (knee + turf); impulse 19–44 N·s. Hip: F = v√(k·m) with the 4.5 rig values gives 2.3–3.4 kN at 2.5 m/s and 3.2–4.6 kN at 3.4 m/s, duration π√(m/k) ≈ 63–91 ms — the same band as the measured 2.9–5.0 kN.
**Not found:** young-adult patellar fracture loads; kneeling/tibial-tubercle impact tolerance; hip-pointer (iliac crest) data.

---

## Q5. Protective arm responses

**Answer.** Arm muscles switch on ≈100–126 ms after a perturbation; hands reach the ground ≈370–680 ms after it (pelvis ≈715 ms), ≈40–50 ms before the pelvis (round 1). Peak hand loads are 0.55–0.95 BW per hand in moderate falls (up to 1.7 BW in round 1), and 1 kN on a rigid floor. The arm can absorb only ≈40 J — it shares, not stops, a 300–400 J fall. Elbow flexion at impact lowers the first peak. In football, 22/37 shoulder dislocations came from catching a fall, 14 % of those while sliding, elbow flexed in 91 %.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 5.1 | Deltoid EMG onset | 100 ms young (+20–30 ms elderly) | Allum JH et al. J Physiol 2002;542:643 | MEASURED | [ABS] |
| 5.2 | Reach-to-grasp / handrail reach onset | 80–140 ms; +15–74 ms if target unpredictable | Ghafouri M et al. Exp Brain Res 2004; Weaver TB et al. Clin Neurophysiol 2012 | MEASURED | [ABS] |
| 5.3 | Forward release, arms only (n = 14) | biceps/triceps onset 120 ± 18 / 126 ± 17 ms; hand contact 368 / 459 / 521 / 575 ms at 26 / 39 / 46 / 52° lean; co-activation ≈100 ms before impact; peak hand GRF 55–72 %BW; elbow 100–131° at impact | Borrelli J, Creath R, Rogers MW. J Biomech 2020;99:109569 (PMC7054927) | MEASURED | [TOOL-FT] |
| 5.4 | Real falls from standing (mattress translation) | wrist contact 680 ± 116 ms, pelvis 715 ± 160 ms after perturbation | Hsiao & Robinovitch 1998, via Robinovitch SN et al. J Gerontol A 2005;60:1553 | MEASURED | [SEC] |
| 5.5 | Hand movement time, thigh → shoulder height | ≈279 ms (young) | DeGoede KM et al. J Gerontol A 2001 | MEASURED | [ABS] |
| 5.6 | Kneeling forward fall | peak hand force 92–94 %BW; contact → peak 25–28 ms | Troy KL, Grabiner MD. Clin Biomech 2007 (PMC2099579) | MEASURED | [TOOL-FT] |
| 5.7 | Torso release onto rigid floor / sand | 1039 N / 864 N | Choi WJ, Kaur H, Robinovitch SN. J Appl Biomech 2014 | MEASURED | [ABS] |
| 5.8 | Elbow flexing at impact | lowers and delays the first peak; straight elbow +68 % ML elbow shear | Chou PH et al. Clin Biomech 2001 | MEASURED | [ABS] |
| 5.9 | Energy one arm absorbs | 3.1 ± 0.4 % of BW × height (≈41 J for 75 kg, 1.80 m — DERIVED) | Sran MM et al. J Gerontol A 2010 | MEASURED | [ABS] |
| 5.10 | Reflexive (unexpected) vs self-initiated falls, older adults | 10–15× higher peak force, 2–3× shorter braking | Kim KJ, Ashton-Miller JA. Clin Biomech 2003 | MEASURED | [ABS] |
| 5.11 | 75 kg lateral-fall model with arm | wrist 473–1410 N, elbow 467–1885 N; delay > 200 ms raised severity ≥ 70 % | Lo & Ashton-Miller 2008 | MODEL | [TOOL-FT] |
| 5.12 | Football shoulder dislocations | 22/37 "catching a fall" (32 % after tackling, 14 % while sliding); elbow flexed 91 %; shoulder abducted > 90° in 55 % | Schneider KN et al. J Exp Orthop 2024 (PMC11656221) | MEASURED (video) | [FT] (results text swaps the type counts; abstract and table agree on 22) |

---

## Q6. Receiver (tackled player)

**Answer.** No football study measures time from slide contact to the receiver's ground impact, or the fraction of slide tackles that floor the opponent (match analyses score only tactical success, fouls and injury risk). Lab proxies: slip onset → fall 0.35–0.43 s; perturbation → hand 0.37–0.68 s, pelvis ≈0.72 s; compensatory step ≈300 ms; lateral waist pulls in young adults → one sidestep with the limb the pull loaded. Free fall of the COM from 1.0 to 0.2 m takes ≥0.40 s (DERIVED), so a receiver should reach the ground ≈0.4–0.7 s after the sweep, with arms active from ≈0.1 s.

| # | Finding | Value | Source | Kind | Check |
|---|---|---|---|---|---|
| 6.1 | Sliding tackles per team-game (2006 World Cup group winners) | 17–23 | Sekine S, Ogawa K, Nakatsuka Y. Football Science 2009;6:7–16 | MEASURED | [FT] |
| 6.2 | Sliding-tackle "success" (tactical: block, interception, dribble cut, delay) | 60–79 % per team; opponent falls **not recorded** | same | MEASURED | [FT] |
| 6.3 | Women's sliding-in tackles: direction; fouls; cards; risk | side 257 / behind 82 / front 71 of 410; foul 15.6–35.4 %; yellow 3.4 % vs 1 %; injury-risk situations 5 % vs 2 % | Tscholl 2007 (PMC2465246) | MEASURED | [TOOL-FT] |
| 6.4 | Support state of injured, tackled players | 78 % single support, 87 % injured leg loaded; ankle contact at foot strike | Buckthorpe 2025; Andersen 2004 (SUPPORT-1 §8) | MEASURED | [FT]/[ABS] |
| 6.5 | Fall likelihood vs direction | > 2× more falls after anterior translation of the feet; lateral perturbations → trunk rotation that avoids lateral hip impact | Hsiao ET, Robinovitch SN. J Biomech 1998 | MEASURED | [ABS] |
| 6.6 | Fall direction vs speed | fast gait: slips → forward falls, frontal impact; slow gait: sideways/backward onto hip/buttock | Smeesters C et al. J Biomech 2001 | MEASURED | [ABS] |
| 6.7 | Slip onset → fall (harness threshold) | 0.43 ± 0.21 / 0.36 ± 0.19 / 0.35 ± 0.14 s at 0.5 / 1 / 2 × walking speed; 76 % fell | Lee C, Ahn J, Lee BC. Sci Rep 2025 (PMC11814418) | MEASURED | [FT] |
| 6.8 | Compensatory step after a slip | ≈300 ms (fallers and non-fallers) | cited in Lee 2025 | MEASURED | [SEC] |
| 6.9 | Lateral waist pull, young adults | mostly one sidestep with the limb loaded by the pull; uncertainty delays the step 100–300 ms | Mille ML et al. Clin Biomech 2005; Rogers MW et al. Cogn Brain Res 2003 | MEASURED | [ABS] |
| 6.10 | Genuine vs simulated falls | genuine: arms go down to cushion or out to the side; both arms above the shoulders ("archer's bow") marks a dive | Morris PH, Lewis D. J Nonverbal Behav 2010;34:1 | ASSERTION | [SEC: press release] |
| 6.11 | Judo foot sweep (osoto-gari), thrown player | head peak 10.3 ± 1.6 g with breakfall, peaking when the arm meets the mat | Murayama H et al. Neurol Med Chir 2020 | MEASURED (n = 1) | [ABS] |

---

## Q7. Physics-based character animation and robotics

**Answer.** No peer-reviewed paper simulates a slide tackle. Relevant practice: (i) contacting limbs become **dampers** (kp = 0) at landing (Ha 2012) or get **instant PD-gain reduction** at impact (Samy & Kheddar 2015; Zordan & Hodgins 2002); (ii) learned falls choose the **next contact body** to minimise peak impulse (Kumar 2017) or plan a contact sequence (Ha & Liu 2015; Yun & Goswami "tripod"); (iii) **soft contact layers** keep more contacts and spread pressure (Jain & Liu 2011); (iv) common RL humanoids use **one μ ≈ 0.8–1.0 for every body part** and call any non-foot contact a fall; (v) region-specific pair friction appears only in injury multibody/FE models.

| # | Work | Concrete parameters | Source | Kind | Check |
|---|---|---|---|---|---|
| 7.1 | Ha, Ye, Liu 2012 (falling/landing) | contact limbs kp = 0, ki = 50; landing target COM 0.4 m with zero vertical speed at end of compression; forward 4.0 m/s; roll gain 800, ω_max 3.3 rad/s; virtual force ≤ 3000 N; 59 kg, ODE 0.2 ms; **μ not reported**; on "icy" ground it still rolls but cannot stand | ACM TOG 31(6):195 | DESIGN CHOICE | [FT] |
| 7.2 | Kumar, Ha, Liu 2017 (safe falling) | reward 1/(1 + j), j = \|ẏ⁻\| / (1/M + d²/I); one actor-critic per candidate contact body, critic picks next contact | IROS 2017, arXiv:1703.02905 | MODEL | [FT] |
| 7.3 | Jain & Liu 2011 (soft contacts) | mass-spring soft layer coupled by LCP; rigid character "tends to lose contact easily"; soft one keeps more contacts, "more evenly distributed pressure" | ACM TOG 30(6):163 | DESIGN CHOICE | [FT] |
| 7.4 | Faloutsos et al. 2001 | composable protective-step / fall / roll / get-up controllers with pre- and post-conditions; fall controller absorbs the shock "using mostly the hands" | SIGGRAPH 2001 | DESIGN CHOICE | [FT] |
| 7.5 | Zordan & Hodgins 2002; Zordan et al. 2005 | impact → "changing stiffness and damping terms", then return to tracking; or simulate, then search for a mocap re-entry | SCA 2002; TOG 24(3) | DESIGN CHOICE | [ABS] |
| 7.6 | Samy & Kheddar 2015; Samy et al. 2017 | "instant PD gains reduction" at impact; later a QP choosing per-joint K, B under torque and friction-cone limits (HRP-4) | Humanoids 2015; ICRA 2017 (hal-01365108) | DESIGN CHOICE | [ABS]/[FT] |
| 7.7 | ASE (Peng et al. 2022); PHC (Luo et al. 2023) | fall = any non-foot ground contact; 10 % of episodes start fallen; pushes 500–1000 N × 0.5 s; hand-breaking of falls emerged | TOG 41(4) (arXiv:2205.01906); arXiv:2305.06456 | DESIGN CHOICE | [FT] |
| 7.8 | Whole-body μ in public RL humanoids | Isaac Gym AMP: plane and body μ 1.0 (×0.7–1.3 randomised); dm_control: body 0.7 (max rule with floor); DeepMimic: 0.9 × 0.9 = 0.81 (Bullet product) | IsaacGymEnvs, dm_control, DeepMimic code | DESIGN CHOICE | [FT code] |
| 7.9 | Region-specific pair friction in injury models | VRU–ground 0.58, VRU–vehicle 0.2; THUMS feet–ground 0.6, body–vehicle 0.3; shoe–floor 0.49 (swept to 0.85) | Wu H et al. 2021 (PMC8261157); Wang JM et al. 2024 (PMC11357787); Peng Y et al. 2018 (PMC6139236) | DESIGN CHOICE | [FT] |
| 7.10 | Lo & Ashton-Miller 2008 contact law | region-specific stiffness: bony 10 MN/m³ vs soft 3.5 MN/m³ (2.9×); 306 J dissipated in ≈150 ms (Free strategy) | J Biomech 2008 | MODEL | [TOOL-FT] |
| 7.11 | Skating | blade as a non-holonomic (anisotropic) contact | Yu R, Park H, Lee J. CGF 2019 | DESIGN CHOICE | [ABS] |

Whole-body angular momentum: round 1 Q4 (Herr & Popovic; Pijnappels; Ha 2012 "blocking" uses landing friction to steer momentum into a roll). Nothing new and quantitative was found for falls.

---

## Design implications for a simulated slide tackle (75–80 kg, 4.5–5.5 m/s entry)

Everything below is DESIGN CHOICE or DERIVED unless a row number points to a MEASURED value.

**D1. Expected sequence and timing (validation targets).**
1. Plant step ≈0.35–0.5 s (1.8). Free fall is short in the sliding-in technique, from near hip height in the jumping one (1.1).
2. **First contact: lateral knee / proximal lateral shank of the bent under-leg** (1.1–1.6). Peak 1.0–1.3 kN sliding-in, ≤2.3 kN jumping; ≈30 ± 5 ms; effective mass ≈9 kg (Q4 DERIVED).
3. **Second: lateral thigh / greater trochanter / buttock**, 2.9–5.0 kN, ending the 0.15–0.16 s impact window; Δv_h ≈0.8–1.5 m/s lost; ≈0.6–0.7 m travelled (Q1).
4. **Glide on lateral thigh + hip (+ lateral shank)** at ≈1 BW total normal load. The extended leg's heel is unloaded or skims; the under-foot is turned so its studs do not engage (1.5, 1.9). The hand is optional and unmeasured.
5. Whole slide (first contact → stop) **≈0.8–1.2 s and ≈1.5–3 m** (2.2, D3).
6. Red flags (real injury mechanisms, 1.9–1.10): the plant foot stays loaded while the pelvis passes it (knee flexion ≈110°, valgus, foot external rotation); the under-foot's toe catches.

**D2. Friction per body region.** Physically standard: friction is a property of the material pair, and studs add a ploughing term only when they penetrate (3.4–3.5). Injury multibody models already use pair-specific μ (7.9). Public RL humanoids do not: they use one μ of 0.8–1.0 (7.8).

| Region (contact geom) | μ_kinetic (μ_static) | Justification | Kind |
|---|---|---|---|
| Boot sole, studs engaged (flat, loaded, roll ≲ 5–7.5°, pitch ≲ 20°) | 1.0–1.5, load-dependent (keep current ≈1.2) | available 0.9–1.6 at BW loads (SUPPORT-1); used 0.4–0.8 | DESIGN CHOICE from MEASURED |
| Boot heel-only, toe-only, or edge-on (beyond the roll/pitch above) | **0.6–0.9** | flat plate 0.70, 1 stud ≈1.0 (3.4–3.5); "slides over the surface" beyond ≈5–7.5° (3.3); heel-only "significantly less" (3.1) | ASSUMED (bracketed) |
| Boot upper / side | 0.5–0.6 | no data; smooth material on fibres | ASSUMED |
| Kit: lateral thigh, hip, buttock, trunk (shorts, shirt) | **0.45 (0.55)**; tune within 0.35–0.55 | hip H/V 0.37–0.46 (2.3); "< 1 s" slide needs 0.3–0.55 (2.2, Q2 DERIVED); Securisport 0.57 is an upper bound; knee-form 0.2 a lower bound | DESIGN CHOICE |
| Sock/skin: knee, shank, forearm | **0.55 (0.65)** | Securisport skin 0.57; dry skin 0.57 ± 0.32 (2.9); knee H/V 0.59–0.64 at impact (2.3) | DESIGN CHOICE |
| Hands | 0.6 | dry skin; no turf data | ASSUMED |
| Natural grass | same as 3G | no NG value exists; Searle 0.66–0.79 includes tumbling (upper-biased) | DESIGN CHOICE (flag as untested) |
| Wet turf | kit/skin × 0.8 | wetting cuts frictional heating ≈4× on 3G (2.13), but wet skin on smooth solids is *higher* (2.9) — the sign is unproven | ASSUMED |

Make μ depend on load only for the boot (sub-linear, SUPPORT-1); Coulomb is adequate for kit and skin (2.9–2.10), with a small static excess. **Engine combine rules dominate** (3.9):
- **MuJoCo** takes the element-wise max of the two geoms' μ. Set turf μ ≤ the lowest body μ (so the max returns each body region's value), or give body geoms higher `priority`, or use explicit `<pair>` contacts.
- **Bullet** multiplies: set turf μ = 1.0 and per-body μ = the target values.
- **PhysX/Rapier** average by default: switch to MIN/MAX combine or set per-pair values.

**D3. Expected deceleration and distance.** Impact phase: Δv_h 0.8–1.5 m/s over ≈0.15 s (mean 5–10 m/s²). Glide: a = μ·g (3.4 / 4.4 / 5.9 m/s² at μ 0.35 / 0.45 / 0.6). Glide distance and duration after the impact loss:

| Entry speed | μ = 0.35 | μ = 0.45 (nominal) | μ = 0.6 |
|---|---|---|---|
| 4.5 m/s | 1.3–2.0 m, 0.87–1.08 s | 1.0–1.6 m, 0.68–0.84 s | 0.8–1.2 m, 0.51–0.63 s |
| 5.0 m/s | 1.8–2.6 m, 1.02–1.22 s | 1.4–2.0 m, 0.79–0.95 s | 1.0–1.5 m, 0.59–0.71 s |
| 5.5 m/s | 2.3–3.2 m, 1.16–1.37 s | 1.8–2.5 m, 0.91–1.06 s | 1.4–1.9 m, 0.68–0.80 s |

Add ≈0.6–0.7 m and 0.15 s for the impact phase. At these entry speeds, a glide longer than ≈3.2 m / 1.4 s or shorter than ≈0.8 m / 0.5 s means the effective μ is outside every bracket in Q2.

**D4. Knee and hip load limits (per contact, 75–80 kg).**

| Level | Knee peak | Knee duration / impulse | Hip / lateral thigh peak |
|---|---|---|---|
| Target (sliding-in) | ≤ 1.3 kN (≈1.7–1.8 BW) | 20–40 ms, ≤ 45 N·s | 2.9–3.5 kN |
| Upper realistic (jumping technique) | ≤ 2.5 kN (measured 2.3 ± 0.4) | — | ≤ 5 kN |
| Flag as pathological | ≥ 3.5 kN (lowest mean cadaver fracture, oblique, 4.2) | knee still carrying load > 80 ms after contact | ≥ 6 kN; ≥ 110 N/cm² over the patch ≈ contusion (4.8) |
| Hard fail | ≥ 5 kN (occult damage / fracture onset, 4.1–4.3) | — | ≥ 7 kN (young-femur fall strength, UNVERIFIED) |

Knee-first is normal in football slides (1.1). It becomes pathological when the knee, rather than the thigh/hip, must arrest the vertical momentum: knee impulse ≫ 45 N·s, or the hip contact delayed beyond ≈100 ms. Baseball coaching explicitly avoids knee-first (1.5).

**D5. Contact compliance.**
- **Turf:** FIFA limits (SA 57–68 %, VD 4–11 mm, 20 kg AAA, 70 mm foot) imply a secant stiffness of ≈0.2–0.7 MN/m under the foot (DERIVED: F = 6760·(1 − SA) over VD).
- **Body:** the turf is stiffer than the hip soft tissue (146–232 kN/m, 4.6) and the whole-body hip rig (39–55 kN/m, 4.5), so most impact compliance belongs on the body side. Use bony sites ≈3× stiffer than soft sites (1.7). Hip impact should last ≈60–90 ms (Q4 DERIVED).
- Soft or multi-point contact patches keep contact and spread pressure (7.3). Lesion-sized patches are knee ≈20–40 cm² and hip ≈55 cm² (4.9).

**D6. Arms, receiver, controller.**
- **Arm response:** onset no earlier than ≈100 ms after a trigger (5.1–5.3). Hand ≤ 1 BW, elbow flexing at impact (5.6–5.8). The arm absorbs ≈40 J, so it can only share the load (5.9).
- **Receiver after a sweep:** pelvis/hip to the ground ≈0.4–0.7 s later; arms active from ≈0.1 s; a protective step needs ≥ 0.3 s (6.7–6.9). It falls forward when moving fast (6.6).
- **Controller patterns:**
  - Contact limbs become dampers at landing (kp → 0; 7.1), or get an instant gain drop at impact (7.6).
  - Choose the next contact body to minimise peak impulse (7.2).
  - AMP/ASE-style "non-foot contact = fall" detectors must whitelist knee, shank, thigh and hip during a slide (7.7).

---

## Gaps that limit the design (all NOT FOUND after two rounds)
Whole-body glide deceleration or distance on any surface; any skin/kit/body μ on natural grass; kit-fabric (polyester, socks, sliding shorts) μ on turf; velocity dependence of skin–turf μ at m/s; heel or edge boot TC as numbers; load under the extended leg's heel or the hand during a slide; time from slide contact to the receiver's ground impact, and the fraction of slides that floor the opponent; young-adult patellar and tibial-tubercle impact tolerance.

**Opened in full this round (main + sub-agents):** van den Eijnde thesis (re-read), Buckthorpe 2021 and 2025, Hanson & Hsieh 2015, Ficklin 2016, MacFarlane 2024, Tay 2016 thesis, Verhelst 2009, Derler & Gerhardt 2012, Webb 2017 and Driscoll 2012 theses, FIFA Handbook of Requirements 2015, FMVSS 208, Ha 2012, Kumar 2017, Jain & Liu 2011, Faloutsos 2001, ASE, PHC, Lee 2025, Sekine 2009, Schneider 2024, Yamaguchi 2004, engine sources and docs. **Abstract-level only:** the cadaver knee and hip tolerance papers, the arm-latency papers, Hosey/Kane/Camp, Kuhlman, Allum, Hsiao 1998.

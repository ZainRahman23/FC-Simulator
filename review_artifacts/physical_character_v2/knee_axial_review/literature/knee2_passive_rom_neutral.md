# Knee axial rotation, passive: ROM at defined torques, deep flexion, coupled/neutral path, screw-home (verify + extend lit2)

Date: 2026-10-04. Scope: passive tibiofemoral internal/external (IR/ER) rotation only. This report builds on `lit2_knee_axial.md` and does not repeat it, except where I re-checked or corrected a number.

## Tags

- **[FT]**: I read the full text myself (Europe PMC / NCBI XML, or a PDF; for scanned pages I read the page images).
- **[FT-sum]**: full text, but the numbers came through the WebFetch summariser, which may drop detail.
- **[ABS]**: PubMed abstract only.
- **[SEC: X]**: the number is quoted or digitised in source X, which I read. I did not read the primary paper.
- **[FIG: X]**: I read the value off a figure in X. Reading error is about ±1° on curves and ±2° on small plots.
- **[DERIVED]**: my own arithmetic or synthesis. The method is stated each time.
- **[SNIP]**: search-engine snippet only. Weak.
- **[RECALLED — unverified]**: from memory.

Conventions: IR = tibial internal rotation relative to the femur, ER = external. "Total" = IR + ER. "From neutral" means measured from the zero-torque position at that flexion angle. "Absolute" means measured from a fixed bone frame, usually the tibial orientation at full extension.

Extra data saved locally (raw data I extracted):
- Seiferheld 2026 supplementary tables S2 (161 cadaver studies, per-study digitised means) and S4 (pooled): `scratchpad/lit/k2/supp/`.
- The internal/external records I pulled from S2: `k2/supp/ie_recs.json`.
- Blankevoort 1988 page images: `k2/b88/`.

---

## 0. What is new or corrected relative to lit2

1. **Blankevoort 1988 is now read** [FT; values from FIG]. This is the cadaver envelope at ±3 N·m measured by roentgen stereophotogrammetry (RSA) on 4 knees with the skin left intact. It shows:
   - The IR limit (absolute) rises from about 8° at 0° flexion to 17–23° at 20° and 22–33° at 90°.
   - The ER limit rises from about 6–10° at 0° to 11–18° at 20° and 16.5–21.5° at 90°.
   - Mean total is about 17° at 0° and about 45° at 90–95° [DERIVED].
   - The midpoint of the envelope shifts internally by only about 3–4° by 90° [DERIVED].
   - Doubling the torque from ±3 to ±6 N·m adds only about 3.5–5° per direction.
   - At 25° flexion about 20° of the range is a near-zero-stiffness "free zone" (Fig. 4).
   - Screw-home is explicitly load-dependent, not obligatory.
2. **A 161-study pooled cadaver dataset (Seiferheld 2026) answers "what happens at 120°".** At ±5 N·m:
   - IR is 9.4° at 0°, 17.0° at 15°, 19.1° at 30°, 18.8° at 60°, 17.8° at 90° and 17.7° at 120°.
   - ER is 10.9°, 17.3°, 17.0°, 17.8°, 18.1° and 20.2° at the same angles [FT].
   - **The plateau extends at least to 120°.** Lit2 had it only to about 100°.
3. **Deep flexion (130–160°): the first evidence of a narrowing envelope.**
   - In vivo, the activity-dependent spread in rotation is about 20° at 90–110° but only about 2.5° at 150° (Kono 2018: squat vs kneel vs cross-legged) [FIG/DERIVED].
   - In cadavers, Li 2004 found the knee "highly constrained" at 150° [ABS].
   - Three cadaver knees at ±3 N·m lost about 10–20° of total laxity between about 120° and 135–140° (van Kampen 1986/87, plotted by Blankevoort) [FIG].
   - **Against narrowing:** Markolf 1976 (35 knees) found about the same total free laxity at 135° as at 45–90°, roughly 25° [FIG/SEC].
   - **No in vivo torque-defined data exist beyond about 120°.**
4. **The lit2 value "neutral ≈30° IR at 150°" is the top of the range.** Hamai 2013's 30° is an absolute angle in a cylindrical-axis frame; the change over 85→150° was 15° [FT]. Across in vivo weight-bearing studies, coupled IR from extension to about 145–150° is 15–29° (mean of study means about 22°). Passive cadaver paths give 7–20°. **Use about 20° (range 11–30°).**
5. **In vivo bone-level ranges are about 0.65–0.8× cadaver ranges at the same torque** [DERIVED]. Example at about 5 N·m:
   - 0°: 16° in vivo vs 20° cadaver.
   - 30°: 23° vs 36°.
   - 90°: 26° in vivo at 6 N·m vs 36° cadaver at 5 N·m.
6. **The ratio of full-extension range to mid-flexion range depends on torque** [DERIVED]:
   - About 0.3–0.4 at ≤3 N·m (Roth 0.31, Arnout 0.31, Blankevoort 0.39).
   - About 0.55–0.7 at 5 N·m (pooled cadaver 0.55, in vivo Hemmerich 0.70).
   - This refines lit2's single figure of 0.4–0.7.
7. **Markolf 1976 "8 N·m" values are total free laxities, not IR at 8 N·m.** Blankevoort states Markolf defined each limit at the intersection of the neutral and terminal (±8 N·m) stiffness tangents, which falls at about 0.5–2 N·m. The 2026 scoping review codes them as "IR at 8 N·m" [FT Blankevoort text], which is misleading.
8. **The choice of flexion axis alone changes reported coupled IR by about 9–13° at 90–150°.** The transepicondylar axis (TEA) and the geometric centre axis (GCA) differ by 4.0 ± 0.8° (Most 2004) [ABS]. This is a major reason imaging studies disagree.
9. **Screw-home magnitude in bone-level, weight-bearing or active studies is about 5–15°** over the last 20–40° of extension, with large between-subject SD. It was not seen during the stance phase of walking with bone pins (Lafortune 1992) [ABS].
10. **Minor correction:** Moewis 2016 recruited 13 patients and tested their healthy contralateral knees at the first session; 9 completed all sessions [FT]. Lit2 gave n=9.

---

## (a) Results table: passive IR/ER at defined torques

Grouped by measurement level. Values are mean (± SD) where available. Totals marked [DERIVED] are my sums of IR and ER means.

### A1. In vivo, bone-level (best for a tibiofemoral degree of freedom in a living athlete)

| Source | Method | n | Flexion | Torque / load | IR° | ER° | Total° | Neutral / coupled | Tag | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| Moewis 2016, PLoS One, doi:10.1371/journal.pone.0159600 | Fluoroscopy + CT models; seated, relaxed rotometer | 13 healthy contralateral knees | 30° | ±2.5 N·m | 3.7 ± 1.4 | 7.6 ± 3.5 | 11.3 [DERIVED] | Zero-torque position about 6–8° ER of device zero; clear hysteresis; laxity measured from each subject's zero-torque position | FT | Mod–high |
| (same) | (same) | (same) | 90° | ±2.5 N·m | 4.0 ± 2.0 | 10.0 ± 3.1 | 14.0 [DERIVED] | (same) | FT | Mod–high |
| Hemmerich 2011 (via Zee 2020 Table 1), doi:10.1177/0363546510379333 | MRI + torsion device | intact knees: M and F groups | 0° | ~5 N·m | 9.6 ± 4.3 (M); 9.5 ± 2.7 (F) | 6.2 ± 3.0 (M); 7.0 ± 2.6 (F) | 15.8 (M); 16.5 (F) | — | SEC: Zee 2020 | Mod–high |
| (same) | (same) | (same) | 30° | ~5 N·m | 8.9 ± 4.8 (M); 8.8 ± 3.7 (F) | 14.6 ± 5.6 (M); 13.9 ± 4.7 (F) | 23.5 (M); 22.7 (F) | — | SEC: Zee 2020 | Mod–high |
| Nordt 1999, doi:10.1177/03635465990270051101 | CT | 21 uninjured | 20° | 5 N·m | 10.8 | 7.4 | 18.2 | — | SEC: Zee 2020 | Mod |
| Haughom 2012 (KSSTA; DOI not verified) | 3T MRI | intact groups (2 table rows) | 15° | 3.35 N·m + 44 N axial | NR | NR | 8.3 ± 3.6; 7.7 ± 5.6; second set 13.6 ± 4.7; 10.0 ± 4.3 | — | SEC: Zee 2020 | Low–mod (row labels ambiguous) |
| Almquist 2002, doi:10.1016/S0736-0266(01)00148-6 | RSA (bone markers) | 5 | 90° | 6 N·m | 10 | 16 | 26 | Device (foot) read 21 / 27 | SEC: Tsai 2008 [FT] | Mod (n=5) |
| CAS under anaesthesia (Lee; Christino), via Zee 2020 | Navigation, bone-fixed | ACL-reconstructed knees (not intact) | 0 / 30 / 60 / 90° | manual maximum | e.g. Lee SB: 8.3 / 13.7 / 14.4 / 11.3 | 6.5 / 12.8 / 13.3 / 13.3 | 14.8–16.7 / 24.0–31.6 / 25.1–28.7 / 23.7–24.7 | — | SEC: Zee 2020 | Low–mod (useful for trend) |
| Shoemaker & Markolf 1982, PMID 7056775 | In vivo; measurement level unclear (tibial vs foot) | 20 | 20° (hip flexed / extended), 90° | ±10 N·m | — | — | ≈33 (20°, hip flexed); ≈41 (20°, hip extended); ≈48 (90°) | — | FIG: Blankevoort 1988 Fig. 16 | Low (level unclear) |

### A2. In vivo, foot or boot level (for comparison only; about 2× bone level)

| Source | Method | n | Flexion | Torque | IR° | ER° | Total° | Tag | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Mouton 2015, doi:10.1007/s00167-014-3244-6 | Rotameter, ski boot, prone; start = natural resting position | 65 (104 for regression) | not stated in the text I read (typically 30° [RECALLED — unverified]) | 5 N·m | 20.6 ± 6.1 | 30.0 ± 9.5 | 50.7 ± 14.8 | FT | High as foot-level |

- Mouton's regression: total at 5 N·m = 83.8 + 10.0·(female) − 0.6·(mass in kg); IR = 32.7 + 3.7·F − 0.2·mass; ER = 51.1 + 6.4·F − 0.3·mass [FT].
- For a 78 kg man this gives total ≈37°, IR ≈17°, ER ≈28° at foot level [DERIVED]. With the ×0.5 foot-to-tibia factor from lit2, that is about 18–19° at bone level [DERIVED, low].

### A3. Cadaver, bone-fixed tracking (robots, RSA, optical, electromagnetic)

| Source | Method | n | Flexion | Torque | IR° | ER° | Total° | Neutral / notes | Tag | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **Blankevoort 1988**, J Biomech 21:705, doi:10.1016/0021-9290(88)90280-1 (PDF: pure.tue.nl/ws/files/2305657/585371.pdf) | 6-DOF rig, RSA; skin and soft tissue left on; limits are absolute (zero = extension) | 4 (ages 43–74) | 0° | ±3 N·m | ≈8 (3.5–13) | ≈6–10.5 | 10.5–25.5 (mean ≈17) [DERIVED] | Unloaded path inconsistent between knees | FIG: Figs. 5, 7 | High (shape); mod (values) |
| (same) | (same) | (same) | ≈20° | ±3 | 17–23 | 11–18 | 30–42 (mean ≈35) | — | FIG | (same) |
| (same) | (same) | (same) | 30–35° | ±3 | 21–26.5 | 11–20 | 34–47 (mean ≈40) | — | FIG | (same) |
| (same) | (same) | (same) | 60° | ±3 | 21–30 | 12.5–20.5 | 36.5–50.5 (mean ≈42) | — | FIG | (same) |
| (same) | (same) | (same) | 90–95° | ±3 | 22.5–33 | 16.5–21.5 | 39.5–53 (mean ≈45) | Envelope midpoint ≈2–7° IR (mean ≈3.6) [DERIVED]; zero-torque path under 300 N axial ≈14–26° IR (mean ≈19) [FIG Fig. 10] | FIG | (same) |
| (same) | (same) | knees 3 and 4 | 20°, 90° | ±3 → ±6 | +3.5 to +5 | +3 to +6 | ≈+8 | ≈0.7 N·m/° per direction at the end-range [DERIVED] | FIG: Fig. 6 | Mod |
| (same) | (same) | knee 4 | ≈ −4° (hyperextension) | ±3 | ≈3.5 | ≈6 | ≈9.5 | Range narrows further in hyperextension | FIG: Fig. 5 | Low (1 knee) |
| **Roth, Howell & Hull 2015**, JBJS 97:1678, doi:10.2106/JBJS.N.01256 | 6-DOF load system; intact menisci, cartilage, ligaments | 10 | 0° | ±3 N·m | 4.6 ± 1.4 | 4.4 ± 1.7 | 9.0 | — | SEC: Seiferheld S2; matches the abstract's 45°−0° and 90°−0° differences | High |
| (same) | (same) | (same) | 45° | ±3 | 14.8 ± 3.0 | 14.4 ± 2.7 | 29.2 | — | SEC + ABS | High |
| (same) | (same) | (same) | 90° | ±3 | 14.6 ± 5.5 | 14.5 ± 3.8 | 29.1 | — | SEC + ABS | High |
| Roth, Hull & Howell 2015, JOR, doi:10.1002/jor.22926 | (same system) | 10 | 0–120° every 15° | ±3 | — | — | — | Between-knee range of I-E limits > 3.6° at 15–120°; limits uncorrelated with other laxities | ABS | — |
| **Seiferheld 2026 pooled**, Front Bioeng Biotechnol, doi:10.3389/fbioe.2026.1741003 (PMC13038627) | 39 studies / 463 knees (IR); 31 / 387 (ER); weighted means | 82–400 knees per angle | 0 / 15 / 30 / 45 / 60 / 90 / 120° | 5 N·m | 9.4 ± 4.2 / 17.0 ± 5.8 / 19.1 ± 7.9 / 20.2 ± 7.9 / 18.8 ± 8.0 / 17.8 ± 7.8 / 17.7 ± 8.6 | 10.9 ± 4.4 / 17.3 ± 5.1 / 17.0 ± 6.2 / 17.1 ± 8.6 / 17.8 ± 7.6 / 18.1 ± 6.8 / 20.2 ± 8.1 | 20.3 / 34.2 / 36.2 / 37.3 / 36.6 / 35.9 / 37.9 [DERIVED] | Medians of study means are similar (IR 10.3 / 17.8 / 19.0 / 19.2 / 18.0 / 19.1; ER 11.6 / 17.5 / 17.5 / 18.7 / 18.6 / 19.5) [DERIVED from S2]. Study means at 30–90° range about 11–25° (outliers 4–32°) | FT (Table S4) | High (central tendency); heterogeneous |
| Lagae 2020, doi:10.1007/s00167-019-05839-y | Optical, 6-DOF rig, IR from neutral cycle | 12 | 0 / 10 / 20 / 30 / 40 / 60 / 90 / 100° | 5 N·m IR | 7.5 ± 3.0 / 11.1 / 15.1 / 18.1 / 19.5 / 19.2 / 18.0 / 17.9 ± 2.6 | — | — | — | FT (re-checked Table 2) | High |
| Kennedy 2013 (PCL part 1, AJSM) | Robot | 20 | 0 / 30 / 90 / 120° | 5 N·m | 10.4 / 17.2 / 16.5 / 18.3 | 12.2 / 17.8 / 18.0 / 19.4 | 22.6 / 35.0 / 34.5 / 37.7 [DERIVED] | 105°: IR 17.4, ER 18.9 | SEC: Seiferheld S2 | Mod–high |
| Wijdicks 2013b (AJSM) | Robot | 18 | 0 / 30 / 90 / 120° | 5 N·m | 10.7 / 18.2 / 17.5 / 19.4 | 11.8 / 17.4 / 17.9 / 19.2 | 22.5 / 35.6 / 35.4 / 38.6 [DERIVED] | — | SEC: S2 | Mod–high |
| Liu 2014 | Robot | 12 | 15 / 30 / 90 / 120° | 5 N·m | 18.5 / 21.0 / 17.8 / 16.6 | 14.7 / 17.7 / 20.6 / 23.4 | — | IR falls slightly and ER rises at 120° | SEC: S2 | Mod |
| Gupte 2003, JBJS Br, PMID 12892207 | Materials-testing machine | 8 | 0 / 30 / 90 / 120° | 5 N·m | 7.6 / 15.6 / 20.7 / 21.3 | 11 / 21.3 / 18.6 / 17.4 (110°) | — | — | SEC: S2 (+ABS) | Mod |
| Arnout 2022, KSSTA, doi:10.1007/s00167-021-06575-y | Optical, unconstrained; partial muscle and skin left | 14 | 0 / 10 / 20 / 30 / 60 / 90 / 110 / 120° | **1.5 N·m** | 4.9 / 8.7 / 10.3 / 10.5 / 10.1 / 10.9 / 10.7 / 8.9 | 3.0 / 7.4 / 10.7 / 13.3 / 15.2 / 16.0 / 17.8 / 18.1 | 7.9 / 16.0 / 20.9 / 23.7 / 25.3 / 26.9 / 28.4 / 27.0 [DERIVED] | IR ≥ ER at 0°; ER > IR from 30° on | SEC: S2 | Mod |
| Whiteside & Amador 1988 | Robot | 7 | 0 / 45 / 90° | 2 N·m | 2.7 / 16.1 / 19.7 | 7.4 / 14.8 / 18.1 | 10.1 / 30.9 / 37.8 [DERIVED] | — | SEC: S2 | Mod |
| Pedersen 2019 | Stereoradiography | 4 | 30° | 3 / 6 N·m | 10.2 (3) / 15.3 (6) | 20.3 (3) | — | IR stiffness ≈0.6 N·m/° between 3 and 6 N·m [DERIVED] | SEC: S2 | Low (n=4) |
| Musahl 2007, doi:10.1007/s00167-007-0317-9 | Cadaver, electromagnetic + boot device | NR | 0 / 30 / 60 / 90° | 6 N·m | 11.3 / 22.1 / 35.3 / 27.3 | 11.7 / 19.4 / 18.9 / 18.3 | 23.0 / 41.5 / 54.2 / 45.6 [DERIVED] (abstract: 23 → 46) | — | SEC: S2 (+ABS) | Mod |
| Goldsmith 2013 (Engebretsen co-author) | Robot | NR | 0 / 20 / 30 / 90° | 5 N·m | 11.1 / 14.5 / 16.6 / 15.3 | 11.8 / 15.5 / 16.6 / 18.6 | — | — | SEC: S2 | Mod |
| Kanamori 2000 (robot / force-moment sensor) | Robot | NR | 0 / 15 / 30 / 60 / 90° | **10 N·m IR** | 12.9 / 17.1 / 20.5 / 23.2 / 23.8 | — | — | — | SEC: S2 | Mod |
| Kanamori 2003 | Robot | NR | 0 / 30 / 90° | **10 N·m ER** | — | 18.3 / 27.9 / 26.8 | — | — | SEC: S2 | Mod |
| Ho 2009 | Robot | NR | 30 / 60° | 10 N·m | 23.1 / 16.8 | 16.8 / 16.2 | — | — | SEC: S2 | Low–mod |
| **Markolf 1976**, JBJS 58:583, PMID 946969 | Manual handlebars; "laxity" = rotation between the breakpoints of the neutral and terminal (±8 N·m) stiffness tangents, i.e. effective limit torque ≈0.5–2 N·m | 35 | 0 / 10 / 20 / 45 / 90 / **135°** | breakpoint definition | (total only) | (total only) | ≈10 / 17–19.5 / 22–24.5 / 24–26.7 / 22.5–24.3 / **25–26.2** | Stiffness maximum and laxity minimum at full extension [ABS] | FIG: Blankevoort Fig. 16 + SEC: S2 (10.1 ± 4.0, 19.5 ± 4.9, 24.5 ± 4.9, 26.7 ± 5.8, 24.3 ± 4.7, 26.2 ± 7.2; coded there as "IR 8 N·m", which is misleading) | Mod |
| van Kampen 1986 / 1987 (ORS abstract; Nijmegen thesis) | Cadaver, quadriceps loaded 100 N | 3 | to ≈140° | ±3 N·m | — | — | rising to ≈38–50 at 110–125°, then **falling to ≈28–37 at 133–138°** | — | FIG: Blankevoort Fig. 16 | Low |
| Nielsen 1984a,b (Arch Orthop Trauma Surg 103) | Cadaver | 2 (high and low laxity) | to ≈130° | ±3 N·m | — | — | ≈52 and ≈33 at 40–110°; ≈52 and **≈28 at ~128–130°** | — | FIG: Blankevoort Fig. 16 | Low |
| Wang & Walker 1974, JBJS 56:161, PMID 4812160 | Cyclic rotation machine | 27 (8 plotted) | 25° | ±0.5 N·m ("primary"); up to ±5–25 N·m | — | — | Primary laxity ≈8.5–25 (4× between specimens); total at ±5 N·m averaged 14° more than primary; 100 kg axial load cut rotation to ≈20% | — | FIG + SEC: Blankevoort; SNIP (n, load effect) | Mod |
| Hsieh & Walker 1976, PMID 946171 | Materials-testing machine | single-specimen series | 0°, 30° | 4.9 N·m ER | — | 30°: 23.9 with no compression → 21.3, 18.8, 14.4, 10.1 with increasing compression; 0°: 21.6 / 16.4 → 11 … 3.2 | — | Compression strongly reduces rotation (articular conformity) [ABS] | SEC: S2 | Low–mod (load magnitudes not extracted) |
| Li G 2004, JOR, doi:10.1016/S0736-0266(03)00118-9 | Robot | 13 | 0–150° | passive path; 400 N quadriceps; 200 N hamstrings | — | — | — | Passive-path IR rises to a maximum of **11.1 ± 6.7° at 150°**. Muscle loads change rotation only up to 120°; at 150° little effect → "highly constrained" | ABS | Mod |

---

## (b) Coupled ("passive path" or neutral) axial rotation vs flexion

Tibial IR relative to full extension, positive = internal. WB = weight-bearing, NWB = non-weight-bearing. The axis used for flexion is given where known, because it changes the numbers (see Q5).

| Source | Condition, level, axis | n | 0–30° | 60° | 90° | 120° | 140–160° | Between-subject variability | Tag |
|---|---|---|---|---|---|---|---|---|---|
| Iwaki 2000, doi:10.1302/0301-620x.82b8.10717 | Cadaver, unloaded, MRI | 6 | ≈5 by 10° ("may be obligatory"); little more to 45° | — | — | ≈20 at 110° | — | "Most if not all" suppressible by ER torque at 90° | ABS |
| Wilson 2000, doi:10.1016/s0021-9290(99)00206-7 | Cadaver, minimal-resistance rig, electromagnetic | 15 | IR with flexion in every knee | — | — | — | — | Flexing vs extending paths differ < 2°; path "very sensitive to load" | ABS |
| Blankevoort 1988 | Cadaver, RSA, fixed extension frame | 4 | unloaded: no consistent path (knee 1 stays 0 to −4°) | 300 N axial: ≈6–25 | 300 N axial: ≈14–26 (mean ≈19) | — | — | Large; alignment-sensitive | FIG: Fig. 10 |
| Li G 2004 JOR | Cadaver robot, passive path | 13 | — | — | — | — | max 11.1 ± 6.7 at 150° | SD 6.7 | ABS |
| Most 2004, doi:10.1016/j.jbiomech.2004.01.025 | Cadaver passive path; TEA vs GCA | 6 | — | — | 4.8 ± 9.4 (TEA) / 13.8 ± 10.2 (GCA) | — | 7.2 ± 5.7 (TEA) / 19.9 ± 6.9 (GCA) at 150° | SD 6–10 | ABS |
| Victor 2010, doi:10.1002/jor.21019 | Cadaver, passive | 6 | — | — | — | — | to 16 (range 12–20, SD 3.0) by about 140° | Under a simulated squat (130 N ankle + quadriceps), rotation inverted to mean 4.7° ER | ABS |
| Ishii 1997, PMID 9345219 | In vivo, intracortical pins | 5 | 10.6 ± 2.8 over 0–60° | — | — | — | — | SD 2.8 | ABS |
| Nedopil 2021 / 2023 (citing Freeman & Pinskerova 2003; Dennis 2005) | Secondary statement | — | — | — | 15–18 from extension to 90° | — | — | — | SEC: Nedopil 2021 [FT] |
| Jonsson & Kärrholm 1994, doi:10.1002/jor.1100120604 | In vivo RSA, WB step-up, contralateral normal knees | 13 | — | — | ≈20 at ≈100° (tibia rotates externally while extending) | — | — | — | ABS |
| Johal 2005, doi:10.1016/j.jbiomech.2004.02.008 | In vivo interventional MRI, WB and NWB | 10 | — | — | — | ≈20 by 120° | beyond 120° both condyles move back equally (little extra rotation) | More rotation, and earlier, with WB; flexing with the tibia held in ER reverses much of it (especially NWB) | ABS |
| Asano 2001, doi:10.1097/00003086-200107000-00023 | In vivo WB, biplanar image matching | 6 | — | — | — | 29.1 total (hyperextension → 120°) | — | — | ABS |
| **Qi 2013**, doi:10.1016/j.jbiomech.2013.03.014 | In vivo WB lunge, dual fluoroscopy, TEA | 8 knees | 6.1 ± 7.6 (FE → 30°) | — | ≈6–8 (interpolated) | 8.2 (30 → 120° adds 2.1 ± 8.2) | **15.2 ± 9.2 at 145 ± 6°** (120 → max adds 7.0 ± 6.2) | SD 6–9 | FT |
| **Hamai 2013**, PMC3591185 | In vivo WB lunge 85–150°, cylindrical axis | 5 male | — | — | — | — | 15° change over 85 → 150°; **30° absolute at 150°** (offset at extension unknown) | — | FT |
| **Kono 2018**, PMC5842511 | In vivo fluoroscopy, surgical epicondylar axis; squat / kneel / cross-legged | 8 knees (4 men) | squat 1.3 → 12.5 at 30° (≈13–14 by 40°) | squat ≈15.3; cross-legged ≈1.4 | squat ≈16.6; cross-legged ≈ −3.2 (i.e. tibial ER) | squat 17.8; kneel 9.7; cross-legged 0.7 | 150°: squat 21.8, kneel 20.3, cross-legged 19.3 (**converge**) | Activity spread ≈20° at 90–110° vs ≈2.5° at 150° [DERIVED]; SD 4–7 | FIG: Fig. 1 + FT |
| Tanifuji 2011, doi:10.1007/s00776-011-0149-9 | In vivo squat, single-plane, GCA | 20 | — | — | — | medial pivot to ≈120°, bicondylar rollback beyond | 26.1 total to maximum flexion | — | ABS |
| Leszko 2011, PMC3008894 | In vivo WB deep knee bend | 72 | Femur internally rotated at full extension (screw-home engaged) | — | — | — | 23.0–29.2 at maximum flexion (146–153°) by group; absolute range 26.5–33.6 | SD 6.8–10.3 | FT-sum |
| Dennis 2005, doi:10.1016/j.jbiomech.2004.02.042 | In vivo WB deep knee bend | 10 | — | — | — | — | lateral condyle 21.07 mm back, medial 1.94 mm → ≈22–27° IR [DERIVED, assuming 40–50 mm condyle spacing] | — | ABS |
| Nakagawa 2000, doi:10.1302/0301-620x.82b8.10718 | In vivo unloaded MRI, 90 → 162° | 20 | — | — | — | — | +≈12–15° IR from 90 → 162° [DERIVED: lateral 15 mm vs medial 4 mm back, assuming 40–50 mm spacing] | — | ABS |
| Pinskerova 2009, doi:10.1302/0301-620X.91B6.22319 | Cadaver (8) + 1 living, MRI, 120–160° | 9 | — | — | — | — | Medial condyle back 5 mm onto the posterior horn; lateral also rolls back → small rotation; at 160° the posterior horn is compressed and limits flexion | — | ABS |
| Elorza 2023, PMC10646131 | In vivo single-plane fluoroscopy, step-up and chair rise | 25 native knees | most of the rotation in the last 15–30° of extension | — | — | — | at maximum flexion: 13.1 ± 12.0 (step-up), 12.6 ± 9.5 (chair rise) | SD 9.5–12 | FT |
| Komistek 2003, doi:10.1097/01.blo.0000062384.79828.3b | In vivo, 5 activities | 5 | — | — | — | deep-flexion activities > 13° | — | gait < 5° | ABS |
| Gray 2019, doi:10.1002/jor.24226 | In vivo walking, mobile biplane X-ray | 15 | IE coupled to flexion; peak IR at peak flexion in swing | — | — | — | — | IE peak-to-peak 9.2° | ABS |
| Lafortune 1992, doi:10.1016/0021-9290(92)90254-x | In vivo walking, bone pins | 5 | "Results do not support … screw home … during gait" | — | — | — | — | — | ABS |

### Summary of coupled IR (tibial IR relative to extension) [DERIVED from the rows above]

| Flexion | Cadaver, passive / unloaded | In vivo, NWB or active | In vivo, WB | Working value |
|---|---|---|---|---|
| 10–20° | ≈5 (Iwaki) | ≈3–6 (Ishii slope) | 5–10 (Qi, Kono) | 5 |
| 30° | — | — | 6–13 | 6–8 |
| 60° | — | 10.6 (Ishii, 0–60°) | 7–15 | 10 |
| 90° | 5–14 (axis-dependent; Most); ≈19 under 300 N (Blankevoort) | 15–18 (SEC) | 7–20 (RSA ≈20 at 100°) | 12–15 |
| 120° | ≈20 at 110° (Iwaki) | — | 8–29 (Qi 8, Johal 20, Asano 29) | 15–18 |
| 145–150° | 7–20 (Li 11.1; Most 7–20; Victor 16) | ≈+12–15 extra from 90 → 162° (Nakagawa) | 15–29 (Qi 15, Kono 22, Leszko 23–29, Tanifuji 26) | ≈20 (11–30) |

Between-subject SD of coupled rotation is typically 6–9° (range 3–12°).

---

## (c) Answers to Q1–Q5

### Q1. Passive IR/ER at defined torques by flexion angle

Best values, taken from tables A1–A3. Cells give IR / ER (total) in degrees. Bone-level in vivo values are in **bold**.

| Torque | 0° | 15–20° | 30° | 45° | 60° | 90° | 120° | 130–160° |
|---|---|---|---|---|---|---|---|---|
| ±1.5 N·m (cadaver, Arnout) | 4.9 / 3.0 (7.9) | 10.3 / 10.7 (20.9) | 10.5 / 13.3 (23.7) | — | 10.1 / 15.2 (25.3) | 10.9 / 16.0 (26.9) | 8.9 / 18.1 (27.0) | no data |
| ±2–2.5 N·m | 2.7 / 7.4 (cadaver, 2 N·m) | — | **3.7 / 7.6 (11.3)** | 16.1 / 14.8 (cadaver, 2 N·m) | — | **4.0 / 10.0 (14.0)**; cadaver 2 N·m 19.7 / 18.1 | — | no data |
| ±3 N·m (cadaver) | Roth 4.6 / 4.4 (9.0); Blankevoort mean total ≈17 | Blankevoort ≈35 total | Blankevoort ≈40 | Roth 14.8 / 14.4 (29.2) | Blankevoort ≈42 | Roth 14.6 / 14.5 (29.1); Blankevoort ≈45 | Roth JOR measured; values not accessed | van Kampen ≈28–37 at 133–138° (from ≈38–50 at ≈120°); Nielsen ≈28 / ≈52 at ≈130° |
| ±3.35 N·m + 44 N, in vivo MRI (Haughom) | — | **total ≈8–14 (15°)** | — | — | — | — | — | — |
| ±5 N·m, cadaver pooled | 9.4 / 10.9 (20.3) | 17.0 / 17.3 (34.2) | 19.1 / 17.0 (36.2) | 20.2 / 17.1 (37.3) | 18.8 / 17.8 (36.6) | 17.8 / 18.1 (35.9) | 17.7 / 20.2 (37.9) | no data |
| ±5 N·m, in vivo bone (Hemmerich, Nordt) | **9.5 / 6.6 (16.2)** | **10.8 / 7.4 (18.2) at 20°** | **8.9 / 14.3 (23.1)** | — | — | — | — | — |
| ±6 N·m | cadaver 11.3 / 11.7 (Musahl) | Blankevoort IR 21–22.5 / ER 16.5–17.5 | 22.1 / 19.4 (Musahl) | — | 35.3 / 18.9 (Musahl) | **RSA 10 / 16 (26)**; Blankevoort IR 23–26 / ER 17–19.5 | — | — |
| Breakpoint "free" laxity (Markolf, ≈0.5–2 N·m) | total ≈10 | ≈22–24.5 (20°) | — | ≈24–26.7 | — | ≈22.5–24.3 | — | **≈25–26 at 135°** |
| ±10 N·m, cadaver | IR 12.9; ER 18.3 | IR 17.1 (15°) | IR 20.5 / ER 27.9 | — | IR 23.2 | IR 23.8 / ER 26.8 | — | — |
| ±10 N·m, in vivo (level unclear) | — | total ≈33–41 (20°) | — | — | — | total ≈48 | — | — |
| Manual maximum under anaesthesia, CAS (reconstructed knees) | **total 14.8–16.7** | — | **total 24–31.6** | — | **total 25–28.7** | **total 23.7–24.7** | — | — |

Points that stand out:

- **Flexion shape is robust across every torque level.**
  - Minimum at 0°.
  - About 85–95% of the plateau is already reached by 15–20° (pooled 5 N·m: IR 17.0 at 15° vs 19.1 at 30°).
  - Flat from 30° to at least 120° (pooled 5 N·m totals 35.9–37.9°) [FT/DERIVED].
  - ER tends to keep rising slightly and IR to fall slightly between 90° and 120° (Arnout; Liu; pooled ER 18.1 → 20.2) [SEC/FT].
- **Torque–angle behaviour in cadavers has a free zone, then stiffens.**
  - Blankevoort Fig. 4 (25° flexion): about 20° of near-zero-torque rotation, then about 7° more IR and about 14° more ER to reach ±3 N·m [FIG, ±2°].
  - From ±3 to ±6 N·m, only about 4° more per direction (Fig. 6) [FIG].
  - So a cadaver at ±3 N·m already sits on the stiff part of the curve. This is why ±3 N·m envelopes are reproducible while the zero-torque path is not (Blankevoort text) [FT].
- **In vivo, the knee is narrower and has a much smaller free zone.**
  - At 30–90°, 2.5 N·m gives only IR 4° / ER 8–10°, which is about 40–60% of the 5–6 N·m values (IR 9–10 / ER 14–16) [FT/SEC].
  - In vivo total at about 5 N·m is about 0.65–0.8× cadaver [DERIVED].
  - Likely reasons: passive muscle and tissue tone; intact limb with no dissection; younger tissue; and cadaver tests that strip muscles. The cadavers in these studies were mostly 40–75 years old (Blankevoort Table 1: 43–74) [FT].
- **IR/ER split.**
  - At 30–90°, in vivo ER is about 1.5–2.5× IR from neutral (Moewis; Hemmerich at 30°; RSA) [FT/SEC].
  - Cadavers measured from neutral are nearly symmetric (Roth ±3 N·m; pooled 5 N·m) [SEC/FT].
  - At 0°, in vivo IR ≥ ER (Hemmerich, Nordt), while cadaver data are mixed (Arnout IR > ER; pooled ER > IR) [SEC].
  - This asymmetry depends on where the "neutral" is placed inside the free zone (see Q5), so treat it as uncertain at 0–20°.

### Q2. Deep flexion (120–160°)

**What is measured at defined torques:**

- **At 120°** (cadaver, 5 N·m), the range equals the 90° range:
  - Pooled IR 17.7 ± 8.6 and ER 20.2 ± 8.1 (82 and 65 knees) [FT].
  - Kennedy 2013 / Wijdicks 2013 robot totals about 38° vs about 35° at 90° [SEC].
  - Arnout at 1.5 N·m: 27.0° vs 26.9° [SEC].
  - **The axial envelope does not narrow by 120°.**
- **At 130–140°**, three small or old cadaver datasets disagree:
  - Markolf 1976 (35 knees): total "free" laxity about 25–26° at 135°, the same as at 45–90° (about 22.5–26.7°) [FIG/SEC].
  - van Kampen (3 knees, ±3 N·m, quadriceps 100 N): totals fall by about 10–20° (≈ −20–30%) between about 120–125° and 133–138° [FIG].
  - Nielsen (2 knees, ±3 N·m): the low-laxity knee fell from about 33° to about 28° by about 130°; the high-laxity knee did not fall [FIG].
- **At 150°** (cadaver robot, Li 2004): the knee is "highly constrained". Muscle loads that change rotation at 0–120° have little effect at 150°. The authors attribute this to compression of posterior soft tissues (capsule, menisci, muscle, fat, skin) between tibia and femur [ABS]. Pinskerova 2009 likewise reports the medial posterior meniscal horn compressed at 160°, limiting flexion [ABS].

**In vivo (no torque-defined data, but loading varies between activities):**

- Kono 2018 [FIG Fig. 1]: femoral ER relative to the tibia at 90–110° is about 16.6–17.5° in squatting vs −2 to −3° in cross-legged sitting (the cross-legged posture loads the tibia into ER). That is a spread of about 20°, and kneeling sits in between (6.2° at 100–110°).
- At 150° the three activities converge to 19.3–21.8° (spread about 2.5°). The authors report no significant difference at maximum flexion [FT].
- **Interpretation [DERIVED]:** at about 100° roughly 20° of the axial range is reachable with physiological loading. At 145–150° the reachable range collapses to a few degrees around about 20° IR.
- Johal 2005: flexion with the tibia in ER reverses much of the coupled rotation, mainly NWB, without a stated flexion limit [ABS]. Iwaki 2000: the roughly 20° at 110° is largely suppressible [ABS].
- Kinematics also change character beyond about 120°:
  - Bicondylar rollback (Tanifuji; Johal) [ABS]; "hyperflexion is a separate arc" (Pinskerova 2009) [ABS].
  - A second burst of IR between 120° and maximum flexion (+7.0 ± 6.2°, Qi 2013) [FT].
  - 15° of femoral ER from 85 → 150° (Hamai 2013) [FT].

**Bottom line for Q2.**
- 120°: envelope about as wide as at 90° (cadaver) — **high–moderate confidence**.
- 130–150°: envelope probably narrows toward a near-single position at full flexion — **low confidence**. Evidence for: Kono convergence, Li 2004, van Kampen, Pinskerova. Evidence against: Markolf 1976.
- **No one has applied a known torque to a living knee beyond about 120°.**

### Q3. Coupled (passive-path or neutral) axial rotation, 0–160°

See table (b). Synthesis [DERIVED]:

- **0–20°:** about 5° of IR appears in the first 10–20° of flexion. This is the screw-home arc, read in reverse. Unloaded cadaver (Iwaki) and in vivo (Ishii; Kono; Qi) agree on the sign, with a magnitude of about 5–13° by 30–40°.
- **30–120°:** slow further increase of about 0–10°.
  - Qi measured +2.1 ± 8.2 over 30–120° (TEA) [FT]; Kono measured about +4 over 40–120° (squat, 14 → 17.8) [FIG].
  - Total by 90° is about 12–18° in most in vivo and secondary sources. The RSA step-up gave about 20° at 100° [ABS]. TEA-based cadaver paths are lower (about 5° at 90°, Most 2004) [ABS].
- **120–150°:** a second increase of about 5–10° (Qi +7.0; Kono +4 from 120 → 150° [FIG]; Nakagawa about +12–15 from 90 → 162° [DERIVED]). The total at 145–150° is about 15–29° in vivo WB and 7–20° in cadaver passive paths.
- **Variability:** between-subject SD about 6–9° (3–12°). Right–left and between-study differences are of the same order, so the mean curve is only approximate for any one knee.
- **The coupled path is soft, not a hard constraint.**
  - Wilson 2000 [ABS]: the femur "sprang back" when displaced, but the path is "very sensitive to load".
  - Blankevoort 1988 [FT]: a fully unloaded knee has "no single consistent motion pathway"; 300 N axial force produces internal rotation.
  - Victor 2010 [ABS]: under a simulated squat (130 N ankle + quadriceps) the tibia went to mean 4.7° ER instead of 16° IR.
  - Kono 2018 [FIG]: cross-legged sitting holds the tibia about 3° external of extension orientation at 90–100°.
  - A good working definition is therefore the **unloaded, slightly compressed zero-torque path**: about 5° at 15°, 10° at 60°, 12–15° at 90°, 15–18° at 120°, about 20° at 145–150°.
- **The envelope centre moves much less than the observed loaded path.** In Blankevoort's absolute frame the ±3 N·m midpoint moves only about +1° at 0° to about +3.6° at 90°, while the compressed zero-torque path reaches about 19° at 90° [FIG/DERIVED]. Under compression the tibia therefore rides near the IR wall of a wide cadaver envelope. In vivo the envelope is narrower, and ER from neutral exceeds IR from neutral (Moewis, Hemmerich, RSA), which is consistent with a neutral lying on the IR side of the envelope.

### Q4. Screw-home mechanism

**Magnitude and arc:**

| Source | Condition | Magnitude (tibial ER during the last part of extension) | Arc | Tag |
|---|---|---|---|---|
| Iwaki 2000 | cadaver, unloaded MRI | ≈5° "may be obligatory" | 0–10° | ABS |
| Freeman & Pinskerova 2003 | MRI review | IR coupled with flexion from full extension to 10–30° | 0–30° | ABS |
| Ishii 1997 | in vivo bone pins | 10.6 ± 2.8° | 0–60° | ABS |
| Kärrholm 1988 (via Kim 2015) | in vivo RSA, active extension | rotation ranged from 9.9° IR to 1.6° ER | active extension | SEC: Kim 2015 [FT] |
| Qi 2013 | in vivo WB lunge | 6.1 ± 7.6° | FE–30° | FT |
| Kono 2018 | in vivo squat | ≈11–13° | 0–30/40° | FIG/FT |
| Elorza 2023 | in vivo step-up / chair rise | most of ≈13° (SD 9.5–12) | last 15° (step-up) / 30° (chair rise) | FT |
| Asano 2001 | in vivo WB biplanar | 29.1° over 0–120°, interpreted as screw-home + rollback | 0–120° | ABS |
| Hallén & Lindahl 1966 | in vivo, Steinmann pins | "7–12°" over 160 → 0°; subjects could produce rotation in either direction voluntarily | 160–0° | SNIP only (paper not read) |
| Lafortune 1992 | in vivo pins, walking | not observed in gait | — | ABS |
| Gray 2019 | in vivo biplane, walking | IE peak-to-peak 9.2°, coupled to flexion | gait cycle | ABS |
| Kim 2015 | skin markers, gait | ≈17° in pre-swing and late swing; "paradoxical" 6° ER during loading response | — | FT (skin artefact; likely overestimate) |
| Jeon & Hong 2021 | IMU, unloaded | screw-home "increased abruptly during the last 20° of active extension compared with passive" | last 20° | ABS (skin-mounted IMU) |

**Is it obligatory?** No, not in the passive joint.

- Blankevoort 1988 [FT]: "In the unloaded configuration, there is no sign of an obligatory external rotation during extension, the so-called 'screw-home mechanism', at least not as a passive characteristic of the knee."
  - Small axial forces produce tibial IR, and the ligament constraints then create "a motion pathway towards external rotation in the last phase of extension".
  - Conversely, under an external torque "the knee follows a motion pathway along the external rotation envelope and creates an internal rotation during the last phase of extension".
  - Quadriceps force produces an internal tibial torque (Draganich & Andriacchi 1985, cited there), so active extension runs along the IR wall and shows a screw-home.
  - In Blankevoort's figures, the IR wall falls from about 17–23° at 20° to about 8° at 0°. **A knee loaded into IR must therefore rotate about 10–15° externally over the last 20°**, whereas a knee loaded into ER rotates internally [FIG/DERIVED].
- Modelling and structural evidence:
  - Moglo & Shirazi-Adl 2005 [ABS], a finite-element model: realigning the flexion axis by ±5°, cutting the ACL, or changing cruciate pre-strain "substantially influenced" screw-home.
  - Amiri 2007 [ABS], a computer model built from cadaver data: attributes early-flexion screw-home to the mutual action of the cruciates.
  - Hamada 2018 [ABS], a cadaver navigation study: screw-home survived meniscectomy and femoral replacement but disappeared after tibial component replacement, so it depends on tibial articular geometry plus the cruciates.

**Weight-bearing vs non-weight-bearing:**

- Present in both. Johal: coupled rotation is "greater and occurs earlier on weight bearing" [ABS]. Hill: loaded is similar to unloaded [ABS]. Qi, Kono and Elorza found it in WB activities [FT].
- In walking stance it is absent or reversed: bone pins (Lafortune) [ABS]; a "paradoxical" ER at loading response with skin markers (Kim) [FT]; phase-dependent offsets in WB but a single path in NWB extension (Dyrby & Andriacchi 2004) [ABS].
- External loads therefore decide where the tibia sits inside the envelope.

**How to model it** [DERIVED recommendation]:

- **Primary mechanism: flexion-dependent, asymmetric axial limits (an envelope) that narrow sharply toward 0° and further in hyperextension.** All passive data support this, and it reproduces both screw-home (under internal loading) and its reversal (under external loading).
- **Secondary: a weak passive centring torque toward a moving neutral θ0(φ)**, where φ = flexion angle and θ0 = 0 at 0° and about 5° by 15–20° (then per Q3). This gives the unloaded coupled IR and the ≈5° "possibly obligatory" component. Its stiffness should be low compared with the walls: Blankevoort's free zone, Iwaki's "suppressible", and Victor's load-reversed path all point that way.
- **Not a rigid kinematic coupling.** Coupling would block the documented reversals (cross-legged sitting, ER-loaded squats, gait stance) and would invent torques when external loads oppose it.
- Passive torque alone, without moving limits, would not reproduce the narrowing of the envelope at extension (pooled 5 N·m total 20° at 0° vs 36° at 30°).

### Q5. Why studies disagree

1. **Definition of zero (the largest single factor).**
   - "From neutral" laxities (robots, Lagae, Moewis, Mouton) and "absolute" angles (Blankevoort, Kono, Hamai, Leszko) are different quantities.
   - Neutral itself is ill-defined. Cadavers have about 20° of near-zero stiffness at 25° flexion, so the zero-torque point is anywhere in that zone (Blankevoort Fig. 4) [FIG]. In vivo curves are hysteretic, and Moewis had to average the loading and unloading zero crossings, which fell about 6–8° ER of device zero [FT].
   - So IR-vs-ER asymmetry and "neutral" values can shift by about 5–10° purely by convention.
2. **Measurement level.** Foot or boot devices read about 2× bone-level rotation (lit2: Almquist RSA, Shoemaker). Skin sensors and IMUs add artefact: Benoit 2006 found rotational errors up to 4.4° walking and 13.1° cutting with skin markers vs bone pins [ABS].
3. **Coordinate system and flexion axis.**
   - TEA vs GCA (4° apart) changes reported coupled IR from 4.8° to 13.8° at 90°, and from 7.2° to 19.9° at 150° (Most 2004) [ABS].
   - Rotating Blankevoort's reference frame by ±5° shifts the IR limit by up to about ±5° at high flexion and varus–valgus by up to about 10° (Fig. 15) [FIG].
   - Piazza & Cavanagh 2000: flexion-axis errors of the size of inter-observer epicondyle palpation can create or abolish a 15° screw-home in a mechanical linkage [ABS].
   - Euler sequence (Blankevoort's flexion–rotation–varus/valgus vs Grood & Suntay) matters little: at (80°, 20°, 7.5°) the difference is ≤ 2.7° in flexion and ≤ 0.5° in the other angles (Blankevoort appendix) [FT].
4. **Torque magnitude and how the limit is defined.**
   - Studies use ±0.5 (Wang & Walker "primary laxity"), 1.5, 2, 2.5, 3, 5, 6, 8–10 N·m, manual end-feel, or Markolf's tangent-intersection breakpoints (about 0.5–2 N·m).
   - Because the torque–angle curve is non-linear, the totals at 30–90° grow roughly as 25 (1.5 N·m) → 29–45 (3) → 36 (5) → ≈40–50 (10; Kanamori IR + ER, Ho 2009) in cadavers [DERIVED, cross-study].
5. **Joint loading.**
   - Wang & Walker: about 100 kg of axial compression cut rotation to about 20% [SNIP; via Blankevoort FT].
   - Hsieh & Walker 1976: articular conformity stabilises under compression [ABS], with a single-specimen ER drop from 23.9° to 10.1° at 30° [SEC].
   - Markolf 1981: 925 N reduced rotatory laxity [SEC: Blankevoort]. Hungerford 1984 (222 N + quadriceps): laxity fell at 60–90° [FIG/SEC: Blankevoort].
   - Yet Blankevoort found 300 N axial and 30 N AP forces changed the ±3 N·m limits by < 2° [FT].
   - So moderate compression barely moves the walls, while body-weight-scale compression probably narrows them a lot. That claim has not been tested in vivo at bone level.
   - Compression and muscle forces also move the path inside the envelope (Blankevoort Fig. 10; Victor 2010; Johal).
6. **Kinematic constraint during testing.** In robots, constraining the other degrees of freedom changes IR at 120° from 13.4° (unconstrained) to 18.6° (constrained) in pooled data (Seiferheld) [FT].
7. **Cadaver vs in vivo.** Cadavers are older, often previously frozen, often stripped of muscle and skin, and have no tone. In vivo ranges are about 0.65–0.8× cadaver at the same torque [DERIVED]. Muscle co-contraction can raise torsional stiffness more than 4× (Louie & Mote 1987; lit2 [ABS]).
8. **Specimen and subject variation.**
   - Wang & Walker: about 4× spread in primary laxity between specimens [SEC: Blankevoort].
   - Blankevoort: totals of 39.5–53° at 90° in only 4 knees [FIG].
   - Roth 2015 JOR: I-E limits uncorrelated with other laxities [ABS].
   - Mouton 2015: females are laxer, and laxity falls by about 0.6°/kg body mass (foot level) [FT].
   - Elite footballers have less passive rotation (lit2, Muaidi 2009 [ABS]).
9. **Activity dependence of "coupled" rotation.** Squat, lunge, kneel, cross-legged sitting, step-up and gait give different paths (Kono, Moro-oka, Komistek, Kozanek, Koo & Andriacchi) [FT/ABS]. Any "neutral" curve taken from an activity is that activity's loaded path, not the passive neutral.

---

## (d) Parameter-ready values

### Well established

Convention: θ is tibial IR (+) relative to the tibia's orientation at full extension. θ0(φ) is the passive zero-torque path. Limits are given from θ0 unless stated otherwise. Use bone-level in vivo values for a tibiofemoral degree of freedom when the ankle has its own axial degree of freedom.

| # | Quantity | Value (range) | Basis | Confidence |
|---|---|---|---|---|
| 1 | Shape of range vs flexion | Minimum at 0°; 85–95% of the plateau by 15–20°; flat from 30° to ≥120° (±10%) | Pooled 5 N·m [FT]; Lagae [FT]; Roth [SEC]; Blankevoort [FIG]; Kennedy, Wijdicks [SEC]; in vivo Hemmerich [SEC] | High (cadaver); mod (in vivo) |
| 2 | Full-extension range ÷ plateau range | 0.3–0.4 at ≤3 N·m; 0.55–0.7 at 5 N·m | Roth, Arnout, Blankevoort, pooled, Hemmerich [DERIVED] | Moderate |
| 3 | In vivo bone-level total at ≈5–6 N·m | 16° (15–17) at 0°; 18–23° at 20–30°; ≈26° at 90° (6 N·m) | Hemmerich, Nordt, Almquist RSA [SEC] | Moderate |
| 4 | In vivo bone-level at ±2.5 N·m, 30–90° | IR ≈4° (2–6), ER ≈8–10° (4–13); total 11–14° | Moewis [FT] | Mod (n = 13) |
| 5 | Cadaver at ±5 N·m (upper bound for a relaxed knee) | total ≈20° at 0°; ≈34–38° from 15° to 120° | Pooled [FT] | High |
| 6 | In vivo ÷ cadaver at the same torque | ≈0.65–0.8 | [DERIVED] from 3 and 5 | Moderate |
| 7 | IR/ER split from neutral at 30–90° (in vivo) | ER ≈1.5–2.5× IR (IR ≈35–40% of total) | Moewis, Hemmerich (30°), RSA | Moderate |
| 8 | Coupled zero-torque IR θ0(φ) | 0 at 0°; ≈5 (3–8) at 15–20°; ≈10 (6–15) at 60°; ≈12–15 (5–20) at 90°; ≈15–18 (8–29) at 120°; ≈20 (11–30) at 145–150° | Table (b) [DERIVED]; values depend on axis (TEA low, GCA high) and on WB (higher, earlier) | Moderate |
| 9 | Between-subject SD of θ0 | ≈6–9° (3–12) | Qi, Elorza, Leszko, Li, Most, Kono | Moderate |
| 10 | θ0 is overridable | ≥15–20° of the coupled IR can be reversed by ER loading at 90–110° (Iwaki; Kono spread ≈20° at 90–110°); centring stiffness is low compared with the walls | ABS / FIG | Moderate |
| 11 | Screw-home | ≈5–15° (central ≈8–10°) of tibial ER over the last 20–40° of extension; SD 3–8°; not obligatory; absent in gait stance with bone pins; model it as envelope narrowing plus loads, not as a rigid coupling | Q4 table | Moderate |
| 12 | End-range stiffening, cadaver, ±3 → ±6 N·m | +3.5–5° per direction, i.e. ≈0.6–0.85 N·m/° per direction | Blankevoort Fig. 6 [FIG]; Pedersen [SEC] | Moderate–low |
| 13 | 120° envelope | Same as the 90° envelope (cadaver, 5 N·m: IR ≈18, ER ≈20 from neutral) | Pooled; Kennedy; Wijdicks; Arnout | High–moderate (in vitro only) |

A worked parameter set for a bone-level, in vivo, relaxed adult male knee [DERIVED synthesis of rows 3, 4, 7, 8; for model tuning, not measured data]:

| Flexion | θ0 (IR from extension) | IR limit from θ0 at ≈3 N·m | ER limit from θ0 at ≈3 N·m | IR limit from θ0 at ≈5–6 N·m | ER limit from θ0 at ≈5–6 N·m |
|---|---|---|---|---|---|
| 0° | 0 | ≈4 | ≈3 | ≈9.5 | ≈6.5 |
| 20° | ≈5 | ≈4–5 | ≈4–6 | ≈10–11 | ≈7.5–10 |
| 30° | ≈6–8 | ≈4 | ≈8 | ≈9 | ≈14 |
| 60° | ≈10 | ≈4 | ≈9 | ≈10 | ≈15 |
| 90° | ≈12–15 | ≈4 | ≈10 | ≈10 | ≈16 |
| 120° | ≈15–18 | ≈4 (assumed = 90°) | ≈10 (assumed) | ≈10 (assumed) | ≈16–17 (assumed; cadaver ER rises slightly) |
| 145–150° | ≈20 | unknown; probably narrower than at 120° | unknown | unknown | unknown |

How the table was built:
- The 0° values at ≈3 N·m are the in vivo 5 N·m values scaled by the cadaver 3/5 N·m ratio at 0° (Roth ÷ pooled: IR 0.49, ER 0.40).
- 30° and 90° at ≈3 N·m come from Moewis at 2.5 N·m.
- The 5–6 N·m columns come from Hemmerich (0°, 30°), Nordt (20°) and Almquist RSA (90°).
- 60° is interpolated; 120° is extrapolated from the cadaver plateau.

### Uncertain

- **Envelope width at 130–160°.** Markolf 1976 shows no narrowing at 135°. Van Kampen (3 knees) and one Nielsen knee show 15–30% narrowing by 130–140°. Li 2004 and Kono 2018 indicate near-locking at 150°. No in vivo torque data exist. Plausible range at 145–150°: anywhere from about 0.3× to 1.0× the 90° range.
- **Asymmetry at 0–20°.** In vivo IR ≥ ER at 0–20° (Hemmerich, Nordt); cadaver data are symmetric (Roth) or mixed. The split depends on the neutral convention.
- **Absolute neutral at 120–150°.** 7–20° in cadaver passive paths vs 15–29° in vivo WB. It depends on the flexion-axis definition by up to about 13°.
- **Hyperextension.** One cadaver knee at about −4°: IR ≈3.5°, ER ≈6° at ±3 N·m (narrower than at 0°) [FIG]. No other data found.
- **Torque–angle law above about 6 N·m.** The cadaver 10 N·m data imply anywhere from very stiff (IR at 30°: 19.1° at 5 N·m vs 20.5° at 10 N·m, across studies) to moderate (ER at 30°: 17.0° vs 27.9°) [SEC/DERIVED]. Cross-study comparisons are not reliable. In vivo bone-level data at ≥9 N·m are absent (lit2's 38–42° total at 90°/≈10 N·m remains a derived estimate). The Shoemaker 1982 in vivo ±10 N·m totals (≈33–48°) are of unclear measurement level.
- **Effect of body-weight compression on the axial walls.** 300 N has little effect (Blankevoort), but about 1000 N roughly halves or reduces rotation to 20% (Markolf 1981; Wang & Walker). No in vivo bone-level test under body weight exists.
- **Free-zone width in vivo.** Cadavers show about 20° at 25° flexion. In vivo the 2.5 N·m data (total about 11–14°) imply a much smaller free zone, but no in vivo curve near 0 N·m was digitised. Moewis shows hysteresis only qualitatively in what I read.
- **Hallén & Lindahl 1966 magnitudes (7–12°; voluntary reversal).** Seen only in a search snippet; the paper was not read.

---

## Sources (DOI / URL)

Primary sources read in full or from figures:
- Blankevoort L, Huiskes R, de Lange A. J Biomech 1988;21:705–720. doi:10.1016/0021-9290(88)90280-1. PDF: https://pure.tue.nl/ws/files/2305657/585371.pdf [FT/FIG]
- Seiferheld BE et al. A scoping review and guide for in vitro healthy human knee joint laxity. Front Bioeng Biotechnol 2026. doi:10.3389/fbioe.2026.1741003, PMC13038627. Supplementary S2/S4 via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC13038627/supplementaryFiles [FT]
- Qi W et al. J Biomech 2013;46:1576. doi:10.1016/j.jbiomech.2013.03.014, PMC3660465 [FT]
- Kono K et al. Bone Joint J 2018;100-B:50. doi:10.1302/0301-620X.100B1.BJJ-2017-0553.R2, PMC5842511 [FT/FIG]
- Hamai S et al. BioMed Res Int 2013:717546. doi:10.1155/2013/717546, PMC3591185 [FT]
- Elorza SP et al. J Exp Orthop 2023. doi:10.1186/s40634-023-00671-3, PMC10646131 [FT]
- Moewis P et al. PLoS One 2016. doi:10.1371/journal.pone.0159600, PMC4965218 [FT]
- Zee MJ et al. Orthop J Sports Med 2020. doi:10.1177/2325967120945967, PMC7450468 [FT] (source for Hemmerich 2011 doi:10.1177/0363546510379333, Nordt 1999 doi:10.1177/03635465990270051101, Haughom 2012, Lee/Christino CAS)
- Tsai AG et al. BMC Musculoskelet Disord 2008;9:35. doi:10.1186/1471-2474-9-35, PMC2315651 [FT] (source for Almquist 2002 RSA, doi:10.1016/S0736-0266(01)00148-6)
- Lagae KC et al. KSSTA 2020. doi:10.1007/s00167-019-05839-y, PMC7148266 [FT]
- Mouton C et al. KSSTA 2015;23:3571. doi:10.1007/s00167-014-3244-6, PMC4661198 [FT]
- Kim HY et al. Clin Orthop Surg 2015;7:303. doi:10.4055/cios.2015.7.3.303, PMC4553277 [FT]
- Nedopil AJ et al. J Pers Med 2021;11:516. doi:10.3390/jpm11060516, PMC8228254 [FT]; Nedopil 2023 KSSTA doi:10.1007/s00167-021-06840-0 (PMC9958185) [FT]
- Leszko F et al. Clin Orthop 2011;469:95. doi:10.1007/s11999-010-1517-z, PMC3008894 [FT-sum]
- Piazza SJ, Cavanagh PR. J Biomech 2000;33:1029. doi:10.1016/s0021-9290(00)00056-7 (abstract plus 2 PDF pages)

Abstract-level or secondary:
- Roth JD, Howell SM, Hull ML. JBJS Am 2015;97:1678. doi:10.2106/JBJS.N.01256 [ABS + SEC S2]
- Roth JD, Hull ML, Howell SM. J Orthop Res 2015;33:1594. doi:10.1002/jor.22926 [ABS]
- Roth JD et al. J Orthop Res 2019;37:358. doi:10.1002/jor.24196 [ABS]
- Arnout N et al. KSSTA 2022. doi:10.1007/s00167-021-06575-y [SEC S2]
- Kennedy NI et al. AJSM 2013 (PCL part 1); Kennedy 2014a,b AJSM; Wijdicks CA et al. 2013a,b AJSM; Liu 2014/2015; Goldsmith MT et al. AJSM 2013; Whiteside & Amador 1988; Pedersen 2019; Kanamori 2000, 2003; Ho 2009; Musahl 2007 doi:10.1007/s00167-007-0317-9 — all values [SEC: Seiferheld S2]. DOIs other than Musahl were not verified here.
- Gupte CM et al. JBJS Br 2003;85:765. PMID 12892207 [ABS + SEC]
- Markolf KL, Mensch JS, Amstutz HC. JBJS Am 1976;58:583. PMID 946969 [ABS + FIG/SEC]
- Markolf KL et al. JBJS Am 1981;63:570. PMID 7217123 (title only; results via Blankevoort)
- Wang CJ, Walker PS. JBJS Am 1974;56:161. PMID 4812160 [SEC: Blankevoort; SNIP]
- Hsieh HH, Walker PS. JBJS Am 1976;58:87. PMID 946171 [ABS + SEC]
- Shoemaker SC, Markolf KL. JBJS Am 1982;64:208. PMID 7056775 [ABS + FIG]
- Li G, Zayontz S et al. J Orthop Res 2004;22:90. doi:10.1016/S0736-0266(03)00118-9 [ABS]
- Li G, Most E et al. JBJS Am 2004;86:1721. doi:10.2106/00004623-200408000-00017 [ABS]
- Most E et al. J Biomech 2004;37:1743. doi:10.1016/j.jbiomech.2004.01.025 [ABS]
- Victor J et al. J Orthop Res 2010;28:419. doi:10.1002/jor.21019 [ABS]
- Wilson DR et al. J Biomech 2000;33:465. doi:10.1016/s0021-9290(99)00206-7 [ABS]; Wilson 1998 doi:10.1016/s0021-9290(98)00119-5 [ABS]
- Iwaki H et al. JBJS Br 2000;82:1189. doi:10.1302/0301-620x.82b8.10717 [ABS]
- Hill PF et al. JBJS Br 2000;82:1196. doi:10.1302/0301-620x.82b8.10716 [ABS]
- Nakagawa S et al. JBJS Br 2000;82:1199. doi:10.1302/0301-620x.82b8.10718 [ABS]
- Pinskerova V et al. JBJS Br 2004;86:925. doi:10.1302/0301-620x.86b6.14589 [ABS]; JBJS Br 2009;91:830. doi:10.1302/0301-620X.91B6.22319 [ABS]
- Freeman MA, Pinskerova V. Clin Orthop 2003;410:35. doi:10.1097/01.blo.0000063598.67412.0d [ABS]; J Biomech 2005;38:197. doi:10.1016/j.jbiomech.2004.02.006 [ABS]
- Johal P et al. J Biomech 2005;38:269. doi:10.1016/j.jbiomech.2004.02.008 [ABS]
- Asano T et al. Clin Orthop 2001;388:157. doi:10.1097/00003086-200107000-00023 [ABS]
- Tanifuji O et al. J Orthop Sci 2011;16:710. doi:10.1007/s00776-011-0149-9 [ABS]
- Dennis DA et al. J Biomech 2005;38:241. doi:10.1016/j.jbiomech.2004.02.042 [ABS]
- Komistek RD et al. Clin Orthop 2003;410:69. doi:10.1097/01.blo.0000062384.79828.3b [ABS]
- Moro-oka T et al. J Orthop Res 2008;26:428. doi:10.1002/jor.20488 [ABS]
- Ishii Y et al. Clin Orthop 1997;343:144. PMID 9345219 [ABS]
- Jonsson H, Kärrholm J. J Orthop Res 1994;12:769. doi:10.1002/jor.1100120604 [ABS]; Kärrholm J et al. Acta Orthop Scand 1988;59:158. doi:10.1080/17453678809169699 [ABS]
- Lafortune MA et al. J Biomech 1992;25:347. doi:10.1016/0021-9290(92)90254-x [ABS]
- Gray HA et al. J Orthop Res 2019;37:615. doi:10.1002/jor.24226 [ABS]
- Kozanek M et al. J Biomech 2009;42:1877. doi:10.1016/j.jbiomech.2009.05.003 [ABS]
- Koo S, Andriacchi TP. J Biomech 2008;41:1269. doi:10.1016/j.jbiomech.2008.01.013 [ABS]
- Dyrby CO, Andriacchi TP. J Orthop Res 2004;22:794. doi:10.1016/j.orthres.2003.11.003 [ABS]
- Benoit DL et al. Gait Posture 2006;24:152. doi:10.1016/j.gaitpost.2005.04.012 [ABS]
- Moglo KE, Shirazi-Adl A. J Biomech 2005;38:1075. doi:10.1016/j.jbiomech.2004.05.033 [ABS]
- Amiri S et al. Proc IMechE H 2007;221:821. doi:10.1243/09544119JEIM181 [ABS]
- Hamada D et al. KSSTA 2018;26:3249. doi:10.1007/s00167-018-4842-5 [ABS]
- Jeon JW, Hong J. J Back Musculoskelet Rehabil 2021;34:589. doi:10.3233/BMR-200110 [ABS]
- Hallén LG, Lindahl O. Acta Orthop Scand 1966;37:97. doi:10.3109/17453676608989407 [SNIP only]
- Hame SL et al. AJSM 2002;30:537. doi:10.1177/03635465020300041301 [ABS]
- Kanamori A et al. Arthroscopy 2002;18:394. doi:10.1053/jars.2002.30638 [ABS]
- Andreassen TE et al. Front Bioeng Biotechnol 2025 (PMC12391196) and J Med Device 2021 (PMC8546959): in vivo HSSR laxity device, n = 2, no usable healthy-subject values extracted [FT/ABS]

Not obtained:
- Full texts of Li 2004 (JOR, JBJS), Roth 2015 JOR and Roth 2019 JOR (Wiley PDFs behind Cloudflare).
- Wilson 2000 full text; Hallén & Lindahl 1966; Wang & Walker 1974; Markolf 1981 (publisher paywalls).
- Kennedy, Wijdicks and Arnout primaries; their values are Seiferheld's digitised means.

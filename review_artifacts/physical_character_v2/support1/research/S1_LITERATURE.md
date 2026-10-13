# SUPPORT-1 literature and evidence review

**Provenance.** A research subagent compiled this review on 13 Oct 2026, between about 03:50 and 04:15 BST. It worked through Europe PMC, PubMed, Crossref, Semantic Scholar and direct PDF downloads; its WebSearch quota was exhausted. Every row says whether the source was opened (Y) or not, and anything taken from background knowledge is marked UNVERIFIED.

**Spot checks against the saved source texts** (13 Oct, ≈ 04:20):
- Blackburn 2012, Table 6.10: studded-foot traction coefficient 0.91–0.94 at ≈ 1.86–2.0 kN vertical load. Found.
- Jain et al. 2016: passive inversion stiffness 0.99 ± 0.41 N·m/deg in the uninvolved ankle. Found.
- FIFA Test Manual (2015): Test Method 06, rotational resistance. Found.

**Not committed:** the fetched source texts and PDFs (69 MB, some under copyright). They are listed in the bibliography and kept outside Git (see `../review/OUTSIDE_GIT.md`).

---

# SUPPORT-1 literature review: does loss or reconfiguration of the support base explain the "sliced-out" tackle response?

Compiled 13 Oct 2026 for the physical-character-v2 / PVP work.

## 0. Method and how to read this

**How sources were found.** The session's WebSearch budget was already used up when this review started (every WebSearch call was refused). The search was therefore done through scholarly databases and direct downloads:

- the Europe PMC REST API (search and full-text XML);
- NCBI E-utilities (PubMed abstracts and PMC full text);
- the Crossref and Semantic Scholar APIs (abstracts and metadata);
- direct downloads of public PDFs: the FIFA Quality Programme test manual, and the Blackburn 2012 PhD thesis from the Strathclyde repository.

ScienceDirect, Springer and Wiley pages returned 403 errors or cookie walls. Some papers (Grund & Senner 2010; Severn et al. 2011; Twomey et al. 2012; Forrester & Fleming 2019; McGowan et al. 2023 *Sports Eng*) could therefore only be read as abstract or metadata, or not at all. This is noted wherever it matters.

**What "verified" means.**

- **Y** — the number was read on a page or file I opened, whether a full text or an abstract. The bibliography says which.
- **Y (secondary)** — I read the number in a source I opened, but that source was quoting another paper I could not open. The original is named.
- **DERIVED** — my own arithmetic from verified inputs. The formula and assumptions are given.
- **[UNVERIFIED — from background knowledge]** — not checked against any page I opened.

**Units.** BW = body weight. TC = traction coefficient (peak horizontal force divided by vertical force). NG = natural grass. AG/3G = third-generation artificial grass. N·m = newton-metres.

---

## Executive summary

These are the findings that matter most for the hinge-around-an-anchored-far-foot problem.

1. **A loaded studded boot does not slide easily.**
   - At low vertical loads (150–600 N), measured translational traction coefficients on natural grass and 3G are about **1.7–2.7** as means, with individual trials up to about 3.2 (Thomson 2019; Blackburn 2012).
   - At athlete-like loads (2–3 kN) they fall to about **0.9–1.6** (Blackburn 2012; Kent et al. 2015).
   - Players use only about **0.4–0.8** in running and cutting on 3G (Blackburn 2012). The 95th percentile in American-football cutting is about 1.2 (Shorten 2003, secondary).
   - So "the foot slips because friction is low" is **not** the main mechanism while the foot is loaded. The available traction is 1.5–5 times what ordinary play needs.

2. **Traction scales sub-linearly with normal load.** The effective coefficient falls as load rises. All sources agree on this, although no single source spans the whole load range.
   - Peak force rises roughly linearly with load (R² 0.96–0.97 for cleat "release" force against normal force; Koerber et al. 2026 preprint).
   - **A boot's grip disappears in proportion to its unloading.** This is the mechanical lever for "support loss".

3. **Peak traction is reached only after real foot displacement, and the turf limits it.**
   - FIFA rotational test foot: torque peaks at about **30–40° of rotation**, roughly **30 mm** of stud travel (McGowan 2023, 2025).
   - Dynamic shear rig: mean peak horizontal displacement **15–25 mm**, time to peak shear **44–53 ms** (Blackburn 2012).
   - On natural grass, cleats usually **release by shearing the turf and making a divot**, at about **2.5–4.2 kN** horizontal (Kent 2015, 2021).
   - On 3G, cleats usually **hold** up to device limits of 4.8 kN and 200 N·m (Kent 2015). There is no "release valve" on 3G.

4. **Rotational resistance is not far below what a flat foot-sized plate would give.**
   - Studded peak torque is about **28–59 N·m at 580 N** (forefoot only, natural grass; Thomson 2019) and **25–50 N·m at 450 N** under the FIFA limits.
   - These correspond to an equivalent friction coefficient of about **1.1–2.7** on a 150 mm disc or a forefoot patch (DERIVED).
   - A rigid whole-foot plate with μ = 1 at 580 N gives about **42 N·m** (DERIVED). That is the same order of magnitude.
   - Relative to the same boot's translational traction, the "effective lever arm" is about 20–50 mm. A Coulomb plate would give 37–72 mm. Rotational grip is therefore modestly lower relative to translational grip, but not by an order of magnitude.
   - Players use a free-moment-to-vertical-force ratio of only **≤ 20 mm** (Blackburn 2012).

5. **The foot rolls fast and the muscles are late.**
   - Ankle-sprain injuries: mean peak inversion velocity **974°/s** (range 468–1752; Lysdal 2022). Normal sport motions stay below **85°/s** (Chu 2010).
   - Lab trapdoors tilt at 400–600°/s (Nieuwenhuijzen 2002), for example 30° in about 80 ms (Konradsen 1997).
   - Peroneal muscle activity starts about **54–74 ms** after the onset of inversion. Active eversion torque starts about **135–176 ms**, and the voluntary component after about **305 ms**.
   - Passive inversion stiffness is only about **0.7–1.0 N·m/deg**.
   - **The first ~50–100 ms after a disturbance are essentially passive.**

6. **Balance responses have fixed delays.**
   - Automatic postural responses: **73–110 ms**.
   - Lateral "ankle strategy" during walking: mechanical delay about **200 ms**, but it can move the centre of pressure (CoP) only **≤ 2 cm**.
   - Stepping: needs **≥ 300 ms** before the foot is placed, and has about 20 cm of range (Hof 2010).
   - A lateral velocity change Δv moves the extrapolated centre of mass (XCoM) by about **Δv × 0.32 s**. For example, a 0.5 m/s change moves it about 16 cm, which is far beyond a single foot's base of support (DERIVED from Hof 2005/2008).

7. **The struck player is usually in single support with that leg loaded.**
   - Elite men's football ankle sprains (n = 140): **78%** had one foot on the ground at the injury frame, and **87%** were loading the injured leg (Buckthorpe 2025). "Being tackled" was the most common situation (**42%**).
   - The classic football ankle mechanism is a blow to the **medial aspect of the leg just before or at foot strike**, which makes the player land on an inverted ankle (Andersen et al. 2004).
   - Contact ACL injuries occur about **40 ms after initial contact** (Koga 2010).

8. **Losing one support foot is usually survivable; losing both is not.**
   - Unconstrained slips in young adults walking at 1.3 m/s: **0/28 falls** when one foot slipped, against **6/28 (21%)** when both slipped (Ouattas 2025).
   - A novel, unconstrained slip produced **100%** backward balance loss in untrained young controls (Yang 2014).

**Bottom line.** The evidence supports the hypothesis. A "sliced-out" response is explained by several things combining within roughly the first 50–150 ms: the struck foot is unloaded or rolled (and its grip disappears with its load), or it is displaced directly by the tackler's leg; the struck leg yields; and the second foot either is not loaded, is in swing, or rolls over its own edge. Muscle responses come too late to resist. A body that stays hinged on one flat, fully loaded, anchored foot is plausible only for LIGHT disturbances, or for the specific case where the far foot really is loaded and stays loaded.

---

## 1. Translational boot–turf traction

| # | Quantity | Value | Units | Conditions (load, surface, boot, device/speed) | Source | Verified |
|---|---|---|---|---|---|---|
| 1.1 | Translational TC, natural grass | 1.9 ± 0.1 (cool-season rye, Tiempo AG) to 2.5 ± 0.2 (warm-season Paspalum, Tiempo SG) | – | 300 N vertical; forefoot only (20° plantarflexion); S2T2 portable tester, manually dragged at ~200 mm/s; elite training pitch in Qatar; 6 Nike boots; ICC 0.76 | Thomson et al. 2019 [T1] | Y |
| 1.2 | Translational TC, natural grass vs 3G | Values only in figures. AG > NG for every boot and direction. Boot differences vs control up to 0.78 (SG vs FGC, anterior, NG) | – | 148 N vertical; 4 m/min (~67 mm/s); 3D-printed US size 9 footform, neutral foot; kikuyu/rye NG and 3G (50 mm pile, SEBS + sand); anterior, posterior, medial and lateral | Loud et al. 2024 [T2] | Y (absolute TCs not in text) |
| 1.3 | First-trial effect on NG | Trial 1 > (mean + 1 SD of trials 2–10) in **100%** of NG conditions and 45% of AG conditions; the first pass tears stolons and root zone, so later passes resist less | – | as 1.2 | Loud et al. 2024 [T2] | Y |
| 1.4 | Studded TC, dynamic shear rig, low load | **1.86–2.70** (3G FT 2.43, 3G Green 1.86, natural 2.70, hybrid 1.93) | – | 250 N static preload; pendulum-driven shear; vertical force at peak shear 185–443 N; studded test foot | Blackburn 2012 thesis, Table 6.8 [T3] | Y |
| 1.5 | Time to peak shear (same test) | **44–53** (studded); 32–43 (pimpled) | ms | as 1.4 | Blackburn 2012 [T3] | Y |
| 1.6 | Studded TC, high dynamic vertical load | **0.91–0.94** (3G FT 0.94, 3G Green 0.91, natural 0.91) | – | vertical force at peak shear ~1.98–2.43 kN; peak shear 1.86–2.21 kN; same rig, dynamic vertical loading | Blackburn 2012, Table 6.10 [T3] | Y |
| 1.7 | Peak horizontal foot displacement in rig shear tests | Mean **15.4** (3G FT), **22.1** (3G Green), **22.3** (natural), **25.5** (hybrid); individual trials 3.7–60.6. Some trials "very low… possibly due the studs getting locked in the turf" | mm | studded foot, shear rig (table appears under both the static and dynamic tests in the PDF text extraction) | Blackburn 2012, Tables 6.9/6.11 [T3] | Y (table attribution partly ambiguous) |
| 1.8 | NG peak horizontal force, elite-athlete loading | **2.8–4.2** across 19 American-football cleats | kN | Kent device simulating elite-athlete manoeuvres, in situ; "almost all" cleats sheared the NG surface and left a divot (force-limiting release) | Kent et al. 2015a [T4] | Y (abstract) |
| 1.9 | 3G behaviour, same tests | All but one cleat "held fast"; force limited by the device (nominal 4.8 kN). One nub-type cleat released at **3.9 kN** | kN | infill artificial turf | Kent et al. 2015a [T4] | Y (abstract) |
| 1.10 | NG vs 3G horizontal force at 2.8 kN vertical | **3.2** (NG) vs **4.5** (3G); NG "limited the horizontal force on the cleats by tearing" | kN | translation test, 2.8 kN vertical; 2 NG and 6 infill surfaces used by NFL teams | Kent et al. 2015b [T5] | Y (abstract) |
| 1.11 | Equivalent TC from 1.10 | **1.14** (NG); **1.61** (3G, device-limited, so a lower bound) | – | DERIVED: 3.2/2.8 and 4.5/2.8 | from [T5] | DERIVED |
| 1.12 | Translation/drop test peak horizontal force | **2.4** (NG) vs **3.0** (3G) | kN | foot launched into the surface with horizontal and vertical velocity | Kent et al. 2015b [T5] | Y (abstract) |
| 1.13 | NG peak loads, full power | AP **3.86 ± 0.45** (bermudagrass) vs **2.66 ± 0.23** (Kentucky bluegrass); ML **3.25 ± 0.45** vs **2.49 ± 0.36**; all tests < 4.95 kN | kN | cleated footform, NFL turfgrasses; full-power ("potentially injurious") loading | Kent et al. 2021 [T6] | Y (abstract) |
| 1.14 | Cleat–turf release force vs normal force | Linear; R² = **0.96** (posterior shear) and **0.97** (lateral shear). High-speed video confirmed release occurs **at the time of peak horizontal force** | – | 6-DOF robot, compress-then-shear, cleated shoe surrogate on artificial turf, range of normal loads | Koerber et al. 2026 (preprint) [T7] | Y (abstract; slope and intercept not available) |
| 1.15 | Dependence of TC on normal load (FieldTurf) | Slope of the load-vs-TC curve differs significantly below and above **888 N**. Shoes are not distinguishable below 888 N. Turf buckled and was damaged at 1776 N. Direction of change not stated in the abstract | – | 222–1776 N; 4 cleated shoes; static, dynamic and peak TC | Kuhlman et al. 2009/2010 [T8] | Y (abstract only) |
| 1.16 | "Linear relationship between TC and normal load" (Wannop & Stefanyshyn 2012), with the ranking of outsoles unchanged across loads | – | – | quoted by Loud et al. | Loud 2024 citing Wannop & Stefanyshyn [T2] | Y (secondary; original not opened) |
| 1.17 | Translational traction rises linearly with movement speed (50–200 mm/s) | – | – | 580 N | McGowan 2023 citing Wannop et al. [T9] | Y (secondary) |
| 1.18 | Three possible cleat outcomes under load | (1) slide; (2) tear the surface (divot); (3) hold with minimal movement. If the cleat fails to release, "the force-limiting factor is the force applied by the athlete, which in the extreme will result in injury" | – | review of Kent's work | Jastifer et al. 2017 [T10] | Y |
| 1.19 | Track-surface TC (non-turf comparison) | **1.00** (tread shoe) vs **0.87** (smooth shoe) | – | robotic tester, sample track surface | Wannop et al. 2010 [T11] | Y (abstract) |
| 1.20 | Futsal shoe on hardwood: available friction coefficient | 1.25–1.34 | – | mechanical test (from Ismail 2020) | Ismail et al. 2021 [T12] | Y |

**Load dependence: synthesis.**

- Within one rig (Blackburn), the studded TC fell from 1.9–2.7 at about 0.2–0.45 kN to 0.91–0.94 at about 2.0–2.4 kN.
- Across devices: about 1.9–2.5 at 0.3 kN (Thomson, NG) against about 1.1 at 2.8 kN (Kent, NG).
- For rotation, McGowan 2025 found torque rose only about 2.5-fold for a 3.66-fold load increase (177 to 647 N), so torque per unit load fell to about 68% (DERIVED).
- Together this strongly indicates a **decreasing effective coefficient with load**, i.e. sub-linear force against load. A linear force–load fit with a positive intercept (Koerber) gives the same behaviour.
- Caveat: no single study spans 0.2–3 kN with the same boot, surface and speed.

**Post-peak behaviour.**

- *Natural grass:* the cleat shears the root zone (divot) and the resistance drops. Later passes over the same ground are lower (Loud's trial-1 effect). In Blackburn's rig on grass, the vertical force fell **below** the static preload after the first shear peak: "the test foot may have been initially pulled down into the turf and was then pulled up".
- *3G:* the cleat holds or slides through the infill. McGowan 2025 lists three proposed mechanisms: initial bulk shear between outsole and surface; dynamic friction once the foot "slides"; and resistance of the infill to horizontal stud displacement.
- No verified post-peak "dynamic/static ratio" was found for football boots on turf.

---

## 2. Rotational traction

| # | Quantity | Value | Units | Conditions | Source | Verified |
|---|---|---|---|---|---|---|
| 2.1 | Peak rotational traction, natural grass | Shoe × month means **28.1** (AG outsole, January rye) to **59.1** (SG metal studs, May Paspalum). Monthly means across shoes 36.3–49.5. SG − AG difference 15.1–20.6 | N·m | **580 N** vertical; forefoot only (20° plantarflexion); rotated 90° at ~90°/s; S2T2; elite NG pitch; ICC 0.94; SEM 1.8 N·m | Thomson et al. 2019 [T1] | Y |
| 2.2 | Rotational traction vs vertical load | "linear relationship" (S2T2 pilot on that NG pitch) | – | – | Thomson 2019 [T1] | Y |
| 2.3 | FIFA rotational resistance requirement | FIFA Quality Pro: mean peak torque **30–45**; FIFA Quality: **25–50** | N·m | FIFA test foot (row 2.4) | McGowan et al. 2023 *Sci Rep* citing the FIFA Handbook of Requirements [T9] | Y (secondary to FIFA requirements document) |
| 2.4 | FIFA Test Method 06 (heavyweight) | Disc **150 ± 2 mm** diameter; six studs on **46 ± 1 mm** radius; total mass **46 ± 2 kg** (~451 N); dropped from **60 ± 5 mm**; rotated at **12 ± 2 rev/min** (= 72°/s) through **≥ 45°**; max torque recorded; uncertainty 2 N·m | – | standard test | FIFA Test Manual I (2015 v3.4) [T13] | Y |
| 2.5 | FIFA Test Method 06a (lightweight) | Same disc and studs; spring-applied **450 ± 20 N**; rotated **≥ 120° in ~4 s** (~30°/s); uncertainty ±1.6 N·m. Studs: plastic, Shore A 96 ± 2, replaced if < 11.0 mm long | – | standard test | FIFA Test Manual [T13]; McGowan 2023 [T9] | Y |
| 2.6 | Angle at peak torque (FIFA devices) | Typically **30–40°**; "approximately 37° (30 mm)" of stud travel | deg / mm | FIFA test foot on 3G | McGowan 2023 [T9]; McGowan 2025 [T14] | Y |
| 2.7 | Stud surface displacement in real player movements | "less than 12 mm" | mm | player movement studies (secondary) | McGowan 2025 citing ref. 20 [T14] | Y (secondary) |
| 2.8 | Effect of rotational velocity | Peak torque lowest at 10°/s; rises up to 72–90°/s, then plateaus. Increase 7.7–12.1 N·m (21–37%) on SBR/EPDM surfaces. 72°/s vs 30°/s differ by **2.6 N·m** on average | N·m | automated tester, 450 N, 10 3G systems | McGowan 2023 [T9] | Y |
| 2.9 | Effect of normal load on torque | 647 N gives ~**2.5×** the torque at 177 N; 647 N compresses the surface ~4.5 mm more | – | automated tester, FIFA foot, SBR 3G | McGowan 2025 [T14] | Y |
| 2.10 | Rotation torque, elite-athlete loads, NG | **120–174** (19 cleats); peak torque correlated with peak translational force | N·m | Kent device; vertical load for rotation not stated in abstract | Kent 2015a [T4] | Y (abstract) |
| 2.11 | Rotation torque, NG vs 3G | **145** (NG) vs **197** (3G; 3G was device-limited at ~200 N·m); NG allowed more angular displacement | N·m | Kent device, NFL surfaces | Kent 2015b [T5]; [T4] | Y (abstract) |
| 2.12 | Rotation torque, NG full power | **144.8 ± 12.0** (bermudagrass) vs **126.3 ± 6.1** (Kentucky bluegrass); all < 173 | N·m | forefoot external rotation, full power | Kent 2021 [T6] | Y (abstract) |
| 2.13 | Combined shear + torque test, studded foot | Peak torque **14.5–18.6**; vertical force at peak torque 294–471 N; rotational traction λ = T/N **0.039–0.052 m**; simultaneous linear TC 1.74–2.23 | N·m, m | Blackburn rig, 250 N static preload, dynamic shear plus torque | Blackburn 2012, Table 6.12 [T3] | Y |
| 2.14 | Injury association | High-school American football: non-contact lower-extremity injuries 4.2 → **19.2 per 1000 game exposures** from low to high rotational traction. For translational traction, injuries peaked mid-range (23.3) and fell to 5.0 at high traction | – | athletes' own shoes, on field | Wannop et al. 2013 [T15] | Y (abstract) |
| 2.15 | Low vs high rotational-traction groups | 15–30.9 vs 39–54.9 N·m at 580 N | N·m | Wannop 2013 device | Thomson 2019 citing Wannop 2013 [T1] | Y (secondary) |
| 2.16 | Track-surface rotation | 23.87 (tread) vs 16.12 (smooth) | N·m | robotic tester, track surface | Wannop 2010 [T11] | Y (abstract) |
| 2.17 | Surface effect | Infill 3G gives higher peak torque and rotational stiffness than NG; turf-style cleat gives the lowest torque | – | mobile tester with compliant ankle | Villwock et al. 2009 [T16] | Y (abstract; no numbers) |
| 2.18 | Surface effect | Lowest torques on the grass field | – | 333 N compressive load; 5 surfaces, 2 shoes | Livesay et al. 2006 [T17] | Y (abstract; no numbers) |
| 2.19 | Utilised rotational traction in play (free moment / vertical force) | ~6–8 mm (run, stop); 8–11 (45° cuts); **12–19 (90° cuts, 180° turn)**; "remained below a value of 20 mm for all movements" | mm | 13 players, force plate under 3G, 3 turfs | Blackburn 2012, Table 4.7 [T3] | Y |
| 2.20 | Free moment in play | 7.91 (run, peak); **17.2** (180° pivot, Valiant 1987) | N·m | 3G / AstroTurf | Blackburn 2012 [T3]; Valiant 1987 via [T3] | Y; Y (secondary) |

### Is rotational resistance far lower than a rigid flat foot-sized plate would give? (DERIVED)

For uniform pressure and Coulomb friction μ over a contact patch spinning about its centroid, torque is T = μ·N·r̄, where r̄ is the mean distance of the patch from the centroid. Computed numerically:

| Contact patch | r̄ | Plate torque at μ = 1, N = 580 N | Plate torque at μ = 1, N = 450 N |
|---|---|---|---|
| whole foot, 260 × 95 mm | 72 mm | **42 N·m** | 33 N·m |
| forefoot, 100 × 95 mm | 37 mm | 22 N·m | 17 N·m |
| FIFA disc, R = 75 mm (uniform) | 50 mm | – | 22.5 N·m |
| FIFA studs, as points at r = 46 mm | 46 mm | – | 20.7 N·m |

The foot dimensions are illustrative [UNVERIFIED — from background knowledge].

- **Measured studded peak torques expressed as an equivalent μ.**
  - FIFA limits 25–50 N·m at 450 N give μ_eq ≈ **1.1–2.2** (uniform disc) or **1.2–2.4** (studs as points).
  - Thomson's 28–59 N·m at 580 N on a forefoot patch gives μ_eq ≈ **1.3–2.7**, assuming rotation about the patch centroid. The S2T2 axis location is not stated, which adds uncertainty.
- **Answer: no.** In absolute terms, studded rotational resistance is about the same as, or higher than, a flat foot-sized plate with μ ≈ 1. A rigid flat foot with μ = 1 in a simulation does **not** grossly overstate rotational grip for a fully loaded foot.
- **Relative to the same interface's translational traction**, the effective lever arm r_eff = (T/N)/μ_trans is lower than a Coulomb plate's r̄:
  - Blackburn combined test: 0.039–0.052 m divided by 1.74–2.23 gives about **19–25 mm**.
  - Thomson: 48–102 mm divided by 1.9–2.5 gives about **19–54 mm**, at different loads.
  - Both are below the 37–72 mm of a Coulomb plate.
  - Studs therefore give somewhat less rotational resistance per unit of translational grip than a flat high-friction plate, by roughly 1.5–3×, but not by an order of magnitude.
- **Available against used:** available T/N is about 39–102 mm; players use ≤ 20 mm. A loaded foot will not spin out in ordinary play.

---

## 3. Required / utilised friction in football movements

| # | Quantity | Value | Units | Conditions | Source | Verified |
|---|---|---|---|---|---|---|
| 3.1 | Utilised linear TC (peak horizontal / vertical GRF), run | **0.38–0.39** | – | 13 players, 3G on force plate; approach ~5.9 m/s | Blackburn 2012, Table 4.7 [T3] | Y |
| 3.2 | Utilised TC, stop | 0.39–0.46 | – | as 3.1; the author notes a full one-step stop was not captured | [T3] | Y |
| 3.3 | Utilised TC, 45° cuts | 0.55–0.61 | – | as 3.1 | [T3] | Y |
| 3.4 | Utilised TC, 90° cuts | **0.73–0.82** | – | as 3.1 | [T3] | Y |
| 3.5 | Utilised TC, 180° turn | 0.59–0.60 | – | as 3.1 | [T3] | Y |
| 3.6 | Running GRF peaks | vertical **2.39 BW**; horizontal 0.63 BW; stance 175 ms | BW, ms | as 3.1 | [T3] | Y |
| 3.7 | 95th percentile peak TC in cutting | **1.19** (45°), **1.23** (90°), **1.25** (180°) | – | American-football players (Shorten et al. 2003) | Blackburn 2012 citing Shorten [T3] | Y (secondary) |
| 3.8 | Cutting traction ratios | 0.46–0.51 (cutting); 0.52–0.69 (acceleration) | – | AstroTurf, 3 age groups (Morag & Johnson 2001) | via Blackburn [T3] | Y (secondary) |
| 3.9 | 90° cut GRF | vertical 3.45 BW; shear −1.55 BW AP and 1.85 BW ML (peaks, not necessarily simultaneous) | BW | AstroTurf, 8 athletes (Valiant 1987) | via Blackburn [T3] | Y (secondary) |
| 3.10 | Governing-body recommended slip-resistance range | μ = 0.6–1.0 | – | FIFA/IRB/FIH documents c. 2008–2010 | via Blackburn [T3] | Y (secondary) |
| 3.11 | Required COF relates to the lean of the body over the foot | Required COF ∝ tan(COM–COP angle); turning raises the mediolateral component | – | walking turns, young and elderly adults | Yamaguchi et al. 2017 [T18] | Y |
| 3.12 | Higher available friction gives higher utilised friction and higher inversion velocity | qualitative | – | futsal sidestep, 29 players, synthetic vs natural surface | Frias Bocanegra & Fong 2022 [T19] | Y (abstract; no numbers) |

**Takeaway.** Ordinary football play uses a TC of about 0.4–0.8, occasionally up to about 1.2. The available TC is about 0.9–1.6 at body-weight-plus loads and about 1.7–2.7 (means) at light loads. A loaded boot has a large traction margin. Ordinary play also relies on the inequality |F_h| < μ·F_z, which is maintained by keeping the centre of mass (COM) leaning over the foot appropriately (Yamaguchi 2017). A tackle that suddenly adds horizontal force **while reducing F_z**, for example as the body tilts away or the leg buckles, attacks the margin from both sides.

---

## 4. Foot roll, pivot and ankle inversion under sudden perturbation

| # | Quantity | Value | Units | Conditions | Source | Verified |
|---|---|---|---|---|---|---|
| 4.1 | Trapdoor tilt speed | **30° in ~80 ms** (≈ 375°/s mean, DERIVED) | – | 10 stable-ankle volunteers, standing and walking | Konradsen et al. 1997 [A1] | Y (abstract) |
| 4.2 | Peroneal EMG onset | **54 ms** after inversion is detected; quadriceps and hamstrings 68 ms; active eversion **176 ms**; knee and hip changes later. "Both peripheral and central reactions… seem too slow to protect the ankle… at the time of heel contact" | ms | as 4.1 | Konradsen 1997 [A1] | Y (abstract) |
| 4.3 | Peroneal reaction time | median **69** (stable) vs 84 (unstable). Response pattern: peroneal reflex, then a central pattern of hip, knee and ankle flexion **"relieving the vertical pressure on the ankle"**, i.e. an unloading response | ms | trapdoor | Konradsen & Ravn 1990 [A2] | Y (abstract) |
| 4.4 | Eversion torque response | Initial torque (30% of max) at **135 ms** (automatic); main torque after **305 ms** (voluntary); 66% of max at **326 ms** unbraced, 230 ms braced, **89 ms** with peronei pre-activated | ms | 13 stable subjects, sudden inversion | Konradsen et al. 2005 [A3] | Y (abstract) |
| 4.5 | Review summary | Explosive inversion moment "in a short time (about **50 ms**)"; peroneal reaction **57–69 ms** (healthy, standing), ~**74 ms** (walking), 82–85 ms (unstable); eversion torque 135 ms; active eversion ~176 ms; ligament failure torque in cadavers **41–45 N·m**; injury thought to occur ~40 ms after landing (Ashton-Miller) | – | narrative review | Fong et al. 2009 SMARTT [A4] | Y |
| 4.6 | Trapdoor tilt velocity | 25° tilt; **403°/s** (walking task), **595°/s** (jumping task) | °/s | treadmill 4 km/h; 30 cm jump | Nieuwenhuijzen et al. 2002 [A5] | Y (abstract) |
| 4.7 | Inversion velocity: normal sport vs sprain | Running, cutting, landing, step-down: max **22.5–85.1°/s**. Simulated sprain: 114–202.5°/s. Real injury case: **623°/s**. Proposed sprain threshold **300°/s** | °/s | 10 males, 120 Hz motion capture | Chu et al. 2010 [A6] | Y (abstract) |
| 4.8 | Pooled real sprain kinematics | mean peak inversion **67.5°** (2–142); mean **peak** inversion velocity **974°/s** (468–1752); mean inversion velocity from a linear fit 337°/s (117–1400) | °, °/s | 24 quantitative case reports | Lysdal et al. 2022 [A7] | Y (abstract) |
| 4.9 | Televised badminton sprain | peak inversion **114° at 0.24 s**; peak velocity **1262°/s at 0.12 s** after foot strike | – | 4-camera model-based reconstruction | Fong et al. 2023 [A8] | Y |
| 4.10 | Lab handball sidestep sprain | Inversion and internal rotation peaked **130–180 ms** after initial contact; "attempted unloading of the foot from **80 ms** after initial contact" | ms | 240 Hz full-body markers | Kristianslund et al. 2011 [A9] | Y (abstract) |
| 4.11 | Lab cutting sprain | 48° inversion, 10° internal rotation (grade I) | ° | dynamic cutting trial | Fong 2009 review, describing Fong et al. 2009 AJSM [A4] | Y (secondary to the AJSM case) |
| 4.12 | Passive inversion stiffness | **0.99 ± 0.41** (uninvolved) vs 0.69 ± 0.37 (chronically unstable ankle) | N·m/deg | Biodex dynamometer, seated, ankle at 20° plantarflexion, knee ~30° | Jain et al. 2016 [A10] | Y |
| 4.13 | Ankle sprain fulcrum, indoor and court sports | Lateral forefoot **53%**, lateral midfoot 40%. Landing on another player's foot 55% (inversion 79%). Direct contact 67% | % | 445 video cases | Bagehorn et al. 2024 [A11] | Y (abstract) |
| 4.14 | Football sprains | Inversion **48%**, high-ankle 21%, eversion 18%. At injury frame, inversion sprains reached a median **70°** inversion (+57.5° from initial contact), foot flat in 92%, foot internally rotated in 100% | – | elite men's football, n = 140 (kinematics n = 20) | Buckthorpe et al. 2025 [A12] | Y |
| 4.15 | Peroneal reaction time after sprain | delayed; overall effect size 0.67 (23 studies) | – | tilt platforms | Hoch & McKeon 2014 [A13] | Y (abstract) |
| 4.16 | Expected vs unexpected tilt | Expecting the tilt cut peak inversion angle by 7% and velocity by 4%; a brace cut them by 14% and 11% | % | trapdoor 24° inversion + 15° plantarflexion, during gait | Gehring et al. 2014 [A14] | Y (abstract) |

**Passive-phase arithmetic (DERIVED, illustrative).**

- A 75 kg player (≈ 736 N) with the CoP shifted to the lateral foot edge, about 5 cm from the subtalar axis [foot geometry UNVERIFIED — background], produces about 37 N·m of inversion moment.
- At about 1 N·m/deg passive stiffness, the ankle would need about 37° of inversion before passive tissue alone balanced that moment. This ignores bony and ligament end-range stiffening.
- So until the peronei fire (≥ 54 ms) and build torque (≥ 135 ms), the foot of a laterally loaded leg **will** roll towards its lateral edge. The contact patch then shrinks to the edge, and the foot partly unloads as the leg tilts. This is consistent with 4.1, 4.6 and 4.8.

---

## 5. Support-foot unloading, CoP migration, extrapolated COM and base-of-support criteria

| # | Quantity | Value | Units | Conditions | Source | Verified |
|---|---|---|---|---|---|---|
| 5.1 | Dynamic stability condition | XCoM = x + v/ω₀ with ω₀ = √(g/l). The XCoM must stay inside the base of support (BoS). Stability margin b = minimum distance from XCoM to the BoS edge; alternative temporal margin τ | – | inverted-pendulum model; data for one- and two-foot stance, flat-foot and tiptoe | Hof et al. 2005 [B1] | Y (abstract) |
| 5.2 | Foot-placement rule | A disturbance causing a COM velocity change Δv is compensated by moving the CoP (foot) by **Δv/ω₀** in the same direction | – | walking model | Hof 2008 [B2] | Y (abstract) |
| 5.3 | ω₀ and 1/ω₀ | l = 0.9 / 1.0 / 1.1 m gives ω₀ = 3.30 / 3.13 / 2.99 s⁻¹, so 1/ω₀ = **0.30 / 0.32 / 0.34 s** | – | DERIVED from [B1] | – | DERIVED |
| 5.4 | XCoM shift per lateral Δv | Δv = 0.3 / 0.5 / 1.0 m/s moves the XCoM ~**10 / 16 / 32 cm** (l = 1.0 m) | cm | DERIVED | – | DERIVED |
| 5.5 | Lateral CoP–XCoM margin at foot contact, walking | **1.6 ± 0.7** (controls) | cm | treadmill 0.75–1.25 m/s | Hof et al. 2007 [B3] | Y (abstract) |
| 5.6 | Lateral ankle strategy (CoP shift under the stance foot) | up to ~**2 cm**; mechanical delay ~**200 ms** | cm, ms | 100 ms lateral pushes/pulls during treadmill walking | Hof et al. 2010 [B4]; Hof 2007 [B3] | Y (abstract) |
| 5.7 | Stepping strategy | needs ≥ **300 ms** before foot placement; range ~**20 cm**; healthy young adults recovered within 2 steps | ms, cm | as 5.6 | Hof 2010 [B4] | Y (abstract) |
| 5.8 | Side-by-side stance: mediolateral balance | controlled by the **hip load/unload mechanism** (abductors/adductors moving load between the feet); AP balance by the ankles | – | two force plates, quiet stance | Winter et al. 1996 [B5] | Y (abstract) |
| 5.9 | Lateral perturbation of stance: which leg steps | **96%** of stepping responses swing **the leg unloaded by the perturbation**. A lateral component cut time to foot-off by **90 ms (20%)**, lengthened the step by 7 cm (20%) and the swing by 110 ms (70%) | – | multidirectional platform, 10 young adults | Maki et al. 1996 [B6] | Y (abstract) |
| 5.10 | Implied AP time to foot-off | ~0.45 s (and ~0.36 s with a lateral component) | s | DERIVED from 5.9 (90 ms = 20%) | – | DERIVED |
| 5.11 | Change-in-support reactions | "often initiated well before the center of mass is near the stability limits"; preferred over the fixed-support hip strategy | – | review | Maki & McIlroy 1997 [B7] | Y (abstract) |
| 5.12 | Minimum stable swing duration (model) vs observed | model minimum as short as **30 ms**; observed single-step swings averaged 135 ms longer | ms | platform perturbation, young and older adults | Maki & McIlroy 1999 [B8] | Y (abstract) |
| 5.13 | Stance-leg ankle and hip help recovery after a pelvis perturbation | qualitative | – | AP/ML pelvis pushes at toe-off | Vlutters et al. 2018 [B9] | Y (abstract) |

**Implication (DERIVED from 5.3–5.7).**

- A single foot's half-width is about 4–5 cm [UNVERIFIED — background]. The CoP can be moved only about 2 cm, and only after about 200 ms.
- Any lateral COM velocity change above roughly 0.1–0.2 m/s on a single support therefore cannot be handled by the ankle on that foot. It needs a step (≥ 300 ms), a hip/trunk strategy, or load transfer to the other foot (if it is on the ground).
- A double-support stance has a much larger BoS in the direction of the stance width, and handles lateral balance by unloading one leg and loading the other (5.8). **The leg the push unloads is exactly the one that becomes free (5.9).**

---

## 6. Passive vs active response latencies

| # | Response | Latency | Conditions | Source | Verified |
|---|---|---|---|---|---|
| 6.1 | Intrinsic ankle stiffness (sagittal) | **91 ± 23%** of the stiffness needed for minimal stabilisation, i.e. passive stiffness alone is "not quite sufficient"; attributed to foot, Achilles tendon and aponeurosis; not neurally regulated in quiet stance | small piezo perturbations, quiet standing | Loram & Lakie 2002 [C1] | Y (abstract) |
| 6.2 | Short-latency stretch reflex, soleus | **44 ms** (unchanged by prior knowledge); gastrocnemius 72 ms, or 58 ms when the timing was known | split-belt acceleration at foot contact, walking | Shinya et al. 2016 [C2] | Y (abstract) |
| 6.3 | Automatic postural responses | **73–110 ms**, starting distally (ankle) and radiating to thigh and trunk | forward/backward support translations, standing | Horak & Nashner 1986 [C3] | Y (abstract) |
| 6.4 | Peroneal reflex to inversion | 54–74 ms | trapdoor (section 4) | [A1][A2][A4] | Y |
| 6.5 | Trip reflex responses | **60–140 ms** (polysynaptic) | trips in early and late swing | Eng et al. 1994 [D2] | Y (abstract) |
| 6.6 | Unloading of the perturbed foot (sprain case) | from ~**80 ms** | lab sidestep sprain | Kristianslund 2011 [A9] | Y (abstract) |
| 6.7 | Lateral ankle strategy, mechanical delay | ~**200 ms** | walking, lateral pushes | Hof 2010 [B4] | Y (abstract) |
| 6.8 | Stepping (foot placement) | ≥ **300 ms** | walking, lateral pushes | Hof 2010 [B4] | Y (abstract) |
| 6.9 | Eversion torque | 135 ms (automatic part); 305–326 ms (voluntary bulk) | sudden inversion | Konradsen 2005 [A3] | Y (abstract) |
| 6.10 | Contact-ACL timing | knee valgus +12° and flexion +24° within **40 ms** of initial contact; peak vertical GRF **3.2 BW at ~40 ms**; injury estimated ~40 ms after initial contact | 10 handball/basketball injury videos (model-based image matching) | Koga et al. 2010 [E7] | Y (abstract) |

**Synthesis.**

- About **0–40 ms:** purely mechanical. Inertia, passive joint and tendon stiffness, and boot–turf interaction decide the outcome.
- About **40–110 ms:** spinal reflexes and automatic responses begin, but force develops later (electromechanical delay).
- About **135–200 ms:** the first meaningful corrective joint torques and CoP shifts appear.
- **≥ 300 ms:** a step can land.

Injury events (ACL at ~40 ms; sprain peaks at 120–240 ms) and support loss begin inside the passive or reflex window. A simulated controller that produces large corrective torques within the first ~50 ms is faster than humans, and will make the body look braced and mannequin-like.

---

## 7. Whole-body responses to lower-limb perturbations: slips and trips

| # | Quantity | Value | Conditions | Source | Verified |
|---|---|---|---|---|---|
| 7.1 | Slip-outcome predictors | Foot slip **displacement** (not velocity) and shank angle at heel strike predicted outcome (~70% correctly classified). The traditional limits of 10 cm displacement and 50 cm/s velocity "may not accurately represent the upper limits beyond which recovery is not possible" | 33 young barefoot adults, oily vinyl, harness | Brady et al. 2000 [D1] | Y (abstract) |
| 7.2 | Novel unconstrained slip | can travel up to **0.7 m** at a peak speed of **2.51 m/s** | young adults, overground | Yang 2014 citing Yang & Pai 2007 and Yang 2009 [D3] | Y (secondary) |
| 7.3 | Novel "free" slip outcome, untrained | **100%** backward balance loss (controls); 58.3% after 18 cm slip training; 83.3% after 12 cm training | n = 12 per group; slip up to 150 cm; fall = harness load > 30% BW | Yang et al. 2014 [D3] | Y |
| 7.4 | Unilateral vs bilateral slips | **0 falls** (unilateral) vs **6/28 = 21.4%** falls (bilateral); falls reached the harness threshold **515 ± 175 ms** after slip onset | young adults walking at 1.3 ± 0.1 m/s; wearable slip devices; leading-foot slip in early stance and trailing-foot slip in late stance | Ouattas et al. 2025 [D4] | Y |
| 7.5 | Trip recovery strategies | Early swing: **elevating** strategy (swing-limb flexion, stance-limb extension and early heel-off to raise the COM). Late swing: **lowering** strategy (rapid placement of the swing foot, shorter step). Reflex latencies 60–140 ms | treadmill/overground walking | Eng et al. 1994 [D2] | Y (abstract) |
| 7.6 | Trip falls in older adults | Fallers showed "insufficient reduction of the angular momentum during push-off" by the **support limb**, slower rate of joint-moment generation, and poorer recovery-limb placement | obstacle appearing from the floor; 12 young, 11 older | Pijnappels et al. 2005 [D5] | Y (abstract) |
| 7.7 | Fall direction | Slip (foot slides forward under the body): **backward** balance loss, defined by where the recovery heel lands relative to the slipping heel. Trip (swing foot arrested): forward rotation | – | slips: Yang 2014 [D3]; trips [UNVERIFIED — from background knowledge; Pijnappels' abstract implies forward angular momentum but does not state the direction] | partly Y |

**Mechanical reading for tackles.**

- A slip is the case of a support foot displaced under a loaded body. A trip is the case of a swing foot arrested while the body continues. A tackle can do either, depending on whether it hits the stance foot or the swing foot.
- Slip data show that falls depend on how far the support base moves, and whether **both** supports lose traction, more than on slip speed alone.
- These are walking studies at 1.3 m/s with harnesses. Football speeds and impact impulses are larger, which would push outcomes towards the "fall" end [inference].

---

## 8. Collision-induced loss of support in football: video and injury evidence

| # | Finding | Value | Conditions | Source | Verified |
|---|---|---|---|---|---|
| 8.1 | Football-specific ankle mechanism 1 | Opponent's impact on the **medial aspect of the leg just before or at foot strike** gives a laterally directed force, and the player **lands with the ankle inverted** | 26 videoed ankle injuries, Norwegian and Icelandic elite football | Andersen et al. 2004 *AJSM* [E1] | Y (abstract) |
| 8.2 | Ankle mechanism 2 | Forced plantarflexion when the injured player hits the opponent's foot while shooting or clearing | as 8.1 | [E1] | Y (abstract) |
| 8.3 | Support state at injury frame (sprains) | **one foot on ground 109/140 (78%)**, two feet 29 (21%). **Injured leg loaded 122 (87%)**. Horizontal speed moderate/high in 73%; vertical speed zero in 114 | elite men's football, 2 seasons, 140 videos | Buckthorpe et al. 2025 [A12] | Y |
| 8.4 | Situation | **Being tackled 59 (42%)**: blow from outside 33, inside 21, front 1, unsure 4; 57 of 59 were direct contact. Tackling/pressing 24%; landing 11%; sliding 5%. Contact: direct 50%, indirect 30% (half to foot or tibia, half elsewhere including upper body), none 20% | as 8.3 | [A12] | Y |
| 8.5 | Typical "being tackled" sequence | pressed, attempted sliding tackle, **ground contact plus player contact to the injured leg**, injury frame, **loss of balance** | Figure 2 description | [A12] | Y |
| 8.6 | ACL mechanisms, men's professional football | non-contact 44%, **indirect contact 44%**, direct 12%. "Players were frequently **perturbed immediately prior to injury**." Situations include pressing/tackling (n = 55) and **being tackled (n = 24)**. Valgus loading 81% | 134 Serie A cases | Della Villa et al. 2020 [E2] | Y (abstract) |
| 8.7 | ACL mechanisms, women's professional football | non-contact 49%, indirect 41%, direct 10%. Being tackled **15%**. Pressing/tackling posture ~50° hip flexion, ~25° knee flexion; valgus in 54% | 25 leagues, 2022–24 | Hampstead et al. 2026 [E3] | Y |
| 8.8 | ACL patterns, women's Bundesliga | non-contact 46%, indirect 38%, direct 16%. Patterns include "parallel sprinting and tackling" (indirect) and "knee-to-knee" (direct) | 37 cases | Achenbach et al. 2024 [E4] | Y |
| 8.9 | ACL, Qatar men's league | 15 injuries. Valgus in two-thirds. Direct-contact cases: 2 while tackling, 1 while being tackled | 6 seasons | Rekik et al. 2023 [E5] | Y |
| 8.10 | Tackle parameters and injury | Tackles **from the side** were **twice** as likely as tackles from behind to need post-match medical attention. Two-footed tackles and clashes of heads had the highest injury propensity for tackled players | 123 matches, 3 FIFA tournaments | Fuller et al. 2004 [E6] | Y (abstract) |
| 8.11 | Women's elite tackles | 3531 tackles. About half of contact challenges came from the side with the tackler staying on her feet. **2.7%** were risk situations. **Sliding-in tackles from behind and the side** had the highest risk potential | 24 matches | Tscholl et al. 2007 [E8] | Y (abstract) |
| 8.12 | Awareness | "in most cases the exposed player seemed to be **unaware of the opponent**" | Norwegian elite, 425 incidents | Andersen et al. 2004 *BJSM* [E9] | Y (abstract) |

**What the evidence says about the struck player's support state.**

- Among injured (videoed) players, the struck leg is usually the **loaded** leg (87%), in **single support** (78%), at moderate or high horizontal speed. Ankle injuries cluster at **foot strike**, when the foot is landing and the load is ramping up.
- There is a selection bias: injury requires load in the injured limb. **No study was found that reports the support state of all tackled players, injured or not.**

---

## 9. Lateral, posterior and lower-leg perturbations: a displaced stance foot vs a planted one

| # | Finding | Value | Conditions | Source | Verified |
|---|---|---|---|---|---|
| 9.1 | Lateral pushes during walking | ankle strategy ≤ 2 cm after ~200 ms; stepping ≥ 300 ms, ~20 cm range | 100 ms pushes/pulls at the pelvis | Hof 2010 [B4] | Y (abstract) |
| 9.2 | Lateral platform perturbation of standing | The **unloaded** leg is swung in 96% of steps; a lateral component speeds foot-off by 90 ms | young adults | Maki 1996 [B6] | Y (abstract) |
| 9.3 | One support lost vs both | unilateral slip 0% falls vs bilateral slip 21% falls | walking | Ouattas 2025 [D4] | Y |
| 9.4 | Judo osoto-gari (reaping the opponent's supporting leg) | sweeping-leg velocity at sweep contact **4.16 ± 0.97 m/s** | 17 black belts, motion capture at 250 Hz | Liu et al. 2025 *PeerJ* [F1] | Y |
| 9.5 | Defending osoto-gari | maximum knee valgus 10 ± 5°, valgus moment **58 ± 17 N·m** (common defence); 31 ± 9 N·m with a modified defence | 26 elite judoka | Lambert et al. 2022 [F2] | Y (abstract) |
| 9.6 | Pedestrian–bumper impacts, a lower-leg strike well below the COM | Post-mortem human subjects struck laterally in **mid-gait stance** at 40 km/h. Tibia bent predominantly medially. Lower-limb axial forces 1–3 kN and bending moments > 300 N·m (sedan). Whole-body trajectories (knee, ankle, pelvis, head) published as corridors | struck-side limb; vehicle buck | Untaroiu et al. 2007 [F3]; Forman et al. 2015 [F4] | Y (abstract) |

**Gap.** No study was found that directly compares lateral **waist** pulls with lateral **lower-leg/shank** perturbations in standing or running healthy athletes, or that applies a "leg-sweep" to the loaded stance foot. The closest analogues are:

- slips (stance foot displaced);
- trips (swing foot arrested);
- judo foot reaps, whose biomechanics studies focus on the attacker;
- pedestrian bumper impacts (passive cadavers, far higher speed).

All support the same mechanism: **when the support foot is displaced or unloaded beneath the COM, the body rotates about its COM and falls opposite to the direction the foot moved, and the trunk is carried.** Recovery is possible when another loaded support remains (unilateral slip) or a step can be placed in time.

---

## 10. Disturbance levels and standing vs running

These classes are evidence-based where marked; the thresholds are **inferences** and should be calibrated.

### LIGHT: absorbed; foot stays planted

- Horizontal demand at the foot stays inside the ordinary-play range: |F_h|/F_z of about 0.4–0.8 (3.1–3.5), well below the available ~0.9–2.7 (1.4, 1.6, 1.1).
- Torque per unit load ≤ ~20 mm (2.19), well below the available 39–102 mm.
- The XCoM stays inside the BoS. Single support allows only about 1–2 cm of CoP correction (5.5–5.6). Double support allows the stance width.
- Inversion velocity stays in the normal range, below about 85°/s (4.7).
- **Response:** passive stiffness plus reflexes (≥ 44 ms) and automatic responses (73–110 ms). The foot stays loaded, so traction holds.
- *Expected look:* upper-body sway, small knee flexion, feet stay.

### MODERATE: foot rolls, slips or unloads; struck leg yields; pelvis displaced; recovery possible

- The tackler's contact on the medial lower leg near foot strike forces the foot to land or roll inverted (8.1).
- Inversion velocity goes above about 300°/s (4.7), towards the ~400–1000°/s range (4.6, 4.8). The foot rolls onto its lateral forefoot or midfoot edge (4.13), and the patch shrinks.
- Partial unloading of the struck foot starts at about 80 ms (4.10, 6.6), and grip falls with load (1.14).
- The XCoM moves beyond the single-foot BoS, but a second foot is available (double support), or a step can land in ≥ 300 ms (5.7).
- *Evidence analogue:* unilateral slip, 0% falls in young adults (7.4).
- *Expected look:* struck leg displaced or buckled, pelvis translates or rotates, recovery step or hop, sometimes a stumble.

### LARGE: support lost; feet swept; fall

- The struck foot is displaced or released while the other foot is unloaded, in swing, or itself rolls over its edge. This is the bilateral-slip analogue: 21% falls even in young walkers at 1.3 m/s; in football the impulse is larger [inference].
- Or the XCoM excursion cannot be caught in the time available. For example, Δv ≥ ~0.5 m/s gives an XCoM shift of at least 16 cm in about 0.3 s (5.4), close to or beyond a single step's ~20 cm range at a ≥ 300 ms delay [DERIVED/inference].
- On natural grass the loaded cleat may shear the turf (divot release at ~2.5–4 kN). On 3G it tends to hold, so the leg structures take the load (injury risk) instead of the foot releasing (1.8–1.13, 1.18).
- *Expected look:* feet leave the ground or are swept, the pelvis drops and rotates, the trunk is carried over or through the tackle, and the player falls.

### Standing with both feet planted and loaded vs running and struck on the stance leg

**Standing, double support, both feet loaded:**

- Lateral balance works by moving load between the feet (5.8), and the BoS is wide in the stance-width direction.
- If one foot is struck, the other already carries load and can take the rest: the unilateral-slip analogue.
- The push unloads the near foot, which is the one humans then move (5.9).
- So a standing player is **more likely** to stay up after a moderate blow. Hinging over the **loaded** far foot is plausible here, but the far foot itself rolls onto its lateral edge if the XCoM passes it (section 4), rather than staying flat.

**Running, struck on the stance leg:**

- Usually single support (8.3), with the COM moving at 3–8 m/s.
- The other foot is in swing, so no second support is loaded.
- Contact often comes **at foot strike**, while the load is still rising and grip is still building (8.1).
- Removing or rolling the stance foot takes away the **only** support. Recovery needs the swing foot to land in time, and the ≥ 300 ms stepping delay applies [running-specific timing UNVERIFIED].
- This configuration fits the LARGE class much more readily, and is the classic "sliced-out" picture.

---

## 11. Implications for simulation

These are recommendations inferred from the evidence above, not results.

1. **Don't create support loss by lowering μ.**
   - A realistic loaded studded foot has an effective μ of about 1–2.5 (sections 1–2).
   - Make traction **load-dependent and sub-linear**: for example μ_eff ≈ 2 at about 0.3 kN, falling to about 0.9–1.1 at 2–3 kN. Fit to rows 1.4, 1.6, 1.10 and 1.1, using the turf type.
   - Real support loss comes from **normal-load collapse** (unloading) and direct displacement of the foot, not from a slippery surface.

2. **Give the boot–turf contact a finite "engagement".**
   - Peak force should come after about 15–30 mm of tangential travel (or about 30–40° of rotation at a 46 mm stud radius) and about 40–50 ms.
   - Natural grass: post-peak softening (shear failure or divot, lower residual).
   - 3G: post-peak "hold" or infill sliding.
   - Ordinary play stays below about 12 mm of travel (2.7), so this changes nothing for normal locomotion.

3. **Rotation.** Peak T/N ≈ 40–100 mm in pure rotation, lower under combined shear (≈ 40–50 mm at 0.3–0.5 kN), peaking at about 30–40°. A flat μ = 1 foot box is roughly in range for a fully loaded flat foot. Pivoting on the forefoot or heel shrinks the patch and should reduce T accordingly.

4. **Ankle and subtalar compliance is probably the main missing degree of freedom.**
   - Passive inversion stiffness is only about 1 N·m/deg; reflex EMG starts at 54–74 ms; eversion torque at ≥ 135 ms.
   - A struck or laterally loaded foot should roll onto its lateral edge at hundreds of °/s within the first ~50–100 ms.
   - A rigid flat foot with a stiff ankle keeps the full patch and full load, and so produces "anchored hinge" behaviour.

5. **Respect latencies.**
   - About 0–40 ms passive, 40–110 ms reflex onset, ~135–200 ms first useful torques and CoP shifts, ≥ 300 ms steps.
   - A balance controller that pushes back hard within 50 ms (or acts on information with zero delay) will make the body brace like a mannequin.

6. **Load transfer and unloading.**
   - In double support, the leg the push unloads should be free to move, swept or stepped.
   - Reflex "unloading" (hip, knee and ankle flexion that relieves ankle load, from about 80 ms) is a documented human response to sudden inversion, and it releases grip.

7. **Contact geometry.** The tackler's leg or boot meeting the struck foot or shank near the ground should be able to **displace the foot itself**, both by applying tangential impulse at the foot and by creating normal force that lifts or rolls it. It should not act only on the shank above an anchored foot.

8. **Sanity metrics to log in PVP runs.**
   - per-foot F_z(t), |F_h|/F_z and T/F_z, against the available curve;
   - inversion angle and velocity (flag > 300°/s);
   - XCoM against the BoS margin over time;
   - time of first corrective torque relative to contact;
   - number of loaded supports at contact and at +100/+200/+300 ms.

---

## 12. Bibliography (sources opened)

"Accessed via" names the URL I actually fetched. Europe PMC API URLs return the abstract or full-text record. Where I fetched a search query, the record was identified by the PMID shown. Volume and page numbers are given only where I saw them.

**Traction and turf**

- [T1] Thomson A, Whiteley R, Wilson M, Bleakley C. (2019). Six different football shoes, one playing surface and the weather; Assessing variation in shoe-surface traction over one season of elite football. *PLoS One* 14(4): e0216364. doi:10.1371/journal.pone.0216364. PMID 31039209. Full text accessed via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6490939/fullTextXML
- [T2] Loud D, Grimshaw P, Kelso R, Robertson WSP. (2024). Effect of Soccer Boot Outsole Configuration on Translational Traction Across Both Natural and Artificial Playing Surfaces. *Orthop J Sports Med* 12(8): 23259671241259823. doi:10.1177/23259671241259823. Full text accessed via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11311168/fullTextXML
- [T3] Blackburn S. (2012). *The biomechanical interaction between sports players and artificial turf for the development of a validated artificial turf testing rig.* PhD thesis, University of Strathclyde. doi:10.48730/02m3-0365. Landing page https://stax.strath.ac.uk/concern/theses/j098zb13j; full PDF (307 pp.) accessed via https://stax.strath.ac.uk/downloads/1v53jx27f?locale=en
- [T4] Kent R, Forman JL, Lessley D, Crandall J. (2015). The mechanics of American football cleats on natural grass and infill-type artificial playing surfaces with loads relevant to elite athletes. *Sports Biomech.* doi:10.1080/14763141.2015.1052749. PMID 26114885. Abstract via the Europe PMC REST search API (https://www.ebi.ac.uk/europepmc/webservices/rest/search, query AUTH:"Kent R" shoe/cleat turf, resultType=core).
- [T5] Kent R, Forman JL, Crandall J, Lessley D. (2015). The mechanical interactions between an American football cleat and playing surfaces in-situ at loads and rates generated by elite athletes: a comparison of playing surfaces. *Sports Biomech.* doi:10.1080/14763141.2015.1024277. PMID 25900121. Abstract via the Europe PMC REST search API (same query as [T4]).
- [T6] Kent R, Yoder J, O'Cain CM, Meade Spratley E, Arbogast KB, Sorochan J, McNitt A, Serensits T. (2021). Force-limiting and the mechanical response of natural turfgrass used in the National Football League… *J Biomech.* doi:10.1016/j.jbiomech.2021.110670. PMID 34391130. Abstract via the Europe PMC REST search API (same query as [T4]).
- [T7] Koerber B, Gepner B, Jayathirtha M, Caldwell J, O'Cain C, Spratley EM, Park G, Kent R, Kerrigan J. (2026). Assessment of the Mechanics of the Shoe-Turf Release Phenomenon Over a Range of Normal Loads. Research Square preprint, doi:10.21203/rs.3.rs-8904480/v1. Abstract via the Europe PMC REST search API (DOI query). Full text at https://www.researchsquare.com/article/rs-8904480/v1 did not render.
- [T8] Kuhlman S, Sabick M, Pfeiffer R, Cooper B, Forhan J. (2009/2010). Effect of loading condition on the traction coefficient between shoes and artificial turf surfaces. *Proc IMechE Part P: J Sports Eng Technol.* doi:10.1243/17543371JSET56. Abstract via the Crossref API (https://api.crossref.org/works?query.bibliographic=Kuhlman+effect+of+loading+condition…). Crossref lists the issue year as 2009 and Semantic Scholar as 2010.
- [T9] McGowan H, Fleming P, Pak JH, James D, Forrester S. (2023). The effect of rotational velocity on rotational traction across a range of artificial turf surface systems. *Sci Rep.* doi:10.1038/s41598-023-48134-0. Full text accessed via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC10703925/fullTextXML
- [T10] Jastifer J, Kent R, Crandall J, Sherwood C, Lessley D, McCullough KA, Coughlin MJ, Anderson RB. (2017). The Athletic Shoe in Football. *Sports Health.* doi:10.1177/1941738117690717. Full text accessed via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5349396/fullTextXML
- [T11] Wannop JW, Worobets JT, Stefanyshyn DJ. (2010). Footwear traction and lower extremity joint loading. *Am J Sports Med* 38(6): 1221–1228. doi:10.1177/0363546509359065. Abstract accessed via https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=19188559,20348282&rettype=abstract&retmode=text
- [T12] Ismail SI, Nunome H, Tamura Y. (2021). The Influence of Forefoot Bending Stiffness of Futsal Shoes on Multiple V-Cut Run Performance. *Front Psychol.* doi:10.3389/fpsyg.2021.625079. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8211443/fullTextXML
- [T13] FIFA (2015). *FIFA Quality Programme for Football Turf — Test Manual I: Test Methods, 2015 Edition (v3.4).* PDF accessed via https://digitalhub.fifa.com/m/f13b1cd18027f40/original/FIFA-quality-programme-for-football-turf-Test-Manual-I-Test-Methods-2015v-3-4.pdf (Test Methods 06 and 06a, pp. 27–31).
- [T14] McGowan H, Fleming P, James D, Morris J, Forrester S. (2025). The development and validation of a performance infill tracking system to investigate rotational traction mechanisms on artificial turf surfaces. *Sci Rep.* doi:10.1038/s41598-025-92768-1. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11911398/fullTextXML
- [T15] Wannop JW, Luo G, Stefanyshyn DJ. (2013). Footwear traction and lower extremity noncontact injury. *Med Sci Sports Exerc.* doi:10.1249/mss.0b013e318299ac56. PMID 23657169. Abstract via the Europe PMC REST search API (query AUTH:"Wannop JW" AND traction).
- [T16] Villwock MR, Meyer EG, Powell JW, Fouty AJ, Haut RC. (2009). Football playing surface and shoe design affect rotational traction. *Am J Sports Med* 37(3): 518–525. doi:10.1177/0363546508328108. Abstract via https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=16399930,19168808&rettype=abstract&retmode=text
- [T17] Livesay GA, Reda DR, Nauman EA. (2006). Peak torque and rotational stiffness developed at the shoe-surface interface: the effect of shoe type and playing surface. *Am J Sports Med* 34(3): 415–422. doi:10.1177/0363546505284182. Abstract via the same efetch URL as [T16].
- Also opened, supporting only:
  - Wannop JW, Stefanyshyn DJ (2016). *J Sports Sci*, doi:10.1080/02640414.2015.1066023 (abstract, Europe PMC).
  - Grund T, Senner V (2010). Traction behavior of soccer shoe stud designs under different game-relevant loading conditions. *Procedia Eng*, doi:10.1016/j.proeng.2010.04.066. Abstract via https://api.semanticscholar.org/graph/v1/paper/DOI:10.1016/j.proeng.2010.04.066 ("aggressively cleated shoes did not generate higher torque"; full text blocked).
  - Silva DCF et al. (2017). *Appl Bionics Biomech*, PMC5480019 (full text).
  - Yang F et al. (2026). *Sports Med Open*, PMC13246976 (full text).
  - Severn K et al. (2011), *Proc IMechE P*, doi:10.1177/1754337111408980; and Forrester S, Fleming P (2019), *Eng Rep*, doi:10.1002/eng2.12066 — abstracts only, via Crossref; no numbers used.

**Required friction**

- [T18] Yamaguchi T, Suzuki A, Hokkirigawa K. (2017). Required coefficient of friction in the anteroposterior and mediolateral direction during turning at different walking speeds. *PLoS One.* doi:10.1371/journal.pone.0179817. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5480978/fullTextXML
- [T19] Frias Bocanegra JM, Fong DTP. (2022). Playing surface traction influences movement strategies during a sidestep cutting task in futsal… *Sports Biomech.* doi:10.1080/14763141.2021.1980606. Abstract via the Europe PMC REST search API (EXT_ID:34581653).

**Ankle and foot**

- [A1] Konradsen L, Voigt M, Højsgaard C. (1997). Ankle inversion injuries. The role of the dynamic defense mechanism. *Am J Sports Med.* doi:10.1177/036354659702500110. PMID 9006692. Abstract via the Europe PMC REST search API (query AUTH:"Konradsen L").
- [A2] Konradsen L, Ravn JB. (1990). Ankle instability caused by prolonged peroneal reaction time. *Acta Orthop Scand.* doi:10.3109/17453679008993546. PMID 2239158. Abstract via Europe PMC (same query as [A1]).
- [A3] Konradsen L, Peura G, Beynnon B, Renström P. (2005). Ankle eversion torque response to sudden ankle inversion… *J Orthop Res.* doi:10.1016/j.orthres.2004.07.005. PMID 15734242. Abstract via Europe PMC (same query as [A1]).
- [A4] Fong DT, Chan YY, Mok KM, Yung PS, Chan KM. (2009). Understanding acute ankle ligamentous sprain injury in sports. *Sports Med Arthrosc Rehabil Ther Technol* 1:14. doi:10.1186/1758-2555-1-14. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC2724472/fullTextXML
- [A5] Nieuwenhuijzen PH, Grüneberg C, Duysens J. (2002). Mechanically induced ankle inversion during human walking and jumping. *J Neurosci Methods.* doi:10.1016/s0165-0270(02)00089-4. PMID 12100978. Abstract via the Europe PMC REST search API.
- [A6] Chu VW, Fong DT, Chan YY, Yung PS, Fung KY, Chan KM. (2010). Differentiation of ankle sprain motion and common sporting motion by ankle inversion velocity. *J Biomech.* doi:10.1016/j.jbiomech.2010.03.029. PMID 20392447. Abstract via the Europe PMC REST search API.
- [A7] Lysdal FG, Wang Y, Delahunt E, et al. (2022). What have we learnt from quantitative case reports of acute lateral ankle sprains injuries and episodes of 'giving-way'…? *Sports Biomech.* doi:10.1080/14763141.2022.2035801. PMID 35189066. Abstract via the Europe PMC REST search API.
- [A8] Fong DTP, Mok KM, Thompson IM, Wang Y, Shan W, King MA. (2023). A lateral ankle sprain during a lateral backward step in badminton: A case report of a televised injury incident. *J Sport Health Sci.* doi:10.1016/j.jshs.2021.03.007. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC9923400/fullTextXML
- [A9] Kristianslund E, Bahr R, Krosshaug T. (2011). Kinematics and kinetics of an accidental lateral ankle sprain. *J Biomech.* doi:10.1016/j.jbiomech.2011.07.014. PMID 21824618. Abstract via the Europe PMC REST search API.
- [A10] Jain TK, Wauneka CN, Liu W. (2016). Four Weeks of Balance Training does not Affect Ankle Joint Stiffness in Subjects with Unilateral Chronic Ankle Instability. *Int J Sports Exerc Med.* doi:10.23937/2469-5718/1510036. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5025258/fullTextXML
- [A11] Bagehorn T, de Zee M, Fong DTP, Thorborg K, Kersting UG, Lysdal FG. (2024). Lateral Ankle Joint Injuries in Indoor and Court Sports: A Systematic Video Analysis of 445 Nonconsecutive Case Series. *Am J Sports Med.* doi:10.1177/03635465241241760. Abstract via the Europe PMC REST search API.
- [A12] Buckthorpe M, Verhagen E, D'Hooghe P, Osti L, Di Paolo S, Della Villa F. (2025). Systematic video analysis of ankle sprain injuries in elite male football (soccer)… 140 consecutive players. *Knee Surg Sports Traumatol Arthrosc.* doi:10.1002/ksa.70049. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12582226/fullTextXML
- [A13] Hoch MC, McKeon PO. (2014). Peroneal reaction time after ankle sprain: a systematic review and meta-analysis. *Med Sci Sports Exerc.* doi:10.1249/mss.0b013e3182a6a93b. Abstract via the Europe PMC REST search API.
- [A14] Gehring D, Wissler S, Lohrer H, Nauck T, Gollhofer A. (2014). Expecting ankle tilts and wearing an ankle brace influence joint control in an imitated ankle sprain mechanism during walking. *Gait Posture.* doi:10.1016/j.gaitpost.2013.11.016. Abstract via the Europe PMC REST search API.

**Balance and latency**

- [B1] Hof AL, Gazendam MG, Sinke WE. (2005). The condition for dynamic stability. *J Biomech.* doi:10.1016/j.jbiomech.2004.03.025. PMID 15519333. Abstract via the Europe PMC REST search API.
- [B2] Hof AL. (2008). The 'extrapolated center of mass' concept suggests a simple control of balance in walking. *Hum Mov Sci.* doi:10.1016/j.humov.2007.08.003. Abstract via Europe PMC.
- [B3] Hof AL, van Bockel RM, Schoppen T, Postema K. (2007). Control of lateral balance in walking… *Gait Posture.* doi:10.1016/j.gaitpost.2006.04.013. Abstract via Europe PMC.
- [B4] Hof AL, Vermerris SM, Gjaltema WA. (2010). Balance responses to lateral perturbations in human treadmill walking. *J Exp Biol.* doi:10.1242/jeb.042572. PMID 20639427. Abstract via Europe PMC.
- [B5] Winter DA, Prince F, Frank JS, Powell C, Zabjek KF. (1996). Unified theory regarding A/P and M/L balance in quiet stance. *J Neurophysiol.* doi:10.1152/jn.1996.75.6.2334. Abstract via Europe PMC.
- [B6] Maki BE, McIlroy WE, Perry SD. (1996). Influence of lateral destabilization on compensatory stepping responses. *J Biomech.* doi:10.1016/0021-9290(95)00053-4. Abstract via Europe PMC.
- [B7] Maki BE, McIlroy WE. (1997). The role of limb movements in maintaining upright stance: the "change-in-support" strategy. *Phys Ther.* doi:10.1093/ptj/77.5.488. Abstract via Europe PMC.
- [B8] Maki BE, McIlroy WE. (1999). The control of foot placement during compensatory stepping reactions… *IEEE Trans Rehabil Eng.* doi:10.1109/86.750556. Abstract via Europe PMC.
- [B9] Vlutters M, van Asseldonk EHF, van der Kooij H. (2018). Lower extremity joint-level responses to pelvis perturbation during human walking. *Sci Rep.* doi:10.1038/s41598-018-32839-8. Abstract via Europe PMC.
- [C1] Loram ID, Lakie M. (2002). Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. *J Physiol.* doi:10.1113/jphysiol.2002.025049. Abstract via Europe PMC.
- [C2] Shinya M, Kawashima N, Nakazawa K. (2016). Temporal, but not Directional, Prior Knowledge Shortens Muscle Reflex Latency in Response to Sudden Transition of Support Surface During Walking. *Front Hum Neurosci.* doi:10.3389/fnhum.2016.00029. Abstract via Europe PMC.
- [C3] Horak FB, Nashner LM. (1986). Central programming of postural movements: adaptation to altered support-surface configurations. *J Neurophysiol.* doi:10.1152/jn.1986.55.6.1369. Abstract via Europe PMC.

**Slips and trips**

- [D1] Brady RA, Pavol MJ, Owings TM, Grabiner MD. (2000). Foot displacement but not velocity predicts the outcome of a slip induced in young subjects while walking. *J Biomech.* doi:10.1016/s0021-9290(00)00037-3. Abstract via Europe PMC.
- [D2] Eng JJ, Winter DA, Patla AE. (1994). Strategies for recovery from a trip in early and late swing during human walking. *Exp Brain Res.* doi:10.1007/bf00227520. Abstract via Europe PMC.
- [D3] Yang F, Wang TY, Pai YC. (2014). Reduced intensity in gait-slip training can still improve stability. *J Biomech.* doi:10.1016/j.jbiomech.2014.04.021. Full text via https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=4098761
- [D4] Ouattas A, Walski A, Mun S, Rasmussen CM, Stergiou N, Hunt NH. (2025). Higher fall rates and broader kinematic diversity in bilateral versus unilateral unconstrained slips. *PLoS One.* doi:10.1371/journal.pone.0328900. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12331078/fullTextXML
- [D5] Pijnappels M, Bobbert MF, van Dieën JH. (2005). Push-off reactions in recovery after tripping discriminate young subjects, older non-fallers and older fallers. *Gait Posture.* doi:10.1016/j.gaitpost.2004.04.009. Abstract via Europe PMC.

**Football injury mechanisms and tackles**

- [E1] Andersen TE, Floerenes TW, Arnason A, Bahr R. (2004). Video analysis of the mechanisms for ankle injuries in football. *Am J Sports Med.* doi:10.1177/0363546503262023. PMID 14754862. Abstract via Europe PMC.
- [E2] Della Villa F, Buckthorpe M, Grassi A, et al. (2020). Systematic video analysis of ACL injuries in professional male football (soccer)… 134 consecutive cases. *Br J Sports Med.* doi:10.1136/bjsports-2019-101247. PMID 32561515. Abstract via Europe PMC.
- [E3] Hampstead W, Lovell R, Whalan M, et al. (2026). Mechanisms and situational patterns of anterior cruciate ligament injuries in professional women's football… 25 leagues (2022–2024). *Knee Surg Sports Traumatol Arthrosc.* doi:10.1002/ksa.70528. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC13502420/fullTextXML
- [E4] Achenbach L, Bloch H, Klein C, et al. (2024). Four distinct patterns of anterior cruciate ligament injury in women's professional football (soccer)… *Br J Sports Med.* doi:10.1136/bjsports-2023-107113. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11228206/fullTextXML
- [E5] Rekik RN, Bahr R, Cruz F, et al. (2023). Mechanisms of ACL injuries in men's football: A systematic video analysis over six seasons in the Qatari professional league. *Biol Sport.* doi:10.5114/biolsport.2023.118024. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC10108748/fullTextXML
- [E6] Fuller CW, Smith GL, Junge A, Dvorak J. (2004). The influence of tackle parameters on the propensity for injury in international football. *Am J Sports Med.* doi:10.1177/0363546503261248. Abstract via Europe PMC.
- [E7] Koga H, Nakamae A, Shima Y, et al. (2010). Mechanisms for noncontact anterior cruciate ligament injuries: knee joint kinematics in 10 injury situations from female team handball and basketball. *Am J Sports Med.* doi:10.1177/0363546510373570. Abstract via the Europe PMC REST search API (EXT_ID:20595545).
- [E8] Tscholl P, O'Riordan D, Fuller CW, Dvorak J, Junge A. (2007). Tackle mechanisms and match characteristics in women's elite football tournaments. *Br J Sports Med.* doi:10.1136/bjsm.2007.036889. Abstract via https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=2465246 (only the abstract was returned).
- [E9] Andersen TE, Tenga A, Engebretsen L, Bahr R. (2004). Video analysis of injuries and incidents in Norwegian professional football. *Br J Sports Med.* doi:10.1136/bjsm.2003.007955. Abstract via Europe PMC.

**Analogues**

- [F1] Liu L, Deguchi T, Shiokawa M, Hamaguchi K, Shinya M. (2025). Analysing head and trunk motion in the judo osoto-gari technique: relationship to sweeping-leg velocity. *PeerJ.* doi:10.7717/peerj.18862. Full text via https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11766671/fullTextXML
- [F2] Lambert C, Riesterer J, Mauch M, Lambert M, Paul J, Ritzmann R. (2022). Modified defense reaction reduces biomechanical and myoelectrical ACL injury risk factors in elite Judo. *J Sports Sci.* doi:10.1080/02640414.2022.2080160. Abstract via Europe PMC.
- [F3] Untaroiu C, Kerrigan J, Kam C, et al. (2007). Correlation of strain and loads measured in the long bones with observed kinematics of the lower limb during vehicle-pedestrian impacts. *Stapp Car Crash J.* doi:10.4271/2007-22-0018. Abstract via Europe PMC.
- [F4] Forman JL, Joodaki H, Forghani A, et al. (2015). Whole-body Response for Pedestrian Impact with a Generic Sedan Buck. *Stapp Car Crash J.* doi:10.4271/2015-22-0016. Abstract via Europe PMC.

**Count.** 69 entries are listed above, including 6 used only for support. Four more were opened but not used: Li & Qian 2025 (*Sci Rep*, PMC12749382), Song et al. 2017 (Stapp) and Tierney et al. 2017/2018. Items found only as search hits are not counted. About 21 of the listed sources were read in full (PMC full texts, the FIFA PDF and the thesis); the rest were read as abstracts.

---

## 13. Uncertainty and gaps

1. **Translational traction across loads.**
   - No single source covers 0.2–3 kN with the same boot, surface and speed.
   - "Sub-linear / decreasing μ" rests on Blackburn's within-rig comparison (which also changed the loading mode), cross-device comparisons (Thomson vs Kent), and McGowan's rotational load test.
   - Kuhlman's abstract does not give the direction of the slope change.
   - Koerber's release-traction slope and intercept were not accessible.

2. **Displacement to peak (translational).**
   - Only Blackburn's rig gives values (15–25 mm mean peak horizontal displacement). The PDF text extraction attaches the same table to both static and dynamic tests, so the attribution is uncertain.
   - These are peak displacements, not displacement at peak force.
   - Kent 2021 published load–displacement corridors, but the full text was not accessible.

3. **Static vs dynamic (sliding) traction for boots on turf.** No verified post-peak ratio was found. Kuhlman computed static, dynamic and peak TC, but the values were not accessible.

4. **Device speeds are far below play.** Turf testers move at about 67–200 mm/s or 30–90°/s; play involves metres per second. Speed effects are documented, with traction rising with speed up to a plateau (McGowan 2023; Wannop, secondary).

5. **Rotational vs flat-plate comparison.** This is derived. It depends on the assumed contact patch and rotation axis (the S2T2 axis location is unknown) and on uniform pressure. Treat the factors as order-of-magnitude only.

6. **FIFA limits (25–50 / 30–45 N·m)** are taken from McGowan 2023 citing the FIFA Handbook of Requirements. Only the Test Methods manual itself was opened.

7. **Utilised friction in football.** The direct measurements are from 13 players on 3G (Blackburn). The Valiant, Morag & Johnson, and Shorten values are secondary, and from American football or AstroTurf.

8. **Support state at contact.** The only verified distribution comes from injured players (Buckthorpe), which is biased towards loaded limbs. There are no data on all tackled players, or on how often the far foot is in swing at contact.

9. **Stance-leg (lower-leg) perturbations vs waist pulls.** No direct study was found. The evidence is by analogy: slips, trips, judo reaps, and cadaver pedestrian impacts (passive, 40 km/h).

10. **Latencies** come mostly from standing or walking lab paradigms with healthy adults, not from athletes being tackled at speed. Startle, first-trial effects (Allum's work, abstract only, not tabulated) and anticipation (Gehring 2014) can shift them.

11. **Frontal-plane ankle stiffness.** The only verified passive value (0.7–1.0 N·m/deg) is from seated dynamometry at 20° plantarflexion, without body weight and without muscle activation. Weight-bearing, co-contracted stiffness will be higher [UNVERIFIED — from background knowledge].

12. **Not accessed** (would strengthen sections 1–2): Severn et al. 2011 (*Proc IMechE P*), Twomey et al. 2012 (*Sports Eng*), Grund & Senner 2010 full text, Clarke & Carré 2010, Webb et al. 2014/2016, McGowan et al. 2023 *Sports Eng* variability study, Forrester & Fleming 2019, Wannop & Stefanyshyn 2012 (*Footwear Sci*), and the FIFA Handbook of Requirements.

13. **Unverified items used in this report** (all marked inline): foot dimensions for the plate calculation; trip fall direction; the lateral-edge moment-arm example; running-specific step timing; weight-bearing ankle stiffness.

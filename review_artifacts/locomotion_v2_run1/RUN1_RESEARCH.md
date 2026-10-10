# RUN-1 — research basis

**Labels**
- **[M]** a measured human reference, with its population and speed.
- **[A]** commonly cited or approximate, including interpolations.
- **[D]** an animation-design choice inside a plausible range.
- **[T]** a Touchline-specific stylistic decision.

**Status of the sources.** Gathered on 10 Oct 2026 by a research agent from primary literature, using its open-access full texts.
- Paywalled papers whose full text was not retrieved are used only through their abstracts or secondary sources: Novacheck 1998, the Dorn 2012 tables, Schache 2000/2002, Hinrichs 1987/1990 and Weyand 2000.
- No motion-capture data and no animation asset was copied into the project.
- The RUN-1 curves are authored. The licences of candidate datasets are recorded at the end for future work only.

## What RUN-1 uses, and where it comes from

Timing:

| quantity | RUN-1 (5.5 m/s, vinicius rig, leg 0.834 m) | reference |
|---|---|---|
| cadence | 192 spm (3.20 steps/s) | [M] Hamner & Delp 2013: 194 spm at 5.0 m/s (treadmill). [M] Takai 2025: soccer players have a higher step rate and shorter steps than sprinters. **[T]** footballer: higher cadence, shorter step (1.72 m) |
| contact / flight | 0.175 s / 0.137 s | [M] Ham13: 0.236 / 0.077 s at 5.0 m/s (treadmill contacts run long). [M] sprint ~0.10 / 0.11 s (Miyashiro 2019; Takai 2025). Feasibility for this leg (scan): 0.175 s gives a 0.96 m contact length. **[D]** |
| toe-off (duty) | 28 % of the stride | [M] 37.5 % at 5 m/s treadmill (Ham13); [M] 31 % running and 22 % sprinting (Mann & Hagy 1980) |
| swing time | 0.45 s | [M] ~0.38 s at 5 m/s (Ham13, derived); 0.33 s at 9.9 m/s (Miy19) |

Stance leg:

| quantity | RUN-1 | reference |
|---|---|---|
| knee at touchdown / peak stance / toe-off | 22° / 45° / 23° | [M] 21.6° / 51.5° at 4.4 m/s (Sundström 2021); [M] ~28° / ~41° / 24.6° in sprinting (Miy19); [M] footballers ~31° at touchdown near top speed (Romero 2022) |
| hip flexion at touchdown / toe-off (relative to pelvis) | +31° / −20° | [M] peak extension −8 to −23°, depending on the model (Fukuchi 2017; Sundström 2021) |
| foot at touchdown | 8° toes up, rolling flat by 16 % of stance | [M] rear-/mid-foot border at 8° (Altman & Davis 2012); [M] footballers mostly rearfoot up to 4.5 m/s (Siegel 2023); [M] team-sport athletes land flatter at top speed (Clark 2025). **[T]** a mild rear/mid-foot strike |
| foot at toe-off | 74° heel-up | [M] shank 53° plus ~24° plantar-flexion at toe-off in sprinting (Miy19). **[D]** used as the pelvis-height solve target |
| ankle plantar-flexion just after toe-off | ~28° | [M] −20.5 / −23.2° at 3.5 / 4.5 m/s (Fuk17) |
| peak stance dorsiflexion | ~35° | [M] 26.4–26.8°, constant from 2.5 to 4.5 m/s (Fuk17). **Known deviation:** it is set by the leg-sweep geometry at this contact length (see the iteration log) |
| plant at touchdown | flat-foot ankle 0.27 m ahead of the root | [A] 0.20–0.30 m ahead of the COM at 5–6 m/s; [M] 0.40 m ahead of the hip in sprinting (Miy19) |
| step width | foot centre 3.2 cm from the line | [M] 4.1 cm at 3 m/s → 1.5 cm at top speed (Arellano 2015) |

Swing leg:

| quantity | RUN-1 | reference |
|---|---|---|
| peak knee flexion | 115° | [M] 108.7° at 3.5 m/s, 119.1° at 4.5 m/s (Fuk17); [M] 118° at the opposite touchdown in team-sport athletes vs 127° in track athletes (Cla25). **[T]** less heel recovery than a track runner |
| peak hip flexion | 63° relative to the pelvis, thigh 55° from vertical | [M] 52.8° at 3.5 m/s, 60.5° at 4.5 m/s (Fuk17); [M] thigh 65° (team sport) vs 75.5° (track) at ~9.3 m/s (Cla25). **[T]** lower knee lift |
| scissor timing | rear-thigh extension peak and front-thigh flexion peak ~0.035 s after the other foot's toe-off | [M] ~0.025 s after take-off (Cla25); the thigh is near-sinusoidal (Clark 2021) |
| late-swing retraction | thigh 55° → 31° by touchdown | [M] sprint: 70° peak → 33° at touchdown (Miy19); hamstring stretch peaks at ~90 % of the cycle (Chumanov 2007) |

Pelvis:

| quantity | RUN-1 | reference |
|---|---|---|
| vertical (pelvis) | 4.2 cm, lowest at mid-stance (spring-mass) | [M] COM ~10 cm at 2.8 m/s, falling with speed (Cavagna 2008); [M] the low point is at about mid-stance above 3.9 m/s (Cavagna 2006); [M] footballers' vertical bounce falls with speed (Brughelli 2011). **[T]** grounded footballer, explicitly not a bouncy jogger (spring-mass × 0.6) |
| anterior tilt | +6° ± 2.2°, peaks at each toe-off | [M] range 7.8° at 4 m/s (Schache 2003); [M] sprint 6.6 → 9.2° from touchdown to toe-off (Ota 2024) |
| obliquity | ± 3.5°, swing side lowest in early stance | [M] range 13.8° (skin markers; up to 4× overstated vs bone pins, MacWilliams 2014) |
| axial rotation | ± 6°, follows the thigh scissor | [M] ± 6.5° in sprinting (Ota 2024); 16–19° range at 3–5 m/s by sacral IMU (Lang 2023). The phase is ambiguous in the retrieved sources (running is "reversed vs walking", MacWilliams 2014). **[D]** rotate with the forward-driving thigh, counter-phased to the thorax |
| lateral sway | ± 1.2 cm toward the stance foot | [A] 1–3 cm |

Trunk, arms and head:

| quantity | RUN-1 | reference |
|---|---|---|
| trunk lean | 8° ± 1° | [M] 5–7.5° at 3.3–5.6 m/s (Preece 2016b); [M] footballers ~15° near top speed (Rom22) |
| thorax rotation | ± 13°, counter to the pelvis, 78 % in the thoracic spine | [M] shoulder line 23.8° range at 3 m/s (Pontzer 2009); [M] most rotation is thoracic (MacW14) |
| arm swing | forward 33°, back 45°, contralateral, most forward near the same-side toe-off | [A] 60–90° total at 5–6 m/s; [M] contralateral (Pon09) |
| elbow | 84° ± 12°, closes in the forward swing | [A] closes forward (80–90° included) and opens back; [M] range 67–84° in elite sprinting |
| cross-body | slight inward swing; the wrist stays lateral of the midline | [M] wrist 10.7 ± 4.2 cm lateral of the sternal notch at its closest (Hild 2005) |
| head | stabilised toward the direction of travel, 6° gaze down | [M] pitch < 20° and < 140 °/s across tasks (Pozzo 1990); yaw 6° at 3 m/s (Pon09) |

## Speed scaling (for the optional generalisation)

- Up to ~7 m/s, speed rises mostly through stride length; above that, through frequency [M Dorn 2012].
- Swing time is nearly constant while contact time halves [M Weyand 2000; Ham13; Miy19].
- Toe-off moves from 46.7 → 40.4 → 38.3 → 37.5 % at 2/3/4/5 m/s [M Ham13].
- Soccer players at 8.3–9.3 m/s: contact 0.104–0.117 s, flight 0.106–0.112 s, step 1.86–1.98 m [M Tak25].

## Datasets (licences only; nothing downloaded or copied)

- Dorn 2012 SimTK "runningspeeds" (3.5/5.2/7.0/9.0 m/s) and Hamner 2013 (2–5 m/s): MIT-style Stanford licence.
- Fukuchi 2017: CC BY 4.0.
- CMU mocap: free for use, including commercial products; the data may not be resold.
- AddBiomechanics: no formal licence found.

## References

The research agent's full bibliography follows.

- **Gait timing and kinematics:** Hamner & Delp 2013 (J Biomech, PMC3979434); Fukuchi 2017 (PeerJ, PMC5426356); Miyashiro 2019 (Front Sports Act Living, PMC7739839); Takai 2025 (PLoS One, PMC12047830); Mann & Hagy 1980 (AJSM, PMID 7416353); Dorn 2012 (J Exp Biol, PMID 22573774); Weyand 2000 (J Appl Physiol, PMID 11053354); Sundström 2021 (PMC8275652).
- **Sprinting and thigh mechanics:** Clark 2025 (PMC11994691); Clark 2021 (doi 10.1080/14763141.2021.1986124); Chumanov 2007 (PMID 17659291); Schache 2011 (MSSE 43:1260); Romero 2022 (PMC9691012).
- **Pelvis and spine:** Schache 2003 (PMID 12630790); Ota 2024 (doi 10.55860/DOUP6264); MacWilliams 2014 (PMID 25341976); Lang 2023 (PMC10611096); Preece 2016a (doi 10.1016/j.humov.2015.11.014); Preece 2016b (PMID 27131190).
- **Centre of mass and foot placement:** Cavagna 2006 (PMID 17023599); Cavagna 2008 (PMC2596824); Arellano 2015 (PMC4295868).
- **Trunk lean and acceleration:** Osterwald 2021 (PMC8538495); Nagahara 2014 (PMC4133722).
- **Arms and head:** Pontzer 2009 (PMID 19181900); Macadam 2018 (doi 10.1519/SSC.0000000000000391); Hild 2005 (ISB abstract 0320); Hinrichs 1987 (IJSB 3:242); Pozzo 1990 (PMID 2257917).
- **Foot strike:** Breine 2014 (PMID 24504424); Hasegawa 2007 (PMID 17685722); Siegel 2023 (PMC10349471); Altman & Davis 2012 (PMC3278526); Haralabidis 2025 (PMC12893165).
- **Football context:** Meng 2024 (PMID 39492756); Zago 2016 (PMID 26067339); Carling 2010 (PMID 20077273); Brughelli 2011 (PMID 20703170); Morin 2005 (J Appl Biomech, spring-mass).

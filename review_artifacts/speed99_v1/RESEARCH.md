# SPEED-99-V1: research findings (21 Oct 2026)

This is a focused web research pass on elite football sprinting, done by a research sub-agent in this session and summarised here. Every number names its source. **I have not re-read the primary papers myself**: where the agent could not open a full text, it says so below.

Tags:
- **[MF]** measured in football
- **[MT]** measured in track
- **[INF]** inference or calculation (the agent's or mine)
- **[DESIGN]** a gameplay choice

## 1. Top speeds in matches (tracking data)

**The fastest recorded match speeds**

| League | Player | Top speed | Measurement |
|---|---|---|---|
| Premier League [MF] | Van de Ven | 37.38 km/h (10.38 m/s) | Second Spectrum optical tracking, 25 Hz |
| Premier League [MF] | Walker | 37.31 km/h | same |
| Premier League [MF] | Tchatchoua | 37.30 km/h | same |
| Bundesliga [MF] | Bahoya | 37.16 km/h | 25 fps |
| Bundesliga [MF] | Burke | 37.00 km/h | 25 fps |
| Bundesliga [MF] | Davies | 36.53 km/h | 25 fps |

Notes on the record lists:
- Premier League: 21st place on the all-time list is 36.64 km/h.
- Bundesliga: the top 10 spans 36.53–37.16 km/h.
- World Cup 2022 [MF]: the fastest players were about 35.3–35.7 km/h.
- Champions League season maxima are 34.5–36.9 km/h, depending on provider and season.

**Typical players** [MF]
- LaLiga (25 Hz, 363 players): the speed where the pooled acceleration–speed line reaches zero is 30–32 km/h by position.
- Brazilian Série A (10 Hz): match peaks of about 29–32 km/h.
- Players did not reach 90% of their tested maximum speed at all in 35–65% of matches (Buchheit et al. 2021).

**Measurement error** [MF] (Linke et al. 2018, against motion capture): video tracking 0.42–0.71 m/s, GPS 0.22–0.33 m/s, larger at higher speed. So the record lists' spread of about 0.8 km/h is within noise [INF].

## 2. Sprint test times

**Norwegian national-team footballers, n = 57** [MF] (Haugen et al. 2019)
- 10 m 2.01 ± 0.05 s, 20 m 3.24 ± 0.08, 30 m 4.39 ± 0.12, 40 m 5.51 ± 0.16 s.
- Standing start, timed from first movement (0.5 s added to the foot-off / gate start).
- The fastest team-sport athletes in that dataset approached or exceeded 10 m/s.
- Mean − 2 SD gives about 1.91 / 3.08 / 4.15 / 5.19 s [INF].

**Other findings** [MF]
- National-team and first-division players are only 1–4% faster than lower levels (Haugen 2013, 939 players).
- Football test norms:

| Source | V0 (m/s) | F0 / A0 (m/s²) |
|---|---|---|
| Haugen 2020 | 9.2 ± 0.4 | 8.4 ± 0.5 |
| Jiménez-Reyes | 9.25 | 7.14 |

**The start method matters** [MF/MT]
- A foot-release or photocell start makes times 0.2–0.7 s faster than timing from first movement.
- Starting 1–2 m behind the first gate cuts 10 m times by 0.06–0.20 s.

## 3. The acceleration curve

**The model** [MT/MF]: the mono-exponential v(t) = vmax(1 − e^(−t/τ)), equivalently a(v) = a0(1 − v/vmax) with a0 = vmax/τ.
- Acceleration falls linearly with speed.
- τ is about 1 s across sports: modelled range 0.94–1.29 s, mean 1.11 s (Clark & Ryan 2022).

**Fits to published split times** [INF] (residuals ≤ 0.011 s)

| Group | vmax (m/s) | τ (s) | a0 (m/s²) |
|---|---|---|---|
| National-team footballers | 8.96 | 1.05 | 8.5 |
| National sprinters | 9.83 | 1.07 | 9.2 |
| Bolt 2009, 0–60 m | 12.15 | 1.22 | 9.95 |

**Acceleration–speed profiles from tracking** [MF]

| Source | A0 (m/s²) | Top speed term | Implied τ [INF] |
|---|---|---|---|
| Morin et al. 2021, 16 professionals (GPS, training) | 7.2 ± 0.4 | 9.47 m/s | ≈ 1.3 s |
| LaLiga pooled maximal line (R² 0.979) | 7.63 | slope −0.242 (m/s²) per km/h | ≈ 1.15 s |

- 88–91% of match accelerations above 3 m/s² start below 7 km/h.

**Time to near top speed** [INF, from the model]

| Share of vmax | Time | Approx. time and distance at τ ≈ 1.1 s |
|---|---|---|
| 90% | 2.3 τ | ≈ 2.5 s, 15 m |
| 95% | 3.0 τ | ≈ 3.3 s, 22 m |
| 99% | 4.6 τ | ≈ 5 s, 40 m |

- This matches the measured position of top speed in fast footballers: 40 ± 4 m (Takai et al. 2025) [MF].

## 4. Track, for contrast [MT]

- **Bolt's 9.58 s:** 10 m 1.89 s from the gun with a 0.146 s reaction, so about 1.75 s from first movement. 20 m 2.88 s, 40 m 4.64 s.
- **Bolt's top speed:** about 12.3 m/s; reports conflict.
- **Bolt at top speed:** 2.7–2.9 m steps at 4.1–4.6 Hz.
- **Norwegian sprinters vs national-team footballers:** sprinters are 0.11 s faster at 10 m and 0.38 s faster at 40 m.

## 5. Changes of direction [MF]

**Turn angle** (Falch et al. 2020, 20 m approach)

| Measure | 45° | 90° | 135° | 180° |
|---|---|---|---|---|
| Braking steps | 2.9 | 5.4 | 6.4 | 6.3 |
| Plant-foot contact (s) | 0.15 | 0.18 | 0.21 | 0.33 |
| 4 m in + turn + 4 m out (s) | 1.38 | 1.83 | 2.15 | 2.30 |

- **Hader et al. 2015:** the minimum speed through the turn was the main predictor of change-of-direction performance. The numbers were not accessible.
- **Curved 17 m sprint:** about 3.6% slower on the weaker side and about equal on the stronger side. Curved and straight sprinting share about 35% of their variance.
- **In-match re-acceleration out of turns:** the agent found no data.

## 6. Running mechanics

**Fast footballers vs sprinters** (Takai et al. 2025, 54 force plates)

| Group | Speed (m/s) | Step length (m) | Step rate (Hz) | Contact (s) | Flight (s) |
|---|---|---|---|---|---|
| Fast collegiate footballers [MF] | 9.33 | 1.98 | 4.73 | 0.104 | 0.108 |
| Sprinters [MT] | 9.71 | 2.06 | 4.71 | 0.097 | 0.116 |

- First four steps of the footballers [MF]: 1.21 m, 4.58 Hz, contact 0.148 s.

**How steps change during acceleration**
- Field-sport athletes' first three steps have contacts of 0.17–0.23 s [MF].
- Step rate rises until about step 4, then plateaus [MF/MT]. Footballers peak at 4.77 Hz at steps 5–8; sprinters at 4.87 Hz at step 8.
- Step length keeps growing to about step 24 [MT].
- Trunk angle, measured from horizontal, rises about 4° per step during initial acceleration; the trunk is roughly upright by step 16–17 [MT].
- The often-quoted 40–45° first-step lean was **not verified**.

## 7. Body size [MF]

- Fast and slow footballers had near-identical height and mass (Takai 2025).
- There is no robust adult evidence that height or mass predicts top speed. That supports §19 of the brief: no hidden body-size pace penalties.

## 8. The candidates

The times in the table come from the model, from a standing start at first movement. They match the agent's independent calculation.

| | top speed | τ | a0 | 5 / 10 / 20 / 30 / 40 m (model) | basis |
|---|---|---|---|---|---|
| **A · elite realistic** | 10.0 m/s (36.0 km/h) | 1.10 s | 9.1 m/s² | 1.25 / 1.91 / 3.03 / 4.07 / 5.09 s | top speed ≈ tested national-team V0 + 2–2.5 SD, the 36 km/h class of league peaks; τ as measured **[INF]** |
| **B · exceptional football ceiling** | 10.35 m/s (37.3 km/h) | 1.05 s | 9.9 m/s² | 1.20 / 1.83 / 2.92 / 3.92 / 4.90 s | the league-record top speeds; a0 ≈ Bolt's **[INF]** |
| **C · responsive gameplay ceiling** | 10.35 m/s | 0.95 s + shape p = 1.35 | 10.9 m/s² | (sim) 1.09 / 1.68 / 2.70 / 3.67 / 4.64 s | **[DESIGN]**: beyond the human data — 10 m faster than Bolt's from first movement |

The agent's recommendation: get responsiveness from low input latency and strong acceleration out of moving starts, not from τ below about 0.95 s. Candidate A's slope of −0.25 (m/s²) per km/h matches the measured LaLiga −0.242.

## 9. Sources (as gathered by the research pass)

**Match speeds**
- Premier League fastest players: premierleague.com/en/news/4573557 and premierleague.com/news/3884168
- Bundesliga all-time top 10: bundesliga.com (davies-openda-adeyemi-holtmann-fastest-players-of-all-time-24226)
- Bundesliga 25 fps (AWS): aboutamazon.eu, the Bundesliga match fact on speed
- World Cup 2022: foxsports.com.mx and statista.com/statistics/1351058
- Champions League: beinsports.com (2024); channel8.com (2025, weak); CIES Weekly Post 534; trainingground.guru (ChyronHego 2018/19)
- Morgans et al. 2025 (Premier League, Second Spectrum 25 Hz): termedia.pl

**Measurement and match profiles**
- Linke et al. 2018: PMC6056042
- Silva et al. 2025: PMC11694206
- Nevado Garrosa et al. 2025: PMC12490324
- Alonso-Callejo et al. 2022: PMC9649751
- Morin et al. 2021, J Biomech 123:110524
- Buchheit et al. 2021 (secondary summary): naseinc.com

**Sprint tests and models**
- Haugen et al. 2019: PLoS ONE 10.1371/journal.pone.0215551
- Haugen et al. 2013: doi 10.1123/ijspp.8.2.148
- Haugen & Buchheit 2016 (preprint)
- Haugen 2012, "The difference is in the start"
- Clark & Ryan 2022: Frontiers in Sports and Active Living 10.3389/fspor.2022.945688
- Jovanovic preprint (sportrxiv 179)

**Track reference**
- Štuhec et al. 2023: PMC10669785
- Hernández Gómez et al. 2013: arXiv 1305.3947
- Bolt splits (secondary)

**Mechanics**
- Takai et al. 2025: PMC12047830
- Murata et al. 2018: PMC6315975
- Nagahara et al. 2014: PMC4133722
- Murphy, Lockie & Coutts 2003: JSSM
- Bezodis / von Lieres und Wilkau 2018: Swansea repository

**Change of direction and body size**
- Falch et al. 2020: Frontiers 10.3389/fspor.2020.594567
- Hader et al. 2015
- Fílter et al. 2020
- Dos'Santos et al. 2018
- Nimphius et al. 2016
- Youth anthropometry 2015: PMC4640228

**Not verified by the research pass:**
- Little & Williams 2005 and Cometti 2001 (full texts blocked);
- the Clark et al. 2019 NFL fits;
- the primary Bolt biomechanics report;
- the "85% of max-speed actions are curved" figure.

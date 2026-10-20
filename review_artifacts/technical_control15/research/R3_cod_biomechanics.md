# Research note R3 — change-of-direction biomechanics with the ball

**Provenance:** a research subagent's report (web search and fetch, 2026-10-20), kept as provenance for the TECHNICAL-CONTROL-1.5 spec.

**Legend:**
- [E] = a source states it; [I] = the researcher's inference.
- Confidence: H (high), M (medium), L (low).
- Contacts: PFC = penultimate foot contact; FFC = final (plant) foot contact; APFC = the contact before the PFC; AFC = the first accelerating contact after the turn.

**Bottom line:**
- One plant step redirects about 20–40°; sharp turns are spread over several steps.
- In match play, sharp turns start at about 3–4 m/s.
- The braking happens before the plant: on the PFC, and for 180° turns on the APFC too.
- During a cut the centre of mass (COM) is deliberately outside the plant foot.
- No peer-reviewed study measures the step counts or contact times of with-ball versus without-ball cuts in soccer. For named-move frequencies, the Ronaldo chop, and US Soccer and UEFA material, nothing primary was found.

## 1. The angle–velocity trade-off

**Lab studies, maximal effort, pre-planned cuts** [E,H] (most values compiled in the Dos'Santos 2018 review):

| Cut angle | Approach speed (m/s) | FFC contact time (s) | Source |
|---|---|---|---|
| 45° | 4.7 (men); 5.8 | 0.16–0.24; plant 0.15 | Schreurs 2017; Havens 2014; Falch 2020 |
| 60° | 4.5 (slow) – 5.8 (fast) | 0.21–0.24 | Kimura 2013; Condello |
| 90° | 3.8; 4.4; 4.58 | 0.25–0.31; plant 0.18 | Schreurs; Jones 2016; Dos'Santos 2021; Falch |
| 135° | 3.5; 3.8–4.8 | 0.39–0.50; plant 0.21–0.23 | Schreurs; Nedergaard 2014 |
| 180° | 3.4; 4.0 | 0.44–0.52; plant 0.30–0.33 | Schreurs; Jones 2016; Sasaki 2011; Falch |

Schreurs' women ran 4.2, 3.6, 3.3 and 3.2 m/s at 45°, 90°, 135° and 180°.

**The trade-off**
- [E,H] "An 'angle-velocity trade-off'… whereby faster approaches compromise the execution of the intended COD." Sharper cuts lower both approach and exit speed.
- [E,H] Speed shrinks the angle one plant achieves (Vanrenterghem 2012). For an intended 45° sidestep, the COM travel angle achieved was 34.9°, 29.4°, 23.8° and 17.5° at 2, 3, 4 and 5 m/s.
- [I,H] At 5 m/s, one plant gives only about 18°; the rest must come from extra steps.
- [E,M] For an intended 90° cut, one FFC redirected 40.5° with a sidestep and 33.0° with a crossover. The sidestep turned more but lost more speed (Suzuki).
- [E,M] In pilot work, a 90° cut done "as fast as possible" took 3–5 steps and became a rounded path (Schot 1995).

**Field data, young elite soccer players** [E,H] (Hader 2016; a 20-m sprint with the COD at 10 m):

| Measure | Straight | 45° | 90° |
|---|---|---|---|
| Peak speed before the COD (m/s) | 8.06 | 6.65 | 6.40 (7.11 if the COD is at 15 m) |
| Deceleration distance (m) | – | 4.3 | 7.1 (8.7 if the COD is at 15 m) |
| Peak deceleration (m/s²) | – | −3.00 | −3.29 |

**Time cost per COD**
- [E,H] Buchheit 2012 matched sprint times: 30 m straight equalled 28.0 m with two 45° CODs, 22.2 m with two 90° CODs, and 19.5 m with two 135° CODs.
- [I,M] That is roughly 1 m, 3.9 m and 5.3 m of straight running lost per COD.

**Matches**
- [E,H] One Premier League team's season, LiDAR tracking (Griffiths 2025). A turn was defined as deceleration below −2 m/s², then a direction change of at least 20°, then acceleration of at least 2 m/s², all within 1 s.
  - 24.5 turns per match; central midfielders about 35.
  - About 70% of turns were 120–180°.
  - Mean entry speed was 3.48 m/s for 120–180° turns, against 3.63–3.66 m/s for shallower ones.
  - 57.7% of turns were entered at 3.0–5.5 m/s; only 7.7% above 5.5 m/s.
- [E,H] A broader count: 727 ± 203 turns per match, 609 of them between 0° and 90° (Bloomfield 2007).
- [I,M] For animation: sharp turns should start at about 3–4 m/s. Direction changes above about 5.5 m/s should be shallow, multi-step curves.

## 2. Footwork

**Definitions** [E,H] (Dos'Santos 2018):
- **Sidestep:** "a lateral foot-plant opposite to the direction of travel", i.e. plant the outside foot.
- **Crossover:** the plant foot is on the same side as the new direction.
- **Pivot:** both feet involved; one foot rotates and stays in contact; "typically for directional changes ≥ 135°".

**PFC versus FFC: who does the braking**
- [E,H] The PFC has a "limited role… ≤ 45°, but a prominent role for CODs ≥ 60°" in pre-planned tasks.
- [E,H] At 90°, backward braking force and impulse were larger at the PFC than at the FFC. At 45° they were spread evenly across both contacts.
- [E,M] Compared with the FFC, the PFC showed more knee flexion and a higher peak horizontal force, but a lower average horizontal force (Jones 2016).
- [E,M] In unanticipated tasks, PFC braking is reduced.
- [E,M] For 180° turns braking starts even earlier: in the 505 test, the APFC produced the highest peak braking forces, in shorter contacts, than the PFC or FFC (Dos'Santos 2021).
- [E,H] In a 135° soccer V-cut, peak trunk decelerations were 4.37 g and 4.58 g on the two steps before the pivot, against 4.10 g at the pivot (Nedergaard 2014).

**Braking steps before the plant** [E,H] (Falch 2020):

| Cut angle | 4-m approach | 20-m approach | Plant contact time (s) |
|---|---|---|---|
| 45° | 0.4 | 2.9 | 0.15 |
| 90° | 2.7 | 5.4 | 0.18 |
| 135° | 3.3 | 6.4 | 0.21–0.23 |
| 180° | 3.3 | 6.3 | 0.30–0.33 |

**Anatomy of a 180° turn** [E,H] (a modified 505 test, 5 m in and 5 m out; basketball students; Santoro 2021):
- 8–10 steps in all; the turning phase took 1.22 s (44% of the 2.77 s total).
- The last approach step was the longest, at 154 cm.
- PFC: contact 0.385 s, step 114 cm.
- FFC: contact 0.52 s (0.22 s braking + 0.30 s propulsion), step 91 cm.
- AFC: contact 0.31 s, step 81 cm, the shortest step. 66% of AFCs still contained a braking sub-phase.

**Other footwork findings**
- [E,M] Soccer GNSS tracking: the turn spreads from two steps before to two steps after the main turning steps. At lower approach speeds it starts earlier (Rovan 2014).
- [I,M] A sprinted 180° typically looks like this: 2–3 braking steps with backward lean (the APFC and PFC carry the heaviest braking), an FFC plant at 0.3–0.5 s, then a short push-off step. Allow about 1.0–1.3 s from the first braking step to the first accelerating contact.
- [E,M] Split-step versus sidestep: the split-step doubled the braking impulse (−1.0 vs −0.50 m/s change in velocity) and lengthened contact on the primary cutting step.

**Cruyff turn and drag-back with the ball** [E,M] (Smith 2000 thesis; force plate in natural turf; n = 8; approach about 3.0 m/s; the figure is partly OCR-garbled):
- **Cruyff turn:**
  - One plant contact, the foot about 45° to the approach line.
  - The foot lands on its outer edge, then rolls inward (pronation).
  - The COM moves away from the support leg toward the ball-side leg.
  - Peak vertical force 2.05 body weights (BW), against 3.74 BW for a shot. Peak braking force 0.94 BW; peak sideways force 0.28 BW.
  - Extra vertical load and knee flexion appear when the swing leg reverses to touch the ball.
- **Drag-back:**
  - The support foot makes two contacts.
  - First, a heel-to-toe plant (2.06 BW vertical, 0.99 BW braking) while the sole of the other foot drags the ball back past the support leg.
  - Then the support foot is re-placed at about 90° to the approach line, with large external rotation, and pushes off sideways (0.82 BW).

## 3. Body and COM mechanics

**Pre-rotation**
- [E,H] Pelvis rotation toward the new direction at initial contact:
  - 48.7° at 90° versus 14.2° at 45° (Havens & Sigward 2015);
  - 37° at 110° versus 7° at 45° (Sigward 2015);
  - 33.8 ± 9.3° in 90° cuts (n = 61; Dos'Santos 2021).
- [E,H] Athletes "rotate their trunk toward the direction of travel prior to the plant step" (Falch).

**Trunk lean**
- [E,H] More trunk lean at initial contact in 90° than in 45° cuts (effect size 1.02).
- [E,H] In 90° cuts, sideways trunk flexion was about 15° at contact, peaking at about 27°. Forward trunk lean was 10–13° at PFC and FFC contact.
- [E,M] Smaller sideways trunk flexion went with shorter contact times.
- [E,M] In 180° turns, maximum forward trunk lean was 56°. Less forward trunk excursion during the plant went with faster turns (r = 0.61) (Sasaki 2011).

**Foot placement and the COM**
- [E,H] In 90° cuts the plant foot lands about 0.31 m to the side of the COM.
- [E,H] Lateral foot-plant distance correlates with peak medial ground force (r = 0.59) and with longer contact time (ρ = 0.63).
- [E,H] "Sharper cuts require the plant foot's centre of pressure to be more laterally orientated relative to the centre of mass." Athletes widen the sideways COM–foot distance, through wider foot placement and trunk lean, to generate sideways force.
- [I,H] So during the plant the COM is outside the base of support, and that is intentional. Balance comes from where the next foot lands, not from keeping the COM over the feet. A static "COM inside the base of support" constraint would produce unrealistic cuts.

**Knee and hip**
- [E,H] In 90° cuts, FFC knee flexion was 23° at contact and 62.5° at peak.
- [E,H] Men kept about 42.5° of knee flexion across 45–180° cuts. Women dropped from 40.6° at 45° to 36.8° at sharper angles.
- [E,H] In sharper cuts the knee absorbs most of the extra braking.
- [E,H] Faster cutters had shorter contacts, smaller hip and knee flexion ranges, and a greater inward foot angle (about 17°). These same features raise knee load (the "performance-injury conflict").

**Lowering the COM**
- [E,M] A systematic review of 13 studies (45–180° CODs) links a lower COM and greater trunk inclination to faster COD.
- [E,M] In 180° half-turns with the ball, faster trials combined short steps, a lowered COM, minimal sideways and forward body travel, arms held out, and limited trunk flexion.

## 4. Dribbling versus running COD

**How much the ball slows players down**
- [E,H] 20-m sprint in professional women: 22.4 km/h without the ball versus 20.4 km/h with it, about 9% slower.
- [E,H] Illinois agility test in boys around 11 years old (n = 65): 18.2 s without the ball versus 23.8 s with it, 31% slower.
- [E,L] A thesis on 33 women: slalom 7.49 versus 11.16 s; zig-zag 6.09 versus 8.94 s.
- [I,M] The penalty grows with the number of direction changes in the course.

**Dribbling in matches** [E,H] (French Ligue 1; Carling 2010):
- 191 m with the ball per player per match, and 53 s in possession.
- Each possession averaged 1.1 s, 2.0 touches and 4.0 m.
- Speed at reception 10.3 km/h (2.9 m/s); mean speed 12.9 km/h (3.6 m/s); peak 24.7 km/h (6.9 m/s).
- 34% of the distance with the ball was covered above 19.1 km/h.

**How faster dribblers move** [E,M] (under-13 players; Zago 2016):
- 3.0 versus 2.3 ball contacts per second.
- A smaller sideways COM range (0.91 vs 1.14 m) and vertical COM range (0.19 vs 0.25 m).
- Higher stride cadence and smaller hip and knee flexion ranges.

**How the ball changes cutting mechanics**
- [E,M] Futsal 45° sidestep with the ball: knee flexion peaked in the push-off phase instead of landing preparation, and knee angular velocity dropped (Bedo 2022).
- [E,M] Soccer dribbling cuts: non-plant-leg hip and knee angles and pelvic tilt changed with cut direction and speed (Tang 2019).
- [E-absence,M] No soccer study compares the step counts or contact times of with-ball and without-ball cuts.

## 5. Turning with the ball, 1v1 and match usage

**Specific turns**
- [E,M] 180° sole half-turn (under-13): 0.68 ± 0.53 s to complete 90% of pelvis rotation. Fast turners took under 0.33 s; slow ones over 0.91 s.
- Cruyff turn and drag-back: see section 2.
- [E-absence,M] No biomechanics papers on the Ronaldo chop, the step-over, or inside / outside hooks.

**Which moves are used in matches**
- [E,L] Euro 2021 final and semi-finals (Chornobai 2026; a broad dribble definition):
  - 25.5 dribbles per team per match, 36.6% with feints.
  - Dribbles included a direction change 69% of the time and a turn 37% of the time.
  - Dribbling was done with one foot 50% of the time and with two feet 35%.
  - The most common one-foot pattern was inside–inside–outside (or instep, or sole).
- No study counts named moves such as the Cruyff turn or the drag-back.
- [E,H] Movements just before goals: turns made up 19.8% of them in the Premier League and about 19% across six World Cups; decelerations 20–22%.

**Footedness**
- [E,H] At France '98, first touches, passes and dribbles were "rarely performed with the non-preferred foot".
- [I,M] Turn selection is biased toward the preferred foot, which limits how freely the "far foot" can be used.

**1v1 dribbling success**
- [E,H] Eredivisie, 734 1v1 dribbles, 48.5% successful.
  - Interaction variables separated success from failure: attacker–defender distance (r = 0.27), attacker–ball distance (r = 0.36) and pressure (r = 0.24).
  - Successful dribbles had less pressure, tighter ball control and a more direct approach.
  - Individual speed and acceleration were not decisive.
- [E,M] Youth 1v1: the attacker breaks past at a lower interpersonal distance and a higher relative velocity.
- [E,M] Rugby threshold for beating a defender: under 4 m apart and at least 1 m/s relative velocity.
- [E,M] Scissors feint (Tsukuba): skilled players closed the distance while holding speed, kept their speed close to the defender's, then accelerated sharply at the decisive moment.
- [E,M] Champions League 3D pose tracking (1,736 dribbles): the attacker's balance and the alignment of attacker and defender body orientation predicted success.

## 6. Exit acceleration

**90° cuts** [E,H] (Dos'Santos 2021):
- COM speed fell from 4.58 m/s on approach to 3.45 m/s at FFC touchdown and 3.30 m/s at FFC toe-off.
- Exit speed was the strongest predictor of cut time (R² = 54%). It was driven by sideways push-off force at the FFC.

**180° turns**
- [E,H] The first accelerating step is the shortest: 81 cm with a 0.31 s contact.
- [E,M] After a 180° turn, the first three steps were 17–27% shorter than in a straight start. Faster re-accelerators had 4% higher step frequency.
- [E,M] In straight starts, faster athletes leaned their trunk forward 30–37% more.

**Re-acceleration and time to speed**
- [E,H] Peak re-acceleration was 2.7 m/s² after a 90° cut versus 1.5 m/s² after a 45° cut.
- [E,H] Elite Norwegian male soccer players from a standing start: 10 m in 2.01 s, 20 m in 3.24 s, 30 m in 4.39 s, 40 m in 5.51 s.
  - [I,M] The 10-m split speeds are about 8.1, 8.7 and 9.0 m/s, so reaching about 90% of top speed takes about 20 m and 3 s.
- [E] With the ball, peak speed is about 6.9 m/s.
- [I,L] Expect about 2–3 s and 10–15 m to get back to 5–6 m/s with the ball after a sharp turn.

## Coaching curricula on ball protection

**FIFA Training Centre, futsal shielding** [E,H]
- "position their body between their opponent and the ball."
- "extend their arms to create space."
- "keep it out of their opponent's reach by using their furthest foot."

**FIFA Training Centre, grassroots (Anton Corneal)** [E,H]
- "Use hip movements and wrap the body around the ball to swivel."
- For Cruyff turns, "wrap the foot around the ball."
- "Look for opportunities to turn away from pressure."
- Use all surfaces of the boot.

**England Football (FA)** [E,H]
- Turning skill is framed as scanning, timing, movement, positioning, deception and technique.
- Named turns: one-touch, no-touch, stop turn, inside hook, outside hook, drag back, stepover, Cruyff.
- Session objectives: "hide and manoeuvre the ball" and "turn away from pressure".
- Use an open body shape and receive on the back foot.

**US Soccer and UEFA**
- No official pages found.
- [E,L] Third-party session plans agree on these points:
  - stand side-on with knees bent, for a low centre of gravity;
  - use the arm to feel for or hold off the defender;
  - keep the ball on the far foot;
  - don't turn into the defender.

## Sources

- Dos'Santos et al. 2018, Sports Med, the "angle–velocity trade-off" review. Used for approach speeds, contact-time and angle tables, technique definitions, PFC role and pre-rotation data. https://pmc.ncbi.nlm.nih.gov/articles/PMC6132493/
- Dos'Santos et al. 2021, Sports Med, 90° cut determinants (n = 61). Used for speeds, contact times, angles, foot plant and predictors. https://pmc.ncbi.nlm.nih.gov/articles/PMC8363537/
- Hader et al. 2016, PLoS One. Used Table 3: speeds, decelerations, deceleration distances. https://pmc.ncbi.nlm.nih.gov/articles/PMC4773143/
- Falch et al. 2020, Front Sports Act Living. Used braking-step counts and plant contact times. https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2020.594567/full
- Santoro et al. 2021, IJERPH, the 180° turning phase. Used PFC, FFC and AFC contact times and step lengths. https://doi.org/10.3390/ijerph18115519
- Griffiths, Dos'Santos et al. 2025, PLoS One, Premier League turn demands. https://pmc.ncbi.nlm.nih.gov/articles/PMC12017906/
- Bloomfield et al. 2007, JSSM. Used turn counts. https://jssm.org/jssm-06-63.xml-Fulltext
- Buchheit et al. 2012, J Sports Sci (abstract). Used distance-matched sprints. DOI 10.1080/02640414.2012.658079
- Schreurs et al. 2017, J Biomech (abstract). DOI 10.1016/j.jbiomech.2017.08.019
- Nedergaard et al. 2014, J Sports Sci (abstract). DOI 10.1080/02640414.2014.965190
- Dos'Santos et al. 2021, "How early should you brake during a 180° turn". https://salford-repository.worktribe.com/output/1348620
- Jones, Herrington & Graham-Smith 2016 (PFC vs FFC braking). https://salford-repository.worktribe.com/output/1402625
- Rovan et al. 2014, Kinesiologia Slovenica (abstract). https://www.dlib.si/details/URN:NBN:SI:doc-YU4YHZYW
- Split-step ISBS paper. https://ojs.ub.uni-konstanz.de/cpa/article/view/1870
- Sasaki et al. 2011, JSSM (180° trunk mechanics). https://jssm.org/jssm-10-112.xml-Fulltext
- Singh et al. 2025, Sports Med, systematic review (abstract). DOI 10.1007/s40279-025-02278-3
- Smith 2000 PhD thesis, Chichester (Cruyff turn and drag-back force data). https://eprints.chi.ac.uk/937/1/339943.pdf
- Zago et al. 2015, ISBS (half-turn timing). https://ojs.ub.uni-konstanz.de/cpa/article/view/6667
- Zago et al. 2016, Sports Biomech (abstract). DOI 10.1080/14763141.2016.1162841
- Zago et al. 2016, J Sports Sci (abstract; dribbling cadence and COM ranges). DOI 10.1080/02640414.2015.1057210
- Carling 2010, J Sports Sci (accepted manuscript). Used the ball-possession profile. https://clok.uclan.ac.uk/12267
- Preissler et al. 2023, Sci Rep (20-m sprint with and without the ball). https://pmc.ncbi.nlm.nih.gov/articles/PMC9807573/
- Makhlouf et al. 2022, Biol Sport (Illinois test with the ball). https://pmc.ncbi.nlm.nih.gov/articles/PMC8919884/
- Female slalom / zig-zag thesis (search summary only, not read directly). https://repozitorij.kif.unizg.hr/islandora/object/kif:1921/datastream/PDF/view
- Bedo et al. 2022, Sci Sports (futsal cuts with the ball; abstract). https://digitalcommons.unf.edu/unf_faculty_publications/3059
- Tang et al. 2019, IJPAS (dribbling cuts). https://scholar.lib.ntnu.edu.tw/en/publications/kinematics-analysis-of-cutting-with-dribbling-during-different-ap-2/
- Chornobai et al. 2026 (Euro 2021 dribbling). https://sportscience.ldufk.edu.ua/index.php/discourse/article/download/1955/1780
- Martínez-Hernández et al. 2023 (movements before Premier League goals). https://salford-repository.worktribe.com/output/1332274
- Daly et al. 2025, EJSS (six World Cups). https://pmc.ncbi.nlm.nih.gov/articles/PMC12640733/
- Carey et al. 2001, J Sports Sci (footedness at France '98). DOI 10.1080/026404101753113804
- Oonk et al. 2025, J Sports Sci (abstract; Eredivisie 1v1 summary). https://research.rug.nl/en/publications/dribble-like-robben-what-determines-successfulness-in-1-vs-1-acti/
- Duarte-type 1v1 phase transitions and rugby thresholds (search summaries). https://rdpc.uevora.pt/handle/10174/2095
- Tsukuba scissors-feint news release. https://www.tsukuba.ac.jp/en/research-news/20260521110000.html
- Schepers et al. 2025, arXiv (Champions League pose tracking). https://arxiv.org/abs/2506.22503
- Hewitt, Cronin & Hume 2013, JSCR (netball re-acceleration; abstract). https://ro.ecu.edu.au/ecuworks2013/457/
- Haugen et al. 2019, PLoS One (sprint split times). https://pmc.ncbi.nlm.nih.gov/articles/PMC6655540/
- FIFA Training Centre, futsal shielding. https://www.fifatrainingcentre.com/en/practice/futsal/fitness/strength-through-shielding.php
- FIFA Training Centre, Anton Corneal. https://www.fifatrainingcentre.com/en/practice/grassroots/global-grassroots-insights/anton-corneal-building-relationships-between-the-surfaces-of-the-boot.php
- England Football, how to coach turning. https://learn.englandfootball.com/articles/resources/2023/How-to-coach-turning-in-football
- England Football, Stay on the ball. https://learn.englandfootball.com/sessions/resources/2022/Stay-on-the-ball
- England Football, positioning to turn. https://learn.englandfootball.com/sessions/resources/2025/Moving-with-the-ball-and-turning-session-positioning-to-turn
- Third-party shielding plans (low confidence): https://www.soccerxpert.com/tips/details/soccer-shielding · https://www.sportsessionplanner.com/s/dk4M/Shielding-Protecting-the-ball.html

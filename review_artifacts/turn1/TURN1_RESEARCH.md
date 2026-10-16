# TURN-1 — research notes and how they set the V1 parameters

Sources were read on 16 Oct 2026. Numbers are means from studies of athletes, mostly in planned laboratory tests. Touchline compresses some of them for responsiveness; those places are marked **(dramatised)**.

## Change of direction: what the literature says

**Angle–velocity trade-off** (Dos'Santos, Thomas, Comfort & Jones, 2018, *Sports Medicine* 48:2235–2253):
- The sharper the cut, the slower the approach must be, because the momentum to remove grows.
- Sharper cuts (> 90°) are force-dominant; shallower cuts (< 90°) are velocity-dominant.
- A **pivot** — one foot stays in contact and rotates — is the strategy for changes of about 135° and more.

**Penultimate foot contact** (Dos'Santos et al., 2019 review, *Strength & Conditioning Journal*):
- For cuts of 60° and more, braking happens mainly in the step **before** the plant (the "preparatory step").
- The plant then redirects and re-orients the body.

**Soccer players at 45 / 90 / 135 / 180°** (Falch et al., 2020, *Frontiers in Sports and Active Living*, Table 1):

| | 45° | 90° | 135° | 180° |
|---|---|---|---|---|
| Plant-step contact | 0.15 s | 0.18 s | 0.21–0.23 s | 0.30–0.33 s |
| Deceleration steps (20 m approach) | 2.9 | 5.4 | 6.4 | 6.3 |
| Deceleration steps (4 m approach) | 0.4 | 2.7 | 3.3 | 3.3 |
| COM lowering in the plant step | 0.18–0.20 m | 0.26–0.29 m | 0.30–0.32 m | 0.33–0.35 m |
| Acceleration-step contact | 0.15 s | 0.18 s | 0.20 s | 0.20–0.21 s |

**180° turn (505 test)** (Dos'Santos et al., 2021):
- The **antepenultimate** contact does more of the braking than the penultimate.
- Faster turners use greater, more horizontal braking forces and shorter final contacts.

**Cutting techniques** (review of side-step, crossover and split-step):
- The **side-step** plants the foot opposite the new direction and pushes off.
- The **crossover** plants the foot on the new direction's side; the other leg crosses in front.
- In plantar pressure, the crossover loads the lateral forefoot and the side-cut the medial forefoot.

**Trunk:**
- Lateral trunk flexion is the main strategy when there is little time to prepare a cut.
- Leaning *away* from the cut raises knee loading. TURN-1 leans *into* the new direction.

**Curved running** (soccer studies):
- The body leans toward the centre to produce the centripetal force (∝ v²/r).
- Tighter radii reduce acceleration and top speed.
- The mean sprint angle in matches is only about 5°, so most steering is gentle.

## How the V1 parameters follow (`turn1_loco.js`, `T1`)

| TURN-1 parameter | Value | Basis |
|---|---|---|
| Plant contact `plantTc` | 45° 0.17 s · 90° 0.24 s · 135° 0.28 s · 180° 0.34 s | Falch 2020, lengthened at 90° for readability **(dramatised)** |
| Entry speed at the plant `sEntry` | 45° 7.2 · 60° 6.0 · 90° 4.3 · 120° 3.4 · 135° 3.0 · 180° 2.4 m/s | the angle–velocity trade-off |
| Braking `aBrake` | 9 m/s² mean over a braking step; 1–3 braking steps | Falch uses 3–6 steps; Touchline compresses them **(dramatised)** |
| Plant crouch | 45° 8 cm · 90° 13 cm · 135° 15 cm · 180° 15 cm (+ a reach-driven drop ≤ 20 cm) | Falch's 0.18–0.35 m COM lowering, split between the crouch and the drop |
| Pivot | ≥ 135°; foot yaw up to 85° about the toe pad; the plant reverses the velocity along the incoming line | Dos'Santos 2018 (pivot definition); 505 studies |
| Technique | **side-step** on the outside foot (preferred); **crossover** on the inside foot up to 70° when it is ≥ 0.2 s sooner | the cutting-technique review; responsiveness |
| Arc lateral acceleration `aLat` | 5.2 m/s² at 3 m/s → 3.2 m/s² at 9.5 m/s | curved-sprint findings (speed loss on tight radii) |
| Lean | atan(a/g) of the step's planned mean acceleration, ≤ 28° lateral | the centripetal model; lean into the new direction |
| Stance horizontal acceleration `aStanceMax` | 17.5 m/s² mean (≈ 2.8 g peak with the half-sine) | upper end of reported cutting forces **(dramatised)** |
| Acceleration steps | contact ≈ 0.19 s, short flight | Falch acceleration-step contacts |

**Sources:**
- [Dos'Santos et al. 2018, angle–velocity trade-off (PMC6132493)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6132493/)
- [Dos'Santos et al. 2019, the role of the penultimate foot contact (Salford repository)](https://salford-repository.worktribe.com/output/1368035/role-of-the-penultimate-foot-contact-during-change-of-direction-implications-on-performance-and-risk-of-injury)
- [Falch et al. 2020, COD at 45–180° in soccer players (Frontiers)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2020.594567/full)
- [Dos'Santos et al., antepenultimate / penultimate / final contacts in the 505 (Salford)](https://salford-repository.worktribe.com/output/1348620/how-early-should-you-brake-during-a-180-turn-a-kinetic-comparison-of-the-antepenultimate-penultimate-and-final-foot-contacts-during-a-505-change-of-direction-speed-test)
- [Biomechanics of the 180° turning phase (PMC8196559)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8196559/)
- [Biomechanical comparison of cutting techniques: a review](https://lida.sport-iat.de/ta/Record/4055855)
- [Forefoot loading during three athletic tasks](https://sponet.de/sponet/Record/4012763)
- [Curved running in soccer: inside vs outside limbs](https://ojs.ub.uni-konstanz.de/cpa/article/view/1954/1822)
- [Science for Sport: why curved running is important](https://scienceforsport.com/dont-just-sprint-in-a-straight-line-why-curved-running-is-important)

The PMC pages blocked automated fetching; their findings are taken from the publishers' abstracts and search summaries. Falch 2020's Table 1 was read directly.

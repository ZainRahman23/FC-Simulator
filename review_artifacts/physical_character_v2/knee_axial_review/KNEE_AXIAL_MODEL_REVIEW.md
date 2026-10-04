# Knee axial (tibial internal / external rotation) model: biomechanics research review

**Date:** 2026-10-04.
**Instruction:** `../sources/2026-10-04_user_instruction_knee_axial_research_review.md` (verbatim).
**Status:** research only.
- **Nothing in the model is changed.** No simulator code was edited and no simulation was run for this review.
- Every recommendation here is a proposal. It changes joint limits, so it needs your approval under the standing rule.

**How it was derived:**
- Biomechanics first. The G1/G2/G3 tests appear only as labelled context (§2.3, §6). No parameter was chosen to make a test pass.
- Where studies disagree, I give ranges and explain why (§3.13).

**Evidence base** (`literature/`, every value tagged):

| file | topic |
|---|---|
| `knee2_passive_rom_neutral.md` | passive ROM at defined torques, deep flexion, coupled / neutral path, screw-home |
| `knee2_torque_load_muscle.md` | torque–rotation shape, compression / weight-bearing, muscles, injury torques |
| `knee2_active_tasks.md` | active ROM, strength, moment arms, football task kinematics, planted-leg yaw sharing |
| `knee2_models.md` | how OpenSim / COMAK / AnyBody / MyoSuite / physics-character models treat tibial rotation (read from the model files) |
| `../final_pre_e1a/literature/lit2_knee_axial.md` | the earlier review, which these files verify and correct |

**Tags:**
- [FT] full text read.
- [FIG] read from a figure.
- [SUPP] read from a supplementary data file.
- [ABS] abstract only.
- [SEC: x] read in source x, not in the primary paper.
- [DERIVED] my or the agents' arithmetic.

"Bone-level" means rotation measured on the bones (RSA, CT, MRI, fluoroscopy, bone pins, bone-fixed robot sensors). Foot- or boot-level devices read about 2× the tibiofemoral value (lit2 §0.1: Almquist 2002 RSA; Shoemaker & Markolf 1982).

**What I verified myself:**
- The pooled cadaver means in the Seiferheld 2026 supplement (Table S4: IR / ER at 5 N·m, 0–120°).
- Blankevoort 1988 Fig. 5 (the ±3 N·m envelope), read from the page scan.
- The current-law numbers (`evidence/current_law.mjs`).
- The law-shape fits (`evidence/fit_shape*.mjs`, `width_variants.mjs`).
- The candidate tables (`evidence/candidate_envelope.mjs`).

The Walker-equation vs model-file check is the models agent's (`knee2_models.md` B1–B3).

**Conventions:**
- θ is tibial internal rotation (+) relative to the femur, measured from the tibia's orientation at full extension ("absolute").
- φ is knee flexion.
- θ0(φ) is the passive zero-torque (neutral) path.
- "Per side" means measured from θ0.
- Totals = IR + ER.

**V2's knee frame and the literature's:** with knee varus locked, V2's swing-twist "rot" angle about the shank axis is the Grood & Suntay joint-coordinate-system (JCS) tibial internal/external (IE) angle, so the literature values transfer directly. Flexion is about the femoral axis, perpendicular to the shank axis.

---

## 0. Bottom line

1. **The current V2 knee axial model is outside the human evidence by much more than "2×" at physiological torques.**
   - At 5 N·m it allows 64–66° total at every flexion angle.
   - The in vivo bone-level knee allows about 16° at full extension, about 23° at 30° and about 26° at 90° (6 N·m).
   - That is **2.6–4× too wide**, worst at full extension. At its hard limits (70° total) it is about 1.8× too wide.
   - The cause is structural:
     - a 50° zero-torque zone at ≥ 60° flexion;
     - hard limits (−40° / +30°) fixed at every flexion angle;
     - a "screw-home" term that scales only the soft onset, so the range at any given torque hardly changes with flexion (§2).
2. **Range depends on flexion.**
   - **Robust:** narrowest at full extension; 85–95 % of the plateau by 15–20°; flat from about 30° to **at least 120°**.
   - **Probably** narrower again beyond about 125–130° (low confidence).
   - **In vivo, the narrowing at extension is mostly on the external side:** at 5 N·m, ER 6–7° vs 14–16° in mid-flexion, while IR stays about 9–11°. Cadavers narrow on both sides.
3. **The neutral axial orientation moves internally with flexion:**
   - about 5° by 15–20°, 10–13° by 60°, 12–15° by 90°, 15–18° by 120°;
   - **about 20° (range 11–30°) at 145–150°**;
   - between-subject SD 6–9°.

   The earlier figure "≈30° at 150°" is the top of the range: Hamai's 30° is an absolute angle in its own axis frame.
4. **The screw-home is about 5–15° (central 8–10°) of tibial external rotation over the last 20–40° of extension. It is not obligatory.**
   - External loads override or reverse ≥ 15–20° of the coupled rotation at 90–110°.
   - It should be modelled as a **moving neutral plus an envelope that narrows toward extension**, never as a rigid kinematic coupling.
5. **Torque–rotation is a J-curve:**
   - a small slack zone (in vivo about ±2–5°, much smaller than the 10–25° seen in cadavers);
   - roughly exponential stiffening, 0.1–0.6 N·m/° below 2.5 N·m to 2–5 N·m/° at 10–15 N·m;
   - **no discrete wall below about 25 N·m**;
   - ligament injury at about 25–35 N·m or more.

   The existing V2 law shape reproduces the in vivo torque–angle points within 0.5–1° once two things change: the limits are measured from θ0, and the hard limit sits at the clinical end-feel (about 10–15 N·m) instead of 25 % of capacity (6.8 N·m) (§4.2).
6. **Weight-bearing makes the knee much stiffer** (cadaver: −20 to −55 % rotation at 1 BW, −60 to −85 % at 2 BW).
   - In tasks, bone-level rotation stays within about −1° to +15° of the extension pose, with only 3–6° of load-driven deviation from the coupled path, despite net external rotation moments of 0.2–0.9 N·m/kg.
   - No in vivo bone-level laxity under body weight exists. This is the largest evidence gap.
7. **In a planted footballer's leg, most body yaw belongs to the hip, the shoe–ground pivot and the foot/ankle chain**, not to the knee: knee ≲ 10–15° per stance, about 15–30 % of an ordinary cut, < 10 % of a 180° pivot.
   - This share is derived from per-joint excursions. No study partitions it directly.
8. **Recommended model** (§5):
   - keep a 2-DOF knee (flexion + actuated axial, varus locked);
   - a moving neutral θ0(φ);
   - flexion-dependent asymmetric per-side widths;
   - the existing exponential law plus 3° end-stop, with knee-specific torque at the hard limit (about 15 N·m);
   - a conservative potential formulation;
   - engine emergency stops moved with the envelope;
   - a separate active / planning box;
   - no rigid coupling;
   - no compression term at first, with a preregistered test that decides whether one is needed.
9. **Before E1a** (§7): **the evidence supports changing the knee model before E1a.** The reasons:
   - it blocks the evidence-supported ankle law;
   - the E1a stance knee works at 4–25° flexion, where the current envelope deviates most (about 4×);
   - the reference twist policy needs a defined θ0;
   - changing the plant after E1a would invalidate E1a's evidence.

   It does not by itself authorise E1a. The change needs your approval, a default-off implementation, the validation in §6, G0–G3 regression, re-measured engine stops, and a re-frozen E1 preregistration.

---

## 1. Corrections to the earlier knee review (lit2 / `KNEE_AXIAL_CONCLUSION.md`)

| earlier statement | corrected | basis |
|---|---|---|
| Neutral about 30° IR at 150° | **about 20° (11–30°)**. Hamai's 30° is absolute in a cylindrical-axis frame; its 85 → 150° change is 15°. Across in vivo weight-bearing studies, extension → 145–150° gives 15–29°; cadaver passive paths give 7–20° | Qi 2013 [FT], Kono 2018 [FT/FIG], Leszko 2011 [FT-sum], Tanifuji 2011 [ABS], Li 2004 [ABS], Most 2004 [ABS], Victor 2010 [ABS] |
| Relaxed stiffness 0.25–1 N·m/° | holds **below about 5 N·m only**. 5–10 N·m: 1–2.5 N·m/°; 10–15 N·m: 2–5 N·m/° | Blankevoort 1988 [FIG]; Neumann 2015a CT [FT]; Serbino / Pedersen [SUPP] |
| Hard limit "near the 9–10 N·m points" | the clinical end-feel band is **10–15 N·m** (in vivo bone-level data reach ±15 N·m). Injury torques are about 25–35 N·m or more | Neumann 2015a [FT]; Meyer & Haut 2008 [ABS]; Shoemaker 1988 [ABS] |
| Extension range 0.4–0.7 of mid-flexion | **depends on torque**: 0.3–0.4 at ≤ 3 N·m, 0.55–0.7 at 5 N·m. In vivo the narrowing is mainly ER | Roth 2015 [SEC], Arnout 2022 [SEC], Blankevoort [FIG], Seiferheld pooled [SUPP], Hemmerich 2011 / Nordt 1999 [SEC: Zee 2020] |
| Plateau to about 100° | plateau to **at least 120°** (pooled cadaver at 5 N·m: 37.9° total at 120° vs 35.9° at 90°) | Seiferheld 2026 [SUPP, verified]; Kennedy 2013, Wijdicks 2013 [SEC] |
| No torque-defined data beyond 120° | still none in vivo. Cadaver evidence leans toward narrowing beyond about 125° (low confidence) | van Kampen, Nielsen [FIG via Blankevoort]; Li 2004 [ABS]; Kono 2018 [FIG]; against: Markolf 1976 |
| Markolf 1976 "IR at 8 N·m" | these are **total free laxities between bilinear breakpoints** (effective about 0.5–2 N·m), not IR at 8 N·m | Blankevoort 1988 [FT] |
| Moewis 2016 n = 9 | 13 healthy contralateral knees tested; 9 completed all sessions | Moewis [FT] |

---

## 2. The current V2 knee, measured the same way as the literature (context)

**Spec:**
- `spec/v2_joints.js` knee: rot active / soft [−30, +20], hard [−40, +30] (anatomical, + = internal); centre −5.
- Coupling: soft range × clamp(φ/60°, 0.1, 1); hard fixed.
- Passive law: exponential B = 6/rad from soft to 25 % of the opposing capacity at hard (6.8 N·m at 78 kg), then the end-stop reaches 100 % capacity (27.3 N·m) 3° beyond hard.
- Evidence tag: "axial rotation (recalled)".

### 2.1 Rotation at defined torques (78 kg; `evidence/current_law_78kg.txt`)

| φ | soft [ER, IR] | IR / ER at 5 N·m | total at 2.5 / 5 / 10 N·m | in vivo bone-level total at 5 N·m | ratio at 5 N·m |
|---|---|---|---|---|---|
| 0° | [−3, +2] | 27.2 / 37.1 | 52.0 / 64.3 / 70.9 | 16 (15–17) | **4.0×** |
| 30° | [−15, +10] | 27.4 / 37.3 | 53.8 / 64.7 / 70.9 | 23 (18–23) | **2.8×** |
| 90° | [−30, +20] | 28.2 / 38.2 | 59.9 / 66.4 / 71.0 | about 24 (26 at 6 N·m) | **2.7×** |
| 146° | [−30, +20] | 28.2 / 38.2 | 59.9 / 66.4 / 71.0 | unknown, probably narrower | — |

### 2.2 Structural findings

1. **The "screw-home" term is nearly inert.**
   - It narrows only the zero-torque zone.
   - Because the hard limits and the torque at hard are fixed, the range at any physiological torque changes by only 2° between 0° and 90° flexion (64.3° vs 66.4° at 5 N·m).
   - **Full extension, the stiffest posture of the real knee, is about as compliant as mid-flexion in the model.**
2. **Fixed zero.** The envelope never moves with flexion, while the human neutral moves about 15° by 90° and about 20° by 145–150°.
3. **The slack zone is 50° wide at φ ≥ 60°** (in vivo about 4–10°).
   - In series with the foot axial joint, the whole lower leg therefore has a large torque-free yaw zone.
   - With an ankle neutral stiffness k > 0, the ankle is the only element that resists inside it, so the ankle can drive the knee to a wall.
4. **The torque at the hard limit is low** (6.8 N·m). The clinical end-feel is about 10–15 N·m, and the in vivo curves continue past it.

### 2.3 Context only: the prone-rest case

The case: V1-matched passive fall, ankle k = 0.13, knee φ 146.3°, θ = +32.4°, 23 N·m at the end-stop.
- Under the central candidate in §5, θ0(146°) ≈ 19°, so that pose would be **+13° IR from neutral, beyond the deep-flexion end range** (about 34 N·m on the candidate law).
- A knee resting at +32° absolute at 146° flexion under a gravity load of about 0.5 N·m is plausible only at the top of the evidence: θ0 ≈ 30° and no deep-flexion narrowing (`evidence/candidate_envelope_78kg.txt`).
- **So the evidence does not "explain" that rest pose. It says a physiological knee would not rest there.** With a physiological envelope the passive fall would settle differently: the knee less internally rotated, with the hip and foot taking the asymmetry, as in vivo kneeling shows (Kono 2022/2024: segment rotations 12–30°, tibiofemoral 6–14°).
- How G1's settled-rest rows respond is a test outcome, not a design input.

---

## 3. Answers to the twelve questions

### 3.1 Q1. Passive IR/ER ROM across flexion (full extension → deep flexion)

**In vivo, bone-level (primary for a tibiofemoral DOF in a living athlete; per side from the resting / zero-torque position):**

| φ | torque | IR° | ER° | total° | source |
|---|---|---|---|---|---|
| 0° | about 5 N·m | 9.6 ± 4.3 (M) / 9.5 ± 2.7 (F) | 6.2 ± 3.0 / 7.0 ± 2.6 | 15.8 / 16.5 | Hemmerich 2011, MRI [SEC: Zee 2020] |
| 20° | 5 N·m | 10.8 | 7.4 | 18.2 | Nordt 1999, CT, n = 21 [SEC: Zee 2020] |
| 30° | ±2.5 N·m | 3.7 ± 1.4 | 7.6 ± 3.5 | 11.3 | Moewis 2016, fluoroscopy + CT [FT] |
| 30° | about 5 N·m | 8.9 ± 4.8 / 8.8 ± 3.7 | 14.6 ± 5.6 / 13.9 ± 4.7 | 23.5 / 22.7 | Hemmerich 2011 [SEC] |
| 30° | 5 / 10 / 15 N·m | 5–8 / 7–15 / 9–15 | 16–20 / 22–23 / 24–25 | — | Neumann 2015a, CT, n = 6 (few subjects per level) [FT] |
| 90° | ±2.5 N·m | 4.0 ± 2.0 | 10.0 ± 3.1 | 14.0 | Moewis [FT] |
| 60° / 90° | 6 N·m | — / 10 | — / 16 | 22 ± 6 / 25–26 | Almquist 2002, RSA, n = 5 [SEC: Tsai 2008, Neumann 2015b] |
| 120–160° | — | — | — | **no torque-defined in vivo data** | — |

**In vivo, skin-sensor devices at 20° (VKLD):**
- 5 N·m, men: IR 8.9 ± 4.1, ER 12.4 ± 3.6, total 21.2 ± 6.9°.
- Women: total 26.0°.
- Shultz 2011, n = 107 [FT].

**Cadaver, bone-fixed** (an upper bound for a relaxed knee; in vivo ≈ 0.65–0.8× cadaver at the same torque [DERIVED]):
- **Pooled, 5 N·m** (Seiferheld 2026, 161 studies; verified from Table S4 [SUPP]):

  | φ | 0° | 15° | 30° | 45° | 60° | 90° | 120° |
  |---|---|---|---|---|---|---|---|
  | IR | 9.4 | 17.0 | 19.1 | 20.2 | 18.8 | 17.8 | 17.7 |
  | ER | 10.9 | 17.3 | 17.0 | 17.1 | 17.8 | 18.1 | 20.2 |
  | total [DERIVED] | 20.3 | 34.2 | 36.2 | 37.3 | 36.6 | 35.9 | 37.9 |

  SDs 4–9°.
- **±3 N·m** (Roth 2015, n = 10 [SEC + ABS]): 0°: 4.6 / 4.4; 45°: 14.8 / 14.4; 90°: 14.6 / 14.5.
- **Blankevoort 1988** (RSA, n = 4, absolute frame [FIG, Fig. 5 read by me]): IR limit about 8° at 0° → 17–23° at 20° → 22–33° at 90–95°. ER limit about 6–10° → 11–18° → 16.5–21.5°.
- **Deep flexion (cadaver):**
  - Markolf 1976 (35 knees): free laxity about 25–26° at 135°, the same as at 45–90° (breakpoint definition).
  - van Kampen (3 knees, ±3 N·m): total falls about 10–20° between about 120–125° and 133–138°.
  - Li 2004 (13 knees, robot): "highly constrained" at 150°; muscle loads change rotation only up to 120° [ABS].

**Answer:**

| torque | full extension | 30–120° |
|---|---|---|
| ±2.5 N·m | — | IR about 4°, ER about 8–10° |
| ±5–6 N·m | total about 16° (IR about 9.5°, ER about 6.5°) | total about 22–26° (IR about 9–10°, ER about 14–16°) |
| ±15 N·m | — | about IR 9–15°, ER 24–25° (one CT study) |

- Above 120° the in vivo range is unknown. Cadaver and indirect in vivo evidence suggest narrowing to 0.3–1.0× the plateau by 145–150°.

### 3.2 Q2. How rotational freedom changes with flexion

**Shape** (high confidence for cadaver, moderate in vivo):
- minimum at 0°;
- steep rise: about 85–95 % of the plateau by 15–20° (pooled), complete by about 30–40° (Lagae 2020 IR: 7.5 / 11.1 / 15.1 / 18.1 / 19.5° at 0 / 10 / 20 / 30 / 40°) [FT];
- flat from about 30° to ≥ 120° (± 10 %);
- beyond about 125°, probably narrowing (low confidence).

**Ratio of the extension range to the plateau** (it depends on torque):
- 0.3–0.4 at ≤ 3 N·m;
- 0.55–0.7 at 5 N·m;
- below about 3 N·m the extended knee is far stiffer.

**Which side narrows:**
- In vivo, at 0–20° and 5 N·m, IR (about 9.5–11°) is about the same as in mid-flexion (about 9–10°), while ER (about 6.5–7.4°) is about half the mid-flexion value (14–16°).
- Cadavers narrow on both sides.
- The in vivo asymmetry has a physical reading. At extension the tibia is already "screwed home" (externally rotated), so little ER remains. In absolute terms the ER wall stays near −5° to −10° while the IR wall moves internally with flexion (§3.4).

**Hyperextension:** narrower again (one cadaver knee at about −4°: IR about 3.5°, ER about 6° at ±3 N·m) [FIG]. Low confidence.

### 3.3 Q3. Screw-home: what, over what range, how to represent

**What it is:**
- The tibia rotates externally relative to the femur in the last part of extension (equivalently, it rotates internally as flexion begins).
- It comes from the tibial articular geometry plus the cruciates. It survives meniscectomy and femoral resurfacing but not tibial component replacement (Hamada 2018 [ABS]). It is sensitive to cruciate pre-strain and the flexion axis (Moglo & Shirazi-Adl 2005 [ABS]).

**Magnitude and range:**
- About 5–15° (central 8–10°) over the last 20–40° of extension. SD 3–8°.
- Walker's average knee (used by OpenSim): 3.4° over the last 10°, 6.3° over the last 20°, 8.6° over the last 30° (`knee2_models.md` B1, read from Rajagopal2016.osim, matching the Walker 1988 equations).
- In vivo: Qi 2013 6.1 ± 7.6° (0–30°, weight-bearing lunge) [FT]; Kono 2018 about 11–13° (0–30/40°, squat) [FIG]; Ishii 1997 10.6 ± 2.8° (0–60°, bone pins) [ABS]; Iwaki 2000 about 5° by 10° ("may be obligatory") [ABS].

**Not obligatory:**
- Blankevoort 1988 [FT]: "In the unloaded configuration, there is no sign of an obligatory external rotation during extension … at least not as a passive characteristic of the knee."
- A knee loaded into IR (by axial compression, or quadriceps force, which produces an internal tibial torque) rides the internal wall. Because that wall narrows toward extension, the tibia must rotate about 10–15° externally over the last 20°, which is the screw-home. A knee loaded into ER rotates internally instead.
- Bone pins show no screw-home in the stance phase of walking (Lafortune 1992 [ABS]).
- Under ER loading at 90–110°, ≥ 15–20° of the coupled rotation reverses (Iwaki 2000; Kono 2018 cross-legged sitting; Victor 2010 simulated squat: 4.7° ER instead of 16° IR).

**Representation:**

| option | verdict |
|---|---|
| shift of the neutral axial orientation | **yes**: θ0(φ) with slope about 0.34°/° near extension. It gives the unloaded coupled internal rotation and the small "possibly obligatory" part |
| asymmetric, flexion-dependent limits | **yes, primary**: the envelope narrows toward extension (in vivo mainly ER). This makes the screw-home appear under internal loading and its reversal under external loading |
| passive torque | **yes**: the J-curve about θ0 is the weak centring torque. Inside the small slack zone there is no centring, consistent with the cadaver "free zone" and in vivo hysteresis |
| rigid kinematic coupling | **no**. It would block the documented reversals and invent torques when loads oppose it. It is also what OpenSim / MyoSuite do (`knee2_models.md`), which is appropriate for gait inverse dynamics, not for a contact-driven physical character |
| combination | **moving neutral + flexion-dependent asymmetric envelope + J-curve torque about the neutral** |

### 3.4 Q4. Neutral / rest axial angle vs flexion

| φ | cadaver passive / unloaded | in vivo, non-weight-bearing / active | in vivo, weight-bearing | Walker 1988 (OpenSim) | **recommended θ0 (range)** |
|---|---|---|---|---|---|
| −5° | Lenhart model: −3.3° at −10° | — | — | — | **−1.8 (−3 to 0)**, low confidence |
| 0° | 0 (definition) | — | — | 0 | **0** |
| 10–20° | about 5 (Iwaki) | 3–6 | 5–10 (Qi, Kono) | 3.4 / 6.3 | **3.4 / 6.3 (2–8)** |
| 30° | — | — | 6–13 | 8.6 | **8.6 (6–13)** |
| 60° | — | 10.6 (Ishii, 0–60°) | 7–15 | 13.2 | **13 (6–15)** |
| 90° | 5–14 (axis-dependent, Most 2004); about 19 under 300 N (Blankevoort Fig. 10) | 15–18 [SEC] | 7–20 | 14.9 | **15 (5–20)** |
| 120° | about 20 at 110° (Iwaki) | — | 8–29 (Qi 8, Johal 20, Asano 29) | 15.0 | **15 (8–29)** |
| 145–150° | 7–20 (Li 11.1 ± 6.7; Most 7–20; Victor 16) | +12–15 over 90 → 162° (Nakagawa) | 15–29 (Qi 15.2 ± 9.2; Kono about 22; Leszko 23–29; Tanifuji 26) | Walker not valid; Lai extrapolation 14.8 | **about 19–20 (11–30)** |

- Between-subject SD is 6–9° (3–12°).
- **θ0 is soft.** The centring stiffness is small compared with the walls (Blankevoort free zone; Iwaki "suppressible"; Wilson 2000 "very sensitive to load").
- **Envelope midline vs loaded path:**
  - In Blankevoort's absolute frame the ±3 N·m envelope midline moves only about 3–4° by 90°. Under 300 N of compression the zero-torque path reaches about 19°.
  - So in cadavers "neutral" depends on load inside a wide free zone. In vivo the free zone is small, ER-from-neutral exceeds IR-from-neutral at 30–90°, and the neutral sits on the IR side of the envelope.
  - θ0 should therefore be read as the **unloaded, lightly compressed zero-torque path**.
- **Consistency check** [DERIVED]: candidate θ0 = 15° at 90° minus the in vivo ER width at 5 N·m (about 15°) puts the ER wall near 0° absolute. That matches the observation that ER loading at 90–110° brings the tibia back to about the extension orientation (Iwaki; Kono cross-legged −3°; Victor −4.7°).

### 3.5 Q5. Passive torque–angle / stiffness, including end range

**Shape** (every full curve): slack zone → roughly exponential toe → steep, saturating end. No discrete wall below about 25 N·m.
- Blankevoort 1988 Fig. 4 (cadaver, 25°): about 20° near-zero zone; then IR +7° (0 → 3 N·m) and +2.8° (3 → 6); ER +15.4° and +3.5° [FIG].
- Neumann 2015a (in vivo CT, 30°): ER about 16–20° at 5 N·m, adding only 4–7° up to 15 N·m [FT].
- Fitted as T = A(e^{Bx} − 1), the rate constant is **B ≈ 0.15–0.25/°** [DERIVED from two independent datasets].

**Incremental stiffness per side, bone-level** [DERIVED]:

| torque band | stiffness |
|---|---|
| < 2.5 N·m | 0.1–0.6 N·m/° |
| 2.5–5 N·m | 0.5–1.2 N·m/° |
| 5–10 N·m | 1–2.5 N·m/° |
| 10–15 N·m | 2–5 N·m/° |

- Clinical in vivo stiffness at 5 N·m: 0.56–0.57 N·m/° (Markolf 1984 [SEC]); IER 0.43 ± 0.14 (men) / 0.32 ± 0.08 (women) N·m/° (Shultz 2011 [FT]).

**Slack zone:**
- Cadaver 10–25° (Wang & Walker; Markolf; Blankevoort).
- In vivo much smaller: at ±2.5 N·m the total is only 11–14°, so probably about ±2–5° [DERIVED].
- Hysteresis is present in every in vivo curve and grows with speed (Moewis [FT]; Neumann 2015b [FT]; Branch 2015: foot-level play about ⅓ of the range [FT]). No bone-level damping coefficients are accessible (Mote & Lee 1982 and Johnson & Hull 1988 hold them).

**End range and injury:**

| event | torque | source |
|---|---|---|
| ACL failure under isolated internal torque | 33 ± 13 N·m at 58 ± 19° IR (elderly cadavers, 30°) | Meyer & Haut 2008 [ABS] |
| ligament failure in ER | about the maximal voluntary torque, 30–71 N·m | Shoemaker 1982/1988 [ABS] |
| tibial spiral fracture | 131 ± 53 N·m | Edwards & Troy 2012 [ABS] |
| ACL already dangerous | 10 N·m internal torque at full flexion | Hame 2002 [ABS, lit2] |

- **A "wall" is a modelling device.** The clinical end-feel is about 10–15 N·m; damage is ≥ 25–35 N·m.

### 3.6 Q6. Loaded / weight-bearing vs unloaded

**Compression (cadaver):**

| load | effect | source |
|---|---|---|
| ≤ 300 N (≈ 0.4 BW) | ±3 N·m limits change < 2° | Blankevoort [FT] |
| ≈ 1 BW | rotation at ±4.9 N·m −20 to −55 % (30°: −21 % n = 1, −46 % n = 4; 0°: −33 to −56 %) | Hsieh & Walker 1976 [SEC: Seiferheld S2, digitised] |
| ≈ 2 BW | −58 % (30°), −80 to −85 % (0°) | Hsieh & Walker 1976 |
| 925 N | reduced rotatory laxity | Markolf 1981 (magnitude not accessed) |
| ≈ 100 kg | cut rotation to about 20 % | Wang & Walker (via Blankevoort / snippet) |

- The mechanism is condylar conformity, the "uphill" movement of the femur (Hsieh & Walker [ABS]).
- Compression mainly stiffens the toe region and shifts the steep part inward by a few degrees. It does not multiply the end-range stiffness: Shoemaker & Markolf 1985 found the laxity increase after ligament section unaffected by load, and Fleming 2001 found ACL strain under internal torque above about 3 N·m equal in weight-bearing and non-weight-bearing [ABS] [interpretation DERIVED].
- Compression also moves the zero-torque path:
  - 300 N drives IR inside the envelope in flexion (Blankevoort Fig. 10);
  - 1600 N gives +3.8° at 0° and −4.9° at 30° (Liu-Barba 2007 [ABS]);
  - 40 % BW in vivo gives 1–3°, sex-dependent (Shultz 2009).

**Weight-bearing in vivo:**
- The coupled rotation is greater and earlier with weight-bearing (Johal 2005 [ABS]).
- Knee torsional stiffness rises with weight-bearing (Mote & Lee 1982; Johnson & Hull 1988 [ABS]), but **no accessible in vivo bone-level laxity under body weight exists**. The VKLD 40 % BW data are figure-only, and their weight-bearing measure was unreliable (ICC −0.15 to 0.75).

**Tasks:**
- Bone-level tibiofemoral IR stays within −1° to +15° of the extension pose across 17 gold-standard datasets (walking, running, landing, hopping, stairs, cutting). It is mostly coupled to flexion at a median of about 0.25°/° (Gasparutto 2017 [FT + SUPP]).
- The load-driven deviation from the passive path is 3.7–5.6° (mean max 5.6 ± 5.5°) in landing (Myers 2011 [FT]).
- These small rotations coexist with net external knee internal-rotation moments of:
  - 0.24 ± 0.21 N·m/kg in sidestep cuts (Mausehund 2024, n = 702 [FT]);
  - 0.32 / 0.48 / 0.74 / 0.86 N·m/kg in 45° / 90° / 135° / 180° direction changes (Li & Qian 2025 [FT]);
  - 0.4–0.5 N·m/kg in 180° pivots (Leppänen 2021 [FT]).
- **So the loaded knee is axially much stiffer than the unloaded laxity curves** (articular conformity + ligaments + muscles) [DERIVED].

**Answer:**
- Unloaded laxity curves overstate the compliance of a loaded stance knee, probably 1.5–5× at ≥ 1 BW in the toe region.
- The in vivo magnitude is unmeasured.
- This matters for stance in a simulation (§5.6, §6 V6).

### 3.7 Q7. Planted footballer's leg: whose yaw is it?

No study partitions body yaw over a planted foot at bone level. The budget below is derived from per-joint bone-level excursions and indirect evidence (`knee2_active_tasks.md` §5) [DERIVED, low–moderate confidence].

| contributor | evidence | share |
|---|---|---|
| **hip** | Foot-imposed tibial rotation "is resolved at the hip joint, with changes at the tibiofemoral joint that barely are detectable" (Lafortune 1994, bone pins [ABS]). Football pressing: hip about 17° in 100 ms, knee near neutral (Sasaki 2018 [ABS]). Hip passive ROM in footballers IR 21–26°, ER 31–34°; hip rotators about 2× stronger per kg than knee rotators | **the largest: about 40–60 % of the yaw in a 45° cut** |
| **shoe–ground** | Foot rotates 18 ± 12° on turf in stop-turns (lit3); boot–turf torque limits 28–63 N·m (lit3); essential in sharp pivots | 0–10° in cuts; large in pivots |
| **ankle / subtalar / midfoot** (foot vs shank) | tibia vs calcaneus about 5° touchdown → midstance and 10–13° per running stance, coupled to eversion (Stacoff 2000; lit1/lit3); unloaded axial stiffness 0.10–0.15 N·m/° (lit1); active subtalar path (oblique axis, moment arms up to about 20 mm) | about 5–15° |
| **knee (tibiofemoral)** | per-task excursion 3–14°, mostly flexion-coupled IR; cutting 6.5–7° (Gasparutto); a near-straight 180° pivot about 12° ER (Khodabandeloo 2026, dual fluoroscopy [FIG]) | **≲ 10–15° per stance: about 15–30 % of a 45° cut, < 10 % of a 180° pivot** |

**Series interaction:**
- The knee axial and the foot axial joint act in series about nearly the same (shank) axis, so their compliances add.
- Near neutral, physiologically the **foot/ankle is the compliant element** (0.10–0.15 N·m/°) and the knee is stiffer once past its small slack zone (0.4–1 N·m/° by a few N·m), stiffest at extension.
- The current V2 knee reverses this: a 12–50° zero-torque zone in series with the ankle.

### 3.8 Q8. Which formulation?

| element | use? | why |
|---|---|---|
| flexion-dependent hard limits | **yes** | The range at every torque level depends on flexion (§3.2). Moving only the soft onset is nearly inert (§2.2) |
| flexion-dependent soft limits (slack zone) | **yes, small** (±1.5–3° about θ0) | In vivo slack is small. The large V2 soft zone is the main error |
| moving neutral θ0(φ) | **yes** | §3.4. Both limits are referenced to θ0 |
| passive torque (J-curve) | **yes** | §3.5. The existing exponential + end-stop shape suffices (§4.2) |
| screw-home coupling (rigid) | **no** | §3.3 |
| compression-dependent stiffening | **not at first.** Add it only if the stance test (§6 V6) shows excess stance-knee rotation | The physics is real (§3.6), but in vivo magnitudes are unknown and the term needs the joint reaction force. Simplest-first, with a falsifying test |
| separate active / planning box | **yes** | For the knee axial, active rotation works against passive tissue torque. Active ≈ 0.8 of passive at 70–100° (foot-level, Muaidi 2017 [ABS]). V2's convention "active ROM = passive soft onset" does not hold for this axis (§5.7) |

### 3.9 Q9. Behaviour at the four regions

| region | neutral | envelope (per side from θ0, in vivo) | stiffness / feel | actuator authority | notes |
|---|---|---|---|---|---|
| **full extension (0–10°)** | θ0 0 → 3.4° (screw-home slope about 0.34°/°) | narrowest: total about 15–16° at 5 N·m. IR about 9.5° (cadaver 4.6–9.4), ER about 6.5°. Very stiff below 3 N·m (ratio to plateau 0.3–0.4) | stiffest posture of the knee | lowest (no measured value; plausibly 0.4–0.8 of the 90° value) | **Hyperextension is narrower still**. The E1a stance knee operates at 4–25° |
| **moderate flexion (20–45°)** | 6–11° | rising steeply to plateau by about 30–40°. At 5 N·m: IR 9–11°, ER 8–15° (rising with φ) | — | 0.77–0.81 of the 90° value at 20° (Shoemaker 1988 [ABS] + assumption) | Most football tasks (running, cutting, landing) happen here |
| **90°** | about 15° (5–20) | plateau. At 2.5 N·m: IR about 4°, ER about 8–10°. At 5–6 N·m: IR about 10°, ER about 15–16° (RSA). At about 15 N·m: IR about 13–15°, ER about 23–25° (extrapolated from 30° CT) | — | **highest** (moment arms peak at 70–90°; isometric IR 0.39, ER 0.46 N·m/kg at 80° flexion: Królikowska 2015 [FT]) | ER loading can bring the tibia back to about the extension orientation |
| **deep flexion (about 145°)** | about 19–20° (11–30) | **unknown in vivo.** Probably narrower: cadaver 0.3–1.0× the plateau (Li 2004 "highly constrained" at 150°; Kono: activity spread collapses from about 20° at 100° to about 2.5° at 150°) | probably stiff | muscles barely change rotation at 150° (Li 2004 [ABS]) | **Kneeling / prone asymmetry belongs to the hip and foot** (Kono 2022/2024) |

### 3.10 Q10. Passive anatomical vs actively controllable ROM

- **At 70–100° flexion, active ≈ 0.8 of passive** (foot-level): men active IR 32.8° vs passive 37.9°; ER 39.2° vs 48.9° (Muaidi 2017 [ABS]). Bone-level active totals are about 30–36° at 90° [DERIVED, low].
- **Active range shrinks toward extension** (Osternig 1980: 50° at 45° vs 57–59° at 90°; Mossberg 1983: 35 / 40 / 44° at 70 / 90 / 100°, both foot-level [SNIP]).
  - Voluntary tibial rotation at full extension has never been measured at bone level.
  - Hamstring force changes tibial rotation at every flexion angle except full extension (Li 1999 [ABS]).
  - Muscle loads have little effect at 150° (Li 2004 [ABS]).
- **Muscles stiffen the joint strongly but slowly.**
  - Co-contraction raises torsional stiffness more than 4× (0.16 → 2.54 N·m/°, foot-level, Louie & Mote 1987 [ABS]).
  - Electromechanical delay: hamstrings 44 ms, quadriceps 23 ms (Hannah 2014 [ABS]). Substantial unplanned stiffening probably takes ≥ 100 ms [DERIVED].
- **Strength:**
  - isometric IR 0.39 ± 0.07 and ER 0.46 ± 0.08 N·m/kg at 80° flexion, neutral axial angle (Królikowska 2015, men about 80 kg [FT]);
  - 27.8 N·m isokinetic IR at 90° (Armour 2004 [ABS]);
  - 30–71 N·m by condition (Shoemaker 1988 [ABS]).
  - Torque depends strongly on axial angle: IR torque ×1.49 at 30° ER (foot-level) and ×0.62 at 25° IR; ER torque the reverse (Królikowska [FT]).
  - The V2 0.35 N·m/kg is 0.90× (IR) and 0.76× (ER) the measured neutral values at 80°, so slightly conservative there. It is probably too high near extension and in deep flexion (no direct data).

**What matters for the simulation:**
1. Commanded or planned knee axial angles should be limited to an active box inside the passive envelope, not to the slack zone.
2. Knee axial actuator authority should be low near extension and in deep flexion.
3. An instant, high-gain knee axial servo acts like pre-set co-contraction. It is physiological only as an anticipatory set, not as an instant reaction (≥ 100 ms in humans).

### 3.11 Q11. Well established vs uncertain

| quantity | value / range | confidence |
|---|---|---|
| foot-level devices ≈ 2× tibiofemoral | 1.8–2.2× | **high** |
| range minimal at extension, plateau 30° → ≥ 120° | shape | **high** (cadaver), moderate (in vivo) |
| in vivo bone-level total at 5–6 N·m | 16° (0°), 18–23° (20–30°), 25–26° (90°) | **moderate–high** |
| in vivo IR / ER at ±2.5 N·m (30–90°) | about 4° / 8–10° | moderate (n = 13) |
| ER > IR from neutral at 30–90° (in vivo) | ER ≈ 1.5–2.5× IR | moderate |
| extension narrowing mainly ER (in vivo) | IR about 9.5–11°, ER about 6.5–7.4° at 5 N·m (0–20°) | **low–moderate** (2 studies; cadavers narrow both sides) |
| J-curve, no wall below about 25 N·m | shape | **high** |
| stiffness by torque band | 0.1–0.6 / 0.5–1.2 / 1–2.5 / 2–5 N·m/° | moderate |
| torque–angle above 6 N·m in vivo | IR 9–15°, ER 22–25° at 10–15 N·m | **low** (one CT study, n = 6) |
| neutral path θ0(φ) to 120° | Walker curve within the in vivo ranges; SD 6–9° | moderate |
| θ0 at 145–150° | about 20° (11–30°) | **low–moderate** (axis definition alone moves it about 13°) |
| envelope at 130–160° | 0.3–1.0× plateau | **low** |
| screw-home | 5–15°, not obligatory | moderate |
| compression effect in vivo | unmeasured; cadaver −20 to −55 % at 1 BW | **low** |
| injury torques | ACL about 33 ± 13 N·m; ER failure 30–71 N·m | moderate |
| strength at 80° flexion | 0.39 / 0.46 N·m/kg | moderate–high |
| strength vs flexion (0°, > 100°) | no data | **low** |
| axial damping / hysteresis magnitude | not accessed | **low** |
| planted-leg yaw partition | derived budget | **low–moderate** |
| sex / athlete effects | women 20–40 % laxer; heavier and elite footballers stiffer (Mouton −0.6°/kg foot-level; Muaidi 2009) | moderate (direction) |

### 3.12 Q12. Simplest defensible real-time knee

A **2-DOF knee** (flexion + one compliant, actuated axial DOF about the tibial long axis; varus/valgus locked, as now), with:
1. a moving passive neutral θ0(φ);
2. a flexion-dependent, asymmetric envelope referenced to θ0;
3. the J-curve passive torque (the existing V2 exponential + end-stop shape) on the deviation θ − θ0(φ), implemented as a potential so the flexion component −∂U/∂φ is included (conservative);
4. emergency engine stops that follow the envelope;
5. a separate active box for planning.

**What it omits** (accepted simplifications):
- varus/valgus laxity and axial-to-varus coupling (Walker varus ≤ 1.9°; Mills & Hull 1991);
- translations (≤ 7 mm);
- ligament-level loads;
- compression-dependent stiffening (tested for, §6 V6).

**Field precedent** (`knee2_models.md`):
- OpenSim / MyoSuite use the same neutral (Walker) but as a rigid constraint. COMAK / AnyBody free the axis and restrain it with ligaments and contact (too costly for 240 Hz × 22 players).
- Physics-character humanoids omit the axis entirely.
- Blankevoort's 2-DOF envelope concept and Dumas 2012's "angle-dependent joint coupling and stiffness" are the closest published reduced-order analogues.

### 3.13 Why studies disagree (and how the ranges above absorb it)

1. **Definition of zero.** "From neutral" vs absolute angles. Neutral is ill-defined inside a slack / hysteresis zone (cadaver free zone about 20°; Moewis averaged the zero crossings, which fell 6–8° ER of the device zero). IR/ER asymmetry and θ0 move by 5–10° by convention alone.
2. **Measurement level.** Foot devices read about 2×. Skin markers add up to 13° of rotational error in cutting (Benoit 2006 [ABS]) and 63 % of the IE ROM in running (Reinschmidt 1997 [ABS]).
3. **Flexion-axis and coordinate choice.** The transepicondylar and geometric-centre axes, 4° apart, give 4.8° vs 13.8° coupled IR at 90° and 7.2° vs 19.9° at 150° (Most 2004 [ABS]). Small axis errors can create or abolish a 15° screw-home (Piazza & Cavanagh 2000). The Euler sequence itself matters little (≤ 2.7°, Blankevoort appendix).
4. **Torque level and limit definition.** 0.5 / 1.5 / 2.5 / 3 / 5 / 6 / 8–10 / 15 N·m, manual end-feel, or Markolf breakpoints. On a J-curve these give very different "ranges".
5. **Loading.** Compression (≥ about 1 BW) and muscle forces narrow the envelope and move the path inside it.
6. **Constraint during testing.** Robot constraint of the other DOFs changes IR at 120° from 13.4° to 18.6° (pooled).
7. **Cadaver vs in vivo.** Older tissue, frozen, stripped of muscle, no tone. In vivo ≈ 0.65–0.8× cadaver.
8. **Subjects.** Up to 4× between specimens (Wang & Walker); IE limits uncorrelated with other laxities (Roth 2015 JOR); sex, mass and sport effects.
9. **Activity-specific "coupling".** Squat, lunge, kneel, cross-legged, step-up and gait give different paths. A task path is a loaded path, not the passive neutral.

---

## 4. Supporting calculations (not tests)

### 4.1 Candidate envelope at a glance (78 kg; `evidence/candidate_envelope_78kg.txt`)

| φ | θ0 | hard [ER, IR] absolute | per side from θ0, IR° at 2.5 / 5 / 10 / 15 / 27 N·m | ER° at the same torques | total at 5 N·m |
|---|---|---|---|---|---|
| −5° | −1.8 | [−10.2, +8.0] | 3.9 / 5.4 / 7.8 / 9.8 / 12.7 | 2.4 / 3.9 / 6.4 / 8.4 / 11.3 | 9.3 |
| 0° | 0.0 | [−12.0, +14.0] | 5.9 / 8.2 / 11.5 / 14.0 / 16.9 | 3.8 / 6.1 / 9.5 / 12.0 / 14.9 | **14.3** (lit. 16, 15–17) |
| 10° | 3.4 | [−11.0, +17.4] | 5.9 / 8.2 / 11.5 / 14.0 / 16.9 | 4.9 / 7.7 / 11.6 / 14.4 / 17.3 | 15.9 |
| 20° | 6.3 | [−13.0, +20.3] | 5.9 / 8.2 / 11.5 / 14.0 / 16.9 | 7.5 / 11.3 / 16.1 / 19.3 / 22.2 | **19.5** (lit. 18–21) |
| 30° | 8.6 | [−14.7, +22.6] | 5.9 / 8.2 / 11.5 / 14.0 / 16.9 | 10.1 / 14.6 / 19.9 / 23.3 / 26.3 | **22.8** (lit. 21–23.5) |
| 60–120° | 13.2–15.0 | [−9 to −11, +27 to +29] | 5.9 / 8.2 / 11.5 / 14.0 / 16.9 | 10.6 / 15.2 / 20.6 / 24.0 / 26.9 | **23.3** (lit. 22–26) |
| 135° | 17.5 | [−3.1, +29.5] | 4.9 / 6.8 / 9.8 / 12.0 / 15.0 | 8.3 / 12.4 / 17.4 / 20.6 / 23.6 | 19.2 |
| 146° | 19.3 | [+4.3, +28.1] | 3.4 / 4.8 / 7.0 / 8.8 / 11.7 | 5.2 / 8.2 / 12.2 / 15.1 / 18.0 | 12.9 (unknown) |

- **Peak passive stiffness** just beyond hard: about 3.6–3.8 N·m/° (about 215 N·m/rad). The current knee's is about 6.7 N·m/°.
- **So the candidate introduces no stiffer regime than the accepted plant runs at 240 Hz.** It is still to be tested at 180 / 480 Hz (§6 V7).
- **At 2.5 N·m the candidate is 1–2° above the Moewis means** (IR 5.9 vs 3.7–4.0; ER 10.6 vs 7.6–10.0, within 1 SD). With this law shape you cannot match both the 2.5 N·m and the 5 N·m in vivo studies, because the two use different zero definitions. I fitted toward the 5–6 N·m totals, which come from more studies (`evidence/width_variants.txt`).

### 4.2 Can the existing V2 law shape represent the J-curve? (`evidence/fit_shape2.txt`)

Fitted to the mid-flexion in vivo band centres, per side from θ0:
- IR 2.5 → 4, 5 → 9, 10 → 11.5, 15 → 13, 30 → 15.5°.
- ER 2.5 → 8.5, 5 → 14.5, 10 → 20, 15 → 23, 30 → 25.5°.

| law variant | IR RMS | ER RMS |
|---|---|---|
| generic V2 (B 6/rad, torque at hard = 25 % of capacity = 6.8 N·m, end-stop to 27.3 N·m at +3°) | 0.92° | **2.44°** (hard too early, no 15 → 30 N·m tail) |
| **B 6/rad, torque at hard 15 N·m, end-stop to 30 N·m at +3°** | 1.00° | **0.55°** |
| B 8.6/rad, 15 N·m | 0.85° | 1.35° |
| B 11.5/rad (0.20/°), 15 N·m | 0.85° | 2.19° |
| B 6/rad, 10 N·m, end-stop at +4° | 0.70° | 1.12° |

- **The exponent B cannot be pinned down from these data** once the end-stop provides the steep tail.
- **What matters is where the hard limit sits:** at the clinical end-feel (10–15 N·m), with the existing 3° end-stop reaching about the capacity (the literature adds about 3–3.5° between 15 and 30 N·m).
- A knee-specific torque-at-hard of about 0.55 × the opposing capacity replaces the generic 0.25. B can stay at 6/rad.

---

## 5. Implementation recommendation (proposal; requires your approval)

### 5.1 Flexion-dependent neutral θ0(φ)

**Central:**
- θ0(φ) = Walker R_I(φ) = 0.3695φ − 2.958·10⁻³φ² + 7.666·10⁻⁶φ³ (degrees) for 0 ≤ φ ≤ 120°. This gives 3.4 / 6.3 / 8.6 / 13.2 / 14.9 / 15.0° at 10 / 20 / 30 / 60 / 90 / 120°.
- Linear to about 20° at 150°, then held to 155°.
- Hyperextension: slope 0.37°/° (θ0(−5°) ≈ −1.8°), low confidence. The alternative is to hold 0.

**Bands:** §3.4 table (SD 6–9° between subjects).

**Confidence:** moderate to 120°, low–moderate beyond.

**Representation:** θ0 is the reference of both envelope sides and of the passive law. It is soft (§5.3) and never a constraint.

**Controller consequence:** the reference twist policy's knee target must be θ0(φ), not 0. Otherwise the actuator fights the passive neutral (deep-flexion effort, posture conflict).

### 5.2 Flexion-dependent internal and external ROM (per side from θ0)

- **Plateau (30–120°):**
  - soft (slack-zone half-width): IR 3° (1.5–3.5), ER 1.5° (0–2);
  - hard (the angle at the clinical end-feel, about 15 N·m): IR 14° (12–15), ER 24° (20–25).
- **Flexion factors** (multiply both soft and hard on that side):
  - **IR:** 1.0 for 0–120°. At 0° the band is 0.5–1.0: the central 1.0 is the in vivo value; 0.5 is the cadaver ratio.
  - **ER:** 0.5 at 0° (0.3–0.6), rising smoothly to 1.0 by about 35° (smoothstep).
  - **Deep flexion (both sides):** 1.0 to 125°, falling to 0.6 (0.3–1.0) by 150°. **Low confidence; carry it as a sensitivity parameter.**
  - **Hyperextension:** ×0.7 at −5° (one cadaver knee; low).
- **Resulting absolute hard envelope** (central, 78 kg):

  | φ | hard [ER, IR] |
  |---|---|
  | 0° | [−12, +14] |
  | 30° | [−15, +23] |
  | 90° | [−9, +29] |
  | 146° | [+4, +28] |

  Compare the current [−40, +30] at every φ. **The envelope is narrower everywhere and relocated internally in flexion.**

### 5.3 Passive stiffness / torque behaviour

- **Shape:** keep the V2 law per side.
  - Zero torque inside the slack zone.
  - A(e^{B(x − s)} − 1) from soft to hard, with B = 6/rad (6–11.5).
  - **Knee-specific torque at hard = 15 N·m at 78 kg** (10–15; implemented as about 0.55 × the opposing capacity, so it scales with body mass like the rest of the spec).
  - The existing linear end-stop reaching 100 % of the opposing capacity (27.3 N·m; literature failure band 25–35 N·m) 3° beyond hard.
- **Targets the law must satisfy** (in vivo bone-level bands, §3.1, §4):
  - mid-flexion: IR 3–5 / 8–10 / 10–15 / 11–15° and ER 7–10 / 12–17 / 17–23 / 20–25° at 2.5 / 5 / 10 / 15 N·m;
  - full extension: total 15–17° at 5 N·m.
- **Formulation:** the passive potential U(θ − θ0(φ); φ) with the limits as functions of the knee's own flexion.
  - `sim/v2_passive.js` already takes −∂U over every term that depends on a joint (central differences with the joint's full rotation perturbed; `dep[]`). The flexion component U′·θ0′(φ) is therefore produced automatically and the law stays conservative.
  - (Checked in the code: `compute()` perturbs each body-2 axis of joint d and sums `termU` over `dep[d.k]`, with `softOf` / `hardOf` evaluated at the perturbed rotations.)
  - **Do not implement θ0 as a retargeted drive.** That would add or remove energy whenever the knee flexes under axial load.
- **Damping:** unchanged (0.3). Hysteresis is real, but no bone-level coefficient was accessible. Flagged.

### 5.4 Screw-home treatment

- **There is no separate screw-home term.** The screw-home emerges from two things:
  - the θ0 slope near extension (about 0.34°/°);
  - the ER narrowing toward extension (the absolute ER wall at −12° at 0° vs −15° at 30°, while the IR wall moves from +14° to +23°).
- **The existing coupling "knee rot by knee.flex" (soft range × clamp(φ/60°, 0.1, 1)) must be disabled for the knee** whenever the new envelope is on, or it double-counts.
- **No rigid coupling.**

### 5.5 Hard vs soft / end-stop / engine stop

| layer | meaning | central value |
|---|---|---|
| soft | onset of measurable passive torque (slack-zone edge) | θ0 + [−1.5, +3]° × factors |
| hard (anatomical) | clinical end-feel angle (about 15 N·m) | θ0 + [−24, +14]° × factors |
| end-stop | stiff tissue barrier reaching the injury band (about capacity) | hard + 3° |
| Jolt emergency stop | numerical only, beyond the end-stop | **hard(φ) ± margin, flexion-dependent, re-measured** with `tools/g1_margins` over the validation set |

The engine stop must follow the envelope: the `lit1` / `shift` lesson, where a fixed engine stop inside the shifted envelope caused systematic engine-stop contacts.

### 5.6 Actuated vs passive

- **Keep the knee axial actuated.** Muscles produce 0.4–0.5 N·m/kg at 60–100° flexion, and co-contraction stiffening is a real stance mechanism.
- **Capacity:**
  - 0.35 N·m/kg is acceptable (slightly conservative) at 60–100°.
  - **A flexion scale is supported in direction but weakly in magnitude:** 0° about 0.6 (0.4–0.8), 20° about 0.8, 60–100° 1.0, decreasing beyond about 120° (no data; Li 2004).
  - Treat it as a **separate, later change**, not bundled with the envelope. It is an actuator-capacity change and its evidence is weaker.
  - The axial-angle dependence of torque (Królikowska) is not recommended now.
- **Passive:** the envelope, θ0 and the J-curve (§5.1–5.3).
- **Stance stiffness under load:** no compression term at first. If V6 (§6) shows stance-knee deviation from θ0 beyond the in vivo band, add a toe-region compression term (A × (1 + c·F/BW), c ≈ 1–1.5; low confidence) rather than raising actuator gains.

### 5.7 Active / planning box (new; required by the narrow envelope)

V2 currently sets each joint's `rom.active` equal to the passive soft onset, and the lifecycle's non-support leg IK is bounded by the soft limits. With a physiological knee the slack zone is only about 4.5° wide (θ0 − 1.5 … θ0 + 3), so that convention would almost freeze the knee axial in planning.

**Recommendation:**
- Define the knee axial active box separately: θ0 + [−0.8·h_ER(φ), +0.8·h_IR(φ)] as the outer bound (active ≈ 0.8 × passive at 70–100°, Muaidi 2017) [DERIVED, low–moderate].
- Prefer that commanded settings stay where the passive torque is ≤ about 25–35 % of the actuator capacity (about the 5–10 N·m angles).
- This touches `REACHABILITY_CONTRACT_FINAL.md` (the planned knee axial) and E1a-10 ("swing-leg solved coordinates never beyond their soft limit by > 2°"), which would need re-freezing.

### 5.8 What must NOT be assigned to the knee

1. **Whole-body yaw over the planted foot.** It belongs to the hip, the shoe–ground pivot and the trunk. A knee "twisting the body" is non-physiological.
2. **Shoe–ground pivoting.** It is slip at the contact, not knee rotation.
3. **Foot-vs-shank rotation** (5–13° per stance, coupled to eversion). It belongs to the passive foot axial coordinate (ankle "fabd") and, in human terms, the subtalar / midfoot chain.
4. **Static tibial torsion (about 22 ± 6°) and toe-out.** They are skeletal / foot-frame constants, not knee neutral.
5. **The large external rotation moments of sharp cuts and pivots** (0.5–0.9 N·m/kg). In vivo they are carried mainly by articular conformity and ligaments. A knee load near the end-stop should be read as an injury-level event, not as normal operation.
6. **Clinical foot-level "knee rotation" ROM and skin-marker task ranges** (2× and +13° inflated). The current V2 range is exactly this error.
7. **Deep-flexion postural asymmetry** (kneeling, prone rest). The hip and foot take segment rotations of 12–30° while the tibiofemoral joint stays within 6–14° of its coupled path.

### 5.9 Parameter table (central; range; confidence; sources)

| parameter | central | range | confidence | sources |
|---|---|---|---|---|
| θ0 at 10 / 20 / 30° | 3.4 / 6.3 / 8.6° | 2–5 / 3–8 / 6–13° | moderate | Walker 1988 via Rajagopal / Lai .osim [FT]; Iwaki 2000, Ishii 1997 [ABS]; Qi 2013, Kono 2018 [FT] |
| θ0 at 60 / 90 / 120° | 13 / 15 / 15° | 6–15 / 5–20 / 8–29° | moderate | as above; Most 2004, Johal 2005, Asano 2001 [ABS] |
| θ0 at 145–150° | 19–20° | 11–30° | low–moderate | Qi 2013, Kono 2018, Hamai 2013 [FT]; Leszko 2011 [FT-sum]; Tanifuji 2011, Li 2004, Most 2004, Victor 2010 [ABS] |
| θ0 hyperextension slope | 0.37°/° | 0–0.37 | low | Lenhart 2015 left-knee splines [FT file] |
| plateau soft IR / ER | 3 / 1.5° | 1.5–3.5 / 0–2 | low–moderate | in vivo slack ±2–5° [DERIVED from Moewis FT] |
| plateau hard IR / ER (about 15 N·m) | 14 / 24° | 12–15 / 20–25 | moderate (IR), low–moderate (ER) | Neumann 2015a CT [FT]; Almquist 2002 [SEC]; cadaver 10 N·m × 0.65–0.8 [SEC: Seiferheld S2] |
| IR factor at 0° | 1.0 | 0.5–1.0 | low–moderate | Hemmerich 2011, Nordt 1999 [SEC]; cadaver Roth, pooled |
| ER factor at 0° | 0.5 (→ 1.0 by about 35°) | 0.3–0.6 | moderate | Hemmerich, Nordt [SEC]; Lagae 2020 [FT]; pooled [SUPP] |
| deep-flexion factor at 150° | 0.6 (from 125°) | 0.3–1.0 | **low** | Li 2004 [ABS]; Kono 2018 [FIG]; van Kampen, Nielsen [FIG]; vs Markolf 1976 |
| hyperextension factor at −5° | 0.7 | 0.6–1.0 | low | Blankevoort 1988 knee 4 [FIG] |
| torque at hard | 15 N·m (≈ 0.55 × capacity) | 10–15 N·m | moderate | in vivo end-feel tests to 15 N·m (Neumann; Lorbach); fit §4.2 |
| end-stop | capacity (27.3 N·m) at hard + 3° | 25–35 N·m at + 3–4° | moderate | injury torques (Meyer & Haut; Shoemaker); 15 → 30 N·m adds about 3–3.5° [DERIVED] |
| exponent B | 6/rad | 6–11.5/rad | not identifiable here | Blankevoort [FIG], Neumann [FT] single-exponential 0.15–0.25/° |
| actuator capacity at 60–100° | 0.35 N·m/kg (keep) | 0.35–0.46 | moderate–high | Królikowska 2015 [FT]; Armour 2004, Shoemaker 1988 [ABS] |
| capacity flexion scale (later, separate) | 0° 0.6, 20° 0.8, 60–100° 1.0 | 0° 0.4–0.8 | low–moderate | Shoemaker 1988 [ABS]; Buford 2001 [ABS/SEC]; Li 1999 [ABS] |
| active box | θ0 + 0.8 × [−h_ER, +h_IR] | 0.7–0.9 | low–moderate | Muaidi 2017 [ABS] |
| compression term | none (test first) | A × (1 + c·F/BW), c 1–1.5 | low | Hsieh & Walker 1976 [SEC]; Blankevoort [FT] |

---

## 6. Validation experiments before acceptance (to be preregistered before any run)

**Rules:**
- Every parameter stays inside its literature band (§5.9). Any value outside a band is flagged and justified.
- G1/G2/G3 results are reported as context and regression checks, not used as fitting targets.

| id | experiment | acceptance (proposed) |
|---|---|---|
| **V0** | Default-off flag, unit tests, and the bit-identical default path (hash check, 4 G3 runs). Envelope function: θ0 values, continuity, factor bounds, soft < hard, symmetry L/R | all pass; default path bit-identical |
| **V1** | **Isolated knee torque–rotation sweeps.** Thigh fixed, gravity off, actuators off. Slow ramped axial torque to ±27 N·m at φ = −5, 0, 10, 20, 30, 45, 60, 90, 120, 135, 146°. Rotation from θ0 at 2.5 / 5 / 10 / 15 N·m; loading / unloading | inside the §5.3 bands at every φ where data exist; monotonic; no torque discontinuity |
| **V2** | **Neutral path.** Quasi-static passive flexion 0 → 150 → 0° with zero applied axial torque and small axial compression | tibia within the slack zone of θ0(φ) (±3°). Over the last 30° of extension: 6–11° of ER (the screw-home emerges) |
| **V3** | **Screw-home override.** At 90°, a 5 N·m ER torque; at 0°, ±5 N·m | 90°: tibia reaches −5 … +5° absolute (Iwaki / Kono / Victor reversal). 0°: total 15–17° |
| **V4** | **Energy.** Prescribed flexion oscillation (0 ↔ 120°, 0.5–2 Hz) with constant axial torque 5 N·m; and free passive swings | net passive work per cycle = ΔU (closure ≤ existing per-tick limits); no pumping from the moving neutral |
| **V5** | **Series knee–ankle yaw, planted foot.** Foot fixed, yaw torque on the thigh at φ = 0, 20, 45°, ankle k ∈ {0, 0.10, 0.13} | measured split between knee axial and foot axial matches the two passive laws in series (prediction computed beforehand); near neutral the ankle dominates; the knee stays inside its envelope |
| **V6** | **Stance knee under task-like yaw** (reference policy, single support, the E1-style pelvis drop, preregistered disturbances) | stance-knee deviation from θ0 ≤ about 6° (in vivo load-driven deviation 3.7–5.6°, Myers 2011). Exceeding it is the trigger for the compression term (§5.6), not for retuning widths |
| **V7** | **Rate:** V1, V2 and V4 at 180 / 240 / 480 Hz | same classes; no energy events; end-stop artefact no worse than the accepted plant |
| **V8** | **Morphology:** V1 at the 8 bodies (torque at hard ∝ capacity) | bands hold within ±1–2° after mass scaling; flag the lightest and heaviest bodies |
| **V9** | **Engine emergency stops:** re-measure with `g1_margins` over the full G1 validation set with the new envelope | the engine stop is never inside the end-stop (`shift` lesson); margins recorded |
| **V10** | **Sensitivity at the band edges:** θ0 low / high (−1 SD / +1 SD), widths ×0.85 / ×1.15, deep-flexion factor 0.3 / 1.0, IR factor at 0° 0.5 / 1.0. Run V1–V6 and the G1 perturbed ensembles | report which conclusions depend on uncertain parameters |
| **V11** | **Regression context:** G1 full plus perturbed ensembles (V2-REF + V1-matched × 10 scenarios × 15 perturbations, plane turf) at k = 0 and k = 0.13; G2; G3 v3.3 | report rates vs the accepted 5.0 %. Interpreting settled-rest rows under a changed plant is **your decision** (FP-14 item 2). No retuning toward G1 |

---

## 7. Does this evidence support changing the V2 knee before E1a lift-hover-replace?

**Yes, it supports the change, and the change is on the critical path to E1a. It does not authorise E1a by itself.**

**Why change before E1a:**
1. **The ankle law depends on it.**
   - The evidence-supported foot axial stiffness (k ≈ 0.13, lit1) is required for the reference twist policy and for a single-support yaw anchor (`TWIST_POLICY_RESULTS.md`, `ANKLE_LAW_RESULTS.md`).
   - It was not adoptable because the current knee's 50° slack zone and fixed zero let the ankle drive the knee to its wall in passive falls.
   - This review shows that knee is outside the human evidence by 2.6–4× at physiological torques. The defect is in the knee, not in the ankle law.
2. **The E1a stance knee works where the current envelope is most wrong.**
   - The stance knee runs at 4–25° flexion (the planned pelvis drop). The current model there is 3–4× too compliant at 5 N·m and has no screw-home at defined torques.
   - The actuator under the reference policy masks this in controlled stance. The passive plant still sets single-support yaw compliance in series with the ankle and the result of any perturbation.
3. **Reference semantics need θ0.** The knee target of the reference twist policy should be the passive neutral θ0(φ). The current model has no defined neutral beyond "0".
4. **Order of work.** A plant change after E1a would invalidate E1a's evidence and require repeating it. E1's preregistration is frozen against the current spec (E1a-10, E1a-14 reference knee soft limits and twist), so it must be re-frozen anyway after any knee change.

**What the evidence does not settle:**
- Deep-flexion width and θ0 at 145°. They matter for passive falls (G1), not for E1a's operating range.
- Weight-bearing stiffness (V6 decides).
- Capacity scaling with flexion (a later, separate change).

**What the earlier conclusion said, and how this refines it:** `KNEE_AXIAL_CONCLUSION.md` §4 said the knee is "not live in E1a / E1b" and need not be fixed "for E1a's own behaviour", only for the ankle law. That stands for the deep-flexion part. The near-extension part, the best-established part of the evidence, is in E1a's stance chain. So the honest summary is: **required for the ankle law, relevant to E1a's stance compliance, and cheaper before E1a than after.**

**Path to E1a:**
1. Your approval of the knee revision. It changes joint limits and the knee passive law (standing rule).
2. Implementation behind a default-off flag, including:
   - θ0;
   - the envelope;
   - torque at hard;
   - disabling the old screw-home coupling;
   - moving the engine stops;
   - the active box.
3. Preregistration of V0–V11, then running them.
4. Your decisions:
   - the G1 settled-rest interpretation under a changed plant (FP-14 item 2);
   - adoption of k ≈ 0.13 + reference semantics + the lifecycle;
   - re-freezing E1's preregistration.
5. Only then a renewed AUTHORISE / DO NOT AUTHORISE recommendation for E1a.

---

## 8. Files

**`literature/`:** `knee2_passive_rom_neutral.md`, `knee2_torque_load_muscle.md`, `knee2_active_tasks.md`, `knee2_models.md`. These are the four agent reports. Every value is tagged, with DOIs and URLs. Raw extracted data (Seiferheld S2/S4, Blankevoort page images, Gasparutto / Chen datasets, model files) remains in the session scratchpad.

**`evidence/`:**

| file | content |
|---|---|
| `current_law.mjs` / `current_law_78kg.txt` | the current V2 knee law at defined torques |
| `fit_shape.mjs` / `fit_shape.txt` | first fit, with the early anchors (superseded) |
| `fit_shape2.mjs` / `fit_shape2.txt` | the §4.2 fit with the final anchors |
| `width_variants.mjs` / `width_variants.txt` | the width choice in §4.1 |
| `candidate_envelope.mjs` / `candidate_envelope_78kg.txt` | the §4.1 / §5 candidate, plus the context calculation of §2.3 |

**Code:** none changed. **Simulation:** none run.

## 9. Key sources (DOIs)

**Envelope and laxity:**
- Blankevoort, Huiskes & de Lange 1988, J Biomech 21:705, doi:10.1016/0021-9290(88)90280-1 (PDF pure.tue.nl/ws/files/2305657/585371.pdf).
- Seiferheld et al. 2026, Front Bioeng Biotechnol, doi:10.3389/fbioe.2026.1741003 (PMC13038627; S2/S4).
- Moewis et al. 2016, PLoS One, doi:10.1371/journal.pone.0159600.
- Hemmerich et al. 2011, AJSM, doi:10.1177/0363546510379333, and Nordt 1999, doi:10.1177/03635465990270051101, both via Zee 2020, OJSM, doi:10.1177/2325967120945967.
- Almquist 2002, J Orthop Res, doi:10.1016/S0736-0266(01)00148-6, via Tsai 2008, BMC MSD, doi:10.1186/1471-2474-9-35.
- Neumann et al. 2015a, ISRN, doi:10.1155/2015/705201.
- Shultz, Schmitz & Beynnon 2011, J Orthop Res, doi:10.1002/jor.21243.
- Roth, Howell & Hull 2015, JBJS 97:1678, doi:10.2106/JBJS.N.01256.
- Lagae 2020, KSSTA, doi:10.1007/s00167-019-05839-y.
- Markolf 1976, JBJS 58:583 (PMID 946969).

**Neutral path and screw-home:**
- Walker, Rovick & Robertson 1988, J Biomech 21:965, doi:10.1016/0021-9290(88)90135-2 (equations verified against Rajagopal2016.osim and LaiUhlrich2022.osim).
- Qi 2013, doi:10.1016/j.jbiomech.2013.03.014.
- Kono 2018, doi:10.1302/0301-620X.100B1.BJJ-2017-0553.R2.
- Hamai 2013, doi:10.1155/2013/717546.
- Leszko 2011, doi:10.1007/s11999-010-1517-z.
- Johal 2005, doi:10.1016/j.jbiomech.2004.02.008.
- Iwaki 2000, doi:10.1302/0301-620x.82b8.10717.
- Most 2004, doi:10.1016/j.jbiomech.2004.01.025.
- Li 2004, doi:10.1016/S0736-0266(03)00118-9.
- Victor 2010, doi:10.1002/jor.21019.
- Wilson 2000, doi:10.1016/s0021-9290(99)00206-7.
- Lafortune 1992, doi:10.1016/0021-9290(92)90254-x.

**Loading and injury:**
- Hsieh & Walker 1976, JBJS 58:87 (PMID 946171).
- Markolf 1981 (PMID 7217123).
- Shoemaker & Markolf 1985 (PMID 3968092).
- Fleming 2001, doi:10.1016/s0021-9290(00)00154-8.
- Meyer & Haut 2008, doi:10.1016/j.jbiomech.2008.09.023.
- Oh 2012, doi:10.1177/0363546511432544.

**Muscles and strength:**
- Louie & Mote 1987, doi:10.1016/0021-9290(87)90295-8.
- Królikowska 2015, doi:10.12659/MSM.893930.
- Shoemaker 1988 (PMID 3342561).
- Buford 2001, doi:10.1016/s0968-0160(01)00106-5.
- Li 1999, doi:10.1016/s0021-9290(98)00181-x.
- Muaidi 2017, doi:10.3233/BMR-169613.
- Hannah 2014, doi:10.1249/MSS.0000000000000188.

**Tasks and yaw:**
- Gasparutto 2017, doi:10.1155/2017/1908618.
- Myers 2011, doi:10.1177/0363546511404922.
- Khodabandeloo 2026, doi:10.1177/23259671261422732.
- Lafortune 1994, doi:10.1002/jor.1100120314.
- Mausehund & Krosshaug 2024, doi:10.1177/03635465241234255.
- Li & Qian 2025, doi:10.1038/s41598-025-33102-7.
- Leppänen 2021, doi:10.1177/03635465211026944.
- Benoit 2006, doi:10.1016/j.gaitpost.2005.04.012.

**Models:**
- Rajagopal 2016 (PMC5507211).
- Lai 2017 (PMC5989715).
- Arnold 2010 (PMC2903973).
- Lenhart 2015 (PMC4886716).
- Marra 2015 (PMID 25429519).
- Dumas 2012 (PMID 22468466).
- MyoSuite myolegs (github.com/MyoHub/myo_sim).

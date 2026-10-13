# BALANCE-3 research: coordinated ankle–hip strategies (literature report)

**Provenance.** Compiled by a research subagent of this session on 13 Oct 2026 (01:10–01:30 BST), from PubMed / PMC / publisher pages. Each source carries its access level, and every number is labelled [M], [MODEL], [E] or [ASSUMPTION]. The raw downloaded texts are kept outside Git (third-party content). Copied verbatim below; the design reads it in `BALANCE3_PREREGISTRATION.md` §2.

---

# BALANCE-3: ankle–hip coordination in sagittal standing balance. Primary-literature pass

Date: 13 Oct 2026. Scope: physically simulated standing human (73.9 kg, 1.76 m, rigid flat feet, no toes, no stepping), sagittal plane.

**Labels.** [M] measured in humans · [MODEL] parameter fitted or identified with a model from human data (or a pure model or robot result, which is stated) · [E] derived by me from source numbers (method given) · [ASSUMPTION] my assumption.

**Access levels.** FT = full text read · FT-w = full text, specific table or figure checked · ABS = abstract only · SEC = secondary citation (the source that cites it is named).

**Method note.** Abstracts came from the Europe PMC REST API. Open full texts came from Europe PMC full-text XML (read locally). PMC author manuscripts were read with WebFetch, which returns a model-extracted summary: numbers obtained that way are marked "FT (WebFetch)" and have been checked against the article's own equations where possible. Paywalled full texts (Park 2004, Horak & Nashner 1986, Runge 1999, Hettich 2014, Kuo 1995, Rietdyk 1999) could **not** be read. For those papers only the abstract is used. "Not found" means the value was not in any text I could access.

**Two citation corrections to the brief:**
- Runge et al. 1999 is in *Gait & Posture* 10:161–170, not *Exp Brain Res*.
- Zhang, Kiemel & Jeka 2007 is in *Gait & Posture* 26:263–271.

**One critical flag about the current overshoot criterion (see §6).** Rietdyk et al. 1999 (J Biomech 32:1149) is a **medio-lateral** push study. Its abstract says: "Ten adult males received medio-lateral (M/L) pushes to the trunk or pelvis." I could not access the full text or the thesis to check the "0.7–0.8 cm overshoot on 5.6–6.4 cm peaks" numbers. If the ≤0.26 criterion came from this paper, it is a frontal-plane criterion being applied to a sagittal push.

---

## 0. Source list

| # | Citation | ID | Access |
|---|---|---|---|
| S1 | Horak FB, Nashner LM. Central programming of postural movements: adaptation to altered support-surface configurations. J Neurophysiol 1986;55:1369–1381 | PMID 3734861, doi:10.1152/jn.1986.55.6.1369 | ABS (truncated at 400 words) |
| S2 | Runge CF, Shupert CL, Horak FB, Zajac FE. Ankle and hip postural strategies defined by joint torques. Gait Posture 1999;10:161–170 | PMID 10502650, doi:10.1016/s0966-6362(99)00032-6 | ABS |
| S3 | Park S, Horak FB, Kuo AD. Postural feedback responses scale with biomechanical constraints in human standing. Exp Brain Res 2004;154:417–427 | PMID 14618285, doi:10.1007/s00221-003-1674-3 | ABS + SEC (S22, S24) |
| S4 | Kuo AD, Zajac FE. Human standing posture: multi-joint movement strategies based on biomechanical constraints. Prog Brain Res 1993;97:349–358 | PMID 8234760, doi:10.1016/s0079-6123(08)62294-3 | ABS |
| S5 | Kuo AD. An optimal control model for analyzing human postural balance. IEEE TBME 1995;42:87–101 | PMID 7851935, doi:10.1109/10.362914 | ABS |
| S6 | Creath R, Kiemel T, Horak F, Peterka R, Jeka J. A unified view of quiet and perturbed stance: simultaneous co-existing excitable modes. Neurosci Lett 2005;377:75–80 | PMID 15740840, doi:10.1016/j.neulet.2004.11.071 | ABS |
| S7 | Zhang Y, Kiemel T, Jeka J. The influence of sensory information on two-component coordination during quiet stance. Gait Posture 2007;26:263–271 | PMID 17046262, doi:10.1016/j.gaitpost.2006.09.007 | ABS |
| S8 | Kiemel T, Elahi AJ, Jeka JJ. Identification of the plant for upright stance in humans: multiple movement patterns from a single neural strategy. J Neurophysiol 2008;100:3394–3406 | PMID 18829854, PMC2604857 | FT-w (Tables 1–2, WebFetch) |
| S9 | Kiemel T, Zhang Y, Jeka JJ. Identification of neural feedback for upright stance in humans: stabilization rather than sway minimization. J Neurosci 2011;31:15144–15153 | PMID 22016548, PMC3470452 | FT (WebFetch) |
| S10 | Alexandrov A, Frolov A, Massion J. Axial synergies during human upper trunk bending. Exp Brain Res 1998;118:210–220 | PMID 9547090 | ABS |
| S11 | Alexandrov AV, Frolov AA, Massion J. Biomechanical analysis of movement strategies in human forward trunk bending. I. Modeling / II. Experimental study. Biol Cybern 2001;84:425–434 and 435–443 | PMID 11417054, 11417055 | ABS |
| S12 | Alexandrov AV, Frolov AA, Horak FB, Carlson-Kuhta P, Park S. Feedback equilibrium control during human standing. Biol Cybern 2005;93:309–322 | PMID 16228222, PMC1430400 | FT-w (Table 1, eqs 5, 12, 22; WebFetch) |
| S13 | Alexandrov AV, Lippi V, Mergner T, Frolov AA, Hettich G, Husek D. Human-inspired eigenmovement concept provides coupling-free sensorimotor control in humanoid robot. Front Neurorobot 2017;11:22 | PMID 28487646, PMC5403929 | FT |
| S14 | Boonstra TA, Schouten AC, van der Kooij H. Identification of the contribution of the ankle and hip joints to multi-segmental balance control. J NeuroEng Rehabil 2013;10:23 | PMID 23433148, PMC3662596 | FT |
| S15 | Engelhart D, Pasma JH, Schouten AC, et al. Adaptation of multijoint coordination during standing balance in healthy young and healthy old individuals. J Neurophysiol 2016;115:1422–1435 | PMID 26719084, PMC4808116 | FT (WebFetch); parameter values appear only in figures, not extracted |
| S16 | Hettich G, Assländer L, Gollhofer A, Mergner T. Human hip–ankle coordination emerging from multisensory feedback control. Hum Mov Sci 2014;37:123–146 | PMID 25150802 | ABS |
| S17 | Lippi V, Mergner T. Human-derived disturbance estimation and compensation (DEC) method lends itself to a modular sensorimotor control in a humanoid robot. Front Neurorobot 2017;11:49 | PMID 28951719, PMC5599790 | FT |
| S18 | Welch TD, Ting LH. A feedback model reproduces muscle activity during human postural responses to support-surface translations. J Neurophysiol 2008;99:1032–1038 | PMID 18094102 | ABS |
| S19 | Welch TD, Ting LH. A feedback model explains the differential scaling of human postural responses to perturbation acceleration and velocity. J Neurophysiol 2009;101:3294–3309 | PMID 19357335, PMC2694108 | FT-w (Table 4, WebFetch) |
| S20 | Safavynia SA, Ting LH. Sensorimotor feedback based on task-relevant error robustly predicts temporal recruitment and multidirectional tuning of muscle synergies. J Neurophysiol 2013;109:31–45 | PMID 23100133, PMC3545166 | FT (WebFetch) |
| S21 | Kim S, Atkeson CG, Park S. Perturbation-dependent selection of postural feedback gain and its scaling. J Biomech 2012;45:1379–1386 | PMID 22444347 | ABS |
| S22 | Kim S, Horak FB, Carlson-Kuhta P, Park S. Postural feedback scaling deficits in Parkinson's disease. J Neurophysiol 2009;102:2910–2920 | PMID 19741108, PMC2777824 | FT (WebFetch) |
| S23 | Zelei A, Milton J, Stepan G, Insperger T. Response to perturbation during quiet standing resembles delayed state feedback optimized for performance and robustness. Sci Rep 2021;11:11392 | PMID 34059718, PMC8167093 | FT-w (Tables 1, 3; eqs 1–6) |
| S24 | Hong S, Park S. Biomechanical optimization and reinforcement learning provide insight into transition from ankle to hip strategy in human postural control. Sci Rep 2025;15:13640 | PMID 40254606, PMC12009993 | FT |
| S25 | Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE. Balance recovery from medio-lateral perturbations of the upper body during standing. J Biomech 1999;32:1149–1158 | PMID 10541064 | ABS |
| S26 | Versteeg CS, Ting LH, Allen JL. Hip and ankle responses for reactive balance emerge from varying priorities to reduce effort and kinematic excursion: a simulation study. J Biomech 2016;49:3230–3237 | PMID 27543251 | ABS |
| S27 | Hof AL. The equations of motion for a standing human reveal three mechanisms for balance. J Biomech 2007;40:451–457 | PMID 16530203 | ABS |
| S28 | Robinovitch SN, Heller B, Lui A, Cortez J. Effect of strength and speed of torque development on balance recovery with the ankle strategy. J Neurophysiol 2002;88:613–620 | PMID 12163514 | ABS |
| S29 | Loram ID, Lakie M. Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. J Physiol 2002;545:1041–1053 | PMID 12482906 | ABS |
| S30 | Geng Y, van Dieën JH, Bruijn SM. Different stabilizing mechanisms but a common task-level aim in standing and walking. PLoS One 2026;21(10):e0355849 | PMC13652548 | FT |
| S31 | Trunk stiffness group: Cholewicki J, Simons AP, Radebold A. J Biomech 2000;33:1377 (PMID 10940396). Moorhouse KM, Granata KP. J Biomech 2007;40:1058 (PMID 16782106). van Drunen P et al. J Biomech 2013;46:1440 (PMID 23578438). van Drunen P et al. J Neurophysiol 2016;115:1381 (PMID 26745247) | — | ABS |
| S32 | Peterka RJ, Loughlin PJ. Dynamic regulation of sensorimotor integration in human postural control. J Neurophysiol 2004;91:410–423 | PMID 13679407 | ABS |
| S33 | Pinter IJ, van Swigchem R, van Soest AJ, Rozendaal LA. The dynamics of postural sway cannot be captured using a one-segment inverted pendulum model. J Neurophysiol 2008;100:3197–3208 | PMID 18829852 | ABS |
| S34 | Emmens AR, van Asseldonk EHF, van der Kooij H. Effects of a powered ankle-foot orthosis on perturbed standing balance. J NeuroEng Rehabil 2018;15:50 | PMID 29914505, PMC6006747 | FT |

---

## 1. When do humans transition or blend between ankle and hip strategy?

### Support length (S1, Horak & Nashner 1986) [M], ABS
- On normal support, brief horizontal surface perturbations produced a distal-to-proximal pattern: "relatively stereotyped patterns of leg and trunk muscle activation with 73- to 110-ms latencies", producing compensatory ankle torque.
- On support "short in relation to foot length", ankle muscles were "generally unresponsive". The pattern "produced a compensatory horizontal shear force against the support surface but little, if any, ankle torque" (the hip strategy).
- Intermediate support lengths "elicited more complex postural movements … that resembled ankle and hip strategies combined in different temporal relations … executed with combinations of torque and horizontal shear forces".
- Exact beam lengths and perturbation amplitudes: **not found** (full text not accessible).

### Platform velocity (S2, Runge et al. 1999) [M], ABS
- Backward translations from slow (5 cm/s) to fast (55 cm/s) on a flat surface. "Joint torque analyses revealed the addition of a hip flexor torque to the ankle plantarflexor torque during fast translations … the addition of hip strategy to ankle strategy to produce a continuum of postural responses. Hip torque without accompanying ankle torque (pure hip strategy) was not observed."
- The velocity at which hip torque first appears: **not found** (full text not accessible).

### Perturbation magnitude (S3 Park 2004; S22 Kim 2009; S24 Hong & Park 2025) [M] kinematics and kinetics, [MODEL] gains
- Park 2004: 13 healthy young adults (4 men, 9 women, 20–32 y). Backward translations of 3–15 cm. Hong & Park list the magnitudes as 3, 4.5, 6, 7.5, 9, 12 and 15 cm over 275 ms, with subjects told not to lift their heels.
- Park 2004 findings: "trajectories of joint angles and joint torques were scaled with perturbation magnitude. This scaling occurred gradually, rather than abruptly changing at magnitudes where biomechanical constraints became active." Also: "Hip gains increased and ankle gains decreased nearly linearly with perturbation magnitude."
- Kim 2009 (7 young, 7 elderly, 7 PD; 3–15 cm, 275 ms): "the scaling started even before the maximum allowable ankle torque was reached."
- Hong & Park 2025, re-analysing the Park 2004 data: "Ankle and hip joint angles increased proportionally with perturbation magnitude in both human data and the RL simulation." Also: "the ankle gain decreases gradually even at small and intermediate perturbation magnitudes, well before reaching the maximum CoP constraint."
- So in these data some hip involvement is present even at the smallest (3 cm) translation and grows smoothly. **No threshold was found.**

### Frequency (S6 Creath 2005; S7 Zhang 2007; S8 Kiemel 2008) [M]
- Creath 2005, quiet stance with eyes closed on fixed, foam and sway-referenced surfaces: "The angles of the trunk and leg segments were in-phase for frequencies below 1 Hz and anti-phase for frequencies above 1 Hz." The shift was "abrupt … for the fixed and foam surfaces, but a gradual change for the sway-referenced condition".
- Zhang 2007 (10 young adults): the same pattern in AP and ML. Adding vision or light touch changed trunk–leg coherence only below 1 Hz, where the in-phase pattern dominates. It had "no observable effect at sway frequencies above 1 Hz".
- Kiemel 2008 (17 adults, visual-scene perturbation): leg–trunk phase difference "gradually varied from ∼0 deg at low frequencies to a phase lag for the legs of ∼150 deg at higher frequencies". The lag became significant from 0.184 Hz.

### Models (S4 Kuo & Zajac 1993; S5 Kuo 1995; S26 Versteeg 2016; S24) [MODEL]
- Kuo & Zajac: with straight knees, the feasible acceleration set "greatly favors a combination of ankle and hip movement in the ratio 1:3 (called the 'hip strategy')". The "ankle strategy … requires more muscle activation than the 'hip strategy' for a given amount of horizontal acceleration."
- Versteeg 2016 (musculoskeletal model): "minimizing center-of-mass motion produced a hip strategy (peak hip flexion and ankle dorsiflexion angles of 45.5° and 2.3°)". The response "shifted towards an ankle strategy as the priority to keep the trunk vertical was increased (13.7° and 8.5°)". "increasing the priority to minimize muscle stress always favors a hip strategy." The experimental ranges it was fitted to were peak hip flexion 7.9–53.1° and peak dorsiflexion 0.5–4.7°.
- Hong & Park 2025: an RL controller with a reciprocal CoP-limit penalty (limit = metatarsal joint) reproduced the gradual transition. Quadratic costs "were insufficient to induce strategy transitions".

**Summary for Q1.** Measured blending depends continuously on:
- support length relative to the foot (S1);
- platform velocity, with hip torque added at fast translations (S2);
- perturbation magnitude, gradually from at least 3 cm (S3, S22, S24);
- frequency: in-phase below about 1 Hz, anti-phase above (S6, S7, S8).

No source gives a hard switching threshold.

---

## 2. Continuous coordination or a hard switch?

| Evidence | Type | Finding |
|---|---|---|
| Runge 1999 (S2) | [M] | Hip flexor torque is *added to* ankle torque at fast translations: "a continuum". Pure hip strategy never seen |
| Park 2004 (S3) | [MODEL fit to M], R² = 0.92 | One linear state-feedback controller. Gains are "multivariate and heterogenic … the torque produced at any joint is generally a function of motions not only at the same joint, but other joints as well". Gains scale gradually with magnitude |
| Kim 2009 (S22) | [MODEL fit to M] | Full-state feedback u = −Kx with x = [θank, θhip, ωank, ωhip], **no delay in the model**. Gains scale gradually and start before the heel-lift constraint is reached. Cross-coupling gains scaled significantly and were "smaller in magnitude than diagonal terms" (WebFetch summary; numbers only in figures) |
| Kim 2012 (S21) | [MODEL fit to M] | Pendulum pushes to the torso (7 young subjects, 2–10 kg pendulum loads): "gradual gain scaling with push perturbation magnitude was consistently observed, but a different feedback gain set was obtained" than for platform translations |
| Creath 2005 (S6) | [M] | Ankle and hip patterns "are not extremes along a behavioral continuum of mixed strategies. They are 'simultaneously co-existing excitable modes', both always present" |
| Kiemel 2008 (S8) | [MODEL from M] | "the in-phase (ankle) pattern was neurally generated, whereas the out-of-phase pattern was caused by plant dynamics. Thus a single neural strategy leads to multiple kinematic patterns." EMG from ankle and hip/trunk muscles responded alike across frequency, so they were combined into **one** plant input |
| Welch & Ting 2008 (S18) | [MODEL fit to M] | One delayed feedback law on CoM acceleration, velocity and displacement reconstructed ankle-muscle EMG (>75% of variability). "Surprisingly, >67% of the EMG variability was also accounted for in knee, hip, and pelvis muscles" |
| Welch & Ting 2009 (S19) | [MODEL fit to M] | Gains held constant across 34 translation conditions with different accelerations and velocities (same 12 cm displacement) |
| Safavynia & Ting 2013 (S20) | [MODEL fit to M] | 53 of 71 synergies (75%) were well reconstructed from delayed CoM error. **"For the 18 muscle synergies that were not well reconstructed, 17 … had major contributions of muscles that had actions at the hip and trunk"**. The authors suggest trunk muscles may serve "to maintain the vertical orientation of the body, which may be a concurrent or secondary task-level goal" |
| Kuo 1995 (S5) | [MODEL] | LQR full-state feedback with state estimation and gain scheduling. "An objective function weighting excursion of the center of mass and deviations from the upright stable position, while taking advantage of fast modes of the system … produces a control that reasonably matches experimental data" |
| Alexandrov 2005 (S12) | [MODEL fit to M] | Independent delayed PD control of each eigenmovement fits responses (R² 0.94 for A, 0.96 for H, 0.90 for K) |
| Hong & Park 2025 (S24) | [MODEL] | The gradual transition arises from one optimised policy with a CoP-limit penalty |

**Summary for Q2.** All the measured evidence I found shows blending, not switching. Both patterns appear even in quiet stance. Every model that fits human data uses **one** controller, whether full-state, modal, or a CoM-error law. Hip-torque contribution grows smoothly with perturbation size. One caveat: CoM-error feedback alone does not explain hip/trunk muscle synergies (S20). The authors propose trunk orientation as a second, concurrent goal.

---

## 3. COM state against trunk angle in recovery; ankle mode and hip mode

### Alexandrov et al. 2005 (S12): eigenmovement feedback during standing [MODEL fit to M], FT-w
- Population: 9 healthy subjects, 20–32 y. Backward platform ramps of 3, 4.5, 6 and 7.5 cm over 275 ms. Analysis window 1350 ms after onset.
- Model: 3-joint (ankle, knee, hip) sagittal model, decomposed into eigenmovements:
  - **A** ("whole-body rotation around the ankle joint": ankle flexion with hip flexion and knee extension);
  - **H** ("forward trunk bending", upper and lower body moving in opposite directions);
  - **K** ("sitting down movement").
- Equation (5): −λᵢ ξ̈ᵢ + ξᵢ = ηᵢ + χᵢ aₓ. Gravity is normalised to 1, so λᵢ is in s².
- Equation (12): ηᵢ(t) = K_Sᵢ (ξᵢ(t−τᵢ) − ξ₀ᵢ) + K_Vᵢ ξ̇ᵢ(t−τᵢ). K_S is dimensionless (relative to gravitational stiffness); K_V is in s. K_S ≥ 1 is needed to "compensate for the negative stiffness of gravity forces".
- Eigenvalues for a standard 70 kg, 170 cm person: λ_A = 0.108 s², λ_H = 0.020 s², λ_K = 0.0021 s² ("50:10:1").
- **Table 1 means ± SD [MODEL]:**

| Mode | Delay τ (ms) | K_S (× gravity) | K_V (s) | R² |
|---|---|---|---|---|
| A (ankle/COM) | **120.8 ± 22.7** | 1.15 ± 0.06 | 0.31 ± 0.05 | 0.94 |
| H (hip/trunk) | **66.1 ± 10.2** | 1.15 ± 0.07 | 0.17 ± 0.02 | 0.96 |
| K (knee) | 12.3 ± 3.2 | 1.08 ± 0.08 | 0.033 ± 0.015 | 0.90 |

- Amplitude dependence: "Only viscosity in the A-eigenmovement appeared to be significantly dependent on perturbation amplitude. Viscosity slightly decreased as the perturbation amplitude increased." "the delays were nearly independent of perturbation amplitudes".
- Interpretation: the parameters "result from the combined contribution of passive visco-elastic mechanisms and sensory systems of different modalities". The delay is "some 'effective' value".
- Eigenvector numbers and the share of motion in each mode: **not given** in the paper (WebFetch check).
- **[E] Closed-loop roots.** I solved the paper's characteristic equation (22), μ²λ − 1 + (K_S + μK_V)e^(−μτ) = 0, with the mean parameters (Newton search over the complex plane):
  - **A-mode:** dominant roots −1.12 ± 0.87j s⁻¹. That is ζ ≈ 0.79, an oscillation component near 0.14 Hz, and an envelope time constant of about **0.9 s**.
  - **H-mode:** dominant root −2.09 s⁻¹, real (non-oscillatory), time constant about **0.48 s**. The next root pair is −10.9 ± 3.4j.
  - Without delay, both modes would be overdamped (A roots −0.62 and −2.25; H roots −1.0 and −7.5).
  - Caveats: these use mean parameters, not per-subject fits, so individual dynamics differ. They show the timescale implied by the identified parameters, not a measured settling time.
  - Contrast: the current simulation's trunk offset decays with τ ≈ 9 s. That is about 20× slower than the identified H-mode.

### Modal decoupling implies joint-space cross-coupling (S13, Alexandrov 2017) [MODEL / robot]
- "When matrices Seig and Veig are diagonal, then matrices S and V are symmetrical, but not diagonal (Alexandrov et al., 2005). Therefore, the PD-control in terms of joint angles needs to take into account not only the kinematics and dynamics of a given joint, but also those of all other joints."
- So independent control of the ankle and hip *modes* is equivalent to *cross-coupled* joint torques. Correcting the H-mode alone means applying ankle and hip torque together in the eigenvector ratio, so that the A-mode (COM) is not excited.
- Robot implementation (PostuRob II): actuation delays of 0.091 s (ankle) and 0.053 s (hip) were equalised to 0.1 s. Achieved Lyapunov indices: −5.6 s⁻¹ for EM1 and −4.1 s⁻¹ for EM2. These are robot values, not human.

### Voluntary trunk bending (S10, S11) [M] and [MODEL]
- Alexandrov 1998: CG shift during fast or slow trunk bending was "1 ± 4 cm". One principal component with fixed joint-angle ratios explained 99.7 ± 0.2% (forward) and 98.4 ± 1.4% (backward) of angular variance.
- Alexandrov 2001a, model of bending with zero COP displacement ("optimal bending"): "The ankle eigenmovement moves the center of gravity forward and compensates for the backward center of gravity shift that is provoked by trunk bending as a result of dynamic interactions between body segments … the ankle eigenmovement onset precedes that of the hip eigenmovement. Without an earlier onset of the ankle eigenmovement, forward bending on the extremely narrow support results in falling backward."
- Alexandrov 2001b (16 subjects): "the ankle eigenmovement starts earlier and lasts longer than the hip eigenmovement."
- **Relevance:** this is the same mechanical coupling the current controller hit, where hip torque that rights the trunk drives the legs and COM the other way. In humans it is handled by a coordinated, earlier ankle component, not by having the COM loop fight the hip loop.

### Trunk–leg relationship in feedback (S9 Kiemel 2011; S8; S23; S33)
- Kiemel 2011 [MODEL fit to M]: the fitted kinematic objective ymin = v₁y₁ + v₂ẏ₁ + v₃y₂ + v₄ẏ₂ (y₁ = leg angle, y₂ = trunk angle, both relative to vertical, forward positive). Values: v₁ = 20.7 ± 10.5 deg⁻¹, v₂ = 10.5 ± 10.1 (deg/s)⁻¹, v₃ = −38.7 ± 4.0 deg⁻¹, v₄ = −15.0 ± 14.4 (deg/s)⁻¹. "Unlike the COM, which is minimized when the leg and trunk angles have opposite signs, ymin is minimized when the leg and trunk angles have the same sign."
- Zelei 2021 [M]: "In average, about 75% of the corrective motion takes place at the ankle joint and only ∼25% at the hip joint. Correlation between the angle across the ankle joint (θ2) and the ankle–hip angle (θ3) for all subjects were above 0.9, which reflects that corrections at the ankle and hip joints are performed in phase." This held even though subjects were told to keep hips and knees fixed.
- Pinter 2008 [M], quiet stance: "the upper leg and HAT segments move in the same direction as the lower leg with a somewhat larger amplitude". A second PCA component "points to a countermovement of the HAT relative to the ankle joint angle".
- Explicit numerical gains mapping COM position or velocity to trunk angle or angular velocity in recovery: **not found.**

---

## 4. Sensory and feedback delays: ankle compared with hip/trunk (sagittal)

| Source | Measure | Value | Type |
|---|---|---|---|
| Alexandrov 2005 (S12) | Effective delay per eigenmovement | **A 120.8 ± 22.7 ms; H 66.1 ± 10.2 ms**; K 12.3 ± 3.2 ms | [MODEL] |
| Kiemel 2011 (S9) | Single delay, segment angles → EMG (ankle and hip together) | **127.8 ± 1.4 ms** (bootstrap SE). Separate ankle and hip delays not reported | [MODEL] |
| Horak & Nashner 1986 (S1) | EMG onset latencies after platform perturbation | 73–110 ms | [M] |
| Welch & Ting 2009 (S19) | Common delay, CoM kinematics → EMG (TA, forward perturbation) | Subject means 79, 60, 98, 105, 82, 77, 116 ms (range 60–116) | [MODEL] |
| Safavynia & Ting 2013 (S20) | Common delay, CoM → synergy recruitment | "between 90 and 120 ms for all reconstructions" | [MODEL] |
| Robinovitch 2002 (S28) | Ankle torque onset latency after tether release | 99 ± 13 ms (rate of torque rise 372 ± 267 N·m/s) | [M] |
| Zelei 2021 (S23) | Lumped delay, single delayed-PD pendulum, release perturbations | **157 ± 81 ms** (PA 169, AP 146; median 155, IQR 120) | [MODEL] |
| Geng 2026 (S30) | Effective delay, delayed CoM → GRF, unperturbed standing | Standing tasks 176–239 ms (all tasks and directions) | [MODEL] |
| Engelhart 2016 (S15) | Lumped delays for ankle and hip, model with cross-coupled reflex terms | Values **not extractable** (figures only). "The elderly had larger lumped time delays for the hips (P < 0.001)". Cites earlier single-pendulum estimates of "∼172 ms" and "100–200 ms" | [MODEL] |
| Lippi & Mergner 2017 (S17) | DEC model | "lumped delay ≥100 ms for the ankle joint" | [MODEL] |
| Hettich 2014 (S16) | DEC hip–ankle model | Delay values **not found** (abstract only) | — |
| Rietdyk 1999 (S25), **M/L** | Joint moment onset | "synchronous with the joint angle change, and occurred too early (56-116 ms) to be result of active muscle contraction. Therefore, the first line of defense was provided by muscle stiffness" | [M] |
| Boonstra 2013 (S14) | Phase of ankle-torque FRFs | "decreased with increasing frequency (i.e. a phase lag), indicating a neural time delay". No number given | [M] FRF |

**Summary for Q4.**
- **Ankle/COM loop:** delays are about 100–130 ms in perturbation-response fits (S12, S9, S19, S20). Lumped single-pendulum fits that absorb all dynamics give about 150–240 ms (S23, S30).
- **Hip/trunk:** the only per-mode sagittal estimate is Alexandrov's H-mode at **≈66 ms**, about half the A-mode delay. The authors read it as including passive viscoelastic and short-latency contributions.
- The current simulation's 100 ms COM delay sits inside the measured ankle/COM range.

---

## 5. One state estimate or objective, or independent per-joint loops? Cross-coupling

### Measured or identified cross-coupling
- **Kiemel 2011 (S9), 2×2 feedback from leg and trunk angle to ankle and hip EMG [MODEL fit to M]:** "gain was always highest for the legs-to-ankle EMG component, followed by the legs-to-hip EMG component, the trunk-to-ankle EMG component, and finally the trunk-to-hip EMG component."
  - The cross terms are not negligible. **Hip EMG responded more to leg angle than to trunk angle.**
  - Caveat: these are EMG-unit gains (weighted rectified EMG), so magnitudes across channels depend on EMG normalisation.
  - Low-frequency phase "near 0, indicating that the activations of ankle and hip muscles are approximately proportional to deviations of segment angles".
  - The identified feedback "was similar to feedback that stabilizes upright stance with near-minimum muscle activation, but was not consistent with feedback that substantially increases muscle activation to reduce movements of the body's center of mass or center of pressure". The fitted feedback used "only 1.6 ± 0.6% more muscle activation than that necessary to stabilize upright stance". The fitted COP penalty was 0.000 ± 0.000 cm⁻¹.
- **Kiemel 2008 (S8) [MODEL fit to M]:** ankle and hip/trunk EMG had similar responses across frequency, so one EMG input drove both joints. The DC gains of the EMG-to-torque filter were 32.5 ± 6.5 N·m (ankle) and 14.1 ± 1.9 N·m (hip), low amplitude.
- **Boonstra 2013 (S14) [M], nonparametric MIMO FRFs normalised by mgl, 7 healthy + 1 PD:**
  - "the relationship between the ankle joint angle and the ankle joint torque remained roughly constant over the whole frequency range, whereas the hip joint gain was high at the low frequencies (<0.7 Hz), low at the mid frequencies (0.7-2 Hz) and increased at higher frequencies (>2 Hz)."
  - "The coupling between the ankle joint angle to hip torque increased with frequency, whereas the CθH→TA FRF remained roughly constant."
  - "The phase of the CθA→TH showed a phase shift of about +360° around 1.5 Hz."
  - The authors stress that a single perturbation gives biased MIMO estimates; two independent perturbations are needed.
  - Numerical FRF values: **figures only, not extracted.**
- **Engelhart 2016 (S15) [MODEL fit to M], 15 young (20–30 y) and 14 elderly (70–79 y):** continuous 80 N peak-to-peak multisine forces at hip and shoulder, 0.05–5 Hz. The model has intrinsic stiffness at each joint plus reflexive stiffness and damping in **four** pathways (ankle→ankle, hip→ankle, ankle→hip, hip→hip).
  - Key cross-coupling finding: "When a stabilizing or destabilizing external force field was applied at the hip, both young and elderly participants adapted their multijoint coordination by lowering or respectively increasing their neuromuscular control actions around the ankles."
  - Fit quality: "the GOF values of the direct FRF terms were higher than those of the indirect terms, and the GOF values of Hc,θank2Thip were lowest."
- **Park 2004 / Kim 2009 (S3, S22) [MODEL]:** gains "multivariate and heterogenic"; cross gains scale significantly but are smaller than the diagonal gains. Numerical gain matrices: **not found** (Park full text inaccessible; Kim reports them only in Fig. 6).
- **Welch & Ting 2008/2009, Safavynia & Ting 2013 (S18–S20):** CoM kinematics (task-level state) predict ankle and much proximal-muscle EMG, but poorly predict hip/trunk synergies (17 of 18 failures).

### Model architectures that fit human data
- Full-state LQR (S5); full-state feedback with gain scaling (S3, S21, S22).
- Diagonal **modal** PD with mode-specific delays (S12), which is cross-coupled in joint space (S13).
- DEC (S16, S17): "separate feedback modules for the hip and ankle joints, which exchange sensory information with each other" and use "sensor-derived disturbance estimates rather than 'raw' sensory signals". In S17 the pelvis–HAT module's task was "to maintain a vertical HAT orientation in space", while the ankle module balances the COM. This is coupling at the sensory/estimation level, not a full-body gain matrix.

**Summary for Q5.**
- Every identification study that allowed cross terms found them (S9, S14, S15, S3, S22).
- Some show ankle torque responding to trunk or hip state: S15 adaptation, S9 trunk→ankle.
- Some show hip torque or EMG responding to leg angle: S9 legs→hip ranks second, S14 ankle angle→hip torque rising with frequency.
- No study supports fully independent per-joint loops. Whether the shared structure is a full-state or task-space gain matrix (S3, S5), modal control (S12), or sensory interconnection of modules (S16, S17) is **not settled** by the data.
- Numerical gain matrices normalised by m·g·h: **not found in any accessible text**. Only the modal gains of S12 are available as numbers.

---

## 6. Recovery time and overshoot after small disturbances

| Source | Perturbation | Size | Recovery shape | Type |
|---|---|---|---|---|
| Zelei 2021 (S23) | Unexpected release of a held horizontal force, 27–56 N (mean 41.9 PA, 44.7 AP). 10 subjects, 70.8 ± 13.6 kg, 177 ± 9 cm | Mean peak tilt **3.87°**. Pre- and post-perturbation sway SD 0.15° | "Responses were typically free of overshoot and resemble the responses of a critically damped oscillator." Fitted gains lie near the node–spiral (critical damping) boundary, on the more robust branch (H1 and H3 accepted, H2 rejected) | [M] shape, [MODEL] gains |
| Alexandrov 2005 (S12), [E] roots | Platform, 3–7.5 cm | — | A-mode ζ ≈ 0.79, τ ≈ 0.9 s; H-mode non-oscillatory, τ ≈ 0.48 s | [E] from [MODEL] |
| Geng 2026 (S30) | Unperturbed standing (feet together), 15 young adults | Quiet sway | "Lumped velocity gains were all at under-damped level." The position-to-velocity gain ratio was close to √(g/l) ("eigenfrequency"). In normal standing AP it differed slightly but significantly from 1 (t = −2.22, p = 0.04) | [MODEL] |
| Peterka & Loughlin 2004 (S32) | Transition from sway-referenced to fixed surface | — | A transient **1-Hz** sway oscillation, which a model reproduces "where too much corrective torque is generated in proportion to body sway" | [M] + [MODEL] |
| Emmens 2018 (S34) | Forward pelvis push, rectangular 0.2 s pulse of 0.08·Mg ("small") or 0.14·Mg ("large"). Subjects wore a powered AFO, including a zero-impedance condition | — | Recovery defined as |body-sway velocity| < 0.015 rad/s. Recovery-time values only in Fig. 7 (not extracted). Heel lift seen in a representative subject | [M] |
| Rietdyk 1999 (S25) | **Medio-lateral** pushes to trunk or pelvis | Not in abstract | Hip and spine moments provided "approximately 85%" of recovery, ankles 15%. Overshoot and duration **not verifiable** (full text not accessible) | [M] |
| Park 2004 / Kim 2009 | 3–15 cm translations | — | Time-to-upright or settling metrics: **not found** in accessible text. Kim 2009 records 8 s after the perturbation but reports no recovery time. The "upright within ~1 s" claim in the brief could not be verified | — |

### Is overshoot scale-invariant?
**[E] Reasoning from sources.** A linear time-invariant controller would give an overshoot fraction independent of size, but the measured gains are not size-invariant:
- Ankle and hip gains scale gradually with magnitude even at small perturbations (S3, S22, S24).
- The A-mode viscosity *decreases* with amplitude (S12). That implies relatively *more* damping at smaller amplitudes within 3–7.5 cm.
- Push-type and translation-type perturbations select different gain sets (S21).
- The DEC model has a threshold nonlinearity: "larger support surface tilts are more compensated than smaller ones" (S17).
- Against this, Welch & Ting 2009 found invariant gains across acceleration and velocity at fixed displacement (S19).

**Measured overshoot fractions for sagittal discrete perturbations with COM peaks ≤ 20–40 mm: not found.** The closest data:
- Zelei 2021, at roughly 3.9° tilt. **[E]** About 65 mm COM excursion, assuming COM height ≈ 0.97 m [ASSUMPTION]. Overshoot is typically absent.
- Continuous small-amplitude identification (S9, S14, S15), which gives frequency responses, not overshoot.
- Quiet-stance lumped fits (S30), which point to underdamped control at the smallest amplitudes.

**Implication for the criterion.** The available sagittal human data (S23) support **little or no overshoot** for release perturbations of about 4° tilt. That is stricter than ≤0.26. The 0.26 figure appears to come from a medio-lateral study (S25). No accessible source gives an overshoot fraction for sagittal pushes of about 17 mm.

---

## 7. No-step model with rigid flat feet: ankle limits, the role of hip strategy, and whether to expect hip involvement for small pushes

### Ankle (flat-foot) limits
- **Kim 2009 (S22) [MODEL from M]:** normalised maximum allowable ankle torque (by weight × height) = **0.073 ± 0.01** in young and 0.057 ± 0.006 in elderly. Gain scaling began *before* this limit was reached.
  - **[E]** For 73.9 kg and 1.76 m: 0.073 × 725 N × 1.76 m ≈ **93 N·m**.
  - **[E]** A 17 mm static COM offset needs about m·g·x = 725 × 0.017 ≈ **12 N·m**, roughly 13% of that limit. The present push is far from the flat-foot constraint.
- **Robinovitch 2002 (S28) [M]**, 23 young adults, ankle-only recovery from tether release:
  - static recovery limit 14.9 ± 1.4°;
  - dynamic limit (ankles relaxed before release) 5.9 ± 1.1°;
  - peak ankle torque 116 ± 32 N·m;
  - torque onset 99 ± 13 ms.
  - Higher baseline ankle torque before release (31 → 54 N·m) raised dynamic limits by 11 ± 14%.
- **Kuo & Zajac 1993 (S4) [MODEL]:** "When near the boundary of instability … the movement strategy necessary to maintain stability, without taking a step, is quite restricted." With straight knees, "the acceleration of the center of mass is severely limited vertically, but not horizontally."
- **Hong & Park 2025 (S24):** CoP limit modelled at the metatarsal joint, the flat-foot constraint.

### Hip strategy: shear force and angular momentum
- **Horak & Nashner 1986 (S1) [M]:** hip strategy on short support produces "a compensatory horizontal shear force against the support surface but little, if any, ankle torque".
- **Hof 2007 (S27) [MODEL plus example data]:** three mechanisms accelerate the CoM:
  1. moving the COP relative to the CoM projection;
  2. counter-rotating segments around the CoM;
  3. external forces.

  Mechanism 2 "can be considerable, e.g. in one-legged standing". No value is given for bipedal small pushes in the abstract.
- **Kuo & Zajac 1993 [MODEL]:** hip strategy reaches a given horizontal CoM acceleration with less muscle activation than ankle strategy.

### Is hip involvement expected for small pushes?
- **Kinematically yes, in phase, at low frequency:**
  - Zelei 2021: about 25% of corrective motion at the hip, in phase (r > 0.9), despite instructions to hold the hip.
  - Hong & Park 2025 (Park 2004 data): hip angle grows proportionally from the 3 cm translation upward.
  - Pinter 2008: in quiet stance, HAT moves with the legs at slightly larger amplitude.
  - Creath 2005 and Zhang 2007: an anti-phase component exists even in quiet stance above about 1 Hz.
- **Hip torque as an added hip strategy: mainly for fast or large perturbations** (S2: added "during fast translations"; S3: hip gains rise with magnitude).
- **Kiemel 2008:** the anti-phase (hip-mode) motion seen after perturbation is reproduced by plant dynamics under *synchronous* ankle and hip activation. A small push that excites the hip mode does not by itself imply a separate hip *strategy*. Humans still damp that mode quickly (S12 H-mode: K_V 0.17 s, delay 66 ms, [E] τ ≈ 0.5 s).
- **[E]** For the simulated 17 mm push, the literature therefore supports:
  - ankle-dominant COM correction;
  - in-phase trunk motion;
  - fast (sub-second), non-oscillatory return of trunk-on-leg angle.

  It does not support a large hip-torque strategy for COM control. It does support a well-damped hip/trunk mode, which the current simulation lacks.

---

## 8. Intrinsic (passive) hip/trunk stiffness relative to gravitational stiffness (sagittal)

- **Kiemel 2008 (S8), Table 2 [MODEL fit to M]**, 17 subjects, 70.6 ± 15.1 kg; HAT = 67.8% of body mass; HAT segment length 0.511 m:

| Joint | Intrinsic stiffness, low amp (N·m/rad) | High amp | Intrinsic damping, low amp (N·m·s/rad) | High amp |
|---|---|---|---|---|
| Ankle | 293 ± 58 | 362 ± 66 | 2.2 ± 11.4 | 0.0 ± 19.5 |
| Hip | **95 ± 28** | **147 ± 52** | **27.4 ± 10.0** | 18.0 ± 11.6 |

  - Ankle intrinsic stiffness ≈ 45–56% of mgh. The hip estimate was "at most, roughly equal to the amount necessary to stabilize the plant, assuming no movement at the ankle". "estimated intrinsic stiffness in the model was insufficient to stabilize the plant."
  - EMG-to-torque filters: ankle ω₀ = 6.90 ± 0.98 rad/s, ζ = 1.03 ± 0.19. Hip ω₀ = 9.46 ± 0.83 rad/s, ζ = 1.58 ± 0.17.
  - **[E]** HAT gravitational stiffness is m_HAT·g·h_HAT, where h_HAT is the HAT COM height above the hip. The lever is my [ASSUMPTION] of 0.25–0.35 m; S8 gives only the HAT length. For Kiemel's subjects (m_HAT ≈ 47.9 kg) that is about 117–164 N·m/rad. Hip intrinsic stiffness is then about **0.58–0.81** of HAT gravitational stiffness at low amplitude and **0.89–1.25** at high amplitude, consistent with the authors' "at most roughly equal". For the 73.9 kg model (m_HAT ≈ 50.1 kg, Winter fraction [ASSUMPTION]): about 123–172 N·m/rad.
- **Engelhart 2016 (S15):** hip intrinsic stiffness was estimated, with no significant age difference, but values are in figures only. It cites Kiemel 2008: "293 Nm/rad and 95 Nm/rad" (SEC). Ankle reflexive stiffness and damping were "within the ranges … from 898 to 1,500 Nm/rad and from 288 to 480 Nms/rad".
- **Loram & Lakie 2002 (S29) [M], ankle reference:** intrinsic ankle stiffness = 91 ± 23% of that needed for minimal stabilisation. Zelei 2021 notes the literature range kt/mgh = 0.44–0.91.
- **Lippi & Mergner 2017 (S17) [MODEL claim]:** "In humans, passive stiffness and damping amount to ~10% of the active stiffness and damping". No primary measurement is cited in the passage read.
- **Lumbar trunk (not hip joint), all measured with pelvis fixed, mostly under voluntary preload (S31) [M], ABS:**
  - Cholewicki 2000 (quick release, 12 subjects): effective spine stiffness 785 ± 580 N·m/rad with no external load, up to 2200 ± 1015 N·m/rad with combined loads. This includes any reflex contribution after release.
  - Moorhouse & Granata 2007 (11 adults, 20% MVC extension): intrinsic proportional term "less than zero in more than 60% of the trials". "Reflexes accounted for 42% of the total stabilizing trunk stiffness."
  - van Drunen 2013: model-based separation of intrinsic and reflexive trunk contributions. Resist versus relax instructions changed admittance by −61% and reflex gain by +73% below 1.1 Hz. Absolute values were not in the abstract.
  - van Drunen 2016 (kneeling-seated, sagittal pelvic tilt): "the task instruction to balance naturally led to trunk-on-pelvis stabilization with trunk rotations even exceeding the perturbations". Vestibular trunk-in-space feedback contributed mainly when told to minimise trunk sway.
  - These setups (seated or kneeling, pelvis fixed, preloaded) do not map directly onto relaxed standing.
- Goodworth & Peterka 2009/2010 (trunk-on-pelvis sensorimotor control) are **frontal-plane** only and were not used for sagittal values.

**Summary for Q8.**
- Sagittal hip intrinsic stiffness ≈ 95 N·m/rad (low amplitude) to 147 N·m/rad (high amplitude), with damping of about 18–27 N·m·s/rad [MODEL].
- **[E]** That is roughly 0.6–1.2 × the HAT's own gravitational stiffness, depending on the assumed HAT COM lever.
- Passive hip properties alone are marginal for holding the trunk upright. Active feedback (S12 H-mode: K_S 1.15, K_V 0.17 s, 66 ms) supplies the net stabilising stiffness and most of the damping.

---

## 9. Conversions of measured or identified gains to Peterka-style normalisation (information only, not recommendations)

**[E]** Zelei 2021 normalised gains p = P/J_A = 5.37 s⁻² and d = D/J_A = 3.55 s⁻¹ are the active part, on top of passive kt = 0.91·mgh in their model.
- Method: J_A = (0.657/12)·m·ℓ² + m·h², with ℓ = 1.77 m and h = 0.95–1.0 m [ASSUMPTION; S23 does not report h].
- Result: P/(mgh) ≈ 0.62–0.64 and D/(mgh) ≈ 0.41–0.42 s.
- Adding the model's passive kt gives a total stiffness of about 1.53–1.55·mgh. The fitted p, d would differ under kt = 0.67, which the authors also tested.

**[E]** In Alexandrov 2005 the A-mode is close to a whole-body pendulum (gravity normalised to 1): K_S = 1.15 and K_V = 0.31 s. These include passive contributions.

The current simulation's COM loop (kP 1.33, kD 0.45 s, 100 ms) falls within these ranges. Its trunk loop has no counterpart to the human H-mode values (K_S 1.15, K_V 0.17 s, 66 ms).

---

## 10. What the evidence supports for the controller design

### (a) Supported by measurement [M], or by model fits to measured human responses that are robust across studies
1. **Blending, not switching.** Hip torque is *added* to ankle torque as speed or size increases (S2). Joint angles, torques and fitted gains scale gradually from the smallest tested translation of 3 cm (S3, S22, S24). In-phase and anti-phase patterns co-exist even in quiet stance (S6, S7).
2. **Trunk moves in phase with the legs at low frequency (<~1 Hz) during small corrections.** About 75% ankle and 25% hip motion, r > 0.9 (S23). HAT moves with the legs in quiet stance (S33). The anti-phase pattern dominates above about 1 Hz (S6, S7, S8).
3. **Small sagittal perturbations produce near-critically-damped recovery** with typically no overshoot at about 4° tilt (S23). Quiet-stance lumped control is underdamped (S30), and excess corrective torque produces about 1 Hz oscillation (S32).
4. **Ankle/COM-loop delays are about 100–130 ms** in perturbation-response fits. EMG onsets are 73–110 ms and ankle torque onset about 99 ms (S1, S19, S20, S28, S9, S12). Lumped single-pendulum fits give 150–240 ms (S23, S30).
5. **Cross-coupling exists in identified human feedback.**
   - Hip EMG depends on leg angle, more than on trunk angle in EMG units (S9).
   - Hip torque depends on ankle angle, increasingly with frequency (S14).
   - A force field at the hip changes ankle control (S15).

   Independent per-joint loops are not what identification finds.
6. **The flat-foot ankle-torque limit is about 0.073·W·H in young adults** (S22). **[E]** ≈ 93 N·m for this body, against about 12 N·m for a 17 mm COM offset. The current small push is far from the constraint that drives hip strategy in the models.
7. **Hip intrinsic stiffness ≈ 95–147 N·m/rad** (S8; model-identified from measured data), marginal compared with HAT gravity. Active feedback is required for trunk stability.

### (b) Supported only by models (fitted to human data, or theoretical or robotic)
1. **One controller with a shared state:**
   - full-state feedback with heterogenic, cross-coupled gains (S3, S5, S21, S22);
   - modal (eigenmovement) PD, diagonal in modes and therefore symmetric and non-diagonal in joints (S12, S13);
   - DEC modules exchanging sensory estimates, with the ankle module balancing the COM and the hip module holding HAT vertical in space (S16, S17).

   The data do not choose among these.
2. **Mode-specific timing:** hip/trunk mode delay ≈ 66 ms against A-mode ≈ 121 ms, with K_V(H) ≈ 0.17 s and K_V(A) ≈ 0.31 s (S12). **[E]** The implied H-mode return time constant is ≈ 0.5 s (non-oscillatory) and the A-mode ≈ 0.9 s (ζ ≈ 0.8).
3. **Coordinating trunk correction with COM** requires an earlier or simultaneous ankle component to cancel the reaction of trunk motion on the COM (S11 optimal bending; S13). This matches the failure seen when hip torque was activated alone.
4. **CoM-error feedback explains ankle and many proximal EMG patterns** (S18–S20). Hip/trunk synergies need an additional goal, plausibly trunk orientation (S20, the authors' suggestion).
5. **The objective is stabilisation at near-minimum activation, not COM or COP sway minimisation** (S9). Minimising COM motion alone drives models toward large hip strategy; prioritising a vertical trunk drives them toward ankle strategy (S26).
6. **Gradual ankle-to-hip transition** emerges from optimisation with a steep CoP-limit penalty (S24) or from limits on ground-reaction torque (S3, S4).

### (c) Unsupported or unknown
1. **Numerical joint-space gain matrices** (ankle and hip torque from ankle angle, hip angle and velocities, normalised by m·g·h) for healthy adults: **not found** in accessible text. Park 2004 is inaccessible; Kim 2009 and Engelhart 2016 give them only in figures.
2. **Overshoot fraction and settling time for sagittal pushes with COM peaks ≤ 20–40 mm: not found.** The ≤0.26 criterion appears to derive from a **medio-lateral** study (S25) that I could not verify. Scale invariance of overshoot is **not established**: gains change with magnitude (S3, S12, S21, S22, S24).
3. **A per-joint sagittal hip feedback delay from closed-loop identification** (separate from modal estimates): not found (S15 values not extractable; S9 used one delay).
4. **Explicit COM-to-trunk-angle feedback relations** after pushes (gains from COM position or velocity to trunk lean): not found.
5. **Hip versus ankle contribution for pelvis pushes specifically** (as opposed to platform translations or releases) at about 17 mm: not found. Kim 2012 shows that push and translation select different gain sets.
6. **Integral action** in human sagittal balance gains, and any integral time constant: not addressed by any source read.
   - In the texts accessed, the fitted models in S12, S19, S22 and S23 used proportional and derivative terms (plus acceleration in S19) with no integral term. Park 2004's structure is known only from its abstract ("linear state feedback").
   - **[E]** Kiemel 2011's nonparametric feedback showed low-frequency gain *plateaus* with phase near 0, i.e. proportional behaviour down to the 0.1 Hz lower cutoff of its mechanical perturbations. No integral-like low-frequency gain rise was reported.
7. **Whether the trunk reference is trunk-in-space or trunk-on-pelvis during natural standing recovery.** In seated or kneeling pelvic tilt, natural behaviour was trunk-on-pelvis (S31, van Drunen 2016). DEC robot models use trunk-in-space (S17). There is no direct standing-push measurement in the sources read.
8. **Exact transition thresholds** (support length, platform velocity) from Horak & Nashner 1986 and Runge 1999: not extracted (abstracts only).

<!-- Compiled 11 Oct 2026 by a research subagent of the PPR-2 session, with three parallel search subagents (passive joint stiffness; perturbation thresholds; eccentric/yield). Citations were checked against Europe PMC / PubMed records (authors, title, journal, volume, pages, DOI) and, where stated, against open full texts. Where only an abstract or a secondary source was read, this is said. Labels are defined in §0. -->

# Standing physical substrate: what a standing human has before an unexpected disturbance

Literature review for PPR-2. The question: which mechanical properties does a standing adult already have **before** an unexpected disturbance? The candidates are gravity, pre-existing muscle activation, intrinsic muscle stiffness, tendon and passive tissue elasticity, damping, eccentric resistance and ground contact. Can those properties hold the body up? If not, what else is ongoing before the disturbance? And how large are standard standing perturbations?

The subject is a simulated adult male: 73.9 kg, COM ≈ 0.89 m above the ankles, 3-DOF joints, torque actuators with activation dynamics, Hill-type capacity and an eccentric plateau of 1.20–1.35 × isometric. Its passive layer has zero stiffness inside each joint's soft range. A first attempt with fixed pre-activation collapsed in ~0.85 s; a stiff joint-space "pose tone" law fell after ~1.45 s.

This review **does not repeat** two earlier reviews and cites them by section:

- **ABI-1** = `abi1/research/BALANCE_LITERATURE.md`: intrinsic ankle stiffness in stance (§1.1), knee/hip gap (§1.2), reflex latencies (§2), postural responses and EMD (§3), strategies and XcoM (§4), stepping (§8), torque capacity and RFD (§10), latency table (§12), controller structure (§13).
- **PPR-1** = `ppr1/research/PRE_REFLEX_LITERATURE.md`: short-range stiffness (SRS, §2), load-dependent intrinsic stiffness (§3), passive moment–angle relations and trunk/arm impedance (§4), damping (§5), tendon (§6), activation and RFD (§7), quiet-stance activation (§8.1), preflex modelling (§10), parameter table (§12).

---

## 0. Conventions

**Evidence labels:**

| Label | Meaning |
|---|---|
| **[M]** | Measured in the cited study. Population and conditions are given. |
| **[R]** | From a review or compilation, or a parameter of a published model (marked "model"). |
| **[E]** | My extrapolation or arithmetic. The derivation is shown. |
| **[D]** | Would be a design choice for the simulator, not a literature value. |

**How each source was read:** "abstract" = abstract only; "full text" = open full text read directly; "summary tool" = numbers taken from the open full text through an automated page summariser and not re-read line by line; "secondary" = taken from another paper that quotes it.

**Reference values for this body (all [E]):**

| Quantity | Value | Derivation |
|---|---|---|
| Weight mg | 725 N | 73.9 × 9.81 |
| mgh (whole body about the ankles, both legs) | **647 N·m/rad** (11.3 N·m/deg) | Given in the brief; 73.9 × 9.81 × 0.89 = 645 |
| Moment of inertia about the ankles, J | **≈70 kg·m²** | 1.2 × m h² = 1.2 × 73.9 × 0.89². The ratio J/(m h²) is 1.18 in Peterka's model body (J 81, m 85, h 0.9) and 1.28 in Pasma 2017 (J 66, m 75, h 0.83) |
| ω₀ = √(g/h) | **3.32 s⁻¹** (1/ω₀ = 0.30 s) | Hof et al. 2005 definition |
| Upper body (head, arms, trunk) about the hips | m ≈ 50 kg; mgh_hip ≈ **150–170 N·m/rad**; J_hip ≈ 6.7 kg·m² | Winter mass fraction 0.678; COM 0.30–0.35 m above the hip axis (assumed); J = 1.3 m h² (assumed) |
| Head about C7/T1 | mgh_neck ≈ **7–12 N·m/rad** | 5–6 kg, COM 0.15–0.20 m above C7/T1 (assumed) |
| Quiet-stance ankle torque | ≈ **34 N·m** (both legs), ≈5 % of mgh × 1 rad | Sakanaka 2021 (PPR-1 §8.1). Equivalent to a COM lean of ≈3° (COM ≈ 5 cm ahead of the ankle) |

---

## 1. Bottom line for the substrate

Full answers are in §9(a). In short:

1. **Mid-range is not elastically empty.** Relaxed tissue resists throughout ±5–10° of standing, with no dead zone (§2):
   - ankle ≈80–95 N·m/rad both legs (12–15 % mgh) long-range, ≈67 % mgh below 0.2°;
   - hip ≈25 N·m/rad per hip at 0°, 44 at 10° extension;
   - knee ≈90 N·m/rad per knee at full extension, 26 at 10° flexion.

   Only the spine, neck and elbow have genuine low-stiffness neutral zones.
2. **Passive plus intrinsic stiffness is sub-critical at every inverted link** (ankle 45–91 % mgh; hip 95–147 N·m/rad versus 150–170 of upper-body load; neck 10–30 % of head load). Fixed pre-activation cannot hold quiet standing (§3).
3. **Without new neural input the fall takes ≈1–3 s, not an instant** [E, §3.4]:
   - a stiff-legged body with human ankle properties leaves its stable sway range in ≈1.5–2.6 s;
   - a hip or trunk with zero stiffness folds 10° in ≈0.8 s.

   The first attempt's 0.85 s collapse therefore points to mid-chain (hip/trunk or flexed-knee) buckling.
4. **Postural control is a continuous, delayed loop that is already running before any disturbance** (§4):
   - torque-level delay 150–200 ms; Peterka τd = 0.175 s;
   - K_P ≈ 1.3 mgh, K_D ≈ 0.46 s × mgh;
   - bandwidth ≲1–2 Hz; ballistic corrections ≈2–2.6 per second.

   Its response to a disturbance starts only after its delay. Including it does not violate "no collision-triggered response, no instantaneous controller".
5. **Perturbations for a 74 kg body, brief pulses** (§5, §9(c)):
   - forward: small 5–8 N·s, moderate 12–16 N·s, step expected ≳23–26 N·s for a 100–150 ms pulse;
   - backward: ≈0.7 × forward;
   - lateral with hip-width stance: ≈1.2–1.4 × forward.
6. **A 1.20–1.35 × eccentric plateau is adequate** (§6): slightly generous for slow plantarflexors at postural activation, about right for mixed muscle.
7. **Damping does not rescue a sub-critical pendulum** (§7). Intrinsic viscosity is ≈1–4 N·m·s/rad (ankle) and ≈20 (hip); the neural derivative term is ≈300 N·m·s/rad.

---

## 2. Passive mid-range joint stiffness (Q1)

Earlier coverage: passive knee derivatives from the Riener equation, Watt 2022 lumbar quartiles, Franklin & Milner arm intercepts and Brown & McGill trunk values are in PPR-1 §4.1 and §12. The passive calf short-range/long-range summary is in ABI-1 §1.1. New material follows.

### 2.1 Ankle: the best-measured case, and standing-specific

- **Loram, Maganaris & Lakie 2007a** (J Physiol 584:661–675; full text via subagent, abstract here). n = 10 (7 women, 3 men; 26 ± 12 y). Subjects stood supported at the waist with the calf muscles relaxed (EMG-checked). The footplate rotated the ankles about the standing angle (3.1 ± 0.9°).
  - **Long-range stiffness** (7° ramps): **0.81 ± 0.3 N·m/deg = 46 N·m/rad per leg** [M], i.e. **13 ± 2 % of mgh** (15 ± 3 % by an alternative model) [M].
  - **Short-range stiffness**: 3.6 ± 0.9 N·m/deg at 0.15° and 3.0 ± 1.0 at 0.4° (206 and 172 N·m/rad per leg) [M]; ≈**67 ± 8 % mgh** for rotations below 0.2° [M, abstract].
  - **Chord stiffness falls smoothly from 101 ± 9 % to 19 ± 5 % of mgh over 0.03–7°**, as rotation^(−0.33 ± 0.04) [M, abstract]. The transition from short to long range is around 0.5° [M].
  - Passive calf torque alone can "sustain unstable balance without tonic activity at a mean CoM–ankle angle of 1.6 deg" [M, abstract]. That is roughly half to two-thirds of the usual standing lean [E]. The authors conclude passive stiffness "has a substantial postural role eliminating the need for continuous muscle activity and increasing the unstable time constant".
  - Thixotropy: resting torque fell by ≈1 N·m after the first cycle [M].
- **Loram et al. 2007b** (J Physiol 584:677–692; abstract plus summary tool). Series-elastic stiffness (Achilles tendon, aponeurosis, foot) is roughly constant at **77 ± 13 % mgh** [M]. The contractile tissue is 6–12 times stiffer than the series elastic component for 0.15–0.4° rotations [M]. The short-range stiffness therefore lies in the relaxed contractile tissue, while the tendon is the weak series link.
- **Riener & Edrich 1999** ankle equation (secondary; first exponential term confirmed in a search excerpt; the second term and constant are not verified). The first term alone gives [E]:
  - **39.5 N·m/rad per ankle at 0°** (79 both legs = 12 % mgh);
  - 60 at 5° dorsiflexion; 92 at 10° dorsiflexion; 26 at 5° plantarflexion; 17 at 10° plantarflexion;
  - chord over ±5° = 41 N·m/rad per ankle.
- **Hunter & Kearney 1982** (J Biomech 15:747–752). Relaxed ankle stiffness 16–55 N·m/rad per ankle across individuals, quoted by the Lakie & Campbell 2019 review [R, secondary; posture and amplitude not verified]. Both legs: 5–17 % mgh [E].
- **Weiss, Kearney & Hunter 1986** (J Biomech 19:727–735; abstract). Passive torque is small in mid-range; stiffness is large at the extremes and linear in passive torque [M]. That is the signature of an exponential moment–angle curve (dM/dθ ∝ M), which has no zero-stiffness region.

**Cross-check.** Loram (46 per leg, standing), Riener (≈40) and Hunter & Kearney (16–55) agree. **Passive long-range ankle stiffness is ≈40–46 N·m/rad per leg = 80–95 N·m/rad both legs = 12–15 % mgh**, rising smoothly into dorsiflexion [M/E].

### 2.2 Hip, including extension near upright

- **Riener & Edrich 1999** hip equation, as reproduced by Pascoletti et al. 2019 (Front Bioeng Biotechnol 7:419; secondary, full text). Flexion is positive. The coefficient sign on the extension term was resolved by physical consistency. Derivatives with knee at 0° [E]:

| Hip angle | 10° flexion | 5° flexion | **0°** | 5° extension | 10° extension | 15° extension |
|---|---|---|---|---|---|---|
| Passive stiffness per hip (N·m/rad) | 17.8 | 20.6 | **25.3** | 32.8 | **44.3** | 61.5 |

  - Passive flexor moment per hip: 8.6 N·m at 0° and 14.4 N·m at 10° extension [E].
  - Chord over ±10°: 27 N·m/rad [E].
  - The passive zero-moment angle with the knee extended is ≈27° flexion [E; depends on an unverified constant]. Standing at 0° therefore already pre-tensions the anterior hip tissue.
- **Silder et al. 2007** (J Biomech 40:2628–2635; full text; n = 20). Reading one subject's figure gives ≈0.48 N·m/deg ≈ **27 N·m/rad** around 0° [E], consistent with Riener. Between-subject variability was smaller in mid-range than at end range [M].
- **Vrahas et al. 1990** (J Biomech 23:357–362; abstract). Passive structures provide "well less than 10 %" of hip moments in gait and stair climbing [M].
- **Comparison with gravity [E].**
  - Both hips at 0°: ≈51 N·m/rad = 8 % mgh. That is ≈30–34 % of the upper-body load (150–170 N·m/rad), and ≈55–60 % at 10° extension.
  - Bilateral passive flexor moment at 0° ≈ 17 N·m. That is of the same order as the extending moment from the upper body (≈490 N × a 1–3 cm lever behind the hip = 5–15 N·m). A passive static equilibrium near hip neutral is therefore plausible. Stability against perturbation is a different matter (§3.3).
- **"Hanging on the Y-ligament."** A textbook statement: the line of gravity passes posterior to the hips and anterior to the knees and ankles. Hip hyperextension "is resisted by the iliofemoral ligament". Only the calf and paraspinal muscles are "absolutely essential" (O'Rahilly et al., *Basic Human Anatomy*, ch. 18; textbook, not primary).
  - Joseph & Williams 1957 (J Anat 91:286–294) is the classic EMG source on hip muscles in standing, but only its citation was verified. Soames & Atha 1981 (Eur J Appl Physiol 47:159–167; abstract): antigravity muscle activity in standing is "generally low and often absent".
  - Cadaver data on capsular restraint near 0° in the sagittal plane were not found. van Arkel et al. 2015 (Bone Joint J 97-B:484–491) covers rotational restraint only: the iliofemoral ligament is the primary rotational restraint in extension.

### 2.3 Knee: standing sits at the extension end-stop

Riener & Edrich 1999 knee equation (secondary, two independent reproductions; this extends PPR-1 §4.1). Stiffness per knee with hip and ankle at 0° [E]:

| Knee angle | 5° hyperextension | **0°** | 2° flexion | 5° flexion | 10° flexion | 15° flexion | 30–60° flexion |
|---|---|---|---|---|---|---|---|
| Stiffness per knee (N·m/rad) | 182 | **91** | 70 | **48** | **26** | 16 | 2–5 |

- Stiffness doubles about every 4.6° toward extension. This is the capsule–ligament term exp(2.220 − 0.150 φ_K).
- Passive flexor moment at 0° ≈ 10 N·m per knee [E].
- Values at 0° and in hyperextension lie at the edge of the fitted data.
- The biarticular gastrocnemius coupling is preserved in paraplegia (Edrich, Riener & Quintern 2000, IEEE TBME 47:1058–1065; abstract).

### 2.4 Lumbar spine and trunk

- Passive quartile stiffnesses (flexion 19/37/73/135 N·m/rad; neutral zone ≈10–11 N·m/rad) are in PPR-1 §4.1 (Watt 2022).
- **Shojaei, Allen-Bryant & Bazrgari 2016** (Ann Biomed Eng 44:2817–2826; abstract, values via the Watt 2022 table). In upright standing, flexion stiffness was 0.92 / 0.95 / 1.60 N·m/deg (**53 / 54 / 92 N·m/rad**) in range quartiles 1–3 [M]. The abstract says stiffness was **highest around neutral standing** and attributes this to active contribution.
- **Woodhull-McNeal 1986** (Eur J Appl Physiol 55:419–424; abstract). In relaxed standing, erector spinae, external oblique and rectus abdominis were **continuously active**: medians 1.0, 2.5 and 0.7 µV versus 0.2 µV lying [M]. Quote: "There is no support for hypotheses of passive support for the torso"; the muscles "act as guy wires". Forearm muscles did not increase their activity in standing.
- **Comparison with gravity [E].** Load about L5/S1 is ≈44 kg × 9.81 × 0.25–0.30 m ≈ 90–120 N·m/rad. Passive neutral-zone stiffness (≈10 N·m/rad) is ≈10 % of that. Active intrinsic trunk stiffness without reflexes (≈109 N·m/rad; Brown & McGill 2009, PPR-1 §4.4) is close to, but not clearly above, the load.

### 2.5 Neck

- **Liu et al. 2024** (Ann Biomed Eng 52:2178–2192; full text via subagent; n = 6, supine with the head supported, EMG feedback). Near-neutral "zone 1" stiffness [M]:
  - flexion **36 ± 7 N·mm/deg = 2.1 N·m/rad**;
  - extension **20 ± 10 N·mm/deg = 1.1 N·m/rad**;
  - lateral bending ≈2.4 N·m/rad.
  - Toward end range it roughly doubles (65–69 N·mm/deg ≈ 3.7–4.0 N·m/rad).
- **McGill, Jones, Bennett & Bishop 1994** (Clin Biomech 9:193–198; abstract). Tolerable passive moments were below 10 N·m on average [M].
- **Comparison with gravity [E].** Passive neck stiffness is ≈10–30 % of head load (7–12 N·m/rad), so the head needs active support.

### 2.6 Shoulder and elbow (hanging arm)

- **Shoulder.** No passive near-neutral data were found beyond Franklin & Milner's relaxed intercept of ≈6.6 N·m/rad (PPR-1 §4.5).
- **Elbow.** Relaxed stiffness 0.40–1.8 N·m/rad, correlated with upper-arm volume (Wiegner & Watts 1986, J Neurol Neurosurg Psychiatry 49:1171–1176; abstract; n = 19) [M]. Franklin & Milner give ≈10 N·m/rad with a different paradigm. Hayes & Hatze 1977 (Eur J Appl Physiol 37:265–274; elbow) was not retrievable.
- **For hanging segments, gravity stabilises [E].** About +11 N·m/rad at the shoulder (3.7 kg × 9.81 × 0.3 m) and ≈+2.8 N·m/rad at the elbow. Low passive stiffness is harmless here.

### 2.7 Amplitude dependence (thixotropy) at joint level

- **Ankle.** Short-range stiffness ≈4.5–5 × long-range, used up by ≈0.5° (Loram 2007a) [M].
- **Wrist.** Relaxed resonance ≈2 Hz for large movements and ≈8 Hz for ≈1° movements, i.e. ≈16 × the stiffness. It is not reflex (unaffected by anaesthesia) and has a 1–2 s "memory" [M/E: Lakie, Walsh & Wright 1984, J Physiol 353:265–285 (abstract); Lakie & Campbell 2019].
- **Standing.** Larger sway lowers ankle stiffness by up to 43 % (Sakanaka, Lakie & Reynolds 2016, J Physiol 594:781–793; abstract) [M].
- **Implication [D].** Use long-range values for excursions ≥1°. The short-range component is the low-force counterpart of active SRS (PPR-1 §2).

### 2.8 Which tissues carry the load in upright stance

| Joint | Load-bearing tissues | Source |
|---|---|---|
| Ankle | Series chain (Achilles tendon, aponeurosis, foot), stiffness ≈77 % mgh, limits small-rotation stiffness. Relaxed and tonically active triceps surae (cross-bridge SRS, titin and connective tissue) set the long-range ≈13–15 % mgh passive and the 45–91 % intrinsic stiffness | Loram 2007a,b; Loram & Lakie 2002 ("foot, Achilles' tendon and aponeurosis"); Sakanaka 2018 |
| Hip | Anterior capsule and iliofemoral ligament, plus stretched hip flexors (iliopsoas, rectus femoris), pre-tensioned at 0° | Riener & Edrich; textbook; van Arkel 2015 |
| Knee | Posterior capsule and ligaments near extension, plus biarticular hamstrings and gastrocnemius | Riener & Edrich capsule term; Edrich 2000 |
| Spine and neck | Discs, ligaments and facet capsules have a low-stiffness neutral zone, so standing relies on continuously active muscle | Watt 2022; Woodhull-McNeal 1986; Liu 2024 |

### 2.9 Answer to Q1

See §9(a) item 1. Elastic resistance is present at the ankle, hip and knee independent of activation, and sub-critical at every inverted joint.

---

## 3. Quiet standing: can passive mechanics plus fixed pre-activation sustain it? (Q2)

### 3.1 Prior coverage (not repeated)

- Intrinsic ankle stiffness in stance is just below mgh (ABI-1 §1.1; PPR-1 §3.2): 91 ± 23 % for tiny perturbations; 64 ± 8 % for 1° steps; 0.93 → 0.44 mgh from 0.3° to 4.6°; 94 → 58 % mgh from 0.2° to 0.9°.
- Winter et al. 1998 ("stiffness control") versus the rebuttals of Morasso & Schieppati 1999 and Morasso & Sanguineti 2002 (ABI-1 §1.1).
- Peterka 2002: total corrective stiffness ≈1.33 mgh (ABI-1 §1.1).

### 3.2 New evidence: continuous neural modulation is required

| Source | Finding | Label |
|---|---|---|
| Loram & Lakie 2002a (J Physiol 545:1041–1053) | Intrinsic stiffness "not quite sufficient" and "cannot be neurally regulated in quiet standing". Quote: "the brain cannot set ankle stiffness and then ignore the control task" | [M, abstract] |
| Loram, Maganaris & Lakie 2004 (J Physiol 556:683–689); 2005b (J Physiol 564:281–293) | Calf fascicles move **paradoxically**, shortening in forward sway. Series elasticity caps ankle stiffness at 92 ± 20 % mgh. EMG precedes the muscle movement by **110 ± 50 ms**. Not producible by stretch reflexes | [M, abstract] |
| Loram et al. 2005a (J Physiol 564:295–311); Loram & Lakie 2002b (J Physiol 540:1111–1124) | Calf muscles actively adjusted **2.6 times per second** in ballistic 30–300 µm steps. Pendulum balancing uses repeated "throw and catch" torque; intrinsic stiffness "insufficient to maintain balance or to control position" | [M, abstract] |
| Kiemel, Elahi & Jeka 2008 (J Neurophysiol 100:3394–3406) | Two-joint closed-loop identification: intrinsic **ankle 293–362 N·m/rad (45–56 % mgh)**, **hip 95–147 N·m/rad**, hip damping 18–27 N·m·s/rad. Quote: "insufficient to stabilize the plant". The anti-phase hip–ankle pattern comes from plant dynamics | [M/model, summary tool] |
| Fitzpatrick et al. 1992 (J Physiol 454:533–547); 1994 (J Physiol 480:395–403); 1996 (J Neurophysiol 76:3994–4008) | Reflex stiffness is "a necessary component" of standing ankle stiffness. Leg-muscle afferents alone suffice to stand (eyes closed, vestibular input excluded, feet anaesthetised). Loop gain ≈1 is "still insufficient", so a predictive component is inferred | [M, abstract] |
| Woodhull-McNeal 1986 | Trunk held by continuously active "guy-wire" muscles (§2.4) | [M, abstract] |
| Di Giulio et al. 2013 (J Appl Physiol 114:1717–1729; n = 24) | Under 1–10 N knee pushes, 22 subjects kept the leg stiff (knee flexion 0.4 ± 0.3°); 2 used a compliant strategy (3.0 ± 1°). Leg stiffness is a strategy, not a fixed lock | [M, abstract] |
| Di Giulio & Baltzopoulos 2019 (Front Physiol 10:625; n = 13, 46 ± 13 y) | At steady state the CoG lies **58 ± 5 mm anterior to the ankle, 32 ± 7 mm anterior to the knee and 5 ± 5 mm posterior to the hip** (sign inferred from the text). Joint moments drift over 0.25–0.6 s. Quote: "mechanisms other than passive knee and hip regulation are involved" | [M, full text] |
| Danis et al. 1998 (Phys Ther 78:502–517) | COG anterior to the ankle and knee, posterior to the hip; knees flexed (angle not in abstract) | [M, abstract] |
| Gage et al. 2004 (Gait Posture 19:124–132); Aramaki et al. 2001 (Exp Brain Res 136:463–473); Gatev et al. 1999 (J Physiol 514:915–928) | The inverted pendulum holds at COM level only with compensatory knee motion. Hip angular acceleration ≈ −3.1 × ankle. Ankle mechanisms dominate in normal stance; lateral gastrocnemius EMG leads COG by 250–300 ms | [M, abstract] |

**Quiet-stance activation.**

- Ankle plantarflexors run at ≈8–14 % MVC torque (PPR-1 §8.1), or ≤5 % MVC by EMG (Kouzaki & Shinohara 2010, Muscle Nerve 42:78–87) [M].
- Medial gastrocnemius units are recruited intermittently, at a modal rate of two per second, firing at 8–10 pulses/s (Vieira 2012) [M].
- Tibialis anterior is rarely active in young adults (Dos Anjos et al. 2017, Front Hum Neurosci 11:190) [M].
- Quadriceps, hamstring and gluteal % MVC values: gap.

### 3.3 Are the knee and hip passively stable?

- **Knee: largely, if it stands at the extension stop.**
  - With the COG ≈3 cm anterior to the knee (Di Giulio 2019; Danis 1998; textbook), gravity produces an external extension moment. Bilateral: ≈ 650 N above the knees × 0.03 m ≈ 20 N·m [E].
  - That moment pushes the knee into the posterior capsule, whose stiffness is ≈90 N·m/rad per knee at 0° and ≈180 at 5° hyperextension [E, §2.3].
  - A flexion disturbance is resisted passively until the gravity line crosses behind the knee. That needs roughly 3 cm / 0.45 m ≈ 4° of forward shank rotation relative to the COM [E, rough].
  - If the knee stands flexed by 5–10°, passive stiffness falls to 26–48 N·m/rad per knee. The extensor demand then rises as the knee flexes, so tonic quadriceps torque is needed and the knee can buckle under fixed activation.
  - Even so, most people stiffen the knee actively (Di Giulio 2013).
- **Hip: not fully passive.**
  - The COG sits ≈0–5 mm behind the hip (Di Giulio 2019), so the static load is small. Bilateral passive flexor tension at 0° (≈17 N·m) and stiffness (≈51 N·m/rad, rising with extension) can balance it [E, §2.2].
  - But closed-loop identification gives intrinsic hip stiffness of only 95–147 N·m/rad. That is ≈0.6–0.9 of the upper-body load, i.e. insufficient (Kiemel 2008).
- **Trunk and neck: not passive.** Both rely on continuously active muscle (Woodhull-McNeal 1986; §2.4–2.5).

### 3.4 What happens if active control is removed: fall dynamics [E]

**Model.** Single inverted pendulum about the ankles: J = 70 kg·m², mgh = 647 N·m/rad. The baseline lean is 3.2° (COM 5 cm ahead), held by a constant tonic torque. On top of that, the joint has amplitude-dependent intrinsic stiffness K(|Δθ|) and damping B. The deviation obeys J·Δθ̈ = mgh·sin(θ₀ + Δθ) − τ₀ − K·Δθ − B·Δθ̇. The script is in the session scratchpad (`fall.py`).

**Unstable time constant** τ_u = √(J/(mgh − K)):

| K / mgh | 0 | 0.15 (passive long-range) | 0.44–0.5 (stance, 1–5°) | 0.64 (stance, 1°) | 0.9 (stance, <0.2°) | 0.95 |
|---|---|---|---|---|---|---|
| τ_u (s) | 0.33 | 0.36 | 0.44–0.47 | 0.55 | 1.04 | 1.47 |
| Time from a 0.5° offset to +10°, = acosh(20)·τ_u (s) | 1.21 | 1.32 | 1.62–1.72 | 2.02 | 3.84 | 5.43 |

**Simulated times to reach a given extra lean** (fixed tonic torque, no neural change):

| Stiffness law | Start state | +2° | +6° | +30° |
|---|---|---|---|---|
| Stance law, K = 0.58 mgh·(Δ/0.9°)^−0.32, capped at 0.95 (fit to Sakanaka 2021; same result with a 0.44 mgh floor from Vlutters 2015) | Natural sway velocity 0.3°/s | 2.1 s | 2.6 s | 3.2–3.3 s |
| Same | 1°/s | 1.1 s | 1.6 s | 2.3 s |
| Same, B = 40 N·m·s/rad | 0.3°/s | 2.6 s | 3.2 s | 3.9–4.0 s |
| Passive calf law (Loram 2007a; 101 % → 19 % mgh, exponent −0.33) | 0.3°/s | 1.65 s | 2.1 s | 2.7 s |
| K = 0 (all ankle stiffness lost; torque held) | 0.3°/s | 1.2 s | 1.6 s | 2.1 s |
| Same | 0.5° offset | 0.7 s | 1.05 s | 1.6 s |

**Upper body folding at the hips** (upper-body pendulum: mgh_hip ≈ 157 N·m/rad, J ≈ 6.7 kg·m²):

| Hip stiffness (N·m/rad) | 0–10 | 95 | 120 | 147 |
|---|---|---|---|---|
| τ_u (s) | **0.21** | 0.33 | 0.42 | 0.81 |
| Time from 0.5° to 10° (s) | **0.76–0.78** | 1.21 | 1.56 | 2.97 |

**Interpretation.**

- **A stiff-legged body with human ankle properties and frozen activation would leave its stable sway range** (more than ≈5–6° beyond baseline, where the XcoM is roughly beyond the foot; §5) **in ≈1.5–2.6 s from natural sway, and reach the ground in ≈3–4 s.**
- **A zero-stiffness hip or trunk folds in ≈0.8 s.** The upper-body pendulum is short, so it is ≈1.6 × faster than whole-body toppling.
- The 0.85 s collapse of the first attempt is the right order for **mid-chain buckling**: a hip or trunk with near-zero mid-range stiffness, or a flexed knee. It is faster than a stiff-legged topple.
- The pose-tone law's 1.45 s is comparable to a whole-body topple with sub-critical ankle stiffness.

**Human loss-of-tone data (qualitative).**

- No primary study timing the fall in syncope, cataplexy or atonic seizures was found (gap).
  - Video studies of syncope: falls with loss of consciousness lasting 12.1 ± 4.4 s, with no fall-time measurement (Lempert, Bauer & Schmidt 1994, Ann Neurol 36:233–237; abstract).
  - Cataplexy: "head drops, trunk fall" (Pizza et al. 2018, Sleep 41:zsy026; abstract). Knee buckling is commonly described but was not verified here.
  - Clinically, cataplectic falls are commonly described as slow and progressive. That description was not verified in a primary source.
- [E] The likely collapse mode with lost tone is **knee and trunk buckling (crumpling)**, not a rigid topple. That fits the time constants above.
- Fall-from-standing experiments: hand–pelvis impacts within 38 ms of each other (Hsiao & Robinovitch 1998, J Biomech 31:1–9; abstract). Impact at ≈700 ms after perturbation is quoted in a secondary source and was not verified.

### 3.5 Conclusion for Q2

- **Physiological quiet standing requires continuous, delayed neural feedback.** Every primary source that tested passive plus intrinsic stiffness found it below the gravitational demand at the ankle, and at the hip, trunk and neck where tested.
- Humans close the gap with a delayed (≈100–200 ms), low-bandwidth, partly intermittent loop that issues corrections ≈2–2.6 times per second (§4).
- **Extrapolation [E, §3.4].** With human intrinsic and passive stiffness and frozen tonic activation, a stiff-legged body would stay within its stable sway range for ≈1.5–2.5 s, and within ±2° for ≈1–2 s.
- That holds only if the knee is at its extension stop and the hip and trunk do not fold. A trunk without its guy-wire activity folds in under 1 s.
- **Design consequence [D].** A substrate made only of passive, intrinsic and frozen-tone elements cannot be a stable standing state. For an unperturbed control trial to stand, the substrate must include the ongoing delayed postural loop (§4.4).

---

## 4. Ongoing postural control (Q3)

### 4.1 Loop delay

| Source | Delay | Context | Label |
|---|---|---|---|
| Peterka 2002 (J Neurophysiol 88:1097–1118), as restated by Peterka & Loughlin 2004 (J Neurophysiol 91:410–423) | **150–200 ms**, "a rather fixed feature that is independent of the particular sensory cues" | Independent-channel model fitted to sway evoked by pseudorandom support-surface and visual rotations | [M/model, full text of 2004] |
| Peterka & Loughlin 2004, parameters derived from Peterka 2002 (eyes closed, 1° peak-to-peak surface rotation) | **τd = 0.175 s**; K_P = 970 N·m/rad; K_D = 344 N·m·s/rad; K_I = 86 N·m/(rad·s); body m = 85 kg (with backboard), J = 81 kg·m², h = 0.9 m | τd "represents the combined time delays due to sensory transduction, neural transmission, nervous system processing, muscle activation, and force development". There is no separate passive element. Ratios [E]: K_P/mgh = 970/750 = **1.29**; K_D/mgh = **0.46 s** | [R model, full text] |
| Pasma et al. 2017 (ABI-1 §1.1) | 0.097 s plus second-order activation (ω = 16.8 rad/s, ζ = 0.99) | The activation filter adds ≈2ζ/ω ≈ 0.12 s of low-frequency group delay, so total effective lag ≈ **0.21 s** [E] | [R model] |
| Asai et al. 2009 (PLoS One 4:e6169) | 0.2 s, citing Peterka 2002 | Model with passive K = 0.8 mgh, B = 4 N·m·s/rad | [R model, full text] |
| Welch & Ting 2008 (ABI-1 §3) | 100 ms (CoM to EMG), plus 40 ms EMG-to-torque | Reproduces perturbation EMG | [M/model] |
| Loram et al. 2005b | EMG leads muscle movement by 110 ± 50 ms | Quiet standing | [M] |
| Kiemel 2008 | EMG-to-torque second-order low-pass, ω 6.9–9.5 rad/s, ζ 1.0–1.6 (group delay ≈2ζ/ω ≈ 0.29–0.34 s [E]) | Closed-loop plant identification | [M/model] |
| Fitzpatrick et al. 1996 | Loop gain ≈1, residual phase lag explains 6–8 Hz standing tremor | Galvanic plus waist perturbation | [M] |

**Working value [E/D].**

- **≈100 ms** from sensed state to neural command, plus ≈40–120 ms of activation/force development.
- That gives an effective torque-level delay of **≈150–200 ms**, consistent with Peterka's lumped τd = 0.175 s.
- This is the same latency class as the automatic postural response (torque from ≈120–160 ms; ABI-1 §12).

### 4.2 Bandwidth and sway frequency

- **Soames & Atha 1982** (Eur J Appl Physiol 49:169–177; abstract; 29 men, 29 women). **90 ± 4 % of AP and 95 ± 3 % of lateral sway power lies below 2 Hz.** Modal AP frequencies: 0.30–0.45 Hz (primary), 0.60–0.75 Hz and 1.05–1.20 Hz [M].
- **Loram et al. 2011** (J Physiol 589:307–324; abstract). Disturbance–control coherence is insignificant beyond **1–2 Hz** [M].
- **Peterka 2002.** Transfer functions were reliable over 0.017–2.23 Hz [M, abstract]. A transient **≈1 Hz** oscillation appears when sensory weighting is mismatched (Peterka & Loughlin 2004) [M]. That is the resonance of the delayed loop.
- **Collins & De Luca 1993** (Exp Brain Res 95:308–318; abstract). Centre-of-pressure diffusion shows short-term "open-loop" and long-term "closed-loop" regimes [M]. The ≈1 s crossover is quoted by secondary sources and was not verified.

### 4.3 Intermittency

| Source | Rate or interval | Label |
|---|---|---|
| Loram et al. 2005a | 2.6 calf adjustments per second (interval ≈0.38 s) | [M] |
| Vieira et al. 2012 | Medial gastrocnemius recruitment, modal rate 2 per second (≈0.5 s) | [M] |
| Loram et al. 2011 (visuo-manual pendulum) | Median contact rate 0.8 ± 0.3 per second; **modal 2 per second** when optimising | [M] |
| Gawthrop et al. 2011 (Biol Cybern 104:31–51) | Theory: "continuous observation, intermittent action". With small thresholds and regular sampling, an intermittent controller "can masquerade" as a continuous one | [R model, abstract] |
| Asai et al. 2009; Bottaro et al. 2008 (Hum Mov Sci 27:473–495) | Intermittent PD switched off near the stable manifold of the saddle. Much lower gains (P ≈ 0.25 mgh, D ≈ 10 N·m·s/rad) than continuous PD (P ≈ 0.8 mgh, D ≈ 270 N·m·s/rad), with human-like sway spectra | [R model] |
| van der Kooij & de Vlugt 2007 (J Neurophysiol 98:730–743) | Responses to 0.06–4.5 Hz platform perturbations are "dominated by continuous feedback"; intermittent mechanisms do not significantly shape them | [M, abstract] |
| Masani et al. 2003 (J Neurophysiol 90:3774–3782); 2006 (Gait Posture 23:164–172); Vette et al. 2010 (IEEE TNSRE 18:86–95) | A high-velocity-gain PD with physiological delay reproduces the EMG lead over the COM without feedforward. Active and passive torque both contribute significantly | [M/model, abstract] |
| Kiemel, Zhang & Jeka 2011 (J Neurosci 31:15144–15153) | Identified feedback stabilises upright stance with near-minimal muscle activation, rather than minimising sway | [M/model, abstract] |

### 4.4 How the ongoing loop relates to perturbation responses

- **Sensory channels.** In Peterka's fits, eyes closed on a fixed surface, the proprioceptive weight is ≈0.8 and the graviceptive (vestibular) weight ≈0.2 (Peterka & Loughlin 2004). Weights shift toward vestibular input as surface-rotation amplitude grows ("sensory reweighting"; Peterka 2002; Cenciarini & Peterka 2006, J Neurophysiol 95:2733–2750). Leg-muscle afferents alone suffice for quiet stance (Fitzpatrick 1994). Lockhart & Ting 2007 (Nat Neurosci 10:1329–1336) found the same delayed CoM-feedback rule explains responses to sudden loss of balance in cats; large-fibre sensory loss removed the acceleration term.
- **One loop or two?** The same delayed, task-level CoM feedback with a single delay accounts for:
  - continuous sway: Peterka 2002; Maurer & Peterka 2005 (J Neurophysiol 93:189–200);
  - pseudorandom perturbation responses: van der Kooij & de Vlugt 2007;
  - discrete ramp-and-hold translations: Welch & Ting 2008, ABI-1 §3.

  The automatic postural response is therefore best viewed as **the ongoing postural loop's delayed reaction to a large input**. It is not a separate controller that switches on. Short-latency stretch reflexes are a separate, local, low-gain pathway (ABI-1 §2).
- **"Continuous before, delayed after."** Any delayed-feedback model has the requested property. Peterka's independent-channel model, Pasma 2017, Asai 2009, Masani 2006 and Welch & Ting 2008 all do. Before a disturbance the loop is active and produces the tonic torque plus small corrections. At t = 0 the torque it delivers is a function of the state at t − τd, so the response to the disturbance cannot begin before τd. ABI-1 §12 row 2 ("hold of pre-perturbation tone") is the first τd of this loop.
- **Implication for the substrate [D].** Include a continuous low-gain task-level postural loop. Its input is delayed by ≥100 ms (torque-level ≈150–200 ms); its gains are near K_P ≈ 1.3 mgh and K_D ≈ 0.45 s × mgh at the ankle-equivalent level; its torque bandwidth is ≲1–2 Hz. It runs from before the disturbance onward. Within the first 100–175 ms after impact it can only replay pre-impact information, so it satisfies "no collision-triggered response and no instantaneous controller". Its gains are the single most important unknown for a multi-joint body: knee, hip and trunk gains are not identified (gap).

---

## 5. Perturbation magnitudes for standing tests (Q4)

Conversions [E]:

- XcoM rule: ξ = x + v/ω₀ must stay inside the effective base of support (Hof et al. 2005; ABI-1 §4).
- Quiet-stance COM ≈ 0.04–0.05 m in front of the ankle. Toe ≈ 0.205 m and heel ≈ 0.055 m from the ankle (foot 0.26 m).
- Without delay: Δv_max = ω₀ × (edge − x₀). With an effective response delay τ, the factor is e^(−ω₀τ): 0.61 for τ = 0.15 s and 0.52 for τ = 0.20 s.
- **Impulse = m·Δv.** For pushes longer than ≈0.1 s this is a lower bound on the applied impulse, because ground forces act during the push.

### 5.1 Theoretical feet-in-place limits for this body [E]

| Direction | No delay | With 150–200 ms delay |
|---|---|---|
| Forward (toward toes) | 3.32 × 0.165 = **0.55 m/s (41 N·s)** | 0.28–0.33 m/s (21–25 N·s) |
| Backward (toward heels) | 3.32 × 0.095 = **0.32 m/s (23 N·s)** | 0.16–0.19 m/s (12–14 N·s) |
| Lateral, ≈17 cm stance width (edge ≈0.13 m from midline) | **0.43 m/s (32 N·s)** | 0.22–0.26 m/s (16–19 N·s) |

- Hof & Curtze 2016 (J Biomech 49:580–585; abstract): after a sudden perturbation, the effective base of support is only "some 30 %" of the static one [M/R]. That fits the delay factor above.
- Pai & Patton 1997 (abstract; model, no delay): the forward-fall boundary is 0.45 s⁻¹ (velocity / body height) with the COM over the heel, falling to 0 over the toe [R]. Interpolated to x₀ for a 1.75 m body: ≈0.50 m/s [E], consistent with the no-delay XcoM value.

### 5.2 Measured thresholds (healthy young adults unless stated)

| Paradigm | Finding | Converted for 74 kg [E] | Label |
|---|---|---|---|
| **Forward waist pulls**, Robert et al. 2018 (J Biomech 75:89–95; n = 22; "try not to step") | Force for 50 % stepping: **F50 (%BW) = 2434 / t_p(ms) + 7.69** (formula as reproduced by Liu et al. 2024; not checked against the full text) | Impulse at F50 = 7.26 × (2.434 + 0.00769·t_p) N·s: **17.7 N·s** as t_p → 0 (Δv 0.24 m/s); 23 N·s at 100 ms; 29 N·s at 200 ms | [M abstract; formula secondary] |
| Forward waist pulls, Mille et al. 2003 (J Neurophysiol 90:666–674) | Young adults: limits of 107 % BoS (slow pulls) and 72 % BoS (fast pulls, >121 % BoS/s). BoS not defined in the abstract | ≈0.15 m pelvis pull at ≥0.25 m/s if BoS = ankle-to-toe distance | [M, abstract] |
| **Hand pushes, feet in place**, Rietdyk et al. 1999 (numbers from the author's PhD thesis; 10 men, 86 kg; ≈110–122 N for ≈350 ms) | **ML** 18.4–22.8 N·s mean (13.1–31.4); COM excursion ≈6 cm; **3/10 stepped** at the larger pushes; hip load/unload ≈85 % of recovery. **AP** 19.4–19.7 N·s (13.3–28.2), with a trunk (compound-pendulum) response | Same Δv at 74 kg: ≈16–20 N·s mean, 24–27 N·s maximum | [M, abstract + thesis] |
| Small anterior pushes, Paterna et al. 2022 (Eur J Appl Physiol 122:425–435); Dvir et al. 2020 | 2–10 N·s at mid-scapula, all feet-in-place. CoP excursion tracks impulse (r ≈ 0.96) | Δv ≤ 0.03–0.14 m/s | [M, abstract] |
| Lean-and-release, ankle only, Robinovitch et al. 2002 (J Neurophysiol 88:613–620; n = 23) | Recoverable lean **5.9 ± 1.1° after sudden release** (14.9° static). Torque latency 99 ms; rate of rise 372 N·m/s | XcoM excess ≈ 3.32 × (0.0915 − 0.049) ≈ **0.14 m/s (≈10 N·s)** | [M abstract; E] |
| Platform translations, Hwang et al. 2009 (Ann Biomed Eng 37:1629–1637; n = 13); Runge 1999; Park, Horak & Kuo 2004 (Exp Brain Res 154:417–427) | **0.1 m/s ankle strategy; 0.2 m/s mixed ankle + hip.** Hip torque is added continuously with magnitude; pure hip strategy never seen | ≈7 / 15 N·s equivalent | [M, abstract] |
| Welch & Ting 2009 (J Neurophysiol 101:3294–3309) | 12 cm at 25–40 cm/s, 0.1–0.6 g: feet-in-place possible in all conditions | Feet-in-place lower bound ≈0.4 m/s for short ramps | [M, full text (methods)] |
| Treadmill belt pulses, Crenshaw & Kaufman 2014 (Gait Posture 39:810–815; 15 adults aged 22–44) | Single-step thresholds: forward fall 4.1, backward fall 3.5, lateral (feet together) 3.4–3.5 m/s² (400 ms pulses) | Direction ratio backward/forward ≈0.86 | [M, full text via summary tool] |
| Waist pulls in older adults, Sturnieks et al. 2013 (PLoS One 8:e70981; n = 242) | Stepping force thresholds: anterior 50.3, posterior 45.6, lateral 70.5 N | Direction ratios only: lateral ≈1.4 × AP; posterior ≈0.9 × anterior | [M, full text] |
| Single-step limits from lean-release | 30.7–32.5° forward (Thelen 1997, Wojcik 1999; ABI-1 §8). Forward 30.9°, sideways 21–23°, backward 16.4° (Telonio 2005, conference abstract, n = 6). Forward limits 22–23 % larger than sideways or backward (Carbonneau & Smeesters 2014, Gait Posture 39:365–371) | Linear-pendulum equivalent: forward ≈1.5 m/s, sideways ≈1.1 m/s, backward ≈0.8–1.2 m/s (rough; anticipated) | [M; E] |

Further sources:

- Young adults often step before it is mechanically necessary (McIlroy & Maki 1993; Maki & McIlroy 1997; ABI-1 §8). The thresholds above assume a "try not to step" instruction.
- Falls are most likely when the feet are translated forward, i.e. a backward fall (Hsiao & Robinovitch 1998).

### 5.3 Direction asymmetry

- **Feet-in-place.** Geometry predicts backward ≈0.58 × forward (heel margin 0.095 m versus toe margin 0.165 m). Measured stepping thresholds are less lopsided: backward 0.86 × forward (Crenshaw & Kaufman 2014, young adults) and 0.91 × forward (Sturnieks 2013, older adults). Hip, trunk and arm actions recover much of the small heel-side margin.
- **Lateral.** With hip-width stance, lateral tolerance is the largest: ≈1.4 × AP by force (Sturnieks 2013), and feet-in-place up to ≈0.3–0.37 m/s (Rietdyk 1999). With feet together it falls to about the backward level (Crenshaw & Kaufman 2014). In ML the response is dominated by hip load/unload from the start (Rietdyk 1999: ≈85 %), so an ankle-only band hardly exists.
- **Single-step capacity:** forward > sideways > backward.

---

## 6. Eccentric capability for an unexpected stretch of submaximally active muscle (Q5)

Already covered in PPR-1:

- SRS mechanism and limit, and the fibre-level plateau of 1.5–2 × after the limit (§2.1–2.4);
- Westing 1990 superimposed stimulation (+21–24 % over voluntary eccentric) and the Duchateau & Enoka 2016 review (§5.2);
- the joint-level slope of 4.3 N·m/rad per N·m (Blanpied & Smidt 1992, §3.1).

New material follows.

### 6.1 Two meanings of "submaximal", and only one matches posture

- **Recruitment-limited activation.** Electrically stimulated "submaximal" human studies switch on a subset of fibres at ≥30–80 Hz. Each active fibre is nearly fully activated.
- **Rate-limited activation (posture).** In quiet standing, soleus motor units fire at ≈**6.9 ± 1.3 Hz** (Dakin et al. 2016, J Neurophysiol 115:1289–1297; full text via subagent) [M]. Medial gastrocnemius units fire at 8–10 pulses/s (Vieira 2012) [M]. These rates sit inside the range where cat soleus **yields** (Joyce, Rack & Westbury 1969: 5–15 pulses/s).
- Human stimulation studies therefore probe a different regime from posture. **No human study was found that stretches muscle at a fixed low stimulation rate with reflexes excluded.** All low-rate evidence is from animals.

### 6.2 Humans with electrically controlled activation

| Study | Preparation | Eccentric / isometric | Label |
|---|---|---|---|
| Dudley et al. 1990 (J Appl Physiol 69:2215–2221) | Knee extensors, tetanic stimulation at 45–60 % of voluntary isometric torque | **≈1.4 ×** at ≥1.57 rad/s, with no further rise; voluntary eccentric did not exceed isometric | [M, abstract] |
| Westing et al. 1990; Seger & Thorstensson 2000 (Acta Physiol Scand 169:63–69) | Knee extensors, 50 Hz / three submaximal levels | Stimulated eccentric exceeded isometric; voluntary did not. Implied ratio ≈1.1–1.25 [E, abstract-based] | [M, abstract] |
| Webber & Kriellaars 1997 (J Appl Physiol 83:40–45; n = 30) | Knee extensors, 12° step at 100°/s, pre-activation 1.7–95 % MVC | Peak eccentric (% MVC) = **1.44 × pre-stretch level + 7.08**, r = 0.99. The active increment is ≈1.44 × at every level. The intercept (passive, possibly some reflex) inflates total ratios at low activation | [M, abstract] |
| de Ruiter et al. 2000 (J Physiol 526:671–681) | Adductor pollicis, 36 °C, 80 Hz | 1.15–1.37 × rising with speed. At 30 Hz the cross-bridge component fell in proportion to isometric force and the non-cross-bridge component was "relatively unaffected", so the ratio did not fall | [M, full text via subagent] |
| Lee & Herzog 2002 (J Physiol 545:321–330); Cook & McDonagh 1995 (Exp Physiol 80:477–490) | Adductor pollicis; first dorsal interosseous | Peak 1.38–1.49 ×; up to 1.8 × peak and ≈1.3 × after the stretch | [M] |
| Pinniger et al. 2000 (Eur J Appl Physiol 81:375–383); 2003 (Eur J Appl Physiol 90:191–198) | Soleus | Stimulated to 30 % MVC: above isometric (size not verified). Voluntary, EMG-matched (with peroneal block in 2003): **≈1.0 ×** | [M, abstract] |
| Pinniger & Cresswell 2007 (J Appl Physiol 102:18–25); Oskouei & Herzog 2005 (J Appl Physiol 98:2087–2095) | ≈25–30 % activation | Residual force enhancement after stretch only +7–13 %, absent in about half of subjects at 30 % voluntary effort; grows with activation | [M, abstract] |
| Reviews: Duchateau & Enoka 2008 (J Physiol 586:5853–5864), 2016; Hahn 2018 (J Sport Health Sci 7:275–281); Babault et al. 2001 | — | Isolated muscle 1.5–1.8 × (up to 2.4 ×); maximal voluntary in vivo 1.0–1.4 ×, limited by reduced eccentric voluntary activation (88 % versus 95 % isometric) | [R/M] |

### 6.3 Animal muscle at fixed low activation: yield

- **Joyce, Rack & Westbury 1969.** At high stimulation rates, tension during lengthening "always rose above" isometric. At **5–15 pulses/s it rose at first and then fell, "often less than the isometric tension"**. Vibration over 0.1 mm cut tension "far below" isometric [M, abstract; PPR-1 §2.1].
- **Nichols & Houk 1976** (J Neurophysiol 39:119–142). Without reflexes, soleus stiffness "becomes negative transiently during stretch"; the stretch reflex compensates within ≈22 ms [M, abstract].
- **Lin & Rymer 1993** (J Neurophysiol 70:997–1008). Areflexive cat soleus has high stiffness over the first **400–900 µm**, then yields, then plateaus. A 10-fold increase in velocity raised the plateau less than 2-fold. Stiffness recovered within 30–40 ms [M, abstract].
- **Malamud, Godt & Nichols 1996** (J Neurophysiol 76:2280–2289). Skinned cat fibres: beyond ≈1 % length at 0.5 L/s most fibres yielded. **Slow (type I) fibres yielded so strongly that force fell** at all velocities from 0.01 to 2 L/s. Fast fibres generally did not yield below 2 L/s [M, abstract].
- **Huyghues-Despointes, Cope & Nichols 2003** (J Neurophysiol 90:1537–1546). The stretch reflex "substantially decreased" soleus yielding over the full force range; gastrocnemius yielding was reduced only at low to intermediate forces [M, abstract; magnitudes not obtained].
- **Brown, Cheng & Loeb 1999** (J Muscle Res Cell Motil 20:627–643). Fast cat caudofemoralis: lower stimulation frequency flattened the force–velocity slope around isometric, with no yield up to 2 L/s [M, abstract].
- **Perreault, Heckman & Sandercock 2003** (J Biomech 36:211–218). Hill-model errors exceeded 50 % for naturally activated muscle at 10–20 Hz over locomotor-sized movements [M, abstract].
- **Campbell & Moss 2002** (PPR-1 §2.4). In skinned rat soleus, "the relative height of the tension plateau … increased with the level of Ca²⁺ activation" [M, abstract]. **The sustained eccentric ratio is lower at low activation.**
- **Campbell & Moss 2000** (PPR-1 §2.2). Initial stiffness scales with tension, so **the short-range peak ratio is roughly activation-independent** [M].

### 6.4 Human joint-level evidence within the pre-reflex window

- Blanpied & Smidt 1992 and Sinkjaer et al. 1988 (PPR-1 §3.1): intrinsic incremental torque ≈6–8 % of pre-stretch torque per degree over the first ≈60 ms. That gives ≈1.2 × at 3° and ≈1.3–1.4 × at 5° [E].
- Whole-muscle SRS (Cui 2008, PPR-1 §2.2): 1.23 × at 1 % fibre strain [E].

### 6.5 Synthesis: defensible eccentric/isometric ratios at the current activation

| Phase | Postural activation (5–15 % MVC), slow-dominant muscle (soleus) | Postural activation, mixed/fast muscle (vasti, hamstrings, glutei, hip flexors, arm muscles) | High activation (≥30–50 % MVC) |
|---|---|---|---|
| **(a) Short range, first ≈10–50 ms, ≲1° of joint rotation** | Peak ≈1.1–1.5 ×, growing with rotation at ≈6–8 % of pre-stretch torque per degree; roughly activation-independent [M/E] | Same | Same per degree; in vitro up to ≈2 × at the limit (PPR-1 §2.2) |
| **(b) Sustained, several degrees, 50–300 ms** | **≈0.85–1.2 ×**. Yield toward or below isometric is plausible: Joyce 1969 at 5–15 pulses/s; Malamud 1996 slow fibres; Campbell & Moss 2002; EMG-matched soleus ≈1.0 (Pinniger 2003) [M animal; E for humans] | **≈1.1–1.4 ×** (Dudley 1.4; de Ruiter 1.15–1.37; Webber active slope 1.44; Brown 1999 flatter at low rates) [M/E] | Intrinsic 1.4–1.8 × (stimulated humans 1.37–1.49; in vitro 1.5–1.9); maximal voluntary 1.0–1.4 × (neurally limited) [M/R] |

**Verdict on 1.20–1.35 ×.** It is **adequate**:

- **Slightly generous** for the sustained phase in slow, rate-coded postural muscle (the plantarflexors), where the intrinsic value is ≈1.0–1.15 and may yield below 1.
- **About right** for mixed muscle at low activation.
- **Conservative** only against stimulated or in-vitro maxima at high activation.

The plateau is not why the body falls:

- Even a generous 1.35 × on ≈34 N·m of tonic plantarflexor torque absorbs only ≈0.6–1.1° of extra lean (§8 item 2).
- Real humans do not hold large perturbations intrinsically either.
- From ≈50 ms (reflexes) and ≈120–175 ms (postural loop), neural torque supplies the rest (ABI-1 §12; §4 here).

**Recommendation [D].**

- Keep 1.20–1.35 × as the baseline plateau for all muscles.
- Add a sensitivity arm for slow-dominant postural muscle (soleus-like ankle plantarflexors): ≈1.0–1.1 ×, with yield allowed after the SRS limit.
- Add a sensitivity arm for mixed muscles at high (running-level) activation: 1.4–1.5 ×.
- Model the short-range peak separately (PPR-1 §2): +6–8 % of pre-stretch torque per degree up to ≈1°.

---

## 7. Damping and energy in standing (Q6)

### 7.1 Values

| Quantity | Value | Context | Label |
|---|---|---|---|
| Intrinsic ankle viscosity, small-signal | 0.7–1.8 N·m·s/rad (walking stance); 1.1 (supine model nominal) | PPR-1 §5.1 | [R] |
| Intrinsic ankle viscosity in stance (closed-loop identification) | 2.2 ± 11.4 / 0.0 ± 19.5 N·m·s/rad, i.e. not distinguishable from zero | Kiemel 2008 | [M/model] |
| Intrinsic hip viscosity in stance | **27.4 ± 10.0 / 18.0 ± 11.6 N·m·s/rad** | Kiemel 2008 | [M/model] |
| Passive ankle damping in an intermittent-control model | 4 N·m·s/rad | Asai 2009 | [R model] |
| "Intrinsic" ankle damping in an independent-channel model | 68.8 N·m·s/rad (K 40.5) | Pasma 2017 (ABI-1 §1.1). Model-dependent, absorbs other dynamics | [R model] |
| Active (neural) derivative gain | **344 N·m·s/rad** (Peterka & Loughlin 2004); 313.5 (Pasma 2017); ≈0.46 s × mgh → ≈300 N·m·s/rad for this body [E] | Closed-loop fits | [R model] |
| Viscosity amplitude/velocity dependence | Larger for 0.9° than for 0.2° perturbations, 20 versus 5°/s peak velocity: non-Newtonian, rising with stretch velocity | Sakanaka 2021 (full text; values not tabulated) | [M] |
| Force–velocity "damping" of active muscle | ≈10 (shortening side) to 20–60 N·m·s/rad (lengthening) per leg for triceps surae in stance; saturating | PPR-1 §5.2 | [E] |
| Tendon hysteresis | 17–35 % per loading cycle (Achilles, hopping) | PPR-1 §6 (Lichtwark & Wilson 2005) | [M] |
| Knee ζ, relaxed to 50 % MVC | ≈0.2; ζ almost invariant with activation at the ankle | PPR-1 §5.1 | [M] |

### 7.2 What damping can and cannot do in standing [E]

- For a sub-critical pendulum, the growth rate is λ = [−B + √(B² + 4J(mgh − K))] / 2J. With J = 70 kg·m²:

| | K = 0.5 mgh | K = 0.9 mgh |
|---|---|---|
| B = 0 → 4 N·m·s/rad | τ_u = 1/λ: 0.47 → 0.47 s | 1.04 → 1.07 s |
| B = 40 | 0.53 s | 1.40 s |
| B = 70 | 0.59 s | 1.71 s |

  **Intrinsic damping slows a fall but never stops it.**
- **Active damping dominates in normal standing.** It is roughly 100 × the small-signal intrinsic viscosity. Peterka 2002 found subjects increased effective damping mainly by **shortening the apparent time delay**, not by raising K_D [M, abstract].
- **Energy.** No study quantifying sway-energy dissipation per cycle was found (gap). The closest measures are tendon hysteresis (17–35 %) and the identified viscosities above.
- **For the substrate [D].** Use small-signal intrinsic damping of the order of ≈2–5 N·m·s/rad at the ankle and ≈20 at the hip, plus the force–velocity behaviour of active muscle (PPR-1 §5.2), plus passive hysteresis. Do not add a large joint damper to make standing work: the human source of large damping is the delayed neural derivative term.

---

## 8. Implications for the failed first attempt [E/D]

1. **Missing mid-range passive stiffness.** The ankle loses ≈80–95 N·m/rad (12–15 % mgh) of passive stiffness. Loram 2007a shows passive calf torque alone can hold the COM at a ≈1.6° lean. The hip loses ≈50 N·m/rad and ≈17 N·m of flexor pre-tension at 0°. The knee loses its steep capsular stop near extension. Adding the measured passive curves is justified and cheap. **It will not by itself make the body stand** (§3).
2. **Ceiling at the ankle with frozen activation.**
   - With ≈34 N·m tonic plantarflexor torque and a 1.2–1.35 × plateau after ≈1° of SRS, the extra resisting torque is ≈7–12 N·m. Gravity supplies that increment after only 7–12 / 647 rad ≈ **0.6–1.1°** of extra lean.
   - Passive calf stiffness (≈90 N·m/rad) adds ≈1.6 N·m per degree.
   - So the frozen-tone body has no ankle torque reserve beyond ≈1–2° of extra lean. In humans the delayed loop supplies the reserve.
3. **Which joint gave way.** A 0.85 s collapse is faster than a stiff-legged topple even with zero ankle stiffness (≥1.0–1.6 s from realistic initial states). The likely failure is a hip/trunk or knee chain with near-zero mid-range stiffness and torque saturation (τ_u ≈ 0.21 s for the upper body). Check which joint leaves its range first.
4. **Joint-space pose tone.** A stiff joint-space law is not how humans stand. Humans use delayed task-level (CoM/orientation) feedback with gains ≈1.3 mgh and ≈0.45 s × mgh at the ankle-equivalent level (§4). A joint-space law must exceed the gravitational stiffness at each inverted joint (ankle > 647, hip > 150–170, neck > 7–12 N·m/rad) without saturating, or it falls on the time scales of §3.4.
5. **Recommended substrate structure [D].**
   - (i) Measured passive moment–angle curves (no dead zone at ankle, hip, knee).
   - (ii) Activation-scaled SRS → plateau or yield (§6; PPR-1 §2).
   - (iii) Tonic activation that statically balances the pose.
   - (iv) A continuous delayed (≥150 ms torque-level), low-bandwidth postural loop that runs before the disturbance. Its reaction to a disturbance therefore starts only after its delay.
   - Components (i)–(iii) set the response during the first ≈150 ms. Component (iv) keeps the unperturbed body standing.

---

## 9. Answers, parameters, perturbations, gaps

### 9(a) Answers to the six questions

1. **Passive mid-range stiffness.** Yes, it is non-negligible and continuous across ±5–10° at the ankle (≈40–46 N·m/rad per leg long-range; 12–15 % mgh both legs; up to ≈67 % mgh for <0.2° motions), hip (≈25 N·m/rad per hip at 0°, 44 at 10° extension) and knee (≈90 per knee at 0°, 26 at 10° flexion). It is low in the lumbar neutral zone (≈10), neck (1–2), shoulder (≈7) and elbow (0.4–2). Load is carried by tendon/aponeurosis/foot and relaxed calf muscle at the ankle; anterior capsule, iliofemoral ligament and hip flexors at the hip; posterior capsule and biarticular muscles at the knee; continuously active muscle in the trunk and neck. Passive stiffness alone is sub-critical at every inverted joint.
2. **Quiet standing without feedback.** It cannot be sustained by passive mechanics plus fixed pre-activation. Intrinsic ankle stiffness is 45–91 % of mgh and intrinsic hip stiffness 0.6–0.9 of upper-body load. Continuous delayed neural feedback is required (Loram & Lakie 2002; Loram 2004/2005; Casadio 2005; Kiemel 2008; Fitzpatrick 1992/1996). With frozen tone, a stiff-legged body leaves its stable sway range in ≈1.5–2.6 s and hits the ground in ≈3–4 s [E]. A trunk without active support folds in ≈0.8 s [E]. The knee is near-passively stable only at its extension stop with the COG ≈3 cm in front of it; the hip and trunk are not passively stable. No timed human loss-of-tone falls were found.
3. **Ongoing control.** Effective torque-level loop delay ≈150–200 ms (Peterka τd = 0.175 s; ≈100 ms to EMG plus activation). Gains ≈1.3 mgh and ≈0.46 s × mgh. Sway power mostly <1–2 Hz (primary 0.3–0.45 Hz). Ballistic corrections ≈2–2.6 per second (interval ≈0.4–0.5 s). Proprioception dominates on a firm surface, with vestibular and visual input reweighted. The same delayed CoM-feedback loop explains quiet sway, continuous perturbations and discrete postural responses. All delayed-feedback models (Peterka IC, Welch & Ting, Pasma, Masani, Asai) are continuous before a perturbation and respond only after their delay.
4. **Perturbation magnitudes.** See 9(c). Forward tolerance > backward (measured ≈0.86–0.91 ×; geometry 0.58 ×). Lateral with hip-width stance is the most tolerant (≈1.4 × AP); lateral with feet together ≈ backward.
5. **Eccentric ratio.** For an unexpected stretch at fixed postural activation (5–15 % MVC): the short-range peak is ≈1.1–1.5 ×, growing ≈6–8 % of pre-stretch torque per degree up to ≈1°. The sustained plateau is ≈0.85–1.2 × for slow, rate-coded muscle (yield plausible; animal evidence) and ≈1.1–1.4 × for mixed muscle. High activation gives 1.4–1.8 × intrinsically and 1.0–1.4 × voluntarily. **1.20–1.35 × is adequate**: slightly generous for the plantarflexors, about right elsewhere, conservative only at high activation.
6. **Damping.** Small-signal intrinsic ankle viscosity ≈1–4 N·m·s/rad (closed-loop estimate indistinguishable from 0); intrinsic hip viscosity ≈18–27 N·m·s/rad. Active derivative gain ≈300–350 N·m·s/rad (≈0.46 s × mgh). Intrinsic viscosity rises with stretch velocity. Intrinsic damping only slows the fall (τ_u +15–65 % for B = 40–70 N·m·s/rad).

### 9(b) Parameter table per joint

Per joint, one side, unless stated. "Long-range" means ≥1° excursions; "short-range" means <0.2–0.5°.

| Joint | Passive mid-range stiffness (amplitude) | Intrinsic active stiffness in stance (for reference) | Recommended eccentric ratio, F_ecc/F_iso at the current activation | Damping |
|---|---|---|---|---|
| **Ankle** (sagittal) | **40–46 N·m/rad** long-range (7°), 12–15 % mgh both legs [M: Loram 2007a; E: Riener]. Short-range (0.15–0.4°) 172–206 N·m/rad [M]. Chord ∝ rotation^−0.33 from 101 % (0.03°) to 19 % mgh (7°) both legs [M]. Exponential rise into dorsiflexion: ≈60 at 5° DF, ≈92 at 10° DF; ≈26 at 5° PF [E] | Both legs: 0.91 → 0.44 mgh from <0.2° to ≈5° (ABI-1 §1.1; PPR-1 §3.2); 45–56 % mgh closed-loop (Kiemel 2008) | Plantarflexors (soleus-dominant) at postural activation: short-range peak +6–8 %/° up to ≈1°; **sustained 1.0–1.2 ×** (yield to ≈0.85 plausible) [E from M animal]. Dorsiflexors, gastrocnemius: 1.1–1.4 ×. High activation 1.4–1.8 × [M] | Small-signal 1–4 N·m·s/rad [M/R]; force–velocity 10–60 per leg for active triceps surae (saturating) [E, PPR-1]; hysteresis 17–35 % [M] |
| **Knee** (sagittal) | **91 at 0°**, 70 at 2°, **48 at 5°**, **26 at 10°**, 16 at 15° flexion; 182 at 5° hyperextension [E: Riener]. Asymmetric: steep toward extension | Gap. Seated quasi-stiffness 335–370 N·m/rad upper bound; ζ ≈ 0.2 (PPR-1 §4.2) | Vasti and hamstrings (mixed): **1.1–1.4 ×** at low activation (Dudley 1.4; Webber active slope 1.44) [M/E]; 1.4–1.8 × at high activation [M] | ζ ≈ 0.2 [M]; swing 0.02–0.14 N·m·s/rad [M] (PPR-1) |
| **Hip** (flexion/extension) | **25 at 0°**, 33 at 5° extension, **44 at 10° extension**, 21 at 5° flexion; passive flexor moment ≈9 N·m at 0° [E: Riener; Silder ≈27] | 95–147 N·m/rad in stance (Kiemel 2008; probably both hips lumped in a 2-D model) [M/model] | Glutei, hamstrings, iliopsoas (mixed): **1.1–1.4 ×** [E by analogy] | **18–27 N·m·s/rad** in stance (Kiemel 2008) [M/model]; swing 1.9–4.6 (PPR-1) |
| **Hip** (ab/adduction) | Gap (not found) | Gap | 1.1–1.4 × [E by analogy; no direct data] | Gap |
| **Lumbar / trunk** | Neutral zone ≈10–11; flexion quartiles 19/37/73/135; lateral bend 18/48/116/288; axial rotation 12/19/41/76 N·m/rad [R: Watt 2022, PPR-1]. Standing quartile 1: 53 (partly active) [M: Shojaei 2016] | ≈109 N·m/rad without reflexes (Brown & McGill 2009, PPR-1 §4.4) | Erector spinae at postural activation: 1.0–1.3 × [E; no direct data; a continuously active slow-dominant muscle may behave like soleus] | ≈0–14 N·m·s/rad (Brown & McGill 2009) |
| **Neck** | **1.1 (extension) – 2.1 (flexion)**, lateral ≈2.4 N·m/rad near neutral; ≈3.7–4.0 toward end range [M: Liu 2024] | Gap | 1.0–1.3 × [E; no direct data] | Gap |
| **Shoulder** | ≈6.6 N·m/rad (relaxed intercept, horizontal plane; PPR-1). Gravity adds ≈+11 N·m/rad (stabilising) for a hanging arm [E] | 6.6 + 3.0·τ_s + 1.1·τ_e (PPR-1) | 1.1–1.4 × [E by analogy; adductor pollicis and FDI 1.3–1.5 × stimulated, Lee & Herzog 2002, Cook & McDonagh 1995] | Gap |
| **Elbow** | **0.4–1.8 N·m/rad** (Wiegner & Watts 1986) to ≈10 (Franklin & Milner intercept); gravity ≈+2.8 N·m/rad for a hanging forearm [E] | 10.2 + 3.1·τ_e + 1.1·τ_s (PPR-1) | 1.1–1.4 × [E by analogy] | Gap |
| **Thoracic** | Gap (no separate data; treat as stiffer than lumbar because of the rib cage [D]) | Gap | As lumbar [E] | Gap |

### 9(c) Recommended perturbation magnitudes for standing tests [E/D, from §5]

Assumptions: 74 kg body, hip-width stance, brief pulse **≈100–150 ms** applied at pelvis height (near the COM) [D]. Impulses are net applied impulse. Healthy young adult reference: feet-in-place unless stated.

| Level | Forward (COM pushed toward toes) | Backward (toward heels) | Lateral (hip-width stance) | Expected human response | Main sources |
|---|---|---|---|---|---|
| **Small** | **5–8 N·s** (Δv ≈ 0.07–0.11 m/s) | **4–6 N·s** (0.05–0.08 m/s) | **6–10 N·s** (0.08–0.14 m/s) | Ankle-dominant sway (ML: hip load/unload), COM excursion ≲2–4 cm, no step | Paterna 2022; Dvir 2020; Hwang 2009 (0.1 m/s); Robinovitch 2002 (≈0.14 m/s); XcoM with delay |
| **Moderate** | **12–16 N·s** (0.16–0.22 m/s) | **8–12 N·s** (0.11–0.16 m/s) | **15–20 N·s** (0.20–0.27 m/s) | Large sway with hip/trunk involvement, CoP near the foot edge, mostly feet-in-place | Hwang 2009 (0.2 m/s mixed strategy); Rietdyk 1999 (ML 16–20 N·s at 74 kg, all feet-in-place for most subjects) |
| **Large** | **≥23–26 N·s** (≥0.31–0.35 m/s; Robert 2018 F50 for 100–150 ms pulses) | **≥16–20 N·s** (≥0.22–0.27 m/s) | **≥25–30 N·s** (≥0.34–0.40 m/s) | Stepping in ≥50 % of young adults told not to step; a single step can recover up to ≈1.5 m/s forward, ≈0.8–1.2 backward, ≈1.1 lateral | Robert 2018 (F50 impulse 17.7–23 N·s for brief forward pulls); Rietdyk 1999 (3/10 stepped at ≤27 N·s equivalent); Crenshaw & Kaufman 2014 and Sturnieks 2013 (direction ratios); single-step lean limits |

**Notes.**

- Backward values are the forward values × ≈0.7. That is between the geometric 0.58 and the measured 0.86–0.91.
- With feet together, use the backward values for lateral.
- Push from behind = forward; push from the front = backward.
- Pushes at shoulder height add trunk rotation (Rietdyk 1999).

### 9(d) Data gaps

1. **Passive hip ab/adduction, thoracic and shoulder near-neutral stiffness.** No usable human data found.
2. **Riener & Edrich coefficients.** All were taken from secondary reproductions. Hip-equation bracket placement and the ankle second term and constant are not verified, and angle conventions were inferred.
3. **Standing-specific passive hip and knee stiffness.** Only supine and side-lying passive curves exist. No cadaver sagittal torque–angle data for the hip capsule near 0° were found.
4. **Quiet-stance joint angles and muscle activity at the knee, hip and trunk.** Knee flexion in stance is "flexed" (Danis 1998) or near extension; no reliable mean angle was found. Verified % MVC for quadriceps, hamstrings, glutei and erector spinae in quiet stance is missing (also PPR-1 §8.1). Woodhull-McNeal gives only µV.
5. **Timed human falls with sudden loss of tone** (syncope, cataplexy, atonic seizures): none found. The fall-time estimates in §3.4 are model extrapolations.
6. **Multi-joint postural-loop gains** (knee, hip, trunk, neck) for a delayed task-level controller. Only ankle-level single-pendulum fits (Peterka, Pasma) and an ankle/hip EMG-level identification (Kiemel 2011) exist.
7. **Peterka 2002 table values.** The original full text was not accessible. τd = 0.175 s and the gains come from Peterka & Loughlin 2004, which states they were derived from Peterka 2002.
8. **Perturbation thresholds.** Most come from abstracts. The Robert 2018 formula is secondary. Telonio 2005 is a conference abstract. Mille 2003 does not define BoS in its abstract. No young-adult lateral waist-pull magnitudes were found in abstracts. Young-adult direction ratios rest on one treadmill study.
9. **Sway-energy dissipation.** No direct measurement was found. Intrinsic ankle damping in stance is poorly identified (Kiemel SD ≫ mean).
10. **Eccentric behaviour at postural activation in humans.** No human study stretches muscle at a fixed low stimulation *rate* with reflexes excluded. Yield evidence is from cat soleus and skinned fibres. Joyce 1969, Huyghues-Despointes 2003 and Cook & McDonagh 1995 magnitudes, and any stimulation-frequency effect, were not obtained. The Westing and Seger ratios are inferred from abstracts.

### 9(e) References

Verified this session against Europe PMC/PubMed records unless stated. Sources already listed in ABI-1 §15 or PPR-1 §14 are cited there and not repeated, except where new values were extracted.

- Aramaki Y, Nozaki D, Masani K, Sato T, Nakazawa K, Yano H (2001). Reciprocal angular acceleration of the ankle and hip joints during quiet standing in humans. *Exp Brain Res* 136:463–473. doi:10.1007/s002210000603. PMID 11291727.
- Asai Y, Tasaka Y, Nomura K, Nomura T, Casadio M, Morasso P (2009). A model of postural control in quiet standing: robust compensation of delay-induced instability using intermittent activation of feedback control. *PLoS One* 4:e6169. doi:10.1371/journal.pone.0006169. PMC2704954. (Full text.)
- Bottaro A, Yasutake Y, Nomura T, Casadio M, Morasso P (2008). Bounded stability of the quiet standing posture: an intermittent control model. *Hum Mov Sci* 27:473–495. doi:10.1016/j.humov.2007.11.005. PMID 18342382.
- Carbonneau E, Smeesters C (2014). Effects of age and lean direction on the threshold of single-step balance recovery in younger, middle-aged and older adults. *Gait Posture* 39:365–371. doi:10.1016/j.gaitpost.2013.08.013. PMID 24035174. (Abstract; title as recorded by the subagent, not re-checked.)
- Casadio M, Morasso PG, Sanguineti V (2005). Direct measurement of ankle stiffness during quiet standing: implications for control modelling and clinical application. *Gait Posture* 21:410–424. doi:10.1016/j.gaitpost.2004.05.005. PMID 15886131.
- Cenciarini M, Peterka RJ (2006). Stimulus-dependent changes in the vestibular contribution to human postural control. *J Neurophysiol* 95:2733–2750. doi:10.1152/jn.00856.2004. PMID 16467429.
- Collins JJ, De Luca CJ (1993). Open-loop and closed-loop control of posture: a random-walk analysis of center-of-pressure trajectories. *Exp Brain Res* 95:308–318. doi:10.1007/BF00229788. PMID 8224055.
- Crenshaw JR, Kaufman KR (2014). The intra-rater reliability and agreement of compensatory stepping thresholds of healthy subjects. *Gait Posture* 39:810–815. PMID 24300837. PMC3910088. (Full text via subagent; title not re-checked.)
- Danis CG, Krebs DE, Gill-Body KM, Sahrmann S (1998). Relationship between standing posture and stability. *Phys Ther* 78:502–517. doi:10.1093/ptj/78.5.502. PMID 9597064.
- Di Giulio I, Baltzopoulos V, Maganaris CN, Loram ID (2013). Human standing: does the control strategy preprogram a rigid knee? *J Appl Physiol* 114:1717–1729. doi:10.1152/japplphysiol.01299.2012. PMID 23620493.
- Di Giulio I, Baltzopoulos V (2019). Attainment of quiet standing in humans: are the lower limb joints controlled relative to a misaligned postural reference? *Front Physiol* 10:625. doi:10.3389/fphys.2019.00625. PMC6593307. (Full text.)
- Dos Anjos FV, Pinto TP, Gazzoni M, Vieira TM (2017). The spatial distribution of ankle muscles activity discriminates aged from young subjects during standing. *Front Hum Neurosci* 11:190. doi:10.3389/fnhum.2017.00190. PMID 28469567.
- Dvir Z, et al. (2020). *Eur J Appl Physiol* 120:1319–1330. PMID 32297004. (Abstract via subagent; full author list and title not re-checked.)
- Edrich T, Riener R, Quintern J (2000). Analysis of passive elastic joint moments in paraplegics. *IEEE Trans Biomed Eng* 47:1058–1065. doi:10.1109/10.855933. PMID 10943054. (Abstract via subagent.)
- Fitzpatrick RC, Taylor JL, McCloskey DI (1992). Ankle stiffness of standing humans in response to imperceptible perturbation: reflex and task-dependent components. *J Physiol* 454:533–547. doi:10.1113/jphysiol.1992.sp019278. PMID 1474502.
- Fitzpatrick R, Rogers DK, McCloskey DI (1994). Stable human standing with lower-limb muscle afferents providing the only sensory input. *J Physiol* 480:395–403. doi:10.1113/jphysiol.1994.sp020369. PMID 7869254.
- Fitzpatrick R, Burke D, Gandevia SC (1996). Loop gain of reflexes controlling human standing measured with the use of postural and vestibular disturbances. *J Neurophysiol* 76:3994–4008. doi:10.1152/jn.1996.76.6.3994. PMID 8985895.
- Gage WH, Winter DA, Frank JS, Adkin AL (2004). Kinematic and kinetic validity of the inverted pendulum model in quiet standing. *Gait Posture* 19:124–132. doi:10.1016/S0966-6362(03)00037-7. PMID 15013500.
- Gatev P, Thomas S, Kepple T, Hallett M (1999). Feedforward ankle strategy of balance during quiet stance in adults. *J Physiol* 514:915–928. doi:10.1111/j.1469-7793.1999.915ad.x. PMID 9882761.
- Gawthrop P, Loram I, Lakie M, Gollee H (2011). Intermittent control: a computational theory of human control. *Biol Cybern* 104:31–51. doi:10.1007/s00422-010-0416-4. PMID 21327829.
- Hof AL, Curtze C (2016). A stricter condition for standing balance after unexpected perturbations. *J Biomech* 49:580–585. doi:10.1016/j.jbiomech.2016.01.021. PMID 26892898. (Abstract via subagent.)
- Hsiao ET, Robinovitch SN (1998). Common protective movements govern unexpected falls from standing height. *J Biomech* 31:1–9. doi:10.1016/S0021-9290(97)00114-0. PMID 9596532.
- Hwang S, Tae K, Sohn R, Kim J, Son J, Kim Y (2009). The balance recovery mechanisms against unexpected forward perturbation. *Ann Biomed Eng* 37:1629–1637. PMID 19472056. (Abstract via subagent; author list and title not re-checked.)
- Kiemel T, Elahi AJ, Jeka JJ (2008). Identification of the plant for upright stance in humans: multiple movement patterns from a single neural strategy. *J Neurophysiol* 100:3394–3406. doi:10.1152/jn.01272.2007. PMC2604857. (Values via summary tool.)
- Kiemel T, Zhang Y, Jeka JJ (2011). Identification of neural feedback for upright stance in humans: stabilization rather than sway minimization. *J Neurosci* 31:15144–15153. doi:10.1523/JNEUROSCI.1013-11.2011. PMC3470452.
- Kouzaki M, Shinohara M (2010). Steadiness in plantar flexor muscles and its relation to postural sway in young and elderly adults. *Muscle Nerve* 42:78–87. doi:10.1002/mus.21599. PMC4590785.
- Lakie M, Walsh EG, Wright GW (1984). Resonance at the wrist demonstrated by the use of a torque motor: an instrumental analysis of muscle tone in man. *J Physiol* 353:265–285. doi:10.1113/jphysiol.1984.sp015335. PMID 6481624. (Abstract via subagent.)
- Lempert T, Bauer M, Schmidt D (1994). Syncope: a videometric analysis of 56 episodes of transient cerebral hypoxia. *Ann Neurol* 36:233–237. doi:10.1002/ana.410360217. PMID 8053660.
- Liu M, et al. (2024). [In vivo passive neck stiffness, supine]. *Ann Biomed Eng* 52:2178–2192. doi:10.1007/s10439-024-03517-w. PMC11247060. (Full text via subagent; title not re-checked.)
- Liu Y, et al. (2024). *Front Bioeng Biotechnol* 12:1429605. PMID 39161355. (Secondary source for the Robert 2018 formula; via subagent.)
- Lockhart DB, Ting LH (2007). Optimal sensorimotor transformations for balance. *Nat Neurosci* 10:1329–1336. doi:10.1038/nn1986. PMID 17873869.
- Loram ID, Lakie M (2002a). Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. *J Physiol* 545:1041–1053. doi:10.1113/jphysiol.2002.025049. PMID 12482906.
- Loram ID, Lakie M (2002b). Human balancing of an inverted pendulum: position control by small, ballistic-like, throw and catch movements. *J Physiol* 540:1111–1124. doi:10.1113/jphysiol.2001.013077. PMID 11986396.
- Loram ID, Maganaris CN, Lakie M (2004). Paradoxical muscle movement in human standing. *J Physiol* 556:683–689. doi:10.1113/jphysiol.2004.062398. PMID 15047776.
- Loram ID, Maganaris CN, Lakie M (2005a). Human postural sway results from frequent, ballistic bias impulses by soleus and gastrocnemius. *J Physiol* 564:295–311. doi:10.1113/jphysiol.2004.076307. PMID 15661824.
- Loram ID, Maganaris CN, Lakie M (2005b). Active, non-spring-like muscle movements in human postural sway: how might paradoxical changes in muscle length be produced? *J Physiol* 564:281–293. doi:10.1113/jphysiol.2004.073437. PMID 15661825.
- Loram ID, Maganaris CN, Lakie M (2007a). The passive, human calf muscles in relation to standing: the non-linear decrease from short range to long range stiffness. *J Physiol* 584:661–675. doi:10.1113/jphysiol.2007.140046. PMID 17823209. (Abstract here; full-text values via subagent.)
- Loram ID, Gollee H, Lakie M, Gawthrop PJ (2011). Human control of an inverted pendulum: is continuous control necessary? Is intermittent control effective? Is intermittent control physiological? *J Physiol* 589:307–324. doi:10.1113/jphysiol.2010.194712. PMID 21098004.
- Masani K, Popovic MR, Nakazawa K, Kouzaki M, Nozaki D (2003). Importance of body sway velocity information in controlling ankle extensor activities during quiet stance. *J Neurophysiol* 90:3774–3782. doi:10.1152/jn.00730.2002. PMID 12944529.
- Masani K, Vette AH, Popovic MR (2006). Controlling balance during quiet standing: proportional and derivative controller generates preceding motor command to body sway position observed in experiments. *Gait Posture* 23:164–172. doi:10.1016/j.gaitpost.2005.01.006. PMID 16399512.
- Maurer C, Peterka RJ (2005). A new interpretation of spontaneous sway measures based on a simple model of human postural control. *J Neurophysiol* 93:189–200. doi:10.1152/jn.00221.2004. PMID 15331614.
- McGill SM, Jones K, Bennett G, Bishop PJ (1994). Passive stiffness of the human neck in flexion, extension, and lateral bending. *Clin Biomech* 9:193–198. doi:10.1016/0268-0033(94)90021-3. PMID 23916181. (Abstract via subagent.)
- Mille ML, Rogers MW, Martinez K, Hedman LD, Johnson ME, Lord SR, Fitzpatrick RC (2003). Thresholds for inducing protective stepping responses to external perturbations of human standing. *J Neurophysiol* 90:666–674. doi:10.1152/jn.00974.2002. PMID 12711707. (Abstract via subagent; author list not re-checked.)
- O'Rahilly R, Müller F, Carpenter S, Swenson R. *Basic Human Anatomy*, ch. 18. Dartmouth Medical School online edition. (Textbook; fetched by subagent.)
- Pai YC, Patton J (1997). Center of mass velocity-position predictions for balance control. *J Biomech* 30:347–354. (ABI-1 §15.)
- Park S, Horak FB, Kuo AD (2004). Postural feedback responses scale with biomechanical constraints in human standing. *Exp Brain Res* 154:417–427. PMID 14618285. (Abstract via subagent.)
- Pascoletti G, et al. (2019). *Front Bioeng Biotechnol* 7:419. doi:10.3389/fbioe.2019.00419. PMC6920173. (Secondary reproduction of the Riener & Edrich equations; via subagent.)
- Paterna M, et al. (2022). *Eur J Appl Physiol* 122:425–435. PMID 34797437. (Abstract via subagent.)
- Peterka RJ (2002). Sensorimotor integration in human postural control. *J Neurophysiol* 88:1097–1118. doi:10.1152/jn.2002.88.3.1097. PMID 12205132.
- Peterka RJ, Loughlin PJ (2004). Dynamic regulation of sensorimotor integration in human postural control. *J Neurophysiol* 91:410–423. doi:10.1152/jn.00516.2003. (Full text read.)
- Pizza F, Antelmi E, Vandi S, et al. (2018). The distinguishing motor features of cataplexy: a study from video-recorded attacks. *Sleep* 41:zsy026. doi:10.1093/sleep/zsy026. PMID 29425380.
- Rietdyk S, Patla AE, Winter DA, Ishac MG, Little CE (1999). Balance recovery from medio-lateral perturbations of the upper body during standing. *J Biomech* 32:1149–1158. (ABI-1 §15; impulse values from Rietdyk's 1999 University of Waterloo PhD thesis, via subagent.)
- Robert T, Vallée P, Tisserand R, Buloup F, Fitzpatrick RC, Mille ML, et al. (2018). [Forward waist-pull stepping thresholds as a function of force and duration]. *J Biomech* 75:89–95. doi:10.1016/j.jbiomech.2018.05.010. PMID 29793765. (Abstract via subagent; formula secondary.)
- Robinovitch SN, Heller B, Lui A, Cortez J (2002). Effect of strength and speed of torque development on balance recovery with the ankle strategy. *J Neurophysiol* 88:613–620. doi:10.1152/jn.2002.88.2.613. PMID 12163514. (Abstract via subagent.)
- Sakanaka TE, Lakie M, Reynolds RF (2016). Sway-dependent changes in standing ankle stiffness caused by muscle thixotropy. *J Physiol* 594:781–793. doi:10.1113/JP271137. PMID 26607292. (Abstract via subagent; title not re-checked.)
- Sakanaka TE, Lakie M, Reynolds RF (2021). Individual differences in intrinsic ankle stiffness and their relationship to body sway and ankle torque. *PLoS One* 16:e0244993. PMC7822306. (Full text for viscosity statements.)
- Shojaei I, Allen-Bryant K, Bazrgari B (2016). *Ann Biomed Eng* 44:2817–2826. doi:10.1007/s10439-016-1569-7. PMID 26883956. (Abstract and Watt 2022 table, via subagent.)
- Silder A, Whittington B, Heiderscheit B, Thelen DG (2007). Identification of passive elastic joint moment–angle relationships in the lower extremity. *J Biomech* 40:2628–2635. (PPR-1 §14; full text via subagent.)
- Soames RW, Atha J (1981). The role of the antigravity musculature during quiet standing in man. *Eur J Appl Physiol* 47:159–167. doi:10.1007/BF00421668. PMID 7197216. (Abstract via subagent; title not re-checked.)
- Soames RW, Atha J (1982). The spectral characteristics of postural sway behaviour. *Eur J Appl Physiol* 49:169–177. doi:10.1007/BF02334065. PMID 6981506.
- Sturnieks DL, Menant J, Delbaere K, Vanrenterghem J, Rogers MW, Fitzpatrick RC, Lord SR (2013). Force-controlled balance perturbations associated with falls in older people: a prospective cohort study. *PLoS One* 8:e70981. PMC3739780. (Full text via subagent; author list not re-checked.)
- Telonio A, Cyr MA, Moglo KE, Smeesters C (2005). ISB/ASB congress abstract (single-step thresholds by direction). Not peer-reviewed.
- van Arkel RJ, Amis AA, Cobb JP, Jeffers JRT (2015). The capsular ligaments provide more hip rotational restraint than the acetabular labrum and the ligamentum teres. *Bone Joint J* 97-B:484–491. PMC4491667. (Full text via subagent; title not re-checked.)
- van der Kooij H, de Vlugt E (2007). Postural responses evoked by platform perturbations are dominated by continuous feedback. *J Neurophysiol* 98:730–743. doi:10.1152/jn.00457.2006. PMID 17460106.
- Vette AH, Masani K, Nakazawa K, Popovic MR (2010). Neural-mechanical feedback control scheme generates physiological ankle torque fluctuation during quiet stance. *IEEE Trans Neural Syst Rehabil Eng* 18:86–95. doi:10.1109/TNSRE.2009.2037891. PMID 20071280.
- Vieira TMM, Loram ID, Muceli S, Merletti R, Farina D (2012). Recruitment of motor units in the medial gastrocnemius muscle during human quiet standing. *J Neurophysiol* 107:666–676. doi:10.1152/jn.00659.2011. PMID 21994258.
- Vrahas MS, Brand RA, Brown TD, Andrews JG (1990). Contribution of passive tissues to the intersegmental moments at the hip. *J Biomech* 23:357–362. PMID 2335535. (Abstract via subagent.)
- Welch TDJ, Ting LH (2009). Mechanisms of motor adaptation in reactive balance control. *J Neurophysiol* 101:3294–3309. PMC2694108. (Methods via subagent; title not re-checked.)
- Wiegner AW, Watts RL (1986). Elastic properties of muscles measured at the elbow in man: I. Normal controls. *J Neurol Neurosurg Psychiatry* 49:1171–1176. doi:10.1136/jnnp.49.10.1171. PMID 3783178. (Abstract via subagent.)
- Woodhull-McNeal AP (1986). Activity in torso muscles during relaxed standing. *Eur J Appl Physiol* 55:419–424. doi:10.1007/BF00422744. PMID 3758044.

**§6 references** (from the eccentric/yield search subagent; records checked by it against PubMed/PMC; "A" = abstract only, "F" = full text):

- Babault N, Pousson M, Ballay Y, Van Hoecke J (2001). *J Appl Physiol* 91:2628–2634. doi:10.1152/jappl.2001.91.6.2628. PMID 11717228. A.
- Brown IE, Cheng EJ, Loeb GE (1999). *J Muscle Res Cell Motil* 20:627–643. doi:10.1023/A:1005585030764. PMID 10672511. A.
- Cook CS, McDonagh MJN (1995). Force responses to controlled stretches of electrically stimulated human muscle-tendon complex. *Exp Physiol* 80:477–490. doi:10.1113/expphysiol.1995.sp003862. PMID 7640012. A.
- Dakin CJ, et al. (2016). *J Neurophysiol* 115:1289–1297. PMC4808084. F (soleus firing rate in standing; title not re-checked).
- de Ruiter CJ, Didden WJM, Jones DA, de Haan A (2000). *J Physiol* 526:671–681. doi:10.1111/j.1469-7793.2000.00671.x. PMID 10922017. F.
- Dudley GA, Harris RT, Duvoisin MR, Hather BM, Buchanan P (1990). Effect of voluntary vs. artificial activation on the relationship of muscle torque to speed. *J Appl Physiol* 69:2215–2221. doi:10.1152/jappl.1990.69.6.2215. PMID 2077019. A.
- Duchateau J, Enoka RM (2008). Neural control of shortening and lengthening contractions: influence of task constraints. *J Physiol* 586:5853–5864. PMC2655422. F.
- Hahn D (2018). Stretching the limits of maximal voluntary eccentric force production in vivo. *J Sport Health Sci* 7:275–281. doi:10.1016/j.jshs.2018.05.003. PMC6189274. F.
- Hu X, Murray WM, Perreault EJ (2011). *J Neurophysiol* 105:1633–1641. PMC3075303. F.
- Huyghues-Despointes CMJI, Cope TC, Nichols TR (2003). Intrinsic properties and reflex compensation in reinnervated triceps surae muscles of the cat: effect of activation level. *J Neurophysiol* 90:1537–1546. doi:10.1152/jn.00718.2002. PMID 12736242. A.
- Lee HD, Herzog W (2002). *J Physiol* 545:321–330. doi:10.1113/jphysiol.2002.018010. PMID 12433972. F.
- Lin DC, Rymer WZ (1993). Mechanical properties of cat soleus muscle elicited by sequential ramp stretches: implications for control of muscle. *J Neurophysiol* 70:997–1008. doi:10.1152/jn.1993.70.3.997. PMID 8229184. A.
- Malamud JG, Godt RE, Nichols TR (1996). Relationship between short-range stiffness and yielding in type-identified, chemically skinned muscle fibers from the cat triceps surae muscles. *J Neurophysiol* 76:2280–2289. doi:10.1152/jn.1996.76.4.2280. PMID 8899603. A.
- Nichols TR, Houk JC (1976). Improvement in linearity and regulation of stiffness that results from actions of stretch reflex. *J Neurophysiol* 39:119–142. doi:10.1152/jn.1976.39.1.119. PMID 1249597. A.
- Oskouei AE, Herzog W (2005). Observations on force enhancement in submaximal voluntary contractions of human adductor pollicis muscle. *J Appl Physiol* 98:2087–2095. doi:10.1152/japplphysiol.01217.2004. PMID 15705725. A.
- Perreault EJ, Heckman CJ, Sandercock TG (2003). Hill muscle model errors during movement are greatest within the physiologically relevant range of motor unit firing rates. *J Biomech* 36:211–218. doi:10.1016/S0021-9290(02)00332-9. PMID 12547358. A.
- Pinniger GJ, Steele JR, Thorstensson A, Cresswell AG (2000). Tension regulation during lengthening and shortening actions of the human soleus muscle. *Eur J Appl Physiol* 81:375–383. doi:10.1007/s004210050057. PMID 10751098. A.
- Pinniger GJ, Steele JR, Cresswell AG (2003). *Eur J Appl Physiol* 90:191–198. doi:10.1007/s00421-003-0893-4. PMID 14504953. A.
- Pinniger GJ, Cresswell AG (2007). Residual force enhancement after lengthening is present during submaximal plantar flexion and dorsiflexion actions in humans. *J Appl Physiol* 102:18–25. doi:10.1152/japplphysiol.00565.2006. PMID 16946022. A.
- Seger JY, Thorstensson A (2000). *Acta Physiol Scand* 169:63–69. doi:10.1046/j.1365-201x.2000.00694.x. PMID 10759612. A.
- Webber S, Kriellaars D (1997). Neuromuscular factors contributing to in vivo eccentric moment generation. *J Appl Physiol* 83:40–45. doi:10.1152/jappl.1997.83.1.40. PMID 9216942. A.
- Already in PPR-1 §14: Blanpied & Smidt 1992; Campbell & Moss 2000, 2002; Cui et al. 2008; Duchateau & Enoka 2016; Getz et al. 1998; Joyce, Rack & Westbury 1969; Rack & Westbury 1974; Sinkjaer et al. 1988; Westing, Seger & Thorstensson 1990.

**Cited from ABI-1 §15 or PPR-1 §14 without new extraction:** Brown & McGill 2009, 2010; Franklin & Milner 2003; Hof, Gazendam & Sinke 2005; Lakie & Campbell 2019; Lichtwark & Wilson 2005; Loram et al. 2007b; Maki & McIlroy 1997; McIlroy & Maki 1993; Morasso & Schieppati 1999; Morasso & Sanguineti 2002; Pai et al. 2000; Pasma et al. 2017; Riener & Edrich 1999; Runge et al. 1999; Sakanaka et al. 2018; Thelen et al. 1997; Vlutters et al. 2015; Watt et al. 2022; Welch & Ting 2008; Winter et al. 1998; Wojcik et al. 1999; Zhang et al. 1998.

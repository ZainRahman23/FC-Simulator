# PPR-2: the physiological standing body (design, before qualification)

The instruction is saved verbatim in `sources/2026-10-11_user_instruction_ppr2_physiological_standing_body.md` (commit f1f24783).

PPR-1 is preserved unchanged as a failed preregistered experiment (B FAILED 12 / 23, commit 06591e7d). Nothing here re-scores it.

**PVP-1A-DX is sealed.** `ppr2_run.mjs` refuses any scene other than SOLO unless the post-qualification replay unseals it. No PPR-2 parameter was chosen from, or looked at against, the tackle.

Labels: [M] measured (human), [E] derived from measured values, [D] design choice, [S] V2 specification, **calibration** = exploratory PPR-2 runs made before this design was frozen (disclosed in §9).

Literature:
- `ppr2/research/STANDING_SUBSTRATE_LITERATURE.md` (this phase);
- `ppr1/research/PRE_REFLEX_LITERATURE.md`, ABI-1 §1 (earlier phases; cited, not repeated).

---

## 1. Three findings kept separate

| | Finding | Kind | Where |
|---|---|---|---|
| **A** | Pre-contact activation must be a function of the pre-contact state only | control law (not body spec) | §2 |
| **A2** | The pre-contact tone must be the static load **of a body at rest** | control law (not body spec) | §3 |
| **B** | V2 has no mid-range passive elasticity at ankle, knee, hip, lumbar or neck | body spec | §5 |
| **C** | The short-range / eccentric reserve must be strain-based, not velocity-gated | actuator law, body-spec parameter unchanged | §6 |

## 2. A: excitation from the pre-contact state

**PPR-1's B** computed its excitation every step from the current capacity: u = |τ|/cap(θ, ω) + a_cc. That is a zero-latency path, since the capacity changes as soon as the body is struck. V2's own SnapshotTone has the same path through the window.

**The PPR-2 substrate** (`ppr2/scripts/ppr2_substrate.mjs`):
- computes, **once at entry**, u± = max(±τ_active, 0)/capIso±(θ_entry) + a_cc;
- holds the activation states at u± thereafter;
- has **no regulator of any kind** (`support: []`).

**Verified (calibration):** with a 10 kg impactor striking the runner, the substrate's activation trace is bit-identical, over 300 ms, to the unstruck run, while the struck knee moved 43°. PPR-1 B's activation changed by 0.0195 over the same window.

## 3. A2: rest statics (new in PPR-2)

**What SnapshotTone does.** Its bias is the PostureDriver feed-forward, frozen at entry. At each sole centroid the PostureDriver applies a force directed **through the COM**: F = (M g / 2)·[(c − cp)/h, 1, …]. That is a linear-inverted-pendulum force. Its forward components on the two feet do not cancel, so it describes a body accelerating forward, not a body at rest.

**What a body at rest needs instead** (`restStatics`):
- vertical loads split by the lever rule;
- both centres of pressure shifted so that the total COP lies under the COM (here 32.7 mm forward of the sole centroids);
- only the self-cancelling inward pair of the PostureDriver force kept (80 N per foot in this wide stance).

The torques are computed by the same subtree sums, the same per-axis projection and the same locked-axis rule. Measured at the PVP entry:

| axis (per side) | PostureDriver bias | rest statics | independent check (§ audit) |
|---|---|---|---|
| ankle dorsi/plantar flexion | −10.0 / −10.6 N·m | **−20.7 / −21.7** | 21.0 (COP under the COM) |
| knee flexion | −7.2 / −7.5 | **−1.0 / −1.3** | ≈ −1.8 |
| hip flexion | −8.1 | −8.9 / −9.2 | ≈ −7.5 |
| lumbar, thoracic, neck, arms | identical | identical | — |

**Consequence:** with the PostureDriver bias, every compliant body begins to fall from t = 0. PPR-1's B and PPR-2's first substrate drifted 10 mm in 0.25 s. CURRENT V2 hides the 11 N·m-per-ankle deficit in its 1.5 × load pose spring, at a ≈ 1.3° lean.

**A2 also doubles the plantar-flexor activation** (u⁻ 0.07 → 0.15 of capIso). PPR-1 calibrated θ_y (ankle 0.967°) against the halved activation, so with A2 alone the ankle is too stiff (§5.3).

## 4. The PVP entry is not a loaded equilibrium (`PPR2_CRITERIA_AUDIT.md` §5)

- **Hover.** The runner is written 0.5 mm above the turf with no ground preload.
- **Edge-tilted feet.** Both feet are rolled 4.43° onto their medial edges. A compliant ankle lets each foot settle flat within ≈ 30 ms: ≈ 5° of frontal ankle rotation and ≈ 4 mm of pelvis drop.

**The qualification keeps this entry.** The posture used is the replay's, and nothing is re-posed. Every perturbation starts at **t0 = 100 ms**, after the start-up has settled, and every response is measured against the same law's unperturbed run.

Two calibration attempts did not remove the foot flattening, and are not used:
- a grounded entry (lowered 0.5 mm);
- a kinematic-feet settle-and-release.

The replay will contain the hover and the foot flattening for both bodies.

## 5. B: mid-range passive elasticity

### 5.1 Evidence that V2 lacks it

V2's PassiveLayer is zero inside the soft range on every flexion axis. It is exponential at end range, and its damping is 0.15–1.0 N·m·s/rad.

It already has a **neutral-zone linear term** (`spec/v2_joints.js` G3-R7 / V2-F1: ½·kN·x² about an anatomical centre), but uses it only for ankle foot-abduction and the toe hinge.

The literature (STANDING_SUBSTRATE_LITERATURE §passive) finds **no dead zone** around standing at ankle, hip or knee.

### 5.2 Values (literature, untuned) — `PPR2_CANDIDATE_S.json` `passive`

| axis (per side) | k (N·m/rad) | slack (anatomical) | source |
|---|---|---|---|
| ankle dorsiflexion | 46 | 0° (neutral) [D] | Loram, Maganaris & Lakie 2007a [M]: long-range relaxed stiffness in standing (Riener & Edrich give 51 at the standing angle) |
| knee flexion | 17 | 14° | Riener & Edrich 1999 [E] at 14.2°, zero-moment angle ≈ 14° |
| hip flexion | 19 | 26.8° | Riener & Edrich 1999 [E] at 7.4°, zero-moment angle 26.8° |
| lumbar flexion | 10 | 0° | neutral zone (Watt 2022 table) [M/R] |
| neck flexion / lateral | 1.6 / 2.4 | 0° | Liu et al. 2024 [M] |
| hip ab/adduction, thoracic, shoulder, elbow | 0 | — | no usable human data. Arms are gravity-stabilised |

**How it is implemented.** τ_p = −k·(θ − θ_slack) runs through the same motor row. It is tissue: it never saturates, draws no activation, and is added to both window bounds.

The muscles supply only τ_active = rest statics − τ_p(entry).

**Preload at entry:**
- ankle 7.8 N·m plantar-flexor per ankle: 37 % of the static load (Riener's exponential gives 12.6);
- hip 6.5 N·m flexor;
- knee ≈ 0.

**The ankle slack angle is the only design choice.** Riener's zero-moment angle depends on an unverified constant, and a slack at the entry pose would be a pose spring.

**Native V2 equivalent:** a body-spec `neutralKPerDeg`/centre per axis, the existing G3-R7 mechanism. The extension is a parameter, not a new mechanism.

### 5.3 Isolated ankle evidence (calibration; protocol I1: Vlutters 2015 / Sakanaka 2021)

K/mgh of both legs at the end of the 41.7 ms ramp, at the measured ankle angle:

| variant | ≈ 0.24° | ≈ 0.48° | ≈ 0.97° | ≈ 2.0° | ≈ 4.1° | 71 ms at ≈ 0.75° |
|---|---|---|---|---|---|---|
| human (Vlutters power law; Sakanaka at 71 ms) | 0.98 | 0.81 | 0.67 | 0.55 | 0.45 | 0.61 |
| S_A (A + A2) | 1.46 | 1.46 | 1.06 | 0.72 | 0.51 | 0.32 |
| S_A + C | 1.46 | 1.47 | 1.24 | 0.71 | 0.46 | 0.87 |
| S_A + B | 1.16 | 1.17 | 1.08 | 0.74 | 0.53 | 0.69 |
| **S* = A + A2 + B + C** | **1.17** | **1.17** | **0.83** | **0.57** | **0.44** | **0.54** |

**Without B**, all of the static ankle load sits on muscle. That gives a short-range stiffness of ≈ 1.46 mgh, ≈ 50 % above the human value; human sources report 0.91 ± 0.23.

**B** moves part of the load to tissue and adds a non-yielding long-range floor (0.14 mgh bilateral). S* is then within 0.98–1.44 × the human curve at every amplitude.

## 6. C: eccentric / short-range reserve

**Plateau magnitude.** V2's eccentric plateau, e = 1.20–1.35 × isometric reached at −ω ≥ 0.1·w0, is adequate per the literature. For rate-coded postural activation it is slightly generous (sustained 0.85–1.2 × for slow muscle, 1.1–1.4 × for mixed). **e is unchanged.**

**The form is wrong.** V2's window ties the reserve to stretch **velocity**: at zero velocity the window falls back to isometric, so the short-range elastic force is clipped as soon as a stretch is held. Physiologically the reserve is a **strain** force:
- short-range stiffness "is independent of velocity unless the stretch is very slow" (Rack & Westbury 1974);
- high stiffness over the first 400–900 µm, then yield, then a force **plateau** while stretched (Lin & Rymer 1993);
- force enhancement persists after the stretch ends (7–13 %; Pinniger & Cresswell 2007).

**C (`srsHold`):**
- the strain force K·e persists at hold, up to the reserve R± = (e± − 1)·a±·capIso±;
- beyond R the element yields and stays at the plateau (plastic slip of the anchor);
- the activation is unchanged.

**Known simplification:** the full plateau (e − 1 = 20–35 %) is held for the whole window, against a 7–13 % residual after hundreds of milliseconds. It overstates long holds; within 300 ms it is acceptable.

**Isolated evidence.** S_A's 71 ms stiffness collapses beyond 0.5° (0.32 at 0.72°, 0.05 at 1.6°) because the velocity-gated window erases the strain force at hold. With C it stays in the human range (S* 0.54 at 0.78°; Sakanaka 0.61).

## 7. Can passive mechanics plus fixed pre-activation stand?

**Literature.** No: in every primary source that tested it (Loram & Lakie 2002; Loram et al. 2004/2005; Kiemel 2008; Morasso & Schieppati 1999):
- intrinsic ankle stiffness is 45–91 % of mgh;
- intrinsic hip stiffness is 95–147 N·m/rad, below the 150–170 N·m/rad upper-body load;
- trunk muscles are continuously active (Woodhull-McNeal 1986).

**Calibration**, measured from the PVP entry with no perturbation: every variant leaves standing within about a second.

| variant | pelvis drop 10 / 25 / 50 mm | mode |
|---|---|---|
| CURRENT V2 (A) | 1.85 s (10 mm). Its COM moves 10 mm forward at 0.40 s | ankle topple |
| S with PostureDriver bias | 0.53 / 0.78 / 0.92 s | forward drift, then buckle |
| S_A | 0.52 / 0.68 / 0.76 s | knee buckle (squat): knees +26° before the COM moves 5 mm |
| S_A + B | 0.75 / 0.96 / 1.09 s | knee buckle |
| S* | 0.42 / 0.58 / 0.72 s | hip fold plus knee buckle |

**The failure mode is not ankle toppling.** It is the flexed-knee and hip/trunk modes.
- In this 14° crouch the rest-statics knee torque is ≈ 1 N·m. The knee's tone is therefore only the 2 % co-contraction, with an elastic reserve of ≈ 1–2 N·m.
- The squat mode's gravitational stiffness is ≈ 74 N·m/rad per knee [E].
- After the start-up settle, the hip sits on the yield plateau of its weakly co-contracted side.

This agrees with the literature: an upper body with no hip stiffness folds with a time constant of 0.21 s, and the knee is passively stable only at its extension stop.

**So passive mechanics with fixed pre-activation cannot stand** in this posture, and PPR-2 does not force it to. Long-duration standing is the job of the delayed controller in §8.

## 8. Credible duration, and the controller standing requires (defined; NOT implemented)

**Credible duration of the substrate.** A real human's response to any deviation begins only after the postural loop delay. The delay is τ ≈ 150–200 ms; Peterka & Loughlin 2004 fitted 0.175 s.

- **Within τ of a disturbance**, the human is the substrate: intrinsic mechanics plus whatever tone existed before. This is the regime of the PVP window, 0–120 ms after contact.
- **For undisturbed standing**, the substrate must stay inside the standing envelope long enough, and diverge slowly enough, for a τ-delayed loop to hold it. Two quantitative criteria follow (preregistration QS1, QS2):
  - **exit ≥ start-up + 2τ**;
  - **e-folding time ≥ τ**, i.e. λτ ≤ 1. That is a √2 margin on the delayed-PD stabilisability limit λτ < √2 (Stépán; Milton 2009).
- **Not superhuman (QS3):** the substrate must leave the envelope; it may not stand indefinitely.

**The controller a standing human requires**, for a later phase (stop limit: not implemented here):
- **Continuous:** it runs from t = 0, before and regardless of any contact. It has no trigger, no contact input and no event logic.
- **Delayed and low-bandwidth:**
  - Inputs: the COM position and velocity relative to the base of support, trunk orientation and the key joint angles, each delayed by τ ≥ 150 ms and low-pass filtered (sway power is below 1–2 Hz).
  - Corrections can be continuous or intermittent (2–2.6 per second, Loram 2005a).
  - Gains at whole-body level ≈ 1.3 mgh stiffness and 0.46 s·mgh damping (Peterka & Loughlin 2004). Knee, hip and trunk gains are unidentified in the literature.
- **Output only through excitation.** It slowly modulates the substrate's u± per joint, through the 15/50 ms activation dynamics. It never writes torques, poses, springs or impulses.
- **Not a zero-latency collision response, by construction and by test.** Its output at time t depends only on the state at t − τ. So for τ after contact its output is identical with or without the collision. The test is the one already applied to the substrate: the activation trace must be bit-identical, struck vs unstruck, for t < t_contact + τ.

## 9. Calibration-stage disclosure

Before this design was frozen, PPR-2 ran these exploratory runs:
- I1 ankle-platform runs for S (PostureDriver bias), S_A, S_A + C, S_A + B and S*;
- undisturbed-standing runs for the same variants, plus CURRENT V2;
- knee and hip semi-isolated displacement smoke runs, 2 amplitudes × 2 signs, for CURRENT V2 and S*;
- the full battery run on **CURRENT V2 only**, as a tooling smoke test;
- the full battery run once on a **smoke-only variant** that decides nothing: the substrate with the PostureDriver statics, neither the candidate nor a reference. It only checked the substrate code paths for crashes.
  - It exposed that the energy ledger has no turf-contact term, so E1 was restricted to planted-feet windows before the freeze.
  - It scored 34/45 and is not used anywhere.

**Not run before the freeze:**
- any push from the battery, any release probe, or the battery's standing evaluation on the candidate;
- anything in a PVP scene.

**How B and C were chosen.** Their values come from the literature (§5.2, §6). Whether to include them was decided on the physiology argued in §5–§6, not on which variant stood longer: S* stands *shorter* than S_A + B.

**One calibration result counts against the candidate.** The semi-isolated hip test showed S*'s hip hold stiffness at ≈ 0–12 N·m/rad, against the human ≈ 60 per hip. The co-contraction (V2 default a_cc = 0.02) was **not** changed in response; human quiet-stance thigh and hip %MVC data were not found. The frozen battery will judge it.

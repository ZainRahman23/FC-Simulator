# Knee axial (tibial rotation): conclusion for E1a (final pre-E1a stage, §3)

**Evidence:**
- `literature/lit2_knee_axial.md`, a primary-literature review. Every value there is tagged full text / abstract / secondary / derived.
- The runway's measured prone-rest case (`../pre_g4_runway/ANKLE_KNEE_AND_RATE.md`, item 2).

**Nothing in the model is changed here.**

## 1. The current model

| | value | source tag in the spec |
|---|---|---|
| axial ROM, active (soft onset) | internal 20° / external 30° | "axial rotation (recalled)" |
| axial ROM, hard | internal 30° / external 40° | recalled |
| flexion coupling | only the SOFT range is scaled by clamp(flex/60°, 0.1, 1) ("screw-home"); hard limits fixed at every flexion | [ENG], "≈0 at extension (recalled)" |
| passive law | exponential from the soft onset to 25 % of the opposing capacity at the hard limit; end-stop to 100 % over 3° | G1 C2 |
| capacity | 0.35 N·m/kg each way (≈ 27 N·m at 78 kg) | recalled |

## 2. What the evidence says

1. **The range is about twice too large for a knee-only coordinate.**
   - Clinical "ROM" tables are foot-based. They include ankle–foot rotation, which our model already has as its own joint.
   - Bone-level in vivo data:
     - about 4° internal / 8–10° external at ±2.5 N·m;
     - about 16° total at 0°, 23° at 30° and 26° at 90° flexion at 5–6 N·m;
     - about 38–42° total at 9–10 N·m at 90°.
   - Our hard limit, at about 6.8 N·m, allows about 70° total.
2. **The range depends on flexion, including the outer limits.**
   - It is smallest at extension, about 0.4–0.7 of the mid-flexion range. It is not 0.1, and the extension envelope is not as wide as ours.
   - It rises steeply to 30–45° flexion, then plateaus to about 100°.
   - **Our model has it backwards near extension:** a tiny soft onset, but hard limits 30°/40° away, which makes full extension the most compliant posture.
3. **The axial zero shifts internally with flexion.**
   - About 10° by 60° (bone pins), about 20° by 120°, about 30° at 150° in a weight-bearing lunge.
   - The coupling is not rigid: it can be largely reversed by twisting the tibia outward.
4. **Torque–rotation.** Live curves stiffen gradually, with no wall up to 9–15 N·m.
   - Relaxed: about 0.25–1 N·m/°.
   - With co-contraction: 0.16–2.54 N·m/°.
   - Our soft-to-hard slope (about 0.7 N·m/°) is realistic but sits in the wrong place: onset at 20–40° instead of 7–16°.
   - The end-stop is acceptable as a numerical barrier, but should not be reached at passive rest.
5. **Strength.** About 27–30 N·m at 45–90°; lower near extension; no data beyond about 100°. So 0.35 N·m/kg is plausible at mid flexion and probably high near extension.
6. **Deep flexion.** No torque-defined passive limits beyond 120° were found.
   - A resting passive axial load of 20+ N·m is not physiological. Awake tests stop at 9–15 N·m, and 10 N·m of internal torque at full flexion is already ACL-dangerous in cadavers.
   - The gravity-driven axial torque in a prone rest is about 0.5 N·m (derived). So 23 N·m implies limits fighting each other or an external twisting contact.

## 3. The prone-rest case, revisited

| measured (runway, V1-matched passive fall, k = 0.13) | evidence |
|---|---|
| left knee flexion 146.3°, axial rotation **+32.4° (internal)**, 23 N·m at the end-stop | at about 150° flexion the tibia rotates internally about 30° in vivo (weight-bearing lunge, full text) |

**The rest the fall settles into is close to the natural internally rotated position of a deeply flexed human knee.** Our fixed-zero envelope places that position at its internal hard limit (+30°), so the ankle ab/adduction and knee axial end ranges load each other in series (23–25 N·m each).
- **Interpretation (strong, but not tested by a counterfactual run):** this G1 failure at k > 0 is mainly an artefact of the knee envelope. It is not a defect of a nonzero ankle stiffness.
- **The counterfactual that would test it:** a knee envelope whose zero shifts internally with flexion and narrows at extension. It needs the Jolt emergency limits widened to the flexion-dependent outer envelope, which is an anatomy / engine-limit change. It was not run.

## 4. Answers (§3 of the instruction)

| question | answer |
|---|---|
| Is the current knee axial ROM defensible? | **No**, as a knee-only coordinate: about twice too wide. It is defensible only as whole lower-leg twist, which our separate ankle axial joint already represents |
| Should it vary / couple with flexion? | **Yes**: the hard limits, the envelope width, and the zero (internal shift with flexion). Not only the soft onset |
| Is the passive / end-stop model adequate? | The **law shape** is acceptable (gradual stiffening, plus an end-stop as a numerical barrier). The **envelope placement** is not: too wide near extension, fixed zero in deep flexion |
| Can it become live in E1a / E1b? | **No.** The knee works at 4° (standing) to about 25° flexion (with the planned pelvis drop), with axial rotation near neutral and held by the actuated knee axial under the posture policy. The prone-rest interaction needs a passive fall into deep flexion, which E1's abort (touchdown) is designed to avoid. A fall in E1 is itself an E1 failure |
| Must it be fixed before E1a? | **Not for E1a's own behaviour. But it blocks the evidence-supported ankle law.** Every k > 0 fails G1 row 1.3d / 1.S′ through this prone rest. Without a knee revision, the ankle neutral stiffness cannot be adopted with G0–G3 intact, and (see the policy evaluation) the posture semantics are not satisfiable at k = 0 |

## 5. Decision needed (for approval; not done)

**Authorise an evidence-based revision of the knee axial model:**
- **width:** a narrower envelope, with soft onset near the ±2.5 N·m bone-level points and hard near the 9–10 N·m points, scaled 0.4–0.7 at extension;
- **zero:** shifting internally with flexion (about 10° by 60°, 20° by 120°, 30° at 150°);
- **capacity:** lower near extension;
- **engine limits:** the Jolt emergency limits as the flexion-dependent outer envelope;
- **then:** G1 re-validation.

This **narrows** the range overall (it is not a loosening). It also moves the deep-flexion envelope to where the human knee actually sits. The parameters need fitting to the cited data sets, and they are not fitted here.

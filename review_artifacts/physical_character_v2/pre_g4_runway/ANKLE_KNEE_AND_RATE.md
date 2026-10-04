# Knee axial limit, ankle-law formulation, and rate behaviour (pre-G4 runway, items 2–4)

**Status:** diagnostic only. **No limit, law, rate or criterion changed.**

## Item 2: why nonzero ankle stiffness puts the knee beyond its axial limit

**The failing case:** V1-matched "perturb" (a passive G1 fall), at rest prone. Perturbed 240 Hz ensemble: 13–14 of 15 members fail at k > 0, against 2 of 15 at k = 0.

**Measured resting state** (`evidence/kneerest.mjs`):

| | k = 0 | k = 0.13 |
|---|---|---|
| left knee flexion | 143.5° | 146.3° |
| left knee axial rotation | 22.4° (inside its range) | **32.4°** (hard limit +30°) |
| left knee axial passive torque | 1.1 N·m | **23.0 N·m** |
| left ankle ab/adduction | 4.5° (free zone, 0 N·m) | **14.5° (4.5° into its end range)** |
| left ankle ab/adduction passive torque | 0 N·m | **25.3 N·m** |
| left foot ground load | — | 108 N (14 % BW; right 36 N) |

**What the evidence separates** (the causes you listed):
- **Not the near-extension screw-home band.** The knee is at about 145° flexion, where the full axial range applies (soft −30…+20°, hard −40…+30°). An earlier statement of mine assumed "near full extension"; that was wrong and is corrected here.
- **Not the posture controller.** G1 is passive (no controller).
- **Not numerical / solver.** It is a static equilibrium, reproduced in 13–14 of 15 perturbed members.
- **The passive end-stop law, quantitatively** (`passiveTorque`, knee axial):

  | point on the law | torque |
  |---|---|
  | at the hard limit (25 % of the opposing isometric capacity) | 6.8 N·m |
  | 1.5° beyond (the G1 1.3d settled tolerance) | **16.9 N·m** |
  | 2.4° beyond | **23.1 N·m (matches the measured 23.0)** |
  | 3° beyond (100 % of capacity) | 27.3 N·m |

  So **any sustained axial knee load above ≈ 17 N·m at rest fails 1.3d.**
- **Torque transfer from the ankle:** yes. With k > 0 the foot–shank axial coupling is no longer free. In the folded prone rest, with the foot pinned by contact (108 N), the fall's accumulated twist settles into a configuration that loads **the ankle ab/adduction end range (k-independent, approved) and the knee axial end range in series** (23–25 N·m each). At k = 0 the free foot rotation lets the leg settle with near-zero axial load.
- **Root cause: an interaction.** The ankle neutral stiffness steers the passive collapse into a twisted, end-range-loaded rest. The knee end-stop law then settles 2.4° past the hard limit under that load, and the G1 1.5° tolerance flags it.

**Is the anatomy right?**
- The model's knee axial ROM is marked **"recalled"** in the spec (`spec/v2_joints.js` knee evidence: "axial rotation (recalled)"), and the screw-home coupling is **[ENG]**. **The local evidence does not verify them.**
- **Evidence needed before any change:**
  - tibial axial ROM and passive torque–rotation curves vs flexion (0–150°), in vivo or cadaver (for example the classic torque–rotation laxity studies);
  - the ankle–subtalar axial end-range torque curve;
  - whether 23 N·m of axial load at 145° flexion is within physiological passive tolerance.
- I did not change the ROM, the end-stop or the tolerance.

**Diagnostic alternatives considered (none adopted):**
- **A stiffer knee end-stop** (100 % capacity at 1.5° instead of 3°) would hold 23 N·m within about 1.2°. That is an anatomy / passive-law change, so it was not tested as a candidate.
- **A load-gated ankle law does not cleanly separate this case:** the pinned foot carries 108 N, 14 % BW.

## Item 3: ankle-law findings

**1. What the ankle stiffness actually does depends on the twist policy.**
- Under "current", any k sits inside an actuator-powered limit cycle. 0.11 / 0.13 make it grow in two of three bodies; 0.15 damps it in V2-REF only.
- Under reference-like policies the limit cycle is gone at every k, and **k becomes the whole-body yaw anchor:** static yaw stiffness ≈ 2k.

  | k | 0 | 0.11 | 0.13 | 0.15 |
  |---|---|---|---|---|
  | static yaw stiffness (N·m/°) | 0.10–0.40 | 0.23–0.34 | 0.26–0.34 | 0.30–0.35 |

**2. Separating the resistances** (constant 2 N·m pelvis yaw torque; `evidence/yawpath.mjs`):
- **Ground contact:** free moments carry 82–99 %; the two-foot shear couple carries 1–18 % (18 % under reference at k = 0, ≈ 1 % under current).
- **Passive anatomical resistance:** the ankle ab/adduction carries the transmitted yaw (≈ 0.8–1.0 N·m per ankle). Under current at k = 0 this happens **in the end range**.
- **Proximal:** the hip-rotation actuators transmit the same torque (≈ 0.8–1.0 N·m per hip). Knee axial carries ≈ 0 except under current (≤ 0.07 N·m).
- **Active posture control** decides only *where* the twist sits (pelvis vs legs). It does not create a yaw anchor.

**3. Is a constant linear neutral-zone law appropriate?**
- **Load-dependence:** the evidence range (0.11–0.15 N·m/°) comes from **unloaded or lightly loaded** measurements (Watanabe 2012 in vivo unloaded; Hattori 2022 cadaver at 5 N). Rotational stability of the loaded ankle–subtalar complex is widely attributed to articular congruence under compression, which suggests a higher loaded stiffness. **No loaded value is in the local evidence.**
- **What a load-dependent law k(F_axial) would mean:**
  - **for:** stance-foot yaw is anchored much more stiffly than 2 × 0.13; the swing foot stays compliant;
  - **against:** a state-dependent stiffness is not a conservative potential, so passivity accounting needs the work of the load change;
  - it would **not** cleanly fix the prone knee case (the pinned foot carries 14 % BW).
- **Evidence needed:** ankle–subtalar axial torque–rotation curves vs axial load (0 → 1 BW). Until then a constant law is the only evidence-backed form.
- **Knee state:** the ankle law is knee-independent. Knee axial coupling to flexion is modelled at the knee (screw-home), not needed at the ankle.
- **Contact state:** relevant for the airborne swing foot (G4 interface hazard H10). An unloaded foot under a reference policy with k = 0 has no yaw restoring at all.

**3b. Single-support yaw anchoring: the G4-critical finding** (`tools/ss_yaw_anchor.mjs`; G3 U:R swing-ready, the other foot unloaded; pelvis yaw impulse at 8 s; V2-REF).

| impulse | stance-ankle ab/adduction peak | pelvis yaw peak | outcome |
|---|---|---|---|
| 1 N·m·s | 13.0–13.4° (k = 0) → **11.0–11.2° (k = 0.13 / 0.15)**: end range at every k | 10–12° | recovered at every k / policy |
| 2 N·m·s | 15–16° (at the ±15° hard limit) | 14–17° | current (k = 0) recovers; blend 0.5 **relocates a foot** at k = 0 / 0.13 / 0.15 |
| 4 N·m·s | 16–18° | 25–29° | **foot relocated** for every policy and k |

**With one foot down, the body's only yaw anchor is the stance ankle's axial stiffness.** The evidence-range values (0.11–0.15 N·m/°, measured unloaded) barely change the response, and modest yaw impulses still reach the end range.
- A swing leg's reaction moments are of this order (rough estimate ~1–2 N·m·s for a short step; not measured, no swing controller exists).
- **So single-support yaw anchoring is a G4 prerequisite,** independent of the twist policy.
- **Candidate sources (decisions / evidence, none adopted):**
  - (a) the **loaded** ankle–subtalar axial stiffness (expected to be much higher; no local evidence);
  - (b) active stabilisation through the actuated ankle axes (inversion couples to axial rotation through subtalar geometry, but the model's ab/adduction axis is passive-only). **Physics constraint:** in single support the net body yaw moment comes only from the stance foot's free moment, which passes through that passive axis. Actuators above the ankle can only redistribute angular momentum internally (trunk / arms) or move the twist between pelvis and legs, so a genuine active anchor needs an actuated axial / subtalar path (an anatomy / actuator decision);
  - (c) a deliberate hip-rotation pelvis-yaw hold during single support with **explicit damping of the leg twist** (the validated "current" form holds the pelvis but feeds the twist; see the twist mechanism document).
- **Policy attempt (falsified as a fix):** the stable drifting reference (τ 2 s), which has the highest static double-stance yaw stiffness of the stable policies (1.5 N·m/°), **does not improve near-single-support anchoring**:

  | impulse | stance-ankle peak (k = 0 / 0.13) | outcome |
  |---|---|---|
  | 1 N·m·s | 15.3 / 10.1° | recovered |
  | 2 N·m·s | 18.0 / 13.9° | recovered at k = 0; relocated at k = 0.13 |
  | 4 N·m·s | 20.5 / 16.7° | relocated |

  **No twist policy solves it.** It needs a stiffer loaded ankle axial path or an active yaw source.
- **Requirement scoping (SENSITIVITY ONLY; out-of-evidence stiffnesses, never candidates).** Blend 0.5, near-single support:

  | k (N·m/°) | stance-ankle peak at 1 N·m·s | at 2 N·m·s | pelvis yaw at 2 N·m·s |
  |---|---|---|---|
  | 0.3 | 9.2° | 14.1° | — |
  | 0.6 | 6.7° | 12.5° | — |
  | 1.2 | **4.7°** | 9.5° | 12.8° |

  At 2 N·m·s the foot is still relocated at every one of these values.

  **What this implies for the evidence search:** keeping the stance ankle within a few degrees under swing-sized yaw impulses (~1 N·m·s) would need a **loaded** axial stiffness of order **≥ 1 N·m/°, about 10× the unloaded evidence range**. Larger impulses still need an active pelvis-yaw strategy at the stance hip (in human gait the pelvis rotates over the stance femur while the loaded foot stays put).

  **The evidence question:** what is the axial (internal / external) rotational stiffness of the loaded ankle–subtalar complex in vivo, at 0.5–1 BW? If it is ≈ 1 N·m/° or more, a load-dependent law is the anchor. If it is ≈ 0.15, an active strategy is unavoidable.

**4. Attacks on the apparently successful configurations:**
- **twist probes:** under reference, all re-centre at k = 0.13 / 0.15 in three bodies (the k = 0 + reference case leaves 1–2 / 20);
- **commanded turns:** reference achieves 10 / 20 / 30° through the hips at k = 0.13 (oscillation ≤ 0.12°);
- **toe-out stances to 45°:** no conflict;
- **G2 / G3 batteries** for blend 0.5 and drift τ 2 s: see the consolidated report.
- **Still failing for every k > 0:** G1 knee-axial (item 2), which is policy-independent because G1 is passive.

## Item 4: 180 Hz / rate behaviour

**Same-state convergence of the worst event** (awkward passive fall, k = 0.15, right ankle swinging in mid-air into triaxial end range; `evidence/rate_fine_awk_k0.15.json`). Largest single-step energy gain from the identical pre-event state:

| rate | 180 | 190 | 200 | 210 | 220 | 230 | **240** | 260 | 280 | 300 | 360 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ΔE_max (J) | 6.92 | 5.67 | 4.55 | 3.56 | 2.67 | 0.59 | **0.51** | 0 | 0 | 0 | 0 |

- The window residual is −650 to −694 J at every rate (net dissipative).
- **The error shrinks monotonically with rate** and vanishes from about 250 Hz. That is the signature of a stiff end-range spring near the semi-explicit integration stability limit; the energy enters as configuration potential without matching drive-row work.
- **The production rate, 240 Hz, sits just above the steep part:** in this worst passive-fall state it still produces a **0.51 J** step, above the 0.05 J 1.2e diagnostic floor.

**Production concern:**
- **Bounded:** a single step, returned in the next, net dissipative.
- **Confined to pathological passive-fall end-range states:** triaxial ankle end range at 10–19 rad/s in mid-air, never reached in G2 / G3 or in any 240 Hz sweep run (≈ 1,500 runs at 240 Hz across sweeps, 0 events).
- **Not a foundational passive-law defect, but a thin margin** at the production rate.

**If it ever needs fixing (decisions; not done):**
- an implicit / semi-implicit treatment of the end-range spring stiffness in the drive rows;
- or a production rate ≥ 260 Hz, a physics-rate change, which is not allowed without approval.

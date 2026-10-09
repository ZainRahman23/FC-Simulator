# LC-1 implementation freeze (before the official evaluation)

**Preregistration:** `LC1_PREREG.md` (313280f). Its criteria (§4) and procedure (§5–§9) are unchanged.

**Code:** branch `prototype/locomotion-continuity-v1`. The commit that adds this note is the freeze. Files:
- `sandbox/visual/anim3d/of_loco_cont.js` (new);
- hooks in `of_loco.js` (`ofLocoTick`) and `of_motion.js` (`ofSolve`, `ofActorTick`);
- the script tag in `match.html`.

**Shared law untouched.** `ofLocoCycle`, `ofLocoGroundPelvis`, `ofLocoParams`, `OF_LOCO`, `OF_IDLE`, `ofPoseLerp`, `skelFK`, `ofBootAhead` and `ofBootPlan` are byte-identical. No simulation file changed.

**Development discipline (§5.4).** Development used only the offline harness, on synthetic straight runs at the eight test speeds:
- `scripts/lc_dev.cjs`, `scripts/trace_jumps.cjs`, `scripts/d1_identity.cjs`;
- design probes `scripts/qp_probe.cjs`, `law_probe.cjs`, `law_flight_probe.cjs`.

The PI-1 records were used only to check that the switch-off path reproduces V1.3. They were not used to develop anything.

## Design changes made during development (with the defect that forced each)

| # | prereg §3 text | frozen implementation | why |
|---|---|---|---|
| 1 | D4: rolling foot by a flat-dwell map φ(θ) = θ³/(θ² + θ_k²), θ_k = 5°; discrete heel / toe pivots switched at flat | **a rigid foot rolling without slipping on a convex G1 sole**: heel pad (radius = the rig's MTP-joint height, 31 mm), rocker (radius 2.5 m), ball of the foot (circle about the MTP joint, same radius). The contact point moves continuously, and the instantaneous centre is always the contact, so the foot's velocity field is continuous for any C1 pitch. The planted pitch is the authored pitch; there is no dwell. | A discrete pivot change while the foot still turns gives a velocity jump of ω × 0.18 m. The authored foot wobbles in yaw and roll at about 1 rad/s, and at sprint the law rotates the foot through flat at about 30 rad/s. These gave knee spikes of 3 – 35 m/s per 1/3,840 s step. The rocker radius is the largest sole curvature whose sagitta stays within P-9's +2 mm (sagitta 1.6 mm). |
| 2 | D4: the planted foot keeps the authored yaw / roll | the planted foot's yaw and roll **come to rest** over the engagement (uniform deceleration over T_e) and stay fixed | A planted foot does not turn (finding behind #1). |
| 3 | D4: engagement pins the pivot point | the foot's **ground reference point** (the contact point at θ = 0) decelerates uniformly to rest over T_e; vertically a cubic Hermite; T_e = 0.05 s unchanged | follows from #1 |
| 4 | D4: release decays ankle and pitch offsets | release decays the ankle offset (cubic Hermite) and the **foot and toe orientation offsets as rotation vectors**, with the exact left-Jacobian rate match; T_r = 0.10 s unchanged | Euler angles hit gimbal lock with the near-vertical foot at toe-off (33 m/s spikes at sprint). A first-order rate match of large rotation offsets left 0.4 m/s jumps. |
| 5 | D4: "planted legs keep their authored knee plane" | the IK pole lies in the plane normal to the **authored thigh's hinge axis** (its local x), on the forward side; no bend-plane memory | A pole taken from the authored knee degenerates near-straight, or when the target is far from the authored ankle: the knee plane flipped in one step (100 m/s). A stale memory plane clamped the knee at the next landing. With the authored ankle as target, the hinge-plane pole reproduces the authored knee exactly. |
| 6 | D4: OF_TRACK soft compression above 0.93 × leg length | **(a)** a C1 soft clamp at max(authored hip–ankle distance + 3 mm, the distance at 20° of knee flexion); **(b)** a softplus saturation 2 mm below the IK's full extension. **Every layer leg, swing included, goes through the same IK** (no IK on / off switch). | The fixed compression acted at the instant the IK engaged on the law's near-straight landing leg (a jump). The law's walking stance knee is within 0.5 mm of full extension, where the two-bone IK clamps C0 and multiplies target changes about 14× at the knee. |
| 7 | D4: smooth swing-clearance lift (softplus, k = 2 mm) applied to the swing leg | the lift is **part of the authored swing foot** (swing, engagement and release refer to the same foot); **k = 6 mm**, half the boot sole | Engagement started from the un-lifted foot (a jump). A foot crossing the pitch level at speed v gains about v²/4k of acceleration from the lift (a 2 – 3 ms pulse of about 3,300 m/s² at 6.5 m/s with k = 2 mm). |
| 8 | D2 walking: the law's stance grounding with smooth min / max and no hard heel / toe switch | **a C1 max of the two legs' sole requirements**: the outgoing stance leg fades out exactly over the double support; the swinging leg ramps in over the descending half of single support (the last half of its swing), so the pelvis has come down to meet the landing foot; at least one leg always has full weight | The law grounds stance legs only. Its walking foot lands about 13 cm above the pitch at 1.45 m/s (22 mm planted slip), and its outgoing leg is dropped at toe-off (21 – 30 mm pelvis steps at 2.2 m/s, where the double support lasts about 17 ms). |
| 9 | (implicit) | every transition starts from the **old mode's presented foot evaluated at the current tick** | Starting from the previous tick's state was a one-tick lag: 2 mm at 3,840 Hz, about 3 cm at 60 Hz. |
| 10 | (implicit) | a V1.3 lock handed to the layer (an overlay ending) starts as a static foot at the lock | the first version crashed on a standing runner who later moved |

**Unchanged constants:**
- h = 1/60 s (D1);
- T_e = 0.05 s and T_r = 0.10 s;
- the D3 low-pass τ = 0.15 s;
- the rounded-sole smooth min / max scale 3 mm;
- the spring-mass running model (D2) and its landing level;
- D5.

**Added constants:** rocker 2.5 m, toe smooth-max 3°, lift k = 6 mm.

**Considered and not adopted (D2).** I tested a "closest physically admissible vertical path": a QP minimising the distance to the law's vertical path, subject to a ballistic flight and vertical force in [0, 4] BW in stance (`scripts/qp_probe.cjs`).
- It departs from the law by 47 mm at 3 m/s and 120 mm at 7.5 m/s. The spring-mass model departs by 119 mm and 152 mm.
- It satisfies the bounds only with bang-bang forces (0 and 4 BW): admissible, but not a sensible gait.
- **The spring-mass model, as preregistered, was kept.**
- **The finding behind this:** the law's vertical path is not physically realisable. Its stance vaults, with the pelvis highest at mid-stance, and its late stance plunges. The simulation's CHARCOLLIDE legs inherit that path, so any physical presentation departs from them by several centimetres vertically.

## Development measurements (offline, synthetic straight runs at 3,840 Hz; not the official evaluation)

Worst per-step velocity change (limit 0.18 m/s):

| speed (m/s) | pelvis | presentation COM | worst rig joint | planted slip per stance, max |
|---|---|---|---|---|
| 1.45 | 0.034 | 0.045 | 0.148 | 2.1 mm |
| 2.2 | 0.058 | 0.052 | 0.406 | 3.2 mm |
| 3.0 | 0.046 | 0.054 | 0.167 | 0.01 mm |
| 4.2 | 0.046 | 0.052 | 0.235 | 0.01 mm |
| 5.5 | 0.061 | 0.103 | 0.258 | 0.01 mm |
| 6.5 | 0.089 | 0.099 | 0.376 | 0.01 mm |
| 7.5 | 0.060 | 0.085 | 0.311 | 0.01 mm |
| 8.2 | 0.089 | 0.108 | 0.570 | 0.01 mm |

**For reference, the law's own rotation channels** (pelvis fixed) reach 6.4 / 12.4 / 17.4 m/s per step at 3 / 5.5 / 7.5 m/s: C0 cusps. **D1's C1 rounding alone** gives 0.088 / 0.164 / 0.200. At 7.5 m/s, rounding the law's cusps within one frame therefore already implies about 770 m/s² at the toe, above the 691 m/s² that LC-2's threshold allows at 3,840 Hz.

**Cost:** `ofActorTick` takes 154 µs per tick for V1.3 and 694 µs with LC-1 (Node, 5.5 m/s). This is a prototype cost (repeated law evaluations, the authored ±1 ms re-evaluations and many FK passes) and is reported, not optimised.

**Reproduction checks at freeze:**
- `OF_CONT.on = false` reproduces the V1.3 page records bit for bit (8 rx cases, every matrix entry up to contact);
- the D1 law copy equals `ofLocoCycle` exactly (0°) over 4,000 phases × 10 speeds × forward / reverse;
- standing runners change only by D5: pelvis exactly 12 mm lower where V1.3's bogus lift was active, and no horizontal change.

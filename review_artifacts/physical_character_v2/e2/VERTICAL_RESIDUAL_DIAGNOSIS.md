# Descent-end / touchdown vertical residual: DIAGNOSIS (diagnostic only; nothing adopted)

**Authority:** user decision 2026-10-06, `../sources/2026-10-06_user_decision_vertical_residual_diag.md` (verbatim).

**Scope:** explain why the swing foot is about 1–2.4 mm below its vertical reference near the end of the descent, and why it is still moving down when contact occurs. Stop before implementing any correction.

**Nothing in the controller's behaviour, gains, apex, swing duration, E2-5, tracking or clearance thresholds was changed.**
- Preserved: the SV-2 failure, including PG what-if 0 / 32 at 4.977 mm on φ = 0.80.
- Both touchdown measures (instantaneous and exact 10 ms) are reported.
- No E2-5 formulation is adopted.
- Recovery issue C is untouched. Nothing is pushed.

## Tools and evidence

**Default-off diagnostic hooks.** Identity checks after each addition: KV0 IDENTICAL; PSTAR5B 99c29491; PSTAR5CH b62309f5; SV-2 record 3dd9f13d; component regressions 58 / 58.

| hook | location | what it does |
|---|---|---|
| `cfg.diagNoGround` + `setNoGround` | `core/v2_jolt.js` | a collision layer that skips the turf, for "turf removed" |
| `moveKinematic` | `core/v2_jolt.js` | drives a kinematic body, for pelvis replay |
| `o.diagRecord` | `ctrl/v2_stand.js` | recording only: IK solution, D1's resolved rates, velocity feed-forward split into pelvis-motion and target-motion parts |
| `o.diagD1PelAcc` | `ctrl/v2_stand.js` | counterfactual: D1 fed the measured pelvis acceleration |

**Harness `tools/vres_diag.mjs`.**
- It uses SV-2's timeline and is bit-identical to SV-2 until touchdown.
- Switches: fixed / floating / replayed pelvis, turf on / off, D1 on / off, vertical-only V0, counterfactuals switched on at the measured liftoff (`--xswing`, optionally reverted at contact), SV-2 post-contact sequence.
- Telemetry per tick: reference, foot, lowest boot point, contact, pelvis, COM, joint coordinates and IK targets, D1 rates, velocity feed-forward parts, per-axis torque terms (gravity / statics, D1, proportional, velocity feed-forward, damping, request, activation bounds, applied, saturation), passive tissue torque, ankle Jacobian.

**Tables:** `tools/vres_analyze.mjs` → `evidence_vres/vres_analysis.txt` / `.json.gz`.

**Runs:** 884 (rounds r1–r6). Job lists and logs are in `evidence_vres/*_jobs_and_logs.tgz`, plus a V2-REF 240 Hz record subset. r1 ran on the tree committed unchanged as 93f9548 (`r1_provenance.txt`).

**Coverage:** V2-REF, V2-165-62 (the body that sets SV-2's binding bin) and V2-198-92 (heaviest); left leg; 180 / 240 / 480 Hz. Trajectories:
- V0, vertical-only;
- R-F and R-L, representative;
- H-T45, the harder reachable trajectory with the highest vertical acceleration;
- H-F15 and H-D for contact retention;
- C-F7 and C-L5 for T-1;
- C-L11 and a lateral sweep on V2-long-legs for reachability.

**Conventions:**
- The row's reference is the target for the row's own time (verified).
- Ankle error e_y = foot origin − reference, vertical.
- d_low = lowest boot point − the reference pose's lowest boot point.
- Orientation part = d_low − e_y.

## 1. Causal decomposition

The residual is **two independent mechanisms plus a small servo remainder**. Neither is contact anticipation, nor an error in how the trajectory or reference frame is built.

### M1: floating-base pelvis-motion coupling (the ankle-height error)

**Mechanism:**
- During the swing the pelvis moves vertically ±2.6 mm at up to ±23 mm/s. On wide lateral swings it also translates up to 32 mm and yaws up to 10°.
- The swing servo is world-space: its IK starts from the measured pelvis. Its velocity feed-forward has a target-motion term (rT) and a pelvis-motion term (rP).
- In the E2 configuration (`lcVff: "lin"`, `vffRate: "sr"`), rT uses singularity-robust damping. rP keeps the fixed damping μ0 = 0.01, which in the leg's weak vertical direction passes only about 26–37 % of the needed joint rate (`VFF_RATE_CORRECTION.md`).
- So the leg's own damping, D·(ω − ω*), drags the foot along with the pelvis's vertical velocity. The error follows pelvis velocity, not pelvis position: the foot rides high while the pelvis rises (φ 0.5–0.8, up to +2 mm) and low while it falls (φ 0.85–1.0, down to −2.4 mm).
- The same coupling is the whole T-1 vertical residual (§5).

### M2: uncompensated passive ankle damping (the orientation error)

**Mechanism:**
- During the descent the ankle rotates relative to the shank at about 0.85 rad/s.
- The ankle's passive tissue damping (0.2 N·m·s/rad; the swing servo's ankle D is 0.589, so 34 %) produces about 0.16 N·m.
- The velocity feed-forward compensates the servo's own damping, (D + dt·K)·ω*, but not the passive damping. The proportional term balances it with an error of 0.16 / 9.25 N·m/rad = 0.99°. Measured: 0.94° of pitch.
- Any tilt of a flat reference foot lowers one sole edge. So this error always reduces clearance, by about 0.5–1.9 mm depending on body and trajectory.
- It is independent of the pelvis (pinned or floating) and almost independent of rate.
- Hip and knee passive damping are 0.4 % and 1.6 % of their servo damping, so negligible.

### M3: the servo's own remainder

With the pelvis pinned and the passive damping compensated, d_low is −0.1 to −0.4 mm.
- The part that falls with rate (−0.34 / −0.25 / −0.12 mm at 180 / 240 / 480 Hz, φ 0.90) is discrete-time lag.
- The rest is continuous servo lag.

### Decomposition of d_low

Mean over 3 bodies × 3 rates, turf removed, D1 on. Sequential attribution: coupling = baseline − (pelvis term undamped); orientation = that − (both fixes); remainder = both fixes. The alternative order is in `vres_analysis.txt` §2; the interaction is up to about 0.4 mm.

| trajectory, φ | total d_low | M1 coupling | M2 orientation | remainder (floating) | servo remainder (pinned + passive comp.) |
|---|---|---|---|---|---|
| R-F 0.80 | −0.94 | +0.12 | −0.67 | −0.38 | +0.02 |
| R-F 0.85 | −1.67 | −0.56 | −0.54 | −0.57 | −0.10 |
| R-F 0.90 | −2.31 | −1.27 | −0.32 | −0.72 | −0.20 |
| R-L 0.80 | +0.34 | +1.40 | −0.96 | −0.09 | 0.00 |
| R-L 0.90 | −1.24 | +0.16 | −1.04 | −0.36 | −0.23 |
| V0 0.90 | −1.73 | −1.03 | −0.21 | −0.49 | −0.23 |
| H-T45 0.90 | −2.42 | −0.83 | −0.49 | −1.10 | −0.28 |

**At the binding window φ 0.75–0.80, M2 dominates.** M1 is often positive there (the pelvis is rising), so it partly masks M2. After φ 0.85, M1 grows and drives the early contact.

**The floating-base remainder is only partly attributed.** After both fixes, the floating remainder exceeds the pinned remainder by 0.2–0.8 mm at φ 0.85–0.90. Feeding D1 the measured pelvis acceleration (a noisy, one-tick-late backward difference) is inconclusive, so this residual floating-base part stays partly unattributed.

### The chain to the touchdown failures

1. **Early contact.** Contact is purely geometric: the turf-removed run is bit-identical to the turf-on run until the exact tick the lowest point touches (0.003 mm). The reference lowest point approaches the turf as height ∝ (1 − φ)³ and reaches it with zero speed at φ = 1. So a downward residual δ makes contact happen early, at the reference's speed for that height. Measured over 315 touchdowns:

   **v_ref,contact ≈ 0.051 m/s · (δ / 1 mm)^0.62, r = 0.90.**

   The baseline's δ = 1.1–2.5 mm gives contact at φ 0.87–0.91 and 0.08–0.12 m/s foot approach.
2. **Edge-first contact and the foot-flat slap (I-2).** M2's tilt makes 2 hull pieces touch first. The sole slaps flat 2–16 ticks later, and that second impact carries the load spike and the torque step, outside E1a-7's onset window.
3. **Premature load from pelvis coupling.** At the slap, the landing leg arrests the pelvis's descent: the pelvis's vertical velocity goes from −15 to +5 mm/s within 12 ms (R-F, 240 Hz). M1's under-compensated pelvis term makes the landing leg act as a damper between pelvis and turf.
   - Keeping the exact pelvis term through contact keeps the approach identical but cuts the exact 10 ms load from 22.3 to 10.2 % BW (R-F), and from 32.9 to 14.4 % BW (H-F15).
   - **Most of the measured "impact" is this premature load acceptance, not foot momentum.**
4. **Post-touchdown contact loss (I-6).** The same family, through more than one path:
   - With the unloaded foot in contact, M1 drags it with the pelvis. On H-D the pelvis moves backward at about 50 mm/s while the foot is dragged forward and up 1 mm.
   - E2's hand-back starts from the reference's still-moving state. Early contact on long steps leaves more reference motion to absorb.
   - Removing the pelvis drag also removes the pressing that had been holding the foot down. With the exact pelvis term through contact, the hand-back's start state (about δ above the foot) lifts the foot on R-L (9 / 9 runs).
   - **Contact retention therefore depends on touchdown design**: hand-back start state, the post-contact hold and the seating force. It is not on the servo alone.

## 2. Counterfactual evidence

Turf removed; mean over 3 bodies × 3 rates; replay and D1-pelvis-acceleration rows are 240 Hz × 3 bodies.

| variant | R-F d_low φ .85 / 1.0 | R-F ankle e_y 1.0 | orientation part φ .85 | vertical β (R-F) | conclusion |
|---|---|---|---|---|---|
| baseline, floating | −1.67 / −2.47 | −1.99 | −1.16 | 0.38 | — |
| **pelvis replayed kinematically** (follows the record within 2·10⁻⁹ m) | −1.71 / −2.49 | −2.01 | −1.15 | 0.40 | **M1 is kinematic coupling of the measured pelvis motion; the dynamic reaction adds nothing** |
| pelvis pinned | −1.12 / −0.82 | −0.18 | −1.10 | 0.07 | the ankle error needs a moving base; the orientation error does not |
| **pelvis-motion term undamped during the swing** | −1.12 / −0.49 | −0.19 | −0.88 | 0.10 | **M1's cause is rP's damping** |
| D1 fed the measured pelvis acceleration | −1.76 / −2.94 | −1.77 | −1.27 | 0.44 | not the cause: incomplete floating-base inverse dynamics is excluded |
| **passive damping compensated during the swing** | −0.72 / −2.35 | −2.01 | −0.13 | 0.39 | **M2's cause is the passive ankle damping** |
| both fixes | −0.57 / −0.60 | −0.19 | −0.27 | 0.11 | — |
| pinned + passive compensation | −0.10 / −0.25 | −0.21 | −0.01 | 0.09 | servo remainder (M3) |
| turf on vs off | identical until geometric contact | | | | no contact anticipation |

The same pattern holds on V0, R-L and H-T45 and at every rate (`vres_analysis.txt` §1).

**Worst case in the binding window [0.75, 0.80], R set + V0, all bodies and rates:**

| variant | worst d_low (mm) |
|---|---|
| baseline | −1.11 |
| pelvis term undamped only | −1.35 (worse: it unmasks M2) |
| passive compensation only | +0.06 |
| both | −0.37 |
| servo floor (pinned + passive comp.) | −0.02 |

## 3. The smallest principled correction (proposed, not implemented)

Both parts complete the compensation of **known or measured plant terms** inside the existing velocity feed-forward of the non-supporting leg. There is no new behaviour, no gain change and no trajectory change, and both are a few lines each.

**(A) Pelvis-motion term, airborne swing.**
- Solve rP with the same singularity-robust variable damping already validated for rT (`vffRate "sr"`).
- Weight it continuously by the lifecycle's airborne weight a: μ_P(a) = μ0 + a·(μ_sr − μ0). In contact (a = 0) the validated μ0 behaviour is unchanged, which keeps the regime where `srAll` was unstable (straight-leg / contact, external lift) untouched.
- Rationale: airborne swing poses are well conditioned (σmin ≥ 0.03, `VFF_RATE_CORRECTION.md` §2), and the airborne leg does not carry load.

**(B) Passive joint damping.** Add the joint's passive damping c_p (a spec parameter) to the feed-forward gain: (D + dt·K + c_p)·ω*. This is the existing diagnostic `vffPassive` form.
- Your standing instruction keeps this diagnostic-only. Adopting it needs your decision.
- It has a landing-load side effect (§4).

**Both parts are needed together.** (A) alone worsens the φ 0.80 bin. (B) alone leaves the early, fast contact and the T-1 residual.

**Risk to verify before adoption:** run (A) on the external-lift harness and the prior regression batteries. rP is a closed-loop term. The a-weighting is intended to keep it out of the contact regime, but that has not been tested.

## 4. Expected consequences

From counterfactuals. The consequences of the real correction depend on the a-weighting, which was not implemented. Its effect after touchdown should lie between the "swing-only" variant (switched off abruptly at contact) and the "kept through contact" variant, since a decays from 1 to 0 over about 0.1 s after contact.

**Clearance:**
- Worst binding-bin deviation −1.11 → −0.37 mm (R set + V0).
- Contact φ 0.886 → 0.917 on R-F.
- The SV-2 allowance's binding bin, 1.60 mm, is mostly M2 plus late M1. A re-validated allowance would be expected near 0.4–0.6 mm. Not computed; the φ 0.80 failure stands.

**Touchdown:**
- δ at contact 1.9 → 0.84 mm; approach speed 0.093 → 0.046 m/s (R-F mean).

**Maximum exact-10 ms load (% BW):**

| trajectory | baseline | both fixes, swing only | both fixes, kept through contact |
|---|---|---|---|
| R-F | 27.8 | 21.8 | 12.4 |
| R-L | 15.3 | **27.6** | 21.5 |
| H-T45 | 34.3 | 32.9 | 27.3 |
| H-F15 | 36.9 | 31.9 | 19.1 |
| H-D | 24.5 | 28.8 | 21.5 |

- (B)'s flat landing (8 pieces at once) removes the edge-first cushioning, so the swing-only load rises on lateral steps.
- The instantaneous peak stays rate-dependent in every variant (`vres_analysis.txt` §5 and the r2 / r3 tables).

**Torque steps (E1a-7, swing-leg axes):**
- Kept through contact: R-F 0, R-L 0, H-T45 1/9, H-F15 0/9 (baseline 3/9), H-D 1/9.
- The swing-only variant shows extra violations at contact. They come from the abrupt counterfactual switch, which is an artefact a continuous a-weighting avoids.

**Contact retention:**

| trajectory | baseline | kept through contact |
|---|---|---|
| H-F15 | 7/9 lost | 0/9 |
| H-D | 7/9 | 7/9 |
| R-L | 0/9 | **9/9 new** |
| H-T45 | 0/9 | 3/9 |

Retention needs the touchdown design (§1 step 4).

## 5. T-1: what it measures

- T-1 is the pooled slope of tracking error on −a_ref / ωn². D1 drives the horizontal part to about zero. The surviving part is vertical and is M1: with the pelvis pinned, or with the pelvis term undamped, β falls to 0.01–0.09.
- SV-2's failures reproduce: C-F7 0.259, C-L5 0.275.

| trajectory | base | pinned | undamped pelvis term | both fixes |
|---|---|---|---|---|
| C-F7 | 0.259 | 0.027 | −0.033 | 0.009 |
| C-L5 | 0.275 | 0.056 | 0.064 | 0.088 |

- **T-1 detects a real, physically meaningful servo deficit, the uncompensated measured base motion, and it passes comfortably once the cause is removed.** No amendment is proposed.
- Its trajectory dependence (short steps fail) comes from how strongly the pelvis motion correlates with the reference acceleration.

## 6. φ = 0.80 and the clearance certificate

- The 4.977 mm what-if failure is preserved.
- The binding bin is mainly M2 (orientation) plus the onset of M1.
- With both fixes, the expected allowance shrinks enough that 30 mm would certify with margin. This is expected, not computed.
- The certificate should be revisited only after a correction is decided and a fresh servo battery is frozen.

## 7. Reachability: positional vs dynamically executable

**Finding (V2-long-legs, lateral sweep):**
- Positional reachability holds throughout: the IK residual is about 1e-16 at the decision.
- Execution runs away from 0.095 m (onset φ 0.90), and from 0.110 m at φ 0.83, both with D1 on and off.
- During wide lateral swings the floating body translates up to 32 mm forward and yaws up to 10°. The swing knee's IK target then climbs to its 70° passive soft limit late in the descent: the margin falls from 18° at φ 0.75 to 0 at φ 0.84. At that point the bounded IK becomes unreachable (residual 1e-4) and the torque runs away.
- At 0.090 m the knee peaks at 63° and nothing runs away. With the pelvis pinned, 0.110 m needs only 63.5° and is clean.
- Jacobian conditioning before the runaway does **not** separate stable from unstable cases. The undamped pelvis term moves the onset only from 0.095 to 0.100 m.

**What the certifier should distinguish:**
1. **Positional:** the existing goal and path IK feasibility, at the decision pelvis pose.
2. **Dynamically executable:**
   - (a) path IK posed at the **predicted pelvis trajectory** during the swing, plus an uncertainty envelope. The planner already predicts the CoM / DCM motion.
   - (b) a margin to the **passive soft limits** along the path, because passive tissue torque rises steeply near them.
   - (c) **torque feasibility**: gravity + D1 inertial + passive tissue torque at the predicted joint angles + servo margin, within the activation-limited capacity.
   - (d) the existing conditioning check of the rate solve.
3. The margins in (b) and (c) should be derived from the passive-torque curve and actuator capacity, not fitted to this case. Not changed now.
4. SV-2's runtime check missed this case because its IK-residual window stops at φ 0.8. An execution check must cover the whole swing to contact.

## 8. Where the correction belongs

- **(A) and (B) belong in the general swing servo.** They compensate known plant terms for any commanded swing; nothing in them is E2-specific.
- **The touchdown questions belong to touchdown / descent behaviour.** These are: contact timing and speed (the δ^0.62 law), premature load acceptance, edge vs flat landing, hand-back start state, post-contact hold and seating, and the 25 % BW concept. Even with both fixes, contact happens at φ about 0.92 at 0.04–0.05 m/s, because the zero-velocity-at-turf reference makes contact speed hypersensitive to any residual. That is a design property of the trajectory, not a tracking error, and needs its own decision.

## 9. External research

- **For (A) and (B): not needed.**
  - Singularity-robust resolved-rate compensation of measured base motion is standard: Nakamura & Hanafusa 1986; Chiaverini 1997, already the basis of `vffRate "sr"`.
  - Feed-forward of a known joint damping is plant compensation.
  - What they need is validation: the external-lift harness, prior regressions, a frozen servo battery.
- **For touchdown design: a short, targeted review is advisable before any change.** Topics:
  - human swing-foot terminal kinematics (vertical heel velocity at contact, timing of foot-flat);
  - how legged-robot controllers handle early contact: contact-seeking terminal descent, touchdown velocity shaping, compliance at touchdown;
  - the physical intent of a "placed, not slammed" bound, consistent with `TOUCHDOWN_A30_ANALYSIS_PLAN.md` §5.
  - Not started: your decision stopped before touchdown changes.

## 10. Limits and what was not done

- The floating-base remainder after both fixes (0.2–0.8 mm at φ 0.85–0.90 on the harder trajectory) is only partly attributed.
- The a-weighted form of (A) was not implemented, so its post-contact consequences are bracketed, not measured.
- Only the left leg was run (L / R were symmetric in SV-2).
- Bodies V2-165-62 and V2-198-92 cover the extremes, but not all 8 bodies were run.
- Not done: no correction implemented, no gains / apex / duration / thresholds / E2-5 changed, no battery, PG or official E2 run. Nothing pushed.

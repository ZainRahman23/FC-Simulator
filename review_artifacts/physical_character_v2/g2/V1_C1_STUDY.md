# V2-G2 preparation: V1 C1 standing / push recovery, studied as evidence only

- **Read-only study** of the frozen V1 at `11149df` (`physical-character-v1` worktree). Nothing in V1 was modified.
- **Paths:** PC = `sandbox/visual/physchar/`, RA = `review_artifacts/physical_character_v1/`. Code references are `file:line` in V1.
- **Status:** facts come from the V1 files; inferences are marked **[inference]**. The final section states what V2 takes and what it does not.

## 1. What V1 did

**Loop**
- 240 Hz, 1 collision step, 30 velocity / 4 position iterations.
- Controller every physics step. Sequence: observation (optionally delayed by a ring buffer) → BalanceController → joint targets and motor settings → Jolt (PC/pc_gatec1.js:2, 62–71).
- Engine damping 0.05 linear / angular (PC/pc_jolt.js:9–13).

**State**
- Exact, noise-free, all 14 rigid bodies. COM, velocity and angular momentum are mass-weighted sums.
- h = COM height, ω0 = √(g/h), ξ = c + v/ω0 (PC/pc_sense.js:74–78).
- Per-foot load from Newton on the foot.
- Contact hysteresis 40 / 25 N. Windowed corner-displacement slip test (pc_sense.js:18–21, 100–127).
- Two regions: the *support region* (hull of the loaded soles) and the *contact polygon* (touching points) (pc_sense.js:148–168).
- **The controller never uses the measured CoP.** It is commanded feed-forward (GATE_C1_REPORT.md:499).

**Balance law (ankle strategy)**
- ξ_ref = ankle midpoint + 0.041 m forward.
- p*_raw = ξ + kXi(ξ − ξ_ref), kXi = 0.5, about 1.5 mgh total ankle stiffness (Peterka 1.33) (pc_balance.js:55, 117, 249–258).
- p* is clamped into the support region inset by 1.5 cm. The residual r = p*_raw − p* goes to the hip strategy (pc_balance.js:56, 276–282).
- Friction cone limit only after a slip is observed (pc_balance.js:66, 265–272).

**Ground force → torques**
- Desired GRF F = W·[(c − p)/h, 1, (c − p)/h], with its line of action through the COM.
- Split by the lever rule along the foot-centre line; per-foot CoP clamped into its own hull with a 0.75 cm inset.
- Joint torques by Jᵀ over each subtree: τ_j = −Σ(cᵢ − p_j)×mᵢg − Σ(c_f − p_j)×F_f.
  - Gravity part τ_G uses p = COM projection.
  - Balance part τ_B = τ(p*) − τ_G.

  (pc_balance.js:436–466)

**Hip strategy**
- Only while r ≠ 0: τ_trunk = W·(ŷ × r).
- Capped at 0.8 × the summed stance-hip limits; off past 35° of trunk tilt (pc_balance.js:57–58, 469–476).
- Predicted capacity +4.7 / 4.9 / 4.4 cm (F / B / L) of CoP-equivalent.

**Posture**
- Desired pelvis height = ankles + 0.917 m, 2° pitch.
- Stance legs by two-bone IK from the *actual* feet; trunk held in world orientation through the stance hips (anti-jackknife) (pc_balance.js:298–374).
- Arms hang in the nominal pose; reactive arms came later (C4, off by default).

**Delivery**
- Torques become equilibrium-point offsets Δθ = τ/kp in each joint's implicit Jolt StiffnessAndDamping motor (|Δ| ≤ 0.7 rad).
- Per-axis min / max limits set each step. No raw AddTorque (BALANCE_REVIEW.md:59, M4) (pc_balance.js:540–546; pc_jolt.js:144–164).
- kp from Gate B (N·m/rad): ankle 420, knee 544, hip 630, spine 573, neck 67, shoulder 134, elbow 115.
- Stance kd = 0.3 × Gate B, blended with swing kd by foot load.
- Limits LIMITS_C1, e.g. ankle PF 150 / DF 45, roll ±35 (pc_balance.js:26–34).
- Multi-axis "budget" floor 0.25 (pc_balance.js:59, 665–672).

**Classifier / release**
- INIT → IN_PLACE → HIP → STEP_NEEDED / UNRECOVERABLE.
- Release after 62.5 ms: stiffness ramps to 30 %, 60 % of τ_G kept as tone, balance off. Re-engage gated on physics (pc_balance.js:128–164, 498–503).

## 2. V1 quiet stance

- Pelvis pitch 2°, hip flexion 8°, knee 14°, lumbar 2°, shoulder flexion 8° / abduction 12°, elbow 20°, ankle 8.1° DF.
- Feet flat, **no toe-out**, ankles **32.3 cm apart** (a rig-template artefact; V1.1 hips 18.4 cm apart gave a 4.3° splay).
- COM 4.1 cm ahead of the ankle midpoint; COM height 1.07 m; ω0 = 3.03 rad/s.
- Sources: pc_control.js:46–73; ANATOMY_V1_1_REPORT.md:12, 51, 95; BALANCE_REVIEW.md:182.

## 3. V1 C1 protocol and results

**Protocol**
- A **50 ms impulse at the pelvis COM** at t = 1.0 s; 6 s runs (pc_gatec1.js:16, 30–36, 57, 68).
- Directions F / B / R at 10–70 N·s; L at 20 / 40 / 60 only.
- Variants: 100 ms delay, weak ×0.5, strong ×3, ice μ 0.08, a μ 0.05 patch.
- Recovery = ξ ≥ 1.5 cm inside support, |v_COM| < 3 cm/s and trunk within 3°, all held 0.25 s.

**Boundaries (recovered / fell, N·s, 5 N·s grid)** (GATE_C1_REPORT.md:183–189)

| direction | recovered | fell | ideal ankle-only ceiling |
|---|---|---|---|
| forward | 60 | 65 | ≈ 52 |
| backward | 30 | 35 | ≈ 32 |
| right | 45 | 50 | ≈ 58 |
| left (coarse) | 40 | 60 | — |

Forward exceeds its ceiling via the hip strategy and a toe rise.

**Quiet stance (QS20)**
- Sway RMS 1.0 mm without delay, 6.0 mm with 100 ms delay; ankle effort 10 %.
- Human sway is 5–10 mm (V1 caveat: no noise model).
- 100 ms delay doubles to quadruples recovery times and flips lateral 45 N·s to a fall.

**Saturation**
- PF60: ankle 130 N·m (87 %).
- PB30: dorsiflexion ≈ 37 / 45 N·m.
- PR45: hip ≈ 140 N·m saturated 96 ms.
- PR50 fell with the ankle saturated 3.4 s.

## 4. What worked / failed in V1

**Worked**
- The XCoM CoP law.
- The support region separate from the contact polygon.
- LIPM GRF through the COM with Jᵀ torques over each subtree.
- Implicit clamped motors.
- A hip strategy triggered only on CoP saturation.
- A physics-driven classifier and an honest release.

**Failures fixed during C1:**
1. A toe stand was read as lost support.
2. The CoP clamp at the toe edge held the heels up.
3. Slip false positives.
4. Speculative-contact lead.
5. A delay warm-up bug.
6. A slipping foot excluded from support made the classifier give up at the start.
7. Undelayed intrinsic damping (1.0×) hid the delay; it was cut to 0.3×.
8. The first release jack-knifed the trunk to 129–136°; 30 % stiffness + 60 % tone fixed it.

**Before C1**
- Gate B's "recoveries" were 97 % produced by a pelvis support fixture.
- Ankle springs alone (1.03 mgh) toppled the body in about 5.5 s (no COM feedback) (BALANCE_REVIEW.md:52–61, 77).

## 5. V1-body-specific: not carried into V2

- the 0.357 × 0.164 m box boot (tip 0.276 m ahead of the ankle), which set the 52 / 32 / 58 N·s ceilings;
- the 32.3 cm stance and the V1.1 splay;
- the 25 % multi-axis budget floor (ankle roll ≈ ±9 N·m);
- engine damping 0.05;
- Coulomb joint friction 0.3–2 N·m;
- Gate B kp / kd values and the 0.3× stance kd;
- the constants copInset 1.5 cm, the 35° trunk guard, hipUse 0.8, the 62.5 ms confirm, release tone 0.3 / 0.6, and the step-reach placeholder;
- μ belief 0.9 (equal to the true value);
- torque limits from one 78 kg / 1.90 m male.

**V2's boundaries must come from V2's own feet and actuators. They are not targeted at V1's numbers.**

## 6. What V2 takes as physically justified (re-derived, not copied)

| V1 mechanism | V2 position |
|---|---|
| XCoM / capture-point CoP law (Hof 2005), ω0 from the COM height | **used** (re-derived; gain body-scaled and dimensionless) |
| CoP clamped to a measured support region | **used**. The region is *measured* on the V2 boot under load (G2 step 2), not assumed |
| LIPM GRF through the COM; joint torques by Jᵀ / static equilibrium of each subtree with the actual masses | **used** (V2 inverse statics with d'Alembert terms) |
| Implicit, clamped Jolt motors (no raw torques) | **used**, but in a parallel actuator constraint whose limits are exactly the §14 capacity (see DECISIONS G2-A1) |
| Hip strategy only when the CoP saturates | **only if measured need** (development step 7) |
| Stance legs referenced to the actual feet; trunk held in world orientation | **evaluated** against a joint-space posture preference |
| Physical-state classifier; release with tone | **classifier used for reporting** (quiet / recovery / step required / fall). Release behaviour is decided by evidence in G2 |
| Delay on sensing only | report-only sensitivity (latency / noise not numerically specified in V2) |
| Equilibrium-point feed-forward | not needed. V2 writes the feed-forward torque into the implicit motor exactly (target-velocity encoding, G1) |
| Gate B gains, budget floor, V1 constants | **not used** |

## 7. Relevant V1 lessons

- **L1:** physical authority from day one.
- **L2:** one actuator arbiter with a ledger.
- **L3:** separate intent from truth.
- **L4:** anatomy before control.
- **L13:** determinism and hashes.
- **L16:** commanded vs achieved, at matched states.
- **L17:** instrument impulse, including engine damping.
- **L21:** hard limits are a hidden resistance path.
- **L22:** physics is the CPU bottleneck.
- **L24:** don't rescue an honest boundary, and don't call an undramatic physical outcome a failure.

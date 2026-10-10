# ITS-1: interaction-time physics vertical slice, preregistration (frozen before any ITS-1 code or physics run)

- **Source:** `../sources/2026-10-10_user_decision_interaction_time_physics_pivot.md` (2c6900de).
- **Contract:** `ITS1_CONTRACT.md`.
- **Question:** can V2 be **initialized at a meaningful interaction state** and produce a credible, deterministic, simulation-neutral physical response to an authoritative football collision?
- **Not the question:** whether V2 can run.

**Disclosed before freezing:** a read-only geometric probe (no physics stepped) of the law pose at the four initialization times. It found:
- joint-anchor continuity 0 mm;
- zero projection clamp;
- stance-boot lowest point +3.3 / −3.8 / −13.4 / +20.3 mm (S-A / S-B / S-B2 / S-Cair);
- minimum self-separation 53 – 97 mm.

These facts fixed the design of E-2 below. No outcome was observed.

## 1. Authoritative inputs

The frozen IB-1 records (`../interaction_benchmark/records/v13/*_OFF.json.gz`, checked by `ib_verify.mjs`), read deep-frozen.

| state | case (IB-1) | contact used (event tick / sub → τ_c) | struck segment → V2 body | support at τ_c | J (N·s), normal (sim x, y) | init τ_0 |
|---|---|---|---|---|---|---|
| **S-A** | rx_free_leg (IB1-FL) | 60 / 3 → **59.75**, decisive STUMBLE | toe_R (swing) → foot_R | SINGLE_L | 3.63, (−0.955, −0.296) | 59.50 |
| **S-A2** | rx_free_leg | 51 / 1 → **50.25**, CORRECTION (first contact) | foot_L (swing) → foot_L | SINGLE_R | 2.82, (0.271, 0.963) | 50.00 |
| **S-B** | rx_planted_leg (IB1-PL) | 49 / 3 → **48.75**, FALL SIDE | shin_L (planted) → shank_L | SINGLE_L | 144.13, (0.059, 0.998) | 48.50 |
| **S-B2** | rx_glancing (IB1-PG) | 66 / 3 → **65.75**, FALL SIDE | shin_L (planted) → shank_L | SINGLE_L | 79.28, (0.393, 0.920) | 65.50 |

- S-A2 and the matched airborne member of C share the same initialized state (rx_free_leg at τ_0 50.00); it is called **S-Cair** when used in C.
- **Double-counting guards:**
  - **S-A:** the earlier CORRECTION contact (τ 50.25, J 2.82) is represented only through the authoritative state at τ_0 (vA = (2.753, −0.020)). Its impulse is not applied.
  - **S-A2:** the later STUMBLE contact (τ 59.75) is outside its response window (§5) and is never applied.
  - **All states:** the simulation's own post-contact response (its root trajectory and reaction state after τ_c) is never read by the physics.
  - **No physical tackler body exists** in the world, so no second runner–tackler contact can occur.

## 2. Initializer (new: `scripts/its_init.mjs`)

**Pose (E-1).**
- The simulation's own collision-skeleton pose at τ_0, from `law_provider.makeLaw(R).at(τ_0)` (V1.3 `ptRxBodyChar`; K0 bit-exact against `simBody`).
- Mapped to V2 by the PI-1 mapping (R-K knee, projection with hard-box clamp; no foot reconciliation).
- Recorded: per-joint clamp, joint-anchor continuity, and the differences from the presentation (§6).

**Grounding (E-2).**
- One whole-body vertical shift Δy puts the stance boot's lowest point at +0.5 mm. This is the G1 placement convention (`lift 0.0005`).
- Δy and every body's lowest point after the shift are recorded.
- No joint is changed to ground the foot.

**Velocities (E-3).**
- Unknowns: generalised velocities u = pelvis linear (3) + pelvis angular (3) + per-joint relative angular velocity (3 each; the locked elbow / knee z component fixed at 0).
  - Body twists follow by joint-consistent kinematics: v_c = v_p + ω_p × (j − c_p) + ω_c × (c_c − j).
  - Every joint anchor and locked axis is therefore exactly consistent.
- **Reference field:** the law's own body velocities, from a central difference at τ_0 ± 0.25 (same-row rule, the law provider's `center` argument).
- **Solution:** the reference projected in the kinetic-energy metric, min Σ_i m_i|v_i − v_i^ref|² + (ω_i − ω_i^ref)ᵀ I_i (ω_i − ω_i^ref), subject to four hard constraints:
  - **(c1)** stance-foot twist = 0 (linear 3 + angular 3);
  - **(c2)** total horizontal momentum = M_V2 · v_auth, where v_auth is the authoritative runner velocity at τ_c (event `vA`);
  - **(c3)** vertical COM velocity = 0;
  - **(c4)** angular momentum about the COM = (0, I_yaw · ψ̇_auth, 0), where ψ̇_auth = the authoritative facing rate (row difference × 60) and I_yaw = the whole-body yaw inertia at τ_0.
- Solved as one KKT system. Recorded: residuals, the KE-metric distance, per-body velocity changes, and the reference's own vertical COM velocity and L (for comparison with c3 / c4).

**Writes.** One `setPose` and one `setVel` per body (28 counted authority writes), at τ_0 only.

## 3. Collision application (E-4)

- **Impulse vector:** J · n̂ in the physics frame. The normal is the event's horizontal `normal`. Jfric = 0 in all four events, so the impulse is horizontal.
- **Application point:** the event's `point`, carried into the struck V2 body's frame using the law pose at τ_c. It is applied at that body-fixed point on the physical body.
  - Recorded: its signed distance to the struck body's surface (`sdShape`) and to every other body.
- **Timing:** constant force F = J n̂ / dt for **exactly one physics step**, the step that starts at τ_c (4.17 ms), through the G2 test-force path (`addForceAt`, ledgered).
- **Guards:** a one-shot flag, plus the ledger check (the applied external impulse must equal the request; §7 PF-1).
- **Lead:** τ_0 = τ_c − 0.25, so one free physics step precedes the impulse (it settles the turf manifold).

## 4. Plant and controller (reused unchanged)

- **Body:** V2 runner D-1 (`spec/v2_pi1_runner.js`, rigid F0 boot, ankle K 0.13, v2k knee).
- **Plant:** the G2 plant, constructed exactly as REV2 `PI1Sim` constructs it (`gates/v2_g2.js`): G1 world, passive tissue, contacts, `ActuatorLayer`, 240 Hz, 150 / 2 iterations, plane turf.
- **Controller:** the REV2 `PostureDriver` (`pi1/rev2/scripts/pi1_rev2_sim.mjs`).
  - Targets are frozen at the initialized joint configuration in **every** run.
  - Stance / swing gains and gravity statics come from the physical foot contacts.
  - There is no outcome-dependent switching.
- **Absent:**
  - **no B support** (except diagnostic D-1);
  - no carrier, no A field;
  - no stand-in;
  - no locomotion or recovery.
- **Measurement:** read-only ankle probes (`gates/v2_g1_ankle.js`), shown read-only by PCS-1 K4b.

## 5. Runs

**Controls** use the same initialized state with no impulse. Each run is one process.

| ID | state | impulse | role |
|---|---|---|---|
| A-ctl / **A** | S-A | none / authoritative | question A: swinging-leg impact (decisive) |
| A2-ctl / **A2** | S-A2 | none / authoritative | question A replication (first contact) |
| B-ctl / **B** | S-B | none / authoritative | question B: planted-leg sweep |
| B2-ctl / **B2** | S-B2 | none / authoritative | question B replication |
| **C-hi-air** | S-Cair (= S-A2 state) | S-B's impulse vector (144.13 · n̂_B) at S-B's contact point expressed in shank_L's frame | question C, airborne member |
| **C-hi-pl** | S-B | the same | C, planted member (identical to run B; run once more as its own process) |
| **C-lo-air** / **C-lo-pl** | S-Cair / S-B | 2.82 · n̂_B at the same shank_L point | C at the small magnitude |

**Diagnostics** (reported, not gating):

| ID | what it tests |
|---|---|
| D-1 (A+B) | S-A with the existing `SupportLayer` at its frozen REV2 caps and gains, toward the authoritative root trajectory (current row only), with its own control: does a recovery support cancel the collision? (RC-3 ratio) |
| D-2 | A and B with the impulse spread over 4 steps (16.7 ms): impulse-duration sensitivity |
| D-3 | A and B with lead 0 (τ_0 = τ_c) and lead 4 (one tick): activation-timing sensitivity |

**Repeatability:**
- every primary run (the 4 controls, A, A2, B, B2, and the 4 C members) runs twice, in separate processes;
- A-ctl then A, run in one process, must equal the fresh runs (history independence).

**Horizons** after τ_c:
- 1.0 s for A, A2 and C;
- 1.5 s for B and B2;
- controls use the same horizon as their struck run.

**Windows:**
- W_valid = [τ_0, τ_0 + 0.15 s] (activation validity);
- W_resp = [τ_c, τ_c + 0.15 s] (collision response).
- Beyond W_resp, everything is reported only: there is no locomotion, so every control eventually diverges.

## 6. Captured per run

- **Authoritative inputs:** the interaction, outcome class and reaction timeline; τ_c.
- **Initialization:** the state (per body pose and velocity), E-1 … E-4 values, and its differences from the presentation pose at τ_0. The presentation is V1.3 LOCO and LC-1 LOCO, interpolated between rows, mapped by the PI-1 mapper (R-K, RF-1). Recorded: per-joint position difference, pelvis height, foot-contact flags.
- **Contact:** the V2 body, the application point (world and local), its surface distance, the normal, and the pre-impulse relative velocity at the point (physical runner point vs event `vT`) against the event's vn / vt.
- **Impulse:** requested vs applied (ledger), and the whole-body momentum change against the control.
- **Momentum:** per-body linear momentum, and angular momentum about the whole-body COM, before the impulse and at +1 step, +0.05 s, +0.10 s, +0.15 s, +0.50 s; totals per step.
- **Trajectories:** COM and pelvis per step.
- **Joints:** per-joint angles and hard-limit margins per tick; G1 joint-separation and hard-exceed accumulators.
- **Actuators:** torque / capacity per axis, saturation counts. B use (D-1 only).
- **Feet:** per foot, turf manifold, contact-point slip, lowest point, probe contact impulse.
- **Support loss:** the first of (i) stance foot without a turf manifold for ≥ 3 consecutive steps, or (ii) cumulative stance-foot slip ≥ 30 mm.
- **Fall / turf contacts:** first non-foot turf contact (body, τ); pelvis COM height; the fall detector (pelvis COM ≤ 0.35 m, FL-3 threshold).
- **Energy ledger:** per-step residual (E − E_prev) − (W_act + W_impulse − D); Σ+.
- **Determinism and CPU:** per-step state digests; CPU per step by component (Jolt step, passive + actuators + impulse, posture driver, ankle probes, harness measurement).

## 7. Pass / fail (frozen)

### PF-0, activation validity

Each state's control run, over W_valid. **If any state fails, STOP before any struck run** and identify the failing subsystem (initializer geometry, initializer velocity, contact / solver, controller).

| row | requirement | source |
|---|---|---|
| V-1 | after E-2, no non-stance body below the turf; self-separation ≥ −10 mm | CG-8 |
| V-2 | E-3 constraint residuals ≤ 1e-9; joint-anchor velocity continuity ≤ 1e-9 m/s | construction |
| V-3 | over the first 0.05 s: maximum body position correction ≤ 1 mm; energy residual Σ+ ≤ 0.5 J; stance-foot turf normal impulse per step ≤ 2·M·g·dt | PR-3, PR-4 |
| V-4 | over W_valid: no non-foot turf contact; the stance foot keeps a turf manifold on ≥ 90 % of steps; cumulative stance-foot slip ≤ 10 mm; pelvis COM height ≥ 0.85 × initial; finite | NM-2 slip value; RC-4 height value |

### Struck runs (A, A2, B, B2, C)

| row | requirement |
|---|---|
| **PF-1** impulse exactly once | ledger external impulse = requested vector (\|Δ\| ≤ 1e-9 N·s) in exactly one step; on the mapped body; application point within 20 mm of that body's surface; no other external force or torque; authority writes after init = 0 |
| **PF-2** visibly physical (RC-2 values; authoritative runs A, A2, B, B2) | (a) struck-body COM Δv in the impulse step, relative to the control, ≥ 0.2 m/s and within 45° of the impulse direction; (b) the application point deviates ≥ 30 mm from the control within W_resp |
| **PF-3** propagation integrity (all struck runs, over W_resp) | (a) momentum closure per step: \|ΔP − (J_applied + ΣJ_foot-contacts + M·g·dt)\| ≤ 0.01 N·s, while only feet touch the turf; (b) maximum joint separation ≤ 1 mm; (c) energy residual Σ+ ≤ 0.5 J over [τ_c, τ_c + 0.05 s] and ≤ 5 J over the horizon; finite; turf penetration ≤ 10 mm; self-penetration ≤ 10 mm |
| **PF-4** no artificial cancellation (primary runs) | the only artificial external input is the collision impulse (ledger and code path). The posture-tone actuators (internal, capacity-limited) are reported. D-1 reports the RC-3 ratio for B. |
| **PF-5** determinism | separate-process repeats: identical per-step state digests at every step, and identical output hashes; history independence: identical digests |
| **PF-6** neutrality | `ib_verify.mjs` V1 – V6 pass after all runs; records deep-frozen; no tracked file outside `interaction_time/` changed; no `Math.random` / `Date` in the ITS-1 physics path (static check) |
| **PF-7** matched comparison C (each magnitude) | (i) **identity:** the configuration hash (body, plant, controller gains, impulse vector, application point in shank_L's frame, duration, horizon) is equal across the pair; the physics receives no outcome or support field (static check). (ii) **differentiation** on ≥ 2 of S1 – S3, below. |

**PF-7 signatures:**
- **S1:** effective mass at the struck point along the impulse, m_eff = \|J\| / Δv_point·ĵ (relative to the control, first step). The members differ by ≥ 25 %.
- **S2:** support. Within 0.5 s of τ_c, one member loses the struck-side support (§6 definition) while the other keeps its stance support as long as its own control does (± 0.05 s).
- **S3:** pelvis velocity change along the impulse at τ_c + 0.10 s, relative to the control. The members differ by ≥ 25 %.
- The direction of every difference is reported.

**Outcome agreement** (reported, never tuned):
- **A / A2:** the authority says no fall (STUMBLE / CORRECTION). Agreement = the struck run neither falls nor loses stance support earlier than its control.
- **B / B2:** the authority says FALL SIDE. Agreement = support loss and a fall (non-foot turf contact or pelvis COM ≤ 0.35 m) within 1.5 s and earlier than the control.
  - Reported: the fall direction vs the impulse direction and the record's `az`; and timing vs the simulation's tGround.

**The slice is demonstrated if** PF-0 holds for every state, PF-1 … PF-6 hold for every primary struck run, and PF-7 holds at both magnitudes. Outcome agreement is reported, not gating.

## 8. Old gates and components (explicit)

**Not applicable** (their purpose was sustained pre-contact locomotion or presentation-frame promotion):

| gate | why it does not apply |
|---|---|
| HG handoff gate (P-1 … P-17, HG-A v1 / v2 on presentation velocities, HG-T, HG-D) | ITS-1 initializes at contact from authoritative quantities. HG-A v2's principle (exact M·v_auth) is kept inside E-3 c2. |
| D-5 lead ≥ 6 ticks; long-lead coherence; NM-1 … NM-4; K0 – K5; PCS-1 criteria 1 – 9; LC-1 criteria | sustained pre-contact physical locomotion |
| PR-1 / PR-2 / PR-2 v2, CG-7 / PCG-F0, AH-1, RF-1 | presentation-transition requirements, deferred to hand-back / integration (not solved here, per instruction) |
| CG-5 / CG-6, AST-C1 | no physical tackler or stand-in |
| CG-1 / CG-3 / CG-4 | satisfied by construction; checked inside PF-1 |
| NM-3, RC-5, DG | hand-back, deferred |
| RC-4 vs stream A | replaced by outcome agreement vs the authority |
| FL-2 (no B) | — |
| FL-4 | perturbation sensitivity, deferred |

**Inherited** (they test interaction-time validity):
- PR-3, PR-4 (as V-3);
- the count of initialization writes (PR-5 analogue);
- RC-2 (PF-2);
- RC-3 (D-1);
- the FL-3 fall threshold, FL-6 integrity (PF-3);
- CG-8;
- NT-1 … NT-4, DT-1 … DT-3, DT-5.

**Reused unchanged:**
- `spec/v2_pi1_runner.js`;
- `gates/v2_g2.js` (G2Sim and its ledger);
- `pi1/rev2/scripts/pi1_rev2_sim.mjs` (`PostureDriver`);
- `ctrl/v2_supported.js` (`SupportLayer`, D-1 only);
- `gates/v2_g1_ankle.js` (`AnkleProbe`);
- `promotion_carrier/slice/scripts/law_provider.mjs`;
- `pi1/scripts/compat_lib.mjs` helpers;
- `pi1/rev1/scripts/pcg_rev1.mjs` `makeMapper` (presentation comparison only);
- IB-1 records and `ib_verify.mjs`;
- V1.3 at 5042230 (read-only, via a detached worktree).

**New** (`interaction_time/scripts/`): `its_init.mjs`, `its_sim.mjs`, `its_run.mjs`, `its_eval.mjs`.

## 9. Stop rules

1. PF-0 fails for any state → stop before the struck runs.
2. Any struck run is non-finite, or has joint separation > 10 mm → stop and report the subsystem (solver).
3. **No tuning.** Nothing in the initializer, controller, impulse application, windows or thresholds changes after any ITS-1 physics output. An implementation defect found before evaluation is fixed only as a disclosed amendment, with every affected run repeated.
4. After the matrix, stop for review. No reconciliation / hand-back, recovery, broader coverage or integration.

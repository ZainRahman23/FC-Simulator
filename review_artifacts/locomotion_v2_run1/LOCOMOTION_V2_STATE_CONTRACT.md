# Locomotion V2 → Physical Character V2: the locomotion-side state contract (LV2-STATE-1)

**Status: FROZEN with the Locomotion V2 straight-line baseline (10 Oct 2026).** This is the document Physical Character V2 consumes.

- **Owner:** this worktree (`prototype/locomotion-v2-run1`) owns the locomotion contract; Physical Character V2 consumes it. Nothing on the Physical Character side is implemented here.
- **The baseline:** `LOCOMOTION_V2_STRAIGHT_BASELINE.md`.

**What it answers.** The RUN-1-side rows R-0…R-8 of the Physical Character V2 draft (`physical-character-v2 @ 14b5cbaa`, `interaction_time/run1_handoff/RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT.md` §2.1), plus the user's list of 10 Oct:
- regime and blend;
- gait phase;
- root position and velocity;
- facing and its rate;
- pelvis pose and velocity;
- the complete joint pose and joint angular velocities;
- stance / swing / flight;
- the planted foot;
- foot positions, orientations and velocities;
- the COM quantities that are available;
- commanded and current speed and acceleration.

**What it does not do.** It does not decide the draft's V-* (V2-derived) or S-* (simulation-authoritative) rows, its preconditions H-1…H-5, or its open decisions. Where the locomotion side bears on one of them, the facts are in §6.

## 1. The pieces (pin these)

| piece | file | role |
|---|---|---|
| **The baseline** | `sandbox/visual/run1/run1_gait_v13.js` (global `RUN1_V13`) | The frozen locomotion: `run1_gait.js @ bdab1f5f` verbatim, the implementation that rendered the approved archival clips. Never edited. |
| **The state contract** | `sandbox/visual/run1/lv2_state.js` (global `LV2_STATE`, id **LV2-STATE-1**) | Read-only queries over the baseline. |
| Contract checks | `sandbox/visual/run1/tools/lv2_state_check.cjs` | HT-2 / HT-3 / HT-4 / HT-7, R-0 / R-1 / R-2 / R-4, determinism (§5). Results: `baseline/final/state_contract_check.txt` / `.json`. |
| Dependencies | `sandbox/visual/anim3d/m4.js`, `skeleton.js`, `of_rig.js`, `of_character.js` (`ofCharSkeleton`) and the rig `assets/characters/outfield/vinicius/rig.json` | M4 math and the character bind. |

- **Pin to the freeze tag `locomotion-v2-straight-baseline-1`** (the freeze commit; see the baseline document).
- This worktree keeps evolving `run1_gait.js` for future locomotion work, so consume a **`git archive` of the tag**, not the live tree. The draft already does this for its probes.
- **Load order** (browser `<script>` or one Node `vm` context, as `tools/run1_load.cjs` does): `m4.js`, `skeleton.js`, `of_rig.js`, `of_character.js`, `run1_gait_v13.js`, `lv2_state.js`.

## 2. Use

```js
const E  = RUN1_V13;                                                  // the frozen baseline API
const sk = Object.assign({}, ofCharSkeleton({ rig })); delete sk._r1body;   // own skeleton copy (versions cache on skel._r1body)
const A  = E.r1Make(sk);                                               // one actor per player
// the presentation advances A on ONE of its two integration paths (whichever the runtime renders):
//   replay:      const restore = E.r1Replay(A, vOf, aOf, t); … render … restore();   (fixed 1/240 s grid from t = 0; the viewer)
//   incremental: E.r1Advance(A, v, dt, a)                                              (one call per frame)
const s  = LV2_STATE.query(E, A, sim);                     // the state A holds NOW; sim = the authoritative input at the same time
const s2 = LV2_STATE.queryAt(E, A, simAt, tau, vOf, aOf);  // the state at authoritative time tau, sub-tick (R-1)
const c  = LV2_STATE.continuation(E, A, simAt, [t1, t2], vOf, aOf);   // R-8, diagnostics only
```

**Authoritative input** `sim = { x, y, heading, v, a?, yawRate?, vx?, vy? }`:
- `x, y`: pitch metres; `heading`: rad; `v`: m/s; `a`: m/s², the authoritative acceleration; `yawRate`: rad/s; `vx, vy`: pitch m/s.
- `simAt(t)` returns that object. `vOf(t)` / `aOf(t)` are the authoritative speed and acceleration profiles, the same ones the presentation was advanced with.

**Guarantees:**
- **Pure.** No query modifies `A`, the baseline or the simulation (HT-4). It works on its own gait object or on a clone. The only shared write is the baseline's own speed-grid cache on the body: filled deterministically on first use, exactly as rendering fills it.
- **Constant cost in match time.** `query` ≈ 0.2 ms. `queryAt` within a grid step of the actor ≈ 1 ms, the same at t = 5 s and t = 300 s. The one exception is a declared fallback: a `queryAt` *before* the actor's committed time re-runs the replay from t = 0, and says so in `method.path`.
- **The rendered integration path.** `queryAt(τ)` reproduces, on a clone, exactly the arithmetic the rendering path uses up to τ. The replay grid with a final partial step, or one incremental step. Verified equal to the actor replayed to τ: 0 m difference (R-1).
- **Numerics.** Deterministic, with no RNG and no clock; float64 throughout; root-relative, with world values composed in float64. The draft's 12 mm/s float32 quantization at x = 100 m does not occur (R-2).

## 3. Frames, units, methods

**Frames:**
- **root:** the character root. +x = the runner's right, +y = up, +z = the direction of travel. Origin on the turf under the root, which the simulation owns.
- **world:** anim3d. x = pitch x, y = up, z = −pitch y.
- **pitch:** x east, y south, metres.

**Units and conventions:**
- Rotations are 3×3, row-major, mapping body → frame.
- Angles are in rad; positions m; velocities m/s.
- Angular velocities are vectors in the stated frame, rad/s.
- Bone positions are joint origins; `tip` = joint + R · (bind direction × bone length).

**Methods** (each value states its own, in `method` and the per-block fields):

| method | used for |
|---|---|
| **authoritative echo** | root position, velocity (`vx, vy` if given, else v·heading), heading, yaw rate (if given), speed, acceleration. RUN-1 owns none of them. |
| **analytic** (closed form of the construction) | gait phase and its rate; the spring-mass pelvis vertical (y, ẏ, ÿ) and the model's vertical force; pelvis sway / tilt / obliquity / yaw and their rates (pelvis twist); swing-phase joint-channel rates (the exact Hermite derivative × dw/dt); the acceleration-lean rate (its filter's continuous form). |
| **pose-function derivative** | joint linear and angular velocities (root and world), foot / toe / tip velocities, the pivot's material velocity, the diagnostic COM velocity. A central difference at h = 0.1 ms of the **continuous closed-form pose**, the same function the renderer evaluates: advanced in gait phase, plant travel, speed (v + a·dt) and acceleration lean. It is one-sided, second order, when a **declared event** lies inside ±h. Never rendered frames, never float32. |
| **stance-solution derivative** | stance-phase joint-channel rates: a central difference in stance fraction (ds = 1e-5) ÷ contact time. |

**Declared events.** Velocity is not continuous across these, so no stencil straddles them:
- each leg's **touchdown** and **toe-off**;
- each stance's **heel-rise onset**. The foot leaves flat at a finite pitch rate: 9–89 °/s, so the knee rate steps too (baseline document, limitation 4).

## 4. Field reference (`LV2_STATE.query` result)

| block / field | content | method | answers |
|---|---|---|---|
| `contract`, `provenance` | LV2-STATE-1; implementation `RUN-1.3 @ bdab1f5f`; `paramHash` (all regime parameters, the grid, the step); rig id `vinicius` and `bindHash` (23 bones, offsets, directions, lengths, stature, ankle height, leg length); the ladder and anchor speeds; the grid | — | R-0 |
| `input.echo`, `input.bits` | the authoritative input exactly as given, plus each number's float64 bit pattern | echo | R-0, HT-7 |
| `time`, `method` | the actor clock of the sample; the derivative method used (central or one-sided, h); `method.path` for `queryAt` (replay grid / incremental / fallback) | — | R-1 |
| `regime.weights` | blend weights over **LOW / JOG / FAST RUN / ALL-OUT** at the commanded speed (they sum to 1) | analytic (the parameter blend) | regime + blend |
| `regime` (other fields) | `dominant`; `allOut` weight; `anchorSegment` {from, to, t}; `gridCells` {vLo, vHi, frac}: the pose interpolates the two solved grid cells; `range`: inside the ladder, or outside with the parameters held | analytic | regime + blend |
| `gait.phase`, `phaseRate`, `source` | stride phase u ∈ [0, 1) with right touchdown at 0 and left at 0.5; du/dt = 1 / stride time; **source: RUN-1's own cadence (not simulation-locked)** | analytic | gait phase, R-5 |
| `gait` (timing) | `strideTime`, `stepTime`, `cadence` (steps/s), `contactTime`, `flightTime`, `duty`, `stepLength` | analytic | R-5 |
| `gait.support`, `plantedFeet` | `stance-R` / `stance-L` / `flight` (running has no double support at these duties); the planted feet | exact | stance / swing / flight, planted-foot identity |
| `root` | `position` and `rotation` (world, float64), `pitch` {x, y}, `heading`, `linearVelocity`, `speed`; `yawRate` with its source: authoritative, or "assumed 0 (straight-line baseline)" | authoritative echo | root position / velocity, facing + rate, R-7 |
| `speed` | `commanded` (input v); `authoritativeAcceleration`; `lastAdvanced` (the speed of the actor's last advance); `filteredAcceleration`; `accelerationLeanDeg` and `accelerationLeanRateDegS`; the lean model; `accelerationRegime: none` | echo / exact / analytic | commanded / current speed and acceleration, R-7 |
| `pelvis.root`, `pelvis.world` | position, rotation, yaw / tilt / roll and their rates, linear and angular velocity | analytic | pelvis pose + velocity, R-4 |
| `pelvis.springMass` | `height`, `verticalVelocity`, `verticalAcceleration`, `verticalForceBW`: the model's vertical ground force ÷ body weight, 0 in flight; force skew; model text | analytic | R-4, whole-body vertical |
| `joints[23]` | per bone (rig order): `name`, `parent`, `localRotation` (the pose's own local rotation; bind = identity); `root` {position, rotation, linearVelocity, angularVelocity, tip, tipVelocity}; `world` {the same} | pose; pose-function derivative | complete joint pose, joint angular velocities, R-2, R-3 |
| `legs.R` / `legs.L` | `stance`, `ul` (leg phase), `s` (stance fraction) or `w` (swing fraction), `sinceTouchdown`, `toToeOff`, `toTouchdown`; `channels` (RUN-1's leg angles: leg yaw ψ, adduction a, flexion h, knee k, foot yaw / pitch / roll, toe); `channelRates` and `channelRateMethod` | exact; analytic / stance-solution derivative | R-5 |
| `legs.*.foot`, `legs.*.toe` | ankle and MTP joint positions, rotations, toe tip; linear and angular velocities (world, plus root frame) | pose-function derivative | foot positions / orientations / velocities |
| `legs.*.mtpExtension` | MTP dorsiflexion of the toe segment relative to the foot | exact | R-6 |
| `legs.*.contact` (stance) | `subPhase`: forefoot landing (heel lowering about the MTP joint) / flat / heel-up (about the MTP joint, toe flat) / toe pad (toe rolling about the pad); `pivot` (MTP joint / sole / toe pad / heel); `pivotPoint`, `pivotPitch`; `pivotMaterialVelocity` (≈ 0: HT-3); `soleGround` (heel, under-MTP, toe-pad turf points); `mtpJoint`; `footPitch`; `mtpExtension`; `toeSegmentPitch` | exact geometry of the stance model | R-6 |
| `legs.*.contact.plant` | the flat-foot ankle point in world and pitch coordinates, plant yaw (heading + toe-out), the runtime plant record, its form | exact | planted foot, R-6 (world-space plant) |
| `legs.*.contact` (swing) | `subPhase: swing`, `clearance` (the lowest boot point above the turf: ankle-height model) | exact | — |
| `com` | **diagnostic only**: segment-mass COM (V2 generator fractions, segment centre = joint→tip midpoint), position and velocity, root and world | pose-function derivative | COM (diagnostic; V2's mass model is the source, as the draft states) |

Not in the contract, owned elsewhere:
- **mass, inertia, momentum, angular momentum:** V2 (V-b);
- **the contact decision, the facing rate's authority, the stride clock's authority:** the simulation (S-*).

## 5. Validation on the frozen baseline (`baseline/final/state_contract_check.txt`)

| check | result |
|---|---|
| **HT-4** purity | actor state hash and rendered pose hash unchanged across queries |
| **HT-4** cost | query ≈ 0.2 ms; `queryAt` ≈ 0.9–1.3 ms, the same at t = 5 s and 300 s |
| **HT-7** input echo | bitwise (float64 bit patterns echoed) |
| **R-0** provenance | stamped |
| **R-1** `queryAt(τ)` = the rendered replay state at τ | 0 m difference over 92 joint samples |
| **R-2** float64 pose vs the rendered float32 pose | ≤ 6 µm at x ≈ 100 m. That is float32 quantization of the rendering, not of the contract. |
| **HT-2** exported velocities vs an independent float64 difference of exported poses (`queryAt` τ ± 0.1 ms, replay path), 240 samples × 23 bones per profile | 3.0 / 5.5 / 7.8 / 9.5 m/s: ≤ 5 × 10⁻⁹ m/s and ≤ 10⁻⁴ rad/s. Ramp 6 → 9.5 m/s at 1.6 m/s²: p99 0.001 mm/s, max 0.09 mm/s, 0.0002 rad/s. |
| HT-2: samples on the ramp with a touchdown inside the replay's uncommitted partial step | 4, measured separately: the replay plant re-derives at ~27 mm/s for ≤ 4.17 ms, i.e. ≤ 0.1 mm. A presentation transient; the contract holds the plant fixed (baseline limitation 6). |
| **HT-3** pivot material velocity while planted | MTP joint ≤ 0.02 mm/s, toe pad ≤ 0.02 mm/s, flat sole 0.00 mm/s, at 3.0 / 5.5 / 7.8 / 9.5 m/s and on the ramp |
| **R-4** analytic pelvis ẏ vs the pose function | ≤ 4 × 10⁻⁶ m/s |
| Diagnostic COM, stride mean − root velocity | ≤ 10⁻⁴ m/s |
| Touchdown position step between grid speeds | ≤ 0.044 mm (7.8 m/s); 0 at grid speeds (report only) |
| Determinism | identical state hash across two fresh loads |

## 6. Locomotion facts for the open handoff decisions (re-measured on the frozen baseline)

The draft measured RUN-1 at 949bd763 and asked for every number to be re-measured on the frozen baseline. Here they are (§4 of the draft):

| | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| steps/s · duty · contact / flight | 2.75 · 0.344 · 250 / 114 ms | 3.20 · 0.280 · 175 / 137 ms | 4.04 · 0.244 · 121 / 127 ms | 4.55 · 0.232 · 102 / 118 ms |
| support: stance / flight share of time | 0.68 / 0.32 | 0.56 / 0.44 | 0.49 / 0.51 | 0.46 / 0.54 |
| stance sub-phases: forefoot landing / flat / heel-up / toe pad | 0.13 / 0.17 / 0.60 / 0.10 | 0.13 / 0.18 / 0.49 / 0.19 | 0.15 / 0.02 / 0.61 / 0.22 | 0.15 / 0.13 / 0.53 / 0.20 |
| stance with MTP extension > 5° / > 15° | 52 % / 33 % | 57 % / 39 % | 59 % / 44 % | 56 % / 42 % |
| model vertical force, peak | 2.38 BW | 2.92 BW | 3.39 BW | 3.56 BW |
| pelvis vertical velocity range | −0.81 … +0.70 m/s | −0.84 … +0.74 | −0.74 … +0.66 | −0.67 … +0.60 |

**What these mean for the handoff:**
- **Every RUN-1.3 landing is a forefoot landing.** The heel is up at touchdown and lowers about the MTP joint; there is no heel-first strike in the ladder. So the draft's "heel roll" share is RUN-1.3's "forefoot landing" share.
- **The rigid-foot question (the draft's open decision 3) remains.** The whole foot is on the turf or lowering onto it (forefoot landing + flat) for 31 % of stance at LOW, 31 % at JOG, 17 % at FAST RUN and 27 % at ALL-OUT. For the remaining 69–83 % the heel is up and only the toe segment is on the turf (heel-up, then toe pad).
- **H-1, stride-clock ownership, is unchanged and open.** RUN-1 runs its own cadence: at 3.0 m/s, 2.75 steps/s and duty 0.344, against the draft's simulation clock of 3.21 / 0.420. The contract exposes the clock and its source. Locking it to the simulation would be a later locomotion change, not part of this freeze.
- **v_auth vs COM (open decision 2).** The pelvis travels at exactly the root speed. The diagnostic COM oscillates about it, with a stride mean equal to the root velocity to 10⁻⁴ m/s. The within-stride deviation is in `com.world.linearVelocity`; V2's own mass model decides the real one.
- **Source vertical (open decision 4).** The analytic spring-mass vertical is available and gravity-consistent: ballistic in flight, `verticalForceBW` 0.

## 7. Versioning

- LV2-STATE-1 is frozen with the baseline.
- Any change to field meaning, method or frames is a new contract id. Additive fields may be added under a new id only.
- The baseline file never changes. A future locomotion version gets its own frozen copy and its own contract revision.

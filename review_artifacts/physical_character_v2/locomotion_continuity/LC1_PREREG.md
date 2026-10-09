# LC-1: locomotion-presentation continuity slice. PREREGISTRATION (frozen before any implementation)

**Authority:** `../sources/2026-10-09_user_decision_locomotion_continuity_slice.md` (df28867).

**Status:** the criteria (§4), the evaluation procedure (§5–§7) and the stop rules (§9) are frozen at the commit that adds this file. The design (§3) states intent and rules; implementation constants that change during development are recorded in the implementation-freeze commit, before the official evaluation. A criterion is never changed after its result is seen; a later correction is an amendment, labelled as such, with the original result kept.

**HG-A v2** stays adopted as recorded in `../pi1/hga/HGA_V2_ADOPTED.md` (cf144e8), with its reasoning and evidence. Nothing here changes it.

## 1. Scope and constraints

**What is changed:** only the locomotion **presentation**, on a new branch `prototype/locomotion-continuity-v1` cut from V1.3 (5042230). Nothing else.

**Unchanged:**
- gameplay outcomes and the simulation trajectory;
- every simulation file (`match.js`, `pt_*.js`);
- V2 anatomy, F0, Jolt configuration, collision thresholds, PI-1 contact geometry;
- the 30 / 10 mm limits and every REV2 criterion other than HG-A (v2, already adopted) and PR-2 (§3.6).

**The shared law is simulation code.** Since V1.3, the simulation's runner collision legs (`ptRxBodyChar`, CHARCOLLIDE-1) are built from the same pure functions the presentation uses: `ofLocoCycle` (with `ofLocoGroundPelvis` inside it), `ofLocoParams`, `OF_LOCO`, `OF_IDLE`, `ofPoseLerp`, `skelFK`, `ofBootAhead`, `ofBootPlan`. These stay **byte-identical**. The correction is a new presentation-only layer (`anim3d/of_loco_cont.js`) that is called from the presentation-only functions `ofLocoTick`, `ofSolve` and `ofActorTick`.

**Switch:** `OF_CONT.on`, true by default on the new branch. With it off, the presentation must reproduce V1.3 bit for bit (§4, LC-8).

**Not a PI-1 revision.** No PI-1 qualifying run, no Revision 3, no new compatibility amendment.

## 2. What the design rests on (read-only probes before this freeze)

Scripts: `scripts/law_probe.cjs` and `scripts/law_flight_probe.cjs` (the law sampled at 4,000 points per cycle on the vinicius rig); `scripts/law_drift.cjs`.

**The shared law has velocity cusps.** Its joint-angle curves are only C0 at their phase breakpoints:

| joint (right) | where | slope jump at 3.0 m/s | at 7.5 m/s |
|---|---|---|---|
| hip | toe-off (linear stance meets the swing sine) | 492 °/s (8.6 rad/s) | 983 °/s (17.2 rad/s) |
| knee | heel strike / toe-off / max() switches | 377 °/s | 901 °/s |
| ankle | piecewise lerps (s = 0, 0.22, 0.62) | 49 °/s | 124 °/s |
| forearm | clamp at the arm-swing zero crossing | 141 °/s | 240 °/s |

**Its vertical motion is not physical.**
- **In flight**, the "bob" lifts the pelvis 30 – 53 mm (at the reference leg) within flights of 50 – 67 ms. A ballistic flight of that length rises only 3.0 – 5.6 mm. The implied COM acceleration in flight is −24 … −59 BW.
- **In late stance**, the grounding keeps the toe on the pitch while the knee already flexes into the swing curve. The pelvis is therefore pulled down fast, giving a COM vertical velocity at take-off of −4.9 m/s (3 m/s) to −12.9 m/s (7.5 m/s). A ballistic flight launched from that state would sink 0.2 – 0.9 m. Bridging the law's own states cannot work, so a vertical **model** is needed.

**Its horizontal COM is not on the authority.** With the pelvis locked to the root, the law's COM moves relative to the pelvis at p50 0.04 / p90 0.26 m/s (3 m/s) and p50 0.34 / max 0.62 m/s (7.5 m/s). This is why HG-A v2's shift bound (0.18 m/s) fails on most 7.5 m/s frames, even with plant IK off (investigation evidence `hg_valid_frames_presdiag_procOnly.json`: 47 / 59 frames).

**Its stance foot is close to world-fixed.** The ankle drifts 13 – 70 mm over a stance (up to 119 mm at 5.5 m/s). The simulation's legs drift the same way, so a world-fixed presented foot departs from the gameplay foot by up to that drift.

**Mass model:** the V2 runner's segment mass fractions match de Leva (1996) within 0.003, except the foot (0.016 vs 0.014) and the forearm, which carries the hand.

## 3. Design (intent and rules)

### 3.1 D1: a C1 copy of the gait (presentation only)

`ofLocoCycleC1` produces the same rotation channels as `ofLocoCycle`. At each C0 breakpoint of a channel, with time slope jump Δm, it adds the exact C1 corner rounding

c(τ) = Δm · (h − |τ|)² / (4h), for |τ| < h (0 elsewhere).

This cancels the slope jump at the breakpoint. It is C1 everywhere and changes nothing outside ±h.

**h = 1 render frame (1/60 s).** This is the shortest window the 60 Hz rendering can resolve. It keeps the departure from the simulation's collision legs as small as possible: Δm·h/4, about 2° at the jog hip and 4° at the sprint hip.

Outside the windows, the copy must equal `ofLocoCycle` to floating-point precision. This is a verification row.

### 3.2 D2: the vertical COM model (item 1)

**Running (stance fraction S < 0.5):** the spring-mass model of Morin et al. (2005).
- **Stance:** a half-sine vertical force F(τ) = F_max sin(πτ/T_c), with F_max = (π/2)·m·g·(T_f/T_c + 1).
- **Flight:** ballistic, −g.
- **Timing:** stance and flight durations T_c and T_f come from the gait's own phase, cadence and stance fraction, so there is no fitted parameter.
- **Consequences** (periodic solution): flight is exactly ballistic; take-off and landing vertical velocities are ±g·T_f/2; the trajectory is C2 at the transitions; peak force is 1.9 BW at 3 m/s and 2.5 BW at 7.5 m/s.
- **Stateless:** it is a pure function of phase and speed.

**Absolute level:** the COM height at heel strike equals the COM of the authored landing pose grounded by the law at s = 0. The foot therefore arrives on the pitch at the simulation's planted onset.

**Walking (S ≥ 0.5):** the law's stance grounding computed on the C1 pose, with smooth min / max replacing min / max and the hard s = 0.62 heel-to-toe switch removed. The rounding scale is 3 mm, a rounded-sole model. The two models are blended by a smooth weight in S over [0.45, 0.50].

**Pelvis:** pelvis height = model COM height − the pose's COM height relative to the pelvis. The pose COM uses de Leva segment masses on the rig bones (general to every player, not fitted to V2).

### 3.3 D3: horizontal COM on the authority (needed by item 1's ballistic flight and by HG-A v2)

**This is beyond the literal wording of item 1, and the reason is stated here.**
- A ballistic flight is ballistic in every axis.
- HG-A v2 requires the promoted horizontal momentum to equal M·v_auth, with a visibility bound of 0.18 m/s on the shift.
- With the pelvis locked to the root, the law's COM swings up to 0.62 m/s around the root at 7.5 m/s (§2).

**Rule:** the pelvis horizontal offset is −(COM_rel,h − LP[COM_rel,h]). LP is a critically damped second-order low-pass with τ = 0.15 s, far below the step frequency (3 – 5.5 Hz). The COM therefore follows the authoritative root plus its own slowly varying mean offset, and the pelvis stays on the root on average. The expected amplitude is about 1 cm.

D3 can be switched off independently, so its contribution is reported.

### 3.4 D4: continuous plant transitions (item 2)

**Scope:** the locomotion plants of a moving gait. Idle stance steps, ball reaches, kicks, receptions, defending and reactions keep the V1.3 path unchanged.

1. **Rolling foot.** The planted foot's pitch follows the authored foot pitch through a C1 map with a dwell at flat, φ(θ) = θ³/(θ² + θ_k²) with θ_k = 5°. The pivot is the heel while the foot is toes-up and the toe tip while it is toes-down. The pivot changes only at flat, where the angular rate is zero. The heel → flat → toe roll is therefore C1, and the toe pivot no longer switches its target in one tick.
2. **World-fixed anchor.** The pivot is fixed in the world once engagement completes.
3. **C1 engagement** at the law's stance onset, which is the simulation's planted flag.
   - **Horizontally,** the pivot decelerates uniformly from its authored position and velocity to rest over T_e = 0.05 s (the heel-strike arrest time, 3 frames). Its anchor is the stopping point.
   - **Vertically,** a cubic Hermite runs from the authored height and velocity to the pitch at rest over T_e.
   - **There is no weight ramp.** The target starts at the authored foot, so position and velocity are continuous.
4. **Inertialized release** at the law's stance end. The planted-minus-authored offset in ankle position and velocity, and in foot pitch, decays by a cubic Hermite over T_r = 0.10 s (the swing foot's acceleration time).
5. **Knee plane.** Planted legs are solved in the authored knee plane, using the authored knee as the pole. This removes the planted / swing pole switch, the REV1 one-frame knee-plane step.
6. **Reach.** The hip-to-ankle target distance is compressed smoothly above 0.93 × leg length (the existing OF_TRACK soft limit), and never reaches full extension. In the locomotion path the rate-limited pelvis drop and ground-lift slews (C0 in velocity) are not used. Any slip a soft limit causes is measured by LC-3, not hidden.
7. **Swing clearance.** The swing-leg floor correction uses a smooth lift (softplus, k = 2 mm) instead of the hard leg-floor IK switch.

### 3.5 D5: the root-bone ground-clamp bug (item 3)

The ground clamp skips bones without a parent (the rig root). The root carries `part: "shirt"` in every real rig, so it scored −12 mm on every tick. This removes the constant +12 mm lift and the 12 mm one-tick drops.

### 3.6 D6: PR-2 v2 (item 4)

**PR-2 v2.** Over the first rendered frame after promotion (k_p → k_p + 1), every rendered joint centre's displacement must lie within **3 mm** of the presentation's (stream A, read-only reference) displacement of the same joint over the **same** frame.
- This is PI-1's original reading (6ef7e1e §11). Both sides include the genuine limb motion.
- **The reference must be a genuine continuation.** If stream A at k_p + 1 fails the LC continuity rows locally, the frame is reported as "reference invalid". That is a presentation failure, not a handoff pass.

**Reported diagnostically with it** (non-gating): a decomposition into
- the velocity part, |v_phys(k_p)·Δt − Δx_A|;
- the remainder, the acceleration mismatch (a_A − a_phys)·Δt²/2.

The promoted body has posture tone but no locomotion drive, so a remainder is expected wherever the gait's limb acceleration is large. If PR-2 v2 fails for that reason, it is reported as such (cause A of the drift investigation), never removed by changing the reference or the 3 mm.

**PR-2 is a PI-1 criterion** (REV2 §8). In the scan it is evaluated and reported for every promoted candidate, as "would pass PR-2". It is not added to the PS-2 selector.

### 3.7 D7: the angular handoff state AH-1 (item 5)

**Definition.** At k_p the promoted state is the mapped pose with the PI-1 §6.2 velocities after HG-A v2. Let:
- c be the COM;
- I_wb be the whole-body inertia about c;
- L_pres = Σ m_i (r_i − c) × (v_i − v_c) + I_i ω_i;
- ω_root,pres be the presentation root's angular velocity (the yaw rate of its locomotion frame);
- ω_auth = (0, ψ̇_auth, 0), the authoritative facing rate (2nd-order backward difference of the simulation's facing).

**The handoff state is:**
- **L_h = L_pres + I_wb (ω_auth − ω_root,pres).** The whole-body rotation is the simulation's; everything else is the presentation's motion relative to its own locomotion frame.
- **The write:** Ω = ω_auth − ω_root,pres; v_i += Ω × (r_i − c); ω_i += Ω. This leaves linear momentum unchanged, sets L to L_h, and preserves relative motion.
- **Visibility bound:** max over joints of |Ω × (r_j − c)| ≤ 0.18 m/s, as for HG-A2.3.

**"Physically meaningful relative limb motion"** means the C1 presentation's motion, which LC-1, LC-2 and LC-5 certify artefact-free. In straight running ω_auth = ω_root,pres = 0, so AH-1 imports exactly the presentation's instantaneous angular state.

**Scan use.** The instruction says the REV2 scan runs unchanged except for HG-A v2 and PR-2. So the official scan does **not** apply the AH-1 write. It reports the AH-1 correction at every promotion: expected zero, since every PI-1 fixture is a straight run. Any non-zero value is reported. A separately labelled, non-gating diagnostic variant with the AH-1 write is run only if the correction is non-zero anywhere.

## 4. Continuity criteria (gating for "the locomotion became continuous")

All thresholds trace to existing frozen numbers or to stated physics:
- **0.18 m/s:** PR-2's 3 mm per 60 Hz frame, the visibility velocity, as in HG-A2.3;
- **3 mm:** PR-2;
- **10 mm:** NM-2, planted-foot slip;
- **[0, 4] BW:** the ground can only push, and measured peak vertical forces in running stay below about 3 – 4 BW up to sprinting speeds (Nilsson & Thorstensson 1989; Weyand et al. 2000).

**Body quantities** use the V2 runner mapped from the presentation by the frozen mapping (R-K + RF-1), the same body that is promoted. **Rig quantities** use the 23 rig joints.

| id | criterion | measure | threshold |
|---|---|---|---|
| **LC-1a** | pelvis / COM position and velocity continuity (construction) | offline harness at 3,840 Hz (§5.3): per-step velocity change of the rig pelvis and of the presentation COM. At this rate a legitimate acceleration below 691 m/s² cannot reach the threshold, while any velocity jump ≥ 0.18 m/s or position jump ≥ 0.05 mm does. | ≤ 0.18 m/s |
| **LC-1b** | COM velocity well-defined as rendered | 60 Hz page exports, V2 COM, every evaluated frame: \|v_back2 − v_central\|, horizontal and vertical | ≤ 0.18 m/s |
| **LC-2** | joint position / velocity continuity (construction) | as LC-1a, every rig joint centre | ≤ 0.18 m/s |
| **LC-3** | planted-foot world slip | per stance, from engagement complete to release start: world displacement of the pivot point (rig geometry) | ≤ 10 mm |
| **LC-4a** | ballistic flight | every flight interval (no foot in stance and no presented contact): max deviation of the V2 COM height from the best ballistic fit (g fixed, height and velocity free) | ≤ 3 mm |
| **LC-4b** | physically possible vertical force | every evaluated frame: F/BW = 1 + a_y/g from the centred 2nd difference of the V2 COM height | in [0, 4] |
| **LC-4c** | no net vertical drift | mean vertical COM velocity over each complete gait cycle | ≤ 0.01 m/s |
| **LC-5a** | angular state artefact-free | every evaluated frame: max over joints of \|I_wb⁻¹ (L_back2 − L_central) × (r_j − c)\| | ≤ 0.18 m/s |
| **LC-5b** | whole-body rotation = authority | every evaluated frame: max over joints of \|(ω_root,pres − ω_auth) × (r_j − c)\| | ≤ 0.18 m/s |
| **LC-5c** | angular momentum conserved in flight | each flight interval: r_max · \|I_wb⁻¹ ΔL\| · T_f / 2 (the rotation the L change implies, at the farthest joint) | ≤ 3 mm |
| **LC-6** | deterministic reproduction | (a) page export repeated: presentation world matrices and gameplay bit-identical; (b) harness = page bit for bit on the rx LOCO records up to contact; (c) fine-rate runs repeated identical | identical |
| **LC-7** | animation ON / OFF gameplay neutrality | gameplay hashes identical across OFFNP / OFF / FULL / LOCO with LC-1 on, identical to the V1.3 baseline hashes for all 26 records and every speed fixture, and identical with OF_CONT on vs off | identical |
| **LC-8** | V1.3 presentation reproducible | OF_CONT.on = false reproduces the V1.3 records' presentation bit for bit; D1 equals `ofLocoCycle` outside its windows (max \|Δ angle\| ≤ 1e-9°) | identical |

**Verdict.** "The locomotion became continuous" requires every LC row to pass on every speed fixture (§5.1). The PI-1 records (§5.2) are evaluated with the same rows over their pre-contact frames and reported separately.

**Reported with every row (non-gating):**
- V1.3 vs LC-1 values;
- presented legs vs the simulation's own legs (horizontal distance of leg-segment centres to the simulation segment axes, as in CG-4, mm);
- presented contact vs the simulation's planted flag (agreement fraction);
- engagement travel per stance;
- peak vertical force per speed;
- pelvis offset amplitudes (D2, D3);
- per-tick CPU of the actor.

## 5. Test matrix

### 5.1 Speed fixtures (the page, gameplay authoritative)

The frozen fixture builder (`rxCase`, scripted straight run at constant speed, tackler placed 30 m off the line so it never interacts):
- **v = 1.45** (WALK anchor), **2.2**, **3.0** (JOG anchor, the PI-1 runner), **4.2**, **5.5** (RUN anchor), **6.5**, **7.5** (the PI-1 sprint cases), **8.2** (SPRINT anchor);
- vinicius, 260 ticks;
- evaluated frames: ticks [30, 258].

### 5.2 PI-1 records

The 26 V1.3 cases (20 rx + 6 defending), re-exported from the new branch with the frozen exporter logic. Evaluated frames: [10, first contact − 2], or [10, closest approach − 1].

### 5.3 Offline fine-rate construction runs (LC-1a, LC-2)

`scripts/pres_harness.cjs` (bit-exact with the page, §4 LC-6b) runs at Δt = 1/3,840 s:
- the speeds of §5.1, synthetic straight runs with the simulation's stride-clock law;
- a ramp from 1.0 to 8.2 m/s over 3 s;
- 3 s each, the first 0.5 s excluded.

### 5.4 Development discipline

**Development** uses only the offline harness on synthetic runs and on the speed fixtures. The PI-1 records are not used for development. **The official evaluation** runs once on the frozen implementation. Development changes are design changes; the criteria in §4 do not move.

## 6. After the slice: the REV2 promotion scan (unchanged except HG-A v2 and PR-2 v2)

1. **Records:** re-export the 26 V1.3 PI-1 records from the new branch (LOCO and the other modes). Gameplay hashes must equal V1.3 (LC-7).
2. **Scan:** `scan_rev2.mjs` logic unchanged except that HG-A v1's 0.05 m/s check is replaced by HG-A v2 (|s| ≤ 0.180 m/s; the shift was already applied), and PR-2 v2 (§3.6) is evaluated and reported for every promoted candidate. AH-1's correction is reported (§3.7). Class counts are kept separately (NEAR MISS, RECOVERABLE, PLANTED-LEG FALL).
3. **Valid promotion frames per speed:**
   - every pre-contact frame of every PI-1 record, and every frame of the speed fixtures, is evaluated against the full HG (P-1 … P-17, HG-A v2, HG-D; HG-T only where a tackler exists);
   - counted per speed, with and without PR-2 v2 (which needs one frame of physics, run per frame);
   - V1.3 counts alongside.
4. **Coherence of a promoted unobstructed runner:** `lead_drift.mjs` with its frozen coherence tolerances (RC-4, CG-4 against the simulation's segments, CG-2, P-12, NM-2 slip), started from valid frames:
   - the speed fixtures: no tackler; horizon 30 ticks;
   - the PI-1 records: promotion at the latest valid frames; through contact.

   Reported: the coherent interval and the lead to contact.
5. **Blockers:** every pre-existing blocker (B1 – B7, the stand-in, HG-T, CG-1 / CG-5 geometry, standing-pose P-5, rx_free_leg P-17) is re-classified. "Disappears" means the row that blocked now passes, with the same thresholds. "Remains" carries its actual cause: collision geometry, architecture or V2. No collision or contact criterion is weakened.

## 7. Browser replay (visual comparison)

**What it shows:** the same running sequence before (V1.3) and after (LC-1), side by side, rendered from the exported rig joints:
- slow motion (down to 0.05×) and frame stepping;
- overlays: pelvis and COM (markers and trails), planted feet (anchor, pivot, contact state), and promotion-valid frames (a timeline strip plus a highlight on the body);
- vertical COM and implied vertical force plots.

**Sequences:** the 3.0 m/s and 7.5 m/s fixtures, and one PI-1 record (rx_planted_leg).

**Form:** a self-contained local HTML file under this folder.

## 8. Reported separately (the instruction's list)

1. whether the locomotion itself became continuous (§4 verdict, per row and speed);
2. valid promotion frames per speed (§6.3);
3. how long a promoted unobstructed runner remains coherent before contact (§6.4);
4. which PI-1 blockers disappear;
5. which remain genuinely collision / geometry / architecture problems;
6. whether anything now suggests a V2 body limitation.

## 9. Stop rules

**Stop after:**
- the continuity slice;
- the unchanged promotion scan;
- the visual comparison.

**No other work.** No PI-1 revision, no qualifying run, no change to criteria after results, nothing pushed.

**If a gate fails, it is reported with its cause, not fixed after the official evaluation.** A design defect found after the official evaluation is reported as found. It is not silently re-run.

# D6 diagnostic: why the slide barely moves the standing player

> **Status (2026-09-30).** Reviewed by the user.
> - The friction-sensing fix is **approved**.
> - The baseline D6 player is **not** to be made to fall; the physical continuum below is to be preserved.
> - Checkpointed locally, with the post-fix Gate D baseline `results/v1_1/gated_V1.1_post_mu_fix.json`. The pre-fix `results/v1_1/gated_V1.1.json` is kept unchanged as history.
> - The four observations in §5 (items 1–4) are unresolved and await decisions. Locomotion has not started.

**Question.** In D6 the slider makes solid contact with B's near leg. That leg moves, but B barely reacts as a whole body. Is that physics, or is something in the physical-character stack making him unrealistically resistant to low-leg impacts?

**Answer.** For this particular contact the outcome is physically justified, and the stack is not holding B up unrealistically. The slider hands B **173 N·s** along the slide, in a **2.3 kN** spike and then a long lean on his shin. Three things keep the whole-body effect small:

1. **The hit sweeps his foot the "safe" way.** The contact is on the outside of his left boot at **1.8 cm** above the turf, and it pushes the foot *toward* the other foot, under his centre of mass.
   - His base narrows from 32 cm to about 16 cm, but it still contains the COM.
   - The swept foot becomes the loaded support (peak **1.48 kN ≈ 1.9 body weight**). Its friction then stops the slide after **16 cm**.
2. **The feet pass the momentum into the turf.** B's feet return all 173 N·s to the ground. His own peak momentum is **18 N·s** (COM 0.24 m/s).
3. **The active balance response arrests the roll.** The body briefly rolls onto the struck foot and the far foot lifts for **29 ms**. The balance controller stops that roll by holding the pelvis level and putting the lifted foot back down, using finite torques.

This is not an artefact of superhuman control:
- **Frozen controller:** with B's controller frozen at the moment of impact (same body, same contact), the same hit knocks him down (trunk 64°, COM drops 56 cm).
- **Latency:** with a 100 ms sensing delay he still recovers exactly as in the baseline.

**One genuine general bug was exposed and fixed: the foot friction observer** (§4).
- While the slider pushed B's boot, the push and the turf's friction nearly cancelled in the foot's force balance.
- B "measured" μ = 0.037 on 0.9 turf and kept that value for the rest of the run.
- His friction-limited capture radius collapsed to 3–50 mm.
- A foot that another body is pushing is no longer used as a friction measurement.
- All approved and promoted gates are hash-identical after the fix; only D6_slide changes.

**The response is a continuous spectrum** (§3). Varying only physical conditions, with nothing encoded as an outcome:
- minor contact, absorbed (1.3 m/s arrival);
- local disturbance (2.6 m/s);
- whole-body disturbance recovered in place (the D6 baseline, 4.0 m/s);
- a corrective step (a knee-height hit);
- support lost and a fall (4.8 or 5.7 m/s arrival, a thigh-height hit, or 80 % of the weight on the struck foot).

**Stronger physically plausible cases that do destabilise him:**
- The same slide into a foot carrying 80 % of his weight sweeps that foot out from under the COM, and he falls.
- A slide that arrives at ≥ 4.8 m/s carries the foot away with the slider, and he falls.

Nothing in the Reference Tackle or in D6's definition was changed, nothing was pushed, and locomotion was not started.

## 1. The D6 causal chain, measured (after the fix)

All numbers are measured from the solved bodies by `pc_d6diag.js`. The contact impulse is exact, from the instrumented twin (§6). Times are from t = 0, and the first touch is at 0.179 s.

| # | link | measurement |
|---|---|---|
| 1 | **Contact geometry** | Slider's lead boot (`A.foot_R`) → B's **left boot, outer side near the toe, 1.8 cm above the turf**. The contact normal is (1.00, −0.02, 0.00): purely lateral, pushing B's foot toward his right foot. The shin is touched later (the slider's boot rests against it). First manifold 0.175 s, first touch 0.179 s. Deepest 2.8 mm. The core contact rule holds: the approach is arrested **on the touch step**. |
| 2 | **Impulse and duration** | Peak **2 287 N** on the touch step, above 25 % of peak for **21 ms**. A→B along the slide: **37.6 N·s** in the first 35 ms, 18.5 N·s in 35–100 ms, 45.8 in 100–250 ms, 63.1 in 250–500 ms, 8.4 after. Total **173 N·s**, almost all of it horizontal and lateral. |
| 3 | **Standing-foot contact state** | Before: both feet FLAT, 352 / 354 N. On impact the struck foot goes **SLIPPING for 135 ms**, and its load rises to **1 476 N** as it slides under the COM. The far (right) foot unloads, **leaves the turf at 0.204 s for 29 ms**, and is put back down. |
| 4 | **Struck foot: slide, rotation, lock** | It slides **16.1 cm** medially at up to 2.41 m/s, rolls 9.7° about the ankle (inversion/eversion), then sticks: stud friction 0.9 × a load that has grown to ≈ 1.9 body weight. It is **not locked**; it is swept, then pinned by its own growing load. |
| 5 | **Ankle / knee / hip** | First 150 ms: ankle roll **9.7°** (230°/s), knee **1.0°**, hip adduction **8.3°** (169°/s). The leg swings under the pelvis about the hip, and the knee is not involved (the push is lateral to its hinge). |
| 6 | **Motor effort and saturation** | The ankle motor is at its (budgeted) limit on 28 of 36 steps: peak 52 N·m pitch, 24 N·m roll. Hip ab/adduction peaks at **97 N·m** (limit 140 × budget), saturated on 2 steps. Knee peak 54 N·m. |
| 7 | **Is any controller restoring the struck leg?** | **No.** The stance leg is re-solved every step from the foot's *actual* position (C1's ground-up IK), and the foot target is its actual orientation. The resistance is the motors' **damping** on the leg's own motion (at the hip, up to 116 N·m of damping before the torque clamp vs 32 N·m of spring) plus finite abductor torque. The foot is never pulled back toward where it was. |
| 8 | **COM position and velocity** | Peak **0.24 m/s**, displaced **8.3 cm**, no measurable drop. Trunk tilt ≤ 4.4°. |
| 9 | **Whole-body angular momentum** | Horizontal part about the COM ≤ **9.7 kg·m²/s**: the brief roll onto the struck foot. The frozen-controller run reaches 38.9. |
| 10 | **CoP, support, capture** | While the far foot is up, the support region shrinks to the struck foot, and **ξ is outside it by up to 7.4 cm for 29 ms**. When the far foot re-plants, ξ is back inside. |
| 11 | **Classification** | RECOVERABLE_IN_PLACE → **STEP_NEEDED at 0.208 s** (ξ 3.1 cm beyond the hip-extended support) → RECOVERABLE_IN_PLACE at 0.283 s. No release. |
| 12 | **Is stepping allowed?** | Yes, B runs the full C1 + C3 stack. C3 **refused at 0.208 s: "no reachable foothold (neither foot)"**. At that instant the far foot was in the air and the struck foot slipping, so neither could be the stance foot of a step. The C1 feet-in-place rule re-planted the far foot, which was enough. The refusal is latched for the rest of the run (§5). |
| 13 | **Momentum: slider loss vs B's gain** | Slider: **287 N·s** at touch → 137 (+100 ms) → 64 (+250 ms) → 61 (+500 ms). B receives 173 N·s through the contact, **and his turf takes −173 N·s back** (−19.9, −26.9, −48.7, −66.8, −11.0 per window). B's own peak is 18 N·s. From about 0.1 to 0.5 s the slider's leg leans on B's shin with ≈ 250–300 N on average. That stays well under what B's two planted feet can hold (≈ 0.9 × 765 N ≈ 690 N). |
| 14 | **Collider inset and geometry** | Neither changes the outcome class. Boot-sized colliders on both players: 12 cm slide, local disturbance. Shin and thigh colliders grown 1.5 cm toward the mesh: whole-body disturbance recovered, with the far foot up 361 ms. |

**Why a medial sweep of the near foot does not topple a square-standing player.**
- B's COM sits between his feet.
- Pushing the near foot toward the other foot narrows the base, but the base still contains the COM. And the more the foot moves under the COM, the more load, and therefore friction, it carries.
- Support fails only if:
  - the foot is carried **past** the COM (a faster slide: the foot travels > 60 cm with the slider); or
  - the COM already sits over the struck foot (80 % load), so the sweep takes the base from under it.

Both regimes appear in §3.

## 2. Where the stability comes from: the controller comparison

| run | what changes | result |
|---|---|---|
| D6 baseline | – | whole-body disturbance recovered in place: COM 0.24 m/s, trunk 4°, far foot up 29 ms |
| `D6X_freezeNoHit` | B's controller frozen at 0.17 s; the slider stops short (no contact) | **stands** (COM 0.01 m/s): the frozen standing posture is statically stable on its own |
| `D6X_freeze` | frozen at 0.17 s + **the same hit** | **knocked down**: COM 1.66 m/s, trunk 64°, COM drops 56 cm, falls onto the slider |
| `D6X_delay100` | B's controller sees the world 100 ms late | same as the baseline (COM 0.24 m/s, foot 14 cm): the recovery does not depend on zero-latency control |
| `D6X_noStep` | no C3 | identical to the baseline (C3 refused anyway) |
| (not used) | N-pose PD hold without balance / the C1 fall release | cannot stand even with no contact, so not a valid comparison |

**Conclusion.** The surprising stability is not from:
- Jolt or the contact mechanics (the hit is transferred on the step it occurs, with a realistic spike);
- mass or inertia;
- the joint constraints (the leg swings freely at the hip; the knee is not involved);
- motor strength (the ankle and hip saturate at their finite limits);
- a planted foot that cannot move (it slides 16 cm);
- the corrective-step logic (it refused).

It comes from **balance control** (hold the pelvis level, put the lifted foot back down), which is doing what a person does, within torque limits, and still works with human-like latency. On top of that come the **D6 initial conditions**:
- B stands square with 50 / 50 load;
- the hit is at ground level and pushes the foot toward the midline;
- the slider arrives at 3.4 m/s (§5).

## 3. The diagnostic matrix (24 runs, one variable at a time)

Everything is D6 except the named condition. Each run is deterministic ×3 (Node). "twin" is the instrumented force-plate run, a different but equally valid world. Where it lands in another class, that case sits on a decision boundary.

The "observed response" is a *description* of the measurements, never a simulation input:
- **fall:** trunk > 55°, COM drop > 25 cm, or the classifier's own fall;
- **corrective step:** a C3 step with sensed liftoff and touchdown;
- **whole-body disturbance:** ξ left the support, or the COM exceeded 0.3 m/s;
- **local disturbance:** the foot moved ≥ 1 cm or the COM ≥ 0.05 m/s;
- **minor contact:** otherwise.
| test | arrival m/s | first contact | A→B N·s first 35 ms / total | peak N | struck foot slid cm | far foot off turf ms | B COM peak m/s | trunk max ° | ξ min cm | observed response | twin | ×3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `D6_slide` | 3.38 | slider boot → foot_L @ 0.02 m | 38 / 173 | 2287 | 16.1 | 29 | 0.24 | 4 | -7.4 | **whole-body disturbance, recovered in place** | local disturbance | ✓ |
| `D6X_v45` | 1.32 | slider boot → foot_L @ 0.15 m | 11 / 76 | 475 | 0.1 | 0 | 0.01 | 4 | 11.6 | **minor contact, absorbed** | = | ✓ |
| `D6X_v50` | 2.56 | slider boot → foot_L @ 0.00 m | 41 / 145 | 1816 | 5.2 | 0 | 0.10 | 4 | 11.1 | **local disturbance** | = | ✓ |
| `D6X_v60` | 3.98 | slider boot → foot_L @ 0.00 m | 41 / 162 | 2622 | 24.9 | 320 | 0.50 | 8 | -5.3 | **whole-body disturbance, recovered in place** | = | ✓ |
| `D6X_v65` | 4.78 | slider boot → foot_L @ 0.02 m | 40 / 226 | 2372 | 63.4 | 865 | 1.35 | 109 | no support | **fall / support lost** | = | ✓ |
| `D6X_v70` | 5.69 | slider boot → foot_L @ 0.00 m | 56 / 597 | 3573 | 116.8 | 964 | 0.93 | 85 | no support | **fall / support lost** | = | ✓ |
| `D6X_hLowShin` | 3.13 | slider boot → shin_L @ 0.25 m | 62 / 269 | 2102 | 6.1 | 0 | 0.18 | 5 | 10.3 | **local disturbance** | fall / support lost | ✓ |
| `D6X_hUpShin` | 3.37 | slider boot → shin_L @ 0.47 m | 63 / 190 | 3545 | 14.3 | 0 | 0.57 | 5 | 2.7 | **whole-body disturbance, recovered in place** | = | ✓ |
| `D6X_hKnee` | 3.42 | slider boot → shin_L @ 0.50 m | 62 / 178 | 3002 | 17.5 | 21 | 0.68 | 12 | -24.5 | **corrective step** | whole-body disturbance, recovered in place | ✓ |
| `D6X_hThigh` | 3.41 | slider boot → thigh_L @ 0.63 m | 64 / 139 | 3175 | 116.8 | 0 | 2.00 | 105 | no support | **fall / support lost** | = | ✓ |
| `D6X_dirFront` | 3.10 | slider boot → foot_L @ 0.02 m | 44 / 179 | 1652 | 9.2 | 0 | 0.14 | 5 | 12.0 | **local disturbance** | = | ✓ |
| `D6X_dirRear` | 3.08 | slider boot → foot_L @ 0.01 m | 33 / 156 | 1578 | 4.1 | 0 | 0.13 | 4 | 11.7 | **local disturbance** | = | ✓ |
| `D6X_load20` | 3.39 | slider boot → foot_L @ 0.02 m | 67 / 154 | 2312 | 16.3 | 62 | 0.20 | 10 | -18.5 | **whole-body disturbance, recovered in place** | = | ✓ |
| `D6X_load70` | 3.33 | slider boot → foot_L @ 0.00 m | 30 / 137 | 1993 | 18.4 | 316 | 0.31 | 6 | 3.1 | **whole-body disturbance, recovered in place** | = | ✓ |
| `D6X_load80` | 3.23 | slider boot → foot_L @ 0.00 m | 30 / 210 | 1576 | 111.2 | 882 | 1.43 | 114 | no support | **fall / support lost** | = | ✓ |
| `D6X_w22` | 3.39 | slider boot → foot_L @ 0.02 m | 45 / 158 | 2217 | 13.5 | 111 | 0.45 | 6 | -1.6 | **whole-body disturbance, recovered in place** | = | ✓ |
| `D6X_w44` | 3.38 | slider boot → foot_L @ 0.02 m | 62 / 175 | 2386 | 13.3 | 41 | 0.19 | 5 | -14.5 | **whole-body disturbance, recovered in place** | local disturbance | ✓ |
| `D6X_freeze` | 3.39 | slider boot → foot_L @ 0.02 m | 38 / 182 | 2292 | 18.7 | 37 | 1.66 | 64 | -131.2 | **fall / support lost** | = | ✓ |
| `D6X_freezeNoHit` | – | no contact | – | – | 0.0 | 0 | 0.01 | 4 | 12.0 | **no contact** | = | ✓ |
| `D6X_delay100` | 3.38 | slider boot → foot_L @ 0.02 m | 38 / 160 | 2301 | 14.1 | 21 | 0.24 | 5 | -7.2 | **whole-body disturbance, recovered in place** | local disturbance | ✓ |
| `D6X_noStep` | 3.38 | slider boot → foot_L @ 0.02 m | 38 / 173 | 2287 | 16.1 | 29 | 0.24 | 4 | -7.4 | **whole-body disturbance, recovered in place** | local disturbance | ✓ |
| `D6X_mu05` | 3.42 | slider boot → foot_L @ 0.02 m | 28 / 167 | 1644 | 18.0 | 21 | 0.24 | 5 | 0.9 | **local disturbance** | = | ✓ |
| `D6X_bootHuman` | 3.32 | slider boot → foot_L @ 0.00 m | 46 / 204 | 1775 | 12.4 | 0 | 0.19 | 5 | 8.6 | **local disturbance** | = | ✓ |
| `D6X_inflate` | 3.37 | slider boot → foot_L @ 0.02 m | 64 / 137 | 2673 | 16.0 | 361 | 0.45 | 11 | -23.5 | **whole-body disturbance, recovered in place** | = | ✓ |

**Along each axis:**
- **Speed:** the response is monotonic. 1.3 m/s arrival: nothing. 2.6: the foot moves 5 cm. 3.4: 16 cm and a brief single-foot moment. 4.0: 25 cm, the far foot up 320 ms, COM 0.5 m/s. 4.8 and 5.7: the struck foot is carried 63–117 cm with the slider, support is lost, and he falls.
- **Height, at the same ≈ 3.3 m/s:**
  - boot: whole-body, recovered;
  - lower shin, 0.25 m: local. This case is **bistable**: in the twin the boot rides *up* the tapered shin collider, lifts the leg, and he falls.
  - upper shin, 0.47 m: whole-body, COM 0.57 m/s;
  - knee, 0.50 m: **corrective step**. The struck leg steps and lands partly on the slider's shin; he balances on the far foot until the foot reaches the turf and the step is accepted at 1.38 s.
  - lower thigh, 0.63 m: knocked down.
- **Direction:** ±30° diagonals glance off (local).
- **Load on the struck foot:** 20 % and 70 % recover in place. **80 % falls**: the sweep takes the base from under the COM.
- **Stance width:** 22 cm or 44 cm changes the details, not the class.

## 4. Found and fixed: the foot friction observer is corrupted by another body's push

- **Problem.** At impact B's controller "learned" μ = **0.037** for his left foot on 0.9 turf, and kept it for the rest of the run: the observer keeps a running minimum, by design, for ice patches. With that belief, the friction-limited capture radius fell to **3–50 mm** during the hit. That fed the STEP_NEEDED decision and clamped the ankle's CoP demand.
- **Cause.** The sensor estimates a sliding foot's friction as |shear| / load from the foot's own force balance. That is valid only if the turf is the only thing acting on the sole besides the leg. The ankle force is already removed. The slider's push on the boot is not: push and turf friction nearly cancelled, so the "shear" looked tiny.
- **Fix** (`pc_sense.js`, general). A foot's friction observation is invalid while any other body touches it: another character, or an obstacle, including speculative manifolds the solver may act on. It stays invalid for 50 ms after contact ends. In a world with no other body, nothing changes.
- **Regression** (`tools/review/regress.sh`, sequential):
  - **identical:** A 5/5, B 20/20, C1 59/59, C2 13/13 (V1) and 14/14 (V1.1), C3 29/29;
  - **Gate D:** 6/7 identical, **only D6_slide changes**. That holds both with and without protective falls, deterministic ×3 (`json/gated_V1.1_x3_after_mu_fix.json`, `…prot…`).
- **D6 after the fix.** Still upright. The core contact rule still holds: arrested on the touch step, deepest 2.8 mm (was 5.0). The far foot is up for 29 ms instead of 57.
- **What the fix changed in the matrix:**
  - the "corrective step" I first found at 70 % load **was an artefact of this bug**: ξ never left the support; the step came from the false friction limit. After the fix it recovers in place;
  - 6.5 m/s now falls, instead of releasing posture and re-engaging.

## 5. Found, not changed (your decision)

1. **C3 refusal is latched.** Once C3 refuses ("no reachable foothold"), it never re-plans, even after the transient that caused the refusal has passed (in D6: far foot in the air, struck foot slipping). In the baseline no second episode follows, so it doesn't change D6.
   - Proposed: re-evaluate on each new STEP_NEEDED episode.
2. **Release while the far foot is being re-planted.** C1 releases posture after 62 ms of STEP_NEEDED if no step runs. When STEP_NEEDED comes only from a foot that C1's own feet-in-place rule is already putting back down, the release fires just as it lands. Balance re-engages about 0.1–0.2 s later (`D6X_load20`, `D6X_inflate`).
   - In the D6 baseline the far foot landed 12 ms before the release would have fired.
   - Proposed: count a re-planting foot's anchor as prospective support for a bounded time.
3. **D6 initial condition: the slider arrives slowly.**
   - The slider starts at the seat landing at 5.5 m/s and loses 2.1 m/s on the turf in 0.18 s (≈ 1.1 g: the landing impact plus body|turf 0.5 and boot|turf 0.9). It meets B at **3.4 m/s**.
   - The reference slider was ≈ 4.3 m/s between f96 and f106.
   - D6's outcome is sensitive to this: 4.0 m/s → recovered with the far foot up 320 ms; 4.8 m/s → fall.
   - I did not change D6 or the reference.
4. **Contact at shin height is bistable.** The slider's boot can glance up or down B's tapered shin collider. That is physical, but it means shin-height cases need several nearby samples, not one.
5. **B's stepping repertoire.** C3 cannot make lateral recovery steps (the known crossover limit). The only step in the matrix came from the struck leg itself. Richer stumbles, such as a far-foot side-step or a hop, need the locomotion gate's step sequences.

## 6. Instruments, determinism, resources

- **Measurement.** `pc_d6diag.js`, read-only, through a new `runD` `onStep` hook. The same code produces the Node matrix and the live harness panel.
- **Exact contact impulse.** JoltPhysics.js exposes no contact impulses, and at impact both the slider's boot and B's struck boot also touch the turf. So a per-body Newton balance cannot separate "the slider pushed" from "the turf held".
  - The **instrumented twin** stands B on his own coincident turf: a free body of 10⁸ kg with gravity off and no damping, colliding only with B (`pc_jolt` `cfg.plateFrom`, off by default).
  - Its momentum change is the exact turf impulse on B, so A→B = ΔP_B − M·g·dt − turf→B.
  - Sanity check: the twin's vertical turf impulse equals B's weight × time.
  - The twin's last bits differ from the ordinary world. Its class is reported per test, and in the panel its ledger is flagged when it took the other branch.
- **Determinism.** 24/24 matrix runs ×3 identical; Gate D 7/7 ×3 with and without protective.
- **Deferred.** Browser = Node was not measured: puppeteer-core is not installed, and installing it was deferred. Node determinism ×3 is the evidence for this checkpoint. The harness panel shows the live browser hash against Node's for every D6 test.
- **Regression after the fix** (`analysis/regress_post_mu_fix.txt`):
  - A 5/5, B 20/20, C1 59/59, C2 13/13 (V1) and 14/14 (V1.1), C3 29/29 identical;
  - Gate D 7/7 identical against the post-fix baseline;
  - the same run against the preserved pre-fix baseline: 6/7, only D6_slide (3128e37b → e0ed5a7).
- **Resources.** Node, sequential, `nice`: about 40 s for the matrix and about 80 s for the regression. One server, no headless browser.

## 7. Review

`http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=D&test=D6_slide`

The **D6 diagnostic** panel, at the top right, has:
- one-click buttons for the representative cases;
- the numbered causal chain (§1) for the selected run, and an **at the cursor** readout: struck-leg angle, torque, saturation, and the spring/damping split;
- the whole matrix (click a row to load it).

The second chart shows:
- the exact A→B and turf→B force;
- the foot loads (struck foot SLIPPING shaded red, far foot off the turf shaded blue);
- ξ margin with the classification band.

In the 3D view (the Balance row, now enabled in suite D):
- B's support region, ξ, COM and velocity, CoP, and foot-load bars;
- the contact force arrow, via the **push** toggle.

| case | URL `?suite=D&test=…` | look for |
|---|---|---|
| mild, absorbed | `D6X_v45` | the boot taps the top of B's boot at 1.3 m/s: nothing moves |
| local | `D6X_v50` | the foot slides 5 cm, the body is unaffected |
| **current D6** | `D6_slide` | the 16 cm sweep toward the midline; the far foot's 29 ms lift; ξ briefly outside; the slider's lean on the shin |
| recovered | `D6X_v60` | 25 cm sweep, far foot up 320 ms, COM 0.5 m/s, recovered in place |
| stumble / step | `D6X_hKnee` | knee-height hit → C3 steps the struck leg (partly onto the slider's shin) |
| support lost | `D6X_load80` | 80 % load: the loaded foot is swept from under the COM → fall |
| fast slide | `D6X_v70` | the foot is carried > 1 m with the slider → fall |
| controller frozen | `D6X_freeze` vs `D6X_freezeNoHit` | the same hit topples a frozen B; frozen without a hit he stands |

## 8. Files

- **Code.** For the flagged items, all defaults are unchanged and the approved hashes are identical.
  - `pc_sense.js`: **the fix**.
  - `pc_gated.js`: the onStep hook and the D6X knobs (`standState`, `geoSpec`, B friction and delay, lead-leg mod).
  - `pc_jolt.js`: the opt-in force plate.
  - `pc_balance.js`: the diagnostic-only `freezeAt` / `releaseAt`, default off.
  - `pc_d6x.js`: the matrix, new.
  - `pc_d6diag.js`: the measurement, new.
  - `tools/d6x_run.js`: the matrix runner, new.
  - `pc_harness.js` and `index.html`: the review UI.
- **Evidence.**
  - `json/d6x_matrix.json`: the matrix, twin ledgers and force series.
  - `json/gated_V1.1_x3_after_mu_fix.json`, `json/gated_V1.1_prot_x3_after_mu_fix.json`: Gate D after the fix. The overnight `gate_d/json` files are untouched.
- **Gate D baselines.**
  - `sandbox/visual/physchar/results/v1_1/gated_V1.1.json`: **pre-fix, kept unchanged as history**.
  - `sandbox/visual/physchar/results/v1_1/gated_V1.1_post_mu_fix.json` (+ `.log`): **post-fix, ×3**. It is now the default Gate D reference of `tools/review/regress.sh` and of the harness; use `D_REF=results/v1_1/gated_V1.1.json` to compare against the pre-fix file.
- **Reproduce.** `node tools/d6x_run.js --repeat 3 --out ../../../review_artifacts/physical_character_v1/d6_diagnostic/json/d6x_matrix.json` (from `sandbox/visual/physchar`).

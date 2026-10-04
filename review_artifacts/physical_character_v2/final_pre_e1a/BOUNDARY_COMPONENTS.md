# G3 → G4 boundary components (final pre-E1a stage, §5)

**Source:** `../sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md` §5. **Hazards:** `../pre_g4_runway/G3_G4_INTERFACE_AUDIT.md` (H1–H12).

**Code:**
- `ctrl/v2_support.js`: the lifecycle.
- `ctrl/v2_stand.js`: options `lifecycle`, `pelvisDrop`, diagnostic `lcFrame`.
- `gates/v2_g2.js`: the self-contact flag.
- `gates/v2_g3.js`: abort-to-touchdown.

**All of it is EXPERIMENTAL and default OFF.** With the options off, the G3 state hashes and IK checksums are bit-identical to before (4 runs, checked after every change).

**Not E1a:** the controller never commands a lift here. Validation uses the external-lift harness `tools/boundary_probe.mjs`, which applies a ledgered upward force on the unloaded shank, ramped up then down.

## 1. The support / contact lifecycle (replaces G3's one-tick `unl` / `contactSupport` booleans)

| state | meaning | support weight s | airborne weight a |
|---|---|---|---|
| SUPPORT | loaded, part of the support | 1 | 0 |
| UNLOADING | sustained unload in contact (and the plan does not want load there); the contact anchor is captured **here, once, on the turf** | 1 → 0 (smoothstep 0.1 s) | 0 |
| TOUCHING | in contact, not supporting | 0 | 0 |
| LIFTOFF | touching pieces = 0, not yet confirmed | 0 | 0 |
| AIRBORNE | confirmed contact loss (debounce 12.5 ms) | 0 | 0 → 1 (0.1 s) |
| TOUCHDOWN | contact after AIRBORNE; **contact ≠ support**; the anchor is re-captured flat where the foot landed | 0 | 1 → 0 |
| LOAD_ACCEPT | contact + intent (requested share ≥ 5 %) or sustained allowed load, for 50 ms | 0 → 1 (0.1 s) | 0 |

**Transitions:**
- Each condition must hold for its debounce: 12.5 ms; 4 ms for touchdown; 50 ms for acceptance. Debounces are time-based, so they don't change with the physics rate.
- Load hysteresis: 1 % / 3 % BW.
- A load reading taken while a non-turf contact touches the foot is ignored (self-contact guard).

**What the weights drive (all continuous in s and a; no boolean in the torque path):**

| quantity | how | hazard |
|---|---|---|
| heading | s-weighted mean of the feet's forward vectors, each corrected by that foot's reference toe-out | H6 |
| balance midpoint | s-weighted mean of the ankles | H7 |
| pelvis-height reference | s-weighted mean ankle height; the feasibility cap uses each leg's actual target pose | H8 |
| support polygon | each foot's region scaled toward its centroid by s; a weight-0 foot is excluded | H5 |
| load share | a foot's share ≤ its s | H3 |
| leg target | "foot where it is" in support; else the contact anchor (or a commanded swing target), blended toward the current pose by s | H1, H2 |
| leg IK | non-supporting leg: **soft-limit bounded IK** from the **actual pelvis frame** (a world-space servo), blended back to the posture frame by s | H1, H11 |
| leg gains | hip / knee: posture gains in contact → swing-servo gains (bandwidth 4 Hz, ζ 0.8, from the distal-subtree inertia) when airborne. Ankle of a non-supporting foot: swing ankle gains | H11 |
| abort | with a foot off the turf: put it down on its anchor first (swing target cleared, request held), then return to bilateral | H9 |
| commanded lift (E1 interface) | `setSwingTarget(n, pose)`: used in any non-support state. The commander starts its profile at `target(n)` and clears it once the foot is down. **First physical execution = E1a** (unit-tested only: R7.h) | — |

**Not addressed (by design):**
- **H10** (swing-foot yaw) depends on the twist policy and the ankle law.
- **H12** (one-tick sensing latency) is inherent; the debounces add 1–3 ticks.

## 2. Counterexamples found while building it (kept; each fixed by a measured change)

| version | measured failure (external-lift harness, V2-REF, k = 0) | fix |
|---|---|---|
| 1 | heading from the stance foot alone rotated the pelvis-yaw target by 6° (that foot's toe-out) | toe-out-corrected forward vectors |
| 1 | a touchdown impact (52–60 N, ~50 ms) entered LOAD_ACCEPT although the request kept that foot unloaded, then released it again | intent-gated acceptance; 50 ms acceptance debounce |
| 2 | **load-only acceptance deadlock:** the controller never assigned load to the touching foot, until the body fell onto it with ξ 10 cm outside the stance foot | acceptance starts from contact + intent |
| 2 | holding a touching foot from the actual pelvis frame with the unconstrained IK pressed the knee to **−2.8° (hyperextension, 18–20 N·m of tissue)**; the foot slid 25 mm | **soft-limit bounded IK** for every non-supporting leg |
| 3 | swing servo still engaged at touchdown: 80–180 N on the "unsupported" foot, stance balance lost, abort, fall | contact anchor re-captured at touchdown; airborne weight a returns the hip / knee to posture gains in contact |
| 4 | the touchdown anchor captured a tilted first contact; the foot was then held on 2 of 8 pieces | anchor = landing position and yaw with the previous flat height and tilt; swing ankle gains in contact |
| 5 | the intent-started acceptance was released after 12 ms, because the foot naturally has no load yet | low load releases support only when the plan does not want load there |
| 5 | posture-frame hold in contact: 34–44 N·m commanded-torque steps at liftoff / touchdown | actual-frame servo for every non-supporting leg (3–7 N·m) |

## 3. Validation

- **Unit (permanent regressions R7.a–i, `tools/v2_component_regressions.mjs`; suite 44/44):**
  - contact flicker never confirms AIRBORNE, and the weights stay 0;
  - liftoff is debounced, and the weights are continuous;
  - an impact without intent is not support, while intent + contact is;
  - the self-contact guard works;
  - the anchor is captured on the turf, frozen in the air and re-captured flat;
  - a wanted foot is not released;
  - the lifecycle is deterministic with an exact snapshot round trip;
  - a commanded swing target is used;
  - the option is off by default.
- **Harness matrix (§3 results, `evidence/boundary/`):** 8 bodies × lift 30 / 60 N × pelvis drop 0 / 2.5 cm × k 0 / 0.13 (reference twist policy); abort pushes 10 / 20 N·s toward the airborne side; 180 / 480 Hz. Results: ⟨BND⟩.

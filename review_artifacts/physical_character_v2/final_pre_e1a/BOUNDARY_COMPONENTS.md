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
| 6 | actual pelvis height in contact: a pelvis 1 cm above its target made the touching leg a **straight strut** (knee 0°, about 60 N). It held the pelvis up and rolled the body over the stance foot's edge; abort, fall (60 N lift + drop: 7–8 of 8 bodies) | contact-state frame height **min(target, actual)**; vertical-free hold in contact |
| 7 | target pelvis height in contact with the pelvis above target: the touching foot was lifted to the contact threshold (repeated TOUCHDOWN ↔ AIRBORNE, 12–18 N·m) | min(target, actual); bounce debounce 50 ms |
| 8 | the target height switched with the state at a bounce re-liftoff: a 3.7 mm target step, 88 N·m τ0 jump, 32 N·m applied | target height continuous in the airborne weight a |

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
- **Harness matrix, final frozen code** (commit 0bdde9f, `evidence/boundary/`). 88 runs, 0 errors:
  - 8 bodies × lift 30 / 60 N × pelvis drop 0 / 2.5 cm × k 0 / 0.13 (reference twist policy);
  - abort pushes of 10 / 20 N·s toward the airborne side, during a 45 N lift (3 bodies × k);
  - 180 / 480 Hz (3 bodies × k).

| check | result |
|---|---|
| falls | **0 / 88** (earlier versions: up to 8 / 8 in the 60 N + drop cell) |
| lifecycle chatter (a state re-entered within 60 ms) | **0** in every run |
| true contact loss | AIRBORNE reached in 88 / 88. With the external force still ramping, the foot can bounce: up to 4–5 AIRBORNE entries, each a genuine contact loss of more than 50 ms |
| stance-foot slip | ≤ 0.06 mm (≤ 0.42 mm with the 10 N·s abort push; **8–9 mm with the 20 N·s push**, where the abort puts the foot down early) |
| heading excursion | ≤ 2.3° (was 6° before the toe-out correction) |
| energy closure, per tick | ≤ +0.015 J (no creation event at any rate) |
| applied-torque steps > 10 N·m | **48, all within 0.1 s after a touchdown / load acceptance.** That is the impact response through the implicit damping of the swing servo. None anywhere else |
| gentle case (30 N lift): largest applied step | 6.5–11.2 N·m (≤ 8.8 with the drop) |
| 60 N + drop: largest applied step | 40–44 N·m at touchdown. The external force drives the foot onto the turf. An E1 replace is slow (0.4 s min-jerk); E1a-7 allows ≤ 25 N·m in the 2 ticks after a contact onset, and E1 will measure it |
| rate 180 / 240 / 480 Hz | the same behaviour classes (stood, 0 falls, 0 chatter); closure maxima 0.004 / 0.002 / 0.001 J per tick |
| outcome "foot relocated" | the lifted foot lands off its spot (6–14 mm) under the external force. That is the harness, not a support failure: stance slip stays ≤ 0.06 mm |

**What the harness cannot validate (first physical test = E1a):**
- the commanded lift / hover / replace path. Its interface is unit-tested only (R7.h);
- hover accuracy without an external force.

Under the 30 N force the airborne servo shows an effective stiffness of about 2–3 kN/m: 9–11 mm mean hover error under 30 N.

## 4. Gate regression of the lifecycle (G2 / G3 with reference + lifecycle + k 0.13; scratch tree; `evidence/gval/`)

**G2:** every re-measured gating row passes. **G3 v3.3:** 13 / 15 native rows pass. Two lifecycle findings at **standing pelvis height**:

- **I2:** on V2-long-legs (U:R / U:L) the unloaded touching foot drifts **5.0 mm** under the hold (limit 2 mm; G3's `holdUnloaded`: ≤ 2 mm).
  - The soft-limit bounded IK cannot reach the anchor inside the soft box with a near-straight knee, so the hold pose is off the anchor.
  - This is the same reach-margin issue that motivates the planned pelvis drop in E1a.
- **K:** T11 "over 1.2" (an excessive request) now **stands**. Row K requires an excessive request to fail physically, i.e. not to be silently made safe.
  - Under investigation: the lifecycle keeps a foot carrying 1–3 % BW in support (hysteresis band), which plausibly widens the effective support.

**Neither affects the E1a protocol** (planned drop, the foot unloaded by request, no excessive request). **But the lifecycle is not yet G3-regression-safe as a default:** debt item.

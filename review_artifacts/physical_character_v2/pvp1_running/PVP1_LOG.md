# PVP-1 log: SP2F2 and SP2F3 against the same running recipient

**Instruction:** `sources/2026-10-14_user_instruction_pvp1_running_recipient_f2_vs_f3.md` (≈ 23:45 BST, 14 Oct 2026; pasted by the owner; saved at `837b4b42`).

**Work time:** 14 Oct 23:50 → 15 Oct ≈ 01:00 BST.

**Frozen throughout:**
- **SP2F2 (`44a80d3c`) and SP2F3 (`39a0446b`), exactly as committed:** candidate, entry, choreography, controller, M1c, TCF-1 on their boots, F37.5 on their bodies, 5.0 m/s.
- **Not modified:** RUN-1, V1, C3, ball physics, and the PVP-1A files.

**Records** (outside Git): `_preserved_2026-10-15_evidence_outside_git/pvp1/records/`.
- 15 runs: 5 conditions × (PVP-F2, PVP-F3, TWIN).
- `reference.json`; the conditions metadata.
- The RUN-1 run-in `run1r_4.147.json` (sha256 `8c2e8507…`).

## 1. Pieces

All new code is in `pvp1_running/scripts/`. Everything else is imported read-only.

**`pvp1_world.mjs`: the two-player world.**
- It is the frozen PVP-0 world, `Pvp0Plant` on `PvpPlant`: one Jolt world in which every cross-character pair collides, with ledgers and decoded contacts.
- **Recipient body:** the recipient's spec is set to the tacklers' V1-matched V2 spec, during construction only.
- **Tackler, run exactly as `runSP2F2` / `runSP2F3` run it:**
  - the same candidate, `cand.makeCtrl`, M1c and TCF-1;
  - F37.5 through a copy of `fs_contact.installBodyFrictionScale` whose only change is the Jolt user-data offset (the tackler's bodies are 15…28 here);
  - its own solo frame: not rotated, not moved;
  - activated at step 0 with the SoloPlant muscle re-initialisation.
- **Recipient:**
  - parked (kinematic) at its handoff pose until its takeover step;
  - then dynamic, with one velocity write per body;
  - its law's first command re-initialises its muscles on the true state.
- **TWIN:** the same world with the tackler never activated.

**`pvp1_recipient.mjs`: the running recipient.** See §2.

**`pvp1_setup.mjs`: the frozen geometry, timing and conditions.** See §3.

**Drivers and analysis:**
- `pvp1_run.mjs`: the driver.
- `pvp1_analyze.mjs` and `pvp1_series.mjs`: measurement.
- `pvp1_twin_probe.mjs`: the investigation probe used in §2.

## 2. The running recipient: what was tried, and why it is what it is

**There is no physical running controller in V2.** RUN-1 is presentation-only, and the R2 handoff contract reported NOT READY.

**Source.** The RUN-1 run-in at 4.147 m/s, extracted again over a longer window (0.4–5.6 s) by `sp2a_run1.mjs`. It matches the earlier extraction to within 1e-9. On the tackler body, with SP2A's leg-ratio mapping, the recipient runs at 4.5 m/s.

**Controller.** `RegionalTracker` with:
- RUN-1's own continuation as the choreography;
- the SP2A gains, lead and rate lead;
- reduced stance-leg authority;
- free-chain inverse-dynamics feed-forward for the swing limbs;
- a running support objective per stance (sp_vf mapping): COM height plan with feed-forward, an along-leg horizontal force with a velocity regulator, pelvis orientation through the stance hip, and a tactile gate;
- muscles initialised at RUN-1's whole-body inverse dynamics (sp2a_wbid).

**Attempts, all on the TWIN (no tackle):**

| attempt | result |
|---|---|
| A. Airborne handoff 50 ms before a touchdown, M1b | Sinks through the first stance (COM 1.00 → 0.89 m in 0.15 s). The swing foot scuffs the turf, and it falls by 0.5 s. |
| — first support-objective version | Its capacity scaling (sp_vf `capScale`) zeroed the support whenever the tracker already saturated an axis. Removed (`capScale: false`). |
| B. M1b diagnosis | The swing-knee PD demanded about 900 N·m while about 50 N·m was delivered. M1b applies its full short-range damping at the full joint speed, which caps a driven joint at about 3–4 rad/s (SLIDE-PHYS-1 audit `m1b_effective_fv.json`); a running swing needs about 8–15 rad/s. Both tacklers use M1c for exactly this reason. |
| C. M1c (the tacklers' labelled fast-motion candidate) | Same sinking. M1c only removes the speed cap; force development is still the voluntary rise time constant (90–135 ms), and an airborne handoff starts the extensors at flight torques. |
| D. RUN-1's inverse dynamics as a lead feed-forward (0.1 s) | Still collapses. RUN-1 itself demands stance ankle torques of −600 to −850 N·m: a centre of pressure about 0.4 m ahead of the ankle, beyond the toes. RUN-1's mapped motion is not dynamically consistent for this body. |
| E. Handoff inside the stance (25 ms after touchdown, SP2A's takeover rule) | The stance continues, but the vertical ground force falls from 2.7 to 0.5 BW within 0.125 s. As the knee and ankle extend, their extensor capacity collapses (knee 314 → 25 N·m: force–velocity, with no tendon elasticity to return stored energy). There is no push-off, so the flight is too short, the other leg lands early and flexed, and the body pitches forward: first non-foot turf contact about 0.42 s after takeover. |
| F. Contact-driven support (`catch`) | The early landing leg received no support, because its window was on RUN-1's clock. With `catch`, either foot supports whenever it touches the turf (RUN-1's plan inside its own stance, a hold-up plan otherwise). Same fall; it does not change the first 0.15 s. Kept, as the more sensible generic balance controller. |

**Time-box reached.** A physically sustainable run is not available on this body and muscle model.

**Adopted design** (`pvp1_setup.RECIPIENT_OPTS = { muscle: "M1c", catch: {}, support: { capScale: false } }`):
- RUN-1 is the recipient until a takeover 50 ms before the first player contact, inside the struck stance (never earlier than 25 ms after its touchdown).
- The TWIN is run for every condition and reported as the confound.

**Canonical M1b TWIN** (`evidence/PVP1_checks_extra.json`): collapses the same way (first non-foot contact +0.43 s against +0.42 s), with a slower swing hip (31° against 42° flexion at +0.1 s).

## 3. Frozen setup (fixed before any PVP result was looked at)

**Speeds and approach.**
- Tacklers at 5.0 m/s (their canonical speed). Recipient at 4.5 m/s.
- Recipient yaw −135°: it runs toward the tackler's line at 135°, so the tackler approaches from its front-right. This is REFERENCE3 mirrored: there a right-side slider comes in from the attacker's front-left (frame review of the clip).
- Near foot = struck foot = RIGHT, in RUN-1 stance from frame 554 (2.708 s, 51 frames).

**Spatial placement.**
- Target: the tackling boot's position 0.12 s after its first fold-side turf contact (the SP2 Stage-3 rule), as the mean of the solo SP2F2 (0.4125 s, boot (0.216, 0.057, 3.577)) and SP2F3 (0.4167 s, (0.166, 0.047, 3.601)) runs. These match the preserved SP2F2 / SP2F3 records.
- The recipient is translated so its struck sole centre + λ along its travel is at the target.

**Timing.** The recipient's RUN-1 clock is set so its stance phase at the first player contact is the condition's phase. One alignment iteration on the measured first contact (the mean of F2 and F3).

**Conditions:**

| condition | stance phase | λ |
|---|---|---|
| CANON | 50 % | 0 |
| EARLY | 30 % | 0 |
| LATE | 70 % | 0 |
| LIGHT | 50 % | +0.16 m (toward the toes) |
| STRONG | 50 % | −0.07 m (heel / ankle) |

**Achieved** (first contact; phase in RUN-1 frames):
- CANON / EARLY / LATE: 0.4917 s at 50 / 31 / 69 %.
- LIGHT: 0.5208 s at 50 %.
- STRONG: 0.4875 s (F2) / 0.4833 s (F3) at 50 / 48 %.
- Every first contact is tackling boot × struck boot.

## 4. Checks

- **Recipient identity:** bit-identical in PVP-F2, PVP-F3 and the TWIN up to the first contact (0 mm, every condition). No player contact while it is parked.
- **Tackler vs its solo run before contact:** within 3–4 mm (16 mm in LIGHT F3, whose contact comes later). This is floating-point order in the larger world.
- **Determinism:** CANON F3 re-ran bit-identical (`c03c6f78f2a78ecd`).
- **Contacts:**
  - equal and opposite at every step;
  - largest player–player penetration 1.0–8.7 mm, and 15.7 mm once (LIGHT F2: the recipient's pelvis landing on the tackler's thorax);
  - largest player–player force 0.7–1.6 kN at the boot contact, and up to 5.9 kN when the recipient lands on the tackler (EARLY, LIGHT);
  - no integrity stop.

## 5. Results

The full tables are in `evidence/PVP1_analysis.json` and on the review page; the summary is in `PVP1_REPORT.md`.

**Recipient at contact (CANON):**

| | physical | RUN-1 |
|---|---|---|
| right-foot load | 1.7 BW | 2.7 BW |
| COM velocity (fwd / left / up, m/s) | 4.47 / 0.05 / 0.04 | 4.39 / −0.07 / 0.35 |

- COM height −5 mm, pelvis 0.8°, joint RMS 6.8°.
- **LATE degrades most** before contact: 0.47 BW against 1.53 BW, and 20 mm low.

**Recipient response:**
- **Struck foot:** swept toward the other foot in every run: 11–21 cm by +0.1 s (EARLY F2 4 cm, 10 cm by +0.2 s), about 0.3–0.4 m by +0.2 s in CANON. The twin's foot moves 1–3 cm.
- **Fall onset:** within ±0.05 s of the twin's (+0.40…+0.45 s) in all ten runs.
- **Change from the twin:** direction only, from pelvis yaw −14…−42° at +0.3 s and leftward COM velocity (+0.2…+0.9 m/s).

**Tacklers:**

| | F2 | F3 |
|---|---|---|
| momentum lost | 6–49 % | 9–43 % |
| stops dead | never | never |
| folded knee, change from solo | 29–59° (LATE / EARLY / LIGHT) | ≤ 7° |
| hand post | ≤ 0.09 s of gaps | interrupted in CANON / LATE / STRONG (0.17–0.41 s) |

**Pinning:** none sustained. The downward force on the recipient's feet exceeds 0.3 BW for at most 0.062 s.

## 6. Renders and page

**Renders:** `pvp1_running/render/pvp1_render.sh`.
- `pvp1_clip.mjs`: both characters on MC-1P (the tackler as gabriel, the recipient as vinicius); one camera path per condition.
- `pvp1_capture.cjs`: `sp_capture.cjs` with two-player overlays.
- Window: first contact −0.5 → +2.0 s.
- Views: R34, RSIDE, RFRONT34, GAME, DIAG, the TWIN comparisons, and the robustness set.
- REFERENCE3 composites → `review/local_reference/` (gitignored).

**Page:** `render/pvp1_review_build.mjs` → `review/PVP1_REVIEW.html`. All 21 videos load (checked headless).

**Visual review:** I cannot play video in real time. I reviewed the canonical side, rear 3/4 and diagnostic views and the EARLY side view frame by frame, at 15–60 fps strips.

## 7. Collision review (15 Oct ≈ 00:50 → 01:05, rendering only)

**Instruction:** `sources/2026-10-15_user_instruction_pvp1_collision_review_render.md` (`218a5593`). Nothing was re-simulated. The frozen CANON records were read:
- PVP-F2 `7706ea69409e0bfa`;
- PVP-F3 `c03c6f78f2a78ecd`;
- TWIN `0ae8181ea74a7783`.

**Renders:** `render/pvp1_collision_render.sh` → `review/collision/`.
- `pvp1_collision_clip.mjs`: the per-frame camera target (the smoothed 3-D midpoint of the two COMs, plus their separation), COMs, feet and turf loads, the tackling boot, player–player contacts (normal and force on the recipient), and the first contact.
- `pvp1_collision_capture.cjs`:
  - a per-panel camera at a set azimuth and elevation, at distance max(d, 1.3 × separation + 2.3 m);
  - clean and diagnostic overlays;
  - the first-contact frame marked with a red border, a banner and a timeline tick;
  - PNG stills.
- Layout: PVP-F2 | PVP-F3, 640 × 540 each, plus a TWIN inset, 320 × 270, on the PVP-F2 camera path.

**Views** (window −0.30 → +0.75 s):

| view | angle | speeds |
|---|---|---|
| CLOSE | az 60 | 1×, 0.25×, 0.10× |
| SIDE | az 90, perpendicular to the tackle | 1×, 0.25× |
| FRONT34 | az 35 | 1×, 0.25× |
| REAR34 | az −140 | 1×, 0.25× |
| DIAG | az 60 | 1×, 0.25×, 0.10× |
| DIAGSIDE | az 90 | 1×, 0.25× |

The 0.10× videos show each recorded step 2.5× longer; there is no interpolation.

**Stills:** grids and single frames at −100 / −50 / 0 / +25 / +50 / +100 / +200 / +400 ms.

**Camera match:** the PVP-F2 and PVP-F3 camera targets agree within 3 cm until +400 ms (11 cm at +750 ms).

**Data:** `scripts/pvp1_collision_data.mjs` → `evidence/PVP1_collision.json`. It holds the contact log per body pair, the tackling-boot and struck-foot kinematics, and the turf loads.

**What is visible:**
- **First contact** at step 118: the tackling right boot against the recipient's loaded right boot (1.7 BW), in both.
- **The same boot** then clips the swinging left boot: +29…+79 ms (F2), +29…+54 ms (F3).
- **The tackling boot** slows to 2.9 m/s (F2) and 1.5 m/s (F3) at +25 ms, then accelerates through (3.6 / 4.8 m/s at +75 ms). F2's boot rides up about 6 cm.
- **The struck foot** is pushed toward the other foot at 2.1 / 2.6 m/s by +50 ms (twin 0.2) and leaves the turf at about +75 ms.
- **No turf support** from about +75 ms to +150 ms (F3) or +200 ms (F2).
- **Later contacts:** the F2 head touches the recipient's forearm at +108…+121 ms. The recipient's left leg lands on F3's posting arm at +271…+367 ms.

**Page:** `render/pvp1_collision_review_build.mjs` → `review/PVP1_COLLISION_REVIEW.html`. All 14 videos load (headless check). It is linked from `PVP1_REVIEW.html`.

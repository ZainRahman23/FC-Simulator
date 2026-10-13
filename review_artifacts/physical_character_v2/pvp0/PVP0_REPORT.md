# PVP-0: first two-player physical contact (report)

13 Oct 2026, after the instruction received at ≈ 01:50 BST (saved verbatim at 64459a71). Discovery, not qualification. **Nothing was fixed.**

**Review page:** http://127.0.0.1:8350/pvp0/review/PVP0_REVIEW.html (`pvp0/review/PVP0_REVIEW.html`)

```
PVP-0 CONTACT PHYSICS:          PARTIAL
PVP-0 VISUAL RESPONSE:          FAIL
TACKLER REMAINS RECOGNIZABLE:   NO
RECIPIENT RESPONSE PLAUSIBLE:   NO
READY FOR NEXT PVP ITERATION:   NO
```

These verdicts, the 13 answers and the problem ranking are my judgments. They come from the stills and close-ups cited and the evidence files.

## 1. What was consumed

| | |
|---|---|
| **C3** | Exactly as frozen at **d590fd46**: `balance2/c3/c3_ctrl.mjs` (last change 727f4751) and `balance2/c3/params/C3.json` (d590fd46). No later commits and no uncommitted diff. Run on the canonical M1b body (`balance1/scripts/b1_body.mjs` and `params/B1_BODY.json` at 01653ab4; `v2_muscle.js` at 6ac988ef), from the PPR-3 standing entry. B3 was not used. |
| **Slide candidate** | **SLIDE-A1 K** from Astra's repo `~/Documents/Codex/2026-10-12/new-chat/touchline-slide`, branch `research/slide-a1-authored`, commit **59b7245c**, `slide_a1/k/review/K.json` (sha256 dfe57992…). It was the latest committed candidate at PVP-0 start. K's REPORT says "Gate A: OPEN": it is current, not approved. Extracted with `git show`, read-only. The uncommitted `slide_a1/l/` was not read. |

## 2. Physicalization method

- **World.** The frozen PVP-1A two-character plant: one Jolt world, all cross-character pairs colliding, real V2 collision shapes, per-manifold contact decode, per-character and system momentum/energy ledgers, and an equal-and-opposite check. Two law hooks, each through its own canonical M1b body.
- **Tackler entry.** The tackler is parked kinematic and inert until step 408 (1.7 s; the recipient settles under C3 meanwhile). It then becomes dynamic, with K's own per-body velocities at K time 0.30 s. That single velocity write is its initial condition. After that: no pose writes, no root drive, no external force, no ragdoll switch, no outcome logic.
- **Why the start is airborne.** It is the committed portion of the slide. K's run-up accelerates 2.5 → 7 m/s in 0.25 s (≈ 1.8 g from one stance leg), which no physical body can reproduce. So the tackler starts in the air at K's scissor, with no RUN-1 transition.
- **Motor intent (KTracker).** Per actuated axis: K·err + D·(ω_ref − ω) − τ_static toward K's joint targets (240 Hz slerp).
  - The gains are V2's own PostureDriver gains, so authority is finite and constant (Astra's model A).
  - The intent reaches the body only through M1b: activation lag, capacity, force–velocity, strain-arm yield.
  - It tracks strongly before contact. At contact the collisions win, and yielding is the muscles' own.
- **Retarget.** V2 body rotation = Gabriel bone rotation · C (arms ∓90° about z). Positions come from V2's own forward kinematics, anchored at Gabriel's hip mid-point. Targets are not clamped.
- **Strengths.** One external parameter: horizontal approach speed = 0.5 / 1.0 / 1.25 × K's 6.74 m/s. The placement follows one rule from the tackler-alone CALIB run, with nothing tuned per case.
- **References.**
  - TWIN: the same world with the tackler parked, the recipient's undisturbed reference.
  - CALIB: the NOMINAL tackler 10 m clear, the no-contact tackler reference.

## 3. Results

| | LIGHT | REFERENCE (NOMINAL) | HEAVY |
|---|---|---|---|
| Approach velocity (horizontal COM) | 3.37 m/s | 6.74 m/s | 8.43 m/s |
| Vertical velocity at contact | −4.85 | −4.86 | −4.86 m/s (the tackler is landing) |
| First contact (after activation) | 0.192 s | 0.200 s | 0.204 s |
| First-contact pair | tackler foot_R → recipient shank_L (all three) | | |
| Contact height · normal | 35 cm · (0.30, −0.04, 0.95) | 28 cm · (0.46, −0.07, 0.89) | 26 cm · (0.45, −0.07, 0.89) |
| Strike impulse on recipient (100 ms) | 76 N·s | 74 N·s | 83 N·s |
| Strike peak step force | 1.42 kN | 2.65 kN | 2.72 kN |
| Run peak step force | 1.42 kN | 8.50 kN (1.28 s: bodies piling up) | 7.97 kN (0.43 s: the sweep) |
| Peak penetration: strike / run | 1.7 / 1.7 mm | 3.7 / 13.8 mm | 4.0 / 14.2 mm |
| Recipient COM: peak deviation from twin | 120 mm, held | 1404 mm | 787 mm |
| Recipient falls | no | yes, 0.96 s | yes, 1.50 s |
| Struck leg (ankle / knee / hip), peak deviation | 37 / 16 / 8° | 33 / 21 / 50° | 36 / 19 / 52° |
| Propagation (pelvis / thorax / head) | 17 / 38 / 58 ms | 4 / 25 / 42 ms | 4 / 17 / 38 ms |
| Tackler Δv horizontal (100 ms) | 2.57 m/s | 3.27 m/s (CALIB, no contact: 3.09) | 3.55 m/s |
| Tackler travel · stop | 0.82 m · 0.67 s | 2.14 m · 1.11 s (CALIB 2.95 m · 1.06 s) | 2.90 m · 0.83 s |

**Contact geometry.** The tackler's right (tackling) boot strikes the outside of the recipient's left shin, 26–35 cm above the turf, from his left and across his path. Every strike impulse has a large downward part, because the boot is falling at 4.9 m/s as it hits.

**Recipient COM response.**
- LIGHT: the COM drifts 120 mm and is held there. The load moves to the right foot (115 / 743 N at +0.8 s). There is no recovery, because the tackler keeps pressing (260–500 N for over 3 s).
- NOMINAL: the COM goes 1.4 m.
- HEAVY: the COM goes 0.8 m, and the pelvis is lifted (+639 N·s net upward cross impulse).

**Tackler COM response.**
- Its own landing dominates. In NOMINAL it loses 3.27 m/s horizontally in 100 ms, against 3.09 m/s with no contact.
- The cross impulse is ≈ 75 N·s, about 1 m/s of its 78.9 kg. The turf impulse is 220–450 N·s vertical.
- The contact does shorten the slide: LIGHT stops dead at the foot; NOMINAL travels 0.8 m less than CALIB.

**Momentum accounting closes for linear momentum and the recipient, but not for energy.**
- Equal-and-opposite: exact (0 / 0).
- Linear residuals: system ≤ 3.7e-4 N·s, per character ≤ 3.7e-4.
- Angular: the recipient's residual is ≤ 0.053. The tackler's peaks at 0.24–0.40 on its own turf-impact step (103 N·s normal in one step), not at player contact.
- Energy does not close: turf friction and impact dissipation are not ledgered (residual 400–630 J).
- The ledgers exclude the activation-write step.

**Whether either body falls, and why.**
- The recipient does not fall in LIGHT: he is pinned upright.
- NOMINAL: the left foot is trapped behind the face-down tackler, and he sits down onto the tackler's back.
- HEAVY: the left foot is swept and unloaded from about 0.6 s. He hops over on the right leg. The tackler's upturned left leg then lifts his pelvis (pelvis × shank_L 522 N·s) and flips him; his trunk ends at 143°.
- The tackler "falls" in every case, including with no contact. It is supposed to go to ground, but it rolls face-down instead of sliding on its side.
- All of this is emergent from contact and muscle physics. Nothing is scripted.

**Saturation and yielding.**
- Recipient: saturated steps 0 / 907 / 882; strain-arm yield events 871 / 7602 / 7492. The TWIN has 0 / 0, so all of the recipient's yielding comes from contact.
- Tackler: saturated steps 203 / 271 / 458; yield events 2683 / 4148 / 4949. CALIB alone: 176 and 4135 (in 840 steps), so the tackler's yielding is mostly its own landing.
- Local yield of the tackling limb, NOMINAL against CALIB (identical up to contact): ankle_R 53° and knee_R 19° within 50 ms, hip_R 5°. The distal joints yield first.

**Phasing.**
- None at the strike: at most 4 mm, inside Jolt's 5 mm slop.
- Sustained crushing contacts exceed the slop:
  - NOMINAL: shank_L × foot_R 13.8 mm for 12 steps; abdomen × pelvis 12.9 mm in the pile.
  - HEAVY: shank_L × foot_R 14.2 mm; thorax × pelvis 12.1 mm for 20 steps; pelvis × foot_L 7.3 mm for 33 steps.
- None of it is visible at the gameplay camera. The rendered boot envelope adds up to 16 mm (TRC-1).

**Joint-limit problems.**
- Tackler:
  - neck lateral bend 12.6–13.4° past its hard limit at landing (0.2 s);
  - hip_L flexion 6° past its limit in K's own start pose (authored);
  - ankle_R 7.5–10.7° at the strike.
- Recipient: 3.0 / 6.5 / 8.9°, mostly ankle inversion and hip abduction during the falls.

**Determinism.** NOMINAL was rerun bit-identically (80fe925d6380b67b). Final hashes: LIGHT 363ec994c97bad90, HEAVY 9376fd891f4c9cbd, TWIN 2960efa781b24fb1, CALIB dad4aba129e196f9.

**CPU.** 1.79–1.82 ms per 240 Hz step for both characters (simulation + passive + actuator + tone + both laws), about 0.43 s of CPU per simulated second. That is 2.29–2.43 ms with the instrumentation.

## 4. The 13 questions (detail on the review page, §4)

| # | Answer | Owner of the problem |
|---|---|---|
| 1. Does the leg genuinely hit, not phase through? | YES | – |
| 2. Does the struck leg yield? | YES, but it stays pinned | TACKLER PHYSICAL TRACKING |
| 3. Does propagation run leg → pelvis → trunk? | YES | – |
| 4. Does C3 attempt to balance? | YES (load shift, no step, no arms) | RECIPIENT BALANCE |
| 5. Does the recipient sometimes remain standing? | YES (LIGHT), pinned | TACKLER PHYSICAL TRACKING + RECIPIENT BALANCE |
| 6. Can strong contact make him fall? | YES | PLAYER-PLAYER CONTACT (emergent); the flip is caused by TACKLER PHYSICAL TRACKING |
| 7. Does the tackler react to hitting another mass? | PARTLY (the limb deflects, the slide shortens; the body response is its own landing) | TACKLER ACTION |
| 8. Does the authored action survive contact? | NO, and it does not survive without contact either | TACKLER PHYSICAL TRACKING; INTEGRATION; TACKLER ACTION |
| 9. Do joints become unnaturally stiff? | Partly (held postures) | RECIPIENT BALANCE; TACKLER PHYSICAL TRACKING |
| 10. Does either player look like a mannequin, plank or limp ragdoll? | YES | RECIPIENT BALANCE; TACKLER PHYSICAL TRACKING |
| 11. Is there phasing? | Not at the strike; 12–14 mm in sustained crushing contact | PLAYER-PLAYER CONTACT |
| 12. Is ground contact stable? | YES after landing; the landing is violent | TACKLER ACTION; INTEGRATION |
| 13. Does it read as one footballer tackling another? | NO | TACKLER PHYSICAL TRACKING (main); RENDERING (scale) |

## 5. The three largest visual problems

**1. The tackler does not perform a slide tackle.**
- What happens: it lands hard (−4.86 m/s vertical at the instant of contact), rolls face-down into a belly-flop with the arms forward and the left leg up, and stops within about 1 s.
- What K authors: a side-on slide. The pelvis belly normal stays ≈ +0.19 (+1 is face-up, −1 face-down). The physical tackler reaches −0.55 (LIGHT) and −0.95 (NOMINAL/HEAVY).
- It is not caused by contact. CALIB, with nobody there, reaches −1.0 at 500 ms and ends ≈ 175° from the authored pelvis orientation.
- Two upstream causes feed it:
  - The retarget anchors V2's hip at Gabriel's hip height. In KNEE_EXTENSION, Gabriel's left toe is within 2–5 cm of the turf and K's descent slows. V2's authored left ankle sits 0.21–0.23 m up, ≈ 13 cm above V2's on-turf height. So the authored support never touches, and the body free-falls from 3.2 m/s.
  - The start had to be airborne.
- **Owner:** TACKLER PHYSICAL TRACKING. Joint-space tracking cannot hold whole-body orientation, and the rules give it no root drive.
- **Contributing:** INTEGRATION (the retarget's vertical anchoring) and TACKLER ACTION (K's non-physical run-up and flight; Gate A is open).

**2. The bodies lock together after contact.**
- After the strike the tracker keeps driving the tackling leg toward K's target. The boot stays pressed into the shin and foot (260–500 N for over 3 s in LIGHT).
- The recipient can neither free the foot nor step. Results:
  - LIGHT: a statue;
  - NOMINAL: the trapped foot makes him sit down on the tackler;
  - HEAVY: the tackler's upturned left leg lifts him and flips him.
- **Owner:** TACKLER PHYSICAL TRACKING. Authority is constant after contact: the limb deflects locally, but the intent never releases.
- **Contributing:** RECIPIENT BALANCE (C3 has no step).

**3. The recipient reads as a mannequin.**
- No step, no arm response, no hop over the boot. The struck ankle is held at ≈ 34° for over 3 s. Under light contact the only visible response is a lean.
- The mechanics underneath are right: yield, ordered propagation, load shift. Nothing shows them.
- **Owner:** RECIPIENT BALANCE. C3 is a no-step, arms-passive baseline by design. The shortfall is behavioural, not a contact-physics fault.

**Also:** at the actual gameplay camera (zoom 1) the players are ≈ 15 px tall, and the event cannot be read (RENDERING: the existing camera, not a regression).

## 6. Why these verdicts

- **CONTACT PHYSICS: PARTIAL.**
  - What works: the strike is real; equal-and-opposite is exact; linear momentum closes; propagation is ordered; both limbs yield locally; the outcomes run from standing to falling.
  - What fails: sustained crushing contacts reach 12–14 mm, past the slop, and energy is not ledgered.
- **VISUAL RESPONSE: FAIL.** It does not read as a tackle (Q13).
- **TACKLER RECOGNIZABLE: NO.** It reads as a belly-flop dive, with or without the recipient.
- **RECIPIENT PLAUSIBLE: NO.** The mechanics are sound; the behaviour is not: pinned statue, slow sit-down, flip. Part of this is caused by the tackler.
- **READY FOR NEXT PVP ITERATION: NO.**
  - The contact harness, instrumentation, references and renders are ready.
  - The tackler input is not. It cannot physically execute the slide even alone (CALIB).
  - Another PVP iteration would measure the same belly-flop. The tackler's solo physical execution, and its post-contact authority, must be decided first. That decision is yours.

## 7. Disclosures

- **Provenance filename collision (setup error, corrected at 200eedd4).** The volume is case-insensitive. Writing PVP-0's `PROVENANCE.json` overwrote K's own `provenance.json`, and d43958e1 committed it under K's filename. I restored K's file byte-for-byte (sha256 4911ac30…, matching the recorded hash) and renamed PVP-0's record to `PVP0_K_PROVENANCE.json`. No script reads either file, so no result changes.
- **Review media added after the first capture.** The 0.25× close-ups (K_*) end at +0.8 s, before the falls. So I added whole-run 1× close-ups (KL_*: same clip data, same camera, zoom 8, every 4th step). Rendering only.
- **Evidence scripts added after the runs** (all read-only on the records):
  - `pvp0_pose.mjs`: authored vs physical posture, including CALIB;
  - `pvp0_kfoot.mjs`: retarget vertical audit;
  - `pvp0_tackler_ref.mjs`: contact vs no-contact tackler;
  - an added strike-window peak force/penetration in `pvp0_strike.mjs`.
- **Run records** (143 MB) are outside Git, with SHA256SUMS. See `pvp0/review/OUTSIDE_GIT.md`.

## 8. Not modified

C3, M1b, RUN-1, the anatomy, simulation collision decisions, authoritative outcomes and gameplay tackle logic. Nothing was tuned per case, and nothing found here was fixed.

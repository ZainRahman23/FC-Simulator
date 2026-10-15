# HYBRID-RUN-1 report: an animation-driven, physically interruptible runner

**Instruction:** `sources/2026-10-15_user_instruction_hybrid_run1_animation_driven_interruptible_runner.md` (≈ 02:35 BST, 15 Oct 2026; saved at `73f3cac5`).

**Review page:** `:8350/hybrid_run1/review/HYBRID_RUN1_REVIEW.html`. It contains every video, the measured tables, the sensitivity check, the simulation boundary and the full answers to the 15 questions.

**Development log:** `HYBRID_RUN1_LOG.md`.

I cannot play video in real time. I reviewed every clip as frame strips and contact sheets.

```
NO-CONTACT RUN PRESERVED: YES
RUN ANIMATION CAN COEXIST WITH PHYSICAL BODY: YES
SHOULDER CONTACT PHYSICALLY INTERRUPTS RUN: YES
MODERATE BUMP CAN RECOVER WHILE RUN CONTINUES: NO
REGIONAL PHYSICAL OVERRIDE WORKS: YES
ROOT MOTION / PHYSICS COEXISTENCE: PARTIAL
SLIDE-TACKLE SUPPORT LOSS IS NOW MEANINGFUL AGAINST STABLE TWIN: PARTIAL
FULL PHYSICS-GENERATED RUNNING REQUIRED: NO
RECOMMEND HYBRID ANIMATION + ACTIVE RIGIDBODY ARCHITECTURE: NEEDS MORE EVIDENCE
```

## Summary

**What works:**
- RUN-1 stays the locomotor intent from start to end and is never stopped, edited or re-timed.
- A full V2 rigid body runs underneath it with real velocities and collides from step 0.
- Undisturbed, it reproduces RUN-1 closely and does not fall for the whole available RUN-1 run-in (3.26 s).
- Contacts win region by region, with no switch:
  - arms yield in shoulder contact;
  - the struck leg is overridden in the slide tackle;
  - a displaced body keeps its displacement, because there is no position term anywhere.

**What does not work yet:**
1. **A displaced runner never recovers.** It runs on for 1–2 s while its legs' tracking degrades, then it falls. This happens after every shoulder contact, even the BRUSH (A falls 2.25 s after it). Nothing removes a lateral disturbance: there is no stepping response.
2. **RUN-1 is not angular-momentum consistent.** To follow it, the pelvis needs a bounded external moment (the "animation-consistency" moment, ≤ 450 N·m). No contact supplies that moment.
   - The undisturbed runner needs it: it falls 1.3–2.0 s after the moment is removed.
   - After a contact the moment works 3–5× harder and holds the struck runner up for an extra 0.3–0.4 s.
   - It is logged and drawn in every diagnostic, but it does fight angular displacement.

**The PVP rerun:**
- The twin is now stable, unlike PVP-1's.
- The struck leg is overridden (authority 0.17), the struck boot is carried 13–15 cm sideways, and the far boot comes down early in a stumble step.
- But the tackle catches the boot at its toe-off: it unloads on the twin's own schedule.
- The recipient stumbles and falls about 1 s later, past the tackler. This is not REFERENCE3's sliced-out response.

## 1. What was built (`hybrid_run1/scripts/`)

**Intent (`hr_intent.mjs`).** RUN-1 sampled at 240 Hz, read-only:
- joint targets;
- pelvis orientation and angular velocity;
- COM height, velocity and acceleration;
- stance flags.

Step n is RUN-1 frame k0 + n. The intent never sees the physical body.

**Body and world (`hr_world.mjs`).**
- **World:** the frozen PVP-0 / PVP-1 two-character world (`Pvp0Plant`). Both characters are the tacklers' V1-matched V2 body.
- **Start state:** RUN-1's own pose and body velocities (finite differences of the animation), with one velocity write per body at step 0.
- **After step 0:** no pose, position or velocity is ever written again. No body is kinematic.
- **Tacklers:** SP2F2 and SP2F3 are built exactly as PVP-1 builds them (`tacklerCand`, M1c, TCF-1, F37.5 on their bodies, their own solo frame).

**The hybrid runner (`hr_runner.mjs`).** Every force it adds is bounded and logged.

1. **Joint tracking.**
   - PD on RUN-1's joint targets, plus the relative-motion feed-forward of the intended limb motion (`hr_id.mjs`).
   - Gains: 8 Hz (hip, knee), 7 Hz (ankle), 6 Hz (trunk, arms) and 5 Hz (neck), on the subtree inertia.
   - Torque is limited inside the solver to 2 × the athlete's isometric capacity (`hr_drive.mjs`). There is no force–velocity curve and no activation lag: this is the animation's authority, not a muscle model.
   - A supporting leg runs at 30 % authority with no feed-forward.
2. **Gait support (the gait abstraction).** While a boot is actually on the turf, the intended ground reaction is applied as an internal pair: −F at the boot's contact centroid, +F spread over the other bodies by mass. Momentum therefore enters or leaves the athlete only through the real boot–turf contact.
   - **Horizontal:** velocity only (25 /s along the run, 4 /s across it), with no position term.
   - **Vertical:** RUN-1's COM height and velocity (150 /s², 25 /s).
   - **Bounds:** friction cone μ 0.9; ≤ 3.5 BW; a lean envelope (35–60°, reach 1.15 m); pelvis organisation (35–70° tilt).
   - **Load sensing:** the horizontal force the boot actually received is fed back (β 1, τ 0.02 s).
3. **Balance moment on the pelvis**, toward RUN-1's pelvis orientation (2500 N·m/rad, 250 N·m·s/rad). It has two parts:
   - *Supported:* ≤ 0.4 m × the support's vertical force for pitch/roll and ≤ 0.2 m × it for yaw; zero without support.
   - *Animation-consistency:* the remainder, ≤ 450 N·m pitch/roll and ≤ 150 N·m yaw, scaled by the trunk's authority.
4. **Regional authority** for legL, legR, trunk, armL and armR:
   - D = max(0, e − eTol) / 15° + J / 4 N·s;
   - α* = 0.15 + 0.85·e^(−D);
   - α falls with τ 0.02 s and recovers with τ 0.3 s.
   - e is the region's joint-tracking error. eTol is fixed from the no-contact run: legs 11°, trunk 3°, arms 3°.
   - J is the player–player impulse on the region's bodies, sensed with a 20 ms delay over a 30 ms window.
   - α scales the joint drive and the animation part of the pelvis moment.

**Tried and off in every frozen run:**
- swing-foot placement (it made the runner worse);
- phase synchronisation (neutral).

## 2. Scenes (`hr_scenes.mjs`), fixed before they were run

- **NC:** one hybrid runner, RUN-1 from frame 462. This is the PVP-1 recipient's RUN-1 clock.
- **SH_BRUSH / BUMP / STRONG:**
  - A runs straight.
  - B starts 1.1 m to A's right, half a step out of phase (frame 543), at an intended heading θ toward A.
  - B's intent straightens over [t_c − 0.1, t_c + 0.2] s, where t_c is when the intended COMs would be 0.42 m apart.
  - θ = 6° / 10° / 15°; nothing else differs between severities.
  - Nobody's fall is set anywhere.
- **PVP_F2 / PVP_F3 / PVP_TWIN:** the PVP-1 CANON placement, the same recipient RUN-1 phase and the same tacklers. The TWIN has the tackler parked and never activated.

## 3. Results

### A · No contact

**Falls:** none to the end of RUN-1's data (3.26 s). The PVP TWIN does not fall either.

**Hybrid against RUN-1:**

| Measure | Result |
|---|---|
| Pelvis orientation error | median 2.2°, max 4.1° |
| Joint RMS error, legs | median 1.5–1.7°, max 7.2° |
| Joint RMS error, trunk | ≤ 1.8° |
| Joint RMS error, arms | ≤ 1° |
| Touchdown timing | 2.2 frames (9 ms) early on average (4 early … 1 late) |
| Planted-boot slip | ≤ 3.5 cm |
| COM error | within 5 cm sideways and 2.2 cm vertically |
| Forward speed | 1.2 % low: 5.6 cm/s, 17 cm behind RUN-1 at 2.9 s |

**Other measures:**
- No region ever yields: minimum authority is 1.0.
- Balance moment (supported / animation): median 105 / 0 N·m, p95 274 / 174, max 372 / 292.

### B · Shoulder to shoulder

"Left" is A's own left, away from B.

| | BRUSH (6°) | BUMP (10°) | STRONG (15°) |
|---|---|---|---|
| First contact | 0.908 s, A right forearm × B left forearm | 0.613 s, upper arms | 0.358 s, forearms |
| Contact lasts until | 1.733 s | 1.092 s | 1.125 s |
| Impulse on A, toward its left | 47 N·s | 77 N·s | 102 N·s |
| A off its no-contact path, +0.5 / +1.0 s | 9 / 18 cm | 19 / 32 cm | 20 / 32 cm |
| A's contact arm, lowest α (back above 0.9 after) | 0.30 (1.25 s) | 0.19 (0.97 s) | 0.20 (1.18 s) |
| A's legs | full authority for 1.25 s, then down to 0.35 | from +0.25 s; 0.55 at +0.5 s; 0.37 by +1.0 s | from +0.4 s; 0.53 at +0.75 s; 0.34 by +1.25 s |
| **A falls** | **3.158 s (+2.25 s)** | **1.775 s (+1.16 s)** | **1.867 s (+1.51 s)** |
| B falls | no | no | no |

**Notes:**
- The BRUSH fall happens after the 3.0 s frozen records end. It was found by continuing every scene to the end of RUN-1's data (`hr_extend.mjs`; identical step for step over the first 720 steps). The clip "BRUSH, late" shows it.
- B's own intent drove the contact, and the contact mostly cancels B's veer. That is why B runs on.
- Severity is not monotonic in the outcome: STRONG falls later than BUMP.

### C · Slide tackle (frozen PVP-1 canonical setup, hybrid recipient)

**First contact:** step 120 (F2, 0.5000 s) / step 119 (F3, 0.4958 s), the same as PVP-1. The tackling right boot meets the loaded right boot (2.29 / 2.06 BW).

| | PVP-F2 | PVP-F3 | TWIN |
|---|---|---|---|
| Struck-leg authority at +25 / +50 / +100 ms | 0.89 / 0.40 / 0.17 | 0.96 / 0.40 / 0.17 | 1 |
| Struck boot at +100 ms (along / toward right / up) | −1 / 13 / 16 cm | 0 / 15 / 13 cm | 7 / 1 / 13 cm |
| Struck boot load at +25 / +50 / +100 ms | 1.80 / 1.32 / 0 BW | 1.90 / 1.81 / 0 BW | 1.80 / 1.30 / 0 BW |
| Far boot down after contact | +96 ms | +108 ms | +213 ms (next step) |
| COM at +100 ms: toward right · forward | 0.30 · 4.07 m/s | 0.67 · 4.03 m/s | −0.06 · 4.54 m/s |
| Trunk tilt at +300 ms | 19° | 27° | 11° |
| Pelvis height at +1000 ms | 0.50 m | 0.48 m | 0.90 m |
| **Recipient down** | **+1.01 s** (right thigh) | **+0.96 s** (right thigh) | never |
| Tackler speed at 0 / +100 / +500 ms | 4.40 / 3.31 / 2.65 m/s | 4.45 / 2.74 / 1.82 m/s | – |

**Later contacts:**
- F2's head touches the recipient's left forearm (+117…+125 ms).
- The recipient's left leg comes down on F3's posting arm (+233…+412 ms).

**Compared with PVP-1:**
- In PVP-1 the twin itself collapsed about 0.42 s after the contact time, and every tackled fall began within ±0.05 s of the twin's. So the tackle could not be read.
- Here the twin runs on, and every difference is physical and measured.

### D · Sensitivity: the animation-consistency moment (`hr_sens_ac.mjs`; not adopted)

**Usage over the first second after contact** (mean / max, N·m):

| Run | Mean / max |
|---|---|
| NC | 52 / 292 |
| TWIN | 49 / 287 |
| BRUSH | 46 / 308 |
| BUMP | 167 / 458 |
| STRONG | 120 / 440 |
| F2 | 201 / 474 |
| F3 | 249 / 475 |

In the BUMP and STRONG runs, B uses 49–51 N·m.

**Moment removed at a fixed time, no contact** (at 0.358 / 0.5 / 0.9 s): the runner falls 2.05 / 1.75 / 1.32 s later.

**Moment removed from the first sensed contact on:**

| Scene | Fall without the moment | Frozen fall |
|---|---|---|
| BRUSH | A +1.18 s; B falls too | A +2.25 s |
| BUMP | A +0.83 s | A +1.16 s |
| STRONG | A +1.13 s | A +1.51 s |
| PVP-F2 | +0.60 s | +1.01 s |
| PVP-F3 | +0.58 s | +0.96 s |

**What this shows:** the moment carries load even without contact, and it props up struck runners. Both facts belong to the open angular reconciliation.

## 4. The 15 questions (short form; full answers on the page and in `evidence/HR1_answers.json`)

1. **Can RUN-1 remain the intent on a collidable body?** YES.
2. **Is the no-contact run reproduced without physics-generated gait?** YES, with one non-physical part: the bounded animation-consistency pelvis moment.
3. **Can a bump displace the upper body while the legs run on?** YES. A is pushed 19–32 cm with the arm yielding first. After BUMP and STRONG the legs soon struggle too.
4. **Can the player recover from a modest bump?** NO for the displaced runner: A falls at every severity, even BRUSH. B runs on.
5. **Is the disturbance progressive, not a switch?** YES. Authority falls continuously and region by region, and support fails only physically.
6. **Does root motion fight displacement?** Linear: no (velocity only, through the turf). Angular: partly (the animation-consistency moment).
7. **Minimum change to reconcile the two?** The linear part is done here: intended velocity through the real stance boot. Still open: make the pelvis moment physical (a support/CoP budget, or an angular-momentum-consistent intent) and put it under a whole-body orientation authority.
8. **Are procedural foot adjustments required?** Not for running. Yes for recovery, as a balance (stepping) response; the minimal versions tried were not enough.
9. **Can collision locally override a RUN-1 leg?** YES: struck-leg α 0.17 within 100 ms while the trunk and arms stay at 1.
10. **Does the struck leg now differ from the stable twin?** YES, but it is struck at toe-off, and its unloading follows the twin's schedule.
11. **Does support loss propagate into the pelvis/trunk?** PARTLY. It does propagate, but the animation-consistency moment slows it.
12. **Does F2 or F3 produce a genuine sliced-out response?** NO: a stumble, then a fall ~1 s later past the tackler.
13. **Do lighter contacts allow continued running/recovery?** Continued running yes, for 1–2 s; recovery no.
14. **Does the animation erase collision consequences?** Nothing is erased. One bounded external moment counteracts rotation and delays falls by 0.3–0.4 s.
15. **Is the architecture sufficient?** NOT YET. The two gaps are angular reconciliation and recovery stepping. Neither points to physics-generated running.

## 5. Authoritative-simulation boundary

**Deterministic:**
- Fixed 240 Hz step, one Jolt world, and no random number anywhere: scenes, runner law, analysis and renders.
- Per-step state hash chains. SH_BUMP `971195aa` and PVP_F3 `245cbc6e` were re-run from scratch and reproduced, and the extended runs match the frozen ones step for step.

**What the runner reads:**
- its own body state;
- RUN-1 at the step's frame;
- the plant's record of its own previous-step contacts (turf loads and player–player impulses), i.e. touch and load sensing with a 20 ms delay.

Nothing comes from presentation. The renders only read records.

**What must be surfaced to the simulation architecture if this is adopted** (none of it may live in rendering):
1. **The locomotor intent** (RUN-1 frame, heading, desired velocity), owned by the action/locomotion layer.
2. **The outcome-deciding physical state** (COM position and velocity, which boots carry load, fallen or not), as authoritative input to possession, tackle outcome and fall state.
3. **Every non-contact force:** the gait-support pair, the supported pelvis moment and **the animation-consistency moment**. The last is a gameplay-affecting non-physical force; if kept, it needs an explicit, budgeted simulation term.
4. **Regional authority and its constants.** They decide who wins a contact.
5. **All parameters,** versioned with the simulation.

**Not integrated anywhere.** The authoritative simulation, V1, RUN-1, C3, ball physics, PVP-1 (including PVP-1A), SP2F2 and SP2F3 are untouched.

## 6. Erratum found on the way (PVP-1 collision review, not edited)

**The error:** `pvp1_collision_data.mjs` uses left = local +x. On this body, local +x is the recipient's anatomical **right**: thigh_L sits at −x when the body faces +z.

**What it affects:** the PVP-1 collision page says the contact force pointed "toward the recipient's other foot". It actually pointed toward the recipient's right, away from its other boot, along the tackler's travel. The same applies to the "left" columns there.

**This report:** uses the anatomical left throughout.

PVP-1 is preserved exactly, as instructed.

## 7. Files, hashes, reproduction

**Code:**
- `scripts/`: `hr_intent`, `hr_id`, `hr_drive`, `hr_runner`, `hr_world`, `hr_scenes`, `hr_analyze`, `hr_extend`, `hr_sens_ac`.
- `render/`: `hr_render.sh` (`hr_clip.mjs`, `hr_capture.cjs`) and `hr_review_build.mjs`.

**Evidence (`evidence/`):**
- `HR1_analysis.json`
- `HR1_extended_window.json`
- `HR1_sensitivity_animation_moment.json`
- `HR1_answers.json`

**Frozen records (720 steps):**

| Run | Hash |
|---|---|
| NC | `52c3320f` |
| SH_BRUSH | `6e49d614` |
| SH_BUMP | `971195aa` |
| SH_STRONG | `02626820` |
| PVP_TWIN | `2de7a70f` |
| PVP_F2 | `f36c9e7c` |
| PVP_F3 | `245cbc6e` |

**Extended records (783 steps):**

| Run | Hash |
|---|---|
| NC | `3fbcc130` |
| TWIN | `b78ce975` |
| BRUSH | `63ea944a` |
| BUMP | `823a4948` |
| STRONG | `89a466a4` |
| F2 | `51b3bb35` |
| F3 | `39cbc36c` |

**Where the records are:** outside Git, in `_preserved_2026-10-15_evidence_outside_git/hybrid_run1/` (`runs/`, `runs_ext/`, `runs_sens/`).

**Reproduce (worktree root, `LV2_ARCHIVE` set):**
```
node .../hybrid_run1/scripts/hr_scenes.mjs NC,SH_BRUSH,SH_BUMP,SH_STRONG,PVP_TWIN,PVP_F2,PVP_F3 <runs> 720
node .../hybrid_run1/scripts/hr_extend.mjs <runs_ext> evidence/HR1_extended_window.json
node .../hybrid_run1/scripts/hr_analyze.mjs --runs <runs> --out evidence/HR1_analysis.json
node .../hybrid_run1/scripts/hr_sens_ac.mjs --runs <runs> --tmp <runs_sens> --out evidence/HR1_sensitivity_animation_moment.json
hr_render.sh <scratch> <runs> <review dir> <runs_ext>; node .../render/hr_review_build.mjs
```

**Reference composites:** the REFERENCE3 composites are in `review/local_reference/`, which is gitignored and never committed.

## 8. Decisions for the owner

1. **The animation-consistency moment.** Options:
   - accept it as an explicit, budgeted simulation term;
   - replace it with a support-paid moment;
   - make the RUN-1 intent angular-momentum consistent.
2. **Recovery.** Whether a stepping / foot-placement recovery response is in scope for the next mission. The minimal SIMBICON-style version made things worse; something better-founded would be needed.
3. **The slide-tackle fixture.** Whether to keep the PVP-1 canonical contact phase, which catches the boot at its toe-off, or to add a fixture in which the tackle meets a boot early in its stance.

Stopped here, as the instruction's stop condition requires. Nothing is productionised, F2/F3 are unchanged, friction is not calibrated, M1b is not redesigned, and no tendon-driven running was built.

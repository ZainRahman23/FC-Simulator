# PVP-1 report: SP2F2 and SP2F3 against the same running recipient

This report answers your PVP-1 instruction (`sources/2026-10-14_user_instruction_pvp1_running_recipient_f2_vs_f3.md`). The work is local and stopped for your visual review.

- **Page:** `review/PVP1_REVIEW.html` (served at :8350/pvp1_running/review/PVP1_REVIEW.html).
- **Log:** `PVP1_LOG.md`.
- **Evidence:** `evidence/`.

**Not done:**
- Neither tackle was tuned. SP2F2 and SP2F3 run exactly as committed: 5.0 m/s, F37.5, TCF-1, M1c.
- No friction calibration, no canned recipient reaction, no ragdoll trigger, no F2/F3 hybrid, no production integration.

## The short answer

**What the tacklers do.** Both meet the same RUN-1 runner from the same geometry and speed: the tackler comes from his front-right at 135°, REFERENCE3 mirrored.
- First contact is the tackling boot against his loaded right boot at mid-stance.
- His struck foot is swept toward his other foot: about 16–18 cm by +0.1 s and 0.3–0.4 m by +0.2 s. With no tackle it moves 1–3 cm.
- Neither tackler stops dead or pins the feet.

**The problem with the recipient: he cannot keep running physically.**
- His TWIN (the identical recipient, no tackle) also sinks through the stance and fails to push off. It lands early on the other foot and dives forward to the turf about 0.42 s after the contact time.
- The canonical M1b muscles do the same.
- So the up-and-over fall, which does look like REFERENCE3, is mostly his own collapse. In all ten runs the fall starts within ±0.05 s of the twin's. The tackle changes the fall's direction, not whether or when it happens.

You asked me to record that honestly if it happened. It is the main result.

## The recipient

**What was preserved at takeover.** He is RUN-1 (the frozen straight-line baseline) at 4.5 m/s on the tacklers' V2 body, handed to physics 50 ms before first contact inside the struck stance:
- RUN-1's own pose, joint velocities, COM velocity and momentum;
- muscles starting at the run's own inverse dynamics.

**State at first contact (CANON):**

| | physical | RUN-1 |
|---|---|---|
| pelvis | within 0.8° | |
| COM height | within 5 mm | |
| horizontal COM velocity | within 0.1 m/s | |
| struck-foot load | 1.7 BW | 2.7 BW |
| upward COM velocity | +0.04 m/s | +0.35 m/s |

The per-foot load and the run's continuation are therefore not preserved.

**Why he cannot run** (§2 of the log has every attempt):
- RUN-1's kinematics demand stance ankle torques of −600 to −850 N·m on this body: a centre of pressure beyond the toes.
- As the stance knee and ankle extend, the muscles' force–velocity capacity collapses (knee 314 → 25 N·m in 0.14 s). With no tendon elasticity in the model there is no push-off.
- An airborne handoff is worse: force develops too slowly, so the extensors are not pre-activated.
- I time-boxed the controller work. A sustainable physical run is not available on this body and muscle model.

**How the tests were run.** Every test still compares against the TWIN. The recipient uses M1c, the tacklers' labelled fast-motion candidate (not canonical, not adopted). Canonical M1b caps a driven joint at about 3–4 rad/s, which would freeze the free leg's swing. The M1b TWIN collapses the same way.

## Verdicts

- **RUNNING RECIPIENT STATE VALID: NO.** The incoming state is genuine running, but the per-foot load and the run's continuation are not preserved, and he falls without any tackle.
- **F2 CONTACT PHYSICS PLAUSIBLE: PARTIAL.**
  - Contacts are authoritative: no ghosting, exactly equal-and-opposite impulses, interpenetration ≤ 9 mm (16 mm once, when the recipient lands on it).
  - It slides through and loses 6–49 % of its momentum.
  - The recipient's half is confounded, and its raised arm reaches into his body.
- **F3 CONTACT PHYSICS PLAUSIBLE: PARTIAL.** The same, with 9–43 % momentum loss.
- **F2 REMAINS RECOGNIZABLE AFTER CONTACT: PARTIAL.** Its slide and post survive, but its folded-leg tuck is knocked open by 29–59° (LATE, EARLY, LIGHT).
- **F3 REMAINS RECOGNIZABLE AFTER CONTACT: PARTIAL.** Its tuck survives (≤ 7°), but its later held post is interrupted for 0.17–0.41 s in CANON, LATE and STRONG, and its posting arm fails regionally in CANON.
- **RECIPIENT RESPONSE EMERGES WITHOUT SCRIPTING: YES.** Nothing is authored or triggered, but what emerges is mostly his own collapse.
- **SLICED-OUT RESPONSE OBSERVED: NO.** He is swept and goes over the tackler, but his fall starts at the twin's time. REFERENCE3's attacker keeps running over the slider for about 0.5 s; ours goes over within 0.2–0.3 s.
- **LIGHTER RECOVERABLE RESPONSE OBSERVED: NO.**
- **FOOT PINNING PRESENT: NEITHER.** The downward force on his feet exceeds 0.3 BW for at most 0.06 s, and the struck foot moves sideways in every run. The PVP-0 failure does not occur.
- **READY TO CHOOSE OR HYBRIDIZE F2/F3: WAIT FOR OWNER VISUAL REVIEW.**

## What F2 does better

- **Its posting arm survives the collision.** The early sliding post is already down when he arrives (+0.04 s after contact) and keeps contact, with ≤ 0.09 s of gaps in every condition.
- **It goes through more cleanly** in the central, late and heel-line cases:

  | | CANON | LATE | STRONG |
  |---|---|---|---|
  | momentum lost, F2 | 13 % | 6 % | 8 % |
  | momentum lost, F3 | 24 % | 9 % | 15 % |

- **Its trunk stays near its solo lean through the contact.** F3 sits up.

## What F3 does better

- **Its folded-leg tuck survives being hit:** ≤ 7° of change in every condition, against F2's 29–59°.
- **It removes the support more decisively.**
  - The struck foot unloads 21–29 ms earlier than the twin in CANON, EARLY and LIGHT.
  - It delivers more impulse in CANON (85 against 47 N·s) and lifts the struck foot higher.

## What both get wrong

- **The raised tackling-side arm** (authored up and over since SP2D) reaches up into the recipient's falling body. It reads as a blocking arm.
- **When the recipient lands on them** (EARLY, LIGHT), both lose 38–49 % of their momentum, end 1.4–1.8 m short of their solo slide, and neither reorganises.
- **By +1 s both are far from their designed slide** in most conditions: pelvis 28–109° (F2) and 10–98° (F3) from solo.
- **The robustness labels describe geometry, not outcome.**
  - LIGHT (boot line 0.16 m toward the toes) gave the largest interaction: his body lands across the tackler.
  - STRONG (the line through the heel) gave one of the smallest: the struck foot is near its own toe-off.

## Robustness set (same frozen setup)

| | phase at contact | boot line | result |
|---|---|---|---|
| EARLY | 31 % | through the foot | Lands on the tackler (36–45 N·s from his upper body). Under F2 the far foot is only down at +0.66 s. |
| LATE | 69 % | through the foot | Lightest touch (23–34 N·s total impulse). Already unloading. |
| LIGHT | 50 % | +0.16 m toward the toes | His body lands across the tackler (50–82 N·s from his upper body), and the tacklers lose 41–49 %. |
| STRONG | 50 % | −0.07 m, heel | Light (28–57 N·s total impulse). |

In every condition the fall timing matches the twin's.

## What it would take

A recipient who can physically keep running, so the tackle, not his own collapse, decides the outcome. That needs one of two things, and both are your decision; nothing was started:
- muscle–tendon elasticity, or another running-capable actuator model;
- a running controller designed for this body.

## For your eye

**Watch first:**
- the 1× side view (PVP-F2 | PVP-F3 | TWIN), where the twin's own dive is plain;
- the local REFERENCE3 | PVP-F2 | PVP-F3 composite.

**Visual review:** I cannot play video in real time. I reviewed the canonical and EARLY views frame by frame (15–60 fps strips).

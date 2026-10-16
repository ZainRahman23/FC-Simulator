# TURN-1.1 — the authored change-of-direction library

The library lives in `sandbox/visual/turn1/turn11_body.js`, in the `LIB` (bases) and `MOD` (modifiers) tables. Every pose is authored once, for a **right** turn; a left turn is the exact mirror. It has three parts:

- **three plant bases:** SIDESTEP, XOVER and PIVOT;
- **two step modifiers:** BRAKE and EXIT;
- **one reaction term:** REACT, which covers the time between the command and the first braking contact.

There are no per-angle variants, no per-speed variants and no left/right copies.

## Where the poses sit in time: the plant timeline τ

Each base is a set of key poses on one timeline, anchored to TURN-1's plant:

| τ | Moment | Clock (s) |
|---|---|---|
| −1 → 0 | preparation (the last braking stance and flight) | the 0.30 s before the plant touchdown |
| 0 | plant touchdown | |
| 0 → 1 | the plant stance: load (≈ 0.35), redirect (≈ 0.7), push (1) | TURN-1's own contact time: 0.17–0.34 s by angle |
| 1 | plant toe-off | |
| 1 → 3 | flight, first step, acceleration | the 0.50 s after toe-off (`T_POST` = 0.25 s per unit) |

- **Before the plant:** τ comes from the plant foot's forecast touchdown, the same forecast TURN-1's swing aims at.
- **During the plant stance:** τ is the stance fraction.
- **After the plant:** τ comes from the recorded toe-off time.
- **Lead:** key poses are reached 50 ms early, which compensates for the follower lag below.

## Channels (all on top of TURN-1's procedural body)

| Group | Channels | Notes |
|---|---|---|
| Pelvis | `pY` height · `pX` / `pZ` shift · `pRoll` / `pPitch` / `pYaw` | While the layer acts, the pelvis takes 45 % of TURN-1's lateral lean (TURN-1: 80 %) and 40 % of its forward lean (55 %). The trunk bends the rest, so the athlete reads as bending at the waist into the cut, not as a rigid tilted stick. |
| Trunk | `tRoll` lean into the turn · `tPitch` brace / drive · `tYaw` shoulders leading the hips | Split 40 / 60 over spine and chest. |
| Head | `hPitch` (chin up) · `hLev` | `hLev` levels the head against the trunk's roll. The gaze direction is TURN-1's: the head turns toward the request at 720°/s. |
| Arms | `aW` weight · per arm `Az` / `El` / `Elb` | O = the arm on the outside of the turn, I = inside. A **direction in the pelvis-heading frame** (az 0 = forward, +90 = out to that arm's side, 180 = back; el = degrees below horizontal) plus the elbow angle. RUN-1's own arm cycle is turned toward it by the **minimal rotation** (weight `aW`), so blending is continuous everywhere, with no gimbal flips. |
| Arm drive | `armAmp` · `armElb` | The acceleration modifier on RUN-1's arm cycle: a larger range and a tighter elbow. |
| Free leg | `fAdv` · `fKnee` · `fLift` · `fTuck` · `fFwd` · `fCross` | `fAdv` runs the swing ahead (ease-out). `fKnee` is a mid-swing knee lift, `fLift` a late knee drive. `fTuck` reduces the heel kick. `fFwd` brings the foot through sooner. `fCross` crosses the swing in front of the plant (crossover only). Every offset is zero at toe-off and touchdown, so the plant TURN-1 aimed at is landed exactly. |

Every channel passes a critically damped follower:
- arms: 22 ms;
- pelvis position: 40 ms;
- everything else: 30 ms.

Retargets, flips and cancels therefore blend; they never pop.

## The three bases

**SIDESTEP: the outside-foot cut, about 45–135°.**
- **Brace (τ −0.5 → 0):**
  - the trunk pitches back to −10° at contact;
  - the pelvis is carried toward the foot ahead;
  - both arms come forward and out.
- **Plant and load (0 → 0.35):**
  - the pelvis sinks (on top of TURN-1's reach-driven drop) and shifts toward the wide plant;
  - the trunk leans into the turn, up to 22° on top of TURN-1's lean (about 37° in total);
  - the shoulders lead the hips by up to 20°;
  - the outside arm goes out wide and nearly straight (az 92°, el 18°, elbow 20°) as the balancing arm;
  - the inside arm swings back and out with the elbow bent.
- **Redirect and push (0.35 → 1):**
  - the trunk rocks forward (pitch +18°) and the hips catch up;
  - the outside arm sweeps across the front (az −20°, elbow 95°) while the inside arm drives back, the arm action of the first step.
- **Free leg:** throughout the plant stance it comes through under the body (ease-out up to 0.8) and the knee rises (11–12 cm mid-swing), so it waits in front for the first step instead of trailing behind or kneeling.
- **Exit (1 → 3):** everything hands back to the run cycle and the EXIT modifier.

**XOVER: the inside-foot crossover, ≤ 70°, when it saves a stride.**
- **Differs from the side-step in:**
  - **hips:** they open early (pelvis yaw +14° by τ 0.4, ahead of TURN-1's facing);
  - **trunk:** taller and forward, with only a little lean (+7°);
  - **free leg:** the outside leg crosses in front of the plant (12 cm mid-swing);
  - **arms:** the outside arm drives across and the inside arm opens back, with no wide balancing arm.
- **Shared with the side-step:** both shift the pelvis toward the plant. The crossover adds pelvis roll toward the plant side, because TURN-1 lands the inside foot across, under the body.

**PIVOT: reversals of about 135° and over (and TURN-1's inside-foot pivot from 110°).**
- **Brace:** braking with the arms out in front.
- **Side-on into the plant:** the hips turn up to 35° toward the turn before the foot lands (the 505 technique), then hand back to TURN-1's facing by τ 0.9.
- **Rotation:** the shoulders lead it (up to 22° ahead of the hips); the outside arm sweeps across the chest and the inside arm pulls back, both elbows bent 90–100° (driving, not reaching).
- **Drive out:** low and forward (trunk pitch +18° at toe-off), the free leg coming through fast (ease-out 0.85).

## The modifiers

- **BRAKE.** Applies to each braking stance and the flight into it. Its intensity is 0.5–1, set by the stance's deceleration (|ΔV| 0.4 → 1.8 m/s).
  - trunk back −13° on top of TURN-1's braking lean;
  - a slight sink (−2.5 cm) and the pelvis toward the foot ahead;
  - arms forward and out (az 35°, el 32°, elbow 60°, weight 0.85);
  - chin up; shorter, quicker free swings.
- **EXIT.** Applies to the exit and acceleration steps. Its intensity is the speed still to gain, (v_desired − v) / 3 m/s:
  - arm drive range +50 %, elbow +12°;
  - knee drive on the acceleration swings (+5 cm);
  - the head up (against TURN-1's forward drive lean);
  - an acceleration posture that starts 4 cm low and rises as the speed returns.
- **REACT.** Applies from the command until the first braking contact; it is the "the player heard you" response:
  - the shoulders start turning (+12°) and the trunk braces (−4°);
  - a slight sink;
  - the arms start to organise (weight 0.5).
  - The plant itself is never faked: TURN-1's plant timing is untouched.

## Intensity: one family, continuous strength

- **Angle:** side-step 0.45 → 1.0 over 30–115°; crossover 0.55 → 1.0 over 20–70°; pivot 0.85 → 1.0 over 135–180°.
- **Approach speed** (the speed at the request): × 0.8 → 1.1 over 4.5–9.5 m/s. So a sprint cut leans further and spreads the arms wider than a jog cut of the same angle.
- **Result:** a 60° and a 110° side-step use the same keys at different strengths.

## The pelvis height and reach (why the feet never skate)

The authored pelvis is livelier than TURN-1's, so the layer re-plans TURN-1's reach-driven pelvis drop for its own pelvis:
- **Inputs:** its height, shift, lean split and yaw.
- **Margin:** 94.8 % of leg length (TURN-1 used 95.5 %, with its crouch as extra margin).
- **Depth budget:** the reach drop may also use the crouch depth TURN-1 would have had at that moment, which the layer replaces.

It adds two guards:
- **Late-stance reach guard:** the pushing foot must stay reachable with at most a 72° heel rise until toe-off. TURN-1 relied on an unbounded heel rise, which is why its pivots slid 1.5–2.3 cm.
- **Hips over the pushing foot:** late in plant and exit stances the pelvis is carried up to 7 cm toward the stance foot.

The swinging knee's floor is raised from 0.24 to 0.34 m while a maneuver acts, so a trailing knee lifts and never kneels.

## Extending it (if visual evidence ever requires it)

- **Adding a base:** add a `LIB` entry and its technique in TURN-1's resolver. Nothing else changes.
- **Retuning a pose:** edit its keys; each line is one channel.
- **Ball-touch intent (DRIBBLE-1):** belongs as another free-leg swing offset of the same kind, zero at both swing ends, aimed through a contact point. See `TURN11_REPORT.md`.

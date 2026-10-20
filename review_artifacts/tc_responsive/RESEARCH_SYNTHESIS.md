# Responsive dribbling — research synthesis

*Date: 21 Oct 2026.*

**Inputs:**
- **[R] the owner's report.** `sources/2026-10-20_owner_research_Touchline_Dribbling_Research.pdf`, 21 pages, read in full.
- **[M] my own research.** I re-read the primary EA pages verbatim this session and looked at public animation-technology sources. I also read the Touchline code and measured the locked baseline (88573ef0) and PLAYTEST-1.2 on identical stick traces: `evidence/RESP_CLOCKS_baseline_88573ef0_vs_1.2.txt`.

**Labels:**

| label | meaning |
|---|---|
| **EA ✓** | confirmed EA information; I re-read the primary source this session |
| **EA (R)** | EA information cited by the report that I did not re-verify |
| **OBS** | observation (footage, or our own measurement) |
| **INF** | inference |
| **DES** | our design decision (proposed; needs the owner's approval) |

---

## 1 Agreements

**EA ✓ — the FC 26 Gameplay Deep Dive (22 Jul 2025), verbatim:**
- "Animation transitions and branching have been improved for increased responsiveness … to diminish the feeling of being 'locked in' to animations."
- "Effort Touch animations now trigger during drastic dribble turns to ensure faster and authentic turns."
- "Adjusted deceleration of all players to be faster and snappier."
- "improved animations for all types of turns (drastic turns, swivel turns, etc.) to be faster and more responsive."
- "Improved selection of animations to better match the player's current speed and animation speed."
- "Relaxed the coverage required for animations, allowing them to start faster in many situations."
- "The interval between dribble touches varies between Competitive and Authentic". Also: "re-tuned how close the player keeps the ball", and "adjusted dribbling foot preference logic and animation branching logic to allow for more responsive ball control".
- Competitive is "tuned for added responsiveness and higher player control" and explicitly accepts "Less authentic visuals when avoiding a ball, to resolve these situations more effectively".

**EA ✓ — the FC 26 Responsiveness Update (16 Jul 2025):**
- "We've improved our input systems with the aim of ensuring that all inputs are processed immediately."
- Animation choice depends on "ball distance from the player, movement input angle, and player speed".
- Limited coverage made the system "use a longer animation or delay starting an animation while attempting to position the player".

**EA ✓ — the VFS animator interview (7 Oct 2026), senior animator Paul Baruzzi:**
- "To hit our response targets, we need quicker animations, with shorter wind-ups and branch-outs."
- "…only branch out to poses that hit a matching threshold."

**EA ✓ — history:**
- **FC 24:** manual Effort Dribble Touch. A flick gives a shorter knock, a hold a longer one; it works while dribbling or as a first touch.
- **FC 25:** Let Ball Run "will now start playing the animation on request, instead of waiting for the ball to reach the player". The rain/snow slips "are only visual and do not affect end results".
- **GDC 2010 (McComas and Sanmiya):** turn animations are procedurally warped, as is any animation that must hit a point at a time.
- **FC 27 (29 Jul 2026):** off-balance dribbling. The player "looks like they are stumbling, but you will still have control".
- **Nov 2025:** a Controlled Sprint slowdown was "unintended, and we quickly reverted it".

**INF — shared by the report and me:**
- **Separate clocks:** input acknowledgement, the next legitimate contact and the completed direction change are separate.
- **Branching:** branching means adapting the current motion, not restarting it.
- **Latest intent:** the latest intent replaces superseded, uncommitted plans.
- **Commitment:** the commitment window around a contact is narrow.
- **Cadence:** touch cadence is contextual, and a drastic request may pull the next contact forward, replacing it.
- **Effort layer:** an effort/urgent layer sits between carrying and named skills.
- **Braking:** braking and reorientation belong to the authoritative root, not to the pose.
- **Vocabulary:** a generic redirect vocabulary is used before named moves.
- **Presentation:** presentation may cheat, within bounds.
- **Simulation-owned:** the ball, the contact cause, the root and determinism stay simulation-owned.

**Agreed gaps.** EA publishes none of the following:
- thresholds, branch windows or touch intervals;
- a root-motion formula;
- a queue or commitment policy;
- a single FC 26 dribbling algorithm.

---

## 2 Disagreements and corrections

**1. "The body planner became a permission system."**
- **True for PLAYTEST-1.2.** It has the in-flight landing commitment, gait validation, the feet-order pelvis band and the ballFits gate.
- **Not the main cause in the locked baseline.** 88573ef0 has none of those gates, yet its body still answers late (§4, OBS).
- **Our delay is in the authoritative root and the presentation, not in footstep gates.** It comes from the hold, the technique approach cruise, the curvature limit, and the lack of an intent-driven pose layer (§4).
- **The report could not know this.** Its §1 says it saw no build, code or trace.

**2. "Use a narrow contact commitment window."**
- **The contact window is already narrow.** At D99: react 45 ms, commit 80 ms.
- **Our lock-in is whole-action commitment:**
  - a named technique is held from 80 ms before its decisive contact until its plant is released;
  - it is held from its set touch onward while the stick stays within 35° of its exit, which can be ≈ 0.4 s;
  - its exit runs on unless the stick turns more than 25° away;
  - carry touches exist only at the swing ends of the planned stride.
- **So the correction is to stop committing whole actions.** Shrinking the contact window would change little.

**3. "Freeze PLAYTEST-1.2 as A."** Superseded: A = BASELINE-88573ef0 (owner decision). The methodology itself is kept.

**4. The decision rule as a gate** (≥ 25 % lower p95 new-line delay, no new failures):
- This conflicts with the owner's rule that he decides by playing.
- **DES:** keep it as a preregistered report card, not an automatic gate.

**5. The defender contest gate.**
- Agreed in principle.
- But our sandbox has no opponents, and the ball kernel has no player colliders.
- **DES:** a headless deterministic interceptor probe now; a real defender later (owner decision).

**6. The 60 Hz examples.**
- Touchline runs at 240 Hz.
- "2–3 ticks at 60 Hz" (33–50 ms) becomes 8–12 ticks at 240 Hz.

**7. The clipping quote (GamesRadar, S21).** I could not retrieve the article text, so it stays EA (R).

---

## 3 New findings from the report (not in my research)

**The authority table and the contact effector (§6.1).** A gameplay foot proxy with finite reach and speed physically witnesses the contact, and the rendered foot adapts around it. Evaluated in `ARCHITECTURE_PROPOSAL.md` §2.

**Commitment and cadence:**
- **Phases:** provisional → committed → executed → recovery.
- **A commitment is never a ball reservation.** Swept, time-of-impact-ordered contacts mean an opponent who arrives first wins (§6.5).
- **Cadence is an opportunity schedule.** A fixed cycle T means an average wait of T/2 and a worst wait of T. A contact pulled forward must **replace** the planned touch, so no stale second impulse follows (§4.4).

**Presentation rules:**
- **The presentation contract (§6.6):** root path, facing, family, urgency, foot, status, anticipated contact.
- **The bounded visual root offset (§6.7):** a spatial limit, a rate limit and a settling rule; it never moves gameplay geometry.
- **The cheat table (§7)** gives each presentation freedom a boundary.

**Invariants and testing:**
- **The invariants (§8):** one ball state; a physical cause for each touch; no retroactive correction; continuous root and effector; determinism; clear collision ownership.
- **The renderer-off / visual-variant hash test** proves presentation cannot leak into gameplay.
- **Metrics that resist gaming (§9.3):**
  - input fidelity and stale actions;
  - lock time;
  - branch availability;
  - shared evaluation deadlines with right-censored latencies;
  - loss categories;
  - contact burstiness;
  - exit acceleration.
- **Methodology (§10):**
  - 24 paired sequences: held 90°, a reversal at the commitment boundary, and 0 → 90 → 0 → −90 then hold, each at jog and sprint × 4 fixed offsets;
  - the physical contest gate;
  - a visual isolation check: the same A trace through both presentations.

**The 99/99/99 envelope (§9.1) and timing budgets (§9.2):**
- acknowledgement within 1 tick;
- first visible response p95 ≤ 50 ms;
- a close-ball relevant contact p95 ≤ 150 ms;
- sprint may take longer.

**EA history I had not covered** (EA (R), not re-verified):
- FIFA 22: runtime-generated ball-approach motion, and faster dribble deceleration;
- FIFA 23: Technical Dribbling (Active Touch, ML-Flow between contacts);
- EA motion-matching talks (GDC 2021 and 2023);
- the Goal Driven Animation patent;
- eFootball 6.0.0's dribbling notes;
- the off-balance and PlayStyle confounds.

**OBS (report, edited footage):** compact redirects; compressed stepping while braking; named skills with conspicuous choreography. The report draws no numeric claims from the footage, and I agree with that.

---

## 4 New findings from my research

**EA ✓ — not in the report:**
- **The curved path.** The Responsiveness Update names our "giant arc" problem as a delay source: "the player taking an inefficient or curved path to the ball that introduces just enough delay".
- **FC 26:**
  - "increased speed of jog dribbling alongside improved logic for ball direction";
  - for loose balls, "Holding Sprint prompts immediate acceleration toward the contact point";
  - first-touch control is improved "at the trade-off of player's move speed".
- **FC 25:** "Improvements made to input direction influence on Effort Dribbles and responsiveness".
- **FIFA 21, Agile Dribbling:**
  - rapid, precise touches;
  - higher Dribbling, Agility, Reactions and Ball Control make it quicker and more precise;
  - a contextual mode triggers it automatically in 1v1s, which is a precedent for context deciding the action family.
- **FC 24, Controlled Sprint:** a speed tier between jog and sprint that keeps the ball closer with more controlled touches. Touch cadence is tied to the speed tier.

**General animation technology** (not EA; public sources):
- **Epic stride warping.** Stride scale = locomotion speed ÷ root-motion speed.
- **Epic orientation warping.** The legs follow a changing movement direction. Together these make the rendered legs fit an authoritative root that changes quickly.
- **Inertialization** (David Bollo, GDC 2018). A transition is a post-process offset that decays, with no two-pose blend: cheap transitions and continuity on every branch.
- **Motion matching** (Simon Clavet, GDC 2016). Search for the frame that matches the current pose and the desired future trajectory, then blend briefly; the feet's positions and velocities matter most.

### OBS — Touchline, measured (what the report could not do)

**Method:**
- **Counterfactual:** the same simulation is run with the stick left where it was.
- **"Visible":** the shoulder line has turned ≥ 5° toward the new intent, or the centre of mass is ≥ 5 cm off the counterfactual path.
- **Sampling:** 4 stride phases × 2 directions per test, with identical traces for both builds.
- **Values:** median, with the maximum in brackets, in seconds after the input change.

| sprint, then snap | visible | relevant contact | new line |
|---|---|---|---|
| 45° | 0.26 (0.38) | 0.33 (0.45) | 0.55 (0.67) |
| 90° | 0.41 (0.55) | 0.68 (0.81) | 0.83 (0.96) |
| 120° | 0.43 (0.68) | 0.69 (1.05) | 0.85 (1.21) |
| 180° | 0.33 (0.44) | 0.54 (0.64) | 0.75 (0.85) |

These are the baseline's figures. Small 20–40° corrections at run: visible 0.31 s, new heading 0.25 s.

**The acknowledgement is real but invisible.** The simulation re-plans on the same tick, and the planned footfalls move within 0.02–0.10 s. Yet the body's silhouette waits 0.26–0.43 s. **This is the central measured problem**, against the report's ≤ 50 ms target.

**Causes in the baseline code** (read and confirmed):
- **(a) The carry "hold."** When a turn is asked while the ball is ahead, the body keeps the old line until the touch that can be made.
- **(b) The technique approach cruise.** A named technique's approach runs on the entry heading at speed until its anchor footfall.
- **(c) The carry tracker.**
  - It does not brake for turns below 50°.
  - Curvature is limited to lateral acceleration ÷ speed, ≈ 79°/s at 8 m/s: EA's "curved path".
- **(d) Touch timing.**
  - Carry touches happen only at the swing ends of the planned stride.
  - At sprint they come every other stride of the lane foot.
- **(e) Named techniques for every turn.**
  - Every turn above 16° makes named techniques candidates, and they win: in the measured runs, sprint 90° and 120° were a Ronaldo chop 8/8 times, 180° a drag-back 8/8.
  - In circles, a named move was picked about every half second.
- **(f) No intent-driven pose layer.** The pelvis is the simulation's facing, and the torso and head channels never respond to the intent.

**PLAYTEST-1.2:**
- Similar median visible response (0.31–0.38 s), but longer worst cases.
- At 120°, the relevant contact took up to 2.09 s and the new line up to 2.09 s.
- In the sprint circle, the median relevant contact was 1.04 s, against the baseline's 0.29 s.
- This is consistent with the owner's verdict that it was slower.

**The baseline is not zero-loss under rapid input:**

| rapid-input test | baseline LOST | baseline double touches |
|---|---|---|
| sprint 0 → 90 → 0 → −90 | 5 | — |
| sprint rapid left/right | 4 | 3 |
| circles | 0–2 | 5–7 per family |

- **PLAYTEST-1.2 reached zero** (except 1 LOST at sprint 120° and 1 at run rapid left/right in this sample), **but through its gates.**
- So the experiment must reach zero by what each contact chooses, not by gates.

---

## 5 Implications for Touchline (DES, proposed)

1. **The first clock is the priority.** Today the body becomes visible at 260–430 ms. Fixing that needs two things together:
   - the authoritative root brakes and turns from the first tick;
   - a deterministic, intent-driven presentation layer (torso, head, pelvis lead, braking lean), so the body acknowledges within about 1–3 frames.
2. **Remove the hold and the cruise.** The root steers by its velocity vector: it brakes the old component, builds the new one, and stays aware of the ball. It no longer turns like a vehicle at a fixed heading rate.
3. **Decide contacts by whether a free foot can reach the ball in time, not by stride phase.** This means adopting simulation-owned contact effectors (`ARCHITECTURE_PROPOSAL.md` §2).
4. **A generic vocabulary comes first:**
   - carry push;
   - inside redirect;
   - outside redirect;
   - across-body gather;
   - urgent reach (our effort touch);
   - braking pivot;
   - sole check.

   Named techniques become contextual.
5. **Contextual cadence.** A drastic request pulls the next feasible contact forward, and the earlier contact replaces the planned one.
6. **Zero loss through the control envelope.** Every outgoing ball state keeps the ball inside the predicted reach at the next opportunity under the latest intent. No permission gates.
7. **Footsteps belong to presentation.**
   - They are derived from the authoritative root, using stride and orientation warping.
   - Plants may pivot, slide a little, shorten or re-time.
   - The rendered foot is locked to the effector only near a contact.
   - Transitions use decaying offsets, never restarts.
8. **A/B against the locked baseline** on identical traces, scored with the report's preregistered metrics. The owner decides by playing.

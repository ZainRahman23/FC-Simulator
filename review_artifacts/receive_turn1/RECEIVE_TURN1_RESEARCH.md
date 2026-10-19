# RECEIVE-TURN-1 — research report: how players receive and turn

Compiled 19 Oct 2026 for the stationary receive-and-turn library. Full notes with every quote and source: [`research/RT1_RESEARCH_NOTES.md`](research/RT1_RESEARCH_NOTES.md) (38 sources, ~30 searches and fetches). Source ids [S1]–[S38] refer to that file.

Labels used here:
- **Research-supported**: stated in a federation coaching source (FIFA Training Centre, The FA / England Football Learning) or in peer-reviewed / conference sports science.
- **Coaching media**: Soccer Coach Weekly, Coaches' Voice, Coaches Insider, Opta, easy2coach.
- **Our design choice**: a decision of the simulation. It is not attributed to any source.

Pages that could not be read are not cited. The FA Coachcast transcript was empty, one page was behind a login wall, and three academic full texts returned HTTP 403. For two of the studies, [S27] and [S28], only the press release or abstract was read.

---

## 1. Back-foot receiving

- **What it is.** The back foot is the foot "furthest from where the pass is coming from and closest to where the next pass needs to go" [S18]. FIFA's circuit plays "a pass to B's back foot" [S1]. The FA lists back foot, front foot and half-turn as distinct options [S17]. (research-supported / coaching media)
- **Why it is used.** Receiving on the back foot opens the body toward the next action. Receivers should "open their body out" [S9] and "receive on the back foot, facilitating playing forward more quickly" [S1]. The ball rolls across the body and carries it forward, "without the need to turn" [S18]. (research-supported)
- **Terminology warning.** FIFA [S5] also uses "front foot" for the foot furthest from **pressure**. The labels depend on context.
  - Our design choice: the library defines the receiving foot geometrically, as the foot on the turn side (near) or the other (far), never by the front / back label.

## 2. Open body before contact (the half-turn)

- **Opening before the ball arrives.**
  - Receivers open "early" [S18], play "on the half-turn" [S3], and keep an "open body shape" [S4, S13].
  - Orientation is both a signal to the passer and what lets the player go where he wants [S2].
  - In a 180° directional-trap study, advanced players "rotate their bodies and pelvis toward the intended direction of movement" and "pre-position their feet" [S27, press release]. (research-supported)
- **Scanning.**
  - Scanning happens before receiving [S1, S9, S10, S12].
  - Players who turned their heads more in the last 1–2 s before possession "were more likely to turn with the ball" [S26].
  - Scans are brief, about 0.4 s [S8]. (research-supported)
- **Not given anywhere.** No source quantifies how long before contact the hips open. Our design choice: the opening rate is 300 °/s with a 0.30 s minimum preparation, and the opening angle per family is a calibration value.

## 3. Receiving across the body

- The back-foot receive is across the body: "let the ball run across your body, take it late, take it early" [S16]. The ball "roll[s] across the body" [S18]. (research-supported)
- "Being two-sided": open out on both feet, turn both ways [S16]. (research-supported)
- Inference (marked as such in the notes): for a receiver initially square to the passer, "across the body" exists only once the hips have opened. Opening turns the turn-side foot into the back foot.

## 4. Inside-foot and outside-foot turns

- **Inside of the foot.** FIFA prioritises it "when appropriate" [S4]. An inside-foot redirect behind the standing leg turns 90–180° "in one fluid movement … with one ball touch" [S24]. (research-supported / coaching media)
- **Outside of the foot.** It appears in match play and drills: outside-of-foot first touches, including as disguise against the lower-body orientation [S6], and outside turn-backs [S7]. Sources say "turn away with outside / inside of each foot" [S20], but give no rule for when the outside should be chosen. (research-supported, qualitative)
- **Our design choice.**
  - The surface is decided physically, by RECEIVE-CONTROL-1.1's boot-surface table: a surface's normal must be able to face the impulse Δv = v_out − v_in.
  - For a ball arriving from the front, the impulse is dominated by taking the pace off, which points toward the passer. The outside of the foot can rarely face it: in this study it is feasible only for slow balls. The planner rejects it otherwise; it is not hard-coded out.

## 5. One-touch / one-motion turns

- **Stationary is the hard case.** "If players are stationary and wish to turn quickly, they may not be able to generate the speed or possess the efficiency to do so without losing the ball" [S2]. The remedy is a small preparatory movement: a step aside to open an "exit route" [S2], a step the opposite way [S1], or an in-and-out movement [S14]. (research-supported)
- **One continuous action.**
  - Receive and rotate together: "one fluid movement" [S24]; "receive and turn … in one movement off first touch" [S20]; "a simple swivel of the hips and transfer of balance" (Gravenberch) [S22].
  - The trap study treats "stopping a soccer ball and changing direction" as one act [S27].
  - Square-on reception needs "two or three touches" to turn, the half-turn one [S32, low-editorial]. (research-supported / coaching media)
- **No-touch turn.** Letting the ball run with "a 90-degree pivot" [S6], and the FA's "no-touch" turn [S11], are recognised. (research-supported)
  - Our design choice: not built in this first library. With the study's 12–18 m/s passes the ball outruns the turning player. It is listed in the limitations.

## 6. Hook, drag and Cruyff-like turns

- **How sources describe them.**
  - Inside / outside hook, drag-back and Cruyff are listed turns [S11, S12] and drilled [S7].
  - They are described almost only in a **dribbling** context, as reversals: "a good way to make a 180 degree turn to go the opposite way" [S36], "pull back in the direction you came from".
  - No source read describes a Cruyff as the first touch of an incoming pass. (research-supported: they exist; their receiving use is not documented)
- **Geometry (inference, marked in the notes).** For a receiver facing the passer, the ball redirection is ≈ 180° − exit angle and the body rotation ≈ exit angle. Near-180° exits therefore need little ball reversal and a big pivot: let it run, take it behind the standing leg, or receive across the body. Hooks and drags suit a ball that must come back toward the passer's side.
- **Our design choice.**
  - No hook / drag family in the first library: with the passer in front, a 150–180° exit does not need the ball reversed.
  - The Cruyff / Gravenberch-like idea is built as the through-stance turn's "behind the standing leg" variant. The far foot's inside sends the ball on behind the standing heel while the body pivots around it [S24's mechanic].
  - No source describes the Gravenberch far-foot receive specifically. The Gravenberch sources describe the hip swivel and weight transfer [S21, S22].

## 7. How players prepare before contact

- **Before the pass.** Create an angle and move off the line [S1, S10, S19]. Step away, then show [S1, S2, S14, S20]. Stay on the toes and time the movement to adjust the feet [S2]. Advanced players pre-position the feet [S27]. Arms out for balance / to gauge the press [S1, S28]. (research-supported)
- **Precise placements are not given.** No source gives the support foot's position relative to the ball for a receive-and-turn. Our design choices:
  - each family's standing-foot plant and contact point are authored, body-local values;
  - the preparation step (the standing foot planting early) is the "exit route" step of [S2];
  - the shoulders lead the hips toward the exit during preparation (tier-C "shoulders rotate first" [S33]; [S27] pelvis rotation).

## 8. Why different turn angles favour different mechanics

- **No coaching source gives angle boundaries** for choosing a mechanic. The only numbers found:
  - behind-the-standing-leg covers "90 to 180 degrees" [S24];
  - a "90-degree pivot" [S6];
  - 180° traps and sole half-turns [S27, S28];
  - change-of-direction research **without a ball**: the penultimate step's role at ≤ 45° vs ≥ 60°, and pivots "typically" ≥ 135° [S29].
- **Any degree band in Touchline is our design.** The library therefore has **no angle switch**. Each family has a comfortable range, and leaving it only adds cost. The planner generates a small feasible set (family × foot × surface × contact variant × contact tick) and chooses the cheapest by difficulty, time and preference, never by Ball Control.
- **The two geometric drivers** (inference): how far the **body** must rotate (≈ θ), and how far the **ball** must be redirected (≈ 180° − θ for a pass from the front). Together they explain the measured selection:
  - small exits are a cushion-and-push (large ball redirection, little rotation);
  - mid exits are the half-turn (open early, let it run across, back foot);
  - near-reversals are the through-stance turn (little ball redirection, large pivot) — or the half-turn again when the body could open far and the ball is firm.

## 9. Research-supported principles → simulation requirements

| # | Principle | Status | How the library implements it |
|---|---|---|---|
| M1 | Information before contact: the exit is known, scanning precedes | research-supported [S25, S26] | the desired exit is an input known before the pass; the head watches the ball during preparation (no scan animation yet) |
| M2 | The body opens before contact | research-supported [S18, S27]; timing not in any source | each family's contact facing ψc = k·θ (capped), reached during the ball's travel |
| M3 | A stationary start needs a preparatory movement | research-supported [S1, S2, S14] | the standing foot's early preparation step; stance shift ≤ 0.75 m |
| M4 | The receiving foot depends on the exit side and the ball side | research-supported [S1, S9, S18] | near / far / either per family, foot chosen by the planner (ball line, preferred foot) |
| M5 | The first touch goes toward the next action, weighted for it | research-supported [S2–S4, S18] | the ideal touch sends the ball to the reconnection point on the exit line |
| M6 | The contact is cushioned (draw back) | research-supported [S30, S24] | the contact foot meets the ball slightly ahead and draws back with it (presentation) |
| M7 | Large turns are one continuous action | research-supported [S20, S22, S24, S27] | one authored action: preparation → touch → pivot → exit; rotation inside the touch adds difficulty |
| M8 | The ball continues or is reversed depending on the exit | geometry = inference | the ideal first-touch vector ≠ exit vector; a through-stance touch must clear the standing foot (the planner rejects a path through it) |
| M9 | A no-touch turn exists | research-supported [S6, S11] | not built (limitation) |
| M10 | Disguise | research-supported [S6, S21] | not built (no defender in this study) |
| M11 | Pressure gating | research-supported [S1, S3, S18] | not built (clean conditions by instruction) |
| M12 | Sharper turns cost speed; pivots at very sharp angles | research-supported for change of direction without the ball [S28, S29] | rotation time grows with the remaining turn; the run starts 55 % into it |
| M13 | First touches strongly favour the preferred foot | research-supported [S31] | the preferred foot is a selection preference; no weak-foot execution term in this clean study |
| M14 | Angle bands are ours to define | stated honestly | no switch; the families' comfortable ranges are calibration values |

Our design choices in one place:

- **Families and their geometry:** the four families and their authored contact / standing-foot geometry.
- **Calibration values:** the opening factors, the movement model (Agility / Dribbling held neutral), the difficulty factors and the selection weights.
- **Reconnection point:** where the player re-meets the ball on the exit line.
- **Continuation classes:** IMMEDIATE / ADJUSTED / RECOVERY / UNSTABLE.

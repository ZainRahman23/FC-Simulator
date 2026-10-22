# BALL-ON PACE V1: design direction recorded for the next tasks (not implemented)

*Recorded 22 Oct 2026 from the owner's brief (`sources/2026-10-21_user_instruction_ballon_pace_v1.md`). Nothing here is built yet. This task builds only the Dribbling-99 ball-carrying envelope.*

## 1. The physical ceilings are ball-off capabilities

| Attribute | 99 | What it is |
|---|---|---|
| Sprint Speed | 38.0 km/h | the player's ball-off top speed |
| Acceleration | D38 | the player's ball-off acceleration ceiling |
| Agility | A99-C | the player's ball-off agility ceiling |

Carrying a football always costs movement. Even Dribbling 99 cannot reproduce the full ball-off 38 km/h / D38 while genuinely controlling the ball. D99 minimises the cost; it never removes it. There is no `if Dribbling == 99: modifier = 1.0`.

## 2. The future Dribbling model

**What Dribbling is:** how effectively a player can create and exploit advantages over defenders while manipulating the ball.

**It will likely affect:**

- ball-on Sprint Speed retention
- ball-on Acceleration retention
- technical capability at speed
- technique feasibility
- preparation and branching speed
- technical adaptation
- deception
- protection
- the ability to exploit small defensive windows
- skill-move feasibility

**It should NOT primarily affect random unforced possession loss.** A lower-rated dribbler alone keeps the ball by:

- slowing down;
- choosing simpler techniques;
- needing more preparation;
- using larger, safer control actions.

A lower-rated dribbler does not lose the ball spontaneously.

**How the rating behaves:**

- **At lower Dribbling:** technical options collapse sooner under speed or pressure, movement becomes more conservative, techniques need cleaner set-ups, and fewer tiny opportunities can be exploited.
- **At D99:** enormous technical freedom remains.
- **Higher Dribbling ultimately makes a player better at beating defenders**, not merely better at avoiding mistakes while alone.

**The D99 envelope chosen from this task is the upper bound** from which lower ratings scale down: open / tight ceilings, the per-touch cost, the knock-on ceiling, and probably the demand's own sensitivity.

## 3. Future skill moves

Dribbling will govern what techniques are feasible, from which entry states, at what speeds, and with how much preparation.

- **Not** "D90 = skill unlocked".
- **Instead,** higher Dribbling means a broader feasible entry envelope. A lower-rated dribbler may execute a difficult technique from an ideal set-up; D99 can execute and adapt it from much more demanding states.

## 4. Ball Control stays separate

| Attribute | What it is |
|---|---|
| **Dribbling** | the ability to manipulate the ball to create and exploit football advantage under constraints |
| **Ball Control** | the precision, security and quality of the intended ball interaction |

The two are not to be collapsed into one.

## 5. Not mixed in yet

Defender pressure, the Dribbling 1–98 scale, new skill moves (elastico, stepovers, V-pull) and the locomotion-integrity fixes (fast circle, 150–180° reversals, braking support, SOLE_ROLL) all wait until the owner chooses the D99 envelope.

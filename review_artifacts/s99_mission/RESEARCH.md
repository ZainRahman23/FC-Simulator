# S99 mission — brief research: elite dribbling / change-of-direction technique

*21 Oct 2026. From domain knowledge (coaching literature, match footage I know of). No new sources were fetched in this session, so treat the numbers as approximate and qualitative.*

## What elite players actually do most

Elite dribblers solve most direction changes with **one well-chosen contact**: a plant, then a touch with the surface the new line calls for. The expressive moves are rare, and they are used when a defender has to be beaten, not to turn.

| Family | The football action | Typical use | Ordinary or expressive |
|---|---|---|---|
| Inside / outside cut | Plant beside or behind the ball, then redirect with the inside or outside | 20–110° at any speed; the most common change of direction | ordinary (core) |
| Sole manipulation: stop, drag, roll, V-pull, pull-push | The sole stops, rolls or pulls the ball while the body pivots over it | Near-stopped turns, shielding, stop-start | ordinary |
| Lateral transfer (La Croqueta) | The inside of one foot plays the ball across to the other foot, which carries it on | Shifting the line sideways by about 0.5 m without braking (Laudrup, Iniesta) | ordinary at a jog or run |
| Knock-and-run / push-and-go | One long touch into space, then outrunning it | Open space, the cut into a sprint (Bale, Mbappé) | ordinary when there is space |
| Sprint carry | Touches every 2–4 strides at top speed, the ball about 1–3 m ahead | Open-field running with the ball | ordinary |
| Shielding turns, Cruyff, hook, drag-back, Ronaldo chop | Body between ball and pressure; reversals | Under pressure, 90–180° | ordinary to semi-expressive |
| Body feints (shoulder drop, Matthews) | Weight and orientation sell one direction, then the other | 1v1 against a defender | needs a defender to have value |
| Stepover / scissors | A leg circles the ball, then the other foot pushes out | 1v1 | expressive-leaning |
| Elastico / reverse elastico | Outside push, then an inside snap with the same foot | 1v1, high risk | expressive |

## What this means for autonomous Technical Control

- The ordinary families should dominate. In open space at top speed, **SPRINT_CARRY** (fewer, longer pushes) is the real-football answer, not close-control tapping.
- The **knock-on** is the natural "cut → explode" action when space exists: the turning touch itself sends the ball into space and the body accelerates after it.
- **Lateral transfer** and the **sole family** add the low- and mid-speed answers that a single-touch inside/outside cut lacks: a sideways shift without braking, and a near-stopped turn over the ball.
- **Feints, stepovers and elastico** get their value from a defender's reaction. Without a defender-reaction model, B4's outcome cost has no reason to choose them, so they need a reaction model (or explicit access) before they can be judged. They were **not built in this mission** (see the report: time went to the foundation first, as the brief's priority order asks).

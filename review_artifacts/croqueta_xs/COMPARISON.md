# HOP/SWEEP V2 against the X-shape — why V2 still read as a lateral cut (23 Oct 2026)

**V2** is the committed `croqhs/` build (753d0cc6), run untouched. Every number comes from `croqxs/x_geom.js`, the function the Lab's table and `tools/croq_xgeom.mjs` use. It was run on V2's own posed body for the reference case `REF · JOG R → L`.

**Conventions:**

- Times are from the first touch (t = 0).
- Offsets are in the pelvis's own frame, in metres.
- "out" is away from the body's midline on that leg's side.
- "bend" is the torso's side bend over the hip line.

| X-shape element | Owner's target | V2 (measured) | Class |
|---|---|---|---|
| Right-side body bow | Trunk and hip bowed toward the right, the right side concave | Bend **3°** toward the right (peak at −0.06); pelvis roll +2° | **MISSING** |
| Bend reversal through centre | One continuous swing from the right bow to the left bow | +3° → −10°, crossing at −0.01: the trunk stays almost straight | **MISSING** |
| Left-side body bow | Trunk and the left hip bowed toward the left | Bend **10°** toward the left; the pelvis roll at the receive **+9°** (the **right** hip up: the wrong side hiked) | **WEAK / WRONG SIDE** |
| Right leg out and forward | A large angle across the whole hip–thigh–knee–foot chain, the foot ahead of the torso | Widest at the touch: out 0.39, forward 0.49; thigh abduction **18°**, knee out 0.25 | **TOO SMALL** (the abduction) |
| Left leg trailing at the right max | Behind | −0.44 m | GOOD |
| Left leg out and forward at the receive | The mirror of the right | Out 0.30, forward 0.18; abduction 30° | **TOO SMALL** (out) |
| Right leg trailing at the receive | Behind | **−0.10 m**: nearly under the body | **NOT TRAILING** |
| Pelvis yaw by the receive | Swung toward the new side | 18° | **TOO LITTLE** |
| Ball path | Across and **slightly back** | 0.76 m across, **0.06 m forward** (5° forward of straight across) | **WRONG** (no backward component) |
| Stay low | Low through the centre | Pelvis 0.73 – 0.76 m | GOOD |

## Why V2 read as "ball on right → sharp lateral cut → ball on left"

**The lower body moved, but the trunk and the pelvis did not change shape.** With a 3° bow and a 10° bow, the trunk stays upright and stacked over the hips through the whole action. The only thing that changes side is where the feet are.

**The pelvis roll is the wrong way at the end.** The right hip is still up at the left receive, so the left side never becomes the concave, loaded side.

**The geometry does not swing.** The right leg is barely abducted and the right foot is under the body again at the receive. The ball also goes slightly forward. So nothing traces a diagonal: the feet and the ball translate sideways under an upright body.

With the ball hidden, that reads as **a sideways hop: a cut.** It does not read as the player's geometry swinging from one diagonal side to the other.

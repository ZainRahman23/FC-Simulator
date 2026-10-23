# X-SWEEP V3 against the leg wave — what was wrong from your screenshot onward (23 Oct 2026)

**V3** is the committed `croqxs/` build (f7645d10), run untouched. Every number comes from `croqlw/lw_geom.js`, the function the Lab's table and `tools/croq_legwave.mjs` use. It was run on V3's own posed body for `REF · JOG R → L`.

**Conventions:**

- Times are from the first touch.
- **Leg angle:** each leg's hip → foot line seen from behind along the entry heading. **+ = `\`** (the foot to the right of its hip); **− = `/`**.
- **Feet:** offsets in the pelvis's own frame, in metres.

| | Your target | V3 (measured) | Class |
|---|---|---|---|
| L1 `\ \` (your screenshot, +0.004) | Preserve | right +23°, left +12°: `\ \` | GOOD (kept identical in V4) |
| From L1: the left leg | Keeps travelling **out to the left**, with only the forward progression it needs | It **jumps forward**: from 0.65 m behind the pelvis (+0.025) to 0.24 m ahead (+0.125), **12.7 m/s** relative to the body, 23 cm in one 60 fps frame. Then it comes back in and back to meet the ball (−5.8 m/s inward at +0.129). | **WRONG** (seeks the ball) |
| The left foot and the ball | Never ahead of the progressing ball | **0.11 m ahead** of the ball in the body's frame at +0.125 | **WRONG** |
| From L1: the right leg | Sweeps inward / left / back with the ball **at the same time** | Sweeps in, but comes down on its own side (out 0.13 – 0.17) and is carried back out to `\` as the body moves left (+13° at the receive) | **WRONG** (one leg after the other) |
| L4 `/ /` | Left out and forward, right inward and trailing | At the wave's left-most (+0.113): right **+1°**, left −26°, so `\| /`. At the receive: right +15°, left −20°, so `\ /` (a straddle). | **WRONG** (`\ \|` → `\| /`) |
| The cushion | The left inside absorbs the first wave's pace | The left inside re-aims the ball to the exit at 3.1 m/s | **MISSING** |
| Pelvis / trunk wave | The bend changes sides during the same interval as `\ \` → `/ /` | The bend crosses 0 at +0.087, inside L1 → L4 | GOOD (kept in V4) |
| Ball path | Diagonal left and back | 0.87 m across, 0.15 m back (−10°) | GOOD (kept in V4) |

## The cause

The left foot's swing had two targets:

1. a body-relative waypoint at +0.11, **0.22 m ahead** of the pelvis and 0.36 m out;
2. a point beside the ball at +0.14.

The first pulled the foot from far behind to well ahead in 0.09 s. That is the jump forward: 12.7 m/s at +0.083. The second pulled it back and in to the ball, which was only 0.13 m ahead of the pelvis by then: 1591 m/s² at +0.142, and −5.8 m/s inward. **The foot went forward to find the ball, then reached back for it.**

Meanwhile the right foot's landing was placed on its own side of the body. The body kept moving left over it, so the right leg swung back to `\`. Each leg moved on its own; nothing made the two orientations change together.

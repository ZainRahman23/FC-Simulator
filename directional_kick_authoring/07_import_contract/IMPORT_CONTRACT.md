# Import Contract — how to return finished art

Return sprites in **exactly** this shape so the engine and the validator accept them without rework.

## File format
- **PNG**, RGBA, **transparent** background (alpha 0 outside the character).
- Canvas **exactly 140 × 140**. No trimming, no padding differences.
- Player centred on **x = 70**, feet on ground anchor **row 117** (static grid — do NOT bake root bob).
- **No ball pixels** in the sprite. The ball is composited by the engine.
- Indexed or truecolour PNG both fine; keep to the character palette (see `05_timing_specs` / templates).

## Directory + naming
```
returned_art/
  <technique>/            # POWER_R | INSIDE_R | LACES_R | OUTSIDE_R | CHIP_R
    <dir>/                # SE | S | SW | NW | N | NE   (E and W are NOT authored — E is locked, W is engine mirror)
      <set>_<D>_<f>.png   # e.g. pw_R_S_7.png
```
- `<set>` is the technique's east set id: POWER_R→`pw_R`, INSIDE_R→`in4_R`, LACES_R→`la_R`,
  OUTSIDE_R→`ou_R`, CHIP_R→`ch_R`.
- `<D>` is the direction code: `SE S SW NW N NE`.
- `<f>` is the frame index, **0-based**, matching the east frame count (POWER/INSIDE 0–11,
  LACES 0–9, OUTSIDE/CHIP 0–7). Frame `f` = same mechanical phase as east frame `f`.
- CONTACT-first delivery (see README Stage A–D): partial sets are fine **if** the CONTACT frame is
  present. Name it correctly (e.g. `pw_R_S_7.png`) and the validator will report which frames are still missing.

## Frame-count / CONTACT reference
| technique | set | frames (indices) | CONTACT |
|-----------|-----|------------------|:-------:|
| POWER_R   | pw_R  | 0–11 | 7 |
| INSIDE_R  | in4_R | 0–11 | 6 |
| LACES_R   | la_R  | 0–9  | 7 |
| OUTSIDE_R | ou_R  | 0–7  | 6 |
| CHIP_R    | ch_R  | 0–7  | 5 |

## Do NOT
- Do not author `E` (locked reference) or `W` (engine mirror of E).
- Do not change dimensions, anchor, or frame counts.
- Do not paint diagnostics, guides, ground lines, or the ball into the returned PNGs.

Run `../08_validation/validate_returned_art.py returned_art/` before submitting.
Import into the simulator is **manual and gated** — returned art is never auto-installed.

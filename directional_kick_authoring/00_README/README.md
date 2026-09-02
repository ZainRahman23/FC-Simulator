# Directional Shooting — Art Authoring Package

**Purpose.** Fully specify the missing directional shooting sprites so a skilled pixel artist can
author them without reverse-engineering the simulator. This package **separates the animation /
gameplay specification (this package) from the skilled pixel-art execution (the artist).** It does
**not** lower the visual bar and contains **no** scripted/AI-generated kick art as a positive reference.

## Why this exists
The east shooting art is hand-authored and approved. The six non-E/W world-facing directions have
no kick art (the engine currently falls back to no-animation for them). Two automated routes were
tried and **rejected**: PixelLab could not preserve the authoritative 8-direction facing, and
scripted/parametric posing was well below the quality bar. Conclusion: these sprites require skilled
manual pixel-art. See `06_quality_examples/REJECTED/`.

## The task in one line
Author the **physical-right-foot** shooting CONTACT (then full animations) for
**5 techniques × 6 missing directions**, matching the approved east biomechanics, facing, timing,
and quality — one straight-ahead technique seen from 8 world directions (NOT 8 different strikes).

- **Techniques:** POWER_R, INSIDE_R, LACES_R, OUTSIDE_R (trivela), CHIP_R
- **Missing directions:** SE · S · SW · NW · N · NE
- **E** = authored, pixel-locked reference (do **not** redraw). **W** = engine mirror of E (do **not** author).
- **Right foot only.** Physical RIGHT leg is ALWAYS the kicker; physical LEFT is ALWAYS support —
  regardless of screen-left/right.

## Missing-art matrix (see `MISSING_ART_MATRIX.json`)
| technique | set | frames each | CONTACT | dirs | frames to author |
|-----------|-----|:-----------:|:-------:|:----:|:----------------:|
| POWER_R   | pw_R  | 12 | f7 | 6 | 72 |
| INSIDE_R  | in4_R | 12 | f6 | 6 | 72 |
| LACES_R   | la_R  | 10 | f7 | 6 | 60 |
| OUTSIDE_R | ou_R  |  8 | f6 | 6 | 48 |
| CHIP_R    | ch_R  |  8 | f5 | 6 | 48 |
| **total** |       |    |    | **30 sets** | **300 frames** (30 CONTACT frames first) |

## Contact-first delivery order (do NOT draw 30 full animations up front)
- **Stage A — POWER_R:** S CONTACT, N CONTACT → review.
- **Stage B — POWER_R:** SE/SW/NW/NE CONTACT → review full 8-direction POWER contact circle.
- **Stage C — POWER_R:** T-2/T-1/CONTACT/T+1/T+2 across the six directions → review.
- **Stage D — POWER_R:** complete all POWER_R frames.
- Only after POWER_R passes: **LACES_R → INSIDE_R → OUTSIDE_R → CHIP_R**, same contact-first order.

## Folder guide
| folder | contents |
|--------|----------|
| `00_README` | this file, missing-art matrix |
| `01_templates` | registered **140×140** idle rotations per direction — clean draw-over base + diagnostic (`registration.json` has the transforms) |
| `02_east_references` | numbered, phase-annotated east strips per technique + 6× CONTACT closeups (the biomechanical source) |
| `03_contact_overlays` | authoritative-ball contact overlays per technique/direction (`contact_anchors.json`) |
| `04_anatomy_guides` | physical R/L map per direction + `PERSPECTIVE_rotation.png` foreshortening guide |
| `05_timing_specs` | `spec.json` (machine-readable truth) + `TIMING.md` (frame/fps/contact/easing per technique) |
| `06_quality_examples` | `QUALITY_CHECKLIST.md`, `GOOD_*_CONTACT.png`, and `REJECTED/` (do-not-author-from) |
| `07_import_contract` | `IMPORT_CONTRACT.md` — file naming, folders, format, anchor, frame numbering |
| `08_validation` | `validate_returned_art.py` — checks dimensions/transparency/frames/registration/no-ball |
| `09_review_harness` | `harness.html` — 8-direction review tool (technique select, frame step, playback, scale, ball toggle, R/L diagnostic, contact pause) |

## Canvas contract (all directions)
140×140 · player centre **x=70** · feet on ground anchor **row 117** · ball composited **separately**
(east contact projects to (99,111) r5) · author on the static grid, do **not** bake the root bob.

## Hard rules
1. Do not rotate/flip the east bitmap — **re-author** each perspective.
2. Physical RIGHT = kicker, physical LEFT = support, always (anatomy, never screen side).
3. Directional frame `fN` = the **same mechanical phase** as east `fN`. Timing is frozen.
4. Correct **striking surface** per technique (INSIDE/LACES/OUTSIDE/CHIP). Don't turn all five into generic kicks.
5. **No ball painted** into the sprite. Never move the ball to fit art — fix the art.
6. Correct occlusion is expected (e.g. back-view N hides the kicking leg behind the torso — show heel/sole).

## Review the tooling
Served over the dev server:
`http://127.0.0.1:8125/directional_kick_authoring/09_review_harness/harness.html`
Point “Returned-art base” at the artist’s folder to preview real sprites against the templates.

Import is **manual and gated** — returned art is never auto-installed.

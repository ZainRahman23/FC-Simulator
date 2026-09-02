# Frame / Timing Specification (AUTHORITATIVE — do not change to fit art)

The directional art MUST fit this existing production timing. Gameplay timing is **frozen**;
artwork adapts to it, never the reverse. Machine-readable source of truth: `spec.json`.

Canvas: **140 × 140**, player centre **x = 70**, ground/foot anchor **row 117**.
Ball composited separately; east contact projects to **(99, 111)**, radius **5 px**.

Directional frame **fN represents the same mechanical phase as east fN.** Author to phase, not to clock.

| Technique | set | frames | fps | CONTACT frame | contact anchor (east cx,cy) | striking surface | root offset behaviour |
|-----------|-----|:------:|:---:|:-------------:|:---------------------------:|:----------------:|-----------------------|
| INSIDE_R  | in4_R | 12 | 14 | **f6** | (95, 111) | INSIDE (medial) | rootOff [4,13], ease f3–f9 peak f6 |
| LACES_R   | la_R  | 10 | 12 | **f7** | (97, 114) | LACES (instep)  | none |
| POWER_R   | pw_R  | 12 | 15 | **f7** | (96, 111) | LACES (mid-laces) | rootOff [0,5], ease f6–f11 peak f7 |
| OUTSIDE_R | ou_R  |  8 | 14 | **f6** | (100, 114) | OUTSIDE (lateral, trivela) | none |
| CHIP_R    | ch_R  |  8 | 14 | **f5** | (86, 112) | CHIP (under-ball) | none |

**Root/presentation offset:** the engine may translate the whole sprite vertically around
CONTACT per the `rootEase` curve (POWER and INSIDE only). Author every frame on the **static
140×140 grid with feet at row 117**; do NOT bake the root bob into the pixels — the engine applies it.

**Easing (rootEase, fraction of rootOff applied at each frame):**
- POWER_R: `{6:0.6, 7:1.0, 8:0.6, 9:0.4, 10:0.2, 11:0}` — peak lift on the CONTACT frame f7.
- INSIDE_R: `{3:0.1, 4:0.3, 5:0.65, 6:1.0, 7:0.5, 8:0.2, 9:0.05}` — peak on CONTACT f6.

**Non-negotiable:** frame count, fps, and CONTACT-frame index per technique are fixed. If a
direction seems to need an extra frame, it does not — re-time the drawing within the existing count.

# DRIBBLE-1.1 — Erratum 1 (written 17 Oct 2026, during DRIBBLE-1.2)

## The claim

Four DRIBBLE-1.1 documents said the left-footed elite profile (LEFT_HIGH) took the right 60° cut 8/8 "on the inside of its preferred foot".
They presented this as the geometry DRIBBLE-1.2 should reproduce for the outside of the foot.

| Document | Where |
|---|---|
| `DRIBBLE11_REPORT.md` | "The evidence points at the fix. The preferred foot's inside works: a left-footed elite profile takes the right 60° cut 8/8" |
| `DRIBBLE11_HANDOFF.md` | item 4: "A left-footed profile takes the right 60° cut 8/8, on the inside of its preferred foot." |
| `DRIBBLE11_STATUS.json` | `nextStep` |
| The final DRIBBLE-1.1 message | same claim |

## What the evidence shows

Source: `evidence/attr_d11_LEFT_HIGH.json` (seeds 1–8).

| Scenario | Taken with the ball | Touches by surface |
|---|---|---|
| CUT60_RUN (right 60°) | 8/8 | FRONT 39, INSIDE 1 |
| CUT90_RUN | 3/8 | FRONT 40 |
| STRAIGHT_RUN | n/a | FRONT 50 |

## Correction

LEFT_HIGH took the right 60° cut 8/8, but with **toe (FRONT) pushes**. It was not an inside-foot cut contact.

The 8/8 is real. The surface attribution was wrong: no DRIBBLE-1.1 evidence showed an inside-of-the-foot cut contact working.

## What the correction changes

The DRIBBLE-1.2 conclusion still stands: make the inside and outside cut contacts feasible.

What it removes is the claimed precedent. DRIBBLE-1.2 did not take its geometry from LEFT_HIGH. It made side contacts feasible directly:

- side surfaces strike with whichever hull reaches first;
- the impulse normal is used for the contact;
- the contact is planned from the corridor.

The DRIBBLE-1.1 milestone files are left unchanged, and this note supersedes the statements quoted above.

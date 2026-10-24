# SLIDE TACKLE V1 — audit and handoff (not integrated)

**Status: audited and prepared; NOT integrated, by the instruction's own rule.** "If slide tackle requires substantial redesign, prepare its handoff/review package and stop there rather than rushing it." It does, for the reason given in §2.

## 1. The best existing slide-tackle work

| candidate | where | what it is | reviewed | fit with the current footballer |
|---|---|---|---|---|
| **Slide Contact Geometry V1.2** | `prototype/slide-contact-v1.2`, tag `baseline/slide-contact-v1.2` = `d539e7a7`; inside `touchline-current` since `e2c98ec7` | The researched side-on slide (Defending V1.1's pose: down on the near hip, the near leg tucked, the **far** leg sweeping across 0 → 75°), a swept ball CCD with a physical ball response (0 missed in 460 crossings), a per-challenge contact history through Tackled-Player V1's capture-point balance (CORRECTION / STUMBLE / FALL), bounded non-penetration between the bodies, OVERRUN | **"Live-reviewed and accepted 2026-09-28"** (the tag) | **Low.** The match harness's squad simulation (0.32 m discs, a scripted lunge path) drawn by the anim3d outfield runtime. The slider's body is a presentation pose over that simulation, not a footballer with a stance plan |
| Rear-contact fall, Follow-through V1/V2 | worktree `rear-contact-fall`, uncommitted | Coulomb friction on slide contacts; back falls | The direction was approved; "do not commit V2" | Same engine as V1.2 |
| Reference Tackle V1 | worktree `reference-tackle`, uncommitted | Authored joint keys reproducing a 1.6 s reference slide | "Do not commit" (target data) | An isolated skeleton study |
| SLIDE-PHYS-1 → SP2 → SP2A … SP2F3 | `prototype/physical-character-v2` (`a4cbf503` … `39a0446b`) | A muscle-driven physical slide (Jolt): the bent-leg thigh slide, follow-through, posting arm | SP2's hypothesis confirmed; SP2D's direction approved; SP2F2's arm rejected; SP2F3 awaiting review | **None.** A rigid-body physical character at a temporary body friction; it fails at ≥ 5.75 m/s |
| Codex TACKLE-REACTION-1 → RECOVERY-V1.3 | Codex worktree, local (`e4d67169`) | The **tackled** player's fall, impact and get-up lifecycle | Reports call earlier steps approved; V1.3 awaiting review | Physical character V2 |

**The best foundation is Slide Contact V1.2.** It is the only slide the owner accepted. Its sweep geometry (the far leg) and contact model are researched, and its ball response is swept and physical. **The pose and the contact rules carry over; its engine does not.**

## 2. Why the slide could not be integrated tonight

The standing tackle fitted the current footballer because the canonical body (vocab2 `PlayBody` with the RefSim pose) represents an **upright footballer on stances**:
- planted feet with heel and pivot;
- swings between them;
- a pelvis height channel (crouch);
- lean / side / trunk / roll channels;
- leg IK from the pelvis to the feet.

A slide tackle is a **ground-contact body**: the near hip and thigh on the turf, the trunk rolled ≈ 60 – 90° onto its side, the support passing from the plant foot to the shin, thigh and hip, then a get-up. None of that is expressible in the current plan format:
- `crouch` lowers an upright pelvis by centimetres, not 0.8 m onto the hip;
- `proll` and `side` are a few degrees of lean;
- stances are feet only, with no hip, thigh or hand contact;
- the leg IK solves feet from a pelvis that is above them.

So a slide needs a **new canonical body capability** (ground-contact poses and supports in `u_body.js` and the plan), i.e. a change to the canonical presentation layer. That is a substantial redesign the instruction reserves for a separate, reviewed step, not something to bolt on overnight.

## 3. The proposed SLIDE TACKLE V1 (for a separate, reviewed integration)

1. **The lifecycle: the standing tackle's, unchanged.**
   - The request: an explicit request, the short pending window, the earliest physical opportunity.
   - The eligibility: speed ≥ jog and ≤ the validated slide speed, the ball on the ground within the slide's sweep, the slide line beside the carrier (V1.2's own geometry rule).
   - The rest: commitment, the boot / leg spheres to the canonical opponent law (here the whole tackling shin and boot, V1.2's swept contact), the outcome from the canonical possession model, the recovery (a get-up), control return.
2. **The body.** A ground-contact extension of the canonical body:
   - a slide **phase** in the plan: the drop on the near hip, the glide, the stop;
   - new channels: hip-down height, trunk roll, the support region;
   - a pose layer that takes over from the upright RefSim pose for that phase and hands back for the get-up;
   - the target pose is Defending V1.1 / Slide Contact V1.2's researched side-on slide (the far leg sweeping) and the owner-approved SP2D direction (descending onto the folded side / back, never chest-down).
3. **The get-up.**
   - V1: a short authored get-up (the near hand and folded leg).
   - Later: the Codex TACKLE-RECOVERY lifecycle is for the tackled player and could be reused for a slider who falls.
4. **What the slide needs that the standing tackle did not:**
   - **player–player collision.** A slide that reaches the ball after the man, or through his standing leg, is a trip or a foul, and V1.2 had its own bounded non-penetration. The current engine has none (§ PLAYER COLLISION in the main report);
   - a foul/trip decision layer.

## 4. Decisions for the owner before SLIDE TACKLE V1

1. **The body:** may the canonical body (`u_body.js` / the plan format) gain a ground-contact phase? It is outside the tackling folder, so it is a canonical change.
2. **The pose source:** Slide Contact V1.2's accepted researched pose, or the SP2D / SP2F3 physical study's descent as the visual reference.
3. **The order:** player–player collision first (the slide's man-first and trip outcomes depend on it), or the slide with "the ball only" outcomes, as the standing tackle has now.

# User instruction, 2026-10-11 14:36 BST (verbatim)

---

That changes the priority.
If there is genuine interpenetration/phasing during the decisive follow-through, then we cannot yet interpret the player's balance response cleanly. The controller is being asked to respond to a collision trajectory that may itself be physically invalid.
The distinction is important:
What we want:
tackler collider hits runner collider → contact constraint prevents penetration → solver generates forces → both articulated bodies move/deform around that constraint → continued contact evolves geometrically
What this may currently be doing:
tackler makes initial valid contact → impulse is exchanged → subsequent geometry partially passes through/loses proper exclusion → bodies continue along trajectories they couldn't occupy as true colliders
If that's happening, it explains a lot. The initial hit can still produce the encouraging numbers Claude reported—equal/opposite impulse, tackler slowdown, disturbance starting at the leg—while the follow-through is wrong.
And that would make the apparent 650 mm "boot under the foot" movement much less encouraging than we thought. We need to distinguish leg legitimately sweeping underneath/around another articulated body from collision geometry interpenetrating and effectively tunnelling through it.
This becomes priority zero
I would stop the passive-balance work for now.
Before changing controllers, Claude needs to answer one very narrow question:
During PVP-1A-DX, are the two V2 bodies actually maintaining rigid collision exclusion throughout the trustworthy interaction window?

Not visually. Numerically.
For every physics substep, measure every tackler-v-runner collider pair and determine:
- signed separation / penetration depth;
- which shapes overlap;
- duration of each overlap;
- relative normal velocity;
- contact manifold;
- solver normal impulse;
- whether contact persists while penetration increases;
- whether a collider crosses from one side of another to the other;
- whether collision filtering ever disables a relevant pair;
- whether CCD/speculative contact is involved;
- whether the visual mesh and actual collision bodies disagree.
I'd particularly inspect the tackler foot/shin versus the runner's planted foot, shin, calf and other leg.
There's another possibility
We also need to be careful because mesh phasing isn't necessarily collider phasing.
Our rendered footballer is skinned to a more detailed human skeleton while V2 has a much coarser set of physical bodies. Two meshes can visibly intersect even while their capsules remain perfectly separated.
If that's what you're seeing, that's still a real presentation problem—but it's a very different problem.
So Claude should render the actual collision shapes over the footage. If the capsules remain separated while thighs/boots visually intersect, we have:
collision-envelope ↔ visible-body mismatch.
If the collision shapes themselves overlap materially or cross through one another, we have:
actual physics/contact failure.
We absolutely need to know which before touching balance.
I'd send Claude this now
STOP ABI / BALANCE DEVELOPMENT TEMPORARILY. I have identified a potentially more fundamental issue in the PVP footage: apparent player-player phasing/interpenetration during the follow-through.
Do not modify controllers, passive compliance, stepping, the slide, V2, solver settings, collision geometry or thresholds yet.
Perform a read-only collision-exclusion audit of the existing committed PVP-1A-DX run.
The question is:
Are these actually behaving as two continuously colliding articulated rigid bodies after first contact, or are relevant body parts phasing/interpenetrating during the follow-through?
Do not infer this from impulses alone. Measure geometry at every physics substep.
For every tackler-v-runner collision-shape pair during the trustworthy interaction window, record:
- signed separation / penetration depth;
- identities of both shapes;
- contact manifold points;
- contact normal;
- relative normal velocity;
- normal and friction impulses;
- beginning/end of contact;
- maximum penetration;
- number of consecutive penetrating substeps;
- whether penetration is resolving or increasing;
- whether either collider crosses through the other collider;
- whether a pair that should collide is ever filtered/disabled;
- CCD/speculative-contact state if applicable.
Pay particular attention to the tackler's foot/shin and the runner's planted foot/shin/calf/other leg during the sustained sweep that previously accumulated ~62 N·s and displaced the foot substantially.
Separate three possible phenomena:
1. TRUE PHYSICS PHASING: collision shapes themselves materially interpenetrate/cross through each other.
2. COLLISION-ENVELOPE MISMATCH: physics shapes remain validly separated but the rendered/skinned footballer meshes visibly intersect because the physical collision representation does not cover the visible anatomy closely enough.
3. LEGITIMATE FOLLOW-THROUGH: collision shapes remain mutually exclusive and the apparent passage is actually the articulated bodies moving around one another.
Do not call ordinary tiny solver penetration "phasing." Quantify everything and show its scale relative to collider radii and existing tolerances.
Also check whether the known solver creation-order dependence is related. Repeat the audit with character creation order swapped as a labelled diagnostic, without adopting either result.
Produce a synchronized slow-motion diagnostic view of the existing run with:
- rendered meshes semi-transparent if useful;
- actual V2 collision shapes clearly visible for both players;
- contact manifold points;
- contact normals;
- penetration depth displayed numerically;
- colliders highlighted whenever penetration exceeds ordinary solver tolerance;
- frame/substep stepping;
- first contact through the end of the trustworthy window.
Include an especially clear close-up of the tackler foot/shin passing the runner's planted lower leg.
I want direct answers:
1. Do any physical collision shapes actually phase through one another?
2. If yes, exactly which shapes, when, by how much, and for how long?
3. Does either shape actually cross from one side of another to the other?
4. Are contacts being dropped while geometry still overlaps?
5. Does the solver know about the overlap but fail to resolve it?
6. Is collision filtering responsible?
7. Is timestep/contact detection responsible?
8. Is the visible phasing instead caused by the mesh extending outside the collision envelopes?
9. How much of the previously observed "sustained contact" remains legitimate after this audit?
10. Can we trust the PVP-1A-DX collision as an input for active-balance research?
Do not fix anything yet.
If genuine collider phasing exists, stop ABI work and identify the causal mechanism and smallest principled fix, but do not implement it without my approval.
If the colliders are physically valid and only the meshes intersect, identify exactly what visible anatomy lies outside the collision representation and how large that mismatch is.
Commit only audit tooling/evidence locally and give me a localhost review URL.

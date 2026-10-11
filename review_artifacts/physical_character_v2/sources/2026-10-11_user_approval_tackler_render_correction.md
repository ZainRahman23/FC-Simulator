# User approval / instruction, 2026-10-11 15:19 BST (verbatim)

---

Approve the presentation-only tackler rendering correction recommended by CXA-1.
Do not change V2 physics, collider sizes/shapes, mass/inertia, solver settings, contact filtering, controllers, PVP records, RUN-1, simulation state or authoritative outcomes.
The goal is solely:
make the rendered tackler accurately follow the physical tackler that already exists in the committed PVP-1A-DX / ABI records.
Retarget/stretch Gabriel's visual skeleton onto the tackler's actual V2 physics joint locations so that the rendered hips, knees, ankles and relevant upper-body joints correspond to the physical body rather than sitting 54–87 mm away.
Preserve Gabriel's mesh/skin and appearance as far as possible. This is a rendering/retargeting correction, not a new physical character.
Before adopting the mapping, quantify for every important rendered joint:
- rendered joint vs physical joint positional error;
- orientation error where meaningful;
- before/after values;
- maximum and median error through the trustworthy PVP window.
The mapping must not alter the recorded physical states in any way.
Then re-render the existing committed records, rather than rerunning/tuning the physics:
1. PVP-1A-DX;
2. ABI A/B/C for the trustworthy first 250 ms;
3. ABI 0.75× impact;
4. any useful no-contact controls.
Do not present ABI EXT after 250 ms as valid evidence. Preserve/document the CXA-1 erratum that those views filtered torso contacts and genuinely phased.
For the new review page, give me:
- clean normal-speed gameplay view;
- 6–8× slow motion;
- no-hit vs native contact where applicable;
- corrected rendered tackler;
- optional collider-overlay mode;
- a toggle between mesh and mesh + actual colliders;
- frame stepping around first contact;
- the trustworthy interval clearly marked.
I particularly want a close-up of the tackler boot/shin against the runner's planted heel/shin so we can visually verify the CXA-1 finding that the colliders touch without crossing.
After correcting the tackler placement, measure the remaining visible mesh-vs-mesh penetration while the physical colliders remain valid.
Break that remaining visual mismatch down by anatomy:
- boots;
- shins/calves;
- thighs;
- pelvis/torso;
- arms where relevant.
Do not fix remaining mesh penetration yet.
At the end answer:
1. Does correcting the tackler's rendering remove most of the apparent phasing?
2. How much visible overlap remains solely because meshes extend beyond the physical collision envelopes?
3. At actual first contact, does the visual contact now occur approximately where the physics contact occurs?
4. Can we now visually trust the first 250 ms of PVP-1A-DX?
5. Does our earlier “mannequin/stiff response” assessment still hold after viewing correctly aligned bodies?
6. Is collider-envelope mismatch visually serious enough to justify a future V2 body revision, or could it reasonably be handled by contact-time rendering deformation/skin correction?
Commit only the presentation correction, renderer/audit tooling and regenerated visual evidence locally. Do not change the physics architecture.
Stop for my visual review and give me the exact localhost URL.

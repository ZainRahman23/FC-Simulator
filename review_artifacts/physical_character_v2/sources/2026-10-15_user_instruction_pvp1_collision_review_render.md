# User instruction, 2026-10-15 ≈ 00:46 BST (verbatim): PVP-1 dedicated collision review (rendering only)

**Context:**
- Received after PVP-1 (`9d2e9512`, local).
- The owner pasted the block below with no other text; it is treated as the owner's instruction.

**Terms used below:**
- "The frozen canonical PVP-1 run" means the CANON records PVP-F2 / PVP-F3 / TWIN (hashes F2 `7706ea69409e0bfa`, F3 `c03c6f78f2a78ecd`, TWIN `0ae8181ea74a7783`), in `_preserved_2026-10-15_evidence_outside_git/pvp1/records/`.

---

Before we do anything else, I need to SEE the PVP-1 collision clearly.
You report that physical contact occurred and that the struck foot moves 16–18 cm by +0.1 s and 30–40 cm by +0.2 s, but the current review presentation does not let me visually inspect that collision.
Do not change any physics, F2, F3, recipient, RUN, muscles, friction, or initial conditions.
This is a review/rendering task only.
Build a dedicated collision review for the frozen canonical PVP-1 run.
Show:
PVP-F2 | PVP-F3
with the recipient and tackler both clearly visible and large in frame.
Start approximately 0.30 s before first player-player contact and continue to 0.75 s after contact.
Give me:
- clean 1× close view;
- clean 0.25× close view;
- clean 0.10× close view;
- side view perpendicular to tackle direction;
- front/rear 3/4 view where I can see both players' legs;
- collision diagnostic view.
Do not use the distant gameplay camera as the primary view.
The camera should track the midpoint between the two players so the actual collision fills most of the frame.
For the diagnostic version, show:
- tackler colliders;
- recipient colliders;
- first-contact point;
- contact normal;
- contact force/impulse;
- struck foot;
- recipient support foot;
- both COMs.
Put an obvious marker on the exact frame of FIRST PLAYER-PLAYER CONTACT.
Also give me frozen frames at:
−100 ms | −50 ms | CONTACT | +25 ms | +50 ms | +100 ms | +200 ms | +400 ms
for both F2 and F3.
I specifically need to visually see:
what part of the tackler hits what part of the recipient
→ how the struck leg moves
→ whether the tackling leg passes through/sweeps or catches
→ how the recipient's support changes
→ how the recipient subsequently interacts with/lands on the tackler.
Also include the no-tackle TWIN beside them, but do not let the twin consume most of the screen or obscure the collision comparison.
Do not diagnose or fix the invalid running recipient yet.
First give me a review artifact where the physical collision you already measured is unmistakably visible.

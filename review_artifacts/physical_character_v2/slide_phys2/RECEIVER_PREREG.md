# SLIDE-PHYS-2: preregistration of a receiver successor (NOT developed; owner decision)

Written 14 Oct, ≈ 05:30, after SP2 was qualified and Stage 3 was run against the unchanged C3. Phase 14 of the brief says to research and preregister stepping or protective reactions before developing them. This document is that preregistration. **Nothing in it has been implemented, and C3 is unchanged.**

## 1. Evidence that the receiver is now the main blocker

**What SP2 against C3 produced** (`evidence/stage3/`, sweep at 5.0 m/s): a geometric spectrum —
- passes or absorbed (lines +0.35 m and beyond);
- displaced and recovered (−0.10 m);
- feet swept 0.5–1.0 m, then a slow topple (+0.05 / +0.20 m).

**What it did not produce:** no fast, sliced-out fall. The recipient holds on its remaining loaded foot for 1.0–2.1 s and then topples, without a step, an arm response or a trunk response. It looks like a mannequin.

**The reference** (REFERENCE2_ANALYSIS.md, real time ≈ 0.4 × video):
- The dribbler is running at ≈ 7.5 m/s.
- His next step lands on the slider's shin while his other foot is already airborne. The swept foot is thrown forward and up.
- He is seated after 0.16–0.22 s and on his back after 0.30–0.36 s, then slides with the slider for ≈ 1.5 m.

**Literature** (research/SLIDE2_LITERATURE.md):
- Ground impact comes ≈ 0.4–0.7 s after a sweep in lab proxies.
- A protective step needs at least 0.3 s.
- Arm muscle onset is at 100–126 ms; hands reach the ground 370–680 ms after the perturbation; load is ≤ ~1 BW per hand.

**SUPPORT-1** had already shown that C3 can be sliced out fast when it is swept cleanly at ground level. So the slow topple is not a C3 defect alone. It comes from the static, double-support stance against a slower SP2 contact.

## 2. Hypotheses, in priority order

- **H-R1 (state, not controller):** a recipient caught in **running single support**, with the swept foot landing or unloaded, will lose support within ≈ 0.2 s under SP2's sweep, with no change to C3's control law. This needs a physical running recipient, i.e. a RUN-1 → physical hand-over for the recipient. RUN-1 is frozen and must not be modified, so an adapter is needed.
- **H-R2 (protective arms):** a generic protective-arm response to support loss makes falls visually credible without changing their mechanics. Trigger: the support polygon is lost, or the COM is outside it with the velocity pointing outward. Response: the arms reach toward the fall direction, with onset ≥ 100 ms.
- **H-R3 (stepping):** a generic stepping response under C3 (capture-point step) gives LIGHT and MODERATE the "displaced, step, recover" outcome. It is only relevant to a standing or walking recipient; it does not help the running case.

## 3. Acceptance criteria (fixed now, before any development)

Against SP2, using the same geometric sweep (lines −0.10 … +0.80 m, 4.5 / 5.0 / 5.5 m/s):

1. **No scripting:** there is no tackle-event flag and no canned reaction. Every response must emerge from the same controller in other disturbances (SUPPORT-1's lab battery reproduces).
2. **Regression:** standing and traction regressions are unchanged — C3's qualification 16/17 or better.
3. **Light lines:** absorbed or displaced and recovered, with ≤ 1 protective step.
4. **Strong lines:** the foot leaves the turf before the pelvis drops, and the pelvis is ≥ 0.15 m down within 0.5 s of contact (the sliced-out signature).
5. **Arms:** onset ≥ 100 ms after support loss; hand loads ≤ 1.5 BW.
6. **Integrity:** no phasing; ledgers close; deterministic.

## 4. What the owner needs to decide

- **(a)** Whether a physical running recipient (H-R1) is in scope next, and how it should receive its state from RUN.
- **(b)** Whether H-R2 and H-R3 may be developed as a C3 successor (C3 kept as the baseline).
- **(c)** Whether the frozen C3 may be used in a moving state at all, or whether only its law is frozen.

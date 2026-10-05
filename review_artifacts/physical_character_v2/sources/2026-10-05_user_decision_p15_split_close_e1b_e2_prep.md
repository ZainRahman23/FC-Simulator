# User decision, 2026-10-05: split P15, resolve remaining E1b-7 items, adopt foot-yaw, prepare E2 (verbatim)

Approve Decision 1.
Split P15 into two preregistered physical classes using T-A's capture/recoverability verdict:
A. In-place recoverable: E1b must recover by returning the foot to its original foothold while satisfying the existing contact, slip, torque, energy, determinism and regression requirements.
B. Step required: E1b is not required to recover at the original foothold. Record these cases explicitly as STEP_REQUIRED; they become mandatory capture-aware recovery cases for E2. Do not count them as E1b passes merely because the current in-place controller happens to catch them, and do not count them as E1b failures for inability to remain within the original foothold.
The classifier must be based on the preregistered physical/capture rule, not on whether a particular run happened to pass or fail.
Preserve the four-way reporting:
- recovered without changing foothold;
- step required;
- recovered by stepping;
- fell.
Do not adopt T-A wholesale if it still has unresolved failures unrelated to STEP_REQUIRED.
Specifically investigate and resolve the remaining V2-long-legs E1b-7 torque-step failure and V2-REF 480 Hz E1b-7 rate-scaled failure without tuning against their observed values. Determine whether the capture-timing rule is unnecessarily forcing the minimum ramp in cases that should have more available time, or whether the criterion/model needs an evidence-backed correction. Preserve the smooth BLF-derived put-down and physics-authoritative contact.
The foot-yaw actuator has passed its validation; if its own regression remains clean, adopt it independently rather than keeping it hostage to the P15 classification issue.
Once the in-place E1b class passes legitimately, close E1b and record the STEP_REQUIRED P15 cases as explicit E2 obligations.
Then proceed to E2 research/design/preregistration only. Do not implement or run E2 yet.
For E2, the minimum target is now:
stable support → weight transfer → physical liftoff → capture-aware foot placement → smooth swing → measured touchdown → load acceptance → stable support.
Include the P15 STEP_REQUIRED cases as recovery-step tests alongside the planned short forward/lateral step cases.
Use the established reuse-first architecture: DCM/capture-point or LIPM planning as appropriate, BLF-style swing trajectories, and the validated Touchline support/contact lifecycle. Do not invent a new foot-placement algorithm before checking the established implementations.
Freeze the E2 architecture and criteria, then stop for my review.
Keep everything local. Do not push.

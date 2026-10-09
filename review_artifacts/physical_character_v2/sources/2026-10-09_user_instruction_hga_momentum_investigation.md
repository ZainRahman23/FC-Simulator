# User instruction 2026-10-09 (≈18:05 BST) — read-only investigation of HG-A and the promotion momentum definition (no animation change, no Revision 3) (verbatim)

Received in the Claude Code session, in reply to `pi1/rev2/PI1_REV2_RESULTS.md` (881f5b3). Reproduced verbatim below.

---

Do not smooth or modify the running animation yet. Do not create Revision 3 yet. First perform a read-only investigation of HG-A and the promotion momentum definition.
Revision 2 has exposed a potentially incorrect handoff criterion:
- the presentation pelvis already travels at exactly the authoritative 3.00 m/s;
- instantaneous whole-body COM velocity varies from roughly 2.2–4.0 m/s because of articulated running motion;
- HG-A rejects 48 lead-window frames on this basis;
- with HG-A diagnostically waived, at least one moving near-miss and one moving planted-leg fall pass every subsequent criterion.
I do not want to repair the animation merely to force instantaneous whole-body COM velocity to equal a constant gameplay trajectory velocity.
1. Determine exactly what HG-A was intended to protect
Trace its preregistration/history and state precisely what failure it prevents:
- visible velocity pop;
- incorrect total linear momentum;
- incorrect angular momentum;
- physical-body trajectory discontinuity;
- or something else.
Do not change it yet.
2. Decompose presentation motion at candidate promotion frames
For each body \(i\), measure its world velocity from the presentation and decompose it into:
authoritative translational velocity + articulated/internal velocity.
Calculate:
- total physical mass;
- presentation whole-body COM position;
- instantaneous whole-body COM velocity;
- authoritative velocity;
- mass-weighted internal linear momentum;
- whole-body angular momentum about COM;
- pelvis/root velocity;
- foot velocities/support state;
- and the same quantities one frame before and after.
Do this across the running cycle, especially the 48 frames that fail HG-A.
3. Test a momentum-preserving promotion initialization, diagnostically only
Construct the physical body's initial segment velocities as:
segment velocity = authoritative translational velocity + presentation-relative segment velocity
where the presentation-relative segment velocities are adjusted only by removing their mass-weighted common translational component, so that:
sum(m_i * v_relative_i) = 0
and therefore:
total physical linear momentum = total mass * authoritative velocity.
Preserve the relative articulated velocities and, as far as mathematically possible without adding an outcome-dependent correction, preserve the presentation's whole-body angular momentum about COM.
This is initialization at the single promotion handoff, not an ongoing controller, force, correction or animation change.
Do not modify positions to make it pass.
4. Compare three handoffs read-only
For representative running frames compare:
A. current Revision-2 initialization;
B. simply assigning authoritative velocity to everything;
C. the momentum-preserving decomposition above.
For each measure immediately before/after promotion:
- COM position discontinuity;
- total linear momentum discontinuity relative to the authoritative footballer;
- angular momentum discontinuity;
- individual segment velocity discontinuities;
- foot/contact velocity discontinuity;
- pelvis velocity;
- visible one-frame motion discontinuity;
- energy discontinuity;
- and deterministic reproduction.
Determine which definition actually corresponds to the architecture:
simulation owns global locomotion; presentation supplies pose and internal articulated motion.
5. Re-evaluate HG-A conceptually
Answer:
Should HG-A require instantaneous presentation whole-body COM velocity to equal authoritative trajectory velocity, or should it require the promoted physical body's total translational momentum to equal the authoritative player's momentum while preserving bounded internal gait motion?
Do not decide this merely from which version passes more fixtures.
Use conservation/continuity reasoning and the purpose of the simulation/presentation boundary.
If the existing HG-A is correct, explain why the 2.2–4.0 m/s instantaneous gait oscillation must be removed and why smoothing the animation is the principled solution.
If HG-A is conceptually wrong for this architecture, propose a versioned replacement criterion before applying it to the 26 cases. Include quantitative tolerances justified from the existing promotion continuity requirements, not fitted to these fixtures.
6. Do not lose the other blockers
Keep separately recorded:
- physical boot larger than gameplay foot / segment correspondence;
- simulation slider stop inside the retained 10 mm criterion;
- still-extending slide leg in sl_from_behind;
- long-lead physical gait drift;
- standing-pose foot correction;
- rx_free_leg angular momentum;
- rigid-foot toe-pivot limitation.
Do not modify any of them during this investigation.
7. No Revision 3 yet
This is an investigation only.
Do not:
- change the running animation;
- change V2/F0/F1;
- change V1.3;
- change Jolt;
- change the 30/10 mm limits;
- change tackle outcomes;
- rerun PI-1 as a qualifying run;
- or introduce another compatibility amendment.
At the end give me:
1. what HG-A was protecting;
2. whether its current definition is physically/architecturally correct;
3. the quantitative comparison of A/B/C;
4. whether momentum-preserving promotion removes the apparent handoff discontinuity without altering the visible running animation;
5. what replacement HG-A you recommend, if any;
6. and, only diagnostically, how many of the 26 candidates would satisfy that proposed criterion while every other Revision-2 gate remains unchanged.
Then stop for my decision.

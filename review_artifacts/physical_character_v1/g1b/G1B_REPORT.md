# G1b — closing and qualifying G1 before continuous walking

> **Status (2026-09-30): done; awaiting your review.** Nothing committed, nothing pushed, G2 not started. No C4 / C5, Reference Tackle or football-simulation work.
>
> **Review:** <http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G1&review=steps>. The eight G1 review cases are buttons at the top of the side panel. Static contact sheets are in `g1b/sheets/`.

## Verdict

**G1 is ready to promote as the locomotion foundation.** The architecture held in every test:

- **authority:** truth overrides the plan; obstructions are detected;
- **arbitration:** support beats style;
- **accounting:** force-plate ledger, internal momentum;
- **latency:** a layered design;
- **determinism:** Node ×3, and browser = Node;
- **parity:** every approved suite is hash-identical.

The two G1a failures are now understood:

- **S10:** both rates produce materially the same physical event. The disagreement is confined to rigid-contact impact detail and sliding two-body contact (§1). 240 Hz remains justified for locomotion.
- **Performance:** measured and explained (§2). A 22-player match needs a physics-scaling plan; G2 does not.

**G2 can begin, with one condition.** Of the five open items, one is a genuine G2 blocker: **whole-body yaw.** The pelvis yaw envelope grows to ±12° in undisturbed in-place stepping, with the stance twist axes (ankle, hip) at their limits. Its clean fix is new capability (angular-momentum regulation plus arm counter-swing), so it must be **G2's first work item**, not a G1 patch.

Separately, on human-likeness: the motion is physically sound but **does not look human yet**. It is robotic marching with a rigid upper body and static arms (§5). G2 must treat this as a first-class track, not polish.

## 1. 240 vs 480 Hz: is it the same physical event?

Control stays at 240 Hz; only the physics is sub-stepped. Each S4 landing is measured as an event from the first physical contact.

| per landing (mean of 10) | 240 Hz | 480 Hz | 960 Hz | 240 Hz, 2× iterations |
|---|---|---|---|---|
| contact time | identical at every rate | | | |
| foot approach speed / COM vertical speed | −0.35 / −0.041 m/s | −0.35 / −0.041 | −0.35 / −0.040 | −0.35 / −0.041 |
| COM low point after landing (time) | 1.062 m (233 ms) | 1.063 m (232 ms) | 1.062 m (234 ms) | 1.062 m (234 ms) |
| new foot > 50 % BW | 9.6 ms | 9.6 ms | 9.6 ms | 8.7 ms |
| vertical turf impulse, 0–10 ms | 9.5 N·s | 11.7 | 14.1 | 10.9 |
| 0–25 ms | 30.1 | 27.0 | 25.5 | 28.2 |
| **0–50 ms** (the G1a window) | **40.2** | **45.5** | **47.4** | 43.7 |
| **0–100 ms** (arrest complete) | **73.6** | **75.6** | **75.8** | 74.6 |
| 0–200 ms | 154.7 | 154.3 | 154.2 | 154.4 |
| 0–400 ms | 312.3 | 312.0 | 312.1 | 311.9 |
| peak landing-foot load (control-step average) | 1159 N | 1720 N | 2348 N | 1581 N |
| peak penetration | 1.20 mm | 0.54 mm | 0.21 mm | 0.74 mm |

**Classification.** The integrated impulse converges once the window covers the arrest: 240 vs 960 Hz differs 3 % at 100 ms, 0.3 % at 200 ms and 0.06 % at 400 ms. The contact time, approach, COM trajectory and loading time are identical. So this is **materially the same physical event**, and the G1a 4–15 % came from two sources:

- **Windowing:** a fixed 50 ms window cuts through a roughly 100 ms arrest, so it measures how the impulse is distributed inside the impact, not the event itself.
- **Contact-solver / sub-step sensitivity of rigid impact:** peak forces never converge (1.2 → 1.7 → 2.3 kN). Rigid contact has no finite peak; penetration and the first-step impulse depend on the time step. Doubling the solver iterations at 240 Hz moves the 50 ms impulse and peak about half-way toward 480 Hz, so the residual is part iteration convergence and part time step.

It is **not controller-rate sensitivity**, because the control rate was held fixed. Whether the controller itself is rate-sensitive was *not* tested: the controllers carry step-count constants that would first have to be re-expressed in time.

**The other two S10 cases:**

| case | finding | class |
|---|---|---|
| D6_slide | A→B impulse 180 / 148 / 165 N·s at 240 / 480 / 960 Hz with the new stack, and **166 / 149 / 166 with the approved C1+C3** — the same non-monotone spread, so it is not the new layers. Outcome identical; struck foot slides 14.7–16.7 cm; COM peak 0.24–0.30 m/s; trunk ≈ 5°. | contact-solver sensitivity of a sustained two-body sliding (stick-slip) contact; the gross response is robust |
| S5_F80 | The corrective step is identical at every rate: liftoff 1.075–1.083 s, touchdown 1.354–1.358 s, foothold 2.5–2.9 cm. The post-step stance is marginal: at 720 / 960 Hz the trailing foot is dragged 23 cm and carries 2–7 N; ξ margin 2.5–3 cm. 480 Hz on the plate tips over the edge; 480 Hz on static turf, 720 and 960 Hz recover. | a boundary case in the post-step phase (a missing closing step — §3), exposed by more accurate contact |

**Is 240 Hz justified?** Yes, for locomotion events, trajectories and integrated impulses over physically meaningful windows (≥ the ~100 ms arrest). Rules that follow from this:

- Never use **peak contact forces** as decision thresholds or claims; they aren't convergent at any rate with rigid contact. Use impulses over the arrest window.
- Re-qualify sliding **two-body contact** (tackles, G6) with an event-level test, not fixed windows.
- If contact-force realism is ever needed, the fix is compliance in the contact model (a shoe / turf law), not a higher rate.

## 2. Controller cost

**Split** (Node, single thread; per character per 60 Hz frame = 4 control steps; production mode, meaning no ledger objects, which gives bit-identical targets):

| scenario | production controller p50 / p95 | Jolt physics p50 / p95 | review instrumentation p50 / p95 |
|---|---|---|---|
| S1 quiet stance | 0.17 / 0.39 ms | 0.53 / 0.58 | 0.07 / 0.08 |
| S4 in-place steps | 0.44 / 0.88 | 0.62 / 0.68 | 0.07 / 0.11 |
| S7a push in swing | 0.39 / 0.71 | 0.61 / 0.67 | 0.07 / 0.08 |
| S5_F80 reactive step | 0.47 / 0.67 | 0.56 / 0.67 | 0.07 / 0.08 |
| S2b transfer | 0.49 / 0.67 | 0.57 / 0.61 | 0.07 / 0.08 |
| S11b obstacle | 0.53 / 0.78 | 0.60 / 0.72 | 0.07 / 0.09 |
| S8 style saturation | 0.18 / 0.37 | 0.55 / 0.59 | 0.07 / 0.08 |

Worst single frames reach 1.6–40 ms. These are isolated garbage-collection / JIT events, not recurring cost.

**By layer** (mean ms per frame, production, standing → stepping):

| layer | ms per frame | note |
|---|---|---|
| task controllers | 0.07 → 0.25–0.34 | the **reused, approved** balance controller: C1 law, IK, Jᵀ, hip strategy, C2's double-support split. The swing feed-forward is ≤ 0.02. |
| actuator arbitration | 0.03–0.06 | the review ledger adds another 0.02–0.06 |
| sensing | 0.03–0.05 | |
| Jolt I/O | ≈ 0.055 | 13 motor writes, 14 state reads, joint reads, ankle λ |
| motion planning | 0.004–0.03 | viability monitor + executor + rhythm + capture search |
| gait / support state | ≤ 0.005 | |
| composition | ≤ 0.013 | |
| review-only | ≈ 0.07 | runner recording, hashing, force-plate ledger, motor-λ reads |

**Optimisations**, both low-risk and general. Determinism and behaviour are unchanged: all 10 approved suites and all G1a hashes are identical.

1. **`polyDist` made allocation-free** (same arithmetic, same order). It was the largest JavaScript cost in the whole controller. C2's double-support weight split calls it about 3000 times per control step (49 ratios × 2 clamps × 31 bisection steps), and every call allocated four small arrays per edge. Task-controller cost when stepping fell from 0.36–0.44 to 0.28–0.34 ms per frame.
2. **An arbiter production mode** (`ledger: false`) that builds no ledger objects. Its targets are bit-identical to the review mode.

**Not done:** C2's split could run below 240 Hz, and its bisection could be replaced by an exact projection. Both would change approved behaviour, so both are left for an explicit decision.

**Preliminary 22-player projection.** This is measured, not extrapolated: 22 characters in one Jolt world, each running the new stack in production mode while stepping in place.

| characters | Jolt p50 / p95 | controller p50 / p95 | sensing | Jolt I/O | total p50 / p95 per 60 Hz frame |
|---|---|---|---|---|---|
| 1 | 0.62 / 0.68 | 0.32 / 0.85 | 0.05 | 0.06 | 1.07 / 1.72 ms |
| 6 | 3.65 / 3.88 | 1.32 / 2.85 | 0.14 | 0.31 | 5.47 / 7.02 |
| 11 | 6.83 / 9.72 | 2.61 / 6.65 | 0.28 | 0.60 | 10.5 / 19.2 |
| **22** | **13.5 / 14.0** | **4.7 / 10.6** | 0.55 | 1.2 | **20.1 / 26.1** |

Review instrumentation, if left on, would add about 1.5 ms for 22 players.

**Reading:**
- Jolt scales linearly at about 0.61 ms per character per frame.
- 22 full-physics players at 240 Hz on **one thread** need about 20 ms per 60 Hz frame against a 16.7 ms budget, before rendering and the match engine.
- The controller is not the main problem: 4.7 of 20 ms.

Options for later, not G2:
- a multithreaded Jolt build (needs SharedArrayBuffer / cross-origin isolation);
- physics in a worker;
- a physics level of detail for players far from the ball;
- a lower rate or fewer solver iterations where §1 shows it is safe.

## 3. The five open items: classification

| item | class | reasoning / evidence | action |
|---|---|---|---|
| no mid-swing rhythmic → corrective escalation | **can wait (G3)** | Needed only when a disturbance exceeds the gait's own foothold adjustment (30 N·s; 15 N·s at ≥ 100 ms latency). G2 walking is undisturbed; its step generator must have enough foothold range by design. | none |
| no downward search when planned ground is absent | **can wait (G3 / uneven ground)** | No MISSED touchdown in any undisturbed run at any tested latency. MISSED appears only after a disturbance or at ≥ 100 ms latency (S7d; F80 at 100/170). | none |
| a touching-but-unloaded foot is not reloaded | **can wait (G3)** | Diagnosed as a missing **closing step** after a large recovery step (F80 at 720 / 960 Hz, D6X_load80, S2x), not a support deadlock. I tested the deadlock hypothesis directly: letting the CoP use an unloaded foot's contact points was eligible 162 times in F80 and changed nothing, because the capture-point law pushes off the front foot. That change is reverted. In walking, the planned double-support transfer loads each landing foot within 10 ms. | none (experiment reverted) |
| the recovery planner can choose the same foot twice | **can wait (G3)** | A multi-step recovery sequencing issue (S7a at 0/0). It does not arise in undisturbed stepping. | none |
| **±12° pelvis yaw** | **G2 blocker — not cleanly fixable in G1b** | Whole-body yaw (vertical angular momentum ±1 kg·m²/s per step), exchanged with the ground through the stance foot. The stance twist axes saturate: the ankle at its V1.1 limit (~20 N·m) on 270–380 of the 1200 control steps between 1.5 and 6.5 s, the hip at its budgeted limit. The envelope **grows** over ten undisturbed steps (±2° → ±11°). It is not the style or the latency: ±12.8° with or without style, ±9–10° at 0/0 ms or without the swing feed-forward. No layer regulates heading. Walking's forward leg swing will make the yaw moment larger. The physically right fix is angular-momentum regulation with arm counter-swing and trunk counter-rotation — new capability, with arms and C4 out of G1b's scope. | **the first G2 work item** |

**Also found, and belonging to G2's design:** in-place stepping has weak step-to-step correction. After a push at zero latency the lateral capture-point orbit shifts to one side and is not pulled back (adjustments stay near 1 cm), and a fall follows six steps later. G2's walking foothold law must be designed and tested for **orbital stability** (step-to-step ξ feedback), not inherit the in-place adjustment.

## 4. Latency: what needs what

The architecture keeps per-process delays. The values are provisional parameters, not human constants, and were **not** tuned to pass tests.

| timescale | processes (in this stack) | why |
|---|---|---|
| **immediate — mechanical, no delay** | contact and friction; joint constraints and limits; the motors' current impedance (spring and damping act on the *actual* joint state every physics step); the finite torque envelope (Jolt enforces it every sub-step); the landing leg's compliance; gravity | the body's own mechanics: muscle impedance, tissue, the ground. Delaying them would be unphysical. |
| **fast feedback (tens of ms; 50 ms here)** | the balance law (CoP / ankle strategy), hip strategy, stance posture, swing-tracking corrections, touchdown acceptance and loading, obstruction reaction, early-swing foothold adjustment | reflex-like responses to the sensed state. Obstruction reaction = feedback delay (50 ms), by construction. |
| **slower replanning (100–200 ms; 120 ms here, re-searched at 60 Hz)** | the viability monitor's step decision; capture-step and sequence search; rhythm and transfer scheduling; style and task selection | decisions on a whole-body state estimate |
| **bookkeeping — undelayed, never reacts** | gait / support roles and events from contact truth | records what happened; every reaction still waits for its own view |

**Measured sensitivity** (G1a sweep): in-place stepping tolerates 100/170 ms and fails at 150/220 ms. The reactive step degrades sharply above 50 ms: F80 foothold error is 19.6 cm at 50/120 ms and it falls at 100/170 ms.

**Why 50/120 is kept as the provisional default:** it puts the reactive step's liftoff about 204 ms after the push starts, whereas zero latency gives 83 ms, which is faster than a person can react. Compensatory stepping in people is generally reported to start some 200–300 ms after a perturbation; I'm quoting that from memory, not a checked source.

## 5. Final G1 visual review

Open with `?suite=G1&review=<id>`, or use the buttons in the side panel. Each case sets its test, its comparison ghost (magenta), its camera and its bottom chart. Contact sheets, also produced by the page itself in headless Chrome, are in `g1b/sheets/`.

| id | case | ghost | chart | physical | how human it looks (my honest read of the sheets) |
|---|---|---|---|---|---|
| `steps` | 10 in-place steps | — | pelvis yaw | 10/10, ≤ 3.3 cm, ledger closed | **robotic**: 7 cm flat-footed vertical lifts, little knee bend, a rigid bolt-upright trunk, arms hanging motionless, growing pelvis yaw |
| `transfer` | transfer + one step | — | vertical force | gate 1.17 s, foothold 2.2 cm | **statue-like**: C2 hovers and lowers the foot for 1.5 s; a person takes about 0.5 s with a counterbalance |
| `push` | 15 N·s in swing | no push | ξ lateral | footholds move 5.2 cm, keeps stepping | the reaction is almost invisible: no arm or trunk response |
| `early` | early touchdown on raised turf | flat turf | vertical force | touchdown 108 ms early, re-synchronised, upright | correct but stiff; no stumble reaction |
| `obstacle` | box in the swing path | flat turf | ξ fore-aft | OBSTRUCTION, 50 ms reaction, 0.9 mm, upright | right outcome; abrupt stop, no trip reaction |
| `sat` | style vs support | no arbitration | COM height | support 96 %, style 1 % admitted; the ghost sags 11.7 cm | the body simply ignores the style |
| `latency` | F80 at 50/120 | 100/170 ms | COM height | lunge step recovers; the ghost misses the ground and falls | a pronounced hip jackknife before the step; the fall is plausible |
| `rate` | 240 Hz | 480 Hz physics | vertical force | the ghost lies on the body; the impulse agrees within 3 % over 100 ms | identical |

**Physical correctness vs human look.** Physically the stack does the right things for the right reasons. Visually it is a robot:

- no arm swing;
- no trunk or pelvis motion patterns except an unwanted yaw;
- flat-foot vertical lifts with no heel–toe roll;
- minimal knee flexion;
- slow C2 placements.

None of this is hidden by the metrics. It is expected at G1, where the only style is the IDLE pose at P3. G2 needs the walking reference (of_loco at the measured phase: arm swing, knee flexion, heel–toe) and yaw / angular-momentum regulation from the start.

## 6. What changed in G1b

- **`pc_sense.js`:** `polyDist` allocation-free (bit-identical).
- **`pc_act.js`:** production mode `ledger: false`. **`pc_loco.js`:** passes `opts.ledger`.
- **`pc_gateg1a.js`:** two review scenarios, `S3a_transferStep` and `S11f_flatStep`.
- **`pc_harness.js` / `index.html`:**
  - the G1 review list;
  - comparison runs as a magenta ghost;
  - the bottom-chart selector (arbiter / vertical force / COM / ξ / yaw);
  - shot mode (`&shot=…`) for contact sheets;
  - camera parameters.
- **`pc_balance.js`:** the `touchSupport` experiment was **reverted** — no net change beyond G1a.
- **Regression:** A, B, C1, C2 (V1 + V1.1), C3 29/29 and D 7/7 all hash-identical. G1a evidence regenerated: 26/26 scenarios deterministic, the same criteria results.
- **Evidence:** `g1b/json/` (S10 event analysis, D6 rates, profiles, 22-character scaling), `g1b/probes/` (the scripts), `g1b/sheets/` (9 contact sheets).

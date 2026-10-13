# SUPPORT-1: PVP receiver response and support loss (overnight research and development)

**Instruction:** 13 Oct 2026, ≈ 03:41 BST; saved verbatim in `sources/2026-10-13_user_instruction_support1_overnight_receiver_support_loss.md` (7fa9289f).
**Run:** 03:42 – ≈ 04:55 BST, worktree `physical-character-v2`.
**Review page:** http://127.0.0.1:8350/support1/review/S1_REVIEW.html

**Nothing canonical changed.** C3, M1b, V2, RUN-1, PVP-0 and Astra's K are untouched. Every candidate is a separate file. Contact-model candidates are installed per world at run time.

**The reference video could not be watched.** The attachment is in macOS's protected screen-capture temporary folder: reading it is refused ("Operation not permitted"), and no saved copy exists on the Desktop, in Downloads, Movies or Documents, or in Spotlight. So the "sliced-out" target is taken from your written description and from the literature. Every visual judgement below should be checked against the reference when you review.

---

## Verdict

```
SUPPORT-RELEASE MECHANICS UNDERSTOOD:          YES
BEST RECIPIENT RESPONSE PHYSICALLY PLAUSIBLE:  PARTIAL
ORDINARY STANDING/TRACTION REGRESSIONS:        PASS
MATERIAL VISUAL IMPROVEMENT OVER PVP-0:        NO
RECOMMEND FOR CANONICAL V2:                    NOT YET
```

**Short version.**
- PVP-0 looked anchored mainly because the PVP-0 tackler pinned the recipient's feet from above, and because it brought little sweeping momentum along the ground. It was not caused by turf friction.
- The unchanged V2 recipient already releases its support and is sliced out when the disturbance sweeps along the ground: in the lab, and with an exploratory sliding articulated body.
- None of the four recipient successors I built improves on V2 without a cost. So the fourth verdict line is NO: the visual difference from PVP-0 comes from the disturbance, not from a new recipient.
- What is missing is mostly outside the recipient's support mechanics:
  - a tackler that physically slides;
  - dynamic, single-support recipients;
  - stepping and protective responses.

---

## 1 · Why PVP-0 looks anchored (deep audit of the PVP-0 records)

**Method** (`scripts/s1_feet_audit.mjs`, `s1_cross_decomp.mjs` → `evidence/S1_PVP0_FEET.json`, `S1_PVP0_CROSS.json`). Each recipient foot was reconstructed step by step from the Jolt manifolds already in the LIGHT, NOMINAL and HEAVY records. For each boot piece:
- normal force;
- friction impulse against its cap μ·Σλ;
- torsional friction against its cap μ·Σλ·d;
- centre of pressure;
- velocity at the centre of pressure, and slip distance;
- roll, pitch and yaw;
- ankle, knee and hip angles against TWIN, joint torques (M1b active plus passive), M1b activations and C3's own intents;
- support polygon, COM and XcoM against it;
- pelvis and thorax velocities;
- the tackler's contact force on each recipient leg body, split into downward and horizontal parts.

**Jolt 5.6 friction, as built in V2.** Each of the 10 boot pieces is its own manifold. It has one linear friction constraint at the manifold's mean point (circular cone, μ·Σλ_n) and one torsional constraint (μ·Σλ_n·d_i). The two caps are applied independently.

| case | struck (left) foot | far (right) foot | tackler pressing DOWN on the recipient's feet |
|---|---|---|---|
| LIGHT | slips 31 mm, rolls 36°, stays loaded (peak 1,144 N) | **0 mm slip; peak friction demand 0.17 against 1.2** | tackler boot on the struck foot: **334 N·s downward** over 2 s |
| NOMINAL | **swept 0.52 m** (unloaded at 0.23 s), then **crushed at 7.2 kN** | 90 mm slip, rolls 76°, peak load 1,840 N | tackler boot on the struck foot: 274 N·s downward |
| HEAVY | **swept 1.04 m** (unloaded at 0.23 s) | 88 mm slip, rolls 44°; hit at 4.6 kN, of which **2.4 kN downward**, so its load reaches 3.8 kN | tackler **thigh on the far foot: 247 N·s downward** |

**Why the far or support foot stayed where it did:**
- **LIGHT.** Nothing pushed the far foot sideways: its shear never exceeded 0.17 of its load, against 1.2 available, so μ = 0.2 would also have held it. The statue is the struck foot, held by the tackler's boot pressing on it for 2 s while the tackler stopped dead.
- **NOMINAL.** Support release did happen: the struck foot went 0.52 m, past the far foot. It was then trapped under the belly-flopped tackler. With no step available, the recipient sat down onto the tackler's back.
- **HEAVY.** The tackler's thigh landed on the far foot. Its friction did saturate briefly (μ 1.2), but against a normal load of 3.8 kN that the tackler had inflated. The recipient pivoted over that pinned foot and was flipped.

**Contributions, classified:**

| owner | role |
|---|---|
| **TACKLER CONTACT GEOMETRY** | **Primary.** Contact from above, downward forces, and the bodies locked by the tracker's constant authority (PVP-0 problems 1–2) |
| **BODY MASS / INERTIA** | Correct physics. A loaded foot under a 725 N body is hard to drag |
| **C3 BALANCE CONTROL** | No step, so the moderate band topples slowly over whatever foot remains |
| **FOOT/TURF TRACTION** | Marginal only. Saturated briefly at tackler-inflated loads |
| **ANKLE PASSIVE MECHANICS** | Not causal. The struck foot rolls about 30° in about 60 ms, and real sprains run at 400–1,260°/s |
| **M1b ACTIVE TORQUE** | Not causal. Ankle inversion short-range stiffness is 0.51–0.86 N·m/deg, close to the human 0.99 ± 0.41 |
| **COLLIDER GEOMETRY / SOLVER** | Not causal. Penetration stays within the slop; no phasing |

## 2 · Literature: is the observation plausible? (`research/S1_LITERATURE.md`)

A research subagent compiled 69 sources, about 21 read in full. I spot-checked three key numbers against the saved source texts: Blackburn Table 6.10, Jain 2016, and the FIFA Test Method 06.

**Translational studded-boot traction is high and falls with load:**
- about 1.86–2.70 at 0.19–0.44 kN (Blackburn 2012, verified);
- 0.91–0.94 at about 2 kN (verified);
- elite in-situ loads give 2.4–4.2 kN of horizontal force; natural grass then releases by shearing the turf (a divot, Kent 2015);
- ordinary play uses about 0.4–0.8; the 95th percentile in cutting is about 1.2.

**Rotational traction:** 25–50 N·m at 450 N in the FIFA test, and 28–59 N·m at 580 N on natural grass. A flat foot-sized plate at μ = 1 gives about 42 N·m.

**Foot roll and reflexes:**
- peak inversion velocity in real sprains is 974°/s on average (468–1,752);
- peroneal EMG starts at 54–69 ms; useful eversion torque at about 135 ms;
- after a sudden inversion, an unloading pattern of hip, knee and ankle flexion appears from about 68–80 ms.

**Balance responses:** automatic postural responses start at 73–110 ms; a step lands no sooner than about 300 ms.

**Real tackles:** in 140 elite ankle sprains, 78 % had one foot down, 87 % were loading the injured leg, and 42 % were being tackled. Slips: losing one foot gives 0/28 falls, losing both gives 6/28.

**Conclusion.** The sliced-out response is plausibly rapid loss of the whole support base: the loaded struck foot is displaced or rolled while the other foot is unloaded or also swept. It is **not** a slippery surface. Realistic studs make a planted, loaded foot harder to move than V2's μ 1.2.

## 3 · The support-release laboratory (`lab/`)

**Setup:**
- The recipient is the PVP-0 recipient exactly: the frozen C3 on canonical M1b, from the PPR-3 standing entry, in the frozen PVP-1A world in solo mode.
- The impactor is a dynamic rigid body (a capsule or a sphere) with a stated mass, inertia, size, height, speed and direction. It is parked, kinematic and inert, until its launch velocity is written once.
- Contact is ordinary Jolt contact, and the impulse is ledgered as external.
- Prescribed force pulses, constant pelvis preloads and PVP-0 force replays are explicit external forces at body-local points.

**341 runs per candidate:**

| family | runs | content |
|---|---|---|
| GRID | 252 | floating bars: 6 directions × 4 heights (5, 15, 30, 45 cm) × 4 masses (8–75 kg) × 3 speeds (2–6 m/s) |
| SLIDE | 24 | ground-sliding bodies |
| PULSE | 40 | impulse × duration × height on the left shank |
| LOAD | 16 | ±40 N preload, so the feet carry about 26 % and 74 % of the load |
| REPLAY | 9 | PVP-0 replays: FULL, STRIKE (first 100 ms), HORIZONTAL (downward component removed) |

- **Twin:** 8ef0ed97f8abe751, identical on rerun; quiet standing within 0.8 mm of pelvis height and 2.7 mm of COM.
- **Metrics** (`lab/s1_metrics.mjs`) are measured from the physical response; nothing is classified from the disturbance size.

**Current V2 recipient (no change):**
- **Absorbed: 44 runs.** No foot moved more than 2 cm and the COM moved less than 5 cm.
- **Displaced and recovered: 75.**
- **Fast falls (under 0.5 s): 115.** Of all the falls, 132 are *sliced* (the feet move more than the COM along the disturbance by the time the pelvis has dropped 10 cm) and 72 *hinged*.
- **Slow falls: 107.**
- **Lateral sweep at the shin:** falls begin at 48–80 N·s, and fast sliced-out falls at about 120 N·s. A knee-height sweep needs about 240 N·s for a fast fall.

**Support loading** (±40 N; a ±60 N preload toppled the twin by itself in about 2 s, a C3 lateral-lean limit recorded as a finding):
- With the weight on the far foot, even a 32 N·s sweep carries the lightly loaded struck foot about 1.1 m, and the body topples slowly (1.4–1.9 s) over the loaded far foot. That is the *hinge*.
- With the weight on the struck foot, a 66 N·s sweep takes both feet: a fall in 0.59 s, *sliced out*.
- This is the evidence pattern.

**PVP-0 replays (open-loop):**

| replay | LIGHT | NOMINAL | HEAVY |
|---|---|---|---|
| FULL (as recorded) | statue: recovers, struck foot 7 cm | falls at 0.96 s | falls at 0.84 s |
| HORIZONTAL (downward part removed) | released: falls at 0.61 s | falls at 0.50 s | falls at 0.23 s |
| STRIKE (first 100 ms only) | recovers | falls at 1.63 s, slowly | falls at 0.90 s |

The open-loop push overstates the sweep once the foot moves, but the sign of the effect is unambiguous.

## 4 · Successors (baseline → hypothesis → change → result → conclusion)

All are evidence-motivated and generic. Each was run on the same 341 disturbances and the frozen regression battery.

| id | hypothesis (diagnosed mechanism) | change | result vs V2 | conclusion |
|---|---|---|---|---|
| DIAG_TONIC (diagnostic) | C3 artificially preserves support | M1b tonic intent only | Large sweeps release support and fall within 10–30 ms of C3's timing. The twin cannot stand, so only the fast cases are valid | **No:** release is passive, complete within about 150 ms, before C3's 100 ms channels |
| C3-SC | C3 commands an unloaded, sliding or edge-standing leg as a support | Per-leg loadability c = load × slip × tilt (50 ms, smoothed) scales that leg's stance intent, to c·(τ_static + Δτ_C3). Load feedback, Dietz & Duysens 2000 | 10 recoveries become slow falls, 10 slow falls become fast; struck knee yield +1.7° (17.2° vs 15.5°) | rejected |
| C3-UR | V2 lacks the human unloading response to sudden ankle rotation | Proprioceptive channel at 67 ms, graded between 85 and 300°/s; stance intent withdrawn; peroneal reflex at 0.3 × capacity (Konradsen & Ravn 1990, Konradsen 1997 and 2005, Chu 2010) | Ordinary balance bit-identical to C3. In sweeps, 17 recoveries become slow falls and 6 slow falls become fast | rejected for now: unloading without a step only topples the body |
| LDG | The contact model lacks load dependence and turf failure | μ(N) = 0.718 + 444.6/N (Blackburn fit; cap 2.7), plus a 3 kN per-foot natural-grass divot cap | 19 displaced become absorbed, 28 slow falls become displaced, 29 fast falls become slow; mean pelvis rotation 40° vs 49° | more realistic, and planted feet become **harder** to sweep (boot-height sweeps mostly held). Not a release mechanism |
| LDG + C3-UR | combined | both | between the two | no benefit |

## 5 · Regression gates

The frozen B2M battery, scored by the frozen B2F criteria (`scripts/s1_regress.mjs`):

| candidate | B2F | no-step thresholds fwd / back / left / right (N·s) | 60 s standing hash |
|---|---|---|---|
| frozen C3 (evidence) | 16/17 (P8) | 12.09 / 20.23 / 25.88 / 26.61 | bf92ac5126c188af |
| V2 (this harness) | 16/17 (P8) | 12.09 / 20.23 / 25.88 / 26.61 | **bf92ac5126c188af** |
| C3-SC | 16/17 (P8) | 12.09 / 20.23 / 26.61 / 27.34 | 433292114f1077e2 |
| C3-UR | 16/17 (P8) | 12.09 / 20.23 / 25.88 / 26.61 | **bf92ac5126c188af** |
| LDG | 16/17 (P8) | 12.09 / 20.23 / 25.16 / 28.07 | 961f2e9916fd6f05 |
| LDG + C3-UR | 16/17 (P8) | 12.09 / 20.23 / 25.16 / 26.61 | 961f2e9916fd6f05 |

- Every candidate stands 60 s. Sway is unchanged: COP low-pass RMS about 3.0 mm AP and 6.0–6.2 mm ML.
- The small pushes pass, and determinism is identical.
- The lateral thresholds of C3-SC and LDG move, but stay inside the band [21.8, 49.8].

## 6 · Exploratory two-body run (clearly labelled; the mission does not depend on it)

- **Script:** `scripts/s1_slider_run.mjs`.
- **World:** the frozen PVP-0 two-character world, with the recipient unchanged.
- **The second body is a passive sliding articulated body:**
  - the V2 tackler spec in K's authored SLIDE-phase pose (frame 102, t 0.85 s). K's slide pose floats 85 mm above the turf, so it was lowered onto the turf;
  - it holds the pose only with the frozen PVP-1A SnapshotTone;
  - it gets one uniform launch velocity.
- **Not Astra's tackle:** there is no authored motion after the entry pose, and K is not modified.

**At 6.74 m/s (K's dive speed):**
- first contact at 0.054 s, on the left shank and foot;
- both feet are swept, the left 1.0 m and the right 0.75 m, and both are airborne by 0.2–0.3 s;
- the pelvis drops 0.92 → 0.55 m by 0.4 s while the COM moves 0.19 m. **The recipient is sliced out, unscripted**; fall time 0.30 s.

**At 5 m/s:** the slider brakes on its own boot and body friction, and the result is a slow topple at 0.73 s.

**Speed spectrum** (added at about 04:50; same recipient and world, only the launch speed changes). The four speeds are PVP-0's LIGHT, NOMINAL and HEAVY approach speeds, plus 5 m/s:

| speed | recipient's feet | tackler force on the legs over 2 s | outcome |
|---|---|---|---|
| 3.37 m/s | struck foot pushed 17 cm; the slider stops lying on it | 376 N·s downward, the PVP-0 LIGHT pattern | slow topple at 2.19 s |
| 5 m/s | struck foot swept 0.55 m; slider stops | 386 N·s downward and 364 N·s upward | slow topple at 0.73 s |
| 6.74 m/s | both feet swept | 66 N·s downward | sliced out at 0.30 s |
| 8.43 m/s | both feet swept, 1.3 and 1.0 m by 0.4 s; body carried 0.47 m over the slider | 45 N·s downward | sliced through at 0.28 s |

So a tackler body that stops at the feet ends up lying on them, generically. The sliced-out response appears once the slider carries its momentum through the feet.

**Integrity:** equal-and-opposite is exact; cross penetration is at most 8.8 mm.

## 7 · Answers

1. **Was my observation about the anchored support leg correct?** As a visual description of PVP-0, yes. Its implied mechanism, a far foot glued by traction, is wrong.
   - **LIGHT:** the far foot was never pushed sideways (demand 0.17 against 1.2). The anchoring was the struck foot, pressed down by the tackler's boot (334 N·s).
   - **NOMINAL and HEAVY:** the struck foot *was* swept, 0.52 and 1.04 m. Then feet were crushed or pinned from above: 7.2 kN on the struck foot in NOMINAL; the tackler's thigh on the far foot in HEAVY, with 2.4 kN downward.
2. **What actually caused it?** In order:
   - **TACKLER CONTACT GEOMETRY.** The tackler belly-flopped and its contact came from above, pressing the feet into the turf. Its constant tracking authority kept pressing. It lost about 3.3 m/s of horizontal speed in its own turf impact, so little momentum swept along the ground.
   - **The scenario.** A standing recipient with both feet loaded is the least sweepable configuration.
   - **C3 cannot step.** Moderate disturbances end as slow topples over the remaining foot.

   Not friction, collider geometry, the solver, ankle mechanics or M1b.
3. **What does football and human evidence say should happen?**
   - Studs grip strongly and rotational resistance is substantial, so a planted, loaded foot holds against ordinary shear.
   - Under a sudden blow the foot rolls quickly (hundreds of °/s) before reflexes (54–69 ms) and automatic responses (73–110 ms) can act.
   - Players usually lose their footing in a tackle because the struck leg is the loaded stance leg and the other is unloaded. Losing one support is survivable; losing both, by sweep or roll, gives the sliced-out fall.
4. **What should happen at LIGHT / MODERATE / HEAVY?**
   - **LIGHT:** the foot stays planted, with sway and perhaps a small roll.
   - **MODERATE:** the struck foot rolls, slips or unloads, the struck leg yields, the pelvis is displaced, and the player recovers by shifting load or stepping.
   - **HEAVY:** the struck foot is displaced while the other is unloaded or also swept. The feet go and the COM stays, so the player falls in about 0.3–0.6 s.

   V2's lab spectrum follows this:
   - **LIGHT (≲ 30 N·s at the shin):** absorbed.
   - **MODERATE (30–90 N·s):** displaced and recovered, or a slow topple (no step).
   - **HEAVY (≳ 120 N·s at the shin):** a fast sliced-out fall.
5. **Was current turf traction realistic?** It is not too high. V2's flat μ 1.2 is **lower** than studded traction at standing loads (about 1.9–2.7). It is a little higher than at about 2 kN (0.91–0.94). What it lacks is load dependence, stud engagement travel (15–25 mm) and grass divot release (2.5–4.2 kN). These are refinements, not the cause.
6. **Was rotational traction realistic?** Yes. The flat 10-piece boot with Jolt patch friction gives about 42–50 N·m at body weight, against 25–59 N·m measured. Caveat: Jolt caps linear and torsional friction independently, which is slightly generous under combined loading.
7. **Was C3 or M1b artificially preserving support?** No.
   - The tone-only diagnostic releases support on the same timing, because release is passive and finishes within about 150 ms.
   - M1b ankle inversion stiffness is at human level.
   - C3 does three legitimate things: it recovers moderate pushes, it holds the trunk upright in space during sweeps (a finding, Q17), and it commands unloaded legs as supports. Removing that last one (C3-SC) changed little.
8. **Was foot or collider geometry involved?** Not causally. The rigid flat boot rolls onto its edges (36–76° observed) and gives realistic rotational resistance. The ankle engine stop at the hard limit plus margin allows about 57° of inversion in violent sweeps, which is in the real sprain range.
9. **What experimental changes did you test?**
   - DIAG_TONIC;
   - C3-SC (support confidence);
   - C3-UR (unloading reflex);
   - LDG (load-dependent studs with a divot cap);
   - LDG + C3-UR;
   - the PVP-0 force replays (FULL / STRIKE / HORIZONTAL);
   - support-loading preloads: ±60 N (invalid, the twin falls) and ±40 N;
   - the exploratory sliding two-body run, at 3.37, 5, 6.74 and 8.43 m/s.
10. **Which failed, and why?**
    - **C3-SC and C3-UR:** they withdraw support from a disturbed leg, but the body cannot step, so recoveries become slow falls (10 and 17 runs). Unloading is half of a human strategy whose other half is a step.
    - **LDG:** it fails the visual goal by design of the evidence: realistic studs hold planted feet.
    - **The ±60 N preload family:** invalid, because the twin falls (a C3 lateral-lean limit).
11. **What is the best candidate?** No successor beats the current V2 recipient for support release. The best-justified realism change is LDG traction, which needs a turf-type decision and a locomotion check (Q13). The best visual result came from correcting the *disturbance*, as the exploratory sliding body shows.
12. **Does it still stand normally?** Yes. Every candidate stands 60 s. V2 and C3-UR are bit-identical to the frozen C3 (standing hash bf92ac51).
13. **Does it preserve ordinary traction?** For V2, C3-SC and C3-UR, yes: traction is unchanged. LDG raises traction at standing loads (μ 1.95 at 360 N). But its fitted value at cutting loads (≈ 0.90 at 2.5 kN) is **below** the 95th-percentile cutting demand (≈ 1.2). That is a locomotion risk to check before any adoption.
14. **Does it genuinely release support under a sufficiently large disturbance?** Yes, every candidate and V2. A lateral sweep of 120 N·s or more at the shin sweeps both feet within 0.2–0.3 s. So does the exploratory slider at 6.74 m/s.
15. **Does the struck leg yield?**
    - **Ankle:** yes, it rolls 30–40° quickly.
    - **Hip:** 25–45°.
    - **Knee:** only modestly, a mean of 15.5° in the first 0.5 s (C3-SC adds 1.7°). C3 holds knee length, and the V2 knee has no varus or valgus freedom.
16. **Does the pelvis now translate and rotate naturally?** In sweeps, yes: 60–135° of rotation within 0.6 s in fast falls, and 0.2–1.0 m of translation. In the slow band it translates slowly. LDG reduces it.
17. **Does the upper body follow naturally?** Only partly.
    - In the HEAVY sweep the pelvis turns 64° in space but the thorax only 13°, so the spine bends about 64°.
    - Without control the thorax turns 35°: most of the lag is passive inertia, and C3's trunk-orientation objective holds the rest upright.
    - The upper arms move 19–25° relative to the thorax; the elbows stay nearly rigid (3°).
    - This is a controller design question, righting against being carried, plus protective arm responses. It was not changed.
18. **Does a heavy sweep produce the sliced-out character without scripting?** Physically, yes: the lab HEAVY run (when the pelvis has dropped 10 cm, at 0.28 s, the feet have moved 0.71 and 0.34 m along the sweep and the COM 0.08 m; fall at 0.32 s; peak foot travel 0.88 / 0.50 m) and the exploratory slider. Visually it is only partly there, because the trunk is held upright and the arms barely move. It is unverified against the reference, which I could not open.
19. **Does a light disturbance remain recoverable?** Yes. Up to about 30 N·s is absorbed. 30–90 N·s is mostly displaced and recovered, with the struck foot sliding 3–16 cm.
20. **Any new phasing, joint-limit or solver problems?**
    - **Phasing:** none. Contacts are ordinary Jolt contacts. Turf penetration is at most 11 mm, and cross penetration in the slider at most 8.8 mm.
    - **Joint limits:** the swept foot's ankle inverts up to about 21° (lab) and 22.5° (slider) past its anatomical hard limit, about 57° of inversion. That is the real sprain range (football median 70°); PVP-0's maximum was 8.9°.
    - **Solver:** LDG shows one violent run with 39 mm of joint separation, which is flagged.
    - **Speed stop:** one open-loop replay (R_HEAVY_HORIZ) stopped on the speed limit. It is an artefact of open-loop forcing.
21. **Determinism?**
    - The twin and a disturbed run were rerun bit-identically for every candidate.
    - The regression determinism checks are identical.
    - Clip re-runs reproduce the sweep hashes.
    - The V2 battery reproduces the frozen C3 bit for bit.
22. **CPU?**
    - **Recipient alone, instrumented:** 0.83–0.98 ms per 240 Hz step. V2 takes 0.87 ms; C3-SC and C3-UR add about 0.05 ms for their foot-load sensor; LDG adds about nothing.
    - **Breakdown:** the Jolt step is about 0.35 ms and measurement about 0.2 ms.
    - **Two-body slider:** about 4.5 ms per step, instrumented.
23. **What remains missing?**
    1. A tackler that physically slides. Its contact must be grounded (K's slide floats 85 mm), carry momentum along the turf, push horizontally rather than down, and have limited post-contact authority.
    2. Dynamic, single-support recipients (running).
    3. Stepping, protective and righting responses: the moderate band's slow topple, the arms and the trunk.
    4. Stud engagement compliance and turf failure (minor realism).
    5. Knee varus/valgus laxity.
    6. The reference video, for a direct visual check.
24. **What surprised you?**
    - The LIGHT statue's far foot carried almost no shear.
    - Measured stud traction runs *against* the friction hypothesis.
    - A body with tone only releases support exactly like C3 does.
    - Adding a human-like unloading reflex made the character fall more often, because it cannot step.
    - K's slide floats 85 mm above the turf.
    - C3 cannot hold a 60 N sideways lean.
    - The trunk stays nearly upright while the pelvis turns 64°.

## 8 · Recommendation for the canonical V2 architecture

1. **Keep the recipient's support mechanics**: the rigid flat 10-piece boot, Jolt patch friction, M1b and the ankle passive layer. They release support physically. **Do not lower friction.** Evidence says real studs grip harder.
2. **Fix the tackler before the next PVP:**
   - a grounded slide that carries horizontal momentum through the feet;
   - contact forces horizontal or lifting, never pressing down;
   - post-contact authority that yields, rather than PVP-0's constant tracking authority.

   The exploratory slider shows that this alone produces the sliced-out response with today's recipient. This belongs to TACKLER ACTION / TACKLER PHYSICAL TRACKING, and Astra's K is not modified.
3. **Test PVP with dynamic recipients:** running, single support, struck on the loaded stance leg. That is the configuration the injury data describe, and it is far more sweepable.
4. **Controller roadmap:**
   - a stepping and protective layer (the moderate band);
   - load feedback and the unloading reflex (C3-SC / C3-UR) only together with stepping;
   - a decision on trunk righting during loss of support.
5. **Contact realism: LDG is NOT YET.** Its load-dependent traction and divot cap are evidence-based and pass the balance battery. But it needs your turf-type decision (natural grass vs 3G) and a locomotion check: at cutting loads its fitted μ falls below the 95th-percentile demand.
6. **Keep the SUPPORT-1 instruments in PVP runs:**
   - foot normal load, friction demand against μN and pinning impulses (`s1_feet_audit`, `s1_cross_decomp`);
   - the lab, as a regression for any recipient change.

## 9 · Disclosures and housekeeping

- **Reference video:** not accessible; see above.
- **Disk full** at about 04:19. I deleted 3.8 GB of my own regenerable PVP-0 capture frame dumps from the session scratch folder; the committed PVP-0 videos and stills are untouched.
  - The console logs of four sweeps stopped at that point. Their results were written intact.
  - The first regression attempt crashed in scoring (`Q.params` was missing) and was re-run.
- **LOAD family:** first designed at ±60 N. Those twins fall under the preload alone, so the family was replaced by ±40 N; it is recorded as an amendment inside each `S1_SWEEP_*.json`. Its onset metric was also corrected to the first impactor contact.
- **Open-loop replays** are valid only until the recipient diverges from PVP-0's motion.
- **The exploratory slider** is not Astra's tackle and not a tackler candidate.
- **Commits (local, not pushed):** 7fa9289f instruction; ca827166 audit, lab, successors and evidence; 223bba32 review media; the report commit follows.
  - Outside Git: the four slider records (65 MB) and the literature source texts (69 MB); see `review/OUTSIDE_GIT.md`.
- **Daily publication:** this run started at 03:41, inside the 12 Oct chronicle day (days end at 06:00). Publication of the 12 Oct addendum (BALANCE-3, PVP-0 and SUPPORT-1) is due at the first session after 06:00 13 Oct: chronicle, push and verify. Nothing was pushed tonight.

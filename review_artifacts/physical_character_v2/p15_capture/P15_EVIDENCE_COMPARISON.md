# P15: evidence / reuse comparison and decision (no code, criterion or parameter changed)

**Authority:** `../sources/2026-10-05_user_instruction_p15_capture_evidence_reuse.md`.

**Inputs:**
- `research/IHMC_EMERGENCY_SWING.md` (IHMC code);
- `research/LITERATURE_CAPTURE.md` (BLF, walking-controllers incl. the unmerged step-adaptation branch, PyPnC, Pratt / Koolen / Khadiv / Griffin / Stephens / Hof, human biomechanics);
- `P15_CAPTURE_ANALYSIS.md` (Touchline's own capture analysis, model validated 32 / 32).

## 0. Answer in brief

- **The evidence selects an in-place emergency put-down for P15, not a recovery step.**
  - IHMC has a dedicated state for exactly this situation (`FlamingoStanceState`: one foot lifted by a trajectory command, ICP pushed outside the stance foot but inside the two-foot hull). It drops the lifted foot straight down at its current foothold. The new foot joins the balance polygon on the same tick its foot switch measures contact.
  - Touchline's capture analysis confirms the original foothold is inside the one-step capture region for all 8 bodies, if the landed foot becomes support promptly after measured contact.
- **The current failure is the controller's support-acceptance pipeline, not physics and not the BLF trajectory.** There is no established precedent for its three limiters:
  - acceptance intent coupled to the size of the slow λ return (about 0.15 s);
  - the quiet-standing 10 % floor applied during an emergency;
  - a fixed 0.1 s load ramp regardless of capture need or released torque.
- **Not decided by evidence:** how to divide the short capture-time budget between descent smoothness and load-transfer smoothness under E1b-7's 10 N·m / tick. This constraint is specific to Touchline's finite-torque joint PD. IHMC loads at once and has no torque-rate criterion; PyPnC uses a fixed 0.225 s ramp. Materially different timing designs remain defensible (§6), so **I stopped before implementing.**

## 1. Question 1: what established controllers do when balance is endangered during swing

| mechanism | IHMC | BLF | walking-controllers | PyPnC | literature | Touchline today |
|---|---|---|---|---|---|---|
| shorten swing | yes, walking: ICP-projected speed-up, min swing 0.3–0.7 s. Gives ≈ 0 for a lateral error or a hover / standing plan | mechanism only (re-spline to a new time); no policy | no (timing tolerance 0 in the unmerged branch) | no | Griffin 2017 (min 0.6 s); Khadiv (T ∈ [0.2, 0.6] s); Hof 2010 human 0.40 → 0.33 s | no; put-down fixed at 0.302 s (bandwidth) |
| alter the touchdown location | yes, walking: one-step capture region ∩ reach, every tick, no crossover. **Not in flamingo** | CentroidalMPC (location, timing fixed) | unmerged branch: Khadiv QP, location only | no | Pratt, Koolen, Khadiv, Griffin, Stephens 2010, Hof (humans step relative to the XcoM) | no (P15: put down at the anchor) |
| prepare the contact / load transition before measured touchdown | plan only (the CoP / DCM transfer starts at the planned touchdown); **no pre-load** (SWING = no contact points); TouchDownState dead code | planned contact on the clock | planned contact flags | time-indexed DCM | Stephens 2010: the plan never asks for force before touchdown | the abort holds λ at stance until contact (H9) |
| accelerate load acceptance | n/a: **full force at the measured touchdown, no ramp** | — | planned double support | fixed 0.225 s force-cap ramp | not found | fixed 0.1 s ramp, **after** an intent delay |
| combine | walking: speed-up + step adjustment + immediate support | — | — | — | Griffin / Khadiv / Jeong: timing + location | — |
| **put down in place** | **FlamingoStanceState:** straight down from the last commanded position, at touchdown velocity (≈ 0.06–0.12 s for 20 mm), then support on the measured switch | — | — | — | the timing-only special case of Griffin / Khadiv; Griffin: timing alone works when the error points along the ICP dynamics | the BLF quintic, 0.302 s |

## 2. Question 2: the five contact notions, kept separate (physics authoritative)

| notion | IHMC | PyPnC / BLF / walking-controllers | Touchline today | Touchline: what evidence supports changing |
|---|---|---|---|---|
| **commanding the foot toward contact** | swing / soft touchdown, ends moving down | swing spline to the planned contact | the abort's quintic to the anchor (`lcPutDown`) | timing only (§6). Keep the BLF machinery. A non-zero terminal velocity (IHMC's soft touchdown) is a later option |
| **anticipating contact in the controller** | plan only: the transfer CoP starts at the planned touchdown; never the QP contact set | planned contact drives the states | **none.** The λ return (and with it the acceptance intent) starts only at the first contact tick (H9) | **the plan may want the foot loaded once it is in contact.** This is planned-vs-estimated contact (BLF), and IHMC's flamingo re-initialises the plan to double support. It is an intent, not a contact: it must not change ξ_ref before contact (§4 of the analysis: starting the λ return early *shrinks* the heavy body's envelope) |
| **measured physical contact** | filtered foot switch (force + CoP-inside, 1–3 ticks) | PyPnC: kinematic in simulation | lifecycle TOUCHDOWN from Jolt contact (1 tick) | unchanged |
| **accepting load** | on the measured switch (after 60 % swing; flamingo: time in state), **full force at once** | PyPnC: 0.225 s linear force-cap ramp from phase entry | LOAD_ACCEPT needs a request ≥ 5 % (`wantShare`) for 0.05 s (`acceptDebounce`), then s ramps over 0.1 s, **and the stance foot keeps ≥ 10 %** | acceptance gated by **measured contact sustained for the existing debounce**, with the plan's intent already present; no quiet-standing floor in an emergency (IHMC's QP has none) |
| **declaring the foot supporting** | the same tick as the switch (support polygon) | never inferred from load | the support region grows with s; SUPPORT at s = 1 | unchanged (continuous in s) |

**Nothing in the evidence supports declaring contact or support before Jolt reports it.** The two IHMC paths that do so (operator abort mid-swing; the flamingo 1.2 s timeout) are rejected.

## 3. Question 3: P1–P4 against the established approaches

| option | closest established mechanism | verdict |
|---|---|---|
| **P1** capture-timed put-down | Griffin / IHMC speed-up (walking), the fast flamingo touchdown, Khadiv / Hof timing adaptation | **supported, as one part.** With the current acceptance pipeline no smooth timing is enough: V2-165-62 would need touchdown ≤ 0.094 s |
| **P2** earlier acceptance intent | planned-vs-estimated contact (BLF); flamingo plan re-initialisation; IHMC support on the measured switch | **supported in its decoupled form** (the intent to accept at measured contact). **Not** in its naive form (starting the λ / ξ_ref return at the abort), which the analysis shows is harmful (V2-198-92 envelope 0.58 → 0.51 s) |
| **P3** abort-specific acceptance profile | PyPnC's 0.225 s force ramp; IHMC: none | **needed for E1b-7, not for capture.** It is the Touchline-specific part (§5) |
| **P4** recovery step | IHMC walking step adjustment, Khadiv / Griffin, human behaviour | **not required for P15.** Once acceptance follows measured contact, the model needs no foothold change for any body, except V2-165-62 by 1.5 cm at the 0.29 s touchdown (none at 0.20 s). IHMC's own flamingo state keeps the foothold. A step remains the more robust strategy for larger pushes and belongs to stepping / E2 |
| **P5** criterion change | — | **excluded.** P15's in-place premise is physically valid for all bodies (§4) |

## 4. Question 4: is 15 N·s recoverable in place, only by moving the foot, or beyond the no-step envelope?

- **Beyond the no-step (0-step) envelope: yes, for every body.** ξ is outside the stance foot by 1.2–4.4 cm at push end, so ankle and CoP alone cannot recover. P15 is inherently a one-step capture.
- **Recoverable by an in-place emergency put-down: yes, for every body.** The original foothold lies in the one-step capture region if support follows measured contact.
  - Physical best case (support at contact, CoP at the limit): latest touchdown 0.44 s (V2-165-62) to 0.96 s (V2-198-92).
  - With the existing debounce and a 0.10–0.25 s load ramp: 0.21–0.27 s (V2-165-62), 0.31–0.36 s (V2-175-70), ≥ 0.41 s for the others.
- **Recoverable only by moving the foot: only under the current acceptance pipeline.** It would need 17.7 cm outward for V2-165-62 and 8.6–9.3 cm for V2-175-70.
- **The margin is body-dependent and small for the lightest body.** 15 N·s gives the 62 kg body a larger ξ shift (4.4 cm outside its stance foot) and a faster ω (3.29). This matches the literature: humans would side-step and shorten swing (Hof 2010: about 7 cm more lateral).

## 5. A Touchline-specific constraint the established stacks do not face

**The post-abort acceptance transient (E1b-7) is the stance hip abductor releasing the single-stance load** (`hip_*.z` = abduction; erratum E1bF-e4):
- about 100–116 N·m on the 92 kg body (≈ 1.2 N·m/kg), released as the landed foot takes the weight;
- with the fixed 0.1 s ramp it falls at up to 10.6–10.8 N·m per tick (V2-198-92), and 12.69 in the official PSTAR runs. Its size scales with body mass: 6.0 N·m on V2-165-62, 10.8 on V2-198-92;
- IHMC accepts load at once (no torque-rate criterion), and PyPnC ramps over 0.225 s.

**The capture time budget therefore has to be divided between two smoothness demands:**

| acceptance ramp | latest touchdown, V2-165-62 | est. acceptance Δτ / tick, V2-198-92 |
|---|---|---|
| 0.10 s | 0.270 s | 12.0 (fails 10) |
| 0.15 s | 0.247 s | 8.0 |
| 0.20 s | 0.228 s | 6.0 |
| 0.25 s | 0.211 s | 4.8 |

Assumptions: support at measured contact plus the existing 0.05 s debounce, no emergency floor. Torque rates are scaled from the measured 0.1 s values (approximate); latest touchdowns come from the validated model.

- The light body (smallest torques) needs the fastest acceptance and an earlier touchdown, about a 0.2 s descent. The heavy body (largest torques) has abundant capture time.
- A set of timings that satisfies both capture and the unweakened 10 N·m criterion appears to exist for every body. **No established stack prescribes how to choose them.**

## 6. Decision: architecture selected; timing design needs your choice

**Selected by evidence** (IHMC flamingo + BLF planned-vs-estimated contact + the capture analysis), to be implemented behind default-off flags once the timing design is chosen:
1. **In-place emergency put-down** with the existing BLF quintic from the current reference state. The foothold is unchanged; P15 is not turned into a step.
2. **Acceptance intent from the abort plan.** While the abort's foot is airborne, the plan wants it loaded once in contact. LOAD_ACCEPT still needs measured Jolt contact sustained for the existing `acceptDebounce`. The λ / ξ_ref return still starts at contact (H9 kept).
3. **No quiet-standing 10 % floor during the abort recovery.** The allocation stays bounded by the support weights (continuous in s).
4. **Physics stays authoritative everywhere.** No timeout-declared contact.

**Materially different timing designs (your decision):**

| | descent | load ramp | basis | pros | cons |
|---|---|---|---|---|---|
| **T-A: capture-timed, online (Griffin / Khadiv-style timing adaptation)** | T = min(bandwidth 0.302 s, LIPM deadline − debounce − ramp/2 − margin), computed at the abort from ξ, ω, the stance edge and the anchor edge | as slow as the deadline allows, up to a cap (e.g. PyPnC's 0.225 s) | established timing-adaptation principle; uses capture time on smoothness | per-event; maximally smooth when there is time (heavy bodies) | new machinery; needs a model-uncertainty margin and a rule for splitting the budget (not established) |
| **T-B: fixed emergency timings** | one fixed value (e.g. 0.20 s, the lightest-body need; within Khadiv's T ∈ [0.2, 0.6]) | one fixed value (e.g. PyPnC's 0.225 s) | PyPnC-style fixed ramp; human emergency swing about 0.3 s | simplest; no online model | values chosen from the lightest body's capture need; less smooth than needed for heavy bodies; 0.20 s descent is 23 % tracking error by the bandwidth rule (10 % design) |
| **T-C: in-place now, step later** | T-A or T-B for E1b | — | IHMC: flamingo in place; walking adjusts footsteps | keeps E1b in place; capture-aware stepping added in E2 for pushes beyond the in-place envelope | P15's margin for the lightest body stays small until stepping exists |

**Recommendation: T-A,** with its two new parameters declared before any run:
- the model-uncertainty margin, from this analysis's own validation errors (LOAD_ACCEPT timing within 0.04 s);
- a budget-split rule, e.g. descent first up to its bandwidth time, the remainder to the ramp up to 0.225 s.

**Also recommended: a P15 outcome distinction** (as information, no criterion change without your approval):
1. fixed-foothold recovery, with the ξ margin at measured support;
2. fixed foothold infeasible at the achievable support time ("step required");
3. stepping recovery (E2+);
4. fall.

The current P15 run would score "fixed-foothold infeasible because of support latency" on 10 / 16 bodies-sides, although physically feasible. (An interim message said 11 of 16; the count is 10 / 16 smooth put-down falls, 0 / 16 instantaneous drops.)

## 7. Preserved

- The validated foot-yaw actuator (E1b-17 56 / 56) and the BLF quintic machinery are unchanged.
- The one-tick drop is not reintroduced.
- No passive ankle tuning.
- P15 is not changed.
- No E2 implementation.

# IB-1 comparison metrics (architecture-neutral)

**Purpose:** the minimum measurements needed to compare interaction architectures on the IB-1 scenarios (`README.md`). They do not choose an architecture.

**Thresholds:**
- Where a threshold already exists in a frozen criterion, it is cited with its source.
- Where none exists, the metric is **reported** and the threshold is left to the review (marked *review*). No new number is invented here.

**Two classes:**
- **Hard correctness requirements (H):** pass/fail. One failure disqualifies the run, whatever its quality.
- **Quality metrics (Q):** continuous. They are compared across architectures and never traded against an H.

## 0. What any system under test (SUT) must expose

The harness can only measure what the SUT reports. Minimum outputs, per physics step and per 60 Hz render frame:
- **(a) Bodies:** every body segment's pose (position, orientation), linear and angular velocity, and mass / inertia, so that COM, momentum and angular momentum can be computed.
- **(b) Contacts:** every contact impulse, per body pair, per step (runner ↔ tackler, runner ↔ turf, self).
- **(c) Rendered pose:** the rendered skeleton pose actually shown.
- **(d) Mode flags:** a per-player mode flag (authoritative-only / physical / returning) with the entry and exit step.
- **(e) External forces:** any external or artificial force or torque applied by the SUT (support, carrier, servo), per step.
- **(f) CPU:** wall-clock per component, excluding logging.

**If the SUT has no physical layer for some phase,** it reports (a) and (c) from what it renders, and states that (b) / (e) are empty.

## 1. Hard correctness requirements

| # | requirement | measurement | threshold | source of threshold |
|---|---|---|---|---|
| **H1** | **Gameplay hash neutrality** | Gameplay hash of the authoritative record consumed or produced during the SUT run, compared with the frozen hash (`MANIFEST.json`), per scenario. Run live, compare per row, not only the final hash. | exact equality (max \|Δ\| = 0) | PI-1 NT-1 / NT-4 (`../pi1/PI1_PREREGISTRATION.md`), the existing gate style |
| **H2** | **No write-back / no lookahead** | (i) the record SHA-256 before = after (`ib_verify.mjs`); (ii) inputs deep-frozen; (iii) running on the record truncated at tick k gives an identical SUT state up to k | exact | PI-1 NT-2, DT-5 (`../pi1/PI1_DESIGN.md` §13) |
| **H3** | **Deterministic repeatability** | Per-step hash of the SUT's full output (state, commands, rendered pose): (i) run twice; (ii) separate processes; (iii) all scenarios in one process = each fresh (history independence) | bit-identical | PI-1 DT-1 / DT-2 / DT-3 |
| **H4** | **Contact occurrence corresponds to the authority** | Near miss: no runner ↔ tackler contact impulse. Contact cases: the first physical runner ↔ tackler contact is on the authoritative struck segment (or its mapped region, with the 30 mm adjacency rule), within ± 1 tick, location within 0.10 m. | impulse ≥ 1e-3 N·s counts as contact; ± 1 tick; ≤ 0.10 m | PI-1 compat gate CG-1 / CG-3 / CG-4 (`../pi1/PI1_COMPAT_GATE.md`, ab9a626); contact = REV2 A2 (≥ 1e-3) |
| **H5** | **Outcome consistency** | **NO_CONTACT:** no stumble or fall. **CORRECTION / STUMBLE:** never fallen (pelvis height ≥ 0.85 × the unperturbed presentation's, tilt within 20°). **FALL:** the body falls (pelvis COM ≤ 0.35 m within 1.5 s of contact). No support force after the authoritative fall transition. | as in the cited rows | PI-1 RC-4, FL-2, FL-3 (prereg); REV2 RC-4 (comparison only, never a target) |
| **H6** | **Physical integrity** | finite state; energy-residual Σ+; self-penetration; turf depth; joint hard limits | Σ+ ≤ 5 J per interaction (ledger including tackler contact work); self-penetration ≤ 10 mm; turf ≤ 10 mm; no hard-limit violation | PI-1 FL-6; the 10 mm self-penetration criterion retained for every PI-1 state (D1C decision `d000cee1`) |
| **H7** | **Entry momentum = authority** | At the step the SUT starts physical response: total horizontal momentum vs M·v_auth (M = SUT total mass, v_auth = the authoritative velocity at that tick). The momentum change is applied as one uniform shift (relative velocities and L unchanged). | exact (floating-point); the visible cost \|s\| ≤ 0.18 m/s | HG-A v2 (`../pi1/hga/HGA_V2_ADOPTED.md`, cf144e89) |
| **H8** | **No hidden outcome authority** | Over [first contact, + 0.10 s], any SUT-applied artificial force (support, carrier, servo) opposing the transferred impulse; no teleport, velocity reset or impulse cancellation at contact | opposing impulse ≤ 0.5 × transferred impulse; no state write after entry except declared ones | PI-1 RC-3, PR-5; Option C decision (`../sources/2026-10-10_user_decision_option_c_moving_stand_in.md`) |

**Notes on H1 – H8:**
- **H4 and H5 inherit PI-1 thresholds.** They are listed because they are the only frozen values that exist. The review may revise them once, for every architecture alike, before any comparison run. They must not be revised per architecture or after results.
- **H5 is a consistency requirement, not a target.** The SUT must not contradict the authoritative class. Matching the simulation's own timing is a quality metric (Q6).
- **H6 assumes V2 as the physical body.** A different body must bring its own frozen integrity thresholds *before* comparison (*review*).

## 2. Quality metrics

| # | metric | definition (per scenario, per contact where applicable) | reference in the record | existing threshold or reading |
|---|---|---|---|---|
| **Q1** | **Contact time / location / region error** | Δt (sub-steps) between the first physical contact and the authoritative event; horizontal distance between the physical contact point and the event `point`; struck region (segment, position along it); angle between the physical and authoritative contact normals and relative velocities | `PLAYER_CONTACT.point / normal / tick / sub`; `contacts[].geometry` | CG-5 overlap ratio, CG-6 approach angle (compat gate); otherwise *review* |
| **Q2** | **Physical impulse and momentum change** | runner ↔ tackler transferred impulse (N·s); runner COM Δv and tackler Δv over the contact window; runner angular-velocity change; each against the simulation's `J`, `dvCom`, `dvTackler`, `spin` | `PLAYER_CONTACT.J / dvCom / dvTackler / spin` | report only (PI-1 RC-6 / FL-5 style). The simulation's values are model values, not physical truth. |
| **Q3** | **Visible displacement** | Rendered pelvis / COM offset from the authoritative root per frame (max, RMS) during response; struck-foot deviation from the unperturbed continuation within 0.15 s; residual offset at exit | rows 8 – 13; the LOCO `pres` stream as the unperturbed continuation | RC-2 (≥ 30 mm struck-foot deviation within 0.15 s = visibly physical); otherwise *review* |
| **Q4** | **Struck-body-region response** | Δv of the struck segment in the first contact step (magnitude, angle to the contact normal) against whole-body COM Δv; deviation of struck-limb joint angles against the opposite limb over 0.15 s | the struck `seg` and `segPlanted` of the decisive contact | RC-2 (struck body Δv ≥ 0.2 m/s within 45° of the normal); otherwise *review* |
| **Q5** | **Preservation of pre-impact momentum** | From entry to the authoritative contact: \|P_SUT(t) − M·v_auth(t)\| (N·s), COM position drift (mm), and planted-foot slip (mm). After contact: P_after − P_before minus the SUT's own external impulses (turf, support) against the transferred impulse. | rows (v_auth); authoritative a = 0 before contact in IB1-NM / FL / PL (carrier investigation) | NM-2 (slip ≤ 10 mm; support mean \|axis\| / cap ≤ 0.25, saturated ≤ 5 %, where a support exists); otherwise *review* |
| **Q6** | **Outcome-timing consistency** | **FALL:** SUT times of fall onset, first non-foot ground contact, stop, against the simulation's t0 / tGround / tStop; fall azimuth against `az`; family. **CORRECTION / STUMBLE:** SUT recovery step count and time to re-acquired support, against `steps` / `until`. | `reactionStates` | report only (FL-5) |
| **Q7** | **Transition discontinuity, entering and leaving physical response** | Per rig joint: (i) position jump at the first physical frame against the last pre-entry frame; (ii) displacement over the first physical frame against the genuine continuation's displacement over the same frame (velocity continuity); (iii) the same two at exit, against the authoritative / presentation pose it returns to | the presentation stream; the authoritative rows | PR-1 (≤ 5 mm legs / pelvis, ≤ 10 mm others); PR-2 v2 (≤ 3 mm displacement, against the genuine continuation, LC-1 reading); the 10 mm discontinuity criterion; exit = NM-3 / RC-5 / DG (no frozen DG value was ever exercised: *review*) |
| **Q8** | **CPU per interaction and extrapolated match cost** | µs per physics step by component (logging excluded) × steps from entry to exit = CPU per interaction. Match cost = Σ_types (interactions per 90 min × CPU per interaction) / 5,400 s, plus peak concurrent cost. Environment declared (Node or browser, CPU, single- or multi-thread). | — | No threshold. **The interaction counts per match have not been measured.** They must come from the simulation's own statistics; the pivot document's 100 – 300 per match is labelled an assumption. Existing measured inputs: PCS-1 765 µs per 240 Hz step physics + 236 µs law / mapping (Node, M4, unoptimised); continuous V2 813 – 957 µs per step; procedural rig ≈ 0.10 ms per rig per frame (browser). |

## 3. Reporting rules

- **Every Q** is reported per scenario. None is averaged across scenario roles.
- **A failed H** is reported with its first failing step and scenario. Quality metrics for that run are still reported, but labelled "disqualified".
- **Fixed references:** the reference stream for every comparison is fixed in `MANIFEST.json`, i.e. the V1.3 OFF record. When an architecture uses a presentation stream as its entry pose, the stream (V1.3 LOCO or LC-1 LOCO) is declared, and Q3 / Q7 are computed against the same stream.
- **No result may justify changing** a scenario, a record, the simulation or a threshold after the fact.

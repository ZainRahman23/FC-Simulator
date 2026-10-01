# Physical character: handoff after the 2026-09-30 overnight runway (pre-reboot)

The state was frozen for a Mac reboot. **No development is in progress. Nothing has been pushed.**

## Update after the reboot: D6 diagnostic checkpoint (2026-09-30)

After the reboot the preserved state was verified, the user reviewed the overnight gates, and asked why D6's slide barely moves the standing player B. The full report is `d6_diagnostic/D6_DIAGNOSTIC_REPORT.md` / `.html`, and it is checkpointed locally (nothing pushed).

**Why baseline D6 legitimately recovers.** Measured, with an exact contact impulse from a force-plate twin run:
- **The hit:** the slider hits the **outer side of B's left boot, 1.8 cm above the turf**, and pushes it straight toward his other foot. That is **toward the midline, under his COM**.
- **The foot:** it is not locked. It slides **16 cm**, then carries ≈ **1.9 BW**, and its own friction pins it. The base narrows from 32 to ≈ 16 cm but still contains the COM.
- **The far foot:** it lifts for **29 ms**, and C1's feet-in-place rule puts it back down.
- **Momentum:** A→B **173 N·s** (peak 2.3 kN, 21 ms), and B's feet return all of it to the turf. B's own peak momentum is **18 N·s** (COM 0.24 m/s).
- **What holds him up:** active balance.
  - With B's controller frozen at impact, the same hit knocks him down; frozen with no hit, he stands.
  - A 100 ms sensing delay changes nothing.
  - It is not body, joint, motor, friction or collider resistance.
- **The user's decision:** do **not** make the baseline fall; preserve the continuum.

**Physical response spectrum** (D6X matrix, 24 runs, one variable at a time, deterministic ×3; `sandbox/visual/physchar/pc_d6x.js`, `tools/d6x_run.js`):
- **minor contact, absorbed:** slider arrives at 1.3 m/s;
- **local disturbance:** 2.6 m/s; ±30° diagonals; B boot μ 0.5; boot-sized colliders;
- **whole-body disturbance, recovered in place:** the D6 baseline (3.4 m/s); 4.0 m/s; upper shin; 20 % / 70 % load; 22 / 44 cm stance; 100 ms delay;
- **corrective step:** a knee-height hit (0.50 m). The struck leg steps, partly onto the slider's shin;
- **support lost / fall:** arrival ≥ 4.8 m/s (the foot is carried away with the slider); a thigh-height hit (0.63 m); **80 % of the weight on the struck foot** (the sweep takes the base from under the COM); B's controller frozen at impact.

**Friction-sensing bug, found and fixed** (`pc_sense.js`, general, approved by the user):
- **Bug:** the foot friction observer took a foot being pushed by another body as a turf-friction measurement. The slider's push and the turf friction cancelled in the foot's force balance, so B "measured" μ **0.037** on 0.9 turf. He kept it as the running minimum, and his friction-limited capture radius collapsed to 3–50 mm.
- **Fix:** `muValid` is false while any non-turf body touches that foot, and for 50 ms after (`SENSE.extSettle`).
- **Regression:** A/B/C1/C2 (V1 + V1.1) and C3 are identical. In Gate D only D6_slide changes (3128e37b → e0ed5a7): still upright, still arrested on the touch step, deepest 2.8 mm.
- **Matrix effect:** the "step at 70 % load" found before the fix was an artefact of this bug.

**Four unresolved observations** (documented, not changed; the user's decision):
1. **Permanent C3 step refusal:** after one "no reachable foothold", C3 never re-plans in that run, even once the transient that caused it has passed (in D6: far foot airborne, struck foot slipping).
2. **C1 premature release window:** C1 releases posture after 62 ms of STEP_NEEDED even when the only cause is a far foot that its own feet-in-place rule is already putting down. Balance re-engages 0.1–0.2 s later (`D6X_load20`, `D6X_inflate`). In the D6 baseline the foot landed 12 ms before the release.
3. **Arrival-speed sensitivity:** the slider decelerates at ≈ 1.1 g on the turf and meets B at 3.4 m/s (reference ≈ 4.3 m/s). 4.0 m/s → recovered with the far foot up 320 ms; 4.8 m/s → fall. D6 and the Reference Tackle are unchanged.
4. **Shin-contact bistability:** at ≈ 0.25 m the slider's boot glances either down (local) or up the tapered shin collider (it lifts the leg → fall), depending on last-bit differences.

**Baselines, regression, verification:**
- `sandbox/visual/physchar/results/v1_1/gated_V1.1.json`: the **pre-fix** Gate D baseline, kept unchanged as history.
- `sandbox/visual/physchar/results/v1_1/gated_V1.1_post_mu_fix.json`: the **post-fix** Gate D baseline (×3). It is the default Gate D reference of `tools/review/regress.sh` (override with `D_REF=…`) and of the harness.
- The regression after the fix: all 10 suites identical (`d6_diagnostic/analysis/regress_post_mu_fix.txt`).
- Browser = Node **deferred** (puppeteer-core not installed); Node ×3 is the checkpoint evidence.

**Review:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=D&test=D6_slide` (the D6 diagnostic panel, representative-case buttons, the matrix).

**Next:** the locomotion decision and the four observations above. **Locomotion has not started.**
- `LOCOMOTION_PROPOSAL.md` is superseded by **`LOCOMOTION_ARCHITECTURE_FINAL.md` / `.html`**, which reconciles it with Astra's independent review.
- The first gate proposed for approval is **G1a (architecture skeleton with regression parity)**, in that document's §15.

**G1a (2026-09-30, after the architecture was approved): BUILT and validated, uncommitted, awaiting the user's visual review. G2 has not started.**
- **Report:** `g1a/G1A_REPORT.md` / `.html`. **Evidence:** `g1a/json/g1a_results.json`, from `node tools/g1a_run.js --out …` (61 s, ×3).
- **Review:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G1&test=S4_steps10`.
- **Results:** 18 criteria PASS; S10 (480 Hz, boundary cases) and perf (controller 0.13–0.76 ms vs the 0.4 ms budget; the approved C2 is already 0.47–0.70 ms) FAIL.
- **Regression:** all approved suites hash-identical (regress.sh). Browser = Node verified for S4 with the already-installed Chrome (headless, no Puppeteer).

**G1b (2026-09-30; you approved G1a's architecture): closure done, awaiting review. G2 has not started.**
- **Report:** `g1b/G1B_REPORT.md` / `.html`, plus `g1b/sheets/`, `g1b/json/`, `g1b/probes/`.
- **Review:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G1&review=steps` (eight review cases).
- **Verdict:**
  - G1 is ready to promote.
  - G2 can begin, with yaw / angular-momentum regulation (and arm counter-swing) as its first item.
  - Human-likeness is currently robotic and needs its own G2 track.

**G1 PROMOTED (2026-09-30, your approval after the G1/G1b visual review).**
- **Baseline:** `sandbox/visual/physchar/results/v1_1/g1_V1.1.json` (26 scenarios ×3). `tools/review/regress.sh` now also checks G1.
- **Accepted as an honest current boundary:** the 30 N·s mid-swing fall (no rhythmic → corrective escalation yet). It is not to be artificially rescued.
- **G2 is approved to begin:**
  - G2a first: yaw / angular-momentum regulation + a human in-place gait;
  - then stop for your review.
- **Checkpoint:** local commit `772d0bd`. Nothing pushed.

**G2a (2026-10-01): built and validated, awaiting your visual review. Uncommitted, on top of `772d0bd`. G2b has not started.**
- **Report:** `g2a/G2A_REPORT.md` / `.html`. **Evidence:** `g2a/json/g2a_results.json`, from `node tools/g2a_run.js --repeat 3` (12 s). **Sheets:** `g2a/sheets/` (local).
- **Review:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2`, with seven review cases in the side panel.
- **Baseline:** `results/v1_1/g2a_V1.1.json`. `regress.sh` checks it after G1; all suites identical, G1 26/26.
- **Physics:** all eight criteria PASS.
  - Yaw within 5° of the intended heading in place; a 30° intended turn is followed.
  - Ledger ≤ 0.041 N·s, no root force; deterministic ×3; browser = Node.
- **Looks:** a careful march.
  - Knee lift, forefoot → heel, contralateral arm swing, steady thorax.
  - But long double support (≈ 45 %) and no heel rise before toe-off. Both are deferred to G2b with reasons (report §7).
- **Proposed sub-gates:** G2b forward walk · G2c start/stop · G2d speed + turning · G2e qualification.

**G2a APPROVED by the user (2026-10-01), committed `6f1ef85`. G2b (overnight + morning runway, 2026-10-01): forward walking NOT achieved.**
- **Result.** The best configurations land 5–7 steps, then fall. G2c / G2d / G2e not started (not earned).
- **Trail.** Every mechanism, attempt and number is in `g2_walk/NIGHT_LOG.md` §3–4.
- **Checkpoints.** Local WIP commits `dbc1ddb` and its follow-up. All walking code is opt-in (`rhythm.walk` / `human.walk`). All prior gates are bit-identical.
- **General findings** (support layer / body), not tuning:
  - the stance ankle's sideways CoP authority is ≈ 1 cm in late stance (approved shared budget);
  - the weight-split solver assumed sole-edge CoPs the ankles cannot realise (fixed opt-in with a ± 2.5 cm ankle band);
  - a trailing leg posed from the desired pelvis regulates body height and stays loaded;
  - the step-to-step sideways sensitivity is ≈ 6.5–12×.
- **Open problems.**
  - Pelvis yaw ±20–30° at every touchdown: hard landings ≈ 2 BW, braking off-centre.
  - Step-length oscillation.
- **Next.** The next step is the user's decision (options in the log and in memory `physical-character-g2b`).

**G2b Option 1 (2026-10-01 midday, the user chose: fix landing + forward placement):**
- **Touchdown fixed into the human range.** Contact velocity forward −0.07, vertical −0.4 m/s; peak force 1.6 kN → ≈ 0.58 kN.
- **Walk still not stable.** Fall-aware count: 2–5 upright steps over 6 starts.
- **Diagnostics.** Zero delay and independent torque limits do not help → the stepping controller is the gate.
- **Corrections.** The overnight "20/20" and "5–7 step" counts included steps taken after a fall.
- **Commit:** `77966eb` (local).
- **Report:** `g2_walk/G2B_OPTION1_REVIEW.md`.

**G2 plant characterisation (2026-10-01 afternoon, the user chose the controller-redesign path): measurement + design only, STOPPED for review before building the new walker.**
- **What.** Open-loop commanded steps from a deterministic start (`rhythm.walk.char`, `pushChar`; fixed minimal inner loop) → the measured step-to-step map, stability bands, yaw by segment, human-compatible region, controller families, proposed architecture, pass tests P1–P9.
- **Key numbers.** Sideways amplification −10 to −12 per step (sign-flipping); stable sideways placement gain band only [6.2, 7.5] at T 0.45 s ([3.2, 4.6] at 0.40 s); per-axis laws stable in ≈ 1 % of the gain plane (coupling); double support 0.22–0.38 s (not 0.15); yaw injected mainly in double support; arms cancel ≈ 40 %.
- **Report:** `g2_char/G2_PLANT_REPORT.md` (+ `fig/`, `json/`, `analyse_char.py`). Reproduce: `node tools/g2char_run.js --phase all --inner natural`.
- **Interactive:** `index.html?suite=G2` → buttons C1–C8 (cases `G2C_*` reproduce the sweep runs exactly; every step after the measured one is uncorrected, so most cases fall ≈ 1 s later — expected).
- **Regression:** A/B/C1/C2 (V1, V1.1), C3 29/29, D 7/7, G1 26/26, G2a 10/10 identical; G2b Option-1 cases hash-identical to `34de412`.
- **Next: the user's decisions** (report §9): approve inner-loop-first + controller A (SIMBICON-style B as the baseline), cadence ≈ 105–115 steps/min, nominal width ≈ 0.20–0.22 m. **Do not build the new walker before that.**

**G2b walker (2026-10-01 night, approved plan: inner loop first → Controller A, SIMBICON-style B baseline): STOPPED for review — G2b NOT achieved.**
- **Result:** Controller A 9–13 upright steps from every one of six starts (mean 11.2); Controller B 5–7; old G2b 2–3.
- **Closed-loop step-to-step map:** sideways stable (−0.44), forward unstable (+1.25).
- **The forward window is bounded** by C8 swing failures above ≈ 0.30 m steps (trailing leg straight, rigid boot pivoting on its tip) and by stalls below.
- **Diagnostic (not adopted):** a human-sized foot collider cuts swing failures 50 % → 18 %.
- **Yaw not solved:** WBAM about 4× human.
- **Review:** `g2_walker/G2B_WALKER_REVIEW.md` (plain English + technical, decisions); trail in `g2_walker/WALKER_LOG.md`; harness `?suite=G2` buttons W1–W6.
- **Code:** `pc_walker.js`, `pc_walker_models.js`, `tools/g2walk_ident.js`, `tools/g2walk_eval.js`, TESTS_G2W.
- **Next: the user's decisions** — the foot (collider / toe segment / neither), the walking pelvis height, Controller A as the path.

**Foot-architecture gate (2026-10-01 evening; the user's decisions: Controller A stays the path, B = baseline, no Option C, pelvis height unchanged): STOPPED for review — nothing promoted.**
- **Compared** F0 (current boot) · F1 (rigid human-sized outline) · F2 (passive articulated MTP on the boot outline) · F2h (same on the human outline), as opt-in `footModel` bodies (mass / COM / inertia preserved, passive MTP, no propulsion).
- **Result:** at MATCHED states (identification transitions conditioned on previous step length × speed, failures kept) no alternative foot continues walking more often than F0. Maximum viable step at 0.55–0.75 m/s: F0 0.42 · F1 0.39 · F2 0.32 · F2h 0.38 m. Walks (own maps): F0 9.5–11.2 · F1 5.0 · F2 5.0 · F2h 6.2.
- **F2:** the stance mechanism works (heel rise, MTP rollover, lower ankle torque); the swing does not — the steep toe-off pitch plus 12.6 cm of boot toe hang under the rigid-boot swing generator → 94–99 % swing failure after ≥ 0.32 m steps.
- **F1:** the swing gain is collision geometry; it loses stance authority (CoP range, width) → no continuation gain.
- **Correction:** the G2b review's "the window is mostly the body / 74 % → 14 %" was on inner loop v7; not supported on v8 at matched states.
- **Recommendation:** keep F0; neither A nor B as a body change now; next = forward-speed regulation + swing execution, foot-agnostic; re-run this gate (F2h vs F0) before running/sprinting. MTP end stop would need an absolute stiffness if B is revisited.
- **Review:** `foot_gate/FOOT_GATE_REVIEW.md`; side-by-side page `foot_gate/viewer/index.html`; harness `?suite=G2` tests `FG_same_*` / `FG_own_*`.
- **Next: the user's decisions** (review "The decisions I need from you"). **Do not promote F1/F2, do not start G2c–e / running / Reference Tackle.**

**G2b speed regulation + swing execution (2026-10-01 late; the user approved the foot gate: keep F0, F2h opt-in, foot-agnostic logic, yaw separate): STOPPED for review — the walk is NOT materially longer; committed `c7fd98b` (local).**
- **Causal account:**
  - Controller A's target x* (its map fixed point, 0.067) is a ≈ 0.63 m/s state through the measured x_S ≈ −0.147 + 0.341·v.
  - In-swing lengthening (+7.8 cm) and the swing overshoot (+7 cm, its plan running 50 ms behind real time) give 0.28–0.34 m steps.
  - The trailing leg is at 98–100 % extension at every swing start.
  - Terminal falls are time-infeasible swings (`g2_speed/analysis/classify.py`).
- **Built (opt-in):**
  - `walk.dcmRef`: capture-point tracking in single and double support toward the desired speed's measured capture point; the double-support part now runs before the `latDS "lipm"` return.
  - `walk.vReg`, `ctrl.ankle2`, `ctrl.reach`, `ctrl.inSwingT`, `walk.swingLead`.
  - The generic swing `pc_swing.js` (`swingGen "v2"`, not adopted).
  - Per-step diagnostics `tools/g2walk_diag.js`; the `iterate.py` identify → fit → evaluate loop.
- **Result:**
  - Speed is held at 0.45 ± 0.08 m/s (target 0.45–0.5) vs 0.65 ± 0.25 and creeping.
  - Survival is 10.2 (7–15) at best vs the baseline 11.2 (9–13).
  - The closed-loop speed gain is ≈ 1.6, still unstable.
- **Review:** `g2_speed/G2_SPEED_SWING_REVIEW.md`; side-by-side page `g2_speed/viewer/index.html` (speed trace, terminal failure, swing on identical requests); every experiment in `g2_speed/SPEED_LOG.md`.
- **Verified:** `regress.sh` 12/12; G2W_A8 hashes; F0 / F2h foot-gate slow protocol 42/42 each. The identification JSONs (361 MB) are local only.
- **Next: the user's decisions:** adopt ground-reaction speed regulation; replace x* with a speed-derived target; operating speed 0.45–0.5 first; swing reliability. F2h rerun (F) pending a stable F0 walk. **No G2c–e / running.**

## Where

- **Worktree:** `/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1`
- **Branch:** `prototype/physical-character-v1`, with no upstream, local commits only. It branches from `touchline-current` at `4baf37b`.
- **The user's original working tree** (`/Users/zainrahman/Downloads/FC Simulator`) was never touched by this work.
- **Non-Git preserved artifacts:** `/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-09-30_physical_character_overnight/`, containing:
  - the untracked review media (stills and sheets);
  - a git bundle of the whole branch;
  - a README with sha256s.
- **Earlier snapshots** (verified intact before the reboot, 90/90 recorded file checksums):
  - `_preserved_2026-09-29_physical_character_gate_a`, `…gate_b`, `…gate_c1`;
  - `_preserved_2026-09-30_physical_character_gate_c2`, `…v1_1`.

## Architecture (unchanged, and approved in principle by the user)

The pipeline is:

intent → sensing / support reasoning (`pc_sense`) → physically achievable targets (`pc_support` C2 · `pc_step` C3 · reference keys D6) → finite motors (`pc_balance`: capture-point CoP law, hip strategy, C4 arms, C5 protective; torque-limited, budgeted) → Jolt articulated rigid bodies + contacts (`pc_jolt`, 14 bodies per character) → solved state → rendered skeleton (`pc_fit`).

- The Jolt body is the only spatial state.
- **Never:** kinematic override, root dragging, teleports, infinite motors, canned reactions, or animation deciding outcomes.
- Physics never decides football outcomes.
- Deterministic: ×3, and browser = Node.
- Code lives in `sandbox/visual/physchar/`.

## Gate status

| gate | status | notes |
|---|---|---|
| A (passive), B (motors), C1 (balance), C2 (transfer / placement) | **APPROVED** by the user (on V1) | V1 reproduces with `--calib V1`; hashes identical after all overnight work |
| V1.1 anatomy / ROM + C2 integration | **PROMOTED** working foundation (`WORKING_CALIB = "V1.1"`, pc_body.js) | `v1_1/PROMOTION.md` |
| C3 corrective stepping (one step) | **PARTIAL**, awaiting review | forward ≤ 100 N·s, backward ≤ 50 N·s caught; lateral is a body limit |
| C4 reactive arms | **PARTIAL, off by default** (`ctrlExtra.reactiveArms`) | small effect; C_proj_F115 regresses |
| C5 protective falls | **PARTIAL, off by default** (`ctrlExtra.protective`) | forward/backward: hands first, head impact 0.12–0.30 m/s; lateral mixed; the brace fades at rest |
| Gate D (two characters, one world) | **PASS with limitations**, awaiting review | contact invariant shown (both Δv on the contact step); first touch ≤ 1.8 mm; D0 isolation bit-identical |
| D6 physical slide tackle | **PARTIAL** | slider tracks the reference joint keys (ROM-clamped) from a t = 0 initial condition; the standing B holds — **diagnosed 2026-09-30: physically justified (see the update above); friction-sensing fix approved** |
| Reference Tackle | **NOT STARTED, blocked** | needs a running attacker, i.e. locomotion |

**Experiment options, all default off:**
- C3: `step.maxSteps`, `step.nStep`, `step.h0`, `step.heelUp`;
- sensor: `externalSupport`;
- Gate D experiment hooks: `opts.world`, `opts.coll`, `ctrlExtraA`.

## Known limitations

**C3**
- Lateral pushes ≥ 55 N·s need a crossover that requires a 5.1–6.3 m/s foot (cap 4.5); the boot-sized collider was ruled out.
- The "second step needed" failures are early touchdowns: hip saturation on backward swings, toe drag on late forward ones. They are not policy failures. Swing options and step sequences rescue 0/8.

**C4**
- No in-place boundary moves; −43 % to +18 % recovery times; one marginal step regresses.

**C5**
- Lateral head impact is mixed.
- D_late head impact is worse (0.77 → 1.2).
- Legs stay stiff in forward falls; the sit-down roll lifts the legs high.

**Gate D**
- Rendered meshes overlap where colliders touch (colliders sit 1–3 cm inside the mesh).
- Sustained compression reaches 5–8 mm (5 mm slop, a foot trapped under a pelvis).
- Support by another body is outside the support region (option exists, no outcome change).

**D6**
- Impact penetration of 2–7 mm is set by the slider's tracking stiffness. The solver config is not the lever; a reactive yield was rejected.
- B's outcome is sensitive to arrival speed.
- The run-up is not simulated.

## Documents

| document | path |
|---|---|
| Overnight consolidated report | `review_artifacts/physical_character_v1/OVERNIGHT_2026-09-30_REPORT.md` / `.html` |
| **Locomotion proposal** (the next decision) | `review_artifacts/physical_character_v1/LOCOMOTION_PROPOSAL.md` / `.html` |
| V1.1 anatomy report / promotion | `review_artifacts/physical_character_v1/v1_1/ANATOMY_V1_1_REPORT.*`, `v1_1/PROMOTION.md` |
| Gate A–C2 reports | `review_artifacts/physical_character_v1/gate_*/GATE_*_REPORT.*` |
| Evidence JSON, analysis probes | `review_artifacts/physical_character_v1/gate_*/json`, `…/analysis` |
| Tooling (regression, capture, probes) | `sandbox/visual/physchar/tools/review/` (README inside) |

## The next unresolved decision (the user's)

**Locomotion.** The Reference Tackle attacker jogs, hurdles, and his trailing leg is caught mid-stride. The recommendation is B + C:
- Coros 2010-style walking on the existing layers;
- reference gait cycles as targets;
- an N-step footstep policy;
- swings planned within the hip's torque limits.

It would proceed through staged gates L1–L6. See `LOCOMOTION_PROPOSAL.md` §7 for the four questions. **Do not start locomotion before the user decides.**

## Resume

```sh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
git status && git log --oneline -25                      # expect a clean tree
python3 -m http.server 8171                               # then open the harness:
# http://127.0.0.1:8171/sandbox/visual/physchar/index.html   (suite / test / body selectors; C4 / C5 toggles)
# e.g. ?suite=D&test=D2_shoved_into · ?suite=D&test=D6_slide · ?suite=C3&test=B_F80 · ?suite=C&test=PF65
sandbox/visual/physchar/tools/review/regress.sh          # optional: full hash regression (~2–3 min)
```

If the worktree were ever lost, restore it from the bundle:

```sh
git clone -b prototype/physical-character-v1 "<snapshot>/physical-character-v1.bundle" restored
# then untar review_media_untracked.tgz into restored/
```

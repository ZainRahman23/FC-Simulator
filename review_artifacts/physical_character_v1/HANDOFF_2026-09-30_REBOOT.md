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

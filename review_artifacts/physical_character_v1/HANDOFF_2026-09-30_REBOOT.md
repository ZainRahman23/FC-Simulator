# Physical character: handoff after the 2026-09-30 overnight runway (pre-reboot)

The state was frozen for a Mac reboot. **No development is in progress. Nothing has been pushed.**

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
| D6 physical slide tackle | **PARTIAL** | slider tracks the reference joint keys (ROM-clamped) from a t = 0 initial condition; the standing B holds |
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

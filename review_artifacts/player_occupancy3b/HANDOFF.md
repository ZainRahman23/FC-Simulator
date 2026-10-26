# HANDOFF — PLAYER OCCUPANCY STAGE 3B.2 (recovery-step and landing geometry)

**Status:** prototype, STOPPED for the owner's visual review. Local only: not pushed, merged, frozen or published. **3B.3 (trips, multi-step stagger), falls, ground contact, get-up and the shoulder duel are not started.**

**The 3B.1 contact / momentum formulation (calibrated F+M) is frozen** for this stage (the owner, 25/26 Oct): local tag `occupancy-3b1-calibrated-fm-1` → `731813f1`. It is unchanged, and every tracked file is identical to the tag. 3B.2 is new files only.

- **Branch:** `prototype/player-occupancy-stage3b2`, cut from `731813f1` (3B.1 calibrated; its branch `prototype/player-occupancy-stage3b1` kept as is).
- **Worktree:** `~/Downloads/FC Simulator worktrees/player-occupancy-3b2`.
- **Lab:** `python3 -m http.server 8367 --bind 127.0.0.1` from the worktree root → http://127.0.0.1:8367/sandbox/visual/occupy3b2_lab.html (LOCAL ONLY: real players' models). It shows 3B.1 | 3B.2; OLD STAGE 3 and 3B.2 · FLAT RELEASE are selectable.
- **Report:** `L32_REPORT.md`. **Owner instruction (verbatim):** `sources/2026-10-26_user_instruction_stage3b2.md`.
- **Evidence:** `evidence3b2/` (the 3B.1 evidence in `evidence/` is unchanged).
- **Verdict (L32_REPORT.md, answer 11): not yet the 3B.3 foundation.** The layer is right, but three of its own behaviours come first:
  1. the in-flight retiming, which can keep a landing in the air while the bodies close (moves `BODY_FEINT 2.4/−0.5`, 22.7 cm);
  2. the release pop;
  3. 3B.1's reconcile drive.
- **Proposed next step: 3B.2.1**, after the owner's decisions (report §9).

## Where things are (3B.2)

| file | what |
|---|---|
| `sandbox/visual/occupy3b2/b2_world.js` | `PlacementWorld` (a `LimbWorld` subclass): the prediction, the landing-feasibility model, the corridor and its route, recovery placement (both feet), NO_FEASIBLE_RECOVERY with its preserved state, the in-flight monitor, the guarded landings (reported), committed landings blocked → Stage 3's interruption, released plants, the pelvis within reach, boot ↔ boot, the plan fork. `RES3B2` holds every switch; the comparisons are off |
| `sandbox/visual/occupy3b2/b2_geom.js` | the predicted landing leg (the knee by two-bone IK), its volumes (Stage 1's + the boot's sole), the corridor |
| `sandbox/visual/occupy3b2/b2_run.js` | `runB2`: S2D · S3 · S3B (through Stage 3's runner) · S3B2; the rotated encounter |
| `sandbox/visual/occupy3b2/b2_cases.js`, `b2_lab.js`, `../occupy3b2_lab.html` | the Lab (the 3B.1 Lab copied + 3B.2's overlays) |
| `sandbox/visual/occupy3b2/tools/` | `b2_metrics` (four stages), `b2_land` (touchdowns; planted drift split DURING the stance / the LIFT-OFF jump), `b2_cross` (§6 classified), `b2_boots` (§5), `b2_identity` (§9), `b2_invar` (determinism, mirrors, rotation, the ledger), `b2_solo` (one footballer), `b2_swings` (in-air leg shortfall, feet skimming the turf; after a released plant vs the rest), `b2_perf`, `b2_lab_cases` + `b2_browser.cjs`, `b2_ablate` / `b2_percase*` (the comparisons), `b2_diag` / `b2_trace` / `b2_pairs` / `b2_feet` / `b2_why*` (diagnosis), `b2_measure` (Stage 3's measure(), runner swapped) |

**The default is `e9d0524f`'s.** One known defect of it was found in the final evidence and is NOT fixed: a plant released mid-stance pops the drawn ball of the foot 5–8 cm in one tick (the canonical heel rise spans the last 55 % of a stance).
- **The measured alternative** is `RES3B2.releaseFlat` (a released plant lifts flat), the Lab's **3B.2 · FLAT RELEASE**. It removes the pop (114 cases: lift-off jumps > 5 cm 17 → 2), but it is worse on balance: legs > 5 cm 290 → 313, fall candidates 16 → 18, erroneous crossings 942 → 968 (`croq-recover` ±m: a leg pushed 20 cm across for 17 ticks).
- **Its evidence:** `evidence3b2/variant_flat_release/`.
- **The decision is the owner's** (L32_REPORT.md §12).

## Running the 3B.2 tools

- They run from `sandbox/visual/occupy3b2/tools/` with `node <tool>.mjs --set review|matrix|l3|moves|search`.
- `--cfg '<json>'` (or `globalThis.__b2opts`) sets `RES3B2` overrides for a comparison.
- The browser check: `PUPPETEER_NODE_MODULES=<dir> PT_TMP=<dir> node b2_browser.cjs --out <dir> --shots <scratch> --node <evidence3b2/lab_cases.json>`.
- **Stills stay in the scratchpad (real players' models).**

---

# HANDOFF — PLAYER OCCUPANCY STAGE 3B.0 + 3B.1 (limb contact)

**Status:** prototype, STOPPED for the owner's visual review. Local only: not pushed, merged, frozen or published. **Stage 3B.2 is not started** (the owner's rule: only after they visually approve 3B.1).

- **Branch:** `prototype/player-occupancy-stage3b1`, cut from `88a964ba` (Player Occupancy Stage 3, kept intact as the comparison baseline on `prototype/player-occupancy-stage3`).
- **Worktree:** `~/Downloads/FC Simulator worktrees/player-occupancy-3b`.
- **Lab:** `python3 -m http.server 8366 --bind 127.0.0.1` from the worktree root → http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html (LOCAL ONLY: real players' models).
- **Report:** `L3_REPORT.md`. **Owner instruction (verbatim):** `sources/2026-10-25_user_instruction_stage3b0_3b1.md`. **Astra audit summary:** `sources/2026-10-25_astra_v2_audit_summary.md`.

## The calibration (owner, 25 Oct ≈ 20:00)

- **Report:** `L3_CALIBRATION_REPORT.md`. **Instruction (verbatim):** `sources/2026-10-25_user_instruction_stage3b1_calibration.md`.
- **The default formulation is now F+M:** `RES3B.vsrc = "F"`, `RES3B.artMass = true`. It counts only what a state can lose (the root's translation, the limb's articulation about its hip), with the articulated effective mass.
- **Every candidate stays selectable:** `l3: { vsrc: "A" | "B" | "C" | "D" | "E" | "F", artMass }`. "A" with `artMass: false` is 3B.1 as first built. `occupy3b/l3_forms.js` holds `FORMS`.
- **The Lab** shows any two of OLD and the formulations side by side (the left / right selects), plus the VELOCITY PARTS overlay (`p`), the per-application decomposition in the frame data and the accounting panel, and the CALIBRATION SPECTRUM group (mirrors, the world turned 37°).
- **Tools:**
  - `l3_calib.mjs` (the spectrum × the formulations, the first contacts);
  - `l3_rig.mjs` (the canonical rig: the push response, the authored speeds alone);
  - `l3_tanworld.mjs` (the tangential test in the world);
  - `l3_unit.mjs` (now both mass models and the tangential test);
  - `l3_flagship.mjs` (OLD · A · calibrated, with the velocity parts);
  - `occupy3b/l3_rot.js` (an encounter with the world turned).
- **Evidence:** `evidence/` (the calibrated runs), `evidence/calibration/` (spectrum, rig, tangential). The pre-calibration evidence is at commit `469a080f`.

## Where things are

| file | what |
|---|---|
| `sandbox/visual/occupy3b/l3_forms.js` | the calibration's formulations, the spectrum, the Lab's rows |
| `sandbox/visual/occupy3b/l3_rot.js` | an encounter with the world turned (the rotation test) |
| `sandbox/visual/occupy3b/l3_limb.js` | the pure limb mechanics, no world: the perturbation (hip ab/adduction, flexion, knee swivel), its inertia, the contact solve (bound, yield, range, held, placeholder), the reconcile drive, the projection (bounded at every leg joint), the turf / hip-range guard. `RES3B` holds every constant |
| `sandbox/visual/occupy3b/l3_body.js` | `LimbBody`: the canonical forward kinematics with the perturbation applied (thigh / shin rotated about the hip, the foot translated with the ankle); records `legAuth`, `limbQ` |
| `sandbox/visual/occupy3b/l3_world.js` | `LimbWorld` (extends Stage 3's `ImpactWorld`): Stage 2 → **the limb pass** → Stage 3's impact pass → **the ledger**. The face rule, which side is LIMB / BODY, held pairs, landing priority, touch / tackle-boot denial for geometry, the 3B.2 / 3B.3 / 3B.4 input events, the placeholder rule |
| `sandbox/visual/occupy3b/l3_cases.js` | the §10 matrix: Stage 3's 52 + 31 extra rows + mirrors = 114; `FLAGSHIP = "side"` |
| `sandbox/visual/occupy3b/l3_lab.js`, `sandbox/visual/occupy3b_lab.html` | the OLD \| 3B Lab |
| `sandbox/visual/occupy3/o3_world.js`, `o3_run.js` | Stage 3's hooks (flag-free; OLD bit-identical) and the `"S3B"` mode |

## The tools (`sandbox/visual/occupy3b/tools/`; run from that folder)

| tool | evidence |
|---|---|
| `l3_identity.mjs --set review\|matrix\|moves\|search\|l3 --json f` | before the first genuine contact: 3B ≡ Stage 2 (as decided) and ≡ OLD Stage 3, every tick → `identity_*` |
| `l3_metrics.mjs --set … --json f` | penetration by class, ticks > 5 cm, slides, jolts, jumps, crossed legs, turf, joint speeds, ROM; 3B's own record → `metrics_*` |
| `l3_ball.mjs --set … --json f` | the ball / possession firewall → `ball_*` |
| `l3_flagship.mjs --id side --json f` | OLD vs 3B accounting of the audit's failure → `flagship.*` |
| `l3_nolead.mjs --json f` | the equal-speed family and its mirrors → `nolead.*` |
| `l3_unit.mjs --n 2000` | the limb layer's invariants (energy, bound, pairing, rotation, mirror, determinism, the drawing) → `unit_invariants.txt` |
| `l3_solo.mjs` | one footballer (105 canonical cases) ≡ Stage 2 → `solo.txt` |
| `l3_nearmiss.mjs --json f` | Stage 2's near-miss sweep → `nearmiss.*` |
| `l3_continuity.mjs --set … --json f` | 60 Hz continuity around each transition, OLD and 3B → `continuity_*` |
| `l3_torture.mjs --json f` | Stage 3's torture, Stage 2 · OLD · 3B (3B twice) → `torture.*` |
| `l3_perf.mjs --reps 3` | cost per tick / frame / second; the limb pass IDLE · NEAR · ACTIVE → `performance.txt` |
| `node --import ./two/l3_two_hook.mjs ../../possess1/tools/p_torture.mjs` (and `../../occupy2/tools/s2/o2s_early.mjs`) | possess1's own two-player tools with Stage 3B on → `two_player_*.txt` |
| `node --import ./two/l3_two_hook.mjs l3_early.mjs` | o2s_early with one more classification: a decision that differs after Stage 3 / 3B physics acted on the attacker in the perception window → `two_player_early_info_3b.txt` |
| `l3_lab_cases.mjs --out f` + `l3_browser.cjs` | the Lab in Chrome ≡ node → `lab_cases.json`, `browser.*` (screenshots to the scratchpad only) |
| `l3_smoke.mjs [ids] [--set …] [--events]` | a quick per-case look (diagnosis) |

Also: `review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` (PASS) before every commit.

**Known (not 3B's): Stage 3's committed-player runaway** (`evidence/stage3_runaway.txt`). A committed defender whose capture point runs away gets no step and no fall candidate, and his *u* diverges. Fix it in Stage 3 or 3B.3 when the owner decides.

## Next (only after the owner's visual approval of 3B.1)

**Stage 3B.2 (recovery-foot placement)**, using the inputs 3B.1 reports:
- `LANDING OBSTRUCTED`;
- `LANDING SNAP`;
- `RECOVERY STEP LANDS IN THE OPPONENT`;
- the crossed-legs counts.

**Then 3B.3** (`LIMB HELD`, `BODY OUTRAN A HELD FOOT`, `LIMB AT ITS RANGE`: trips, staggers) and **3B.4** (`CONTACT DURING A FALL PLACEHOLDER`, the fall candidates: falls, ground, get-up).

The shoulder duel stays its own later system.

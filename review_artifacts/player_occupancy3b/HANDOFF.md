# HANDOFF — PLAYER OCCUPANCY STAGE 3B.0 + 3B.1 (limb contact)

**Status:** prototype, STOPPED for the owner's visual review. Local only: not pushed, merged, frozen or published. **Stage 3B.2 is not started** (the owner's rule: only after he visually approves 3B.1).

- **Branch:** `prototype/player-occupancy-stage3b1`, cut from `88a964ba` (Player Occupancy Stage 3, kept intact as the comparison baseline on `prototype/player-occupancy-stage3`).
- **Worktree:** `~/Downloads/FC Simulator worktrees/player-occupancy-3b`.
- **Lab:** `python3 -m http.server 8366 --bind 127.0.0.1` from the worktree root → http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html (LOCAL ONLY: real players' models).
- **Report:** `L3_REPORT.md`. **Owner instruction (verbatim):** `sources/2026-10-25_user_instruction_stage3b0_3b1.md`. **Astra audit summary:** `sources/2026-10-25_astra_v2_audit_summary.md`.

## Where things are

| file | what |
|---|---|
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

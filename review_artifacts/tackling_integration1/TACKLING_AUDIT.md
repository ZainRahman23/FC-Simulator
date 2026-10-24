# TACKLING INTEGRATION V1 — audit (24 Oct 2026)

Stages 0–3 of the owner's instruction (`sources/2026-10-24_user_instruction_tackling_integration_v1.md`): protecting the current work, the tackling lineage, the current baseline, and the choice of foundation. Read-only audit; nothing below was modified.

## 0. Protection — the verified base

Checked 24 Oct ≈ 06:20 EEST after `git fetch fc-simulator`. Remote and local refs agree.

| what | ref | SHA |
|---|---|---|
| Authoritative repository | `fc-simulator` = github.com/ZainRahman23/FC-Simulator | — |
| Current published gameplay milestone (Body Feint + Croqueta integration) | `milestone/feint-croqueta-vocab-v1` = tag `checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24` | `f775daac` |
| Pre-integration manifest | tag `checkpoint/touchline-feint-croqueta-approved-2026-10-23` | `9140be54` |
| Gameplay development source of truth | `milestone/touchline-gameplay-dev` = `integration/touchline-gameplay-1` = tag `checkpoint/touchline-gameplay-dev-2026-10-23` | `dea3abdb` |
| `prototype/dribble-1` | the milestone + the owner's publication instruction | `dac51ccc` |
| Left-stick research | `prototype/left-stick-intent-v1` (worktree `left-stick-intent-v1`), pushed in today's daily publication | `6ccd9f9a` |
| `main` | untouched | `ff3a89fe` |

**Clean / dirty:**
- Clean: the `dribble-1`, `left-stick-intent-v1` and `env-integration` (`touchline-current`) worktrees, and the Codex tackle worktree.
- Dirty: the main checkout `~/Downloads/FC Simulator` (`prototype/3d-animation-pipeline`, `f5f60769`) has 95 uncommitted entries from another session. None has a tackle path. Not touched.

**Recovery checkpoint:** the milestone is already tagged and pushed (`f775daac`), so no new tag was needed.

**The tackling branch:**
- `prototype/tackling-integration-v1`, cut from `f775daac`.
- Worktree `~/Downloads/FC Simulator worktrees/tackling-integration-v1`, a sparse checkout like the milestone's (`/review_artifacts/tackling_integration1/` added).
- No development happens on the left-stick branch, `main` or `dribble-1`.

**The daily publication rule ran first** (the first session after 06:00 EEST on 24 Oct):
- chronicle 23 Oct = `e6e34a84` on `touchline-current`;
- `prototype/left-stick-intent-v1` pushed;
- both verified with ls-remote.

## 1. The tackling lineage

The main audit sources are git (every SHA checked), `docs/TOUCHLINE_DEVELOPMENT_CHRONICLE.md`, and the Codex workspaces' reports. No owner verdicts were invented; where the only record of approval is a report's own wording, it is marked as such.

### A. The match harness (sprite / anim3d squad playtest, `?ofPlay=1`)

| version | commit | implemented | visually reviewed | mechanically tested | known problems | superseded by |
|---|---|---|---|---|---|---|
| Python simulator challenge | pre-repository | Statistical tackle: a proximity gate, an attempt draw and a quality scalar; no body | n/a | n/a | No contact geometry | Its outcome law was ported into Defending V1 |
| **Defending V1** | `57c65396` (26 Sep) | Jockey, standing tackle, slide tackle, 0.32 m discs. The **standing tackle** is a 0.20 s wind-up, a lunge at ≤ 1.6 m/s and a one-tick point-distance reach test (0.72 × leg). The outcome comes from a **rating quality roll** (WON / POKE / BEATEN), and on WON the ball is placed rolling to the tackler's feet | No owner verdict recorded | 60 + 27 fixtures identical; on/off and determinism | No trip or fall; limbs not collided; simple AI | V1.1 (slide pose), Tackled-Player V1 |
| Defending V1.1 slide | `cdb07351`, tag `baseline/defending-v1.1-slide` | The researched slide pose (presentation only) | None recorded | Traces identical | — | Slide Contact V1.2 |
| Tackled-Player V1 | `f5f60769`, tag `baseline/tackled-player-v1` | The attacker's leg capsules, swept tackler primitives (including a standing-tackle foot), an impulse, then a capture-point balance law: CORRECTION / STUMBLE / FALL | Review page only | 60 + 27 identical; 17 reaction fixtures | No ragdoll; single contact only | V1.2 |
| Slide Contact Geometry V1.2 | `d539e7a7`, tag `baseline/slide-contact-v1.2` | Far-leg slide sweep, swept ball CCD with a physical ball response | **"Live-reviewed and accepted 2026-09-28"** (tag) | CCD 460 crossings, 0 missed; **standing tackle bit-identical to TP-V1** | Limb brushes 16 / 10.6 cm | V1.3 (side branch) |
| Rear-contact fall, Follow-through V1 / V2 | uncommitted (worktree `rear-contact-fall`) | Coulomb friction on slide contacts, back falls | Owner approved the direction; "Do not commit V2" | `gates.txt` | Rigid fall body | The physical-character pivot |
| Reference Tackle V1 | uncommitted (worktree `reference-tackle`) | Authored joint keys reproducing a reference slide clip | Owner: "Do not commit" (target data) | — | — | PCV1 D6 |
| Slide Contact V1.3 CHARCOLLIDE-1 | `5042230b` | The runner's leg capsules derived from the character's skeleton | Owner: "Keep V1.3 frozen" | 0 / 26 pass the PI-1 gate | Rigid boot | — |

### B. The physical character (Jolt humanoid; slide tackles only)

| version | commit | implemented | reviewed | tested | problems | superseded by |
|---|---|---|---|---|---|---|
| PCV1 Gate D / D6 | `11149dfb` (frozen research) | A physical slide (the Reference Tackle keys through motors) | Gates A–C2 approved; D6 partial | Contact arrested | The attacker cannot move | PCV2 |
| PVP-1A / -DX, CXA-1, TRC-1 | `9fa1f57a` … `bf84bee9` | The first player-v-player slide from behind | Pending | BLOCKED at H2 / DX-BLOCKED | Entry self-penetration | PVP-0 |
| PVP-0, SUPPORT-1 | `052b41a9`, `8aa4eba4` | C3 recipient × SLIDE-A1 | Physics PARTIAL, visual FAIL | — | Belly-flop, feet pinned | SP1 |
| SLIDE-PHYS-1 → 2 → SP2A … SP2F3 | `a4cbf503` … `39a0446b` | Muscle-driven slide, bent-leg thigh slide, follow-through, posting arm | SP2 hypothesis confirmed; SP2D direction approved; SP2F2's arm rejected; SP2F3 pending | Perturbation sets | Temporary friction F37.5; fails ≥ 5.75 m/s | PVP-1 |
| PVP-1, HYBRID-RUN-1, HAC-1 | `9d2e9512`, `6e425dd7`, `dbc8aa22` | A running recipient; an animation-intent runner that physics can interrupt | HAC-1 frozen as research | 22-scene battery | No physical runner; RUN-1 cannot turn | the Codex chain |
| Codex TACKLE-REACTION-1 → RECOVERY-V1.3 | `859ef127` … `e4d67169` (local, Codex worktree) | The tackled player's fall, impact ledger, TRIP / SLICE / IMPACT spectrum, get-up lifecycle | Reports call earlier steps "approved"; no owner text found; V1.3 awaiting review | Hash-identical 720-step runs; overlaps ≤ 11 mm | Not pushed, not integrated | — |

### C. The Codex standing-tackle line (19 – 22 Oct; [Local], no commits; `~/Documents/Codex/2026-10-19/files-pasted-by-the-user-touchline/`)

| version | date | implemented | reviewed | tested | problems | superseded by |
|---|---|---|---|---|---|---|
| Phase C | 19 Oct 03:02 | The first visual standing-tackle body study | Presented | 220 configurations, 9,020 poses | — | Phase C rev 2 |
| **Phase C revision 2** (`motion.js` + `body.js`, ~15 kB) | 19 Oct 21:30 | **STANDING_POKE / STANDING_LUNGE with continuous commitment by reach:** load, drive and reach, a toe-anchored push heel, a catch on the reaching foot, a recovery step, regain stance; lean, pelvis yaw, hip roll, arms, head. The forward sector is ±75° with an elliptical envelope of 1.28 / 1.30 m. Approach fixtures at 0 / 1.5 / 3 m/s | The STANDING-TACKLE-V1 report states **"Phase C V2 is approved and preserved"**; the owner's own text was not found | 198 cases, 12,078 poses, 11 assertions (fixed leg lengths, reachable targets, mirror, anchored toe) | "Braced approach fixtures, not production locomotion transitions"; no ball response | Integrated (unchanged, hash-pinned) by every later version |
| STANDING-TACKLE-V1 (real carrier) | 20 Oct 00:09 | TC-1.3's unchanged carrier; the defender predicts the **free** ball (not the dribbler's plan), chooses the nearest foot, and presents a 5-sphere boot to the shared ball world | Presented | 220 timing trials | Its own world, outside the gameplay build | duel v2 |
| Duel v2, V1.1 balance, V1.2 continuity, V1.3 response, V1.4 shield, V1.5 overlap | 20 – 21 Oct | TURN-1 movement, nine swept capsules per player, paired impulses, upright recovery steps, display IK fixes, ball-response repairs, shielding | Presented, provisional | 370-case matrix; ledgers; torture pages | Late tangles; 17.6 m/s ball kick (fixed in V1.3); crowded overlaps | Standing Tackle V2 |
| Shoulder duel V1, Physical Duel V2 | 21 – 22 Oct | A player-player contact solver: Strength / mass / height, leverage | Presented | Evidence JSON | — | Integrated into ST V2 |
| **Standing Tackle V2** | 22 Oct 18:24 (the newest) | Physical Duel V2 contact plus four contact families (CUSHION / NICK_ACROSS / STEP_INTO_STRIDE / BLOCK_AND_COLLECT). It **searches a planned controlled impulse inside a real boot collision**, then the defender's ordinary TC touch | Presented, "nothing frozen" | 1045 / 1045 checks; 47 encounters | Real-carrier cuts → PLAYER FIRST · NO BALL; walk / jog / run "equal" cases → no ball; **tackle contact search ≈ 1.0 s median (stalls a live request)**; overlaps up to 8.9 cm | — |

## 2. The current tackling baseline (`f775daac`, `sandbox/visual/vocab2/`)

**What the current build does when a defender tries to tackle:** there is no defender. The only opponent is the review harness's **OPPONENT POKE** (key P, `c_sim.js` `opponentStep` / `pokeProbe`). It is a kinematic sphere "foot" driven at the real ball. Its hit is resolved by the kernel collision law (the relative velocity reflected along the contact normal, restitution 0.55, a kernel launch from where the ball is). The carrier's possession leaves CONTROLLED as OPPONENT_TACKLE unless the deflection is minor (Δv < 2 m/s with a controlled continuation within 0.6 s).

| component | classification | where |
|---|---|---|
| tackle request | **MISSING** (the poke key has no lifecycle). EXISTING BUT NOT INTEGRATED: Codex ST V1–V2 (Space); HISTORICAL: Defending V1 | — |
| eligibility | **MISSING**. EXISTING BUT NOT INTEGRATED: Codex (±75°, ellipse 1.28 / 1.30 m, ball ≤ 0.24 m); HISTORICAL: Defending V1 (0.72 × leg) | — |
| approach | **MISSING** as a defender. The canonical ball-off locomotion (A99-C, the support plan, `o.ballOn === false`) is CURRENT and can carry a defender | `u_sim.js` |
| commitment | **MISSING**. EXISTING BUT NOT INTEGRATED: Phase C V2 continuous commitment | — |
| body pose | **MISSING**. EXISTING BUT NOT INTEGRATED, PROVISIONAL: Phase C V2 STANDING_POKE / LUNGE | Codex `phase-c-v2/` |
| foot contact | **MISSING** as a defender foot. CURRENT: the probe sphere | `c_sim.js:59-71` |
| ball collision | **CURRENT**: the opponent law (reflection, restitution, kernel launch) | `c_sim.js:59-71` |
| possession contest | **CURRENT** for the carrier: CONTROLLED → FREE (OPPONENT_TACKLE / INTERCEPTION / EXTERNAL_COLLISION) or retained after a minor deflection. Single-carrier: it has no notion of a second owner | `c_sim.js:136-142, 232-247` |
| miss | **MISSING** | — |
| recovery | **MISSING** for a defender. EXISTING BUT NOT INTEGRATED: Phase C catch / step / settle; Codex V1.1–V1.3 upright recovery | — |
| control return | **MISSING** for a defender. CURRENT for the carrier: re-collection by the SECURE / RECOVERY pursuit | `c_sim.js:116-169` |

## 3. The foundation chosen

**Body: Phase C revision 2.**
- It is the only standing-tackle body recorded as approved.
- It is compact and kinematic, so it can be re-expressed in the canonical plan format without a new physics world.
- Every later Codex version kept it byte-identical: its hash `2eba917e…` was checked against ST V2's `approved-motion.js`.
- Its known weakness, "braced approach fixtures, not locomotion transitions", is exactly what integration must solve. The entry has to start from the canonical gait's actual feet.

**Lifecycle principles: Codex STANDING-TACKLE-V1.**
- The defender reads the ball's actual state and predicts its free roll. It never reads the dribbler's plan, so a touch, cut, Body Feint or Croqueta after commitment can beat it.
- It picks the nearest feasible foot.
- Commitment is continuous, bounded by the forward sector and the reach envelope.
- Recovery depends on the action, not on hit or miss.

**Contact: the canonical opponent law in `vocab2/c_sim.js`, unchanged.** The defender's authoritative boot is presented to it as moving spheres every tick.

**Possession: the canonical possession model, unchanged.** The carrier's state machine classifies the tackle. A defender gains possession only through its own canonical receive (FREE → COLLECTED → CONTROLLED), never by a tackle shortcut.

**The defender's movement and body: the canonical footballer.**
- The same `ControlledSim` class with the ball off, i.e. the A99-C locomotion and the support plan.
- The same `PlayBody` draws it; the tackle is authored as a plan (root keys, stances, swing waypoints, posture channels) exactly as the vocabulary's techniques are.

**Not chosen, and why:**
- **Codex V1.1 – V2's shared physical world** (240 Hz duel solver, Physical Duel V2, its own TC-1.3 carrier). Its carrier is not the current one. It would bring a new player-player physics system into the build (the instruction forbids building one tonight). Its contact search takes ≈ 1 s. Its successful wins are planned controlled impulses rather than the kernel law.
- **Defending V1** (match harness). It is a rating quality roll with the ball placed at the winner's feet, the "tackle button = possession transfer" the instruction rules out. It also runs on a different body (sprite / disc).
- **The Jolt physical-character lines.** They are slide tackles only, and incompatible with the kinematic gameplay body.

## Not touched

- **Code and branches:** `prototype/left-stick-intent-v1`, the owner-input recordings and the Intent Recognizer research; `main`, `dribble-1` and every frozen or locked file (`tc_baseline_88573ef0*`, `agility99/movement.js`).
- **Other workspaces:** the Codex workspaces and their branches; the main checkout's uncommitted work.

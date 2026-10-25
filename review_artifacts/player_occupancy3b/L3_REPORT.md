# TOUCHLINE — PLAYER OCCUPANCY STAGE 3B.0 + 3B.1: LIMB CONTACT

**Status: prototype, STOPPED for the owner's visual review.** It is local only: not pushed, merged, frozen or published. Stage 3B.2 has not been started.

- **Branch:** `prototype/player-occupancy-stage3b1`, cut from `88a964ba` (Player Occupancy Stage 3). The Stage 3 branch is untouched and remains the comparison baseline.
- **Lab:** http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html (local only: real players' models).
- **Sources:**
  - the owner's instruction, verbatim: `sources/2026-10-25_user_instruction_stage3b0_3b1.md`;
  - the Astra V2 audit: `sources/2026-10-25_astra_v2_audit_summary.md`.
- **Protected and unchanged:**
  - Stage 1 volumes, Stage 2 rules, BallAuthority, Reaction MEDIUM 0.200 s;
  - Standing Tackle V1 / POKE, Body Feint, Croqueta LEG-WAVE V4;
  - locomotion, shooting (FINESSE / POWER / NORMAL, Trajectory V1), left-stick research, canonical ball physics;
  - `tc_baseline_88573ef0*` (lock check PASS), `agility99/movement.js`, Astra's folders.
- **Canonical files changed since Stage 3: 0.** Outside the new files, only Stage 3's own `o3_world.js` / `o3_run.js` gained inert hooks; OLD Stage 3 is bit-identical (§0).

## IN SHORT

**The failure the audit found is gone.**
- Stage 3's animated-speed limb strike is replaced, not supplemented: OLD-style strikes left in 3B are **0** in every run.
- A limb contact now passes on exactly the momentum the limb lost: on a stable normal, bounded by its closing, paired, energy-non-increasing.
- **Flagship** (equal-speed jog, thigh brush):

  | | OLD | 3B |
  |---|---|---|
  | impulse | **13.08 N·s**, from the animation's knee speed | what the limbs lost |
  | normal | tilted 27° forward | the stable side-on normal |
  | along the pair's mean heading | — (a +4.42 N·s forward wedge on the carrier) | **0.0000 N·s** |
  | lead | **14.1 cm** (16.6 on the pair's mean axis) | **2.0 cm** on the mean axis |
  | the limb afterwards | kept its speed | lost it (energy → 0) |

**Invariants:**
- unit: energy gain 0 · bound excess 0 · pairing 0 · rotation 0 / 6000 · mirror 0 / 2000 · determinism 0 / 2000;
- every run's ledger closes to ≤ 3e-14 N·s;
- torture 0 / 32 non-deterministic.

**Before contact everything is exact:** 790 / 790 encounters bit-identical to Stage 2 (and to OLD) up to the first genuine contact; one footballer 105 / 105; near misses 56 / 64 untouched. **Body Feint, Croqueta and the Standing Tackle are exact to their approved builds until real contact.**

**Leg-through-leg time halves on our real body thickness:**

| set | ticks with a leg pair > 5 cm, OLD → 3B |
|---|---|
| review | 597 → **307** |
| matrix | 862 → **443** |
| l3 | 1540 → **672** |
| moves | 4546 → **1974** |
| search | 2995 → **1478** |
| torture | 540 → **167** |

- Body Feint into a recovering tackle: 17.2 → **8.8 cm**.
- Croqueta × tackle recovering in front: 70 → **7** ticks, torso 3.0 → **0.0 cm**.
- Planted legs are never moved by 3B.
- The knee's flexion never changes (≤ 0.0011°).

**Ball / possession untouched:**
- 0 ball changes without a canonical contact;
- 0 authority transitions caused by physics;
- possession torture ownership checks 0;
- the milestone's own regression **10 / 10 suites identical**;
- OLD Stage 3 on the final code ≡ its committed evidence.

**Cost:** +30 µs per tick over OLD (145.8 → 176.2 µs mean). The limb pass costs 14 / 43 / 74 µs idle / near / active.

**What it does not do yet, and what got worse:**
- The **deepest** leg overlap is unchanged (22.4 cm: two committed legs landing into each other; landing feet must land, → 3B.2).
- Boot ↔ boot and planted ↔ planted stay outside 3B.
- Crossed legs and recovery steps into the opponent remain (→ 3B.2).
- **Solid legs deliver real momentum.** Fall candidates rise (matrix 14 → 23) and recovery steps rise (moves 208 → 352). Trips halve; momentum losses rise.
- **The flagship brush now gives both players a recovery step:** the canonical jog's **2+ m/s lateral knee swing** is counted as the limbs' momentum. The accounting is correct and symmetric, but it may be too strong. **That is the owner's first decision.**
- Limbs move faster, more often: the drawn yield, +7 % knee/foot jumps > 4 cm a tick.

**Four faults the final evidence pass found were fixed before this report:**
1. a 42.6 cm projection snap;
2. a ~600 N·s pump through Stage 3's fall placeholder;
3. a hip-range guard hole (10.3°, now ≤ 1.7°);
4. mis-built side-by-side / crossing rows.

**A pre-existing Stage 3 defect surfaced through the new ledger:**
- A committed defender whose capture point runs away gets neither a step nor a fall candidate, so his hidden velocity *u* diverges exponentially.
- It happens in OLD 3 and 3B 6 of 1,570 possession-tool worlds (§18 item 11).
- It is not fixed here (Stage 3's logic).

**Recommendation: strong enough to be 3B.2's foundation**, once the owner has decided how much authored limb speed counts as momentum (§19).

## 0. THE PROTECTED BASELINE, REPRODUCED FIRST (§0)

- **Before any change** on the new branch, Stage 3's own tools (`occupy3/tools`) were re-run and diffed against the committed Stage 3 evidence:
  - identity, metrics and ball (review / matrix / moves / search), solo, near miss, torture;
  - **identical, 0 differing lines** in every output (`evidence/stage3_reproduction/`: DIFF_SUMMARY.txt, README.txt).
- The one torture line that differs is the run-progress list, not a result.
- **After the hooks**, OLD's matrix metrics and review ball outputs were identical again.
- **On the final code**, OLD Stage 3 was re-run with Stage 3's own tools: identity (review), metrics (review, matrix), ball (review, matrix) and solo — **0 differing lines** (`evidence/old_recheck/`).
- **The milestone's own regression** (Body Feint ≡ its review build, Croqueta LEG-WAVE V4 ≡ its build, chains, Lab cards, sweeps): **ALL 10 SUITES IDENTICAL** to the milestone's committed evidence (CPU timings masked) (`evidence/milestone_regress.txt`).
- **Changed files:** `git diff 88a964ba..HEAD` touches only `sandbox/visual/occupy3b/`, `occupy3b_lab.html`, `review_artifacts/player_occupancy3b/` and Stage 3's two files above. None of vocab2, tackle1, possess1, occupy1, occupy2, agility99, the baseline, feint2*, croq* or shooting.
## 1. THE STACK (§1) — who answers what

```
canonical footballer (vocab2: authored motion, Body Feint, Croqueta, Standing Tackle)   — unchanged
  → Stage 2 occupancy / separation (occupy2: positional, committed-foot rules)            — unchanged
  → STAGE 3B LIMB CONTACT (occupy3b/l3_world.js + l3_limb.js + l3_body.js)                 — NEW
  → Stage 3 impact / balance / action (occupy3: absorb · correct · step · stagger · fall)  — unchanged, but for its limb strikes, now OFF
  → the shared ball authority (possess1: BallAuthority, Reaction MEDIUM 0.200 s)           — unchanged
```

- **Stage 3B answers one question: what physically happens to the contacting limb.** It yields, slides, deflects, swivels at the knee, slows or stops, and it passes on only the momentum it actually lost.
- **Stage 3 answers the rest, as before:** given the impulse that reached the body, absorb / correct / step / stagger / fall candidate. Its decision, balance and action code is unchanged.
- **Stage 3 gets impulses from exactly one place for a limb interaction: Stage 3B.** Its animated-speed limb strike (`limbMin`) is set to ∞ in the 3B world. OLD-style limb strikes left in Stage 3B: **0** in every run (each tool checks this).
- **Stage 3's trunk-to-trunk body contacts are unchanged.** They are its own channel. The ledger records them as a separate source, `S3_BODY`.

### What changed in Stage 3's files (flag-free: OLD Stage 3 is bit-identical)
Stage 3 needed hooks for 3B to plug in. Each hook is inert unless a subclass supplies it. `ImpactWorld` supplies none, so **OLD Stage 3 on this branch reproduces the committed Stage 3 evidence exactly** (§0).

| file | change |
|---|---|
| `occupy3/o3_world.js` | `normalOf` (the contact normal, overridable: Stage 3B's face rule) · `extImpulses(k)`, an external impulse list applied at its points (through Stage 3's own levers, strut, balance); it counts as touching, can open an episode (reason "LIMB CONTACT (3B) …") and can reactivate a player · `extPairs` (onset facts for an episode a 3B contact opened) · the early-return guard respects external impulses · it exposes `out.bal / out.fade / out.Jx / out.gx` for the ledger |
| `occupy3/o3_run.js` | mode `"S3B"` in `runO3` / `makeWorld3` (registered by `occupy3b/l3_world.js`) · `runO3.last` (the tools read the run they just measured) |

There are no other changes outside the new `occupy3b/`, `occupy3b_lab.html` and `review_artifacts/player_occupancy3b/`. Changed canonical / protected files since Stage 3 (`88a964ba`): **0** (§0).

## 2. THE MANDATORY REPLACEMENT (§2)

| | OLD Stage 3 | Stage 3B |
|---|---|---|
| source | the animated limb's articulated closing (capped at 3.0 / 4.5 / 6.0 m/s) × the limbs' reduced mass | the contact points' **physical** closing on the stable normal: body + authored articulated + perturbation |
| the limb afterwards | **unchanged** (the animation continues; momentum came from nowhere) | its normal speed is removed: Δv = w·λ. It **yields** (drawn), and the momentum it lost is λ |
| where the impulse goes | spread over 6 ticks into both bodies, at the contact point | **through the limb's hip into its own body**, and equal and opposite into the opponent (at his contact point, or through his hip if his limb yielded too) |
| bound | none (artCap only) | λ ≤ −v_n / (w_A + w_B). Never more than the closing permits, checked per application |
| how many sources | limb strike + body contact | 3B limb contact + Stage 3 body contact (trunk only). OLD limb strikes in 3B: **0** |

## 3. STAGE 3B.0 — ACCOUNTING AND INVARIANTS (§3)

### What each limb contact records (`W.l3.log`, every tick with a contact; the Lab's FRAME DATA / DIAGNOSTICS show it)

| the owner's field | where |
|---|---|
| bodies, limb / segment pair, region | `contacts[].key` (e.g. `THIGH_R\|THIGH_L`), `region`, side kinds `A / B` (LIMB · BODY) |
| contact point · normal · depth | `at`, `n` (after the face rule), `pen` |
| root velocities · limb point velocities | `vA / vB` (the physical point velocity: body + articulated + perturbation), the ledger's per-player `u` |
| relative normal velocity | `vn` (per application) |
| effective limb / contact mass | `wA / wB` (inverse effective masses), `routeA / routeB` (LIMB YIELDS · LIMB AT RANGE · BODY) |
| momentum before · removed from the limb · passed to each body | `keB → keA` (relative normal KE), `lam` (the momentum the contact point lost = the impulse), `ext.A / ext.D` (each body's impulse, its point and source: hip or contact point) |
| redirected through the limb | `yielded` (the closing a held contact took up by yielding: no impulse) and the legs' `q / qd` (the deflection) |
| positional correction (apart) | `posn[]` (each projection, cm, at its point). It never enters an impulse |
| friction / tangential | **0 by construction**: the contact is frictionless and the tangential motion is never touched (a leg slides along another) |
| energy before / after | `keB / keA` per application |
| Stage 3 input from 3B | `ext` (then the ledger's `EXT3B` source) |
| whether an authored limb trajectory changed | `legs[].q / qd / d` (perturbation angles, speeds, ankle displacement). The Lab's APPROVED REFERENCE draws the authored leg dashed beside it |
| the reason for every clamp | events: `LIMB AT ITS RANGE` · `LANDING OBSTRUCTED` · `LANDING SNAP` · `TOUCH DENIED` / `TACKLE BOOT DENIED` (limb contact) · `LIMB HELD` · `BODY OUTRAN A HELD FOOT` · `RECOVERY STEP LANDS IN THE OPPONENT` |

### The three channels never mix
1. **Physical impulse:** `apps[]` → `ext` → Stage 3 → the root (`u`). It is the only thing that moves a root.
2. **Positional correction:** `posn[]`. It moves the limb's perturbation only (≤ 1 cm a tick at the contact point), never a body, never a planted leg. It carries no momentum.
3. **Authored displacement:** the canonical pose. 3B never edits it. The drawn leg = authored leg ⊕ the perturbation q (the inverse is exact: `legAuthored`).

### THE LEDGER (`l3_world.js` closeLedger, every tick, per player)
`m · (u(k) − u(k−1)) = Stage 3's input − its strut + its balance controller + its fade + its settle`, and `Stage 3's input = EXT3B (every 3B impulse) + S3_BODY (Stage 3's own trunk contact)`.

Checks, max over every run: **stage3** (Stage 3 took exactly what it was given) · **pair** (every 3B application's two impulses sum to zero; Stage 3's body contacts likewise) · **bound** (λ above its closing's) · **energy** (relative normal KE after − before).

## 4. CONTACT GEOMETRY AND THE FACE RULE (§4)

- **Geometry: Stage 1's mesh-measured volumes, unchanged** (thigh r 11.5 cm etc.). Astra's thin capsules are not used.
- **Which side is a LIMB:** a **swinging** leg's lower thigh, shin or boot. A planted leg, the hips (the thigh's upper half) and the trunk are **BODY**: they never yield, and a planted foot never moves.
- **THE FACE RULE (the stable contact direction):** two bodies near-parallel and facing the same way (|sin Δψ| < 0.15) take the **side-on normal**. It is the separating axis of their occupied footprints (the mean heading or its perpendicular), never a local capsule normal tilted by the animation. That tilt is Astra's forward-wedge failure, and the flagship's.
  - Between |sin Δψ| 0.15 and 0.30 it blends smoothly to the local normal. Beyond 0.30, and for opposite headings, the local normal is kept: genuinely crossing contacts keep their real geometry.
  - A pair whose local normal points against the side-on one (legs crossed over) keeps its local normal.
  - In the 3B world Stage 3's body contacts use the same rule (`normalOf`).

## 5. THE LIMB MODEL (§5 – §7)

**The leg as drawn is the authored leg plus a small perturbation q, never a second animation** (`l3_limb.js`):
- q[0] ab/adduction about the body's forward axis through the hip, ±12°;
- q[1] flexion/extension about the lateral axis, ±20°;
- q[2] the **knee's swivel** about the hip→ankle line, ±20°. The knee moves sideways and the ankle does not: this is Astra's `kneeAvoid`, done anatomically.

The knee's flexion is never changed. The foot keeps its authored orientation and moves with the ankle.

**Inertia:** the generalized 3×3 mass matrix of the three DOFs, from the leg's own segments (thigh and shin as uniform rods, Simpson exact; the foot with the ankle) at the rig's mass fractions of the equal 73 kg body. A contact point's effective inverse mass is w = jᵀM⁻¹j.

**Each tick** (after Stage 2, before Stage 3):
1. **Detect** on the posed Stage 1 volumes: every pair with a swinging limb beyond the 2 cm tolerance, or already held.
2. **Velocities:** the physical point velocity = the body's (root + Stage 3's perturbation velocity) + the authored articulated velocity (over 3 ticks, capped at the segment's ceiling: beyond it a blend, not momentum) + the perturbation's.
3. **Solve** (4 Gauss–Seidel passes, velocity level, inelastic, frictionless): λ = −v_n / (w_A + w_B) ≥ 0.
   - A limb **yields** only if it is lighter at the point than its body (w > w_body). Then Δq̇ = M⁻¹ j λ: drawn, kinematic, no second momentum.
   - A DOF at its range is locked against going further.
   - A limb with no free DOF is **part of its body** for that contact. It passes only the bodies' own approach (λ ≤ max(0, −v_n,body) / W), never its articulated speed.
4. **Held contacts** (per limb and opponent, per swing): the authored limb's own acceleration into a contact already resolved is **not executed**. The perturbation cancels it with no impulse, because the reference moved and the limb did not. The hold is released at a 6 cm gap or when the struck leg plants.
5. **Reconcile:** q → 0, critically damped (ω 18 rad/s, ≈ 0.25 s). It is faster before a landing or a touch (ω ≥ 5/τ within 0.25 s), never into a held contact unless the foot must land, and capped at 12 rad/s (25 in the landing window).
   - **No snap back onto the authored curve.**
6. **Landing priority:** within 0.06 s of its landing a leg is taken out of the solve and lands where its stance is (a planted foot never moves). The obstruction is reported (`LANDING OBSTRUCTED`, a 3B.2 / 3B.3 input).
7. **Positional projection:** overlap beyond the tolerance is projected out of the limb, ≤ 1 cm a tick at the point. Positions only.
8. **Turf and hip range guard:** a perturbed foot never goes below the turf, and the hip never leaves its anatomical range (flexion −30…125°, abduction −30…45°) where the authored one did not.
   - Moves that would make a violation worse are cut back (bisection).
   - A perturbation the authored motion itself has carried out of range is **restored**: shrunk toward the authored pose, no faster than the perturbation may move (12 rad/s).
   - A move back toward the authored pose is always allowed.
9. **Touches:** a ball touch or a tackle's boot whose foot the limb contact displaced more than 2 cm is **denied for geometry, with its reason**. The ball is never moved for it. BallAuthority decides everything else, as before.

### Astra's principles, rebuilt (not ported)

| Astra | Stage 3B |
|---|---|
| `constrainSwing` / `resolveSwingContact` | the velocity-level solve on the swinging limb: the closing removed, the tangential motion kept (slides), the limb deflected |
| `blockedSwingTension` | held contacts (no re-pressing by animation) + `LIMB HELD` / `LIMB AT ITS RANGE` (3B.3 inputs; no tension executed) |
| `kneeAvoid` | the knee-swivel DOF q[2] |
| capped per-tick correction | the projection ≤ 1 cm/tick; the perturbation speed ≤ 12 rad/s |
| planted legs fixed | planted legs are BODY; landing priority |
| reaction capped by the available closing | the BOUND λ ≤ −v_n/(w_A+w_B), checked every application |
| no animation-derived forward bias | the face rule + only lost momentum + a limb at its range passes the bodies' approach only |
| root-only passive momentum | only `ext` impulses reach a root (via Stage 3). The yield and the reconcile carry none |
| per-source accounting, invariants | the ledger + `l3_unit.mjs` (energy, bound, pairing, rotation, mirror, determinism) |

**Not ported (as instructed):** the support timeline, procedural gait, Strength curve, push-and-run controller, thin geometry, flight ground force, shoulder duel.

**Opponent leg-surface prediction** is not implemented. Contacts are detected every tick at 240 Hz on the current volumes, and held contacts stop re-entry.

## 6. BODY COUPLING (§8)

- The impulse a limb contact delivers reaches Stage 3 **at its point**: a yielding limb's through its hip, a body side's at the contact point. It then goes through Stage 3's own machinery: posed effective mass, levers about the hips, the strut (a planted player sends part of the load into the ground; an airborne one cannot), the balance controller and the capture point. All of this is unchanged.
- There are no ratings, no random rolls, and no attacker/defender asymmetry anywhere in 3B: the same code for both players, both legs.
- A mesh point moving fast cannot move the other root by itself. Only λ can, and λ is bounded by the physical closing and the limb's own effective mass.
## 7. THE FLAGSHIP — the audit's failure (§9) · `evidence/flagship.{txt,json}`, the Lab's ACCOUNTING panel

The case: equal-speed jog side by side, the carrier leaning 6° in, a thigh brush, the bodies closing at 0.20 m/s.

| | OLD STAGE 3 | STAGE 3B |
|---|---|---|
| what fires | one LIMB STRIKE, THIGH_R / THIGH_L at 1.029 s | two contact applications, THIGH_R \| THIGH_L at 1.029 s and 1.729 s (the next swing) |
| its source | the **animated** articulated closing 1.79 m/s × the limbs' reduced mass (14.6 / 14.6 kg) = **13.08 N·s** | the contact points' **physical** closing 2.37 / 4.59 m/s × the yielding limbs' effective masses (13.5 / 17.5, 11.2 / 11.0 kg) = **18.05 + 25.45 N·s**, each exactly at its bound |
| the normal | the local capsule normal **[0.448, −0.894]**, tilted 27° forward by the animation | the stable side-on normal **[0.053, −0.999]**, perpendicular to the pair's mean heading |
| the limb afterwards | **unchanged**: the animation continues, so the momentum came from nowhere | its normal speed is removed and it yields. Energy 21.42 → 0.000 J and the second application's likewise |
| along the carrier's heading | **+4.42 N·s** on the carrier: the forward wedge | −2.72 N·s in total: the carrier's own heading is 7° off the pair's, so a lateral push shows a small component on it |
| **along the pair's mean heading** | — | **0.0000 N·s** |
| **the lead** (the impact's own root shifts, ATT − DEF) | **14.1 cm** along the carrier's heading, **16.6 cm** along the mean heading | −4.5 cm along the carrier's heading; **2.0 cm along the mean heading** (largest 2.6), which is Stage 3's own balance response in each player's frame |
| the ledger | — | Stage 3 took exactly what 3B gave · paired 0 · bound 0 · energy 0 · OLD limb strikes left **0** |
| Stage 3's response | MODERATE / CORRECT both, Δv 0.185 / 0.18 m/s | **STRONG / RECOVERY STEP both**, Δv 0.614 / 0.599 m/s (symmetric), one step each |

**Why OLD led and 3B does not.** OLD turned the animation's knee speed into 13 N·s on a capsule normal tilted forward. That pushed the carrier forward and the defender back, and the limb kept its speed. 3B's impulse is what the limbs actually lost, on a normal perpendicular to the pair's motion. Its component along that motion is exactly zero.

**But reported plainly: the brush now produces a much bigger sideways exchange** (Σ 43.5 vs 13.1 N·s; both take a recovery step).
- At the second contact the two knees swing toward each other at **2.49 and 2.15 m/s**: the authored articulated velocity on the normal, inside a jog.
- 3B treats that as the limbs' real speed. It removes it from them (they yield) and passes on exactly what they lost: correct accounting, symmetric, bounded.
- Whether the canonical jog's frontal-plane knee speed of 2+ m/s should count fully as momentum is **the main decision for the owner** (Decisions §1). A thigh brush at a jog arguably should produce "almost no whole-body response"; here it does not.

### The equal-speed family and its mirrors (`evidence/nolead.{txt,json}`)

| case | OLD limb J · lead (carrier hdg / mean) | 3B Σλ · along hdg · lead (carrier hdg / mean) | Stage 3 OLD → 3B |
|---|---|---|---|
| **side** (jog, the flagship) | 13.10 N·s · 14.1 / **16.6 cm** | 43.51 N·s · −2.72 N·s · −4.5 / **2.0 cm** | MOD/CORRECT ×2 → STRONG/RECOVERY STEP ×2 |
| **side-run** (level within 0.1 m, 1.1 m apart, the carrier leaning in) | 8.40 N·s · 4.9 / **7.3 cm** | 0 (no limb contact: Stage 3's body contact only) · −0.4 / **1.7 cm** | MOD/CORRECT ×2 → the same |
| **side-walk** | no contact | no contact | — |
| overtake | no contact | no contact | — |
| glance (opposite headings: "lead" is not meaningful) | 14.80 N·s · −9.4 cm | 9.49 N·s · −5.60 N·s (an oblique crossing: the local normal is correct) · −4.0 cm | MOD ×2 → MOD ×2 |

**Mirrors:**
- The limb layer's own mirror invariant is exact (0 / 2000, §8). `side-run`, `side-walk`, `overtake` and `glance` mirror exactly (|Δlead| 0.00).
- `side` differs from `side-m` by 2.40 cm (OLD 1.60): **the canonical motion itself is not mirror-symmetric**. With Stage 2 as decided, before any contact, a mirrored joint of `side` differs by up to 26 cm (the gait phase), so its mirror row is a similar encounter, not an exact mirror.

## 8. THE INVARIANTS (§3, §18 Physics) · `evidence/unit_invariants.txt` + every run's ledger

**Unit level:** 2000 random configurations drawn from 3332 recorded authored legs of the canonical body.

| invariant | result |
|---|---|
| no passive energy gain (relative normal KE after − before, per application) | largest **0.00e+0 J** |
| no impulse above its source (λ − its closing's bound) | **0.00e+0 N·s** |
| pairing (an application's two impulses sum) | **0.00e+0 N·s** |
| rotation (37° / 90° / 180°: λ, each player's impulse rotated, the DOF responses) | **0 / 6000** differ > 1e-9 |
| mirror (y → −y, legs exchanged) | **0 / 2000** |
| determinism (solved twice) | **0 / 2000** differ at all |
| the drawing (the canonical FK's perturbed legs against the limb model) | largest **0.0049 mm** |

**World level, every run of every set** (review · matrix · l3 · moves · search · torture):
- Stage 3 took exactly its impulses (max 2.8e-14 N·s);
- pairing 0 · bound 0 · energy 0;
- **OLD limb strikes left in 3B: 0**: no double counting.

The ledger closes per player and tick to floating point (≤ 3e-14 N·s; documented tolerance 1e-9).

**Four faults found by the final evidence pass, and fixed** (commits `0a97e5c1`, `5597de1d`):
1. **A projection snap.** The positional projection was bounded only at the contact point. A contact near the hip (a short lever) became a 38° rotation in one tick, and the foot jumped **42.6 cm** (`bf-into`). It is now bounded at every drawn joint (knee, ankle, ball, toe ≤ 1 cm a tick).
2. **A momentum pump through Stage 3's fall placeholder.** Stage 3's labelled, non-physical fade writes a fall candidate's velocity back to the authored motion every tick. A held limb contact turned that re-created closing into a new impulse every tick, **~600 N·s each way**, cancelled by the fades: animation-made momentum. Such a player's limb contacts are now **positional only** (yield + projection, never an impulse), reported as `CONTACT DURING A FALL PLACEHOLDER (3B.4)`. `bf-into`: 834 → 62 N·s.
3. **The hip range / turf guard had a hole.** It refused moves that made a violation worse, but a perturbation the *authored* motion carried out of range stayed there: up to **10.3°** past the hip's extension limit. It is now **restored** toward the authored pose, no faster than the perturbation may move. Worst left: 1.7° (§10).
4. **Two test-construction faults:**
   - the side-by-side WALK / RUN rows and the crossing sweep placed the defender so that he reacted late or started from rest: no level running, 19 of 20 crossings without contact;
   - rebuilt from measured canonical speeds and start lags; the old side rows are kept under honest names (`walk-behind`, `run-past`).

## 9. BEFORE CONTACT — exactness (§11, §18) · `evidence/identity_*`, `solo.txt`, `nearmiss.*`

STAGE 3B against STAGE 2 (as decided), identical inputs, **every tick**: both roots, the ball, the authority, every joint of both bodies.

The first genuine contact is 3B's first contact (an impulse, a yield or a positional correction of a limb) or Stage 3's first impact.

| set | identical up to the first genuine contact (with a contact) | 3B ≡ OLD up to either's first contact |
|---|---|---|
| review | **37 / 37** (28) | 37 / 37 |
| matrix | **52 / 52** (35) | 52 / 52 |
| l3, the full §10 matrix | **114 / 114** (74) | 114 / 114 |
| moves (352 Body Feint / Croqueta / tackle timings) | **352 / 352** (174) | 352 / 352 |
| search (235) | **235 / 235** (160) | 235 / 235 |

- **Body Feint, Croqueta and the Standing Tackle are exact to their approved builds before the first genuine contact** in all 790 encounters.
- **One footballer:** 105 curated canonical cases, 127,092 ticks, the other player parked 40 m away. **105 / 105 identical every tick**; Stage 3B and Stage 3 evaluated nothing.
- **Near misses** (Stage 2's sweep, 64 passes): nothing opened in **56 / 64**, and those are identical to Stage 2 every tick.
  - all 11 passes touching within the 2 cm tolerance and all 39 near misses (0–30 cm) are untouched;
  - 3B / Stage 3 acted only in 8 of the 9 genuine overlaps Stage 2 had to resolve.
  - **No early information:** with Stage 3B on (`evidence/two_player_early_info_3b.txt`, `tools/l3_early.mjs`: Stage 2's o2s_early with one more classification), the attacker's **decisions differ 0 · 6 · 7** (SHORT · MEDIUM · LONG; OLD Stage 3: 0 · 0 · 0). **Every one comes after Stage 3 / 3B physics acted on him in the window, at or before the divergence; none is unexplained.**
  - 10 of the 13 name the impact's consequence as the differing decision (a recovery step, an interruption).
  - 4 (`m3-49` ±M) are a planned touch that found no ball after limb contacts present in **both** runs: the weakest attribution.
  - His root differs only with occupancy acting on him: 0 would-be-information cases.

## 10. GEOMETRY — limb penetration with our real body thickness (§18 Geometry) · `evidence/metrics_*`

The bodies as drawn, STAGE 2 (as decided) · OLD STAGE 3 · **STAGE 3B**:

| | review (37) | matrix (52) | l3 (114) | moves (352) | search (235) |
|---|---|---|---|---|---|
| **ticks with a leg pair > 5 cm** | 849 · 597 · **307** | 1401 · 862 · **443** | 2547 · 1540 · **672** | 5633 · 4546 · **1974** | 3193 · 2995 · **1478** |
| … thigh-thigh | 732 · 469 · **283** | 1031 · 494 · **218** | 1592 · 886 · **296** | 3913 · 2732 · **999** | 1062 · 876 · **404** |
| … thigh-shin | 279 · 204 · **141** | 470 · 260 · **124** | 802 · 552 · **223** | 2190 · 1478 · **521** | 945 · 988 · **347** |
| … shin-shin | 214 · 140 · **71** | 410 · 258 · **84** | 1017 · 521 · **186** | 1819 · 1475 · **522** | 842 · 913 · **365** |
| … foot-leg | 196 · 156 · **50** | 451 · 377 · **247** | 1019 · 627 · **406** | 2031 · 1951 · **1084** | 2138 · 2018 · **907** |
| … leg-trunk | 131 · 0 · **0** | 120 · 0 · **0** | 290 · 0 · **0** | 535 · 15 · **28** | 81 · 0 · **1** |
| deepest leg (cm) | 22.7 · 22.7 · **22.4** | 22.7 · 22.7 · **22.4** | 23.0 · 22.7 · **22.4** | 23.3 · 22.9 · **22.9** | 22.9 · 23.0 · **19.6** |
| deepest torso (cm) | 22.9 · 3.1 · **2.1** | 22.9 · 3.1 · **2.1** | 22.9 · 3.1 · **2.1** | 22.9 · 4.9 · **3.2** | 15.8 · 3.3 · **2.2** |
| deepest leg-trunk (cm) | 17.8 · 4.5 · **3.7** | 11.3 · 4.5 · **2.1** | 18.8 · 4.5 · **2.1** | 23.3 · 9.8 · **8.3** | 13.2 · 3.0 · **5.3** |

- **The time limbs spend > 5 cm inside each other falls by about half against OLD:** review −49 %, matrix −49 %, l3 −56 %, moves −57 %, search −51 %. Every class falls; foot-leg falls least.
- **The deepest leg penetration does not fall** (22.4 cm, `both-committed`): two committed legs landing into each other inside the landing window, where a foot must land where its stance is (§13, 3B.2).
- **Leg-trunk:**
  - moves rises slightly in count (15 → 28 ticks): a second collision 1.1 s after a fall placeholder ended (`BODY_FEINT 3/0.5@0.4`), on a trajectory OLD never reached; the bounded projection clears it over ≈ 12 ticks;
  - search's deepest leg-trunk rises (3.0 → 5.3 cm), 1 tick > 5 cm.

**Planted legs:** 3B never moves a planted leg (it is BODY; its perturbation is 0).
- The planted ball-of-foot slide is unchanged on review, matrix and moves (11.0 / 11.0 / 24.2 cm).
- It **rises on search (14.8 → 21.5 cm, `#87`) and l3 (11.0 → 14.4 cm)**. The perturbation is 0 there: Stage 3's realisation shifts the root under a planted foot (it now receives more momentum), and the canonical body blends the foot along the turf. Stage 3's behaviour under a larger impulse, reported for 3B.2.

**Swinging limbs slide / yield / stop** (matrix):
- the routes: LIMB AT RANGE / BODY 59 · LIMB YIELDS / BODY 42 · BODY / LIMB AT RANGE 19 · BODY / LIMB YIELDS 18 · LIMB YIELDS / LIMB YIELDS 17 · LIMB AT RANGE / LIMB YIELDS 8;
- held contacts yielded 1088 m/s of closing with no impulse;
- positional projection Σ 374 cm;
- contact-ticks unresolved (both sides at range or planted): matrix 0 · l3 2 · moves 4 · search 12.

**Anatomy:**
- **The knee's flexion is never changed** (largest 0.0011° over every set).
- **Leg-ticks pushed outside the hip's anatomical range by the perturbation:** review **0** · matrix 8 · l3 56 · moves 40 · search 128, against 8,942 / 11,382 / 29,961 / 73,799 / 81,946 already outside it in the authored poses (the canonical body's own).
- After the restore the worst is **1.7°** beyond the limit (search `#59`): the guard checks the range on the tick's pose before the next drawing, a one-tick lag. Small but not zero.

**No large one-frame limb snaps:** the largest knee/foot jump in a tick is review **28.2** (OLD 31.5), matrix **28.2** (31.5), l3 29.0 (31.5), moves 39.9 (= OLD; canonical), search 36.3 (37.8). The counts are a different matter (§16).

## 11. BODY FEINT · CROQUETA · STANDING TACKLE (§10, §11) · `evidence/metrics_matrix.txt`, `metrics_l3.txt`, `ball_*`

Legs cm and ticks > 5 cm, STAGE 2 · OLD · **3B**; Stage 3's responses OLD → 3B (M moderate · S strong · S! severe · L light · B brush):

| case | legs (cm) | ticks > 5 cm | responses | note |
|---|---|---|---|---|
| **bf-fake** (Body Feint into a recovering tackle) | 22.6 · 17.2 · **8.8** | 82 · 33 · **8** | S!,S → S!,S | torso 22.9 · 3.1 · 2.1; tackle MISS in all three |
| **in-bf** (tackle into a Body Feint) | 7.0 · 13.6 · **6.4** | 5 · 14 · **2** | M,M → B,L,M,S | ATTACKER RECOVERS in all three |
| bf-past | 3.1 · 3.1 · 2.6 | 0 · 0 · 0 | S,S → S,S | |
| bf-shoulder | 8.3 · 8.3 · 8.3 | 61 · 64 · 59 | S,M → M,L | **boot ↔ boot**: FOOT↔FOOT is left to the ball contest (§13) |
| bf-step-in | 2.5 · 3.8 · 2.5 | 0 | M,M → — | no limb contact |
| **croq-early** (Croqueta into an early tackle) | 22.7 · 13.7 · **10.6** | 92 · 29 · **9** | S,S → S,S | ATTACKER RECOVERS in all three |
| **croq-before** | 14.0 · 13.7 · 13.8 | 39 · 103 · **20** | S,S! → S!,S | |
| **croq-between** | 13.3 · 5.7 · **3.4** | 99 · 3 · **0** | S,S! → S,S! | |
| croq-leg | 7.6 · 7.5 · **3.5** | 6 · 5 · **0** | M,S → S,S! | a new fall candidate |
| croq-hip | 11.8 · 7.1 · **12.8** | 13 · 7 · **17** | S,S! → S,M | **worse**: planted ↔ planted (§13) |
| **in-croq** (tackle into a Croqueta) | 22.7 · 22.7 · **15.4** | 82 · 67 · **43** | S!,S → S!,S! | DEFENDER RECOVERS in all three |
| **both-committed** | 22.7 · 22.5 · 22.4 | 82 · 57 · **34** | S!,S! → S!,S! | the deepest case: landing legs (§13) |
| **croq-recover** (Croqueta × a tackle recovering across its exit) | 23.0 · 14.2 · **13.9** | 149 · 43 · **38** | S!,S → S,S | torso 15.3 · 1.9 · **0.0** |
| **croq-recover2** (… recovering in front) | 22.9 · 21.9 · **13.0** | 187 · 70 · **7** | S,S! → S!,S! | torso 9.8 · 3.0 · **0.0** |
| carry-walk (tackle into a walking carry) | 10.8 · 7.3 · 7.8 | 41 · 24 · 10 | S,M → M,M | outcome as OLD |

**Authored actions under contact:**
- Before contact they are exact (§9).
- At contact 3B constrains only the contacting leg. The perturbation is per leg, so unrelated joints and the other leg are untouched; the APPROVED REFERENCE overlay shows the difference.
- **A decisive touch the displaced foot cannot reach is denied for geometry, with its reason** (`TOUCH DENIED (limb contact)`: matrix 4, l3 20, moves and search in their files). The tackle's boot likewise (`TACKLE BOOT DENIED`: moves 9, search 7).
- Stage 3's action-interruption rules decide the rest, unchanged.

**Tackle outcomes** (`ball_*`):
- **matrix: 0 differ from OLD.** `carry-walk` ±m differ from Stage 2 exactly as in OLD.
- **review: 1** differs from OLD: `bf-exit`, ATTACKER → DEFENDER RECOVERS, via the attacker's recovery step and a touch denied.
- **l3: 2** differ from OLD: `croq-recover2` ±m, DEFENDER → ATTACKER RECOVERS, via the attacker's interruption, recovery step and a touch denied.
- **moves: 30 / 352** differ from OLD (27 from Stage 2) · **search: 35 / 235** (44 from Stage 2) — each with its physical cause listed (a recovery step, an interruption, a touch / boot denied for geometry, the bodies' displacement), except one moves row (`BODY_FEINT 2.4/1@0.2`) whose cause column is empty (not yet diagnosed); 2 moves and 9 search rows end with **no tackle outcome** (the tackle never resolved after a recovery step / the bodies' displacement)
- Each has its physical cause listed. No outcome was tuned.

## 12. BALL / POSSESSION FIREWALL (§12) · `evidence/ball_*`, `two_player_*`

| check | result |
|---|---|
| **the source**: does 3B (l3_world, l3_limb, l3_body) or the Stage 3 it feeds write the authority, launch the ball or write its state? | **NONE** |
| ball velocity changes > 0.25 m/s in a tick with no canonical contact within ± 2 ticks | **0** in every set (review 0 / 337 · matrix 0 / 456 · l3 0 / 957 · moves 0 / 3551 · search 0 / 2555) |
| authority transitions naming a limb contact or an impact as cause | **0** in every set; the authority's own checks (dual, unaware, without a touch, granted blind) **0** |
| possess1's own two-player torture with Stage 3B on (60 trials × 4 modes) | **dual 0 · unaware 0 · stale 0 · chatter 0 · A→B→A 0 · possession without a touch 0 · control granted blind 0 · nondeterministic 0**, all four modes (claims denied as blind 3 / 5 / 10: the Reaction rule working). Its "new information used early" flag (22 / 30 / 34 of 38) is a root-*or*-decision counterfactual test that OLD Stage 3 trips equally (24 / 32 / 34); the separation into occupancy / physics / information is the next row. Its Stage 3B ledger: **2 of 1,870 worlds exceed the 1e-9 closure check** (by 1e-11) — floating point against a Stage 3 state that had diverged (§18 item 11, a pre-existing Stage 3 defect) |
| no new information before perception (o2s_early, and l3_early with Stage 3B on) | decisions differ 0 · 6 · 7 (OLD 0 · 0 · 0), **all after physics acted on the attacker in the window** (§9); root differences only with occupancy acting |

**What 3B did do, explicitly** (matrix):
- 4 touches denied because the limb contact displaced the foot (each with its cm);
- 31 denied by Stage 3 (the foot is the recovery step);
- 10 + 10 TECHNICAL EVENT COMPLETES, RECOVERY REPLACED;
- 6 INTERRUPTED BEFORE TECHNICAL EVENT.

**3B never moves the ball.**

## 13. INPUTS FOR 3B.2 / 3B.3 / 3B.4 — reported, not built (§13, §14)

| event (matrix · moves · search) | means | for |
|---|---|---|
| `LANDING OBSTRUCTED` 38 · 194 · 160 | a foot inside its landing window (≤ 0.06 s) lands where its stance is, **through** the opponent's leg (up to 18 cm) | 3B.2: where a foot can land |
| `LANDING SNAP` 3 · 33 · 29 | a leg planted with perturbation left, drawn onto its stance in one tick | 3B.2: late retime |
| `RECOVERY STEP LANDS IN THE OPPONENT` 3 · 22 · 16 | Stage 3's step target is inside the opponent's leg | 3B.2: own-side clamp |
| crossed-legs ticks, matrix 436 → **576**, search 4744 → 6083 (review 487 → 343) | feet crossed > 5 cm | 3B.2 |
| `LIMB HELD` 7 · 27 · 43 | a limb held against the opponent > 0.1 s | 3B.3: trip |
| `BODY OUTRAN A HELD FOOT` 5 · 38 · 60 | a held foot while its hip is ≥ 0.66 leg away | 3B.3: trip / stagger |
| `LIMB AT ITS RANGE` 20 · 76 · 75 | the limb could yield no further, so its body took the contact | 3B.3 |
| `CONTACT DURING A FALL PLACEHOLDER` 16 · 27 · 42 | a limb contact while Stage 3's fall placeholder fades a player: positional only | 3B.4 |
| fall candidates (§14) | | 3B.4 |

**Contact types left unresolved by design in 3B.1:**
- **boot ↔ boot:** FOOT↔FOOT belongs to the ball contest. `bf-shoulder` overlaps 13 cm for 0.3 s.
- **planted ↔ planted:** both are BODY, and Stage 2's committed-foot rules own them. `croq-hip` reaches 12.8 cm.
- **landing legs:** ≤ 0.06 s before landing.

## 14. WHAT STAGE 3 DOES WITH IT — the consequence (§8)

| | OLD | 3B |
|---|---|---|
| matrix: intervened · severity | 39 / 52 · MOD 33 · STR 26 · SEV 17 · LIGHT 2 | 34 / 52 · SEV 29 · STR 21 · MOD 18 · LIGHT 4 · BRUSH 2 |
| fall candidates: matrix · l3 · moves · search | 14 · 24 · 40 · 54 | **23 · 53 · 52 · 55** |
| … of which TRIP (a stepping foot caught inside a leg) | 11 · 17 · 21 · 30 | **6 · 12 · 10 · 17** |
| … of which the capture point runs away (momentum) | 3 · 7 · 18 · 24 | **15 · 39 · 40 · 38** |
| recovery steps: matrix · l3 · moves · search | 56 · 84 · 208 · 119 | 64 · 148 · **352** · **266** |

**Why more, and of a different kind:**
- In OLD, legs passed through legs. A head-on jog's legs met 15.7 cm deep, and falls were mostly **trips**.
- In 3B, legs are solid within their anatomical yield. Once a limb is at its range, the bodies' own approach passes through it, bounded by their closing, never by the animation.
- So a jog into the opponent's legs is now a collision of bodies: `headon-jog` 82.5 N·s, both SEVERE / FALL CANDIDATE.
- **Trips roughly halve in every set; momentum losses rise; recovery steps rise most** (moves 208 → 352). Part of that is the flagship's issue (authored lateral knee speed counted as momentum, Decisions §1).
- **Nothing in Stage 3 was retuned** (the instruction). This is the honest consequence of solid legs and the natural input of 3B.3 / 3B.4.

## 15. TORTURE (§18) · `evidence/torture.{txt,json}`

Stage 3's torture (the same seeded scripts): 16 seeds × their mirror × 40 s, Stage 2 · OLD · 3B, each 3B run made twice. 21.3 simulated minutes per stage.

| | STAGE 2 | OLD S3 | STAGE 3B |
|---|---|---|---|
| ticks with a pair > 5 cm | 680 | 540 | **167** |
| the deepest (cm) | 22.7 | 22.4 | 22.8 |
| pelvis jolts > 4 cm/f² (near) · largest | 166 · 9.5 | 151 · 9.6 | 150 · 9.3 |
| NaN · STUCK (contact > 1.5 s steering away) | 0 · 0 | 0 · 0 | **0 · 0** |
| ownership: dual · unaware · without a touch · granted blind · chatter | 0 | 0 | **0** |
| impact episodes · longer than 6 s (a loop) | — | 68 · 0 | 76 · **0** |
| recovery steps · RECOVERY-STEP OSCILLATION | — | 81 · 0 | 108 · **0** |
| fall candidates | — | 18 | 24 |
| touches / boots denied (geometry) · by the limb layer | — | 25 · — | 58 · 19 |
| "asking to move, not moving" samples (of them a defender owned by his own Standing Tackle > 5 s) | 504 (458) | 711 (684) | 552 (508) |
| **non-deterministic 3B runs** | | | **0 / 32** |

- 3B checks over all runs: Stage 3 took its impulses 3.1e-14 · pairing 0 · bound 0 · energy 0.
- The "asking to move" samples are the canonical Standing Tackle owning the defender for > 5 s (12 such tackles in 3B, 13 in Stage 2, 17 in OLD), the known canonical finding from Stage 3.
- The torture's limb-pass timing showed one 677 ms outlier. It was measured while eight evidence jobs ran in parallel on the machine. Run alone (§17), the limb pass never exceeds 11.5 ms, a GC pause.

## 16. CONTINUITY AND LIMB SPEED · `evidence/continuity_*`, `metrics_*`

At 60 Hz, ± 5 frames around each transition, against the same window in Stage 2 (matrix):

| transition | pelvis acc (cm/f²) S2 → OLD / 3B | pose snap (cm) OLD / 3B | knee acc S2 → OLD / 3B |
|---|---|---|---|
| LIMB CONTACT (3B's onset) | 10.4 → — / **8.8** | — / 3.8 | 21.9 → — / **35.0** |
| IMPACT → MAXIMUM PERTURBATION | 14.0 → 10.1 / **8.8** | 3.8 / 6.0 | 29.8 → 26.6 / **35.0** |
| STEP → WEIGHT ACCEPTANCE | 7.3 → 7.7 / 8.5 | 6.5 / **8.0** | 34.2 → 27.8 / 23.6 |

**The pelvis is not jolted by 3B** (worst added pelvis jolt +7.0 cm/f² at `croq-before-m`, OLD +6.3).

**The knees are.** They accelerate harder at a limb contact (knee acc up to 35 cm/f² on the matrix, 40 on l3), because the yield is drawn: the leg is pushed aside at up to 12 rad/s, 25 rad/s inside a landing window.

Counted over whole runs:

| | Stage 2 · OLD · 3B |
|---|---|
| knee/foot jumps > 4 cm in a tick, matrix | 11,020 · 11,349 · **12,173** (+7 %) |
| … search | 78,520 · 81,651 · **85,202** (+4 %) |
| joint > 15 m/s (ticks × joints), matrix | 1,996 · 1,861 · **2,227** (+20 %) |
| knee folding > 2000 °/s, matrix | 1,024 · 1,007 · 1,148 |

**Limbs move faster, more often:** this is the visual cost of a drawn yield, and something to judge in the Lab.

## 17. PERFORMANCE (§16) · `evidence/performance.txt`

The review set + the matrix (69 encounters × 3 repetitions), node v22, one core, run alone:

| | mean | p99 | max |
|---|---|---|---|
| the world's step: STAGE 2 (as decided) | 119.9 µs | 856 µs | 70.8 ms |
| … OLD STAGE 3 | 145.8 µs | 988 µs | 26.0 ms |
| … **STAGE 3B** (the limb pass + Stage 3) | **176.2 µs** | 1241 µs | 33.2 ms |
| 3B's limb pass, IDLE (far apart, nothing reconciling) | 13.9 µs | 164 µs | 11.5 ms |
| … NEAR (within the broad phase, no limb contact) | 43.2 µs | 254 µs | 6.0 ms |
| … ACTIVE (a limb contact, or a leg reconciling) | 74.2 µs | 387 µs | 3.1 ms |
| the worst tested 60 Hz frame (4 steps): Stage 2 · OLD · 3B | 72.1 · 51.7 · **66.6 ms** | p99 5.5 · 6.3 · **6.8 ms** | mean 0.5 · 0.6 · **0.7 ms** |

- **The maxima are one-off compilation / GC spikes**, the same in Stage 2.
- **IDLE is not just a distance test:** it includes the ledger's per-tick bookkeeping, which runs every tick. It could be skipped when nobody is in contact; this is a cheap later optimisation.
- **22 players (an estimate from these costs):** the limb pass is per **pair within Stage 2's broad phase** (the same proximity test), and far pairs cost one test. A dense match moment has ≈ 4–8 near pairs, ≈ 1–3 in a limb contact: **≈ 0.4 ms per tick on top of Stage 3, ≈ 1.6 ms per 60 Hz frame**. Nothing is O(N²) beyond the broad phase.
- The solve is per contact: 4 Gauss–Seidel passes over at most a handful of pairs. Detection reuses Stage 1's capsule test, so it is narrow-phase friendly.
## 18. REMAINING FAILURES — reported, not hidden (§19)

1. **The flagship brush now pushes both players into a recovery step.** The mechanism is §7: authored lateral knee speed of 2.2–2.5 m/s, counted as the limbs' momentum. The accounting is right and symmetric, with no lead. But a thigh brush at a jog arguably should produce almost no whole-body response. **This is the most important open question.**
2. **The deepest leg penetration is unchanged: 22.4 cm** (`both-committed`): two committed legs landing into each other. A landing foot lands where its stance is (landing priority), so 3B.1 cannot move it. → 3B.2.
3. **Unresolved contact types:**
   - boot ↔ boot (the ball contest's: `bf-shoulder` 13 cm for 0.3 s);
   - planted ↔ planted (Stage 2's: `croq-hip` 12.8 cm, worse than OLD's 7.1);
   - landing legs (`LANDING OBSTRUCTED`: matrix 38, moves 194, search 160; up to 18 cm through a leg).
4. **Crossed legs rise** on the matrix (436 → 576) and search (4744 → 6083); review falls (487 → 343). Recovery steps crossing the opponent: `RECOVERY STEP LANDS IN THE OPPONENT` 3 / 22 / 16. → 3B.2.
5. **More fall candidates and recovery steps:** matrix 14 → 23, l3 24 → 53, moves 40 → 52 (steps 208 → 352), search 54 → 55 (steps 119 → 266). Trips halve; momentum losses rise. Solid legs deliver real momentum, and Stage 3 (unchanged) responds. → 3B.3 / 3B.4, and the knee-speed decision.
6. **Limbs move faster, more often.** Knee/foot jumps > 4 cm a tick +7 % (matrix), joint > 15 m/s +20 %, knee acceleration at a limb contact up to 35–40 cm/f². This is the drawn yield (≤ 12 rad/s). The largest single jump is not worse (28.2 vs 31.5 cm).
7. **The hip range is not perfectly kept:** leg-ticks pushed beyond it by the perturbation are review 0 · matrix 8 · l3 56 · moves 40 · search 128, worst 1.7° (the one-tick lag after the restore).
8. **Planted-foot slide rises where Stage 3 receives more momentum:** search 14.8 → 21.5 cm (`#87`), l3 11.0 → 14.4 cm. 3B does not move the planted foot (perturbation 0). Stage 3 shifts the root under it.
9. **Tackle outcomes that differ from OLD**, each with its physical cause listed (a recovery step, an interruption, a touch denied for geometry):
   - review 1 (`bf-exit`), matrix 0, l3 2, moves 30 / 352, search 35 / 235;
   - two moves rows end with no tackle outcome (`CROQUETA 2.4/-0.5@0.8 / 0.9`);
   - one moves row lists no physical cause (`BODY_FEINT 2.4/1@0.2`). It is not yet diagnosed.
10. **Perception window:** the attacker's decisions differ from his counterfactual before he perceives the tackle in 13 checks (MEDIUM 6, LONG 7; OLD 0).
    - All 13 come after limb contacts / recovery steps acting on him.
    - 4 of them (`m3-49`) are weakly attributed: the same limb contacts occur in both runs, and the split is his touch finding no ball.
    - Physics, not perception, by every check made. Still worth the owner's eye.
11. **A pre-existing STAGE 3 divergence, exposed by the 3B ledger** (`evidence/stage3_runaway.txt`):
    - **The case:** a committed defender (his Standing Tackle owning him) whose capture point runs away is classified RECOVERY STEP. A committed player gets no recovery step, and he never becomes a FALL CANDIDATE, so the placeholder fade never starts.
    - **What happens:** his perturbation velocity *u* then grows exponentially (the LIP's divergent mode): 3 m/s at 5.5 s → 2 × 10⁵ m/s at 8.9 s. Stage 3's realisation keeps the visible root bounded, so it is hidden state.
    - **OLD Stage 3 has it too:** 3 (worst 1.35 × 10⁶ m/s) — and under 3B **6** of the possession tools' 1,570 worlds.
    - **The 3B ledger caught it:** 2 worlds exceed the 1e-9 closure check, by floating point against those magnitudes.
    - **Not fixed:** it is Stage 3's balance / action logic, which this pass must not retune. It needs a rule (a committed player whose capture point runs away is a fall candidate, or the commitment releases). → Stage 3 / 3B.3.
12. **Mirror rows are not exact mirrors** in the world, because the canonical motion is not mirror-symmetric (26 cm before contact). The limb layer's own mirror invariant is exact.
13. **Not built, as instructed:** recovery-foot placement, trips, staggers, falls, ground contact, get-up, the shoulder duel. Their inputs are reported (§13).

## 19. RECOMMENDATION — is 3B.1 strong enough to be 3B.2's foundation?

**Yes, as a mechanical foundation, with one decision to take first.**

**It does what 3B.0 / 3B.1 were for:**
- The animated-speed limb strike is gone. There is exactly one momentum source for a limb interaction, and it is what the limb lost: bounded, paired, energy-non-increasing, rotation- and mirror-invariant, deterministic, closed in the ledger to floating point.
- The flagship's forward lead is gone: 16.6 → 2.0 cm on the symmetric axis; 0.0000 N·s along it from 3B.
- Leg-through-leg time is halved everywhere on our real body thickness. Planted legs are never moved by 3B.
- Everything before contact is exact (790 / 790). Possession, ball and shooting are untouched.

**What it hands to 3B.2 is well instrumented:**
- landings obstructed by a leg;
- landing snaps;
- recovery steps into the opponent;
- crossed legs;
- the deepest remaining case.

**But decide one thing before 3B.2: how much of the authored limb speed is momentum.**
- 3B.1 takes the canonical limb's articulated velocity at face value (capped only at 3.0 / 4.5 / 6.0 m/s per segment).
- In the jog, that includes **2+ m/s of lateral knee swing**, which turns a brush into a recovery step for both players and raises recovery steps and fall candidates across the sets.
- If the owner judges that too strong in the Lab, the principled fix belongs in 3B.1's source term, not in Stage 3's thresholds. For example: count the swing-plane (sagittal) articulated velocity fully, and the frontal-plane part only up to a physiological ceiling, the remainder being a blend like the existing artCap.
- That is a calibration of what the animation means physically. **It is the owner's call; nothing was tuned here.**

## DECISIONS FOR THE OWNER

1. **Authored limb speed as momentum** (§7, §19): keep it as built (face value, capped per segment), or cap the frontal-plane (lateral) articulated speed at a physiological ceiling?
2. **The yield range** (±12° ab/adduction, ±20° flexion, ±20° knee swivel). Beyond it a limb is part of its body, and the bodies' approach passes through it. A wider range gives softer legs and more pass-through; a narrower one gives more body collisions.
3. **Landing priority:** a foot inside 0.06 s of its landing lands where its stance is, even through a leg (reported). Keep until 3B.2 decides where a foot can land?
4. **Positional-only contacts during Stage 3's fall placeholder** (the pump fix): keep until 3B.4 replaces the placeholder?
5. **Boot ↔ boot and planted ↔ planted** stay outside 3B: leave them to the ball contest and Stage 2's committed-foot rules, or make them 3B.2's?
6. **Frictionless limb contacts** (a leg always slides along another; no tangential impulse): keep for 3B.1?

**Then:** approve (or not) 3B.1 visually in the Lab, before any 3B.2 work.
## THE REVIEW LAB (§17)

**http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html** — *TOUCHLINE — STAGE 3B.1 LIMB CONTACT REVIEW*. Local only (real players' models). It is built on Stage 3's Lab (`occupy3/o3_lab.js`), which is unchanged.

- **Views:** **OLD STAGE 3 | STAGE 3B** side by side, synchronized, from identical inputs (key 3); or OLD alone (1) or 3B alone (2).
- **Cases (all of `l3_cases.js`):**
  - **the FLAGSHIP first**;
  - then the §10 matrix by group, each mirror under its row: ordinary contact, side by side, moving leg vs planted leg, Body Feint, Croqueta, Standing Tackle, committed-v-committed, the crossing sweep 30…150° at JOG and RUN.
  - Each case shows its node-computed line.
- **Controls (Stage 3's):**
  - PLAY · REPLAY · frame step (`,` / `.`; shift = one tick) · LOOP · 1× / 0.5× / 0.25×;
  - eight cameras;
  - SKIN / SKELETON / SKIN + SKELETON;
  - BALL (hide it for a body-only view);
  - CONTACT VOLUMES · SUPPORT · CENTRE OF MASS · BALANCE · CONTACT NORMAL · IMPACT VECTOR · RECOVERY STEP · TRAILS · FRAME DATA · DIAGNOSTICS.
- **Added for 3B:**
  - **APPROVED REFERENCE** (`e`): the authored leg drawn dashed beside the physical one wherever 3B perturbed it, to show exactly where real contact changed an authored action;
  - **LIMB CONTACTS** (`l`): each 3B pair's point, its stable normal, its depth, STRIKE / HELD;
  - **LIMB VELOCITY** (`k`): the contact point's velocity before and after, and what the impulse removed;
  - **MOMENTUM PASSED** (`m`): each impulse this tick at its point, through a limb's hip or at a body's contact point, in N·s;
  - **OLD GHOST** (`g`): OLD Stage 3's bodies over 3B's.
- **Frame data / diagnostics, per tick:**
  - the 3B contacts (pair, region, depth, closing, λ, route, held);
  - the perturbation angles and ankle displacement per leg;
  - Stage 2's correction;
  - Stage 3's impulse by source and the resulting balance class;
  - the ledger checks.
- **The FLAGSHIP ACCOUNTING panel** (in DIAGNOSTICS), OLD against 3B:
  - OLD: the strike, its source (articulated closing × limb masses), its vector on the local normal, its forward component, and the limb's speed after it (unchanged);
  - 3B: each application, its closing on the stable normal, effective masses, λ against its bound, the limb speed removed, energy before → after, its component along the heading;
  - the leads, and the ledger.
- **Automation:** `window.IL`, used by `tools/l3_browser.cjs`.
## FILES, EVIDENCE, COMMITS

**Code (new):**
- `sandbox/visual/occupy3b/`: `l3_limb.js` (the pure limb mechanics) · `l3_body.js` (the perturbed canonical body) · `l3_world.js` (the limb-contact layer + the ledger) · `l3_cases.js` (the §10 matrix, 114) · `l3_lab.js`;
- `sandbox/visual/occupy3b_lab.html`;
- `sandbox/visual/occupy3b/tools/` (each tool is listed in `HANDOFF.md`).

**Stage 3's files (hooks only, flag-free; OLD bit-identical):** `occupy3/o3_world.js`, `occupy3/o3_run.js`.

**Evidence (`evidence/`):**

| file(s) | what |
|---|---|
| `stage3_reproduction/` | the baseline before any change |
| `old_recheck/` | OLD on the final code |
| `identity_*` | before contact |
| `solo.txt` | one footballer |
| `nearmiss.*` | near misses |
| `metrics_*` | penetration, anatomy, 3B's record |
| `ball_*` | the firewall |
| `flagship.*` · `nolead.*` | the audit's failure and the equal-speed family |
| `unit_invariants.txt` | the limb layer's invariants |
| `continuity_*` | 60 Hz continuity |
| `torture.*` | Stage 3's torture with 3B |
| `two_player_possession.txt` · `two_player_early_info.txt` · `two_player_early_info_3b.txt` | possess1's tools with 3B |
| `milestone_regress.txt` | the milestone's 10 suites |
| `performance.txt` | cost |
| `lab_cases.json` · `browser.{txt,json}` | the Lab ≡ node, the browser check |

**Screenshots** (real players' models) are in the scratchpad only, never committed.

**Commits** (`prototype/player-occupancy-stage3b1`, local):

| commit | what |
|---|---|
| `41e94b8a` | the owner's instruction + the audit summary |
| `17a82c17` · `2773a3a3` | the layer, the hooks, the model, the tools |
| `35318f54` | the Lab |
| `0a97e5c1` | three faults fixed: the projection snap, the placeholder pump, the side-by-side rows; and the first-contact definition |
| `5597de1d` | the admissibility restore, the crossing sweep, the symmetric lead |
| the report commit (the branch HEAD) | the Lab's bounded cache, the accounting panel's mean-axis lead, the early-information classifier, the evidence, this report |

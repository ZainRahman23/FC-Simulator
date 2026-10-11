# PVP-1A-DX post-hoc diagnostics (11 Oct 2026, after DX run 1)

**Label:** POST-HOC DIAGNOSTICS. These are not PVP-1A and not the DX result.
- PVP-1A stays **BLOCKED** (H2; H3 also present).
- DX run 1 stays **DX-BLOCKED** (corrected evaluation, `evidence/dx_run1/PVP1A_DX_EVAL_corrected.json`).
- Nothing below was rerun as PVP-1A or the DX. No frozen script under `scripts/` was changed.
- The diagnostic plant `diag/pvp1a_sim_diag.mjs` is a copy of the frozen plant with three added options:
  - `order: "TR"` creates the tackler first;
  - `velSteps`;
  - `posSteps`.
- The frozen world settings are G1_WORLD velSteps 150, posSteps 2.

**Purpose:** classify why DX run 1 failed, with one targeted probe per suspected cause. No parameter search, and nothing tuned toward STUMBLE.

## Evidence

| file | contents |
|---|---|
| `evidence/dx_run1/PVP1A_DX_DIAGNOSTICS.json` | ISO / SOLVER / CF1 observables (`diag/pvp1a_diagnostics.mjs`) |
| `evidence/dx_run1/PVP1A_DX_DIAG_DETAIL.json` | ISO bit-equality; CF1 per-criterion first failures (`diag/pvp1a_diag_detail.mjs`) |
| `evidence/dx_run1/PVP1A_DX_CONTACT_TIMELINE.json` | per-pair cross-contact timeline for DX N2 and CF1 N2 (`diag/pvp1a_contact_timeline.mjs`) |
| `evidence/dx_run1/PVP1A_DX_ENTRY_CPU.json` | the prereg §11 entry costs that the DX CPU harness omitted (`diag/pvp1a_entry_cpu.mjs`) |
| `evidence/diag_cf1/` | the CF1 variant: fixture, records, frozen-evaluator output, probes (`diag/pvp1a_cf1_fixture.mjs`, `diag/pvp1a_cf1_execute.sh`, `diag/pvp1a_cf1_probe.mjs`) |

## D1 — Isolation (H6): the cause is body-ID solver ordering

The frozen H6 requires the tackler to match a one-character world within 1e-6 m and 1e-6 rad. The DX tackler differed by 9.0e-5 m and 7.7e-4 rad (0.09 mm / 0.044°).

| probe (C0, steps 1–36) | result |
|---|---|
| runner moved 20 m away, default creation order (tackler bodies 14–27) vs the DX C0 tackler | **bit-identical** (pos / rot / v / w, every component) |
| tackler created first (bodies 0–13), runner 20 m away vs DX SOLO_T | **bit-identical** |
| DX C0 tackler vs DX SOLO_T | 6,386 components differ, from step 1 (pelvis rot 7e-9) |
| the same "tackler first" probe on the CF1 variant | **bit-identical** (CF1's isolation gap is 3.7 mm / 1.5°) |

**Conclusion:**
- The runner's presence has zero effect on the tackler: the cross pairs are rejected in C0.
- The whole gap is Jolt's solver ordering by body ID.
- The second-created character can therefore never meet the frozen H6, while the first-created runner meets it exactly.
- **Class: preregistration defect** (an unattainable criterion), not a composition defect.
- The divergence grows with the number of the tackler's turf contacts: 0.09 mm in DX, 3.7 mm in CF1. So "tiny" is not guaranteed.

## D2 — Solver sensitivity: primary-window claims are converged

The fixture is the DX one, run with the diagnostic plant. Each N2 is compared with its own C0.

| observable | vel 75 | **vel 150 (frozen)** | vel 300 |
|---|---|---|---|
| first cross-contact step | 3 | 3 | 3 |
| primary cross impulse, N·s | 45.56 | 43.75 | 43.15 |
| runner COM displacement at step 18, mm | 7.0 | 6.8 | 6.9 |
| tackler Δv_x at step 14, m/s | −0.486 | −0.472 | −0.466 |
| tackler Δv_x at step 36, m/s | −0.611 | −0.809 | −0.799 |
| swept right foot at step 95, mm | 657 | 642 | 646 |
| runner COM displacement at step 95, mm | 146.8 | 142.1 | 143.3 |
| contact steps / 260 | 129 | 166 | 164 |
| runner first integrity failure | none | 132 | 133 |

**Conclusion:**
- Between the frozen 150 and 300 iterations, every observable moves ≤ 3 %. The frozen setting is converged for the primary window.
- Halving the iterations changes the late tackler Δv and the contact persistence.
- The runner's step-132 integrity failure moves by one step at 300 iterations, so it is not an iteration artifact.

## D3 — CF1: the tackler entry artifact, removed

**CF1 is a separately named fixture variant** (`evidence/diag_cf1/PVP1A_DX_CF1_FIXTURE.json`).
- **What changed:** only the tackler's arms.
  - Shoulders abducted 50°, elbows flexed 15°, other arm angles 0.
  - The frozen design held the arms at canonical, which put forearm_L 39.5 mm inside thigh_L.
- **What did not change:** trunk, pelvis, legs, velocities, runner, τ_act and the failed fit gates (G-T1, G-T3).
- **How it was chosen:** once, from the self-overlap cause, before any CF1 run. It was not tuned.
- **Entry geometry after the change:** no self-overlap; the lowest point is foot_R at +0.51 mm; clearance 37.72 mm (unchanged).
- **How it was run:** the **frozen** plant, runner and corrected evaluator, on all five modes plus an N2 repeat. The repeat is bit-identical (hash 20c6161b170403f8). ib_verify after the runs: 59 / 1 / 0.

| row | DX run 1 | CF1 |
|---|---|---|
| entry self-penetration, step 1 | 39.5 mm (FAIL) | 0 (pass) |
| tackler C0 mechanics, 260 steps | anchor@1, selfPen@1, angStep@3 | **clean** (anchor ≤ 0.21 mm, angular ≤ 0.0029) |
| tackler N2 primary mechanics | fail from step 1 | **pass**; first failure anchor@19, angStep@22 → trusted to step 18 |
| runner N2 trusted until | 131 | 126 |
| first contact | step 3, shank_R↔foot_L | step 3, shank_R↔foot_L |
| CG-1…6 | pass (CG-6 14.4° / 0.12°) | pass (CG-6 14.4° / 0.22°) |
| runner Δv vs C0 at n* (step 18) | 0.20 m/s | 0.197 m/s |
| runner COM displacement at step 18 | 6.8 mm | 6.9 mm |
| tackler Δv_x at steps 14 / 36 | −0.47 / −0.81 | −0.50 / −0.70 |
| swept foot at step 95 | 642 mm | 463 mm |
| N2 vs X2 within 50 ms of first contact | 70.6 mm / 5.8° (not equivalent) | 71.0 mm / 5.8° (not equivalent) |
| frozen OC-3 | FALL, eH 0.400 | FALL, eH 0.400 |
| C0 runner | fails step 1 only (unloaded: criterion conflict) | the same |
| C0 tackler LEG-tip tracking (≤ 10 mm to τ_sim / ≤ 30 mm primary) | 18.3 / 42.9 mm | 18.4 / 47.7 mm |
| frozen-evaluator verdict | DX-BLOCKED | DX-CONTROL_INVALID (labelled diagnostic) |

The evaluator's fixed strings ("— the DX entry", "also records tackler self-overlap") are hard-coded. They describe the frozen fixture, not CF1.

**Conclusions:**
1. **The arm artifact caused all of the tackler's integrity failure** in C0 and in the N2 primary window.
2. **The runner's primary-window response is insensitive to the artifact:** Δv 0.197 vs 0.20 m/s, displacement 6.9 vs 6.8 mm. The DX runner findings for steps 1–18 therefore stand on their own.
3. **Removing the artifact exposes two independent C0 blockers.** Neither depends on the arms:
   - **the runner's step-1 unloaded feet:** the frozen "every step" criterion contradicts the frozen +0.5 mm grounding (a preregistration conflict);
   - **the passive tackler does not follow the simulation's prescribed slide:** 18 mm by τ_sim and 48 mm across the primary window. The slide is unactuated (statics-only tone, no slide controller), and the fit already starts 15 mm off (G-T1).

## D4 — CF1 tackler step-19 failure: the ankle at its hard limit, under load

- **Which joint:** the separating joint is the tackler's **ankle_L**, the contacting boot's ankle. The fit left it at its −60° hard limit.
- **When:** while the runner's right foot rides on the tackler's left foot (pair active steps 7–63).
  - Separation: 0.56 mm at step 18 → 2.69 at step 19 → peak 6.74 at step 22 → < 1 mm by step 29.
  - knee_L follows at ≤ 1.3 mm.

| solver (CF1 N2) | anchor first failure | angStep first failure | max separation, steps 1–36 |
|---|---|---|---|
| vel 150 / pos 2 (frozen) | 19 | 22 | 6.74 mm |
| vel 300 | 19 | 22 | 6.26 mm |
| vel 600 | 19 | 22 | 6.50 mm |
| pos 4 | 19 | — | 3.71 mm |
| pos 8 | 20 | — | 1.66 mm |

**Conclusion:**
- This is constraint drift where a joint limit and the point constraint fight under contact load.
- More position iterations shrink it but do not remove it.
- **Class: physical-architecture limitation,** made worse by a fixture that sits at a hard limit.

## D5 — Contact timeline: the late continuation is a different event

Taken from `PVP1A_DX_CONTACT_TIMELINE.json`, DX N2:

| pair | steps | ms after activation | ΣJ, N·s |
|---|---|---|---|
| runner shank_R ↔ tackler boot (foot_L) | 3–5 | 12.5 | 5.0 |
| runner foot_R ↔ tackler boot (the sweep of the planted foot) | 7–30 | 29.2 | 61.6 |
| **runner pelvis ↔ tackler head** | **63–103** | **262.5** | **38.0** |
| runner thigh_L ↔ tackler upperArm_L | 84–90 | 350 | 7.0 |
| runner thigh_L ↔ tackler thorax | 114–131 | 475 | 5.5 |
| runner thigh_L ↔ tackler head | 171–260 | 712.5 | 13.4 |

**What the timeline shows:**
- From 262 ms, the passive tackler, still sliding, drives its head into the runner's pelvis.
- In C0 its body passes through the space the runner stands in.
- The simulation has no such event:
  - there, the runner takes its three STUMBLE steps (0.32 s each) out of the way;
  - here, neither body has a stepping or slide controller, so the runner stays where it stood.
- **So the continuation after about step 60 is not evidence about STUMBLE in either direction.** The runner's late fold over the tackler, visible at step 260, follows this non-authoritative collision.
- CF1 shows the same pattern (head ↔ pelvis from step 61).

## D6 — Entry CPU (prereg §11, omitted by the DX CPU harness)

| entry step | median | p95 | max | replays |
|---|---|---|---|---|
| MC-1 runner entry | 41.0 ms | 42.4 ms | 49.1 ms | 20 |
| primary tackler fit (36 deterministic starts, ≤ 1,500 LM iterations each) | **45.7 s** | 45.9 s | 45.9 s | 5 |

Measured on an Apple M4, node v22.19.0. The fit is an offline construction; it is not a runtime cost.

## Cause classification of the PVP-1A / DX failures

| failure | cause | class |
|---|---|---|
| H2: fit gates infeasible (best worst-ratio 1.39) | the simulation's slide primitives are not realisable by the anatomical body: hip separation 0.265 vs 0.190 m | representation mismatch (authoritative primitives vs V2 anatomy) |
| H3 / INITIALIZATION_INVALID: self-overlap 39.5 mm | the preregistered entry construction held the arms at canonical | **design defect in the entry contract** (CF1 removes it) |
| C0 runner: step 1 unloaded | "every step loaded" vs +0.5 mm grounding | **preregistration conflict** |
| C0 tackler: tracking 18 / 43–48 mm | unactuated passive slide vs a prescribed authoritative trajectory, plus the 15 mm fit error | **architecture limitation** (no slide controller) |
| H6: isolation | body-ID solver ordering (confirmed bit-exactly) | **preregistration defect** (criterion unattainable for the second character) |
| OC-3 non-discriminating | static COM-to-left-ankle offset ≈ 0.22 m plus the 0.139 obstacle term ≥ the 0.352 boundary already, so C0 and pre-contact also classify FALL | **evaluator-definition defect** |
| OC-3 direction (post-hoc) | physical contact effect forward, vs the simulation's contact term toward the left foot | **genuine model disagreement** (reduced model vs physics) |
| tackler sustained-contact drift (CF1 step 19) | ankle at hard limit, under load | physical-architecture limitation |
| runner anchor failure at step 132 (127 in CF1) | not localised; after the non-authoritative head ↔ pelvis contact | late-window limitation |
| DX-C1, DX-C2 | evaluator omission / 2-D normalisation bug | **harness bugs** (corrected separately; originals preserved) |

**Stopping point:** each suspected cause has one probe and a determinate answer. Further runs would be parameter search; per the instruction, I stopped here.

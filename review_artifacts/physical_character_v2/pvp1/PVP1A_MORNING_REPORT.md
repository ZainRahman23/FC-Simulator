# PVP-1A MORNING REPORT (11 Oct 2026)

**Case:** IB1-SR (`rx_behind_standing`). A standing 73 kg runner is slide-tackled from behind by a 78 kg tackler. The boot strikes the planted right shin at τ 51.5. The authoritative outcome is STUMBLE (recoverable). The simulation is V1.3 at 5042230, gameplay hash a2678624.

**Documents:**
- preregistration: `PVP1A_PREREGISTRATION.md` (frozen, d7fb69a1);
- stop record: `PVP1A_STOP_H2.md`;
- diagnostic protocol: `PVP1A_DX_PROTOCOL.md`;
- corrections: `PVP1A_DX_CORRECTIONS.md`;
- post-hoc diagnostics: `diag/PVP1A_DX_DIAGNOSTICS.md`;
- successor proposal: `PVP1A_R1_SUCCESSOR_PROPOSAL.md`.

## 1. Verdict: **BLOCKED**

**PVP-1A** stopped at hard stop **H2, TACKLER_FIT_BLOCKED**, before any physics was stepped.
- No V1-matched pose fits the simulation's slide primitives within the frozen 10 / 30 mm. The best worst-gate ratio is 1.39, because the primitives encode 0.265 m hip spacing against the body's 0.190 m.
- The same entry also self-penetrates (H3).

**PVP-1A-DX** is a separately named diagnostic: the identical frozen design, run with the best-available, gate-failing entry. Its corrected verdict is **DX-BLOCKED**:
- INITIALIZATION_INVALID: the tackler's forearm sits 39.5 mm inside its thigh;
- CONTROL_INVALID_PRIMARY;
- the tackler's native integrity fails from step 1;
- OUTCOME_INCONSISTENT (runner) under the frozen OC-3;
- VISUAL_PENDING.

Nothing here is a PASS or a PARTIAL. No criterion was waived or retuned.

## 2. What happened physically (DX N2; the runner is trusted to step 131 = 0.546 s)

- **Step 3 (12.5 ms after activation; τ 51.75 vs the simulation's 51.5):** the tackler's boot strikes the runner's planted right shin.
  - Location: 42 mm from the simulation's contact point, at 0.896 of the shin's length (simulation 0.911).
  - All six correspondence rows CG-1…6 pass.
  - Impulse: 5.0 N·s.
- **Steps 7–30:** the boot rides **under the runner's planted right foot** (61.6 N·s).
  - The foot is swept forward 317 mm by 150 ms and about 650 mm by 0.4 s.
  - It lifts at most 44 mm and is replanted by about step 95–100.
- **Runner whole-body response:**
  - COM Δv vs C0: 0.20 m/s, mostly forward, at n\* (step 18).
  - Pelvis drop ≤ 13 mm through 150 ms.
  - No non-foot turf contact, at any point in the record.
- **Tackler:** decelerates by 0.47 m/s by step 14 and 0.81 m/s by step 36, relative to its own no-contact run. In DX it is untrusted (entry artifact).
  - The CF1 variant (arms cleared) gives clean mechanics to step 18 and the same picture: −0.50 / −0.70 m/s.
- **Momentum:** equal and opposite holds exactly. Total cross impulse on the runner over the record is 111 N·s, about 12° off forward.
- **From step 63 (262 ms):** the passive tackler, still sliding, drives its **head into the runner's pelvis** (38 N·s), and later its arm, thorax and head into the left thigh.
  - The simulation has no such event; there, the runner steps away.
  - The runner's late fold over the tackler follows this collision.

## 3. What happened visually

The frames were checked against the records. Review page: §14.
- **Gameplay view (A, 1×):** a small, quick event. The tackler slides in, the runner's right foot is shoved forward along the slide, and the runner stays upright with its legs split.
- **6× close view (B):** the boot visibly meets the shin, then slides under the foot.
- **Side-by-side (D):**
  - In C0 the tackler slides straight **through** the runner (cross contact disabled).
  - In N2 it is stopped at the runner's feet, and the swept foot is clearly displaced.
- **Late continuation:** the runner folds forward over the tackler. That happens after the non-authoritative head-to-pelvis collision, and after the runner's trust ends.
- **It does not read as a stumble.** The runner never steps; nothing in either body can step.
- The tackler's pre-activation pose is constructed (labelled on screen).
- **Visual value: VISUAL_PENDING.** That verdict is yours.

## 4. Did both players react?

**Yes.**
- **Runner:** detectable vs C0 from step 3, and the whole body by step 15.
- **Tackler:** detectable from step 3 (foot_L, shank_L, thigh_L, pelvis), with a measurable Δv.
- **Caveat:** the tackler's DX mechanics are untrusted. CF1 confirms the reaction with a trusted tackler through the primary window.

## 5. Did contact propagate plausibly?

**Yes, in order and timing** (first detectable step vs C0):

| runner body | step |
|---|---|
| struck leg (shank_R, foot_R, thigh_R) | 3 |
| pelvis | 5 |
| foot_L | 6 |
| shank_L | 7 |
| thigh_L | 8 |
| abdomen | 10 |
| thorax | 11 |
| forearms | 12–13 |
| head, upper arms | 14–15 |

- That is proximal along the chain from the struck limb.
- The runner's remote bodies (head, arms) stay below detectability for 9–12 steps after contact.
- The tackler chain runs boot → leg → pelvis → trunk → arms. Its thorax becomes detectable at step 6, three steps after contact.

**Magnitudes are a different model from the simulation's, compared descriptively:**

| quantity | physics | simulation |
|---|---|---|
| primary-window cross impulse | 43.8 N·s | J 75.6 |
| runner Δv | 0.20 m/s | dvCom 0.26 |
| tackler Δv | 0.47 m/s | 0.97 |

## 6. Did sustained native contact matter?

**Yes, decisively.**
- N2 vs X2 (contact cut after the first contact step): 70.6 mm / 5.8° within 50 ms of first contact, against an equivalence limit of 10 mm / 3°. CF1 gives the same: 71.0 mm / 5.8°.
- 89 % of the primary-window impulse is the **sustained boot-under-foot phase**; the initial shin strike is 11 %.
- Contact persisted 166 of 260 steps.

## 7. Consistency with STUMBLE

**Not established, and not physically contradicted.**

**Frozen OC-3:** FALL (eH 0.400 vs boundary 0.352). The row is **non-discriminating**:
- it also classifies C0 (0.363) and the pre-contact standing state (0.358) as FALL;
- under the simulation's own law, the **no-contact** baseline is FALL (eH 0.356).

**Where the simulation's STUMBLE comes from (post-hoc):**
- The simulation's contact term pushes the runner's XcoM back toward the left (stance) foot. That reduces the error to 0.312, which classifies as STUMBLE.
- The physical contact-induced change points **55° away** (forward, heel driven along the slide), at 0.72× the size. Classified by the same law, it gives FALL (0.386).
- So the reduced model and physics disagree on the **direction** of the push.

**Physically, within the trust window:** no collapse, no non-foot contact, runner supported (OC-1, OC-2 pass).

**What cannot be tested:** the three STUMBLE steps. There is no stepping controller.

## 8. Causes of failures (classified with one probe each; `diag/PVP1A_DX_DIAGNOSTICS.md`)

| failure | cause | class |
|---|---|---|
| H2 (fit infeasible) | the simulation's slide primitives are anatomically unrealisable | representation mismatch |
| H3 (self-overlap 39.5 mm) | the preregistered entry held the arms at canonical | entry-contract design defect (CF1 removes it) |
| C0 runner (step 1 unloaded) | "every step loaded" vs the frozen +0.5 mm grounding | preregistration conflict |
| C0 tackler (tracking 18 / 43–48 mm) | an unactuated slide cannot follow a prescribed trajectory | architecture limitation |
| H6 (isolation) | Jolt solver ordering by body ID (bit-exact probes) | preregistration defect (unattainable for the second character) |
| OC-3 | the double-support baseline is already past the FALL boundary | evaluator-definition defect, plus a genuine push-direction disagreement |
| tackler drift at step 19 (CF1) | ankle at its −60° hard limit, under the runner's foot load; position iterations shrink it, velocity iterations don't | physical-architecture limitation |
| DX-C1, DX-C2 | evaluator omission; 2-D normalisation bug | harness bugs (corrected separately, originals preserved) |

## 9. What the experiment proves (scoped: IB1-SR, offline, DX entry)

- Two V2 characters compose in **one unmodified Jolt world**: deterministic, neutral, about 1.06 ms per step.
- Native contact occurs at the authoritative instant, segment, region and normal (CG-1…6), with no hidden impulses.
- The response propagates through both articulated bodies in kinematic order.
- The runner's first 75 ms are **robust** to solver iterations (≤ 3 %) and to the tackler's arm artifact (0.197 vs 0.20 m/s).
- Sustained native contact materially changes the result. Here, physics adds information an impulse model does not have.
- The frozen OC-3 cannot discriminate in double support.
- For this case, the reduced contact model's push direction disagrees with physics.

## 10. What it does not prove

- Any PASS: there is no valid tackler entry and no valid C0.
- STUMBLE consistency, recovery, stepping or falls.
- A trusted tackler in DX.
- Anything after about 260 ms: the non-authoritative contact begins there.
- Anything about moving players / RUN-1: sim vs LV2 legs are 0.20 / 0.25 m apart.
- Live neutrality.
- Visual acceptance.
- Generality beyond one case.
- R0's global qualification (G0 never waived).

## 11. CPU (Apple M4, node 22.19, instrumentation off, 20 replays)

| item | median | p95 |
|---|---|---|
| two-character step, steps 1–36 | 1.05–1.07 ms | 1.24–1.25 ms |
| two-character step, steps 1–260 | 1.06 ms | 1.20–1.22 ms |
| Jolt share of a step | 0.61–0.63 ms | — |
| passive share of a step | 0.38 ms | — |
| 50 ms event | 13 ms | — |
| 150 ms event | 38–39 ms | — |
| construction | 8 ms | — |
| X2 snapshot + restore | 1.2 ms | — |
| MC-1 runner entry (post-hoc; the DX harness omitted it) | 41 ms | — |
| tackler fit (post-hoc; offline construction, not a runtime cost) | **45.7 s** | — |

## 12. Determinism and neutrality

**Determinism: bit-identical.**
- C0 and N2: two fresh processes, plus a reverse-order batch, over 260 steps.
- The X2 no-op restore.
- The CF1 N2 repeat.

**Neutrality:**
- ib_verify 59 / 1 / 0 before and after the DX run, and after CF1.
- Gameplay hash a2678624 unchanged.
- Read-only. LIVE_NEUTRALITY_NOT_TESTED.

**Isolation:**
- The runner is bit-identical.
- The tackler fails the frozen H6 (0.09 mm / 0.044°). The diagnosis is solver ordering by body ID, not composition (D1).

## 13. Commits and files (`prototype/physical-character-v2`, local only, not pushed)

| commit | contents |
|---|---|
| 25a87d55 | the mission instruction, verbatim (`sources/2026-10-11_user_instruction_pvp1a_overnight_mission.md`) |
| d7fb69a1 | PVP-1A preregistration frozen (`PVP1A_PREREGISTRATION.md`) |
| 9fa1f57a | PVP-1A stopped at H2 (`PVP1A_STOP_H2.md`, `fixture/`, the fit-feasibility evidence); DX protocol frozen |
| 0a829068 | DX pre-run freeze (`PVP1A_DX_FREEZE.json`; `scripts/pvp1a_sim / run / eval / batch / cpu / execute`) |
| 78497138 | DX run-1 evidence plus corrections DX-C1 / C2 (`evidence/dx_run1/`, `PVP1A_DX_CORRECTIONS.md`) |
| fa34dd1f | visuals and the post-hoc OC-3 audit (`render/`, `review/`, `scripts/pvp1a_posthoc.mjs`) |
| **latest** | post-hoc diagnostics (`diag/`, `evidence/diag_cf1/`, `evidence/dx_run1/PVP1A_DX_{DIAGNOSTICS,DIAG_DETAIL,CONTACT_TIMELINE,ENTRY_CPU}.json`), the R1 proposal, this report, a DECISIONS entry |

- Lossless review frames (2,007 PNGs, 437 MB) are kept outside Git, with checksums (`review/frames.OUTSIDE_GIT.md`).
- No change was made to RUN-1, the LV2 baseline, the authoritative simulation, or any frozen PVP-1A script.

## 14. Where to look

Open **http://127.0.0.1:8350/pvp1/review/PVP1A_REVIEW.html**.
- If the server has stopped, restart it with `python3 -m http.server 8350 --bind 127.0.0.1 --directory "review_artifacts/physical_character_v2"`, run from the worktree root.

**What to watch:**
1. **D (C0 | N2):** press **first contact**, then step with **frame ▶** through about step 30 to see the shin strike and the foot sweep. Then jump on to see the late collision.
2. **B (6× close):** use 0.1× for the strike.
3. **C (diagnostic):** shows the contact points, normals and impulses, and the simulation's primitives as dashed outlines.
4. **E (N2 | X2):** shows what continued contact does.

The charts and the frozen-criteria table are further down. The page's top card summarises tonight's diagnostics.

## 15. Recommended next action

1. **Review the visuals** (about 15 minutes; VISUAL_PENDING).
2. **Rule on the push-direction finding before any further PvP work.** Under its own law, the simulation's STUMBLE for IB1-SR depends on a contact push back toward the stance foot that physics does not produce. No rerun can change that. It is an authority-level question: should this label be expected to be physically explicable at all, given the law's double-support baseline? No experiment of mine should settle it by tuning.
3. **If you still want a trusted two-player run,** approve **PVP-1A-R1** as an explicitly exploratory development run:
   - a template entry with the arm and joint-margin rules;
   - slot-matched isolation;
   - the window of claim ending at the first non-authoritative contact;
   - OC-3a / OC-3b.
   It reuses the harness (about half a day), and its expected verdict, PARTIAL, is frozen in advance.
4. **Don't start PVP-1B or any moving case** until the stepping-executor and LV2-leg-geometry questions are decided.

**Why:** the remaining failures are a known geometry mismatch, two spec defects, one evaluator defect and missing controllers. Another IB1-SR run would only add trusted-tackler confirmation, not answer the STUMBLE question.

## What surprised me

- **Under the simulation's own balance law, the no-contact standing runner is already FALL.** The tackle *rescues* it to STUMBLE by pushing it back toward its stance foot.
- **The decisive physical event is a sweep, not a hit.** The shin strike is 5 N·s; the boot riding under the rigid planted foot is 62 N·s. The rigid foot is doing most of the work.
- **The simulation's slide is anatomically impossible** for the body it represents: the hips are 75 mm too far apart.
- **The runner ignored the tackler's arm artifact entirely** for 75 ms. The leg contact dominates everything early.
- **The passive tackler head-butts the runner at 262 ms.** The continuation shows what the architecture lacks (controllers), not what a tackle does.
- **The isolation failure is bit-exactly solver ordering:** swap the creation order and it vanishes.
- **A single tackler fit costs 45.7 s;** a two-player physics step costs about 1 ms.

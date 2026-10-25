# TOUCHLINE — STAGE 3B.1 LIMB MOMENTUM CALIBRATION

**Status: STOPPED for the owner's visual review of the calibrated 3B.1.** Local only: not pushed, merged, frozen or published. **Stage 3B.2 not started. Stage 3 not modified.**

- **Branch:** `prototype/player-occupancy-stage3b1` (from Stage 3 `88a964ba`).
- **Commits:** 3B.1 as first built `469a080f` · calibration `3625f925` · this report the report commit (the branch HEAD).
- **Lab:** **http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html** (local only). By default the left viewport is OLD STAGE 3 and the right the CALIBRATED 3B.1 (F+M). Either viewport can show any formulation, including 3B.1 as first built (A).
- **Instruction (verbatim):** `sources/2026-10-25_user_instruction_stage3b1_calibration.md`.
- **The 3B.1 report** (`L3_REPORT.md`) stays as the description of the architecture. Its numbers are formulation A's; `evidence/` now holds the calibrated runs.

## THE ANSWERS

**1. Why the ordinary jogging thigh brush became STRONG.**
3B.1 computed a limb point's velocity as *the root's physical velocity + the point's authored motion relative to its frame*. That frame includes **Stage 2's positional pushes**, and in the flagship Stage 2 was pushing the two bodies apart by 3–10 mm a tick.

The canonical legs follow their planned footholds, not their hips. After a 1 cm push the knee has followed only 54 % (the ankle 26 %) one tick later. So each knee *lagged* its pushed-away hip, and 3B.1 read that lag as the knee swinging toward the opponent:
- the defender's knee moved toward the carrier at **0.48 m/s** in the world, and 3B.1 counted **2.04 m/s**;
- with the larger closing, the yield hit its speed limit and the knee locked stiffer (17.5 kg instead of 3.9 kg), so λ grew faster still.

Result: 18.05 + 25.45 = 43.5 N·s and STRONG / RECOVERY STEP for both.

**2. Is that physically justified? No.** Most of it was a *positional, separating* correction read as *closing* momentum, which is the animation-made momentum the audit forbade, plus the stiffening that followed from it. What is genuine is a modest authored knee swing. The carrier's knee does move toward the defender relative to its hip (about 1.7 m/s at that phase of the carry; the jogging defender's knee at most 1.0 m/s). That swing, correctly measured, produces a bump, not a recovery step.

**3. Recommended formulation: F+M.**
- **F:** count only motion that some state of ours can **lose**: the root's translation (Stage 3's u) and the limb's own articulation about its hip (3B's yield). The drawn frame's pushes appear only as the counterpart of the limb's lag behind its pushed hip, so their net is the part of a push the limb actually followed, always separating. **A positional correction can now only reduce a closing.**
- **Excluded:** the pelvis's authored sway / transfer, Stage 3's own posture response, and the facing's rotation (nothing in the model carries or loses them).
- **+M:** the articulated effective mass (the limb's own plus its body's at the hip).
- This is, in effect, your candidate C done correctly: C (root + limb about its parent) still carried the lag artifact. §3 explains why A, B, C, D and E were rejected.

**4. The flagship 18.05 + 25.45 N·s becomes 4.71 + 2.55 + 1.44 + 1.82 = 10.52 N·s** (four smaller contacts).
- Each contact is at its bound; energy goes to 0, and 0.0012 N·s lies along the pair's mean heading.
- With the legs no longer shoved apart, the bodies brush too: Stage 3's own trunk contact adds 11.14 N·s (paired, its channel as always).
- **Both players MODERATE / CORRECT**, no step, Δv 0.30 / 0.07 m/s. The defender, braced, sends more into the ground.
- The lead along the pair's mean heading is **0.5 cm** (OLD 16.6, 3B.1-A 2.0).

**5. Brush, strong collision and limb strike** separate by physics alone, with no role rules. First contacts under F+M (§4):

| kind | what drives it | first-contact λ | Stage 3 |
|---|---|---|---|
| **brush** (parallel, glancing, walking head-on, shallow crossing) | only the limbs' own small articulation; no body approach | 0.1–5 N·s | LIGHT / MODERATE, CORRECT |
| **strong collision** (head-on jog 39.3, firm oblique 35.1, turning into each other 28.3, crossing at 90° 18.4) | the **bodies'** approach, passed through a leg at its range or a body side, with the bodies' masses (20–40 kg at the point) | 18–40 N·s | STRONG, RECOVERY STEP, some fall candidates |
| **genuine limb strike** (a leg swung into a standing player 27.9, Croqueta sweeps 39.2 / 46.7, a tackle into a Croqueta 24.1, a run-crossing boot into a shin 26.7) | the swinging limb's own articulation, capped at 3 / 4.5 / 6 m/s for thigh / shin / foot, often with a limb at its yield speed limit | 24–47 N·s | STRONG / SEVERE where the body is committed or on one foot |

**6. Is 3B.1 now strong enough to freeze as the foundation for 3B.2? Yes, I recommend it, subject to your visual review.**
- The source term is now principled and auditable to the N·s.
- Every invariant holds: energy, bound, pairing, rotation, mirror, determinism, tangential, and exactness before contact.
- The flagship artifact is gone.
- On the full sets it cuts OLD Stage 3's time with legs > 5 cm inside each other by 38–63 %.
- Its fall candidates are fewer than OLD's in three sets, equal in one, and two more in the full matrix (24 → 26).
- Against 3B.1-as-first-built it has fewer fall candidates and recovery steps everywhere, and slower limbs.
- It has somewhat more penetration than A on the two largest sets (timings 1974 → 2105, search 1478 → 1845 ticks), because gentler impulses push the bodies apart less.

What 3B.2 inherits is listed in 7. Nothing in it argues against starting 3B.2 on this foundation.

**7. Failures found, deliberately deferred** (§8; current numbers):
- crossed legs (the full matrix 1031 → 1305, timings 3431 → 4256);
- legs landing into each other (deepest 22.4 cm, unchanged);
- boot ↔ boot and planted ↔ planted (unresolved by design);
- landing obstructions and steps into the opponent;
- the larger planted-foot slide where Stage 3 moves a body (up to 15.9 cm);
- Stage 3's committed-defender runaway (still present, Stage 3's);
- the hip range ≤ 2° beyond in a few leg-ticks;
- the yield speed limit (12 rad/s), which still stiffens a limb in hard strikes — the next lever if strikes ever look too strong;
- the canonical carry's 2–5 m/s knee whip after touches (authored; counted, within the caps).
## 1. THE FLAGSHIP, DECOMPOSED — where 18.05 and 25.45 N·s came from (§1)

`evidence/flagship.txt` lists every application. Velocities are on the stable contact normal [0.05, −1.00]; + means toward the other player. **"Frame"** is the root plus Stage 3's offset, which includes Stage 2's positional pushes.

| contact (3B.1 as first built, A) | side | root (physical) | frame | sway | limb about its hip | the drawn point in the world | **A used** | effective mass |
|---|---|---|---|---|---|---|---|---|
| 1.029 s, THIGH_R \| THIGH_L | ATT | +0.17 | −0.54 | −0.14 | +1.65 | **+0.95** | **+1.66** | 13.5 kg |
| | DEF | +0.06 | −0.31 | −0.09 | +0.82 | **+0.35** | **+0.72** | 17.5 kg |
| → closing 2.37 m/s × reduced mass → **18.05 N·s** | | | | | | | | |
| 1.729 s, THIGH_R \| THIGH_L (knee) | ATT | +0.07 | −0.89 | −0.31 | +3.59 | **+2.40** | **+2.55** | 11.2 kg |
| | DEF | −0.11 | **−2.34** | +0.12 | +2.69 | **+0.48** | **+2.04** | 11.0 kg |
| → closing 4.59 m/s × reduced mass → **25.45 N·s** | | | | | | | | |

**What A did.** A computes a limb point's velocity as *the root's physical velocity + (the point's authored motion − its frame's motion)*.
- In the four ticks before the second contact, **Stage 2's positional separation pushed the roots apart by 3–10 mm per tick** (1.2–2.5 m/s equivalent; `evidence/calibration/` and the frame column). Meanwhile the roots' physical velocities on the normal were about ±0.1 m/s.
- The legs did not follow those pushes: the canonical legs are world-anchored. So relative to its pushed-away hip, each knee *appears* to swing toward the opponent.
- The defender's knee moved toward the carrier at **0.48 m/s in the world**; A counted **2.04**. A turned a separating positional correction into **closing momentum**: animation/correction-made momentum, the failure class the audit forbids.

**A second, amplifying effect.** With a large closing, the yield would exceed a degree of freedom's speed limit (12 rad/s), so 3B.1 locks that DOF and the limb acts stiffer. At this closing the defender's knee acted as **17.5 kg; the same knee yields as 3.9 kg** at the calibrated closing. So λ grew faster than the closing.

**What is genuine.** The carrier's right knee really does swing toward the defender relative to his hip. Alone, at that phase of the carry, it moves about 1.7 m/s laterally about the hip (`evidence/calibration/rig.txt`). The defender's jogging knee moves at most 1.0 m/s.

**So the 43.5 N·s brush was mostly two artifacts** (positional pushes read as closing, and the heavier-limb amplification) **on top of a modest genuine knee swing.**

## 2. TWO FACTS ABOUT THE CANONICAL RIG, MEASURED (`tools/l3_rig.mjs`, `evidence/calibration/rig.txt`)

**(1) The push response.** Stage 2's 1 cm lateral root push (`shiftPlan`) was applied at 40 ticks across a gait cycle, and the poses compared with the un-pushed run:

| after | hip | mid-thigh | knee | mid-shin | ankle |
|---|---|---|---|---|---|
| 1 tick | 0.94 | 0.75 | **0.54** | 0.37 | **0.26** |
| 4 ticks | 0.94 | 0.80 | 0.67 | 0.58 | 0.51 |
| 12 ticks | 0.97 | 0.91 | 0.95 | 0.98 | 1.00 |

These are the medians of the fraction of the push each point followed. The legs follow their planned footholds and catch up over about 0.05 s. **Any formulation that measures a limb relative to its pushed frame reads the lag as limb motion** (A, B, C).

**(2) The authored speeds, alone** (the opponent parked 40 m away). In m/s, median · p90 · max:

| action | knee about its hip, lateral | knee about its hip, sagittal | pelvis about the root, lateral |
|---|---|---|---|
| jog, no ball | 0.19 · 0.83 · **1.01** | 1.42 · 2.82 · 8.38 | 0.01 · 0.20 · 0.21 |
| carry jog | 0.29 · 1.18 · **4.85** (just after each touch) | 1.36 · 3.54 · 10.29 | 0.04 · 0.39 · 0.41 |
| carry run | 0.46 · 1.57 · 4.62 | 1.70 · 4.71 · 14.10 | 0.08 · 0.28 · 0.40 |
| Croqueta | 0.30 · 1.55 · 10.74 | 1.41 · 3.95 · 19.51 | 0.12 · 0.41 · **2.28** (the transfer) |
| Body Feint | 0.29 · 1.26 · 11.31 | 1.16 · 3.34 · 13.29 | 0.02 · 0.37 · 1.18 |
| Standing Tackle (to first touch) | 0.00 · 0.44 · 3.05 | 0.00 · 0.76 · 2.80 | 0.00 · 0.23 · 2.05 |

- The jog's lateral knee motion is realistic (≤ 1 m/s).
- The carry adds a 2–5 m/s lateral **knee whip just after each touch**.
- The maxima of 10–20 m/s are single-tick re-plan blends. They are why 3B.1 caps a limb's relative source speed (3.0 / 4.5 / 6.0 m/s for thigh / shin / foot). The caps are unchanged.
- **The pelvis also moves relative to the root**: small sway in locomotion, a 2.3 m/s lateral transfer in the Croqueta, up to 2 m/s in the tackle.

## 3. THE FORMULATIONS (§2) — physical reading and verdict

Every formulation keeps 3B.1's solve exactly: one impulse per pair and pass, the bound λ ≤ −v_n/(w_A+w_B), the yield, paired impulses, energy never gained. **They differ only in the source velocity and the mass model.**

| | the limb point's velocity | a body side's velocity | verdict |
|---|---|---|---|
| **A** (3B.1 as first built) | root's physical velocity + (authored motion − the frame's) | root's physical velocity | **rejected.** The frame includes Stage 2's pushes and the legs lag them, so separating corrections become closing momentum |
| **B** (your "contact-normal relative surface velocity only") | A's velocities on the **local** capsule normal | as A | **rejected.** A already uses only the normal component (the tangential test proves it), so B differs only by the normal. That reinstates the tilted local normal in parallel contacts (OLD's forward wedge) and keeps A's artifact |
| **C** (your "limb relative to its articulated parent + the bodies' root closing, no double counting") | root's physical velocity + the body's turn + the limb's articulation about its hip | root's physical velocity | **rejected as stated.** No double counting, but the limb-about-hip term still contains the leg's lag behind its pushed hip (it lags the frame, while C measures the frame by the physical velocity). Flagship 35.0 N·s |
| **D** (your "actual relative velocity of the two contacting surfaces, stable normal") | the drawn point's world velocity | the drawn surface's world velocity | **rejected: feedback.** The drawn surfaces include Stage 3's own posture response and a planted leg's IK response to its pushed body. In croq-early a **planted** knee read +1.7 m/s toward the opponent while its root moved away at −0.67; Σλ escalated 77 → 245 N·s (croq-early), 67 → 198 (both-committed) |
| **E** | the drawn frame + the body's turn + the limb about its hip | root's physical velocity | close to F, but counts the facing's rotation, which no state of ours carries or can lose (+25–40 % in turning contacts: croq-early 53 vs 38, in-croq 35 vs 28) |
| **F** | the drawn frame (root + Stage 3 offset + pushes) + the limb's articulation about its hip | root's physical velocity | **the principle** (below) |
| **+M** (any) | | | the **articulated effective mass**: a yielding limb's inverse mass = its own (hip held) + its body's at the hip. The body behind the hip moves too, and its share is fed back into the Gauss–Seidel passes so nothing is applied twice. About 10–18 % less than the hip-held mass |

**The principle behind F.** *An impulse may only come from momentum that some state of the model can actually lose.* Our model has two such states:
1. the root's translation, through Stage 3's u;
2. the limb's articulation about its hip, through 3B's yield.

Everything else is excluded:
- the pelvis's authored sway / transfer relative to the root;
- Stage 3's own posture response;
- the facing's rotation.

Nothing loses those, so counting them creates free momentum, exactly what the Astra discipline forbids.

The frame's positional pushes stay inside "frame" only as the counterpart of the limb's lag behind its pushed hip. Their net is the fraction of the push the limb actually followed, which is always separating (Stage 2 pushes apart). So **a positional correction can now only reduce a closing, never create one.**

**Recommended: F+M.**
## 4. THE CONTACT SPECTRUM (§3) · `evidence/calibration/spectrum.{txt,json}`, `tools/l3_calib.mjs`

**The setup.**
- 30 encounter types, each with its mirror and with the world turned 37°, run under every formulation: A, B, C, D, E, F, D+M, E+M, F+M.
- **The like-for-like comparison is the first contact.** Everything before it is identical under every formulation (§9), so its tick, pair and geometry are the same and only the source term differs.
- Later contacts are not comparable this way: a softer first contact changes what happens next.

**The table.** Each formulation column reads closing m/s → λ N·s at the first contact. The last column is the encounter's worst Stage 3 response per player, A → F+M (M moderate · ST strong · S! severe · L light / C correct · A absorb · STEP recovery step · STAG stagger · FALL fall candidate).

| case | first contact | A | B | C | D | E | F | F+M | Stage 3, A → F+M (ATT · DEF) |
|---|---|---|---|---|---|---|---|---|---|
| side | thigh–thigh @1.03 s | 2.4 → 18.1 | 2.0 → 8.6 | 2.6 → 20.0 | 1.3 → 4.1 | 1.5 → 4.9 | 1.6 → 5.1 | 1.6 → **4.7** | ST/STEP · ST/STEP → M/C · M/C |
| side-run | no limb contact | — | — | — | — | — | — | — | M/C · M/C → M/C · M/C |
| side-walk | no limb contact | — | — | — | — | — | — | — | — · — → — · — |
| glance | knee–knee @1.01 s | 3.1 → 9.5 | 3.1 → 9.5 | 2.3 → 7.0 | 1.7 → 5.3 | 1.0 → 3.0 | 1.0 → 3.0 | 1.0 → **2.6** | M/C · M/C → L/C · M/C |
| run-past | knee–shin @-1.84 s | 5.9 → 19.7 | 5.9 → 19.7 | 5.7 → 19.2 | 5.1 → 17.1 | 4.9 → 16.5 | 4.9 → 16.5 | 4.9 → **14.5** | M/C · M/C → M/C · M/C |
| oblique-firm | knee–knee @1.02 s | 5.7 → 41.6 | 5.7 → 41.6 | 5.6 → 41.0 | 4.5 → 32.9 | 5.6 → 40.9 | 5.6 → 41.0 | 5.6 → **35.1** | S!/FALL · S!/FALL → S!/FALL · S!/FALL |
| turn-into | knee–knee @1.01 s | 4.5 → 33.1 | 4.5 → 33.1 | 4.4 → 32.0 | 3.6 → 26.5 | 4.4 → 32.6 | 4.4 → 32.6 | 4.4 → **28.3** | ST/STEP · M/C → ST/STEP · M/C |
| headon-jog | knee–knee @1.01 s | 6.2 → 47.1 | 6.2 → 47.1 | 6.1 → 46.0 | 5.1 → 38.4 | 6.0 → 45.8 | 6.0 → 45.8 | 6.0 → **39.3** | S!/FALL · S!/FALL → S!/FALL · S!/FALL |
| headon-walk | knee–knee @1.38 s | 3.0 → 10.7 | 3.0 → 10.7 | 2.9 → 10.2 | 0.4 → 1.3 | 0.2 → 0.8 | 0.2 → 0.7 | 0.2 → **0.7** | M/C · M/C → M/C · M/C |
| static-jog | knee–knee @0.97 s | 2.4 → 34.2 | 2.4 → 34.2 | 2.4 → 33.7 | 2.4 → 33.5 | 2.4 → 32.2 | 2.4 → 32.2 | 2.4 → **27.9** | ST/STEP · ST/STEP → M/C · L/C |
| static-walk | knee–knee @1.77 s | 1.0 → 6.0 | 1.0 → 6.0 | 0.3 → 1.8 | 0.5 → 2.8 | 1.5 → 8.3 | 1.5 → 8.3 | 1.5 → **8.3** | M/C · L/C → M/C · L/A |
| x90-jog | knee–knee @1.07 s | 3.3 → 22.6 | 3.3 → 22.6 | 3.3 → 22.7 | 2.8 → 19.4 | 3.2 → 21.7 | 3.2 → 21.7 | 3.2 → **18.4** | S!/FALL · S!/FALL → S!/FALL · S!/FALL |
| x60-jog | knee–knee @1.05 s | 3.2 → 19.6 | 3.2 → 19.6 | 3.2 → 19.7 | 2.9 → 17.6 | 3.2 → 19.4 | 3.2 → 19.4 | 3.2 → **16.7** | S!/FALL · ST/STEP → ST/STAG · ST/STEP |
| x120-run | foot–shin @1.21 s | 9.3 → 31.2 | 9.3 → 31.2 | 8.9 → 29.8 | 5.9 → 19.6 | 8.7 → 29.1 | 8.7 → 29.1 | 8.7 → **26.7** | S!/FALL · S!/STAG → ST/STEP · ST/STEP |
| x150-jog | knee–shin @1.18 s | 3.5 → 30.8 | 3.5 → 30.8 | 3.4 → 29.8 | 1.2 → 10.4 | 1.9 → 17.0 | 1.9 → 17.0 | 1.9 → **14.1** | ST/STEP · ST/STEP → S!/FALL · S!/STAG |
| x30-run | thigh–thigh @1.35 s | 3.2 → 19.9 | 3.2 → 19.9 | 2.2 → 14.1 | 0.7 → 2.1 | 0.0 → 0.1 | 0.0 → 0.1 | 0.0 → **0.1** | ST/STEP · ST/STEP → M/C · M/C |
| bf-fake | knee–knee @0.78 s | 2.2 → 13.6 | 2.2 → 13.6 | 2.1 → 12.7 | 3.3 → 33.5 | 2.1 → 12.7 | 1.9 → 11.8 | 1.9 → **11.6** | S!/FALL · S!/STAG → ST/STEP · S!/STAG |
| in-bf | knee–knee @0.64 s | 0.1 → 0.2 | 0.1 → 0.2 | 1.4 → 4.8 | 0.1 → 0.2 | 0.1 → 0.3 | 0.1 → 0.2 | 0.1 → **0.2** | M/C · ST/STEP → M/C · M/C |
| bf-past | knee–knee @1.16 s | 4.1 → 37.8 | 4.1 → 37.8 | 4.7 → 43.2 | 2.2 → 17.6 | 4.2 → 38.3 | 4.2 → 38.8 | 4.2 → **28.1** | ST/STEP · ST/STEP → M/C · ST/STEP |
| bf-shoulder | foot–shin @1.48 s | 0.0 → 0.0 | 0.0 → 0.0 | 0.9 → 1.7 | 0.0 → 0.0 | 0.9 → 1.7 | 0.8 → 1.6 | 0.8 → **1.6** | M/C · L/A → M/C · L/A |
| croq-leg | knee–knee @0.60 s | 4.9 → 39.2 | 4.9 → 39.2 | 5.8 → 39.2 | 1.5 → 17.9 | 4.9 → 39.2 | 4.7 → 39.2 | 4.7 → **39.2** | ST/STEP · S!/FALL → ST/STEP · S!/FALL |
| croq-early | knee–thigh @0.58 s | 3.6 → 62.2 | 3.6 → 62.2 | 4.2 → 71.9 | 3.9 → 67.2 | 3.1 → 53.0 | 2.2 → 37.6 | 2.2 → **30.1** | S!/STAG · S!/STAG → M/C · ST/STEP |
| croq-before | foot–shin @0.47 s | 2.8 → 8.9 | 2.8 → 8.9 | 2.9 → 9.2 | 2.8 → 8.9 | 2.9 → 9.2 | 3.1 → 9.8 | 3.1 → **9.3** | S!/FALL · ST/STEP → S!/FALL · S!/FALL |
| croq-between | knee–knee @0.60 s | 4.8 → 55.4 | 4.8 → 55.4 | 5.8 → 67.1 | 2.6 → 30.0 | 4.7 → 54.8 | 4.7 → 54.6 | 4.7 → **46.7** | ST/STEP · S!/FALL → ST/STEP · S!/FALL |
| croq-hip | knee–shin @0.81 s | 0.8 → 3.5 | 0.8 → 3.5 | 0.2 → 1.0 | 0.2 → 0.9 | 1.9 → 3.3 | 1.8 → 3.2 | 1.8 → **2.7** | ST/STEP · M/C → L/C · M/C |
| in-croq | knee–knee @0.56 s | 2.8 → 34.9 | 2.8 → 34.9 | 2.9 → 35.8 | 3.3 → 41.5 | 2.8 → 35.2 | 2.3 → 28.3 | 2.3 → **24.1** | S!/FALL · S!/FALL → M/C · M/C |
| carry-walk | knee–knee @1.74 s | 2.1 → 15.4 | 2.1 → 15.4 | 3.3 → 15.8 | 2.1 → 17.8 | 3.3 → 15.9 | 3.3 → 15.9 | 3.3 → **14.8** | M/C · M/C → M/C · M/C |
| both-committed | knee–thigh @0.67 s | 5.7 → 36.0 | 5.7 → 36.0 | 3.7 → 32.3 | 3.3 → 17.6 | 3.2 → 28.0 | 3.3 → 29.2 | 3.3 → **24.1** | S!/FALL · S!/FALL → M/C · ST/STEP |
| croq-recover | knee–knee @0.55 s | 2.4 → 29.8 | 2.4 → 29.8 | 2.5 → 30.8 | 2.5 → 30.3 | 2.4 → 30.1 | 1.9 → 24.0 | 1.9 → **20.4** | S!/STAG · S!/STAG → S!/STAG · S!/STAG |
| croq-recover2 | knee–knee @0.52 s | 3.3 → 39.5 | 3.3 → 39.5 | 3.4 → 40.8 | 2.9 → 35.0 | 3.3 → 40.6 | 3.3 → 40.1 | 3.3 → **34.2** | S!/FALL · S!/FALL → S!/FALL · ST/STEP |

**Reading it:**
- **Brushes collapse:**
  - the flagship 18.1 → 4.7;
  - the glance 9.5 → 2.6;
  - walking head-on 10.7 → 0.7;
  - crossing at 150° running 19.9 → 0.1;
  - a Croqueta's hip brush 3.5 → 2.7.
- **Strikes stay** (within the articulated mass's 10–18 %):
  - head-on jog 47.1 → 39.3;
  - firm oblique 41.6 → 35.1;
  - a leg swung into a standing player 34.2 → 27.9;
  - Croqueta sweeps 39.2 → 39.2 and 55.4 → 46.7;
  - the run-crossing boot into a shin 31.2 → 26.7.
- **What falls in between is what A inflated:**
  - croq-early 62.2 → 30.1: the carrier's pelvis transfer and the frame push, both excluded;
  - in-croq 34.9 → 24.1: the tackler's turning lunge;
  - both-committed 36.0 → 24.1.
- **Rotation:** the world turned 37° changes no first contact by more than **0.02 N·s** over 196 formulation × case pairs. That is the canonical motion's own float-level equivariance: 0.017 cm on the roots.
- **Mirrors:** 19 / 27 identical within 0.1 N·s. static-jog (12.0) and static-walk (7.6) differ because the standing player's canonical motion is not mirror-symmetric; the limb layer's own mirror invariant is exact (§5).
- **Encounter outcomes:** of the 30 base cases, the calibrated Stage 3 responses are milder in 15, the same in 13 and harsher in 2.
  - **x150-jog:** the first contact drops from 30.8 to 14.1 N·s, but the bodies keep closing and later contacts end in a fall candidate.
  - **croq-before:** the defender becomes a fall candidate instead of taking a recovery step.
  - Both are a softer first contact letting the encounter continue, not a larger impulse.
- **The flagship's encounter outcome** goes from STRONG / RECOVERY STEP to **MODERATE / CORRECT** for both players.

## 5. THE INVARIANTS (§7) · `evidence/unit_invariants.txt`, `evidence/calibration/tangential_world.txt`, every run's ledger

| invariant | result (unit: 2000 configurations from 3332 recorded canonical legs; both mass models) |
|---|---|
| zero unpaired impulse | **0.00e+0 N·s** |
| zero passive energy gain | **0.00e+0 J** |
| no impulse above its source (the bound) | **0.00e+0 N·s** |
| rotation invariance (37° / 90° / 180°) | **0 / 6000** differ > 1e-9 |
| mirror invariance | **0 / 2000** |
| determinism | **0 / 2000** |
| **purely tangential speed does not change the impulse** (both sides +≤ 5 m/s across and vertical) | **0 / 2000** (largest change 5.7e-14) |
| … in the world (8 cases × A and F+M, each limb's source velocity off the normal ×2 and ×0) | **32 / 32 identical in every application** (largest λ change 1.3e-12 N·s) |
| zero forward-energy bias (the flagship, along the pair's mean heading) | **0.0012 N·s** of 10.52 (the normal is perpendicular to it); lead 0.5 cm |
| no animation-driven body acceleration without a corresponding limb momentum loss | every impulse is an application of the solve: the limb's normal speed falls by exactly w·λ, its body takes λ (ledger closure ≤ 3e-14 N·s, every run of every set) |
| exact pre-contact preservation | **790 / 790** encounters bit-identical to Stage 2 and to OLD up to the first genuine contact; one footballer **105 / 105** |

**A test fault, my own.** My first tangential test reported failures. Its "tangential" vector was built from two independent random numbers, so it was not perpendicular to the normal. Corrected, it passes; the solver was never at fault.

## 6. THE CALIBRATED 3B.1 ON THE FULL SUITE · `evidence/`

STAGE 2 (as decided) · OLD STAGE 3 · 3B.1 as first built (A, commit `469a080f`) · **CALIBRATED (F+M)**:

| | review (37) | matrix (52) | l3 (114) | moves (352) | search (235) |
|---|---|---|---|---|---|
| ticks with a leg pair > 5 cm | 849 · 597 · 307 · **227** | 1401 · 862 · 443 · **335** | 2547 · 1540 · 672 · **567** | 5633 · 4546 · 1974 · **2105** | 3193 · 2995 · 1478 · **1845** |
| deepest leg (cm) | 22.7 · 22.7 · 22.4 · **22.4** | 22.7 · 22.7 · 22.4 · **22.4** | 23.0 · 22.7 · 22.4 · **22.4** | 23.3 · 22.9 · 22.9 · **23.0** | 22.9 · 23.0 · 19.6 · **21.0** |
| fall candidates (OLD · A · **F+M**) | 7 · 13 · **6** | 14 · 23 · **14** | 24 · 53 · **26** | 40 · 52 · **28** | 54 · 55 · **46** |
| recovery steps (OLD · A · **F+M**) | 23 · 25 · **14** | 56 · 64 · **37** | 84 · 148 · **99** | 208 · 352 · **232** | 119 · 266 · **151** |
| knee/foot jumps > 4 cm a tick | 9887 · 9879 · 10097 · **9032** | 11020 · 11349 · 12173 · **10506** | — · 31634 · 33657 · **32174** | — · 99920 · 103021 · **97653** | — · 81651 · 85202 · **81684** |
| largest jump (cm) | 30.0 · 31.5 · 28.2 · **22.8** | 30.0 · 31.5 · 28.2 · **22.8** | 34.2 · 31.5 · 29.0 · **28.9** | 32.8 · 39.9 · 39.9 · **39.9** | 37.1 · 37.8 · 36.3 · **36.3** |
| joints > 15 m/s | 1781 · 1547 · 1773 · **1509** | 1996 · 1861 · 2227 · **1770** | 4385 · 4283 · 4980 · **4334** | 19582 · 21202 · 22538 · **21112** | 18144 · 18590 · 20374 · **18726** |
| crossed legs (ticks) | 379 · 487 · 343 · **388** | 285 · 436 · 576 · **498** | 790 · 1031 · 1306 · **1305** | 2070 · 3431 · 4166 · **4256** | 4165 · 4744 · 6083 · **5128** |
| planted-foot slide, largest (cm) | 11.8 · 11.0 · 11.0 · **13.1** | 11.8 · 11.0 · 11.0 · **13.1** | 12.6 · 11.0 · 14.4 · **15.9** | 24.2 · 24.7 · 24.2 · **24.1** | 15.0 · 14.8 · 21.5 · **15.5** |

| check | result |
|---|---|
| **identity before contact** | review 37 / 37 · matrix 52 / 52 · l3 114 / 114 · moves 352 / 352 · search 235 / 235; one footballer 105 / 105; near misses 56 / 64 untouched |
| **ball / possession** | 0 ball changes without a canonical contact (every set); 0 authority transitions caused by physics; the authority's checks 0 |
| tackle outcomes vs OLD | matrix 4. **in-croq ±m**: DEFENDER → ATTACKER RECOVERS (the attacker is interrupted before his technical event, the defender's tackle completes into a recovery). **carry-walk ±m**: DEFENDER → ATTACKER RECOVERS (the defender's touch is denied, his foot displaced by a limb contact; this is Stage 2's own outcome). Each lists its cause |
| possess1's torture with 3B (60 trials × 4 modes) | dual · unaware · stale · chatter · A→B→A · without a touch · granted blind · nondeterministic: **all 0** |
| no new information before perception (`l3_early`) | decisions differ 0 · **3 · 3** (A: 0 · 6 · 7), **all after physics acted on the attacker in the window**; root differences only with occupancy acting |
| ledger in the possession tools | **0 violations** in 1,870 + 1,570 worlds (A: 2 there, from Stage 3's runaway) |
| torture (16 seeds × mirror × 40 s) | ticks > 5 cm 680 · 540 · **316**; deepest 22.7 · 22.4 · **15.2 cm**; fall candidates 18 → **11**; recovery steps 81 → **66**; **deterministic 0 / 32**; NaN · stuck · ownership · chatter · loops · step oscillation **0** |
| continuity | pelvis jolt at a limb contact +6.8 cm/f² worst (A +7.0). The worst added at a recovery step is **+10.2** (both-committed, the defender), Stage 3's step response, worse than A's +7.0 |
| hip range pushed beyond by the perturbation | review 5 · matrix 16 · l3 56 · moves 65 · search 173 leg-ticks (the one-tick lag; ≤ 2°) |
| OLD Stage 3 on this code ≡ its committed evidence | identity (review), metrics and ball (review, matrix), solo — **0 differing lines** (`evidence/old_recheck/`) |
| the milestone's regression | **ALL 10 SUITES IDENTICAL** (Body Feint ≡ its review build, Croqueta LEG-WAVE V4 ≡ its build, chains, Lab cards, sweeps, determinism, possession torture) |
| **performance** | the world step, mean: Stage 2 106.8 · OLD 130.8 · **3B 154.0 µs** (p99 644 · 764 · 880 µs). The limb pass: idle 12.0 · near 39.1 · active 70.4 µs. The worst tested 60 Hz frame: 35.1 · 26.7 · **34.6 ms** (compilation / GC spikes, Stage 2's own the largest); p99 5.0 · 5.6 · **5.9 ms**. 22 players: ≈ 0.4 ms per tick on top of Stage 3 (pairs within the broad phase only) |
| **the Lab in Chrome** | **32 / 32**: page ≡ node **120 / 120** cases (incl. the turned worlds); A | F+M side by side (43.51 / 10.52 N·s); every candidate simulates; the velocity-parts overlay and frame data; the accounting panel; cameras, rates, frame step, loop; **0 console / page / HTTP errors**. One check first failed: the recovery-step overlay was always tested on `in-croq`, which under F+M no longer takes a step. The test now picks a case that does; the overlay was not at fault |

## 7. THE ACCOUNTING — every N·s traceable (§6)

Every contact application records what the instruction asks for (`W.l3.apps`, `W.l3.log`; `tools/l3_calib.mjs` prints them, `evidence/calibration/spectrum.json` keeps them):

| field | where |
|---|---|
| the pair and contact type | `key`, `region`; `idA/idB`, `uA/uB` (knee = the thigh's last 20 % or the shin's first 20 %) |
| the contact normal | `n` (the face rule's stable normal, or the local one) |
| root velocities | `vRootA / vRootB` (canonical + Stage 3's u) |
| limb / world velocities | `vA / vB` (the velocity the formulation used); `partsA/B.total` (the drawn point's world motion) |
| limb-relative velocities | `partsA/B`: frame · turn · sway · pelvis rotation · limb about its hip |
| normal closing | `vn` |
| effective masses | `wA / wB` (inverse), `wHipA / wHipB` (the body's share at the hip, +M), the routes |
| the impulse | `lam`, its bound `src` |
| momentum removed from each limb | `dvnA / dvnB` (its normal speed change w·λ), `dvhA / dvhB` (its body's share at the hip) |
| momentum passed to each body | `JA / JB` at their points (through the hip, or at a body's contact point), Stage 3's `EXT3B` |
| ground / support contribution | the ledger's `STRUT` and `BALANCE`, per player and tick (`W.l3.acc`) |
| residual | the ledger's closure (`check.stage3`) |
| kinetic energy before / after | `keB / keA` |
| Stage 3's classification | the episodes' players (`sev`, `cls`, Δv, steps) |

The Lab shows the same per tick: VELOCITY PARTS (`p`), the frame data and the flagship ACCOUNTING panel.

## 8. DEFERRED, WITH THEIR CURRENT NUMBERS (§8) — not touched

| problem | now (calibrated) | for |
|---|---|---|
| two committed legs landing into one another (the deepest overlap) | 22.4 cm (`both-committed`); search 21.0 | 3B.2 |
| landings obstructed by a leg · steps into the opponent | the matrix and torture event counts in `metrics_*`, `torture.txt` | 3B.2 |
| crossed legs | matrix 498 (OLD 436) · l3 1305 (1031) · moves 4256 (3431) · search 5128 (4744) | 3B.2 |
| boot ↔ boot · planted ↔ planted | unresolved by design (the ball contest's; Stage 2's committed feet) | — |
| the planted-foot slide where Stage 3 moves a body | up to 15.9 cm (l3), 24.1 (moves, = Stage 2's 24.2) | 3B.2 / Stage 3 |
| Stage 3's committed-defender runaway (no step, no fall candidate) | still in Stage 3; it no longer trips the ledger in the possession tools | Stage 3 / 3B.3 |
| falls · ground contact · get-up · the shoulder duel | not built | 3B.4 · later |

**Two calibration-adjacent items, left for your call:**
1. **The yield speed limit** (12 rad/s per DOF). A faster yield locks that DOF and makes the limb stiffer, which is part of why hard strikes stay hard. It is the next lever if strikes ever look too strong. It is not part of the source term and I have not touched it.
2. **The canonical carry's 2–5 m/s knee whip just after each touch.** It is authored and counted (within the caps). If it looks unnatural it belongs to the animation, not to 3B.
## 9. THE LAB (§9)

**http://127.0.0.1:8366/sandbox/visual/occupy3b_lab.html** (local only; Stage 3B.1's Lab, extended).

- **left / right:** each viewport shows OLD STAGE 3 or any formulation:
  - 3B.1 AS FIRST BUILT (A), B, C, D, E, F, or CALIBRATED (F+M);
  - the defaults are OLD | CALIBRATED; choose A | F+M to compare the source terms directly;
  - both re-simulate from identical inputs;
  - `?left=B:A&right=B:F%2BM` in the URL.
- **The cases:**
  - the FLAGSHIP first;
  - then **THE CALIBRATION SPECTRUM (brush → strike)**: every spectrum case with its mirror and, for six of them, **THE WORLD TURNED 37°**;
  - then the rest of the §10 matrix.
- **The new overlay VELOCITY PARTS (`p`, on by default):** at each application's contact point, each side's root velocity (grey), the velocity the formulation used (orange) and its normal part toward the other (cyan), with the closing and λ.
- **The FRAME DATA** list, per application, each side's root · frame · turn · sway · pelvis rotation · limb about its hip → used, on the normal.
- **The flagship ACCOUNTING panel** (DIAGNOSTICS) shows, for both runs on screen, every application with its source, its bound, its energy and its velocity parts, plus the leads (the carrier's heading and the pair's mean heading) and the ledger.
- **Unchanged:**
  - contact normals, contacting limb surfaces (CONTACT VOLUMES, LIMB CONTACTS), LIMB VELOCITY before / after, MOMENTUM PASSED;
  - Stage 3's response (balance class, impulse vectors, recovery steps), the OLD ghost (the left run drawn over the right);
  - 1× / 0.5× / 0.25×, pause, frame step (`,` `.`, shift = one tick), loop, the eight cameras.

## FILES AND COMMITS

**Code (calibration):**
- `occupy3b/l3_world.js`: partsOf, limbV / bodyV, the articulated mass, the tangential diagnostic;
- `occupy3b/l3_limb.js`: RES3B `vsrc = "F"`, `artMass = true`, `tanScale`; the solve's hip share;
- `occupy3b/l3_forms.js`, `occupy3b/l3_rot.js`;
- the Lab (`l3_lab.js`, `occupy3b_lab.html`);
- tools `l3_calib`, `l3_rig`, `l3_tanworld`, `l3_unit`, `l3_flagship`, `l3_lab_cases`, `l3_browser`.

**Stage 3 not touched** since 3B.1. Canonical files changed: **0**.

**Evidence:**
- `evidence/calibration/`: the spectrum, the rig, the world tangential test;
- `evidence/`: the full suite on the calibrated default;
- 3B.1-as-first-built's evidence: `git show 469a080f:review_artifacts/player_occupancy3b/evidence/<file>`.

**Commits** (`prototype/player-occupancy-stage3b1`, local):

| commit | what |
|---|---|
| `469a080f` | 3B.1 as first built |
| `3625f925` | the calibration |
| the report commit (the branch HEAD) | this report and its evidence |

Screenshots stay in the scratchpad only.

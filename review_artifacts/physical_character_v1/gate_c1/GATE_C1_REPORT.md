# Physical Character V1: Gate C1 report

**Unsupported feet-in-place balance.** The 14-body Jolt humanoid stands and recovers from pushes using only finite joint torques and ground reaction through its feet. When no in-place solution exists, it says so and falls physically.

- **No pelvis support, no root anchor, no state writes after t = 0.** All three are asserted and measured in every test.
- **No stepping.**
- **Nothing committed or pushed.** Worktree `physical-character-v1`.

2026-09-29 · Gabriel (190 cm, 78 kg) · Jolt 5.6.0 (JoltPhysics.js 1.1.0) · 240 Hz × 1 collision step, 30 velocity / 4 position iterations. The solver configuration is unchanged from Gates A and B.

![C1 contact sheet 1](contact_sheet_1.jpg)
![C1 contact sheet 2](contact_sheet_2.jpg)

---

## 17. Assessment first: does C1 pass?

**My opinion: yes, on every pass condition you set,** with the caveats listed after the table.

| your pass condition | evidence | |
|---|---|---|
| **Quiet standing ≥ 20 s without root support** | QS20 stands 20 s with no support. COM drift is 1.5 mm and sway RMS 1.0 mm. It stays in RECOVERABLE_IN_PLACE throughout. | ✅ |
| **…with finite effort, not extreme stiffness** | Ankle effort is 10 % of its limit. The capture-point law gives a total ankle stiffness of about 1.5 × mgh (Peterka 2002 measured about 1.33 × in humans). Intrinsic stance damping is cut to 0.3 × Gate B's, and 100 ms of delay then clearly degrades behaviour. The excessive ×3 profile is shown and rejected (§7). | ✅ |
| **…deterministic** | 59/59 tests bit-identical over 3 runs, **and Chrome = Node for 59/59**. Gate A (5/5) and Gate B (20/20) hashes are unchanged. | ✅ |
| **Small disturbances: visible displacement, recovered through ground reaction and finite control** | 10–20 N·s pushes in every direction, and 30 N·s forward or sideways, move the COM 1.3–5.3 cm and recover in 0.13–0.33 s. Backward 30 N·s needs the hip strategy and takes 1.29 s. The recovery comes from the ground force the feet produce: CoP moves, per-foot loads shift. | ✅ |
| **Increasing disturbances: larger response, then recoverable → step-needed → fall** | The response grows monotonically: COM excursion 1.5 → 16.7 cm forward and trunk 4.5° → 9.7°. The class escalates IN_PLACE → HIP → STEP_NEEDED → released → GROUNDED. The boundaries emerge from the physics, not from any threshold I set (§3). | ✅ |
| **Low friction changes the classification** | On ice (μ 0.08) both feet are flagged SLIPPING within 42 ms of the push. Support becomes DEGRADED, the controller learns μ ≈ 0.075, and its CoP demand drops to the friction limit. With one foot on μ 0.05, that foot is flagged and the learned μ is 0.050. | ✅ |
| **Delayed sensing measurably degrades recovery** | With 100 ms delay: quiet sway 1.0 → 6.0 mm; recovery times 2–4 × longer (forward 30 N·s 0.33 → 1.07 s; backward 20 N·s 0.28 → 0.88 s; lateral 30 N·s 0.29 → 0.93 s); larger excursions; the lateral boundary drops from 45 to 40 N·s. | ✅ |
| **Unrecoverable → honest physical fall** | G_fall (90 N·s) and every push past the boundary. STEP_NEEDED is declared, then after 62 ms the controller releases posture and the body falls under physics. It reaches the ground 1.2–1.7 s after the flag, with no statue fall and no jackknife (§6). | ✅ |
| **Zero direct pelvis/root support impulse in every C1 test** | Support fixture absent (asserted), 13 constraints (joints only), 14 + 1 bodies, 0 teleports, 0 velocity writes. The pelvis's external-force residual is **0.039 N mean, 1.0 N max, before any fall**. That detector reads back the historical Gate B fixture's force to within 0.04 N (§11). | ✅ |

**Caveats you should weigh:**
1. **No sensory or motor noise.** Quiet stance settles almost completely: 1 mm of sway, where humans show roughly 5–10 mm. With 100 ms delay it's 6 mm. That comes from the deterministic, noise-free inputs, not from stiffness.
2. **Falls have no protective reactions.** The arms hang; that's C1 scope. Fall shape depends on a documented "tone during release" choice (§6).
3. **Lateral pushes near the boundary can leave him on one leg for 1–1.5 s before he falls (PR50, DR45).** That is honest without stepping, but visually it's "balancing on one leg" where a player would step.
4. **Three modelling parameters shape the boundaries:** the CoP-law gain (0.5), intrinsic stance damping (0.3 ×) and release tone (30 % stiffness, 60 % gravity support). Each is argued from physiology or from a measured failure, and none was tuned to hit a push threshold. The boundaries would still move if they changed.

---

## 1. Interactive C1 review harness

```
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
python3 -m http.server 8171                       # your server on 8171 is still running
# C1:     http://127.0.0.1:8171/sandbox/visual/physchar/index.html            (?test=PF60 opens a test)
# Gate B: …/index.html?suite=B     (historical support fixture, labelled SUPPORT-ASSISTED)
# Gate A: …/index.html?suite=A
```

- **Built on Gates A and B:** the harness keeps the same playback (1× / 0.5× / 0.25×, ±1 physics step, scrubber), worst-frame jumps, orbit camera, presets and all earlier overlays.
- **Test list:** grouped as sensing / quiet / fall / friction / pushes by direction / delay / strength (59 tests). Each test is simulated in the browser and its hash is compared with Node's.
- **Balance overlays:**
  - COM with its ground projection and velocity arrow;
  - capture point ξ;
  - **support region** (the sole footprints of the loaded feet) and the **contact polygon** (the points actually touching);
  - **CoP**, both measured and demanded (and the unclamped demand when it saturates);
  - per-foot contact state (colour-coded points and sole outline), load bar, and label (`L TOE 367 N`, `SLIP 4.1 cm/s μ 0.08`, `slid 7 cm`);
  - ground-reaction vector;
  - hip-strategy torque;
  - push arrow;
  - a **classification banner** (RECOVERABLE IN PLACE / HIP / STEP NEEDED "a step would be required (C1: no stepping)" / FALLING "balance released" / GROUNDED) with a timeline of class times.
- **Gate B overlays that still apply:** target ghost, motor torque vectors (heat = effort ÷ budgeted limit) and saturation.
- **Timeline:**
  - ξ margin, COM margin and per-foot loads;
  - a class colour strip;
  - markers for push, step-needed, release and ground.
- **Joint panel** for any joint and swing/twist component:
  - **nominal target** (grey dashed);
  - **gravity offset** (green);
  - **balance offset** (orange);
  - **final motor target** (white dashed);
  - **actual** (cyan);
  - **motor effort ÷ its budgeted limit** (red), with saturated steps as a red band.
- **Side panel:**
  - outcome and class times, recovery and fall lead, whole-body metrics;
  - quiet-stance metrics, friction and slip, sensing checks;
  - **ROOT SUPPORT (must be 0)**, stability, flags;
  - per-joint peak torque, effort, saturation and |τ|/budget;
  - CPU, and the hash compared with Node;
  - the whole Node suite table.

## 2. Unsupported 20 s standing (QS20)

| | QS20 | QS20 + 100 ms delay | weak ×0.5 (10 s) | excessive ×3 (10 s) | on ice μ 0.08 (5 s) |
|---|---|---|---|---|---|
| outcome | stood 20 s | stood 20 s | stood | stood | stood |
| class | in-place throughout | in-place throughout | in-place | in-place | in-place |
| COM drift | 1.5 mm | 6.7 mm | 0.9 mm | 1.3 mm | 0.6 mm |
| sway RMS | 1.0 mm | 6.0 mm | 0.7 mm | 1.0 mm | 0.4 mm |
| CoP path | 1.3 mm | 4.0 mm | 0.8 mm | 1.0 mm | 0.5 mm |
| ankle effort (of limit) | 10 % | 10.6 % | 20 % | 3.4 % | 10 % |
| pelvis external-force residual | 0.018 N | 0.018 N | 0.018 N | 0.018 N | 0.018 N |

- **The body is physically standing on its feet.** The ankles, knees, hips and trunk hold it against gravity through Jᵀ gravity offsets on finite motors. The ground carries 765 N (ΣGRF matches Mg to 0.01 N). Nothing else holds him up.
- **The small sway is honest.** A deterministic simulation with no sensory or motor noise settles to equilibrium (caveat 1).

## 3. Graded push tests (C–E)

- **The push:** a 50 ms impulse at the pelvis COM at t = 1.0 s; each run lasts 6 s.
- **Recovery** means ξ is back ≥ 1.5 cm inside the support region, |v_COM| < 3 cm/s, and the trunk is within 3° of its pre-push angle, held for 0.25 s.
- **Times** in the tables are measured from the push.
- **Lead** is the time from the first STEP_NEEDED / UNRECOVERABLE flag to the first non-foot ground contact.

### Forward (push from behind)
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PF10 | 10 | **RECOVERED** | IN PLACE | 0.171 | 1.5 | 12.2 | 4.5 | — | — | — | — |
| PF20 | 20 | **RECOVERED** | IN PLACE | 0.279 | 3.1 | 12.2 | 5 | — | — | — | — |
| PF30 | 30 | **RECOVERED** | IN PLACE | 0.329 | 4.7 | 12 | 5.5 | — | — | — | — |
| PF40 | 40 | **RECOVERED** | HIP | 0.35 | 6.4 | 7.8 | 6.3 | — | — | — | — |
| PF50 | 50 | **RECOVERED** | HIP | 1.717 | 9.4 | 3.7 | 6.7 | — | — | — | — |
| PF55 | 55 | **RECOVERED** | HIP | 1.937 | 12.3 | 1.6 | 7.3 | — | — | — | — |
| PF60 | 60 | **RECOVERED** | HIP | 2.417 | 16.7 | -0.4 | 9.7 | — | — | — | — |
| PF65 | 65 | **FELL** | GROUNDED | — | 166 | lost | 91.6 | 0.683 | 0.742 | 2.183 | 1.5 |
| PF70 | 70 | **FELL** | GROUNDED | — | 166.5 | lost | 91.6 | 0.337 | 0.396 | 1.729 | 1.392 |

### Backward
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PB10 | 10 | **RECOVERED** | IN PLACE | 0.171 | 1.6 | 8.5 | 4.6 | — | — | — | — |
| PB20 | 20 | **RECOVERED** | HIP | 0.275 | 3.2 | 4.5 | 5.3 | — | — | — | — |
| PB30 | 30 | **RECOVERED** | HIP | 1.287 | 7.3 | 0.3 | 5.9 | — | — | — | — |
| PB35 | 35 | **FELL** | GROUNDED | — | 135.2 | lost | 93.3 | 0.704 | 0.762 | 2.283 | 1.579 |
| PB40 | 40 | **FELL** | GROUNDED | — | 139.2 | lost | 93 | 0.321 | 0.379 | 1.775 | 1.454 |
| PB50 | 50 | **FELL** | GROUNDED | — | 138.5 | lost | 93 | 0.042 | 0.1 | 1.442 | 1.4 |
| PB60 | 60 | **FELL** | GROUNDED | — | 136 | lost | 93.3 | 0.038 | 0.096 | 1.271 | 1.233 |
| PB70 | 70 | **FELL** | GROUNDED | — | 140.6 | lost | 93.4 | 0.029 | 0.087 | 1.212 | 1.183 |

### Lateral, toward his right
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PR10 | 10 | **RECOVERED** | IN PLACE | 0.125 | 1.3 | 12.2 | 4 | — | — | — | — |
| PR20 | 20 | **RECOVERED** | IN PLACE | 0.188 | 2.7 | 12.2 | 4.1 | — | — | — | — |
| PR30 | 30 | **RECOVERED** | HIP | 0.287 | 5.3 | 0.1 | 4.3 | — | — | — | — |
| PR40 | 40 | **RECOVERED** | HIP | 2.333 | 11.8 | 2.7 | 4.7 | — | — | — | — |
| PR45 | 45 | **RECOVERED** | HIP | 2.833 | 14.4 | 4.1 | 4.9 | — | — | — | — |
| PR50 | 50 | **FELL** | GROUNDED | — | 168.6 | lost | 93.7 | 1.958 | 2.017 | 3.267 | 1.308 |
| PR60 | 60 | **FELL** | GROUNDED | — | 169.3 | lost | 97.1 | 0.379 | 0.438 | 1.563 | 1.183 |
| PR70 | 70 | **FELL** | GROUNDED | — | 175.6 | lost | 104.8 | 0.05 | 0.108 | 1.279 | 1.229 |

### Lateral, toward his left (fewer runs)
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PL20 | 20 | **RECOVERED** | IN PLACE | 0.188 | 2.7 | 12.2 | 4.1 | — | — | — | — |
| PL40 | 40 | **RECOVERED** | HIP | 2.329 | 11.8 | 2.6 | 4.7 | — | — | — | — |
| PL60 | 60 | **FELL** | GROUNDED | — | 166.6 | lost | 95.3 | 0.387 | 0.446 | 1.567 | 1.179 |

### 100 ms sensing delay (F)
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DF20 | 20 | **RECOVERED** | IN PLACE | 0.279 | 3.4 | 12.3 | 6.3 | — | — | — | — |
| DF30 | 30 | **RECOVERED** | IN PLACE | 1.067 | 5.2 | 11.1 | 7.4 | — | — | — | — |
| DF40 | 40 | **RECOVERED** | HIP | 1.229 | 7.2 | 7 | 8.6 | — | — | — | — |
| DF50 | 50 | **RECOVERED** | HIP | 1.754 | 10.5 | 2.7 | 10.6 | — | — | — | — |
| DF55 | 55 | **RECOVERED** | HIP | 2.075 | 12.9 | 0.6 | 12 | — | — | — | — |
| DF60 | 60 | **RECOVERED** | HIP | 2.821 | 18.4 | -1.6 | 13.7 | — | — | — | — |
| DB20 | 20 | **RECOVERED** | HIP | 0.883 | 4.1 | 4.2 | 5.3 | — | — | — | — |
| DB30 | 30 | **RECOVERED** | HIP | 1.321 | 8.3 | 0.1 | 6 | — | — | — | — |
| DB35 | 35 | **FELL** | GROUNDED | — | 136.9 | lost | 93.6 | 0.704 | 0.762 | 2.383 | 1.679 |
| DR30 | 30 | **RECOVERED** | HIP | 0.933 | 7 | -1.3 | 4.7 | — | — | — | — |
| DR40 | 40 | **RECOVERED** | HIP | 1.675 | 14.1 | 6.2 | 6.6 | — | — | — | — |
| DR45 | 45 | **FELL** | GROUNDED | — | 165.4 | lost | 93.7 | 1.862 | 1.921 | 3.275 | 1.413 |

### Strength sweep (I)
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S_weak_PF30 | 30 | **RECOVERED** | IN PLACE | 0.363 | 5.5 | 11.4 | 5.9 | — | — | — | — |
| S_weak_PF50 | 50 | **FELL** | GROUNDED | — | 147.7 | lost | 91.7 | 0.679 | 0.738 | 1.975 | 1.296 |
| S_weak_PR40 | 40 | **FELL** | GROUNDED | — | 165.7 | lost | 98.4 | 0.446 | 0.504 | 1.496 | 1.05 |
| S_weak_PR60 | 60 | **FELL** | GROUNDED | — | 160.7 | lost | 100.6 | 0.05 | 0.108 | 1.112 | 1.062 |
| S_strong_PF30 | 30 | **RECOVERED** | IN PLACE | 0.267 | 4 | 12.3 | 5.1 | — | — | — | — |
| S_strong_PF50 | 50 | **RECOVERED** | HIP | 1.325 | 9.3 | 4.7 | 5.3 | — | — | — | — |
| S_strong_PR40 | 40 | **RECOVERED** | HIP | 0.75 | 8.5 | -0.8 | 4.6 | — | — | — | — |
| S_strong_PR60 | 60 | **RECOVERED** | HIP | 2.142 | 20.1 | 0 | 4.5 | — | — | — | — |

### Fall, ice and slippery patch (G, H)
| test | N·s | outcome | highest class | recovery s | COM excursion cm | min ξ margin cm | trunk max ° | STEP_NEEDED s | released s | grounded s | lead s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G_fall | 90 | **FELL** | GROUNDED | — | 164.8 | lost | 91.6 | 0.042 | 0.1 | 1.221 | 1.179 |
| H_ice_push | 25 | **RECOVERED** | STEP NEEDED | 0.529 | 7.7 | 12.2 | 5.2 | 0.05 | — | — | — |
| H_patch_right | 30 | **RECOVERED** | IN PLACE | 0.625 | 12.1 | 11.8 | 4.3 | — | — | — | — |

**Boundaries that emerged (candidate strength, no delay):**

| direction | recovers up to | falls from | idealised ankle-only ceiling (review estimate) |
|---|---|---|---|
| forward | 60 N·s | 65 N·s | ≈ 52 N·s |
| backward | 30 N·s | 35 N·s | ≈ 32 N·s |
| lateral | 45 N·s (right) / 40 N·s (left run) | 50 N·s (right) / 60 N·s (left run) | ≈ 58 N·s |

**Forward exceeds the ankle-only ceiling, and legitimately:**
- The hip strategy extends the capture region by about 4.7 cm (its physically derived capacity, §9). That's worth about +11 N·s.
- The body rises onto its toes (PF50–PF60 stand on the toe edge for 0.5–1 s, then the heels roll back down).

**Backward and lateral fail at or below their ceilings,** as a finite, non-ideal controller should.

**Nothing was tuned to these numbers:**
- None of the parameters was adjusted after seeing a boundary.
- The three parameter changes made during development (§16) were forced by physically wrong behaviour.

## 4. Delayed-reaction comparison (F)

The 100 ms delay applies to all sensing the controller sees: body poses, contacts, loads, COM and ξ. The motors' intrinsic stiffness and damping stay undelayed, like muscle short-range stiffness.

| push | recovery, no delay → 100 ms | COM excursion, no delay → 100 ms | outcome |
|---|---|---|---|
| forward 20 | 0.28 → 0.28 s | 3.1 → 3.4 cm | both recover |
| forward 30 | 0.33 → **1.07 s** | 4.7 → 5.2 cm | both recover |
| forward 40 | 0.35 → **1.23 s** | 6.4 → 7.2 cm | both recover |
| forward 60 | 2.42 → **2.82 s** | 16.7 → **18.4 cm** | both recover |
| backward 20 | 0.28 → **0.88 s** | 3.2 → 4.1 cm | both recover |
| backward 30 | 1.29 → 1.32 s | 7.3 → 8.3 cm | both recover |
| lateral 30 | 0.29 → **0.93 s** | 5.3 → 7.0 cm | both recover |
| lateral 40 | 2.33 → 1.68 s | 11.8 → **14.1 cm** | both recover |
| lateral 45 | 2.83 s → **FELL** | 14.4 → fall | **delay flips the outcome** |
| quiet stance | — | sway 1.0 → **6.0 mm** | — |

**Delay degrades recovery clearly, as required:** recoveries take up to 3–4 × longer, excursions grow, and the lateral boundary drops.

**Why this only became visible after a correction:**
- My first C1 build kept Gate B's stance damping. That damping was undelayed and very large (critical damping of half the body per ankle, 281 N·m·s/rad).
- It did the stabilising, so delay barely mattered: no outcome flipped, and the quiet-sway difference was small.
- You predicted that failure mode ("excessively stiff"). The damping sweep that found it is in `analysis/intrinsic_stance_damping_vs_delay.txt`: at 0.1 × damping, delay even flips backward 30 N·s into a fall.
- C1 uses 0.3 × (ankle ζ ≈ 0.25). The remaining sway damping comes from the capture-point law's velocity term, which the delay does affect.

## 5. Low-friction tests (H)

| test | what happened | detection | controller response |
|---|---|---|---|
| **H1** ice, both feet μ 0.08, quiet 5 s | stands; standing needs almost no friction | no slip | normal |
| **H2** ice, 25 N·s forward push | both feet slide 7.0 cm, then he recovers in 0.53 s | **SLIPPING on both feet 42 ms after the push begins**; support DEGRADED for 313 ms; μ observed **0.075** (true 0.08) | CoP demand limited to the friction the feet can supply (\|p − c\| ≤ h·Σμ·N/W, 3.4 cm minimum); a friction-limited STEP_NEEDED flag appears briefly (50 ms, not held long enough to release) |
| **H3** right foot on μ 0.05, 30 N·s toward his right | right foot slides 24 cm, left sticks; recovers in 0.63 s | **SLIPPING on the right foot only**; μ observed **0.050** (true 0.05); DEGRADED 479 ms | the sliding foot keeps carrying vertical load but its friction is learned; the IK always solves from the foot's *current* pose, so a sliding foot is never treated as an anchor |

**How slip is detected:**
- A foot is SLIPPING when it is loaded and all four sole corners have moved sideways more than 3 cm/s over a 42 ms window, counting only samples taken while it was loaded.
- A rolling foot keeps a stationary pivot corner, so it isn't slip. Impact jitter doesn't accumulate. A foot being put back down doesn't count.
- In the 56 normal-friction runs, no slip is flagged before the controller has released a fall. There are no false slips while balancing.

## 6. Honest fall (G)

**G_fall: 90 N·s forward.**
- RECOVERABLE_HIP at +21 ms, then STEP_NEEDED at +42 ms (ξ 6.1 cm beyond the hip-extended support).
- **Released** at +100 ms, after the 62.5 ms confirmation.
- First non-foot ground contact at +1.22 s: **1.18 s after the flag.**

**Every push past a boundary does the same** (lead 1.2–1.7 s): the controller stops requesting posture and the articulated body falls under physics.

**How the release works:**
- **Stopped:** balance offsets, stance IK, the hip strategy and re-planting.
- **Kept:** the targets go to the nominal pose, stiffness ramps to 30 % over 0.1 s, and **60 % of the static gravity support is kept (muscle tone)**.
- **Never done:** increase strength, drag the root, teleport feet, enlarge friction, freeze the pelvis, or snap to a fall pose.

**The tone choice was forced by a failure:**
- My first release (15 % stiffness, no gravity support) made the heavy trunk **jackknife** over straight legs in forward falls: 30–33° hip fold, trunk folded past horizontal to 129–136°. That's visually pathological.
- Keeping partial tone gives a whole-body topple with a natural 11–14° hip and 14–23° knee give, and the trunk lands at about 92°.
- Evidence: `analysis/fall_release_tone.txt`, and stills 11 / 24–26.

**Re-engagement:** if the physics shows in-place balance is clearly possible again for 100 ms after a release, balance re-engages (ramped). It never fires in the final suite, but it fixed a false release during development (§16).

## 7. Strength comparison (I)

The strength multiplier scales every directional torque limit and stiffness; damping scales with √.

| | weak ×0.5 | **candidate** | excessive ×3 |
|---|---|---|---|
| quiet stance | stands, ankle effort 20 % | stands, 10 % | stands, 3.4 % |
| forward 30 / 50 | recovers / **falls** (ankles saturated 817 ms) | recovers / recovers | recovers / recovers |
| lateral 40 / 60 | **falls** / falls | recovers / falls | recovers / **recovers** |
| lateral 60 peak torques | — | (falls) | hip ab/adduction **254 N·m**, ankle roll **77 N·m** |

**Why the excessive profile is not the selected solution:**
- It survives more only because it uses torques no player has. Its lateral-60 recovery needs about 1.8 × a strong human's hip abduction and 2.2 × the ankle roll.
- At its quiet-stance effort (3.4 %) it is statue-like.
- Its boundary no longer means anything physical.
- **Weak** shows the other failure: posture holds, but the ankles and hips saturate early and it falls.
- **The candidate uses 10 % effort in quiet stance and saturates only when a push genuinely exceeds a human's capacity.**

## 8. Sensing validation (A)

| check | method | result |
|---|---|---|
| **COM / COM velocity** | mass-weighted body COMs and velocities (exact) | SV_static: \|v\| < 0.001 m/s, drift 0.6 mm |
| **total ground force** | momentum: F = M·Δv_COM/dt − M·g − J_push/dt | static: ΣF_y vs Mg **0.01–0.08 N** · free fall: F ≈ 0 until touchdown; the residual that grows to 7.8 N is Jolt's linear damping (0.05 s⁻¹ × m × v), identified exactly |
| **CoP** | angular momentum about the COM: L̇ = (p − c) × F | inside the measured contact polygon **100 %** of quasi-static steps in every test |
| **per-foot load** | Newton on the foot: F_f = m_f·Δv_f/dt − m_f·g − λ_ankle/dt | L + R vs total **0.15 N mean, 0.2 N max** · airborne foot (no manifold) **0.04 N mean, 0.1 N max** (= damping) |
| **per-foot load, independent cross-check** | lever rule from the momentum CoP vs the ankle-impulse loads | load-share error **0.2 %** (static) · **1.5 % mean, 3.1 % max** during the commanded 8 cm weight shift (SV_shift) |
| **support polygon** | hull of the touching points (contact) / hull of the loaded soles (support region) | always contains the measured CoP |
| **capture point** | ξ = c + v/ω0, ω0 = √(g/h); matches the review probe's values on the same runs | the XCoM exit precedes the visible fall: in every fall the STEP_NEEDED / UNRECOVERABLE flag comes 1.2–1.7 s before the first body contact with the ground; heel or toe roll is first seen 0.08–0.69 s after the push |
| **contact state** | points + load + windowed slip, with integer-step hysteresis | reproduces heel / toe / edge / liftoff / touchdown / slip; one-step speculative-contact lead handled (§11) |

**These are estimates, not solver outputs:**
- Every quantity comes from Jolt's integrated velocities and constraint impulses. JoltPhysics.js does not expose contact impulses.
- **Failure cases:** impact spikes (heel strike reads up to about 1100 N for a few steps); speculative contacts (load can arrive one step before geometric touch); and a floor of about 0.1 N from damping.

## 9. Balance equations and controller

**Sensing, every 240 Hz step** (optionally delayed by d steps for the controller):

```
c = Σ mᵢcᵢ / M      v = Σ mᵢvᵢ / M      L = Σ (Rᵢ Iᵢ Rᵢᵀ ωᵢ + mᵢ (cᵢ − c) × vᵢ)      h = c_y      ω0 = √(g/h)
ξ = c_xz + v_xz / ω0                                   (extrapolated COM / instantaneous capture point; Hof 2005, Pratt 2006)
support region R = hull(sole footprints of loaded, touching feet)       contact polygon C = hull(touching contact points)
m_ξ = signed distance(ξ, R)                            (Hof's margin of stability; > 0 inside)
```

**Ankle strategy: capture-point CoP law** (Koolen / Pratt 2012 instantaneous capture-point control):

```
ξ_ref  = ankle midpoint + 0.041 m · heading          (COM over mid-foot, as in the nominal stance)
p*_raw = ξ + k_ξ (ξ − ξ_ref),     k_ξ = 0.5           → ξ̇ = −ω0 k_ξ (ξ − ξ_ref);  total ankle stiffness ≈ (1 + k_ξ) m g h
friction: once a foot has been seen sliding,  |p*_raw − c| ≤ h · Σ μᵢ Nᵢ / (M g)   (sliding foot: observed μ; sticking foot: belief 0.9)
p*     = clamp(p*_raw, R shrunk by 1.5 cm),     r = p*_raw − p*          (r ≠ 0 → the ankle strategy is saturated)
```

**Desired ground reaction.** The LIPM line of action passes through the COM, so the ground force alone creates no angular momentum:

```
F_net = M g · [ (c_x − p*_x)/h , 1 , (c_z − p*_z)/h ]
```

It is split between stance feet by the lever rule along the foot-centre line; each foot's CoP is clamped into its own contact area.

**Joint torques by Jᵀ.** For each joint j (point p_j), the torque the motor must apply on its child subtree:

```
τ_j = − Σ_{i ∈ subtree(j)} (cᵢ − p_j) × mᵢ g  −  Σ_{feet f ∈ subtree(j)} (c_f − p_j) × F_f
τ_G  = τ with the CoP at the COM projection (static support)      → GRAVITY / feed-forward
τ_B  = τ(p*) − τ_G                                                   → BALANCE (ankle strategy through the whole stance chain)
```

**Hip strategy.** When the CoP saturates, a centroidal moment is generated by torquing the trunk about the hips (Horak & Nashner; the flywheel in Pratt 2006):

```
τ_trunk = M g (ŷ × r)     (forward ξ error → trunk pitches forward, hips pushed back)
clamped to 0.8 × Σ stance-hip limits (flexion / extension / ab-adduction by direction), zeroed past 35° of trunk deviation;
applied to the pelvis through the stance hips (each thigh receives −share · τ_trunk)
```

**Torques become targets.** The equilibrium-point shift is expressed in each joint's own constraint space:

```
Δθ_G = C⁻¹ R_childᵀ τ_G / k_p        Δθ_B = C⁻¹ R_childᵀ τ_B / k_p        (hinge: Δ = τ·axis / k_p)
target = q_nominal ⊗ exp(Δθ_G + Δθ_B)                      (|Δ| ≤ 0.7 rad)        velocity target = 0
```

**q_nominal: stance built upward from the actual feet.**
- Desired pelvis: horizontally at its **current** position; height = mean ankle height + 0.917 m (the nominal stance); orientation = heading from the feet × 2° nominal pitch.
- **Two-bone IK** per stance leg, from the desired hip-joint position to the **actual** ankle, with the knee pole along the foot's own forward direction.
- Hip target = csOfRel(R_pelvis,desiredᵀ R_thigh). **Because the hip is driven from a world-frame pelvis goal, the stance hips hold the trunk upright in the world:** that's the anti-jackknife mechanism.
- Knee target = datan2 of the bend.
- Ankle target = csOfRel(R_shinᵀ R_foot,actual): the foot stays exactly as it physically is.
- A foot that has left the ground is reached back to **its own landed pose**: the same place, not a step.
- The upper body uses the nominal stance pose.

**Motors (Gate B, revised):**
- PositionAndVelocity, implicit spring, k_p as in Gate B.
- k_d: legs blend stance ↔ swing by the measured foot load.
- Directional limits × budget weights (§12).

**Determinism:** everything that reaches a target or a decision uses only + − × ÷ √ and the deterministic `dsin` / `dcos` / `dtan` / `datan2` / `dacos` / `dexp` (new, accurate to 2e-15). Measurement may use `Math.*`.

## 10. Support-state classifier

It is evaluated every control step from the (delayed) observation, with integer-step hysteresis and dwell (deterministic).

| class | condition | controller |
|---|---|---|
| INIT | first 12 observed steps (by the observation's own time) | balancing, not classifying |
| **RECOVERABLE_IN_PLACE** | ankle strategy not saturated and m_ξ ≥ 1.5 cm | ankle strategy |
| **RECOVERABLE_HIP** | p* saturated (\|r\| > 3 mm) or m_ξ < 1.5 cm, but ξ within the hip-extended region: m_ξ ≥ −Δ_hip | ankle + hip strategy |
| **STEP_NEEDED** | m_ξ < −Δ_hip (or the friction-limited equivalent) **and** one ≤ 0.3 s step could still reach the capture point (≤ 0.55 m beyond the edge) | C1: shown explicitly; **held 62.5 ms → release** (no stepping) |
| **UNRECOVERABLE** | not even one step could reach it; or both feet off the ground; or trunk > 55°; or COM below 78 % of stance height | release (2 steps for the physical conditions) |
| **FALLING** | released | tone only (§6); re-engage if clearly recoverable for 100 ms |
| **GROUNDED** | any non-foot body on the turf for 2 steps | tone only |

**Hip-extended capacity Δ_hip** comes from physics, not tuning. Pratt 2006's LIPM + flywheel gives:

```
Δ = d (1 − e^(−ω0 T))²,    d = τ / (M g),    T = √(θmax · I_ub / τ)
```

with τ = 0.8 × both hips' flexion, extension or ab-adduction limit, θmax = 35°, and I_ub = 9.55 kg·m² (the upper body about the hip centre). Result: **4.7 cm forward, 4.9 cm backward, 4.4 cm lateral.** It scales with the strength profile, so the weak and strong sweeps move the classifier boundary for physical reasons.

**The step-reach test is a coarse placeholder for Gate D.** Both STEP_NEEDED and UNRECOVERABLE lead to a fall in C1; the distinction is information only.

## 11. Foot-contact and load methodology

**Contact per foot (every step):**
- The manifold points against the turf. A point is **touching** when depth > −0.5 mm; speculative contacts are excluded.
- A foot also counts as **in contact** when a speculative manifold exists *and* its measured load exceeds 40 N. Jolt acts on contacts up to 2 cm apart, so load can arrive one step before geometric touch; this was found in SV_freefall.

**Load and shear:** F_f = m_f·(v_f(n) − v_f(n−1))/dt − m_f·g − λ_ankle/dt. λ_ankle is the ankle joint's accumulated point-constraint impulse, the shin's force on the foot. Newton on the foot then leaves the ground reaction.

**States (with hysteresis):**
- AIR, then TOUCHDOWN (30 ms), then FLAT (heel and toe points both present) / HEEL / TOE / EDGE (from which box corners touch, in the foot's own frame);
- LIFTOFF (touching but unloaded: loaded above 40 N, unloaded below 25 N);
- SLIPPING (§5).

**Anchor:** the actual pose at planting. It updates at every re-plant, is never snapped, and is used only for re-planting a lifted foot and for slide distance.

**Planned vs actual:** the C1 plan is "both feet planted". The harness shows the actual state. The support region uses only loaded, touching feet: physical contact decides support, not expectation.

**Root-force detector:** the pelvis's residual m_p·a_p − m_p·g + Σ λ_joint→pelvis/dt − push, over steps when the pelvis touches nothing.
- **Validated** by applying it to the historical Gate B support fixture: it reads the fixture's force (mean 63 N) to **0.04 N** (`analysis/root_force_detector_on_gate_b_fixture.txt`).
- In C1 it reads **0.039 N mean, 1.0 N max** before any fall.

## 12. Motor strength and torque changes from Gate B

**Directional limits** (N·m). Sign convention verified by a one-joint probe (`analysis/motor_axis_sign_probe.txt`).

| joint | Gate B | C1 candidate |
|---|---|---|
| ankle | ±110, every axis | **plantarflexion 150 / dorsiflexion 45**, inversion/eversion ±35, twist ±20 |
| knee | ±190 | **extension 250** (Harbo 2012: 247) / flexion 130 |
| hip | ±220 | extension 250 / flexion 190, ab-adduction ±140, rotation ±60 |
| spine (lumbar, thoracic) | ±200 | extension 250 / flexion 180, lateral ±150, rotation ±80 |
| neck | ±35 | extension 45 / flexion 25, lateral ±30, rotation ±20 |
| shoulder | ±70 | extension 80 / flexion 70, ab-adduction ±65, rotation ±45 |
| elbow | ±60 | flexion 75 / extension 50 |

**Other changes:**
- **Multi-axis budget.** Each step, every SixDOF axis gets its directional limit × w_i, where w_i = max(0.25, |e_i| / |e|) is that axis's share of the current demand (e = target vs current rotation). The worst-case vector effort is 1.06 × the directional maximum instead of √3 ×; **measured max |τ| ÷ directional max over all 59 tests is 1.01.** This is an actuator property, so it uses the current (undelayed) joint state.
- **Stiffness k_p:** unchanged from Gate B; only the limits changed. Nothing was weakened globally.
- **Stance damping** (hip / knee / ankle): 0.3 × Gate B's stance-load critical damping, i.e. ankle 84, knee 64, hip 42 N·m·s/rad (§4).
- **Swing / unloaded damping:** critical for the distal leg, i.e. ankle 4.5, knee 30, hip 90 N·m·s/rad. The blend is driven by the measured load, low-passed.
- **Trunk, neck and arms:** Gate B damping.

## 13. Balance and recovery metrics exposed

**Per step (harness):**
- COM, v_COM, ξ, ω0;
- support region, contact polygon, ξ margin and COM margin;
- measured and demanded CoP, net GRF, angular momentum;
- trunk / pelvis tilt, spine bend;
- per foot: state, points, load, shear, slip speed, slide distance, μ used / available, friction state, anchor;
- class and reason;
- per joint: nominal, gravity offset, balance offset, final target, actual, motor torque, effort ÷ budgeted limit, saturation;
- pelvis external-force residual;
- the Gate A stability metrics.

**Per run (JSON):**
- outcome, highest class, class times, recovery time, fall lead, first foot roll;
- COM excursion and peak speed, minimum ξ / COM margins;
- trunk, pelvis and spine maxima, angular-momentum peak;
- foot slide, load-share range;
- quiet-stance drift, sway, CoP path and ankle effort;
- friction (first slip per foot, degraded ms, observed μ, friction limit);
- sensing checks, root residual, stability, per-joint peaks / effort / saturation / budget;
- **pathology flags** (spine bend > 30° while balancing, trunk > 20° while classified in-place, foot slide > 1 cm, saturation streaks > 300 ms);
- CPU split.

**Joint-angle error is deliberately not the whole-body quality metric,** after Gate B's jackknife lesson.

## 14. Determinism

- **59 / 59 C1 tests** are bit-identical over 3 runs (FNV-1a over every body's Float64 state, every step).
- **Chrome 154 = Node 22.19 for 59 / 59** (`gatec1_crossruntime_chrome_vs_node.txt`).
- **Gate A 5 / 5 and Gate B 20 / 20** hashes are unchanged after all C1 changes.

## 15. Performance

One character, Apple M4, Node, per rendered 60 Hz frame (4 physics steps):

| | range over 59 tests |
|---|---|
| **total** | **0.61 – 0.78 ms** |
| Jolt step | 0.50 – 0.68 ms |
| sensing | ≤ 0.09 ms |
| controller (support, classifier, IK, Jᵀ, budget) | ≤ 0.13 ms |

That is about 4–5 % of a 16.7 ms frame. Balance costs about 0.1–0.2 ms over Gate B.

## 16. Known failures, limitations and development findings

**Findings during C1.** Each was a physically wrong behaviour; I fixed it and kept the evidence.

1. **A toe stand was misread as lost support (PF60).** Capture margins were measured against the *current contact points*, so a body up on its toes was released while it was actually recovering.
   - Fix: split the **support region** (whole loaded soles; a rolled foot can roll back) from the **contact polygon** (where CoP can be commanded now).
2. **The CoP demand held the heels up (PF60).** Clamping the demand to the toe-edge contact kept plantarflexing while the body rocked back, and he fell backward.
   - Fix: clamp to the support region, so a smaller demand lets the heels roll down.
3. **Slip false positives.**
   - A centroid velocity, and then a per-point instantaneous velocity, flagged heel-strike rotation as slip on both feet and caused a false release (PF50).
   - A window that spanned a foot's pre-touchdown travel flagged a re-plant as a 13–18 cm/s slide (PR30).
   - Fix: windowed minimum-corner slide over loaded samples only.
4. **Speculative-contact lead:** load arrives one step before geometric touch. Now counted as contact.
5. **Delay warmup bug:** with delay, the controller saw the t = 0 snapshot (no contacts) and released at start. Warmup now uses the observation's own time.
6. **Slipping-foot exclusion was too conservative:** it gave up at startup on the patch test (H3). Now a sliding foot stays in the support region and friction is limited instead.
7. **Intrinsic damping hid the delay** (§4).
8. **Release jackknife** (§6).

**Remaining limitations:**
- **No noise:** quiet sway is 1 mm (caveat 1). A deterministic seeded noise model would be the next realism step; it is not added.
- **No protective reactions in falls** (arms hang, no hand plant, no roll). Out of C1 scope; the fall shape depends on the release-tone choice.
- **One-leg lingering near the lateral boundary** (PR50, DR45: 1–1.5 s on one foot, ankle roll saturated for 2–3 s). Honest without stepping; a player would step. Also, a lifted foot whose landed spot is out of reach hangs (the re-plant IK can't reach it).
- **Long, oscillatory recoveries for big pushes** (2–2.8 s, from the lower intrinsic damping).
- **The friction belief is μ = 0.9 until a slide is seen.** The controller can demand more friction than exists until then, and does on ice (a brief friction-limited STEP_NEEDED flag in H2).
- **Coarse step-reach placeholder** (0.3 s / 0.55 m) separating STEP_NEEDED from UNRECOVERABLE: labelling only in C1.
- **Swing damping above stance damping at the hip** (90 vs 42 N·m·s/rad): a by-product of the two separate rules; harmless in C1, and it will matter for C2's swing leg.
- **Estimator noise at impacts** (heel strikes read about 1100 N for a few steps). The controller never uses the measured CoP; loads feed only the gain blend and the slip test.
- **Not measured in C1:** rendered-mesh sinking as a suite metric (the harness shows it live per frame), other characters, uneven ground.

**Visually questionable frames (flagged even though they pass):**
- **PR50 at 2.6 s:** balancing on one leg, far foot hanging.
- **PF65 / G_fall mid-fall:** a forward topple with the arms hanging (no protective reach).
- **H3:** the right foot sliding 24 cm sideways while the body stays upright. That is physically right on μ 0.05, but it looks like skating.

---

## Evidence and files

**Evidence (`review_artifacts/physical_character_v1/gate_c1/`):**

- `contact_sheet_1.jpg`, `contact_sheet_2.jpg`: 29 key frames; the questionable ones are labelled red.
- `stills/`: the 29 viewport frames.
- `harness_frames/`: full harness screenshots.
- `gatec1_final_240x1.json` / `.log`: every metric; 3 runs per test.
- `gatec1_crossruntime_chrome_vs_node.txt`.
- `analysis/`:
  - the root-force detector on the Gate B fixture;
  - intrinsic damping vs delay;
  - fall-release tone;
  - motor-axis sign probe;
  - the scripts.

**Code (`sandbox/visual/physchar/`, untracked):**

| file | status | contents |
|---|---|---|
| `pc_sense.js` | new | sensing: COM, ξ, polygons, contacts, loads, slip, CoP |
| `pc_balance.js` | new | limits, budget, gains, support state, classifier, composer, release |
| `pc_gatec1.js` | new | tests, runner, measurement, assertions |
| `tools/gatec1_run.js` | new | the Node runner |
| `pc_math.js` | extended | deterministic `datan` / `datan2` / `dacos` / `dexp` |
| `pc_jolt.js` | extended | friction patches by contact point, per-step motor re-tuning, joint impulses (Gate A/B paths unchanged, hashes re-verified) |
| `pc_harness.js` + `index.html` | extended | the C1 suite, overlays, charts and panels; Gate B labelled as a historical fixture |

**Also preserved or amended:**
- **Gate B baseline:** `worktrees/_preserved_2026-09-29_physical_character_gate_b/` (tgz + README).
- **Gate B report:** a dated **addendum** re-labels its whole-body results as support-assisted. The original text is kept.

**Reproduce:**

```
cd "…/physical-character-v1/sandbox/visual/physchar"
node tools/gatec1_run.js --tests all --repeat 3 --out results/gatec1_final_240x1.json     # ≈ 50 s, one process
node tools/gatec1_run.js --tests group:PF --brief                                         # one group
```

**Not done, as instructed:** corrective stepping, walking, running, locomotion, tackle animation, two-player collision, protective fall choreography, get-up, player attributes, learning or optimisation controllers, any external pelvis or root force, the Reference Tackle, commits and pushes.

# PVP-1 preregistration: first player-v-player native physical interaction (DRAFT, awaiting approval)

**Status:**
- Draft for your approval. Nothing is implemented or run.
- It becomes frozen only when you approve it, together with decisions D1–D5 (`PVP1_CASE_SELECTION_AND_READINESS.md` §4).
- Research basis: that document and `evidence/PVP1_SURVEY.json`.

**Rule kept throughout:** *the simulation decides what happens; physics explains what happened.* PVP-1 consumes a frozen authoritative record. Nothing it computes can reach the simulation.

---

## 1. What a pass would prove, and what it would not

**If PVP-1 passes, it shows this, for one case only.** Two full V2 bodies enter physics from the simulation's authoritative state at one instant:
- a standing runner, R0;
- a sliding tackler, V1-matched.

They then:
- make native body-to-body contact on the authoritative segment at the authoritative time (within the frozen tolerances);
- sustain that contact for as long as the geometry requires;
- produce a mechanically valid, articulated two-body response for 150 ms, with equal and opposite exchange and closed momentum ledgers;
- leave the struck runner in a state that **the simulation's own balance law** still classifies as recoverable;
- do all this without anything flowing back into the simulation.

**It does not prove:**
- PvP with a **moving** runner, or any LV2 / RUN-1 path (D1);
- other tackle types, falls, the stumble recovery itself (no stepping exists), or the hand-back to presentation;
- live-engine neutrality;
- CPU viability for several players;
- generality across characters, speeds or contact regions;
- production readiness, or that any body is qualified (R0 is not; D2).

## 2. Source fixture (frozen)

**Case:** IB-1 **IB1-SR**, `rx_behind_standing`, frozen 10 Oct.

**Records** (byte-checked by `interaction_benchmark/scripts/ib_verify.mjs`, expected 59 pass / 1 note / 0 fail):
- `interaction_benchmark/scenarios/IB1-SR_rx_behind_standing.json`;
- `interaction_benchmark/records/v13/rx_behind_standing_OFF.json.gz`, authoritative: rows, sub-step primitives, simBody, events, reaction states;
- `…/rx_behind_standing_LOCO.json.gz`, used only for the runner's presentation pose: identical gameplay hash, static over rows 30–51.

**Simulation:** V1.3, commit 5042230, CHARCOLLIDE-1. **Gameplay hash:** a2678624.

**Why this case:** it is the strongest recoverable contact in the 26 authoritative fixtures: a weight-bearing shin, 4.5 m/s, a model J of 75.6 N·s. It also has the best prior correspondence evidence (CG-1…6, REV2 end-to-end). It is the only case where neither authority-level blocker applies: running-presentation momentum and LV2-vs-simulation leg geometry (readiness §3).

## 3. Authoritative facts that are frozen (read, never written)

**The decisive contact:**
- PLAYER_CONTACT at tick 52 sub 2 (**τ_sim = 51.5**): tackler primitive LEG (extended left leg; its far end, the boot) → runner shin_R, planted, double support.
- Point (49.970, 34.208, 0.108); normal (0.671, −0.741).
- Contact-model values: vn 3.042, vt 3.361, J 75.64, dvCom 0.259, spin −0.303, dvTackler 0.970, supportLost true.

**Outcome:**
- **STUMBLE** (3 steps × 0.32 s, until 1.927 s).
- The tackle is a MISS at tick 80; the slide continues.
- The two contacts the simulation absorbed (ticks 66 and 68) fall outside the window.

**The simulation's balance-law constants** (pt_react.js ptRxResolve @5042230):
- ω0 = √(g / (1.13 · 0.865)) = 3.162 rad/s;
- tSup = 0.060 s;
- obstacle term 0.139 m;
- step limits fwd 0.42 / back 0.20 / out 0.30 / cross 0.12 m (× leg 0.865);
- gStep 2.756;
- maxSteps 4;
- dropCap 0.121 m;
- authoritative e0 0.312 m.

**State at activation:**
- The runner is at (50, 34) and static. Its facing is 0.
- The six tackler primitives translate together at (4.625, 0) m/s, decelerating 5.5 m/s².
- Gameplay surface clearance at τ 51.0: LEG → shin_R 19.2 mm, LEG → foot_R 32.3 mm.

## 4. Bodies and configuration (frozen)

**Runner:** **R0** (`PI1-runner-vinicius`, 73.91 kg with equipment).
- Its legs equal the simulation's runner capsules: thigh 0.435, shank 0.399, hip half-width 0.1525 m, same tapered radii.
- **Not globally qualified** (D2). Its G0 / G3 G-H-K′ / isoSelfCol status is shown on every result.

**Tackler:** **V1-matched** (H 1.90 m, 78.91 kg; qualified; KC-4 exception accepted by you).
- It matches gabriel's height and mass. No gabriel-record body exists (D3).

**World:** G2_WORLD, exactly IFM-1's configuration:
- 240 Hz;
- 150 / 2 iterations;
- plane turf;
- manifold reduction and pair cache off;
- frozen materials, Jolt 5.6.0.

**Two characters in one world:**
- Each character keeps its own disabled pairs (its own group ID).
- Every cross-character pair collides, with the frozen V2 "body" material policy.

**Controllers:** IFM-1's SnapshotTone, unchanged. K, D and the statics feed-forward come once from the bound PostureDriver at entry.
- **Runner:** support flags (L, R) = (1, 1), from the authoritative double support.
- **Tackler:** (0, 0): pelvis-rooted gravity compensation, which suits a body sitting on its pelvis.
- Both entries carry no joint rates (the runner is static; the tackler translates rigidly), so the hold targets are constant.

**Excluded:**
- RH1 (verdict C, held);
- the W mode;
- any other case or body;
- any parameter, gain, friction or solver change.

## 5. Activation timing and entry (both players at one instant)

**Instant:**
- **τ_act = 51.0** (end of row 50; two sub-steps before τ_sim; REV2's lead).
- Fallback only: if the geometry-only fixture finds any cross-character V2 clearance < 1 mm at 51.0, use the latest earlier sub-step boundary down to 50.0 that clears.
- None clears → hard stop H3.
- This is decided before any stepping and frozen.

**Runner entry:**
- The frozen MC-1 mapper on R0's own frames, applied to the LOCO presentation pose at row 50 with **all velocities 0** (authoritative).
- Both feet are stance (RF-1); grounding is IFM-1's rule (+0.5 mm).
- The pose is static, so no motion is reconstructed.

**Tackler entry: a primitive fit, new and declared.**

The authoritative primitives at τ_act map to V1-matched bodies:

| primitive | V1-matched bodies |
|---|---|
| LEG | shank_L + foot_L |
| THIGH | thigh_L |
| TUCK | thigh_R |
| TUCKSHIN | shank_R (foot_R follows) |
| BODY | pelvis |
| TRUNK | abdomen + thorax (head follows) |

**Fit procedure:**
- Projected Levenberg–Marquardt over joint angles inside the hard ranges (MC-1's fit machinery).
- **LEG is dominant:** the boot's forward-most point along the LEG axis is placed at the LEG primitive's forward extreme, b + r·û, centred on the axis.
- Arms have no primitive; they take V2's canonical shoulder / elbow angles relative to the thorax (declared).

**Tackler velocities:**
- Every body gets the authoritative common primitive velocity (4.625, 0, 0) m/s, with ω = 0.
- They are then projected onto the joint constraints with MC-1's V-d.

**Fit gates** (else hard stop H2):
- boot forward point and axis offset ≤ **10 mm** (REV2 AST-C1's number);
- every other fitted segment axis ≤ **30 mm** from its primitive (CG-1's adjacency number);
- no ROM clamp > 2°.

**Before activation (presentation only):**
- **Runner:** the LOCO presentation, a static pose.
- **Tackler:** the same primitive fit, posed per sub-step from the authoritative primitives and labelled "constructed from the authoritative slide primitives" (D4).

**What physics receives:** only the τ_act state. Authoritative data after τ_act is used **only by the evaluator**, never as a physics input.

## 6. What physics may and may not determine

| physics determines (and it is reported) | physics may not determine, and cannot (offline, read-only) |
|---|---|
| both bodies' articulated motion after τ_act | that a contact happens, the struck player or segment, the outcome class (STUMBLE), the slide decision |
| actual contact time, points, impulses and duration (compared with the authority) | anything written to rows, events, reactions, the ball or the RNG |
| support-foot loads and slip, COM / P / L of both players | a recovery, a fall or a stumble animation: none is added |
| the tackler's deceleration and deflection | a different gameplay result. Disagreement is **reported** as a status, never resolved by changing physics |

## 7. Modes and window

| mode | definition |
|---|---|
| **C0** | Both characters entered, cross-character contacts rejected (the tackler passes through). This is the control for both players at once |
| **N2** | Native contact. Primary |
| **X2** | Diagnostic, offline. N2 to the end of its first physical-contact step; full snapshot; a bit-identical no-op restore proof; then cross-contacts rejected. It isolates the effect of continued native contact |

**Window:** 36 steps (150 ms) from τ_act.
- **Primary:** steps 1–14, i.e. to τ_sim + 50 ms.
- **Secondary:** steps 15–36.

## 8. Contact and correspondence (frozen PI-1 compatibility-gate rows, REV2's physical operationalisation with A2 / E1)

**Physical contact:** a cross-character contact impulse ≥ 1e-3 N·s in a step, decoded from the contact cache with IFM-1's reconstruction.

| row | requirement |
|---|---|
| **CG-1** | the first physical contact is runner **shank_R** vs the tackler's LEG body (shank_L / foot_L). An adjacent runner body is accepted only within 30 mm of the shared joint |
| CG-2 | at the first contact, both runner boots are planted (lowest point ≤ 5 mm), as the authority says |
| CG-3 | \|t_phys − 51.5\| ≤ 1 tick |
| CG-4 | contact point within 0.10 m of (49.970, 34.208), in the same region along the segment (±0.25) |
| CG-5 | overlap of the same physical order, as REV2 defines it: ratio ∈ [1/3, 3] |
| CG-6 | normal within 45°; approach relative velocity within 45° (read from the pre-step state, E1) |

**Additional rules:**
- **PHYSICS_MISS:** no physical contact by τ_sim + 1 tick. The authority is contradicted.
- **EXTRA_CONTACT:** a physical contact pair absent from the authoritative record, e.g. the tucked knee on the runner's left leg. It is reported with its impulse share and labelled if it carries > 10 % of the primary-window cross impulse.
- **Equal and opposite:** the decoded impulses on the runner from the tackler equal minus those on the tackler from the runner, ≤ 1e-9 N·s per step.

## 9. Integrity and ledgers (IFM-1's frozen numbers, per character and for the two-character system)

**Integrity:**
- anchors ≤ 1 mm;
- self-penetration ≤ 10 mm (cross-character penetration reported against the same 10 mm);
- turf penetration ≤ 10 mm;
- no emergency stop;
- actuator capacity respected;
- **safe stop:** a non-finite state or any body > 25 m/s.

**Ledgers:**
- **Linear:** ≤ 0.01 N·s / step and 0.05 N·s cumulative over the primary window.
- **Angular** (about the fixed system COM at entry, position-correction term included): ≤ 0.01 N·m·s / step and 0.05 cumulative.
- **Energy** (Σ⁺ of the residual, combined system): ≤ 0.5 J primary, ≤ 5 J secondary.

Per-character ledgers treat the cross-character impulses as external. The combined ledger has only turf as external.

**Status:** primary failure → NATIVE_INTEGRITY_FAILED. A later failure → SECONDARY_FAILURE_AT(t). A valid primary result is preserved either way.

## 10. Outcome consistency (the authoritative recoverable outcome)

**Runner, within the window:**

| row | requirement |
|---|---|
| **OC-1** | no runner non-foot body touches the turf |
| **OC-2** | pelvis COM drop ≤ the simulation's dropCap, 0.121 m |
| **OC-3** | **the simulation's own balance law on the physical state** (below) |

**OC-3 procedure:**
1. At t\* = t_phys + tSup (0.060 s), take the physical extrapolated COM error relative to the remaining support foot: e = (c_h + v_h / ω0) − ankle_L,h. Here c and v are the whole-body COM with V2 masses.
2. Compute eH = |e| + 0.139 (the authoritative obstacle term).
3. Compute the reach from the simulation's anisotropic step formula, in e's direction.
4. Apply the simulation's step recursion (gStep 2.756, maxSteps 4).

**OC-3 classes:**
- CORRECTION / STUMBLE → **RECOVERABLE (consistent)**;
- **FALL → OUTCOME_INCONSISTENT**;
- NEGLIGIBLE → RESPONSE_WEAKER_THAN_AUTHORITY: consistent with no fall, but under-responding.

The e(t) series over the whole window is reported too.

**Tackler:**
- **OC-T:** the slide continues, with the tackler's COM velocity along +x > 0 for the whole window (the authority has no stop). Otherwise OUTCOME_INCONSISTENT (tackler).
- Reported only: the physical tackler Δv vs the simulation's 0.97 m/s, and the physical vs model impulse (REV2's stand-in gave 19.9 N·s total, against J 75.6). These are different models, compared descriptively.

## 11. Controls, determinism and neutrality

**C0 validity (primary window):**
- **Runner:** both boots loaded every step, slip ≤ 10 mm, pelvis ≥ 0.85 × entry, no non-foot turf contact, integrity and ledgers pass.
- **Tackler:** the boot forward point tracks the authoritative LEG tip within **10 mm** up to τ_sim (AST-C1). It stays sliding, and integrity and ledgers pass.
- If either control fails → CONTROL_INVALID_PRIMARY. N2 is then reported but not interpreted.

**Two-character isolation:**
- Each character in C0 is compared with the same character alone in a one-character world.
- Expected: bit-identical, or ≤ 1e-6 m / 1e-6 rad over the window.
- Otherwise hard stop H6: a harness composition defect.

**Determinism:**
- C0 and N2 each run twice in fresh processes, plus once more in reverse order in one process. All must be bit-identical.
- The X2 no-op restore must be bit-identical to uninterrupted N2.
- Rendered poses and pixels must be repeatable.

**Neutrality:**
- ib_verify before and after.
- The gameplay hash a2678624 is recomputed from the consumed rows and events, before and after.
- The harness opens records read-only and has no write path.
- Reported status: **READ_ONLY_RECORD_NEUTRALITY_PROVEN / LIVE_NEUTRALITY_NOT_TESTED** (D5).

## 12. Visual review protocol

**Primary view:**
- The frozen RUN-1 viewer and character renderer, CAMERA_V1, zoom 1, 1280 × 720, 60 Hz.
- The rail follows the mean authoritative x of the two players (the frozen viewer's own multi-subject rule).
- Players: runner vinicius, tackler gabriel. Both meshes are frozen tag assets.
- Render rule: MC-1 §2(4) on each character's own rig.
- **Content:** 250 ms before activation, then the 150 ms record.

**Synchronised diagnostic:**
- The viewer's own **6×** zoom (same camera pose and perspective), subject-centred on both players.
- Every 1/240 s step, at 0.25× and 0.1×.
- **CLEAN:** labels only.
- **DIAGNOSTIC:**
  - both skeletons;
  - every cross-character contact point, normal and impulse;
  - struck bodies;
  - support-foot loads;
  - COM, P and L for both players;
  - the C0 skeleton drawn on N2.
- Pairs shown: C0 | N2 and N2 | X2.
- Nothing is amplified.

**Reported:**
- COM / P / L plots for both players;
- per-step cross impulse;
- foot loads;
- e(t);
- pixel differences at the gameplay camera (IFM-1's 2 px marker, a screen only).

**Your judgement:**
1. both players before activation;
2. seamless activation;
3. the first contact on the right region;
4. 0–50 ms;
5. continued contact;
6. propagation through the runner;
7. the tackler's reaction;
8. support-foot behaviour;
9. whether it looks articulated rather than translated;
10. consistency with a recoverable stumble.

Until you review: **VISUAL_PENDING.** If the interaction is subtle at the gameplay camera, that is reported plainly.

## 13. CPU

- Construction (two plants) is timed separately from stepping.
- 1 warm-up, then 20 replays per mode, instrumentation off.
- Reported: per-step median / p95 / max for the two-character world, and 50 / 150 ms event totals.
- Components:
  - Jolt;
  - passive tissue;
  - actuators;
  - SnapshotTone;
  - entry mapping (MC-1 runner, primitive fit for the tackler);
  - contact decoding and instrumentation, separately.
- **X2's branch overhead is measured** (IFM-1 missed this).
- This is a measured two-receiver island, not an extrapolation. No multi-player claim.

## 14. Hard stops (stop and report; nothing is tuned or re-run with changes)

| # | condition |
|---|---|
| **H1** | provenance mismatch: record / tag / simulation / spec hashes differ, or ib_verify ≠ 59 / 1 / 0 |
| **H2** | TACKLER_FIT_BLOCKED (§5 gates) |
| **H3** | INITIALIZATION_INVALID: no clear activation instant, any cross-character V2 overlap at τ_act, turf penetration > 1 mm, entry read-back / momentum failures (IFM-1's thresholds), or a mapper-invalid runner entry |
| **H4** | CONTROL_INVALID_PRIMARY: N2 is still reported, but not interpreted |
| **H5** | safe stop (non-finite, > 25 m/s) |
| **H6** | two-character isolation failure |
| **H7** | any need to change physics, gains, geometry, the solver, thresholds or the simulation to proceed |

## 15. Statuses and verdicts

**Statuses:**
- PROVENANCE_BLOCKED;
- TACKLER_FIT_BLOCKED;
- INITIALIZATION_INVALID;
- CONTROL_INVALID_PRIMARY;
- PHYSICS_MISS;
- NATIVE_CORRESPONDENCE_FAILED (which CG rows);
- EXTRA_CONTACT;
- NATIVE_INTEGRITY_FAILED;
- SECONDARY_FAILURE_AT(t);
- OUTCOME_CONSISTENT;
- OUTCOME_INCONSISTENT (runner or tackler);
- RESPONSE_WEAKER_THAN_AUTHORITY;
- PRIMARY_MECHANICS_VALID;
- VISUAL_PENDING;
- VISIBLE_VALUE_LOW (only after your review).

R0's global status is always shown.

| verdict | when |
|---|---|
| **SUCCESS (scoped)** | entry valid for both; C0 valid; CG-1…CG-6 pass; N2 primary mechanics valid; OC-1…OC-3 and OC-T consistent; determinism and neutrality pass; **and your visual review accepts it** |
| **MECHANICAL PASS** | all of the above except the visual review (VISUAL_PENDING) |
| **PARTIAL** | entry, C0 and primary mechanics valid, but any of the following: a CG row fails while contact still occurs within ±1 tick; RESPONSE_WEAKER_THAN_AUTHORITY; consistency in primary only; SECONDARY_FAILURE; EXTRA_CONTACT; or the interaction is too subtle to be visible |
| **ARCHITECTURAL FAILURE** | with valid entry and C0: **PHYSICS_MISS**; **OUTCOME_INCONSISTENT** (FALL under the simulation's own law, a fall contact, or the tackler stopped); or NATIVE_INTEGRITY_FAILED in the primary window. Native, unconstrained physics then cannot explain this authoritative interaction without extra constraint, which is a different architecture |
| **BLOCKED** | H1–H3, H6 or H7 before any interpretable result. No architectural verdict |

## 16. Sequence after approval

1. Save your approval verbatim.
2. Bind and verify the inputs (manifest, as IFM-1 did).
3. Build only the isolated PVP-1 harness: the two-character world, the entries, the evaluator and the renderer extension.
4. **Pre-run freeze:** the geometry-only fixture (entries, fit residuals, clearances, the kinematically predicted first-contact pair) and the implementation hashes, before any PVP-1 Jolt stepping.
5. Run C0, N2 and X2, the determinism runs and CPU.
6. Evaluate and render.
7. Write `PVP1_RESULTS.md` (observations / interpretations / unknowns) and a one-page decision.
8. Stop for your review.

**Throughout:**
- No production integration, recovery, tuning or second case.
- Nothing pushed without your approval.
- RUN-1, V2, R0, RH1, V1.3 and IB-1 are unchanged.

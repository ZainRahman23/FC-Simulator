# BALANCE-2 C3 report: balance within the rigid foot's legitimate support

**Owner decision** (12 Oct 2026, 22:12; `sources/2026-10-12_user_instruction_balance2_c3_legitimate_support.md`): rigid boot-tip support is not legitimate toe support. C3 had to keep C2's legitimate improvements and respect the rigid foot's legitimate support envelope, without compensating for the missing toes. PVP stays sealed.

**RECIPIENT STATUS: C. BODY / STANCE ARCHITECTURE DECISION REQUIRED** (frozen C3 rule, `BALANCE2_C3_PREREGISTRATION.md` §5).

- C3 balances on legitimate support only. It is causal and deterministic, and it genuinely falls beyond its legitimate limit.
- It scores **15 / 17** on the frozen matched battery, exactly as preregistered.
- It fails T1′ forward (12.09 N·s vs ≥ 13.01). That band is scaled to a support edge that only the boot tip reaches.
- It also fails P8 (backward small overshoot 0.287 vs ≤ 0.26), inherited unchanged from C2.
- **C3 is not frozen as the qualified no-step recipient baseline**: that required 17 / 17. C3 stays frozen as a candidate (`BALANCE2_FREEZE_C3.json`).

## 1. What I found first: the in-band forward capacity of B and C2 was boot-tip support

A new measurement (`scripts/c3_support.mjs`) classifies every loaded contact point in the foot's own frame:
- **flat sole:** heel to the oblique MTP break, at most 1 mm above the sole plane;
- **raised boot tip:** the toe spring, 3–12 mm above the sole plane.

Applied to every run of the frozen matched battery:

| System | Recovered runs that load the boot tip | What it means |
|---|---|---|
| BALANCE-1 B | forward threshold levels 13.65 and 14.22 N·s (100 % on the tip for ≈ 1 s); backward limit (40 %, after rocking forward) | B's T1′ forward pass (14.36) used the boot tip |
| C2 | the matched forward limit push 14.83 N·s, and threshold levels 13.65–16.5 N·s (100 % on the tip) | C2's T1′ forward pass (16.64) used the boot tip. Physically it also recovers 16.64–21.5 N·s, which the frozen rule scores as falls |
| **C3** | **none** | |

**Tool checks** (`evidence/C3_SUPPORT_TOOLCHECK.json`, `C3_LEGIT_TOOLCHECK_ON_C2.json`, `C3_LEGIT_TOOLCHECK_ON_B1.json`):
- quiet standing scores 0, and the tool flags the documented saves;
- every rerun reproduced its stored matched-battery hash.

## 2. What C3 is

**C3 = C2 + one mechanism.** C2 (preserved, unchanged) is BALANCE-1 B plus:
1. the quiet-band AP integral;
2. the support-aware AP internal model;
3. direction-specific muscle constants.

**The added mechanism (4) is a support-envelope governor** (`c3/c3_ctrl.mjs`).
- C2 already modelled the flat-foot envelope (heel edge −124.76 mm, oblique MTP line +64.8 mm; Kim 2009's 93 N·m allowable flat-foot torque), but only to predict.
- C3 bounds the AP COM command, in all COM-map rows together, to the largest value whose modelled developed force stays inside that same envelope.
- The command may lead the force, as muscle lag requires, but the developed force does not leave the flat-foot envelope.
- It never raises or reverses a command, and it does not touch ML or any other objective.

**Unchanged:** no gain, delay, support constant, anatomy, stance, foot geometry, M1b, matched criterion or fall rule changed. The hip-map defect is preserved, not repaired, and no hip transfer was used.

**Selection, on the development set only** (`c3/C3_DESIGN_LOG.md`). Three governor modes and a selection rule were declared and committed before any C3 run (`727f4751`).

| Mode | DEV forward threshold (100 ms) | Boot-tip load at recovered levels |
|---|---|---|
| C2 (reference) | 16.64 | 1.00, not eligible |
| Command clamp | 11.48 | 0 |
| Activation bound | 11.48 | 0 |
| **Developed-force bound (adopted)** | **12.42** | **0** |

The preregistration and freeze (`d590fd46`) came before any C3 run on the matched battery.

## 3. Results

### Matched battery B2M (`evidence/B2M_V_BALANCE2_C3.json`)

| | Result |
|---|---|
| U1–U6 (quiet standing) | Pass. Bit-identical to C2: the governor never acts in quiet stance |
| P1, P2 (small / moderate recovered) | Pass |
| P3 (over-limit falls) | Pass |
| P4′, P5, P6, P7 | Pass |
| **P8 (overshoot ≤ 0.26)** | **Fail**: backward small 0.287. Other overshoots: fwd small 0.05, fwd moderate 0, back moderate 0.232, lateral ≤ 0.06 |
| M1′ (Rietdyk-matched) | Pass: forward peak 30.8 mm, settled 1.71 s; left 52.8 mm, 2.56 s |
| **T1′ (thresholds)** | **Fail**: forward 12.09 (band 13.01–18.22). Backward 20.23, left 25.88 and right 26.61 are in band |
| DET (determinism) | Pass: bit-identical reruns |

### Legitimate support (`evidence/C3_LEGIT_BALANCE2_C3.json`)

- **L1 pass.** Across all 27 non-fall runs (of 47 re-run), the boot tip carries no load in any of them: U, every recovered P and M′ push, and every non-fall threshold level.
  - The largest forward heel lift is 1.7°.
  - Backward near-limit runs rock onto the heel edge (up to 9.3°). The heel edge is flat sole, inside the frozen support.
- **L2 pass.** The physical forward limit is 12.13 N·s against a frozen-rule threshold of 12.09.
  - Every push on the forward grid (14.83–28 N·s) genuinely falls.
  - None ends in a feet-in-place save.

### Causality (`evidence/B2_CAUSALITY_BALANCE2_C3.json`)

**PASS.** C1–C3 are the unchanged BALANCE-2 audit:
- the first command difference is at 29.2 ms;
- the internal state is unchanged until the delayed channels contain the push.

C4 (new) checks the governor's own trace. Its first differences are at step 499 (hip channel) and step 505 (ankle channel), exactly onset + 1 + the 18- and 24-step COM-channel delays.

### Human comparison (`evidence/C3_FINAL_SUMMARY.json`; reported, not judged)

Forward no-step threshold as a fraction of the zero-delay limit:

| | At the battery edge (102.95 mm) | At the legitimate flat-foot loaded edge (80.3 mm) |
|---|---|---|
| Human "try not to step" | 0.50–0.70 | 0.50–0.70 |
| BALANCE-1 B | 0.552 | 0.708 (boot tip) |
| C2 | 0.639 | 0.820 (boot tip) |
| **C3** | 0.464 | **0.595** |

- Relative to the support it legitimately has, C3's forward capacity is human-typical.
- Its absolute value falls short of a band derived from boot-tip reach.
- The other human metrics on small and moderate pushes are C2's, because the governor is inactive there (torque slew, head / thorax ratio, knee excursion; see the review page).
- Quiet sway is 1.38 mm against a human 4.1–4.3 mm. It is noise-model-limited, as before.

### Visual review (`c3/review/BALANCE2_C3_REVIEW.html`)

- 28 synchronized clips: 7 scenarios × normal and slow, clean and overlay. Panels: CURRENT V2 · B · C2 · C3.
- 5 inspection stills.
- The clips agree with the measurements:
  - **12 N·s:** C3 recovers on the flat sole.
  - **14 N·s:** B and C2 rise onto the raised boot tips and come back. C3 goes over on its flat sole and is down by +2.2 s, a genuine fall with the feet in place.
  - **21.5 N·s:** C3 falls.
- Nothing was tuned from the clips.

## 4. Why the status is C, not B

The preregistered precedence is D > C > B > A. C3 passes L1, L2 and causality, so it is not D. It fails T1′ forward, which maps to C ahead of P8's B.

The substance: the frozen T1′ forward band uses the battery edge, d = 102.95 mm. `BALANCE2_MATCHED_CRITERIA.md` §2 describes that edge as V2's analogue of human toe reach, "the boot rocker, reached by pitching". Under the owner's decision, that reach is not legitimate. The same document already discloses what the legitimate flat-foot edge (80.3 mm) gives: T = 11.6 N·s, band 10.15–14.21. C3's 12.09 sits inside that band. I did not use it to judge C3; changing the criteria is the owner's decision.

## 5. Owner decisions (C3 is not frozen as qualified)

1. **Forward support representation.** Choose one:
   - **articulated toes** (closed earlier as an engine-solver limitation, Track A, 9 Oct);
   - **stepping**, the future mechanism;
   - **re-derive the T1′ forward band at the legitimate edge.** That would mean re-preregistering B2M's forward magnitudes, then re-running C3 unchanged.
2. **P8 backward small overshoot (0.287).** C2 design log D8 found it body-side: M1b's history-dependent post-push offset. Fixing it would need a separately preregistered mechanism.
3. **The HAT-map defect** (BALANCE-1's trunk-lean loop inactive at the hips in AP). Preserved and documented. A hip strategy would need the corrected map plus new trunk-loop gains, which needs its own preregistration.
4. **Carried forward from BALANCE-2:** the noise model behind the low quiet sway, head–trunk coordination and knee excursion.

## 6. Records and commits

**Commits:**
- `fe301b36`: instruction, verbatim;
- `727f4751`: DEV declaration and tools;
- `d590fd46`: C3 freeze;
- results and review: this commit.

All are local; nothing was pushed.

**Outside Git:** the C3 review records (7 runs, 113 MB, `SHA256SUMS_C3`, `FINAL_HASHES_C3.txt`) are in `_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance2/records/`, next to the BALANCE-2 records. The clip data (scratch) regenerates from the records (`render/c3_save_runs.mjs` → `ppr3_clip_prep.mjs` → `ppr3_capture.cjs` with `c3/review/video/VIEWS_C3.json`, one view per process).

**PVP was not run.** Nothing in PVP, the slide, Astra's branch, the simulation, authoritative outcomes or RUN-1 was touched.

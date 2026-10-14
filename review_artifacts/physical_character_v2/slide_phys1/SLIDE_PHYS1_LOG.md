# SLIDE-PHYS-1 working log (preserved as written; later entries never rewrite earlier ones)

Instruction: `sources/2026-10-13_user_instruction_slide_phys1_physical_slide_tackle.md` (commit fdbc14db, 13 Oct 23:48).
Reference recording: outside Git (third-party footage) at `_preserved_2026-10-13_evidence_outside_git/slide_phys1/reference/REFERENCE_2026-10-13_19.40.42.mov`, sha256 `b8aa9a08…7c467c27`.

## 0. Reference first (13 Oct 23:48 → 14 Oct 00:05)

The clip is 15.12 s at 60 fps (830 × 1104). It is a vertical EA FC "how to use this playstyle" edit made of several clips:

| clip | time (s) | content |
|---|---|---|
| 1 | 0.00–3.30 | Slide Tackle. A white defender jockeys beside the navy dribbler, drops into a sweeping slide through his feet at about 1.75 s, and the dribbler is sliced out. The replay angle from 1.87 s shows the slide, then the slider's forward roll onto his hands and a fast get-up (standing again by about 2.6 s). |
| 2 | 3.37–6.63 | Tackle with R1 held. A white defender slides at the grey #7 at 3.70–4.30 s: the lead leg is extended, the trailing leg folds under, he slides on the trailing hip and thigh with the trailing hand posting, trunk upright then leaning back. |
| 3 | 6.65–8.83 | Slide Intercept. White #6 runs and throws himself sideways (nearly horizontal within ≈ 0.1 s) to block a pass with his legs; replay with turf scuff marks. |
| 4 | 8.83–12.28 | Slide Block. A blue defender's sideways block slide with the legs raised. |
| 5 | 12.28–15.12 | Slide Tackle loop (clip 1 again). |

**Method.**
- Every frame was extracted. Contact sheets at 4 / 15 / 30 / 60 fps and zoomed crops were viewed in sequence.
- MediaPipe pose (heavy model) on 4× upscaled crops gave 2-D keypoints.
- A grass-feature optical-flow homography removed camera motion.
- Scale came from the ball (≈ 88 px/m); player heights put the camera depression at ≈ 45°.
- The "1.00" overlay appears only on the loop clip. Self-similarity of runner strides gives plausible real-time step rates, so the replays are not slow motion. That is inferred, not certain.

**Observations so far** (the full classified analysis goes in the report):
- **OBSERVED (clips 1 and 2):**
  - **Approach:** slow (≈ 1.5–3 m/s relative to the grass; clip 3 ≈ 5 m/s).
  - **Commitment:** a lead-leg reach plus a rapid fold of the support leg.
  - **Hip motion:** the hip lurches horizontally toward the slide while it descends. In clip 2 the lateral hip speed rose from ≈ 1 to ≈ 3–4 m/s in the screen-x direction. Its descent is monotonic, with no upward spring at the commit.
  - **Trunk:** upright, then leaning **back**.
  - **Arms:** the lead arm swings out and forward-up; the trailing hand reaches back to the turf.
  - **Ground contact:** the trailing shin and knee first, then the trailing-side hip and thigh. The slide lasts ≈ 0.3–0.5 s, followed by a quick get-up.
- **OBSERVED (clip 3):** the body is thrown sideways and is nearly horizontal ≈ 0.1 s after the commit. This "knife" look exists in the intercept and block slides, not in the tackle clips.

## 1. Evidence read (summaries from three read-only agents plus my own reading)

- **Earlier slides:**
  - Defending V1 / V1.1 / V1.2 (sim slide: v0 = own + 1 m/s, clamp 4.2–7.5, decel 5.5 m/s²);
  - rear-contact friction and Follow-through V1 / V2;
  - Reference Tackle V1 (a different clip, 29 Sep: a low leap, then the trailing foot, then the seat);
  - RDS-1…4 (Astra/Codex, 12 Oct): a reference-driven slide whose lead hip "asked 260, got 64 N·m", and every variant fell forward.
- **K / L audit:** `scratchpad/astra_audit/ASTRA_SLIDE_A1_AUDIT.md`, copied into the report.
  - K accelerates the root 2.5 → 7 m/s at up to 3.1 g, 63 % of it with no foot on the ground.
  - Its flight is not ballistic.
  - The pelvis meets the ground at −1.6 m/s and is stopped at up to 7.3 g.
  - L is a refinement with the same root problems.
- **Literature** (`research/` in the report): van den Eijnde 2017 (the only lab study):
  - approach 4.5–5.0 m/s;
  - free fall, then a knee impact (30 ms), then hip/thigh (3–6.5 BW in the jumping slide), then a glide (≤ 1 BW);
  - horizontal/vertical force at the hip 0.37–0.46.
  - Hip impacts in sideways falls are 2.5–3 m/s.

## 2. Body and actuator audit

- **Tackler body:** the V1-matched V2 instance (1.90 m, 78.9 kg), the qualified V2 body closest to gabriel (PVP-1A D3).
- **Contact model:** body|turf 0.5, boot|turf 1.2, hand|turf 0.7, restitution 0.
- **`evidence/caps.json`:** canonical M1b capacities.
- **`evidence/m1b_effective_fv.json` — M1b is inadequate for fast voluntary motion.**
  - At full, steady excitation the effective torque of a shortening group collapses: hip flexion ≈ 0 N·m at ≥ 4 rad/s, hip extension ≈ 0 at ≥ 5, knee flexion ≈ 0 at ≥ 5, knee extension 14 N·m at 8.
  - The spec's own Hill capacity at those speeds is 95 / 117 / 93 / 90 N·m.
  - Cause: the short-range stiffness K (θ_y = 1°) and the damping D = 2ζ√(K·I) built on it act on the full joint velocity, so they double-count force–velocity.
  - This explains RDS's "260 asked, 64 got" and RUN-1's swing-hip capacity note.
- **M1c (`scripts/sp_m1c.mjs`, candidate, NOT adopted):** M1b except that a group's short-range K and D fade with that group's own shortening speed, λ = 1/(1 + (v_sh/ω_c)²), ω_c = θ_y/τ_cb, τ_cb = 20 ms [MODEL].
  - Lengthening and near-rest behaviour is identical to M1b.
  - `evidence/m1c_effective_fv.json`: effective torque = the spec's Hill capacity.
  - C3 (the recipient) stays on canonical M1b.

## 3. Generations (hand-built; each kept in `scripts/sp_cand.mjs`; ledger `evidence/generations.json`)

The ledger re-ran every candidate under the final plant, which includes the entry muscle-state fix below (G14b). As-run records of G1–G13, made before that fix, are kept separately outside Git.

| gen | change | what happened | lesson |
|---|---|---|---|
| G1 | joint tracking only, 6 m/s entry | belly-flop (belly normal −0.98) | joint tracking cannot hold whole-body orientation |
| G2 | + support-chain COM / pelvis objectives (Jacobian-transpose through the plant leg; SIMBICON stance-hip rule) | plant gave 0.3 BW | the plan demanded faster than gravity |
| G3 | feasible plan | plant leg's stiff tracking bounced the body up | |
| G4 | plant joint tracking α 0.3 | still a bounce | a straight plant knee (8°) at 6 m/s is a vault strut |
| G5 | knee 22° yielding plant | trip | the tackling boot drags behind the COM: +73 N·m·s of forward pitch (sp_angmom audit) |
| G6 | feet-first idea | boot strikes at 0.07 s | knee extension while the thigh points down drives the boot into the turf |
| G7 | swing-through then yield | trip | |
| G8 | low push-off, scissor, feet-first; TCF-1 sole rule (studs only when the sole faces the turf) | trip | |
| G9 | swing clearance / dorsiflexion | boot toe caught at 0.13 s | |
| G10 | + inverse-dynamics feed-forward on free chains | no change | swing knee cannot be folded beyond its dynamics |
| G11 | 5 m/s (literature), entry swing knee at its mid-swing fold | boot strike | |
| G12 | sliding-in bent-leg slide | dragged plant (+36) and tackling boot (+47) | |
| G13 | jumping slide, short plant | plant delivered 0.6 of 1.8 BW | |
| G14 | pre-activation (support objective in the entry command) | no change → **found the entry muscle-state defect** | the parked construction state had zero velocity, so the first command saw the entry joint rates as error: knee flexors fully on at touchdown. Fixed in `sp_lib` `SoloPlant._activate` (command recomputed on the true entry state). G14b = after the fix: the plant supports and pushes off |
| G15 | folded-high tackling leg | tackling hip stalls | **M1b**: fully excited, fully developed hip flexors deliver ≤ 0 N·m at ≈ 8 rad/s → the M1b audit above |
| G16 | G15 on **M1c** | hip delivers 70–150 N·m, but its thigh hits the plant thigh at 0.042 s (12 N·s; colliders ≈ 8 mm apart) | |
| G17 | swing abduction | **no longer a belly-flop** (face-down steps 320 → 53), but the plant is dragged | M1b/M1c hip force reverses over ≈ 0.15 s (τ_rise 135 ms, voluntary-RTD data) |
| G18 | anticipatory plant fold | boot strike | time-keyed knee extension runs ahead of the hip actually achieved |
| G19 | **proprioceptive coupling**: tackling-knee target follows the actual hip | clearance to 0.29 s, but reactive | |
| G20 | predictive coupling (0.1 s) | feet-first entry; rendered: kneeling lunge → chest dive → prone | |
| G21 | leading-leg press objective (tactile-gated) | presses the boot behind (+87) | |
| G22 | clearance rule + ahead-gated press | rendered: knee slide, then tip-over | |
| G23 | roll to the fold side (lateral plant push) | first slide-like entry; pitch balanced (heel −38 vs thigh +46); over-roll onto the front | |
| G24 | less roll | worse | **chaotic sensitivity**: one-at-a-time hand tuning does not converge |

## 4. Physics-in-the-loop authoring search (disclosed tool)

- **Search:** `scripts/sp_param.mjs` + `scripts/sp_search.mjs`. CMA-ES over 18 normalised, physically meaningful choreography / intent parameters of the G23 structure.
- **Robustness:** every candidate is simulated at 4.5 / 5.0 / 5.5 m/s and scored as mean + 0.5 × max.
- **Objective (`sp_param.cost`):** it encodes the brief's Stage-1 qualification items, not a style score:
  - no face-down and no head / chest contact;
  - fold-side ground entry;
  - tackling knee extended and boot ahead at entry;
  - landing |v_y| ≤ 2.5 m/s and v_h ≥ 3.2 m/s;
  - a sit-back trunk during the slide, fold-side roll, and a slide of 1.2–4 m.
- **Search 1** (30 generations × 16, 1,440 runs; `evidence/search1/search_log.json`): cost 30.0 → 8.0.
- **Best at 4.5 / 5.0 m/s:**
  - minimum belly normal −0.14 / −0.19 (no face-down);
  - trunk reclined 24 / 33° during the slide;
  - fold thigh first; tackling knee 24 / 33°, boot 0.86–0.91 m ahead;
  - v_y −2.3 / −1.9 m/s, v_h 4.05 m/s at entry.
- **Still wrong:** the fold leg rests on the shin and knee more than the hip; after 0.8 s the body tips back until the head touches; the slide is short (0.7–1.2 m); at 5.5 m/s the trunk still pitches forward.
- Rendered (close side / front ¾): the first candidate that reads as a bent-leg slide tackle.

## 5. Searches 2–5 (14 Oct 00:30 → 01:57)

- **Search 2** (+6 parameters: fold-leg late posture, slide roll, press taper, late trunk, posting arm; `evidence/search2_log.json`): cost 8.0 → **1.01** (objective of that time). Rendered: a believable bent-leg slide — seated on the fold thigh / hip, tackling leg extended, leaning back onto the posting forearm. At 5.0 m/s: entry 0.46 s on thigh_L, v_h 3.67, v_y −1.67, recline ≈ 40°. Robust 4.5–5.5 m/s; fails at 5.75–6.0. Slide short (≈ 0.44 m).
- **Search 3** (+ tackling-foot presentation: hip rotation, ankle dorsiflexion): best 2.12 — no better. **Search 4** (+ joint-limit and stud terms): best 2.94; the tackling boot's stud fraction stays ≈ 0.9.
- **Hold diagnostic** (tackling thigh held up through the seat landing): stud fraction 0.65, slide 1.13 m, but the head touches at ≈ 1.25 s.
- **Search 5** (28 parameters from the hold point, joint-limit cost): **stopped after 13 generations** — no improvement on its start (27.55 overall). Log preserved (`evidence/search5_log.json`).

## 6. G25 — explained single-variable variants, and the choice of SP1 (14 Oct 01:57 → 02:20)

- **Joint-limit audit in the plant's own constraint coordinates** (`scripts/sp_climits.mjs`, read-only subclass; hash identical to the plain run). The anatomical decomposition (`sp_limits`) had reported shoulder_R abduction −34° — **not a constraint violation** (a decomposition artefact of cross-body adduction). The real one: **ankle_R inversion 13.5° beyond the hard limit for 0.38 s from 0.48 s** — the tackling heel strikes first (≈ 10 BW), the foot slaps onto its lateral edge and the contact drives the ankle past its stop. Contacts win, so this is physically consistent but anatomically an inversion-sprain load.
- **The hold variant fixes it** (6.6° for 13 ms at 5.0) but the body then falls back (head 1.25 s at 5.0, 1.50 at 4.5) or rolls face-down (5.5). Cause: the tackling-leg press objective is the slide's only pitch control, and holding that leg up removes it.
- **Trunk counter-flexion while the leg is held** (lumbarLate 10 / 15): no effect (recline 53–57° at 5.0).
- **Seat objective** (new, optional, `cand.seat`: the same pelvis-orientation objective realised through the FOLD leg's hip while that leg is on the turf and the press is not engaged; `sp_vf` `yieldTo` hand-over; no support force): worse — it realises the press's backward pelvis target better, so the body reclines further. Seated-pitch targets −10 / 0 / +8°: no change at 5.0; the fold hip is at its own limit (hip_L 3–5° beyond hard), so it has no authority left.
- **Hold alone on S2 best** (hipRhold 0.12 / 0.25): head contact at 4.5 and 5.0; face-down at 5.5.
- **toPhys bug found and fixed** (`sp_param.toPhys`): a null entry shifted the later parameters' indices (only affected variant runs with gaps; the searches' vectors had no gaps; S2-best and search-5-start hashes unchanged).
- **Decision: SP1 = S2 best** (`evidence/sp1/SP1_u.json`, `SP1_params.json`), authority **A5**, M1c tackler, TCF-1 sole rule. It is the only candidate with no head contact and no face-down at 4.5 / 4.75 / 5.0 / 5.5. Known defects kept visible:
  1. Ankle_R inversion overload at the heel strike (12.5–16.6° beyond hard, 0.33–0.41 s; 5.7° at 4.5).
  2. Short slide (0.42–0.52 m at 4.5–5.0; 1.14 m at 5.5): decelerates at ≈ 9 m/s² after entry (literature glide μg 3.9–7.8).
  3. At 5.25 m/s the slider lies back until the head rests on the turf at 1.31 s (0.6 m/s at contact — a lie-back, not an impact).
  Log of all variants: `evidence/G25_variants_log.txt`. Further single-variable tuning would be unsupported tuning (stop condition C for Stage-1 refinement); the defects are reported, not hidden.
- **Determinism:** SP1 / A5 / 5.0 rerun: hash `8f2fbbf0bed38c95` both times.

## 7. Stage 2 — obstacles (SP1, A5, 5.0 m/s; obstacle 0.35 m ahead of the boot at its touchdown t = 0.40 s)

- `scripts/sp_stage2.mjs`, `scripts/sp_obst.mjs`; summary `evidence/stage2/stage2_summary.json`. Six runs in 4.9 s wall; rerun hashes identical.
- **O0 none** (hash = Stage-1 SP1). **O1 3 kg box** (J 11.7 N·s): leg deflects (ankle 29°, hip 17°), box knocked away; the slide shortens and the body falls back (head 1.40 s). **O2 15 kg**: knee pushed 77° off its reference, then a face-down roll. **O3 60 kg** / **O4 immovable**: the tackling knee is folded 128–131° by the obstacle (contact wins: max depth 0.8–1.2 mm); the body pivots over the stopped leg. **O5 static wall**: J 108 N·s, leg folds 31°, the body stops against it.
- **Never pushes through**: max obstacle depth 0.8–1.2 mm in every case.
- **Findings about A5:** the tackling-leg local yield (e0 12°, from 0.5 s) is active on some axis in **every** step of the normal slide, so it is not a disturbance-only mechanism; the post-hit rms tracking error peaks at 28.5° (O3 / O4), below the whole-body fallback threshold (30° for 60 ms), so **the fallback never fired** — a whole-body rms dilutes one folded knee. The interruption is real (the leg yields, contacts win), but the "larger yielding / ragdoll" path was not exercised.

## 8. Stage 3 — C3 × SP1 (unchanged C3; activation step 408; `scripts/sp_stage3.mjs`, analysis `scripts/sp_stage3_analyze.mjs`)

- **Placement bug fixed before any run:** the draft STRONG line (−0.21 m) passed behind the recipient's heels. The recipient faces +x with feet at z ±0.21; the tackler travels −z from its LEFT. Corrected conditions: LIGHT 4.5 m/s, line +0.12 m toward the toes; MODERATE 5.0, through the near foot's centre; STRONG 5.5, 0.05 m toward the heel. **Timing rule:** the boot meets the target 0.08 s after its own first touchdown (sliding, not stamping).
- **CALIB** (tackler 10 m clear): recipient stands (pelvis 0.912 → 0.913 m) — the twin.
- **LIGHT:** first contact 0.43 s boot × boot (248 N·s, peak 5968 N); recipient displaced (feet 0.87–0.89 m), stands ≈ 1.2 s, then falls against the sweep (−0.99). Slider lies back.
- **MODERATE:** first contact 0.41 s; the slider is stopped by the boot and rolls forward onto its hands; the recipient stands over its legs ≈ 1.3 s, then trips and lands across its back (fall 1.77 s after contact).
- **STRONG:** first contact 0.40 s; the near foot is swept 1.52 m along the sweep and leaves the turf (1.08 s after activation, 0.68 s after contact) before the pelvis drops 0.15 m (1.54 s after activation); the recipient falls ALONG the sweep (+0.99) over the slider — the **sliced-out signature** (measured, not scripted).
- Ledgers: equal-and-opposite dJ = dH = 0 every step; system residual after activation ≤ 0.0003 N·s / 0.085 N·m·s. Wall 3.0 s per 1300-step two-character run.
- **Horizontal impulse check** (analysis extended: horizontal / along-sweep / vertical, and the first 0.2 s): LIGHT 263 N·s horizontal (190 in the first 0.2 s), MODERATE 308 (167), STRONG 181 (110). SUPPORT-1's recipient falls from ≈ 48–80 N·s, so all three were far past the fall threshold: a slider stopped by the boot hands over its momentum.
- **GRAZE** (added, LIGHT kept; 4.5 m/s, +0.20 m: only the boot tips can meet): ABSORBED (feet 2 cm, COM 1.4 cm) — but because the slider stops against the boots with its boots pressing them DOWN (−182 N·s vertical on the recipient): PVP-0's statue mechanism, not a clean glance. Hash 3ed9aef6d054d007.

## 9. Rendering and review (14 Oct 02:06 → 02:50)

- `render/sp_clip.mjs`: optional INTENT ghost (choreography + knee coupling on the recorded hip, V2 FK on the recorded pelvis), obstacle boxes, Stage-3 clock origin. `render/sp_capture.cjs`: obstacle overlay (projected hull), time label per view. Composites with the reference: `/tmp`-side `compose.sh`; outputs only in `review/local_reference/` (gitignored, third-party footage).
- Watched at 1× / 0.5× (contact sheets checked for every final view; crop label bug ×2.6 → ×5 fixed and re-rendered).
- Report: `SLIDE_PHYS1_REPORT.md`. Review: `review/SLIDE_PHYS1_REVIEW.html`.

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

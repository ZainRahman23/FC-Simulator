# SLIDE-PHYS-2 working log (preserved as written; later entries never rewrite earlier ones)

Instruction: `sources/2026-10-14_user_instruction_slide_phys2_complete_slide_tackle_receiver.md` (commit `c12d879f`). Reference: a real broadcast clip (red #? slides into a blue dribbler), kept outside Git at `_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/` (sha256 `f654c2e9…aa2a8`).

## 0. Reference first (03:51 → 04:00)

- Watched the whole clip (4 fps overview), then the tackle at 30 and 60 fps on cropped, upscaled sheets.
- OBSERVED (low resolution, ≈ 70 px players, motion blur):
  - 4.55–4.65 s the slider is running and lowering;
  - ≈ 4.667 s the TRAILING leg is folded with the lower leg flat on the turf pointing backward, trunk upright, front leg bent forward — a kneeling-lunge posture;
  - 4.70–4.83 s glides low in that posture;
  - 4.85–5.13 s the front (tackling) leg extends toward the ball / the dribbler's feet and the trunk leans back onto the hip; contact with the dribbler's trailing foot ≈ 4.95–5.0 s.
- A background agent was given the frame-by-frame quantitative analysis (contact sequence, pitch-stabilised kinematics, receiver timeline): `_preserved…/slide_phys2/reference/analysis/REFERENCE2_ANALYSIS.md`.

## 1. Phase 1 — SP1's braking (scripts/sp2_ledger.mjs, sp2_cf.mjs; evidence/phase1/)

- Whole-body horizontal momentum changes only by external impulses; the ledger closes to 0.0002 N·s (SP1 5.0 m/s, 0.267 → 0.9 s, 417 N·s of braking).
- **Tackling boot: 295 N·s = 71 % of all braking** (sole 276 N·s sliding on studs at μ ≈ 1.2 after a heel-first touchdown at 0.367 s; heel 19 N·s).
- The first non-boot contact (called "thigh" in SLIDE-PHYS-1) is the **lateral side of the bent knee** (distal thigh), 0.462 s, 10.6 BW in one step but 2.3 BW over 29 ms (inside van den Eijnde's 1.0–2.3 kN).
- Counterfactuals (diagnostic only, changing nothing but the tackling boot's friction): CF0 = SP1 (hash reproduced); CF1 boot μ 0.5 → slide 0.52 → 1.38 m, entry v_h 3.67 → 4.48, ankle excess 13.5 → 7.3°; CF2 boot μ 0 → slide 1.79 m, ankle 4.7°. In both the body then falls back (head 1.46 / 1.08 s) and the bent knee's 29 ms peak rises to 3.6 / 5.4 BW: **the boot was SP1's kickstand as well as its brake.**
- Note: an apparent hash mismatch was only run length (the hash covers all steps: 420 vs 480).

## 2. Phase 2 — isolated slide fixtures (scripts/sp2_fixture.mjs, sp2_fixtures_def.mjs, sp2_posecheck.mjs)

- M1b domain limit found: ankle plantarflexion beyond ≈ −41° at entry makes the activation command leave [0, 1] (−42 fails, −40 runs).
- **F1** kneeling-lunge touchdown on the trailing shin: pitched forward onto the face (belly −0.82, head 0.56 s) — friction under the knee with the COM ≈ 0.55 m above it ≈ 200 N·m forward torque; boot touched at 0.10 s. REJECTED.
- **F2** + backward spin 3 rad/s, pelvis roll 35°: pelvis slammed first (6.3 BW / 29 ms, 23 BW step), rolled onto the side / back. REJECTED.
- **F3** SP1's own realised seated posture (t = 0.8 s) held: slides 1.77 m at 4.8 m/s² (Coulomb μg — the sliding itself is right) but rolls forward over the fold side onto the front. REJECTED as held.
- **F3 sweep** (recline × posting arm, 12 variants, evidence/phase2/F3_sweep.txt): 11 roll face-down; only **F3R** (pelvis −35°, lumbar −25°, fold arm posted) stays organised: 2.0 m at 5.0 m/s², no head contact, light boot rest (35 N·s). Lesson: a seated slide needs its centre of pressure ≈ μ·h ahead of the COM — a reclined trunk with the support under the folded thigh and the hand behind; a held posture is marginal → feedback organisation is justified (Phase 7).

## 3. SP2 hand generations (scripts/sp2_cand.mjs)

- Baseline = SP1 rebuilt from its dumped definition (hash `8f2fbbf0` reproduced).
- **H1** tackling leg held up (thigh 85°, knee 45° until after the fold landing), no press, seat objective through the fold hip, recline, earlier post: boot still first (0.363 s) — the pelvis pitches FORWARD 9–11° in the commit flight and the fold leg lags its targets by 30–40°; the hanging boot is lowest; its knee buckles to 144°; face-down. REJECTED.
- **H2** boot clear by geometry (thigh 98°, knee 25°: leg ≈ horizontal) + stronger plant sit-back + earlier fold: fold knee first (0.408 s) but 6.3 BW / 29 ms knee strike; pelvis pitches forward to 28°, boot lands. REJECTED.
- Pitch analysis (scripts/sp2_pitch.mjs): SP1 leaves the plant with BACKWARD pitch momentum (+10.5 N·m·s; the Phase-1 ledger printed it with the opposite sign convention — corrected). Swinging the 16 kg tackling leg up to horizontal is a large backward rotation of that leg, so the rest of the body pitches forward (angular momentum is conserved in flight). Physics of the glide: friction under the body always pitches forward; only normal force ahead of the COM balances it (reclined seat over the folded thigh, or a light heel skim ≈ 0.2 BW at 0.8 m lever, or SP1's stud strut — rejected).

## 4. Physics-in-the-loop search on the H structure (disclosed tool; scripts/sp2_param.mjs, sp2_search.mjs)

- 23 meaningful parameters (plant, tackling-leg hold / extension, fold timing / posture, recline, posting arm, seat objective); cost = the brief's Phase-10 items (boot not first / not load-bearing, bent-leg side first, knee ≤ 3 BW and pelvis / thigh ≤ 6.5 BW over 29 ms, no face-down / head, slide and deceleration in the evidence range, retention, constraint-space limits); robust over 4.5 / 5.0 / 5.5 m/s.
- **Search H1** (A5 controller): 24.1 → 3.07 in 30 generations; best = a kneel-glide (knee first 0.396 s at 2.1 BW / 29 ms, trunk upright, then seated on the folded leg, boot skimming 89 N·s, 1.41 m) — the reference's kneel phase. Stopped (slow); log evidence/searchH1_log.json.
- **Search H2** (A6 controller, below) from H1's best: no improvement on its start in 17 generations; stopped; log preserved.
- **Literature round 2** (research/SLIDE2_LITERATURE.md): the knee only LANDS (≈ 30 ms; 1.0–1.3 kN sliding-in); the lateral thigh / hip carries the impact (2.9–5.0 kN) and the glide; a hand-over later than ≈ 100 ms is pathological; no study measured load on the extended heel (a catching foot is an injury mechanism); kit μ ≈ 0.45 (0.35–0.55), knee / sock skin ≈ 0.55; whole slide 1.5–3 m. Applied to H1's best: **the knee carries 63 % of the glide — a knee slide, i.e. the knee strut the brief warned about.** Objective v3 adds glide-share (knee + shin ≤ 25 %, thigh + pelvis ≥ 45 %) and the knee → hip hand-over (≤ 0.15 s); whole-slide window 1.5–3.0 m.
- **Search H3** (A6, objective v3) running.

## 5. Phase 9 — regional yielding / fallback (scripts/sp2_ctrl.mjs RegionalTracker = A6)

- With its regional features disabled the RegionalTracker reproduces SlideTracker bit for bit (`8947bf43…`).
- v1 error-baseline detector: REJECTED — the explosive commit's own lag exceeds a slowly adapting baseline; every limb region "failed" by 0.2 s and the whole body went limp.
- v2 proprioceptive "pushback" (joint driven away from its target): REJECTED — whole-body inertia in the commit throws the arms / trailing leg away from their targets.
- v3 **tactile**: a region yields only while a non-ground contact (obstacle / opponent) touches it (25 ms sensory delay); it goes limp when overpowered while touched (error > 40° for 60 ms); trunk failure or ≥ 2 failed regions → whole-body fallback (authority only — no state written). Clean slide: no false triggers. H1's best costs 1.52 under A6 vs ≈ 3 under A5.

## 6. Reference analysis returned (≈ 04:40; REFERENCE2_ANALYSIS.md)

- **The clip is ≈ 0.4× slow motion** (12 unique images / video-second, 2-2-1 cadence = 50 fps broadcast at 0.4×; the slider's stride 2.1 m at 4.3 Hz → ≈ 9 m/s). All earlier "real time" readings of it were 2.5× too slow.
- Players ≈ 105–122 px (not 70); camera ≈ 16° down; pitch homography from the centre circle (rms 0.044 m).
- Contact order (manual): trailing R instep + lower shin (0) → knee (+0.04) → lateral knee / thigh (+0.10–0.16) → hip / buttock (+0.20–0.24) → hand (+0.25) → on the side (+0.30). Tackling boot in swing, skimming within ≈ 0.1 m; never planted; knee 95° → straight in 0.2 s.
- Knee-glide at 9.0–9.8 m/s (no measurable slowing), then side-lying at 2.5–3.3 m/s² (μ ≈ 0.3); 7.5 m in 1.14 s; gets up while moving.
- Dribbler: steps onto the slider's shin 40 ms after the ball contact (his other foot airborne), swept foot thrown forward / up, seated 0.16–0.22 s, on his back 0.30–0.36 s.

## 7. Searches H4–H6 and the choice of SP2

- H3's best rendered as a kneel-glide hunched over the knee (knee 55 % of the glide). Probes: a trailing-leg "sit-down yield" made the knee carry MORE (73 %) — the pelvis sinks toward the heel (kneel-sit), not sideways; trunk recline + seat objective → face-down. **A seat objective with real gain (500, pitch −25°, roll 45° to the fold side) moved the glide onto the hip** (pelvis 28 %, knee 14 %) but the body tipped forward late → objective v5 adds a "lying" term (arm + torso + head glide share).
- **H4** (fold ranges widened: knee to 145°, abduction to 45°): stopped early. **H5** (seeded from the seat probe, v5): 10.8 → 5.07; best g28_5 = **SP2** (`evidence/sp2/SP2_params.json`).
- **H6** (limit weight 0.3 with duration, speeds 4.5–6.0): no improvement in 10 generations; stopped; log kept. SP2 fails ≥ 5.75 m/s (boot first, face-down) — the commit timings are absolute and the entry is a 5 m/s running state.
- Fold-hip adduction excess (4.4–8.0° beyond the 35° stop for 0.85–1.3 s while seated on that thigh): foldRot −30 / −22 or foldAbd 40 / 45 remove it but lose the hip-sit or the robustness — kept as a known defect (unsupported further tuning).

## 8. SP2 qualification (scripts/sp2_eval.mjs; evidence/sp2/SP2_eval.json)

- 4.25–5.5 m/s: no head, no face-down; knee first (lateral / posterior side, 1.3–2.6 kN / 29 ms), hip and lateral thigh within ≈ 0.1 s (thigh 3.2–4.4 kN); tackling boot 4–6 % of support, heel / upper only (sole-down cos ≤ 0.48); slide 0.98–1.77 m from contact (2.8–3.9 m from the commit); glide 4.8–5.1 m/s²; retention 53 % at +0.2 s (SP1 27 %). 5.75 m/s fails.
- Determinism `792ce24ee2a3c678` ×2. CPU 0.81–0.87 ms / step.
- Counterfactuals at 5.0: M1b → fails (boot first, face-down) — **M1c required**; no TCF-1 → heel grips (199 N·s), 0.9 m, face-down — **TCF-1 required**; body μ 0.45 / 0.55 fine (1.54 / 1.18 m), 0.35 face-down (2.35 m); A5 ≈ A6.

## 9. Stage 2 and Stage 3 (SP2)

- Stage 2 (obstacles in the extended leg's sweep path; O5 fixed bar re-placed twice to meet the trunk): local yielding only, contacts win (≤ 0.3 mm; 6.8 mm into the 5 kg box); no fallback at design thresholds. Diagnostic thresholds: Dfail 20 → only the tackling leg goes limp on the post / wall; Dfail 25 on the pelvis-height bar → leg + arm fail → whole-body fallback.
- Stage 3 (unchanged C3; first defined by the tackling-boot line): GRAZE / LIGHT / MODERATE / STRONG all FALL slowly (1.0–2.1 s), against the sweep, the recipient ending on the slider — the slider's body beside its leg swept the planted feet even at GRAZE.
- **Lateral sweep (whole-slider placement) at 5.0 m/s**: −0.10 displaced-recovered (slider passes, 0.86 / 0.98 m); +0.05 / +0.20 feet swept 0.5–1.0 m, slow fall; +0.35 / +0.50 absorbed (only the folded boot reaches the near foot, late); +0.65 / +0.80 no contact. No sliced-out signature anywhere; the standing double-support C3 holds on its other foot 1–2 s then topples (mannequin-like). The reference dribbler was running in single support — a recipient-architecture item (decision B); C3 not modified.

## 10. Renders, review, report (≈ 04:20 → 05:10)

- Renderer additions (slide_phys1/render, backward compatible): diagnostic HUD (v_h, v_y, turf regions with BW) and crop close-ups; Stage-3 analysis `--cases` / `--twin`.
- 30 own views + 6 aligned comparison sources; reference composites (REFERENCE · SP1 · SP2, REFERENCE RECEIVER · SP2 + C3, the reference itself at real-time rates) in the gitignored `review/local_reference/`.
- Watched (contact sheets at 1× / 0.5×): SP2 clean / entry close-up / Stage 3 MODERATE / sweep / composites.
- Report `SLIDE_PHYS2_REPORT.md` (48 answers + verdict). Review `review/SLIDE_PHYS2_REVIEW.html`.

## 11. Phase 19 variations and the receiver preregistration (≈ 05:15 → 05:45)

- **Mirrored tackle** (scripts/sp2_mirror.mjs: fold = right, tackling = left; L ↔ R tracks, trunk lateral / axial angles, pelvis roll / yaw, lateral push and every side flag reflected): COM deviates ≤ 2.3 mm from the reflected original over 2 s, identical contact timings (`ca94f593…` vs `792ce24e…`). The architecture is side-neutral; the residual is solver ordering.
- **Entry speed**: SP2 qualified 4.25–5.5; ≥ 5.75 fails (boot first, face-down). Scaling the commit's times by (5/v)^a (a = 0.5, 1) does not help (scripts: scratch tscale). A separate seeded search at 6.0 / 6.5 / 7.0 m/s (**search F1**, evidence/searchF1_fast_log.json) reaches 34 → ≈ 14.6: no face-down / head, pelvis carries 33–61 % of the glide, slide 2.2–3.2 m — but the tackling boot touches 15–20 ms before the knee and its heel carries 26–31 % of the glide (a sliding heel support, not a stud strut). NOT qualified; preserved as the evidence that a sprint tackle needs its own commit (and a sprint plant state from RUN).
- **Recipient alignment**: the lateral sweep (§9). **Obstruction**: Stage 2 (§9).
- **Receiver preregistration** `RECEIVER_PREREG.md` (not developed): H-R1 running single-support recipient (state, not law), H-R2 protective arms, H-R3 stepping; acceptance criteria fixed.

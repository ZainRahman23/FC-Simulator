# SLIDE-PHYS-2 — final report (14 Oct 2026, overnight)

**Review page:** `http://localhost:8350/slide_phys2/review/SLIDE_PHYS2_REVIEW.html` (server root `review_artifacts/physical_character_v2/`).
**Working log:** `SLIDE_PHYS2_LOG.md`.
**Reference analysis:** `REFERENCE2_ANALYSIS.md` (text only; the footage stays outside Git).
**Literature:** `research/SLIDE2_LITERATURE.md`.

## In one paragraph

Your hypothesis is right, and it was the key to the night.

**SP1.** 71 % of SP1's braking came from the tackling boot: a heel strike, then studs dragging at μ ≈ 1.2. That boot was also SP1's kickstand.

**What the reference and literature show.** In the reference, a real broadcast clip that turns out to be ≈ 0.4× slow motion (a 9 m/s sprint):
- the trailing leg lands first, instep and shin, then the knee;
- the outer thigh and the hip take over within 0.1–0.24 s;
- the tackling boot never plants; it skims.

The force-plate literature says the same: the knee only lands, the hip carries the impact and the glide, and nobody has measured load on the extended heel.

**What SP2 does.** It rebuilds the ground entry on that mechanism:
- **Landing:** the lateral side of the folded knee lands first, at 1.3–2.6 kN over 29 ms. The lateral shin, thigh (3.2–4.4 kN) and hip follow within ≈ 0.1 s.
- **Tackling leg:** stays extended low. It only skims on its heel or upper (≈ 0.1 BW, 4–6 % of the support), and its studs never engage.
- **Organisation:** the body stays organised without a kickstand, via a pelvis-orientation objective realised through the folded hip while that leg is on the turf.
- **Slide:** 1.0–1.8 m from first contact (SP1: 0.45 m). The deceleration is progressive: ≈ 5 m/s² in the glide.
- **Robustness:** deterministic, and robust from 4.25 to 5.5 m/s.
- **Obstruction:** handled by tactile regional yielding, which escalates to a whole-body fallback only when regions are overpowered.

**What is not solved:**
- The folded hip is pressed 4–8° past its adduction stop for about 1 s.
- The lateral knee still carries about half of the glide at 5 m/s.
- SP2 fails at 5.75 m/s and above.
- Against the unchanged, standing C3, the response is graded by geometry (passes, absorbed, displaced and recovered, falls), but there is no fast sliced-out fall and the recipient looks rigid.

The reference's dribbler was running on one foot when he was swept, which a standing controller cannot be. That is the next architectural decision (B).

---

## Answers

### 1. Was my bent-leg/thigh-slide hypothesis correct?

**Yes.** Three independent sources agree:
- **The reference:** trailing instep and shin (0 s) → knee (+0.04 s) → outer thigh (+0.10–0.16 s) → hip and buttock (+0.20–0.24 s) → hand (+0.25 s). The tackling boot never plants.
- **The literature** (van den Eijnde 2017, force plates, n = 3 on 3G turf): a lateral knee or shank impact of about 30 ms at 1.0–2.3 kN, then hip and thigh at 2.9–5.0 kN, then a glide at ≤ 1 BW. No study measured any load on the extended heel, and video studies show a foot catching the turf is an injury mechanism.
- **Our physics:** removing only the boot strut lengthens SP1's slide 3.4× (Q5).

**One nuance:** the tackling leg is not fully airborne. In the reference it skims within ≈ 0.1 m of the turf. In SP2, a light heel or upper skim (≈ 0.1 BW) remains. Physically it is the one support ahead of the centre of mass that helps balance the forward pitch that friction produces. It is not a strut.

### 2. What actually contacts first in the reference?

The trailing (right) leg's **instep/dorsum and lower shin**, with the foot still on its plant spot (t = 0). The knee follows 0.04 s later.

The leg identification has medium confidence: if the shirt-logo reading is wrong, left and right swap, but the order does not change.

### 3. What actually contacted first in SP1?

After the plant boot: the **tackling heel** at 0.367 s, with 9.6 BW in a single step. Its sole and studs followed at 0.379 s. The first body contact was the lateral side of the bent knee, at 0.462 s.

### 4. Where did SP1's horizontal momentum go?

Ledger at 5 m/s, 0.27–0.9 s. The total is 417 N·s and it closes to 0.0002 N·s.

| contact | braking (N·s) | share |
|---|---|---|
| Tackling boot sole (studs) | 276 | 66 % |
| Tackling heel | 19 | 4.5 % |
| Lateral bent knee | 69 | 16.5 % |
| Hip / buttock | 18 | 4 % |
| Lateral shin | 16 | 4 % |
| Bent-leg boot | 16 | 4 % |
| Hand | 4 | 1 % |

**Internal channels:** joint limits, muscles and rotation cannot change total momentum. They act through the energy ledger: −1243 J of turf work, −206 J of actuator work and 57 J of passive dissipation over the window.

### 5. How much braking came from the boot / heel?

**295 N·s, 71 %.** The counterfactuals change only the tackling boot's friction:

| tackling boot | slide | entry speed |
|---|---|---|
| studs (SP1) | 0.52 m | 3.67 m/s |
| μ 0.5 (no stud grip) | 1.38 m | 4.48 m/s |
| frictionless | 1.79 m | 4.70 m/s |

In both counterfactuals the body then fell back until the head touched: the boot had also been the kickstand.

### 6. What contact sequence does SP2 use?

At 5.0 m/s, after the plant boot:

| time | contact |
|---|---|
| 0.413 s | lateral / posterior side of the folded knee |
| 0.433 s | tackling heel skims |
| 0.492 s | lateral shin |
| 0.504 s | hip / buttock |
| 0.508 s | lateral thigh |
| 0.98 s | hand |

The same order holds at every speed from 4.25 to 5.5 m/s.

### 7. Does the tackling boot remain clear?

**Its studs stay clear; its heel and upper skim.**
- **Contact:** ≈ 95 % of the glide, but only 87 N·s at 5.0 m/s: heel 28, upper 49, sole 10 N·s.
- **Load:** a 0.36 kN peak over 29 ms, and 4–6 % of the total support.
- **Sole orientation:** its downward cosine stays ≤ 0.48 during the glide, so the TCF-1 rule keeps it at the upper's μ 0.5.
- **Order:** it never lands first; the folded knee is first at every qualified speed.

### 8. Any ankle hard-limit violation?

**No meaningful one.** The tackling ankle goes 2.1–2.8° past its stop for 25–83 ms at 5.0–5.5 m/s, and not at all at 4.5 m/s. SP1 went 13.5° past for 0.38 s.

### 9. Any excessive knee loading?

**The impact is within the measured range; the glide load is the remaining weakness.**
- **Impact peaks** (29 ms window): 1.33 kN at 4.5, 1.84 kN at 5.0 and 2.55 kN at 5.5 m/s. The literature gives 1.0–2.3 kN, and ≥ 3.5 kN would be a flag. The contact is on the lateral and posterior side of the knee, never the patella.
- **Glide:** the lateral knee then carries 30–52 % of the glide. The literature says the knee is only an impact contact, so this is the weakness.

### 10. How is load distributed across knee, thigh and hip?

Normal impulse over the whole run at 5.0 m/s:

| region | impulse (N·s) | peak over 29 ms |
|---|---|---|
| Knee | 480 | 1.8 kN |
| Lateral thigh | 209 | 4.4 kN |
| Hip / buttock | 419 | — |
| Lateral shin | 130 | — |

Glide shares (from 0.15 s after first contact to the stop):

| speed | knee | thigh + pelvis |
|---|---|---|
| 4.5 m/s | 39 % | 47 % |
| 5.0 m/s | 51 % | 32 % |
| 5.5 m/s | 46 % | 30 % |

### 11. What body/turf friction model is used?

The V2 table, unchanged:

| contact pair | μ |
|---|---|
| boot / turf | 1.2 |
| hand / turf | 0.7 |
| body / turf | 0.5 (all kit, skin and sock sub-shapes) |

TCF-1 runs on the tackler's boots: studs apply within 35° of sole-down and blend to 0.5 by 55°.

**Phase 3 finding:** the turf model did *not* treat sliding body regions like boots. Only the boot itself was the problem, and TCF-1 handles it.

The literature brackets kit on 3G turf at 0.35–0.55 (recommended 0.45 for kit, 0.55 for knee or sock skin), with no natural-grass data. The reference slows at ≈ 0.3 on its side. I added a sensitivity tool and changed nothing:
- body μ 0.45: 1.54 m;
- body μ 0.55: 1.18 m;
- body μ 0.35: 2.35 m, but the body tips face-down.

### 12. Is boot traction unchanged?

**Yes.** Boot/turf is still 1.2 for a sole facing the turf: standing, running, planting and kicking are untouched. TCF-1 changes only a boot's non-sole surfaces, on the tackler.

### 13. SP2 entry horizontal velocity?

At first body contact (the folded knee), the horizontal speed is **4.83 m/s at 5.0** (4.25 at 4.5; 5.37 at 5.5). That is 97 % of the run speed.

### 14. SP2 entry vertical velocity?

**−2.77 m/s at 5.0** (−2.76 at 4.5; −2.79 at 5.5). This is a sideways-fall descent; literature hip-impact speeds are 2.5–3 m/s.

### 15. Slide deceleration?

Over the first 0.15 s after first contact, the impact costs 1.9–2.3 m/s, of which ≈ μ·|v_y| = 1.4 m/s is friction on the landing impulse. The literature estimate for that loss is 0.8–1.5 m/s.

The glide then decelerates progressively at **4.8–5.1 m/s²** (μ_eff ≈ 0.5). The mean from first contact to the stop is 6.5–7.3 m/s².

### 16. Slide distance?

| entry speed | from first contact | from the commit |
|---|---|---|
| 4.5 m/s | 1.11 m | 3.05 m |
| 5.0 m/s | 1.33 m | 3.36 m |
| 5.5 m/s | 1.77 m | 3.90 m |

Expected from the evidence: whole slide 1.5–3 m at 4.5–5.5 m/s with μ 0.45. SP2 is at the low end, because its effective μ is 0.5 and the landing loss is high.

**Against the sim's ≈ 2.3 m:** the sim launches at its own speed + 1 m/s and decelerates uniformly at 5.5 m/s² from the launch, so its distance is a commit-to-stop figure with no landing loss. The comparable physical figure is 3.0–3.9 m from the commit. A physical body cannot gain the +1 m/s during the commit, but it does cover distance in the drop. The sim's distance agrees in order of magnitude; the sim is optimistic about speed at contact.

**The reference's 7.5 m** is a 9 m/s sprint on grass at μ ≈ 0.3, so it is not comparable.

### 17. How much horizontal momentum survives touchdown?

Share of the first-contact speed retained at 5.0 m/s:

| time after first contact | retained |
|---|---|
| +0.1 s | 70 % |
| +0.2 s | 53 % |
| +0.3 s | 40 % |
| +0.5 s | 22 % |

SP1's equivalent was 26 % at +0.2 s. In both cases the impact phase takes the biggest share.

### 18. Does the body remain organised without a tackling-leg kickstand?

**Yes.** There is no tackling-leg press, and the boot carries ≤ 6 % of the support. There is no face-down and no head contact from 4.25 to 5.5 m/s.

**How it is organised:** first I tested the mechanics alone:
- 11 of 12 held seated postures roll over;
- only a strongly reclined one with a posted hand stays organised.

So a generic feedback was added: the pelvis's world orientation (pitch / roll) is regulated through the folded hip while that leg is on the turf. That is the seated person's own strategy: no support force, only the stance-hip torque.

### 19. Does it visually resemble the reference action?

**Partly.**
- **Like the reference:** the commit, the kneeling touchdown on the folded leg, the tackling leg extended low with the knee extending, and the sit-down onto the hip with the hand posted.
- **Unlike it:** the reference is a sprint that ends lying on the side with a 7.5 m slide; SP2 slides seated upright for 1.3 m.

### 20. Does it look athletic rather than robotic?

**Mostly.**
- **Athletic:** overlapping phases come from the physics: the knee lands, the hip lands, then the trunk and arm settle.
- **Robotic:** the post-slide sitting posture is held rather stiffly, and the arms are less expressive than the reference's.

### 21. Does local obstruction produce local yielding?

**Yes.** With A6 tactile regions, at 5 m/s:

| obstacle | impulse | what yields | effect on the slide |
|---|---|---|---|
| Glancing 5 kg box | 19 N·s | ≤ 6° deflections | unchanged |
| Moderate 20 kg box | 53 N·s | tackling ankle 19° | 1.07 m |
| Fixed post | 227 N·s | tackling hip / knee / ankle 20 / 17 / 27° | body stops organised at 0.8 m |
| Fixed bar at pelvis height | 814 N·s | arm and leg yield | — |

Obstacle penetration is ≤ 0.3 mm, or 6.8 mm into the light box.

### 22. Does severe obstruction produce appropriate fallback?

**At the design thresholds, no tested obstacle overpowered a region:** the touched leg or arm yielded (≤ 40°) and the body stopped organised, which I consider appropriate.

The escalation chain is shown at lower thresholds (diagnostic):
- **Fixed post or wall, threshold 20°:** only the tackling leg goes limp (regional).
- **Pelvis-height bar, threshold 25°:** the leg and arm fail, so the whole-body fallback engages (authority → 0.12; no state written).

**Rejected predecessors:** an error-baseline detector and a pure proprioceptive "pushback" detector both flagged the explosive commit itself.

### 23. Any phasing?

**No.** Turf penetration ≤ 2.5 mm, obstacle depth ≤ 0.3 mm (6.8 mm into the 5 kg box), and cross-character contacts exactly equal and opposite.

### 24. Any joint-limit problems?

**Yes, one.** The **folded hip goes 4.4–8.0° past its adduction stop (35°) for 0.85–1.3 s** while the body sits on that thigh.
- Trying 10–20° less fold external rotation, or 40–45° of fold abduction, removed the excess but lost the hip-sit or the robustness (log §8).
- So it remains: either the posture changes, or the V2 hip end-range for this loading is re-examined (decision for you).

Otherwise: the tackling ankle is 2–3° past for ≤ 83 ms; small elbow, lumbar and ankle excursions are ≤ 1.5°.

### 25. What happens in GRAZE?

The geometrically defined GRAZE (4.5 m/s, tackling-boot line +0.24 m toward the toes) still swept the slider's *folded* leg and boot through the planted feet, because the slider's body sits beside the tackling leg. The recipient fell after 2.1 s.

The lateral sweep, which places the whole slider, maps the graze end:
- **+0.35 / +0.50 m:** only the folded boot reaches the near foot, late. The recipient is unaffected (absorbed, ≤ 1 cm).
- **+0.65 / +0.80 m:** no contact.

### 26. LIGHT?

**As defined** (4.5 m/s, +0.15 m): 261 N·s horizontal. The recipient topples onto the slider after 1.1 s, and the slider is nearly stopped (0.22 m against 0.94 m alone).

**In the sweep at −0.10 m** (the tackling boot clips behind the heel): displaced 9 cm and recovered. The slider continues 0.86 m against 0.98 m alone.

### 27. MODERATE?

At 5.0 m/s, +0.05 m:
- **Contact:** 317 N·s horizontal.
- **Recipient:** feet displaced 0.5 / 1.0 m; he stands over the slider for about 1 s, then falls onto it 1.09 s after contact.
- **Slider:** travels 0.66 m against 0.98 m alone.

At the sweep line +0.20 m: feet swept 0.5–0.6 m along the sweep, then a slow fall after 1.85 s.

### 28. STRONG?

At 5.5 m/s, −0.06 m:
- **Contact:** 168 N·s horizontal.
- **Recipient:** near foot displaced 1.03 m, falls 1.02 s after contact, against the sweep.
- **Slider:** continues 0.93 m against 1.03 m alone.

### 29. Does STRONG still produce an unscripted sliced-out recipient?

**No, not with SP2.** No condition shows the sliced-out signature (foot off the turf before the pelvis drops, fall along the sweep). SP1's STRONG did, through its heavier, stud-driven contact.

Every SP2 fall is slow (1.0–2.1 s) and is a topple over the slider.

### 30. Can lighter contacts now avoid inevitable falls?

**Yes.** Graze lines are absorbed or miss, and the heel-clip line is displaced and recovers. SLIDE-PHYS-1 had no non-fall outcome except a pinned "statue".

### 31. Does the tackler continue through instead of pinning the feet?

**Mostly yes.**
- **Continues through:** at −0.10, +0.20 and STRONG the slider travels 85–100 % of its alone distance.
- **Stopped:** at LIGHT (as defined) it is largely stopped.
- **Pressing down:** the vertical impulse on the recipient is upward (+335 to +759 N·s) — the recipient ends up on the slider — except GRAZE (−41) and the sweep's absorbed lines (−86 / −135 N·s). Those are smaller than SLIDE-PHYS-1's GRAZE (−182 N·s, the "statue").

### 32. Does the recipient still look mannequin-like?

**Yes.** He stays rigidly upright on his remaining foot for 1–2 s, then topples, with no step, no protective arm and no trunk response.

### 33. If so, why?

Two reasons:
- **The recipient's controller.** C3 is a standing-balance controller with a stiff trunk, no stepping and no protective reactions. SUPPORT-1 and BALANCE-3 documented this.
- **The geometry is the hardest case.** A static double-support stance with both feet loaded. The reference dribbler was running and the swept foot was the one landing: an unloaded or loading foot in single support, so he was seated in ≈ 0.2 s.

The slower SP2 contact (≈ 3–4 m/s at the feet) also delivers less of a sweep than SP1's stud-driven strut.

### 34. Did you modify the recipient?

**No.** C3, the recipient's M1b, its friction, geometry and standing entry are all unchanged.

### 35. If yes, what evidence justified it?

Not applicable. The evidence for a successor is Q32–33: a running, single-support recipient, protective stepping and arms. The brief requires research and preregistration first, so it is a decision for you.

### 36. Is stepping necessary now or can it wait?

**It is necessary for a credible moderate response,** but it is not the first blocker. The first is a running recipient: a dynamic single-support state from RUN. A standing C3 with stepping would still not reproduce the reference.

### 37. Are protective arm / fall responses necessary now?

**For visual credibility, yes,** once falls happen. Literature: muscle onset at 100–126 ms, hands on the ground 370–680 ms after the perturbation, ≤ ~1 BW per hand. **Not for the mechanics of support loss.**

### 38. Is M1c required?

**Yes.** With M1b the commit cannot drive the legs (M1b's shortening torque ≈ 0 above 4–5 rad/s): the boot lands first, the body goes face-down and the head touches.

M1c stays the tackler's experimental actuator. It is not regression-tested on other domains and not recommended for canonical adoption yet.

### 39. Is TCF-1 required?

**Yes.** Without it the skimming heel grips on its studs (199 N·s), the slide stops at 0.9 m, and the body pitches face-down. It is experimental and not adopted.

### 40. Determinism?

**Yes.**
- SP2 at 5.0 m/s gives `792ce24ee2a3c678` on rerun.
- Stage 2 cases reproduce, and SP1 rebuilt from its dump reproduces `8f2fbbf0bed38c95`.
- With its regional features disabled, the RegionalTracker reproduces SlideTracker bit for bit.

### 41. CPU?

**One character:** 0.81–0.87 ms per 240 Hz step, of which ≈ 0.2 ms is research ledgers. The A6 controller and the tactile read cost nothing measurable.

**Two characters:** 4.0 s wall time per 1300 steps.

**At scale:** the same conclusion as SLIDE-PHYS-1 — articulated physics only for the players in contact.

### 42. What failed?

**Fixtures** (Phase 2):
- **F1** kneel-glide: face-down.
- **F2** with backward spin: pelvis slam.
- **F3** SP1's seated posture held: rolls over; 11 of 12 held variants.

**Hand-built SP2 candidates:**
- **H1** knee held up: boot first; the pelvis pitched forward.
- **H2** horizontal tackling leg: knee strut at 6.3 BW, then face-down.

**Searches:**
- **H1 (A5 controller):** found a kneel-glide.
- **H2:** no gain.
- **H3:** a knee slide, with the knee carrying 55–63 % of the glide.
- **H4:** stopped, bounds widened.
- **H5 → SP2.**
- **H6 (stronger limit weighting, up to 6 m/s):** no gain.

**Controller detectors:** an error baseline and a proprioceptive "pushback" detector, both rejected.

**Probes:**
- Trailing-leg yield made the knee carry more.
- Trunk recline with the seat objective: face-down.
- Less fold rotation or more abduction: lost the hip-sit.

### 43. What did those failures teach us?

- **Friction under a body pitches it forward,** so a glide needs support ahead of its centre of mass (≈ μ·h): a reclined seat, a light heel skim, or a stud strut (rejected).
- **The swing–body coupling:** swinging the tackling leg up pitches the rest of the body forward. The fold leg must therefore be lower than the tackling boot by geometry, not by a "hold" command.
- **The hip only reaches the turf by moving sideways.** Yielding the knee makes a kneel-sit; the pelvis has to roll onto the folded side. A seat objective with real gain does that.
- **Disturbance must be sensed by touch,** not inferred from tracking error. An athlete's own explosive motion looks like a disturbance to proprioception.
- **Real slides are not 5 m/s:** the reference is a 9 m/s sprint seen in slow motion.

### 44. What remains before RUN → SLIDE integration?

- **Hand-over:** a module that takes RUN-1's actual fold-side plant touchdown and starts SP2 from it with muscle-state continuity.
- **Sprint entry:** a speed-indexed commit and a sprint plant state for ≥ 6 m/s.
- **Mirroring:** the mirrored side.
- **The fold-hip limit.**
- **Get-up:** the reference gets up while still moving.

### 45. What remains before production PVP?

- **A running, single-support recipient** with stepping and protective arms (preregistered).
- **Interface:** a sim → physics placement and timing layer, so the slider meets the feet where and when the sim says.
- **Reconciliation:** physical outcome against the sim's outcome.
- **Cost at scale.**
- **Adoption:** decisions on M1c and TCF-1 after regression tests.
- **Calibration:** natural-grass friction (no data exists).

### 46. What surprised you?

- **The reference is slow motion.** It is a 9 m/s sprint, not a 3 m/s jog.
- **Where the braking came from.** 71 % of SP1's braking was one boot, and the same boot was holding the body up.
- **A small sensing choice fixed the controller.** Touch, not tracking error, separated an athlete's own explosive motion from an obstruction.
- **Folding the knee further made things worse.** It produced a kneel-sit; the hip only came down when the pelvis was rolled sideways.
- **Lighter contacts do not have to topple the recipient now** (absorbed, or displaced and recovered). But the strong response got slower, because SP2 sweeps more gently than SP1's strut.

### 47. Exact commits / files

**Branch:** `prototype/physical-character-v2`. All commits are local: they are 13 Oct day work and get pushed at the next daily rule after 06:00.

**Commits:**
- `c12d879f` — the instruction, verbatim.
- The final SLIDE-PHYS-2 commit, recorded in `SLIDE_PHYS2_LOG.md` §10 and in memory.

**Files** (all under `review_artifacts/physical_character_v2/slide_phys2/`):
- `SLIDE_PHYS2_REPORT.md`, `SLIDE_PHYS2_LOG.md`, `REFERENCE2_ANALYSIS.md`, `research/SLIDE2_LITERATURE.md`.
- **Scripts:**
  - `scripts/` — `sp2_ledger`, `sp2_cf`, `sp2_regions`, `sp2_measures`, `sp2_fixture(s_def)`, `sp2_posecheck`, `sp2_posture`, `sp2_pitch`, `sp2_track`, `sp2_cand`, `sp2_param`, `sp2_search`, `sp2_run`, `sp2_ctrl` (A6 RegionalTracker), `sp2_contact`, `sp2_eval`, `sp2_stage2`, `sp2_stage3`.
  - **SP2** = `sp2_param.makeCand(evidence/sp2/SP2_params.json)` + `finalize(…, "A6")`.
- **Evidence:** `evidence/` — `phase1`, `phase2`, `sp2/SP2_eval.json`, `stage2`, `stage3` (including `sweep_summary.json`), `searchH1–H6_log.json`, `SP1_cand_dump.json`, reference tracks and annotations.
- **Review:** `review/SLIDE_PHYS2_REVIEW.html`, `review/video/` (own renders), `render/sp2_review_build.mjs`, `render/sp2_compose_reference.sh`.
- **Shared tools changed** (backward compatible):
  - `slide_phys1/render/sp_clip.mjs` — diagnostic HUD;
  - `slide_phys1/render/sp_capture.cjs` — HUD and crop close-ups;
  - `slide_phys1/scripts/sp_stage3_analyze.mjs` — `--cases` / `--twin`.

**Outside Git:**
- `_preserved_2026-10-14_evidence_outside_git/slide_phys2/` — reference video, analysis sheets, records.
- `review/local_reference/` — gitignored reference composites.

### 48. Exact localhost review URL

`http://localhost:8350/slide_phys2/review/SLIDE_PHYS2_REVIEW.html`

---

```
BENT-LEG/THIGH SLIDE HYPOTHESIS: CONFIRMED
SP2 SINGLE-PLAYER PHYSICAL TACKLE: PARTIAL
GROUND ENTRY: PASS
SLIDE MECHANICS: PARTIAL
LOCAL YIELDING: PASS
GRADED TWO-PLAYER RESPONSE: PARTIAL
STRONG SLICED-OUT RESPONSE UNSCRIPTED: NO
LIGHT/MODERATE RESPONSES PLAUSIBLE: PARTIAL
VISUAL MATCH TO REFERENCE CHARACTER: PARTIAL
RECOMMEND SP2 AS PHYSICAL SLIDE BASELINE: YES   (as the development baseline replacing SP1 — not canonical V2)
READY FOR NEXT INTEGRATION MILESTONE: NO
```

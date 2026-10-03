# G1 — the 1.0 m feet-first drop: heel-rise investigation

- **Instruction:** `sources/2026-10-03_user_instruction_g1_heel_rise_investigation.md`
- **Run:** the exact G1 validated baseline: drop1m, V2-REF, 240 Hz, 150 velocity iterations, 10-piece boot, hash `958b785c`.
- **Status:** measurement only. Nothing in the specification, the gate or the validated configuration was changed. No counterfactual was adopted. G2 has not been started.
- **ACCEPTED by the user, 2026-10-03.** Source: `../../sources/2026-10-03_user_decision_g1_heel_rise_accepted_g1_passed.md`.
  - This report is supporting evidence for the G1 passive-physics validation.
  - It and its instrumentation are preserved permanently (see `../../DECISIONS.md`).
  - No simulation change. Do not tune the body to make this passive fall look more human.
  - The 1 m passive drop is a mechanical stress test, not a target model of a controlled human landing.

## 1. Verdict

**The heel rise is mechanically correct for the specified passive body. I found no implementation defect, so the behaviour is unchanged.**

**Cause: category F, a combination of A and E.**
- **A (impact momentum):** the two-tick rigid impact turns most of the vertical fall into segment rotation.
- **E (leg linkage):** after the impact the feet carry less than about 10 % of body weight. The passive legs (no muscles) fold freely. The folding leg tows the unloaded foot's ankle up and forward around the planted toe.

**Energy:** all of the foot's energy gain during the rise arrives through the ankle *joint force* from the shank. The ankle torques are purely dissipative (elastic law exactly 0, stored energy exactly 0, end-stop 0, emergency stop 0). The turf does slightly negative work.

**What stops the rise:** it ends when the foot becomes a loaded two-force strut, with the turf force passing within 6.8 mm of the ankle. A torque-free ankle has no other loaded equilibrium.

**The other categories act only after the free rise:**
- **C (end-stop):** limits the last few millimetres and the plantarflexion overshoot.
- **B (elastic tissue):** drives the heel's return.
- **D (compound-foot contact):** changes the size of the rise by about 15 %. It does not cause it.

**Your two hypotheses: neither holds.**
- *"The GRF migrates toward the forefoot as the body rotates over the foot":* the GRF does not migrate under load. The feet are almost unloaded, the centre of pressure reaches the toe within two ticks of impact, and the body's centre of mass never passes over the forefoot. It stays 13–21 cm behind the toe and the body ends supine.
- *"The implementation launches the heel":* nothing launches it. The impact's moment about the ankle is small and heel-*down*. The ankle leaves the impact tick with +0.04 m/s vertical velocity. The heel then accelerates over about 30 ms under forces of 5–50 N.

## 2. Instrumentation

### The probe

`gates/v2_g1_ankle.js` (AnkleProbe) is called before and after every physics tick. It only reads the simulation.

**Ground reaction, exact.** The foot is a leaf body, so its only external effects are gravity, the ankle constraint (whose impulses Jolt exposes) and contact:
- J_contact = mΔv − mg·dt − λ_point
- M_contact about the COM = ΔL − (ankle rotation-row impulses) − (A − C)×λ_point
- The centre of pressure follows from this wrench.

**Per-piece split.** Jolt does not expose per-contact impulses in this binding. The split across the boot's pieces is a non-negative least-squares estimate: the totals are exact, the split is estimated.

**Ankle torque decomposition**, in the DF degree of freedom:
- drive actually applied (the Jolt motor impulse);
- elastic law at the end state, and the end-stop part of it;
- damping (−c·ω);
- emergency stop (the Jolt swing–twist limit impulse);
- explicit remainder.

The point constraint acts *at* the ankle, so it has no moment about it.

**Work on the foot per tick,** using mid-step velocities. These are exact for an impulse under Jolt's symplectic-Euler step: ½m(v1² − v0²) = J·(v0 + v1)/2.
- W_point: the shank's force at the ankle.
- W_rows: the ankle rotation rows.
- W_ext: Δ(KE + PE) − W_point − W_rows, the exact residual. It is the turf plus any self-contact.

I verified the closure in free flight: the rotational and linear kinetic-energy changes match Σ M·ω_mid and Σ J·v_mid to better than 1e-4 J per tick. A first version of my residual counted gravity twice. I found and fixed this before drawing any conclusion. It was a tooling error, not a simulation one.

### Whole body

`tools/g1_heel.mjs` also records, per tick:
- the total turf force, from the momentum change of all bodies (exact; self-contacts cancel);
- the COM and its position along the foot;
- kinetic energy, total and internal;
- knee and pelvis heights;
- which bodies touch the turf;
- the passive layer's drive work, measured against ΔU.

### Counterfactual switches (diagnosis only)

`sim/v2_passive.js` gained `opts.diagJoint = { ankle_L: { elastic, stop, damping } }`. It defaults to none.

I verified that the validated layer is untouched: the 10 curated V2-REF hashes are identical to the committed G1 results (10/10), drop1m is `958b785c`, and the browser = Node recheck passes 10/10. The recheck ran with the overlay in place; its output went to scratch, so the committed `g1_browser.json` is untouched.

### Outputs

All in `review_artifacts/physical_character_v2/g1/heel/`:

| file | contents |
|---|---|
| `heel_summary.json` | every number in this report |
| `heel_V0.json` | the full baseline time series, per tick, both feet, per piece |
| `heel_V1…V12.json` | compact counterfactual series |
| `heel_V0_foot_R_zoom.svg` | the most useful figure (0.44–0.76 s) |
| `heel_V*_foot_{L,R}.svg` | 11 panels each: heights, angles, angular velocity and acceleration, turf force, CoP, CoP–ankle offset, piece-contact raster, torques, cumulative work, ankle U and drive work |
| `heel_V*_body.svg` | whole-body figures |
| `heel_compare_{contact,ankle_tissue,coupling_selfcontact,numerics}.svg` | variant comparisons |
| `shots/heel_01…10_*.png` | viewer stills |

To reproduce: `node sandbox/visual/physchar2/tools/g1_heel.mjs` takes about 15 s.

### Viewer overlay

Add `?probe=L` or `?probe=R` to `viewer/g1.html`. The 3D view shows:
- the CoP sphere;
- the turf-force arrow (0.5 m = body weight);
- the line from the CoP to the ankle (when it is parallel to the force, the ankle is torque-free);
- the boot pieces' contact state (blue touching, grey speculative).

The sidebar panel adds heel, forefoot and ankle heights, pitch, the ankle angle and ω, the forces, CoP, the contact moment and the line-of-action distance, the full torque decomposition, ankle U, cumulative work by source, and the self-contact flags. Review links are in §8.

## 3. What happens, baseline, right foot

The left foot agrees within a few millimetres in the free rise and within 2 mm at the peak.

**Geometry:**
- boot length 293.5 mm;
- ankle 66 mm in front of the heel's rear edge (0.23 of the boot) and 91 mm above the sole;
- foot mass 1.27 kg.

### 3.1 Impact

The impact lasts two ticks, 0.450–0.454 s. The first is speculative contact at 8.4 kN; the second is 26.8 kN per foot.

**Whole body:**
- v_COM,y goes from −4.37 to −1.18 m/s.
- The turf impulse is 223 N·s.
- Kinetic energy falls from 755 to 196 J. Of the remainder, **136 J is internal**: segment rotation (shank 10.9 rad/s, knee flexing). This is the momentum the free rise releases (A).

**On the right foot in the main impact tick:**
- vertical impulse 111.7 N·s; horizontal 11.9 N·s;
- pieces 0–7 touching (heel to midfoot). Estimated shares: heel row 52 %, row 2 33 %, row 3 13 %, row 4 2 %. Pieces 8–9 are speculative;
- CoP at 0.20 of the boot, 7 mm behind the ankle;
- contact moment about the ankle −0.32 N·m·s (heel-down). Forward friction under the sole outweighs the vertical force just behind the ankle;
- ankle torques 2.2 N·m, all damping. Law 0, stop 0, emergency 0.

**Energy:** in this tick the shank pushes 202 J into the foot and the turf absorbs 211 J. The foot leaves the tick with its ankle vertical velocity at +0.04 m/s. **Nothing launches the foot.**

### 3.2 Free rise: heel 0 → 231 mm (97 % of the peak)

**When:** 0.458–0.679 s. This window has no self-contact manifold, the ankle stays inside its soft range and there is no emergency stop.

**Body:**
- Total turf force is mostly **below 10 % of body weight until 0.61 s**, with one 21 % tick at 0.483 s. It rises to about 100 % only in the last ticks as the body's weight lands on the toes. The mean is 15 %.
- The COM accelerates downward at **8.29 m/s² (0.85 g)**. The body is close to free fall.
- The pelvis falls 0.57 m and the COM 0.50 m, while the **right knee rises 0.11 m**.
- The knee goes from 22° to 152°. The shank rotates forward at up to 10.9 rad/s.

**How the ankle rises:**
- The ankle's upward velocity builds over about 30 ms, from 0.04 to 1.5 m/s.
- At first it comes from the shank's own forward rotation, which lifts its lower end relative to the knee (+0.66 to +0.97 m/s). Then it comes from the knee rising (up to +0.68 m/s).
- The foot is pulled up at the ankle (+41 N at 0.458 s, falling to about 0 by 0.52 s) and pivots about its forefoot. The CoP moves to 0.71 two ticks after impact (pieces 4 and 6), then to the toe row from 0.48 s on (98–99 % of the small load on the toe row).

**Foot kinematics:**
- pitch 0 → 70.0°, peak pitch rate 8.4 rad/s;
- ankle +11.4° → −45.6°, which is plantarflexion caused by the foot outrunning the shank;
- the toe stays planted: forefoot at −1 to −3 mm, toe velocity about 0.

**Turf impulse on the foot over the 0.22 s:** vertical 13.2 N·s (59 N mean), horizontal 3.2 N·s.

**Ankle torques throughout:**

| component | value |
|---|---|
| elastic law | 0.0 N·m exactly |
| stored energy U | 0.000 J |
| end-stop | 0 |
| emergency | 0 |
| drive applied | ≤ 1.6 N·m, all of it damping, opposing the plantarflexion |
| contact moment about the ankle | small; angular impulse +0.09 N·m·s over the whole free rise |

**Energy on the foot (right; left in brackets):**

| source | work |
|---|---|
| shank force at the ankle | **+2.75 J** (2.76) |
| ankle rotation rows | **−1.03 J** (−1.04), damping |
| turf | **−0.21 J** (−0.20) |
| total = Δ(KE + PE) | +1.52 J, of which ΔPE is +1.48 J (the COM lifted 0.12 m) |

**The rise ends when the foot becomes a strut.**
- From 0.65 s the load returns: 121 → 407 N in eight ticks.
- Pitch plateaus at **70.2°** (load-weighted over the nine loaded ticks above 100 N, mean 225 N).
- The turf force passes **6.8 mm from the ankle** on average (16.6 mm at most) and is tilted 3.9° from vertical.
- With a torque-free ankle and negligible foot inertia, the turf force must pass through the ankle. For a vertical force on this boot, that pose is **70.84°**: the ankle directly above the toe's lowest point, computed from the boot geometry. Measured: 70.0–70.6°. Still `heel_03`, and the "ankle − CoP" panel, show it.

### 3.3 To the peak: 231 → 238 mm (L 240)

**When:** 0.683–0.696 s. This is the second impact.

**What happens:**
- The body (COM still falling at 3.1 m/s) reaches full knee flexion (knee in its end range: law −54 N·m at 153°, −98 N·m at 155.4°).
- The buttocks meet the heels: a speculative pelvis–foot manifold at 0.683 s, then thigh–foot touching contact from 0.7125 s (left) and 0.7167 s (right).
- The forearms reach the turf at about 0.688–0.69 s.
- Total turf force: 10.3 kN in one tick.

**Effect on the foot:**
- The self-contact and the shank's backward whip (shank −8.5 rad/s) plantarflex the ankle at up to 17.7 rad/s.
- Pitch goes from 70° to 76.8° and the ankle past its −60° hard limit to **−67.7°** (L −67.5°). This transient is already recorded in G1_TABLES.
- The PF elastic law and end-stop arrest it: law up to 20 N·m on the right and 88 N·m on the left in this window, end-stop part 7 and 59 N·m. No emergency stop fires anywhere in the run (0 engine ticks).
- External work on the foot in this window is +6.6 J. This is mostly the buttocks pushing on the plantar heel; the CoP formula is invalid in these ticks because they contain self-contact.
- The −1954 N "vertical turf force" at 0.7125 s is impossible for turf. It is the thigh/pelvis self-contact on the foot (a speculative manifold in that tick). The whole-body momentum balance confirms it: at 0.708 s the turf pushes up with 5.9 kN while the feet's summed external force is −1.8 kN.

### 3.4 Return: 238 → 0 mm

**When:** 0.70–1.067 s.

**What happens:**
- Both feet stand on the toe row (pieces 8 and 9), loaded at 100–600 N.
- The PF end-range law (up to 106.6 N·m, of which up to 72.7 N·m is the end-stop part) **dorsiflexes the ankle back**. The heel comes down gradually and lands at 1.067 s (2.8 kN).
- **Without this tissue (V4, V6), the heel does not return** within the 1.8 s window.
- A second, smaller heel lift follows: 70 mm on the right and 80 mm on the left, at 1.26–1.29 s, as the body rolls back. It ends supine with feet down, as G1 recorded.

## 4. Counterfactuals (diagnostic only; none adopted)

Right foot; the left behaves the same way. "Free rise" is the heel height at the end of the free rise. "Planted peak" is the maximum heel height while the forefoot is within 10 mm of the turf.

| ID | variant | v_COM after impact (m/s) · internal KE | free-rise heel · pitch · end | planted peak | PF min | heel down | notes |
|---|---|---|---|---|---|---|---|
| **V0** | **validated baseline** (10-piece boot) | −1.18 · 136 J | **231 mm · 70.0° · 0.679 s** | **238 mm @ 0.696 s** | −67.7° | 1.067 s | `958b785c`; 0 engine ticks |
| V1 | old single-hull boot | −1.30 · 126 J | 197 · 57.7° · 0.671 | 203 @ 0.646 | −29.5° | 0.804 | strut force tilted 16° (vs 3.9°) |
| V2 | C3 two-piece boot | −1.29 · 127 J | 208 · 60.6° · 0.671 | 212 @ 0.650 | −34.8° | 0.817 | tilt 12.6° |
| V3 | 12-piece boot | −1.20 · 134 J | 225 · 69.8° · 0.679 | 231 @ 0.692 | −69.6° | 1.054 | |
| V4 | ankle elastic tissue OFF (damping kept) | identical | **bit-identical to V0 until the PF soft limit is crossed (0.6875 s)** | 246 @ 0.708 | −78.5° | **no return** | Jolt emergency stop 4219 ticks |
| V5 | ankle end-stop OFF (law kept) | identical | **bit-identical until the PF hard limit is crossed (0.6958 s)** | 239 @ 0.708 | −69.6° | 1.054 | the stop holds back ~2° of PF and 1 mm of heel |
| V6 | ankle passive tissue fully OFF | identical | 238 · 74.4° · 0.642 | 249 @ 0.692 | −80.5° | **no return** | the undamped foot pitches a little faster; emergency stop 5839 ticks |
| V7 | all four pose couplings OFF | — | **bit-identical to V0** (`958b785c`) | — | — | — | no coupling law reaches its active range in drop1m |
| V8 | feet collide with the turf only (no foot self-contact) | identical | identical until the first pelvis–heel contact (0.683 s); 228 · 69.4° · 0.696 | 236 @ 0.708 | −65.8° | 1.104 | the pelvis passes through the heels; body ends kneeling; whole foot lifted later (heel 399 mm at 0.96 s, toe off at 0.74 s) |
| V9 | 480 Hz | −1.12 · 139 J | 232 · 70.0° · 0.646 | 236 @ 0.669 | −68.3° | 1.027 | |
| V12 | 720 Hz (G1 reference rate) | −1.15 · 136 J | 233 · 69.8° · 0.649 | 238 @ 0.671 | −67.6° | 0.976 | |
| V10 | 960 Hz | −1.12 · 130 J | 244 · 66.4° · 0.630 | 205 @ 0.566, **then the toe lifts off** (0.567 s) | −54.8° | 0.801 | knee only to 129°. Outside the validated rate set: 1.08 J single-step energy rise inside the impact tick, 1 engine tick (neck) |
| V11 | 300 velocity iterations | −1.13 · 140 J | 236 · 72.4° · 0.642 | 240 @ 0.667 | −69.5° | — | after 1.18 s the body rolls onto thorax and head with the legs up |

### What the counterfactuals show

**Ankle tissue (B, C).**
- Removing the elastic law, the end-stop or all of the tissue leaves the free rise unchanged. The runs are bit-identical until the soft or hard limit is crossed at 0.6875 or 0.6958 s, by which time the heel is at 235–238 mm. With no damping (V6) the foot pitches slightly faster.
- The tissue matters only after 0.68 s: it caps the PF overshoot (−67.7° instead of −78…−80° on the engine stop), adds or removes ≤ 12 mm at the peak, and returns the heel.
- The end-stop alone contributes about 2° of PF limit and about 1 mm of heel.

**Contact geometry (D).**
- Every boot shows the same mechanism.
- The single hull and C3 rise about 15 % less (197–212 mm, pitch 58–61°). Two things differ:
  - the impact is distributed slightly differently, leaving internal KE of 126–127 vs 134–136 J and a knee rise of 6–8 vs 11 cm;
  - the loaded strut force is tilted 13–16° instead of about 4°, so the strut pose is reached at a lower pitch.
- The 12-piece boot matches the 10-piece one.

**Leg couplings.** They do not participate: V7 is bit-identical to V0. "Leg constraint coupling" (E) here means the kinematic chain itself, which no switch can remove without changing the anatomy.

**Self-contact.** It is not needed for the rise (V8: 228/236 mm). It shapes the second impact and the late outcome.

**Numerical convergence.**
- At 240, 480 and 720 Hz and with 300 iterations, the free rise ends at 231 / 232 / 233 / 236 mm and the planted peak is 238 / 236 / 238 / 240 mm.
- The free rise is a converged property of the rigid passive body, not a step-size or solver artifact.
- Later events depend on the step size and iteration count, which is consistent with TD-5 (the rate-sensitive landing outcome): the heel-down time ranges 0.98–1.07 s, and with 300 iterations the body rolls back.
- At 960 Hz the folding leg lifts the whole foot off the turf at 0.567 s. This is the same mechanism, more strongly expressed.

## 5. Energy and work audit, heel-rise interval

| baseline, right ankle (left in brackets) | ankle drive work on the joint | ΔU ankle | drive work + ΔU (must be ≤ 0) |
|---|---|---|---|
| impact tick | −0.06 J (−0.06) | 0 | −0.06 |
| free rise 0.458–0.679 s | **−1.10 J** (−1.11) | **0.000** | −1.10 (−1.11) |
| to the peak | −3.23 J (−9.22) | +1.06 J (+6.17) | −2.17 (−3.05) |
| return | −9.03 J (−3.35) | −0.66 J (−5.78) | −9.69 (−9.13) |

**During the rise the ankle stores nothing and returns nothing.** Its only action is damping, which removes 1.1 J.

**Through the peak and return,** the tissue absorbs more than it stores and returns less than it stored. **The passive element generates no net energy.**

**Per step:**
- One ankle step shows drive work + ΔU > 0: **+0.078 J** at the left ankle's 13 rad/s entry into the PF end range (0.704 s). In that step it absorbed 3.70 J and stored 3.77 J, a 2 % discretisation of a stiff law over one 4.2 ms step. The energy came from kinetic energy.
- The whole body's total energy (KE + PE + U) **never rises in any step**: the maximum step rise is 0.000 J.
- Across the whole body from 0.44 to 1.2 s:
  - drive work −237 J, ΔU +6.2 J, the damper model's share 129 J;
  - the rest is absorbed by the implicit end-range rows at the second impact;
  - only 1 of 183 steps has drive work + ΔU > 0.01 J: 0.06 J at the 1.075 s heel touchdown, in a step where the damper alone dissipates 0.18 J.

**On the foot:** see §3.2. The shank force supplies everything. The ankle rows (−1.03 J) and the turf (−0.21 J) both remove energy.

## 6. Answers to the specific questions

**Momentum progression (A) or implementation launch?** Momentum, but not via contact progression under load. The rigid impact converts the vertical fall into segment rotation (136 J internal KE). The passive legs then fold with nothing resisting them until the knee's end range.

**Elastic recoil (B)?** No, not for the rise: the law is exactly 0 and U is exactly 0. B drives the return.

**End-stop (C)?** No, not for the rise. It engages at 0.688 s with the heel already at 235 mm (99 % of the peak) and limits the PF overshoot.

**Compound-foot manifold (D)?** It modulates the magnitude by about 15 % through the impact distribution and the tilt of the strut force. The mechanism is unchanged with every boot representation.

**Leg constraint coupling (E)?** Yes. The foot is towed through the ankle joint by the shank: +2.75 J, 100 % of its energy gain. The knee rises 11 cm while the pelvis falls 57 cm.

**Is the motion physically consistent?**
- Measured by work and momentum, all of it comes from the passive dynamics; nothing is injected.
- It is reproduced at 480 and 720 Hz and with 2× iterations.
- It ends at the only equilibrium a torque-free ankle allows: the turf force passing through the ankle.

**Is it human?** This is what a body *without muscle* does. A person landing from 1 m keeps the knee extensors and plantarflexors active. That keeps the feet loaded, stops the knee collapse short of full flexion, and keeps the heel down or lets it rise under load as the body moves forward. G1 deliberately has no active control. I have not tuned anything toward the human picture.

## 7. Modelling observations

These are not defects and need no change now. They are recorded for your review.

1. **The rigid impact.** It removes 73 % of the vertical COM velocity over two ticks (53.6 kN total turf force in one tick, about 69 times body weight). There is no compliant heel pad or midsole, which would spread the impact over 10–30 ms. The impulsive impact sets the initial segment rotation that the free rise releases. The outcome is converged across rates: v_COM after impact −1.12…−1.18 m/s, internal KE 130–140 J.
2. **The late phase after the second impact** depends on the timestep and on the iteration count. This is consistent with TD-5. The 300-iteration roll-back is a new observation of the same kind; the outcome class stays supine.
3. **The 960 Hz run** has a 1.08 J single-step energy rise inside the impact tick and 1 engine tick. 960 Hz is outside the validated rate set (180/240/360/720 Hz).

## 8. Review scenarios

Start the server from the worktree root: `python3 -m http.server 8172`. Then open `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g1.html?` with one of these query strings:

| what | query |
|---|---|
| The free rise, foot unloaded, towed by the shank | `scenario=drop1m&probe=R&t=0.55&cam=side&focus=foot_R&dist=1.1&pitch=4&hide=normals` |
| The loaded strut: CoP at the toe, force line through the ankle | `scenario=drop1m&probe=R&t=0.6667&cam=side&focus=foot_R&dist=1.1&pitch=4&hide=normals` |
| Whole-body collapse (COM behind the feet) | `scenario=drop1m&probe=R&t=0.65&cam=side&target=0,0.55,0.05&dist=2.7&pitch=3&hide=normals,pen` |
| Second impact / peak | `scenario=drop1m&probe=R&t=0.6958&cam=side&focus=foot_R&dist=1.1&pitch=4&hide=normals` |
| Play it at 0.1× speed from just before impact | `scenario=drop1m&probe=R&t=0.44&cam=side&focus=foot_R&dist=1.4&pitch=4` |

For the last one, set the speed to 0.1× and press play.

The stills are in `shots/`:
- `heel_01`–`heel_05`: foot close-ups;
- `heel_06`–`heel_10`: the whole-body sequence at 0.454, 0.55, 0.65, 0.70 and 1.075 s.

## 9. Changes made

| file | change |
|---|---|
| `gates/v2_g1_ankle.js` | new; measurement-only probe |
| `tools/g1_heel.mjs` | new; the investigation runner, plots and summary |
| `sim/v2_passive.js` | `opts.diagJoint`, a diagnosis-only per-joint switch. It defaults to none; the gate never uses it; the curated hashes are unchanged (10/10) |
| `viewer/v2_g1_viewer.js`, `viewer/g1.html` | the `?probe=L\|R` overlay. Without `?probe` the page behaves as before; the browser = Node recheck passes 10/10 |
| `review_artifacts/physical_character_v2/g1/heel/` | this report and its data |

No approved specification value, gate criterion or validated setting was changed. No G2 work was started.

# PI-1: STOPPED at the D-1 body check (preregistration §4 and §14), before any PI-1 physics

**Protocol:** `PI1_PREREGISTRATION.md`, frozen 6ef7e1e, no amendments.

**Rule applied.** §4: "Quick body / integrity check (before PI-1; stop if it fails)". §14: "Also stop on: the D-1 body check failing".

**What was not done:** no PI-1 physics code was written and no V2 promotion run took place. The three cases (near miss → recover → fall) were **not** run.

## 1. What ran

| step | result |
|---|---|
| Preregistration frozen | 6ef7e1e |
| Simulation baseline | f5f6076 in a detached scratch worktree (main checkout untouched). The engine (`server.py` from that worktree, the repo's `.venv` interpreter) and a scratch static + `/api` proxy run on scratch ports. `sandbox/visual/corner-flags.js` was absent at f5f6076 (it was untracked until 5a0e025, a presentation-only file) and was restored from 5a0e025 into the scratch worktree only. |
| **AIR export** (`scripts/air_export.cjs`; `evidence/air/`) | 3 cases × 4 modes (OFFNP, OFF, FULL, LOCO), 260 ticks each, page errors 0 |
| Baseline reproduces (§2) | **yes.** `rx_free_leg`: PLAYER_CONTACT tick 50, foot_L swinging, J 4.26 N·s → CORRECTION. `rx_planted_leg`: tick 50, foot_L weight-bearing, J 116.93 N·s → FALL SIDE (tGround 1.185 s, tRec 1.921 s, tUp 2.971 s). Both identical to the Tackled-Player V1 review record. |
| `rx_miss` selection (§2 rule) | off = **+0.91 m** (tackler line behind the runner); no contact; minimum surface distance 0.1078 m (`evidence/air/rx_miss_selection.json`, every candidate listed) |
| NT-1 (gameplay hash across OFFNP / OFF / FULL / LOCO) | **identical** per case: 7c1a7ecc (miss), d3703246 (recover), 7f691b4f (fall) |
| NT-4 (predictor calls do not alter the simulation) | **holds** (OFFNP = OFF = FULL) |
| DT-4 (AIR export twice) | **identical** (all fields except the in-page CPU timings) |
| Predictor (§6.1) | fires at tick 44 (miss) and tick 41 (both contact cases). With the 0.25 m envelope this is ≈ 0.15 s before the simulation's contact at tick 50. |
| **D-1 body check** (`tools/pi1_body_check.mjs`; `evidence/body/pi1_body_check.json`) | **FAILS** (§2 below) |

## 2. The body check result

**The runner body** (`spec/v2_pi1_runner.js`): H 1.76 m, M 73 kg, with the record's ankle / knee / hip heights, hip and shoulder joint spacing, and arm chain.
- The realised geometry equals the record within 1e-7 m: ankle 0.08800, knee 0.48669, hip 0.92162, hip joints ± 0.15250 m, shoulder joints ± 0.24699 m at 1.45883 m.
- Upper arm / forearm are 0.3013 / 0.2876 m against the record's 0.3128 / 0.2760 m, as preregistered: one arm scale matches the chain.

**G0** (V2-REF passes every check under the same code):

| check | value | why it fails |
|---|---|---|
| 0.6a inter-HJC distance 0.09 – 0.11 H | 0.1733 H = 0.305 m | the record's hip joints are ± 0.1525 m apart, well outside the human range |
| 0.6b inter-SJC within ± 10 % of 0.218 H | 0.2807 H = 0.494 m | the record's shoulder joints are ± 0.247 m apart |
| 0.10a colliders vs anthropometric surfaces | deltoid spheres 55.3 mm beyond the bideltoid tolerance | consequence of 0.6b |
| 0.4c / 0.6e "requested morphology realised exactly" / "segment lengths = profile fractions" | leg 0.8336 m, thigh 0.4349, shank 0.3987 | these checks compare against the default profile fractions × legScale. The runner's geometry is requested through direct profile overrides, which they do not recognise. The realised values equal the requested record values within 1e-7 m. |

**Classification of the G0 failures.** All five are consequences of the record's non-anatomical (stylised rig) joint spacing, or of how the check expresses a "requested" morphology. The preregistration anticipated this ("population bands do not apply to a morphology-variant"). G0's code exempts only rows 0.4a / 0.5 for morphology variants.

**G1 ESSENTIAL** (accepted configuration: 240 Hz, 150 / 2 iterations, plane turf, v2k knee, ankle K 0.13):
- 9 / 10 pass, and V2-REF passes 10 / 10 under the identical configuration.
- **isoSelfCol fails check 1.4d: transient self-penetration between allowed pairs is 24.59 mm against a limit of ≤ 10 mm.**
  - **Pair:** foot_L ↔ foot_R. The swinging right boot hits the left boot at about 13 m/s: first contact at 0.017 s at 7.5 mm depth, maximum 24.6 mm, 20 steps.
  - **Control:** V2-REF's boots also meet in this scenario, but only 3.0 mm deep.
  - **Cause:** the record's wide hip spacing changes where and how squarely the swinging boot meets the other one.

**This is a genuine integrity check failing, not a band.** The test is a football-speed leg-into-leg swing in an isolated, no-gravity world. No PI-1 case contains a leg-into-leg swing at kick speed. Boot–boot self-contact is still possible at lower speed, for example during the fall.

## 3. A finding from the record (before any physics)

**At the simulation's contact tick (50) in the fall case,** the presentation's left foot is not in contact. The ordinary cheap presentation already shows it lifting off ("release" from tick 49; flight at ticks 43 – 45).

**The simulation's contact model disagrees.** It calls that foot weight-bearing: SINGLE_L, phase 0.575. The model rebuilds the runner from the stride clock with its own stance fraction and `PT.LEG_REF` 0.865, not the character's legs.

**What this means for PI-1:**
- A promoted physical body follows the presentation, so it would meet the sweep with a foot that is leaving the turf. The simulation's fall decision assumes a planted foot.
- This simulation-versus-presentation timing difference exists in the accepted Tackled-Player V1 state, independently of PI-1. PI-1 would have recorded it (FL-5). It is noted here because it bears on how the fall case can be read.

## 4. Decision needed (nothing started)

1. **Accept the record-matched body with recorded exceptions, then continue PI-1 under the frozen protocol.**
   - The exceptions: G0 0.6a, 0.6b, 0.10a as consequences of the record's joint spacing; 0.4c / 0.6e as check-reference artefacts; G1 isoSelfCol 1.4d as a known boot↔boot high-speed self-collision exception of this variant.
   - This would be amendment 1, recorded before any PI-1 physics run.
   - **Safeguard:** in every PI-1 run, any self-penetration above 10 mm is reported as an integrity failure under FL-6 / I-1.
   - **My recommendation.** The geometry is exactly what D-1 asked for: the runner's actual dimensions. Only this geometry lets promotion start from the *exact* presentation pose.
2. **Anatomical joint spacing.** Keep the record's stature, mass and leg segment lengths, but use V2's anatomical hip / shoulder spacing (hip joints ≈ ± 0.088 m).
   - This would probably pass the bands and isoSelfCol.
   - But the presentation rig places the hips 6.5 cm further out on each side. Promotion could not reproduce the presented foot positions with the presented leg rotations, so a visible pop (PR-1) is expected. That conflicts with your exact-pose promotion requirement.
3. **Correct the presentation rig's joint spacing** toward anatomical values first. This is outside PI-1's scope (a presentation asset change).

## 5. Evidence

**Committed locally, not pushed:**
- `evidence/air/`: 12 records, `air_summary.json`, `rx_miss_selection.json`;
- `evidence/body/pi1_body_check.json`;
- `scripts/air_export.cjs`, `tools/pi1_body_check.mjs`, `spec/v2_pi1_runner.js`.

**Scratch infrastructure** (not in Git; can be removed or reused):
- the f5f6076 detached worktree, plus the restored corner-flags file;
- the puppeteer-core install;
- the scratch servers (stopped).

## Erratum (added 2026-10-09 by D-1A, `PI1_D1A_INVESTIGATION.md`)

§3's finding ("at the simulation's contact tick (50) the presentation's left foot is already lifting off") is **wrong**. It came from a row / tick off-by-one:
- AIR row k is the state after squad tick k + 1.
- At the authoritative contact instant (squad 49.5) both the simulation and the presentation have the left foot planted, flat and in early stance.
- The "release" in the FULL row of squad tick 50 is the Tackled-Player V1 reaction overlay responding to the authoritative FALL in that tick.

The body-check result in §2 is unaffected.
